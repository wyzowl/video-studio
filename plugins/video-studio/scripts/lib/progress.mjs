// What Claude is making for a video right now, so the video's pages can show the work as it happens ("Claude is making
// storyboard v3"): the stage and its version, the step under way, a count for the slow steps (frames rendered), the
// newest frames, and in a video's review loop the round, Video Studio's own scores and what's being fixed.
// Claude marks the steps it does itself (`studio.mjs progress`); the render, storyboard-frame, review-sheet and footage
// tools add their own counts and frames as they run, and only to a stage that's under way.
// Kept in .studio/progress/<video>.json. A stage ends once its result is written (the version's script.json,
// storyboard.json or review.json, or the final video's web copy), when Claude ends it, or after 12 hours without news.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const STAGES = ["script", "storyboard", "video", "final"];
// the scores of a video's review loop (production skill, references/review.md), as the panel names them
export const SCORES = { hook: "Hook", phone: "Phone size", motion: "Motion", variety: "Variety", composition: "Composition", brand: "Brand", sync: "Sync" };
// a stage with no news for this long says so, in case Claude has stopped
export const QUIET_MS = 20 * 60e3;
const LAPSE_MS = 12 * 3600e3;

const readJSON = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};
const mtime = (p) => {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
};
const step = (key, label) => ({ key, label });

export const progressFile = (root, slug) => join(root, ".studio", "progress", `${slug}.json`);

/** A stage's steps, in order, for this video (its brief says whether it's a footage video and how it's voiced). A
    version after the first starts from the user's notes. */
export function stepsFor(p, brief = {}) {
  const again = p.version > 1;
  const footage = brief.type === "footage";
  if (p.stage === "script")
    return [
      again ? step("notes", "Read your notes") : step("brief", "Read the brief"),
      ...(footage && !again ? [step("scan", "Scan the footage")] : []),
      step("draft", again ? "Make the changes" : footage ? "Cut the script" : "Write the script"),
      step("length", "Check the length"),
      step("ready", "Ready for you"),
    ];
  if (p.stage === "storyboard")
    return [
      ...(again ? [step("notes", "Read your feedback")] : []),
      ...(!again && !footage && brief.voiceover === "ai" ? [step("voice", "Make the voiceover")] : []),
      ...(!again && !footage && brief.voiceover === "recorded" ? [step("voice", "Time the voiceover")] : []),
      step("plan", again ? "Plan the changes" : "Plan the scenes"),
      step("frames", footage ? "Pick the stills" : "Make the frames"),
      ...(footage ? [step("clips", "Cut the rough cuts")] : []),
      step("check", "Check the frames"),
      step("ready", "Ready for you"),
    ];
  if (p.stage === "video")
    return [
      ...(again ? [step("notes", "Read your notes")] : []),
      step("build", again ? "Make the changes" : "Build"),
      step("check", "Check"),
      step("render", "Draft render"),
      step("sheets", "Review sheets"),
      step("scores", "Scores"),
      step("fixes", "Fixes"),
      step("ready", "Ready for you"),
    ];
  return [step("master", "Final render"), step("extras", "Web copy and poster"), step("ready", "Ready")];
}

/** What the pages call a stage under way. */
export function stageTitle(p) {
  if (p.stage === "script") return `Claude is writing script v${p.version}`;
  if (p.stage === "storyboard") return `Claude is making storyboard v${p.version}`;
  if (p.stage === "video") return `Claude is making video v${p.version}`;
  return "Claude is making the final video";
}

/** The stage's steps and the one under way ({ steps, at }). A step the list doesn't name is put in before "Ready", as
    it's named; with no step yet, it's the first. */
export function stepsNow(p, brief) {
  const steps = stepsFor(p, brief);
  let at = steps.findIndex((s) => s.key === p.step);
  if (at < 0 && p.step) {
    const label = String(p.step).replace(/[-_]+/g, " ");
    steps.splice(steps.length - 1, 0, step(p.step, label[0].toUpperCase() + label.slice(1)));
    at = steps.length - 2;
  }
  return { steps, at: Math.max(0, at) };
}

/** When the stage's result was written (0 if it hasn't been): once it's newer than the stage's start, it's done. */
function resultAt(root, slug, p) {
  const dir = join(root, "videos", slug);
  if (p.stage === "script") return mtime(join(dir, "script", `v${p.version}`, "script.json"));
  if (p.stage === "storyboard") return mtime(join(dir, "storyboard", `v${p.version}`, "storyboard.json"));
  if (p.stage === "video") return mtime(join(dir, "review", `v${p.version}`, "review.json"));
  let newest = 0;
  try {
    for (const name of readdirSync(join(dir, "renders"))) if (/_web\.mp4$/i.test(name)) newest = Math.max(newest, mtime(join(dir, "renders", name)));
  } catch {}
  return newest;
}

/** The stage under way for a video, or null: none started, it ended, its result has been written, or it lapsed.
    `quiet` says there's been no news for a while. */
export function readProgress(root, slug, now = Date.now()) {
  const p = readJSON(progressFile(root, slug));
  if (!p || !STAGES.includes(p.stage) || !p.started || p.ended) return null;
  const started = Date.parse(p.started);
  const updated = Date.parse(p.updated || p.started);
  if (!Number.isFinite(started) || now - updated > LAPSE_MS) return null;
  if (resultAt(root, slug, p) > started) return null;
  return { ...p, quiet: now - updated > QUIET_MS };
}

function write(root, slug, p) {
  const file = progressFile(root, slug);
  mkdirSync(dirname(file), { recursive: true });
  // written whole and then moved into place, so the page server never reads half a file
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(p, null, 2)}\n`);
  renameSync(tmp, file);
  return p;
}

/** Start a stage (or carry on with it, if it's the one under way), at a step. */
export function startStage(root, slug, stage, version, at) {
  if (!STAGES.includes(stage)) throw new Error(`The stage is one of ${STAGES.join(", ")}, not "${stage}".`);
  if (!(Number.isInteger(version) && version > 0)) throw new Error(`The version is a whole number from 1, not "${version}".`);
  const now = new Date().toISOString();
  const same = readProgress(root, slug);
  const p = same && same.stage === stage && same.version === version ? { ...same, step: at || same.step, updated: now } : { stage, version, step: at || "", started: now, updated: now };
  delete p.quiet;
  return write(root, slug, p);
}

/** Change the stage under way: `change` gets a copy of it and returns it changed. Nothing happens without a stage under
    way, so a tool run outside one (a frame re-rendered later, say) leaves no trace. */
export function updateProgress(root, slug, change) {
  const p = readProgress(root, slug);
  if (!p) return null;
  delete p.quiet;
  const next = change(structuredClone(p)) || p;
  next.updated = new Date().toISOString();
  return write(root, slug, next);
}

/** Say the stage is over without its result (Claude stopped, or is doing something else). */
export function endStage(root, slug) {
  const p = readJSON(progressFile(root, slug));
  if (p && !p.ended) write(root, slug, { ...p, ended: new Date().toISOString() });
}

/** The studio and video a path inside a video's folder belongs to ({ root, slug, dir }), or null. */
export function videoAt(path) {
  let dir = resolve(path);
  for (;;) {
    const parent = dirname(dir);
    if (parent === dir) return null;
    if (dirname(parent) !== parent && parent.split(sep).at(-1) === "videos" && existsSync(join(dirname(parent), "studio.json")))
      return { root: dirname(parent), slug: dir.split(sep).at(-1), dir };
    dir = parent;
  }
}

/** For the tools: change the stage under way for the video that `path` is in, if there is one. Never throws: a tool's
    own work comes first. */
export function report(path, change) {
  try {
    const at = videoAt(path);
    if (at) updateProgress(at.root, at.slug, (p) => change(p, at));
  } catch {}
}

/** A path inside a video's folder, as the frames list keeps it (relative to the folder, with forward slashes). */
export const inVideo = (at, file) => relative(at.dir, resolve(file)).split(sep).join("/");
