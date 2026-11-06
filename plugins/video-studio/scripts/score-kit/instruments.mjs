// score-kit instruments: the kit's own set, made in code like the engine (no samples). A score's settings name them
// (play.mjs); a film that needs a sound they can't make adds its own (score.template.mjs).
// Each has a role (what it plays by default: keys, pad, bass, melody or beat), its usual part, its level and its sends,
// and note(S, bus, t0, len, midi, o) places one note; o: { gain, pan, rev, dly, bright (-1..1), decay (×) }.
import { TAU, mtof, clamp, att, sawBL } from "./engine.mjs";

const tail = (tt, len, r) => (tt > len - r ? clamp((len - tt) / r) : 1);

export const INSTRUMENTS = {
  // ── keys: chord tones in rhythm ──
  "soft-keys": {
    role: "keys", part: "arp", gain: 0.08, rev: 0.35, dly: 0.12,
    about: "soft plucked keys: a round tone, a gentle decay",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), decay = 0.55 * o.decay, h2 = 0.25 + 0.15 * o.bright, h3 = 0.06 + 0.06 * o.bright;
      S.voice(bus, t0, Math.max(len, decay * 4), (tt) => att(tt, 0.006) * Math.exp(-tt / decay) * (Math.sin(TAU * f * tt) + h2 * Math.sin(TAU * 2 * f * tt) + h3 * Math.sin(TAU * 3 * f * tt)), o);
    },
  },
  pluck: {
    role: "keys", part: "arp", gain: 0.06, rev: 0.25, dly: 0.1,
    about: "a short, bright pluck for off-beats and bounce",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), decay = 0.22 * o.decay, h2 = 0.35 + 0.15 * o.bright, h3 = 0.12 + 0.08 * o.bright;
      S.voice(bus, t0, decay * 5, (tt) => att(tt, 0.004) * Math.exp(-tt / decay) * (Math.sin(TAU * f * tt) + h2 * Math.sin(TAU * 2 * f * tt) + h3 * Math.sin(TAU * 3 * f * tt)), o);
    },
  },
  "e-piano": {
    role: "keys", part: "arp", gain: 0.07, rev: 0.4, dly: 0.12,
    about: "an electric piano: a bell-like tine over a warm body",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), decay = 1.1 * o.decay, idx = 1.2 + 0.8 * o.bright;
      S.voice(bus, t0, Math.max(len, decay * 3), (tt) => {
        const mod = idx * Math.exp(-tt / 0.35) * Math.sin(TAU * f * tt);
        const tine = 0.08 * Math.exp(-tt / 0.08) * Math.sin(TAU * 7 * f * tt);
        return att(tt, 0.004) * Math.exp(-tt / decay) * (Math.sin(TAU * f * tt + mod) + tine) * tail(tt, Math.max(len, decay * 3), 0.05);
      }, o);
    },
  },
  marimba: {
    role: "keys", part: "arp", gain: 0.09, rev: 0.3, dly: 0.08,
    about: "a wooden mallet: a quick knock and a short ring",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), decay = 0.32 * o.decay, n = S.noise(), flt = S.svf();
      S.voice(bus, t0, decay * 5, (tt) => {
        const knock = flt.bp(n(), f * 3, 2) * Math.exp(-tt / 0.006) * 0.6;
        return att(tt, 0.002) * (Math.sin(TAU * f * tt) * Math.exp(-tt / decay) + 0.3 * Math.sin(TAU * 3.93 * f * tt) * Math.exp(-tt / (decay * 0.2)) + knock);
      }, o);
    },
  },
  // ── melody ──
  bell: {
    role: "melody", part: "tune", gain: 0.05, rev: 0.5, dly: 0.2,
    about: "a small bell for a tune or a roll: a clear note with a glassy overtone",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), decay = 0.7 * o.decay;
      S.voice(bus, t0, Math.max(2.4, decay * 3.4), (tt) => att(tt, 0.003) * Math.exp(-tt / decay) * (Math.sin(TAU * f * tt) + (0.4 + 0.2 * o.bright) * Math.sin(TAU * 2.76 * f * tt) * Math.exp(-tt / 0.2)), o);
    },
  },
  // ── pads: the chords, held ──
  "felt-pad": {
    role: "pad", part: "chords", gain: 0.026, rev: 0.55, dly: 0,
    about: "a felt pad: two soft saws, slow in and out",
    note(S, bus, t0, len, midi, o) {
      const fr = mtof(midi), flt = S.svf(), ph = [S.rnd(), S.rnd()], cut = 950 * 2 ** (1.2 * o.bright);
      S.voice(bus, t0, len, (tt) => {
        let x = 0;
        for (let j = 0; j < 2; j++) { const f = fr * (j ? 1.004 : 0.996); ph[j] = (ph[j] + f / S.SR) % 1; x += sawBL(ph[j], f / S.SR); }
        return flt.lp(x, cut, 0.5) * att(tt, 0.9) * tail(tt, len, 0.8);
      }, o);
    },
  },
  strings: {
    role: "pad", part: "chords", gain: 0.02, rev: 0.6, dly: 0,
    about: "soft strings: three bowed saws with a slow vibrato, a little brighter than the felt pad",
    note(S, bus, t0, len, midi, o) {
      const fr = mtof(midi), flt = S.svf(), ph = [S.rnd(), S.rnd(), S.rnd()], cut = 2200 * 2 ** (1.2 * o.bright);
      S.voice(bus, t0, len, (tt) => {
        let x = 0;
        const vib = 1 + 0.0025 * Math.sin(TAU * 5.2 * tt) * clamp(tt / 1.2);
        for (let j = 0; j < 3; j++) { const f = fr * [0.995, 1, 1.006][j] * vib; ph[j] = (ph[j] + f / S.SR) % 1; x += sawBL(ph[j], f / S.SR); }
        return flt.lp(x, cut, 0.6) * att(tt, 0.7) * tail(tt, len, 0.6);
      }, o);
    },
  },
  // ── bass ──
  "round-bass": {
    role: "bass", part: "auto", gain: 0.12, rev: 0, dly: 0,
    about: "a round bass: a warm sine with a little body",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi);
      S.voice(bus, t0, len, (tt) => (Math.sin(TAU * f * tt) + (0.18 + 0.12 * o.bright) * Math.sin(TAU * 2 * f * tt)) * att(tt, 0.02) * tail(tt, len, 0.12) * Math.exp(-tt * 0.6 / o.decay), o);
    },
  },
  "synth-bass": {
    role: "bass", part: "auto", gain: 0.12, rev: 0, dly: 0,
    about: "a bouncy synth bass: a filtered saw that snaps open on each note",
    note(S, bus, t0, len, midi, o) {
      const f = mtof(midi), flt = S.svf();
      let ph = 0;
      S.voice(bus, t0, len, (tt) => {
        ph = (ph + f / S.SR) % 1;
        return flt.lp(sawBL(ph, f / S.SR), (700 + 900 * Math.exp(-tt * 12)) * 2 ** o.bright, 0.8) * att(tt, 0.005) * tail(tt, len, 0.05) * Math.exp(-tt * 2.2 / o.decay);
      }, o);
    },
  },
  // ── beat: a pulse under the music (the moments' hits are SFX Kit's) ──
  kick: {
    role: "beat", part: "kick", gain: 0.3, rev: 0, dly: 0,
    about: "a soft kick: a low thump, no click",
    note(S, bus, t0, len, midi, o) {
      let ph = 0;
      S.voice(bus, t0, 0.35, (tt) => { const f = 45 + 70 * Math.exp(-tt / 0.03); ph = (ph + f / S.SR) % 1; return Math.sin(TAU * ph) * att(tt, 0.002) * Math.exp(-tt / (0.16 * o.decay)); }, o);
    },
  },
  clap: {
    role: "beat", part: "clap", gain: 0.07, rev: 0.3, dly: 0,
    about: "a soft clap on the backbeat",
    note(S, bus, t0, len, midi, o) {
      const n = S.noise(), flt = S.svf();
      S.voice(bus, t0, 0.3, (tt) => { const burst = [0, 0.011, 0.022].reduce((a, d) => a + (tt >= d ? Math.exp(-(tt - d) / 0.006) : 0), 0) * 0.5 + Math.exp(-tt / (0.09 * o.decay)); return flt.bp(n(), 1300 * 2 ** (0.5 * o.bright), 1.2) * burst; }, o);
    },
  },
  hat: {
    role: "beat", part: "hat", gain: 0.025, rev: 0.1, dly: 0,
    about: "a closed hat, light and short",
    note(S, bus, t0, len, midi, o) {
      const n = S.noise(), flt = S.svf();
      S.voice(bus, t0, 0.08, (tt) => flt.hp(n(), 7500, 0.7) * att(tt, 0.001) * Math.exp(-tt / (0.025 * o.decay)), o);
    },
  },
  shaker: {
    role: "beat", part: "shaker", gain: 0.016, rev: 0, dly: 0,
    about: "a soft shaker on the sixteenths",
    note(S, bus, t0, len, midi, o) {
      const n = S.noise(), flt = S.svf();
      S.voice(bus, t0, 0.09, (tt) => flt.hp(n(), 6000, 0.7) * att(tt, 0.004) * Math.exp(-tt / (0.03 * o.decay)), o);
    },
  },
};
