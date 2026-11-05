# Decks

When the user wants a presentation to click through rather than a video. Video Studio's deliverable is a video; a
HyperFrames slideshow is a different output, built when the user asks for one. A video made to play at an event or in a
presentation is an ordinary video (16:9, `../../design/layout.md`).

## What a slideshow is

A normal HyperFrames project (scenes, clips, paused timelines) plus one block that says which scenes are slides and
how they connect. HyperFrames turns its timeline into a deck you step through, with presenter mode and notes:
`HF present <project>` serves it and opens the presenter view (press P, or the Present button, for the audience
tab). It isn't rendered: `HF render` on a deck makes only its first slide. Stills of slides come from `HF snapshot`.

- Each slide is a scene with `data-composition-id`, `data-start`, `data-duration` and `data-label`.
- One `<script type="application/hyperframes-slideshow+json">` block near the top of the body lists the main line of
  slides (`slides`: each a `sceneId`, with optional `notes`, `fragments` and `hotspots`) and any side branches
  (`slideSequences`). It must be in the HTML as written, not created by a script.
- **Fragments** are times (on the whole timeline, inside the slide's range) where Next holds a reveal; a slide
  without them rests on a frame inside it. Navigation seeks, never plays, so each held state must be right at its
  time.
- **Hotspots** open a branch (a sequence of slides off the main line); Back returns to the slide that held it. Branch
  slides appear only in `slideSequences`.
- Notes are for the presenter only and can be edited in presenter view.
- `HF check` validates the block: every slide's scene exists, every hotspot's target exists, fragments fall inside
  their slides, and main-line slides don't overlap.

## Writing slides

- **The headline is a claim,** a complete sentence that stands without the picture: "Small teams spend a day a week
  on scheduling", not "Scheduling".
- **One idea and one picture a slide;** a second chart or cluster of points is a second slide.
- **Lead with the punchline,** on the slide and in the order of the deck.
- **Show the working** for any market size or big figure: build it from units up, never a bare total.
- **Big type:** headlines 72–96 px and body 48 px at 1920 × 1080, nothing the audience must read under 40 px.

## Converting a page into a deck

Keep the page's design, motion, interactions and media behaviour as faithfully as practical rather than simplifying
it. Movement the page made on scroll becomes camera travel between slides, not a page visibly scrolling. Pictures
with text in them (screenshots, posts, charts) keep their proportions and are never cropped. Media in it needs
HyperFrames' timing attributes like any other.

---
Sources: written for Video Studio from HyperFrames' slideshow skill and its standalone notes (v0.8.149, Apache-2.0,
© HeyGen), changed: rewritten as a short guide for when a user asks for a deck. See NOTICE.
