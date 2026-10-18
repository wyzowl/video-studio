// Storyboard review: each scene is Approved unless it's marked Feedback (with a note). General notes ask for changes
// too. The save button says which ("Approve and save" or "Send feedback"), and the scene strip shows each scene's mark
// and the one on screen. Saving posts the review to the studio server, which writes feedback.json next to the
// storyboard. A note pointed at a frame (Box or Arrow, ui/point.js through ui/page.js's viewer) joins that scene's
// feedback, with a close-up of what it points at; its picture is saved in the storyboard's points/ folder.
(() => {
  const state = JSON.parse(document.getElementById("storyboard-state").textContent);
  const saveBtn = document.querySelector("[data-save]");
  const message = document.querySelector("[data-message]");
  const general = document.querySelector('textarea[data-note="general"]');
  const countEl = (k) => document.querySelector(`[data-count="${k}"]`);
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
  const scenePos = Object.fromEntries(state.scenes.map((s, i) => [s.id, i + 1]));
  let dirty = false;
  // live.js reads window.studioDirty, so an update never reloads over unsaved choices
  const setDirty = (value) => {
    dirty = value;
    window.studioDirty = value;
  };

  // each scene's pointed notes: [{ id, frame, text, box | arrow, picture | pending }]
  const points = Object.fromEntries(state.scenes.map((s) => [s.id, []]));
  const shapeOf = (pt) => (pt.box ? { box: pt.box } : pt.arrow ? { arrow: pt.arrow } : null);

  function renderPoints(id) {
    const list = document.querySelector(`[data-points="${esc(id)}"]`);
    if (!list) return;
    list.replaceChildren(
      ...points[id].map((pt) => {
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
          setDirty(true);
          say("Unsaved changes.");
        });
        body.append(label, text);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "note_remove";
        remove.textContent = "×";
        remove.title = "Remove this note";
        remove.setAttribute("aria-label", `Remove the note on frame ${pt.frame}`);
        remove.hidden = !state.latest;
        remove.addEventListener("click", () => {
          points[id] = points[id].filter((x) => x !== pt);
          renderPoints(id);
          setDirty(true);
          say("Unsaved changes.");
        });
        li.append(close, body, remove);
        return li;
      }),
    );
  }

  const radios = (id) => document.querySelectorAll(`input[name="r-${esc(id)}"]`);
  const statusOf = (id) => [...radios(id)].find((r) => r.checked)?.value || "approved";
  const noteEl = (id) => document.querySelector(`textarea[data-note="${esc(id)}"]`);
  const sectionEl = (id) => document.querySelector(`[data-scene="${esc(id)}"]`);

  function apply(id) {
    const status = statusOf(id);
    const section = sectionEl(id);
    if (!section) return;
    section.classList.toggle("is-approved", status === "approved");
    section.classList.toggle("is-feedback", status === "feedback");
    const note = section.querySelector(".review_note");
    if (note) note.hidden = status !== "feedback";
    const item = document.querySelector(`[data-strip="${esc(id)}"]`);
    if (item) {
      item.classList.toggle("is-approved", status === "approved");
      item.classList.toggle("is-feedback", status === "feedback");
      const said = item.querySelector("[data-strip-state]");
      if (said) said.textContent = status === "feedback" ? ", feedback" : ", approved";
    }
  }

  function tally() {
    const t = { approved: 0, feedback: 0 };
    for (const s of state.scenes) t[statusOf(s.id)]++;
    for (const k of Object.keys(t)) {
      const el = countEl(k);
      if (el) el.textContent = String(t[k]);
    }
    showSave(t);
    return t;
  }

  // what saving does: approves the storyboard, or sends the feedback for a new version
  function showSave(t) {
    if (!state.latest || !saveBtn) return;
    saveBtn.textContent = t.feedback || general?.value.trim() ? "Send feedback" : "Approve and save";
  }

  function say(text, isError = false) {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  // restore what was saved; any other scene is Approved (as is one saved "not reviewed", a choice there used to be)
  const fb = state.feedback;
  for (const s of state.scenes) {
    const saved = fb && fb.scenes ? fb.scenes[s.id] : null;
    const status = saved?.status === "feedback" ? "feedback" : "approved";
    const input = [...radios(s.id)].find((r) => r.value === status);
    if (input) input.checked = true;
    if (saved && saved.note && noteEl(s.id)) noteEl(s.id).value = saved.note;
    points[s.id] = (saved?.points || []).filter((pt) => pt && (pt.box || pt.arrow) && pt.picture).map((pt) => ({ ...pt }));
    renderPoints(s.id);
    apply(s.id);
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
    const masthead = document.querySelector(".masthead");
    let queued = false;
    let shown = null;
    const mark = () => {
      queued = false;
      const top = strip.getBoundingClientRect();
      strip.classList.toggle("is-stuck", top.top <= (masthead?.offsetHeight || 0) + 1);
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

  // a note pointed at a frame in the viewer: into that scene's feedback (the scene is switched to Feedback)
  document.addEventListener("studio:point", (e) => {
    if (!state.latest) return;
    const { link, shape, text, picture } = e.detail || {};
    const id = link?.closest("[data-scene]")?.dataset.scene;
    if (!id || !points[id]) return;
    const feedback = [...radios(id)].find((r) => r.value === "feedback");
    if (feedback && !feedback.checked) {
      feedback.checked = true;
      apply(id);
      tally();
    }
    points[id].push({ id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, frame: link.dataset.frameId || "", text, ...shape, ...(picture ? { pending: picture.src } : {}) });
    renderPoints(id);
    setDirty(true);
    say(`Unsaved changes. The note is in scene ${scenePos[id]}'s feedback.`);
  });

  // earlier versions are read-only
  if (!state.latest) {
    document.querySelectorAll(".review input, textarea[data-note]").forEach((el) => (el.disabled = true));
    return;
  }

  document.querySelectorAll(".review input[type=radio]").forEach((r) =>
    r.addEventListener("change", () => {
      const id = r.closest("[data-review]").dataset.review;
      apply(id);
      tally();
      setDirty(true);
      say("Unsaved changes.");
      if (r.value === "feedback") noteEl(id)?.focus();
    }),
  );
  document.querySelectorAll("textarea[data-note]").forEach((t) =>
    t.addEventListener("input", () => {
      setDirty(true);
      say("Unsaved changes.");
    }),
  );
  // general notes ask for changes, like a scene's feedback, so the bar shows when there are some
  const generalCount = document.querySelector("[data-general-count]");
  general?.addEventListener("input", () => {
    if (generalCount) generalCount.hidden = !general.value.trim();
    tally();
  });
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  saveBtn?.addEventListener("click", async () => {
    // a scene's feedback is its note, its pointed notes, or both
    const missing = state.scenes.filter((s) => statusOf(s.id) === "feedback" && !noteEl(s.id)?.value.trim() && !points[s.id].some((pt) => pt.text.trim()));
    if (missing.length) {
      const first = missing[0];
      say(`Add a note to scene ${scenePos[first.id]} (${first.title}), or mark it Approved.`, true);
      noteEl(first.id)?.focus();
      return;
    }
    const scenes = {};
    for (const s of state.scenes) {
      const status = statusOf(s.id);
      scenes[s.id] =
        status === "feedback"
          ? { status, note: noteEl(s.id).value.trim(), points: points[s.id].filter((pt) => pt.text.trim()).map(({ pending, ...pt }) => ({ ...pt, text: pt.text.trim() })) }
          : { status };
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
          pictures: Object.fromEntries(Object.values(points).flatMap((list) => list.filter((pt) => pt.pending).map((pt) => [pt.id, pt.pending]))),
          general: general ? general.value.trim() : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      setDirty(false);
      // the pictures are saved now: the scenes show them from the storyboard's folder
      for (const [id, saved] of Object.entries(data.scenes || {})) {
        for (const pt of saved.points || []) {
          const mine = points[id]?.find((x) => x.id === pt.id);
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
