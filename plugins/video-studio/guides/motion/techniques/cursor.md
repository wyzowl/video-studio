# Techniques: cursors, presses and interface

Moves for showing an interface being used: a cursor that clicks and drags, buttons that press, several people
working at once, a control and the thing it controls changing together. `grep -n "^### " cursor.md` lists them.

The cursor, by default:
- big enough to follow (48–96 px at 1080, 4–7% of the frame), above everything, `pointer-events: none`;
- entering from off the frame or a far corner, so its arrival reads as motion, never a teleport;
- aimed by its tip, not its box: offset it so the tip lands on the target's real centre (measured at build); a
  4 px miss reads as missing the button;
- one thing at a time: move, then act, then the result, each on its own beat.

### Click with a ripple
1. **Move** to the target, eased (`power2.inOut` calm, `power3.out` decisive, `back.out(1.2–1.4)` settling onto it
   with a tiny recoil), 0.4–1 s.
2. **Click** 0–0.3 s after it arrives (none reads as autopilot, longer as hesitation): cursor and target dip
   together and come back (0.06–0.12 s each way), the cursor more (to 0.8–0.9) than the target (to 0.92–0.97).
3. **Ripple** from the click point at the same moment: 1–3 rings growing to 3–6× and fading over 0.5–1 s
   (`power2.out`), 0.06–0.12 s apart. The rings are in the page from the start at scale 0 and opacity 0, and their
   tween has `immediateRender: false` so they stay hidden until then.

A single ring is more elegant in a busy scene; three for the climactic click.

### Press, with the cursor
Cursor and button compress together in one tween on both (`scale` to 0.95 subtle, 0.9 standard, 0.85 heavy, over
0.1–0.25 s, `power1.in`), then spring back together (`back.out(1.6–2.4)`, 0.4–0.7 s). The press starts exactly as the
cursor arrives. While pressed, the button's outer shadow tightens and an inner glow appears. Scale the cursor from
its tip (`transform-origin: 0 0`). A held press (0.3–0.8 s) reads as thinking or loading. Leave a second or more
after it for the result to be seen.

### Press, without a cursor
A button already on screen: a linear dip (`power1.in`, 0.1–0.3 s, to 0.92 by default, 0.88 dramatic, 0.96 subtle;
never below 0.85) then a spring back (`back.out(1.4–2.8)`, 0.4–0.9 s), the release starting exactly when the press
ends, so the spring picks up from the pressed value. Optional: a blurred glow behind the button (never in front)
growing to 3–8× and fading, and a faint glow over the whole stage. At release the button can turn to its success
colour and stamp a tick with its own firmer spring. The button needs to be big enough to see press (at least 3–5% of
the frame).

### Drag and drop
Approach, grab (the press dip on cursor and chip together, then a ghost copy appears with `set`, lifted to
1.03–1.08 with a soft shadow), carry, drop, settle.
- **Lockstep:** the cursor's tip and the ghost move as one rigid object: two tweens with the same start, duration
  and ease (`power2.inOut`, 0.6–1.2 s) between absolute positions measured at build. Check the middle of the move, not
  just its ends; any drift reads as the chip slipping out of the hand.
- The ghost is a copy at the source's position from the start (opacity 0.5–0.75), never made at runtime.
- **The drop is one moment:** the ghost goes and the placed field appears (from 0.92, 0.2–0.3 s, `power3.out`) at
  exactly the end of the carry, then its selection box and corner handles.
- **Resizing by a corner:** uniform `scale` with its origin at the opposite corner; the corner then moves in a
  straight line with the scale, so a cursor tween with the same timing stays on the handle.
- **Filling down** (a spreadsheet's handle): the cursor moves at constant speed (`ease: "none"`), and each cell
  appears with `set` at its share of the move.
- **Reordering:** lift (up 6–12 px, tilted 2–4°, shadow on); as it passes the neighbour's midpoint, the neighbour
  springs into the empty slot.

### Several people at once
Two to four cursors, each an arrow and a name tag in its own colour moving as one element, working one canvas at
the same time: a team at work. Write it as a table of each cursor's legs (from, to, start, length) and actions, all
fixed numbers.
- Every leg is a `fromTo` from the previous point (0.6–1.2 s, `power2.inOut`), with rests of 0.5–1.5 s between
  where the cursor sits completely still.
- Actions land on alternating beats (at least a second apart): while one acts, the others glide or rest. Each
  cursor keeps to its own part of the canvas, so paths never cross at once.
- Actions are quieter than a single cursor's (small dips, no ripples). The camera never moves; at most the canvas
  slides slowly under them.

### A control and its target
When a value is scrubbed, a field retyped or an option picked, the thing it controls changes in the same frame.
- **Continuous:** the readout's number and the target's property tween at the same label, with the same duration and
  ease (`power1.inOut` or `power2.inOut`, 0.8–1.6 s, never springy: the readout is data), to matching endpoints.
  Never the readout first and the target after, even by a tenth of a second.
- **Stepped** (each keystroke, each pick): one list of states holds both sides (the readout's text and the target's
  value), and one driver applies whichever is current, so they can't disagree.
- Two to four edits, each held 0.3–0.8 s, ending on a landed value. Readouts in tabular figures with a fixed minimum
  width.
- A unit conversion is an instant snap. An edited curve is proved by replaying the target's motion with it
  afterwards.
- Both halves stay in frame for every edit.

### A detection box
Four corner brackets and a label in a detection yellow on a dark ground, following a moving target: one driver works
out the target's position from time, then the box's position and size from the target, in the same frame (never a
separate tween for the box, or it trails). The size breathes 5–10% on a non-whole multiple of the drift's speed; the
confidence reads 95–99%, flickering faster than the box breathes, in a monospace. Move it with transforms, not
`left` and `top`.

### Finding where to point in a screenshot
Guessed coordinates on a busy screenshot miss by a sixth to a quarter of the frame. Find the point by choosing, not
estimating, entirely on the Mac:
1. Draw a numbered 9 × 9 grid over the image (ffmpeg, or `label_png.mjs` for the numbers), look at it, and note every
   column and row the target touches.
2. Crop that region (with a little padding), enlarge it, draw a 6 × 6 grid, and choose again.
3. Map back: position in the image = the region's origin + the local position × the region's size.
4. Draw the box on the image and look: if it's off, you now know which way; adjust and repeat.

When a description could match several things ("the button"), make it unique first ("the blue button top right"),
asking the user if needed.

---
Sources: written for Video Studio from HyperFrames' cursor and press rules in hyperframes-animation and
motion-graphics' grounding protocol (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten as notes, kept on the Mac,
and trimmed. See NOTICE.
