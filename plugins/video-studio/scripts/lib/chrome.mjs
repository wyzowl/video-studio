// Find the headless Chrome and puppeteer-core that HyperFrames installs, so the studio needs no browser of its own.
// Override with CHROME=<path to chrome-headless-shell> and PUPPETEER_CORE=<path to the puppeteer-core folder>.
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
  const shells = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
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
