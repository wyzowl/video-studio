# How a video's files are built

What HyperFrames 0.9.16 needs from a project, and how Video Studio builds on it. Every frame is rendered by seeking
a paused timeline to that frame's time, one frame at a time and not always in order, so everything on screen must be
worked out from the time alone. The commands are in `cli.md`; the animation libraries in `runtimes/`.

## A project

```
videos/<project>/
  index.html       the video: its root, every clip, the sound, and the script that drives them
  compositions/    library blocks and any scene kept in a file of its own
  assets/          fonts, logos, images, footage copies, audio, and a copy of GSAP (vendor/)
  src/             a bigger film's scenes, when a build script writes index.html from them
```

Two ways to build the picture, both on the same contract:

- **One clock** (Video Studio's usual way for an animated film). `index.html` holds one full-length stage, and one
  function `render(t)` draws the whole film for any time `t`. A single tween moves a clock from 0 to the video's
  length, and a setter on the clock calls `render`, so every seek, in any order, draws exactly that frame. Big films
  keep each scene in `src/` and a build script writes `index.html`.
- **Scenes as files** (sub-compositions). Each scene, and each library block, is its own file mounted at its time in
  `index.html`, with its own paused timeline. HyperFrames seeks each one by itself.

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="30.5" data-width="1920" data-height="1080">
  <section id="stage" class="clip layer" data-start="0" data-duration="30.5" data-track-index="0"></section>
  <audio id="mix" src="assets/audio/mix.wav" data-start="0" data-duration="30.5" data-track-index="1"></audio>
</div>
<script>
  document.fonts.ready.then(() => {
    const render = buildFilm(document.getElementById("stage")); // returns render(t): draws the frame at t
    const tl = gsap.timeline({ paused: true });
    const clock = { _t: 0 };
    Object.defineProperty(clock, "t", { get() { return this._t; }, set(v) { this._t = v; render(v); } });
    tl.fromTo(clock, { t: 0 }, { t: 30.5, duration: 30.5, ease: "none" }, 0);
    render(0);
    window.__timelines["main"] = tl; // last, once everything is built
    if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
  });
</script>
```

- Use a setter on the clock, not `onUpdate`: a callback only runs when the seek fires events, and a setter runs on
  every seek.
- Inside `render(t)`, every element's state comes from `t` and nothing else: ease with `gsap.parseEase("power3.out")`
  applied to a 0–1 progress, never with state carried over from the last frame.
- In a one-clock film `HF keyframes` sees only the clock tween. Look at the motion in snapshots and review strips.

## The contract

1. **The root** has `data-composition-id`, `data-width`, `data-height` and `data-duration`. The duration is read once,
   before any script runs: a script or a variable can't change the length of the render. Size the root with
   `width: 100%; height: 100%` (or `inset: 0`), never hard-coded pixels; HyperFrames gives it the canvas size.
2. **A clip is any element with `data-start`.** `<div>`s and scene hosts also need `data-duration`; an `<img>` lasts
   3 s without one; media plays its own length. A clip shows over `[start, start + duration)`, so an end state that
   lands exactly on the end is never drawn: land it a frame or two before. `class="clip"` isn't read by the
   renderer, but the scaffold's `.clip { position: absolute; inset: 0 }` gives scenes their full-frame box, the
   HyperFrames app uses it, and lint warns without it. Leave it off `<video>` and `<audio>`.
3. **Timed children of the root** are placed at the top left and sized to the frame by HyperFrames. Untimed ones are
   left alone: a background with no `data-start` needs its own `position: absolute; inset: 0`, or it has no height.
4. **One paused timeline per composition**, registered as `window.__timelines["<its composition id>"]` after it's
   built. Building inside `document.fonts.ready` or another callback is fine; registering before the build finishes
   renders blank (`gsap_timeline_registered_before_async_build`). Never call `tl.play()`. The root's `data-duration`
   sets the length: a timeline that runs longer is cut, and a shorter one holds its last frame.
5. **Time is the only input.** No `Date.now()`, `performance.now()`, timers, `requestAnimationFrame` loops, CSS
   transitions, network fetches while rendering, hover, scroll or focus. Random-looking placement comes from a
   seeded generator (mulberry32 is enough). `repeat: -1` only under a finite root duration; a loop that must end
   sooner gets `repeat: Math.max(0, Math.floor(duration / cycle) - 1)`.
6. **HyperFrames owns each clip's visibility.** Never tween `display`, `visibility` or `autoAlpha` on a `.clip`
   (`gsap_animates_clip_element`): fade its `opacity` or animate a child. Hidden clips get `visibility: hidden`, so a
   later scene in the same file can still be measured at init.
7. **No CSS `transform` on anything GSAP moves.** The two fight (`gsap_css_transform_conflict`), and in a scene that
   isn't showing yet GSAP misreads the CSS value, so the element renders out of place. Centre with flex or `inset`,
   set the start inside the tween (`fromTo`), or set offsets in script (`gsap.set(el, { xPercent: -50 })`).
8. **`fromTo`, not `from`, inside a scene file.** A scene is seeked again every time it shows, and `from` records
   its start state once, so it drifts when scrubbed back.
9. **Text and layout.** Lay out the finished frame in plain HTML and CSS first, then animate to and from it. No `<br>`
   in running text (it ignores the real line width); short display lines set one word per line are the exception.
   A transformed element must be a block with a real size: scaling an inline `<span>` or a zero-width box shows
   nothing. Anything that pulses or overshoots needs room at its largest size, clear of an `overflow: hidden` edge.
10. **Measure without the page.** A scene file that isn't showing yet can return 0 for `offsetWidth` and
    `getBoundingClientRect`. Measure text with `window.__hyperframes.pretext` (`prepare(text, "700 90px Inter")`, then
    `layout(prepared, maxWidth, lineHeight)` for `{ lineCount, height }`, or `measureNaturalWidth` for one line's
    width), or fit it with `window.__hyperframes.fitTextFontSize(text, { fontFamily, fontWeight, maxWidth })`, once
    the fonts have loaded. Lint's `gsap_callback_dom_measurement` is a false alarm when measuring happens only at init.
11. **Callbacks are pure.** An `onUpdate` draws from its own tween's value alone; one that reads another tween's
    state draws wrong frames when seeked out of order. A count-up tweens a number on a plain object and writes the
    text from it. Never set `textContent` with `tl.set`: it isn't undone when the timeline goes back. Swap two
    spans' `opacity` instead.
12. **Ids are unique** across the whole assembled page: prefix a scene file's ids with its own (`#intro-title`).
    Asset paths are relative (`assets/…`, no leading `/`), in scene files too.
13. **The film's own classes carry a prefix.** Scene files and library blocks are put into the same page, so a rule
    in `index.html` for `.line` or `.fig` also styles a block's `.line` and `.fig` (a number roll's words end up on
    top of one another). Give the film's own classes a short prefix (`k-line`), or write its rules under its own ids.
14. **Moves are seek-safe.** Every element's state comes from the time alone, before, during and after a move: a
    move that only sets its element while it runs leaves it wherever the last move put it when the timeline is
    seeked back past it. Draw the whole move from one function of the time (the one clock does), or set the
    element's resting state for the times on either side.

## Media

- HyperFrames plays, pauses and seeks every `<video>` and `<audio>` itself: never call `play()`, `pause()` or set
  `currentTime`.
- A `<video>` that keeps its own sound has `data-has-audio="true"`; silent footage is `muted`. Both get `playsinline`.
  A timed `<video>` with neither fails lint (`video_missing_muted`).
- Every `<audio>` needs an `id`, or it's left out of the mix and the render is silent (`media_missing_id`).
- No `crossorigin` on media (`media_crossorigin_breaks_preview`).
- Time the `<video>` itself: it takes no timing from a wrapper, so a wrapper only places or animates it and carries
  no `data-start`. Both timed fails lint (`video_nested_in_timed_element`): the frames come from the wrong place and
  the clip disappears part-way. A scene file's host doesn't count: media inside a scene file plays correctly.
- Never animate a timed media element's size or position: move a wrapper around it.
- `data-media-start` is the in point (seconds into the file), `data-playback-rate` a constant speed (0.1–10),
  `data-volume` the gain (1 is 0 dB, up to 3.98 for +12 dB), and `data-fade-in` / `data-fade-out` edge fades. Volume
  envelopes and ducking use the `data-automation` volume lane, which multiplies `data-volume` (`audio/mixing.md`).
- **Cutting one file into ranges:** one element per range, each with its own `data-start` (where it plays),
  `data-media-start` and `data-duration`; each keeps its own sound with `data-has-audio="true"`. A separate `<audio>`
  is only for other sound: music, a voiceover, replacement sound, or a J or L cut.
- **Linked clips.** The HyperFrames app's Detach audio writes a muted `<video>` and an `<audio>` of the same file that
  share `data-link` and `data-sync-origin`, and the app edits them as one. Keep their `data-start`, `data-duration`,
  `data-media-start` and `data-playback-rate` equal; to unlink, remove `data-link` from both. Prefer one
  `<video data-has-audio="true">` unless the sound needs its own volume or effects.
- Media in a scene file starts at the scene's local time; HyperFrames adds the host's start. A project made with an
  older version that wrote media in the video's own time marks those elements `data-hf-media-start-basis="global"`.
- Footage in any codec renders (HyperFrames decodes it with ffmpeg); the preview makes a browser-friendly copy by
  itself. Footage whose keyframes are far apart can freeze on seek: re-encode it with `-g <fps>`.

## Fonts

- These resolve by name, with no file: Inter, Montserrat, Outfit, Nunito, Oswald, League Gothic, Archivo Black, Space
  Mono, IBM Plex Mono, JetBrains Mono, EB Garamond, Playfair Display, Source Code Pro, Noto Sans JP, Roboto, Open
  Sans, Lato and Poppins. System fonts such as Helvetica or Arial are swapped for the nearest of them.
- Any other family needs an `@font-face` to a file in `assets/fonts/` in the file that uses it, or lint fails
  (`font_family_without_font_face`). A brand's fonts come from its kit (`brand.json`).
- HyperFrames fetches a Google font named in a video's own CSS, but never one named only in a clip's values: a brand
  font with no file is named once in `index.html`'s style.
- Wait for the fonts (`document.fonts.load` for each weight, then `document.fonts.ready`) before measuring or
  building anything that depends on text size.

## Scene files

```html
<!-- index.html: the host -->
<div id="chart" data-composition-id="chart" data-composition-src="compositions/chart.html"
     data-start="2" data-duration="8" data-track-index="2" data-width="1920" data-height="1080"
     data-variable-values='{"title":"Example figures"}'></div>

<!-- compositions/chart.html: everything inside <template> -->
<template>
  <style>
    #root { position: absolute; inset: 0; }
  </style>
  <div id="root" data-composition-id="chart" data-width="1920" data-height="1080"> … </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    // … only this file's own elements
    window.__timelines["chart"] = tl;
  </script>
</template>
```

- **One id three times:** the host's `data-composition-id`, the file's root and the timeline's key. A host whose id
  differs makes the render wait 45 s for each such scene, then draw it frozen.
- **Only what's inside `<template>` is used.** The file's `<head>`, and any style or script outside the template, are
  dropped: a scene renders as tiny unstyled text in the corner. `<link>` tags are carried over either way.
- Style the scene's root as `#root` (lint rejects styling it by class: `subcomposition_root_styled_by_class`).
- A standalone `index.html` is never wrapped in `<template>` (`standalone_composition_wrapped_in_template`).
- **The host's `data-duration` is the scene's slot.** A shorter timeline holds its last frame to the end of the slot;
  a slot that ends before the video does goes blank (`subcomposition_blanks_before_host`).
- A scene's timeline reaches only its own elements. Media at the root of `index.html` is moved from the main
  timeline, at the video's own time (the scene's local time plus the host's `data-start`).
- Never add a scene's timeline into another (`main.add(child)`): HyperFrames drives each one, and nesting seeks it
  twice.
- Several beats that share state (a headline carried across a cut, one canvas, a chat that grows) are one scene file
  with a div per phase, not several hosts.
- Sound that plays across scenes lives at the root of `index.html`. A picture that follows the sound reads values
  measured from it beforehand, never from the playing audio (`motion/techniques/` "Motion from the music").
- In a scenes-as-files film, `index.html` stays thin: the hosts, the sound, and a root timeline with at most a final
  fade.

## Variables

- Declare them on `<html>` as an array: `data-composition-variables='[{"id":"title","type":"string","label":"Title",
  "default":"…"}]'`. Types: `string` (`placeholder`, `maxLength`), `number` (`min`, `max`, `step`, `unit`), `color`,
  `boolean`, `enum` (`options: [{ "value", "label" }]`). Give each a working default.
- Bind without script: `data-var-text="title"` replaces an element's own text (its child elements stay),
  `data-var-src="photo"` its `src` (keep a real fallback `src` on media with sound), and every value is also a CSS
  property on the root, `var(--title)`.
- For anything more, read `window.__hyperframes.getVariables()` once at init.
- Values are an object keyed by id: a host's `data-variable-values`, or `HF render --variables '{…}'`
  (`--variables-file` for a file, `--strict-variables` to fail on unknown keys or wrong types). Declarations are an
  array; values are an object.

## Tracks and timing

- `data-track-index` is only the row in the HyperFrames app's timeline. The render never reads it: clips on one row
  can overlap, and what's in front is DOM order and `z-index`. Two `<audio>` on one row that overlap get a warning
  (`duplicate_audio_track`).
- `data-start="intro + 0.5"` starts half a second after the clip `intro` ends (`- 0.5` overlaps it). It fails
  silently to 0 without the spaces, with a misspelt or missing id, or in a loop, and lands on the target's start when
  the target has no length. Snapshot to check it.
- `data-hidden` hides a clip in the preview and the render without deleting it (the app's eye icon).
- Editing an existing project: read its files first, or `HF timeline --json` for every clip's start and end. Keep the
  ids, the times and the paths you aren't changing. A clip that ends past the root's `data-duration` is cut: raise
  the root's in the same edit (`clip_ends_past_root_duration`).

## Grounds that span scenes

A colour wash, a texture or a grade that runs across several scenes goes on one full-frame layer that isn't a clip
(`position: absolute; inset: 0`, driven by the timeline), with the scenes transparent above it. A fill on the root
itself is dropped when the video uses shader transitions or HDR media: put it on a full-frame child.

## The HyperFrames app

- It lists every `<img>` as a timeline row: decorative images go in `background-image` divs.
- It treats an untimed wrapper around a `<video>` as a full-length clip and forces it visible: in a one-clock film,
  control that wrapper's visibility with `opacity` in `render(t)`.
- It rewrites `index.html` when it opens it (adding `data-hf-id`), and its timeline edits rewrite the GSAP script.
  The production skill says how to work with someone editing there.

## What check flags on purpose

`HF check` measures boxes at sampled times; `overflow: hidden` doesn't silence it. Use the narrowest opt-out:

| Attribute | Silences |
|---|---|
| `data-layout-allow-overflow` | Overflow on the element and everything inside it, including clipped-text checks: keep it on the smallest decorative wrapper (camera moves, plates bigger than the frame) |
| `data-layout-bleed="true"` | One deliberate crop of a main line |
| `data-layout-allow-overlap` | Deliberate text layering, on that block only |
| `data-layout-allow-occlusion` | An element meant to cover text (a full-frame transparent canvas, a cut-out in front of words) |
| `data-layout-allow-caption-zone` | Words meant to sit in the caption band (`--caption-zone`) |
| `data-layout-ignore` | A decorative element, such as a 3D surface, never measured; also text that's texture rather than reading (a phone's clock, a sign in the world), which the type floor would flag |
| `data-hold` | A stillness that's meant (a pause on a key word, a chart held to be read), on the element that holds, not the whole stage: the still-stretch finding (`dead_stretch`) |

Words parked behind an `overflow: hidden` mask are still measured: set them to `opacity: 0` while they're hidden. A
lint error switches the layout and contrast checks off, so "0 samples" isn't a pass: clear lint errors first.

## Tailwind

A project made with `init --tailwind` uses the Tailwind 4 browser runtime HyperFrames pins (4.2.4), and HyperFrames
waits for it before the first frame. Theme and utilities go in a `<style type="text/tailwindcss">` block (`@theme`,
`@utility`); `@config` and `@plugin` stop it compiling. The frame is fixed, so no breakpoints; no `transition-*`,
`hover:` or other interaction variants; write every class in full (it can't see classes built at seek time); a bare
`border` takes the text colour, so name one. Video Studio's own videos use plain CSS with the brand's values as
variables.

---
Sources: written for Video Studio from HyperFrames' hyperframes-core skill and motion-graphics' builder contract
(v0.8.149, Apache-2.0, © HeyGen), changed: rewritten, merged and trimmed, with Video Studio's own build notes. See
NOTICE.
