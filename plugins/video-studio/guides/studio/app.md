# The HyperFrames app

Working alongside the user when they open a video in HyperFrames' own app. How the app treats a video's files is in
`../format.md`, "The HyperFrames app"; its commands are in `../cli.md`, "The project and the app".

The user can open any video in HyperFrames' own app (`HF preview`) to look at it and edit it on its timeline.
- **Their edits are kept.** Opening the app re-saves `index.html` (it adds `data-hf-id` attributes). Re-read the file
  before editing, run `HF catch-up` after they've edited, check `HF history`, and bracket each round of your edits with
  `HF history begin --who claude --label "…"` and `HF history end`, so the user's own edits are never overwritten.
  In build-script projects a rebuild overwrites app edits: carry them into `src/`.
- **Talk before changing.** A message that names a change gets the change. A note on the built film ("the intro
  feels jolty") gets its cause found, the measurable thing changed, and a line on what moved. A question that names no
  change gets an answer and no edit; "don't change anything" or "just thinking" gets no edit at all, with any fix
  offered in words; an idea with no concrete change gets two or three options, one recommended, before anything is
  touched.
- **A timeline that reads** is the build skill's (one kind of thing per track, one caption track).
- The app draws two safe boxes, action-safe (90% of the frame) and title-safe (80%); Video Studio's own margins are in
  `../numbers.md`, "Safe areas".

---
Sources: Video Studio's own guidance.
