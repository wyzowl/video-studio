# Web Animations

Native browser keyframes made in script (`element.animate`), for light motion generated from data without GSAP.
HyperFrames finds every animation on the page (`document.getAnimations()`), sets its `currentTime` to the video's
time in milliseconds and pauses it.

```js
document.querySelectorAll(".token").forEach((el, i) => {
  const a = el.animate(
    [{ transform: "translateY(24px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    { duration: 620, delay: 2000 + i * 80, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both", iterations: 1 },
  );
  a.pause();
});
```

- Make every animation at init, finite (`duration`, `iterations`), with `fill: "both"` so a seeked state holds.
- The time is the page's, not the clip's: an animation for a clip at 2 s starts with `delay: 2000`.
- Nothing render-critical in `finished` promises or callbacks; no `requestAnimationFrame` or timers.
- HyperFrames works out the length from the animations' end times; an infinite one needs the root's `data-duration`.
- Animate transforms and opacity, not layout properties (`gsap.md`, "What to animate").

---
Sources: written for Video Studio from HyperFrames' Web Animations adapter in hyperframes-animation (v0.8.149,
Apache-2.0, © HeyGen), changed: rewritten and trimmed. See NOTICE.
