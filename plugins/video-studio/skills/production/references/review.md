# The review loop

Claude reviews every draft before the user sees it. Always review the rendered file, never the code.

## A round

1. `HF check` must show 0 errors; read the warnings.
2. Render a draft: `node PLUGIN/scripts/studio.mjs render -- --quality draft --fps 30 --output
   renders/drafts/<project>_v1_draft_r1.mp4` (`HF render`, pinned, with its progress on the video's overview).
3. Make the review sheets from it:
   `node PLUGIN/scripts/tools/sheets.mjs renders/drafts/<project>_v1_draft_r1.mp4 docs/review/r1`
4. Look at every sheet (Read tool) and score the round.
5. Log it, then put the scores and the three worst problems on the video's overview in one call (`studio.mjs progress
   <project> fixes --round <n> --scores … --fix "<where>: <what>"`, production skill, "Work in progress"). Fix them
   and start the next round.

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

| Score | The question |
|---|---|
| Hook | Do the first 3 seconds grab? |
| Readability at phone size | Does every line read on the 360 px sheet? |
| Motion quality | Weight, easing, anticipation, follow-through |
| Variety | Something new every 2–4 s, and no device repeated |
| Composition | Balance and margins; nothing cramped or empty |
| Brand accuracy | Colour, type, logo and motion identity |
| Sync | To the voiceover; with no voiceover, to the beat grid, or pacing and read time |

A score is a floor, not the verdict: the user's eye decides. Write down what the user says, so later rounds meet the
higher bar.

## The log: `docs/review_log.md`

Round 0 lists problems fixed on snapshot stills before the first render. Then, for each round:

```markdown
## Round 1 — draft r1

| Hook | Phone | Motion | Variety | Composition | Brand | Sync |
|---|---|---|---|---|---|---|
| … | … | … | … | … | … | … |

Worst problems:
1. **12.4–13.0 s:** what is wrong, and where.
2. …
3. …

Fixes: what changed; confirmed in the next round's sheets.
```

The user's notes get a section per version, each with how it was applied. End with "What I'd improve next".

## Sharing a draft: `review/v<N>/review.json`

Once a draft passes the loop, the user reviews it on its review page. Write one `review.json` per draft you share
(paths are relative to the project folder):

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
The page writes `feedback.json` beside it when the user saves:
`decision` (`approved` or `changes`: it's approved unless the user adds notes; a save from before the page had only
these two can say `undecided`), `notes` (each with `time` in seconds and `text`; a note pointed at the picture also
has `box` `{ x, y, w, h }` or `arrow` `{ from: [x, y], to: [x, y] }`, fractions of the picture from its top-left, and
`picture`, the frame at that time with the mark drawn on it, such as `points/p1a2b3c.jpg`) and `general`.

## Motion audit: `docs/motion_audit.md`

Check the film against the `/motion-design` quality checklist (visual, technical and emotional quality, and
performance), and table what each transition does.
