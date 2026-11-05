# Techniques: numbers and charts

Moves for figures: counting up, bars and fills, rings, ratings, reading a chart. How data should look and what it
must say is in `../../design/data.md`; real figures with their source only. `grep -n "^### " data.md` lists them.

Numbers are data: no overshoot or bounce on the figure itself (punctuation around it can spring). Tabular figures
(`font-variant-numeric: tabular-nums`) and a fixed-width box on anything that counts, or the digits jitter as their
count changes. A figure and its graphic land together: the same start, length and ease.

### Count up, growing
The value counts on a plain object and the text is written in `onUpdate` (`Math.round(v).toLocaleString()`; round,
so halfway into the last integer already shows it) while, on the same timing and ease, the figure scales from 40–60%
of its size up to full (its final font size is plain CSS; never animate `fontSize`). 1.2–2.5 s (under about 0.8 s it
flashes), `power3.out` by default (`power2.out` gentler, `expo.out` more dramatic). A suffix (`%`, `×`, `+`) arrives
after the count lands, with a little spring; the label arrives before the count peaks, and is big, part of the
headline, not a caption. Several figures counting together share one start, length and ease, so they land as a chord.

### Count, then punch
A count-up on `expo.out` that lands on the beat, then a quick scale punch (to about 1.12 in 0.1 s) settling back on a
soft spring, a glow peaking with it, and an underline drawing beneath (`scaleX` from 0). Lock the landing to a downbeat
or a hard stop, never trailing off mid-bar.

### Bars growing
Bars of authored heights grow from the baseline (`scaleY` 0 to 1 with `transform-origin: bottom`), 0.7 s,
`power3.out`, 0.06–0.1 s apart. 4–6 bars read as a trend; the last (the current figure) in the accent, the rest
muted. Never animate `height`.

### A progress bar or ring
- **Bar:** a fill that's the full width of its track (`width: 100%`: a zero-width fill stays invisible whatever its
  scale) scales on `x` from its left edge to the percentage, 0.8–1.2 s, `power2.out`.
- **Ring:** an SVG circle's stroke drawn to the percentage: measure its length (`getTotalLength()`), set the dash to
  it, and tween the dash offset from the length to `length × (1 − percentage)`; turn the circle −90° so it starts at
  twelve o'clock.

### A star rating
A row of gold stars over an identical grey row, revealed left to right to a fraction with a clip
(`clip-path: inset(0 X% 0 0)` with `X = 100 − rating ÷ maximum × 100`).

### Keep one layout for every figure
Pick one arrangement and keep it for a film's figures: one centred frame (the figure the hero, its graphic under or
round it; good for figures one after another), or the figure on the left and its graphic on the right (good for
figures shown together or needing different graphics).

### Reading a chart
A chart already on screen is interrogated by a read head: a vertical line, a marker riding the line and a tooltip
reading out `date: value`, all worked out from one value `p` going from 0 to 1 (1.5–3 s; `power1.inOut`; `none` for a
mechanical playhead; `power3.out` to slow onto a peak).
- The data is a fixed list at build, and the line's points come from it, so the chart and the readout can't
  disagree.
- The marker's height is interpolated between the two neighbouring points, so it never floats off the line.
- The tooltip's text changes only when the nearest point changes; its position moves every frame. Fixed width,
  tabular figures, flipped to the other side near the right edge.
- 10–40 points (the values flicker past; the first and last must be readable). Hold the final value at least 0.8 s,
  or hand over to a count-up.
- Draw the chart first (`effects.md`, "Lines drawing themselves", or growing bars), then scrub it; a second series
  can light up as the head crosses it.
- Size the SVG so its `viewBox` units are pixels, so one set of coordinates serves the SVG and the HTML tooltip.

---
Sources: written for Video Studio from HyperFrames' data rules in hyperframes-animation and the counting primitive of
music-to-video (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as notes and made seek-safe. See NOTICE.
