// Live pages: when the files behind this page change, refresh it. If there are unsaved changes on a review page, show a
// bar instead, so nothing typed is lost. When a newer storyboard or draft appears, offer to open it.
(() => {
  const path = location.pathname;
  let stamp = null;
  let firstLatest;
  let bar = null;
  let showing = "";

  function show(text, label, href) {
    // leave the bar alone while it already says this, so a click on its button is never lost to a rebuild
    const key = `${text}|${label}|${href || ""}`;
    if (key === showing) return;
    showing = key;
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "live-bar";
      bar.setAttribute("role", "status");
      document.body.append(bar);
    }
    const message = document.createElement("span");
    message.textContent = text;
    const action = document.createElement(href ? "a" : "button");
    action.className = "button";
    action.textContent = label;
    if (href) action.href = href;
    else {
      action.type = "button";
      action.addEventListener("click", () => location.reload());
    }
    bar.replaceChildren(message, action);
  }

  async function check() {
    if (document.visibilityState === "visible") {
      try {
        // the server also learns from this which pages are on screen, and whether they hold unsaved changes
        const unsaved = window.studioDirty ? "&unsaved=1" : "";
        const res = await fetch(`/api/stamp?path=${encodeURIComponent(path)}${unsaved}`, { cache: "no-store" });
        const now = await res.json();
        // "Claude starts when you save", while Claude waits in the background for this review
        document.querySelectorAll("[data-claude-waiting]").forEach((el) => (el.hidden = !now.waiting));
        if (stamp === null) {
          stamp = now.stamp;
          firstLatest = now.latest || null;
        } else if (now.latest && now.latest !== firstLatest) {
          // a newer storyboard or draft appeared while this one was open (an older one already says so on the page)
          show(`${now.latestLabel} is ready.`, "Open it", now.latest);
        } else if (now.stamp !== stamp) {
          if (!window.studioDirty) return location.reload();
          show("This page has been updated. Save your changes first, then reload to see the update.", "Reload");
        }
      } catch {
        // the page server isn't reachable (stopped or restarting); try again shortly
      }
    }
    setTimeout(check, 2000);
  }
  check();
})();
