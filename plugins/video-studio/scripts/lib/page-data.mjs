// What would keep a page from showing the data file Claude just wrote, as written: it doesn't read as JSON (where, and
// the line), its version isn't its folder's (the page lists it only when they match), or what the page shows from it
// is missing (a script's rows, a storyboard's scenes and the frames and rough cuts they name, a review's video). `show`
// checks it before giving the page's address, and the page-ready hook when the file is written, so a broken file is
// never shown as an older version or no page at all. The script's craft is `check --script`'s, not this.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const KINDS = { script: "script", storyboard: "storyboard", review: "review" };

/** A JSON file read, or why not: { data } or { problem }, the problem saying where (line and column) and showing the
    line. */
export function readData(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return { problem: "isn't there" };
  }
  try {
    return { data: JSON.parse(text) };
  } catch (e) {
    const m = /position (\d+)/.exec(e.message);
    const at = m ? Number(m[1]) : null;
    if (at === null) return { problem: `doesn't read as JSON: ${e.message}` };
    const before = text.slice(0, at).split("\n");
    const line = before.length;
    const shown = text.split("\n")[line - 1].trim();
    return { problem: `doesn't read as JSON at line ${line}, column ${before.at(-1).length + 1} (${e.message.replace(/\s*in JSON at position.*$/, "").replace(/^Unexpected/, "unexpected")}): ${shown.length > 120 ? `${shown.slice(0, 119)}…` : shown}` };
  }
}

/** The problems with a version's data file: [] when the page can show it. A version whose data says another version
    is out of sight on purpose while it's made (a storyboard's next version is a copy of the last until it's done):
    `show` says so, and with `quiet` (the hook, as it's written) it's left alone. */
export function dataProblems(root, project, kind, version, { quiet = false } = {}) {
  const dir = join(root, "videos", project, kind, `v${version}`);
  const name = `${KINDS[kind]}.json`;
  const where = `videos/${project}/${kind}/v${version}/${name}`;
  const { data, problem } = readData(join(dir, name));
  if (problem) return [`${where} ${problem}.`];
  const out = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) return [`${where} isn't an object.`];
  if (data.version != null && Number(data.version) !== version) return quiet ? [] : [`${where} says "version": ${JSON.stringify(data.version)}, but it's in v${version}: the page lists it only when they match.`];
  const missing = (files, base) => files.filter((f) => f && !existsSync(join(base, f)));
  const some = (list) => (list.length > 4 ? `${list.slice(0, 4).join(", ")} and ${list.length - 4} more` : list.join(", "));
  if (kind === "script") {
    if (!Array.isArray(data.rows) || !data.rows.length) out.push(`${where} has no rows.`);
    else {
      const ids = data.rows.map((r) => r?.id).filter(Boolean);
      const twice = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      if (twice.length) out.push(`${where} gives two rows the same id: ${twice.join(", ")}.`);
    }
  }
  if (kind === "storyboard") {
    if (!Array.isArray(data.scenes) || !data.scenes.length) out.push(`${where} has no scenes.`);
    else {
      const ids = data.scenes.map((s) => s?.id);
      const twice = [...new Set(ids.filter((id, i) => id && ids.indexOf(id) !== i))];
      if (twice.length) out.push(`${where} gives two scenes the same id: ${twice.join(", ")}.`);
      if (ids.some((id) => !id)) out.push(`${where} has a scene with no id.`);
      const bad = data.scenes.filter((s) => !(Number(s?.end) > Number(s?.start)));
      if (bad.length) out.push(`${where}: ${bad.map((s) => s?.id || "?").join(", ")} ${bad.length === 1 ? "has" : "have"} no time range (an end after its start).`);
      const noFrames = data.scenes.filter((s) => !Array.isArray(s?.frames) || !s.frames.length).map((s) => s?.id || "?");
      if (noFrames.length) out.push(`${where}: ${noFrames.join(", ")} ${noFrames.length === 1 ? "has" : "have"} no frames.`);
      const frames = missing(data.scenes.flatMap((s) => (Array.isArray(s?.frames) ? s.frames.map((f) => f?.src) : [])), dir);
      if (frames.length) out.push(`${where} names frames that aren't there: ${some(frames)} (render-frames.mjs makes them).`);
      const clips = missing(data.scenes.map((s) => s?.clip), dir);
      if (clips.length) out.push(`${where} names rough cuts that aren't there: ${some(clips)}.`);
    }
  }
  if (kind === "review") {
    const base = join(root, "videos", project);
    if (!data.video) out.push(`${where} names no video.`);
    else if (!existsSync(join(base, data.video))) out.push(`${where} names a video that isn't there: ${data.video} (from the video's folder).`);
    if (data.poster && !existsSync(join(base, data.poster))) out.push(`${where} names a poster that isn't there: ${data.poster}.`);
  }
  return out;
}

/** The data file a page shows, for a path Claude gives `show` (or a file it wrote): { project, kind, version } for a
    script, storyboard or review version, the newest folder on disk when no version is given; else null. */
export function pageData(root, path) {
  let p = String(path || "");
  try {
    p = decodeURIComponent(p);
  } catch {}
  const m = /^\/?videos\/([^/]+)\/(script|storyboard|review)(?:\/v(\d+))?\/?$/.exec(p);
  if (!m) return null;
  const [, project, kind, v] = m;
  if (v) return { project, kind, version: Number(v) };
  const dir = join(root, "videos", project, kind);
  let newest = 0;
  for (const d of readdirSafe(dir)) {
    const n = /^v(\d+)$/.exec(d)?.[1];
    if (n && existsSync(join(dir, d, `${kind}.json`))) newest = Math.max(newest, Number(n));
  }
  return newest ? { project, kind, version: newest } : null;
}

/** The page data file a written file is, by its place in the studio: { project, kind, version } or null. */
export function dataFileOf(root, file) {
  const rel = relative(root, file).split(sep).join("/");
  const m = /^videos\/([^/]+)\/(script|storyboard|review)\/v(\d+)\/(script|storyboard|review)\.json$/.exec(rel);
  return m && m[2] === m[4] ? { project: m[1], kind: m[2], version: Number(m[3]) } : null;
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
