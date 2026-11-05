# Short motion graphics

Short pieces, often without narration, where the motion is the message: kinetic type, a logo sting, lower thirds,
a hero figure, a chart, a social post, a web page or an article highlighted, a map, data fused into a real object.
Often a few seconds long, and sometimes made to sit over other footage. The library's items cover many of these
(`../../library.md`); these notes are for building one.

## Kinetic type

The words are the hero. Split the copy into scenes by meaning and breath (about 3–7 words each), give each a role
(hook, build, punch, resolve), pick one or two words to emphasise per scene, and give each scene its feeling and
move. Take the brand's fonts and colours exactly. Techniques: `../../motion/techniques/text.md`.

## A logo sting

The brand's own logo file (`../../design/brand.md`, "Real assets"), 3–5 seconds, elegant pacing: a vector logo draws
on (`../../motion/techniques/effects.md`, "Lines drawing themselves"); a raster logo reveals with a mask or a scale
and a glow; a tagline and the address follow; then it holds. The brand's ident sound lands with it
(`../../audio/sfx.md`). Pattern: `../../motion/patterns/logo-lockup.md`.

## Lower thirds and overlays

A name and role bar, a callout or a follow card that sits over footage: a bar wipes in from one side (`scaleX` from
0 at its left edge) with the words rising behind it, holds, and slides out, inside the lower safe area. Made to go
over other footage, it renders with a transparent background (MOV or WebM: `../../cli.md`, "render").

## A hero figure

One number revealed: it counts up on the timeline (never a timer), with tabular figures and a decelerating ease over
about 1.2–1.6 s, then holds; a ring or bar fills in step; the label arrives after the number lands, so the value
comes before its meaning. Rules for figures: `../../design/data.md`; moves: `../../motion/techniques/data.md`.

## A chart

One chart, one message, for a short piece: bars growing from the baseline, a line drawing left to right, a ring
filling, a race reordering (its data staged over time). Axes hidden unless the scale is the point. Keep a chart type
the user asked for. A dashboard of three or four figures with one chart reveals its header, then the figures, then
the chart.

## A social post

A post card (the author, their picture, the text, the counts) the user supplies: the card arrives, its text types on
or reveals by line, the counts count up, a key word may be emphasised. The post's own words and the author's picture
come from the user; never a platform's logo or interface unless the user supplies and wants it.

## A web page

A real page (a capture or a screenshot the user provides) as the base, then a scroll, regions picked out (the rest
dimmed), a cursor that moves and clicks, a zoom to a part, pinned callouts. Highlights are animated on after the page
lands, never there from the start, and they sit on the real elements' measured positions. If the page can't be
captured, ask for a screenshot rather than inventing it.

## An article highlight

A real article's text the user supplies, set at a size that reads (not zoomed into), sliding up and settling; then
the key words are highlighted in place by a marker band growing behind them from the left. Grow the band through a
`background-size` variable on an inline span with `box-decoration-break: clone`, so it carries across line breaks.
Never pre-highlighted, and never zoomed so the context is lost. A wide version adds the outlet's name, the date and a
cut-out of the person in the story, all from the user.

## A map

- **Shapes:** regions drawn from map data as SVG, filling in turn, pins dropping with a pulse, routes drawing as arcs,
  a choropleth's colours revealing, the view zooming by animating the SVG's `viewBox`. Colour carries meaning (a data
  scale, regions told apart, one or two accents for the subject) and never decorates: no glows, light blobs or
  floating particles on a map.
- **Real imagery** (satellite or street maps) needs map tiles from an outside service: only when the user asks for it,
  under that service's terms, baked into a video at build so every render is the same, with its credit on screen.
- Labels sit clear of their shape and of each other, inside the safe area, readable for at least a third of a second.

## Data in a real object

A real picture's own geometry becomes the chart: a straw becomes a gauge, a glass of liquid a pie, a tall object a bar.
Read what the data is (over time, a quantity, a proportion, a place) and what the object's shape offers (a line, a
volume, a height, a container), place the graphics on the object's measured points
(`../../motion/techniques/cursor.md`, "Finding where to point in a screenshot"), take the palette from the picture,
and keep the object visible under the data.

---
Sources: written for Video Studio from HyperFrames' motion-graphics categories (v0.8.149, Apache-2.0, © HeyGen),
changed: rewritten, its search, download and registry steps left out, and every picture taken from the user. See
NOTICE.
