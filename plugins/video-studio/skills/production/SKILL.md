---
name: production
description: Wyzowl Video Studio production process for making, changing, reviewing, rendering, delivering and tidying up videos inside a Wyzowl Video Studio folder (one with studio.json) - the stages and approvals, the clock, the pages, work in progress, sharing and delivery. Use for any video work in a studio; it brings in the script, storyboard, build, review and brand-kit skills and the plugin's guides when needed.
---

# Wyzowl Video Studio: production

Every video goes through the same stages, with three approvals from the user: the **script** (before the storyboard),
the **storyboard** (before anything is built) and the **video** (before the final render). This skill is the
process: what happens in which order, and who approves it. How each thing is made is in the stage skills (script,
storyboard, build, review, brand-kit) and the guides they point to. Every film must be agency-grade.

**Paths.** `PLUGIN` means this plugin's folder: the session-start note calls it "Plugin files", and commands see it as
`${CLAUDE_PLUGIN_ROOT}`. `HF` means
`HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 npx --yes hyperframes@0.8.149`: the HyperFrames Video Studio
is tested with, which every new project starts on, with its two switches (no anonymous usage data, and no check for a
newer release: Video Studio chooses the version). A project made on an earlier version keeps it: its `package.json`
scripts name it, so run `npm run check` there with the same two switches before it, and `studio.mjs render` follows
its `render` script. Render with
`node PLUGIN/scripts/studio.mjs render -- …` (the same options as `HF render`), from the video's folder: it shows the
render's progress on the video's overview ("Work in progress" below). Always run HyperFrames with its version: without
one, npx fetches the newest release on every run.

**Guides.** `PLUGIN/guides/` holds Video Studio's know-how, one subject to a file: the HyperFrames format and
commands, motion, the animation libraries, design, story and the types of video, captions, sound, footage, the
library and imports. `PLUGIN/guides/README.md` is the index, with the review's standards. Read the guide a job
needs, not all of them.

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
     `HF transcribe inputs/vo.wav --engine parakeet`; correct misheard words against the script; run
     `node PLUGIN/scripts/tools/vo-check.mjs inputs/vo.wav <transcript>` and fix drifted words; check key cue words by
     ear; save `inputs/transcript_verified.json`.
   - **A voiceover to come** (`voiceover: supplied` in the brief): once the script is approved, ask the user to have the
     approved voiceover read (the copy button at the top of the script page, **Copy the voiceover**, gives them its
     words) and to put the file in `inputs/` (give the full path). Wait for it. Then it's the recorded voiceover:
     follow the step above, correcting misheard words against the approved script.
   - **No voiceover:** a beat grid is the clock. `TEMPO` and a `PRE` lead-in, with beat *b* at
     `PRE + b × 60 / TEMPO`. Write every cue in beats, so re-timing is one change.
   - **Footage** (`type: footage`): the cut's own speech is the clock. Each kept range plays at its own pace, and
     everything else is timed to the scan's word times, moved to where each range sits in the cut.
4. **Storyboard.** Follow the video-studio:storyboard skill. Build nothing until every scene is approved.
5. **Build.** Follow the video-studio:build skill: it turns the approved storyboard into the video (the code, the
   library items, the sound) and changes nothing the user approved without flagging it.
6. **Review loop.** Follow the video-studio:review skill: draft renders, review sheets, eight scores against the
   guides' standards, fixes, and at least two rounds until every score is 8 or more. Nothing goes to the user before
   this.
7. **Video review.** Share the reviewed render on its review page, where the user pins notes to moments in the video
   and saves: it's Approve video unless they add notes, which switch it to Changes needed (they can change it). The
   pages call it "the video" (Video v1, v2…), so do the same when you talk to the user. The review skill ("The
   user's video review") has the page's file, how to share it and what to do with the notes. `approved` goes to
   stage 8; `changes` goes back through the build and the review loop as video v<N+1>.
8. **Master and deliverables**, only after the user approves the video. See "Deliverables". Then show its delivery
   page `/videos/<project>/delivery/` ("Showing a page"): the final video and every file made with it, the words to
   go with it, and what they might ask for next.
9. **Other sizes**, only after sign-off and only when asked: separate compositions in the same project that reuse the
   timeline, audio and assets. Re-lay out type and composition for each format (`PLUGIN/guides/design/layout.md`);
   by default they're never cropped or letterboxed.
10. **Revisions.** A new version suffix (`_v2`); keep the previous files; motion or feel changes come with a
    side-by-side before/after. If the user has edited in the HyperFrames app, follow "The HyperFrames app" below.

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
decision: a script or video is approved unless there are notes, and so is each storyboard scene unless it has a
note), so carry on straight away without asking them to confirm. If they tell you they've saved ("I've saved my
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
  --round 1 --scores hook=8,phone=6,motion=7,variety=8,composition=8,brand=9,sync=7,story=8 --fix "12.4–13.0 s: the
  whip pan lands a beat late" --fix "Phone size: the source line is too small to read"`. Up to five fixes, each
  `<where>: <what>`, in plain words: the user reads them.
- Writing the stage's result (`script.json`, `storyboard.json`, `review.json`, or the final video's web copy) ends
  it. If you stop a stage without one, end it: `studio.mjs progress <project> --end`.

Pages: `/` (dashboard), `/brands/<slug>/` (a brand), `/videos/<project>/` (a video's overview: what's happening now
and every script, storyboard and video), `/videos/<project>/script/` (latest script),
`/videos/<project>/storyboard/` (latest storyboard), `/videos/<project>/review/` (latest video review) and
`/videos/<project>/delivery/` (the final video and every file made with it). After a finished review, the page takes the user to the video's overview, which says what
you're making while you work on it.

## The library

The studio's library (`/library/`) holds ready-made items in seven categories: widgets, layouts, text effects,
transitions, data, interface and forms. The script and storyboard suggest them, and the build skill builds them in
("Library items"). Items from the full library work the same way once a licence key has unlocked them on this Mac.
When the user gives you a key, run `node PLUGIN/scripts/studio.mjs licence <key>` and tell them what it says;
`studio.mjs licence` alone gives the state. A locked item can't be built in: `studio.mjs library <code>` says so, and
you suggest a listed one instead.

## Sharing outside the studio

The pages only run on the user's Mac, so someone outside the studio (a client, say) reviews a download instead:
the download button at the top of a script or storyboard page (**Download PDF**), or of a video's review page
(**Download video**). Each PDF asks for replies by row or scene number. The user puts the feedback that comes back on
the same page, usually pasted into **Anything else?**, which asks for changes just as a note does, and saves it, so it
reaches you the usual way.

- If the user asks you for a PDF, run `node PLUGIN/scripts/studio.mjs pdf /videos/<project>/script/v<N>/` (or
  `…/storyboard/v<N>/`). It saves the PDF in that version's folder and prints its path: give it as a link. For a
  video under review, give its file (`video` in its `review.json`).
- If they paste or attach outside feedback in the chat instead, go straight on: treat it as that version's review
  (changes, unless they say it's approved) and say where each point applies (row, scene or moment). The page won't
  show a saved review, so say in the next version's `changes` that the feedback came from outside the studio.

## The HyperFrames app

The user can open any video in HyperFrames' own app (`HF preview`) to look at it and edit it on its timeline.
- **Their edits are kept.** Opening the app re-saves `index.html` (it adds `data-hf-id` attributes). Re-read the file
  before editing, run `HF catch-up` after they've edited, check `HF history`, and bracket each round of your edits with
  `HF history begin --who claude --label "…"` and `HF history end`, so the user's own edits are never overwritten.
  In build-script projects a rebuild overwrites app edits: carry them into `src/`.
- **Talk before changing.** A message that names a change gets the change. A note on the built film ("the intro
  feels jolty") gets its cause found, the measurable thing changed, and a line on what moved. A question that names no
  change gets an answer and no edit; "don't change anything" or "just thinking" gets no edit at all, with any fix
  offered in words; an idea with no concrete change gets two or three options, one recommended, before anything is
  touched.
- **A timeline that reads** is the build skill's (one kind of thing per track, one caption track).
- The app draws two safe boxes, action-safe (90% of the frame) and title-safe (80%); Video Studio's own margins are in
  `PLUGIN/guides/numbers.md`, "Safe areas".

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

- `renders/<project>_<size>.mp4`, the 60 fps master: `node PLUGIN/scripts/studio.mjs render -- --quality delivery
  --fps 60 --output renders/<project>_<size>.mp4`, after `studio.mjs progress <project> final <version> master`.
  `<size>` is `16x9`, `1x1`, `4x5`, `9x16` or `WxH`.
- `node PLUGIN/scripts/tools/sheets.mjs renders/<project>_<size>.mp4 --deliver` makes the `_web.mp4` copy (H.264,
  CRF 19, faststart), `poster.png`, `thumbnail.jpg` (1280 px, for YouTube and link previews) and `contact.png`.
- Captions, when the video has speech: `node PLUGIN/scripts/tools/captions.mjs inputs/transcript_verified.json` (from
  the video's folder) makes `renders/<project>.srt` and `.vtt`. Pass `--offset <seconds>` when the voiceover starts
  later in the video. For a footage video, write the cut's word times (each word moved to where its range sits in the
  cut) to `docs/words.json` and use that.
- `renders/delivery.json`, the words to go with it: `{ "title": "…", "description": "…", "altText": "…" }`, written for
  the platform the brief names (`PLUGIN/guides/story/post-words.md`). The delivery page shows them, each with a Copy
  button.
- `docs/review_log.md` and `docs/motion_audit.md` (review skill).
- Say what you would improve next.

## Tidying up

A finished video still keeps what it needed while it was being made: draft renders, review stills, the storyboard
versions the approved one replaced, footage previews and its edit history in HyperFrames (up to 2 GB). The delivery
page and Studio health offer to tidy it up; tidy only when the user asks.
1. Run `node PLUGIN/scripts/studio.mjs tidy <project>` and show the user what it lists: what goes, what stays and the
   space it frees. For every finished video at once, `tidy --all`; for the edit history of deleted videos alone,
   `tidy --deleted`.
2. Ask before going on (AskUserQuestion, header "Tidy up": "Tidy it up" or "Keep everything"): deleting can't be
   undone.
3. On a yes, run it again with `--yes` and say what was freed.

It refuses while you're still working on the video. A video with no final render isn't tidied unless the user asks
for that video by name, knowing what it removes (`--unfinished`).

## Old outside skills

Studios set up before Video Studio had its own guides also hold HyperFrames' skills and LottieFiles' motion-design
skill (in `.claude/skills`, `.agents/skills` and `skills-lock.json`). Video Studio's own skills and guides replace
them, so follow those. Studio health lists them; remove them only when the user asks:
1. Run `node PLUGIN/scripts/studio.mjs skills` and show the user what it lists.
2. Ask before going on (AskUserQuestion, header "Old skills": "Remove them" or "Keep them"): removing can't be undone.
3. On a yes, run it again with `--remove --yes` and say what was removed. Nothing else in the studio is touched.
