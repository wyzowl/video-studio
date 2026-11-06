---
name: storyboard
description: Make the scene-by-scene storyboard that a Wyzowl Video Studio user approves before a video is built - real frames in the brand at the video's size, a review page where each scene is approved unless it gets a note, and new versions until every scene is approved. Use once the script is approved and the timing settled, and whenever a storyboard review comes in (the wait for it finishes, or the user says they've saved).
---

# Storyboard

The storyboard is the plan the user signs off before anything is built: every scene with 1–5 frames, its timing and
words, and what happens. The studio's review page shows it; every scene is approved unless the user adds a note to it
(**+ Note** on the scene, or **Box** or **Arrow** on a frame) and saves (the button says **Approve and save**, or
**Send feedback** once there's feedback), which writes `feedback.json` beside the storyboard. Nothing is built until
every scene is approved.

Sound effects aren't part of the storyboard: they're made with the video, once there's something on screen to sync
them to (`PLUGIN/guides/audio/sfx.md`).

`PLUGIN` is this plugin's folder ("Plugin files" in the session-start note). The storyboard makes every design and
motion decision the build will follow, so its craft is in the guides: what each scene decides
(`PLUGIN/guides/story/beats.md`), the frame's design (`PLUGIN/guides/design/`, with the Composition, Readability and
Brand accuracy standards), the motion (`PLUGIN/guides/motion/README.md`: the film's personality, scene patterns,
techniques and transitions, with the Motion and Variety standards), and the type of video
(`PLUGIN/guides/story/types/`). Name each scene's pattern and moves in its description in the guides' own words, so
the build can look them up (`PLUGIN/guides/motion/README.md`, "Planning with names").

**Read first,** once a session: the storyboard's card, `PLUGIN/guides/cards/storyboard.md` (the beat, design and motion
guides and the numbers on a page, and when to open each in full); `PLUGIN/guides/design/illustration.md` for an
animated video; and each scene pattern you use (`PLUGIN/guides/motion/patterns/`).

## Files

```
videos/<project>/storyboard/v<N>/
  frames.html       every frame as a still, at the video's real size
  frames/           PNGs rendered from frames.html
  stills/, clips/   footage videos only: stills taken from the footage, and each scene's rough cut
  storyboard.json   scenes, frames and notes; the review page is built from it
  feedback.json     written by the review page when the user saves; never write or edit it yourself
```

## Make version 1

Start it on the video's overview (production skill, "Work in progress"):
`node PLUGIN/scripts/studio.mjs progress <project> storyboard 1 plan` (or `voice` first, while you make or time the
voiceover); rendering the frames marks `frames`, then `check`, by itself.

1. **Plan the scenes** from the approved script (script skill) and the timing: usually 3–12, each roughly 2–8
   seconds. The script's rows are the beats, and their `scene` numbers group them into scenes; carry each scene's
   voiceover or text on screen over exactly as approved, and use its action on screen for what happens. With a
   voiceover, scenes start and end at sentence or phrase gaps (use the verified word times). With music, on bar lines.
   **Write each scene's plan** as you go (`PLUGIN/guides/story/beats.md`, "The scene plan"): its idea in the film's
   world, its depth and atmosphere, its moves with their times, named as the guides name them, its sound and how it
   hands on. Scene 1's plan also writes down the film's drawing style. The plan is what the build follows, and the
   user can open it under each scene.
2. **Choose 1–5 frames per scene**: as many as it takes to show how the scene works (where it starts, the key moment,
   how it leaves). One frame for a simple hold; four or five for a scene with a big move.
   **Library items:** carry over every one the script names (`[W03]` and so on), and suggest more where a scene would
   be clearer or richer with one, from what `node PLUGIN/scripts/studio.mjs library` lists (script skill, "Library
   items"). Items can share a scene (build skill, "Library items"). Show each in its frames as it will
   look. Make a still of it at the video's size and lay it over the frame (several in the order they draw, the base
   first), every item's in one go: from the version's folder,
   `node PLUGIN/scripts/studio.mjs library stills -` with the list on stdin (a heredoc) or in a file,
   `[{ "code": "W03", "at": 2.5, "out": "items/s02-w03.png", "set": { "number": "48" } }]` (`at`: seconds into the
   item; `set`: its words and options), in the video's brand and size. Name each in the scene's description by its
   code in square brackets; the page shows it as a link to the item.
3. **Build `frames.html`.** Design these as the real layouts, in the brand kit's fonts, colours, backgrounds and logo
   files, with the real words. The build will reuse them. Each frame is an element with `data-frame="<scene>-<n>"` sized exactly
   to the video, and frames are still: no animation or transitions. Show motion with position, blur trails or
   arrows where it helps.
   ```html
   <!doctype html>
   <html><head><meta charset="utf-8"><style>
     @font-face { font-family: "Display"; src: url("../../assets/fonts/<display>.woff2"); font-weight: 1 1000; }
     :root { --bg: #0f3d2e; --fg: #f4ede1; --accent: #c8743b; }
     body { margin: 0; background: #777; }
     [data-frame] { position: relative; overflow: hidden; width: 1920px; height: 1080px; margin: 0 0 40px;
                    background: var(--bg); color: var(--fg); font-family: "Display", sans-serif; }
   </style></head><body>
     <section data-frame="s01-1"><!-- scene 1, opening moment --></section>
     <section data-frame="s01-2"><!-- scene 1, key moment --></section>
   </body></html>
   ```
4. **Render the frames:**
   `node PLUGIN/scripts/render-frames.mjs videos/<project>/storyboard/v1/frames.html videos/<project>/storyboard/v1/frames`
   It makes `frames/contact.png` too, every frame at a phone's width with its id: look them over there (Read tool),
   opening a single frame only for detail, and fix layout, legibility and brand problems before the user sees them.
   For a footage video, see "From footage" below: the frames are real stills, and each scene gets a rough cut.
5. **Write `storyboard.json` last** (format below). Writing it publishes the review page, and the studio tells you
   its address, so the frames must be rendered and checked first.
6. **Share it:** show the page `/videos/<project>/storyboard/v1/` (see "Showing a page" in the production skill):
   its link, then wait for the review in the background. Say in one sentence how to review:
   every scene is approved unless it has a note, so press + Note on any that needs changing, then press Send feedback
   (Approve and save, if every scene is right), and you'll take it from there. End your turn.

## From footage

A footage video's storyboard is made the same way, from the approved script's takes: its frames are real stills from
the footage, and each scene has a rough cut the page plays. Follow `PLUGIN/guides/footage/storyboard.md`.

## When the review comes in

The wait finishes when the user saves a finished review (or they tell you they've saved). That save is their
go-ahead: carry on without asking them to confirm. Read `feedback.json`. A scene's feedback is its `note`, its
`points`, or both: each point is a note on one of its frames (`frame`, `text`, a `box` or an `arrow` in fractions of the
frame, x and y from its top-left, and `picture`, the frame with their mark drawn on it, in the version's `points/`
folder). Look at every point's picture (Read tool) before changing that frame: it shows exactly what they mean.
- **Every scene approved, and no general notes:** confirm, then build it (build skill; production skill, stage 5).
- **Feedback on some scenes, or general notes** (the page counts general notes as asking for changes; feedback from
  someone outside the studio is often pasted there, naming scenes by number): make the next version. If the general
  notes turn out to ask for nothing (just praise, say), tell the user and go to the build stage instead.
  0. Start it on the overview: `studio.mjs progress <project> storyboard <N+1> plan`.
  1. Copy `v<N>` to `v<N+1>` (leave `v<N>` and its feedback untouched) and delete the copy's `feedback.json`, its
     `points/` folder and any PDF (a download's copy). The copy stays out of sight until its `storyboard.json` says `"version": N+1`.
  2. Apply every note in the copy's `frames.html`. A general note can touch several scenes.
  3. Re-render only the frames that changed (`--only s02-1,s02-2`) and check them on the contact sheet, which then
     holds those alone.
  4. Last, update the new `storyboard.json`: mark scenes you changed `"changed": true`; mark scenes that were approved
     and are unchanged `"carriedApproval": true` (they start as Approved for the user); clear both flags on the rest.
     Write `"changes"`: a sentence or two on what changed and why. Set `"version"` to N+1 in the same write: that
     publishes the page. Then show it the same way.
- **Scenes saved "unreviewed"** (only in a save from before the page dropped Not reviewed) **and no feedback:** ask
  the user to finish reviewing, with the link.
- If a note is unclear, ask before making a new version.

## storyboard.json

```json
{
  "version": 1,
  "title": "Example Co: the slow roast",
  "summary": "The idea in a paragraph: what the film does and how it flows.",
  "size": { "width": 1920, "height": 1080 },
  "duration": 32.4,
  "created": "2026-10-14T11:00:00Z",
  "changes": "Only from v2: what changed since the last version.",
  "scenes": [
    {
      "id": "s01",
      "title": "The hook",
      "start": 0,
      "end": 4.2,
      "voiceover": "Most coffee is roasted fast.",
      "onScreen": "Roasted fast",
      "description": "What happens and how it moves, including the transition into the next scene.",
      "plan": {
        "idea": "The roaster's floor at dawn: the film's world, and the drum as this scene's hero.",
        "style": "Scene 1 only: 3 px strokes, 20 px corners, flat fills with one shade, the accent for heat.",
        "depth": "Back: the warehouse wall and its high window. Middle: the drum. Front: sacks at the edge.",
        "atmosphere": "A warm glow behind the drum, breathing; dust in the window's light, drifting.",
        "moves": "0.0–1.2 s the drum spins up (camera-push in)\n1.2–3.4 s Roasted fast slams in on its word",
        "sound": "The drum's whir from SFX Kit under the first line; a hit on Roasted fast.",
        "handover": "The steam rises and carries the camera up into s02."
      },
      "frames": [
        { "src": "frames/s01-1.png", "time": 0.4, "caption": "Opening" },
        { "src": "frames/s01-2.png", "time": 3.6, "caption": "Into the bean" }
      ],
      "changed": false,
      "carriedApproval": false
    }
  ]
}
```

- `id` is stable across versions (`s01`, `s02`, …); give a new scene a new id rather than renumbering.
- `plan`: the scene's plan in plain words (`PLUGIN/guides/story/beats.md`, "The scene plan"): `idea`, `style` (scene
  1), `feeling`, `technique`, `depth`, `atmosphere`, `moves`, `sound` and `handover`, each a string (a line break
  starts a new line). The page shows them under **The plan**.
- Times are seconds of video time. `voiceover`, `onScreen` and `notes` are optional; `description` is not.
- `frames[].src` is relative to the version folder. Use 1 to 5 frames.
- `clip` (footage): the scene's rough cut, relative to the version folder (`clips/s01.mp4`). The page shows **Play
  the scene** when there is one.
