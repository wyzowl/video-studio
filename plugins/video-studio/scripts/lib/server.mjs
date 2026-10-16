// The studio page server: dashboard, brand pages, video overviews, script, storyboard and video review pages, and the
// studio's own files. Listens on 127.0.0.1 only. It writes the feedback.json files saved from the review pages, and
// its own note in .studio/ when Claude picks up a review. To share outside the studio, scripts and storyboards download
// as PDFs (each leaving a copy in its version's folder) and videos under review as video files.
import http from "node:http";
import { spawn } from "node:child_process";
import { createReadStream, statSync, writeFileSync, renameSync } from "node:fs";
import { join, relative, resolve, sep, extname } from "node:path";
import {
  PLUGIN_ROOT,
  readStudio,
  readJSON,
  pluginVersion,
  summariseFeedback,
  summariseReview,
  scriptVersions,
  scriptRows,
  scriptHasVoiceover,
  storyboardVersions,
  reviewVersions,
  readReview,
  readVideo,
  readBrand,
  pageStamp,
  claudeWaiting,
  markWorking,
} from "./studio.mjs";
import { dashboardPage, brandPage, projectPage, scriptPage, storyboardPage, reviewPage, libraryPage, itemPage, page404 } from "./pages.mjs";
import { scriptPrint, storyboardPrint } from "./print.mjs";
import { CATEGORIES, libraryItem, previewDocument, SIZES } from "./library.mjs";
import { renderPdf, shareName, attachment } from "./pdf.mjs";
import { PREVIEWS_DIR, checkLibrary } from "./paid.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const SCENE_ID = (s, i) => String(s.id || `s${String(i + 1).padStart(2, "0")}`);
const PROJECT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PRINT = { script: scriptPrint, storyboard: storyboardPrint };

export function createStudioServer(root) {
  const studioRoot = resolve(root);
  const uiRoot = join(PLUGIN_ROOT, "ui");
  // pages on screen right now: live.js asks for its page's stamp every 2 seconds while the page is visible
  const onScreen = new Map();
  return http.createServer(async (req, res) => {
    try {
      // refuse requests addressed to any other host name (guards against DNS rebinding)
      const host = String(req.headers.host || "").replace(/:\d+$/, "");
      if (!LOCAL_HOSTS.has(host)) return text(res, 403, "Forbidden");
      const url = new URL(req.url, "http://127.0.0.1");
      let path;
      try {
        path = decodeURIComponent(url.pathname);
      } catch {
        return text(res, 400, "Bad request");
      }
      if (req.method === "POST" && path === "/api/feedback") return await saveFeedback(req, res, studioRoot);
      if (req.method === "POST" && path === "/api/review") return await saveReview(req, res, studioRoot);
      if (req.method === "POST" && path === "/api/script") return await saveScript(req, res, studioRoot);
      if (req.method === "POST" && path === "/api/reveal") return await reveal(req, res, studioRoot);
      if (req.method === "POST" && path === "/api/licence") return await licencePost(req, res);
      if (req.method !== "GET" && req.method !== "HEAD") return text(res, 405, "Method not allowed");

      if (path === "/api/status") {
        for (const [p, seen] of onScreen) if (Date.now() - seen.at > 5000) onScreen.delete(p);
        const open = [...onScreen].map(([p, seen]) => ({ path: p, unsaved: seen.unsaved }));
        return json(res, 200, { ok: true, studio: studioRoot, plugin: pluginVersion(), pid: process.pid, open });
      }
      if (path === "/api/stamp") {
        let page = url.searchParams.get("path") || "/";
        try {
          page = decodeURIComponent(page);
        } catch {}
        onScreen.set(page, { at: Date.now(), unsaved: url.searchParams.get("unsaved") === "1" });
        return json(res, 200, { ...pageStamp(studioRoot, page), waiting: claudeWaiting(studioRoot, page) });
      }
      const studio = readStudio(studioRoot);
      if (path === "/" || path === "/index.html") return html(res, 200, dashboardPage(studio));
      if (path.startsWith("/ui/")) return file(req, res, uiRoot, path.slice(4));

      let m;
      if ((m = /^\/brands\/([^/]+)\/?$/.exec(path))) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/`);
        const page = brandPage(studio, m[1]);
        return html(res, page.status, page.html);
      }
      if ((m = /^\/videos\/([^/]+)\/?$/.exec(path))) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/`);
        const page = projectPage(studio, m[1]);
        return html(res, page.status, page.html);
      }
      if ((m = /^\/videos\/([^/]+)\/script\/?$/.exec(path))) {
        const latest = scriptVersions(studioRoot, m[1]).at(-1);
        if (!latest) return html(res, 404, page404(studio, `A script for “${m[1]}”`));
        return redirect(res, `/videos/${encodeURIComponent(m[1])}/script/v${latest}/`);
      }
      if ((m = /^\/videos\/([^/]+)\/script\/v(\d+)\/?$/.exec(path))) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/`);
        const page = scriptPage(studio, m[1], Number(m[2]));
        return html(res, page.status, page.html);
      }
      if ((m = /^\/videos\/([^/]+)\/storyboard\/?$/.exec(path))) {
        const latest = storyboardVersions(studioRoot, m[1]).at(-1);
        if (!latest) return html(res, 404, page404(studio, `A storyboard for “${m[1]}”`));
        return redirect(res, `/videos/${encodeURIComponent(m[1])}/storyboard/v${latest}/`);
      }
      if ((m = /^\/videos\/([^/]+)\/storyboard\/v(\d+)\/?$/.exec(path))) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/`);
        const page = storyboardPage(studio, m[1], Number(m[2]));
        return html(res, page.status, page.html);
      }
      if ((m = /^\/videos\/([^/]+)\/review\/?$/.exec(path))) {
        const latest = reviewVersions(studioRoot, m[1]).at(-1);
        if (!latest) return html(res, 404, page404(studio, `A video review for “${m[1]}”`));
        return redirect(res, `/videos/${encodeURIComponent(m[1])}/review/v${latest}/`);
      }
      if ((m = /^\/videos\/([^/]+)\/review\/v(\d+)\/?$/.exec(path))) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/`);
        const page = reviewPage(studio, m[1], Number(m[2]));
        return html(res, page.status, page.html);
      }
      // the library opens on its first category; each category has a page, and each item a page of its own
      if (path === "/library" || path === "/library/") return redirect(res, `/library/${Object.keys(CATEGORIES)[0]}/${url.search}`);
      if ((m = /^\/library\/([a-z-]+)\/?$/.exec(path)) && Object.hasOwn(CATEGORIES, m[1])) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/${url.search}`);
        return html(res, 200, libraryPage(studio, m[1], url.searchParams));
      }
      if ((m = /^\/library\/([a-z-]+)\/([A-Za-z0-9]+)\/?$/.exec(path)) && Object.hasOwn(CATEGORIES, m[1])) {
        if (!path.endsWith("/")) return redirect(res, `${url.pathname}/${url.search}`);
        const page = itemPage(studio, m[1], m[2], url.searchParams);
        return html(res, page.status, page.html);
      }
      // the galleries' old addresses (before 0.3.0)
      if ((m = /^\/(widgets|layouts|text-effects)(\/[A-Za-z0-9]+)?\/?$/.exec(path))) return redirect(res, `/library/${m[1]}${m[2] || ""}/${url.search}`);
      // a locked paid item's preview video (and its poster), which the plugin carries
      if ((m = /^\/library\/previews\/([a-z0-9-]+\.png)$/.exec(path))) return file(req, res, PREVIEWS_DIR, m[1]);
      // a library item playing on its own, in a brand and size: the library shows these in frames
      if ((m = /^\/(?:library|gallery)\/preview\/([A-Za-z0-9]+)\/?$/.exec(path))) {
        const item = libraryItem(m[1]);
        if (!item) return html(res, 404, page404(studio, `The library item “${m[1]}”`));
        const slug = url.searchParams.get("brand") || "";
        const brand = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug) ? readBrand(studioRoot, slug) : null;
        const size = SIZES[url.searchParams.get("size")] ? url.searchParams.get("size") : "16x9";
        const at = url.searchParams.get("at");
        const bg = url.searchParams.get("bg") === "none" ? "none" : "";
        let vars = {};
        try {
          const given = JSON.parse(url.searchParams.get("vars") || "{}");
          if (given && typeof given === "object" && !Array.isArray(given)) vars = given;
        } catch {}
        return html(res, 200, previewDocument(item, { brand, size, at: at === null ? null : Number(at), vars, bg }));
      }
      // to share outside the studio: the print version of a script or storyboard, the PDF made from it, and a video's file
      if ((m = /^\/videos\/([^/]+)\/(script|storyboard)\/v(\d+)\/print\/?$/.exec(path)) && PROJECT.test(m[1])) {
        const doc = PRINT[m[2]](studio, m[1], Number(m[3]));
        return doc ? html(res, 200, doc.html) : html(res, 404, page404(studio, `${m[2] === "script" ? "Script" : "Storyboard"} v${m[3]} for “${m[1]}”`));
      }
      if ((m = /^\/videos\/([^/]+)\/(script|storyboard)\/v(\d+)\/download\/?$/.exec(path)) && PROJECT.test(m[1])) {
        return await downloadPdf(req, res, studio, m[1], m[2], Number(m[3]));
      }
      if ((m = /^\/videos\/([^/]+)\/review\/v(\d+)\/download\/?$/.exec(path)) && PROJECT.test(m[1])) {
        return downloadDraft(req, res, studio, m[1], Number(m[2]));
      }
      if (path.startsWith("/brands/") || path.startsWith("/videos/")) return file(req, res, studioRoot, path.slice(1));
      return html(res, 404, page404(studio, "That page"));
    } catch (err) {
      if (!res.headersSent) text(res, 500, `Server error: ${err.message}`);
      else res.end();
    }
  });
}

function text(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}
function html(res, status, body) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}
function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
function redirect(res, location) {
  res.writeHead(302, { location });
  res.end();
}

/** Serve a file from inside `base`, with byte ranges so videos can seek. Hidden files and folders are never served.
    `extra` adds headers (a download's file name). */
function file(req, res, base, rel, extra = {}) {
  const root = resolve(base);
  const target = resolve(root, rel);
  if (!target.startsWith(root + sep)) return text(res, 403, "Forbidden");
  if (target.slice(root.length + 1).split(sep).some((seg) => seg.startsWith("."))) return text(res, 404, "Not found");
  let st;
  try {
    st = statSync(target);
  } catch {
    return text(res, 404, "Not found");
  }
  if (!st.isFile()) return text(res, 404, "Not found");
  const headers = {
    "content-type": MIME[extname(target).toLowerCase()] || "application/octet-stream",
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
    "last-modified": st.mtime.toUTCString(),
    ...extra,
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : st.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : st.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, st.size - 1);
    if (start > end || start >= st.size) {
      res.writeHead(416, { "content-range": `bytes */${st.size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${st.size}`, "content-length": end - start + 1 });
    if (req.method === "HEAD") return res.end();
    return createReadStream(target, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, "content-length": st.size });
  if (req.method === "HEAD") return res.end();
  createReadStream(target).pipe(res);
}

function readBody(req, limit) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        fail(new Error("Request too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
}

/** Shared checks for a POST from a studio page: same-origin and a JSON body. */
async function readPost(req, res) {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return json(res, 403, { ok: false, error: "Forbidden origin" }), null;
  try {
    return JSON.parse(await readBody(req, 1_000_000)) || {};
  } catch (err) {
    return json(res, 400, { ok: false, error: err.message === "Request too large" ? err.message : "The request wasn't valid JSON" }), null;
  }
}

/** POST /api/licence — from the library page: { key } unlocks the full library on this Mac with a new key; {} checks
    for new items with the key it has. Answers with the check's result (status, message, version, items). */
async function licencePost(req, res) {
  const data = await readPost(req, res);
  if (!data) return;
  const key = typeof data.key === "string" ? data.key.slice(0, 64) : "";
  const result = await checkLibrary({ key });
  return json(res, 200, { ok: result.status === "ok", ...result });
}

/** Shared checks for a POSTed review: those above, plus a known project and version number. */
async function readReviewPost(req, res) {
  const data = await readPost(req, res);
  if (!data) return null;
  const { project, version } = data;
  if (typeof project !== "string" || !PROJECT.test(project)) return json(res, 400, { ok: false, error: "Unknown project" }), null;
  if (!Number.isInteger(version) || version < 1) return json(res, 400, { ok: false, error: "Unknown version" }), null;
  return data;
}

/** GET …/script/v<N>/download or …/storyboard/v<N>/download — the version as a PDF, made from its print page. A copy
    is kept in the version's folder; the x-studio-file header says where (from the studio folder). */
async function downloadPdf(req, res, studio, slug, kind, version) {
  const doc = PRINT[kind](studio, slug, version);
  if (!doc) return html(res, 404, page404(studio, `${kind === "script" ? "Script" : "Storyboard"} v${version} for “${slug}”`));
  let pdf;
  try {
    pdf = await renderPdf(`http://${req.headers.host}/videos/${encodeURIComponent(slug)}/${kind}/v${version}/print/`);
  } catch (err) {
    if (/wasn't found/.test(err.message)) {
      return text(res, 503, "PDFs are made with the Chrome that HyperFrames installs, and it isn't on this Mac yet. In Claude Code, run /video-studio:setup: its test render installs it.");
    }
    return text(res, 500, `The PDF couldn't be made: ${err.message}`);
  }
  const name = shareName(doc.title, doc.what, "pdf");
  const copy = join(studio.root, "videos", slug, kind, `v${version}`, name);
  const headers = { "content-type": "application/pdf", "content-length": pdf.length, "content-disposition": attachment(name), "cache-control": "no-store" };
  try {
    writeFileSync(copy, pdf);
    headers["x-studio-file"] = encodeURIComponent(relative(studio.root, copy));
  } catch {}
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : pdf);
}

/** GET …/review/v<N>/download — the video file under review, named for the video and its version. */
function downloadDraft(req, res, studio, slug, version) {
  const data = reviewVersions(studio.root, slug).includes(version) ? readReview(studio.root, slug, version) : null;
  const rv = data?.review;
  if (!rv?.video) return html(res, 404, page404(studio, `Video v${version} of “${slug}”`));
  const title = rv.title || readVideo(studio.root, slug)?.title || slug;
  const name = shareName(title, `Video v${version}`, extname(rv.video).slice(1).toLowerCase() || "mp4");
  return file(req, res, join(studio.root, "videos", slug), rv.video, { "content-disposition": attachment(name) });
}

/** POST /api/reveal — show a downloaded PDF's copy in Finder, ready to attach to an email. Only a PDF in a script or
    storyboard version's folder, and only on a Mac. */
async function reveal(req, res, root) {
  const data = await readPost(req, res);
  if (!data) return;
  const rel = typeof data.path === "string" ? data.path : "";
  const target = resolve(root, rel);
  const ok = target.startsWith(root + sep) && /^videos\/[^/]+\/(script|storyboard)\/v\d+\/[^/]+\.pdf$/.test(relative(root, target).split(sep).join("/"));
  if (!ok || !statSync(target, { throwIfNoEntry: false })?.isFile()) return json(res, 404, { ok: false, error: "That file wasn't found" });
  if (process.platform !== "darwin") return json(res, 501, { ok: false, error: "Show in Finder works on a Mac" });
  spawn("open", ["-R", target], { stdio: "ignore", detached: true }).unref();
  return json(res, 200, { ok: true });
}

function writeAtomic(target, value) {
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, target);
}

/** A script or video review's decision: Approve or Changes needed, as chosen; without one, Approve unless there are
    notes (a page from before there were only two choices can still send "undecided"). */
const decisionOf = (data, notes) =>
  ["approved", "changes"].includes(data.decision) ? data.decision : notes.length || (typeof data.general === "string" && data.general.trim()) ? "changes" : "approved";

/** POST /api/script — save a script review as videos/<project>/script/v<N>/feedback.json: notes pinned to cells (a
    row and a column, as the page numbers and names them), general notes and the decision. */
async function saveScript(req, res, root) {
  const data = await readReviewPost(req, res);
  if (!data) return;
  const { project, version } = data;
  const dir = join(root, "videos", project, "script", `v${version}`);
  const script = readJSON(join(dir, "script.json"));
  if (!script) return json(res, 404, { ok: false, error: `No script v${version} for ${project}` });
  const latest = scriptVersions(root, project).at(-1);
  if (version !== latest) return json(res, 409, { ok: false, error: `A newer script (v${latest}) exists; review that one` });
  const rows = new Map(scriptRows(script).map((row) => [row.id, row.n]));
  const columns = { words: scriptHasVoiceover(script) ? "Voiceover" : "Text on screen", action: "Action on screen" };
  const notes = (Array.isArray(data.notes) ? data.notes : [])
    .slice(0, 500)
    .map((n) => ({ rowId: String(n?.rowId ?? ""), cell: String(n?.cell ?? ""), text: typeof n?.text === "string" ? n.text.trim().slice(0, 2000) : "" }))
    .filter((n) => rows.has(n.rowId) && Object.hasOwn(columns, n.cell) && n.text)
    .map((n) => ({ row: rows.get(n.rowId), column: columns[n.cell], text: n.text, rowId: n.rowId, cell: n.cell }))
    .sort((a, b) => a.row - b.row || (a.cell === "action") - (b.cell === "action"));
  const record = {
    project,
    version,
    savedAt: new Date().toISOString(),
    decision: decisionOf(data, notes),
    notes,
    general: typeof data.general === "string" ? data.general.trim().slice(0, 10000) : "",
  };
  record.summary = summariseReview(record);
  writeAtomic(join(dir, "feedback.json"), record);
  // finished: Claude, if it's waiting (studio.mjs wait), picks the review up now
  const finished = record.summary.decision !== "undecided";
  const claude = claudeWaiting(root, `/videos/${project}/script/v${version}/`);
  if (finished && claude) markWorking(root, project, { stage: "script", version, outcome: record.summary.decision });
  return json(res, 200, { ok: true, savedAt: record.savedAt, summary: record.summary, finished, claude });
}

/** POST /api/review — save a video review as videos/<project>/review/v<N>/feedback.json */
async function saveReview(req, res, root) {
  const data = await readReviewPost(req, res);
  if (!data) return;
  const { project, version } = data;
  const dir = join(root, "videos", project, "review", `v${version}`);
  const rv = readJSON(join(dir, "review.json"));
  if (!rv) return json(res, 404, { ok: false, error: `No video review v${version} for ${project}` });
  const latest = reviewVersions(root, project).at(-1);
  if (version !== latest) return json(res, 409, { ok: false, error: `A newer version (v${latest}) exists; review that one` });
  const limit = Number.isFinite(+rv.duration) ? +rv.duration + 5 : Infinity;
  const notes = (Array.isArray(data.notes) ? data.notes : [])
    .slice(0, 300)
    .map((n) => ({ time: Math.round(Math.min(Math.max(0, Number(n?.time) || 0), limit) * 10) / 10, text: typeof n?.text === "string" ? n.text.trim().slice(0, 2000) : "" }))
    .filter((n) => n.text)
    .sort((a, b) => a.time - b.time);
  const record = {
    project,
    version,
    savedAt: new Date().toISOString(),
    decision: decisionOf(data, notes),
    notes,
    general: typeof data.general === "string" ? data.general.trim().slice(0, 10000) : "",
  };
  record.summary = summariseReview(record);
  writeAtomic(join(dir, "feedback.json"), record);
  // finished: Claude, if it's waiting (studio.mjs wait), picks the review up now
  const finished = record.summary.decision !== "undecided";
  const claude = claudeWaiting(root, `/videos/${project}/review/v${version}/`);
  if (finished && claude) markWorking(root, project, { stage: "review", version, outcome: record.summary.decision });
  return json(res, 200, { ok: true, savedAt: record.savedAt, summary: record.summary, finished, claude });
}

/** POST /api/feedback — save a storyboard review as videos/<project>/storyboard/v<N>/feedback.json */
async function saveFeedback(req, res, root) {
  const data = await readReviewPost(req, res);
  if (!data) return;
  const { project, version } = data;
  const dir = join(root, "videos", project, "storyboard", `v${version}`);
  const sb = readJSON(join(dir, "storyboard.json"));
  if (!sb) return json(res, 404, { ok: false, error: `No storyboard v${version} for ${project}` });
  const latest = storyboardVersions(root, project).at(-1);
  if (version !== latest) return json(res, 409, { ok: false, error: `A newer storyboard (v${latest}) exists; review that one` });

  const scenes = {};
  (sb.scenes || []).forEach((s, i) => {
    const id = SCENE_ID(s, i);
    const sent = data.scenes?.[id] || {};
    // a scene is approved unless it's marked for feedback
    const status = sent.status === "feedback" ? "feedback" : "approved";
    const note = typeof sent.note === "string" ? sent.note.trim().slice(0, 5000) : "";
    scenes[id] = status === "feedback" ? { status, note } : { status };
  });
  const record = {
    project,
    version,
    savedAt: new Date().toISOString(),
    scenes,
    general: typeof data.general === "string" ? data.general.trim().slice(0, 10000) : "",
  };
  record.summary = summariseFeedback(sb, record);
  writeAtomic(join(dir, "feedback.json"), record);
  // finished: Claude, if it's waiting (studio.mjs wait), picks the review up now
  const finished = record.summary.scenes > 0 && record.summary.unreviewed === 0;
  const claude = claudeWaiting(root, `/videos/${project}/storyboard/v${version}/`);
  if (finished && claude) markWorking(root, project, { stage: "storyboard", version, outcome: record.summary.allApproved ? "approved" : "feedback" });
  return json(res, 200, { ok: true, savedAt: record.savedAt, summary: record.summary, finished, claude });
}
