# Mixing

Levels, room for the voice, effects, and checking the result. The targets are in `../numbers.md`, "Sound".

## Levels and headroom

- About −14 LUFS integrated, with the voiceover clearly on top. Effects sit about 2.5 dB under the music; a calm,
  informational film about 1 dB quieter still. A video about sound, or a brief that asks for more, can let them lead.
- **Level the stems before rendering.** When the encoded mix's true peak passes −1 dBTP, HyperFrames' render puts a
  true-peak limiter at −3 dBTP over the whole mix, which keeps its loudness but flattens its peaks (the effects' hits
  first); if that can't hold it, it turns the whole mix down and says by how much (`Audio lowered … dB`). So level
  the stems to sum to −14 LUFS at −1.8 dBTP or lower, and neither happens. A project pinned to a HyperFrames before
  0.8.228 is different: it has no limiter and turns the mix down well before −1 dBTP (on 0.8.149, a mix at −1.8 or
  even −3 dBTP came out 2–3 dB quieter), so level it to about −5 dBTP and check the render's loudness
  (`studio.mjs check --render`):

  ```bash
  node tools/score-kit/level.mjs --stem music=assets/audio/music_raw.wav:limit --stem sfx=assets/audio/sfx_raw.wav
  ```

  - It prints the sum's loudness and true peak and each stem's file (`--verbose`: each pass as well).
  - Mark the stem that carries the peaks with `:limit`, and add `:0.5` for a track whose `data-volume` is 0.5.
  - For dynamic music, or when peaks in different stems coincide, add `--premix assets/audio/mix.wav`: it limits the
    summed mix once and gives one music-and-effects track.
  - With a voiceover, include it as a stem at its real `data-volume`.
  - With a duck on the music, give the leveller its lane (`--lane music=tools/duck-lane.json`, the lane's JSON as in
    its `data-automation`), so the stems are summed as they'll be heard: without it the bed is measured at full
    level, the voice is limited to make room for it, and the render comes out quieter than the target.
- `HF normalize-audio` matches one clip's loudness to another's (`../cli.md`).
- **A mono source plays in both channels.** A voiceover or a phone's footage is often mono, and the render plays it
  in both channels at full level, which measures 3 dB louder than the mono file. `level.mjs` sums it that way; when
  levelling by hand, measure it as it will play (`-af "pan=stereo|c0=c0|c1=c0"`).
- **Measure the render,** since the levelling can't hear the ducking or the effects:
  `ffmpeg -i <render.mp4> -af loudnorm=print_format=json -f null -`. The AAC encode costs about 0.15 dB.

## The three attributes

Each stem is an `<audio>` element (`../format.md`, "Media"), and its mix is written on it as JSON, so the whole mix
lives in the HTML. Preview and render run the same graph, so what's heard while scrubbing is what's rendered.
Write the attributes double-quoted, with the JSON's quotes as `&quot;`.

| Attribute | Holds |
|---|---|
| `data-fx-chain` | the effects, in signal order: `{ "version": 1, "nodes": [{ "type": "highpass", "id": "n1", "label": "Remove Rumble", "params": { "frequency": 80 } }, …] }` |
| `data-automation` | envelopes: `{ "version": 1, "lanes": [{ "target": "volume", "points": [{ "t": 0, "v": 1 }, { "t": 2.5, "v": 0.4 }] }] }`; `target` is `volume` or `fx.<nodeId>.<param>` |
| `data-fx-carve` | the voiceover carve's settings (below) |

- Each node has a stable `id` (`n1`, `n2`, …) that lanes point at, and a `label` naming its job; `enabled: false`
  bypasses it. Never set `fromCarve` by hand: the carve replaces nodes marked with it.
- A lane's `t` is seconds from the start of **its clip**, not the video; `v` is in the parameter's unit (0–1 for
  volume, dB for gain, Hz for frequency). A lane holds its first value back to the clip's start and its last value
  to its end, so a bed that starts before the voice needs a full-level point at `t: 0`. At most 512 points a lane.
- Only parameters backed by a Web Audio parameter can move: `compressor`, `limiter`, `truepeak`, `gate` and
  `bitcrush` can't be automated at all; automate a `gain` stage in front of them instead. A lane pointing at a node
  that isn't there is silently dropped: read the ids back from the chain.
- Several tracks that want the same treatment (narration in several clips) share an `<hf-audio-group id="voiceover">`
  bus with one chain, one fader (`data-volume`) and one clock: give the clips `data-audio-group="voiceover"`. A bus's
  lanes run on the video's time, not a clip's.
- Effects with a tail (reverb, delay) make a track longer than its source; that's expected.
- Don't automate `volume` with a lane and a GSAP tween at once (lint warns: the lane wins).

## Room for the voice

Music under a voice makes the voice hard to follow. By default, every bed under a voice is ducked or carved before the
video is finished; skip it only when there's no voice for the music to sit under (a music video, a title card).

- **The duck, from the word times:** `node PLUGIN/scripts/studio.mjs words <video> --duck` writes it. The spoken words
  in the film's time become spans (bridging gaps under 0.6 s); the music goes down to about 25% of its level over the
  0.15 s before each span and back over 0.4 s after it, every time in the music clip's own seconds (the video's time
  minus its `data-start`), from full level at `t: 0` (or down from the start, under speech that starts the clip). It's
  written into the music's `data-automation` (its other lanes kept) and `tools/duck-lane.json`, for the leveller
  ("Levels and headroom" above). `--duck 0.35` ducks it less. Moving the voice with `studio.mjs move` writes it again.
- **The voiceover carve,** the better mix: it takes only the bands the voice needs (roughly 250 Hz to 2.5 kHz) and a
  level that follows the speech, so the music keeps its low end and its top. HyperFrames' app makes it, on the music
  track's effect rack (Voiceover carve, strength 0.8 by default), writing `data-fx-carve`, its chain and its lanes;
  `data-fx-carve` written by hand does nothing on its own. The carve always goes on the music, pointed at a group
  holding only voices (`"sources": ["voiceover"]`), never at the music itself or at effects.
- **Check it by ear:** the voice clear without the music sounding hollowed out, and the music coming back up between
  phrases. Music that sounds notched rather than quieter means the carve is too strong.
- Sounds whose `avoid_for` says "On top of speech" go in the pauses (`sfx.md`).

## Cleaning a voice

Work from the symptom, in order: subtract before you add (rumble and mud first); level after filtering; then the
relationships between tracks; then character, then the ceiling last.

| It sounds | Band | Node |
|---|---|---|
| Hum, rumble, handling | 20–80 Hz | `highpass` at 80 Hz |
| Boomy, too close to the mic | 80–250 Hz | `peaking` 200 Hz, −4 dB, q 1.4 ("Tame Boominess") |
| Muffled, behind cardboard | 250–600 Hz | `peaking` 250 Hz, −3 dB, q 1.2 ("Reduce Mud") |
| Boxy, a small room | about 400 Hz | `peaking` 400 Hz, −3 dB, q 1.4 ("Reduce Boxiness") |
| Words hard to make out | 2–5 kHz | `peaking` 3 kHz, +2.5 dB, q 1 ("Add Clarity"), or make room in the music |
| Harsh, tiring | 3–5 kHz | `peaking` 3.2 kHz, −3 dB, q 1.6 ("Soften Harshness") |
| Some words much louder | — | a `compressor` |
| Room tone between sentences | — | a `gate` (it closes pauses; it doesn't remove noise under speech) |
| Peaks spiking | — | a `limiter` last, or `truepeak` for a delivery ceiling, set 2 dB under the limit |
| Dry, recorded nowhere | — | a small `reverb`, wet lower than sounds right alone |

- Filters decide which frequencies a track may occupy, and come first; dynamics decide how its level behaves; tone
  colour (`saturate`) adds harmonics; time effects (`delay`, `reverb`, `chorus`) put it in a space, and go on what
  should sit behind something else.
- A recorded voiceover the user brings is kept as it came (`inputs/vo.wav` made from it with ffmpeg if it's in
  another format); cleaning it is a change the user agrees to.
- **Without being able to listen, diagnose by comparison inside the same file:** the clean original if there is one;
  otherwise the pauses, which show what was added (hum, hiss, room tone) but never prove a filter wasn't applied;
  otherwise the speech's own slope across a few bands (1, 3.2, 5 and 7 kHz). Never compare against a different voice
  or a published average. When nothing in the file settles it, say so and ask the user what they hear.

---
Sources: written for Video Studio from HyperFrames' hyperframes-audio skill and its attribute, effect, preset and
diagnosis references, and media-use's ducking code (v0.8.149, Apache-2.0, © HeyGen), merged with Video Studio's own
audio rules, changed: rewritten as notes; the carve and ducking described rather than run by their scripts. See NOTICE.
