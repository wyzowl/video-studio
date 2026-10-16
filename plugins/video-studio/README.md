# Wyzowl Video Studio (plugin)

Make animated videos with Claude Code and HyperFrames, on your own Mac.

Start with `/video-studio:setup`, then open Claude Code in the studio folder it creates.

| Command | What it does |
|---|---|
| `/video-studio:setup` | Checks and installs what's needed, creates a studio folder, makes a test render |
| `/video-studio:new-video` | Asks a few questions, sets up the project, then writes a script and makes a storyboard, each for your approval |
| `/video-studio:new-brand` | Builds a reusable brand kit, with its own brand page |
| `/video-studio:dashboard` | Shows the studio's pages: recent videos, video overviews, brands, scripts, storyboards, draft reviews and the library |

Skills: `production` (the studio's rules and stages, including the draft review page), `script` (the written
script and its review page), `storyboard` (frames, the storyboard review page, new versions) and `brand-kit` (brand
kits and pages). At each point where feedback is needed, Claude shows the page in its built-in browser panel (or the
normal browser), with a card in the chat and, right under it, a labelled link for the normal browser.

Hooks: at session start, one briefs Claude inside a studio (elsewhere it only suggests setup until the first studio
exists). After Claude writes a page's file (`brand.json`, `script.json`, `storyboard.json` or `review.json`),
another tells Claude how to show the page (`studio.mjs show`), unless it's already open. Open pages refresh themselves
when their files change. For scripts, storyboards and drafts, Claude then waits in the background
(`studio.mjs wait`): saving a finished review wakes it, so the user doesn't have to come back to the chat.

To share outside the studio, script and storyboard pages download as PDFs and drafts as video files. The page server
makes each PDF from a print version of the page with HyperFrames' headless Chrome (`scripts/lib/print.mjs`,
`ui/print.css`) and keeps a copy in the version's folder; `studio.mjs pdf <page>` does the same for Claude.

The library (`/library/`) shows the items in `library/`, in five categories: widgets, layouts, text effects,
transitions and data (`scripts/lib/categories.mjs`). Each item is one HyperFrames block, a sub-composition whose words,
options and brand settings are HyperFrames variables, with a note for the studio in its `<head>`.
`scripts/lib/library.mjs` dresses a block in a brand kit and plays it on a dark stand-in with a silhouette;
`studio.mjs library <code> --brand <brand>` tells Claude how to add one to a video (and `--still` renders one for a
storyboard frame). Claude suggests items in scripts and storyboards by code (`[W03]`), and the pages link them.
A transition that only covers the cut is a block like the rest; one that moves both scenes is a recipe for the video's
main timeline (its template holds a layer and a script, marked `data-transition-id`), since a HyperFrames block can't
reach the scenes around it. Blocks take their size from their clip's `data-width` and `data-height` and measure text
off a canvas: until its start, a clip is hidden and measures as zero.
Large downloads (transcription, presenter cut-outs) are listed in `scripts/lib/extras.mjs`: setup offers them, and
after an update the session-start hook has Claude offer any the new version brings.

A hooks module, `hooks/bar.tsx`, adds a band above Claude's message box in studio sessions. It shows the storyboard or
draft waiting for review with a button that opens it ("Open storyboard v2"), or "Working on a video?" with "Open
dashboard". It checks after each of Claude's turns (`studio.mjs ready`). Its tests are in `tests/` (`claude plugin
test`).

Inside: `scripts/` (the studio helper, page server, frame renderer, setup check, website palette reader, review and
footage tools, and score kit), `library/` (the library's items), `ui/` (page and print styles, the pages' scripts, the Inter and JetBrains Mono fonts with their licences) and `templates/` (files
setup writes into a new studio).

Full documentation: https://github.com/wyzowl/video-studio
