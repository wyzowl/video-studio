// score-kit leveller: makes the film's audio stems sum to the delivery loudness with render-safe headroom.
//
//   node tools/score-kit/level.mjs --stem music=assets/audio/music_raw.wav:limit \
//        --stem sfx=assets/audio/sfx_raw.wav [--stem melody=…:0.5] [--lufs -14] [--tp -1.8] [--balance music=-13.7]
//
// Each --stem is name=path[:weight][:limit]. weight = the composition's data-volume for that track (default 1).
// Mark the stem(s) that carry the peaks with ":limit" (kick, bass, impacts, or SFX transients); they are peak-limited
// together until the sum fits. If the peaks sit in an unmarked stem the script stops and names that stem.
// Writes <path without _raw>.wav next to each input (24-bit, 48 kHz) and assets/audio/mix_preview.wav.
//
// Why: the HyperFrames render scales the WHOLE mix down when its summed peak passes about −1.5 dB
// (measured on HyperFrames v0.8.141), so stems must already sum to −14 LUFS at ≤ −1.8 dBTP.
// --balance name=LUFS first sets that stem alone to a level (e.g. music at −13.7 before SFX are added).
// --premix out.wav: instead of limiting stems, sum them and limit the SUM once (one track for the composition).
// Use it for dynamic material (generated or licensed music) or when stems' peaks coincide; keep separate stems when a
// VO carve must duck the music on its own.
// With a voiceover, include the VO as a stem with its real data-volume; music carve/ducking applied at render
// time is not simulated here, so always confirm on the rendered MP4 (expect ~−0.15 dB from the AAC encode).
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LUFS = Number(opt("--lufs", -14)), TP_MAX = Number(opt("--tp", -1.8));
const stems = [];
args.forEach((a, i) => {
  if (a !== "--stem") return;
  const [name, rest] = args[i + 1].split("=");
  const [path, ...flags] = rest.split(":");
  const weight = Number(flags.find((f) => !isNaN(Number(f))) ?? 1);
  stems.push({ name, path, weight, limit: flags.includes("limit"), out: path.replace(/_raw(\.wav)$/, "$1") });
});
if (!stems.length) { console.error("usage: level.mjs --stem name=path[:weight][:limit] …"); process.exit(1); }
for (const s of stems) if (s.out === s.path) s.out = s.path.replace(/\.wav$/, "_lvl.wav");
const balance = opt("--balance", null);

const run = (a) => { const r = spawnSync("ffmpeg", ["-hide_banner", ...a], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr); return r.stderr; };
const stats = (s) => JSON.parse(s.slice(s.lastIndexOf("{"), s.lastIndexOf("}") + 1));
const loud = (inputs, graph) => stats(run([...inputs.flatMap((p) => ["-i", p]), "-filter_complex", `${graph},loudnorm=I=${LUFS}:TP=-1:print_format=json`, "-f", "null", "-"]));
const sumGraph = (list) => `${list.map((s, k) => `[${k}:a]`).join("")}amix=inputs=${list.length}:weights=${list.map((s) => s.weight).join(" ")}:normalize=0`;
const w24 = ["-c:a", "pcm_s24le", "-ar", "48000"];

// starting gains: optional per-stem balance, then one common gain to the target
const g0 = Object.fromEntries(stems.map((s) => [s.name, 0]));
if (balance) {
  const [bn, bl] = balance.split("="), s = stems.find((x) => x.name === bn);
  const m = loud([s.path], `[0:a]volume=${s.weight}`);
  for (const x of stems) if (x !== s) g0[x.name] = 0; // others stay relative to their raw level
  g0[bn] = Number(bl) - Number(m.input_i);
}
const pre = stems.map((s) => `volume=${g0[s.name]}dB`);
const m0 = loud(stems.map((s) => s.path), `${stems.map((s, k) => `[${k}:a]${pre[k]}[s${k}]`).join(";")};${stems.map((s, k) => `[s${k}]`).join("")}amix=inputs=${stems.length}:weights=${stems.map((s) => s.weight).join(" ")}:normalize=0`);
const gMix = LUFS - Number(m0.input_i);

const PREMIX = opt("--premix", null);
if (PREMIX) {
  const g = stems.map((s) => g0[s.name] + gMix);
  const pre = `${stems.map((s, k) => `[${k}:a]volume=${g[k]}dB[s${k}]`).join(";")};${stems.map((s, k) => `[s${k}]`).join("")}amix=inputs=${stems.length}:weights=${stems.map((s) => s.weight).join(" ")}:normalize=0`;
  let c = TP_MAX - 0.7, lift = 0, f;
  for (let pass = 0; pass < 12; pass++) {
    run(["-y", ...stems.flatMap((s) => ["-i", s.path]), "-filter_complex", `${pre},volume=${lift}dB,alimiter=limit=${Math.pow(10, c / 20).toFixed(4)}:attack=1:release=80:level=false`, ...w24, PREMIX]);
    f = stats(run(["-i", PREMIX, "-af", `loudnorm=I=${LUFS}:TP=-1:print_format=json`, "-f", "null", "-"]));
    const di = LUFS - Number(f.input_i), tp = Number(f.input_tp);
    console.log(`  pass ${pass}: sum ceiling ${c.toFixed(1)} dBFS · lift ${lift.toFixed(2)} dB → ${f.input_i} LUFS, TP ${f.input_tp} dBTP`);
    if (Math.abs(di) <= 0.05 && tp <= TP_MAX) break;
    if (tp > TP_MAX) c -= 0.3; // inter-sample overs above the sample-peak ceiling
    lift += di;
  }
  console.log(`premix: ${PREMIX} · ${f.input_i} LUFS · TP ${f.input_tp} dBTP · LRA ${f.input_lra} (stems unchanged)`);
  process.exit(0);
}

// start the limiter just under the loudest limited stem's peak at mix gain, so the first pass already bites
const maxVol = (s) => Number(/max_volume: (-?[\d.]+) dB/.exec(run(["-i", s.path, "-af", `volume=${g0[s.name] + gMix}dB,volumedetect`, "-f", "null", "-"]))[1]);
const limited = stems.filter((s) => s.limit);
let f, c = limited.length ? Math.max(...limited.map(maxVol)) - 0.5 : 0, lift = 0;
for (let pass = 0; pass < 16; pass++) {
  for (const s of stems) {
    const g = g0[s.name] + gMix;
    const lim = s.limit ? `,alimiter=limit=${Math.pow(10, c / 20).toFixed(4)}:attack=1:release=60:level=false` : "";
    run(["-y", "-i", s.path, "-af", `volume=${g}dB${lim},volume=${lift}dB`, ...w24, s.out]);
  }
  run(["-y", ...stems.flatMap((s) => ["-i", s.out]), "-filter_complex", sumGraph(stems), ...w24, "assets/audio/mix_preview.wav"]);
  f = stats(run(["-i", "assets/audio/mix_preview.wav", "-af", `loudnorm=I=${LUFS}:TP=-1:print_format=json`, "-f", "null", "-"]));
  const di = LUFS - Number(f.input_i), tp = Number(f.input_tp);
  console.log(`  pass ${pass}: ceiling ${c.toFixed(1)} dBFS · lift ${lift.toFixed(2)} dB → ${f.input_i} LUFS, TP ${f.input_tp} dBTP`);
  if (Math.abs(di) <= 0.05 && tp <= TP_MAX) break;
  if (tp + di > TP_MAX) {
    if (!limited.length || c <= -12) {
      const tps = stems.map((s) => `${s.name} ${stats(run(["-i", s.out, "-af", `volume=${s.weight},loudnorm=I=${LUFS}:TP=-1:print_format=json`, "-f", "null", "-"])).input_tp} dBTP${s.limit ? " (limited)" : ""}`);
      console.warn(`  can't fit the summed peak without limiting below −12 dBFS. Stem peaks: ${tps.join(" · ")}. Mark the stem(s) carrying the peaks with :limit`);
      process.exitCode = 1; break;
    }
    c -= 1.0;
  }
  lift += di;
}
console.log(`sum: ${f.input_i} LUFS · TP ${f.input_tp} dBTP · LRA ${f.input_lra}`);
for (const s of stems) console.log(`  ${s.name}: ${s.out} (data-volume ${s.weight})`);
