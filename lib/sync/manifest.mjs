// lib/sync/manifest.mjs - what happens to every top-level state key under folder sync.
//
//   synced        shared between computers, field by field (lib/sync/model.mjs SYNC_SPEC
//                 says how: list of items with ids, map, record, or one whole value)
//   device-local  belongs to this screen or computer and never leaves it (where you
//                 are in the app, panel sizes, this computer's folders, zone or trips)
//   derived       rebuilt from other data on each computer (caches, suggestions,
//                 snapshots of mail and calendar); never synced, recomputed
//
// PREFERENCES FOLLOW THE PERSON: theme, density, sorting and grouping, the
// calendars you follow or hide, per-view options, Home cards, sidebar folding,
// scene settings and unlocks sync to every device (marked `pref` below: they
// are UI keys of the page, saved without an undo step, and a clash between
// two devices is not reported; the later choice wins). Only what belongs to
// one screen or moment stays: where you are (view, the list/board mode, the
// open task, the month shown), Focus mode, panel and sidebar sizes, and
// fields inside a synced preference that are "where you are" too
// (calPrefs.mode and .stream) or this screen's privacy (homeUI.hideAmounts).
// While Auto is on, `theme` is this computer's own (each one turns dark in its
// own evening); `autoTheme` itself syncs. docs/dev/SYNC_FORMAT.md section 9
// lists every key with its reason, and how devices that already synced pick
// the preferences up.
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
// Secrets are not state keys at all: sign-ins and keys are files in THIS
// computer's device folder (lib/devicedir.mjs secretsDir: account tokens under
// accounts/<id>, Google Health, ElevenLabs, relay and remote-MCP pairings,
// fin/...), never in the data folder; connections.json, sources.json,
// config.json and local-token stay on each computer too. The sync engine reads
// the state through the state store and only the files listed in SYNC_FILES.

import { SPEC, FILE_PREFIX } from './model.mjs';

const S = 'synced', L = 'device-local', D = 'derived';
/** A synced preference: [S, why, 'pref'] (see the header). */
const pref = (why) => [S, why, 'pref'];

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

  // Preferences: they follow the person (UI keys of the page, lib/state-keys.mjs SHARED_UI_KEYS, plus animPrefs and viewFilter)
  theme: pref('light or dark; while Auto is on each computer keeps its own (model.mjs localWhile)'),
  autoTheme: pref("Auto: dark in the evening, by each computer's own clock"),
  density: pref('row density'), sortBy: pref('sort (Display menu)'), groupBy: pref('grouping (Display menu)'),
  taskViewPrefs: pref('sort, grouping and folded groups, per view and per group'),
  calPrefs: pref('the calendars you follow or hide (one entry per calendar), task/plan/countdown layers, show done; .mode and .stream stay on this screen'),
  peopleView: pref('People layout, sort, grouping and filter, field by field'),
  openItemsIn: pref('open items in the side panel or a card'), itemHero: pref('card header style'),
  homeUI: pref('Home cards: expanded, folded groups per list card, "not now", celebrations, gallery badges; .hideAmounts stays on this screen'),
  collapsedSidebar: pref('folded sidebar headings, per heading'), sidebarLists: pref('sidebar list sort and length, per list'),
  viewFilter: pref('the saved view filter (tag renames rewrite it)'),
  animPrefs: pref('scene rules, per-event overrides and the animation look'),
  achievements: pref('unlocks and noted moments, per unlock: nothing earned is lost'),

  // Device-local: one screen or moment (UI keys) and this computer's things
  view: [L, 'where you are'], viewMode: [L, 'list/board/review mode of the view you are in (part of where you are)'],
  selectedTaskId: [L, 'the open task'], calMonth: [L, 'the calendar month shown'],
  weekBarOffset: [L, 'week bar position'], _snappedFor: [L, 'scroll bookkeeping'],
  focus: [L, 'Focus mode, a moment (it ends when the sidebar opens)'], sidebarCollapsed: [L, 'sidebar folded on this screen (screen size)'],
  paneSizes: [L, 'panel sizes on this screen'], personEditMode: [L, 'editing state'],
  lastReviewPrompt: [L, 'when this screen last asked for a review'], _lastBackup: [L, 'last browser download backup'],
  suggestStats: [L, 'counters (shown, acted on, ignored per rule and day): last-writer-wins would lose counts'],
  env: [L, 'this computer'],
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
// and other devices need no sign-in). A file in a `dir` is named after one of
// the account's source ids (the record's `sources: {mail, calendar}`,
// lib/accounts.mjs) or after the account id: inbox/sources/<sourceId>.json.
// A snapshot no account owns (an MCP or calendar-link source set up on one
// computer) is never sent.
const { record, list: items, map: entries, value: whole } = SPEC;
export const SYNC_FILES = Object.freeze([
  { id: 'accounts', path: 'accounts.json', role: 'shared', spec: record({ accounts: items() }),
    why: 'connected accounts (lib/accounts-file.mjs {version, accounts}): provider, address, features, status, which device fetches (fetcher), the source ids of its snapshots (sources); never a token' },
  { id: 'roles', path: 'roles.json', role: 'shared', spec: record({ roles: entries() }),
    why: "which device runs a job that is not an account ('bank', 'ai-brief', 'connectors'): {fetcher, since}" },
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
/** For a register key 'file:<rel>': {top, rel, spec, role, account, id, dir} or null (not a synced file). account: the job of a fixed file, the name (source or account id) of a file in a dir. */
export function fileSpecFor(top) {
  if (typeof top !== 'string' || !top.startsWith(FILE_PREFIX)) return null;
  const rel = top.slice(FILE_PREFIX.length);
  if (!SAFE_REL.test(rel) || rel.split('/').some(s => s === '..' || s === '.')) return null;
  for (const f of SYNC_FILES) {
    if (f.path && f.path === rel) return { top, rel, spec: f.spec, role: f.role, account: f.account || null, id: f.id, dir: null };
    if (f.dir && rel.startsWith(f.dir + '/')) {
      const name = rel.slice(f.dir.length + 1);
      if (!name.includes('/') && SAFE_NAME.test(name)) return { top, rel, spec: f.spec, role: f.role, account: name.slice(0, -5), id: f.id, dir: f.dir };
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
/** A synced preference: the later choice wins quietly (a clash is not reported). */
export const isPreference = (key) => Object.prototype.hasOwnProperty.call(MANIFEST, key) && MANIFEST[key][2] === 'pref';
