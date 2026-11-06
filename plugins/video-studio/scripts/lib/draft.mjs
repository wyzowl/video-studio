// A draft for Claude's review, and the final video, each made by one command (`studio.mjs draft` and `final`), as the
// steps between them need no judgement: Video Studio's checks first (a must fix stops it), the render
// (lib/render.mjs), the render's own checks, and what Claude looks at next. Each marks its steps on the video's
// overview (lib/progress.mjs) and answers with a short summary.
// - A draft (`draft <video>`): the whole film at draft quality, its review sheets (tools/sheets.mjs: the key frames at
//   a phone's width and the fast moves) and its poster frame, ready for the round's scores.
// - A round of fixes (`draft <video> --at 12.4-13,35.2-36`, or `--start`/`--end` for one stretch): each changed
//   stretch rendered by itself, and a fix sheet of each, before (the last full draft) and after, row above row.
// - The final video (`final <video>`): the 60 fps master, the web copy, poster, thumbnail and contact sheet, the
//   captions when there's speech, and the checks on the master.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { checkFilm, describeReport, readFilm, speechFile } from "./check.mjs";
import { readProgress, startStage, updateProgress } from "./progress.mjs";
import { renderVideo } from "./render.mjs";
import { drawSheets, ff, grab, pool, sheetRange, sheetTime } from "./sheet.mjs";
import { refreshCut, writeCaptions } from "./words.mjs";
import { PLUGIN_ROOT, readJSON, reviewVersions, readReview } from "./studio.mjs";

const SHEETS = join(PLUGIN_ROOT, "scripts", "tools", "sheets.mjs");

const mark = (at, step, change = (q) => q) => {
  try {
    updateProgress(at.root, at.slug, (q) => {
      q.step = step;
      delete q.count;
      return change(q);
    });
  } catch {}
};

/** The video version being made, and its next round: the stage under way's (the last round scored, plus one), or with
    none under way, a new version after the last one reviewed, which starts on the overview. */
function versionAndRound(at, round) {
  let p = readProgress(at.root, at.slug);
  if (p?.stage !== "video") p = startStage(at.root, at.slug, "video", (reviewVersions(at.root, at.slug).at(-1) || 0) + 1, "render");
  return { version: p.version, round: round || (Number(p.scores?.round) || 0) + 1 };
}

/** The newest whole draft of the video (not a stretch), or null. */
function lastDraft(at) {
  const dir = join(at.dir, "renders", "drafts");
  let best = null;
  try {
    for (const name of readdirSync(dir)) {
      if (!/\.mp4$/i.test(name) || /before-after/i.test(name)) continue;
      const t = statSync(join(dir, name)).mtimeMs;
      if (!best || t > best.t) best = { file: join(dir, name), t };
    }
  } catch {}
  return best?.file || null;
}

/** Video Studio's checks before a render, reusing the last check when nothing has changed since; a must fix stops it. */
async function gate(at, log) {
  // a footage cut's words, from the cut as it is now, for the checks and the captions
  const cut = refreshCut(at.root, at.slug);
  if (cut) log(cut);
  const { report, path } = await checkFilm(at.root, at.slug, { reuse: true, log });
  if (!report.counts.must) return null;
  return [describeReport(report, { path: relative(at.root, path) }), "A must fix stops the render: fix it, then run this again."];
}

/** `draft <video>`: the whole film for a review round; with `stretches` ([[from, to], …]), a round of fixes. */
export async function makeDraft(at, { stretches = [], round = null, log = () => {} } = {}) {
  const stop = await gate(at, log);
  if (stop) return { code: 1, lines: stop };
  const { version, round: r } = versionAndRound(at, round);
  const sheetDir = join(at.dir, "docs", "review", `r${r}`);
  if (stretches.length) return fixRound(at, { stretches, version, round: r, sheetDir, log });

  const name = `${at.slug}_v${version}_draft_r${r}`;
  const out = join("renders", "drafts", `${name}.mp4`);
  log(`Draft r${r} of video v${version}…`);
  const made = await renderVideo(at, ["--quality", "draft", "--fps", "30", "--output", out], { round: r });
  if (made.code) return { code: made.code, lines: [made.summary] };
  const { report, path } = await checkFilm(at.root, at.slug, { render: made.file, reuse: true, log });
  // the sheets: the key frames and the fast moves (they mark their own step, and show the newest frames)
  const beats = readJSON(join(at.dir, "docs", "beats.json"));
  const lines = [`Draft r${r} of video v${version}.`, made.summary, describeReport(report, { path: relative(at.root, path) })];
  if (beats?.keys?.length) {
    const s = spawnSync(process.execPath, [SHEETS, out, relative(at.dir, sheetDir)], { cwd: at.dir, encoding: "utf8" });
    lines.push(s.status === 0 ? s.stdout.trim() : `The sheets weren't made: ${(s.stderr || s.stdout).trim().split("\n").pop()}`);
    // the poster frame, for the review page
    if (Number.isFinite(+beats.poster)) {
      const poster = join("renders", "drafts", `${name}.png`);
      try {
        await grab(join(at.dir, out), +beats.poster, join(at.dir, poster));
        lines.push(`Poster: ${poster} (${sheetTime(+beats.poster)}), for the review page.`);
      } catch {}
    }
  } else lines.push("No sheets: docs/beats.json names the key frames, the fast moves and the poster (review skill, \"Sheets\"). Write it, then: node sheets.mjs <draft> docs/review/r<n>");
  mark(at, "scores", (q) => ((q.round = r), q));
  lines.push(`Next: score round ${r} from the sheets, then: studio.mjs progress ${at.slug} fixes --round ${r} --scores hook=…,phone=…,motion=…,variety=…,composition=…,brand=…,sync=…,story=… --fix "<where>: <what>"`);
  return { code: 0, lines };
}

/** A round of fixes: each stretch rendered by itself, and a fix sheet of each, before (the last whole draft) and after. */
async function fixRound(at, { stretches, version, round, sheetDir, log }) {
  const film = readFilm(at.root, at.slug);
  for (const [a, b] of stretches) if (!(a >= 0 && b > a && a < film.duration)) return { code: 1, lines: [`${a}–${b} s isn't a stretch of this ${film.duration} s film: give each as <from>-<to>, in seconds.`] };
  const before = lastDraft(at);
  const renders = [];
  for (const [a, b] of stretches) {
    const out = join("renders", "drafts", "stretches", `${at.slug}_v${version}_r${round}_${a}-${b}.mp4`);
    log(`The stretch ${sheetRange(a, b)}…`);
    const made = await renderVideo(at, ["--quality", "draft", "--fps", "30", "--start", String(a), "--end", String(Math.min(b, film.duration)), "--output", out], { round });
    if (made.code) return { code: made.code, lines: [made.summary] };
    renders.push({ a, b, file: made.file, summary: made.summary });
  }
  // six frames across each stretch, at the same moments before and after
  mkdirSync(sheetDir, { recursive: true });
  const tmp = join(sheetDir, ".fix-frames");
  mkdirSync(tmp, { recursive: true });
  const ratio = film.height / film.width;
  const width = ratio > 1.2 ? 160 : ratio > 0.9 ? 200 : 220;
  const jobs = [];
  const groups = renders.map(({ a, b, file }, i) => {
    const times = Array.from({ length: 6 }, (_, k) => +(a + ((b - a) * k) / 5).toFixed(3));
    // a frame a moment before each file's end, so the last one is there to grab
    const row = (which, src, from, end) =>
      times.map((t, k) => {
        const png = join(tmp, `${i}_${which}_${k}.png`);
        jobs.push(() => grab(src, Math.max(0, Math.min(t - from, end - 0.04)), png, width));
        return { src: png, label: sheetTime(t) };
      });
    const rows = [];
    if (before) rows.push({ label: `before: ${basename(before).replace(/\.mp4$/i, "").replace(`${at.slug}_`, "")}`, tiles: row("before", before, 0, film.duration) });
    rows.push({ label: `after: round ${round}`, tiles: row("after", file, a, b - a) });
    return { title: sheetRange(a, b), rows };
  });
  await pool(jobs);
  const sheets = await drawSheets(groups, { out: join(sheetDir, "fixes.png"), width, ratio });
  // the overview shows the newest frames: the first stretch after its fix
  try {
    mkdirSync(join(sheetDir, "thumbs"), { recursive: true });
    const shown = groups[0].rows.at(-1).tiles;
    await pool(shown.map((t, k) => () => ff(["-i", t.src, "-q:v", "4", join(sheetDir, "thumbs", `fix_${k}.jpg`)])));
    mark(at, "sheets", (q) => {
      q.frames = shown.map((t, k) => ({ src: relative(at.dir, join(sheetDir, "thumbs", `fix_${k}.jpg`)).split("\\").join("/"), caption: t.label }));
      q.framesFrom = `round ${round}'s fixes`;
      return q;
    });
  } catch {}
  rmSync(tmp, { recursive: true, force: true });
  mark(at, "scores", (q) => ((q.round = round), q));
  return {
    code: 0,
    lines: [
      `Round ${round} of video v${version}: the fixes, ${renders.length} stretch${renders.length === 1 ? "" : "es"} rendered by ${renders.length === 1 ? "itself" : "themselves"}.`,
      ...renders.map((x) => x.summary),
      `Fix sheet: ${sheets.map((f) => relative(at.dir, f)).join(", ")}: each stretch ${before ? `before (${basename(before)}) and ` : ""}after, at the same moments. HyperFrames renders a stretch without the film's motion blur: judge the smear on the whole draft.`,
      `Next: score round ${round} (what the fixes didn't touch stands as last scored), then: studio.mjs progress ${at.slug} fixes --round ${round} --scores … --fix "<where>: <what>". Once every score is 8 or more, the whole draft for the user: studio.mjs draft ${at.slug}`,
    ],
  };
}

/** The video's size as a file name has it: 16x9, 1x1, 4x5, 9x16, or WxH. */
function sizeLabel(film) {
  const named = { "1920x1080": "16x9", "1080x1080": "1x1", "1080x1350": "4x5", "1080x1920": "9x16" };
  return named[`${film.width}x${film.height}`] || `${film.width}x${film.height}`;
}

/** `final <video>`: the master and everything delivered with it, once the user has approved the video. */
export async function makeFinal(at, { log = () => {} } = {}) {
  const versions = reviewVersions(at.root, at.slug);
  const v = versions.at(-1);
  const review = v ? readReview(at.root, at.slug, v) : null;
  if (review?.feedback?.decision !== "approved") return { code: 1, lines: [v ? `Video v${v} isn't approved yet: the final video is made once the user approves it on its review page.` : "There's no video review yet: the final video comes after the user approves one."] };
  const film = readFilm(at.root, at.slug);
  // the master: renders/<video>_<size>.mp4, or _v2 and on after one delivered before this approval (a revision)
  const approved = statSync(join(review.dir, "feedback.json")).mtimeMs;
  const base = `${at.slug}_${sizeLabel(film)}`;
  let name = `${base}.mp4`;
  for (let n = 2; existsSync(join(at.dir, "renders", name)) && statSync(join(at.dir, "renders", name)).mtimeMs < approved; n++) name = `${base}_v${n}.mp4`;
  const out = join("renders", name);
  startStage(at.root, at.slug, "final", v, "master");
  const stop = await gate(at, log);
  if (stop) return { code: 1, lines: stop };
  log("The master…");
  const made = await renderVideo(at, ["--quality", "delivery", "--fps", "60", "--output", out]);
  if (made.code) return { code: made.code, lines: [made.summary] };
  const lines = [`The final video of ${at.slug}, from video v${v}.`, made.summary];
  // the web copy, poster, thumbnail and contact sheet (the web copy ends the stage on the overview)
  mark(at, "extras");
  const s = spawnSync(process.execPath, [SHEETS, out, "--deliver"], { cwd: at.dir, encoding: "utf8" });
  lines.push(s.status === 0 ? `Delivery files: ${s.stdout.trim().replaceAll(`${join(at.dir, "renders")}/`, "renders/")}` : `The web copy and poster weren't made: ${(s.stderr || s.stdout).trim().split("\n").pop()}`);
  // the captions, when there's speech
  const speech = speechFile(film.dir, film.brief, film.script?.script, film.media);
  if (speech) {
    lines.push(writeCaptions(at.dir, speech));
  } else if (film.brief.type === "footage" || film.script?.script?.mode === "footage") lines.push("No captions: no <video> in the cut plays a take with a transcript (footage/transcripts/), so there are no words for them.");
  else lines.push("No captions: the film has no speech.");
  log("The checks on the master…");
  const { report, path } = await checkFilm(at.root, at.slug, { render: made.file, reuse: true, log });
  lines.push(describeReport(report, { path: relative(at.root, path) }));
  return { code: 0, lines, delivery: `/videos/${encodeURIComponent(at.slug)}/delivery/` };
}
