# three.js

3D in a video: product spins, an object that explains an idea, a camera flying through a set, shaders on a plane.
HyperFrames doesn't own the scene: it sends the time (`hf-seek`, and `window.__hfThreeTime`), and the scene draws
that exact frame. The shared rules are in `README.md`.

## Setting it up

```html
<canvas id="three-layer" style="width:100%;height:100%;display:block"></canvas>
<script type="importmap">
  { "imports": { "three": "./assets/vendor/three/three.module.js",
                 "three/addons/": "./assets/vendor/three/addons/" } }
</script>
<script type="module">
  import * as THREE from "three";
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false); // the frame's size
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 100);
  // … build the scene
  function renderAt(t) {
    // set every object, light and the camera from t
    renderer.render(scene, camera);
  }
  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
</script>
```

- The root needs `data-duration`: three.js can't tell HyperFrames how long it runs.
- Copy three.js and the add-ons you use (loaders, post-processing) into `assets/vendor/three/` at one version, and map
  both entries to it; mixing versions breaks quietly.
- Models, textures and environment maps load from the project before the first seek. three.js's own loading
  manager is waited for; heavy work of your own registers on `window.__hf.buildReady` (`README.md`).
- Seek animation clips with `mixer.setTime(t)` (every mixer from the same `t`), never `mixer.update(delta)`.
- Post-processing that depends on earlier frames (motion blur that accumulates, temporal anti-aliasing) can't be
  seeked: rebuild it from `t`, or leave it out.

## Camera cuts inside one canvas

Name each cut once and use that constant everywhere: in the camera's choice of shot and in every object's visibility.
A second hand-typed time near the cut (`t > 22.9` against a cut at 23) shows the next shot's objects in the last
frames of the one before.

```js
const CUT_B = 23, CUT_C = 35;
const shotAt = (t) => (t < CUT_B ? shotA(t) : t < CUT_C ? shotB(t) : shotC(t));
function renderAt(t) {
  const s = shotAt(t);
  camera.position.copy(s.position);
  camera.lookAt(s.target);
  propsB.forEach((m) => (m.visible = t >= CUT_B && t < CUT_C));
  renderer.render(scene, camera);
}
```

Check each cut on its last frame and the first frame after it, not just somewhere inside each shot. The last frame
before a cut is `(Math.ceil(cut × fps) − 1) / fps`: at 30 fps, a cut at 23 s is checked with
`HF snapshot --at 22.9667,23 --no-end --describe false`.

## Light

- A standard material lit by one point or directional light, with nothing else, is black on its far side, and reads
  as a flat cut-out when the camera faces the light. Add a fill that stands in for bounce light (a hemisphere light in
  the colours around it, or an environment map).
- When the key light changes brightness over time, drive the fill from the same value at a fixed ratio, set by eye
  (the two lights' units differ).
- `snapshot --angle iso` and `keyframes --shot … --angle` show depth and camera paths from outside the shot.

## HTML as a texture

Any HTML (a product screen, a card, a whole scene) can be drawn onto a plane, a phone's screen, a cylinder or a
sphere through the canvas capture in `canvas.md`, then lit, bent or broken apart in three.js.

---
Sources: written for Video Studio from HyperFrames' three.js adapter in hyperframes-animation (v0.8.149, Apache-2.0,
© HeyGen), changed: rewritten for local files and trimmed. See NOTICE.
