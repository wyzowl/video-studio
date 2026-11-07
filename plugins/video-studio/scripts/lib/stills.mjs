// Stills of a built film at given moments, on one sheet, without a render (`studio.mjs stills <video> --at 3,10.5`):
// HyperFrames' snapshot draws each moment as the render would, and the sheet code (lib/sheet.mjs) lays them out, each
// labelled with its time and scene, at a size that's read without shrinking. One image to read for a look at what
// changed while building, instead of a still at a time.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { attrs } from "./check.mjs";
import { fileSections } from "./map.mjs";
import { drawSheets, sheetTime } from "./sheet.mjs";
import { readJSON } from "./studio.mjs";
import { HYPERFRAMES_ENV, HYPERFRAMES_VERSION } from "./versions.mjs";

// the widest a sheet is read without shrinking (lib/sheet.mjs), less its edges
const ACROSS_WIDTH = 1568 - 12;

/** `HF snapshot` of these times into `out`: [{ path, time }]. */
function snapshot(dir, version, times, out) {
  const args = ["--yes", `hyperframes@${version}`, "snapshot", "--at", times.join(","), "--no-end", "--describe", "false", "--json", "-o", out];
  return new Promise((done, fail) => {
    const child = spawn("npx", args, { cwd: dir, env: { ...process.env, ...HYPERFRAMES_ENV }, stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    let err = "";
    child.stdout.on("data", (c) => (text += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", fail);
    child.on("close", () => {
      try {
        const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        if (j.ok === false || !Array.isArray(j.frames)) throw new Error(j.error || "no frames");
        done(j.frames);
      } catch (e) {
        fail(new Error(`HyperFrames' snapshot made no stills: ${(err.trim().split("\n").filter((l) => l && !/^\[/.test(l)).pop() || e.message).slice(0, 300)}`));
      }
    });
  });
}

/** `stills <video> --at <times>`: the sheet(s) in docs/review/ and the lines that say where. */
export async function filmStills(root, slug, { at, width = 0 }) {
  const dir = join(root, "videos", slug);
  const index = join(dir, "index.html");
  if (!existsSync(index)) throw new Error(`${slug} isn't built yet: stills are of the film's code.`);
  const html = readFileSync(index, "utf8");
  const r = attrs(/<[a-z]+[^>]*\bdata-composition-id\s*=[^>]*>/i.exec(html)?.[0] || "");
  const length = Number(r["data-duration"]) || Infinity;
  const times = [...new Set(at.filter((t) => Number.isFinite(t) && t >= 0 && t < length).map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);
  if (!times.length) throw new Error(`Give the moments as --at 3,10.5,18: seconds of the film, from 0 to under ${length} s.`);
  if (times.length > 24) throw new Error("24 stills at most on a sheet: take the rest in another.");
  const pkg = readJSON(join(dir, "package.json"));
  const version = /hyperframes@([0-9][\w.-]*)/.exec(pkg?.scripts?.check || pkg?.scripts?.render || "")?.[1] || HYPERFRAMES_VERSION;
  const frames = await snapshot(dir, version, times, join(".hyperframes", "artifacts", "snapshots", "stills"));
  // each still's scene, from the headings the build gives each scene's section; where two overlap for a transition,
  // the later, which draws on top
  const scenes = fileSections(html).sections.filter((s) => s.scene && s.start !== null);
  const sceneAt = (t) => scenes.filter((s) => s.start <= t && t < s.end).sort((a, b) => b.start - a.start)[0]?.scene;
  // across: two of a wide frame, four of a tall one (fewer when there are fewer), so each is big enough to judge
  const ratio = (Number(r["data-height"]) || 1080) / (Number(r["data-width"]) || 1920);
  const across = Math.min(frames.length, ratio > 1 ? 4 : ratio === 1 ? 3 : frames.length > 6 ? 3 : 2);
  const tile = width || Math.floor((ACROSS_WIDTH - across * 6) / across);
  const review = join(dir, "docs", "review");
  for (const name of existsSync(review) ? readdirSync(review) : []) if (/^stills(-\d+)?\.png$/.test(name)) rmSync(join(review, name));
  const tiles = frames.map((f) => ({ src: f.path, label: `${sceneAt(f.time) ? `${sceneAt(f.time)} · ` : ""}${sheetTime(f.time)}` }));
  const sheets = await drawSheets([{ title: "", rows: [{ label: "", tiles }] }], { out: join(review, "stills.png"), width: tile, ratio });
  return [`${sheets.map((s) => relative(dir, s)).join(", ")}: ${frames.length === 1 ? "a still" : `${frames.length} stills`} of ${slug} (${times.map((t) => sheetTime(t)).join(", ")}), ${tile} px wide each, drawn as the render draws them. Read it to look.`];
}
