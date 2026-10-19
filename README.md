# Wyzowl Video Studio

A Claude Code plugin for making animated videos, and videos cut from your own footage, with
[HyperFrames](https://github.com/heygen-com/hyperframes): a few questions to start, reusable brand kits with their own pages, a written script and a storyboard you approve
before anything is built, a scored review loop, and rendering on your own Mac.

**Status:** animated and footage videos, with a free library of ready-made pieces and the full library to unlock.

## Install

The easiest way is to ask Claude. In Claude Code, say:

> Install the Wyzowl Video Studio plugin from https://github.com/wyzowl/video-studio

Then start a new Claude Code session, so the plugin loads, and run `/video-studio:setup` (or ask Claude to set it
up). Setup checks your Mac, installs everything Video Studio needs (it says first what it will download, about 1 GB,
and only asks you to do what needs you: Homebrew's install, which takes your Mac password, and choosing where your
studio lives), creates your studio folder and makes a test render. It opens a page beside the chat that ticks off each step as it's done. When it's done, open Claude Code in the
studio folder.

To install it yourself, run this in a terminal (Claude Code 2.1.275 or later):

```bash
claude plugin install video-studio --marketplace wyzowl/video-studio
```

Or type `/plugin install video-studio --marketplace wyzowl/video-studio` in Claude Code.

While the repository is private, you need access to it on GitHub, and git must be able to sign in to GitHub (for
example with the GitHub CLI: `gh auth login`, then `gh auth setup-git`).

### For Claude: installing this plugin

When a user asks you to install Wyzowl Video Studio, or gives you this repository's link:

1. Run `claude plugin install video-studio --marketplace wyzowl/video-studio`.
2. If it fails because the repository is private or git can't sign in to GitHub, explain that in plain words. The
   fix is access to `wyzowl/video-studio` on GitHub, then `gh auth login` and `gh auth setup-git`.
3. Tell the user to start a new Claude Code session (plugins load when a session starts), then run
   `/video-studio:setup`.

When a user asks you to update it: run `claude plugin marketplace update wyzowl`, then
`claude plugin update video-studio@wyzowl`, and tell them to start a new Claude Code session.

## Update

Ask Claude to "update the Wyzowl Video Studio plugin", or run these in a terminal:

```bash
claude plugin marketplace update wyzowl
```

```bash
claude plugin update video-studio@wyzowl
```

Then start a new Claude Code session. Studios carry on as they are; the page server restarts on the new version by
itself the next time a page is shown. If the new version needs a download that isn't on your Mac yet (such as SFX
Kit, the studio's sound effects), it downloads in the background when a session starts, and Claude tells you in a
line. The dashboard says what the update brought, until you
press **Got it**.

## Requirements

- **macOS.** Tested on Apple silicon. Windows and Linux aren't supported yet: setup stops on them with a message.
- **Claude Code**, kept up to date. The band above the message box and the answer box use plugin features from
  Claude Code 2.1.295.
- **About 6 GB of disk space** for HyperFrames' browser and models, plus 0.3–1.5 GB per video.
- Setup installs the rest: Node.js, ffmpeg and git (through Homebrew), the HyperFrames skills, the LottieFiles
  motion-design skill, the on-device transcription model, and SFX Kit, the studio's sound effects.

## Commands

| Command | What it does |
|---|---|
| `/video-studio:setup` | Checks and installs what's needed, creates a studio folder, and makes a test render |
| `/video-studio:new-video` | Asks a few questions (type, brand, script, size, where it's shown, length), sets up the project, then writes a script and makes a storyboard, each for your approval |
| `/video-studio:new-brand` | Builds a brand kit from a website, logo files, colours and fonts, with a logo ident and its own brand page |
| `/video-studio:dashboard` | Shows the studio's pages: recent videos, video overviews, brands, scripts, storyboards, video reviews and the library |

## How a video is made

1. **Questions.** `/video-studio:new-video` writes the answers into the project's brief, so nothing is asked twice.
2. **Script.** A written script, a row per beat: **#**, the **Voiceover** (or the **Text on screen**, without
   a voiceover) and the **Action on screen**, with on-screen text in bold. Above it, the voiceover's word count and
   the length it makes (135 words ≈ 60 seconds). On the script page you click any cell to leave a note on it and add
   general notes. The decision starts on **Approve script** and switches to **Changes needed** when you add a note.
   Claude writes new versions until you approve.
   A recorded voiceover is transcribed and cut clean first. For a footage video, Claude reads all the footage first:
   every clip transcribed, with its pauses, umms and repeated takes marked. The script is then the cut it proposes,
   word for word from the best takes, with the clip and time of each line, and a note of what was cut.
3. **Voiceover and timing.** A recorded voiceover is the master clock. Without one: an AI voiceover (HyperFrames'
   built-in voices by default, made on the Mac) read from the approved script, or on-screen text timed to a beat
   grid.
4. **Storyboard.** Every scene with 1–5 frames, rendered in the brand at the video's real size. On the storyboard
   page every scene starts **Approved**: switch any you'd like changed to **Feedback**, with a note, then save. Claude
   makes a new version until every scene is approved. Nothing is built before that. For a footage video the frames
   are stills from the footage, and each scene has **Play the scene**, which plays its rough cut with its sound.
5. **Build and review.** Claude builds the video, adds its sound effects from SFX Kit (as many as the brief calls for,
   each placed exactly on its moment and set under the voiceover), renders drafts and reviews them against a
   seven-point rubric, for at least two rounds, until every score is 8 or more.
6. **Video review.** On the video's review page you watch it and pin notes to moments in it. The decision is
   **Approve video** unless you add a note or write under **Anything else?**, which switches it to **Changes needed**.
7. **Delivery.** Once you approve, Claude renders the 60 fps master, a web copy, a poster and a contact sheet.

At each point where your feedback is needed, Claude opens the page for it as soon as it's ready: in the Claude
desktop app, in the built-in browser beside the chat. In the chat it adds a card for the page with a link right under
it that opens the page in your normal browser (in the terminal, the link alone).

In a studio session, a band above Claude's message box keeps the studio one click away. When a script, storyboard or
video is waiting for your review, it says so, with a button that opens it (for example **Open storyboard v2**). While
Claude makes something, it says what, with **Watch**. Otherwise it says **Working on a video?** with **Open dashboard**. The button opens the page beside the chat, opening the browser
panel if it's closed. Close the band with its × and it stays away until something new is waiting.

When Claude has worked on something, its final message, the one to read and act on, sits in a box with a yellow
border, so it's easy to find after a long run of steps. Plain replies look as usual.

While Claude makes a script, a storyboard or a version of the video, the video's overview shows the work as it
happens, so you always know something is going on: the stage's steps, the frames rendered and the time left, the
newest frames and, while it checks a version of the video, Video Studio's own scores and what it's fixing next.
Nothing there is for review yet: the page for that opens when it's ready.

You don't need to go back to the chat when you've finished a review. When you press **Approve and save** (it says
**Send changes**, or **Send feedback** on a storyboard, once there are notes), Claude picks it up straight away and
carries on: a script or video is approved unless you've added notes, and so is each storyboard scene unless you've
marked it **Feedback**. This works while that Claude Code session is
open; otherwise, tell Claude you've saved.

To get feedback from someone outside the studio, such as a client, send them a download.
- The script and storyboard pages have **Download PDF**. Each PDF is a clean document, without the review controls,
  and asks for replies by row or scene number.
- The video review page has **Download video**.
- A copy of each PDF is kept in the video's folder, and **Show in Finder** opens it there, ready to attach to an
  email.
- When their feedback comes back, paste it into **Anything else?** on the same page and save. Notes there count as
  changes, so the script or video goes to **Changes needed** and a storyboard isn't approved. You can also paste the
  feedback into the chat and Claude will carry on from there.

## The studio pages

The pages are local web pages, served by a small page server on the Mac (`http://127.0.0.1:4747`, which only that
Mac can reach). Only one studio's pages run at a time. Claude shows them in the built-in browser of the Claude
desktop app, or in the normal web browser, and always gives a card or link to open them. `/video-studio:dashboard`
shows them any time. The page designs come with the plugin; the content is the studio folder's own brands and videos.
Nothing is uploaded.

- **Dashboard:** what's waiting for your review, a timeline of recent videos with their status, the studio's brands,
  and the library. After an update, it says what's new; if something the studio needs is missing from the Mac, it
  says so.
- **Studio health** (`/health`, linked at the foot of every page): everything the studio uses on the Mac and
  whether it's working, and beside anything that isn't, what to say to Claude to fix it. During setup the same page
  follows each step as it's done.
- **Brand pages:** logo, colours (with contrast ratios), type specimens, motion identity and rules.
- **Video overviews:** one page per video showing what's happening now (including "Claude is making storyboard v3"
  while it works) and every stage, newest first, back to the brief: exactly what you wrote when you asked for the
  video, with Claude's summary and notes from starting it. On the overview, script, storyboard and video review pages,
  a switcher lists the script, storyboard and video versions, a row each; the breadcrumb leads back to the overview.
- **Script pages:** the review page for each version of the script: the script as a table, its word count and
  length, a note on any cell, and the approve or change decision.
- **Storyboard pages:** the review page for each storyboard version. A scene's frames sit on one row, at most 300 px
  wide and 400 px tall (on a small screen the row swipes sideways); click one to see it full size, as large as the
  window allows, and use the arrow keys to step through them.
- **Video review pages:** the video in a player, with notes pinned to moments, and the approve or change decision.
- **Point at it:** on a paused video, or on a storyboard frame, press **Box** or **Arrow** on the picture and drag
  to show exactly what you mean, then write the note beside it. The note keeps a close-up of what you pointed at, and
  Claude gets a picture of that moment with your mark on it. On a storyboard, the note goes into that scene's
  feedback.
- **Delivery pages:** once the final video is made, every file in one place: each size and its web copy, the poster,
  a thumbnail, captions (SRT and WebVTT) and the contact sheet, each to download or show in Finder, with the words to
  go with it (a title, a description and alt text) and suggestions to ask Claude for next, such as other sizes or a
  shorter cut. The version rows on a video's pages link to it (**Video delivery: All assets**).
- **Library:** ready-made pieces for videos, on one page with a menu of five categories: **Widgets** (on-screen
  things that show information), **Layouts** (ways to show one or more things on screen), **Text effects** (ways to
  use text on screen), **Transitions** (ways to move from one scene to the next) and **Data** (full-screen charts,
  graphs and data visualisations).
  - Every item plays live in any of the studio's brands and at any size: 16:9, 1:1, 4:5 or 9:16. **Type** shows
    paid and free items, the free ones only, or your favourites.
  - **Search** filters a category's items as you type (press `/` to start), and says how many match in the others.
  - **Favourites:** star any item to keep it in the studio's favourites. Video Studio suggests your favourites first.
  - **Try it with your words:** on an item's page, change its words and options and the preview plays them. The
    request to copy for Claude then includes them.
  - A plain dark frame and a person's silhouette stand in for your footage. Transitions play between that and a simple
    chart in the brand.
  - Each item has a code, such as W03. Claude suggests suitable items in the script and storyboard (they show as
    links you can open), and you can ask for any one by its code; Claude adds it in the video's brand.
  - Items combine: layered (the asset wall with captions over it, a brand colour with big words, a stat and
    captions) or one after another (quick-fire widgets). Claude checks they don't cover each other.
  - Words behind needs the presenter cut out of the footage: setup offers that download (about 168 MB, once).
  - Free items:
    - widgets W01 Process tracker, W02 Checklist, W03 Stat, W05 Numbered points and W26 Name tag;
    - layouts L01 Split screen, L07 Laptop demo and L15 Floating screenshots;
    - text effects T01 Words behind, T10 Punch and T46 Number roll;
    - transitions X01 Corner squares, X05 Pull back, X17 Stripe sweep and X19 Iris from a point;
    - data D01 Bar chart, D02 Line chart and D03 Big stat.
  - **The full library:** every other item comes with the full library, one purchase that includes every item added
    later. Until it's unlocked, its items show faded, with a **Paid upgrade** badge and a still at each size. Enter a
    licence key above the cards on any library page (or ask Claude to activate it) and they unlock on that Mac: they play live in your brands and sizes,
    and Claude uses them in your videos. Once a day, when a session starts, the studio checks for new items in the
    background. The licence and the unlocked items are kept in `~/.wyzowl-video-studio/`, not in the studio folder.

Long descriptions at the top of a page stop after 50 words, with "Read more" to open the rest. When you save a
finished review, the page takes you to the video's overview, where you can see Claude working on the next step.

A new studio starts empty: the dashboard shows placeholders until the first video and brand exist.

Pages keep themselves up to date. When Claude changes a brand, script, storyboard or video, its open page refreshes
within a couple of seconds. If you have unsaved feedback on the page, it asks you to save first instead of
refreshing. When a newer script, storyboard or video is ready, the older one links to it.

Claude opens a page as soon as it writes the file behind it (`brand.json`, `script.json`, `storyboard.json` or
`review.json`): a
plugin hook gives Claude the page's address at that moment. It stays quiet when the page is already open, so later
edits don't pull the browser away from what you're looking at.

The band above the message box (`hooks/bar.tsx`) and the answer box (`hooks/answer-box.tsx`) make up the plugin's
hooks module (`hooks/index.tsx`), and show only in sessions inside a studio.

After showing a script, storyboard or video, Claude waits for your review with a small background task
(`studio.mjs wait`). While it waits, the page's save bar says "Claude starts when you save". Saving the review ends
the wait, which wakes Claude. Background tasks end with the session, so after reopening Claude Code, tell Claude
you've saved.

## Repository layout

```
.claude-plugin/marketplace.json   the "wyzowl" marketplace, listing the plugin
plugins/video-studio/             the plugin: commands, skills, hook, scripts, page styles, templates
```

## Development

- Validate: `claude plugin validate plugins/video-studio` and `claude plugin validate .`
- Test the band above the message box and the answer box: `claude plugin test plugins/video-studio`
  (`tests/bar.test.tsx` and `tests/answer-box.test.tsx`, on the terminal and desktop surfaces).
- Try the pages on a scratch studio:
  `node plugins/video-studio/scripts/studio.mjs init /tmp/test-studio`, then
  `node plugins/video-studio/scripts/studio.mjs open --studio /tmp/test-studio`.
- Try the plugin from this checkout: `/plugin marketplace add /path/to/this/repo`, then
  `/plugin install video-studio@wyzowl`.

## Fonts, logo and licences

- **Inter** (SIL Open Font License 1.1) is the pages' only typeface, bundled with its licence:
  `plugins/video-studio/ui/fonts/LICENSE-Inter.txt`.
- **JetBrains Mono** (SIL Open Font License 1.1) is the library items' label font in the studio's own style, bundled
  with its licence: `plugins/video-studio/ui/fonts/LICENSE-JetBrainsMono.txt`.
- **Caveat** (SIL Open Font License 1.1) is the handwriting in the full library's D72 Hand-drawn, bundled with its
  licence: `plugins/video-studio/ui/fonts/LICENSE-Caveat.txt`.
- The **Wyzowl logo** (`plugins/video-studio/ui/wyzowl-logo.svg` and `wyzowl-icon.svg`) is a trademark of Wyzowl. It's
  included for the plugin's own pages and isn't covered by the repository's licence.
- HyperFrames and its skills (HeyGen) and the motion-design skill (LottieFiles) are installed from their own sources
  by setup, under their own licences.
- **SFX Kit** (CC0 1.0), the studio's sound effects, is downloaded by setup from
  [github.com/wyzowl/sfx-kit](https://github.com/wyzowl/sfx-kit).
- The licence for this repository will be chosen before the public release.
