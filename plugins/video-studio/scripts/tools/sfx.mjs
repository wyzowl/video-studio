#!/usr/bin/env node
// Sound effects from SFX Kit for a video: find them, then build the video's effects track from its cue list.
//   node <plugin>/scripts/tools/sfx.mjs find <words> [--category <id>] [--meets <kind>] [--seconds <s>] [--limit <n>]
//                                         sounds for a moment, best first, with what places and fits each one
//   node <plugin>/scripts/tools/sfx.mjs show <id>         everything the kit says about one sound
//   node <plugin>/scripts/tools/sfx.mjs build [<cues>]    from the video's folder: assets/audio/sfx_raw.wav from
//                                         assets/audio/sfx-cues.json (the format is in references/audio.md)
//   node <plugin>/scripts/tools/sfx.mjs copy <id> <file>  a kit sound into a file (a brand's logo ident)
//   node <plugin>/scripts/tools/sfx.mjs gaps              the sounds the kit didn't have, as the studio met them
// The build places each sound by the kit's one rule (start = the moment − sync.at, divided by its rate), trims what
// would start before 0, fades every cut, sets the effects' level against the voiceover (or the music), and lowers each
// sound by its under_voiceover_db where its body overlaps speech. It copies each kit sound it uses, with its record,
// into assets/audio/sfx/, and builds from those copies from then on, so the video never changes when the kit does.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { readJSON } from "../lib/studio.mjs";
import { KIT_DIR, SFX_KIT, findSounds, kitSound, logGap, readGaps } from "../lib/sfx.mjs";

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const [cmd, ...rest] = positional;
const SR = 48000;
// the kit's levels suit a voiceover mixed to about −16 LUFS integrated (its GUIDE): the effects move with the real one
const REFERENCE_LUFS = -16;
const fromDb = (x) => 10 ** (x / 20);
const signed = (x) => `${x < 0 ? "−" : x > 0 ? "+" : ""}${Math.abs(x).toFixed(1)}`;

const summary = (s) => {
  const fits = s.fits_seconds ? ` · fits ${s.fits_seconds[0]}–${s.fits_seconds[1]} s` : "";
  const covers = s.avoid_for.some((a) => /^On top of speech/.test(a)) ? " · covers a voice" : "";
  return `${s.id}  ${s.duration.toFixed(2)} s · sync ${s.sync.at.toFixed(3)} s (${s.sync.meets})${fits} · under speech ${signed(s.under_voiceover_db)} dB${s.tuning ? ` · ${s.tuning}` : ""}${covers}\n    ${s.description} For: ${s.use_for[0]}.`;
};

function find() {
  const seconds = opt("--seconds");
  const found = findSounds(rest.join(" "), { category: opt("--category", ""), meets: opt("--meets", ""), seconds: seconds === null ? null : Number(seconds), limit: Number(opt("--limit", 12)) });
  if (!found.length) return console.log("Nothing in SFX Kit matches. Try other words, or fewer filters; `find` with no words lists every sound.");
  console.log(found.map(summary).join("\n"));
}

function show() {
  const s = kitSound(rest[0] || "");
  if (!s) throw new Error(`No sound "${rest[0] || ""}" in SFX Kit. Find one with: sfx.mjs find <words>`);
  console.log(JSON.stringify(s, null, 2));
}

function copy() {
  const [id, dest] = rest;
  const s = kitSound(id || "");
  if (!s || !dest) throw new Error("usage: sfx.mjs copy <id> <file>");
  mkdirSync(dirname(resolve(dest)), { recursive: true });
  copyFileSync(join(KIT_DIR, s.file), resolve(dest));
  console.log(`${dest}: ${s.name}. ${s.description}`);
}

function gaps() {
  const g = readGaps();
  if (!g.length) return console.log("Every sound so far has come from SFX Kit.");
  console.log(g.map((x) => `${x.date}  ${x.what}  (${x.video || "a video"}${x.at !== null ? ` at ${x.at} s` : ""}${x.made ? `: made ${x.made}` : ""})`).join("\n"));
}

// ───────── the effects track ─────────

const ffmpeg = (args) => spawnSync("ffmpeg", ["-hide_banner", "-v", "error", ...args], { maxBuffer: 1 << 30 });
/** Integrated loudness (LUFS) of a file. */
function loudness(path) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" });
  const s = r.stderr || "";
  const j = JSON.parse(s.slice(s.lastIndexOf("{"), s.lastIndexOf("}") + 1));
  return Number(j.input_i);
}
/** A file as 48 kHz stereo float samples (interleaved), from `trim` seconds into it, played at `rate`. */
function decode(path, trim, rate) {
  const r = ffmpeg(["-ss", String(trim), "-i", path, "-af", `aresample=${SR},asetrate=${SR * rate},aresample=${SR}`, "-ac", "2", "-f", "f32le", "-"]);
  if (r.status !== 0) throw new Error(`ffmpeg couldn't read ${path}: ${String(r.stderr).trim()}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
function writeFloatWav(path, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 8);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 8, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float, as the score kit writes its stems
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 8, 28);
  buf.writeUInt16LE(8, 32);
  buf.writeUInt16LE(32, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) {
    buf.writeFloatLE(L[i], 44 + i * 8);
    buf.writeFloatLE(R[i], 48 + i * 8);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
}

function build() {
  const cuesPath = resolve(rest[0] || "assets/audio/sfx-cues.json");
  if (!existsSync(cuesPath)) throw new Error(`No cue list at ${cuesPath}. Write one first (the format is in references/audio.md).`);
  const plan = JSON.parse(readFileSync(cuesPath, "utf8"));
  const cues = Array.isArray(plan.cues) ? plan.cues : [];
  const video = basename(process.cwd());
  const sfxDir = resolve("assets/audio/sfx");
  mkdirSync(sfxDir, { recursive: true });

  // the sounds this video uses: its own copies first; a sound it hasn't used before comes from the kit, and is copied
  const ownPath = join(sfxDir, "sounds.json");
  const own = readJSON(ownPath, { sounds: {} });
  const record = (id) => {
    if (own.sounds[id]) return own.sounds[id];
    const s = kitSound(id);
    if (!s) return null;
    copyFileSync(join(KIT_DIR, s.file), join(sfxDir, `${id}.wav`));
    return (own.sounds[id] = { ...s, kit: SFX_KIT.version });
  };

  // where the voiceover speaks, from its word times: words less than 0.3 s apart are one stretch of speech
  const vo = plan.voiceover || null;
  const speech = [];
  if (vo?.words) {
    const raw = JSON.parse(readFileSync(resolve(vo.words), "utf8"));
    const words = (Array.isArray(raw) ? raw : raw.words || [])
      .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end))
      .map((w) => [w.start + (vo.at || 0), w.end + (vo.at || 0)])
      .sort((a, b) => a[0] - b[0]);
    for (const [a, b] of words) {
      const last = speech.at(-1);
      if (last && a - last[1] < 0.3) last[1] = Math.max(last[1], b);
      else speech.push([a, b]);
    }
  }

  // the effects' level: against the voiceover (or the music, without one), then the effects' own gain
  const ref = vo?.audio || plan.music || null;
  const refLufs = ref && existsSync(resolve(ref)) ? loudness(resolve(ref)) : null;
  const base = refLufs === null ? 0 : refLufs - REFERENCE_LUFS;
  const group = Number(plan.gain_db ?? (plan.music ? -2.5 : 0));

  const errors = [], notes = [], checks = [], placed = [];
  for (const c of cues) {
    const label = `${c.sound || c.file} at ${c.at} s`;
    if (!Number.isFinite(c.at)) {
      errors.push(`${label}: "at" (the moment it meets, in seconds) is missing`);
      continue;
    }
    let s = null, src, syncAt, voDb;
    if (c.sound) {
      s = record(c.sound);
      if (!s) {
        errors.push(`${label}: there's no "${c.sound}" in SFX Kit (find one with: sfx.mjs find <words>)`);
        continue;
      }
      src = join(sfxDir, `${c.sound}.wav`);
      syncAt = s.sync.at;
      voDb = s.under_voiceover_db;
    } else if (c.file) {
      src = resolve(c.file);
      if (!existsSync(src)) {
        errors.push(`${label}: the file isn't there`);
        continue;
      }
      syncAt = Number(c.sync_at ?? 0);
      voDb = Number(c.under_voiceover_db ?? -3);
      if (c.made_for) logGap({ what: c.made_for, video, at: c.at, made: c.file });
    } else {
      errors.push(`a cue at ${c.at} s has neither a "sound" from the kit nor a "file"`);
      continue;
    }
    const rate = Number(c.rate ?? 1);
    if (s) {
      const [lo, hi] = s.adapt.rate;
      if (rate < lo - 1e-9 || rate > hi + 1e-9) checks.push(`${label}: rate ${rate} is outside its range, ${lo} to ${hi}${lo === 1 && hi === 1 ? " (it's tuned, so a rate change detunes it)" : ""}`);
    }
    let trim = Number(c.trim_start ?? 0);
    let start = c.at - (syncAt - trim) / rate;
    if (start < 0) {
      notes.push(`${label}: it would start ${(-start).toFixed(3)} s before the video, so that much is trimmed off its start`);
      trim += -start * rate;
      start = 0;
    }
    const pcm = decode(src, trim, rate);
    let frames = pcm.length / 2;
    const end = Math.min(c.cut_at ?? Infinity, plan.length ?? Infinity);
    let fadeOut = 0;
    if (start + frames / SR > end) {
      const keep = Math.max(0, Math.round((end - start) * SR));
      fadeOut = Math.round(((c.fade_out_ms ?? (frames - keep > 0.5 * SR ? 300 : 30)) / 1000) * SR);
      frames = keep;
    }
    const fadeIn = trim > 0 ? Math.round(((c.fade_in_ms ?? 15) / 1000) * SR) : 0;

    // its body on the timeline (onset to body end), and whether it overlaps speech
    const at = (t) => start + (t - trim) / rate;
    const from = s ? Math.max(start, at(s.timing.onset)) : start;
    const to = Math.min(start + frames / SR, s ? at(s.timing.body_end) : Infinity);
    const onSpeech = speech.some(([a, b]) => to > a && from < b);
    if (onSpeech && s?.avoid_for.some((a) => /^On top of speech/.test(a))) checks.push(`${label}: its body falls on speech, and it covers a voice (${s.avoid_for.find((a) => /^On top of speech/.test(a))}); a pause in the voice may suit it better`);
    const duck = onSpeech && c.duck !== false ? voDb : 0;
    const gain = base + group + Number(c.gain_db ?? 0) + duck;
    placed.push({ c, label, start, rate, trim, frames, pcm, fadeIn, fadeOut, gain, duck });
  }
  if (errors.length) throw new Error(`The cue list has problems, so nothing was built:\n- ${errors.join("\n- ")}`);

  // the same sound twice in quick succession, at the same rate
  placed.forEach((p, i) => {
    const twin = placed.find((q, j) => j < i && q.c.sound && q.c.sound === p.c.sound && Math.abs(q.rate - p.rate) < 0.005 && Math.abs(q.start - p.start) < 1);
    if (twin) notes.push(`${p.label}: the same as the one at ${twin.c.at} s; a sibling or a small rate change keeps quick repeats from sounding mechanical`);
  });

  const length = Math.max(plan.length ?? 0, ...placed.map((p) => p.start + p.frames / SR));
  const n = Math.ceil(length * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const p of placed) {
    const a = Math.round(p.start * SR), g = fromDb(p.gain);
    for (let i = 0; i < p.frames && a + i < n; i++) {
      let env = 1;
      if (i < p.fadeIn) env *= i / p.fadeIn;
      if (p.fadeOut && i > p.frames - p.fadeOut) env *= (p.frames - i) / p.fadeOut;
      L[a + i] += p.pcm[2 * i] * g * env;
      R[a + i] += p.pcm[2 * i + 1] * g * env;
    }
  }
  const out = resolve(plan.out || "assets/audio/sfx_raw.wav");
  writeFloatWav(out, L, R);
  writeFileSync(ownPath, `${JSON.stringify(own, null, 2)}\n`);

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const level = refLufs === null ? "the files' own level (no voiceover or music to set it against)" : `set against ${ref} (${refLufs.toFixed(1)} LUFS): ${signed(base)} dB`;
  console.log(`${out}: ${placed.length} sound${placed.length === 1 ? "" : "s"}, ${length.toFixed(2)} s, peak ${signed(20 * Math.log10(peak || 1e-9))} dBFS`);
  console.log(`Level: ${level}; the effects' own gain ${signed(group)} dB${speech.length ? `; ${speech.length} stretch${speech.length === 1 ? "" : "es"} of speech` : ""}`);
  for (const p of [...placed].sort((a, b) => a.start - b.start)) {
    const how = [p.rate !== 1 && `rate ${p.rate}`, p.trim > 0 && `trimmed ${p.trim.toFixed(3)} s`, p.fadeOut && `cut at ${(p.start + p.frames / SR).toFixed(2)} s`, p.duck && `${signed(p.duck)} dB under speech`].filter(Boolean).join(", ");
    console.log(`  ${p.start.toFixed(3).padStart(7)}  ${(p.c.sound || basename(p.c.file)).padEnd(32)} ${signed(p.gain).padStart(6)} dB${how ? `  (${how})` : ""}${p.c.note ? `  ${p.c.note}` : ""}`);
  }
  if (notes.length) console.log(`Notes:\n- ${notes.join("\n- ")}`);
  if (checks.length) console.log(`Worth a look:\n- ${checks.join("\n- ")}`);
  console.log(`Next: level it with the other stems (references/audio.md), marking it :limit if its transients carry the peaks.`);
}

const commands = { find, show, copy, gaps, build };
try {
  if (!commands[cmd]) throw new Error("usage: sfx.mjs find <words> | show <id> | build [cues.json] | copy <id> <file> | gaps");
  commands[cmd]();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
