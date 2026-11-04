// Script review: a note on any cell (a row's voiceover or text on screen, or its action on screen), kept in the notes
// beside the script, general notes, then the decision: Approve, unless there are notes (they switch it to Changes
// needed). The save button says which ("Approve and save" or "Send changes"). A click on a cell opens its note in the
// panel, and a note's place takes you back to its cell. Saving posts the review to the studio server, which writes
// feedback.json beside the script, then opens the video's overview.
(() => {
  const state = JSON.parse(document.getElementById("script-state").textContent);
  const list = document.querySelector("[data-notes]");
  const empty = document.querySelector("[data-notes-empty]");
  const general = document.querySelector("[data-general]");
  const saveBtn = document.querySelector("[data-save]");
  const message = document.querySelector("[data-message]");
  const countEl = document.querySelector('[data-count="notes"]');
  const hint = document.querySelector("[data-decision-hint]");
  const radios = [...document.querySelectorAll('input[name="decision"]')];
  const SAVE = { approved: "Approve and save", changes: "Send changes" };
  const HINT = {
    approved: "Saving approves the script: Claude makes the storyboard. Any notes are treated as small last tweaks.",
    changes: "Saving sends your notes: Claude makes the changes and shares a new version of the script.",
  };
  const rowNumber = Object.fromEntries(state.rows.map((r) => [r.id, r.n]));
  const smooth = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  // a note per cell, by "<row id>:<words|action>"
  const notes = new Map();
  let selected = null;
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
  const changed = () => {
    setDirty(true);
    say("");
  };
  const decision = () => radios.find((r) => r.checked)?.value || "approved";
  const keyOf = (cell) => `${cell.closest("[data-row]").dataset.row}:${cell.dataset.cell}`;
  const cellOf = (key) => {
    const [row, column] = key.split(":");
    return document.querySelector(`[data-row="${CSS.escape(row)}"] [data-cell="${CSS.escape(column)}"]`);
  };
  // the script's order: by row, the words before the action
  const order = (key) => {
    const [row, column] = key.split(":");
    return (rowNumber[row] || 0) * 2 + (column === "action" ? 1 : 0);
  };
  const where = (key) => {
    const [row, column] = key.split(":");
    return `Row ${rowNumber[row]} · ${state.columns[column]}`;
  };
  const written = () => [...notes].filter(([, text]) => text.trim()).sort(([a], [b]) => order(a) - order(b));

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
    const n = written().length;
    if (countEl) countEl.textContent = String(n);
    const any = n + (general?.value.trim() ? 1 : 0);
    if (following && noted === 0 && any > 0) setDecision("changes");
    if (following && noted > 0 && any === 0) setDecision("approved");
    noted = any;
  }
  function showDecision() {
    const d = decision();
    if (hint) hint.textContent = state.latest ? HINT[d] : "";
    if (state.latest && saveBtn) saveBtn.textContent = SAVE[d];
  }

  /** Lights a cell for a moment, as a note's place takes you to it. */
  function flash(cell) {
    if (!cell) return;
    cell.classList.remove("is-flash");
    void cell.offsetWidth; // restarts the light if it's still on
    cell.classList.add("is-flash");
    setTimeout(() => cell.classList.remove("is-flash"), 1500);
  }

  /** Marks a note and its cell as the one in hand; `go` scrolls to the cell, `focus` puts the cursor in the note. */
  function select(key, { go = false, focus = false } = {}) {
    selected = key;
    document.querySelectorAll(".scriptsheet_cell.is-selected").forEach((c) => c.classList.remove("is-selected"));
    const cell = cellOf(key);
    cell?.classList.add("is-selected");
    let card = null;
    for (const c of list.children) {
      c.classList.toggle("is-selected", c.dataset.key === key);
      if (c.dataset.key === key) card = c;
    }
    if (go && cell) {
      cell.scrollIntoView({ block: "center", behavior: smooth() });
      flash(cell);
    }
    card?.scrollIntoView({ block: "nearest", behavior: smooth() });
    if (focus) card?.querySelector("textarea")?.focus({ preventScroll: true });
  }

  /** A note in the panel: its place (back to the cell), the note, and a button to remove it. */
  function card(key) {
    const li = document.createElement("li");
    li.className = "notecard";
    li.dataset.key = key;
    if (key === selected) li.classList.add("is-selected");
    const place = document.createElement("button");
    place.type = "button";
    place.className = "notecard_place";
    place.textContent = where(key);
    place.title = "Show it in the script";
    place.addEventListener("click", () => select(key, { go: true }));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "notecard_remove";
    remove.textContent = "×";
    remove.title = "Remove this note";
    remove.setAttribute("aria-label", `Remove the note on ${where(key).toLowerCase()}`);
    remove.hidden = !state.latest;
    remove.addEventListener("click", () => {
      const had = Boolean(notes.get(key)?.trim());
      drop(key);
      if (had) changed();
    });
    const text = document.createElement("textarea");
    text.rows = 3;
    text.value = notes.get(key) || "";
    text.placeholder = "What should change?";
    text.disabled = !state.latest;
    text.setAttribute("aria-label", `Your note on ${where(key).toLowerCase()}`);
    text.addEventListener("focus", () => select(key));
    text.addEventListener("input", () => {
      notes.set(key, text.value);
      cellOf(key)?.classList.toggle("has-note", Boolean(text.value.trim()));
      count();
      changed();
    });
    // an empty note closes when you move on
    text.addEventListener("blur", () => {
      if (!state.latest) return;
      setTimeout(() => {
        if (!li.contains(document.activeElement) && notes.has(key) && !notes.get(key).trim()) drop(key);
      }, 150);
    });
    const head = document.createElement("div");
    head.className = "notecard_head";
    head.append(place, remove);
    li.append(head, text);
    return li;
  }

  // the cards come and go one at a time, so the note being written keeps the cursor
  const tidy = () => {
    if (empty) empty.hidden = notes.size > 0;
    count();
  };
  /** Puts a note's card in the panel, in the script's order. */
  function add(key) {
    const li = card(key);
    const after = [...list.children].find((c) => order(c.dataset.key) > order(key));
    list.insertBefore(li, after || null);
    cellOf(key)?.classList.toggle("has-note", Boolean(notes.get(key)?.trim()));
  }
  /** Takes a note away, with its card. */
  function drop(key) {
    notes.delete(key);
    list.querySelector(`.notecard[data-key="${CSS.escape(key)}"]`)?.remove();
    cellOf(key)?.classList.remove("has-note", "is-selected");
    if (selected === key) selected = null;
    tidy();
  }

  /** A click on a cell: its note, opened in the panel (a new one if there isn't one yet). */
  function open(cell) {
    const key = keyOf(cell);
    if (!notes.has(key)) {
      notes.set(key, "");
      add(key);
      tidy();
    }
    select(key, { focus: true });
  }

  // restore what was saved
  const fb = state.feedback;
  if (fb) {
    for (const n of fb.notes || []) {
      const cell = document.querySelector(`[data-row="${CSS.escape(String(n.rowId))}"] [data-cell="${CSS.escape(String(n.cell))}"]`);
      if (cell && String(n.text || "").trim()) notes.set(keyOf(cell), String(n.text));
    }
    if (general) general.value = fb.general || "";
    const r = radios.find((x) => x.value === fb.decision);
    if (r) r.checked = true;
  }
  for (const key of [...notes.keys()].sort((a, b) => order(a) - order(b))) add(key);
  tidy();
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
      if (event.target.closest("a")) return;
      if (window.getSelection()?.toString()) return; // selecting text to copy isn't a request for a note
      open(cell);
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
    const notesNow = written();
    if (decision() === "changes" && !notesNow.length && !general?.value.trim()) {
      say("Add at least one note (or a comment under “Anything else?”) so Claude knows what to change.", true);
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: state.project,
          version: state.version,
          decision: decision(),
          notes: notesNow.map(([key, text]) => {
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
      showDecision();
    }
  });
})();
