# A long film

How the build makes an animated film of about two minutes or fifteen scenes and up (build skill, "A long film").

An animated film of about two minutes or fifteen scenes and up is built as one file per scene, each by its own
helper at the same time, on a foundation the main agent lays first, then joined and reviewed as one film. A helper
takes 15–20 minutes over its scene whatever the scene's length, most of it reading and checking, so this waits less
than one agent only on a film that long, and it uses about five times the tokens: a shorter film stays with one agent
and one clock. Each scene becomes a clip of its own in the HyperFrames app. The steps of "An animated video" still
hold; this is who does which.

1. **The foundation** (the main agent):
   - `assets/film/<video>.js`, loaded by `index.html`'s head and by every scene file: the brand kit as code (its
     colours and fonts, its eases and durations, and the helpers every scene uses), each scene's slot (its start and
     end, overlapping its neighbour by the transition between them), and everything that carries across scenes, as
     functions of the film's time: a world and its camera, a character, a change of light or weather. Each scene that
     shows it draws its own copy from those functions at the film's time, so both sides of a seam draw the same
     picture and no join has to match it by hand.
   - `index.html`: any ground that spans scenes, each scene's host (in a plain wrapper when a join moves it), the
     transitions that cover a cut (X01, X13, X17) and the recipes that act on two scenes (X05, X19), the sound, and
     the root timeline for the joins (`format.md`, "Scene files"). Where one scene opens inside another
     (an iris, a reveal), the incoming scene has its own opaque ground, so a shared world isn't drawn twice.
   - A starter for each scene (`compositions/<scene>.html`: its ground if it has one, its copy of what's shared, and
     its clock), and a brief for each in `docs/build/`: its slot; what comes in and goes out at each seam, and which
     half of each transition is the scene's own; its plan, words and approved frames; the decisions already made;
     and its library items, as `studio.mjs library` gives them, timed in the scene's own time.
   - Before any helper starts, snapshots across every seam with only the starters: what's shared must already carry
     across.
2. **The helpers:** one Agent per scene, all started in one message. Each builds only its own file, from its brief,
   the foundation and `format.md` ("The contract", "Scene files"), with the patterns and techniques its
   plan names, and checks it with `HF lint` and stills in its slot. Each reports its choices and changes (for
   `docs/decisions.md`) and its key moments.
3. **The joins and one review** (the main agent): each transition the briefs leave to the joins, on the root timeline,
   moving the wrappers from the film's time; `docs/decisions.md` from the reports; then the whole film is checked and
   looked at before rendering, as for any animated video, with a five-frame strip of every seam (`HF snapshot
   --review`), before the review skill takes over.

A fix after a review goes into its scene's file; a change to the foundation is checked across every seam again. If
the user moves a scene in the HyperFrames app, its content moves but its joins don't: rebuild the join, and say so on
the review page.

---
Sources: Video Studio's own guidance.
