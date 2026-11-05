# Cut-outs

A person lifted out of their footage, so words and graphics can pass behind them. Made on the Mac with HyperFrames'
`remove-background` (a person-segmentation model, downloaded once on first use).

## Making one

```bash
HF remove-background <clip>.mp4 -o <clip>_cutout.webm                                # the person, transparent around them
HF remove-background <clip>.mp4 -o <clip>_cutout.webm --background-output <clip>_plate.webm   # and the room, with a hole where they were
HF remove-background portrait.jpg -o cutout.png                                      # a still
```

- `.webm` (with transparency) plays in the composition; `.mov` (ProRes 4444) is for other editors; `.png` for a still.
- `--quality`: `balanced` (the default) for most uses; `best` for a final master, and whenever the cut-out sits over
  its own footage (the closest colour match); `fast` only while iterating.
- `--background-output` gives the room with a transparent hole, for content that sits between the room and the
  person. It isn't a clean plate of the room without them: that needs an inpainting tool, which this isn't.
- Cut each shot separately: the model treats everyone in frame as one shape, and a cut mid-clip breaks it.

## Words behind a person

Three layers: the footage (or the plate) at the back, the words over it, and the cut-out on top.
- **Wrap the cut-out's `<video>` in a plain `<div>`** and show or hide the wrapper: HyperFrames sets the opacity of any
  timed clip itself, so the video's own opacity can't be animated.
- **Start both videos at the same time** (`data-start` and `data-media-start` the same) so they decode in step; a
  cut-out that starts late lands a frame out.
- **Measure the head** before placing the word: `node PLUGIN/scripts/tools/head-top.mjs <clip>_cutout.webm --size
  <W>x<H>` gives `headTop`, so the word sits where the head covers at most half of it. Placement rules:
  `../captions/placement.md`, "Behind the person".
- A cut-out over a different take of the same person shows two people: don't.

## Where it goes wrong

- **Props:** the model takes the person and usually leaves out thin things beside them (a microphone arm), so words
  pass behind the person but in front of the microphone; a large object near them (a desk rig, a telescope) can leak
  into the cut-out; something held (a phone, a product) can drop in and out. Look at the cut-out at two or three
  moments before placing anything.
- **Movement:** fast handheld footage makes the cut-out's edges flicker; a fixed camera works best.
- **Light:** a bright background washes out light words behind the person (`../captions/placement.md`).
- **Bars and burnt-in graphics:** letterboxing, logos and old lower thirds in the source stay in it; keep words inside
  the real picture area and clear of them.
- **Frame rate:** render at the footage's own rate so the cut-out lines up with the picture frame for frame.

---
Sources: written for Video Studio from media-use's background-removal notes and embedded-captions' failure modes
(v0.8.149, Apache-2.0, © HeyGen), with Video Studio's head-top tool, changed: rewritten and merged. See NOTICE.
