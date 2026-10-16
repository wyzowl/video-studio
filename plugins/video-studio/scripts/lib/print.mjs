// Print versions of a script and a storyboard: the documents their PDFs are made from (lib/pdf.mjs), for sharing
// outside the studio. They hold what's being reviewed and how to reply, without the review controls or any saved notes,
// and without logos or the studio's name: they go to clients as plain documents. Styles: ui/print.css.
import {
  readVideo,
  readBrand,
  readBrief,
  readScript,
  scriptVersions,
  scriptRows,
  scriptHasVoiceover,
  scriptLength,
  WORDS_PER_MINUTE,
  readStoryboard,
  storyboardVersions,
  parseSize,
  formatDate,
  timecode,
} from "./studio.mjs";
import { esc, enc, rich } from "./pages.mjs";
import { libraryItem } from "./library.mjs";

/** Library items named by code ("[W03]") read as their names here: the codes are for the studio, not the reader. */
const items = (html) => String(html).replace(/\[([A-Z]\d{2,3})\]/g, (whole, code) => {
  const item = libraryItem(code);
  return item ? `<span class="doc_item">${esc(item.name)}</span>` : whole;
});

/** A string for a CSS `content` value. */
const cssText = (s) => `"${String(s).replace(/[\\"]/g, "\\$&").replace(/[\r\n]+/g, " ").replace(/</g, "\\3c ")}"`;
const note = (title, text) => `<div class="doc_note"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
const block = (label, text) => `<div class="doc_block"><span class="doc_label">${esc(label)}</span><p>${items(rich(text))}</p></div>`;

function doc({ title, orientation, footer, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/ui/print.css">
<style>@page { size: A4 ${orientation}; @bottom-left { content: ${cssText(footer)}; } }</style>
</head>
<body class="doc doc--${orientation}">
${body}
</body>
</html>`;
}

function head({ kind, version, title, summary, facts }) {
  return `<header class="doc_head">
  <p class="doc_eyebrow"><span class="doc_index">V${version}</span><span>${esc(kind)}</span></p>
  <h1>${esc(title)}</h1>
</header>
${summary ? `<p class="doc_summary">${esc(summary)}</p>` : ""}
<dl class="doc_facts">${facts
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("")}</dl>`;
}

/** How someone outside the studio replies: by row or scene number, which the review page and Claude both use. */
function reply(unit, example) {
  return `<section class="doc_reply">
  <h2>Your feedback</h2>
  <p>Reply with the ${unit} number and what you'd change, for example: “${esc(example)}”. If it all looks right, just say it's approved.</p>
</section>`;
}

/** The script as a document: the length, then # | Voiceover (or Text on screen) | Action on screen. A4 portrait. */
export function scriptPrint(studio, slug, version) {
  const video = readVideo(studio.root, slug);
  const data = video && scriptVersions(studio.root, slug).includes(version) ? readScript(studio.root, slug, version) : null;
  if (!data) return null;
  const sc = data.script;
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const size = parseSize(sc.size || video.size);
  const rows = scriptRows(sc);
  const spoken = scriptHasVoiceover(sc);
  const words = spoken ? "Voiceover" : "Text on screen";
  const length = scriptLength(sc);
  const recorded = spoken && (sc.recorded === true || readBrief(studio.root, slug).voiceover === "recorded");
  const hasBold = rows.some((r) => /\*\*.+?\*\*/s.test(`${r.voiceover || ""} ${r.onScreen || ""} ${r.action || ""}`));
  const title = sc.title || video.title;
  const what = `Script v${version}`;
  const rule = [
    length ? `<p><b>Rule:</b> ${WORDS_PER_MINUTE} Words of voiceover = Approx 60 Seconds of video</p><p><b>This script:</b> ${length.words} Words of voiceover = ${length.seconds} Seconds of video</p>` : "",
    hasBold ? `<p class="doc_legend"><strong>Bold text</strong> appears on screen.</p>` : "",
  ].join("");
  const body = `${head({
    kind: "Script",
    version,
    title,
    summary: sc.summary,
    facts: [
      ["Brand", brand?.name || video.brand],
      ["Size", `${size.label} · ${size.px}`],
      ["Length", length ? `About ${timecode(length.seconds)} (${length.words} words)` : video.length],
      ["Rows", String(rows.length)],
      ["Date", formatDate(Date.parse(sc.created))],
    ],
  })}
${sc.changes ? note(`What changed in v${version}`, sc.changes) : ""}
${recorded ? note("The voiceover is a recording", "Its words come from the recording, cut to the take that's used. Lines can be cut or moved, but changing the words themselves needs a new recording.") : ""}
${rule ? `<div class="doc_rule">${rule}</div>` : ""}
<table class="doc_table">
  <thead><tr><th class="doc_n" scope="col">#</th><th scope="col">${words}</th><th scope="col">Action on screen</th></tr></thead>
  <tbody>
${rows
  .map((r) => `    <tr><th class="doc_n" scope="row">${r.n}</th><td>${rich(spoken ? r.voiceover : (r.onScreen ?? r.voiceover))}</td><td>${items(rich(r.action))}</td></tr>`)
  .join("\n")}
  </tbody>
</table>
${reply("row", "Row 4: make the second line shorter")}`;
  return { title, what, html: doc({ title: `${title} – ${what}`, orientation: "portrait", footer: `${title} · ${what}`, body }) };
}

// A storyboard page is A4 landscape: 267 mm wide inside the margins in ui/print.css. Landscape frames run in a row across
// it with the words below; taller frames sit in a fixed area on the left with the words beside them, lined up down the
// page.
const PAGE_MM = 267;
const SIDE_MM = 172;
const GAP_MM = 4;
const FRAME_MAX_H = 56;

/** The storyboard as a document: a block per scene with its frames, timing, words and what happens. */
export function storyboardPrint(studio, slug, version) {
  const video = readVideo(studio.root, slug);
  const data = video && storyboardVersions(studio.root, slug).includes(version) ? readStoryboard(studio.root, slug, version) : null;
  if (!data) return null;
  const sb = data.storyboard;
  const brand = video.brand ? readBrand(studio.root, video.brand) : null;
  const size = parseSize(sb.size || video.size);
  const ratio = size.w / size.h;
  const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
  const total = sb.duration ?? scenes.reduce((mx, s) => Math.max(mx, +s.end || 0), 0);
  const base = `/videos/${enc(slug)}/storyboard/v${version}/`;
  const title = sb.title || video.title;
  const what = `Storyboard v${version}`;

  const across = ratio > 1;
  const sceneHtml = scenes.map((s, i) => {
    const frames = (Array.isArray(s.frames) ? s.frames : []).filter((f) => f?.src).slice(0, 5);
    // every frame in one row, never taller than FRAME_MAX_H
    const cols = Math.max(1, frames.length);
    const width = Math.min(((across ? PAGE_MM : SIDE_MM) - GAP_MM * (cols - 1)) / cols, FRAME_MAX_H * ratio, 86);
    const dur = s.end != null && s.start != null ? `${(+s.end - +s.start).toFixed(1)} s` : "";
    const when = [[timecode(s.start), timecode(s.end)].filter(Boolean).join("–"), dur].filter(Boolean).join(" · ");
    const tags = [s.changed ? `Updated in v${version}` : "", s.carriedApproval ? `Approved in v${version - 1}` : ""].filter(Boolean);
    const said = [
      s.voiceover ? block("Voiceover", s.voiceover) : "",
      s.onScreen ? block("On screen", s.onScreen) : "",
      s.script && !s.voiceover ? block("Script", s.script) : "",
    ].join("");
    const happens = [s.description ? block("What happens", s.description) : "", s.notes ? `<p class="doc_muted">${esc(s.notes)}</p>` : ""].join("");
    const words = [said && `<div class="doc_said">${said}</div>`, happens && `<div class="doc_happens">${happens}</div>`].filter(Boolean).join("");
    const frameHtml = frames
      .map((f, k) => {
        const time = f.time != null ? timecode(f.time, true) : "";
        return `<figure class="doc_frame"><img src="${esc(base + enc(f.src))}" alt="${esc(f.caption || `Scene ${i + 1}, frame ${k + 1}`)}" style="aspect-ratio: ${size.ratio}"><figcaption><span>${esc(f.caption || `Frame ${k + 1}`)}</span>${time ? `<span class="doc_time">${esc(time)}</span>` : ""}</figcaption></figure>`;
      })
      .join("");
    return `<section class="doc_scene doc_scene--${across ? "across" : "side"}">
  <header class="doc_scene_head">
    <span class="doc_index">${String(i + 1).padStart(2, "0")}</span>
    <h2>${esc(s.title || `Scene ${i + 1}`)}</h2>
    ${when ? `<span class="doc_when">${esc(when)}</span>` : ""}
    ${tags.map((t) => `<span class="doc_tag">${esc(t)}</span>`).join("")}
  </header>
  <div class="doc_scene_body">
    ${frameHtml ? `<div class="doc_frames" style="grid-template-columns: repeat(${cols}, ${width.toFixed(1)}mm)">${frameHtml}</div>` : ""}
    <div class="doc_scene_words">${words}</div>
  </div>
</section>`;
  });

  const body = `${head({
    kind: "Storyboard",
    version,
    title,
    summary: sb.summary,
    facts: [
      ["Brand", brand?.name || video.brand],
      ["Size", `${size.label} · ${size.px}`],
      ["Length", total ? `${timecode(total)} (${(+total).toFixed(1)} s)` : video.length],
      ["Scenes", String(scenes.length)],
      ["Date", formatDate(Date.parse(sb.created))],
    ],
  })}
${sb.changes ? note(`What changed in v${version}`, sb.changes) : ""}
${sceneHtml.join("\n")}
${reply("scene", "Scene 3: hold the logo a little longer")}`;
  return { title, what, html: doc({ title: `${title} – ${what}`, orientation: "landscape", footer: `${title} · ${what}`, body }) };
}
