// Review sheets and delivery extras from a render, driven by the film's own docs/beats.json.
// Run from the project root:
//   node <plugin>/scripts/tools/sheets.mjs renders/drafts/draft_r3.mp4 docs/review/r3            key + phone sheets, all strips
//   node <plugin>/scripts/tools/sheets.mjs renders/drafts/draft_r3.mp4 docs/review/r3 whip zoom  only these strips
//   node <plugin>/scripts/tools/sheets.mjs renders/<p>_16x9.mp4 --deliver                         _web.mp4, poster,
//                                                                                                   thumbnail, contact
//
// docs/beats.json (the film decides what to look at; this script only does the grabbing):
//   { "keys":   [1.6, 4.6, …],              one per VO sentence on its key word (or per story beat with no VO)
//     "strips": { "whip": [12.4, 13.0], … },  12 frames across each of the fastest moves
//     "poster": 61.5,                          the poster frame
//     "contact": [0.8, 2.6, …] }               optional: the 30 contact-sheet beats (default: keys, resampled)
// Deliver mode keeps a revision suffix: renders/<p>_16x9_v2.mp4 → poster_v2.png, thumbnail_v2.jpg, contact_v2.png.
// The thumbnail is the poster at 1280 px along its longer side, as a JPEG (YouTube's size, and link previews').
// While a stage is under way on the video's pages, its newest key frames (or the poster) show there
// (lib/progress.mjs): review sheets also make small copies of the key frames, in thumbs/.
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { inVideo, readProgress, report, videoAt } from "../lib/progress.mjs";

const argv = process.argv.slice(2);
const deliver = argv.includes("--deliver");
const [IN, OUT, ...only] = argv.filter((a) => a !== "--deliver");
if (!IN || (!deliver && !OUT)) { console.error("usage: sheets.mjs <render.mp4> <outDir> [strip …]  |  sheets.mjs <master.mp4> --deliver"); process.exit(1); }
const B = JSON.parse(readFileSync(process.env.BEATS || "docs/beats.json", "utf8"));

const ff = (args) => new Promise((res, rej) => {
  const p = spawn("ffmpeg", ["-v", "error", "-y", ...args]);
  let err = ""; p.stderr.on("data", (d) => (err += d));
  p.on("close", (c) => (c ? rej(new Error(err)) : res()));
});
async function pool(jobs, n = 6) { const q = [...jobs]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) await q.shift()(); })); }
const grab = (t, out, scale) => () => ff(["-ss", String(t), "-i", IN, "-frames:v", "1", ...(scale ? ["-vf", `scale=${scale}:-1`] : []), out]);
const cols = (n) => (n <= 9 ? 3 : n <= 16 ? 4 : n <= 25 ? 5 : n <= 36 ? 6 : 7);
const tile = (pattern, out, w, n, pad, color) => ff(["-pattern_type", "glob", "-i", pattern, "-vf", `scale=${w}:-1,tile=${cols(n)}x${Math.ceil(n / cols(n))}:padding=${pad}:color=${color}`, out]);
const pick = (arr, n) => (arr.length <= n ? arr : Array.from({ length: n }, (_, k) => arr[Math.round((k * (arr.length - 1)) / (n - 1))]));

if (deliver) {
  const D = dirname(IN), base = basename(IN, ".mp4"), V = (base.match(/_16x9(.*)$/) || [, ""])[1];
  await ff(["-i", IN, "-c:v", "libx264", "-crf", "19", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k", join(D, `${base}_web.mp4`)]);
  await grab(B.poster, join(D, `poster${V}.png`))();
  await ff(["-i", join(D, `poster${V}.png`), "-vf", "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'", "-q:v", "3", join(D, `thumbnail${V}.jpg`)]);
  const T = pick(B.contact || B.keys, 30), tmp = mkdtempSync(join(tmpdir(), "contact-"));
  await pool(T.map((t, i) => grab(t, join(tmp, `c_${String(i).padStart(2, "0")}.png`), 384)));
  await ff(["-pattern_type", "glob", "-i", join(tmp, "c_*.png"), "-vf", `tile=6x${Math.ceil(T.length / 6)}:padding=3:color=0x888888`, join(D, `contact${V}.png`)]);
  rmSync(tmp, { recursive: true });
  report(IN, (q, at) => {
    if (q.stage !== "final") return q;
    q.step = "extras";
    delete q.count;
    q.frames = [{ src: inVideo(at, join(D, `poster${V}.png`)), caption: "Poster" }];
    return q;
  });
  console.log(`web: ${join(D, base + "_web.mp4")} · poster: ${join(D, `poster${V}.png`)} · thumbnail: ${join(D, `thumbnail${V}.jpg`)} · contact: ${join(D, `contact${V}.png`)}`);
} else {
  mkdirSync(OUT, { recursive: true });
  const jobs = [];
  if (!only.length) {
    B.keys.forEach((t, i) => jobs.push(grab(t, join(OUT, `k_${String(i).padStart(2, "0")}.png`))));
  }
  const strips = Object.entries(B.strips || {}).filter(([n]) => !only.length || only.includes(n));
  for (const [name, [t0, t1]] of strips)
    for (let k = 0; k < 12; k++) jobs.push(grab(+(t0 + ((t1 - t0) * k) / 11).toFixed(3), join(OUT, `_s_${name}_${String(k).padStart(2, "0")}.png`)));
  await pool(jobs);
  if (!only.length) {
    await tile(join(OUT, "k_*.png"), join(OUT, "keys.png"), 540, B.keys.length, 6, "0x555555");
    await tile(join(OUT, "k_*.png"), join(OUT, "phone.png"), 360, B.keys.length, 4, "0x555555");
  }
  for (const [name] of strips) {
    await ff(["-pattern_type", "glob", "-i", join(OUT, `_s_${name}_*.png`), "-vf", "scale=320:-1,tile=6x2:padding=4:color=0x555555", join(OUT, `strip_${name}.png`)]);
    for (let k = 0; k < 12; k++) rmSync(join(OUT, `_s_${name}_${String(k).padStart(2, "0")}.png`));
  }
  // the video under way shows these key frames as its newest, from small copies
  const at = videoAt(OUT);
  if (!only.length && at && readProgress(at.root, at.slug)?.stage === "video") {
    mkdirSync(join(OUT, "thumbs"), { recursive: true });
    const keys = pick(B.keys.map((t, i) => ({ t, i })), 6);
    await pool(keys.map(({ i }) => () => ff(["-i", join(OUT, `k_${String(i).padStart(2, "0")}.png`), "-vf", "scale=480:-1", "-q:v", "4", join(OUT, "thumbs", `k_${String(i).padStart(2, "0")}.jpg`)])));
    const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;
    report(OUT, (q, here) => {
      q.step = "sheets";
      delete q.count;
      q.frames = keys.map(({ t, i }) => ({ src: inVideo(here, join(OUT, "thumbs", `k_${String(i).padStart(2, "0")}.jpg`)), caption: clock(t) }));
      q.framesFrom = basename(IN).replace(/\.[a-z0-9]+$/i, "");
      return q;
    });
  }
  console.log(`sheets in ${OUT}: ${only.length ? "" : "keys.png, phone.png, "}${strips.length} strips`);
}
