// Character puppets: a flat picture of a character (a cut-out PNG, or an SVG drawn as one picture) bent by pins, so a
// head can tilt, an arm wave and a chest breathe while the rest of the drawing holds its shape. Copy this file into a
// video's assets/vendor/ and load it before the film's script; guides/design/characters.md says how to rig and move one.
//
// How it bends: a mesh of small triangles covers the drawing, following its outline, and each frame the pins' positions
// are met while every triangle stays as close to its own shape as it can (as-rigid-as-possible shape manipulation:
// Igarashi, Moscovich and Hughes, SIGGRAPH 2005, in its two steps: a fit that allows each triangle to turn and scale,
// then one that takes the scale out). Both steps are linear solves whose matrices depend only on the mesh and where the
// pins sit, so they're factored once and each frame is two quick solves: the same pose always gives the same picture.
//
//   const maya = await Puppet.load(document.getElementById("maya"), "assets/characters/maya.rig.json", { width: 520 });
//   maya.draw({ wave: 0.6 }, { head: [4] });   // pose weights, then extra turns (degrees) and moves (pixels)
//   maya.where("handR")                        // that pin's place now, in the container's CSS pixels
//
// The rig (a JSON file beside the art; every position in the art's own pixels, x right, y down):
//   art     the picture, relative to the rig file
//   size    [w, h]: the art's size in its own pixels (needed for an SVG; a PNG's is read from the file)
//   pins    { name: [x, y] }: points on the drawing that hold or move it
//   chains  { name: [pin, pin, …] }: joints from the body outwards (shoulder, elbow, hand). A chain's turns swing each
//           joint after the first round the one before it, carrying everything further out, so limbs keep their
//           length. Chains can start from a joint of another chain (an arm from the chest), never share a later joint.
//   stiff   [{ at: pin or [x, y], r }]: areas that keep their shape (a face, a held phone); k sets how stiff (20)
//   front   [{ at, r, depth }]: areas drawn on top of the rest (an arm that crosses the body); depth orders several
//   cells   triangles across the art's longer side (40); more follows a tight outline better, and costs more
//   pad     room round the art for parts that move outside it, as a share of its longer side (0.25)
//   poses   { name: { chain: [degrees, …], pin: [dx, dy] } }: key poses the film mixes by weight
// Turns are in degrees, positive clockwise on screen; a move carries the pin's own chain joints with it.
(function (root) {
  "use strict";

  // ───────── the mesh: cells over the art, split where the drawing inside them is in separate pieces ─────────

  /** A mesh over a W × H picture, from `mask`: the drawing sampled S × S in each cell of a cols × rows grid (1 where
      there's drawing). A cell holding two separate bits of drawing (a hand and the hip beside it) becomes two cells,
      each joined only to the bits its own drawing touches, so parts move apart where the drawing has a gap, however
      narrow. Each cell is two triangles; `parts` says which cell each pair is, and its mask tile if it shares one. */
  function makeMesh(W, H, cols, rows, mask, S) {
    const MW = cols * S, MH = rows * S;
    const solid = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && mask[y * MW + x] === 1;
    const lab = new Int32Array(MW * MH).fill(-1);
    const parts = [], cellParts = [];
    const queue = new Int32Array(S * S);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const list = [];
        for (let v = 0; v < S; v++)
          for (let u = 0; u < S; u++) {
            const x0 = i * S + u, y0 = j * S + v;
            if (!solid(x0, y0) || lab[y0 * MW + x0] >= 0) continue;
            const id = parts.length;
            parts.push({ i, j, tile: -1 });
            list.push(id);
            let head = 0, tail = 0;
            queue[tail++] = y0 * MW + x0;
            lab[y0 * MW + x0] = id;
            while (head < tail) {
              const k = queue[head++], x = k % MW, y = (k - x) / MW;
              for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                  const xx = x + dx, yy = y + dy;
                  if (xx < i * S || yy < j * S || xx >= i * S + S || yy >= j * S + S || !solid(xx, yy) || lab[yy * MW + xx] >= 0) continue;
                  lab[yy * MW + xx] = id;
                  queue[tail++] = yy * MW + xx;
                }
            }
          }
        cellParts.push(list);
      }
    // each part's four corners (top left, top right, bottom left, bottom right), joined where the drawing touches
    const up = Array.from({ length: parts.length * 4 }, (_, k) => k);
    const find = (k) => (up[k] === k ? k : (up[k] = find(up[k])));
    const join = (a, b) => (up[find(a)] = find(b));
    const at = (x, y) => lab[y * MW + x];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        if (i + 1 < cols)
          for (let v = 0; v < S; v++) {
            const y = j * S + v, a = at(i * S + S - 1, y);
            if (a < 0) continue;
            for (let d = -1; d <= 1; d++) {
              if (v + d < 0 || v + d >= S) continue;
              const b = at((i + 1) * S, y + d);
              if (b < 0) continue;
              join(4 * a + 1, 4 * b);
              join(4 * a + 3, 4 * b + 2);
            }
          }
        if (j + 1 < rows)
          for (let u = 0; u < S; u++) {
            const x = i * S + u, a = at(x, j * S + S - 1);
            if (a < 0) continue;
            for (let d = -1; d <= 1; d++) {
              if (u + d < 0 || u + d >= S) continue;
              const b = at(x + d, (j + 1) * S);
              if (b < 0) continue;
              join(4 * a + 2, 4 * b);
              join(4 * a + 3, 4 * b + 1);
            }
          }
        if (i + 1 < cols && j + 1 < rows) {
          const a = at(i * S + S - 1, j * S + S - 1), b = at((i + 1) * S, (j + 1) * S);
          if (a >= 0 && b >= 0) join(4 * a + 3, 4 * b);
          const c = at((i + 1) * S, j * S + S - 1), e = at(i * S + S - 1, (j + 1) * S);
          if (c >= 0 && e >= 0) join(4 * c + 2, 4 * e + 1);
        }
      }
    // one point per joined corner, numbered row by row so every equation stays near the diagonal
    const corner = (part, c) => [parts[part].i + (c & 1), parts[part].j + (c >> 1)];
    const classes = new Map();
    for (let k = 0; k < up.length; k++) {
      const r = find(k);
      if (!classes.has(r)) {
        const [gx, gy] = corner(k >> 2, k & 3);
        classes.set(r, { gx, gy, first: k });
      }
    }
    const sorted = [...classes.entries()].sort((a, b) => a[1].gy - b[1].gy || a[1].gx - b[1].gx || a[1].first - b[1].first);
    const index = new Map(sorted.map(([r], k) => [r, k]));
    const n = sorted.length;
    const rest = new Float64Array(2 * n);
    sorted.forEach(([, c], k) => {
      rest[2 * k] = (c.gx * W) / cols;
      rest[2 * k + 1] = (c.gy * H) / rows;
    });
    const tris = new Uint32Array(parts.length * 6);
    let band = 1;
    parts.forEach((p, q) => {
      const [a, b, c, d] = [0, 1, 2, 3].map((k) => index.get(find(4 * q + k)));
      p.v = [a, b, c, d];
      // the diagonals alternate, so the mesh bends the same way left and right
      tris.set((p.i + p.j) & 1 ? [a, b, d, a, d, c] : [a, b, c, b, d, c], 6 * q);
      band = Math.max(band, Math.max(a, b, c, d) - Math.min(a, b, c, d));
    });
    // which part each sample belongs to: in a split cell, the nearest bit of drawing (so a mask's edge falls in the
    // gap, never on the drawing)
    const owner = new Int32Array(MW * MH).fill(-1);
    const tiles = [];
    cellParts.forEach((list, c) => {
      if (!list.length) return;
      const i = c % cols, j = (c - i) / cols;
      let head = 0, tail = 0;
      for (let v = 0; v < S; v++)
        for (let u = 0; u < S; u++) {
          const k = (j * S + v) * MW + i * S + u;
          if (lab[k] >= 0) {
            owner[k] = lab[k];
            queue[tail++] = k;
          }
        }
      while (head < tail) {
        const k = queue[head++], x = k % MW, y = (k - x) / MW;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < i * S || yy < j * S || xx >= i * S + S || yy >= j * S + S) continue;
            const q = yy * MW + xx;
            if (owner[q] >= 0) continue;
            owner[q] = owner[k];
            queue[tail++] = q;
          }
      }
      if (list.length < 2) return;
      for (const id of list) {
        const t = new Uint8Array(S * S);
        for (let v = 0; v < S; v++) for (let u = 0; u < S; u++) t[v * S + u] = owner[(j * S + v) * MW + i * S + u] === id ? 255 : 0;
        parts[id].tile = tiles.length;
        tiles.push(t);
      }
    });
    // pieces of drawing that don't touch: each needs a pin of its own, or it stays where it is
    const pu = Array.from({ length: n }, (_, k) => k);
    const pf = (k) => (pu[k] === k ? k : (pu[k] = pf(pu[k])));
    for (let t = 0; t < tris.length; t += 3) {
      pu[pf(tris[t + 1])] = pf(tris[t]);
      pu[pf(tris[t + 2])] = pf(tris[t]);
    }
    const piece = new Int32Array(n), ids = new Map();
    for (let k = 0; k < n; k++) {
      const r = pf(k);
      if (!ids.has(r)) ids.set(r, ids.size);
      piece[k] = ids.get(r);
    }
    return { W, H, cols, rows, S, n, rest, tris, parts, tiles, owner, mask, band, piece, pieces: ids.size };
  }

  // ───────── banded symmetric solves (the mesh's rows keep every equation close to the diagonal) ─────────

  function Band(N, B) {
    const a = new Float64Array(N * (B + 1));
    const at = (i, j) => i * (B + 1) + (i - j); // i ≥ j, i − j ≤ B
    return {
      N, B,
      add(i, j, v) {
        if (i < j) [i, j] = [j, i];
        if (i - j > B) throw new Error(`puppet: a term outside the band (${i}, ${j})`);
        a[at(i, j)] += v;
      },
      factor() {
        for (let i = 0; i < N; i++)
          for (let j = Math.max(0, i - B); j <= i; j++) {
            let s = a[at(i, j)];
            for (let k = Math.max(0, i - B); k < j; k++) s -= a[at(i, k)] * a[at(j, k)];
            if (i === j) {
              if (!(s > 0)) throw new Error("puppet: the rig can't be solved (does every piece of the drawing have a pin?)");
              a[at(i, i)] = Math.sqrt(s);
            } else a[at(i, j)] = s / a[at(j, j)];
          }
      },
      solve(b) {
        const x = Float64Array.from(b);
        for (let i = 0; i < N; i++) {
          let s = x[i];
          for (let k = Math.max(0, i - B); k < i; k++) s -= a[at(i, k)] * x[k];
          x[i] = s / a[at(i, i)];
        }
        for (let i = N - 1; i >= 0; i--) {
          let s = x[i];
          for (let k = i + 1; k <= Math.min(N - 1, i + B); k++) s -= a[at(k, i)] * x[k];
          x[i] = s / a[at(i, i)];
        }
        return x;
      },
    };
  }

  // ───────── where a point sits on the mesh ─────────

  /** The triangle under (x, y) and the point's weights on its corners; off the drawing, the nearest triangle's
      closest point. `off` is how far the point is from the drawing, in pixels. */
  function locate(mesh, x, y) {
    const { rest: p, tris, W, H, cols, rows, S, owner, mask } = mesh;
    const MW = cols * S, MH = rows * S;
    const sx = Math.floor((x / W) * MW), sy = Math.floor((y / H) * MH);
    const inside = sx >= 0 && sy >= 0 && sx < MW && sy < MH;
    const part = inside ? owner[sy * MW + sx] : -1;
    if (part >= 0) {
      // how far from the drawing, if the point sits in a gap
      let off = 0;
      if (!mask[sy * MW + sx]) {
        off = Infinity;
        const R = 3 * S;
        for (let v = -R; v <= R; v++)
          for (let u = -R; u <= R; u++) {
            const xx = sx + u, yy = sy + v;
            if (xx >= 0 && yy >= 0 && xx < MW && yy < MH && mask[yy * MW + xx]) off = Math.min(off, Math.hypot(u * (W / MW), v * (H / MH)));
          }
      }
      for (const t of [2 * part, 2 * part + 1]) {
        const a = tris[3 * t], b = tris[3 * t + 1], c = tris[3 * t + 2];
        const w = bary(p[2 * a], p[2 * a + 1], p[2 * b], p[2 * b + 1], p[2 * c], p[2 * c + 1], x, y);
        if (w.every((q) => q >= -1e-9)) return { v: [a, b, c], w, off };
      }
    }
    let best = null;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t], b = tris[t + 1], c = tris[t + 2];
      const [u, v, w] = bary(p[2 * a], p[2 * a + 1], p[2 * b], p[2 * b + 1], p[2 * c], p[2 * c + 1], x, y);
      const cu = Math.max(0, u), cv = Math.max(0, v), cw = Math.max(0, w), s = cu + cv + cw || 1;
      const qx = (cu * p[2 * a] + cv * p[2 * b] + cw * p[2 * c]) / s, qy = (cu * p[2 * a + 1] + cv * p[2 * b + 1] + cw * p[2 * c + 1]) / s;
      const d = Math.hypot(qx - x, qy - y);
      if (!best || d < best.off) best = { v: [a, b, c], w: [cu / s, cv / s, cw / s], off: d };
    }
    return best;
  }

  function bary(ax, ay, bx, by, cx, cy, x, y) {
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-12) return [-1, -1, -1];
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
    return [u, v, 1 - u - v];
  }

  // ───────── the solver ─────────

  const PIN = 1e5; // how hard a pin holds, against a triangle's wish to keep its shape
  const EPS = 1e-7; // a whisper that holds a piece with no pin where it was drawn

  /** A solver for this mesh with pins at `pins` ([[x, y], …]); `stiff` areas weigh their triangles' shape more. */
  function makeSolver(mesh, pins, stiff = []) {
    const { n, rest: p, tris, band } = mesh;
    const T = tris.length / 3;
    const weight = new Float64Array(T).fill(1);
    for (const s of stiff)
      for (let t = 0; t < T; t++) {
        const [cx, cy] = centroid(p, tris, t);
        const d = Math.hypot(cx - s.x, cy - s.y);
        const f = d <= s.r ? 1 : d < s.r * 1.5 ? 1 - (d - s.r) / (s.r * 0.5) : 0;
        weight[t] += (s.k ?? 20) * f;
      }
    const at = pins.map(([x, y]) => locate(mesh, x, y));

    // step 1: each triangle may turn and scale (Igarashi's first step), unknowns x0, y0, x1, y1, …
    const B1 = 2 * band + 1;
    const M1 = Band(2 * n, B1);
    for (let t = 0; t < T; t++) {
      const v = [tris[3 * t], tris[3 * t + 1], tris[3 * t + 2]];
      for (let r = 0; r < 3; r++) {
        const a = v[r], b = v[(r + 1) % 3], c = v[(r + 2) % 3];
        const ex = p[2 * b] - p[2 * a], ey = p[2 * b + 1] - p[2 * a + 1], L = ex * ex + ey * ey;
        const dx = p[2 * c] - p[2 * a], dy = p[2 * c + 1] - p[2 * a + 1];
        const lx = (dx * ex + dy * ey) / L, ly = (dx * ey - dy * ex) / L;
        // c − a − lx (b − a) − ly · turn(b − a), with turn(x, y) = (y, −x): one row for x, one for y
        const rx = [[2 * c, 1], [2 * a, lx - 1], [2 * b, -lx], [2 * a + 1, ly], [2 * b + 1, -ly]];
        const ry = [[2 * c + 1, 1], [2 * a + 1, lx - 1], [2 * b + 1, -lx], [2 * a, -ly], [2 * b, ly]];
        for (const row of [rx, ry]) for (const [i, ci] of row) for (const [j, cj] of row) if (i >= j) M1.add(i, j, weight[t] * ci * cj);
      }
    }
    // step 2: each triangle keeps its size; x and y solve apart with one matrix
    const B2 = band;
    const M2 = Band(n, B2);
    for (let t = 0; t < T; t++) {
      const v = [tris[3 * t], tris[3 * t + 1], tris[3 * t + 2]];
      for (let r = 0; r < 3; r++) {
        const a = v[r], b = v[(r + 1) % 3], w = weight[t];
        M2.add(a, a, w);
        M2.add(b, b, w);
        M2.add(a, b, -w);
      }
    }
    for (const { v, w } of at)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          if (v[i] < v[j]) continue;
          M1.add(2 * v[i], 2 * v[j], PIN * w[i] * w[j]);
          M1.add(2 * v[i] + 1, 2 * v[j] + 1, PIN * w[i] * w[j]);
          M2.add(v[i], v[j], PIN * w[i] * w[j]);
        }
    for (let k = 0; k < n; k++) {
      M1.add(2 * k, 2 * k, EPS);
      M1.add(2 * k + 1, 2 * k + 1, EPS);
      M2.add(k, k, EPS);
    }
    M1.factor();
    M2.factor();

    /** The mesh's points for pins at `targets` ([[x, y], …], in the same order as the pins). */
    function solve(targets) {
      const b1 = new Float64Array(2 * n);
      for (let k = 0; k < 2 * n; k++) b1[k] = EPS * p[k];
      at.forEach(({ v, w }, i) => {
        for (let j = 0; j < 3; j++) {
          b1[2 * v[j]] += PIN * w[j] * targets[i][0];
          b1[2 * v[j] + 1] += PIN * w[j] * targets[i][1];
        }
      });
      const q = M1.solve(b1);
      // step 2: fit each triangle's own shape, turned, to where step 1 put it, then join the fits
      const bx = new Float64Array(n), by = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        bx[k] = EPS * p[2 * k];
        by[k] = EPS * p[2 * k + 1];
      }
      for (let t = 0; t < T; t++) {
        const v = [tris[3 * t], tris[3 * t + 1], tris[3 * t + 2]];
        const pcx = (p[2 * v[0]] + p[2 * v[1]] + p[2 * v[2]]) / 3, pcy = (p[2 * v[0] + 1] + p[2 * v[1] + 1] + p[2 * v[2] + 1]) / 3;
        const qcx = (q[2 * v[0]] + q[2 * v[1]] + q[2 * v[2]]) / 3, qcy = (q[2 * v[0] + 1] + q[2 * v[1] + 1] + q[2 * v[2] + 1]) / 3;
        let sd = 0, sc = 0;
        for (const k of v) {
          const px = p[2 * k] - pcx, py = p[2 * k + 1] - pcy, qx = q[2 * k] - qcx, qy = q[2 * k + 1] - qcy;
          sc += px * qx + py * qy;
          sd += px * qy - py * qx;
        }
        const h = Math.hypot(sc, sd) || 1, cs = sc / h, sn = sd / h;
        const fx = (k) => qcx + cs * (p[2 * k] - pcx) - sn * (p[2 * k + 1] - pcy);
        const fy = (k) => qcy + sn * (p[2 * k] - pcx) + cs * (p[2 * k + 1] - pcy);
        for (let r = 0; r < 3; r++) {
          const a = v[r], b = v[(r + 1) % 3], w = weight[t];
          const ex = fx(a) - fx(b), ey = fy(a) - fy(b);
          bx[a] += w * ex;
          bx[b] -= w * ex;
          by[a] += w * ey;
          by[b] -= w * ey;
        }
      }
      at.forEach(({ v, w }, i) => {
        for (let j = 0; j < 3; j++) {
          bx[v[j]] += PIN * w[j] * targets[i][0];
          by[v[j]] += PIN * w[j] * targets[i][1];
        }
      });
      const X = M2.solve(bx), Y = M2.solve(by);
      const out = new Float64Array(2 * n);
      for (let k = 0; k < n; k++) {
        out[2 * k] = X[k];
        out[2 * k + 1] = Y[k];
      }
      return out;
    }
    return { solve, at, weight };
  }

  function centroid(p, tris, t) {
    const a = tris[3 * t], b = tris[3 * t + 1], c = tris[3 * t + 2];
    return [(p[2 * a] + p[2 * b] + p[2 * c]) / 3, (p[2 * a + 1] + p[2 * b + 1] + p[2 * c + 1]) / 3];
  }

  /** How far each triangle is from its own shape: its longest edge's stretch or squash (1 is none) and whether it
      has folded over. */
  function strain(mesh, pos) {
    const { rest: p, tris } = mesh;
    const T = tris.length / 3, out = [];
    for (let t = 0; t < T; t++) {
      const v = [tris[3 * t], tris[3 * t + 1], tris[3 * t + 2]];
      let worst = 1;
      for (let r = 0; r < 3; r++) {
        const a = v[r], b = v[(r + 1) % 3];
        const l0 = Math.hypot(p[2 * a] - p[2 * b], p[2 * a + 1] - p[2 * b + 1]), l1 = Math.hypot(pos[2 * a] - pos[2 * b], pos[2 * a + 1] - pos[2 * b + 1]);
        const s = l1 / l0;
        if (Math.abs(Math.log(s)) > Math.abs(Math.log(worst))) worst = s;
      }
      const area = (q) => (q[2 * v[1]] - q[2 * v[0]]) * (q[2 * v[2] + 1] - q[2 * v[0] + 1]) - (q[2 * v[2]] - q[2 * v[0]]) * (q[2 * v[1] + 1] - q[2 * v[0] + 1]);
      out.push({ stretch: worst, folded: Math.sign(area(p)) !== Math.sign(area(pos)) });
    }
    return out;
  }

  // ───────── the rig: pins, chains and poses ─────────

  /** Checks a rig and works out each pin's place in its chains. Throws with a plain message if the rig can't work. */
  function readRig(rig) {
    const pins = rig.pins || {};
    const names = Object.keys(pins);
    if (!names.length) throw new Error("puppet: the rig has no pins");
    for (const n of names) if (!Array.isArray(pins[n]) || pins[n].length !== 2 || !pins[n].every(Number.isFinite)) throw new Error(`puppet: pin "${n}" needs [x, y]`);
    const chains = rig.chains || {};
    const parent = {};
    for (const [c, joints] of Object.entries(chains)) {
      if (c in pins) throw new Error(`puppet: "${c}" names both a pin and a chain`);
      if (!Array.isArray(joints) || joints.length < 2) throw new Error(`puppet: chain "${c}" needs two joints or more`);
      joints.forEach((j, k) => {
        if (!(j in pins)) throw new Error(`puppet: chain "${c}" names "${j}", which isn't a pin`);
        if (k === 0) return;
        if (j in parent && parent[j] !== joints[k - 1]) throw new Error(`puppet: "${j}" is a later joint of two chains`);
        parent[j] = joints[k - 1];
      });
    }
    // a loop would never end
    for (const n of names) {
      const seen = new Set([n]);
      for (let q = parent[n]; q; q = parent[q]) {
        if (seen.has(q)) throw new Error(`puppet: the chains through "${n}" go round in a loop`);
        seen.add(q);
      }
    }
    // parents before children
    const depth = (n) => (parent[n] ? 1 + depth(parent[n]) : 0);
    const order = [...names].sort((a, b) => depth(a) - depth(b));
    for (const [pose, values] of Object.entries(rig.poses || {})) for (const k of Object.keys(values)) if (!(k in pins) && !(k in chains)) throw new Error(`puppet: pose "${pose}" names "${k}", which is neither a pin nor a chain`);
    return { names, parent, order, chains };
  }

  /** Each pin's place for a pose: `weights` mixes the rig's poses ({ wave: 0.5 }), `extra` adds turns and moves of its
      own ({ armR: [20, -10], chest: [0, -3] }). */
  function posePins(rig, info, weights = {}, extra = {}) {
    const turn = {}, move = {};
    const addAll = (values, w) => {
      for (const [k, val] of Object.entries(values || {})) {
        if (k in info.chains) {
          const joints = info.chains[k];
          (Array.isArray(val) ? val : [val]).forEach((deg, i) => {
            const j = joints[i + 1];
            if (j) turn[j] = (turn[j] || 0) + w * deg;
          });
        } else if (k in rig.pins) {
          const m = move[k] || [0, 0];
          move[k] = [m[0] + w * (val[0] || 0), m[1] + w * (val[1] || 0)];
        }
      }
    };
    for (const [name, w] of Object.entries(weights || {})) {
      if (!w) continue;
      const pose = rig.poses?.[name];
      if (!pose) throw new Error(`puppet: there's no pose "${name}"`);
      addAll(pose, w);
    }
    addAll(extra, 1);
    const at = {}, angle = {};
    for (const n of info.order) {
      const [rx, ry] = rig.pins[n], m = move[n] || [0, 0], par = info.parent[n];
      if (!par) {
        at[n] = [rx + m[0], ry + m[1]];
        angle[n] = 0;
        continue;
      }
      const a = (angle[par] || 0) + ((turn[n] || 0) * Math.PI) / 180;
      const [px, py] = rig.pins[par], dx = rx - px, dy = ry - py, c = Math.cos(a), s = Math.sin(a);
      at[n] = [at[par][0] + c * dx - s * dy + m[0], at[par][1] + s * dx + c * dy + m[1]];
      angle[n] = a;
    }
    return at;
  }

  /** The order cells are drawn in: areas marked front draw last. */
  function depthOrder(mesh, front = []) {
    const P = mesh.parts.length, d = new Float64Array(P);
    for (const f of front)
      for (let q = 0; q < P; q++) {
        const cx = ((mesh.parts[q].i + 0.5) * mesh.W) / mesh.cols, cy = ((mesh.parts[q].j + 0.5) * mesh.H) / mesh.rows;
        if (Math.hypot(cx - f.x, cy - f.y) <= f.r) d[q] = Math.max(d[q], f.depth ?? 1);
      }
    return Array.from({ length: P }, (_, q) => q).sort((a, b) => d[a] - d[b] || a - b);
  }

  /** A rig's areas (stiff, front) with their centres as points: { at: "head" } or { at: [x, y] }. */
  function areas(rig, list) {
    return (list || []).map((a) => {
      const at = typeof a.at === "string" ? rig.pins[a.at] : a.at;
      if (!at) throw new Error(`puppet: an area is at "${a.at}", which isn't a pin`);
      return { x: at[0], y: at[1], r: a.r, k: a.k, depth: a.depth };
    });
  }

  /** Everything that doesn't need a browser: the mesh, the solver and the rig. `maskOf(cols, rows, S)` samples the
      drawing S × S in each cell (1 where there's drawing). */
  function prepare(rig, maskOf) {
    const info = readRig(rig);
    const [W, H] = rig.size;
    const across = rig.cells || 40;
    const cols = Math.max(2, Math.round((across * W) / Math.max(W, H))), rows = Math.max(2, Math.round((across * H) / Math.max(W, H)));
    // about two of the art's pixels a sample, so a gap that narrow still parts
    const S = Math.max(6, Math.min(16, Math.round(Math.max(W / cols, H / rows) / 2)));
    const mesh = makeMesh(W, H, cols, rows, maskOf(cols, rows, S), S);
    const names = info.names;
    const solver = makeSolver(mesh, names.map((k) => rig.pins[k]), areas(rig, rig.stiff));
    return {
      mesh, info, solver, names,
      /** The mesh's points for a pose. */
      shape(weights, extra) {
        const at = posePins(rig, info, weights, extra);
        return { pos: solver.solve(names.map((k) => at[k])), at };
      },
    };
  }

  // ───────── drawing, in the browser ─────────

  const VS = `#version 300 es
in vec2 aP; in vec2 aUV; in vec2 aM; uniform vec2 uBox; uniform vec2 uPad; out vec2 vUV; out vec2 vM;
void main() { vUV = aUV; vM = aM; vec2 c = (aP + uPad) / uBox * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;
  const FS = `#version 300 es
precision highp float; in vec2 vUV; in vec2 vM; uniform sampler2D uT; uniform sampler2D uM; out vec4 o;
void main() { o = texture(uT, vUV) * texture(uM, vM).r; }`;

  async function loadImage(url) {
    const img = new Image();
    img.decoding = "sync";
    img.src = url;
    await img.decode();
    return img;
  }

  /** The art sampled S × S in each cell: 1 where there's drawing. */
  function alphaMask(img) {
    return (cols, rows, S) => {
      const cw = cols * S, ch = rows * S;
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, cw, ch);
      const a = x.getImageData(0, 0, cw, ch).data;
      const m = new Uint8Array(cw * ch);
      for (let k = 0; k < m.length; k++) m[k] = a[4 * k + 3] > 6 ? 1 : 0;
      return m;
    };
  }

  /** A puppet drawn into `el` (an element the film places and sizes: the art's box). `opts.width` is that box's width
      in CSS pixels; `opts.res` draws more pixels than that, for a puppet the camera pushes in on. */
  async function create(el, rig, opts = {}) {
    rig = { ...rig };
    const base = opts.base || location.href;
    const url = new URL(rig.art, base).href;
    const img = await loadImage(url);
    if (!rig.size) rig.size = [img.naturalWidth, img.naturalHeight];
    if (!(rig.size[0] > 0 && rig.size[1] > 0)) throw new Error("puppet: the rig needs a size for this art ([w, h])");
    const [W, H] = rig.size;
    const width = opts.width || W, scale = (width / W) * (opts.res || 1);
    const pad = (rig.pad ?? 0.25) * Math.max(W, H);
    const P = prepare(rig, alphaMask(img));

    // the canvas covers the art's box and the pad round it
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((W + 2 * pad) * scale);
    canvas.height = Math.round((H + 2 * pad) * scale);
    const k = width / W;
    Object.assign(canvas.style, { position: "absolute", left: `${-pad * k}px`, top: `${-pad * k}px`, width: `${(W + 2 * pad) * k}px`, height: `${(H + 2 * pad) * k}px`, pointerEvents: "none" });
    Object.assign(el.style, { width: `${width}px`, height: `${(H * width) / W}px` });
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(canvas);

    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true, alpha: true });
    if (!gl) throw new Error("puppet: this browser has no WebGL2");
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    // the picture, at least as sharp as it's drawn (an SVG is drawn at that size first)
    const tw = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), Math.max(img.naturalWidth || W, Math.round(W * scale)));
    const th = Math.round((tw * H) / W);
    const src = document.createElement("canvas");
    src.width = tw;
    src.height = th;
    src.getContext("2d").drawImage(img, 0, 0, tw, th);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // each cell drawn with its own four corners, so a split cell's two halves can part; a split cell's mask keeps
    // each half to its own bit of drawing
    const M = P.mesh, parts = M.parts, S = M.S, TS = S + 2;
    const across = Math.ceil(Math.sqrt(M.tiles.length + 1));
    const AW = across * TS;
    const atlas = new Uint8Array(AW * AW);
    const putTile = (t, data) => {
      const ox = (t % across) * TS, oy = Math.floor(t / across) * TS;
      for (let v = -1; v <= S; v++)
        for (let u = -1; u <= S; u++) {
          const su = Math.min(S - 1, Math.max(0, u)), sv = Math.min(S - 1, Math.max(0, v));
          atlas[(oy + v + 1) * AW + ox + u + 1] = data ? data[sv * S + su] : 255;
        }
    };
    putTile(0, null);
    M.tiles.forEach((data, t) => putTile(t + 1, data));
    const mtex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mtex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, AW, AW, 0, gl.RED, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    const NV = parts.length * 4;
    const uv = new Float32Array(NV * 2), mv = new Float32Array(NV * 2), corner = new Uint32Array(NV);
    parts.forEach((q, i) => {
      const t = q.tile + 1, ox = (t % across) * TS + 1, oy = Math.floor(t / across) * TS + 1;
      for (let c = 0; c < 4; c++) {
        const gx = q.i + (c & 1), gy = q.j + (c >> 1), r = 4 * i + c;
        corner[r] = q.v[c];
        uv[2 * r] = gx / M.cols;
        uv[2 * r + 1] = gy / M.rows;
        mv[2 * r] = (ox + (c & 1) * S) / AW;
        mv[2 * r + 1] = (oy + (c >> 1) * S) / AW;
      }
    });
    const order = depthOrder(M, areas(rig, rig.front));
    const idx = new Uint32Array(parts.length * 6);
    order.forEach((q, i) => {
      const b = 4 * q;
      // the same diagonal as the solver's triangles
      idx.set((parts[q].i + parts[q].j) & 1 ? [b, b + 1, b + 3, b, b + 3, b + 2] : [b, b + 1, b + 2, b + 1, b + 3, b + 2], 6 * i);
    });
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attr = (name, data, usage) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      const l = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
      return buf;
    };
    const f32 = new Float32Array(NV * 2);
    const pbuf = attr("aP", f32, gl.DYNAMIC_DRAW);
    attr("aUV", uv, gl.STATIC_DRAW);
    attr("aM", mv, gl.STATIC_DRAW);
    const ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.uniform2f(gl.getUniformLocation(prog, "uBox"), W + 2 * pad, H + 2 * pad);
    gl.uniform2f(gl.getUniformLocation(prog, "uPad"), pad, pad);
    gl.uniform1i(gl.getUniformLocation(prog, "uT"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uM"), 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    let last = null;

    const puppet = {
      el, canvas, rig, mesh: P.mesh, names: P.names, pins: P.solver.at,
      /** Draws the pose: `weights` mixes the rig's poses, `extra` adds turns ({ chain: [deg, …] }) and moves
          ({ pin: [dx, dy] }). The same pose always draws the same picture. */
      draw(weights = {}, extra = {}) {
        const { pos, at } = P.shape(weights, extra);
        last = { pos, at };
        for (let r = 0; r < NV; r++) {
          f32[2 * r] = pos[2 * corner[r]];
          f32[2 * r + 1] = pos[2 * corner[r] + 1];
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, f32);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, mtex);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);
        return puppet;
      },
      /** Where a pin is in the last pose drawn, in the box's CSS pixels: for something the character holds or points
          at, placed by the film. */
      where(name) {
        const at = (last || P.shape()).at[name];
        if (!at) throw new Error(`puppet: there's no pin "${name}"`);
        return [at[0] * k, at[1] * k];
      },
      /** The mesh's points and each triangle's strain for a pose (for the check sheet). */
      measure(weights = {}, extra = {}) {
        const { pos, at } = P.shape(weights, extra);
        return { pos, at, strain: strain(P.mesh, pos) };
      },
    };
    puppet.draw();
    return puppet;
  }

  /** Loads a rig file and draws its puppet into `el`; the render waits for it. */
  function load(el, rigUrl, opts = {}) {
    const job = (async () => {
      const base = new URL(rigUrl, location.href).href;
      const res = await fetch(base);
      if (!res.ok) throw new Error(`puppet: ${rigUrl} couldn't be read (${res.status})`);
      return create(el, await res.json(), { ...opts, base });
    })();
    const hf = (root.__hf = root.__hf || {});
    hf.buildReady = hf.buildReady || {};
    hf.buildReady[`puppet:${el.id || rigUrl}`] = job;
    return job;
  }

  root.Puppet = { load, create, core: { makeMesh, makeSolver, readRig, posePins, prepare, strain, locate, Band } };
})(typeof window !== "undefined" ? window : globalThis);
