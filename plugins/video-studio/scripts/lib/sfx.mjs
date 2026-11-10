// SFX Kit: the sound effects Video Studio uses (https://github.com/wyzowl/sfx-kit, CC0). It's downloaded once, by
// setup or in the background when a session starts (lib/extras.mjs), into ~/.wyzowl-video-studio/sfx-kit/<version>/,
// where every file is checked against its record, and read from there. A video copies the sounds it uses into its own folder (tools/sfx.mjs), so a finished film never
// changes when the kit does. When the kit has no sound for a moment, and none of its sounds can be adapted, the studio
// makes one and logs what was missing in ~/.wyzowl-video-studio/sfx-gaps.json, so the kit can grow.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { USER_DIR, readJSON } from "./studio.mjs";

/** The kit this version of the plugin uses: its release, and the zip's checksum. */
export const SFX_KIT = {
  version: "1.0.0",
  url: "https://github.com/wyzowl/sfx-kit/releases/download/v1.0.0/sfx-kit-1.0.0.zip",
  sha256: "a6c5c665dd95b25c4b155160a118723386f5487094790f32d1aaee367018bf10",
  size: "about 55 MB",
  home: "https://github.com/wyzowl/sfx-kit",
};
const KITS_DIR = join(USER_DIR, "sfx-kit");
/** Where the kit is unpacked. */
export const KIT_DIR = join(KITS_DIR, SFX_KIT.version);
/** The sounds the kit didn't have, as the studio met them. */
export const GAPS = join(USER_DIR, "sfx-gaps.json");

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/** Whether the kit is on this Mac, unpacked and checked. */
export const kitInstalled = () => existsSync(join(KIT_DIR, "sounds.json"));

let kit = null;
/** The kit's sounds.json: { version, how_to_use, loudness, categories, sounds }. */
export function readKit() {
  if (!kitInstalled()) throw new Error(`SFX Kit isn't on this Mac yet. Download it (${SFX_KIT.size}, once) with: node <plugin>/scripts/studio.mjs install sfx-kit`);
  return (kit ??= readJSON(join(KIT_DIR, "sounds.json")));
}

/** One sound's record, or null. */
export const kitSound = (id) => readKit().sounds.find((s) => s.id === id) || null;

/** Download the kit (or read it from the zip at WVS_SFX_KIT_ZIP, for tests), check it, and unpack it. Older versions
    are removed: videos keep their own copies of the sounds they use. */
export async function installKit({ log = console.log } = {}) {
  if (kitInstalled()) return { already: true, sounds: readKit().sounds.length };
  let zip;
  if (process.env.WVS_SFX_KIT_ZIP) zip = readFileSync(process.env.WVS_SFX_KIT_ZIP);
  else {
    log(`Downloading SFX Kit ${SFX_KIT.version} (${SFX_KIT.size}, once)…`);
    const res = await fetch(SFX_KIT.url, { signal: AbortSignal.timeout(15 * 60 * 1000) });
    if (!res.ok) throw new Error(`The download failed (${res.status}). Check the internet connection and try again.`);
    zip = Buffer.from(await res.arrayBuffer());
  }
  if (sha(zip) !== SFX_KIT.sha256) throw new Error("The download didn't match SFX Kit's checksum, so it wasn't used. Try again.");
  mkdirSync(KITS_DIR, { recursive: true });
  const tmp = mkdtempSync(join(KITS_DIR, ".unpack-"));
  try {
    writeFileSync(join(tmp, "kit.zip"), zip);
    const r = spawnSync("unzip", ["-q", join(tmp, "kit.zip"), "-d", tmp], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`Unzipping SFX Kit failed: ${(r.stderr || r.stdout || "").trim()}`);
    const root = join(tmp, `sfx-kit-${SFX_KIT.version}`);
    const data = readJSON(join(root, "sounds.json"), null);
    if (data?.version !== SFX_KIT.version || !Array.isArray(data.sounds)) throw new Error("The download isn't the SFX Kit release this plugin expects.");
    const bad = data.sounds.filter((s) => !existsSync(join(root, s.file)) || sha(readFileSync(join(root, s.file))) !== s.sha256);
    if (bad.length) throw new Error(`${bad.length} of SFX Kit's files didn't match their records (${bad[0].id}, for one), so it wasn't installed. Try again.`);
    rmSync(KIT_DIR, { recursive: true, force: true });
    renameSync(root, KIT_DIR);
    for (const v of readdirSync(KITS_DIR)) if (v !== SFX_KIT.version && !v.startsWith(".")) rmSync(join(KITS_DIR, v), { recursive: true, force: true });
    kit = null;
    return { installed: true, sounds: data.sounds.length };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ───────── finding sounds ─────────

const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "is", "it", "its", "as", "at", "by", "into", "onto", "from", "up"]);
// words to their stem, so "slides", "sliding" and "slide" meet
const stem = (w) => w.replace(/(ings?|ed|es|s)$/, "").replace(/e$/, "") || w;
const terms = (t) => (String(t || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w)).map(stem);

/** Sounds for a moment described in words ("a phone slides in and lands"), best first. Filters: a category id, a
    sync.meets value, and a moment's length in seconds that the sound's fits_seconds must hold. */
export function findSounds(query, { category = "", meets = "", seconds = null, limit = 12 } = {}) {
  const want = [...new Set(terms(query))];
  const fields = (s) => [
    [terms(s.id), 3],
    [terms(s.name), 2],
    [terms(s.tags.join(" ")), 2],
    [terms(s.use_for.join(" ")), 2],
    [terms(s.description), 1],
    [terms(s.character), 1],
  ];
  return readKit()
    .sounds.filter((s) => (!category || s.category === category) && (!meets || s.sync.meets === meets))
    .filter((s) => seconds === null || (s.fits_seconds && seconds >= s.fits_seconds[0] && seconds <= s.fits_seconds[1]))
    .map((s) => {
      const f = fields(s);
      const weights = want.map((w) => Math.max(0, ...f.filter(([ts]) => ts.includes(w)).map(([, weight]) => weight)));
      return { s, hits: weights.filter(Boolean).length, score: weights.reduce((a, b) => a + b, 0) };
    })
    .filter((x) => !want.length || x.hits > 0)
    // the sounds that match more of the words first, then the closer matches
    .sort((a, b) => b.hits - a.hits || b.score - a.score || a.s.id.localeCompare(b.s.id))
    .slice(0, limit)
    .map((x) => x.s);
}

// ───────── the sounds the kit didn't have ─────────

/** Each sound the kit didn't have: { what, video, at, made, date }, oldest first. */
export const readGaps = () => {
  const g = readJSON(GAPS, []);
  return Array.isArray(g) ? g : [];
};

/** Log a sound the kit didn't have, once per video. */
export function logGap({ what, video = "", at = null, made = "" }) {
  const gaps = readGaps();
  if (gaps.some((g) => g.what === what && g.video === video)) return false;
  gaps.push({ what, video, at, made, date: new Date().toISOString().slice(0, 10) });
  mkdirSync(USER_DIR, { recursive: true });
  writeFileSync(GAPS, `${JSON.stringify(gaps, null, 2)}\n`);
  return true;
}

// ───────── the sounds, to listen to ─────────

const peaksCache = new Map();
/** A sound's waveform for its pages: `n` loudest sample levels (0–1, both channels), evenly across the file, or null
    when the file can't be read. Read from the WAV once per page server. */
export function soundPeaks(sound, n = 96) {
  const key = `${sound.id}:${n}`;
  if (peaksCache.has(key)) return peaksCache.get(key);
  let peaks = null;
  try {
    peaks = wavPeaks(readFileSync(join(KIT_DIR, sound.file)), n);
  } catch {}
  peaksCache.set(key, peaks);
  return peaks;
}

/** The loudest level in each of `n` equal stretches of a PCM or float WAV. */
function wavPeaks(buf, n) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let fmt = null;
  let data = null;
  for (let at = 12; at + 8 <= buf.length; ) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") {
      const tag = buf.readUInt16LE(at + 8);
      // WAVE_FORMAT_EXTENSIBLE names its real format in its sub-format
      fmt = { format: tag === 0xfffe && size >= 26 ? buf.readUInt16LE(at + 32) : tag, channels: buf.readUInt16LE(at + 10), bits: buf.readUInt16LE(at + 22) };
    }
    if (id === "data") data = [at + 8, Math.min(buf.length, at + 8 + size)];
    at += 8 + size + (size % 2);
  }
  if (!fmt || !data) return null;
  const bytes = fmt.bits / 8;
  const float = fmt.format === 3;
  const read =
    float && bytes === 4 ? (o) => buf.readFloatLE(o)
    : bytes === 2 ? (o) => buf.readInt16LE(o) / 32768
    : bytes === 3 ? (o) => buf.readIntLE(o, 3) / 8388608
    : bytes === 4 ? (o) => buf.readInt32LE(o) / 2147483648
    : null;
  if (!read) return null;
  const frame = bytes * fmt.channels;
  const frames = Math.floor((data[1] - data[0]) / frame);
  if (!frames) return null;
  const out = new Array(n).fill(0);
  for (let i = 0; i < frames; i++) {
    const b = Math.min(n - 1, Math.floor((i * n) / frames));
    for (let c = 0; c < fmt.channels; c++) {
      const v = Math.abs(read(data[0] + i * frame + c * bytes));
      if (v > out[b]) out[b] = v;
    }
  }
  return out.map((v) => Math.min(1, Math.round(v * 1000) / 1000));
}
