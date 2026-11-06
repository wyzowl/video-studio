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

A score is written as settings, and the kit plays them with its own instruments, made in code:

1. Copy the kit into the project: `cp -r PLUGIN/scripts/score-kit videos/<project>/tools/score-kit`. The project
   plays its own copy, so later kit changes never alter a finished film.
2. Write `tools/score.json`, starting from `tools/score-kit/score.template.json`.
3. From the project root, `node tools/score-kit/play.mjs` writes `assets/audio/music_raw.wav` and prints one line:
   its length, the tempo's grid, the sections and notes, its peak, and anything worth a look (a chord outside the
   key). Then level it with the other stems (`mixing.md`).

```json
{
  "length": 44, "tempo": 96, "key": "C major", "downbeat": 0, "seed": 7,
  "chords": "C Am F G",
  "instruments": { "keys": { "sound": "soft-keys" }, "pad": { "sound": "felt-pad" }, "bass": { "sound": "round-bass" } },
  "sections": [
    { "at": 0, "name": "the line-up", "feel": "sparse" },
    { "at": 4.3, "name": "the answer", "feel": "open" },
    { "at": 6.91, "name": "how it works", "feel": "steady" },
    { "at": 31.31, "name": "the saving", "feel": "lift" },
    { "at": 38.05, "name": "the ask", "feel": "resolve", "chords": "C" }
  ],
  "hits": [{ "at": 38.05, "play": "roll" }],
  "mix": { "reverb": 2.0, "echo": 0.25, "delay": "3/16", "fadeOut": 1.8 }
}
```

- **The grid:** `tempo`, `meter` (4 beats a bar) and `downbeat`, the first bar's time; bar n starts n bars after it.
  Write the sections and hits at the picture's times; the grid is the score's own, so it's the one to cut to (`sync.md`).
- **chords:** a bar each, repeating from the downbeat: `"C Am F G"`; `"F:2"` lasts two bars and `"G/B"` puts B in
  the bass (m, 7, maj7, m7, sus2, sus4, add9, dim, aug, 6, m6 and 9). A section's own `chords` replace them for that
  section, from its start: a cadence into the ask, a resolve on the home chord.
- **instruments:** the kit's sounds, by name: `soft-keys`, `pluck`, `e-piano`, `marimba` and `bell`; `felt-pad` and
  `strings`; `round-bass` and `synth-bass`; `kick`, `clap`, `hat` and `shaker` for a pulse. Each plays its role's
  part unless given another (`part`): keys `arp` (or `offbeats`, `stabs`, `downbeats`); pads `chords`; a bass by the
  feel (or `root-fifth`, `whole`, `bounce`, `held`, `roots`); a bell its `tune` (`"C5 . E5 G5 E5 . D5 ."`: a step
  each, eighths unless `steps` says, `.` a rest, `-` held on, again every `every` bars); the beat its own pattern.
  `gain` (dB), `pan`, `octave`, `reverb` and `echo` (its sends) set each one.
- **sections:** where the music changes, at the picture's beats, each with a feel: `still`, `sparse`, `calm`, `open`,
  `steady`, `bright`, `light`, `lift`, `big`, `resolve` or `out`. A feel says which instruments play, how busy the
  keys are, and how loud and bright it is. `play` changes one instrument there: `false` rests it, `true` brings it
  in, a part's name changes its part, or `{ "part", "level", "rate", "octave" }`.
- **hits:** the moments the music marks itself: a `roll` (a rolled chord), a `stab`, a `pickup` into a downbeat, or a
  `stop` (a beat's rest before it); `on` names the instrument, `chord` and `octave` change it. Where an effect
  lands on the same moment, keep it soft or leave it out (above).
- **mix:** `reverb` and `echo` (their return levels), `delay` (the echo's time, a fraction of a bar such as `"3/16"`,
  or seconds), `feedback`, `highpass` (Hz), `fadeIn` and `fadeOut` (seconds), and `level` (dB).
- **A sound the kit can't make:** write it as an instrument in `tools/score.mjs`, from
  `tools/score-kit/score.template.mjs`, which plays the same settings with it (`node tools/score.mjs`); the settings
  name it as they name the kit's. Its engine (`engine.mjs`: voices, buses, filters, reverb, delay, limiter, WAV) is
  there to build it with.

**In a key that fits the effects.** SFX Kit's tuned sounds (its chimes, dings, notifications and stings, and a brand
ident made from one) are in C major pentatonic, and can't be retuned: their rate is fixed (a sound's record gives its
`tuning` and `adapt.rate`). Write a bed in C major or A minor so they sit in it; in another key they clash wherever
they play together. Write cues in the same beats as the picture: the score's
sections, hits and builds land where the scenes change and the big moments happen.

---
Sources: Video Studio's own music rules, moved here from the production skill, with HyperFrames' notes on fitting a
library track to a short launch film (product-launch-video, v0.8.149, Apache-2.0, © HeyGen). See NOTICE.
