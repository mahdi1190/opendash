// lib/sync/model.mjs - what folder sync shares, and how two copies merge.
//
// The synced part of the state is kept as a tree of REGISTERS, one per field:
//
//   ['custom', <taskId>, 'title']        a task's title
//   ['custom', <taskId>, '@alive']       does the task exist (false = deleted: a tombstone)
//   ['custom', <taskId>, '@pos']         its place in the list (lib/sync/fracindex.mjs)
//   ['custom', <taskId>, 'subtasks', <subId>, 'done']
//   ['statuses', <taskId>]               a map entry
//   ['home', 'layout']                   one field of a record
//
// Each register holds {h, n, s, v} (or {h, n, s, d:true} for a deleted field):
// h = the Hybrid Logical Clock time of the change (lib/sync/hlc.mjs; it ends
// in the deviceId), n = the writing device's change number, s = what that
// device had seen of the others then ({deviceId: n}), v = the value.
//
// Merging is last-writer-wins PER REGISTER: the larger h wins, on every device,
// in any order, any number of times. So two devices editing different fields
// of one task both keep their edit; the same field keeps the later edit, and
// the other one is reported as a conflict (when the two were concurrent: the
// later writer had not seen the earlier one). Deleting a task writes
// @alive=false; an edit that raced the delete is reported too.
//
//   capture(state, tree)          -> {w:[[path, value]], x:[path]}: what changed locally
//   applyWrite(tree, path, reg)   -> 'won' | 'lost' | 'same' (LWW)
//   materialize(state, tree, tops) -> a new state with the registers written in
//   validateOp(op, deviceId)      -> a remote change line, checked and cleaned
//
// SECRETS NEVER SYNC: only the top-level keys in SYNC_SPEC are ever read, any
// field whose NAME looks like a credential is dropped (isSecretName), and any
// value that LOOKS like a credential (API keys, OAuth tokens, JWTs, private
// keys) is not synced at all (looksSecret). The same checks run on incoming
// changes. Sign-ins, bank keys and relay secrets live outside the state anyway
// (<data>/secrets, connections.json, config.json), and the sync engine never
// opens those files.
//
// Platform-agnostic: plain JavaScript, no node: imports and no I/O, so the
// same core can run in Node, a browser/PWA or a mobile app. The on-disk format
// it produces is docs/dev/SYNC_FORMAT.md.
//
// Synced FILES (the account registry, published mail/calendar snapshots: see
// lib/sync/manifest.mjs SYNC_FILES) live in the same register tree under a
// top-level key 'file:<path>'. Functions that check paths take an optional
// `extra(top)` that returns the spec for such a key.

import { keysBetween, isPos } from './fracindex.mjs';
import { isHlc, decodeHlc } from './hlc.mjs';

// ─── What is synced ────────────────────────────────────────────────────────
const V = Object.freeze({ t: 'value' });
/**
 * A record: one register per field. opts.local lists fields that stay on this
 * device although the rest of the record syncs: never captured, never written
 * in, refused when they arrive. (Since 2.16 no synced key has one: calPrefs.mode
 * and homeUI.hideAmounts sync like the rest; the mechanism stays for later keys.)
 */
const rec = (fields = {}, { local = [] } = {}) => Object.freeze({ t: 'record', fields: Object.freeze(fields), ...(local.length ? { local: Object.freeze([...local]) } : {}) });
const list = (fields = {}, key = null) => Object.freeze({ t: 'list', item: rec(fields), key });
const map = (of = V) => Object.freeze({ t: 'map', of });
/**
 * A top-level key that is device-local while another key of the state is
 * true: `theme` while `autoTheme` is on (each computer turns dark in its own
 * evening). Its registers still merge, but it is neither captured nor
 * written in until the flag is off again; turning the flag off on another
 * device writes the synced value in here (materialize).
 */
const localWhile = (spec, flag) => Object.freeze({ ...spec, localWhile: flag });
const isLocalField = (spec, n) => !!(spec.local && spec.local.includes(n));
const localNow = (spec, s) => !!(spec && spec.localWhile && s && typeof s === 'object' && s[spec.localWhile] === true);

const idKey = (x) => (x && (typeof x.id === 'string' || (typeof x.id === 'number' && Number.isFinite(x.id))) && String(x.id) !== '' ? String(x.id) : null);
const binTaskKey = (x) => (x && x.binTs != null && idKey(x) ? `${x.binTs}:${idKey(x)}` : null);
const binNoteKey = (x) => (x && x.binTs != null ? `${x.binTs}:${(x.note && idKey(x.note)) || x.taskId || ''}` : null);

/**
 * The allow-list: HOW each synced key merges. WHICH keys sync (and why the
 * others are device-local or derived) is lib/sync/manifest.mjs; a test keeps
 * the two in step. A top-level key that is not here is never read, never
 * written and never leaves this computer.
 */
export const SYNC_SPEC = Object.freeze({
  custom: list({ subtasks: list() }),              // tasks
  statuses: map(), pinned: map(), deleted: map(),
  notes: map(list()),                              // task notes: {taskId: [{id, ts, text}]}
  completionLog: map(), taskActivity: map(list()),
  customOrder: map(),
  people: list({ notes: list() }), peopleNotes: map(),
  countdowns: list(), streams: list(), resources: list(), taskTemplates: list(),
  quickTemplates: V,
  tagRegistry: V, tags: V, pinnedTags: V, sidebarOrder: map(), defaultStream: V, archiveDays: V,
  // ── boards ── (2.16: lib/sync/manifest.mjs says why)
  taskBoards: list({ columns: list(), col: map(), laneFold: map() }),   // [{id, name, forView, filter, group, columns: [{id, label, rule}], col, colOrder, lanes, laneFold, fields, colorBy, personDrop, order}]
  boardOrder: map(),                                        // {'<boardId>|<colKey>': [taskId]} (each list one whole value)
  // ── end boards ──
  // ── lists ── (2.16: lib/sync/manifest.mjs says why)
  smartLists: list(),                                       // [{id, name, icon, base, q, sort, group, mode, order}]
  sidebarLayout: rec({ order: map(), hidden: map(), names: map(), items: map() }),   // {order: {tab: [blocks]}, hidden: {key: true}, names: {block: name}, items: {block: [views]}, pins: [views]}
  taskContexts: V,                                          // [{id, label, icon}]
  // ── end lists ──
  peopleIgnoredNames: V, peopleIgnoredEmails: V, peopleAutoLink: V,
  daynotes: map(), eventMeta: map(), calendarSettings: map(),
  weeklyReviews: V, reviews: V,
  home: rec({ snoozed: map(), widgetPrefs: map() }),
  bin: rec({ tasks: list({}, binTaskKey), notes: list({}, binNoteKey) }),
  // Preferences: they follow the person to every device. Maps merge entry by
  // entry (one calendar's follow/hide, one view's options, one Home card),
  // plain values by last writer.
  theme: localWhile(V, 'autoTheme'), autoTheme: V, density: V, sortBy: V, groupBy: V,
  openItemsIn: V, itemHero: V, viewFilter: V,
  collapsedSidebar: map(),                                  // {heading: folded}
  taskViewPrefs: map(rec({ collapsed: map() })),            // {view: {sort, group, collapsed: {group: bool}}}
  calPrefs: rec({ hidden: map() }),                         // hidden: {'cal:<id>' | tasks | plans | countdowns | declined: bool}; mode, stream
  peopleView: rec(),                                        // {mode, sort, group, show}
  homeUI: rec({ listFold: map() }),                         // listFold: {list widget copy: [folded groups]}; hideAmounts
  sidebarLists: map(rec()),                                 // {list: {sort, n}}
  animPrefs: rec({ overrides: map(), look: rec() }),        // {rules, overrides: {key: type}, look: {...}}
  // ── achievements ── (2.18: src/app/78-achievements.js, 71-ach-*.js) {v, unlocked: {id: day}, notes: {kind: day},
  // hist: {id: day} (unlocked from history, shown once as one summary), packs: {packId: day} (first checked),
  // checked, histSeen (the summary seen), xpPaid (the core's history XP paid)}
  achievements: rec({ unlocked: map(), notes: map(), hist: map(), packs: map() }),
  // ── end achievements ──
  // ── prefs ── (2.16: the rest of the layout follows the person too; lib/sync/manifest.mjs says why)
  viewMode: V, focus: V, sidebarCollapsed: V, lastReviewPrompt: V,
  paneSizes: map(),                                         // {pane: px} (clamped to the screen when used)
  suggestStats: rec({ rules: map(rec()), seen: map() }),    // {rules: {rule: {shown, acted, dismissed, ignoredStreak, askedKeep}}, seen: {key: {d, r, a}}}
  travel: rec({ trips: map(rec()), notTrips: map(), moments: map() }),   // the trip decisions {v, trips: {id: {...}}, notTrips: {key: day}, moments: {key: ts}}
  // ── end prefs ──
  // ── local ── (2.16: what the page kept per browser; src/app/06-core-seen.js)
  seen: map(map()),                                         // {group: {entry: value}}: one register per entry (a day flag is {'YYYY-MM-DD': 1})
  uiPrefs: rec({ story: rec(), motion: rec(), finance: rec() }),   // {story: {volume, speed, muted, mutedFor}, motion: {level, last}, finance: {inc, catMode, sort...}, assistantModel, focusBlock}
  drafts: map(rec()),                                       // {'week:<from>': {outcomes, wins, notes, summary, done}}
  // ── end local ──
  // ── game ── (2.16: src/app/92-game-*.js) {v, prefs: {fun, sounds, accent}, awards: {key: {d, xp, k, n}},
  // ticks: {kind: {day: 1}}, counts: {kind: {'YYYY-MM|slot': n}} (2.18: one register per month and device),
  // marks: {kind: {key: day}} (2.18: one register per key), focus: {id: {t, s, ms, e, k, d}}, run: {t, s, acc, p} | null (whole value),
  // quests: {weekFrom: {list (whole value), done: {questId: day}}}, records: {key: {v, d}}, seen: {level, levelMax, milestones: {id: day}, ...}}
  game: rec({ prefs: rec(), awards: map(rec()), ticks: map(map()), counts: map(map()), marks: map(map()), focus: map(rec()), quests: map(rec({ done: map() })), records: map(rec()), seen: rec({ milestones: map(), wallOpen: map() }) }),
  // ── end game ──
  // ── profile ── (2.17: src/app/97-profile-*.js) {v, name, pronouns, bio, working, theme, react, updatedAt,
  // status: {emoji, text, until}, avatar: {skin, hair, hairCol, eyes, ... one field per part}, badges: [id] | null (whole value),
  // places: [{label, cc}] (whole value), share: {profile, game, places}, collected: {itemId: day}}
  // ── you ── (2.18, agent 'you') look: {banner, bannerCol, bannerCol2, scene, np: {font, weight, col, fx}, title, favs (whole value),
  // cur: {k, t}, tint}: the banner, nameplate, title and the rest of the card's look, field by field; share.visits: count my visits (a bool)
  profile: rec({ status: rec(), avatar: rec(), share: rec(), collected: map(), look: rec({ np: rec(), cur: rec() }) }),
  // ── end you ──
  // ── end profile ──
  // ── wardrobe ── (2.18: src/app/97-profile-4wardrobe.js) {v, outfits: {id: {name, look (whole value: {part: id}), at, n}}}
  wardrobe: rec({ outfits: map(rec()) }),
  // ── end wardrobe ──
  // ── pets ── (2.18, agent 'pets': src/app/97-pets-*.js) {v, look: {species, breed, coat, ... one field per part}, name, born, on, share,
  // scenes, updatedAt, fed: {day: n}, petted: {day: n}, tricks: {id: day}, journal: {key: {d, k, n}}, collected: {'hat:witch': day}}
  pet: rec({ look: rec(), fed: map(), petted: map(), tricks: map(), journal: map(rec()), collected: map(), unl: map(), roster: map(rec()), bd: map(map()), bd0: map(), gt: map(), sh: map(), buy: map(rec()), lures: map(), lused: map(), played: map(), seen: map() }),
  // ── end pets ──
  // Results (docs/dev/MULTI_DEVICE.md, connect once, use everywhere): Claude's
  // mail suggestions (by id) and what was done with each thread (by thread id),
  // each task's AI chat (messages, kept in order), the suggestions' memory.
  emailTriage: rec({ suggestions: list(), events: list(), handled: map() }),
  taskChat: map(list()),
  suggest: rec(),
  // ── finance ──
  // No state key on purpose: nothing financial is kept in the dashboard state.
  // Finances sync as two FILES (lib/sync/manifest.mjs SYNC_FILES 'finance' and
  // 'finance-edits', packed by lib/sync/finance-share.mjs).
  // ── end finance ──
  // ── chats ──
  // The assistant panel's conversation (messages by id, each with its proposals
  // by id: their state, which parts are applied/skipped), and per chat
  // ('task:<id>' | 'assistant') when it was cleared and how many older messages
  // each computer keeps ({deviceId: {n, name}}: one entry per computer).
  assistantChat: rec({ messages: list({ proposals: list() }) }),
  chatMeta: map(rec({ older: map() })),
  // ── end chats ──
  // ── memories ── {v, journal: {day: {text, facts, line, mood, polished}}, capsules: [{id, text, created, opens, opened}], postcards: {CC: {...}}, goals: {year: {list: [...], at}}, advent: {year: {day: ms}}}
  memories: rec({ journal: map(rec()), capsules: list(), postcards: map(rec()), goals: map(rec({ list: list() })), advent: map(map()) }),
  // ── end memories ──
  // ── perms ── {v, stopped, friends: {friendId: {trusted, stopped, at, scopes: {scope: {mode, ids, streams, tags, items, from, until, label}}}}}
  // one register per field of each scope (a list of ids is one whole value: the later choice wins)
  friendPerms: rec({ friends: map(rec({ scopes: map(rec()) })) }),
  // ── end perms ──
  // ── together ── (2.17, src/app/99-together-*.js) {v, prefs: {layers, calendar, timeline, leaderboard, ...},
  // spaces: {spaceId: {stream, muted, ...}}, seen: {key: day}} (the spaces themselves: friends/spaces.json)
  together: rec({ prefs: rec(), spaces: map(rec()), seen: map() }),
  // ── end together ──
  // ── garden ── (2.18, src/app/94-garden-*.js, docs/dev/GARDEN.md section 3) {v, since, plants: {uid: {p, x, y, t, w, dh, fb, f, hv, hc, pr, v}},
  // decor: {uid: {d, x, y, r, v, at}}, led: {key: {d, k, c, x, i, n}} (each entry one value), bank: {month: {c, x, i, nn}} (each one value),
  // wl / vd: {day: {id: 1}}, disc / rib / gr / seen: {id: value}, dt / wq: {day|week: {id: day}}, prefs: {tool, seed, ...}}
  garden: rec({ plants: map(rec()), decor: map(rec()), led: map(), bank: map(), wl: map(map()), vd: map(map()), disc: map(), rib: map(), dt: map(map()), wq: map(map()), gr: map(), seen: map(), prefs: rec(),
    fl: map(rec()), bl: map(rec()), fd: map(rec()),   // 2.22: the fish log, the bug book and the day's fishing
    sp: map(), vl: map(rec()),   // every catch as a record, each one whole value, and the variants found (src/app/94-garden-fish-8spec.js)
    gl: map(), gq: map(), gv: map(), glt: map(),
    wd: map() }),   // playing together, entry by entry (docs/dev/GARDEN_TOGETHER.md): two devices never lose each other's queued posts
  // ── end garden ──
});
export const SYNC_KEYS = Object.freeze(Object.keys(SYNC_SPEC));
/** Keys that are device-local while a flag is on (theme while autoTheme). */
const GATED = Object.freeze(SYNC_KEYS.filter(k => SYNC_SPEC[k].localWhile));
const hasLocal = (spec) => !!spec && (spec.t === 'record' ? !!spec.local || Object.values(spec.fields).some(hasLocal) : spec.t === 'map' ? hasLocal(spec.of) : spec.t === 'list' ? hasLocal(spec.item) : false);
/** Top-level keys with device-local fields inside (none since 2.16). */
const WITH_LOCAL = Object.freeze(SYNC_KEYS.filter(k => hasLocal(SYNC_SPEC[k])));

// ─── Secrets ───────────────────────────────────────────────────────────────
const SECRET_NAME_RE = /(password|passwd|passphrase|secret|token|apikey|privatekey|bearer|cookie|credential|credentials|sessionid|sessionkey|authorization|oauth|signingkey|encryptionkey|refreshkey|webhookurl)$/;
/** A field or key name that holds a credential (accessToken, client_secret, apiKey, relaySecret, password...). */
export function isSecretName(name) {
  const n = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  return SECRET_NAME_RE.test(n) || n === 'pin' || n === 'auth' || n === 'otp';
}
const SECRET_VALUE_RE = /(\bsk-[A-Za-z0-9_-]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bxox[abprs]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{30,}|\bya29\.[0-9A-Za-z_-]{20,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[?&](access_token|token|api_key|apikey|key|secret|sig|signature)=[A-Za-z0-9._~%-]{12,})/;
/** A string that looks like a credential (API key, OAuth token, JWT, private key, a URL carrying a token). */
export const looksSecret = (s) => typeof s === 'string' && SECRET_VALUE_RE.test(s);

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_SEG = 300;
const MAX_VALUE_BYTES = 256 * 1024;
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
/** A key that can be part of a register path (and a property name in the state). */
const segOk = (s) => typeof s === 'string' && s.length > 0 && s.length <= MAX_SEG && !FORBIDDEN.has(s) && s[0] !== '@';
const fieldOk = (n) => segOk(n) && !isSecretName(n);

/**
 * A copy of a value that is safe to sync: credential-named keys and prototype
 * keys are dropped. {value} or {skip: reason} (a credential-looking string, or
 * too big).
 */
export function sanitize(v) {
  let skip = null;
  const walk = (x, depth) => {
    if (skip) return undefined;
    if (depth > 40) { skip = 'too deep'; return undefined; }
    if (typeof x === 'string') { if (looksSecret(x)) skip = 'looks like a credential'; return x; }
    if (x === null || typeof x === 'number' || typeof x === 'boolean') return Number.isFinite(x) || typeof x !== 'number' ? x : null;
    if (Array.isArray(x)) return x.map(e => { const r = walk(e, depth + 1); return r === undefined ? null : r; });
    if (typeof x === 'object') {
      const o = {};
      for (const k of Object.keys(x)) {
        if (FORBIDDEN.has(k) || isSecretName(k) || x[k] === undefined) continue;
        o[k] = walk(x[k], depth + 1);
      }
      return o;
    }
    return undefined;   // functions, symbols, bigint: not JSON
  };
  const value = walk(v, 0);
  if (skip) return { skip };
  if (value === undefined) return { skip: 'not JSON' };
  if (JSON.stringify(value).length > MAX_VALUE_BYTES) return { skip: 'too big' };
  return { value };
}

// ─── Small helpers ─────────────────────────────────────────────────────────
/** JSON with sorted keys: equal values give equal strings. */
export function stable(v) {
  if (v === undefined) return 'null';
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
/**
 * cyrb128 over the string's UTF-16 code units, as 32 hex digits. Not
 * cryptographic: it names list items that have no id ('h:' + 16 digits) and
 * fingerprints synced data for crash recovery. Pure JS, synchronous, the same
 * on every platform (docs/dev/SYNC_FORMAT.md).
 */
export function hash(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1, h2, h3, h4].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
export const devOf = (h) => { const d = decodeHlc(h); return d ? d.deviceId : null; };

/** A value without its device-local fields (see rec opts.local). */
function syncedValue(spec, v) {
  if (spec.t === 'record' && isObj(v)) { const o = {}; for (const k of Object.keys(v)) if (!isLocalField(spec, k)) o[k] = syncedValue(fieldSpec(spec, k), v[k]); return o; }
  if (spec.t === 'map' && isObj(v)) { const o = {}; for (const k of Object.keys(v)) o[k] = syncedValue(spec.of, v[k]); return o; }
  if (spec.t === 'list' && Array.isArray(v)) return v.map(e => syncedValue(spec.item, e));
  return v;
}
/** The part of a state that syncs: the synced keys, less their device-local fields and the keys local right now (theme while autoTheme). */
function syncedPart(state) {
  const o = {};
  for (const k of SYNC_KEYS) {
    if (!own(state, k) || state[k] === undefined || localNow(SYNC_SPEC[k], state)) continue;
    o[k] = WITH_LOCAL.includes(k) ? syncedValue(SYNC_SPEC[k], state[k]) : state[k];
  }
  return o;
}
/** A fingerprint of the synced part of a state (sorted keys). */
export function syncedFingerprint(state) { return hash(stable(syncedPart(state))); }
/** The synced part of a state as one canonical string (tests: two devices converged). */
export function syncedView(state) { return stable(syncedPart(state)); }

// ─── The register tree ─────────────────────────────────────────────────────
// node = {r: register|null, k: Map<segment, node>|null}
export const newTree = () => ({ r: null, k: null });
const kid = (node, seg) => (node && node.k ? node.k.get(seg) || null : null);
function ensure(tree, path) {
  let n = tree;
  for (const seg of path) {
    if (!n.k) n.k = new Map();
    let c = n.k.get(seg);
    if (!c) { c = { r: null, k: null }; n.k.set(seg, c); }
    n = c;
  }
  return n;
}
export function getReg(tree, path) {
  let n = tree;
  for (const seg of path) { n = kid(n, seg); if (!n) return null; }
  return n.r;
}
const regVal = (node) => (node && node.r && !node.r.d ? node.r.v : undefined);
const aliveOf = (node) => regVal(kid(node, '@alive'));

const differs = (a, b) => !!a.d !== !!b.d || (!a.d && stable(a.v) !== stable(b.v));
/** True when `later` was written without having seen `earlier` (different devices). */
export function concurrent(earlier, later) {
  const ed = devOf(earlier.h), ld = devOf(later.h);
  if (!ed || ed === ld) return false;
  const seen = later.s && Number(later.s[ed]) || 0;
  return seen < (Number(earlier.n) || 0);
}

/**
 * Last-writer-wins write of one register. reg = {h, n, s, v} or {h, n, s, d:true}.
 * onConflict({path, kept, lost}) hears about a concurrent write that lost.
 */
export function applyWrite(tree, path, reg, onConflict) {
  const node = ensure(tree, path);
  const cur = node.r;
  if (cur && cur.h === reg.h) return 'same';
  if (!cur || reg.h > cur.h) {
    if (cur && onConflict && differs(cur, reg) && concurrent(cur, reg)) onConflict({ path, kept: reg, lost: cur });
    node.r = reg;
    return 'won';
  }
  if (onConflict && differs(cur, reg) && concurrent(reg, cur)) onConflict({ path, kept: cur, lost: reg });
  return 'lost';
}

/** Every register as [path, reg] (depth first). */
export function* walkRegs(tree, path = []) {
  if (tree.r) yield [path, tree.r];
  if (tree.k) for (const [seg, c] of tree.k) yield* walkRegs(c, [...path, seg]);
}

/**
 * Registers as compact JSON, nested like the tree:
 *   {v: 2, ops: [[h, n, seenIndex]], vecs: [{deviceId: n}], tree: {"custom": {"u-1": {"title": {"": [opIndex, value]}}}}}
 * A register is {"": [opIndex]} when the field was deleted. Registers written
 * by one change share one ops entry, and changes share seen vectors.
 */
export function serializeTree(tree) {
  const ops = [], opIndex = new Map(), vecs = [], vecIndex = new Map();
  const opOf = (r) => {
    let byN = opIndex.get(r.h);
    if (!byN) { byN = new Map(); opIndex.set(r.h, byN); }
    let i = byN.get(r.n);
    if (i === undefined) {
      let si = -1;
      if (r.s && typeof r.s === 'object') {
        si = vecIndex.get(r.s);
        if (si === undefined) { si = vecs.length; vecs.push(r.s); vecIndex.set(r.s, si); }
      }
      i = ops.length; ops.push([r.h, r.n, si]); byN.set(r.n, i);
    }
    return i;
  };
  const walk = (node) => {
    const o = {};
    if (node.r) o[''] = node.r.d ? [opOf(node.r)] : [opOf(node.r), node.r.v];
    if (node.k) for (const [seg, c] of node.k) o[seg] = walk(c);
    return o;
  };
  return { v: 2, ops, vecs, tree: walk(tree) };
}
export function loadTree(data) {
  const tree = newTree();
  if (!data || data.v !== 2 || !isObj(data.tree)) return tree;
  const vecs = Array.isArray(data.vecs) ? data.vecs.map(v => (isObj(v) ? Object.freeze({ ...v }) : null)) : [];
  const ops = Array.isArray(data.ops) ? data.ops : [];
  const walk = (o, node, depth) => {
    if (depth > 16) return;
    for (const seg of Object.keys(o)) {
      const val = o[seg];
      if (seg === '') {
        const op = Array.isArray(val) ? ops[val[0]] : null;
        if (!Array.isArray(op) || !isHlc(op[0])) continue;
        const s = op[2] >= 0 ? vecs[op[2]] || null : null;
        node.r = val.length >= 2 ? { h: op[0], n: Number(op[1]) || 0, s, v: val[1] } : { h: op[0], n: Number(op[1]) || 0, s, d: true };
        continue;
      }
      if (FORBIDDEN.has(seg) || !isObj(val)) continue;
      if (!node.k) node.k = new Map();
      const c = { r: null, k: null };
      node.k.set(seg, c);
      walk(val, c, depth + 1);
    }
  };
  walk(data.tree, tree, 0);
  return tree;
}

// ─── Lists: element keys and positions ─────────────────────────────────────
/** [{k, e}] for an array: the element's id (or the list's own key), else a content hash; repeats get '#2', '#3'. */
function keyed(spec, arr) {
  const out = [], used = new Map();
  const keyFn = spec.key || idKey;
  for (const e of arr) {
    let k = isObj(e) ? keyFn(e) : null;
    if (k == null || !segOk(k)) k = 'h:' + hash(stable(e)).slice(0, 16);
    const n = (used.get(k) || 0) + 1;
    used.set(k, n);
    out.push({ k: n > 1 ? `${k}#${n}` : k, e });
  }
  return out;
}
/**
 * Is an item rebuilt from registers COMPLETE: does it carry the key it is filed
 * under? Changes can arrive out of order (a restore before the creation it
 * restores), so an item can be alive while its id has not arrived yet. Such an
 * item is not shown, and never taken for "deleted here" either; it appears
 * when the rest arrives.
 */
function itemComplete(spec, k, e) {
  const base = k.replace(/#\d+$/, '');
  let c = isObj(e) ? (spec.key || idKey)(e) : null;
  if (c == null || !segOk(c)) c = 'h:' + hash(stable(e)).slice(0, 16);
  return c === base;
}
const before = (pa, ka, pb, kb) => pa < pb || (pa === pb && ka < kb);
/** Longest run (not necessarily adjacent) of items already in position order: they keep their positions. */
function keepMask(items, pos) {
  const idx = [];
  for (let i = 0; i < items.length; i++) if (pos[i] != null) idx.push(i);
  const tails = [], prev = new Array(items.length).fill(-1);
  for (const i of idx) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (before(pos[tails[m]], items[tails[m]].k, pos[i], items[i].k)) lo = m + 1; else hi = m; }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const keep = new Array(items.length).fill(false);
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) keep[i] = true;
  return keep;
}
function capturePositions(path, items, node, out) {
  if (!items.length) return;
  const pos = items.map(({ k }) => { const p = regVal(kid(kid(node, k), '@pos')); return isPos(p) ? p : null; });
  const keep = keepMask(items, pos);
  let i = 0, lo = '';
  while (i < items.length) {
    if (keep[i]) { lo = pos[i]; i++; continue; }
    let j = i;
    while (j < items.length && !keep[j]) j++;
    let hi = j < items.length ? pos[j] : null;
    // Two kept items can share a position (two devices inserted at the same spot):
    // nothing fits strictly between them, so the second one moves too.
    while (hi !== null && !(lo < hi)) { keep[j] = false; j++; while (j < items.length && !keep[j]) j++; hi = j < items.length ? pos[j] : null; }
    const keys = keysBetween(lo, hi, j - i);
    for (let t = i; t < j; t++) if (pos[t] !== keys[t - i]) out.w.push([[...path, items[t].k, '@pos'], keys[t - i]]);
    lo = keys[keys.length - 1];
    i = j;
  }
}

// ─── capture: local state vs registers -> changes ──────────────────────────
const fieldSpec = (spec, n) => (own(spec.fields, n) ? spec.fields[n] : V);

/**
 * What the local state has that the registers do not: {w: [[path, value]], x: [path]}.
 * opts.onSkip(path, reason) hears about values that were not synced (credentials).
 */
/** The spec of a top-level register key: a state key, or a synced file ('file:...') through `extra`. */
export function specOfTop(top, extra) {
  if (own(SYNC_SPEC, top)) return SYNC_SPEC[top];
  if (typeof top === 'string' && top.startsWith(FILE_PREFIX) && typeof extra === 'function') return extra(top) || null;
  return null;
}
export const FILE_PREFIX = 'file:';
/** Spec builders, for describing synced files (lib/sync/manifest.mjs). */
export const SPEC = Object.freeze({ value: V, record: rec, list, map });

/**
 * One synced FILE's content against its registers (like capture() for one key):
 * {w, x, skipped}. present=false means the file is gone (its registers are tombstoned).
 */
export function captureFile(top, spec, value, present, tree, opts = {}) {
  const out = { w: [], x: [], skipped: 0 };
  const ctx = { out, onSkip: (p, why) => { out.skipped++; opts.onSkip?.(p, why); } };
  capNode(spec, [top], present ? value : undefined, present, kid(tree, top), ctx);
  return out;
}
/** A synced FILE's content rebuilt from its registers: {present, value}. */
export function materializeFile(top, spec, value, present, tree) {
  return matNode(spec, present ? value : undefined, present, kid(tree, top));
}

export function capture(state, tree, opts = {}) {
  const out = { w: [], x: [], skipped: 0 };
  const ctx = { out, onSkip: (p, why) => { out.skipped++; opts.onSkip?.(p, why); } };
  const s = isObj(state) ? state : {};
  for (const top of SYNC_KEYS) {
    if (localNow(SYNC_SPEC[top], s)) continue;      // device-local right now (theme while autoTheme is on)
    const has = own(s, top) && s[top] !== undefined;
    capNode(SYNC_SPEC[top], [top], has ? s[top] : undefined, has, kid(tree, top), ctx);
  }
  return out;
}

function capNode(spec, path, cur, present, node, ctx) {
  const { out } = ctx;
  if (spec.t === 'value') {
    const r = node && node.r;
    if (!present) { if (r && !r.d) out.x.push(path); return; }
    const s = sanitize(cur);
    if (s.skip) { ctx.onSkip(path, s.skip); return; }
    if (!r || r.d || stable(r.v) !== stable(s.value)) out.w.push([path, s.value]);
    return;
  }
  // A container (record, map, list) has its own @alive register, so "empty"
  // and "not there" stay different, and deleting it is one tombstone.
  if (present && !(spec.t === 'list' ? Array.isArray(cur) : isObj(cur))) return;   // an unexpected shape is left alone, never "deleted"
  const alive = aliveOf(node);
  if (!present) { if (alive === true) out.w.push([[...path, '@alive'], false]); return; }
  if (alive !== true) out.w.push([[...path, '@alive'], true]);
  if (spec.t === 'record' || spec.t === 'map') {
    const names = new Set();
    for (const n of Object.keys(cur)) if (fieldOk(n)) names.add(n);
    if (node && node.k) for (const n of node.k.keys()) if (n[0] !== '@') names.add(n);
    if (spec.local) for (const n of spec.local) names.delete(n);   // this device's own fields
    for (const n of names) {
      const has = own(cur, n) && cur[n] !== undefined;
      capNode(spec.t === 'record' ? fieldSpec(spec, n) : spec.of, [...path, n], has ? cur[n] : undefined, has, kid(node, n), ctx);
    }
    return;
  }
  if (spec.t === 'list') {
    const items = keyed(spec, cur).filter(({ e, k }) => {
      if (isObj(e)) return true;
      ctx.onSkip([...path, k], 'not an object');
      return false;
    });
    const local = new Set();
    for (const { k, e } of items) { local.add(k); capNode(spec.item, [...path, k], e, true, kid(node, k), ctx); }
    if (node && node.k) for (const [k, kn] of node.k) {
      if (k[0] === '@' || local.has(k)) continue;
      // Not here: deleted here, unless it is an item whose creation has not arrived yet (hidden, see itemComplete).
      if (aliveOf(kn) === true) { const m = matNode(spec.item, undefined, false, kn); if (m.present && !itemComplete(spec, k, m.value)) continue; }
      capNode(spec.item, [...path, k], undefined, false, kn, ctx);
    }
    capturePositions(path, items, node, out);
  }
}

// ─── materialize: registers -> state ───────────────────────────────────────
/**
 * A new state: `cur` with the synced keys in `tops` rebuilt from the registers.
 * Local-only fields are kept. A key that is local while a flag is on (theme
 * while autoTheme) is rebuilt whenever its flag is, after it, and only when
 * the flag is off then: Auto turned off on another device brings that
 * device's theme here.
 */
export function materialize(state, tree, tops = SYNC_KEYS) {
  const want = new Set(tops);
  for (const k of GATED) if (want.has(SYNC_SPEC[k].localWhile)) want.add(k);
  const next = { ...state };
  const run = (top) => {
    const has = own(state, top) && state[top] !== undefined;
    const r = matNode(SYNC_SPEC[top], has ? state[top] : undefined, has, kid(tree, top));
    if (r.present) next[top] = r.value; else delete next[top];
  };
  for (const top of want) if (own(SYNC_SPEC, top) && !GATED.includes(top)) run(top);
  for (const top of want) if (GATED.includes(top) && !localNow(SYNC_SPEC[top], next)) run(top);
  return next;
}

function matNode(spec, cur, present, node) {
  if (!node) return { present, value: cur };
  if (spec.t === 'value') {
    const r = node.r;
    if (!r) return { present, value: cur };
    return r.d ? { present: false } : { present: true, value: clone(r.v) };
  }
  const isList = spec.t === 'list';
  if (present && !(isList ? Array.isArray(cur) : isObj(cur))) return { present, value: cur };
  const al = kid(node, '@alive');
  if (!al || !al.r) return { present, value: cur };        // never synced: left as it is
  if (al.r.d || al.r.v !== true) return { present: false };
  if (!isList) {
    const obj = present ? { ...cur } : {};
    if (node.k) for (const [n, kn] of node.k) {
      if (!fieldOk(n) || isLocalField(spec, n)) continue;   // this device's own fields stay as they are
      const has = own(obj, n) && obj[n] !== undefined;
      const r = matNode(spec.t === 'record' ? fieldSpec(spec, n) : spec.of, obj[n], has, kn);
      if (r.present) obj[n] = r.value; else delete obj[n];
    }
    return { present: true, value: obj };
  }
  const items = keyed(spec, present ? cur : []);
  const rows = [], seen = new Set();
  items.forEach(({ k, e }, i) => {
    seen.add(k);
    const kn = kid(node, k);
    const r = matNode(spec.item, e, true, kn);
    if (r.present) rows.push({ k, e: r.value, pos: regVal(kid(kn, '@pos')) ?? null, i });
  });
  if (node.k) for (const [k, kn] of node.k) {
    if (k[0] === '@' || seen.has(k)) continue;
    const r = matNode(spec.item, undefined, false, kn);
    if (r.present && itemComplete(spec, k, r.value)) rows.push({ k, e: r.value, pos: regVal(kid(kn, '@pos')) ?? null, i: Infinity });
  }
  const placed = rows.filter(r => isPos(r.pos)).sort((a, b) => (before(a.pos, a.k, b.pos, b.k) ? -1 : 1));
  const loose = rows.filter(r => !isPos(r.pos)).sort((a, b) => a.i - b.i || (a.k < b.k ? -1 : 1));
  return { present: true, value: [...placed, ...loose].map(r => r.e) };
}

// ─── Incoming changes ──────────────────────────────────────────────────────
/**
 * Where a path points: {leaf: 'value'|'alive'|'pos', elems: [prefix lengths of
 * the containers it is inside], idCheck?: the list key a list item's `id` must
 * equal}, or null when the path is not part of the synced schema.
 */
export function classifyPath(path, extra) {
  if (!Array.isArray(path) || path.length < 1 || path.length > 12) return null;
  const top = path[0];
  let spec = typeof top === "string" ? specOfTop(top, extra) : null;
  if (!spec) return null;
  const elems = [];
  let i = 1, inItem = false, itemAt = -1, idKeyed = false;
  for (;;) {
    if (spec.t === 'value') {
      if (i !== path.length) return null;
      const field = path[i - 1];
      const check = idKeyed && itemAt === i - 1 && field === 'id' && !/^h:|#\d+$/.test(path[i - 2]);
      return { leaf: 'value', elems, ...(check ? { idCheck: path[i - 2] } : {}) };
    }
    elems.push(i);
    if (i >= path.length) return null;
    const seg = path[i];
    if (seg === '@alive') return i + 1 === path.length ? { leaf: 'alive', elems } : null;
    if (seg === '@pos') return inItem && i + 1 === path.length ? { leaf: 'pos', elems } : null;
    if (spec.t === 'list') {
      if (!segOk(seg)) return null;
      idKeyed = !spec.key; spec = spec.item; inItem = true; i++; itemAt = i; continue;
    }
    if (!fieldOk(seg) || isLocalField(spec, seg)) return null;
    spec = spec.t === 'record' ? fieldSpec(spec, seg) : spec.of;
    inItem = false; i++;
  }
}

/**
 * Check a change line read from another device's log: {v, dev, n, h, s, w, x}.
 * Returns {op, rejected} with every bad write dropped, or null if the line
 * itself is not a valid change from `deviceId`.
 */
export function validateOp(op, deviceId, extra) {
  if (!isObj(op) || op.v !== 1 || op.dev !== deviceId || !Number.isInteger(op.n) || op.n < 1 || !isHlc(op.h) || devOf(op.h) !== deviceId) return null;
  const s = {};
  if (isObj(op.s)) for (const [k, v] of Object.entries(op.s)) if (/^[0-9a-f]{16}$/.test(k) && Number.isInteger(v) && v >= 0) s[k] = v;
  const w = [], x = [];
  let rejected = 0;
  for (const e of Array.isArray(op.w) ? op.w.slice(0, 20000) : []) {
    const ok = Array.isArray(e) && e.length === 2 ? checkWrite(e[0], e[1], extra) : null;
    if (ok) w.push([e[0], ok.value]); else rejected++;
  }
  for (const p of Array.isArray(op.x) ? op.x.slice(0, 20000) : []) {
    const c = classifyPath(p, extra);
    if (c && c.leaf === "value") x.push(p); else rejected++;
  }
  return { op: { v: 1, dev: op.dev, n: op.n, h: op.h, s: Object.freeze(s), w, x }, rejected };
}

/** {value} if `value` may be written at `path`, else null. */
export function checkWrite(path, value, extra) {
  const c = classifyPath(path, extra);
  if (!c) return null;
  if (c.leaf === 'alive') return typeof value === 'boolean' ? { value } : null;
  if (c.leaf === 'pos') return isPos(value) ? { value } : null;
  const s = sanitize(value);
  if (s.skip) return null;
  if (c.idCheck != null && String(s.value) !== c.idCheck) return null;
  return { value: s.value };
}

/** For a write at `path`: the prefixes of the list items / map entries it sits in (for delete-vs-edit checks). */
export function elementPrefixes(path, extra) {
  const c = classifyPath(path, extra);
  return c ? c.elems.map(n => path.slice(0, n)) : [];
}

// ── files ──
// DATED RESULTS (lib/sync/manifest.mjs FILE_RULES `newest`): a synced file whose
// copies carry their own produced-at (fetchedAt, savedAt, at). Last writer wins
// stays the merge rule, but such a register is written with a timestamp made
// from its produced-at (wall = that time, never later than now) instead of the
// moment it was captured. So the copy PRODUCED last wins everywhere, in any
// order: two computers that both had a copy before they synced (the first pass
// after an update, a computer that slept) keep the newer one, not the one
// captured last. A local copy older than the one already known (or than its
// removal: a prune on another computer) is never sent (`stale`: the engine
// writes the known one back into the file). Two copies of
// the same moment, or a register written by a clock that ran ahead, fall back
// to an ordinary change (the later write wins).
import { encodeHlc } from './hlc.mjs';
/**
 * Split one file's captured writes {w, x} (captureFile) by rule {newest(value) -> ms|null, depth}:
 * {w, x} (ordinary changes), dated: [{h, w}] (one timestamp each), stale (an older local copy was left out).
 */
export function datedSplit(c, { tree, newest, depth = 1, deviceId, now = Date.now() }) {
  const out = { w: [], x: c.x.slice(), dated: [], stale: false };
  const byH = new Map();
  for (const wr of c.w) {
    const [p, v] = wr;
    const at = p.length === depth && p[p.length - 1][0] !== '@' ? newest(v) : null;
    if (at == null) { out.w.push(wr); continue; }
    const cur = getReg(tree, p);
    const curAt = cur && !cur.d ? newest(cur.v) : null;
    if (curAt != null && at < curAt) { out.stale = true; continue; }       // older than what is known: never sent
    if (cur && cur.d && (decodeHlc(cur.h) || { wall: 0 }).wall > at) { out.stale = true; continue; }   // removed after this copy was made (a prune elsewhere)
    const h = encodeHlc(Math.min(at, now), 0, deviceId);
    if (curAt === at || (cur && cur.h >= h)) { out.w.push(wr); continue; } // same moment, or a clock ahead: an ordinary change
    if (!byH.has(h)) { byH.set(h, []); out.dated.push({ h, w: byH.get(h) }); }
    byH.get(h).push(wr);
  }
  return out;
}
// ── /files ──
