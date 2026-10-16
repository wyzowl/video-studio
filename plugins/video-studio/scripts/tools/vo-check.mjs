// Check transcript word times against where speech actually is in the VO, before cueing visuals to them.
//   node <plugin>/scripts/tools/vo-check.mjs inputs/vo.wav inputs/transcript.json [--thresh -33] [--all] [--json]
// Speech islands come from the RMS envelope: 10 ms frames louder than the threshold (default: the VO's
// 95th-percentile level − 22 dB, about −33 dBFS for a normal read), gaps under 0.12 s merged. Then:
//   !!  a word whose start sits in silence with no speech just after it: its timing has drifted
//   ~   a word that starts up to 0.5 s before its speech: harmless for cueing (visuals may lead a hair)
//   !!  speech inside the transcript's range that no word covers: a missed or mis-timed phrase
// A screen, not proof: key cue words still get checked by ear.
// Fix flagged cue words by ear or by re-transcribing that sentence alone; save inputs/transcript_verified.json.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? Number(argv[i + 1]) : d; };
const [VO, TR] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--thresh")));
if (!VO || !TR) { console.error("usage: vo-check.mjs <vo.wav> <transcript.json> [--thresh -33] [--json]"); process.exit(1); }
const SR = 16000, HOP = 0.01, MERGE = 0.12;

// audio → mono 16 kHz float → 10 ms RMS in dBFS
const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", VO, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 }).stdout;
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4), H = Math.round(SR * HOP);
const db = [];
for (let i = 0; i + H <= x.length; i += H) { let s = 0; for (let k = 0; k < H; k++) s += x[i + k] * x[i + k]; db.push(10 * Math.log10(s / H + 1e-12)); }
const p95 = [...db].sort((a, b) => a - b)[Math.floor(0.95 * db.length)];
const THRESH = opt("--thresh", Math.round(p95 - 22));
let islands = [];
db.forEach((d, f) => {
  if (d < THRESH) return;
  const t = f * HOP, last = islands[islands.length - 1];
  if (last && t - last[1] < MERGE) last[1] = t + HOP; else islands.push([t, t + HOP]);
});
islands = islands.filter(([a, b]) => b - a >= 0.06);
const inSpeech = (t) => islands.some(([a, b]) => t >= a - 0.12 && t <= b + 0.12);
const nextOnset = (t) => (islands.find(([a]) => a > t) || [Infinity])[0];

// transcript: [{ text, start, end }] (or { words: [...] }); sentences split on . ? !
const raw = JSON.parse(readFileSync(TR, "utf8")), words = (raw.words || raw).filter((w) => w.start != null);
const sentences = [[]];
words.forEach((w) => { sentences[sentences.length - 1].push(w); if (/[.?!]["”')]*$/.test(w.text)) sentences.push([]); });
if (!sentences[sentences.length - 1].length) sentences.pop();

const fmt = (t) => t.toFixed(2);
const report = sentences.map((S) => {
  const issues = [], notes = [];
  for (const w of S) {
    if (inSpeech(w.start)) continue;
    const lead = nextOnset(w.start) - w.start;
    if (lead <= 0.5) notes.push(`'${w.text}' starts ${fmt(lead)}s before its speech`);
    else issues.push(`'${w.text}' @${fmt(w.start)} starts in silence: drifted (next speech at ${fmt(w.start + lead)})`);
  }
  return { start: S[0].start, end: S[S.length - 1].end, text: S.map((w) => w.text).join(" "), issues, notes };
});
// speech that no word covers
const covered = (a, b) => words.some((w) => w.end > a && w.start < b);
const t0 = words[0].start, t1 = words[words.length - 1].end;
const orphans = islands.filter(([a, b]) => b - a >= 0.25 && a >= t0 && b <= t1 && !covered(a, b));

if (argv.includes("--json")) { console.log(JSON.stringify({ thresh: THRESH, islands: islands.length, sentences: report, orphans }, null, 2)); process.exit(0); }
console.log(`VO check · ${words.length} words · ${sentences.length} sentences · ${islands.length} speech islands (> ${THRESH} dBFS)\n`);
let bad = 0;
for (const r of report) {
  const head = `${fmt(r.start).padStart(6)}–${fmt(r.end).padEnd(6)} ${r.text.slice(0, 70)}${r.text.length > 70 ? "…" : ""}`;
  if (r.issues.length) { bad++; console.log(`  !!  ${head}`); r.issues.forEach((s) => console.log(`        ${s}`)); }
  else if (argv.includes("--all")) console.log(`  ok  ${head}`);
  if ((r.issues.length || argv.includes("--all")) && r.notes.length) r.notes.forEach((s) => console.log(`   ~    ${s}`));
}
orphans.forEach(([a, b]) => console.log(`  !!  speech at ${fmt(a)}–${fmt(b)} has no words on it`));
const early = report.reduce((n, r) => n + r.notes.length, 0);
console.log(`\n${bad ? `${bad} sentence(s) with drifted words: check by ear` : "no drifted words"}${orphans.length ? ` · ${orphans.length} uncovered speech island(s)` : ""}${early ? ` · ${early} word(s) start just early (harmless; --all to list)` : ""}`);
