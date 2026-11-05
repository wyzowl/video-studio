# From Figma

Bringing the user's Figma work into a video, when they ask for it. Figma is an outside service: it's used only on
the user's own account and with their OK. HyperFrames 0.9.16 has no Figma command, so designs come in as files the
user exports, or through a Figma connector the user connects themselves.

## Files

- **Logos and vectors** as SVG (they scale and can animate: `../motion/techniques/effects.md`, "Lines drawing
  themselves"); **raster art** as PNG at 2×; **an animation** as an MP4 export when it can't be rebuilt.
- Every file is copied into the project (`assets/`) and named for what it is: a render never calls Figma, and a video
  never keeps a Figma link.
- Brand colours and fonts from a Figma file go into the brand kit (brand-kit skill), not straight into one video.
- A token the user would have to paste is never asked for in the conversation: if a connector needs one, it's set in
  their own shell or the project's `.env`.

## Rebuilding a design

- A frame rebuilt as HTML keeps Figma's geometry exactly; compare a still of the rebuild with Figma's own export of the
  same frame. Text is where they drift: a text box shorter than its line height has been trimmed in Figma, and the
  HTML needs `text-box-trim` (or adjusted line height) to match.
- Colours from the brand's variables become the video's CSS variables, so a brand change carries through.

## A storyboard in Figma

A strip of scene frames is a set of **keyframes, not slides**: the same element in consecutive frames is one element
moving between states, so animate the element, never play the frames as stills.
1. Every frame-sized node in the section is a scene (named frames and loose full-frame pictures alike); their order
   is their x position.
2. Match elements across neighbouring frames, first by name, then by size and position; tween each matched element's
   position and size between its states, and cross-fade where its pixels change.
3. Stills only for frames that share nothing with their neighbours.
4. Text notes under the strip are motion intent for the scene above them, not words on screen: "burst" is a scale-in
   from about 1.5 with a fade; "slides" a slide from that edge; "morph" or "reveals" a cross-fade, or a rebuild if the
   motion is inside the scene; no note, a cross-fade and a slow drift.
5. When every frame is the same product screen in successive states, rebuild the interface as live HTML (what changes
   state) over exported pixels (what doesn't).

## Checking motion against a Figma export

When the user exports Figma's own animation, compare the motion rather than the pixels: for short windows through the
clip, the change from one frame to the next in the export against the same change in the render (a PSNR of those
differences; about 15 dB and up means the choreography matches, around 20 is faithful). Static differences (fonts,
edges) cancel out, so the score isolates timing and movement.

---
Sources: written for Video Studio from HyperFrames' figma skill and its motion check (v0.8.149, Apache-2.0, © HeyGen),
changed: trimmed to exports and a user's own connector, since HyperFrames 0.9.16 has no Figma command. See NOTICE.
