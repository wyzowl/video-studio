# Motion

How things move in a Video Studio film. Start here, then read only what the job needs.

| When you're… | Read |
|---|---|
| Choosing a film's motion personality, or deciding why something moves at all | `principles.md` |
| Setting durations, eases and staggers, or laying a beat grid | `timing.md` |
| Moving several things at once; giving a scene its shape; entrances, exits and interface | `choreography.md` |
| Planning a camera: which mechanism, its poses and its timing | `camera.md` |
| Going from one scene to the next, or cutting inside one | `transitions.md` |
| Shaping a whole scene | `patterns/` |
| Building one move | `techniques/` |
| Choosing or using an animation library (GSAP, Lottie, three.js, canvas…) | `../runtimes/` |
| Checking a film's motion before its review | `quality.md` (the Motion standard), `variety.md` (the Variety standard) |

Every move keeps HyperFrames' contract (`../format.md`): drawn from the time alone, `fromTo` with its start state
inside a scene file, transforms and opacity rather than layout properties, positions measured once at build, nothing
random that isn't seeded, and nothing that repeats for ever.

## Planning with names

The storyboard describes each scene's motion with the names these files use, so the build can look each one up:
the scene's pattern if it has one, its signature move, the moves around it and its transition. For example: "data-hero;
the figure counts up, growing, with burst lines as it lands; whip into s04." The names are the patterns' file names
and the techniques' headings.

## Small moves by role

A vocabulary for briefs and plans. How each is built is in `techniques/`, and its timing in `timing.md`.

| Role | Move | Built as | Suits |
|---|---|---|---|
| Arrive | slide in | 150–200 px from one side with a fade, `power4.out` | calm, building, professional |
| Arrive | grow | from scale 0, about 0.6 s, `power3.out` | calm, gentle |
| Arrive | punch | from 0.6 scale on a spring with overshoot | impact, energy, a playful film |
| Arrive | fade | opacity alone, about 0.4 s | quiet |
| Arrive | blur in | a fade out of about 14 px of blur | cinematic, dreamy |
| Arrive | type on | characters revealed in order | technical, narrative |
| Arrive | word by word | each word fades and rises, about 0.1 s apart | storytelling |
| Arrive | wave | letter by letter from below, about 0.04 s apart | flowing, musical |
| Arrive | drop | from above with a bounce | a playful film |
| Arrive | slam | from far above on `power4.out`, a shake as it lands | impact, weight |
| Emphasise | pulse | to about 1.12 and back on the beat, `sine.inOut` | rhythm, a peak |
| Emphasise | shake | a few pixels either side and back | urgency, an error |
| Emphasise | glow | a glow up and back on the word | importance |
| Emphasise | colour shift | to the accent | a change |
| Leave | fade out | about 0.4 s, `power2.in` | an ending |
| Leave | slide out | off the frame, `power2.in` | a hand-over |
| Leave | scale out | to about 1.06 as it fades, `power2.in` | a hand-over |
| Accent | underline sweep | `scaleX` from 0 out of the left edge | pointing at a word |
| Accent | bar wipe | a bar crossing to reveal what's behind | a change of section |

---
Sources: written for Video Studio from HyperFrames' animation index in hyperframes-animation and the motion
vocabulary of motion-graphics (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as an index of our guides, and
the vocabulary rewritten for planning. See NOTICE.
