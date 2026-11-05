# The Readability standard

The review's **Readability at phone size** score is judged against this page: whether every word reads at a
glance, on a phone, in the time it's on screen. The script and storyboard plan to it, the build sets type to it, and
the checks measure what can be measured. The sizes, times and word counts are in `../numbers.md`; choosing and
setting type is in `type.md`.

## What good looks like

- **It reads on a phone.** Every word that matters reads on the 360 px phone sheet, at the sizes in `../numbers.md`,
  "Type sizes", in every size the video is delivered at.
- **It reads in time.** Each line holds for its reading time, and something to take in (a figure, a widget, a
  quote) for longer (`../numbers.md`, "Reading"). A viewer watching once, without pausing, gets every word.
- **Few words, big.** A headline of a few words rather than a sentence, about a dozen words on screen at most, and
  the voice carrying the rest (`../numbers.md`, "Words on screen").
- **Strong contrast,** measured against what's really behind the words: footage, photographs, gradients and the
  frames of a move included. Words on a busy picture sit on a calm part of it, or on a scrim.
- **Still while it's read.** Words land and hold; nothing that must be read is moving fast, blurred, turned edge-on
  or half off the frame. Motion happens before and after reading.
- **Nothing in the way.** Words are clear of the platform's buttons and captions (`../numbers.md`, "Safe areas"), of
  a presenter's face, and of each other.
- **One thing to read at a time.** The order of reading is obvious; the voice and the words on screen agree, so the
  viewer never has to choose between reading and listening.

## How to get there

- **Script:** words on screen are few and short; long thoughts go in the voiceover. Check the bold words of each row
  against the word counts and their row's length.
- **Storyboard:** design the frames at the video's size, with the real words at their real sizes, and look at each at
  phone width before showing it. For 9:16, 4:5 and 1:1, check every frame at phone width.
- **Build:** type sizes come from the frame (`type.md`, "Size by role"), never below the minimums; layouts are built
  from variables (safe areas, a type scale), so another size is a layout change, not a rebuild. Interface text the
  viewer must read is enlarged, or zoomed into.
- **Review:** read every line on `phone.png` (the keys at 360 px) and time it against the strips.

## What lowers it

| What you see | Usual cause | Fix |
|---|---|---|
| Words too small on the phone sheet | web sizes; a 16:9 layout squeezed into 9:16 | the minimums in `../numbers.md`; a layout per size |
| Gone before it's read | holds timed to the motion, not the reading | reading time plus half a second; cut words, not time |
| A sentence on screen | the script's words copied onto the screen | a few key words on screen, the rest in the voice |
| Hard to pick out | low contrast; a busy picture behind; a thin face on a dark ground | stronger colour roles; a calm area or a scrim; a heavier weight |
| Read while it moves | the line keeps sliding or growing after it lands | land, then hold still (`../motion/principles.md`) |
| Covered | captions, buttons or a face over the words | the safe areas; move the words, never the person |
| Two things at once | a caption and a headline, or words that differ from the voice | one reading line at a time; on-screen words that match the spoken ones |

## How it's scored

| Score | Means |
|---|---|
| 9–10 | Every word reads at a glance on the phone sheet, in time, without effort; reading and listening never compete |
| 8 | One line is a touch small or quick, but still reads |
| 6–7 | Some words need a second look: small labels, a quick card, a weak contrast spot |
| 4–5 | Several lines don't read on a phone or vanish before they're read |
| 1–3 | Much of the text can't be read on a phone |

HyperFrames' check measures text that runs out of its box or the frame, covered text, and contrast on sampled
frames, and it can flag text in a kept band (`../cli.md`, "lint and check"). Its contrast counts anything from 24 px
as large text (3:1), so body text between 3:1 and 4.5:1 passes the check but not this standard: the review looks for
it. The review also judges what can't be measured: whether it reads in time, at a glance, on the phone sheet.

---
Sources: Video Studio's own standard, with HyperFrames' video type guardrails in hyperframes-creative (v0.8.149,
Apache-2.0, © HeyGen) rewritten in it. See NOTICE.
