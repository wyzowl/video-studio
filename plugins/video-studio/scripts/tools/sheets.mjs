// Review sheets and delivery extras from a render, driven by the film's own docs/beats.json.
// Run from the project root:
//   node <plugin>/scripts/tools/sheets.mjs renders/drafts/draft_r3.mp4 docs/review/r3            the key sheet, all strips
//   node <plugin>/scripts/tools/sheets.mjs renders/drafts/draft_r3.mp4 docs/review/r3 whip zoom  only these strips
//   node <plugin>/scripts/tools/sheets.mjs renders/<p>_16x9.mp4 --deliver                         _web.mp4, poster,
//                                                                                                   thumbnail, contact
//
// docs/beats.json (the film decides what to look at; this script only does the grabbing):
//   { "keys":   [1.6, 4.6, …],              one per VO sentence on its key word (or per story beat with no VO)
//     "strips": { "whip": [12.4, 13.0], … },  the fast moves, six frames across each
//     "poster": 61.5,                          the poster frame
//     "contact": [0.8, 2.6, …] }               optional: the 30 contact-sheet beats (default: keys, resampled)
// Review mode makes keys.png, every key frame at a phone's width (360 px) with its time, and strips.png, a row of six
// frames across each fast move, each sheet read at its own size (lib/sheet.mjs: a longer film's go on keys-2.png and
// on); and each key frame whole (k_00.png …), for a closer look at one.
// Deliver mode keeps a revision suffix: renders/<p>_16x9_v2.mp4 → poster_v2.png, thumbnail_v2.jpg, contact_v2.png.
// The thumbnail is the poster at 1280 px along its longer side, as a JPEG (YouTube's size, and link previews').
// While a stage is under way on the video's pages, its newest key frames (or the poster) show there
// (lib/progress.mjs): review sheets also make small copies of the key frames, in thumbs/.
import { readFileSync, mkdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename, relative } from "node:path";
import { inVideo, readProgress, report, videoAt } from "../lib/progress.mjs";
import { probe } from "../lib/render.mjs";
import { drawSheets, ff, grab as grabAt, pool, sheetRange, sheetTime } from "../lib/sheet.mjs";

const argv = process.argv.slice(2);
const deliver = argv.includes("--deliver");
const [IN, OUT, ...only] = argv.filter((a) => a !== "--deliver");
if (!IN || (!deliver && !OUT)) { console.error("usage: sheets.mjs <render.mp4> <outDir> [strip …]  |  sheets.mjs <master.mp4> --deliver"); process.exit(1); }
const B = JSON.parse(readFileSync(process.env.BEATS || "docs/beats.json", "utf8"));

const grab = (t, out, scale) => () => grabAt(IN, t, out, scale);
const pick = (arr, n) => (arr.length <= n ? arr : Array.from({ length: n }, (_, k) => arr[Math.round((k * (arr.length - 1)) / (n - 1))]));

if (deliver) {
  const D = dirname(IN), base = basename(IN, ".mp4"), V = (base.match(/_\d+x\d+(.*)$/) || [, ""])[1];
  await ff(["-i", IN, "-c:v", "libx264", "-crf", "19", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k", join(D, `${base}_web.mp4`)]);
  await grab(B.poster, join(D, `poster${V}.png`))();
  await ff(["-i", join(D, `poster${V}.png`), "-vf", "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'", "-q:v", "3", join(D, `thumbnail${V}.jpg`)]);
  const T = pick(B.contact || B.keys, 30), tmp = mkdtempSync(join(tmpdir(), "contact-"));
  await pool(T.map((t, i) => grab(t, join(tmp, `c_${String(i).padStart(2, "0")}.png`), 384)));
  await ff(["-pattern_type", "glob", "-i", join(tmp, "c_*.png"), "-vf", `tile=6x${Math.ceil(T.length / 6)}:padding=3:color=0x888888`, join(D, `contact${V}.png`)]);
  rmSync(tmp, { recursive: true });
  report(IN, (q, at) => {
    if (q.stage !== "final") return q;
    q.step = "extras";
    delete q.count;
    q.frames = [{ src: inVideo(at, join(D, `poster${V}.png`)), caption: "Poster" }];
    return q;
  });
  console.log(`web: ${join(D, base + "_web.mp4")} · poster: ${join(D, `poster${V}.png`)} · thumbnail: ${join(D, `thumbnail${V}.jpg`)} · contact: ${join(D, `contact${V}.png`)}`);
} else {
  mkdirSync(OUT, { recursive: true });
  const size = probe(IN) || { width: 1920, height: 1080 };
  const ratio = size.height / size.width;
  const keys = only.length ? [] : B.keys.map((t, i) => ({ t, file: join(OUT, `k_${String(i).padStart(2, "0")}.png`) }));
  const strips = Object.entries(B.strips || {}).filter(([n]) => !only.length || only.includes(n));
  // six frames across each fast move, small: the sheet only needs them at its own size
  const stripWidth = ratio > 1.2 ? 160 : ratio > 0.9 ? 200 : 240;
  const tmp = mkdtempSync(join(tmpdir(), "strips-"));
  const frames = strips.map(([name, [t0, t1]]) => ({ name, t0, t1, at: Array.from({ length: 6 }, (_, k) => +(t0 + ((t1 - t0) * k) / 5).toFixed(3)) }));
  await pool([
    ...keys.map((k) => grab(k.t, k.file)),
    ...frames.flatMap((s) => s.at.map((t, k) => grab(t, join(tmp, `${s.name}_${k}.png`), stripWidth))),
  ]);
  const made = [];
  if (keys.length) made.push(...(await drawSheets([{ title: "", rows: [{ label: "", tiles: keys.map((k) => ({ src: k.file, label: sheetTime(k.t) })) }] }], { out: join(OUT, "keys.png"), width: 360, ratio })));
  if (frames.length)
    made.push(...(await drawSheets(frames.map((s) => ({ title: `${s.name} · ${sheetRange(s.t0, s.t1)}`, rows: [{ label: "", tiles: s.at.map((t, k) => ({ src: join(tmp, `${s.name}_${k}.png`), label: sheetTime(t) })) }] })), { out: join(OUT, "strips.png"), width: stripWidth, ratio })));
  rmSync(tmp, { recursive: true, force: true });
  // the video under way shows these key frames as its newest, from small copies
  const at = videoAt(OUT);
  if (keys.length && at && readProgress(at.root, at.slug)?.stage === "video") {
    mkdirSync(join(OUT, "thumbs"), { recursive: true });
    const shown = pick(keys.map((k, i) => ({ ...k, i })), 6);
    await pool(shown.map(({ i }) => () => ff(["-i", join(OUT, `k_${String(i).padStart(2, "0")}.png`), "-vf", "scale=480:-1", "-q:v", "4", join(OUT, "thumbs", `k_${String(i).padStart(2, "0")}.jpg`)])));
    const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;
    report(OUT, (q, here) => {
      q.step = "sheets";
      delete q.count;
      q.frames = shown.map(({ t, i }) => ({ src: inVideo(here, join(OUT, "thumbs", `k_${String(i).padStart(2, "0")}.jpg`)), caption: clock(t) }));
      q.framesFrom = basename(IN).replace(/\.[a-z0-9]+$/i, "");
      return q;
    });
  }
  const what = [keys.length && `${keys.length} key frames at a phone's width`, frames.length && `${frames.length} fast move${frames.length === 1 ? "" : "s"}, six frames across each`].filter(Boolean).join("; ");
  console.log(`Sheets in ${OUT}: ${made.map((f) => relative(OUT, f)).join(", ") || "none"} (${what || "nothing to grab"}).${keys.length ? " Each key frame whole: k_00.png on." : ""}`);
}
