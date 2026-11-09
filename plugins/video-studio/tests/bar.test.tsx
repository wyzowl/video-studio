// The band above Claude's message box (in hooks/index.tsx), run by `claude plugin test plugins/video-studio`.
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const STUDIO = '/Users/someone/Video Studio'
const SURFACES = ['terminal', 'desktop'] as const
const BAND = {
  plugin: 'video-studio',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 100, scroll: { offset: 0, bodyRows: 8 }, view: {} },
} as const
const STORYBOARD = { path: '/videos/intro/storyboard/v2/', text: 'Storyboard v2 of Intro is ready for your review', button: 'Open storyboard v2' }
const VIDEO = { path: '/videos/intro/review/v1/', text: 'Video v1 of Intro is ready for your review', button: 'Open video v1' }
// another video in the same studio, which other sessions work on
const LAUNCH = { path: '/videos/launch/script/v1/', text: 'Script v1 of Launch is ready for your review', button: 'Open script v1' }
const VIDEOS = ['intro', 'launch']

type Page = typeof STORYBOARD | null

type World = { waiting?: () => Page; making?: () => Page; inStudio?: boolean; root?: string; store?: Record<string, unknown> }

/**
 * The world beneath the plugin: a session in a studio's video folder (or its root, or no studio), the studio's video
 * folders, the plugin's store, the studio helper (whose `ready` answers what `waiting()` and `making()` return, among
 * the videos it's given, and whose `url` answers the page's address), macOS's `open`, and the engine's own empty band.
 * Returns what the helper ran, what `open` opened in the web browser and the store.
 */
function world(on: On, { waiting = () => null, making = () => null, inStudio = true, root = `${STUDIO}/videos/intro`, store = {} }: World = {}) {
  const runs: string[][] = []
  const opened: string[] = []
  const kept = new Map(Object.entries(store))
  on('store.get', ($, e) => ({ value: kept.get(e.key) }))
  on('store.set', ($, e) => (kept.set(e.key, e.value), { value: undefined }))
  on('store.delete', ($, e) => (kept.delete(e.key), { value: undefined }))
  on('store.keys', () => ({ value: [...kept.keys()] }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('session.root', () => ({ value: root }))
  on('session.id', () => ({ value: 'session-1' }))
  const files = new Set([`${STUDIO}/studio.json`, ...VIDEOS.map(v => `${STUDIO}/videos/${v}`)])
  on('fs.exists', ($, e) => ({ value: inStudio && files.has(e.path) }))
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', ($, e) => {
    const argv = [...e.argv]
    if (argv[0] === '/usr/bin/open') opened.push(argv[1])
    else runs.push(argv)
    const at = argv.indexOf('url')
    // `ready` looks only among the videos it's given
    const given = argv.flatMap((a, i) => (a === '--video' ? [argv[i + 1]] : []))
    const among = (page: Page) => (page && given.includes(page.path.split('/')[2]) ? page : null)
    const stdout = argv.includes('ready') ? JSON.stringify({ page: among(waiting()), making: among(making()) }) : at >= 0 ? `http://127.0.0.1:4747${argv[at + 1]}\n` : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.call', () => ({ isError: true as const, result: 'not run in a test' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine" />
  })
  return { runs, opened, kept }
}

const start = ($: Engine) => $.session.start({ cwd: `${STUDIO}/videos/intro`, surface: 'desktop', isInteractive: true })
const turnEnds = ($: Engine) => $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })

test('with nothing waiting, the band offers the dashboard on every surface', async ($, on) => {
  const { runs, opened } = world(on)
  mock.clock(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ text: 'Working on a video?' })).toBeDefined()
    expect((await ui.find({ key: 'open' }))?.text).toBe('Open dashboard')
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'open' })
  expect(runs.at(-1)).toEqual(expect.arrayContaining(['node', 'url', '/', '--studio', STUDIO]))
  expect(opened).toEqual(['http://127.0.0.1:4747/'])
})

test('a storyboard waiting for review gets its own words and button, which opens it in the web browser', async ($, on) => {
  const { opened } = world(on, { waiting: () => STORYBOARD })
  mock.clock(on)
  await start($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ text: STORYBOARD.text })).toBeDefined()
    expect((await ui.find({ key: 'open' }))?.text).toBe('Open storyboard v2')
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'open' })
  expect(opened).toEqual([`http://127.0.0.1:4747${STORYBOARD.path}`])
})

test('after a turn the band shows what is waiting now, and a dismissed band comes back for something new', async ($, on) => {
  let waiting: Page = null
  world(on, { waiting: () => waiting })
  const clock = mock.clock(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'dismiss' })
  expect(await ui.find({ key: 'open' })).toBeUndefined()
  // Claude shares a storyboard: after its turn the band offers it, though the dashboard band was dismissed
  waiting = STORYBOARD
  await turnEnds($)
  await clock.advance(0)
  expect((await ui.find({ key: 'open' }))?.text).toBe('Open storyboard v2')
  // the person reviews it and Claude shares the video
  waiting = VIDEO
  await turnEnds($)
  await clock.advance(0)
  expect((await ui.find({ key: 'open' }))?.text).toBe('Open video v1')
})

test('while Claude makes something the band says what, after each studio tool, and Watch opens its overview', async ($, on) => {
  const MAKING = { path: '/videos/intro/', text: 'Claude is making storyboard v3 of Intro: make the frames, 7 of 14', button: 'Watch' }
  let making: Page = null
  const { opened } = world(on, { making: () => making })
  const clock = mock.clock(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ key: 'open' }))?.text).toBe('Open dashboard')
  // Claude renders the storyboard's frames: once the tool has run, the band follows the work
  making = MAKING
  await $.tool.call({ tool: 'Bash', tool_use_id: 'u1', command: 'node /plugin/scripts/render-frames.mjs videos/intro/storyboard/v3/frames.html videos/intro/storyboard/v3/frames', description: 'frames' })
  await clock.advance(0)
  expect(await ui.find({ text: MAKING.text })).toBeDefined()
  await ui.press({ key: 'open' })
  expect(opened).toEqual(['http://127.0.0.1:4747/videos/intro/'])
  // any other command leaves the band as it is
  making = null
  await $.tool.call({ tool: 'Bash', tool_use_id: 'u2', command: 'ls', description: 'list' })
  await clock.advance(0)
  expect(await ui.find({ text: MAKING.text })).toBeDefined()
})

test('a page Claude shows opens nothing by itself: the link in its message is the way in', async ($, on) => {
  const { opened } = world(on, { waiting: () => STORYBOARD })
  const clock = mock.clock(on)
  await start($)
  await $.tool.call({ tool: 'Bash', tool_use_id: 'u1', command: 'node /plugin/scripts/studio.mjs show /videos/intro/storyboard/v2/', description: 'show' })
  await turnEnds($)
  await clock.advance(0)
  expect(opened).toEqual([])
})

test('outside a studio there is no band, and nothing runs', async ($, on) => {
  const { runs } = world(on, { waiting: () => STORYBOARD, inStudio: false })
  mock.clock(on)
  await start($)
  await turnEnds($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ text: /ready|Working on a video/ })).toBeUndefined()
    await ui.unmount()
  }
  expect(runs).toEqual([])
})

test("a session started at the studio's root offers the dashboard, whatever another session has waiting", async ($, on) => {
  const { runs } = world(on, { root: STUDIO, waiting: () => LAUNCH })
  const clock = mock.clock(on)
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ text: 'Working on a video?' })).toBeDefined()
  // with no video of its own yet, the band hasn't asked the helper anything
  expect(runs.filter(r => r.includes('ready'))).toEqual([])
  // Claude starts this session's video: the band follows it, and still not Launch's script
  await $.tool.call({ tool: 'Write', tool_use_id: 'u1', file_path: `${STUDIO}/videos/intro/BRIEF.md`, content: '# Intro' })
  await clock.advance(0)
  expect(runs.at(-1)).toEqual(expect.arrayContaining(['ready', '--video', 'intro']))
  expect(runs.at(-1)).not.toContain('launch')
  expect((await ui.find({ key: 'open' }))?.text).toBe('Open dashboard')
  // a command that only lists the videos, or names a folder that isn't a video, doesn't make them the session's
  await $.tool.call({ tool: 'Bash', tool_use_id: 'u2', command: 'ls videos/ videos/ghost/', description: 'list' })
  await clock.advance(0)
  expect(runs.at(-1)).not.toContain('ghost')
  // Claude then works on Launch in this session too: now its script is this session's to show
  await $.tool.call({ tool: 'Bash', tool_use_id: 'u3', command: 'node "/plugin/scripts/studio.mjs" progress launch script 1 write', description: 'progress' })
  await clock.advance(0)
  expect(runs.at(-1)).toEqual(expect.arrayContaining(['--video', 'intro', '--video', 'launch']))
  expect((await ui.find({ key: 'open' }))?.text).toBe('Open script v1')
})

test('a session picked up again remembers its videos, and long-idle sessions are forgotten', async ($, on) => {
  const DAY = 86400e3
  const { kept } = world(on, { root: STUDIO, waiting: () => LAUNCH, store: { 'session:session-1': { videos: ['launch'], at: 199 * DAY }, 'session:old': { videos: ['intro'], at: 100 * DAY } } })
  mock.clock(on, { now: 200 * DAY })
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ key: 'open' }))?.text).toBe('Open script v1')
  expect(kept.has('session:old')).toBe(false)
  // and this one counts as recent from now
  expect(kept.get('session:session-1')).toEqual({ videos: ['launch'], at: 200 * DAY })
})
