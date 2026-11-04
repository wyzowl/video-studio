// Storyboard review: each scene is approved unless it has a note. "+ Note" on a scene opens its note in the notes
// beside the scenes, and a note pointed at a frame (Box or Arrow, ui/point.js through ui/page.js's viewer) joins it,
// with a close-up of what it points at (its picture is saved in the storyboard's points/ folder). General notes ask for
// changes too. The save button says which ("Approve and save" or "Send feedback"); the bar counts the scenes approved
// and with feedback, and the scene strip marks each and the one on screen. Saving posts the review to the studio
// server, which writes feedback.json next to the storyboard.
(() => {
  const state = JSON.parse(document.getElementById("storyboard-state").textContent);
  const list = document.querySelector("[data-notes]");
  const empty = document.querySelector("[data-notes-empty]");
  const saveBtn = document.querySelector("[data-save]");
  const message = document.querySelector("[data-message]");
  const general = document.querySelector('textarea[data-note="general"]');
  const countEl = (k) => document.querySelector(`[data-count="${k}"]`);
  const smooth = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  const scenePos = Object.fromEntries(state.scenes.map((s, i) => [s.id, i + 1]));
  const sceneTitle = Object.fromEntries(state.scenes.map((s) => [s.id, s.title]));
  const where = (id) => `Scene ${scenePos[id]} · ${sceneTitle[id]}`;
  const sectionEl = (id) => document.querySelector(`[data-scene="${CSS.escape(id)}"]`);
  let dirty = false;
  // live.js reads window.studioDirty, so an update never reloads over unsaved notes; the save button shows a dot
  const setDirty = (value) => {
    dirty = value;
    window.studioDirty = value;
    saveBtn?.classList.toggle("is-unsaved", value);
    if (value) saveBtn?.setAttribute("data-tip", "Not saved yet");
    else saveBtn?.removeAttribute("data-tip");
  };
  const say = (text, isError = false) => {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  };
  const changed = (text = "") => {
    setDirty(true);
    say(text);
  };

  // each scene with a note: { text, points: [{ id, frame, text, box | arrow, picture | pending }] }
  const notes = new Map();
  let selected = null;
  const shapeOf = (pt) => (pt.box ? { box: pt.box } : pt.arrow ? { arrow: pt.arrow } : null);
  const hasFeedback = (id) => {
    const n = notes.get(id);
    return Boolean(n && (n.text.trim() || n.points.some((pt) => pt.text.trim())));
  };

  /** Marks each scene, its place in the strip and the counts: approved, or feedback. */
  function tally() {
    const t = { approved: 0, feedback: 0 };
    for (const s of state.scenes) {
      const status = hasFeedback(s.id) ? "feedback" : "approved";
      t[status]++;
      const section = sectionEl(s.id);
      section?.classList.toggle("is-approved", status === "approved");
      section?.classList.toggle("is-feedback", status === "feedback");
      const item = document.querySelector(`[data-strip="${CSS.escape(s.id)}"]`);
      if (item) {
        item.classList.toggle("is-approved", status === "approved");
        item.classList.toggle("is-feedback", status === "feedback");
        const said = item.querySelector("[data-strip-state]");
        if (said) said.textContent = status === "feedback" ? ", feedback" : ", approved";
      }
    }
    for (const k of Object.keys(t)) {
      const el = countEl(k);
      if (el) el.textContent = String(t[k]);
    }
    const notesCount = countEl("notes");
    if (notesCount) notesCount.textContent = String(t.feedback);
    if (empty) empty.hidden = notes.size > 0;
    if (state.latest && saveBtn) saveBtn.textContent = t.feedback || general?.value.trim() ? "Send feedback" : "Approve and save";
    return t;
  }

  /** Lights a scene for a moment, as a note's place takes you to it. */
  function flash(el) {
    if (!el) return;
    el.classList.remove("is-flash");
    void el.offsetWidth; // restarts the light if it's still on
    el.classList.add("is-flash");
    setTimeout(() => el.classList.remove("is-flash"), 1500);
  }

  /** Marks a scene's note as the one in hand; `go` scrolls to the scene, `focus` puts the cursor in the note. */
  function select(id, { go = false, focus = false } = {}) {
    selected = id;
    let card = null;
    for (const c of list.children) {
      c.classList.toggle("is-selected", c.dataset.scene === id);
      if (c.dataset.scene === id) card = c;
    }
    document.querySelectorAll(".scene.is-selected").forEach((s) => s.classList.remove("is-selected"));
    const section = sectionEl(id);
    section?.classList.add("is-selected");
    if (go && section) {
      section.scrollIntoView({ block: "start", behavior: smooth() });
      flash(section);
    }
    card?.scrollIntoView({ block: "nearest", behavior: smooth() });
    if (focus) card?.querySelector(".notecard_text")?.focus({ preventScroll: true });
  }

  /** A scene's pointed notes, in its card: a close-up of what each points at, its note, and a button to remove it. */
  function renderPoints(id, holder) {
    const n = notes.get(id);
    holder.replaceChildren(
      ...n.points.map((pt) => {
        const li = document.createElement("li");
        li.className = "point_note";
        const shape = shapeOf(pt);
        const close = document.createElement("div");
        close.className = "note_point";
        if (shape) close.append(window.StudioPoint.thumb(pt.pending || `${state.base}${pt.picture}`, shape, state.ratio));
        const body = document.createElement("div");
        body.className = "point_note_body";
        const label = document.createElement("span");
        label.className = "note_point_label";
        label.textContent = `Frame ${pt.frame || "?"} · ${shape?.box ? "on the box" : "where the arrow points"}`;
        const text = document.createElement("textarea");
        text.rows = 2;
        text.value = pt.text;
        text.disabled = !state.latest;
        text.setAttribute("aria-label", `Your note on frame ${pt.frame}`);
        text.addEventListener("input", () => {
          pt.text = text.value;
          tally();
          changed();
        });
        body.append(label, text);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "notecard_remove";
        remove.textContent = "×";
        remove.title = "Remove this note";
        remove.setAttribute("aria-label", `Remove the note on frame ${pt.frame}`);
        remove.hidden = !state.latest;
        remove.addEventListener("click", () => {
          n.points = n.points.filter((x) => x !== pt);
          renderPoints(id, holder);
          tally();
          changed();
        });
        li.append(close, body, remove);
        return li;
      }),
    );
  }

  /** A scene's note in the panel: its place (back to the scene), the note, its pointed notes, and a button to remove
      them all (the scene is approved again). */
  function card(id) {
    const n = notes.get(id);
    const li = document.createElement("li");
    li.className = "notecard";
    li.dataset.scene = id;
    const place = document.createElement("button");
    place.type = "button";
    place.className = "notecard_place";
    place.textContent = where(id);
    place.title = "Show the scene";
    place.addEventListener("click", () => select(id, { go: true }));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "notecard_remove";
    remove.textContent = "×";
    remove.title = "Remove this scene's notes (it's approved again)";
    remove.setAttribute("aria-label", `Remove the notes on scene ${scenePos[id]}`);
    remove.hidden = !state.latest;
    remove.addEventListener("click", () => {
      const had = hasFeedback(id);
      drop(id);
      if (had) changed();
    });
    const head = document.createElement("div");
    head.className = "notecard_head";
    head.append(place, remove);
    const text = document.createElement("textarea");
    text.className = "notecard_text";
    text.rows = 3;
    text.value = n.text;
    text.placeholder = "What should change? Be as specific as you can.";
    text.disabled = !state.latest;
    text.setAttribute("aria-label", `Your note on scene ${scenePos[id]}`);
    text.addEventListener("focus", () => select(id));
    text.addEventListener("input", () => {
      n.text = text.value;
      tally();
      changed();
    });
    // a note with nothing in it closes when you move on
    text.addEventListener("blur", () => {
      if (!state.latest) return;
      setTimeout(() => {
        if (!li.contains(document.activeElement) && notes.has(id) && !hasFeedback(id) && !notes.get(id).points.length) drop(id);
      }, 150);
    });
    const points = document.createElement("ul");
    points.className = "points";
    li.append(head, text, points);
    renderPoints(id, points);
    return li;
  }

  // the cards come and go one at a time, so the note being written keeps the cursor
  function add(id) {
    const after = [...list.children].find((c) => scenePos[c.dataset.scene] > scenePos[id]);
    list.insertBefore(card(id), after || null);
  }
  function drop(id) {
    notes.delete(id);
    list.querySelector(`.notecard[data-scene="${CSS.escape(id)}"]`)?.remove();
    sectionEl(id)?.classList.remove("is-selected");
    if (selected === id) selected = null;
    tally();
  }
  /** "+ Note" on a scene: its note, opened in the panel (a new one if there isn't one yet). */
  function open(id) {
    if (!notes.has(id)) {
      notes.set(id, { text: "", points: [] });
      add(id);
      tally();
    }
    select(id, { focus: true });
  }

  // restore what was saved; any other scene is approved (as is one saved "not reviewed", a choice there used to be)
  const fb = state.feedback;
  for (const s of state.scenes) {
    const saved = fb && fb.scenes ? fb.scenes[s.id] : null;
    if (saved?.status !== "feedback") continue;
    notes.set(s.id, {
      text: String(saved.note || ""),
      points: (saved.points || []).filter((pt) => pt && (pt.box || pt.arrow) && pt.picture).map((pt) => ({ ...pt, text: String(pt.text || "") })),
    });
    add(s.id);
  }
  if (fb && fb.general && general) general.value = fb.general;
  tally();

  // the scene strip: the scene on screen is the last whose top has passed a quarter of the way down the window, under
  // the strip; it scrolls along the strip to stay in view. A line shows under the strip once it's stuck.
  const strip = document.querySelector(".scenestrip");
  if (strip) {
    const row = strip.querySelector(".scenestrip_row");
    const items = new Map([...strip.querySelectorAll("[data-strip]")].map((a) => [a.dataset.strip, a]));
    const sections = state.scenes.map((s) => sectionEl(s.id)).filter(Boolean);
    const above = [".masthead", ".reviewhead"].map((s) => document.querySelector(s)).filter(Boolean);
    let queued = false;
    let shown = null;
    const mark = () => {
      queued = false;
      const top = strip.getBoundingClientRect();
      strip.classList.toggle("is-stuck", top.top <= above.reduce((h, el) => h + el.offsetHeight, 0) + 1);
      let current = null;
      for (const sec of sections) if (sec.getBoundingClientRect().top <= top.bottom + innerHeight * 0.25) current = sec;
      if (current && current.getBoundingClientRect().bottom <= top.bottom) current = null; // past the last scene
      const on = current ? items.get(current.dataset.scene) : null;
      items.forEach((a) => (a === on ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      if (on && on !== shown) {
        const r = on.getBoundingClientRect();
        const box = row.getBoundingClientRect();
        if (r.left < box.left || r.right > box.right) row.scrollLeft += r.left - box.left - (box.width - r.width) / 2;
      }
      shown = on;
    };
    addEventListener("scroll", () => !queued && (queued = true) && requestAnimationFrame(mark), { passive: true });
    addEventListener("resize", mark);
    mark();
  }

  // a note pointed at a frame in the viewer: into that scene's notes
  document.addEventListener("studio:point", (e) => {
    if (!state.latest) return;
    const { link, shape, text, picture } = e.detail || {};
    const id = link?.closest("[data-scene]")?.dataset.scene;
    if (!id || !(id in scenePos)) return;
    if (!notes.has(id)) {
      notes.set(id, { text: "", points: [] });
      add(id);
    }
    const n = notes.get(id);
    n.points.push({ id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, frame: link.dataset.frameId || "", text, ...shape, ...(picture ? { pending: picture.src } : {}) });
    const holder = list.querySelector(`.notecard[data-scene="${CSS.escape(id)}"] .points`);
    if (holder) renderPoints(id, holder);
    tally();
    select(id);
    changed(`The note is in scene ${scenePos[id]}'s notes.`);
  });

  // earlier versions are read-only
  if (!state.latest) {
    if (general) general.disabled = true;
    return;
  }

  document.querySelectorAll("[data-scene-note]").forEach((b) => b.addEventListener("click", () => open(b.dataset.sceneNote)));
  // general notes ask for changes, like a scene's
  general?.addEventListener("input", () => {
    tally();
    changed();
  });
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  saveBtn?.addEventListener("click", async () => {
    // a scene's feedback is its note, its pointed notes, or both; a scene without either is approved
    const scenes = {};
    for (const s of state.scenes) {
      const n = notes.get(s.id);
      scenes[s.id] = hasFeedback(s.id)
        ? { status: "feedback", note: n.text.trim(), points: n.points.filter((pt) => pt.text.trim()).map(({ pending, ...pt }) => ({ ...pt, text: pt.text.trim() })) }
        : { status: "approved" };
    }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: state.project,
          version: state.version,
          scenes,
          // the pictures of pointed notes not saved yet
          pictures: Object.fromEntries([...notes.values()].flatMap((n) => n.points.filter((pt) => pt.pending).map((pt) => [pt.id, pt.pending]))),
          general: general ? general.value.trim() : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      setDirty(false);
      // the pictures are saved now: the cards show them from the storyboard's folder
      for (const [id, saved] of Object.entries(data.scenes || {})) {
        for (const pt of saved.points || []) {
          const mine = notes.get(id)?.points.find((x) => x.id === pt.id);
          if (mine && pt.picture) {
            mine.picture = pt.picture;
            delete mine.pending;
          }
        }
      }
      const s = data.summary;
      const time = new Date(data.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (data.claude) {
        // Claude is waiting in the background: the save wakes it
        if (s.allApproved) say(`Saved at ${time}. Every scene is approved: Claude is starting the build.`);
        else say(`Saved at ${time}. Claude has your feedback and is making the next version.`);
      } else if (s.allApproved) say(`Saved at ${time}. Every scene is approved: tell Claude “Storyboard approved” and it will start building.`);
      else say(`Saved at ${time}. Tell Claude “I've saved my storyboard feedback” and it will make the next version.`);
      // on to the video's overview, which shows what happens next (and Claude at work on it)
      if (data.finished) {
        say(`${message.textContent} Opening the video's overview…`);
        setTimeout(() => location.assign(`/videos/${encodeURIComponent(state.project)}/`), 1800);
      }
    } catch (err) {
      say(`Couldn't save: ${err.message}. Is the studio server still running? In Claude Code, run /video-studio:dashboard and try again.`, true);
    } finally {
      saveBtn.disabled = false;
      tally();
    }
  });
})();
