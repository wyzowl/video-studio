// The answer box (in hooks/index.tsx), run by `claude plugin test plugins/video-studio`.
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const STUDIO = '/Users/someone/Video Studio'
const SURFACES = ['terminal', 'desktop'] as const
const ANSWER = 'Storyboard v2 is ready.\n\nEvery scene starts Approved: mark any you want changed.'
const message = (text: string, extra: object = {}) =>
  ({ plugin: 'video-studio', component: 'AssistantMessage', props: { text, isFirstOfReply: true, ...extra } }) as const

/** The engine beneath: a session in a studio's video folder (or not), the studio helper with nothing waiting, a tool
    that answers, a turn's end that echoes the answer, and the engine's own drawing of a message. */
function world(on: On, inStudio = true) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: `${STUDIO}/videos/intro` }))
  on('fs.exists', ($, e) => ({ value: inStudio && e.path === `${STUDIO}/studio.json` }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: JSON.stringify({ page: null }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ isError: true as const, result: 'not run in a test' }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
}

const start = ($: Engine) => $.session.start({ cwd: `${STUDIO}/videos/intro`, surface: 'desktop', isInteractive: true })

/** A turn of the main loop: `tools` tool calls, then the answer. */
async function turn($: Engine, answer: string, tools: number) {
  const turnId = `t-${answer.length}-${tools}`
  await $.turn.start({ text: 'go', turnId })
  for (let i = 0; i < tools; i++) await $.tool.call({ tool: 'Bash', tool_use_id: `u${i}`, command: 'true', description: 'test' })
  await $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId, reason: 'answer' })
}

test("in a studio, a turn's final answer after work is boxed on every surface, and earlier messages aren't", async ($, on) => {
  world(on)
  mock.clock(on)
  await start($)
  await turn($, ANSWER, 2)
  for (const surface of SURFACES) {
    const final = await $.ui.mount({ ...message(ANSWER), surface })
    expect(await final.find({ key: 'answer-box' })).toBeDefined()
    expect(await final.find({ text: 'mark any you want changed' })).toBeDefined()
    await final.unmount()
    const earlier = await $.ui.mount({ ...message('Let me render the frames first.'), surface })
    expect(await earlier.find({ key: 'answer-box' })).toBeUndefined()
    await earlier.unmount()
  }
})

test('a reply with no work, and a summary of the text, are drawn as usual', async ($, on) => {
  world(on)
  mock.clock(on)
  await start($)
  await turn($, 'Yes, that works.', 0)
  const reply = await $.ui.mount({ ...message('Yes, that works.'), surface: 'desktop' })
  expect(await reply.find({ key: 'answer-box' })).toBeUndefined()
  expect(await reply.find({ text: 'Yes, that works.' })).toBeDefined()
  await reply.unmount()
  await turn($, ANSWER, 1)
  const summary = await $.ui.mount({ ...message(ANSWER, { isSummary: true }), surface: 'desktop' })
  expect(await summary.find({ key: 'answer-box' })).toBeUndefined()
})

test('outside a studio nothing is boxed', async ($, on) => {
  world(on, false)
  mock.clock(on)
  await start($)
  await turn($, ANSWER, 3)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...message(ANSWER), surface })
    expect(await ui.find({ key: 'answer-box' })).toBeUndefined()
    await ui.unmount()
  }
})
