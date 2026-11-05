# Camera moves and keyframes

Punch-ins, zooms, pans, reframes and moves made of several poses, in HTML, footage or 3D. A camera move is a set of
poses the viewer must see: where it starts, the moments that prove the move, and where it lands. Cutting and
trimming footage is a different job (`../footage/editing.md`); transitions between scenes are in `transitions.md`.

## Picking the mechanism

| The ask | How |
|---|---|
| Punch in or out | `scale` with `x`/`y` (or `xPercent`/`yPercent`) on a wrapper inside the clip, never on the timed element itself; a `set` for a hard punch, a tween for a smooth one |
| A zoom or reframe in several steps | One wrapper kept alive, moved through a ladder of poses, each with its own ease |
| Pan, reframe, slow push on a still | The wrapper's translation and scale. It's authored geometry: there's no face tracking or automatic reframing |
| Moves chained one after another | Labelled beats on one timeline, each starting where the last pose ended |
| Crop or reframe without moving the picture | `clip-path` or a mask on an inner wrapper; the footage's own time is untouched |
| A wipe, an iris or a reveal between two clips | A mask edge moving across the two overlapping clips (`transitions.md` owns the hand-over) |
| Split screen | Both clips placed as usual; keyframe their inner crops and the divider |
| Constant speed change | `data-playback-rate` on the media (0.1–10, sound pitch kept), for the whole element |
| A speed ramp | A `rate` lane in the media's `data-automation` (`t` in the clip's seconds, `v` 0.1–10) |
| A freeze mid-clip | Export a still (or a short held segment) with ffmpeg and place it as its own clip, then carry on with the next range |
| Something travels a route | A motion path (`MotionPathPlugin`) or sampled `x`/`y`, with `ease: "none"` for even speed |
| The same thing changes size or place in the layout | One element moving between two boxes (a measured FLIP), never a cross-fade between two copies |
| Depth | DOM 3D (perspective on a stable parent, `transform-style: preserve-3d`, `z` travel, rotation) or a three.js camera |

Use the smallest mechanism that shows the idea. Several can combine, but each must make the idea clearer.

## Writing poses

```js
tl.addLabel("wide", 4.0);
tl.to("#cam", {
  keyframes: [
    { scale: 1, x: 0, y: 0, duration: 0.2 },
    { scale: 1.6, x: -320, y: -140, duration: 0.6, ease: "power2.inOut" }, // push to the button
    { scale: 1.55, x: -310, y: -136, duration: 0.3, ease: "power2.out" },   // settle
  ],
  ease: "none",
}, "wide");
```

- `keyframes` arrays give each step its own duration and ease (with `ease: "none"` on the whole tween); percentage
  keyframes time stops exactly inside one tween; `easeEach` gives every step the same feel.
- Work out distances and times from the real layout and the beat, never copied from an example.
- One subject moving between two places is usually one continuous move: every extra keyframe changes its speed and
  can read as a hitch. Split it only when the viewer should feel separate beats.
- Zoom into a point off-centre by scaling and translating the same wrapper so the target stays framed:
  for a target at `(tx, ty)` in a frame of `W × H`, at scale `s`, translate by `(W/2 − tx) × s` and `(H/2 − ty) × s`
  (with the wrapper's origin at its centre).
- Don't overlap two tweens that write the same transform on the same element. An entrance on a wrapper and a push on
  the image inside it is the clean split.
- Don't scale a hero while its mask or clip also changes a lot: let the main move settle, then reveal inside it.
- A plate scaled up ahead of a later zoom fills the frame whenever its clip is showing: hide it (`opacity`) until
  the move begins.

## Timing a move

- Wind up only when it makes the cause or the direction clearer; accelerate out of rest; hold the proving moment;
  follow through.
- Camera moves are calmer than the objects they show, and smooth at both ends (`power2.inOut`, `sine.inOut`); an
  abrupt camera stop feels cheap.
- A punch-in on emphasis can be hard (a `set`), or quick and eased; a push for drama is slow.
- A move's last pose is part of it: hold a final framing long enough to read, and don't drift back to rest or to
  black unless asked.
- On footage: a punch-in of about 1.1 hides a jump cut inside a take; keep a person's head and eyes in the upper
  third of the new framing.

## Text and the camera

Moving text keeps its line breaks, spacing and final fit. When a push makes words unreadable, counter-scale them or
let them land after the camera settles. Snapshot the readable frames.

## 3D

Scale alone is fake depth. Use perspective on a parent, real `z` travel, rotation, and the right layer order when
things cross; check it from an angle (`HF keyframes --shot … --angle iso`, `HF snapshot --angle iso`). In three.js,
keyframe the camera's position and target, objects' transforms and materials, and shader values, all from the
timeline (`../runtimes/three.md`).

## Proving it

- `HF keyframes --json` lists the targets and their stops; `--shot <file> --selector "<the real subject>"` draws its
  path (`--layout strip --from <t0> --to <t1>` for motion in place, `--ghost` for a canvas, `--angle` for depth).
  Even spacing between the ghosts means constant speed, bunching means a settle, wide gaps fast travel.
- `HF snapshot --at <times> --describe false` at the first frame, the proving poses, just before the final hold and
  the final frame. Trust the pixels over the logs: a shot of a helper element, or over a broken frame, proves nothing.

| Fault | Fix |
|---|---|
| Only the two ends exist, so the move reads as a jump | Add the middle poses and hold the proving one |
| The subject is replaced mid-move | Keep one element alive between the two boxes; remove the cross-fade |
| Depth looks flat | Add `z` or camera travel and occlusion; check from an angle |
| It ends in the wrong place | Add a final hold; snapshot just before it and the last frame |
| It doesn't scrub | Remove autoplay and timers; register the timeline after it's built |

---
Sources: written for Video Studio from HyperFrames' hyperframes-keyframes skill and its keyframe patterns (v0.8.149,
Apache-2.0, © HeyGen), changed: rewritten, trimmed, with Video Studio's own footage notes. See NOTICE.
