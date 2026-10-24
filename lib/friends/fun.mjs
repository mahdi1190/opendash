// lib/friends/fun.mjs - Fun with friends (OpenDash 2.17, agent 'fun'): waves, high-fives, "thinking of
// you" nudges, reactions, gifts, duo streaks, friendship quests, the weekly recap, seasonal friend events
// and friendship level rewards, over the friends channel (docs/dev/FRIENDS.md).
//
// ONE SOURCE FOR THE RULES: the page's pure rules file (src/app/99f-fun-0rules.js) is evaluated here once,
// the way lib/profile-avatar.mjs evaluates the avatar kit, so what the page offers and what the server
// accepts are the same tables.
//
// KINDS (defined at load; server/routes/fun.mjs imports this module before the friends engine starts):
//   fun:wave   handler  scope cheer  {t: wave|high5|nudge|thanks, a?: high-five id}
//   fun:react  handler  scope cheer  {re: feed entry id (32 hex), e: reaction id, on: bool}
//   fun:gift   handler  scope cheer  {g: id, t: sticker|emote|cosmetic, item: id, wrap: id, line?: id}
//   fun:day    handler  scope game   {d: 'YYYY-MM-DD'}: "I finished at least one task that day" (duo streaks)
//   fun:event  handler  scope cheer  {ev: event id, t: knock|treat|trick, n?: 1..3}
//   fun:line   event, local only     {t: duo|quest|tier|combo, n?, q?, ev?}: a milestone line in the hangout feed
// 'handler': the engine validates the body against the schema and hands it here, storing nothing. This
// module then checks every id against the tables, applies the per-friend daily caps (FUN_CAPS.recv), and
// only then keeps it (friends/fun.json) and writes the feed line under the MESSAGE id (both sides share
// it, so a reaction finds it on either side). Sending applies FUN_CAPS.send. Every string shown comes from
// the tables; nothing a friend sends is free text. Nothing here calls Claude, the MCP, an action or
// People, nothing reaches the state file, and nothing a friend sends changes your tasks: XP is given by
// the page through gameAward (one per key, three a day per kind).
//
// friends/fun.json (synced between your own devices, end-to-end encrypted only: lib/sync/manifest.mjs
// 'friends-fun'; every map is keyed so two devices merge entry by entry):
//   log      {id: {d, b, f, dir, at}}        what was sent and taken per day (the caps); 10 days
//   mine     {day: 1}                        days you finished something (told to friends once a day)
//   days     {friendId: {day: 1}}            days each friend finished something (their fun:day)
//   sentDay  {friendId: day}                 the last day told to each friend
//   gifts    {msgId: {f, dir, t, item, wrap, line?, at, opened}}
//   book     {stickerId: day}                the sticker book (the day each was first opened)
//   reacts   {entryId: {'me'|friendId: {e, at}}}
//   waves    {friendId: {in5, out5, combo}}  the last high-fives each way (double high-fives)
//   knocks   {msgId: {f, dir, ev, at, ans}}  event door knocks and their answers
//   drops    {id: {ev, d, n, why}}           event currency, one entry per drop
//   qdone    {'week|friendId|quest': day}    friendship quests finished
//   marks    {key: day}                      milestones already celebrated (duo streaks, tiers)
//   prefs    {costume, high5, themes: {friendId: id}, spaceThemes: {spaceId: id}, recapSeen: week}

import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { defineKind, S, ID_RE, MSG_ID_RE, SAFE_ID_RE, friendshipStats } from './core.mjs';
import { readDoc, updateDoc, normEntry } from './store.mjs';

export const RULES_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'app', '99f-fun-0rules.js');
const NAMES = ['FUN_WAVES', 'FUN_WAVE_INFO', 'FUN_HIGH5', 'FUN_REACTIONS', 'FUN_STICKERS', 'FUN_EMOTES', 'FUN_COSMETICS', 'FUN_WRAPS', 'FUN_LINES',
  'FUN_GIFT_TYPES', 'FUN_THEMES', 'FUN_EVENTS', 'FUN_QUESTS', 'FUN_CAPS', 'FUN_DUO_MARKS', 'funItem', 'funIsoAdd', 'funDow', 'funWeekFrom', 'funHash',
  'funEventOn', 'funTierOf', 'funDuo', 'funDuoBest', 'funQuestPick', 'funUnlocks', 'funRewardsTrack', 'funCanSend'];
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${readFileSync(RULES_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();
export const {
  FUN_WAVES, FUN_WAVE_INFO, FUN_HIGH5, FUN_REACTIONS, FUN_STICKERS, FUN_EMOTES, FUN_COSMETICS, FUN_WRAPS, FUN_LINES,
  FUN_GIFT_TYPES, FUN_THEMES, FUN_EVENTS, FUN_QUESTS, FUN_CAPS, FUN_DUO_MARKS, funItem, funIsoAdd, funDow, funWeekFrom, funHash,
  funEventOn, funTierOf, funDuo, funDuoBest, funQuestPick, funUnlocks, funRewardsTrack, funCanSend,
} = R;

// ─── The kinds (strict, allow-listed: every value is an id from the tables) ──
const idsOf = (list) => list.map(r => r.id);
const KIND_OPTS = { store: 'handler', scope: 'cheer' };
defineKind('fun:wave', S.obj({ t: S.oneOf([...FUN_WAVES]), a: S.opt(S.oneOf(idsOf(FUN_HIGH5))) }), { ...KIND_OPTS, xp: 2, max: 128 });
defineKind('fun:react', S.obj({ re: S.id(), e: S.oneOf(idsOf(FUN_REACTIONS)), on: S.bool() }), { ...KIND_OPTS, passive: true, max: 256 });
defineKind('fun:gift', S.obj({ g: S.id(), t: S.oneOf([...FUN_GIFT_TYPES]), item: S.id(), wrap: S.oneOf(idsOf(FUN_WRAPS)), line: S.opt(S.oneOf(idsOf(FUN_LINES))) }), { ...KIND_OPTS, xp: 5, max: 512 });
defineKind('fun:day', S.obj({ d: S.day() }), { store: 'handler', scope: 'game', passive: true, max: 64 });
defineKind('fun:event', S.obj({ ev: S.oneOf(idsOf(FUN_EVENTS)), t: S.oneOf(['knock', 'treat', 'trick']), n: S.opt(S.int(1, 3)) }), { ...KIND_OPTS, xp: 3, max: 128 });
defineKind('fun:line', S.obj({ t: S.oneOf(['duo', 'quest', 'tier', 'combo']), n: S.opt(S.int(0, 100000)), q: S.opt(S.id()), ev: S.opt(S.id()) }), { store: 'event', passive: true, local: true, max: 256 });
export const FUN_KINDS = Object.freeze(['fun:wave', 'fun:react', 'fun:gift', 'fun:day', 'fun:event', 'fun:line']);

// ─── The file ───────────────────────────────────────────────────────────────
const DAY = 86400000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const fid = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : '');
const sid = (v) => (typeof v === 'string' && SAFE_ID_RE.test(v) && !FORBIDDEN.has(v) ? v : '');
/** Up to `max` entries of a map, each kept only when fn(key, value) returns something. */
function mapOf(m, max, fn) {
  const out = {};
  if (!isObj(m)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(m)) {
    if (n >= max) break;
    if (FORBIDDEN.has(k)) continue;
    const c = fn(k, v);
    if (c !== undefined && c !== null) { out[k] = c; n++; }
  }
  return out;
}
const dayMap = (m, max = 400) => mapOf(m, max, (k, v) => (DAY_RE.test(k) && v ? 1 : null));
const newest = (m, max, at = (v) => v.at) => {
  const keys = Object.keys(m);
  if (keys.length <= max) return m;
  const keep = keys.sort((a, b) => (at(m[b]) || 0) - (at(m[a]) || 0)).slice(0, max);
  const out = {};
  for (const k of keep) out[k] = m[k];
  return out;
};
/** fun.json, checked like anything else (another device wrote it, or a friend's message filled it). */
export function normFun(v) {
  const o = isObj(v) ? v : {};
  const p = isObj(o.prefs) ? o.prefs : {};
  const out = {
    v: 1,
    log: newest(mapOf(o.log, 6000, (k, x) => (sid(k) && isObj(x) && DAY_RE.test(x.d || '') && sid(x.b) ? { d: x.d, b: x.b, f: fid(x.f), dir: x.dir === 'in' ? 'in' : 'out', at: num(x.at) } : null)), 3000),
    mine: dayMap(o.mine),
    days: mapOf(o.days, 1000, (k, x) => (fid(k) ? dayMap(x) : null)),
    sentDay: mapOf(o.sentDay, 1000, (k, x) => (fid(k) && DAY_RE.test(x || '') ? x : null)),
    gifts: newest(mapOf(o.gifts, 1000, (k, x) => {
      if (!MSG_ID_RE.test(k) || !isObj(x) || !fid(x.f) || !FUN_GIFT_TYPES.includes(x.t) || !funItem(x.t, x.item) || !funItem('wrap', x.wrap)) return null;
      return { f: x.f, dir: x.dir === 'in' ? 'in' : 'out', t: x.t, item: x.item, wrap: x.wrap, ...(funItem('line', x.line) ? { line: x.line } : {}), at: num(x.at), opened: num(x.opened) };
    }), 500),
    book: mapOf(o.book, 200, (k, x) => (funItem('sticker', k) && DAY_RE.test(x || '') ? x : null)),
    reacts: newest(mapOf(o.reacts, 4000, (k, x) => {
      if (!MSG_ID_RE.test(k)) return null;
      const r = mapOf(x, 50, (who, y) => ((who === 'me' || fid(who)) && isObj(y) && funItem('reaction', y.e) ? { e: y.e, at: num(y.at) } : null));
      return Object.keys(r).length ? r : null;
    }), 2000, (r) => Math.max(0, ...Object.values(r).map(y => y.at))),
    waves: mapOf(o.waves, 1000, (k, x) => (fid(k) && isObj(x) ? { in5: num(x.in5), out5: num(x.out5), combo: num(x.combo) } : null)),
    knocks: newest(mapOf(o.knocks, 600, (k, x) => (MSG_ID_RE.test(k) && isObj(x) && fid(x.f) && sid(x.ev) ? { f: x.f, dir: x.dir === 'in' ? 'in' : 'out', ev: x.ev, at: num(x.at), ans: x.ans === 'treat' || x.ans === 'trick' ? x.ans : '' } : null)), 300),
    drops: newest(mapOf(o.drops, 10000, (k, x) => (sid(k) && isObj(x) && sid(x.ev) && DAY_RE.test(x.d || '') ? { ev: x.ev, d: x.d, n: Math.max(1, Math.min(5, num(x.n) || 1)), why: sid(x.why) || 'drop' } : null)), 5000, (x) => Date.parse(x.d + 'T12:00:00Z')),
    qdone: mapOf(o.qdone, 4000, (k, x) => (/^\d{4}-\d{2}-\d{2}\|[0-9a-f]{16}\|[a-z0-9]{1,16}$/.test(k) && DAY_RE.test(x || '') ? x : null)),
    marks: mapOf(o.marks, 4000, (k, x) => (typeof k === 'string' && /^[A-Za-z0-9_|:.-]{1,120}$/.test(k) && DAY_RE.test(x || '') ? x : null)),
    prefs: {
      costume: p.costume === true,
      high5: funItem('high5', p.high5) ? p.high5 : '',
      themes: mapOf(p.themes, 1000, (k, x) => (fid(k) && funItem('theme', x) ? x : null)),
      spaceThemes: mapOf(p.spaceThemes, 500, (k, x) => (sid(k) && funItem('theme', x) ? x : null)),
      recapSeen: DAY_RE.test(p.recapSeen || '') ? p.recapSeen : '',
    },
  };
  return out;
}
/** Old entries out: the caps' log after 10 days, day lists after 120, answered knocks after a week. */
function prune(doc, today) {
  const cut10 = funIsoAdd(today, -10), cut120 = funIsoAdd(today, -120);
  for (const [k, x] of Object.entries(doc.log)) if (x.d < cut10) delete doc.log[k];
  for (const k of Object.keys(doc.mine)) if (k < cut120) delete doc.mine[k];
  for (const m of Object.values(doc.days)) for (const k of Object.keys(m)) if (k < cut120) delete m[k];
  const week = Date.parse(today + 'T12:00:00Z') - 7 * DAY;
  for (const [k, x] of Object.entries(doc.knocks)) if (x.at && x.at < week) delete doc.knocks[k];
  return doc;
}

// ─── The service ─────────────────────────────────────────────────────────────
const fail = (code, message, status = 400) => Object.assign(new Error(message), { status, code });

/**
 * createFun({dataDir, friends: () => engine | null, emit(data) ('fun' for open tabs), emitFriends(data) ('friends': the feed changed),
 *            zone() -> IANA zone | null, weekStart() -> 'Mon'|'Sun'|'Sat', log, now})
 */
export function createFun({ dataDir, friends, emit = () => {}, emitFriends = () => {}, zone = () => null, weekStart = () => 'Mon', log = () => {}, now = Date.now }) {
  const file = join(resolve(dataDir), 'friends', 'fun.json');
  const stats = { capped: 0, bad: 0 };
  const fmts = new Map();
  function dayOf(ts) {
    const z = zone() || '';
    let f = fmts.get(z);
    if (!f) {
      try { f = new Intl.DateTimeFormat('en-CA', { timeZone: z || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }); }
      catch { f = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
      fmts.set(z, f);
    }
    return f.format(new Date(Number(ts)));
  }
  const today = () => dayOf(now());
  const ws = () => { const w = weekStart(); return w === 'Sun' || w === 'Sat' ? w : 'Mon'; };
  const engine = () => { const e = typeof friends === 'function' ? friends() : null; return e && typeof e.send === 'function' ? e : null; };
  const tell = (data) => { try { emit(data); } catch { /* no open tabs */ } };

  async function read() { return normFun(await readJson(file, { fallback: null }).catch(() => null)); }
  /** Read-modify-write under the file's lock: fn(doc) -> the doc, or undefined for no change. Never nests. */
  async function update(fn) {
    return withLock(file, async () => {
      const cur = normFun(await readJson(file, { fallback: null }).catch(() => null));
      const next = await fn(cur);
      if (next === undefined) return cur;
      const clean = normFun(prune(next, today()));
      await writeJson(file, clean);
      return clean;
    });
  }
  async function feedAdd(entry) {
    const e = normEntry(entry.id, entry);
    if (!e) return null;
    let added = false;
    await updateDoc(dataDir, 'feed', (d) => { if (d.msgs[e.id]) return undefined; d.msgs[e.id] = e; added = true; return d; });
    if (added) { try { emitFriends({ type: 'changed' }); } catch { /* no open tabs */ } }
    return e;
  }
  async function feedLine(friendId, body) {
    const fr = engine();
    if (!fr || typeof fr.feedPost !== 'function') return null;
    try { const r = await fr.feedPost({ kind: 'fun:line', body, friend: friendId || undefined }); return r && r.entry ? r.entry : null; }
    catch (e) { log('info', `fun: a feed line was not written (${e && e.code})`); return null; }
  }
  /** How many log entries of bucket b, today, this direction (and friend). */
  function used(doc, b, dir, f = null, day = today()) {
    let n = 0;
    for (const x of Object.values(doc.log)) if (x.d === day && x.b === b && x.dir === dir && (!f || x.f === f)) n++;
    return n;
  }
  async function myFriend(id) {
    const fr = engine();
    if (!fr) throw fail('NO_FRIENDS', 'Friends are not set up on this computer yet. Open Friends to start.', 409);
    if (!ID_RE.test(id || '')) throw fail('NOT_FOUND', 'That friend is not here any more.');
    const f = await fr.friend(id);
    if (!f || f.status !== 'friend') throw fail('NOT_FOUND', 'That friend is not here any more.');
    return f;
  }
  /** Friend views by id (no keys, no tokens: the engine's public view). */
  async function friendList() {
    const fr = engine();
    if (!fr) return [];
    try { return (await fr.list()).filter(f => f && ID_RE.test(f.id || '') && f.status === 'friend'); } catch { return []; }
  }
  /** Feed entries grouped by friend (an entry sent to several counts for each). */
  async function feedByFriend() {
    const msgs = (await readDoc(dataDir, 'feed')).msgs;
    const by = new Map();
    const push = (id, e) => { if (!by.has(id)) by.set(id, []); by.get(id).push(e); };
    for (const e of Object.values(msgs)) { if (e.f) push(e.f, e); else if (Array.isArray(e.to)) for (const t of e.to) push(t, e); }
    return { msgs, by };
  }
  async function levelWith(f) {
    const { by } = await feedByFriend();
    return friendshipStats(by.get(f.id) || [], { friendsAt: f.friendsAt, today: today(), dayOf }).level;
  }
  const cap = (b) => FUN_CAPS.send[b] || [0, 0];
  function checkSendCap(doc, b, to, name) {
    const [all, per] = cap(b);
    if (used(doc, b, 'out') >= all) throw fail('CAP', `That's all for today (${all} a day). More tomorrow.`);
    if (used(doc, b, 'out', to) >= per) throw fail('CAP', per === 1 ? `You've already done that for ${name} today. Again tomorrow.` : `That's ${per} for ${name} today. More tomorrow.`);
  }
  const nameOf = (f) => String((f && (f.nick || f.name)) || 'them').slice(0, 40);
  /** Send a handler kind to one friend; the 'out' feed line is written under the message id. */
  async function sendOne(f, kind, body, { feed = true } = {}) {
    const fr = engine();
    const r = await fr.send(f.id, kind, body);
    if (!r || !r.id) throw fail('NOT_ALLOWED', `${nameOf(f)} isn't taking that from you right now (check what you share with them in Friends).`);
    if (feed) await feedAdd({ id: r.id, f: f.id, to: [f.id], dir: 'out', k: kind, at: now(), lc: now(), b: body });
    return r;
  }
  const logEntry = (doc, id, b, dir, f) => { doc.log[id] = { d: today(), b, f, dir, at: now() }; };

  // ─── Seasonal events: drops of the event's currency ───────────────────────
  /** Add a drop (its id dedupes it; the day cap and the costume bonus apply). Inside update(). -> n added */
  function dropIn(doc, ev, id, n, why, day = today()) {
    if (!ev || doc.drops[id]) return 0;
    let have = 0;
    for (const x of Object.values(doc.drops)) if (x.ev === ev.inst && x.d === day) have += x.n;
    const bonus = doc.prefs.costume && why !== 'treat-got' ? ev.def.costumeBonus || 0 : 0;
    const add = Math.max(0, Math.min(n + bonus, ev.def.dayCap - have, 5));
    if (!add) return 0;
    doc.drops[id] = { ev: ev.inst, d: day, n: add, why };
    return add;
  }
  const candyOf = (doc, inst) => Object.values(doc.drops).reduce((a, x) => a + (x.ev === inst ? x.n : 0), 0);
  /** Cheers during the event drop sweets: every cheer you sent (and got) counts once, by its message id. */
  async function scanCheers(ev) {
    if (!ev) return;
    const msgs = (await readDoc(dataDir, 'feed')).msgs;
    const from = Date.parse(ev.from + 'T00:00:00Z') - DAY, to = Date.parse(ev.to + 'T23:59:59Z') + DAY;
    const cheers = Object.values(msgs).filter(e => e.k === 'cheer' && e.at >= from && e.at <= to && (e.dir === 'in' || e.dir === 'out'));
    if (!cheers.length) return;
    await update((doc) => {
      let n = 0;
      for (const e of cheers) {
        const d = dayOf(e.at);
        if (d < ev.from || d > ev.to) continue;
        n += dropIn(doc, ev, (e.dir === 'out' ? 'c' : 'r') + e.id, e.dir === 'out' ? ev.def.drops.cheerOut : ev.def.drops.cheerIn, e.dir === 'out' ? 'cheer' : 'cheered', d);
      }
      return n ? doc : undefined;
    });
  }
  /** A tier reached: one feed line and one event for the page (once per tier and event). */
  async function tierCheck(ev) {
    if (!ev) return;
    let hits = [];
    await update((d) => {
      const n = candyOf(d, ev.inst);
      hits = (ev.def.tiers || []).filter(([at]) => n >= at && !d.marks[`tier|${ev.inst}|${at}`]);
      if (!hits.length) return undefined;
      for (const [at] of hits) d.marks[`tier|${ev.inst}|${at}`] = today();
      return d;
    });
    for (const [at, label] of hits) {
      await feedLine(null, { t: 'tier', n: at, ev: ev.def.id });
      tell({ type: 'tier', ev: ev.def.id, n: at, label });
    }
  }

  // ─── Duo streaks ──────────────────────────────────────────────────────────
  async function duoCheck(friendIds) {
    const t = today();
    let hits = [];
    await update((doc) => {
      hits = [];
      for (const id of friendIds) {
        const d = funDuo(doc.mine, doc.days[id] || {}, t);
        if (!d.cur || !d.start) continue;
        const n = FUN_DUO_MARKS.filter(m => d.cur >= m).pop();
        if (!n) continue;
        const key = `duo|${id}|${d.start}|${n}`;
        if (!doc.marks[key]) hits.push({ id, n, key, start: d.start });
      }
      if (!hits.length) return undefined;
      for (const h of hits) doc.marks[h.key] = t;
      return doc;
    });
    for (const h of hits) {
      await feedLine(h.id, { t: 'duo', n: h.n });
      tell({ type: 'duo', from: h.id, n: h.n, start: h.start });
    }
  }

  // ─── Receiving (the engine validated the schema; we check ids, caps, then keep) ──
  async function takeIn(msg, friend, bucket, fn) {
    const f = friend && friend.id;
    if (!f || !msg || !MSG_ID_RE.test(msg.id || '') || !msg.b) return null;
    if (msg.revoked) return null;
    let out = null;
    await update((doc) => {
      if (doc.log[msg.id]) return undefined;                                  // another device or road had it
      if (used(doc, bucket, 'in', f) >= (FUN_CAPS.recv[bucket] || 0)) { stats.capped++; return undefined; }
      const r = fn(doc, f);
      if (r === null) { stats.bad++; return undefined; }
      logEntry(doc, msg.id, bucket, 'in', f);
      out = r || {};
      return doc;
    });
    return out;
  }
  async function onWave(msg, friend) {
    const b = msg.b || {};
    const ev = funEventOn(today());
    const r = await takeIn(msg, friend, b.t === 'nudge' ? 'nudge' : 'wave', (doc, f) => {
      if (!FUN_WAVES.includes(b.t) || (b.a && (b.t !== 'high5' || !funItem('high5', b.a)))) return null;
      let combo = false;
      if (b.t === 'high5') {
        const w = doc.waves[f] || { in5: 0, out5: 0, combo: 0 };
        w.in5 = now();
        if (w.out5 && now() - w.out5 <= FUN_CAPS.comboMs && !(w.combo && now() - w.combo <= FUN_CAPS.comboMs)) { combo = true; w.combo = now(); }
        doc.waves[f] = w;
      }
      return { combo };
    });
    if (!r) return;
    await feedAdd({ id: msg.id, f: friend.id, dir: 'in', k: 'fun:wave', at: now(), lc: now(), b: { t: b.t, ...(b.a ? { a: b.a } : {}) } });
    if (r.combo) await feedLine(friend.id, { t: 'combo' });
    tell({ type: 'wave', from: friend.id, t: b.t, a: b.a || null, id: msg.id, combo: !!r.combo, event: !!ev });
  }
  async function onReact(msg, friend) {
    const b = msg.b || {};
    if (!MSG_ID_RE.test(b.re || '') || !funItem('reaction', b.e)) { stats.bad++; return; }
    // Only on something you two share (a friend cannot probe or tag the rest of your feed).
    const e = (await readDoc(dataDir, 'feed')).msgs[b.re];
    if (!e || !(e.f === friend.id || (Array.isArray(e.to) && e.to.includes(friend.id)))) { stats.bad++; return; }
    const r = await takeIn(msg, friend, 'react', (doc, f) => {
      const cur = doc.reacts[b.re] || {};
      if (b.on) cur[f] = { e: b.e, at: now() }; else delete cur[f];
      if (Object.keys(cur).length) doc.reacts[b.re] = cur; else delete doc.reacts[b.re];
      return {};
    });
    if (r) tell({ type: 'react', from: friend.id, re: b.re, e: b.e, on: !!b.on, k: e.k });
  }
  async function onGift(msg, friend) {
    const b = msg.b || {};
    const r = await takeIn(msg, friend, 'gift', (doc, f) => {
      if (!FUN_GIFT_TYPES.includes(b.t) || !funItem(b.t, b.item) || !funItem('wrap', b.wrap) || (b.line && !funItem('line', b.line))) return null;
      if (doc.gifts[msg.id]) return null;
      const waiting = Object.values(doc.gifts).filter(g => g.f === f && g.dir === 'in' && !g.opened).length;
      if (waiting >= FUN_CAPS.unopened) return null;
      doc.gifts[msg.id] = { f, dir: 'in', t: b.t, item: b.item, wrap: b.wrap, ...(b.line ? { line: b.line } : {}), at: now(), opened: 0 };
      return {};
    });
    if (!r) return;
    await feedAdd({ id: msg.id, f: friend.id, dir: 'in', k: 'fun:gift', at: now(), lc: now(), b: { g: b.g, t: b.t, item: b.item, wrap: b.wrap, ...(b.line ? { line: b.line } : {}) } });
    tell({ type: 'gift', from: friend.id, id: msg.id, wrap: b.wrap });
  }
  async function onDay(msg, friend) {
    const b = msg.b || {};
    const t = today();
    if (!DAY_RE.test(b.d || '') || b.d < funIsoAdd(t, -2) || b.d > funIsoAdd(t, 1)) { stats.bad++; return; }
    const r = await takeIn(msg, friend, 'day', (doc, f) => {
      const m = doc.days[f] || {};
      if (m[b.d]) return null;
      m[b.d] = 1;
      doc.days[f] = m;
      return {};
    });
    if (!r) return;
    tell({ type: 'day', from: friend.id, d: b.d });
    await duoCheck([friend.id]);
  }
  async function onEvent(msg, friend) {
    const b = msg.b || {};
    const ev = funEventOn(today());
    if (!ev || ev.def.id !== b.ev) { stats.bad++; return; }
    let candy = 0;
    const r = await takeIn(msg, friend, 'event', (doc, f) => {
      if (b.t === 'knock') {
        if (Object.values(doc.knocks).some(k => k.f === f && k.dir === 'in' && !k.ans && k.ev === ev.inst && now() - k.at < FUN_CAPS.knockMs)) return null;   // one open knock per friend
        doc.knocks[msg.id] = { f, dir: 'in', ev: ev.inst, at: now(), ans: '' };
        return {};
      }
      // An answer counts only for a knock YOU made at their door, still open.
      const k = Object.entries(doc.knocks).filter(([, x]) => x.f === f && x.dir === 'out' && !x.ans && x.ev === ev.inst && now() - x.at < FUN_CAPS.knockMs).sort((a, c) => c[1].at - a[1].at)[0];
      if (!k) return null;
      k[1].ans = b.t;
      candy = dropIn(doc, ev, 't' + msg.id, b.t === 'treat' ? Math.max(1, Math.min(3, b.n || 2)) : ev.def.drops.trick, b.t === 'treat' ? 'treat-got' : 'trick-got');
      return {};
    });
    if (!r) return;
    await feedAdd({ id: msg.id, f: friend.id, dir: 'in', k: 'fun:event', at: now(), lc: now(), b: { ev: b.ev, t: b.t, ...(b.n ? { n: b.n } : {}) } });
    tell({ type: 'event', from: friend.id, t: b.t, ev: b.ev, id: msg.id, candy });
    if (candy) await tierCheck(ev);
  }

  // ─── Sending (the page, through server/routes/fun.mjs) ─────────────────
  async function wave({ to, t, a = null }) {
    if (!FUN_WAVES.includes(t)) throw fail('BAD', 'Pick a wave, a high five, a thank you or "thinking of you".');
    const f = await myFriend(to);
    const bucket = t === 'nudge' ? 'nudge' : 'wave';
    const doc0 = await read();
    checkSendCap(doc0, bucket, f.id, nameOf(f));
    let anim = null;
    if (t === 'high5') {
      anim = a || doc0.prefs.high5 || 'classic';
      if (!funItem('high5', anim)) anim = 'classic';
      const why = funCanSend('high5', anim, { level: await levelWith(f) });
      if (why) anim = 'classic';
    }
    const body = { t, ...(anim ? { a: anim } : {}) };
    const r = await sendOne(f, 'fun:wave', body);
    const ev = funEventOn(today());
    let combo = false, candy = 0;
    await update((doc) => {
      logEntry(doc, r.id, bucket, 'out', f.id);
      if (t === 'high5') {
        const w = doc.waves[f.id] || { in5: 0, out5: 0, combo: 0 };
        w.out5 = now();
        if (w.in5 && now() - w.in5 <= FUN_CAPS.comboMs && !(w.combo && now() - w.combo <= FUN_CAPS.comboMs)) { combo = true; w.combo = now(); }
        doc.waves[f.id] = w;
      }
      if (ev && (t === 'wave' || t === 'high5')) candy = dropIn(doc, ev, 'w' + r.id, ev.def.drops.wave, 'wave');
      return doc;
    });
    if (combo) await feedLine(f.id, { t: 'combo' });
    if (candy) await tierCheck(ev);
    return { id: r.id, sent: r.sent, queued: r.queued, a: anim, combo, candy };
  }
  async function react({ to, re, e, on }) {
    if (!MSG_ID_RE.test(re || '')) throw fail('BAD', 'That is not something you can react to.');
    if (!funItem('reaction', e)) throw fail('BAD', 'Pick one of the reactions.');
    const f = await myFriend(to);
    const entry = (await readDoc(dataDir, 'feed')).msgs[re];
    if (!entry || !(entry.f === f.id || (Array.isArray(entry.to) && entry.to.includes(f.id))) || (entry.dir !== 'in' && entry.dir !== 'out')) throw fail('BAD', 'That is not something you two share.');
    const doc0 = await read();
    checkSendCap(doc0, 'react', f.id, nameOf(f));
    const r = await sendOne(f, 'fun:react', { re, e, on: on !== false }, { feed: false });
    const doc = await update((d) => {
      logEntry(d, r.id, 'react', 'out', f.id);
      const cur = d.reacts[re] || {};
      if (on !== false) cur.me = { e, at: now() }; else delete cur.me;
      if (Object.keys(cur).length) d.reacts[re] = cur; else delete d.reacts[re];
      return d;
    });
    return { id: r.id, sent: r.sent, queued: r.queued, reacts: reactView(doc.reacts[re]) };
  }
  async function gift({ to, t, item, wrap, line = null, owned = null }) {
    if (!FUN_GIFT_TYPES.includes(t) || !funItem(t, item)) throw fail('BAD', 'Pick a sticker, an emote or an avatar item.');
    if (!funItem('wrap', wrap)) throw fail('BAD', 'Pick a wrapping paper.');
    if (line != null && !funItem('line', line)) throw fail('BAD', 'Pick one of the gift tags.');
    const f = await myFriend(to);
    const ev = funEventOn(today());
    const doc0 = await read();
    const ctx = { level: await levelWith(f), event: ev ? ev.def.id : '', book: doc0.book, owned: isObj(owned) ? { [item]: owned[item] === true } : {} };
    const why = funCanSend(t, item, ctx) || funCanSend('wrap', wrap, ctx) || (line ? funCanSend('line', line, ctx) : '');
    if (why) throw fail('LOCKED', `Not yet: ${why}.`);
    checkSendCap(doc0, 'gift', f.id, nameOf(f));
    const g = randomBytes(9).toString('base64url');
    const body = { g, t, item, wrap, ...(line ? { line } : {}) };
    const r = await sendOne(f, 'fun:gift', body);
    let candy = 0;
    await update((doc) => {
      logEntry(doc, r.id, 'gift', 'out', f.id);
      doc.gifts[r.id] = { f: f.id, dir: 'out', t, item, wrap, ...(line ? { line } : {}), at: now(), opened: 0 };
      if (ev) candy = dropIn(doc, ev, 'g' + r.id, ev.def.drops.gift, 'gift');
      return doc;
    });
    if (candy) await tierCheck(ev);
    return { id: r.id, sent: r.sent, queued: r.queued, candy };
  }
  async function openGift({ id }) {
    if (!MSG_ID_RE.test(id || '')) throw fail('NOT_FOUND', 'That gift is not here any more.');
    let out = null, first = false;
    await update((doc) => {
      const g = doc.gifts[id];
      if (!g || g.dir !== 'in') return undefined;
      out = { id, ...g };
      if (g.opened) return undefined;
      g.opened = now();
      out.opened = g.opened;
      if (g.t === 'sticker' && !doc.book[g.item]) { doc.book[g.item] = today(); first = true; }
      return doc;
    });
    if (!out) throw fail('NOT_FOUND', 'That gift is not here any more.');
    return { gift: out, first };
  }
  async function event({ to, t }) {
    const ev = funEventOn(today());
    if (!ev) throw fail('NO_EVENT', 'There is no friend event on right now. The next one comes with the season.');
    if (!['knock', 'treat', 'trick'].includes(t)) throw fail('BAD', 'Knock, or answer with a treat or a trick.');
    const f = await myFriend(to);
    const doc0 = await read();
    let knockId = null;
    if (t === 'knock') checkSendCap(doc0, 'knock', f.id, nameOf(f));
    else {
      const k = Object.entries(doc0.knocks).filter(([, x]) => x.f === f.id && x.dir === 'in' && !x.ans && x.ev === ev.inst && now() - x.at < FUN_CAPS.knockMs).sort((a, b) => b[1].at - a[1].at)[0];
      if (!k) throw fail('NO_KNOCK', `${nameOf(f)} hasn't knocked, or you already answered. Knock on their door instead.`);
      knockId = k[0];
      checkSendCap(doc0, 'answer', f.id, nameOf(f));
    }
    const body = { ev: ev.def.id, t, ...(t === 'treat' ? { n: 2 } : {}) };
    const r = await sendOne(f, 'fun:event', body);
    let candy = 0;
    await update((doc) => {
      logEntry(doc, r.id, t === 'knock' ? 'knock' : 'answer', 'out', f.id);
      if (t === 'knock') doc.knocks[r.id] = { f: f.id, dir: 'out', ev: ev.inst, at: now(), ans: '' };
      else {
        if (doc.knocks[knockId]) doc.knocks[knockId].ans = t;
        candy = dropIn(doc, ev, 'a' + r.id, t === 'treat' ? ev.def.drops.give : ev.def.drops.trick, t === 'treat' ? 'give' : 'trick');
      }
      return doc;
    });
    if (candy) await tierCheck(ev);
    return { id: r.id, sent: r.sent, queued: r.queued, candy };
  }
  /** The page saw a finished task today: remember the day and tell each friend once (their duo streak). */
  async function day() {
    const t = today();
    const list = await friendList();
    let ids = [];
    await update((doc) => {
      ids = list.map(f => f.id).filter(id => doc.sentDay[id] !== t);
      if (doc.mine[t] && !ids.length) return undefined;
      doc.mine[t] = 1;
      for (const id of ids) doc.sentDay[id] = t;
      return doc;
    });
    let sent = 0, queued = 0;
    const fr = engine();
    if (fr && ids.length) {
      try { const r = await fr.send(ids, 'fun:day', { d: t }); sent = r.sent || 0; queued = r.queued || 0; }
      catch (e) { log('info', `fun: the day was not sent (${e && e.code})`); }
    }
    await duoCheck(list.map(f => f.id));
    return { day: t, sent, queued };
  }
  async function setPrefs(p = {}) {
    const doc = await update((d) => {
      if (typeof p.costume === 'boolean') d.prefs.costume = p.costume;
      if (p.high5 !== undefined && funItem('high5', p.high5)) d.prefs.high5 = p.high5;
      if (isObj(p.theme) && fid(p.theme.friend)) { if (funItem('theme', p.theme.id) && p.theme.id !== 'plain') d.prefs.themes[p.theme.friend] = p.theme.id; else delete d.prefs.themes[p.theme.friend]; }
      if (isObj(p.spaceTheme) && sid(p.spaceTheme.space)) { if (funItem('theme', p.spaceTheme.id) && p.spaceTheme.id !== 'plain') d.prefs.spaceThemes[p.spaceTheme.space] = p.spaceTheme.id; else delete d.prefs.spaceThemes[p.spaceTheme.space]; }
      if (DAY_RE.test(p.recapSeen || '')) d.prefs.recapSeen = p.recapSeen;
      return d;
    });
    return { prefs: doc.prefs };
  }
  /** A friend removed or blocked: what fun kept about them goes too. */
  async function forgetFriend(id) {
    if (!fid(id)) return;
    await update((d) => {
      delete d.days[id]; delete d.sentDay[id]; delete d.waves[id]; delete d.prefs.themes[id];
      for (const [k, g] of Object.entries(d.gifts)) if (g.f === id) delete d.gifts[k];
      for (const [k, x] of Object.entries(d.knocks)) if (x.f === id) delete d.knocks[k];
      for (const [k, r] of Object.entries(d.reacts)) { if (r[id]) { delete r[id]; if (!Object.keys(r).length) delete d.reacts[k]; } }
      for (const k of Object.keys(d.qdone)) if (k.split('|')[1] === id) delete d.qdone[k];
      return d;
    });
  }

  /** A friend renewed their keys (docs/dev/FRIENDS.md section 15): their duo days, waves, gifts, knocks and reactions follow them. */
  async function moveFriend(from, to) {
    if (!fid(from) || !fid(to) || from === to) return;
    await update((d) => {
      const move = (m) => { if (m[from] !== undefined) { if (m[to] === undefined) m[to] = m[from]; delete m[from]; } };
      move(d.days); move(d.sentDay); move(d.waves); move(d.prefs.themes);
      for (const g of Object.values(d.gifts)) if (g.f === from) g.f = to;
      for (const x of Object.values(d.knocks)) if (x.f === from) x.f = to;
      for (const x of Object.values(d.log)) if (x.f === from) x.f = to;
      for (const r of Object.values(d.reacts)) move(r);
      for (const k of Object.keys(d.qdone)) { const p = k.split('|'); if (p[1] === from) { const nk = [p[0], to, p[2]].join('|'); if (!d.qdone[nk]) d.qdone[nk] = d.qdone[k]; delete d.qdone[k]; } }
      return d;
    });
  }

  // ─── The view ─────────────────────────────────────────────────────────────
  function reactView(r) {
    if (!r) return null;
    const counts = {}, who = {};
    for (const [k, y] of Object.entries(r)) { counts[y.e] = (counts[y.e] || 0) + 1; (who[y.e] = who[y.e] || []).push(k); }
    return { mine: r.me ? r.me.e : '', counts, who };
  }
  const tsDay = (e) => dayOf(e.at);
  /** Quest progress for one friend this week (from the feed and fun.json). */
  function questProgress(qid, f, entries, doc, weekFrom, weekTo, t) {
    const inWeek = (e) => { const d = tsDay(e); return d >= weekFrom && d <= weekTo; };
    const outTo = (k, pred) => entries.filter(e => e.k === k && e.dir === 'out' && inWeek(e) && (!pred || pred(e))).length;
    switch (qid) {
      case 'cheer3': return outTo('cheer');
      case 'wave5': return outTo('fun:wave', e => e.b && (e.b.t === 'wave' || e.b.t === 'high5'));
      case 'gift1': return outTo('fun:gift');
      case 'react3': {
        const wf = Date.parse(weekFrom + 'T00:00:00Z') - DAY;
        let n = 0;
        for (const e of entries) { const r = doc.reacts[e.id]; if (r && r.me && r.me.at >= wf && dayOf(r.me.at) >= weekFrom && e.dir === 'in') n++; }
        return n;
      }
      case 'focus1': return entries.filter(e => e.k === 'focus' && inWeek(e) && e.b && (e.b.state === 'done' || e.b.state === 'join' || e.b.state === 'start')).length ? 1 : 0;
      case 'duo3': {
        const both = Object.keys(doc.mine).filter(d => (doc.days[f.id] || {})[d] && d <= t && d >= funIsoAdd(weekFrom, -2));
        // the longest run that reaches into this week
        const set = new Set(both);
        let best = 0;
        for (const d of both) { if (set.has(funIsoAdd(d, -1))) continue; let n = 1, c = d; while (set.has(c = funIsoAdd(c, 1))) n++; const end = funIsoAdd(d, n - 1); if (end >= weekFrom) best = Math.max(best, n); }
        return best;
      }
      case 'both4': return Object.keys(doc.mine).filter(d => d >= weekFrom && d <= weekTo && (doc.days[f.id] || {})[d]).length;
      case 'knock1': return outTo('fun:event', e => e.b && e.b.t === 'knock');
      default: return 0;
    }
  }
  /** The week's recap (from..to): counts only, and the friend you did most with. */
  function recapOf(from, to, msgs, doc, list) {
    const ids = new Set(list.map(f => f.id));
    const r = { from, to, cheers: { sent: 0, got: 0 }, waves: { sent: 0, got: 0 }, gifts: { sent: 0, got: 0 }, wins: 0, quests: 0, friendXp: 0, highlight: null, lines: [] };
    const per = new Map(), xpDay = new Map();
    for (const e of Object.values(msgs)) {
      const d = tsDay(e);
      if (d < from || d > to) continue;
      const who = e.f || (Array.isArray(e.to) && e.to.length === 1 ? e.to[0] : null);
      if (who && !ids.has(who)) continue;
      const out = e.dir === 'out';
      if (e.k === 'cheer') r.cheers[out ? 'sent' : 'got']++;
      else if (e.k === 'fun:wave') r.waves[out ? 'sent' : 'got']++;
      else if (e.k === 'fun:gift') r.gifts[out ? 'sent' : 'got']++;
      const win = (e.k === 'quest' && e.b && e.b.state === 'done') || (e.k === 'challenge' && e.b && e.b.state === 'win') || (e.k === 'fun:line' && e.b && e.b.t !== 'combo');
      if (win) { r.wins++; if (r.lines.length < 4) r.lines.push({ k: e.k, f: who, b: e.b }); }
      if (who && ['cheer', 'fun:wave', 'fun:gift', 'fun:event', 'quest', 'focus', 'challenge'].includes(e.k)) {
        per.set(who, (per.get(who) || 0) + 1);
        const key = who + '|' + d, xp = e.k === 'cheer' ? 4 : e.k === 'quest' || e.k === 'challenge' ? 8 : e.k === 'focus' ? 6 : e.k === 'fun:gift' ? 5 : e.k === 'fun:event' ? 3 : 2;
        xpDay.set(key, Math.min(60, (xpDay.get(key) || 0) + xp));
      }
    }
    for (const [k, d] of Object.entries(doc.qdone)) { const w = k.slice(0, 10); if (d >= from && d <= to && w <= to) r.quests++; }
    r.friendXp = [...xpDay.values()].reduce((a, b) => a + b, 0);
    let top = null;
    for (const [id, n] of per) if (!top || n > top.n) top = { id, n };
    if (top) {
      const t = funDuo(doc.mine, doc.days[top.id] || {}, to);
      r.highlight = { id: top.id, n: top.n, duo: t.cur };
    }
    r.any = !!(r.cheers.sent + r.cheers.got + r.waves.sent + r.waves.got + r.gifts.sent + r.gifts.got + r.wins + r.quests);
    return r;
  }
  async function view() {
    const fr = engine();
    const t = today();
    const ev = funEventOn(t);
    if (ev) { try { await scanCheers(ev); await tierCheck(ev); } catch (e) { log('info', `fun: the event could not be counted (${e && e.code})`); } }
    const list = await friendList();
    const me = fr ? await fr.me().catch(() => null) : null;
    const { msgs, by } = await feedByFriend();
    let doc = await read();
    const weekFrom = funWeekFrom(t, ws()), weekTo = funIsoAdd(weekFrom, 6);
    const friendsOut = {};
    const newQuests = [];
    for (const f of list) {
      const entries = by.get(f.id) || [];
      const fs = friendshipStats(entries, { friendsAt: f.friendsAt, today: t, dayOf });
      const duo = funDuo(doc.mine, doc.days[f.id] || {}, t);
      const quests = funQuestPick(f.id, weekFrom, !!ev).map((qid) => {
        const q = funItem('quest', qid);
        const n = Math.min(q.of, questProgress(qid, f, entries, doc, weekFrom, weekTo, t));
        const key = `${weekFrom}|${f.id}|${qid}`;
        const done = n >= q.of;
        if (done && !doc.qdone[key]) newQuests.push({ key, f: f.id, q: qid });
        return { id: qid, n, of: q.of, done, at: doc.qdone[key] || (done ? t : '') };
      });
      const w = doc.waves[f.id] || {};
      friendsOut[f.id] = {
        level: fs.level, title: fs.title, duo, quests, theme: doc.prefs.themes[f.id] || 'plain',
        waves: { in5: w.in5 || 0, out5: w.out5 || 0 },
        gifts: Object.values(doc.gifts).filter(g => g.f === f.id && g.dir === 'in' && !g.opened).length,
        knock: ev ? Object.entries(doc.knocks).filter(([, x]) => x.f === f.id && x.ev === ev.inst && now() - x.at < FUN_CAPS.knockMs).map(([id, x]) => ({ id, dir: x.dir, at: x.at, ans: x.ans })) : [],
        used: { wave: used(doc, 'wave', 'out', f.id), nudge: used(doc, 'nudge', 'out', f.id), gift: used(doc, 'gift', 'out', f.id), knock: used(doc, 'knock', 'out', f.id) },
      };
    }
    if (newQuests.length) {
      let fresh = [];
      doc = await update((d) => { fresh = newQuests.filter(q => !d.qdone[q.key]); if (!fresh.length) return undefined; for (const q of fresh) d.qdone[q.key] = t; return d; });
      for (const q of fresh) await feedLine(q.f, { t: 'quest', q: q.q });
    }
    // reactions on what the feed still holds
    const reacts = {};
    for (const [id, r] of Object.entries(doc.reacts)) if (msgs[id]) reacts[id] = reactView(r);
    const gifts = Object.entries(doc.gifts).map(([id, g]) => ({ id, ...g })).sort((a, b) => b.at - a.at);
    const facts = {
      cheersSent: Object.values(msgs).filter(e => e.k === 'cheer' && e.dir === 'out').length,
      giftsSent: gifts.filter(g => g.dir === 'out').length,
      duoBest: Math.max(0, ...list.map(f => (friendsOut[f.id] ? friendsOut[f.id].duo.best : 0))),
      high5Double: Object.values(msgs).filter(e => e.k === 'fun:line' && e.b && e.b.t === 'combo').length,
      friendQuests: Object.keys(doc.qdone).length,
      candyBest: 0,
      stickersDistinct: Object.keys(doc.book).length,
      friends: list.length,
    };
    const insts = new Set(Object.values(doc.drops).map(x => x.ev));
    for (const i of insts) facts.candyBest = Math.max(facts.candyBest, candyOf(doc, i));
    let event = null;
    if (ev) {
      const n = candyOf(doc, ev.inst);
      let todayN = 0;
      for (const x of Object.values(doc.drops)) if (x.ev === ev.inst && x.d === t) todayN += x.n;
      event = { id: ev.def.id, inst: ev.inst, from: ev.from, to: ev.to, daysLeft: ev.daysLeft, candy: n, today: todayN, dayCap: ev.def.dayCap, tier: funTierOf(ev.def, n), costume: doc.prefs.costume,
        knocks: Object.entries(doc.knocks).filter(([, x]) => x.ev === ev.inst && now() - x.at < FUN_CAPS.knockMs).map(([id, x]) => ({ id, ...x })).sort((a, b) => b.at - a.at) };
    }
    const lastFrom = funIsoAdd(weekFrom, -7);
    const sendUsed = {};
    for (const b of Object.keys(FUN_CAPS.send)) sendUsed[b] = { used: used(doc, b, 'out'), max: FUN_CAPS.send[b][0] };
    return {
      on: !!(fr && me && me.id), today: t, week: { from: weekFrom, to: weekTo }, weekStart: ws(),
      friends: friendsOut, gifts: { inbox: gifts.filter(g => g.dir === 'in' && !g.opened).slice(0, 60), recent: gifts.filter(g => g.dir === 'out' || g.opened).slice(0, 40) },
      book: doc.book, reacts, facts, event, caps: sendUsed, mineToday: !!doc.mine[t],
      recap: { week: recapOf(weekFrom, t, msgs, doc, list), last: recapOf(lastFrom, funIsoAdd(weekFrom, -1), msgs, doc, list) },
      prefs: doc.prefs, stats: { ...stats },
    };
  }

  /** Listen on the friends channel (once the engine exists). */
  let attached = null;
  function attach() {
    const fr = engine();
    if (!fr || attached === fr) return !!fr;
    attached = fr;
    const guard = (fn) => (msg, friend) => fn(msg, friend).catch((e) => log('warn', `fun: a message was not handled (${e && (e.code || 'error')})`));
    fr.on('fun:wave', guard(onWave));
    fr.on('fun:react', guard(onReact));
    fr.on('fun:gift', guard(onGift));
    fr.on('fun:day', guard(onDay));
    fr.on('fun:event', guard(onEvent));
    if (typeof fr.onRemoved === 'function') fr.onRemoved((friend) => forgetFriend(friend && friend.id).catch(() => {}));
    if (typeof fr.onRekeyed === 'function') fr.onRekeyed((from, to) => moveFriend(from, to).catch(() => {}));
    return true;
  }

  return { attach, view, wave, react, gift, openGift, event, day, setPrefs, forgetFriend, read, today, file };
}
