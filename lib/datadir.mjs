// lib/datadir.mjs - where a user's data lives, and its default contents.
//
// Everything user-specific sits in ONE folder (the "data dir"), so the app can
// be copied to someone else without any of it, and backed up as one unit:
//
//   <data>/config.json          userName, currency, locale, timezone, weekStart,
//                               theme defaults, AI model prefs, feature flags
//   <data>/connections.json     last known state of Claude + each connector
//   <data>/migrations.json      which tools/migrations have been applied
//   <data>/state/               dashboard-state.json, backups/ (rolling + daily/)
//   <data>/finance/             the finance pipeline (inbox/, _system/, reports...)
//   <data>/calendar/            calendar.json snapshot
//   <data>/email/               inbox.json snapshot
//   <data>/secrets/             Google OAuth client + tokens (optional)
//   <data>/logs/                server.log (rotated)
//   <data>/backups/             pre-migration copies made by tools/migrate.mjs
//
// Resolution order: --data-dir <dir>, then DASHBOARD_DATA_DIR, then <repo>/data.
// The default <repo>/data is gitignored.

import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { MODELS, EFFORTS } from './claude-runner.mjs';
import { BRIEF_DEFAULTS, normLocation, normBrief } from './brief-config.mjs';
import { planWorkHoursCheck } from './plan-logic.mjs';
import { normTravelConfig } from './travel-config.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Value of --name <v> or --name=<v> in argv. */
export function argValue(argv, name) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) return argv[i + 1];
    if (argv[i].startsWith(name + '=')) return argv[i].slice(name.length + 1);
  }
  return undefined;
}

export function resolveDataDir({ argv = [], env = process.env, repoRoot = REPO_ROOT } = {}) {
  const fromArg = argValue(argv, '--data-dir');
  if (fromArg) return resolve(fromArg);
  if (env.DASHBOARD_DATA_DIR) return resolve(env.DASHBOARD_DATA_DIR);
  return join(repoRoot, 'data');
}

export function dataPaths(dataDir) {
  const root = resolve(dataDir);
  const stateDir = join(root, 'state');
  return {
    root,
    config: join(root, 'config.json'),
    connections: join(root, 'connections.json'),
    migrations: join(root, 'migrations.json'),
    stateDir,
    stateFile: join(stateDir, 'dashboard-state.json'),
    stateBackups: join(stateDir, 'backups'),
    stateDaily: join(stateDir, 'backups', 'daily'),
    finance: join(root, 'finance'),
    sources: join(root, 'sources.json'),
    calendar: join(root, 'calendar'),
    calendarFile: join(root, 'calendar', 'calendar.json'),
    email: join(root, 'email'),
    inboxFile: join(root, 'email', 'inbox.json'),
    secrets: join(root, 'secrets'),
    logs: join(root, 'logs'),
    serverLog: join(root, 'logs', 'server.log'),
    backups: join(root, 'backups'),
  };
}

// ─── config.json ───────────────────────────────────────────────────────────
const validTz = (tz) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return true; } catch { return false; } };

/** This computer's time zone (an IANA name such as 'America/New_York'), or 'UTC' when it cannot be read. */
export function systemTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === 'string' && tz && validTz(tz)) return tz;
  } catch { /* fall through */ }
  return 'UTC';
}

export const DEFAULT_CONFIG = Object.freeze({
  version: 1,
  userName: '',                       // '' -> the UI says "OpenDash" / "you"
  currency: 'GBP',
  locale: 'en-GB',
  timezone: systemTimeZone(),         // a new data folder starts on this computer's zone (never a fixed one)
  weekStart: 'Mon',                   // Mon | Sun | Sat
  theme: { default: 'light', auto: false },
  ai: {
    model: 'claude-haiku-4-5',        // quick jobs: suggestions, auto-link, probes
    chatModel: 'claude-opus-5-5',     // the in-app assistant
    effort: 'medium',
    style: '',                        // optional extra instruction for tone/voice
  },
  features: { finance: true, calendar: true, email: true, ai: true },
  financeDir: null,                   // null -> <data>/finance
  // Added by the Connections/Settings area (2.0):
  onboardedAt: null,                  // ISO time the first-run set-up finished (null: not yet)
  notifications: {
    enabled: false,                   // browser notifications while the dashboard is open
    dueDigest: true,                  // once a day: what is due today / overdue
    eventLeadMin: 10,                 // minutes before a calendar event (0 = off)
  },
  // Added by Sources (2.0): the user's own email addresses. Calendars named
  // after anyone else's address start hidden (lib/sources.mjs calendarDefaultOn).
  myEmails: [],
  // Added by Brief + Review (lib/brief-config.mjs): where the weather is for,
  // and the Morning brief / Finish the day settings.
  location: null,
  brief: BRIEF_DEFAULTS,
  // Added by planning (lib/plan-logic.mjs): the working day every free-time sum
  // uses, {start:'HH:MM', end:'HH:MM', days:[0-6, 0 = Sunday]}. null = 09:00-18:00, Mon-Fri.
  workHours: null,
  // Added by CLOCK (travel spec 2.1, 6.1): which zone the dashboard shows. timezone
  // above is the HOME zone. follow: 'system' (follow the computer) | 'home' | 'zone'
  // (+ zone); trip = {zone, until} for one trip; clock12 = 12-hour clocks.
  // 'home'/'zone'/trip apply once the page's override is ready (lib/clock.mjs).
  time: { follow: 'system' },
  // Added by the animation library (v2.2 wave 2): the user's birthday, day and month
  // only ('MM-DD'), for the seasons pack's birthday opening. null = not set.
  birthday: null,
});

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(base, over) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

const validLocale = (l) => { try { return Intl.DateTimeFormat.supportedLocalesOf([l]).length > 0; } catch { return false; } };

/**
 * Validate a (partial) config. Returns {config, errors}. Unknown top-level
 * keys are dropped; bad values are replaced by the default and reported.
 */
export function validateConfig(input) {
  const errors = [];
  const c = deepMerge(DEFAULT_CONFIG, isObj(input) ? input : {});
  const out = {};
  out.version = 1;
  out.userName = typeof c.userName === 'string' ? c.userName.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) : '';
  if (c.userName != null && typeof c.userName !== 'string') errors.push('userName must be text');
  out.currency = /^[A-Z]{3}$/.test(c.currency) ? c.currency : (errors.push('currency must be a 3-letter code like GBP'), DEFAULT_CONFIG.currency);
  out.locale = typeof c.locale === 'string' && validLocale(c.locale) ? c.locale : (errors.push('unknown locale'), DEFAULT_CONFIG.locale);
  out.timezone = typeof c.timezone === 'string' && validTz(c.timezone) ? c.timezone : (errors.push('unknown timezone'), DEFAULT_CONFIG.timezone);
  out.weekStart = ['Mon', 'Sun', 'Sat'].includes(c.weekStart) ? c.weekStart : (errors.push('weekStart must be Mon, Sun or Sat'), 'Mon');
  out.theme = {
    default: ['light', 'dark'].includes(c.theme?.default) ? c.theme.default : 'light',
    auto: !!c.theme?.auto,
  };
  out.ai = {
    model: MODELS.includes(c.ai?.model) ? c.ai.model : (c.ai?.model != null && errors.push('ai.model not allowed'), DEFAULT_CONFIG.ai.model),
    chatModel: MODELS.includes(c.ai?.chatModel) ? c.ai.chatModel : (c.ai?.chatModel != null && errors.push('ai.chatModel not allowed'), DEFAULT_CONFIG.ai.chatModel),
    effort: EFFORTS.includes(c.ai?.effort) ? c.ai.effort : (errors.push('ai.effort must be low, medium or high'), 'medium'),
    style: typeof c.ai?.style === 'string' ? c.ai.style.slice(0, 500) : '',
  };
  out.features = {};
  for (const k of Object.keys(DEFAULT_CONFIG.features)) out.features[k] = c.features?.[k] !== false;
  out.financeDir = typeof c.financeDir === 'string' && c.financeDir.trim() ? c.financeDir.trim() : null;
  out.onboardedAt = typeof c.onboardedAt === 'string' && !Number.isNaN(Date.parse(c.onboardedAt)) ? new Date(c.onboardedAt).toISOString() : null;
  const lead = Number(c.notifications?.eventLeadMin);
  out.notifications = {
    enabled: c.notifications?.enabled === true,
    dueDigest: c.notifications?.dueDigest !== false,
    eventLeadMin: Number.isFinite(lead) ? Math.max(0, Math.min(120, Math.round(lead))) : 10,
  };
  const EMAIL = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
  const emails = Array.isArray(c.myEmails) ? c.myEmails : typeof c.myEmails === 'string' ? c.myEmails.split(/[\s,;]+/) : [];
  out.myEmails = [...new Set(emails.map(e => String(e || '').trim().toLowerCase()).filter(Boolean))].filter(e => EMAIL.test(e) || (errors.push('myEmails: not an email address'), false)).slice(0, 10);
  out.location = normLocation(c.location);
  if (c.location != null && !out.location) errors.push('location must have a name, lat and lon');
  out.brief = normBrief(c.brief);
  const whErr = planWorkHoursCheck(c.workHours ?? null);
  if (whErr) errors.push(whErr);
  out.workHours = !whErr && c.workHours ? { start: c.workHours.start, end: c.workHours.end, days: [...new Set(Array.isArray(c.workHours.days) ? c.workHours.days : [1, 2, 3, 4, 5])].sort((a, b) => a - b) } : null;
  out.time = normTime(c.time, errors);
  out.travel = normTravelConfig(c.travel);           // travel features (lib/travel-config.mjs; off by default)
  // The birthday: 'MM-DD' (a full date is accepted and its year dropped); a real day of the year.
  const bm = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(typeof c.birthday === 'string' ? c.birthday.trim() : '');
  const bOk = bm && +bm[1] >= 1 && +bm[1] <= 12 && +bm[2] >= 1 && +bm[2] <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][+bm[1] - 1];
  out.birthday = bOk ? `${bm[1]}-${bm[2]}` : null;
  if (c.birthday != null && !bOk) errors.push('birthday must be MM-DD');
  return { config: out, errors: errors.filter(Boolean) };
}

/** config.time: {follow, zone?, trip?: {zone, until}, clock12?} (travel spec 6.1). */
function normTime(t, errors) {
  const v = isObj(t) ? t : {};
  const out = { follow: ['system', 'home', 'zone'].includes(v.follow) ? v.follow : (v.follow != null && errors.push('time.follow must be system, home or zone'), 'system') };
  if (typeof v.zone === 'string' && v.zone && validTz(v.zone)) out.zone = v.zone;
  else if (v.zone) errors.push('time.zone: unknown time zone');
  if (out.follow === 'zone' && !out.zone) { errors.push('time.follow "zone" needs time.zone'); out.follow = 'system'; }
  if (isObj(v.trip) && typeof v.trip.zone === 'string' && validTz(v.trip.zone) && /^\d{4}-\d{2}-\d{2}$/.test(String(v.trip.until))) out.trip = { zone: v.trip.zone, until: v.trip.until };
  else if (v.trip) errors.push('time.trip needs a zone and an until date');
  if (typeof v.clock12 === 'boolean') out.clock12 = v.clock12;   // absent = the locale's habit
  return out;
}

/** The part of the config the page may see (no paths). */
export function publicConfig(cfg) {
  const { financeDir, ...rest } = cfg;
  return rest;
}

export async function loadConfig(dataDir) {
  const raw = await readJson(dataPaths(dataDir).config, { fallback: {} });
  return validateConfig(raw).config;
}

/** Merge `patch` into config.json (validated) and return the new config. */
export async function saveConfig(dataDir, patch) {
  const file = dataPaths(dataDir).config;
  return withLock(file, async () => {
    const cur = await readJson(file, { fallback: {} });
    const { config, errors } = validateConfig(deepMerge(isObj(cur) ? cur : {}, patch));
    if (errors.length) {
      const e = new Error(errors.join('; '));
      e.status = 400;
      throw e;
    }
    await writeJson(file, config, { trailingNewline: true });
    return config;
  });
}

// ─── connections.json ──────────────────────────────────────────────────────
export const CONNECTION_IDS = Object.freeze(['claude', 'bank', 'calendar', 'gmail', 'google', 'mcp']);
export function defaultConnections() {
  const blank = () => ({ status: 'unknown', checkedAt: null, message: null });
  return { version: 1, claude: blank(), bank: blank(), calendar: blank(), gmail: blank(), google: blank(), mcp: blank() };
}

export async function loadConnections(dataDir) {
  const raw = await readJson(dataPaths(dataDir).connections, { fallback: {} });
  const d = defaultConnections();
  for (const id of CONNECTION_IDS) if (isObj(raw?.[id])) d[id] = { ...d[id], ...raw[id] };
  return d;
}

export async function updateConnection(dataDir, id, patch) {
  if (!CONNECTION_IDS.includes(id)) throw new Error('unknown connection ' + id);
  const file = dataPaths(dataDir).connections;
  return withLock(file, async () => {
    const all = await loadConnections(dataDir);
    all[id] = { ...all[id], ...patch, checkedAt: new Date().toISOString() };
    await writeJson(file, all, { trailingNewline: true });
    return all;
  });
}

// ─── Layout ────────────────────────────────────────────────────────────────
/** Create the folder layout and default files that are missing. Never overwrites. */
export async function ensureDataDir(dataDir) {
  const p = dataPaths(dataDir);
  const { mkdir } = await import('node:fs/promises');
  // A new data folder is private to this account (0700 on macOS/Linux, where the
  // default would let other accounts read tasks, finances and secrets/). An
  // existing folder keeps the permissions its owner gave it; Windows ignores the
  // mode (a folder under the user's profile is private already).
  await mkdir(p.root, { recursive: true, mode: 0o700 });
  for (const d of [p.stateDir, p.stateBackups, p.finance, p.calendar, p.email, p.logs]) await mkdir(d, { recursive: true });
  if (!existsSync(p.config)) await writeJson(p.config, validateConfig({}).config, { trailingNewline: true });
  if (!existsSync(p.connections)) await writeJson(p.connections, defaultConnections(), { trailingNewline: true });
  if (!existsSync(p.migrations)) await writeJson(p.migrations, { version: 1, applied: [] }, { trailingNewline: true });
  return p;
}

// ─── Legacy (pre data-dir) layout ──────────────────────────────────────────
/**
 * Before the data dir existed, state lived in <repo>/state. If the data dir has
 * no state file but the legacy one exists, the user must run migration 001
 * explicitly (nothing is moved silently). Returns null when all is well.
 */
export function legacyStatus({ dataDir, repoRoot = REPO_ROOT } = {}) {
  const p = dataPaths(dataDir);
  const legacyStateDir = join(repoRoot, 'state');
  const legacyFile = join(legacyStateDir, 'dashboard-state.json');
  if (existsSync(p.stateFile) || !existsSync(legacyFile)) return null;
  const q = (s) => (/[\s"]/.test(s) ? `"${s}"` : s);
  const defaultDir = resolve(join(repoRoot, 'data')) === resolve(p.root);
  const command = `node tools/migrate.mjs 001-data-dir${defaultDir ? '' : ` --data-dir ${q(p.root)}`}`;
  return { legacyStateDir, legacyFile, dataDir: p.root, command };
}
