---
name: review
description: Review a built Wyzowl Video Studio video - Claude's draft rounds scored against the guides' eight standards until every score is 8 or more, then the user's video review on its review page. Use after every build or fix, before any video goes to the user, and whenever a video review comes in (the wait finishes, or the user says they've saved).
---

# Review

Claude reviews every draft before the user sees it, then the user reviews it on its page. The review judges taste:
anything a check can measure is the checks' (`HF check`, and Video Studio's checks as they arrive). Always review the
rendered file, never the code. `PLUGIN` and `HF` are as in the production skill.

## A round

1. `HF check` must show 0 errors; read the warnings.
2. Render a draft: `node PLUGIN/scripts/studio.mjs render -- --quality draft --fps 30 --output
   renders/drafts/<project>_v1_draft_r1.mp4` (`HF render`, pinned, with its progress on the video's overview).
3. Make the review sheets from it:
   `node PLUGIN/scripts/tools/sheets.mjs renders/drafts/<project>_v1_draft_r1.mp4 docs/review/r1`
4. Look at every sheet (Read tool) and score the round against the standards (below).
5. Log it, then put the scores and the three worst problems on the video's overview in one call (`studio.mjs progress
   <project> fixes --round <n> --scores … --fix "<where>: <what>"`, production skill, "Work in progress"). Fix them
   (build skill, "Changes after a review") and start the next round.

Repeat until every score is 8 or more, with at least two rounds. Only then show the user.

## Sheets

`docs/beats.json` names the moments to grab. `sheets.mjs` only does the grabbing:

```json
{
  "keys": [1.6, 4.6, 9.2],
  "strips": { "whip": [12.4, 13.0] },
  "poster": 9.2,
  "contact": [0.8, 2.6, 4.6, 9.2]
}
```

- `keys`: one time per voiceover sentence (on its key word) or per story beat. These make `keys.png`, and `phone.png`
  at 360 px wide.
- `strips`: the start and end of each fast move. Each makes a 12-frame `strip_<name>.png`.
- `poster`: the poster frame for delivery.
- `contact`: optional, up to 30 times for the contact sheet (defaults to `keys`).

## Scores (1–10)

Each score is judged against its standard in the guides: what good looks like, what lowers it, and what each score
means. Read the standard before scoring it. Judge the film as agency-grade work (`PLUGIN/guides/README.md`,
"Agency-grade"): one that only avoids faults, with plain frames and a still world, isn't an 8.

| Score | `--scores` key | The question | Standard |
|---|---|---|---|
| Hook | `hook` | Do the first seconds earn the rest? | `PLUGIN/guides/story/hooks.md` |
| Readability at phone size | `phone` | Does every word read at a glance on the 360 px sheet, in time? | `PLUGIN/guides/design/readability.md` |
| Motion quality | `motion` | Weight, a job for every move, one personality, invisible seams | `PLUGIN/guides/motion/quality.md` |
| Variety | `variety` | Something new every few seconds, no device repeated | `PLUGIN/guides/motion/variety.md` |
| Composition | `composition` | One focal point, balance, margins and safe areas, a system | `PLUGIN/guides/design/layout.md` |
| Brand accuracy | `brand` | The kit's colours, fonts, logo, motion and real assets | `PLUGIN/guides/design/brand.md` |
| Sync | `sync` | To the voiceover; with no voiceover, to the beat grid, or pacing and read time | `PLUGIN/guides/audio/sync.md` |
| Story | `story` | One clear message, a hook whose promise is paid off, one clear ask | `PLUGIN/guides/story/principles.md` |

A score is a floor, not the verdict: the user's eye decides. Write down what the user says, so later rounds meet the
higher bar.

## The log: `docs/review_log.md`

Round 0 lists problems fixed on snapshot stills before the first render. Then, for each round:

```markdown
## Round 1 — draft r1

| Hook | Phone | Motion | Variety | Composition | Brand | Sync | Story |
|---|---|---|---|---|---|---|---|
| … | … | … | … | … | … | … | … |

Worst problems:
1. **12.4–13.0 s:** what is wrong, and where.
2. …
3. …

Fixes: what changed; confirmed in the next round's sheets.
```

The user's notes get a section per version, each with how it was applied. End with "What I'd improve next".

## Motion audit: `docs/motion_audit.md`

Check the film against the Motion quality standard (`PLUGIN/guides/motion/quality.md`: weight, jobs, hierarchy,
reading at full speed, seams, cleanness), and table what each transition does.

## The user's video review

Once a draft passes the loop, the user reviews it on its review page.

1. Render the video and its poster, then write `videos/<project>/review/v<N>/review.json` pointing at them (paths are
   relative to the project folder), with the storyboard's scenes as chapters, a short summary and, from v2, what
   changed. Writing it publishes the page.

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
   improve next. Flag every departure from the brief or the approved storyboard (the build's `docs/decisions.md` lists its changes to
   the scene plans). Then wait for the review in the
   background and end your turn.
3. When the review comes in (the wait finishes, or the user says they've saved), read `feedback.json` beside
   `review.json` (never write it yourself): `decision` (`approved` or `changes`: it's approved unless the user adds
   notes; a save from before the page had only these two can say `undecided`), `notes` (each with `time` in seconds
   and `text`; a note pointed at the picture also has `box` `{ x, y, w, h }` or `arrow` `{ from: [x, y], to: [x, y] }`,
   fractions of the picture from its top-left, and `picture`, the frame at that time with the mark drawn on it, such as
   `points/p1a2b3c.jpg`) and `general`. Look at every note's picture (Read tool) before changing anything: it shows
   exactly what they mean.
   - `approved` means go to the master and deliverables (production skill), treating any notes as small last tweaks.
   - `changes` means apply every note (times are seconds into the video: look at each moment) through the build
     skill, run the review loop again, and share the result as review v<N+1>: start it on the overview with
     `studio.mjs progress <project> video <N+1> notes`.
