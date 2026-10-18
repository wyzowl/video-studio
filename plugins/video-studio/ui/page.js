// Behaviour shared by every studio page:
// - "Read more" opens a long hero description (and "Show less" closes it); "Show all" opens a long block, such as
//   the request in a video's brief.
// - On the dashboard, the nav marks the section on screen: Videos, Brands or Library.
// - A storyboard frame opens full size, as large as the window allows, in a viewer: arrows step through the
//   page's frames, Esc or a click outside closes it. A footage storyboard's "Play the scene" plays its rough cut there.
// - "Download PDF" waits while the studio makes the PDF, then downloads it, and offers the copy it keeps in Finder.
// - The library: a brand, size or type reloads the page with it; previews play only while they're on screen; "Play
//   from the start" restarts them; "Copy" buttons copy their text. The search filters a category's items as you type,
//   a star keeps an item in the studio's favourites, and "Try it with your words" plays an item with the words given.
//   A brand, size or type, a category or one of an item's sizes opens the next page where this one was.
// - A library item named in a script or storyboard shows itself playing while its chip is hovered or focused.
// - While Claude makes something for a video, the panel on its overview follows the work as it happens.
// - The Setup and Health page's checklist follows setup as it happens; the dashboard's "What's new" goes on "Got it".
// - The masthead's height (and a storyboard's scene strip's) keeps jumps and focus clear of them.
(() => {
  // ───────── the sticky bars ─────────
  // The masthead stays at the top, and a storyboard's scene strip under it: studio.css keeps jumps, focus and the strip
  // itself clear of them by their heights.
  const masthead = document.querySelector(".masthead");
  const strip = document.querySelector(".scenestrip");
  const measure = () => {
    const root = document.documentElement.style;
    if (masthead) root.setProperty("--masthead-h", `${masthead.offsetHeight}px`);
    if (strip) root.setProperty("--strip-h", `${strip.offsetHeight}px`);
  };
  measure();
  if ("ResizeObserver" in window) [masthead, strip].forEach((el) => el && new ResizeObserver(measure).observe(el));
  else addEventListener("resize", measure);

  // ───────── read more ─────────
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".readmore");
    const text = button?.closest("[data-more]");
    if (!text) return;
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Show less" : "Read more";
    text.querySelector(".lede_rest").hidden = !open;
    text.querySelector(".lede_ellipsis").hidden = open;
  });

  // ───────── long blocks ─────────
  // A block taller than its data-clamp lines shows those lines, faded out, with "Show all" under it to open the rest.
  document.querySelectorAll("[data-clamp]").forEach((box) => {
    const style = getComputedStyle(box);
    const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
    const limit = Math.round((Number(box.dataset.clamp) || 8) * line);
    // a little over the limit shows whole: "Show all" never hides just a line or two
    if (box.scrollHeight <= limit * 1.35) return;
    box.style.setProperty("--_clamp", `${limit}px`);
    box.classList.add("is-clamped");
    const button = Object.assign(document.createElement("button"), { type: "button", className: "readmore readmore--block", textContent: "Show all" });
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const open = !box.classList.toggle("is-clamped");
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Show less" : "Show all";
    });
    box.after(button);
  });

  // ───────── the dashboard's sections ─────────
  // The dashboard holds the videos, the brands and a taste of the library, and the nav marks the one on screen: the
  // one a nav link jumped to, until the page is scrolled by hand, then the last whose top has passed a third of the way
  // down the window.
  const sections = [...document.querySelectorAll("main > section[id]")];
  const navFor = (id) => document.querySelector(`.nav a[href="/#${id}"]`) || document.querySelector(`.nav a[href="/${id}/"]`);
  if (location.pathname === "/" && sections.some((s) => navFor(s.id))) {
    let jumped = location.hash.slice(1);
    const mark = () => {
      let current = sections[0].id;
      const target = jumped && document.getElementById(jumped);
      if (target && target.getBoundingClientRect().bottom > 0 && target.getBoundingClientRect().top < innerHeight) current = jumped;
      else for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight / 3) current = s.id;
      document.querySelectorAll(".nav a").forEach((a) => a.removeAttribute("aria-current"));
      navFor(current)?.setAttribute("aria-current", "page");
    };
    const byHand = () => {
      if (!jumped) return;
      jumped = "";
      mark();
    };
    addEventListener("hashchange", () => {
      jumped = location.hash.slice(1);
      mark();
    });
    addEventListener("scroll", () => requestAnimationFrame(mark), { passive: true });
    addEventListener("wheel", byHand, { passive: true });
    addEventListener("touchmove", byHand, { passive: true });
    addEventListener("keydown", (e) => ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key) && byHand());
    mark();
  }

  // ───────── frame viewer ─────────
  // It also plays a footage storyboard's scene: its rough cut, with its sound, in the same place.
  let viewer = null;
  let frames = [];
  let at = 0;
  let playing = null;

  function build() {
    viewer = document.createElement("dialog");
    viewer.className = "viewer";
    viewer.setAttribute("aria-label", "Frame, full size");
    viewer.innerHTML = `<button class="viewer_close" type="button" aria-label="Close">×</button>
<button class="viewer_step viewer_step--prev" type="button" aria-label="Previous frame">‹</button>
<figure class="viewer_figure"><img class="viewer_img" alt=""><video class="viewer_video" controls playsinline preload="auto" hidden></video><figcaption class="viewer_caption"><span data-viewer-label></span><span class="viewer_count" data-viewer-count></span></figcaption></figure>
<button class="viewer_step viewer_step--next" type="button" aria-label="Next frame">›</button>`;
    document.body.append(viewer);
    viewer.querySelector(".viewer_close").addEventListener("click", () => viewer.close());
    viewer.querySelector(".viewer_step--prev").addEventListener("click", () => show(at - 1));
    viewer.querySelector(".viewer_step--next").addEventListener("click", () => show(at + 1));
    // a click on the space around the frame closes it
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer || event.target.classList.contains("viewer_figure")) viewer.close();
    });
    viewer.addEventListener("keydown", (event) => {
      if (playing) return;
      if (event.key === "ArrowLeft") show(at - 1);
      if (event.key === "ArrowRight") show(at + 1);
    });
    // closing stops the scene playing
    viewer.addEventListener("close", () => {
      // (unless something was opened again before this event came round)
      if (viewer.open) return;
      const video = viewer.querySelector(".viewer_video");
      video.pause();
      video.removeAttribute("src");
      video.load();
      playing = null;
    });
    addEventListener("resize", () => viewer.open && fit());
  }

  // as large as the window allows, never past the video's own size, keeping its shape
  function fit() {
    const link = playing || frames[at];
    const w = Number(link.dataset.w) || 1920;
    const h = Number(link.dataset.h) || 1080;
    const width = Math.max(120, Math.min(w, innerWidth - 112, ((innerHeight - 120) * w) / h));
    viewer.querySelector(playing ? ".viewer_video" : ".viewer_img").style.width = `${Math.round(width)}px`;
  }

  function show(index) {
    at = (index + frames.length) % frames.length;
    const link = frames[at];
    const img = viewer.querySelector(".viewer_img");
    img.hidden = false;
    viewer.querySelector(".viewer_video").hidden = true;
    img.src = link.href;
    img.alt = link.querySelector("img")?.alt || "";
    viewer.querySelector("[data-viewer-label]").textContent = link.dataset.label || "";
    viewer.querySelector("[data-viewer-count]").textContent = frames.length > 1 ? `${at + 1} of ${frames.length}` : "";
    viewer.querySelectorAll(".viewer_step").forEach((b) => (b.hidden = frames.length < 2));
    fit();
  }

  function play(link) {
    playing = link;
    const video = viewer.querySelector(".viewer_video");
    viewer.querySelector(".viewer_img").hidden = true;
    video.hidden = false;
    video.src = link.href;
    viewer.querySelector("[data-viewer-label]").textContent = link.dataset.label || "";
    viewer.querySelector("[data-viewer-count]").textContent = "Rough cut";
    viewer.querySelectorAll(".viewer_step").forEach((b) => (b.hidden = true));
    fit();
    video.play().catch(() => {});
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-zoom], a[data-play]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (!viewer) build();
    if (link.hasAttribute("data-play")) {
      if (!viewer.open) viewer.showModal();
      play(link);
      return;
    }
    playing = null;
    viewer.querySelector(".viewer_video").pause();
    frames = [...document.querySelectorAll("a[data-zoom]")];
    show(frames.indexOf(link));
    if (!viewer.open) viewer.showModal();
  });

  // ───────── download a PDF ─────────
  // The studio makes the PDF when it's asked for (a few seconds), so the button says so meanwhile. The PDF arrives as a
  // file to save, and the studio keeps a copy in the version's folder: "Show in Finder" opens it there, to attach to
  // an email.
  const fileName = (disposition) => {
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition || "");
    if (utf8) {
      try {
        return decodeURIComponent(utf8[1]);
      } catch {}
    }
    return /filename="([^"]+)"/i.exec(disposition || "")?.[1] || "download.pdf";
  };

  document.addEventListener("click", async (event) => {
    const link = event.target.closest('a[data-download="pdf"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (link.getAttribute("aria-busy") === "true") return;
    const note = link.closest(".share")?.querySelector("[data-share-note]");
    const label = link.textContent;
    link.setAttribute("aria-busy", "true");
    link.textContent = "Making the PDF…";
    note?.classList.remove("is-error");
    try {
      const res = await fetch(link.href);
      if (!res.ok) throw Object.assign(new Error((await res.text()).trim() || `The PDF couldn't be made (${res.status}).`), { fromStudio: true });
      const name = fileName(res.headers.get("content-disposition"));
      const url = URL.createObjectURL(await res.blob());
      const save = Object.assign(document.createElement("a"), { href: url, download: name, hidden: true });
      document.body.append(save);
      save.click();
      save.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (!note) return;
      const copy = decodeURIComponent(res.headers.get("x-studio-file") || "");
      note.textContent = `Downloaded “${name}”.${copy ? " There's a copy in the video's folder too." : ""} `;
      if (copy && /Mac/.test(navigator.platform)) {
        const reveal = Object.assign(document.createElement("button"), { type: "button", className: "share_reveal", textContent: "Show in Finder" });
        reveal.addEventListener("click", () =>
          fetch("/api/reveal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: copy }) }).catch(() => {}),
        );
        note.append(reveal);
      }
    } catch (err) {
      if (!note) return;
      note.textContent = err.fromStudio ? err.message : "Couldn't reach the studio. In Claude Code, run /video-studio:dashboard and try again.";
      note.classList.add("is-error");
    } finally {
      link.textContent = label;
      link.removeAttribute("aria-busy");
    }
  });

  // ───────── show a file in Finder ─────────
  document.addEventListener("click", (e) => {
    const button = e.target.closest?.("[data-reveal]");
    if (!button) return;
    fetch("/api/reveal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: button.dataset.reveal }) }).catch(() => {});
  });

  // ───────── the library ─────────
  // A choice of brand, size or type reloads the page, and a category or one of an item's sizes opens another: each
  // opens where this one was, rather than at the top.
  const PLACE = "wvs-library-place";
  const keepPlace = () => {
    try {
      sessionStorage.setItem(PLACE, JSON.stringify({ y: Math.round(scrollY), at: Date.now() }));
    } catch {}
  };
  try {
    const kept = JSON.parse(sessionStorage.getItem(PLACE) || "null");
    sessionStorage.removeItem(PLACE);
    if (kept && Date.now() - kept.at < 15000 && location.pathname.startsWith("/library/") && !location.hash) {
      const back = () => scrollTo(0, Math.min(kept.y, document.documentElement.scrollHeight - innerHeight));
      back();
      // again once the page has its full height (the previews' frames are sized before they load, so it's close)
      addEventListener("load", back, { once: true });
    }
  } catch {}
  document.addEventListener("click", (e) => {
    const link = e.target.closest?.("a.libnav_link, a.gsize");
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) keepPlace();
  });
  document.querySelectorAll("[data-library-controls]").forEach((form) =>
    form.addEventListener("change", () => {
      const params = new URLSearchParams(new FormData(form));
      if (!params.get("brand")) params.delete("brand");
      if (params.get("size") === "16x9") params.delete("size");
      if (!["free", "favourites"].includes(params.get("type"))) params.delete("type");
      if (!params.get("vars")) params.delete("vars");
      // the search goes along to the reloaded page
      const q = document.querySelector("[data-lib-search]")?.value.trim();
      if (q) params.set("q", q);
      keepPlace();
      const query = params.toString();
      location.assign(location.pathname + (query ? `?${query}` : ""));
    }),
  );

  // previews play only while on screen, so a page of them stays light
  const previews = [...document.querySelectorAll(".gframe iframe")];
  const tell = (frame, message) => frame.contentWindow?.postMessage(message, location.origin);
  if (previews.length && "IntersectionObserver" in window) {
    const seen = new IntersectionObserver((entries) => entries.forEach((e) => tell(e.target, e.isIntersecting ? "play" : "pause")), { rootMargin: "120px" });
    previews.forEach((f) => f.addEventListener("load", () => seen.observe(f), { once: true }));
  }

  // the full library: unlock it with a licence key, or check for new items
  const licence = async (body, result, button) => {
    button.disabled = true;
    result.textContent = body.key ? "Checking the key…" : "Checking for new items…";
    try {
      const res = await fetch("/api/licence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const answer = await res.json();
      if (answer.ok) {
        result.textContent = answer.updated ? `Unlocked: ${answer.items} items. Reloading…` : "Up to date.";
        if (answer.updated || body.key) setTimeout(() => location.reload(), 900);
      } else result.textContent = answer.message || "That didn't work. Try again in a moment.";
    } catch {
      result.textContent = "The studio couldn't be reached. Is it still running?";
    }
    button.disabled = false;
  };
  document.querySelectorAll("form[data-licence]").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const key = new FormData(form).get("key");
      licence({ key }, form.parentElement.querySelector("[data-licence-result]"), form.querySelector("button"));
    }),
  );
  document.querySelectorAll("[data-licence-check]").forEach((button) =>
    button.addEventListener("click", () => licence({}, button.closest("[data-licence-panel]").querySelector("[data-licence-result]"), button)),
  );

  document.querySelectorAll("[data-replay]").forEach((button) =>
    button.addEventListener("click", () => document.querySelectorAll(".gstage iframe, .gsizes iframe").forEach((f) => tell(f, "replay"))),
  );

  // (on the document, so a button drawn later, in a checklist that redraws itself, copies too)
  document.addEventListener("click", async (e) => {
    const button = e.target.closest?.("[data-copy]");
    if (!button || button.dataset.copying) return;
    const label = button.textContent;
    button.dataset.copying = "1";
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select the text above to copy it";
    }
    setTimeout(() => {
      button.textContent = label;
      delete button.dataset.copying;
    }, 2000);
  });

  // ───────── setup and health ─────────
  // The checklist asks the studio again every few seconds while it's on screen (setup's more often) and redraws the
  // parts that changed: a tool installed ticks off, one being installed says so.
  document.querySelectorAll("[data-checks]").forEach((panel) => {
    const view = panel.dataset.checks;
    let busy = false;
    setInterval(async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const { parts } = await (await fetch(`/api/checks?view=${encodeURIComponent(view)}`, { cache: "no-store" })).json();
        const have = [...panel.querySelectorAll(":scope > [data-part]")];
        if (have.length !== parts.length || have.some((el, i) => el.dataset.part !== parts[i].name)) panel.innerHTML = parts.map((x) => x.html).join("");
        else parts.forEach((x, i) => have[i].dataset.sig !== x.sig && (have[i].outerHTML = x.html));
      } catch {
      } finally {
        busy = false;
      }
    }, view === "setup" ? 3000 : 10000);
  });
  document.querySelectorAll("[data-whatsnew]").forEach((card) =>
    card.querySelector("[data-whatsnew-done]")?.addEventListener("click", async () => {
      card.remove();
      try {
        await fetch("/api/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: card.dataset.whatsnew }) });
      } catch {}
    }),
  );

  // ───────── the library's search ─────────
  // The words typed filter the category's cards (each word in its code, name or what it's for), and say how many
  // match in the other categories, with links that carry the search there. "/" goes to the box from anywhere.
  const search = document.querySelector("[data-lib-search]");
  if (search) {
    const index = JSON.parse(document.getElementById("library-index")?.textContent || "{}");
    const cards = [...document.querySelectorAll("[data-lib-grid] > [data-search]")];
    const result = document.querySelector("[data-lib-result]");
    const here = search.dataset.category;
    const matches = (text, words) => words.every((w) => text.includes(w));
    const run = () => {
      const q = search.value.trim();
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const card of cards) {
        card.hidden = Boolean(words.length) && !matches(card.dataset.search, words);
        if (!card.hidden) shown++;
      }
      const url = new URL(location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
      result.replaceChildren();
      if (!words.length) return;
      result.append(`${shown ? `${shown} of ${cards.length}` : "None"} here match “${q}”.`);
      const elsewhere = {};
      for (const item of index.items || []) if (item.k !== here && matches(item.s, words)) elsewhere[item.k] = (elsewhere[item.k] || 0) + 1;
      const keys = Object.keys(index.categories || {}).filter((k) => elsewhere[k]);
      if (!keys.length) return;
      result.append(" Also in ");
      keys.forEach((k, i) => {
        const view = new URLSearchParams((index.view || "").replace(/^\?/, ""));
        view.set("q", q);
        const a = Object.assign(document.createElement("a"), { href: `/library/${k}/?${view}`, textContent: `${index.categories[k]} (${elsewhere[k]})` });
        result.append(i ? (i === keys.length - 1 ? " and " : ", ") : "", a);
      });
      result.append(".");
    };
    let timer = 0;
    search.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    if (search.value) run();
    addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      search.focus();
      search.select();
    });
  }

  // ───────── favourites ─────────
  // A star keeps an item in the studio's favourites (Claude suggests them first): pressed, it's in.
  document.addEventListener("click", async (e) => {
    const star = e.target.closest?.("[data-favourite]");
    if (!star) return;
    e.preventDefault();
    const on = star.getAttribute("aria-pressed") !== "true";
    try {
      const res = await fetch("/api/favourite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: star.dataset.favourite, on }) });
      if (!(await res.json()).ok) return;
      document.querySelectorAll(`[data-favourite="${CSS.escape(star.dataset.favourite)}"]`).forEach((el) => {
        el.setAttribute("aria-pressed", String(on));
        if (el.title) el.title = on ? "In your favourites" : "Add to your favourites";
        const label = el.querySelector("[data-favourite-label]");
        if (label) label.textContent = on ? "In your favourites" : "Add to favourites";
      });
    } catch {}
  });

  // ───────── try it with your words ─────────
  // An item's page plays it with the words and options given: the preview reloads with them (the sizes a moment
  // later), the address keeps them (so a brand or size choice does too), and the request to copy for Claude names them.
  document.querySelectorAll("form[data-try]").forEach((form) => {
    const example = JSON.parse(form.dataset.example || "{}");
    const stage = [...document.querySelectorAll(".gstage iframe")];
    const sizes = [...document.querySelectorAll(".gsizes iframe")];
    const links = [...document.querySelectorAll("a.gsize")];
    const ask = document.querySelector("[data-ask]");
    const askCopy = document.querySelector("[data-ask-copy]");
    const askStart = `Use ${form.dataset.code} (${form.dataset.name}) in my video`;
    const given = () => {
      const out = {};
      for (const el of form.elements) {
        if (!el.name || !Object.hasOwn(example, el.name)) continue;
        const v = el.type === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
        if (v !== null && String(v) !== String(example[el.name] ?? "")) out[el.name] = v;
      }
      return out;
    };
    const withVars = (href, json) => {
      const u = new URL(href, location.href);
      if (json) u.searchParams.set("vars", json);
      else u.searchParams.delete("vars");
      return u.pathname + u.search;
    };
    const reload = (frames, json) => frames.forEach((f) => {
      const next = withVars(f.getAttribute("src"), json);
      if (next !== f.getAttribute("src")) f.setAttribute("src", next);
    });
    let soon = 0;
    let later = 0;
    const apply = () => {
      const vars = given();
      const json = Object.keys(vars).length ? JSON.stringify(vars) : "";
      reload(stage, json);
      clearTimeout(later);
      later = setTimeout(() => reload(sizes, json), 1200);
      links.forEach((a) => a.setAttribute("href", withVars(a.getAttribute("href"), json)));
      history.replaceState(null, "", withVars(location.href, json));
      const controls = document.querySelector("[data-library-controls]");
      if (controls) {
        let hidden = controls.querySelector('input[name="vars"]');
        if (!hidden && json) controls.append((hidden = Object.assign(document.createElement("input"), { type: "hidden", name: "vars" })));
        if (hidden) hidden.value = json;
      }
      const settings = Object.entries(vars).map(([k, v]) => `${k} “${v}”`).join(", ");
      const text = settings ? `${askStart}, with ${settings}: ` : `${askStart}: `;
      if (ask) ask.textContent = `“${text}…”`;
      if (askCopy) askCopy.dataset.copy = text;
    };
    form.addEventListener("input", () => {
      clearTimeout(soon);
      soon = setTimeout(apply, 450);
    });
    form.addEventListener("submit", (e) => e.preventDefault());
    form.querySelector("[data-try-reset]")?.addEventListener("click", () => {
      for (const el of form.elements) if (el.name && Object.hasOwn(example, el.name)) el.value = example[el.name] ?? "";
      apply();
    });
    if (Object.keys(given()).length) apply();
  });

  // ───────── work in progress ─────────
  // While Claude makes something for a video, its overview shows the work as it happens: the steps, the count under way,
  // the newest frames and, in a video's review loop, Video Studio's own scores. The panel asks the studio every 1.5
  // seconds while the page is on screen and redraws only the parts that changed. When the work ends, live.js reloads
  // the page with what's new.
  document.querySelectorAll("[data-progress]").forEach((panel) => {
    let busy = false;
    const timer = setInterval(async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch(`/api/progress?video=${encodeURIComponent(panel.dataset.progress)}`, { cache: "no-store" });
        const state = await res.json();
        if (!state.active) return clearInterval(timer);
        panel.classList.toggle("is-quiet", Boolean(state.quiet));
        const have = [...panel.querySelectorAll(":scope > [data-part]")];
        if (have.length !== state.parts.length || have.some((el, i) => el.dataset.part !== state.parts[i].name)) panel.innerHTML = state.parts.map((x) => x.html).join("");
        else
          state.parts.forEach((x, i) => {
            const el = have[i];
            if (el.dataset.sig === x.sig) return;
            // the count's bar moves on rather than being drawn again, so it glides
            const next = Object.assign(document.createElement("template"), { innerHTML: x.html }).content.firstElementChild;
            const bar = el.querySelector(".making_bar span");
            if (x.name === "count" && bar && next.querySelector(".making_bar span")) {
              bar.style.width = next.querySelector(".making_bar span").style.width;
              el.querySelector(".making_bar").setAttribute("aria-valuenow", next.querySelector(".making_bar").getAttribute("aria-valuenow"));
              el.querySelector("p").textContent = next.querySelector("p").textContent;
              el.dataset.sig = x.sig;
            } else el.replaceWith(next);
          });
      } catch {
      } finally {
        busy = false;
      }
    }, 1500);
  });

  // ───────── a library item, on its chip ─────────
  // A chip ("W03 Big number") shows the item playing in the video's brand and size while it's hovered or focused, with
  // what the item is for: above the chip, or below it when there's no room. Moving away or Esc closes it; the pointer
  // can move onto it without it closing. On a touch screen the first tap shows it and a second opens the item.
  const chips = document.querySelectorAll("a.itemchip[data-pop]");
  if (chips.length) {
    const pop = document.createElement("div");
    pop.className = "itempop";
    pop.id = "itempop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    pop.innerHTML = `<div class="itempop_frame"><iframe title="Preview" tabindex="-1" aria-hidden="true"></iframe></div><div class="itempop_text"><p class="itempop_name"><b></b><span></span></p><p class="itempop_summary"></p></div>`;
    document.body.append(pop);
    const box = pop.querySelector(".itempop_frame");
    const frame = pop.querySelector("iframe");
    const summary = pop.querySelector(".itempop_summary");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const chipOf = (el) => (el instanceof Element ? el.closest("a.itemchip[data-pop]") : null);
    let chip = null;
    let pointer = "mouse";
    let showing = 0;
    let hiding = 0;
    frame.addEventListener("load", () => box.classList.add("is-ready"));
    // a click on it opens the item, as the chip does
    pop.addEventListener("click", () => chip && window.open(chip.href, "_blank", "noopener"));

    // above the chip, centred on it, clear of the masthead (and the scene strip); below it when there's no room
    const place = () => {
      if (!chip) return;
      const r = chip.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return hide(true);
      const gap = 8;
      const ceiling = Math.max(0, ...[masthead, strip].filter(Boolean).map((el) => el.getBoundingClientRect().bottom)) + gap;
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      let top = r.top - gap - h;
      pop.dataset.side = "above";
      if (top < ceiling) {
        top = Math.max(ceiling, Math.min(r.bottom + gap, innerHeight - h - gap));
        pop.dataset.side = "below";
      }
      pop.style.top = `${Math.round(top)}px`;
      pop.style.left = `${Math.round(Math.min(Math.max(gap, r.left + r.width / 2 - w / 2), innerWidth - w - gap))}px`;
    };

    const show = (target) => {
      clearTimeout(showing);
      clearTimeout(hiding);
      if (target === chip && !pop.hidden) return;
      chip?.removeAttribute("aria-describedby");
      chip = target;
      const d = target.dataset;
      const ratio = Number(d.ratio) || 16 / 9;
      box.style.setProperty("--ratio", String(ratio));
      box.style.setProperty("--ar", String(ratio));
      pop.querySelector(".itempop_name b").textContent = d.code || "";
      pop.querySelector(".itempop_name span").textContent = d.name || "";
      summary.textContent = d.summary || "";
      summary.hidden = !d.summary;
      // a new item loads; the same one again plays from the start
      if (frame.getAttribute("src") !== d.pop) {
        box.classList.remove("is-ready");
        frame.setAttribute("src", d.pop);
      } else if (!still.matches) tell(frame, "replay");
      pop.hidden = false;
      place(); // (its layout, before the class, lets it fade in)
      pop.classList.add("is-open");
      target.setAttribute("aria-describedby", pop.id);
    };

    function hide(now = false) {
      clearTimeout(showing);
      clearTimeout(hiding);
      const close = () => {
        if (!chip) return;
        chip.removeAttribute("aria-describedby");
        chip = null;
        pop.classList.remove("is-open");
        tell(frame, "pause");
        setTimeout(() => !chip && (pop.hidden = true), 160);
      };
      if (now) close();
      else hiding = setTimeout(close, 120);
    }

    addEventListener("pointerdown", (e) => (pointer = e.pointerType || "mouse"), { capture: true, passive: true });
    document.addEventListener("pointerover", (e) => {
      pointer = e.pointerType || "mouse";
      if (pointer === "touch") return;
      const target = chipOf(e.target);
      if (target) {
        clearTimeout(hiding);
        if (target === chip) return;
        clearTimeout(showing);
        // a moment's pause first, so passing over a chip doesn't flash it; straight away when one is already open
        showing = setTimeout(() => show(target), chip ? 0 : 140);
      } else if (pop.contains(e.target)) clearTimeout(hiding);
    });
    document.addEventListener("pointerout", (e) => {
      if ((e.pointerType || "mouse") === "touch") return;
      const from = chipOf(e.target) || (pop.contains(e.target) ? pop : null);
      const to = e.relatedTarget;
      if (!from || (to instanceof Node && (from.contains(to) || pop.contains(to) || chipOf(to) === chip))) return;
      clearTimeout(showing);
      if (chip) hide();
    });
    document.addEventListener("focusin", (e) => {
      const target = chipOf(e.target);
      if (target && pointer !== "touch") show(target);
    });
    document.addEventListener("focusout", (e) => {
      if (chip && chipOf(e.target) === chip && !chip.matches(":hover")) hide();
    });
    document.addEventListener("click", (e) => {
      const target = chipOf(e.target);
      if (target && pointer === "touch" && target !== chip) {
        e.preventDefault();
        show(target);
      } else if (chip && !target && !pop.contains(e.target)) hide(true);
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && chip && hide(true));
    addEventListener("scroll", () => chip && requestAnimationFrame(place), { passive: true });
    addEventListener("resize", () => chip && place());
  }
})();
