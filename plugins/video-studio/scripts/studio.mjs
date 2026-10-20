#!/usr/bin/env node
// Wyzowl Video Studio helper.
//   node studio.mjs init <folder> [--name "My Studio"]   create (or update) a studio folder
//   node studio.mjs context                    the studio as markdown, for Claude
//   node studio.mjs hook                       SessionStart hook output (JSON)
//   node studio.mjs url [path]                 start the page server if needed and print the page's address
//   node studio.mjs open [path]                the same, then open it in the default web browser
//   node studio.mjs show [path]                how Claude should show the page: beside the chat, a card, and waiting
//   node studio.mjs wait <path>                wait until the user finishes reviewing a script, storyboard or video
//                                              (Claude runs it in the background: finishing wakes Claude to carry on)
//   node studio.mjs ready                      the page waiting for the user's review, and what Claude is making, as
//                                              JSON, for the band above Claude's message box (hooks/index.tsx)
//   node studio.mjs progress <video> <stage> <version> <step>
//                                              start a stage on the video's pages (script, storyboard, video or
//                                              final), at a step; then `progress <video> <step>` for each next step.
//                                              --round <n>, --scores hook=8,phone=6,… and --fix "<where>: <what>"
//                                              (up to five) give a review round's scores and what's being fixed;
//                                              --end ends the stage without its result
//   node studio.mjs render [HF render options]  `HF render …` with the project's HyperFrames, run from the video's
//                                              folder, that also shows the render's progress on the video's pages
//   node studio.mjs pdf <path>                 make the PDF of a script or storyboard version, to share outside the
//                                              studio (as its page's Download PDF does), and print where it's saved
//   node studio.mjs library [code] [--brand b] the library's items; with a code, how to use that item in a video,
//                                              with its settings for a brand and the size (--size 9x16) filled in;
//                                              with --still <seconds> --out <file.png> [--set key=value …], a
//                                              transparent still of it at that moment, to lay over a storyboard frame
//                                              (`gallery` is the same command, its name before 0.3.0)
//   node studio.mjs library check [--force]    ask the Wyzowl site for new paid items now (the studio also asks once a
//                                              day, when a session starts); --force downloads the pack again
//   node studio.mjs licence [<key>]            with a key, unlock the full library on this Mac; without, its state
//   node studio.mjs install cutout             download the presenter cut-out model (about 168 MB, once), for text
//                                              behind the presenter
//   node studio.mjs install sfx-kit            download SFX Kit, the studio's sound effects (about 55 MB, once)
//   node studio.mjs tidy <video> [--yes]       what tidying up a finished video would remove (its drafts, review
//                                              stills, replaced storyboards, footage previews and edit history) and
//                                              keep; with --yes, remove them, once the user has said yes
//                                              (--unfinished: a video with no final render yet, asked for by name)
//   node studio.mjs tidy --all [--yes]         the same for every finished video, and the edit history of deleted ones
//   node studio.mjs tidy --deleted [--yes]     just the edit history HyperFrames still keeps for deleted videos
//   node studio.mjs install all [--wait]       everything Video Studio needs that isn't on this Mac yet, smallest
//                                              first, shown on the Setup and Studio health pages as it goes (--wait:
//                                              if another session is already downloading, wait for it to finish)
//   node studio.mjs setup-page                 the Setup page's address, starting a page server for it (before there's
//                                              a studio, one that serves only that page)
//   node studio.mjs setup-note <check> <installing|failed|clear>
//                                              say on the Setup page that a check's install is under way (or failed)
//   node studio.mjs serve [--port 4747]        run the page server in the foreground (--setup: before there's a studio,
//                                              the Setup page alone)
//   node studio.mjs stop                       stop the page server
//   node studio.mjs page-ready                 PostToolUse hook: reads the hook's JSON on stdin; when Claude has written
//                                              a page's data file, tells Claude the page is ready to show
// --studio <folder> picks the studio. By default it's the studio containing the current folder; for pages it falls
// back to the user's most recent studio. Only one studio's page server runs at a time.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PLUGIN_ROOT,
  claudeWaiting,
  findStudio,
  formatDate,
  formatDateTime,
  listBrands,
  listVideos,
  pageForFile,
  pluginVersion,
  readJSON,
  readStudio,
  readBrand,
  readBrief,
  readFavourites,
  readVideo,
  sawWhatsNew,
  USER_DIR,
  registeredStudios,
  registerStudio,
  resolvePage,
  reviewState,
  setWaiting,
} from "./lib/studio.mjs";
import { showInstructions } from "./lib/show.mjs";
import { SCORES, STAGES, endStage, readProgress, startStage, stageTitle, stepsFor, stepsNow, updateProgress, videoAt } from "./lib/progress.mjs";
import { EXTRAS, newer } from "./lib/extras.mjs";
import { KIT_DIR, SFX_KIT, installKit, kitInstalled } from "./lib/sfx.mjs";
import { HYPERFRAMES, HYPERFRAMES_ENV, HYPERFRAMES_VERSION } from "./lib/versions.mjs";
import { CATEGORIES, SIZES, BRAND_VARS, BUNDLED_FONTS, libraryItems, libraryItem, lockedItems, findItem, contentVariables, brandStyle, itemLayer } from "./lib/library.mjs";
import { catalogue, checkDue, checkLibrary, installedPack, licence } from "./lib/paid.mjs";
import { goneHistories, sizeLabel, studioTidy, tidyGone, tidyPlan, tidyVideo, tidyWhat } from "./lib/tidy.mjs";

const SELF = fileURLToPath(import.meta.url);
// HyperFrames' switches, for every HyperFrames run from here (renders, models, cut-outs): no usage data, no update check
for (const [name, value] of Object.entries(HYPERFRAMES_ENV)) process.env[name] ??= value;
const PORT = 4747;
const PORTS = Array.from({ length: 10 }, (_, i) => PORT + i);
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const [cmd = "context", arg] = positional;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// commands whose output is shown inside slash commands: they always exit 0 and explain any problem in words
const FRIENDLY = new Set(["context", "open", "url", "show"]);
const NOT_A_STUDIO = "Not inside a Wyzowl Video Studio folder (no studio.json here or above).";

function here() {
  return opt("--studio") ? resolve(opt("--studio")) : findStudio(process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

/** The studio to act on. Pages may fall back to the user's most recent studio. */
function studioRoot({ forPages = false } = {}) {
  const root = here() || (forPages ? registeredStudios()[0]?.path : null);
  if (root) return root;
  const known = registeredStudios()[0];
  console.log(
    known
      ? `${NOT_A_STUDIO} Your studio is ${known.path}: open Claude Code in that folder to work on videos.`
      : `${NOT_A_STUDIO} Run /video-studio:setup to create a studio.`,
  );
  process.exit(FRIENDLY.has(cmd) ? 0 : 2);
}

async function status(port) {
  try {
    // AbortSignal.timeout doesn't keep Node running after a refused connection, as a plain setTimeout would
    const res = await fetch(`http://127.0.0.1:${port}/api/status`, { signal: AbortSignal.timeout(600) });
    const body = await res.json();
    return body?.ok && (body.studio || body.setup) ? { ...body, port } : null;
  } catch {
    return null;
  }
}

/** Every studio page server running on this Mac (there should be at most one). */
async function runningServers() {
  return (await Promise.all(PORTS.map(status))).filter(Boolean);
}

async function stopServer(s) {
  try {
    process.kill(s.pid);
  } catch {}
  for (let i = 0; i < 20 && (await status(s.port)); i++) await sleep(100);
}

/** One page server at a time: reuse this studio's if it's current, otherwise stop the others and start ours. */
async function ensureServer(root) {
  let mine = null;
  for (const s of await runningServers()) {
    if (!mine && s.studio === root && s.plugin === pluginVersion()) mine = s;
    else await stopServer(s);
  }
  if (mine) return `http://127.0.0.1:${mine.port}/`;
  mkdirSync(join(root, ".studio"), { recursive: true });
  const log = openSync(join(root, ".studio", "server.log"), "a");
  const child = spawn(process.execPath, [SELF, "serve", "--studio", root], { detached: true, stdio: ["ignore", log, log] });
  child.unref();
  for (let i = 0; i < 60; i++) {
    await sleep(100);
    const st = readJSON(join(root, ".studio", "server.json"));
    if (st?.pid === child.pid && (await status(st.port))) return st.url;
  }
  throw new Error(`The page server didn't start. See ${join(root, ".studio", "server.log")}`);
}

const pageUrl = (base, path) => (path ? base.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`) : base);

async function main() {
  if (cmd === "init") {
    if (!arg) throw new Error('usage: studio.mjs init <folder> [--name "My Studio"]');
    return init(resolve(arg));
  }

  if (cmd === "serve" && argv.includes("--setup")) return serveSetup();
  if (cmd === "serve") {
    const root = studioRoot();
    const { createStudioServer } = await import("./lib/server.mjs");
    const server = createStudioServer(root);
    for (const port of PORTS) {
      const ok = await new Promise((done, fail) => {
        server.once("error", (e) => (e.code === "EADDRINUSE" ? done(false) : fail(e)));
        server.listen(port, "127.0.0.1", () => done(true));
      });
      if (!ok) continue;
      const url = `http://127.0.0.1:${port}/`;
      const stateFile = join(root, ".studio", "server.json");
      mkdirSync(join(root, ".studio"), { recursive: true });
      writeFileSync(stateFile, JSON.stringify({ pid: process.pid, port, url, plugin: pluginVersion(), startedAt: new Date().toISOString() }, null, 2));
      console.log(`Wyzowl Video Studio pages for ${root}: ${url}`);
      const cleanup = () => {
        if (readJSON(stateFile)?.pid === process.pid) rmSync(stateFile, { force: true });
        process.exit(0);
      };
      process.on("SIGTERM", cleanup);
      process.on("SIGINT", cleanup);
      return;
    }
    throw new Error(`No free port between ${PORTS[0]} and ${PORTS.at(-1)}`);
  }

  if (cmd === "url" || cmd === "open") {
    const root = studioRoot({ forPages: true });
    const url = pageUrl(await ensureServer(root), arg);
    if (cmd === "open" && process.platform === "darwin") spawnSync("open", [url]);
    console.log(url);
    return;
  }

  if (cmd === "stop") {
    const servers = await runningServers();
    for (const s of servers) await stopServer(s);
    console.log(servers.length ? "Page server stopped." : "No page server was running.");
    return;
  }

  if (cmd === "show") return show();
  if (cmd === "setup-page") return setupPage();
  if (cmd === "setup-note") return setupNote();
  if (cmd === "ready") return ready();
  if (cmd === "progress") return progressCommand();
  if (cmd === "render") return renderCommand();
  if (cmd === "pdf") return pdf();
  if ((cmd === "library" || cmd === "gallery") && arg === "check") return libraryCheck();
  if (cmd === "library" || cmd === "gallery") return library();
  if (cmd === "licence" || cmd === "license") return licenceCommand();
  if (cmd === "install") return install();
  if (cmd === "tidy") return tidyCommand();
  if (cmd === "wait") return waitForReview();
  if (cmd === "hook") return hook();
  if (cmd === "page-ready") return pageReady().catch(() => {}); // a hook: never in the way, silent on any problem
  if (cmd === "context") return context();
  throw new Error(`Unknown command "${cmd}". Try: init, context, hook, url, open, show, wait, ready, progress, render, setup-page, setup-note, pdf, library, install, tidy, serve, stop, page-ready`);
}

function init(root) {
  const created = [];
  const kept = [];
  for (const d of ["brands", "videos", ".studio"]) {
    if (!existsSync(join(root, d))) created.push(`${d}/`);
    mkdirSync(join(root, d), { recursive: true });
  }
  const studioPath = join(root, "studio.json");
  const prev = readJSON(studioPath, {});
  const next = {
    name: opt("--name") || prev.name || "Video Studio",
    created: prev.created || new Date().toISOString(),
    plugin: pluginVersion(),
    // new videos start on Video Studio's pinned HyperFrames (lib/versions.mjs)
    hyperframes: HYPERFRAMES_VERSION,
    schema: 1,
  };
  writeFileSync(studioPath, `${JSON.stringify(next, null, 2)}\n`);
  (prev.created ? kept : created).push("studio.json");
  const copy = (template, name) => {
    const target = join(root, name);
    if (existsSync(target)) return kept.push(name);
    writeFileSync(target, readFileSync(join(PLUGIN_ROOT, "templates", template), "utf8"));
    created.push(name);
  };
  copy("studio-CLAUDE.md", "CLAUDE.md");
  copy("studio-gitignore", ".gitignore");
  // a new studio has nothing to catch up on: its dashboard's "What's new" starts with the next update
  if (!prev.created) sawWhatsNew(root);
  registerStudio(root, next.name);
  console.log(JSON.stringify({ studio: root, ...next, filesCreated: created, filesKept: kept }, null, 2));
}

/** `serve --setup`: before there's a studio, a page server for the Setup page alone, which setup opens first. Once the
    studio exists, its own page server takes over (and the Setup page with it). */
async function serveSetup() {
  const { createSetupServer } = await import("./lib/server.mjs");
  const server = createSetupServer();
  for (const port of PORTS) {
    const ok = await new Promise((done, fail) => {
      server.once("error", (e) => (e.code === "EADDRINUSE" ? done(false) : fail(e)));
      server.listen(port, "127.0.0.1", () => done(true));
    });
    if (!ok) continue;
    const url = `http://127.0.0.1:${port}/`;
    const stateFile = join(USER_DIR, "setup-server.json");
    mkdirSync(USER_DIR, { recursive: true });
    writeFileSync(stateFile, JSON.stringify({ pid: process.pid, port, url, plugin: pluginVersion(), startedAt: new Date().toISOString() }, null, 2));
    console.log(`Wyzowl Video Studio setup page: ${url}setup`);
    const cleanup = () => {
      if (readJSON(stateFile)?.pid === process.pid) rmSync(stateFile, { force: true });
      process.exit(0);
    };
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
    return;
  }
  throw new Error(`No free port between ${PORTS[0]} and ${PORTS.at(-1)}`);
}

/** `setup-page`: the Setup page's address. In (or with) a studio, its page server shows it; before there's one, a
    setup page server does. */
async function setupPage() {
  const root = here() || registeredStudios()[0]?.path || null;
  if (root) return console.log(pageUrl(await ensureServer(root), "/setup"));
  const running = (await runningServers()).find((s) => s.setup && s.plugin === pluginVersion());
  if (running) return console.log(pageUrl(`http://127.0.0.1:${running.port}/`, "/setup"));
  mkdirSync(USER_DIR, { recursive: true });
  const log = openSync(join(USER_DIR, "setup-server.log"), "a");
  const child = spawn(process.execPath, [SELF, "serve", "--setup"], { detached: true, stdio: ["ignore", log, log] });
  child.unref();
  for (let i = 0; i < 60; i++) {
    await sleep(100);
    const st = readJSON(join(USER_DIR, "setup-server.json"));
    if (st?.pid === child.pid && (await status(st.port))) return console.log(pageUrl(st.url, "/setup"));
  }
  throw new Error(`The setup page didn't start. See ${join(USER_DIR, "setup-server.log")}`);
}

/** `setup-note <check> <installing|failed|clear>`: what the Setup page says of a check while Claude installs it. */
/** Note for the Setup and Studio health pages that a check's install is under way or failed (or clear the note). */
function writeSetupNote(id, state) {
  const file = join(USER_DIR, "setup.json");
  const all = readJSON(file, {});
  const notes = { ...(all.notes || {}) };
  if (state === "clear") delete notes[id];
  else notes[id] = { state, at: new Date().toISOString() };
  mkdirSync(USER_DIR, { recursive: true });
  writeFileSync(file, `${JSON.stringify({ ...all, notes }, null, 2)}\n`);
}

function setupNote() {
  const [, id, state] = positional;
  const states = ["installing", "failed", "clear"];
  if (!id || !states.includes(state)) throw new Error(`usage: studio.mjs setup-note <check> <${states.join("|")}>`);
  writeSetupNote(id, state);
  console.log(`Setup page: ${id} ${state === "clear" ? "cleared" : state}.`);
}

async function describe(root) {
  const studio = readStudio(root);
  const brands = listBrands(root);
  const videos = listVideos(root);
  const server = (await runningServers()).find((s) => s.studio === root) || null;
  return { studio, brands, videos, server };
}

async function context() {
  const root = studioRoot();
  const { studio, brands, videos, server } = await describe(root);
  const lines = [
    `## Studio: ${studio.name}`,
    `- Folder: ${root}`,
    `- HyperFrames version for new videos: ${HYPERFRAMES_VERSION} (Video Studio's pinned version)`,
    `- Plugin: Wyzowl Video Studio ${pluginVersion()} at ${PLUGIN_ROOT}`,
    `- Pages: ${server ? `http://127.0.0.1:${server.port}/ (running)` : "not running (they start when a page is shown)"}`,
    `- Brands (${brands.length}): ${brands.length ? brands.map((b) => `${b.slug} (${b.name})`).join(", ") : "none yet"}`,
    `- Videos (${videos.length})${videos.length ? ", newest first:" : ": none yet"}`,
    ...videos.slice(0, 12).map((v) => `  - ${v.slug}: “${v.title}” · brand ${v.brand || "—"} · ${v.type} · ${v.size.label} · ${v.status.label}`),
  ];
  console.log(lines.join("\n"));
}

async function hook() {
  const root = here();
  if (!root) return; // not a studio: stay silent
  const { studio, brands, videos } = await describe(root);
  const warn = [];
  const node = Number(process.versions.node.split(".")[0]);
  if (node < 20) warn.push(`Node.js ${process.versions.node} is old; 20 or newer is needed`);
  if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) warn.push("ffmpeg is missing");
  if (!existsSync(join(root, ".claude", "skills", "hyperframes", "SKILL.md"))) warn.push("the HyperFrames skills aren't installed in this studio");
  const open = videos.filter((v) => v.status.key !== "delivered");
  // the full library's daily check, in the background so the session never waits on the network
  if (checkDue()) {
    try {
      spawn(process.execPath, [SELF, "library", "check", "--quiet"], { detached: true, stdio: "ignore" }).unref();
    } catch {}
  }
  // after an update: say so once
  let update = "";
  const was = studio.plugin;
  const now = pluginVersion();
  if (was && newer(now, was)) {
    update = `Wyzowl Video Studio was updated from ${was} to ${now}.`;
    // remembered, so it's said once
    try {
      const file = join(root, "studio.json");
      writeFileSync(file, `${JSON.stringify({ ...readJSON(file, {}), plugin: now }, null, 2)}\n`);
    } catch {}
  }
  // what Video Studio needs that isn't on this Mac yet (a new version's downloads, or one that didn't finish)
  // downloads in the background, so the session never waits on it
  const missing = EXTRAS.filter((x) => !x.installed());
  let downloads = "";
  if (missing.length) {
    const started = startDownloads(root);
    downloads = `Video Studio ${started ? "is downloading" : "is still downloading"} what it needs, in the background: ${missing.map((x) => `${x.name} (${x.size})`).join(", ")}. Tell the user in a line at the start of your reply (there's nothing for them to do); Studio health (/health) shows when it's done. If you need one before then, \`node "${SELF}" install all --wait\` waits for it.`;
  }
  const context = [
    `Wyzowl Video Studio: this folder is a video studio (${root}).`,
    `Plugin files: ${PLUGIN_ROOT} (helpers in scripts/, review tools in scripts/tools/, score kit in scripts/score-kit/).`,
    `Sound effects: SFX Kit ${SFX_KIT.version}${kitInstalled() ? ` in ${KIT_DIR} (scripts/tools/sfx.mjs)` : ", downloading (below)"}.`,
    `HyperFrames for new videos: ${HYPERFRAMES_VERSION}. Brands: ${brands.map((b) => b.slug).join(", ") || "none"}. Videos: ${videos.length} (${open.length} in progress${open[0] ? `; latest: ${open[0].slug}, ${open[0].status.label.toLowerCase()}` : ""}).`,
    "For any video work here, follow the video-studio production skill (with the storyboard and brand-kit skills). New videos: /video-studio:new-video. New brands: /video-studio:new-brand. Pages: /video-studio:dashboard.",
    `To tidy up a finished video, use \`node "${SELF}" tidy <video>\` (production skill, "Tidying up"): show the user what it lists and ask before \`--yes\`. Never delete a video's files any other way.`,
    warn.length ? `Setup problems: ${warn.join("; ")}. Suggest /video-studio:setup before making videos; the Studio health page (/health) shows what's missing.` : "",
    update,
    downloads,
  ]
    .filter(Boolean)
    .join("\n");
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } }));
}

/** PostToolUse hook: Claude has just written a file. If it's the data file behind a page (a brand.json, or a shared
    storyboard.json or review.json), start the page server and tell Claude to show the page now. Stays quiet when the
    page is already on screen (it refreshes itself) or Claude was told about it in the last few minutes. */
async function pageReady() {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const given = input.tool_input?.file_path;
  if (typeof given !== "string" || !given) return;
  const file = resolve(input.cwd || process.cwd(), given);
  const root = findStudio(dirname(file));
  if (!root) return;
  const page = pageForFile(root, file);
  if (!page) return;

  const base = await ensureServer(root);
  const open = (await status(Number(new URL(base).port)))?.open || [];
  // the server lists pages by their decoded paths
  const target = decodeURIComponent(page.path).replace(/\/$/, "");
  if (open.some((o) => String(o.path).replace(/\/$/, "") === target)) return;

  const shownFile = join(root, ".studio", "shown.json");
  const now = Date.now();
  const shown = Object.fromEntries(Object.entries(readJSON(shownFile, {})).filter(([, t]) => now - t < 86400e3));
  const key = `${input.session_id || "-"} ${page.path}`;
  if (now - (shown[key] || 0) < 5 * 60e3) return;
  shown[key] = now;
  writeFileSync(shownFile, JSON.stringify(shown, null, 2));

  const unsaved = open.filter((o) => o.unsaved).map((o) => pageUrl(base, encodeURI(o.path)));
  const context = showInstructions(root, base, page, { unsaved });
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } }));
}

/** How Claude should show a page right now (`show`), starting the page server if needed. */
async function show() {
  const root = studioRoot({ forPages: true });
  const page = resolvePage(root, arg || "/");
  if (!page) {
    console.log(`There's no page at ${arg} yet. Pages: / (the dashboard), /brands/<brand>/, /videos/<project>/, /videos/<project>/script/, /videos/<project>/storyboard/, /videos/<project>/review/, and the library /library/ (a category: /library/data/; an item: /library/widgets/w03/).`);
    return;
  }
  const base = await ensureServer(root);
  const here = decodeURIComponent(page.path).replace(/\/$/, "");
  const open = (await status(Number(new URL(base).port)))?.open || [];
  const unsaved = open.filter((o) => o.unsaved && String(o.path).replace(/\/$/, "") !== here).map((o) => pageUrl(base, encodeURI(o.path)));
  console.log(showInstructions(root, base, page, { unsaved }));
}

/** `wait`: block until the user saves their review of a script, storyboard or video, print what they decided and
    exit. Claude runs it in the background, so saving wakes Claude to carry on without the user having to come back to
    the chat. */
async function waitForReview() {
  const root = studioRoot({ forPages: true });
  const page = resolvePage(root, arg || "");
  if (!page || !["script", "storyboard", "review"].includes(page.kind)) {
    throw new Error("usage: studio.mjs wait /videos/<project>/storyboard/v<N>/ (or /videos/<project>/review/v<N>/)");
  }
  const what = `${{ script: "script", storyboard: "storyboard", review: "video" }[page.kind]} v${page.version} of ${page.project}`;
  if (!page.latest) return console.log(`${what} isn't the latest version, so there's nothing to wait for.`);
  if (claudeWaiting(root, page.path)) return console.log(`Already waiting for the review of ${what}.`);

  setWaiting(root, page.path, process.pid);
  process.on("exit", () => {
    const mine = readJSON(join(root, ".studio", "waiting.json"), {})[decodeURIComponent(page.path)]?.pid === process.pid;
    if (mine) setWaiting(root, page.path, null);
  });
  for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(signal, () => process.exit(0));

  const latestPath = page.path.replace(/v\d+\/$/, "");
  for (;;) {
    const latest = resolvePage(root, latestPath);
    if (latest && latest.version > page.version) return console.log(`${what} was replaced by v${latest.version}, so this wait has stopped.`);
    const state = reviewState(root, page);
    if (state.finished && state.savedAfter) return console.log(describeReview(page, state));
    await sleep(1000);
  }
}

/** `ready`, as JSON: the newest script, storyboard or video waiting for the user's review (`page`), and what Claude is
    making (`making`: the video it's working on now, with the step it's on), each or both null. The band above Claude's
    message box (hooks/index.tsx) offers to open the one to review, or else to watch the one being made. */
function ready() {
  const root = studioRoot();
  const videos = listVideos(root);
  const waiting = videos.filter((v) => ["script", "storyboard", "review"].includes(v.status.key) && !v.progress).sort((a, b) => b.updated - a.updated)[0];
  let page = null;
  if (waiting) {
    const stage = { script: waiting.script, storyboard: waiting.storyboard, review: waiting.review }[waiting.status.key];
    const what = `${{ script: "script", storyboard: "storyboard", review: "video" }[waiting.status.key]} v${stage.version}`;
    page = { path: stage.url, text: `${what[0].toUpperCase()}${what.slice(1)} of ${waiting.title} is ready for your review`, button: `Open ${what}` };
  }
  const busy = videos.filter((v) => v.progress && !v.progress.quiet).sort((a, b) => Date.parse(b.progress.updated) - Date.parse(a.progress.updated))[0];
  let making = null;
  if (busy) {
    const p = busy.progress;
    const { steps, at } = stepsNow(p, readBrief(root, busy.slug));
    const count = p.count?.total ? `, ${p.count.done} of ${p.count.total}` : "";
    making = { path: `/videos/${encodeURIComponent(busy.slug)}/`, text: `${stageTitle(p)} of ${busy.title}: ${steps[at].label.toLowerCase()}${count}`, button: "Watch" };
  }
  console.log(JSON.stringify({ page, making }));
}

/** Every value given for an option that may be repeated (`--fix a --fix b`). */
const opts = (k) => argv.flatMap((a, i) => (a === k && argv[i + 1] && !argv[i + 1].startsWith("--") ? [argv[i + 1]] : []));

/** `progress <video> <stage> <version> <step>` starts a stage on the video's pages; `progress <video> <step>` moves it
    on. A review round's scores (`--scores hook=8,…`, with `--round`) and what's being fixed (`--fix "<where>: <what>"`)
    show beside the newest frames. `--end` ends the stage without its result. */
function progressCommand() {
  const root = studioRoot();
  const [, slug, ...rest] = positional;
  const usage = `usage: studio.mjs progress <video> <${STAGES.join("|")}> <version> <step>, then studio.mjs progress <video> <step> [--round <n>] [--scores ${Object.keys(SCORES).map((k) => `${k}=<1-10>`).join(",")}] [--fix "<where>: <what>"] | --end`;
  if (!slug || (!rest.length && !argv.some((a) => ["--end", "--round", "--scores", "--fix"].includes(a)))) throw new Error(usage);
  if (!existsSync(join(root, "videos", slug, "BRIEF.md")) && !existsSync(join(root, "videos", slug))) throw new Error(`There's no video "${slug}" in this studio.`);
  if (argv.includes("--end")) {
    endStage(root, slug);
    return console.log(`${slug}: the stage under way has ended.`);
  }
  // a step is one of its stage's, so the pages name it
  const brief = readBrief(root, slug);
  const starting = STAGES.includes(rest[0]);
  const stage = starting ? { stage: rest[0], version: Number(rest[1]) } : readProgress(root, slug);
  const named = starting ? rest[2] : rest[0];
  if (stage && named) {
    const keys = stepsFor(stage, brief).map((x) => x.key);
    if (!keys.includes(named)) throw new Error(`"${named}" isn't a step of ${stage.stage === "final" ? "the final video" : `${stage.stage} v${stage.version}`}. Its steps: ${keys.join(", ")}.`);
  }
  let p = starting
    ? startStage(root, slug, rest[0], Number(rest[1]), rest[2] || "")
    : updateProgress(root, slug, (q) => {
        if (rest[0]) q.step = rest[0];
        return q;
      });
  if (!p) throw new Error(`No stage is under way for "${slug}". Start one first: studio.mjs progress ${slug} <${STAGES.join("|")}> <version> <step>`);
  const round = opt("--round");
  const scores = opt("--scores");
  const fixes = opts("--fix");
  if (round || scores || fixes.length) {
    const given = {};
    for (const pair of (scores || "").split(",").filter(Boolean)) {
      const [k, v] = pair.split("=").map((x) => x.trim());
      if (!Object.hasOwn(SCORES, k) || !(Number(v) >= 1 && Number(v) <= 10)) throw new Error(`Scores are ${Object.keys(SCORES).join(", ")}, each from 1 to 10: "${pair}" isn't one.`);
      given[k] = Number(v);
    }
    p = updateProgress(root, slug, (q) => {
      if (round) q.round = Number(round);
      if (scores) {
        const r = Number(round) || q.round || 1;
        // a new round's scores: the last round's stay to compare, and its fixes are done
        if (q.scores && q.scores.round < r) {
          q.previous = q.scores;
          delete q.fixing;
        }
        q.scores = { round: r, ...given };
      }
      if (fixes.length)
        q.fixing = fixes.slice(0, 5).map((f) => {
          const i = f.indexOf(": ");
          return i > 0 ? { where: f.slice(0, i).trim(), what: f.slice(i + 2).trim() } : { where: "", what: f.trim() };
        });
      return q;
    });
  }
  const { steps, at } = stepsNow(p, brief);
  console.log(`${slug}: ${stageTitle(p).replace(/^Claude is /, "")}, ${steps[at].label.toLowerCase()}${p.round ? ` (round ${p.round})` : ""}. Its overview shows it: /videos/${slug}/`);
}

/** The HyperFrames version a video's folder renders with: its package.json's render script, or the studio's. */
/** How to run HyperFrames' render for a video: its own `render` script, which names the exact version the video was
    made on, or, without one, Video Studio's pinned HyperFrames. */
function renderRunner(dir) {
  const script = readJSON(join(dir, "package.json"))?.scripts?.render || "";
  return /hyperframes@[0-9][\w.-]*\s+render\b/.test(script) ? ["npm", ["run", "render", "--"]] : ["npx", ["--yes", HYPERFRAMES, "render"]];
}

/** `render`: `HF render …` for the video whose folder this is (its pinned HyperFrames), with HyperFrames' own output as
    it comes, that also puts the render's progress on the video's pages while a stage is under way: the frames rendered
    and the time left. A draft's round comes from its name (`…_draft_r2.mp4`); in the final stage it's the final
    render. */
async function renderCommand() {
  const at = videoAt(process.cwd());
  if (!at) throw new Error("Run `studio.mjs render` from the video's folder (videos/<video>/ in a studio).");
  const from = argv.indexOf("render") + 1;
  const args = argv.slice(from).filter((a, i, all) => a !== "--" && a !== "--studio" && all[i - 1] !== "--studio");
  const outIdx = args.findIndex((a) => a === "--output" || a === "-o");
  const output = outIdx >= 0 ? args[outIdx + 1] || "" : (args.find((a) => /^(--output|-o)=/.test(a)) || "").replace(/^[^=]*=/, "");
  const round = Number(/_r(\d+)\.[a-z0-9]+$/i.exec(output)?.[1]) || null;
  const size = /_(\d+x\d+)(?:_v\d+)?\.[a-z0-9]+$/i.exec(output)?.[1] || null;
  const since = new Date().toISOString();
  let last = 0;
  let phase = "";
  // the pace is measured from the first frame, as setting up counts for part of HyperFrames' percentage
  let first = null;
  const note = (count, force = false) => {
    if (!force && count.phase === phase && Date.now() - last < 500) return;
    last = Date.now();
    phase = count.phase;
    try {
      updateProgress(at.root, at.slug, (q) => {
        q.step = q.stage === "final" ? "master" : "render";
        if (round && q.stage === "video") q.round = round;
        q.count = { unit: "frames", since, ...(q.stage === "final" && size ? { size } : {}), ...count };
        return q;
      });
    } catch {}
  };
  note({ done: 0, total: 0, pct: 0, phase: "setup" }, true);
  // faster renders: on Apple silicon, HyperFrames' browser draws on the graphics chip (unless the user set otherwise)
  const gpu = process.platform === "darwin" && process.arch === "arm64" && !process.env.PRODUCER_BROWSER_GPU_MODE ? { PRODUCER_BROWSER_GPU_MODE: "hardware" } : {};
  const [command, base] = renderRunner(at.dir);
  const child = spawn(command, [...base, ...args], { cwd: process.cwd(), stdio: ["inherit", "pipe", "pipe"], env: { ...process.env, ...gpu } });
  const watch = (stream, out) => {
    let rest = "";
    stream.on("data", (chunk) => {
      out.write(chunk);
      const lines = (rest + chunk.toString("utf8")).split("\n");
      rest = lines.pop();
      for (const line of lines) {
        const m = /@hf-progress (\{.*\})\s*$/.exec(line);
        if (!m) continue;
        try {
          const e = JSON.parse(m[1]);
          if (e.code === "capture") {
            first ||= { pct0: e.pct, t0: new Date().toISOString() };
            note({ done: e.done, total: e.total, pct: e.pct, phase: "capture", ...first });
          }
          else if (Number.isFinite(e.pct)) note({ pct: e.pct, phase: e.code, ...(first || {}), ...(e.code === "encode" ? { done: e.done, total: e.total } : {}) });
        } catch {}
      }
    });
  };
  watch(child.stdout, process.stdout);
  watch(child.stderr, process.stderr);
  const code = await new Promise((done) => child.on("close", (c) => done(c ?? 1)));
  if (code === 0) note({ pct: 100, phase: "done" }, true);
  else {
    // a render that stopped leaves no count behind: Claude renders again once it has fixed what stopped it
    try {
      updateProgress(at.root, at.slug, (q) => {
        delete q.count;
        return q;
      });
    } catch {}
  }
  process.exitCode = code;
}

/** `pdf`: the PDF of a script or storyboard version, made by the page server as its Download PDF button does. It's
    saved in the version's folder; the path is printed so Claude can hand it over. */
async function pdf() {
  const root = studioRoot();
  const page = resolvePage(root, arg || "");
  if (!page || !["script", "storyboard"].includes(page.kind)) {
    throw new Error("usage: studio.mjs pdf /videos/<project>/script/v<N>/ (or /videos/<project>/storyboard/v<N>/)");
  }
  const res = await fetch(pageUrl(await ensureServer(root), `${page.path}download`));
  if (!res.ok) throw new Error(await res.text());
  await res.arrayBuffer();
  const file = decodeURIComponent(res.headers.get("x-studio-file") || "");
  if (!file) throw new Error(`The PDF was made, but it couldn't be saved in ${page.kind}/v${page.version}/ of ${page.project}.`);
  console.log(join(root, file));
}

/** `library`: every library item; or, with a code, how to use that item in a video: the block to copy, a host clip
    for index.html with the brand's settings and the item's own words filled in, and what it needs. */
async function library() {
  if (!arg) {
    const lines = [];
    // the items the user starred in the library come first, and Claude suggests them first
    const root = here();
    const favourites = new Set(root ? readFavourites(root) : []);
    const starred = [...favourites].map((c) => libraryItem(c)).filter(Boolean);
    if (starred.length) {
      lines.push("## The user's favourites (★)", "They starred these in the library: suggest them first wherever one fits.");
      for (const item of starred) lines.push(`- ★ ${item.code} ${item.name} (${CATEGORIES[item.category].title}): ${item.summary}`);
      lines.push("");
    }
    for (const [category, c] of Object.entries(CATEGORIES)) {
      const items = libraryItems(category);
      lines.push(`## ${c.title}`);
      if (!items.length) lines.push(`None yet: design ${c.one}s for the video from scratch.`);
      for (const item of items) {
        const layer = item.category === "transitions" ? "" : `, ${itemLayer(item)}`;
        lines.push(`- ${favourites.has(item.code) ? "★ " : ""}${item.code} ${item.name} (${item.free ? "free" : "full library"}${layer}): ${item.summary}`);
      }
    }
    lines.push(
      "",
      "Items combine: layer them (a full frame item as the base, items over footage on top) or run them one after another.",
      "For one item: node studio.mjs library <code> --brand <brand> --size <16x9|1x1|4x5|9x16>",
    );
    const locked = lockedItems();
    if (locked.length) {
      lines.push(
        "",
        `The full library has ${locked.length} more items, locked on this Mac until a licence key unlocks them (node studio.mjs licence <key>). Suggest only the items above; if the user asks for something only a locked item does, say it's in the full library.`,
      );
    }
    return console.log(lines.join("\n"));
  }
  const item = libraryItem(arg);
  if (!item) {
    const locked = findItem(arg);
    if (locked?.locked) {
      const buy = catalogue().buy;
      return console.log(
        `${locked.code} ${locked.name} (${CATEGORIES[locked.category].title}) is in the full library, locked on this Mac: ${locked.summary}\nTo use it, the user needs a licence key${buy ? ` (from ${buy})` : ""}; then: node studio.mjs licence <key>. Until then, suggest one of the items in: node studio.mjs library`,
      );
    }
    throw new Error(`There's no library item "${arg}". Run: node studio.mjs library`);
  }
  const root = here();
  const slug = opt("--brand");
  const brand = root && slug ? readBrand(root, slug) : null;
  if (slug && !brand) throw new Error(`There's no brand "${slug}" in this studio.`);
  const size = SIZES[opt("--size")] ? opt("--size") : "16x9";
  const S = SIZES[size];
  if (opt("--still") !== null) return libraryStill(item, { root, slug, size, at: Number(opt("--still")), out: opt("--out") });
  const style = brandStyle(brand);
  const content = Object.fromEntries(contentVariables(item).map((d) => [d.id, d.default]));
  // only the brand settings the block actually uses
  const uses = (k) => item.template.includes(`--${k}`) || item.template.includes(`"${k}"`);
  const values = { ...content, ...Object.fromEntries(BRAND_VARS.filter(uses).map((k) => [k, style.vars[k]])) };
  // every font the block names: the brand's three, and any of its own (D72's handwriting)
  const fonts = [...new Set(Object.keys(values).filter((k) => /^font[A-Z]/.test(k) && values[k]).map((k) => String(values[k]).replace(/^"|"$/g, "")))];
  const media = contentVariables(item).filter((d) => /(Video|Image)$/.test(d.id));
  // where each font's file is: the brand kit's own, else the plugin's bundled copy
  const fontSource = (family) => {
    const own = (brand?.fonts || []).find((x) => x?.family === family && x.file);
    if (own) return `${family} (${join(root, "brands", brand.slug, own.file)})`;
    if (BUNDLED_FONTS[family]) return `${family} (copy ${BUNDLED_FONTS[family]} into the project)`;
    return `${family} (installed on this Mac, or add its file to the brand kit)`;
  };
  const json = JSON.stringify(values).replace(/'/g, "&#39;");
  const styled = brand ? `${brand.name}'s` : "the studio's own; pass --brand for a brand's";
  let steps;
  if (item.category === "transitions" && item.recipe) {
    // a transition that moves both scenes works on the main timeline, as HyperFrames transitions do
    const keep = item.id === "x05-pull-back" ? ` + keep (how long A stays on B's screen, ${content.keep ?? 3} s by default)` : "";
    steps = [
      `1. Copy everything inside the <template> of ${item.file} (its layer and script) into index.html, after both scenes and before the main timeline's script. Once is enough for any number of uses.`,
      `2. Scene A and scene B are full-frame elements in index.html, B after A in the page (so B draws on top). Give the transition plain wrappers, not timed media: wrap a video clip in a full-frame div. The scenes overlap: B starts at T, the transition's start, and A ends at T + ${item.length} s${keep}. The cut is at T + ${item.cut} s.`,
      `3. On the main timeline, before it's registered:`,
      `StudioTransitions["${item.id}"](tl, { at: T, a: "#scene-a", b: "#scene-b", vars: ${JSON.stringify(values)} });`,
      `4. Set its options in vars (the brand settings are ${styled}).`,
    ];
  } else if (item.category === "transitions") {
    steps = [
      `1. Copy the block into the project: cp "${item.file}" compositions/${item.id}.html`,
      `2. Add a clip for it to index.html after both scenes (so it's on top), starting at T, the transition's start, and ${item.length} s long:`,
      `<div id="${item.id}-slot" data-composition-id="${item.id}" data-composition-src="compositions/${item.id}.html" data-start="T" data-duration="${item.length}" data-track-index="9" data-width="${S.w}" data-height="${S.h}"`,
      `  data-variable-values='${json}'></div>`,
      `3. The cut happens behind it at T + ${item.cut} s: end scene A's clip and start scene B's there. The brand settings are ${styled}. For another use, add another clip with its own id.`,
    ];
  } else {
    steps = [
      `1. Copy the block into the project: cp "${item.file}" compositions/${item.id}.html`,
      `2. Add a clip for it to index.html, at the time it plays. Its duration variable must match data-duration:`,
      `<div id="${item.id}-slot" data-composition-id="${item.id}" data-composition-src="compositions/${item.id}.html" data-start="0" data-duration="${content.duration ?? 6}" data-track-index="2" data-width="${S.w}" data-height="${S.h}"`,
      `  data-variable-values='${json}'></div>`,
      `3. Change the words and options in data-variable-values (the brand settings are ${styled}). To use it twice in one video, copy it under a new id and change "${item.id}" everywhere in the copy.${"exit" in content ? ' If a transition follows, set exit to "hold", so it stays whole until the transition takes it away.' : ""}`,
      itemLayer(item) === "over footage"
        ? `4. It sits over footage (it's transparent), so it combines: put its clip after whatever it goes over in index.html (later clips draw on top; data-track-index is only Studio's row, so give each item playing at once its own).`
        : `4. It fills the frame, so it's a scene's base: items that sit over footage (widgets, captions) can go on top of it, after it in index.html (later clips draw on top; data-track-index is only Studio's row, so give each item playing at once its own).`,
    ];
  }
  // the next step's number (the clip's own lines aren't steps)
  const next = () => steps.filter((line) => /^\d+\. /.test(line)).length + 1;
  if (fonts.length) steps.push(`${next()}. Fonts: index.html needs an @font-face for each, as for the rest of the video: ${fonts.map(fontSource).join("; ")}.`);
  if (media.length)
    steps.push(
      `${next()}. Media: in the copy, write each file as the src of its element (${media.map((d) => d.id).join(", ")}: the elements with data-var-src="…"), and delete the media elements you don't use, so check stays clean.${item.id.startsWith("t01") ? " The cut-out is the same footage with the background removed: HF remove-background <footage.mp4> -o <footage>_cutout.webm. Cut both to the moment it plays; their sound stays on the main track." : " Their sound stays on the main track."}`,
    );
  const out = [
    `${item.code} ${item.name} (${CATEGORIES[item.category].title}${item.free ? ", free" : ""}): ${item.summary}`,
    `When: ${item.use}`,
    `Motion: ${item.motion}`,
    "",
    ...steps,
    "",
    "What the item takes (id: label, default):",
    ...contentVariables(item).map((d) => `- ${d.id}: ${d.label} (${d.type === "enum" ? (d.options || []).map((o) => o.value).join(" | ") : JSON.stringify(d.default)})`),
  ];
  console.log(out.join("\n"));
}

/** `library check`: ask the Wyzowl site for the current pack now (the session-start hook runs it once a day, quietly). */
async function libraryCheck() {
  const result = await checkLibrary({ force: argv.includes("--force") });
  if (argv.includes("--quiet")) return;
  console.log(describeLicence(result));
}

/** `licence <key>` unlocks the full library on this Mac; `licence` alone says where things stand. */
async function licenceCommand() {
  if (arg) return console.log(describeLicence(await checkLibrary({ key: arg })));
  const l = licence();
  const pack = installedPack();
  const locked = lockedItems().length;
  if (!l?.key) return console.log(`No licence key on this Mac. ${locked ? `${locked} paid items are locked. ` : ""}With a key: node studio.mjs licence <key>`);
  console.log(
    [
      `Licence ${l.key.replace(/^(.{4}).*(.{4})$/, "$1…$2")}: ${l.status}${l.message ? ` (${l.message})` : ""}.`,
      pack ? `Full library: version ${pack.version}, ${pack.items} items, unpacked ${formatDateTime(pack.installed)}.` : "No paid items on this Mac.",
      l.checked ? `Last checked ${formatDateTime(l.checked)}.` : "Not checked yet.",
    ].join(" "),
  );
}

function describeLicence(r) {
  if (r.status === "ok") return `The full library is unlocked on this Mac: version ${r.version}, ${r.items} items${r.updated ? " (just downloaded)" : ", up to date"}.`;
  return r.message || `The check didn't work (${r.status}).`;
}

/** `library <code> --still <seconds> --out <file.png>`: the item at that moment, in a brand and size, on a transparent
    background (no stand-in), the video's full size: for a storyboard frame to show it as it will look. `--set
    key=value` (repeatable) fills in its words and options. */
async function libraryStill(item, { root, slug, size, at, out }) {
  if (!root) throw new Error(NOT_A_STUDIO);
  if (!out || !Number.isFinite(at)) throw new Error("usage: studio.mjs library <code> --still <seconds> --out <file.png> [--brand b] [--size 16x9] [--set key=value …]");
  const sets = {};
  argv.forEach((a, i) => {
    if (a !== "--set" || !argv[i + 1]) return;
    const [key, ...rest] = argv[i + 1].split("=");
    const d = item.variables.find((x) => x.id === key);
    if (!d) throw new Error(`${item.code} has no "${key}". It takes: ${item.variables.map((x) => x.id).join(", ")}`);
    sets[key] = d.type === "number" ? Number(rest.join("=")) : rest.join("=");
  });
  const p = new URLSearchParams({ size, at: String(at), bg: "none" });
  if (slug) p.set("brand", slug);
  if (Object.keys(sets).length) p.set("vars", JSON.stringify(sets));
  const base = await ensureServer(root);
  const { findChrome } = await import("./lib/chrome.mjs");
  const { puppeteer, executablePath } = findChrome();
  const S = SIZES[size];
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: S.w, height: S.h, deviceScaleFactor: 1 });
    await page.goto(pageUrl(base, `/library/preview/${item.code.toLowerCase()}?${p}`), { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: 20000 });
    mkdirSync(dirname(resolve(out)), { recursive: true });
    await page.screenshot({ path: resolve(out), omitBackground: true });
  } finally {
    await browser.close();
  }
  console.log(resolve(out));
}

/** `install cutout`: download HyperFrames' presenter cut-out model now (about 168 MB, once), rather than the first
    time a video needs it: run the background remover once on a small test image. `install sfx-kit`: download SFX
    Kit, check every file, and unpack it (lib/sfx.mjs). `install all`: everything that isn't here yet. */
// ───────── tidy ─────────

const TIDY_KEEPS =
  "It keeps the delivered files in renders/, the approved script and storyboard, every review's notes, and the video's source and inputs (footage, voiceover, music), so the video can still be changed and rendered again.";
/** `tidy <video> [--yes] [--unfinished]`, `tidy --all [--yes]` and `tidy --deleted [--yes]`: what tidying up would
    remove and keep, for Claude to show the user and ask; then, with --yes, removing it. */
function tidyCommand() {
  const root = studioRoot();
  const yes = argv.includes("--yes");
  if (argv.includes("--all")) return tidyAll(root, yes);
  if (argv.includes("--deleted")) return tidyDeleted(root, yes);
  if (!arg) throw new Error("Which video? node studio.mjs tidy <video>, or --all for every finished one");
  const video = readVideo(root, arg);
  if (!video) throw new Error(`There's no video "${arg}" in this studio.`);
  const name = `"${video.title}" (videos/${arg})`;
  if (yes) {
    const r = tidyVideo(root, arg, { unfinished: argv.includes("--unfinished") });
    if (!r.done.length && !r.left.length) return console.log(`There was nothing to tidy up in ${name}.`);
    const lines = [`Tidied up ${name}: ${sizeLabel(r.freed)} freed.`, ...r.done.map((i) => `- Removed ${i.label[0].toLowerCase()}${i.label.slice(1)}: ${sizeLabel(i.bytes)}`)];
    if (r.left.length) lines.push(`Left its edit history (${sizeLabel(r.left[0].bytes)}): HyperFrames has it open, in its Studio or a preview. Close that, then tidy up again to remove it.`);
    return console.log(lines.join("\n"));
  }
  const plan = tidyPlan(root, arg);
  const last = plan.last ? ` It was last tidied up on ${formatDate(Date.parse(plan.last.at))} (${sizeLabel(plan.last.freed)} freed).` : "";
  if (!plan.items.length) return console.log(`There's nothing to tidy up in ${name}: it only keeps what it needs.${last}`);
  const lines = [`Tidying up ${name} would free ${sizeLabel(plan.bytes)}. It removes:`];
  for (const i of plan.items) lines.push(`- ${i.label}: ${sizeLabel(i.bytes)}${i.paths.length ? ` (${i.paths.join(", ")})` : ""}${i.note ? `. ${i.note[0].toUpperCase()}${i.note.slice(1)}.` : ""}`);
  lines.push(TIDY_KEEPS + last);
  const busy = plan.items.find((i) => i.busy);
  if (busy) lines.push("HyperFrames has its edit history open now (its Studio or a preview), so that would be left. Close it first to remove it too.");
  if (plan.working) lines.push("Claude is still working on this video: tidy it up once that's done.");
  else if (!plan.finished) lines.push(`This video isn't finished: it has no final render yet, and it may still need its drafts and history. Only tidy it if the user asks for this video by name, knowing that: then add --unfinished.`);
  else lines.push(`Deleting can't be undone: show the user this list and ask before going on. Then: node "${SELF}" tidy ${arg} --yes`);
  console.log(lines.join("\n"));
}

function tidyAll(root, yes) {
  const all = studioTidy(root);
  if (!all.videos.length && !all.gone.length) return console.log("There's nothing to tidy up: every finished video only keeps what it needs.");
  if (!yes) {
    const lines = [`Tidying up every finished video would free ${sizeLabel(all.bytes)}:`];
    for (const p of all.videos) lines.push(`- ${p.title} (videos/${p.slug}): ${sizeLabel(p.bytes)}, ${tidyWhat(p)}${p.items.some((i) => i.busy) ? " (its edit history is open in HyperFrames, so it would be left)" : ""}`);
    if (all.gone.length) lines.push(`- The edit history HyperFrames kept for ${all.gone.length === 1 ? "a deleted video" : `${all.gone.length} deleted videos`}: ${sizeLabel(all.goneBytes)}`);
    lines.push("Each video keeps its delivered files, its approved script and storyboard, every review's notes, and its source and inputs (footage, voiceover, music), so it can still be changed and rendered again.");
    lines.push(`Deleting can't be undone: show the user this list and ask before going on. Then: node "${SELF}" tidy --all --yes`);
    return console.log(lines.join("\n"));
  }
  let freed = 0;
  const lines = [];
  for (const p of all.videos) {
    try {
      const r = tidyVideo(root, p.slug);
      freed += r.freed;
      lines.push(`- ${p.title}: ${sizeLabel(r.freed)} freed${r.left.length ? " (its edit history was left: HyperFrames has it open)" : ""}`);
    } catch (err) {
      lines.push(`- ${p.title}: left as it is. ${err.message}`);
    }
  }
  if (all.gone.length) {
    const g = tidyGone(root);
    freed += g.freed;
    lines.push(`- The edit history of ${g.count === 1 ? "a deleted video" : `${g.count} deleted videos`}: ${sizeLabel(g.freed)} freed`);
  }
  console.log([`Tidied up: ${sizeLabel(freed)} freed.`, ...lines].join("\n"));
}

function tidyDeleted(root, yes) {
  const gone = goneHistories(root);
  const bytes = gone.reduce((n, g) => n + g.bytes, 0);
  const what = gone.length === 1 ? "a deleted video" : `${gone.length} deleted videos`;
  if (!gone.length) return console.log("HyperFrames keeps no edit history for videos deleted from this studio.");
  if (!yes) return console.log(`HyperFrames still keeps the edit history of ${what} from this studio: ${sizeLabel(bytes)} (${gone.map((g) => `videos/${g.dir.split("/").pop()}`).join(", ")}). Removing it can't be undone: ask the user first. Then: node "${SELF}" tidy --deleted --yes`);
  const g = tidyGone(root);
  console.log(`Removed the edit history of ${what}: ${sizeLabel(g.freed)} freed.`);
}

async function install() {
  if (arg === "all") return installAll();
  if (arg === "sfx-kit") {
    const r = await installKit();
    return console.log(r.already ? `SFX Kit ${SFX_KIT.version} is already on this Mac (${r.sounds} sounds).` : `SFX Kit ${SFX_KIT.version} is on this Mac: ${r.sounds} sounds, every file checked. Videos can use its sound effects now.`);
  }
  if (arg !== "cutout") throw new Error("usage: studio.mjs install all|cutout|sfx-kit");
  const extra = EXTRAS.find((x) => x.id === "cutout");
  if (extra.installed()) return console.log("Presenter cut-outs are already set up on this Mac.");
  const dir = mkdtempSync(join(tmpdir(), "video-studio-cutout-"));
  try {
    const made = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=gray:s=64x64", "-frames:v", "1", join(dir, "test.png")]);
    if (made.status !== 0) throw new Error("ffmpeg couldn't make the test image. Is ffmpeg installed? Run /video-studio:setup.");
    console.log(`Downloading the presenter cut-out model (${extra.size}, once)…`);
    const run = spawnSync("npx", ["--yes", HYPERFRAMES, "remove-background", join(dir, "test.png"), "-o", join(dir, "out.png")], { stdio: "inherit" });
    // the model is what matters; the test image itself needn't come out well
    if (!extra.installed()) throw new Error(`The download didn't finish${run.status ? " (the background remover stopped with an error)" : ""}. Check the internet connection and try again.`);
    console.log("Presenter cut-outs are set up: Claude can now put text behind the presenter.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// one run of the downloads at a time on a Mac, whichever session started it
const DOWNLOADS_LOCK = join(USER_DIR, "downloading.json");
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
/** The downloads under way on this Mac ({ pid, at, what }), or null. */
function downloadsRunning() {
  const held = readJSON(DOWNLOADS_LOCK, null);
  return held && alive(held.pid) && Date.now() - Date.parse(held.at) < 3 * 3600e3 ? held : null;
}
function takeDownloadsLock(what) {
  const body = `${JSON.stringify({ pid: process.pid, at: new Date().toISOString(), what })}\n`;
  mkdirSync(USER_DIR, { recursive: true });
  for (let tries = 0; tries < 2; tries++) {
    try {
      writeFileSync(DOWNLOADS_LOCK, body, { flag: "wx" });
      return true;
    } catch {
      if (downloadsRunning()) return false;
      rmSync(DOWNLOADS_LOCK, { force: true }); // left by a run that's gone
    }
  }
  return false;
}

/** `install all`: everything Video Studio needs that isn't on this Mac yet, smallest first, each shown on the Setup
    and Studio health pages while it downloads (and marked failed if it doesn't finish). */
async function installAll() {
  if (downloadsRunning()) {
    if (!argv.includes("--wait")) return console.log(`Video Studio is already downloading: ${downloadsRunning().what.join(", ")}.`);
    console.log("Waiting for the downloads under way to finish…");
    while (downloadsRunning()) await sleep(2000);
  }
  const todo = EXTRAS.filter((x) => !x.installed()).sort((a, b) => a.mb - b.mb);
  if (!todo.length) return console.log("Everything Video Studio needs is on this Mac.");
  if (!takeDownloadsLock(todo.map((x) => x.name))) return console.log("Video Studio is already downloading.");
  const root = here();
  const failed = [];
  try {
    for (const x of todo) {
      writeSetupNote(x.id, "installing");
      console.log(`${x.name} (${x.size})…`);
      const [command, args] = x.run();
      spawnSync(command, args, { stdio: "inherit", cwd: root || process.cwd(), env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}` } });
      const ok = x.installed();
      writeSetupNote(x.id, ok ? "clear" : "failed");
      if (!ok) failed.push(x.name);
    }
  } finally {
    rmSync(DOWNLOADS_LOCK, { force: true });
  }
  if (failed.length) throw new Error(`${failed.join(", ")} didn't finish. Check the internet connection: Video Studio tries again when the next session starts, or run this again.`);
  console.log(`Video Studio has everything it needs: ${todo.map((x) => x.name).join(", ")} downloaded.`);
}

/** Start `install all` in the background (its output in install.log), unless downloads are already under way. */
function startDownloads(root) {
  if (downloadsRunning()) return false;
  try {
    mkdirSync(USER_DIR, { recursive: true });
    const log = openSync(join(USER_DIR, "install.log"), "a");
    spawn(process.execPath, [SELF, "install", "all", "--studio", root], { cwd: root, detached: true, stdio: ["ignore", log, log] }).unref();
    return true;
  } catch {
    return false;
  }
}

/** What the user decided, and what Claude should do next. */
function describeReview(page, { dir, feedback, summary: s }) {
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const saved = formatDateTime(Date.parse(feedback.savedAt)) || "just now";
  const next = `Saving it was their go-ahead, so carry on now without waiting for them to message you: read ${join(dir, "feedback.json")} and follow`;
  if (page.kind === "script") {
    const detail = s.approved
      ? `they approved the script${s.notes ? `, with ${plural(s.notes, "note")} to treat as small last tweaks` : ""}`
      : `they asked for changes: ${plural(s.notes, "note")}${s.hasGeneral ? " and a general comment" : ""}`;
    return `The user has finished reviewing script v${page.version} of ${page.project} (saved ${saved}): ${detail}. ${next} the script skill ("When the review comes in").`;
  }
  // notes pointed at something in the picture, each with a picture of it marked
  const pointed =
    page.kind === "storyboard"
      ? Object.values(feedback.scenes || {}).reduce((n, x) => n + (Array.isArray(x?.points) ? x.points.length : 0), 0)
      : (feedback.notes || []).filter((n) => n?.box || n?.arrow).length;
  const pictures = pointed
    ? `; ${plural(pointed, "note")} point${pointed === 1 ? "s" : ""} at something in the picture (${pointed === 1 ? "its picture, with their mark on it, is" : "their pictures, with the marks on them, are"} in ${join(dir, "points")}: look at ${pointed === 1 ? "it" : "them"} first)`
    : "";
  if (page.kind === "storyboard") {
    const detail = (s.allApproved ? "every scene is approved" : `${s.approved} approved, ${s.feedback} with feedback${s.hasGeneral ? ", and general notes asking for changes" : ""}`) + pictures;
    return `The user has finished reviewing storyboard v${page.version} of ${page.project} (saved ${saved}): ${detail}. ${next} the storyboard skill ("When the review comes in").`;
  }
  const detail =
    (s.approved
      ? `they approved the video${s.notes ? `, with ${plural(s.notes, "note")} to treat as small last tweaks` : ""}`
      : `they asked for changes: ${plural(s.notes, "note")}${s.hasGeneral ? " and a general comment" : ""}`) + pictures;
  return `The user has finished reviewing video v${page.version} of ${page.project} (saved ${saved}): ${detail}. ${next} stage 8 (video review) of the production skill.`;
}

main().catch((err) => {
  if (FRIENDLY.has(cmd)) {
    console.log(`Problem: ${err.message}`);
    process.exit(0);
  }
  console.error(err.message);
  process.exit(1);
});
