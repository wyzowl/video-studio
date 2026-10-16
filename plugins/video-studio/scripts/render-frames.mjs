#!/usr/bin/env node
// Render storyboard frames. Every element with a data-frame attribute in an HTML page becomes <outDir>/<data-frame>.png.
//   node render-frames.mjs videos/<p>/storyboard/v1/frames.html videos/<p>/storyboard/v1/frames [--scale 0.5] [--only s01-1,s02-1]
// Size each [data-frame] element to the video (for example 1920×1080) in the page's own CSS, and keep frames still:
// no animations or transitions. --scale sets the pixel density of the PNGs (0.5 halves them; the default).
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findChrome } from "./lib/chrome.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const [IN, OUT] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!IN || !OUT) {
  console.error("usage: render-frames.mjs <frames.html> <outDir> [--scale 0.5] [--only id,id]");
  process.exit(1);
}
const scale = Number(opt("--scale", 0.5));
const only = opt("--only", "") ? opt("--only").split(",") : null;

const { puppeteer, executablePath } = findChrome();
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: scale });
  await page.goto(pathToFileURL(resolve(IN)).href, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true }) || img.addEventListener("error", r, { once: true })))));
  });
  const frames = await page.$$eval("[data-frame]", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute("data-frame"), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  if (!frames.length) throw new Error(`No [data-frame] elements in ${IN}`);
  const bad = frames.find((f) => !/^[A-Za-z0-9_-]+$/.test(f.id || ""));
  if (bad) throw new Error(`Frame ids may use letters, numbers, - and _ only: "${bad.id}"`);
  // a viewport as large as the largest frame, so no frame is clipped
  await page.setViewport({ width: Math.max(...frames.map((f) => f.w)), height: Math.max(...frames.map((f) => f.h)), deviceScaleFactor: scale });
  mkdirSync(OUT, { recursive: true });
  const written = [];
  for (const f of frames) {
    if (only && !only.includes(f.id)) continue;
    const el = await page.$(`[data-frame="${f.id}"]`);
    const file = join(OUT, `${f.id}.png`);
    await el.screenshot({ path: file });
    written.push({ id: f.id, file, width: Math.round(f.w * scale), height: Math.round(f.h * scale) });
  }
  console.log(JSON.stringify(written, null, 2));
} finally {
  await browser.close();
}
