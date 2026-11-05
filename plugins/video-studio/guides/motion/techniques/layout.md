# Techniques: layout and objects

Moves where a layout itself moves: groups bursting out or assembling, rings and orbits, containers that grow, morph
or swap, things colliding, mosaics building. `grep -n "^### " layout.md` lists them. Throughout: work out positions
from the index (never `Math.random`), set every element at its start state before the first tween (`gsap.set` at
build, so frame 0 is right), use absolute values (never `"+="`), and animate transforms and opacity, not layout
properties.

## Groups arriving

### Pop in
The plain arrival for a card, icon or callout: `fromTo` scale 0 and hidden to 1 and shown, 0.4–0.7 s, `power3.out`
(`expo.out` for a punchier front), with at most 0–32 px of rise (more reads as a slide). No overshoot by default;
a playful film can use a spring with a little overshoot (`../../runtimes/gsap.md`). A group pops 0.04–0.08 s apart
and lands inside half a second (`min(0.06, 0.5 ÷ count)` apart); past nine items, use a sweep instead. Growing
out of a point (a marker, a pointer's tip) sets `transform-origin` there. It lands and holds: no loop on the end.

### Burst from the centre
Items start together at the centre and spread to their places: each holds its offset (`data-target-x/y`), centred
with `xPercent: -50, yPercent: -50`, and tweens `x`/`y` from 0 to the offset with scale 0.6 to 1 and a fade, 1–1.8 s,
`power3.out` (never an ease-in: it looks like being sucked back), 0.04–0.08 s apart. Best with 3–8 items; with more,
start them part-way out (about 30%) so they don't pile up. To land with a counter or a beat, drive every item from one
0–1 value with the driver's exact duration and ease. Let the burst be the beat: a label waits until after.

### Assemble from a 3D cloud
Each element starts at its own point in a cloud worked out from its index with the golden angle (`a = i × 2.39943`:
`x = cos(a) × R`, `y = sin(a) × R`, depth stepped from near to far, tilted by `sin(a)` and `cos(a)` × 40–110°), parked
there invisible, then flies to its flat place (0.7–1.4 s, `power3.out`, 0.03–0.09 s apart) while the whole cloud turns
slowly (15–60°). Needs `perspective` on the parent and `preserve-3d` on the stage and every element, and
`backface-visibility: hidden`. It always resolves completely flat. 4–14 elements. Swapping one set of letters for
another through the cloud uses one shared progress for both sets. Scattering out to the cloud is for a film's last
beat only.

### Pack into a mosaic
Tiles start far apart at offsets and tilts worked out from their index (`((i × 53) % 200 − 100) × 9` and so on),
faint and small, then land in their grid cells (0.6 s, `back.out(1.6)`), in a diagonal ripple ordered by
`column + row` (0.06–0.07 s per step), with a small settle on the finished grid. A title can land over the finished
mosaic.

### Tiles revealed in a sweep
A grid of tiles in the brand's colours pops in (from 0.6 scale) in diagonal order (`row + column` × 0.06 s), building
a poster; the title settles over it last.

## Rings and networks

### Orbit
Items flip in from 3D (from ±60–120° on both axes and 200–400 px back) in their places on an ellipse round a centre
(`x = cos(a) × Rx`, `y = sin(a) × Rx × 0.4–0.7`), then travel round it, each from its own starting angle, one
revolution every 4–25 s (the orbit tween must outlast the scene). Set each item at its place on the ring, hidden,
before anything starts: flipping in at the centre and jumping to the ring is the classic fault. Inside
`preserve-3d`, paint order follows real depth, so bring the centre label forward (`translateZ(220px)`) and size the
ring so items clear it at every angle. Collapse the ring into the centre by multiplying both radii by a value going
from 1 to 0.

### A network round a hub
8–12 avatars or icons on a horizontal ellipse (about 20–30% of the width by 18–25% of the height) round a hub, with
lines that draw outward from the hub to each one after they land (dash offset from the line's length to 0; lengths
with `Math.hypot`). The hub sits above the lines, which stop at its edge, and every position comes from the hub's real
centre. Hub first, then the cascade (0.06–0.1 s apart), then the lines; hold at least a second on the finished network.

## Comparisons

### Two tilted cards
Two equal cards side by side, turned towards each other on `rotationY` (10–18°), each sliding in from its own side
and pivoting into place (from 4–12° further), the second 0–0.3 s behind; shadows fall with the facing direction. Their
words fade up as they settle. Badges go on the parent, not inside a card (they'd inherit the tilt). With three cards,
the middle one stays flat. Two lines of body text at most on a tilted card.

## Containers changing

### A panel that grows
A drop-down opening, a row growing its steps, a composer card getting taller: build the layout at its expanded size,
then fake the closed state. The panel's body sits inside a mask of its final height and starts slid up behind the
header (`y: −height`); everything below it sits in one wrapper that starts slid up by the same amount; one tween
moves both to 0, so the edge and what it pushes stay in contact (0.35–0.6 s, `power3.out`; closing faster with
`power3.in`). Rows fade in a quarter of the way through. Mark the mask `data-layout-allow-overflow`. When the surface
must stretch in place, drive the mask's `scaleY` and its content's inverse (`1 / s`, clamped above 0) from one value.
Never tween the height.

### A container that morphs
One card changes apparent size, corner radius and surface between two shots: `scale` for size (never width or
height), with `borderRadius` (divided by the end scale), background and shadow on the same tween (`power2.inOut`,
0.6–1.2 s). The old content fades out in the first 30–50% and the new in over the last 30–50%. It can finish by
fading over an identical real element underneath. Hold the first shot a beat before morphing; stack by page order,
never by changing `z-index` mid-fade.

### Swap at the same place
The outgoing element shrinks to 0.6–0.8 and fades (`power2.in`, 0.3–0.5 s) as the incoming one grows from that
size with a spring (`back.out(1.4–2.2)`, 0.45–0.7 s), starting 0.1–0.2 s before the exit ends, on top, both scaling
from the same centre in the same fixed box. Its inner details reveal 0.2–0.4 s after it settles. Chains through
several states.

### The whole look changes, one thing stays
Several complete versions of the scene's look stacked as full-frame layers (background, chrome, type, icons, logos
each fully styled), cross-faded one into the next in about 0.3 s (outgoing and incoming at the same moment, only ever
two at once), every 0.8–1.5 s, while one element above them all never moves. Shared parts sit at identical positions
in every layer. Only opacity animates; the camera never moves.

### A palette that flips on the beat
The same layout re-coloured instantly on each beat (`set` on the background, the text and the accent), cycling
through a few of the brand's colour pairings: the motion is the colour change.

### Card flip
A card with two faces (`backface-visibility: hidden`, the back turned 180°) inside a parent with deep perspective
(about 2400 px) turns 180° (1 s, `power3.inOut`) while its shadow narrows and recovers, then settles with a tiny
scale. For a before and after, or a new version.

## Moving and colliding

### Slow, fast, slow
Moving a composed group to make room: no single ease does it. Chain three tweens on one property: a ramp (about
10% of the distance in 20% of the time, `power3.in`), a burst (about 65% in 18%, linear), a long tail (about 25% in
62%, `power4.out`); the tail at least three times the ramp's time. Reveal new content during the burst.

### Collision
An incoming element knocks the current one out of the frame: one driver (`back.out(1.2–2)`, 0.6–1.4 s) computes
both in the same frame: the newcomer travels from off the frame to the centre, settling from a 5–15° tilt, appearing
fast; the other leaves the opposite way along the same axis and is gone by 40–50% of the driver. Separate tweens lose
the cause. The newcomer sits above, and holds at least a second after.

### Fill along a bar
A bar fills from one side (`scaleX` from 0 with its origin at that edge, 0.35 s, `power2.out`), alternating
directions down a stack, and its label switches colour the moment the fill passes it.

## Reveals with shape

### Iris open
The scene is clipped to a circle growing from nothing at its centre (`clip-path: circle(0% → 75%)`, 0.9 s,
`expo.out`), with a glowing ring expanding past it just ahead; the hero rises in once it's open.

### Liquid shape
A large soft shape is a `clip-path` polygon with the same number of points in every state, tweened between two or
three hand-drawn outlines (0.7 s each, `power2.inOut`) while it scales and turns slightly; type over it can use
`mix-blend-mode: difference`.

### Gooey blobs
Coloured circles under an SVG "gooey" filter (a 20 px blur followed by a colour matrix that sharpens the alpha,
`0 0 0 22 −10`) spring out from the centre to their places and drift to fixed end points, merging where they touch;
the word appears over them.

---
Sources: written for Video Studio from HyperFrames' layout, morph and transition rules in hyperframes-animation and
the layout motion primitives of music-to-video (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as notes and
made seek-safe. See NOTICE.
