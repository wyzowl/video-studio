---
name: production
description: Wyzowl Video Studio production rules for making, changing, reviewing, rendering and delivering videos inside a Wyzowl Video Studio folder (one with studio.json). Use for any video work in a studio, together with the HyperFrames skills; it brings in the script, storyboard and brand-kit skills when needed.
---

# Wyzowl Video Studio: production

Every video goes through the same stages, with three approvals from the user: the **script** (before the storyboard),
the **storyboard** (before anything is built) and the **video** (before the final render). These rules sit on top of the HyperFrames skills: enter through
`/hyperframes`, which routes animated videos to `/general-video`. Every film must be agency-grade.

**Paths.** `PLUGIN` means this plugin's folder: the session-start note calls it "Plugin files", and commands see it as
`${CLAUDE_PLUGIN_ROOT}`. `HF` means `npx --yes hyperframes@0.8.149`, the HyperFrames Video Studio is tested with, which
every new project starts on. A project made on an earlier version keeps it: its `package.json` scripts name it, so use
`npm run check` there, and `studio.mjs render` follows its `render` script. Render with
`node PLUGIN/scripts/studio.mjs render -- …` (the same options as `HF render`), from the video's folder: it shows the
render's progress on the video's overview ("Work in progress" below). Always run HyperFrames with its version: without
one, npx fetches the newest release on every run.

## Stages

1. **Brief.** `/video-studio:new-video` asks the questions and writes `BRIEF.md`. Treat it as the truth: don't ask
   again for anything it answers. Its Request section is the user's own words, shown on the video's overview: never
   edit it (put later changes in Notes). Read the brand kit (`brands/<brand>/brand.json`) before designing anything.
2. **Script.** Follow the video-studio:script skill: the written script (the voiceover or the text on screen, and
   what happens on screen, a row per beat) on its review page. No storyboard until the user approves the script. With
   a recorded voiceover, transcribe it first (stage 3) and write the script from the clean take. With footage, scan
   it first ("Footage videos" below) and write the script from its takes.
3. **Voiceover and timing.** One master clock per video:
   - **Recorded voiceover** (`inputs/vo.wav`): it's the clock. Never re-time or edit it. Get word times with
     `HF transcribe inputs/vo.wav --engine parakeet`; correct misheard words against the script; run
     `node PLUGIN/scripts/tools/vo-check.mjs inputs/vo.wav <transcript>` and fix drifted words; check key cue words by
     ear; save `inputs/transcript_verified.json`.
   - **AI voiceover** (`voiceover: ai` in the brief): once the script is approved, make it from the approved
     script's voiceover (see "AI voiceover" below). The generated file becomes the recorded voiceover, then follow the
     step above.
   - **No voiceover:** a beat grid is the clock. `TEMPO` and a `PRE` lead-in, with beat *b* at
     `PRE + b × 60 / TEMPO`. Write every cue in beats, so re-timing is one change.
   - **Footage** (`type: footage`): the cut's own speech is the clock. Each kept range plays at its own pace, and
     everything else is timed to the scan's word times, moved to where each range sits in the cut.
4. **Storyboard.** Follow the video-studio:storyboard skill. Build nothing until every scene is approved.
5. **Build.** Start it on the overview (`studio.mjs progress <project> video 1 build`, "Work in progress" below), then
   mark `check` and each round's steps as you go. One `index.html` with a pure `render(t)` on one paused GSAP clock, or
   `src/` plus a build script that
   generates `index.html` for bigger films. Reuse the approved storyboard frames' layouts. `HF check` must show
   0 errors. Check stills with `HF snapshot --at <times> --describe false` before the first render. A footage video is built as clips
   instead ("Footage videos" below).
6. **Sound.** Music: use a supplied track if there is one; otherwise propose a music bed, never add one silently.
   Sound effects come from SFX Kit and are made with the video, as much as the brief calls for: the user first hears
   them in the video, and asks for changes there. See `references/audio.md`.
7. **Review loop.** Draft renders, review sheets, seven scores, fixes, and at least two rounds until every score is 8
   or more. See `references/review.md`. Nothing goes to the user before this.
8. **Video review.** Share the reviewed render on its review page, where the user pins notes to moments in the video
   and saves: it's Approve video unless they add notes, which switch it to Changes needed (they can change it). The
   pages call it "the video" (Video v1, v2…), so do the same when you talk to the user:
   - Once the video and its poster are rendered, write `videos/<project>/review/v<N>/review.json` pointing at them
     (format in `references/review.md`), with the storyboard's scenes as chapters, a short summary and, from v2, what
     changed. Writing it publishes the page.
   - Show the page `/videos/<project>/review/v<N>/` (see "Showing a page") with the scores and what you'd improve
     next. Flag every departure from the brief or the approved storyboard. Then wait for the review in the
     background and end your turn.
   - When the review comes in (the wait finishes, or the user says they've saved), read `feedback.json` beside
     `review.json` (never write it yourself). A note may point at something in the picture: a `box` or an `arrow`
     (fractions of the picture, x and y from its top-left) and a `picture`, that moment with their mark drawn on it
     (in the review's `points/` folder). Look at every note's picture (Read tool) before changing anything: it shows
     exactly what they mean.
     `approved` means go to stage 9, treating any notes as small last tweaks. `changes` means apply every note (times
     are seconds into the video: look at each moment), run the review loop again, and share the result as review
     v<N+1>: start it on the overview with `studio.mjs progress <project> video <N+1> notes`.
9. **Master and deliverables**, only after the user approves the video. See "Deliverables". Then show its delivery
   page `/videos/<project>/delivery/` ("Showing a page"): the final video and every file made with it, the words to
   go with it, and what they might ask for next.
10. **Other sizes**, only after sign-off and only when asked: separate compositions in the same project that reuse the
   timeline, audio and assets. Re-lay out type and composition for each format; never crop or letterbox.
11. **Revisions.** A new version suffix (`_v2`); keep the previous files; motion or feel changes come with a
    side-by-side before/after. If the user has edited in HyperFrames Studio, follow "Studio" below.

## Footage videos

A footage video goes through the same stages: brief, script, storyboard, build, review loop and video review. The
footage sets the size, and its speech is the clock.

1. **Scan the footage first**, before the script: `node PLUGIN/scripts/tools/footage.mjs scan` in the project folder.
   - It reads every clip in `inputs/footage/`: its length, its size (after any phone rotation), frame rate and
     sound.
   - It makes light preview copies and a contact sheet of each clip.
   - Where there's speech, it transcribes it with word times (`footage/transcripts/<clip>.json`), and writes notes
     marking the pauses, umms and possible retakes (`<clip>.md`).
   - It lists all of it in `footage/footage.json`.

   Read every clip's notes and look at every sheet (Read tool) before choosing anything. The scan also gives the
   video's size, from the footage: put it in `BRIEF.md` (`size`, `aspect`). Clips of another shape are cropped to fill
   it, never letterboxed; a horizontal video stays horizontal. Footage of the same moment from several cameras isn't
   cut between: use one camera's clips, and say so if the user gives more.
2. **The script** is the cut you propose, from the takes (script skill: `"mode": "footage"`, each row's `source`).
3. **The storyboard** shows real stills and plays each scene's rough cut (storyboard skill, "From footage").
4. **Build the cut** in HyperFrames' clip-and-track structure, so the user can open it in HyperFrames Studio and
   adjust it:
   - one `<video>` per kept range: `data-start` where it sits in the video, `data-media-start` its in point and
     `data-duration` its length, with `data-has-audio="true"` so its sound plays;
   - B-roll as muted `<video>` clips on the track above;
   - library items, captions and titles on the tracks above those.

   Use the original files in `inputs/footage/`, not the previews.
   - Cut in the pauses: a beat after the last word and before the next, never mid-word, and keep breaths natural.
     Hide a jump cut inside a take with a punch-in (scale the next range by about 1.1) or B-roll over it.
   - Anything timed to the words (captions, items' cues) takes the scan's word times, moved to the cut: time in the
     video = the range's `data-start` + the word's time − the range's in point.
   - Sound: the speech leads. Music sits under it and ducks while people speak (`references/audio.md`); B-roll's own
     sound stays off unless it's the point.
   - Check every join: transcribe the draft (`HF transcribe`) and compare its words with the script's, so no word is
     clipped, doubled or missing; and look at the cuts with `HF snapshot --describe false`.

## Showing a page

Whenever the user's feedback or approval is needed (a brand kit, a script, a storyboard, a video) or something new is ready,
show them its page. When you write a page's file (`brand.json`, `storyboard.json` or `review.json`) with your Write
or Edit tool, the studio tells you how. Otherwise run `node PLUGIN/scripts/studio.mjs show <path>` (it starts the
page server; only one studio's server runs at a time). Follow what it says:
1. Open the page in your Browser pane, beside the chat. Never navigate away from a page with feedback the user hasn't
   saved (the studio warns you about one): open a new tab instead.
2. Show the card it gives you, with your show_widget tool (Claude desktop app), and directly under it a labelled
   link, such as `[Open storyboard v2 ↗](address)`, never a bare address. The link opens the page in their browser;
   the card can't hold a working link, since the app opens nothing from a card. Without show_widget, the link alone.
3. For a script, storyboard or video, wait for the review in the background: `studio.mjs wait <path>` with
   run_in_background. Tell the user to save their review when they're done (the button at the foot of the page) and
   you'll take it from there, then end your turn.

When the wait finishes, you're woken with the review. Saving a review is the user's go-ahead (each page saves a
decision: a script or video is approved unless there are notes, and so is each storyboard scene unless it's marked
Feedback), so carry on straight away without asking them to confirm. If they tell you they've saved ("I've saved my
notes on the video", "Video approved") before the wait finishes, carry on the same way; act on each review once.

Open pages refresh themselves when their files change, keeping anything the user hasn't saved, and an older
script, storyboard or video offers the newer one. There's no need to reopen a page after an edit.

## Work in progress

While you make a script, a storyboard, a version of the video or the final video, its overview shows the work as it
happens: the stage's steps, a count for the slow ones, the newest frames and, in the review loop, Video Studio's own
scores. So the user can always see that something is happening, mark the work as you go:

- **Start each stage** as you begin it: `node PLUGIN/scripts/studio.mjs progress <project> <stage> <version> <step>`.
  The stage is `script`, `storyboard`, `video` (a version for review) or `final` (once the video is approved, with
  the approved version's number).
- **Mark each next step** as you start it: `studio.mjs progress <project> <step>`. The steps, in order:
  - script: `brief` (v1) or `notes` (later versions), `scan` (footage), `draft`, `length`;
  - storyboard: `notes` (later versions), `voice` (making or timing the voiceover), `plan`, `frames`, `clips`
    (footage), `check`;
  - video: `notes` (later versions), `build`, `check`, `render`, `sheets`, `scores`, `fixes`;
  - final: `master`, `extras`.
- **The tools mark their own steps and counts:** `render-frames.mjs` (the frames as they're made), `footage.mjs` (the
  scan, stills and rough cuts), `studio.mjs render` (frames rendered and the time left) and `sheets.mjs` (the newest
  key frames, or the poster).
- **After scoring a round,** give the scores and what you'll fix, in one call: `studio.mjs progress <project> fixes
  --round 1 --scores hook=8,phone=6,motion=7,variety=8,composition=8,brand=9,sync=7 --fix "12.4–13.0 s: the whip
  pan lands a beat late" --fix "Phone size: the source line is too small to read"`. Up to five fixes, each
  `<where>: <what>`, in plain words: the user reads them.
- Writing the stage's result (`script.json`, `storyboard.json`, `review.json`, or the final video's web copy) ends
  it. If you stop a stage without one, end it: `studio.mjs progress <project> --end`.

Pages: `/` (dashboard), `/brands/<slug>/` (a brand), `/videos/<project>/` (a video's overview: what's happening now
and every script, storyboard and video), `/videos/<project>/script/` (latest script),
`/videos/<project>/storyboard/` (latest storyboard), `/videos/<project>/review/` (latest video review) and
`/videos/<project>/delivery/` (the final video and every file made with it). After a finished review, the page takes the user to the video's overview, which says what
you're making while you work on it.

## Library items

The studio's library (`/library/`) holds ready-made HyperFrames blocks in five categories: widgets (cards that show
information over footage), layouts (ways to show the presenter beside a screen or other clips), text effects,
transitions (ways to move from one scene to the next) and data (full-screen charts and graphs). Each item has a code
whose letter is its category (W03, L01, T01; X for transitions, D for data), takes its colours, fonts and corner
rounding from a brand kit, and lays itself out for every size. Suggest them yourself: in the script (script skill,
"Library items") and the storyboard, from what `studio.mjs library` lists, so videos get them without anyone asking.
To build one in, whether you suggested it or the user named it:

1. Run `node PLUGIN/scripts/studio.mjs library <code> --brand <brand> --size <16x9|1x1|4x5|9x16>`. It gives the block's
   file, a clip for `index.html` with the brand's settings filled in, the fonts it needs and the words it takes.
2. Copy the block into the project's `compositions/`, add the clip where it plays, and set its words and options in
   `data-variable-values`; its `duration` matches the clip's `data-duration`. Time cues (ticks, current points,
   highlights) to the voiceover's words.
3. Media (L01, L07, L15, T01): write each file as the `src` of its element in the copy and remove the elements you
   don't use.
   T01 needs a cut-out of the presenter, made on the Mac:
   `HF remove-background <segment>.mp4 -o <segment>_cutout.webm`, from the same cut of footage (the model downloads
   once; setup offers it). Check a few frames: anything the cut-out wrongly keeps or drops (a mic arm, a held phone)
   shows in front of or behind the word. Then measure the head: `node PLUGIN/scripts/tools/head-top.mjs
   <segment>_cutout.webm --size <W>x<H>` and pass its `headTop`. The word then sits so the head covers at most half of
   it, which keeps it readable; never place it by hand so the head covers more.
4. Keep the item's motion and look: the brand kit dresses it, so don't restyle it by hand. Its colours can be any
   others from the same kit, such as a full-frame item on the brand's accent: set its colour settings to those
   colours and keep its words readable (4.5:1 contrast at body size, 3:1 for large type). If something doesn't fit
   the brand, fix the kit's `style` (brand-kit skill). `HF check` as usual.
5. Widgets over a presenter go on the side they aren't facing. Each stays on screen for at least 3 seconds or twice
   its reading time; a quick-fire run, one after another, can go faster when it's meant to be glanced at.
6. Data items, and the other words that fill the frame (T10, T46 and the rest `studio.mjs library` marks full frame),
   fill the screen in the brand's colours. Give figures their real values and source; if a transition follows, set
   `exit` to `"hold"` so the scene stays whole until the transition takes it.
7. Transitions come in two kinds, and `studio.mjs library <code>` gives the steps for each:
   - **Covers the cut** (X01, X17): a block on top of both scenes, placed after them in `index.html`. Scene A's clip
     ends and scene B's starts at the transition's cut, behind it.
   - **Both scenes** (X05, X19): a recipe for the main timeline, since a block can't move the scenes around it. Paste
     its layer and script into `index.html` once, wrap each scene in a plain full-frame element (B after A in the
     page), overlap the two for the transition's length, and call it on the main timeline with the two scenes and its
     options, such as where the iris opens or where scene A lands in scene B.
8. **Combine them.** Items work together, at once or one after another:
   - a full-frame item as a scene's base, with items that sit over footage on top (a wall of work with captions over
     it, a chart with a name tag);
   - widgets one after another, quick-fire, or side by side;
   - a ground of one of the brand's colours (a full-frame element in `index.html`), with big words, a widget and
     captions over it.

   `studio.mjs library` marks each item over footage or full frame. Each is its own clip with its own id (a second
   copy of an item gets a new id, as below). Later clips in `index.html` draw on top, so put the base first;
   `data-track-index` is only Studio's timeline row, so give each item playing at once its own. Make them work
   together: nothing covers the words, another item's key part or the presenter's face (move one with its options,
   such as `side`, or time them apart), their entrances don't all land at once, and each stays on screen long enough
   to read. Look at the moments they overlap in snapshots.

To use one twice in a video, copy it under a new id (change its id everywhere in the copy).

Items from the full library work the same way once a licence key has unlocked them on this Mac. When the user gives you
a key, run `node PLUGIN/scripts/studio.mjs licence <key>` and tell them what it says; `studio.mjs licence` alone gives
the state. A locked item can't be built in: `studio.mjs library <code>` says so, and you suggest a listed one instead.

## Sharing outside the studio

The pages only run on the user's Mac, so someone outside the studio (a client, say) reviews a download instead:
**Download PDF** on a script or storyboard page, or **Download video** on a video's review page. Each PDF asks for replies by
row or scene number. The user puts the feedback that comes back on the same page, usually pasted into **Anything
else?**, which asks for changes just as a note does, and saves it, so it reaches you the usual way.

- If the user asks you for a PDF, run `node PLUGIN/scripts/studio.mjs pdf /videos/<project>/script/v<N>/` (or
  `…/storyboard/v<N>/`). It saves the PDF in that version's folder and prints its path: give it as a link. For a
  video under review, give its file (`video` in its `review.json`).
- If they paste or attach outside feedback in the chat instead, go straight on: treat it as that version's review
  (changes, unless they say it's approved) and say where each point applies (row, scene or moment). The page won't
  show a saved review, so say in the next version's `changes` that the feedback came from outside the studio.

## Rules

**Size.** The brief's size is the master. Build layouts from variables (safe areas, type scale) so other sizes are a
layout change, not a rebuild. Check text at phone width for 9:16, 4:5 and 1:1.

**Timing.** A key word on screen arrives on (or a hair before) the word being spoken. Change shots at sentence or
phrase boundaries, never mid-word. On music, change scenes on bar lines.

**Look: banned defaults.**
- No centred title on a gradient, no "everything fades in", no corner labels or frame borders, no glow on UI chrome,
  no generic particle bursts, no stock-looking blobs.
- One display face and one UI/body face. One accent colour unless the brand says otherwise.
- Something new happens on screen every 2–4 seconds; nothing sits dead while the voiceover talks.
- Brand fonts: use a variable version if there is one, resting on the brand's weight, so width and weight can animate.
  Measure glyph ink rather than guessing when an animated element replaces part of a letter.

**Motion.** Load `/motion-design` with `/hyperframes-animation` for any motion work.
- One personality per film, from the brand kit's motion identity: signature easing, a three-step duration palette, one
  entrance pattern.
- Every big move gets anticipation (100–200 ms wind-up the other way). Every impact gets secondary action: the surface,
  neighbours or camera react 30–100 ms later at 30–50% amplitude, big enough to see.
- Travel on arcs; overshoot and correct like a hand would. Nothing moves linearly; a tiny overshoot on UI only.
- Three layers in every shot: primary, secondary, and ambient (slow, 10–20% amplitude).
- Never opacity alone for a state change: pair fades with scale or position. Stagger related elements.
- Deterministic only: no `Math.random`, `Date.now`, timers or CSS transitions in render; seeded noise.

**Truth and assets.**
- Real facts only: every number, stat, quote or claim comes from the script, brief or client data, exactly as given.
  Never invent, round or "improve" a figure. If one is missing, ask, or use a clearly marked placeholder.
- Real brand assets only: never redraw a logo or product UI. If an asset is missing, ask for it or leave a clearly
  marked placeholder.

**References.** If `inputs/refs/` or `brands/<brand>/refs/` exists, extract a frame every 0.5 s with ffmpeg, then
write `docs/style_guide.md` (palette, type, shot lengths, transitions, camera, texture, how text enters and exits).
Take the reference's grammar, never its content.

**Local only.** Render on this Mac. Never use `hyperframes cloud`, `publish`, Lambda or Cloud Run, and never ask the
user to sign in to HeyGen. `studio.mjs render` uses the graphics chip on Apple silicon by itself. Ask before
`HF skills update`; never change skills silently.

**Studio.** Opening HyperFrames Studio re-saves `index.html` (it adds `data-hf-id` attributes). Re-read before editing,
check `HF history`, and bracket each round of edits with `HF history begin --who claude --label "…"` and
`HF history end`, so the user's own Studio edits are never overwritten. In build-script projects, a rebuild overwrites
Studio edits: carry them into `src/`.

## AI voiceover

Only when the brief says `voiceover: ai`. Use HyperFrames' built-in voices unless the user asks for something else.
- **Built-in voices** (the default: free, on this Mac, no account): `HF tts --list` shows them. Make a short sample line
  in two or three likely voices, for example `HF tts "<first line>" --voice bf_emma --output inputs/voice-samples/bf_emma.wav`,
  and let the user pick. Their links on the studio pages are `/videos/<project>/inputs/voice-samples/<voice>.wav`.
  Then generate the whole script: `HF tts inputs/script.txt --voice <voice> --output inputs/vo.wav` (`--speed` if
  needed).
- **A voice made elsewhere:** if the user wants one, they supply the file. Save it as `inputs/vo.wav`.
- Record the voice in `BRIEF.md` (for example `voice: bf_emma`). Then treat the file as a recorded voiceover.

## Deliverables

- `renders/<project>_<size>.mp4`, the 60 fps master: `node PLUGIN/scripts/studio.mjs render -- --quality delivery
  --fps 60 --output renders/<project>_<size>.mp4`, after `studio.mjs progress <project> final <version> master`.
  `<size>` is `16x9`, `1x1`, `4x5`, `9x16` or `WxH`.
- `node PLUGIN/scripts/tools/sheets.mjs renders/<project>_<size>.mp4 --deliver` makes the `_web.mp4` copy (H.264,
  CRF 19, faststart), `poster.png`, `thumbnail.jpg` (1280 px, for YouTube and link previews) and `contact.png`.
- Captions, when the video has speech: `node PLUGIN/scripts/tools/captions.mjs inputs/transcript_verified.json` (from
  the video's folder) makes `renders/<project>.srt` and `.vtt`. Pass `--offset <seconds>` when the voiceover starts
  later in the video. For a footage video, write the cut's word times (each word moved to where its range sits in the
  cut) to `docs/words.json` and use that.
- `renders/delivery.json`, the words to go with it: `{ "title": "…", "description": "…", "altText": "…" }`. The
  description is a sentence or two for a post or a web page; the alt text says what's seen, in one sentence, for
  someone who can't see it. The delivery page shows them, each with a Copy button.
- `docs/review_log.md` and `docs/motion_audit.md`.
- Say what you would improve next.

## References

- `references/review.md`: the review loop (sheets, `beats.json`, scores, logs, motion audit).
- `references/audio.md`: levels, sound effects from SFX Kit, the score kit, ducking and loudness checks.
- `references/gotchas.md`: HyperFrames problems that each cost a render round to find.
