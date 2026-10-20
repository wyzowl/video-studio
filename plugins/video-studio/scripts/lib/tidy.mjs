// Tidying up a finished video: removing what it only needed while it was being made, once the user has said yes. That's
// its draft renders, the review stills and snapshots taken while building it, the storyboard versions the approved one
// replaced, the footage's preview copies, and its edit history in HyperFrames (~/.cache/hyperframes/history/<id>:
// HyperFrames' undo record, up to 2 GB of earlier versions of the video's files, kept for as long as its folder
// exists). Everything the video needs to be changed and rendered again stays: the delivered files, the approved script
// and storyboard, every review's notes, and the video's source and inputs. `.studio/tidy/<video>.json` notes the last
// tidy-up, for the pages.
import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { hasDelivery } from "./delivery.mjs";
import { readProgress } from "./progress.mjs";
import { listVideos, readJSON, readStoryboard, storyboardVersions } from "./studio.mjs";

/** What's worth offering: a video with less than this to free isn't. */
export const TIDY_MIN_BYTES = 20e6;

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** HyperFrames' edit histories, a folder for each project it has recorded. */
export const historyRoot = () => join(homedir(), ".cache", "hyperframes", "history");

/** A size as the pages and Claude say it: 2.9 GB, 277 MB, 40 KB. */
export const sizeLabel = (bytes) =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

/** The bytes in a file or folder. A symbolic link counts as itself: it's never followed. */
function bytesIn(path) {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return 0;
  }
  if (!st.isDirectory()) return st.size;
  let total = 0;
  for (const name of readdirSync(path)) total += bytesIn(join(path, name));
  return total;
}

const real = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
};

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};

/** Whether a HyperFrames process has a history open now (HyperFrames' Studio or a preview): it writes its pid in
    owner.pid while it does. */
function historyBusy(home) {
  try {
    const pid = Number(readFileSync(join(home, "owner.pid"), "utf8").trim());
    return Number.isInteger(pid) && pid > 0 && alive(pid);
  } catch {
    return false;
  }
}

/** A video's edit history in HyperFrames: { id, home, bytes, busy }, or null. The video's .hyperframes/history-id
    names it, and the history's project.json names the folder it records: both have to agree. */
export function videoHistory(root, slug) {
  const dir = join(root, "videos", slug);
  let id = "";
  try {
    id = readFileSync(join(dir, ".hyperframes", "history-id"), "utf8").trim();
  } catch {
    return null;
  }
  if (!ID.test(id)) return null;
  const home = join(historyRoot(), id);
  const recorded = readJSON(join(home, "project.json"))?.dir;
  if (typeof recorded !== "string" || real(recorded) !== real(dir)) return null;
  return { id, home, bytes: bytesIn(home), busy: historyBusy(home) };
}

/** The edit histories HyperFrames still keeps for this studio's videos that have been deleted: [{ id, home, dir,
    bytes }]. HyperFrames' own clean-up would only remove them 14 days on, and Video Studio never runs it. */
export function goneHistories(root) {
  const videos = real(join(root, "videos")) + sep;
  let names = [];
  try {
    names = readdirSync(historyRoot());
  } catch {
    return [];
  }
  const gone = [];
  for (const id of names.filter((n) => ID.test(n))) {
    const home = join(historyRoot(), id);
    const dir = readJSON(join(home, "project.json"))?.dir;
    if (typeof dir !== "string" || !resolve(dir).startsWith(videos) || existsSync(dir) || historyBusy(home)) continue;
    gone.push({ id, home, dir, bytes: bytesIn(home) });
  }
  return gone;
}

/** The storyboard versions the approved one replaced: { approved, older }. The approved one is the latest with every
    scene approved; it and anything after it stay. Without one, nothing is replaced. */
function replacedStoryboards(root, slug) {
  const versions = storyboardVersions(root, slug);
  const approved = [...versions].reverse().find((v) => readStoryboard(root, slug, v)?.summary.allApproved) ?? null;
  return { approved, older: approved === null ? [] : versions.filter((v) => v < approved) };
}

const and = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : list[0] || "");

const SHORT = { drafts: "drafts", stills: "review stills", storyboards: "replaced storyboards", proxies: "footage previews", history: "edit history" };

/** What a plan removes, in a few words: "its drafts, review stills and edit history". */
export const tidyWhat = (plan) => `its ${and(Object.keys(SHORT).filter((k) => plan.items.some((i) => i.key === k)).map((k) => SHORT[k]))}`;

/** The last tidy-up of a video: { at, freed, removed, left }, or null. */
export const lastTidy = (root, slug) => readJSON(join(root, ".studio", "tidy", `${slug}.json`));

/** What tidying up a video would remove, and whether it's ready to: { slug, finished, working, items, bytes, approved,
    last }. Each item is { key, label, paths (in the video's folder), bytes, note }, and the history's also has its
    home and whether it's busy. */
export function tidyPlan(root, slug) {
  const dir = join(root, "videos", slug);
  const items = [];
  const add = (key, label, paths, note = "") => {
    const there = paths.filter((p) => existsSync(join(dir, p)));
    const bytes = there.reduce((n, p) => n + bytesIn(join(dir, p)), 0);
    if (bytes > 0) items.push({ key, label, paths: there, bytes, note });
  };
  const history = videoHistory(root, slug);
  if (history?.bytes)
    items.push({ key: "history", label: "Its edit history in HyperFrames", paths: [], home: history.home, busy: history.busy, bytes: history.bytes, note: "HyperFrames' undo record of every change to the video's files" });
  add("drafts", "Draft and test renders", ["renders/drafts"]);
  add("stills", "Review stills and snapshots", ["docs/review", "docs/snapshots", "snapshots"]);
  const sb = replacedStoryboards(root, slug);
  if (sb.older.length) add("storyboards", `Storyboard ${and(sb.older.map((v) => `v${v}`))}, replaced by v${sb.approved} (the approved one)`, sb.older.map((v) => `storyboard/v${v}`));
  add("proxies", "Footage previews", ["footage/proxies"], "a scan makes them again if they're needed");
  return {
    slug,
    finished: hasDelivery(root, slug),
    working: Boolean(readProgress(root, slug)),
    items,
    bytes: items.reduce((n, i) => n + i.bytes, 0),
    approved: sb.approved,
    last: lastTidy(root, slug),
  };
}

/** Removes a history as HyperFrames' own clean-up does: moved aside first (HyperFrames removes any `.pruned-*` it
    finds), so nothing ever sees it half gone. */
function removeHistory(home) {
  if (dirname(home) !== historyRoot() || !ID.test(basename(home))) throw new Error(`${home} isn't a HyperFrames history`);
  const aside = join(historyRoot(), `.pruned-${basename(home)}-${randomUUID()}`);
  renameSync(home, aside);
  rmSync(aside, { recursive: true, force: true });
}

/** Tidies up a video: removes what tidyPlan lists, and notes it. A history HyperFrames has open is left (it's said
    why). Throws while Claude is working on the video, and for one that isn't finished unless `unfinished`. */
export function tidyVideo(root, slug, { unfinished = false } = {}) {
  const plan = tidyPlan(root, slug);
  if (plan.working) throw new Error("Claude is still working on this video. Tidy it up once that's done.");
  if (!plan.finished && !unfinished) throw new Error("This video isn't finished: it has no final render yet.");
  const dir = resolve(root, "videos", slug);
  const done = [];
  const left = [];
  for (const item of plan.items) {
    if (item.key === "history") {
      if (item.busy) {
        left.push(item);
        continue;
      }
      removeHistory(item.home);
    } else {
      for (const p of item.paths) {
        const target = resolve(dir, p);
        if (target.startsWith(dir + sep)) rmSync(target, { recursive: true, force: true });
      }
    }
    done.push(item);
  }
  const freed = done.reduce((n, i) => n + i.bytes, 0);
  if (done.length) {
    mkdirSync(join(root, ".studio", "tidy"), { recursive: true });
    const note = { at: new Date().toISOString(), freed, removed: done.map((i) => i.label), left: left.map((i) => i.label) };
    writeFileSync(join(root, ".studio", "tidy", `${slug}.json`), `${JSON.stringify(note, null, 2)}\n`);
  }
  return { freed, done, left };
}

/** Removes the edit histories of this studio's deleted videos. */
export function tidyGone(root) {
  const gone = goneHistories(root);
  for (const g of gone) removeHistory(g.home);
  return { freed: gone.reduce((n, g) => n + g.bytes, 0), count: gone.length };
}

/** Everything in the studio worth tidying: its finished videos with something to free (the most first, each with its
    title), and the edit history of deleted ones. */
export function studioTidy(root) {
  const videos = listVideos(root)
    .filter((v) => hasDelivery(root, v.slug))
    .map((v) => ({ ...tidyPlan(root, v.slug), title: v.title }))
    .filter((p) => p.bytes >= TIDY_MIN_BYTES && !p.working)
    .sort((a, b) => b.bytes - a.bytes);
  const gone = goneHistories(root);
  const goneBytes = gone.reduce((n, g) => n + g.bytes, 0);
  return { videos, gone, goneBytes, bytes: videos.reduce((n, p) => n + p.bytes, 0) + goneBytes };
}
