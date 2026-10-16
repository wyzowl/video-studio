# HyperFrames gotchas

Each of these cost a render round to find (HyperFrames 0.8.140–0.8.149). Recheck them after upgrading.

- **No partial renders.** Any edit means a full render. `--resume` (with `HF_SEGMENTED_CAPTURE=true`) only recovers a
  crashed render. Check changed sections first with `HF snapshot --at <times>` stills or `HF keyframes --from --to`
  strips.
- **Studio rewrites `index.html`** (it adds `data-hf-id` attributes). Re-read the file before editing, and bracket
  edits with `history begin` / `history end` (`--label` is required). In build-script projects, a rebuild overwrites
  Studio edits.
- **`check` flags deliberate layering** as covered text: full-frame transparent canvases, intended overlaps, words
  parked behind `overflow: hidden` masks. Mark it with `data-layout-allow-occlusion`, `data-layout-allow-overlap`,
  `data-layout-allow-overflow` (camera moves) or `data-layout-ignore` (3D surfaces), and set words hidden behind a mask
  to opacity 0.
- **Studio lists every `<img>` as a timeline track.** Use `background-image` divs for decorative images.
- **Studio treats an untimed wrapper around a `<video>` as a full-length clip** and forces it visible. Control its
  visibility with opacity in `render(t)`.
- **Inactive clips are hidden with `visibility: hidden`**, not `display: none`, so later scenes can be measured at init.
- **The animation-map audit only sees the clock tween** in a `render(t)` composition. Audit motion from review strips.
- **Lint's `gsap_callback_dom_measurement`** is a false positive when measuring only happens at init.
- **A plate pre-scaled for a later zoom** fills the frame whenever its clip is visible. Gate its opacity to the move.
- **Bare `npx <package>` resolves the newest release on every run**, not the project's pin. Use `npm run …` or
  `npx --yes hyperframes@<pin> …`.
- **`snapshot` sends frames to Gemini** when `GEMINI_API_KEY` is set. Keep it unset, or pass `--describe false`.
- **Some ffmpeg builds have no `drawtext`** (Homebrew's doesn't). Render text overlays for slates and comparisons with
  `node PLUGIN/scripts/tools/label_png.mjs`.
- **After the user edits in the HyperFrames desktop app,** run `HF catch-up` before the next change.
- **Whisper word times can drift by over a second.** Use Parakeet, then `vo-check.mjs`, then listen to the cue words.
- **Directional motion blur:** a horizontal `feGaussianBlur` (`stdDeviation="X 0"`) set from each frame's real speed,
  capped at about 22 px for translation only, keeps zooms crisp.
