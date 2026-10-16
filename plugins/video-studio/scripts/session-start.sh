#!/usr/bin/env bash
# Wyzowl Video Studio SessionStart hook. Inside a studio (a folder with studio.json) it briefs Claude about the studio.
# Elsewhere it's silent, except before the first studio exists, when it suggests setup.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

emit() {
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$1"
}

dir="${CLAUDE_PROJECT_DIR:-$PWD}"
studio=""
while [ -n "$dir" ]; do
  if [ -f "$dir/studio.json" ]; then
    studio="$dir"
    break
  fi
  [ "$dir" = "/" ] && break
  dir="$(dirname "$dir")"
done

if [ -z "$studio" ]; then
  if [ ! -f "$HOME/.wyzowl-video-studio/studios.json" ]; then
    emit "Wyzowl Video Studio is installed but not set up yet. If the user wants to make a video, suggest /video-studio:setup: it checks this Mac, installs what's missing (asking first) and creates their studio folder."
  fi
  exit 0
fi
if [ "$(uname -s)" != "Darwin" ]; then
  emit "This folder is a Wyzowl Video Studio, but Wyzowl Video Studio only supports macOS. If the user asks to make or render videos here, explain this, and don't run setup, installs or renders."
  exit 0
fi
if ! command -v node >/dev/null 2>&1; then
  emit "This folder is a Wyzowl Video Studio, but Node.js isn't installed, so the studio can't run. Suggest /video-studio:setup, which installs what's missing."
  exit 0
fi
exec node "$root/scripts/studio.mjs" hook --studio "$studio"
