# Numbers

The numbers the standards use, explained. They live in one place, `rules.json` beside this page, which Video
Studio's checks read (`studio.mjs check`, `cli.md`), so the script, storyboard, build, checks and review measure the
same way; skills and guides point here rather than repeating them. Each is a default: a brief, a brand kit or the
user can set its own in the video's `docs/rules.json`, holding only the numbers that changed (the same keys as
`rules.json`), and the checks read it over these.

## Speech

- **Pace:** about 135 words a minute (2.25 a second), so 135 words is about 60 seconds; the script page counts with
  it. Calm reads run 120–130, brisk ones 150–160; past about 170 sounds rushed.
- **A beat:** one or two sentences, usually 2–8 seconds; a scene is usually 2–8 seconds too.
- **Key words:** a word that appears on screen as it's spoken arrives from 0.15 s before the word starts to 0.05 s
  after (about −4 to +1 frames at 30 fps).
- **Cuts:** at sentence or phrase gaps (silences of about 0.15 s or more), never inside a word.

## Reading

- **Reading time** of a line: 0.5 s to find it, plus 0.3 s a word.
- A line meant to be read holds at least its reading time plus 0.5 s, and never less than 1 s.
- Something to take in (a figure and its label, a widget, a quote, a list): at least 3 s, or twice its reading
  time if that's longer. A quick-fire run meant to be glanced at can go faster.
- Words that appear as they're spoken can follow the voice and clear at the end of the phrase.

## Words on screen

- **A headline:** 2–7 words.
- **All at once:** about 12 words at most on screen at one time (for a second or more), not counting captions, an
  interface shown as a picture, or texture.
- **A line** at headline size: up to about 35 characters at 16:9, 25 at 1:1 and 4:5, and 20 at 9:16.
- Captions have their own numbers: `captions/`.

## Type sizes

Every word that matters must read on the review's key sheet, at a phone's width (360 px). In the video's own pixels:

| Frame | Smallest text (a source, a label) | Body | Headlines |
|---|---|---|---|
| 16:9, 1920 × 1080 | 40 px | 48 px | 80 px and up |
| 1:1, 1080 × 1080, and 4:5, 1080 × 1350 | 32 px | 40 px | 72 px and up |
| 9:16, 1080 × 1920 | 36 px | 44 px | 80 px and up |

Other sizes scale the nearest row by width (4K doubles the 16:9 row). A chart's title is a sentence, so it's body
text, not a headline: the chart keeps its room. Text inside an interface or document shown whole is texture, not
reading: anything the viewer must read in it is enlarged or said again in type.

**Contrast:** 4.5:1 for body and smaller text, 3:1 for headline sizes, against what's actually behind the words
(footage and gradients included).

## Safe areas

Text and anything that must be seen stay inside these margins (fractions of the frame):

| Frame | Keep clear |
|---|---|
| 16:9 | 5% at every edge; with burnt-in captions, the bottom sixth too (180 px at 1080), content ending 20 px above it |
| 1:1 and 4:5 (feeds) | 6% at every edge; with burnt-in captions, the bottom sixth too |
| 9:16 (Stories, Reels, TikTok, Shorts) | the top 14%, the bottom 25%, the right 15% (the apps' buttons) and the left 6% |

HyperFrames' check can flag text in a kept band: `--caption-zone "x0=0;y0=.75;x1=1;y1=1;severity=error"` for the
bottom of a 9:16 frame (`cli.md`).

## Something new

- Something new on screen every 2–4 seconds: an element, a reveal, a move, a cut.
- Nothing sits unchanged for more than about 4 seconds while the voice talks; any one treatment goes stale after
  about 6.
- The slowest scene is about three times slower than the fastest.

## The hook and the end

- The first frame is already a composed frame, never black or empty.
- The hook's promise is clear within the first 3 seconds (within 1.5 s in a vertical feed).
- The ask at the end holds at least 2.5 seconds, with the brand; a short film's, a twentieth of its length (a
  second at least: 1.5 s in a 30 s film). Small print on the end card (a credit, a disclaimer) isn't the ask.

## Sound

- **The mix:** about −14 LUFS integrated (within 1 LU), the voiceover clearly on top; stems levelled to sum to −1.8
  dBTP or lower before rendering (`audio/mixing.md`), and the render's true peak −1 dBTP at most.
- **Music under a voice:** at least 10 dB under it while it speaks.
- **A voiceover** sits at about −16 LUFS integrated, the level SFX Kit's sounds are matched to.
- **Effects** about 2.5 dB under the music; a calm, informational film about 1 dB quieter still.
- **Endings:** every sound ends on its own tail or a fade. One still sounding (−35 dB or louder, held for 50 ms) that
  drops to silence (−60 dB) within a hundredth of a second has stopped dead; a click or a tick is over before that.
- **A stuck picture:** frames that don't change at all for 3 seconds, other than the film's last hold.

## The checks themselves

Video Studio's own pass samples the film every eighth of a second; a line counts once it's held half a second, and a
planned word lands within half a second of its time in the scene plan. HyperFrames' check samples at least once
every 4 seconds, as well as every storyboard frame and scene change. Words count as covering a face once they cover
5% of it.

---
Sources: Video Studio's own numbers, gathered from its skills and tools, with type sizes informed by HyperFrames'
video type scale in hyperframes-creative (v0.8.149, Apache-2.0, © HeyGen). See NOTICE.
