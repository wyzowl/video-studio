// The library: widgets, layouts, text effects, transitions and data. Each item is a HyperFrames block, one HTML file in
// the plugin's library/<category>/ folder. Its <template> is a sub-composition whose words, options and brand settings
// are HyperFrames variables, and its <head> carries a note for the studio (code, name, category, what it's for). The
// studio plays each block live in any brand and size, on a plain dark stand-in for footage: a person's silhouette,
// never real footage.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { PLUGIN_ROOT, contrast } from "./studio.mjs";
import { CATEGORIES } from "./categories.mjs";
import { PAID_DIR, catalogue } from "./paid.mjs";

export { CATEGORIES };

export const LIBRARY_ROOT = join(PLUGIN_ROOT, "library");

export const SIZES = {
  "16x9": { w: 1920, h: 1080, label: "16:9" },
  "1x1": { w: 1080, h: 1080, label: "1:1" },
  "4x5": { w: 1080, h: 1350, label: "4:5" },
  "9x16": { w: 1080, h: 1920, label: "9:16" },
};

/** The variables every block shares, filled from the brand kit. The rest are the item's own words and options. */
export const BRAND_VARS = ["card", "ink", "muted", "line", "accent", "onAccent", "onVideo", "fontDisplay", "fontBody", "fontLabel", "radius", "ease"];

/** The fonts the plugin bundles (ui/fonts), for the studio's own style and any brand without a label font, and Caveat
    for items set in handwriting (D72). */
export const BUNDLED_FONTS = {
  Inter: join(PLUGIN_ROOT, "ui", "fonts", "InterVariable-latin.woff2"),
  "JetBrains Mono": join(PLUGIN_ROOT, "ui", "fonts", "JetBrainsMono-latin.woff2"),
  Caveat: join(PLUGIN_ROOT, "ui", "fonts", "Caveat-Medium.ttf"),
};

/** The studio's own style, for previews without a brand. */
export const STUDIO_STYLE = {
  card: "#F6F3EA",
  ink: "#1E1E1E",
  muted: "#5F5E5B",
  line: "#CBC8C1",
  accent: "#F9B336",
  onAccent: "#1E1E1E",
  onVideo: "#F6F3EA",
  fontDisplay: '"Inter"',
  fontBody: '"Inter"',
  fontLabel: '"JetBrains Mono"',
  radius: "16px",
  ease: "power3.inOut",
};

// The stand-in for footage: a dark ground and a person's silhouette (head and shoulders), drawn in a 1000 × 1100 box
export const STAND_IN = { ground: "#1D2024", figure: "#33373E" };
export const PERSON_PATH =
  "M500 40C590 40 665 110 668 230C671 330 640 410 585 452L583 540C700 560 820 600 880 660C935 715 965 800 975 1100L25 1100C35 800 65 715 120 660C180 600 300 560 417 540L415 452C360 410 329 330 332 230C335 110 410 40 500 40Z";

// ───────── items ─────────

let cache = { key: "", items: [], broken: [] };
const byCode = (a, b) => a.code.localeCompare(b.code, "en", { numeric: true });

/** Every item there is to use, free and (once a licence has unlocked them) paid, in code order; with a category, just
    its items. Re-read whenever a file changes. */
export function libraryItems(category) {
  const files = [];
  for (const [root, paid] of [
    [LIBRARY_ROOT, false],
    [PAID_DIR, true],
  ]) {
    for (const c of Object.keys(CATEGORIES)) {
      let names = [];
      try {
        names = readdirSync(join(root, c));
      } catch {}
      for (const n of names) if (n.endsWith(".html")) files.push({ file: join(root, c, n), paid });
    }
  }
  const key = files.map((f) => `${f.file}:${statSync(f.file).mtimeMs}`).join("|");
  if (key !== cache.key) {
    const read = files.map((f) => ({ ...readItem(f.file), ...(f.paid ? { paid: true, free: false } : {}) }));
    const items = [];
    for (const item of read.filter((i) => !i.error).sort(byCode)) if (!items.some((i) => i.code === item.code)) items.push(item);
    cache = { key, items, broken: read.filter((i) => i.error) };
  }
  return category ? cache.items.filter((i) => i.category === category) : cache.items;
}

/** The paid items this Mac hasn't unlocked: their notes from the catalogue, with the preview video that stands in for
    them. With a category, just its items. */
export function lockedItems(category) {
  const have = new Set(libraryItems().map((i) => i.code));
  return catalogue()
    .items.filter((i) => i && i.code && Object.hasOwn(CATEGORIES, i.category) && !have.has(i.code) && (!category || i.category === category))
    .map((i) => ({ ...i, free: false, paid: true, locked: true }))
    .sort(byCode);
}

/** Any item by its code, locked or not: the library's pages show both. */
export function findItem(code) {
  const c = String(code || "").toLowerCase();
  return libraryItem(code) || lockedItems().find((i) => i.code.toLowerCase() === c) || null;
}

/** Files in a category's folder that couldn't be read as items, with why: shown on its page, so a mistake isn't
    silent. */
export function brokenItems(category) {
  libraryItems();
  return cache.broken.filter((b) => !category || b.file.includes(`${join("library", category)}/`));
}

export function libraryItem(code) {
  return libraryItems().find((i) => i.code.toLowerCase() === String(code || "").toLowerCase()) || null;
}

/** A block file → { code, name, category, summary, use, motion, free, backdrop, preview, variables, id, recipe, template,
    file }, or { file, error } when it can't be read. Transitions also note their kind ("cover" or "both"), cut and
    length. The paid library's publish script reads its items with this too. */
export function readItem(file) {
  const src = readFileSync(file, "utf8");
  const part = (re, what) => {
    const m = re.exec(src);
    if (!m) throw new Error(`it has no ${what}`);
    return m[1];
  };
  try {
    const meta = JSON.parse(part(/<script type="application\/json" id="studio-item">([\s\S]*?)<\/script>/, "studio-item note in its head"));
    let variables;
    try {
      variables = JSON.parse(part(/data-composition-variables='([\s\S]*?)'/, "data-composition-variables"));
    } catch (err) {
      throw new Error(`its data-composition-variables aren't valid JSON (an apostrophe in a label ends the attribute): ${err.message}`);
    }
    const template = part(/<template>([\s\S]*)<\/template>/, "<template>");
    // a block is a sub-composition; a transition that moves both scenes is a recipe for the main timeline instead
    const block = /data-composition-id="([^"]+)"/.exec(template)?.[1];
    const recipe = /data-transition-id="([^"]+)"/.exec(template)?.[1];
    const id = block || recipe;
    if (!id) throw new Error("its template has no data-composition-id (or, for a transition recipe, data-transition-id)");
    const category = Object.hasOwn(CATEGORIES, meta.category) && CATEGORIES[meta.category];
    if (!meta.code || !category) throw new Error(`its note needs a code and a category (${Object.keys(CATEGORIES).join(", ")})`);
    if (!meta.code.startsWith(category.letter)) throw new Error(`its code, ${meta.code}, should start with ${category.letter}, the letter for ${category.title.toLowerCase()}`);
    if (basename(dirname(file)) !== meta.category) throw new Error(`its note says it's in ${meta.category}, but it's in the ${basename(dirname(file))} folder`);
    if (meta.category === "transitions" && !(Number(meta.cut) >= 0 && Number(meta.length) > 0)) throw new Error("a transition's note needs its cut and length (seconds)");
    return { ...meta, variables, id, recipe: !block, template, file, mtime: statSync(file).mtimeMs };
  } catch (err) {
    return { file, error: err.message };
  }
}

/** The item's own variables (words and options), without the brand ones. */
export const contentVariables = (item) => item.variables.filter((v) => !BRAND_VARS.includes(v.id));

/** How an item sits in the frame, so items can be layered: "over footage" (transparent, it goes over whatever is
    behind it: widgets, captions and other words over the picture), "full frame" (it fills the frame itself: layouts,
    data and full-screen words, a scene's base) or "between scenes" (transitions). */
export function itemLayer(item) {
  if (item.category === "transitions") return "between scenes";
  return item.backdrop === "presenter" ? "over footage" : "full frame";
}

// ───────── brand style ─────────

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const isDark = (hex) => contrast(hex, "#ffffff") > contrast(hex, "#1e1e1e");
const quote = (family) => `"${String(family).replace(/["\\]/g, "")}"`;

function mix(a, b, t) {
  const rgb = (h) => {
    const x = h.replace("#", "");
    const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  const [p, q] = [rgb(a), rgb(b)];
  return `#${p.map((v, i) => Math.round(v * t + q[i] * (1 - t)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** A brand kit → the block variables that dress an item in it, and the @font-face rules its fonts need. Brand kits
    can set style.card, style.radius and style.labelFont; the rest comes from their colours, fonts and motion. */
export function brandStyle(brand) {
  if (!brand) return { name: "Studio style", vars: { ...STUDIO_STYLE }, faces: "" };
  const cs = (Array.isArray(brand.colours) ? brand.colours : []).filter((c) => HEX.test(c?.hex || ""));
  const role = (re) => cs.find((c) => re.test(c.role || "")) || cs.find((c) => re.test(c.name || ""));
  const style = brand.style && typeof brand.style === "object" ? brand.style : {};
  const background = role(/^(background|ground|paper)$/i) || role(/background/i);
  const card = HEX.test(style.card || "") ? style.card : background?.hex || "#FFFFFF";
  const text = role(/^(text|ink|body text|copy)$/i) || cs.find((c) => /text/i.test(c.role || "") && !/secondary|muted/i.test(c.role || ""));
  const ink = text && contrast(text.hex, card) >= 4.5 ? text.hex : isDark(card) ? "#FFFFFF" : "#1E1E1E";
  const secondary = role(/secondary|muted|subtle/i);
  const muted = secondary && contrast(secondary.hex, card) >= 3 ? secondary.hex : mix(ink, card, 0.7);
  const accent = (role(/accent/i) || role(/highlight|action|primary/i))?.hex || ink;
  const onAccent = [ink, card, "#FFFFFF", "#1E1E1E"].sort((a, b) => contrast(b, accent) - contrast(a, accent))[0];
  const onVideo = !isDark(card) ? card : !isDark(ink) ? ink : "#FFFFFF";

  const fonts = Array.isArray(brand.fonts) ? brand.fonts.filter((f) => f?.family) : [];
  const font = (re) => fonts.find((f) => re.test(f.role || ""));
  const display = font(/display|heading|headline|title/i) || fonts[0];
  const body = font(/body|text|copy|paragraph/i) || display;
  const label = style.labelFont ? { family: style.labelFont } : font(/label|mono|caption|eyebrow/i);
  const easing = Array.isArray(brand.motion?.easing) ? brand.motion.easing : [];
  const travel = easing.find((e) => /travel|draw|move/i.test(e.use || "") && /^[\w.()-]+$/.test(e.ease || ""));

  const faces = fonts
    .filter((f) => f.file)
    .map((f) => `@font-face { font-family: ${quote(f.family)}; src: url("/brands/${encodeURIComponent(brand.slug)}/${String(f.file).split("/").map(encodeURIComponent).join("/")}"); font-weight: 1 1000; font-display: block; }`)
    .join("\n");
  return {
    name: brand.name || brand.slug,
    vars: {
      card,
      ink,
      muted,
      line: mix(ink, card, 0.2),
      accent,
      onAccent,
      onVideo,
      fontDisplay: display ? quote(display.family) : STUDIO_STYLE.fontDisplay,
      fontBody: body ? quote(body.family) : STUDIO_STYLE.fontBody,
      fontLabel: label ? quote(label.family) : STUDIO_STYLE.fontLabel,
      radius: /^\d+(\.\d+)?px$/.test(String(style.radius || "")) ? style.radius : STUDIO_STYLE.radius,
      ease: travel?.ease || STUDIO_STYLE.ease,
    },
    faces,
  };
}

// ───────── preview ─────────

/** Where the stand-in presenter stands for a widget: opposite the card at 16:9, centred at the other sizes. */
function personBox(size, side) {
  const { w, h } = SIZES[size];
  const height = { "16x9": 1000, "1x1": 930, "4x5": 1150, "9x16": 1350 }[size];
  const width = (height * 1000) / 1100;
  const centre = size === "16x9" ? (side === "right" ? 660 : 1260) : w / 2;
  return { left: Math.round(centre - width / 2), top: h - height, width: Math.round(width), height };
}

const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

/** A transition's preview: where scene A's stand-in presenter stands (centred, like a shot to camera), the middle of
    their face (where an iris opens), and the screen in scene B's stand-in device (where a pull-back lands, in the
    video's shape). */
function sceneBox(size) {
  const { w, h } = SIZES[size];
  const height = { "16x9": 1000, "1x1": 930, "4x5": 1150, "9x16": 1350 }[size];
  const width = (height * 1000) / 1100;
  return { left: Math.round(w / 2 - width / 2), top: h - height, width: Math.round(width), height };
}
function facePoint(size) {
  const b = sceneBox(size);
  return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + (b.height * 250) / 1100) };
}
// The screen sits in the middle of the frame, so a pull back goes straight back
const DEVICE = {
  "16x9": { kind: "laptop", x: 480, y: 270, w: 960, r: 8 },
  "1x1": { kind: "frame", x: 280, y: 280, w: 520, r: 0 },
  "4x5": { kind: "phone", x: 300, y: 375, w: 480, r: 36 },
  "9x16": { kind: "phone", x: 330, y: 587, w: 420, r: 40 },
};

/** The two scenes a transition joins, as plain stand-ins: A is the dark ground with the silhouette; B is a simple chart
    in the brand (or, for a pull-back, a device whose screen A lands in). */
function standInScenes(item, size) {
  const { w, h } = SIZES[size];
  const p = sceneBox(size);
  // "scenes": "accent" puts both on the brand's colour, for a transition that carries that colour from A into B
  const on = item.preview?.scenes === "accent" ? " on-accent" : "";
  const a = `<div class="scene${on}" id="scene-a"><svg viewBox="0 0 1000 1100" style="left:${p.left}px;top:${p.top}px;width:${p.width}px;height:${p.height}px" aria-hidden="true"><path d="${PERSON_PATH}" fill="${STAND_IN.figure}"/></svg></div>`;
  let inside;
  if (item.preview?.sceneB === "device") {
    const d = DEVICE[size];
    const sh = (d.w * h) / w;
    const box = (x, y, bw, bh, r, cls) => `<i class="${cls}" style="left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;border-radius:${r}"></i>`;
    if (d.kind === "laptop") {
      // L07's laptop, scaled to the screen: an 18 px bezel, and a base 120 px wider than the lid (for a 1144 px screen)
      const k = d.w / 1144;
      const [bezel, lidW, lidH] = [18 * k, d.w + 36 * k, sh + 36 * k];
      const px = (...n) => n.map((x) => `${+x.toFixed(1)}px`).join(" ");
      inside =
        box(d.x - bezel, d.y - bezel, lidW, lidH, px(28 * k, 28 * k, 10 * k, 10 * k), "lid") +
        box(d.x - bezel - 60 * k, d.y - bezel + lidH, lidW + 120 * k, 30 * k, px(4 * k, 4 * k, 26 * k, 26 * k), "base") +
        box(d.x, d.y, d.w, sh, `${d.r}px`, "glass");
    }
    else if (d.kind === "frame") inside = box(d.x - 26, d.y - 26, d.w + 52, sh + 52, "4px", "body") + box(d.x, d.y, d.w, sh, "0", "glass");
    else inside = box(d.x - 18, d.y - 18, d.w + 36, sh + 36, `${d.r + 18}px`, "body") + box(d.x, d.y, d.w, sh, `${d.r}px`, "glass");
  } else if (item.preview?.sceneB === "blank") {
    // just B's background, for a transition that draws B's layout itself in the preview
    inside = "";
  } else {
    // a chart in the data items' layout: an eyebrow, a two-line title and five bars, the first in the accent
    const box = { "16x9": [264, 128, 1392], "1x1": [156, 140, 768], "4x5": [156, 172, 768], "9x16": [156, 260, 768] }[size];
    const k = size === "16x9" ? 1 : 0.8;
    const bars = [72, 64, 51, 40, 30].map((pc, i) => `<i class="bar${i ? "" : " key"}" style="width:${pc}%;height:${Math.round(40 * k)}px"></i>`).join("");
    inside = `<div class="chart" style="left:${box[0]}px;top:${box[1]}px;width:${box[2]}px;gap:${Math.round(28 * k)}px"><i class="eyebrow" style="height:${Math.round(18 * k)}px"></i><i class="title" style="height:${Math.round(44 * k)}px"></i><i class="title short" style="height:${Math.round(44 * k)}px"></i><div class="bars" style="gap:${Math.round(22 * k)}px;margin-top:${Math.round(60 * k)}px">${bars}</div></div>`;
  }
  return `${a}<div class="scene${on}" id="scene-b" style="visibility:hidden">${inside}</div>`;
}

/** A page that plays one item on its own, scaled to fit, looping: the library shows these in frames. `at` holds a
    still at that time instead. `vars` sets any of the item's variables (otherwise its "preview" values, then its
    defaults, with the brand's settings). `bg: "none"` leaves out the stand-in and the dark ground, for a transparent
    still to lay over a storyboard frame. A transition plays between two stand-in scenes: a block (one that covers the
    cut) over them, with the cut swapping A for B; a recipe (one that moves both scenes) called on the page's timeline,
    as a video's main timeline would. */
export function previewDocument(item, { brand = null, size = "16x9", at = null, vars = {}, bg = "" } = {}) {
  const S = SIZES[size] || SIZES["16x9"];
  const fmt = size in SIZES ? size : "16x9";
  const style = brandStyle(brand);
  const values = Object.fromEntries(item.variables.map((d) => [d.id, d.default]));
  Object.assign(values, item.preview || {}, style.vars, vars);
  const transition = item.category === "transitions";
  if (transition && item.preview?.point === "face" && vars.pointX == null && vars.pointY == null) {
    const f = facePoint(fmt);
    Object.assign(values, { pointX: f.x, pointY: f.y });
  }
  if (transition && item.preview?.sceneB === "device" && vars.screenX == null) {
    const d = DEVICE[fmt];
    Object.assign(values, { screenX: d.x, screenY: d.y, screenWidth: d.w, screenRadius: d.r });
  }
  // brand settings set by hand are CSS values: only plain ones are taken
  const css = { ...style.vars };
  for (const k of BRAND_VARS) if (typeof vars[k] === "string" && /^[#\w\s"'.,()%+-]*$/.test(vars[k])) css[k] = vars[k];
  const custom = BRAND_VARS.map((k) => `--${k}: ${css[k]};`).join(" ");
  const clear = bg === "none";
  const ground = clear ? "transparent" : STAND_IN.ground;
  // media given as variables: their files, as HyperFrames binds them (data-var-src)
  const template = item.template.replace(/data-var-src="(\w+)"/g, (whole, k) =>
    typeof vars[k] === "string" && vars[k] ? `${whole} src="${vars[k].replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`)}"` : whole,
  );
  const side = values.side === "right" ? "right" : "left";
  const p = personBox(fmt, side);
  const backdrop =
    item.backdrop === "presenter" && !clear
      ? `<div class="backdrop"><svg viewBox="0 0 1000 1100" style="left:${p.left}px;top:${p.top}px;width:${p.width}px;height:${p.height}px" aria-hidden="true"><path d="${PERSON_PATH}" fill="${STAND_IN.figure}"/></svg></div>`
      : "";
  const scenes = transition && !clear ? standInScenes(item, fmt) : "";
  // a transition's preview: scene A, the transition at 0.9 s, then scene B (longer when A lands on B's screen)
  const play = transition ? { at: 0.9, cut: Number(item.cut) || 0, length: Number(item.length) || 1, after: item.preview?.sceneB === "device" ? 1.8 : 1.2, recipe: Boolean(item.recipe) } : null;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${item.code} ${item.name} · preview</title>
<style>
@font-face { font-family: "Inter"; src: url("/ui/fonts/InterVariable-latin.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "JetBrains Mono"; src: url("/ui/fonts/JetBrainsMono-latin.woff2") format("woff2"); font-weight: 100 800; font-display: block; }
@font-face { font-family: "Caveat"; src: url("/ui/fonts/Caveat-Medium.ttf") format("truetype"); font-weight: 400 700; font-display: block; }
${style.faces}
html, body { margin: 0; height: 100%; overflow: hidden; background: ${ground}; }
#stage { position: absolute; left: 0; top: 0; width: ${S.w}px; height: ${S.h}px; transform-origin: 0 0; overflow: hidden; background: ${ground}; }
#stage .backdrop { position: absolute; inset: 0; }
#stage .backdrop svg { position: absolute; }
#stage .slot { position: absolute; inset: 0; }
#stage #${item.id} { ${custom} }
#stage .scene { position: absolute; inset: 0; overflow: hidden; ${custom} }
#stage #scene-a { background: ${STAND_IN.ground}; }
#stage #scene-a svg { position: absolute; }
#stage #scene-b { background: var(--card); }
#stage #scene-b i { position: absolute; display: block; }
#stage #scene-b .body { background: var(--ink); }
#stage #scene-b .lid { background: #1e1e1e; }
#stage #scene-b .base { background: #383a3f; }
#stage #scene-b .glass { background: ${STAND_IN.ground}; }
#stage #scene-b .chart { position: absolute; display: flex; flex-direction: column; }
#stage #scene-b .chart i { position: static; }
#stage #scene-b .chart .eyebrow { width: 22%; background: var(--muted); opacity: 0.55; }
#stage #scene-b .chart .title { width: 78%; background: var(--ink); }
#stage #scene-b .chart .title.short { width: 46%; }
#stage #scene-b .chart .bars { display: flex; flex-direction: column; border-left: 2px solid var(--ink); }
#stage #scene-b .chart .bar { background: var(--ink); }
#stage #scene-b .chart .bar.key { background: var(--accent); }
#stage #scene-a.on-accent, #stage #scene-b.on-accent { background: var(--accent); }
#stage #scene-b.on-accent .chart .eyebrow,
#stage #scene-b.on-accent .chart .title,
#stage #scene-b.on-accent .chart .bar { background: var(--onAccent); }
#stage #scene-b.on-accent .chart .bars { border-left-color: var(--onAccent); }
#stage #scene-b.on-accent .chart .bar.key { background: var(--card); }
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines = {};
window.__hyperframes = { getVariables: () => (${json(values)}) };
</script>
</head>
<body>
<div id="stage">${backdrop}${scenes}<div class="slot">
${template}
</div></div>
<script>
(() => {
  const ID = ${json(item.id)};
  const W = ${S.w}, H = ${S.h};
  const AT = ${at == null || !Number.isFinite(+at) ? "null" : +at};
  const PLAY = ${json(play)};
  const stage = document.getElementById("stage");
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = "translate(" + (innerWidth - W * s) / 2 + "px," + (innerHeight - H * s) / 2 + "px) scale(" + s + ")";
  };
  fit();
  addEventListener("resize", fit);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tl = null, timer = null, paused = false;
  const loop = () => { if (tl && !paused) tl.play(0); };
  // a transition plays inside a longer timeline: scene A, the transition, then scene B; at a block's cut, A gives way
  // to B, as their clips would in a video
  function between(child) {
    const t = gsap.timeline({ paused: true });
    const A = document.getElementById("scene-a");
    const B = document.getElementById("scene-b");
    if (A && B) {
      t.set(B, { visibility: "visible" }, PLAY.at + (PLAY.recipe ? 0 : PLAY.cut));
      if (!PLAY.recipe) t.set(A, { visibility: "hidden" }, PLAY.at + PLAY.cut);
    }
    if (child) t.add(child.paused(false), PLAY.at);
    else if (window.StudioTransitions && window.StudioTransitions[ID]) window.StudioTransitions[ID](t, { at: PLAY.at, a: A, b: B, vars: window.__hyperframes.getVariables() });
    t.set({}, {}, PLAY.at + PLAY.length + PLAY.after);
    return t;
  }
  (function ready() {
    const own = window.__timelines[ID];
    if (!own && !(PLAY && PLAY.recipe)) return void setTimeout(ready, 50); // blocks register once their fonts have loaded
    tl = PLAY ? between(own) : own;
    tl.eventCallback("onComplete", () => { timer = setTimeout(loop, 900); });
    // a still seeks with events on, as HyperFrames does, so counters and other per-frame updates land
    const hold = (t) => { tl.pause(); tl.seek(t, false); };
    // for the paid library's publish script, which takes each locked item's stills at the moment that shows it best
    window.__studioPreview = { duration: () => tl.duration(), seek: hold, cut: PLAY ? PLAY.at + PLAY.cut : null };
    if (AT != null) hold(Math.min(AT, tl.duration()));
    else if (still) hold(PLAY ? PLAY.at + PLAY.cut : tl.duration() * 0.45);
    else loop();
    document.documentElement.dataset.ready = "1";
  })();
  addEventListener("message", (e) => {
    if (e.data === "pause") { paused = true; clearTimeout(timer); if (tl) tl.pause(); }
    if (e.data === "play" && paused && AT == null && !still) { paused = false; if (tl) tl.progress() >= 1 ? loop() : tl.play(); }
    if (e.data === "replay") { paused = false; clearTimeout(timer); if (tl) tl.play(0); }
  });
})();
</script>
</body>
</html>`;
}
