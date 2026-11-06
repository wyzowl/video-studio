---
name: build
description: Build an approved Wyzowl Video Studio storyboard into the video - the HyperFrames code, library items, footage cuts, captions and sound - ready for the review loop. Use once every storyboard scene is approved, and for every change to a built video (the review's fixes, the user's notes).
---

# Build

The build turns the approved plan into the video. It owns the code, and it changes nothing creative: the approved
script's words, the storyboard's scenes and frames, and the brand kit stay as they were approved. When the plan
leaves something open, choose from the guides' defaults; when something approved can't work as planned, change as
little as possible and flag it, so the review page says so (review skill, "The user's video review").

`PLUGIN` and `HF` are as in the production skill. **Read first,** once a session (`PLUGIN/guides/`; skip any you've already read in this session):
- `format.md` (the HyperFrames contract) and `cli.md` (the commands);
- `design/README.md`, `design/illustration.md` for an animated video, and `design/readability.md`;
- `motion/choreography.md` and `motion/timing.md`, and every pattern and technique the scene plans name
  (`motion/patterns/`, `motion/techniques/`);
- `audio/sfx.md`, `audio/mixing.md`, and `audio/music.md` when there's music.

Then as the job needs: `captions/` for captions, `footage/` for a footage video, `runtimes/` for anything beyond GSAP
(Lottie, three.js, canvas, WebGPU).

## Start

Start it on the overview: `node PLUGIN/scripts/studio.mjs progress <project> video <version> build` (a later version
too); the commands mark the steps after it (production skill, "Work in progress").
Read `BRIEF.md`, the brand kit (`brand.json`), the approved script and storyboard (its frames, descriptions and
notes), and the verified word times.

## An animated video

1. **One clock.** One `index.html` with a pure `render(t)` on one paused GSAP clock (`PLUGIN/guides/format.md`, "A
   project"); library items and blocks are their own files. A long film (about two minutes or fifteen scenes and up)
   is built a file per scene instead, its scenes at the same time ("A long film", below). The root has motion blur
   on, as that example does. Head each scene's section, in the markup, the styles and the script (and in each scene
   file), with its id and time range, as a comment on a line of its own: `<!-- ── s03 11.86–21.25 s: the logo -->`,
   `// ── s03 11.86–21.25 s: the logo`; anything else you'll want to find again (the camera, the world) by name, the
   same way. `studio.mjs map <video>` lists them with their lines, and a change reads only those.
2. **The approved frames are the layouts, and the scene plans are the brief.** Reuse the storyboard's `frames.html`
   layouts, words and assets, and build each scene to its plan (`storyboard.json` `plan`): its world and drawing
   style, its depth and atmosphere, its moves on their times, its sound and its hand-over. Where a plan leaves
   something open, choose from the guides' defaults; where it can't work as written, change as little as possible.
   Keep `docs/decisions.md`: a line for each choice a plan left open and each change to one, with why. The changes
   go on the review page (review skill, "The user's video review").
3. **The brand kit as defaults:** its colours and fonts as variables (never retyped by eye), its backgrounds as
   grounds, and its `motion` (eases, durations, entrance, spring) as the timeline's defaults
   (`PLUGIN/guides/motion/quality.md`). The variable font rests on the brand's weight
   (`PLUGIN/guides/design/type.md`).
4. **Timed to the words or the beat:** key words arrive on their spoken times, cuts fall in phrase gaps, scenes change
   on bar lines with music (`PLUGIN/guides/audio/sync.md`); reveals pace each scene through its length
   (`PLUGIN/guides/story/beats.md`).
5. **Every size laid out for its shape:** layouts built from variables (safe areas, a type scale), so another size is
   a layout change, not a rebuild (`PLUGIN/guides/design/layout.md`). Check text at phone width for 9:16, 4:5 and 1:1.
6. **References:** if `inputs/refs/` or the brand's `refs/` exists and there's no `docs/style_guide.md` yet, measure
   them with `HF measure` and write one from the measurements (`PLUGIN/guides/design/README.md`, "Working from
   references").
7. **Look before rendering:** `node PLUGIN/scripts/studio.mjs check <project>` shows no must fix
   (`PLUGIN/guides/cli.md`, "lint and check"), and each should fix is fixed or kept with why (`--keep S2 "<why>"`);
   stills of each scene's key moment and every transition with `HF snapshot --at <times>
   --describe false`, compared with the storyboard's frames, before the first render. Then the review skill takes
   over.

## A long film

An animated film of about two minutes or fifteen scenes and up is built as one file per scene, each by its own
helper at the same time, on a foundation the main agent lays first, then joined and reviewed as one film. A helper
takes 15–20 minutes over its scene whatever the scene's length, most of it reading and checking, so this waits less
than one agent only on a film that long, and it uses about five times the tokens: a shorter film stays with one agent
and one clock. Each scene becomes a clip of its own in the HyperFrames app. The steps of "An animated video" still
hold; this is who does which.

1. **The foundation** (the main agent):
   - `assets/film/<video>.js`, loaded by `index.html`'s head and by every scene file: the brand kit as code (its
     colours and fonts, its eases and durations, and the helpers every scene uses), each scene's slot (its start and
     end, overlapping its neighbour by the transition between them), and everything that carries across scenes, as
     functions of the film's time: a world and its camera, a character, a change of light or weather. Each scene that
     shows it draws its own copy from those functions at the film's time, so both sides of a seam draw the same
     picture and no join has to match it by hand.
   - `index.html`: any ground that spans scenes, each scene's host (in a plain wrapper when a join moves it), the
     transitions that cover a cut (X01, X13, X17) and the recipes that act on two scenes (X05, X19), the sound, and
     the root timeline for the joins (`PLUGIN/guides/format.md`, "Scene files"). Where one scene opens inside another
     (an iris, a reveal), the incoming scene has its own opaque ground, so a shared world isn't drawn twice.
   - A starter for each scene (`compositions/<scene>.html`: its ground if it has one, its copy of what's shared, and
     its clock), and a brief for each in `docs/build/`: its slot; what comes in and goes out at each seam, and which
     half of each transition is the scene's own; its plan, words and approved frames; the decisions already made;
     and its library items, as `studio.mjs library` gives them, timed in the scene's own time.
   - Before any helper starts, snapshots across every seam with only the starters: what's shared must already carry
     across.
2. **The helpers:** one Agent per scene, all started in one message. Each builds only its own file, from its brief,
   the foundation and `PLUGIN/guides/format.md` ("The contract", "Scene files"), with the patterns and techniques its
   plan names, and checks it with `HF lint` and stills in its slot. Each reports its choices and changes (for
   `docs/decisions.md`) and its key moments.
3. **The joins and one review** (the main agent): each transition the briefs leave to the joins, on the root timeline,
   moving the wrappers from the film's time; `docs/decisions.md` from the reports; then the whole film is checked and
   looked at before rendering, as for any animated video, with a five-frame strip of every seam (`HF snapshot
   --review`), before the review skill takes over.

A fix after a review goes into its scene's file; a change to the foundation is checked across every seam again. If
the user moves a scene in the HyperFrames app, its content moves but its joins don't: rebuild the join, and say so on
the review page.

## A footage video

Build the cut in HyperFrames' clip-and-track structure, so the user can open it in the HyperFrames app and adjust it
(`PLUGIN/guides/footage/editing.md`):
- one `<video>` per kept range: `data-start` where it sits in the video, `data-media-start` its in point and
  `data-duration` its length, with `data-has-audio="true"` so its sound plays;
- B-roll as muted `<video>` clips on the track above;
- library items, captions and titles on the tracks above those;
- motion blur on the root, as in an animated film (`PLUGIN/guides/format.md`, "A project"), so cards and titles that
  move fast smear.

Use the original files in `inputs/footage/`, not the previews.
- Cut in the pauses: a beat after the last word and before the next, never mid-word, and keep breaths natural.
  Hide a jump cut inside a take with a punch-in (scale the next range by about 1.1) or B-roll over it.
- Anything timed to the words (captions, items' cues) takes the scan's word times, moved to the cut: time in the
  video = the range's `data-start` + the word's time − the range's in point.
- Sound: the speech leads. Music sits under it and ducks while people speak (`PLUGIN/guides/audio/mixing.md`);
  B-roll's own sound stays off unless it's the point.
- Check every join: transcribe the draft (`HF transcribe <draft> --engine parakeet`) and compare its words with the
  script's, so no word is clipped, doubled or missing; and look at the cuts with `HF snapshot --describe false`.

## A timeline that reads in the app

The HyperFrames app draws a row per top-level element, so keep each row one kind of thing the user can select, mute or
move: the base video, scene hosts and graphics (`data-track-kind="graphics"` on their hosts), one captions track (a
single host marked `data-track-kind="captions"` carrying every caption group), and the audio. Give each kind its own
`data-track-index`; it orders the app's rows only, never what draws on top (that's CSS).

## Library items

The studio's library (`/library/`) holds ready-made HyperFrames blocks in seven categories: widgets (cards that show
information over footage), layouts (ways to show the presenter beside a screen or other clips), text effects,
transitions (ways to move from one scene to the next), data (full-screen charts and graphs), interface (browser and
app windows, devices, AI tools, messages, social posts, search and shopping) and forms (forms and controls filled in
and clicked). Each item has a code whose letter is its category (W03, L01, T01; X for transitions, D for data, I for
interface, F for forms), takes its colours, fonts and corner rounding from a brand kit, and lays itself out for every
size. The script and storyboard suggest them from what `studio.mjs library` lists, so videos get them without anyone
asking. To build one in, whether it was suggested or the user named it:

1. Run `node PLUGIN/scripts/studio.mjs library <code> --brand <brand> --size <16x9|1x1|4x5|9x16>`. It gives the block's
   file, a clip for `index.html` with the brand's settings filled in, the fonts it needs and the words it takes.
2. Copy the block into the project's `compositions/`, add the clip where it plays, and set its words and options in
   `data-variable-values`; its `duration` matches the clip's `data-duration`. Time cues (ticks, current points,
   highlights) to the voiceover's words.
3. Media: whenever an item takes a file (a recording, a screenshot, footage: L01, L07, L15, T01, the devices I01 and
   I04–I09, and any item `studio.mjs library` lists with a file), write each file as the `src` of its element in the
   copy, and remove the `<video>` and `<audio>` elements you don't use (keep its `<img>` elements: its script may read
   them). A file given only as a variable, or a video
   element left with no file, isn't found when the render starts: it waits 45 s and then shows a frozen frame. Check
   in a snapshot that the screen plays.
   T01 needs a cut-out of the presenter, made on the Mac:
   `HF remove-background <segment>.mp4 -o <segment>_cutout.webm`, from the same cut of footage (the model downloads
   once; setup offers it). Check a few frames: anything the cut-out wrongly keeps or drops (a mic arm, a held phone)
   shows in front of or behind the word (`PLUGIN/guides/footage/cutouts.md`). Then measure the head:
   `node PLUGIN/scripts/tools/head-top.mjs <segment>_cutout.webm --size <W>x<H>` and pass its `headTop`. The word then
   sits so the head covers at most half of it, which keeps it readable; placing it by hand so the head covers more
   breaks the word.
4. Keep the item's motion and look: the brand kit dresses it, so don't restyle it by hand. Its colours can be any
   others from the same kit, such as a full-frame item on the brand's accent: set its colour settings to those
   colours and keep its words readable (the contrast in `PLUGIN/guides/numbers.md`). If something doesn't fit the
   brand, fix the kit's `style` (brand-kit skill). The checks as usual.
5. Words that must read at phone size (`PLUGIN/guides/numbers.md`, "Type sizes"): the cards (W08, W26, W36, W41, W49,
   W52) take a Size (1 reads on a phone, up to 2 for more) and grow from their own side; set it rather than scaling
   a wrapper, and check the frame in a snapshot. Widgets over a presenter go on the side they aren't facing. Each stays on screen long enough to take
   in, counted from when its words are in (its own entrance comes first: `PLUGIN/guides/numbers.md`, "Reading"); a
   quick-fire run, one after another, can go faster when it's meant to be glanced at.
6. Data items, and the other words that fill the frame (T10, T46 and the rest `studio.mjs library` marks full frame),
   fill the screen in the brand's colours. Give figures their real values and source; if a transition follows, set
   `exit` to `"hold"` so the scene stays whole until the transition takes it, and let its clip run until that
   transition has finished: a clip shows only for its `data-duration`, whatever the film's own moves do with it.
7. Transitions come in two kinds, and `studio.mjs library <code>` gives each one's clip or call, and its timing:
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
   - a ground from the brand's backgrounds (a full-frame element in `index.html`), with big words, a widget and
     captions over it. An image background is a `background-image` div covering the frame at its `position`, its file
     copied into the project's `assets/`; a gradient or colour is the element's background.

   `studio.mjs library` marks each item over footage or full frame. Each is its own clip with its own id (a second
   copy of an item gets a new id, as below). Later clips in `index.html` draw on top, so put the base first;
   `data-track-index` is only the app's timeline row, so give each item playing at once its own. Make them work
   together: nothing covers the words, another item's key part or the presenter's face (move one with its options,
   such as `side`, or time them apart), their entrances don't all land at once, and each stays on screen long enough
   to read. Look at the moments they overlap in snapshots.

To use one twice in a video, copy it under a new id (change its id everywhere in the copy). HyperFrames' own online
registry is a second source, used with care (`PLUGIN/guides/library.md`).

## Sound

- **Music:** the user's track if there is one; otherwise propose a music bed (a score made with the score kit), and
  don't add one silently (`PLUGIN/guides/audio/music.md`).
- **Sound effects** come from SFX Kit and are made with the video, as much as the brief calls for: the user first
  hears them in the video and asks for changes there (`PLUGIN/guides/audio/sfx.md`).
- **The mix:** level the stems, make room for the voice, and measure the render (`PLUGIN/guides/audio/mixing.md`).
- **Captions** burnt in when the brief asks, or for a feed that plays muted (`PLUGIN/guides/captions/`); the `.srt`
  and `.vtt` files come with the deliverables either way.

## Changes after a review

The review's fixes and the user's notes come back here. Change what each one asks for and nothing more; a change to
something the user approved (a scene's look, a word of the script) is said on the next review page. Find what a change
touches with `node PLUGIN/scripts/studio.mjs map <project>` (each file's sections with their lines, the clips and
library items with their times, the sound cues), read only those lines (Read with offset and limit), and edit them
rather than rewriting a file; keep a section's heading true when its times move. Then the review
loop's next round checks the changes: `studio.mjs draft <project> --at <each changed stretch>` runs the checks, renders
each stretch and makes its before-and-after sheet (review skill, "The loop").
