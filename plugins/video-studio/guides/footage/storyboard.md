# A footage video's storyboard

How the storyboard shows a footage video (storyboard skill, "From footage").

A footage video's storyboard is made the same way, from the approved script's takes (its rows' `source`):

- **Frames are real stills** from the footage, at each frame's moment, filling the video's size:
  `node PLUGIN/scripts/tools/footage.mjs still <clip> <time in the clip> --size <W>x<H> --out videos/<project>/storyboard/v1/stills/<scene>-<n>.png`.
  In `frames.html`, each frame shows its still full-frame (an `<img>` filling the frame), with what goes over it on
  top: library items' stills, captions, punch-ins (scale the still), and the B-roll's own still where B-roll plays.
- **Each scene has a rough cut**, which the page's **Play the scene** button plays with its sound, so the user can
  judge the takes and the timing: the scene's ranges back to back, and any B-roll over the picture.
  `node PLUGIN/scripts/tools/footage.mjs clip <clip>@<in>-<out> [<clip>@<in>-<out> …] --size <W>x<H> --out videos/<project>/storyboard/v1/clips/<scene>.mp4`
  (`--over <clip>@<in>-<out>+<seconds into the cut>` for B-roll). It's small and light, and has no graphics: the
  frames show those. Watch a moment or two of each yourself (a still from it with `footage.mjs still`), then set the
  scene's `"clip"` in `storyboard.json`.
- A scene's `start` and `end` are the cut's own timing: the total of its ranges, scene after scene.
- Feedback on a footage scene is often about the takes ("use the other take", "start a beat later", "cut the second
  sentence"): change its ranges, then cut its rough cut again. Re-cut only the scenes that changed.

---
Sources: Video Studio's own guidance.
