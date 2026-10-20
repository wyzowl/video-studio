// What Video Studio needs beyond the plugin itself: large downloads, fetched once. Installing Video Studio is the
// user's go-ahead for them: setup installs them all (saying up front what it downloads), and when a session starts,
// any that aren't on this Mac yet (a new version's, or one that didn't finish) download in the background.
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PLUGIN_ROOT } from "./studio.mjs";
import { SFX_KIT, kitInstalled, readGaps, readKit } from "./sfx.mjs";
import { HYPERFRAMES, HYPERFRAMES_SWITCHES } from "./versions.mjs";

const cache = join(homedir(), ".cache", "hyperframes");
const has = (dir, re) => {
  try {
    return readdirSync(dir).some((n) => re.test(n));
  } catch {
    return false;
  }
};

/** Each: what it is, what it's for ("to …"), its size (and in MB, so the smallest download first), the plugin
    version that first used it, whether it's here, and how to get it (with Video Studio's pinned HyperFrames): as a
    command line for Claude, and as `run()` → [command, args] for `studio.mjs install all`. Optional: the
    words for Setup and Studio health (`say`, `doing`, `time`), and a `detail` line once it's here. */
export const EXTRAS = [
  {
    id: "parakeet",
    name: "Transcription",
    what: "turn voiceovers into word timings on this Mac",
    size: "about 640 MB",
    mb: 640,
    since: "0.1.0",
    installed: () => has(join(cache, "parakeet"), /./),
    command: () => `${HYPERFRAMES_SWITCHES} npx --yes ${HYPERFRAMES} models install parakeet`,
    run: () => ["npx", ["--yes", HYPERFRAMES, "models", "install", "parakeet"]], // with HyperFrames' switches, from studio.mjs
  },
  {
    id: "cutout",
    name: "Presenter cut-outs",
    what: "cut the presenter out of footage on this Mac, so text can sit behind them (T01 Words behind)",
    size: "about 168 MB",
    mb: 168,
    since: "0.2.0",
    installed: () => has(join(cache, "background-removal", "models"), /\.onnx$/),
    command: () => `node "${join(PLUGIN_ROOT, "scripts", "studio.mjs")}" install cutout`,
    run: () => [process.execPath, [join(PLUGIN_ROOT, "scripts", "studio.mjs"), "install", "cutout"]],
  },
  {
    id: "sfx-kit",
    name: "SFX Kit",
    what: "add sound effects to videos: 320 sounds, free to use (CC0)",
    size: SFX_KIT.size,
    mb: 55,
    since: "0.8.0",
    installed: kitInstalled,
    command: () => `node "${join(PLUGIN_ROOT, "scripts", "studio.mjs")}" install sfx-kit`,
    run: () => [process.execPath, [join(PLUGIN_ROOT, "scripts", "studio.mjs"), "install", "sfx-kit"]],
    say: "Download SFX Kit.",
    doing: "Downloading SFX Kit",
    time: "55 MB, about 1 min",
    detail: () => {
      const gaps = readGaps();
      const made = gaps.length ? `; ${gaps.length} sound${gaps.length === 1 ? "" : "s"} it didn't have, made for a video instead: ${gaps.slice(-3).map((g) => g.what).join(", ")}${gaps.length > 3 ? "…" : ""}` : "";
      try {
        return `version ${SFX_KIT.version}, ${readKit().sounds.length} sounds${made}`;
      } catch {
        return "here, but its sounds.json can't be read: download it again";
      }
    },
  },
];

/** a is a later version than b ("0.2.0" > "0.1.6") */
export const newer = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true }) > 0;
