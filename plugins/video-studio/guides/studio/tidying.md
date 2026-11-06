# Tidying up

Removing what a finished video no longer needs, and the outside skills an older setup left in a studio. Both delete
files, so both are done only when the user asks.

## Finished videos

A finished video still keeps what it needed while it was being made: draft renders, review stills, the storyboard
versions the approved one replaced, footage previews and its edit history in HyperFrames (up to 2 GB). The delivery
page and Studio health offer to tidy it up; tidy only when the user asks.
1. Run `node PLUGIN/scripts/studio.mjs tidy <project>` and show the user what it lists: what goes, what stays and the
   space it frees. For every finished video at once, `tidy --all`; for the edit history of deleted videos alone,
   `tidy --deleted`.
2. Ask before going on (AskUserQuestion, header "Tidy up": "Tidy it up" or "Keep everything"): deleting can't be
   undone.
3. On a yes, run it again with `--yes` and say what was freed.

It refuses while you're still working on the video. A video with no final render isn't tidied unless the user asks
for that video by name, knowing what it removes (`--unfinished`).

## Old outside skills

Studios set up before Video Studio had its own guides also hold HyperFrames' skills and LottieFiles' motion-design
skill (in `.claude/skills`, `.agents/skills` and `skills-lock.json`). Video Studio's own skills and guides replace
them, so follow those. Studio health lists them; remove them only when the user asks:
1. Run `node PLUGIN/scripts/studio.mjs skills` and show the user what it lists.
2. Ask before going on (AskUserQuestion, header "Old skills": "Remove them" or "Keep them"): removing can't be undone.
3. On a yes, run it again with `--remove --yes` and say what was removed. Nothing else in the studio is touched.

---
Sources: Video Studio's own guidance.
