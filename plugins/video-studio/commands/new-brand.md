---
description: Add a brand to the studio. Builds a brand kit (logo, colours, fonts and motion style) from the brand's website and files, and gives it a brand page.
argument-hint: "[brand name or website]"
---

# New brand

## The studio

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/studio.mjs" context 2>&1`

## Your job

Create a brand kit by following the video-studio:brand-kit skill. `$ARGUMENTS` may give the brand's name or website:
use it, and don't ask again for what it answers. If the context above says this isn't a studio, stop and suggest
`/video-studio:setup`. If a brand with the same name already exists, offer to update it instead.
