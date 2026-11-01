// lib/friends/garden.mjs - Gardens with friends (OpenDash 2.18, agent 'garden-social'; docs/dev/GARDEN.md
// section 11, docs/dev/FRIENDS.md section 9).
//
// ONE SOURCE FOR THE RULES: the page's garden catalogue (src/app/94-garden-0catalog.js) and the social rules
// (src/app/94-garden-social-0rules.js) are evaluated here once, the way lib/profile-avatar.mjs evaluates the
// avatar kit, so a friend's garden and a friend's visit are checked against exactly the tables the page draws.
//
// KINDS (defined at load; server/routes/garden-social.mjs imports this module before the friends engine starts):
//   garden       latest   scope garden       the snapshot {v, lv, season, areas, plants: [[id, x, y, stage, variant,
//                                            flags]], decor: [[id, x, y, r, v]], heart, at, hearts?}: ids, cells and
//                                            numbers only. The page publishes it (gardenSnapshot(), debounced); the
//                                            per-friend 'Garden' permission (agent perms, on by default) decides who
//                                            gets it, takes it back when it goes off and gives it again when it comes back
//   garden:ask   handler  scope gardenvisit  {v}: "send me your garden" (a visit found its copy stale): answered with the
//                                            last published snapshot, only when you share your garden with them, at
//                                            most every GSOC_CAPS.askGapMs per friend
//   garden:act   handler  scope gardenvisit  {t: visit|water|gift|react|sign|like, p?, x?, y?, k?, item?, e?, txt?}
//   garden:line  event, local                {t: shared|level|bloom|mylevel|myribbon, n?, p?}: a line in the hangout feed
// Visiting has its own scope ('gardenvisit', not a perms scope: the engine allows it unless you stopped sharing
// with that friend altogether), so turning YOUR garden off for Sam never stops you visiting Sam's.
//
// ON ARRIVAL an act is taken only when: you share your garden with that friend (they can see it at all), it
// fits the tables (gsocActOk: known plant and decoration ids, a cell inside the garden, an allow-listed
// reaction, one line of plain text), the guestbook or gifts are not turned off, and the per-day caps
// (GSOC_CAPS.recv, per friend and in all) allow it. It is then kept in friends/garden.json and written to the
// feed under the MESSAGE id. NOTHING A FRIEND SENDS IS APPLIED TO YOUR GARDEN HERE: the page reads the
// waterings and parcels waiting and applies them itself against your own garden (a plant of that kind at that
// cell, one boost a plant a day, GSOC_BOOST.perDay in all), then says which it applied (applied()). Nothing
// here reaches the state file, Claude, the MCP, the actions layer or People.
//
// friends/garden.json (synced between your own devices, end-to-end encrypted only: lib/sync/manifest.mjs
// 'friends-garden'; every map keyed so two devices merge entry by entry):
//   acts   {msgId: {f, dir, t, d, at, p?, x?, y?, k?, item?, e?, txt?, applied?, hid?}}   what friends did in your
//          garden ('in') and you in theirs ('out'): 60 days; guestbook signatures 365 days (the newest 200)
//   bank   {'YYYY-MM': {'in.like': n, 'out.water': n, ...}}   older acts counted by month (the lifetime tallies)
//   seen   {friendId: {lv, bl: {plantId: day}, at}}            what you have seen of each friend's garden (feed lines)
//   asks   {friendId: ms}                                      when each friend's last ask was answered
//   asked  {friendId: {d, n, at}}                              your own asks to each friend (today's count, the last)
//   prefs  {book, gifts, seenAt}                               the guestbook and gifts on or off; the inbox read up to

import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { defineKind, S, ID_RE, MSG_ID_RE, SAFE_ID_RE } from './core.mjs';
import { readDoc, updateDoc, normEntry } from './store.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'app');
export const CATALOG_FILE = join(APP, '94-garden-0catalog.js');
export const RULES_FILE = join(APP, '94-garden-social-0rules.js');
export const LANDS_FILE = join(APP, '94-garden-lands-0table.js');   // the sections and features a snapshot may name
export const FISH_FILE = join(APP, '94-garden-fish-0catalog.js');   // 2.22: the fish and bug tables (gifts of catches, the showcase)
export const VARIANTS_FILE = join(APP, '94-garden-fish-0variants.js');   // the variants' ids (a friend's showcase and best specimens)
const NAMES = ['GARDEN_WORLD', 'GARDEN_SEASONS', 'GARDEN_AREAS', 'GARDEN_SNAPSHOT_MAX', 'gardenPlant', 'gardenDecor', 'gardenSnapshotClean',
  'GSOC_REACTS', 'GSOC_REACT_IDS', 'GSOC_ACTS', 'GSOC_ACT_IDS', 'GSOC_CAPS', 'GSOC_BOOST', 'GSOC_XP', 'GSOC_TEXT_MAX', 'GSOC_BOOK_KEEP', 'GSOC_BED',
  'gsocText', 'gsocReact', 'gsocGiftOk', 'gsocWaterOk', 'gsocActOk', 'gsocBedPlantOk', 'gsocBedState'];
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${readFileSync(CATALOG_FILE, 'utf8')}\n${readFileSync(LANDS_FILE, 'utf8')}\n${readFileSync(FISH_FILE, 'utf8')}\n${readFileSync(RULES_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();
export const {
  GARDEN_WORLD, GARDEN_SEASONS, GARDEN_AREAS, GARDEN_SNAPSHOT_MAX, gardenPlant, gardenDecor, gardenSnapshotClean,
  GSOC_REACTS, GSOC_REACT_IDS, GSOC_ACTS, GSOC_ACT_IDS, GSOC_CAPS, GSOC_BOOST, GSOC_XP, GSOC_TEXT_MAX, GSOC_BOOK_KEEP, GSOC_BED,
  gsocText, gsocReact, gsocGiftOk, gsocWaterOk, gsocActOk, gsocBedPlantOk, gsocBedState,
} = R;

// ─── The kinds (strict: ids, cells and numbers; one capped line of text) ──
const ROW_PLANT = S.tuple([S.id(), S.int(0, 63), S.int(0, 63), S.int(0, 4), S.int(0, 7), S.int(0, 15)]);
const ROW_DECOR = S.tuple([S.id(), S.int(0, 63), S.int(0, 63), S.int(0, 3), S.int(0, 7)]);
export const GARDEN_MAX_BYTES = 30000;
export const GARDEN_SCHEMA = S.obj({
  v: S.int(1, 9), lv: S.int(1, 999), season: S.oneOf([...GARDEN_SEASONS]), areas: S.list(S.id(), 12),
  plants: S.list(ROW_PLANT, GARDEN_SNAPSHOT_MAX.plants), decor: S.list(ROW_DECOR, GARDEN_SNAPSHOT_MAX.decor),
  heart: S.opt(S.int(0, 6)), at: S.ms(), hearts: S.opt(S.int(0, 1e7)),
  // (what this does not list is dropped on the way in: without these two no fish or bug could ever be given, and a friend's showcase never arrived)
  cv: S.opt(S.int(0, 9)),   // 2.22: can they take fish and bugs? (acts() checks it)
  wx: S.opt(S.int(1, 2)),   // 2.28: raining (1) or snowing (2) over their garden now
  tz: S.opt(S.int(-840, 840)), sr: S.opt(S.int(0, 1439)), ss: S.opt(S.int(0, 1439)),   // 2.28: their time zone's offset (minutes) and sunrise and sunset (minutes after midnight): a visit has their light
  sh: S.opt(S.obj({ f: S.list(S.tuple([S.id(), S.int(0, 3), S.int(1, 400)]), 40), b: S.list(S.id(), 40), rod: S.int(0, 9), net: S.int(0, 9), fv: S.opt(S.list(S.id(), 40)), bv: S.opt(S.list(S.id(), 40)) })),   // 2.22: the tank and the bug case; gardenShowClean checks the ids and caps the rest. fv, bv: each one's variant, or '-'
  sp: S.opt(S.obj({ f: S.list(S.tuple([S.id(), S.id(), S.int(1, 999), S.int(0, 3), S.int(0, 1e7)]), 12), b: S.list(S.tuple([S.id(), S.id(), S.int(1, 999), S.int(0, 3), S.int(0, 1e7)]), 12), vn: S.int(0, 999), c: S.int(0, 1e7) })),   // their best specimens: [kind, variant or '-', size, quality, serial], how many variants, how many catches. An older app drops the field; gardenSpecClean checks the ids
  ls: S.opt(S.list(S.id(), 90)), lf: S.opt(S.list(S.id(), 40)), lc: S.opt(S.list(S.id(), 24)), lz: S.opt(S.list(S.id(), 12)), lr: S.opt(S.int(0, 5)),   // the land: sections (and any whole plot), features built, curios found, stars logged, garden stars. Ids and a number; an older app drops them
  wk: S.opt(S.list(S.id(), 12)),   // 2.38: what they have built for the lake (a longer pier...): an older app drops the field
  tk: S.opt(S.list(S.id(), 24)),   // 2.23: ids of the tricks their pet knows (an older app drops the field; an id this one does not know is skipped)
});
export const ACT_SCHEMA = S.obj({
  t: S.oneOf([...GSOC_ACT_IDS]),
  p: S.opt(S.id()), x: S.opt(S.int(0, 63)), y: S.opt(S.int(0, 63)),
  k: S.opt(S.oneOf(['seed', 'decor', 'fish', 'bug'])), item: S.opt(S.id()),   // 2.22: a caught fish ('carp-2') or bug
  e: S.opt(S.oneOf([...GSOC_REACT_IDS])),
  txt: S.opt(S.str(GSOC_TEXT_MAX)),
});
const LINE_TYPES = ['shared', 'level', 'bloom', 'mylevel', 'myribbon'];
defineKind('garden', GARDEN_SCHEMA, { store: 'latest', scope: 'garden', passive: true, max: GARDEN_MAX_BYTES });
defineKind('garden:ask', S.obj({ v: S.int(1, 9) }), { store: 'handler', scope: 'gardenvisit', passive: true, max: 64 });
defineKind('garden:act', ACT_SCHEMA, { store: 'handler', scope: 'gardenvisit', xp: 2, max: 1024 });
defineKind('garden:line', S.obj({ t: S.oneOf(LINE_TYPES), n: S.opt(S.int(0, 1e6)), p: S.opt(S.id()) }), { store: 'event', passive: true, local: true, max: 256 });
export const GARDEN_KINDS = Object.freeze(['garden', 'garden:ask', 'garden:act', 'garden:line']);
const RARE = new Set(['rare', 'epic', 'legendary']);

// ─── The file ───────────────────────────────────────────────────────────────
const DAY = 86400000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const fid = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : '');
const sid = (v) => (typeof v === 'string' && SAFE_ID_RE.test(v) && !FORBIDDEN.has(v) ? v : '');
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
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
/** The newest `max` entries of a map (by their time). */
function newest(m, max) {
  const keys = Object.keys(m);
  if (keys.length <= max) return m;
  const out = {};
  for (const k of keys.sort((a, b) => (m[b].at || 0) - (m[a].at || 0)).slice(0, max)) out[k] = m[k];
  return out;
}
/** One act, checked like anything else (another device wrote it, or a friend's message filled it). */
function normAct(k, x) {
  if (!MSG_ID_RE.test(k) || !isObj(x) || !fid(x.f) || !GSOC_ACT_IDS.includes(x.t) || !DAY_RE.test(x.d || '')) return null;
  const out = { f: x.f, dir: x.dir === 'in' ? 'in' : 'out', t: x.t, d: x.d, at: num(x.at) };
  if (x.t === 'water') { if (!gardenPlant(x.p)) return null; out.p = x.p; const ax = int(x.x, 0, 63), ay = int(x.y, 0, 63); if (ax === null || ay === null) return null; out.x = ax; out.y = ay; }
  if (x.t === 'gift') { if (!gsocGiftOk(x.k, x.item)) return null; out.k = x.k; out.item = x.item; }
  if (x.t === 'react') { if (!gsocReact(x.e)) return null; out.e = x.e; }
  if (x.t === 'sign') { const t = gsocText(x.txt); if (!t) return null; out.txt = t; }
  if (num(x.applied)) out.applied = num(x.applied);
  if (num(x.hid)) out.hid = num(x.hid);
  return out;
}
export function normGarden(v) {
  const o = isObj(v) ? v : {};
  const p = isObj(o.prefs) ? o.prefs : {};
  return {
    v: 1,
    acts: newest(mapOf(o.acts, 20000, normAct), 6000),
    bank: mapOf(o.bank, 600, (k, x) => (MONTH_RE.test(k) && isObj(x) ? mapOf(x, 40, (kk, n) => (/^(in|out)\.[a-z]{2,8}$/.test(kk) && num(n) ? num(n) : null)) : null)),
    seen: mapOf(o.seen, 1000, (k, x) => {
      if (!fid(k) || !isObj(x)) return null;
      return { lv: int(x.lv, 0, 999) || 0, bl: mapOf(x.bl, 300, (pk, d) => (gardenPlant(pk) && DAY_RE.test(d || '') ? d : null)), at: num(x.at) };
    }),
    asks: mapOf(o.asks, 1000, (k, x) => (fid(k) && num(x) ? num(x) : null)),
    asked: mapOf(o.asked, 1000, (k, x) => (fid(k) && isObj(x) && DAY_RE.test(x.d || '') ? { d: x.d, n: Math.min(999, num(x.n)), at: num(x.at) } : null)),
    prefs: { book: p.book !== false, gifts: p.gifts !== false, seenAt: num(p.seenAt) },
  };
}
/** Old acts fold into the monthly bank (signatures stay a year, the newest GSOC_BOOK_KEEP of them). */
function prune(doc, today) {
  const cut60 = isoAdd(today, -60), cut365 = isoAdd(today, -365);
  const signs = Object.entries(doc.acts).filter(([, a]) => a.t === 'sign' && a.dir === 'in').sort((a, b) => b[1].at - a[1].at);
  const keepSigns = new Set(signs.slice(0, GSOC_BOOK_KEEP).filter(([, a]) => a.d >= cut365).map(([k]) => k));
  for (const [k, a] of Object.entries(doc.acts)) {
    const keep = a.t === 'sign' && a.dir === 'in' ? keepSigns.has(k) : a.d >= cut60;
    if (keep) continue;
    const m = a.d.slice(0, 7), b = doc.bank[m] || (doc.bank[m] = {}), key = a.dir + '.' + a.t;
    b[key] = (b[key] || 0) + 1;
    delete doc.acts[k];
  }
  return doc;
}
function isoAdd(iso, n) { return new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10); }

// ─── The service ─────────────────────────────────────────────────────────────
const fail = (code, message, status = 400) => Object.assign(new Error(message), { status, code });

/**
 * createGardenSocial({dataDir, friends: () => engine | null, emit(data) ('garden' for open tabs),
 *   emitFriends(data) ('friends': the feed changed), zone() -> IANA zone | null,
 *   policy(friend, scope) -> bool | Promise<bool> (agent perms: do I share `scope` with this friend), log, now})
 */
export function createGardenSocial({ dataDir, friends, emit = () => {}, emitFriends = () => {}, zone = () => null, policy = null, log = () => {}, now = Date.now }) {
  const file = join(resolve(dataDir), 'friends', 'garden.json');
  const stats = { capped: 0, bad: 0, off: 0 };
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
  const engine = () => { const e = typeof friends === 'function' ? friends() : null; return e && typeof e.send === 'function' ? e : null; };
  const tell = (data) => { try { emit(data); } catch { /* no open tabs */ } };

  async function read() { return normGarden(await readJson(file, { fallback: null }).catch(() => null)); }
  /** Read-modify-write under the file's lock: fn(doc) -> the doc, or undefined for no change. Never nests. */
  async function update(fn) {
    return withLock(file, async () => {
      const cur = normGarden(await readJson(file, { fallback: null }).catch(() => null));
      const next = await fn(cur);
      if (next === undefined) return cur;
      const clean = normGarden(prune(next, today()));
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
    try { const r = await fr.feedPost({ kind: 'garden:line', body, friend: friendId || undefined }); return r && r.entry ? r.entry : null; }
    catch (e) { log('info', `garden: a feed line was not written (${e && e.code})`); return null; }
  }
  /** How many acts of kind t today, this direction (and friend). */
  function used(doc, t, dir, f = null, day = today()) {
    let n = 0;
    for (const a of Object.values(doc.acts)) if (a.d === day && a.t === t && a.dir === dir && (!f || a.f === f)) n++;
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
  const nameOf = (f) => String((f && (f.nick || f.name)) || 'them').slice(0, 40);
  /** Do I share my garden with this friend? (agent perms; without it, yes for a confirmed friend) */
  async function sharesWith(friend) {
    if (!friend || friend.status !== 'friend') return false;
    if (typeof policy !== 'function') return true;
    try { return !!(await policy(friend, 'garden')); } catch { return false; }
  }
  /** A friend's garden as they last shared it: {snap (cleaned), at, hearts} | null. */
  async function snapOf(friendId, sharedDoc = null) {
    const d = sharedDoc || await readDoc(dataDir, 'shared');
    const it = d.items[`${friendId}|garden`];
    if (!it || !isObj(it.b)) return null;
    const snap = gardenSnapshotClean(it.b);
    if (!snap) return null;
    return { snap, at: Number(it.b.at) || Number(it.at) || 0, got: Number(it.at) || 0, hearts: Number.isInteger(it.b.hearts) ? it.b.hearts : 0 };
  }

  // ─── Receiving ───────────────────────────────────────────────────────────
  async function onSnapshot(msg, friend) {
    const f = friend && friend.id;
    if (!fid(f)) return;
    if (msg.revoked) {
      await update((doc) => { if (!doc.seen[f]) return undefined; delete doc.seen[f]; return doc; });
      tell({ type: 'snap', from: f, revoked: true });
      return;
    }
    const snap = gardenSnapshotClean(msg.b);
    if (!snap) { stats.bad++; return; }
    const lines = [];
    await update((doc) => {
      const was = doc.seen[f];
      const bl = was ? { ...was.bl } : {};
      const blooming = snap.plants.filter(r => r[3] >= 4 && RARE.has((gardenPlant(r[0]) || {}).rarity)).map(r => r[0]);
      if (!was) lines.push({ t: 'shared', n: snap.lv });
      else {
        if (snap.lv > was.lv && was.lv > 0) lines.push({ t: 'level', n: snap.lv });
        const fresh = [...new Set(blooming)].filter(p => !bl[p]);
        for (const p of fresh.slice(0, 2)) lines.push({ t: 'bloom', p });
      }
      for (const p of blooming) if (!bl[p]) bl[p] = today();
      doc.seen[f] = { lv: snap.lv, bl, at: now() };
      return doc;
    });
    for (const l of lines) await feedLine(f, l);
    tell({ type: 'snap', from: f, lines: lines.length });
  }
  async function onAsk(msg, friend) {
    const f = friend && friend.id;
    if (!fid(f) || msg.revoked) return;
    if (!(await sharesWith(friend))) { stats.off++; return; }
    let go = false;
    await update((doc) => {
      if ((doc.asks[f] || 0) > now() - GSOC_CAPS.askGapMs) return undefined;
      doc.asks[f] = now(); go = true;
      return doc;
    });
    if (!go) return;
    const fr = engine();
    try {
      const me = await readDoc(dataDir, 'me');
      const mine = me && isObj(me.mine) && isObj(me.mine.garden) ? me.mine.garden.b : null;
      if (mine && fr) await fr.send(f, 'garden', mine);
    } catch (e) { log('info', `garden: an ask was not answered (${e && e.code})`); }
  }
  async function onAct(msg, friend) {
    const f = friend && friend.id;
    const b = msg && msg.b;
    if (!fid(f) || !msg || !MSG_ID_RE.test(msg.id || '') || !b || msg.revoked) return;
    if (gsocActOk(b)) { stats.bad++; return; }
    if (!(await sharesWith(friend))) { stats.off++; return; }
    let took = null;
    await update((doc) => {
      if (doc.acts[msg.id]) return undefined;                                   // another device or road had it
      if (b.t === 'sign' && !doc.prefs.book) { stats.off++; return undefined; }
      if (b.t === 'gift' && !doc.prefs.gifts) { stats.off++; return undefined; }
      const [all, per] = GSOC_CAPS.recv[b.t] || [0, 0];
      if (used(doc, b.t, 'in') >= all || used(doc, b.t, 'in', f) >= per) { stats.capped++; return undefined; }
      if (b.t === 'gift' && Object.values(doc.acts).filter(a => a.f === f && a.dir === 'in' && a.t === 'gift' && !a.applied).length >= GSOC_CAPS.unopened) { stats.capped++; return undefined; }
      const a = normAct(msg.id, { f, dir: 'in', t: b.t, d: today(), at: now(), p: b.p, x: b.x, y: b.y, k: b.k, item: b.item, e: b.e, txt: b.txt });
      if (!a) { stats.bad++; return undefined; }
      doc.acts[msg.id] = a;
      took = a;
      return doc;
    });
    if (!took) return;
    await feedAdd({ id: msg.id, f, dir: 'in', k: 'garden:act', at: now(), lc: now(), b: feedBody(took) });
    tell({ type: 'act', from: f, id: msg.id, t: took.t, ...(took.p ? { p: took.p } : {}), ...(took.e ? { e: took.e } : {}), ...(took.item ? { k: took.k, item: took.item } : {}) });
  }
  const feedBody = (a) => ({ t: a.t, ...(a.p ? { p: a.p } : {}), ...(a.k ? { k: a.k, item: a.item } : {}), ...(a.e ? { e: a.e } : {}), ...(a.txt ? { txt: a.txt } : {}) });

  // ─── Sending (the page, through server/routes/garden-social.mjs) ────────
  async function act({ to, t, p, x, y, k, item, e, txt }) {
    if (!GSOC_ACT_IDS.includes(t)) throw fail('BAD', 'That is not something you can do in a garden.');
    const body = { t };
    if (t === 'water') Object.assign(body, { p, x, y });
    if (t === 'gift') Object.assign(body, { k, item });
    if (t === 'react') body.e = e;
    if (t === 'sign') body.txt = gsocText(txt);
    const why = gsocActOk(body);
    if (why === 'text') throw fail('BAD', 'Write a few words first.');
    if (why === 'gift') throw fail('BAD', 'That can not be given as a gift.');
    if (why) throw fail('BAD', 'That does not fit this garden.');
    const f = await myFriend(to);
    const theirs = await snapOf(f.id);
    if (!theirs) throw fail('NOT_SHARED', `${nameOf(f)} is not sharing their garden with you.`, 409);
    // 2.22: a friend on an older OpenDash would drop a fish or a bug quietly, and it would be lost: their snapshot says whether they can take one (cv)
    if (t === 'gift' && (k === 'fish' || k === 'bug') && !(theirs.snap.cv >= 1)) throw fail('OLD', `${nameOf(f)}'s Freeflo is older than yours and cannot take fish or bugs yet. Ask them to update, or give them a seed or a decoration.`, 409);
    if (t === 'water' && !theirs.snap.plants.some(r => r[0] === p && r[1] === x && r[2] === y)) throw fail('GONE', 'That plant has moved or been picked since. Try another one.', 409);
    const doc0 = await read();
    const [all, per] = GSOC_CAPS.send[t];
    if (used(doc0, t, 'out', f.id) >= per) throw fail('CAP', per === 1 ? `You have done that in ${nameOf(f)}'s garden today. Again tomorrow.` : `That's ${per} for ${nameOf(f)}'s garden today. More tomorrow.`);
    if (used(doc0, t, 'out') >= all) throw fail('CAP', `That's all for today (${all} a day). More tomorrow.`);
    const fr = engine();
    const r = await fr.send(f.id, 'garden:act', body);
    if (!r || !r.id) throw fail('NOT_ALLOWED', `${nameOf(f)} isn't taking visits from you right now (check what you share with them in Friends).`, 409);
    const a = normAct(r.id, { f: f.id, dir: 'out', t, d: today(), at: now(), ...body });
    await update((doc) => { if (a) doc.acts[r.id] = a; return doc; });
    if (a) await feedAdd({ id: r.id, f: f.id, to: [f.id], dir: 'out', k: 'garden:act', at: now(), lc: now(), b: feedBody(a) });
    tell({ type: 'sent', to: f.id, t, id: r.id });
    return { id: r.id, sent: r.sent, queued: r.queued, day: today() };
  }
  /** Ask a friend for a fresh copy of their garden (a visit found ours older than 20 minutes). */
  async function ask({ to }) {
    const f = await myFriend(to);
    const theirs = await snapOf(f.id);
    if (theirs && now() - theirs.got < 20 * 60000) return { fresh: true };
    const [all, per] = GSOC_CAPS.send.ask;
    const t = today();
    let go = false;
    await update((doc) => {
      const mine = doc.asked[f.id];
      const n = mine && mine.d === t ? mine.n : 0;
      let total = 0;
      for (const x of Object.values(doc.asked)) if (x.d === t) total += x.n;
      if (n >= per || total >= all || (mine && now() - mine.at < 20 * 60000)) return undefined;
      doc.asked[f.id] = { d: t, n: n + 1, at: now() };
      go = true;
      return doc;
    });
    if (!go) return { capped: true };
    const r = await engine().send(f.id, 'garden:ask', { v: 1 });
    return { asked: !!(r && r.id) };
  }
  /** The page applied these waterings and parcels to its garden (or found they no longer fit). */
  async function applied({ ids }) {
    const list = (Array.isArray(ids) ? ids : []).filter(x => MSG_ID_RE.test(x || '')).slice(0, 200);
    if (!list.length) return { n: 0 };
    let n = 0;
    await update((doc) => {
      for (const id of list) { const a = doc.acts[id]; if (a && a.dir === 'in' && !a.applied) { a.applied = now(); n++; } }
      return n ? doc : undefined;
    });
    if (n) tell({ type: 'applied', n });
    return { n };
  }
  /** Hide a guestbook line (or bring it back): it stays on your devices, out of sight. */
  async function hide({ id, hidden }) {
    if (!MSG_ID_RE.test(id || '')) throw fail('NOT_FOUND', 'That line is not here any more.');
    let ok = false;
    await update((doc) => {
      const a = doc.acts[id];
      if (!a || a.dir !== 'in' || a.t !== 'sign') return undefined;
      if (hidden) a.hid = now(); else delete a.hid;
      ok = true;
      return doc;
    });
    if (!ok) throw fail('NOT_FOUND', 'That line is not here any more.');
    tell({ type: 'changed' });
    return { id, hidden: !!hidden };
  }
  async function setPrefs(p = {}) {
    const doc = await update((d) => {
      if (typeof p.book === 'boolean') d.prefs.book = p.book;
      if (typeof p.gifts === 'boolean') d.prefs.gifts = p.gifts;
      if (p.seen === true) d.prefs.seenAt = now();
      return d;
    });
    tell({ type: 'changed' });
    return { prefs: doc.prefs };
  }
  /** A friend removed or blocked: what was kept about them goes too. */
  async function forgetFriend(id) {
    if (!fid(id)) return;
    await update((d) => {
      delete d.seen[id]; delete d.asks[id]; delete d.asked[id];
      for (const [k, a] of Object.entries(d.acts)) if (a.f === id) delete d.acts[k];
      return d;
    });
  }
  /** A friend renewed their keys (docs/dev/FRIENDS.md section 15): their visits and what you have seen move with them. */
  async function moveFriend(from, to) {
    if (!fid(from) || !fid(to) || from === to) return;
    await update((d) => {
      const move = (m) => { if (m[from] !== undefined) { if (m[to] === undefined) m[to] = m[from]; delete m[from]; } };
      move(d.seen); move(d.asks); move(d.asked);
      for (const a of Object.values(d.acts)) if (a.f === from) a.f = to;
      return d;
    });
  }

  // ─── The view ─────────────────────────────────────────────────────────────
  function tallies(doc) {
    const t = {};
    const add = (k, n) => { t[k] = (t[k] || 0) + n; };
    for (const m of Object.values(doc.bank)) for (const [k, n] of Object.entries(m)) add(k, n);
    for (const a of Object.values(doc.acts)) add(a.dir + '.' + a.t, 1);
    return t;
  }
  const actView = (id, a) => ({ id, f: a.f, dir: a.dir, t: a.t, d: a.d, at: a.at, ...(a.p ? { p: a.p, x: a.x, y: a.y } : {}), ...(a.k ? { k: a.k, item: a.item } : {}), ...(a.e ? { e: a.e } : {}), ...(a.txt ? { txt: a.txt } : {}), ...(a.applied ? { applied: a.applied } : {}), ...(a.hid ? { hid: a.hid } : {}) });
  /** What one friend's garden page needs: their garden, and what you did there today and lately. */
  async function friendView(id) {
    const f = await myFriend(id);
    const doc = await read();
    const theirs = await snapOf(f.id);
    const t = today();
    const usedNow = {};
    for (const k of GSOC_ACT_IDS) usedNow[k] = used(doc, k, 'out', f.id, t);
    const mine = Object.entries(doc.acts).filter(([, a]) => a.f === f.id && a.dir === 'out').sort((a, b) => b[1].at - a[1].at).slice(0, 40).map(([k, a]) => actView(k, a));
    const caps = {};
    for (const k of GSOC_ACT_IDS) caps[k] = { per: GSOC_CAPS.send[k][1], all: GSOC_CAPS.send[k][0], usedAll: used(doc, k, 'out', null, t) };
    return { friend: f.id, today: t, garden: theirs, used: usedNow, caps, mine };
  }
  /** have: {friendId: got} the page already holds (those snapshots are not sent again: `same: true`). */
  async function view({ snaps = true, have = null } = {}) {
    const fr = engine();
    const t = today();
    let list = [];
    if (fr) { try { list = (await fr.list()).filter(x => x && ID_RE.test(x.id || '') && x.status === 'friend'); } catch { list = []; } }
    const me = fr ? await fr.me().catch(() => null) : null;
    const doc = await read();
    const shared = await readDoc(dataDir, 'shared');
    const gardens = {};
    for (const f of list) {
      const g = await snapOf(f.id, shared);
      const visited = Object.values(doc.acts).some(a => a.f === f.id && a.dir === 'out' && a.t === 'visit' && a.d === t);
      const same = !!(have && have[f.id] && have[f.id] === g?.got);
      gardens[f.id] = g ? { ...(snaps && !same ? { snap: g.snap } : {}), ...(same ? { same: true } : {}), lv: g.snap.lv, n: g.snap.plants.length, at: g.at, got: g.got, hearts: g.hearts, visited } : null;
    }
    const acts = Object.entries(doc.acts);
    const inbox = acts.filter(([, a]) => a.dir === 'in' && a.t !== 'sign').sort((a, b) => b[1].at - a[1].at).slice(0, 120).map(([k, a]) => actView(k, a));
    const book = acts.filter(([, a]) => a.dir === 'in' && a.t === 'sign').sort((a, b) => b[1].at - a[1].at).slice(0, GSOC_BOOK_KEEP).map(([k, a]) => actView(k, a));
    const cutPending = now() - GSOC_BOOST.maxAgeDays * DAY;
    const pending = acts.filter(([, a]) => a.dir === 'in' && (a.t === 'water' || a.t === 'gift') && !a.applied && a.at >= cutPending).sort((a, b) => a[1].at - b[1].at).map(([k, a]) => actView(k, a));
    const sentToday = {};
    for (const k of GSOC_ACT_IDS) sentToday[k] = { used: used(doc, k, 'out', null, t), max: GSOC_CAPS.send[k][0] };
    const visitDays = new Set(acts.filter(([, a]) => a.dir === 'out' && a.t === 'visit').map(([, a]) => a.f + '|' + a.d)).size;
    const tally = tallies(doc);
    const unseen = acts.filter(([, a]) => a.dir === 'in' && a.at > doc.prefs.seenAt).length;
    return {
      on: !!(fr && me && me.id), today: t, gardens, inbox, book, pending, sentToday, tally, visitDays,
      prefs: doc.prefs, unseen, stats: { ...stats },
    };
  }

  /** Listen on the friends channel (once the engine exists). */
  let attached = null;
  function attach() {
    const fr = engine();
    if (!fr || attached === fr) return !!fr;
    attached = fr;
    const guard = (fn) => (msg, friend) => fn(msg, friend).catch((e) => log('warn', `garden: a message was not handled (${e && (e.code || 'error')})`));
    fr.on('garden', guard(onSnapshot));
    fr.on('garden:ask', guard(onAsk));
    fr.on('garden:act', guard(onAct));
    if (typeof fr.onRemoved === 'function') fr.onRemoved((friend) => forgetFriend(friend && friend.id).catch(() => {}));
    if (typeof fr.onRekeyed === 'function') fr.onRekeyed((from, to) => moveFriend(from, to).catch(() => {}));
    return true;
  }

  return { attach, view, friendView, act, ask, applied, hide, setPrefs, forgetFriend, moveFriend, read, today, file };
}
