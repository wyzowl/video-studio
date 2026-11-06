// Video Studio's checks (`studio.mjs check <video>`), run before Claude's review: HyperFrames' own check with the
// video's settings, and only what it lacks, measured against guides/rules.json (a video's own docs/rules.json read over
// it), in one ranked report: must fix, should fix and notes, each with the time, the element and what to do. Saved as
// docs/checks/film.json in the video's folder and shown on its overview.
// - HyperFrames' check (`HF check --json`), its findings taken as they come: lint, runtime, layout, motion, contrast,
//   craft and audio, sampled at every storyboard frame's time and scene change, with the platforms' band on a 9:16 frame.
// - The scene plan as HyperFrames' motion assertions (index.motion.json): each word the plan times lands by then, in
//   the planned order, so HyperFrames' check tests that the motion does what was approved.
// - Video Studio's own pass on the words (check-film.mjs): type sizes for the frame, the reading hold, words at once,
//   headlines, safe areas and the caption band, the brand's colours and fonts, and the words against the approved
//   ones and the voice. It never repeats a finding HyperFrames made.
// - The sound (check-sound.mjs): the music against the voice and each sound's ending, from the project; with a render,
//   its loudness, true peak, sounds that stop dead and a stuck picture, and on footage words over the face.
// (Studio health's checks of the Mac itself are lib/checks.mjs.)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { openFilm } from "./check-film.mjs";
import { renderFindings, stemFindings } from "./check-sound.mjs";
import { brandStyle } from "./library.mjs";
import { readProgress, updateProgress } from "./progress.mjs";
import { PLUGIN_ROOT, readBrand, readBrief, readJSON, readScript, readStoryboard, scriptVersions, storyboardVersions } from "./studio.mjs";
import { HYPERFRAMES_ENV, HYPERFRAMES_VERSION } from "./versions.mjs";

const RULES_FILE = join(PLUGIN_ROOT, "guides", "rules.json");
const LEVELS = { must: "Must fix", should: "Should fix", note: "Notes" };
const CAPTION_ITEMS = ["t04-", "t05-", "t32-", "t33-", "t34-", "t35-", "t36-"];
const MARK = "Video Studio's checks, from the storyboard's scene plans";

const round = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const secs = (s) => `${round(s, 1)} s`;
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const quote = (s, n = 48) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return `‘${t.length > n ? `${t.slice(0, n - 1)}…` : t}’`;
};

// ───────── the rules ─────────

/** The rules the checks measure against: the plugin's, with a video's own docs/rules.json over them (what its brief
    or the user changed). `own` lists the numbers the video changed. */
export function readRules(dir = null) {
  const base = JSON.parse(readFileSync(RULES_FILE, "utf8"));
  const own = dir ? readJSON(join(dir, "docs", "rules.json")) : null;
  const changed = [];
  const merge = (a, b, path) => {
    for (const [k, v] of Object.entries(b || {})) {
      if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object") merge(a[k], v, `${path}${k}.`);
      else {
        a[k] = v;
        changed.push(`${path}${k}`);
      }
    }
  };
  if (own) merge(base, own, "");
  return { ...base, own: changed };
}

/** The rules' row for a frame: its key (16x9, 1x1, 4x5, 9x16: the nearest shape) and how much to scale its sizes (a
    frame wider than the row's, such as 4K, scales them by width). */
export function frameRow(rules, w, h) {
  const shapes = { "16x9": 16 / 9, "1x1": 1, "4x5": 0.8, "9x16": 9 / 16 };
  const key = Object.entries(shapes).sort((a, b) => Math.abs(a[1] - w / h) - Math.abs(b[1] - w / h))[0][0];
  return { key, type: rules.type[key], safe: rules.safe[key], scale: w / rules.type[key].width };
}

// ───────── words ─────────

const NUMBERS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const DROP = new Set(["pounds", "pound", "dollars", "dollar", "euros", "euro", "pence", "cents", "per", "cent"]);
const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "by", "with", "is", "it", "its", "it's", "your", "you", "we", "our", "this", "that", "be", "are", "so"]);

/** Typed words in one form: lower case, curly and straight quotes and apostrophes alike, one kind of dash and of
    space. */
const plain = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[‘’ʼ′´`]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/** Words as written: lower case, no punctuation, figures without their thousands' commas. */
function written(text) {
  return plain(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d),(\d{3})/g, "$1$2")
    .replace(/(\d)([a-z%])/g, "$1 $2")
    .replace(/%/g, " percent ")
    .split(/[^a-z0-9.']+/)
    .map((w) => w.replace(/^'+|'+$/g, "").replace(/\.$/, "").replace(/^\.+/, ""))
    .filter(Boolean);
}

/** Words as the checks compare them with the voice: as written, with numbers as figures ("fourteen pounds" and "£14"
    are both "14") and currency words dropped. */
function tokens(text) {
  const raw = written(text);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    if (w in NUMBERS) {
      let n = NUMBERS[w];
      if (n >= 20 && n % 10 === 0 && raw[i + 1] in NUMBERS && NUMBERS[raw[i + 1]] < 10) n += NUMBERS[raw[++i]];
      if (raw[i + 1] === "hundred") (n *= 100), i++;
      if (raw[i + 1] === "thousand") (n *= 1000), i++;
      out.push(String(n));
    } else if (!DROP.has(w) && w !== "p") out.push(w);
  }
  return out;
}
const content = (toks) => toks.filter((t) => !STOP.has(t));
const wordCount = (text) => String(text || "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Where `phrase` (tokens) is said: the start of each place the words come in order, as [seconds]. */
function spokenAt(spoken, phrase) {
  if (!phrase.length) return [];
  const hits = [];
  for (let i = 0; i + phrase.length <= spoken.length; i++) {
    let ok = true;
    for (let j = 0; j < phrase.length && ok; j++) ok = spoken[i + j].tok === phrase[j];
    if (ok) hits.push(spoken[i].start);
  }
  return hits;
}

// ───────── the video ─────────

const attrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    if (m.index === 0) continue;
    const v = m[2] ?? m[3] ?? m[4] ?? "";
    out[m[1].toLowerCase()] = v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  return out;
};

/** What the checks need to know about a video: its folder, frame, length, HyperFrames version, brief, brand,
    approved words and plan, sound, and spoken words in the film's time. */
export function readFilm(root, slug) {
  const dir = join(root, "videos", slug);
  const index = join(dir, "index.html");
  if (!existsSync(index)) throw new Error(`videos/${slug} has no index.html yet: the checks run on a built video.`);
  const html = readFileSync(index, "utf8");
  const rootTag = /<[a-z]+[^>]*\bdata-composition-id\s*=[^>]*>/i.exec(html)?.[0] || "";
  const r = attrs(rootTag);
  const width = Number(r["data-width"]) || 1920;
  const height = Number(r["data-height"]) || 1080;
  const duration = Number(r["data-duration"]) || 0;
  if (!(duration > 0)) throw new Error(`videos/${slug}/index.html's root has no data-duration, so there's no film to check yet.`);
  const pkg = readJSON(join(dir, "package.json"));
  const version = /hyperframes@([0-9][\w.-]*)/.exec(pkg?.scripts?.check || pkg?.scripts?.render || "")?.[1] || HYPERFRAMES_VERSION;
  const brief = readBrief(root, slug);
  const brand = brief.brand ? readBrand(root, brief.brand) : null;
  const sbv = storyboardVersions(root, slug).at(-1);
  const storyboard = sbv ? readStoryboard(root, slug, sbv) : null;
  const scv = scriptVersions(root, slug).at(-1);
  const script = scv ? readScript(root, slug, scv) : null;
  const media = [...html.matchAll(/<(audio|video)\b[^>]*>/gi)].map((m) => ({ tag: m[1].toLowerCase(), attrs: attrs(m[0]) }));
  return { root, slug, dir, html, width, height, duration, version, brief, brand, storyboard, script, media, words: spokenWords(dir, brief, script?.script, media) };
}

/** Where a film's spoken words are: a footage video's cut (docs/words.json, in the film's time), or the voiceover's
    verified transcript, with `offset`, how far to move it to where its <audio> plays. { file, offset } or null. */
export function speechFile(dir, brief, script, media) {
  if (brief.type === "footage" || script?.mode === "footage") {
    const cut = join(dir, "docs", "words.json");
    if (existsSync(cut)) return { file: cut, offset: 0 };
  }
  const voice = media.find((m) => m.tag === "audio" && (m.attrs["data-timeline-role"] === "voiceover" || /\b(vo|voice|voiceover|narration)\b/i.test(`${m.attrs.id || ""} ${m.attrs.src || ""}`)));
  if (!voice) return null;
  const own = voice.attrs.src ? join(dir, voice.attrs.src.replace(/\.[a-z0-9]+$/i, ".transcript.json")) : "";
  const file = [join(dir, "inputs", "transcript_verified.json"), join(dir, "inputs", "transcript.json"), own].find((f) => f && existsSync(f));
  return file ? { file, offset: (Number(voice.attrs["data-start"]) || 0) - (Number(voice.attrs["data-media-start"]) || 0) } : null;
}

/** The spoken words in the film's time (speechFile's, moved by its offset). [] with no speech. */
function spokenWords(dir, brief, script, media) {
  const list = (j) => (Array.isArray(j) ? j : Array.isArray(j?.words) ? j.words : []).filter((w) => w && Number.isFinite(+w.start) && w.text);
  const speech = speechFile(dir, brief, script, media);
  if (!speech) return [];
  return list(readJSON(speech.file)).map((w) => ({ text: w.text, start: +w.start + speech.offset, end: (+w.end || +w.start) + speech.offset }));
}

/** The words the user approved for the screen, by scene: the storyboard's on-screen words (each scene's `onScreen`,
    split at " · "), or without a storyboard the script's bold words. [{ scene, start, end, phrases }] */
function approvedWords(film) {
  const sb = film.storyboard?.storyboard;
  const split = (s) =>
    String(s || "")
      .split(/\s+·\s+|\n/)
      .map((x) => x.replace(/\*\*/g, "").trim())
      .filter((x) => x && !/^none\.?$/i.test(x));
  if (sb?.scenes?.length) return sb.scenes.map((s) => ({ scene: s.id, title: s.title, start: +s.start || 0, end: +s.end || film.duration, phrases: split(s.onScreen) }));
  const rows = film.script?.script?.rows || [];
  const bold = rows.flatMap((r) => [...`${r.voiceover || ""} ${r.action || ""} ${r.onScreen || ""}`.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]));
  return bold.length ? [{ scene: null, start: 0, end: film.duration, phrases: [...new Set(bold)] }] : [];
}

/** A scene plan's moves, each with the time it starts (`0.4–3.4 s …` or `3.86 s …`), several to a line when the
    plan writes them so (`18.10 s No electrician. ticks on; 19.30 s No tools.`). */
function planMoves(scene) {
  const moves = [];
  for (const line of String(scene?.plan?.moves || "").split("\n")) {
    const times = [...line.matchAll(/(\d+(?:\.\d+)?)\s*(?:[–-]\s*(\d+(?:\.\d+)?)\s*)?s\b/g)];
    times.forEach((m, i) => moves.push({ at: Number(m[1]), to: m[2] ? Number(m[2]) : null, text: line.slice(m.index + m[0].length, times[i + 1]?.index ?? line.length) }));
  }
  return moves;
}

/** The times HyperFrames' check samples, beside its own: every storyboard frame (each scene's key moments) and every
    change of scene. */
function planTimes(film) {
  const scenes = film.storyboard?.storyboard?.scenes || [];
  const times = new Set();
  const add = (t) => Number.isFinite(t) && t >= 0 && t < film.duration - 0.05 && times.add(round(t, 3));
  for (const s of scenes) {
    for (const f of s.frames || []) add(Number(f.time));
    add(Number(s.end));
  }
  return [...times].sort((a, b) => a - b).slice(0, 48);
}

// ───────── HyperFrames' check ─────────

/** `HF check --json` with the video's settings; a version that doesn't know one of them (a video made on an older
    HyperFrames) is asked again plainly. */
async function runHyperFrames(film, { at, captionZone, samples }) {
  const args = ["--at-transitions", "--snapshots", "--samples", String(samples)];
  if (at.length) args.push("--at", at.join(","));
  if (captionZone) args.push("--caption-zone", captionZone);
  try {
    return await hyperFramesCheck(film, args);
  } catch {
    return { ...(await hyperFramesCheck(film, [])), plain: true };
  }
}

function hyperFramesCheck(film, extra) {
  const args = ["--yes", `hyperframes@${film.version}`, "check", "--json", ...extra];
  return new Promise((done, fail) => {
    const child = spawn("npx", args, { cwd: film.dir, env: { ...process.env, ...HYPERFRAMES_ENV }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", fail);
    child.on("close", () => {
      const start = out.indexOf("{");
      try {
        done(JSON.parse(out.slice(start, out.lastIndexOf("}") + 1)));
      } catch {
        fail(new Error(`HyperFrames' check gave no report: ${(err.trim().split("\n").filter((l) => !/^\[/.test(l)).pop() || out.trim().slice(0, 300) || "no output").slice(0, 400)}`));
      }
    });
  });
}

const PASSES = { lint: "lint", runtime: "runtime", layout: "layout", motion: "motion", contrast: "contrast", craft: "craft", audio: "audio" };

/** HyperFrames' findings as the report's: its errors are must fix, its warnings should fix, and what it saw at one
    sample only (an entrance or exit in flight) or lint's advice are notes, grouped by kind. */
function fromHyperFrames(hf, film, { ours }) {
  const out = [];
  const file = (f) => {
    const s = f.sourceFile || "";
    return s.startsWith("/") ? relative(film.dir, s) : s;
  };
  // HyperFrames' messages name its own skill's references, which Video Studio's guides replace
  const words = (s) =>
    String(s || "")
      .replace(/;?\s*see references\/[\w./-]+/g, "")
      .replace(/\s+\(see [^)]*references[^)]*\)/g, "")
      .trim();
  const grouped = {};
  for (const [key, label] of Object.entries(PASSES)) {
    for (const f of hf[key]?.findings || []) {
      const theirs = key === "motion" && !ours;
      const level = f.severity === "error" ? (key === "motion" && ours ? "should" : "must") : f.severity === "warning" ? (key === "lint" ? "note" : "should") : "note";
      if (level === "note" || (key === "lint" && f.severity === "warning")) {
        (grouped[`${key} ${f.code}`] ||= { key, label, code: f.code, list: [] }).list.push(f);
        continue;
      }
      out.push({
        level,
        time: Number.isFinite(f.time) ? round(f.time) : Number.isFinite(f.firstSeen) ? round(f.firstSeen) : null,
        until: Number.isFinite(f.until) ? round(f.until) : Number.isFinite(f.lastSeen) && f.lastSeen > (f.firstSeen ?? f.time ?? 0) + 0.2 ? round(f.lastSeen) : null,
        element: f.selector && f.selector !== "[data-composition-id]" ? f.selector : "",
        text: f.text || "",
        file: file(f),
        what: f.text && !String(f.message).includes(String(f.text).trim()) ? `${quote(f.text, 40)}: ${words(f.message)}` : words(f.message),
        fix:
          key === "motion"
            ? theirs
              ? words(f.fixHint)
              : `The approved plan has it by then (storyboard, The plan): make it land on time, or keep the change (--keep, with why), so the review page says so. ${words(f.fixHint)}`.trim()
            : words(f.fixHint) || (f.suggestedColor ? `Try ${f.suggestedColor}, in the brand's colours.` : ""),
        owner: "build",
        source: `HyperFrames: ${label}`,
        code: f.code,
      });
    }
  }
  for (const g of Object.values(grouped)) {
    const times = [...new Set(g.list.map((f) => f.time ?? f.firstSeen).filter(Number.isFinite).map((t) => round(t, 1)))].slice(0, 6);
    const what = [...new Set(g.list.map((f) => (f.text ? quote(f.text, 30) : f.selector && f.selector !== "[data-composition-id]" ? f.selector : "")).filter(Boolean))];
    out.push({
      level: "note",
      time: times[0] ?? null,
      element: what.slice(0, 5).join(", ") + (what.length > 5 ? ` and ${what.length - 5} more` : ""),
      file: [...new Set(g.list.map(file).filter(Boolean))].slice(0, 3).join(", "),
      what: `${g.list.length > 1 ? `${g.list.length}× ` : ""}${words(g.list[0].message)}${times.length ? ` (at ${times.map(secs).join(", ")})` : ""}${g.key === "layout" ? ": seen at one sample only, an entrance or exit in flight." : ""}`,
      fix: words(g.list[0].fixHint),
      owner: "build",
      source: `HyperFrames: ${g.label}`,
      code: g.code,
    });
  }
  if (hf.browserSkipped || (hf.lint?.errorCount && !hf.layout?.samples?.length))
    out.push({ level: "must", time: null, element: "", what: "HyperFrames' browser passes didn't run (a lint error stops them), so layout, contrast and craft weren't checked.", fix: "Clear the lint errors, then check again.", owner: "build", source: "HyperFrames: lint", code: "browser_skipped" });
  return out;
}

// ───────── the plan, as HyperFrames' motion assertions ─────────

/** Where `want` (words) starts in `have`, or -1; and whether `have` starts with it. */
const indexOf = (have, want) => {
  for (let i = 0; i + want.length <= have.length; i++) if (want.every((w, j) => have[i + j] === w)) return i;
  return -1;
};
const begins = (have, want) => want.every((w, i) => have[i] === w);

/** Whether a block's words are read straight after another's: beside it on the same line, or on the next line just
    below it in the same column. */
function follows(a, b) {
  const [ax0, ay0, ax1, ay1] = a.box;
  const [bx0, by0, bx1, by1] = b.box;
  if (Math.min(ay1, by1) - Math.max(ay0, by0) >= 0.5 * Math.min(ay1 - ay0, by1 - by0)) return bx0 >= ax1 - 0.25 * a.px;
  return by0 > (ay0 + ay1) / 2 && by0 - ay1 <= 0.75 * Math.max(a.px, b.px) && Math.min(ax1, bx1) > Math.max(ax0, bx0);
}

/** Where a phrase (words) is on screen among a scene's blocks, with four more words around it at most: in one block, or
    split across blocks read in order that show together (a row's cells, a headline's lines). Each place is the
    smallest element HyperFrames can pick out that holds the phrase, or its first words when it's split: a count's
    figure rather than its row, which can show before it. [{ run, id, texture }] */
function placesOf(runs, want, meta) {
  const holder = (r, part) =>
    [...r.els, { id: r.id, text: r.text, depth: 0 }]
      .map((e) => ({ ...e, words: written(e.text) }))
      .filter((e) => meta[e.id]?.unique && indexOf(e.words, part) >= 0)
      .sort((a, b) => a.words.length - b.words.length || b.depth - a.depth)[0];
  const places = [];
  for (const r of runs) {
    const have = written(r.text);
    const texture = r.meta.ignore ? 1 : 0;
    if (indexOf(have, want) >= 0) {
      const el = holder(r, want);
      if (el && el.words.length <= want.length + 4) places.push({ run: r, id: el.id, texture });
      continue;
    }
    // the block ends with the phrase's first words, and the blocks read after it, on screen with it, go on with the
    // rest: each one wholly inside the phrase, the last perhaps with more words after it
    for (let n = Math.min(have.length, want.length - 1); n >= 1; n--) {
      if (!begins(have.slice(-n), want.slice(0, n))) continue;
      let rest = want.slice(n);
      let extra = have.length - n;
      const used = new Set([r]);
      for (let cur = r; rest.length; ) {
        const next = runs.find((b) => {
          if (used.has(b) || b.first > cur.last || b.last < cur.first || !follows(cur, b)) return false;
          const w = written(b.text);
          return w.length > 0 && (begins(rest, w) || begins(w, rest));
        });
        if (!next) break;
        const w = written(next.text);
        extra += Math.max(0, w.length - rest.length);
        rest = rest.slice(w.length);
        used.add(next);
        cur = next;
      }
      if (rest.length) continue;
      const el = extra <= 4 && holder(r, want.slice(0, n));
      if (el) places.push({ run: r, id: el.id, texture });
      break;
    }
  }
  return places;
}

/** index.motion.json from the scene plans: each planned word on screen appears by its planned time (with
    `plannedLandWithin` for its entrance), and in each scene in the planned order. A move names a word as it's typed,
    whichever quotes and apostrophes it has. Written only when the file is Video Studio's own (or there's none);
    `tested` and `untested` say what the plan's words came to. */
function planAssertions(film, runs, meta, rules) {
  const scenes = film.storyboard?.storyboard?.scenes || [];
  const brandName = written(film.brand?.name || "").join(" ");
  const assertions = [];
  const tested = [];
  const untested = [];
  const names = (text, phrase) => new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u").test(text);
  for (const s of scenes) {
    const moves = planMoves(s);
    const start = +s.start || 0;
    const end = +s.end || film.duration;
    const here = runs.filter((r) => r.first <= end + 0.5 && r.last >= start - 0.5);
    const mapped = [];
    for (const phrase of approvedWords({ ...film, storyboard: { storyboard: { scenes: [s] } } })[0]?.phrases || []) {
      const want = written(phrase);
      if (!want.length || want.join(" ") === brandName) continue;
      const typed = plain(phrase).replace(/[.!?,]+$/, "");
      const move = moves.find((m) => names(plain(m.text), typed));
      const target = move ? move.at : start;
      // texture (an interface or a document shown whole) only when the words are nowhere else
      const found = placesOf(here, want, meta).sort((a, b) => a.texture - b.texture || Math.abs(a.run.first - target) - Math.abs(b.run.first - target))[0];
      if (!move || !found) {
        untested.push({ scene: s.id, phrase, why: !found ? "no element on screen shows it" : "the plan gives it no time" });
        continue;
      }
      const selector = meta[found.id].selector;
      const by = round(Math.min(move.at + rules.check.plannedLandWithin, film.duration - 0.05));
      assertions.push({ kind: "appearsBy", selector, bySec: by });
      tested.push({ scene: s.id, phrase, at: move.at, selector });
      mapped.push({ at: move.at, selector });
    }
    mapped.sort((a, b) => a.at - b.at);
    for (let i = 1; i < mapped.length; i++)
      if (mapped[i].at - mapped[i - 1].at >= 0.3 && mapped[i].selector !== mapped[i - 1].selector) assertions.push({ kind: "before", a: mapped[i - 1].selector, b: mapped[i].selector });
  }
  return { assertions, tested, untested };
}

function writeMotion(film, plan) {
  const file = join(film.dir, "index.motion.json");
  const existing = readJSON(file);
  if (existing && existing.generatedBy !== MARK) return { written: false, own: true };
  if (!plan.assertions.length) {
    if (existing) rmSync(file, { force: true });
    return { written: false };
  }
  writeFileSync(file, `${JSON.stringify({ duration: film.duration, generatedBy: MARK, assertions: plan.assertions }, null, 2)}\n`);
  return { written: true };
}

// ───────── Video Studio's own pass on the words ─────────

/** Each block's time on screen, from the samples: when it first shows, when its words are all in, when it last
    shows, its words (as they end up: a count-up's last figure, a typewriter's whole line), and its size, colours, fonts
    and box once settled. A block whose words change into other words starts a new run. */
function runsOf(samples, meta, step) {
  const by = new Map();
  for (const s of samples) for (const b of s.blocks) (by.get(b.id) || by.set(b.id, []).get(b.id)).push({ t: s.t, b });
  const shape = (t) => t.replace(/\d/g, "#").replace(/\s+/g, "");
  const sameLine = (a, b) => {
    const [x, y] = [shape(a), shape(b)];
    return x === y || x.startsWith(y) || y.startsWith(x) || x.replace(/#+/g, "#") === y.replace(/#+/g, "#");
  };
  const runs = [];
  for (const [id, seen] of by) {
    let cur = null;
    const close = () => {
      if (!cur) return;
      // its words are in once the line has its final shape: a typewriter's whole line, a count-up from its first figure
      const final = cur.seen.at(-1).b.text;
      const complete = cur.seen.find((x) => shape(x.b.text) === shape(final))?.t ?? cur.first;
      const settled = cur.seen.filter((x) => x.t >= complete);
      const mid = settled[Math.floor(settled.length / 2)] || cur.seen.at(-1);
      const sizes = settled.map((x) => x.b.px).sort((a, b) => a - b);
      const all = [...new Set(cur.seen.flatMap((x) => tokens(x.b.text)))];
      // the elements inside it that hold its words, each with its words as they end up
      const els = new Map();
      for (const x of cur.seen) for (const [el, text, depth] of x.b.els || []) els.set(el, { id: el, text, depth });
      runs.push({ id, first: cur.first, last: cur.last, complete, text: final, tokens: tokens(final), every: all, words: wordCount(final), px: sizes[Math.floor(sizes.length / 2)], box: mid.b.box, colours: mid.b.colours, families: mid.b.families, els: [...els.values()], seen: cur.seen.length, meta: meta[id] || {} });
      cur = null;
    };
    for (const x of seen) {
      if (cur && x.t - cur.last <= step * 1.5 && sameLine(cur.seen.at(-1).b.text, x.b.text)) {
        cur.last = x.t;
        cur.seen.push(x);
      } else {
        close();
        cur = { first: x.t, last: x.t, seen: [x] };
      }
    }
    close();
  }
  return runs.sort((a, b) => a.first - b.first);
}

const isItem = (m, re) => re.test(m.comp || "");
const reading = (r) => !r.meta.ignore && !r.meta.caption && !isItem(r.meta, /^i\d\d/) && r.words > 0;

/** Colours as Lab, for how far apart two are (ΔE 1976). */
function lab(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}
const rgbOf = (c) => {
  const s = String(c || "").trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(s);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/** The brand's colours (the kit's, its grounds' and those the library makes from them) and a test for a colour: one
    of them, or a mix of two (a tint, a shade, a step lighter). */
function palette(brand) {
  const found = new Set();
  const take = (v) => {
    for (const m of String(v || "").matchAll(/#[0-9a-f]{3,8}\b/gi)) found.add(m[0]);
  };
  for (const c of brand?.colours || []) take(c.hex);
  for (const b of brand?.backgrounds || []) take(`${b.hex || ""} ${b.gradient || ""} ${b.text || ""}`);
  for (const v of Object.values(brand?.style || {})) take(v);
  for (const v of Object.values(brandStyle(brand).vars || {})) take(v);
  const labs = [...found].map(rgbOf).filter(Boolean).map((rgb) => ({ rgb, lab: lab(rgb) }));
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const toSegment = (p, a, b) => {
    const ab = a.map((v, i) => b[i] - v);
    const len = ab.reduce((s, v) => s + v * v, 0) || 1;
    const t = Math.max(0, Math.min(1, ab.reduce((s, v, i) => s + v * (p[i] - a[i]), 0) / len));
    return dist(p, a.map((v, i) => v + t * ab[i]));
  };
  return {
    colours: labs.map((x) => hex(x.rgb)),
    nearest(rgb) {
      const p = lab(rgb);
      return labs.reduce((best, x) => (dist(p, x.lab) < best.d ? { d: dist(p, x.lab), hex: hex(x.rgb) } : best), { d: Infinity, hex: "" });
    },
    fits(rgb, tolerance = 6) {
      if (!labs.length) return true;
      const p = lab(rgb);
      for (const a of labs) if (dist(p, a.lab) <= tolerance) return true;
      for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (toSegment(p, labs[i].lab, labs[j].lab) <= tolerance) return true;
      return false;
    },
  };
}

/** The fonts a library item names for itself (D72's handwriting), from its file in the project. */
function itemFonts(dir, file) {
  try {
    const css = readFileSync(join(dir, file), "utf8");
    return [...css.matchAll(/font-family\s*:\s*([^;}{]+)/g)].flatMap((m) => (/var\(/.test(m[1]) ? [] : [m[1].split(",")[0].trim().replace(/^["']|["']$/g, "")]));
  } catch {
    return [];
  }
}

function ourFindings({ film, rules, runs, samples, step, hf, refined }) {
  const out = [];
  const row = frameRow(rules, film.width, film.height);
  const T = row.type;
  const k = row.scale;
  const R = rules.reading;
  const W = rules.words;
  // what HyperFrames' craft pass already said about a line (its words in ours, or ours in its)
  const hfTexts = (code) => {
    const texts = (hf.craft?.findings || []).filter((f) => f.code === code).flatMap((f) => [f.text, ...(f.elements || []).map((e) => e.text)]).filter(Boolean).map((t) => t.replace(/\s+/g, " ").trim());
    return { has: (text) => texts.some((t) => text.includes(t) || t.includes(text)) };
  };
  const tooSmallHF = hfTexts("text_below_floor");
  const unreadHF = hfTexts("line_unread");
  const atEnd = (r) => r.last >= film.duration - step * 1.5;
  const where = (r) => ({ element: r.meta.own || r.meta.selector || "", text: r.text, file: r.meta.file || "index.html" });
  const owner = "build";
  const add = (f) => out.push({ source: "Video Studio: the words", owner, ...f });
  const need = (words) => Math.max(R.holdMin, R.findSeconds + R.perWord * words + R.holdExtra);
  const held = (r) => r.last - r.complete + step;

  // type sizes for the frame: HyperFrames flags words under its own floor; this flags the rest under ours, one finding
  // for each library item or element
  const least = T.smallest * k;
  const small = new Map();
  for (const r of runs) {
    if (r.meta.ignore || r.words < 1 || isItem(r.meta, /^i\d\d/) || held(r) < R.heldAtLeast || !(r.px < least) || tooSmallHF.has(r.text)) continue;
    const key = r.meta.comp || r.meta.selector || r.text;
    (small.get(key) || small.set(key, []).get(key)).push(r);
  }
  for (const [key, list] of small) {
    const r = list[0];
    const sizes = [...new Set(list.map((x) => Math.round(x.px)))].sort((a, b) => a - b);
    const px = sizes.length > 1 ? `${sizes[0]}–${sizes.at(-1)} px` : `${round(r.px, 1)} px`;
    const texts = [...new Set(list.map((x) => x.text))];
    add({
      level: "should",
      time: round(Math.min(...list.map((x) => x.complete))),
      ...where(r),
      element: r.meta.comp ? `#${r.meta.comp}-slot` : where(r).element,
      what: `${texts.length > 1 ? `${plural(texts.length, "line")} ${r.meta.comp ? `of ${r.meta.comp.split("-")[0].toUpperCase()} ` : ""}set at ${px}: ${texts.slice(0, 4).map((t) => quote(t, 24)).join(", ")}${texts.length > 4 ? "…" : ""}` : `${quote(r.text)} is set at ${px}`}; the smallest text at ${row.key.replace("x", ":")} is ${round(least)} px.`,
      fix: `Set reading text at ${round(least)} px or more (numbers.md, Type sizes); a library card takes its Size. Texture rather than reading takes data-layout-ignore.`,
      code: "type_below_ours",
    });
  }

  // the reading hold: a line holds its reading time plus a little; something to take in (a widget, a chart) longer
  const spoken = film.words.flatMap((w) => tokens(w.text).map((tok) => ({ tok, start: w.start, end: w.end })));
  const said = (r, from, to) => {
    const want = content(r.tokens).length ? r.tokens : [];
    if (!want.length) return [];
    return spokenAt(spoken, want.slice(0, Math.min(want.length, 4))).filter((t) => t >= from && t <= to);
  };
  for (const r of runs) {
    if (!reading(r) || r.text.replace(/\s/g, "").length <= 2 || isItem(r.meta, /^[wd]\d\d/) || atEnd(r) || unreadHF.has(r.text)) continue;
    const h = held(r);
    const n = need(r.words);
    if (h + step >= n) continue;
    // words that appear as they're spoken can follow the voice
    if (said(r, r.first - 0.6, r.last + 0.3).length) continue;
    add({
      level: "should",
      time: round(r.complete),
      until: round(r.last + step),
      ...where(r),
      what: `${quote(r.text)} holds ${secs(h)} once its words are in: ${plural(r.words, "word")} need ${secs(n)} (${R.findSeconds} s to find it, ${R.perWord} s a word, ${R.holdExtra} s more).`,
      fix: "Hold it longer, or cut words; a quick-fire run that's meant to be glanced at can go faster (numbers.md, Reading).",
      code: "hold_under_ours",
    });
  }
  const items = new Map();
  for (const r of runs) if (reading(r) && isItem(r.meta, /^[wd]\d\d/)) (items.get(r.meta.comp) || items.set(r.meta.comp, []).get(r.meta.comp)).push(r);
  for (const [comp, list] of items) {
    if (list.some(atEnd)) continue;
    const read = list.filter((r) => r.px >= least);
    if (!read.length) continue;
    const inAt = Math.max(...read.map((r) => r.complete));
    const out_ = Math.max(...list.map((r) => r.last + step));
    const words = read.reduce((n, r) => n + r.words, 0);
    // words the voice says while it shows can follow the voice: then 3 s once they're in is enough
    const toks = [...new Set(read.flatMap((r) => content(r.tokens)))];
    const heard = new Set(spoken.filter((x) => x.start >= Math.min(...list.map((r) => r.first)) - 0.6 && x.start <= out_).map((x) => x.tok));
    const followed = toks.length && toks.filter((t) => heard.has(t)).length / toks.length >= 0.5;
    const needed = followed ? R.takeInMin : Math.max(R.takeInMin, R.takeInTimes * (R.findSeconds + R.perWord * words));
    if (out_ - inAt >= needed - step) continue;
    const code = comp.split("-")[0].toUpperCase();
    const main = read.reduce((a, r) => (r.px > a.px ? r : a));
    add({
      level: "should",
      time: round(inAt),
      until: round(out_),
      element: `#${comp}-slot`,
      text: main.text,
      file: main.meta.file,
      what: `${code} (${quote(main.text, 32)}) has its words in at ${secs(inAt)} and leaves at ${secs(out_)}: ${secs(out_ - inAt)}. Something to take in holds ${followed ? `${R.takeInMin} s` : `${R.takeInMin} s or twice its reading time, here ${secs(needed)} for ${plural(words, "word")}`}.`,
      fix: "Hold it longer, start it sooner, or bring its words in faster (build skill, Library items, step 5).",
      code: "take_in_under_ours",
    });
  }

  // words at once (captions, interfaces and texture aside)
  let over = null;
  const overs = [];
  for (const s of samples) {
    const shown = s.blocks.filter((b) => {
      const m = samples.meta?.[b.id] || {};
      return !m.ignore && !m.caption && !isItem(m, /^i\d\d/) && b.px >= least;
    });
    const n = shown.reduce((sum, b) => sum + wordCount(b.text), 0);
    if (n > W.atOnce) {
      if (!over) over = { start: s.t, end: s.t, max: n, texts: shown.map((b) => b.text) };
      else {
        over.end = s.t;
        if (n > over.max) Object.assign(over, { max: n, texts: shown.map((b) => b.text) });
      }
    } else if (over) {
      overs.push(over);
      over = null;
    }
  }
  if (over) overs.push(over);
  for (const o of overs.filter((x) => x.end - x.start + step >= W.atOnceFor))
    add({
      level: "should",
      time: round(o.start),
      until: round(o.end + step),
      element: "",
      text: o.texts.join(" · "),
      what: `${o.max} words on screen at once at ${secs(o.start)}–${secs(o.end + step)} (${W.atOnce} at most): ${o.texts.slice(0, 4).map((t) => quote(t, 28)).join(", ")}${o.texts.length > 4 ? "…" : ""}.`,
      fix: "Put fewer words up at a time and let the voice carry the rest, or show them one after another (numbers.md, Words on screen).",
      code: "words_at_once",
    });

  // headlines: a few words, big
  for (const r of runs)
    if (reading(r) && r.px >= T.headline * k && r.words > W.headline[1] && held(r) >= R.heldAtLeast)
      add({ level: "should", time: round(r.complete), ...where(r), what: `${quote(r.text)} is a headline of ${r.words} words at ${round(r.px)} px (${W.headline[0]}–${W.headline[1]}).`, fix: "Cut it to a few key words and let the voice say the rest (numbers.md, Words on screen).", code: "headline_long" });

  // safe areas: the margins, and with burnt-in captions their band (a 9:16 frame's band is HyperFrames' --caption-zone)
  const S = row.safe;
  const captions = runs.some((r) => r.meta.caption);
  const vertical = row.key === "9x16";
  const lim = { left: S.left * film.width, top: S.top * film.height, right: film.width * (1 - S.right), bottom: film.height * (1 - S.bottom) };
  const band = film.height * (1 - S.captions) - rules.safe.captionsGap;
  const outside = new Map();
  for (const r of runs) {
    if (r.meta.ignore || r.meta.bleed || isItem(r.meta, /^i\d\d/) || held(r) < R.heldAtLeast) continue;
    const [x0, y0, x1, y1] = r.box;
    const sides = [];
    if (x0 < lim.left - 2) sides.push(`${Math.round(lim.left - x0)} px into the left margin`);
    if (y0 < lim.top - 2) sides.push(`${Math.round(lim.top - y0)} px into the top margin`);
    if (x1 > lim.right + 2) sides.push(`${Math.round(x1 - lim.right)} px into the right margin${vertical ? " (the apps' buttons)" : ""}`);
    if (!vertical && y1 > lim.bottom + 2) sides.push(`${Math.round(y1 - lim.bottom)} px into the bottom margin`);
    if (!vertical && captions && !r.meta.caption && y1 > band + 2 && !(y1 > lim.bottom + 2)) sides.push(`${Math.round(y1 - band)} px into the captions' band`);
    if (!sides.length) continue;
    const key = r.meta.selector || r.text;
    if (outside.has(key)) continue;
    outside.set(key, true);
    add({
      level: "should",
      time: round(r.complete),
      ...where(r),
      what: `${quote(r.text)} sits ${sides.join(" and ")} at ${row.key.replace("x", ":")}.`,
      fix: `Keep words inside the safe area: ${Math.round(S.top * 100)}% top, ${Math.round(S.right * 100)}% right, ${Math.round(S.bottom * 100)}% bottom, ${Math.round(S.left * 100)}% left${captions && !vertical ? ", and above the captions' band" : ""} (numbers.md, Safe areas).`,
      code: "safe_area",
    });
  }

  // the brand: fonts and colours from the kit
  if (film.brand) {
    const kit = (film.brand.fonts || []).map((f) => f.family).filter(Boolean);
    const offFonts = new Map();
    const pal = palette(film.brand);
    const offColours = new Map();
    for (const r of runs) {
      if (r.meta.ignore) continue;
      const own = r.meta.comp ? itemFonts(film.dir, r.meta.file) : [];
      const total = Object.values(r.families || {}).reduce((a, b) => a + b, 0) || 1;
      for (const [family, n] of Object.entries(r.families || {})) {
        if (n / total < 0.2 || kit.includes(family) || own.includes(family)) continue;
        (offFonts.get(family) || offFonts.set(family, []).get(family)).push(r);
      }
      const chars = Object.values(r.colours || {}).reduce((a, b) => a + b, 0) || 1;
      for (const [colour, n] of Object.entries(r.colours || {})) {
        const rgb = rgbOf(colour);
        if (!rgb || n / chars < 0.15 || pal.fits(rgb)) continue;
        (offColours.get(hex(rgb)) || offColours.set(hex(rgb), []).get(hex(rgb))).push(r);
      }
    }
    for (const [family, list] of offFonts)
      out.push({
        level: "should",
        time: round(list[0].complete),
        ...where(list[0]),
        what: `${plural(list.length, "line")} set in ${family}, which isn't one of the brand's fonts (${kit.join(", ")}): ${list.slice(0, 3).map((r) => quote(r.text, 28)).join(", ")}.`,
        fix: "Use the kit's font for its role (the brand's variables); if the brand needs another, add it to the kit (brand-kit skill).",
        owner: "build",
        source: "Video Studio: the brand",
        code: "font_off_brand",
      });
    for (const [colour, list] of offColours) {
      const near = pal.nearest(rgbOf(colour));
      out.push({
        level: "should",
        time: round(list[0].complete),
        ...where(list[0]),
        what: `Text in ${colour}, which isn't one of the brand's colours or a mix of two: ${list.slice(0, 3).map((r) => quote(r.text, 28)).join(", ")}${list.length > 3 ? ` and ${list.length - 3} more` : ""}.`,
        fix: `Use the kit's colours (the nearest is ${near.hex}) through the brand's variables, never retyped by eye.`,
        owner: "build",
        source: "Video Studio: the brand",
        code: "colour_off_brand",
      });
    }
    // grounds: notes, since a picture's own colours are its own
    const grounds = new Map();
    for (const s of samples)
      for (const f of s.fills || [])
        for (const c of f.colours) {
          const rgb = rgbOf(c);
          if (rgb && !pal.fits(rgb, 8) && !grounds.has(hex(rgb))) grounds.set(hex(rgb), { t: s.t, id: f.id });
        }
    if (grounds.size)
      out.push({
        level: "note",
        time: round([...grounds.values()][0].t),
        element: [...new Set([...grounds.values()].map((g) => samples.meta?.[g.id]?.selector).filter(Boolean))].slice(0, 4).join(", "),
        what: `Large grounds in colours outside the kit: ${[...grounds.entries()].slice(0, 6).map(([c, g]) => `${c} (${secs(g.t)})`).join(", ")}.`,
        fix: "Fine for a picture's own colours (footage, an illustration's shading); a designed ground uses the kit's colours or its backgrounds.",
        owner: "build",
        source: "Video Studio: the brand",
        code: "ground_off_brand",
      });
  }

  // the words on screen against the approved words and the voice; texture's words are on screen too, only not read
  const approved = approvedWords(film);
  const brandName = tokens(film.brand?.name || "").join(" ");
  const within = (a, b) => runs.filter((r) => r.last >= a && r.first <= b);
  for (const s of approved) {
    const there = within(s.start - 0.5, s.end + 0.5);
    const have = new Set(there.flatMap((r) => r.every));
    const screen = there.some((r) => isItem(r.meta, /^i\d\d/));
    for (const p of s.phrases) {
      const want = tokens(p);
      if (!want.length || want.join(" ") === brandName || want.every((t) => have.has(t))) continue;
      add({
        level: screen ? "note" : "should",
        time: round(s.start),
        until: round(s.end),
        element: "",
        text: p,
        what: `${quote(p)}${s.scene ? ` (${s.scene}, in the approved storyboard)` : " (in the approved script)"} isn't on screen in ${secs(s.start)}–${secs(s.end)}${screen ? ", unless it's in the interface's picture" : ""}.`,
        fix: "Put the approved words on screen as approved. If they're in a picture (a logo, a screenshot), there's nothing to do.",
        code: "approved_words_missing",
      });
    }
  }
  if (approved.length) {
    const ok = new Set([...approved.flatMap((s) => s.phrases.flatMap(tokens)), ...tokens(film.brand?.name || ""), "example", "figures", "source"]);
    const extra = runs.filter((r) => reading(r) && r.tokens.some((t) => !ok.has(t) && !/^\d/.test(t)) && held(r) >= R.heldAtLeast);
    const seen = new Set();
    const list = extra.filter((r) => !seen.has(r.text) && seen.add(r.text));
    if (list.length)
      add({
        level: "note",
        time: round(list[0].first),
        element: "",
        text: list.map((r) => r.text).join(" · "),
        what: `On screen but not in the approved words: ${list.slice(0, 10).map((r) => `${quote(r.text, 28)} (${secs(r.first)})`).join(", ")}${list.length > 10 ? ` and ${list.length - 10} more` : ""}.`,
        fix: "Labels and figures the build added are fine; a change to approved words is said on the review page (build skill).",
        owner: "storyboard",
        code: "words_not_approved",
      });
  }
  for (const late of refined)
    add({
      level: "should",
      time: round(late.at),
      ...where(late.run),
      what: `${quote(late.run.text)} appears ${round(late.late, 2)} s after it's said (${secs(late.said)}).`,
      fix: `Land it on the word: from ${rules.speech.keyWordEarly} s before it's said to ${rules.speech.keyWordLate} s after (numbers.md, Speech), from the verified word times.`,
      code: "key_word_late",
    });

  // the ask at the end holds
  const last = runs.filter((r) => reading(r) && atEnd(r));
  if (last.length) {
    const inAt = Math.max(...last.map((r) => r.complete));
    if (film.duration - inAt < rules.hook.askHolds - step / 2)
      add({ level: "should", time: round(inAt), ...where(last[0]), what: `The last words are all in at ${secs(inAt)}, ${secs(film.duration - inAt)} before the end: the ask holds ${rules.hook.askHolds} s at least.`, fix: "Bring the end card in sooner, or hold the last frame longer.", code: "ask_short" });
  }
  return out;
}

/** The blocks to time against the voice: each one that shows words the voice says close by, with the moment it
    first shows found to a hundredth of a second. */
async function lateWords(film, runs, view, rules, step) {
  if (!film.words.length) return [];
  const spoken = film.words.flatMap((w) => tokens(w.text).map((tok) => ({ tok, start: w.start, end: w.end })));
  const late = [];
  for (const r of runs) {
    if (r.meta.ignore || isItem(r.meta, /^i\d\d/) || !content(r.tokens).length || r.text.replace(/\s/g, "").length <= 2 || r.first < step / 2) continue;
    const want = r.tokens.slice(0, Math.min(r.tokens.length, 4));
    if (r.tokens.length > 4 && content(want).length < 2) continue;
    const near = spokenAt(spoken, want).filter((t) => t >= r.first - 3 && t <= r.first + 0.5);
    if (!near.length) continue;
    const said = near.reduce((a, t) => (Math.abs(t - r.first) < Math.abs(a - r.first) ? t : a));
    if (r.first - said <= rules.speech.keyWordLate) continue;
    const before = runs.filter((x) => x.id === r.id && x.last < r.first).reduce((a, x) => Math.max(a, x.last + step), 0);
    const at = await view.refine(r.id, Math.max(before, r.first - 1), r.first);
    const by = at - said;
    if (by > rules.speech.keyWordLate + 0.02) late.push({ run: r, at, said, late: by });
  }
  return late;
}

/** Words over the presenter's face, for footage: HyperFrames' face measure on the render, one frame a second, against
    the words on screen then. `{ findings, ran }`. */
function faceFindings(film, file, runs, rules) {
  const r = spawnSync("npx", ["--yes", `hyperframes@${film.version}`, "measure", "face", file, "--samples", String(Math.max(8, Math.ceil(film.duration))), "--json"], {
    cwd: film.dir,
    env: { ...process.env, ...HYPERFRAMES_ENV },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  let faces;
  try {
    faces = JSON.parse(r.stdout.slice(r.stdout.indexOf("{"))).boxes || [];
  } catch {
    return { findings: [], ran: "the face measure gave no answer" };
  }
  const covered = new Map();
  for (const { t, box } of faces) {
    const [fx, fy, fw, fh] = [box[0] * film.width, box[1] * film.height, box[2] * film.width, box[3] * film.height];
    for (const run of runs) {
      if (run.meta.ignore || t < run.first || t > run.last) continue;
      const [x0, y0, x1, y1] = run.box;
      const over = Math.max(0, Math.min(x1, fx + fw) - Math.max(x0, fx)) * Math.max(0, Math.min(y1, fy + fh) - Math.max(y0, fy));
      if (over / (fw * fh) >= rules.check.faceOverlap && !covered.has(run)) covered.set(run, { t, share: over / (fw * fh) });
    }
  }
  const findings = [...covered].map(([run, c]) => ({
    level: "should",
    time: round(c.t),
    element: run.meta.own || run.meta.selector || "",
    text: run.text,
    file: run.meta.file,
    what: `${quote(run.text)} covers ${Math.round(c.share * 100)}% of the presenter's face at ${secs(c.t)}.`,
    fix: "Move the words (or the card's side) clear of the face; never move the person (guides/footage/overlays.md).",
    owner: "build",
    source: "Video Studio: the face",
    code: "words_over_face",
  }));
  return { findings, ran: faces.length ? `a face in ${plural(faces.length, "frame")} of the render` : "no face found in the render" };
}

// ───────── the report ─────────

const ORDER = { must: 0, should: 1, note: 2 };
const rank = (list) => list.sort((a, b) => ORDER[a.level] - ORDER[b.level] || (a.time ?? -1) - (b.time ?? -1));

const reportFile = (root, slug, kind = "film") => join(root, "videos", slug, "docs", "checks", `${kind}.json`);
const keptFile = (root, slug) => join(root, "videos", slug, "docs", "checks", "kept.json");

export function saveReport(root, slug, kind, report) {
  const file = reportFile(root, slug, kind);
  mkdirSync(join(file, ".."), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(tmp, file);
  return file;
}

// ───────── kept findings ─────────
// A should fix the build means (a quick-fire run meant to be glanced at, a label that's texture) is kept with why:
// `studio.mjs check <video> --keep S2 "<why>"` writes it to docs/checks/kept.json, the video's review page shows it,
// and each later check folds it away. A finding is the same one in a later check when its kind, element, file and
// words are: its times may move as the film changes.

/** What makes a finding the same one from check to check. */
export const findingKey = (f) => [f.code || "", f.element || "", f.file || "", f.text || ""].join("|");

/** The video's kept findings ([{ key, code, element, file, text, what, time, until, why, at }]). */
export function readKept(root, slug) {
  const list = readJSON(keptFile(root, slug))?.kept;
  return Array.isArray(list) ? list.filter((k) => k?.key && k.why) : [];
}

/** Each finding's id for this report (M1, S1, N1; K1 for a kept one), and the counts, the kept ones folded out. A must
    fix is never folded: it stops the render. */
export function settle(report, kept = []) {
  // each level's findings of one kind together, the kinds in the order their first finding comes, as they're printed
  const ranked = [];
  for (const level of Object.keys(ORDER)) {
    const here = report.findings.filter((f) => f.level === level);
    for (const kind of new Set(here.map((f) => f.code || f.what))) ranked.push(...here.filter((f) => (f.code || f.what) === kind));
  }
  report.findings = ranked;
  const why = new Map(kept.map((k) => [k.key, k]));
  const n = { must: 0, should: 0, note: 0, kept: 0 };
  for (const f of report.findings) {
    const k = f.level !== "must" && why.get(findingKey(f));
    if (k) f.kept = { why: k.why, at: k.at };
    else delete f.kept;
    f.id = f.kept ? `K${++n.kept}` : `${{ must: "M", should: "S", note: "N" }[f.level]}${++n[f.level]}`;
  }
  report.counts = n;
  return report;
}

/** `check <video> --keep <id> "<why>"` (repeatable): keep should fixes of the last report, with why. Answers what it
    kept, as lines. */
export function keepFindings(root, slug, pairs) {
  const path = reportFile(root, slug);
  const report = readJSON(path);
  if (!Array.isArray(report?.findings)) throw new Error(`videos/${slug} hasn't been checked yet: run the check first, then keep what it finds.`);
  const picked = pairs.map(([id, why]) => {
    const f = report.findings.find((x) => x.id?.toLowerCase() === String(id).toLowerCase());
    const should = report.findings.filter((x) => x.level === "should" && !x.kept).map((x) => x.id);
    if (!f) throw new Error(`The last check has no ${id}${should.length ? `: its should fix are ${should.join(", ")}` : ""}.`);
    if (f.level === "must") throw new Error(`${f.id} is a must fix: it stops the render, so it's fixed, not kept. A deliberate one is marked in the film instead (format.md, "What check flags on purpose").`);
    if (!String(why || "").trim()) throw new Error(`Say why ${f.id} stays: --keep ${f.id} "<why>".`);
    return { f, why: String(why).trim() };
  });
  const kept = readKept(root, slug);
  const at = new Date().toISOString();
  for (const { f, why } of picked) {
    const key = findingKey(f);
    const entry = { key, code: f.code || "", element: f.element || "", file: f.file || "", text: f.text || "", what: f.what, time: f.time ?? null, until: f.until ?? null, why, at };
    const i = kept.findIndex((k) => k.key === key);
    if (i >= 0) kept[i] = entry;
    else kept.push(entry);
  }
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(keptFile(root, slug), `${JSON.stringify({ kept }, null, 2)}\n`);
  // the report folds them away now, so the overview shows them kept; the ids stay as Claude read them until the next check
  const ids = new Map(report.findings.map((f) => [f, f.id]));
  settle(report, kept);
  for (const [f, id] of ids) f.id = id;
  saveReport(root, slug, "film", report);
  return picked.map(({ f, why }) => `Kept ${ids.get(f)} (${when(f)}${quote(f.what, 70)}): ${why}`);
}

const when = (f) => (f.time == null ? "" : f.until != null ? `${round(f.time, 2)}–${round(f.until, 2)} s · ` : `${round(f.time, 2)} s · `);
const place = (f) => (f.element || f.file ? ` [${[f.element, f.file].filter(Boolean).join(" in ")}]` : "");

/** The report as Claude reads it: a line of counts and the render's measures, then each must fix and should fix on a
    line of its own (each kind's fix once, after its findings), the notes as a count and the kept findings folded
    away. With `previous` (the report before this one), only what's new since then. `notes` lists the notes too. */
export function describeReport(report, { path, page = true, previous = null, notes = false }) {
  const c = report.counts;
  const counts = `${c.must} must fix, ${c.should} should fix, ${plural(c.note, "note")}${c.kept ? `, ${c.kept} kept` : ""}`;
  const before = previous && Array.isArray(previous.findings) ? new Set(previous.findings.filter((f) => !f.kept).map(findingKey)) : null;
  const open = report.findings.filter((f) => !f.kept && f.level !== "note");
  const shown = before ? open.filter((f) => !before.has(findingKey(f))) : open;
  const lines = [];
  if (before) {
    const now = new Set(report.findings.filter((f) => !f.kept).map(findingKey));
    const cleared = previous.findings.filter((f) => !f.kept && f.level !== "note" && !now.has(findingKey(f)));
    const since = previous.checked ? ` (${new Date(previous.checked).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})` : "";
    lines.push(`Video Studio's checks, ${report.title}: ${counts}. Since the last check${since}: ${shown.length} new, ${cleared.length} cleared${cleared.length ? ` (${cleared.map((f) => f.id || "?").join(", ")} then)` : ""}, ${open.length - shown.length} as before.`);
  } else lines.push(`Video Studio's checks, ${report.title}: ${counts}.`);
  // what didn't run, and the render's measures (its loudness and peaks, for the review's log)
  for (const r of report.ran || []) if (/^Video Studio's render|^Video Studio's face/.test(r.name) || /didn't run/.test(r.detail)) lines.push(`${r.name.replace(/^Video Studio's /, "The ")}: ${r.detail}`);
  for (const [level, label] of [["must", "Must fix"], ["should", "Should fix"]]) {
    const list = shown.filter((f) => f.level === level);
    if (!list.length) continue;
    lines.push(`${label}:`);
    // findings of one kind together, in the order the first of each comes; a fix said once for those that share it
    const kinds = [...new Set(list.map((f) => f.code || f.what))];
    for (const kind of kinds) {
      const group = list.filter((f) => (f.code || f.what) === kind);
      group.forEach((f, i) => {
        lines.push(`${f.id} ${when(f)}${f.what}${place(f)}${f.owner && f.owner !== "build" ? ` (for the ${f.owner})` : ""}`);
        if (f.fix && (i === group.length - 1 || group[i + 1].fix !== f.fix)) lines.push(`   → ${f.fix}`);
      });
    }
  }
  if (notes) {
    const list = report.findings.filter((f) => f.level === "note" && !f.kept);
    if (list.length) lines.push("Notes:", ...list.map((f) => `${f.id} ${when(f)}${f.what}${place(f)}${f.fix ? `\n   → ${f.fix}` : ""}`));
  } else if (c.note) lines.push(`Notes: ${c.note}, for reading when they matter (--notes lists them).`);
  if (c.kept) lines.push(`Kept: ${c.kept} (docs/checks/kept.json; the review page shows them).`);
  lines.push(
    `Saved in ${path}${page ? "; the video's overview shows it" : ""}.${c.must ? " Fix every must fix before rendering a draft." : ""}${page && open.some((f) => f.level === "should") ? ` Fix each should fix, or keep it: --keep <id> "<why>".` : ""}`,
  );
  return lines.join("\n");
}

/** The film's files as they stand (each one's size and time, hashed): the same print means nothing the checks read has
    changed since. index.motion.json is the checks' own, so it's left out. */
function filmPrint(film) {
  const parts = [film.version, PLUGIN_ROOT];
  const add = (path) => {
    let st;
    try {
      st = statSync(path);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const name of readdirSync(path).sort()) if (!name.startsWith(".")) add(join(path, name));
    } else parts.push(`${relative(film.root, path)}:${st.size}:${Math.round(st.mtimeMs)}`);
  };
  for (const name of ["index.html", "compositions", "assets", "src", "inputs", "package.json", "hyperframes.json", "BRIEF.md", "docs/rules.json", "docs/words.json"]) add(join(film.dir, name));
  if (film.brief.brand) add(join(film.root, "brands", film.brief.brand, "brand.json"));
  if (film.storyboard) add(join(film.storyboard.dir, "storyboard.json"));
  if (film.script) add(join(film.script.dir, "script.json"));
  add(RULES_FILE);
  let h = 0x811c9dc5;
  const text = parts.join("|");
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

/** The film's own checks (everything but a render's): { ran, findings, motion, carry }, `carry` holding what a later
    render's check needs from this one (the stretches HyperFrames' craft pass found still on purpose, and on footage the
    words' places on screen, for the face). */
async function filmFindings(film, rules, row, log) {
  const step = rules.check.step;
  const ran = [];
  const findings = [];

  // Video Studio's own look first: the plan's motion assertions need the blocks on screen
  log("Video Studio's pass on the words…");
  let samples = [];
  let meta = {};
  let runs = [];
  let late = [];
  let plan = { assertions: [], tested: [], untested: [] };
  let looked = null;
  try {
    const view = await openFilm(film.dir, { version: film.version, width: film.width, height: film.height });
    try {
      const times = [];
      for (let t = 0; t < film.duration - 0.01; t += step) times.push(round(t, 3));
      ({ samples, meta } = await view.sample(times, { captions: CAPTION_ITEMS }));
      samples.meta = meta;
      runs = runsOf(samples, meta, step);
      late = await lateWords(film, runs, view, rules, step);
      plan = planAssertions(film, runs, meta, rules);
    } finally {
      await view.close();
    }
  } catch (err) {
    looked = err.message;
  }
  const motion = looked ? { written: false } : writeMotion(film, plan);

  // HyperFrames' check, with the video's settings
  const at = planTimes(film);
  const captionZone = row.key === "9x16" ? `x0=0;y0=${round(1 - row.safe.bottom, 3)};x1=1;y1=1;severity=warning` : "";
  log("HyperFrames' check, and the sound…");
  const checking = runHyperFrames(film, { at, captionZone, samples: Math.max(9, Math.ceil(film.duration / rules.check.samplesEvery)) });
  checking.catch(() => {});
  // the sound is measured while HyperFrames checks
  await new Promise((r) => setImmediate(r));
  const stems = stemFindings(film.dir, film.media, film.words, rules, film.duration);
  const hf = await checking;
  findings.push(...fromHyperFrames(hf, film, { ours: motion.written }));
  const passes = Object.keys(PASSES).filter((k) => hf[k]);
  ran.push({
    name: `HyperFrames ${film.version}'s check`,
    detail: `${hf.ok ? "passed" : "failed"}: ${passes.join(", ")}; ${hf.plain ? "its own samples (this HyperFrames doesn't take the video's settings)" : `${plural(at.length, "time")} from the storyboard${captionZone ? `, the platforms' band (the bottom ${Math.round(row.safe.bottom * 100)}%)` : ""}`}${motion.written ? `, ${plural(plan.assertions.length, "motion assertion")} from the scene plans` : ""}${hf.contrast?.checked ? `, contrast on ${plural(hf.contrast.checked, "text")}` : ""}`,
    report: hf.saved?.report ? relative(film.dir, hf.saved.report) : null,
  });
  if (motion.own) findings.push({ level: "note", time: null, element: "index.motion.json", what: "index.motion.json is the build's own, so the scene plans' timings weren't written into it.", fix: "", owner: "build", source: "Video Studio: the plan", code: "motion_file_own" });
  if (plan.untested.length && film.storyboard)
    findings.push({
      level: "note",
      time: null,
      element: "",
      what: `Planned words not tested for timing: ${plan.untested.slice(0, 8).map((u) => `${quote(u.phrase, 24)} (${u.scene}: ${u.why})`).join(", ")}${plan.untested.length > 8 ? ` and ${plan.untested.length - 8} more` : ""}.`,
      fix: "Name each word on screen in its scene plan's moves, with its time, so the checks can test it.",
      owner: "storyboard",
      source: "Video Studio: the plan",
      code: "plan_untested",
    });

  if (looked) {
    findings.push({ level: "should", time: null, element: "", what: `Video Studio's own pass on the words didn't run (${looked}), so sizes, holds, words at once, safe areas, the brand and the words against the voice weren't checked.`, fix: "Check the film loads in HyperFrames' preview, then check again.", owner: "build", source: "Video Studio: the words", code: "words_pass_failed" });
    ran.push({ name: "Video Studio's words", detail: `didn't run: ${looked}` });
  } else {
    findings.push(...ourFindings({ film, rules, runs, samples, step, hf, refined: late }));
    const shown = runs.filter((r) => !r.meta.ignore).length;
    ran.push({ name: "Video Studio's words", detail: `${plural(samples.length, "sample")} every ${step} s, ${plural(shown, "block")} of words; sizes, holds, words at once, headlines and safe areas at ${row.key.replace("x", ":")}; the brand's fonts and colours${film.words.length ? `; ${plural(film.words.length, "spoken word")} against the screen` : ""}${film.storyboard ? `; storyboard v${film.storyboard.version}'s words` : ""}` });
  }

  findings.push(...stems.findings);
  ran.push({ name: "Video Studio's sound", detail: stems.ran });
  const carry = {
    still: (hf.craft?.findings || []).filter((f) => f.code === "dead_stretch").map((f) => [f.time, f.until ?? f.time + (f.seconds || 0)]),
    words: film.media.some((m) => m.tag === "video")
      ? runs.filter((r) => !r.meta.ignore).map((r) => ({ first: r.first, last: r.last, box: r.box, text: r.text, meta: { own: r.meta.own || "", selector: r.meta.selector || "", file: r.meta.file || "" } }))
      : [],
  };
  return { ran, findings, motion: motion.written ? { file: "index.motion.json", tested: plan.tested } : null, carry };
}

/** `studio.mjs check <video>`: everything above, in one report. `render` adds a rendered file's sound and picture;
    with `reuse`, the film's own findings come from its last report when none of its files has changed since, so only
    the render is checked. */
export async function checkFilm(root, slug, { render = null, log = () => {}, reuse = false } = {}) {
  const film = readFilm(root, slug);
  const rules = readRules(film.dir);
  const row = frameRow(rules, film.width, film.height);
  // what the last report found, to reuse or to say what's new since (--changes)
  const previous = readJSON(reportFile(root, slug));
  const print = filmPrint(film);
  const same = reuse && previous?.print === print && previous.carry && Array.isArray(previous.findings);
  const own = same
    ? {
        ran: previous.ran.filter((r) => !r.render).map((r) => (r.name.startsWith("HyperFrames") ? { ...r, detail: `${r.detail} (from the check at ${new Date(previous.checked).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}: the film hasn't changed since)` } : r)),
        findings: previous.findings.filter((f) => !f.render).map(({ id, kept, ...f }) => f),
        motion: previous.motion,
        carry: previous.carry,
      }
    : await filmFindings(film, rules, row, log);
  const ran = [...own.ran];
  const findings = [...own.findings];
  if (render) {
    log("The render…");
    const file = resolve(film.dir, render);
    if (!existsSync(file)) throw new Error(`There's no render at ${render}.`);
    const still = own.carry.still;
    const r = renderFindings(file, rules, { name: relative(film.dir, file), skipFrozen: (a, b) => still.some(([x, y]) => a < y && b > x), stops: false });
    findings.push(...r.findings.map((f) => ({ ...f, render: true })));
    ran.push({ name: "Video Studio's render", detail: `${relative(film.dir, file)}: ${r.ran}`, render: true });
    if (film.media.some((m) => m.tag === "video")) {
      log("Words over the face…");
      const f = faceFindings(film, file, own.carry.words, rules);
      findings.push(...f.findings.map((x) => ({ ...x, render: true })));
      ran.push({ name: "Video Studio's face check", detail: f.ran, render: true });
    }
  }

  const report = {
    version: 1,
    title: `${film.brief.title || slug}`,
    video: slug,
    checked: new Date().toISOString(),
    hyperframes: film.version,
    size: { width: film.width, height: film.height, row: row.key },
    storyboard: film.storyboard?.version ?? null,
    script: film.script?.version ?? null,
    render: render ? relative(film.dir, resolve(film.dir, render)) : null,
    rules: { file: "guides/rules.json", own: rules.own.length ? "docs/rules.json" : null, changed: rules.own },
    motion: own.motion,
    ran,
    findings: rank(findings),
    // for a later render's check of the same film: its print, and what that check needs from this one
    print,
    carry: own.carry,
  };
  const path = saveReport(root, slug, "film", settle(report, readKept(root, slug)));
  // the overview's step under way: a check before a render
  if (!render)
    try {
      if (readProgress(root, slug)?.stage === "video") updateProgress(root, slug, (q) => ((q.step = "check"), q));
    } catch {}
  return { report, path, previous, reused: Boolean(same) };
}
