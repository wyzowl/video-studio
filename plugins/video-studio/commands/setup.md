---
description: Set up Wyzowl Video Studio on this Mac. Checks what's installed, installs everything Video Studio needs, and creates your studio folder.
argument-hint: "[folder for the studio]"
---

# Set up Wyzowl Video Studio

## What this machine has now

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" --online 2>&1 || echo "Node.js isn't installed (or the check couldn't run), so the other checks were skipped."`

The plugin's own files are in `${CLAUDE_PLUGIN_ROOT}`.

## Your job

Get the user to a working studio, one step at a time, saying what each step does in a sentence. Installing Video
Studio is their go-ahead for everything it needs, so install it without asking about each part (step 2 tells them up
front what's coming). Ask only where they have a real choice or must act themselves: Homebrew (its installer needs
their Mac password) and where the studio lives. Never change anything of theirs outside Video Studio and the studio
folder. Stop with a clear explanation if a step fails. Assume the user isn't technical: plain words, no
jargon.

0. **The setup page.** Unless the check above says Node.js isn't installed, start with the page that follows setup as
   you go: run `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" setup-page`, then open the address it prints in your
   Browser pane, beside the chat (preview_start with that url); without a Browser pane, `open <address>`. Tell the
   user in a sentence that it ticks off each step as it's done. Before each install below, say so on the page:
   `studio.mjs setup-note <check> installing`, where the check is `node`, `ffmpeg`, `git`, `skills`, `motion` or
   `chrome` (the test render); if it fails, `setup-note <check> failed`. The downloads in step 8 mark themselves. A
   check that's done ticks off by itself. Without Node.js, open the page once it's installed (step 4).
1. **macOS only.** If the check shows this isn't macOS, stop here: Wyzowl Video Studio runs on macOS only.
   Install nothing.
2. **Say what's coming, once.** In a few lines, from what the check marked missing: setup installs what Video Studio
   runs on (Node.js, ffmpeg and git, through Homebrew), its skills, and its downloads: SFX Kit, the studio's sound
   effects (about 55 MB), presenter cut-outs (about 168 MB), the transcription model (about 640 MB), and HyperFrames'
   browser with the test render. About 1 GB in all, a few minutes on a good connection. Then carry on, without asking
   about each one.
3. **Where the studio lives.** Use the folder in `$ARGUMENTS` if one was given. Otherwise ask with AskUserQuestion
   ("Where should your studio live?"), offering `~/Wyzowl Video Studio` (recommended) and, if the current folder is
   empty, "This folder". "Other" lets them type a path. If the folder is already a studio (it has `studio.json`),
   say so and offer to check and update it instead of starting again.
4. **Missing tools**, in this order, only for what the check marked "no":
   - **Homebrew:** you can't install it for them, because its installer asks for their password. Give them the one
     install command from https://brew.sh to paste into the Terminal app, wait until they say it's done, then re-run
     the check: `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"`.
   - **Node.js, ffmpeg, git:** run `brew install` with just the missing ones.
5. **HyperFrames version.** Use the newest release the check reported (or `npm view hyperframes version`). Call it
   `<version>` below. Every new video in this studio starts on this version.
6. **Create the studio:**
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" init "<folder>" --name "<studio name>" --hyperframes <version>`.
   Use the folder's name as the studio name unless they gave another. Don't offer to make the studio a git
   repository: it keeps its own versions (storyboards, drafts, renders).
7. **Skills**, run from the studio folder (they install for Claude Code, in this folder only):
   - `npx --yes skills add heygen-com/hyperframes --skill '*' --agent claude-code --copy -y`
   - `npx --yes skills add LottieFiles/motion-design-skill --skill motion-design --agent claude-code --copy -y`
8. **Downloads**, from the studio folder: `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" install all`. It
   downloads whatever isn't on this Mac yet, smallest first, and ticks each off on the setup page: SFX Kit (the studio's
   sound effects), presenter cut-outs (they let text sit behind a presenter in footage) and the transcription model
   (it turns voiceovers into word timings). It takes a few minutes; say so while it runs. If one doesn't finish, the
   next session tries again by itself. Faster renders need nothing: on Apple silicon, Video Studio's renders use the
   graphics chip by themselves.
9. **Test render**, from the studio folder. The first render also downloads HyperFrames' headless Chrome:
   ```bash
   HYPERFRAMES_SKIP_SKILLS=1 npx --yes hyperframes@<version> init videos/_setup-test --non-interactive
   cd videos/_setup-test && npm run check && npm run render -- --quality draft --fps 30 --output renders/test.mp4
   ```
   If it works, delete `videos/_setup-test`. If it fails, show the error and the likely fix.
10. **Finish.** Run the check from the studio folder and show the table. Show the dashboard: run
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" show / --studio "<folder>"` and follow what it says (beside the
    chat, with its card). Then tell them the one thing that matters next: **open Claude Code in the studio folder** (in the
    desktop app, start a session in that folder; in the terminal, `cd` there and run `claude`), so the studio's skills
    load. From there, `/video-studio:new-brand` adds a brand and `/video-studio:new-video` starts a video. Any time
    later, the Studio health page (`/health`, linked at the foot of every studio page) shows what's on this Mac and,
    beside anything that isn't working, what to say to Claude to fix it.
