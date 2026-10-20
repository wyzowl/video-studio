// Page templates for the studio server: dashboard, brand pages, video overviews, and the script, storyboard and video
// review pages.
// Pages are rendered on each request from the studio's files, so a refresh always shows the current state.
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PLUGIN_ROOT,
  pluginVersion,
  listBrands,
  listVideos,
  readBrand,
  readVideo,
  readBrief,
  readScript,
  scriptVersions,
  scriptRows,
  scriptHasVoiceover,
  scriptFromFootage,
  scriptWordsLabel,
  rowSources,
  scriptLength,
  voiceoverText,
  WORDS_PER_MINUTE,
  readStoryboard,
  storyboardVersions,
  readReview,
  reviewVersions,
  brandColours,
  parseSize,
  formatDate,
  formatDateTime,
  readFavourites,
  whatsNew,
  timecode,
  contrast,
} from "./studio.mjs";
import { CATEGORIES, SIZES, BRAND_VARS, libraryItems, libraryItem, lockedItems, findItem, brokenItems, contentVariables, brandStyle } from "./library.mjs";
import { catalogue, installedPack, licence } from "./paid.mjs";
import { SCORES, stageTitle, stepsNow } from "./progress.mjs";
import { deliveryFiles, deliveryWords, hasDelivery } from "./delivery.mjs";
import { checksNow, setupNotes } from "./checks.mjs";
import { TIDY_MIN_BYTES, lastTidy, sizeLabel, studioTidy, tidyPlan, tidyWhat } from "./tidy.mjs";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const enc = (p) => String(p).split("/").map(encodeURIComponent).join("/");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const isDarkHex = (hex) => (hex ? contrast(hex, "#ffffff") > contrast(hex, "#1e1e1e") : false);
const safeHex = (hex) => (/^#[0-9a-f]{3,8}$/i.test(hex || "") ? hex : null);

const COMMANDS = {
  newVideo: "/video-studio:new-video",
  newBrand: "/video-studio:new-brand",
};
// The Wyzowl logo, inlined so its wordmark can take the masthead's --logo-text colour (the owl stays yellow)
const LOGO = readFileSync(join(PLUGIN_ROOT, "ui", "wyzowl-logo.svg"), "utf8");
// status → chip colour
const CHIP = {
  planning: "planning",
  script: "storyboard",
  scriptChanges: "feedback",
  scriptApproved: "production",
  storyboard: "storyboard",
  feedback: "feedback",
  production: "production",
  review: "draft",
  changes: "feedback",
  approved: "production",
  delivered: "delivered",
};

// ───────── shell ─────────

function layout({ title, active = "", studio, body, foot = "", head = "" }) {
  const nav = [
    ["videos", "/#videos", "Videos"],
    ["brands", "/#brands", "Brands"],
    ["library", "/library/", "Library"],
  ]
    .map(([key, href, label]) =>
      href
        ? `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`
        : `<span class="is-soon" title="Coming in a later update">${label}</span>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Wyzowl Video Studio</title>
<link rel="icon" type="image/svg+xml" href="/ui/wyzowl-icon.svg">
<link rel="stylesheet" href="/ui/studio.css">
${head}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <div class="masthead_row">
    <a class="wordmark" href="/"><span class="wordmark_logo">${LOGO}</span><span class="wordmark_product">Video Studio</span></a>
    <nav class="nav" aria-label="Studio">${nav}</nav>
  </div>
</header>
<main id="main">
${body}
</main>
${footer(studio)}
${foot}
<script src="/ui/page.js" defer></script>
<script src="/ui/live.js" defer></script>
</body>
</html>`;
}

function footer(studio) {
  return `<footer class="section section--dark section--rule section--tight footer">
  <div class="container">
    <dl class="titleblock">
      ${cell("Studio", studio.name)}
      ${cell("Folder", studio.root)}
      ${cell("Plugin", `Wyzowl Video Studio ${pluginVersion()}`)}
      ${cell("HyperFrames", studio.hyperframes || "not set")}
    </dl>
    <p class="footer_note">Pages update themselves when Claude changes something. To change anything, ask Claude in your studio session.${studio.root ? ` <a href="/health">Studio health</a>` : ""}</p>
  </div>
</footer>`;
}

const cell = (label, value) => `<div class="titleblock_cell"><dt>${esc(label)}</dt><dd>${value == null || value === "" ? "—" : esc(value)}</dd></div>`;
const eyebrow = (index, label, plain = false) =>
  `<p class="eyebrow${plain ? " eyebrow--plain" : ""}"><span class="eyebrow_index">${esc(index)}</span><span>${esc(label)}</span></p>`;
const tc = (n) => `00:${String(n).padStart(2, "0")}`;

/** A framed image with crop marks. `zoom` ({ w, h, label }: the video's size) makes it open full size in the page's
    viewer (ui/page.js) when clicked; without the script, the link opens the image itself. */
function frame({ src, ratio = "16 / 9", alt = "", caption = "", time = "", href = "", empty = "No image yet", portrait = false, contain = false, panel = "", zoom = null }) {
  const media = src
    ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"${contain ? ' class="frame_contain"' : ""}>`
    : `<span class="frame_empty">${esc(empty)}</span>`;
  const stage = `<div class="frame_media" style="--ratio: ${ratio};${panel ? ` background: ${panel};` : ""}">${media}</div>`;
  const cap = caption || time ? `<figcaption class="frame_caption"><span>${esc(caption)}</span>${time ? `<span class="frame_time">${esc(time)}</span>` : ""}</figcaption>` : "";
  const zoomable = zoom && src;
  const link = zoomable
    ? `<a class="frame_stage frame_stage--zoom" href="${esc(src)}" data-zoom data-w="${zoom.w}" data-h="${zoom.h}" data-label="${esc(zoom.label)}"${zoom.id ? ` data-frame-id="${esc(zoom.id)}"` : ""} title="Open full size">${stage}</a>`
    : href
      ? `<a class="frame_stage" href="${esc(href)}">${stage}</a>`
      : `<div class="frame_stage">${stage}</div>`;
  return `<figure class="frame"${portrait && !zoomable ? ' style="max-width: 12rem"' : ""}>${link}${cap}</figure>`;
}

/** A hero description. Past 50 words it's cut short, with a "Read more" button that opens the rest (ui/page.js).
    Up to 60 words show whole, so "Read more" never hides just a word or two. */
function lede(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length <= 60) return `<p class="lede">${esc(words.join(" "))}</p>`;
  const head = words.slice(0, 50).join(" ").replace(/[,;:–—-]+$/, "");
  return `<p class="lede" data-more>${esc(head)}<span class="lede_ellipsis" aria-hidden="true">…</span> <span class="lede_rest" hidden>${esc(words.slice(50).join(" "))}</span> <button class="readmore" type="button" aria-expanded="false">Read more</button></p>`;
}

/** A video's description on its pages (the overview and every review page): one or two sentences saying what the
    video is. The brief's own `description` when it has one; otherwise the start of what there is (the brief's intent,
    then the fallbacks given): its first sentence, and the second too while the two stay short. */
function videoDescription(brief, ...fallbacks) {
  const sentences = (t) => String(t || "").trim().split(/(?<=[.!?…])\s+(?=[“"‘'(\p{Lu}\d])/u);
  if (String(brief?.description || "").trim()) return sentences(brief.description).slice(0, 2).join(" ");
  const [first = "", second = ""] = sentences([brief?.intent, ...fallbacks].find((t) => String(t || "").trim()));
  return second && first.length + second.length < 180 ? `${first} ${second}` : first;
}
const shortLede = (text) => (text ? `<p class="lede lede--short">${esc(text)}</p>` : "");

/** The notes under a review page's hero: what changed in this version and how to review it, side by side (what
    changed on the left), each closed until it's opened; either one alone takes the full width. An earlier version's
    warning comes first and stays open, as it links to the latest. */
function heroNotes({ earlier = "", changed = null, howTo = "" }) {
  const fold = (title, body) => `<details class="callout fold"><summary><strong>${esc(title)}</strong></summary>${body}</details>`;
  const parts = [changed && fold(changed.title, `<p>${esc(changed.text)}</p>`), howTo && fold("How to review", howTo)].filter(Boolean);
  return `${earlier}${parts.length ? `<div class="hero_notes${parts.length > 1 ? " hero_notes--two" : ""}">${parts.join("")}</div>` : ""}`;
}

/** What a review page's save button says: what saving will do (ui/script.js and ui/review.js keep it up to date). */
const SAVE = { approved: "Approve and save", changes: "Send changes" };

/** The decision on a script or video. It's Approve unless there are notes: the page switches it to Changes needed
    when a note is added or the general notes have something in them (ui/script.js, ui/review.js). */
function decisionOptions(chosen, approve) {
  const option = (value, label, cls = "") =>
    `<label class="review_option${cls}"><input type="radio" name="decision" value="${value}"${value === chosen ? " checked" : ""}> ${label}</label>`;
  return option("approved", approve, " review_option--approved") + option("changes", "Changes needed", " review_option--feedback");
}
const DECISION_LABEL = { approved: "Approve", changes: "Changes needed" };
/** The decision a review page opens on: what was saved, or Approve unless there are notes (a review saved while there
    was a third choice, Not decided, goes by its notes too). */
const openingDecision = (fb, summary) =>
  fb && DECISION_LABEL[summary.decision] ? summary.decision : fb && (summary.notes || summary.hasGeneral) ? "changes" : "approved";

/** Where a script, storyboard or video version stands, for chips and the stage switcher: { key, label }. */
function versionState(studio, slug, kind, v, latest) {
  if (kind === "storyboard") {
    const s = readStoryboard(studio.root, slug, v)?.summary;
    if (s?.allApproved) return { key: "approved", label: "Approved" };
    if (s?.saved && s.changes) return { key: "feedback", label: s.feedback ? `Feedback on ${plural(s.feedback, "scene")}` : "Feedback: general notes" };
    if (latest) return { key: "ready", label: s?.saved ? "Review in progress" : "Ready for review" };
    return { key: "none", label: "Not reviewed" };
  }
  const s = (kind === "script" ? readScript : readReview)(studio.root, slug, v)?.summary;
  if (s?.decision === "approved") return { key: "approved", label: "Approved" };
  if (s?.decision === "changes") return { key: "feedback", label: `Changes: ${plural(s.notes, "note")}` };
  if (latest) return { key: "ready", label: s?.saved ? "Review in progress" : "Ready for review" };
  return { key: "none", label: "Not reviewed" };
}

/** A video's scripts, storyboards and videos, a row each, to move between them, each version with a dot for where it
    stands. `current` is "script-1", "storyboard-2", "review-1" and so on. (The breadcrumb leads to the overview.) */
function stagesNav(studio, slug, current = "") {
  const base = `/videos/${enc(slug)}/`;
  const row = (kind, label) => {
    const versions = { script: scriptVersions, storyboard: storyboardVersions, review: reviewVersions }[kind](studio.root, slug);
    if (!versions.length) return "";
    const items = versions.map((v) => {
      const st = versionState(studio, slug, kind, v, v === versions.at(-1));
      const attrs = `class="stages_item stages_item--${st.key}" title="${esc(`${label} v${v}: ${st.label}`)}"`;
      return `${kind}-${v}` === current ? `<span ${attrs} aria-current="page">v${v}</span>` : `<a ${attrs} href="${base}${kind}/v${v}/">v${v}</a>`;
    });
    return `<span class="stages_group">${label}</span><span class="stages_items">${items.join("")}</span>`;
  };
  const delivered = hasDelivery(studio.root, slug)
    ? `<span class="stages_group">Video delivery</span><span class="stages_items">${current === "delivery" ? `<span class="stages_item" aria-current="page">All assets</span>` : `<a class="stages_item" href="${base}delivery/">All assets</a>`}</span>`
    : "";
  const rows = row("script", "Script") + row("storyboard", "Storyboard") + row("review", "Video") + delivered;
  return rows ? `<nav class="stages" aria-label="Every version of the script, storyboard and video, and the delivery">${rows}</nav>` : "";
}

/** A version's download, to share outside the studio, and where feedback that comes back goes. A PDF is made when
    it's asked for, so ui/page.js shows that it's on its way and offers its copy in Finder. */
function share({ href, label, pdf = false, note = "" }) {
  return `<div class="share">
  <a class="button button--secondary" href="${esc(href)}"${pdf ? ' data-download="pdf"' : " download"}>${esc(label)}</a>
  <p class="share_note" data-share-note aria-live="polite">${note}</p>
</div>`;
}
const SHARE_NOTE = `To share outside the studio. Paste any feedback that comes back into <a href="#n-general">Anything else?</a>, then save.`;
const fileSize = (bytes) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

function page404(studio, what) {
  return layout({
    title: "Not found",
    studio,
    body: `<section class="section section--hero"><div class="container">${eyebrow("404", "Not found", true)}<h1>${esc(what)} wasn't found</h1><p class="lede">It may have been renamed or not created yet.</p><p><a class="button" href="/">Back to the dashboard</a></p></div></section>`,
  });
}

// ───────── dashboard ─────────

export function dashboardPage(studio) {
  const videos = listVideos(studio.root);
  const brands = listBrands(studio.root);
  const brandBySlug = Object.fromEntries(brands.map((b) => [b.slug, b]));
  const inProgress = videos.filter((v) => v.status.key !== "delivered").length;
  const delivered = videos.length - inProgress;
  const last = videos.reduce((m, v) => Math.max(m, v.updated || 0), 0);
  const usage = (slug) => videos.filter((v) => v.brand === slug).length;

  const videoItems = videos
    .map((v) => {
      const brand = v.brand ? brandBySlug[v.brand] : null;
      const portrait = v.size.h > v.size.w;
      const key = v.status.key;
      const overview = `/videos/${enc(v.slug)}/`;
      const actions = [
        v.review
          ? `<a class="button${key === "review" ? " button--corners" : " button--secondary"}" href="${esc(v.review.url)}">${key === "review" ? "Review video" : `Video v${v.review.version}`}</a>`
          : "",
        v.storyboard
          ? `<a class="button${key === "storyboard" ? " button--corners" : " button--secondary"}" href="${esc(v.storyboard.url)}">${key === "storyboard" ? "Review storyboard" : `Storyboard v${v.storyboard.version}`}</a>`
          : "",
        v.script && !v.storyboard
          ? `<a class="button${key === "script" ? " button--corners" : " button--secondary"}" href="${esc(v.script.url)}">${key === "script" ? "Review script" : `Script v${v.script.version}`}</a>`
          : "",
        v.master ? `<a class="button button--secondary" href="${esc(v.master.url)}">Watch video</a><a class="button button--secondary" href="${overview}delivery/">All assets</a>` : "",
      ].join("");
      const brandChip = brand
        ? `<a class="chip chip--swatch" style="--_dot: ${esc(brandColours(brand).accent || "#ccc")}" href="/brands/${enc(brand.slug)}/">${esc(brand.name)}</a>`
        : v.brand
          ? `<span class="chip chip--plain">${esc(v.brand)}</span>`
          : "";
      return `<li class="timeline_item">
  <time class="timeline_date" datetime="${new Date(v.created).toISOString()}">${esc(formatDate(v.created))}</time>
  <article class="video-card">
    ${frame({ src: v.thumbnail, ratio: v.size.ratio, href: overview, empty: "Frames appear with the storyboard", portrait })}
    <div class="video-card_body">
      <div class="row"><span class="chip chip--${v.progress ? "working" : CHIP[key] || "planning"}">${esc(v.status.label)}</span></div>
      <h3 class="video-card_title"><a class="title-link" href="${overview}">${esc(v.title)}</a></h3>
      <div class="row">${brandChip}<span class="chip chip--plain">${esc(v.type === "footage" ? "Footage" : "Animated")}</span><span class="chip chip--plain">${esc(v.size.label)}</span>${v.length ? `<span class="chip chip--plain chip--raw">${esc(v.length)}</span>` : ""}</div>
      <p class="video-card_status">Updated ${esc(formatDateTime(v.updated))} · <span class="mono">videos/${esc(v.slug)}</span></p>
      ${actions ? `<div class="row">${actions}</div>` : ""}
    </div>
  </article>
</li>`;
    })
    .join("\n");

  const brandCards = brands
    .map((b) => {
      const { all, ground } = brandColours(b);
      const logo = pickLogo(b, ground);
      const panel = safeHex(logo?.background) || ground || "var(--background-3)";
      const fonts = [...new Set((b.fonts || []).map((f) => f.family).filter(Boolean))];
      const n = usage(b.slug);
      return `<article class="card brand-card">
  <div class="brand-card_panel" style="--_panel: ${esc(panel)}; --_panel-text: ${isDarkHex(ground) ? "#fff" : "#1e1e1e"}">
    ${logo ? `<img src="/brands/${enc(b.slug)}/${enc(logo.file)}" alt="${esc(b.name)} logo">` : `<span>${esc(b.name)}</span>`}
  </div>
  <div class="card_body">
    <h3 class="card_title"><a class="card_link" href="/brands/${enc(b.slug)}/">${esc(b.name)}</a></h3>
    ${all.length ? `<div class="swatch-strip" aria-label="Brand colours">${all.map((c) => `<span style="background: ${esc(c.hex)}" title="${esc(c.name || c.hex)}"></span>`).join("")}</div>` : ""}
    ${fonts.length ? `<p class="mono muted">${esc(fonts.join(" · "))}</p>` : ""}
    <p class="muted">${n ? `Used in ${plural(n, "video")}` : "Not used in a video yet"}</p>
  </div>
</article>`;
    })
    .join("\n");

  // placeholders: a new studio shows these instead of example content
  const videoPlaceholder = `<li class="timeline_item">
  <span class="timeline_date">Next</span>
  <article class="video-card video-card--placeholder">
    <figure class="frame"><div class="frame_stage"><div class="frame_media" style="--ratio: 16 / 9"><span class="frame_empty"><span class="placeholder_plus" aria-hidden="true">+</span>Your first video</span></div></div></figure>
    <div class="video-card_body">
      <h3 class="video-card_title">Make your first video</h3>
      <p class="video-card_status">In Claude Code, in this studio, run <code>${COMMANDS.newVideo}</code>. Claude asks a few questions, makes a storyboard for you to approve, then builds the video.</p>
    </div>
  </article>
</li>`;
  const brandPlaceholder = `<article class="placeholder">
  <div class="placeholder_panel"><span><span class="placeholder_plus" aria-hidden="true">+</span>${brands.length ? "Add another brand" : "Add your first brand"}</span></div>
  <div class="card_body">
    <h3 class="card_title">${brands.length ? "Another brand" : "Your first brand"}</h3>
    <p>Run <code>${COMMANDS.newBrand}</code>. Claude builds a brand kit from the website, logo, colours and fonts, and gives it a page here.</p>
  </div>
</article>`;

  const body = `
<section class="section section--hero">
  <div class="container">
    ${eyebrow(tc(0), "Studio")}
    <div class="split">
      <div class="stack">
        <h1 class="display">${esc(studio.name)}</h1>
        <p class="lede">Every video and brand in this studio. Start a video with <code>${COMMANDS.newVideo}</code> or add a brand with <code>${COMMANDS.newBrand}</code>.</p>
        ${waitingFor(videos)}
        ${needsAttention(studio)}
      </div>
      <dl class="titleblock">
        ${cell("Videos", String(videos.length))}
        ${cell("In progress", String(inProgress))}
        ${cell("Delivered", String(delivered))}
        ${cell("Brands", String(brands.length))}
        ${cell("Last activity", last ? formatDateTime(last) : "")}
      </dl>
    </div>
  </div>
</section>
${whatsNewCard(studio)}
<section class="section section--rule" id="videos">
  <div class="container">
    ${eyebrow(tc(1), "Videos")}
    <h2>Recent videos</h2>
    <ol class="timeline">${videos.length ? videoItems : videoPlaceholder}</ol>
  </div>
</section>
<section class="section section--rule" id="brands">
  <div class="container">
    ${eyebrow(tc(2), "Brands")}
    <h2>Brands</h2>
    <div class="grid">${brandCards}${brandPlaceholder}</div>
  </div>
</section>
<section class="section section--rule" id="library">
  <div class="container">
    ${eyebrow(tc(3), "Library")}
    <h2>Ideas for your next video</h2>
    <div class="ggrid">${Object.keys(CATEGORIES).map(libraryCard).join("")}</div>
  </div>
</section>`;
  return layout({ title: studio.name, active: "videos", studio, body });
}

/** On the dashboard, when something this studio needs isn't on the Mac: what, and the way to Studio health. */
function needsAttention(studio) {
  const missing = checksNow(studio.root).filter((c) => !c.ok && !c.optional);
  if (!missing.length) return "";
  const names = missing.map((c) => c.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return `<p class="attention"><span class="attention_mark" aria-hidden="true">!</span><span><b>${esc(plural(missing.length, "thing"))} ${missing.length === 1 ? "needs" : "need"} attention:</b> ${esc(list)}. <a href="/health">See Studio health</a>, which says what to tell Claude.</span></p>`;
}

/** The notes of the updates this studio hasn't seen yet, at the top of the dashboard until they're put away. */
function whatsNewCard(studio) {
  const notes = whatsNew(studio.root).filter((n) => n.items.length);
  if (!notes.length) return "";
  const newest = notes[0].version;
  const items = notes.flatMap((n) => n.items).slice(0, 6);
  return `<section class="section section--rule whatsnew" data-whatsnew="${esc(newest)}" aria-labelledby="whatsnew-title">
  <div class="container">
    <div class="whatsnew_card">
      <div class="stack">
        <p class="field-label">Updated to ${esc(newest)}</p>
        <h2 class="card_title" id="whatsnew-title">What's new</h2>
      </div>
      <ul class="whatsnew_list">${items.map((x) => `<li>${x.href ? `<a href="${esc(x.href)}">${esc(x.text)}</a>` : esc(x.text)}</li>`).join("")}</ul>
      <div class="row"><button class="button button--secondary" type="button" data-whatsnew-done>Got it</button></div>
    </div>
  </div>
</section>`;
}

/** Every review waiting for the user across the studio, for the top of the dashboard. */
function waitingFor(videos) {
  const items = videos.flatMap((v) => {
    const stage = { script: v.script, storyboard: v.storyboard, review: v.review }[v.status.key];
    if (!stage?.url) return [];
    const what = { script: "Script", storyboard: "Storyboard", review: "Video" }[v.status.key];
    return [`<a class="waiting_item" href="${esc(stage.url)}"><b>${what} v${esc(stage.version)}</b><span>${esc(v.title)}</span></a>`];
  });
  return items.length ? `<div class="waiting"><span class="field-label">Waiting for you</span><div class="waiting_items">${items.join("")}</div></div>` : "";
}

/** A library category on the dashboard: its first item playing, and what's in it. */
function libraryCard(category) {
  const c = CATEGORIES[category];
  const items = libraryItems(category);
  const free = items.filter((i) => i.free).length;
  const chips = items.length
    ? `<span class="chip chip--plain">${esc(plural(items.length, "item"))}</span>${free ? `<span class="chip chip--plain">${esc(`${free} free`)}</span>` : ""}`
    : `<span class="chip chip--soon">On the way</span>`;
  return `<article class="card gitem">
  <div class="gitem_media">${items[0] ? gframe(items[0], { brand: null, size: "16x9" }) : `<div class="gframe gframe--empty" style="--ratio: 16 / 9; --ar: 1.7778"><span>On the way</span></div>`}</div>
  <div class="card_body">
    <div class="row">${chips}</div>
    <h3 class="card_title"><a class="card_link" href="/library/${category}/">${esc(c.title)}</a></h3>
    <p class="muted">${esc(c.lede)}</p>
  </div>
</article>`;
}

function pickLogo(brand, ground) {
  const logos = Array.isArray(brand.logos) ? brand.logos.filter((l) => l.file) : [];
  if (!logos.length) return null;
  const want = isDarkHex(ground) ? "dark" : "light";
  return logos.find((l) => (l.on || "").toLowerCase() === want) || logos[0];
}

// ───────── brand page ─────────

const EASES = {
  power1: ["0.55, 0.085, 0.68, 0.53", "0.25, 0.46, 0.45, 0.94", "0.455, 0.03, 0.515, 0.955"],
  power2: ["0.55, 0.055, 0.675, 0.19", "0.215, 0.61, 0.355, 1", "0.645, 0.045, 0.355, 1"],
  power3: ["0.895, 0.03, 0.685, 0.22", "0.165, 0.84, 0.44, 1", "0.77, 0, 0.175, 1"],
  power4: ["0.755, 0.05, 0.855, 0.06", "0.23, 1, 0.32, 1", "0.86, 0, 0.07, 1"],
  expo: ["0.95, 0.05, 0.795, 0.035", "0.19, 1, 0.22, 1", "1, 0, 0, 1"],
  sine: ["0.47, 0, 0.745, 0.715", "0.39, 0.575, 0.565, 1", "0.445, 0.05, 0.55, 0.95"],
  circ: ["0.6, 0.04, 0.98, 0.335", "0.075, 0.82, 0.165, 1", "0.785, 0.135, 0.15, 0.86"],
  back: ["0.6, -0.28, 0.735, 0.045", "0.175, 0.885, 0.32, 1.275", "0.68, -0.55, 0.265, 1.55"],
};
/** A GSAP ease name ("expo.out", "power3.inOut") → a CSS approximation, or null when CSS can't show it. */
export function cssEase(name) {
  const m = /^(power[1-4]|expo|sine|circ|back)\.(in|out|inOut)/.exec(String(name || "").trim());
  if (!m) return /^(none|linear)$/.test(name) ? "linear" : null;
  return `cubic-bezier(${EASES[m[1]][{ in: 0, out: 1, inOut: 2 }[m[2]]]})`;
}

export function brandPage(studio, slug) {
  const b = readBrand(studio.root, slug);
  if (!b) return { status: 404, html: page404(studio, `The brand “${slug}”`) };
  const videos = listVideos(studio.root).filter((v) => v.brand === slug);
  const { all: colours, ground } = brandColours(b);
  const fonts = Array.isArray(b.fonts) ? b.fonts : [];
  const logos = Array.isArray(b.logos) ? b.logos.filter((l) => l.file) : [];
  const refs = Array.isArray(b.references) ? b.references.filter((r) => r.file) : [];
  const base = `/brands/${enc(slug)}/`;
  let n = 0;
  const next = () => tc(++n);

  const faces = fonts
    .map((f, i) => (f.file ? `@font-face { font-family: "bf-${i}"; src: url("${base}${enc(f.file)}"); font-weight: 1 1000; font-display: swap; }` : ""))
    .join("\n");
  const fontStack = (f, i) => `${f.file ? `"bf-${i}", ` : ""}"${String(f.family || "").replace(/"/g, "")}", var(--font-body)`;

  const logoSection = logos.length
    ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "Logo")}
    <h2>Logo</h2>
    <div class="grid" style="--_min: 22rem">${logos
      .map((l) => {
        const on = (l.on || "light").toLowerCase();
        const panel = safeHex(l.background) || (on === "dark" ? (isDarkHex(ground) ? ground : "#1e1e1e") : on === "brand" ? ground : "#ffffff");
        return `<div class="stack">${frame({ src: `${base}${enc(l.file)}`, alt: `${b.name} logo`, contain: true, panel, caption: l.name || l.file })}${l.notes ? `<p class="muted">${esc(l.notes)}</p>` : ""}</div>`;
      })
      .join("")}</div>
  </div></section>`
    : "";

  const colourSection = colours.length
    ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "Colour")}
    <h2>Colour</h2>
    <div class="grid swatches">${colours
      .map((c) => {
        const w = contrast(c.hex, "#ffffff");
        const k = contrast(c.hex, "#1e1e1e");
        return `<article class="swatch">
        <div class="swatch_colour" style="--_c: ${esc(c.hex)}">
          <div class="swatch_sample" style="color: #fff">Aa <small>${w.toFixed(1)}:1</small></div>
          <div class="swatch_sample" style="color: #1e1e1e">Aa <small>${k.toFixed(1)}:1</small></div>
        </div>
        <div class="swatch_body">
          <div class="row" style="justify-content: space-between"><strong>${esc(c.name || "Colour")}</strong><span class="swatch_hex">${esc(c.hex)}</span></div>
          ${c.role ? `<div><span class="chip chip--plain">${esc(c.role)}</span></div>` : ""}
          ${c.notes ? `<p class="muted">${esc(c.notes)}</p>` : ""}
        </div>
      </article>`;
      })
      .join("")}</div>
    <p class="muted">The numbers are contrast ratios for white and near-black text on each colour. 4.5:1 or more reads well at body size; 3:1 is the minimum for large display type.</p>
  </div></section>`
    : "";

  const typeSection = fonts.length
    ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "Type")}
    <h2>Type</h2>
    <div class="stack">${fonts
      .map((f, i) => {
        const style = `font-family: ${fontStack(f, i)}; font-weight: ${Number(f.weight) || 400};${f.variation ? ` font-variation-settings: ${f.variation};` : ""}`;
        const meta = [f.role, f.family, f.weight && `weight ${f.weight}`, f.variable && "variable", f.axes, f.licence && `licence: ${f.licence}`, f.file || "system font"]
          .filter(Boolean)
          .map(esc)
          .join(" · ");
        return `<article class="specimen">
        <div class="specimen_glyph" style="${esc(style)}">Aa</div>
        <div class="stack">
          <p class="specimen_sample" style="${esc(style)}">${esc(f.sample || `${b.name} sets the pace. The quick brown fox jumps over the lazy dog.`)}</p>
          <p class="specimen_meta">${meta}</p>
          ${f.notes ? `<p class="muted">${esc(f.notes)}</p>` : ""}
        </div>
      </article>`;
      })
      .join("")}</div>
  </div></section>`
    : "";

  const m = b.motion || {};
  const easing = Array.isArray(m.easing) ? m.easing : Object.entries(m.easing || {}).map(([use, ease]) => ({ use, ease }));
  const durations = Array.isArray(m.durations) ? m.durations : Object.entries(m.durations || {}).map(([name, seconds]) => ({ name, seconds }));
  const motionSection =
    m && (m.personality || easing.length || durations.length || m.entrance)
      ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "Motion")}
    <h2>Motion identity</h2>
    <dl class="titleblock">
      ${cell("Personality", m.personality)}
      ${cell("Entrance", m.entrance)}
      ${cell("Ambient layer", m.ambient)}
      ${cell("Spring", m.spring)}
    </dl>
    ${
      easing.length
        ? `<div class="grid" style="--_min: 15rem">${easing
            .map((e) => {
              const css = cssEase(e.ease);
              return `<div class="ease-row"><span class="field-label">${esc(e.use || "Ease")}</span><strong class="mono">${esc(e.ease)}</strong>${css ? `<div class="ease-track"><span class="ease-dot" style="--_ease: ${css}"></span></div>` : `<p class="muted">No preview for this ease.</p>`}</div>`;
            })
            .join("")}</div>`
        : ""
    }
    ${durations.length ? `<p><span class="field-label">Durations</span><br><span class="mono">${durations.map((d) => `${esc(d.name)} ${esc(d.seconds)}s`).join(" · ")}</span></p>` : ""}
    ${m.notes ? `<p class="muted">${esc(m.notes)}</p>` : ""}
  </div></section>`
      : "";

  // the logo ident: the brand's sound for its logo, a sting from SFX Kit copied into the brand's folder
  const ident = b.ident && b.ident.file ? b.ident : null;
  const soundSection = ident
    ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "Sound")}
    <h2>Sound</h2>
    <div class="stack">
      <p><span class="field-label">Logo ident</span><br><strong>${esc(ident.name || ident.sound || "Logo ident")}</strong>${ident.sound ? ` <span class="mono muted">${esc(ident.sound)}</span>` : ""}</p>
      <audio controls preload="none" src="${base}${enc(ident.file)}" style="width: 100%; max-width: 28rem"></audio>
      ${ident.notes ? `<p class="muted">${esc(ident.notes)}</p>` : ""}
      <p class="muted">Videos for ${esc(b.name)} use it for the logo, unless the brief asks for something else.</p>
    </div>
  </div></section>`
    : "";

  const list = (arr) => `<ul class="rules-list">${arr.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`;
  const rules = Array.isArray(b.rules) ? b.rules : [];
  const lang = Array.isArray(b.graphicLanguage) ? b.graphicLanguage : [];
  const rulesSection =
    rules.length || lang.length || b.voice
      ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "Rules")}
    <h2>Rules and style</h2>
    <div class="split" style="align-items: start">
      ${rules.length ? `<div class="stack"><h3 class="card_title">Rules</h3>${list(rules)}</div>` : ""}
      ${lang.length || b.voice ? `<div class="stack">${lang.length ? `<h3 class="card_title">Graphic language</h3>${list(lang)}` : ""}${b.voice ? `<h3 class="card_title">Voice</h3><p>${esc(b.voice)}</p>` : ""}</div>` : ""}
    </div>
  </div></section>`
      : "";

  const refSection = refs.length
    ? `<section class="section section--rule"><div class="container">
    ${eyebrow(next(), "References")}
    <h2>References</h2>
    <div class="grid">${refs.map((r) => frame({ src: `${base}${enc(r.file)}`, caption: r.caption || r.file })).join("")}</div>
  </div></section>`
    : "";

  const usedIn = videos.length
    ? `<ul class="rules-list">${videos.map((v) => `<li><a href="/videos/${enc(v.slug)}/">${esc(v.title)}</a> <span class="muted">· ${esc(v.status.label)}</span></li>`).join("")}</ul>`
    : `<p class="muted">Not used in a video yet.</p>`;

  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/#brands">Brands</a> / ${esc(b.name)}</p>
    ${eyebrow(tc(0), "Brand kit")}
    <div class="split">
      <div class="stack">
        <h1 class="display">${esc(b.name)}</h1>
        ${lede(b.summary)}
        ${colours.length ? `<div class="swatch-strip swatch-strip--hero" aria-label="Brand colours">${colours.map((c) => `<span style="background: ${esc(c.hex)}" title="${esc(`${c.name || ""} ${c.hex}`.trim())}"></span>`).join("")}</div>` : ""}
        ${b.website ? `<p><a href="${esc(b.website)}" rel="noopener" target="_blank">${esc(b.website.replace(/^https?:\/\//, ""))}</a></p>` : ""}
        <p><a href="/library/?brand=${enc(slug)}">See the library in ${esc(b.name)}'s style</a></p>
      </div>
      <dl class="titleblock">
        ${cell("Colours", String(colours.length))}
        ${cell("Fonts", fonts.map((f) => f.family).filter(Boolean).join(", "))}
        ${cell("Logos", String(logos.length))}
        ${cell("Videos", String(videos.length))}
        ${cell("Updated", (b.updated && formatDate(Date.parse(b.updated))) || b.updated || formatDate(b._updated))}
        ${cell("Folder", `brands/${slug}`)}
      </dl>
    </div>
  </div>
</section>
${logoSection}${colourSection}${typeSection}${motionSection}${soundSection}${rulesSection}${refSection}
<section class="section section--rule"><div class="container">
  ${eyebrow(next(), "Use")}
  <div class="split" style="align-items: start">
    <div class="stack"><h2>Used in</h2>${usedIn}</div>
    <div class="stack">
      <h2>Change something</h2>
      <div class="callout"><p>Ask Claude in your studio session, for example:</p><p class="mono">“Update the ${esc(b.name)} brand: make the accent ${esc(colours[1]?.hex || "#…")} and use the dark logo on light backgrounds.”</p></div>
      ${Array.isArray(b.sources) && b.sources.length ? `<p class="muted">Sources: ${esc(b.sources.join("; "))}</p>` : ""}
    </div>
  </div>
</div></section>`;
  return { status: 200, html: layout({ title: b.name, active: "brands", studio, body, head: faces ? `<style>${faces}</style>` : "" }) };
}

// ───────── video overview ─────────

const mt = (p) => {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
};
const clip = (text, n = 40) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  return words.length > n ? `${words.slice(0, n).join(" ")}…` : words.join(" ");
};
// a version's state → chip colour
const STATE_CHIP = { approved: "production", feedback: "feedback", ready: "storyboard", none: "plain" };
const VOICEOVER = { none: "None", recorded: "Recorded", supplied: "Read from the script", ai: "AI voice" };

/** One stage on a video's overview timeline. `content` is HTML, after the lines of text. */
function stageItem({ date, title, chip = "", meta = "", text = [], content = "", thumb = null, actions = "", pending = false }) {
  const when = date ? `<time class="timeline_date" datetime="${new Date(date).toISOString()}">${esc(formatDateTime(date))}</time>` : `<span class="timeline_date">Now</span>`;
  const lines = [].concat(text).filter(Boolean);
  return `<li class="timeline_item${pending ? " timeline_item--pending" : ""}">
  ${when}
  <article class="stage-card${pending ? " stage-card--pending" : ""}">
    ${thumb ? frame(thumb) : ""}
    <div class="stage-card_body">
      <div class="row"><h3 class="stage-card_title">${esc(title)}</h3>${chip}</div>
      ${meta ? `<p class="stage-card_meta">${esc(meta)}</p>` : ""}
      ${lines.map((l) => `<p class="muted">${esc(l)}</p>`).join("")}
      ${content}
      ${actions ? `<div class="row stage-card_actions">${actions}</div>` : ""}
    </div>
  </article>
</li>`;
}

/** A section of a video's brief, from its markdown: paragraphs (their lines joined), "- " and "1. " lists, **bold**
    and `code`, and "> " quotes (the user's own words: their line breaks kept, nothing else read into them). */
function briefHtml(md) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const html = [];
  let block = null;
  const close = () => {
    if (!block) return;
    const { kind, lines } = block;
    if (kind === "p") html.push(`<p>${lines.map(inline).join(" ")}</p>`);
    else if (kind === "quote")
      html.push(
        `<blockquote class="brief_quote">${lines
          .join("\n")
          .split(/\n\s*\n/)
          .filter((p) => p.trim())
          .map((p) => `<p>${p.replace(/^\n+|\n+$/g, "").split("\n").map(esc).join("<br>")}</p>`)
          .join("")}</blockquote>`,
      );
    else html.push(`<${kind}>${lines.map((l) => `<li>${inline(l)}</li>`).join("")}</${kind}>`);
    block = null;
  };
  for (const line of String(md || "").split("\n")) {
    const quote = /^\s*>\s?(.*)$/.exec(line);
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const number = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      // a blank line ends a block, except inside a quote, where it's a paragraph break
      if (block?.kind === "quote") block.lines.push("");
      else close();
      continue;
    }
    const kind = quote ? "quote" : bullet ? "ul" : number ? "ol" : "p";
    const text = quote ? quote[1] : bullet ? bullet[1] : number ? number[1] : line.trim();
    // an indented line under a list item carries it on
    if (kind === "p" && (block?.kind === "ul" || block?.kind === "ol") && /^\s/.test(line)) {
      block.lines[block.lines.length - 1] += ` ${text}`;
      continue;
    }
    if (block?.kind !== kind) {
      close();
      block = { kind, lines: [] };
    }
    block.lines.push(text);
  }
  close();
  return html.join("");
}

/** The brief, on a video's overview: what the user asked for, in their own words, then Claude's summary and its notes
    from the start. Long parts open with "Show all" (ui/page.js). */
function briefContent(brief) {
  const part = (label, md, clamp = 0) =>
    `<div class="brief_part"><span class="field-label">${esc(label)}</span><div class="brief_text"${clamp ? ` data-clamp="${clamp}"` : ""}>${briefHtml(md)}</div></div>`;
  const request = brief.sections.find((s) => s.key === "request");
  const intent = brief.sections.find((s) => s.key === "intent");
  const rest = brief.sections.filter((s) => s !== request && s !== intent);
  const facts = [brief.message && `**Message:** ${brief.message}`, brief.audience && `**For:** ${brief.audience}`].filter(Boolean).join("\n\n");
  const parts = [
    request ? part("What you asked for", request.text, 8) : "",
    intent ? part("Claude's summary", intent.text) : "",
    facts ? `<div class="brief_text">${briefHtml(facts)}</div>` : "",
    rest.length ? `<div class="brief_notes" data-clamp="8">${rest.map((s) => part(s.title, s.text)).join("")}</div>` : "",
  ].join("");
  return parts ? `<div class="brief">${parts}</div>` : "";
}

/** What's happening with a video now, and the one thing to do next. */
function nowPanel(video) {
  const { key, label } = video.status;
  const sc = video.script;
  const sb = video.storyboard;
  const rv = video.review;
  const panel = (state, title, text, action = "") => `<div class="now now--${state}" role="status">
  ${state === "working" ? `<span class="now_pulse" aria-hidden="true"></span>` : ""}
  <div class="now_text"><strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ""}</div>
  ${action}
</div>`;
  const button = (href, text) => `<a class="button button--corners" href="${esc(href)}">${esc(text)}</a>`;
  if (video.working) {
    const from = `${{ script: "script", storyboard: "storyboard", review: "video" }[video.working.stage]} v${video.working.version}`;
    return panel("working", label, `Claude picked up your review of ${from} at ${formatDateTime(Date.parse(video.working.since))}. This page updates by itself as soon as there's something new to see.`);
  }
  if (key === "script") return panel("action", `Script v${sc.version} is ready for your review`, "Read it row by row and click any cell to leave a note. With no notes, press Approve and save.", button(sc.url, `Review script v${sc.version}`));
  if (key === "scriptChanges") return panel("waiting", `Your notes on script v${sc.version} are saved`, "Claude makes the next version from them. If Claude hasn't started, tell it “I've saved my notes on the script”.");
  if (key === "scriptApproved") return panel("waiting", `Script v${sc.version} is approved`, "Claude makes the storyboard next. If Claude hasn't started, tell it “Script approved”.");
  if (key === "storyboard") return panel("action", `Storyboard v${sb.version} is ready for your review`, "Every scene starts Approved: choose Feedback on any you'd like changed, then save.", button(sb.url, `Review storyboard v${sb.version}`));
  if (key === "feedback") return panel("waiting", `Your feedback on storyboard v${sb.version} is saved`, "Claude makes the next version from it. If Claude hasn't started, tell it “I've saved my storyboard feedback”.");
  if (key === "production") return panel("waiting", sb?.allApproved ? "The storyboard is approved" : "In production", "Claude builds the video next. It appears here for your review.");
  if (key === "review") return panel("action", `Video v${rv.version} is ready for your review`, "Watch it and pin a note to any moment you'd like changed. With no notes, press Approve and save.", button(rv.url, `Review video v${rv.version}`));
  if (key === "changes") return panel("waiting", `Your notes on video v${rv.version} are saved`, "Claude makes the changes in a new version. If Claude hasn't started, tell it “I've saved my notes on the video”.");
  if (key === "approved") return panel("waiting", `Video v${rv.version} is approved`, "Claude makes the final video next. If Claude hasn't started, tell it “Video approved”.");
  if (key === "delivered")
    return panel(
      "done",
      "The final video is ready",
      "Every file, and the words to go with it, are on its delivery page.",
      `<div class="row">${video.master ? button(video.master.url, "Watch the video") : ""}<a class="button button--secondary" href="/videos/${enc(video.slug)}/delivery/">All assets</a></div>`,
    );
  return panel("waiting", "Planning", "The script comes next, and appears here for your review.");
}

// ───────── work in progress ─────────

const clockTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const sig = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
};

/** What the stage under way is made from ("From your 2 notes on video v1."). */
function progressFrom(video, p) {
  const notes = (n, what) => (n ? `From your ${n} note${n === 1 ? "" : "s"} on ${what}.` : `From your notes on ${what}.`);
  if (p.stage === "script") return p.version > 1 ? notes(video.script?.notes, `script v${p.version - 1}`) : "From your brief.";
  if (p.stage === "storyboard") {
    if (p.version === 1) return "From the approved script.";
    const n = video.storyboard?.feedback;
    return n ? `From your feedback on ${n} scene${n === 1 ? "" : "s"} of storyboard v${p.version - 1}.` : `From your feedback on storyboard v${p.version - 1}.`;
  }
  if (p.stage === "video") return p.version > 1 ? notes(video.review?.notes, `video v${p.version - 1}`) : "From the approved storyboard.";
  return `From the approved video v${p.version}.`;
}

/** How long is left of a count, from its pace so far ("about 40 s left"). */
function timeLeft(c, now = Date.now()) {
  if (c.phase === "done") return "";
  const from = c.t0 ? { at: Date.parse(c.t0), pct: c.pct0 || 0 } : c.since ? { at: Date.parse(c.since), pct: 0 } : null;
  const pct = Number.isFinite(c.pct) ? c.pct : c.total ? (100 * c.done) / c.total : null;
  if (!from || pct == null || pct - from.pct < 3 || pct >= 100) return "";
  const left = ((100 - pct) * (now - from.at)) / (pct - from.pct) / 1000;
  if (!Number.isFinite(left) || left < 1) return "";
  return left < 60 ? `about ${Math.max(5, Math.round(left / 5) * 5)} s left` : `about ${Math.round(left / 60)} min left`;
}

/** The parts of the panel of work in progress ([{ name, sig, html }]), so ui/page.js redraws only the ones that changed:
    what's being made and from what, the stage's steps, the count under way, the newest frames, and in a video's review
    loop Video Studio's own scores and what's being fixed. */
export function progressParts(video, p, brief) {
  const { steps, at } = stepsNow(p, brief);
  const quiet = p.quiet ? Math.round((Date.now() - Date.parse(p.updated || p.started)) / 60e3) : 0;
  const parts = [];
  const add = (name, html) => html && parts.push({ name, sig: sig(html), html: `<div data-part="${name}" data-sig="${sig(html)}">${html}</div>` });

  add(
    "head",
    `<div class="making_head">${quiet ? "" : `<span class="now_pulse" aria-hidden="true"></span>`}<div class="making_title"><strong>${esc(stageTitle(p))}</strong><p>${esc(progressFrom(video, p))} This page updates as it works.</p></div><p class="making_time">Started ${esc(clockTime(p.started))}${quiet ? ` · no news for ${quiet} min` : ""}</p></div>`,
  );
  add(
    "steps",
    `<ol class="making_steps">${steps
      .map((s, i) => `<li class="${i < at ? "is-done" : i === at ? "is-now" : ""}${s.key === "ready" ? " is-end" : ""}"${i === at ? ' aria-current="step"' : ""}>${esc(s.label)}${i === at && p.count?.pct != null && p.count.phase !== "done" ? ` <b>${Math.round(p.count.pct)}%</b>` : ""}</li>`)
      .join("")}</ol>`,
  );

  const c = p.count;
  if (c && (c.total || Number.isFinite(c.pct))) {
    const pct = Math.max(0, Math.min(100, Number.isFinite(c.pct) ? c.pct : (100 * c.done) / c.total));
    const words = [];
    if (p.stage === "video" && p.round) words.push(`Round ${p.round}`);
    if (p.step === "render" || p.step === "master") {
      words.push(p.step === "master" ? `Final render${c.size ? ` ${c.size.replace("x", ":")}` : ""}` : `Draft r${p.round || 1}`);
      words.push({ setup: "getting ready", capture: c.total ? `${c.done} of ${c.total} frames` : "rendering", encode: "encoding", assemble: "putting it together", done: "done" }[c.phase] || "rendering");
    } else if (c.total) words.push(`${c.done} of ${c.total} ${c.unit || "done"}`);
    const left = timeLeft(c);
    if (left) words.push(left);
    add("count", `<div class="making_progress"><div class="making_bar" role="progressbar" aria-label="${esc(steps[at].label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width: ${pct.toFixed(1)}%"></span></div><p>${esc(words.join(" · "))}</p></div>`);
  }

  const frames = (p.frames || []).filter((f) => f?.src);
  if (frames.length) {
    const dir = join(video.root || "", "videos", video.slug);
    const url = (src) => `/videos/${enc(video.slug)}/${String(src).split("/").map(enc).join("/")}?v=${Math.round(statSync(join(dir, src), { throwIfNoEntry: false })?.mtimeMs || 0)}`;
    const title =
      p.stage === "storyboard"
        ? "Frames so far"
        : p.stage === "final"
          ? "The poster"
          : `Newest frames${/_r(\d+)$/.test(p.framesFrom || "") ? ` · draft r${/_r(\d+)$/.exec(p.framesFrom)[1]}` : ""}`;
    const shown = p.stage === "storyboard" ? frames.slice(-12) : frames.slice(0, 6);
    const shape = video.size.h > video.size.w ? "portrait" : video.size.h === video.size.w ? "square" : "landscape";
    add(
      "frames",
      `<section class="making_frames"><h3 class="field-label">${esc(title)}</h3><div class="making_strip making_strip--${shape}">${shown
        .map((f) => `<figure><img src="${esc(url(f.src))}" alt="${esc(f.caption || "")}" loading="lazy" decoding="async">${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ""}</figure>`)
        .join("")}</div></section>`,
    );
  }

  if (p.stage === "video" && p.scores) {
    const was = p.previous || {};
    add(
      "scores",
      `<section class="making_scores"><h3 class="field-label">Video Studio's own scores · round ${esc(p.scores.round || 1)} · aim 8+</h3><ul>${Object.entries(SCORES)
        .filter(([k]) => Number.isFinite(p.scores[k]))
        .map(([k, label]) => {
          const v = p.scores[k];
          const before = Number.isFinite(was[k]) && was[k] !== v ? `<small>was ${was[k]}</small>` : "";
          return `<li class="${v < 8 ? "is-low" : ""}"><span>${esc(label)}</span><i style="--v: ${v}" aria-hidden="true"></i><b>${v}</b>${before}</li>`;
        })
        .join("")}</ul></section>`,
    );
  }
  if (p.stage === "video" && p.fixing?.length) {
    add(
      "fixing",
      `<section class="making_fixing"><h3 class="field-label">Fixing in round ${esc((p.scores?.round || p.round || 1) + 1)}</h3><ol>${p.fixing.map((f) => `<li><b>${esc(f.where || "")}</b><span>${esc(f.what || "")}</span></li>`).join("")}</ol></section>`,
    );
  }

  const note = quiet
    ? `There's been no news from Claude for ${quiet} minutes. If it has stopped, ask it to carry on.`
    : {
        script: "The script comes to you as soon as it's written and its length is checked.",
        storyboard: "Frames as they're made: nothing to review yet. The storyboard comes to you once every frame is made and checked.",
        video: "Video Studio's own checks, as it works: nothing to review yet. The video comes to you once every score is 8 or more.",
        final: "The final video appears here as soon as it's ready.",
      }[p.stage];
  add("note", `<p class="making_note">${esc(note)}</p>`);
  return parts;
}

/** The panel of work in progress on a video's overview, in place of where it stands (ui/page.js keeps it up to date). */
function progressPanel(video, brief) {
  const parts = progressParts(video, video.progress, brief);
  return `<div class="making${video.progress.quiet ? " is-quiet" : ""}" data-progress="${esc(video.slug)}" role="region" aria-label="Work in progress">${parts.map((x) => x.html).join("")}</div>`;
}

/** For /api/progress: whether a stage is under way for a video, and the panel's parts. */
export function progressState(studio, slug) {
  const video = readVideo(studio.root, slug);
  if (!video?.progress) return { active: false };
  return { active: true, quiet: Boolean(video.progress.quiet), parts: progressParts({ ...video, root: studio.root }, video.progress, readBrief(studio.root, slug)) };
}

/** A video's overview: where it stands, and every stage from the brief to the final video, to move between them. */
export function projectPage(studio, slug) {
  const video = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug) ? readVideo(studio.root, slug) : null;
  if (!video) return { status: 404, html: page404(studio, `The video “${slug}”`) };
  const brief = readBrief(studio.root, slug);
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const portrait = video.size.h > video.size.w;
  const base = `/videos/${enc(slug)}/`;
  const scVersions = scriptVersions(studio.root, slug);
  const sbVersions = storyboardVersions(studio.root, slug);
  const rvVersions = reviewVersions(studio.root, slug);
  const thumb = (src, alt, href, empty = "No image yet") => ({ src, ratio: video.size.ratio, alt, href, empty, portrait });
  const inVideo = (p) => Boolean(p && statSync(join(studio.root, "videos", slug, p), { throwIfNoEntry: false }));
  const tidied = lastTidy(studio.root, slug);
  const chip = (st) => `<span class="chip chip--${STATE_CHIP[st.key]}">${esc(st.label)}</span>`;
  const reviewed = (summary) => (summary.savedAt ? `reviewed ${formatDateTime(Date.parse(summary.savedAt))}` : "");

  const items = [
    stageItem({
      date: video.created,
      title: "Brief",
      meta: [video.destination, video.length, brief.voiceover && `voiceover: ${(VOICEOVER[brief.voiceover] || brief.voiceover).toLowerCase()}`].filter(Boolean).join(" · "),
      content: briefContent(brief),
    }),
  ];
  for (const v of scVersions) {
    const data = readScript(studio.root, slug, v);
    const sc = data.script;
    const rows = scriptRows(sc);
    const length = scriptLength(sc);
    const st = versionState(studio, slug, "script", v, v === scVersions.at(-1));
    const href = `${base}script/v${v}/`;
    const opening = String((scriptHasVoiceover(sc) ? rows[0]?.voiceover : rows[0]?.onScreen ?? rows[0]?.voiceover) || "").replace(/\*\*/g, "");
    items.push(
      stageItem({
        date: Date.parse(sc.created) || mt(join(data.dir, "script.json")),
        title: `Script v${v}`,
        chip: chip(st),
        meta: [plural(rows.length, "row"), length ? `${length.words} words ≈ ${length.seconds} s` : "text on screen", reviewed(data.summary)].filter(Boolean).join(" · "),
        text: [opening && `Opens: “${clip(opening, 16)}”`, sc.changes && `What changed: ${clip(sc.changes)}`],
        actions: `<a class="button${st.key === "ready" ? " button--corners" : " button--secondary"}" href="${href}">Open script v${v}</a>`,
      }),
    );
  }
  for (const v of sbVersions) {
    const data = readStoryboard(studio.root, slug, v);
    const sb = data.storyboard;
    const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
    const duration = sb.duration ?? scenes.reduce((mx, s) => Math.max(mx, +s.end || 0), 0);
    const st = versionState(studio, slug, "storyboard", v, v === sbVersions.at(-1));
    const href = `${base}storyboard/v${v}/`;
    const first = scenes[0]?.frames?.[0]?.src;
    items.push(
      stageItem({
        date: Date.parse(sb.created) || mt(join(data.dir, "storyboard.json")),
        title: `Storyboard v${v}`,
        chip: chip(st),
        meta: [plural(scenes.length, "scene"), duration ? timecode(duration) : "", reviewed(data.summary)].filter(Boolean).join(" · "),
        text: sb.changes ? `What changed: ${clip(sb.changes)}` : "",
        thumb: thumb(first ? `${href}${enc(first)}` : null, `Storyboard v${v}, first frame`, href),
        actions: `<a class="button${st.key === "ready" ? " button--corners" : " button--secondary"}" href="${href}">Open storyboard v${v}</a>`,
      }),
    );
  }
  for (const v of rvVersions) {
    const data = readReview(studio.root, slug, v);
    const rv = data.review;
    const st = versionState(studio, slug, "review", v, v === rvVersions.at(-1));
    const href = `${base}review/v${v}/`;
    items.push(
      stageItem({
        date: Date.parse(rv.created) || mt(join(data.dir, "review.json")),
        title: `Video v${v}`,
        chip: chip(st),
        meta: [rv.duration ? timecode(rv.duration) : "", parseSize(rv.size || video.size).label, reviewed(data.summary)].filter(Boolean).join(" · "),
        text: rv.changes ? `What changed: ${clip(rv.changes)}` : "",
        thumb: thumb(inVideo(rv.poster) ? `${base}${enc(rv.poster)}` : null, `Video v${v}`, href, tidied && rv.poster ? "Removed in a tidy-up" : undefined),
        actions: `<a class="button${st.key === "ready" ? " button--corners" : " button--secondary"}" href="${href}">Open video v${v}</a>`,
      }),
    );
  }
  if (video.master) {
    items.push(
      stageItem({
        date: video.master.mtime,
        title: "Final video",
        chip: `<span class="chip chip--delivered">Delivered</span>`,
        meta: video.master.name,
        thumb: thumb(video.thumbnail, "The final video", video.master.url),
        actions: `<a class="button button--corners" href="${esc(video.master.url)}">Watch the video</a><a class="button button--secondary" href="${base}delivery/">All assets</a>`,
      }),
    );
  }
  if (video.progress) {
    // what Claude is making now
    const p = video.progress;
    const next = { script: `Script v${p.version}`, storyboard: `Storyboard v${p.version}`, video: `Video v${p.version}`, final: "Final video" }[p.stage];
    const { steps, at } = stepsNow(p, brief);
    items.push(
      stageItem({
        title: next,
        chip: `<span class="chip chip--working">Claude is working on it</span>`,
        text: `Started ${formatDateTime(Date.parse(p.started))}. Now: ${steps[at].label.toLowerCase()}. It appears here when it's ready.`,
        pending: true,
      }),
    );
  }

  const intro = videoDescription(
    brief,
    brief.message,
    scVersions.length ? readScript(studio.root, slug, scVersions.at(-1))?.script?.summary : "",
    sbVersions.length ? readStoryboard(studio.root, slug, sbVersions.at(-1))?.storyboard?.summary : "",
  );
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/#videos">Videos</a> / ${esc(video.title)}</p>
    ${eyebrow(tc(0), "Video")}
    <div class="hero_head">
      <h1>${esc(video.title)}</h1>
      <div class="split split--top">
        <div class="stack">
          ${shortLede(intro)}
          ${stagesNav(studio, slug)}
        </div>
        <dl class="titleblock">
          ${cell("Brand", brand?.name || video.brand || "")}
          ${cell("Size", `${video.size.label} · ${video.size.px}`)}
          ${cell("Length", video.length || "")}
          ${cell("For", video.destination || "")}
          ${cell("Voiceover", VOICEOVER[brief.voiceover] || brief.voiceover || "")}
          ${cell("Created", formatDate(video.created))}
        </dl>
      </div>
    </div>
    ${video.progress ? progressPanel({ ...video, root: studio.root }, brief) : nowPanel(video)}
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(1), "Stages")}
    <h2>Every stage, newest first</h2>
    <ol class="timeline timeline--stages">${items.reverse().join("\n")}</ol>
  </div>
</section>`;
  return { status: 200, html: layout({ title: video.title, active: "videos", studio, body }) };
}

// ───────── script page ─────────

/** A script cell: escaped, its bold marks (**on-screen text**) drawn bold, its line breaks kept. */
export const rich = (text) =>
  esc(text)
    .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

/** The written script, row by row, for review before the storyboard: a note on any cell, general notes, and Approve
    script or Changes needed (ui/script.js). */
export function scriptPage(studio, slug, version) {
  const video = readVideo(studio.root, slug);
  const versions = scriptVersions(studio.root, slug);
  const v = version ?? versions.at(-1);
  const data = versions.includes(v) ? readScript(studio.root, slug, v) : null;
  if (!video || !data) return { status: 404, html: page404(studio, `Script v${v ?? "?"} for “${slug}”`) };
  const { script: sc, feedback: fb, summary } = data;
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const size = parseSize(sc.size || video.size);
  const latest = v === versions.at(-1);
  const rows = scriptRows(sc);
  const spoken = scriptHasVoiceover(sc);
  const footage = scriptFromFootage(sc);
  const words = scriptWordsLabel(sc);
  const length = scriptLength(sc);
  const brief = readBrief(studio.root, slug);
  const recorded = spoken && !footage && (sc.recorded === true || brief.voiceover === "recorded");
  // a voiceover still to be read: its words alone, to paste into a voice service or send to whoever records it
  const toRead = spoken && !footage && !recorded ? voiceoverText(sc) : "";
  const hasBold = rows.some((r) => /\*\*.+?\*\*/s.test(`${r.voiceover || ""} ${r.onScreen || ""} ${r.action || ""}`));
  const state = { project: slug, version: v, latest, columns: { words, action: "Action on screen" }, rows: rows.map((r) => ({ id: r.id, n: r.n })), feedback: fb || null };
  const chosen = openingDecision(fb, summary);

  // from footage, under what's said: the takes it comes from
  const takes = (row) => (footage && rowSources(row).length ? `<p class="scriptsheet_source">${rowSources(row).map(esc).join(" + ")}</p>` : "");
  const cellHtml = (row, key, label, text, extra = "") => `<td class="scriptsheet_cell" data-cell="${key}" data-label="${esc(label)}">
        <div class="scriptsheet_text">${itemChips(rich(text || ""), video)}</div>${extra}
        <button class="scriptsheet_add" type="button"${latest ? "" : " hidden"} aria-label="Add a note to row ${row.n}, ${esc(label.toLowerCase())}">+ Note</button>
        <div class="scriptsheet_note" data-note-slot></div>
      </td>`;
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/#videos">Videos</a> / <a href="/videos/${enc(slug)}/">${esc(video.title)}</a> / Script v${v}</p>
    ${eyebrow(`V${v}`, "Script")}
    <div class="hero_head">
      <h1>${esc(sc.title || video.title)}</h1>
      <div class="split split--top">
        <div class="stack">
          ${shortLede(videoDescription(brief, sc.summary))}
          ${stagesNav(studio, slug, `script-${v}`)}
          ${share({ href: `/videos/${enc(slug)}/script/v${v}/download`, label: "Download PDF", pdf: true, note: latest ? SHARE_NOTE : "" })}
          ${toRead ? `<div class="share"><button class="button button--secondary" type="button" data-copy="${esc(toRead)}">Copy the voiceover</button><p class="share_note">Just its words, to paste into a voice service or send to whoever records it.</p></div>` : ""}
        </div>
        <dl class="titleblock">
          ${cell("Brand", brand?.name || video.brand || "")}
          ${cell("Size", `${size.label} · ${size.px}`)}
          ${cell("Length", length ? `About ${timecode(length.seconds)} (${length.words} words)` : video.length)}
          ${cell("Rows", String(rows.length))}
          ${cell("Version", `v${v}`)}
          ${cell("Created", sc.created ? formatDate(Date.parse(sc.created)) : "")}
        </dl>
      </div>
    </div>
    ${heroNotes({
      earlier: latest ? "" : `<div class="callout"><strong>This is an earlier script.</strong><p>Its notes are shown as they were saved. <a href="/videos/${enc(slug)}/script/v${versions.at(-1)}/">Review the latest script (v${versions.at(-1)})</a>.</p></div>`,
      changed: sc.changes ? { title: `What changed in script v${v}`, text: sc.changes } : null,
      howTo: latest
        ? `<p>Read the script row by row: the ${spoken ? (footage ? "words said" : "voiceover") : "text on screen"}, and what happens on screen beside it. To comment on a cell, click it and write your note; it's pinned to that row and column, so Claude knows exactly what to change. Your decision is <b>Approve script</b> unless you add a note or write under <b>Anything else?</b>: then it switches to <b>Changes needed</b> (you can change it). When you've read it all, press <b>Approve and save</b> (it says <b>Send changes</b> once there are notes): Claude picks your review up straight away (if Claude isn't waiting, tell it you've saved). The storyboard is only made once you approve.</p>${
            footage ? `<p><b>The words are from the footage.</b> They're what was said on camera, in the takes used; under each line is the clip and time it comes from. A note can ask for a line to be cut, moved or swapped for another take, but changing the words themselves needs a new take.</p>` : ""
          }${recorded ? `<p><b>The voiceover is a recording.</b> Its words come from the recording, cut to the take that's used. A note can ask for a line to be cut or moved, but changing the words themselves needs a new recording.</p>` : ""}`
        : "",
    })}
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow("01", "Read and comment")}
    <div class="scriptsheet">
    <div class="scriptsheet_length">
      ${length?.footage ? `<p><b>Length:</b> about ${length.seconds} seconds of footage, from the takes used (${length.words} words said)</p>` : length ? `<p><b>Rule:</b> ${WORDS_PER_MINUTE} Words of voiceover = Approx 60 Seconds of video</p><p><b>This script:</b> ${length.words} Words of voiceover = ${length.seconds} Seconds of video</p>` : ""}
      <p class="scriptsheet_legend">${hasBold ? "<strong>Bold text</strong> appears on screen. " : ""}${latest ? "Click any cell to add a note to it." : ""}</p>
    </div>
    <div class="scriptsheet_wrap">
      <table class="scriptsheet_table">
        <thead><tr><th scope="col" class="scriptsheet_n">#</th><th scope="col">${words}</th><th scope="col">Action on screen</th></tr></thead>
        <tbody>
${rows
  .map(
    (r) => `    <tr data-row="${esc(r.id)}">
      <th scope="row" class="scriptsheet_n">${r.n}</th>
      ${cellHtml(r, "words", words, spoken ? r.voiceover : (r.onScreen ?? r.voiceover), takes(r))}
      ${cellHtml(r, "action", "Action on screen", r.action)}
    </tr>`,
  )
  .join("\n")}
        </tbody>
      </table>
    </div>
    ${footage && sc.cuts ? `<div class="callout"><strong>Cut from the footage</strong><p>${esc(sc.cuts)}</p></div>` : ""}
    </div>
  </div>
</section>
<section class="section section--rule" id="general">
  <div class="container">
    ${eyebrow("+", "Your decision", true)}
    <h2>Anything else?</h2>
    <div class="scriptsheet_decision">
      <div class="review_note">
        <label class="field-label" for="n-general">Comments on the whole script: the story, tone, length (optional)</label>
        <textarea id="n-general" data-general rows="5"></textarea>
      </div>
      <fieldset class="review" data-decision>
        <legend class="field-label review_legend">Your decision</legend>
        <div class="review_box">
          <div class="review_options">
            ${decisionOptions(chosen, "Approve script")}
          </div>
          <p class="review_hint" data-decision-hint></p>
        </div>
      </fieldset>
    </div>
  </div>
</section>
<div class="reviewbar" role="region" aria-label="Save your review">
  <div class="reviewbar_counts" aria-live="polite">
    <span><b data-count="notes">${summary.notes}</b> <span data-count-word>${summary.notes === 1 ? "note" : "notes"}</span></span>
    <span>Decision: <b data-decision-label>${esc(DECISION_LABEL[chosen])}</b></span>
    <span class="reviewbar_claude" data-claude-waiting hidden>Claude starts when you save</span>
  </div>
  <button class="reviewbar_jump" type="button" data-next-note${summary.notes ? "" : " hidden"}>Next note <span aria-hidden="true">↓</span></button>
  <button class="button button--corners" type="button" data-save${latest ? "" : " disabled"}>${latest ? SAVE[chosen] : "Save review"}</button>
  <p class="reviewbar_message" data-message aria-live="polite">${summary.savedAt ? `Last saved ${esc(formatDateTime(Date.parse(summary.savedAt)))}.` : ""}</p>
</div>`;
  const foot = `<script type="application/json" id="script-state">${JSON.stringify(state).replace(/</g, "\\u003c")}</script>
<script src="/ui/script.js" defer></script>`;
  return { status: 200, html: layout({ title: `Script v${v}: ${video.title}`, active: "videos", studio, body, foot }) };
}

// ───────── storyboard page ─────────

export function storyboardPage(studio, slug, version) {
  const video = readVideo(studio.root, slug);
  const versions = storyboardVersions(studio.root, slug);
  const v = version ?? versions.at(-1);
  const sbData = versions.includes(v) ? readStoryboard(studio.root, slug, v) : null;
  if (!video || !sbData) return { status: 404, html: page404(studio, `Storyboard v${v ?? "?"} for “${slug}”`) };
  const { storyboard: sb, feedback: fb, summary } = sbData;
  const brief = readBrief(studio.root, slug);
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const size = parseSize(sb.size || video.size);
  const portrait = size.h > size.w;
  const base = `/videos/${enc(slug)}/storyboard/v${v}/`;
  const latest = v === versions.at(-1);
  const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
  const total = sb.duration ?? scenes.reduce((mx, s) => Math.max(mx, +s.end || 0), 0);
  // frames show at most 300 px wide and 400 px tall, keeping their shape: a scene's frames fit on one row beside what
  // it says (a click opens one full size)
  const fmax = Math.round(Math.min(300, (400 * size.w) / size.h));

  const sceneHtml = scenes
    .map((s, i) => {
      const id = String(s.id || `s${String(i + 1).padStart(2, "0")}`);
      const frames = (Array.isArray(s.frames) ? s.frames : []).slice(0, 5);
      const dur = s.end != null && s.start != null ? `${(+s.end - +s.start).toFixed(1)} s` : "";
      const badges = [
        s.changed ? `<span class="chip chip--production">Updated in v${v}</span>` : "",
        s.carriedApproval ? `<span class="chip chip--plain">Approved in v${v - 1}</span>` : "",
      ].join("");
      const lines = [
        s.voiceover ? script("Voiceover", s.voiceover) : "",
        s.onScreen ? script("On screen", s.onScreen) : "",
        s.script && !s.voiceover ? script("Script", s.script) : "",
      ].join("");
      return `<section class="section section--rule scene" id="${esc(id)}" data-scene="${esc(id)}">
  <div class="container">
    <div class="scene_head">
      <p class="eyebrow eyebrow--plain"><span class="eyebrow_index">${String(i + 1).padStart(2, "0")}</span><span>${esc([timecode(s.start), timecode(s.end)].filter(Boolean).join("–"))}${dur ? ` · ${esc(dur)}` : ""}</span></p>
      <div class="row">${badges}${
        s.clip
          ? `<a class="button button--secondary scene_play" href="${base}${enc(s.clip)}" data-play data-w="${size.w}" data-h="${size.h}" data-label="${esc(`Scene ${i + 1}: ${s.title || `Scene ${i + 1}`}`)}"><span aria-hidden="true">▶</span> Play the scene</a>`
          : ""
      }</div>
    </div>
    <h2>${esc(s.title || `Scene ${i + 1}`)}</h2>
    <div class="scene_frames" data-frames="${frames.length}" style="--_fmax: ${fmax}px">
      ${
        frames.length
          ? frames
              .map((f, k) => {
                const caption = f.caption || `Frame ${k + 1}`;
                const time = f.time != null ? timecode(f.time, true) : "";
                const label = [`Scene ${i + 1}: ${s.title || `Scene ${i + 1}`}`, caption, time].filter(Boolean).join(" · ");
                const frameId = String(f.src || "").split("/").pop().replace(/\.[a-z0-9]+$/i, "") || `${id}-${k + 1}`;
                return frame({ src: `${base}${enc(f.src)}`, ratio: size.ratio, alt: f.caption || `Scene ${i + 1}, frame ${k + 1}`, caption, time, zoom: { w: size.w, h: size.h, label, id: frameId } });
              })
              .join("")
          : frame({ ratio: size.ratio, empty: "No frames for this scene" })
      }
    </div>
    <div class="scene_grid">
      <div class="stack">
        ${lines}
        ${
          s.description || s.notes
            ? `<details class="fold scene_more"><summary><span class="field-label">What happens</span></summary>${s.description ? `<p>${itemChips(esc(s.description), video)}</p>` : ""}${s.notes ? `<p class="muted">${esc(s.notes)}</p>` : ""}</details>`
            : ""
        }
      </div>
      <fieldset class="review" data-review="${esc(id)}">
        <legend class="field-label review_legend">Your review of scene ${i + 1}</legend>
        <div class="review_box">
          <div class="review_options">
            <label class="review_option review_option--approved"><input type="radio" name="r-${esc(id)}" value="approved" checked> Approved</label>
            <label class="review_option review_option--feedback"><input type="radio" name="r-${esc(id)}" value="feedback"> Feedback</label>
          </div>
          <div class="review_note" hidden>
            <label class="field-label" for="n-${esc(id)}">What should change?</label>
            <textarea id="n-${esc(id)}" data-note="${esc(id)}" rows="4" placeholder="Be as specific as you can: what to change, and why."></textarea>
            <ul class="points" data-points="${esc(id)}"></ul>
          </div>
        </div>
      </fieldset>
    </div>
  </div>
</section>`;
    })
    .join("\n");

  const state = {
    project: slug,
    version: v,
    latest,
    scenes: scenes.map((s, i) => ({ id: String(s.id || `s${String(i + 1).padStart(2, "0")}`), title: s.title || `Scene ${i + 1}`, carried: Boolean(s.carriedApproval) })),
    feedback: fb || null,
    // for "Point at it" (ui/point.js): where the version's files are, and the frames' shape
    base,
    ratio: size.w / size.h,
  };

  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/#videos">Videos</a> / <a href="/videos/${enc(slug)}/">${esc(video.title)}</a> / Storyboard v${v}</p>
    ${eyebrow(`V${v}`, "Storyboard")}
    <div class="hero_head">
      <h1>${esc(sb.title || video.title)}</h1>
      <div class="split split--top">
        <div class="stack">
          ${shortLede(videoDescription(brief, sb.summary))}
          ${stagesNav(studio, slug, `storyboard-${v}`)}
          ${share({
            href: `${base}download`,
            label: "Download PDF",
            pdf: true,
            note: latest ? `To share outside the studio. Put feedback that comes back on the scenes it's about (choose Feedback), or in <a href="#n-general">Anything else?</a>, then save.` : "",
          })}
        </div>
        <dl class="titleblock">
          ${cell("Brand", brand?.name || video.brand || "")}
          ${cell("Size", `${size.label} · ${size.px}`)}
          ${cell("Length", total ? `${timecode(total)} (${(+total).toFixed(1)} s)` : video.length)}
          ${cell("Scenes", String(scenes.length))}
          ${cell("Version", `v${v}`)}
          ${cell("Created", sb.created ? formatDate(Date.parse(sb.created)) : "")}
        </dl>
      </div>
    </div>
    ${heroNotes({
      earlier: latest ? "" : `<div class="callout"><strong>This is an earlier version.</strong><p>Its feedback is shown as it was saved. <a href="/videos/${enc(slug)}/storyboard/v${versions.at(-1)}/">Review the latest version (v${versions.at(-1)})</a>.</p></div>`,
      changed: sb.changes ? { title: `What changed in v${v}`, text: sb.changes } : null,
      howTo: latest
        ? `<p>Look at each scene's frames${scenes.some((x) => x.clip) ? ", play its rough cut" : ""} and open <b>What happens</b> for the detail. Every scene starts as <b>Approved</b>: choose <b>Feedback</b> on any scene you'd like changed, and say what should change. To show exactly what you mean, press <b>Box</b> or <b>Arrow</b> on a frame and drag on it: your note goes into that scene's feedback. Notes under <b>Anything else?</b> ask for changes too. Then press <b>Approve and save</b> (it says <b>Send feedback</b> once there's feedback): Claude picks your review up straight away (if Claude isn't waiting, tell it you've saved). Nothing is built until every scene is approved.</p>`
        : "",
    })}
  </div>
</section>
${
  scenes.length > 1
    ? `<nav class="scenestrip" aria-label="Scenes"><div class="container"><div class="scenestrip_row"><span class="field-label">Scenes</span>${state.scenes
        .map(
          (x, i) =>
            `<a class="scenestrip_item" href="#${esc(x.id)}" data-strip="${esc(x.id)}" title="${esc(x.title)}"><span class="scenestrip_dot" aria-hidden="true"></span><span class="visually-hidden">Scene </span>${String(i + 1).padStart(2, "0")}<span class="visually-hidden" data-strip-state>, approved</span></a>`,
        )
        .join("")}</div></div></nav>`
    : ""
}
${sceneHtml}
<section class="section section--rule" id="general">
  <div class="container">
    ${eyebrow("+", "General notes", true)}
    <h2>Anything else?</h2>
    <div class="review_note" style="max-width: 48rem">
      <label class="field-label" for="n-general">Changes to the whole film: music, pace, overall feel (optional; notes here ask for a new version)</label>
      <textarea id="n-general" data-note="general" rows="5"></textarea>
    </div>
  </div>
</section>
<div class="reviewbar" role="region" aria-label="Save your review">
  <div class="reviewbar_counts" aria-live="polite">
    <span><b data-count="approved">${summary.approved}</b> approved</span>
    <span><b data-count="feedback">${summary.feedback}</b> feedback</span>
    <span data-general-count${summary.hasGeneral ? "" : " hidden"}>+ general notes</span>
    <span class="reviewbar_claude" data-claude-waiting hidden>Claude starts when you save</span>
  </div>
  <button class="button button--corners" type="button" data-save${latest ? "" : " disabled"}>${latest ? (!fb || summary.allApproved ? "Approve and save" : "Send feedback") : "Save feedback"}</button>
  <p class="reviewbar_message" data-message aria-live="polite">${summary.savedAt ? `Last saved ${esc(formatDateTime(Date.parse(summary.savedAt)))}.` : ""}</p>
</div>`;
  const foot = `<script type="application/json" id="storyboard-state">${JSON.stringify(state).replace(/</g, "\\u003c")}</script>
<script src="/ui/point.js" defer></script>
<script src="/ui/storyboard.js" defer></script>`;
  return { status: 200, html: layout({ title: `Storyboard v${v}: ${video.title}`, active: "videos", studio, body, foot }) };
}

// ───────── setup and health ─────────

const slugOf = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One check: done, being installed, or not; and if not, what to say to Claude to fix it (with a Copy button). */
function checkRow(c, note) {
  const installing = !c.ok && note?.state === "installing";
  const failed = !c.ok && note?.state === "failed";
  const state = c.ok ? "ok" : installing ? "installing" : c.optional ? "optional" : "missing";
  const said = { ok: "Done", installing: "Installing now", optional: "Optional", missing: "Needs attention" }[state];
  const say =
    !c.ok && c.say && !installing
      ? `<div class="check_say"><span class="field-label">${c.id === "homebrew" ? "To fix it" : "Say to Claude"}</span><p>${c.id === "homebrew" ? esc(c.say) : `“${esc(c.say)}”`}</p>${c.id === "homebrew" || c.id === "macos" ? "" : `<button class="button button--secondary" type="button" data-copy="${esc(c.say)}">Copy</button>`}</div>`
      : "";
  return `<li class="check check--${state}">
  <span class="check_mark" aria-hidden="true">${{ ok: "✓", installing: "", optional: "–", missing: "!" }[state]}</span>
  <div class="check_text"><strong><span class="visually-hidden">${esc(said)}: </span>${esc(c.name)}</strong><p class="muted">${esc(failed ? `${c.detail}. The last try didn't finish: ${c.group === "Downloads" ? "Video Studio tries again when the next session starts" : "Claude says why in the chat"}.` : c.detail)}</p>${!c.ok && c.time ? `<p class="check_time">${installing ? "Installing now · " : ""}${esc(c.time[0].toUpperCase() + c.time.slice(1))}</p>` : ""}</div>
  ${say}
</li>`;
}

/** The checklist's parts ([{ name, sig, html }]): where it stands, then each group of checks, for ui/page.js to redraw
    what changed while Claude sets things up. */
export function checksParts(root, { setup = false } = {}) {
  const checks = checksNow(root);
  const notes = setupNotes();
  const required = checks.filter((c) => !c.optional);
  const done = required.filter((c) => c.ok).length;
  const missing = required.filter((c) => !c.ok);
  const installing = checks.filter((c) => !c.ok && notes[c.id]?.state === "installing");
  const parts = [];
  const add = (name, html) => parts.push({ name, sig: sig(html), html: `<div data-part="${name}" data-sig="${sig(html)}">${html}</div>` });
  let state = "action";
  let title = setup ? `${done} of ${required.length} done` : `${plural(missing.length, "thing")} ${missing.length === 1 ? "needs" : "need"} attention`;
  let text = setup ? "Answer Claude's questions in the chat: where your studio goes, and whether to install each thing. Each one ticks off here as it's done." : "Beside each one is what to say to Claude to fix it.";
  if (!missing.length) {
    state = "done";
    title = setup ? "Setup is done" : "Everything's working";
    text = setup ? "Open Claude Code in your studio folder to make videos there." : "Everything Wyzowl Video Studio needs is on this Mac.";
  } else if (installing.length) {
    state = "working";
    const doing = installing.map((c) => c.doing || `Installing ${c.name}`);
    title = doing.length > 1 ? `${doing[0]}, and ${doing.slice(1).map((d) => d[0].toLowerCase() + d.slice(1)).join(" and ")}` : doing[0];
    text = `${done} of ${required.length} done. Each one ticks off here as it's done.`;
  }
  add(
    "summary",
    `<div class="now now--${state}" role="status">${state === "working" ? `<span class="now_pulse" aria-hidden="true"></span>` : ""}<div class="now_text"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>${state === "done" && root ? `<a class="button button--corners" href="/">Open the dashboard</a>` : ""}</div>`,
  );
  for (const group of [...new Set(checks.map((c) => c.group))]) {
    const rows = checks.filter((c) => c.group === group).map((c) => checkRow(c, notes[c.id]));
    add(`group-${slugOf(group)}`, `<section class="checks_group"><h3 class="field-label">${esc(group)}</h3><ul class="checks">${rows.join("")}</ul></section>`);
  }
  return parts;
}

/** Studio health's tidy-up: each finished video with space to free, and the edit history HyperFrames still keeps for
    deleted videos, each with what to say to Claude (studio.mjs tidy lists exactly what goes, and asks first). */
function spaceSection(root) {
  const t = studioTidy(root);
  const row = (name, detail, say) =>
    `<li class="dask"><span><strong>${esc(name)}</strong><br><span class="muted">${esc(detail)}</span></span><button class="button button--secondary" type="button" data-copy="${esc(say)}">Copy</button></li>`;
  const rows = [];
  if (t.videos.length + (t.gone.length ? 1 : 0) > 1) rows.push(row("All of them", `${sizeLabel(t.bytes)} to free`, "Tidy up all my finished videos."));
  for (const p of t.videos) rows.push(row(p.title, `${sizeLabel(p.bytes)} to free: ${tidyWhat(p)}`, `Tidy up ${p.title}.`));
  if (t.gone.length) rows.push(row(t.gone.length === 1 ? "A deleted video" : `${t.gone.length} deleted videos`, `${sizeLabel(t.goneBytes)} to free: the edit history HyperFrames still keeps for ${t.gone.length === 1 ? "it" : "them"}`, "Tidy up the edit history of my deleted videos."));
  return `
<section class="section section--rule">
  <div class="container">
    ${eyebrow("02", "Space")}
    <div class="stack">
      <h2>Tidy up finished videos</h2>
      <p class="lede">A finished video still keeps what it needed while it was being made: draft renders, review stills, replaced storyboards and its edit history in HyperFrames. Tidying it up removes them once you've said yes, and keeps everything the video needs to be changed and rendered again. To ask Claude, copy one and paste it into the chat.</p>
    </div>
    ${rows.length ? `<ul class="dasks">${rows.join("")}</ul>` : `<p class="muted">Nothing to tidy up: your finished videos only keep what they need.</p>`}
  </div>
</section>`;
}

/** Setup's checklist (before there's a studio, the only page there is) and, later, the studio's health: everything
    the studio uses on this Mac, live. */
export function healthPage(studio, { setup = false } = {}) {
  const root = studio?.root || null;
  const parts = checksParts(root, { setup });
  const l = licence();
  const pack = installedPack();
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs">${root ? `<a href="/">Studio</a> / ` : ""}${setup ? "Setup" : "Studio health"}</p>
    ${eyebrow(tc(0), setup ? "Setup" : "Health")}
    <div class="split">
      <div class="stack">
        <h1>${setup ? "Setting up Wyzowl Video Studio" : "Studio health"}</h1>
        <p class="lede">${
          setup
            ? "This page follows setup as Claude works through it: what's on this Mac, what's being installed, and what's next."
            : "Everything Wyzowl Video Studio uses on this Mac, and whether it's working. Beside anything that isn't is what to say to Claude to fix it."
        }</p>
      </div>
      <dl class="titleblock">
        ${cell("Plugin", `Wyzowl Video Studio ${pluginVersion()}`)}
        ${cell("HyperFrames", studio?.hyperframes || "not set yet")}
        ${cell("Studio folder", root || "not made yet")}
        ${cell("Full library", l?.status === "active" && pack ? `unlocked, ${plural(pack.items, "item")}` : "not unlocked")}
      </dl>
    </div>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow("01", setup ? "Each step" : "Each check")}
    <div class="checks_panel" data-checks="${setup ? "setup" : "health"}">${parts.map((x) => x.html).join("")}</div>
  </div>
</section>${root && !setup ? spaceSection(root) : ""}`;
  return layout({ title: setup ? "Setup" : "Studio health", studio: studio || { name: "Not set up yet", root: "", hyperframes: "" }, body });
}

// ───────── delivery page ─────────

const SIZE_WHERE = { "16x9": "for YouTube, websites and presentations", "1x1": "for social feeds", "4x5": "for Instagram and Facebook feeds", "9x16": "for Stories, Reels, TikTok and Shorts" };

/** What a delivery file is, for the page: its name there and a line on what it's for. */
function deliveryLabel(f) {
  const size = f.size ? SIZES[f.size]?.label || f.size.replace("x", "×") : "";
  if (f.kind === "master") return [`Final video${size ? ` · ${size}` : ""}`, "The full-quality master, for editing and keeping."];
  if (f.kind === "web") return [`Web copy${size ? ` · ${size}` : ""}`, "Smaller, for websites, social posts and email."];
  if (f.kind === "poster") return ["Poster frame", "The still to show before it plays."];
  if (f.kind === "thumbnail") return ["Thumbnail", "For YouTube and link previews (1280 px)."];
  if (f.kind === "gif") return ["GIF preview", "A short silent loop, for email and messages."];
  if (f.kind === "captions") return [f.name.toLowerCase().endsWith(".vtt") ? "Captions · WebVTT" : "Captions · SRT", f.name.toLowerCase().endsWith(".vtt") ? "For a video on a website." : "For YouTube, LinkedIn and most players."];
  if (f.kind === "contact") return ["Contact sheet", "Frames from across the video, to see it at a glance."];
  return [f.name, ""];
}

/** A video's delivery: the final video, every file made with it (each size and its web copy, the stills, the
    captions), the words to go with it, and what to ask Claude for next. */
export function deliveryPage(studio, slug) {
  const video = readVideo(studio.root, slug);
  if (!video) return { status: 404, html: page404(studio, `The video “${slug}”`) };
  const brief = readBrief(studio.root, slug);
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const files = deliveryFiles(studio.root, slug);
  const masters = files.filter((f) => f.kind === "master");
  const base = `/videos/${enc(slug)}/`;
  const fileUrl = (f) => `${base}renders/${enc(f.name)}?v=${Math.round(f.mtime)}`;
  const words = deliveryWords(studio.root, slug);
  const poster = files.find((f) => f.kind === "poster");
  const main = files.find((f) => f.kind === "web") || masters[0];
  const length = masters.find((f) => f.media?.duration)?.media.duration || main?.media?.duration || 0;
  const total = files.reduce((n, f) => n + f.bytes, 0);
  const delivered = Math.max(0, ...masters.map((f) => f.mtime));
  const sizes = [...new Set(masters.map((f) => f.size).filter(Boolean))];
  const mac = process.platform === "darwin";

  const thumbOf = (f) => {
    if (["poster", "thumbnail", "contact", "gif"].includes(f.kind)) return `<img src="${esc(fileUrl(f))}" alt="" loading="lazy" decoding="async">`;
    if ((f.kind === "master" || f.kind === "web") && poster) return `<img src="${esc(fileUrl(poster))}" alt="" loading="lazy" decoding="async">`;
    return `<span class="dfile_badge">${esc(f.kind === "captions" ? "CC" : (f.name.split(".").pop() || "").toUpperCase())}</span>`;
  };
  const metaOf = (f) => {
    const m = f.media;
    const bits = [f.name];
    if (m?.width) bits.push(`${m.width}×${m.height}`);
    if (m?.fps && (f.kind === "master" || f.kind === "web")) bits.push(`${m.fps} fps`);
    if (m?.duration && (f.kind === "master" || f.kind === "web" || f.kind === "gif")) bits.push(timecode(m.duration));
    bits.push(fileSize(f.bytes));
    return bits.join(" · ");
  };
  const fileRows = files
    .map((f) => {
      const [name, what] = deliveryLabel(f);
      return `<li class="dfile">
  <div class="dfile_thumb${f.media && f.media.height > f.media.width ? " dfile_thumb--tall" : ""}${f.kind === "contact" ? " dfile_thumb--whole" : ""}">${thumbOf(f)}</div>
  <div class="dfile_text"><strong>${esc(name)}</strong>${what ? `<p class="muted">${esc(what)}</p>` : ""}<p class="dfile_meta">${esc(metaOf(f))}</p></div>
  <div class="dfile_actions"><a class="button button--secondary" href="${base}delivery/download/${enc(f.name)}" download>Download</a>${mac ? `<button class="button button--secondary" type="button" data-reveal="videos/${esc(slug)}/renders/${esc(f.name)}">Show in Finder</button>` : ""}</div>
</li>`;
    })
    .join("\n");

  const wordRows = [
    ["title", "Title"],
    ["description", "Description"],
    ["altText", "Alt text"],
  ]
    .filter(([k]) => words[k])
    .map(([k, label]) => `<div class="dword"><span class="field-label">${esc(label)}</span><p>${esc(words[k])}</p><button class="button button--secondary" type="button" data-copy="${esc(words[k])}">Copy</button></div>`)
    .join("");

  // what to ask Claude for next: the sizes not made yet, shorter versions, and anything the delivery doesn't have
  const asks = [];
  for (const key of ["9x16", "1x1", "16x9", "4x5"].filter((k) => !sizes.includes(k)).slice(0, 2)) asks.push(`Make a ${SIZES[key].label} version of ${video.title} ${SIZE_WHERE[key]}.`);
  if (length > 20) asks.push(`Make a 15-second cut-down of ${video.title} for social ads.`);
  if (length > 10) asks.push(`Make a 6-second bumper of ${video.title} for YouTube.`);
  const speech = brief.voiceover && brief.voiceover !== "none";
  if (speech && !files.some((f) => f.kind === "captions")) asks.push(`Make captions for ${video.title}: an SRT and a WebVTT file.`);
  if (speech) asks.push(`Make a silent version of ${video.title} with the captions on screen, for feeds that play without sound.`);
  if (!wordRows) asks.push(`Write a title, a description and alt text to go with ${video.title}.`);
  if (!files.some((f) => f.kind === "gif")) asks.push(`Make a GIF preview of ${video.title} for an email.`);
  const tidy = masters.length ? tidyPlan(studio.root, slug) : null;
  if (tidy && !tidy.working && tidy.bytes >= TIDY_MIN_BYTES) asks.push(`Tidy up ${video.title} to free ${sizeLabel(tidy.bytes)}: remove ${tidyWhat(tidy)}.`);
  const askRows = asks.map((a) => `<li class="dask"><span>${esc(a)}</span><button class="button button--secondary" type="button" data-copy="${esc(a)}">Copy</button></li>`).join("");

  const portrait = (main?.media?.height || video.size.h) > (main?.media?.width || video.size.w);
  const ratio = main?.media?.width ? `${main.media.width} / ${main.media.height}` : video.size.ratio;
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/#videos">Videos</a> / <a href="${base}">${esc(video.title)}</a> / Delivery</p>
    ${eyebrow("Final", "Video delivery")}
    <div class="hero_head">
      <h1>${esc(video.title)}</h1>
      <div class="split split--top">
        <div class="stack">
          ${shortLede(videoDescription(brief))}
          ${stagesNav(studio, slug, "delivery")}
        </div>
        <dl class="titleblock">
          ${cell("Brand", brand?.name || video.brand || "")}
          ${cell("Sizes", sizes.map((k) => SIZES[k]?.label || k).join(", ") || video.size.label)}
          ${cell("Length", length ? `${timecode(length)} (${length.toFixed(1)} s)` : "")}
          ${cell("Delivered", delivered ? formatDate(delivered) : "")}
          ${cell("Files", String(files.length))}
          ${cell("In all", fileSize(total))}
        </dl>
      </div>
    </div>
  </div>
</section>
${
  masters.length
    ? `<section class="section section--rule">
  <div class="container">
    ${eyebrow("01", "The final video")}
    <figure class="frame" style="max-width: ${portrait ? "26rem" : "60rem"}"><div class="frame_stage"><div class="frame_media frame_media--player" style="--ratio: ${ratio}"><video class="player_video" controls playsinline preload="metadata" src="${esc(fileUrl(main))}"${poster ? ` poster="${esc(fileUrl(poster))}"` : ""}></video></div></div></figure>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow("02", "Every file")}
    <h2>Every file</h2>
    <ul class="dfiles">${fileRows}</ul>
    <p class="muted">They're all in the video's folder, in <span class="mono">videos/${esc(slug)}/renders/</span>.</p>
  </div>
</section>
${
  wordRows
    ? `<section class="section section--rule">
  <div class="container">
    ${eyebrow("03", "Words to go with it")}
    <h2>Words to go with it</h2>
    <div class="dwords">${wordRows}</div>
  </div>
</section>`
    : ""
}
<section class="section section--rule">
  <div class="container">
    ${eyebrow(wordRows ? "04" : "03", "What next")}
    <div class="stack">
      <h2>What next</h2>
      <p class="lede">Ask Claude for any of these in the chat: copy one, paste it in, and add anything you'd like.</p>
    </div>
    <ul class="dasks">${askRows}</ul>
    ${tidy?.last ? `<p class="muted">Tidied up on ${esc(formatDate(Date.parse(tidy.last.at)))}: ${esc(sizeLabel(tidy.last.freed))} freed.</p>` : ""}
  </div>
</section>`
    : `<section class="section section--rule">
  <div class="container">
    <div class="libempty"><span class="libempty_label">Nothing delivered yet</span><p>The final video and every file made with it appear here once the video is approved and made.</p></div>
  </div>
</section>`
}`;
  return { status: 200, html: layout({ title: `Delivery: ${video.title}`, active: "videos", studio, body }) };
}

// ───────── video review page ─────────

export function reviewPage(studio, slug, version) {
  const video = readVideo(studio.root, slug);
  const versions = reviewVersions(studio.root, slug);
  const v = version ?? versions.at(-1);
  const data = versions.includes(v) ? readReview(studio.root, slug, v) : null;
  if (!video || !data) return { status: 404, html: page404(studio, `Video review v${v ?? "?"} for “${slug}”`) };
  const { review: rv, feedback: fb, summary } = data;
  const brief = readBrief(studio.root, slug);
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const size = parseSize(rv.size || video.size);
  const portrait = size.h > size.w;
  const latest = v === versions.at(-1);
  const fileUrl = (p) => `/videos/${enc(slug)}/${enc(p)}`;
  const chapters = (Array.isArray(rv.chapters) ? rv.chapters : []).filter((c) => c && Number.isFinite(+c.time));
  const inVideo = (p) => (p ? statSync(join(studio.root, "videos", slug, p), { throwIfNoEntry: false }) : null);
  const there = inVideo(rv.video);
  const player = there
    ? `<video class="player_video" data-player controls playsinline preload="metadata" src="${esc(fileUrl(rv.video))}"${inVideo(rv.poster) ? ` poster="${esc(fileUrl(rv.poster))}"` : ""}></video>`
    : `<span class="frame_empty">${!rv.video ? "No video file in this review" : lastTidy(studio.root, slug) ? "This draft was removed when the video was tidied up" : "This version's video file isn't there"}</span>`;
  // for "Point at it" (ui/point.js): where the version's files are, and the video's shape
  const state = { project: slug, version: v, latest, feedback: fb || null, base: `/videos/${enc(slug)}/review/v${v}/`, ratio: size.w / size.h };
  const chosen = openingDecision(fb, summary);
  const bytes = there?.size || 0;

  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/#videos">Videos</a> / <a href="/videos/${enc(slug)}/">${esc(video.title)}</a> / Video v${v}</p>
    ${eyebrow(`V${v}`, "Video review")}
    <div class="hero_head">
      <h1>${esc(rv.title || video.title)}</h1>
      <div class="split split--top">
        <div class="stack">
          ${shortLede(videoDescription(brief, rv.summary))}
          ${stagesNav(studio, slug, `review-${v}`)}
          ${bytes ? share({ href: `/videos/${enc(slug)}/review/v${v}/download`, label: `Download video (${fileSize(bytes)})`, note: latest ? SHARE_NOTE : "" }) : ""}
        </div>
        <dl class="titleblock">
          ${cell("Brand", brand?.name || video.brand || "")}
          ${cell("Size", `${size.label} · ${size.px}`)}
          ${cell("Length", rv.duration ? `${timecode(rv.duration)} (${(+rv.duration).toFixed(1)} s)` : video.length)}
          ${cell("Video", `v${v}`)}
          ${cell("Shared", rv.created ? formatDate(Date.parse(rv.created)) : "")}
          ${cell("File", rv.video ? rv.video.split("/").pop() : "")}
        </dl>
      </div>
    </div>
    ${heroNotes({
      earlier: latest ? "" : `<div class="callout"><strong>This is an earlier version.</strong><p>Its notes are shown as they were saved. <a href="/videos/${enc(slug)}/review/v${versions.at(-1)}/">Review the latest version (v${versions.at(-1)})</a>.</p></div>`,
      changed: rv.changes ? { title: `What changed in video v${v}`, text: rv.changes } : null,
      howTo: latest
        ? `<p>Watch the video. To comment on a moment, pause there and press <b>Add a note</b>: the note is pinned to that time. To show exactly what you mean, press <b>Box</b> or <b>Arrow</b> on the paused picture and drag on it. Your decision is <b>Approve video</b> unless you add a note or write under <b>Anything else?</b>: then it switches to <b>Changes needed</b> (you can change it). When you've watched it all, press <b>Approve and save</b> (it says <b>Send changes</b> once there are notes): Claude picks your review up straight away (if Claude isn't waiting, tell it you've saved). The final video is only made once you approve.</p>`
        : "",
    })}
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow("01", "Watch and comment")}
    <div class="review-layout">
      <div class="stack">
        <figure class="frame"${portrait ? ' style="max-width: 26rem"' : ""}><div class="frame_stage"><div class="frame_media frame_media--player" style="--ratio: ${size.ratio}"${latest && there ? " data-point-host" : ""}>${player}</div></div></figure>
        ${chapters.length ? `<div class="player_tools"><span class="field-label">Jump to</span>${chapters.map((c) => `<button class="chapter" type="button" data-seek="${+c.time}">${esc(timecode(+c.time))} ${esc(c.title || "")}</button>`).join("")}</div>` : ""}
      </div>
      <div class="stack review-side">
        <h2 class="card_title">Notes</h2>
        <p class="muted" data-notes-empty>No notes yet. Pause on a moment, then press “Add a note”, or Box or Arrow on the picture to point at something.</p>
        <div class="review-side_add"><button class="button button--secondary" type="button" data-add-note${latest && there ? "" : " disabled"}>Add a note at <span class="mono" data-now>00:00.0</span></button></div>
        <ol class="notes" data-notes></ol>
        <div class="review_note">
          <label class="field-label" for="n-general">Anything else? Music, pace, overall feel (optional)</label>
          <textarea id="n-general" data-general rows="4"></textarea>
        </div>
        <fieldset class="review" data-decision>
          <legend class="field-label review_legend">Your decision</legend>
          <div class="review_box">
            <div class="review_options">
              ${decisionOptions(chosen, "Approve video")}
            </div>
            <p class="review_hint" data-decision-hint></p>
          </div>
        </fieldset>
      </div>
    </div>
  </div>
</section>
<div class="reviewbar" role="region" aria-label="Save your review">
  <div class="reviewbar_counts" aria-live="polite">
    <span><b data-count="notes">${summary.notes}</b> <span data-count-word>${summary.notes === 1 ? "note" : "notes"}</span></span>
    <span>Decision: <b data-decision-label>${esc(DECISION_LABEL[chosen])}</b></span>
    <span class="reviewbar_claude" data-claude-waiting hidden>Claude starts when you save</span>
  </div>
  <button class="button button--corners" type="button" data-save${latest ? "" : " disabled"}>${latest ? SAVE[chosen] : "Save review"}</button>
  <p class="reviewbar_message" data-message aria-live="polite">${summary.savedAt ? `Last saved ${esc(formatDateTime(Date.parse(summary.savedAt)))}.` : ""}</p>
</div>`;
  const foot = `<script type="application/json" id="review-state">${JSON.stringify(state).replace(/</g, "\\u003c")}</script>
<script src="/ui/point.js" defer></script>
<script src="/ui/review.js" defer></script>`;
  return { status: 200, html: layout({ title: `Video v${v}: ${video.title}`, active: "videos", studio, body, foot }) };
}

function script(label, text) {
  return `<blockquote class="script"><span class="script_label">${esc(label)}</span><span class="script_text">${esc(text)}</span></blockquote>`;
}

// ───────── the library ─────────

/** The library's name for a video's size ("16x9", "1x1", "4x5" or "9x16"). */
function sizeKey(size) {
  const r = (size?.w || 16) / (size?.h || 9);
  return r > 1.5 ? "16x9" : r > 0.9 ? "1x1" : r > 0.7 ? "4x5" : "9x16";
}

/** Library items named in a script or storyboard by their code in square brackets ("[W03]"): a chip that opens the
    item in the video's brand and size, in a new tab so unsaved notes stay put. Codes the library doesn't have stay as
    they're written. */
export function itemChips(html, video) {
  return String(html).replace(/\[([A-Z]\d{2,3})\]/g, (whole, code) => {
    const item = libraryItem(code);
    if (!item) return whole;
    const p = new URLSearchParams();
    if (video?.brand) p.set("brand", video.brand);
    if (sizeKey(video?.size) !== "16x9") p.set("size", sizeKey(video.size));
    const query = p.toString() ? `?${p}` : "";
    // what ui/page.js shows on hover: the item playing in the video's brand and size, its name and what it's for
    const size = sizeKey(video?.size);
    const pop = new URLSearchParams({ size });
    if (video?.brand) pop.set("brand", video.brand);
    return `<a class="itemchip" href="/library/${item.category}/${enc(item.code.toLowerCase())}/${query}" target="_blank" rel="noopener" data-pop="/library/preview/${enc(item.code.toLowerCase())}?${pop}" data-ratio="${(SIZES[size].w / SIZES[size].h).toFixed(4)}" data-code="${esc(item.code)}" data-name="${esc(item.name)}" data-summary="${esc(item.summary)}"><b>${esc(item.code)}</b>${esc(item.name)}</a>`;
  });
}

/** The brand and size the library shows its items in, and whether it shows only the free ones, from the page's address
    (?brand=<slug>&size=9x16&type=free). */
function libraryView(studio, query) {
  const brands = listBrands(studio.root);
  const slug = query?.get("brand") || "";
  const brand = brands.some((b) => b.slug === slug) ? readBrand(studio.root, slug) : null;
  const size = SIZES[query?.get("size")] ? query.get("size") : "16x9";
  const type = ["free", "favourites"].includes(query?.get("type")) ? query.get("type") : "all";
  // an item's own values, from "Try it with your words" (strings and numbers only)
  let vars = {};
  try {
    const given = JSON.parse(query?.get("vars") || "{}");
    if (given && typeof given === "object" && !Array.isArray(given))
      vars = Object.fromEntries(Object.entries(given).filter(([k, v]) => /^[A-Za-z][\w-]*$/.test(k) && ["string", "number"].includes(typeof v)).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 500) : v]));
  } catch {}
  return { brands, brand, size, type, vars, q: (query?.get("q") || "").slice(0, 80), favourites: new Set(readFavourites(studio.root)) };
}

/** The view's query string, kept on every link between library pages so the choice of brand, size and type sticks. */
function viewQuery(view, size = view.size) {
  const p = new URLSearchParams();
  if (view.brand) p.set("brand", view.brand.slug);
  if (size !== "16x9") p.set("size", size);
  if (view.type !== "all") p.set("type", view.type);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** A frame playing one item, in the view's brand, at a size. */
function gframe(item, view, size = view.size, title = `${item.code} ${item.name}, playing`) {
  const S = SIZES[size];
  const p = new URLSearchParams({ size });
  if (view.brand) p.set("brand", view.brand.slug);
  if (view.vars && Object.keys(view.vars).length) p.set("vars", JSON.stringify(view.vars));
  return `<div class="gframe" style="--ratio: ${S.w} / ${S.h}; --ar: ${(S.w / S.h).toFixed(4)}"><iframe src="/library/preview/${enc(item.code.toLowerCase())}?${p}" title="${esc(title)}" loading="lazy" tabindex="-1"></iframe></div>`;
}

/** A locked paid item's frame: a still of it at that size, in the studio's own style (library/previews/). Unlocked,
    an item plays live instead, in the brand. */
function lockedFrame(item, size = "16x9") {
  const S = SIZES[size];
  const still = item.stills?.[size];
  const img = still ? `<img src="/library/previews/${enc(still)}" alt="${esc(`${item.code} ${item.name} at ${S.label}`)}" loading="lazy" decoding="async">` : "";
  return `<div class="gframe gframe--locked" style="--ratio: ${S.w} / ${S.h}; --ar: ${(S.w / S.h).toFixed(4)}">${img}</div>`;
}

const byCode = (a, b) => a.code.localeCompare(b.code, "en", { numeric: true });

// where people get a licence key for the full library
const GET_KEY = "https://wyzowl.com/video-studio/";

/** The full library, above the locked items (the cards' "Paid upgrade" badges lead to it): what it adds and a box for
    the licence key; or, once a key has unlocked it on this Mac, where it stands, with a check for new items (ui/page.js
    posts both to /api/licence). */
function paidPanel(category) {
  const all = lockedItems();
  const here = category ? lockedItems(category) : all;
  const l = licence();
  const pack = installedPack();
  const result = `<p class="libpaid_result" data-licence-result role="status"></p>`;
  if (l?.status === "active" && pack) {
    return `<div class="callout" id="full-library" data-licence-panel>
  <strong>The full library is unlocked on this Mac</strong>
  <p>Version ${esc(pack.version)}, ${plural(pack.items, "item")}. New items arrive on their own: the studio checks once a day${l.checked ? `, most recently ${esc(formatDateTime(l.checked))}` : ""}.</p>
  <div class="row"><button class="button button--secondary" type="button" data-licence-check>Check for new items now</button></div>
  ${result}
</div>`;
  }
  if (!all.length) return "";
  const buy = catalogue().buy;
  const one = category ? CATEGORIES[category].one : "item";
  return `<div class="callout" id="full-library" data-licence-panel>
  <strong>${here.length ? `${plural(here.length, `more ${one}`)} in the full library` : "The full library"}</strong>
  <p>The full library adds ${plural(all.length, "item")}, and every new one as it's made: one purchase, kept for good. Unlocked, they play here in your brands and at every size, and Claude uses them in your videos.</p>
  ${l?.message ? `<p class="libpaid_problem">${esc(l.message)}</p>` : ""}
  ${buy ? `<p><a class="button" href="${esc(buy)}" target="_blank" rel="noopener">Get the full library</a></p>` : ""}
  <form class="libkey" data-licence>
    <label class="field-label" for="licence-key">Already have a licence key?</label>
    <div class="libkey_row"><input id="licence-key" name="key" type="text" placeholder="WVS-XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button class="button button--secondary" type="submit">Unlock</button></div>
    <p class="libkey_get">Not got a code yet? <a href="${esc(buy || GET_KEY)}" target="_blank" rel="noopener">Get one here →</a></p>
  </form>
  ${result}
</div>`;
}

/** An example for a field in the "What you fill in" table. */
function fieldExample(d) {
  if (d.type === "enum") return (d.options || []).map((o) => o.label).join(" or ");
  if (d.default === "" || d.default == null) return "—";
  return `${d.default}${d.unit ? ` ${d.unit}` : ""}`;
}

/** Brand and size, for the library or an item, and on the library's own pages whether to show only the free items:
    a choice reloads the page with it (ui/page.js). */
function libraryControls(view, { type = false } = {}) {
  const options = [`<option value="">Studio style</option>`]
    .concat(view.brands.map((b) => `<option value="${esc(b.slug)}"${view.brand?.slug === b.slug ? " selected" : ""}>${esc(b.name)}</option>`))
    .join("");
  const sizes = Object.entries(SIZES)
    .map(([key, s]) => `<label><input type="radio" name="size" value="${key}"${view.size === key ? " checked" : ""}><span>${esc(s.label)}</span></label>`)
    .join("");
  return `<form class="gcontrols" method="get" data-library-controls>
  <label class="gcontrol"><span class="field-label">Brand</span><span class="gselect"><select name="brand">${options}</select></span></label>
  <fieldset class="gcontrol"><legend class="field-label">Size</legend><div class="seg">${sizes}</div></fieldset>
  ${
    type
      ? `<fieldset class="gcontrol"><legend class="field-label">Type</legend><div class="seg">${[
          ["all", "Paid & Free"],
          ["free", "Free only"],
          ["favourites", "Favourites"],
        ]
          .map(([key, label]) => `<label><input type="radio" name="type" value="${key}"${view.type === key ? " checked" : ""}><span>${esc(label)}</span></label>`)
          .join("")}</div></fieldset>`
      : view.type !== "all"
        ? `<input type="hidden" name="type" value="${esc(view.type)}">`
        : ""
  }${Object.keys(view.vars || {}).length ? `<input type="hidden" name="vars" value="${esc(JSON.stringify(view.vars))}">` : ""}
  <noscript><button class="button button--secondary" type="submit">Show</button></noscript>
</form>`;
}

/** The library: a menu of its categories beside one category's items, every item playing live in the chosen brand and
    size. */
export function libraryPage(studio, category, query) {
  const c = CATEGORIES[category];
  const view = libraryView(studio, query);
  const all = libraryItems();
  const allLocked = lockedItems();
  const items = libraryItems(category);
  const locked = lockedItems(category);
  const S = SIZES[view.size];
  const q = viewQuery(view);
  const menu = Object.entries(CATEGORIES)
    .map(([key, cat]) => {
      const list = libraryItems(key);
      const count = list.length + lockedItems(key).length;
      const free = list.filter((i) => i.free).length;
      const meta = count ? `${plural(count, "item")}${free ? ` · ${free} free` : ""}` : "On the way";
      return `<li><a class="libnav_link" href="/library/${key}/${q}"${key === category ? ' aria-current="page"' : ""}><span class="libnav_letter" aria-hidden="true">${esc(cat.letter)}</span><span class="libnav_name">${esc(cat.title)}</span><span class="libnav_meta">${esc(meta)}</span></a></li>`;
    })
    .join("");
  const freeOnly = view.type === "free";
  const favesOnly = view.type === "favourites";
  // favourites are items this Mac can use: a locked one can't be starred (one starred before its licence lapsed waits)
  const shown = (freeOnly ? items.filter((i) => i.free) : favesOnly ? items.filter((i) => view.favourites.has(i.code)) : [...items, ...locked]).sort(byCode);
  // a locked item shows faded, under a "Paid upgrade" badge that leads to the full library above the cards
  const cards = shown
    .map(
      (item) => `<article class="card gitem${item.locked ? " gitem--locked" : ""}" data-search="${esc(searchText(item))}">
  ${starButton(item, view)}
  ${item.locked ? `<a class="gitem_upgrade" href="#full-library">Paid upgrade</a>` : ""}
  <div class="gitem_media">${item.locked ? lockedFrame(item, view.size) : gframe(item, view)}</div>
  <div class="card_body">
    <div class="row"><span class="code${item.locked ? " code--locked" : ""}">${esc(item.code)}</span>${item.free ? `<span class="chip chip--plain">Free</span>` : item.paid ? `<span class="chip chip--plain">${item.locked ? "Paid · unavailable" : "Full library"}</span>` : ""}</div>
    <h3 class="card_title"><a class="card_link" href="/library/${category}/${enc(item.code.toLowerCase())}/${q}">${esc(item.name)}</a></h3>
    <p class="muted">${esc(item.summary)}</p>
  </div>
</article>`,
    )
    .join("\n");
  const bothTypes = viewQuery({ ...view, type: "all" });
  const empty = favesOnly
    ? `<div class="libempty"><span class="libempty_label">No favourite ${esc(c.one)}s yet</span><p>Star any ${esc(c.one)} to keep it here. Video Studio suggests your favourites first. <a href="/library/${category}/${bothTypes}">Show them all</a>.</p></div>`
    : freeOnly && items.length + locked.length
      ? `<div class="libempty"><span class="libempty_label">No free ${esc(c.one)}s</span><p>Every ${esc(c.one)} here is in the full library. <a href="/library/${category}/${bothTypes}">Show paid and free</a>.</p></div>`
      : `<div class="libempty"><span class="libempty_label">On the way</span><p>The first ${esc(c.one)}s come in a plugin update. Until then, Claude designs them for each video from scratch.</p></div>`;
  const example = items[0] || all[0];
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/library/${q}">Library</a> / ${esc(c.title)}</p>
    ${eyebrow(tc(0), "Library")}
    <div class="split">
      <div class="stack">
        <h1>Library</h1>
        <p class="lede">Ready-made pieces for your videos, each dressed in your brand: widgets, layouts, text effects, transitions and data. Claude suggests them in your scripts and storyboards, and you can ask for any one by its code.</p>
      </div>
      <dl class="titleblock">
        ${cell("Items", String(all.length + allLocked.length))}
        ${cell("Free", String(all.filter((i) => i.free).length))}
        ${cell("Brand", brandStyle(view.brand).name)}
        ${cell("Size", `${S.label} · ${S.w}×${S.h}`)}
      </dl>
    </div>
    ${libraryControls(view, { type: true })}
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    <div class="library">
      <nav class="libnav" aria-label="Library"><ul>${menu}</ul></nav>
      <div class="library_main">
        ${eyebrow(tc(1), c.title)}
        <div class="stack">
          <h2>${esc(c.title)}</h2>
          <p class="lede">${esc(c.lede)}</p>
        </div>
        ${librarySearch(view, category)}
        ${freeOnly || favesOnly ? "" : paidPanel(category)}
        ${shown.length ? `<div class="ggrid${S.h > S.w ? " ggrid--tall" : ""}" data-lib-grid>${cards}</div>` : empty}
        ${brokenItems(category)
          .map((b) => `<div class="callout"><strong>${esc(b.file.split("/").pop())} couldn't be shown</strong><p>${esc(b.error)}</p></div>`)
          .join("")}
      </div>
    </div>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(2), "Use one")}
    <div class="split" style="align-items: start">
      <div class="stack">
        <h2>Using one in a video</h2>
        <p>Tell Claude the code and where it goes, for example: <span class="mono">“Use ${esc(example?.code || "W01")} in row 4 of the script.”</span> Claude fills in the words, dresses it in the video's brand and fits it to the video's size.</p>
      </div>
      <div class="callout"><strong>About the previews</strong><p>${
        category === "transitions"
          ? "Each transition plays between two stand-ins: the dark frame with a silhouette, for your footage, and a simple chart in the brand you choose above. In a video it joins your real scenes."
          : category === "data"
            ? "The figures are made-up examples; you give each chart your own, with their source."
            : "The dark frame and the silhouette stand in for your footage."
      } Every item takes its colours, fonts and corner rounding from the brand kit you choose above, and lays itself out for each size.</p></div>
    </div>
  </div>
</section>`;
  // every item in every category, for the search's counts in the other categories
  const index = [...all, ...allLocked].map((i) => ({ k: i.category, s: searchText(i) }));
  const foot = `<script type="application/json" id="library-index">${JSON.stringify({ categories: Object.fromEntries(Object.entries(CATEGORIES).map(([k, x]) => [k, x.title])), view: viewQuery({ ...view, vars: {} }), items: index }).replace(/</g, "\\u003c")}</script>`;
  return layout({ title: `${c.title} · Library`, active: "library", studio, body, foot });
}

/** What the library's search looks in: an item's code, name and what it's for. */
const searchText = (item) => `${item.code} ${item.name} ${item.summary || ""}`.toLowerCase();

/** A card's star: on, the item is one of the user's favourites (ui/page.js posts it to /api/favourite). Only an item
    this Mac can use has one: a locked paid item has to be unlocked first. */
function starButton(item, view) {
  if (item.locked) return "";
  const on = view.favourites.has(item.code);
  return `<button class="gstar" type="button" data-favourite="${esc(item.code)}" aria-pressed="${on}" aria-label="Favourite ${esc(`${item.code} ${item.name}`)}" title="${on ? "In your favourites" : "Add to your favourites"}"><span aria-hidden="true">★</span></button>`;
}

/** The library's search, over the category's cards as you type, with how many match in the other categories
    (ui/page.js). "/" goes to it. */
function librarySearch(view, category) {
  return `<div class="libsearch" role="search">
  <label class="field-label" for="lib-q">Search the library</label>
  <div class="libsearch_row"><input id="lib-q" type="search" value="${esc(view.q)}" placeholder="Try “stat”, “quote” or “map”" autocomplete="off" spellcheck="false" data-lib-search data-category="${esc(category)}"><kbd aria-hidden="true">/</kbd></div>
  <p class="libsearch_result" data-lib-result aria-live="polite"></p>
</div>`;
}

/** One item: it playing large, at every size, what it's for, what you fill in and what comes from the brand kit. */
export function itemPage(studio, category, code, query) {
  const item = findItem(code);
  const c = CATEGORIES[category];
  if (!item || item.category !== category) return { status: 404, html: page404(studio, `The ${c.one} “${code}”`) };
  const view = libraryView(studio, query);
  if (item.locked) return lockedItemPage(studio, item, view);
  const style = brandStyle(view.brand);
  const S = SIZES[view.size];
  const base = `/library/${category}/${enc(item.code.toLowerCase())}/`;
  const length = item.variables.find((d) => d.id === "duration");
  // the brand settings the block actually uses
  const used = new Set(BRAND_VARS.filter((k) => item.template.includes(`--${k}`) || item.template.includes(`"${k}"`)));
  const sizes = Object.keys(SIZES)
    .map((key) => `<a class="gsize" href="${base}${viewQuery(view, key)}"${key === view.size ? ' aria-current="true"' : ""}>${gframe(item, view, key, `${item.code} at ${SIZES[key].label}`)}<span>${esc(SIZES[key].label)}</span></a>`)
    .join("");
  const fields = contentVariables(item)
    .filter((d) => d.id !== "duration")
    .map((d) => `<tr><th scope="row">${esc(d.label || d.id)}</th><td>${esc(fieldExample(d))}</td><td class="mono">${esc(d.id)}</td></tr>`)
    .join("");
  const BRAND_LABELS = {
    card: "Card",
    ink: "Text",
    muted: "Muted text",
    line: "Lines",
    accent: "Accent",
    onAccent: "Text on the accent",
    onVideo: "Text on footage",
    fontDisplay: "Heading font",
    fontBody: "Body font",
    fontLabel: "Label font",
    radius: "Corner rounding",
    ease: "Ease for moves",
  };
  const brandRows = BRAND_VARS.filter((k) => used.has(k))
    .map((k) => {
      const value = String(style.vars[k]);
      const swatch = /^#/.test(value) ? `<span class="swatch-dot" style="background: ${esc(value)}"></span>` : "";
      return `<div class="styleset_item"><span class="field-label">${esc(BRAND_LABELS[k])}</span><span class="styleset_value">${swatch}${esc(value.replace(/^"|"$/g, ""))}</span></div>`;
    })
    .join("");
  const ask = `Use ${item.code} (${item.name}) in my video: `;
  // "Try it with your words": the words and options, without the media files the preview stands in for, or the pixel
  // positions that place it over real footage
  const tryFields = contentVariables(item).filter(
    (d) => !(d.type === "string" && (/(Video|Image|Path)$|^(image|video|media|clip)\d+$|^(photo|avatar|logo|file|cover)$/.test(d.id) || /\bfile\b/i.test(d.label || ""))) && !(d.type === "number" && d.unit === "px"),
  );
  const example = Object.fromEntries(tryFields.map((d) => [d.id, item.preview?.[d.id] ?? d.default]));
  const now = { ...example, ...Object.fromEntries(Object.entries(view.vars).filter(([k]) => Object.hasOwn(example, k))) };
  const field = (d) => {
    const v = now[d.id];
    const label = `<span class="field-label">${esc(d.label || d.id)}</span>`;
    if (d.type === "enum")
      return `<label class="gtry_field">${label}<span class="gselect"><select name="${esc(d.id)}">${(d.options || []).map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(v) ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</select></span></label>`;
    if (d.type === "number")
      return `<label class="gtry_field">${label}<span class="gtry_number"><input type="number" name="${esc(d.id)}" value="${esc(v ?? "")}"${d.min != null ? ` min="${esc(d.min)}"` : ""}${d.max != null ? ` max="${esc(d.max)}"` : ""} step="${esc(d.step ?? "any")}">${d.unit ? `<span>${esc(d.unit)}</span>` : ""}</span></label>`;
    if (d.type === "color" && /^#[0-9a-f]{6}$/i.test(String(v)))
      return `<label class="gtry_field">${label}<input type="color" name="${esc(d.id)}" value="${esc(v)}"></label>`;
    const long = String(v ?? "").length > 48 || /[|\n]/.test(String(v ?? ""));
    return `<label class="gtry_field">${label}${long ? `<textarea name="${esc(d.id)}" rows="2">${esc(v ?? "")}</textarea>` : `<input type="text" name="${esc(d.id)}" value="${esc(v ?? "")}">`}</label>`;
  };
  const tryForm = tryFields.length
    ? `<form class="gtry" data-try data-code="${esc(item.code)}" data-name="${esc(item.name)}" data-example="${esc(JSON.stringify(example))}">
  <div class="stack">
    <h3 class="card_title">Try it with your words</h3>
    <p class="muted">Change its words and options and the preview plays them, in the brand and size above. Nothing here changes a video.</p>
  </div>
  <div class="gtry_fields">${tryFields.map(field).join("")}</div>
  <div class="row"><button class="button button--secondary" type="button" data-try-reset>Back to the example</button></div>
</form>`
    : "";
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/library/${viewQuery(view)}">Library</a> / <a href="/library/${category}/${viewQuery(view)}">${esc(c.title)}</a> / ${esc(item.code)} ${esc(item.name)}</p>
    ${eyebrow(item.code, c.one[0].toUpperCase() + c.one.slice(1))}
    <div class="split">
      <div class="stack">
        <h1>${esc(item.name)}</h1>
        <p class="lede">${esc(item.summary)}</p>
        <div class="row">${favouriteButton(item, view)}</div>
      </div>
      <dl class="titleblock">
        ${cell("Code", item.code)}
        ${cell("Category", c.title)}
        ${cell("Price", item.free ? "Free" : "Full library")}
        ${cell("Length", length ? `${length.default} s, or as long as it's needed` : "")}
        ${cell("Brand", style.name)}
        ${cell("Size", `${S.label} · ${S.w}×${S.h}`)}
      </dl>
    </div>
    ${libraryControls(view)}
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(1), "Preview")}
    <div class="gplay${tryForm ? " gplay--try" : ""}">
      <div class="gplay_stage">
        <div class="gstage${S.h > S.w ? " gstage--tall" : ""}">${gframe(item, view)}</div>
        <div class="row gstage_tools"><button class="button button--secondary" type="button" data-replay>Play from the start</button><span class="muted">It loops; the silhouette stands in for your footage.</span></div>
      </div>
      ${tryForm}
    </div>
    <h3 class="card_title gsizes_title">Every size</h3>
    <div class="gsizes">${sizes}</div>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(2), "Use it")}
    <div class="split" style="align-items: start">
      <div class="stack">
        <h2>When to use it</h2>
        <p>${esc(item.use)}</p>
        <h3 class="card_title">How it moves</h3>
        <p>${esc(item.motion)}</p>
      </div>
      <div class="callout">
        <strong>Use it in a video</strong>
        <p>Tell Claude the code, the video and where it goes. Claude fills in the words, dresses it in the video's brand and fits it to the video's size.</p>
        <p class="mono" data-ask>“${esc(ask)}…”</p>
        <p><button class="button button--secondary" type="button" data-copy="${esc(ask)}" data-ask-copy>Copy this to start</button></p>
      </div>
    </div>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(3), "What you fill in")}
    <div class="split" style="align-items: start">
      <div class="stack">
        <h2>What you fill in</h2>
        <div class="table-wrap"><table class="fields">
          <thead><tr><th scope="col">What</th><th scope="col">Example</th><th scope="col">Name</th></tr></thead>
          <tbody>${fields}</tbody>
        </table></div>
      </div>
      <div class="stack">
        <h2>From the brand kit</h2>
        <p class="muted">${view.brand ? `In ${esc(style.name)}'s style:` : "In the studio's own style; choose a brand above to see it in yours:"}</p>
        <div class="styleset">${brandRows}</div>
      </div>
    </div>
  </div>
</section>`;
  return { status: 200, html: layout({ title: `${item.code} ${item.name}`, active: "library", studio, body }) };
}

/** An item page's star: add it to the user's favourites, or take it out (ui/page.js). Not for a locked item. */
function favouriteButton(item, view) {
  if (item.locked) return "";
  const on = view.favourites.has(item.code);
  return `<button class="button button--secondary gfav" type="button" data-favourite="${esc(item.code)}" aria-pressed="${on}"><span aria-hidden="true">★</span> <span data-favourite-label>${on ? "In your favourites" : "Add to favourites"}</span></button>`;
}

/** A locked paid item's page: stills of it at every size, what it's for and how it moves, what it takes, and how to
    unlock it. */
function lockedItemPage(studio, item, view) {
  const c = CATEGORIES[item.category];
  const base = `/library/${item.category}/`;
  const S = SIZES[view.size];
  const here = `${base}${enc(item.code.toLowerCase())}/`;
  const sizes = Object.keys(SIZES)
    .map((key) => `<a class="gsize" href="${here}${viewQuery(view, key)}"${key === view.size ? ' aria-current="true"' : ""}>${lockedFrame(item, key)}<span>${esc(SIZES[key].label)}</span></a>`)
    .join("");
  const fields = (item.fields || [])
    .filter((d) => d && d.id !== "duration")
    .map((d) => `<tr><th scope="row">${esc(d.label || d.id)}</th><td>${esc(fieldExample(d))}</td><td class="mono">${esc(d.id)}</td></tr>`)
    .join("");
  const body = `
<section class="section section--hero">
  <div class="container">
    <p class="breadcrumbs"><a href="/">Studio</a> / <a href="/library/">Library</a> / <a href="${base}">${esc(c.title)}</a> / ${esc(item.code)} ${esc(item.name)}</p>
    ${eyebrow(item.code, c.one[0].toUpperCase() + c.one.slice(1))}
    <div class="split">
      <div class="stack">
        <h1>${esc(item.name)}</h1>
        <p class="lede">${esc(item.summary)}</p>
        <div class="row">${favouriteButton(item, view)}</div>
      </div>
      <dl class="titleblock">
        ${cell("Code", item.code)}
        ${cell("Category", c.title)}
        ${cell("Price", "Full library")}
        ${cell("On this Mac", "Locked")}
        ${cell("Length", item.length ? `${item.length} s` : item.duration ? `${item.duration} s, or as long as it's needed` : "")}
      </dl>
    </div>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(1), "Preview")}
    <div class="gstage${S.h > S.w ? " gstage--tall" : ""}">${lockedFrame(item, view.size)}</div>
    <p class="muted gstage_tools">A still, in the studio's own style. Unlocked, it plays here in your brands, moving.</p>
    <h3 class="card_title gsizes_title">Every size</h3>
    <div class="gsizes">${sizes}</div>
  </div>
</section>
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(2), "Use it")}
    <div class="split" style="align-items: start">
      <div class="stack">
        <h2>When to use it</h2>
        <p>${esc(item.use || "")}</p>
        <h3 class="card_title">How it moves</h3>
        <p>${esc(item.motion || "")}</p>
      </div>
      ${paidPanel(item.category)}
    </div>
  </div>
</section>${
    fields
      ? `
<section class="section section--rule">
  <div class="container">
    ${eyebrow(tc(3), "What you fill in")}
    <div class="stack">
      <h2>What you fill in</h2>
      <div class="table-wrap"><table class="fields">
        <thead><tr><th scope="col">What</th><th scope="col">Example</th><th scope="col">Name</th></tr></thead>
        <tbody>${fields}</tbody>
      </table></div>
    </div>
  </div>
</section>`
      : ""
  }`;
  return { status: 200, html: layout({ title: `${item.code} ${item.name}`, active: "library", studio, body }) };
}

export { page404 };
