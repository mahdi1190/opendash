// lib/agent-settings.mjs - the ordinary preferences the agent may change (set_setting), and the undo notes for those
// that live in config.json.
//
// An allow-list on purpose: every key here is display or routine. Left out, whatever anyone asks:
//   ai.style            it goes into every prompt, so an email could plant lasting instructions
//   userName            it goes into the system prompt and to friends
//   ai.* / model        which AI runs and what it costs
//   currency, features  they change what the money pages mean or hide whole sections
//   financeDir, location, myEmails, time, travel, appIcon, onboardedAt
//
// Config keys are saved through the settings route's own code: PUT /api/config (or, with no dashboard running,
// saveConfig), so validateConfig in lib/datadir.mjs decides. The checks here only stop a wrong value being silently
// replaced by a default, which is what validateConfig does for many fields.

import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readJson, writeJson, withLock } from './fsutil.mjs';

const bool = { type: 'boolean' };
const one = (...options) => ({ type: 'string', options });
const int = (min, max) => ({ type: 'integer', min, max });

export const SETTINGS = Object.freeze({
  // Appearance (kept in the state; server/actions/ops-agent.mjs setting.set)
  theme: { kind: 'state', label: 'Theme', ...one('light', 'dark', 'auto'), help: 'light, dark, or follow the time of day' },
  density: { kind: 'state', label: 'Row spacing', ...one('normal', 'compact') },
  funLevel: { kind: 'state', label: 'Fun level', ...one('off', 'subtle', 'full'), help: 'how much the game, garden and pet celebrate' },
  // Region
  locale: { kind: 'config', path: 'locale', label: 'Language and date format', type: 'string', pattern: /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, help: 'a locale such as en-GB' },
  timezone: { kind: 'config', path: 'timezone', label: 'Home time zone', type: 'string', pattern: /^[A-Za-z0-9_+\-/]{1,64}$/, help: 'an IANA zone such as Europe/London' },
  weekStart: { kind: 'config', path: 'weekStart', label: 'First day of the week', ...one('Mon', 'Sun', 'Sat') },
  units: { kind: 'config', path: 'brief.units', label: 'Temperature units', ...one('metric', 'imperial') },
  // Notifications
  notifications: { kind: 'config', path: 'notifications.enabled', label: 'Browser notifications', ...bool },
  dueDigest: { kind: 'config', path: 'notifications.dueDigest', label: 'Daily "what is due" notification', ...bool },
  eventLeadMin: { kind: 'config', path: 'notifications.eventLeadMin', label: 'Minutes of warning before an event (0 = off)', ...int(0, 120) },
  // Morning brief
  briefAutoOpen: { kind: 'config', path: 'brief.autoOpen', label: 'Open the Morning brief on the first visit each day', ...bool },
  briefAi: { kind: 'config', path: 'brief.ai', label: 'The short AI summary in the brief', ...bool },
  eveningHour: { kind: 'config', path: 'brief.eveningHour', label: 'Hour from which "Finish the day" is offered', ...int(12, 23) },
  animations: { kind: 'config', path: 'brief.animations', label: 'Weather and content animations', ...bool },
  celebrate: { kind: 'config', path: 'brief.celebrate', label: 'A small animation when a task is finished', ...bool },
  // Stories
  storyAutoOpen: { kind: 'config', path: 'brief.story.autoOpen', label: 'Open the first brief of the day as a story', ...bool },
  storyVoice: { kind: 'config', path: 'brief.story.voice', label: 'Read stories out loud', ...bool },
  storySpeed: { kind: 'config', path: 'brief.story.speed', label: 'Story speed', type: 'number', numbers: [0.8, 1, 1.25] },
  weekOpen: { kind: 'config', path: 'brief.story.weekOpen', label: 'How Review > Week opens', ...one('story', 'page') },
});

export const settingDef = (key) => (typeof key === 'string' && Object.hasOwn(SETTINGS, key) ? SETTINGS[key] : null);

/** A plain sentence when the value does not fit, else ''. */
export function settingCheck(def, v) {
  if (def.options) return def.options.includes(v) ? '' : `${def.label} can be: ${def.options.join(', ')}`;
  if (def.type === 'boolean') return typeof v === 'boolean' ? '' : `${def.label} is on or off (true or false)`;
  if (def.type === 'integer') return Number.isInteger(v) && v >= def.min && v <= def.max ? '' : `${def.label} must be a whole number from ${def.min} to ${def.max}`;
  if (def.numbers) return def.numbers.includes(v) ? '' : `${def.label} can be: ${def.numbers.join(', ')}`;
  if (def.type === 'string') return typeof v === 'string' && def.pattern.test(v) ? '' : `${def.label}: ${def.help || 'that value is not valid'}`;
  return 'That value is not valid.';
}

/** What get_settings shows for one key, from the state and the config. */
export function settingValue(key, def, { state = {}, config = {} }) {
  if (def.kind === 'config') return readPath(config, def.path);
  if (key === 'theme') return state.autoTheme ? 'auto' : (state.theme === 'dark' ? 'dark' : 'light');
  if (key === 'density') return state.density === 'compact' ? 'compact' : 'normal';
  if (key === 'funLevel') return (state.game && state.game.prefs && state.game.prefs.fun) || 'subtle';
  return null;
}
export const readPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
/** {brief: {story: {voice: v}}} from 'brief.story.voice'. */
export const patchFor = (path, v) => path.split('.').reverse().reduce((val, k) => ({ [k]: val }), v);

// ─── Undo notes for config settings (<data>/agent-undo.json) ───────────────
const KEEP = 50, MAX_AGE = 7 * 864e5;
const noteFile = (dataDir) => join(dataDir, 'agent-undo.json');

export async function noteSettingUndo(dataDir, { key, before, after, summary }) {
  const token = 'set-' + randomBytes(9).toString('base64url');
  const file = noteFile(dataDir);
  await withLock(file, async () => {
    const d = await readJson(file, { fallback: { notes: [] } }).catch(() => ({ notes: [] }));
    const now = Date.now();
    const notes = (Array.isArray(d && d.notes) ? d.notes : []).filter(n => n && now - n.at < MAX_AGE).slice(-(KEEP - 1));
    notes.push({ token, key, before, after, summary, at: now });
    await writeJson(file, { notes });
  });
  return token;
}
/** Take a note out (one use) -> the note | null. */
export async function takeSettingUndo(dataDir, token) {
  const file = noteFile(dataDir);
  return withLock(file, async () => {
    const d = await readJson(file, { fallback: { notes: [] } }).catch(() => ({ notes: [] }));
    const notes = Array.isArray(d && d.notes) ? d.notes : [];
    const n = notes.find(x => x && x.token === token) || null;
    if (n) await writeJson(file, { notes: notes.filter(x => x !== n) });
    return n;
  });
}
