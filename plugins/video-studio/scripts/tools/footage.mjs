#!/usr/bin/env node
// A footage video's footage: read it, transcribe it, and cut previews from it. Run from the project folder.
//
//   node <plugin>/scripts/tools/footage.mjs scan
//     Every clip in inputs/footage/: its length, size (after any phone rotation), frame rate and sound; a light
//     preview copy (footage/proxies/); a contact sheet of 12 moments (footage/sheets/); and, where there's speech,
//     a transcript with word times (footage/transcripts/<clip>.json) and a readable one with pauses, umms and
//     repeated takes marked (<clip>.md). All of it is listed in footage/footage.json. Clips already scanned are
//     kept unless they've changed (--again redoes them all).
//   node <plugin>/scripts/tools/footage.mjs still <clip> <time> --size 1920x1080 --out <file.png>
//     The frame at a moment, filling that size (cropped to fit): a storyboard frame's footage.
//   node <plugin>/scripts/tools/footage.mjs clip <clip>@<in>-<out> […] --size 1920x1080 --out <file.mp4>
//          [--over <clip>@<in>-<out>+<at> …]
//     A scene's rough cut for its storyboard play button: the ranges back to back with their sound, small and
//     light. --over lays B-roll over the picture, from <at> seconds into the cut, keeping the sound underneath.
//
// Times are seconds (12.4) or timecodes (00:12.4, 1:02.5). A clip is a path, or a file name in inputs/footage/.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (k, d = null) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};
const all = (k) => argv.flatMap((a, i) => (a === k && argv[i + 1] !== undefined ? [argv[i + 1]] : []));
const flags = new Set(["--size", "--out", "--over", "--project"]);
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith("--") && !flags.has(arr[i - 1]));
const PROJECT = resolve(opt("--project", process.cwd()));
const INPUTS = join(PROJECT, "inputs", "footage");
const OUT = join(PROJECT, "footage");
const VIDEO = /\.(mp4|mov|m4v|mkv|webm|avi|mts|m2ts)$/i;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const run = (bin, args, input) => {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 1 << 28, input });
  if (r.error) fail(`${bin} couldn't run (${r.error.message}). Run /video-studio:setup, which installs it.`);
  return r;
};
const ff = (args) => {
  const r = run("ffmpeg", ["-v", "error", "-y", ...args]);
  if (r.status !== 0) fail(`ffmpeg failed: ${(r.stderr || "").trim().split("\n").slice(-3).join(" ")}`);
};
const tc = (t) => {
  const s = Math.max(0, Number(t) || 0);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};
/** "12.4", "00:12.4" or "1:02:03.5" → seconds */
const seconds = (text) => {
  const parts = String(text).trim().split(":").map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) fail(`"${text}" isn't a time: use seconds (12.4) or a timecode (00:12.4)`);
  return parts.reduce((a, n) => a * 60 + n, 0);
};
/** "1920x1080" → [1920, 1080] */
const sizeOf = (text) => {
  const m = /^(\d{2,5})[x×](\d{2,5})$/i.exec(String(text || ""));
  if (!m) fail("--size takes the video's size, such as 1920x1080 or 1080x1920");
  return [Number(m[1]), Number(m[2])];
};
/** A clip by path, or by its name in inputs/footage/ */
const clipPath = (name) => {
  for (const p of [resolve(name), join(INPUTS, name)]) if (existsSync(p) && statSync(p).isFile()) return p;
  fail(`There's no clip called ${name} (looked for it as a path and in inputs/footage/).`);
};

// ───────── reading a clip ─────────

/** Length, display size (rotation applied), frame rate and sound, from ffprobe. */
function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]);
  if (r.status !== 0) fail(`ffprobe couldn't read ${file}: ${(r.stderr || "").trim()}`);
  const info = JSON.parse(r.stdout || "{}");
  const v = (info.streams || []).find((s) => s.codec_type === "video" && !(s.disposition && s.disposition.attached_pic));
  const a = (info.streams || []).find((s) => s.codec_type === "audio");
  if (!v) return null;
  const side = (v.side_data_list || []).find((d) => d.rotation !== undefined);
  const rotation = (((Math.round(Number(side ? side.rotation : v.tags?.rotate) || 0) % 360) + 360) % 360);
  const turned = rotation === 90 || rotation === 270;
  const [n, d] = String(v.avg_frame_rate || v.r_frame_rate || "0/1").split("/").map(Number);
  return {
    duration: Number(info.format?.duration) || Number(v.duration) || 0,
    width: turned ? v.height : v.width,
    height: turned ? v.width : v.height,
    fps: d ? Math.round((n / d) * 100) / 100 : 0,
    rotation,
    audio: Boolean(a),
  };
}

/** Where speech is: islands of sound louder than the clip's own speaking level less 22 dB (as vo-check does), from
    10 ms frames, gaps under 0.25 s merged. [[start, end], …] in seconds. */
function speechIslands(file) {
  const SR = 16000;
  const HOP = 0.01;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0 || !r.stdout?.length) return [];
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
  const H = Math.round(SR * HOP);
  const db = [];
  for (let i = 0; i + H <= x.length; i += H) {
    let s = 0;
    for (let k = 0; k < H; k++) s += x[i + k] * x[i + k];
    db.push(10 * Math.log10(s / H + 1e-12));
  }
  if (!db.length) return [];
  const p95 = [...db].sort((a, b) => a - b)[Math.floor(0.95 * db.length)];
  if (p95 < -55) return []; // near silent: no speech to find
  const threshold = p95 - 22;
  const islands = [];
  db.forEach((d, f) => {
    if (d < threshold) return;
    const t = f * HOP;
    const last = islands[islands.length - 1];
    if (last && t - last[1] < 0.25) last[1] = t + HOP;
    else islands.push([t, t + HOP]);
  });
  return islands.filter(([a, b]) => b - a >= 0.08);
}

/** HyperFrames' version for this project: package.json's, else the studio's (studio.json). */
function hyperframesPin() {
  const pkg = (() => {
    try {
      const p = JSON.parse(readFileSync(join(PROJECT, "package.json"), "utf8"));
      return { ...p.dependencies, ...p.devDependencies }.hyperframes;
    } catch {
      return null;
    }
  })();
  if (pkg) return String(pkg).replace(/^[\^~]/, "");
  for (let dir = PROJECT; ; dir = dirname(dir)) {
    try {
      const s = JSON.parse(readFileSync(join(dir, "studio.json"), "utf8"));
      if (s.hyperframes) return String(s.hyperframes);
    } catch {}
    if (dirname(dir) === dir) break;
  }
  fail("Couldn't tell which HyperFrames version to use: run this from the video's project folder.");
}

/** Word times from HyperFrames (Parakeet where it's installed): [{ text, start, end }] */
function transcribe(file) {
  const work = mkdtempSync(join(tmpdir(), "wvs-transcribe-"));
  try {
    const r = run("npx", ["--yes", `hyperframes@${hyperframesPin()}`, "transcribe", file, "--engine", "auto", "--json", "-d", work]);
    const out = join(work, "transcript.json");
    if (!existsSync(out)) fail(`The transcription didn't work for ${basename(file)}: ${(r.stderr || r.stdout || "").trim().split("\n").slice(-2).join(" ")}`);
    const words = JSON.parse(readFileSync(out, "utf8"));
    return (Array.isArray(words) ? words : words.words || [])
      .map((w) => ({ text: String(w.text ?? w.word ?? "").trim(), start: Number(w.start), end: Number(w.end) }))
      .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const FILLERS = new Set(["um", "umm", "uh", "uhh", "er", "erm", "ah", "eh", "hmm", "mm"]);
const plain = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, "");

/** The transcript read against the sound: word ends trimmed to where speech stops (the recogniser runs them on through
    silences), pauses of half a second or more found between the islands of speech, the words grouped into phrases at
    those pauses, umms marked, and phrases that start the same way as one just before marked as possible retakes. */
function readSpeech(words, islands) {
  const inside = (t) => islands.find(([a, b]) => t >= a - 0.05 && t <= b + 0.05);
  for (const w of words) {
    const island = inside(w.start + 0.02);
    if (island && w.end > island[1] + 0.05) w.end = Math.max(w.start + 0.05, island[1]);
    w.filler = FILLERS.has(plain(w.text));
  }
  const pauses = [];
  for (let i = 1; i < islands.length; i++) {
    const gap = islands[i][0] - islands[i - 1][1];
    if (gap >= 0.5) pauses.push({ start: islands[i - 1][1], end: islands[i][0] });
  }
  // and starts that fall in a pause (the recogniser often starts a word early) moved to where speech resumes
  for (const w of words) {
    const pause = pauses.find((p) => w.start > p.start + 0.05 && w.start < p.end);
    if (pause) w.start = Math.min(pause.end, w.end - 0.05);
    else if (islands.length && w.start < islands[0][0] - 0.05) w.start = Math.min(islands[0][0], w.end - 0.05);
  }
  const between = (a, b) => pauses.find((p) => p.start >= a.end - 0.1 && p.end <= b.start + 0.05);
  const phrases = [];
  let current = null;
  for (const w of words) {
    const broke = current && Boolean(between(current.words.at(-1), w));
    if (!current || broke) {
      current = { words: [] };
      phrases.push(current);
    }
    current.words.push(w);
  }
  phrases.forEach((p, i) => {
    p.start = p.words[0].start;
    p.end = p.words.at(-1).end;
    p.text = p.words.map((w) => w.text).join(" ");
    p.fillers = p.words.filter((w) => w.filler).map((w) => plain(w.text));
    // a retake: this phrase's first four words (umms aside) appear in one of the two phrases before it
    const key = p.words.filter((w) => !w.filler).slice(0, 4).map((w) => plain(w.text)).join(" ");
    if (key.split(" ").length < 4) return;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const before = phrases[j].words.filter((w) => !w.filler);
      const flat = before.map((w) => plain(w.text));
      for (let k = 0; k + 4 <= flat.length; k++) {
        if (flat.slice(k, k + 4).join(" ") === key) {
          p.retakeOf = before[k].start;
          return;
        }
      }
    }
  });
  return { words, pauses, phrases, between };
}

function readable(name, clip, speech) {
  const lines = [`# ${name}`, "", `${tc(clip.duration)} · ${clip.width}×${clip.height} · ${clip.fps} fps${clip.audio ? "" : " · no sound"}`, ""];
  if (!speech || !speech.words.length) {
    lines.push(clip.audio ? "No speech found." : "No sound.");
    return `${lines.join("\n")}\n`;
  }
  lines.push("Each line is a phrase, between pauses of half a second or more. Times are in this clip.", "");
  speech.phrases.forEach((p, i) => {
    const marks = [p.fillers.length ? `umm: ${p.fillers.join(", ")}` : "", p.retakeOf != null ? `a retake of ${tc(p.retakeOf)}?` : ""].filter(Boolean);
    lines.push(`[${tc(p.start)}–${tc(p.end)}] ${p.text}${marks.length ? `   (${marks.join("; ")})` : ""}`);
    const next = speech.phrases[i + 1];
    const pause = next && speech.between(p.words.at(-1), next.words[0]);
    if (pause) lines.push(`    pause ${(pause.end - pause.start).toFixed(1)} s`);
  });
  return `${lines.join("\n")}\n`;
}

// ───────── contact sheets ─────────

/** 12 moments across the clip, labelled with their times, as one JPEG (headless Chrome draws the labels: this ffmpeg
    may have no drawtext). Without Chrome, an unlabelled ffmpeg tile. */
async function contactSheet(file, clip, out) {
  const work = mkdtempSync(join(tmpdir(), "wvs-sheet-"));
  try {
    const times = Array.from({ length: 12 }, (_, i) => ((i + 0.5) / 12) * clip.duration);
    const shots = times.map((t, i) => {
      const shot = join(work, `${String(i).padStart(2, "0")}.jpg`);
      ff(["-ss", t.toFixed(3), "-i", file, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", shot]);
      return existsSync(shot) ? shot : null;
    });
    let chrome = null;
    try {
      chrome = (await import(pathToFileURL(join(HERE, "..", "lib", "chrome.mjs")))).findChrome();
    } catch {}
    if (chrome?.puppeteer) {
      const tiles = shots
        .map((s, i) => (s ? `<figure><img src="data:image/jpeg;base64,${readFileSync(s).toString("base64")}"><figcaption>${tc(times[i])}</figcaption></figure>` : ""))
        .join("");
      const browser = await chrome.puppeteer.launch({ executablePath: chrome.executablePath, headless: true });
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1520, height: 400 });
        await page.setContent(`<!doctype html><style>body{margin:0;padding:20px;background:#1d2024;color:#f6f3ea;font:600 18px/1.3 -apple-system,Helvetica,sans-serif}h1{margin:0 0 14px;font-size:20px}main{display:grid;grid-template-columns:repeat(4,360px);gap:12px}figure{margin:0}img{display:block;width:360px;background:#000}figcaption{padding-top:4px;font:500 15px/1 Menlo,monospace;color:#cbc8c1}</style><h1>${name(file)} · ${tc(clip.duration)}</h1><main>${tiles}</main>`);
        const height = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewport({ width: 1520, height });
        await page.screenshot({ path: out, type: "jpeg", quality: 82 });
      } finally {
        await browser.close();
      }
    } else {
      ff(["-i", file, "-vf", `fps=12/${Math.max(1, clip.duration).toFixed(3)},scale=360:-2,tile=4x3`, "-frames:v", "1", "-q:v", "4", out]);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
const name = (file) => basename(file);

// ───────── scan ─────────

async function scan() {
  if (!existsSync(INPUTS)) fail(`There's no inputs/footage/ folder in ${PROJECT}. Put the clips there, then scan again.`);
  const files = readdirSync(INPUTS).filter((f) => !f.startsWith(".") && VIDEO.test(f)).sort();
  if (!files.length) fail("inputs/footage/ has no video clips in it yet.");
  for (const dir of ["proxies", "sheets", "transcripts"]) mkdirSync(join(OUT, dir), { recursive: true });
  const listFile = join(OUT, "footage.json");
  const before = (() => {
    try {
      return JSON.parse(readFileSync(listFile, "utf8"));
    } catch {
      return { clips: [] };
    }
  })();
  const again = argv.includes("--again");
  const clips = [];
  for (const f of files) {
    const file = join(INPUTS, f);
    const stem = f.replace(/\.[^.]+$/, "");
    const st = statSync(file);
    const known = before.clips?.find((c) => c.name === f && c.bytes === st.size && c.modified === st.mtimeMs);
    if (known && !again && existsSync(join(PROJECT, known.proxy))) {
      clips.push(known);
      console.log(`${f}: already scanned`);
      continue;
    }
    const clip = probe(file);
    if (!clip) {
      console.log(`${f}: no video in it, left out`);
      continue;
    }
    process.stdout.write(`${f}: ${tc(clip.duration)}, ${clip.width}×${clip.height}, ${clip.fps} fps… `);
    // a light copy for previews and the storyboard's rough cuts: at most 960 px across, upright
    const proxy = join(OUT, "proxies", `${stem}.mp4`);
    ff(["-i", file, "-vf", "scale='if(gt(iw,ih),min(960,iw),-2)':'if(gt(iw,ih),-2,min(960,ih))'", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", ...(clip.audio ? ["-c:a", "aac", "-b:a", "96k"] : ["-an"]), "-movflags", "+faststart", proxy]);
    const sheet = join(OUT, "sheets", `${stem}.jpg`);
    await contactSheet(proxy, clip, sheet);
    let speech = null;
    const islands = clip.audio ? speechIslands(file) : [];
    if (islands.length) speech = readSpeech(transcribe(file), islands);
    const transcript = join(OUT, "transcripts", `${stem}.json`);
    const notes = join(OUT, "transcripts", `${stem}.md`);
    if (speech?.words.length) {
      writeFileSync(transcript, `${JSON.stringify({ clip: f, words: speech.words.map(({ text, start, end, filler }) => ({ text, start: +start.toFixed(2), end: +end.toFixed(2), ...(filler ? { filler } : {}) })), pauses: speech.pauses.map((p) => ({ start: +p.start.toFixed(2), end: +p.end.toFixed(2) })) }, null, 1)}\n`);
    } else rmSync(transcript, { force: true });
    writeFileSync(notes, readable(f, clip, speech));
    const rel = (p) => relative(PROJECT, p).split("\\").join("/");
    const entry = {
      name: f,
      file: rel(file),
      ...clip,
      duration: +clip.duration.toFixed(3),
      speech: Boolean(speech?.words.length),
      words: speech?.words.length || 0,
      ...(speech?.words.length ? { speaking: +speech.phrases.reduce((a, p) => a + (p.end - p.start), 0).toFixed(1), transcript: rel(transcript) } : {}),
      notes: rel(notes),
      proxy: rel(proxy),
      sheet: rel(sheet),
      bytes: st.size,
      modified: st.mtimeMs,
    };
    clips.push(entry);
    console.log(entry.speech ? `${entry.words} words` : clip.audio ? "no speech" : "no sound");
  }
  // the video's size: the most common one among the clips with speech (else all), as the footage is shot
  const pool = clips.some((c) => c.speech) ? clips.filter((c) => c.speech) : clips;
  const count = {};
  for (const c of pool) count[`${c.width}x${c.height}`] = (count[`${c.width}x${c.height}`] || 0) + 1;
  const main = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
  const [w, h] = main.split("x").map(Number);
  const ratio = w / h;
  const shape = ratio > 1.5 ? "16:9" : ratio > 0.9 ? "1:1" : ratio > 0.7 ? "4:5" : "9:16";
  const sizes = [...new Set(clips.map((c) => `${c.width}×${c.height}`))];
  const result = { scanned: new Date().toISOString(), size: { width: w, height: h, shape }, clips };
  writeFileSync(listFile, `${JSON.stringify(result, null, 2)}\n`);
  const speech = clips.filter((c) => c.speech);
  console.log(
    [
      "",
      `${clips.length} clips, ${tc(clips.reduce((a, c) => a + c.duration, 0))} in all; speech in ${speech.length} (${tc(speech.reduce((a, c) => a + (c.speaking || 0), 0))} of speaking).`,
      `The video's size: ${shape} (${w}×${h}), from the footage.${sizes.length > 1 ? ` The clips aren't all the same size (${sizes.join(", ")}): the others will be cropped to fill it.` : ""}`,
      `Listed in ${relative(PROJECT, listFile)}. Read each clip's transcript notes (footage/transcripts/*.md) and look at its sheet (footage/sheets/*.jpg).`,
    ].join("\n"),
  );
}

// ───────── a still ─────────

function still() {
  const [clip, at] = positional;
  if (!clip || at === undefined) fail("usage: footage.mjs still <clip> <time> --size 1920x1080 --out <file.png>");
  const [w, h] = sizeOf(opt("--size"));
  const out = opt("--out") || fail("--out <file.png> is needed");
  mkdirSync(dirname(resolve(out)), { recursive: true });
  ff(["-ss", seconds(at).toFixed(3), "-i", clipPath(clip), "-frames:v", "1", "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`, resolve(out)]);
  console.log(resolve(out));
}

// ───────── a scene's rough cut ─────────

/** "<clip>@<in>-<out>" (or …+<at> for --over) → { file, from, to, at } */
function range(text, over = false) {
  const m = /^(.+?)@([\d:.]+)-([\d:.]+)(?:\+([\d:.]+))?$/.exec(String(text));
  if (!m) fail(`"${text}" isn't a range: write <clip>@<in>-<out>${over ? "+<at>" : ""}, such as talk.mp4@12.4-18.0`);
  const from = seconds(m[2]);
  const to = seconds(m[3]);
  if (!(to > from)) fail(`"${text}": the out time must come after the in time`);
  if (over && m[4] === undefined) fail(`"${text}": --over needs +<at>, the time into the cut where the B-roll starts`);
  return { file: clipPath(m[1]), from, to, at: m[4] === undefined ? null : seconds(m[4]) };
}

/** The proxy for a clip if the scan made one (much quicker to cut, same timing), else the clip itself. */
function quick(file) {
  const proxy = join(OUT, "proxies", `${basename(file).replace(/\.[^.]+$/, "")}.mp4`);
  return existsSync(proxy) && statSync(proxy).mtimeMs >= statSync(file).mtimeMs ? proxy : file;
}

function clip() {
  const parts = positional.map((p) => range(p));
  const overs = all("--over").map((p) => range(p, true));
  if (!parts.length) fail("usage: footage.mjs clip <clip>@<in>-<out> […] --size 1920x1080 --out <file.mp4> [--over <clip>@<in>-<out>+<at>]");
  const [W, H] = sizeOf(opt("--size"));
  const out = opt("--out") || fail("--out <file.mp4> is needed");
  // small: 640 px on the long side, even numbers
  const k = 640 / Math.max(W, H);
  const w = 2 * Math.round((W * k) / 2);
  const h = 2 * Math.round((H * k) / 2);
  const fit = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=30`;
  const args = [];
  const graph = [];
  let n = 0;
  parts.forEach((p, i) => {
    const src = quick(p.file);
    const len = p.to - p.from;
    args.push("-ss", p.from.toFixed(3), "-t", len.toFixed(3), "-i", src);
    const v = n++;
    graph.push(`[${v}:v]${fit},setpts=PTS-STARTPTS[v${i}]`);
    if (probe(src)?.audio) {
      graph.push(`[${v}:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, len - 0.03).toFixed(3)}:d=0.03[a${i}]`);
    } else {
      args.push("-f", "lavfi", "-t", len.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo");
      graph.push(`[${n++}:a]asetpts=PTS-STARTPTS[a${i}]`);
    }
  });
  graph.push(`${parts.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${parts.length}:v=1:a=1[vc][ac]`);
  let last = "vc";
  overs.forEach((o, i) => {
    const len = o.to - o.from;
    args.push("-ss", o.from.toFixed(3), "-t", len.toFixed(3), "-i", quick(o.file));
    graph.push(`[${n++}:v]${fit},setpts=PTS-STARTPTS+${o.at.toFixed(3)}/TB[o${i}]`);
    graph.push(`[${last}][o${i}]overlay=enable='between(t,${o.at.toFixed(3)},${(o.at + len).toFixed(3)})':eof_action=pass[vo${i}]`);
    last = `vo${i}`;
  });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  ff([...args, "-filter_complex", graph.join(";"), "-map", `[${last}]`, "-map", "[ac]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", resolve(out)]);
  const made = probe(resolve(out));
  console.log(`${resolve(out)} (${tc(made?.duration || 0)}, ${w}×${h})`);
}

if (cmd === "scan") await scan();
else if (cmd === "still") still();
else if (cmd === "clip") clip();
else fail("usage: footage.mjs scan | still <clip> <time> --size WxH --out <png> | clip <clip>@<in>-<out> … --size WxH --out <mp4>");
