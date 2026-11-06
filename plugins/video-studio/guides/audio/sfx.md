# Sound effects (SFX Kit)

The studio's sound effects come from SFX Kit, which setup downloads to `~/.wyzowl-video-studio/sfx-kit/<version>/`
(its `GUIDE.md` and `catalogue.md` are there too). If it isn't on this Mac yet, it's downloading in the background:
`node PLUGIN/scripts/studio.mjs install all --wait` waits for it, or fetches it if nothing is under way.

## How sound is used

1. **SFX Kit first.** Every effect comes from the kit by default. When no sound fits as it is, adapt one: its rate
   (within `adapt.rate`), a trim, a sibling (another intensity, length or variant), or two kit sounds layered. When
   nothing in the kit can do the job, make one with the score kit, save it as `assets/audio/sfx/made/<name>.wav`, and
   give its cue `made_for` (what was needed): the build logs it, so the kit can grow. A sound the user supplies is used
   when they ask for it in place of one.
2. **The project decides how much sound.** There's no fixed limit: how many sounds, and how close together, comes from
   the brief (the video's type, its tone, what the user asks for). When the brief doesn't say, a calm explainer sounds
   its key moments, an app demo each interaction, a music-led promo its beats, and a video about sound as much as it
   needs.
3. **Made with the video.** Sound effects are added when the video is built, not in the storyboard: there's nothing on
   screen to sync to yet, so storyboards and their rough cuts go without them. The user first hears them in the video
   and asks for changes there.
4. **Every sound has a reason.** Each marks something the viewer should notice. Sounds that overlap are chosen to work
   together, not blur. The same sound on every cut is a repeat like any other (`../motion/variety.md`).
5. **The voice stays clear.** Under a voiceover each sound comes down by its `under_voiceover_db` (the build does it
   from the word times). Sounds whose `avoid_for` starts "On top of speech" (bass hits, stings, rings) go in the
   pauses, unless the brief wants otherwise.
6. **Levels.** The kit's sounds are matched, so they move together: the effects sit about 2.5 dB under the music (the
   cue list's `gain_db`), set by ear for each video. Single sounds change only for a deliberate accent.
7. **Placed by the data.** Every sound is placed by its sync point and fitted with its `span_seconds` and
   `fits_seconds`, never by eye: the build works out each start from the moment it meets.
8. **In tune.** Tuned sounds (`tuning` in a sound's record: C major pentatonic) can't be retuned, so the bed is
   written to fit them (`music.md`, "The score kit").
9. **Consistent, with variety.** The same action gets the same sound through a video, and a brand's logo gets its
   brand kit's ident (`brand.json` `ident`). Quick repeats get small variations (a sibling, a rate change of a few
   per cent) so they don't sound mechanical.
10. **Kept with the video.** The build copies every kit sound a video uses, with its record, into `assets/audio/sfx/`,
   and builds from those copies, so a finished film never changes when the kit does.

## Building the effects track

1. Find the sounds: `node PLUGIN/scripts/tools/sfx.mjs find <words> [--seconds <the moment's length>]`, or read the
   kit's `catalogue.md`. `sfx.mjs show <id>` gives one sound's full record.
2. Write the cue list, `assets/audio/sfx-cues.json` (below).
3. From the video's folder, `node PLUGIN/scripts/tools/sfx.mjs build` writes `assets/audio/sfx_raw.wav` and prints
   the track, its level, and its notes and "Worth a look" (`--verbose` lists each sound's start and gain too). Change
   what needs changing.
4. Level it with the other stems (`mixing.md`): `--stem sfx=assets/audio/sfx_raw.wav:limit` when its transients carry
   the peaks. It plays as one `<audio>` element, like the music.

```json
{
  "length": 24.0,
  "voiceover": { "audio": "inputs/vo.wav", "words": "inputs/transcript_verified.json", "at": 0 },
  "music": "assets/audio/music.wav",
  "gain_db": -2.5,
  "cues": [
    { "at": 1.05, "sound": "whoosh-medium-soft", "note": "the phone slides in" },
    { "at": 9.0, "sound": "data-countup-long", "rate": 1.2, "cut_at": 10.7 },
    { "at": 3.2, "sound": "pop-small-in", "gain_db": -6, "note": "the second of a run" },
    { "at": 7.7, "file": "assets/audio/sfx/made/lock-open.wav", "sync_at": 0.04, "made_for": "a lock opening" }
  ]
}
```

- `at` is the moment the sound meets, in the video's seconds: the frame of a hit, an action's first frame, a move's
  fastest point, a build's arrival (the sound's `sync.meets`). The build starts it at `at` − `sync.at` (divided by its
  rate), and trims anything that would start before 0.
- Optional for each cue: `rate`, `trim_start` (seconds of the file), `cut_at` (the video's seconds, faded), `gain_db`
  (this sound only), `duck: false` (no drop under speech), `fade_in_ms` and `fade_out_ms`, and `for`: what it belongs
  to (a clip's id, a library item's code such as `W49`, or a scene such as `s07`), so `studio.mjs move` moves it with
  that (`../cli.md`). A scene that slides takes the cues inside it either way.
- `voiceover`: its audio sets the effects' level (the kit's levels suit a voiceover at about −16 LUFS integrated, so the
  build moves the effects with the real one), its word times say where speech is, and `at` is where it starts in the
  video. Without a voiceover, `music` sets the level.
- `gain_db` at the top is all the effects together: −2.5 by default when there's `music`, else 0.
- A made sound (or one the user supplied): `file`, its `sync_at`, and `under_voiceover_db` (−3 if not given).
  `made_for` logs it as a gap in the kit (`sfx.mjs gaps` lists them; Studio health shows them by SFX Kit).

---
Sources: Video Studio's own rules for SFX Kit, moved here from the production skill. See NOTICE.
