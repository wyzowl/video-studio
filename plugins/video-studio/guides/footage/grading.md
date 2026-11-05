# Grading footage

Correcting or treating footage and photographs with HyperFrames' local media treatment, a shader that runs in the
render: corrections, grades, finishes and effects, on the Mac, with nothing downloaded. A treatment is a change the
user asks for (or agrees to when it's suggested): footage isn't regraded by default.

## How it's applied

```bash
HF media-treatment --capabilities --json                      # the families: correction, grading, presets, finishing, effects…
HF media-treatment --capability <family-or-item> --json       # exact controls, ranges and examples
HF media-treatment --project . --file index.html --selector '#hero' --analyze --json         # measured evidence, no change
HF media-treatment --project . --file index.html --selector '#hero' --grading '<json>' --apply --json
HF media-treatment --project . --file index.html --selector '#hero' --clear
```

It writes `data-color-grading='{…}'` on the `<video>` or `<img>`: `adjust` holds tone and colour, `details` the
vignette and grain, `effects` blur, pixelation and the stylised effects. Use `--dry-run` when the selector might match
several elements. It works on whole media in standard dynamic range (Rec.709): it can't isolate a face or a region,
and HDR, HLG or camera log footage isn't put through it silently.

## Choosing

- **Correction first.** Too dark, flat, too warm, too many shadows: adjust exposure, contrast, highlights, shadows,
  temperature, tint. Don't add a look when a correction solves the complaint.
- **A person speaking:** start from the `skin-soft` preset at 0.6 intensity and tune within narrow ranges (exposure
  −0.06 to 0.14, highlights −0.18 to −0.04, shadows 0.04 to 0.18, temperature −0.05 to 0.1, vibrance 0 to 0.06); no
  grain or blur; a vignette of 0.05 at most, only if it helps. Reject anything that makes skin implausible, loses
  highlights or flattens darker skin. It's a global grade, not retouching.
- **A product:** a restrained correction (contrast up to 0.1, highlights slightly down, vibrance up to 0.06), checked
  against the untouched source; reject anything that shifts a known product colour, clips white packaging or makes
  labels harder to read. When the source is already right, leave the pixels alone and polish with framing and motion.
- **Screens and interfaces:** no grade. Global colour changes move brand colours, status colours, charts and small
  text together, making the demonstration less truthful; polish screen footage with crop, scale, pacing and cursor
  emphasis instead.
- **A named look the user asks for** (film, camcorder, tape, print, halftone, an old monitor, a dither, light leaks):
  choose from HyperFrames' presets and effects (`--capability`), apply it strongly enough to read unmistakably, and
  compare it with the original.
- **A treatment that changes over time** (a reveal, a defocus clearing): only the properties the treatment's
  `animation` contract lists, tweened on the timeline from a starting value set inline on the element.
- **Cost:** blur, bloom and painterly effects take several passes; more than two full-frame layers of them on screen
  at once needs a playback check.
- A `.cube` LUT only when the user supplies one (it stays in the project).

## Checking

Take one contact sheet before and one after at the same moments (`HF snapshot <project> --frames 3 --no-end
--describe false --output snapshots/treatment-before`), compare them, and keep the change only when it's clearly better.
Report what was changed and what was checked; a command succeeding isn't proof it looks right.

---
Sources: written for Video Studio from media-use's grading, media-treatment and treatment-recipe notes (v0.8.149,
Apache-2.0, © HeyGen), changed: rewritten for HyperFrames' local treatment command only; LUTs from the web and
overlay blocks from HyperFrames' registry left out. See NOTICE.
