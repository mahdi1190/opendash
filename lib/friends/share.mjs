// lib/friends/share.mjs - what each friend can see (2.17), the Node side. Owner: perms.
//
// SENDER-SIDE ENFORCEMENT. Every packet a friend gets from here is built from
// this device's own data, filtered by that friend's scopes (state.friendPerms;
// the model and the allow-list are src/app/98-perms-0logic.js, evaluated below
// so the page, the sender and the receiver share one copy). Each builder copies
// named fields one by one (never a spread of a record), and its result goes
// through permsClean (the allow-list) before it is hashed, previewed or sent.
// The preview ('What Sam can see') calls the very same functions.
//
// Profile ('profile'), game progress ('share:game') and presence ('presence')
// are sent by their owners (docs/dev/FRIENDS.md section 9); this module decides
// whether they may go to a friend: attach() installs the friends engine's
// policy, app.ctx.friends.setPolicy((friend, scope) -> bool), from the same
// rules (permsEffective). Tasks, calendar, money, locations and memories are
// built and sent here as 'share:<scope>' (kinds defined below with defineKind,
// schemas generated from the allow-list).
//
//   createSharePipeline({dataDir, store, actions, getConfig, friends, isMain, log, emit})
//     .attach()                  define the kinds, install the policy, listen (call once the engine exists)
//     .start() / .stop()         change-driven passes (debounced) + a slow timer
//     .kick(ms) / .pass({friend})   a pass soon / now
//     .preview(friendId)         EXACTLY what would be sent now (the same builders)
//     .receive(friend, kind, body)  a message from a friend (validated, stored read-only)
//     .audit()                   the audit log (what was sent, when, to whom: never the data)
//     .policy(friend, scope)     the rule the engine asks before it sends anything
//
// MESSAGES ('share:<scope>', store 'handler': the engine validates them and hands them to our
// handler, storing nothing itself; we keep the validated, assembled copy in friends/received/):
//   {v: 1, op: 'full', mode, h, at, until?, data}
//   {v: 1, op: 'diff', mode, base, h, at, until?, upsert, remove, extra?}    tasks, calendar, memories
//   {v: 1, op: 'part', mode, h, at, until?, seq, of, part}                  a 'full' over 30 KB, in pieces (base64 JSON)
//   take back: the engine's friend:revoke (send(friendId, kind, null, {revoke: true})); the friend's
//   handler sees {revoked: true} and deletes its copy. Profile and game progress are taken back the
//   same way when they go off for a friend, and given again (the last published body) when they come back.
//   'share:ack' {scope, h, at}   back from the friend: their copy is h
//   'share:resync' {scope}       back from the friend: a diff or a piece did not fit, send it whole
// h = the hash of the scope's cleaned data (items sorted by id). Default deny:
// an unknown scope or level, an expired window, a stop, a friend not marked
// trusted, a friend who is not (or no longer) a confirmed friend: nothing is
// sent. An active share that ends gets a revoke; a blocked or removed friend
// gets nothing at all (the engine asks their app to delete what they had).
//
// WHO SENDS: data updates go out from the main computer (Settings > Sync); a
// change of a friend's scopes goes out from whichever device made it, and a
// revoke from any device.
//
// FILES
//   <data>/friends/share-log.json     the audit log {v, sent: {friend: {scope: {...}}}, events: [...]}:
//                                     what was sent (scope, level, op, item count, bytes, hash), when,
//                                     to whom, when the friend confirmed it. NEVER a copy of the data.
//   <data>/friends/received/<f>.json  what each friend shares with you, read-only, validated on arrival
//                                     and on every read (untrusted input).
//   Both sync between your own devices only end-to-end encrypted (lib/sync/manifest.mjs '── perms ──').
//   <device folder>/friends/share-base.json   item hashes of the last packet per friend and scope, so
//                                     the next one can be a small diff (this computer only).
//
// RECEIVED DATA IS UNTRUSTED: checked by the engine's kind schema, then by the
// allow-list (types, sizes, no __proto__/constructor/prototype keys), stored
// per friend outside the state file, shown with esc()/textContent only, and
// never given to Claude, the assistant, MCP or the actions layer.

import { readFileSync, promises as fsp } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { dataPaths } from '../datadir.mjs';
import { deviceRoot } from '../devicedir.mjs';
import { readLog } from '../locations.mjs';
import { clockFor, systemZone, timeStoreFor, clockAtIn, clockValidZone } from '../clock.mjs';
import { defineKind, S, MAX_BODY } from './core.mjs';
import { readDoc } from './store.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LOGIC_FILE = join(ROOT, 'src', 'app', '98-perms-0logic.js');

const NAMES = ['PERMS_VERSION', 'PERMS_SCOPES', 'PERMS_SCOPE_IDS', 'PERMS_SENT_SCOPES', 'PERMS_SCHEMA', 'PERMS_LIST_SCOPES', 'PERMS_SAFE_ID_RE',
  'PERMS_PART_MAX', 'PERMS_PARTS_MAX', 'permsScope', 'permsModeOk', 'permsIsOn', 'permsFriendIdOk',
  'permsNormalize', 'permsFriend', 'permsEffective', 'permsWithScope', 'permsWithFriend', 'permsRisky', 'permsLevelText',
  'permsClean', 'permsCleanItem', 'permsItemCap', 'permsCleanEnvelope', 'permsCalTimes', 'permsPlaceLine'];
// eslint-disable-next-line no-new-func
const P = new Function(`"use strict";\n${readFileSync(LOGIC_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();
export const {
  PERMS_VERSION, PERMS_SCOPES, PERMS_SCOPE_IDS, PERMS_SENT_SCOPES, PERMS_SCHEMA, PERMS_LIST_SCOPES, PERMS_SAFE_ID_RE,
  PERMS_PART_MAX, PERMS_PARTS_MAX, permsScope, permsModeOk, permsIsOn, permsFriendIdOk,
  permsNormalize, permsFriend, permsEffective, permsWithScope, permsWithFriend, permsRisky, permsLevelText,
  permsClean, permsCleanItem, permsItemCap, permsCleanEnvelope, permsCalTimes, permsPlaceLine,
} = P;

export const UNDO_MS = 15 * 1000;            // "Stop sharing" waits this long (its Undo) before revokes go out
export const DEBOUNCE_MS = 8 * 1000;         // a change, then a pass this long after it
export const EVERY_MS = 10 * 60 * 1000;      // the slow pass (calendar, money and locations change outside the state)
const BODY_SAFE = 30 * 1024;                 // a body larger than this goes in parts (the engine's limit is 32 KB)
const RESYNC_MIN_MS = 10 * 60 * 1000;        // a friend's 'send it whole' is honoured at most this often per scope
const PARTS_TTL_MS = 10 * 60 * 1000;         // pieces of a large packet wait this long for the rest
const DONE_DAYS = 14;                        // tasks done in the last 14 days still show
const CAL_BACK = 1, CAL_AHEAD = 60;          // the calendar window, in days around today
const RECENT_STAYS_MS = 14 * 86400000;       // locations 'exact': stays in the last two weeks
const MAX_EVENTS = 200;                      // audit history kept
const MAX_RECEIVED_BYTES = 2 * 1024 * 1024;  // one friend's stored copy, at most

// ─── small helpers ─────────────────────────────────────────────────────────
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const BAD = new Set(['__proto__', 'constructor', 'prototype']);
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (isObj(v)) return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
export const shareHash = (v) => createHash('sha256').update(stable(v)).digest('hex').slice(0, 32);
const itemHash = (v) => createHash('sha256').update(stable(v)).digest('hex').slice(0, 16);
/** An id that may cross to a friend: the id itself when it is safe, else a stable opaque one. */
const safeId = (prefix, raw) => (typeof raw === 'string' && PERMS_SAFE_ID_RE.test(raw) ? raw : prefix + createHash('sha256').update('opendash-share:' + String(raw)).digest('hex').slice(0, 24));
const opaqueId = (prefix, raw) => prefix + createHash('sha256').update('opendash-share:' + String(raw)).digest('hex').slice(0, 24);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function isoAdd(iso, n) { return new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
function dayFn(tz) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' };
  let f;
  try { f = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: tz || 'UTC' }); } catch { f = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: 'UTC' }); }
  return (ms) => { const n = typeof ms === 'string' && !/^\d+$/.test(ms) ? Date.parse(ms) : Number(ms); return Number.isFinite(n) && n > 0 ? f.format(new Date(n)) : ''; };
}
/** The end of a share's last day, as ms, with room for the friend's zone (the receiver deletes after it). */
const untilMs = (iso) => (DAY_RE.test(String(iso || '')) ? Date.parse(iso + 'T23:59:59Z') + 14 * 3600000 : 0);
export const validFriendId = (id) => permsFriendIdOk(id);
function sortItems(data) {
  if (data && Array.isArray(data.items)) data.items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return data;
}

// ─── the kinds (docs/dev/FRIENDS.md section 9), from the allow-list ───────
function mergeShape(a, b) {
  const out = Object.assign({}, a);
  for (const [k, t] of Object.entries(b)) {
    if (!own(out, k)) out[k] = t;
    else if (Array.isArray(out[k]) && Array.isArray(t)) out[k] = [mergeShape(out[k][0], t[0]), Math.max(out[k][1], t[1])];
    else if (isObj(out[k]) && out[k].o && isObj(t) && t.o) out[k] = { o: mergeShape(out[k].o, t.o) };
  }
  return out;
}
function sOf(t) {
  if (t === 'b') return S.opt(S.bool());
  if (t === 'n') return S.opt(S.num(-1e13, 1e13));
  if (t === 'd') return S.opt(S.day());
  if (t === 'hm') return S.opt(S.str(5));
  if (t === 'z') return S.opt(S.str(20));
  if (t === 'tz') return S.opt(S.str(64));
  if (t === 'i') return S.opt(S.id());
  if (t === 'c') return S.opt(S.str(20));
  if (t === 'tags') return S.opt(S.list(S.str(40), 12));
  if (typeof t === 'string' && t.startsWith('e:')) return S.opt(S.oneOf(t.slice(2).split('|')));
  if (typeof t === 'string' && /^[sp]\d+$/.test(t)) return S.opt(S.str(Number(t.slice(1))));   // p: a place line (the allow-list drops links)
  if (typeof t === 'string' && /^t\d+$/.test(t)) return S.opt(S.text(Number(t.slice(1))));
  if (Array.isArray(t)) return S.opt(S.list(S.obj(fieldsOf(t[0])), t[1]));
  if (isObj(t) && t.o) return S.opt(S.obj(fieldsOf(t.o)));
  throw new Error('perms: unknown field type ' + t);
}
function fieldsOf(shape) { const o = {}; for (const [k, t] of Object.entries(shape)) o[k] = sOf(t); return o; }
let _kinds = false;
/** Define 'share:<scope>' (each scope this module sends), 'share:ack' and 'share:resync' with the friends engine. */
export function defineShareKinds() {
  if (_kinds) return;
  for (const sc of PERMS_SENT_SCOPES) {
    const modes = Object.keys(PERMS_SCHEMA[sc]);
    const union = modes.reduce((u, m) => mergeShape(u, PERMS_SCHEMA[sc][m]), {});
    const { items, ...rest } = union;
    const cap = Array.isArray(items) ? items[1] : 0;
    defineKind('share:' + sc, S.obj({
      v: S.int(1, 1), op: S.oneOf(['full', 'diff', 'part', 'revoke']), at: S.ms(),
      mode: S.opt(S.oneOf(modes)), h: S.opt(S.str(64)), base: S.opt(S.str(64)), until: S.opt(S.ms()),
      data: S.opt(S.obj(fieldsOf(union))),
      ...(cap ? { upsert: S.opt(S.list(S.obj(fieldsOf(items[0])), cap)), remove: S.opt(S.list(S.id(), cap)) } : {}),
      extra: S.opt(S.obj(fieldsOf(rest))),
      seq: S.opt(S.int(0, PERMS_PARTS_MAX - 1)), of: S.opt(S.int(1, PERMS_PARTS_MAX)), part: S.opt(S.str(PERMS_PART_MAX)),
    }), { store: 'handler', scope: sc, passive: true, max: MAX_BODY });
  }
  defineKind('share:ack', S.obj({ scope: S.oneOf([...PERMS_SENT_SCOPES]), h: S.str(64), at: S.opt(S.ms()) }), { store: 'handler', scope: 'perms', passive: true, max: 256 });
  defineKind('share:resync', S.obj({ scope: S.oneOf([...PERMS_SENT_SCOPES]) }), { store: 'handler', scope: 'perms', passive: true, max: 128 });
  _kinds = true;
}

// ─── the builders: one per scope, named fields only ───────────────────────
// Each returns the scope's data at a level, or null when there is nothing to
// share (no finance set up, no location history). build() passes the result
// through permsClean (the allow-list) and sorts list items by id.
function streamInfo(s) {
  const m = new Map();
  for (const x of Array.isArray(s.streams) ? s.streams : []) if (isObj(x) && typeof x.id === 'string') m.set(x.id, { label: typeof x.label === 'string' ? x.label : x.id, color: typeof x.color === 'string' ? x.color : undefined });
  return m;
}
function buildTasks(mode, cfg, src) {
  if (!['shared', 'chosen', 'all'].includes(mode)) return null;
  const s = src.state;
  const deleted = isObj(s.deleted) ? s.deleted : {}, statuses = isObj(s.statuses) ? s.statuses : {}, log = isObj(s.completionLog) ? s.completionLog : {};
  const ids = new Set(cfg.ids || []), streams = new Set(cfg.streams || []), tags = new Set(cfg.tags || []);
  const cutoff = isoAdd(src.today, -DONE_DAYS);
  const info = streamInfo(s);
  const rows = [];
  for (const t of Array.isArray(s.custom) ? s.custom : []) {
    if (!isObj(t) || typeof t.id !== 'string' || own(deleted, t.id) && deleted[t.id] || t.kind === 'board') continue;
    if (mode === 'shared' && !ids.has(t.id)) continue;
    if (mode === 'chosen' && !(streams.has(t.stream) || (Array.isArray(t.tags) && t.tags.some(x => tags.has(x))))) continue;
    const status = ['todo', 'doing', 'done'].includes(statuses[t.id]) ? statuses[t.id] : 'todo';
    if (status === 'done' && t.resolution === 'wontdo') continue;
    const done = Array.isArray(log[t.id]) ? log[t.id].map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
    const doneOn = status === 'done' && done.length ? src.dayOf(Math.max(...done)) : '';
    if (status === 'done' && (!doneOn || doneOn < cutoff)) continue;
    const subs = Array.isArray(t.subtasks) ? t.subtasks.filter(isObj) : [];
    const st = info.get(t.stream);
    rows.push({
      id: safeId('t-', t.id),
      title: typeof t.title === 'string' ? t.title : '',
      due: t.dueDate, time: t.dueTime,
      status,
      priority: ['p1', 'p2', 'p3'].includes(t.priority) ? t.priority : undefined,
      stream: st ? st.label : undefined, color: st ? st.color : undefined,
      tags: Array.isArray(t.tags) ? t.tags.filter(x => typeof x === 'string') : undefined,
      subDone: subs.length ? subs.filter(x => x.done === true).length : undefined,
      subTotal: subs.length || undefined,
      doneOn: doneOn || undefined,
      planned: t.plannedFor,
    });
  }
  // over the cap: open ones first, soonest due first
  const cap = permsItemCap('tasks', mode) || 500;
  if (rows.length > cap) rows.sort((a, b) => ((a.status === 'done') - (b.status === 'done')) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
  return { items: rows.slice(0, cap) };
}
const HM_RE = /^([01]\d|2[0-4]):[0-5]\d$/;
const hmMin = (s) => (HM_RE.test(String(s || '')) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : null);
const utcIso = (ms) => new Date(ms).toISOString().slice(0, 19) + 'Z';
/**
 * A timed event's absolute instants, from its wall times in the zone calendar.list used (the
 * dashboard's own clock): {startUtc, endUtc} as 'YYYY-MM-DDTHH:MM:SSZ', or {} when they cannot
 * be worked out (the friend then reads the wall times, as from an older sender).
 */
export function calendarInstants(e, zone) {
  const s = hmMin(e && e.start);
  if (!e || e.allDay === true || s === null || !DAY_RE.test(String(e.date || '')) || !zone) return {};
  let endDay = DAY_RE.test(String(e.until || '')) && e.until > e.date ? e.until : e.date;
  let en = hmMin(e.end);
  if (en === null) en = Math.min(24 * 60, s + 30);
  if (endDay === e.date && en <= s) endDay = isoAdd(e.date, 1);       // 23:00-00:00 and the like: it ends the next day
  try {
    const t0 = clockAtIn(e.date, s, zone);
    const t1 = en >= 24 * 60 ? clockAtIn(isoAdd(endDay, 1), 0, zone) : clockAtIn(endDay, en, zone);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return {};
    return { startUtc: utcIso(t0), endUtc: utcIso(t1) };
  } catch { return {}; }
}
async function buildCalendar(mode, cfg, src) {
  if (!['busy', 'titles', 'full'].includes(mode)) return null;
  const from = isoAdd(src.today, -CAL_BACK), to = isoAdd(src.today, CAL_AHEAD);
  const r = await src.calendar(from, to);
  const zone = src.zone && clockValidZone(src.zone) ? src.zone : '';
  const items = [];
  for (const e of r && Array.isArray(r.events) ? r.events : []) {
    if (!isObj(e) || typeof e.id !== 'string' || !DAY_RE.test(String(e.date || ''))) continue;
    const allDay = e.allDay === true;
    // busy: start and end only (an opaque id, so the friend's copy can be updated item by item). Timed events also carry
    // their absolute instants, so a friend in another time zone sees them at the right time on their own clock.
    const o = { id: opaqueId('e-', e.id + '|' + e.date), date: e.date, until: e.until, allDay: allDay || undefined, start: allDay ? undefined : e.start, end: allDay ? undefined : e.end,
      ...(allDay ? {} : calendarInstants(e, zone)) };
    if ((mode === 'titles' || mode === 'full') && !e.untitled) o.title = e.title;
    if (mode === 'full') {
      // a place only: a Location that holds a join link, a meeting code or an address is left out ('never join links')
      o.location = permsPlaceLine(e.location, 120) || undefined;
      o.calendar = e.calendar;
      o.people = Array.isArray(e.attendees) ? e.attendees.length : undefined;
      o.repeating = e.repeating === true ? true : undefined;
    }
    items.push(o);
  }
  return { from, to, ...(zone ? { tz: zone } : {}), items };
}
async function buildMoney(mode, cfg, src) {
  if (mode !== 'summary' && mode !== 'full') return null;
  const a = await src.finance();
  if (!isObj(a)) return null;
  const m = isObj(a.month) ? a.month : {};
  const byCat = isObj(m.by_category) ? m.by_category : {};
  const budgets = isObj(a.budgets) ? a.budgets : {};
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const label = typeof m.label === 'string' ? m.label : undefined;
  if (mode === 'summary') {
    // Words and a percentage only: never an amount.
    const cats = Object.keys(budgets).filter(k => num(budgets[k]) > 0);
    if (cats.length) {
      const B = cats.reduce((t, k) => t + budgets[k], 0), Sp = cats.reduce((t, k) => t + (num(byCat[k]) || 0), 0);
      const day = Number(src.today.slice(8, 10)), y = Number(src.today.slice(0, 4)), mo = Number(src.today.slice(5, 7));
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const pace = B > 0 ? Sp / ((B * Math.max(1, day)) / dim) : 0;
      const status = pace <= 0.9 ? 'under' : pace <= 1.05 ? 'on' : 'over';
      const word = { under: 'Under budget this month', on: 'On budget this month', over: 'Over budget this month' }[status];
      return { month: label, status, word, pct: B > 0 ? Math.round((Sp / B) * 100) : undefined };
    }
    const mtd = num(m.mtd), lm = num(m.last_month_to_date);
    const trend = !(lm > 0) || mtd === undefined ? 'none' : mtd < lm * 0.9 ? 'less' : mtd > lm * 1.1 ? 'more' : 'same';
    const word = { less: 'Spending less than last month', same: 'Spending about the same as last month', more: 'Spending more than last month', none: 'No budget set' }[trend];
    return { month: label, status: 'none', word, trend };
  }
  const avg3 = isObj(m.avg3_by_category) ? m.avg3_by_category : {};
  const cur = String((src.cfg && src.cfg.currency) || 'GBP');
  const categories = Object.keys(byCat).filter(k => num(byCat[k]) !== undefined).sort((x, y) => byCat[y] - byCat[x]).slice(0, 20)
    .map(k => ({ category: k, spent: num(byCat[k]), budget: num(budgets[k]), usual: num(avg3[k]) }));
  let balance;
  if (Array.isArray(a.balances) && a.balances.length) {
    balance = 0;
    for (const b of a.balances) if (isObj(b) && (!b.currency || b.currency === cur)) balance += num(b.balance) || 0;
  }
  const w = isObj(a.week) ? a.week : null;
  return {
    currency: cur, month: label,
    asOf: typeof a.latest_transaction === 'string' ? a.latest_transaction.slice(0, 10) : undefined,
    spent: num(m.mtd), lastMonthSameDay: num(m.last_month_to_date), lastMonth: num(m.last_month_full),
    income: num(a.income_month), recurring: num(a.recurring_monthly_total), balance,
    week: w ? { from: w.start, to: w.end, total: num(w.total), usual: num(w.avg_prev) } : undefined,
    categories,
  };
}
async function buildLocations(mode, cfg, src) {
  if (!['countries', 'cities', 'exact'].includes(mode)) return null;
  const L = await src.locations();
  let recs = L && isObj(L.records) ? Object.values(L.records).filter(r => isObj(r) && Number.isFinite(r.at)).sort((a, b) => a.at - b.at) : [];
  // A time-limited share (a trip, or between two days) carries ONLY what happened inside its days
  // (2.17.1): a stay or move that began before the first day (home, work, the weeks before) or after
  // the last is left out of everything (now, recent, countries and cities), and no day shown runs past
  // the last one. "Until a day" alone has no first day: the level as it is, up to that day.
  const wFrom = DAY_RE.test(String(cfg.from || '')) ? cfg.from : '', wTo = DAY_RE.test(String(cfg.until || '')) ? cfg.until : '';
  if (wFrom || wTo) recs = recs.filter(r => { const d = src.dayOf(r.at); return !!d && (!wFrom || d >= wFrom) && (!wTo || d <= wTo); });
  const endDay = (r) => { const d = src.dayOf(r.until || r.at); return wTo && d > wTo ? wTo : d; };
  if (!recs.length) return null;
  const stays = recs.filter(r => r.kind !== 'move');
  const last = stays.length ? stays[stays.length - 1] : recs[recs.length - 1];
  const countries = new Map(), cities = new Map();
  for (const r of recs) {
    const d0 = src.dayOf(r.at), d1 = endDay(r);
    if (r.cc) {
      const c = countries.get(r.cc) || { cc: r.cc, country: r.country, first: d0, last: d1 };
      if (d0 < c.first) c.first = d0;
      if (d1 > c.last) c.last = d1;
      if (!c.country && r.country) c.country = r.country;
      countries.set(r.cc, c);
    }
    if (mode !== 'countries' && r.city) {
      const k = r.city + '|' + (r.cc || '');
      const c = cities.get(k) || { city: r.city, cc: r.cc, first: d0, last: d1 };
      if (d0 < c.first) c.first = d0;
      if (d1 > c.last) c.last = d1;
      cities.set(k, c);
    }
  }
  const byLast = (a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0);
  const visited = [...countries.values()].sort(byLast).map(c => ({ cc: c.cc, country: c.country, first: c.first, last: c.last }));
  if (mode === 'countries') return { now: { cc: last.cc, country: last.country }, visited };
  // cities: a name and days, never a position or a time of day
  const cityList = [...cities.values()].sort(byLast).map(c => ({ city: c.city, cc: c.cc, first: c.first, last: c.last }));
  if (mode === 'cities') return { now: { cc: last.cc, country: last.country, city: last.city }, visited, cities: cityList };
  const since = src.now - RECENT_STAYS_MS;
  const recent = stays.filter(r => (r.until || r.at) >= since).reverse()
    .map(r => ({ id: opaqueId('l-', r.id), place: r.place, city: r.city, cc: r.cc, lat: r.lat, lon: r.lon, from: src.dayOf(r.at), to: endDay(r) }));
  return {
    now: { cc: last.cc, country: last.country, city: last.city, place: last.place, lat: last.lat, lon: last.lon, since: last.at },
    visited, cities: cityList, recent,
  };
}
function buildMemories(mode, cfg, src) {
  if (mode !== 'chosen') return null;
  const m = isObj(src.state.memories) ? src.state.memories : {};
  const journal = isObj(m.journal) ? m.journal : {}, postcards = isObj(m.postcards) ? m.postcards : {}, goals = isObj(m.goals) ? m.goals : {};
  const capsules = Array.isArray(m.capsules) ? m.capsules : [];
  const items = [];
  for (const id of cfg.items || []) {
    const i = id.indexOf('-'), kind = id.slice(0, i), key = id.slice(i + 1);
    if (!key || BAD.has(key)) continue;
    if (kind === 'journal' && own(journal, key) && isObj(journal[key])) {
      const j = journal[key];
      items.push({ id, kind, date: key, text: typeof j.polished === 'string' && j.polished ? j.polished : j.text, line: j.line, mood: j.mood });
    } else if (kind === 'postcard' && own(postcards, key) && isObj(postcards[key])) {
      const p = postcards[key];
      items.push({ id, kind, cc: p.cc || key, title: p.name, city: p.city, date: p.from, days: p.days, text: p.note });
    } else if (kind === 'capsule') {
      const c = capsules.find(x => isObj(x) && x.id === key);
      if (!c) continue;
      const open = !!c.opened || (DAY_RE.test(String(c.opens || '')) && c.opens <= src.today);
      // a sealed capsule shows only that it exists and when it opens
      items.push(open ? { id, kind, date: src.dayOf(c.created), opens: c.opens, text: c.text } : { id, kind, opens: c.opens, sealed: true });
    } else if (kind === 'goals' && own(goals, key) && isObj(goals[key])) {
      const list = Array.isArray(goals[key].list) ? goals[key].list.filter(isObj) : [];
      items.push({ id, kind, title: key, goals: list.map(x => x.text).filter(x => typeof x === 'string'), done: list.filter(x => x.done === true).length });
    }
  }
  return { items };
}
const BUILDERS = Object.freeze({ tasks: buildTasks, calendar: buildCalendar, money: buildMoney, locations: buildLocations, memories: buildMemories });
/** One scope's data at one level, through the allow-list. null: nothing to share (or an unknown scope or level). */
export async function buildScope(scope, mode, cfg, src) {
  if (!PERMS_SENT_SCOPES.includes(scope) || !permsModeOk(scope, mode) || !permsIsOn(mode) || !own(BUILDERS, scope)) return null;
  const raw = await BUILDERS[scope](mode, cfg || {}, src);
  if (raw == null) return null;
  const data = permsClean(scope, mode, raw);
  return data ? sortItems(data) : null;
}
/** The body (or bodies, in parts) a 'full' of this data travels as: THE function the sender and the preview share. */
export function fullBodies(mode, data, { at, until = 0 } = {}) {
  const h = shareHash(data);
  const head = { v: PERMS_VERSION, mode, h, at, ...(until ? { until } : {}) };
  const one = { v: PERMS_VERSION, op: 'full', mode, h, at, ...(until ? { until } : {}), data };
  if (JSON.stringify(one).length <= BODY_SAFE) return { h, bodies: [one] };
  const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  const of = Math.ceil(b64.length / PERMS_PART_MAX);
  if (of > PERMS_PARTS_MAX) return { h, bodies: null, tooBig: true };
  const bodies = [];
  for (let seq = 0; seq < of; seq++) bodies.push({ ...head, op: 'part', seq, of, part: b64.slice(seq * PERMS_PART_MAX, (seq + 1) * PERMS_PART_MAX) });
  return { h, bodies };
}

// ─── the audit log ─────────────────────────────────────────────────────────
/** Profile and game progress: sent by their owners, taken back (and given again) from here. */
const TAKEBACK_SCOPES = Object.freeze(['profile', 'game', 'garden']);   // ── garden-social ── 'garden' (2.18): the page publishes it
const LEDGER_SCOPES = Object.freeze([...PERMS_SENT_SCOPES, ...TAKEBACK_SCOPES]);
function normLedger(j) {
  const L = { v: 1, sent: {}, events: [] };
  if (!isObj(j)) return L;
  if (isObj(j.sent)) for (const [f, row] of Object.entries(j.sent)) {
    if (!validFriendId(f) || !isObj(row)) continue;
    const out = {};
    for (const sc of LEDGER_SCOPES) if (isObj(row[sc])) out[sc] = row[sc];
    L.sent[f] = out;
  }
  if (Array.isArray(j.events)) L.events = j.events.filter(isObj).slice(-MAX_EVENTS);
  return L;
}

// ─── the pipeline ──────────────────────────────────────────────────────────
/**
 * dataDir, store (server/state-store.mjs), actions (server/actions: calendar.list),
 * getConfig(), friends() -> app.ctx.friends (docs/dev/FRIENDS.md section 13) or null,
 * isMain() -> Promise<bool>, emit(event, data) (open tabs), finance (lib/finance.mjs; tests may pass one).
 */
export function createSharePipeline({ dataDir, store, actions = null, getConfig = () => ({}), friends = () => null, isMain = async () => true,
  log = () => {}, emit = () => {}, now = () => Date.now(), finance = null } = {}) {
  const paths = dataPaths(dataDir);
  const dir = join(paths.root, 'friends');
  const ledgerFile = join(dir, 'share-log.json');
  const recvDir = join(dir, 'received');
  let baseFile = null;
  try { baseFile = join(deviceRoot(paths.root), 'friends', 'share-base.json'); } catch { baseFile = null; }
  const resyncAt = new Map();   // friend|scope -> ms
  const parts = new Map();      // friend|scope|h -> {mode, at, until, of, got: Map(seq -> part), t0}
  let timer = null, dueAt = 0, every = null, chain = Promise.resolve(), unsub = null, stopped = true, attached = null;
  // The policy answers synchronously: the choices are kept here, re-read on every state change.
  let permsNow = permsNormalize(null), dayNow = dayFn('UTC'), permsLoaded = null, refreshT = null;
  async function refreshPerms() {
    const s = await store.readObject().catch(() => null);
    permsNow = permsNormalize(s && s.friendPerms);
    const cfg = getConfig() || {};
    dayNow = dayFn(cfg.timezone);
    return s || {};
  }
  /** After a state change: read the choices again soon (one read for a burst of saves). */
  function refreshSoon() {
    if (refreshT) return;
    refreshT = setTimeout(() => { refreshT = null; refreshPerms().catch(() => {}); }, 250);
    refreshT.unref?.();
  }

  async function clock(cfg) {
    const stored = await timeStoreFor(paths.root).get().catch(() => null);
    const c = clockFor(cfg, systemZone({ stored, now: now(), cfg }), now());
    return { today: c.today, zone: c.timezone };
  }
  async function sources(s, cfg) {
    const c = await clock(cfg);
    const memo = new Map();
    const once = (k, fn) => {
      if (!memo.has(k)) memo.set(k, Promise.resolve().then(fn).catch((e) => { log('warn', `friends share: ${k} could not be read (${e && (e.code || e.message)})`); return null; }));
      return memo.get(k);
    };
    return {
      state: s || {}, cfg: cfg || {}, today: c.today, now: now(), dayOf: dayFn(c.zone), zone: c.zone,
      calendar: (from, to) => once('calendar', () => (actions ? actions.query('calendar.list', { from, to, mine: true }) : null)),
      finance: () => once('finance', async () => {
        const F = finance || await import('../finance.mjs');
        if (typeof F.financeAvailable === 'function' && !F.financeAvailable()) return null;
        const d = await F.financeData();
        return d && d.status === 'ok' ? d.analysis : null;
      }),
      locations: () => once('locations', () => readLog(paths.root)),
    };
  }
  const readLedger = async () => normLedger(await readJson(ledgerFile, { fallback: null }).catch(() => null));
  const readBase = async () => { if (!baseFile) return {}; const j = await readJson(baseFile, { fallback: null }).catch(() => null); return isObj(j) ? j : {}; };
  async function updateLedger(fn) {
    await fsp.mkdir(dir, { recursive: true });
    return withLock(ledgerFile, async () => {
      const L = await readLedger();
      const r = await fn(L);
      L.events = L.events.slice(-MAX_EVENTS);
      await writeJson(ledgerFile, L);
      return r;
    });
  }
  async function writeBase(b) {
    if (!baseFile) return;
    await fsp.mkdir(dirname(baseFile), { recursive: true }).catch(() => {});
    await writeJson(baseFile, b).catch((e) => log('warn', `friends share: the diff base could not be saved (${e.code || e.message})`));
  }
  /** The friends engine, and its friends as {id, name, status}. */
  async function friendsNow() {
    const fr = friends();
    if (!fr || typeof fr.list !== 'function' || typeof fr.send !== 'function') return null;
    const r = await fr.list();
    const arr = Array.isArray(r) ? r : (isObj(r) && Array.isArray(r.friends) ? r.friends : []);
    return { fr, list: arr.filter(f => isObj(f) && validFriendId(f.id)).map(f => ({ id: f.id, name: String(f.nick || f.name || '').slice(0, 60), status: String(f.status || '') })) };
  }
  /** The friend's current choice for a scope, as a hash (a change of it goes out from the device that made it). */
  const cfgHash = (e, c) => shareHash({ mode: e.mode, until: e.until || '', from: e.from || '', ids: c.ids || [], streams: c.streams || [], tags: c.tags || [], items: c.items || [] });
  /** When a stop's Undo window ends (0: no stop waiting). */
  function holdUntil(perms, fid) {
    const t = now();
    const ends = [];
    if (perms.stopped && t - perms.stopped < UNDO_MS) ends.push(perms.stopped + UNDO_MS);
    const f = perms.friends[fid];
    if (f && f.stopped && t - f.stopped < UNDO_MS) ends.push(f.stopped + UNDO_MS);
    return ends.length ? Math.max(...ends) : 0;
  }

  async function passOnce({ friend = null, forceFull = null } = {}) {
    attach();
    const got = await friendsNow();
    if (!got) return { skipped: 'no-friends' };
    const { fr, list } = got;
    const s = await refreshPerms();
    const perms = permsNow;
    const cfg = getConfig() || {};
    const src = await sources(s, cfg);
    const main = await Promise.resolve().then(isMain).catch(() => true);
    const base = await readBase();
    const L = await readLedger();
    const sends = [], patches = [];
    let waitUntil = 0, mine;
    for (const f of list) {
      if (friend && f.id !== friend) continue;
      if (f.status !== 'friend') continue;            // requested, removing, declined, blocked: nothing at all, not even a revoke
      const eff = permsEffective(perms, f.id, { status: f.status, today: src.today });
      const fc = permsFriend(perms, f.id);
      const hold = holdUntil(perms, f.id);
      for (const sc of PERMS_SENT_SCOPES) {
        const e = eff[sc], led = (L.sent[f.id] || {})[sc] || null, b = (base[f.id] || {})[sc] || null;
        const t = now();
        const revoke = (why, c) => sends.push({ f, sc, kind: 'share:' + sc, revoke: true, row: { live: false, op: 'revoke', mode: led.mode, at: t, h: '', c: c || '', n: 0, bytes: 0, why } });
        if (!e.on) {
          if (led && led.live) {
            if (hold && (e.reason === 'stopped' || e.reason === 'stopped-all')) { waitUntil = Math.max(waitUntil, hold); continue; }
            revoke(e.reason);
          }
          continue;
        }
        const c1 = cfgHash(e, fc.scopes[sc]);
        const changedHere = !led || !led.live || led.c !== c1 || led.mode !== e.mode;
        const full = forceFull === f.id + '|' + sc;
        if (!main && !changedHere && !full) continue;            // data updates come from the main computer
        const data = await buildScope(sc, e.mode, fc.scopes[sc], src);
        if (data === null) { if (led && led.live) revoke('nothing', c1); continue; }
        const until = untilMs(e.until);
        const h = shareHash(data);
        if (!full && led && led.live && led.h === h && led.mode === e.mode && (Number(led.until) || 0) === until) {
          if (led.c !== c1) patches.push({ f, sc, patch: { c: c1 } });
          continue;
        }
        const isList = PERMS_LIST_SCOPES.includes(sc);
        const items = isList ? Object.fromEntries(data.items.map(x => [x.id, itemHash(x)])) : null;
        let bodies = null, op = 'full';
        if (isList && !full && b && led && led.live && b.h === led.h && b.mode === e.mode && isObj(b.items)) {
          const upsert = data.items.filter(x => b.items[x.id] !== items[x.id]);
          const remove = Object.keys(b.items).filter(id => !own(items, id));
          if (upsert.length + remove.length < Math.max(4, data.items.length * 0.6)) {
            const { items: _drop, ...extra } = data;
            const diff = { v: PERMS_VERSION, op: 'diff', mode: e.mode, base: b.h, h, at: t, ...(until ? { until } : {}), upsert, remove, ...(Object.keys(extra).length ? { extra } : {}) };
            if (JSON.stringify(diff).length <= BODY_SAFE) { bodies = [diff]; op = 'diff'; }
          }
        }
        if (!bodies) {
          const fb = fullBodies(e.mode, data, { at: t, until });
          if (!fb.bodies) { log('warn', `friends share: ${sc} for a friend is too large to send`); continue; }
          bodies = fb.bodies;
          op = bodies.length > 1 ? 'parts' : 'full';
        }
        const bytes = bodies.reduce((n, x) => n + Buffer.byteLength(JSON.stringify(x)), 0);
        sends.push({ f, sc, kind: 'share:' + sc, bodies, items, row: { live: true, op, mode: e.mode, at: t, h, c: c1, n: isList ? data.items.length : 1, bytes, until, ...(op === 'diff' ? { changed: bodies[0].upsert.length + bodies[0].remove.length } : {}) } });
      }
      // Profile, game progress and the garden: their owners send them to every friend the policy allows. Here they are
      // taken back when they go off for this friend (or end), and given again when they come back.
      for (const sc of TAKEBACK_SCOPES) {
        const e = eff[sc], led = (L.sent[f.id] || {})[sc] || null, t = now(), kind = permsScope(sc).kind;
        if (!e.on) {
          if (!led || led.live) {
            if (hold && (e.reason === 'stopped' || e.reason === 'stopped-all')) { waitUntil = Math.max(waitUntil, hold); continue; }
            sends.push({ f, sc, kind, revoke: true, row: { live: false, op: 'revoke', mode: 'on', at: t, h: '', c: '', n: 0, bytes: 0, why: e.reason } });
          }
          continue;
        }
        if (led && led.live) continue;
        if (!led) { patches.push({ f, sc, row: { live: true, op: 'engine', mode: 'on', at: t, h: '', c: '', n: 1, bytes: 0 } }); continue; }   // the engine already sends it
        if (mine === undefined) { try { const me = await readDoc(paths.root, 'me'); mine = me && isObj(me.mine) ? me.mine : null; } catch { mine = null; } }
        const body = mine && isObj(mine[kind]) && isObj(mine[kind].b) ? mine[kind].b : null;
        if (body) sends.push({ f, sc, kind, bodies: [body], row: { live: true, op: 'full', mode: 'on', at: t, h: shareHash(body), c: '', n: 1, bytes: Buffer.byteLength(JSON.stringify(body)) } });
        else patches.push({ f, sc, row: { live: true, op: 'engine', mode: 'on', at: t, h: '', c: '', n: 1, bytes: 0 } });   // nothing published yet: the engine sends it when it is
      }
    }
    // Send, then record. A failed send is not recorded as sent (it goes again next time).
    let sentN = 0, failed = 0;
    const done = [];
    for (const x of sends) {
      try {
        // a take-back goes whatever the policy says now (it is because the policy changed): the engine's friend:revoke
        if (x.revoke) await fr.send(x.f.id, x.kind, null, { revoke: true });
        else for (const body of x.bodies) {
          const r = await fr.send(x.f.id, x.kind, body);
          // the engine's own check said no (its policy is ours, so only a race): not sent, try again next time
          if (r && r.id === null && r.skipped) throw Object.assign(new Error('not allowed now'), { code: 'SKIPPED' });
        }
        sentN++;
        done.push(x);
        if (x.row.live && x.items) (base[x.f.id] = base[x.f.id] || {})[x.sc] = { h: x.row.h, mode: x.row.mode, items: x.items };
        else if (base[x.f.id]) delete base[x.f.id][x.sc];
      } catch (e) {
        failed++;
        patches.push({ f: x.f, sc: x.sc, patch: { err: String((e && (e.code || e.message)) || 'failed').slice(0, 80), errAt: now() } });
      }
    }
    const known = new Set(list.map(f => f.id));
    if (done.length || patches.length || Object.keys(L.sent).some(id => !known.has(id))) {
      await updateLedger((LL) => {
        for (const x of done) {
          const row = LL.sent[x.f.id] = LL.sent[x.f.id] || {};
          const prev = row[x.sc] || {};
          row[x.sc] = { ...x.row, ackH: prev.ackH || '', ackAt: prev.ackAt || 0 };
          LL.events.push({ at: x.row.at, friend: x.f.id, scope: x.sc, op: x.row.op, mode: x.row.mode, n: x.row.n, bytes: x.row.bytes });
        }
        for (const p of patches) {
          if (p.row) { (LL.sent[p.f.id] = LL.sent[p.f.id] || {})[p.sc] = p.row; continue; }
          const row = LL.sent[p.f.id] && LL.sent[p.f.id][p.sc];
          if (row) Object.assign(row, p.patch);
        }
        // A friend who is gone cannot be sent anything: their rows go (the events stay as the history).
        if (!friend) for (const id of Object.keys(LL.sent)) if (!known.has(id)) delete LL.sent[id];
      });
    }
    if (!friend) for (const id of Object.keys(base)) if (!known.has(id)) delete base[id];
    if (done.length || !friend) await writeBase(base);
    if (sentN || failed) { emit('friends-share', { kind: 'sent', n: sentN }); log('info', `friends share: ${sentN} sent${failed ? `, ${failed} failed (they go again next time)` : ''}`); }
    if (waitUntil) kick(Math.max(200, waitUntil - now() + 200));
    return { ok: true, sent: sentN, failed, waiting: waitUntil || 0 };
  }
  /** One pass now (passes never overlap: each waits for the one before). */
  function pass(o = {}) {
    const r = chain.then(() => passOnce(o)).catch((e) => { log('warn', `friends share: a pass stopped (${e && (e.code || e.message)})`); return { ok: false, error: e && e.message }; });
    chain = r.then(() => {}, () => {});
    return r;
  }
  /** A pass in `ms` (an earlier one already coming is kept). */
  function kick(ms = DEBOUNCE_MS) {
    if (stopped) return;
    const due = now() + Math.max(0, ms);
    if (timer && dueAt <= due) return;
    clearTimeout(timer);
    dueAt = due;
    timer = setTimeout(() => { timer = null; dueAt = 0; pass(); }, Math.max(0, ms));
    timer.unref?.();
  }

  /**
   * What this friend would get now, per scope, from the SAME builders and allow-list.
   * Tasks to memories: {data, bodies, bytes} (bodies: how many messages). Profile, game and
   * presence: their owners send them; `sent` is the body last published when the engine says.
   */
  async function preview(friendId) {
    if (!validFriendId(friendId)) return null;
    const got = await friendsNow().catch(() => null);
    const f = got ? got.list.find(x => x.id === friendId) : null;
    const s = await refreshPerms();
    const cfg = getConfig() || {};
    const src = await sources(s, cfg);
    const eff = permsEffective(permsNow, friendId, { status: f ? f.status : '', today: src.today });
    const fc = permsFriend(permsNow, friendId);
    // profile and game progress: what the friends engine last published (it sends exactly that to every friend allowed it)
    let mine = null, presence = null;
    try { const me = await readDoc(paths.root, 'me'); mine = me && isObj(me.mine) ? me.mine : null; } catch { mine = null; }
    try { const sn = got && typeof got.fr.snapshot === 'function' ? await got.fr.snapshot() : null; presence = sn && sn.me ? { s: sn.me.presence || 'offline', share: !!(sn.me.prefs && sn.me.prefs.presence && sn.me.prefs.presence.share) } : null; } catch { presence = null; }
    const out = [];
    for (const def of PERMS_SCOPES) {
      const e = eff[def.id];
      const row = { scope: def.id, label: def.label, by: def.by, kind: def.kind, mode: e.mode, on: e.on, chosen: e.chosen,
        ...(e.reason ? { reason: e.reason } : {}), ...(e.until ? { until: e.until } : {}), ...(e.from ? { from: e.from } : {}), ...(e.label ? { window: e.label } : {}) };
      if (e.on && def.by === 'perms') {
        const data = await buildScope(def.id, e.mode, fc.scopes[def.id], src);
        if (data === null) row.nothing = true;
        else {
          const fb = fullBodies(e.mode, data, { at: src.now, until: untilMs(e.until) });
          row.data = data;
          row.bodies = fb.bodies ? fb.bodies.length : 0;
          row.bytes = fb.bodies ? fb.bodies.reduce((n, x) => n + Buffer.byteLength(JSON.stringify(x)), 0) : 0;
        }
      } else if (e.on && def.id === 'presence' && presence) {
        row.sent = { s: presence.share ? presence.s : 'offline' };
        if (!presence.share) row.needsSwitch = true;   // "Share when I'm online" in the Friends tab is off: nothing goes
      } else if (e.on && mine && isObj(mine[def.kind]) && isObj(mine[def.kind].b)) {
        row.sent = mine[def.kind].b;
        row.sentAt = Number(mine[def.kind].at) || 0;
      }
      out.push(row);
    }
    return {
      friend: { id: friendId, name: f ? f.name : '', status: f ? f.status : 'unknown', trusted: fc.trusted },
      today: src.today, stopped: !!permsNow.stopped, scopes: out,
    };
  }

  // ─── receiving ───────────────────────────────────────────────────────────
  const recvFile = (id) => join(recvDir, id + '.json');
  async function store1(friendId, scope, mut) {
    const file = recvFile(friendId);
    let out = null;
    await fsp.mkdir(recvDir, { recursive: true });
    await withLock(file, async () => {
      const doc = await readReceivedDoc(file, friendId, now());
      out = await mut(doc);
      if (!out || !out.write) return;
      const text = JSON.stringify(doc);
      if (Buffer.byteLength(text) > MAX_RECEIVED_BYTES) { log('warn', "friends share: a friend's shared data is over 2 MB and was not kept"); out = { resync: false, ack: null }; return; }
      await writeJson(file, doc);
    });
    return out || {};
  }
  function keepFull(doc, scope, b, data) {
    doc.scopes[scope] = { mode: b.mode, h: b.h, at: b.at, got: now(), ...(b.until ? { until: b.until } : {}), data };
  }
  /** A message from a friend: msg kind + body (already through the engine's kind schema), validated again here. */
  async function receive(friend, kind, body) {
    const fid = friend && friend.id;
    if (!validFriendId(fid) || friend.status !== 'friend') return { ok: false, error: 'not a friend' };   // nothing from strangers or blocked people
    const env = permsCleanEnvelope(kind, body);
    if (!env) { log('warn', `friends share: a message from a friend did not pass the checks and was dropped (${String(kind).slice(0, 30)})`); return { ok: false, error: 'invalid' }; }
    const fr = friends();
    const reply = (k, b) => (fr && typeof fr.send === 'function' ? Promise.resolve().then(() => fr.send(fid, k, b)).catch(() => {}) : null);
    if (env.kind === 'share:ack') {
      await updateLedger((LL) => { const r = LL.sent[fid] && LL.sent[fid][env.scope]; if (r && r.h === env.body.h) { r.ackH = env.body.h; r.ackAt = now(); } });
      emit('friends-share', { kind: 'ack', friend: fid, scope: env.scope });
      return { ok: true };
    }
    if (env.kind === 'share:resync') {
      const k = fid + '|' + env.scope;
      if (now() - (resyncAt.get(k) || 0) < RESYNC_MIN_MS) return { ok: true, later: true };
      resyncAt.set(k, now());
      setTimeout(() => pass({ friend: fid, forceFull: k }), 500).unref?.();
      return { ok: true };
    }
    const scope = env.scope, b = env.body;
    let r;
    if (b.op === 'revoke') {
      r = await store1(fid, scope, (doc) => { if (!own(doc.scopes, scope)) return { write: false }; delete doc.scopes[scope]; return { write: true }; });
      for (const k of [...parts.keys()]) if (k.startsWith(fid + '|' + scope + '|')) parts.delete(k);
      emit('friends-shared', { friend: fid, scope });
      return { ok: true };
    }
    if (b.op === 'full') {
      const data = sortItems(b.data);
      r = await store1(fid, scope, (doc) => {
        const cur = doc.scopes[scope];
        if (cur && cur.h === b.h && cur.mode === b.mode) return { write: false, ack: b.h };   // the same message again
        keepFull(doc, scope, b, data);
        return { write: true, ack: b.h };
      });
    } else if (b.op === 'diff') {
      r = await store1(fid, scope, (doc) => {
        const cur = doc.scopes[scope];
        if (cur && cur.h === b.h && cur.mode === b.mode) return { write: false, ack: b.h };   // already applied (another copy of it)
        if (!cur || cur.h !== b.base || cur.mode !== b.mode) return { write: false, resync: true };
        const items = new Map((cur.data.items || []).map(x => [x.id, x]));
        for (const id of b.remove) items.delete(id);
        for (const x of b.upsert) items.set(x.id, x);
        const next = sortItems(permsClean(scope, b.mode, { ...cur.data, ...(b.extra || {}), items: [...items.values()] }));
        if (!next || shareHash(next) !== b.h) return { write: false, resync: true };
        keepFull(doc, scope, b, next);
        return { write: true, ack: b.h };
      });
    } else if (b.op === 'part') {
      const k = `${fid}|${scope}|${b.h}`;
      for (const [pk, pv] of parts) if (now() - pv.t0 > PARTS_TTL_MS) { parts.delete(pk); if (pk.startsWith(fid + '|')) reply('share:resync', { scope: pk.split('|')[1] }); }
      if (!parts.has(k)) {
        // at most 4 packets in pieces per friend and 32 in all wait at once (oldest dropped): a friend cannot fill the memory
        const mineK = [...parts.keys()].filter(x => x.startsWith(fid + '|'));
        if (mineK.length >= 4) parts.delete(mineK[0]);
        if (parts.size >= 32) parts.delete(parts.keys().next().value);
      }
      const p = parts.get(k) || { mode: b.mode, at: b.at, until: b.until || 0, of: b.of, got: new Map(), t0: now() };
      if (p.of !== b.of || p.mode !== b.mode) return { ok: false, error: 'invalid' };
      p.got.set(b.seq, b.part);
      parts.set(k, p);
      if (p.got.size < p.of) return { ok: true, waiting: p.of - p.got.size };
      parts.delete(k);
      let raw = null;
      try {
        const text = Buffer.from([...Array(p.of).keys()].map(i => p.got.get(i)).join(''), 'base64').toString('utf8');
        raw = JSON.parse(text, (key, v) => (BAD.has(key) ? undefined : v));
      } catch { raw = null; }
      const data = raw ? sortItems(permsClean(scope, p.mode, raw)) : null;
      if (!data || shareHash(data) !== b.h) { reply('share:resync', { scope }); return { ok: false, resync: true }; }
      r = await store1(fid, scope, (doc) => { keepFull(doc, scope, { mode: p.mode, h: b.h, at: p.at, until: p.until }, data); return { write: true, ack: b.h }; });
    }
    if (r && r.resync) { reply('share:resync', { scope }); return { ok: false, resync: true }; }
    if (r && r.ack) reply('share:ack', { scope, h: r.ack, at: now() });
    if (r && r.write) emit('friends-shared', { friend: fid, scope });
    return { ok: true };
  }

  /** A friend took a share back (the engine's friend:revoke: {k, b: null, revoked: true}): delete our copy. */
  async function receiveRevoked(friend, kind) {
    const fid = friend && friend.id;
    if (!validFriendId(fid) || typeof kind !== 'string' || !kind.startsWith('share:')) return { ok: false };
    const scope = kind.slice(6);
    if (!PERMS_SENT_SCOPES.includes(scope)) return { ok: true };
    await store1(fid, scope, (doc) => { if (!own(doc.scopes, scope)) return { write: false }; delete doc.scopes[scope]; return { write: true }; });
    for (const k of [...parts.keys()]) if (k.startsWith(fid + '|' + scope + '|')) parts.delete(k);
    emit('friends-shared', { friend: fid, scope });
    return { ok: true };
  }

  async function audit() {
    const L = await readLedger();
    return { sent: L.sent, events: L.events.slice(-100) };
  }

  /**
   * The rule the friends engine asks before it sends anything: policy(friend, scope, {allowed})
   * where `allowed` is the engine's own answer. Our scopes: our rules (default deny; the engine
   * also wants the Friends tab's "Share when I'm online" for presence); scopes that are not ours (direct,
   * cheer, quest, focus, challenge, space, postcard): the engine's own answer, except that "Stop sharing
   * everything" and "Stop sharing with Sam" stop them too (nothing more goes; take-backs and the engine's
   * own handshake never ask here).
   */
  function policy(friend, scope, ctx) {
    if (!isObj(friend) || !validFriendId(friend.id) || friend.status !== 'friend') return false;
    // the very first question can come before the choices are read: answer once they are (the engine awaits it)
    if (!permsLoaded) permsLoaded = refreshPerms().catch(() => null);
    if (permsLoaded && !permsLoaded.done) return permsLoaded.then(() => { permsLoaded.done = true; return decide(friend, scope, ctx); });
    return decide(friend, scope, ctx);
  }
  function decide(friend, scope, ctx) {
    const engine = isObj(ctx) && typeof ctx.allowed === 'boolean' ? ctx.allowed : undefined;
    // A friend made through a group starts with everything off (engine: GROUP_FRIEND_PERMS) until the person chooses otherwise, scope by scope.
    const limited = isObj(friend.perms) && friend.perms[scope] === false;
    const mine = limited ? permsFriend(permsNow, friend.id) : null;
    if (limited && PERMS_SCOPE_IDS.includes(scope) && !mine.chosen.includes(scope)) return false;
    if (PERMS_SCOPE_IDS.includes(scope)) {
      const e = permsEffective(permsNow, friend.id, { status: friend.status, today: dayNow(now()) })[scope];
      return !!(e && e.on);   // presence: the engine also checks the Friends tab's switch
    }
    if (scope === 'perms') return true;                                        // share:ack / share:resync carry no data
    // a stop means NOTHING more goes to them: Together spaces (and the scores worked out from your tasks),
    // quests, challenges, cheers, focus, postcards and this computer's addresses (live:addr) pause too
    if (permsNow.stopped || (own(permsNow.friends, friend.id) && permsNow.friends[friend.id].stopped)) return false;
    // ...and a direct link (it shows this computer's addresses) only once they marked them trusted, or turned something on for them.
    if (limited && scope === 'direct') return mine.trusted === true || mine.chosen.some(s => permsIsOn(mine.scopes[s].mode));
    return engine;                                                             // undefined: the engine keeps its own answer
  }
  /** Define the kinds, install the policy, listen for messages and removals (once the engine exists). */
  function attach() {
    const fr = friends();
    if (!fr || attached === fr) return !!fr;
    defineShareKinds();
    if (!permsLoaded) { permsLoaded = refreshPerms().catch(() => null); permsLoaded.then(() => { permsLoaded.done = true; }); }
    if (typeof fr.setPolicy === 'function') fr.setPolicy(policy);
    if (typeof fr.onChange === 'function') fr.onChange((what) => { if (what !== 'feed') { kick(DEBOUNCE_MS); showGroupFriends().catch(() => {}); } });   // a friend approved or gone (not every feed line)
    if (typeof fr.on === 'function') {
      const on = (msg, friend) => {
        const k = msg && msg.k;
        if (typeof k !== 'string' || !k.startsWith('share:')) return;
        const sc = k.slice(6);
        if (!PERMS_SENT_SCOPES.includes(sc) && k !== 'share:ack' && k !== 'share:resync') return;   // share:game is the engine's
        const run = msg.revoked === true ? receiveRevoked(friend, k) : receive(friend, k, msg.b);
        return run.catch((e) => log('warn', `friends share: a message could not be kept (${e && (e.code || e.message)})`));
      };
      fr.on('share:*', on);
    }
    // A friend renewed their keys (docs/dev/FRIENDS.md section 15): my choices for them, what they share
    // with me and the audit rows move to their new id (the engine moved their record first).
    if (typeof fr.onRekeyed === 'function') fr.onRekeyed((oldId, newId) => rekeyFriend(oldId, newId).catch((e) => log('warn', `friends share: a renewed friend's choices could not be moved (${e && (e.code || e.message)})`)));
    if (typeof fr.onRemoved === 'function') {
      fr.onRemoved((friend) => {
        if (!friend || !validFriendId(friend.id)) return;
        forgetReceived(paths.root, friend.id).catch(() => {});
        updateLedger((LL) => { delete LL.sent[friend.id]; }).catch(() => {});
        readBase().then((b) => { if (b[friend.id]) { delete b[friend.id]; return writeBase(b); } return null; }).catch(() => {});
        // my choices for them go too: someone who comes back (same keys, same id) starts again from profile and game only
        forgetChoices(friend.id).catch((e) => log('warn', `friends share: a removed friend's choices could not be cleared (${e && (e.code || e.message)})`));
        emit('friends-shared', { friend: friend.id });
      });
    }
    attached = fr;
    return true;
  }

  /** A friend removed, blocked, unblocked or gone: delete state.friendPerms.friends[id] (trust, levels, windows, stop). */
  /** A friend made through a group: their page says what is true from the start (off), so turning something on is a real choice. */
  async function showGroupFriends() {
    const fr = friends();
    if (!fr || !store || typeof store.mutate !== 'function') return;
    const list = ((await fr.snapshot()).friends || []).filter(f => f.status === 'friend' && isObj(f.perms) && f.perms.profile === false && validFriendId(f.id) && !own(permsNow.friends, f.id));
    if (!list.length) return;
    await store.mutate((cur) => {
      let p = permsNormalize(cur && cur.friendPerms);
      for (const f of list) for (const s of ['profile', 'game', 'garden']) p = permsWithScope(p, f.id, s, { mode: 'off' }, now());
      return { next: { ...cur, friendPerms: p } };
    }, { source: 'friends', summary: 'a friend made in a group starts with nothing shared' });
    await refreshPerms().catch(() => {});
  }
  async function forgetChoices(id) {
    if (!validFriendId(id) || !store || typeof store.mutate !== 'function') return;
    await store.mutate((cur) => {
      const fp = cur && isObj(cur.friendPerms) && isObj(cur.friendPerms.friends) ? cur.friendPerms : null;
      if (!fp || !own(fp.friends, id)) return { next: null };
      const friendsMap = { ...fp.friends };
      delete friendsMap[id];
      return { next: { ...cur, friendPerms: { ...fp, friends: friendsMap } } };
    }, { source: 'friends', summary: 'a friend was removed: what they could see is cleared' });
    await refreshPerms().catch(() => {});
  }

  async function rekeyFriend(oldId, newId) {
    if (!validFriendId(oldId) || !validFriendId(newId) || oldId === newId) return;
    if (store && typeof store.mutate === 'function') {
      await store.mutate((cur) => {
        const fp = cur && isObj(cur.friendPerms) && isObj(cur.friendPerms.friends) ? cur.friendPerms : null;
        if (!fp || !own(fp.friends, oldId) || own(fp.friends, newId)) return { next: null };
        const friendsMap = { ...fp.friends, [newId]: fp.friends[oldId] };
        delete friendsMap[oldId];
        return { next: { ...cur, friendPerms: { ...fp, friends: friendsMap } } };
      }, { source: 'friends', summary: 'a friend renewed their keys' });
    }
    const from = receivedFile(paths.root, oldId), to = receivedFile(paths.root, newId);
    await withLock(from, async () => {
      const j = await readJson(from, { fallback: null }).catch(() => null);
      if (!isObj(j) || j.friend !== oldId) return;
      if (!(await fsp.access(to).then(() => true, () => false))) await writeJson(to, { ...j, friend: newId });
      await fsp.unlink(from).catch(() => {});
    });
    await updateLedger((LL) => { if (LL.sent[oldId] && !LL.sent[newId]) { LL.sent[newId] = LL.sent[oldId]; delete LL.sent[oldId]; } });
    const b = await readBase();
    if (b[oldId] && !b[newId]) { b[newId] = b[oldId]; delete b[oldId]; await writeBase(b); }
    await refreshPerms().catch(() => {});
    emit('friends-shared', { friend: newId });
    kick(1000);
  }

  function start() {
    stopped = false;
    refreshPerms().catch(() => {});
    if (store && typeof store.onChange === 'function' && !unsub) unsub = store.onChange(() => { refreshSoon(); kick(DEBOUNCE_MS); });
    if (!every) { every = setInterval(() => { attach(); pass(); }, EVERY_MS); every.unref?.(); }
    kick(20 * 1000);
  }
  function stop() {
    stopped = true;
    clearTimeout(timer); timer = null;
    clearTimeout(refreshT); refreshT = null;
    clearInterval(every); every = null;
    if (unsub) { unsub(); unsub = null; }
  }
  return { attach, start, stop, kick, pass, preview, receive, receiveRevoked, audit, policy, refreshPerms, files: { ledger: ledgerFile, received: recvDir, base: baseFile } };
}

// ─── reading what friends share (untrusted: validated on every read) ──────
async function readReceivedDoc(file, friendId, t = Date.now()) {
  const j = await readJson(file, { fallback: null }).catch(() => null);
  const doc = { v: 1, friend: friendId, scopes: {} };
  if (!isObj(j) || j.friend !== friendId || !isObj(j.scopes)) return doc;
  for (const sc of PERMS_SENT_SCOPES) {
    if (!own(j.scopes, sc)) continue;
    const r = j.scopes[sc];
    if (!isObj(r) || !permsModeOk(sc, r.mode) || !permsIsOn(r.mode)) continue;
    const until = Number(r.until);
    if (Number.isFinite(until) && until > 0 && until < t) continue;          // the share has ended: gone
    const data = permsClean(sc, r.mode, r.data);
    if (!data) continue;
    doc.scopes[sc] = { mode: r.mode, h: typeof r.h === 'string' && /^[a-f0-9]{16,64}$/.test(r.h) ? r.h : '', at: Number(r.at) || 0, got: Number(r.got) || 0, ...(until > 0 ? { until } : {}), data: sortItems(data) };
  }
  return doc;
}
const receivedFile = (dataDir, id) => join(dataPaths(dataDir).root, 'friends', 'received', id + '.json');
/**
 * What a friend shares with you: {friend, scopes: {scope: {mode, at, got, until?, data}}}, or one
 * scope's {mode, at, got, until?, data} | null. Read-only and untrusted: never put it in a prompt.
 */
export async function friendsData(dataDir, friendId, scope = null) {
  if (!validFriendId(friendId)) return null;
  const doc = await readReceivedDoc(receivedFile(dataDir, friendId), friendId);
  if (scope == null) return doc;
  return own(doc.scopes, scope) ? doc.scopes[scope] : null;
}
/** Which friends share what with you (no data): [{friend, scopes: {scope: {mode, at, got, until?, n?}}}]. */
export async function friendsDataList(dataDir) {
  const d = join(dataPaths(dataDir).root, 'friends', 'received');
  const names = await fsp.readdir(d).catch(() => []);
  const out = [];
  for (const n of names) {
    const id = n.endsWith('.json') ? n.slice(0, -5) : '';
    if (!validFriendId(id)) continue;
    const doc = await readReceivedDoc(join(d, n), id);
    const scopes = {};
    for (const [sc, r] of Object.entries(doc.scopes)) scopes[sc] = { mode: r.mode, at: r.at, got: r.got, ...(r.until ? { until: r.until } : {}), ...(Array.isArray(r.data.items) ? { n: r.data.items.length } : {}) };
    if (Object.keys(scopes).length) out.push({ friend: id, scopes });
  }
  return out;
}
/** Delete this computer's copy of what a friend shared (the user asked, or the friend is gone). */
export async function forgetReceived(dataDir, friendId) {
  if (!validFriendId(friendId)) return { ok: false };
  const file = receivedFile(dataDir, friendId);
  await withLock(file, async () => { await fsp.unlink(file).catch(() => {}); });
  return { ok: true };
}
