// <Film> — the music bed: its settings (tools/score.json) played with the kit's instruments and this film's own. Only
// for a film that needs a sound the kit can't make; otherwise `node tools/score-kit/play.mjs` plays the settings alone.
//   node tools/score.mjs   (from the project root)  →  assets/audio/music_raw.wav
//   node tools/score-kit/level.mjs --stem music=assets/audio/music_raw.wav:limit --stem sfx=assets/audio/sfx_raw.wav
// The sound effects come from SFX Kit (`sfx.mjs build`), never from here.
import { readFileSync } from "node:fs";
import { TAU, mtof, att } from "./score-kit/engine.mjs";
import { playScore } from "./score-kit/play.mjs";

// ═══════════════ this film's own instruments, named in tools/score.json as the kit's are ═══════════════
// role: keys, pad, bass, melody or beat (what it plays by default); part: its usual part; gain: one note's level;
// rev and dly: its reverb and echo sends. note() places one note: o has gain, pan, rev, dly, bright (-1..1) and
// decay (a multiplier), from the section's feel.
const instruments = {
  "glass-keys": {
    role: "keys", part: "arp", gain: 0.05, rev: 0.6, dly: 0.15,
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), decay = 1.4 * o.decay;
      S.voice(bus, t0, Math.max(len, decay * 3), (tt) => att(tt, 0.02) * Math.exp(-tt / decay) * (Math.sin(TAU * f * tt) + 0.2 * Math.sin(TAU * 3 * f * tt)), o);
    },
  },
};

playScore(JSON.parse(readFileSync("tools/score.json", "utf8")), { instruments });
