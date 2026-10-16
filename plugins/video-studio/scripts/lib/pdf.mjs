// PDFs of a script or storyboard, to share outside the studio. The page server renders the print version of the page
// (lib/print.mjs) and the headless Chrome that HyperFrames installs (lib/chrome.mjs) turns it into a PDF.
import { findChrome } from "./chrome.mjs";

const running = new Map();

/** A PDF of the print page at `url`, as a Buffer. The page sets its own paper size and margins (@page). Two requests
    for the same page at once share one render. */
export function renderPdf(url) {
  if (!running.has(url)) running.set(url, make(url).finally(() => running.delete(url)));
  return running.get(url);
}

async function make(url) {
  const { puppeteer, executablePath } = findChrome();
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    if (!res?.ok()) throw new Error(`the print page answered ${res ? res.status() : "nothing"}`);
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.pdf({ printBackground: true, preferCSSPageSize: true, timeout: 60_000 }));
  } finally {
    await browser.close();
  }
}

/** The name a shared file goes by: "Product intro – Script v2.pdf". */
export function shareName(title, what, ext) {
  const name = String(title || "")
    .replace(/[/\\:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${name || "Video"} – ${what}.${ext}`;
}

/** A Content-Disposition header that downloads a file under `name`, for browsers old and new. */
export function attachment(name) {
  const ascii = name.replace(/[–—]/g, "-").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "'");
  const utf8 = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
