// The approved storyboard's frames brought into the film (`studio.mjs frames <video>`), so the build starts from the
// layouts the user approved and no scene is drawn twice. HyperFrames' headless Chrome opens the version's frames.html,
// as render-frames.mjs does, and reads every frame as it's drawn (its templates and scripts run). Then, scene by scene:
// - The scene's frames become one layer. An element the frames name (data-el="…", the same name in each frame it's
//   in) is one element in the film, and its state in each frame is noted in the scene's section of the script, where
//   its motion is written; an element drawn alike in several frames is kept once, and one that differs only in where
//   it is or how it looks (the same tag, classes and words) is taken as the same element. What only shows motion on a
//   still (data-motion: a trail, an arrow) is left out. The layer is laid out as the scene's key frame (data-layout,
//   or else the frame with most in it).
// - Each library item's still (an <img> from the version's items/) becomes the live item, with the settings the
//   storyboard drew it with (items.json, the list `library stills` made the stills from), from the time its frames show
//   it. The scene's layer is split around it, so what was drawn over the still draws over the item.
// - A transition's still puts it on the cut nearest where its frame says. One that moves both scenes (X05, X19) joins
//   the scenes either side: each goes in a plain wrapper, the two overlap for it (the later from its start, the earlier
//   for as long as it shows), and the clock's timeline calls it with the storyboard's settings. What's drawn after a
//   transition's still stays in the scene's own layer.
// The frames' styles, drawings (their SVG defs) and words come over as they are: their classes and ids take the film's
// prefix, their files' paths are the project's, their pictures become background-image divs (the HyperFrames app
// lists every <img> as a row of its own), and the version's frames.js (the storyboard's drawing functions) is the
// film's shared code. index.html gets a clock with a section per scene, headed with its id and times, for its motion.
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { findChrome, gpuArgs } from "./chrome.mjs";
import { BRAND_VARS, BUNDLED_FONTS, brandStyle, contentVariables, itemLayer, libraryItem, mediaSetting, sceneARuns } from "./library.mjs";
import { parseSize, readBrand, readBrief, readJSON, storyboardVersions, summariseFeedback } from "./studio.mjs";

// HTML elements with no end tag, and those whose text is kept as it is
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["style", "script"]);
// the families HyperFrames resolves by name, with no file (format.md, "Fonts")
const BUILT_IN = new Set(["Inter", "Montserrat", "Outfit", "Nunito", "Oswald", "League Gothic", "Archivo Black", "Space Mono", "IBM Plex Mono", "JetBrains Mono", "EB Garamond", "Playfair Display", "Source Code Pro", "Noto Sans JP", "Roboto", "Open Sans", "Lato", "Poppins"]);
// what makes two unnamed elements in different frames the same thing; the rest of an element is its state
const SAME = ["href", "xlink:href", "src", "d", "points"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const round = (n) => Math.round(n * 100) / 100;
const secs = (n) => `${round(n)}`;
const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const isEl = (n) => Boolean(n?.tag);
const classes = (n) => String(n?.a?.class || "").trim().split(/\s+/).filter(Boolean);
const textOf = (n) => (n.t !== undefined ? n.t : (n.c || []).map(textOf).join(""));
const hasNamed = (n) => (n.c || []).some((c) => isEl(c) && (c.a["data-el"] || hasNamed(c)));

/** Every frame as Chrome draws it: { frames: [{ id, a, c }], styles, defs, scripts }, each element as
    { tag, svg, a: attributes, c: children, raw (a style or script's text), box (an image's laid-out size), fit }. */
async function readFrames(file, size) {
  const { puppeteer, executablePath } = findChrome();
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files", ...gpuArgs()] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 0.25 });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true }) || img.addEventListener("error", r, { once: true })))));
    });
    return await page.evaluate(() => {
      const attrs = (el) => Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]));
      const node = (n) => {
        if (n.nodeType === 3) return { t: n.nodeValue };
        if (n.nodeType !== 1 || n.tagName === "TEMPLATE") return null;
        const svg = n.namespaceURI === "http://www.w3.org/2000/svg";
        const tag = svg ? n.tagName : n.tagName.toLowerCase();
        const out = { tag, svg, a: attrs(n) };
        if (tag.toLowerCase() === "style" || tag.toLowerCase() === "script") return { ...out, raw: n.textContent };
        if (!svg && tag === "img") {
          const cs = getComputedStyle(n);
          out.box = { w: n.offsetWidth, h: n.offsetHeight };
          out.fit = cs.objectFit;
          out.display = cs.display;
        }
        out.c = [...n.childNodes].map(node).filter(Boolean);
        return out;
      };
      const outside = (el) => !el.closest("[data-frame]");
      return {
        frames: [...document.querySelectorAll("[data-frame]")].map((f) => ({ id: f.getAttribute("data-frame"), a: attrs(f), c: [...f.childNodes].map(node).filter(Boolean) })),
        styles: [...document.querySelectorAll("style")].map((s) => s.textContent),
        defs: [...document.querySelectorAll("svg")].filter((s) => outside(s) && !s.parentElement.closest("svg")).map(node),
        scripts: [...document.scripts].map((s) => ({ src: s.getAttribute("src"), lines: s.getAttribute("src") ? 0 : s.textContent.trim().split("\n").length })),
      };
    });
  } finally {
    await browser.close();
  }
}

// ───────── merging a scene's frames ─────────

/** What makes an element the same thing in another frame: its name; else all of it; else its tag, classes, words and
    what it shows (an image, a path). */
const exact = (n) => JSON.stringify(n, (k, v) => (k === "box" || k === "fit" || k === "display" || k === "merged" ? undefined : k === "item" ? v?.code : k === "t" ? v.replace(/\s+/g, " ") : v));
function shape(n) {
  if (n.item) return `item:${n.item.code}`;
  const words = textOf(n).replace(/\s+/g, " ").trim().slice(0, 240);
  const what = SAME.map((k) => n.a[k] ?? "").join("|");
  return [n.tag, classes(n).sort().join("."), what, words || (n.c || []).filter(isEl).map((c) => c.tag).join(",")].join("¦");
}

const tagClass = (n) => `${n.tag}.${classes(n).sort().join(".")}`;

/** One scene's elements, merged across its frames: [{ node, frames: [id], from }] in drawing order, with the node
    taken from the key frame where it's there, else from the nearest frame that has it. `lists` is { frameId: [node] }
    in the frames' order. Named containers that hold named elements are merged inside too. */
function mergeLists(order, lists, key) {
  const dist = (id) => Math.abs(order.indexOf(id) - order.indexOf(key));
  const visit = [key, ...order.filter((id) => id !== key).sort((a, b) => dist(a) - dist(b) || order.indexOf(a) - order.indexOf(b))];
  const groups = [];
  for (const id of visit) {
    let prev = null;
    for (const n of lists[id] || []) {
      const name = n.a["data-el"];
      const free = (g) => !g.nodes[id];
      // last, the one element of its tag and classes in both frames is the same one, whatever's inside it
      const tc = tagClass(n);
      const only = (list, x) => list.filter((y) => !y.a["data-el"] && tagClass(y) === tagClass(x)).length === 1;
      const g =
        (name && groups.find((x) => free(x) && x.name === name)) ||
        (!name && groups.find((x) => free(x) && !x.name && x.exact === exact(n))) ||
        (!name && groups.find((x) => free(x) && !x.name && x.shape === shape(n))) ||
        (!name && !n.item && only(lists[id], n) && groups.find((x) => free(x) && !x.name && x.tc === tc && Object.entries(x.nodes).every(([f, y]) => only(lists[f], y))));
      if (g) g.nodes[id] = n;
      else {
        const made = { name, exact: exact(n), shape: shape(n), tc, nodes: { [id]: n } };
        // after what it was drawn over in its own frame; with nothing there, a frame before the key frame's goes under
        // everything, and a later one's on top (a scene that cuts to another shot)
        groups.splice(prev ? groups.indexOf(prev) + 1 : order.indexOf(id) < order.indexOf(key) ? 0 : groups.length, 0, made);
        prev = made;
        continue;
      }
      prev = g;
    }
  }
  return groups.map((g) => {
    const frames = order.filter((id) => g.nodes[id]);
    const from = visit.find((id) => g.nodes[id]);
    let node = g.nodes[from];
    const words = (x) => (x.c || []).some((c) => c.t !== undefined && c.t.trim());
    if (frames.length > 1 && frames.some((id) => hasNamed(g.nodes[id])) && !frames.some((id) => words(g.nodes[id]))) {
      const inner = mergeLists(order, Object.fromEntries(frames.map((id) => [id, g.nodes[id].c.filter(isEl)])), from);
      node = { ...node, c: inner.map((x) => x.node), merged: inner };
    }
    return { node, frames, from, nodes: g.nodes };
  });
}

/** A style attribute as { property: value }. */
const styleMap = (s) =>
  Object.fromEntries(
    String(s || "")
      .split(";")
      .map((d) => d.split(":"))
      .filter((d) => d.length > 1 && d[0].trim())
      .map(([k, ...v]) => [k.trim().toLowerCase(), v.join(":").trim()]),
  );

/** How an element in another frame differs from its layout: its style's properties and other attributes that
    differ, and whether what's inside it does. */
function difference(layout, other) {
  const out = [];
  const [a, b] = [styleMap(layout.a.style), styleMap(other.a.style)];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) out.push(b[k] === undefined ? `no ${k}` : `${k}:${b[k]}`);
  for (const k of new Set([...Object.keys(layout.a), ...Object.keys(other.a)])) {
    if (k === "style" || k === "data-el" || k === "data-layout") continue;
    if (layout.a[k] !== other.a[k]) out.push(`${k}="${other.a[k] ?? ""}"`);
  }
  if (exact({ ...layout, a: {} }) !== exact({ ...other, a: {} })) out.push("what's inside differs");
  return out.join("; ");
}

// ───────── the film's markup and styles ─────────

/** The rewriter for one film: the prefix on the frames' classes and ids, and their files' paths from the storyboard
    version's folder to the project's (a file of the version's own is copied into assets/frames/). */
function rewriter({ prefix, ids, versionDir, projectDir, copied }) {
  const p = `${prefix}-`;
  const url = (raw) => {
    const value = String(raw || "").trim();
    if (!value || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(value)) return value;
    const [path, rest = ""] = value.split(/(?=[?#])/);
    const abs = resolve(versionDir, decodeURI(path));
    let rel = relative(projectDir, abs).split(sep).join("/");
    if (rel.startsWith("..") || rel.startsWith("storyboard/")) {
      const inside = relative(versionDir, abs).split(sep).join("/");
      rel = `assets/frames/${inside.startsWith("..") ? basename(abs) : inside}`;
      if (existsSync(abs) && !copied.has(rel)) {
        mkdirSync(dirname(join(projectDir, rel)), { recursive: true });
        copyFileSync(abs, join(projectDir, rel));
        copied.add(rel);
      }
    }
    return encodeURI(rel) + rest;
  };
  const refs = (s) => String(s).replace(/url\(\s*(['"]?)#([\w-]+)\1\s*\)/g, (m, q, id) => (ids.has(id) ? `url(${q}#${p}${id}${q})` : m));
  const urls = (s) => refs(s).replace(/url\(\s*(['"]?)([^'")#][^'")]*)\1\s*\)/g, (m, q, u) => `url(${q || '"'}${url(u)}${q || '"'})`);
  // the frames' classes and ids take the prefix, then [data-frame] (a frame's box) is a scene's layers
  const selector = (sel) =>
    sel
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([.#])(-?[_a-zA-Z][\w-]*)/g, (m, str, sym, name) =>
        str ? str.replace(/#([\w-]+)/g, (mm, id) => (ids.has(id) ? `#${p}${id}` : mm)) : `${sym}${p}${name}`,
      )
      .replace(/\[data-frame(?:=(["']?)[^\]]*\1)?\]/g, `:is(.${p}scene, .${p}over)`)
      .replace(/(^|[\s>+~(,])img(?![\w-])/g, `$1:is(img, .${p}img)`);
  return { p, url, refs, urls, selector };
}

/** The frames' styles for the film: their rules with the prefix, [data-frame] (each frame's box) as each scene's
    layer (without the box's own size and margin), the page's own rules (html, body) left out, and paths moved. */
function filmStyles(css, rw) {
  const out = [];
  const walk = (text) => {
    const rules = [];
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) break;
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth) depth += text[j] === "{" ? 1 : text[j] === "}" ? -1 : 0, j++;
      const prelude = text.slice(i, open).trim();
      const body = text.slice(open + 1, j - 1);
      i = j;
      if (/^@(media|supports|container|layer)\b/i.test(prelude)) rules.push(`${prelude} {\n${walk(body)}\n}`);
      else if (/^@/.test(prelude)) rules.push(`${prelude} { ${rw.urls(body).trim()} }`);
      else {
        const sels = prelude
          .split(/,(?![^(]*\))/)
          .map((s) => s.trim())
          .filter((s) => s && !/^(html|body|:root\s+body)(\s*,\s*(html|body))*$/i.test(s));
        if (!sels.length) continue;
        let decls = rw.urls(body).trim();
        // a frame's own box: its size and spacing are the storyboard page's, not the film's
        if (sels.length === 1 && /^\[data-frame\]$/.test(sels[0])) decls = decls.split(";").filter((d) => !/^\s*(width|height|margin(-\w+)?|position)\s*:/i.test(d)).join(";").trim();
        rules.push(`${sels.map(rw.selector).join(", ")} { ${decls} }`);
      }
    }
    return rules.map((r) => `  ${r}`).join("\n");
  };
  for (const sheet of css) out.push(walk(sheet.replace(/\/\*[\s\S]*?\*\//g, "")));
  return out.filter(Boolean).join("\n");
}

/** An element as the film's markup: classes and ids with the prefix (a named element's id from its scene and name),
    paths moved, an <img> as a background-image div with its laid-out size. */
function markup(n, rw, scene, named) {
  if (n.t !== undefined) return esc(n.t);
  // a script in a frame drew the storyboard's still; the film draws from its own clock
  if (n.tag.toLowerCase() === "script") return "";
  const a = { ...n.a };
  delete a["data-motion"];
  delete a["data-layout"];
  let id = a.id ? `${rw.p}${a.id}` : null;
  if (a["data-el"]) {
    id ||= `${rw.p}${scene}-${a["data-el"]}`.replace(/[^\w-]/g, "-");
    named.set(a["data-el"], id);
    delete a["data-el"];
  }
  if (id) a.id = id;
  if (a.class) a.class = classes(n).map((c) => `${rw.p}${c}`).join(" ");
  for (const k of ["href", "xlink:href"]) if (a[k]?.startsWith("#")) a[k] = `#${rw.p}${a[k].slice(1)}`;
  for (const k of ["src", "poster"]) if (a[k]) a[k] = rw.url(a[k]);
  if (n.svg && a.href && !a.href.startsWith("#")) a.href = rw.url(a.href);
  for (const [k, v] of Object.entries(a)) if (/url\(/.test(v)) a[k] = k === "style" ? rw.urls(v) : rw.refs(v);
  let tag = n.tag;
  if (!n.svg && tag === "img") {
    // the app lists every <img> as a row: a picture is a div with the image as its background, at the same size
    const style = styleMap(a.style);
    const size = { cover: "cover", contain: "contain", none: "auto" }[n.fit] || "100% 100%";
    if (!style.width && n.box?.w) style.width = `${n.box.w}px`;
    if (!style.height && n.box?.h) style.height = `${n.box.h}px`;
    if (n.display === "inline" && !style.display) style.display = "inline-block";
    style.background = `url("${a.src}") center / ${size} no-repeat`;
    a.style = Object.entries(style).map(([k, v]) => `${k}:${v}`).join(";");
    a.class = [`${rw.p}img`, ...(a.class ? [a.class] : [])].join(" ");
    a.role = "img";
    if (a.alt) a["aria-label"] = a.alt;
    for (const k of ["src", "alt", "loading", "decoding", "srcset"]) delete a[k];
    tag = "div";
  }
  const open = `<${tag}${Object.entries(a).map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${escAttr(v)}"`)).join("")}`;
  if (n.raw !== undefined) return `${open}>${n.raw}</${tag}>`;
  if (!n.svg && VOID.has(tag) && tag !== "img") return `${open}>`;
  const kids = (n.c || []).map((c) => markup(c, rw, scene, named)).join("");
  if (n.svg && !kids) return `${open}/>`;
  return `${open}>${kids}</${tag}>`;
}

/** Every id the frames give, so references to them (href="#…", url(#…)) take the prefix with them. */
function idsIn(nodes, out = new Set()) {
  for (const n of nodes) {
    if (!isEl(n)) continue;
    if (n.a.id) out.add(n.a.id);
    idsIn(n.c || [], out);
  }
  return out;
}

// ───────── library items ─────────

/** The version's items.json (the list `library stills` drew the stills from), by each still's file. */
function readStills(versionDir) {
  const raw = readJSON(join(versionDir, "items.json"));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.stills) ? raw.stills : [];
  return new Map(list.filter((x) => x?.code && x.out).map((x) => [resolve(versionDir, x.out), x]));
}

/** Mark each item still in a frame (an <img> from items/): its item, the moment of it the still shows and its
    settings, from items.json, or else from its file's name (w03-….png). */
function markItems(nodes, { versionDir, stills, problems }) {
  for (const n of nodes) {
    if (!isEl(n)) continue;
    if (!n.svg && n.tag === "img" && n.a.src && !/^[a-z]+:/i.test(n.a.src)) {
      const file = resolve(versionDir, decodeURI(n.a.src.split(/[?#]/)[0]));
      const inItems = relative(join(versionDir, "items"), file);
      const listed = stills.get(file);
      if (listed || !inItems.startsWith("..")) {
        const code = listed?.code || /^([a-z])(\d{2})(?!\d)/i.exec(basename(file))?.slice(1).join("");
        const item = code && libraryItem(code);
        if (!item) problems.add(`${relative(versionDir, file)}: ${code ? `${code.toUpperCase()} isn't in the library on this Mac` : "not an item's still I can name"}, so it stays a picture`);
        else n.item = { code: item.code, item, at: Number.isFinite(+listed?.at) ? +listed.at : null, set: listed?.set || {}, listed: Boolean(listed) };
      }
    }
    if (n.c) markItems(n.c, { versionDir, stills, problems });
  }
}

/** Leave out what only shows motion on a still (data-motion), wherever it is in a frame; the count left out. */
function dropMotion(nodes) {
  let n = 0;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (!isEl(nodes[i])) continue;
    if (nodes[i].a["data-motion"] !== undefined) {
      nodes.splice(i, 1);
      n++;
    } else if (nodes[i].c) n += dropMotion(nodes[i].c);
  }
  return n;
}

/** Take the item stills out of a node's insides (an item drawn inside another element): they become live items too. */
function liftItems(n, found) {
  if (!n.c) return n;
  const c = [];
  for (const x of n.c) {
    if (x.item) found.push(x);
    else c.push(liftItems(x, found));
  }
  return { ...n, c };
}

/** A media setting from items.json (a file the still was drawn with) as a path in the project, where it is one. */
function mediaValue(value, { slug, versionDir, projectDir }) {
  const v = String(value ?? "");
  if (!v || /^(?:[a-z][\w+.-]*:|data:)/i.test(v)) return v;
  const inVideo = new RegExp(`^/videos/${slug}/`);
  if (inVideo.test(v)) return decodeURI(v.replace(inVideo, ""));
  for (const base of [versionDir, projectDir]) {
    const rel = relative(projectDir, resolve(base, v)).split(sep).join("/");
    if (!rel.startsWith("..") && existsSync(join(projectDir, rel))) return rel;
  }
  return v;
}

/** An item's clip values: its words and options' defaults, the brand's settings it uses, then the storyboard's own,
    and its duration (which must match the clip's). */
function itemValues(item, brand, set, duration, ctx) {
  const style = brandStyle(brand);
  const uses = (k) => item.template.includes(`--${k}`) || item.template.includes(`"${k}"`);
  const values = { ...Object.fromEntries(contentVariables(item).map((d) => [d.id, d.default])), ...Object.fromEntries(BRAND_VARS.filter(uses).map((k) => [k, style.vars[k]])) };
  for (const [k, v] of Object.entries(set || {})) {
    const d = item.variables.find((x) => x.id === k);
    if (!d) continue;
    values[k] = d.type === "number" ? Number(v) : mediaSetting(d) ? String(v ?? "").split("|").map((x) => mediaValue(x.trim(), ctx)).join("|") : v;
  }
  if (item.variables.some((d) => d.id === "duration")) values.duration = duration;
  return values;
}

/** The @font-face rules the items need that the film doesn't have yet: the brand kit's files (the project's copies in
    assets/fonts/, or copied there), or the plugin's bundled ones. */
function itemFonts(families, css, { brand, root, projectDir }) {
  const has = (f) => new RegExp(`@font-face\\s*{[^}]*font-family:\\s*["']?${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*[;}]`, "i").test(css);
  const faces = [];
  const missing = [];
  for (const family of families) {
    if (!family || BUILT_IN.has(family) || has(family)) continue;
    const own = (brand?.fonts || []).find((x) => x?.family === family && x.file);
    const src = own ? join(root, "brands", brand.slug, own.file) : BUNDLED_FONTS[family];
    if (!src || !existsSync(src)) {
      missing.push(family);
      continue;
    }
    const rel = `assets/fonts/${basename(src)}`;
    if (!existsSync(join(projectDir, rel))) {
      mkdirSync(join(projectDir, "assets", "fonts"), { recursive: true });
      copyFileSync(src, join(projectDir, rel));
    }
    const w = /wght\s*(\d+)\s*[–-]\s*(\d+)/.exec(own?.axes || "");
    faces.push(`  @font-face { font-family: "${family}"; src: url("${rel}") format("woff2"); ${w ? `font-weight: ${w[1]} ${w[2]}; ` : ""}}`);
  }
  return { faces, missing };
}

// ───────── the command ─────────

const UNBUILT = (text) => !/──\s*s\d{2}|data-composition-src|<audio|<video/.test(text);

/** `frames <video>`: index.html from the approved storyboard's frames, and the library items' blocks in compositions/.
    Options: `version` (the latest by default), `force` (replace an index.html that's already built, keeping it in
    docs/), `prefix` (the film's own classes and ids; the brand's first letter by default). */
export async function framesIntoFilm(at, { version = null, force = false, prefix = null } = {}) {
  const { root, slug, dir } = at;
  const versions = storyboardVersions(root, slug);
  const v = version || versions.at(-1);
  if (!v || !versions.includes(v)) return { code: 1, lines: [version ? `${slug} has no storyboard v${version}.` : `${slug} has no storyboard yet: frames brings an approved storyboard's frames into the film.`] };
  const versionDir = join(dir, "storyboard", `v${v}`);
  const sb = readJSON(join(versionDir, "storyboard.json"));
  const framesFile = join(versionDir, "frames.html");
  if (!sb || !existsSync(framesFile)) return { code: 1, lines: [`Storyboard v${v} has no ${sb ? "frames.html" : "storyboard.json"}.`] };
  const index = join(dir, "index.html");
  const before = existsSync(index) ? readFileSync(index, "utf8") : "";
  if (before && !UNBUILT(before) && !force) return { code: 1, lines: [`${slug}'s index.html is already built: frames starts a film, and never replaces one. With --force, it keeps the old one in docs/index.before-frames.html and starts again.`] };

  const brief = readBrief(root, slug);
  if (brief.type === "footage") return { code: 1, lines: [`${slug} is a footage video: its frames are stills from the footage, and its cut is built from the clips (guides/footage/build.md).`] };
  const brand = brief.brand && brief.brand !== "none" ? readBrand(root, brief.brand) : null;
  const size = parseSize(sb.size || brief.aspect || brief.size);
  const scenes = (sb.scenes || []).filter((s) => s?.id);
  const D = round(Math.max(Number(sb.duration) || 0, ...scenes.map((s) => +s.end || 0)));
  const lines = [];
  const review = summariseFeedback(sb, readJSON(join(versionDir, "feedback.json")));
  if (!review.allApproved) lines.push(`Storyboard v${v} isn't approved yet (${review.approved} of ${review.scenes} scenes${review.hasGeneral ? ", and general notes" : ""}): the build starts once every scene is.`);

  const drawn = await readFrames(framesFile, { w: size.w, h: size.h });
  if (!drawn.frames.length) return { code: 1, lines: [`frames.html has no [data-frame] elements.`] };
  // a frame drawn by a script that isn't there comes out empty: stop, rather than start a film with nothing in it
  const missing = drawn.scripts
    .filter((x) => x.src && !/^[a-z]+:|^\/\//i.test(x.src))
    .map((x) => x.src)
    .filter((src) => !existsSync(resolve(versionDir, decodeURI(src.split(/[?#]/)[0]))));
  if (missing.length)
    return { code: 1, lines: [`frames.html loads ${missing.length === 1 ? "a script that isn't" : "scripts that aren't"} in the project: ${missing.join(", ")}. The frames are drawn by ${missing.length === 1 ? "it" : "them"}, so without ${missing.length === 1 ? "it" : "them"} the film would start empty. Put ${missing.length === 1 ? "it" : "them"} back where frames.html looks (relative to storyboard/v${v}/), then run frames again.`] };
  const empty = drawn.frames.filter((f) => !f.c.some((n) => n.tag || (n.t || "").trim()));
  if (empty.length === drawn.frames.length) return { code: 1, lines: [`Every frame in frames.html came out empty (${empty.map((f) => f.id).join(", ")}): its drawing didn't run. Open storyboard v${v}'s page to see it fail, fix it, then run frames again.`] };
  const problems = new Set();
  const stills = readStills(versionDir);
  let motionMarks = 0;
  for (const f of drawn.frames) {
    motionMarks += dropMotion(f.c);
    markItems(f.c, { versionDir, stills, problems });
  }

  const ids = idsIn([...drawn.defs, ...drawn.frames.flatMap((f) => f.c)]);
  const copied = new Set();
  const p = (prefix || brand?.slug || slug)[0].toLowerCase().replace(/[^a-z]/, "f");
  const rw = rewriter({ prefix: p, ids, versionDir, projectDir: dir, copied });
  const css = filmStyles(drawn.styles, rw);
  const frameTime = new Map(scenes.flatMap((s) => (s.frames || []).map((f) => [basename(String(f.src || ""), ".png"), +f.time])));
  const sceneOf = (frameId) => scenes.find((s) => frameId === s.id || frameId.startsWith(`${s.id}-`));

  // each library item's block, copied once a use; a second use of an item is a copy under its own id
  const uses = new Map();
  const blocks = [];
  const recipes = new Map();
  const useItem = (item) => {
    const k = (uses.get(item.id) || 0) + 1;
    uses.set(item.id, k);
    const id = k === 1 ? item.id : `${item.id}-${k}`;
    const file = join(dir, "compositions", `${id}.html`);
    if (!existsSync(file)) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, k === 1 ? readFileSync(item.file, "utf8") : readFileSync(item.file, "utf8").split(item.id).join(id));
      blocks.push(`compositions/${id}.html`);
    }
    return id;
  };

  // a transition's cut is a cut between two scenes: where its still says (its frame's time, less how far into it the
  // still is, plus its own cut), put on the nearest scene's start (frames are drawn for their scene, not the cut)
  const cutOf = (it, t, scene) => (Number.isFinite(t) && it.at !== null ? t - it.at + (Number(it.item.cut) || 0) : +scene.start || 0);
  const cutNear = (t) => scenes.slice(1).reduce((x, y) => (!x || Math.abs(+y.start - t) < Math.abs(+x.start - t) ? y : x), null) || scenes[0];
  // the transitions that move both scenes, from their stills: each joins the scenes either side of its cut, and the
  // two overlap for it, the later from the transition's start and the earlier for as long as it shows (library X05,
  // X19)
  const joins = [];
  const stillsIn = (nodes, out = []) => {
    for (const n of nodes) {
      if (!isEl(n)) continue;
      if (n.item) out.push(n.item);
      if (n.c) stillsIn(n.c, out);
    }
    return out;
  };
  for (const scene of scenes)
    for (const f of drawn.frames.filter((x) => sceneOf(x.id) === scene))
      for (const it of stillsIn(f.c).filter((x) => x.item.category === "transitions" && x.item.recipe)) {
        const { item } = it;
        const k = scenes.findIndex((x) => x.id === cutNear(cutOf(it, frameTime.get(f.id), scene)).id);
        if (k < 1) {
          problems.add(`${item.code} is in ${scene.id}'s frames, but there's no cut between two scenes for it to join: it's left out`);
          continue;
        }
        const [a, b] = [scenes[k - 1], scenes[k]];
        if (joins.some((j) => j.b === b.id)) {
          if (!joins.some((j) => j.b === b.id && j.item.id === item.id)) problems.add(`two transitions that move both scenes are on the cut into ${b.id}: only ${joins.find((j) => j.b === b.id).item.code} joins it`);
          continue;
        }
        const cut = round(+b.start || 0);
        const said = cutOf(it, frameTime.get(f.id), scene);
        if (Math.abs(said - cut) > 0.25) problems.add(`${item.code}'s still in ${f.id} puts its cut at ${secs(said)} s: it's on the cut into ${b.id}, at ${secs(cut)} s`);
        const from = round(Math.max(0, cut - (Number(item.cut) || 0)));
        const values = itemValues(item, brand, it.set, Number(item.length) || 1, { slug, versionDir, projectDir: dir });
        const keep = item.variables.some((d) => d.id === "keep") ? Math.max(0, Number(values.keep) || 0) : 0;
        joins.push({ item, values, from, cut, until: round(Math.min(D, Math.max(cut, from + sceneARuns(item, keep)))), a: a.id, b: b.id });
      }
  const joinIn = (id) => joins.find((j) => j.b === id);
  const joinOut = (id) => joins.find((j) => j.a === id);
  const isTransition = (it) => it.item.category === "transitions";

  const markupParts = [];
  const scriptParts = [];
  const families = new Set();
  const covers = [];
  let track = 2;
  const summary = [];
  const shown = new Set();

  for (const scene of scenes) {
    const frames = drawn.frames.filter((f) => sceneOf(f.id) === scene);
    const into = joinIn(scene.id);
    const outOf = joinOut(scene.id);
    const start = round(Math.min(+scene.start || 0, into ? into.from : Infinity));
    const end = round(Math.min(D, Math.max(+scene.end || D, outOf ? outOf.until : 0)));
    const head = `${scene.id} ${secs(start)}–${secs(end)} s: ${String(scene.title || "").replace(/-->/g, "")}`;
    const joined = [into && `${into.item.code} brings it in from ${secs(into.from)} s, the cut at ${secs(into.cut)} s`, outOf && `it runs on under ${outOf.item.code} to ${secs(outOf.until)} s`].filter(Boolean);
    if (!frames.length) {
      problems.add(`${scene.id} has no frames in frames.html, so its layer is empty`);
      markupParts.push(`  <!-- ── ${head} -->`, `  <section id="${p}-${scene.id}" class="clip ${p}-scene" data-start="${start}" data-duration="${round(end - start)}" data-track-index="0" data-track-kind="graphics"></section>`);
      scriptParts.push(`    // ── ${head}`, `    function ${scene.id.replace(/\W/g, "_")}(t) {}`);
      continue;
    }
    for (const f of frames) shown.add(f.id);
    const order = frames.map((f) => f.id);
    const lists = {};
    for (const f of frames) {
      lists[f.id] = f.c.filter((n) => isEl(n) && !RAW.has(n.tag));
    }
    const marked = frames.find((f) => f.a["data-layout"] !== undefined);
    const key = marked ? marked.id : [...order].sort((a, b) => lists[b].length - lists[a].length || order.indexOf(b) - order.indexOf(a))[0];
    const keyFrame = frames.find((f) => f.id === key);
    const merged = mergeLists(order, lists, key);
    // what isn't in the key frame waits, unseen, for its moment: the film's still state is the key frame itself (each
    // group keeps its layout as drawn, `shown`, to say how the other frames differ from it)
    const hide = (n) => ({ ...n, a: { ...n.a, style: [n.a.style, "opacity:0"].filter(Boolean).join(";") } });
    for (const g of merged) {
      g.shown = g.node;
      if (!g.frames.includes(key)) g.node = hide(g.node);
      else if (g.node.merged) g.node = { ...g.node, c: g.node.c.map((c, i) => (g.node.merged[i].frames.includes(key) ? c : hide(c))) };
    }

    // the layers: the scene's own, then each item, with what was drawn over its still in a layer of its own above it;
    // a transition's still is no layer: it plays over the scene (a block) or moves the scene's own (a recipe), so what's
    // drawn after it stays where it is
    const layers = [{ nodes: [] }];
    const nested = [];
    let current = layers[0];
    for (const g of merged) {
      if (g.node.item) {
        layers.push({ item: g });
        if (!isTransition(g.node.item)) layers.push((current = { over: g.node.item.code, nodes: [] }));
        continue;
      }
      const found = [];
      const node = liftItems(g.node, found);
      for (const x of found) nested.push({ item: { ...g, node: x, nodes: Object.fromEntries(Object.keys(g.nodes).map((id) => [id, x])), inside: g.node } });
      current.nodes.push({ ...g, node });
    }
    layers.splice(1, 0, ...nested);

    // what moves gets an id to move it by: its name in the frames, or else its first class (or its tag)
    const taken = new Set();
    for (const layer of layers)
      for (const g of layer.nodes || []) {
        const moves = g.frames.length < order.length || g.frames.some((id) => id !== g.from && difference(g.shown || g.node, g.nodes[id]));
        if (g.node.a["data-el"] || g.node.a.id || !moves) continue;
        const stem = (classes(g.node)[0] || g.node.tag).toLowerCase().replace(/[^\w-]/g, "");
        let name = stem;
        for (let k = 2; taken.has(name); k++) name = `${stem}-${k}`;
        taken.add(name);
        g.node = { ...g.node, a: { ...g.node.a, "data-el": name } };
      }

    const named = new Map();
    const parts = [`  <!-- ── ${head} (storyboard frames ${order.join(", ")}; laid out as ${key}${joined.map((x) => `; ${x}`).join("")}) -->`];
    const notes = [];
    const placed = [];
    const label = (n) => (n.a["data-el"] ? `#${named.get(n.a["data-el"])}` : describe(n));
    layers.forEach((layer, i) => {
      if (layer.item) {
        const { node, frames: inFrames } = layer.item;
        const it = node.item;
        const item = it.item;
        const cover = item.category === "transitions";
        const known = inFrames
          .map((id) => {
            const still = layer.item.nodes[id]?.item || it;
            const t = frameTime.get(id);
            return Number.isFinite(t) && still.at !== null ? t - still.at : null;
          })
          .filter((x) => x !== null);
        // with no moment for its still, an item starts with its scene; a transition's cut is the nearest cut to where
        // its still says (or to its scene's start)
        const said = known.length ? Math.min(...known) + (Number(item.cut) || 0) : +scene.start || 0;
        const from = cover ? round(Math.max(0, +cutNear(said).start - (Number(item.cut) || 0))) : round(Math.max(0, known.length ? Math.min(...known) : start));
        if (cover && !item.recipe && Math.abs(said - (from + (Number(item.cut) || 0))) > 0.25) problems.add(`${item.code}'s still puts its cut at ${secs(said)} s: it's on the cut at ${secs(from + (Number(item.cut) || 0))} s`);
        if (cover && item.recipe) {
          recipes.set(item.id, item);
          const j = joins.find((x) => x.item.id === item.id && (x.a === scene.id || x.b === scene.id));
          notes.push(
            j
              ? `${item.code} ${item.name} takes ${j.a} into ${j.b} from ${secs(j.from)} s: called on the clock's timeline (below), with both scenes in their wrappers (library ${item.code})`
              : `${item.code} ${item.name} moves both scenes: ${joins.some((x) => x.item.id === item.id) ? "called on the clock's timeline (below), on the cut nearest its still" : "left out, with no cut between two scenes for it"} (library ${item.code})`,
          );
          return;
        }
        const id = useItem(item);
        const length = round(Math.min(D - from, cover ? Number(item.length) || 1 : Math.max(0.5, end - from)));
        const values = itemValues(item, brand, it.set, length, { slug, versionDir, projectDir: dir });
        for (const k of ["fontDisplay", "fontBody", "fontLabel"]) if (values[k]) families.add(String(values[k]).replace(/^"|"$/g, ""));
        const json = JSON.stringify(values).replace(/'/g, "&#39;");
        const clip = `<div id="${id}-slot" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${from}" data-duration="${length}" data-track-index="${cover ? 9 : track++}" data-track-kind="graphics" data-width="${size.w}" data-height="${size.h}"\n    data-variable-values='${json}'></div>`;
        const inside = layer.item.inside;
        const where = inside ? `; its still was drawn inside ${describe(inside)}, so set its place with its options` : "";
        const settings = it.listed ? "the storyboard's settings" : "its own settings (its still isn't in items.json)";
        placed.push(`${item.code} ${secs(from)}–${secs(from + length)} s`);
        notes.push(`#${id}-slot: ${item.code} ${item.name} (${itemLayer(item)}), ${secs(from)}–${secs(from + length)} s, with ${settings}${known.length ? "" : "; no moment for its still, so from the scene's start"}${where}`);
        (cover ? covers : parts).push(`  ${clip}`);
        return;
      }
      const base = i === 0;
      if (!base && !layer.nodes.length) return;
      const lid = base ? `${p}-${scene.id}` : `${p}-${scene.id}-over-${layer.over.toLowerCase()}`;
      const cls = base ? ["clip", `${p}-scene`, ...classes(keyFrame).map((c) => `${p}-${c}`)] : ["clip", `${p}-over`];
      const style = base && keyFrame.a.style ? ` style="${escAttr(rw.urls(keyFrame.a.style))}"` : "";
      const inner = layer.nodes.map((g) => `    ${markup(g.node, rw, scene.id, named)}`).join("\n");
      parts.push(`  <section id="${lid}" class="${cls.join(" ")}"${style} data-start="${start}" data-duration="${round(end - start)}" data-track-index="${base ? 0 : 1}" data-track-kind="graphics">`, inner, "  </section>");
      if (!base) notes.push(`#${lid}: what the frames draw over ${layer.over}`);
      for (const g of layer.nodes)
        for (const m of [g, ...(g.node.merged || [])]) {
          if (m !== g && !m.node.a["data-el"]) continue;
          const only = m.frames.length < order.length ? [`only in ${m.frames.join(", ")}${m.frames.includes(key) ? "" : " (hidden in the layout)"}`] : [];
          const diffs = m.frames.filter((id) => id !== m.from).map((id) => [id, difference(m.shown || m.node, m.nodes[id])]).filter(([, d]) => d);
          if (only.length || diffs.length) notes.push(`${label(m.node)}: ${[...only, ...diffs.map(([id, d]) => `${id} ${d}`)].join(" · ")}`);
        }
    });
    const grounds = [...new Set(frames.map((f) => f.a.class || ""))];
    if (grounds.length > 1) notes.push(`the frames' grounds: ${frames.map((f) => `${f.id} ${f.a.class ? `.${classes(f).join(".")}` : "none"}`).join(", ")} (the layer has ${key}'s)`);
    // a scene a join moves is in a plain wrapper, its layers and items inside, which the transition moves whole
    if (into || outOf) parts.splice(1, parts.length - 1, `  <div id="${p}-${scene.id}-wrap" class="${p}-wrap">`, ...parts.slice(1), "  </div>");
    markupParts.push(...parts);

    const when = order.map((id) => `${id}${Number.isFinite(frameTime.get(id)) ? ` at ${secs(frameTime.get(id))} s` : ""}${id === key ? " (the layout)" : ""}`).join(", ");
    scriptParts.push(
      `    // ── ${head}`,
      `    // The storyboard's frames: ${when}. Where they differ from the layout:`,
      ...(notes.length ? notes : ["nothing: one layout, still in every frame"]).map((n) => `    //   ${n.replace(/\n/g, " ")}`),
      `    function ${scene.id.replace(/\W/g, "_")}(t) {`,
      `    }`,
      "",
    );
    const moving = [...named.values()];
    summary.push(`- ${scene.id} ${secs(start)}–${secs(end)} s: ${plural(order.length, "frame")}, laid out as ${key}${moving.length ? `; ${moving.map((x) => `#${x}`).join(", ")}` : ""}${placed.length ? `; ${placed.join(", ")}` : ""}`);
  }
  const unshown = drawn.frames.filter((f) => !shown.has(f.id)).map((f) => f.id);
  if (unshown.length) problems.add(`frames that no scene in storyboard.json has, left out: ${unshown.join(", ")}`);

  // the recipes for transitions that move both scenes: their layer and script, once each
  const recipeParts = [];
  for (const item of recipes.values()) {
    const inner = /<template>([\s\S]*)<\/template>/.exec(readFileSync(item.file, "utf8"))?.[1] || "";
    recipeParts.push(`<!-- ── ${item.code} ${item.name}: the library's recipe, called on the clock's timeline (library ${item.code}) -->`, inner.trim());
  }

  const fonts = itemFonts(families, css, { brand, root, projectDir: dir });
  if (fonts.missing.length) problems.add(`no font file for ${fonts.missing.join(", ")}, which the items name: add it to the brand kit`);
  // the storyboard's drawing code (frames.js) is the film's shared code, in assets/film/ (format.md, "Scene files")
  const shared = [];
  for (const { src } of drawn.scripts.filter((x) => x.src && !/^[a-z]+:|^\/\//i.test(x.src))) {
    const file = resolve(versionDir, decodeURI(src.split(/[?#]/)[0]));
    if (!existsSync(file)) continue;
    const rel = `assets/film/${basename(file)}`;
    mkdirSync(join(dir, "assets", "film"), { recursive: true });
    copyFileSync(file, join(dir, rel));
    shared.push(rel);
  }
  const drawing = drawn.scripts.filter((s) => !s.src && s.lines > 3);
  // GSAP from the project's own copy where it has one (HyperFrames uses its own copy for the jsDelivr link otherwise)
  const gsapTag =
    /<script\s+src="[^"]*gsap[^"]*"><\/script>/i.exec(before)?.[0] ||
    (existsSync(join(dir, "assets", "vendor", "gsap.min.js")) ? `<script src="assets/vendor/gsap.min.js"></script>` : `<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>`);
  const sprite = drawn.defs.map((d) => markup({ ...d, a: { ...d.a, "aria-hidden": "true", width: "0", height: "0", style: "position:absolute;width:0;height:0;overflow:hidden" } }, rw, "defs", new Map())).join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8" />',
    `<meta name="viewport" content="width=${size.w}, height=${size.h}" />`,
    gsapTag,
    ...shared.map((src) => `<script src="${src}"></script>`),
    "<style>",
    `  /* ── the film */`,
    `  html, body { margin: 0; width: ${size.w}px; height: ${size.h}px; overflow: hidden; background: #000; }`,
    "  #root { position: relative; width: 100%; height: 100%; overflow: hidden; }",
    "  .clip { position: absolute; inset: 0; }",
    `  .${p}-scene, .${p}-over { position: absolute; inset: 0; overflow: hidden; }`,
    ...(joins.length ? [`  .${p}-wrap { position: absolute; inset: 0; }`] : []),
    ...fonts.faces,
    `  /* ── the storyboard's styles (storyboard v${v}, frames.html) */`,
    css,
    `  /* what's drawn over an item is see-through, like the still it was drawn on */`,
    `  .${p}-over { background: none; }`,
    "</style>",
    "</head>",
    "<body>",
    sprite,
    `<div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${size.w}" data-height="${size.h}" data-motion-blur="on" data-motion-blur-events="on">`,
    ...markupParts,
    ...(covers.length ? ["  <!-- ── the transitions over the cuts -->", ...covers] : []),
    "</div>",
    ...recipeParts,
    "<script>",
    `  // ── the clock: render(t) draws every scene from the time alone, on one paused timeline (format.md, "A project")`,
    "  document.fonts.ready.then(() => {",
    `    const D = ${D};`,
    "    const $ = (id) => document.getElementById(id);",
    "    // a 0–1 progress through [at, at + d], and an ease applied to one",
    "    const P = (t, at, d) => Math.max(0, Math.min(1, (t - at) / d));",
    "    const eases = {};",
    "    const E = (name, p) => (eases[name] || (eases[name] = gsap.parseEase(name)))(Math.max(0, Math.min(1, p)));",
    "",
    ...scriptParts,
    "    // ── the clock",
    `    function render(t) {`,
    ...scenes.map((s) => `      ${s.id.replace(/\W/g, "_")}(t);`),
    "    }",
    "    const tl = gsap.timeline({ paused: true });",
    "    const clock = { _t: 0 };",
    '    Object.defineProperty(clock, "t", { get() { return this._t; }, set(v) { this._t = v; render(v); } });',
    "    tl.fromTo(clock, { t: 0 }, { t: D, duration: D, ease: \"none\" }, 0);",
    ...joins.flatMap((j) => [
      `    // ── ${j.item.code} ${j.item.name}: ${j.a} into ${j.b} from ${secs(j.from)} s, the cut at ${secs(j.cut)} s, ${j.a} on to ${secs(j.until)} s (library ${j.item.code})`,
      `    window.StudioTransitions[${JSON.stringify(j.item.id)}](tl, { at: ${secs(j.from)}, a: "#${p}-${j.a}-wrap", b: "#${p}-${j.b}-wrap", vars: ${JSON.stringify(j.values)} });`,
    ]),
    "    render(0);",
    '    window.__timelines["main"] = tl;',
    "    if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();",
    "  });",
    "</script>",
    "</body>",
    "</html>",
    "",
  ].join("\n");

  const seen = new Map();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  const twice = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  if (twice.length) problems.add(`ids used more than once (the frames gave them in several scenes): ${twice.join(", ")}: give each its own`);

  if (before && !UNBUILT(before)) {
    mkdirSync(join(dir, "docs"), { recursive: true });
    renameSync(index, join(dir, "docs", "index.before-frames.html"));
  }
  writeFileSync(index, html);

  const count = drawn.frames.length - unshown.length;
  lines.unshift(`index.html: storyboard v${v}'s ${plural(scenes.length, "scene")} from ${plural(count, "frame")}, ${secs(D)} s at ${size.w}×${size.h}, the film's classes and ids prefixed ${p}-.`);
  lines.push(...summary);
  for (const j of joins) lines.push(`${j.item.code} ${j.item.name} joins ${j.a} and ${j.b}: each in a plain wrapper (#${p}-${j.a}-wrap, #${p}-${j.b}-wrap), overlapping for it (${j.b} from ${secs(j.from)} s, ${j.a} to ${secs(j.until)} s, the cut at ${secs(j.cut)} s), and called on the clock's timeline at ${secs(j.from)} s with the storyboard's settings.`);
  if (blocks.length) lines.push(`Library blocks copied: ${blocks.join(", ")}.`);
  if (copied.size) lines.push(`The storyboard's own files, copied into assets/frames/: ${[...copied].map((f) => f.replace(/^assets\/frames\//, "")).join(", ")}.`);
  if (shared.length) lines.push(`The storyboard's drawing code, loaded as the film's: ${shared.join(", ")} (functions only: anything it draws as it loads, it draws into the film too).`);
  if (drawing.length) lines.push(`frames.html draws with a script of its own (${plural(drawing.reduce((n, s) => n + s.lines, 0), "line")}): the film has what it drew; its functions are there if a move needs them.`);
  if (motionMarks) lines.push(`Left out: ${plural(motionMarks, "motion mark")} (data-motion).`);
  for (const x of problems) lines.push(`Note: ${x}.`);
  lines.push(
    `Next: each scene's motion in its section of the script, to its plan (studio.mjs map ${slug} lists them, with what each frame changes), and the items' words, cues and media (build skill, "Library items").`,
  );
  return { code: 0, lines };
}

/** An unnamed element, in a few words: its tag and classes, or its words. */
function describe(n) {
  const words = textOf(n).replace(/\s+/g, " ").trim();
  const cls = classes(n);
  return `${n.tag}${cls.length ? `.${cls.join(".")}` : ""}${words ? ` “${words.length > 24 ? `${words.slice(0, 23)}…` : words}”` : ""}`;
}

