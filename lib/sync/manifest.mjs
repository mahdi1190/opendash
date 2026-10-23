// lib/sync/manifest.mjs - what happens to every top-level state key under folder sync.
//
//   synced        shared between computers, field by field (lib/sync/model.mjs SYNC_SPEC
//                 says how: list of items with ids, map, record, or one whole value)
//   device-local  belongs to this computer and never leaves it (where you are in the
//                 app, display choices, this computer's folders, zone or trips)
//   derived       rebuilt from other data on each computer (caches, suggestions,
//                 snapshots of mail and calendar); never synced, recomputed
//
// A key that is not listed here is treated as device-local: it is never read
// for sync. tests/sync-manifest.test.mjs checks that every key the page sets up
// (src/app/05-core-state-init.js ensureStateDefaults), every UI and bookkeeping
// key (lib/state-keys.mjs) and every key the actions layer touches is listed,
// and that the synced ones are exactly the keys SYNC_SPEC knows.
//
// Order lists (customOrder, sidebarOrder entries, home.focusOrder, tag lists)
// are synced as WHOLE values: the later reorder wins, nothing is merged inside
// them. Item lists with ids (tasks, subtasks, notes, countdowns, streams)
// keep a position per item, so two computers moving different items keep both.
//
// Secrets are not state keys at all: sign-ins and keys are FILES under
// <data>/secrets (microsoft-tokens.json, google-health-tokens.json,
// hosted-relay.json, remote-mcp-auth.json, narration.json, fin/...), plus
// connections.json, sources.json, config.json and local-token. The sync engine
// only reads the state through the state store and never opens those files.

import { SPEC, FILE_PREFIX } from './model.mjs';

const S = 'synced', L = 'device-local', D = 'derived';

export const MANIFEST = Object.freeze({
  // Tasks and everything hanging off them
  custom: [S, 'tasks (items by id; subtasks by id inside each)'],
  statuses: [S, 'task status per task id'],
  notes: [S, 'task notes per task id (items by id)'],
  pinned: [S, 'pinned tasks'],
  completionLog: [S, 'completion times per task (whole list per task)'],
  taskActivity: [S, 'task activity entries per task (items by id)'],
  customOrder: [S, 'manual order per view (each list a whole value)'],
  deleted: [S, 'removed built-in tasks'],
  bin: [S, 'the bin: deleted tasks and notes'],
  taskTemplates: [S, 'task templates (items by id)'],
  quickTemplates: [S, 'quick-add templates (one whole value)'],
  // People, tags, streams, countdowns, resources
  people: [S, 'people (items by id; their notes by id)'],
  peopleNotes: [S, 'older per-person notes'],
  peopleIgnoredNames: [S, 'names never to link'], peopleIgnoredEmails: [S, 'addresses never to link'], peopleAutoLink: [S, 'auto-link choice for people'],
  streams: [S, 'streams (items by id)'],
  countdowns: [S, 'top-bar countdowns and widgets (items by id)'],
  resources: [S, 'files and links (items by id)'],
  tagRegistry: [S, 'the tag list (whole value)'], tags: [S, 'older name of the tag list'], pinnedTags: [S, 'pinned tags (whole value)'],
  sidebarOrder: [S, 'custom sidebar order (each list a whole value)'],
  defaultStream: [S, 'stream for new tasks'], archiveDays: [S, 'days before done tasks are archived'],
  // Home, notes, reviews, calendar annotations
  home: [S, 'Home layout, focus settings, snoozes, widget settings'],
  daynotes: [S, 'daily notes per date'],
  eventMeta: [S, 'notes and links on calendar events'],
  calendarSettings: [S, 'calendar aliases and colours'],
  weeklyReviews: [S, 'weekly reviews (whole value)'], reviews: [S, 'reviews (whole value)'],

  // Device-local: the UI keys (lib/state-keys.mjs) and this computer's things
  view: [L, 'where you are'], viewMode: [L, 'list/board'], selectedTaskId: [L, 'open task'], calMonth: [L, 'calendar month shown'],
  weekBarOffset: [L, 'week bar position'], _snappedFor: [L, 'scroll bookkeeping'], sortBy: [L, 'sort'], groupBy: [L, 'grouping'],
  theme: [L, 'light/dark on this screen'], density: [L, 'row density'], focus: [L, 'focus mode'], sidebarCollapsed: [L, 'sidebar'],
  collapsedSidebar: [L, 'folded sidebar headings'], personEditMode: [L, 'editing state'], autoTheme: [L, 'follow the system theme'],
  lastReviewPrompt: [L, 'when this screen last asked for a review'], _lastBackup: [L, 'last browser download backup'],
  taskViewPrefs: [L, 'per-view display options'], calPrefs: [L, 'calendar display options'], peopleView: [L, 'people view options'],
  openItemsIn: [L, 'panel or card'], itemHero: [L, 'card header style'], paneSizes: [L, 'panel sizes on this screen'],
  homeUI: [L, 'expanded Home cards'], suggestStats: [L, 'local suggestion counts'], achievements: [L, 'unlocks on this computer'],
  sidebarLists: [L, 'sidebar list sort and length'], viewFilter: [L, 'the saved view filter of this screen'],
  animPrefs: [L, 'animation look on this computer'], env: [L, 'this computer'],
  travel: [L, "this computer's zone, trips and places (moves with the computer, not the account)"],
  // Bookkeeping
  _lastSave: [L, 'the state version on this computer'], _saveCount: [L, 'save counter'], _localDirty: [L, 'unsaved marker'],
  _overridesMigrated_v1: [L, 'one-off migration marker'], _demo: [L, 'demo data marker'],
  taskOverrides: [L, 'legacy, emptied by a migration'], dateOverrides: [L, 'legacy, emptied by a migration'],

  // Derived: rebuilt on each computer, never synced
  calCache: [D, 'calendar cache (from calendar/events.json)'],
  peopleEmailCache: [D, 'mail cache per person'],
  emailTriage: [D, 'mail triage suggestions, rebuilt from the inbox snapshot'],
  autolink: [D, 'auto-link suggestions, rebuilt from the workspace index of this computer'],
  suggest: [D, "the suggestions' memory, rebuilt as you use them"],
  taskChat: [D, 'AI chat per task (kept on the computer it happened on)'],
});

export const CLASSES = Object.freeze({ SYNCED: S, LOCAL: L, DERIVED: D });

// ─── Synced FILES in the data folder (not state keys) ─────────────────────
// The account registry (no secrets: tokens are in the device's own secrets
// folder and never sync) and the mail/calendar snapshots each account's
// FETCHER device writes. role 'shared': any device may change it (field by
// field, later change wins). role 'published': only the fetcher of `account`
// records changes; the others only receive them (so refresh tokens never race
// and other devices need no sign-in). A file in a `dir` is named after its
// account: inbox/sources/<accountId>.json.
const { record, list: items, map: entries, value: whole } = SPEC;
export const SYNC_FILES = Object.freeze([
  { id: 'accounts', path: 'accounts.json', role: 'shared', spec: record({ accounts: items() }),
    why: 'connected accounts: provider, address, label, which device fetches (fetcherDeviceId); never a token' },
  { id: 'roles', path: 'roles.json', role: 'shared', spec: record({ roles: entries() }),
    why: "which device runs a job that is not an account ('bank', 'ai-brief', 'connectors'): {deviceId, since}" },
  { id: 'calendar-sources', dir: 'calendar/sources', role: 'published', spec: record({ events: items(), calendars: items() }),
    why: 'calendar snapshot per account, published by its fetcher' },
  { id: 'inbox-sources', dir: 'inbox/sources', role: 'published', spec: record({ messages: items(), accounts: whole }),
    why: 'mail snapshot per account (subjects, senders, snippets), published by its fetcher' },
  { id: 'calendar', path: 'calendar/events.json', role: 'published', account: 'connectors', spec: record({ events: items(), calendars: items() }),
    why: 'the calendar fetched through Claude connectors, published by the connectors fetcher' },
  { id: 'inbox', path: 'inbox/messages.json', role: 'published', account: 'connectors', spec: record({ messages: items() }),
    why: 'the inbox fetched through Claude connectors, published by the connectors fetcher' },
]);
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.json$/;
const SAFE_REL = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*\.json$/;
/** For a register key 'file:<rel>': {top, rel, spec, role, account, id} or null (not a synced file). */
export function fileSpecFor(top) {
  if (typeof top !== 'string' || !top.startsWith(FILE_PREFIX)) return null;
  const rel = top.slice(FILE_PREFIX.length);
  if (!SAFE_REL.test(rel) || rel.split('/').some(s => s === '..' || s === '.')) return null;
  for (const f of SYNC_FILES) {
    if (f.path && f.path === rel) return { top, rel, spec: f.spec, role: f.role, account: f.account || null, id: f.id };
    if (f.dir && rel.startsWith(f.dir + '/')) {
      const name = rel.slice(f.dir.length + 1);
      if (!name.includes('/') && SAFE_NAME.test(name)) return { top, rel, spec: f.spec, role: f.role, account: name.slice(0, -5), id: f.id };
    }
  }
  return null;
}
/** Every synced file present (list(dir) -> names) or already known (register keys). */
export async function fileInstances({ list, known = [] }) {
  const tops = new Set(known.filter(t => fileSpecFor(t)));
  for (const f of SYNC_FILES) {
    if (f.path) tops.add(FILE_PREFIX + f.path);
    else for (const n of (await list(f.dir).catch(() => [])) || []) if (SAFE_NAME.test(n)) tops.add(`${FILE_PREFIX}${f.dir}/${n}`);
  }
  return [...tops].map(fileSpecFor).filter(Boolean);
}
export const classOf = (key) => (Object.prototype.hasOwnProperty.call(MANIFEST, key) ? MANIFEST[key][0] : L);
export const syncedKeys = () => Object.keys(MANIFEST).filter(k => MANIFEST[k][0] === S);
