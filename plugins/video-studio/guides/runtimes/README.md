# Runtimes: what draws the motion

HyperFrames draws each frame by seeking every animation it knows about to that frame's time. Any library works if
its state can be set from a time and nothing else. GSAP is the default and the clock in every film; the others are
for what they do best.

| Runtime | Use it for | How HyperFrames drives it | Guide |
|---|---|---|---|
| GSAP | Everything by default: sequencing, text, layout moves, the one clock | Seeks the timeline registered on `window.__timelines` | `gsap.md` |
| Lottie / dotLottie | Vector motion as data: idents, icons, characters, After Effects work | Seeks players pushed to `window.__hfLottie` | `lottie.md` |
| three.js | 3D objects, product spins, camera flights, shader planes | Sends `hf-seek` with the time; you draw that frame | `three.md` |
| Canvas 2D, WebGL, p5.js | Generative drawing, particles, shaders over captured HTML | `hf-seek`, or a GSAP tween's value | `canvas.md` |
| WebGPU (TypeGPU or raw) | Heavy shaders and compute: glass, fluids, big particle fields | `hf-seek` with a `waitUntil` for GPU work | `webgpu.md` |
| anime.js 4 | Existing anime.js code, its SVG helpers | Seeks instances pushed to `window.__hfAnime` | `animejs.md` |
| Web Animations | Native keyframes made in script | Sets every animation's `currentTime` | `waapi.md` |
| CSS `@keyframes` | Simple loops on one element | Seeks each running CSS animation | `css.md` |

## The rules every runtime shares

- **State from time alone.** Draw the frame for `t` from `t`: no frame-to-frame accumulation, no clock deltas,
  no `requestAnimationFrame` or timers as the clock, no unseeded randomness. A simulation (particles, physics, a
  fluid) either has a closed form in `t`, or is run once at build with a seed and its states stored per frame.
- **Everything loaded before the first seek.** Models, textures, fonts and data come from the project's own files.
  Work HyperFrames can't see (building a big mesh, compiling shaders) registers a promise so the render waits:
  `window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady["globe"] = buildGlobe();` in the same script that starts the build, under a key of its own.
- **Libraries from the project.** Copy each library's file into `assets/vendor/` at a fixed version; a render
  never depends on the network.
- **Fixed pixels.** Canvases are sized to the frame (or the element) in pixels with a pixel ratio of 1, so the
  output never depends on the screen it was made on.
- **A length to render.** GSAP, finite CSS and Web Animations, and Lottie tell HyperFrames how long they run; three.js,
  canvas and WebGPU don't, so the root needs `data-duration` (lint: `root_composition_missing_duration_source`).

## The seek event

```html
<script>
  function drawAt(t) {
    /* draw the frame for t seconds, from t alone */
  }
  window.addEventListener("hf-seek", (e) => {
    drawAt(e.detail.time);
    // GPU work or an image decode: e.detail.waitUntil(promise), called before the listener returns
  });
  drawAt(0);
</script>
```

- In a one-clock film, the same `drawAt(t)` is simply called from `render(t)`.
- A drawing whose parameters come from GSAP (a shader's progress, a camera's angle) can instead read them from a
  tween on a plain object; draw in that tween's `onUpdate` from the object's values alone.
- Charts and maps from a drawing library: drive them from a tween's value, never their own transitions.

## Mixing runtimes

- One timeline drives each element's property: two runtimes animating the same property of the same element flip
  between renders.
- Text, captions and anything a viewer reads stay in HTML on top of a canvas, so HyperFrames' check can measure them
  and they take the brand's fonts.
- Check a mixed scene with snapshots at its key moments: some faults only show in the render, never in the preview.

---
Sources: written for Video Studio from HyperFrames' runtime adapters in hyperframes-animation (v0.8.149, Apache-2.0,
© HeyGen), changed: rewritten as one overview and trimmed. See NOTICE.
