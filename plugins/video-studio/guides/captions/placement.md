# Caption placement

Where captions sit: the caption band, the clean space around a person, and behind them. The margins are in
`../numbers.md`, "Safe areas".

## The band

- **Landscape:** centred, its baseline 80–120 px above the bottom, inside the safe area. **Vertical:** lower middle,
  600–700 px from the bottom, clear of the apps' buttons.
- In a full-width absolute container, centred by its text alignment (centring with `left: 50%` and a transform clips
  at the frame's edge). `overflow: visible`, so scaled words and glows aren't cut.
- About 4.5% of the frame's height (48 px at 1080), weight 500–600, white or near white, with a shadow or a soft scrim
  sized to the words, never a bar across the frame or a grade over the video.
- A fade up of 150–250 ms in and out; the energy belongs to promoted words.
- Letterboxed or pillarboxed source: the bars are caption space, and nothing crosses into them by accident.

The band can move with the shot: a close-up suits a side column or a band above the head; a wide shot the classic
lower third, offset away from the person.

## Around a person

Sample frames across the clip (20%, 50%, 80%, and each block of captions, since people move) and find the space that
is background throughout.
- **Which side:** never over logos or graphics already in the footage; then the side with more clean space; when
  they're close, the side the person is facing away from, keeping their looking room clear.
- **Hug the person:** captions sit in the clean strip beside the silhouette; text far from the body looks like it's
  floating.
- **Never cover the eyes** (keep 20 px clear around them), and never cover the face fully for a third of a second.
- **One home per sentence:** the words of one sentence stay in one place, not ping-ponging across the frame.
- **Props are invisible to the cut-out:** a microphone, a screen or a lamp inside a "clean" area isn't seen by the
  person's cut-out, and a large prop near them can leak into it. Look at a frame of each area you use.
- When the person fills more than about 70% of the frame, there's no clean space: captions go in a band above or
  below, or in front.

## Behind the person

The promoted word set behind the person, with their cut-out in front (`../footage/cutouts.md`), so they pass across
it:
- **Where:** a wide band crossing the head or upper body, centred on the person, so they cover about 30–55% of it.
  More than that and the word breaks; less and it's just floating behind.
- **Worth it only with room:** the clean area beside the person needs to be at least about 8% of the frame, 10% of its
  height and 18% of its width; otherwise the word goes in front.
- **Big enough to poke out both sides:** centred over the person only when they're near the centre (within 10% of
  the frame's width), there's 15% of clean width on each side, and the word is wider than the person by about 400 px
  (aim for 80% of the frame's width). Otherwise set it smaller in the bigger clean area, or make it an emphasised line
  in the band.
- **Brightness:** if the background where the word shows is bright (over about 175 of 255), light text washes out:
  lower the word onto the darker body, or use opaque text.
- **Order:** context words above the promoted word and after it below, so reading top to bottom matches speaking
  order; context in front, the promoted word behind.
- **Hand-over:** the band can clear or dim while a promoted word is on screen, if they'd collide.
- **Vertical frames:** the person usually fills the middle, so captions live in a band at the top (about 15–25% of
  the height), accepting a little hair over them, or in front.

## Sizing the promoted word

- Sized to the frame, not to the band: about 16–22% of the frame's height, at least 1.8 times the next-largest
  caption near it, or it's just another line.
- When one word of a phrase is the payoff, split it: the setup words small and soft on the line above, the payoff
  word huge below, stacked in the same place and leaving together.
- Readable first: shrink it to the largest size that fits the frame's width rather than letting letters run off; at
  most a few pixels of the first or last letter may crop. Raise its impact with weight, capitals and the person
  crossing it instead.
- When it should graze the head rather than hide behind the face, place its last line's bottom 30–80 px below the
  top of the hair, measured from the cut-out at that moment.
- Other captions keep their distance from the frame's edges (3–6% in), so they look placed rather than defaulted.

## Several on screen

Captions that build up (a poem, a list) or hand over:
- **One main place** for most captions, a second only for a deliberate change of rhythm.
- **Capacity:** a narrow column in a vertical frame holds about two at once; a landscape frame with the person to one
  side holds three or four; a full-width band one or two. When there are more, split into blocks at sentence breaks:
  each block's captions leave together, and the next block starts on a clear space.
- **How long they stay**, chosen per film: building until the climax and leaving together (a crescendo of a few
  lines); each fading a second or so after its words (separate punchy beats); handing over as the next arrives (dense
  speech); a rolling window of two or three (longer films).
- Stack captions from a fixed top with a gap, and check each one's height before it arrives; never centre a stack
  in a fixed-height box, which pushes captions off both edges when it overflows.

## On a surface

Words printed onto a wall behind the person (with perspective and a blend) work only when all of these hold: a flat,
plain surface larger than the words, turned 5–20° to the camera, mid-toned, with nothing printed on it, visible in
every sampled frame, and a camera that doesn't move. If any fails, use the clean space beside the person instead.

## Measuring

- A word's width is about its font size × its letters × 0.55 (0.50 for italic, 0.62 for bold capitals): use it to
  check a word fits its column, and fit real lines with `fitTextFontSize`.
- Check alignment against the widest line: right-aligned text starts at its right edge minus the widest line's
  width, centred text at the centre minus half of it.
- Each caption in a column is positioned absolutely, so hidden ones don't take up space.

---
Sources: written for Video Studio from HyperFrames' caption layout heuristics, scene types, rail, composition craft
and safe-zone measurements in embedded-captions, and media-use's caption positioning (v0.8.149, Apache-2.0, © HeyGen),
changed: rewritten and merged; its example films left out. See NOTICE.
