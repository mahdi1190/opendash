// server/routes/together.mjs - Together (2.17): shared spaces with friends, over the friends channel.
//
//   GET  /api/together                 -> {ok, channel, me: {id, name}|null, friends: [{id, name, presence}],
//                                         spaces: [{id, status, invitedBy, at, value}], limits}
//   POST /api/together/space           {id, name, kind, icon?, color?, members: [friendId], extra?} -> {ok, id, value}
//   POST /api/together/edit            {space, ops: [{op: 'set'|'del'|'move', path, value?, before?}]} -> {ok, value, changed}
//   POST /api/together/status          {space, status: 'joined'|'declined'|'left'} -> {ok, status}
//   POST /api/together/forget          {space} -> {ok, removed}   (only after leaving or declining)
//   POST /api/together/live            {space?, event, to?} -> {ok, sent}   (Plan together cursors, focus, nudges)
//   POST /api/together/hello           -> {ok, asked}   (compare copies with every member now)
//   POST /api/together/send            {to: [friendId], kind: cheer|focus|quest|challenge, body} -> {ok, sent, queued}
//                                      (only to friends you share a space with; the documented event kinds, FRIENDS.md section 9)
//   GET  /api/together/layers?scope=calendar|tasks -> {ok, available, friends: [{id, name, tz?, items}]}
//                                      what each friend shares with you (agent 'perms': ctx.friendsData), as
//                                      calendar {t0, t1, title?} (absolute ms: the page shows them on its own clock)
//                                      or, from an older sender and for all-day events, {day, s, e, allDay?, title?}
//                                      (their dates and wall times, minutes); tz = the friend's time zone when
//                                      they send it; at = when they sent that copy (ms); tasks {due, title, status, time?}
//
// Open tabs hear `event: together` on /api/events: {type: 'spaces', spaces: [id], from, invited},
// {type: 'live', from, event} (a checked live event from a friend) or {type: 'msg', kind, from, b}
// (a cheer or focus message, already checked against its schema by the friends engine).
//
// THE OWNER'S RULES (24 Oct 2026): everything a friend sends is untrusted
// (lib/friends/spaces.mjs checks every register: parts, fields, types, caps,
// members, authors, rates); nothing here ever reaches Claude, the MCP, the
// assistant, connectors or the actions layer (the spaces are their own file,
// never the state); nothing a friend sends creates or changes one of your own
// tasks: assignments wait for Accept, invitations for Join.
// Logs carry counts only, never names or text.

import { join } from 'node:path';
import { promises as fsp } from 'node:fs';
import { HttpError } from '../http.mjs';
import { readJson, writeJson } from '../../lib/fsutil.mjs';
import { createSpaces, ID_RE, KINDS, LIMITS, SPACE_KIND_PREFIX, LIVE_KIND } from '../../lib/friends/spaces.mjs';
import { defineKind, S } from '../../lib/friends/core.mjs';
import { permsCalTimes } from '../../lib/friends/share.mjs';
import { readDoc, retiredIds } from '../../lib/friends/store.mjs';
import { clockValidZone } from '../../lib/clock.mjs';

// The kinds Together speaks on the friends channel (docs/dev/FRIENDS.md section 9). Defined at the top level so
// they exist before the friends engine starts. 'space:*' carries register batches: 'handler' (the engine checks
// the schema and hands each batch to the spaces core, storing nothing itself: a batch the spaces core refuses,
// such as a friend writing outside their space, is never kept anywhere, and 'event' would grow the feed with
// every batch); passive: a list being kept in step is not friendship XP by itself. The spaces file keeps the
// real copy.
defineKind('space:*', S.obj({ v: S.int(1, 1), t: S.oneOf(['regs', 'hello', 'want']), d: S.opt(S.str(30000)), h: S.opt(S.str(64)) }),
  { store: 'handler', scope: 'space', passive: true, max: 32 * 1024 });
defineKind(LIVE_KIND, S.obj({
  t: S.oneOf(['cursor', 'edit', 'here', 'focus', 'nudge', 'cheer']), space: S.opt(S.id()),
  x: S.opt(S.num(0, 1)), y: S.opt(S.num(0, 1)), sel: S.opt(S.id()), card: S.opt(S.id()), text: S.opt(S.str(300)),
  on: S.opt(S.bool()), mins: S.opt(S.int(1, 600)), until: S.opt(S.ms()), goal: S.opt(S.id()),
  kind: S.opt(S.oneOf(['hit', 'miss', 'cheer', 'remind'])), ref: S.opt(S.id()),
}), { store: 'live', scope: 'space', passive: true, max: 1024 });

const SCOPES = new Set(['calendar', 'tasks']);
const SEND_KINDS = new Set(['cheer', 'focus', 'quest', 'challenge']);

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const file = join(root, 'friends', 'spaces.json');
  const clockFile = join(root, 'friends', 'spaces-clock.json');
  // Renewed keys (docs/dev/FRIENDS.md section 15): old key -> current id, from the friends engine's verified
  // renewals (friends.json `moved`, kept 90 days, and my own retired ids). Kept here too (this computer only),
  // so a space still knows a friend under the key they joined with after the engine forgets the move.
  const aliasFile = join(root, 'friends', 'spaces-alias.json');
  const ALIAS_ID = /^[0-9a-f]{16}$/;
  let aliasMap = new Map();
  async function refreshAliases() {
    try {
      const saved = await readJson(aliasFile, { fallback: null }).catch(() => null);
      const m = new Map();
      if (saved && typeof saved === 'object' && saved.alias && typeof saved.alias === 'object') {
        for (const [k, v] of Object.entries(saved.alias).slice(0, 2000)) if (ALIAS_ID.test(k) && typeof v === 'string' && ALIAS_ID.test(v) && k !== v) m.set(k, v);
      }
      const doc = await readDoc(root, 'friends').catch(() => null);
      for (const [k, mv] of Object.entries((doc && doc.moved) || {})) {
        if (ALIAS_ID.test(k) && mv && !mv.conflict && typeof mv.to === 'string' && ALIAS_ID.test(mv.to)) m.set(k, mv.to);
        else if (mv && mv.conflict) m.delete(k);                      // renewed twice: the friendship is paused
      }
      const me = meCache && meCache.id;
      if (me && ALIAS_ID.test(me)) for (const r of await retiredIds(root).catch(() => [])) if (r && ALIAS_ID.test(r.id || '') && r.id !== me) m.set(r.id, me);
      // follow chains (renewed more than once) to the current id
      for (const k of [...m.keys()]) { let v = m.get(k), n = 0; while (m.has(v) && n++ < 8) v = m.get(v); if (v === k) m.delete(k); else m.set(k, v); }
      const before = JSON.stringify([...aliasMap]);
      aliasMap = m;
      if (JSON.stringify([...m]) !== before) await writeJson(aliasFile, { v: 1, alias: Object.fromEntries(m) }).catch(() => {});
    } catch { /* keep what we have */ }
  }
  const emit = (data) => { try { ctx.liveSync?.emit('together', data); } catch { /* no open tabs */ } };

  // The friends channel, cached: me() and list() answer synchronously for the spaces core.
  let fr = null, wired = false, meCache = null, listCache = [];
  const friendsApi = () => (ctx.friends && typeof ctx.friends.send === 'function' ? ctx.friends : null);
  async function refreshFriends() {
    const f = friendsApi(); if (!f) return;
    try { if (typeof f.ready === 'function') await f.ready(); } catch { /* not ready: use what we have */ }
    try { const m = await f.me(); meCache = m && m.id ? { id: String(m.id), name: String(m.name || '').slice(0, 80) } : null; } catch { /* keep */ }
    try {
      const l = await f.list();
      listCache = (Array.isArray(l) ? l : []).filter(x => x && x.id && (x.status === 'friend' || x.status == null))
        .map(x => ({ id: String(x.id), name: String(x.nick || x.name || '').slice(0, 80), presence: typeof x.presence === 'string' ? x.presence : (x.presence && x.presence.s) || null }));
    } catch { /* keep */ }
  }

  ctx.togetherSpaces = () => spaces;   // lib/friends/live.mjs: who shares a group with me
  const spaces = createSpaces({
    store: {
      read: () => readJson(file, { fallback: null }).catch(() => null),
      write: (obj) => writeJson(file, obj),
      stamp: async () => { try { const st = await fsp.stat(file); return `${st.size}:${st.mtimeMs}`; } catch { return 'none'; } },
    },
    local: {
      read: () => readJson(clockFile, { fallback: null }).catch(() => null),
      write: (obj) => writeJson(clockFile, obj),
    },
    log: (lvl, msg) => ctx.log?.(lvl, msg),
    onChange: (c) => emit({ type: 'spaces', spaces: c.spaces, from: c.from || null, invited: !!c.invited }),
    onLive: (l) => emit({ type: 'live', from: l.from, event: l.event }),
    alias: (k) => aliasMap.get(k) || null,
  });

  async function wire() {
    const f = friendsApi();
    if (!f || wired) return !!f;
    wired = true; fr = f;
    await refreshFriends();
    await refreshAliases();
    spaces.setChannel({
      send: (to, kind, body) => fr.send(to, kind, body),
      me: () => meCache,
      list: () => listCache,
    });
    // Handlers run on the device that received the message; the spaces core is idempotent.
    const take = (msg, friend) => {
      const from = (friend && friend.id) || (msg && msg.from);
      if (!msg || !from) return;
      spaces.receive(from, msg.k, msg.b).catch(() => {});
    };
    try { fr.on('space:*', take); fr.on(LIVE_KIND, take); } catch (e) { ctx.log?.('warn', 'together: could not listen on the friends channel'); }
    // Cheers and focus invitations: shown at once in open tabs (the friends feed keeps them too).
    const tell = (msg, friend) => { const from = (friend && friend.id) || (msg && msg.from); if (msg && from && msg.b && typeof msg.b === 'object') emit({ type: 'msg', kind: msg.k, from, b: msg.b }); };
    for (const k of SEND_KINDS) { try { fr.on(k, tell); } catch { /* an older engine */ } }
    try { if (typeof fr.onRemoved === 'function') fr.onRemoved((friend) => { if (friend && friend.id) spaces.friendRemoved(friend.id).catch(() => {}); }); } catch { /* older engine */ }
    try { if (typeof fr.onChange === 'function') fr.onChange(() => { refreshFriends().then(refreshAliases).catch(() => {}); }); } catch { /* older engine */ }
    // A friend renewed their keys, or I renewed mine (here or on another device): the spaces know them by their old key.
    try { if (typeof fr.onRekeyed === 'function') fr.onRekeyed(() => refreshFriends().then(refreshAliases)); } catch { /* older engine */ }
    try { if (typeof fr.onRotated === 'function') fr.onRotated(() => { refreshFriends().then(refreshAliases).catch(() => {}); }); } catch { /* older engine */ }
    return true;
  }

  let helloTimer = null;
  app.onReady(async () => {
    if (await wire()) {
      setTimeout(() => { spaces.hello().catch(() => {}); }, 30 * 1000).unref?.();
      helloTimer = setInterval(() => { spaces.hello().catch(() => {}); }, LIMITS.helloEveryMs);
      helloTimer.unref?.();
    }
  });
  app.onClose?.(async () => { clearInterval(helloTimer); await spaces.flush().catch(() => {}); });

  const need = (cond, msg) => { if (!cond) throw new HttpError(400, msg); };
  const spaceId = (v) => { need(typeof v === 'string' && ID_RE.test(v), 'space must be a space id'); return v; };

  app.route({
    path: '/api/together', method: 'GET', methodError: 'GET only',
    handler: async () => {
      const ok = await wire();
      if (ok) await refreshFriends();
      return {
        ok: true, channel: spaces.hasChannel() && !!meCache, me: meCache, friends: listCache,
        spaces: await spaces.list(), limits: { kinds: KINDS }, stats: { ...spaces.stats },
      };
    },
  });

  app.route({
    path: '/api/together/space', method: 'POST', methodError: 'POST only', maxBody: 64 * 1024,
    handler: async (c) => {
      await wire(); await refreshFriends();
      const b = await c.body();
      const id = spaceId(b.id);
      need(typeof b.name === 'string' && b.name.trim() && b.name.length <= 80, 'name must be up to 80 characters');
      need(KINDS.includes(b.kind || 'list'), `kind must be one of ${KINDS.join(', ')}`);
      const known = new Map(listCache.map(f => [f.id, f]));
      const members = (Array.isArray(b.members) ? b.members : []).slice(0, 49).map(String).filter(x => known.has(x)).map(x => known.get(x));
      const r = await spaces.create({ id, name: b.name.trim(), kind: b.kind || 'list', icon: typeof b.icon === 'string' ? b.icon.slice(0, 32) : null, color: typeof b.color === 'string' ? b.color.slice(0, 7) : null, members, extra: b.extra && typeof b.extra === 'object' ? b.extra : null });
      ctx.log?.('info', `together: space made (${members.length} invited)`);
      return { ok: true, ...r };
    },
  });

  app.route({
    path: '/api/together/edit', method: 'POST', methodError: 'POST only', maxBody: 256 * 1024,
    handler: async (c) => {
      await wire();
      const b = await c.body();
      const id = spaceId(b.space);
      need(Array.isArray(b.ops) && b.ops.length > 0 && b.ops.length <= 2000, 'ops must be a list of 1 to 2000 changes');
      for (const o of b.ops) need(o && ['set', 'del', 'move'].includes(o.op) && Array.isArray(o.path), 'each op needs op (set, del or move) and a path');
      return { ok: true, ...(await spaces.edit(id, b.ops)) };
    },
  });

  app.route({
    path: '/api/together/status', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await wire();
      const b = await c.body();
      return { ok: true, ...(await spaces.setStatus(spaceId(b.space), String(b.status || ''))) };
    },
  });

  app.route({
    path: '/api/together/forget', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      return { ok: true, ...(await spaces.forget(spaceId(b.space))) };
    },
  });

  app.route({
    path: '/api/together/live', method: 'POST', methodError: 'POST only', maxBody: 4096, quiet: true,
    handler: async (c) => {
      await wire();
      const b = await c.body({ max: 4096 });
      const id = b.space == null ? null : spaceId(b.space);
      return { ok: true, ...(await spaces.live(id, b.event, Array.isArray(b.to) ? b.to.slice(0, 50) : null)) };
    },
  });

  app.route({
    path: '/api/together/hello', method: 'POST', methodError: 'POST only',
    handler: async () => { await wire(); return { ok: true, ...(await spaces.hello()) }; },
  });

  app.route({
    path: '/api/together/send', method: 'POST', methodError: 'POST only', maxBody: 8192,
    handler: async (c) => {
      const ok = await wire();
      const b = await c.body({ max: 8192 });
      need(SEND_KINDS.has(b.kind), 'kind must be cheer, focus, quest or challenge');
      if (!ok) throw new HttpError(409, 'Friends are not set up on this computer yet');
      const mine = new Set(await spaces.spaceFriends());
      const to = (Array.isArray(b.to) ? b.to : [b.to]).map(String).filter(x => mine.has(x)).slice(0, 50);
      if (!to.length) return { ok: true, sent: 0, queued: 0 };
      const r = await fr.send(to, b.kind, b.body && typeof b.body === 'object' ? b.body : {});
      return { ok: true, sent: (r && r.sent) || 0, queued: (r && r.queued) || 0 };
    },
  });

  // What friends share with you for the calendar and task layers (agent 'perms'): only what THEY chose to share.
  app.route({
    path: '/api/together/layers', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const ok = await wire();
      const scope = String(c.query.get('scope') || 'calendar');
      need(SCOPES.has(scope), 'scope must be calendar or tasks');
      if (!ok) return { ok: true, available: false, friends: [] };
      await refreshFriends();
      // Agent 'perms': ctx.friendsData(friendId, scope) -> {mode, at, until?, data: {items: [...]}} | null.
      const get = typeof ctx.friendsData === 'function' ? ctx.friendsData : null;
      if (!get) return { ok: true, available: false, friends: [] };
      const out = [];
      for (const f of listCache.slice(0, 50)) {
        let v = null;
        try { v = await get(f.id, scope); } catch { v = null; }
        const items = scope === 'calendar' ? calendarItems(v) : taskItems(v);
        const tz = scope === 'calendar' ? zoneOf(v) : '';
        const at = v && Number.isInteger(v.at) && v.at > 0 && v.at < 1e14 ? v.at : 0;
        if (items && items.length) out.push({ id: f.id, name: f.name, ...(tz ? { tz } : {}), ...(at ? { at } : {}), items });
      }
      return { ok: true, available: true, friends: out };
    },
  });

  app.route({ prefix: '/api/together/', method: '*', handler: (c) => c.json(404, { error: 'unknown together route' }) });
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const hmMin = (s) => (HM_RE.test(String(s || '')) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : null);
const addDay = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
/** The friend's time zone from their shared calendar (checked again: untrusted), or ''. */
function zoneOf(rec) {
  const z = rec && rec.data && typeof rec.data.tz === 'string' ? rec.data.tz : '';
  return z && z.length <= 64 && /^[A-Za-z0-9_+\-/]+$/.test(z) && clockValidZone(z) ? z : '';
}
/**
 * A friend's shared calendar (perms 'calendar': {date, until?, start?, end?, allDay?, startUtc?, endUtc?, title?}):
 * a timed event with its instants as {t0, t1} (ms; the page puts them on its own clock); an all-day event, or a
 * timed one from an older sender (wall times only), as busy minutes per day of their dates.
 */
function calendarItems(rec) {
  const list = rec && rec.data && Array.isArray(rec.data.items) ? rec.data.items : null;
  if (!list) return null;
  const out = [];
  for (const e of list.slice(0, 1200)) {
    if (!e || typeof e !== 'object' || !DAY_RE.test(String(e.date || ''))) continue;
    const title = typeof e.title === 'string' ? { title: e.title.slice(0, 120) } : {};
    const at = e.allDay === true ? null : permsCalTimes(e);
    if (at) { out.push({ t0: at.t0, t1: at.t1, ...title }); if (out.length >= 1500) break; continue; }
    const until = DAY_RE.test(String(e.until || '')) && e.until > e.date ? e.until : e.date;
    if (e.allDay === true) { for (let d = e.date, i = 0; d <= until && i < 14; d = addDay(d, 1), i++) out.push({ day: d, s: 0, e: 1440, allDay: true, ...title }); }
    else {
      const s = hmMin(e.start), en = hmMin(e.end);
      if (s == null || en == null) continue;
      if (until === e.date) { if (en > s) out.push({ day: e.date, s, e: en, ...title }); }
      else {
        out.push({ day: e.date, s, e: 1440, ...title });
        for (let d = addDay(e.date, 1), i = 0; d < until && i < 14; d = addDay(d, 1), i++) out.push({ day: d, s: 0, e: 1440, ...title });
        if (en > 0) out.push({ day: until, s: 0, e: en, ...title });
      }
    }
    if (out.length >= 1500) break;
  }
  return out;
}
/** A friend's shared tasks (perms 'tasks'): only what the faint layer shows (open, with a date). */
function taskItems(rec) {
  const list = rec && rec.data && Array.isArray(rec.data.items) ? rec.data.items : null;
  if (!list) return null;
  const out = [];
  for (const t of list.slice(0, 500)) {
    if (!t || typeof t !== 'object' || t.status === 'done' || !DAY_RE.test(String(t.due || ''))) continue;
    out.push({ id: typeof t.id === 'string' ? t.id.slice(0, 64) : '', due: t.due, title: typeof t.title === 'string' ? t.title.slice(0, 200) : '', status: t.status === 'doing' ? 'doing' : 'todo', ...(HM_RE.test(String(t.time || '')) ? { time: t.time } : {}) });
  }
  return out;
}
