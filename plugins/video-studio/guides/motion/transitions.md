# Transitions and cuts

How one scene hands over to the next, and how a scene cuts inside itself. A transition tells the viewer how two
scenes relate: a cross-fade says "this continues", a push says "next point", a hard cut says "wake up", a slow
dissolve says "drift with me". This is a catalogue: search it for what a seam needs (`grep -n "^## \|^| " …`), don't
read it whole. The library's own transitions come first (`../library.md`).

## Choosing

- **A few kinds per film, each with a reason.** One main transition carries most scene changes, with one or two
  accents for the moments that need more. Choose each seam for what it does: keep continuity, make a contrast, reset
  the rhythm or land a point. Never a different transition for every scene, and never one at random.
- **Not every cut needs a transition.** Related beats can simply cut; a punch-in or a cut on motion lives inside a
  scene. Worlds that change completely want a transition with a cause: something on screen that becomes the next
  scene (a button growing into it, an object carried across, a colour flooding from the hero).
- **Where in the film:** the opening gets the most distinctive one (it sets the language, 0.4–0.6 s); related points
  get the main one, kept quick (about 0.3 s); a new topic gets something different; the climax gets the boldest; the
  wind-down returns to gentle (0.5–0.7 s); the end is the slowest and simplest (a cross-fade or a dip, 0.6–1 s).

| Energy | Main | Accents | Length | Eases |
|---|---|---|---|---|
| Calm (wellness, brand stories, luxury) | blur cross-fade, focus pull | light leak, iris | 0.5–0.8 s | `sine.inOut`, `power1` |
| Medium (business, software, explainers) | push, staggered blocks, cut on the curve | squeeze, vertical push | 0.3–0.5 s | `power2`, `power3` |
| High (promos, sport, music, launches) | zoom through, overexposure | blocks, gravity drop, glitch | 0.15–0.3 s | `power4`, `expo` |

| Mood | Transitions |
|---|---|
| Warm, inviting | light leak, blur cross-fade, focus pull, film burn |
| Cool, clinical | squeeze, zoom out, blinds, shutter, grid dissolve |
| Editorial | push, vertical push, diagonal split, shutter |
| Technical | grid dissolve, staggered blocks, blinds, a colour split |
| Tense | glitch, a colour split, ripple, tape |
| Playful | elastic push, card flip, iris, growing circle, clock wipe |
| Dramatic | zoom through, zoom out, gravity drop, overexposure, dip to black |
| Premium | focus pull, blur cross-fade, dip to black |
| Retro | film burn, light leak, tape, clock wipe |

When nothing in the plan says otherwise: a blur cross-fade between calm scenes (its blur hides two different
backgrounds meeting), a zoom through into a high-energy one. A transition runs 2 seconds at the very most.

## Building the hand-over

- **Both scenes move at the same moment.** The outgoing scene is whole when the transition starts, and the
  transition is its exit: between scenes, nothing fades out first and then the next scene runs its entrance (that's
  a dip with a jump cut). Only the film's last scene animates its contents off.
- **The order:** place the incoming scene, move the outgoing one, swap at the hidden moment, move the incoming one in,
  clear any covering layer.
- **Scenes as files:** extend the outgoing scene's slot by the transition's length and start the incoming slot that
  much earlier, so they overlap; tween their host wrappers on the main timeline at the overlap's start. The wrapper
  holds the scene's last frame while it moves.
- **One clock:** scenes are layers on one stage; the transition is code in `render(t)` acting on the two layers, and
  each scene draws itself at its own local time.
- **Layer order:** a scene that leaves by falling, shrinking or splitting sits on top (`z-index`) while the incoming
  one waits behind; reset it after.
- **Hidden states are reversible:** hide the outgoing scene with a `tl.set` at the exact end, never in an
  `onComplete` (it doesn't undo when scrubbed back).
- **Covering layers** (blocks, blinds, flashes, leaks) are full-frame or bigger than the frame, so their edges never
  show.

## Cuts inside a scene

Every one of these follows one rule: cut at the fastest moment of a move, with the same direction and speed on both
sides. The eye rides the motion across the swap.

| Seam | How it works | Use for |
|---|---|---|
| Cut on action | Cut while the main element is still moving towards a place beyond the cut; the next shot opens already moving | Energy, a repeating rhythm (three or more beats) |
| Jump cut | A cut on action whose direction and speed match across it, though the position may reset | Lists, recaps, quick-fire runs |
| Masked swap | The outgoing motion (or the shape it leaves) becomes the mask that reveals the next beat; the change happens while it's covered | Continuity without a visible cut |
| Carry across | One element travels on into the next beat while the rest changes | Walkthroughs, stories, set-up and payoff |
| Covering wipe | A large shape covers the frame, the content swaps, the shape uncovers | A change of world or palette |
| Hold, then cut | The beat lands and is read at rest, then a clean start | Figures, the ask, anything that must be understood |
| Loop | The last frame matches the first in place, colour and speed | Loops on purpose |

The four velocity-matched techniques:

- **Zoom through** (moving on to something new, a change of chapter). The outgoing line grows towards the viewer
  (scale 1 to 1.2, blur to 10 px, `power3.in`, 0.2 s, with its opacity falling to 0.15 on its own linear tween);
  a hard cut swaps the two at the blur's peak; the incoming line starts at 0.75 scale, 10 px blur and 0.15
  opacity and grows into place (`expo.out`, 0.5 s). Only one line is ever seen at a time. Headlines and short
  phrases only: body text is unreadable at 0.75.
- **Inverse zoom through** (arriving at a payoff). The outgoing element shrinks away (to 0.8); the incoming one starts
  oversized (1.25) and settles back to 1, the same values otherwise. It reads as arriving, where the forward one reads
  as moving on.
- **Cut on the curve** (scene to scene, sideways). The outgoing hero accelerates one way (about 230 px, `power4.in`,
  0.3 s) and fades by a quarter to a third of its travel; the incoming hero enters from the opposite side already
  moving the same way (`power4.out`, the same distance and time) from about 0.35 opacity. The two halves of one
  `power4.inOut` meet at the same speed. Nothing travels fully off or on screen.
- **Waterfall** (line to line). The same cut word by word: each outgoing word creeps then rips away (`power4.in`,
  0.34 s, faded in 0.18 s, about 0.02 s apart in reading order, the last word gone right at the cut); the incoming
  words cascade in with gaps that shrink (start at 0.05 s, each about 0.84 of the last). Set every incoming word to
  its start state at build, so none sit visible while it waits.

- **Blur matches the subject's size:** about 10 px for text, 18–20 px for a full-frame surface, the same on both sides
  of the cut, on the wrapper rather than the children.
- **Mirror the eases:** `power4.in` out, `power4.out` in; the entry is never gentler than the exit.
- No gap where nothing moves at the seam: time the last fading element to vanish right at the cut.
- Interrupted moves read as intended only in a repeating rhythm; a single one can look broken. Calm, premium and
  read-critical beats (the logo, the ask, legal text) hold and land instead.

## The catalogue

All of them animate transforms, opacity, `clip-path` and `filter` on the two scenes' wrappers, from a transition
start `T`.

| Transition | How it's built |
|---|---|
| Push | Both scenes move together, the new one pushing the old off: `x` −1920 and from 1920, 0.5 s, `power3.inOut` |
| Vertical push | The same on `y` (1080) |
| Elastic push | A push whose incoming scene overshoots by about 30 px and settles back in two short sine moves |
| Squeeze | The old scene squashes to a line at one edge (`scaleX` 0, origin left), the new one expands from the other edge, 0.4 s |
| Iris | The new scene revealed by `clip-path: circle(0% → 75% at x y)`, 0.5 s, `power2.out`; from a clicked point, it reads as a cause |
| Diamond iris | The same with a four-point polygon growing past the frame |
| Diagonal split | The old scene, on top, clipped down to a triangle in one corner, revealing the new one behind |
| Card flip | Both scenes turn 180° on `rotationY` together (`backface-visibility: hidden`, perspective about 1200 px on the parent), 0.6 s |
| Zoom through | The old scene scales to 2.5 with an 8 px blur and fades (`power3.in`, 0.4 s); the new one grows from 0.5, blurred, 0.15 s behind (`power3.out`) |
| Zoom out | The old scene, on top, shrinks to 0.3 and fades, revealing the new one behind |
| Cross-fade | Opacity out and in together, 0.5 s, `power2.inOut`: the baseline |
| Blur cross-fade | Blur and a 3% scale shift with the fade: 3–6 px fast for high energy, 8–15 px for medium, 20–30 px held at its peak for 0.3–0.5 s for calm films |
| Focus pull | The old scene blurs out slowly while the new one fades in sharp, like a lens refocusing |
| Blur through | Both scenes pass through a fully abstract blur (about 30 px) and the new one resolves slowly |
| Directional blur | Blur, skew and travel the same way on both sides, like a whip |
| Dip | Fade to a solid colour (the brand's ground, or black), a beat, then fade up; 3 frames of darkening before a hard cut makes the cut read as meant |
| Colour flood | The hero stays while the ground changes colour around it in about 0.4 s |
| Growing circle | A circle in the next scene's colour grows from the centre (or the hero) to fill the frame, then the new content arrives on it |
| Becomes the next | The outgoing scene's key shape (a card, a button, a badge) squashes about 8% for a moment (a brand's mark only if the brand is playful), then grows to fill the frame, changing shape steadily on the way (a circle to a rounded square to the frame); it fills with the next scene's ground colour as it grows, and the new content eases in on it from 0.93 scale to 1. Curves change steadily and never flip through straight |
| Staggered blocks | Two to five full-frame blocks in the palette's colours sweep across 0.04–0.06 s apart; the scenes swap while covered |
| Blinds | Full-width (or full-height) strips sweep across in a stagger: 4–6 for calm, 6–8 for medium, 12–16 for high energy |
| Shutter | Two halves close from the top and bottom, the scenes swap, they open again |
| Clock wipe | A polygon sweeping round from the centre, one quarter at a time (a nine-point polygon keeps its edge smooth) |
| Grid dissolve | Cells in five of the palette's colours cover the frame in a ripple from the centre; the swap happens at half coverage |
| Light leak | A warm tint and two or three bright radial glows, bigger than the frame, drift across; the swap at the warmest moment |
| Overexposure | The old scene blows out (`filter: brightness()` up to about 3) under a rising white layer; the swap at full white |
| Film burn | Amber, orange and red glows bleed in from one edge, staggered; the swap under them |
| Glitch | Red, green and blue copies (normal blending at about 35%) jitter by 30–60 px for a few frames; the swap mid-jitter |
| Colour split | The three colour copies spread apart (about ±80 px) and come back together on the new scene |
| Ripple | Quick sideways shakes with a little scale and rising blur; the swap at the peak |
| Tape | The scene's own content cloned into about 20 strips, each shifted by a seeded amount, with red and blue copies |
| Gravity drop | The old scene, on top, falls (`y` 1200, a 4° turn, `power3.in`), revealing the new one behind |
| Page burn | The old scene burns away from a corner: a noisy fire edge (a seeded noise function) cut into it with an even-odd `clip-path`, a scorched fringe drawn on a canvas, black showing through, and the new scene rising slowly from the dark at about 90% of the burn. Keep it for one hero moment |

Some don't work in CSS: a star iris (polygon points don't interpolate well), tilt-shift (no selective blur), a lens
flare (it reads as a shape) and a door or hinge (it distorts too fast). Avoid transitions that show a visible
repeating pattern of tiles, cells or dots: organic noise reads well, geometric repetition reads as cheap.

## Shader transitions

HyperFrames' shader transitions package (`@hyperframes/shader-transitions`, the same version as HyperFrames) blends
the two scenes pixel by pixel on a WebGL canvas: warps, burns, morphs and glitches CSS can't do. It takes over every
scene's visibility for the film, so plan it from the start, and follow its rules for what it captures: no
`transparent` in gradients (use the colour at zero alpha), no gradients on lines thinner than 4 px, no CSS variables
on anything visible while it captures, gradients at 0.15 opacity or more, and every scene with an explicit
background colour that matches the one passed to it. Check every transition in snapshots.

---
Sources: written for Video Studio from HyperFrames' transition catalogue (hyperframes-animation), the cut catalogue
and transition facts of the explainer, launch and code-change skills (v0.8.149, Apache-2.0, © HeyGen), and
DiffusionStudio's text-to-lottie seam grammar (MIT, © Diffusion Studio Inc.), changed: rewritten, merged and
trimmed. See NOTICE.
