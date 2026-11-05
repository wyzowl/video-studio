# Caption style

How captions look and move for the content. The brand kit's fonts and accent come first; a library item comes before
a style built by hand (`README.md`).

## Reading the content

Read the whole transcript before choosing. Tone (documentary, conversational, energetic, poetic, keynote,
investigative, music), the framing (close-up, mid-shot, wide, a montage) and the platform (vertical, landscape,
square) together suggest a style:

| Tone | Type | Motion | Colour | Size at 1080 high |
|---|---|---|---|---|
| Launch, hype | heavy condensed, 800–900 | a pop on each word (a spring with a little overshoot), 0.1–0.2 s | bright on dark | 72–96 px |
| Business | a clean sans, 600–700 | fade and rise, `power3.out`, 0.3 s | white or neutral, a muted accent | 56–72 px |
| Tutorial | mono or a clean sans, 500–600 | type-on or fade, 0.4–0.5 s | high contrast, minimal | 48–64 px |
| Story | serif, 400–500 | a slow fade, `power2.out`, 0.5–0.6 s | warm, muted | 44–56 px |
| Social | rounded sans, 700–800 | word by word, bouncy | playful, coloured pills | 56–80 px |

Sizes are a feel; the minimums in `../numbers.md` win, and on a phone-first video captions are bigger.

## Typography

- **The subject comes first.** If the caption reads before the face, shrink it, dim it or move it.
- **One family, two weights at most:** hierarchy from weight (500 to 800) and size, not from more fonts.
- **Tracking tightens as size grows:** −0.015 to −0.035em at display sizes, +0.005 to +0.015em at small sizes.
- **Body captions** have a cap height of about 3.5–5% of the frame's height (40–55 px at 1080 high landscape; 65–95 px
  in a 1920-high vertical frame); punchlines at 7–9% are hook size, not body size.
- **Emphasis by weight, colour or size (1.3–1.6×), never italic:** in motion, italics read as tilted rather than
  stressed. Italic only for quoted writing, a foreign word, or thought against speech.
- **One saturated accent** plus white, bone or charcoal; the accent can be sampled from the footage.
- **Emphasis escalates inside a phrase:** about 70% plain, 20% a slight lift (colour or weight, not both), 8% full
  emphasis, 2% the climax. Emphasise everything and nothing stands out; but a story with no emphasis at all is flat.
- **Contrast without a box:** first a blend that picks up the scene (`screen` on dark backgrounds, under about 60 of
  255 in brightness; `overlay` on mid tones; neither on bright ones, over about 180, where text needs to be opaque);
  then a thin dark stroke and a soft shadow; then a narrow soft scrim behind the words; a hard white pill last.
  Measure the brightness behind the captions in sampled frames.
- **Size type to its column:** a wider column takes larger type, or it looks underweight in all that space; a plane
  turned more than about 8° loses width, so go about 10% larger.

## Motion

Animate transforms and opacity only: animating `letter-spacing`, `filter: blur` or `font-weight` reflows the line and
makes captions jump. Fade the words, not the group and its words together (two fades multiply and pop). Exit with
the entrance reversed at about 60% of its length, in the gap between phrases, never mid-speech.

| Tone | Stagger between words | Hold after | Entrance |
|---|---|---|---|
| Documentary | 150 ms | 600 ms | mostly appear instantly, some fade and rise |
| Conversational | 80 ms | 400 ms | fade and rise (`y` 8 px to 0, 0.45 s, `power2.out`) |
| Energetic | 50 ms | 300 ms | a pop (from 0.85 scale) |
| Poetic | 250 ms | 1.2 s | a slow etch (opacity, a touch of soft focus clearing) |
| Broadcast | none | standard subtitle timing | appear instantly |
| Investigative | 25 ms a character | 500 ms | type-on |
| Keynote | the whole phrase at once | 600 ms | a wipe across (`clip-path`) |

- Stagger is the main expressive axis: 40 ms is urgent, 80 ms conversational, 150 ms deliberate, 250 ms or more
  ceremonial. Choose it from the content.
- Nothing faster than 100 ms in all; an entrance under 150 ms reads as frantic.
- Words appear on their spoken times by default; a whole phrase appears at once only for moments outside the flow
  of speech (a title, a chapter, a keynote wipe).
- **Karaoke:** the active word lights as it's said: a gentle shift to white and 3% scale for calm speech, the accent,
  a glow and up to 15% scale for high energy. Emphasis words break the pattern with a stronger move, and marker
  effects (a highlight sweep, a circle, a scribble: `../motion/techniques/text.md`, "Marker effects") can sit on
  them.
- **Change the rhythm about every 30 seconds:** a phrase from the other side, one word at double size, a beat with no
  caption, a colour change, so the eye keeps registering motion.
- **Over music,** a caption group can enter with a little more scale and glow when that stretch is louder, measured
  from the track beforehand (`../motion/techniques/effects.md`, "Motion from the music"): 3–6% at most.

---
Sources: written for Video Studio from HyperFrames' caption aesthetic principles, motion vocabulary and anti-patterns
in embedded-captions, and media-use's caption authoring and motion notes (v0.8.149, Apache-2.0, © HeyGen), changed:
rewritten, merged, and made defaults. See NOTICE.
