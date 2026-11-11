// The character puppet's solver (scripts/puppet/puppet.js), run by `claude plugin test plugins/video-studio`.
import { expect, test } from 'claude-code/testing'
import '../scripts/puppet/puppet.js'

const { prepare, locate, strain } = (globalThis as any).Puppet.core
const full = (cols: number, rows: number, S: number) => new Uint8Array(cols * S * rows * S).fill(1)
const most = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]))
  return m
}
const BAR = { size: [400, 80], cells: 40, pins: { a: [20, 40], b: [200, 40], c: [380, 40] }, chains: { arm: ['a', 'b', 'c'] }, poses: { swing: { arm: [-45, 0] }, bend: { arm: [0, 90] } } }

test('with no pose, the drawing stays exactly as drawn', () => {
  const P = prepare(BAR, full)
  expect(most(P.shape().pos, P.mesh.rest)).toBeLessThan(1e-6)
})

test('pins turned together turn the whole drawing, unbent', () => {
  const P = prepare(BAR, full)
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6)
  const turn = ([x, y]: number[]) => [200 + c * (x - 200) - s * (y - 40), 40 + s * (x - 200) + c * (y - 40)]
  const pos = P.solver.solve(P.names.map((k: string) => turn((BAR.pins as any)[k])))
  let worst = 0
  for (let i = 0; i < P.mesh.n; i++) {
    const [x, y] = turn([P.mesh.rest[2 * i], P.mesh.rest[2 * i + 1]])
    worst = Math.max(worst, Math.hypot(pos[2 * i] - x, pos[2 * i + 1] - y))
  }
  expect(worst).toBeLessThan(0.05)
})

test('a chain swings its joints on arcs, keeping their distances', () => {
  const P = prepare(BAR, full)
  const { at, pos } = P.shape({ swing: 1 })
  expect(Math.abs(Math.hypot(at.b[0] - 20, at.b[1] - 40) - 180)).toBeLessThan(1e-6)
  expect(Math.abs(Math.hypot(at.c[0] - at.b[0], at.c[1] - at.b[1]) - 180)).toBeLessThan(1e-6)
  expect(strain(P.mesh, pos).every((q: any) => !q.folded && Math.abs(q.stretch - 1) < 0.01)).toBe(true)
})

test('two arms with a gap narrower than a cell between them move apart', () => {
  // a U: two arms joined at the left, 1.5 px apart, inside one row of cells
  const W = 420, H = 124
  const mask = (cols: number, rows: number, S: number) => {
    const mw = cols * S, mh = rows * S, m = new Uint8Array(mw * mh)
    for (let y = 0; y < mh; y++)
      for (let x = 0; x < mw; x++) {
        const X = ((x + 0.5) * W) / mw, Y = ((y + 0.5) * H) / mh
        m[y * mw + x] = X < 60 || Y < 55 || Y > 56.5 ? 1 : 0
      }
    return m
  }
  const U = prepare({ size: [W, H], cells: 40, pins: { root: [30, 62], top: [400, 30], bottom: [400, 94] }, poses: { lift: { top: [0, -120] } } }, mask)
  expect(U.mesh.tiles.length).toBeGreaterThan(0)
  const { pos } = U.shape({ lift: 1 })
  const moved = (x: number, y: number) => {
    const l = locate(U.mesh, x, y)
    const px = l.v.reduce((a: number, v: number, i: number) => a + l.w[i] * pos[2 * v], 0)
    const py = l.v.reduce((a: number, v: number, i: number) => a + l.w[i] * pos[2 * v + 1], 0)
    return Math.hypot(px - x, py - y)
  }
  expect(moved(250, 54)).toBeGreaterThan(40) // the upper arm, just above the gap, lifts
  expect(moved(250, 58)).toBeLessThan(15) // the lower arm, just below it, barely moves
})

test('a rig that names a missing pin says so', () => {
  expect(() => prepare({ ...BAR, chains: { arm: ['a', 'x'] } }, full)).toThrow('isn\'t a pin')
})
