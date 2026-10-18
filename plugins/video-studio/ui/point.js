// "Point at it": on a paused video or a storyboard frame, Box and Arrow buttons on the picture; drag to draw, then
// write the note in the box that opens beside the drawing. The note keeps the shape (fractions of the picture: x and y
// from its top-left) and a picture of that moment with the mark drawn on it, so Claude sees exactly what's meant.
// The video review page (ui/review.js) and the storyboard's frame viewer (ui/page.js) use it through window.StudioPoint.
(() => {
  const YELLOW = "#f9b336";
  const SVG = "http://www.w3.org/2000/svg";
  const round = (n) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
  const el = (tag, attrs = {}, ns = null) => {
    const node = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };

  /** A shape's outline in a w × h space: a box as a rounded rectangle, an arrow as a line with its head. */
  function drawShape(svg, shape, w, h, { ghost = false } = {}) {
    const g = el("g", { class: `point_shape${ghost ? " point_shape--ghost" : ""}` }, SVG);
    if (shape.box) {
      const { x, y, w: bw, h: bh } = shape.box;
      g.append(el("rect", { x: x * w, y: y * h, width: bw * w, height: bh * h, rx: Math.min(w, h) * 0.008 }, SVG));
    } else if (shape.arrow) {
      const [x1, y1] = shape.arrow.from;
      const [x2, y2] = shape.arrow.to;
      const ax = x2 * w;
      const ay = y2 * h;
      const angle = Math.atan2(ay - y1 * h, ax - x1 * w);
      const size = Math.max(12, Math.min(w, h) * 0.035);
      const head = [angle - 0.45, angle + 0.45].map((a) => `${ax - size * Math.cos(a)},${ay - size * Math.sin(a)}`);
      g.append(el("line", { x1: x1 * w, y1: y1 * h, x2: ax, y2: ay }, SVG), el("polygon", { points: `${ax},${ay} ${head.join(" ")}` }, SVG));
    }
    svg.append(g);
    return g;
  }

  /** The picture of that moment with the mark drawn on it: a JPEG, at most 1280 px wide. */
  function capture(source, shape) {
    const sw = source.videoWidth || source.naturalWidth;
    const sh = source.videoHeight || source.naturalHeight;
    if (!sw || !sh) return null;
    const scale = Math.min(1, 1280 / sw);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = canvas.getContext("2d");
    try {
      ctx.drawImage(source, 0, 0, w, h);
    } catch {
      return null;
    }
    const line = Math.max(4, Math.round(w / 240));
    const stroke = (path) => {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = line + 4;
      path();
      ctx.stroke();
      ctx.strokeStyle = YELLOW;
      ctx.lineWidth = line;
      path();
      ctx.stroke();
    };
    if (shape.box) {
      const { x, y, w: bw, h: bh } = shape.box;
      stroke(() => {
        ctx.beginPath();
        ctx.roundRect(x * w, y * h, bw * w, bh * h, Math.min(w, h) * 0.008);
      });
    } else if (shape.arrow) {
      const [x1, y1] = shape.arrow.from;
      const [x2, y2] = shape.arrow.to;
      const angle = Math.atan2((y2 - y1) * h, (x2 - x1) * w);
      const size = Math.max(14, Math.min(w, h) * 0.04);
      stroke(() => {
        ctx.beginPath();
        ctx.moveTo(x1 * w, y1 * h);
        ctx.lineTo(x2 * w, y2 * h);
        for (const a of [angle - 0.45, angle + 0.45]) {
          ctx.moveTo(x2 * w, y2 * h);
          ctx.lineTo(x2 * w - size * Math.cos(a), y2 * h - size * Math.sin(a));
        }
      });
    }
    return { src: canvas.toDataURL("image/jpeg", 0.85), width: w, height: h };
  }

  /** A close-up of a pointed note's picture, around its mark (an SVG that crops the picture by its viewBox). */
  function thumb(src, shape, ratio = 16 / 9) {
    const W = 1000;
    const H = W / ratio;
    let [x0, y0, x1, y1] = shape.box ? [shape.box.x, shape.box.y, shape.box.x + shape.box.w, shape.box.y + shape.box.h] : [Math.min(shape.arrow.from[0], shape.arrow.to[0]), Math.min(shape.arrow.from[1], shape.arrow.to[1]), Math.max(shape.arrow.from[0], shape.arrow.to[0]), Math.max(shape.arrow.from[1], shape.arrow.to[1])];
    // the mark with room around it, never less than a third of the picture across
    const padX = Math.max((x1 - x0) * 0.3, 0.06);
    const padY = Math.max((y1 - y0) * 0.3, 0.06);
    x0 -= padX;
    x1 += padX;
    y0 -= padY;
    y1 += padY;
    const grow = (a, b, min) => {
      const c = (a + b) / 2;
      const half = Math.max(b - a, min) / 2;
      return [c - half, c + half];
    };
    [x0, x1] = grow(x0, x1, 0.34);
    [y0, y1] = grow(y0, y1, 0.34);
    const fit = (a, b) => (a < 0 ? [0, b - a] : b > 1 ? [a - (b - 1), 1] : [a, b]);
    [x0, x1] = fit(x0, x1).map((v) => Math.min(1, Math.max(0, v)));
    [y0, y1] = fit(y0, y1).map((v) => Math.min(1, Math.max(0, v)));
    const svg = el("svg", { class: "point_thumb", viewBox: `${x0 * W} ${y0 * H} ${(x1 - x0) * W} ${(y1 - y0) * H}`, preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": shape.box ? "What the box points at" : "What the arrow points at" }, SVG);
    svg.style.aspectRatio = `${Math.min(4, Math.max(0.6, ((x1 - x0) * W) / ((y1 - y0) * H)))}`;
    svg.append(el("image", { href: src, x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none" }, SVG));
    return svg;
  }

  /**
   * Point at it on a picture. `host` is the box the picture fills (positioned, the size of the picture); `source()`
   * the video or image to capture; `when()` is false while it can't be pointed at (a video playing); `label()` names
   * the moment ("Note at 00:12.4"); `onAdd({ shape, text, picture })` takes the note. Answers { start(tool), show(shape),
   * clear(), refresh() }.
   */
  function attach({ host, source, when = () => true, label = () => "Your note", onAdd, addLabel = "Add note" }) {
    const tools = el("div", { class: "point_tools", role: "group", "aria-label": "Point at something in the picture" });
    for (const [tool, mark, name] of [
      ["box", "▭", "Box"],
      ["arrow", "↗", "Arrow"],
    ]) {
      const b = el("button", { type: "button", class: "point_tool", "data-point-tool": tool, "aria-label": `Point at something with ${tool === "box" ? "a box" : "an arrow"}` });
      b.innerHTML = `<span aria-hidden="true">${mark}</span> ${name}`;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        start(tool);
      });
      tools.append(b);
    }
    host.append(tools);
    let layer = null;
    let ghost = null;

    const refresh = () => host.classList.toggle("can-point", Boolean(when()) && !layer);

    function clear() {
      ghost?.remove();
      ghost = null;
    }

    /** A saved note's mark over the picture, until the picture moves on. Drawn in the picture's own pixels, so an
        arrow's head keeps its shape. */
    function show(shape) {
      clear();
      if (!shape?.box && !shape?.arrow) return;
      const { width, height } = host.getBoundingClientRect();
      ghost = el("svg", { class: "point_ghost", viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" }, SVG);
      drawShape(ghost, shape, width, height, { ghost: true });
      host.append(ghost);
    }

    function stop() {
      layer?.remove();
      layer = null;
      host.classList.remove("is-pointing");
      refresh();
    }

    function start(tool) {
      if (!when()) return;
      stop();
      clear();
      host.classList.add("is-pointing");
      layer = el("div", { class: "point_layer", "aria-label": `Drag on the picture to draw ${tool === "box" ? "a box" : "an arrow"}; Escape cancels` });
      const svg = el("svg", { "aria-hidden": "true" }, SVG);
      const hint = el("p", { class: "point_hint" });
      hint.textContent = `Drag to draw ${tool === "box" ? "a box around it" : "an arrow to it"}. Esc cancels.`;
      layer.append(svg, hint);
      host.append(layer);
      // drawn in the picture's own pixels, so an arrow's head keeps its shape
      const { width: W, height: H } = layer.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      refresh();
      let origin = null;
      let shape = null;
      const at = (e) => {
        const r = layer.getBoundingClientRect();
        return [round((e.clientX - r.left) / r.width), round((e.clientY - r.top) / r.height)];
      };
      const shapeOf = (a, b) =>
        tool === "box"
          ? { box: { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: round(Math.abs(b[0] - a[0])), h: round(Math.abs(b[1] - a[1])) } }
          : { arrow: { from: a, to: b } };
      const paint = () => {
        svg.replaceChildren();
        if (!shape) return;
        if (shape.box) {
          // the picture outside the box dims, so what's in it stands out
          const mask = el("mask", { id: "point-hole" }, SVG);
          mask.append(el("rect", { width: W, height: H, fill: "#fff" }, SVG), el("rect", { x: shape.box.x * W, y: shape.box.y * H, width: shape.box.w * W, height: shape.box.h * H, fill: "#000" }, SVG));
          const defs = el("defs", {}, SVG);
          defs.append(mask);
          svg.append(defs, el("rect", { class: "point_dim", width: W, height: H, mask: "url(#point-hole)" }, SVG));
        }
        drawShape(svg, shape, W, H);
      };
      layer.addEventListener("pointerdown", (e) => {
        if (layer.querySelector(".point_pop")) return;
        e.preventDefault();
        try {
          layer.setPointerCapture(e.pointerId);
        } catch {}
        origin = at(e);
        shape = shapeOf(origin, origin);
        hint.hidden = true;
        paint();
      });
      layer.addEventListener("pointermove", (e) => {
        if (!origin) return;
        shape = shapeOf(origin, at(e));
        paint();
      });
      layer.addEventListener("pointerup", (e) => {
        if (!origin) return;
        shape = shapeOf(origin, at(e));
        origin = null;
        // too small to mean anything: draw again
        const tiny = shape.box ? shape.box.w < 0.015 || shape.box.h < 0.015 : Math.hypot(shape.arrow.to[0] - shape.arrow.from[0], shape.arrow.to[1] - shape.arrow.from[1]) < 0.02;
        if (tiny) {
          shape = null;
          paint();
          hint.hidden = false;
          return;
        }
        paint();
        ask(shape);
      });
      const onKey = (e) => {
        if (e.key !== "Escape" || !layer) return;
        e.preventDefault();
        e.stopPropagation();
        stop();
        removeEventListener("keydown", onKey, true);
      };
      addEventListener("keydown", onKey, true);

      // where the note goes: beside the drawing, never over it, nor over what an arrow points at, and on screen. A
      // box's note goes below the box, else above, right or left of it: the first of those inside the picture, else
      // the first on screen. An arrow's goes as near its tail as it can without covering the arrow or the picture
      // around and just past its head; behind the tail counts as a little nearer (so the arrow points from the note to
      // the thing), and past the edge of the picture as a little further.
      function place(pop, s) {
        const pw = pop.offsetWidth;
        const ph = pop.offsetHeight;
        const L = layer.getBoundingClientRect();
        const within = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const picture = { l: 8, t: 8, r: W - 8, b: H - 8 };
        const screen = { l: 8 - L.left, t: 8 - L.top, r: innerWidth - L.left - 8, b: innerHeight - L.top - 8 };
        const fits = (c, room) => c.x >= room.l && c.y >= room.t && c.x + pw <= room.r && c.y + ph <= room.b;
        let spot;
        if (s.box) {
          const R = { l: s.box.x * W, t: s.box.y * H, r: (s.box.x + s.box.w) * W, b: (s.box.y + s.box.h) * H };
          const ax = Math.min(R.l + 28, (R.l + R.r) / 2);
          const ay = Math.min(R.t + 28, (R.t + R.b) / 2);
          // on one side of the box, lined up with its start; the notch where the note's side meets the box's
          const at = (side) => {
            const across = side === "below" || side === "above";
            const x = side === "right" ? R.r + 12 : side === "left" ? R.l - 12 - pw : within(ax - 28, 8, W - pw - 8);
            const y = side === "below" ? R.b + 12 : side === "above" ? R.t - 12 - ph : within(ay - 28, 8, H - ph - 8);
            const lo = across ? Math.max(x + 18, R.l) : Math.max(y + 18, R.t);
            const hi = across ? Math.min(x + pw - 18, R.r) : Math.min(y + ph - 18, R.b);
            return { side, x, y, notch: lo <= hi ? within(across ? ax - x : ay - y, lo - (across ? x : y), hi - (across ? x : y)) : null };
          };
          const places = ["below", "above", "right", "left"].map(at);
          spot = places.find((c) => fits(c, picture)) || places.find((c) => fits(c, screen)) || places[0];
        } else {
          const T = [s.arrow.from[0] * W, s.arrow.from[1] * H];
          const A = [s.arrow.to[0] * W, s.arrow.to[1] * H];
          const dx = A[0] - T[0];
          const dy = A[1] - T[1];
          const len = Math.hypot(dx, dy) || 1;
          const u = [dx / len, dy / len];
          // what the arrow points at: the picture around its head and a little past it
          const k = Math.max(40, Math.min(W, H) * 0.09);
          const far = [A[0] + u[0] * 2 * k, A[1] + u[1] * 2 * k];
          const K = { l: Math.min(A[0], far[0]) - 0.7 * k, r: Math.max(A[0], far[0]) + 0.7 * k, t: Math.min(A[1], far[1]) - 0.7 * k, b: Math.max(A[1], far[1]) + 0.7 * k };
          // whether the arrow's line crosses a rectangle
          const crosses = (l, t, r, b) => {
            let t0 = 0;
            let t1 = 1;
            for (const [p, q] of [
              [-dx, T[0] - l],
              [dx, r - T[0]],
              [-dy, T[1] - t],
              [dy, b - T[1]],
            ]) {
              if (p === 0) {
                if (q < 0) return false;
              } else if (p < 0) {
                if (q / p > t1) return false;
                t0 = Math.max(t0, q / p);
              } else {
                if (q / p < t0) return false;
                t1 = Math.min(t1, q / p);
              }
            }
            return true;
          };
          // the nearest place on screen, every 4 pixels
          const search = (line) => {
            let best = null;
            for (let y = screen.t; y <= screen.b - ph; y += 4)
              for (let x = screen.l; x <= screen.r - pw; x += 4) {
                const d = Math.hypot(Math.max(x - T[0], 0, T[0] - x - pw), Math.max(y - T[1], 0, T[1] - y - ph));
                if (d < 10) continue;
                const out = Math.max(0, picture.l - x) + Math.max(0, x + pw - picture.r) + Math.max(0, picture.t - y) + Math.max(0, y + ph - picture.b);
                const cost = d + 0.05 * ((x + pw / 2 - T[0]) * u[0] + (y + ph / 2 - T[1]) * u[1]) + 0.3 * out;
                if (best && cost >= best.cost) continue;
                if (x - 4 < K.r && K.l < x + pw + 4 && y - 4 < K.b && K.t < y + ph + 4) continue;
                if (line && crosses(x - 4, y - 4, x + pw + 4, y + ph + 4)) continue;
                best = { x, y, cost, d };
              }
            return best;
          };
          const near = search(true) || search(false) || { x: 8, y: H - ph - 8, d: Infinity };
          // the notch points at the tail, when the note's beside it
          const side = T[1] <= near.y ? "below" : T[1] >= near.y + ph ? "above" : T[0] <= near.x ? "right" : "left";
          const along = side === "below" || side === "above" ? T[0] - near.x : T[1] - near.y;
          const size = side === "below" || side === "above" ? pw : ph;
          spot = { side, x: near.x, y: near.y, notch: near.d <= 28 && along >= 18 && along <= size - 18 ? along : null };
        }
        pop.style.left = `${spot.x}px`;
        pop.style.top = `${spot.y}px`;
        pop.classList.add(`point_pop--${spot.side}`);
        if (spot.notch === null) pop.classList.add("point_pop--loose");
        else pop.style.setProperty("--notch", `${spot.notch - 7}px`);
      }

      // the note, in a box beside the drawing
      function ask(s) {
        const pop = el("div", { class: "point_pop", role: "dialog", "aria-label": label() });
        pop.innerHTML = `<p class="field-label"></p><textarea rows="3" placeholder="What should change here?"></textarea><div class="row"><button class="button point_add" type="button"></button><button class="button button--secondary" type="button" data-point-cancel>Cancel</button></div>`;
        pop.querySelector(".field-label").textContent = `${label()} · ${s.box ? "on the box" : "where the arrow points"}`;
        pop.querySelector(".point_add").textContent = addLabel;
        const text = pop.querySelector("textarea");
        const done = () => {
          removeEventListener("keydown", onKey, true);
          stop();
        };
        pop.querySelector("[data-point-cancel]").addEventListener("click", done);
        pop.querySelector(".point_add").addEventListener("click", () => {
          if (!text.value.trim()) {
            text.focus();
            text.placeholder = "Write what should change, then add the note.";
            return;
          }
          const picture = capture(source(), s);
          onAdd({ shape: s, text: text.value.trim(), picture });
          done();
        });
        text.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) pop.querySelector(".point_add").click();
        });
        pop.addEventListener("pointerdown", (e) => e.stopPropagation());
        layer.append(pop);
        place(pop, s);
        text.focus();
      }
    }

    refresh();
    return { start, show, clear, refresh, stop };
  }

  window.StudioPoint = { attach, thumb, drawShape };
})();
