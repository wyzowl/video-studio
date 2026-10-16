#!/usr/bin/env node
// Wyzowl Video Studio setup check: what this machine has and what's missing.
//   node doctor.mjs [--json] [--online]     --online also asks npm for the newest HyperFrames release
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { findStudio, readStudio, pluginVersion } from "./lib/studio.mjs";
import { EXTRAS } from "./lib/extras.mjs";

process.env.PATH = `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`;
const argv = process.argv.slice(2);
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20000 });
  return r.status === 0 ? `${r.stdout || ""}${r.stderr || ""}`.trim() : null;
};
const has = (cmd) => Boolean(run("/bin/sh", ["-c", `command -v ${cmd}`]));
const list = (dir) => {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
};
const checks = [];
const add = (name, ok, detail, fix = "") => checks.push({ name, ok, detail, fix });

const mac = process.platform === "darwin";
add("macOS", mac, mac ? `macOS ${run("sw_vers", ["-productVersion"]) || ""} (${process.arch})` : `${process.platform} is not supported yet`, mac ? "" : "Wyzowl Video Studio runs on macOS only.");

const brew = has("brew");
add("Homebrew", brew, brew ? (run("brew", ["--version"]) || "").split("\n")[0] : "not installed", "Install from https://brew.sh (the user runs the installer; it asks for their password).");

const nodeMajor = Number(process.versions.node.split(".")[0]);
add("Node.js", nodeMajor >= 20, `${process.versions.node}${nodeMajor < 20 ? " (20 or newer needed)" : ""}`, "brew install node");
add("npx", has("npx"), has("npx") ? run("npx", ["--version"]) : "missing", "Comes with Node.js: brew install node");

const ff = run("ffmpeg", ["-hide_banner", "-version"]);
add("ffmpeg", Boolean(ff) && has("ffprobe"), ff ? ff.split("\n")[0].replace(/ Copyright.*/, "") : "not installed", "brew install ffmpeg");

const git = run("git", ["--version"]);
add("git", Boolean(git), git || "not installed", "brew install git (the skills installer downloads skills with it)");

const npx = join(homedir(), ".npm/_npx");
const cached = [
  ...new Set(
    list(npx)
      .map((d) => {
        try {
          return JSON.parse(readFileSync(join(npx, d, "node_modules/hyperframes/package.json"), "utf8")).version;
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  ),
].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
let latest = null;
if (argv.includes("--online")) latest = run("npm", ["view", "hyperframes", "version"]);
add(
  "HyperFrames CLI",
  cached.length > 0 || Boolean(latest),
  `${cached.length ? `cached: ${cached.join(", ")}` : "not used yet"}${latest ? `; newest release: ${latest}` : ""}`,
  "Nothing to install: it runs through npx. Setup picks a version and records it in studio.json.",
);

const chrome = list(join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell"));
add("Headless Chrome", chrome.length > 0, chrome.length ? chrome.join(", ") : "not installed yet", "Installed automatically by the first HyperFrames render (setup's test render).");

const parakeet = list(join(homedir(), ".cache/hyperframes/parakeet"));
add("Parakeet transcription", parakeet.length > 0, parakeet.length ? parakeet.join(", ") : "not installed", "npx --yes hyperframes@<version> models install parakeet (about 640 MB)");

const cutout = EXTRAS.find((x) => x.id === "cutout");
add("Presenter cut-outs", cutout.installed(), cutout.installed() ? "model downloaded" : "not downloaded yet", `${cutout.command()} (${cutout.size}, once; for text behind the presenter)`);

const root = findStudio(process.env.CLAUDE_PROJECT_DIR || process.cwd());
if (root) {
  const studio = readStudio(root);
  add("Studio folder", true, `${root} (HyperFrames ${studio.hyperframes || "not set"})`);
  const skill = (n) => existsSync(join(root, ".claude/skills", n, "SKILL.md"));
  add(
    "HyperFrames skills",
    skill("hyperframes"),
    skill("hyperframes") ? "installed in this studio" : "missing",
    "From the studio folder: npx --yes skills add heygen-com/hyperframes --skill '*' --agent claude-code --copy -y",
  );
  add(
    "Motion design skill",
    skill("motion-design"),
    skill("motion-design") ? "installed in this studio" : "missing",
    "From the studio folder: npx --yes skills add LottieFiles/motion-design-skill --skill motion-design --agent claude-code --copy -y",
  );
} else {
  add("Studio folder", false, "this folder isn't a studio", "Setup creates one.");
}

if (process.env.GEMINI_API_KEY) add("Frames stay local", false, "GEMINI_API_KEY is set, so `hyperframes snapshot` sends frames to Gemini", "Unset GEMINI_API_KEY, or pass --describe false to snapshot.");
add("GPU capture", process.env.PRODUCER_BROWSER_GPU_MODE === "hardware", process.env.PRODUCER_BROWSER_GPU_MODE || "not set (HyperFrames auto-detects)", "On Apple silicon: add `export PRODUCER_BROWSER_GPU_MODE=hardware` to ~/.zshrc");

if (argv.includes("--json")) {
  console.log(JSON.stringify({ plugin: pluginVersion(), checks }, null, 2));
} else {
  const cellText = (s) => String(s || "").replace(/\|/g, "\\|");
  console.log(`Wyzowl Video Studio ${pluginVersion()}: setup check\n`);
  console.log("| Check | OK | Details | Fix |\n|---|---|---|---|");
  for (const c of checks) console.log(`| ${c.name} | ${c.ok ? "yes" : "**no**"} | ${cellText(c.detail)} | ${c.ok ? "" : cellText(c.fix)} |`);
}
