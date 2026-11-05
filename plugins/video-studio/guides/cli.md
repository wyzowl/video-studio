# The commands

HyperFrames' command line, as Video Studio uses it. What the files must contain is in `format.md`.

## Running HyperFrames

`HF` means `HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 npx --yes hyperframes@0.8.149`: the version
Video Studio is tested with, with no anonymous usage data and no check for a newer release (Video Studio chooses the
version). Every new project starts on it.

- Always give the version. Without one, npx fetches the newest release on every run.
- A project made on an earlier version keeps it: its `package.json` scripts name it. Run `npm run check` there with
  the same two switches in front, and `studio.mjs render` follows its `render` script.
- Render through `node PLUGIN/scripts/studio.mjs render -- <HF render's options>`, from the video's folder: it shows
  the render's progress on the video's overview, and uses the graphics chip on Apple silicon by itself.
- Everything below runs on this Mac. HyperFrames also has commands that send a project or its frames to outside
  services (cloud renders, publishing, sign-in, frame descriptions by an AI service); one is used only when the user
  asks for it and connects their own account.

## The loop

1. `HF timeline --json` to see what an existing project plays, and when, instead of opening every file.
2. Write or change the files (`format.md`).
3. `HF lint` while writing, for fast feedback.
4. `HF check` once a pass is done: it runs lint again first, so don't run both.
5. `HF snapshot --at <times> --describe false` for stills of what changed, and of every scene file's middle.
6. Render a draft and review it (review skill).

There are no partial renders: any change means a full render. `--resume` (with `HF_SEGMENTED_CAPTURE=true`) only
recovers a render that crashed. Check changed moments with snapshots and keyframe strips first.

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

`HF check` (or `npm run check`) is the gate before every render. It runs lint, then in one browser pass checks:

- **runtime**: script errors, failed requests;
- **layout**: text outside its box or the frame, text clipped by its own box, overlapping and covered text (with how
  much is covered), children escaping their clipping box, panels stuck across the frame edge, sharp canvas content at
  the edge;
- **motion**: the assertions in any `*.motion.json` beside the composition (below);
- **contrast**: WCAG AA on visible text against the real pixels behind it: 4.5:1 for body text, 3:1 for large text
  (24 px and up, or 19 px and up in bold). Each failure gives the colours, the ratio and a `suggestedColor` in the
  same family.

A frame that never changes for a 3 s+ composition fails as `sweep_static` (the seek isn't driving the page); a
deliberate still composition takes `data-no-timeline` on its root. An issue seen at only one sample (an entrance or
exit in flight) is a note; one held across samples counts. Each finding has the selector, the file, the box and the
time.

| Option | Use |
|---|---|
| `--json` | Results to read: `{ ok, lint, runtime, layout, motion, contrast, snapshots }` |
| `--snapshots` | Annotated frames, and a crop of every error that has a box |
| `--at 1.5,4,7.25` | Check these exact times (each scene's key moment) |
| `--at-transitions` | Also check every tween's start and end |
| `--samples 15` | A denser sweep (default 9) |
| `--caption-zone "x0=0;y0=.82;x1=1;y1=1;severity=error"` | Flag text in a band kept for captions or platform buttons (fractions of the frame) |
| `--frame-check` | Images, video and canvases that leave the frame |
| `--strict` | Fail on warnings too |
| `--no-contrast` | Skip contrast while iterating |

When check reports "0 samples" or "0/0 text checks", the browser never ran (a lint error): that isn't a pass. The
opt-out attributes for deliberate layering are in `format.md`.

### Motion assertions

A `<name>.motion.json` beside a composition (the same base name) makes check test what the motion is meant to do, on
the seeked timeline the render uses. Failures are errors.

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

Always pass `--describe false`: otherwise snapshot sends frames to an AI service to describe them whenever its API key
is set.

- `HF snapshot --at 3,10.5,18 --describe false` captures those exact instants; add `--no-end` to skip the extra
  end frame. `--frames 8` takes evenly spaced frames instead. `-o <folder>` chooses where they go (each run clears
  it).
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
| `--output <file>` | A stable name; the default is timestamped |
| `-c compositions/<file>.html` | Render one scene file on its own |
| `--format webm` or `mov` | With transparency, for a piece laid over something else; `png-sequence` for frames, `gif` (no sound, 30 fps at most) |
| `--crf <n>` or `--video-bitrate 10M` | Encoder quality, one or the other |
| `--workers <n>` | Chrome instances (about 256 MB each); fewer when memory is short |
| `--variables '{…}'`, `--batch rows.json` | Values for one render; one render per row (`--output "renders/{name}.mp4"`, never with `--variables`) |
| `--strict` | Fail on lint errors |

Read the line under the output path: the capture path, the GPU mode and each stage's time. A CSS `filter` (a blur)
anywhere in the film switches HyperFrames from its fast capture to screenshot capture, which renders noticeably slower
(the log says so): keep blur for the moments that earn it. Check the file afterwards:
it exists, isn't empty, and `ffprobe -v error -show_format -show_streams` gives the root's duration (and fps).

## Comparing

- `HF compare <dir-a> <dir-b> --at <seconds> --labels before,after --out compare.png` renders the same moment of two
  or more versions into one labelled sheet (up to 16): a before and after for a motion or feel change.
- `HF grade-compare --for frame.png --grades grades.json --project . --out grades.png` tries colour grades on one frame
  (`footage/grading.md`).

## Sound and speech

- **Transcribe** with `HF transcribe <file> --engine parakeet --json` (Parakeet runs on the Mac; setup downloads it).
  Always name the engine: on its own default, HyperFrames can install whisper-cpp with Homebrew by itself. It writes
  word times as `[{ "id": "w0", "text": "Hello", "start": 0.0, "end": 0.5 }, …]`; `--to srt` or `--to vtt` writes a
  caption file, and an existing `.srt`, `.vtt` or `.json` transcript can be imported the same way.
  - Whisper's `.en` models translate other languages into English: for speech in another language, a model without
    `.en` and `--language <code>`.
  - Whisper's word times can drift by more than a second. After Parakeet, run
    `node PLUGIN/scripts/tools/vo-check.mjs <audio> <transcript>` and listen to the cue words.
  - Caption craft and transcript clean-up: `captions/`.
- **Beats:** `HF beats --json` writes `beats/<audio>.json` for the project's music (an `<audio>` marked
  `data-timeline-role="music"`, or with `music`, `bgm` or `soundtrack` in its id). It fails, writing nothing, when it
  finds no beats. Its use: `audio/sync.md`.
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
  there, so "this one" is never a guess. `HF preview --stop` closes it.
- `HF history begin --who claude --label "…"` and `HF history end` bracket a round of edits;
  `HF history --since mine --who claude` lists what changed since; `HF history undo --who claude` undoes Claude's own
  last round and leaves the user's edits alone. `HF catch-up` lists what was done in the HyperFrames desktop app since
  Claude last looked. The production skill says when to use them.
- `HF doctor --json` (gate on its `ok`) and `HF browser ensure` when a render or preview fails to start.
- `HF clean --dry-run` lists what failed renders left behind; Video Studio's own tidy-up is `studio.mjs tidy`.

## On this Mac

- Some ffmpeg builds have no `drawtext` (Homebrew's doesn't). Put text on slates and comparison sheets with
  `node PLUGIN/scripts/tools/label_png.mjs`.

---
Sources: written for Video Studio from HyperFrames' hyperframes-cli skill and media-use's transcription notes
(v0.8.149, Apache-2.0, © HeyGen), changed: rewritten and trimmed to the commands Video Studio uses on the Mac, with
its own gotchas. See NOTICE.
