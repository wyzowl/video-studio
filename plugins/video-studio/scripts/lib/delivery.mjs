// A video's delivery: every file its final stage made, in renders/ (not the drafts), sorted for the delivery page: the
// final video at each size and its web copy, then the poster, thumbnail and GIF, the captions, the contact sheet and
// anything else, each with what it is and, for video and images, its frame size and length. And renders/delivery.json:
// the words to go with it (a title, a description, alt text), which Claude writes.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ORDER = ["master", "web", "poster", "thumbnail", "gif", "captions", "contact", "other"];
const SIZE_ORDER = ["16x9", "1x1", "4x5", "9x16"];
const probed = new Map();

/** A video or image file's frame size, length, frame rate and whether it has sound (null if ffprobe can't read it).
    Kept until the file changes. */
export function probeMedia(file) {
  const st = statSync(file, { throwIfNoEntry: false });
  if (!st) return null;
  const key = `${file}:${st.mtimeMs}:${st.size}`;
  if (probed.has(key)) return probed.get(key);
  let out = null;
  try {
    const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,avg_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8", timeout: 8000 });
    const info = JSON.parse(r.stdout || "{}");
    const v = (info.streams || []).find((s) => s.codec_type === "video");
    const [n, d] = String(v?.avg_frame_rate || "0/1").split("/").map(Number);
    if (v) out = { width: v.width, height: v.height, duration: Number(info.format?.duration) || 0, fps: d ? Math.round(n / d) : 0, audio: (info.streams || []).some((s) => s.codec_type === "audio") };
  } catch {}
  probed.set(key, out);
  return out;
}

/** What a delivery file is, from its name: `<project>_<size>[_v2].mp4` is the final video, `…_web.mp4` its web copy,
    `poster*`, `thumbnail*` and `contact*` the stills, `.srt` and `.vtt` the captions. */
function kindOf(name) {
  const ext = extname(name).toLowerCase();
  if ([".mp4", ".mov", ".webm"].includes(ext)) return /_web\.mp4$/i.test(name) ? "web" : "master";
  if (/^poster/i.test(name)) return "poster";
  if (/^thumbnail/i.test(name)) return "thumbnail";
  if (/^contact/i.test(name)) return "contact";
  if (ext === ".srt" || ext === ".vtt") return "captions";
  if (ext === ".gif") return "gif";
  return "other";
}

/** The delivery's files, in the order the page shows them ([{ name, path, bytes, mtime, kind, size, media }]). */
export function deliveryFiles(root, slug) {
  const dir = join(root, "videos", slug, "renders");
  let names = [];
  try {
    names = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith(".") && e.name !== "delivery.json")
      .map((e) => e.name);
  } catch {}
  const files = names.map((name) => {
    const path = join(dir, name);
    const st = statSync(path);
    const kind = kindOf(name);
    const size = /_(\d+x\d+)(?:_v\d+)?(?:_web)?\.[a-z0-9]+$/i.exec(name)?.[1] || null;
    const media = ["master", "web", "poster", "thumbnail", "gif", "contact"].includes(kind) ? probeMedia(path) : null;
    return { name, path, bytes: st.size, mtime: st.mtimeMs, kind, size, media };
  });
  const sizeRank = (f) => (f.size && SIZE_ORDER.includes(f.size) ? SIZE_ORDER.indexOf(f.size) : SIZE_ORDER.length);
  return files.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || sizeRank(a) - sizeRank(b) || a.name.localeCompare(b.name, "en", { numeric: true }));
}

/** The words to go with the video (renders/delivery.json): { title, description, altText }, each a string, or {}. */
export function deliveryWords(root, slug) {
  try {
    const d = JSON.parse(readFileSync(join(root, "videos", slug, "renders", "delivery.json"), "utf8"));
    return Object.fromEntries(["title", "description", "altText"].filter((k) => typeof d?.[k] === "string" && d[k].trim()).map((k) => [k, d[k].trim()]));
  } catch {
    return {};
  }
}

/** Whether a video has a final video yet (a quick look at the file names, for the links to its delivery page). */
export function hasDelivery(root, slug) {
  try {
    return readdirSync(join(root, "videos", slug, "renders")).some((n) => kindOf(n) === "master");
  } catch {
    return false;
  }
}
