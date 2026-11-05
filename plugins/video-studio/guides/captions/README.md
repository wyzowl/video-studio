# Captions

Words that follow speech: burnt-in captions on a footage video, captions over a voiceover, the key words of a talk,
and the captions files delivered with a video. The footage itself is never graded or covered to make room: captions
are added on top, or behind the person with a cut-out (`placement.md`).

| When you're… | Read |
|---|---|
| Turning a transcript into caption groups, and timing them | `grouping.md` |
| Choosing how captions look and move for this content | `style.md` |
| Placing captions: the band, around a person, behind them | `placement.md` |

## What's delivered

- **Captions files** for any video with speech: `captions.mjs` makes `.srt` and `.vtt` from the verified word times
  (the production skill, "Deliverables"). Players show these; they don't need burning in.
- **Burnt-in captions** when the brief asks for them, or the video is for a feed that plays muted. The library's
  caption items come first (`studio.mjs library`: boxed, bold, karaoke, one word, speaker captions, keywords only,
  words behind a person); build a caption style only when none fits.
- **Key words** rather than full captions when a film's words on screen echo the voice (`../story/narration.md`,
  "Words on screen").

## Three kinds of word

Every spoken phrase is one of three:
- **Dropped:** "um", "uh", stutters, a sentence the speaker abandoned for another (only the final version is kept).
- **Captioned:** ordinary speech, verbatim, in the caption band. Most words. A punch word can be lifted inline (the
  accent colour, a little more weight, a gentle pop as it's spoken) and stays in the band.
- **Promoted:** the peak of a beat, set big, often behind the person so they pass in front of it. Rare and earned: at
  most one per beat or section, never two on screen together, at least a beat of air between them, and one biggest
  of all for the film.

Promoting every word is the classic mistake: most text stays in the band, and the promoted word is an event because
it's scarce.

## The transcript first

Captions are only as good as the words and times under them:
- Transcribe with HyperFrames' local transcriber and check it (`../cli.md`, "Sound and speech"); read it before
  building. Garbled words, music symbols or invented words over silence mean it failed: try the larger model once,
  then ask the user for the words (a script, or an `.srt`) rather than captioning words nobody said.
- Remove non-words (music symbols, empty entries) before building.
- Each caption's times come from its words: never pack two words into one timed entry, or the second fires with the
  first.
- A creative change of form ("15%" for "fifteen percent") is fine; changing what was said is not.

## Refuse, or split, when

- Several speakers or hard cuts in one clip: split it into its shots first.
- No speech, under 3 seconds, or the face never clearly visible.
- The source already has burnt-in captions or heavy text graphics: a second caption system competes with the first.
  Check a contact sheet at one frame a second, not three spot frames, since burnt-in text can appear mid-clip.

## Before showing it

Look at stills at each caption group and each promoted word:
- **Readable:** no light words washed out over a bright window or wall; no captions over the scene's own text; the
  caption band clear of the platform's buttons (`../numbers.md`, "Safe areas").
- **In order:** what's read top to bottom matches what's said; a promoted word never sits below words that come
  after it.
- **The face clear:** never fully covered for any third of a second, and the eyes never covered.
- **Designed, not defaulted:** the promoted word's frame would work as a still; the captions acknowledge this footage
  (colour taken from the scene, the person crossing the word, a shadow that falls the way the light does); quiet
  stretches without captions look composed, not like the design stopped.

---
Sources: written for Video Studio from HyperFrames' embedded-captions skill and its catalogue and references, and
media-use's caption authoring and transcript notes (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten for Video
Studio's library and tools; its named caption styles left out. See NOTICE.
