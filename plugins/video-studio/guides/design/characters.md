# Characters: moving one the user has given

When the user gives a character (a mascot, the brand's illustrated people, a figure from their designer), this is how
it comes alive. Video Studio doesn't ask for characters: a film without one draws its world as `illustration.md` says.
When there is one, it's in the brand kit's `characters/` or the video's `inputs/`, and it's the user's design: move
it, never redraw it, restyle it or add parts it doesn't have (`brand.md`, "Real assets").

## What the file allows

| The character comes as | It moves by | What it can do |
|---|---|---|
| An animated file (Lottie, dotLottie) | Playing it, its moves timed to the film | What its animator made (`../runtimes/lottie.md`, "Characters") |
| An SVG with its parts in groups (or parts as separate files) | Each part turning about its joint ("A character in parts") | Big moves: an arm raised overhead, a step, a turn of the head |
| One flat picture (a PNG or JPEG, or an SVG drawn as one piece) | Pins that bend the picture ("One picture, bent by pins") | Small moves: a breath, a tilt or nod, a lean, a gesture, a wave from the elbow |

Look at the art at full size first, and what touches what: an arm drawn against the body moves the body with it.
Plan the character's moves in the storyboard from what its file allows. When a planned move needs more than the file
has (a full arm raise on a flat picture, a walk), plan the scene around it (frame the upper body, cut away) and say in
the scene's plan what a layered file would add. Mention it; don't ask for one.

The tool for all of it: `node PLUGIN/scripts/tools/puppet.mjs`, run from the video's folder. Its sheets go to
`docs/characters/`; look at each one.

| Command | What it gives |
|---|---|
| `parts <art.svg>` | An SVG's groups and named shapes, each outlined and numbered on a sheet, with its box |
| `cutout <picture> --out assets/characters/<name>.png` | The character without its flat background, cropped, and a sheet of it on red and on dark: anything wrongly kept or lost shows. `--keep-pockets` keeps enclosed areas of the background's colour (a white shirt on white), `--no-bottom` for a figure the picture's bottom edge cuts off. A picture that's already transparent is used as it is |
| `landmarks <art>` | Where the drawing ends (head, hands, feet) and branches (chest, hips), in the art's pixels, numbered on a grid |
| `check <name>.rig.json` | The rig at rest and in each of its poses, everything that stretches, squashes or folds outlined in red, and its problems in words |
| `copy` | The puppet runtime into `assets/vendor/puppet.js` |

## A character in parts

The parts move as themselves, so nothing stretches: the best result whenever the file has them.

- **Inline the SVG** in the film (an `<img>` can't reach its groups), and prefix its ids with the character's name.
- **Find the parts** on the `parts` sheet. A limb that bends needs its parts nested: the upper arm's group holds the
  forearm's, which holds the hand's. Where the file has them side by side, wrap the existing shapes in groups; change
  no shape and nothing about how it's drawn.
- **Each part turns about its joint,** given in the SVG's own units: the shoulder for the arm, the elbow for the
  forearm, the neck for the head. A stroked limb's joints are its line's end points; otherwise read them off the
  sheet. Set every part from the time, each frame, in `render(t)`:
  `gsap.set(armR, { rotation: 120 * raise, svgOrigin: "212 300" })`. A nested part's turn adds to its parent's, so
  the hand follows the forearm on its arc.
- **What's in front** is the SVG's order. An arm that crosses the body is drawn after it: move its group once, at
  build, where the plan needs it.

## One picture, bent by pins

A mesh of small triangles covers the drawing, following its outline (it parts wherever the drawing has a gap, however
narrow). Each frame, the pins go where the pose puts them and every triangle stays as close to its own shape as it
can, so the drawing bends like paper rather than stretching like rubber.

1. **The art:** the cut-out in `assets/characters/<name>.png`, or the SVG as it came (the rig then gives its `size`).
2. **The rig,** `assets/characters/<name>.rig.json`, beside it. Every position is in the art's own pixels; the
   runtime's header (`PLUGIN/scripts/puppet/puppet.js`) lists every field.

   ```json
   {
     "art": "maya.png",
     "pins": { "hip": [297, 705], "chest": [297, 465], "neck": [297, 288], "head": [297, 150],
               "shoulderR": [165, 345], "elbowR": [72, 562], "handR": [52, 783],
               "ribR": [185, 500], "waistR": [180, 690], "footR": [207, 1272], "footL": [387, 1272] },
     "chains": { "spine": ["hip", "chest", "neck", "head"], "armR": ["chest", "shoulderR", "elbowR", "handR"],
                 "sideR": ["chest", "ribR"], "hipR": ["hip", "waistR"] },
     "stiff": [{ "at": "head", "r": 120 }, { "at": "handR", "r": 40 }],
     "poses": { "breathe": { "chest": [0, -7] }, "wave": { "armR": [0, 14, 135] }, "nod": { "spine": [0, 0, 10] } }
   }
   ```

3. **Pins,** from the `landmarks` sheet's numbers, never guessed from a look at the picture:
   - a pin on every joint that moves: hip, chest, neck, head; shoulder, elbow, hand;
   - **chains** from the body outwards. A chain's turns swing each joint round the one before it and carry what's
     further out, so a limb keeps its length on an arc. A chain can start on another's joint (the arm from the chest);
   - **hold the body:** a few pins carried by the chest and the hip (two-joint chains, like `sideR` above) at the
     torso's sides and the thighs, so a moving arm doesn't drag the body with it;
   - **the feet** in no chain and never moved, so they stay planted while the body leans;
   - a pin on every separate bit of drawing (a held phone that doesn't touch the hand), or it stays where it's drawn.
4. **Stiff areas** for what mustn't bend: the head, the hands, a held object, a logo on a shirt. **Front areas** for a
   part drawn on top of the rest as it moves (an arm across the body).
5. **Poses** are the key poses the film mixes: turns in degrees (clockwise on screen) for a chain's joints after its
   first, moves in pixels for a pin. `cells` (40) sets the mesh: more for a busy outline or a small part that bends.
6. **Check:** `puppet.mjs check <name>.rig.json`, and look at the sheet. A joint bent far always shows a little red on
   its inside; a web of drawing pulled from the body, a fold or a part dragged along is a fault: hold the body with
   more pins, move less, or move a pin to the real joint. Check again after each change.
7. **In the film:** copy the runtime (`puppet.mjs copy`) and load it after GSAP. Build the puppet before the timeline
   is registered; draw it from `render(t)`:

   ```js
   const maya = await Puppet.load(document.getElementById("maya"), "assets/characters/maya.rig.json", { width: 380 });
   // in render(t): pose weights, then turns and moves of its own
   maya.draw({ breathe: 0.5 - 0.5 * Math.cos((t / 3.4) * 2 * Math.PI) }, { armR: [0, 14 * raise, 135 * raise + wave] });
   const [hx, hy] = maya.where("handR"); // the hand's place in the element's pixels, for what it holds or says
   ```

   The element is the art's box: place and move it like any other. `res: 2` in the options draws twice the pixels,
   for a character the camera pushes in on. The puppet draws on a WebGL canvas, so the render captures by screenshot
   on the graphics chip (`../cli.md`, "render").

**What pins can't do:** show what isn't drawn. Raise an arm drawn against the body and the drawing between them comes
too; a head can't turn to profile, a closed hand can't open, and legs drawn together can't walk. Keep turns of a part
drawn against the body under about 30°; a forearm or hand that's clear of the body can swing freely. For more, the
file has to have the parts.

## Making it alive

These hold for every character, whatever its file.

- **It breathes:** the chest rises 1–2% of the character's height on a slow cycle (3–4 s), all the time it's on
  screen unless it's still on purpose. It's ambient motion: below a fifth of the main moves' energy
  (`../motion/choreography.md`, "Ambient motion").
- **Overlap:** the head follows the body 2–4 frames late; hair, ears, a tail or a scarf follow the head a few frames
  after that; a gesture ends with a smaller echo of itself.
- **Anticipation:** a small move the other way before a big one (the hand dips before the wave).
- **Arcs:** limbs swing on arcs (turn the chain; never slide a hand a long way in a straight line).
- **Holds:** a pose lands and holds; not every part moves all the time, and never all at the same rate.
- **Planted:** feet stay put unless it walks.
- **On the words:** a gesture lands on the word it's about, a point on the thing it points at (`../audio/sync.md`).

## What lowers it

| What you see | Usual cause | Fix |
|---|---|---|
| A rubbery body that sways with the arm | too few pins holding the body | pins carried by the chest and hip; a stiff torso |
| A web of drawing between the arm and the body | an arm drawn against the body, turned too far | a smaller turn; move the forearm instead; a layered file for more |
| An arm that shrinks or stretches | a hand pin slid in a straight line | turn its chain |
| Floating, sliding feet | feet in a chain, or moved | feet pins in no chain, never moved |
| Robotic | every part moving at once, at the same rate | overlap: the head and hair late; holds |
| A part left behind | a separate bit of drawing with no pin | pin it |
| Soft when the camera pushes in | the canvas drawn for its smaller size | `res` in the options |
| A redrawn or restyled character | the art changed to make a move work | move the user's own drawing; plan around what it can't do |

---
Sources: Video Studio's own guidance. The pin warp follows the method of Igarashi, Moscovich and Hughes,
"As-Rigid-As-Possible Shape Manipulation" (SIGGRAPH 2005); `landmarks` finds the drawing's middle line with Zhang and
Suen's thinning (1984).
