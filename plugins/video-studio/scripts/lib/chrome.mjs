// Find the headless Chrome and puppeteer-core that HyperFrames installs, so the studio needs no browser of its own.
// Override with CHROME=<path to chrome-headless-shell> and PUPPETEER_CORE=<path to the puppeteer-core folder>.
// Every launch that draws a film, a storyboard's frames or a library item adds gpuArgs(), so WebGL draws on the
// graphics chip as it does in the render.
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { hyperframesCache } from "./versions.mjs";

const newest = (paths) => paths.filter((p) => existsSync(p)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const list = (dir) => {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
};

export function findChrome() {
  const npx = join(homedir(), ".npm/_npx");
  const pup = process.env.PUPPETEER_CORE || newest(list(npx).map((d) => join(npx, d, "node_modules/puppeteer-core")));
  const shells = hyperframesCache("chrome", "chrome-headless-shell");
  const chrome =
    process.env.CHROME ||
    newest(list(shells).flatMap((v) => list(join(shells, v)).map((d) => join(shells, v, d, process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell"))));
  if (!pup || !chrome) {
    throw new Error(
      "HyperFrames' headless Chrome or puppeteer-core wasn't found. Run one HyperFrames render first (the setup test render does this), or set CHROME and PUPPETEER_CORE.",
    );
  }
  return { puppeteer: createRequire(import.meta.url)(pup), executablePath: chrome };
}

/** Chrome's switches for the graphics chip. On Apple silicon these are the ones HyperFrames' render uses in its
    hardware mode, which Video Studio's renders ask for (lib/render.mjs). Without them, headless Chrome draws WebGL in
    software (SwiftShader) on the processor, so a film with a WebGL canvas (three.js) takes seconds a frame to check
    rather than milliseconds. HyperFrames' own switch, PRODUCER_BROWSER_GPU_MODE, set to anything but hardware
    (software or auto) leaves them off, as it does the render's. */
export function gpuArgs() {
  const mode = process.env.PRODUCER_BROWSER_GPU_MODE;
  if (process.platform !== "darwin" || process.arch !== "arm64" || (mode && mode !== "hardware")) return [];
  return ["--use-gl=angle", "--use-angle=metal", "--enable-gpu-rasterization"];
}
