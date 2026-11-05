// <Film> — the music bed, made in code. The sound effects come from SFX Kit (`sfx.mjs build`), never from here.
//   node tools/score.mjs   (from the project root)  →  assets/audio/music_raw.wav
//   node tools/score-kit/level.mjs --stem music=assets/audio/music_raw.wav:limit --stem sfx=assets/audio/sfx_raw.wav
// Brief: <genre, key (C major or A minor, to sit with SFX Kit's tuned sounds), tempo/feel, instrumentation, what the
// music does at each chapter>. Cue times mirror index.html.
// Everything below the plumbing import is this film's own: harmony, instruments, cue list and master chain.
import { createScore, TAU, mtof, clamp, att, sawBL, panLR } from "./score-kit/engine.mjs";

const S = createScore({ dur: 30, seed: 1 });
const { SR } = S;
const BPM = 120, BEAT = 60 / BPM, b = (beats) => beats * BEAT;
const MUSIC = S.bus();

// ═══════════════ instruments (design these for this film) ═══════════════
function pad(t0, len, midi, { gain = 0.05, pan = 0 } = {}) {
  const fr = mtof(midi), flt = S.svf(), ph = [S.rnd(), S.rnd()];
  S.voice(MUSIC, t0, len, (tt) => {
    let x = 0;
    for (let j = 0; j < 2; j++) { const f = fr * (j ? 1.003 : 0.997); ph[j] = (ph[j] + f / SR) % 1; x += sawBL(ph[j], f / SR); }
    return flt.lp(x, 1200, 0.6) * att(tt, 1.2) * (tt > len - 1 ? (len - tt) : 1);
  }, { gain, pan, rev: 0.6 });
}

// ═══════════════ arrangement / cue list (mirrors index.html) ═══════════════
pad(0, 8, 50); pad(0, 8, 57, { pan: 0.4 });

// ═══════════════ master ═══════════════
S.finish(MUSIC, "assets/audio/music_raw.wav", { rev: 2.2, hpHz: 40, fadeOut: 1.6 });
