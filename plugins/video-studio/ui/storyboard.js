// Storyboard review: each scene is Approved unless it's marked Feedback (with a note). General notes ask for changes
// too. Saving posts the review to the studio server, which writes feedback.json next to the storyboard.
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
  }

  function tally() {
    const t = { approved: 0, feedback: 0 };
    for (const s of state.scenes) t[statusOf(s.id)]++;
    for (const k of Object.keys(t)) {
      const el = countEl(k);
      if (el) el.textContent = String(t[k]);
    }
    return t;
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
    apply(s.id);
  }
  if (fb && fb.general && general) general.value = fb.general;
  tally();

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
  general?.addEventListener("input", () => generalCount && (generalCount.hidden = !general.value.trim()));
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  saveBtn?.addEventListener("click", async () => {
    const missing = state.scenes.filter((s) => statusOf(s.id) === "feedback" && !noteEl(s.id)?.value.trim());
    if (missing.length) {
      const first = missing[0];
      say(`Add a note to scene ${scenePos[first.id]} (${first.title}), or mark it Approved.`, true);
      noteEl(first.id)?.focus();
      return;
    }
    const scenes = {};
    for (const s of state.scenes) {
      const status = statusOf(s.id);
      scenes[s.id] = status === "feedback" ? { status, note: noteEl(s.id).value.trim() } : { status };
    }
    saveBtn.disabled = true;
    const label = saveBtn.textContent;
    saveBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project: state.project, version: state.version, scenes, general: general ? general.value.trim() : "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      setDirty(false);
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
      saveBtn.textContent = label;
    }
  });
})();
