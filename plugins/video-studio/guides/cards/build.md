# Card: the build

The build's guides on a page, for the build skill: read it once a session in their place. Each section names its full
guide, and when to open it. Building a film from nothing, also read `../format.md` ("A project", "The contract") before
writing `index.html`; a change to a built film needs this card and the film's map (`studio.mjs map`).

## HyperFrames' contract (`../format.md`)

Every frame is drawn by seeking a paused timeline to its time, in any order, so everything comes from the time alone.
- **The root** has `data-composition-id`, `data-width`, `data-height` and `data-duration` (read once, before any
  script), sized `100%`, never in pixels. Motion blur is on it: `data-motion-blur="on" data-motion-blur-events="on"`.
- **One clock** (an animated film's usual way): a pure `render(t)` draws the whole film, called by a setter on a clock
  that one tween moves from 0 to the length; eases are `gsap.parseEase(…)` applied to a 0–1 progress.
- **A clip** is an element with `data-start`; a div or host also needs `data-duration`; it shows over
  `[start, start + duration)`, so an end state lands a frame or two before. HyperFrames owns its visibility: fade its
  opacity or a child's, never `display`, `visibility` or `autoAlpha`.
- **One paused timeline per composition,** registered as `window.__timelines["<id>"]` once built; never `play()`.
- **Time is the only input:** no `Date.now()`, timers, animation-frame loops, CSS transitions, fetches or hover;
  anything random comes from a seeded generator; `repeat: -1` only under a finite root.
- **No CSS `transform` on anything GSAP moves;** `fromTo`, never `from`, inside a scene file; callbacks draw from their
  own tween alone; no `textContent` set by `tl.set` (swap two spans' opacity); every move seek-safe.
- **Layout first:** the finished frame in plain HTML and CSS, then the motion to and from it; no `<br>` in running
  text; a transformed element is a block with a size; room for overshoot inside an `overflow: hidden` edge. Measure
  text with `window.__hyperframes.pretext` or `fitTextFontSize`, after the fonts load.
- **Names:** ids unique across the page; the film's own classes prefixed (`k-line`); asset paths relative.
- **Media:** HyperFrames plays and seeks every `<video>` and `<audio>`; a video keeps its sound with
  `data-has-audio="true"` or is `muted`, both `playsinline`; every `<audio>` has an id; a timed media element is never
  animated (move a wrapper).
- **Fonts:** a family outside HyperFrames' own list needs an `@font-face` to its file in the kit.
- Open `../format.md` for scene files and their hosts, variables, tracks, grounds that span scenes, and the attributes
  that quiet the checks on purpose ("What check flags on purpose").

## Headings and the map

Head each scene's section, in the markup, styles and script, with its id and time range, on a line of its own
(`<!-- ── s03 11.86–21.25 s: the logo -->`, `// ── s03 11.86–21.25 s: the logo`), and anything else you'll want to
find again by name. `studio.mjs map <video>` lists them with their lines; read and edit only the lines a change
touches.

## The commands (`../cli.md`)

`studio.mjs frames <video>` to start a film from its approved storyboard; `HF lint` while writing;
`studio.mjs check <video>` once a pass is done (it runs `HF check` with the video's settings;
a must fix stops the render; a should fix is fixed or kept, `--keep S2 "<why>"`); `HF snapshot --at <times> --describe
false` for stills of what changed; `studio.mjs draft <video>` for the review's draft and sheets. HyperFrames always
runs with its version and its two switches, and never its cloud, publishing or sign-in. Open `../cli.md` for any other
command (capture, measure, keyframes, beats, audio, transcribe, the app's history).

## The look (`../design/README.md`, `../design/readability.md`)

- **The approved frames are the layouts and the plans are the brief:** `studio.mjs frames` brings the frames in as
  each scene's layout, with their states and the live items; the motion moves between them, and nothing is drawn
  again. The kit's colours and fonts as variables, its backgrounds as grounds, its `motion` as the timeline's
  defaults, the variable font on the brand's weight.
- **Every word reads** on a phone, in time (the sizes and holds below): strong contrast against what's really behind
  it, still while it's read, clear of the platforms' bands, one thing to read at a time.
- **Every scene has depth and a living world:** atmosphere behind, detail in front, and slow ambient motion on
  different cycles, below a fifth of the main motion's energy; words being read stay still.
- Drawing an animated film's world, `../design/illustration.md` (SVG groups with their own origins, symbols reused,
  light, three planes).

## The motion (`../motion/choreography.md`, `../motion/timing.md`)

- **Choreography:** the hero leads, with the strongest move; one main action at a time; one origin for a group;
  counter-motion and depth through speed; each scene builds, breathes and resolves.
- **Durations:** a small reaction 0.1–0.25 s; words or a card arriving 0.4–0.8 s; a fast move across 0.3–0.6 s; a
  camera move 0.6–1.2 s; exits about 60–75% of the entrance; a move twice as far about 1.3 times as long; a scene's
  first move 0.1–0.3 s in, never on its first frame; the slowest scene about three times slower than the fastest.
- **Eases:** arriving `power3.out` (`expo.out` fast or premium); leaving `power2.in` or `power3.in`; travelling and
  camera moves `power2.inOut` or `sine.inOut`; mechanical things `none`; about three ease characters a film; mirrored
  across a hand-over (`power3.in` out, `power3.out` in). Open `../motion/timing.md` for staggers, springs and the beat
  grid, and the patterns and techniques the plans name (`../motion/patterns/`, `../motion/techniques/`).
- **Timed to the words or the beat** (`../audio/sync.md`): a key word on screen from 0.15 s before it's said to
  0.05 s after; cuts at phrase gaps; with music, scene changes on bar lines.

## The sound (`../audio/sfx.md`, `../audio/mixing.md`, `../audio/music.md`)

- **Effects from SFX Kit,** made with the video, as much as the brief calls for, each with a reason: found with
  `sfx.mjs find`, placed by the data from the cue list (`assets/audio/sfx-cues.json`), built with `sfx.mjs build`.
  Open `../audio/sfx.md` before writing the cue list: its rules on the voice, levels, layering and variety.
- **The mix:** about −14 LUFS, the voice clearly on top, music at least 10 dB under it while it speaks, the effects
  about 2.5 dB under the music; the stems levelled with `level.mjs` to −1.8 dBTP or lower before rendering, the render
  −1 dBTP at most. Open `../audio/mixing.md` to level, duck or carve.
- **Music:** the user's track, or a bed from the score kit, proposed and never added silently (`../audio/music.md`).

## The numbers (`../numbers.md`)

- **Type sizes** (smallest, body, headlines): 16:9 at 1920 × 1080, 40, 48 and 80 px up; 1:1 and 4:5, 32, 40 and 72
  up; 9:16, 36, 44 and 80 up. Contrast 4.5:1 for body and smaller, 3:1 for headlines.
- **Reading:** a line holds 0.5 s + 0.3 s a word + 0.5 s (1 s at least); something to take in, 3 s or twice that.
- **Safe areas:** 16:9, 5% at every edge; 1:1 and 4:5, 6%; with burnt-in captions, the bottom sixth too; 9:16, the
  top 14%, the bottom 25%, the right 15% and the left 6%.

---
Sources: Video Studio's own summary of its guides (`../format.md`, `../cli.md`, `../design/`, `../motion/`,
`../audio/`, `../numbers.md`); see each guide's sources.
