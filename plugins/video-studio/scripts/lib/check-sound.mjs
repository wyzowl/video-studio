// The sound and the picture of a film, for `studio.mjs check`, measured with ffmpeg against `guides/rules.json`.
// - On a rendered file alone (any MP4, a draft or master here or a video made elsewhere): loudness and true peak, a
//   sound that stops dead, and a picture that freezes. `renderFindings` takes nothing but the file and the rules.
// - With the project's own sound (its <audio> and <video> elements and their files): the music against the voice,
//   and each sound's own ending. `stemFindings` reads what HyperFrames would play, not a render.
// Findings are { level, time, until, element, what, fix, owner, source, code } (check.mjs ranks and saves them).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const run = (args, opts = {}) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: opts.binary ? "buffer" : "utf8", maxBuffer: 1024 * 1024 * 1024 });
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const round = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
const at = (s) => `${round(s, 1)} s`;

/** Integrated loudness, loudness range and true peak of a file's sound ({ lufs, lra, peak }), or null with no sound. */
export function loudness(file) {
  const r = run(["-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const text = String(r.stderr || "");
  const tail = text.slice(text.lastIndexOf("Summary:"));
  if (!tail.includes("Integrated loudness")) return null;
  const num = (re) => {
    const m = re.exec(tail);
    return m ? Number(m[1]) : null;
  };
  return { lufs: num(/I:\s+(-?[\d.]+|-inf)\s+LUFS/), lra: num(/LRA:\s+(-?[\d.]+)\s+LU/), peak: num(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/) };
}

/** A file's sound as mono samples at 48 kHz, from `from` for `length` seconds (the whole file without them). */
function samples(file, { from = 0, length = null, channels = null } = {}) {
  const args = ["-v", "error", ...(from > 0 ? ["-ss", String(from)] : []), "-i", file, ...(length ? ["-t", String(length)] : []), "-vn"];
  // a mono source plays in both channels at full level; anything else is summed to one
  args.push("-af", channels === 1 ? "anull" : "pan=mono|c0=0.5*c0+0.5*c1", "-ac", "1", "-ar", "48000", "-f", "f32le", "-");
  const r = run(args, { binary: true });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const buf = r.stdout;
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

/** The level every 5 ms (RMS, in dBFS). */
function envelope(pcm, hop = 240) {
  const out = new Float32Array(Math.floor(pcm.length / hop));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) s += pcm[j] * pcm[j];
    out[i] = db(Math.sqrt(s / hop));
  }
  return out;
}

/** Where a sound stops dead: held at `from` dBFS or more for 50 ms, then silent (`to` or less) within `within`
    seconds, and staying quiet after. A click or a tick, which is over in a few milliseconds, isn't one. Times in
    seconds of the envelope. */
export function hardStops(env, { from, to, within, hop = 0.005 }) {
  const stops = [];
  const span = Math.max(1, Math.round(within / hop));
  const after = Math.round(0.1 / hop);
  const before = Math.round(0.05 / hop);
  for (let i = before; i + span + after < env.length; i++) {
    if (env[i] < from) continue;
    let held = 0;
    for (let k = i - before; k < i; k++) if (env[k] >= from) held++;
    if (held < 0.8 * before) continue;
    let j = i + 1;
    while (j <= i + span && env[j] > to) j++;
    if (j > i + span) continue;
    let quiet = true;
    for (let k = j; k < j + after; k++) if (env[k] > to + 10) quiet = false;
    if (!quiet) continue;
    const t = (i + 1) * hop;
    if (!stops.length || t - stops.at(-1).time > 0.5) stops.push({ time: t, level: round(env[i]) });
    i = j + after;
  }
  return stops;
}

/** Stretches where the picture doesn't change, `seconds` or longer ([{ start, end }]): with a floor of −80 dB, frames
    that are copies of each other (a picture stuck in the render); with a higher floor, stretches where little moves. */
export function frozen(file, seconds, floor = -80) {
  const r = run(["-i", file, "-an", "-vf", `scale=640:-2,freezedetect=n=${floor}dB:d=${seconds}`, "-f", "null", "-"]);
  const text = String(r.stderr || "");
  const out = [];
  for (const m of text.matchAll(/freeze_start:\s*([\d.]+)|freeze_end:\s*([\d.]+)/g)) {
    if (m[1]) out.push({ start: Number(m[1]), end: null });
    else if (out.length && out.at(-1).end === null) out.at(-1).end = Number(m[2]);
  }
  return out;
}

function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,channels", "-of", "json", file], { encoding: "utf8" });
  try {
    const j = JSON.parse(r.stdout);
    const audio = (j.streams || []).find((s) => s.codec_type === "audio");
    return { duration: Number(j.format?.duration) || 0, channels: audio ? Number(audio.channels) || 2 : 0, video: (j.streams || []).some((s) => s.codec_type === "video") };
  } catch {
    return { duration: 0, channels: 0, video: false };
  }
}

/** What a rendered file alone shows: its loudness and true peak, a sound playing at its last frame, sounds that stop
    dead, and pictures that freeze (except a hold that ends the film). `skip(start, end)` leaves out a still stretch
    already reported. */
export function renderFindings(file, rules, { name = file, skipFrozen = () => false, stops = true } = {}) {
  const R = rules.sound;
  const out = [];
  const info = probe(file);
  const ran = [];
  if (info.channels) {
    const l = loudness(file);
    if (l && Number.isFinite(l.lufs) && l.lufs > -70) {
      ran.push(`${round(l.lufs)} LUFS, ${round(l.peak)} dBTP`);
      const off = l.lufs - R.mixLufs;
      if (Math.abs(off) > R.mixTolerance)
        out.push({
          level: "should",
          time: null,
          element: name,
          what: `The mix measures ${round(l.lufs)} LUFS: ${round(Math.abs(off))} dB ${off < 0 ? "under" : "over"} the ${R.mixLufs} LUFS target.`,
          fix: `${off < 0 ? "Raise" : "Lower"} the stems by ${round(Math.abs(off))} dB and level them again (audio/mixing.md), then render again.`,
          owner: "build",
          code: "mix_loudness",
        });
      if (l.peak > 0)
        out.push({ level: "must", time: null, element: name, what: `The sound clips: its true peak is ${round(l.peak)} dBTP.`, fix: `Level the stems to ${R.stemsPeak} dBTP or lower (audio/mixing.md) and render again.`, owner: "build", code: "mix_clips" });
      else if (l.peak > R.peakMax)
        out.push({ level: "should", time: null, element: name, what: `The true peak is ${round(l.peak)} dBTP, over ${R.peakMax} dBTP: platforms' encoders can clip it.`, fix: `Level the stems to ${R.stemsPeak} dBTP or lower (audio/mixing.md).`, owner: "build", code: "mix_peak" });
    } else ran.push("no sound");
    if (stops) {
      const pcm = samples(file, { channels: info.channels });
      if (pcm) {
        const env = envelope(pcm);
        for (const s of hardStops(env, { from: R.stopDeadFrom, to: R.stopDeadTo, within: R.stopDeadWithin }))
          out.push({ level: "should", time: s.time, element: name, what: `A sound stops dead at ${at(s.time)}: from ${s.level} dB to silence in a hundredth of a second.`, fix: "Let it end on its own tail, or fade it over a few frames.", owner: "build", code: "sound_stops_dead" });
        const tail = env.slice(-10);
        const end = tail.length ? Math.max(...tail) : -Infinity;
        if (end >= R.stopDeadFrom)
          out.push({ level: "should", time: round(info.duration, 2), element: name, what: `The sound is still playing at the last frame (${round(end)} dB), so it stops dead as the film ends.`, fix: "Fade the music and any effect out before the end, or end them where they end on their own.", owner: "build", code: "sound_stops_at_end" });
      }
    }
  }
  if (info.video) {
    const still = frozen(file, R.frozenFor, R.frozenFloor).filter((f) => (f.end ?? info.duration) < info.duration - 0.1);
    for (const f of still) {
      const end = f.end ?? info.duration;
      if (skipFrozen(f.start, end)) continue;
      out.push({
        level: "should",
        time: round(f.start, 2),
        until: round(end, 2),
        element: name,
        what: `The picture doesn't change at all for ${round(end - f.start)} s (${at(f.start)}–${at(end)}): it's stuck in the render.`,
        fix: "Footage that freezes on seek: re-encode it with a keyframe every second (guides/format.md, Media). A scene that froze: check its file loads (guides/format.md, Scene files).",
        owner: "build",
        code: "picture_frozen",
      });
    }
    ran.push(still.length ? `${still.length} frozen stretch${still.length === 1 ? "" : "es"}` : "no frozen stretch");
  }
  return { findings: out.map((f) => ({ source: "Video Studio: the render", ...f })), ran: ran.join(", ") };
}

// ───────── the project's own sound ─────────

const VOICE = /\b(vo|voice|voiceover|voice-over|narration|narrator)\b/i;
const MUSIC = /\b(music|bgm|soundtrack|score|bed)\b/i;

/** A volume lane (data-automation) as a function of the clip's own time, or null. */
function laneOf(el) {
  try {
    const lane = (JSON.parse(el.attrs["data-automation"] || "null")?.lanes || []).find((l) => l.target === "volume");
    const pts = (lane?.points || []).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v)).sort((a, b) => a.t - b.t);
    if (!pts.length) return null;
    return (t) => {
      if (t <= pts[0].t) return pts[0].v;
      for (let i = 1; i < pts.length; i++) if (t <= pts[i].t) return pts[i - 1].v + ((pts[i].v - pts[i - 1].v) * (t - pts[i - 1].t)) / (pts[i].t - pts[i - 1].t);
      return pts.at(-1).v;
    };
  } catch {
    return null;
  }
}

/** Momentary loudness (LUFS, 400 ms windows every 100 ms) of a clip as it plays in the film: its file's stretch, at its
    volume and lane, mono played in both channels. [{ t (film time), lufs }]. */
function momentary(dir, el, duration) {
  const file = join(dir, el.attrs.src || "");
  if (!el.attrs.src || !existsSync(file)) return null;
  const start = Number(el.attrs["data-start"]) || 0;
  const length = Math.min(Number(el.attrs["data-duration"]) || duration, duration - start);
  const from = Number(el.attrs["data-media-start"]) || 0;
  const channels = probe(file).channels;
  if (!channels || length <= 0) return null;
  const r = run(["-ss", String(from), "-t", String(length), "-i", file, "-vn", "-af", `${channels === 1 ? "pan=stereo|c0=c0|c1=c0," : ""}ebur128=metadata=1,ametadata=print:key=lavfi.r128.M`, "-f", "null", "-"]);
  const text = String(r.stderr || "") + String(r.stdout || "");
  const volume = Number(el.attrs["data-volume"] ?? 1);
  const lane = laneOf(el);
  const out = [];
  let t = null;
  for (const line of text.split("\n")) {
    const pts = /pts_time:([\d.]+)/.exec(line);
    if (pts) t = Number(pts[1]);
    const m = /lavfi\.r128\.M=(-?[\d.]+|-inf)/.exec(line);
    if (m && t !== null) {
      const gain = db(volume * (lane ? Math.max(0, lane(t)) : 1));
      out.push({ t: start + t, lufs: Number(m[1]) + gain });
    }
  }
  return out;
}

const energy = (xs) => (xs.length ? 10 * Math.log10(xs.reduce((s, x) => s + 10 ** (x / 10), 0) / xs.length) : -Infinity);

/** From the project's own sound: the music against the voice while it speaks, and each sound's own ending (still
    playing when its clip ends, with no fade). `media` is the film's <audio> and <video> elements ({ tag, attrs }),
    `words` the spoken words in film time. */
export function stemFindings(dir, media, words, rules, duration) {
  const R = rules.sound;
  const out = [];
  const ran = [];
  const sound = media.filter((m) => m.attrs.src && (m.tag === "audio" || m.attrs["data-has-audio"] === "true"));
  const name = (m) => (m.attrs.id ? `#${m.attrs.id}` : m.attrs.src);
  const role = (m) => m.attrs["data-timeline-role"] || "";
  const voices = sound.filter((m) => role(m) === "voiceover" || (m.tag === "audio" && (VOICE.test(m.attrs.id || "") || VOICE.test(m.attrs.src))) || (m.tag === "video" && words.length));
  const music = sound.filter((m) => !voices.includes(m) && (role(m) === "music" || MUSIC.test(m.attrs.id || "") || MUSIC.test(m.attrs.src)));

  // the music against the voice: in each stretch of speech (words less than 0.6 s apart), how far under it the music sits
  if (voices.length && music.length && words.length) {
    const spans = [];
    for (const w of words) {
      if (spans.length && w.start - spans.at(-1).end < 0.6) spans.at(-1).end = w.end;
      else spans.push({ start: w.start, end: w.end });
    }
    const v = voices.flatMap((m) => momentary(dir, m, duration) || []);
    const mu = music.flatMap((m) => momentary(dir, m, duration) || []);
    const within = (xs, s) => xs.filter((x) => x.t >= s.start && x.t <= s.end && Number.isFinite(x.lufs) && x.lufs > -70).map((x) => x.lufs);
    const gaps = spans
      .filter((s) => s.end - s.start >= 1)
      .map((s) => ({ ...s, voice: energy(within(v, s)), music: energy(within(mu, s)) }))
      .filter((s) => Number.isFinite(s.voice) && Number.isFinite(s.music))
      .map((s) => ({ ...s, gap: s.voice - s.music }));
    if (gaps.length) {
      const sorted = gaps.map((g) => g.gap).sort((a, b) => a - b);
      ran.push(`music ${round(sorted[Math.floor(sorted.length / 2)])} dB under the voice`);
      const short = gaps.filter((g) => g.gap < R.musicUnderVoice);
      if (short.length) {
        const worst = short.reduce((a, b) => (b.gap < a.gap ? b : a));
        out.push({
          level: "should",
          time: round(worst.start, 2),
          until: round(worst.end, 2),
          element: music.map(name).join(", "),
          what: `The music sits ${round(worst.gap)} dB under the voice at ${at(worst.start)}–${at(worst.end)}${short.length > 1 ? `, and under ${R.musicUnderVoice} dB in ${short.length - 1} more stretch${short.length === 2 ? "" : "es"} of speech` : ""}: the words compete with it.`,
          fix: `Duck or carve the music to at least ${R.musicUnderVoice} dB under the voice while it speaks (audio/mixing.md, Room for the voice).`,
          owner: "build",
          code: "music_over_voice",
        });
      }
    }
  }

  // each sound's own ending: still playing when its clip ends, with no fade (a fade-out or a lane down to nothing)
  for (const m of sound) {
    const file = join(dir, m.attrs.src);
    if (!existsSync(file)) continue;
    const start = Number(m.attrs["data-start"]) || 0;
    const info = probe(file);
    const from = Number(m.attrs["data-media-start"]) || 0;
    const rate = Number(m.attrs["data-playback-rate"]) || 1;
    const length = Number(m.attrs["data-duration"]) || (info.duration - from) / rate;
    const end = Math.min(start + length, duration);
    const srcEnd = from + (end - start) * rate;
    if (srcEnd >= info.duration - 0.02) continue; // the file ends there on its own
    if (Number(m.attrs["data-fade-out"]) >= 0.05) continue;
    const lane = laneOf(m);
    if (lane && lane(end - start - 0.01) <= 0.1) continue;
    const pcm = samples(file, { from: Math.max(0, srcEnd - 0.05), length: 0.05, channels: info.channels });
    if (!pcm?.length) continue;
    const level = db(Math.sqrt(pcm.reduce((s, x) => s + x * x, 0) / pcm.length)) + db(Number(m.attrs["data-volume"] ?? 1));
    if (level < R.stopDeadFrom) continue;
    const linked = m.tag === "video" && end < duration - 0.05;
    out.push({
      level: "should",
      time: round(end, 2),
      element: name(m),
      what: `${name(m)} is still playing (${round(level)} dB) when its clip ends at ${at(end)}, so it stops dead${linked ? " at the cut" : ""}.`,
      fix: linked ? "Cut in a pause (a beat after the last word), or give the cut a fade of a few frames (data-fade-out)." : "End it where the sound ends, or fade it out over a few frames (data-fade-out, or the lane).",
      owner: "build",
      code: "sound_stops_dead",
    });
  }
  // sounds cut short inside a stem of effects or music
  for (const m of sound.filter((x) => !voices.includes(x) && x.tag === "audio")) {
    const file = join(dir, m.attrs.src);
    if (!existsSync(file)) continue;
    const start = Number(m.attrs["data-start"]) || 0;
    const from = Number(m.attrs["data-media-start"]) || 0;
    const length = Math.min(Number(m.attrs["data-duration"]) || duration, duration - start);
    const pcm = samples(file, { from, length, channels: probe(file).channels });
    if (!pcm) continue;
    const gain = db(Number(m.attrs["data-volume"] ?? 1));
    const env = envelope(pcm).map((x) => x + gain);
    for (const s of hardStops(env, { from: R.stopDeadFrom, to: R.stopDeadTo, within: R.stopDeadWithin }))
      out.push({ level: "should", time: round(start + s.time, 2), element: name(m), what: `A sound in ${name(m)} stops dead at ${at(start + s.time)} (from ${s.level} dB to silence in a hundredth of a second).`, fix: "Let it ring out on its own tail, or fade it over a few frames.", owner: "build", code: "sound_stops_dead" });
  }
  ran.push(`${sound.length} sound${sound.length === 1 ? "" : "s"}' endings`);
  return { findings: out.map((f) => ({ source: "Video Studio: the sound", ...f })), ran: ran.join(", ") };
}
