# Type

Choosing and setting type for video. A brand's fonts come from its kit; which families render by name, and how to
load the rest, is in `../format.md`, "Fonts". How large words must be to read is the Readability standard
(`readability.md`).

## Choosing a face

The brand kit's display and body fonts come first. When there's no brand, or the kit has no display face:
1. **Name the register:** institutional, personal, technical, irreverent, ceremonial. It narrows the field more than a
   category does.
2. **Think of the face as an object** the subject might make: a museum caption, a hand-painted shop sign, a terminal
   manual, a label inside a coat, a tax form. The object points at the kind of face.
3. **Doubt the first choice.** The face that comes to mind first is usually the default for that register. An
   editorial film doesn't need a serif, a technical one doesn't need a sans, a children's one doesn't need rounded
   letters.
4. **Check it renders:** a family that resolves by name, or a licensed file in `assets/fonts/` (the brand-kit
   skill's licence rules).

By default, steer away from the faces every generated design reaches for, unless the brand uses one or it's
genuinely the right match: Inter, Roboto, Open Sans, Noto Sans, Arimo, Lato, Source Sans, PT Sans, Nunito,
Poppins, Outfit, Sora, Playfair Display, Cormorant Garamond, Bodoni Moda, EB Garamond, Cinzel, Prata, Syne. Of the
families that resolve by name, Montserrat, Oswald, League Gothic, Archivo Black and the monospaces (Space Mono, IBM
Plex Mono, JetBrains Mono, Source Code Pro) avoid that list. League Gothic and Archivo Black have one weight (400):
they're already heavy, so never ask them for 700.

## Pairing

- One family at two weights, or two clearly different faces: serif with sans, sans with mono, condensed with wide.
  Two faces that are similar but not the same (two geometric sans, two transitional serifs) look like a mistake.
- One face performs and the other recedes; two expressive faces can share a frame only when they share an attitude.
- A pairing's tension should mean something (mechanical against human, public against private). If you can't say
  why the two disagree, use one.
- Faces can take roles, like voices: one for statements, one for figures, one for who said it.
- Inside one face, changing a single thing (proportional to monospaced figures, an optical size, the width axis)
  gives contrast without a second family.

## Setting

- **Weights:** contrast you can see in motion: 300 against 900 rather than 400 against 700. Light weights only at
  large display sizes; body at 400–500. On a dark ground, light text looks heavier: a body weight a step lighter
  (about 350 on a variable face) and 0.05–0.1 more line height; add 0.01em of tracking at display sizes.
- **Tracking:** tighten display type to −0.03 to −0.05em (video softens letter detail); stay within ±0.05em
  elsewhere unless there's a reason.
- **Line height:** 0.85–0.95 for stacked display lines (check descenders and accents still fit), 1.2–1.4 for body.
- **Breaks:** split lines on purpose, at the phrase, never leaving one word alone on the last line. In a stack of
  mixed sizes, the gap between lines is about half to four fifths of the headline's cap height; siblings use one
  spacing step.
- **Alignment:** mixed sizes in one row align on the capitals' centre, not the box.
- **Figures:** `font-variant-numeric: tabular-nums` on anything that counts or lines up; `diagonal-fractions` for
  ratios; `font-variant-caps: all-small-caps` for units and abbreviations; `font-variant-ligatures: none` in code.
- **Variable fonts:** use the variable version when there is one, resting on the brand's weight, so weight and width
  can animate (`../motion/techniques/text.md`, "Variable font axes"). When an animated element replaces part of a
  letter, measure the glyph's ink instead of guessing.
- **Fit to the frame:** a word that must fill a width is sized from its length. For a heavy uppercase sans at
  −0.03em, the largest size that fits is about `frame width ÷ (letters in the longest word × 0.72)`: 7 letters at
  1920 px wide is about 380 px; at 1080 px wide, about 214 px. Lighter or italic faces fit about 10% larger. Fit a
  real line with `window.__hyperframes.fitTextFontSize` (`../format.md`). Text never runs off the frame.

## Size by role

Size type from the frame's height, so it scales across sizes (`calc(0.11 * var(--h))` with `--h` the frame
height). These are the feels; the minimums are in `readability.md`.

| Feel | Share of the frame's height |
|---|---|
| A whisper, a label | 4–6% |
| A soft opening line | 6–9% |
| Narrative body | 9–14% |
| Emphasis | 14–22% |
| A climax | 22–35% |
| Bigger than the person on screen | 40% or more |

When words sit in a column (beside a person, in a panel), size them to the column: a wide column takes larger type,
or it looks underweight in all that space; a plane turned in 3D more than about 8° loses width, so go about 10%
larger.

## Treatments

A palette of treatments to give lines a role. Mix them to the content; they aren't slots to fill.

| Treatment | Set as | Use for |
|---|---|---|
| Quiet opener | italic, 500–600, −0.01em, small | a first line, a "so…" or "you know…", a memory |
| Continuation | italic, 500, smaller still | the line that carries on from it |
| Statement | upright, 600–700, −0.015em | the main clauses: most lines |
| Pivot | upright, 700 | the turn ("but then") |
| Emphasis | upright, 800, larger | a peak, a key achievement |
| Climax | uppercase, 900, −0.03em, line height 0.95, much larger | the one line the film builds to |
| Chapter card | uppercase, 700, line height 0.9, full frame | a section title |
| Broadcast label | 500, +0.02em, small, fixed | a name, a place, a source |
| Side note | italic, 400, small | an aside on a surface |
| Masthead | uppercase, 900, −0.04em, line height 0.85, huge | a title bigger than everything, even crossed by a person |

- One climax a film, ideally near the end; emphasis on no more than about a third of lines, or nothing stands out.
- Italic is for memory, imagination and lyric lines, not for stress.
- Lines follow the story's shape: quiet opening, building statements, a peak, perhaps one climax. Some shapes:
  quiet opener, continuation, pivot, climax; a small question then a big answer; three equal lines and a climax;
  one monumental line held long; a tiny hook then a huge reveal. The number of lines comes from the content.

## In time

- **Order is hierarchy.** What appears first reads as most important; in video, sequence does what position does on
  a page.
- **The entrance is part of the type.** A 0.1 s slam and a 2 s fade say different things in the same face.
- **One type idea per film,** and the focal line first in every frame.

---
Sources: written for Video Studio from HyperFrames' typography notes in hyperframes-creative and the typographic
moves and presets of embedded-captions (v0.8.149, Apache-2.0, © HeyGen), Anthropic's frontend-design skill
(Apache-2.0, © Anthropic) and DiffusionStudio's text-to-lottie typography notes (MIT, © Diffusion Studio Inc.),
changed: rewritten for Video Studio, the banned faces made a default to avoid, and the treatments renamed. See
NOTICE.
