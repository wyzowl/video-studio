// <Film> — score + sound design, synthesized in code.
//   node tools/score.mjs   (from the project root)  →  assets/audio/music_raw.wav + sfx_raw.wav
//   node tools/score-kit/level.mjs --stem music=assets/audio/music_raw.wav:limit --stem sfx=assets/audio/sfx_raw.wav
// Brief: <genre, key, tempo/feel, instrumentation, what the music does at each chapter>. Cue times mirror index.html.
// Everything below the plumbing import is this film's own: harmony, instruments, cue list and master chain.
import { createScore, TAU, mtof, clamp, att, sawBL, panLR, dbToGain } from "./score-kit/engine.mjs";

const S = createScore({ dur: 30, seed: 1 });
const { SR } = S;
const BPM = 120, BEAT = 60 / BPM, b = (beats) => beats * BEAT;
const SFX_TRIM = dbToGain(-2.5); // SFX sit a touch under the music (house rule)
const MUSIC = S.bus(), SFX = S.bus();

// ═══════════════ instruments (design these for this film) ═══════════════
function pad(t0, len, midi, { gain = 0.05, pan = 0 } = {}) {
  const fr = mtof(midi), flt = S.svf(), ph = [S.rnd(), S.rnd()];
  S.voice(MUSIC, t0, len, (tt) => {
    let x = 0;
    for (let j = 0; j < 2; j++) { const f = fr * (j ? 1.003 : 0.997); ph[j] = (ph[j] + f / SR) % 1; x += sawBL(ph[j], f / SR); }
    return flt.lp(x, 1200, 0.6) * att(tt, 1.2) * (tt > len - 1 ? (len - tt) : 1);
  }, { gain, pan, rev: 0.6 });
}
function tick(t0, fr = 2400, v = 1, pan = 0) {
  S.voice(SFX, t0, 0.05, (tt) => Math.sin(TAU * fr * tt) * Math.exp(-tt * 180) * att(tt, 0.0008), { gain: 0.07 * v * SFX_TRIM, pan, rev: 0.1 });
}

// ═══════════════ arrangement / cue list (mirrors index.html) ═══════════════
pad(0, 8, 50); pad(0, 8, 57, { pan: 0.4 });
tick(b(4), 3000, 0.6);

// ═══════════════ master ═══════════════
S.finish(MUSIC, "assets/audio/music_raw.wav", { rev: 2.2, hpHz: 40, fadeOut: 1.6 });
S.finish(SFX, "assets/audio/sfx_raw.wav", { rev: 1.8, fadeOut: 1.6 });
