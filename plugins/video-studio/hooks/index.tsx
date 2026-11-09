// Wyzowl Video Studio's hooks module (one per plugin), both parts only in a session inside a studio (a folder with
// studio.json): the band above Claude's message box, and the answer box around Claude's final answer.
//
// The band: when a script, storyboard or video is waiting for the person's review it says so, with a button that opens
// that page; while Claude makes something it says what, and the step it's on, with "Watch", which opens the video's
// overview (where it shows as it happens); otherwise "Working on a video?" with "Open dashboard". The button opens the
// page in the web browser, as the links in Claude's messages do. The band asks what's waiting when the session starts,
// after each of Claude's turns and after each studio tool Claude runs (they mark the steps), never on a timer.
// Dismissed, the band stays away until something new is waiting.
//
// The band only ever shows the session's own videos: the one whose folder the session started in, and each one Claude
// works on in it (a tool call that names a file in videos/<video>/, or a studio command run on <video>). It keeps their
// names in the plugin's store under the session's id, so a session picked up again still knows them; a session that
// hasn't touched a video yet offers the dashboard, whatever other sessions have waiting.
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
const videosAt = atom({ plugin: 'video-studio', key: 'videos' } as const, [] as string[])
// one member per boxed answer, by its fingerprint
const BOXED = { plugin: 'video-studio', key: 'boxed' } as const

// Homebrew's node on Apple silicon and Intel Macs, ahead of the system's own folders
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
// the studio's own tools, which move a stage under way on: what the band says may have changed
const STUDIO_TOOL = /studio\.mjs|render-frames\.mjs|sheets\.mjs|footage\.mjs/
// a video named in a tool call: a path inside its folder, or a studio command run on it by name
const VIDEO_PATH = /(?:^|[\s"'`=(/])videos\/([^/\s"'`]+)\//g
const VIDEO_COMMAND = /studio\.mjs["']?\s+(?:progress|check|draft|final|frames|map|words|move|stills|tidy)\s+["']?([^\s"'`;&|]+)/g
// the store's key for a session's videos, and how long one is kept after the session last touched a video
const SESSION_KEY = 'session:'
const KEEP_MS = 90 * 86400e3

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

/** What's waiting for the person's review now, or else what Claude is making (studio.mjs ready), among the session's
    own videos, into the band's state. With none yet there's nothing to ask. */
async function checkReady($: EngineInterface, studio: string): Promise<void> {
  const videos = await read($, videosAt)
  let page: ReadyPage | null = null
  if (videos.length)
    try {
      const now = JSON.parse(await helper($, studio, ['ready', ...videos.flatMap(v => ['--video', v])]))
      page = now.page ?? now.making ?? null
    } catch {}
  await update($, readyAt, () => page)
}

/** The videos of the studio a tool call names: folders in videos/ its command or paths point into, or a studio command
    run on one by name. Only names that are a video folder of this studio count. */
async function videosNamed($: EngineInterface, studio: string, call: Record<string, unknown>): Promise<string[]> {
  const text = ['command', 'file_path', 'path', 'notebook_path'].map(k => call[k]).filter(v => typeof v === 'string').join('\n')
  if (!text.includes('videos/') && !STUDIO_TOOL.test(text)) return []
  const names = new Set<string>()
  for (const m of text.matchAll(VIDEO_PATH)) names.add(m[1])
  for (const m of text.matchAll(VIDEO_COMMAND)) names.add(m[1])
  const found: string[] = []
  for (const raw of names) {
    let name = raw
    try {
      name = decodeURIComponent(raw)
    } catch {}
    if (!name.startsWith('.') && !name.includes('/') && (await $.fs.exists(`${studio}/videos/${name}`))) found.push(name)
  }
  return found
}

/** Adds videos to the session's own, in the band's state and the plugin's store; true when one was new. */
async function addVideos($: EngineInterface, names: string[]): Promise<boolean> {
  const had = await read($, videosAt)
  const added = names.filter(n => !had.includes(n))
  if (!added.length) return false
  const videos = [...had, ...added]
  await update($, videosAt, () => videos)
  await $.store.set(SESSION_KEY + (await $.session.id()), { videos, at: await $.clock.now() }).catch(() => {})
  return true
}

/** The session's videos from the store (a session picked up again), with the one whose folder it started in; and the
    store cleared of sessions not started or working on a video in 90 days. */
async function loadVideos($: EngineInterface, studio: string): Promise<void> {
  const now = await $.clock.now()
  const key = SESSION_KEY + (await $.session.id())
  try {
    for (const k of await $.store.keys()) {
      if (k === key || !k.startsWith(SESSION_KEY)) continue
      const kept = (await $.store.get(k)) as { at?: number } | undefined
      if (!(now - Number(kept?.at ?? 0) < KEEP_MS)) await $.store.delete(k)
    }
  } catch {}
  const kept = (await $.store.get(key).catch(() => undefined)) as { videos?: unknown } | undefined
  const videos = Array.isArray(kept?.videos) ? kept.videos.filter((v): v is string => typeof v === 'string') : []
  await update($, videosAt, () => videos)
  // picked up again, the session counts as recent from now
  if (videos.length) await $.store.set(key, { videos, at: now }).catch(() => {})
  const root = (await $.session.root()).replace(/\/+$/, '')
  const inVideo = root.startsWith(`${studio}/videos/`) ? root.slice(studio.length + 8).split('/')[0] : ''
  if (inVideo) await addVideos($, [inVideo])
}

/** Starts the studio's page server if needed and opens a page in the web browser. */
async function openPage($: EngineInterface, studio: string, path: string): Promise<void> {
  const url = (await helper($, studio, ['url', path])).split('\n').pop() ?? ''
  if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) {
    $.ui.toast(`Couldn't open the studio's pages. In Claude, run /video-studio:dashboard to see why.`)
    return
  }
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
  // did this turn do any work, for the answer box? (a module value: a reload mid-turn just leaves that one answer
  // unboxed)
  let worked = false

  // ───────── the band ─────────
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const studio = await findStudio($)
    await update($, studioAt, () => studio)
    if (studio) {
      await loadVideos($, studio)
      await checkReady($, studio)
    }
    return started
  })

  // after each of Claude's own turns (not a subagent's), see what's waiting now: a new storyboard, a reviewed video
  on('turn.complete', async ($, e, next) => {
    const studio = await read($, studioAt)
    if (studio && e.agentId === undefined) $.clock.after(0, () => void checkReady($, studio).catch(() => {}))
    return next(e)
  })

  // after each tool call, note any video of the studio it works on as the session's own; after a studio tool, or a
  // video new to the session, see what's waiting or being made now ("Claude is making storyboard v3: make the frames")
  // (the one tool.call hook, so it also marks the turn as one that did work, for the answer box)
  on('tool.call', async ($, e, next) => {
    worked = true
    const ran = await next(e)
    try {
      const studio = await read($, studioAt)
      if (studio) {
        const call = e as unknown as Record<string, unknown>
        const added = await addVideos($, await videosNamed($, studio, call))
        const tool = e.tool === 'Bash' && STUDIO_TOOL.test(String(call.command ?? ''))
        if (added || tool) $.clock.after(0, () => void checkReady($, studio).catch(() => {}))
      }
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
  // (a tool call marks the turn as one that did work: the band's tool.call hook above sets `worked`)
  on('turn.start', ($, e, next) => {
    worked = false
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
