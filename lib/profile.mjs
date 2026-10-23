// lib/profile.mjs - the PERSON's settings follow the person (docs/dev/MULTI_DEVICE.md
// "Settings: the person's or this computer's").
//
// config.json is this computer's file (lib/datadir.mjs). Some of what is in it
// is about the PERSON, not the computer: their name, their own email addresses
// (they decide which calendars start shown: lib/sources.mjs calendarDefaultOn),
// their home time zone, locale, currency, week start, working hours, birthday,
// AI and brief preferences... A second computer that joins must not start with
// other defaults (a calendar of someone else's address shown on one computer,
// hidden on the other).
//
// So the person's keys (PERSON_KEYS) are copied into <data>/profile.json, a
// synced file (lib/sync/manifest.mjs, role 'shared': any device may change it,
// field by field, later change wins); this computer's keys (LOCAL_KEYS: paths,
// the place its weather is for, its notifications, its first-run marker; and
// the computer parts of PERSON_PART keys: the zone it shows, its browser
// location switch, how Enable Banking returns to it) never leave it.
//   - every config save writes profile.json (the server's ctx.setConfig, server/index.mjs, calls writeProfile)
//   - a profile.json that sync brings in is applied to config.json (applyProfile;
//     server/routes/sync.mjs on engine.onApplied)
//   - the first time, only the keys that differ from the defaults are written, so
//     a fresh computer never overwrites the other's choices with its blank ones
//     (a device that JOINS writes its first changes under the others' anyway:
//     docs/dev/SYNC_FORMAT.md section 2).
//
// Node stdlib only.

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readJson, writeJson, withLock } from './fsutil.mjs';

export const PROFILE_REL = 'profile.json';
/** key -> why it follows the person. */
export const PERSON_KEYS = Object.freeze({
  userName: 'your name',
  myEmails: 'your own addresses: which calendars and mail are yours (calendar defaults)',
  timezone: 'your HOME time zone (where you live; the zone this computer shows is `time`, below)',
  locale: 'how dates and numbers are written for you',
  currency: 'your currency',
  weekStart: 'the day your week starts',
  workHours: 'your working day (free-time sums)',
  birthday: 'your birthday (day and month)',
  theme: 'your default theme for a new screen',
  ai: 'your AI model, effort and style choices',
  features: 'which features you switched off (finance, calendar, email, AI)',
  brief: 'your Morning brief, Finish the day and story settings',
  appIcon: 'your workspace icon',
  // ── prefs ── (2.16) travel and the weather place follow the person too; see PERSON_PART for the parts that stay
  travel: 'your travel features (on, prompts, moments, holidays, rates, the second clock); the browser-location switch stays on each computer',
  locationMode: "use a typed place for the weather, or each computer's own location",
  manualLocation: 'the place you typed for the weather',
  time: 'how clocks are drawn (12 or 24 hours); which zone each computer shows stays its own',
  // ── end prefs ──
  // (2.15.2) Finances' AI choices, field by field; how Enable Banking returns to a computer stays on it (PERSON_PART)
  finance: "your finance choices: Claude's wording of the money brief and the money story (on or off, its models), the bank country",
});
/**
 * Keys only PART of which follows the person: personPart(value) is what goes
 * into profile.json, mergeLocal(synced, local) puts this computer's own part
 * back when it is applied here.
 */
const PERSON_PART = Object.freeze({
  // The browser's location permission is per browser: sources.geo stays.
  travel: {
    personPart: (v) => { if (!isObj(v)) return undefined; const { sources, ...rest } = v; const { geo, ...src } = isObj(sources) ? sources : {}; return { ...rest, sources: src }; },
    mergeLocal: (v, cur) => ({ ...v, sources: { ...(isObj(v.sources) ? v.sources : {}), geo: !!(isObj(cur) && isObj(cur.sources) && cur.sources.geo === true) } }),
  },
  // Which zone this computer shows (follow the system, a fixed zone, a trip) stays; the 12/24-hour choice travels.
  time: {
    personPart: (v) => (isObj(v) && typeof v.clock12 === 'boolean' ? { clock12: v.clock12 } : undefined),
    mergeLocal: (v, cur) => { const out = { ...(isObj(cur) ? cur : { follow: 'system' }) }; if (typeof v.clock12 === 'boolean') out.clock12 = v.clock12; return out; },
  },
  // Enable Banking's return page (paste or bounce) belongs to the Enable Banking app saved on
  // THIS computer (its sign-in is in this computer's secrets): it stays; the AI choices travel.
  finance: {
    personPart: (v) => { if (!isObj(v)) return undefined; const { ebRedirect, ...rest } = v; return rest; },
    mergeLocal: (v, cur) => ({ ...(isObj(cur) ? cur : {}), ...v, ebRedirect: isObj(cur) && cur.ebRedirect === 'bounce' ? 'bounce' : 'paste' }),
  },
});
/** key -> why it stays on this computer. */
export const LOCAL_KEYS = Object.freeze({
  version: 'the file format of this computer\'s config.json',
  financeDir: 'a folder path on this computer',
  onboardedAt: 'when the first-run set-up finished on this computer',
  notifications: 'browser notifications on this screen (the permission is per browser)',
  location: "the place the weather is for on this computer: the typed place (locationMode manual, it follows manualLocation) or this computer's own",
  // (time, travel and finance: only their computer parts stay, PERSON_PART above)
});
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const stable = (v) => JSON.stringify(v, (k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x));

const partOf = (k, v) => (PERSON_PART[k] ? PERSON_PART[k].personPart(v) : v);
/**
 * The person's part of a (validated) config. onlyChanged: leave out what equals
 * the defaults (true: every key; a Set: only those keys).
 */
export function personOf(config, { defaults = null, onlyChanged = false } = {}) {
  const out = {};
  for (const k of Object.keys(PERSON_KEYS)) {
    if (!config || config[k] === undefined) continue;
    const v = partOf(k, config[k]);
    if (v === undefined) continue;
    const skipDefault = onlyChanged === true || (onlyChanged instanceof Set && onlyChanged.has(k));
    if (skipDefault && defaults && stable(v) === stable(partOf(k, defaults[k]))) continue;
    out[k] = v;
  }
  return out;
}

const fileOf = (dataDir) => join(dataDir, PROFILE_REL);

/**
 * Write profile.json from this computer's config (after a save, and at start).
 * The first time (no file yet) only what differs from the defaults. Under the
 * file's lock (the one sync takes too); unchanged content is not rewritten.
 */
export async function writeProfile(dataDir, config, { defaults = null } = {}) {
  const f = fileOf(dataDir);
  return withLock(f, async () => {
    const had = existsSync(f);
    const cur = had ? await readJson(f, { fallback: null }).catch(() => null) : null;
    // A key profile.json does not have yet (a new file, or a key added in a later
    // version) is written only when it differs from the defaults: an updated
    // computer never overwrites the other's choice with its own blank one.
    const fresh = new Set(Object.keys(PERSON_KEYS).filter(k => !(had && isObj(cur) && Object.prototype.hasOwnProperty.call(cur, k))));
    const next = { version: 1, ...(had && isObj(cur) ? cur : {}), ...personOf(config, { defaults, onlyChanged: fresh }) };
    if (had && stable(next) === stable(cur)) return false;
    await writeJson(f, next, { trailingNewline: true });
    return true;
  });
}

/** profile.json as it is now: the person's keys only (already in their person form), or null. */
export async function readProfile(dataDir) {
  const v = await readJson(fileOf(dataDir), { fallback: null }).catch(() => null);
  if (!isObj(v)) return null;
  const out = {};
  for (const k of Object.keys(PERSON_KEYS)) if (v[k] !== undefined) out[k] = v[k];
  return out;
}

/**
 * Bring this computer's config in line with profile.json (after sync brought
 * a new one in). setConfig(patch) saves and validates (the server's
 * ctx.setConfig); getConfig() is the current config. -> the keys that changed.
 */
export async function applyProfile(dataDir, { getConfig, setConfig, log = () => {} }) {
  const p = await readProfile(dataDir);
  if (!p) return [];
  const cur = getConfig() || {};
  const patch = {};
  for (const [k, v] of Object.entries(p)) {
    if (PERSON_PART[k]) { if (isObj(v) && stable(v) !== stable(partOf(k, cur[k]))) patch[k] = PERSON_PART[k].mergeLocal(v, cur[k]); continue; }
    if (stable(v) !== stable(cur[k])) patch[k] = v;
  }
  // The typed weather place is used here too when the person chose it (locationMode manual).
  const mode = patch.locationMode !== undefined ? patch.locationMode : cur.locationMode;
  const typed = patch.manualLocation !== undefined ? patch.manualLocation : cur.manualLocation;
  if ((patch.locationMode !== undefined || patch.manualLocation !== undefined) && mode !== 'device' && isObj(typed) && stable(typed) !== stable(cur.location)) patch.location = typed;
  const keys = Object.keys(patch);
  if (!keys.length) return [];
  try { await setConfig(patch); }
  catch (e) { log('warn', `profile: settings from your other computer could not be used (${(e && e.message) || e})`); return []; }
  log('note', `profile: ${keys.length} setting${keys.length === 1 ? '' : 's'} from your other computer (${keys.join(', ')})`);
  return keys;
}
