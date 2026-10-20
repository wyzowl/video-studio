// Where the top of the presenter's head is in a cut-out, at its highest in the clip: the headTop for the T01 Words
// behind library item, so the keyword sits where the head covers at most half of it.
//   node <plugin>/scripts/tools/head-top.mjs <cutout.webm|.mov|.png> [--size 1920x1080] [--fps 4]
// The cut-out is the footage with its background removed (HyperFrames' remove-background). The answer is in the
// video's own pixels (--size, default 1920x1080), with the footage filling the frame as T01 shows it (cover, centred).
import { spawnSync } from "node:child_process";
import { extname } from "node:path";

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const file = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!file) {
  console.error("usage: head-top.mjs <cutout.webm|.mov|.png> [--size 1920x1080] [--fps 4]");
  process.exit(1);
}
const [CW, CH] = String(opt("--size", "1920x1080")).split("x").map(Number);
const FPS = Number(opt("--fps", 4));

const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
const [SW, SH] = String(probe.stdout).trim().split(",").map(Number);
if (!SW || !SH) {
  console.error(`Couldn't read ${file}: ${String(probe.stderr).trim() || "not a video or image"}`);
  process.exit(1);
}

// the alpha channel, a quarter size, as grey frames; WebM keeps its alpha only through the libvpx decoder
const STEP = 4;
const w = Math.max(1, Math.round(SW / STEP));
const h = Math.max(1, Math.round(SH / STEP));
const still = /^\.(png|webp)$/i.test(extname(file));
const args = ["-v", "error", ...(/\.webm$/i.test(file) ? ["-c:v", "libvpx-vp9"] : []), "-i", file, "-vf", `${still ? "" : `fps=${FPS},`}alphaextract,scale=${w}:${h}:flags=area`, "-f", "rawvideo", "-pix_fmt", "gray", "-"];
const out = spawnSync("ffmpeg", args, { maxBuffer: 1 << 30 });
if (out.status !== 0 || !out.stdout?.length) {
  console.error(`Couldn't read the cut-out's transparency: ${String(out.stderr).trim() || "no alpha channel?"}`);
  process.exit(1);
}

// for each frame, the first row with any of the person in it; the highest of them all
const size = w * h;
let top = Infinity;
let frames = 0;
for (let at = 0; at + size <= out.stdout.length; at += size, frames++) {
  for (let y = 0; y < h && y * STEP < top; y++) {
    const row = out.stdout.subarray(at + y * w, at + (y + 1) * w);
    if (row.some((a) => a > 128)) {
      top = Math.min(top, y * STEP);
      break;
    }
  }
}
if (!Number.isFinite(top)) {
  console.error("No person found in the cut-out: it's transparent all over.");
  process.exit(1);
}
const scale = Math.max(CW / SW, CH / SH);
const headTop = Math.round((CH - SH * scale) / 2 + top * scale);
console.log(JSON.stringify({ cutout: file, source: { width: SW, height: SH }, frames, top, size: `${CW}x${CH}`, headTop }, null, 2));
