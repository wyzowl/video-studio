# Beats

What the storyboard decides for each beat, so the build has a shot to make rather than a slide to fill. The scene
patterns are in `../motion/patterns/`, the moves in `../motion/techniques/`, the transitions in
`../motion/transitions.md`.

## A beat is a moment, not a layout

Describe what the viewer experiences before what sits where. "Dark ground, the figure in white, the logo top left" is
a layout; "the figure slams in so hard the wave behind it ripples, then everything holds" is a moment. Write the
moment, then work out the pixels.

For each beat, decide:
- **Its job** in the story (traced to the message) and **the one thing** the viewer should understand after it.
- **The idea:** the picture's world and the metaphor that drives it, in two or three sentences.
- **The feeling:** a specific one (below), not "positive".
- **How it persuades or explains:** a named technique (below), not "show the benefit".
- **The moves:** a verb for every element: it slams, slides, draws, fills, types on, locks in, floats. If you can't
  name the verb, the element isn't designed yet. The verb comes from the idea, not from how energetic the beat is:
  something can drop in a calm film when the subject is letting go.
- **Depth:** what's behind, in the middle and in front (`../design/layout.md`, "Layers").
- **The sound:** what's heard at which moment, if anything (`../audio/sfx.md`).
- **How it hands on** to the next beat (`../motion/transitions.md`).

## Pace the shot to the words

A scene is a short sequence of moments timed to the voiceover, not a picture that appears and waits:
- At the start only what the voice is saying then is on screen; each further piece arrives as the voice names it,
  through the whole scene and especially its second half. The number of moments follows the line: a two-part line
  is two moments, a list of five is five or six.
- Once everything has landed, it holds still and reads. A deliberately held beat (before a turn, at a climax) is
  often right; the fault is never "too still" but everything on screen in the first quarter and then nothing.
- A scene without words paces its reveals to the music or the action instead.
- Write each moment with its time, what's on screen, what moves and where it sits:

```
0.0–1.2 s   the ground; the figure's ring and number seat in the centre, the ring sweeping as the number counts
1.2–3.4 s   as the voice names each month, a bar grows beside it; the total ticks up as it's said
3.4–5.0 s   the final figure lands in the centre, a glow behind it, and everything holds still
```

## Runs of beats

- **A consistent stage:** consecutive beats about the same thing share one composition (the same diagram growing,
  the same window filling in), so they read as one shot.
- **One kind of seam for a run:** pick one transition for a sequence (a push for ordered steps, a soft dissolve for
  layers of an idea) and repeat it.
- **A transformation stays in one scene:** when one thing becomes another (a node becomes a bar, a failing test turns
  green), keep the change inside one scene rather than splitting it over a cut.
- **Hand-overs match exactly:** when something carries across a cut, both sides agree on its position, size,
  opacity, direction and speed at the cut; check the frames either side.
- **Rhythm:** name the film's rhythm before building (fast, fast, held, fast, the big moment, hold) and place the
  held beats deliberately. The duration sets roughly how many beats fit; the brand and content decide whether they're
  quick or slow. A 15-second film that tries to hook, show three features and ask in 15 seconds is noise: hook, one
  strong feature, ask.

## Techniques to name

How a beat makes its point land:

| Family | Techniques |
|---|---|
| Make it concrete | analogy or metaphor; the abstract made into an object; a worked example with real numbers; anchoring on something familiar |
| Reveal in order | one layer at a time; simple case then the general one; signposting ("first… then… finally") |
| Contrast | before and after; what people believe and what's true; two options compared; the case where it breaks |
| Structure | three things; a numbered run; question then answer; the shape first, then filled in |
| Evidence | a figure; a source; the thing shown working; a chain of cause and effect |
| Land it | a callback to the opening; the idea in one line; a coined term; the specific case made a principle |
| Persuade | the pain made sharper; showing rather than telling; a feature turned into a benefit; who else trusts it; taking the risk away; the future pictured; value stacked up; urgency (only when real) |

## Feelings to aim for

A film moves the viewer through a curve: open a gap, turn, build, land.
- **Opening the gap:** curiosity, puzzlement, surprise, tension, recognition, frustration, overwhelm, scepticism.
- **The turn:** clarity, relief, anticipation, focus.
- **Building:** understanding, the "aha", confidence, control, ease, momentum, fascination, delight, trust.
- **Landing:** satisfaction, resolve, inspiration, motivation to act, "now I get it".

Pairs are often strongest: recognition and relief, surprise and recognition, curiosity and confidence.

---
Sources: written for Video Studio from HyperFrames' beat direction in hyperframes-creative and the story and visual
design notes of its explainer, launch and code-change skills (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten
for Video Studio's storyboard, merged, and trimmed. See NOTICE.
