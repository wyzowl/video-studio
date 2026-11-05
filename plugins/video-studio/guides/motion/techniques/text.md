# Techniques: text

Moves for words on screen: typing, swapping, arriving, decoding and emphasis. A catalogue: find the move you need
(`grep -n "^### " text.md`). Every one is drawn from time alone (`../../format.md`): text that changes is worked out
from `t` in `render(t)` or a tween's `onUpdate`, written only when it changes, never set with `tl.call` or `tl.set`
(neither is undone when the film is scrubbed back).

## Typing

### Smooth type-on
A progress value from 0 to the text's length; each frame shows `text.slice(0, Math.floor(n))`. Speed by feel:

| Characters a second | Feel |
|---|---|
| 3–5 | slow and deliberate: a reveal, suspense |
| 8–12 | a person typing: dialogue, narration |
| 15–20 | quick: demos, code |
| 30+ | near instant: filling a long block |

- Keep a `min-width` on the line's wrapper (at least the widest state), or its right edge jitters as it grows.
- Monospace and `white-space: pre` for terminals, so trailing spaces survive and the caret sits right.
- Next to fixed words, space the typed span with `margin-left` on its wrapper: a flex `gap` would space the caret
  too, and a trailing space in the fixed text collapses while the typed span is empty.

### Human typing, with edits
Write the typing as a short list of states at times (`{ t, text }`) and show the latest state that has passed:
keystrokes in quick clusters (0.06–0.2 s apart), pauses of 0.3–0.6 s at word breaks, a typo, backspaces back to the
fork, the fix, sometimes a paste that adds many letters at once. A thinking pause holds a state 0.8–2 s (under half
a second reads as a stutter). States jump instantly: any transition on the text smears it. Land the last state at
least a second before the scene ends; a small pulse (scale 1.03–1.08, out and back) can mark completion.

### The caret
- A block (`display: inline-block`, about 0.3× the font size wide, 0.85–1× tall), its colour on `background`.
- Blink from time: `opacity = Math.sin(phase) > 0 ? 1 : 0` with the phase running a whole number of cycles over the
  scene (one cycle per 0.6–1.2 s), or a `steps(1)` tween with a finite repeat. A fractional count pops on the last
  frame.
- Solid while letters are appearing, blinking when idle: bake the times the text changes from the state list, and
  hold it solid for 0.15–0.3 s after each. Never track "the last change" in a variable: scrubbing back breaks it.
- One caret visible at a time; when a new line starts, the old caret goes.
- Its colour can follow what's being typed (the brand's accent on the brand's name, dim on placeholder text, a done
  colour on the finish): 3–4 colours at most.

### Rotating words
Type a word, hold about 1.5 s, backspace it (removing letters from the end, at about twice the typing speed), pause
0.3 s, type the next. The caret blinks in every idle moment.

## Swapping

### Hard-cut swap
A fixed line whose one slot changes instantly between states: the swap itself is the beat. The rest of the line never
moves; reserve the slot's width for its longest word, or let the line re-centre deliberately.

### A sequence sized by its content
For a run of cards or phrases, give each a length from its words: a base of 0.6–1.5 s, plus 0.03–0.06 s a character,
plus its hold (0.5–1 s; the last one 1–2 s, clearly longer). Work out every start and end once at build, then show the
active one; swap the content only when the item changes. Reserve the body's height so what's below doesn't jump.
3–6 items reads as a sequence.

**Speeding up:** for a roll-call or a flurry of praise, let each hold shrink geometrically (multiply by 0.75–0.88
each step) down to a floor of 0.15–0.3 s, then brake on the last state for at least four times the floor. States
under about half a second are glanced, not read, so drop their per-character time; 12–18 states are fine here.

### Slot roll
A masked window exactly one item tall over a column of items, each exactly that height. Each step is its own tween
from 0 to 1 with `back.out(1.4–2.5)`, 0.3–0.7 s long, started 0.3–0.5 s apart so they overlap; the column's offset
is the sum of all the steps × the item height. That overlap and per-step overshoot is the click-click-click; a single
tween to the end reads as a slide. Tabular figures for numbers. Never change the items' text between steps.
Several quick steps, a pause, then one big final step makes a climax.

### Characters spinning to land
Each character cycles through digits (or symbols) worked out from its own progress, `chars[Math.floor(p × 80 + i ×
3) % 10]`, and shows its real character from about 85% of the way; 1 s each, 0.08 s apart; the landed characters
can change colour.

## Arrivals

### Words on their spoken times
Each word arrives on its word time from the transcript, with a sideways slide that shrinks word by word (about 80 px
for the first down to 12 px), 14 px of rise, 0.35 s, `power2.out`: it reads like a camera settling.

### Waterfall
Words whip up from below, each starting just before the last settles, in a wave that speeds up. Opacity switches
straight on with `set`; only the position moves (`power4.out`, or `expo.out` for extra snap). Heavier words travel
further and take longer: anchors 60–80 px over 0.16–0.2 s; ordinary words 40–50 px over 0.13–0.16 s; light words and
punctuation 30–48 px over 0.1–0.13 s; each starting one or two frames before the last ends. Split the last word into
pieces that travel further for a longer climax. One direction per cascade.

### Beat slam
Short phrases hit one at a time on one shared beat grid (`BEATS = [PULSE × 1, PULSE × 5, …]`) that everything reads
its time from, beats 1.2–1.8 s apart. Each phrase enters a different way: a scale-and-blur slam (from 1.5 and 16 px,
`power4.out`), a snap from the side (`expo.out`), a rise with a turn (`circ.out`); 0.35–0.6 s each. One accent colour
(the key words). Optional ticks or a bar keep the beat on the same grid. The finished stack holds with at most a slow,
finite breath.

### Letters in, then loosened
Letters rise about 80 px with a small overshoot, 0.045 s apart, 0.55 s; then the word loosens by moving each letter
outward on `x` (never by animating `letter-spacing`, which reflows and stutters).

### Line mask
Each line rises into place inside a box that clips it. Leave room for the glyphs: tight line heights clip
descenders and accents even at rest, so give the mask `padding-block: 0.2em` with a matching negative margin (set
the font on the mask so the `em` matches), or release the clip with a `set` once the line has settled. Check a still
of the settled text.

### Wipe with a light edge
The line is clipped from the right (`clip-path: inset(0 100% 0 0)`) and uncovered left to right while a thin glowing
bar travels ahead of the edge (0.75 s, `expo.out`), the bar fading once it's across.

### Outline to fill
An outlined copy (`-webkit-text-stroke`, no fill) appears first; the solid fill rises from the bottom through
`clip-path: inset(100% 0 0 0)` to `inset(0)` (about 1 s, `expo.out`); the outline then fades to about a third.

### A vocabulary of entrances
Names to plan with, each with how it's built:

| Unit | Entrance | Built as |
|---|---|---|
| Letters | soft blur-in | each letter from 8 px blur and 0 opacity, a frame apart |
| Letters | rise / drop | each letter from below (or above) with a fade |
| Letters | from the centre / from the edges | a stagger with `from: "center"` / `"edges"` |
| Words | cross-fade | each word fades up 0.06–0.12 s apart, no movement |
| Words | grey to ink | each word moves from a light grey to the text colour, 0.07–0.1 s apart |
| Words | spring in | each word scales up from about 0.6 with a small overshoot |
| Words | slide | each word a short slide from the side or below |
| Words | blur up | each word rises a little out of a blur |
| Words | build from the centre | words appear outward from the middle of the line |
| Words | depth | words arrive from different depths (`z`) with perspective |
| Lines | mask rise | each line rises inside its own clip (above) |
| Lines | line slide | each line slides in, 0.1–0.15 s apart |
| Whole line | micro scale-fade | 0.96 to 1 with a fade, quick |
| Whole line | blur resolve | 8 px to 0 in 0.13–0.2 s |
| Whole line | sheen | a light passing through the letters (below) |

## Decoding

### Flip decode
Each character turns down from 90° on `rotationX` (hinged at its bottom edge, `perspective: 1500px` on the parent,
`transform-style: preserve-3d`) while showing a seeded glyph that changes every 3–6 frames; past 50–70% of its flip
it shows its real character. 0.4–1 s a flip, 0.03–0.08 s apart. An invisible copy of the whole word behind the live
one keeps the line's width steady while glyphs change. Monospace holds widths best; a digits-only pool decodes a
price; a top hinge gives a falling flap, a centre hinge a barrel roll. Centre it with nothing else around it: the flip
is the moment.

### Scramble decode
Each character shows a symbol from a pool chosen by a hash of its index and progress (`(i × 7 + tick × 13 + 3) %
pool.length`), then its real letter from about 72% of the way, often changing colour as it resolves. Seeded, so the
same frame always shows the same symbol. (GSAP's ScrambleTextPlugin is random on every draw: don't use it.)

## Emphasis

### Words lighting up with the voice
One driver tween over the scene (`ease: "none"`) works out every word's envelope from its word time: nothing before
it starts, rising to full over 0.1–0.25 s, held while it's spoken, then falling over 0.2–0.5 s to a resting level of
0.15–0.4 (a trail of recent emphasis). The envelope drives a glow (`text-shadow` blur, 15–25 px) and a scale (up to
3–10%). For a short line on video, the karaoke version reads better: inactive words dim, the spoken word bright and
larger (30–45 px glow, 15–25% scale, a rest of 0.05–0.2). The brand's word gets a window 1.5–2 times longer. Never one
tween per word.

### Marker effects
Drawn accents round a word, the word itself above them:
- **Highlight:** a bar behind the text (bleeding 6 px past each end, about 35% opacity) growing from the left
  (`scaleX` 0 to 1, 0.5 s); a slight skew looks hand-drawn.
- **Circle:** an ellipse about 130% × 160% of the word, turned −3°, growing from nothing with a small overshoot.
- **Burst:** about twelve short lines radiating at 30° steps, their lengths varied (equal lengths look mechanical),
  each growing from the word outward, 0.03 s apart.
- **Scribble:** a wavy underline drawing itself (`stroke-dashoffset` from its length to 0, 0.8 s); as a
  strike-through, centred on the word.
- **Cross-out:** two lines at ±12°, drawn one after the other, for something being replaced.

In captions, rotate between them every few groups so they don't repeat.

### A gradient through the letters
The text's fill is a gradient wider than the text (`background-size` 200–400%), clipped to the glyphs
(`-webkit-background-clip: text`, `background-clip: text`, `color: transparent`), and `backgroundPosition` moves:
from `100%` to `0%` reads as left to right. `ease: "none"`, so it reads as light; first and last colour stops equal,
so a long crawl has no seam. Variants: one narrow bright band passing once (a sheen); a highlight passing word to
word (two identical copies of each word, the hot one's opacity rising and falling in turn); a hue shift that settles
by cross-fading to a solid copy (never by tweening the stops). Identical stacked copies trip HyperFrames' covered-text
check by design: mark the twin `data-layout-allow-occlusion`.

### Metallic sheen
A grey-white-grey gradient at 250% wide, swept across the type from `200%` to `-100%` over about 1.4 s
(`power2.inOut`), with a small hard shadow under the letters.

### Spotlight
A dim copy of the word sits under a bright copy that's masked by a moving radial gradient (`mask-image` set from a
moving `x` in `onUpdate`), with a faint coloured glow travelling with it.

### Depth layers
The same word 4–6 times, each copy behind offset by another 1–3 px (in one direction for the whole film: the light's
direction) and fainter (0.6–0.85 for the nearest, stepping down 0.08–0.15, never below 0.1), coloured with `rgba` in
`color` rather than opacity; the front copy defines the size. Black weights, large sizes. No `text-shadow` on top, and
no per-letter animation over the stack. The depth can grow from nothing as the layers fade in back to front.

### Wave
Each letter rides a sine wave, `y = amp × sin(phase × 2π + i × 0.45)`, with the amplitude rising then settling (24 px
to 12 to 8) over about 1.5 s.

### Variable font axes
Animate CSS custom properties that feed `font-variation-settings` (`"wght" var(--wght)`, `"opsz" var(--opsz)`):
the letters reshape as weight or optical size moves. Needs the brand's variable font file.

### Rays from a wordmark
A WebGL shader that draws both the word and coloured light rays streaming from it towards a moving light point,
from one rasterised mask of the word. The shader draws the word itself: never lay a second copy of the word over it
(the two never line up). Rasterise with a font that's on the Mac or in the project, and keep the light point level
with the word.

### Word grid
A grid of short words pops in one cell at a time in a fixed scattered order (0.13 s apart), then on the beat every
cell dims to a quarter and one word grows and takes the accent colour.

## Exits

### Ordered exit
Items leave one after another (0.1 s apart) sliding down about 80 px and fading, `power3.in`, 0.45 s each. Between
scenes the transition is the exit (`../transitions.md`): use this at the end of a film or inside a scene.

## Handwriting

A word that writes itself: a single-stroke (one-line) script font or a hand-drawn SVG path per letter, each stroke
drawn on in writing order with `stroke-dashoffset` (`effects.md`, "Lines drawing themselves"), at an
even speed (shorter strokes take less time), with a slight ink hold at the end. Draw strokes in the direction a pen
would, or it looks wrong.

---
Sources: written for Video Studio from HyperFrames' text rules and techniques in hyperframes-animation, and the text
motion primitives of music-to-video (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as notes, merged and made
seek-safe. See NOTICE.
