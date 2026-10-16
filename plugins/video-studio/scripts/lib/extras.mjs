// Downloads the studio uses beyond the plugin itself: large, fetched once, and only with the user's OK. Setup offers
// each one; after an update, the session-start hook asks Claude to offer any that the new version brings.
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PLUGIN_ROOT } from "./studio.mjs";

const cache = join(homedir(), ".cache", "hyperframes");
const has = (dir, re) => {
  try {
    return readdirSync(dir).some((n) => re.test(n));
  } catch {
    return false;
  }
};

/** Each: what it is, what it's for ("to …"), its size, the plugin version that first used it, whether it's here, and
    how to get it (for a studio pinned to HyperFrames `hf`). */
export const EXTRAS = [
  {
    id: "parakeet",
    name: "Transcription",
    what: "turn voiceovers into word timings on this Mac",
    size: "about 640 MB",
    since: "0.1.0",
    installed: () => has(join(cache, "parakeet"), /./),
    command: (hf) => `npx --yes hyperframes@${hf} models install parakeet`,
  },
  {
    id: "cutout",
    name: "Presenter cut-outs",
    what: "cut the presenter out of footage on this Mac, so text can sit behind them (T01 Words behind)",
    size: "about 168 MB",
    since: "0.2.0",
    installed: () => has(join(cache, "background-removal", "models"), /\.onnx$/),
    command: () => `node "${join(PLUGIN_ROOT, "scripts", "studio.mjs")}" install cutout`,
  },
];

/** a is a later version than b ("0.2.0" > "0.1.6") */
export const newer = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true }) > 0;
