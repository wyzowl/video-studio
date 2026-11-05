# Data

How figures and charts should look and what they must say. The moves that animate them are in
`../motion/techniques/data.md`; the scene shape built on them is `../motion/patterns/data-hero.md`.

## Truth first

Every figure, statistic, quote and claim comes from the script, the brief or the client's data, exactly as given:
never invented, rounded or improved. Each carries its source (and its date or sample when that matters to its
credibility), on screen or in the video's notes as the brief asks. A figure that's missing is asked for, or shown as a
clearly marked placeholder until it arrives.

## The headline says it

The words state the insight ("Orders doubled in a year"); the chart confirms it. A chart with no headline makes the
viewer do the analysis in the three seconds it's on screen.

## Choosing the shape

| The data | Shape |
|---|---|
| One number that matters | a hero figure: the number huge, its label small, nothing else |
| Three numbers of one thing | a row of three, the same treatment, landing together |
| Results, before and after | rows of results, or two figures side by side |
| Two things compared | two bars, or two figures facing each other |
| Progress towards a goal | a bar or ring filling towards the goal, with the goal marked |
| A change over time | a line drawing left to right, or bars growing from a baseline |
| Social proof (ratings, reviews, numbers of users) | a figure with its unit and source, stars filled to the rating |
| Lots of data as atmosphere | a field of figures in the ground, low in contrast, never to be read |

## Making it read

- **Extreme scale between figure and label:** the figure several times the label's size.
- **Labels on the data,** not in a legend; units beside the figure.
- **One semantic accent:** the accent marks the figure that matters (the current year, the client's result); the
  rest are muted.
- **Give a number weight.** A number alone floats: pair it with something that gives it presence (a filling bar, a
  shape at the value's size, a ring, a change of ground).
- **Keep one visual space for related figures** (Q1 to Q4; three measures of one product): only the value changes,
  so a change of look means a new subject.
- **Order of arrival:** bars from the baseline, lines from left to right, labels after the number has landed.
- **Serious figures don't bounce** (`../motion/techniques/data.md`).

## Defaults to avoid

Unless the brief asks: pie charts (hard to compare in a glance), charts with two axes, dashboards of six or more
panels (two or three related figures is plenty), gridlines, tick marks and legends, and the look of a charting
library's output. Build charts from SVG and HTML, drawn from the data, so they animate and stay sharp.

---
Sources: written for Video Studio from HyperFrames' data-in-motion notes in hyperframes-creative (v0.8.149,
Apache-2.0, © HeyGen), DiffusionStudio's text-to-lottie data notes (MIT, © Diffusion Studio Inc.) and Video Studio's
production rules, changed: rewritten and merged; the web-pattern bans made defaults. See NOTICE.
