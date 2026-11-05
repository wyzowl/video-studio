# Generative design

Grounds and moments drawn by code: flow fields, interference, growth, packing, fields of particles. Writing them
inside HyperFrames (canvas, p5.js, shaders, seeking) is in `../runtimes/canvas.md`; a shader ground with a story is in
`../motion/techniques/effects.md`, "A living field".

## Start from an idea, not a pattern

Before writing code, name the idea in a sentence or two: what process the piece is, and why it belongs to this
subject. "Many small decisions settling into one path" for a planning tool is a flow field converging; "signals
meeting and reinforcing" for a communications product is interference. Choose the algorithm from the idea, not from
a menu. The subject sits in the piece quietly: someone who knows it should feel it; everyone else simply sees a
well-made picture.

Families to draw on:
- **Fields and flows:** layered noise as a field of forces, with marks following it and leaving trails; calm and
  turbulent regions; colour from speed or density.
- **Interference:** points carrying phases that rise and fall; where they meet they reinforce or cancel, building
  patterns from simple waves.
- **Growth and recursion:** branching and subdivision with small, constrained variation, lines thinning at each
  level.
- **Forces made visible:** fields that attract, repel or turn, shown only by what they do to marks passing through.
- **Packing and tiling:** points relaxing apart into cells or packed circles, coloured by size or neighbours.

## Craft

- **Seeded:** one seed per piece, so the same seed always draws the same picture, on every render worker. All
  randomness comes from it.
- **Parameters, named:** how many, how big, how fast, how likely, which angle, at what threshold: in one object at
  the top, tuned by eye until the picture is right. Tune what's there before adding more.
- **Balanced:** complexity without noise, order without stiffness, a hierarchy and a place for the eye even in a
  field of marks.
- **Colour from the brand:** a palette of the kit's colours (a ground, one or two mid tones, the accent sparingly),
  never random hues.
- **Repetition with patience:** dense accumulations of marks, repeated elements and layered patterns reward a long
  look; a limited palette keeps it cohesive.
- **Finish by refining, not adding:** when it isn't right yet, make what's there more coherent before drawing
  anything new.

## In a video

- **Drawn from the time:** each frame is worked out from `t` and the seed. A system that evolves (particles moving,
  trails accumulating) is either written as a formula of time, or simulated once at build from the seed and stored
  frame by frame, so any frame can be drawn on its own, in any order.
- **A ground, behind:** generative fields sit behind the content at low contrast, type-free, with any motion slow
  (`../motion/choreography.md`, "Ambient motion"); as a hero moment, it gets its beat and then gives way.
- **Within budget:** fewer, bigger marks rather than thousands of tiny ones; precompute what you can; keep heavy
  work out of the per-frame draw.
- **Words, if any,** sparse and clean: nothing overlaps, everything inside the margins (`layout.md`).

---
Sources: written for Video Studio from Anthropic's algorithmic-art and canvas-design skills (Apache-2.0, ©
Anthropic) and DiffusionStudio's text-to-lottie notes on ambient fields (MIT, © Diffusion Studio Inc.), changed:
rewritten for video, made seek-safe, and the interactive viewer left out. See NOTICE.
