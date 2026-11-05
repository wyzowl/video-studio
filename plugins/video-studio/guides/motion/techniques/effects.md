# Techniques: effects

Light, focus, speed, interference, bursts, living icons, moving grounds and motion that follows the music.
`grep -n "^### " effects.md` lists them. An effect adds to a beat; it isn't a film's look. One to three effect
moments in a film is plenty, each on a moment that earns it.

Rules for every effect here:
- Worked out from the time alone (`../../format.md`): each value comes from `t` in `render(t)`, or from its own
  tween's value. Anything that looks random comes from a seeded hash of an index (and, for jitter, of a step of
  time), never `Math.random`, `Date.now` or the playing audio.
- Finite: a repeat is one tween whose cycles are counted up front. No `repeat: -1`, CSS `@keyframes` or
  `requestAnimationFrame`: they run on the wall clock and drift from the seek.
- Start and end clean: whatever an effect adds starts hidden and ends hidden or exactly at rest, and a final `set`
  puts it there rather than trusting a decay to land on zero.
- Filters cost their radius times the area they cover. Blur small or grouped layers, keep big surfaces modest, and
  mark a layer whose filter animates `will-change: filter`.

```js
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // 0–1, same n, same value
```

## Lines and icons

### Lines drawing themselves
Any stroked SVG shape (path, line, circle, rect, polyline): measure its length once it's in the page
(`getTotalLength()`; the SVG inline, not loaded as an image), set `stroke-dasharray` and `stroke-dashoffset` to that
length, then take the offset to 0.
- `fill: none` while it draws (a fill shows at once); to fill it, fade `fill-opacity` up after the stroke completes.
- Round caps and joins. `power2.out`, a hand lifting at the end, or `none` for a steady pen; pens don't bounce.
- 0.3–0.8 s a segment (over a second drags); each segment starts at 70–80% of the one before, so it reads as one
  movement; short segments get shorter times. A word beside it arrives after the last stroke, about 0.2 s later.
- A circle or rect starts at three o'clock: turn it −90° to start at twelve.
- If a complex path's measured length comes up short, use 5% more: too long only delays the start.
- A connecting line lands on real things at both ends and does a job (routes, underlines, points). A line decorating
  empty space is cut.

### Living icons
An icon is made of parts, and after its outline has drawn they can move: a clock's hands turn, scissor blades open
and close, a recording dot pulses with a ring a quarter cycle behind it, a dashed line flows.
- Turn or scale a part round a point with the SVG `transform` attribute (`rotate(deg cx cy)`;
  `translate(cx cy) scale(s) translate(-cx -cy)`), not CSS `transform-origin`: on a thin line or a small shape the CSS
  origin is measured from the shape's own box and the part swings off-centre.
- Each part runs on a linear value from the time, at its own speed or phase (parts in step look mechanical): a
  minute hand 0.5–2 turns, a second hand over three times faster.
- Ends that don't jump: a dash flow's total offset is a whole number of dash periods (dash plus gap); a hand whose
  last frame shows doesn't make whole turns (it would look as if it hadn't moved).
- Subtle: 2–4 pulses in a 3–5 s shot (five or more looks anxious); a dot's pulse 5–20% of its size, its ring's
  smaller.

## Light

### Glow behind a hero
A soft radial gradient on its own layer behind a card, logo or figure, growing from 0.8–1 scale as it fades up, so
that it peaks as the hero settles: one beat, the hero powering on, never glow then card.
- Peak opacity 0.15–0.3, 0.45 at the very most (a glow you notice is too strong); its colour a darker, more saturated
  version of the surface it backs (the same colour vanishes into it); extending well past the hero (an inset of −200
  to −450 px at 1080p, or it reads as a rim).
- No `box-shadow` glow on the hero as well: the two muddy each other.
- On a long hold it may breathe by a hair (±0.02–0.05 opacity, ±1–3% scale, one breath every 2.5–4 s, counted
  cycles starting from `sin(0)`, so it starts at rest). A short scene just blooms and holds.
- Several glows: divide the breathing by √N and give each its own period (2.6, 2.9, 3.3 s) so they never pulse
  together.

### A sweep of light
One soft band of light crossing a surface once (a card, a grid), clipped to it, starting and ending fully off it, at
a constant speed over 0.8–1.6 s, at 0.1–0.25 opacity; narrower and angled about 105° across a wordmark. Once: a
sweep that repeats reads as a loading shimmer. The metallic sheen across type is in `text.md`.

### A status that shimmers
A "Thinking…" line: a band a step lighter than the text's grey moves through the letters (`background-clip: text`,
the background about 300% wide), 1.2–1.8 s a pass, while the status shows: a whole number of passes worked out from
how long it shows, stopped dead the moment the answer arrives. It may repeat because the repetition means "still
working"; a shimmer that carries on into the answer is decoration.

### Neon switching on
A sign or word flickers on through a fixed list of instant opacity jumps (`steps(1)`) over about 0.35 s (on, off,
on, 30%, on, 50%, on), then the glow behind it fades up over 0.4 s.

## Focus

### Depth of field
The layers out of focus blur and dim while the one in focus stays sharp: the eye goes to the only crisp thing. Each
layer's blur is a CSS variable (`filter: blur(var(--dof))`, starting at `0px`) set from the time.
- 3–6 px of blur per step back; 16 px for a plane fully out of focus (8 soft, 24 heavy, no more on a big surface);
  dimmed to about 0.55 (0.4–0.7; under 0.35 reads as removed, not out of focus). 0.5–1.2 s, `power2.inOut`.
- The sharp layer is genuinely sharp (no blur at all) and sits above the blurred ones.
- **Rack focus:** the plane coming into focus is set blurred before the rack; both planes share one window and cross
  in the middle, and the outgoing plane ends at the blur the incoming one held.
- **With a push-in:** the blur runs on the camera move's window, so the world recedes as we move in. The camera moves
  the wrapper and the blur goes on the layers (`camera.md`).
- **A grid:** every card but the hero defocuses together (6–12 px).
- Bring everything back to sharp before the scene hands over; leaving mid-defocus looks like a fault.
- Lean on the dim and keep the blur modest; heavy type stays legible blurred. In a 3D world the blur goes on the
  cards or the stage, never on the `preserve-3d` world itself (`camera.md`, "3D flight").

### Coming into focus
An arrival without travel: the hero starts heavily blurred (about 36 px), a touch large (1.08) and dim (0.25) and
settles crisp in about 0.7 s (`power2.out`). Reversed (to 24 px and 0.25 in 0.25 s, `power2.in`) it defocuses away.
Calm and premium; good on footage and big type.

## Speed

### Motion blur
Every film renders with HyperFrames' shutter by default (`../../format.md`, "A project"): `data-motion-blur="on"` and
`data-motion-blur-events="on"` on the root. Whatever moves fast smears along its real path, turns and zooms included,
from several samples inside each frame (a 240° shutter, `data-motion-blur-shutter`); whatever moves slowly or holds
stays sharp. The events attribute lets it find movers drawn from a tween's `onUpdate`; what the clock's setter moves
it finds either way. Where a film has something the full method can't draw (a CSS 3D page turn with hidden
backfaces), HyperFrames uses a lighter filter instead, which softens turns and zooms rather than smearing them
(`check` notes it as `motion_blur_filter_fallback`).
- **Fast moves are still chosen:** a slam, a whip, a fast fly-in, a quick push of the camera, one to three in a film,
  and the rest at speeds that stay sharp. Words being read are still (`../../design/readability.md`): they smear on
  the way in and land sharp, held at least a second.
- **Kept sharp:** `data-motion-blur="off"` on a subtree that mustn't soften while it moves fast (a logo whose
  geometry is exact, an interface read as it scrolls). A brief or brand kit that wants crisp, graphic motion turns it
  off on the root.
- **The cost:** about one and a half times the render time with the full method, and little with the lighter filter.
  It's off in a stretch rendered with `--start` and `--end` and in HDR renders, so judge it on a whole draft;
  `render --page-motion-blur off` leaves it out for a quick look at timing (`../../cli.md`).

By hand, for a stylised smear or a film with the shutter off (give a move smeared by hand `data-motion-blur="off"`,
so it isn't smeared twice):
- **Directional blur:** an SVG `feGaussianBlur` along the move's axis only (`stdDeviation="X 0"` sideways, `"0 Y"`
  up or down, both only for a push in depth), with a filter region of `x="-50%" y="-50%" width="200%"
  height="200%"` so the smear isn't clipped. Its amount comes from the element's real speed each frame: the
  distance between its position at `t` and a frame earlier, about half that in pixels, capped at about 22 px (18–20
  on a full-frame wrapper, 24 for a brief whip). It peaks with the speed and is exactly 0 when the move stops, with
  no ease of its own to keep in step. For moves along a line; a smear on a scale or a turn looks wrong.
- **Echoes:** 2–4 copies behind the element at falling opacity (0.3–0.6 for the first, then a half, a third),
  offset back along the move by 12–40 px each and collapsing into it as it settles: a stylised speed trail with no
  filter cost (more than four strobe). On something riding a tracked path, the copies are silhouettes (its box, no
  text, `aria-hidden`) offset by a quarter and a half of that frame's movement, shown only above about 4 px a frame,
  their opacity growing with speed up to about 0.32.
- **A camera move:** the blur goes on the camera's wrapper (2D) or on the stage above the 3D world, never on each
  element: one smear for the frame. In a whip it rises over the ramp, holds through the burst and falls away over
  the tail; the next region's content changes during the burst (`camera.md`, "Whip").
- Heavy shapes on plain grounds show it; thin type and busy backgrounds swallow it. The scene clips
  (`overflow: hidden`), since the smear runs past the element's resting place.
- An element leaving mid-scene doesn't streak away; a scene's exit is its transition (`../transitions.md`).

## Interference

### Glitch
For a fraction of a second the element breaks, then snaps sharp and holds clean; the clean hold is the point.
- **Colour split:** a warm and a cool copy behind the readable original (the copies in the same grid cell, so their
  boxes match; `aria-hidden`; `mix-blend-mode: screen` at 0.5–0.9 on dark grounds, normal blending at 0.35–0.6 on
  light ones). Their offsets jump: time is cut into steps of 1/30–1/12 s (never shorter than a frame) and each
  step's offset is the hash of the step and the copy, times an amplitude falling from 1 to 0 over the glitch
  (`power3.in`): up to 4–14 px sideways at headline size, about a third of that vertically, about 1% of the width on
  a card or logo. At the end, set the copies to 0 and hidden.
- **Slices:** 4–10 copies, each clipped to a horizontal band (`clip-path: inset()`), starting 12–60 px out sideways
  (from the hash, never all equal) and stepping back into line (`steps(3–6)`, 0.2–0.4 s).
- **Stepped jolts:** a split that jumps wider on two or three hits through a shot (times in a fixed list), with
  scanlines flashing up on the first and fading.
- **Smear:** five copies arriving from far to one side, blurred, each 0.08 s behind the last (`expo.out`), settling
  a few pixels apart, under a noise overlay that flashes up and fades.
- 0.25–0.6 s as an entrance (with a horizontal stretch from 1.3–1.8 settling to 1 as the copies die); bursts of
  0.12–0.2 s with clean gaps of 0.2–0.4 s as emphasis. Over about a second it looks like a broken render; the
  original is legible again within two frames.
- A colour split is loud (consumer, tech, music); a restrained film uses one-colour slices, or nothing.

### Pixel dissolve
A grid of cells (about 24 × 14) over the hero switches off cell by cell in a seeded order over about 0.85 s, each an
instant `steps(1)` switch, uncovering what's beneath, which settles from 1.03 scale. Reversed, it builds a cover.
Dissolving real HTML pixel by pixel is shader work (`../../runtimes/canvas.md`).

## Bursts

### Particles
A one-off burst fired by a cause (a word settling, a click, a lockup completing), flying behind or around the
subject, never over it, and gone before the next beat. A particle system that stays is a background, not this.
- A fixed set made once at build: 10–18 for a pop, 24–40 for a dissolve, about 40 at most. Each particle's angle,
  speed (250–700 px/s), size, spin and colour (from the brand's three to five) come from the hash of its index.
- One linear value runs the flight, and each particle's place is a formula of the seconds since the burst, `s`:
  `x = vx × s`, `y = vy × s + ½ × g × s²`, turned by `spin × s`. Never added up frame by frame; an eased driver bends
  gravity, so the driver is linear.
- Hidden until the burst and hidden after: fade over the last 20–35% of the flight, or shrink them all to 0 in
  0.15–0.25 s.
- **Confetti:** an upward cone of 20–45°, gravity 900–1600 px/s², oblong chips of 5–14 px spinning 180–720° a
  second, 0.7–1.4 s, the arc peaking at 35–45% of the flight. A few dozen pixels of garnish, not a cannon.
- **Dots:** every direction, no gravity, round, 4–8 px, 0.4–0.7 s, from behind a landing word.
- **Outward ring:** each particle flies from the centre to its own point 500–950 px out (`expo.out`, 1.1–1.4 s),
  shrinking to nothing, as the hero punches in.
- **Dissolve:** particles start spread over a word's box, in its colour, drifting out as the word fades over the
  first 30%.
- **Two waves:** about 70% on the burst, the rest 0.12 s later and slower.

### Burst lines
About 20 short lines radiating from behind a hero as it punches in, each growing outward from 200–300 px from its
centre (radius and length varied by index) in 0.18 s (`power4.out`), a few hundredths of a second apart, fading
over the last 30% of its growth; all gone within a second. The drawn burst that stays beside a word is in `text.md`,
"Marker effects".

### Electric arc
Two or three jagged SVG paths drawn in 0.18 s each (`power4.out`, 0.05 s apart), flickering through a fixed list of
instant opacities, with a flash behind them; the label lands as they settle.

## Hits

### Impact punch
For a hit in the music: the hero fades up at 92% of its size while a glow ring expands behind it; on the hit it
punches to about 1.18 with its letters glowing (0.12 s, `power4.out`) and settles back over about 0.7 s on a spring
(`../../runtimes/gsap.md`; overshoot only if the film's personality allows); a full-frame flash peaks at 0.85 in
0.06 s and falls over 0.35 s; the ring carries on growing and fades to 0.4.

### Flash cut
A full-frame white flash on the hit, on in an instant and off two or three frames later, with a change made while
it's white: the next word, the accent's colour and length. The times are a fixed list and every state is set in
full, so any frame can be drawn on its own.

### Cuts on the beat
Full-frame panels, each its own colour pairing and word, built at the start and all hidden but the first; on each
beat the next shows and the last hides in the same instant. Re-colouring one layout on the beat is in `layout.md`.

## Holds

### Life on a held shot
A landed hero holds still by default (`../principles.md`). When a long hold on a product shot, an illustration or a
mark needs life, the subject's own motion comes first ("Living icons", above), then the faintest drift: scale ±0.008–0.015
and 2–3 px of rise, one cycle every 1.5–3 s (3–4 s on a long hold), on one linear phase starting at `sin(0)` so it
starts exactly at rest, added to the resting transform rather than replacing it. Over about 6 s, halve it and fade it
out over the last 20% so the shot is still when the transition starts. Several elements: divide by √N, and give each
its own period, so they never move in step. Never words or interface being read.

## Grounds

### A living field
A full-frame WebGL shader behind everything (curl noise through a palette of the brand's colours, converted to
linear light), with every visible value a uniform set by the timeline and the frame drawn again on each update, from
the timeline's position alone (`preserveDrawingBuffer: true`). An energy curve gives it a shape: settle in, breathe,
surge on the big moment, settle dark for the hold; a slight colour split at the edges that spikes with the surge, one
highlight sweep across it, a slow drift in colour temperature, a vignette closing in for the hold. Type sits above
it, never in it. The canvas contract: `../../runtimes/canvas.md`; generative grounds: `../../design/generative.md`.

### Effects on real HTML
Shatters, liquid surfaces, portals, noise dissolves, sheens, old monitors, frosted glass and row glitches take the
page itself as a texture: `../../runtimes/canvas.md`, "Shaders over the capture". Keep them to a film's hero beats.

## Motion from the music

Music can drive motion only through numbers measured from the file before the build, never from the playing audio.
- **Beats:** `HF beats --json` writes `beats/<audio>.json` with each beat's time and strength
  (`{ "beats": [{ "time": 0.52, "strength": 0.8 }, …] }`; `../../cli.md`). Land hits, cuts and slams on them.
- **Loudness, frame by frame:** measure it with ffmpeg at the film's frame rate (48 kHz divided by the fps: 1600
  samples a frame at 30 fps, 1920 at 25, 800 at 60):

  ```bash
  ffmpeg -i assets/audio/music.wav -af "aresample=48000,asetnsamples=n=1600:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=loudness.txt" -f null -
  ```

  That prints each frame's level in dB. For the bass alone put `lowpass=f=150,` before `aresample`; for the top,
  `highpass=f=4000,`. Turn the levels into 0–1 (`10 ** (dB / 20)`, divided by the loudest frame) and save the list in
  `assets/`, one value a frame.
- **Smooth the list when it's made, never while drawing:** a value that remembers the last frame is wrong when frames
  render out of order or in parallel. A short moving average, or a fast rise and slow fall, done once to the list.
- **Read it from the time:** `level[Math.min(level.length - 1, Math.floor(t * fps))]` in `render(t)`, or from a
  linear tween's own value in a scene file; interpolate between neighbouring frames for slow things.
- **What it moves:** the bass a swell (3–6% of scale on text or a logo; 10–30% on grounds and shapes), the top a
  glow's strength, overall loudness a ground's brightness, lift or colour. Subtle for a business film, big for a
  music video.
- **The subject, not the medium:** the music gives timing and strength; the look comes from what the film is about.
  By default no equaliser bars, spectrum displays, waveforms, note clip art, rainbow cycling or white strobes on the
  beat: they show the medium instead of the message.
- A text shadow on a parent with see-through children (the inactive words of a caption) paints a glowing box behind
  them all: scale the container and glow only the active word.

How a beat-led film is shaped (sections, drops, cutting on the bar) is in `../../story/types/music.md`; how sound and
picture meet, in `../../audio/sync.md`.

---
Sources: written for Video Studio from HyperFrames' effect rules in hyperframes-animation (glow, glitch, depth of
field, motion blur, particles, loops, icons, path drawing), the effect primitives of music-to-video, and the
audio-reactive notes in hyperframes-creative (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as notes, made
seek-safe, and the audio measured with ffmpeg instead of a script. See NOTICE.
