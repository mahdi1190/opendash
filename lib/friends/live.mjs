// lib/friends/live.mjs - playing together, live, in each other's gardens: the server's part (docs/dev/GARDEN_TOGETHER.md).
//
// THE HOST IS THE TRUTH. A visitor's messages stop here first: confirmed friend (the engine), in a session, the right
// session id, a newer counter, within the rate, a body that fits its schema and the tables, and the level this friend has
// NOW. Only then does the page hear of an intent, and the page checks it again against the garden as it is. What this
// file refuses, the page never sees. Nothing here writes to the garden or the state file: a friend's name or message never
// reaches the state file, Claude, the MCP or the actions layer.
//
// Star: visitor <-> host only, sealed for that pair (engine.send, live kinds). The road is an open direct link, else the
// relay's pass-through room (lib/relay/space-room.mjs), which stores nothing. Connected only while both pages are in a garden.
//
// friends/garden-live.json (synced end to end, lib/sync/manifest.mjs 'friends-garden-live'):
//   {open, groupLook, queueOn, perms: {friendId: {lv, touch, share}}, posts: {id: {f, why, i, items, at, applied?}},
//    queue: {friendId: [what waits for me: {i, t, p, x, y, r?, at, got}]}, qd: {friendId: {d, n}} (how many today), asks: {friendId: at} (asked me for more), theirs: {friendId: {lv, q, at}} (what they told me I may do there)}. Sync can change it
//   under us (the owner lowered a level on their phone): the file is read again for every intent and knock, and every 3 s while someone is here.
// friends/garden-live-local.json (this computer only): {day, sent, got, by: {friendId: n}, restUntil}: the day's room messages.

import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, withLock } from '../fsutil.mjs';
import { defineKind, S, ID_RE, SAFE_ID_RE, signText, checkBody, cleanLine } from './core.mjs';
import { GARDEN_WORLD, gardenPlant, gardenDecor, gardenSnapshotClean, gsocGiftOk, gsocWaterOk } from './garden.mjs';
import { relayHasRooms } from './relay-client.mjs';
import { openRoomLink } from './live-room.mjs';
import { roomIdOf, roomTicketText } from '../relay/space-room.mjs';
import { iidOf, randomId, newSigner, KEY_RE } from '../relay/auth.mjs';
import { PF_PARTS } from '../profile-avatar.mjs';
import { PET_SCHEMA } from '../profile-pets.mjs';

// ─── One table for the page and the server ──────────────────────────────────
const RULES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'app', '94-garden-live-0rules.js');
const NAMES = ['GL_V', 'GL_PEOPLE', 'GL_LEVELS', 'GL_SHARES', 'GL_ACTS', 'GL_ACT_IDS', 'GL_CAPS', 'GL_QUEUE', 'GL_TRADE', 'GL_TRADE_STEPS', 'GL_TRADE_WHY', 'GL_BUDGET', 'GL_EMOTES', 'GL_PHRASE_IDS', 'GL_TOGETHER', 'GL_FX_KINDS', 'glPpOk', 'glFxHostOnly', 'glFxToHost', 'glAtLeast', 'glMayDo', 'glIntentOk', 'glPostOk', 'glFxOk', 'glTradeOk', 'GL_GOALS', 'GL_GOAL', 'glGoalDef', 'glGoalCap', 'glGoalSize', 'glGoalOk'];
// eslint-disable-next-line no-new-func
const R = new Function('GARDEN_WORLD', 'gardenPlant', 'gardenDecor', 'gsocGiftOk', 'gsocWaterOk', `"use strict";\n${readFileSync(RULES, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)(GARDEN_WORLD, gardenPlant, gardenDecor, gsocGiftOk, gsocWaterOk);
export const { GL_V, GL_PEOPLE, GL_LEVELS, GL_SHARES, GL_ACTS, GL_ACT_IDS, GL_CAPS, GL_QUEUE, GL_TRADE, GL_TRADE_STEPS, GL_TRADE_WHY, GL_BUDGET, GL_EMOTES, GL_PHRASE_IDS, GL_TOGETHER, GL_FX_KINDS, glPpOk, glFxHostOnly, glFxToHost, glAtLeast, glMayDo, glIntentOk, glPostOk, glFxOk, glTradeOk, GL_GOALS, GL_GOAL, glGoalDef, glGoalCap, glGoalSize, glGoalOk } = R;

// ─── The kinds ──────────────────────────────────────────────────────────────
const SID = S.id(), Q = S.int(0, 1e9), W = S.int(0, GL_PEOPLE), X = S.num(0, 64), LV = S.oneOf([...GL_LEVELS]);
const AVATAR = S.obj(Object.fromEntries(PF_PARTS.map(p => [p.k, S.opt(p.hex ? S.color() : S.id())])));
const CELL = S.int(0, 63);
const SCOPE = 'gardenvisit';
const live = (rate, max, extra = {}) => ({ store: 'live', scope: SCOPE, passive: true, noPage: true, road: true, room: true, rate, max, ttl: 30000, ...extra });
defineKind('gl:knock', S.obj({ v: S.int(1, 99), k: S.opt(S.str(43)) }), live({ sec: 1, min: 6 }, 128, { road: false, knock: true, ttl: 60000 }));
defineKind('gl:hi', S.obj({ v: S.int(1, 99), s: SID, lv: LV, w: W, touch: S.opt(S.bool()), r: S.opt(S.obj({ n: S.str(22), t: S.str(90), e: S.int(0, 9e15) })) }), live({ sec: 2, min: 20 }, 400, { road: false, knock: true, ttl: 60000 }));
defineKind('gl:no', S.obj({ v: S.int(1, 99), why: S.oneOf(['closed', 'ask', 'away', 'full', 'old', 'road', 'budget']) }), live({ sec: 2, min: 20 }, 64, { road: false, knock: true, ttl: 60000 }));
defineKind('gl:me', S.obj({ s: SID, q: Q, a: S.opt(AVATAR), pet: S.opt(PET_SCHEMA), x: S.opt(X), y: S.opt(X) }), live({ sec: 2, min: 20 }, 4096));
defineKind('gl:who', S.obj({ s: SID, q: Q, w: W, n: S.str(40), a: S.opt(AVATAR), pet: S.opt(PET_SCHEMA), lv: LV, on: S.bool(), x: S.opt(X), y: S.opt(X) }), live({ sec: 20, min: 240 }, 4096));
defineKind('gl:go', S.obj({ s: SID, q: Q, w: S.opt(W), x: X, y: X, r: S.opt(S.list(S.tuple([X, X]), 12)) }), live({ sec: 8, min: 300 }, 320));
defineKind('gl:em', S.obj({ s: SID, q: Q, w: S.opt(W), c: S.oneOf(['em', 'say', 'do']), e: SID, to: S.opt(W), x: S.opt(X), y: S.opt(X) }), live({ sec: 4, min: 90 }, 160));
// what people see each other do (2.27.9): a pet's clip, a line cast, a net swung, a catch held up. Ids and cells only, sent when it happens (never a stream). An older app has no such kind and drops it.
// Contests (c: 'ct', host to guests only): tt the round's length in seconds, l the board [[slot, points, catches]...]; kd may be 'bug' (the kind of round). The cap is 512 bytes for the board.
defineKind('gl:fx', S.obj({ s: SID, q: Q, w: S.opt(W), c: S.oneOf([...GL_FX_KINDS]), e: SID, i: S.opt(SID), x: S.opt(CELL), y: S.opt(CELL), to: S.opt(W), kd: S.opt(S.oneOf(['keep', 'fish', 'bug'])), n: S.opt(S.int(0, 999)), ql: S.opt(S.int(0, 3)), nw: S.opt(S.int(0, 3)), tt: S.opt(S.int(0, 999)), l: S.opt(S.list(S.tuple([W, S.int(0, 9999), S.int(0, 99)]), GL_PEOPLE)) }), live({ sec: 8, min: 150 }, 512));
// where pets really are (2.32): up to four {u: 0 = the sender's companion, 1 to 3 = the host's pack (e: species), x, y: tenths of a cell, gx, gy: where it is walking to, r: running, f: facing left}. Both ways: a guest's goes to the host and on to the others, the pack is the host's alone
defineKind('gl:pp', S.obj({ s: SID, q: Q, w: S.opt(W), l: S.list(S.obj({ u: S.int(0, 3), e: S.opt(SID), x: S.int(0, 640), y: S.int(0, 320), gx: S.opt(S.int(0, 640)), gy: S.opt(S.int(0, 320)), r: S.opt(S.int(0, 1)), f: S.opt(S.int(0, 1)) }), 4) }), live({ sec: 4, min: 120 }, 512));
// the creatures about in the host's garden (2.28.0), the whole list each time (a lost message costs nothing): each {u: its number, e: its kind, x, y: tenths of a cell, h: height, f: facing, k: the clip it is in}. Host to guests only; a guest draws them and never decides anything
defineKind('gl:cr', S.obj({ s: SID, q: Q, l: S.list(S.obj({ u: S.int(0, 99999), e: SID, x: S.int(0, 700), y: S.int(0, 500), h: S.int(0, 255), f: S.int(0, 1), k: S.opt(SID) }), 8) }), live({ sec: 4, min: 200 }, 1200));
// trading (2.29): a kind of its own, so an older app drops it and GL_V stays 2. t the trade's id, e the step (GL_TRADE_STEPS), to a slot, v the version of the terms, n a guest's counter (answered by an), o your offer and p theirs ([[item, n], ...]), c you confirmed, d they did, r they can trade, why. Checked again by glTradeOk
// the fish in the water (2.34), the whole list each time (a lost message costs nothing): each {u: its number, e: its kind, c: its length in cm, x, y: tenths of a cell, tx, ty: where it is going, st: swimming, coming to a line, nibbling, biting, hooked, bolting, to: whose line, n: nibbles so far}. Host to guests only
defineKind('gl:fs', S.obj({ s: SID, q: Q, l: S.list(S.obj({ u: S.int(0, 999), e: SID, c: S.int(0, 400), x: S.int(0, 640), y: S.int(0, 320), tx: S.int(0, 640), ty: S.int(0, 320), st: S.int(0, 5), to: S.opt(W), n: S.opt(S.int(0, 9)) }), 20) }), live({ sec: 5, min: 200 }, 2400));
// staying in step (2.34.1): a fingerprint of the plants and decorations the host has told everyone about, so a guest can tell it missed something. Host to guests only
defineKind('gl:sum', S.obj({ s: SID, q: Q, h: S.int(0, 4294967295), n: S.int(0, 9999) }), live({ sec: 1, min: 12 }, 128));
const TRADE_ROW = S.tuple([S.str(80), S.int(1, 99)]);
defineKind('gl:tr', S.obj({ s: SID, q: Q, w: S.opt(W), t: SID, e: S.oneOf([...GL_TRADE_STEPS]), to: S.opt(W), v: S.opt(S.int(0, 1e6)), n: S.opt(S.int(0, 1e6)), an: S.opt(S.int(0, 1e6)), o: S.opt(S.list(TRADE_ROW, GL_TRADE.rows)), p: S.opt(S.list(TRADE_ROW, GL_TRADE.rows)), c: S.opt(S.bool()), d: S.opt(S.bool()), r: S.opt(S.bool()), why: S.opt(S.oneOf([...GL_TRADE_WHY])) }), live({ sec: 8, min: 150 }, 1024));
// a shared goal (2.29), the host's page to its guests: the WHOLE state each time (a lost message costs nothing). g its id, c which goal (GL_GOALS), n how far, of how many, st 0 going / 1 done / 2 let go, p [[slot, part]]. glGoalOk checks it against the table; a guest never says one
defineKind('gl:goal', S.obj({ s: SID, q: Q, g: SID, c: SID, n: S.int(0, 99), of: S.int(1, 99), st: S.int(0, 2), p: S.list(S.tuple([S.int(0, GL_PEOPLE - 1), S.int(1, 99)]), GL_PEOPLE) }), live({ sec: 6, min: 120 }, 400));
const INTENT = { s: SID, q: Q, i: SID, t: S.oneOf([...GL_ACT_IDS]), p: S.opt(SID), x: S.opt(CELL), y: S.opt(CELL), tx: S.opt(CELL), ty: S.opt(CELL), r: S.opt(S.int(0, 3)), k: S.opt(S.oneOf(['seed', 'decor', 'fish', 'bug'])), item: S.opt(SID), to: S.opt(W), u: S.opt(SID) };
defineKind('gl:do', S.obj(INTENT), live({ sec: 6, min: 120 }, 320));
defineKind('gl:res', S.obj({ s: SID, q: Q, i: S.opt(SID), w: W, t: SID, ok: S.bool(), why: S.opt(S.str(120)), p: S.opt(SID), x: S.opt(CELL), y: S.opt(CELL), tx: S.opt(CELL), ty: S.opt(CELL), k: S.opt(S.oneOf(['seed', 'decor', 'fish', 'bug'])), item: S.opt(SID), to: S.opt(W), n: S.opt(S.int(0, 999)), u: S.opt(SID), by: S.opt(S.str(40)) }), live({ sec: 20, min: 300 }, 512));
const OP = S.obj({ o: S.oneOf(['+p', '-p', '~p', '+d', '-d', '~d']), id: S.opt(SID), x: CELL, y: CELL, s: S.opt(S.int(0, 4)), v: S.opt(S.int(0, 7)), f: S.opt(S.int(0, 15)), r: S.opt(S.int(0, 3)), by: S.opt(S.str(40)) });
defineKind('gl:d', S.obj({ s: SID, q: Q, ops: S.list(OP, 24) }), live({ sec: 20, min: 300 }, 4096));
defineKind('gl:snap', S.obj({ s: SID, q: Q, n: S.int(0, 16), of: S.int(1, 16), d: S.str(3600) }), live({ sec: 30, min: 200 }, 4096));
defineKind('gl:lv', S.obj({ s: SID, q: Q, lv: LV, touch: S.opt(S.bool()) }), live({ sec: 2, min: 30 }, 64));
defineKind('gl:bye', S.obj({ s: SID, why: S.opt(S.oneOf(['left', 'home', 'closed', 'away', 'budget', 'again'])) }), live({ sec: 2, min: 30 }, 64, { road: false, knock: true }));
defineKind('gl:ping', S.obj({ s: SID, q: Q }), live({ sec: 1, min: 20 }, 64));
defineKind('gl:post', S.obj({ id: SID, why: S.oneOf(['crop', 'back', 'did', 'trade']), i: S.opt(SID), d: S.opt(S.oneOf(['go', 'x'])), items: S.opt(S.list(S.tuple([S.str(80), S.int(1, 99)]), 4)) }), { store: 'handler', scope: SCOPE, passive: true, max: 512 });
// by the mailbox, like a post: what you did on the saved copy, waiting for me (the same fields and ids as gl:do); what you may do in my garden; please may I do more
defineKind('gl:q', S.obj({ i: SID, t: S.oneOf([...GL_QUEUE.acts]), p: SID, x: CELL, y: CELL, r: S.opt(S.int(0, 3)), at: S.int(0, 9e15) }), { store: 'handler', scope: SCOPE, passive: true, max: 256 });
defineKind('gl:perm', S.obj({ lv: LV, q: S.opt(S.bool()) }), { store: 'handler', scope: SCOPE, passive: true, max: 64 });
defineKind('gl:ask', S.obj({ v: S.int(1, 99) }), { store: 'handler', scope: SCOPE, passive: true, max: 64 });
export const GL_KINDS = Object.freeze(['gl:knock', 'gl:hi', 'gl:no', 'gl:me', 'gl:who', 'gl:go', 'gl:em', 'gl:fx', 'gl:pp', 'gl:cr', 'gl:fs', 'gl:sum', 'gl:tr', 'gl:goal', 'gl:do', 'gl:res', 'gl:d', 'gl:snap', 'gl:lv', 'gl:bye', 'gl:ping', 'gl:post', 'gl:q', 'gl:perm', 'gl:ask']);

const SNAP_CHUNK = 3600, SNAP_MAX = 48000, BY_NAMES_MAX = 16;
const TICKET_MS = 15 * 60000, LEAD_MS = 95000;    // a ticket is used at once; a tab that says nothing for this long is not the host any more
const BEAT_MS = 150000, BEAT_HIDDEN_MS = 15 * 60000, BEAT_GONE_MS = 20000;   // how long a page may say nothing before it counts as gone: a hidden tab is slowed or frozen by the browser and its person is still there; a page going away says so
const SESSION_MS = 95000;                         // nothing at all from a person for this long: they have left. Their app pings when quiet, whatever their page is doing
const RESUME_MS = 75000, RESUME_GAPS = [300, 1000, 2000, 4000, 8000, 8000, 15000], RESUME_KNOCK_TRY = 4, RESUME_KNOCK_MS = 20000;   // a dropped room: tried again this long, this far apart, without a visible rejoin; a knock from the fourth try on, in case the ticket or the room has gone
const REOPEN_GAPS = [500, 1500, 4000, 8000, 15000, 30000];   // the host's own socket dropped: the same room again, so everybody's ticket still works
const PING_QUIET_MS = 30000, PING_OUT_MS = 40000, PING_GAP_MS = 30000, HOST_QUIET_MS = 70000;   // a visitor asks when it has heard nothing for a while (or said nothing: so the host knows it is there); no answer at all: it is reconnecting
const SLEPT_MS = 15000, STALE_SAY_MS = 15000;     // a 3-second tick this late: this computer slept. How often one friend is told their session has gone
const POSTS_WAITING = 120, POSTS_DONE = 60;       // posts kept per friend: nobody can push another friend's out
const fail = (code, message, status = 400) => Object.assign(new Error(message), { status, code });
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const fid = (v) => (typeof v === 'string' && ID_RE.test(v) && !FORBIDDEN.has(v) ? v : '');
const dayNow = (t) => new Date(t).toISOString().slice(0, 10);
const newSid = () => randomId(9);
function normDoc(v) {
  const o = isObj(v) ? v : {}, perms = {}, posts = {};
  if (isObj(o.perms)) for (const [k, p] of Object.entries(o.perms)) {
    if (!fid(k) || !isObj(p)) continue;
    perms[k] = { lv: GL_LEVELS.includes(p.lv) ? p.lv : 'none', touch: p.touch === true, share: GL_SHARES.includes(p.share) ? p.share : 'keeper' };
  }
  const rows = isObj(o.posts) ? Object.entries(o.posts).filter(([k, p]) => SAFE_ID_RE.test(k) && !FORBIDDEN.has(k) && isObj(p) && fid(p.f) && !glPostOk(p)).sort((a, b) => (Number(a[1].at) || 0) - (Number(b[1].at) || 0)) : [];
  const kept = new Map();
  for (let i = rows.length - 1; i >= 0; i--) {   // newest first, each friend's own count
    const p = rows[i][1], key = p.f + (p.applied ? '|d' : '|w'), n = kept.get(key) || 0;
    if (n >= (p.applied ? POSTS_DONE : POSTS_WAITING)) rows.splice(i, 1); else kept.set(key, n + 1);
  }
  for (const [k, p] of rows) {
    posts[k] = { f: p.f, why: p.why, ...(typeof p.i === 'string' && SAFE_ID_RE.test(p.i) ? { i: p.i } : {}), ...(p.d === 'go' || p.d === 'x' ? { d: p.d } : {}), ...(Array.isArray(p.items) ? { items: p.items } : {}), at: Number(p.at) || 0, ...(p.applied ? { applied: Number(p.applied) || 0 } : {}) };
  }
  const queue = {}, qd = {}, asks = {}, theirs = {};
  if (isObj(o.queue)) for (const [k, list] of Object.entries(o.queue)) {
    if (!fid(k) || !Array.isArray(list)) continue;
    const ok = list.filter(e => isObj(e) && GL_QUEUE.acts.includes(e.t) && !glIntentOk(e) && Number.isFinite(e.at)).slice(0, GL_QUEUE.perFriend).map(e => ({ i: e.i, t: e.t, p: e.p, x: e.x, y: e.y, ...(Number.isInteger(e.r) ? { r: e.r } : {}), at: e.at, got: Number(e.got) || 0 }));
    if (ok.length) queue[k] = ok;
  }
  if (isObj(o.qd)) for (const [k, v] of Object.entries(o.qd)) if (fid(k) && isObj(v) && typeof v.d === 'string') qd[k] = { d: v.d.slice(0, 10), n: Number(v.n) || 0 };
  if (isObj(o.asks)) for (const [k, v] of Object.entries(o.asks)) if (fid(k) && Number.isFinite(v)) asks[k] = v;
  if (isObj(o.theirs)) for (const [k, v] of Object.entries(o.theirs)) if (fid(k) && isObj(v) && GL_LEVELS.includes(v.lv)) theirs[k] = { lv: v.lv, q: v.q !== false, at: Number(v.at) || 0 };
  return { v: 1, open: o.open !== false, groupLook: o.groupLook === true, queueOn: o.queueOn !== false, perms, posts, queue, qd, asks, theirs };
}

/**
 * createGardenLive({dataDir, friends: () => engine | null, emit(ev) (the page: /api/events 'garden' {type:'live', ev}),
 *   groupMember(friendId) -> bool (shares a group with me), log, now})
 */
export function createGardenLive({ dataDir, friends, emit = () => {}, groupMember = null, log = () => {}, now = Date.now }) {
  const root = resolve(dataDir);
  const file = join(root, 'friends', 'garden-live.json');
  const localFile = join(root, 'friends', 'garden-live-local.json');
  const engine = () => { const e = typeof friends === 'function' ? friends() : null; return e && typeof e.send === 'function' ? e : null; };
  const tell = (ev) => { try { emit({ type: 'live', ev }); } catch { /* no open tabs */ } };
  const stats = { out: {}, in: {}, refused: {}, roomSent: 0, since: now() };
  const refuse = (why) => { stats.refused[why] = (stats.refused[why] || 0) + 1; };

  let doc = null, docStamp = '';
  async function load() { if (!doc) await refresh(); return doc; }
  /** The file is what counts: sync may have changed it. What changed takes effect now: a lowered level, a closed gate. */
  async function refresh() {
    const st = await stat(file).catch(() => null), stamp = st ? `${st.mtimeMs}:${st.size}` : '';
    if (doc && stamp === docStamp) return doc;
    const was = doc, next = normDoc(await readJson(file, { fallback: null }).catch(() => null));
    docStamp = stamp; doc = next;
    if (was && levelsOf(was) !== levelsOf(next)) await permsChanged();
    return doc;
  }
  const levelsOf = (d) => JSON.stringify([d.open, d.groupLook, d.queueOn, d.perms]);
  async function save(fn) {
    let moved = false;
    const out = await withLock(file, async () => {
      const cur = normDoc(await readJson(file, { fallback: null }).catch(() => null));
      moved = !!doc && levelsOf(doc) !== levelsOf(cur);   // sync got here first, and nobody has acted on it yet
      const r = fn(cur);
      if (r === false) { doc = cur; return cur; }
      await writeJson(file, cur);
      doc = cur;
      const st = await stat(file).catch(() => null);
      docStamp = st ? `${st.mtimeMs}:${st.size}` : '';
      return cur;
    });
    if (moved) await permsChanged().catch(() => {});
    return out;
  }
  // the day's room messages: read at start, written now and then (it is only a limit)
  const newBudget = (day) => ({ day, sent: 0, got: 0, by: {}, restUntil: 0 });
  let budget = newBudget(dayNow(now())), budgetDirty = false, budgetLoaded = false;
  async function loadBudget() {
    if (budgetLoaded) return;
    budgetLoaded = true;
    const b = await readJson(localFile, { fallback: null }).catch(() => null);
    if (isObj(b) && b.day === dayNow(now())) {
      budget = { ...newBudget(b.day), sent: Number(b.sent) || 0, got: Number(b.got) || 0, restUntil: Number(b.restUntil) || 0 };
      if (isObj(b.by)) for (const [k, n] of Object.entries(b.by)) if (fid(k) && Number.isFinite(n)) budget.by[k] = n;
    }
  }
  const budgetToday = () => { const d = dayNow(now()); if (budget.day !== d) budget = newBudget(d); return budget; };
  const roomTotal = () => budget.sent + budget.got;
  const counted = () => {
    budgetDirty = true;
    if (roomTotal() === GL_BUDGET.thin || roomTotal() === GL_BUDGET.day) tell({ k: 'budget', mode: mode() });
    if (roomTotal() >= GL_BUDGET.day) rest('budget');
  };
  function spend(n = 1) { budgetToday().sent += n; stats.roomSent += n; counted(); }
  /** A message came in from this visitor, through my room. Incoming is what the relay pays for, so it counts as much as what I send, and one visitor has a share of it. */
  function arrived(id) {
    const b = budgetToday();
    b.got += 1; b.by[id] = (b.by[id] || 0) + 1; stats.roomIn = (stats.roomIn || 0) + 1; counted();
    if (b.by[id] === GL_BUDGET.guestDay) overShare(id).catch(() => {});
  }
  const overToday = (id) => budgetToday() && (budget.by[id] || 0) >= GL_BUDGET.guestDay;
  /** A visitor has used their share of my connection for today (I counted it, or the relay did): their visit ends, their level stays, the road opens tomorrow or on a direct link. */
  async function overShare(id) {
    budgetToday().by[id] = Math.max(budget.by[id] || 0, GL_BUDGET.guestDay); budgetDirty = true;
    log('info', 'garden live: one visitor used their share of the relay for today');
    if (host.sess.has(id)) await endSession(id, 'budget'); else kickTicket(id);
    tell({ k: 'host', ...hostView() });
  }
  const mode = () => (budget.day === dayNow(now()) && roomTotal() >= GL_BUDGET.day ? 'over' : budget.day === dayNow(now()) && roomTotal() >= GL_BUDGET.thin ? 'thin' : 'normal');
  const resting = () => (budget.restUntil > now()) || mode() === 'over';
  function rest(why) {
    // every allowance is a day's: when one is used up, the road opens again when the day turns
    budget.restUntil = why === 'budget' ? Math.max(now() + GL_BUDGET.restMs, Date.parse(dayNow(now()) + 'T00:00:00Z') + 86400000) : now() + GL_BUDGET.restMs; budgetDirty = true;
    log('info', `garden live: the relay road rests for a while (${why})`);
    closeRoomRoads(why);
  }

  // ─── Who may do what ─────────────────────────────────────────────────────
  async function permOf(friend) {
    const d = await load();
    const p = d.perms[friend.id];
    if (p) return p;
    if (d.groupLook && typeof groupMember === 'function') { try { if (await groupMember(friend.id)) return { lv: 'look', touch: false, share: 'keeper', viaGroup: true }; } catch { /* not in a group */ } }
    return { lv: 'none', touch: false, share: 'keeper' };
  }

  /** The levels changed on another device: the sessions here follow at once, and the page reads them again. */
  async function permsChanged() {
    const d = doc;
    if (!d.open) { for (const id of [...host.sess.keys()]) await endSession(id, 'closed'); }
    else for (const [id, se] of [...host.sess]) {
      const p = await permOf({ id });
      if (p.lv === 'none') { await endSession(id, 'home'); continue; }
      if (p.lv !== se.lv || p.touch !== !!se.touch) { se.lv = p.lv; se.touch = p.touch; await toSess(se, 'gl:lv', { lv: p.lv, ...(p.touch ? { touch: true } : {}) }); for (const o of others(se)) await toSess(o, 'gl:who', whoBody(se)); }
    }
    for (const id of [...host.tickets.keys()]) if (!host.sess.has(id)) { const p = await permOf({ id }); if (p.lv === 'none') kickTicket(id); }
    await dropQueue();
    tell({ k: 'host', ...hostView() });
  }

  // ─── The host's side ─────────────────────────────────────────────────────
  // sess: friendId -> {s, w, iid, lv, q (the last counter from them), out (mine to them), lastIn, joined, name, a, pet, x, y, day counts}
  // tab: which open tab of this person's is the host (one only: two would each apply what a visitor asks); tickets / byIid: who holds a ticket to this room, by the key made for their visit
  const host = { here: false, beat: 0, tab: '', tabBeat: 0, a: null, pet: null, x: null, y: null, sess: new Map(), link: null, opening: null, nonce: null, peers: new Set(), kicked: new Set(), knocks: new Map(), tickets: new Map(), byIid: new Map(), knocking: new Set(), roadNote: '' };
  /** Their ticket is no use any more: kicked now, whether or not they are in a session (they may have left and kept the socket). */
  function kickTicket(id) {
    const iid = host.tickets.get(id);
    if (!iid) return;
    host.tickets.delete(id); host.byIid.delete(iid);
    if (host.link && host.link.isOpen()) { host.link.kick(iid); host.kicked.add(iid); }
  }
  // ─── The visitor's side ──────────────────────────────────────────────────
  let viewVer = 0;
  const BOOT = randomId(6);   // (a page's newest view number means nothing after this server restarted)
  let visit = null;   // {fid, s, q, inQ, state: 'knocking'|'live'|'look', why, lv, w, beat, tries, lastOut, lastIn, nextKnock, link, road, look, snap}

  const road = {
    has(id) {
      if (visit && visit.fid === id && visit.link && visit.link.isOpen()) return true;
      const se = host.sess.get(id);
      return !!(se && host.link && host.link.isOpen() && se.iid && host.peers.has(se.iid));
    },
    async send(id, env) {
      if (visit && visit.fid === id && visit.link && visit.link.isOpen()) return visit.link.sendGuest(env);
      const se = host.sess.get(id);
      if (se && host.link && host.link.isOpen() && se.iid) return host.link.sendTo(se.iid, env);
      return false;
    },
  };
  let wired = null;
  function attach() {
    const fr = engine();
    if (!fr || wired === fr) return !!fr;
    wired = fr;
    if (fr.liveLink) fr.liveLink.setRoad(road);
    const heardIt = (k, fn, msg, f) => Promise.resolve().then(() => { stats.in[k] = (stats.in[k] || 0) + 1; return fn(msg, f); }).catch((e) => log('warn', `garden live: a message was not handled (${e && (e.code || 'error')})`));
    const on = (k, fn) => fr.on(k, (msg, f) => heardIt(k, fn, msg, f));
    // (these two can wait on a relay for seconds: never while everything else from every friend waits behind them)
    const onSoon = (k, fn) => fr.on(k, (msg, f) => { heardIt(k, fn, msg, f); });
    onSoon('gl:knock', onKnock);
    on('gl:me', (m, f) => fromVisitor(m, f, onMe));
    on('gl:go', (m, f) => (host.sess.has(f.id) ? fromVisitor(m, f, onGo) : fromHost(m, f)));
    on('gl:em', (m, f) => (host.sess.has(f.id) ? fromVisitor(m, f, onEm) : fromHost(m, f)));
    on('gl:cr', fromHost);
    on('gl:fs', fromHost);
    on('gl:sum', fromHost);
    on('gl:pp', (m, f) => (host.sess.has(f.id) ? fromVisitor(m, f, onPp) : fromHost(m, f)));
    on('gl:goal', fromHost);
    on('gl:fx', (m, f) => (host.sess.has(f.id) ? fromVisitor(m, f, onFx) : fromHost(m, f)));
    on('gl:tr', (m, f) => (host.sess.has(f.id) ? fromVisitor(m, f, onTr) : fromHost(m, f)));
    on('gl:do', (m, f) => fromVisitor(m, f, onDo));
    on('gl:ping', (m, f) => (host.sess.has(f.id) ? fromVisitor(m, f, onPing) : fromHost(m, f)));
    on('gl:bye', onBye);
    for (const k of ['gl:who', 'gl:res', 'gl:d', 'gl:snap', 'gl:lv']) on(k, fromHost);
    onSoon('gl:hi', onHi);
    on('gl:no', onNo);
    on('gl:post', onPost);
    on('gl:q', onQueue);
    on('gl:perm', onTheirs);
    on('gl:ask', onAsk);
    if (typeof fr.onRemoved === 'function') fr.onRemoved((friend) => forget(friend && friend.id).catch(() => {}));
    // removed or blocked: cut at once, not when the Undo window ends
    if (typeof fr.onChange === 'function') fr.onChange(() => { checkSessions().catch(() => {}); });
    if (typeof fr.onRekeyed === 'function') fr.onRekeyed((from, to) => moved(from, to).catch(() => {}));
    return true;
  }
  /** Send a live message, counted by kind. */
  async function out(to, k, body) {
    const fr = engine();
    if (!fr) return null;
    stats.out[k] = (stats.out[k] || 0) + 1;
    return fr.send(to, k, body);
  }
  /** One after the other for each person: a body's sealing takes as long as it takes, and a newer counter that overtook an older one would make the older one a replay, lost for good. */
  const inTurn = (o, fn) => { const p = (o.turn || Promise.resolve()).then(fn, fn); o.turn = p.catch(() => {}); return p; };
  const toSess = (se, k, body) => { se.out += 1; const m = { s: se.s, q: se.out, ...body }; return inTurn(se, () => out(se.fid, k, m)); };
  const nameOf = (f) => cleanLine(String((f && f.name) || 'A friend'), 40) || 'A friend';

  async function onKnock(msg, f) {
    if (host.knocking.has(f.id)) return;   // one at a time for each friend
    host.knocking.add(f.id);
    try { await answerKnock(msg, f); } finally { host.knocking.delete(f.id); }
  }
  async function answerKnock(msg, f) {
    await loadBudget();
    const d = await refresh();
    const perm = await permOf(f);
    const fr = engine();
    if (perm.lv === 'help' || perm.lv === 'play') tellTheirs(f.id, perm.lv, queueOpen(d));   // (so they know, for when I am out)
    if (perm.lv === 'none') {
      // A friend with no level learns nothing from a knock: not whether I am in my garden, not whether the gate is open, and not that this computer is on if I do not share that.
      if (host.here && d.open) { host.knocks.set(f.id, now()); tell({ k: 'knock', f: f.id }); }
      if (!fr.liveLink || !fr.liveLink.presenceOk || await fr.liveLink.presenceOk(f.id).catch(() => false)) await out(f.id, 'gl:no', { v: GL_V, why: 'ask' });
      return;
    }
    if (msg.b.v !== GL_V) { await out(f.id, 'gl:no', { v: GL_V, why: 'old' }); return; }   // older or newer: they keep the saved copy
    if (!host.here) { await out(f.id, 'gl:no', { v: GL_V, why: 'away' }); return; }
    if (!d.open) { await out(f.id, 'gl:no', { v: GL_V, why: 'closed' }); return; }
    let se = host.sess.get(f.id);
    if (!se && host.sess.size >= GL_PEOPLE - 1) { await out(f.id, 'gl:no', { v: GL_V, why: 'full' }); return; }
    const direct = !!(fr.liveLink && fr.liveLink.isDirect(f.id));
    let r = null, iid = null;
    if (!direct) {
      if (overToday(f.id)) { await out(f.id, 'gl:no', { v: GL_V, why: 'budget' }); return; }
      if (!KEY_RE.test(msg.b.k || '')) { await out(f.id, 'gl:no', { v: GL_V, why: 'old' }); return; }   // the visitor's key for this visit: the relay never sees who is visiting whom
      const link = await ensureRoom();
      if (!link) { await out(f.id, 'gl:no', { v: GL_V, why: resting() ? 'budget' : 'road' }); return; }
      const identity = await fr.liveLink.identity();
      if (!identity) { await out(f.id, 'gl:no', { v: GL_V, why: 'road' }); return; }
      const exp = now() + TICKET_MS;
      r = { n: host.nonce, t: await signText(identity, roomTicketText(host.roomId, msg.b.k, exp)), e: exp };
      iid = await iidOf(msg.b.k);
      const was = host.tickets.get(f.id);
      if (was && was !== iid) kickTicket(f.id);
      host.tickets.set(f.id, iid); host.byIid.set(iid, f.id);
      if (host.kicked.has(iid)) { host.kicked.delete(iid); link.unban(iid); }   // sent home earlier, let back in now
    }
    se = host.sess.get(f.id);
    if (!se) {
      if (host.sess.size >= GL_PEOPLE - 1) { kickTicket(f.id); await out(f.id, 'gl:no', { v: GL_V, why: 'full' }); return; }
      const used = new Set([...host.sess.values()].map(x => x.w));
      let w = 1; while (used.has(w)) w++;
      se = { fid: f.id, w, name: nameOf(f), q: 0, out: 0, joined: false, a: null, pet: null, x: null, y: null };
      host.sess.set(f.id, se);
    }
    // (the same visit knocking again, a knock repeated on a slow relay or a ticket that ran out, keeps its session: new tickets, nothing else changes. A new session would make the person leave and come back)
    if (!se.s || se.k !== msg.b.k) { se.s = newSid(); se.q = 0; se.out = 0; se.joined = false; }
    se.k = msg.b.k; se.iid = iid; se.lv = perm.lv; se.lastIn = now();
    host.knocks.delete(f.id);
    await out(f.id, 'gl:hi', { v: GL_V, s: se.s, lv: perm.lv, w: se.w, ...(perm.touch ? { touch: true } : {}), ...(r ? { r } : {}) });
  }
  /** The room, opened the first time someone needs it. Null when there is no way (no relay, an older relay, resting). */
  async function ensureRoom() {
    if (host.link && host.link.isOpen()) return host.link;
    if (host.opening) return host.opening;
    if (resting()) { host.roadNote = 'rest'; return null; }
    host.opening = (async () => {
      const fr = engine();
      const home = await fr.liveLink.home();
      if (!home) { host.roadNote = 'norelay'; tell({ k: 'road', note: 'norelay' }); return null; }
      let has = false;
      try { has = await relayHasRooms(home.origin); } catch { host.roadNote = 'unreachable'; tell({ k: 'road', note: 'unreachable' }); return null; }
      if (!has) { host.roadNote = home.role === 'owner' ? 'old-mine' : 'old-theirs'; tell({ k: 'road', note: host.roadNote }); return null; }
      const identity = await fr.liveLink.identity();
      // (a socket that dropped with people still here: the same room, so their tickets still work. A new room only when nobody holds a ticket)
      const again = !!(host.nonce && host.roomId && host.sess.size && host.tickets.size);
      const nonce = again ? host.nonce : randomId(16), id = again ? host.roomId : await roomIdOf(identity.ed.pub, nonce);
      if (!again) { host.peers.clear(); host.tickets.clear(); host.byIid.clear(); host.kicked.clear(); }
      let link = null;
      link = await openRoomLink({
        origin: home.origin, identity, id, auth: { host: identity.ed.pub, nonce },
        // whoever holds that socket is who the ticket was for: their envelope must be sealed by them, and only live garden kinds pass (engine.receive)
        onEnv: (env, iid) => { const who = host.byIid.get(iid); if (!who) { refuse('room-stranger'); return undefined; } arrived(who); return fr.receive(env, 'room', who); },
        onPeer: (g, on) => { if (on) host.peers.add(g); else host.peers.delete(g); },
        onOver: (g) => { const who = host.byIid.get(g); if (who) overShare(who).catch(() => {}); },
        onSent: spend,
        onClosed: (code, why) => {
          if (!link || host.link !== link) return;   // (one we closed ourselves, or replaced)
          host.link = null;
          host.peers.clear();
          if (why === 'budget') rest('budget');
          else if (code === 4403) { host.roadNote = 'refused'; tell({ k: 'road', note: 'refused' }); }
          else if (code !== 4409) roomAgain(0);      // (4409: a newer socket of this key took the room)
        },
      });
      host.link = link; host.nonce = nonce; host.roomId = id; host.roadNote = '';
      if (again) {
        // a room's list of banned keys is in the host's socket: this one starts empty, so everyone sent home goes on it again before anything else
        for (const iid of host.kicked) link.kick(iid);
        for (const iid of host.byIid.keys()) host.peers.add(iid);   // (a guest whose socket outlived my old one is not announced again)
        stats.roomAgain = (stats.roomAgain || 0) + 1;
      }
      return link;
    })().catch((e) => {
      if (e && e.why === 'not_member') { host.roadNote = 'refused'; tell({ k: 'road', note: 'refused' }); }
      else if (e && (e.status === 503 || (e.status === 429 && !(e.retryAfter > 0 && e.retryAfter <= 30)))) rest('relay');
      host.roadNote = host.roadNote || 'unreachable';
      log('info', `garden live: no room (${e && e.code})`);
      return null;
    }).finally(() => { host.opening = null; });
    return host.opening;
  }
  /** My socket to the room dropped, with people here: open it again, a little later each time. Nobody leaves or comes back for this: their own apps are redialling too. */
  function roomAgain(n) {
    clearTimeout(host.againT); host.againT = 0;
    if (n >= REOPEN_GAPS.length || !host.here || !host.sess.size || !host.tickets.size || host.link || resting()) return;
    host.againT = setTimeout(() => { host.againT = 0; ensureRoom().then((l) => { if (!l) roomAgain(n + 1); }).catch(() => roomAgain(n + 1)); }, REOPEN_GAPS[n]);
    if (host.againT.unref) host.againT.unref();
  }
  /** Someone is talking in a session I no longer have (I restarted, or it timed out): they are told to knock again, at once, instead of hearing nothing for a minute. Only someone who has a level here, and not often. */
  const staleSaid = new Map();
  async function staleSession(f, s) {
    if (!host.here || typeof s !== 'string' || now() - (staleSaid.get(f.id) || 0) < STALE_SAY_MS) return;
    const d = await load();
    if (!d.open || (await permOf(f)).lv === 'none') return;
    staleSaid.set(f.id, now());
    await out(f.id, 'gl:bye', { s, why: 'again' }).catch(() => {});
  }
  /** A message from someone visiting me: everything every such message must pass. */
  async function fromVisitor(msg, f, fn) {
    const se = host.sess.get(f.id), b = msg.b;
    if (!host.here || !se) { refuse('no-session'); await staleSession(f, b.s); return; }
    if (b.s !== se.s) { refuse('session'); await staleSession(f, b.s); return; }
    if (!(b.q > se.q)) { refuse('replay'); return; }
    if (msg.k === 'gl:do') { await refresh(); if (host.sess.get(f.id) !== se) { refuse('no-session'); return; } }
    const perm = await permOf(f);
    if (perm.lv === 'none') { refuse('removed'); await endSession(f.id, 'home'); return; }
    se.q = b.q; se.lv = perm.lv; se.touch = perm.touch; se.share = perm.share; se.lastIn = now();
    await fn(msg, f, se, perm);
  }
  async function roster(se) {
    if (host.a || host.here) await toSess(se, 'gl:who', { w: 0, n: host.name || 'Host', ...(host.a ? { a: host.a } : {}), ...(host.pet ? { pet: host.pet } : {}), lv: 'play', on: true, ...(host.x != null ? { x: host.x, y: host.y } : {}) });
    for (const o of host.sess.values()) if (o !== se && o.joined) await toSess(se, 'gl:who', whoBody(o));
    await toSess(se, 'gl:who', whoBody(se));   // what the host calls you ("Planted by" on your own things)
  }
  const whoBody = (o, on = true) => ({ w: o.w, n: o.name, ...(o.a ? { a: o.a } : {}), ...(o.pet ? { pet: o.pet } : {}), lv: o.lv, on, ...(o.x != null ? { x: o.x, y: o.y } : {}) });
  const others = (se) => [...host.sess.values()].filter(o => o !== se && o.joined);
  /**
   * How someone looks, and "tell me everything". The first one is them arriving. One with a new look (new clothes) goes to the others, and nothing else happens.
   * One with the same look is someone who may have missed things (back after a dropped connection, a reloaded page): who is here and the whole garden again, without anyone seeing a thing.
   */
  async function onMe(msg, f, se) {
    const b = msg.b, a = isObj(b.a) ? b.a : null, pet = isObj(b.pet) ? b.pet : null, sameLook = JSON.stringify([a, pet]) === JSON.stringify([se.a, se.pet]);
    se.a = a; se.pet = pet;
    if (Number.isFinite(b.x)) { se.x = b.x; se.y = b.y; }
    const was = se.joined;
    se.joined = true;
    const ev = { k: 'join', f: f.id, w: se.w, n: se.name, a: se.a, pet: se.pet, lv: se.lv, x: se.x, y: se.y, again: was };
    if (was && !sameLook) {
      for (const o of others(se)) await toSess(o, 'gl:who', whoBody(se));
      tell({ ...ev, lookOnly: true });
      return;
    }
    await roster(se);
    if (!was) for (const o of others(se)) await toSess(o, 'gl:who', whoBody(se));
    tell(ev);
  }
  /** A walk: the host's page knows the garden, so it works out the way round the beds and tells everyone (hostSend 'go'), the walker too. */
  async function onGo(msg, f, se) {
    se.x = msg.b.x; se.y = msg.b.y;
    tell({ k: 'go', w: se.w, x: se.x, y: se.y });
  }
  const emOk = (c, e) => (c === 'em' ? GL_EMOTES.includes(e) : c === 'say' ? GL_PHRASE_IDS.includes(e) : c === 'do' ? GL_TOGETHER.includes(e) : false);
  async function onEm(msg, f, se) {
    const b = msg.b;
    if (!emOk(b.c, b.e)) { refuse('emote'); return; }
    const body = { w: se.w, c: b.c, e: b.e, ...(b.to != null ? { to: b.to } : {}), ...(b.x != null ? { x: b.x, y: b.y } : {}) };
    for (const o of others(se)) await toSess(o, 'gl:em', body);
    tell({ k: 'em', ...body });
  }
  /** Something one person did that the others can see (a pet's trick, a line cast, a catch held up): checked against the tables, then told to everyone else and to the host's page. Nothing changes in the garden. */
  async function onFx(msg, f, se) {
    const { s, q, ...b } = msg.b;
    if (glFxOk(b) || glFxHostOnly(b)) { refuse('fx'); return; }   // (a guest cannot say what only the host decides)
    const body = { ...b, w: se.w };
    delete body.to;
    if (!glFxToHost(b)) for (const o of others(se)) await toSess(o, 'gl:fx', body);   // (a claim or a poke goes to the host alone)
    tell({ k: 'fx', ...body });
  }
  /** Where a guest's companion is (2.32): checked against the table (a guest has no pack), told to everyone else and to the host's page. Nothing changes in the garden. */
  async function onPp(msg, f, se) {
    const { s, q, ...b } = msg.b;
    if (glPpOk(b, false)) { refuse('pp'); return; }
    const body = { ...b, w: se.w };
    for (const o of others(se)) await toSess(o, 'gl:pp', body);
    tell({ k: 'pp', ...body });
  }
  /** A guest's word about a trade (2.29): the level, then the tables, then the host's page, which is the referee. Nobody else hears it: the page answers each person for themselves, so no guest learns another's friend id. */
  async function onTr(msg, f, se, perm) {
    const { s, q, ...b } = msg.b;
    if (!glAtLeast(perm.lv, GL_TRADE.lv)) { refuse('level'); await toSess(se, 'gl:tr', { w: 0, t: b.t, e: 'x', why: 'level' }); return; }
    const why = glTradeOk(b, false);
    if (why) { refuse('trade'); if (why === 'item' || why === 'rows') await toSess(se, 'gl:tr', { w: 0, t: b.t, e: 'x', why: 'item' }); return; }
    tell({ ...b, k: 'tr', f: f.id, w: se.w, lv: perm.lv });
  }
  async function onDo(msg, f, se, perm) {
    const b = msg.b;
    const why = glMayDo(perm.lv, b.t) || glIntentOk(b);
    if (why) {
      refuse(why === 'level' ? 'level' : 'intent');
      await toSess(se, 'gl:res', { i: b.i, w: se.w, t: b.t, ok: false, why });
      return;
    }
    const { s, q, ...clean } = b;
    tell({ ...clean, ik: clean.k, k: 'do', f: f.id, w: se.w, touch: perm.touch === true, share: perm.share, lv: perm.lv, n: se.name });   // (ik: a gift's kind of thing; k says what this event is)
  }
  async function onPing(msg, f, se) { await toSess(se, 'gl:ping', {}); }
  async function onBye(msg, f) {
    const b = msg.b;
    const se = host.sess.get(f.id);
    if (se && b.s === se.s) { await endSession(f.id, null); return; }
    // (the room can close a moment before its last message is opened: a goodbye still says why)
    if (visit && visit.fid === f.id && b.why === 'again') { if (b.s === visit.s && visit.state === 'live') { visit.ticket = null; await stopVisitRoad(); startResume(visit); } return; }   // (their app does not know this session: knock again, and nobody on this screen goes anywhere)
    if (visit && visit.fid === f.id && b.s && (b.s === visit.s || b.s === visit.closedS)) {
      endResume(visit);
      await stopVisitRoad();
      visit.s = null; visit.state = 'look'; visit.why = b.why === 'home' ? 'home' : b.why === 'closed' ? 'closed' : b.why === 'budget' ? 'budget' : 'away'; visit.lv = 'none';
      visit.nextKnock = b.why === 'home' ? Infinity : b.why === 'budget' ? now() + 3600000 : now() + 30000;
      tell({ k: 'state', ...visitView() });
    }
  }
  async function checkSessions() {
    const fr = engine();
    if (!fr || (!host.sess.size && !host.tickets.size && !visit)) return;
    for (const id of [...host.sess.keys()]) { const f = await fr.friend(id).catch(() => null); if (!f || f.status !== 'friend') await endSession(id, 'home'); }
    for (const id of [...host.tickets.keys()]) { const f = await fr.friend(id).catch(() => null); if (!f || f.status !== 'friend') kickTicket(id); }
    if (visit) { const f = await fr.friend(visit.fid).catch(() => null); if (!f || f.status !== 'friend') { endResume(visit); await stopVisitRoad(); visit = null; tell({ k: 'state', visit: null }); } }
  }
  /** One person's visit is over. why: 'home' they were sent home, 'closed', 'away', 'budget', or null (they left). Their ticket is over with it: a socket they keep open holds no place. */
  async function endSession(id, why) {
    const se = host.sess.get(id);
    if (!se) return;
    host.sess.delete(id);
    if (why) { try { await out(id, 'gl:bye', { s: se.s, why }); } catch { /* live: never retried */ } }
    kickTicket(id);
    if (se.joined) { for (const o of others(se)) { try { await toSess(o, 'gl:who', whoBody(se, false)); } catch { /* live */ } } tell({ k: 'leave', f: id, w: se.w, why: why || 'left' }); }
    if (!host.sess.size) closeRoom();
  }
  function closeRoom() { clearTimeout(host.againT); host.againT = 0; if (host.link) { const l = host.link; host.link = null; try { l.close(); } catch { /* gone */ } } host.nonce = null; host.roomId = null; host.peers.clear(); host.tickets.clear(); host.byIid.clear(); }
  function closeRoomRoads(why) {
    closeRoom();
    if (visit && (visit.link || visit.resume)) { endResume(visit); stopVisitRoad().catch(() => {}); visit.s = null; visit.state = 'look'; visit.why = why === 'budget' ? 'budget' : 'rest'; visit.nextKnock = budget.restUntil; tell({ k: 'state', ...visitView() }); }
    tell({ k: 'budget', mode: mode(), rest: true });
  }

  // ─── The visitor's side ──────────────────────────────────────────────────
  async function knock() {
    if (!visit) return;
    const v = visit;
    v.tries = (v.tries || 0) + 1; v.lastKnock = now();
    if (!v.signer) v.signer = await newSigner();   // the key the room will know me by, for this visit only
    wakeRoad();   // (my own live connection may be down: their answer would then wait for the next read of my mailbox)
    try {
      const r = await out(v.fid, 'gl:knock', { v: GL_V, k: v.signer.key });
      // A knock that did not leave says so, instead of "no answer" (sendLive: failed / why). A knock that left clears it.
      v.unsent = r && !(r.sent > 0) && (r.failed > 0 || r.why) ? (r.why || 'post') : '';
    } catch { v.unsent = 'post'; }
  }
  /** Someone is waiting at a gate here (a host at home, a visitor who knocked): see to it that a knock or its answer can reach this computer now. */
  function wakeRoad() {
    const fr = engine();
    if (fr && fr.liveLink && typeof fr.liveLink.wake === 'function') Promise.resolve(fr.liveLink.wake()).catch(() => {});
  }
  async function onHi(msg, f) {
    const v = visit;
    if (!v || v.fid !== f.id || msg.b.v > GL_V || v.opening) return;   // one try at a time: a host cannot hold this up by saying hello again
    v.opening = true;
    try {
      // the same session: a repeated hello, or new tickets for a visit that is going on. Nothing happens to the visit
      if (v.state === 'live' && v.s === msg.b.s) { v.lv = msg.b.lv; v.touch = msg.b.touch === true; if (msg.b.r) v.ticket = msg.b.r; if (v.resume) await resumeTry(v); return; }
      await enterVisit(v, msg.b, f);
    } finally { v.opening = false; }
  }
  /** Dial the room with the ticket I hold. Throws when it does not take me. */
  async function dialRoom(v) {
    const fr = engine(), route = await fr.liveLink.routeOf(v.fid), t = v.ticket;
    if (!route || !route.origin || !route.ed || !v.signer || !t) throw Object.assign(new Error('no way there'), { why: 'route' });
    const id = await roomIdOf(route.ed, t.n);
    let link = null;
    link = await openRoomLink({
      origin: route.origin, signer: v.signer, id, auth: { host: route.ed, nonce: t.n, ticket: t.t, exp: t.e },
      onEnv: (env) => fr.receive(env, 'room', v.fid), onSent: spend,   // (only the host sends down this socket: anything else is not opened)
      onClosed: (code, why) => { if (visit === v && link && v.link === link) { v.link = null; roadDown(v, code, why); } },   // (one I closed or replaced says nothing about the visit)
    });
    if (visit !== v) { link.close(); return false; }
    await stopVisitRoad();
    v.link = link; v.road = 'relay';
    return true;
  }
  /** The socket went while I was in their garden. Being sent home or out of allowance is the end of it; anything else is a dropped connection, and I go on where I was. */
  function roadDown(v, code, why) {
    if (v.state !== 'live') return;
    if (why === 'kick' || code === 4429) {
      endResume(v);
      v.closedS = v.s; v.s = null; v.state = 'look'; v.lv = 'none'; v.why = why === 'kick' ? 'home' : 'budget';
      v.nextKnock = why === 'kick' ? Infinity : now() + 3600000;
      tell({ k: 'state', ...visitView() });
      return;
    }
    startResume(v);
  }
  /**
   * A brief drop should not be seen: the page keeps everyone on screen ('live', why 'resume'), this dials again with the same ticket, and when it is back asks for what it missed (the same `gl:me`).
   * A ticket that ran out or a room that went gets a knock: the host keeps the session for the same visit and sends new tickets. Only after RESUME_MS does it say the connection was lost.
   */
  function startResume(v) {
    if (v.resume || v.state !== 'live') return;
    v.resume = { at: now(), n: 0, t: 0, knockAt: 0 };
    stats.drops = (stats.drops || 0) + 1;
    v.why = 'resume';
    tell({ k: 'state', ...visitView() });
    wakeRoad();
    resumeLater(v);
  }
  function endResume(v) { if (v && v.resume) { clearTimeout(v.resume.t); v.resume = null; } }
  function resumeLater(v) {
    const R = v.resume; if (!R) return;
    clearTimeout(R.t);
    R.t = setTimeout(() => { R.t = 0; resumeTry(v).catch(() => {}); }, RESUME_GAPS[Math.min(R.n, RESUME_GAPS.length - 1)]);
    if (R.t.unref) R.t.unref();
  }
  async function resumeTry(v) {
    const R = v.resume;
    if (!R || visit !== v || v.state !== 'live' || R.busy) return;
    R.busy = true;
    try {
      R.n += 1;
      const fr = engine(), t = now();
      if (t - R.at > RESUME_MS) { endResume(v); await stopVisitRoad(); v.closedS = v.s; v.s = null; v.state = 'look'; v.why = 'lost'; v.nextKnock = t; tell({ k: 'state', ...visitView() }); return; }
      const direct = !!(fr && fr.liveLink && fr.liveLink.isDirect(v.fid));
      let back = direct, dead = false;
      if (!back && v.ticket && v.ticket.e > t + 5000) {
        try { back = await dialRoom(v); }
        catch (e) {
          dead = !!e && (e.why === 'forbidden' || e.why === 'not_member' || e.status === 403);   // (the room is someone else's now, or this key is banned: only the host can say)
          if (e && (e.status === 503 || (e.status === 429 && !e.why && !(e.retryAfter > 0 && e.retryAfter <= 30)))) { endResume(v); rest('relay'); return; }
        }
        if (visit !== v) return;
      }
      if (v.resume !== R) return;
      if (back) {
        endResume(v);
        v.road = direct ? 'direct' : 'relay'; v.why = ''; v.lastIn = now(); v.lastPing = 0;
        stats.resumed = (stats.resumed || 0) + 1;
        tell({ k: 'state', ...visitView() });
        await sendVisit('me', { ...(v.look || {}) });   // the same look: who is here and the whole garden again
        return;
      }
      if ((dead || !v.ticket || v.ticket.e <= t + 5000 || R.n >= RESUME_KNOCK_TRY) && t - R.knockAt >= RESUME_KNOCK_MS) { R.knockAt = t; await knock(); }
      resumeLater(v);
    } finally { R.busy = false; }
  }
  async function enterVisit(v, b, f) {
    endResume(v);
    // (the session I had before a long drop, which the host kept: its counters go on, or everything I said would look like a replay)
    const same = b.s === v.s || b.s === v.closedS;
    if (!same) { v.q = 0; v.inQ = 0; v.gen = (v.gen || 0) + 1; }
    v.s = b.s; v.lv = b.lv; v.w = b.w; v.touch = b.touch === true; v.snap = null;
    v.lastIn = now();
    await stopVisitRoad();
    const fr = engine();
    const direct = !!(fr.liveLink && fr.liveLink.isDirect(f.id));
    const look = (why, next) => { v.s = null; v.state = 'look'; v.why = why; if (next) v.nextKnock = next; if (visit === v) tell({ k: 'state', ...visitView() }); };
    if (!direct) {
      await loadBudget();
      if (resting()) { look(mode() === 'over' ? 'budget' : 'rest', budget.restUntil); return; }
      if (!b.r) { look('quiet', now() + 5000); return; }   // (they saw a direct link that I do not: it is coming up or going down, and the next knock settles it)
      const route = await fr.liveLink.routeOf(f.id);
      if (!route || !route.origin || !route.ed || !v.signer) { look('road'); return; }
      v.ticket = b.r;
      try {
        if (!await dialRoom(v)) return;
      } catch (e) {
        if (e && (e.status === 503 || (e.status === 429 && !e.why && !(e.retryAfter > 0 && e.retryAfter <= 30)))) rest('relay');   // (a room that refused me, full or banned, says nothing about the relay)
        look('road', now() + 60000);
        return;
      }
    } else v.road = 'direct';
    if (visit !== v) return;
    v.state = 'live'; v.why = '';
    tell({ k: 'state', ...visitView() });
    await sendVisit('me', { ...(v.look || {}) });
  }
  async function onNo(msg, f) {
    if (!visit || visit.fid !== f.id || (visit.state === 'live' && !visit.resume)) return;
    endResume(visit); await stopVisitRoad();
    visit.s = null; visit.state = 'look'; visit.why = msg.b.why === 'old' && msg.b.v > GL_V ? 'newer' : msg.b.why; visit.lv = 'none';
    visit.nextKnock = msg.b.why === 'budget' ? now() + 3600000 : msg.b.why === 'ask' || msg.b.why === 'closed' || msg.b.why === 'away' ? now() + 60000 : now() + 120000;
    tell({ k: 'state', ...visitView() });
  }
  /** A message from the garden I am visiting. */
  async function fromHost(msg, f) {
    const b = msg.b;
    if (!visit || visit.fid !== f.id || b.s !== visit.s) { refuse('no-session'); if (!visit || visit.fid !== f.id) await staleSession(f, b.s); return; }
    if (!(b.q > visit.inQ)) { refuse('replay'); return; }
    visit.inQ = b.q; visit.lastIn = now();
    const k = msg.k.slice(3);
    if (k === 'ping') return;
    if (k === 'lv') { visit.lv = b.lv; visit.touch = b.touch === true; tell({ k: 'state', ...visitView() }); return; }
    if (k === 'snap') {
      const sn = visit.snap && visit.snap.of === b.of ? visit.snap : { of: b.of, parts: [] };
      sn.parts[b.n] = b.d;
      visit.snap = sn;
      if (sn.parts.filter(x => typeof x === 'string').length === b.of) {
        visit.snap = null;
        const whole = sn.parts.join('');
        if (whole.length > SNAP_MAX * 1.4) { refuse('snap'); return; }
        let o = null;
        try { o = JSON.parse(Buffer.from(whole, 'base64url').toString('utf8')); } catch { refuse('snap'); return; }
        const by = cleanBy(o && o.by);
        const clean = isObj(o) ? checkBody('garden', o.g) : undefined;
        const snap = clean === undefined ? null : gardenSnapshotClean(clean);
        if (!snap) { refuse('snap'); return; }
        tell({ k: 'snap', f: f.id, snap, by });
      }
      return;
    }
    const { s, q, ...rest } = b;
    tell({ ...rest, ik: rest.k, k });
  }
  /** "Who planted what" in a snapshot: {n: [names], r: [[kind 'p'|'d', x, y, name index]]}. */
  function cleanBy(by) {
    if (!isObj(by) || !Array.isArray(by.n) || !Array.isArray(by.r)) return { n: [], r: [] };
    const n = by.n.slice(0, BY_NAMES_MAX).map(x => cleanLine(String(x || ''), 40));
    const r = [];
    for (const row of by.r.slice(0, 900)) { if (Array.isArray(row) && (row[0] === 'p' || row[0] === 'd') && Number.isInteger(row[1]) && Number.isInteger(row[2]) && Number.isInteger(row[3]) && row[3] >= 0 && row[3] < n.length) r.push([row[0], row[1], row[2], row[3]]); }
    return { n, r };
  }
  async function stopVisitRoad() { if (visit && visit.link) { const l = visit.link; visit.link = null; try { l.close(); } catch { /* gone */ } } }
  function visitView() {
    if (!visit) return { visit: null };
    return { visit: { ver: ++viewVer, boot: BOOT, gen: visit.gen || 0, f: visit.fid, state: visit.state, why: visit.why || '', lv: visit.lv || 'none', w: visit.w ?? null, road: visit.state === 'live' ? visit.road : null, touch: visit.touch === true, mode: mode() } };
  }
  async function sendVisit(k, body) {
    if (!visit || visit.state !== 'live' || !visit.s) throw fail('NOT_LIVE', 'You are not in their garden just now.', 409);
    visit.q = (visit.q || 0) + 1; visit.lastOut = now();
    const v = visit, m = { s: v.s, q: v.q, ...body };
    return inTurn(v, () => out(v.fid, 'gl:' + k, m));
  }

  // ─── What the pages ask for ──────────────────────────────────────────────
  const cleanLook = (look) => {
    const out_ = {};
    if (isObj(look)) {
      const c = checkBody('gl:me', { s: 'x', q: 1, ...(look.a ? { a: look.a } : {}), ...(look.pet ? { pet: look.pet } : {}) });
      if (c && c.a) out_.a = c.a;
      if (c && c.pet) out_.pet = c.pet;
      if (Number.isFinite(look.x) && Number.isFinite(look.y) && look.x >= 0 && look.x <= 64 && look.y >= 0 && look.y <= 64) { out_.x = look.x; out_.y = look.y; }
    }
    return out_;
  };
  /** The page says where it is. role 'host': on my own garden. role 'visit': on friend `f`'s visit. A page that stops saying so is dropped by the tick. */
  async function here({ role, on, f, look, name, tab, hidden }) {
    attach(); startTick();
    await load(); await loadBudget();
    if (role === 'host') {
      const lk = cleanLook(look), me = typeof tab === 'string' ? tab.slice(0, 24) : '';
      const lead = me === host.tab, free = !host.tab || now() - host.tabBeat > LEAD_MS;
      if (on === 'release') { if (lead) { host.tab = ''; host.tabBeat = 0; host.hidden = false; } return { host: hostView() }; }   // (a reload: the visit goes on, whoever says "here" next is the host)
      if (!on) { if (lead || !host.tab) { host.tab = ''; host.tabBeat = 0; await hostLeave('away'); } return { host: hostView(), lead }; }
      if (!lead && !free) return { host: hostView(), lead: false };
      host.tab = me; host.tabBeat = now();
      const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null), lookChanged = host.here && ((lk.a && !same(lk.a, host.a)) || (lk.pet && !same(lk.pet, host.pet)));
      host.here = true; host.beat = now(); host.hidden = hidden === true; host.name = cleanLine(String(name || ''), 40) || host.name || 'Host';
      if (!host.sess.size) wakeRoad();   // (at home with the gate open: a knock must be able to reach this computer, whatever state its live connection is in)
      if (lk.a) host.a = lk.a;
      if (lk.pet) host.pet = lk.pet;
      if (lk.x != null) { host.x = lk.x; host.y = lk.y; }
      // (2.28: a change of clothes or of pet while people are here: they see it now, not at their next visit)
      if (lookChanged) for (const se of [...host.sess.values()]) if (se.joined) await toSess(se, 'gl:who', { w: 0, n: host.name || 'Host', ...(host.a ? { a: host.a } : {}), ...(host.pet ? { pet: host.pet } : {}), lv: 'play', on: true }).catch(() => {});
      return { host: hostView(), lead: true };
    }
    if (role === 'visit') {
      if (!on) { await visitLeave(); return visitView(); }
      if (!fid(f)) throw fail('NOT_FOUND', 'That friend is not here any more.');
      const fr = engine();
      const friend = fr ? await fr.friend(f) : null;
      if (!friend || friend.status !== 'friend') throw fail('NOT_FOUND', 'That friend is not here any more.');
      if (visit && visit.fid !== f) await visitLeave();
      const lk = cleanLook(look);
      if (!visit && on === 'gone') return visitView();
      if (!visit) { visit = { fid: f, s: null, q: 0, inQ: 0, state: 'knocking', why: '', lv: 'none', beat: now(), tries: 0, look: lk }; knock().catch(() => {}); }
      else if (on === 'gone') { visit.hidden = false; visit.beat = Math.min(visit.beat, now() - BEAT_MS + BEAT_GONE_MS); }   // (the page is going away: unless it comes straight back, a reload, the visit is over)
      else { visit.beat = now(); visit.hidden = hidden === true; if (Object.keys(lk).length) visit.look = lk; if (visit.state === 'look' && on === 'again') { visit.state = 'knocking'; visit.tries = 0; visit.rounds = 0; visit.nextKnock = 0; knock().catch(() => {}); } }
      return visitView();
    }
    throw fail('BAD', 'That is not a place in a garden.');
  }
  async function hostLeave(why) {
    host.here = false;
    for (const id of [...host.sess.keys()]) await endSession(id, why);
    closeRoom();
    tell({ k: 'host', ...hostView() });
  }
  async function visitLeave() {
    if (!visit) return;
    const v = visit;
    endResume(v);
    if (v.state === 'live' && v.s) { try { await out(v.fid, 'gl:bye', { s: v.s, why: 'left' }); } catch { /* live */ } }
    await stopVisitRoad();
    visit = null;
  }
  function hostView() {
    return {
      here: host.here, road: host.link && host.link.isOpen() ? 'relay' : null, note: host.roadNote || '', mode: mode(),
      people: [...host.sess.values()].filter(x => x.joined).map(x => ({ f: x.fid, w: x.w, n: x.name, lv: x.lv, a: x.a, pet: x.pet, x: x.x, y: x.y })),
      knocks: [...host.knocks.entries()].filter(([, t]) => now() - t < 5 * 60000).map(([id]) => id),
      asks: doc ? Object.entries(doc.asks).filter(([, t]) => now() - t < 7 * 86400000).map(([id]) => id) : [],
    };
  }
  /** Everything the page wants to know (never a key, never a token). */
  async function view() {
    attach();
    const d = await refresh(); await loadBudget();
    return { on: !!engine(), v: GL_V, open: d.open, groupLook: d.groupLook, queueOn: d.queueOn, perms: d.perms, theirs: d.theirs, queue: await queueView(d), posts: Object.entries(d.posts).filter(([, p]) => !p.applied).map(([id, p]) => ({ id, ...p })), host: hostView(), ...visitView(), budget: { sent: budget.day === dayNow(now()) ? roomTotal() : 0, day: GL_BUDGET.day, thin: GL_BUDGET.thin, mode: mode(), resting: resting() }, stats: { ...stats } };
  }
  async function setPerm({ id, lv, touch, share }) {
    const fr = engine();
    if (!fid(id) || !fr) throw fail('NOT_FOUND', 'That friend is not here any more.');
    const f = await fr.friend(id);
    if (!f || f.status !== 'friend') throw fail('NOT_FOUND', 'That friend is not here any more.');
    if (lv !== undefined && !GL_LEVELS.includes(lv)) throw fail('BAD', 'That is not a level.');
    if (share !== undefined && !GL_SHARES.includes(share)) throw fail('BAD', 'That is not a way to share.');
    let wasLv = 'none';
    const d = await save((cur) => {
      const p = cur.perms[id] || { lv: 'none', touch: false, share: 'keeper' };
      wasLv = p.lv;
      if (lv !== undefined) { p.lv = lv; delete cur.asks[id]; }
      if (typeof touch === 'boolean') p.touch = touch;
      if (share !== undefined) p.share = share;
      cur.perms[id] = p;
    });
    const se = host.sess.get(id);
    if (se) {
      const p = d.perms[id];
      if (p.lv === 'none') await endSession(id, 'home');
      else { se.lv = p.lv; se.touch = p.touch; await toSess(se, 'gl:lv', { lv: p.lv, ...(p.touch ? { touch: true } : {}) }); for (const o of others(se)) await toSess(o, 'gl:who', whoBody(se)); }
    }
    if (d.perms[id].lv === 'none') kickTicket(id);
    host.knocks.delete(id);
    if (d.perms[id].lv !== wasLv) { await dropQueue(); tellTheirs(id, d.perms[id].lv, queueOpen(d)); }
    tell({ k: 'host', ...hostView() });
    return { perms: d.perms };
  }
  async function setPrefs({ open, groupLook, queue }) {
    const was = doc ? queueOpen(doc) : true;
    const d = await save((cur) => {
      if (typeof open === 'boolean') cur.open = open;
      if (typeof groupLook === 'boolean') cur.groupLook = groupLook;
      if (typeof queue === 'boolean') cur.queueOn = queue;
    });
    if (open === false) { for (const id of [...host.sess.keys()]) await endSession(id, 'closed'); }
    if (queueOpen(d) !== was) { await dropQueue(); for (const [id, p] of Object.entries(d.perms)) if (p.lv === 'help' || p.lv === 'play') tellTheirs(id, p.lv, queueOpen(d)); }
    tell({ k: 'host', ...hostView() });
    return { open: d.open, groupLook: d.groupLook, queueOn: d.queueOn };
  }
  const sessFor = (to) => {
    if (to === 'all') return [...host.sess.values()].filter(x => x.joined);
    const se = host.sess.get(to);
    return se ? [se] : [];
  };
  /** The host's page: tell one person or everyone there. */
  async function hostSend({ to = 'all', k, body, tab }) {
    if (!host.here) throw fail('NOT_LIVE', 'You are not in your garden just now.', 409);
    if (typeof tab === 'string' && tab !== host.tab) throw fail('NOT_HOST', 'Your garden is hosted in another tab.', 409);   // one tab speaks for the garden
    const list = sessFor(to);
    if (k === 'go' && isObj(body) && Number.isFinite(body.x) && !body.w) { host.x = body.x; host.y = body.y; }
    if (k === 'snap') {
      // the page's whole garden, checked and cut into pieces
      if (!isObj(body.g) || checkBody('garden', body.g) === undefined) throw fail('BAD', 'That garden does not fit its shape.');
      const by = cleanBy(body.by);
      const text = Buffer.from(JSON.stringify({ g: body.g, by }), 'utf8').toString('base64url');
      if (text.length > SNAP_MAX * 1.4) throw fail('BAD', 'That garden is too big to send.');
      const of = Math.max(1, Math.ceil(text.length / SNAP_CHUNK));
      for (const se of list) for (let n = 0; n < of; n++) await toSess(se, 'gl:snap', { n, of, d: text.slice(n * SNAP_CHUNK, (n + 1) * SNAP_CHUNK) });
      return { n: list.length, of };
    }
    if (!['go', 'em', 'res', 'd', 'fx', 'cr', 'fs', 'sum', 'tr', 'goal', 'pp'].includes(k) || !isObj(body)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'em' && !emOk(body.c, body.e)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'fx' && glFxOk(body)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'tr' && glTradeOk(body, true)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'fs' && !(Array.isArray(body.l) && body.l.length <= 20)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'cr' && !(Array.isArray(body.l) && body.l.length <= 8)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'goal' && glGoalOk(body)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'pp' && glPpOk(body, true)) throw fail('BAD', 'That is not something a garden says.');
    const b = k === 'go' || k === 'em' || k === 'fx' || k === 'tr' || k === 'pp' ? { w: 0, ...body } : body;
    for (const se of list) await toSess(se, 'gl:' + k, b);
    return { n: list.length };
  }
  async function visitSend({ k, body }) {
    if (!['go', 'em', 'do', 'me', 'fx', 'tr', 'pp'].includes(k) || !isObj(body)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'fx' && (glFxOk(body) || glFxHostOnly(body))) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'tr' && glTradeOk(body, false)) throw fail('BAD', 'That is not something a garden says.');
    if (k === 'pp' && glPpOk(body, false)) throw fail('BAD', 'That is not something a garden says.');
    await sendVisit(k, body);
    return { sent: true };
  }
  /** A durable post (a crop, something handed back): queued like any friend message until it arrives. */
  async function post({ to, id, why, i, d, items }) {
    const fr = engine();
    if (!fr || !fid(to) || !SAFE_ID_RE.test(id || '')) throw fail('BAD', 'That post has no address.');
    const body = { id, why, ...(i ? { i } : {}), ...(d ? { d } : {}), ...(items ? { items } : {}) };
    if (glPostOk(body)) throw fail('BAD', 'That post does not fit the tables.');
    const r = await fr.send(to, 'gl:post', body);
    stats.out['gl:post'] = (stats.out['gl:post'] || 0) + 1;
    return { sent: r ? r.sent : 0, queued: r ? r.queued : 0, gone: !r || !r.id };
  }
  async function onPost(msg, f) {
    const b = msg.b;
    if (glPostOk(b) || String(b.id).length > 54) { refuse('post'); return; }
    const key = f.id.slice(0, 8) + '_' + b.id;   // each friend's own ids: one friend cannot use up another's, and the same post twice is one
    let took = false;
    await save((cur) => {
      if (Object.hasOwn(cur.posts, key)) return false;
      const today = dayNow(now()), mine = Object.values(cur.posts).filter(p => p.f === f.id);
      if (mine.filter(p => !p.applied).length >= POSTS_WAITING || mine.filter(p => dayNow(p.at || 0) === today).length >= GL_CAPS.postsPerFriend) { refuse('post-cap'); return false; }
      cur.posts[key] = { f: f.id, why: b.why, ...(b.i ? { i: b.i } : {}), ...(b.d ? { d: b.d } : {}), ...(b.items ? { items: b.items } : {}), at: now() };
      took = true;
      return true;
    });
    if (took) tell({ k: 'post', id: key });
  }
  async function applied({ ids }) {
    const list = (Array.isArray(ids) ? ids : []).filter(x => typeof x === 'string' && SAFE_ID_RE.test(x) && !FORBIDDEN.has(x)).slice(0, 200);
    await save((cur) => {
      let n = 0;
      for (const id of list) if (Object.hasOwn(cur.posts, id) && !cur.posts[id].applied) { cur.posts[id].applied = now(); n++; }
      // what was applied long ago goes (the ledger keeps it from applying twice)
      for (const [k, p] of Object.entries(cur.posts)) if (p.applied && now() - p.applied > 30 * 86400000) { delete cur.posts[k]; n++; }
      return n > 0;
    });
    return { n: list.length };
  }
  // ─── What waits for me ───────────────────────────────────────────────────
  // A friend with Help or Play did something on the saved copy while I was out. It waits here, by id, in the order it came. The checks are the ones every
  // intent has: the level they have now (permOf), the tables (glMayDo, glIntentOk), and when I open my garden my page runs each through _glhIntent with the same id.
  // What cannot wait any more goes back by the ordinary post (gl:post why: back): they lose nothing, once.
  const queueOpen = (d) => d.queueOn && d.open;
  const backPost = (to, i) => post({ to, id: 'b' + i + '0', why: 'back', i }).catch(() => { refuse('queue-back'); });
  const told = new Map();
  /** Tell a friend what they may do in my garden (by the mailbox, so they know when I am out). It only lets them try: I check every time. */
  function tellTheirs(id, lv, q) {
    const key = lv + '|' + (q ? 1 : 0);
    if (told.get(id) === key) return;
    told.set(id, key);
    out(id, 'gl:perm', { lv, q: !!q }).catch(() => { told.delete(id); });
  }
  async function onTheirs(msg, f) {
    await save((cur) => {
      const w = cur.theirs[f.id];
      if (w && w.lv === msg.b.lv && w.q === (msg.b.q !== false)) return false;
      cur.theirs[f.id] = { lv: msg.b.lv, q: msg.b.q !== false, at: now() };
      return true;
    });
    tell({ k: 'theirs', f: f.id });
  }
  async function onQueue(msg, f) {
    const b = msg.b, d = await refresh(), perm = await permOf(f);
    const old = now() - b.at > GL_QUEUE.days * 86400000 || b.at > now() + 86400000;
    const why = !queueOpen(d) ? 'off' : glMayDo(perm.lv, b.t) || glIntentOk(b) || (old ? 'old' : '');
    if (why) { refuse('queue-' + (why === 'level' ? 'level' : 'other')); await backPost(f.id, b.i); return; }
    let took = false, over = false;
    await save((cur) => {
      const list = cur.queue[f.id] || [], today = dayNow(now()), day = cur.qd[f.id] && cur.qd[f.id].d === today ? cur.qd[f.id].n : 0;
      if (list.some(e => e.i === b.i)) return false;
      if (list.length >= GL_QUEUE.perFriend || day >= GL_QUEUE.perDay) { over = true; return false; }
      list.push({ i: b.i, t: b.t, p: b.p, x: b.x, y: b.y, ...(b.r != null ? { r: b.r } : {}), at: b.at, got: now() });
      cur.queue[f.id] = list; cur.qd[f.id] = { d: today, n: day + 1 };
      took = true;
      return true;
    });
    if (over) { refuse('queue-cap'); await backPost(f.id, b.i); }
    if (took) tell({ k: 'queue', f: f.id });
  }
  /** What the host's page runs, with the level each friend has now (the gate shut or the switch off counts as none). */
  async function queueView(d) {
    const fr = engine(), rows = [];
    for (const [id, list] of Object.entries(d.queue)) {
      const f = fr ? await fr.friend(id).catch(() => null) : null;
      if (!f || f.status !== 'friend') continue;
      const p = await permOf({ id }), lv = queueOpen(d) ? p.lv : 'none';
      for (const e of list) rows.push({ f: id, ...e, lv, touch: p.touch === true, share: p.share });
    }
    return rows.sort((a, b) => a.at - b.at);
  }
  /** The page has saved what it did with these (done or refused). */
  async function queued({ ids }) {
    const list = (Array.isArray(ids) ? ids : []).filter(x => typeof x === 'string').slice(0, 400);
    await save((cur) => {
      let n = 0;
      for (const x of list) {
        const [f, i] = x.split('.');
        if (!fid(f) || !Object.hasOwn(cur.queue, f)) continue;
        const keep = cur.queue[f].filter(e => e.i !== i);
        n += cur.queue[f].length - keep.length;
        if (keep.length) cur.queue[f] = keep; else delete cur.queue[f];
      }
      return n > 0;
    });
    return { n: list.length };
  }
  /** What a lowered level, a shut gate or the switch has made impossible goes back now, rather than waiting to be refused. */
  async function dropQueue() {
    const gone = [];
    await save((cur) => {
      for (const [id, list] of Object.entries(cur.queue)) {
        const lv = queueOpen(cur) ? (cur.perms[id] ? cur.perms[id].lv : 'none') : 'none';
        const keep = list.filter(e => { if (!glMayDo(lv, e.t)) return true; gone.push([id, e.i]); return false; });
        if (keep.length) cur.queue[id] = keep; else delete cur.queue[id];
      }
      return gone.length > 0;
    });
    for (const [id, i] of gone) await backPost(id, i);
  }
  /** The visitor's page: this waits for them. */
  async function queueSend({ to, i, t, p, x, y, r, at }) {
    const fr = engine();
    if (!fr || !fid(to)) throw fail('BAD', 'That friend is not here any more.');
    const f = await fr.friend(to);
    if (!f || f.status !== 'friend') throw fail('NOT_FOUND', 'That friend is not here any more.');
    const body = { i, t, p, x, y, ...(Number.isInteger(r) ? { r } : {}), at: Math.floor(Number(at) || 0) };
    if (!GL_QUEUE.acts.includes(t) || glIntentOk(body)) throw fail('BAD', 'That does not fit the tables.');
    const res = await fr.send(to, 'gl:q', body);
    stats.out['gl:q'] = (stats.out['gl:q'] || 0) + 1;
    return { sent: !!(res && res.id), queued: res ? res.queued : 0 };
  }
  /** One tap: "may I do more?" It shows at their gate, now or when they are next there. */
  async function ask({ to }) {
    const fr = engine();
    if (!fr || !fid(to)) throw fail('BAD', 'That friend is not here any more.');
    const res = await fr.send(to, 'gl:ask', { v: GL_V });
    return { sent: !!(res && res.id) };
  }
  async function onAsk(msg, f) {
    let fresh = false;
    await save((cur) => {
      if (now() - (cur.asks[f.id] || 0) < 3600000) return false;
      cur.asks[f.id] = now(); fresh = true;
      return true;
    });
    if (fresh) tell({ k: 'knock', f: f.id });
  }

  /** Send someone home: their visit ends and their level goes to none (one tap on the host's side). */
  async function sendHome({ id }) { return setPerm({ id, lv: 'none' }); }

  async function forget(id) {
    if (!fid(id)) return;
    if (host.sess.has(id)) await endSession(id, 'home'); else kickTicket(id);
    if (visit && visit.fid === id) { endResume(visit); await stopVisitRoad(); visit = null; tell({ k: 'state', visit: null }); }
    host.knocks.delete(id);
    await save((cur) => {
      delete cur.perms[id]; delete cur.queue[id]; delete cur.qd[id]; delete cur.asks[id]; delete cur.theirs[id];   // (what waited for me is dropped; their page gives it back when it sees we are no longer friends)
      for (const [k, p] of Object.entries(cur.posts)) if (p.f === id) delete cur.posts[k];
    });
  }
  async function moved(from, to) {
    if (!fid(from) || !fid(to) || from === to) return;
    await save((cur) => {
      if (cur.perms[from]) { if (!cur.perms[to]) cur.perms[to] = cur.perms[from]; delete cur.perms[from]; }
      for (const p of Object.values(cur.posts)) if (p.f === from) p.f = to;
      if (cur.queue[from]) { cur.queue[to] = (cur.queue[to] || []).concat(cur.queue[from]); delete cur.queue[from]; }
      if (cur.theirs[from]) { cur.theirs[to] = cur.theirs[from]; delete cur.theirs[from]; }
      delete cur.asks[from]; delete cur.qd[from];
    });
    if (host.sess.has(from)) await endSession(from, 'away');
  }

  // ─── The tick: only while someone is in a garden ─────────────────────────
  let timer = null, lastBudgetWrite = 0, quietTicks = 0;
  function startTick() {
    if (timer) return;
    timer = setInterval(() => { tick().catch(() => {}); }, 3000);
    if (timer.unref) timer.unref();
  }
  let lastTick = 0;
  async function tick() {
    const t = now();
    // This computer slept (a tick this late). Everybody here is as quiet as I was, and the sockets may be dead without saying so: nobody is counted as gone for that. They get a fresh look.
    if (lastTick && t - lastTick > SLEPT_MS) {
      stats.woke = (stats.woke || 0) + 1;
      host.beat = t; if (visit) { visit.beat = t; visit.lastIn = t; visit.lastPing = 0; }
      for (const se of host.sess.values()) se.lastIn = t;
      if (host.link) host.link.check();
      if (visit && visit.link) visit.link.check();
    }
    lastTick = t;
    // (the levels file is read again every 3 seconds while someone is here; with nobody but you in your garden a look every 15 seconds is enough: every knock and every message reads it again anyway)
    if (host.sess.size || (host.here && ++quietTicks % 5 === 0)) await refresh().catch(() => {});
    if (host.here && !host.sess.size && quietTicks % 4 === 0) wakeRoad();   // (every 12 s at home with nobody in: reopen a dropped live connection and read the mailbox)
    if (host.here && t - host.beat > (host.hidden ? BEAT_HIDDEN_MS : BEAT_MS)) { host.tab = ''; await hostLeave('away'); }
    for (const [id, se] of [...host.sess]) if (t - (se.lastIn || 0) > SESSION_MS) await endSession(id, null);
    if (visit) {
      if (t - visit.beat > (visit.hidden ? BEAT_HIDDEN_MS : BEAT_MS)) await visitLeave();
      else if (visit.state === 'knocking') {
        wakeRoad();   // (every tick while waiting for the answer: reopens my live connection if it dropped and reads my mailbox, at most every 4 s)
        if (t - (visit.lastKnock || 0) > 7000) {
          if (visit.tries >= 3) {
            // Nobody answered: the next round comes later each time (a relay may hold only so many messages from one person a day, and a knock is a message)
            const rounds = visit.rounds = (visit.rounds || 0) + 1, limited = visit.unsent === 'limit';
            visit.state = 'look'; visit.why = limited ? 'limit' : visit.unsent ? 'unsent' : 'quiet';
            visit.nextKnock = t + (limited ? 10 * 60000 : [90000, 180000, 360000, 720000][Math.min(rounds - 1, 3)]);
            tell({ k: 'state', ...visitView() });
          }
          else await knock();
        }
      } else if (visit.state === 'live') {
        const fr = engine(), direct = !!(fr && fr.liveLink && fr.liveLink.isDirect(visit.fid));
        if (visit.resume) { /* resumeTry is on it */ }
        else if (visit.road === 'direct' && !direct && !visit.link) { visit.ticket = null; startResume(visit); }   // (a direct link went: the relay's room is the other road)
        else if (t - (visit.lastIn || 0) > HOST_QUIET_MS) { await stopVisitRoad(); startResume(visit); }           // (not even an answer to a ping: their app or this road has gone)
        else if ((t - (visit.lastIn || 0) > PING_QUIET_MS || t - (visit.lastOut || 0) > PING_OUT_MS) && t - (visit.lastPing || 0) >= PING_GAP_MS) { visit.lastPing = t; try { await sendVisit('ping', {}); } catch { /* the next tick */ } }
      } else if (visit.state === 'look' && Number.isFinite(visit.nextKnock) && t > visit.nextKnock && !resting()) {
        visit.state = 'knocking'; visit.tries = 2; await knock();   // (a later round is one knock: the first round already knocked three times)
      }
    }
    if (budgetDirty && t - lastBudgetWrite > 60000) { budgetDirty = false; lastBudgetWrite = t; try { await writeJson(localFile, budget); } catch { /* the next one */ } }
    if (!host.here && !visit && !host.sess.size) { clearInterval(timer); timer = null; if (budgetDirty) { budgetDirty = false; try { await writeJson(localFile, budget); } catch { /* fine */ } } }
  }

  return { attach, view, here, setPerm, setPrefs, hostSend, visitSend, post, applied, sendHome, forget, queueSend, queued, ask, stats, file };
}
