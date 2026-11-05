# Code changes and releases

A film that explains a code change, a feature for developers or a release: what changed, why it matters, and what it
does. A diff is a list of edits; the film is a guided act of understanding. The material comes from the user: the
change's description, the diff, the notes, the people behind it.

## The rules of the type

- **Explain the change; don't read the diff.** Never narrate file by file or read the description aloud. Surface the
  one change that matters and leave out the incidental churn (dependency bumps, formatting, generated files) unless
  it is the story. The order comes from the story, not the diff's file order or the commit list.
- **Value first:** what the change unlocks, fixes or speeds up, in the viewer's words, lands by the second beat; the
  code and the mechanism are its evidence. No file, function or identifier names in the hook, and figures only when
  they carry stakes ("40% faster starts"), never inventory ("23 files changed").
- **A plain, technical, unhurried voice:** accurate, specific, no hype. It's for engineers.
- **Never invent a version.** Use a release number only when the user gives it; otherwise point to where to read the
  change, without naming a version.

## Choose one shape

| Shape | For | Order |
|---|---|---|
| **What's new** | a release, or several equal changes | the headline, two to four change items, the wrap |
| **The new thing** | one notable feature | the outcome it unlocks, what now works, its name, the code, what it does, a callback |
| **The fix** | a bug fix | the symptom, the bug happening, the fix (before and after), it now working |
| **The tidy-up** | a refactor, a migration, a speed-up | why, the old shape against the new, the structure untangling with the same results, the numbers |

A feature that also fixes a bug is "the new thing" with the fix as one beat; a fix that needed a small refactor is
"the fix".

## Kinds of beat

| Beat | Its job | Picture |
|---|---|---|
| hook | the opening seconds | type, or a hero code moment |
| problem | the bug, the smell, the pain | the offending line picked out |
| change | the change's name | type |
| diff | the change itself: a before and after, a hunk, new code | a code window |
| before and after | the old shape against the new | two code windows, or one morphing |
| mechanism | **what the change does when it runs** | an animated diagram |
| impact | the payoff: what now works | a big figure or a claim |
| evidence | the grounding: lines removed, a passing test, a benchmark | figures; a test turning green |
| credits | the people who shipped it | their names (and pictures, if the user gives them) |
| ask | pull it, upgrade, read the change | the command or the link |

Alternate code beats with mechanism beats: a body that's all code windows reads as show-and-tell. Most features and
fixes have a behaviour worth animating:

| The change touches | Animate |
|---|---|
| retries, resilience | a request's life: sent, fails, a growing wait, retried, succeeds |
| caching | two lanes racing: cold (slow, to the database) and cached (fast) |
| concurrency | one lane reshaping into several in parallel |
| a race or ordering bug | the broken flow first (items dropped, writers colliding), then the fixed one |
| performance | two timelines or bars racing, the new one finishing first |
| a refactor or migration | a tangled graph untangling, the same inputs giving the same outputs |
| a new endpoint or pipeline | data flowing along the new path; states lighting up in turn |

The diagram's build is the explanation: lanes and nodes draw on, the flow runs as each step is named, it settles on
the result with one accent on what changed.

## Showing code

- Two to four real snippets, each small and legible (4–12 lines), never a whole file, at a size that reads
  (`../../design/readability.md`).
- Build the moves in the film: removed lines collapsing in red and added ones expanding in green, staggered; one
  snippet morphing into another with the shared parts gliding; new code typed on with a caret; one line picked out
  with the rest dimmed; a long file scrolled to the changed line. Colour the code's tokens at build time, and fit
  each move to its beat's length (a long snippet typed at a fixed speed overruns a short beat).
- Figures (lines added and removed, files touched, a speed-up) go on an impact or evidence beat, counted up, not read
  aloud.
- Keep code clear of the caption band when captions run.

## Length

Developer films go wrong by talking too long. Aim for about 20 words (9 seconds) a beat, up to about 26 words (12
seconds) for at most two beats (the main diff, or a chain of cause and effect), and split or trim anything longer;
30–90 seconds is the sweet spot for the whole film. Silent beats are common: a diff typing on, a test turning green.

## The close

Credit the people who shipped it by name, as the user gives them: the voice says names, never usernames or handles;
on screen, the name first and any handle small beneath it.

---
Sources: written for Video Studio from HyperFrames' pr-to-video skill, its story design, code vocabulary and visual
design notes (v0.8.149, Apache-2.0, © HeyGen), changed: rewritten for material the user supplies, the code moves
described rather than taken from HyperFrames' registry, and product names left out. See NOTICE.
