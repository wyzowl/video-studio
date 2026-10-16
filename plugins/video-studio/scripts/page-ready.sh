#!/usr/bin/env bash
# Wyzowl Video Studio PostToolUse hook (after Claude writes or edits a file). When the file is the data behind a studio
# page (brand.json, script.json, storyboard.json or review.json), studio.mjs page-ready tells Claude the page is ready
# to show.
# Every other file is waved through here, before Node starts.
input="$(cat)"
case "$input" in
  *brand.json* | *script.json* | *storyboard.json* | *review.json*) ;;
  *) exit 0 ;;
esac
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
command -v node >/dev/null 2>&1 || exit 0
root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
printf '%s' "$input" | node "$root/scripts/studio.mjs" page-ready
exit 0
