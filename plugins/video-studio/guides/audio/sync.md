# The Sync standard

The review's **Sync** score is judged against this page: the picture moving with the voice and the music. The script
and storyboard time their beats to it, the build places everything by measured times, and the review scores it. The
times are in `../numbers.md`, "Speech".

## What good looks like

- **Key words land on the spoken word.** A word on screen arrives as it's said, or a hair before (`../numbers.md`,
  "Speech"), never noticeably after; a reveal that illustrates a phrase happens as the phrase is spoken.
- **Cuts at phrase gaps:** shots change at sentence or phrase boundaries, never mid-word.
- **On music, scene changes on bar lines,** hits on beats, builds resolving on a downbeat
  (`../story/types/music.md`).
- **With neither,** the pacing follows reading time: each line holds long enough to read, and the film's rhythm feels
  intended (`../numbers.md`, "Reading").
- **Sounds meet their moments:** each sound effect lands on the frame of its hit, the first frame of its action or the
  fastest point of its move (`sfx.md`).
- **Nothing drifts:** a sequence that starts in sync stays in sync to the end.

## How to get there

- **Script and storyboard:** scenes start and end at sentence or phrase gaps (using the verified word times), or on
  bar lines with music.
- **Build:** every timing comes from measured data: the verified transcript's word times (`../cli.md`, "Sound and
  speech"; footage cuts move each word to where it sits in the cut), `HF beats --json` for the music, the sound's sync
  point for effects. Never place by eye or by a guessed tempo.
- **Review:** watch the strips around key words and cuts with the sound on; listen for sounds a frame late.

## What lowers it

| What you see or hear | Usual cause | Fix |
|---|---|---|
| A word appears after it's said | a reveal timed to the scene, not the word | the word's own time from the transcript |
| A cut inside a word or a breath | scene boundaries from the script's estimate | the verified word times; cut in the gap |
| Cuts that ignore the music | the beat grid unused, or used on calm music where it's unreliable | bar lines for rhythmic music, phrases for calm music |
| A sound slightly late | placed by eye, or by its file start rather than its sync point | the cue's `at` on the moment it meets |
| Drifting out of sync | durations guessed, then the voice replaced | rebuild the timings from the final voiceover |

## How it's scored

| Score | Means |
|---|---|
| 9–10 | Every key word, cut and sound lands exactly; the film feels locked to its voice and music |
| 8 | In sync throughout; one moment a little loose |
| 6–7 | Mostly in sync, with noticeable late words, loose cuts or sounds off their moment |
| 4–5 | Words and picture often apart; cuts mid-phrase; music ignored |
| 1–3 | Out of sync |

Video Studio's checks, once built, will measure what can be measured (the words on screen against the spoken words,
sounds that stop dead, the voice against the music on the render); until then, and for the feel, the review judges
it from the strips and the render.

---
Sources: Video Studio's own standard, from its production timing rules. See NOTICE.
