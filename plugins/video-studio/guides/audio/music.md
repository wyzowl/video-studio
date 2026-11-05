# Music

Where a video's music comes from, how it's fitted to the cut, and how to make a score. Music is proposed, never added
silently: informational films get a calm bed; showreels can carry a groove.

The bed is music: chords, a pulse, a melody. The sound effects come from SFX Kit (`sfx.md`), never from the score:
no whooshes, clicks, pops or impacts made in it. Where an effect lands on a beat the music also marks, keep the
music's accent soft so the kit's sound carries the moment.

## Where it comes from

By default, the user's own track (one they're licensed to use) or a score made with the score kit (below). A track
from a library or a service is used when the user asks for it and supplies it or its licence. Keep a copy in the
project (`assets/audio/`) so the film never changes.

## Fitting it to the cut

- **Start strong.** A track can match the mood and still open on a quiet build that drains a short film's first
  seconds: compare its opening with later sections and, when a later one starts stronger and cleanly, start there,
  with a short fade in and a longer fade out.
- **End with the film:** the music never stops before the picture or leaves silence at the end; recheck whenever the
  cut's length changes.
- **Edit on the music's structure:** cut or loop at bar lines and phrase ends, never mid-phrase, with short crossfades
  at the joins.
- **Measure it once,** then build to the measurements (`sync.md`): `HF beats --json` for the beat times and their
  strength (`../cli.md`), the loudness frame by frame for its energy
  (`../motion/techniques/effects.md`, "Motion from the music").
- Under a voice, it's ducked or carved (`mixing.md`, "Room for the voice").

## The score kit

1. Copy the kit into the project: `cp -r PLUGIN/scripts/score-kit videos/<project>/tools/score-kit`. The project
   imports its own copy, so later kit changes never alter a finished film.
2. Start `tools/score.mjs` from `tools/score-kit/score.template.mjs` and replace everything below the import.
3. Run `node tools/score.mjs` from the project root to get `assets/audio/*_raw.wav`, then level them (`mixing.md`).

The kit is plumbing only: voices, buses, filters, reverb, delay, limiter, WAV output and levelling. Every film designs
its own harmony, instruments, cue list and master chain.

**In a key that fits the effects.** SFX Kit's tuned sounds (its chimes, dings, notifications and stings, and a brand
ident made from one) are in C major pentatonic, and can't be retuned: their rate is fixed (a sound's record gives its
`tuning` and `adapt.rate`). Write a bed in C major or A minor so they sit in it; in another key they clash wherever
they play together. Write cues in the same beats as the picture: the score's
sections, hits and builds land where the scenes change and the big moments happen.

---
Sources: Video Studio's own music rules, moved here from the production skill, with HyperFrames' notes on fitting a
library track to a short launch film (product-launch-video, v0.8.149, Apache-2.0, © HeyGen). See NOTICE.
