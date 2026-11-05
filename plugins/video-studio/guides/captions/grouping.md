# Grouping and timing

Turning word times into caption groups: what goes together, when each group shows, and when it leaves.

## A group is a phrase

Each group is one phrase that enters, reveals and leaves: about one clause, or one breath. Start a new group at any
of:
1. a pause of half a second or more;
2. the end of a sentence;
3. a comma followed by a pause of a quarter of a second or more;
4. a reset word starting a clause ("but", "so", "and then");
5. six words or 2.5 seconds, whichever comes first (longer reads as subtitles, not typography).

- At least two words a group (one only for an interjection or the promoted line), at least half a second on screen;
  merge anything shorter into its neighbour.
- Never split an idiom or a name across groups ("at the end of the day", "more or less", a product's name).
- Group sizes vary naturally from two to five words; a fixed count fights the rhythm of speech.
- Energy sets the size: two or three words a group for fast, energetic speech; three to five for conversation; four
  to six for calm, measured speech.

## Keep it verbatim

Every word said stays, apart from the dropped kinds (`README.md`): structure words (articles, prepositions,
pronouns) are never cut. Caption what adds and cut only the noise: filler, false starts, a self-correction's first
attempt, an obvious echo of what's on screen ("as you can see here"). In dense conversation some glue ("you know",
"sort of") can go for readability. No "[laughs]" in styled captions; the `.srt` and `.vtt` files can keep sound
descriptions when accessibility needs them.

## Timing a group

- It appears just before its first word (about 0.08 s early) and stays about 0.6 s after its last, but leaves before
  the next group arrives (0.05 s earlier). The last group can run to the end.
- A group's window always contains all its words: if it starts after a word does, that word is late.
- Words appear on their own spoken times, within 80 ms of the transcript.
- Captions in the band show one group at a time: no two groups may share both the time and the place on screen.
  Groups that build up into a poem stack in separate places by design.
- Don't start at 0: the first caption appears 0.1–0.3 s in, and the last one leaves before the video ends.
- A deliberate pause of a second and a half or more is left empty rather than filled with a lingering caption.
- After its exit, a group is set hidden at its end time, so it can't linger when the film is scrubbed.

## Lines in the band

- Two lines at most, about 32–42 characters a line, broken at a phrase, never leaving one word alone on a line.
- Fit long lines with `window.__hyperframes.fitTextFontSize` (`../format.md`) rather than letting them run out.

---
Sources: written for Video Studio from HyperFrames' caption grouping, rail and composition notes in
embedded-captions, and media-use's caption authoring (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten and
merged. See NOTICE.
