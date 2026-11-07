// The spoken words in the film's time (`studio.mjs words <video>`), and what's made from them, so no timing is worked
// out by hand: the voiceover's verified transcript moved to where its <audio> starts, or a footage cut's words.
// - `--correct`: the voiceover's transcript with the approved script's words (its spelling and punctuation) on the times
//   heard, saved as inputs/transcript_verified.json, and vo-check's look at the times.
// - `--cut`: a footage video's docs/words.json from the cut itself: each <video> with sound plays its take's words
//   (footage/transcripts/), moved to where it sits in the film.
// - `--duck [level]`: the music's duck under the voice (audio/mixing.md, "Room for the voice"), written into the
//   music's data-automation and tools/duck-lane.json, for the leveller.
// - `--captions`: the captions files (tools/captions.mjs), as `final` makes them.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { attrs, speechFile } from "./check.mjs";
import { PLUGIN_ROOT, readBrief, readJSON, readScript, scriptVersions } from "./studio.mjs";

const CAPTIONS = join(PLUGIN_ROOT, "scripts", "tools", "captions.mjs");
const VO_CHECK = join(PLUGIN_ROOT, "scripts", "tools", "vo-check.mjs");
// the duck (audio/mixing.md): spans bridge gaps under 0.6 s; down over 0.15 s before each, back over 0.4 s after
const BRIDGE = 0.6;
const DOWN = 0.15;
const UP = 0.4;
// a pause long enough to start a new line of the listing
const PAUSE = 0.3;

const round = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const num = (x) => String(round(x, 3));
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const list = (j) => (Array.isArray(j) ? j : Array.isArray(j?.words) ? j.words : []).filter((w) => w && Number.isFinite(+w.start) && String(w.text ?? "").trim());
const mtime = (p) => {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
};

/** A video's sound as words need it: its media clips (audio and video tags, their attributes), the brief, the latest
    script, and whether it's built yet. */
function readVideoSound(root, slug) {
  const dir = join(root, "videos", slug);
  const index = join(dir, "index.html");
  const html = existsSync(index) ? readFileSync(index, "utf8") : "";
  const media = [...html.matchAll(/<(audio|video)\b[^>]*>/gi)].map((m) => ({ tag: m[1].toLowerCase(), attrs: attrs(m[0]), raw: m[0], index: m.index }));
  const brief = readBrief(root, slug);
  const version = scriptVersions(root, slug).at(-1);
  const script = version ? readScript(root, slug, version)?.script : null;
  const footage = brief.type === "footage" || script?.mode === "footage";
  return { dir, index, html, media, brief, script, footage, built: Boolean(html) };
}

/** Where the spoken words come from and how far they move: speechFile's (check.mjs), or before the film has its
    voiceover clip (not built yet, or started from the storyboard's frames), the voiceover's transcript in its own
    time (`own`). { file, offset, clip, own } or null. */
function speechSource(v) {
  if (v.built) {
    const s = speechFile(v.dir, v.brief, v.script, v.media);
    if (s) {
      const clip = v.footage && s.file.endsWith(join("docs", "words.json")) ? null : v.media.find((m) => m.tag === "audio" && voiceClip(m));
      return { ...s, clip, own: false };
    }
    if (v.footage) return null;
  }
  const file = v.footage ? join(v.dir, "docs", "words.json") : [join(v.dir, "inputs", "transcript_verified.json"), join(v.dir, "inputs", "transcript.json")].find(existsSync);
  return file && existsSync(file) ? { file, offset: 0, clip: null, own: true } : null;
}

/** Whether a media clip is the voiceover (as speechFile finds it). */
export const voiceClip = (m) => m.attrs["data-timeline-role"] === "voiceover" || /\b(vo|voice|voiceover|narration)\b/i.test(`${m.attrs.id || ""} ${m.attrs.src || ""}`);
const musicClip = (m) => m.tag === "audio" && (m.attrs["data-timeline-role"] === "music" || /\b(music|bgm|soundtrack|bed|score)\b/i.test(`${m.attrs.id || ""} ${m.attrs.src || ""}`));

/** The spoken words in the film's time: { words: [{ text, start, end }], source, offset, clip, v }. */
export function spokenWords(root, slug) {
  const v = readVideoSound(root, slug);
  const source = speechSource(v);
  if (!source) return { words: [], source: null, offset: 0, v };
  const words = list(readJSON(source.file))
    .map((w) => ({ text: String(w.text).trim(), start: +w.start + source.offset, end: (+w.end || +w.start) + source.offset }))
    .sort((a, b) => a.start - b.start);
  return { words, source: source.file, offset: source.offset, clip: source.clip, own: source.own, v };
}

/** Words into lines: a new line at a pause of PAUSE s or more, or after a sentence's end. */
function phrases(words) {
  const out = [];
  let cur = [];
  for (const [i, w] of words.entries()) {
    const prev = words[i - 1];
    if (cur.length && (w.start - prev.end >= PAUSE || /[.!?…]["”’)]?$/.test(prev.text))) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
}

/** `words <video>`: the listing, a line per phrase, each word at the time it starts. */
export function describeWords(root, slug) {
  const s = spokenWords(root, slug);
  if (!s.source) {
    return [s.v.footage
      ? `${slug} has no spoken words yet: a footage video's words come from its cut (\`studio.mjs words ${slug} --cut\`, once the cut is built).`
      : `${slug} has no spoken words: no voiceover transcript (inputs/transcript.json, from HF transcribe) and no voiceover in the film.`];
  }
  const from = relative(s.v.dir, s.source);
  const where = s.offset
    ? `moved ${s.offset > 0 ? "+" : ""}${num(s.offset)} s to where ${s.clip?.attrs.id ? `#${s.clip.attrs.id}` : "the voiceover"} starts`
    : !s.own
      ? "in the film's time"
      : s.v.built
        ? "in the voiceover's own time (the film has no voiceover clip yet)"
        : "in the voiceover's own time (the film isn't built yet)";
  const lines = [`${slug}: ${plural(s.words.length, "word")} spoken, ${num(s.words[0].start)}–${num(s.words.at(-1).end)} s, from ${from}, ${where}.`];
  if (!s.v.footage && from === join("inputs", "transcript.json")) lines.push("Not verified yet: `--correct` puts the approved script's words on these times (inputs/transcript_verified.json).");
  for (const p of phrases(s.words)) lines.push(`  ${`${num(p[0].start)}–${num(p.at(-1).end)}`.padEnd(13)} ${p.map((w) => `${w.text}@${num(w.start)}`).join(" ")}`);
  return lines;
}

// ───────── the voiceover's words, corrected against the script ─────────

const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}'£$€%]+/gu, "").replace(/^'+|'+$/g, "");

/** The approved script's spoken words, in order. */
function scriptWords(script) {
  return (script?.rows || [])
    .map((r) => String(r.voiceover || ""))
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/…(?=\S)/g, "… ")
    .split(/\s+/)
    .filter((t) => norm(t));
}

/** Pair the heard words with the script's: the longest run of words that match (by letters alone), and between them,
    blocks that differ. A block of a few words each side is a mishearing (the script's words take the heard times,
    split by their length where the counts differ); a longer one, or one side empty, is kept as heard and reported. */
function align(heard, script) {
  const a = heard.map((w) => norm(w.text));
  const b = script.map(norm);
  const L = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  const changes = [];
  const unsure = [];
  // a word heard right but written otherwise (its capital or punctuation) is counted, not listed
  let restyled = 0;
  let i = 0;
  let j = 0;
  const block = (i1, j1) => {
    const h = heard.slice(i, i1);
    const s = script.slice(j, j1);
    if (!h.length && !s.length) return;
    // the same letters split differently ("kilowatt hours" and "kilowatt-hours")
    const same = h.map((w) => norm(w.text)).join("") === s.map(norm).join("");
    if (h.length && s.length && (same || (h.length <= 3 && s.length <= 3))) {
      const t0 = h[0].start;
      const t1 = h.at(-1).end;
      if (h.length === s.length) s.forEach((text, k) => out.push({ ...h[k], text }));
      else {
        const total = s.reduce((n, x) => n + norm(x).length, 0) || s.length;
        let t = t0;
        for (const text of s) {
          const end = t + ((t1 - t0) * (norm(text).length || 1)) / total;
          out.push({ text, start: round(t, 3), end: round(end, 3) });
          t = end;
        }
      }
      if (!same || h.length !== s.length || h.some((w, k) => w.text !== s[k])) changes.push(`${h.map((w) => w.text).join(" ")} → ${s.join(" ")} (${num(t0)} s)`);
    } else {
      out.push(...h);
      if (h.length) unsure.push(`said but not in the script at ${num(h[0].start)} s: “${h.map((w) => w.text).join(" ")}”`);
      if (s.length) unsure.push(`in the script but not heard${h.length ? "" : ` near ${num(heard[i - 1]?.end ?? 0)} s`}: “${s.join(" ")}”`);
    }
  };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      if (heard[i].text !== script[j]) restyled++;
      out.push({ ...heard[i], text: script[j] });
      i++;
      j++;
      continue;
    }
    // the next pair that matches, then the block before it
    let i1 = i;
    let j1 = j;
    while (i1 < a.length && j1 < b.length && a[i1] !== b[j1]) {
      if (L[i1 + 1][j1] >= L[i1][j1 + 1]) i1++;
      else j1++;
    }
    block(i1, j1);
    i = i1;
    j = j1;
  }
  block(a.length, b.length);
  return { words: out.map((w, k) => ({ id: `w${k}`, text: w.text, start: round(+w.start, 3), end: round(+w.end, 3) })), changes, unsure, restyled };
}

/** `words <video> --correct`: inputs/transcript_verified.json from inputs/transcript.json and the approved script. */
export function correctWords(root, slug, { again = false } = {}) {
  const v = readVideoSound(root, slug);
  if (v.footage) return ["A footage video's words are its takes' (footage/transcripts/): correct a misheard word there, then `--cut` makes the cut's words from them."];
  const heardFile = join(v.dir, "inputs", "transcript.json");
  const out = join(v.dir, "inputs", "transcript_verified.json");
  if (!existsSync(heardFile)) return ["There's no inputs/transcript.json yet: transcribe the voiceover first (`HF transcribe inputs/vo.wav --engine parakeet --json`, guides/cli.md)."];
  if (!v.script?.rows?.length) return ["There's no script with a voiceover to correct the transcript against."];
  if (!again && existsSync(out) && mtime(out) > mtime(heardFile)) return [`inputs/transcript_verified.json is newer than the transcript, so it may hold fixes made by hand: \`--correct --again\` writes it again from inputs/transcript.json.`];
  const heard = list(readJSON(heardFile)).map((w) => ({ text: String(w.text).trim(), start: +w.start, end: +w.end }));
  const { words, changes, unsure, restyled } = align(heard, scriptWords(v.script));
  writeFileSync(out, `${JSON.stringify(words, null, 1)}\n`);
  const lines = [`inputs/transcript_verified.json: ${plural(words.length, "word")}, the script's words on the times heard: ${plural(changes.length, "word")} corrected${restyled ? `, ${restyled} given the script's capitals or punctuation` : ""}.`];
  if (changes.length) lines.push(`  ${changes.join("; ")}`);
  for (const u of unsure) lines.push(`  Check: ${u}.`);
  // the times, against where the speech is in the recording
  const audio = ["vo.wav", "voiceover.wav"].map((n) => join(v.dir, "inputs", n)).find(existsSync);
  if (audio) {
    const r = spawnSync(process.execPath, [VO_CHECK, relative(v.dir, audio), relative(v.dir, out)], { cwd: v.dir, encoding: "utf8" });
    const said = (r.stdout || r.stderr || "").trim().split("\n").filter(Boolean);
    lines.push(...said.map((l) => `  ${l}`));
  }
  lines.push("Listen to the key cue words before timing anything to them (production skill, stage 3).");
  return lines;
}

// ───────── a footage cut's words ─────────

/** The take a <video> plays, from footage/footage.json (by its file or its preview copy), and its transcript. */
function takeOf(dir, src) {
  const clips = readJSON(join(dir, "footage", "footage.json"))?.clips || readJSON(join(dir, "footage", "footage.json")) || [];
  const all = Array.isArray(clips) ? clips : [];
  const stem = basename(src, extname(src));
  const c = all.find((x) => x.file === src || x.proxy === src || basename(String(x.file || x.name || ""), extname(String(x.file || x.name || ""))) === stem);
  const transcript = c?.transcript ? join(dir, c.transcript) : join(dir, "footage", "transcripts", `${stem}.json`);
  return existsSync(transcript) ? transcript : null;
}

/** `words <video> --cut`: docs/words.json from the cut: each <video> that plays its sound gives the words of its range
    of the take (a word counts when most of it is in), moved to where the range sits in the film. Fillers are left out. */
export function cutWords(root, slug) {
  const v = readVideoSound(root, slug);
  if (!v.built) return [`${slug} isn't built yet: the cut's words come from its <video> clips in index.html.`];
  const out = [];
  const used = [];
  let fillers = 0;
  for (const m of v.media.filter((x) => x.tag === "video")) {
    const a = m.attrs;
    const muted = "muted" in a || a["data-has-audio"] === "false" || Number(a["data-volume"] ?? 1) === 0;
    if (muted || !a.src || !Number.isFinite(+a["data-start"])) continue;
    const transcript = takeOf(v.dir, a.src);
    if (!transcript) continue;
    const start = +a["data-start"];
    const from = +a["data-media-start"] || 0;
    const rate = +a["data-playback-rate"] || 1;
    const length = Number.isFinite(+a["data-duration"]) && a["data-duration"] !== "" ? +a["data-duration"] : Infinity;
    const to = from + length * rate;
    let n = 0;
    for (const w of list(readJSON(transcript))) {
      const mid = (+w.start + +w.end) / 2;
      if (mid < from || mid >= to) continue;
      if (w.filler) {
        fillers++;
        continue;
      }
      out.push({ text: String(w.text).trim(), start: round(start + (Math.max(+w.start, from) - from) / rate, 3), end: round(start + (Math.min(+w.end, to) - from) / rate, 3) });
      n++;
    }
    used.push(`#${a.id || "?"} ${num(from)}–${num(to)} s of ${basename(a.src)} at ${num(start)} s (${n})`);
  }
  if (!out.length) return ["No <video> in the cut plays a take with a transcript (footage/transcripts/, from `footage.mjs scan`), so there are no words to write."];
  out.sort((x, y) => x.start - y.start);
  const file = join(v.dir, "docs", "words.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(out.map((w, k) => ({ id: `w${k}`, ...w })), null, 1)}\n`);
  return [`docs/words.json: ${plural(out.length, "word")} from ${plural(used.length, "clip")}${fillers ? ` (${plural(fillers, "filler")} left out)` : ""}: ${used.join("; ")}.`];
}

/** A footage video's docs/words.json made again from its cut when the cut has changed since (or there's none), as
    `draft` and `final` do before their checks: the line it wrote, or null. */
export function refreshCut(root, slug) {
  const v = readVideoSound(root, slug);
  const file = join(v.dir, "docs", "words.json");
  if (!v.footage || !v.built || mtime(file) > mtime(v.index)) return null;
  return cutWords(root, slug)[0];
}

// ───────── the music's duck ─────────

/** The duck's volume lane for a music clip from the words: spans that bridge gaps under BRIDGE s, down to `level`
    over the DOWN s before each, back to full over UP s after it, in the clip's own seconds, from full at t 0. */
export function duckLane(words, clip, level = 0.25) {
  const at = +clip.attrs["data-start"] || 0;
  const length = +clip.attrs["data-duration"] || Infinity;
  const spans = [];
  for (const w of words) {
    const last = spans.at(-1);
    if (last && w.start - last[1] < BRIDGE) last[1] = Math.max(last[1], w.end);
    else spans.push([w.start, w.end]);
  }
  // speech from the clip's first moment starts it down
  const points = [{ t: 0, v: spans.length && spans[0][0] - at <= DOWN && spans[0][1] > at ? level : 1 }];
  for (const [a, b] of spans) {
    const s = Math.max(0, a - at);
    const e = b - at;
    if (e <= 0 || s >= length) continue;
    const down = Math.max(points.at(-1).t, s - DOWN);
    if (points.at(-1).v === 1) {
      if (down > points.at(-1).t) points.push({ t: round(down, 3), v: 1 });
      points.push({ t: round(Math.max(down, s), 3), v: level });
    }
    points.push({ t: round(Math.min(e, length), 3), v: level });
    if (e + UP <= length) points.push({ t: round(e + UP, 3), v: 1 });
  }
  // a lane holds 512 points at most; spans that close become one
  return { spans: spans.length, lane: { version: 1, lanes: [{ target: "volume", points: points.filter((p, k) => k === 0 || p.t > points[k - 1].t || p.v !== points[k - 1].v).slice(0, 512) }] } };
}

/** `words <video> --duck [level]`: the music's duck under the spoken words, into each music clip's data-automation (its
    other lanes kept) and tools/duck-lane.json. */
export function duckMusic(root, slug, { level = 0.25 } = {}) {
  const s = spokenWords(root, slug);
  if (!s.v.built) return [`${slug} isn't built yet: the duck goes on the film's music.`];
  if (s.own) return ["The film has no voiceover clip yet: the duck follows the voice where it plays in the film."];
  if (!s.words.length) return ["There are no spoken words to duck the music under."];
  const music = s.v.media.filter(musicClip);
  if (!music.length) return ["The film has no music clip (an <audio> with data-timeline-role=\"music\", or music in its id or file)."];
  if (!(level > 0 && level < 1)) throw new Error("The duck's level is the music's share under the voice, between 0 and 1 (0.25 by default).");
  let html = s.v.html;
  const lines = [];
  // from the last clip back, so the positions found stay true
  for (const m of [...music].sort((a, b) => b.index - a.index)) {
    const { lane, spans } = duckLane(s.words, m, level);
    let current = {};
    try {
      current = m.attrs["data-automation"] ? JSON.parse(m.attrs["data-automation"]) : {};
    } catch {}
    const lanes = [...(Array.isArray(current.lanes) ? current.lanes.filter((l) => l.target !== "volume") : []), ...lane.lanes];
    const value = JSON.stringify({ version: 1, lanes }).replace(/"/g, "&quot;");
    const tag = /\sdata-automation\s*=\s*("[^"]*"|'[^']*')/i.test(m.raw) ? m.raw.replace(/\sdata-automation\s*=\s*("[^"]*"|'[^']*')/i, ` data-automation="${value}"`) : m.raw.replace(/\s*\/?>$/, (end) => ` data-automation="${value}"${end.trim() === "/>" ? " />" : ">"}`);
    html = html.slice(0, m.index) + tag + html.slice(m.index + m.raw.length);
    if (m === music[0]) {
      const file = join(s.v.dir, "tools", "duck-lane.json");
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `${JSON.stringify(lane)}\n`);
    }
    lines.unshift(`#${m.attrs.id || "?"}: down to ${Math.round(level * 100)}% under ${plural(spans, "stretch", "stretches")} of speech (${plural(lane.lanes[0].points.length, "point")}${current.lanes?.some((l) => l.target === "volume") ? ", in place of its volume lane" : ""}).`);
  }
  writeFileSync(s.v.index, html);
  lines.unshift(`The music's duck, from the spoken words (${relative(s.v.dir, s.source)}), in index.html and tools/duck-lane.json:`);
  lines.push(`Level the stems with it: level.mjs … --lane music=tools/duck-lane.json (audio/mixing.md).`);
  return lines;
}

// ───────── captions ─────────

/** The captions files from the spoken words (tools/captions.mjs, run from the video's folder): its last line, or why
    they weren't made. Used by `words --captions` and `final`. */
export function writeCaptions(dir, speech) {
  const c = spawnSync(process.execPath, [CAPTIONS, relative(dir, speech.file), ...(speech.offset ? ["--offset", String(speech.offset)] : [])], { cwd: dir, encoding: "utf8" });
  return c.status === 0 ? `Captions: ${c.stdout.trim().split("\n").pop()}` : `The captions weren't made: ${(c.stderr || c.stdout).trim().split("\n").pop()}`;
}

/** `words <video> --captions`. */
export function captionWords(root, slug) {
  const v = readVideoSound(root, slug);
  const s = speechSource(v);
  if (!s) return [v.footage ? "No captions: the cut has no words yet (`--cut` writes docs/words.json)." : "No captions: the film has no speech."];
  if (s.own && v.built) return ["No captions yet: the film has no voiceover clip, and the captions follow it."];
  return [writeCaptions(v.dir, s)];
}
