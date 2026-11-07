// Moving a timed thing in a built film (`studio.mjs move <video> <what>`), with everything that moves with it, so a
// timing change is one command instead of edits found by hand:
// - a clip (`#id`, or a library item's code): its data-start and data-duration; a library item's settings, its
//   `duration` and its moments ("seconds in", such as `lands`), kept at their place in the film when only its start
//   moves; and when it moves as a whole, the sound cues `for` it (assets/audio/sfx-cues.json). Moving the voiceover
//   moves where the effects' build says it starts, and the music's duck with it.
// - a scene (`s07`): a cut is moved by the scene's start or end, a scene slides by `--to` or `--by`. The headings that
//   give its time range, the clips that start or end at its cuts, the scene table of a one-clock film (`["k-s07",
//   25.62, 31.31, drawS07]`), and on a slide the clips, cues and review beats inside it. Times written in its own code
//   (`P(t, 26.1, 0.45)`) are listed with their lines, or moved with `--code`.
// - with `--overlap`, a scene starts earlier (or ends later) under its neighbour, which keeps its own end (or start),
//   for a transition that moves both scenes (X05, X19): only the scene's own heading, clips and scene-table row move.
// The approved storyboard keeps its times.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { attrs } from "./check.mjs";
import { libraryItems } from "./library.mjs";
import { fileSections } from "./map.mjs";
import { readJSON, readStoryboard, storyboardVersions } from "./studio.mjs";
import { duckMusic, voiceClip } from "./words.mjs";

// a clip starts or ends "at" a cut within this much
const NEAR = 0.02;
const r3 = (x) => Math.round(x * 1000) / 1000;
const fmt = (x) => String(r3(x));
const near = (a, b) => Math.abs(a - b) <= NEAR;
const lineAt = (text, index) => text.slice(0, index).split("\n").length;
const decode = (s) => String(s).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** The film's own files (index.html, its scene files and shared scripts; not the library's blocks), each with its
    text and the edits to make: { rel, path, text, edits: [{ from, to, text }] }. */
function filmFiles(dir) {
  const items = new Set(libraryItems().map((i) => i.id));
  const rels = ["index.html"];
  if (existsSync(join(dir, "compositions"))) for (const n of readdirSync(join(dir, "compositions")).sort()) if (n.endsWith(".html") && !items.has(n.replace(/\.html$/, ""))) rels.push(`compositions/${n}`);
  if (existsSync(join(dir, "assets", "film"))) for (const n of readdirSync(join(dir, "assets", "film")).sort()) if (/\.(js|mjs)$/.test(n)) rels.push(`assets/film/${n}`);
  return rels.map((rel) => ({ rel, path: join(dir, rel), text: readFileSync(join(dir, rel), "utf8"), edits: [] }));
}

/** Every clip in a file: an element with data-start, its attributes and where its tag is; not the file's own root
    (its first composition). */
function clipsIn(file) {
  const root = /<[a-z][\w-]*\b[^>]*\bdata-composition-id\s*=[^>]*>/i.exec(file.text);
  return [...file.text.matchAll(/<([a-z][\w-]*)\b[^>]*\bdata-start\s*=[^>]*>/gi)].filter((m) => m.index !== root?.index).map((m) => {
    const a = attrs(m[0]);
    return { file, index: m.index, raw: m[0], tag: m[1].toLowerCase(), a, id: a.id || "", start: Number(a["data-start"]), duration: a["data-duration"] === undefined || a["data-duration"] === "" ? null : Number(a["data-duration"]) };
  });
}

/** An attribute set in a tag (added before its end when it isn't there). */
const setAttr = (raw, name, value) => {
  const re = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s>]+)`, "i");
  return re.test(raw) ? raw.replace(re, `$1"${value}"`) : raw.replace(/\s*(\/?)>$/, ` ${name}="${value}"$1>`);
};

/** One of a library item's settings changed in its tag's data-variable-values, in either quoting. */
const setSetting = (raw, key, value) =>
  raw
    .replace(/(\sdata-variable-values\s*=\s*')([^']*)(')/i, (m, a, v, b) => a + v.replace(new RegExp(`("${key}"\\s*:\\s*)-?\\d+(?:\\.\\d+)?`), `$1${value}`) + b)
    .replace(/(\sdata-variable-values\s*=\s*")([^"]*)(")/i, (m, a, v, b) => a + v.replace(new RegExp(`(&quot;${key}&quot;\\s*:\\s*)-?\\d+(?:\\.\\d+)?`), `$1${value}`) + b);

/** A library item's settings that are times, from its declarations in the project's copy: its moments, "seconds in"
    (`lands`, `highlightAt`…), which keep their place in the film when its start moves. */
function itemMoments(dir, composition) {
  const file = join(dir, "compositions", `${composition}.html`);
  if (!composition || !existsSync(file)) return [];
  const m = /data-composition-variables\s*=\s*(?:'([^']*)'|"([^"]*)")/.exec(readFileSync(file, "utf8"));
  let vars = [];
  try {
    vars = JSON.parse(decode(m?.[1] ?? m?.[2] ?? "[]"));
  } catch {}
  return vars.filter((v) => v?.unit === "s" && v.id !== "duration" && (/^when\b/i.test(String(v.label || "")) || /(At|Until)$/.test(v.id) || ["at", "lands", "split", "push"].includes(v.id))).map((v) => v.id);
}

/** A clip's settings, as the item reads them. */
function settingsOf(clip) {
  try {
    return JSON.parse(clip.a["data-variable-values"] || "{}");
  } catch {
    return {};
  }
}

/** The plan of edits for a clip: its new start and length, its settings, in its file's own time. Returns the words of
    what changed. */
function editClip(clip, { start, duration, keepMoments }, dir) {
  let raw = clip.raw;
  const said = [];
  if (start !== clip.start) {
    raw = setAttr(raw, "data-start", fmt(start - clip.offset));
    said.push(`data-start ${fmt(clip.start - clip.offset)} → ${fmt(start - clip.offset)}`);
  }
  if (duration !== null && clip.duration !== null && r3(duration) !== r3(clip.duration)) {
    raw = setAttr(raw, "data-duration", fmt(duration));
    said.push(`data-duration ${fmt(clip.duration)} → ${fmt(duration)}`);
  }
  const values = settingsOf(clip);
  const changed = [];
  if (duration !== null && Number.isFinite(Number(values.duration)) && r3(Number(values.duration)) !== r3(duration)) {
    raw = setSetting(raw, "duration", fmt(duration));
    changed.push(`duration ${fmt(values.duration)} → ${fmt(duration)}`);
  }
  // its moments stay where they were in the film: a later start brings them nearer its start
  const shift = clip.start - start;
  const late = [];
  for (const key of itemMoments(dir, clip.a["data-composition-id"])) {
    const v = Number(values[key]);
    if (!(v > 0)) continue; // 0 is "its usual time" (or off)
    const now = keepMoments ? v + shift : v;
    if (keepMoments && r3(now) !== r3(v)) {
      raw = setSetting(raw, key, fmt(Math.max(0.05, now)));
      changed.push(`${key} ${fmt(v)} → ${fmt(Math.max(0.05, now))}`);
    }
    if (now <= 0 || (duration !== null && now >= duration)) late.push(`${key} (${fmt(now)} s in) falls outside it`);
  }
  if (changed.length) said.push(`its settings: ${changed.join(", ")}`);
  if (raw !== clip.raw) clip.file.edits.push({ from: clip.index, to: clip.index + clip.raw.length, text: raw });
  return { said, late };
}

/** The sound cues file, and the cues that belong to a thing: `for` names its #id, its item code or its scene. */
function readCues(dir) {
  const path = join(dir, "assets", "audio", "sfx-cues.json");
  const plan = readJSON(path);
  return plan && Array.isArray(plan.cues) ? { path, plan, changed: [] } : null;
}
const isFor = (cue, names) => names.includes(String(cue.for || "").replace(/^#/, "").toLowerCase());
const moveCue = (cues, cue, by) => {
  const was = cue.at;
  cue.at = r3(cue.at + by);
  if (Number.isFinite(cue.cut_at)) cue.cut_at = r3(cue.cut_at + by);
  cues.changed.push(`${cue.sound || cue.file} ${fmt(was)} → ${fmt(cue.at)}`);
};

/** Apply each file's edits (last first, so the places found stay true) and write the files that changed. */
function writeAll(files) {
  for (const f of files) {
    if (!f.edits.length) continue;
    let text = f.text;
    for (const e of [...f.edits].sort((a, b) => b.from - a.from)) text = text.slice(0, e.from) + e.text + text.slice(e.to);
    writeFileSync(f.path, text);
  }
}

/** The film's clips, each with its start and end in the film's time (a scene file's from its host's start). */
function filmClips(files) {
  const index = files[0];
  const all = files.flatMap(clipsIn);
  for (const c of all) {
    const host = c.file === index ? null : all.find((h) => h.file === index && h.a["data-composition-src"] === c.file.rel);
    c.offset = host ? host.start : 0;
    c.start += c.offset;
    c.end = c.duration === null ? null : c.start + c.duration;
  }
  return all.filter((c) => Number.isFinite(c.start));
}

/** The thing to move: a scene id, a library item's code, or a clip's id. */
function findTarget(dir, files, clips, what) {
  const name = String(what || "").replace(/^#/, "");
  if (/^s\d{2,}[a-z]?$/i.test(name)) {
    const id = name.toLowerCase();
    const heads = files.flatMap((f) => fileSections(f.text).sections.filter((s) => s.scene === id).map((s) => ({ ...s, file: f })));
    const timed = heads.find((h) => h.start !== null);
    if (timed) return { kind: "scene", id, start: timed.start, end: timed.end, heads };
    const slug = dir.split("/").pop();
    const root = join(dir, "..", "..");
    const v = storyboardVersions(root, slug).at(-1);
    const sc = v ? readStoryboard(root, slug, v)?.storyboard?.scenes?.find((s) => s.id === id) : null;
    if (sc) return { kind: "scene", id, start: Number(sc.start), end: Number(sc.end), heads };
    throw new Error(`There's no scene ${id} headed in the film's code or in its storyboard.`);
  }
  if (/^[a-z]\d{2}$/i.test(name)) {
    const found = clips.filter((c) => String(c.a["data-composition-id"] || "").startsWith(`${name.toLowerCase()}-`));
    if (found.length === 1) return { kind: "clip", clip: found[0], names: [name.toLowerCase(), found[0].id.toLowerCase(), found[0].a["data-composition-id"]] };
    if (found.length > 1) throw new Error(`${name.toUpperCase()} plays ${found.length} times: name the one by its id (${found.map((c) => `#${c.id || "?"} at ${fmt(c.start)} s`).join(", ")}).`);
  }
  const clip = clips.find((c) => c.id === name);
  const code = /^([a-z]\d{2})-/.exec(clip?.a["data-composition-id"] || "")?.[1];
  if (clip) return { kind: "clip", clip, names: [name.toLowerCase(), code, clip.a["data-composition-id"]].filter(Boolean) };
  throw new Error(`There's nothing timed called ${what} in the film: give a scene (s03), a library item's code (W49) or a clip's id (#vo); \`studio.mjs map\` lists them.`);
}

/** Times written in a scene's own script sections between `lo` and `hi` (with a decimal point, as a time is):
    [{ file, index, value, line }]. */
function codeTimes(files, scene, lo, hi) {
  const out = [];
  for (const f of files) {
    const { blocks, sections } = fileSections(f.text);
    const lines = f.text.split("\n");
    const starts = [0];
    for (const l of lines) starts.push(starts.at(-1) + l.length + 1);
    for (const s of sections.filter((x) => x.scene === scene && x.block === "script")) {
      if (!blocks.some((b) => b.kind === "script" && b.from <= s.from && s.to <= b.to)) continue;
      for (let n = s.from + 1; n <= s.to; n++) {
        const line = lines[n - 1];
        for (const m of line.matchAll(/(?<![\w.$#-])\d+\.\d+(?![\w.])/g)) {
          const value = Number(m[0]);
          if (value >= lo - NEAR && value <= hi + NEAR) out.push({ file: f, index: starts[n - 1] + m.index, length: m[0].length, value, line: n });
        }
      }
    }
  }
  return out;
}

/** The calls of the transitions that move both scenes (X05, X19) on the film's timeline, with the scenes they name
    (their wrappers' or layers' ids, `#k-s04-wrap`): [{ code, at, a, b, where }]. */
function joinCalls(files) {
  const out = [];
  for (const f of files)
    for (const m of f.text.matchAll(/StudioTransitions\[\s*["'`]([a-z]\d{2})-[\w-]*["'`]\s*\]\s*\(\s*\w+\s*,\s*\{([^}]*)/gi)) {
      const named = (k) => new RegExp(`\\b${k}\\s*:\\s*(["'\`])([^"'\`]*)\\1`).exec(m[2])?.[2] || "";
      const scene = (k) => /(?:^|[^a-z0-9])(s\d{2,}[a-z]?)(?:[^0-9a-z]|$)/i.exec(named(k))?.[1]?.toLowerCase() || null;
      out.push({ code: m[1].toUpperCase(), at: Number(/\bat\s*:\s*(-?\d+(?:\.\d+)?)/.exec(m[2])?.[1]), a: scene("a"), b: scene("b"), where: `${f.rel}:${lineAt(f.text, m.index)}` });
    }
  return out;
}

/** A heading's first time range, given new ends. */
const retime = (line, a, b) => line.replace(/(\d+(?:\.\d+)?)(\s*(?:s\s*)?[–-]\s*)(\d+(?:\.\d+)?)/, (m, x, sep) => `${fmt(a)}${sep}${fmt(b)}`);

/** `move <scene> --start <s> --overlap` (or `--end`): the scene starts earlier (ends later) under its neighbour, which
    keeps its cut. What moves is the scene's own: its headings, the clips that start (end) where it does, and its row in
    a one-clock film's scene table. The lines that say what moved. */
function overlapScene(dir, files, clips, target, { start, end, filmLength, where }) {
  const { id } = target;
  const [c1, c2] = [target.start, target.end];
  const early = start !== null;
  const [was, now] = early ? [c1, start] : [c2, end];
  if (early ? !(now < c1) : !(now > c2)) throw new Error(`With --overlap, ${id} ${early ? "starts earlier" : "ends later"} than ${fmt(was)} s, under the scene ${early ? "before" : "after"} it: give a time ${early ? "before" : "after"} that, or leave out --overlap to move the cut.`);
  if (early ? now < 0 : now > filmLength + NEAR) throw new Error(`That's outside the film (0–${fmt(filmLength)} s).`);
  const at = (t) => near(t, was);
  const said = new Map();
  const say = (key, text) => said.set(key, [...(said.get(key) || []), text]);
  const notes = [];
  // its own headings, in every file
  for (const f of files) {
    const fileLines = f.text.split("\n");
    const starts = [0];
    for (const l of fileLines) starts.push(starts.at(-1) + l.length + 1);
    for (const s of fileSections(f.text).sections) {
      if (s.scene !== id || s.start === null || !at(early ? s.start : s.end)) continue;
      const [a, b] = early ? [now, s.end] : [s.start, now];
      f.edits.push({ from: starts[s.from - 1], to: starts[s.from - 1] + fileLines[s.from - 1].length, text: retime(fileLines[s.from - 1], a, b) });
      say(`${f.rel}:${s.from}`, `heading ${id} ${fmt(s.start)}–${fmt(s.end)} → ${fmt(a)}–${fmt(b)}`);
    }
  }
  // its clips: those that start (end) where it does; its neighbour's, which end (start) there, stay
  for (const c of clips.filter((x) => x.file === files[0])) {
    if (early ? !at(c.start) : c.end === null || !at(c.end)) continue;
    const s = early ? now : c.start;
    const d = early ? (c.duration === null ? null : c.end - now) : now - c.start;
    const { said: words, late } = editClip(c, { start: s, duration: d, keepMoments: early }, dir);
    if (words.length) say(where(c), `#${c.id || "?"} ${words.join(", ")}`);
    for (const l of late) notes.push(`#${c.id}'s ${l}: set it again.`);
    if (early && c.a["data-composition-src"] && !c.a["data-composition-id"]?.match(/^[a-z]\d{2}-/)) notes.push(`#${c.id} (${c.a["data-composition-src"]}) plays from its new start: its own times count from there.`);
  }
  // its row in a one-clock film's scene table: ["k-s05", 21.14, 28.18, drawS05]
  for (const f of files) {
    for (const m of f.text.matchAll(/\[\s*(["'`])([^"'`\n]*)\1\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)) {
      if (!new RegExp(`(^|[^a-z0-9])${id}([^0-9a-z]|$)`, "i").test(m[2])) continue;
      const [a, b] = [Number(m[3]), Number(m[4])];
      if (!at(early ? a : b)) continue;
      const [na, nb] = early ? [now, b] : [a, now];
      f.edits.push({ from: m.index, to: m.index + m[0].length, text: m[0].replace(/(,\s*)(-?\d+(?:\.\d+)?)(\s*,\s*)(-?\d+(?:\.\d+)?)$/, (x, p, y, q) => `${p}${fmt(na)}${q}${fmt(nb)}`) });
      say(`${f.rel}:${lineAt(f.text, m.index)}`, `scene table "${m[2]}" ${fmt(a)}, ${fmt(b)} → ${fmt(na)}, ${fmt(nb)}`);
    }
  }
  if (!said.size) return [`Nothing of ${id}'s ${early ? "starts" : "ends"} at ${fmt(was)} s in the film's code: nothing moved (\`studio.mjs map\` shows its times).`];
  writeAll(files);
  const lines = [`${id} now ${early ? "starts" : "ends"} at ${fmt(now)} s, ${fmt(Math.abs(was - now))} s ${early ? "earlier, under the scene before it (which keeps its end)" : "later, into the scene after it (which keeps its start)"}:`];
  for (const [k, v] of said) lines.push(`  ${k}  ${v.join("; ")}`);
  return [...lines, ...notes];
}

/** `move`: the plan, made and written; the lines that say what moved. */
export function moveThing(root, slug, what, { to = null, by = null, start = null, end = null, duration = null, code = false, overlap = false } = {}) {
  const dir = join(root, "videos", slug);
  if (!existsSync(join(dir, "index.html"))) throw new Error(`${slug} isn't built yet: move works on the film's code.`);
  const given = [to, by, start, end, duration].filter((x) => x !== null).length;
  if (!given || ((to !== null || by !== null) && given > 1)) throw new Error("Say where it goes: --to <s> or --by <±s> to move it whole, or --start <s>, --end <s> or --duration <s> for one end.");
  for (const x of [to, by, start, end, duration]) if (x !== null && !Number.isFinite(x)) throw new Error("Give each time in seconds of the film (12.4).");
  const files = filmFiles(dir);
  const clips = filmClips(files);
  const filmLength = Number(attrs(/<[a-z]+[^>]*\bdata-composition-id\s*=[^>]*>/i.exec(files[0].text)?.[0] || "")["data-duration"]) || Infinity;
  const target = findTarget(dir, files, clips, what);
  const cues = readCues(dir);
  const lines = [];
  const notes = [];
  const where = (c) => `${c.file.rel}:${lineAt(c.file.text, c.index)}`;
  if (overlap) {
    if (target.kind !== "scene" || [to, by, duration].some((x) => x !== null) || (start !== null) === (end !== null)) throw new Error("--overlap starts a scene earlier (--start <s>) or ends it later (--end <s>) under its neighbour: give one of them, with a scene (s05).");
    return overlapScene(dir, files, clips, target, { start, end, filmLength, where });
  }

  if (target.kind === "clip") {
    const c = target.clip;
    const length = c.duration;
    let s = c.start;
    let d = length;
    if (to !== null) s = to;
    if (by !== null) s = c.start + by;
    if (start !== null) {
      s = start;
      if (length !== null) d = c.end - start;
    }
    if (end !== null) d = end - s;
    if (duration !== null) d = duration;
    if (s < 0 || (d !== null && d <= 0)) throw new Error(`That would put ${what} at ${fmt(s)} s for ${fmt(d ?? 0)} s: a clip starts at 0 or later, and lasts more than 0.`);
    const whole = to !== null || by !== null;
    const { said, late } = editClip(c, { start: s, duration: d, keepMoments: start !== null }, dir);
    if (!said.length) return [`${what} is already there: ${fmt(c.start)}${c.end !== null ? `–${fmt(c.end)}` : ""} s.`];
    const code = /^([a-z]\d{2})-/.exec(c.a["data-composition-id"] || "")?.[1];
    const label = code ? `${code.toUpperCase()} (#${c.id})` : `#${c.id}`;
    lines.push(`Moved ${label} to ${fmt(s)}${d !== null ? `–${fmt(s + d)}` : ""} s (was ${fmt(c.start)}${c.end !== null ? `–${fmt(c.end)}` : ""}):`);
    lines.push(`  ${where(c)}  ${said.join("; ")}`);
    for (const l of late) notes.push(`Its ${l}: set it again.`);
    // its cues, when it moves whole
    if (cues) {
      const own = cues.plan.cues.filter((q) => isFor(q, target.names));
      if (whole) for (const q of own) moveCue(cues, q, s - c.start);
      else if (own.length) notes.push(`Its cues stay where they are (${own.map((q) => `${q.sound || q.file} at ${fmt(q.at)} s`).join(", ")}): only its ${start !== null ? "start" : "end"} moved.`);
    }
    // the voiceover: the effects' build places sounds around it, and the music ducks under it
    const isVoice = c.tag === "audio" && voiceClip({ attrs: c.a });
    if (isVoice) {
      if (cues?.plan.voiceover && near(Number(cues.plan.voiceover.at) || 0, c.start)) {
        cues.plan.voiceover.at = r3(s);
        cues.changed.push(`the voiceover's start ${fmt(c.start)} → ${fmt(s)}`);
      }
      notes.push(`The spoken words move with it (${s > c.start ? "+" : ""}${fmt(s - c.start)} s): what's timed to them doesn't. \`studio.mjs words\` lists them where they are now.`);
    }
    if (cues?.changed.length) {
      writeFileSync(cues.path, `${JSON.stringify(cues.plan, null, 2)}\n`);
      lines.push(`  assets/audio/sfx-cues.json  ${cues.changed.join("; ")} (\`sfx.mjs build\` makes the track again)`);
    }
    writeAll(files);
    if (isVoice && existsSync(join(dir, "tools", "duck-lane.json"))) {
      const lane = readJSON(join(dir, "tools", "duck-lane.json"));
      const level = Math.min(...(lane?.lanes?.[0]?.points || [{ v: 0.25 }]).map((p) => Number(p.v)).filter((v) => v > 0));
      lines.push(...duckMusic(root, slug, { level: Number.isFinite(level) && level < 1 ? level : 0.25 }).slice(1, -1).map((l) => `  ${l}`));
    }
    return [...lines, ...notes];
  }

  // a scene: its cuts, and on a slide, what's inside it
  const { id, heads } = target;
  const [c1, c2] = [target.start, target.end];
  let n1 = c1;
  let n2 = c2;
  if (to !== null || by !== null) {
    const d = to !== null ? to - c1 : by;
    n1 = c1 + d;
    n2 = c2 + d;
  }
  if (start !== null) n1 = start;
  if (end !== null) n2 = end;
  if (duration !== null) n2 = n1 + duration;
  if (n1 === c1 && n2 === c2) return [`${id} is already at ${fmt(c1)}–${fmt(c2)} s.`];
  if (!(n2 > n1)) throw new Error(`That would make ${id} ${fmt(n1)}–${fmt(n2)} s: its end must come after its start.`);
  if ((n1 !== c1 && near(c1, 0)) || (n2 !== c2 && near(c2, filmLength))) throw new Error(`${id} ${near(c1, 0) && n1 !== c1 ? "starts" : "ends"} the film, and that end stays: the film's length is its root's data-duration (and its clock's), and the clips that run to the end.`);
  const slide = n1 - c1 === n2 - c2 ? n1 - c1 : null;
  const cuts = [[c1, n1], [c2, n2]].filter(([a, b]) => a !== b);
  const atCut = (t) => cuts.find(([a]) => near(t, a));
  const inside = (t) => slide !== null && t > c1 + NEAR && t < c2 - NEAR;
  lines.push(`Moved ${id} to ${fmt(n1)}–${fmt(n2)} s (was ${fmt(c1)}–${fmt(c2)})${slide !== null ? `, ${slide > 0 ? "later" : "earlier"} by ${fmt(Math.abs(slide))} s` : ""}:`);
  const said = new Map();
  const say = (key, text) => said.set(key, [...(said.get(key) || []), text]);

  // the headings that give a time range ending or starting at a cut, in every file
  for (const f of files) {
    const fileLines = f.text.split("\n");
    const starts = [0];
    for (const l of fileLines) starts.push(starts.at(-1) + l.length + 1);
    for (const s of fileSections(f.text).sections) {
      if (s.start === null) continue;
      const a = atCut(s.start)?.[1] ?? (inside(s.start) ? s.start + slide : s.start);
      const b = atCut(s.end)?.[1] ?? (inside(s.end) ? s.end + slide : s.end);
      if (a === s.start && b === s.end) continue;
      const line = fileLines[s.from - 1];
      const next = retime(line, a, b);
      f.edits.push({ from: starts[s.from - 1], to: starts[s.from - 1] + line.length, text: next });
      say(`${f.rel}:${s.from}`, `heading ${s.scene || s.name.slice(0, 24)} ${fmt(s.start)}–${fmt(s.end)} → ${fmt(a)}–${fmt(b)}`);
    }
  }
  // the clips: those at a cut keep their other end; on a slide, those inside go with it
  for (const c of clips.filter((x) => x.file === files[0])) {
    if (c.end !== null && c.start < c1 - NEAR && c.end > c2 + NEAR) continue; // across the whole scene (the music)
    let s = c.start;
    let d = c.duration;
    let keepMoments = false;
    const startCut = atCut(c.start);
    const endCut = c.end !== null ? atCut(c.end) : null;
    // a transition across a cut that moves goes with it
    const across = /^x\d{2}-/.test(c.a["data-composition-id"] || "") && c.end !== null ? cuts.find(([a]) => c.start < a - NEAR && c.end > a + NEAR) : null;
    if (slide !== null && c.start >= c1 - NEAR && c.start < c2 - NEAR) s = c.start + slide; // inside, or at its start: with it
    else if (across) s = c.start + across[1] - across[0];
    else if (startCut) {
      s = startCut[1];
      if (d !== null) d = c.end - s;
      keepMoments = true;
    }
    if (endCut && !(slide !== null && c.start >= c1 - NEAR && c.start < c2 - NEAR)) d = endCut[1] - s;
    if (s === c.start && d === c.duration) continue;
    if (d !== null && d <= 0) {
      say(where(c), `#${c.id || "?"} would last ${fmt(d)} s: left as it is`);
      continue;
    }
    const { said: words, late } = editClip(c, { start: s, duration: d, keepMoments }, dir);
    if (words.length) say(where(c), `#${c.id || "?"} ${words.join(", ")}`);
    for (const l of late) notes.push(`#${c.id}'s ${l}: set it again.`);
    if (c.a["data-composition-src"] && !c.a["data-composition-id"]?.match(/^[a-z]\d{2}-/) && s !== c.start) notes.push(`#${c.id} (${c.a["data-composition-src"]}) plays from its new start: its own times count from there.`);
  }
  // a one-clock film's scene table: ["k-s07", 25.62, 31.31, drawS07]
  const table = [];
  for (const f of files) {
    for (const m of f.text.matchAll(/\[\s*(["'`])([^"'`\n]*)\1\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?|[A-Za-z_$][\w$]*)/g)) {
      const a = Number(m[3]);
      const b = Number(m[4]);
      const na = atCut(a)?.[1] ?? (inside(a) ? a + slide : a);
      const nb = Number.isFinite(b) ? (atCut(b)?.[1] ?? (inside(b) ? b + slide : b)) : b;
      table.push(a, b);
      if (na === a && (nb === b || !Number.isFinite(b))) continue;
      const text = m[0].replace(/(,\s*)(-?\d+(?:\.\d+)?)(\s*,\s*)(-?\d+(?:\.\d+)?|[A-Za-z_$][\w$]*)$/, (x, p, y, q, z) => `${p}${fmt(na)}${q}${Number.isFinite(b) ? fmt(nb) : z}`);
      f.edits.push({ from: m.index, to: m.index + m[0].length, text });
      say(`${f.rel}:${lineAt(f.text, m.index)}`, `scene table "${m[2]}" ${fmt(a)}, ${Number.isFinite(b) ? fmt(b) : m[4]} → ${fmt(na)}, ${Number.isFinite(b) ? fmt(nb) : m[4]}`);
    }
  }
  // times in the scene's own code: inside it on a slide, or at a cut that moves
  const times = slide !== null ? codeTimes(files, id, c1, c2) : cuts.flatMap(([a]) => codeTimes(files, id, a, a));
  const moved = (t) => (slide !== null ? t + slide : atCut(t)?.[1] ?? t);
  const touched = times.filter((t) => moved(t.value) !== t.value && !t.file.edits.some((e) => e.from <= t.index && t.index < e.to));
  if (code) for (const t of touched) {
    t.file.edits.push({ from: t.index, to: t.index + t.length, text: fmt(moved(t.value)) });
    say(`${t.file.rel}:${t.line}`, `${t.value} → ${fmt(moved(t.value))}`);
  }
  // the cues for the scene, and on a slide the ones inside it; the review's beats inside it
  if (cues && slide !== null) {
    for (const q of cues.plan.cues) if (isFor(q, [id]) || (q.at >= c1 - NEAR && q.at < c2 - NEAR)) moveCue(cues, q, slide);
    if (cues.changed.length) {
      writeFileSync(cues.path, `${JSON.stringify(cues.plan, null, 2)}\n`);
      say("assets/audio/sfx-cues.json", `${cues.changed.join("; ")} (\`sfx.mjs build\` makes the track again)`);
    }
  }
  const beatsFile = join(dir, "docs", "beats.json");
  const beats = readJSON(beatsFile);
  if (beats && slide !== null) {
    const shift = (t) => (typeof t === "number" && t >= c1 && t < c2 ? r3(t + slide) : t);
    const was = JSON.stringify(beats);
    if (Array.isArray(beats.keys)) beats.keys = beats.keys.map(shift);
    if (Array.isArray(beats.contact)) beats.contact = beats.contact.map(shift);
    if (typeof beats.poster === "number") beats.poster = shift(beats.poster);
    if (beats.strips && typeof beats.strips === "object") for (const k of Object.keys(beats.strips)) if (Array.isArray(beats.strips[k])) beats.strips[k] = beats.strips[k].map(shift);
    if (JSON.stringify(beats) !== was) {
      writeFileSync(beatsFile, `${JSON.stringify(beats, null, 2)}\n`);
      say("docs/beats.json", "the review's frames inside it");
    }
  }
  writeAll(files);
  for (const [k, v] of said) lines.push(`  ${k}  ${v.join("; ")}`);
  if (said.size === 0) lines.push("  Nothing timed in the film's code starts or ends there.");
  // a transition that moves both scenes stays where it's called: it's timed to the cut by hand
  for (const j of joinCalls(files)) {
    const side = j.b === id && n1 !== c1 ? ["comes in under", "start", "earlier"] : j.a === id && n2 !== c2 ? ["goes out under", "end", "later"] : null;
    if (side) notes.push(`${id} ${side[0]} ${j.code} (${j.where}, at ${fmt(j.at)} s), which stays: set its at again if the transition moves with the cut, or keep the cut and ${side[1]} ${id} ${side[2]} under it with --overlap.`);
  }
  if (!heads.length) notes.push(`${id} has no heading in the film's code: its time range came from the storyboard.`);
  // a cut that nothing timed starts or ends at: its heading may be out of date
  for (const [a] of cuts) if (!clips.some((c) => c.file === files[0] && (near(c.start, a) || (c.end !== null && near(c.end, a)))) && !table.some((t) => near(t, a))) notes.push(`Nothing timed in the film starts or ends at ${fmt(a)} s, ${id}'s ${a === c1 ? "start" : "end"} in its heading: check the heading against the film (\`studio.mjs map\`).`);
  if (touched.length && !code) {
    const byLine = new Map();
    for (const t of touched) byLine.set(`${t.file.rel}:${t.line}`, [...(byLine.get(`${t.file.rel}:${t.line}`) || []), t.value]);
    notes.push(`Not moved, the times in ${id}'s own code (\`--code\` moves them too): ${[...byLine].map(([k, v]) => `${k} ${v.join(", ")}`).join("; ")}.`);
  }
  return [...lines, ...notes];
}
