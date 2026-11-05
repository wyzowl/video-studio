# From Remotion

Porting an existing Remotion (React) video's source to HyperFrames, when the user asks for exactly that. A passing
mention of Remotion, code shared as reference, or "make something like my Remotion video" is a new Video Studio film,
not a port. The port goes one way only.

## First, check it can be ported

Read the source for patterns that break HyperFrames' seek-driven model. Any of these means a port would come out
silently wrong; say so and stop:
- `useState` or `useReducer` driving animation;
- `useEffect` or `useLayoutEffect` with dependencies (side effects);
- an async `calculateMetadata`;
- a React interface library (component kits rendering their own UI).

These port after dropping the construct, with a note: `@remotion/lambda` or `@remotion/cloudrun` (deployment, not
animation; Video Studio renders on the Mac), `delayRender`, `useCallback`, `useMemo`, custom hooks that only derive
from the frame (inline them). `staticFile` and `interpolateColors` port directly.

## The mapping

| Remotion | HyperFrames |
|---|---|
| `<Composition id durationInFrames fps width height>` | the root's `data-composition-id`, `data-duration` (frames ÷ fps), `data-fps`, `data-width`, `data-height` |
| `defaultProps` | a `data-*` attribute on the root per simple prop; arrays as repeated HTML with per-item attributes; or composition variables (`../format.md`, "Variables") |
| a sync `calculateMetadata` | worked out at port time, written as values |
| `<AbsoluteFill style>` | `<div style="position:absolute;inset:0;…">` |
| `<Sequence from durationInFrames>` | a scene file mounted at `from ÷ fps` for `duration ÷ fps` |
| `<Series>` | scene hosts with consecutive starts |
| `<Loop>` | a finite repeat worked out from the time available |
| `<Freeze>` | dropped |
| `useCurrentFrame()` | dropped: each value derived from the frame becomes a tween on a paused timeline, at `frame ÷ fps` |
| `interpolate(f, [a, b], [x, y])` | `fromTo(t, { p: x }, { p: y, duration: (b − a) ÷ fps, ease: "none" })` at `a ÷ fps`; several segments, several tweens |
| `Easing.out(Easing.cubic)` and the like | `power3.out` (quad 2, cubic 3, quart 4, quint 5); `Easing.bezier` as a `CustomEase`; `Easing.back(n)` as `back.out(n × 1.7)` |
| `spring({ damping: 12, stiffness: 100 })` | about `back.out(1.4)` over 0.7 s; damping 14, stiffness 90 about `back.out(1.2)`; `overshootClamping` `power3.out` over 0.6 s; or the closed-form spring in `../runtimes/gsap.md` |
| `<Audio src volume>` | `<audio id data-start data-duration data-volume src>`; a volume function becomes a volume lane (`../audio/mixing.md`) |
| `startFrom` / `endAt` | `data-media-start` and `data-duration` |
| `<Video>`, `<OffthreadVideo>` | `<video>` (`data-has-audio="true"` only when the file has sound: check with `ffprobe`) |
| `<Img>`, `staticFile("x.png")` | `<img src="assets/x.png">` (`../assets/x.png` inside a scene file), the file copied in |
| `<TransitionSeries>` | the scenes overlapping, with a cross-fade or a transition (`../motion/transitions.md`); durations in seconds |
| `@remotion/lottie` | lottie-web inside HyperFrames (`../runtimes/lottie.md`) |
| `loadFont` from Remotion's Google fonts | an `@font-face` to a file in `assets/fonts/` (`../format.md`, "Fonts") |

Frames become seconds once, at port time (`seconds = frame ÷ fps`). Remotion's `extrapolate: "extend"` doesn't exist
in GSAP: extend the range by hand. A pure custom transition (transform, filter or opacity worked out from progress)
ports as tweens; one that reads the frame inside it or has state doesn't.
- Nested sequences add their offsets: an inner `from={30}` inside an outer `from={60}` is one scene mounted at frame
  90.
- Load every font weight the CSS uses, and only those.
- An `<IFrame>` makes HyperFrames fall back to slower screenshot capture; rebuild its content as HTML where it can be.

## Checking the port

Render both at the same pixel format (PNG frames, BT.709 in Remotion's config) and compare them frame by frame (SSIM
with ffmpeg's `ssim` filter): about 0.95 for simple and multi-scene films, 0.9 for data-heavy ones. When a stretch
falls short, compare frames there to see what diverged. Write what didn't port exactly (a font substituted, a volume
ramp approximated) in `TRANSLATION_NOTES.md` beside the project.

---
Sources: written for Video Studio from HyperFrames' remotion-to-hyperframes skill and its references (v0.8.149,
Apache-2.0, © HeyGen), changed: trimmed to what HyperFrames 0.9.16 supports (its runtime interop isn't in this
version) and rewritten as notes. See NOTICE.
