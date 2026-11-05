# Pattern: device showcase

A device or a floating window is held as the hero while its screens move through a real flow, presented by a camera
anywhere from still to one continuous push. 5–11 s; each screen about 1–1.5 s.

**Beats**
1. *The surface arrives* (slides in, tilts in, or dissolves from a title card) and settles, a shape or glow
   resolving behind it.
2. *It's used on its own face:* a tap or a scroll advances the screen (old content pushed out, new pulled up), and a
   line of words beside it changes with it.
3. *More screens,* two to four, each a clean swap or scroll; hold on the last.

**Shapes**
- **Still tour:** no camera move; a tap compresses a button, the view changes, the side headline swaps.
- **Window, push and scroll:** push in on one region, then pull back to the whole window as its content scrolls.
- **Page and spotlight:** a page as a tilted card that coasts in, rolls to the section being shown, and one element
  lifts off it under a spotlight while the rest dims.
- **A flow, start to finish:** sign-in, the action, the confirmation, with no cursor; a slight push only on the
  commit.
- **Carousel:** one surface cycling through skins or screens to show breadth.

**Keep:** real screens; a scrolled surface clipped by its frame, with the moving layer marked
`data-layout-allow-overflow`; the device never tilted so far its screen can't be read.

**Techniques:** page scrolls, device frames, spotlights (`../techniques/layout.md`, `../techniques/camera.md`).

---
Sources: rewritten for Video Studio from HyperFrames' device-surface-showcase blueprint (v0.8.149, Apache-2.0,
© HeyGen). See NOTICE.
