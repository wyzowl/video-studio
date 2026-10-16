// The full library: the paid items, unlocked by a licence key. The plugin carries every paid item's name, description
// and preview stills (library/catalogue.json and library/previews/), so the library shows them locked. A licence key
// unlocks them: once a day the studio asks the Wyzowl site for the current pack, downloads it only when its version
// has changed, checks it, and unpacks its items into ~/.wyzowl-video-studio/library/, where the library reads them
// beside the free ones. The licence, this Mac's id and the items are this user's, kept outside any studio folder.
import { createHash, randomUUID } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES } from "./categories.mjs";
import { PLUGIN_ROOT, USER_DIR, pluginVersion, readJSON } from "./studio.mjs";

/** The unpacked paid items, in folders by category, with pack.json noting the pack they came from. */
export const PAID_DIR = join(USER_DIR, "library");
const LICENCE = join(USER_DIR, "licence.json");
const DEVICE = join(USER_DIR, "device");
const CATALOGUE = join(PLUGIN_ROOT, "library", "catalogue.json");
export const PREVIEWS_DIR = join(PLUGIN_ROOT, "library", "previews");
// a check is due once a day; a little under, so a session at the same time each morning still checks
const DAY = 20 * 60 * 60 * 1000;

/** The paid items' notes (locked or not), and where to buy and check: { api, buy, items: [...] }. */
export function catalogue() {
  const data = readJSON(CATALOGUE, null);
  return { api: "", buy: "", items: [], ...(data && typeof data === "object" ? data : {}) };
}

/** This Mac's licence, as the last check left it: { key, status, message, version, items, checked }, or null. */
export function licence() {
  return readJSON(LICENCE, null);
}

/** The pack whose items are unpacked here: { version, items, installed, skipped }, or null. */
export function installedPack() {
  return readJSON(join(PAID_DIR, "pack.json"), null);
}

/** A key as people type it: trimmed, capitals, any spaces gone. */
export const normaliseKey = (key) => String(key || "").trim().toUpperCase().replace(/\s+/g, "");

/** A random id for this Mac, made the first time it's needed. It isn't tied to the hardware. */
export function deviceId() {
  try {
    const id = readFileSync(DEVICE, "utf8").trim();
    if (/^[0-9a-f-]{36}$/.test(id)) return id;
  } catch {}
  const id = randomUUID();
  mkdirSync(USER_DIR, { recursive: true });
  writeFileSync(DEVICE, `${id}\n`);
  return id;
}

/** Whether the daily check is due: there's a key, and the last check was a day ago or more. */
export function checkDue(now = Date.now()) {
  const l = licence();
  if (!l?.key) return false;
  const last = Date.parse(l.checked || "");
  return !Number.isFinite(last) || now - last > DAY;
}

function saveLicence(data) {
  mkdirSync(USER_DIR, { recursive: true });
  writeFileSync(LICENCE, `${JSON.stringify(data, null, 2)}\n`);
}

/** Remove the paid items from this Mac (a revoked or invalid licence). */
function removeItems() {
  rmSync(PAID_DIR, { recursive: true, force: true });
}

const newer = (need, have) => {
  const a = String(need).split(".").map(Number);
  const b = String(have).split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return false;
};

/** A downloaded pack (gzipped JSON) → its items written into PAID_DIR, swapped in whole so a half-written pack never
    shows. Items that need a newer plugin than this one are left out, and listed. */
function unpack(buffer, version) {
  const raw = buffer[0] === 0x1f && buffer[1] === 0x8b ? gunzipSync(buffer) : buffer;
  const pack = JSON.parse(raw.toString("utf8"));
  if (!pack || !Array.isArray(pack.items)) throw new Error("the pack has no items");
  const next = `${PAID_DIR}.new`;
  rmSync(next, { recursive: true, force: true });
  let count = 0;
  const skipped = [];
  for (const item of pack.items) {
    const name = String(item?.file || "");
    if (!Object.hasOwn(CATEGORIES, item?.category) || !/^[a-z0-9][a-z0-9-]*\.html$/.test(name) || typeof item.html !== "string") continue;
    if (item.needs && newer(item.needs, pluginVersion())) {
      skipped.push({ code: item.code, needs: item.needs });
      continue;
    }
    mkdirSync(join(next, item.category), { recursive: true });
    writeFileSync(join(next, item.category, name), item.html);
    count += 1;
  }
  writeFileSync(join(next, "pack.json"), `${JSON.stringify({ version, items: count, skipped, installed: new Date().toISOString() }, null, 2)}\n`);
  const old = `${PAID_DIR}.old`;
  rmSync(old, { recursive: true, force: true });
  try {
    renameSync(PAID_DIR, old);
  } catch {}
  renameSync(next, PAID_DIR);
  rmSync(old, { recursive: true, force: true });
  return { count, skipped };
}

const MESSAGES = {
  invalid: "That licence key isn't valid. Check it, or contact Wyzowl for help.",
  revoked: "This licence has been cancelled.",
  device_limit: "This licence is already in use on as many Macs as it allows.",
};

/** Ask the Wyzowl site for the current pack: with `key`, to start using a new key; otherwise for the key this Mac has.
    Downloads and unpacks the pack when its version is new (or with `force`). Resolves to { status, message, version,
    items, updated }: status is ok, invalid, revoked, device_limit, unreachable, none (no key yet) or unavailable (the
    full library isn't on sale yet). */
export async function checkLibrary({ key = "", force = false } = {}) {
  const saved = licence();
  const fresh = normaliseKey(key);
  const use = fresh || saved?.key || "";
  if (!use) return { status: "none", message: "There's no licence key on this Mac yet." };
  const api = process.env.WVS_LIBRARY_API || catalogue().api;
  if (!api) return { status: "unavailable", message: "The full library isn't on sale yet." };
  const have = installedPack()?.version || "";
  const now = new Date().toISOString();

  let reply;
  try {
    const res = await fetch(api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: use, device: deviceId(), version: have, plugin: pluginVersion() }),
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json();
    // Bubble wraps what a workflow returns in { status: "success", response: {...} }
    reply = body?.response && typeof body.response === "object" ? body.response : body;
  } catch {
    // offline, or the site is down: keep what's here (and a new key, to try again, unless a working one is here), and
    // check again next time
    if (fresh && fresh !== saved?.key && saved?.status !== "active") saveLicence({ key: fresh, status: "pending", message: "", checked: "" });
    return { status: "unreachable", message: "The Wyzowl site couldn't be reached. The studio will try again tomorrow." };
  }

  const status = String(reply?.status || "");
  if (status === "ok") {
    const version = String(reply.version || "");
    let updated = false;
    let count = installedPack()?.items || 0;
    if (version && (version !== have || force)) {
      try {
        // Bubble's file addresses start with //: they take the API's own scheme (https, or http for a local test)
        const url = String(reply.url || "").replace(/^\/\//, `${new URL(api).protocol}//`);
        if (!/^https?:\/\//.test(url)) throw new Error("no address for the pack");
        const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
        if (!res.ok) throw new Error(`the download failed (${res.status})`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const sum = createHash("sha256").update(buffer).digest("hex");
        if (reply.sha256 && String(reply.sha256).toLowerCase() !== sum) throw new Error("the download didn't match its checksum");
        count = unpack(buffer, version).count;
        updated = true;
      } catch (err) {
        saveLicence({ key: use, status: "active", message: `The new items couldn't be downloaded (${err.message}). The studio will try again tomorrow.`, version: have, items: count, checked: now });
        return { status: "unreachable", message: `The new items couldn't be downloaded: ${err.message}.` };
      }
    }
    saveLicence({ key: use, status: "active", message: "", version: version || have, items: count, checked: now });
    return { status: "ok", message: "", version: version || have, items: count, updated };
  }

  const message = String(reply?.message || MESSAGES[status] || "The Wyzowl site sent an answer the studio didn't understand.");
  if (fresh && fresh !== saved?.key && saved?.status === "active") {
    // a mistyped new key: keep the licence that works
    return { status: status || "error", message };
  }
  if (status === "invalid" || status === "revoked" || status === "device_limit") {
    removeItems();
    saveLicence({ key: use, status, message, version: "", items: 0, checked: now });
  }
  return { status: status || "error", message };
}
