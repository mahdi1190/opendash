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
// two devices is not reported; the later choice wins). Since 2.16 the whole
// layout follows too (the user's rule: one change here makes the same change
// there): the list/board/review mode, Focus mode, the folded sidebar, panel
// sizes, the calendar mode and stream filter, hiding amounts on Home, the
// review prompt and the suggestions' counts. Only where you are stays on each
// screen: the view, the open task, the month and week shown, edits in progress.
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
  calPrefs: pref('the calendars you follow or hide (one entry per calendar), task/plan/countdown layers, show done, the calendar mode (month/week/day/agenda) and the one-stream filter'),
  peopleView: pref('People layout, sort, grouping and filter, field by field'),
  openItemsIn: pref('open items in the side panel or a card'), itemHero: pref('card header style'),
  homeUI: pref('Home cards: expanded, folded groups per list card, "not now", celebrations, gallery badges, amounts hidden or shown'),
  collapsedSidebar: pref('folded sidebar headings, per heading'), sidebarLists: pref('sidebar list sort and length, per list'),
  viewFilter: pref('the saved view filter (tag renames rewrite it)'),
  animPrefs: pref('scene rules, per-event overrides and the animation look'),
  achievements: pref('unlocks and noted moments, per unlock: nothing earned is lost'),
  // ── prefs ── (2.16: device-local until then; existing devices publish their values on the next pass, docs/dev/SYNC_FORMAT.md 9.2)
  viewMode: pref('list, board or review mode of the task views'),
  focus: pref('Focus mode (it stays on until you turn it off or open the sidebar)'),
  sidebarCollapsed: pref('the sidebar folded or open'),
  paneSizes: pref('panel sizes, per panel (each screen clamps them to fit)'),
  lastReviewPrompt: pref('when you were last asked for a weekly review: answered on one computer, not asked again on the other'),
  suggestStats: pref('suggestion counts per rule and what was seen today, field by field (the later count wins, so a count can be a little low; never summed twice)'),
  travel: [S, 'your trip decisions: confirmed and renamed trips, "not a trip", travel moments already shown (the zone each computer is in is its own: time.json and config time)'],
  // ── end prefs ──

  // Device-local: one screen or moment (UI keys) and this computer's things
  view: [L, 'where you are (the section, and the calendar mode in its name; it follows calPrefs.mode when that changes elsewhere)'],
  selectedTaskId: [L, 'the open task'], calMonth: [L, 'the calendar month shown'],
  weekBarOffset: [L, 'week bar position'], _snappedFor: [L, 'scroll bookkeeping'],
  personEditMode: [L, 'an edit in progress'], _lastBackup: [L, "this browser's last download backup"],
  env: [L, 'this computer'],
  // Bookkeeping
  _lastSave: [L, 'the state version on this computer'], _saveCount: [L, 'save counter'], _localDirty: [L, 'unsaved marker'],
  _overridesMigrated_v1: [L, 'one-off migration marker'], _demo: [L, 'demo data marker'],
  taskOverrides: [L, 'legacy, emptied by a migration'], dateOverrides: [L, 'legacy, emptied by a migration'],

  // Results (connect once, use everywhere: docs/dev/MULTI_DEVICE.md): made by
  // Claude or by your choices, so a computer without Claude cannot rebuild them
  emailTriage: [S, "Claude's task suggestions from your mail and what you did with each thread (a computer without Claude cannot rebuild them)"],
  taskChat: [S, 'AI chat per task (the conversation is a result, not a cache: it shows on every computer)'],
  suggest: [S, "the suggestions' memory: what you dismissed or snoozed (your choices, not a cache)"],

  // Derived: rebuilt on each computer, never synced
  calCache: [D, 'calendar cache (from calendar/events.json)'],
  peopleEmailCache: [D, 'mail cache per person'],
  autolink: [D, 'auto-link suggestions, rebuilt from the workspace index of this computer'],
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
// A snapshot of a source that is not an account (an MCP server read through
// Claude, a calendar link) is published by the device that reads it: the one
// whose capabilities (lib/sync/caps.mjs, in its device.json) list that source
// id. A snapshot nobody owns is never sent.
//
// Results that are not rebuildable caches (AI summaries, story scripts, the day
// adviser's review, Claude's scene guesses, the day snapshots of the History
// tab, the money brief's wording) are 'shared': whichever device made one
// sends it, the others show it (docs/dev/MULTI_DEVICE.md). requests.json is the
// queue of remote requests (lib/sync/requests.mjs): a device that lacks a
// capability asks one that has it.
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
  // The person's settings (lib/profile.mjs): their part of config.json; the computer's part stays.
  { id: 'profile', path: 'profile.json', role: 'shared', spec: record({ ai: record(), brief: record(), theme: record(), features: record() }),
    why: "the person's settings from config.json (name, own addresses, home zone, locale, currency, week start, working hours, AI and brief choices); paths, this computer's zone, place and notifications stay" },
  // Remote requests (lib/sync/requests.mjs): the requester adds, the runner claims and answers.
  { id: 'requests', path: 'requests.json', role: 'shared', spec: record({ requests: items() }),
    why: 'remote requests: a device without Claude (or a source) asks one that has it; named jobs only, validated on both sides' },
  // Results (AI outputs): made once, on whichever device has Claude, shown everywhere.
  { id: 'day-advice', path: 'brief/day-advice.json', role: 'shared', spec: whole,
    why: "the AI day adviser's latest review (Think through my day)" },
  { id: 'brief-ai', dir: 'briefs/ai', role: 'shared', spec: whole,
    why: 'the AI summaries of the Morning brief, Finish the day and the week, per kind and date' },
  { id: 'story-scripts', dir: 'briefs/story', role: 'shared', spec: whole,
    why: 'the AI story scripts, per kind and date' },
  { id: 'anim-ai', path: 'briefs/anim-ai.json', role: 'shared', spec: record({ types: entries() }),
    why: "Claude's scene guesses per event title (a computer without Claude cannot make them)" },
  { id: 'brief-days', dir: 'briefs/days', role: 'shared', spec: whole,
    why: 'what the Morning brief and Finish the day showed, per date (the History tab)' },
  { id: 'money-brief', path: 'finance/_system/brief-ai.json', role: 'shared', spec: whole,
    why: "the money brief's AI wording (aggregates only), when the finance folder is the default one inside the data folder" },
  // ── files ── (every other file a view shows; FILE_RULES below says how results merge)
  { id: 'brief-weather', path: 'briefs/weather.json', role: 'shared', spec: whole,
    why: "the Morning brief's last forecast {key, at, raw} (lib/weather.mjs): whichever computer fetched last, the others show it" },
  { id: 'travel-weather', path: 'travel/weather.json', role: 'shared', spec: whole,
    why: "the travel views' last forecast {key, at, raw} (server/routes/travel.mjs)" },
  { id: 'travel-holidays', dir: 'travel', match: /^holidays-[A-Z]{2}-\d{4}\.json$/, role: 'shared', spec: whole,
    why: 'public holidays from the opt-in online lookup, per country and year {at, rows} (lib/holidays-online.mjs)' },
  { id: 'calendar-legacy', path: 'calendar/calendar.json', role: 'shared', spec: whole,
    why: 'the old (v1) calendar snapshot: the calendar and the MCP fall back to it while calendar/events.json is missing' },
  { id: 'inbox-legacy', path: 'email/inbox.json', role: 'shared', spec: whole,
    why: 'the old (v1) mail snapshot: the inbox falls back to it while inbox/messages.json is missing' },
  { id: 'gmail-drafts', path: 'inbox/drafts.json', role: 'shared', spec: record({ drafts: items() }),
    why: 'the Gmail drafts OpenDash made {id, at, purpose, threadId, taskId} (lib/gmail-draft.mjs), so any computer can remove one' },
  { id: 'github-cache', path: 'resources/github-cache.json', role: 'shared', spec: entries(),
    why: "open pull requests and issues per repository {owner, repo, pulls, issues, fetchedAt}, read through a computer's GitHub MCP server" },
  { id: 'anim-mine', path: 'animations/mine.json', role: 'shared', spec: record({ items: items() }),
    why: 'the animations you made ("My animations", lib/anim-make.mjs); every read checks them again' },
  { id: 'index-settings', path: 'index/settings.json', role: 'shared', spec: record({ judge: record() }, { local: ['folders', 'namesOnly', 'enabled'] }),
    why: "auto-link choices (auto-attach, threshold, the judge, interval); this computer's folders, names-only paths and its background switch stay" },
  { id: 'source-prefs', path: 'source-prefs.json', role: 'shared', spec: record({ sources: entries(record({ accounts: entries(record()) })) }),
    why: "your choices on each source and its calendars or accounts (name, colour, on/off, mine), from sources.json (lib/source-prefs.mjs); the source definitions, links and check results stay" },
  // ── /files ──
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
      if (!name.includes('/') && SAFE_NAME.test(name) && (!f.match || f.match.test(name))) return { top, rel, spec: f.spec, role: f.role, account: name.slice(0, -5), id: f.id, dir: f.dir };
    }
  }
  return null;
}
/** Every synced file present (list(dir) -> names) or already known (register keys). */
export async function fileInstances({ list, known = [] }) {
  const tops = new Set(known.filter(t => fileSpecFor(t)));
  for (const f of SYNC_FILES) {
    if (f.path) tops.add(FILE_PREFIX + f.path);
    else for (const n of (await list(f.dir).catch(() => [])) || []) if (SAFE_NAME.test(n) && (!f.match || f.match.test(n))) tops.add(`${FILE_PREFIX}${f.dir}/${n}`);
  }
  return [...tops].map(fileSpecFor).filter(Boolean);
}
export const classOf = (key) => (Object.prototype.hasOwnProperty.call(MANIFEST, key) ? MANIFEST[key][0] : L);
export const syncedKeys = () => Object.keys(MANIFEST).filter(k => MANIFEST[k][0] === S);
/** A synced preference: the later choice wins quietly (a clash is not reported). */
export const isPreference = (key) => Object.prototype.hasOwnProperty.call(MANIFEST, key) && MANIFEST[key][2] === 'pref';

// ── files ──
// HOW RESULTS AND CACHES MERGE (by SYNC_FILES id). Every device that produces
// one of these sends it (role 'shared'); the others show it.
//   newest   the PRODUCED-AT of a copy (its own field: when it was fetched,
//            written or saved), so the copy produced last wins on every
//            device, whatever order the copies arrive in and whichever was
//            captured last: an older copy (a computer that was asleep, the
//            first pass after an update) never replaces a newer one
//            (lib/sync/model.mjs datedSplit). depth: which registers carry it,
//            1 = the whole file, 2 = each entry of a map file.
//   quiet    two computers producing the same result at once is not a clash
//            worth reporting (the newest simply wins).
//   maxBytes a file larger than this is not synced at all: it stays as it is
//            on this computer and Settings > Sync says so (status notSynced).
//            One whole value is capped at 256 KB anyway (model.mjs sanitize).
// Files that STAY on each computer, and why (docs/dev/SYNC_FORMAT.md section 8):
//   connections.json      this computer's own checks (is Claude signed in HERE, is the
//                         dashboard MCP installed HERE); it decides what this computer
//                         can do (lib/remote-jobs.mjs computeLocalCaps), so a copy would
//                         make a computer without Claude claim Claude jobs. The others'
//                         abilities travel as capabilities (lib/sync/caps.mjs) instead.
//   sources.json          the definitions hold iCal secret links, this computer's MCP
//                         server names and bank sessions, and a source that does not
//                         validate here would be dropped and that drop sent back. The
//                         person's choices on them travel in source-prefs.json; account
//                         sources follow accounts.json; other computers' MCP and iCal
//                         sources show through their capabilities.
//   time.json             this computer's observed system zone and its history (it moves
//                         with the computer, like `travel`); the person's zone choices
//                         are in profile.json.
//   calendar/update.json, inbox/update.json   this computer's last job run: the
//                         30-minute throttle reads it, so a copy from the computer that
//                         fetches the connectors would keep this one from ever reading
//                         its own accounts; the page shows the snapshots' fetchedAt.
//   travel/rates-*.json   public exchange-rate caches (Frankfurter); merging their range
//                         lists would lose ranges, and each computer fetches its own.
//   index/files.json, index/status.json  this computer's folder index and its run.
//   state/actions-journal.json  undo history: its tokens name this computer's state versions.
//   people/images/*, cache/narration/*   binary files (pictures, audio): JSON
//                         registers cannot carry them.
//   secrets/, data-id.json, hosts/, runtime.json, local-token, launch.json,
//   update-check.json, migrations.json, migration-plans/, backups/, logs/: this
//                         computer's identity, sign-ins, processes and bookkeeping.
//   finance/*             the finance files (owned by the finance sync).
const atOf = (...names) => (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  for (const n of names) {
    const t = v[n];
    const ms = typeof t === 'number' ? t : typeof t === 'string' ? Date.parse(t) : NaN;
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return null;
};
export const FILE_RULES = Object.freeze({
  'day-advice': Object.freeze({ newest: atOf('at'), quiet: true }),
  'brief-ai': Object.freeze({ newest: atOf('at'), quiet: true }),
  'story-scripts': Object.freeze({ newest: atOf('at'), quiet: true }),
  'brief-days': Object.freeze({ newest: atOf('savedAt'), quiet: true }),
  'anim-ai': Object.freeze({ quiet: true }),
  'brief-weather': Object.freeze({ newest: atOf('at'), quiet: true }),
  'travel-weather': Object.freeze({ newest: atOf('at'), quiet: true }),
  'travel-holidays': Object.freeze({ newest: atOf('at'), quiet: true }),
  'calendar-legacy': Object.freeze({ newest: atOf('fetchedAt'), quiet: true }),
  'inbox-legacy': Object.freeze({ newest: atOf('fetchedAt'), quiet: true }),
  'gmail-drafts': Object.freeze({ quiet: true, maxBytes: 512 * 1024 }),
  'github-cache': Object.freeze({ newest: atOf('fetchedAt'), depth: 2, quiet: true, maxBytes: 4 * 1024 * 1024 }),
  'anim-mine': Object.freeze({ maxBytes: 4 * 1024 * 1024 }),
  'index-settings': Object.freeze({ maxBytes: 64 * 1024 }),
  'source-prefs': Object.freeze({ maxBytes: 512 * 1024 }),
});
/** The merge rule of a synced file ({id} from fileSpecFor), or null (plain: later change wins). */
export const fileRule = (f) => (f && Object.prototype.hasOwnProperty.call(FILE_RULES, f.id) ? FILE_RULES[f.id] : null);
/** A register key whose clashes are not reported (results: the newest wins). */
export function isQuietTop(top) {
  const r = fileRule(fileSpecFor(top));
  return !!(r && r.quiet);
}
// ── /files ──
