# Layout, and the Composition standard

How to compose a video frame, and the standard the review's **Composition** score is judged against. The
storyboard composes its frames to it, the build keeps those frames, and the checks measure what can be measured. The
margins and safe areas are in `../numbers.md`.

## The Composition standard

### What good looks like

- **One clear focal point,** found in a fraction of a second, with a path for the eye to travel on to what supports
  it. Everything else is quieter: smaller, dimmer or still.
- **Balance.** The frame's weight is deliberate: centred and symmetrical when it means calm or ceremony,
  asymmetrical and anchored to an edge or a grid when it means energy or information. Nothing feels about to fall
  off, or floating by accident.
- **Margins and safe areas kept.** Words and anything that must be seen sit inside the margins for every size the
  video is delivered at, clear of the platform's buttons and captions (`../numbers.md`, "Safe areas"), with room
  left for any overshoot.
- **Filled with purpose, not crowded.** The hero is big (a headline often 60–80% of the frame's width); empty space
  is part of the design, not left over; nothing is cramped against an edge or another element.
- **Depth.** A ground, the content, and perhaps fine details in front: the frame has layers, not a single flat
  plane, unless flatness is the idea.
- **A system across the film.** The same margins, grid, type roles and accent rule in every scene, so the film looks
  like one piece; scale, framing and polarity change for rhythm.
- **Every size composed.** A 9:16 or 1:1 version is laid out for its shape, never a 16:9 frame shrunk or cropped.

### How to get there

- **Storyboard:** decide each frame's focal point and its layout idea before its details; draw the frames at the
  video's size with the real words and assets; check them at phone width with the safe areas shown.
- **Build:** lay out from variables (margins, safe areas, a grid, a type scale) so each delivered size is a layout of
  its own; keep the storyboard's frames; snapshot every scene's key moment and compare it with its frame.
- **Review:** look at every key frame as a still: where does the eye land first, then next? Is anything cramped,
  floating, empty or covered?

### What lowers it

| What you see | Usual cause | Fix |
|---|---|---|
| A web page, not a video frame | web sizes, a centred stack floating in space, thin borders and soft shadows | video scale (`../numbers.md`); anchor to edges or a grid; heavier structure |
| Nowhere to look | several things the same size and weight | one hero; the rest smaller, dimmer or later |
| Empty | small content in a big frame; nothing in the ground | scale the hero up; give the ground depth from the subject (`README.md`) |
| Cramped | too many things; no margins | fewer things at once; the margins in `../numbers.md` |
| Covered | content in a platform's button zone, under captions or a face | the safe areas; place around the person |
| Off balance | weight all on one side with nothing answering it | a counterweight, or a deliberate edge anchor |
| Each scene its own layout | no system | lock margins, grid and type roles for the film |
| Squeezed into another size | one layout for every size | a layout per size |

### How it's scored

| Score | Means |
|---|---|
| 9–10 | Every frame composed like a still: an obvious focal point, deliberate balance, margins kept, a clear system |
| 8 | Strong; one frame is a little crowded, empty or off-balance |
| 6–7 | Works, but web-like or generic in places: centred stacks, small content, weak hierarchy |
| 4–5 | Cramped, empty or covered frames; no consistent system |
| 1–3 | Things off the frame, overlapping or unreadable for layout reasons |

HyperFrames' check measures what it can (text outside its box or the frame, overlapping and covered text, panels
stuck across the frame's edge, text in a kept band: `../cli.md`, "lint and check"). Balance, hierarchy and system are
judged by eye, from the stills.

## Composing a frame

### A frame, not a page

The brand kit is sacred for what the brand looks like (its colours, fonts, logo and rules) but says nothing about
how to compose a frame: that's ours. A web card's 1 px border and faint shadow vanish on video; the brand's colour
stays exact while sizes, spacing, borders and decorative strength are scaled for video (borders 2–4 px, padding
60–140 px at 1080p, decoration at 12–25% opacity rather than 3–8%).

### Layers

A produced frame often has three:
- **The ground:** a colour, gradient, image or texture from the kit, perhaps with depth from the subject
  (`README.md`, "Taste, as defaults").
- **The content:** the message itself: the words, the product, the figure, the footage.
- **Details in front:** fine structure that makes it look made rather than generated: a hairline rule, a label, a
  data bar, a mark.

Six to ten pieces in all is a fair starting point for a produced marketing frame; a lower third, a logo sting or a
title card needs far fewer. Add a piece only when it helps the hierarchy, the motion or the idea.

### Placing things

- **Lead the eye.** One focal point and a second place for the eye to go; sequence (what appears first) does what
  size does on a page.
- **Fill the frame.** Big type, big product. Most frames anchor content to an edge or a grid line (left and top, or
  right and bottom) rather than floating it in the middle; split frames (a figure on the left, the picture on the
  right; a bar of details over a full-width picture) beat a centred stack.
- **Structure animates well.** Rules, dividers and panels give the eye a path and can draw themselves on.
- **The optical centre** sits a little above the true centre: a centred element placed mathematically looks low.
- **Room for motion:** leave margin where an element overshoots, scales or slides, so it never kisses the edge.
- **Empty space works:** it frames the hero and gives the next element somewhere to arrive.
- **Align to something:** a grid, a baseline or an optical axis that runs through the film.

### Tall and square frames

Margins, layers, hierarchy and depth all still apply, but a wide layout doesn't move into a tall frame: design for
the video's size from the start.
- Stack rather than set side by side: a split becomes top and bottom, three across becomes a vertical list or
  stacked bands. A square takes side by side only for two compact things.
- A centred hero sits at about 0.42 of the frame's height (806 px in a 1080 × 1920 frame, 454 px in 1080 × 1080),
  above the true centre and clear of the bottom safe area.
- Bigger type and fewer words a line: short lines and more vertical rhythm.
- Centred heroes, layered depth, full-width bands and vertical thirds travel well; wide splits and three-across
  layouts don't.
- With burnt-in captions, plan content into the top five sixths of the frame, leaving the caption band clear
  (`../numbers.md`, "Safe areas"); grounds and ambient layers can still run full bleed.

### Approaches by mood

The way a frame is composed carries a mood. Some approaches, as starting points (the brand kit still dresses them):

| Mood | Composition |
|---|---|
| Precise, analytical | a strict column grid, everything snapped to it; figures dominating; hard cuts; nothing floats |
| Premium, timeless | wide margins, symmetry, thin type with wide spacing, slow sequential reveals, long holds |
| Raw, rebellious | type at angles, overlapping and breaking the frame's edges, texture, deliberate irregularity |
| Loud, launch energy | type as the picture: layers of words at different scales filling half the frame or more; fast, hard stops |
| Futuristic, immersive | thin weightless type, extreme changes of scale (tiny to vast), light tracing paths |
| Warm, personal | close framing, one element filling the frame, soft slow movement, nothing hurried |
| Joyful, communal | pattern and repetition, rich layered colour, things popping into place |
| Dark, dramatic | near-monochrome with one accent, elements emerging from darkness, slow push-ins, the pause before the hit |

### Diagrams and systems

Design the final arrangement first, then the build towards it. Choose the structure that says the relationship: a
chain for a sequence, a bracket for grouping, an orbit or a hub for one thing at the centre of others, a grid for
equals, rows for a list. Every node carries meaning (a label, an icon, a state), every line means a connection, and
the order of reveal explains the system. Labels on things that orbit stay upright.

### A product as the hero

The product is the hero, shown as itself: one claim and one proof on screen at a time, never a collage of
screenshots. A product looks believable through a coherent state (real data that makes sense, one task in progress)
rather than through density.

### Footage in the frame

- **Picture in picture:** wrap the video in a plain `<div>` (no `data-` attributes) and move and scale the wrapper
  with transforms (`x`, `y`, `scale`) and round it with `border-radius` and `overflow: hidden`, never by animating
  `top`, `left`, `width` or `height`. Fade the wrapper, not the video: HyperFrames sets the opacity of a clip itself
  while it's showing.
- **Words behind a person:** the full picture at the back, the words over it, and a cut-out of the person on top
  (`../footage/cutouts.md`), so the person passes in front of the words. Start both videos at the same time so
  they stay in step, and reveal the cut-out by its wrapper's opacity.
- Words sit on the side the person isn't facing, clear of the face (`../footage/overlays.md`).

---
Sources: written for Video Studio from HyperFrames' video composition, composition patterns and visual styles in
hyperframes-creative (v0.8.149, Apache-2.0, © HeyGen) and DiffusionStudio's text-to-lottie layout notes (MIT, ©
Diffusion Studio Inc.), changed: rewritten as a scored standard and notes; the named styles left out and their
composition kept as moods. See NOTICE.
