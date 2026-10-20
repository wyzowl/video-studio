// Studio data: find a studio folder and read its brands, videos, scripts, storyboards and video reviews.
// A studio is any folder with a studio.json at its root. Everything here is read-only except registerStudio().
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "./categories.mjs";
import { readProgress, stageTitle, stepsNow } from "./progress.mjs";

export const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const STUDIO_FILE = "studio.json";
// where the plugin remembers this user's studios (so pages can open from any folder, and setup is suggested once), and
// keeps the full library's licence and items. WVS_USER_DIR moves it, for tests.
export const USER_DIR = process.env.WVS_USER_DIR || join(homedir(), ".wyzowl-video-studio");
const REGISTRY = join(USER_DIR, "studios.json");

/** Studios this user has set up, most recent first (only ones that still exist). */
export function registeredStudios() {
  const list = readJSON(REGISTRY, {}).studios;
  return (Array.isArray(list) ? list : []).filter((s) => s?.path && existsSync(join(s.path, STUDIO_FILE)));
}

export function registerStudio(root, name) {
  const others = (readJSON(REGISTRY, {}).studios || []).filter((s) => s?.path && s.path !== root);
  mkdirSync(USER_DIR, { recursive: true });
  writeFileSync(REGISTRY, `${JSON.stringify({ studios: [{ path: root, name, registered: new Date().toISOString() }, ...others] }, null, 2)}\n`);
}

export function pluginVersion() {
  return readJSON(join(PLUGIN_ROOT, ".claude-plugin/plugin.json"), {}).version || "0.0.0";
}

export function readJSON(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const mtime = (p) => {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
};
const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const listDir = (p) => {
  try {
    return readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
};
const visible = (name) => !name.startsWith(".") && !name.startsWith("_");

/** Walk up from `start` to the nearest folder that holds a studio.json. */
export function findStudio(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, STUDIO_FILE))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export function readStudio(root) {
  const s = readJSON(join(root, STUDIO_FILE), {});
  return { root, name: s.name || "Video Studio", ...s };
}

/** Front matter of a markdown file: simple `key: value` lines between --- fences. */
export function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || "");
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1).replace(/\\(["\\])/g, "$1");
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
    out[kv[1]] = v;
  }
  return out;
}

/** A video's brief (BRIEF.md): its front matter; its "Intent" section as one line of plain text; and its sections
    with something in them, in order, as written ({ title, key, text }; key is the heading in lower case): "Request"
    is the user's own words, quoted, then Claude's "Intent", "Assets", "Customizations" and "Notes". */
export function readBrief(root, slug) {
  const path = join(root, "videos", slug, "BRIEF.md");
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/\r\n/g, "\n");
  const sections = [...body.matchAll(/^##\s+(.+?)[ \t]*$([\s\S]*?)(?=^#{1,2}\s|(?![\s\S]))/gm)]
    .map((m) => ({ title: m[1].trim(), key: m[1].trim().toLowerCase(), text: m[2].replace(/^\s*\n/, "").trimEnd() }))
    .filter((s) => s.text.trim());
  const intent = sections.find((s) => s.key === "intent")?.text || "";
  return { ...frontMatter(text), intent: intent.replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim(), sections };
}

export function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** "16:9", "4:5", "1920x1080" or "1080×1350" → { w, h, label, ratio }. */
export function parseSize(input) {
  const named = { "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920] };
  if (input && typeof input === "object" && input.width && input.height) return sizeOf(+input.width, +input.height, input.label);
  // a size this function made already (a video's size)
  if (input && typeof input === "object" && input.w && input.h) return sizeOf(+input.w, +input.h, input.label);
  const s = String(input || "").trim().replace(/\s/g, "");
  if (named[s]) return sizeOf(...named[s], s);
  const px = /^(\d{2,5})[x×](\d{2,5})$/i.exec(s);
  if (px) return sizeOf(+px[1], +px[2]);
  const ar = /^(\d+):(\d+)$/.exec(s);
  if (ar) {
    // any other ratio: the short side is 1080 px, the long side rounded to an even number
    const [a, b] = [+ar[1], +ar[2]];
    const even = (n) => 2 * Math.round(n / 2);
    return a >= b ? sizeOf(even((1080 * a) / b), 1080, s) : sizeOf(1080, even((1080 * b) / a), s);
  }
  return sizeOf(1920, 1080, "16:9");
}
function sizeOf(w, h, label) {
  const g = (a, b) => (b ? g(b, a % b) : a);
  const d = g(w, h);
  const common = { "16:9": 16 / 9, "1:1": 1, "4:5": 0.8, "9:16": 9 / 16 };
  const named = Object.entries(common).find(([, r]) => Math.abs(r - w / h) < 0.005);
  return { w, h, ratio: `${w} / ${h}`, label: label || (named ? named[0] : `${w / d}:${h / d}`), px: `${w}×${h}` };
}

// ───────── brands ─────────

export function readBrand(root, slug) {
  const p = join(root, "brands", slug, "brand.json");
  const b = readJSON(p);
  if (!b) return null;
  return { slug, ...b, name: b.name || slug, _updated: mtime(p) };
}

export function listBrands(root) {
  return listDir(join(root, "brands"))
    .filter((d) => d.isDirectory() && visible(d.name))
    .map((d) => readBrand(root, d.name))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The colour that best stands for the brand's ground, and one for its accent. */
export function brandColours(brand) {
  const cs = Array.isArray(brand?.colours) ? brand.colours.filter((c) => /^#[0-9a-f]{3,8}$/i.test(c.hex || "")) : [];
  const byRole = (re) => cs.find((c) => re.test(c.role || "") || re.test(c.name || ""));
  const ground = byRole(/background|ground|primary/i) || cs[0];
  const accent = byRole(/accent|highlight|action/i) || cs.find((c) => c !== ground) || ground;
  return { all: cs, ground: ground?.hex, accent: accent?.hex };
}

// ───────── versions ─────────
// A storyboard or draft version counts once it's shared: v<N>/<file> exists, reads as JSON and says it's version N.
// A folder that's still being prepared (v2 copied from v1, say) stays out of sight until Claude writes that.

function sharedVersions(dir, file) {
  return listDir(dir)
    .map((d) => (d.isDirectory() ? /^v(\d+)$/.exec(d.name) : null))
    .filter(Boolean)
    .map((m) => +m[1])
    .filter((n) => {
      const data = readJSON(join(dir, `v${n}`, file));
      return data && (data.version == null || Number(data.version) === n);
    })
    .sort((a, b) => a - b);
}

// ───────── storyboards ─────────

export function storyboardVersions(root, slug) {
  return sharedVersions(join(root, "videos", slug, "storyboard"), "storyboard.json");
}

export function readStoryboard(root, slug, version) {
  const dir = join(root, "videos", slug, "storyboard", `v${version}`);
  const sb = readJSON(join(dir, "storyboard.json"));
  if (!sb) return null;
  const feedback = readJSON(join(dir, "feedback.json"));
  return { dir, version, storyboard: sb, feedback, summary: summariseFeedback(sb, feedback) };
}

export function summariseFeedback(sb, fb) {
  const ids = (sb?.scenes || []).map((s) => s.id);
  const status = (id) => fb?.scenes?.[id]?.status || "unreviewed";
  const approved = ids.filter((id) => status(id) === "approved").length;
  const feedback = ids.filter((id) => status(id) === "feedback").length;
  // general notes ask for changes, as notes do on a script or video (feedback from outside the studio is pasted there)
  const hasGeneral = Boolean(fb?.general && fb.general.trim());
  return {
    scenes: ids.length,
    approved,
    feedback,
    unreviewed: ids.length - approved - feedback,
    saved: Boolean(fb),
    savedAt: fb?.savedAt || null,
    allApproved: ids.length > 0 && approved === ids.length && !hasGeneral,
    changes: feedback > 0 || hasGeneral,
    hasGeneral,
  };
}

// ───────── video reviews ─────────
// videos/<p>/review/v<N>/review.json describes a video Claude has shared for review (the pages call each one "Video
// v<N>"); feedback.json is written by the review page.

export function reviewVersions(root, slug) {
  return sharedVersions(join(root, "videos", slug, "review"), "review.json");
}

export function readReview(root, slug, version) {
  const dir = join(root, "videos", slug, "review", `v${version}`);
  const review = readJSON(join(dir, "review.json"));
  if (!review) return null;
  const feedback = readJSON(join(dir, "feedback.json"));
  return { dir, version, review, feedback, summary: summariseReview(feedback) };
}

export function summariseReview(fb) {
  const notes = Array.isArray(fb?.notes) ? fb.notes.filter((n) => n && String(n.text || "").trim()).length : 0;
  const decision = ["approved", "changes"].includes(fb?.decision) ? fb.decision : "undecided";
  return { decision, notes, saved: Boolean(fb), savedAt: fb?.savedAt || null, approved: decision === "approved", hasGeneral: Boolean(fb?.general && fb.general.trim()) };
}

// ───────── scripts ─────────
// videos/<p>/script/v<N>/script.json is the written script Claude shares before the storyboard: a row per beat, the
// voiceover (or the text on screen, without one) beside what happens on screen. feedback.json is written by its page.

export const WORDS_PER_MINUTE = 135;

export function scriptVersions(root, slug) {
  return sharedVersions(join(root, "videos", slug, "script"), "script.json");
}

/** Whether a script has a voiceover; without one, its second column is the text on screen. A footage video's script
    counts as one: its words are what's said on camera. */
export const scriptHasVoiceover = (script) => script?.mode !== "text";

/** Whether a script is cut from footage (mode "footage"): its words are what's said on camera, from the takes, and
    each row can say where in the footage they are (`source`: [{ clip, in, out }], seconds in that clip). */
export const scriptFromFootage = (script) => script?.mode === "footage";

/** The heading over a script's words. */
export const scriptWordsLabel = (script) => (scriptFromFootage(script) ? "What's said" : scriptHasVoiceover(script) ? "Voiceover" : "Text on screen");

/** A footage row's takes, as they read on the page: "talk-a.mp4 00:06.4–00:09.6", one per range. */
export function rowSources(row) {
  return (Array.isArray(row?.source) ? row.source : [])
    .filter((r) => r && r.clip && Number(r.out) > Number(r.in))
    .map((r) => `${r.clip} ${timecode(+r.in, true)}–${timecode(+r.out, true)}`);
}

/** A script's rows, numbered from 1 as its page shows them, each with an id (r01, r02…) its notes point to. */
export function scriptRows(script) {
  return (Array.isArray(script?.rows) ? script.rows : []).map((row, i) => ({ ...row, id: String(row?.id || `r${String(i + 1).padStart(2, "0")}`), n: i + 1 }));
}

/** The voiceover alone, to have it read: each row's words (bold marks and notes in parentheses left out), a line
    each, with a sentence carried across rows ("Manage your work…", "…track tasks") joined back up. */
export function voiceoverText(script) {
  const lines = [];
  const ELLIPSIS = /(?:…|\.\.\.)$/;
  for (const row of scriptRows(script)) {
    const said = String(row.voiceover || "").replace(/\*\*/g, "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (!said) continue;
    const prev = lines.at(-1);
    if (prev && ELLIPSIS.test(prev) && /^(?:…|\.\.\.)/.test(said)) lines[lines.length - 1] = `${prev.replace(ELLIPSIS, "").trimEnd()} ${said.replace(/^(?:…|\.\.\.)\s*/, "")}`;
    else lines.push(said);
  }
  return lines.join("\n");
}

/** The voiceover's words (bold marks and notes in parentheses left out) and the length they make at 135 a minute. */
export function scriptLength(script) {
  if (!scriptHasVoiceover(script)) return null;
  const said = scriptRows(script)
    .map((row) => String(row.voiceover || ""))
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/\([^)]*\)/g, " ");
  const words = said.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  // from footage, the takes set the length: the ranges each row uses, end to end
  if (scriptFromFootage(script)) {
    const taken = scriptRows(script)
      .flatMap((row) => (Array.isArray(row.source) ? row.source : []))
      .reduce((sum, r) => sum + Math.max(0, Number(r?.out) - Number(r?.in) || 0), 0);
    if (taken > 0) return { words, seconds: Math.round(taken), footage: true };
  }
  return { words, seconds: Math.round((words / WORDS_PER_MINUTE) * 60) };
}

export function readScript(root, slug, version) {
  const dir = join(root, "videos", slug, "script", `v${version}`);
  const script = readJSON(join(dir, "script.json"));
  if (!script) return null;
  const feedback = readJSON(join(dir, "feedback.json"));
  return { dir, version, script, feedback, summary: summariseReview(feedback) };
}

// ───────── videos ─────────

const STATUS = {
  planning: "Planning",
  script: "Script ready for review",
  scriptChanges: "Changes requested on the script",
  scriptApproved: "Script approved: storyboard next",
  storyboard: "Storyboard ready for review",
  feedback: "Storyboard feedback received",
  production: "In production",
  review: "Video ready for review",
  changes: "Changes requested on the video",
  approved: "Video approved: final render next",
  delivered: "Delivered",
};

function newest(dir, test) {
  let best = null;
  for (const d of listDir(dir)) {
    if (!d.isFile() || !test(d.name)) continue;
    const p = join(dir, d.name);
    const t = mtime(p);
    if (!best || t > best.mtime) best = { name: d.name, path: p, mtime: t };
  }
  return best;
}

export function readVideo(root, slug) {
  const dir = join(root, "videos", slug);
  if (!isDir(dir)) return null;
  const briefPath = join(dir, "BRIEF.md");
  const brief = existsSync(briefPath) ? frontMatter(readFileSync(briefPath, "utf8")) : {};
  const meta = readJSON(join(dir, "meta.json"), {});
  const created = Date.parse(brief.created || meta.createdAt || "") || statSync(dir).birthtimeMs || mtime(dir);

  const scripts = scriptVersions(root, slug);
  const latestSc = scripts.length ? readScript(root, slug, scripts.at(-1)) : null;
  const script = latestSc
    ? {
        version: latestSc.version,
        url: `/videos/${encodeURIComponent(slug)}/script/v${latestSc.version}/`,
        rows: scriptRows(latestSc.script).length,
        length: scriptLength(latestSc.script),
        ...latestSc.summary,
      }
    : null;

  const versions = storyboardVersions(root, slug);
  const latestSb = versions.length ? readStoryboard(root, slug, versions.at(-1)) : null;
  const storyboard = latestSb
    ? {
        version: latestSb.version,
        url: `/videos/${encodeURIComponent(slug)}/storyboard/v${latestSb.version}/`,
        firstFrame: firstFrame(slug, latestSb),
        ...latestSb.summary,
      }
    : null;

  const renders = join(dir, "renders");
  const isMp4 = (n) => extname(n).toLowerCase() === ".mp4";
  const master = newest(renders, (n) => isMp4(n) && !/_web\.mp4$/i.test(n));
  const web = newest(renders, (n) => /_web\.mp4$/i.test(n));
  const draft = newest(join(renders, "drafts"), (n) => isMp4(n) && !/before-after/i.test(n));
  const poster = newest(renders, (n) => /^poster.*\.(png|jpe?g|webp)$/i.test(n));

  const reviews = reviewVersions(root, slug);
  const latestRv = reviews.length ? readReview(root, slug, reviews.at(-1)) : null;
  const projectUrl = (p) => `/videos/${encodeURIComponent(slug)}/${String(p).split("/").map(encodeURIComponent).join("/")}`;
  const review = latestRv
    ? {
        version: latestRv.version,
        url: `/videos/${encodeURIComponent(slug)}/review/v${latestRv.version}/`,
        // a draft's poster is gone once the video's been tidied up
        poster: latestRv.review.poster && existsSync(join(root, "videos", slug, latestRv.review.poster)) ? projectUrl(latestRv.review.poster) : null,
        ...latestRv.summary,
      }
    : null;

  let status = "planning";
  if (master) status = "delivered";
  else if (review?.decision === "approved") status = "approved";
  else if (review?.decision === "changes") status = "changes";
  else if (review) status = "review";
  else if (draft || storyboard?.allApproved) status = "production";
  else if (storyboard?.saved && storyboard.changes) status = "feedback";
  else if (storyboard) status = "storyboard";
  else if (script?.decision === "approved") status = "scriptApproved";
  else if (script?.decision === "changes") status = "scriptChanges";
  else if (script) status = "script";

  // Claude picked up a finished review and is working on the next step (until that step's result appears)
  const working = workingOn(root, slug, { sc: latestSc?.version, sb: latestSb?.version, rv: latestRv?.version, delivered: Boolean(master) });
  // what Claude is making now (lib/progress.mjs): the stage it marked or, until it marks one, the stage that follows the
  // review it picked up, at its first step
  const progress = readProgress(root, slug) || nextStage(working, { sb: latestSb?.version, rv: latestRv?.version });

  const rel = (p) => (p ? `/videos/${encodeURIComponent(slug)}/${p.slice(dir.length + 1).split("/").map(encodeURIComponent).join("/")}` : null);
  const updated = Math.max(
    mtime(briefPath),
    latestSc ? Math.max(mtime(join(latestSc.dir, "script.json")), mtime(join(latestSc.dir, "feedback.json"))) : 0,
    latestSb ? Math.max(mtime(join(latestSb.dir, "storyboard.json")), mtime(join(latestSb.dir, "feedback.json"))) : 0,
    latestRv ? Math.max(mtime(join(latestRv.dir, "review.json")), mtime(join(latestRv.dir, "feedback.json"))) : 0,
    master?.mtime || 0,
    draft?.mtime || 0,
    created || 0,
  );

  return {
    slug,
    title: brief.title || meta.name || slug,
    brand: brief.brand || null,
    type: brief.type || "animated",
    size: parseSize(brief.size || brief.aspect),
    length: brief.length || null,
    destination: brief.destination || null,
    created,
    updated,
    status: { key: status, label: progress ? progressLabel(progress, brief) : statusLabel(status, storyboard, review, working, script) },
    working,
    progress,
    script,
    storyboard,
    review,
    master: master ? { name: master.name, url: rel(web?.path || master.path), mtime: master.mtime } : null,
    draft: draft ? { name: draft.name, url: rel(draft.path) } : null,
    thumbnail: poster ? rel(poster.path) : review?.poster || storyboard?.firstFrame || null,
  };
}

/** The stage that follows a review Claude picked up, as a stage under way at its first step (until Claude marks one). */
function nextStage(w, latest) {
  if (!w) return null;
  const [stage, version] =
    {
      script: w.outcome === "approved" ? ["storyboard", (latest.sb || 0) + 1] : ["script", w.version + 1],
      storyboard: w.outcome === "approved" ? ["video", (latest.rv || 0) + 1] : ["storyboard", w.version + 1],
      review: w.outcome === "approved" ? ["final", w.version] : ["video", w.version + 1],
    }[w.stage] || [];
  if (!stage) return null;
  return { stage, version, step: "", started: w.since, updated: w.since, inferred: true, quiet: Date.now() - Date.parse(w.since) > 20 * 60e3 };
}

/** A video's status while Claude makes something: what, and the step it's on ("Claude is making video v2 · Draft render"). */
function progressLabel(p, brief) {
  const { steps, at } = stepsNow(p, brief);
  return `${stageTitle(p)} · ${steps[at].label}`;
}

function statusLabel(key, sb, rv, working, sc) {
  // while Claude works on a review it picked up, say what it's making
  if (working?.stage === "script") return working.outcome === "approved" ? "Claude is making the storyboard" : `Claude is making script v${working.version + 1}`;
  if (working?.stage === "storyboard") return working.outcome === "approved" ? "Claude is building the video" : `Claude is making storyboard v${working.version + 1}`;
  if (key === "script") return `Script v${sc.version} ready for review`;
  if (key === "scriptChanges") return `Changes requested on script v${sc.version}${sc.notes ? `: ${sc.notes} note${sc.notes === 1 ? "" : "s"}` : ""}`;
  if (key === "scriptApproved") return `Script v${sc.version} approved: storyboard next`;
  if (working?.stage === "review") return working.outcome === "approved" ? "Claude is making the final video" : `Claude is making video v${working.version + 1}`;
  if (key === "storyboard") return `Storyboard v${sb.version} ready for review`;
  if (key === "feedback") return `Feedback on storyboard v${sb.version}: ${sb.feedback ? `${sb.feedback} scene${sb.feedback === 1 ? "" : "s"}` : "general notes"}`;
  if (key === "review") return `Video v${rv.version} ready for review`;
  if (key === "changes") return `Changes requested on video v${rv.version}${rv.notes ? `: ${rv.notes} note${rv.notes === 1 ? "" : "s"}` : ""}`;
  if (key === "approved") return `Video v${rv.version} approved: final render next`;
  return STATUS[key];
}

function firstFrame(slug, sb) {
  for (const s of sb.storyboard.scenes || []) {
    const f = (s.frames || [])[0];
    if (f?.src) return `/videos/${encodeURIComponent(slug)}/storyboard/v${sb.version}/${f.src.split("/").map(encodeURIComponent).join("/")}`;
  }
  return null;
}

export function listVideos(root) {
  return listDir(join(root, "videos"))
    .filter((d) => d.isDirectory() && visible(d.name))
    .map((d) => readVideo(root, d.name))
    .filter(Boolean)
    .sort((a, b) => b.created - a.created);
}

// ───────── live pages ─────────

/** A short fingerprint of the files behind a page, so an open page can tell when to refresh itself.
    Feedback the page saves itself is left out, so saving never triggers a reload. */
export function pageStamp(root, path) {
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(36);
  };
  const newestIn = (dir) => listDir(dir).reduce((mx, e) => Math.max(mx, e.isFile() ? mtime(join(dir, e.name)) : 0), mtime(dir));
  let m;
  if (path === "/" || path === "/index.html") {
    const videos = listVideos(root).map((v) => `${v.slug}:${v.updated}:${v.status.label}`);
    const brands = listBrands(root).map((b) => `${b.slug}:${b._updated}`);
    return { stamp: hash(`${videos.join("|")}#${brands.join("|")}`) };
  }
  if ((m = /^\/videos\/([^/]+)\/?$/.exec(path))) {
    // a video's overview: its brief, every script, storyboard and draft with their feedback, the final video and Claude's
    // working note. Draft renders are left out, so the page doesn't reload while a draft is being made.
    const dir = join(root, "videos", m[1]);
    const video = readVideo(root, m[1]);
    // a stage starting or ending reloads it (the panel of work in progress updates itself in between: ui/page.js)
    const p = video?.progress;
    const parts = [mtime(join(dir, "BRIEF.md")), video?.master?.name || "", video?.working?.since || "", p ? `${p.stage}${p.version}${p.inferred ? "?" : ""}` : ""];
    for (const v of scriptVersions(root, m[1])) {
      const d = join(dir, "script", `v${v}`);
      parts.push(`c${v}:${mtime(join(d, "script.json"))}:${mtime(join(d, "feedback.json"))}`);
    }
    for (const v of storyboardVersions(root, m[1])) {
      const d = join(dir, "storyboard", `v${v}`);
      parts.push(`s${v}:${mtime(join(d, "storyboard.json"))}:${mtime(join(d, "feedback.json"))}`);
    }
    for (const v of reviewVersions(root, m[1])) {
      const d = join(dir, "review", `v${v}`);
      parts.push(`r${v}:${mtime(join(d, "review.json"))}:${mtime(join(d, "feedback.json"))}`);
    }
    return { stamp: hash(parts.join("|")) };
  }
  if ((m = /^\/brands\/([^/]+)\/?$/.exec(path))) {
    const d = join(root, "brands", m[1]);
    return { stamp: hash([mtime(join(d, "brand.json")), newestIn(join(d, "logos")), newestIn(join(d, "fonts")), newestIn(join(d, "refs"))].join(":")) };
  }
  if (/^\/library(\/|$)/.test(path)) {
    // the library: its items (in the plugin) and the brands they can be shown in
    const items = Object.keys(CATEGORIES).map((k) => newestIn(join(PLUGIN_ROOT, "library", k)));
    const brands = listBrands(root).map((b) => `${b.slug}:${b._updated}`);
    return { stamp: hash(`${items.join(":")}#${brands.join("|")}`) };
  }
  if ((m = /^\/videos\/([^/]+)\/storyboard\/v(\d+)\/?$/.exec(path))) {
    const d = join(root, "videos", m[1], "storyboard", `v${m[2]}`);
    const latest = storyboardVersions(root, m[1]).at(-1);
    return {
      stamp: hash(`${mtime(join(d, "storyboard.json"))}:${newestIn(join(d, "frames"))}`),
      ...(latest > +m[2] && { latest: `/videos/${encodeURIComponent(m[1])}/storyboard/v${latest}/`, latestLabel: `Storyboard v${latest}` }),
    };
  }
  if ((m = /^\/videos\/([^/]+)\/script\/v(\d+)\/?$/.exec(path))) {
    const d = join(root, "videos", m[1], "script", `v${m[2]}`);
    const latest = scriptVersions(root, m[1]).at(-1);
    return {
      stamp: hash(String(mtime(join(d, "script.json")))),
      ...(latest > +m[2] && { latest: `/videos/${encodeURIComponent(m[1])}/script/v${latest}/`, latestLabel: `Script v${latest}` }),
    };
  }
  if ((m = /^\/videos\/([^/]+)\/review\/v(\d+)\/?$/.exec(path))) {
    const d = join(root, "videos", m[1], "review", `v${m[2]}`);
    const rv = readJSON(join(d, "review.json"), {});
    const latest = reviewVersions(root, m[1]).at(-1);
    return {
      stamp: hash(`${mtime(join(d, "review.json"))}:${rv.video ? mtime(join(root, "videos", m[1], rv.video)) : 0}`),
      ...(latest > +m[2] && { latest: `/videos/${encodeURIComponent(m[1])}/review/v${latest}/`, latestLabel: `Video v${latest}` }),
    };
  }
  if ((m = /^\/videos\/([^/]+)\/delivery\/?$/.exec(path))) {
    // a video's delivery: every file in its renders folder (a new size, the captions, the words to go with it)
    const d = join(root, "videos", m[1], "renders");
    return { stamp: hash(listDir(d).filter((e) => e.isFile()).map((e) => `${e.name}:${mtime(join(d, e.name))}`).join("|")) };
  }
  return { stamp: "" };
}

/** A studio page from its path, made concrete (/videos/<p>/storyboard/ becomes its latest version), or null if it
    doesn't exist yet. kind is dashboard, project, brand, script, storyboard, review, library or item. */
export function resolvePage(root, path = "/") {
  let p = String(path || "/").trim();
  try {
    p = decodeURIComponent(p);
  } catch {}
  if (!p.startsWith("/")) p = `/${p}`;
  const enc = encodeURIComponent;
  let m;
  if (p === "/" || p === "/index.html") return { kind: "dashboard", path: "/", label: "the studio dashboard" };
  if ((m = /^\/videos\/([^/]+)\/?$/.exec(p))) {
    return readVideo(root, m[1]) ? { kind: "project", path: `/videos/${enc(m[1])}/`, project: m[1], label: `the overview of ${m[1]}` } : null;
  }
  if ((m = /^\/brands\/([^/]+)\/?$/.exec(p))) {
    const brand = readBrand(root, m[1]);
    return brand ? { kind: "brand", path: `/brands/${enc(m[1])}/`, slug: m[1], label: `the brand page for ${brand.name}` } : null;
  }
  // the library opens on its first category; the old gallery addresses (/widgets/, /widgets/w03/) still lead there
  if ((m = /^\/(?:library\/?$|library\/([a-z-]+)\/?$|(widgets|layouts|text-effects)\/?$)/.exec(p))) {
    const category = m[1] || m[2] || Object.keys(CATEGORIES)[0];
    if (!Object.hasOwn(CATEGORIES, category)) return null;
    return { kind: "library", path: `/library/${category}/`, category, label: `the library page for ${CATEGORIES[category].title.toLowerCase()}` };
  }
  if ((m = /^\/(?:library\/)?([a-z-]+)\/([A-Za-z0-9]+)\/?$/.exec(p)) && Object.hasOwn(CATEGORIES, m[1])) {
    // an item is a file in the plugin's library, named after its code ("w03-stat.html")
    const code = m[2].toLowerCase();
    const found = listDir(join(PLUGIN_ROOT, "library", m[1])).some((d) => d.name.toLowerCase().startsWith(`${code}-`));
    return found ? { kind: "item", path: `/library/${m[1]}/${code}/`, category: m[1], code: code.toUpperCase(), label: `${code.toUpperCase()} in the library` } : null;
  }
  if ((m = /^\/videos\/([^/]+)\/(script|storyboard|review)(?:\/v(\d+))?\/?$/.exec(p))) {
    const [, project, kind] = m;
    const versions = { script: scriptVersions, storyboard: storyboardVersions, review: reviewVersions }[kind](root, project);
    const version = m[3] ? +m[3] : versions.at(-1);
    if (!versions.includes(version)) return null;
    const label = {
      script: `script v${version} for ${project}`,
      storyboard: `storyboard v${version} for ${project}`,
      review: `the review page for video v${version} of ${project}`,
    }[kind];
    return { kind, path: `/videos/${enc(project)}/${kind}/v${version}/`, project, version, latest: version === versions.at(-1), label };
  }
  return null;
}

/** The page a data file publishes, once it's ready to show: a brand's brand.json, or a shared script.json,
    storyboard.json or review.json. */
export function pageForFile(root, file) {
  const rel = relative(root, file).split(sep).join("/");
  let m;
  if ((m = /^brands\/([^/]+)\/brand\.json$/.exec(rel))) return resolvePage(root, `/brands/${m[1]}/`);
  m = /^videos\/([^/]+)\/(script|storyboard|review)\/v(\d+)\/(script|storyboard|review)\.json$/.exec(rel);
  return m && m[2] === m[4] ? resolvePage(root, `/videos/${m[1]}/${m[2]}/v${m[3]}/`) : null;
}

// ───────── waiting for a review ─────────
// `studio.mjs wait` lets Claude wait in the background until the user finishes a script, storyboard or draft review. It
// registers in .studio/waiting.json, so the page can say Claude is listening and a save can say Claude has started.

// What's new in the plugin (whats-new.json: each version's notes, newest first), and the version whose notes this
// studio's dashboard last showed (.studio/seen.json), so a card says what an update brought, once.
const seenFile = (root) => join(root, ".studio", "seen.json");
const byVersion = (a, b) => b.localeCompare(a, "en", { numeric: true });

/** The notes of every version newer than the one this studio last saw, up to the plugin's own ([{ version, items }]).
    A studio that never saw any sees the newest version's notes alone. */
export function whatsNew(root) {
  const all = readJSON(join(PLUGIN_ROOT, "whats-new.json"), {});
  const now = pluginVersion();
  const seen = readJSON(seenFile(root), {}).whatsNew || null;
  const versions = Object.keys(all)
    .filter((v) => v.localeCompare(now, "en", { numeric: true }) <= 0 && (!seen || v.localeCompare(seen, "en", { numeric: true }) > 0))
    .sort(byVersion);
  return (seen ? versions : versions.slice(0, 1)).map((version) => ({ version, items: (all[version] || []).filter((x) => x?.text) }));
}

/** The studio has seen the notes up to this version. */
export function sawWhatsNew(root, version = pluginVersion()) {
  mkdirSync(join(root, ".studio"), { recursive: true });
  writeFileSync(seenFile(root), `${JSON.stringify({ ...readJSON(seenFile(root), {}), whatsNew: version }, null, 2)}\n`);
}

// The user's favourite library items in this studio, by code ("W03"): the library shows them starred and can show
// them alone, and `studio.mjs library` lists them first, so Claude suggests them first. Kept in .studio/favourites.json.
const favouritesFile = (root) => join(root, ".studio", "favourites.json");

export function readFavourites(root) {
  const list = readJSON(favouritesFile(root), {}).items;
  return Array.isArray(list) ? [...new Set(list.filter((c) => typeof c === "string" && /^[A-Z]\d{2,3}$/.test(c)))] : [];
}

/** Star or unstar a library item; the list as it now stands, in the order they were starred. */
export function setFavourite(root, code, on) {
  const items = readFavourites(root).filter((c) => c !== code);
  if (on) items.push(code);
  mkdirSync(join(root, ".studio"), { recursive: true });
  writeFileSync(favouritesFile(root), `${JSON.stringify({ items }, null, 2)}\n`);
  return items;
}

const waitingFile = (root) => join(root, ".studio", "waiting.json");
const pageKey = (path) => {
  let p = String(path);
  try {
    p = decodeURIComponent(p);
  } catch {}
  return p.endsWith("/") ? p : `${p}/`;
};

/** True while a `studio.mjs wait` is running for this page's review. */
export function claudeWaiting(root, path) {
  const pid = readJSON(waitingFile(root), {})[pageKey(path)]?.pid;
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
}

/** Register the waiter for a page (its pid), or clear it (null). */
export function setWaiting(root, path, pid) {
  const all = readJSON(waitingFile(root), {});
  if (pid) all[pageKey(path)] = { pid, since: new Date().toISOString() };
  else delete all[pageKey(path)];
  mkdirSync(join(root, ".studio"), { recursive: true });
  writeFileSync(waitingFile(root), `${JSON.stringify(all, null, 2)}\n`);
}

// When a finished review is saved while Claude waits for it, Claude starts on the next step at once. The server notes
// that in .studio/working.json, so the video's overview can say "Claude is making storyboard v3". The note lapses as
// soon as that step's result appears (a newer script, storyboard or draft, or the final video), or after 12 hours.
const workingFile = (root) => join(root, ".studio", "working.json");

/** Note that Claude has picked up a finished review of this video. */
export function markWorking(root, slug, info) {
  const all = readJSON(workingFile(root), {});
  all[slug] = {
    ...info,
    since: new Date().toISOString(),
    sc: scriptVersions(root, slug).at(-1) ?? 0,
    sb: storyboardVersions(root, slug).at(-1) ?? 0,
    rv: reviewVersions(root, slug).at(-1) ?? 0,
  };
  mkdirSync(join(root, ".studio"), { recursive: true });
  writeFileSync(workingFile(root), `${JSON.stringify(all, null, 2)}\n`);
}

function workingOn(root, slug, { sc, sb, rv, delivered }) {
  const w = readJSON(workingFile(root), {})[slug];
  if (!w?.since || delivered) return null;
  if (Date.now() - Date.parse(w.since) > 12 * 3600e3) return null;
  return (w.sc ?? 0) === (sc ?? 0) && w.sb === (sb ?? 0) && w.rv === (rv ?? 0) ? w : null;
}

/** Where the user's review of a script, storyboard or video stands. It's finished once it's saved (a save from before
    every save was a decision can leave scenes unreviewed, or a script or video undecided); savedAfter says the save
    is newer than the version itself. */
export function reviewState(root, page) {
  const dir = join(root, "videos", page.project, page.kind, `v${page.version}`);
  const dataFile = join(dir, `${page.kind}.json`);
  const feedback = readJSON(join(dir, "feedback.json"));
  const summary = page.kind === "storyboard" ? summariseFeedback(readJSON(dataFile), feedback) : summariseReview(feedback);
  const finished = Boolean(feedback) && (page.kind === "storyboard" ? summary.scenes > 0 && summary.unreviewed === 0 : summary.decision !== "undecided");
  return { dir, feedback, summary, finished, savedAfter: mtime(join(dir, "feedback.json")) > mtime(dataFile) };
}

// ───────── formatting ─────────

export function formatDate(ms) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
}

export function formatDateTime(ms) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

/** 12.4 → "00:12" ; with tenths → "00:12.4" */
export function timecode(sec, tenths = false) {
  if (sec == null || Number.isNaN(+sec)) return "";
  const s = Math.max(0, +sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  const ss = tenths ? r.toFixed(1).padStart(4, "0") : String(Math.floor(r)).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a, b) {
  const lum = (hex) => {
    let h = hex.replace("#", "");
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
