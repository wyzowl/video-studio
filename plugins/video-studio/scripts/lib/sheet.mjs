// Sheets for Claude to look at: frames tiled in rows, each frame labelled (its time, or a storyboard frame's id) and
// each row or group headed, drawn in HyperFrames' headless Chrome (this ffmpeg has no drawtext). A sheet is made to be
// read at its own size: at most 1568 px wide, and a new sheet starts before one would pass 1568 px tall, so nothing on
// it is shrunk when it's read. Used by the review sheets (tools/sheets.mjs), a draft's fix sheet (lib/draft.mjs) and
// the storyboard's contact sheet (render-frames.mjs).
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findChrome } from "./chrome.mjs";

const MAX = 1568;
const GAP = 6;
const LABEL = 20;
const HEAD = 26;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** A time on a sheet: "12.4 s", or "1:02.4" past a minute; a stretch, "12.4–13 s". */
export const sheetTime = (t) => (t < 60 ? `${Math.round(t * 100) / 100} s` : `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`);
export const sheetRange = (a, b) => (b < 60 ? `${Math.round(a * 100) / 100}–${sheetTime(b)}` : `${sheetTime(a)}–${sheetTime(b)}`);

/** `ffmpeg … ` that resolves, or rejects with its error. */
export const ff = (args) =>
  new Promise((done, fail) => {
    const p = spawn("ffmpeg", ["-v", "error", "-y", ...args]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", fail);
    p.on("close", (c) => (c ? fail(new Error(err.trim() || `ffmpeg stopped (${c})`)) : done()));
  });

/** One frame of a video at `t` seconds into it, as a PNG, `width` px wide (its own size without one). */
export const grab = (file, t, out, width = 0) => ff(["-ss", String(Math.max(0, t)), "-i", file, "-frames:v", "1", ...(width ? ["-vf", `scale=${width}:-2:flags=lanczos`] : []), out]);

/** Run jobs (functions that return promises), `n` at a time. */
export async function pool(jobs, n = 6) {
  const q = [...jobs];
  await Promise.all(Array.from({ length: n }, async () => {
    while (q.length) await q.shift()();
  }));
}

/** Draw `groups` onto as few sheets as fit: `out` (sheet.png), then sheet-2.png and on. A group is { title, rows }, a
    row { label, tiles: [{ src, label }] }; tiles are `width` px wide, and a row of more than fit across wraps.
    `ratio` is the frames' height over width. Returns the sheets' paths. */
export async function drawSheets(groups, { out, width = 360, ratio = 9 / 16, browser = null }) {
  const rowLabel = groups.some((g) => g.rows.some((r) => r.label)) ? 110 : 0;
  const perRow = Math.max(1, Math.floor((MAX - GAP - rowLabel) / (width + GAP)));
  const tileH = Math.round(width * ratio) + LABEL;
  // each group's rows, wrapped to the width, and its height
  const laid = groups.map((g) => {
    const rows = [];
    for (const r of g.rows) for (let i = 0; i < r.tiles.length; i += perRow) rows.push({ label: i ? "" : r.label, tiles: r.tiles.slice(i, i + perRow) });
    return { title: g.title, rows, height: (g.title ? HEAD : 0) + rows.length * (tileH + GAP) };
  });
  // sheets: groups added while they fit; a group taller than a sheet is split by its rows
  const sheets = [];
  let cur = [];
  let h = GAP;
  const push = () => {
    if (cur.length) sheets.push(cur);
    cur = [];
    h = GAP;
  };
  for (const g of laid) {
    if (g.height + GAP <= MAX - h) {
      cur.push(g);
      h += g.height + GAP;
      continue;
    }
    push();
    let part = { title: g.title, rows: [] };
    for (const r of g.rows) {
      if ((part.title ? HEAD : 0) + (part.rows.length + 1) * (tileH + GAP) + GAP > MAX && part.rows.length) {
        sheets.push([part]);
        part = { title: g.title ? `${g.title} (continued)` : "", rows: [] };
      }
      part.rows.push(r);
    }
    cur.push(part);
    h += (part.title ? HEAD : 0) + part.rows.length * (tileH + GAP) + GAP;
  }
  push();

  const own = !browser;
  if (own) {
    const { puppeteer, executablePath } = findChrome();
    browser = await puppeteer.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files"] });
  }
  const files = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: MAX, height: MAX, deviceScaleFactor: 1 });
    for (const [i, sheet] of sheets.entries()) {
      const file = i ? join(dirname(out), `${basename(out, extname(out))}-${i + 1}${extname(out)}`) : out;
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: #262626; }
  #sheet { display: inline-flex; flex-direction: column; gap: ${GAP}px; padding: ${GAP}px; font: 600 13px/1 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #f2f2f2; }
  h2 { margin: 0; height: ${HEAD - GAP}px; display: flex; align-items: center; font-size: 15px; color: #f9b336; }
  .row { display: flex; gap: ${GAP}px; align-items: flex-start; }
  .rowlabel { width: ${rowLabel - GAP}px; flex: none; padding-top: 6px; color: #cfcfcf; line-height: 1.3; }
  figure { margin: 0; width: ${width}px; flex: none; }
  img { display: block; width: ${width}px; height: ${Math.round(width * ratio)}px; object-fit: contain; background: #000; }
  figcaption { height: ${LABEL}px; display: flex; align-items: center; color: #d8d8d8; font-weight: 500; white-space: nowrap; overflow: hidden; }
</style></head><body><div id="sheet">${sheet
        .map(
          (g) =>
            `<section>${g.title ? `<h2>${esc(g.title)}</h2>` : ""}${g.rows
              .map((r) => `<div class="row">${rowLabel ? `<div class="rowlabel">${esc(r.label || "")}</div>` : ""}${r.tiles.map((t) => `<figure><img src="${pathToFileURL(resolve(t.src)).href}"><figcaption>${esc(t.label || "")}</figcaption></figure>`).join("")}</div>`)
              .join("")}</section>`,
        )
        .join("")}</div></body></html>`;
      const tmp = `${file}.html`;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(tmp, html);
      try {
        await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
        await (await page.$("#sheet")).screenshot({ path: file });
      } finally {
        rmSync(tmp, { force: true });
      }
      files.push(file);
    }
  } finally {
    if (own) await browser.close();
  }
  return files;
}
