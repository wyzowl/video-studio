# Editing footage

Cutting real footage in HyperFrames' clip-and-track structure, so the user can open the cut in the HyperFrames app and
adjust it. The footage video's stages (scan, script, storyboard, build) are the production skill's; these are the
edits. Run `HF timeline` (`--json` for a list) to see a project's tracks and clips rather than reading the HTML.

## Clips

Every `<video>` and `<audio>` has a unique `id` (lint fails without one, and an `<audio>` with none is left out of the
mix). A video's own sound stays on it (`data-has-audio="true"`), so cutting the picture cuts its sound; a separate
`<audio>` is only for sound cut apart from its picture (a J or L cut, replacement sound) or other sound (music, a
voiceover).

| Edit | How |
|---|---|
| Keep a range | one `<video>` with `data-start` (where it sits in the video), `data-media-start` (its in point) and `data-duration` (its length) |
| Hard cut | the next range's `data-start` is the last one's start plus its duration, on the same track |
| Split, reorder, reuse | more clips from the same file with their own in points; order is set by `data-start`, not by the source's order; a reused range gets a new `id` |
| Hold a frame | an `<img>` of the frame (`ffmpeg -ss <t> -i in.mp4 -frames:v 1 hold.png`) with its own `data-duration` |
| Constant speed | `data-playback-rate` (0.1–10, sound pitch kept); the source used is the duration × the rate |
| Punch in, pan, crop | tween an inner wrapper, never the timed clip itself: `scale` for a punch-in (about 1.1 hides a jump cut), a slow `scale` and `xPercent` for a pan, `clip-path: inset()` for a crop |
| Crossfade | two clips on different tracks overlapping by the crossfade's length, their wrappers' opacities crossing, and opposite volume lanes on each clip (`../audio/mixing.md`) |
| J or L cut | every video in it `muted`, its sound as its own `<audio>` from the same file, started earlier (J) or ended later (L) than its picture, on the same source clock |
| Wipe, mask, split screen | `clip-path` on the incoming clip's wrapper while the two overlap |
| A sound on an event | an `<audio>` whose `data-start` is the event's time (in the video's time at the root; a scene file's own time inside one) |
| Swap a file | change `src`, reset `data-media-start` for the new file, and keep `data-duration` within what's left of it (`ffprobe`) |
| Move a group of clips | add one offset to every member's `data-start`, and give copies new ids |

- A clip's window is `[start, start + duration)`, and media in a scene file starts at the scene's time.
- Footage whose keyframes are far apart can freeze on seek: re-encode it with `-g <fps> -keyint_min <fps>`
  (`../format.md`). HEVC sources need no conversion: the render decodes them, and the app's preview makes its own
  copy.
- Added images and video fill the frame (`object-fit: contain` at the composition's size) unless placed otherwise; the
  root's `data-duration` covers every clip's end.

## Cutting speech

- **Cut in the pauses:** a beat after the last word and before the next, never mid-word; keep breaths natural.
- **Join softly:** a 30 ms fade on the sound at every join stops clicks; the picture can cut hard.
- **By the transcript:** the scan's word times say where each word starts and ends, so ranges are chosen from words
  (dropping "um"s, false starts and retakes) rather than by eye. Silences over about 0.8 s can usually be tightened.
- **Words move with the cut:** anything timed to a word (captions, items, sounds) takes the word's time moved to the
  cut: time in the video = the range's `data-start` + the word's time − the range's in point.
- **Check every join:** transcribe the draft (`HF transcribe <draft> --engine parakeet`) and compare its words with
  the script's, so no word is clipped, doubled or missing; look at the cuts with `HF snapshot --describe false`.
- One camera's clips of a moment, not cuts between several cameras of the same moment.

## Framing

- The footage sets the video's size; clips of another shape are cropped to fill it, never letterboxed. Reframing a
  horizontal shot for vertical is a crop (in the composition with `clip-path` and a scale, or with ffmpeg:
  `crop=ih*9/16:ih,scale=1080:1920`) centred on the speaker, following them if they move.
- A speaker framed in a vertical crop keeps their eyes about a third of the way down, with room above the head.

## Footage cut to music

On the beat: a new clip on each strong beat, a hero shot on a key moment; with the phrase: one clip held with a slow
push across the section. Clips are muted when the track is the sound (`../story/types/music.md`).

---
Sources: written for Video Studio from HyperFrames' creator editing recipes in hyperframes-core, media-use's media
operations and transcript-cut notes, and music-to-video's montage notes (v0.8.149, Apache-2.0, © HeyGen), merged with
Video Studio's footage rules, changed: rewritten as notes; the cutting tools left to Video Studio's footage.mjs. See
NOTICE.
