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
// this computer's zone and trips, its weather place, its notifications, its
// first-run marker) never leave it.
//   - every config save writes profile.json (saveConfig in lib/datadir.mjs calls writeProfile)
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
});
/** key -> why it stays on this computer. */
export const LOCAL_KEYS = Object.freeze({
  version: 'the file format of this computer\'s config.json',
  financeDir: 'a folder path on this computer',
  onboardedAt: 'when the first-run set-up finished on this computer',
  notifications: 'browser notifications on this screen (the permission is per browser)',
  location: 'the weather place of this computer (it moves with the computer, like its zone and trips)',
  locationMode: 'whether this computer uses its own location',
  manualLocation: 'the place typed in on this computer',
  time: 'which zone this computer shows (follow the system, a trip), and how its clock is drawn',
  travel: 'travel features of this computer (its location, its trips)',
});
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const stable = (v) => JSON.stringify(v, (k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x));

/** The person's part of a (validated) config. onlyChanged: leave out what equals the defaults. */
export function personOf(config, { defaults = null, onlyChanged = false } = {}) {
  const out = {};
  for (const k of Object.keys(PERSON_KEYS)) {
    if (!config || config[k] === undefined) continue;
    if (onlyChanged && defaults && stable(config[k]) === stable(defaults[k])) continue;
    out[k] = config[k];
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
    const next = { version: 1, ...(had && isObj(cur) ? cur : {}), ...personOf(config, { defaults, onlyChanged: !had }) };
    if (had && stable(next) === stable(cur)) return false;
    await writeJson(f, next, { trailingNewline: true });
    return true;
  });
}

/** profile.json as it is now: the person's keys only, or null. */
export async function readProfile(dataDir) {
  const v = await readJson(fileOf(dataDir), { fallback: null }).catch(() => null);
  return isObj(v) ? personOf(v) : null;
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
  for (const [k, v] of Object.entries(p)) if (stable(v) !== stable(cur[k])) patch[k] = v;
  const keys = Object.keys(patch);
  if (!keys.length) return [];
  try { await setConfig(patch); }
  catch (e) { log('warn', `profile: settings from your other computer could not be used (${(e && e.message) || e})`); return []; }
  log('note', `profile: ${keys.length} setting${keys.length === 1 ? '' : 's'} from your other computer (${keys.join(', ')})`);
  return keys;
}
