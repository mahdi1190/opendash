/* ============================================================
   SEEN FLAGS, PREFERENCES AND DRAFTS THAT USED TO BE PER BROWSER (2.16)
   What the page kept in this browser's localStorage now lives in the synced
   state, so every computer shows the same dashboard: a brief, story or special
   animation seen on one is not shown again on the other, and the story and
   opening settings match.
     state.seen     {group: {entry: value}}: seen, played and dismissed. Merged
                    entry by entry everywhere (lib/sync/model.mjs map(map()),
                    86-live-sync.js per key), so flags from two computers add up.
                    A day flag is {'YYYY-MM-DD': 1} and a one-off one {name: 1}:
                    two computers marking the same flag write the same value.
     state.uiPrefs  {story, motion, finance, assistantModel, focusBlock, refreshEvery}: the story
                    player's volume, speed and mute, the animation intensity,
                    Finances' display choices (src/finance/00-core.js SHARED_F),
                    the assistant's model, a running focus block, how often Home
                    refreshes on its own (12-home-refresh.js). Per field.
     state.drafts   {'week:<from>': {...}}: the weekly review in progress.
   All three are UI keys (no undo step, no backup) that every tab takes from a
   newer copy (SHARED_UI_KEYS) and other computers sync as preferences
   (lib/sync/manifest.mjs '── local ──').

   Groups in state.seen (and who writes them):
     brief, homeRead, opening          days: the Morning brief seen, Home's read-along, the full opening sequence
     storyPlayed:<kind>                days: a story played to the end (79-story-engine.js)
     confetti:morning|evening|week     days: a story's confetti (79-story-*.js)
     weekStory                         days (a week's first day): Home > Week opened the weekly story by itself
     inboxZero                         days: the inbox-zero celebration (78-delight-hooks.js)
     animMoment, momentCards           'YYYY-MM-DD|key': once-a-day moments; moment cards shown (the 3-a-day cap)
     once                              {name: 1}: one-off cards, tips and banners (storyHint, new22Anim, onedriveBannerOff,
                                       travelAddCard, travelOptinLine; syncVersion:<id> and syncVersionShown:<id>:
                                       another device's older version, dismissed / shown once, 56-presence-notice.js)
     openingLast, openingExact         {place: ref}: where the opening scene rotation is (78-anim-wire.js)
     firstSnow                         {winter: day}: the first snowy day of a winter
     moments, travelDepartX            {key: time}: moments shown, departure cards dismissed
     arrival                           {place: {at, by}}: an arrival welcome shown, and by which browser (78-anim-uk.js)
     travelOptin, travelDot            {key: day}: travel prompts answered "Not now"; the travel chip's "new" dots
     financeTx                         {last: {since, keys, at}}: the transactions seen at the last visit to Finances >
                                       Transactions, on any computer (src/finance/37-transactions.js; shortened opaque row keys)
     aiEmail                           {messageId: time}: an email Claude was shown for task suggestions
                                       (55-email-google.js), so no computer sends it again (kept 60 days)
   Day entries older than three weeks and timed entries past their age are
   pruned; a group itself is never removed (a removed map would hide what
   another computer adds to it at the same time).

   BEFORE THE STATE FILE HAS LOADED the page runs on the browser's cached copy,
   which a newer file replaces wholesale. So until uiSharedBoot() (99-boot.js,
   after the file) every write also goes to a small outbox in localStorage,
   and the outbox is written into the loaded state at boot: a flag set in the
   first second (Home's read-along, the opening) is not lost. Writes made in
   this load are newer than the file, so the outbox wins over it.

   MIGRATION (once per browser): the old localStorage keys (_seenLegacyRead)
   are folded in at boot, after the file: flags are added (union), values,
   preferences and drafts only fill what the state does not have yet, so a
   value synced from another computer is never overwritten and running it on
   both computers, or twice, gives the same result. The old keys are removed
   (and the marker set) only once the server holds the result; until then a
   reader also looks at them, which can only add "seen". A browser without the
   server keeps them.

   Kept in localStorage on purpose, as first-paint caches the state then
   overrides: dashboard-opening-mode and dashboard-opening-day (body.html),
   dashboard-motion-level / -last (motion.js, body.html). The Finances keys (dash-finance-ui-v1, dash-finance-seen-v1)
   are folded in by the finance view itself (src/finance/00-core.js, 37-transactions.js): dash-finance-ui-v1 keeps
   where you are in that view. uiSharedAfterRender
   (80-main-render.js) rewrites them from the state.
   What stays on this computer: the state cache itself, per-tab claims and
   session memory, window sizes, this computer's location (history, arrival
   record, county), its zone banners, notification claims, the server's
   start link and offline page, caches of synced files, request throttles.
   ============================================================ */
const _SEEN_OUTBOX_KEY = 'dashboard-shared-outbox';
const _SEEN_MIGRATED_KEY = 'dashboard-shared-migrated';
const _SEEN_DAY_KEEP = 21;                       // days a dated entry is kept
const _SEEN_TS_DAYS = { moments: 400, travelDepartX: 120, arrival: 30, aiEmail: 60 };   // timed groups: days an entry is kept
const _UIPREF_RECORDS = new Set(['story', 'motion', 'finance']);         // preferences merged field by field
const _SEEN_KEPT_CACHES = new Set(['dashboard-motion-level', 'dashboard-motion-last', 'dashboard-motion', 'dashboard-delight-recent']);
const _SEEN_EMPTY = Object.freeze({ seen: {}, uiPrefs: {}, drafts: {}, keys: [], from: {} });
let _uiSharedBooted = false;
let _seenLegacyMemo = null;
let _seenOutboxMemo = null;
let _uiSharedTimer = 0;
const _uiSharedLast = { motion: '', focus: undefined, openingDay: '' };

const _seenIsObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const _seenOwn = (o, k) => _seenIsObj(o) && Object.prototype.hasOwnProperty.call(o, k);
function _seenName(s) { return typeof s === 'string' && s.length > 0 && s.length <= 200 && s[0] !== '@' && s !== '__proto__' && s !== 'constructor' && s !== 'prototype'; }
function _seenSame(a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); }
function _seenLs(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function _seenLsJson(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function _seenIsDay(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); }
function _seenAddDays(day, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10) : null;
}
function _seenToday() { try { return todayStr(); } catch (e) { return new Date(Date.now()).toISOString().slice(0, 10); } }   // clock-ok: before the clock loads

/* ---------- the old localStorage keys ---------- */
/** The old keys, read into their new shapes: {seen, uiPrefs, drafts, keys (to remove once saved), from ('group\nentry' -> key)}. */
function _seenLegacyRead() {
  const out = { seen: {}, uiPrefs: {}, drafts: {}, keys: [], from: {} };
  let names = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith('dashboard-') || k.startsWith('dash-'))) names.push(k); } } catch (e) { names = []; }
  const put = (g, e, v, k) => { if (!_seenName(g) || !_seenName(e) || v === undefined || v === null) return; (out.seen[g] = out.seen[g] || {})[e] = v; if (k) out.from[g + '\n' + e] = k; };
  const day = (g, raw) => { if (_seenIsDay(raw)) put(g, raw, 1); };
  for (const k of names) {
    const raw = _seenLs(k);
    if (raw == null) continue;
    let used = true;
    const json = () => { try { return JSON.parse(raw); } catch (e) { return null; } };
    if (k === 'dashboard-brief-seen') day('brief', raw);
    else if (k === 'dashboard-home-read') day('homeRead', raw);
    else if (k.startsWith('dashboard-story-played-')) day('storyPlayed:' + k.slice(23), raw);
    else if (k === 'dashboard-story-confetti') day('confetti:morning', raw);
    else if (k === 'dashboard-story-ev-confetti') day('confetti:evening', raw);
    else if (k === 'dashboard-story-week-confetti') day('confetti:week', raw);
    else if (k.startsWith('dashboard-story-week-auto-')) { if (_seenIsDay(k.slice(26))) put('weekStory', k.slice(26), 1); }
    else if (k === 'dashboard-story-hint') put('once', 'storyHint', 1);
    else if (k === 'dashboard-new22-anim') { if (raw === '1') put('once', 'new22Anim', 1); }
    else if (k === 'dashboard-onedrive-banner-off') { if (raw === '1') put('once', 'onedriveBannerOff', 1); }
    else if (k === 'dashboard-travel-add-card') put('once', 'travelAddCard', 1);
    else if (k === 'dashboard-travel-optin-line') put('once', 'travelOptinLine', 1);
    else if (k.startsWith('dashboard-opening-last-')) put('openingLast', k.slice(23), raw, k);
    else if (k.startsWith('dashboard-opening-exact-')) put('openingExact', k.slice(24), raw, k);
    else if (k === 'dashboard-anim-first-snow') { const r = json(); if (r && /^\d{4}$/.test(String(r.winter)) && _seenIsDay(r.day)) put('firstSnow', String(r.winter), r.day); }
    else if (k === 'dashboard-anim-moment') { const r = json(); if (r && _seenIsDay(r.day) && Array.isArray(r.keys)) for (const x of r.keys) if (typeof x === 'string') put('animMoment', r.day + '|' + x, 1); }
    else if (k === 'dashboard-moments-shown') { const r = json(); if (_seenIsObj(r)) for (const [x, at] of Object.entries(r)) if (Number.isFinite(Number(at))) put('moments', x, Number(at)); }
    else if (k === 'dashboard-moments-day') { const r = json(); if (r && _seenIsDay(r.date)) for (let i = 0; i < Math.min(9, Number(r.n) || 0); i++) put('momentCards', r.date + '|#' + i, Number(r.lastAt) || 1); }
    else if (k.startsWith('dashboard-travel-depart-x:')) put('travelDepartX', k.slice(26), Number(raw) || 1, k);
    else if (k === 'dashboard-travel-optin-seen') { const r = json(); if (_seenIsObj(r)) for (const [x, d] of Object.entries(r)) put('travelOptin', x, d); }
    else if (k === 'dashboard-travel-dot') { const r = json(); if (r && typeof r.key === 'string' && _seenIsDay(r.date)) put('travelDot', 'moments', { key: r.key, date: r.date }, k); }
    else if (k === 'dashboard-travel-chip-dot') { if (_seenIsDay(raw)) put('travelDot', 'chip', raw, k); }
    else if (k === 'dashboard-delight-recent') { const r = json(); const ib = r && r.inbox; if (ib && ib.zeroShown && _seenIsDay(ib.day)) put('inboxZero', ib.day, 1); }
    else if (k === 'dashboard-story-ui') {
      const r = json();
      if (_seenIsObj(r)) { const s = {}; for (const f of ['volume', 'speed', 'muted', 'mutedFor']) if (r[f] !== undefined && r[f] !== null) s[f] = r[f]; if (Object.keys(s).length) out.uiPrefs.story = s; }
    }
    else if (k === 'dashboard-assistant-model') { if (/^[\w.:-]{1,80}$/.test(raw)) out.uiPrefs.assistantModel = raw; }
    else if (k === 'dashboard-motion-level' || k === 'dashboard-motion-last') {
      if (/^(off|subtle|standard|playful)$/.test(raw)) (out.uiPrefs.motion = out.uiPrefs.motion || {})[k === 'dashboard-motion-level' ? 'level' : 'last'] = raw;
    }
    else if (k === 'dashboard-anim-focus') {
      const r = json();
      // Only a block still running moves over (a finished one would only be cleared again).
      const now = typeof Clock !== 'undefined' && Clock.now ? Clock.now() : Date.now();   // the block was timed with Clock.now()
      if (r && Number.isFinite(r.start) && Number.isFinite(r.ms) && r.start + r.ms > now) { out.uiPrefs.focusBlock = { start: r.start, ms: r.ms, ref: String(r.ref || ''), ...(r.told ? { told: true } : {}) }; out.from['uiPrefs\nfocusBlock'] = k; }
    }
    else if (k.startsWith('dashboard-weekly-draft-')) { const r = json(); const from = k.slice(23); if (_seenIsObj(r) && _seenIsDay(from)) { out.drafts['week:' + from] = r; out.from['drafts\nweek:' + from] = k; } }
    else used = false;
    if (used && !_SEEN_KEPT_CACHES.has(k)) out.keys.push(k);
  }
  return out;
}
let _seenLegacyFrom = {};                        // 'group\nentry' -> old key, kept after boot until the old keys are gone
function _seenLegacy() {
  if (_seenLegacyMemo) return _seenLegacyMemo;
  _seenLegacyMemo = _seenLs(_SEEN_MIGRATED_KEY) === '1' ? _SEEN_EMPTY : _seenLegacyRead();
  _seenLegacyFrom = _seenLegacyMemo.from;
  return _seenLegacyMemo;
}
/** A value was removed in the state (a dot cleared, a block stopped, a draft saved): its old key must not bring it back. */
function _seenForgetLegacy(kind, name) {
  const L = _seenLegacy();
  const k = _seenLegacyFrom[kind + '\n' + name];
  if (!k) return;
  try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ }
  if (L === _SEEN_EMPTY) return;
  if (L.seen[kind]) delete L.seen[kind][name];
  if (kind === 'uiPrefs') delete L.uiPrefs[name];
  if (kind === 'drafts') delete L.drafts[name];
}

/* ---------- the outbox (writes made before the state file loaded) ---------- */
function _uiSharedOutbox() {
  if (_seenOutboxMemo) return _seenOutboxMemo;
  const o = _seenLsJson(_SEEN_OUTBOX_KEY);
  _seenOutboxMemo = { seen: _seenIsObj(o && o.seen) ? o.seen : {}, uiPrefs: _seenIsObj(o && o.uiPrefs) ? o.uiPrefs : {} };
  return _seenOutboxMemo;
}
function _uiSharedOutboxPut(kind, group, entry, value) {
  const o = _uiSharedOutbox();
  if (kind === 'seen') (o.seen[group] = _seenIsObj(o.seen[group]) ? o.seen[group] : {})[entry] = value === undefined ? null : value;
  else o.uiPrefs[group] = value === undefined ? null : value;
  try { localStorage.setItem(_SEEN_OUTBOX_KEY, JSON.stringify(o)); } catch (e) { /* storage blocked: the state copy still has it */ }
}
/** Something to write in the NEXT load's state (the welcome set-up replaces the state and reloads). */
function seenMarkPending(group, entry, value) { if (_seenName(group) && _seenName(entry)) _uiSharedOutboxPut('seen', group, entry, value === undefined ? 1 : value); }

/** This browser's own id (device-local): tells a flag this browser set from one another computer set. */
let _seenBrowserIdMemo = '';
function seenBrowserId() {
  if (_seenBrowserIdMemo) return _seenBrowserIdMemo;
  let id = _seenLs('dashboard-browser-id');
  if (!id || !/^[a-z0-9]{8,32}$/.test(id)) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem('dashboard-browser-id', id); } catch (e) { /* this load only */ }
  }
  _seenBrowserIdMemo = id;
  return id;
}

/* ---------- reading and writing ---------- */
/** state.seen[group][entry], or undefined. Before boot: this load's outbox first; before the migration: the old key last. */
function seenGet(group, entry) {
  const og = _uiSharedOutbox().seen[group];
  if (_seenOwn(og, entry)) return og[entry] === null ? undefined : og[entry];
  const g = _seenIsObj(state.seen) ? state.seen[group] : null;
  if (_seenIsObj(g) && g[entry] !== undefined && g[entry] !== null) return g[entry];
  const lg = _seenLegacy().seen[group];
  return lg ? lg[entry] : undefined;
}
/** All entries of a group as one plain object (a copy). */
function seenAll(group) {
  const out = Object.assign({}, _seenLegacy().seen[group] || {}, _seenIsObj(state.seen) && _seenIsObj(state.seen[group]) ? state.seen[group] : {});
  const og = _uiSharedOutbox().seen[group];
  if (_seenIsObj(og)) for (const [e, v] of Object.entries(og)) { if (v === null) delete out[e]; else out[e] = v; }
  return out;
}
function _seenWrite(group, entry, value) {
  if (!_seenIsObj(state.seen)) { if (value == null) return false; state.seen = {}; }
  let g = state.seen[group];
  if (!_seenIsObj(g)) { if (value == null) return false; g = state.seen[group] = {}; }
  if (value == null) { if (!_seenOwn(g, entry)) return false; delete g[entry]; return true; }
  if (_seenOwn(g, entry) && _seenSame(g[entry], value)) return false;
  g[entry] = value;
  return true;
}
/** Set (or with null, remove) one entry; saved at once and sent to the server soon. */
function seenSet(group, entry, value) {
  if (!_seenName(group) || !_seenName(entry)) return false;
  const changed = _seenWrite(group, entry, value);
  if (!_uiSharedBooted) _uiSharedOutboxPut('seen', group, entry, value);
  if (value == null) _seenForgetLegacy(group, entry);
  if (changed) { _seenPruneGroup(group); _uiSharedSave(); }
  return changed;
}
/** Set many entries of one group to the same value: one prune and one save for the lot. */
function seenSetMany(group, entries, value) {
  if (!_seenName(group) || !Array.isArray(entries)) return false;
  let changed = false;
  for (const entry of entries) {
    if (!_seenName(entry)) continue;
    if (_seenWrite(group, entry, value)) changed = true;
    if (!_uiSharedBooted) _uiSharedOutboxPut('seen', group, entry, value);
  }
  if (changed) { _seenPruneGroup(group); _uiSharedSave(); }
  return changed;
}
function seenDay(group, day) { return !!seenGet(group, day || _seenToday()); }
function seenMarkDay(group, day) { const d = day || _seenToday(); return _seenIsDay(d) ? seenSet(group, d, 1) : false; }
/** Once a day per key ('YYYY-MM-DD|key'). */
function seenOn(group, key, day) { return !!seenGet(group, (day || _seenToday()) + '|' + key); }
function seenMarkOn(group, key, day, value) { return seenSet(group, (day || _seenToday()) + '|' + key, value === undefined ? 1 : value); }
function seenOnce(name) { return !!seenGet('once', name); }
function seenMarkOnce(name) { return seenSet('once', name, 1); }

function _seenPruneGroup(group) {
  const g = _seenIsObj(state.seen) ? state.seen[group] : null;
  if (!_seenIsObj(g)) return false;
  const cut = _seenAddDays(_seenToday(), -_SEEN_DAY_KEEP), maxDays = _SEEN_TS_DAYS[group], now = Date.now();
  let n = 0;
  for (const e of Object.keys(g)) {
    if (cut && /^\d{4}-\d{2}-\d{2}/.test(e) && e.slice(0, 10) < cut) { delete g[e]; n++; continue; }
    const at = typeof g[e] === 'number' ? g[e] : _seenIsObj(g[e]) && typeof g[e].at === 'number' ? g[e].at : null;
    if (maxDays && at && at > 1e12 && now - at > maxDays * 864e5) { delete g[e]; n++; }
  }
  return n > 0;
}
function _seenPruneAll() {
  let changed = false;
  if (_seenIsObj(state.seen)) for (const g of Object.keys(state.seen)) changed = _seenPruneGroup(g) || changed;
  // Weekly drafts of weeks long gone (a review saved since removed its own).
  const cut = _seenAddDays(_seenToday(), -56);
  if (_seenIsObj(state.drafts) && cut) for (const k of Object.keys(state.drafts)) if (/^week:\d{4}-\d{2}-\d{2}$/.test(k) && k.slice(5) < cut) { delete state.drafts[k]; changed = true; }
  return changed;
}

/** A preference: state.uiPrefs[field] (story and motion merge field by field with what this browser had). */
function uiPrefGet(field) {
  const st = _seenIsObj(state.uiPrefs) ? state.uiPrefs[field] : undefined;
  const rec = _UIPREF_RECORDS.has(field);
  let v = _seenLegacy().uiPrefs[field];
  if (st !== undefined && st !== null) v = rec && _seenIsObj(st) && _seenIsObj(v) ? Object.assign({}, v, st) : st;
  const ob = _uiSharedOutbox().uiPrefs;
  if (_seenOwn(ob, field)) { const o = ob[field]; v = o === null ? undefined : rec && _seenIsObj(o) && _seenIsObj(v) ? Object.assign({}, v, o) : o; }
  return v;
}
function _uiPrefWrite(field, value) {
  if (!_seenIsObj(state.uiPrefs)) { if (value == null) return false; state.uiPrefs = {}; }
  const P = state.uiPrefs;
  if (value == null) { if (!_seenOwn(P, field)) return false; delete P[field]; return true; }
  if (_UIPREF_RECORDS.has(field) && _seenIsObj(value)) {
    // A record keeps its other fields (one register per field when it syncs); it is never replaced or removed.
    const cur = _seenIsObj(P[field]) ? P[field] : (P[field] = {});
    let ch = false;
    for (const [k, x] of Object.entries(value)) { if (x === undefined) continue; if (!_seenOwn(cur, k) || !_seenSame(cur[k], x)) { cur[k] = x; ch = true; } }
    return ch;
  }
  if (_seenOwn(P, field) && _seenSame(P[field], value)) return false;
  P[field] = value;
  return true;
}
/** Set a preference (null removes it; for story and motion: the fields given change, the others stay). */
function uiPrefSet(field, value) {
  if (!_seenName(field)) return false;
  const changed = _uiPrefWrite(field, value);
  if (!_uiSharedBooted) {
    const ob = _uiSharedOutbox().uiPrefs[field];
    _uiSharedOutboxPut('uiPrefs', field, null, _UIPREF_RECORDS.has(field) && _seenIsObj(value) && _seenIsObj(ob) ? Object.assign({}, ob, value) : value);
  }
  if (value == null) _seenForgetLegacy('uiPrefs', field);
  if (changed) _uiSharedSave();
  return changed;
}
/** Motion.setLevel (src/motion.js) tells the state: the intensity follows you to your other computers. */
function uiSharedMotionChanged(level, last) {
  const m = { level };
  if (last) m.last = last;
  _uiSharedLast.motion = JSON.stringify(Object.assign({}, uiPrefGet('motion') || {}, m));
  uiPrefSet('motion', m);
}

/** A draft: state.drafts[key] (or this browser's old copy before the migration). */
function draftGet(key) {
  const d = _seenIsObj(state.drafts) ? state.drafts[key] : undefined;
  if (_seenIsObj(d)) return d;
  const l = _seenLegacy().drafts[key];
  return _seenIsObj(l) ? l : undefined;
}
/** Keep a draft (typing: saved a moment later, and when the tab is hidden or closed). */
function draftSet(key, value) {
  if (!_seenName(key) || !_seenIsObj(value)) return;
  if (!_seenIsObj(state.drafts)) state.drafts = {};
  state.drafts[key] = value;
  _uiSharedSave(true);
}
function draftDel(key) {
  _seenForgetLegacy('drafts', key);
  if (!_seenOwn(state.drafts, key)) return;
  delete state.drafts[key];
  _uiSharedSave();
}

/* ---------- saving ---------- */
// A flag should reach the other computers before the person walks over to them: saveUI() (this
// browser at once) plus a persist a few seconds later instead of the minute UI changes wait. No undo step.
function _uiSharedSave(later) {
  clearTimeout(_uiSharedTimer);
  _uiSharedTimer = 0;
  if (later) { _uiSharedTimer = setTimeout(() => _uiSharedSave(false), 600); return; }
  if (typeof saveUI === 'function') saveUI();
  if (_uiSharedBooted && typeof schedulePersist === 'function' && typeof _serverAvailable !== 'undefined' && _serverAvailable && !_persistTimer) schedulePersist(3000);
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Before 99-boot.js's own handlers (this file loads first): a draft typed a moment ago goes with them.
  window.addEventListener('pagehide', () => { if (_uiSharedTimer) _uiSharedSave(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && _uiSharedTimer) _uiSharedSave(false); });
}

/* ---------- boot: the outbox and the one-time migration ---------- */
/** Called once the state file has loaded (99-boot.js). */
function uiSharedBoot() {
  if (_uiSharedBooted) return;
  _uiSharedBooted = true;
  let changed = false;
  // 1. What this load wrote before the file arrived (newer than the file).
  const ob = _uiSharedOutbox();
  for (const [g, es] of Object.entries(ob.seen)) if (_seenIsObj(es)) for (const [e, v] of Object.entries(es)) changed = _seenWrite(g, e, v) || changed;
  for (const [f, v] of Object.entries(ob.uiPrefs)) changed = _uiPrefWrite(f, v) || changed;
  _seenOutboxMemo = { seen: {}, uiPrefs: {} };
  try { localStorage.removeItem(_SEEN_OUTBOX_KEY); } catch (e) { /* storage blocked */ }
  // 2. This browser's old keys, once: flags add up, values only fill gaps (a synced value stays).
  const L = _seenLegacy();
  if (L !== _SEEN_EMPTY) changed = _uiSharedFold(L) || changed;
  _seenLegacyMemo = _SEEN_EMPTY;             // the state has everything now
  changed = _seenPruneAll() || changed;
  if (changed) _uiSharedSave();              // this browser at once, the server in a few seconds
  if (L !== _SEEN_EMPTY) _uiSharedConfirm(L.keys, 0);
  uiSharedAfterRender();
}
function _uiSharedFold(L) {
  let changed = false;
  for (const [g, es] of Object.entries(L.seen)) for (const [e, v] of Object.entries(es)) {
    const cur = _seenIsObj(state.seen) && _seenIsObj(state.seen[g]) ? state.seen[g][e] : undefined;
    if (cur === undefined || cur === null) changed = _seenWrite(g, e, v) || changed;
  }
  for (const [f, v] of Object.entries(L.uiPrefs)) {
    const cur = _seenIsObj(state.uiPrefs) ? state.uiPrefs[f] : undefined;
    if (_UIPREF_RECORDS.has(f) && _seenIsObj(v)) {
      const add = {};
      for (const [k, x] of Object.entries(v)) if (!_seenOwn(cur, k)) add[k] = x;
      if (Object.keys(add).length) changed = _uiPrefWrite(f, add) || changed;
    } else if (cur === undefined || cur === null) changed = _uiPrefWrite(f, v) || changed;
  }
  for (const [k, d] of Object.entries(L.drafts)) {
    if (!_seenIsObj(state.drafts)) state.drafts = {};
    const cur = state.drafts[k];
    if (!_seenIsObj(cur)) { state.drafts[k] = d; changed = true; continue; }
    const blank = (x) => x === undefined || x === null || x === '' || (_seenIsObj(x) && !Object.keys(x).length);
    for (const [f, x] of Object.entries(d)) if (blank(cur[f]) && !blank(x)) { cur[f] = x; changed = true; }
  }
  return changed;
}
/** The old keys go (and the marker is set) once the server holds the result; else a later boot folds them again (same result). */
async function _uiSharedConfirm(keys, tries) {
  if (typeof _serverAvailable === 'undefined' || !_serverAvailable || typeof _persistFire !== 'function') return;
  if (_persistInFlight) { if (tries < 30) setTimeout(() => _uiSharedConfirm(keys, tries + 1), 500); return; }
  const want = _persistKey(_stateForPersist());
  try { await _persistFire(); } catch (e) { /* checked below */ }
  if (_lastPersistedKey !== want) { if (tries < 30) setTimeout(() => _uiSharedConfirm(keys, tries + 1), 5000); return; }
  for (const k of keys) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  try { localStorage.setItem(_SEEN_MIGRATED_KEY, '1'); } catch (e) { /* storage blocked */ }
}

/* ---------- after every render: what a newer copy brought ---------- */
/**
 * 80-main-render.js calls this after each render. A change that arrived from another tab or
 * computer takes effect here: the intensity (and its first-paint copy), a focus block started or
 * stopped elsewhere, the opening's first-paint copies (mode, and "already shown today").
 */
function uiSharedAfterRender() {
  if (!_uiSharedBooted) return;              // before the file: this browser's own copies are right
  try {
    const m = uiPrefGet('motion');
    const sig = _seenIsObj(m) ? JSON.stringify(m) : '';
    if (sig && sig !== _uiSharedLast.motion) {
      _uiSharedLast.motion = sig;
      if (window.Motion && typeof Motion.applySyncedLevel === 'function' && Motion.applySyncedLevel(m.level, m.last)) {
        setTimeout(() => { if (typeof _animSyncRoot === 'function') _animSyncRoot(); render(); }, 0);
      }
    }
    const fb = _seenIsObj(state.uiPrefs) ? state.uiPrefs.focusBlock : undefined;
    if (fb !== _uiSharedLast.focus) { _uiSharedLast.focus = fb; if (typeof animFocusPaint === 'function') animFocusPaint(); }
    if (typeof animOpeningModeSync === 'function') animOpeningModeSync();
    // The splash's own day (this computer's calendar date, as body.html works it out).
    const d = new Date(), today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // clock-ok: the splash's day
    if (_uiSharedLast.openingDay !== today && seenDay('opening', today)) {
      _uiSharedLast.openingDay = today;
      if (_seenLs('dashboard-opening-day') !== today) { try { localStorage.setItem('dashboard-opening-day', today); } catch (e) { /* storage blocked */ } }
    }
  } catch (e) { /* the next render tries again */ }
}
