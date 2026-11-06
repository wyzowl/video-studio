// score-kit player: a film's score written as settings, played with the kit's own instruments (instruments.mjs).
//   node tools/score-kit/play.mjs [tools/score.json] [--out assets/audio/music_raw.wav]   (from the project root)
// It prints one line: the file, its length, the tempo's grid, the sections and the notes, its peak, and anything to
// look at. The settings (guides/audio/music.md has an example):
//   length, tempo, key, meter (4), downbeat (the first bar's time, 0), seed
//   chords      a bar each, repeating: "C Am F G" ("C:2" for two bars, "G/B" over B; m, 7, maj7, m7, sus2, sus4,
//               add9, dim, aug, 6, m6, 9)
//   instruments { name: { sound, gain (dB), pan, octave, part, reverb, echo, tune, every, steps } }: the kit's sounds
//               by name, each with its role's part unless one is given
//   sections    [{ at, name, feel, chords, play: { name: false | true | part | { part, level, rate, octave } } }]
//               feels: still, sparse, calm, open, steady, bright, light, lift, big, resolve, out
//   hits        [{ at, play: roll | stab | pickup | stop, chord, on, octave }]
//   mix         { reverb, echo, delay ("3/16" of a bar, or seconds), feedback, highpass, fadeIn, fadeOut, level }
// A film that needs a sound the kit can't make writes it as an instrument and plays the settings with it
// (score.template.mjs): playScore(settings, { instruments: { "my-sound": { role, part, gain, note() } } }).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createScore, dbToGain } from "./engine.mjs";
import { INSTRUMENTS } from "./instruments.mjs";

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY = { "": [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], dim: [0, 3, 6], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 9: [0, 4, 7, 10, 14] };
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
// what each feel plays, how loud (dB) and bright, and the keys' notes per beat
const FEELS = {
  out: { roles: [] },
  still: { level: -4, bright: -0.4, roles: ["pad"] },
  sparse: { level: -2.5, bright: -0.25, rate: 1, roles: ["pad", "keys"] },
  calm: { level: -2, bright: -0.15, rate: 1, roles: ["pad", "keys", "bass"], bass: "whole" },
  open: { level: -1, rate: 1, roles: ["pad", "keys", "bass", "melody"] },
  steady: { level: 0, rate: 2, roles: ["pad", "keys", "bass", "melody", "beat"], beat: "steady" },
  bright: { level: 0.5, bright: 0.35, rate: 2, sparkle: true, roles: ["pad", "keys", "bass", "melody", "beat"], beat: "steady" },
  light: { level: -1.5, bright: 0.1, rate: 1, long: 1.3, roles: ["pad", "keys", "bass", "melody", "beat"], bass: "whole", beat: "light" },
  lift: { level: 1, bright: 0.3, rate: 2, climb: true, up: 12, roles: ["pad", "keys", "bass", "melody", "beat"], beat: "full" },
  big: { level: 1.5, bright: 0.45, rate: 2, sparkle: true, roles: ["pad", "keys", "bass", "melody", "beat"], beat: "full", bass: "bounce" },
  resolve: { level: -1, rate: 1, long: 1.6, bars: 2, roles: ["pad", "keys", "bass"], bass: "held" },
};
const PARTS = {
  keys: ["arp", "offbeats", "stabs", "downbeats"],
  pad: ["chords"],
  bass: ["root-fifth", "whole", "bounce", "held", "roots"],
  melody: ["tune"],
  beat: ["kick", "clap", "hat", "shaker"],
};
const ALL_PARTS = [...new Set(Object.values(PARTS).flat())];
// the drums each beat feel plays: part → level (0 for none) and its pattern
const BEATS = {
  light: { kick: null, clap: null, hat: "offbeats", shaker: 0.5 },
  steady: { kick: "half", clap: null, hat: "eighths", shaker: 1 },
  full: { kick: "four", clap: "backbeat", hat: "eighths", shaker: 1 },
};
// where each role's chords sit (midi)
const CENTRE = { pad: 62, keys: 64, melody: 72 };

/** A chord name: { name, root, tones (pitch classes from its root, may pass 12), bass }. */
function parseChord(name) {
  const m = /^([A-G])([#b]?)(maj7|m7|m6|m|7|sus2|sus4|add9|dim|aug|6|9)?(?:\/([A-G])([#b]?))?$/.exec(String(name).trim());
  if (!m) throw new Error(`"${name}" isn't a chord the score kit knows: a root (C, F#, Bb) and maybe m, 7, maj7, m7, sus2, sus4, add9, dim, aug, 6, m6 or 9, and /bass (G/B).`);
  const acc = (a) => (a === "#" ? 1 : a === "b" ? -1 : 0);
  const root = (PC[m[1]] + acc(m[2]) + 12) % 12;
  return { name, root, tones: QUALITY[m[3] || ""], bass: m[4] ? (PC[m[4]] + acc(m[5]) + 12) % 12 : root };
}

/** "C Am F:2 G" → [{ chord, bars }]. */
function parseProgression(text) {
  return String(text)
    .replace(/\|/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const [name, bars] = t.split(":");
      return { chord: parseChord(name), bars: Math.max(1, Number(bars) || 1) };
    });
}

/** A note name (C5, F#4, Bb3) as midi (C4 = 60). */
function parseNote(t) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(t);
  if (!m) throw new Error(`"${t}" isn't a note: a letter, maybe # or b, and its octave (C5, F#4, Bb3).`);
  return (Number(m[3]) + 1) * 12 + PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

/** A chord's tones near a centre, moving as little as it can from the last voicing (smooth voice leading). */
function voice(chord, centre, last) {
  const pcs = chord.tones.map((i) => (chord.root + i) % 12);
  const n = Math.min(pcs.length, 4);
  let best = null;
  for (let inv = 0; inv < pcs.length; inv++) {
    const notes = [];
    for (let k = 0; k < n; k++) {
      const pc = pcs[(inv + k) % pcs.length];
      let m = notes.length ? notes.at(-1) + 1 : centre - 7;
      while ((m % 12 + 12) % 12 !== pc) m++;
      notes.push(m);
    }
    for (const shift of [-12, 0, 12]) {
      const v = notes.map((x) => x + shift);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      if (mean < centre - 7 || mean > centre + 7) continue;
      const cost = last ? v.reduce((a, x, i) => a + Math.abs(x - (last[i] ?? last.at(-1))), 0) : Math.abs(mean - centre);
      if (!best || cost < best.cost) best = { v, cost };
    }
  }
  return best ? best.v : pcs.map((pc) => centre - 6 + ((pc - centre + 6 + 120) % 12));
}

/** The bass note of a chord: its bass (or root) between E1 and D#2. */
const bassNote = (chord) => 28 + ((chord.bass - 4 + 12) % 12);

/** Play a score's settings: schedule every note, then render them through the engine. Returns { notes, warnings,
    peak, file }. `instruments` adds a film's own sounds to the kit's. */
export function playScore(settings, { instruments = {}, out = "assets/audio/music_raw.wav", quiet = false } = {}) {
  const sounds = { ...INSTRUMENTS, ...instruments };
  const length = Number(settings.length);
  const tempo = Number(settings.tempo);
  if (!(length > 0)) throw new Error("The score needs its length in seconds (\"length\": 30), the film's.");
  if (!(tempo >= 40 && tempo <= 220)) throw new Error("The score needs a tempo in beats a minute, from 40 to 220 (\"tempo\": 96).");
  const meter = Number(settings.meter) || 4;
  const BEAT = 60 / tempo;
  const BAR = meter * BEAT;
  const D = Number(settings.downbeat) || 0;
  const warnings = [];
  const rnd = (() => {
    let a = (Number(settings.seed) || 1) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  // the key, and chords outside it (worth knowing, never wrong)
  const km = /^([A-G][#b]?)\s*(major|minor)$/i.exec(String(settings.key || "C major").trim());
  if (!km) throw new Error(`"${settings.key}" isn't a key the score kit reads: "C major" or "A minor", say.`);
  const tonic = parseChord(km[1]).root;
  const scale = new Set(SCALES[km[2].toLowerCase()].map((i) => (tonic + i) % 12));
  if (!["C major", "A minor"].includes(`${km[1]} ${km[2].toLowerCase()}`)) warnings.push(`in ${km[1]} ${km[2].toLowerCase()}, SFX Kit's tuned sounds (C major pentatonic) can clash where they play with it (audio/music.md)`);

  // the sections, in time order, each to the next
  const given = Array.isArray(settings.sections) && settings.sections.length ? settings.sections : [{ at: 0, feel: "steady" }];
  const sections = [...given].sort((a, b) => Number(a.at) - Number(b.at)).map((s, i, all) => {
    const feel = s.feel || "steady";
    if (!FEELS[feel]) throw new Error(`A section's feel is one of ${Object.keys(FEELS).join(", ")}: "${feel}" isn't.`);
    if (!(Number(s.at) >= 0)) throw new Error("Each section starts at a time in seconds (\"at\": 4.3).");
    if (Number(s.at) >= length) warnings.push(`the section at ${s.at} s starts after the film ends`);
    return { ...s, at: Number(s.at), end: i + 1 < all.length ? Number(all[i + 1].at) : length, feel, f: FEELS[feel] };
  });
  const sectionAt = (t) => sections.findLast((s) => s.at <= t + 1e-6) || sections[0];

  // the chords over time: the score's progression on its bars from the downbeat (its first chord before it), and a
  // section's own chords in place of it for that section, from its start
  const main = parseProgression(settings.chords || "C");
  const segments = D > 0 ? [{ start: 0, end: D, chord: main[0].chord }] : [];
  const lay = (prog, from, to) => {
    for (let t = from, i = 0; t < to - 1e-6; i++) {
      const { chord, bars } = prog[i % prog.length];
      segments.push({ start: t, end: Math.min(to, t + bars * BAR), chord });
      t += bars * BAR;
    }
  };
  lay(main, D, length);
  for (const s of sections.filter((x) => x.chords)) {
    const kept = segments.flatMap((g) => (g.end <= s.at + 1e-6 || g.start >= s.end - 1e-6 ? [g] : [...(g.start < s.at ? [{ ...g, end: s.at }] : []), ...(g.end > s.end ? [{ ...g, start: s.end }] : [])]));
    segments.length = 0;
    segments.push(...kept);
    lay(parseProgression(s.chords), s.at, s.end);
  }
  segments.sort((a, b) => a.start - b.start);
  const chordAt = (t) => (segments.findLast((g) => g.start <= t + 1e-6) || segments[0]).chord;
  for (const g of segments) {
    const out = g.chord.tones.map((i) => (g.chord.root + i) % 12).filter((pc) => !scale.has(pc));
    if (out.length && !warnings.some((w) => w.includes(`${g.chord.name} `))) warnings.push(`${g.chord.name} has notes outside ${km[1]} ${km[2].toLowerCase()}`);
  }

  // the instruments
  const list = Object.entries(settings.instruments || {}).map(([name, x]) => {
    const def = sounds[x?.sound || name];
    if (!def) throw new Error(`"${x?.sound || name}" isn't one of the kit's sounds (${Object.keys(INSTRUMENTS).join(", ")}), and the score doesn't add it.`);
    const part = x.part || def.part;
    if (part !== "auto" && !ALL_PARTS.includes(part)) throw new Error(`"${part}" isn't a part: ${ALL_PARTS.join(", ")}.`);
    const tune = x.tune ? String(x.tune).split(/\s+/).filter(Boolean) : null;
    if (tune) for (const tk of tune) if (tk !== "." && tk !== "-") parseNote(tk);
    if (def.role === "melody" && part === "tune" && !tune) warnings.push(`${name} has no tune, so it plays only its hits`);
    return { name, def, role: def.role, part, gain: def.gain * dbToGain(Number(x.gain) || 0), pan: Number(x.pan) || 0, octave: Number(x.octave) || 0, rev: x.reverb ?? def.rev, dly: x.echo ?? def.dly, tune, every: Number(x.every) || 0, steps: Number(x.steps) || 2, last: null };
  });
  if (!list.length) throw new Error("The score has no instruments: name some of the kit's sounds (\"instruments\": { \"keys\": { \"sound\": \"soft-keys\" } }).");

  // what an instrument plays in a section: its part, or null
  const partIn = (inst, s) => {
    const o = s.play?.[inst.name];
    if (o === false) return null;
    const asked = typeof o === "string" ? o : o?.part;
    if (asked) return asked;
    if (o !== true && !s.f.roles.includes(inst.role)) return null;
    if (inst.role === "beat") {
      const b = BEATS[s.f.beat];
      if (!b && o !== true) return null;
      const pick = b?.[inst.part];
      return pick === null || pick === 0 ? null : inst.part;
    }
    if (inst.role === "melody" && !inst.tune) return null;
    if (inst.part === "auto") return s.f.bass || "root-fifth";
    return inst.part;
  };
  const optsIn = (inst, s) => (typeof s.play?.[inst.name] === "object" && s.play[inst.name] ? s.play[inst.name] : {});

  // schedule: [{ t, len, midi, inst, gain, pan, bright, decay }]
  const notes = [];
  const add = (inst, s, t, len, midi, { gain = 1, pan = null, decay = 1 } = {}) => {
    if (t < 0 || t >= length) return;
    const o = optsIn(inst, s);
    const human = 1 + (rnd() - 0.5) * 0.18;
    notes.push({ t, len, midi: midi + 12 * (Number(o.octave) || 0), inst, gain: inst.gain * gain * human * dbToGain((s.f.level || 0) + (Number(o.level) || 0)), pan: pan ?? inst.pan, bright: s.f.bright || 0, decay: decay * (s.f.long || 1) });
  };
  const grid = (a, b, step) => {
    const out = [];
    for (let k = Math.max(0, Math.ceil((a - D - 1e-6) / step)); D + k * step < b - 1e-6; k++) out.push({ t: D + k * step, k });
    return out;
  };
  for (const inst of list) {
    // the pad: a chord held for each stretch of the same chord where it plays, carried across sections
    for (const s of sections) {
      const part = partIn(inst, s);
      if (!part) continue;
      const a = s.at;
      const b = s.f.bars && inst.role === "keys" ? Math.min(s.end, a + s.f.bars * BAR) : s.end;
      const centre = (CENTRE[inst.role] ?? 64) + 12 * inst.octave + (inst.role === "keys" ? 8 : 0);
      const tones = (t) => {
        const v = voice(chordAt(t), centre, inst.last);
        inst.last = v;
        return v;
      };
      if (part === "chords") {
        for (const g of segments.filter((x) => x.end > a + 1e-6 && x.start < b - 1e-6)) {
          const from = Math.max(g.start, a);
          const to = Math.min(g.end, b);
          const v = voice(g.chord, centre, inst.last);
          inst.last = v;
          v.forEach((m, i) => add(inst, s, from, to - from + 0.15, m, { pan: inst.pan + [-0.35, 0, 0.35, 0.15][i % 4] }));
        }
      } else if (part === "held") {
        // the bass: each chord's root, held for as long as the chord
        for (const g of segments.filter((x) => x.end > a + 1e-6 && x.start < b - 1e-6)) add(inst, s, Math.max(g.start, a), Math.min(g.end, b) - Math.max(g.start, a), bassNote(g.chord), { decay: 4 });
      } else if (part === "arp") {
        const rate = Number(optsIn(inst, s).rate) || s.f.rate || 2;
        const step = BEAT / rate;
        const perBar = Math.round(meter * rate);
        const pattern = rate >= 2 ? [0, 2, 1, 2] : [0, 1, 2, 1];
        const lastBar = b - BAR;
        for (const { t, k } of grid(a, b, step)) {
          const v = tones(t);
          let m = v[pattern[k % pattern.length] % v.length];
          if (s.f.sparkle && k % perBar === perBar - 2) m += 12;
          if (s.f.climb && t >= lastBar - 1e-6) m += 12;
          const on = k % rate === 0;
          add(inst, s, t, step, m, { gain: on ? 1 : 0.72, pan: rate >= 2 ? inst.pan + (on ? -0.2 : 0.2) : inst.pan + ((k % 4) * 0.2 - 0.3) });
        }
      } else if (part === "offbeats" || part === "stabs" || part === "downbeats") {
        for (const { t, k } of grid(a, b, part === "offbeats" ? BEAT / 2 : BEAT)) {
          if (part === "offbeats" && k % 2 === 0) continue;
          if (part === "downbeats" && k % meter !== 0) continue;
          tones(t).forEach((m, i) => add(inst, s, t, BEAT / 2, m, { gain: 0.55, pan: inst.pan + [-0.4, 0, 0.4, 0.2][i % 4], decay: part === "offbeats" ? 1 : 1.3 }));
        }
      } else if (inst.role === "bass") {
        const steps = grid(a, b, part === "bounce" ? BEAT / 2 : BEAT);
        for (const { t, k } of steps) {
          const root = bassNote(chordAt(t));
          const inBar = part === "bounce" ? Math.floor(k / 2) % meter : k % meter;
          const first = t === steps[0].t;
          if (part === "bounce") add(inst, s, t, BEAT / 2 - 0.02, root + (k % 2 ? 12 : 0), { gain: k % 2 ? 0.72 : 1 });
          else if (part === "whole") {
            if (inBar === 0 || first) add(inst, s, t, Math.min(b, t + (meter - inBar) * BEAT) - t - 0.05, root);
          } else if (part === "roots") {
            if (inBar % 2 === 0 || first) add(inst, s, t, Math.min(b, t + (2 - (inBar % 2)) * BEAT) - t - 0.05, root);
          } else if (inBar % 2 === 0 || first) {
            // root-fifth: the root for two beats, then the fifth (an octave down if it would climb too high)
            const fifth = root + 7 > 43 ? root - 5 : root + 7;
            add(inst, s, t, Math.min(b, t + ((inBar < 2 ? 2 : meter) - inBar) * BEAT) - t - 0.05, inBar < 2 ? root : fifth);
          }
        }
      } else if (part === "tune" && inst.tune) {
        const stepDur = BEAT / inst.steps;
        const tuneBars = Math.max(1, Math.ceil(inst.tune.length / (inst.steps * meter)));
        const every = inst.every || tuneBars;
        const up = s.f.up || 0;
        for (let bar = Math.ceil((a - D - 1e-6) / BAR); D + bar * BAR < b - 1e-6; bar += every) {
          const start = D + bar * BAR;
          inst.tune.forEach((tk, i) => {
            if (tk === "." || tk === "-") return;
            let n = 1;
            while (inst.tune[i + n] === "-") n++;
            const t = start + i * stepDur;
            if (t < b - 1e-6) add(inst, s, t, n * stepDur, parseNote(tk) + up);
          });
        }
      } else if (inst.role === "beat") {
        const b2 = BEATS[s.f.beat] || BEATS.steady;
        if (part === "kick") for (const { t, k } of grid(a, b, BEAT)) { if ((b2.kick || "half") === "four" || k % 2 === 0) add(inst, s, t, 0.3, 36); }
        if (part === "clap") for (const { t, k } of grid(a, b, BEAT)) { if (k % 2 === 1) add(inst, s, t, 0.25, 60); }
        if (part === "hat") for (const { t, k } of grid(a, b, BEAT / 2)) { if ((b2.hat || "eighths") === "offbeats" && k % 2 === 0) continue; add(inst, s, t, 0.06, 90, { gain: k % 2 ? 0.6 : 1 }); }
        if (part === "shaker") for (const { t, k } of grid(a, b, BEAT / 4)) add(inst, s, t, 0.09, 90, { gain: (b2.shaker || 1) * (k % 2 ? 0.62 : 1) });
      }
    }
  }

  // the hits: moments the music marks itself (the effects' hits are SFX Kit's)
  const keysLike = list.filter((i) => i.role === "keys" || i.role === "melody");
  for (const h of Array.isArray(settings.hits) ? settings.hits : []) {
    const at = Number(h.at);
    if (!(at >= 0 && at < length)) {
      warnings.push(`the hit at ${h.at} s isn't in the film`);
      continue;
    }
    const s = { ...sectionAt(at), f: { ...sectionAt(at).f, level: 0, long: 1 }, play: {} };
    const on = h.on ? list.filter((i) => i.name === h.on) : keysLike.slice(0, 1);
    if (h.on && !on.length) throw new Error(`The hit at ${h.at} s plays on "${h.on}", which isn't one of the score's instruments.`);
    const chord = h.chord ? parseChord(h.chord) : chordAt(at);
    const up = 12 * (Number(h.octave) || 0);
    if (h.play === "stop") {
      // everything rests for the beat before it
      for (let i = notes.length - 1; i >= 0; i--) if (notes[i].t >= at - BEAT - 1e-6 && notes[i].t < at - 1e-6) notes.splice(i, 1);
      continue;
    }
    for (const inst of h.play === "stab" && !h.on ? keysLike : on) {
      const v = voice(chord, (CENTRE[inst.role] ?? 64) + 12 * inst.octave + (inst.role === "keys" ? 8 : 0), null).map((m) => m + up);
      if (h.play === "roll") [...v, v[0] + 12].forEach((m, i) => add(inst, s, at + i * 0.06, 2, m, { gain: 0.85, pan: inst.pan - 0.3 + i * 0.2, decay: 2.5 }));
      else if (h.play === "stab") v.forEach((m, i) => add(inst, s, at, BEAT, m, { gain: 0.6, pan: inst.pan + [-0.3, 0, 0.3, 0.15][i % 4], decay: 1.3 }));
      else if (h.play === "pickup") [[at - BEAT / 2, v[2] ?? v.at(-1)], [at - BEAT / 4, v[0] + 12]].forEach(([t, m], i) => add(inst, s, t, BEAT / 4, m - 12, { gain: 0.7 + 0.15 * i }));
      else throw new Error(`A hit plays roll, stab, pickup or stop: "${h.play}" isn't one.`);
    }
  }

  // render
  const mix = settings.mix || {};
  const S = createScore({ dur: length, seed: Number(settings.seed) || 1 });
  const MUSIC = S.bus();
  for (const n of notes) n.inst.def.note(S, MUSIC, n.t, n.len, n.midi, { gain: n.gain, pan: Math.max(-1, Math.min(1, n.pan)), rev: n.inst.rev, dly: n.inst.dly, bright: n.bright, decay: n.decay });
  // the echo's time: a fraction of a bar ("3/16"), or seconds
  const frac = /^(\d+)\/(\d+)$/.exec(String(mix.delay ?? "3/16"));
  const delay = typeof mix.delay === "number" ? mix.delay : frac ? (BAR * Number(frac[1])) / Number(frac[2]) : 0.75 * BEAT;
  const peak = S.finish(MUSIC, out, { rev: mix.reverb ?? 1.8, dly: mix.echo ?? 0.22, delay: { time: delay, fb: mix.feedback ?? 0.3, lpHz: 2800 }, hpHz: mix.highpass ?? 38, gainDb: Number(mix.level) || 0, fadeIn: mix.fadeIn ?? 0.03, fadeOut: mix.fadeOut ?? 1.6, quiet: true });
  if (!quiet) {
    const db = (20 * Math.log10(peak || 1e-9)).toFixed(1);
    console.log(`${out} · ${length} s · ${tempo} BPM in ${km[1]} ${km[2].toLowerCase()}, a bar every ${Math.round(BAR * 100) / 100} s from ${D} s · ${sections.length} section${sections.length === 1 ? "" : "s"}, ${notes.length} notes · peak ${db} dBFS`);
    for (const w of warnings) console.log(`- ${w}`);
  }
  return { notes: notes.length, warnings, peak, file: out };
}

// run as a command: the settings file (tools/score.json), from the project root
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out") || "tools/score.json";
  try {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      throw new Error(`There's no ${file}: write the score's settings there (tools/score-kit/score.template.json is a start).`);
    }
    playScore(JSON.parse(text), { out: outAt >= 0 ? args[outAt + 1] : "assets/audio/music_raw.wav" });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
