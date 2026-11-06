// HyperFrames' render for a video, as Video Studio runs it (`studio.mjs render`, `draft` and `final`): the video's own
// HyperFrames (its package.json's render script, or Video Studio's pinned one), on the graphics chip on Apple silicon,
// and the render's progress on the video's pages while a stage is under way (the frames rendered and the time left).
// HyperFrames' own output goes to a log beside the render (`<render>.log`; `verbose` streams it too), and the render
// is summed up in a line: the file, its length, frame rate, size and sound as ffprobe reads them, how long it took and
// how HyperFrames captured it; or, when it stops, the lines of the log that say why.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { updateProgress } from "./progress.mjs";
import { readJSON } from "./studio.mjs";
import { HYPERFRAMES } from "./versions.mjs";

/** How to run HyperFrames' render for a video: its own `render` script, which names the exact version the video was
    made on, or, without one, Video Studio's pinned HyperFrames. */
export function renderRunner(dir) {
  const script = readJSON(join(dir, "package.json"))?.scripts?.render || "";
  return /hyperframes@[0-9][\w.-]*\s+render\b/.test(script) ? ["npm", ["run", "render", "--"]] : ["npx", ["--yes", HYPERFRAMES, "render"]];
}

/** The file an `HF render` option list writes, as given (`--output x`, `-o x` or `--output=x`), or "". */
export const outputOf = (args) => {
  const i = args.findIndex((a) => a === "--output" || a === "-o");
  return i >= 0 ? args[i + 1] || "" : (args.find((a) => /^(--output|-o)=/.test(a)) || "").replace(/^[^=]*=/, "");
};

const plain = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
const rel = (cwd, p) => {
  const r = relative(cwd, p);
  return r && !r.startsWith("..") ? r : p;
};

/** A media file as ffprobe reads it: { seconds, fps, width, height, sound, bytes }, or null. */
export function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,avg_frame_rate", "-of", "json", file], { encoding: "utf8" });
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse(r.stdout);
    const video = (j.streams || []).find((s) => s.codec_type === "video");
    const [n, d] = String(video?.avg_frame_rate || "0/1").split("/").map(Number);
    return {
      seconds: Number(j.format?.duration) || 0,
      fps: d ? Math.round((n / d) * 100) / 100 : 0,
      width: video?.width || 0,
      height: video?.height || 0,
      sound: (j.streams || []).some((s) => s.codec_type === "audio"),
      bytes: Number(j.format?.size) || statSync(file).size,
    };
  } catch {
    return null;
  }
}

/** A probed file in a few words: "52.5 s at 30 fps, 1920×1080, with sound, 12.4 MB". */
export const describeProbe = (p) =>
  `${Math.round(p.seconds * 100) / 100} s at ${p.fps} fps, ${p.width}×${p.height}, ${p.sound ? "with sound" : "no sound"}, ${(p.bytes / 1e6).toFixed(1)} MB`;

/** `HF render <args>` for the video `at` ({ root, slug, dir }), from `cwd`. A draft's round comes from its name
    (`…_draft_r2.mp4`) unless `round` is given; in the final stage it's the final render. Resolves
    { code, file, log, probe, summary }. */
export async function renderVideo(at, args, { cwd = at.dir, verbose = false, round = null } = {}) {
  const output = outputOf(args);
  round ??= Number(/_r(\d+)\.[a-z0-9]+$/i.exec(output)?.[1]) || null;
  const size = /_(\d+x\d+)(?:_v\d+)?\.[a-z0-9]+$/i.exec(output)?.[1] || null;
  const since = new Date().toISOString();
  let last = 0;
  let phase = "";
  // the pace is measured from the first frame, as setting up counts for part of HyperFrames' percentage
  let first = null;
  const note = (count, force = false) => {
    if (!force && count.phase === phase && Date.now() - last < 500) return;
    last = Date.now();
    phase = count.phase;
    try {
      updateProgress(at.root, at.slug, (q) => {
        q.step = q.stage === "final" ? "master" : "render";
        if (round && q.stage === "video") q.round = round;
        q.count = { unit: "frames", since, ...(q.stage === "final" && size ? { size } : {}), ...count };
        return q;
      });
    } catch {}
  };
  note({ done: 0, total: 0, pct: 0, phase: "setup" }, true);

  // HyperFrames' log beside the render; without a name for it yet, in renders/ until the render says where it went
  const named = output ? resolve(cwd, output).replace(/\.[a-z0-9]+$/i, "") + ".log" : null;
  let logFile = named || join(at.dir, "renders", `.render-${process.pid}.log`);
  mkdirSync(dirname(logFile), { recursive: true });
  const log = createWriteStream(logFile);
  let text = "";

  // faster renders: on Apple silicon, HyperFrames' browser draws on the graphics chip (unless the user set otherwise)
  const gpu = process.platform === "darwin" && process.arch === "arm64" && !process.env.PRODUCER_BROWSER_GPU_MODE ? { PRODUCER_BROWSER_GPU_MODE: "hardware" } : {};
  const [command, base] = renderRunner(at.dir);
  const child = spawn(command, [...base, ...args], { cwd, stdio: ["inherit", "pipe", "pipe"], env: { ...process.env, ...gpu } });
  const watch = (stream, out) => {
    let rest = "";
    stream.on("data", (chunk) => {
      log.write(chunk);
      if (verbose) out.write(chunk);
      const lines = (rest + chunk.toString("utf8")).split("\n");
      rest = lines.pop();
      for (const line of lines) {
        if (!/^@hf-progress /.test(line)) text += `${line}\n`;
        const m = /@hf-progress (\{.*\})\s*$/.exec(line);
        if (!m) continue;
        try {
          const e = JSON.parse(m[1]);
          if (e.code === "capture") {
            first ||= { pct0: e.pct, t0: new Date().toISOString() };
            note({ done: e.done, total: e.total, pct: e.pct, phase: "capture", ...first });
          } else if (Number.isFinite(e.pct)) note({ pct: e.pct, phase: e.code, ...(first || {}), ...(e.code === "encode" ? { done: e.done, total: e.total } : {}) });
        } catch {}
      }
    });
  };
  watch(child.stdout, process.stdout);
  watch(child.stderr, process.stderr);
  const code = await new Promise((done) => {
    child.on("error", () => done(1));
    child.on("close", (c) => done(c ?? 1));
  });
  await new Promise((done) => log.end(done));

  const lines = plain(text).split("\n");
  // HyperFrames' closing lines: "◇  <file>", then its size, length and time, then how it captured
  const at0 = lines.findIndex((l) => /^\s*◇\s+\S/.test(l));
  const made = at0 >= 0 ? lines[at0].replace(/^\s*◇\s+/, "").trim() : output ? resolve(cwd, output) : null;
  if (!named && made) {
    const beside = made.replace(/\.[a-z0-9]+$/i, "") + ".log";
    try {
      renameSync(logFile, beside);
      logFile = beside;
    } catch {}
  }
  const file = made && existsSync(resolve(cwd, made)) ? resolve(cwd, made) : null;
  if (code === 0) note({ pct: 100, phase: "done" }, true);
  else {
    // a render that stopped leaves no count behind: Claude renders again once it has fixed what stopped it
    try {
      updateProgress(at.root, at.slug, (q) => {
        delete q.count;
        return q;
      });
    } catch {}
  }

  const where = `HyperFrames' log: ${rel(cwd, logFile)}`;
  if (code !== 0 || !file) {
    // the lines that say what went wrong, without the progress bars and the render's own trace
    const why = lines
      .filter((l) => l.trim() && !/^\s*[█░]|^\[INFO\]|^\[Render:trace\]|^> |^\s*Keep editing/.test(l))
      .filter((l) => /error|fail|cannot|can't|couldn't|not found|timed? ?out|✖|refus|invalid|missing/i.test(l))
      .slice(-8)
      .map((l) => `  ${l.trim().slice(0, 300)}`);
    const tail = why.length ? why : lines.filter((l) => l.trim()).slice(-6).map((l) => `  ${l.trim().slice(0, 300)}`);
    return { code: code || 1, file: null, log: logFile, probe: null, summary: [`The render stopped${code ? ` (exit ${code})` : ""}: no file was made. ${where}`, ...tail].join("\n") };
  }
  const p = probe(file);
  // "rendered in 1m 38.4s" and the capture line (its path, the GPU mode and each stage's time)
  const took = /rendered in ((?:\d+m\s*)?[\d.]+s)/.exec(lines[at0 + 1] || "")?.[1];
  const how = (lines[at0 + 2] || "").trim();
  const summary = `Rendered ${rel(cwd, file)}: ${p ? describeProbe(p) : "ffprobe couldn't read it"}${took ? `; ${took} to render` : ""}${how && !/^Keep editing/.test(how) ? ` (${how})` : ""}. ${where}`;
  return { code: 0, file, log: logFile, probe: p, summary };
}
