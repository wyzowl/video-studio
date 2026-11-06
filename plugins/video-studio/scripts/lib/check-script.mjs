// The script's measurable rules, for `studio.mjs check <video> --script`, run when a script is written: how long the
// hook takes to land, the words each row puts on screen, the pace against the brief's length, and the longest beat,
// against the same numbers the film's checks use (guides/rules.json). The story itself is judged by reading it.
// Saved as docs/checks/script.json, beside the film's report.
import { readBrief, readScript, scriptFromFootage, scriptHasVoiceover, scriptRows, scriptVersions } from "./studio.mjs";
import { frameRow, readRules, saveReport, settle } from "./check.mjs";
import { join } from "node:path";

const round = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
const count = (text) => String(text || "").replace(/\*\*/g, "").replace(/\([^)]*\)/g, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const bold = (text) => [...String(text || "").matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].trim()).filter(Boolean);

/** The brief's length as [shortest, longest] in seconds: "~60s" (give or take a tenth), "30–60 seconds", "1 minute". */
export function briefLength(brief) {
  const text = `${brief.length || ""} ${(brief.sections || []).find((s) => s.key === "request")?.text.match(/Length:\s*([^\n]+)/i)?.[1] || ""}`;
  const unit = (n, u) => (/^m/i.test(u || "") ? n * 60 : n);
  let m = /(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?|m|min|minutes?)?\s*[–-]\s*(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?)?/i.exec(text);
  if (m) return [unit(Number(m[1]), m[3]), unit(Number(m[2]), m[3])];
  m = /(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?)?\b/i.exec(text);
  if (!m) return null;
  const n = unit(Number(m[1]), m[2]);
  return [n * 0.9, n * 1.1];
}

export function checkScript(root, slug) {
  const version = scriptVersions(root, slug).at(-1);
  if (!version) throw new Error(`videos/${slug} has no script yet.`);
  const { script } = readScript(root, slug, version);
  const brief = readBrief(root, slug);
  const rules = readRules(join(root, "videos", slug));
  const S = rules.speech;
  const W = rules.words;
  const perSecond = S.wordsPerMinute / 60;
  const rows = scriptRows(script);
  const voiced = scriptHasVoiceover(script);
  const footage = scriptFromFootage(script);
  const [w, h] = String(brief.aspect || "1920x1080").split(/[x×]/).map(Number);
  const vertical = frameRow(rules, w || 1920, h || 1080).key === "9x16";
  const findings = [];
  const add = (f) => findings.push({ owner: "script", source: "Video Studio: the script", time: null, element: "", ...f });

  // each row's length: what's said at the pace (or the takes' own length, from footage)
  const said = (row) => String(row.voiceover || "");
  const seconds = (row) => (footage && Array.isArray(row.source) ? row.source.reduce((n, r) => n + Math.max(0, Number(r.out) - Number(r.in) || 0), 0) : count(said(row)) / perSecond);

  // the hook: the first sentence lands the promise
  const first = rows[0];
  if (first) {
    const promise = vertical ? rules.hook.promiseByVertical : rules.hook.promiseBy;
    if (voiced) {
      const sentence = said(first).replace(/\*\*/g, "").split(/(?<=[.?!…])\s/)[0];
      const t = footage ? null : count(sentence) / perSecond;
      if (t && t > promise)
        add({
          level: "note",
          element: "row 1",
          text: sentence,
          what: `The opening sentence takes about ${round(t)} s to say (${count(sentence)} words at ${S.wordsPerMinute} a minute): the promise should be clear by ${promise} s${vertical ? " in a vertical feed" : ""}.`,
          fix: "Check the promise lands in time: lead with it, or cut the words before it (guides/story/hooks.md).",
          code: "hook_slow",
        });
    } else {
      const words = count(first.onScreen || "");
      const t = rules.reading.findSeconds + rules.reading.perWord * words;
      if (words && t > promise)
        add({ level: "note", element: "row 1", text: first.onScreen, what: `The first words on screen take about ${round(t)} s to read (${words} words): the promise should be clear by ${promise} s${vertical ? " in a vertical feed" : ""}.`, fix: "Open on fewer words (guides/story/hooks.md).", code: "hook_slow" });
    }
  }

  // words on screen: a row's words at once, and a headline's few
  for (const row of rows) {
    const lines = voiced ? [...new Set([...bold(row.voiceover), ...bold(row.action)])] : String(row.onScreen || "").split("\n").map((l) => l.replace(/\*\*/g, "").trim()).filter(Boolean);
    const total = lines.reduce((n, l) => n + count(l), 0);
    if (total > W.atOnce)
      add({ level: "should", element: `row ${row.n}`, text: lines.join(" · "), what: `Row ${row.n} puts ${total} words on screen (${W.atOnce} at most at once).`, fix: "Fewer words on screen, and let the voice carry the rest; or split the row so they come one after another (numbers.md, Words on screen).", code: "row_words" });
    for (const l of lines)
      if (count(l) > W.headline[1] && total <= W.atOnce)
        add({ level: "note", element: `row ${row.n}`, text: l, what: `Row ${row.n} shows a line of ${count(l)} words: ‘${l}’. A headline is ${W.headline[0]}–${W.headline[1]}.`, fix: "Fine for a smaller line under a headline; a headline is a few key words.", code: "row_line_long" });
  }

  // the pace against the brief's length, and the longest beat
  let length = null;
  if (voiced) {
    const words = rows.reduce((n, r) => n + count(said(r)), 0);
    length = footage ? rows.reduce((n, r) => n + seconds(r), 0) : words / perSecond;
    const want = briefLength(brief);
    if (want && !script.recorded) {
      const [lo, hi] = want;
      if (length > hi * 1.05) {
        const pace = (words / hi) * 60;
        add({
          level: "should",
          what: `It runs about ${round(length, 0)} s (${words} words${footage ? " in the takes" : ` at ${S.wordsPerMinute} a minute`}); the brief asks for ${Math.round(lo)}–${Math.round(hi)} s.${footage ? "" : ` To fit, it would be read at ${Math.round(pace)} a minute${pace > S.rushedOver ? ", which sounds rushed" : pace > S.brisk[1] ? ", faster than brisk" : ""}.`}`,
          fix: footage ? "Cut a take, or a sentence from one." : `Cut about ${Math.ceil(words - (hi * perSecond))} words: words, not pauses (guides/story/principles.md).`,
          code: "runs_long",
        });
      } else if (length < lo * 0.9)
        add({ level: "note", what: `It runs about ${round(length, 0)} s; the brief asks for ${Math.round(lo)}–${Math.round(hi)} s.`, fix: "Fine if the story is told; otherwise give a beat more room.", code: "runs_short" });
    }
    for (const row of rows) {
      const t = seconds(row);
      if (t > S.beatSeconds[1])
        add({ level: "should", element: `row ${row.n}`, text: said(row).replace(/\*\*/g, ""), what: `Row ${row.n} runs about ${round(t)} s: a beat is ${S.beatSeconds[0]}–${S.beatSeconds[1]} s.`, fix: "Split it into two rows, each with its own action, carrying the sentence on with an ellipsis (script skill).", code: "beat_long" });
    }
    const scenes = new Map();
    for (const row of rows) if (row.scene != null) scenes.set(row.scene, (scenes.get(row.scene) || 0) + seconds(row));
    for (const [scene, t] of scenes)
      if (t > S.sceneSeconds[1] * 1.5)
        add({ level: "note", element: `scene ${scene}`, what: `Scene ${scene} runs about ${round(t)} s: a scene is usually ${S.sceneSeconds[0]}–${S.sceneSeconds[1]} s.`, fix: "Fine for a scene with a lot to show; otherwise split it in the storyboard.", code: "scene_long" });
  }

  const order = { must: 0, should: 1, note: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  const report = settle({
    version: 1,
    title: `${script.title || slug}, script v${version}`,
    video: slug,
    checked: new Date().toISOString(),
    script: version,
    rules: { file: "guides/rules.json", own: rules.own.length ? "docs/rules.json" : null, changed: rules.own },
    ran: [
      {
        name: "Video Studio's script check",
        detail: `${rows.length} rows${length ? `, about ${round(length, 0)} s${footage ? " of takes" : ` at ${S.wordsPerMinute} words a minute`}` : ""}: the hook, words on screen, ${voiced ? "the pace against the brief's length and the longest beat" : "the text on screen"}`,
      },
    ],
    findings,
  });
  return { report, path: saveReport(root, slug, "script", report) };
}
