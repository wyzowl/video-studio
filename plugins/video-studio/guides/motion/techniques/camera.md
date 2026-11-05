# Techniques: camera

A camera in HTML is a wrapper around everything in the scene that moves the opposite way to the camera: the camera
pans right, the world moves left; the camera pushes in, the world scales up. Choosing a mechanism and writing poses
is in `../camera.md`; these are the building blocks. `grep -n "^### " camera.md` lists them.

Rules for every camera here:
- One camera per scene: one wrapper holds all the scene's content, and one function writes its transform from one
  state object (`cam`). Two things writing the same transform is the classic broken camera.
- The scene clips (`overflow: hidden`), its background sits on the scene, never on the moving wrapper (or the
  wrapper's edges show), and the wrapper scales from its centre (`transform-origin: 50% 50%`).
- Measure targets once at build, after the fonts load, and bake the numbers; never measure while it moves.
- Mark the moving wrapper `data-layout-allow-overflow`: it pushes content past the frame on purpose.
- Camera moves ease both ways or land on a strong ease-out; a springy camera feels like the world on a string.
- Give the viewer time to read before the camera moves (0.5–1.5 s after the layout lands) and after it settles
  (at least 1 s, ideally 1.5–2).

### One wrapper: zoom and pan
`translate(x, y) scale(S)` on one wrapper, written from `cam = { scale, x, y }`. CSS scales first, then translates,
so to bring a target at offset `(ox, oy)` from the frame's centre to the centre at scale `S`, translate by
`−ox × S, −oy × S`. Scale by feel: 1.02–1.05 barely noticed, 1.05–1.15 an emphasis, 1.15–1.3 a focus on a region,
1.5–2.5 an element filling the screen, 3 and up a dramatic close-up. A zoom of 1–2 s; under 0.8 s reads as a
teleport, over 2.5 s drags.

### Two wrappers: zoom into an off-centre target
The outer wrapper scales from its centre, the inner one translates, both on the same tween timing and ease. Here
the counter-translation is simply `−offset`, whatever the scale. (The common wrong guess, `−offset × (S − 1)`, only
works at 2×.) Measure the target's real centre (`getBoundingClientRect` after the fonts load); a hand-worked offset in
an uneven row is often the wrong sign. Cap the zoom so the target fills at most about 88% of the frame:
`Math.min(0.88 × W / width, 0.88 × H / height)`. Raster images need resolution for the zoom.

### A zoom-out reveal from far in
Build the whole world at its final size and open with the camera scaled in 4–12× on one detail, then pull out to
1×. Never the other way round (building the close-up at 1× and shrinking the world for the wide), or every label in
the wide frame is too small to read. At 8×, a one-pixel error in the offset is eight on screen, so measure. What's
visible in the opening must be sharp at that scale (text and vectors are; images need the resolution).

### A camera in phases, with drift
Two or three scale phases (pull back, settle, push) at set times, plus a slow sine drift added on top so the camera
is never quite still: `x = sin(p) × 2–8 px`, `y = sin(p × 1.3) × 1–4 px` (the ratio of about 1.3 avoids a mechanical
diagonal), 1–3 cycles over the scene, all composed in one writer. Typical scales: 0.88–0.96, then 0.98–1.02, then
1.04–1.15.

| Shape | Scales | Use |
|---|---|---|
| Focus in | back, neutral, slight push | a product reveal |
| Dramatic reveal | push, neutral, pull | a hero with room to breathe |
| Steady push | neutral, push, more | momentum through a story |
| Bookend | neutral, strong push, neutral | emphasis on the ask, then release |

Start the hero's entrance after the first pull-back lands, or it seems to fly away.

### Following a moving point
Keep a moving element (a caret, a cursor, a travelling object) at a fixed place on screen by working the camera's
offset out from it each frame, as a pure function of time (the element's position must itself come from time). For a
line of text that grows as it types: hold the camera still until the caret reaches about 50–75% across the frame,
then follow it, using `Math.min(startOffset, followOffset)` so there's no jump where following begins. Keep the line
on one line (`white-space: nowrap`) and the caret inline beside the text.

### 3D flight
A static lens (`perspective: 800–1200px` on a stage that never moves), a world inside it with
`transform-style: preserve-3d`, and one camera state `{ x, y, z, rx, ry }` written as
`translate3d(x, y, z) rotateX(rx) rotateY(ry)`, translation first so `x`, `y` and `z` always move along the screen's
axes whatever the tilt. Legs tween that one state: dive in (`power4.out`, 0.6–1 s), flatten and pull back
(`power2.inOut`, 1.2–2 s), pan, dive again. Tilts up to about 65° on `rx` and 30° on `ry` before flat planes go
edge-on. Keep `z` plus any prop's depth under about 0.6 of the perspective distance for anything that must be read.
- Keep the world clean: a `filter`, opacity below 1, `overflow`, `clip-path` or a mask on it (or between it and its
  3D children) flattens the whole scene. Blur goes on the stage or on leaf cards, fades on children.
- Poses are designed by eye and baked: set them, snapshot, adjust.
- Reading happens at the landings: angled, blurred, moving text is texture.
- Depth of field on the planes that aren't in focus (`effects.md`, "Depth of field"), and motion blur on the stage
  for fast legs.
- Ending on a leg that runs past the scene's end leaves the last frame mid-dive: a deliberate way to cut on momentum.

### A page as a tilted card
A real page (built as HTML, not a screenshot, so sections can be highlighted) inside a card held at a fixed tilt
(`rotateY` ±4–12°, `rotateX` 0–6°, perspective 800–2000 px), its content scrolling up inside the card's clip to the
section being shown (0.8–1.8 s, `power3.out`; measured from the real layout). A spotlight layer above the content
dims everything but the target once it lands. The card's shadow falls the way the tilt says (leaning left, shadow to
the right). Several scrolls in one scene share one ease and never overlap.

### Crash zoom
Hold a beat of near-empty frame, then the hero rockets from 3% scale and 20 px blur to full in about 0.3 s
(`expo.in`), with a radial background and speed lines in the same window; on landing it dips to 0.96 and springs
back, the frame shakes for a few frames, and the lines fade.

### Dolly zoom
Background layers scale up by different amounts (far 1.6, middle 1.4, near 1.2) while the subject holds its size,
over about 1.8 s eased both ways, with a hint of skew: the unsettling vertigo move.

### Whip
The subject (or the world) shoots sideways about a frame's width with heavy blur (30 px) in under 0.2 s
(`power4.in`), cut at its fastest; the next shot enters already moving the same way and sharpens
(`../transitions.md`, "Cuts inside a scene", cut on the curve).

### Shake
An impact shakes a stage wrapper through a list of shrinking offsets, a frame or so each with `steps(1)`
(`[28, −24, 20, −22, 16, …, 3, −2]` px, `y` at 0.7 of `x`, alternating), then eases back to rest. A smaller shake
(9 px down to 1) sells a landing. Keep it under half a second, and only on real impacts.

---
Sources: written for Video Studio from HyperFrames' camera rules in hyperframes-animation and the camera primitives
of music-to-video (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as notes and trimmed. See NOTICE.
