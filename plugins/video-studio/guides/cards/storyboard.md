# Card: the storyboard

The storyboard's guides on a page, for the storyboard skill: read it once a session in their place. Each section names
its full guide, and when to open it. Always read each scene pattern a plan uses (`../motion/patterns/`), and for an
animated video `../design/illustration.md` before scene 1, where the film's world and its drawing style are decided.

## Each scene's plan (`../story/beats.md`)

A beat is a moment, not a layout: "the figure slams in so hard the wave behind it ripples, then everything holds".
Each plan says:
- **idea:** the scene's part of the film's world, and the metaphor that drives it, in two or three sentences;
- **style** (scene 1): stroke weight at the video's size, corner radius, level of detail, shading, the grounds' rhythm;
- **feeling:** a specific one on the film's curve: open a gap (curiosity, surprise, tension, recognition,
  frustration), turn (clarity, relief, anticipation), build (the "aha", confidence, momentum, delight, trust), land
  (satisfaction, resolve, the urge to act);
- **technique:** how it makes its point: made concrete, revealed in order, contrast, structure, evidence, landed
  (a callback, a coined term), or persuasion (the pain sharper, a feature as a benefit, the risk taken away);
- **depth** (back, middle, front) and **atmosphere** (two to five pieces from the subject, each with slow motion of
  its own, or why this is a deliberate flat pause);
- **moves:** each moment with its time and a verb for every element, named as the guides name them (pattern,
  techniques, transitions). Name each word on screen in the move that brings it in, with its time: the checks test it
  lands then. A card's words land after the card, so time the words;
- **sound,** and the **hand-over** to the next scene.

Pace the shot to the words: only what's being said is on screen, and each further piece arrives as the voice names it,
through the whole scene; an item's own entrance comes first, so it starts early enough for its words to be read; then
everything holds and reads. Across a run of beats about one thing: one stage, one kind of seam, a transformation kept
inside one scene, hand-overs that match exactly at the cut, and a named rhythm (fast, fast, held, the big moment).

## The frame (`../design/README.md`, `../design/layout.md`)

- **One hero, in a world:** clarity from hierarchy (the hero biggest, brightest, sharpest), not from emptiness; every
  scene on a ground from the kit, with two to five atmosphere pieces at 10–25% strength and detail in front; one
  world for the film, travelled through and returned to at the end, never a run of icons on empty grounds.
- **Chosen for this film:** the machine-made defaults only when the content calls for them (a centred title on a
  gradient, everything fading the same way, corner labels, glowing chrome, particle bursts, gradient text, a stripe
  down every card, a grid of identical cards, a tracked capital label above every heading).
- **Composition** (the Composition standard): an obvious focal point and a path for the eye; deliberate balance
  (centred for calm, anchored to an edge or a grid for energy); the frame filled (a headline often 60–80% of its
  width; splits over centred stacks); room for overshoot; the optical centre a little above the true one; video scale,
  not web (borders 2–4 px, padding 60–140 px at 1080, decoration at 12–25%).
- **A system:** the same margins, grid, type roles and accent rule in every scene; the grounds varied (the kit's dark,
  light and accent; about 15 s on one feels like a slide); one signature device.
- **Drawn for the film:** the build reuses the frames as its layouts, so each thing that moves is one element named
  alike in each frame (`data-el`), the key frame is marked (`data-layout`), motion drawn on a still is marked
  (`data-motion`), items are their stills (`items.json`) and code drawings are functions in `frames.js` (storyboard
  skill, step 3).
- **Tall and square frames** are designed for their shape: stacked rather than side by side, a centred hero at about
  0.42 of the height, bigger type and fewer words a line.
- Open `../design/layout.md` for its moods, diagrams, a product as the hero and footage in the frame; `../design/type.md`
  and `../design/colour.md` when choosing faces, sizes, treatments, colour roles and gradients.

In brief, from those two: one display and one body face from the kit, contrast you can see in motion (300 against
900), display tracking −0.03 to −0.05em, stacked lines at 0.85–0.95, breaks at the phrase (never one word alone),
tabular figures on anything that counts; one accent marking the one thing that matters, strong colour on the focal
element only, tonal steps before effects, tinted neutrals.

## Motion (`../motion/README.md`, `../motion/choreography.md`, `../motion/transitions.md`)

- **One personality,** from the kit's `motion` (its eases, durations and entrance), kept through the film.
- **Hierarchy:** what moves first reads as most important; the hero leads with the strongest move; one main action at
  a time (two or three things moving at once at most); stillness is contrast.
- **Where things come from:** one origin for a group; counter-motion behind the hero; nearer layers further and
  faster.
- **A scene's shape:** it builds (about the first 30%), breathes, then resolves; the transition is its exit.
- **Words move by meaning** ("fall" drops, "snap" hits sharply); one entrance on every word is a text entrance, not
  kinetic type.
- **Ambient motion** in every scene, behind the content and below a fifth of the main motion's energy; words being
  read don't drift or pulse.
- **Transitions:** a few kinds a film, each with a reason; one main one; the opening's the most distinctive; related
  beats can simply cut. Open `../motion/transitions.md` to choose them from its catalogue, and `../motion/camera.md`
  when a scene moves a camera through the world.

## The numbers (`../numbers.md`)

- **Type sizes** (smallest, body, headlines, in the video's pixels): 16:9 at 1920 × 1080, 40, 48 and 80 px up; 1:1 and
  4:5, 32, 40 and 72 up; 9:16, 36, 44 and 80 up. Contrast 4.5:1 for body and smaller, 3:1 for headlines.
- **Safe areas:** 16:9, 5% at every edge; 1:1 and 4:5, 6%; with burnt-in captions, the bottom sixth too; 9:16, the top
  14%, the bottom 25%, the right 15% and the left 6%.
- **Something new** every 2–4 s; nothing unchanged for more than about 4 s while the voice talks; the slowest scene
  about three times slower than the fastest.
- **The first frame** already composed; the hook's promise by 3 s (1.5 s vertical); the ask held 2.5 s with the brand.

---
Sources: Video Studio's own summary of its guides (`../story/beats.md`, `../design/`, `../motion/`, `../numbers.md`);
see each guide's sources.
