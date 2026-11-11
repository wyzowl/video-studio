---
name: production
description: Wyzowl Video Studio production process for making, changing, reviewing, rendering, delivering and tidying up videos inside a Wyzowl Video Studio folder (one with studio.json) - the stages and approvals, the clock, the pages, work in progress, sharing and delivery. Use for any video work in a studio; it brings in the script, storyboard, build, review and brand-kit skills and the plugin's guides when needed.
---

# Wyzowl Video Studio: production

Every video goes through the same stages, with three approvals from the user: the **script** (before the storyboard),
the **storyboard** (before anything is built) and the **video** (before the final render). This skill is the
process: what happens in which order, and who approves it. How each thing is made is in the stage skills (script,
storyboard, build, review, brand-kit) and the guides they point to. Every film must be agency-grade
(`PLUGIN/guides/README.md`, "Agency-grade").

**Paths.** `PLUGIN` means this plugin's folder: the session-start note calls it "Plugin files", and commands see it as
`${CLAUDE_PLUGIN_ROOT}`. `HF` means
`HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 npx --yes hyperframes@0.9.16`: the HyperFrames Video Studio
is tested with, which every new project starts on, with its two switches (no anonymous usage data, and no check for a
newer release: Video Studio chooses the version). A project made on an earlier version keeps it: its `package.json`
scripts name it, so run `npm run check` there with the same two switches before it, and `studio.mjs render` follows
its `render` script. Drafts and the final video are made by `studio.mjs draft` and `final` (review skill;
"Deliverables" below); any other render runs as `node PLUGIN/scripts/studio.mjs render -- …` (the same options as `HF
render`), from the video's folder, which shows its progress on the video's overview ("Work in progress" below) and
prints one line on the file it made. Always run HyperFrames with its version: without one, npx fetches the newest
release on every run.

**Commands.** Chain commands that need no judgement in between into one shell call with `&&` (copying several library
blocks into a project; the effects track and the levelling; a storyboard's frames and its items' stills), and read
their output together.

**Guides.** `PLUGIN/guides/` holds Video Studio's know-how, one subject to a file: the HyperFrames format and
commands, motion, the animation libraries, design, story and the types of video, captions, sound, footage, the
library and imports. `PLUGIN/guides/README.md` is the index, with the review's standards. Each stage skill reads its
card first, once a session (`PLUGIN/guides/cards/<stage>.md`: the essentials of its guides on a page, and when to open
each in full), then other guides as the job needs.

## Stages

1. **Brief.** `/video-studio:new-video` asks the questions and writes `BRIEF.md`. Treat it as the truth: don't ask
   again for anything it answers. Its Request section is the user's own words, shown on the video's overview: never
   edit it (put later changes in Notes). Read the brand kit (`brands/<brand>/brand.json`) before designing anything.
   Its scenes stand on the brand's backgrounds (`backgrounds`, the main one first), each where its `use` says, with
   the text colour it gives.
2. **Script.** Follow the video-studio:script skill: the written script (the voiceover or the text on screen, and
   what happens on screen, a row per beat) on its review page. No storyboard until the user approves the script. With
   a recorded voiceover, transcribe it first (stage 3) and write the script from the clean take. With footage, scan
   it first ("Footage videos" below) and write the script from its takes.
3. **Voiceover and timing.** One master clock per video:
   - **Recorded voiceover** (`inputs/vo.wav`): it's the clock. Never re-time or edit it. Get word times with
     `HF transcribe inputs/vo.wav --engine parakeet --json`. Once the script is approved,
     `node PLUGIN/scripts/studio.mjs words <project> --correct` writes `inputs/transcript_verified.json`, the approved
     script's words on the times heard, and lists what it corrected and what to check. Fix any word it flags as
     drifted in that file, and check key cue words by ear.
   - **A voiceover to come** (`voiceover: supplied` in the brief): once the script is approved, ask the user to have the
     approved voiceover read (the copy button at the top of the script page, **Copy the voiceover**, gives them its
     words) and to put the file in `inputs/` (give the full path). Wait for it. Then it's the recorded voiceover:
     follow the step above, correcting misheard words against the approved script.
   - **No voiceover:** a beat grid is the clock. `TEMPO` and a `PRE` lead-in, with beat *b* at
     `PRE + b × 60 / TEMPO`. Write every cue in beats, so re-timing is one change.
   - **Footage** (`type: footage`): the cut's own speech is the clock. Each kept range plays at its own pace, and
     everything else is timed to the scan's word times, moved to where each range sits in the cut. Once the cut is
     built, `studio.mjs words <project>` lists its words in the film's time (`--cut` writes `docs/words.json`; `draft`
     and `final` keep it up to date).
4. **Storyboard.** Follow the video-studio:storyboard skill. Build nothing until every scene is approved.
5. **Build.** Follow the video-studio:build skill: it turns the approved storyboard into the video (the code, the
   library items, the sound) and changes nothing the user approved without flagging it.
6. **Review loop.** Follow the video-studio:review skill: a draft and its sheets (`studio.mjs draft`), eight scores
   against the guides' standards, and rounds of fixes until every score is 8 or more (round 1 can pass by itself).
   Nothing goes to the user before this.
7. **Video review.** Share the reviewed render on its review page, where the user pins notes to moments in the video
   and saves: it's Approve video unless they add notes, which switch it to Changes needed (they can change it). The
   pages call it "the video" (Video v1, v2…), so do the same when you talk to the user. The review skill ("The
   user's video review") has the page's file, how to share it and what to do with the notes. `approved` goes to
   stage 8; `changes` goes back through the build and the review loop as video v<N+1>.
8. **Master and deliverables**, only after the user approves the video: `studio.mjs final <project>` ("Deliverables").
   Then show its delivery page `/videos/<project>/delivery/` ("Showing a page"): the final video and every file made
   with it, the words to go with it, and what they might ask for next.
9. **Other sizes**, only after sign-off and only when asked: separate compositions in the same project that reuse the
   timeline, audio and assets. Re-lay out type and composition for each format (`PLUGIN/guides/design/layout.md`);
   by default they're never cropped or letterboxed.
10. **Revisions.** A new version suffix (`_v2`); keep the previous files; motion or feel changes come with a
    side-by-side before/after. If the user has edited in the HyperFrames app, follow `PLUGIN/guides/studio/app.md`.

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
   it rather than letterboxed; a horizontal video stays horizontal. Footage of the same moment from several cameras
   isn't cut between: use one camera's clips, and say so if the user gives more.
2. **The script** is the cut you propose, from the takes (script skill: `"mode": "footage"`, each row's `source`).
   Several short videos from one long recording are cut-downs (`PLUGIN/guides/story/types/cut-downs.md`).
3. **The storyboard** shows real stills and plays each scene's rough cut (storyboard skill, "From footage").
4. **The build** cuts it in HyperFrames' clip-and-track structure (build skill, "A footage video").

## Showing a page

Whenever the user's feedback or approval is needed (a brand kit, a script, a storyboard, a video) or something new is ready,
show them its page. Writing a page's file (`brand.json`, `script.json`, `storyboard.json` or `review.json`) with your
Write or Edit tool publishes it, and the studio tells you its address. Otherwise run
`node PLUGIN/scripts/studio.mjs show <path>`, which prints it (it starts the page server; only one studio's server
runs at a time). Either way the studio checks the page's data file first and says what's wrong: fix that and show it
again (there's no need to check the file yourself). Then, as it says:
1. Start your message with a labelled link to the page, on a line of its own, such as
   `[Open storyboard v2 ↗](address)`, never a bare address, then say in a line or two what's ready. Every message with
   something new to review starts this way: the link is how the user opens it, so there's no need to open the page in
   a browser pane or draw a card for it. A message that runs on past a few lines (a delivery, say) ends with the
   same link too, on a line of its own.
2. For a script, storyboard or video, wait for the review in the background: `studio.mjs wait <path>` with
   run_in_background. Tell the user to save their review when they're done (the button at the foot of the page) and
   you'll take it from there, then end your turn.

When the wait finishes, you're woken with the review: its output is the decision and every note in the user's words,
with the pictures to look at. Go on from it (`feedback.json` holds the same). Saving a review is the user's go-ahead
(each page saves a decision: a script or video is approved unless there are notes, and so is each storyboard scene
unless it has a note), so carry on straight away without asking them to confirm. If they tell you they've saved ("I've saved my
notes on the video", "Video approved") before the wait finishes, carry on the same way; act on each review once.

Open pages refresh themselves when their files change, keeping anything the user hasn't saved, and an older
script, storyboard or video offers the newer one. There's no need to reopen a page after an edit.

## Work in progress

While you make a script, a storyboard, a version of the video or the final video, its overview shows the work as it
happens: the stage's steps, a count for the slow ones, the newest frames and, in the review loop, Video Studio's own
scores. You mark two things by hand; the studio's commands mark the steps in between.

- **Start each stage** as you begin it: `node PLUGIN/scripts/studio.mjs progress <project> <stage> <version> <step>`.
  The stage and its first step:
  - `script`: `draft` as you start writing (a later version too), or `scan` for footage (the scan marks the cut after
    it);
  - `storyboard`: `plan` (a later version too), or `voice` first while you make or time the voiceover, then `plan`
    with `studio.mjs progress <project> plan` when you start planning;
  - `video`: `build` (a later version too).
  The final video starts itself (`studio.mjs final`, "Deliverables").
- **After scoring a round,** give the scores and what you'll fix, in one call: `studio.mjs progress <project> fixes
  --round 1 --scores hook=8,phone=6,motion=7,variety=8,composition=8,brand=9,sync=7,story=8 --fix "12.4–13.0 s: the
  whip pan lands a beat late" --fix "Phone size: the source line is too small to read"`. Up to five fixes, each
  `<where>: <what>`, in plain words: the user reads them.
- **The commands mark the rest,** with their counts and newest frames: `footage.mjs` (the scan, stills and rough
  cuts), `render-frames.mjs` (the frames as they're made, then checking them), `studio.mjs check`, `studio.mjs draft`
  (the render, the sheets, then the scores), `studio.mjs final` (the master and the extras) and `studio.mjs render`
  (the frames rendered and the time left).
- Writing the stage's result (`script.json`, `storyboard.json`, `review.json`, or the final video's web copy) ends
  it. If you stop a stage without one, end it: `studio.mjs progress <project> --end`.

Pages: `/` (dashboard: what's waiting, and the videos In progress, Completed or Archived), `/brands/` (every
brand), `/brands/<slug>/` (a brand), `/videos/<project>/` (a video's overview: what's happening now
and every script, storyboard and video), `/videos/<project>/script/` (latest script),
`/videos/<project>/storyboard/` (latest storyboard), `/videos/<project>/review/` (latest video review) and
`/videos/<project>/delivery/` (the final video and every file made with it), and `/sfx/` (SFX Kit: every sound to
listen to, with its id).

A video is **In progress** until its final files are delivered, and again while anything new is made for it after
that; then it's **Completed**. Both follow the work by themselves, and the user can also mark a video complete
whatever its stage. **Archived** is the user's choice too. They do both on the dashboard or the video's overview, and
only an In progress video's reviews show as waiting. When the user asks you to, run
`node PLUGIN/scripts/studio.mjs complete <video>` (`--reopen` clears it) or `studio.mjs archive <video>` (`--restore`
brings it back); starting a stage on a video clears both by itself.

After a finished review, the page takes the user to the video's overview, which says what
you're making while you work on it.

## The library

The studio's library (`/library/`) holds ready-made items in seven categories: widgets, layouts, text effects,
transitions, data, interface and forms. The script and storyboard suggest them, and the build skill builds them in
("Library items"). Items from the full library work the same way once a licence key has unlocked them on this Mac.
When the user gives you a key, run `node PLUGIN/scripts/studio.mjs licence <key>` and tell them what it says;
`studio.mjs licence` alone gives the state. A locked item can't be built in: `studio.mjs library <code>` says so, and
you suggest a listed one instead.

## Where things come from

By default, everything is made on this Mac from the user's own material: their voiceover, footage, logos and music,
the brand kit, SFX Kit, the score kit and Video Studio's library. Render on this Mac (`studio.mjs render` uses the
graphics chip on Apple silicon by itself).
- **An outside service** (HyperFrames' cloud render, publish, Lambda or Cloud Run, HeyGen's catalogue, avatars or
  voices, a stock library, a voice or media service) isn't offered. It's used only when the user asks for it and
  connects their own account: say that it runs at their request, under that service's own terms, and keep what it
  makes in the project like any other file.
- **Media from the web** (a logo, a LUT, a sound) comes in only as the brand kit's skill allows (with the user's OK)
  or when the user asks for that file.
- **HyperFrames' own skills** aren't part of Video Studio: the guides cover what they did. Leave
  `HF skills update` alone unless the user asks for it.

## Truth and assets

- Real facts only: every number, stat, quote or claim comes from the script, brief or client data, exactly as given.
  A figure is never invented, rounded or "improved"; if one is missing, ask, or use a clearly marked placeholder
  (`PLUGIN/guides/design/data.md`).
- Real brand assets only: a logo or product interface is never redrawn from imagination. If an asset is missing, ask
  for it or leave a clearly marked placeholder (`PLUGIN/guides/design/brand.md`, "Real assets").

## Voiceovers

By default a voiceover is a file the user brings (their own recording, a voice artist's, or one they've made with a
voice service), and Video Studio doesn't offer to make one. If the user asks for an AI voice, make it with the tool
they choose (HyperFrames' local `HF tts`, or a voice service on their own account), say that it's made at their
request under that tool's terms, and then treat the file as a recorded voiceover. Don't make a stand-in voice unless
they ask for one. Keep the file as it came, and make `inputs/vo.wav` from it with ffmpeg if it's in another format.
An older video whose brief says `voiceover: ai` already has its voiceover: treat it as a recorded one, and if the file
is missing, ask the user for one.

## Deliverables

Once the user approves the video, `node PLUGIN/scripts/studio.mjs final <project>` makes everything in one go, marks it
on the overview and prints the delivery page's address:
- `renders/<project>_<size>.mp4`, the 60 fps master (`<size>` is `16x9`, `1x1`, `4x5`, `9x16` or `WxH`; a revision
  after a delivery gets `_v2`, and the files before it are kept);
- the `_web.mp4` copy (H.264, CRF 19, faststart), `poster.png`, `thumbnail.jpg` (1280 px, for YouTube and link
  previews) and `contact.png`, from `docs/beats.json`'s poster and contact times;
- the captions, when the video has speech: `renders/<project>.srt` and `.vtt`, from the verified voiceover, moved to
  where it starts in the video. For a footage video, `final` writes the cut's words to `docs/words.json` from the cut
  itself;
- the checks on the master, and the checks' last report in `docs/checks/`.

Then:
- write `renders/delivery.json`, the words to go with it: `{ "title": "…", "description": "…", "altText": "…" }`, for
  the platform the brief names (`PLUGIN/guides/story/post-words.md`). The delivery page shows them, each with a Copy
  button;
- finish `docs/review_log.md` (review skill), with its motion notes and what you would improve next;
- show the delivery page ("Showing a page"), and say what you would improve next.

`sheets.mjs <master> --deliver` (in `PLUGIN/scripts/tools/`) and `studio.mjs words <project> --captions` make those
files by themselves, for a size or a version made outside `final`.

## When the user asks for something else

- **Someone outside the studio** reviews a download (a PDF, the video), or the user pastes feedback that came back:
  `PLUGIN/guides/studio/sharing.md`.
- **The user edits in the HyperFrames app,** or asks you to open a video there: `PLUGIN/guides/studio/app.md`.
- **Tidying up** a finished video, or removing the outside skills an older setup left: `PLUGIN/guides/studio/tidying.md`.
  Both delete files, so they're done only when the user asks, after showing what goes.

