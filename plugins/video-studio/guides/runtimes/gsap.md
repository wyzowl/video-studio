# GSAP

GSAP is the clock and the main animation library in every Video Studio film. This is GSAP as a seek-driven renderer
needs it: every tween must give the same frame for the same time, however it's reached. The contract it serves is in
`../format.md`; easing choices and timings are in `../motion/timing.md`.

## Loading it

- GSAP 3.15.0, the version HyperFrames 0.9.16's scaffold links (videos made on 0.8.149 link 3.14.2; keep the one a
  video has). Keep a copy in the project (`assets/vendor/gsap.min.js`) so the film never depends on the network, and
  load any plugin from the same version's `dist/` folder beside it. HyperFrames' check and snapshot serve 3.15.0's
  `gsap.min.js`, `CustomEase` and `MotionPathPlugin` from their own copy when a video links them from jsDelivr.
- Every plugin is free to use, commercial work included, and needs no key. Register each once before use:
  `gsap.registerPlugin(SplitText, DrawSVGPlugin)`.

## Tweens

- `gsap.to(targets, vars)` animates to `vars`; `fromTo(targets, from, to)` sets both ends; `set(targets, vars)` applies
  at once. In a scene file always `fromTo` (`../format.md`, rule 8); `from` is fine for something on screen from
  the very start of a standalone `index.html`.
- Property names are camelCase (`backgroundColor`, `rotationX`). Common vars: `duration` (seconds; GSAP's default is
  0.5), `ease`, `stagger`, a finite `repeat` with `yoyo`, `immediateRender`.
- Two `from` or `fromTo` tweens on the same property of the same element: give the later one
  `immediateRender: false`, or its start state overwrites the first tween's before it plays.
- Relative values: `"+=20"`, `"-=10"`, `"*=2"`, `"/=2"`. Rotation direction: `"360_cw"`, `"90_ccw"`, `"-170_short"`.
- Any value can be a function of `(index, target, targets)`, called once per target: per-element values without a
  loop.
- CSS custom properties animate like any other (`"--progress": 1`), which drives anything CSS computes from them.
- `clearProps` hands an element back to CSS at a tween's end; clearing any transform part clears the whole transform.

## Timelines

- One `gsap.timeline({ paused: true, defaults: { duration: 0.6, ease: "power3.out" } })` per composition. The
  defaults record the film's motion language in one place.
- Place every tween with the position parameter, never with `delay`:

| Position | Starts |
|---|---|
| `2.4` | at 2.4 s |
| `"+=0.5"` / `"-=0.2"` | 0.5 s after / 0.2 s before the timeline's current end |
| `"<"` / `">"` | with the previous tween's start / after its end |
| `"<0.2"` / `">-0.1"` | 0.2 s after the previous start / 0.1 s before the previous end |
| `"hook"`, `"hook+=0.3"` | at a label, or after it (`tl.addLabel("hook", 1.2)`) |

- Labels named after the script's beats make a long film readable, and moving one label moves its beat.
- A child timeline can group parts of one composition (`tl.add(child, 3)`), never another composition's timeline.
- `play()`, `reverse()` and `restart()` are only for trying things in a browser; the render seeks.

## Transforms

- Use GSAP's own transform properties, never a `transform` string: `x`, `y`, `z` (px), `xPercent`, `yPercent`,
  `scale`, `scaleX`, `scaleY`, `rotation`, `rotationX`, `rotationY`, `skewX`, `skewY`, `transformOrigin`. GSAP keeps
  each one separately, so two tweens on one element don't overwrite each other.
- 3D needs perspective: `transformPerspective: 1200` on the element, or `perspective` on its parent.
- SVG: `svgOrigin: "250 100"` turns or scales several shapes around one point in the SVG's own coordinates (never
  together with `transformOrigin`). Size and attach an SVG before building tweens that pivot on its centre, or draw it
  around `0,0` inside a positioning `<g>`.
- `autoAlpha` (opacity, with `visibility: hidden` at 0) is for elements inside a clip, never the clip itself.

## What to animate

- Animate transforms and `opacity`. HyperFrames screenshots every frame, and the browser snaps layout properties to
  whole pixels: on a slow move or the long tail of an ease-out, `left`, `top`, `width`, `height`, `margin` or `padding`
  sits on one pixel for several frames, then jumps. Transforms move by fractions of a pixel. Lint flags layout
  motion (`gsap_non_transform_motion`).
- Keep the resting place in CSS and animate the offset: an element at `left: 1340px` comes in with
  `fromTo(el, { x: 640 }, { x: 0 })`, not by tweening `left`.
- Text that reflows stutters the same way: `fontSize` becomes `scale`; `letterSpacing` or `wordSpacing` becomes each
  letter or word moving on `x` (split with SplitText). `roundProps` forces the same whole-pixel snap: don't use it.
- When lint flags a property, keep the look: the fix should differ only in the missing stutter. Compare the old and
  new versions at their key moments (`HF compare`), not just the lint result.
- `filter`, `clipPath`, `strokeDashoffset`, colours and `borderRadius` are fine to animate.
- Elements drawn into a `<canvas layoutsubtree>` (`canvas.md`) keep `left` and `top`: the canvas draws from their
  exact values.
- A media element's `volume` is never tweened: volume fades go in its `data-automation` lane.
- `will-change: transform` only on what moves.

## Eases

Built in: `none`, `power1`–`power4`, `sine`, `circ`, `expo`, `back`, `elastic`, `bounce` and `steps(n)`, each with
`.in`, `.out` and `.inOut`. Which to use where is in `../motion/timing.md`. Beyond those:

- `CustomEase.create("name", ".17,.67,.83,.67")` for a CSS-style bezier, or an SVG path for any curve.
- `CustomWiggle` and `CustomBounce` for a shake or a bounce of set strength, `EasePack` for `SlowMo`, `RoughEase` and
  `ExpoScaleEase` (a zoom whose speed looks even at every scale).
- A spring, exactly and seek-safe: a closed-form damped spring is a pure function of progress, so any frame can be
  drawn on its own. A spring that integrates velocity frame by frame can't be seeked.

```js
// a damped spring as a GSAP ease; take both the ease and the duration from it
// response: seconds per oscillation (0.3–0.6 for entrances); damping 1 = no overshoot, 0.8 = barely felt, 0.65 = playful
function spring({ response = 0.5, damping = 1 } = {}) {
  const w = (2 * Math.PI) / response, z = damping;
  const pos = z < 1
    ? (t) => { const d = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(d * t) + (z * w / d) * Math.sin(d * t)); }
    : z > 1
      ? (t) => { const o = w * Math.sqrt(z * z - 1); return 1 - Math.exp(-z * w * t) * (Math.cosh(o * t) + (z * w / o) * Math.sinh(o * t)); }
      : (t) => 1 - Math.exp(-w * t) * (1 + w * t);
  const decay = z <= 1 ? z * w : (z - Math.sqrt(z * z - 1)) * w, scan = 12 / decay, n = 4800;
  let end = scan;
  for (let i = n; i >= 0; i--) if (Math.abs(1 - pos((i / n) * scan)) > 0.001) { end = ((i + 1) / n) * scan; break; }
  const last = pos(end);
  return { duration: end, ease: (p) => pos(p * end) + p * (1 - last) };
}
const settle = spring({ response: 0.4 }); // about 0.59 s, no overshoot
tl.fromTo("#mark", { scale: 0.6 }, { scale: 1, duration: settle.duration, ease: settle.ease }, 1.2);
```

- Change a spring's speed with `response`, never by overriding its duration (that just re-times the same curve).
- An overshooting spring goes on transforms only. Give opacity its own plain tween at the same time, or it passes 1.

## Stagger

- `stagger: 0.08`, or `{ each: 0.08, from: "center" }` (`"start"`, `"end"`, `"edges"`, `"random"` or an index),
  `{ amount: 0.6 }` for a total spread, `grid: [rows, cols]` or `"auto"` with `axis: "x"` for grids.
- One staggered tween stays right when the number or order of elements changes; a tween each with hand-set times
  doesn't.
- `from: "random"` shuffles with `Math.random` when the tween is built, and each render worker builds its own page,
  so the workers disagree. For a scattered order, give each element its delay from a seeded generator (a function
  value) or shuffle the list with one before the tween.

## Plugins in a film

| Plugin | In a seeked film |
|---|---|
| SplitText | Splits text into lines, words and letters (`SplitText.create(el, { type: "words,chars", mask: "lines" })`). Split once, after the fonts load; leave `autoSplit` off, since a re-split in the middle of a render breaks the frames that follow. `mask` wraps each unit in a clipping box for reveals; `propIndex` adds `--word` and `--char` indexes for CSS. Kerning shifts less with `font-kerning: none`. It doesn't split SVG `<text>`. |
| DrawSVGPlugin | Draws a stroke on or off: `fromTo(path, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%" })`; `"20% 80%"` shows only the middle. The element needs a visible stroke. One-segment paths behave best. |
| MorphSVGPlugin | Morphs one path into another, with different point counts. `type: "rotational"` or `curveMode: true` when a morph kinks; `shapeIndex` when it twists (`"log"` once to find it); `convertToPath` for circles and rectangles first. |
| MotionPathPlugin | Moves an element along a path: `motionPath: { path: "#route", align: "#route", alignOrigin: [0.5, 0.5], autoRotate: true }`. |
| CustomEase, CustomWiggle, CustomBounce, EasePack | Eases (above). |
| Physics2DPlugin, PhysicsPropsPlugin | Velocity, angle, gravity and friction worked out from the tween's time: throws, falls and drifts. |
| ScrambleTextPlugin | Its scrambled letters are random on every draw, so seeking the same time twice draws different letters. Use a seeded scramble instead (`../motion/techniques/text.md`). |
| Flip | Animates between two layouts it measures. Measure only where layout can be read at build time (a one-clock stage, not a scene file that isn't showing yet), and build the tweens once. |
| Draggable, InertiaPlugin, Observer, ScrollTrigger, ScrollSmoother, ScrollToPlugin | Need pointer or scroll input, which a render never has. To show scrolling, animate the content's `y` on the timeline. |
| GSDevTools | For trying things in a browser only. |

## Utilities

`gsap.utils` needs no registering. Most take the value last; leave it off for a reusable function
(`const toAngle = gsap.utils.mapRange(0, 1, 0, 360)`).

- `clamp(min, max, v)`, `mapRange(inMin, inMax, outMin, outMax, v)`, `normalize(min, max, v)` (to 0–1),
  `interpolate(a, b, p)` (numbers, colours, or objects with the same keys), `snap(step or [values], v)`,
  `wrap(min, max, v)` and `wrapYoyo(min, max, v)`, `pipe(f1, f2, …)`.
- `distribute({ base, amount or each, from, grid, axis, ease })` spreads any value across elements, as a function
  of their index or grid position.
- `splitColor(c)` (`true` for HSL), `getUnit(v)`, `unitize(v, "px")`, `toArray(".item", scope)`,
  `selector(scope)`.
- `random()` and `shuffle()` are unseeded: in a film, use a seeded generator (`../format.md`, rule 5).

## Callbacks and counters

- A count-up tweens a number on a plain object and writes the formatted text in `onUpdate`
  (`toLocaleString`, units, a fixed number of decimals). `tl.to(el, { innerText: 100, snap: { innerText: 1 } })` also
  works for a plain integer.
- `onUpdate` must be a pure function of its own tween (`../format.md`, rule 11). In a one-clock film, everything is
  drawn from `t` in `render(t)` instead.
- No `quickTo`, event listeners or `matchMedia` for anything that renders: there are no events, and the frame is
  fixed.

---
Sources: written for Video Studio from GSAP's own skills (gsap-core, gsap-timeline, gsap-plugins, gsap-utils,
gsap-performance; MIT, © GreenSock) and HyperFrames' GSAP adapters in hyperframes-animation (v0.8.149, Apache-2.0,
© HeyGen), changed: rewritten for seeked rendering, merged and trimmed. See NOTICE.
