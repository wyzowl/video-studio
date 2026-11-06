// A map of a built film's code (`studio.mjs map <video>`), so a change reads only the lines it touches: each file's
// blocks (its styles, markup and scripts) and the sections in them, with their line ranges; the clips and library
// items with their times in the film; and the sound cues.
// The build heads each scene's section with its id and time range, as a comment on a line of its own:
//   <!-- ── s03 11.86–21.25 s: the logo; the drop becomes the sensor -->     in markup
//   // ── s03 11.86–21.25 s: the logo; the drop becomes the sensor          in a script (or /* ── … */ in a style)
// Any other section it wants to find again (the camera, the world, the sound) is headed the same way, by name. A
// section runs to the next heading or the end of its block.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { libraryItems } from "./library.mjs";
import { readJSON } from "./studio.mjs";

// a comment alone on its line that starts with "──", or with a scene's id
const HEADING = /^\s*(?:<!--|\/\/|\/\*)\s*(?:──\s*|(?=s\d{2,}\b))(.*?)\s*(?:-->|\*\/)?\s*$/;
const OPENS = [
  [/<style\b[^>]*>(?!.*<\/style>)/i, "style", /<\/style>/i],
  [/<script\b(?![^>]*\bsrc=)[^>]*>(?!.*<\/script>)/i, "script", /<\/script>/i],
  [/<template\b[^>]*>(?!.*<\/template>)/i, "template", /<\/template>/i],
];

const attrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) if (m.index) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
};
const short = (s, n = 96) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const range = (a, b) => `${a}–${b}`;

/** A file's blocks ({ kind, from, to }) and its headed sections ({ name, scene, start, end, from, to, block }), by line
    number (from 1). Outside a style, script or template block, it's markup. */
export function fileSections(text) {
  const lines = text.split("\n");
  const blocks = [];
  const sections = [];
  let open = null;
  let markup = null;
  const close = (to) => {
    if (markup && to >= markup.from) blocks.push({ ...markup, to });
    markup = null;
  };
  lines.forEach((line, i) => {
    const n = i + 1;
    if (!open) {
      const o = OPENS.find(([re]) => re.test(line));
      if (o) {
        close(n - 1);
        open = { kind: o[1], from: n, end: o[2] };
        return;
      }
      if (!markup && line.trim()) markup = { kind: "markup", from: n };
    } else if (open.end.test(line)) {
      blocks.push({ kind: open.kind, from: open.from, to: n });
      open = null;
      return;
    }
    const h = HEADING.exec(line);
    if (h && h[1]) {
      const text = h[1].replace(/\s*-->\s*$/, "").trim();
      const t = /(\d+(?:\.\d+)?)\s*(?:s\s*)?[–-]\s*(\d+(?:\.\d+)?)/.exec(text);
      sections.push({ name: text, scene: /^(s\d{2,}[a-z]?)\b/.exec(text)?.[1] || null, start: t ? +t[1] : null, end: t ? +t[2] : null, from: n, block: open?.kind || "markup" });
    }
  });
  if (open) blocks.push({ kind: open.kind, from: open.from, to: lines.length });
  close(lines.length);
  // a section ends at the next heading, or the end of its block
  for (const [i, s] of sections.entries()) {
    const block = blocks.find((b) => b.from <= s.from && s.from <= b.to);
    const next = sections[i + 1];
    s.to = Math.min(block ? (block.kind === "markup" ? block.to : block.to - 1) : lines.length, next ? next.from - 1 : Infinity);
  }
  return { lines: lines.length, blocks, sections };
}

/** The clips in a file (each element with data-start): { id, tag, start, duration, track, src, role }. */
function clipsIn(text) {
  return [...text.matchAll(/<(div|section|video|audio|img|canvas|svg)\b[^>]*\bdata-start\s*=[^>]*>/gi)].map((m) => {
    const a = attrs(m[0]);
    return { id: a.id || "", tag: m[1].toLowerCase(), start: a["data-start"], duration: a["data-duration"] || "", track: a["data-track-index"] ?? "", src: a["data-composition-src"] || a.src || "", role: a["data-timeline-role"] || "", composition: a["data-composition-id"] || "" };
  });
}

/** `studio.mjs map <video>`: the map, as lines. */
export function filmMap(dir) {
  if (!existsSync(join(dir, "index.html"))) throw new Error(`${basename(dir)} has no index.html yet: the map is of a built film.`);
  const items = new Map(libraryItems().map((i) => [i.id, i]));
  const out = [];
  const root = attrs(/<[a-z]+[^>]*\bdata-composition-id\s*=[^>]*>/i.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[0] || "");
  out.push(`${basename(dir)}: ${root["data-duration"] || "?"} s at ${root["data-width"] || "?"}×${root["data-height"] || "?"}.`);

  const describe = (rel) => {
    const text = readFileSync(join(dir, rel), "utf8");
    const { lines, blocks, sections } = fileSections(text);
    out.push(`${rel} (${lines} lines)`);
    for (const b of blocks) {
      out.push(`  ${range(b.from, b.to).padEnd(10)} ${b.kind}`);
      for (const s of sections.filter((x) => x.from >= b.from && x.from <= b.to)) out.push(`    ${range(s.from, s.to).padEnd(10)} ${short(s.name)}`);
    }
    return { text, sections };
  };
  const index = describe("index.html");
  // the scene files, mapped as index.html is; the library's blocks, by name (they're the library's own code)
  const scenes = [];
  const compositions = existsSync(join(dir, "compositions")) ? readdirSync(join(dir, "compositions")).filter((n) => n.endsWith(".html")).sort() : [];
  const library = [];
  for (const name of compositions) {
    const item = items.get(name.replace(/\.html$/, ""));
    if (item) library.push(`${item.code} ${item.name}`);
    else scenes.push(`compositions/${name}`);
  }
  for (const rel of scenes) describe(rel);
  const shared = existsSync(join(dir, "assets", "film")) ? readdirSync(join(dir, "assets", "film")).filter((n) => /\.(js|mjs|css)$/.test(n)) : [];
  for (const name of shared) describe(`assets/film/${name}`);
  if (library.length) out.push(`compositions/: the library's ${library.join(", ")}`);
  if (!index.sections.some((s) => s.scene)) out.push("No scene is headed in index.html yet: head each scene's section with its id and time range (build skill), so a change finds it here.");

  // the clips, in the film's time: index.html's, and one level into each scene file (its own clips, from its host's start)
  const clips = clipsIn(index.text).filter((c) => c.composition !== "main");
  for (const c of [...clips]) {
    if (!c.src.startsWith("compositions/") || items.has(c.composition) || !existsSync(join(dir, c.src))) continue;
    for (const inner of clipsIn(readFileSync(join(dir, c.src), "utf8"))) {
      if (inner.composition === c.composition) continue;
      const start = Number(inner.start) + Number(c.start);
      clips.push({ ...inner, start: Number.isFinite(start) ? String(Math.round(start * 1000) / 1000) : `${c.start} + ${inner.start}`, in: c.src });
    }
  }
  const at = (c) => (Number.isFinite(Number(c.start)) ? Number(c.start) : Infinity);
  clips.sort((a, b) => at(a) - at(b));
  out.push("Clips, in the film's time:");
  for (const c of clips) {
    const item = items.get(c.composition);
    const end = Number(c.start) + Number(c.duration);
    const when = c.duration && Number.isFinite(end) ? `${c.start}–${Math.round(end * 1000) / 1000} s` : `${c.start} s${c.duration ? ` for ${c.duration}` : ""}`;
    const what = item ? `${item.code} ${item.name}` : c.tag === "audio" || c.tag === "video" ? `${c.tag} ${c.src}${c.role ? ` (${c.role})` : ""}` : c.src || c.tag;
    out.push(`  ${when.padEnd(16)} ${c.id ? `#${c.id}` : "(no id)"}  ${what}${c.track !== "" ? `, track ${c.track}` : ""}${c.in ? `, in ${c.in}` : ""}`);
  }

  // the sound cues the effects track is built from
  const cues = readJSON(join(dir, "assets", "audio", "sfx-cues.json"))?.cues;
  if (Array.isArray(cues) && cues.length) {
    out.push(`Sound cues (assets/audio/sfx-cues.json, ${cues.length}):`);
    for (const c of [...cues].sort((a, b) => a.at - b.at)) out.push(`  ${String(c.at).padStart(6)} s  ${c.sound || c.file || "?"}${c.note ? `  ${short(c.note, 60)}` : ""}`);
  }
  out.push("Read only the lines a change touches (Read with offset and limit), and edit them rather than rewriting a file.");
  return out;
}
