// The browser half of tools/puppet.mjs: cutting a character out of a flat background, finding its ends and joints,
// listing an SVG's parts, and the rig's check sheet. Each returns plain data and PNGs (data URLs) for the tool to save.
// Runs in HyperFrames' headless Chrome beside puppet.js.
(function (root) {
  "use strict";
  const MAX = 1568; // a sheet is read at its own size (lib/sheet.mjs)
  const FONT = "600 13px -apple-system, Helvetica, Arial, sans-serif";

  const load = (url) =>
    new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(new Error("the picture couldn't be read"));
      i.src = url;
    });
  const canvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  const pixels = (img, w = img.naturalWidth, h = img.naturalHeight) => {
    const c = canvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    return { c, x, d: x.getImageData(0, 0, w, h), w, h };
  };
  const label = (x, text, px, py, { color = "#111", bg = "rgba(255,255,255,0.88)" } = {}) => {
    x.font = FONT;
    const w = x.measureText(text).width + 8;
    x.fillStyle = bg;
    x.fillRect(px, py - 9, w, 18);
    x.fillStyle = color;
    x.fillText(text, px + 4, py + 4.5);
  };

  /** Pieces of a mask joined side to side: a label per pixel and each piece's size. */
  function pieces(mask, w, h) {
    const lab = new Int32Array(w * h).fill(-1), sizes = [], stack = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || lab[s] >= 0) continue;
      const id = sizes.length;
      let top = 0, n = 0;
      stack[top++] = s;
      lab[s] = id;
      while (top) {
        const k = stack[--top];
        n++;
        const x = k % w, y = (k - x) / w;
        for (const q of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1])
          if (q >= 0 && mask[q] && lab[q] < 0) {
            lab[q] = id;
            stack[top++] = q;
          }
      }
      sizes.push(n);
    }
    return { lab, sizes };
  }

  // ───────── cut-out ─────────

  /** Takes a flat background away from a character: the background is the colour round the picture's edge, filled in
      from the edges so the same colour inside the figure stays; enclosed gaps of it (between an arm and the body) go
      too unless keepPockets. Edges keep a soft pixel, with the background's colour taken out of them. */
  async function cutout(url, { tolerance = 40, keepPockets = false, noBottom = false } = {}) {
    const img = await load(url);
    const { d, w, h } = pixels(img);
    const p = d.data;
    let clear = 0;
    for (let k = 3; k < p.length; k += 4) if (p[k] < 250) clear++;
    if (clear > w * h * 0.02) return { already: true, size: [w, h] };
    // the background: the middle colour round the edge
    const edge = [];
    for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) edge.push(y * w, y * w + w - 1);
    const med = (c) => {
      const v = edge.map((k) => p[4 * k + c]).sort((a, b) => a - b);
      return v[v.length >> 1];
    };
    const bg = [med(0), med(1), med(2)];
    const dist = (k) => Math.hypot(p[4 * k] - bg[0], p[4 * k + 1] - bg[1], p[4 * k + 2] - bg[2]);
    const near = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) near[k] = dist(k) < tolerance ? 1 : 0;
    const { lab, sizes } = pieces(near, w, h);
    const outside = new Set();
    for (let x = 0; x < w; x++) {
      if (lab[x] >= 0) outside.add(lab[x]);
      if (!noBottom && lab[(h - 1) * w + x] >= 0) outside.add(lab[(h - 1) * w + x]);
    }
    for (let y = 0; y < h; y++) for (const k of [y * w, y * w + w - 1]) if (lab[k] >= 0) outside.add(lab[k]);
    const pocket = Math.max(400, w * h * 0.0002);
    const field = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) {
      const l = lab[k];
      if (l >= 0 && (outside.has(l) || (!keepPockets && sizes[l] > pocket))) field[k] = 1;
    }
    // specks left in the field go
    const keep = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) keep[k] = field[k] ? 0 : 1;
    const kept = pieces(keep, w, h);
    const speck = Math.max(300, w * h * 0.0001);
    for (let k = 0; k < w * h; k++) if (keep[k] && kept.sizes[kept.lab[k]] < speck) keep[k] = 0;
    // a soft edge: the average of the 3 × 3 round each pixel, with the background's colour taken out
    const out = new ImageData(w, h), o = out.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let v = -1; v <= 1; v++)
          for (let u = -1; u <= 1; u++) {
            const xx = x + u, yy = y + v;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += keep[yy * w + xx];
            n++;
          }
        // a pixel on the edge is partly background: soften it, and take that much of the background's colour out
        const k = y * w + x;
        if (!keep[k]) continue;
        const A = Math.max(0.5, s / n);
        for (let c = 0; c < 3; c++) o[4 * k + c] = Math.max(0, Math.min(255, A < 0.999 ? (p[4 * k + c] - (1 - A) * bg[c]) / A : p[4 * k + c]));
        o[4 * k + 3] = Math.round(A * 255);
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    if (x1 < 0) throw new Error("nothing was left once the background went: try a lower --tolerance");
    const pad = 12;
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad);
    y1 = Math.min(h - 1, y1 + pad);
    const full = canvas(w, h);
    full.getContext("2d").putImageData(out, 0, 0);
    const cut = canvas(x1 - x0 + 1, y1 - y0 + 1);
    cut.getContext("2d").drawImage(full, -x0, -y0);
    // the sheet: the original, the cut-out on red (anything missing or left over shows) and on dark
    const tw = Math.floor((MAX - 4 * 8) / 3), s = Math.min(tw / cut.width, 900 / cut.height);
    const cw = cut.width * s, ch = cut.height * s;
    const sheet = canvas(3 * tw + 4 * 8, ch + 44), x = sheet.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, sheet.width, sheet.height);
    const tiles = [
      ["Original", null],
      ["Cut out, on red", "#ff2a2a"],
      ["Cut out, on dark", "#1b1d22"],
    ];
    tiles.forEach(([name, ground], i) => {
      const px = 8 + i * (tw + 8);
      if (ground) {
        x.fillStyle = ground;
        x.fillRect(px, 36, cw, ch);
        x.drawImage(cut, px, 36, cw, ch);
      } else x.drawImage(img, x0, y0, cut.width, cut.height, px, 36, cw, ch);
      label(x, name, px, 18);
    });
    return { png: cut.toDataURL("image/png"), sheet: sheet.toDataURL("image/png"), size: [cut.width, cut.height], bg, crop: [x0, y0, cut.width, cut.height] };
  }

  // ───────── ends and joints ─────────

  /** The drawing's thin middle line (Zhang and Suen's thinning, 1984) and where it ends and branches: the ends are
      usually the head, hands and feet; the branches the neck, shoulders and hips. */
  function skeleton(mask, w, h) {
    const m = Uint8Array.from(mask);
    const nb = (k) => {
      const x = k % w, y = (k - x) / w;
      const g = (u, v) => (x + u < 0 || y + v < 0 || x + u >= w || y + v >= h ? 0 : m[(y + v) * w + x + u]);
      return [g(0, -1), g(1, -1), g(1, 0), g(1, 1), g(0, 1), g(-1, 1), g(-1, 0), g(-1, -1)];
    };
    let changed = true;
    while (changed) {
      changed = false;
      for (const step of [0, 1]) {
        const del = [];
        for (let k = 0; k < w * h; k++) {
          if (!m[k]) continue;
          const P = nb(k), B = P.reduce((a, b) => a + b, 0);
          if (B < 2 || B > 6) continue;
          let A = 0;
          for (let i = 0; i < 8; i++) if (!P[i] && P[(i + 1) % 8]) A++;
          if (A !== 1) continue;
          if (step === 0 ? P[0] * P[2] * P[4] || P[2] * P[4] * P[6] : P[0] * P[2] * P[6] || P[0] * P[4] * P[6]) continue;
          del.push(k);
        }
        for (const k of del) m[k] = 0;
        if (del.length) changed = true;
      }
    }
    return m;
  }

  function skeletonPoints(m, w, h, minSpur) {
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
    const RING = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    // the crossing number: how many separate lines leave a pixel (1 at an end, 2 along a line, 3 or more at a branch)
    const crossings = (k) => {
      const x = k % w, y = (k - x) / w;
      let t = 0;
      for (let i = 0; i < 8; i++) if (!on(x + RING[i][0], y + RING[i][1]) && on(x + RING[(i + 1) % 8][0], y + RING[(i + 1) % 8][1])) t++;
      return t;
    };
    const next = (k, seen) => {
      const x = k % w, y = (k - x) / w;
      // side neighbours before corner ones, so a staircase is walked step by step
      for (const i of [0, 2, 4, 6, 1, 3, 5, 7]) {
        const q = (y + RING[i][1]) * w + x + RING[i][0];
        if (on(x + RING[i][0], y + RING[i][1]) && !seen.has(q)) return q;
      }
      return -1;
    };
    const ends = () => {
      const out = [];
      for (let k = 0; k < w * h; k++) if (m[k] && crossings(k) === 1) out.push(k);
      return out;
    };
    // short spurs off a branch are the thinning's noise: trim them
    for (let pass = 0; pass < 3; pass++) {
      let trimmed = false;
      for (const e of ends()) {
        if (!m[e]) continue;
        const path = [e], seen = new Set([e]);
        let cur = e, hit = false;
        while (path.length <= minSpur) {
          const q = next(cur, seen);
          if (q < 0) break;
          if (crossings(q) >= 3) {
            hit = true;
            break;
          }
          seen.add(q);
          path.push(q);
          cur = q;
        }
        if (hit) {
          for (const q of path) m[q] = 0;
          trimmed = true;
        }
      }
      if (!trimmed) break;
    }
    const joints = [];
    for (let k = 0; k < w * h; k++) if (m[k] && crossings(k) >= 3) joints.push(k);
    // a branch is often two or three pixels: one point each
    const merged = [];
    for (const k of joints) {
      const x = k % w, y = (k - x) / w;
      const near = merged.find((g) => Math.hypot(g.x / g.n - x, g.y / g.n - y) < 4);
      if (near) {
        near.x += x;
        near.y += y;
        near.n++;
      } else merged.push({ x, y, n: 1 });
    }
    return { ends: ends().map((k) => [k % w, Math.floor(k / w)]), joints: merged.map((g) => [g.x / g.n, g.y / g.n]) };
  }

  /** The ends and joints of a character, with a sheet: the art on a grid, its middle line, and each point numbered. */
  async function landmarks(url, { size } = {}) {
    const img = await load(url);
    const W = size?.[0] || img.naturalWidth, H = size?.[1] || img.naturalHeight;
    const s = 260 / Math.max(W, H), w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
    const { d } = pixels(img, w, h);
    const mask = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) mask[k] = d.data[4 * k + 3] > 128 ? 1 : 0;
    const parts = pieces(mask, w, h).sizes.filter((n) => n > w * h * 0.002).length;
    const sk = skeleton(mask, w, h);
    const pts = skeletonPoints(sk, w, h, Math.round(Math.max(w, h) * 0.06));
    const toArt = ([x, y]) => [Math.round((x + 0.5) / s), Math.round((y + 0.5) / s)];
    const ends = pts.ends.map((p, i) => ({ id: `E${i + 1}`, at: toArt(p) }));
    const joints = pts.joints.map((p, i) => ({ id: `J${i + 1}`, at: toArt(p) }));
    // the sheet
    const k = Math.min((MAX - 260) / W, 1200 / H), sw = W * k, sh = H * k;
    const sheet = canvas(sw + 260, Math.max(sh, 60 + 22 * (ends.length + joints.length)) + 20), x = sheet.getContext("2d");
    x.fillStyle = "#f2f2f2";
    x.fillRect(0, 0, sheet.width, sheet.height);
    x.globalAlpha = 0.55;
    x.drawImage(img, 10, 10, sw, sh);
    x.globalAlpha = 1;
    gridLines(x, 10, 10, W, H, k);
    x.fillStyle = "rgba(20,90,255,0.9)";
    for (let q = 0; q < w * h; q++) if (sk[q]) x.fillRect(10 + ((q % w) / s) * k, 10 + (Math.floor(q / w) / s) * k, Math.max(2, k / s), Math.max(2, k / s));
    const dot = (p, colour, id) => {
      const px = 10 + p.at[0] * k, py = 10 + p.at[1] * k;
      x.fillStyle = colour;
      x.beginPath();
      x.arc(px, py, 6, 0, 7);
      x.fill();
      label(x, id, px + 8, py, { color: colour });
    };
    ends.forEach((p) => dot(p, "#d4001a", p.id));
    joints.forEach((p) => dot(p, "#c25e00", p.id));
    let ly = 30;
    label(x, `${W} × ${H} px`, sw + 30, ly);
    for (const p of [...ends, ...joints]) {
      ly += 22;
      label(x, `${p.id}  ${p.at[0]}, ${p.at[1]}`, sw + 30, ly, { color: p.id[0] === "E" ? "#d4001a" : "#c25e00" });
    }
    return { size: [W, H], pieces: parts, ends, joints, sheet: sheet.toDataURL("image/png") };
  }

  /** A grid every 100 of the art's pixels (50 on a small one), numbered, to read places from. */
  function gridLines(x, ox, oy, W, H, k) {
    const step = Math.max(W, H) > 800 ? 100 : 50;
    x.strokeStyle = "rgba(0,0,0,0.18)";
    x.lineWidth = 1;
    x.font = "500 10px -apple-system, Helvetica, Arial, sans-serif";
    x.fillStyle = "rgba(0,0,0,0.55)";
    for (let v = 0; v <= W; v += step) {
      x.beginPath();
      x.moveTo(ox + v * k + 0.5, oy);
      x.lineTo(ox + v * k + 0.5, oy + H * k);
      x.stroke();
      x.fillText(String(v), ox + v * k + 2, oy + 10);
    }
    for (let v = 0; v <= H; v += step) {
      x.beginPath();
      x.moveTo(ox, oy + v * k + 0.5);
      x.lineTo(ox + W * k, oy + v * k + 0.5);
      x.stroke();
      x.fillText(String(v), ox + 2, oy + v * k - 2);
    }
  }

  // ───────── an SVG's parts ─────────

  const SHAPES = "path,rect,circle,ellipse,polygon,polyline,line,text,image,use";

  /** An element's box in the SVG's own units, with each shape's stroke (getBBox leaves strokes out). */
  function boxOf(el, rootM) {
    const shapes = el.matches(SHAPES) ? [el] : [...el.querySelectorAll(SHAPES)];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const sh of shapes) {
      let b;
      try {
        b = sh.getBBox();
      } catch {
        continue;
      }
      const cs = getComputedStyle(sh);
      const sw = cs.stroke && cs.stroke !== "none" ? parseFloat(cs.strokeWidth) / 2 || 0 : 0;
      const m = rootM.multiply(sh.getScreenCTM());
      for (const [px, py] of [[b.x - sw, b.y - sw], [b.x + b.width + sw, b.y - sw], [b.x - sw, b.y + b.height + sw], [b.x + b.width + sw, b.y + b.height + sw]]) {
        const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
        x0 = Math.min(x0, X);
        y0 = Math.min(y0, Y);
        x1 = Math.max(x1, X);
        y1 = Math.max(y1, Y);
      }
    }
    return x1 > x0 ? [x0, y0, x1 - x0, y1 - y0].map((v) => Math.round(v)) : null;
  }

  /** The groups and named shapes of an SVG, with their boxes in the SVG's own units, and a sheet that outlines each. */
  async function parts(svgText) {
    const host = document.createElement("div");
    host.innerHTML = svgText;
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("that isn't an SVG");
    const vb = svg.viewBox?.baseVal;
    const W = vb?.width || parseFloat(svg.getAttribute("width")) || 1000, H = vb?.height || parseFloat(svg.getAttribute("height")) || 1000;
    Object.assign(host.style, { position: "absolute", left: "0", top: "0", width: `${W}px`, height: `${H}px` });
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    document.body.appendChild(host);
    const rootM = svg.getScreenCTM().inverse();
    const list = [];
    const walk = (el, depth) => {
      for (const c of el.children) {
        const tag = c.tagName.toLowerCase();
        if (["defs", "style", "title", "desc", "clippath", "mask", "lineargradient", "radialgradient", "symbol", "metadata"].includes(tag)) continue;
        if (typeof c.getBBox !== "function") continue;
        const named = c.id || c.getAttribute("data-name") || c.getAttribute("inkscape:label");
        if (tag === "g" || named) {
          const box = boxOf(c, rootM);
          if (box) list.push({ id: `P${list.length + 1}`, name: named || "", tag, depth, shapes: c.querySelectorAll(SHAPES).length || 1, box });
        }
        if (tag === "g") walk(c, depth + 1);
      }
    };
    walk(svg, 0);
    host.remove();
    const img = await load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`);
    const k = Math.min((MAX - 320) / W, 1200 / H), sw = W * k, sh = H * k;
    const sheet = canvas(sw + 320, Math.max(sh + 20, 40 + 20 * list.length)), x = sheet.getContext("2d");
    x.fillStyle = "#f2f2f2";
    x.fillRect(0, 0, sheet.width, sheet.height);
    x.drawImage(img, 10, 10, sw, sh);
    const hues = ["#d4001a", "#0058d4", "#008a3a", "#b05e00", "#8a00b0", "#007a8a"];
    list.forEach((p, i) => {
      const c = hues[i % hues.length];
      x.strokeStyle = c;
      x.lineWidth = 1.5;
      x.strokeRect(10 + p.box[0] * k, 10 + p.box[1] * k, p.box[2] * k, p.box[3] * k);
      label(x, p.id, 12 + p.box[0] * k, 20 + p.box[1] * k, { color: c });
      label(x, `${"  ".repeat(p.depth)}${p.id} ${p.name || `<${p.tag}>`} · ${p.shapes}`, sw + 24, 24 + 20 * i, { color: c });
    });
    return { size: [W, H], parts: list, sheet: sheet.toDataURL("image/png") };
  }

  // ───────── the rig's check ─────────

  const STRETCH = 1.45; // past this (or its inverse), a triangle reads as stretched or squashed

  /** Every problem a rig would show in the film, and a sheet: the rest pose with its pins, chains and areas, then each
      pose with anything stretched, squashed or folded over outlined in red. */
  async function check(rig, { tile = 360 } = {}) {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const pp = await Puppet.create(el, rig, { width: tile, base: location.href });
    const { mesh } = pp, W = pp.rig.size[0], H = pp.rig.size[1], k = tile / W;
    const pad = (pp.rig.pad ?? 0.25) * Math.max(W, H);
    const cell = Math.max(W / mesh.cols, H / mesh.rows);
    const problems = [];
    // pins off the drawing, and pieces with no pin
    pp.names.forEach((n, i) => {
      if (pp.pins[i].off > cell) problems.push(`Pin "${n}" is ${Math.round(pp.pins[i].off)} px off the drawing: it holds the nearest edge instead. Move it onto the drawing.`);
    });
    const held = new Set(pp.pins.flatMap((p) => p.v.map((v) => mesh.piece[v])));
    const pieceSize = new Array(mesh.pieces).fill(0);
    for (let v = 0; v < mesh.n; v++) pieceSize[mesh.piece[v]]++;
    pieceSize.forEach((n, i) => {
      if (held.has(i)) return;
      let x = 0, y = 0, c = 0;
      for (let v = 0; v < mesh.n; v++)
        if (mesh.piece[v] === i) {
          x += mesh.rest[2 * v];
          y += mesh.rest[2 * v + 1];
          c++;
        }
      problems.push(`A piece of the drawing round ${Math.round(x / c)}, ${Math.round(y / c)} doesn't touch the rest and has no pin: it stays where it's drawn. Give it a pin, or leave it still on purpose.`);
    });
    const poses = Object.keys(pp.rig.poses || {});
    const shots = [{ name: "Rest", weights: {} }, ...poses.map((p) => ({ name: p, weights: { [p]: 1 } }))];
    const results = [];
    for (const s of shots) {
      const m = pp.measure(s.weights);
      pp.draw(s.weights);
      const img = canvas(pp.canvas.width, pp.canvas.height);
      img.getContext("2d").drawImage(pp.canvas, 0, 0);
      const bad = m.strain.map((q, t) => ({ t, ...q })).filter((q) => q.folded || q.stretch > STRETCH || q.stretch < 1 / STRETCH);
      if (s.name !== "Rest" && bad.length) {
        // name the place by its nearest pin
        const near = new Map();
        for (const b of bad) {
          const [cx, cy] = centre(mesh.rest, mesh.tris, b.t);
          let best = null;
          for (const n of pp.names) {
            const d = Math.hypot(pp.rig.pins[n][0] - cx, pp.rig.pins[n][1] - cy);
            if (!best || d < best.d) best = { n, d };
          }
          const e = near.get(best.n) || { folded: 0, stretched: 0, worst: 1 };
          if (b.folded) e.folded++;
          else e.stretched++;
          if (Math.abs(Math.log(b.stretch)) > Math.abs(Math.log(e.worst))) e.worst = b.stretch;
          near.set(best.n, e);
        }
        for (const [n, e] of near) problems.push(`Pose "${s.name}": near "${n}", ${e.folded ? `${e.folded} triangle${e.folded > 1 ? "s" : ""} fold over` : ""}${e.folded && e.stretched ? " and " : ""}${e.stretched ? `${e.stretched} ${e.worst > 1 ? "stretch" : "squash"} to ${e.worst.toFixed(2)}×` : ""}.`);
      }
      results.push({ ...s, img, m, bad });
    }
    // the sheet: tiles of the canvas (art and pad), four to a row
    const cw = pp.canvas.width, ch = pp.canvas.height, per = Math.max(1, Math.min(4, Math.floor((MAX - 8) / (cw + 8))));
    const rows = Math.ceil(results.length / per);
    const sheet = canvas(Math.min(MAX, per * (cw + 8) + 8), rows * (ch + 30) + 8), x = sheet.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, sheet.width, sheet.height);
    const toTile = (ox, oy, [px, py]) => [ox + (px + pad) * k, oy + (py + pad) * k];
    results.forEach((r, i) => {
      const ox = 8 + (i % per) * (cw + 8), oy = 8 + Math.floor(i / per) * (ch + 30) + 22;
      x.fillStyle = "#ebebeb";
      x.fillRect(ox, oy, cw, ch);
      x.strokeStyle = "rgba(0,0,0,0.25)";
      x.setLineDash([4, 4]);
      x.strokeRect(ox + pad * k, oy + pad * k, W * k, H * k);
      x.setLineDash([]);
      x.drawImage(r.img, ox, oy);
      if (i === 0) {
        for (const a of pp.rig.stiff || []) area(x, toTile(ox, oy, typeof a.at === "string" ? pp.rig.pins[a.at] : a.at), a.r * k, "rgba(0,88,212,0.18)", "#0058d4");
        for (const a of pp.rig.front || []) area(x, toTile(ox, oy, typeof a.at === "string" ? pp.rig.pins[a.at] : a.at), a.r * k, "rgba(0,138,58,0.14)", "#008a3a");
      }
      // folded or stretched triangles
      x.strokeStyle = "#e00000";
      x.lineWidth = 1.5;
      for (const b of r.bad) {
        const t = b.t, v = [mesh.tris[3 * t], mesh.tris[3 * t + 1], mesh.tris[3 * t + 2]];
        x.beginPath();
        v.forEach((q, j) => {
          const [px, py] = toTile(ox, oy, [r.m.pos[2 * q], r.m.pos[2 * q + 1]]);
          j ? x.lineTo(px, py) : x.moveTo(px, py);
        });
        x.closePath();
        x.stroke();
      }
      // chains, then pins
      x.strokeStyle = "rgba(255,120,0,0.9)";
      x.lineWidth = 2;
      for (const joints of Object.values(pp.rig.chains || {})) {
        x.beginPath();
        joints.forEach((j, q) => {
          const [px, py] = toTile(ox, oy, r.m.at[j]);
          q ? x.lineTo(px, py) : x.moveTo(px, py);
        });
        x.stroke();
      }
      for (const n of pp.names) {
        const [px, py] = toTile(ox, oy, r.m.at[n]);
        x.fillStyle = "#ff7800";
        x.beginPath();
        x.arc(px, py, 4, 0, 7);
        x.fill();
        x.strokeStyle = "#fff";
        x.lineWidth = 1.5;
        x.stroke();
        if (i === 0) label(x, n, px + 6, py, { color: "#a34700" });
      }
      label(x, r.name === "Rest" ? "Rest: pins, chains, stiff (blue) and front (green) areas" : `${r.name}${r.bad.length ? `: ${r.bad.length} triangles outlined` : ""}`, ox, oy - 12, { bg: "transparent", color: r.bad.length ? "#c00000" : "#111" });
    });
    el.remove();
    return { size: [W, H], pins: pp.names.length, triangles: mesh.tris.length / 3, pieces: mesh.pieces, poses, problems, sheet: sheet.toDataURL("image/png") };
  }

  function area(x, [px, py], r, fill, line) {
    x.fillStyle = fill;
    x.strokeStyle = line;
    x.lineWidth = 1;
    x.beginPath();
    x.arc(px, py, r, 0, 7);
    x.fill();
    x.stroke();
  }

  function centre(p, tris, t) {
    const a = tris[3 * t], b = tris[3 * t + 1], c = tris[3 * t + 2];
    return [(p[2 * a] + p[2 * b] + p[2 * c]) / 3, (p[2 * a + 1] + p[2 * b + 1] + p[2 * c + 1]) / 3];
  }

  root.PuppetTools = { cutout, landmarks, parts, check };
})(window);
