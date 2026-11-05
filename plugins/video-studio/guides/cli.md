# The commands

HyperFrames' command line, as Video Studio uses it. What the files must contain is in `format.md`.

## Running HyperFrames

`HF` means `HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 npx --yes hyperframes@0.9.16`: the version
Video Studio is tested with, with no anonymous usage data and no check for a newer release (Video Studio chooses the
version). Every new project starts on it.

- Always give the version. Without one, npx fetches the newest release on every run.
- A project made on an earlier version keeps it: its `package.json` scripts name it. Run `npm run check` there with
  the same two switches in front, and `studio.mjs render` follows its `render` script.
- Render through `node PLUGIN/scripts/studio.mjs render -- <HF render's options>`, from the video's folder: it shows
  the render's progress on the video's overview, and uses the graphics chip on Apple silicon by itself.
- Everything below runs on this Mac. HyperFrames also has commands and options that send a project, its frames or
  its sound to outside services: cloud renders, publishing, sign-in and billing, frame descriptions by an AI service
  (`snapshot --describe`), HeyGen's speech engine (`transcribe --engine heygen`), HeyGen's audio services
  (`audio --quality best`), and HyperFrames Pro's `reverse` and `templates`. One is used only when the user asks for it
  and connects their own account.
- Leave `HF update`, `HF upgrade` and `HF skills` alone: Video Studio chooses the version and installs no skills.

## The loop

1. `HF timeline --json` to see what an existing project plays, and when, instead of opening every file.
2. Write or change the files (`format.md`).
3. `HF lint` while writing, for fast feedback.
4. `node PLUGIN/scripts/studio.mjs check <video>` once a pass is done: Video Studio's checks, which run `HF check`
   (lint again first, so don't run both) with the video's settings and add their own (below).
5. `HF snapshot --at <times> --describe false` for stills of what changed, and of every scene file's middle.
6. Render a draft and review it (review skill).

Check changed moments with snapshots and keyframe strips first. A changed stretch can then be rendered by itself
(`render --start` and `--end`, below) to watch it moving; a draft for review is always the whole film. `--resume`
(with `HF_SEGMENTED_CAPTURE=true`) only recovers a render that crashed.

## init

`HYPERFRAMES_SKIP_SKILLS=1 HF init videos/<project> --non-interactive` makes a blank project at 1920×1080
(`HYPERFRAMES_SKIP_SKILLS=1` stops init installing HyperFrames' own skills). `--resolution portrait` (1080×1920) or
`square` (1080×1080); for 4:5 and other sizes, set the root's `data-width` and `data-height` afterwards. `--tailwind`
sets up Tailwind (`format.md`). Video Studio doesn't start from HyperFrames' examples: the brand kit and the library
give a video its look.

## capture

`HF capture <url> -o <folder> --json --skip-vision` saves a website as material for a video: full-page and
scrolled screenshots, its images and SVGs, its text (`extracted/visible-text.txt`), its colours and fonts
(`extracted/tokens.json`, `extracted/design-styles.json`) and its `@font-face` rules (`extracted/page.html`).
`--skip-vision` keeps the screenshots on this Mac: without it, an AI service captions them whenever an API key for
one is set.

- A non-zero exit, `"ok": false` or a `BLOCKED.md` means it failed: use nothing from its partial files, and retry
  into a fresh folder.
- `screenshots/full-page.png` is a 1× plate of the whole page at 1920 wide, sticky headers made static, taken after
  scrolling; it's skipped for pages over 16,384 px tall (use the `scroll-*.png` frames). Pushing in past 1:1 needs a
  2× capture of that part.
- "Very little text content" with no assets means the capture is unusable even when it says `ok`. A `logo-*.svg` is
  a guess from the page's structure: the brand kit's logo is the real one.
- `--timeout` bounds the page load; `--capture-budget` (default 120000 ms) the work after it.
- To show a site as it is, use its screenshots; rebuild only the part that moves.

## lint and check

Video Studio's checks are the gate before every render: `node PLUGIN/scripts/studio.mjs check <video>` (from the
studio, or with no name from the video's folder). They run `HF check --json` with the video's settings, every
storyboard frame's time and scene change as `--at`, `--at-transitions`, `--snapshots`, and on a 9:16 frame the
platforms' band as `--caption-zone`; they write the scene plans' timings as motion assertions first (below); and they
add only what HyperFrames lacks, measured against `rules.json` (`numbers.md`): type sizes for the frame, the reading
hold and the time to take in a card, words on screen at once, headlines, safe areas and a burnt-in captions' band,
the brand kit's fonts and colours, the words on screen against the approved ones and against the voice (a key word
that lands after it's said), the music against the voice and each sound's ending, and on footage words over the
face. HyperFrames' findings come as they are, never measured twice: its errors are must fix, its warnings should fix,
and what it saw at one sample only (an entrance or exit in flight) or lint's advice are notes.

- One ranked report: must fix, should fix and notes, each with its time, the element, its file and what to do,
  printed and saved as `docs/checks/film.json`; the video's overview shows it. A must fix stops the render (the
  command exits 1). A should fix is fixed, or kept with its reason in `docs/decisions.md`.
- `--render <file.mp4>` adds the rendered file: its loudness and true peak, sounds that stop dead, and a picture
  stuck in the render; on footage, words over the face (`HF measure face`, which downloads its face model once). These
  read the file alone, so they work on any MP4.
- `--script` checks the latest script instead (`docs/checks/script.json`): how long the opening takes to land, the
  words each row puts on screen, the pace against the brief's length and the longest beat.
- The attributes in `format.md` ("What check flags on purpose") quiet Video Studio's checks as they quiet
  HyperFrames': `data-layout-ignore` for texture, `data-layout-allow-overflow` and `data-layout-bleed` for a
  deliberate crop.

`HF check` (or `npm run check`) alone still gives HyperFrames' passes without Video Studio's settings. It runs lint,
then in one browser pass checks:

- **runtime**: script errors, failed requests;
- **layout**: text outside its box or the frame, text clipped by its own box, overlapping and covered text (with how
  much is covered), children escaping their clipping box, panels stuck across the frame edge, sharp canvas content at
  the edge;
- **motion**: the assertions in any `*.motion.json` beside the composition (below);
- **contrast**: WCAG AA on visible text against the real pixels behind it: 4.5:1 for body text, 3:1 for large text
  (24 px and up, or 19 px and up in bold). Each failure gives the colours, the ratio and a `suggestedColor` in the
  same family. A sample taken over a layer that's still moving is skipped;
- **craft**, sampled every eighth of a second (warnings): reading text under a type floor of 2.6% of the frame's
  short side, 28 px at 1080, held half a second or more (`text_below_floor`); a line on screen for less than three
  quarters of 0.5 s + 0.3 s a word, or 0.4 s for one or two words, and a film's last line for less than 2 s
  (`line_unread`); nothing changing for more than 3 s before the end card (`dead_stretch`); a first frame showing only
  the ground, or covered by an opaque layer, when it's the thumbnail on social players (`first_frame_empty`); and a
  film over 15 s with no sound (`film_silent`). These floors are lower than Video Studio's own (`numbers.md`): a
  craft warning is always a fault, but passing it doesn't mean the words meet ours. Text that's texture rather than
  reading takes `data-layout-ignore`, and a stillness that's meant takes `data-hold` (`format.md`);
- **audio**: sound the render would lose or play as silence.

A frame that never changes for a 3 s+ composition fails as `sweep_static` (the seek isn't driving the page); a
deliberate still composition takes `data-no-timeline` on its root. An issue seen at only one sample (an entrance or
exit in flight) is a note; one held across samples counts. Each finding has the selector, the file, the box and the
time. Each check also writes its report to `.hyperframes/artifacts/checks/<id>.json` in the project (`saved` in the
JSON).

| Option | Use |
|---|---|
| `--json` | Results to read: `{ ok, lint, runtime, layout, motion, contrast, craft, audio, snapshots, saved }` |
| `--snapshots` | Annotated frames, and a crop of every error that has a box (in `.hyperframes/artifacts/snapshots/`) |
| `--at 1.5,4,7.25` | Check these exact times (each scene's key moment) |
| `--at-transitions` | Also check every tween's start and end |
| `--samples 15` | A denser sweep (default 9) |
| `--range 12,18` | Sample only this stretch, after a change there (lint still covers the whole project; no craft pass) |
| `--components "#k-tags"` | Report only findings that involve these elements |
| `--caption-zone "x0=0;y0=.82;x1=1;y1=1;severity=error"` | Flag text in a band kept for captions or platform buttons (fractions of the frame) |
| `--frame-check` | Images, video and canvases that leave the frame |
| `--strict` | Fail on warnings too |
| `--no-contrast` | Skip contrast while iterating |

When check reports "0 samples" or "0/0 text checks", the browser never ran (a lint error): that isn't a pass. The
opt-out attributes for deliberate layering are in `format.md`. After a check, a warm check process and its Chrome stay
for five minutes so the next check starts at once, then end by themselves: leave them be.

### Motion assertions

A `<name>.motion.json` beside a composition (the same base name) makes check test what the motion is meant to do, on
the seeked timeline the render uses. Failures are errors. Video Studio's checks write `index.motion.json` from the
scene plans (marked `"generatedBy"`, and rewritten each time): each word on screen that a plan's moves name with a
time appears by then (plus half a second for its entrance), in the planned order. A motion file the build writes
itself is left alone.

```json
{
  "duration": 6,
  "assertions": [
    { "kind": "appearsBy", "selector": "#headline", "bySec": 0.5 },
    { "kind": "before", "a": "#headline", "b": "#cta" },
    { "kind": "staysInFrame", "selector": ".card" },
    { "kind": "keepsMoving", "withinSelector": ".scene", "maxStaticSec": 2 }
  ]
}
```

`appearsBy` fails when the element isn't visible (opacity 0.5 or more) by then, `before` when `a` doesn't appear
first, `staysInFrame` when it leaves the frame once visible, and `keepsMoving` when nothing moves for longer than
`maxStaticSec` (default 2 s). A selector that matches nothing fails loudly.

## snapshot

Always pass `--describe false`. Descriptions are off unless asked for (since 0.8.201), and `--describe` with anything
else sends each frame to an AI service whenever its API key is set; `false` keeps them off whatever runs.

- `HF snapshot --at 3,10.5,18 --describe false` captures those exact instants; add `--no-end` to skip the extra
  end frame. `--frames 8` takes evenly spaced frames instead, `--range 12,18` with `--frames` takes them within a
  stretch, and `--composition <id>` within one scene file's time.
- `-o <folder>` chooses where they go, and each run clears it; `--keep` adds to it instead, naming each still
  `at-<seconds>s.png`, so one moment can be taken again on its own. Without `-o`, each run goes to a new folder in
  `.hyperframes/artifacts/snapshots/`.
- `--review` takes a review set from the project, with no render: each timed clip (a scene, a library block, or an
  element marked `data-beat="<name>"`) at its start + 0.3 s and its middle, a five-frame strip around every cut
  (`review-seam-NN.jpg`), and those frames at phone width, 360 px (`review-phone.jpg`). In a one-clock film only the
  library blocks and marked beats are clips of their own.
- `--zoom "#cta"` (or `--zoom "x,y,w,h"`, with `--zoom-scale 2`) makes a sharp crop of one element or region.
- `--angle iso` (or `top`, `side`, `"yaw,pitch"`) tilts the stage to show depth and overlap.
- `--against ref.mp4` saves the reference video's frame at each time too, with a side-by-side sheet: for footage
  being rebuilt, or a reference whose grammar you're matching.
- Treat tiny unstyled text, icons blown up to the frame, missing hero elements or a registration timeout in a scene
  file's snapshot as a broken mount (`format.md`, "Scene files").

## keyframes

`HF keyframes --json [--selector '#id'] [--runtime gsap|css|anime|all]` lists the tweens and motion paths: property,
time, value and ease. `--shot motion.png --selector '#id'` draws the real element sampled across its motion (9
samples; `--samples N`), with `--layout strip` for motion in place, `--from` and `--to` for one stretch, `--angle` for
3D and `--ghost` for a canvas. In a one-clock film it sees only the clock, so look at that motion in snapshots.

## render

| Option | Use |
|---|---|
| `--quality draft` / `looks` / `delivery` | Review drafts / a first real encode (the default) / the master |
| `--fps 30` or `60` | Drafts at 30, the master at 60 (twice the time) |
| `--output <file>` | A stable name; the default is `renders/<project>_<date>_<time>.mp4` |
| `--start 14 --end 18` | Only that stretch of the film, as its own MP4 with its sound, starting at 0 (MP4, a whole frame rate of 24, 25, 30 or 60, and not HDR) |
| `-c compositions/<file>.html` | Render one scene file on its own |
| `--format webm` or `mov` | With transparency, for a piece laid over something else (`mov` is ProRes 4444; `--prores-profile hq`, `422`, `lt` or `proxy` drop the transparency); `png-sequence` for frames, `gif` (no sound, 30 fps at most) |
| `--crf <n>` or `--video-bitrate 10M` | Encoder quality, one or the other |
| `--max-bitrate 8M`, `--keyframe-interval 2` | A peak bitrate and a keyframe at least this often (seconds), for a platform that asks for them |
| `--workers <n>` | Chrome instances (about 256 MB each); fewer when memory is short |
| `--variables '{…}'`, `--batch rows.json` | Values for one render; one render per row (`--output "renders/{name}.mp4"`, never with `--variables`) |
| `--page-motion-blur off` | Leave out the film's motion blur, for a quicker look (`motion/techniques/effects.md`) |
| `--strict` | Fail on lint errors |

One render runs at a time on the Mac: a second waits for the first to finish (`--no-wait` stops it instead).

Read the line under the output path: the capture path, the GPU mode and each stage's time. Where HyperFrames' fast
capture can't draw something (a CSS `filter` such as a blur, a 3D context), it falls back to screenshot capture,
spread over several Chrome workers that encode as they go; since 0.8.183 the fallback keeps all its workers, so a
blur costs little render time. The sound's ceiling is in `audio/mixing.md`. The last lines may suggest editing on in
HyperFrames' desktop app: that's for the user to choose, not a step. Check the file afterwards: it exists, isn't
empty, and `ffprobe -v error -show_format -show_streams` gives the root's duration (and fps).

## Comparing

- `HF compare <dir-a> <dir-b> --at <seconds> --labels before,after --out compare.png` renders the same moment of two
  or more versions into one labelled sheet (up to 16): a before and after for a motion or feel change.
- `HF grade-compare --for frame.png --grades grades.json --project . --out grades.png` tries colour grades on one frame
  (`footage/grading.md`).
- `HF diff <original.mp4> <render.mp4 or project> --json` scores one against the other frame by frame: SSIM, the
  worst moments, and cuts missing or added (`--sbs` also writes a side-by-side video). For footage being rebuilt, or
  two renders of the same film.

## Measuring a video

`HF measure <what> <video>` reads a finished video on the Mac and answers in JSON: a reference the user supplied, a
render, footage. Start with `probe` (its size, frame rate, length and sound, and what to fix before measuring; a
variable frame rate takes `--normalize <copy.mp4>`).

| What | Gives |
|---|---|
| `cuts` | The hard cuts and the shots between them; flashes, whips and fast moves listed apart (`not_cuts`) |
| `events --map` | When things appear, change, disappear and hold, on a 4×4 grid, with the sound's onsets and beats, grouped into windows worth a look |
| `frames` | Pictures: an overview sheet (`--every 0.5`), chosen moments (`--at`), consecutive frames (`--range a,b`), or a strip around each event (`--events`) |
| `look` | Brightness, contrast, saturation, black-and-white share and warmth over a stretch; `--compare <video>` for another |
| `curve --roi x,y,w,h` | One element's moves on a plain ground: start, length, overshoot and the closest GSAP ease; `--compare <render>` for ours |
| `ink --at <s> --roi x,y,w,h` | The size and lines of the text in a region, in the video's pixels |
| `energy <a> <b>` | How much two clips move, and whether they move at the same moments |
| `face` | How big a face is and where, over a stretch: room for words and cards around a person |
| `sync --roi <the mouth>` | The lag between a speaker's mouth and their voice |
| `extract` | A still (`--at`) or a clip (`--from`, `--to`) cut from a video and cropped (`--roi`), as project media |

Pictures go to `.hyperframes/measure/<what>/` unless `--out` names a folder. A reference is measured for its grammar
(`design/README.md`, "Working from references"), never copied.

## Sound and speech

- **Transcribe** with `HF transcribe <file> --engine parakeet --json` (Parakeet runs on the Mac; setup downloads it).
  Always name the engine: on its own default, HyperFrames can install whisper-cpp with Homebrew by itself, and
  `--engine heygen` is HeyGen's paid speech service (an outside service, only when the user asks). It writes
  `transcript.json` beside the file, word times as `[{ "id": "w0", "text": "Hello", "start": 0.0, "end": 0.5 }, …]`;
  `--to srt` or `--to vtt` writes a caption file, and an existing `.srt`, `.vtt` or `.json` transcript can be
  imported the same way.
  - Whisper's `.en` models translate other languages into English: for speech in another language, a model without
    `.en` and `--language <code>`.
  - Whisper's word times can drift by more than a second. After Parakeet, run
    `node PLUGIN/scripts/tools/vo-check.mjs <audio> <transcript>` and listen to the cue words.
  - Caption craft and transcript clean-up: `captions/`.
- **Beats:** `HF beats --json` writes `beats/<the audio's path>.json` (`beats/assets/audio/music.wav.json`) for the
  project's music (an `<audio>` marked `data-timeline-role="music"`, or with `music`, `bgm` or `soundtrack` in its
  id), with each beat's time and strength; `HF beats <file>` measures a track that isn't in the film yet. With no
  music, or no beats it can trust, it answers an empty result and writes nothing. It only keeps beats it can hear, so
  a quiet intro or a fade-out can come back without its first or last few: carry the grid on from the tempo (the
  score's own, or the spacing of the beats it found) rather than leaving the ends without bar lines. Its use:
  `audio/sync.md`.
- **Where sound lands:** `HF audio --element "#sfx" --json` (or a file) measures a track in the film's time: its
  onsets and their strength, its loudest moment and tail, loudness and silence; `--at <s>` or `--range a,b` lists
  every sound playing then. It measures on the Mac by default (`--quality local`); `--quality best` and its
  `describe` measure send the sound to HeyGen's services, only when the user asks.
- `HF normalize-audio` matches one clip's loudness to another's; levels and ducking are in `audio/mixing.md`.

## Footage

- `HF remove-background <clip> -o <clip>_cutout.webm` makes a transparent cut-out on the Mac (`footage/cutouts.md`).
- `HF media-treatment --capabilities` lists the local grades and finishes; `footage/grading.md` says how to use
  them.

## The project and the app

- `HF info` (size, length, counts), `HF compositions` (every composition id), `HF docs <topic>` (`data-attributes`,
  `rendering`, `gsap`, `troubleshooting`, `compositions`), all with `--json` where useful.
- `HF timeline --json`: every clip as a row with `absStart`, `absEnd` and `file` (the video's own time, and the file
  that declares it), `src`, `volume`, `playbackRate`, automation `lanes` and where each length came from. It reads one
  level of scene files; `laneError` is an automation or effects attribute that doesn't parse.
- `HF preview --background` opens the project in HyperFrames' own preview and editor (its address ends
  `#project/<name>`); `HF preview --context --json --context-fields selection` says what the user has selected
  there, so "this one" is never a guess. `HF preview --stop` closes it. `HF open .` hands the project to HyperFrames'
  desktop app instead, when the user has it installed.
- `HF history begin --who claude --label "…"` and `HF history end` bracket a round of edits;
  `HF history --since mine --who claude` lists what changed since; `HF history undo --who claude` undoes Claude's own
  last round and leaves the user's edits alone. `HF catch-up` lists what was done in the HyperFrames desktop app since
  Claude last looked. The production skill says when to use them.
- `HF doctor --json` (gate on its `ok`) and `HF browser ensure` when a render or preview fails to start.
- `HF clean --dry-run` lists what failed renders left behind; Video Studio's own tidy-up is `studio.mjs tidy` (it
  also clears `.hyperframes/artifacts/`, where each snapshot run and check report is kept).

## On this Mac

- Some ffmpeg builds have no `drawtext` (Homebrew's doesn't). Put text on slates and comparison sheets with
  `node PLUGIN/scripts/tools/label_png.mjs`.

---
Sources: written for Video Studio from HyperFrames' hyperframes-cli skill and media-use's transcription notes
(v0.8.149, Apache-2.0, © HeyGen), changed: rewritten and trimmed to the commands Video Studio uses on the Mac, with
its own gotchas. See NOTICE.
