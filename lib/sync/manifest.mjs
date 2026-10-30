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
/** ── 2.17.2 ── Synced housekeeping: merged like the rest, but a clash is never a Review item (CLASHES below). */
const house = (why) => [S, why, 'silent'];

export const MANIFEST = Object.freeze({
  // Tasks and everything hanging off them
  custom: [S, 'tasks (items by id; subtasks by id inside each)'],
  statuses: [S, 'task status per task id'],
  notes: [S, 'task notes per task id (items by id)'],
  pinned: [S, 'pinned tasks'],
  completionLog: house('completion times per task (whole list per task; a log the app keeps)'),
  taskActivity: house('task activity entries per task (items by id; a log the app keeps)'),
  customOrder: house('manual order per view (each list a whole value: the later reorder wins, a list of ids is nothing to review)'),
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
  sidebarOrder: house('custom sidebar order (each list a whole value: the later reorder wins)'),
  // ── boards ── (2.16: task boards, src/app/33-board*.js; not the retired brainstorm 'boards' key, lib/state-keys.mjs)
  taskBoards: [S, "saved boards and each task view's board: what it shows, columns (by status, priority, stream, tag, person, due date or your own), rows, card fields, soft limits (items by id; custom columns by id)"],
  boardOrder: house('card order per board column, and who is in a plain custom column (each list a whole value: the later reorder wins)'),
  // ── end boards ──
  // ── lists ── (2.16: smart lists, the customised sidebar, contexts; src/app/15-nav-smart-lists.js, 15-nav-custom.js, 20-task-contexts.js)
  smartLists: [S, 'smart lists: saved filters with their grouping, sort and view type (items by id)'],
  sidebarLayout: [S, 'the customised sidebar: section order per tab, hidden sections and rows, renamed sections, pinned items (field by field; pins one whole list)'],
  taskContexts: [S, 'the context list (@computer, @phone ...; one whole value)'],
  // ── end lists ──
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
  // ── achievements ── (2.18: src/app/78-achievements.js; docs/dev/ACHIEVEMENTS_500.md)
  achievements: pref('unlocks and noted moments, per unlock: nothing earned is lost; which unlocks came from history (shown once, as one summary) and which packs were first checked when, so a second computer never celebrates them again'),
  // ── end achievements ──
  // ── prefs ── (2.16: device-local until then; existing devices publish their values on the next pass, docs/dev/SYNC_FORMAT.md 9.2)
  viewMode: pref('list, board or review mode of the task views'),
  focus: pref('Focus mode (it stays on until you turn it off or open the sidebar)'),
  sidebarCollapsed: pref('the sidebar folded or open'),
  paneSizes: pref('panel sizes, per panel (each screen clamps them to fit)'),
  lastReviewPrompt: pref('when you were last asked for a weekly review: answered on one computer, not asked again on the other'),
  suggestStats: pref('suggestion counts per rule and what was seen today, field by field (the later count wins, so a count can be a little low; never summed twice)'),
  travel: [S, 'your trip decisions: confirmed and renamed trips, "not a trip", travel moments already shown (the zone each computer is in is its own: time.json and config time)'],
  // ── end prefs ──
  // ── local ── (2.16: what the page kept in each browser's localStorage; src/app/06-core-seen.js. A computer that
  // updates folds its old browser values in once: flags are added, values only filled where the state has none.)
  seen: pref('seen, played and dismissed: the brief and stories seen today, confetti played, one-off cards and tips, the opening scene rotation, moments shown, banners dismissed, the transactions seen in Finances; per entry, so flags from two computers add up'),
  uiPrefs: pref("the story player's volume, speed and mute, the animation intensity, Finances' display choices (chart modes, sorts, page size, income and transfers shown), the assistant's model, a running focus block; per field"),
  drafts: pref('work in progress: the weekly review before it is saved, per draft and field'),
  // ── end local ──
  // ── game ── (2.16: src/app/92-game-*.js. Everything that can be is computed on each computer from the
  // tasks (XP from the completion log, streaks, records, quest progress); only what cannot is kept here.)
  game: pref('the game: fun level, sounds and accent (prefs), XP awards for moments the data cannot show (awards, one entry per award so two computers add up), streak ticks per kind and day, the achievements\' counters (counts per month and device, so totals add up; marks: the first day per key, ids from the app only, never text), focus timer sessions by id, the running timer, the weekly quests chosen, personal records and moments already shown, the achievement categories you left open'),
  // ── end game ──
  // ── profile ── (2.17: src/app/97-profile-*.js. Your own profile card and avatar; what friends see of it is sent
  // through the friends layer, never through this folder sync, which only ever reaches your own devices.)
  // ── you ── (2.18: the card's look, field by field: banner and its colours or scene, nameplate, title, favourite emoji, 'currently', the tint)
  profile: pref('your profile: display name, pronouns, bio, status, what you are working on, its colour, the avatar (per part), the look of your card (banner, nameplate, title, favourite emoji, what you are currently into, the tint; field by field), the badges and favourite places you show, what you share with friends, and the seasonal avatar items and banners you have collected (per entry, so nothing collected is lost)'),
  // ── end you ──
  // ── end profile ──
  // ── wardrobe ── (2.18: src/app/97-profile-4wardrobe.js. Up to six saved outfits, ids of the avatar kit only)
  wardrobe: pref('your saved outfits (up to six): each one’s name and pieces, per outfit, so outfits saved on two computers add up'),
  // ── end wardrobe ──
  // ── pets ── (2.18, agent 'pets': src/app/97-pets-*.js. Your companion; the treats it earns are worked out from the
  // tasks on every computer, only what you give is kept. Friends see it inside your profile, never through this sync.)
  pet: pref("your pet: its species, colours and accessories (per field), its name, the day you adopted it, shown or put away, shared with friends or not, walking with you in scenes; treats given and pats per day, tricks taught, journal milestones and seasonal items collected (per entry, so nothing is lost)"),
  // ── end pets ──

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
  emailTriage: house("Claude's task suggestions from your mail and what you did with each thread (a computer without Claude cannot rebuild them)"),
  taskChat: house('AI chat per task (the conversation is a result, not a cache: it shows on every computer)'),
  suggest: house("the suggestions' memory: what you dismissed or snoozed (your choices, not a cache)"),
  // ── chats ──
  // Every AI conversation follows you (src/app/70-ai-chats.js): messages are
  // items with ids and times, merged by id and shown in time order; taskChat
  // (above) is the per-task chat. Only the newest messages of a long chat
  // travel; older ones stay on the computer that has them (chatArchive) and
  // the others say where they are (chatMeta older).
  assistantChat: house("the assistant panel's conversation: messages by id (a reply being written is published once, then replaced by its id), with each proposal's state (applied, skipped, dismissed)"),
  chatMeta: house('per chat: when it was cleared, and how many older messages each computer keeps (one entry per computer, so they never clash)'),
  chatArchive: [L, "this computer's older messages of long chats (beyond what syncs); the others show where they are"],
  // ── end chats ──
  // ── memories ── (2.16, src/app/93-memories-core.js; a data key without undo steps)
  memories: [S, 'Memories: the daily journal (template lines, your own line and mood, kept forever), time capsules (sealed until their day), postcards of first visits, New Year goals and advent doors'],
  // ── end memories ──
  // ── perms ── (2.17: what each friend can see; src/app/98-perms-*.js, lib/friends/share.mjs; a data key with undo steps)
  friendPerms: [S, "what each friend can see: per friend, trusted or not, stopped or not, and per scope (tasks, calendar, money, locations, memories, presence, profile, game) the level, the chosen tasks, streams, tags or memories and the time window; 'Stop sharing everything' (field by field)"],
  // ── end perms ──
  // ── together ── (2.17: src/app/99-together-*.js. Only your own choices: the spaces themselves are the
  // file friends/spaces.json below, and what friends wrote is never in the state, so the MCP, the
  // assistant and the actions layer never read it.)
  together: pref('Together: your choices (friend layers in the task views, timeline and calendar, the weekly leaderboard, cheers), per space (the stream its accepted tasks count toward, muted), and the moments already celebrated (per entry, so two computers never celebrate twice)'),
  // ── end together ──
  // ── garden ── (2.18, agent 'garden-engine': src/app/94-garden-*.js, docs/dev/GARDEN.md. Coins, stages and
  // streak bonuses are computed on each computer from the tasks; only choices and events are kept, one map entry each,
  // so two computers add up: plants and decorations by id, the ledger by entry, rewards and discoveries per entry.)
  garden: pref('the garden: the day it began, every plant (where, when planted, watered, fed, trimmed, harvested) and decoration (where, facing, style) by id, the ledger of what you bought, sold, planted, harvested and made (one entry per thing, folded by month after 40 days), plants watered and visitors seen this week, the almanac, ribbons, daily tasks and weekly quests done, grants, moments already shown, and your last tool, plus (2.22) the fish log and bug book (the best size, quality and count of each kind you have caught), the casts and bugs caught each day, and your showcase and chosen rod, net, bait and float'),
  // ── end garden ──

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
//
// ── 2.17.2 ── CLASHES: ONLY THE PERSON'S OWN CONTENT CAN BECOME A REVIEW ITEM.
// Every synced key and file is one of three (conflictsOf below; docs/dev/SYNC_FORMAT.md 4.1):
//   review   the person's own content (tasks, notes, people, streams, tags, countdowns,
//            Home, journal, reviews, their settings and profile.json, finance edits,
//            their animations, source and auto-link choices): a real clash between two
//            computers is listed in Settings > Sync > Review.
//   quiet    a preference (MANIFEST 'pref'): the later choice wins, nothing is listed.
//   silent   housekeeping the app writes itself (MANIFEST 'silent', and every synced
//            FILE not marked conflicts: 'review'): job queues (requests.json), roles,
//            account and snapshot files a fetcher publishes, caches, AI results, logs,
//            orders, chats and proposals, friends' data, relays, share logs, counters.
//            It merges exactly like the rest (per register, later change wins; a deleted
//            item stays deleted: an edit never brings it back, only a restore does) and
//            no clash on it is ever recorded.
// A file without the flag is silent, so a new file never asks the person anything
// until someone decides it is their content.
const { record, list: items, map: entries, value: whole } = SPEC;
export const SYNC_FILES = Object.freeze([
  { id: 'accounts', path: 'accounts.json', role: 'shared', spec: record({ accounts: items() }),
    why: 'connected accounts (lib/accounts-file.mjs {version, accounts}): provider, address, features, status, which device fetches (fetcher), the source ids of its snapshots (sources); never a token' },
  { id: 'roles', path: 'roles.json', role: 'shared', conflicts: 'silent', spec: record({ roles: entries() }),
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
  { id: 'profile', path: 'profile.json', role: 'shared', conflicts: 'review', spec: record({ ai: record(), brief: record(), theme: record(), features: record(), finance: record() }),
    why: "the person's settings from config.json (name, own addresses, home zone, locale, currency, week start, working hours, AI, brief and finance AI choices, field by field); paths, this computer's zone, place, notifications and Enable Banking return page stay" },
  // Remote requests (lib/sync/requests.mjs): the requester adds, the runner claims and answers.
  { id: 'requests', path: 'requests.json', role: 'shared', conflicts: 'silent', spec: record({ requests: items() }),
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
  // ── finance ──
  // Finances on every device (lib/sync/finance-share.mjs, lib/finance-share.mjs):
  // the device that runs the 'bank' job publishes what the Finances view and the
  // Home money cards read (one register per month of transactions); every device
  // shares the user's edits (a merchant's category, a budget, an account's name,
  // colour and Show in Finances: one register each). Written only while sync is
  // end-to-end encrypted. The finance folder itself (the transaction store, the
  // spreadsheet, rules.json), bank sign-ins and connector tokens never sync.
  { id: 'finance', path: 'finance-share/finance.json', role: 'published', account: 'bank',
    spec: record({ head: record(), tx: entries(), bal: entries(), meta: record() }),
    why: 'the finance analysis the Finances view and Home show (transactions packed per month, balances, totals, accounts), published by the device that runs bank and finance updates' },
  { id: 'finance-edits', path: 'finance-share/edits.json', role: 'shared', conflicts: 'review',
    spec: record({ overrides: entries(), budgets: entries(), accounts: entries(record()) }),
    why: "the user's finance edits from any device: merchant categories, budgets, account names, colours, what counts in Your data and up to which day (the fetcher applies them)" },
  // ── end finance ──
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
  { id: 'anim-mine', path: 'animations/mine.json', role: 'shared', conflicts: 'review', spec: record({ items: items() }),
    why: 'the animations you made ("My animations", lib/anim-make.mjs); every read checks them again' },
  { id: 'pet-items', path: 'pets/items.json', role: 'shared', conflicts: 'review', spec: record({ items: items() }),
    why: 'the accessories you made for your pet ("My designs", lib/pet-ai.mjs); every read checks them again' },
  { id: 'index-settings', path: 'index/settings.json', role: 'shared', conflicts: 'review', spec: record({ judge: record() }, { local: ['folders', 'namesOnly', 'enabled'] }),
    why: "auto-link choices (auto-attach, threshold, the judge, interval); this computer's folders, names-only paths and its background switch stay" },
  { id: 'source-prefs', path: 'source-prefs.json', role: 'shared', conflicts: 'review', spec: record({ sources: entries(record({ accounts: entries(record()) })) }),
    why: "your choices on each source and its calendars or accounts (name, colour, on/off, mine), from sources.json (lib/source-prefs.mjs); the source definitions, links and check results stay" },
  // ── /files ──
  // ── blobs ──
  // Pictures and narration audio (lib/sync/blobs.mjs, docs/dev/SYNC_FORMAT.md
  // section 12): the bytes travel as sealed blobs in each device's own
  // devices/<id>/blobs/ folder; this catalogue says which file is which blob
  // ({id: SHA-256, size, kind, at, by, kid, re}), one register per file. Only
  // with end-to-end encryption (the ids would let a plain folder test for a
  // known picture).
  { id: 'blobs', path: 'blobs/index.json', role: 'shared', spec: record({ blobs: entries() }), e2eOnly: true,
    why: "which people's pictures and narration clips are in the sync folder (content hash, size, who stored it); the bytes travel as encrypted blobs" },
  // ── end blobs ──
  // ── locations ──
  // The permanent location log (lib/locations.mjs, 2.16): one record per stay or move,
  // kept forever and shared only between the user's own devices, so only with
  // end-to-end encryption. Records, completion places and badges are maps keyed
  // by record id: each id is one register (merged by id; the later copy of a
  // record wins, and a stay only grows on the device that saw it). "Delete my
  // location history" removes the entries, and the deletions travel too.
  { id: 'locations', path: 'locations/log.json', role: 'shared', spec: record({ prefs: record(), records: entries(), done: entries(), badges: entries() }), e2eOnly: true,
    why: 'where you have been (stays and moves: time, place, city, region, country, rounded position, source, device), where tasks were completed, location badges, and the logging switch' },
  // ── end locations ──
  // ── friends ──
  // OpenDash Friends (docs/dev/FRIENDS.md section 7, lib/friends/store.mjs): the person's
  // friends, relays, feed and settings follow them to their own devices, only with
  // end-to-end encryption. The identity's private keys are NOT here (secret store, and the
  // keyring: lib/sync/e2e.mjs registerKeyringExtra); tokens in these files are sealed with
  // a key only the identity derives. friends/local.json (outbox, seen ids, relay cursors,
  // presence heard) stays on each computer.
  { id: 'friends-me', path: 'friends/me.json', role: 'shared', spec: record({ prefs: record(), code: whole, invites: entries(), mine: entries() }), e2eOnly: true,
    why: 'your Friends settings (presence sharing, direct links), your friend code, open invites (their secrets sealed) and what you last shared with friends per kind' },
  { id: 'friends-list', path: 'friends/friends.json', role: 'shared', spec: record({ friends: entries() }), e2eOnly: true,
    why: 'your friends and requests: name, public keys, status, the handshake in progress, their mailbox and the drop token they gave you (sealed), permissions' },
  { id: 'friends-relays', path: 'friends/relays.json', role: 'shared', spec: record({ relays: entries(), home: whole }), e2eOnly: true,
    why: 'the relays you own or belong to, and which is your home relay (tokens sealed)' },
  { id: 'friends-feed', path: 'friends/feed.json', role: 'shared', spec: record({ msgs: entries() }), e2eOnly: true,
    why: "the friends feed: cheers, quests, challenges, focus sessions and space changes between you and your friends (validated on arrival), by message id" },
  { id: 'friends-shared', path: 'friends/shared.json', role: 'shared', spec: record({ items: entries() }), e2eOnly: true,
    why: "what each friend shares with you now (their profile, game summary and other scopes): the newest value per friend and kind" },
  // ── end friends ──
  // ── chats ──
  // Proposals waiting for your Apply (server/actions/journal.mjs): made on one
  // computer, applied or dismissed on any. Items by id; `applied` is a map
  // {opIndex: true} so two computers applying different parts both count; the
  // apply path refuses one that is no longer pending, and ids it creates are
  // derived from the proposal (server/actions/model.mjs withIdSeed), so even
  // two offline computers applying the same one end up with one copy.
  { id: 'proposals', path: 'state/proposals.json', role: 'shared', spec: record({ proposals: items({ applied: entries(), createdIds: entries() }) }),
    why: "the assistant's and MCP clients' proposals and their status (pending, applied, dismissed; which parts are applied)" },
  // ── end chats ──
  // ── perms ──
  // What friends share with you (lib/friends/share.mjs, 2.17): one file per friend,
  // read-only, validated on arrival and on every read; and the audit log of what
  // went to whom (never a copy of the data). Friends' data and who your friends
  // are travel between your own devices only end-to-end encrypted.
  { id: 'friends-received', dir: 'friends/received', role: 'shared', spec: record({ scopes: entries() }), e2eOnly: true,
    why: 'what each friend shares with you (their tasks, calendar, money, places or memories, at the level they chose), one register per scope' },
  { id: 'friends-share-log', path: 'friends/share-log.json', role: 'shared', spec: record({ sent: entries(entries()), events: whole }), e2eOnly: true,
    why: 'the audit log of sharing: what went to which friend and when (scope, level, item count, size), and when they confirmed it; no data' },
  // ── end perms ──
  // ── together ──
  // Shared spaces with friends (lib/friends/spaces.mjs, 2.17): each space's registers as
  // friends wrote them ({h, v} by path: the friends' own clocks), and whether you joined.
  // Only with end-to-end encryption; never read by the MCP, Claude or any action.
  // friends/spaces-clock.json (this computer's clock for spaces) stays on each computer.
  { id: 'together-spaces', path: 'friends/spaces.json', role: 'shared', spec: record({ spaces: entries(record({ regs: entries(), me: record() })) }), e2eOnly: true,
    why: 'the spaces you share with friends (lists, boards, parties, trips, a shared house): their tasks, comments, countdowns, expenses, quests, challenges, wishlists, goals and plan boards, register by register, and whether you joined each one' },
  // ── end together ──
  // ── fun ──
  // Fun with friends (lib/friends/fun.mjs, 2.17): gifts, the sticker book, reactions, duo streak days,
  // event drops, friendship quests done and the daily caps. Ids and numbers only (no friend text), keyed
  // entry by entry so two devices merge; only with end-to-end encryption, never read by the MCP or Claude.
  { id: 'friends-fun', path: 'friends/fun.json', role: 'shared', e2eOnly: true,
    spec: record({ log: entries(), mine: entries(), days: entries(entries()), sentDay: entries(), gifts: entries(record()), book: entries(), reacts: entries(entries()),
      waves: entries(record()), knocks: entries(record()), drops: entries(), qdone: entries(), marks: entries(), prefs: record({ themes: entries(), spaceThemes: entries() }) }),
    why: 'fun with friends: gifts sent and received, your sticker book, reactions, the days you and each friend finished something (duo streaks), seasonal event drops, friendship quests done and the daily caps' },
  // ── end fun ──
  // ── you ──
  // Friends' visits to your profile card (lib/profile-visits.mjs, 2.18): one entry per day and visitor under
  // a one-way key (never a name or a friend id), so the count is the same on every device. Counts only, a
  // year kept; only with end-to-end encryption, never read by the MCP or Claude.
  { id: 'profile-visits', path: 'friends/profile-visits.json', role: 'shared', e2eOnly: true, spec: record({ days: entries(entries()) }),
    why: "how many times friends opened your profile card, per day (one-way keys, never who)" },
  // ── end you ──
  // ── garden-social ──
  // Gardens with friends (lib/friends/garden.mjs, 2.18): what friends did in your garden and you in theirs
  // (visits, waterings, parcels, reactions, hearts, guestbook lines), older ones counted by month, what you have
  // seen of each friend's garden, and your guestbook and gift switches. Keyed entry by entry so two devices
  // merge; only with end-to-end encryption, never read by the MCP or Claude. Friends' gardens themselves are in
  // friends/shared.json (kind 'garden').
  { id: 'friends-garden', path: 'friends/garden.json', role: 'shared', e2eOnly: true,
    spec: record({ acts: entries(record()), bank: entries(entries()), seen: entries(record({ bl: entries() })), asks: entries(), asked: entries(record()), prefs: record() }),
    why: "gardens with friends: visits, waterings, parcels, reactions, hearts and guestbook lines between you and your friends' gardens, what you have seen of theirs, and your guestbook and gift switches" },
  // ── end garden-social ──
  // ── expenses ──
  // Expenses (lib/expenses.mjs, 2.18.1): what you spent for someone else and are waiting to be paid back, your
  // claims, the payers you remember and the hints you dismissed. Private: only your own devices, only with
  // end-to-end encryption; never given to friends (lib/friends/share.mjs does not read it) and never read by
  // the assistant. One register per field of each expense, so two computers editing different fields both count.
  { id: 'expenses', path: 'expenses/expenses.json', role: 'shared', e2eOnly: true,
    spec: record({ prefs: record(), payers: entries(record()), items: entries(record()), claims: entries(record()), reports: entries(record()), hints: entries(), asks: entries() }),
    why: 'your expenses (title, amount, date, payer, status, receipts, linked tasks), your claims and reports, the payers you remember and their settings, and the hints you dismissed' },
  // ── end expenses ──
]);
/** ── 2.17.2 ── A synced file's clash rule: 'review' only when marked so, else 'silent'. */
const clashRule = (f) => (f && f.conflicts === 'review' ? 'review' : 'silent');
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.json$/;
const SAFE_REL = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*\.json$/;
/** For a register key 'file:<rel>': {top, rel, spec, role, account, id, dir} or null (not a synced file). account: the job of a fixed file, the name (source or account id) of a file in a dir. */
export function fileSpecFor(top) {
  if (typeof top !== 'string' || !top.startsWith(FILE_PREFIX)) return null;
  const rel = top.slice(FILE_PREFIX.length);
  if (!SAFE_REL.test(rel) || rel.split('/').some(s => s === '..' || s === '.')) return null;
  for (const f of SYNC_FILES) {
    if (f.path && f.path === rel) return { top, rel, spec: f.spec, role: f.role, account: f.account || null, id: f.id, dir: null, conflicts: clashRule(f), ...(f.e2eOnly ? { e2eOnly: true } : {}) };
    if (f.dir && rel.startsWith(f.dir + '/')) {
      const name = rel.slice(f.dir.length + 1);
      // ── perms ── (2.17) a folder can be end-to-end only too (friends/received)
      if (!name.includes('/') && SAFE_NAME.test(name) && (!f.match || f.match.test(name))) return { top, rel, spec: f.spec, role: f.role, account: name.slice(0, -5), id: f.id, dir: f.dir, conflicts: clashRule(f), ...(f.e2eOnly ? { e2eOnly: true } : {}) };
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
/**
 * ── 2.17.2 ── What a clash on a register key ('custom', 'file:requests.json'...) is:
 * 'review' (the person's own content: listed in Settings > Sync > Review), 'quiet'
 * (a preference) or 'silent' (housekeeping, or anything not known). See CLASHES above.
 */
export function conflictsOf(top) {
  if (typeof top !== 'string') return 'silent';
  if (top.startsWith(FILE_PREFIX)) {
    const f = fileSpecFor(top);
    return f && f.conflicts === 'review' && !isQuietTop(top) ? 'review' : 'silent';
  }
  if (!Object.prototype.hasOwnProperty.call(MANIFEST, top) || MANIFEST[top][0] !== S) return 'silent';
  const flag = MANIFEST[top][2];
  return flag === 'pref' ? 'quiet' : flag === 'silent' ? 'silent' : 'review';
}
/** Can a clash on this register key become a Review item? Only the person's own content. */
export const reviewable = (top) => conflictsOf(top) === 'review';

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
//   time.json             this computer's observed system zone and its history: the zone
//                         a computer is in moves with it (trips are found from it on
//                         each computer; the trip decisions themselves sync in `travel`,
//                         the 12/24-hour choice in profile.json).
//   calendar/update.json, inbox/update.json   this computer's last job run: the
//                         30-minute throttle reads it, so a copy from the computer that
//                         fetches the connectors would keep this one from ever reading
//                         its own accounts; the page shows the snapshots' fetchedAt.
//   travel/rates-*.json   public exchange-rate caches (Frankfurter); merging their range
//                         lists would lose ranges, and each computer fetches its own.
//   index/files.json, index/status.json  this computer's folder index and its run.
//   state/actions-journal.json  undo history: its tokens name this computer's state versions.
//   people/images/*, cache/narration/*   binary files (pictures, audio): JSON
//                         registers cannot carry them; with encrypted sync they travel
//                         as blobs instead (the 'blobs' catalogue above, lib/sync/blobs.mjs).
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
  // ── together ── each entry is one register of a space, [h, value]: the copy a friend wrote LAST
  // (its friends' clock) wins on every computer, whichever computer heard it first
  'together-spaces': Object.freeze({ newest: (v) => (Array.isArray(v) && typeof v[0] === 'string' && /^\d{15}\./.test(v[0]) ? Number(v[0].slice(0, 15)) || null : null), depth: 5, quiet: true, maxBytes: 8 * 1024 * 1024 }),
  // ── end together ──
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
  blobs: Object.freeze({ quiet: true, maxBytes: 2 * 1024 * 1024 }),
  // ── locations ── record ids are made by the device that saw the stay (time + a random part), so two devices never race on one record
  locations: Object.freeze({ quiet: true }),
  // ── end locations ──
  // ── friends ── message ids and friend ids are random, so two devices never race on one entry
  'friends-me': Object.freeze({ quiet: true, maxBytes: 512 * 1024 }),
  'friends-list': Object.freeze({ quiet: true, maxBytes: 2 * 1024 * 1024 }),
  'friends-relays': Object.freeze({ quiet: true, maxBytes: 128 * 1024 }),
  'friends-feed': Object.freeze({ quiet: true, maxBytes: 4 * 1024 * 1024 }),
  'friends-shared': Object.freeze({ quiet: true, maxBytes: 2 * 1024 * 1024 }),
  // ── end friends ──
  // ── perms ── a friend's packet arrives on whichever device is on; the newest copy of each scope wins quietly
  'friends-received': Object.freeze({ quiet: true, maxBytes: 2 * 1024 * 1024 }),
  'friends-share-log': Object.freeze({ quiet: true, maxBytes: 1024 * 1024 }),
  // ── end perms ──
  // ── expenses ── ids are made by the device that adds them, so two devices never race on one expense
  expenses: Object.freeze({ quiet: true, maxBytes: 4 * 1024 * 1024 }),
  // ── end expenses ──
});
/** The merge rule of a synced file ({id} from fileSpecFor), or null (plain: later change wins). */
export const fileRule = (f) => (f && Object.prototype.hasOwnProperty.call(FILE_RULES, f.id) ? FILE_RULES[f.id] : null);
/** A register key whose clashes are not reported (results: the newest wins). */
export function isQuietTop(top) {
  const r = fileRule(fileSpecFor(top));
  return !!(r && r.quiet);
}
// ── /files ──
