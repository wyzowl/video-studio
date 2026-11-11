# The Motion quality standard

The review's **Motion quality** score is judged against this page. The storyboard plans the motion to it, the build
works to it, and HyperFrames' check measures the parts that can be measured. The principles behind it are in
`principles.md`, `timing.md` and `choreography.md`.

## What good looks like

- **One hand made it.** One motion personality from the brand kit runs through the film: its signature ease, its
  three durations and its way of entering, with any borrowed moment deliberate.
- **Every move has weight.** Arrivals settle on a long tail; big moves wind up first; impacts make the world react a
  beat later, big enough to see; organic things travel on arcs; nothing spatial moves linearly unless it's meant to
  look mechanical.
- **Every move has a job:** it reveals, orders, answers, explains or celebrates. Nothing moves just to look busy,
  and nothing breathes, floats or pulses on words or interface unless the plan asks for it (interface pulsing on
  the beat in a music-led film).
- **The eye always knows where to go.** One main action at a time, the most important thing first, everything else
  quieter.
- **The world is alive.** Once things have arrived, the atmosphere and the film's world keep slow motion of their own
  (`choreography.md`, "Ambient motion"), so no frame sits dead; words and interface stay still while they're read. A
  fully still frame is a pause the storyboard chose.
- **It reads at full speed, once.** Words hold long enough to read (`../numbers.md`), nothing important happens
  mid-blur, and a still taken at any moment is a composed frame.
- **Seams are invisible.** Moves hand over at matched speeds; cuts land on motion (`transitions.md`); nothing jumps,
  flickers or pops in a frame late.
- **It's clean.** No stutter on slow moves (transforms, not layout properties), no frames frozen by a seek, no
  element appearing before or after it should.

## How to get there

- **Storyboard:** decide the film's personality, its ease characters and its family of transitions; for each scene,
  the hero, what enters when (on which word or beat), the key moment and how it leaves.
- **Build:** take the eases and durations from the brand kit (`brand.json` `motion`) as the timeline's defaults;
  reveal on the words' times; check strips of every fast move and stills of every seam before rendering.
- **Review:** look at the strips frame by frame and the seams on the frames either side.

## What lowers it

| What you see | Usual cause | Fix |
|---|---|---|
| Robotic | linear eases, straight paths, everything in step | ease-outs and arcs; offset starts and ends by 50–150 ms; add the world's reaction |
| Flat, cheap | only the main motion; opacity-only changes; one ease for everything | secondary action; pair opacity with position or scale; vary the eases by role |
| Slow, waiting | durations past their range; eased both ways where ease-out would do; too much wind-up; long staggers | the duration table; ease-out; wind-up at 10% or none; stagger spread under half a second |
| Jarring | too quick, no ease, no settle, a big move with no wind-up | the minimum durations; ease-out; 50–100 ms of settle; 100–200 ms of wind-up |
| Busy, distracting | too much moving at once; big amplitudes; two heroes; loud ambient | a third at most moving together; smaller moves; one hero, the rest dimmed; ambient at 10–20% |
| No personality | default eases; one duration for everything; entrances that change from scene to scene | the brand's signature ease and duration palette; one entrance pattern |
| Bouncy where it shouldn't be | overshoot as the default | long-tail settles; overshoot only where the personality or the moment calls for it |
| Stutter on a slow move | a layout property animated (`left`, `width`, `font-size`) | the transform that looks the same (`../runtimes/gsap.md`, "What to animate") |
| Fast moves strobing, sharp in every frame | motion blur off on the root or on that part | HyperFrames' shutter on the root (`techniques/effects.md`, "Motion blur") |
| A jump at a cut | the two sides don't match | snapshot just before and after the seam; match position, speed and direction |
| Thin lines shimmering or vanishing | 1–2 px lines resampled by a slow push or scale | lines about 3 px at a lower opacity; whole-pixel positions while they hold |
| Something white lost on white (or dark on dark) | no edge between it and the ground as it arrives | a thin outline or a soft shadow edge while it crosses the matching ground |
| A fade that snaps off | an ease that ends fast (`power2.in`, `expo.in`) on a fade out | a symmetric ease (`sine.inOut`) over a longer fade |
| A slideshow | everything on screen in the first quarter, then frozen | reveal each part on its cue (`principles.md`, "Reveal with the words") |
| Dead | everything arrives, then nothing moves; no atmosphere | slow motion in the world and the atmosphere (`choreography.md`, "Ambient motion") |

## How it's scored

| Score | Means |
|---|---|
| 9–10 | Agency-grade: every move has weight, a job and one personality; the seams are invisible; nothing to fix frame by frame |
| 8 | Strong: a couple of moves could land better, but nothing a viewer would notice as wrong |
| 6–7 | Works, but generic: default eases, little secondary action, a dead world, a seam that jumps or a stretch that freezes |
| 4–5 | Distracting faults: bounce or drift where it shouldn't be, stutter, things popping in, busy |
| 1–3 | Broken: elements missing or frozen, motion fighting the words |

HyperFrames' check measures what it can: motion assertions in `*.motion.json` (an element appearing by its time,
in order, staying in frame, the frame not freezing), frozen sweeps, and lint's layout-motion warnings. The review
judges the rest by eye, from the strips and the render.

---
Sources: written for Video Studio from LottieFiles' motion-design skill (its quality checklist and
troubleshooting; MIT, © LottieFiles) and HyperFrames' motion notes (v0.8.149, Apache-2.0, © HeyGen), changed:
rewritten as a scored standard for video. See NOTICE.
