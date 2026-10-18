#!/usr/bin/env node
// Captions files from a video's word times, for its delivery: an SRT (YouTube, LinkedIn and most players) and a WebVTT
// (websites). Run from the video's folder:
//   node <plugin>/scripts/tools/captions.mjs <words.json> [--out renders/<video>] [--offset <seconds>]
// <words.json> is a list of { text, start, end } in seconds (as HyperFrames' transcribe writes it, and the verified
// voiceover, inputs/transcript_verified.json), or { words: [...] }. --offset moves every caption, for a voiceover that
// starts later in the video. Each caption is one or two lines of at most 42 characters, at most 6 seconds long, and
// ends at a sentence's end or a pause.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const IN = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!IN) {
  console.error("usage: captions.mjs <words.json> [--out renders/<video>] [--offset <seconds>]");
  process.exit(1);
}
const OUT = resolve(opt("--out", `renders/${basename(process.cwd())}`)).replace(/\.(srt|vtt)$/i, "");
const OFFSET = Number(opt("--offset", 0)) || 0;
const LINE = 42;
const PAUSE = 0.6;
const LONGEST = 6;

const raw = JSON.parse(readFileSync(IN, "utf8"));
const words = (Array.isArray(raw) ? raw : raw.words || [])
  .map((w) => ({ text: String(w.text ?? w.word ?? "").trim(), start: Number(w.start), end: Number(w.end) }))
  .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end))
  .sort((a, b) => a.start - b.start);
if (!words.length) {
  console.error(`No words with times in ${IN}.`);
  process.exit(1);
}

/** Words into lines of at most LINE characters. */
const wrap = (list) => {
  const lines = [];
  for (const w of list) {
    const last = lines.at(-1);
    if (last && `${last} ${w.text}`.length <= LINE) lines[lines.length - 1] = `${last} ${w.text}`;
    else lines.push(w.text);
  }
  return lines;
};

const cues = [];
let current = [];
const close = () => current.length && cues.push(current) && (current = []);
for (const [i, w] of words.entries()) {
  const prev = words[i - 1];
  if (current.length) {
    const sentence = /[.!?…]["”’)]?$/.test(prev.text);
    const pause = w.start - prev.end >= PAUSE;
    const tooLong = w.end - current[0].start > LONGEST;
    const tooWide = wrap([...current, w]).length > 2;
    if (sentence || pause || tooLong || tooWide) close();
  }
  current.push(w);
}
close();

const stamp = (t, sep) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
const timed = cues.map((c, i) => {
  const start = c[0].start + OFFSET;
  const next = cues[i + 1] ? cues[i + 1][0].start + OFFSET : Infinity;
  // on screen for at least 0.8 seconds where there's room, and never over the next one
  const end = Math.min(Math.max(c.at(-1).end + OFFSET + 0.1, start + 0.8), next - 0.05);
  return { start, end, lines: wrap(c) };
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(`${OUT}.srt`, timed.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.lines.join("\n")}\n`).join("\n"));
writeFileSync(`${OUT}.vtt`, `WEBVTT\n\n${timed.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.lines.join("\n")}\n`).join("\n")}`);
console.log(`${timed.length} captions: ${OUT}.srt and ${OUT}.vtt`);
