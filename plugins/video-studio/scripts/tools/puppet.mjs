#!/usr/bin/env node
// A character the user has given, made ready to move (guides/design/characters.md). Run from the video's folder.
//
//   node <plugin>/scripts/tools/puppet.mjs copy
//     Puts the puppet runtime in the project (assets/vendor/puppet.js), for a film that bends flat art with pins.
//   node <plugin>/scripts/tools/puppet.mjs cutout <picture> --out <file.png> [--tolerance 40] [--keep-pockets] [--no-bottom]
//     Takes a flat background away (a character drawn on one colour), cropped to the character, and a sheet of it on
//     red and on dark, where anything wrongly kept or lost shows. --keep-pockets keeps enclosed gaps of the
//     background's colour (a white shirt on white); --no-bottom for a figure the picture's bottom edge cuts off.
//   node <plugin>/scripts/tools/puppet.mjs landmarks <art.png|.svg> [--size <w>x<h>]
//     Where the character ends (head, hands, feet) and branches (neck, shoulders, hips), in the art's pixels, on a
//     numbered grid: the places to start its pins from.
//   node <plugin>/scripts/tools/puppet.mjs parts <art.svg>
//     An SVG's groups and named shapes with their boxes, outlined and numbered: which group is the arm, the head.
//   node <plugin>/scripts/tools/puppet.mjs check <rig.json>
//     The rig at rest (its pins, chains, stiff and front areas) and in each of its poses, with every triangle that
//     stretches, squashes or folds outlined in red, and its problems in words.
//
// Sheets go to docs/characters/ (--sheet <file> sets one); the tool prints what it found as JSON.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome, gpuArgs } from "../lib/chrome.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNTIME = join(HERE, "..", "puppet", "puppet.js");
const TOOLS = join(HERE, "..", "puppet", "tools.js");
const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (k, d = null) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};
const has = (k) => argv.includes(k);
const valued = new Set(["--out", "--tolerance", "--size", "--sheet"]);
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith("--") && !valued.has(arr[i - 1]));
const USAGE = "usage: puppet.mjs copy | cutout <picture> --out <file.png> | landmarks <art> | parts <art.svg> | check <rig.json>";

const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif" };
const dataUrl = (file) => {
  const type = TYPES[extname(file).toLowerCase()];
  if (!type) throw new Error(`${basename(file)}: use a PNG, JPEG, WebP or SVG`);
  return `data:${type};base64,${readFileSync(file).toString("base64")}`;
};
const writeData = (file, url) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
};
const sheetFor = (input, what) => resolve(opt("--sheet") || join("docs", "characters", `${basename(input, extname(input)).replace(/\.rig$/, "")}-${what}.png`));

async function inChrome(fn, ...args) {
  const { puppeteer, executablePath } = findChrome();
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb", ...gpuArgs()] });
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><html><body style='margin:0'></body></html>");
    await page.addScriptTag({ content: readFileSync(RUNTIME, "utf8") });
    await page.addScriptTag({ content: readFileSync(TOOLS, "utf8") });
    return await page.evaluate(fn, ...args);
  } finally {
    await browser.close();
  }
}

function need(file, what) {
  if (!file) throw new Error(USAGE);
  const f = resolve(file);
  if (!existsSync(f)) throw new Error(`${what} not found: ${file}`);
  return f;
}

async function main() {
  if (cmd === "copy") {
    const to = resolve("assets", "vendor", "puppet.js");
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(RUNTIME, to);
    console.log(JSON.stringify({ copied: "assets/vendor/puppet.js" }));
    return;
  }
  if (cmd === "cutout") {
    const src = need(positional[0], "Picture");
    const out = opt("--out");
    if (!out) throw new Error("cutout needs --out <file.png>");
    const r = await inChrome((url, o) => PuppetTools.cutout(url, o), dataUrl(src), { tolerance: Number(opt("--tolerance", 40)), keepPockets: has("--keep-pockets"), noBottom: has("--no-bottom") });
    if (r.already) {
      console.log(JSON.stringify({ already: true, note: "This picture already has a transparent background: use it as it is.", size: r.size }));
      return;
    }
    writeData(resolve(out), r.png);
    const sheet = sheetFor(out, "cutout");
    writeData(sheet, r.sheet);
    console.log(JSON.stringify({ out, size: r.size, background: `rgb(${r.bg.join(", ")})`, crop: r.crop, sheet }));
    return;
  }
  if (cmd === "landmarks") {
    const src = need(positional[0], "Art");
    const size = opt("--size")?.split("x").map(Number);
    const r = await inChrome((url, o) => PuppetTools.landmarks(url, o), dataUrl(src), { size });
    const sheet = sheetFor(src, "landmarks");
    writeData(sheet, r.sheet);
    const { sheet: _, ...rest } = r;
    console.log(JSON.stringify({ ...rest, sheet }));
    return;
  }
  if (cmd === "parts") {
    const src = need(positional[0], "SVG");
    if (extname(src).toLowerCase() !== ".svg") throw new Error("parts reads an SVG");
    const r = await inChrome((text) => PuppetTools.parts(text), readFileSync(src, "utf8"));
    const sheet = sheetFor(src, "parts");
    writeData(sheet, r.sheet);
    const { sheet: _, ...rest } = r;
    console.log(JSON.stringify({ ...rest, sheet }));
    return;
  }
  if (cmd === "check") {
    const file = need(positional[0], "Rig");
    const rig = JSON.parse(readFileSync(file, "utf8"));
    if (!rig.art) throw new Error("the rig names no art");
    const art = resolve(dirname(file), rig.art);
    if (!existsSync(art)) throw new Error(`the rig's art isn't there: ${rig.art}`);
    const r = await inChrome((g) => PuppetTools.check(g), { ...rig, art: dataUrl(art) });
    const sheet = sheetFor(file, "check");
    writeData(sheet, r.sheet);
    const { sheet: _, ...rest } = r;
    console.log(JSON.stringify({ ...rest, sheet }, null, 1));
    return;
  }
  throw new Error(USAGE);
}

main().catch((e) => {
  console.error(e.message || String(e));
  process.exit(1);
});
