# Building a footage video

How the build cuts a footage video (build skill, "A footage video"). How the cut is chosen is in `editing.md`.

Build the cut in HyperFrames' clip-and-track structure, so the user can open it in the HyperFrames app and adjust it
(`editing.md`):
- one `<video>` per kept range: `data-start` where it sits in the video, `data-media-start` its in point and
  `data-duration` its length, with `data-has-audio="true"` so its sound plays;
- B-roll as muted `<video>` clips on the track above;
- library items, captions and titles on the tracks above those;
- motion blur on the root, as in an animated film (`../format.md`, "A project"), so cards and titles that
  move fast smear.

Use the original files in `inputs/footage/`, not the previews.
- Cut in the pauses: a beat after the last word and before the next, never mid-word, and keep breaths natural.
  Hide a jump cut inside a take with a punch-in (scale the next range by about 1.1) or B-roll over it.
- Anything timed to the words (captions, items' cues) takes the scan's word times, moved to the cut: time in the
  video = the range's `data-start` + the word's time − the range's in point.
- Sound: the speech leads. Music sits under it and ducks while people speak (`../audio/mixing.md`);
  B-roll's own sound stays off unless it's the point.
- Check every join: transcribe the draft (`HF transcribe <draft> --engine parakeet`) and compare its words with the
  script's, so no word is clipped, doubled or missing; and look at the cuts with `HF snapshot --describe false`.

---
Sources: Video Studio's own guidance.
