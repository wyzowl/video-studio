# Music-led films

A film whose pacing comes from a music track: a kinetic promo, a lyric or word film, a montage of the user's pictures
or footage cut to the beat. There's no narration; the track drives the arc, and type alone makes a complete film.

## Read the music once

Measure the track before planning, and trust the measurements (`../../motion/techniques/effects.md`, "Motion from the
music"):
- `HF beats --json` gives each beat's time and strength (`../../cli.md`).
- The loudness, frame by frame, shows where the energy rises, drops and goes quiet.
- Listen for the sections: where the music changes state (a drop, a stop, a build, a quiet stretch).

Beat times are reliable only when the music is genuinely rhythmic. On calm, sparse music a beat tracker invents a
metronome the music doesn't have (often twice too fast): don't cut to it there; pace by phrases and energy instead.

## Lay out the scenes

1. **Cut the track into scenes at real changes:** a stop, a drop or surge, the start or end of a build, a long gap
   with no hits, a big jump in energy. Merge stretches that are one gesture. One to six scenes is typical; a short
   clip may be one. Scenes tile the track from 0 to its end with no gaps.
2. **Snap each boundary** to the nearest beat when the beat is reliable, and to a phrase or energy edge when it isn't.
   No boundary inside a build, and no fragment shorter than a bar.
3. **Give each scene its pacing:**
   - **On the beat:** genuinely rhythmic (builds, density, frequent steady hits): hard cuts and reveals may land on
     beats.
   - **With the phrase:** calm or sparse: no hard cuts to the grid; slow dissolves, long holds, paced by phrases.
4. **Tag each scene's mood** and write one plain line on how it feels ("hits speeding up into a held downbeat",
   "a calm held pad with one long gap"), drawn from what was measured.

The number of scenes follows the distinct treatments, not the number of beats: a fast track gets its density inside
scenes, not by multiplying them.

## Timing on music

- **Hard hits are instant.** Cuts, colour flips, swaps and freezes happen in one frame: easing a hit kills it.
- **Lead the beat.** A move that must land on a beat (a wipe covering the frame, a count locking, two things
  colliding) starts 40–190 ms early so it completes on it; something appearing because of the hit fires 0–45 ms
  after.
- **Eased entrances take 300–500 ms;** big builds 0.8–2 s, spanning a build or a silence.
- **Limits per bar:** one new accumulating element per hit (not a burst); a camera move at most once a phrase, never
  every beat; a dense flip or strobe run lasts two or three seconds at most.
- **Builds resolve on a downbeat or a stop,** never trailing off mid-bar.
- **Durations are for active motion:** a move doesn't stretch over a whole scene; add a hold, a ground or the next
  move, or split the scene at the next musical anchor.

## Combining moves

- One main system per moment; at most one texture move layered over one structural move.
- Structure on strong beats (cuts, the camera, a whole new look on a downbeat or section start); texture on weak and
  off beats (swaps, typed letters, colour accents).
- A build is a container: accumulate during it, then cut to a clean layout on the downbeat that ends it.
- A drop isn't a downbeat: a downbeat cuts within the same look; a drop changes the whole look (everything replaced,
  the frame cleared, many more or fewer elements).
- Let silence take density away: clear the busy layers and hold one readable mark.
- A moving ground is a layer, not a move: one at a time, under the foreground.

The moves themselves are in `../../motion/techniques/`: hits, glitches, bursts, flash cuts and cuts on the beat in
`../../motion/techniques/effects.md`, type in `../../motion/techniques/text.md`.

## The user's pictures and footage

- **Cut on the beat** (only in an on-the-beat scene): a new picture or clip on each strong beat, a hero shot on a key
  moment or downbeat, the outgoing one gone exactly at the next beat.
- **A slow push** (suits a with-the-phrase scene): one picture or clip held across the scene with a slow scale and
  drift, eased over its whole length, no cuts, dissolving at the edges.
- **Under type:** a clip dimmed 30–50% behind type that rides the same beats.
- Clips are muted: the track is the sound. A clip that needs its own sound (a line of dialogue) gets its own audio
  with the music ducked under it, only when the user asks (`../../audio/mixing.md`).
- With no picture that fits a moment, type carries it.

---
Sources: written for Video Studio from HyperFrames' music-to-video skill, its frame skeleton, montage notes and
motion-primitive catalogue (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten for Video Studio's tools (its beat
analyser left out), and its timing and combining rules kept as notes. See NOTICE.
