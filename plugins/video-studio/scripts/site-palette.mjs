#!/usr/bin/env node
// A starting point for a brand kit: the colours, fonts and logo candidates a website uses.
//   node site-palette.mjs https://example.com
// Reads the page and up to 12 of its stylesheets; nothing is saved. Results are candidates for the user to confirm,
// not a brand guideline: counts show how often each value appears in the site's CSS.
const arg = process.argv[2];
if (!arg) {
  console.error("usage: site-palette.mjs <website url>");
  process.exit(1);
}
const start = new URL(/^https?:\/\//i.test(arg) ? arg : `https://${arg}`);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function get(url, limit = 3_000_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, redirect: "follow", signal: ctl.signal });
    if (!res.ok) return null;
    const text = await res.text();
    return { url: res.url, text: text.slice(0, limit) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const page = await get(start.href);
if (!page) {
  console.error(`Couldn't load ${start.href}`);
  process.exit(1);
}
const html = page.text;
const abs = (u) => {
  try {
    return new URL(u.replace(/&amp;/g, "&"), page.url).href;
  } catch {
    return null;
  }
};
const attr = (tag, name) => (new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag) || []).slice(2).find((v) => v != null) || "";

// stylesheets: linked, imported and inline
const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
const sheetUrls = links
  .filter((l) => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(l) || /as\s*=\s*["']?style/i.test(l))
  .map((l) => abs(attr(l, "href")))
  .filter(Boolean);
const fontLinks = sheetUrls.filter((u) => /fonts\.googleapis\.com|use\.typekit\.net|fonts\.bunny\.net/i.test(u));
const sheets = await Promise.all([...new Set(sheetUrls.filter((u) => !fontLinks.includes(u)))].slice(0, 12).map((u) => get(u)));
let css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
css += `\n${sheets.filter(Boolean).map((s) => s.text).join("\n")}`;
css += `\n${[...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(";\n")}`;

// colours
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
function toHex(raw) {
  const v = raw.trim().toLowerCase();
  let m;
  if ((m = /^#([0-9a-f]{3,8})$/.exec(v))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length === 8 && parseInt(h.slice(6), 16) < 77) return null; // mostly transparent
    return `#${h.slice(0, 6)}`;
  }
  if ((m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(v))) {
    const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a < 0.3) return null;
    return `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`;
  }
  if ((m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(v))) {
    const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a < 0.3) return null;
    const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
    const f = (n) => {
      const k = (n + h * 12) % 12;
      return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
    return `#${hex2(f(0))}${hex2(f(8))}${hex2(f(4))}`;
  }
  return null;
}
const colours = new Map();
const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
for (const m of css.matchAll(COLOUR)) {
  const h = toHex(m[0]);
  if (!h) continue;
  const c = colours.get(h) || { hex: h, count: 0, variables: [] };
  c.count++;
  colours.set(h, c);
}
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
  const h = toHex(m[2]);
  if (h && colours.has(h) && colours.get(h).variables.length < 6 && !colours.get(h).variables.includes(m[1])) colours.get(h).variables.push(m[1]);
}
const themeColour = toHex((/<meta[^>]+name\s*=\s*["']theme-color["'][^>]*>/i.exec(html) || [""])[0].replace(/.*content\s*=\s*["']([^"']+)["'].*/i, "$1"));

// fonts
const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "inherit", "initial", "unset", "-apple-system", "blinkmacsystemfont", "emoji", "math"]);
const fonts = new Map();
for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
  const fams = m[1].split(",").map((f) => f.trim().replace(/^["']|["']$/g, "").replace(/!important/i, "").trim()).filter((f) => f && !f.startsWith("var(") && !generic.has(f.toLowerCase()));
  fams.forEach((f, i) => {
    const e = fonts.get(f) || { family: f, count: 0, primary: 0, files: [] };
    e.count++;
    if (i === 0) e.primary++;
    fonts.set(f, e);
  });
}
for (const m of css.matchAll(/@font-face\s*{([^}]*)}/gi)) {
  const fam = /font-family\s*:\s*["']?([^;"']+)/i.exec(m[1])?.[1]?.trim();
  const src = /url\(\s*["']?([^"')]+)/i.exec(m[1])?.[1];
  if (!fam) continue;
  const e = fonts.get(fam) || { family: fam, count: 0, primary: 0, files: [] };
  if (src && e.files.length < 4) e.files.push(abs(src));
  fonts.set(fam, e);
}
const googleFamilies = fontLinks
  .filter((u) => /googleapis|bunny/.test(u))
  .flatMap((u) => [...new URL(u).searchParams.getAll("family")].map((f) => f.split(":")[0].replace(/\+/g, " ")));

// logos and icons
const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
const logoImgs = imgs.filter((t) => /logo/i.test(t)).map((t) => ({ src: abs(attr(t, "src") || attr(t, "data-src")), alt: attr(t, "alt") })).filter((l) => l.src);
const inlineSvgLogos = [...html.matchAll(/<svg\b[^>]*>/gi)].filter((m) => /logo/i.test(m[0])).length;
const icons = links.filter((l) => /rel\s*=\s*["']?[^"'>]*(icon|apple-touch-icon)/i.test(l)).map((l) => abs(attr(l, "href"))).filter(Boolean);
const ogImage = abs((/<meta[^>]+property\s*=\s*["']og:image["'][^>]*>/i.exec(html) || [""])[0].replace(/.*content\s*=\s*["']([^"']+)["'].*/i, "$1") || "");

console.log(
  JSON.stringify(
    {
      url: page.url,
      title: (/<title[^>]*>([^<]*)<\/title>/i.exec(html) || [])[1]?.trim() || null,
      themeColour,
      stylesheetsRead: sheets.filter(Boolean).length,
      colours: [...colours.values()].sort((a, b) => b.count - a.count).slice(0, 24),
      fonts: [...fonts.values()].sort((a, b) => b.primary - a.primary || b.count - a.count).slice(0, 10),
      fontServices: { google: [...new Set(googleFamilies)], links: fontLinks },
      logos: { images: logoImgs.slice(0, 8), inlineSvgLogos, icons: [...new Set(icons)].slice(0, 6), ogImage: ogImage || null },
    },
    null,
    2,
  ),
);
