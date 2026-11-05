# Canvas, WebGL and p5.js

Drawing a frame yourself: generative backgrounds, particles, data drawn by hand, shaders, and HTML treated as an
image that a shader can bend, light or break apart. The shared rules are in `README.md`: draw the frame for `t` from
`t` alone, and give the root a `data-duration`.

## A 2D canvas

- Size the canvas in pixels (`width="1920" height="1080"`) and stretch it with CSS; don't follow the screen's pixel
  ratio.
- Draw from `hf-seek` (or from `render(t)` in a one-clock film). Clear and redraw the whole frame each time.
- Anything random comes from a seeded generator made once (`mulberry32(seed)`), and anything that "accumulates"
  (trails, growth, a particle's path) is worked out from `t`: a particle's position is a function of its birth time,
  its seed and `t`, never of where it was last frame. A system that can't be written that way is simulated once at
  build, with its state stored for every frame.
- Text drawn into a canvas has no box HyperFrames can measure, and check only warns about sharp content at the
  frame's edge (`canvas_content_at_edge`). Words a viewer reads go in HTML above the canvas.

## p5.js

Use instance mode, so p5 doesn't run its own loop: create the sketch with `noLoop()` in `setup`, seed it once
(`p.randomSeed(seed); p.noiseSeed(seed)`), and call a draw function with `t` from the seek. p5's `frameCount`,
`millis()` and `deltaTime` are clocks: don't use them. Load p5 from `assets/vendor/`. Generative design itself is in
`../design/generative.md`.

## HTML drawn into a canvas

Chrome's HTML-in-canvas lets a canvas draw live HTML (`drawElementImage`), so any card, screen or scene can become a
texture for WebGL or three.js. HyperFrames' render turns the feature on by itself; a normal browser preview may not
have it, so always draw a fallback.

```html
<!-- the HTML to capture lives inside a layoutsubtree canvas, hidden -->
<canvas id="source" layoutsubtree width="1920" height="1080" style="position:absolute;inset:0;opacity:0">
  <div id="content" style="width:1920px;height:1080px"> … </div>
</canvas>
<!-- what the viewer sees -->
<canvas id="output" width="1920" height="1080" style="position:absolute;inset:0"></canvas>
<script>
  const probe = document.createElement("canvas");
  const supported = "layoutSubtree" in probe && (probe.setAttribute("layoutsubtree", ""),
    typeof probe.getContext("2d")?.drawElementImage === "function");
  const src = document.getElementById("source"), srcCtx = src.getContext("2d");
  function capture() {
    if (supported) srcCtx.drawElementImage(document.getElementById("content"), 0, 0, 1920, 1080);
    // else: draw a plain stand-in, so the preview isn't blank
  }
  // each frame: capture(), upload `src` as a texture, set the shader's values from t, draw
</script>
```

- Elements inside a `layoutsubtree` canvas keep `left` and `top` for motion: the canvas draws from their exact
  values, so they don't snap to whole pixels the way plain HTML does (`gsap.md`).
- In three.js, use the capture as a `CanvasTexture` and set `texture.needsUpdate = true` after each capture.
- Keep these for one to three hero moments in a film; the contrast with plain, flat beats is part of the effect.

## Shaders over the capture

The pattern is always the same: capture the HTML, upload it as a texture, run a fragment shader over a full-frame
quad, and drive the shader's values (its uniforms) from the timeline. Write the shader for the film; when a technique
comes from somewhere else, rewrite it rather than pasting code whose licence you don't know.

| Effect | What it does | How |
|---|---|---|
| Turn in 3D, with bloom | A screen floats and turns slowly, bright edges glowing | three.js plane with the capture as its texture, a bloom pass, the plane's rotation and the camera's distance from the timeline |
| Magnetic pull | The picture bends towards a moving point, colours splitting there | A warp that falls off with distance (`exp(-d² × k)`) plus a small red/blue offset at the warp |
| Shatter | The frame breaks into flying pieces | Triangles cut from the texture, each with a seeded direction, spin and delay; hold, then throw them with an ease-in |
| Liquid surface | The content ripples like water | A finely divided plane whose height comes from waves of position and `t` |
| Portal | The next scene opens through a ring | A growing circular mask with a lit rim over the incoming capture |
| Noise dissolve | The content breaks up into noise, edges lit | A per-pixel threshold against a progress value, a thin glow where it crosses |
| Iridescent sheen | A shifting rainbow film over the content | A hue that turns with position and `t`, mixed in at 15–25% |
| Old monitor | Scan lines, a slight curve, a vignette | Barrel distortion, a sine over the rows, a small colour offset |
| Frosted glass | The content softened behind glass | A blur that grows with a value, plus a fine noise (a downsampled copy gives a stronger blur cheaply) |
| Row glitch | Strips of the picture slip sideways | A per-row shift from a hash of the row, with a colour split |

Geometry beyond flat planes: a sphere for a globe, a cylinder for a carousel, a box for packaging, a phone or laptop
model's screen. Post-processing passes stack (bloom and grain, depth of field and vignette); each one drawn from `t`.

---
Sources: written for Video Studio from HyperFrames' html-in-canvas patterns in hyperframes-animation (v0.8.149,
Apache-2.0, © HeyGen), and the p5.js practice in Anthropic's algorithmic-art skill (Apache-2.0), changed: rewritten,
trimmed and made seek-safe. See NOTICE.
