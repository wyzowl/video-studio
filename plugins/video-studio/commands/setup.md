---
description: Set up Wyzowl Video Studio on this Mac. Checks what's installed, installs what's missing (with your OK), and creates your studio folder.
argument-hint: "[folder for the studio]"
---

# Set up Wyzowl Video Studio

## What this machine has now

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" --online 2>&1 || echo "Node.js isn't installed (or the check couldn't run), so the other checks were skipped."`

The plugin's own files are in `${CLAUDE_PLUGIN_ROOT}`.

## Your job

Get the user to a working studio, one step at a time. Say what each step does in a sentence, ask before installing
anything or changing their settings, and stop with a clear explanation if a step fails. Assume the user isn't
technical: plain words, no jargon.

0. **The setup page.** Unless the check above says Node.js isn't installed, start with the page that follows setup as
   you go: run `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" setup-page`, then open the address it prints in your
   Browser pane, beside the chat (preview_start with that url); without a Browser pane, `open <address>`. Tell the
   user in a sentence that it ticks off each step as it's done. Before each install or download below, say so on the
   page: `studio.mjs setup-note <check> installing`, where the check is `node`, `ffmpeg`, `git`, `parakeet`, `cutout`,
   `skills`, `motion` or `chrome` (the test render); if it fails, `setup-note <check> failed`. A check that's done ticks
   off by itself. Without Node.js, open the page once it's installed (step 3).
1. **macOS only.** If the check shows this isn't macOS, stop here: Wyzowl Video Studio runs on macOS only.
   Install nothing.
2. **Where the studio lives.** Use the folder in `$ARGUMENTS` if one was given. Otherwise ask with AskUserQuestion
   ("Where should your studio live?"), offering `~/Wyzowl Video Studio` (recommended) and, if the current folder is
   empty, "This folder". "Other" lets them type a path. If the folder is already a studio (it has `studio.json`),
   say so and offer to check and update it instead of starting again.
3. **Missing tools**, in this order, only for what the check marked "no":
   - **Homebrew:** you can't install it for them, because its installer asks for their password. Give them the one
     install command from https://brew.sh to paste into the Terminal app, wait until they say it's done, then re-run
     the check: `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"`.
   - **Node.js, ffmpeg, git:** once they agree, run `brew install` with just the missing ones.
4. **HyperFrames version.** Use the newest release the check reported (or `npm view hyperframes version`). Call it
   `<version>` below. Every new video in this studio starts on this version.
5. **Create the studio:**
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" init "<folder>" --name "<studio name>" --hyperframes <version>`.
   Use the folder's name as the studio name unless they gave another.
6. **Skills**, run from the studio folder (they install for Claude Code, in this folder only):
   - `npx --yes skills add heygen-com/hyperframes --skill '*' --agent claude-code --copy -y`
   - `npx --yes skills add LottieFiles/motion-design-skill --skill motion-design --agent claude-code --copy -y`
7. **Transcription and voices.** If Parakeet is missing, ask, then run
   `npx --yes hyperframes@<version> models install parakeet` (about 640 MB). It turns voiceovers into word timings on
   this Mac.
   **Presenter cut-outs.** If they're missing, ask, then run
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" install cutout --studio "<folder>"` (about 168 MB, once). It cuts
   the presenter out of footage on this Mac, so text can sit behind them (the T01 Words behind text effect).
8. **Faster renders.** On Apple silicon, offer to add `export PRODUCER_BROWSER_GPU_MODE=hardware` to `~/.zshrc`
   (it uses the graphics chip for rendering). It changes their shell settings, so ask first.
9. **Test render**, from the studio folder. The first render also downloads HyperFrames' headless Chrome:
   ```bash
   HYPERFRAMES_SKIP_SKILLS=1 npx --yes hyperframes@<version> init videos/_setup-test --non-interactive
   cd videos/_setup-test && npm run check && npm run render -- --quality draft --fps 30 --output renders/test.mp4
   ```
   If it works, delete `videos/_setup-test`. If it fails, show the error and the likely fix.
10. **Optional extra: ElevenLabs**, for premium AI voices and music (it needs an ElevenLabs account; the built-in
    voices work without one). Ask first. If they want it, copy `${CLAUDE_PLUGIN_ROOT}/templates/elevenlabs.mcp.json`
    to `.mcp.json` in the studio. Claude Code asks them to approve it and sign in the next time they open the studio.
    Don't offer to make the studio a git repository: it keeps its own versions (storyboards, drafts, renders).
11. **Finish.** Run the check from the studio folder and show the table. Show the dashboard: run
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" show / --studio "<folder>"` and follow what it says (beside the
    chat, with its card). Then tell them the one thing that matters next: **open Claude Code in the studio folder** (in the
    desktop app, start a session in that folder; in the terminal, `cd` there and run `claude`), so the studio's skills
    load. From there, `/video-studio:new-brand` adds a brand and `/video-studio:new-video` starts a video. Any time
    later, the Studio health page (`/health`, linked at the foot of every studio page) shows what's on this Mac and,
    beside anything that isn't working, what to say to Claude to fix it.
