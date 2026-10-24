// lib/friends/spaces.mjs - shared spaces between friends (2.17 "Together").
//
// A SPACE is a list, board, party, trip or shared house that two or more
// friends edit together: its tasks (with subtasks, comments, cheers and who
// accepted them), board columns, countdowns, split expenses, team quests,
// challenges, a feed, wishlists, accountability goals and the Plan together
// board. Every friend's computer keeps a copy; they merge exactly like the
// user's own devices do (lib/sync/model.mjs): one REGISTER per field, last
// writer wins by Hybrid Logical Clock (lib/sync/hlc.mjs), list items by id with
// fractional positions. captureFile/materializeFile/applyWrite do the work.
//
// Changes travel over the friends channel (docs/dev/FRIENDS.md section 8) as
// the kind 'space:<id>' with the body {v:1, t:'regs', d}: d is the JSON list
// [[path, reg]] in base64url (so the channel's text cleaning can never alter a
// value), at most CHUNK_BYTES per message (bodies are capped at 32 KB). Paths
// are RELATIVE to the space: a message can only ever name the space in its
// kind, and nothing outside it (never the person's own tasks, streams or
// settings, which this module cannot reach at all). {t:'hello', h} compares
// copies (anti-entropy), {t:'want'} asks for everything; 'together:live'
// carries cursors and other fleeting events (cleanLive).
//
// EVERYTHING FROM A FRIEND IS UNTRUSTED (the owner's rules, 24 Oct 2026):
//   - every write is checked against the allow-list below (parts, fields,
//     types, lengths); ids match ID_RE; __proto__/constructor/prototype never
//     pass (model.mjs segOk + our own check);
//   - only the space's members may write, checked by the sender's friend key;
//     authors alone edit their comments, feed lines, wishes and goals, what
//     a quest or challenge counts (and its days) and a time card's times; a map
//     entry such as a cheer or a vote is only ever the sender's own;
//   - per-message and per-minute caps (messages, registers, bytes), list caps
//     per space, and clocks more than MAX_AHEAD_MS in the future are refused,
//     so a friend cannot flood the store, the feed or the game;
//   - invitations wait for Join (status 'invited'); nothing runs by itself.
// The text in a space is never given to Claude, the AI helpers, connectors or
// the MCP (they read the state and their own files; this store is neither).
//
// Platform-agnostic: no node: imports. The route (server/routes/together.mjs)
// gives it a store {read(), write(obj)} and the friends channel.
//
// Stored as {v:1, spaces: {<id>: {regs: {<JSON path>: [h, v] | [h]}, me: {status, at, by}}}}
// (lib/sync/manifest.mjs '── together ──' syncs it between the user's own
// devices, register by register). This computer's clock lives in a local
// file the route keeps ({actor, last}).

import { SPEC, captureFile, materializeFile, applyWrite, newTree, walkRegs, hash } from '../sync/model.mjs';
import { createClock, isHlc, decodeHlc } from '../sync/hlc.mjs';
import { isPos } from '../sync/fracindex.mjs';

const { record, list, map } = SPEC;
const TOP = 'space';

export const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MMDD_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ICON_RE = /^[a-z0-9-]{1,32}$/;
const CUR_RE = /^[A-Z]{3}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

export const LIMITS = Object.freeze({
  regsPerMessage: 800, bytesPerMessage: 512 * 1024,
  messagesPerMinute: 120, regsPerMinute: 8000,
  liveBytes: 1024, livePerSecond: 25, livePerMinute: 600,
  pendingInvitesPerFriend: 10, spaces: 200,
  chunkBytes: 21000, helloEveryMs: 20 * 60 * 1000, resendGapMs: 10 * 60 * 1000,
});
/** The kinds this module speaks (server/routes/together.mjs defines their schemas with lib/friends/core.mjs). */
export const SPACE_KIND_PREFIX = 'space:';
export const LIVE_KIND = 'together:live';

// base64url without node: (the body field is plain [A-Za-z0-9_-]).
function b64e(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]*$/.test(str)) return null;
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch { return null; }
}
const MAX_AHEAD_MS = 10 * 60 * 1000;

/** How a space merges (model.mjs specs). */
export const SPACE_SPEC = record({
  meta: record(),
  members: map(record()),
  items: list({ subtasks: list(), comments: list(), cheers: map(), ack: map() }),
  columns: list(),
  countdowns: list(),
  expenses: list({ split: map() }),
  quests: list({ progress: map() }),
  challenges: list({ scores: map() }),
  feed: list({ cheers: map() }),
  wishlist: list(),
  goals: list({ checks: map(), nudges: map() }),
  plan: list({ votes: map() }),
  // ── garden-social ── (2.18) the co-op bed: one element per plant, each member's own last watering
  bed: list({ water: map() }),
  // ── end garden-social ──
});

// ─── The allow-list ────────────────────────────────────────────────────────
const s = (n) => (v) => typeof v === 'string' && v.length <= n;
const sn = (n) => (v) => v === null || (typeof v === 'string' && v.length <= n);
const idv = (v) => typeof v === 'string' && ID_RE.test(v);
const idn = (v) => v === null || idv(v);
const bool = (v) => typeof v === 'boolean';
const ms = (v) => Number.isInteger(v) && v >= 0 && v < 1e14;
const msn = (v) => v === null || ms(v);
const date = (v) => v === null || (typeof v === 'string' && DATE_RE.test(v));
const time = (v) => v === null || (typeof v === 'string' && TIME_RE.test(v));
const num = (a, b) => (v) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
const int = (a, b) => (v) => Number.isInteger(v) && v >= a && v <= b;
const en = (...vals) => (v) => vals.includes(v);
const color = (v) => v === null || (typeof v === 'string' && COLOR_RE.test(v));
const iconv = (v) => v === null || (typeof v === 'string' && (ICON_RE.test(v) || (v.length <= 8 && !/[<>&"'`\s]/.test(v))));
const cur = (v) => v === null || (typeof v === 'string' && CUR_RE.test(v));
const mmdd = (v) => v === null || (typeof v === 'string' && MMDD_RE.test(v));
const BASE = { id: idv, by: idv, at: ms };

export const KINDS = Object.freeze(['list', 'board', 'party', 'trip', 'house', 'pair']);
export const FEED_KINDS = Object.freeze(['done', 'cheer', 'join', 'quest', 'trophy', 'note', 'focus', 'goal', 'expense', 'plan']);

/**
 * PARTS: what a space may hold. kind 'record' (fields), 'members' (a map of
 * records keyed by friend), 'list' (items by id: fields, sub-lists, maps).
 *   author   every write to an element needs the element's author (its `by`)
 *   own      a map whose keys can only be the sender's own friend key
 *   mine     fields only the element's author may change
 */
const PARTS = Object.freeze({
  meta: { kind: 'record', fields: { name: s(80), kind: en(...KINDS), icon: iconv, color, about: s(500), owner: idv, created: ms, start: date, end: date, place: s(120), currency: cur } },
  members: { kind: 'members', fields: { name: s(80), role: en('owner', 'member'), at: ms, joined: msn, left: bool, removed: bool, birthday: mmdd, color } },
  items: {
    kind: 'list', max: 1500,
    fields: { ...BASE, title: s(300), notes: s(4000), due: date, time, status: en('todo', 'doing', 'done'), doneBy: idn, doneAt: msn, priority: en('p0', 'p1', 'p2', 'p3'), assignee: idn, coop: bool, column: idn, xp: int(0, 50) },
    lists: {
      subtasks: { max: 100, fields: { id: idv, title: s(200), done: bool } },
      comments: { max: 300, author: true, fields: { ...BASE, text: s(1000), edited: msn } },
    },
    maps: { cheers: { own: true, val: ms }, ack: { own: true, val: en('accepted', 'declined') } },
  },
  columns: { kind: 'list', max: 12, fields: { ...BASE, label: s(40) } },
  countdowns: { kind: 'list', max: 100, fields: { ...BASE, title: s(120), date: date, icon: iconv } },
  expenses: { kind: 'list', max: 1000, fields: { ...BASE, what: s(120), amount: num(0, 1e7), currency: cur, paidBy: idv, date: date, settle: bool, to: idn }, maps: { split: { member: true, val: num(0, 1000) } } },
  // What a quest or challenge counts (and over which days) and a time card's kind and times are its
  // author's only: each member's app reports their numbers and books their calendar against them.
  quests: { kind: 'list', max: 100, mine: ['kind', 'target', 'from', 'to'], fields: { ...BASE, title: s(120), kind: en('done', 'focus', 'items', 'custom'), target: int(1, 10000), from: date, to: date, done: msn }, maps: { progress: { own: true, val: num(0, 1e6) } } },
  challenges: { kind: 'list', max: 100, mine: ['kind', 'from', 'to'], fields: { ...BASE, kind: en('overdue', 'focus', 'done', 'items', 'custom'), title: s(120), from: date, to: date, winner: idn, closed: msn }, maps: { scores: { own: true, val: num(0, 1e6) } } },
  feed: { kind: 'list', max: 500, author: true, fields: { ...BASE, kind: en(...FEED_KINDS), text: s(200), ref: sn(64) }, maps: { cheers: { own: true, val: ms } } },
  wishlist: { kind: 'list', max: 500, mine: ['for', 'title', 'note', 'price', '@alive'], fields: { ...BASE, for: idv, title: s(200), note: s(500), price: num(0, 1e7), claimedBy: idn } },
  goals: { kind: 'list', max: 100, mine: ['title', 'target', 'unit', 'due', 'buddy', 'period', 'done', '@alive'], fields: { ...BASE, title: s(200), target: int(1, 10000), unit: s(30), due: date, buddy: idn, period: en('day', 'week'), done: msn }, maps: { checks: { date: true, val: en('hit', 'miss') }, nudges: { own: true, val: ms } } },
  plan: { kind: 'list', max: 300, mine: ['kind', 'start', 'end'], fields: { ...BASE, kind: en('note', 'task', 'time', 'place'), text: s(300), x: num(0, 1), y: num(0, 1), color: en('yellow', 'blue', 'green', 'pink', 'purple', 'grey'), start: msn, end: msn, done: bool }, maps: { votes: { own: true, val: en(1) } } },
  // ── garden-social ── (2.18) the co-op bed (src/app/94-garden-social-3bed.js; rules: 94-garden-social-0rules.js GSOC_BED):
  // a plant id from the garden catalogue (checked by each page against its own catalogue before drawing), its cell in
  // the 8 x 3 bed and its colour; only its planter moves or digs it up; anyone in the space waters (their own entry).
  bed: { kind: 'list', max: 24, mine: ['plant', 'x', 'y', 'v', 'at', '@alive'], fields: { ...BASE, plant: idv, x: int(0, 7), y: int(0, 2), v: int(0, 7) }, maps: { water: { own: true, val: ms } } },
  // ── end garden-social ──
});
const LISTS = Object.keys(PARTS).filter(k => PARTS[k].kind === 'list');
const SUB_LISTS = new Set(Object.values(PARTS).flatMap(x => Object.keys(x.lists || {})));

/** An empty space value with every part present. */
export function emptySpace() {
  const v = { meta: {}, members: {} };
  for (const k of LISTS) v[k] = [];
  return v;
}

/**
 * A friend id as a key in a space: the friend id itself when it is a plain
 * id, else a stable digest of it (the same on every computer).
 */
export function fidKey(id) {
  const x = String(id == null ? '' : id);
  if (ID_RE.test(x)) return x;
  return x ? 'f' + hash(x).slice(0, 24) : '';
}

// ─── Checking one write ────────────────────────────────────────────────────
const segSafe = (x) => typeof x === 'string' && x.length > 0 && x.length <= 300 && !FORBIDDEN.has(x);
const parsePath = (p) => (Array.isArray(p) && p.length >= 1 && p.length <= 6 && p.every(segSafe) ? p : null);

/** The value of a register in a tree (relative path), or undefined. */
function regValue(tree, rel) {
  let node = tree;
  for (const seg of [TOP, ...rel]) { node = node && node.k ? node.k.get(seg) : null; if (!node) return undefined; }
  return node.r && !node.r.d ? node.r.v : undefined;
}

/**
 * Is `reg` at relative path `p` allowed from `sender`? ctx: {tree, owner,
 * members: Set, by: Map(elementKey -> author named in this message), now}.
 * Returns null when allowed, else a short reason (counted, never echoed).
 */
function refuse(p, reg, sender, ctx) {
  if (!reg || typeof reg !== 'object' || !isHlc(reg.h)) return 'clock';
  const d = decodeHlc(reg.h);
  if (!d || d.wall > ctx.now + MAX_AHEAD_MS) return 'future';
  const del = reg.d === true;
  if (!del && !Object.prototype.hasOwnProperty.call(reg, 'v')) return 'value';
  const isOwner = !!ctx.owner && sender === ctx.owner;
  // The containers' own "is it there" registers (model.mjs): the space, a part, a sub-list or map.
  // Anyone may say "it is there"; only the owner may remove a whole part or the space.
  const container = (ok) => (del || typeof reg.v !== 'boolean' ? 'type' : reg.v === true ? null : ok ? null : 'owner');
  if (p.length === 1) return p[0] === '@alive' ? container(isOwner) : 'shape';
  const part = PARTS[p[0]];
  if (!part) return 'part';
  if (p.length === 2 && p[1] === '@alive') return container(isOwner);
  // meta: any member; the owner field only once (the creator), the kind only by the owner.
  if (part.kind === 'record') {
    if (p.length !== 2) return 'shape';
    const f = part.fields[p[1]];
    if (!f) return 'field';
    if (del) return p[1] === 'owner' ? 'owner' : null;
    if (!f(reg.v)) return 'type';
    if (p[1] === 'owner') { const cur = regValue(ctx.tree, p); if ((cur !== undefined && cur !== reg.v) || reg.v !== sender) return 'owner'; }
    if (p[1] === 'kind' && !isOwner && ctx.owner) return 'owner';
    return null;
  }
  if (part.kind === 'members') {
    if (p.length !== 3 || !ID_RE.test(p[1])) return 'shape';
    if (p[2] === '@alive') return container(isOwner);
    const f = part.fields[p[2]];
    if (!f) return 'field';
    if (!del && !f(reg.v)) return 'type';
    if (p[1] === sender) return (p[2] === 'role' || p[2] === 'removed') && !isOwner ? 'owner' : null;
    return isOwner ? null : 'owner';
  }
  // A list part: [part, el, ...]
  if (!ID_RE.test(p[1])) return 'id';
  const elKey = p[0] + '|' + p[1];
  const author = regValue(ctx.tree, [p[0], p[1], 'by']) ?? ctx.by.get(elKey);
  if (p.length === 3) {
    const leaf = p[2];
    if (leaf === '@alive') {
      if (del || typeof reg.v !== 'boolean') return 'type';
      if ((part.author || (part.mine && part.mine.includes('@alive'))) && author !== sender) return 'author';
      return null;
    }
    if (leaf === '@pos') return !del && isPos(reg.v) ? null : 'type';
    const f = part.fields[leaf];
    if (!f) return 'field';
    if (leaf === 'id') return !del && reg.v === p[1] ? null : 'id';
    if (leaf === 'by') {
      if (del || reg.v !== sender) return 'author';
      const cur = regValue(ctx.tree, p);
      return cur === undefined || cur === sender ? null : 'author';
    }
    if (!del && !f(reg.v)) return 'type';
    if (part.author && author !== sender) return 'author';
    if (part.mine && part.mine.includes(leaf) && author !== sender) return 'author';
    // A wish: claim it for yourself or let go of your own claim.
    if (p[0] === 'wishlist' && leaf === 'claimedBy') {
      const cur = regValue(ctx.tree, p);
      if (!del && reg.v !== null && reg.v !== sender) return 'author';
      if ((del || reg.v === null) && cur && cur !== sender) return 'author';
    }
    return null;
  }
  // Sub-lists and maps inside an element.
  const sub = p[2];
  const sl = part.lists && part.lists[sub];
  const m = part.maps && part.maps[sub];
  if (!sl && !m) return 'field';
  if (p.length === 4 && p[3] === '@alive') {
    if (del || reg.v !== true) return 'type';
    return part.author && author !== sender ? 'author' : null;
  }
  if (sl) {
    if (p.length !== 5 || !ID_RE.test(p[3])) return 'shape';
    const subKey = elKey + '|' + sub + '|' + p[3];
    const subAuthor = regValue(ctx.tree, [p[0], p[1], sub, p[3], 'by']) ?? ctx.by.get(subKey);
    const leaf = p[4];
    if (leaf === '@alive') { if (del || typeof reg.v !== 'boolean') return 'type'; return sl.author && subAuthor !== sender ? 'author' : null; }
    if (leaf === '@pos') return !del && isPos(reg.v) ? null : 'type';
    const f = sl.fields[leaf];
    if (!f) return 'field';
    if (leaf === 'id') return !del && reg.v === p[3] ? null : 'id';
    if (leaf === 'by') {
      if (del || reg.v !== sender) return 'author';
      const cur = regValue(ctx.tree, p);
      return cur === undefined || cur === sender ? null : 'author';
    }
    if (!del && !f(reg.v)) return 'type';
    return sl.author && subAuthor !== sender ? 'author' : null;
  }
  if (p.length !== 4) return 'shape';
  const key = p[3];
  if (m.date) { if (!DATE_RE.test(key)) return 'shape'; }
  else if (!ID_RE.test(key)) return 'shape';
  if (!del && !m.val(reg.v)) return 'type';
  if (m.own && key !== sender) return 'own';
  if (m.member && !ctx.members.has(key)) return 'member';
  if (p[0] === 'goals' && sub === 'checks') {
    const buddy = regValue(ctx.tree, [p[0], p[1], 'buddy']);
    if (author !== sender && buddy !== sender) return 'author';
  }
  return null;
}

// ─── Trees ─────────────────────────────────────────────────────────────────
function treeFromRegs(regs) {
  const tree = newTree();
  for (const [k, r] of Object.entries(regs || {})) {
    let p; try { p = JSON.parse(k); } catch { continue; }
    if (!parsePath(p) || !Array.isArray(r) || !isHlc(r[0])) continue;
    applyWrite(tree, [TOP, ...p], r.length >= 2 ? { h: r[0], n: 0, s: null, v: r[1] } : { h: r[0], n: 0, s: null, d: true });
  }
  return tree;
}
function regsOfTree(tree) {
  const out = {};
  for (const [path, r] of walkRegs(tree)) {
    if (path[0] !== TOP || path.length < 2) continue;
    out[JSON.stringify(path.slice(1))] = r.d ? [r.h] : [r.h, r.v];
  }
  return out;
}
function* relRegs(tree) {
  for (const [path, r] of walkRegs(tree)) if (path[0] === TOP && path.length >= 2) yield [path.slice(1), r.d ? { h: r.h, d: true } : { h: r.h, v: r.v }];
}
function digestOf(tree) {
  const parts = [];
  for (const [p, r] of relRegs(tree)) parts.push(JSON.stringify(p) + '=' + r.h);
  parts.sort();
  return hash(parts.join('\n'));
}
/** The space as a plain value, every part present. */
function valueOf(tree) {
  const r = materializeFile(TOP, SPACE_SPEC, undefined, false, tree);
  const v = r && r.present && r.value && typeof r.value === 'object' ? r.value : {};
  const out = emptySpace();
  if (v.meta && typeof v.meta === 'object') out.meta = v.meta;
  if (v.members && typeof v.members === 'object') out.members = v.members;
  for (const k of LISTS) if (Array.isArray(v[k])) out[k] = v[k].filter(x => x && typeof x === 'object' && idv(x.id));
  return out;
}

// ─── Patches from the page (this computer's own edits) ──────────────────────
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
/** The fields of a space whose value is a person's key (members and map keys are the other places). */
const KEY_FIELDS = new Set(['owner', 'by', 'assignee', 'doneBy', 'paidBy', 'to', 'claimedBy', 'for', 'buddy', 'winner']);
/**
 * A copy of a space value (or a page op's value) with people's keys renamed by f(key) -> other key | null:
 * object keys (members, cheers, votes, split...) and the KEY_FIELDS values. Where both an old and a new
 * key are present, the one f does not rename wins. Used only at the page boundary (renewed keys, below).
 */
function rekeyDeep(v, f, depth = 0) {
  if (Array.isArray(v)) return v.map(x => rekeyDeep(x, f, depth + 1));
  if (!isObj(v) || depth > 12) return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    const nk = f(k) || k;
    const nx = KEY_FIELDS.has(k) && typeof x === 'string' ? (f(x) || x) : rekeyDeep(x, f, depth + 1);
    if (nk !== k && Object.prototype.hasOwnProperty.call(out, nk)) continue;
    out[nk] = nx;
  }
  return out;
}
/**
 * Apply page ops to a copy of a space value. op: {op:'set'|'del'|'move', path, value?, before?}
 * A path names list items by id: ['items', id, 'title'], ['items', id, 'comments', cid].
 * 'set' on a list item's path with no field replaces/inserts the item (new ones at the end, or before `before`).
 */
export function applyPatch(value, ops) {
  const v = clone(value);
  for (const o of Array.isArray(ops) ? ops.slice(0, 2000) : []) {
    if (!o || !Array.isArray(o.path) || !o.path.length || o.path.length > 6 || !o.path.every(x => typeof x === 'string' && segSafe(x))) throw new Error('bad patch path');
    let node = v, i = 0;
    const p = o.path;
    // Walk to the container of the last segment.
    for (; i < p.length - 1; i++) {
      const seg = p[i];
      if (Array.isArray(node)) {
        let el = node.find(x => x && x.id === seg);
        if (!el) { if (o.op !== 'set') { node = null; break; } el = { id: seg }; node.push(el); }
        node = el;
      } else if (isObj(node)) {
        if (!isObj(node[seg]) && !Array.isArray(node[seg])) {
          if (o.op !== 'set') { node = null; break; }
          node[seg] = (i === 0 && LISTS.includes(seg)) || (i === 2 && SUB_LISTS.has(seg)) ? [] : {};
        }
        node = node[seg];
      } else { node = null; break; }
    }
    if (!node) continue;
    const last = p[p.length - 1];
    if (Array.isArray(node)) {
      const at = node.findIndex(x => x && x.id === last);
      if (o.op === 'del') { if (at >= 0) node.splice(at, 1); continue; }
      if (o.op === 'move') {
        if (at < 0) continue;
        const [el] = node.splice(at, 1);
        const bi = o.before ? node.findIndex(x => x && x.id === o.before) : -1;
        if (bi >= 0) node.splice(bi, 0, el); else node.push(el);
        continue;
      }
      if (!isObj(o.value)) throw new Error('a list item must be an object');
      const el = Object.assign({}, clone(o.value), { id: last });
      if (at >= 0) node[at] = el;
      else { const bi = o.before ? node.findIndex(x => x && x.id === o.before) : -1; if (bi >= 0) node.splice(bi, 0, el); else node.push(el); }
      continue;
    }
    if (!isObj(node)) continue;
    if (o.op === 'del') { delete node[last]; continue; }
    if (o.op === 'set') node[last] = clone(o.value);
  }
  return v;
}

// ─── The store ─────────────────────────────────────────────────────────────
/**
 * createSpaces({store, local, now, log, onChange, onLive})
 *   store   {read() -> obj|null, write(obj), stamp() -> any (changes when the file changed elsewhere)}
 *   local   {read() -> {actor, last}|null, write(obj)}: this computer's clock (never synced)
 *   onChange({spaces: [id], from})   a space changed (the route tells open pages)
 *   onLive({from, event})            a checked live event from a friend (cursors, focus, nudges)
 * Then setChannel(channel) with {send(friendId, topic, payload), me() -> {id, name}, list() -> [{id, name}]}.
 */
export function createSpaces({ store, local = null, now = () => Date.now(), log = () => {}, onChange = () => {}, onLive = () => {}, alias = null } = {}) {
  let data = null, stamp = null, loading = null, saveTimer = null, saving = Promise.resolve();
  let clock = null, actor = null;
  let channel = null;
  const trees = new Map();          // id -> tree
  const values = new Map();         // id -> value (cache)
  const meter = new Map();          // friend -> {t, msgs, regs, live: [times]}
  const resentAt = new Map();       // `${space}|${friend}` -> ms
  const stats = { refused: 0, applied: 0, sent: 0, live: 0, limited: 0 };
  let liveOffUntil = 0;             // the friends engine would not carry live events (an older engine): try again later

  async function load(force) {
    const st = store.stamp ? await store.stamp() : null;
    if (data && !force && (st == null || st === stamp)) return;
    if (loading) return loading;
    loading = (async () => {
      const obj = await store.read().catch(() => null);
      stamp = st;
      data = isObj(obj) && obj.v === 1 && isObj(obj.spaces) ? obj : { v: 1, spaces: {} };
      trees.clear(); values.clear();
      for (const [id, sp] of Object.entries(data.spaces)) {
        if (!ID_RE.test(id) || !isObj(sp)) { delete data.spaces[id]; continue; }
        if (!isObj(sp.regs)) sp.regs = {};
        if (!isObj(sp.me)) sp.me = { status: 'joined' };
        trees.set(id, treeFromRegs(sp.regs));
      }
      if (!clock) {
        const l = local ? await local.read().catch(() => null) : null;
        actor = l && /^[0-9a-f]{16}$/.test(String(l.actor || '')) ? l.actor : randomHex16();
        clock = createClock({ deviceId: actor, now, last: l && l.last });
        if (local && (!l || l.actor !== actor)) await local.write({ actor, last: clock.peek() }).catch(() => {});
      }
    })();
    try { await loading; } finally { loading = null; }
  }
  function randomHex16() {
    let h = '';
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') { const b = new Uint8Array(8); c.getRandomValues(b); for (const x of b) h += x.toString(16).padStart(2, '0'); return h; }
    for (let i = 0; i < 16; i++) h += Math.floor(Math.random() * 16).toString(16);
    return h;
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { flush().catch(e => log('warn', `together: could not save the spaces (${e && e.code || 'error'})`)); }, 250);
    saveTimer.unref?.();
  }
  async function flush() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!data) return;
    for (const [id, tree] of trees) if (data.spaces[id]) data.spaces[id].regs = regsOfTree(tree);
    const snapshot = JSON.parse(JSON.stringify(data));
    saving = saving.then(async () => {
      await store.write(snapshot);
      stamp = store.stamp ? await store.stamp() : stamp;
      if (local && clock) await local.write({ actor, last: clock.peek() }).catch(() => {});
    });
    return saving;
  }

  const meFid = () => { try { const m = channel && channel.me ? channel.me() : null; return m && m.id ? fidKey(m.id) : ''; } catch { return ''; } };
  const meId = () => { try { const m = channel && channel.me ? channel.me() : null; return m && m.id ? String(m.id) : ''; } catch { return ''; } };
  // ─── Renewed keys (docs/dev/FRIENDS.md section 15) ─────────────────────────
  // A space keeps the key each person had when they joined: its registers are never rewritten (every
  // copy would write them under its own clock and the copies would never agree again). alias(oldKey)
  // -> their current id comes from the friends engine's VERIFIED renewals (a friend's rekey signed by
  // both keys; my own retired ids), so a friend who renewed is still that member, messages go to their
  // new id, and the page sees everyone under their current id (viewOf / unaliasOps).
  const aliasOf = (k) => { if (typeof alias !== 'function' || !k) return null; try { const a = alias(k); return typeof a === 'string' && a && a !== k ? a : null; } catch { return null; } };
  /** The member key that is the person with current id `id` in space `sid` (else fidKey(id)). */
  function keyIn(sid, id) {
    const fk = fidKey(id);
    const v = sid ? value(sid) : null;
    if (!fk || !v || !isObj(v.members) || Object.prototype.hasOwnProperty.call(v.members, fk)) return fk;
    for (const k of Object.keys(v.members)) { const a = aliasOf(k); if (a && (a === id || fidKey(a) === fk)) return k; }
    return fk;
  }
  /** My key in a space (my old key there when I renewed mine since). */
  const myKey = (sid) => { const m = meId(); return m ? keyIn(sid, m) : ''; };
  /** A space's value as the page sees it: everyone under their current id. */
  function viewOf(id) {
    const v = value(id);
    if (!v || !isObj(v.members) || !Object.keys(v.members).some(k => aliasOf(k))) return v;
    return rekeyDeep(v, (k) => { const a = aliasOf(k); return a ? fidKey(a) : null; });
  }
  /** The page's ops (current ids) in this space's own keys. */
  function unaliasOps(id, ops) {
    const v = value(id);
    const rev = new Map();
    for (const k of Object.keys((v && v.members) || {})) { const a = aliasOf(k); if (a) { rev.set(fidKey(a), k); rev.set(a, k); } }
    if (!rev.size || !Array.isArray(ops)) return ops;
    const f = (k) => rev.get(k) || null;
    return ops.map(o => {
      if (!o || !Array.isArray(o.path)) return o;
      const path = o.path.map(x => (typeof x === 'string' && rev.has(x) ? rev.get(x) : x));
      const last = path[path.length - 1];
      let value = o.value;
      if (typeof value === 'string' && KEY_FIELDS.has(last)) value = f(value) || value;
      else if (value && typeof value === 'object') value = rekeyDeep(value, f);
      return { ...o, path, ...(o.value !== undefined ? { value } : {}) };
    });
  }
  /** friend key -> the channel's own id for that friend (they differ only for ids that are not plain). */
  function channelIdOf(fk) {
    const a = aliasOf(fk);
    if (a) return a;
    try { for (const f of (channel && channel.list ? channel.list() : []) || []) if (f && fidKey(f.id) === fk) return f.id; } catch { /* no list */ }
    return ID_RE.test(fk) ? fk : null;
  }
  const value = (id) => { if (!values.has(id) && trees.has(id)) values.set(id, valueOf(trees.get(id))); return values.get(id) || null; };
  const activeMembers = (v) => Object.entries((v && v.members) || {}).filter(([, m]) => m && !m.left && !m.removed).map(([k]) => k);

  async function send(fk, topic, payload) {
    if (!channel || typeof channel.send !== 'function') return false;
    const to = channelIdOf(fk);
    if (!to) return false;
    if (topic === LIVE_KIND && now() < liveOffUntil) return false;
    try { const r = await channel.send(to, topic, payload); stats.sent++; return !(r && r.skipped && !r.sent && !r.queued); }
    catch (e) {
      if (topic === LIVE_KIND && e && e.code === 'BAD_KIND') { liveOffUntil = now() + 10 * 60 * 1000; return false; }
      log('info', `together: send failed (${e && e.code || 'offline'})`);
      return false;
    }
  }
  async function sendRegs(id, fks, regs) {
    if (!fks.length || !regs.length) return;
    // Byte-sized chunks: each body stays well under the channel's 32 KB.
    const chunks = [];
    let cur = [], bytes = 2;
    for (const e of regs) {
      const j = JSON.stringify(e);
      if (cur.length && (bytes + j.length + 1 > LIMITS.chunkBytes || cur.length >= LIMITS.regsPerMessage)) { chunks.push(cur); cur = []; bytes = 2; }
      cur.push(j); bytes += j.length + 1;
    }
    if (cur.length) chunks.push(cur);
    for (const c of chunks) {
      const d = b64e('[' + c.join(',') + ']');
      for (const fk of fks) await send(fk, SPACE_KIND_PREFIX + id, { v: 1, t: 'regs', d });
    }
  }

  /** Write a new value of a space as this computer's change; returns the registers written. */
  function commit(id, next, opts = {}) {
    const tree = trees.get(id);
    const c = captureFile(TOP, SPACE_SPEC, next, true, tree);
    if (!c.w.length && !c.x.length) return [];
    const h = clock.tick();
    const out = [];
    const me = myKey(id);
    const v0 = value(id) || emptySpace();
    const ctx = { tree, owner: (v0.meta && v0.meta.owner) || (next.meta && next.meta.owner) || me, members: new Set(Object.keys(next.members || {})), by: byOfWrites(c.w.map(([p, v]) => [p.slice(1), { h, v }])), now: now() };
    for (const [p, val] of c.w) {
      const rel = p.slice(1);
      const reg = { h, v: val };
      const why = opts.trusted ? null : refuse(rel, reg, me, ctx);
      if (why) throw Object.assign(new Error(`not allowed in a shared space (${why}: ${rel.slice(0, 3).join('.')})`), { status: 400 });
      out.push([rel, reg]);
    }
    for (const p of c.x) {
      const rel = p.slice(1);
      const reg = { h, d: true };
      const why = opts.trusted ? null : refuse(rel, reg, me, ctx);
      if (why) throw Object.assign(new Error(`not allowed in a shared space (${why}: ${rel.slice(0, 3).join('.')})`), { status: 400 });
      out.push([rel, reg]);
    }
    for (const [rel, reg] of out) applyWrite(tree, [TOP, ...rel], { h: reg.h, n: 0, s: null, ...(reg.d ? { d: true } : { v: reg.v }) });
    values.delete(id);
    return out;
  }
  function byOfWrites(regs) {
    const by = new Map();
    for (const [p, r] of regs) {
      if (r.d) continue;
      if (p.length === 3 && p[2] === 'by') by.set(p[0] + '|' + p[1], r.v);
      if (p.length === 5 && p[4] === 'by') by.set(p[0] + '|' + p[1] + '|' + p[2] + '|' + p[3], r.v);
    }
    return by;
  }
  function checkCaps(id, v) {
    for (const k of LISTS) {
      const part = PARTS[k];
      if ((v[k] || []).length > part.max) throw Object.assign(new Error(`this space is full: at most ${part.max} ${k}`), { status: 400 });
      if (part.lists) for (const el of v[k] || []) for (const [sk, sl] of Object.entries(part.lists)) if (Array.isArray(el[sk]) && el[sk].length > sl.max) throw Object.assign(new Error(`at most ${sl.max} ${sk} on one item`), { status: 400 });
    }
    if (Object.keys(v.members || {}).length > 50) throw Object.assign(new Error('at most 50 people in a space'), { status: 400 });
  }

  // ─── The page's actions ───────────────────────────────────────────────────
  const api = {
    LIMITS, stats,
    async list() {
      await load();
      const out = [];
      for (const [id, sp] of Object.entries(data.spaces)) {
        const v = viewOf(id);
        if (!v) continue;
        out.push({ id, status: sp.me.status || 'joined', invitedBy: sp.me.by ? (aliasOf(sp.me.by) || sp.me.by) : null, at: sp.me.at || null, value: v });
      }
      return out;
    },
    async get(id) { await load(); return data.spaces[id] ? { id, status: data.spaces[id].me.status, value: viewOf(id) } : null; },
    /** A new space: this computer's user is its owner; the others get an invitation. */
    async create({ id, name, kind = 'list', icon = null, color: col = null, members = [], extra = null }) {
      await load();
      const me = meFid();
      if (!me) throw Object.assign(new Error('Friends are not set up on this computer yet'), { status: 409 });
      if (!ID_RE.test(String(id || ''))) throw Object.assign(new Error('bad space id'), { status: 400 });
      if (data.spaces[id]) throw Object.assign(new Error('that space exists already'), { status: 409 });
      if (Object.keys(data.spaces).length >= LIMITS.spaces) throw Object.assign(new Error(`at most ${LIMITS.spaces} spaces`), { status: 400 });
      const t = now();
      const meName = (() => { try { const m = channel.me(); return String((m && m.name) || '').slice(0, 80); } catch { return ''; } })();
      const v = emptySpace();
      v.meta = { name: String(name || 'Shared list').slice(0, 80), kind: KINDS.includes(kind) ? kind : 'list', owner: me, created: t, ...(icon ? { icon } : {}), ...(col ? { color: col } : {}) };
      if (isObj(extra)) for (const k of ['about', 'start', 'end', 'place', 'currency']) if (extra[k] != null) v.meta[k] = extra[k];
      v.members[me] = { name: meName, role: 'owner', at: t, joined: t };
      for (const m of Array.isArray(members) ? members.slice(0, 49) : []) {
        const fk = fidKey(m && m.id);
        if (!fk || fk === me) continue;
        v.members[fk] = { name: String((m && m.name) || '').slice(0, 80), role: 'member', at: t };
      }
      if (kind === 'board') v.columns = [{ id: 'c-todo', label: 'To do', by: me, at: t }, { id: 'c-doing', label: 'Doing', by: me, at: t }, { id: 'c-done', label: 'Done', by: me, at: t }];
      data.spaces[id] = { regs: {}, me: { status: 'joined', at: t } };
      trees.set(id, newTree());
      try { checkCaps(id, v); commit(id, v); }
      catch (e) { delete data.spaces[id]; trees.delete(id); throw e; }
      scheduleSave();
      const regs = [...relRegs(trees.get(id))];
      await sendRegs(id, activeMembers(v).filter(k => k !== me), regs);
      onChange({ spaces: [id], from: null });
      return { id, value: viewOf(id) };
    },
    /** This computer's edit: page ops on the current value (applyPatch), checked like a friend's. */
    async edit(id, ops) {
      await load();
      const sp = data.spaces[id];
      if (!sp) throw Object.assign(new Error('no such space'), { status: 404 });
      if (sp.me.status !== 'joined') throw Object.assign(new Error('join the space first'), { status: 409 });
      const me = myKey(id);
      if (!me) throw Object.assign(new Error('Friends are not set up on this computer yet'), { status: 409 });
      const before = value(id);
      if (!before.members[me] || before.members[me].removed || before.members[me].left) throw Object.assign(new Error('you are no longer in this space'), { status: 409 });
      const next = applyPatch(before, unaliasOps(id, ops));
      checkCaps(id, next);
      const regs = commit(id, next);
      if (!regs.length) return { id, value: viewOf(id), changed: 0 };
      scheduleSave();
      const after = value(id);
      // Someone new joined the list: they get everything so far, the others just this change.
      const was = new Set(activeMembers(before));
      const fresh = activeMembers(after).filter(k => !was.has(k) && k !== me);
      const others = activeMembers(after).filter(k => k !== me && !fresh.includes(k));
      const removed = Object.keys(after.members).filter(k => after.members[k] && after.members[k].removed && was.has(k));
      await sendRegs(id, others.concat(removed), regs);
      if (fresh.length) await sendRegs(id, fresh, [...relRegs(trees.get(id))]);
      onChange({ spaces: [id], from: null });
      return { id, value: viewOf(id), changed: regs.length };
    },
    /** Join, decline or leave. Joining tells the others; leaving marks you as left for everyone. */
    async setStatus(id, status) {
      await load();
      const sp = data.spaces[id];
      if (!sp) throw Object.assign(new Error('no such space'), { status: 404 });
      const me = myKey(id);
      const t = now();
      if (status === 'joined') {
        sp.me = { ...sp.me, status: 'joined', at: t };
        const v = value(id);
        if (me && v.members[me]) {
          const next = applyPatch(v, [{ op: 'set', path: ['members', me, 'joined'], value: t }, { op: 'set', path: ['members', me, 'left'], value: false }]);
          const regs = commit(id, next);
          await sendRegs(id, activeMembers(value(id)).filter(k => k !== me), regs);
          for (const k of activeMembers(value(id))) if (k !== me) await send(k, SPACE_KIND_PREFIX + id, { v: 1, t: 'want' });
        }
      } else if (status === 'declined' || status === 'left') {
        const v = value(id);
        if (me && v.members[me] && !v.members[me].left && !v.members[me].removed) {
          const next = applyPatch(v, [{ op: 'set', path: ['members', me, 'left'], value: true }]);
          const regs = commit(id, next);
          await sendRegs(id, activeMembers(v).filter(k => k !== me), regs);
        }
        sp.me = { ...sp.me, status, at: t };
      } else throw Object.assign(new Error('status must be joined, declined or left'), { status: 400 });
      scheduleSave();
      onChange({ spaces: [id], from: null });
      return { id, status: sp.me.status };
    },
    /** Forget a space on this computer (after leaving or declining): its copy is removed here. */
    async forget(id) {
      await load();
      const sp = data.spaces[id];
      if (!sp) return { id, removed: false };
      if (sp.me.status === 'joined') throw Object.assign(new Error('leave the space first'), { status: 409 });
      delete data.spaces[id]; trees.delete(id); values.delete(id);
      scheduleSave();
      onChange({ spaces: [id], from: null });
      return { id, removed: true };
    },
    /** A live event to the active members of a space (cursors, focus): rate-limited at the receiver too. */
    async live(id, event, to = null) {
      await load();
      const sp = id ? data.spaces[id] : null;
      // The page names the space beside the event ({space, event: {t: 'here', on}}): the event carries it from here.
      const ev = cleanLive(id && isObj(event) ? { ...event, space: id } : event);
      if (!ev) throw Object.assign(new Error('not a live event'), { status: 400 });
      let fks;
      if (sp) { if (sp.me.status !== 'joined') return { sent: 0 }; const me = myKey(id); fks = activeMembers(value(id)).filter(k => k !== me); ev.space = id; }
      else {
        // Not in a space (focus together): every friend who shares a joined space with you.
        const all = new Set();
        for (const [sid, s2] of Object.entries(data.spaces)) if (s2.me.status === 'joined') { const me = myKey(sid); for (const k of activeMembers(value(sid))) if (k !== me) all.add(k); }
        fks = [...all];
      }
      if (Array.isArray(to)) { const want = new Set(to.map(fidKey)); fks = fks.filter(k => want.has(k) || want.has(fidKey(channelIdOf(k) || ''))); }
      if (now() < liveOffUntil) return { sent: 0, unsupported: true };
      let n = 0;
      for (const fk of fks.slice(0, 50)) if (await send(fk, LIVE_KIND, ev)) n++;
      return { sent: n, ...(now() < liveOffUntil ? { unsupported: true } : {}) };
    },
    /** Ask every member of every joined space whether they have something we missed (and send what they miss). */
    async hello() {
      await load();
      let n = 0;
      for (const [id, sp] of Object.entries(data.spaces)) {
        if (sp.me.status !== 'joined') continue;
        const me = myKey(id);
        const d = digestOf(trees.get(id));
        for (const k of activeMembers(value(id))) if (k !== me) { if (await send(k, SPACE_KIND_PREFIX + id, { v: 1, t: 'hello', h: d })) n++; }
      }
      return { asked: n };
    },
    async flush() { return flush(); },

    // ─── From a friend ───────────────────────────────────────────────────────
    /**
     * A message from friend `from` (the channel's authenticated friend id) of
     * kind `kind` ('space:<id>' or 'together:live'), its body already checked
     * against the kind's schema by the friends engine. Checked again here in
     * full. Returns {ok, applied?, refused?, reason?}; never throws.
     */
    async receive(from, kind, payload) {
      try {
        await load();
        const fk = fidKey(from);
        if (!fk) return { ok: false, reason: 'sender' };
        let size = 0;
        try { size = JSON.stringify(payload ?? null).length; } catch { return { ok: false, reason: 'payload' }; }
        if (kind === LIVE_KIND) return liveIn(fk, payload, size, from);
        const m = /^space:([A-Za-z0-9_-]{1,64})$/.exec(String(kind || ''));
        if (!m) return { ok: false, reason: 'kind' };
        if (!isObj(payload) || payload.v !== 1) return { ok: false, reason: 'payload' };
        const id = m[1];
        let regs = [];
        if (payload.t === 'regs') {
          const text = b64d(payload.d);
          if (text == null || text.length > LIMITS.bytesPerMessage) { stats.limited++; return { ok: false, reason: 'payload' }; }
          try { regs = JSON.parse(text); } catch { return { ok: false, reason: 'payload' }; }
          if (!Array.isArray(regs)) return { ok: false, reason: 'payload' };
        }
        if (!meterTake(fk, 1, regs.length)) { stats.limited++; return { ok: false, reason: 'rate' }; }
        const sk = keyIn(id, from);     // their key in this space (their old one when they renewed theirs since)
        if (payload.t === 'regs') return regsIn(id, sk, regs, from);
        if (payload.t === 'hello') return helloIn(id, sk, payload);
        if (payload.t === 'want') return wantIn(id, sk);
        return { ok: false, reason: 'type' };
      } catch (e) {
        log('warn', `together: a message could not be read (${e && e.message ? String(e.message).slice(0, 80) : 'error'})`);
        return { ok: false, reason: 'error' };
      }
    },

    /**
     * A friend was removed or blocked (friends.onRemoved): they leave every
     * space you own, and the spaces THEY own are left and forgotten here (your
     * copy of what they shared is deleted, docs/dev/FRIENDS.md rule 7).
     */
    async friendRemoved(friendId) {
      await load();
      const changed = [];
      for (const [id, sp] of Object.entries(data.spaces)) {
        const v = value(id);
        const fk = keyIn(id, friendId), me = myKey(id);
        if (!v || !fk || !v.members[fk]) continue;
        if (v.meta.owner === fk) { delete data.spaces[id]; trees.delete(id); values.delete(id); changed.push(id); continue; }
        if (me && v.meta.owner === me && sp.me.status === 'joined' && !v.members[fk].removed) {
          try {
            const regs = commit(id, applyPatch(v, [{ op: 'set', path: ['members', fk, 'removed'], value: true }]));
            await sendRegs(id, activeMembers(value(id)).filter(k => k !== me), regs);
          } catch { /* the space is left as it is */ }
          changed.push(id);
        }
      }
      if (changed.length) { scheduleSave(); onChange({ spaces: changed, from: null }); }
      return { changed };
    },
    setChannel(ch) { channel = ch && typeof ch === 'object' ? ch : null; },
    hasChannel: () => !!(channel && typeof channel.send === 'function'),
    /** Friends you share a joined space with (cheers and focus invites go only to them). */
    async spaceFriends() {
      await load();
      const all = new Set();
      for (const [sid, s2] of Object.entries(data.spaces)) if (s2.me.status === 'joined') { const me = myKey(sid); for (const k of activeMembers(value(sid))) if (k !== me) all.add(k); }
      return [...new Set([...all].map(channelIdOf).filter(Boolean))];
    },
    me: () => meFid(),
    digest: async (id) => { await load(); return trees.has(id) ? digestOf(trees.get(id)) : null; },
  };

  function meterTake(fk, msgs, regs) {
    const t = now();
    let m = meter.get(fk);
    if (!m || t - m.t >= 60000) { m = { t, msgs: 0, regs: 0, live: m ? m.live : [] }; meter.set(fk, m); }
    if (m.msgs + msgs > LIMITS.messagesPerMinute || m.regs + regs > LIMITS.regsPerMinute || regs > LIMITS.regsPerMessage) return false;
    m.msgs += msgs; m.regs += regs;
    if (meter.size > 500) meter.delete(meter.keys().next().value);
    return true;
  }

  async function regsIn(id, fk, regs, from = null) {
    if (!regs.length) return { ok: true, applied: 0 };
    let sp = data.spaces[id];
    let parsed = [];
    for (const e of regs) {
      if (!Array.isArray(e) || e.length !== 2) { stats.refused++; continue; }
      const p = parsePath(e[0]);
      const r = isObj(e[1]) ? (e[1].d === true ? { h: e[1].h, d: true } : { h: e[1].h, v: e[1].v }) : null;
      if (!p || !r) { stats.refused++; continue; }
      parsed.push([p, r]);
    }
    // My key in this space: in a new invitation, the member key that is me (an old one if I renewed mine).
    let me = sp ? myKey(id) : meFid();
    if (!sp && me) {
      const keys = parsed.filter(([p, r]) => p[0] === 'members' && p.length === 3 && !r.d).map(([p]) => p[1]);
      if (!keys.includes(me)) me = keys.find(k => aliasOf(k) === meId()) || me;
      // A renewed owner sending a space from before their renewal: their key in it is the old one.
      const ownerK = (parsed.find(([p, r]) => !r.d && p.length === 2 && p[0] === 'meta' && p[1] === 'owner') || [])[1];
      if (ownerK && typeof ownerK.v === 'string' && ownerK.v !== fk && from && aliasOf(ownerK.v) === from) fk = ownerK.v;
    }
    let tree, owner, members, fresh = false, reinvite = false;
    if (!sp) {
      // An invitation: only its owner can start a space here, and it must include you.
      const val = (path) => { for (const [p, r] of parsed) if (!r.d && p.length === path.length && p.every((x, i) => x === path[i])) return r.v; return undefined; };
      if (!me || val(['meta', 'owner']) !== fk || val(['members', fk, 'role']) !== 'owner' || val(['members', me, 'role']) === undefined) { stats.refused += parsed.length; return { ok: false, reason: 'not invited' }; }
      const pending = Object.values(data.spaces).filter(x => x.me.status === 'invited' && x.me.by === fk).length;
      if (pending >= LIMITS.pendingInvitesPerFriend || Object.keys(data.spaces).length >= LIMITS.spaces) { stats.limited++; return { ok: false, reason: 'too many invitations' }; }
      tree = newTree(); owner = fk; fresh = true;
      members = new Set(parsed.filter(([p, r]) => p[0] === 'members' && p.length === 3 && !r.d).map(([p]) => p[1]));
    } else {
      tree = trees.get(id);
      const v = value(id);
      owner = v.meta && v.meta.owner;
      if (sp.me.status === 'declined' || sp.me.status === 'left' || sp.me.status === 'removed') {
        // Asked back by the owner (Invite again): an invitation once more, waiting for Join.
        const back = !!me && fk === owner && parsed.some(([p, r]) => !r.d && p[0] === 'members' && p[1] === me && p.length === 3 && (((p[2] === 'left' || p[2] === 'removed') && r.v === false) || p[2] === 'at'));
        if (!back) return { ok: false, reason: 'not here' };
        reinvite = true;
      }
      const act = new Set(activeMembers(v));
      let senderOk = act.has(fk);
      if (!senderOk) {
        // Back after leaving (never after being removed): only their own return is taken.
        const m0 = v.members[fk];
        if (m0 && m0.left && !m0.removed) { parsed = parsed.filter(([p]) => p.length === 3 && p[0] === 'members' && p[1] === fk && (p[2] === 'left' || p[2] === 'joined')); senderOk = parsed.length > 0; }
      }
      if (!senderOk) { stats.refused += parsed.length; return { ok: false, reason: 'not a member' }; }
      members = new Set(Object.keys(v.members));
      for (const [p, r] of parsed) if (p[0] === 'members' && p.length === 3 && !r.d && fk === owner) members.add(p[1]);
    }
    const ctx = { tree, owner, members, by: byOfWrites(parsed), now: now() };
    const ok = [];
    let refused = 0;
    for (const [p, r] of parsed) { if (refuse(p, r, fk, ctx)) refused++; else ok.push([p, r]); }
    // List caps: new elements beyond a part's limit are not taken.
    const v0 = sp ? value(id) : emptySpace();
    const counts = {};
    for (const k of LISTS) counts[k] = (v0[k] || []).length;
    const known = new Set();
    for (const k of LISTS) for (const el of v0[k] || []) known.add(k + '|' + el.id);
    const take = [];
    for (const e of ok) {
      const [p, r] = e;
      if (LISTS.includes(p[0]) && p.length === 3 && p[2] === '@alive' && r.v === true && !known.has(p[0] + '|' + p[1])) {
        if (counts[p[0]] >= PARTS[p[0]].max) { refused++; continue; }
        counts[p[0]]++; known.add(p[0] + '|' + p[1]);
      }
      take.push(e);
    }
    stats.refused += refused;
    if (!take.length) return { ok: refused === 0, applied: 0, refused };
    if (fresh) {
      data.spaces[id] = sp = { regs: {}, me: { status: 'invited', by: fk, at: now() } };
      trees.set(id, tree);
    }
    if (reinvite) sp.me = { status: 'invited', by: fk, at: now() };
    let won = 0;
    for (const [p, r] of take) {
      clock.observe(r.h);
      if (applyWrite(tree, [TOP, ...p], { h: r.h, n: 0, s: null, ...(r.d ? { d: true } : { v: r.v }) }) === 'won') won++;
    }
    values.delete(id);
    // Removed by the owner: this copy stops taking part.
    const after = value(id);
    if (me && after.members[me] && after.members[me].removed && sp.me.status !== 'removed') sp.me = { ...sp.me, status: 'removed', at: now() };
    stats.applied += won;
    if (won || fresh || reinvite) { scheduleSave(); onChange({ spaces: [id], from: aliasOf(fk) || fk, invited: fresh || reinvite }); }
    return { ok: true, applied: won, refused };
  }
  async function helloIn(id, fk, payload) {
    const sp = data.spaces[id];
    if (!sp || (sp.me.status !== 'joined' && sp.me.status !== 'invited')) return { ok: false, reason: 'not here' };
    if (!activeMembers(value(id)).includes(fk)) return { ok: false, reason: 'not a member' };
    const mine = digestOf(trees.get(id));
    if (typeof payload.h === 'string' && payload.h === mine) return { ok: true, same: true };
    await resendTo(id, fk);
    return { ok: true, same: false };
  }
  async function wantIn(id, fk) {
    const sp = data.spaces[id];
    if (!sp || sp.me.status !== 'joined') return { ok: false, reason: 'not here' };
    if (!activeMembers(value(id)).includes(fk)) return { ok: false, reason: 'not a member' };
    await resendTo(id, fk);
    return { ok: true };
  }
  async function resendTo(id, fk) {
    const key = id + '|' + fk, t = now();
    if (t - (resentAt.get(key) || 0) < LIMITS.resendGapMs) return;
    resentAt.set(key, t);
    if (resentAt.size > 2000) resentAt.delete(resentAt.keys().next().value);
    await sendRegs(id, [fk], [...relRegs(trees.get(id))]);
  }

  function liveIn(fk, payload, size, from = null) {
    if (size > LIMITS.liveBytes) { stats.limited++; return { ok: false, reason: 'too big' }; }
    const t = now();
    let m = meter.get(fk);
    if (!m) { m = { t, msgs: 0, regs: 0, live: [] }; meter.set(fk, m); }
    m.live = m.live.filter(x => t - x < 60000);
    if (m.live.length >= LIMITS.livePerMinute || m.live.filter(x => t - x < 1000).length >= LIMITS.livePerSecond) { stats.limited++; return { ok: false, reason: 'rate' }; }
    m.live.push(t);
    const ev = cleanLive(payload);
    if (!ev) return { ok: false, reason: 'event' };
    // Only friends you share a joined space with (and, for a space event, its members).
    const kin = (sid) => (from ? keyIn(sid, from) : fk);
    if (ev.space) {
      const sp = data.spaces[ev.space];
      if (!sp || sp.me.status !== 'joined' || !activeMembers(value(ev.space)).includes(kin(ev.space))) return { ok: false, reason: 'not a member' };
    } else {
      let shared = false;
      for (const [sid, s2] of Object.entries(data.spaces)) if (s2.me.status === 'joined' && activeMembers(value(sid)).includes(kin(sid))) { shared = true; break; }
      if (!shared) return { ok: false, reason: 'not shared' };
    }
    stats.live++;
    try { onLive({ from: fk, event: ev }); } catch { /* the page is gone */ }
    return { ok: true };
  }
  return api;
}

/**
 * A live event, checked and rebuilt from allowed fields only:
 *   {t:'cursor', space, x, y, sel?}      Plan together pointer (0..1 of the board)
 *   {t:'edit', space, card, text}       a card being typed (text capped)
 *   {t:'here', space, on}               opened / left the Plan together board
 *   {t:'focus', on, mins?, until?}      focusing now ("Sam is focusing too")
 *   {t:'nudge', space, goal, kind}      an accountability nudge (hit / miss / cheer)
 *   {t:'cheer', space, ref}             a high-five, shown at once (the cheer itself is in the space)
 */
export function cleanLive(e) {
  if (!isObj(e) || typeof e.t !== 'string') return null;
  const sp = e.space == null ? null : (typeof e.space === 'string' && ID_RE.test(e.space) ? e.space : undefined);
  if (sp === undefined) return null;
  const n01 = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
  switch (e.t) {
    case 'cursor': return sp && n01(e.x) && n01(e.y) ? { t: 'cursor', space: sp, x: Math.round(e.x * 10000) / 10000, y: Math.round(e.y * 10000) / 10000, ...(typeof e.sel === 'string' && ID_RE.test(e.sel) ? { sel: e.sel } : {}) } : null;
    case 'edit': return sp && typeof e.card === 'string' && ID_RE.test(e.card) && typeof e.text === 'string' ? { t: 'edit', space: sp, card: e.card, text: e.text.slice(0, 300) } : null;
    case 'here': return sp ? { t: 'here', space: sp, on: e.on === true } : null;
    case 'focus': return { t: 'focus', on: e.on === true, ...(Number.isInteger(e.mins) && e.mins > 0 && e.mins <= 600 ? { mins: e.mins } : {}), ...(Number.isInteger(e.until) && e.until > 0 && e.until < 1e14 ? { until: e.until } : {}) };
    case 'nudge': return sp && typeof e.goal === 'string' && ID_RE.test(e.goal) && ['hit', 'miss', 'cheer', 'remind'].includes(e.kind) ? { t: 'nudge', space: sp, goal: e.goal, kind: e.kind } : null;
    case 'cheer': return sp && typeof e.ref === 'string' && ID_RE.test(e.ref) ? { t: 'cheer', space: sp, ref: e.ref } : null;
    default: return null;
  }
}

/** For the route's description of what a space can hold (and the docs). */
export const SPACE_PARTS = Object.freeze(Object.keys(PARTS));
