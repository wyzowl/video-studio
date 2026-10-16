// score-kit engine: the plumbing every synthesized score shares. No sounds live here.
// A film copies the plugin's scripts/score-kit/ into videos/<p>/tools/score-kit/ and imports from that copy, so
// later kit changes never alter a delivered film, and the copy may be edited freely for that film.
//
//   import { createScore, mtof, clamp, att } from "./score-kit/engine.mjs";
//   const S = createScore({ dur: 63, seed: 2024 });
//   const MUSIC = S.bus(), SFX = S.bus();
//   S.voice(MUSIC, t0, len, (tt, T) => Math.sin(...), { gain, pan, rev, dly, duck });
//   S.finish(MUSIC, "assets/audio/music.wav", { rev: 2.2, hpHz: 40, fadeOut: 1.6, limitDb: -2 });
//
// Deterministic: all randomness is seeded (S.rnd, S.noise()). 48 kHz, stereo, 32-bit float WAVs.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const TAU = Math.PI * 2;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const dbToGain = (db) => Math.pow(10, db / 20);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// attack curves: att = quarter-sine (soft), attLin = linear (snappier transients)
export const att = (tt, a) => (tt < a ? Math.sin((Math.PI / 2) * (tt / a)) : 1);
export const attLin = (tt, a) => (tt < a ? tt / a : 1);
// band-limited saw (polyBLEP); ph in 0..1, dt = f / SR
export function polyblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
export const sawBL = (ph, dt) => 2 * ph - 1 - polyblep(ph, dt);
// equal-power pan, -1 (left) .. 1 (right)
export const panLR = (x, pan) => [x * Math.cos(((pan + 1) * Math.PI) / 4), x * Math.sin(((pan + 1) * Math.PI) / 4)];

// Zavalishin TPT state-variable filter: stable under fast cutoff modulation.
export class SVF {
  constructor(sr = 48000) { this.sr = sr; this.ic1 = 0; this.ic2 = 0; }
  run(x, fc, q) {
    const g = Math.tan((Math.PI * clamp(fc, 20, this.sr * 0.45)) / this.sr), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - this.ic2, v1 = a1 * this.ic1 + a2 * v3, v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  }
  lp(x, fc, q = 0.707) { return this.run(x, fc, q).lp; }
  bp(x, fc, q = 1) { return this.run(x, fc, q).bp; }
  hp(x, fc, q = 0.707) { return this.run(x, fc, q).hp; }
}

export function createScore({ dur, sr = 48000, seed = 1 }) {
  const SR = sr, N = Math.round(SR * dur), DUR = dur;
  let noiseSeed = 1;
  const S = {
    SR, N, DUR,
    rnd: mulberry32(seed), // one stream for phases, pans, humanising
    noise() { const r = mulberry32(noiseSeed++ * 7919); return () => r() * 2 - 1; }, // fresh white noise per voice
    svf: () => new SVF(SR),
    duckEnv: new Float32Array(N), // sidechain amount 0..1; write into it from a kick, read via voice({ duck })

    // a bus = dry L/R + reverb send (VL/VR) + delay send (DL/DR)
    bus() {
      return { L: new Float32Array(N), R: new Float32Array(N), VL: new Float32Array(N), VR: new Float32Array(N), DL: new Float32Array(N), DR: new Float32Array(N) };
    },

    // Place a voice. gen(tt, T) gets local and film time, returns a mono sample (panned) or [l, r].
    voice(B, t0, len, gen, { gain = 1, pan = 0, rev = 0, dly = 0, duck = 0 } = {}) {
      const i0 = Math.round(t0 * SR), n = Math.round(len * SR);
      const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
      for (let k = 0; k < n; k++) {
        const i = i0 + k;
        if (i < 0) continue;
        if (i >= N) break;
        const out = gen(k / SR, i / SR);
        let l, r;
        if (Array.isArray(out)) { l = out[0] * gain; r = out[1] * gain; } else { l = out * gain * gl; r = out * gain * gr; }
        if (duck) { const d = 1 - duck * S.duckEnv[i]; l *= d; r *= d; }
        B.L[i] += l; B.R[i] += r;
        if (rev) { B.VL[i] += l * rev; B.VR[i] += r * rev; }
        if (dly) { B.DL[i] += l * dly; B.DR[i] += r * dly; }
      }
    },

    // sum buses into a new one (dry + sends)
    mix(...buses) {
      const M = S.bus();
      for (const B of buses) for (const k of ["L", "R", "VL", "VR", "DL", "DR"]) { const a = M[k], b = B[k]; for (let i = 0; i < N; i++) a[i] += b[i]; }
      return M;
    },

    // Freeverb (Schroeder–Moorer). Mono-summed input, decorrelated stereo out.
    freeverb(inL, inR, { room = 0.84, damp = 0.28, gainIn = 0.015 } = {}) {
      const sc = SR / 44100, combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225];
      const mk = (spread) => ({
        combs: combT.map((n) => ({ b: new Float32Array(Math.round((n + spread) * sc)), i: 0, s: 0 })),
        aps: apT.map((n) => ({ b: new Float32Array(Math.round((n + spread) * sc)), i: 0 })),
      });
      const ch = [mk(0), mk(23)], out = [new Float32Array(N), new Float32Array(N)];
      for (let c = 0; c < 2; c++) {
        const { combs, aps } = ch[c];
        for (let i = 0; i < N; i++) {
          const x = (inL[i] + inR[i]) * gainIn;
          let y = 0;
          for (const cb of combs) { const o = cb.b[cb.i]; cb.s = o * (1 - damp) + cb.s * damp; cb.b[cb.i] = x + cb.s * room; if (++cb.i >= cb.b.length) cb.i = 0; y += o; }
          for (const ap of aps) { const b = ap.b[ap.i], o = -y + b; ap.b[ap.i] = y + b * 0.5; if (++ap.i >= ap.b.length) ap.i = 0; y = o; }
          out[c][i] = y;
        }
      }
      return out;
    },

    // ping-pong delay with a dark feedback path; time in seconds (e.g. 3 sixteenths)
    pingpong(inL, inR, { time, fb = 0.35, lpHz = 4500 }) {
      const d = Math.round(time * SR), bl = new Float32Array(N), br = new Float32Array(N), lpL = S.svf(), lpR = S.svf();
      for (let i = 0; i < N; i++) {
        const pl = i >= d ? bl[i - d] : 0, pr = i >= d ? br[i - d] : 0;
        bl[i] = lpL.lp(inL[i] + inR[i] * 0.5 + pr * fb, lpHz);
        br[i] = lpR.lp(pl * fb, lpHz);
      }
      return [bl, br];
    },

    // tilt EQ on the dry signal: shelf-ish cut/boost at low and high corners
    tilt(B, { low = 0, lowHz = 120, high = 0, highHz = 4500 } = {}) {
      const ls = [S.svf(), S.svf()], hs = [S.svf(), S.svf()];
      for (let i = 0; i < N; i++) {
        B.L[i] = B.L[i] + low * ls[0].lp(B.L[i], lowHz) + high * hs[0].hp(B.L[i], highHz);
        B.R[i] = B.R[i] + low * ls[1].lp(B.R[i], lowHz) + high * hs[1].hp(B.R[i], highHz);
      }
    },

    // look-ahead peak limiter (ceiling in dBFS)
    limit(L, R, { ceilDb = -2.0, look = 0.004, rel = 0.12 } = {}) {
      const c = dbToGain(ceilDb), la = Math.round(look * SR), rc = Math.exp(-1 / (rel * SR));
      const need = new Float32Array(N);
      for (let i = 0; i < N; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = a > c ? c / a : 1; }
      const gmin = new Float32Array(N), dq = [];
      for (let i = N - 1; i >= 0; i--) {
        while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
        dq.push(i);
        while (dq[0] > i + la) dq.shift();
        gmin[i] = need[dq[0]];
      }
      let g = 1;
      for (let i = 0; i < N; i++) { g = gmin[i] < g ? gmin[i] : gmin[i] + (g - gmin[i]) * rc; L[i] *= g; R[i] *= g; }
    },

    // Bus → stereo file. Order: delay return → reverb return → high-pass → gain → drive (tanh) → fades → limiter.
    // Every stage is optional; a film with an unusual chain writes its own loop and calls S.writeWav.
    finish(B, path, {
      dly = 0, delay = null, // delay return level, pingpong options ({ time, fb, lpHz }); dlyToRev feeds the reverb
      dlyToRev = 0.2,
      rev = 0, reverb = {}, // reverb return level, freeverb options
      hpHz = 32, gainDb = 0, drive = 0, // drive > 0: tanh(x * drive) saturation
      fadeIn = 0, fadeOut = 0, // seconds; cos² fade-out
      limitDb = null, // look-ahead limiter ceiling, null = off
      shape = null, // optional (t, i) => gain, for film-specific automation (gates, distance, swells)
    } = {}) {
      if (dly && delay) {
        const [dl, dr] = S.pingpong(B.DL, B.DR, delay);
        for (let i = 0; i < N; i++) { B.L[i] += dl[i] * dly; B.R[i] += dr[i] * dly; B.VL[i] += dl[i] * dlyToRev; B.VR[i] += dr[i] * dlyToRev; }
      }
      const [wl, wr] = rev ? S.freeverb(B.VL, B.VR, reverb) : [null, null];
      const hp = [S.svf(), S.svf()], mk = dbToGain(gainDb);
      for (let i = 0; i < N; i++) {
        const t = i / SR;
        const fo = fadeOut && t > DUR - fadeOut ? Math.cos(((t - (DUR - fadeOut)) / fadeOut) * (Math.PI / 2)) ** 2 : 1;
        const fi = fadeIn ? Math.min(1, t / fadeIn) : 1;
        const sh = shape ? shape(t, i) : 1;
        let l = B.L[i] + (wl ? wl[i] * rev : 0), r = B.R[i] + (wr ? wr[i] * rev : 0);
        if (hpHz) { l = hp[0].hp(l, hpHz); r = hp[1].hp(r, hpHz); }
        l *= mk * sh; r *= mk * sh;
        if (drive) { l = Math.tanh(l * drive); r = Math.tanh(r * drive); }
        B.L[i] = l * fo * fi; B.R[i] = r * fo * fi;
      }
      if (limitDb !== null) S.limit(B.L, B.R, { ceilDb: limitDb });
      const peak = S.writeWav(path, B.L, B.R);
      console.log(`${path} · ${DUR}s · peak ${peak.toFixed(3)} (${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS)`);
      return peak;
    },

    // 32-bit float stereo WAV; path relative to the cwd (run scores from the project root). Returns the peak.
    writeWav(path, L, R) {
      const buf = Buffer.alloc(44 + N * 8);
      buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 8, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
      buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
      buf.writeUInt32LE(SR * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34); buf.write("data", 36); buf.writeUInt32LE(N * 8, 40);
      let peak = 0;
      for (let i = 0; i < N; i++) { buf.writeFloatLE(L[i], 44 + i * 8); buf.writeFloatLE(R[i], 48 + i * 8); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
      const abs = resolve(path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, buf);
      return peak;
    },
  };
  return S;
}
