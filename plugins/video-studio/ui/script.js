// Script review: a note on any cell (a row's voiceover or text on screen, or its action on screen), general notes,
// then the decision: Approve script, unless there are notes (they switch it to Changes needed). Saving posts the review
// to the studio server, which writes feedback.json beside the script, then opens the video's overview.
(() => {
  const state = JSON.parse(document.getElementById("script-state").textContent);
  const general = document.querySelector("[data-general]");
  const saveBtn = document.querySelector("[data-save]");
  const message = document.querySelector("[data-message]");
  const countEl = document.querySelector('[data-count="notes"]');
  const decisionLabel = document.querySelector("[data-decision-label]");
  const hint = document.querySelector("[data-decision-hint]");
  const radios = [...document.querySelectorAll('input[name="decision"]')];
  const LABEL = { approved: "Approve", changes: "Changes needed" };
  const HINT = {
    approved: "Claude will make the storyboard. Any notes are treated as small last tweaks.",
    changes: "Claude will make the changes in your notes and share a new version of the script.",
  };
  const rowNumber = Object.fromEntries(state.rows.map((r) => [r.id, r.n]));
  // a note per cell, by "<row id>:<words|action>"
  const notes = new Map();
  let dirty = false;
  // live.js reads window.studioDirty, so an update never reloads over unsaved notes
  const setDirty = (value) => {
    dirty = value;
    window.studioDirty = value;
  };
  const say = (text, isError = false) => {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  };
  const changed = () => {
    setDirty(true);
    say("Unsaved changes.");
  };
  const decision = () => radios.find((r) => r.checked)?.value || "approved";
  const keyOf = (cell) => `${cell.closest("[data-row]").dataset.row}:${cell.dataset.cell}`;
  const where = (cell) => `row ${rowNumber[cell.closest("[data-row]").dataset.row]}, ${state.columns[cell.dataset.cell].toLowerCase()}`;

  // The decision is Approve unless there are notes: the first note switches it to Changes needed, and removing the last
  // switches it back. The general comments count too, so feedback pasted in from someone outside the studio switches
  // it the same way. A decision the person picks stands while there are notes. (Not on load: a saved review shows what
  // was saved.)
  let noted = 0;
  let following = false;
  function setDecision(value) {
    const r = radios.find((x) => x.value === value);
    if (!r || r.checked) return;
    r.checked = true;
    showDecision();
  }

  function count() {
    const n = [...notes.values()].filter((t) => t.trim()).length;
    countEl.textContent = String(n);
    const any = n + (general?.value.trim() ? 1 : 0);
    if (following && noted === 0 && any > 0) setDecision("changes");
    if (following && noted > 0 && any === 0) setDecision("approved");
    noted = any;
    return n;
  }

  /** Opens the note under a cell's text (or focuses it), filled with what's saved. */
  function openNote(cell, focus = true) {
    const key = keyOf(cell);
    const slot = cell.querySelector("[data-note-slot]");
    let text = slot.querySelector("textarea");
    if (!text) {
      const id = `note-${key.replace(/[^A-Za-z0-9-]/g, "-")}`;
      const label = document.createElement("label");
      label.className = "field-label";
      label.htmlFor = id;
      label.textContent = `Your note on ${where(cell)}`;
      text = document.createElement("textarea");
      text.id = id;
      text.rows = 3;
      text.placeholder = "What should change?";
      text.value = notes.get(key) || "";
      text.disabled = !state.latest;
      text.addEventListener("input", () => {
        notes.set(key, text.value);
        cell.classList.toggle("has-note", Boolean(text.value.trim()));
        count();
        changed();
      });
      // an empty note closes when you move on
      text.addEventListener("blur", () => {
        if (!text.value.trim() && state.latest) setTimeout(() => !slot.contains(document.activeElement) && closeNote(cell), 150);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "scriptsheet_note_remove";
      remove.textContent = "Remove note";
      remove.hidden = !state.latest;
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        const had = Boolean(notes.get(key)?.trim());
        closeNote(cell);
        if (had) changed();
      });
      slot.replaceChildren(label, text, remove);
      cell.classList.add("is-open");
    }
    if (focus) text.focus();
  }

  function closeNote(cell) {
    notes.delete(keyOf(cell));
    cell.querySelector("[data-note-slot]").replaceChildren();
    cell.classList.remove("is-open", "has-note");
    count();
  }

  function showDecision() {
    const d = decision();
    decisionLabel.textContent = LABEL[d];
    hint.textContent = HINT[d];
  }

  // restore what was saved
  const fb = state.feedback;
  if (fb) {
    for (const n of fb.notes || []) {
      const cell = document.querySelector(`[data-row="${CSS.escape(String(n.rowId))}"] [data-cell="${CSS.escape(String(n.cell))}"]`);
      if (!cell || !String(n.text || "").trim()) continue;
      notes.set(keyOf(cell), String(n.text));
      openNote(cell, false);
      cell.classList.add("has-note");
    }
    if (general) general.value = fb.general || "";
    const r = radios.find((x) => x.value === fb.decision);
    if (r) r.checked = true;
  }
  count();
  showDecision();
  following = true;

  if (!state.latest) {
    general && (general.disabled = true);
    radios.forEach((r) => (r.disabled = true));
    return;
  }

  // a click anywhere on a cell (or its "+ Note") opens its note
  document.querySelectorAll(".scriptsheet_cell").forEach((cell) =>
    cell.addEventListener("click", (event) => {
      if (event.target.closest("textarea, .scriptsheet_note_remove, a")) return;
      if (window.getSelection()?.toString()) return; // selecting text to copy isn't a request for a note
      openNote(cell);
    }),
  );
  general?.addEventListener("input", () => {
    count();
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
    const written = [...notes].filter(([, text]) => text.trim());
    if (decision() === "changes" && !written.length && !general?.value.trim()) {
      say("Add at least one note (or a comment under “Anything else?”) so Claude knows what to change.", true);
      return;
    }
    saveBtn.disabled = true;
    const label = saveBtn.textContent;
    saveBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: state.project,
          version: state.version,
          decision: decision(),
          notes: written.map(([key, text]) => {
            const [rowId, cell] = key.split(":");
            return { rowId, cell, text: text.trim() };
          }),
          general: general ? general.value.trim() : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      setDirty(false);
      const time = new Date(data.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const d = data.summary.decision;
      if (data.claude) {
        // Claude is waiting in the background: the save wakes it
        if (d === "approved") say(`Saved at ${time}. Claude is making the storyboard.`);
        else say(`Saved at ${time}. Claude has your notes and is making the next version.`);
      } else if (d === "approved") say(`Saved at ${time}. Tell Claude “Script approved” and it will make the storyboard.`);
      else say(`Saved at ${time}. Tell Claude “I've saved my notes on the script” and it will make the changes.`);
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
