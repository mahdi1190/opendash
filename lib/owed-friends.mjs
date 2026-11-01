// lib/owed-friends.mjs - Owed to me, shared with a friend who is on Freeflo too. Sensitive: read this before changing it.
//
// One person's part of one split, sent to that person, because the owner pressed Send on a screen showing exactly what goes:
//   owed:share  {ref, what, amount, cur, date, alt?: {amount, cur}}   what they owe you. Nothing else exists to send: no other
//                                                                     person, no total, no bank payment, no merchant, no note.
//   owed:paid   {ref, on}                                             they tapped "I've paid" (or Undo): a question on your page, never a mark
//   owed:close  {ref, why: paid|gone}                                 you marked it paid, or took it back: their card says so
//
// RULES (docs/dev/FRIENDS.md section 9, the sensitive tier):
//  - shareBody() is the ONLY thing that builds what goes out, from named fields. It never copies a thing or a line.
//  - `ref` is a fresh random id per person per split, so two friends cannot tell they were on the same split by comparing.
//  - Sent only from server/routes/owed.mjs, only from a press. /api/friends/send, /publish and /feed refuse these kinds,
//    the assistant has no tool for them, and nothing here runs on a timer or on a bank match by itself.
//  - The engine's own check runs on every send: a friend who is removed, blocked, frozen or "stopped" gets nothing, and
//    what is still in the outbox for them is dropped with the friendship.
//  - What comes in is untrusted: strict schemas (unknown fields dropped, wrong shape drops the message), checked again
//    here; a kind an older version does not know is dropped by that version. owed:paid counts only from the friend the
//    ref was sent to, and the amount in the question is your own figure, never theirs. The page draws it all as text.
//  - Friends' shares live in owed.json (`inbox`, your own devices only, end-to-end). They never reach the assistant.

import { defineKind, S } from './friends/core.mjs';
import { randomBytes } from 'node:crypto';
import { mutate, readStore, undoChange, cleanInboxEntry } from './owed.mjs';

const MONEY = () => S.num(0.01, 1e7);
export const SHARE_SCHEMA = S.obj({ ref: S.id(), what: S.str(80), amount: MONEY(), cur: S.str(3), date: S.day(), alt: S.opt(S.obj({ amount: MONEY(), cur: S.str(3) })) });
export const PAID_SCHEMA = S.obj({ ref: S.id(), on: S.bool() });
export const CLOSE_SCHEMA = S.obj({ ref: S.id(), why: S.oneOf(['paid', 'gone']) });
defineKind('owed:share', SHARE_SCHEMA, { store: 'handler', scope: 'owed', passive: true, max: 512 });
defineKind('owed:paid', PAID_SCHEMA, { store: 'handler', scope: 'owed', passive: true, max: 128 });
defineKind('owed:close', CLOSE_SCHEMA, { store: 'handler', scope: 'owed', passive: true, max: 128 });
export const isOwedKind = (kind) => typeof kind === 'string' && kind.startsWith('owed:');

const newRef = () => 's' + randomBytes(12).toString('hex');
const left = (l) => Math.max(0, Math.round((l.owes - l.payments.reduce((a, p) => a + p.amount, 0)) * 100) / 100);
/** Every field that leaves, by name. what: the person's own wording from the screen, else the thing's title. */
export function shareBody(t, l, { ref, what, home }) {
  const amount = left(l);
  const body = { ref, what: String(what || t.title).slice(0, 80), date: t.date };
  if (t.fx && Number(l.fx) > 0) { body.amount = Math.round(Number(l.fx) * (amount / l.owes) * 100) / 100; body.cur = t.fx.cur; body.alt = { amount, cur: home }; } else { body.amount = amount; body.cur = home; }
  return body;
}

export function createOwedFriends({ dataDir, friends, home = () => 'GBP', today = () => new Date().toISOString().slice(0, 10), log = () => {}, emit = () => {} }) {
  const engine = () => { const f = friends(); return f && typeof f.send === 'function' ? f : null; };
  const quiet = (fn) => (...a) => Promise.resolve(fn(...a)).catch((e) => { log('warn', `owed: a friend's message was not handled (${(e && e.code) || 'error'})`); });

  /** The owner pressed Send. -> {ref, sent, queued, name} or {error, status}. */
  async function share({ id, key, friend, what }) {
    const fr = engine();
    if (!fr) return { error: 'Friends isn’t ready yet. Try again in a moment.', status: 409 };
    const f = typeof friend === 'string' ? await fr.friend(friend) : null;
    if (!f || f.status !== 'friend') return { error: 'They aren’t your friend on Freeflo any more, so nothing was sent.', status: 400 };
    const r = await mutate(dataDir, 'Share with a friend', (St, touch) => {
      const t = St.things[id]; const l = t && t.lines.find(x => x.key === key);
      if (!t || !l || t.kind !== 'split') return { error: 'That is gone.', write: false };
      if (left(l) <= 0.004 || l.off) return { error: 'That is paid already, so there is nothing to share.', write: false };
      const had = Object.entries(St.shares).find(([, x]) => x.id === id && x.key === key && x.friend === f.id);
      const ref = had ? had[0] : newRef();
      touch('shares', ref);
      St.shares[ref] = { id, key, friend: f.id, at: new Date().toISOString(), what: String(what || '').slice(0, 80) };
      return { ref, body: shareBody(t, l, { ref, what, home: home() }) };
    }, { home: home() });
    if (r.error) return { error: r.error, status: 400 };
    let sent;
    try { sent = await fr.send(f.id, 'owed:share', r.body); }
    catch (e) { if (r.undo) await undoChange(dataDir, r.undo, { home: home() }).catch(() => {}); return { error: 'That could not be sent just now. Try again in a moment.', status: 502 }; }
    if (!sent || !sent.id) {   // the engine's check said no: removed, stopped, or sharing with them is off
      if (r.undo) await undoChange(dataDir, r.undo, { home: home() }).catch(() => {});
      return { error: `Nothing was sent: sharing with ${f.nick || f.name || 'them'} is turned off. You can change that in Friends.`, status: 400 };
    }
    log('info', 'owed: one share sent');
    return { ref: r.ref, sent: sent.sent, queued: sent.queued };
  }
  /** Take one back (the owner pressed Stop sharing). */
  async function stop(ref) {
    const St = await readStore(dataDir, { home: home() });
    const x = St.shares[ref];
    if (!x) return { error: 'That isn’t shared any more.', status: 400 };
    const r = await mutate(dataDir, 'Stop sharing', (S2, touch) => { touch('shares', ref); delete S2.shares[ref]; return {}; }, { home: home() });
    const fr = engine();
    if (fr) await fr.send(x.friend, 'owed:close', { ref, why: 'gone' }).catch(() => {});
    return { undo: r.undo };
  }
  /**
   * After a press that settles or deletes (mark paid, Yes, settle up, write off, delete): tell the friends it was shared with, so
   * their card is not left out of date. The scan's automatic marks do not come here. -> how many.
   */
  async function closeSettled() {
    const St = await readStore(dataDir, { home: home() });
    const done = [];
    for (const [ref, x] of Object.entries(St.shares)) {
      const t = St.things[x.id]; const l = t && t.lines.find(y => y.key === x.key);
      if (!l || l.off) done.push({ ref, friend: x.friend, why: 'gone' });
      else if (left(l) <= 0.004) done.push({ ref, friend: x.friend, why: 'paid' });
    }
    if (!done.length) return 0;
    await mutate(dataDir, 'Shared', (S2) => { for (const d of done) delete S2.shares[d.ref]; return {}; }, { home: home() });
    const fr = engine();
    if (fr) for (const d of done) await fr.send(d.friend, 'owed:close', { ref: d.ref, why: d.why }).catch(() => {});
    return done.length;
  }

  /* ---------- on the other side: what a friend shared with you ---------- */
  const inboxKey = (from, ref) => `${from}|${ref}`;
  /** You tapped "I've paid" (or Undo): only the ref and yes or no go back. */
  async function sayPaid({ from, ref, on }) {
    const fr = engine();
    if (!fr) return { error: 'Friends isn’t ready yet. Try again in a moment.', status: 409 };
    const f = await fr.friend(from);
    if (!f || f.status !== 'friend') return { error: 'They aren’t your friend on Freeflo any more, so nothing was sent.', status: 400 };
    const r = await mutate(dataDir, 'I’ve paid', (St, touch) => {
      const k = inboxKey(from, ref), e = St.inbox[k];
      if (!e) return { error: 'That has gone.', write: false };
      touch('inbox', k); St.inbox[k] = { ...e, said: on ? today() : '' };
      return {};
    }, { home: home() });
    if (r.error) return { error: r.error, status: 400 };
    const sent = await fr.send(from, 'owed:paid', { ref, on: on !== false }).catch(() => null);
    if (!sent || !sent.id) { if (r.undo) await undoChange(dataDir, r.undo, { home: home() }).catch(() => {}); return { error: 'That could not be sent just now. Try again in a moment.', status: 502 }; }
    return { queued: sent.queued };
  }
  async function hide({ from, ref }) {
    return mutate(dataDir, 'Hide', (St, touch) => { const k = inboxKey(from, ref); if (!St.inbox[k]) return { error: 'That has gone.', write: false }; touch('inbox', k); delete St.inbox[k]; return {}; }, { home: home() });
  }

  async function onShare(msg, friend) {
    const b = msg && msg.b;
    if (msg.revoked || !b || !friend || !friend.id) return;
    const entry = cleanInboxEntry({ from: friend.id, ref: b.ref, what: b.what, amount: b.amount, cur: b.cur, date: b.date, alt: b.alt, at: msg.at });
    if (!entry) return;
    await mutate(dataDir, 'From a friend', (St) => {
      const k = inboxKey(friend.id, b.ref), prev = St.inbox[k];
      const mine = Object.keys(St.inbox).filter(x => x.startsWith(friend.id + '|'));
      if (!prev && (mine.length >= 100 || Object.keys(St.inbox).length >= 500)) return { write: false };
      St.inbox[k] = { ...entry, ...(prev && prev.said ? { said: prev.said } : {}) };
      return {};
    }, { home: home() });
    emit({ type: 'inbox' });
  }
  async function onPaid(msg, friend) {
    const b = msg && msg.b;
    if (msg.revoked || !b || !friend) return;
    const r = await mutate(dataDir, 'Paid, they say', (St, touch) => {
      const x = St.shares[b.ref];
      if (!x || x.friend !== friend.id) return { write: false };   // not theirs to answer: someone else's share, or nothing
      const pid = 'fr-' + b.ref;
      const t = St.things[x.id]; const l = t && t.lines.find(y => y.key === x.key);
      if (!b.on) { if (!St.proposed[pid]) return { write: false }; touch('proposed', pid); delete St.proposed[pid]; return {}; }
      if (!t || !l || l.off || left(l) <= 0.004) return { write: false };
      touch('proposed', pid);
      St.proposed[pid] = { id: x.id, key: x.key, amount: left(l), date: today(), note: '', via: 'friend', at: new Date().toISOString() };
      return {};
    }, { home: home() });
    if (r && r.S) emit({ type: 'paid' });
  }
  async function onClose(msg, friend) {
    const b = msg && msg.b;
    if (msg.revoked || !b || !friend) return;
    await mutate(dataDir, 'Closed by a friend', (St) => {
      const k = inboxKey(friend.id, b.ref), e = St.inbox[k];
      if (!e) return { write: false };
      St.inbox[k] = { ...e, closed: b.why };
      return {};
    }, { home: home() });
    emit({ type: 'inbox' });
  }
  /** A friendship ended: what they shared goes, what you shared with them is forgotten, and any question from them. */
  async function forget(id) {
    await mutate(dataDir, 'A friend left', (St) => {
      let n = 0;
      for (const k of Object.keys(St.inbox)) if (St.inbox[k].from === id) { delete St.inbox[k]; n++; }
      for (const [ref, x] of Object.entries(St.shares)) if (x.friend === id) { delete St.shares[ref]; delete St.proposed['fr-' + ref]; n++; }
      return n ? {} : { write: false };
    }, { home: home() });
  }
  /** A friend renewed their keys and has a new id: the same person. */
  async function moved(from, to) {
    await mutate(dataDir, 'A friend moved', (St) => {
      let n = 0;
      for (const [k, e] of Object.entries(St.inbox)) if (e.from === from) { delete St.inbox[k]; St.inbox[inboxKey(to, e.ref)] = { ...e, from: to }; n++; }
      for (const x of Object.values(St.shares)) if (x.friend === from) { x.friend = to; n++; }
      return n ? {} : { write: false };
    }, { home: home() });
  }
  let attached = null;
  function attach() {
    const fr = engine();
    if (!fr || attached === fr) return !!fr;
    attached = fr;
    fr.on('owed:share', quiet(onShare));
    fr.on('owed:paid', quiet(onPaid));
    fr.on('owed:close', quiet(onClose));
    if (typeof fr.onRemoved === 'function') fr.onRemoved(quiet((friend) => forget(friend && friend.id)));
    if (typeof fr.onRekeyed === 'function') fr.onRekeyed(quiet(moved));
    return true;
  }
  return { attach, share, stop, closeSettled, sayPaid, hide, onShare, onPaid, onClose, forget, moved };
}
