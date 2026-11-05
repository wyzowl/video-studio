# Motion: timing and easing

Starting values for durations, eases, springs and staggers in a video. The brand kit's motion identity overrides
them (its three durations and its eases); the film's character (`principles.md`) picks the range. How long words
must stay on screen to be read is in `../numbers.md`.

## Durations

| What moves | Typical | Notes |
|---|---|---|
| A small part reacting (a tick, a badge, a press) | 0.1–0.25 s | Quick enough to feel like an answer |
| Words, a card or a panel arriving | 0.4–0.8 s | Arrivals take longer than leavings |
| A fast move across the frame | 0.3–0.6 s | The time a whip or a push-through takes |
| A camera move, a large reveal | 0.6–1.2 s | Calmer than the objects inside it |
| A dramatic, cinematic build | 1–2 s | For a moment that deserves it, once |
| An ambient cycle | 2–20 s | So slow it isn't noticed at a glance |

- **Exits are shorter:** about 60–75% of the entrance (a card takes 0.4 s to arrive and 0.25–0.3 s to leave). An
  exit is one smooth motion, never slide, stop, then leave.
- **Distance stretches time:** a move twice as far takes about 1.3 times as long; across the whole frame, about
  twice as long. Long moves get a change of direction or speed partway (no unbroken move across more than about a
  third of the frame).
- **Vary the speed:** in a film, the slowest scene's motion is about three times slower than the fastest's. The same
  0.5 s on everything is the flat default.
- **Don't start on 0:** a scene's first move starts 0.1–0.3 s in; a move on the very first frame reads as a jump.
- Entrances that are too quick read as glitches. When a whole film feels rushed, slowing it by about a second
  overall often fixes it.

## Eases by role

| Role | Ease | Why |
|---|---|---|
| Arriving | `power3.out` (the workhorse); `expo.out` for a fast or premium arrival; `power2.out` for gentle secondary motion | Fast at first, landing gently |
| Leaving | `power2.in`, `power3.in` | Gentle start, then away |
| Travelling on screen, a camera move, a colour flood | `power2.inOut`, `sine.inOut` | Smooth at both ends |
| A zoom through something, a throw | `power3.in`, `expo.in` | Accelerating away |
| A loop or slow drift | `sine.inOut` | No hard edges, seamless |
| Rotation, progress, counting digits, anything mechanical | `none` | Constant speed is the point |
| Typing, ticking, blinking | `steps(n)` | Discrete jumps |
| A deliberate overshoot | a spring with damping 0.6–0.85 (`../runtimes/gsap.md`), or `back.out(1.4)` at most | Physical rather than cartoon |

- Ease-in on an entrance feels sluggish, and ease-out on an exit feels reluctant.
- A film draws on about three ease characters across its beats, varying within the smooth families by energy
  (`sine` and `power1` calm, `power3` standard, `power4` and `expo` punchy). One ease everywhere reads flat; bounce
  everywhere reads cheap.
- Match speeds at a hand-over: when one move leads into another, mirror the eases (`power3.in` out of one,
  `power3.out` into the next) so the speed doesn't jump.
- A spring named by damping: 1 never bounces, 0.8–0.85 has a barely felt settle (the "system" feel), 0.6–0.7 is
  playful, below about 0.5 is a cartoon.
- Material sets the feel too: rigid things (metal, stone) take a little longer with no overshoot; paper and cards a
  touch of settle; liquids are slower; smoke and fog slowest; rubber and gel quicker, with real bounce.

## Staggers

| Elements | Gap between each |
|---|---|
| Letters | about one frame (0.02–0.04 s) |
| Words | 0.06–0.12 s |
| List items, grid cells | 0.04–0.08 s |
| Cards and panels | 0.05–0.1 s |
| Hero elements, dramatic | 0.1–0.2 s |

- Keep a whole staggered group's spread under about half a second, whatever the count; spread longer sequences across
  beats instead.
- The next element starts when the one before is 25–50% done: 0% overlap feels methodical and robotic, all at once
  feels cheap, 50% is fluid.
- Stagger from where it means something: reading order, the centre outward, the trigger point outward, or the end for
  an exit. Vary only the start times, on one ease family.
- A grid adds a little for each new row (about 20 ms).

## The beat grid

With music, cue in beats: frames per beat = fps × 60 ÷ BPM. Work out each beat from its index and round it
(`Math.round(PRE × fps + b × fps × 60 / BPM)`), never by adding a rounded beat again and again: at 128 BPM and 30 fps
that drifts two frames in 32 beats. Cut on the beat, and change the layout on the bar. The sync standard is
`../audio/sync.md`.

## Timing for a person watching once

The person watching sees the film once, at full speed, often on a phone. Hold the payoff for 0.3–0.75 s before
it lands, and let it play at normal speed; let the process run fast. Shots average about 2–3 seconds with motion
inside them; a montage can cut every 0.15–0.8 s; a product demo can hold one framing for 7–10 s while the interface
acts.

---
Sources: written for Video Studio from LottieFiles' motion-design skill (timing and easing tables; MIT,
© LottieFiles), HyperFrames' GSAP easing notes and creative motion principles (v0.8.149, Apache-2.0, © HeyGen),
changed: rewritten for video, merged and trimmed. See NOTICE.
