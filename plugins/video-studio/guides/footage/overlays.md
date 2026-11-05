# Cards over footage

Designed graphics over a person speaking: titles, name bars, figures, quotes, side panels, picture in picture, timed
to what's being said. The footage plays in full and untouched underneath. The library's widgets and layouts come
first (`studio.mjs library`, the production skill's "Library items"); these notes are for shaping the whole run of
cards and for anything built by hand.

## How a card and the video share the frame

| Layout | The video | The card | For |
|---|---|---|---|
| **Over** | full frame | floats over it (a translucent panel, a lower third) | dramatic or cinematic moments; annotation |
| **Split** | half the frame (side by side; top and bottom in a vertical video) | the other half | the speaker and the data with equal weight |
| **Stacked** | the top half or so | below it | the speaker with a summary beneath |
| **Picture in picture** | a small rounded window in a corner | fills the frame | a content-heavy moment, the speaker secondary |
| **Full card** | hidden, or a corner window | the whole frame | a hero figure, a big line |

- The video sits in a wrapper (no `data-` attributes) that moves between layouts; move it with transforms and change
  its visible area with `clip-path`, so it never stutters, or cut between layouts on a beat. Every layout's numbers
  come from the frame's size, and a 4:5 frame takes the vertical layout scaled down by 0.7 in height.
- Cards sit on the side the speaker isn't facing, clear of the face (`../captions/placement.md`).
- The output's shape is independent of the source's: a horizontal source in a vertical frame suits stacked or over;
  a vertical source in a horizontal frame becomes a narrow window with the card beside it.

## How many cards

From the video's length and how much it says:

| Length | A card every |
|---|---|
| under a minute | 6–8 s |
| 1–3 minutes | 8–12 s |
| 3–10 minutes | 12–20 s |
| 10–30 minutes | 20–35 s |
| longer | 30–60 s |

Then faster (×0.7) when it's dense with figures, claims and lists, slower (×1.5) for one reflective story, and at
least five cards in all, so even a short video has rhythm. Cards come from what's said: all quotes, or all data, or a
mix; no fixed order of roles.

- A card held longer than about 15 seconds needs more inside it (a data block, points revealed one by one): a single
  static line goes stale after about 8.
- A long video's cards can live in a scene file per chapter, so no one timeline gets too dense.
- The end card is the brand's (logo, line, the ask) when the brief wants one.

## Sizing in a vertical frame

Phones are held close, and a vertical frame is narrow, so cards built at landscape sizes scale up by about 1.3
(headlines by up to 1.4, small labels by 1.2) and their side padding shrinks (24–36 px). A card that must work in both
shapes can size its type with a container query (`container-type: inline-size`, then
`font-size: clamp(64px, 8.5cqi, 132px)`). The minimums in `../numbers.md` still apply.

---
Sources: written for Video Studio from HyperFrames' talking-head-recut skill and its design index (v0.8.149,
Apache-2.0, © HeyGen), itself adapted from vtake-skills (MIT, © 2026 leeoxiang), changed: rewritten as notes; its
named styles and frames left out. See NOTICE.
