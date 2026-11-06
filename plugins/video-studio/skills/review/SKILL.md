---
name: review
description: Review a built Wyzowl Video Studio video - Claude's draft rounds scored against the guides' eight standards until every score is 8 or more, then the user's video review on its review page. Use after every build or fix, before any video goes to the user, and whenever a video review comes in (the wait finishes, or the user says they've saved).
---

# Review

Claude reviews every draft before the user sees it, then the user reviews it on its page. The review judges taste:
anything that can be measured is Video Studio's checks' (`studio.mjs check`, `PLUGIN/guides/cli.md`, "lint and
check"), and their findings are fixed, not scored. Always review the rendered file, never the code. `PLUGIN` and `HF`
are as in the production skill. The review agent (`PLUGIN/agents/review.md`) does Claude's rounds, after the build
agent's report or the user's notes, and the conversation shares each draft that passes (production skill, "Stage
agents").

## A round

1. `node PLUGIN/scripts/studio.mjs draft <project>` does a round's routine in one go and prints one summary:
   - Video Studio's checks first (`PLUGIN/guides/cli.md`, "lint and check"). A must fix stops it: fix it and run it
     again. Fix each should fix, or keep it with why (`studio.mjs check <project> --keep S2 "<why>"`: a quick-fire run
     meant to be glanced at, a label that's texture);
   - the draft render, `renders/drafts/<project>_v<N>_draft_r<n>.mp4` (`HF render`, pinned, its progress on the
     video's overview), and the render's own checks: its loudness, peaks, sounds that stop dead and a stuck picture
     (and words over a face, on footage);
   - the review sheets in `docs/review/r<n>` (below) and the poster frame beside the draft.
2. Look at the sheets (Read tool): `keys.png` and `strips.png`. Open a single key frame (`k_03.png`) only for detail.
3. Score the round against the standards (below), log it, then put the scores and the three worst problems on the
   video's overview in one call (`studio.mjs progress <project> fixes --round <n> --scores … --fix "<where>: <what>"`,
   production skill, "Work in progress").

## The loop

- **Round 1 passes** when every score is 8 or more and there's no must fix: the draft goes to the user ("The user's
  video review").
- **Otherwise, the next round checks the fixes.** Fix the worst problems (build skill, "Changes after a review"), then
  `studio.mjs draft <project> --at 12.4-13.0,35.2-36.0` renders each changed stretch by itself and makes the fix sheet,
  `docs/review/r<n>/fixes.png`: each stretch before (the last whole draft) and after, at the same moments. Score the
  round from it: what the fixes didn't touch stands as last scored. HyperFrames renders a stretch without the film's
  motion blur, so the smear is judged on a whole draft. Repeat until every score is 8 or more.
- **Then one whole draft** for the user: `studio.mjs draft <project>`, its render's checks clear, and a look over its
  key sheet to see nothing else moved.

## Sheets

`docs/beats.json` names the moments to grab; the sheets only do the grabbing:

```json
{
  "keys": [1.6, 4.6, 9.2],
  "strips": { "whip": [12.4, 13.0] },
  "poster": 9.2,
  "contact": [0.8, 2.6, 4.6, 9.2]
}
```

- `keys`: one time per voiceover sentence (on its key word) or per story beat. `keys.png` shows each at a phone's
  width (360 px) with its time, the size the Reads at a glance score judges, and each is there whole too (`k_00.png`
  on), for a closer look.
- `strips`: the start and end of each fast move only (a whip, a zoom through, a flight past the lens); a slow push or a
  fade needs none, as the key frames show it. `strips.png` has six frames across each, with their times.
- `poster`: the poster frame, for the review page and the delivery.
- `contact`: optional, up to 30 times for the delivery's contact sheet (defaults to `keys`).

A long film's sheets carry on in `keys-2.png` and `strips-2.png`, so each reads at its own size. Without the draft
command, `node PLUGIN/scripts/tools/sheets.mjs <draft.mp4> docs/review/r<n>` makes them.

## Scores (1–10)

Each score is judged against its standard in the guides: what good looks like, what lowers it, and what each score
means. The review's card (`PLUGIN/guides/cards/review.md`, read once a session) has each standard's checklist and
scale: score from it, and open the full standard when a score sits on the line (a 7 or an 8), or to find a fault's
fix. Judge the film as agency-grade work
(`PLUGIN/guides/README.md`, "Agency-grade"): one that only avoids faults, with plain frames and a still world, isn't
an 8. A score judges what the checks can't: a film whose checks are clear can still read slowly, move without
weight or tell its story badly.

| Score | `--scores` key | The question | Standard |
|---|---|---|---|
| Hook | `hook` | Do the first seconds earn the rest? | `PLUGIN/guides/story/hooks.md` |
| Reads at a glance | `phone` | Does it read at a glance on the key sheet, at a phone's width: one thing at a time, the eye led to it? | `PLUGIN/guides/design/readability.md` |
| Motion quality | `motion` | Weight, a job for every move, one personality, invisible seams | `PLUGIN/guides/motion/quality.md` |
| Variety | `variety` | Something new every few seconds, no device repeated | `PLUGIN/guides/motion/variety.md` |
| Composition | `composition` | One focal point, balance, margins and safe areas, a system | `PLUGIN/guides/design/layout.md` |
| Brand accuracy | `brand` | The kit's colours, fonts, logo, motion and real assets | `PLUGIN/guides/design/brand.md` |
| Sync | `sync` | To the voiceover; with no voiceover, to the beat grid, or pacing and read time | `PLUGIN/guides/audio/sync.md` |
| Story | `story` | One clear message, a hook whose promise is paid off, one clear ask | `PLUGIN/guides/story/principles.md` |

A score is a floor, not the verdict: the user's eye decides. Write down what the user says, so later rounds meet the
higher bar.

## The log: `docs/review_log.md`

Round 0 lists problems fixed on snapshot stills before the first render. Then, for each round (a round of fixes is
headed with its stretches, "Round 2 — fixes at 12.4–13.0 s", and scores from its fix sheet):

```markdown
## Round 1 — draft r1

| Hook | Glance | Motion | Variety | Composition | Brand | Sync | Story |
|---|---|---|---|---|---|---|---|
| … | … | … | … | … | … | … | … |

Checks: 0 must fix; the should fix fixed, or kept and why.

Motion notes: the film against the Motion quality standard (`PLUGIN/guides/motion/quality.md`: weight, jobs,
hierarchy, reading at full speed, seams, cleanness), and what each transition does, in a few lines. The checks test
the planned timings; these notes judge the feel.

Worst problems:
1. **12.4–13.0 s:** what is wrong, and where.
2. …
3. …

Fixes: what changed; confirmed in the next round's sheets.
```

The user's notes get a section per version, each with how it was applied. End with "What I'd improve next".

## The user's video review

Once a draft passes the loop, the user reviews it on its review page. The review agent writes its file; the
conversation shows the page and reads the review.

1. Write `videos/<project>/review/v<N>/review.json` pointing at the whole draft and its poster, which the draft
   command made (paths are relative to the project folder), with the storyboard's scenes as chapters, a short summary
   and, from v2, what changed. Writing it publishes the page (an agent writes it with the shell, and reports).

   ```json
   {
     "version": 1,
     "title": "Example Co: the slow roast",
     "video": "renders/drafts/example-co_v1_draft_r3.mp4",
     "poster": "renders/drafts/example-co_v1_draft_r3.png",
     "summary": "What this draft is, and anything to look out for.",
     "changes": "Only from v2: what changed since the last draft.",
     "created": "2026-10-14T12:00:00Z",
     "duration": 26.0,
     "size": { "width": 1920, "height": 1080 },
     "chapters": [{ "time": 0, "title": "The hook" }, { "time": 4.2, "title": "The slow way" }]
   }
   ```

   `poster` and `changes` are optional. `version` must match the folder (`v2` → `2`): a video shows up once it does.
2. Show the page `/videos/<project>/review/v<N>/` (production skill, "Showing a page") with the scores and what you'd
   improve next, from the agent's report. Flag every departure from the brief or the approved storyboard (the build's
   `docs/decisions.md` lists its changes to the scene plans; the page itself lists the checks' findings kept on
   purpose, with why). Then wait for the review in the background and end your turn.
3. When the review comes in (the wait finishes, or the user says they've saved), read `feedback.json` beside
   `review.json` (never write it yourself): `decision` (`approved` or `changes`: it's approved unless the user adds
   notes; a save from before the page had only these two can say `undecided`), `notes` (each with `time` in seconds
   and `text`; a note pointed at the picture also has `box` `{ x, y, w, h }` or `arrow` `{ from: [x, y], to: [x, y] }`,
   fractions of the picture from its top-left, and `picture`, the frame at that time with the mark drawn on it, such as
   `points/p1a2b3c.jpg`) and `general`. Look at every note's picture (Read tool) before changing anything: it shows
   exactly what they mean.
   - `approved` means go to the master and deliverables (production skill), treating any notes as small last tweaks:
     the review agent makes them first.
   - `changes` means video v<N+1>, made by the review agent: start it on the overview (`studio.mjs progress <project>
     video <N+1> build`), apply every note (times are seconds into the video: look at each moment) through the build
     skill, check, then a fix sheet of the changed scenes (`studio.mjs draft <project> --at <each changed scene's
     stretch>`, before being video v<N>'s draft), and when the scores hold, the whole draft for its review page.
