---
description: Start a new video. Asks a few questions, sets up the project and its brief, then writes a script for you to approve, then a storyboard, before anything is built.
argument-hint: "[what the video is about]"
---

# New video

## The studio

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" context 2>&1`

## Your job

Start a new video in this studio. `$ARGUMENTS` may describe it: use what it says, and don't ask for anything it
already answers. If the context above says this isn't a studio, stop and suggest `/video-studio:setup`, or opening
Claude Code in the studio folder.

### 1. Questions

Ask with the AskUserQuestion tool, in one panel:

- **What type of video would you like to create?** (header "Type")
  - "Animated video": designed motion graphics, made from scratch to your script or voiceover.
  - "Footage-based video": your footage, cut and assembled with animated text, transitions and overlays.
- **Which brand is this video for?** (header "Brand"): up to three existing brands, most recently used first (label:
  the brand's name; description: "Use the saved brand kit"), then "New brand" ("Build a brand kit from your logo,
  website, colours and fonts"). With no brands yet, offer "New brand" and "No brand (a neutral style)". "Other" lets
  them name another existing brand.
- **Do you have a script or voiceover?** (header "Script")
  - "Script and recorded voiceover": you'll add the voiceover file (and the script, if there is one).
  - "Script only": you'll paste or upload the script.
  - "Neither yet": Claude asks about the video and drafts a script for you.

  For a footage video, "Neither yet" means the speech in the footage directs the edit (with no speech in it, Claude
  asks about the video and drafts what's said or shown); a recorded voiceover plays over the footage.

Then a second panel:

- **What size should the video be?** (header "Size"), only for an animated video (a footage video takes its size
  from the footage): "Horizontal 16:9" (websites, YouTube, presentations), "Square
  1:1", "Tall square 4:5" (social feeds), "Vertical 9:16" (Stories, Reels, TikTok, Shorts). "Other" takes a custom
  size such as 1200×628.
- **Where will it mainly be shown?** (header "Where"): "Website or landing page", "YouTube or online ad", "Social
  feed", "Presentation or event".
- **Roughly how long should it be?** (header "Length"), only when there's no recorded voiceover (otherwise the
  voiceover sets the length): "Up to 30 seconds", "30–60 seconds", "60–90 seconds", "Longer".

### 2. Follow-ups, only for what's needed

- **New brand:** follow the video-studio:brand-kit skill now, then come back here.
- **Footage-based video:** ask what kind of footage it is (AskUserQuestion, header "Footage", more than one
  allowed): "Talking head" (someone speaking to camera), "Interview", "B-roll" (scenes, products, places) and
  "Screen recordings". Then whether there's music: "I have a track", "Suggest one" or "No music". After step 3, ask
  them to put the clips in the project's `inputs/footage/` folder (give the full path), or to tell you where they are
  and copy them there yourself.
- **Recorded voiceover:** after step 3, ask them to put the file in the project's `inputs/` folder (give the full
  path), or to tell you where it is. WAV is best; MP3 is fine.
- **Script only:** ask for the script, pasted or as a file. Then ask how it should be voiced (AskUserQuestion):
  "On-screen text and music", "AI voiceover" (HyperFrames' built-in voices: free and made on this Mac), or "I'll record a voiceover" (pause until they supply it).
- **Neither yet:** ask what the video should achieve, who it's for, the key messages in order, the call to action and
  the tone. Draft a script in two columns (voiceover, and what's on screen) and get it approved before the storyboard.
  If the `wyzowl-explainer-script` skill is available, use it for the draft.

### 3. Set up the project

1. Choose a short kebab-case project name from the title, and check `videos/<project>` is free.
2. Scaffold with the studio's HyperFrames version (`hyperframes` in studio.json, shown above):
   `HYPERFRAMES_SKIP_SKILLS=1 npx --yes hyperframes@<version> init "videos/<project>" --non-interactive`
   Add `--resolution portrait` for 9:16 or `--resolution square` for 1:1. For 4:5 and custom sizes, set the
   composition's `data-width` and `data-height` after `init`. For a footage video, scaffold it, put the clips in
   `inputs/footage/` and scan them (production skill, "Footage videos"), then set `data-width` and `data-height` to
   the size the scan gives.
3. Copy the brand's fonts and logos into the project's `assets/fonts/` and `assets/logos/`.
4. Put supplied files in `videos/<project>/inputs/`. Keep the original voiceover; if it's MP3, also make
   `inputs/vo.wav` with ffmpeg.
5. Write `videos/<project>/BRIEF.md`. HyperFrames reads it, so it won't ask these questions again. The video's
   overview shows its sections as the brief, so the user can always look back on what they asked for:
   - **Request** is the user's own words: what they wrote when asking for the video (`$ARGUMENTS`, or the message
     that started it), then the answer they picked or typed for each question, then anything they wrote in the
     follow-ups, each after the question it answers. Copy their words exactly, however long: nothing tidied,
     shortened or corrected, and their own line breaks kept (don't wrap long lines). Quote their writing with `> ` at the start of every line
     (a line of its own, `>`, between their paragraphs), so nothing they wrote reads as a heading.
   - **description** (in the front matter) says what the video is, in one or two short sentences: the video's pages
     show it under the title. Plain words, no quotes or line breaks, such as "A 45-second explainer that shows new
     customers how to book their first delivery."
   - **Intent** is your summary: what the video is for and how it should feel, in a short paragraph.
   - **Assets**, **Customizations** and **Notes** are your notes from starting it: the files it uses, anything about
     it that departs from the brand or the usual way, and anything else to remember.

   ```markdown
   ---
   title: <Video title>
   brand: <brand slug, or none>
   type: <animated | footage>
   size: <16:9 | 1:1 | 4:5 | 9:16 | WxH>
   aspect: <width>x<height>
   voiceover: <recorded | ai | none>
   workflow: general-video
   flow: companion
   storyboard: yes
   destination: <website | youtube | social | presentation | …>
   length: <~45s>
   language: en
   description: "<what the video is, in one or two short sentences>"
   message: "<what the viewer should take away, in one line>"
   audience: "<who it's for>"
   created: <ISO date and time>
   ---

   ## Request

   > <what they wrote, word for word>
   >
   > <their next paragraph>

   - Type: <the answer they picked, or what they typed>
   - Brand: <…>
   - Script: <…>
   - Size: <…>
   - Where: <…>
   - Length: <…>

   **<a follow-up question you asked>**

   > <their answer, word for word>

   ## Intent
   ## Assets
   ## Customizations
   ## Notes
   ```

### 4. Carry on

Tell the user in a few lines what's set up and what happens next. Then follow the video-studio:production skill from
its "Script" stage: the script for their approval, then the voiceover and timing, the storyboard for their approval,
then the build. A footage video is scanned first, and its script is cut from the takes (production skill, "Footage
videos").
