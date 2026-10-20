// What this Mac and the studio have, for setup and the studio's health: each thing Wyzowl Video Studio needs or can
// use, whether it's here, a line on what's there (or what's wrong), the command that fixes it (for Claude), and the
// words the person can say to Claude to have it fixed. doctor.mjs prints them; the Setup and Health page shows them.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readStudio, readJSON, registeredStudios, USER_DIR } from "./studio.mjs";
import { EXTRAS } from "./extras.mjs";
import { HYPERFRAMES_VERSION, SKILL_INSTALLS } from "./versions.mjs";

const PATH = `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`;
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20000, env: { ...process.env, PATH } });
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

/** Every check, in the order setup goes ({ id, group, name, ok, detail, fix, say, time, doing, optional }). `say` is
    what to tell Claude; `fix` is the command Claude runs; `time` is roughly how long it takes; `doing` is what the
    Setup page says while Claude does it. */
export function runChecks({ root = null } = {}) {
  const checks = [];
  const add = (c) => checks.push({ optional: false, fix: "", say: "", time: "", ...c });

  const mac = process.platform === "darwin";
  add({
    id: "macos",
    group: "This Mac",
    name: "macOS",
    ok: mac,
    detail: mac ? `macOS ${run("sw_vers", ["-productVersion"]) || ""} (${process.arch === "arm64" ? "Apple silicon" : process.arch})` : `${process.platform} isn't supported yet`,
    fix: mac ? "" : "Wyzowl Video Studio runs on macOS only.",
    say: mac ? "" : "Wyzowl Video Studio runs on macOS only, so there's nothing to install here.",
  });

  const brew = has("brew");
  add({
    id: "homebrew",
    group: "This Mac",
    name: "Homebrew",
    ok: brew,
    detail: brew ? (run("brew", ["--version"]) || "").split("\n")[0] : "not installed: it installs the tools below",
    fix: "Install from https://brew.sh (the user runs the installer; it asks for their password).",
    say: "Paste the install command from brew.sh into the Terminal app (it asks for your Mac's password), then tell Claude: “Homebrew is installed.”",
    time: "about 5 min",
    doing: "Installing Homebrew",
  });

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add({
    id: "node",
    group: "This Mac",
    name: "Node.js",
    ok: nodeMajor >= 20 && has("npx"),
    detail: `${process.versions.node}${nodeMajor < 20 ? " (20 or newer is needed)" : ""}${has("npx") ? "" : ", without npx"}`,
    fix: "HOMEBREW_NO_ANALYTICS=1 brew install node",
    say: "Install Node.js for my studio.",
    time: "about 1 min",
    doing: "Installing Node.js",
  });

  const ff = run("ffmpeg", ["-hide_banner", "-version"]);
  add({
    id: "ffmpeg",
    group: "This Mac",
    name: "ffmpeg",
    ok: Boolean(ff) && has("ffprobe"),
    detail: ff ? ff.split("\n")[0].replace(/ Copyright.*/, "") : "not installed: it reads and writes the video and sound",
    fix: "HOMEBREW_NO_ANALYTICS=1 brew install ffmpeg",
    say: "Install ffmpeg for my studio.",
    time: "about 2 min",
    doing: "Installing ffmpeg",
  });

  const git = run("git", ["--version"]);
  add({ id: "git", group: "This Mac", name: "git", ok: Boolean(git), detail: git || "not installed: the skills installer needs it", fix: "HOMEBREW_NO_ANALYTICS=1 brew install git", say: "Install git for my studio.", time: "under a minute", doing: "Installing git" });

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
  add({
    id: "hyperframes",
    group: "HyperFrames",
    name: "HyperFrames",
    ok: cached.includes(HYPERFRAMES_VERSION),
    detail: `Video Studio uses ${HYPERFRAMES_VERSION}; ${cached.length ? `on this Mac: ${cached.join(", ")}` : "not on this Mac yet"}`,
    fix: "Nothing to install: it runs through npx, and the test render fetches it.",
    say: "Run the studio's test render.",
    time: "nothing to install",
  });

  const chrome = list(join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell"));
  add({
    id: "chrome",
    group: "HyperFrames",
    name: "HyperFrames' Chrome",
    ok: chrome.length > 0,
    detail: chrome.length ? `installed (${chrome.join(", ")})` : "not yet: the first render downloads it",
    fix: "Installed automatically by the first HyperFrames render (setup's test render).",
    say: "Run the studio's test render.",
    time: "about 1 min, with the test render",
    doing: "Running the test render",
  });

  for (const x of EXTRAS) {
    const ok = x.installed();
    add({
      id: x.id,
      group: "Downloads",
      name: x.name,
      ok,
      detail: ok ? (x.detail ? x.detail() : "downloaded") : `not downloaded yet: it's used to ${x.what}`,
      fix: `${x.command()} (${x.size}, once)`,
      say: x.say || (x.id === "parakeet" ? "Download the transcription model." : x.id === "cutout" ? "Download the presenter cut-out model." : `Download ${x.name.toLowerCase()}.`),
      time: x.time || `${x.size.replace(/^about /, "")}, about ${x.id === "parakeet" ? "2–5" : "1–2"} min`,
      doing: x.doing || `Downloading ${x.id === "parakeet" ? "the transcription model" : x.id === "cutout" ? "the presenter cut-out model" : x.name.toLowerCase()}`,
      optional: false,
    });
  }

  if (root) {
    const studio = readStudio(root);
    add({ id: "studio", group: "Your studio", name: "Studio folder", ok: true, detail: `${root} (HyperFrames ${studio.hyperframes || "not set"})` });
    const skill = (n) => existsSync(join(root, ".claude/skills", n, "SKILL.md"));
    add({
      id: "skills",
      group: "Your studio",
      name: "HyperFrames skills",
      ok: skill("hyperframes"),
      detail: skill("hyperframes") ? "installed in this studio" : "not installed in this studio",
      fix: `From the studio folder: ${SKILL_INSTALLS.hyperframes}`,
      say: "Install the HyperFrames skills in my studio.",
      time: "under a minute",
      doing: "Installing the HyperFrames skills",
    });
    add({
      id: "motion",
      group: "Your studio",
      name: "Motion design skill",
      ok: skill("motion-design"),
      detail: skill("motion-design") ? "installed in this studio" : "not installed in this studio",
      fix: `From the studio folder: ${SKILL_INSTALLS.motion}`,
      say: "Install the motion design skill in my studio.",
      time: "under a minute",
      doing: "Installing the motion design skill",
    });
  } else {
    const known = registeredStudios()[0]?.path;
    add({
      id: "studio",
      group: "Your studio",
      name: "Studio folder",
      ok: false,
      detail: known ? `this folder isn't a studio (yours is ${known})` : "not made yet",
      fix: known ? `Open Claude Code in ${known}.` : "Setup creates one.",
      say: known ? `Open Claude Code in your studio folder, ${known}.` : "Set up my studio.",
      time: "under a minute",
      doing: "Making your studio folder",
    });
  }

  // faster renders: on Apple silicon, Video Studio's renders (studio.mjs render) draw on the graphics chip by themselves
  const silicon = process.platform === "darwin" && process.arch === "arm64";
  add({
    id: "gpu",
    group: "Optional",
    name: "Faster renders",
    ok: silicon,
    detail: silicon ? "on: Video Studio's renders use the graphics chip" : "needs Apple silicon: renders here use the processor",
    optional: true,
  });
  return checks;
}

// what Claude has said it's installing now (`studio.mjs setup-note`), so the page can say so while it runs
const NOTES = join(USER_DIR, "setup.json");
export function setupNotes(now = Date.now()) {
  const notes = readJSON(NOTES, {}).notes || {};
  return Object.fromEntries(Object.entries(notes).filter(([, n]) => n?.state && now - Date.parse(n.at) < 45 * 60e3));
}
export { NOTES as SETUP_NOTES };

// the page asks every few seconds: while something's missing the checks run again after 3 seconds; once all is well,
// after a minute
let last = null;
export function checksNow(root) {
  if (last && last.root === root && Date.now() - last.at < (last.checks.every((c) => c.ok || c.optional) ? 60e3 : 3e3)) return last.checks;
  last = { root, at: Date.now(), checks: runChecks({ root }) };
  return last.checks;
}
