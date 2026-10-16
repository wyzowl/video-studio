---
name: script
description: Write the script a Wyzowl Video Studio user approves before the storyboard - a row per beat with the voiceover (or the text on screen) beside what happens on screen, shown on a review page where they can note any cell, then approve it or ask for changes. Use once the brief is settled, before any storyboard, and whenever a script review comes in (the wait for it finishes, or the user says they've saved).
---

# Script

The script is the story the user approves before anything is drawn: what's said (or shown as text) and what happens
on screen, beat by beat, in plain words. The studio's review page shows it as a table: **#**, **Voiceover** (or
**Text on screen** without a voiceover) and **Action on screen**. The user can leave a note on any cell and add general
notes. The decision starts on **Approve script** and switches to **Changes needed** when they add a note (a general
comment counts); they save, which writes `feedback.json` beside the script. No storyboard is made until the script is
approved. The page also downloads the script as a PDF, for someone outside the studio (production skill, "Sharing
outside the studio").

`PLUGIN` is this plugin's folder ("Plugin files" in the session-start note). If a script-writing skill is available
(for example wyzowl-explainer-script), follow its craft for the writing; this skill sets the format and the review.

## Files

```
videos/<project>/script/v<N>/
  script.json     the script; the review page is built from it
  feedback.json   written by the review page when the user saves; never write or edit it yourself
```

## Write version 1

1. **Know the story first.** Read the brief (`BRIEF.md`): who it's for, the one message, the call to action, the
   length and the tone. If something that changes the story is missing, ask before writing.
2. **Where the words come from:**
   - **Recorded voiceover** (supplied by the user): transcribe it first (production skill, stage 3) and use the clean
     take: no retakes, false starts or anything that will be cut. The voiceover column is that transcript, word for
     word; set `"recorded": true`.
   - **Footage with speech** (an interview, a presenter): transcribe it the same way and write the cut you propose:
     the lines that stay, in order, as the voiceover, clean of retakes and anything that will be cut. The action
     column says which footage plays.
   - **AI voiceover** (`voiceover: ai`): write the voiceover. Once the script is approved, the AI voice reads exactly
     that.
   - **No voiceover:** set `"mode": "text"`. The second column is the text on screen, word for word, in each row's
     `onScreen`.
3. **A row per beat.** Every row is a scene, or one moment of one: when several things happen in a scene, give each
   its own row and split the voiceover across them, carrying a sentence on with ellipses ("Manage your work…",
   "…track tasks…"). Each row's words then match its action, so it's easy to see whether there's enough motion for
   the words. People refer to rows by number ("in row 4…").
4. **Voiceover:** write for the ear. Talk to one person, one or two sentences a row, lead with what they get, open
   with a hook and end with a clear call to action.
5. **Action on screen:** the director's notes, in the present tense ("We see…", "Zoom through…", "The logo
   animates on"). For an animated video, describe the scene and its motion, and how each beat flows into the next.
   For a footage video, say what plays, what's added on top (text, graphics) and the transitions. Put collaborative
   notes in parentheses.
6. **Bold every word that appears on screen** with `**…**`, in either column. The page shows it bold, and it's how
   the user and the build know what becomes text. With a voiceover, a row's on-screen text is always bold in its
   action cell.
7. **Library items.** Suggest the studio's ready-made items wherever one makes a beat clearer or richer, so every
   video gets them without anyone having to ask (see "Library items" below).
8. **Length:** the page counts the voiceover's words and shows the length: 135 words is about 60 seconds. Aim for the
   brief's length, and say in `summary` if the script runs long or short.
9. **Write `script.json` last** (format below). Writing it publishes the review page, and the studio tells you how to
   show it.
10. **Share it** (production skill, "Showing a page"): beside the chat, with its card and link, then wait for the
    review in the background. Say in one sentence how to review: read it, click any cell to leave a note (that
    switches the decision to Changes needed), then press Save review. Mention any library items you've suggested: each
    is a link on the page to see it in the video's brand. End your turn.

## Library items

The studio's library holds widgets (cards that show information), layouts (ways to show the presenter beside a screen
or other clips), text effects, transitions (ways to move from one scene to the next) and data (full-screen charts and
graphs), each with a code and each dressed in the video's brand at the video's size.

- **Only what's available:** run `node PLUGIN/scripts/studio.mjs library` and pick from what it lists. A category with
  nothing in it yet says so; design those moments yourself, as usual. Items from the full library appear there once a
  licence key has unlocked them on this Mac; until then the list ends with a count of the locked ones. Suggest only
  listed items, and if the user wants something only a locked item does, say it's in the full library.
- **Where they fit:**
  - a figure the presenter quotes: W03 Stat, a card over the footage;
  - a figure that deserves the whole screen: D03 Big stat;
  - a few things compared on one measure: D01 Bar chart;
  - how something changed over time: D02 Line chart;
  - a list of what's included or needed: W02 Checklist;
  - tips or reasons worked through one at a time: W05 Numbered points;
  - who's speaking, the first time someone appears on camera: W26 Name tag;
  - where we are in a process, or chapters: W01 Process tracker;
  - a website, app or tool being shown: L01 Split screen;
  - a product demo on a laptop, beside the presenter or on its own: L07 Laptop demo;
  - a product's range at a glance, several pages or features under the voiceover: L15 Floating screenshots;
  - one word that sums up a moment with the presenter filling the frame: T01 Words behind;
  - the one word a scene turns on, slammed in full screen: T10 Punch;
  - a figure inside a sentence, full screen, rolling up to its value: T46 Number roll.
  - a move from one scene to the next, written in the action cell of the row where the new scene starts:
    - a calm, designed hand-over, such as into a chapter or a chart: X01 Corner squares;
    - moving on to something new, with energy: X17 Stripe sweep;
    - the next scene grows out of something in this one (a face, a button, a number): X19 Iris from a point;
    - this scene turns out to be part of the next (a screen on a laptop, a photo in a frame): X05 Pull back.
  - Widgets, transitions and data suit any video. L01 and T01 need a presenter, so they suit only footage of one;
    L07 works with or without, and L15, T10 and T46 suit any video.
  - Not every cut needs a transition. Use them where the video moves on, and let related beats simply cut.
- **Write it into the action cell** by its code in square brackets, with what it shows, for example:
  `[W03] **48%** of customers chose the yearly plan`. The page shows each as a link that opens the item in the
  video's brand and size; PDFs show its name.
- **Use them where they help the viewer, and combine them freely:** a wall of work with captions over it, quick-fire
  widgets one after another, big words on one of the brand's colours with a stat beside them. When several share a
  moment, write them all in that row's action cell, saying which sits on top and where (`studio.mjs library` marks
  each item over footage or full frame). Make sure they don't clash: nothing covers the words or the presenter's
  face, and each stays on screen long enough to read. Every figure needs its source.

## When the review comes in

The wait finishes when the user saves a decision (or they tell you they've saved). That save is their go-ahead: carry
on without asking them to confirm. Read `feedback.json`: `decision` (`approved` or `changes`), `notes` (each with
`row`, the number the page showed, `column` and `text`) and `general`.

- **Approved:** carry any notes into the next stages as small last tweaks, and say how you applied them. Then go on:
  for an AI voiceover, make it from the approved voiceover (production skill, stage 3); then the storyboard
  (storyboard skill), from the approved script.
- **Changes needed:** write version N+1.
  1. Leave `v<N>` and its feedback as they are. Apply every note: a note's `row` is the number the user saw in
     `v<N>`, and rows may move in the new version.
  2. Write `script/v<N+1>/script.json` with `"version"` N+1 and `"changes"`: a sentence or two on what changed and
     why. Writing it publishes the page; share it the same way.
- If a note is unclear, ask before writing a new version.

## script.json

```json
{
  "version": 1,
  "title": "Example Co: the slow roast",
  "summary": "The story in a paragraph: what the video says and how it flows.",
  "mode": "voiceover",
  "recorded": false,
  "created": "2026-10-14T11:00:00Z",
  "changes": "Only from v2: what changed since the last version.",
  "rows": [
    {
      "id": "r01",
      "scene": 1,
      "voiceover": "Most coffee is **roasted fast**…",
      "action": "Close on a roaster's drum spinning at speed. **Roasted fast** slams in, top left, and shakes."
    },
    {
      "id": "r02",
      "scene": 1,
      "voiceover": "…and you can taste it.",
      "action": "The drum slows; steam curls up and settles. (Keep the cut gentle here.)"
    }
  ]
}
```

- `mode`: `voiceover` (the default), or `text` without a voiceover: then each row's words are in `onScreen`.
- `id`: a row's id (`r01`, `r02`…), kept for a row across versions where it can be. `scene` groups rows into the
  storyboard's scenes.
- `recorded`: true when the voiceover is a recording. The page then says its words can't change without a new
  recording.
- `voiceover`, `onScreen` and `action` are plain text: `**…**` marks on-screen text, and a line break starts a new
  line.
