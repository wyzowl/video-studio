# Lottie

Lottie is vector animation stored as data: a JSON file (or a zipped `.lottie`) that a player draws at any time. Use
it for motion that should also live outside the video (a logo ident for a website, an icon set for an app), for
character rigs and After Effects work the user brings, and for line art and icons whose motion is easiest to write
as keyframes. In a video it plays inside HyperFrames, through lottie-web or the dotLottie player; it's checked with
HyperFrames' snapshots like everything else.

## Playing one in a video

- Load the file from the project (`assets/lottie/`), and the player from a copy in `assets/vendor/`
  (lottie-web 5.12.2's `lottie.min.js`), never from the network.
- `autoplay: false`, and always set `loop`: lottie-web treats a missing `loop` as `true`. A looping file is seeked
  to the video's time modulo its own length, so a walk cycle keeps walking; a one-shot holds its last frame. A
  number for `loop` doesn't repeat under seeking: bake the repeats into the file.
- Register every player on `window.__hfLottie`. HyperFrames seeks them all to the video's time (lottie-web with
  `goToAndStop(ms, false)`, which is more exact than frames when the file's frame rate differs from the video's).
- Give the container a fixed size in CSS.
- `renderer: "svg"` by default (sharp at any scale, style-able); `"canvas"` for very heavy files.

```html
<div id="ident" class="lottie-layer"></div>
<script src="assets/vendor/lottie.min.js"></script>
<script>
  const ident = lottie.loadAnimation({
    container: document.getElementById("ident"),
    renderer: "svg", loop: false, autoplay: false,
    path: "assets/lottie/ident.json",
  });
  window.__hfLottie = window.__hfLottie || [];
  window.__hfLottie.push(ident);
</script>
```

- **There's no per-player start time.** Every registered player plays against the video's own clock, so a gesture
  meant for 4 s happens at 4 s inside the file (offset its layers, or wrap them in a precomp layer that starts
  later). In a one-clock film you can instead leave it unregistered, load it with `animationData` (the JSON in a
  script file) so it's ready at build, and call `anim.goToAndStop((t - start) * 1000, false)` from `render(t)`.
  Check either way with snapshots at its first and last frames.
- **Length:** a Lottie-only composition takes its length from the file (`op` ÷ `fr`); a looping one reports one
  cycle, so set the root's `data-duration`.
- **dotLottie** (`.lottie`): copy `dist/index.js` and `dist/dotlottie-player.wasm` from one pinned release of
  `@lottiefiles/dotlottie-web` into `assets/vendor/dotlottie-web/`, import the ES module (its CommonJS build can't run
  as a plain script), point it at the local WASM with `DotLottie.setWasmUrl(...)` before creating the player, and
  draw into a `<canvas>` with `autoplay: false`, `loop` set, and `renderConfig: { autoResize: false,
  freezeOnOffscreen: false }`. Register it on `window.__hfLottie` the same way.
- **Words go in HTML.** In a video, text is HyperFrames text over or beside the Lottie: it takes the brand's fonts,
  HyperFrames' check measures it, and it can be changed without touching the file.
- **Values that change per video** (a brand colour, a stroke width) are set in the data before loading: load the
  JSON from a script file, change the fills you need, then pass it as `animationData`. Lottie's own slots (`sid`)
  are read by some players and not reliably by lottie-web.

### Characters

The Lottie owns the body and GSAP owns the stage. Walk, stop, point and idle live in the file, so joints stay joined
and feet stay planted as the animator made them; cards, captions and camera moves go on the timeline, timed to the
file's beats (its `markers`: `tm` is in frames, so divide by `fr`). A cycle that walks in place travels with GSAP `x`
at the stride's own speed, or the feet slide. Characters come from the user or their designer, or carry a licence
that allows it; say where each came from.

### Files from After Effects

lottie-web plays a subset of After Effects: expressions, most effects (drop shadows, colour overlays), most blend
modes beyond normal, add and multiply, luma mattes and most 3D don't come through. Look at a file's key frames in a
snapshot before building around it.

## Writing Lottie

When a video or a hand-over needs a Lottie that doesn't exist yet, write the JSON. Decide first what it's for: a
transparent asset (logos, icons, loaders, overlays, lower thirds: no background layer) or a full-frame piece (a
background layer in the brand's ground colour).

### Structure

- Top level: `v` (version), `fr` (frame rate; 60 for smooth motion), `ip` and `op` (first frame, and the end, which
  is exclusive: `ip: 0, op: 90` draws frames 0–89), `w`, `h`, `nm` (a meaningful name), `assets`, `layers`.
- Layers: `ty` 4 shape, 2 image, 0 precomp, 1 solid, 3 null (a parent to move groups), 5 text. A layer shows while
  `ip ≤ frame < op`; `parent` chains transforms (no loops); `ks` holds its transform (anchor `a`, position `p`, scale
  `s`, rotation `r`, opacity `o`).
- Shapes: group with `ty: "gr"`, its transform `ty: "tr"` last in its `it` list. Rectangle `rc`, ellipse `el`, path
  `sh`, star or polygon `sr`, fill `fl`, stroke `st`, gradient fill `gf`, trim path `tm` (draw-ons). A fill or stroke
  styles only the shapes before it in its group, and a shape with neither draws nothing. Shapes inside a group draw
  in reverse order.
- Images sit in `assets` and are referenced by file name next to the JSON (or embedded as data URIs for a file that
  must travel alone).
- Masks, mattes, precomps and time remapping work but are the fragile parts: reach for them only when plain shapes
  and layers can't do it.

### Keyframes

- A still value is `{ "a": 0, "k": value }`; an animated one `{ "a": 1, "k": [keyframes] }`, sorted by `t` (frames).
- Each keyframe has `s` (its value, always an array: `[45]` for a rotation). Colours are 0–1 RGBA; opacity is 0–100.
- The curve between two keyframes is split across them: the start keyframe's out handle `o: { x: [x1], y: [y1] }`
  and the next keyframe's in handle `i: { x: [x2], y: [y2] }`, the same four numbers as a CSS
  `cubic-bezier(x1, y1, x2, y2)`. `x` stays within 0–1; `y` can go past 1 for an overshoot or below 0 for a wind-up.
  `h: 1` holds a value until the next keyframe (steps, typewriters, counters).
- The brand kit's eases are GSAP names; these beziers come close to them:

| GSAP | cubic-bezier |
|---|---|
| `power1.out` / `power1.in` / `power1.inOut` | .25,.46,.45,.94 / .55,.085,.68,.53 / .455,.03,.515,.955 |
| `power2.out` / `power2.in` / `power2.inOut` | .215,.61,.355,1 / .55,.055,.675,.19 / .645,.045,.355,1 |
| `power3.out` / `power3.in` / `power3.inOut` | .165,.84,.44,1 / .895,.03,.685,.22 / .77,0,.175,1 |
| `power4.out` / `power4.inOut` | .23,1,.32,1 / .86,0,.07,1 |
| `expo.out` / `expo.inOut` | .19,1,.22,1 / 1,0,0,1 |
| `sine.inOut` | .445,.05,.55,.95 |
| `circ.out` | .075,.82,.165,1 |

- An overshoot reads best as an extra keyframe past the target and back; the compact form is the last in-handle's
  `y` at about 1.1–1.2.
- Give properties their own curves where it helps: opacity can resolve early while position keeps settling, and only
  scale needs to overshoot.

### What players draw differently

- Bake anything computed: counters, particles, orbits and physics become keyframes. Avoid expressions.
- Blur, glow, glass, chrome, displacement and true 3D vary between players: build them from shapes, stacked tonal
  fills and offset copies (a trailing copy at lower opacity stands in for motion blur), or use a baked image.
- Morphing a path needs the same number of points in the same direction; otherwise use a mask, a crossfade or a
  replacement.
- Rounded bars and cards stretch when scaled: reveal them with a mask or a trim instead.
- Text: for a file that travels, convert words to shapes (`sh`) unless the target player has the font. Path-level
  text (strokes drawing on, handwriting, glyph morphs) is always shapes. For vertically centring shape text, use the
  font's cap height (about 0.7 of the size when it isn't known): the baseline sits at the centre plus half the cap
  height.

### From an SVG

- Read it first: the `viewBox`, groups, transforms, styles in `<style>` tags or classes, masks, gradients and text.
  Keep the `viewBox` and scale the composition around it.
- Inline every style, flatten transforms into coordinates where practical, and keep the groups that will move as
  groups, with meaningful names.
- Expand strokes into fills when their joins, caps or scaling might draw differently; keep them as strokes when
  drawing them on is the animation.
- Watch compound paths and holes: even-odd and non-zero fill rules can swap after conversion. Rebuild overlapping
  subpaths that cancel each other as simpler shapes.
- Rebuild filters and shadows as shapes. Prefer plain linear and radial gradients.
- Compare the settled frame with the SVG at the same scale.

## What each kind needs

Timings at 60 fps; motion craft in general is in `../motion/`.

- **Logo:** keep the mark's geometry, colours and spacing exactly; build towards the lockup, land, then hold for the
  last 10–20 frames. Animate the mark's own shapes or strokes first and let the wordmark arrive as the payoff;
  no squash, bounce, spin or blur on brand geometry unless the brand is playful. 45–75 frames for a mark, 75–120 with
  a wordmark. Transparent.
- **Type:** an active word carries the motion while anchor and supporting words stay calmer; break lines by meaning;
  reveal by line with masks for titles. 60–120 frames for a title, 90–180 for a quote (its attribution after a beat).
- **Lower third:** transparent, inside the safe margins, readable over busy footage; 45–90 frames in, 30–60 out;
  bars quick, text softer; a stable hold.
- **Icons, loaders and states:** crisp at small sizes; loops whose first and last frames match (60–120 frames), with
  repeated parts offset in phase rather than in lockstep; success, error and warning play once (30–75 frames) and
  settle, an error firm rather than frantic.
- **Interface moments:** small distances, quick (8–18 frames for a press, 18–45 for a toggle or progress), the state
  change as the climax, and every part that shows the state (handle, fill, colour, label) agreeing.
- **Data:** bars grow from the baseline, lines draw left to right, counters are baked keyframes with tabular figures,
  and labels arrive as their value resolves. Calm ease-outs, no bounce on serious figures.
- **Diagrams:** reveal in the order the system should be understood, lines drawn in the direction of flow (near
  linear trims), nodes settling after their line arrives; labels upright, counter-rotated inside anything that turns.
- **Camera and parallax:** one camera idea (push, pull, pan, follow or parallax), smoother than the objects in it,
  arriving on the strongest framing and holding.
- **Effects:** sweeps 30–75 frames, glow pulses 45–90 at low strength, bursts 20–45 tied to an action. The piece must
  still read with the effect removed.

## Checking and handing over

- The JSON must parse (`node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'))"`).
- Put it in a scene and snapshot frame 0, the middle, the last frame and every key moment (a word landing, the
  lockup forming, a number resolving). Look for a blank layer (a shape with no fill), wrong layer order, clipping,
  holes filled in, text overflowing and motion that drifts after it should have settled.
- A file handed over goes in `renders/` with the video's other files: transparent unless it's full-frame, layers
  named, assets embedded or beside it, and a line saying which players it was checked in (lottie-web, through
  HyperFrames).

---
Sources: written for Video Studio from HyperFrames' Lottie adapter (hyperframes-animation) and
remotion-to-hyperframes' Lottie notes (v0.8.149, Apache-2.0, © HeyGen), and DiffusionStudio's text-to-lottie skill
(MIT, © Diffusion Studio Inc.), changed: rewritten for lottie-web inside HyperFrames, merged and trimmed; its general
design and motion advice is in `../design/` and `../motion/`. See NOTICE.
