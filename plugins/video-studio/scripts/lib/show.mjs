// How Claude shows a studio page: its message starts with a labelled link to the page, on a line of its own, then says
// what's ready; for a script, storyboard or video, Claude then waits in the background for the user's review. Nothing
// opens the page for them and there's no card: the link is the one way in, in every message with something new to
// review. Used by `studio.mjs show` and the page-ready hook, so both say the same thing.
import { join } from "node:path";
import { PLUGIN_ROOT } from "./studio.mjs";

export const pageUrl = (base, path) => base.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`);

const LINKS = { dashboard: "Open the dashboard", brand: "Open the brand page", project: "Open the video overview", delivery: "Open the delivery page", library: "Open the library", sfx: "Open SFX Kit" };
/** The labelled link to a page, as Claude writes it in the chat. */
export function pageLink(base, page) {
  const label = LINKS[page.kind] || { script: `Open script v${page.version}`, storyboard: `Open storyboard v${page.version}`, review: `Open video v${page.version}`, item: `Open ${page.code}` }[page.kind] || "Open the page";
  return `[${label} ↗](${pageUrl(base, page.path)})`;
}

/** What Claude should do to show a page now. */
export function showInstructions(root, base, page) {
  const helper = `node "${join(PLUGIN_ROOT, "scripts", "studio.mjs")}"`;
  const waits = ["script", "storyboard", "review"].includes(page.kind) && page.latest;
  return [
    `Wyzowl Video Studio: ${page.label} is ready to show: ${pageUrl(base, page.path)}`,
    `Show it to the user now: start your message with this link, on a line of its own, then say in a line or two what's ready: ${pageLink(base, page)}`,
    "The link is how they open it, so there's no need to open the page in a browser pane or draw a card for it.",
    waits &&
      `Then wait for their review in the background: run ${helper} wait ${page.path} --studio "${root}" with run_in_background. Tell them to press Approve and save when they're done (it says ${page.kind === "storyboard" ? "Send feedback" : "Send changes"} once there are notes) and you'll take it from there, then end your turn. When the wait finishes you're woken with their review. Saving it was their go-ahead, so carry on straight away.`,
    "Studio pages refresh themselves when their files change, so later edits don't need showing again.",
  ]
    .filter(Boolean)
    .join("\n");
}
