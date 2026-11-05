# The library

Ready-made items for Video Studio films: widgets, layouts, text effects, transitions, data, interface and forms,
dressed in the brand kit. Our own library comes first; HyperFrames' online registry is a second source, used with
care.

## Video Studio's library

- `node PLUGIN/scripts/studio.mjs library` lists every item by code (`W03`, `T01`, `X17`, …) with what it's for;
  `studio.mjs library <code>` gives one item's settings and the steps for using it.
- `studio.mjs library <code> --still <seconds> --brand <brand> --size <size> --set key=value … --out <file>.png`
  makes a still of it at the video's size, for the storyboard.
- The brand kit dresses every item (`brand.json` `style`, colours, fonts, the "Travel" ease): fix the kit rather than
  restyling an item by hand.
- How items are used in a video (placing, timing, combining, items over footage, full-frame items, transitions) is the
  production skill's "Library items"; the script and storyboard suggest items wherever one makes a beat clearer or
  richer.
- Items are Video Studio's own designs. The scene patterns (`motion/patterns/`) and techniques (`motion/techniques/`)
  are for building what no item covers.

## HyperFrames' registry

HyperFrames has an online catalogue of blocks (whole sub-compositions) and components (effect snippets). By default
Video Studio builds from its own library and guides; use the registry when the user asks for an item from it, or
when a beat needs something neither covers and the user agrees.

- **It's online, and newer than our pin.** `HF catalog` lists and searches it (`--query "<what it should do>"`, in
  English; `--type block` or `component`; `--json`), and `HF add <name>` downloads an item's files every time. The
  registry served is HyperFrames' current one, not one matched to 0.8.149, so an item can expect newer features:
  check it with `HF check` and a snapshot before relying on it.
- **Blocks** install to `compositions/<name>.html` and mount like any scene file: a host `<div>` with
  `data-composition-id` (matching the block's own id), `data-composition-src`, `data-start`, `data-duration` (at most
  the block's own), `data-track-index`, `data-width` and `data-height` (the block's size); position it with CSS.
  Customise its content, data and colours in place, in the brand's colours and fonts.
- **Components** install to `compositions/components/<name>.html`: read the comment at the top, then copy its HTML,
  CSS and script into the scene, and any timeline calls into its timeline. A component animating on CSS
  `@keyframes` isn't seek-safe: drive it from the timeline instead (`format.md`).
- **Nothing is reported back.** `HF feedback` sends a report to HeyGen: only if the user asks.
- An item's own look is a starting point: the brand kit and the design guides still apply, and the item is checked like
  anything built by hand.

---
Sources: written for Video Studio from HyperFrames' hyperframes-registry skill and its discovery, install and wiring
references, and motion-graphics' catalogue map (v0.8.149, Apache-2.0, © HeyGen), with Video Studio's library commands.
See NOTICE.
