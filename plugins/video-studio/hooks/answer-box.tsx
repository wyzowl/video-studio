// Wyzowl Video Studio's answer box, in a session inside a studio: Claude's final message of a turn that did some work
// (used a tool) is drawn in a rounded box with a yellow border and a faint yellow ground, so after a long run of tool
// calls it's plain where the answer starts. A turn that was only a reply draws as usual, and so does every message
// before the final one. Outside a studio nothing changes.
// The final message is told by its text (turn.complete's answer), each answer's fingerprint a member of its own, so a
// new answer redraws its own message alone. The band (bar.tsx) finds the studio when the session starts.
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const studioAt = atom({ plugin: 'video-studio', key: 'studio' } as const, '')
// one member per boxed answer, by its fingerprint
const BOXED = { plugin: 'video-studio', key: 'boxed' } as const

const YELLOW = '#F9B336'
// the same yellow at 10%, where the surface paints with transparency (the terminal can't: there, the border alone)
const TINT = '#F9B3361A'

/** A short, stable name for a message's text: its length and a hash of it, whitespace evened out. */
function fingerprint(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim()
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return `${s.length.toString(36)}-${(h >>> 0).toString(36)}`
}

export const register: Register = on => {
  // did this turn do any work? (a module value: a reload mid-turn just leaves that one answer unboxed)
  let worked = false

  on('turn.start', ($, e, next) => {
    worked = false
    return next(e)
  })

  on('tool.call', ($, e, next) => {
    worked = true
    return next(e)
  }).catch(($, e, next) => next(e))

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
