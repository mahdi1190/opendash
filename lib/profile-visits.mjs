// lib/profile-visits.mjs - friends' visits to your profile card (OpenDash 2.18, agent 'you'). COUNTS ONLY.
//
// When you open a friend's card (the Friends tab, their page), your page sends them the friends kind
// 'profile:visit' {d: 'YYYY-MM-DD'} at most once a day (97-profile-1core.js profileVisitFriend; Settings >
// Profile > What friends see > "Count my visits" turns it off). Its scope is 'profile', so it only goes to
// friends your profile goes to (the perms policy decides), and it is passive (no friendship XP).
//
// The receiving side keeps NO name and NO friend id: one entry per day and visitor under a one-way key,
// SHA-256("opendash-profile-visit-v1\n" + friend id + "\n" + day) (16 hex), so the same friend counts once a
// day, on every device (the key is the same everywhere), and the file says how many, never who. Kept a
// year (400 days). Shown on your own card only: "12 visits from friends · 3 this week".
//
// <data>/friends/profile-visits.json (synced between your own devices, end-to-end encrypted only:
// lib/sync/manifest.mjs 'profile-visits'; keyed entry by entry so two devices merge):
//   {v: 1, days: {'YYYY-MM-DD': {key: 1}}}
//
// Nothing here reaches the state file, Claude, the MCP, an action or People; nothing a friend sends is text.
//
//   createProfileVisits({dataDir, friends: () => engine | null, emit(data), zone() -> IANA | null, log, now})
//     .attach()     listen on the friends channel (once the engine exists; safe to call again)
//     .view()       -> {total, week, today}

import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { defineKind, S } from './friends/core.mjs';
import { readJson, writeJson, withLock } from './fsutil.mjs';

export const VISIT_KIND = 'profile:visit';
defineKind(VISIT_KIND, S.obj({ d: S.day() }), { store: 'handler', scope: 'profile', passive: true, max: 64 });

const KEEP_DAYS = 400;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEY_RE = /^[0-9a-f]{16}$/;
const DAY_MS = 86400000;

/** A clean document: only day keys and hex keys, a value of 1 each. */
function normDoc(raw) {
  const out = { v: 1, days: {} };
  const days = raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days) ? raw.days : {};
  for (const [d, m] of Object.entries(days)) {
    if (!DAY_RE.test(d) || !m || typeof m !== 'object' || Array.isArray(m)) continue;
    const keep = {};
    for (const k of Object.keys(m)) if (KEY_RE.test(k)) keep[k] = 1;
    if (Object.keys(keep).length) out.days[d] = keep;
  }
  return out;
}
const isoAdd = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY_MS).toISOString().slice(0, 10);
export function visitKey(friendId, day) {
  return createHash('sha256').update(`opendash-profile-visit-v1\n${String(friendId)}\n${String(day)}`).digest('hex').slice(0, 16);
}

export function createProfileVisits({ dataDir, friends, emit = () => {}, zone = () => null, log = () => {}, now = Date.now }) {
  const file = join(resolve(dataDir), 'friends', 'profile-visits.json');
  const fmts = new Map();
  function today() {
    const z = zone() || '';
    let f = fmts.get(z);
    if (!f) {
      try { f = new Intl.DateTimeFormat('en-CA', { timeZone: z || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }); }
      catch { f = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
      fmts.set(z, f);
    }
    return f.format(new Date(Number(now())));
  }
  async function read() { return normDoc(await readJson(file, { fallback: null }).catch(() => null)); }
  async function onVisit(msg, friend) {
    if (!msg || msg.revoked || !friend || typeof friend.id !== 'string' || friend.status !== 'friend') return;
    const b = msg.b && typeof msg.b === 'object' ? msg.b : null;
    const t = today();
    // the sender's day may differ from ours by a time zone: anything within a day either side counts, as today here
    if (!b || !DAY_RE.test(b.d || '') || b.d < isoAdd(t, -1) || b.d > isoAdd(t, 1)) return;
    const key = visitKey(friend.id, t);
    let added = false;
    await withLock(file, async () => {
      const doc = await read();
      const m = doc.days[t] || {};
      if (m[key]) return;
      m[key] = 1;
      doc.days[t] = m;
      const cut = isoAdd(t, -KEEP_DAYS);
      for (const d of Object.keys(doc.days)) if (d < cut) delete doc.days[d];
      await writeJson(file, doc);
      added = true;
    });
    if (added) { try { emit({ type: 'visit' }); } catch { /* no open tabs */ } }
  }
  async function view() {
    const doc = await read(), t = today(), weekFrom = isoAdd(t, -6), cut = isoAdd(t, -365);
    let total = 0, week = 0, td = 0;
    for (const [d, m] of Object.entries(doc.days)) {
      if (d < cut || d > isoAdd(t, 1)) continue;
      const n = Object.keys(m).length;
      total += n;
      if (d >= weekFrom) week += n;
      if (d === t) td += n;
    }
    return { total, week, today: td };
  }
  let attached = null;
  function attach() {
    const fr = typeof friends === 'function' ? friends() : null;
    if (!fr || typeof fr.on !== 'function' || attached === fr) return !!fr;
    attached = fr;
    fr.on(VISIT_KIND, (msg, friend) => onVisit(msg, friend).catch((e) => log('warn', `profile: a visit was not counted (${e && (e.code || 'error')})`)));
    return true;
  }
  return { attach, view, file };
}
