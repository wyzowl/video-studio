// Video Studio's own look at a built film, for `studio.mjs check`: what's on screen and when, measured the way
// HyperFrames draws it. The project is served from its folder with HyperFrames' own runtime (the project's pinned
// version) injected, as HyperFrames' own check and render do, and seeked with the runtime's `__player.renderSeek`;
// every sample lists the words on screen (each block of text: its words, size, colours, fonts and box, and the elements
// inside it that hold them) and the large grounds. HyperFrames' check does the layout, contrast and craft passes; this
// pass gives Video Studio's own checks (check.mjs) what they measure against `guides/rules.json`.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { findChrome, gpuArgs } from "./chrome.mjs";
import { HYPERFRAMES_ENV } from "./versions.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".lottie": "application/zip",
};

/** HyperFrames' installed package for a version, as npx keeps it (`{ dist, puppeteer }`), fetching it once if it's
    missing. The runtime and the browser driver come from the same version the project renders with. */
export function hyperframesPackage(version) {
  const cache = process.env.npm_config_cache || join(homedir(), ".npm");
  const find = () => {
    const npx = join(cache, "_npx");
    let dirs = [];
    try {
      dirs = readdirSync(npx);
    } catch {}
    for (const d of dirs) {
      const pkg = join(npx, d, "node_modules", "hyperframes");
      try {
        if (JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version === version && existsSync(join(pkg, "dist", "hyperframe.runtime.iife.js"))) return join(npx, d, "node_modules");
      } catch {}
    }
    return null;
  };
  let mods = find();
  if (!mods) {
    spawnSync("npx", ["--yes", `hyperframes@${version}`, "--version"], { stdio: "ignore", env: { ...process.env, ...HYPERFRAMES_ENV } });
    mods = find();
  }
  if (!mods) throw new Error(`HyperFrames ${version} isn't installed and couldn't be fetched (npx --yes hyperframes@${version}).`);
  const pup = join(mods, "puppeteer-core");
  return { dist: join(mods, "hyperframes", "dist"), puppeteer: existsSync(pup) ? createRequire(import.meta.url)(pup) : findChrome().puppeteer };
}

/** The project's folder on a local address, with HyperFrames' runtime put at the start of index.html's head. */
function serve(dir, runtime) {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (path === "/__video-studio/runtime.js") {
      res.writeHead(200, { "content-type": TYPES[".js"] });
      return res.end(runtime);
    }
    const file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
    if ((file !== root && !file.startsWith(root + sep)) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    if (file === join(root, "index.html")) {
      const html = readFileSync(file, "utf8").replace(/<head[^>]*>/i, (m) => `${m}<script src="/__video-studio/runtime.js"></script>`);
      res.writeHead(200, { "content-type": TYPES[".html"] });
      return res.end(html);
    }
    // media is asked for in ranges by the browser
    const size = statSync(file).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
      const buf = Buffer.alloc(end - start + 1);
      const fd = openSync(file, "r");
      readSync(fd, buf, 0, buf.length, start);
      closeSync(fd);
      return res.end(buf);
    }
    res.writeHead(200, { "content-type": type, "accept-ranges": "bytes", "content-length": size });
    res.end(readFileSync(file));
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

/** In the page: every block of words on screen now, and the large grounds. A block is the nearest box that isn't
    inline, so a line split into words or letters for its animation is still one line. Runs inside the browser. */
function measure({ w, h, captions, grounds }) {
  const S = (window.__vs ||= { ids: new WeakMap(), els: [], meta: {} });
  const area = w * h;
  const styleOf = new Map();
  const cs = (el) => {
    let s = styleOf.get(el);
    if (!s) styleOf.set(el, (s = getComputedStyle(el)));
    return s;
  };
  const idOf = (el) => {
    let id = S.ids.get(el);
    if (id) return id;
    id = S.els.push(el);
    S.ids.set(el, id);
    // what stays the same for the block: where it is in the files, and what kind of words it holds
    const host = (() => {
      let e = el.parentElement;
      while (e && !(e.hasAttribute("data-composition-id") && e.parentElement?.closest("[data-composition-id]"))) e = e.parentElement;
      return e;
    })();
    const comp = host?.getAttribute("data-composition-id") || "";
    // the shortest path up to an id that picks out this element alone
    const path = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id) {
        path.unshift(`#${CSS.escape(e.id)}`);
        break;
      }
      const tag = e.tagName.toLowerCase();
      const same = e.parentElement ? [...e.parentElement.children].filter((c) => c.tagName === e.tagName) : [e];
      path.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(e) + 1})` : tag);
      try {
        if (path.length > 1 && document.querySelectorAll(path.join(" > ")).length === 1) break;
      } catch {}
    }
    let unique = false;
    try {
      unique = document.querySelectorAll(path.join(" > ")).length === 1;
    } catch {}
    S.meta[id] = {
      selector: path.join(" > "),
      unique,
      own: el.id ? `#${el.id}` : "",
      comp,
      file: host?.getAttribute("data-composition-src") || "index.html",
      caption: Boolean(el.closest('[data-track-kind="captions"]')) || captions.some((c) => comp.startsWith(c)),
      ignore: Boolean(el.closest("[data-layout-ignore]")),
      bleed: Boolean(el.closest("[data-layout-allow-overflow],[data-layout-bleed]")),
      svg: el instanceof SVGElement,
    };
    return id;
  };
  // a block is a line as it's read: the nearest box that isn't inline, and a row of words or figures laid out as flex
  // items (each its own box) is one line; a single letter or digit (a rolling figure's) joins the row it sits in
  const isRow = (e) => /flex$/.test(cs(e).display) && !/column/.test(cs(e).flexDirection);
  const blockOf = (el) => {
    let b = el;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e instanceof SVGElement) {
        if (e.tagName.toLowerCase() === "text") return e;
        continue;
      }
      b = e;
      if (!/^inline/.test(cs(e).display) || e.hasAttribute("data-composition-id")) break;
    }
    if (b instanceof SVGElement) return b;
    if ((b.textContent || "").trim().length <= 2) {
      for (let e = b.parentElement, n = 0; e && e !== document.body && n < 4 && !e.hasAttribute("data-composition-id"); e = e.parentElement, n++)
        if (isRow(e)) {
          b = e;
          break;
        }
    }
    for (let p = b.parentElement; p && p !== document.body && !p.hasAttribute("data-composition-id") && isRow(p); p = p.parentElement) b = p;
    return b;
  };
  // how much of a box shows: in the frame, and inside every box that clips it
  const shown = (r, el) => {
    let x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(w, r.right), y1 = Math.min(h, r.bottom);
    for (let e = el.parentElement; e && e !== document.body && x1 > x0 && y1 > y0; e = e.parentElement) {
      const s = cs(e);
      if (s.overflow !== "visible" || s.overflowX !== "visible" || s.overflowY !== "visible") {
        const c = e.getBoundingClientRect();
        x0 = Math.max(x0, c.left), y0 = Math.max(y0, c.top), x1 = Math.min(x1, c.right), y1 = Math.min(y1, c.bottom);
      }
    }
    const full = Math.max(1, r.width * r.height);
    return x1 > x0 && y1 > y0 ? ((x1 - x0) * (y1 - y0)) / full : 0;
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e);
      if (s.visibility === "hidden" || s.display === "none") return 0;
      o *= Number(s.opacity);
      if (o < 0.05) return 0;
    }
    return o;
  };
  const scaleOf = (el) => {
    if (el instanceof SVGElement && el.getScreenCTM) {
      const m = el.getScreenCTM();
      if (m) return Math.hypot(m.a, m.b);
    }
    let k = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e instanceof SVGElement) continue;
      const s = cs(e);
      if (s.transform && s.transform !== "none") {
        const m = new DOMMatrix(s.transform);
        k *= Math.hypot(m.a, m.b);
      }
      if (s.scale && s.scale !== "none") k *= parseFloat(s.scale) || 1;
    }
    return k;
  };
  // a part on a new line, or set apart from the last, is a new word
  const append = (acc, words, r, el) => {
    const prev = acc.last;
    if (prev && !/\s$/.test(prev.text) && !/^\s/.test(words) && (r.top >= prev.bottom - 0.3 * (prev.bottom - prev.top) || r.left - prev.right > 0.25 * parseFloat(cs(el).fontSize))) acc.parts.push(" ");
    acc.last = { text: words, top: r.top, bottom: r.bottom, right: r.right };
    acc.parts.push(words);
  };
  const blocks = new Map();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.textContent;
    if (!text || !text.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest("script,style,template,noscript,title,head")) continue;
    const o = opacityOf(el);
    if (o < 0.5) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const frac = shown(r, el);
    if (frac < 0.5) continue;
    const s = cs(el);
    const px = parseFloat(s.fontSize) * scaleOf(el);
    const block = blockOf(el);
    const id = idOf(block);
    const b = blocks.get(id) || { id, parts: [], box: [Infinity, Infinity, -Infinity, -Infinity], chars: 0, sizes: [], inner: new Map() };
    const words = text.replace(/\s+/g, " ");
    append(b, words, r, el);
    // the elements inside the block that hold these words, each with its depth below the block: a planned word is
    // tested on the smallest one that holds it (a count's figure, not its row); one with no box of its own can't be
    const chain = [];
    for (let e = el; e && e !== block && e !== document.body; e = e.parentElement) if (cs(e).display !== "contents") chain.push(e);
    chain.forEach((e, i) => {
      const eid = idOf(e);
      if (!b.inner.has(eid)) b.inner.set(eid, { parts: [], depth: chain.length - i });
      append(b.inner.get(eid), words, r, el);
    });
    b.box = [Math.min(b.box[0], r.left), Math.min(b.box[1], r.top), Math.max(b.box[2], r.right), Math.max(b.box[3], r.bottom)];
    const chars = words.trim().length;
    b.chars += chars;
    b.sizes.push([px, chars]);
    const colour = el instanceof SVGElement ? s.fill : s.color;
    const family = (s.fontFamily || "").split(",")[0].trim().replace(/^["']|["']$/g, "");
    (b.colours ||= {})[colour] = (b.colours[colour] || 0) + chars;
    (b.families ||= {})[family] = (b.families[family] || 0) + chars;
    b.opacity = Math.max(b.opacity || 0, o);
    blocks.set(id, b);
  }
  const out = [];
  for (const b of blocks.values()) {
    const text = b.parts.join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    // the size most of its letters are set at
    const sorted = b.sizes.sort((x, y) => x[0] - y[0]);
    let half = b.chars / 2;
    let px = sorted[0][0];
    for (const [size, n] of sorted) {
      px = size;
      if ((half -= n) <= 0) break;
    }
    const els = [...b.inner].map(([eid, acc]) => [eid, acc.parts.join("").replace(/\s+/g, " ").trim(), acc.depth]).filter((e) => e[1]);
    out.push({ id: b.id, text, px: Math.round(px * 10) / 10, colours: b.colours, families: b.families, box: b.box.map((v) => Math.round(v)), ...(els.length ? { els } : {}) });
  }
  // large grounds: solid fills and gradients covering a quarter of the frame or more
  const fills = [];
  if (grounds) {
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("script,style,template,head")) continue;
      const svg = el instanceof SVGElement;
      if (svg && !/^(rect|path|circle|ellipse|polygon)$/i.test(el.tagName)) continue;
      const s = cs(el);
      const paint = svg ? s.fill : s.backgroundColor;
      const image = svg ? "none" : s.backgroundImage;
      const solid = paint && paint !== "none" && !/rgba\([^)]*,\s*0(\.0*)?\)$/.test(paint) && paint !== "transparent";
      const gradient = image && /gradient\(/.test(image);
      if (!solid && !gradient) continue;
      const r = el.getBoundingClientRect();
      const cover = (Math.max(0, Math.min(w, r.right) - Math.max(0, r.left)) * Math.max(0, Math.min(h, r.bottom) - Math.max(0, r.top))) / area;
      if (cover < 0.25 || opacityOf(el) < 0.5) continue;
      const colours = gradient ? (image.match(/rgba?\([^)]*\)/g) || []) : [paint];
      fills.push({ id: idOf(el), colours: colours.filter((c) => !/,\s*0\)$/.test(c)), cover: Math.round(cover * 100) / 100 });
    }
  }
  const meta = {};
  for (const id of [...out, ...fills].flatMap((b) => [b.id, ...(b.els || []).map((e) => e[0])])) if (!S.sent?.has(id)) meta[id] = S.meta[id];
  (S.sent ||= new Set());
  for (const id of Object.keys(meta)) S.sent.add(Number(id));
  return { blocks: out, fills, meta };
}

/** In the page: whether one block has started to show (any of its words in the frame, at opacity `min` or more). */
function blockShows({ id, w, h, min }) {
  const el = window.__vs?.els[id - 1];
  if (!el) return false;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.textContent.trim()) continue;
    let o = 1;
    for (let e = n.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.visibility === "hidden" || s.display === "none") o = 0;
      o *= Number(s.opacity);
    }
    if (o < min) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width >= 1 && r.right > 0 && r.bottom > 0 && r.left < w && r.top < h) return true;
  }
  return false;
}

/** In the page: how much of each box (a word HyperFrames' contrast pass measured) the cover clip at `slot` paints over
    now: the share of its probe points (HyperFrames' own, 5 across and 3 down) where the first thing painted, from the
    top, is the cover's, at half opacity or more. Every element is hit-tested while it runs, whatever its
    pointer-events, since a cover is often `pointer-events: none`. Runs inside the browser. */
function coverShare({ slot, boxes }) {
  const host = document.querySelector(slot);
  if (!host) return boxes.map(() => 0);
  const opacity = (el) => {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  };
  const paints = (el) => {
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return true;
    if (el instanceof SVGGeometryElement || el instanceof SVGTextContentElement || /^(IMG|VIDEO|CANVAS|IFRAME)$/.test(el.tagName)) return true;
    const s = getComputedStyle(el);
    const bg = /^rgba?\(([^)]+)\)$/.exec(s.backgroundColor);
    return s.backgroundImage !== "none" || (bg ? Number(bg[1].split(",")[3] ?? 1) > 0 : s.backgroundColor !== "transparent");
  };
  const style = document.createElement("style");
  style.textContent = "* { pointer-events: auto !important; }";
  document.head.appendChild(style);
  try {
    return boxes.map((b) => {
      let n = 0;
      let hits = 0;
      for (const cx of [0.05, 0.25, 0.5, 0.75, 0.95])
        for (const cy of [0.25, 0.5, 0.75]) {
          const x = b.x + b.width * cx;
          const y = b.y + b.height * cy;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          n++;
          for (const el of document.elementsFromPoint(x, y)) {
            if (el === document.documentElement || el === document.body) break;
            if (!paints(el) || opacity(el) <= 0.01) continue;
            if (host.contains(el) && opacity(el) >= 0.5) hits++;
            break;
          }
        }
      return n ? hits / n : 0;
    });
  } finally {
    style.remove();
  }
}

/** Open the film and sample it: every `step` seconds, and at `extra` times. `{ samples: [{ t, blocks, fills }], meta,
    duration, refine(id, from, to), covers(t, slot, boxes) }`; `close()` when done. */
export async function openFilm(dir, { version, width, height }) {
  const { dist, puppeteer } = hyperframesPackage(version);
  const server = await serve(dir, readFileSync(join(dist, "hyperframe.runtime.iife.js"), "utf8"));
  const { executablePath } = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--force-color-profile=srgb", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", "--mute-audio", ...gpuArgs()],
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(String(e?.message || e).slice(0, 300)));
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => window.__playerReady === true && window.__player, { timeout: 45000 });
    const duration = await page.evaluate(() => window.__player.getDuration());
    const seek = (t) =>
      page.evaluate(async (t) => {
        await window.__player.renderSeek(t);
        await new Promise((r) => requestAnimationFrame(() => r()));
      }, t);
    return {
      duration,
      errors,
      async sample(times, { captions = [], groundsEvery = 8 } = {}) {
        const samples = [];
        const meta = {};
        for (const [i, t] of times.entries()) {
          await seek(t);
          const s = await page.evaluate(measure, { w: width, h: height, captions, grounds: i % groundsEvery === 0 });
          Object.assign(meta, s.meta);
          samples.push({ t, blocks: s.blocks, fills: s.fills });
        }
        return { samples, meta };
      },
      /** When a block starts to show (opacity `min`, its entrance under way) between `from` (not yet) and `to`
          (showing), to about 1/100 s. */
      async refine(id, from, to, min = 0.1) {
        let lo = from;
        let hi = to;
        while (hi - lo > 0.01) {
          const mid = (lo + hi) / 2;
          await seek(mid);
          if (await page.evaluate(blockShows, { id, w: width, h: height, min })) hi = mid;
          else lo = mid;
        }
        return hi;
      },
      /** How much of each box the cover clip at `slot` (a selector) paints over at `t`, 0 to 1 (coverShare). */
      async covers(t, slot, boxes) {
        await seek(t);
        return page.evaluate(coverShare, { slot, boxes });
      },
      async close() {
        await browser.close().catch(() => {});
        server.close();
      },
    };
  } catch (err) {
    await browser.close().catch(() => {});
    server.close();
    throw new Error(`The film didn't load for Video Studio's checks: ${err.message}${errors.length ? ` (${errors[0]})` : ""}`);
  }
}
