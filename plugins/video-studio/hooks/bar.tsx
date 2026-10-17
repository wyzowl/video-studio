// Wyzowl Video Studio's band above Claude's message box, in a session inside a studio (a folder with studio.json).
// When a script, storyboard or video is waiting for the person's review it says so, with a button that opens that page;
// while Claude makes something it says what, and the step it's on, with "Watch", which opens the video's overview
// (where it shows as it happens); otherwise "Working on a video?" with "Open dashboard". The button opens the page
// beside the chat (the desktop app's browser pane, opened if it's closed) or in the web browser.
// What's waiting is checked when the session starts, after each of Claude's turns and after each studio tool Claude
// runs (they mark the steps), never on a timer. Dismissed, the band stays away until something new is waiting.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { ReadyPage } from '../types'

const studioAt = atom({ plugin: 'video-studio', key: 'studio' } as const, '')
const readyAt = atom({ plugin: 'video-studio', key: 'ready' } as const, null as ReadyPage | null)
const dismissedAt = atom({ plugin: 'video-studio', key: 'dismissed' } as const, '')

// Homebrew's node on Apple silicon and Intel Macs, ahead of the system's own folders
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'

/** The studio this session works in: the nearest folder at or above its root that holds studio.json, or ''. */
async function findStudio($: EngineInterface): Promise<string> {
  let dir = (await $.session.root()).replace(/\/+$/, '') || '/'
  for (;;) {
    if (await $.fs.exists(`${dir === '/' ? '' : dir}/studio.json`)) return dir
    if (dir === '/') return ''
    dir = dir.replace(/\/[^/]+$/, '') || '/'
  }
}

/** Runs the studio helper (scripts/studio.mjs) for the studio; its output, or '' when it fails. */
async function helper($: EngineInterface, studio: string, args: string[]): Promise<string> {
  const argv = ['/usr/bin/env', `PATH=${PATH}`, 'node', `${$.plugin.root}/scripts/studio.mjs`, ...args, '--studio', studio]
  const run = await $.process.run(argv, { timeoutMs: 20000 }).catch(() => null)
  return run?.exitCode === 0 ? run.stdout.trim() : ''
}

/** What's waiting for the person's review now, or else what Claude is making (studio.mjs ready), into the band's state. */
async function checkReady($: EngineInterface, studio: string): Promise<void> {
  let page: ReadyPage | null = null
  try {
    const now = JSON.parse(await helper($, studio, ['ready']))
    page = now.page ?? now.making ?? null
  } catch {}
  await update($, readyAt, () => page)
}

// the studio's own tools, which move a stage under way on: what the band says may have changed
const STUDIO_TOOL = /studio\.mjs|render-frames\.mjs|sheets\.mjs|footage\.mjs/

/** Starts the studio's page server if needed and opens a page: beside the chat, or in the web browser. */
async function openPage($: EngineInterface, studio: string, path: string): Promise<void> {
  const url = (await helper($, studio, ['url', path])).split('\n').pop() ?? ''
  if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) {
    $.ui.toast(`Couldn't open the studio's pages. In Claude, run /video-studio:dashboard to see why.`)
    return
  }
  const beside = await $.mcp.call('Claude_Browser', 'preview_start', { url }).catch(() => null)
  if (beside && !beside.isError) return
  await $.process.run(['/usr/bin/open', url]).catch(() => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const studio = await findStudio($)
    await update($, studioAt, () => studio)
    if (studio) await checkReady($, studio)
    return started
  })

  // after each of Claude's own turns (not a subagent's), see what's waiting now: a new storyboard, a reviewed video
  on('turn.complete', async ($, e, next) => {
    const studio = await read($, studioAt)
    if (studio && e.agentId === undefined) $.clock.after(0, () => void checkReady($, studio).catch(() => {}))
    return next(e)
  })

  // after each studio tool Claude runs, see what it's making now ("Claude is making storyboard v3: make the frames")
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const studio = await read($, studioAt)
    if (studio && STUDIO_TOOL.test(String(e.command ?? ''))) $.clock.after(0, () => void checkReady($, studio).catch(() => {}))
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const studio = await read($, studioAt)
    const ready = await read($, readyAt)
    const shows = ready?.path ?? 'idle'
    if (!studio || e.props.hasSurvey || (await read($, dismissedAt)) === shows) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box key="studio-bar" flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
        <Text>{ready ? ready.text : 'Working on a video?'}</Text>
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Button
            key="open"
            variant="primary"
            label={ready ? ready.button : 'Open dashboard'}
            onPress={() => openPage($, studio, ready ? ready.path : '/')}
          />
          <Button key="dismiss" role="dismiss" label="Dismiss" onPress={() => update($, dismissedAt, () => shows)} />
        </Box>
      </Box>
    )
  })
}
