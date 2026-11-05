# WebGPU and TypeGPU

For effects that need the graphics chip's full power: glass and liquid surfaces, fluids, large particle fields,
compute passes. HyperFrames sends the time (`hf-seek`, and `window.__hfTypegpuTime`) and waits for the GPU work you
hand it. The shared rules are in `README.md`.

## The contract

- Start WebGPU asynchronously (`await navigator.gpu.requestAdapter()`), but build and register the GSAP timeline
  synchronously, before any `await`: HyperFrames reads it as soon as the page loads. Tweens that need the GPU can be
  added inside the async start-up.
- Check that WebGPU exists (`navigator.gpu`, an adapter) and draw a fallback when it doesn't.
- A composition that can't work without it carries `data-requires-webgpu` on its root, so a render on a machine
  without a GPU stops with a clear message instead of capturing a fallback screen.
- On each seek, draw that time and hand the GPU's work back before the listener returns:

```js
window.addEventListener("hf-seek", (e) => {
  render(e.detail.time);
  e.detail.waitUntil(device.queue.onSubmittedWorkDone());
});
```

- While paused, the preview may send the same time again to keep the picture showing: redraw exactly that time and
  never step a simulation forward.
- No `performance.now()` or a free-running loop; seeded randomness only.

## Patterns

- **A full-frame pass** needs no vertex buffer: one oversized triangle covers the screen.

```wgsl
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> Out {
  let p = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
  let u = array<vec2f, 3>(vec2f(0., 1.), vec2f(2., 1.), vec2f(0., -1.));
  return Out(vec4f(p[i], 0., 1.), u[i]);
}
```

Draw it with `pass.draw(3)`.
- **Rounded shapes** (a glass pill, a card) come from a signed distance function: negative inside, zero on the edge,
  positive outside, so the inside, the rim and the outside can each be shaded.

```wgsl
fn roundedBox(p: vec2f, half: vec2f, r: f32) -> f32 {
  let d = abs(p) - half + vec2f(r);
  return length(max(d, vec2f(0.))) + min(max(d.x, d.y), 0.) - r;
}
```

- **Frosted glass:** draw the source into a small texture (about a sixth of the size) and sample it, scaled back up,
  for the frosted inside; sample the full-size one for the sharp parts and any refraction. One pass of blur is too
  weak to read as frost.
- **Over or instead of the page:** `alphaMode: "opaque"` when the GPU canvas draws the whole frame,
  `"premultiplied"` when it's a transparent layer over HTML (particles over a video).
- **Footage as a texture:** copying a playing `<video>` into a texture can fail in a headless render. Extract the
  frames with ffmpeg and load them as images instead.

## Renders

- WebGPU on its own renders in HyperFrames' own Chrome. WebGPU together with HTML drawn into a canvas (liquid-glass
  effects over live HTML) needs a browser that supports both: point `PRODUCER_HEADLESS_SHELL_PATH` at one (such as
  a Chrome Canary) for the render and the preview.
- On a machine with no GPU, `PRODUCER_ALLOW_SOFTWARE_WEBGPU=true` renders it in software, several times slower.

---
Sources: written for Video Studio from HyperFrames' TypeGPU adapter in hyperframes-animation (v0.8.149, Apache-2.0,
© HeyGen), changed: rewritten and trimmed. See NOTICE.
