# Motion: the principles

Why things move, and how motion carries meaning. Timings and eases are in `timing.md`, how several things move
together in `choreography.md`, and what the review expects in `quality.md` and `variety.md`.

## Before anything moves

Three questions, answered before choosing a property or an ease:

1. **What should the viewer feel?** Trust, calm, delight, urgency, surprise, confidence. The feeling sets the speed,
   the ease and how far things travel.
2. **What's the small story?** Every move has a set-up, an action and a resolution, even a fade of a fraction of a
   second: something gathers, something happens, it settles and is read.
3. **What makes it believable?** Weight, eases that match the feeling, paths that curve when the thing is organic and
   run straight when it's mechanical, and the things around it reacting.

And what the motion is for: drawing the eye, showing an order, answering an action (a click, a tap), setting a mood,
showing how things relate, or celebrating. Motion with none of these jobs is noise.

## The film's personality

One motion personality runs through a film, so it feels like one hand made it. It comes from the brand kit's
`motion` (personality, eases by use, a three-step duration palette, the spring, the entrance, the ambient layer). A
kit without one, or a video with no brand, takes the character closest to its subject and tone:

| Character | Feels | Durations | Overshoot | Paths |
|---|---|---|---|---|
| Calm and premium | elegant, unhurried, confident | long (0.5–1.2 s) | none | long, smooth curves; small scale changes (98% to 100%) |
| Clean and professional | clear, efficient, trustworthy | medium (0.3–0.7 s) | none, or a hair on small parts | mostly straight, small arcs for emphasis |
| Playful | warm, friendly, light | short to medium (0.25–0.5 s) | 10–20% | arcs; squash on impacts |
| Energetic | bold, fast, loud | short (0.15–0.4 s) | 15–30% | big diagonal moves, entrances from the edges |

- Keep about 90% of the film in its character; a single moment can borrow another (a calm film's celebration can
  bounce once).
- A recognisable motion identity is three constants: one signature ease for most moves, three durations (quick,
  standard, slow) and one way things enter. The brand kit holds them.
- A brand's own feel wins over the table: the table is where to start when nothing else says.

## Smooth by default

Arrivals settle on a long tail (`power3.out`, or `expo.out` for a fast arrival): fast at first, then easing gently
into place. Overshoot and bounce are a personality, not a way to add emphasis: they belong to playful and energetic
films, to a single celebratory moment, or to something that physically drops. When a film does overshoot, it goes
on position and scale only, never on opacity or colour, and a critically damped or lightly damped spring
(`../runtimes/gsap.md`) reads as physical where `back.out` reads as cartoon.

## Classic principles, for the screen

- **Anticipation.** Before a big move, a small one the other way (100–200 ms, 10–20% of the main move): a card
  dips before it rises, a button shrinks a few per cent before it springs. Skip it on quick moves under about
  0.15 s.
- **Follow-through and overlap.** Parts don't stop together: a child trails its parent by 50–150 ms, trailing parts
  stop 100–200 ms later, and a light part settles after a heavy one.
- **Slow in, slow out.** Entrances decelerate, exits accelerate, moves across the screen ease both ways. Linear only
  for rotation, progress, counting and anything that is meant to look mechanical.
- **Arcs.** Organic travel curves: a slight sideways offset at the middle of the path (small for a professional
  film, larger for a playful one). Straight lines for UI and machines.
- **Secondary action.** The world reacts to the main move: a shadow grows as a card lifts, neighbours shift, a
  surface ripples. 30–50% of the main move's size, 50–100 ms after it, on its own ease, and big enough to see.
- **Staging.** One main action at a time. Everything else waits, dims or holds still so the eye knows where to go.
- **Squash and stretch.** Impacts compress and recover (about 120% by 80% for a few frames, keeping the volume):
  for playful and energetic films only; never on brand geometry or a premium mark.
- **Exaggeration.** As much as the personality allows: none for premium, a little for professional, 15–30% for
  playful and energetic.
- **Straight ahead or pose to pose.** Particles and generative motion are simulated "straight ahead"; everything else
  is planned between key poses.
- **Solid drawing and appeal.** Proportions hold through a move, shadows match one light, curves beat sharp angles,
  and nothing jerks, stops dead or moves on one uniform rhythm.

## Motion carries meaning

- **The ease is the adverb.** The same slide reads as confident on `expo.out`, dreamy on `sine.inOut`, playful on a
  spring with a little overshoot.
- **Speed is weight.** Fast (0.15–0.3 s) is energy and urgency; medium (0.3–0.5 s) is most content; slow (0.5–0.8 s)
  is gravity and luxury; very slow (0.8–2 s) is cinematic and emotional.
- **Direction is meaning.** Up: growth, aspiration. Down: settling, completion, weight. Right: progress, arrival.
  Left: going back, leaving. Growing: importance, arrival. Shrinking: dismissal. Towards the centre: focus. Away from
  it: release, spreading out.
- **Path shape is tone.** Angular is tense and mechanical; curved is relaxed and friendly; a spiral is whimsical; a
  diagonal is purposeful; a radial burst is release.
- **Feelings map to motion:**

| Feeling | Motion |
|---|---|
| Calm, trust | slow, smooth, sine or gentle ease-outs, small distances |
| Confidence | direct, decisive, strong ease-outs, straight horizontal moves |
| Delight, joy | arcs, upward, a little overshoot |
| Urgency, alert | short, sharp, straight lines; a quick horizontal shake that settles firmly |
| Surprise, impact | sudden, expanding outwards, `expo.out` |
| Elegance | slow, controlled, long arcs, no overshoot |
| Weight, seriousness | slow, downward, eased both ways |

- **Colour changes say states:** towards green for success (end on it, don't start on it), a flash of red that
  settles for an error, an amber pulse for a warning, grey for disabled. Neutral changes use opacity, not colour.

## Choosing what to animate

Use the fewest properties that say it: one is direct, two is polished, three or more starts to fight. The first
carries the meaning; the second adds polish.

| Job | Lead with | Support with | Usually not |
|---|---|---|---|
| Something arrives or leaves | position | opacity | rotation |
| Emphasis | scale | a colour or a small rotation | position |
| A state changes | colour, opacity | scale | rotation |
| Direction or flow | position | rotation along the path | |
| Depth | scale with a shadow | parallax | |
| Progress | position or scale (a fill) | colour | opacity alone |
| Success | scale | colour, a stroke drawing on | position |
| Error | a short horizontal shake | colour | scale |

A state change never rides on opacity alone: pair it with position or scale, so it reads at a glance.

## Motion that's alive, and motion that's filler

- Things that really move keep a film alive: the product's interface working, footage playing, a character acting,
  a 3D world turning slowly, a background drifting far behind.
- Filler reads as made by a machine: titles and cards breathing, floating or pulsing in a loop; a title still sliding
  or growing after it has landed; a slow creeping push late in a scene that pulls the eye off what it's reading. It's
  filler when nobody asked for it: a film that's about the beat can make its interface pulse on it, when the plan
  says so.
- A landed title holds dead still; the motion moves on to the next element, the camera or the world behind. A held,
  still frame is better than a frame kept busy by drift. If a held hero needs life, a tiny, low-amplitude jitter
  or the subject's own internal motion (a clock's hands, a dot pulsing on a live status) does it.
- An ambient layer, when a scene has one, lives in the background at 10–20% of the main motion's strength, never on
  words or interface the viewer is reading.

## Reveal with the words

A scene that shows everything in its first quarter and then freezes reads as a slideshow. Bring each part in when
the voiceover names it (or when its beat lands, without a voiceover), spread across the scene, and let what's on
screen at the start be only what's being said then. Fewer things, each arriving on its cue, beat a full frame that
animated once.

## Pictures need motion too

A flat image dropped on the frame looks unfinished. Give it a treatment: a slight perspective tilt
(`gsap.set(el, { transformPerspective: 1200, rotationY: -8 })` with a shadow), a slow push (scale 1 to 1.04 across
its beat), a device frame around a screenshot, one part lifted out and moved at a different depth, or a window that
scrolls it. One element never gets two transform tweens at once (an entrance and a push): put one on a wrapper and
one on the image.

---
Sources: written for Video Studio from LottieFiles' motion-design skill (MIT, © LottieFiles), HyperFrames'
hyperframes-creative motion principles and the explainer, launch and code-change motion language (v0.8.149,
Apache-2.0, © HeyGen), and DiffusionStudio's text-to-lottie motion notes (MIT, © Diffusion Studio Inc.), changed:
rewritten for video, merged and trimmed. See NOTICE.
