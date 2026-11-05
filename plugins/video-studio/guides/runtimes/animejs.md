# anime.js

For existing anime.js code, or its compact SVG helpers. GSAP stays the default for a film's sequencing. HyperFrames
seeks every instance pushed to `window.__hfAnime` with `seek(ms)` (the video's time × 1000); anything with `seek`,
`pause` and `play` works.

## Version 4

These notes are for anime.js 4 (4.5.0), which broke with version 3: there's no callable `anime()`, `easing` became
`ease`, and ease names lost their `ease` prefix (`"outExpo"`, not `"easeOutExpo"`). Code written from memory of v3
throws or animates nothing.

- Load the UMD build from the project (`assets/vendor/anime.umd.min.js`, from the package's `dist/bundles/`). The
  global `anime` is a namespace: `anime.animate(…)`, `anime.createTimeline(…)`, `anime.stagger(…)`,
  `anime.utils`, `anime.svg`.
- Create every animation at init, with `autoplay: false`, and push each one to `window.__hfAnime`. Version 4 has no
  automatic discovery: an instance you don't push is never seeked.

```js
const tl = anime.createTimeline({ autoplay: false, defaults: { ease: "outCubic" } });
tl.add(".title", { y: [40, 0], opacity: [0, 1], duration: 650 });
tl.add(".accent", { scaleX: [0, 1], duration: 450 }, 250); // targets first, then parameters, then the position
window.__hfAnime = window.__hfAnime || [];
window.__hfAnime.push(tl);
```

- Positions: a number (ms), a label, `"+=250"`, `"-=100"`, `"<"` (the previous one's end), `"<<"` (its start).
- `loop` counts repeats (`loop: 1` plays twice); keep it finite.
- Randomness from `anime.createSeededRandom(seed)`; `anime.utils.random`, `randomPick` and `shuffle` aren't seeded.
- Useful: `splitText`, `svg.createDrawable` (line drawing), `svg.morphTo`, `svg.createMotionPath`. `scrambleText`
  needs a seeded source of letters to repeat frame for frame.
- Not for renders: `autoplay: onScroll(…)`, `createDraggable`, pointer-driven `createAnimatable`, and the `waapi`
  module (it may not honour seeking): use the main `animate`.
- Never build animations in timers, promises or after an asset loads; HyperFrames looks once.

---
Sources: written for Video Studio from HyperFrames' anime.js adapter in hyperframes-animation (v0.8.149, Apache-2.0,
© HeyGen), changed: rewritten and trimmed. See NOTICE.
