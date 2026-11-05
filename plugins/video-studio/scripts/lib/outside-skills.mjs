// The outside skills setup used to install in every studio, up to 0.9: HyperFrames' own skills and LottieFiles'
// motion-design skill, put in the studio's .claude/skills (and .agents/skills) by the skills tool, which listed them
// in skills-lock.json. Video Studio's guides do their job now, so Studio health lists any a studio still has, and
// `studio.mjs skills --remove --yes` takes them out, once the user has said yes. Nothing else is ever touched.
import { readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readJSON } from "./studio.mjs";

/** Every skill name setup installed: HyperFrames' 21 (v0.8.149) and the motion-design skill. */
export const OUTSIDE_SKILLS = [
  "embedded-captions",
  "faceless-explainer",
  "figma",
  "general-video",
  "hyperframes",
  "hyperframes-animation",
  "hyperframes-audio",
  "hyperframes-cli",
  "hyperframes-core",
  "hyperframes-creative",
  "hyperframes-keyframes",
  "hyperframes-registry",
  "hyperframes-studio",
  "media-use",
  "motion-design",
  "motion-graphics",
  "music-to-video",
  "pr-to-video",
  "product-launch-video",
  "remotion-to-hyperframes",
  "slideshow",
  "talking-head-recut",
];
/** Where the skills tool put them, inside the studio. */
const PLACES = [".claude/skills", ".agents/skills"];
const LOCK = "skills-lock.json";

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const bytesIn = (p) => {
  try {
    const s = statSync(p);
    if (!s.isDirectory()) return s.size;
    return readdirSync(p).reduce((n, f) => n + bytesIn(join(p, f)), 0);
  } catch {
    return 0;
  }
};

/** Which outside skills the studio still has: { names, paths, bytes, lock } (lock: skills-lock.json's path when it
    lists any of them). */
export function outsideSkills(root) {
  const names = new Set();
  const paths = [];
  for (const place of PLACES) {
    for (const name of OUTSIDE_SKILLS) {
      const p = join(root, place, name);
      if (isDir(p)) {
        names.add(name);
        paths.push(p);
      }
    }
  }
  const lockFile = join(root, LOCK);
  const listed = Object.keys(readJSON(lockFile, {})?.skills || {}).filter((n) => OUTSIDE_SKILLS.includes(n));
  for (const n of listed) names.add(n);
  return {
    names: OUTSIDE_SKILLS.filter((n) => names.has(n)),
    paths,
    bytes: paths.reduce((n, p) => n + bytesIn(p), 0),
    lock: listed.length ? lockFile : null,
  };
}

/** Removes the outside skills' folders, their entries in skills-lock.json (the file too, once it lists nothing else),
    and the skill folders they leave empty. Returns what it removed. */
export function removeOutsideSkills(root) {
  const found = outsideSkills(root);
  for (const p of found.paths) rmSync(p, { recursive: true, force: true });
  if (found.lock) {
    const lock = readJSON(found.lock, {});
    for (const n of OUTSIDE_SKILLS) delete lock.skills?.[n];
    if (Object.keys(lock.skills || {}).length) writeFileSync(found.lock, `${JSON.stringify(lock, null, 2)}\n`);
    else rmSync(found.lock, { force: true });
  }
  for (const place of PLACES) {
    const dir = join(root, place);
    if (isDir(dir) && !readdirSync(dir).length) rmSync(dir, { recursive: true, force: true });
  }
  const agents = join(root, ".agents");
  if (isDir(agents) && !readdirSync(agents).length) rmSync(agents, { recursive: true, force: true });
  return found;
}

/** The names as a short list for a sentence: "hyperframes, media-use and 20 more". */
export function skillList(names, shown = 4) {
  if (names.length <= shown) return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join("");
  return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
}
