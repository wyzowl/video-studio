---
description: Show the studio's pages - the dashboard of recent videos, video overviews, brand pages, storyboards and draft reviews.
argument-hint: "[page, e.g. /brands/acme/]"
---

# Studio pages

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" show $ARGUMENTS 2>&1`

The text above says how to show the page (the page server starts if it isn't running): follow it. If it says this
isn't a studio, or reports a problem, pass that on in plain words and suggest `/video-studio:setup` where it fits.
