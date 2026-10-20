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

type Page = typeof STORYBOARD | null

/**
 * The world beneath the plugin: a session in a studio's video folder (or not), the studio helper (whose `ready`
 * answers what `waiting()` returns, and whose `url` answers the page's address), the browser pane, and the engine's
 * own empty band. Returns what the helper ran and what the pane opened.
 */
function world(on: On, waiting: () => Page = () => null, inStudio = true, making: () => Page = () => null) {
  const runs: string[][] = []
  const opened: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('session.root', () => ({ value: `${STUDIO}/videos/intro` }))
  on('fs.exists', ($, e) => ({ value: inStudio && e.path === `${STUDIO}/studio.json` }))
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', ($, e) => {
    const argv = [...e.argv]
    runs.push(argv)
    const at = argv.indexOf('url')
    const stdout = argv.includes('ready') ? JSON.stringify({ page: waiting(), making: making() }) : at >= 0 ? `http://127.0.0.1:4747${argv[at + 1]}\n` : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.call', () => ({ isError: true as const, result: 'not run in a test' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('mcp.call', ($, e) => {
    opened.push(`${e.server} ${e.tool} ${String(e.args.url)}`)
    return { value: { content: [], isError: false } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine" />
  })
  return { runs, opened }
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
  expect(opened).toEqual(['Claude_Browser preview_start http://127.0.0.1:4747/'])
})

test('a storyboard waiting for review gets its own words and button, which opens it beside the chat', async ($, on) => {
  const { opened } = world(on, () => STORYBOARD)
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
  expect(opened).toEqual([`Claude_Browser preview_start http://127.0.0.1:4747${STORYBOARD.path}`])
})

test('after a turn the band shows what is waiting now, and a dismissed band comes back for something new', async ($, on) => {
  let waiting: Page = null
  world(on, () => waiting)
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
  const { opened } = world(on, () => null, true, () => making)
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
  expect(opened).toEqual(['Claude_Browser preview_start http://127.0.0.1:4747/videos/intro/'])
  // any other command leaves the band as it is
  making = null
  await $.tool.call({ tool: 'Bash', tool_use_id: 'u2', command: 'ls', description: 'list' })
  await clock.advance(0)
  expect(await ui.find({ text: MAKING.text })).toBeDefined()
})

test('outside a studio there is no band, and nothing runs', async ($, on) => {
  const { runs } = world(on, () => STORYBOARD, false)
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
