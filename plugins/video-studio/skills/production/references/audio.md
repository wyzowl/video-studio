# Audio

## Targets

- About −14 LUFS integrated, with the voiceover clearly on top.
- Sound effects support, they don't lead: keep the effects bus about 2.5 dB under the music.
- Calm, informational films can sit about 1 dB quieter.

## Headroom (important)

The HyperFrames render scales the whole mix down when its summed peak passes about −1.5 dB (measured on v0.8.141). So
level the stems before rendering, so they sum to −14 LUFS at −1.8 dBTP or lower:

```bash
node tools/score-kit/level.mjs --stem music=assets/audio/music_raw.wav:limit --stem sfx=assets/audio/sfx_raw.wav
```

- Mark the stem that carries the peaks with `:limit`, and add `:0.5` for a track whose `data-volume` is 0.5.
- For dynamic music (generated or licensed), or when peaks in different stems coincide, add
  `--premix assets/audio/mix.wav`. That limits the summed mix once and gives one music-and-effects track.
- With a voiceover, include it as a stem at its real `data-volume`.

## On the composition

- Each stem is an `<audio>` element. `data-fx-carve` on the music, with the voiceover's audio group as its source,
  ducks the music under speech (`/hyperframes-audio`, voiceover carve).
- `data-fx-chain` holds gain, EQ and limiters, and `data-automation` draws volume envelopes.
- `level.mjs` doesn't simulate the carve, so always measure the rendered MP4:
  `ffmpeg -i <render.mp4> -af loudnorm=print_format=json -f null -`. The AAC encode costs about 0.15 dB.

## Synthesized scores (the score kit)

1. Copy the kit into the project: `cp -r PLUGIN/scripts/score-kit videos/<project>/tools/score-kit`. The project
   imports its own copy, so later kit changes never alter a finished film.
2. Start `tools/score.mjs` from `tools/score-kit/score.template.mjs` and replace everything below the import.
3. Run `node tools/score.mjs` from the project root to get `assets/audio/*_raw.wav`, then level them (above).

The kit is plumbing only: voices, buses, filters, reverb, delay, limiter, WAV output and levelling. Every film designs
its own harmony, instruments, cue list and master chain. Write cues in the same beats as the picture. Music is
proposed, never added silently. Informational films get a calm bed; showreels can carry a groove.
