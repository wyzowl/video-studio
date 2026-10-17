// Video review: watch the video, pin notes to moments in it, then the decision: Approve video, unless there are notes
// (they switch it to Changes needed), and save: the button says which ("Approve and save" or "Send changes"). Saving
// posts the review to the studio server, which writes feedback.json beside the review.
(() => {
  const state = JSON.parse(document.getElementById("review-state").textContent);
  const player = document.querySelector("[data-player]");
  const list = document.querySelector("[data-notes]");
  const empty = document.querySelector("[data-notes-empty]");
  const nowEl = document.querySelector("[data-now]");
  const addBtn = document.querySelector("[data-add-note]");
  const general = document.querySelector("[data-general]");
  const saveBtn = document.querySelector("[data-save]");
  const message = document.querySelector("[data-message]");
  const countEl = document.querySelector('[data-count="notes"]');
  const countWord = document.querySelector("[data-count-word]");
  const decisionLabel = document.querySelector("[data-decision-label]");
  const hint = document.querySelector("[data-decision-hint]");
  const radios = [...document.querySelectorAll('input[name="decision"]')];
  const LABEL = { approved: "Approve", changes: "Changes needed" };
  const SAVE = { approved: "Approve and save", changes: "Send changes" };
  const HINT = {
    approved: "Claude will make the final video. Any notes are treated as small last tweaks.",
    changes: "Claude will make the changes in your notes and share a new version.",
  };
  let notes = [];
  let dirty = false;
  // live.js reads window.studioDirty, so an update never reloads over unsaved notes
  const setDirty = (value) => {
    dirty = value;
    window.studioDirty = value;
  };

  const tc = (t) => {
    const s = Math.max(0, Number(t) || 0);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
  };
  const decision = () => radios.find((r) => r.checked)?.value || "approved";
  const say = (text, isError = false) => {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  };
  const changed = () => {
    setDirty(true);
    say("Unsaved changes.");
  };
  const seek = (t) => {
    if (!player) return;
    player.currentTime = t;
    player.pause();
    player.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  function render(focusNote) {
    notes.sort((a, b) => a.time - b.time);
    list.replaceChildren(
      ...notes.map((n) => {
        const li = document.createElement("li");
        li.className = "note";
        const time = document.createElement("button");
        time.type = "button";
        time.className = "note_time";
        time.textContent = tc(n.time);
        time.title = "Jump to this moment";
        time.addEventListener("click", () => seek(n.time));
        const text = document.createElement("textarea");
        text.rows = 3;
        text.value = n.text;
        text.placeholder = "What should change here?";
        text.setAttribute("aria-label", `Note at ${tc(n.time)}`);
        text.disabled = !state.latest;
        text.addEventListener("input", () => {
          n.text = text.value;
          changed();
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "note_remove";
        remove.textContent = "×";
        remove.title = "Remove this note";
        remove.setAttribute("aria-label", `Remove the note at ${tc(n.time)}`);
        remove.hidden = !state.latest;
        remove.addEventListener("click", () => {
          notes = notes.filter((x) => x !== n);
          render();
          follow();
          changed();
        });
        li.append(time, text, remove);
        if (n === focusNote) queueMicrotask(() => text.focus());
        return li;
      }),
    );
    empty.hidden = notes.length > 0;
    countEl.textContent = String(notes.length);
    countWord.textContent = notes.length === 1 ? "note" : "notes";
  }

  // The decision is Approve unless there are notes: the first note switches it to Changes needed, and removing the last
  // switches it back. The general comments count too, so feedback pasted in from someone outside the studio
  // switches it the same way. A decision the person picks stands while there are notes.
  let noted = 0;
  const noteCount = () => notes.length + (general?.value.trim() ? 1 : 0);
  function follow() {
    const n = noteCount();
    const pick = noted === 0 && n > 0 ? "changes" : noted > 0 && n === 0 ? "approved" : null;
    noted = n;
    const r = pick && radios.find((x) => x.value === pick);
    if (r && !r.checked) {
      r.checked = true;
      showDecision();
    }
  }

  function showDecision() {
    const d = decision();
    decisionLabel.textContent = LABEL[d];
    hint.textContent = HINT[d];
    if (state.latest && saveBtn) saveBtn.textContent = SAVE[d];
  }

  // restore what was saved
  const fb = state.feedback;
  if (fb) {
    notes = (fb.notes || []).map((n) => ({ time: Number(n.time) || 0, text: String(n.text || "") }));
    if (general) general.value = fb.general || "";
    const r = radios.find((x) => x.value === fb.decision);
    if (r) r.checked = true;
  }
  render();
  showDecision();
  noted = noteCount();

  const showNow = () => {
    if (nowEl && player) nowEl.textContent = tc(player.currentTime);
  };
  ["timeupdate", "seeked", "loadedmetadata"].forEach((e) => player?.addEventListener(e, showNow));
  document.querySelectorAll("[data-seek]").forEach((b) => b.addEventListener("click", () => seek(Number(b.dataset.seek))));

  if (!state.latest) {
    general && (general.disabled = true);
    radios.forEach((r) => (r.disabled = true));
    return;
  }

  addBtn?.addEventListener("click", () => {
    const n = { time: Math.round((player?.currentTime || 0) * 10) / 10, text: "" };
    player?.pause();
    notes.push(n);
    follow();
    render(n);
    changed();
  });
  general?.addEventListener("input", () => {
    follow();
    changed();
  });
  radios.forEach((r) =>
    r.addEventListener("change", () => {
      showDecision();
      changed();
    }),
  );
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  saveBtn?.addEventListener("click", async () => {
    const blank = notes.find((n) => !n.text.trim());
    if (blank) {
      say(`Write something in the note at ${tc(blank.time)}, or remove it.`, true);
      render(blank);
      return;
    }
    if (decision() === "changes" && !notes.length && !general?.value.trim()) {
      say("Add at least one note (or a comment under “Anything else?”) so Claude knows what to change.", true);
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project: state.project, version: state.version, decision: decision(), notes, general: general ? general.value.trim() : "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      setDirty(false);
      const time = new Date(data.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const d = data.summary.decision;
      if (data.claude) {
        // Claude is waiting in the background: the save wakes it
        if (d === "approved") say(`Saved at ${time}. Claude is making the final video.`);
        else say(`Saved at ${time}. Claude has your notes and is making the changes.`);
      } else if (d === "approved") say(`Saved at ${time}. Tell Claude “Video approved” and it will make the final video.`);
      else say(`Saved at ${time}. Tell Claude “I've saved my notes on the video” and it will make the changes.`);
      // on to the video's overview, which shows what happens next (and Claude at work on it)
      if (data.finished) {
        say(`${message.textContent} Opening the video's overview…`);
        setTimeout(() => location.assign(`/videos/${encodeURIComponent(state.project)}/`), 1800);
      }
    } catch (err) {
      say(`Couldn't save: ${err.message}. Is the studio server still running? In Claude Code, run /video-studio:dashboard and try again.`, true);
    } finally {
      saveBtn.disabled = false;
      showDecision();
    }
  });
})();
