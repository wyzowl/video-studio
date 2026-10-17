// Wyzowl Video Studio's hooks module (one per plugin): the band above Claude's message box (bar.tsx) and the answer
// box around Claude's final answer (answer-box.tsx), both only in a session inside a studio.
import type { Register } from 'claude-code'
import { register as band } from './bar.tsx'
import { register as answerBox } from './answer-box.tsx'

export const register: Register = (on, options) => {
  band(on, options)
  answerBox(on, options)
}
