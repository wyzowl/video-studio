// How Claude shows a studio page. In a session with Video Studio's band (hooks/index.tsx), the band opens the page
// beside the chat by itself, once, so Claude only says in a line what's ready, with its link, and for a script,
// storyboard or video waits in the background for the user's review. Without the band (a host that doesn't run it),
// Claude opens the page itself, puts a card for it in the chat with the page's link under it (the link alone without
// the desktop app's widgets), and waits the same way.
// Used by `studio.mjs show` and the page-ready hook, so both say the same thing. The band says it's there through
// `studio.mjs ready --session <id>` (.studio/band.json), and a page to open is kept for it in .studio/open.json.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  PLUGIN_ROOT,
  brandColours,
  listBrands,
  listVideos,
  parseSize,
  readBrand,
  readReview,
  readScript,
  readStoryboard,
  readStudio,
  readVideo,
  scriptLength,
  scriptRows,
  timecode,
} from "./studio.mjs";
import { CATEGORIES, libraryItem, libraryItems } from "./library.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const pageUrl = (base, path) => base.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`);

/** What the card says about a page, all taken from the studio's own files. */
function cardFacts(root, page) {
  if (page.kind === "dashboard") {
    const facts = [readStudio(root).name, plural(listVideos(root).length, "video"), plural(listBrands(root).length, "brand")];
    return { icon: "layout-dashboard", heading: "Studio dashboard", facts };
  }
  if (page.kind === "library") {
    const items = libraryItems(page.category);
    const facts = items.length ? [plural(items.length, "item"), `${items.filter((i) => i.free).length} free`, "in any brand and size"] : ["On the way"];
    return { icon: "layout-grid", heading: `Library: ${CATEGORIES[page.category].title}`, facts };
  }
  if (page.kind === "item") {
    const item = libraryItem(page.code);
    return { icon: "layout-grid", heading: `${item?.code} ${item?.name}`, facts: [CATEGORIES[page.category].title, item?.summary].filter(Boolean) };
  }
  if (page.kind === "brand") {
    const brand = readBrand(root, page.slug);
    const colours = brandColours(brand).all;
    const fonts = [...new Set((brand.fonts || []).map((f) => f?.family).filter(Boolean))];
    const facts = [plural(colours.length, "colour"), fonts.join(" and ")].filter(Boolean);
    return { icon: "palette", heading: `Brand kit: ${brand.name}`, facts, swatches: colours.slice(0, 8).map((c) => c.hex) };
  }
  const video = readVideo(root, page.project);
  const title = video?.title || page.project;
  if (page.kind === "project") {
    return { icon: "movie", heading: title, facts: [video?.status.label, video?.size.label].filter(Boolean) };
  }
  if (page.kind === "delivery") {
    let files = 0;
    try {
      files = readdirSync(join(root, "videos", page.project, "renders"), { withFileTypes: true }).filter((e) => e.isFile()).length;
    } catch {}
    return { icon: "package", heading: `The final video: ${title}`, facts: [plural(files, "file"), video?.size.label].filter(Boolean) };
  }
  if (page.kind === "script") {
    const sc = readScript(root, page.project, page.version)?.script || {};
    const length = scriptLength(sc);
    const facts = [title, plural(scriptRows(sc).length, "row"), length ? `${length.words} words ≈ ${length.seconds} s` : "text on screen"];
    return { icon: "file-text", heading: `Script v${page.version} is ready`, facts };
  }
  if (page.kind === "storyboard") {
    const sb = readStoryboard(root, page.project, page.version)?.storyboard || {};
    const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
    const duration = sb.duration ?? scenes.reduce((mx, s) => Math.max(mx, +s.end || 0), 0);
    const facts = [title, plural(scenes.length, "scene"), duration ? timecode(duration) : ""].filter(Boolean);
    return { icon: "layout-grid", heading: `Storyboard v${page.version} is ready`, facts };
  }
  const rv = readReview(root, page.project, page.version)?.review || {};
  const facts = [title, rv.duration ? timecode(rv.duration) : "", rv.size ? parseSize(rv.size).label : ""].filter(Boolean);
  return { icon: "player-play", heading: `Video v${page.version} is ready`, facts };
}

/** The chat card for a page (for the Claude desktop app's show_widget): a Wyzowl-yellow tile and what the page is,
    in real facts from the studio's files. It holds no link or button: the app opens nothing from a card (a link,
    openLink() and a window all do nothing there), so the link that opens the page goes right under the card, in
    Claude's own message, where links work. Flat and in the host's own tokens, so it suits light and dark. */
export function pageCard(root, page) {
  const c = cardFacts(root, page);
  // the link is under the card, in Claude's message: the heading says so, so nobody looks for a button on it
  const title = `${c.heading} – Click link below to open`;
  const swatches = c.swatches?.length
    ? `<div style="display:flex;gap:6px;margin-top:8px">${c.swatches.map((hex) => `<span style="width:16px;height:16px;border-radius:50%;background:${hex};border:0.5px solid var(--border-strong)"></span>`).join("")}</div>`
    : "";
  return [
    `<h2 class="sr-only">${esc(`${c.heading}: ${c.facts.join(", ")}.`)}</h2>`,
    `<div style="background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;gap:16px;flex-wrap:wrap">`,
    `<div style="width:44px;height:44px;border-radius:var(--radius);background:#F9B336;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-${c.icon}" style="font-size:22px;color:#412402" aria-hidden="true"></i></div>`,
    `<div style="flex:1;min-width:200px"><p style="margin:0;font-weight:500;font-size:15px">${esc(title)}</p><p style="margin:0;font-size:13px;color:var(--text-secondary)">${esc(c.facts.join(" · "))}</p>${swatches}</div>`,
    `</div>`,
  ].join("");
}

// ───────── the band ─────────

const DAY = 86400e3;
// a page the band hasn't opened after this long is left to the user (a session picked up again later, say)
const FRESH = 10 * 60e3;
const readKeyed = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8")) || {};
  } catch {
    return {};
  }
};
const writeKeyed = (root, file, all) => {
  mkdirSync(join(root, ".studio"), { recursive: true });
  writeFileSync(file, `${JSON.stringify(all, null, 2)}\n`);
};
const bandFile = (root) => join(root, ".studio", "band.json");
const openFile = (root) => join(root, ".studio", "open.json");

/** The band says it's there for a session (each time it asks what's waiting); a day's silence forgets it. */
export function bandSeen(root, session, now = Date.now()) {
  if (!session) return;
  const all = Object.fromEntries(Object.entries(readKeyed(bandFile(root))).filter(([, t]) => now - Date.parse(t) < DAY));
  // written at most every few minutes, as the band asks after every turn
  if (all[session] && now - Date.parse(all[session]) < 5 * 60e3) return;
  all[session] = new Date(now).toISOString();
  writeKeyed(root, bandFile(root), all);
}

/** Whether this session has the band, so a page opens beside the chat by itself. */
export function hasBand(root, session) {
  const t = session && readKeyed(bandFile(root))[session];
  return Boolean(t && Date.now() - Date.parse(t) < DAY);
}

/** Ask the band to open a page beside the chat (it opens each request once). */
export function openForBand(root, session, page) {
  if (!session) return;
  const now = Date.now();
  const all = Object.fromEntries(Object.entries(readKeyed(openFile(root))).filter(([, o]) => now - Date.parse(o?.at) < DAY));
  all[session] = { path: page.path, at: new Date(now).toISOString() };
  writeKeyed(root, openFile(root), all);
}

/** The page waiting for this session's band to open, if it was asked for in the last few minutes: { path, at }. */
export function pageToOpen(root, session) {
  const o = session && readKeyed(openFile(root))[session];
  return o?.path && Date.now() - Date.parse(o.at) < FRESH ? { path: o.path, at: o.at } : null;
}

const LINKS = { dashboard: "Open the dashboard", brand: "Open the brand page", project: "Open the video overview", delivery: "Open the delivery page", library: "Open the library" };
/** The labelled link to a page, as Claude writes it in the chat. */
export function pageLink(base, page) {
  const label = LINKS[page.kind] || { script: `Open script v${page.version}`, storyboard: `Open storyboard v${page.version}`, review: `Open video v${page.version}`, item: `Open ${page.code}` }[page.kind] || "Open the page";
  return `[${label} ↗](${pageUrl(base, page.path)})`;
}

/** What Claude does when the band opens the page: a line on what's ready with its link, and for a script, storyboard or
    video, the background wait. */
export function bandInstructions(root, base, page) {
  const helper = `node "${join(PLUGIN_ROOT, "scripts", "studio.mjs")}"`;
  const waits = ["script", "storyboard", "review"].includes(page.kind) && page.latest;
  return [
    `Wyzowl Video Studio: ${page.label} is ready, and opens beside the chat by itself: ${pageUrl(base, page.path)}`,
    `Say in a line what's ready, with this link: ${pageLink(base, page)}.`,
    waits &&
      `Then wait for the review in the background: run ${helper} wait ${page.path} --studio "${root}" with run_in_background. Tell the user to press Approve and save when they're done (it says ${page.kind === "storyboard" ? "Send feedback" : "Send changes"} once there are notes) and you'll take it from there, then end your turn.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** What Claude should do to show a page now. `unsaved` lists addresses of open pages with feedback not yet saved. */
export function showInstructions(root, base, page, { unsaved = [] } = {}) {
  const url = pageUrl(base, page.path);
  const helper = `node "${join(PLUGIN_ROOT, "scripts", "studio.mjs")}"`;
  const studio = `--studio "${root}"`;
  const link = { dashboard: "Open the dashboard", brand: "Open the brand page", project: "Open the video overview", delivery: "Open the delivery page", script: `Open script v${page.version}`, storyboard: `Open storyboard v${page.version}`, review: `Open video v${page.version}`, library: "Open the library", item: `Open ${page.code}` }[page.kind];
  const id = [page.kind, page.version && `v${page.version}`, page.project || page.slug || page.code || page.category].filter(Boolean).join("_").replace(/[^A-Za-z0-9]+/g, "_").toLowerCase();
  const waits = ["script", "storyboard", "review"].includes(page.kind) && page.latest;
  const steps = [
    "1. Open it in your Browser pane, beside the chat (tabs_context lists the tabs): if a tab already shows this page, bring it to the front; if one shows another studio page, navigate that tab here and bring it to the front; otherwise open it with preview_start and this url." +
      (unsaved.length ? ` Don't navigate away from ${unsaved.join(" or ")}: it has review changes the user hasn't saved, so open a new tab instead.` : "") +
      ` With no Browser pane, run: ${helper} open ${page.path} ${studio}`,
    `2. Show them a card for the page, with the link that opens it right under it. If you have the show_widget tool (Claude desktop app), call it with title "${id}" and exactly this widget_code:\n${pageCard(root, page)}\nThen, directly under the card in your message (or alone, without show_widget), write this labelled link, which opens the page in their browser (the card itself can't hold a working link): [${link} ↗](${url})`,
    waits &&
      `3. Wait for their review in the background: run ${helper} wait ${page.path} ${studio} with run_in_background. Tell them to press Approve and save when they're done (it says ${page.kind === "storyboard" ? "Send feedback" : "Send changes"} once there are notes) and you'll take it from there, then end your turn. When the wait finishes you're woken with their review. Saving it was their go-ahead, so carry on straight away.`,
  ];
  return [
    `Wyzowl Video Studio: ${page.label} is ready to show: ${url}`,
    "Show it to the user now:",
    ...steps.filter(Boolean),
    "Studio pages refresh themselves when their files change, so later edits don't need them opened again.",
  ].join("\n");
}
