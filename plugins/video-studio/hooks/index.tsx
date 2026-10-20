// Wyzowl Video Studio's hooks module (one per plugin), both parts only in a session inside a studio (a folder with
// studio.json): the band above Claude's message box, and the answer box around Claude's final answer.
//
// The band: when a script, storyboard or video is waiting for the person's review it says so, with a button that opens
// that page; while Claude makes something it says what, and the step it's on, with "Watch", which opens the video's
// overview (where it shows as it happens); otherwise "Working on a video?" with "Open dashboard". The button opens the
// page beside the chat (the desktop app's browser pane, opened if it's closed) or in the web browser. What's waiting is
// checked when the session starts, after each of Claude's turns and after each studio tool Claude runs (they mark the
// steps), never on a timer. Dismissed, the band stays away until something new is waiting.
//
// The answer box: Claude's final message of a turn that did some work (used a tool) is drawn in a rounded box with a
// yellow border and a faint yellow ground, so after a long run of tool calls it's plain where the answer starts. A turn
// that was only a reply draws as usual, and so does every message before the final one. The final message is told by
// its text (turn.complete's answer), each answer's fingerprint a member of its own, so a new answer redraws its own
// message alone.
//
// Everything that uses the engine (`$`) or registers a hook (`on`) is in this one file, as Anthropic's plugin directory
// asks of a mod.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'
import type { ReadyPage } from '../types'

const studioAt = atom({ plugin: 'video-studio', key: 'studio' } as const, '')
const readyAt = atom({ plugin: 'video-studio', key: 'ready' } as const, null as ReadyPage | null)
const dismissedAt = atom({ plugin: 'video-studio', key: 'dismissed' } as const, '')
// one member per boxed answer, by its fingerprint
const BOXED = { plugin: 'video-studio', key: 'boxed' } as const

// Homebrew's node on Apple silicon and Intel Macs, ahead of the system's own folders
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
// the studio's own tools, which move a stage under way on: what the band says may have changed
const STUDIO_TOOL = /studio\.mjs|render-frames\.mjs|sheets\.mjs|footage\.mjs/

const YELLOW = '#F9B336'
// the same yellow at 10%, where the surface paints with transparency (the terminal can't: there, the border alone)
const TINT = '#F9B3361A'

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

/** A short, stable name for a message's text: its length and a hash of it, whitespace evened out. */
function fingerprint(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim()
  let hash = 0x811c9dc5
  for (let i = 0; i < s.length; i++) hash = Math.imul(hash ^ s.charCodeAt(i), 0x01000193)
  return `${s.length.toString(36)}-${(hash >>> 0).toString(36)}`
}

export const register: Register = on => {
  // ───────── the band ─────────
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
    try {
      const studio = await read($, studioAt)
      if (studio && STUDIO_TOOL.test(String(e.command ?? ''))) $.clock.after(0, () => void checkReady($, studio).catch(() => {}))
    } catch {}
    return ran
  })

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

  // ───────── the answer box ─────────
  // did this turn do any work? (a module value: a reload mid-turn just leaves that one answer unboxed)
  let worked = false

  on('turn.start', ($, e, next) => {
    worked = false
    return next(e)
  })

  on('tool.call', ($, e, next) => {
    worked = true
    return next(e)
  })

  // a turn that ended with an answer: the main loop's, not a subagent's report (turn.start starts each one afresh)
  on('turn.complete', { reason: 'answer' }, async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      if (worked && e.answer.trim() && (await read($, studioAt))) await update($, { ...BOXED, id: fingerprint(e.answer) }, () => true)
      worked = false
    }
    return done
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary || !e.props.text.trim() || !(await read($, studioAt))) return next(e)
    if (!(await read($, { ...BOXED, id: fingerprint(e.props.text) }))) return next(e)
    const drawn = await next(e)
    const { Box } = $.ui.resolve(e)
    const ground = e.surface === 'terminal' ? {} : { backgroundColor: TINT }
    return (
      <Box key="answer-box" flexDirection="column" borderStyle="round" borderColor={YELLOW} paddingX={1} {...ground}>
        {drawn}
      </Box>
    )
  })
}
