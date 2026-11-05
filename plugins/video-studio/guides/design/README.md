# Design

How a Video Studio frame should look. The brand kit decides what the brand looks like (colours, fonts, logo,
backgrounds, motion identity: `brand.json`, made by the brand-kit skill); these guides decide how to use it in a
video frame, which is not a web page.

| When you're… | Read |
|---|---|
| Choosing type, sizes and treatments | `type.md` |
| Making sure every word reads, on a phone, in time | `readability.md` (the Readability standard) |
| Placing things in the frame; balance, margins, safe areas | `layout.md` (the Composition standard) |
| Using colour, gradients and grounds | `colour.md` |
| Showing figures and charts | `data.md` |
| Using a brand kit well; logos, product screens and photos | `brand.md` (the Brand accuracy standard) |
| Drawing the film's world: places, objects, people, in one style | `illustration.md` |
| Making a generative ground or a piece of code art | `generative.md` |

## Before designing a frame

1. **Know the subject.** What the product or idea is, who watches, and the one job of this scene. The subject's
   world (its materials, tools, vocabulary, places) is where distinctive choices come from: a frame for a payroll
   tool and one for a children's toy shouldn't be able to swap.
2. **Use real content.** The real words, product, figures and screens, never filler. A recipe shows real
   ingredients; a dashboard shows readings that make sense.
3. **Decide the frame before the motion:** the message, the one focal thing, what supports it, the accent's job and
   what the last frame of the scene looks like. Choose the still first; the motion gets you there.
4. **Plan, then check the plan.** Before building, write the frame's choices down (its colour roles from the kit,
   type roles, layout idea, the one memorable thing) and ask of each: is this chosen for this video, or would it
   appear on any video like it? Change what's generic, then build.

## Taste, as defaults

These are where a Video Studio frame starts. The brief, the brand kit or the user overrides any of them; the point is
that every look is chosen, not that these are forbidden.

- **One hero, in a world.** Each frame has one focal thing, and around it a world made for this film: its ground,
  its atmosphere, the detail that says where we are. Clarity comes from hierarchy (the hero biggest, brightest and
  sharpest; the world quieter and softer), not from emptiness. When a frame fights itself, quieten or remove what
  competes with the hero; keep what gives the frame its depth.
- **Every scene has depth.** A scene stands on a ground from the kit and carries two to five atmosphere pieces drawn
  from its subject: a soft glow behind the hero, a large faint word or figure, hairlines or an axis, shapes or
  objects from the film's world. They sit behind the content at 10–25% strength, and each has slow motion of its own
  (a drift, a breath, a slow turn: `../motion/choreography.md`, "Ambient motion"), so no frame sits dead. Detail in
  front (a glint on a figure, a label, a cursor, a leaf at the edge) adds a third layer where it helps. A flat ground
  is the exception: a deliberate pause, or a concept that is itself flat, and the storyboard says which.
- **Build the film's world.** A film with no footage draws its pictures: a place, its objects, the people or what
  stands in for them, in one style from the kit (`illustration.md`). A world built once can be travelled through and
  returned to at the end; a run of unrelated icons on empty grounds reads as slides.
- **Structure means something.** Borders, cards, dividers, numbers and labels each say something about the content.
  Numbered markers (01, 02, 03) only for a real sequence; a card only where the thing is a card (a product's own
  interface, a real object). A hairline before a card; one divider weight and colour in a film.
- **One display face and one body face** (or one family at two weights), from the kit. One accent colour unless the
  brand has more.
- **Defaults that read as machine-made,** used only when the content calls for them: a centred title on a gradient;
  everything fading in the same way; corner labels and frame borders; glow on interface chrome; generic particle
  bursts and floating blobs; gradient text; a coloured stripe down the left of every card; cyan or purple-to-blue
  on near-black; a grid of identical rounded cards with the same soft shadow; a spaced, tracked-out capital label
  above every heading; one word picked out in italic or colour in every headline; pure black or white where a tinted
  one would do. These are generic, not rich: depth drawn from the film's own subject is the opposite of them.
- **Swap generic for meaningful:** an empty card becomes a node with real detail; an arbitrary circle becomes a port,
  a badge or a state, or goes; grid wallpaper becomes real structure (an axis, a baseline) or space; a generic glow
  becomes a focal halo, an active state, or nothing.
- **One primitive, varied.** A frame or film built from one repeated mark (a dot, a line, a shape), varied by scale,
  density, position and timing, reads designed; many unrelated motifs read cluttered.
- **Vary the grounds through the film.** Move between the kit's grounds: the dark one, the light one, the accent
  full bleed. A light scene after dark ones, or one full-bleed accent beat, resets the eye; a film that stays on one
  ground for more than about 15 seconds starts to feel like one long slide.
- **Keep a system across scenes:** lock the skeleton (margins, grid, type roles, the accent's rule) and vary
  content, scale and polarity (a light scene after dark ones) for rhythm. One signature device for the film.

## Words in the frame

Words on screen are design: each line does one job. Plain words, the viewer's own vocabulary, active voice, sentence
case, no filler. Say what something does rather than selling it. An ask says exactly what happens ("Book a demo",
not "Learn more"), and a thing keeps one name through the film. How the words are written is in `../story/`.

## Working from references

When a video has references (`inputs/refs/` or the brand's `refs/`), measure each one with `HF measure` and write
`docs/style_guide.md` from the measurements: palette, type, shot lengths, transitions, camera, texture, and how text
enters and leaves. Take the reference's grammar, never its content.
- `probe` first, then `cuts` for the shot lengths (whips and flashes come apart from real cuts);
- `events --map` for when things appear, change and hold against the sound's onsets and beats, with
  `frames --events` for a strip of each moment worth a look (or `frames --every 0.5` for an overview);
- `look` for brightness, contrast, saturation and warmth;
- `curve` on one element's move for its length, overshoot and nearest GSAP ease, and `ink` for the size of its type.

The commands are in `../cli.md`, "Measuring a video". The film can be measured against the reference the same way
once it's rendered (`look --compare`, `curve --compare`).

## The last look

Before a frame is done, check: the focal point is obvious; the frame has depth (a ground, atmosphere, detail) and
something alive in it; placement and spacing are deliberate; the hierarchy reads in order; the line breaks are good
(no single word alone, no awkward rag); spacing has one rhythm; each colour has its role; every object earns its
place. Then compare against the brief, and against the film's world: does this frame belong to it?

---
Sources: written for Video Studio from HyperFrames' creative direction and house style in hyperframes-creative
(v0.8.149, Apache-2.0, © HeyGen), Anthropic's frontend-design and canvas-design skills (Apache-2.0, © Anthropic),
DiffusionStudio's text-to-lottie design notes (MIT, © Diffusion Studio Inc.) and Video Studio's production rules,
changed: rewritten for video frames, merged, and every rule made a default. See NOTICE.
