# Illustration: drawing the film's world

When a film has no footage, every picture in it is drawn: the places, the objects, the people or what stands in for
them. This guide is how to draw them so the film looks made for its brand and its story, not put together from icons.
The frame's design is in `README.md` and `layout.md`; the brand's own style is the kit's (`brand.json`).

## A world, not a set of icons

- **Decide the world first,** from the brief and the script, before drawing anything: where the story happens (a
  home, a street, an office, a kitchen, a phone), what's in it (the things the voiceover names), and who's there
  (people, hands, a mascot, or shapes that stand for them).
- **Build it once, as a set,** and move through it: a cut-away house, a desk seen from above, a street of shops. The
  camera visits each part as the words reach it (`../motion/camera.md`), so the film reads as one place rather than a
  run of separate slides. The closing scene comes back to the opening's place, changed by the story (the dark room
  now lit, the empty shelf now full), which pays off the hook (`../story/principles.md`).
- **Objects carry the story.** The appliance the voice names, the bill, the meter, the phone: each drawn with its real
  parts (a kettle's spout, lid, handle and base; a meter's display and dial), enough to read at phone size and to look
  made, never more detail than the style holds. The product's own interface stays the real one (`brand.md`, "Real
  assets").
- **People,** when the brief has them: the brand's own illustrations or characters if the kit has some; otherwise
  hands, figures or silhouettes drawn in the film's style. Never a real person's likeness unless the user supplies it.

## One style, from the kit

- **The kit sets the style:** its graphic language and `style` (`brand.json`: line weight, corner radius, how cards and
  the accent are used). The first scene's plan writes the style down (stroke weight at the video's size, corner
  radius, level of detail, how shading is done) and every scene keeps to it.
- **Colour:** the kit's colours, in flat fills, with one step lighter or darker for depth (a side in shadow, a lit
  face). The accent marks what matters in each scene: the appliance that's running, the light that's on, the
  figure that changed.
- **Light makes it a world:** a lit window, a lamp's pool of light, a glowing screen, the brand's glow behind the
  hero. Use it to lead the eye to the hero, and change it to show a change (a room lights up as the voice says it).

## Depth

- **Three planes:** the back (walls, sky, a horizon, the atmosphere), the middle (the hero and what's around it) and
  the front (a sill, a plant, a hand, a label). Draw each as its own group, so the camera can move them at different
  speeds (`../motion/choreography.md`, "Where things come from").
- **Scale and overlap tell distance:** the same object smaller and softer further back; what overlaps is in front.

## Making it move

- **Draw in SVG inside the composition,** crisp at any size, with each object and each moving part its own group
  and its own origin, so a door can open, a dial turn, steam rise and a light come on.
- **The world stays alive:** once something has arrived it keeps small motion of its own, on its own cycle: a light
  that flickers on and hums, steam that drifts, a fan that turns, a curtain that sways (`../motion/choreography.md`,
  "Ambient motion"). Words and interface stay still while they're read.
- **Draw once, use many times:** a lamp drawn as a `<symbol>` and placed with `<use>` in three rooms; a set of
  appliances shared by every scene that shows them.

## What lowers it

| What you see | Usual cause | Fix |
|---|---|---|
| Clip-art | one line icon standing in for a scene | draw the place, and the object in it with its parts |
| A slideshow | each beat a new object on an empty ground | one world, travelled through and returned to |
| Mixed styles | shapes from different sources; different line weights and corners | one style from the kit, written in the first scene's plan |
| Flat and lifeless | no light, one plane, nothing moving once it has arrived | light, three planes, small motion in the world |
| Generic | props any company could use | the brief's own things: the product, the place, its real parts |

---
Sources: Video Studio's own guidance.
