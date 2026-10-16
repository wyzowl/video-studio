// Render a text label to a transparent PNG with headless Chrome (this ffmpeg build has no drawtext).
// For slates, review annotations and before/after captions, not for in-film type (that lives in the composition).
//   node <plugin>/scripts/tools/label_png.mjs "<text>" <out.png> [--size 34] [--font path.ttf] [--weight 800]
//        [--color "#fff"] [--bg "#030712"]   (--bg none = text only)
// Uses the headless Chrome and puppeteer-core that HyperFrames already installed (override: CHROME=…, PUPPETEER_CORE=…).
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [text, out] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
if (!text || !out) { console.error('usage: label_png.mjs "<text>" <out.png> [--size 34] [--font f.ttf] [--weight 800] [--color #fff] [--bg #030712|none]'); process.exit(1); }
const size = opt("--size", "34"), weight = opt("--weight", "800"), color = opt("--color", "#fff"), bg = opt("--bg", "#030712");
const font = opt("--font", null);

// newest copy of a path matching ~/.npm/_npx/*/node_modules/puppeteer-core, and HyperFrames' headless shell
const newest = (paths) => paths.filter(existsSync).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const npx = join(homedir(), ".npm/_npx");
const PUP = process.env.PUPPETEER_CORE || newest(readdirSync(npx).map((d) => join(npx, d, "node_modules/puppeteer-core")));
const chromeRoot = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
const CHROME = process.env.CHROME || newest(existsSync(chromeRoot) ? readdirSync(chromeRoot).flatMap((v) => readdirSync(join(chromeRoot, v)).map((d) => join(chromeRoot, v, d, "chrome-headless-shell"))) : []);
if (!PUP || !CHROME) { console.error("puppeteer-core or HyperFrames' Chrome not found: run a HyperFrames render once, or set PUPPETEER_CORE / CHROME"); process.exit(1); }

const puppeteer = createRequire(import.meta.url)(PUP);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const face = font ? `@font-face { font-family: "L"; src: url("file://${resolve(font)}"); font-weight: ${weight}; }` : "";
const box = bg === "none" ? "" : `background: ${bg}; padding: 0.25em 0.6em 0.3em; border-radius: 0.3em;`;
await page.setContent(`<html><head><style>${face}
  html, body { margin: 0; background: transparent; }
  #l { display: inline-block; font: ${weight} ${size}px ${font ? "L, " : ""}system-ui, sans-serif; color: ${color}; ${box} letter-spacing: -0.01em; }
</style></head><body><span id="l">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span></body></html>`, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await (await page.$("#l")).screenshot({ path: out, omitBackground: true });
await browser.close();
console.log(out);
