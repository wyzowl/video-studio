# CSS animations

`@keyframes` suit simple motion that belongs to one element: a loop with a known count, a shimmer, a mask moving,
a slow drift. (Not grain: noise that changes every frame multiplies the file size: `../design/colour.md`.) Scene choreography is clearer in GSAP. HyperFrames finds every element with an
`animation-name` and seeks its animation (or pauses it with a negative delay).

```css
.ring {
  animation: ring-pulse 1200ms cubic-bezier(0.2, 0, 0, 1) 3 both; /* finite count, fill both */
}
.dots span {
  animation: dot-pop 900ms ease-out both;
  animation-delay: calc(var(--i) * 120ms); /* stagger with a custom property */
}
```

- The element exists before HyperFrames starts, and carries `data-start`, so its animation's time matches its clip.
- A finite `animation-iteration-count` and `animation-fill-mode: both`. An `infinite` one has no end, so the root then
  needs `data-duration`.
- No hover, focus or scroll triggers, and no class changes after start-up unless a timeline makes them.
- Transitions (`transition: …`) aren't seekable: never for anything that renders.
- Animate transforms and opacity (`gsap.md`, "What to animate").

---
Sources: written for Video Studio from HyperFrames' CSS animation adapter in hyperframes-animation (v0.8.149,
Apache-2.0, © HeyGen), changed: rewritten and trimmed. See NOTICE.
