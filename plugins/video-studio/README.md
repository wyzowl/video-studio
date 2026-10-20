# Wyzowl Video Studio

Make professional videos with Claude Code, on your own Mac. Claude writes the script, designs a storyboard you
approve scene by scene, builds the video, adds its sound, and renders it, with a review page at every step where your
feedback counts.

**Works in Claude Code on macOS** (tested on Apple silicon). It doesn't run in Claude's chat apps. It needs about
6 GB of disk space for HyperFrames' browser and models, plus 0.3 to 1.5 GB for each video.

## What it does

- **A guided brief.** A few questions about the video (type, brand, size, where it's shown, its length), then a
  script with the voiceover beside what happens on screen, for your approval.
- **Storyboards you approve.** Real frames in your brand at the video's size. Approve each scene, or leave a note.
- **Videos built and checked for you.** Animated videos, and videos cut from your own footage (transcribed, trimmed and
  assembled), reviewed against a seven-point rubric before you see them.
- **Brand kits.** Colours, fonts, logos, motion and a logo ident, read from your website and files, reused across every
  video.
- **Sound.** Sound effects from SFX Kit placed on their moments, music, and the voiceover you bring (your own
  recording, or one made with any voice service), with captions.
- **A library** of ready-made animated items (widgets, layouts, text effects, transitions and data), dressed in your
  brand.
- **Delivery.** A 60 fps master, a web copy, a poster and captions, rendered on your Mac. When a video is finished,
  Video Studio offers to tidy it up, to free the space its drafts and history take.

## Get started

1. Install the plugin: in Claude Code, type `/plugin install video-studio --marketplace wyzowl/video-studio`. Start a
   new session and run `/video-studio:setup`. It says what it will install and download (about 1 GB), installs it,
   creates your studio folder and makes a test render.
2. Open Claude Code in the studio folder.
3. Add a brand with `/video-studio:new-brand`, then start a video with `/video-studio:new-video`.

| Command | What it does |
|---|---|
| `/video-studio:setup` | Checks this Mac, installs what Video Studio needs, creates a studio folder and makes a test render |
| `/video-studio:new-video` | Asks a few questions, sets up the project, then writes a script and makes a storyboard, each for your approval |
| `/video-studio:new-brand` | Builds a reusable brand kit, with a logo ident and its own brand page |
| `/video-studio:dashboard` | Shows the studio's pages: videos, brands, scripts, storyboards, video reviews and the library |

## What Video Studio runs, fetches and sends

Video Studio works on your Mac. Your scripts, footage, voiceovers, brand kits and videos stay there. Here is everything
it runs, downloads and sends, and when.

### What it runs

- **Its own scripts,** in Node.js, from the plugin's folder: the studio helper (`scripts/studio.mjs`), the page server,
  and the tools for review, footage, captions and sound. They draw storyboard frames and PDFs in HyperFrames' headless
  browser.
- **HyperFrames 0.8.149,** through `npx --yes hyperframes@0.8.149`, to make, check, render and take stills of videos,
  and transcribe speech, all on your Mac. Videos made on an earlier version keep it, through their own scripts.
- **ffmpeg and ffprobe,** for audio and video; macOS's `open`, to open a page in your browser or show a render or PDF
  in Finder; and `unzip`, to unpack SFX Kit. Setup's checks also run `git --version`, `brew --version` and `sw_vers`.
- **Setup's installs:** Node.js, ffmpeg and git through Homebrew (you install Homebrew itself, with your Mac password),
  and two skills for Claude Code in your studio folder, through `npx --yes skills@1.7.4`.
- **A page server** for the studio's pages, at `http://127.0.0.1:4747` (or the next free port up to 4756). It answers
  only this Mac, serves only your studio's files, and refuses requests from websites.

### What runs by itself

All of this happens only in a session inside a studio folder. Anywhere else, Video Studio stays silent.

- **When a session starts** (`scripts/session-start.sh`), Video Studio tells Claude about the studio. If anything it
  needs isn't on your Mac yet (after an update, or a download that didn't finish), it starts downloading it in the
  background and logs the download in `~/.wyzowl-video-studio/install.log`. Once a day, if you've entered a licence
  key, it checks the full library (below).
- **After Claude writes a file** (`scripts/page-ready.sh`), Video Studio checks whether it's the file behind a studio
  page (a brand, script, storyboard or video review). If it is, it starts the page server if needed and tells Claude
  to show the page.
- **The band above the message box, and the answer box** (`hooks/index.tsx`):
  - The band runs Video Studio's helper (`node <plugin>/scripts/studio.mjs ready`, and `url` to open a page, each with
    your studio's folder) to see what's waiting for your review. It does this when the session starts, after each of
    Claude's turns, and after each Video Studio tool Claude runs. It looks at Claude's Bash commands only to notice
    those tools.
  - When you press the band's button, it opens the studio page (a `127.0.0.1` address) in the desktop app's browser
    pane, through the browser pane's own tool, or else in your web browser, with `open`.
  - The answer box reads the text of Claude's final answer, and keeps a short fingerprint of it for the session, to
    draw that answer in a yellow box.
  - Nothing the band or the answer box reads leaves your Mac.

### What it downloads

- **HyperFrames 0.8.149** and its dependencies, from npm. HyperFrames then fetches its headless browser (Chrome for
  Testing, from Google) and the two models setup downloads, from their releases on Hugging Face and GitHub:
  transcription (Parakeet, about 640 MB) and presenter cut-outs (about 168 MB).
- **Two skills,** at setup:
  - HyperFrames' skills, from `github.com/heygen-com/hyperframes`, at its `v0.8.149` release;
  - LottieFiles' motion-design skill, from a fixed commit of `github.com/LottieFiles/motion-design-skill`.
- **SFX Kit,** the studio's sound effects (about 55 MB, CC0), from `github.com/wyzowl/sfx-kit`'s release, checked
  against its checksum and then file by file.
- **The GSAP animation library,** from `cdn.jsdelivr.net`, whenever a browser plays a video (to preview, check or
  render it) or one of the library's preview pages.
- **Fonts a video names without including,** which HyperFrames fetches from Google Fonts as it renders (asking for the
  font and the characters the video uses), and keeps in its cache.
- **Your brand's website,** when you ask for a brand kit from it: its pages, styles, fonts and logo files. Logo files
  and Google Fonts are downloaded only with your OK.
- **With a licence key:** the full library's items, from Wyzowl's library service, checked against their checksum.

### What it sends

- **With a licence key, once a day,** Video Studio sends Wyzowl's library server (`app.wyzowl.com`):
  - your key;
  - an anonymous, random ID for this Mac (a key works on up to three Macs);
  - the version of the plugin, and of the library you have.

  The server says whether the key is valid and whether a newer library is available. Without a key, nothing is sent.
- **Nothing else.** Video Studio never sends your work anywhere.
  - For everything it runs, it turns off the anonymous usage data that HyperFrames, the skills tool and Homebrew would
    otherwise send, and HyperFrames' daily check for a newer release, since Video Studio chooses the version
    (`HYPERFRAMES_NO_TELEMETRY=1`, `HYPERFRAMES_NO_UPDATE_CHECK=1`, `DISABLE_TELEMETRY=1` and
    `HOMEBREW_NO_ANALYTICS=1`).
  - It takes HyperFrames' stills with `--describe false`, so frames are never sent to a service to describe them.
  - Claude sees what you share in the chat, as usual in Claude Code.

### What it keeps, and where

- **Your studio folder,** wherever setup made it: brands, videos, renders, and the pages' notes.
- **`~/.wyzowl-video-studio`:**
  - your licence key and this Mac's anonymous ID;
  - the full library's items, and SFX Kit;
  - a list of the sounds SFX Kit didn't have;
  - setup's notes and the download log.
- **HyperFrames' own folders:** its settings and logs (`~/.hyperframes`), and its cache (`~/.cache/hyperframes`): its
  browser, models and fonts, and each video's edit history.
- **npm's cache,** with HyperFrames and the skills tool.

**Tidying up.** When a video is finished, Video Studio offers to tidy it up. Once you've said yes, it deletes the
video's draft renders, review stills, replaced storyboards and footage previews, and its edit history in HyperFrames'
cache. It keeps everything the video needs to be changed and rendered again.

Apart from setup's installs, Video Studio changes nothing outside those folders: no shell settings and no system
settings.

## Support and privacy

- Support: https://wyzowl.com/contact-us/
- Privacy policy: https://wyzowl.com/privacy/

## Licence

Video Studio is free to use to make videos, commercial or not, client work included, under the
[Wyzowl Video Studio Licence](LICENSE). Share links to it rather than copies, and don't release your own versions.
SFX Kit is CC0; the bundled fonts are under the SIL Open Font License; and HyperFrames, its skills and the other tools
setup installs are under their own licences.

Full documentation: https://github.com/wyzowl/video-studio
