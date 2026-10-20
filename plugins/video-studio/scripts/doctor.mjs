#!/usr/bin/env node
// Wyzowl Video Studio setup check: what this machine has and what's missing (lib/checks.mjs, which the studio's Setup
// and Health page shows too).
//   node doctor.mjs [--json]
import { findStudio, pluginVersion } from "./lib/studio.mjs";
import { runChecks } from "./lib/checks.mjs";

const argv = process.argv.slice(2);
const root = findStudio(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const checks = runChecks({ root });

if (argv.includes("--json")) {
  console.log(JSON.stringify({ plugin: pluginVersion(), checks }, null, 2));
} else {
  const cellText = (s) => String(s || "").replace(/\|/g, "\\|");
  console.log(`Wyzowl Video Studio ${pluginVersion()}: setup check\n`);
  console.log("| Check | OK | Details | Fix |\n|---|---|---|---|");
  for (const c of checks) console.log(`| ${c.name} | ${c.ok ? "yes" : c.optional ? "no (optional)" : "**no**"} | ${cellText(c.detail)} | ${c.ok ? "" : cellText(c.fix)} |`);
}
