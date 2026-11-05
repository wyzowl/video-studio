# Motion: choreography

How several things move together in a scene, and how a scene's motion is shaped from start to end. Timings are in
`timing.md`; named moves in `techniques/`; whole scene patterns in `patterns/`.

## Hierarchy

- **What moves first is read as most important.** Order entrances by importance, not by their order in the page.
- **The hero leads.** The main element gets the clearest timing, the largest move and the strongest ease; the rest
  support it, quieter in every way. Only the focal element gets the strongest personality (a snap, an overshoot).
- **One main action at a time.** In any moment, at most two or three things move at once, and with three or more
  elements, no more than about a third of them are moving together: the first settles as the third starts. Ambient
  motion doesn't count against this.
- **Stillness is contrast.** Not every element needs to move; not every property of a moving one needs to change.

## How properties move together

| Way | For |
|---|---|
| Locked: every property starts and ends together | Interface, panels, buttons, anything rigid or mechanical |
| Lead and follow: one property leads by a few frames (2–8 for small things, 4–14 for expressive ones) | Logos, heroes, anything organic |
| Main and support: one property carries the move, others shift slightly | Most entrances |
| Early opacity, late settle: opacity resolves quickly while position or scale keeps settling | Words that must read early |
| One property overshoots: only scale or rotation, position stays exact | A pop that stays readable |

## Where things come from

- **One origin.** Elements in a group enter from the same direction or a shared point; mixed directions read as
  chaos.
- **From the trigger.** When several things react to one event (a click, a number landing), they start within about
  50 ms of each other from that point, nearer ones first, and can land at different times.
- **Counter-motion balances.** When the hero moves one way, something behind moves the other way, slower: a
  background drifting back at 20–30% of the speed, a shadow shrinking as the hero grows.
- **Depth through speed.** Nearer layers move further and faster: foreground at full speed, middle at about half,
  background at about a fifth.
- **Pointing.** Motion can lead the eye: animate the target before its context, settle on the focal point, aim a
  move towards the call to action.

## A scene's shape

Every scene builds, breathes and resolves:

- **Build (about the first 30%)**: things enter, staggered, in order of importance, each on its cue.
- **Breathe (about 30–70%)**: the content is there and read; the only motion is what belongs to it (the interface
  working, a number counting, a camera settling), or nothing.
- **Resolve (the last 30%)**: a decisive end or the hand-over to the next scene. Between scenes, the transition is
  the exit; only the last scene animates things off.

A single move has the same shape, scaled to its length: wind-up (skipped below about 0.15 s), action, the world
reacting 50–200 ms behind, and a settle, then 100–200 ms of stillness before the next move. Several beats chain in
recognisable progressions: a **build-up** (low, rising, peak, settle), a **cycle** (leave, peak, return), an
**impact** (sudden action, a ripple, a slow settle).

## Chapters

When a scene or a short piece carries more than one idea (a list, several figures, before and after, a problem and a
solution, steps), give each idea its own beat with one job: hook, set-up, claim, proof, contrast, detail, payoff, the
ask. Each beat gets a moment that reads at rest before it hands over. Two ways to build them:

- **One frame that repeats:** the same layout and motion, new content each beat (lists, figures, quick-fire runs).
- **A layout that evolves:** objects and words carry on into new places as the story develops (walkthroughs,
  explainers, set-up and payoff).

A single-purpose beat (a logo landing, one call to action, one figure) stays one beat and lands. How beats hand over
is in `transitions.md`.

## Words in motion

- Give a phrase roles: **anchor** words hold the composition, **support** words stay calm, and one **active** word
  or phrase carries the motion.
- Let the meaning move the word: "fall" drops, "rise" lifts, "snap" hits sharply, "break" splits, "flow" travels,
  "heavy" lands low and slow, "loud" hits big, "quiet" recedes, "fast" compresses, "slow" holds.
- The same entrance on every word is a text entrance, not kinetic type: vary the property, the timing and the
  spacing by meaning, and keep the reading order clear.
- Reveal by line, with masks, for titles and statements; by word for a phrase that builds; by letter only for a
  name or a single word.

## Entrances and exits

| Entrance | How | Suits |
|---|---|---|
| Slide in | 20–40 px offset and opacity to place; from below for arrival, the right for forward, the left for back, above for a drop-down | Most content |
| Grow in | from 85–95% scale and opacity to full (playful: from 70–80%; premium: from 98%) | Cards, notifications, panels |
| Mask reveal | a clip or mask uncovering it: top to bottom (dramatic), left to right (reading order), from the centre (focus) | Titles, images, premium moments |
| Assemble | parts arriving from different places, 50–100 ms apart | Icons, logos, diagrams, charts |

| Exit | How | Suits |
|---|---|---|
| Slide out | offset and fade, eased in | A plain departure |
| Dissolve | fade, perhaps to 98% scale | Gentle exits, a cross-fade |
| Collapse | shrink to 85–95% and fade | Removing, closing, dismissing |
| Transfer | travel towards where it goes, shrinking | Adding to a basket, saving, sending |

An exit leaves near where the next thing arrives, overlapping its entrance by 100–150 ms, on the same ease family.

## Interface on screen

When a video shows an app or a site being used, its states move like a real interface, quickly and clearly:

- **A press:** down a few per cent (0.06–0.08 s), back up (0.1–0.15 s); a playful film overshoots a hair on the
  release. The press causes the next thing on the same frame.
- **A toggle:** the knob slides (0.12–0.18 s, eased both ways) while the track's colour changes with it.
- **Success:** the container settles in, a tick draws on 0.1 s later, the colour moves to the success colour; under
  half a second.
- **An error:** a horizontal shake of 10–15 px, two or three swings getting smaller, 0.3–0.4 s, no overshoot,
  settling exactly where it started.
- **Loading:** a spinner turning at constant speed (1–1.5 s a turn), a progress bar easing, a skeleton's sheen
  sweeping across; calm, never frantic.
- **A list changing:** the others make room first, then the new item slides in and settles.
- **A dialog:** the background dims, the dialog grows from 95% and fades in, its content follows in reading order,
  the close button last.

## Ambient motion

Every scene has an ambient layer by default (`../design/README.md`, "Taste, as defaults"): the atmosphere and the
things in the film's world keep slow motion of their own once they've arrived, so no frame sits dead. It lives behind
the content and stays below about a fifth of the main motion's energy: a gradient shifting over 8–20 s, a background panning at a fifth of the foreground's speed, a few slow
particles, a slow orbit of a backdrop (3–5° a second). Layered elements that drift run on different cycle lengths so
they never fall into step. Words and interface the viewer is reading don't breathe, float or pulse
(`principles.md`, "Motion that's alive, and motion that's filler").

---
Sources: written for Video Studio from LottieFiles' motion-design skill (choreography, narrative structure and
patterns; MIT, © LottieFiles), HyperFrames' creative motion principles (v0.8.149, Apache-2.0, © HeyGen), and
DiffusionStudio's text-to-lottie chapter and typography notes (MIT, © Diffusion Studio Inc.), changed: rewritten for
video, merged and trimmed. See NOTICE.
