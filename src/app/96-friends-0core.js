/* ============================================================
   FRIENDS: the page's side of OpenDash Friends (owner: Friends;
   docs/dev/FRIENDS.md section 13). The Friends tab is 96-friends-1ui.js.

   window.Friends (stable, for agents 'profile', 'perms', 'together'):
     Friends.ready                       Promise: the first /api/friends answer
     Friends.me() / list() / get(id)     the last answer (views: no keys, no tokens)
     Friends.load(force)                 ask the server again -> Promise
     Friends.send(to, kind, body, {group})   -> Promise {id, sent, queued, skipped}
     Friends.publish(kind, body)         latest kinds (profile, share:<scope>) to every allowed friend
     Friends.unpublish(kind)             stop sharing it: taken back from every friend (they delete their copy)
     Friends.send(to, kind, null, {revoke: true})   take a latest / handler kind back from some friends
     Friends.on(kind, fn(msg, friend))   live messages while this page is open -> off()
                                         kind: exact, 'share:*' / 'space:*', or '*'
                                         (live kinds arrive as /api/events 'friends' {type: 'live'}: never stored)
     Friends.shared(id, kind)            what a friend shares now: Promise {at, b} | null
     Friends.feed({friend, kind, limit, before}) Promise [entry]   (before: the lc of the last one you have, for the next page)
     Friends.presence(id)                'online'|'focusing'|'travelling'|'away'|'offline'
     Friends.describe(kind, fn(entry, friend, me) -> {icon, text, tone?})   how a feed line reads
     Friends.registerPanel({id, order, where: 'friend'|'hangout', tab, zone, render(el, friend|data)})
                                         a section of a friend's page or of the hangout (2.19: tab: which Friends tab shows a
                                         'hangout' panel: 'friends'|'feed'|'shared'|'settings', default 'feed', 'none' = never;
                                         zone: where a 'friend' panel sits in the friend's detail: 'main'|'side'|'fold', default 'side')
     Friends.open(id)                    that friend's page
   friendsFeedPost({kind, text, icon, to?, body?, friend?, group?})  agent 'together'
   profileAvatarEl(friend, {size})       agent 'profile' defines it: the avatar element
   friendsNameForRelayKey(edPub)         a relay member's key -> friend's name, 'You' or null (Settings > Your relay)
   friendsRenewKeysDialog({device?})     Lock out a lost computer: new friend keys (FRIENDS.md section 15; 96-friends-1ui.js)
   friendsOfferLockOut(deviceName)       after a device is removed from sync: "Lock it out" (Sync may call it)
   friendsPresenceShare(on, state?)      Online status on / off for everyone (Privacy's "Turn it on")
   friendsSetName(name)                  the name friends see (Profile's "Your name" keeps it in step)
   frShellHeadOn(id) / frShellHeadMark(id)   the shared header draws this page's actions (see below)
   document 'opendash:identity-rotated'  {oldEd, newEd, role, source}: your keys were renewed (here or on another device)

   Every string from a friend is untrusted: this file and 96-friends-1ui.js
   put it on the page with textContent (or esc()), never as markup, and never
   load a URL or a picture a friend sent. Nothing here hands friend content to
   Claude, the assistant or any action.
   ============================================================ */
const _fr = {
  data: null, at: 0, loading: null, err: null, reloadT: 0, handlers: new Map(), describers: new Map(),
  panels: [], readyResolve: null, ready: null, pres: { last: '', at: 0, hiddenAt: 0 }, game: { key: '', at: 0, t: 0 },
  presenceLive: new Map(), seenCelebrate: new Set(), opened: false,
};
_fr.ready = new Promise((r) => { _fr.readyResolve = r; });

/* The page template's header actions (UX_BLUEPRINT.md 3; 14-shell.js draws a section's headerActions(view):
   one primary action and a More menu). Friends and Together declare theirs; the shell asking for them is
   what tells the page that the header draws them, so until then the page keeps its own buttons and no
   control is ever lost (SIMPLIFY_PLAN.md P9). */
const _frShellHead = new Set();
function frShellHeadMark(id) { _frShellHead.add(String(id)); }
function frShellHeadOn(id) { return _frShellHead.has(String(id)); }

async function _frApi(path, body, opts) {
  const o = opts || {};
  const init = body === undefined ? { method: 'GET', signal: o.signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: o.signal };
  const r = await fetch(path, init);
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || j.ok === false) {
    const e = new Error((j && typeof j.error === 'string' && j.error) || `Friends could not do that just now (${r.status}).`);
    e.code = j && j.code; e.status = r.status;
    throw e;
  }
  return j;
}
/** The friends data (cached 15 s; force to ask again). */
function friendsLoad(force) {
  if (_fr.loading) return _fr.loading;
  if (!force && _fr.data && Date.now() - _fr.at < 15000) return Promise.resolve(_fr.data);
  // Until Friends is first opened (or an identity exists), only peek: opening the tab is what makes your identity.
  const peek = !(_fr.opened || (_fr.data && _fr.data.me && _fr.data.me.id));
  _fr.loading = _frApi('/api/friends' + (peek ? '?peek=1' : '')).then((d) => {
    const before = _fr.data;
    _fr.data = d; _fr.at = Date.now(); _fr.err = null;
    if (_fr.readyResolve) { _fr.readyResolve(d); _fr.readyResolve = null; }
    _frAfterLoad(before, d);
    return d;
  }).catch((e) => { _fr.err = e; throw e; }).finally(() => { _fr.loading = null; });
  return _fr.loading;
}
function _frReloadSoon(ms) {
  clearTimeout(_fr.reloadT);
  _fr.reloadT = setTimeout(() => { friendsLoad(true).then(() => _frRepaint()).catch(() => {}); }, ms == null ? 300 : ms);
}
/** Repaint what shows friends: the Friends tab (in place) and the sidebar badge. */
function _frRepaint() {
  try {
    if (/^friends(:|$)/.test(String(state.view || '')) && typeof friendsPageRefresh === 'function') friendsPageRefresh();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof fdRepaintSoon === 'function') fdRepaintSoon();   // Whose / Shared with me when the friends list arrives or changes (96-friends-3data.js)
  } catch (e) { console.error('[friends] repaint', e); }
}
function _frAfterLoad(before, d) {
  // New friends since the last answer: a small celebration (once per friend, per page).
  if (!before || !d) return;
  const was = new Set((before.friends || []).filter(f => f.status === 'friend').map(f => f.id));
  for (const f of d.friends || []) {
    if (f.status !== 'friend' || was.has(f.id) || _fr.seenCelebrate.has(f.id)) continue;
    _fr.seenCelebrate.add(f.id);
    if (typeof gameMoment === 'function') gameMoment({ over: 'New friend', title: `You and ${friendName(f)} are now friends`, sub: 'Say hi with a cheer', icon: 'party-popper' });
    else toast(`You and ${friendName(f)} are now friends`, { icon: 'party-popper' });
  }
}
/** For Settings > Your relay (agent 'relay'): a member's identity key -> the friend's name, 'You', or null. */
function friendsNameForRelayKey(edPub) {
  const k = String(edPub || '');
  if (!k || !_fr.data) return null;
  if (_fr.data.me && _fr.data.me.ed === k) return 'You';
  const f = (_fr.data.friends || []).find(x => x.ed === k && (x.status === 'friend' || x.status === 'incoming' || x.status === 'requested'));
  return f ? friendName(f) : null;
}
window.friendsNameForRelayKey = friendsNameForRelayKey;
/** A friend's display name: the nickname you gave, else the name they chose (plain text: render with textContent). */
function friendName(f) { return String((f && (f.nick || (f.profile && f.profile.name) || f.name)) || 'Your friend'); }

/* ---------- live events from the server (/api/events 'friends', 86-live-sync.js) ---------- */
function _frRunHandlers(m, f) {
  const keys = [m.k];
  const i = m.k.indexOf(':');
  if (i > 0) keys.push(m.k.slice(0, i + 1) + '*');
  keys.push('*');
  for (const k of keys) for (const fn of _fr.handlers.get(k) || []) { try { fn(m, f); } catch (e) { console.error('[friends] handler', e); } }
}
function friendsOnEvent(d) {
  if (!d || typeof d !== 'object') return;
  // A live kind (Together's cursors and typing): handlers only, nothing to reload (it is never stored).
  if (d.type === 'live' && d.msg && typeof d.msg === 'object' && typeof d.msg.k === 'string' && typeof d.msg.from === 'string') {
    _frRunHandlers(d.msg, friendsGet(d.msg.from) || { id: d.msg.from, name: 'A friend' });
    return;
  }
  // This person's friend keys were renewed (here, or on another device: FRIENDS.md section 15). The relay
  // page and any other part of the page can listen: document 'opendash:identity-rotated' {oldEd, newEd, role, source}.
  if (d.type === 'identity-rotated') {
    const k = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v) ? v : null);
    try { document.dispatchEvent(new CustomEvent('opendash:identity-rotated', { detail: { oldEd: k(d.oldEd), newEd: k(d.newEd), role: ['owner', 'member', 'none'].includes(d.role) ? d.role : null, source: d.source === 'sync' ? 'sync' : 'here' } })); } catch (e) { /* old browser */ }
    if (d.source === 'sync') toast('You renewed your friend security on another computer. This one is up to date.', { icon: 'key-round' });
  }
  if (d.type === 'groups') { if (typeof grOnEvent === 'function') grOnEvent(d); return; }   // a group changed (96-friends-4groups.js)
  if (d.type === 'presence' && typeof d.id === 'string') {
    _fr.presenceLive.set(d.id, { s: String(d.s || 'offline'), at: Date.now() });
    const f = friendsGet(d.id);
    if (f) { f.presence = ['online', 'focusing', 'travelling', 'away'].includes(d.s) ? d.s : 'offline'; _frPaintPresence(d.id, f.presence); }
    return;
  }
  if (d.type === 'msg' && d.msg && typeof d.msg === 'object') {
    const m = d.msg;
    const f = friendsGet(m.from) || { id: m.from, name: 'A friend' };
    if (m.k === 'cheer') {
      const em = m.b && typeof m.b.emoji === 'string' ? m.b.emoji : '';
      toast(`${friendName(f)} cheered you on${em ? ' ' + em : ''}`, { icon: 'heart', action: { label: 'Cheer back', run: () => friendsCheer(f.id) } });
    }
    if (typeof m.k === 'string') _frRunHandlers(m, f);
  }
  _frReloadSoon(d.type === 'msg' ? 200 : 400);
}
function _frPaintPresence(id, s) {
  for (const el of document.querySelectorAll(`[data-fr-presence="${CSS.escape(id)}"]`)) el.setAttribute('data-p', s);
  if (typeof profileCornerPaint === 'function') { try { profileCornerPaint(); } catch (e) { /* never in the way */ } }   // the corner's "friends around" dot
}
function friendsGet(id) { return ((_fr.data && _fr.data.friends) || []).find(f => f.id === id) || null; }

/* ---------- the API ---------- */
/** Online status on or off for everyone, keeping how you show (Friends > settings, Privacy's "Turn it on": L15). -> Promise */
function friendsPresenceShare(on, state) {
  const cur = (_fr.data && _fr.data.me && _fr.data.me.prefs && _fr.data.me.prefs.presence) || {};
  const st = ['auto', 'online', 'focusing', 'travelling', 'away'].includes(state) ? state : (cur.state || 'auto');
  return _frApi('/api/friends/me', { presence: { share: !!on, state: st } }).then(async (r) => {
    _fr.pres.last = '';
    await friendsLoad(true);
    _frPresenceTick(); _frRepaint();
    return r;
  });
}
/** The name friends see (/api/friends/me {name}); Profile's "Your name" keeps it in step (L11). -> Promise | null before Friends is set up */
function friendsSetName(name) {
  if (!_fr.data || !_fr.data.me || !_fr.data.me.id) return null;
  const n = String(name || '').trim().slice(0, 60);
  if (!n || n === _fr.data.me.name) return Promise.resolve(null);
  return _frApi('/api/friends/me', { name: n }).then((r) => { friendsLoad(true).then(() => _frRepaint()).catch(() => {}); return r; });
}
function friendsFeedPost(event) { return _frApi('/api/friends/feed', { event: event || {} }).then((r) => { _frReloadSoon(100); return r; }); }
function friendsCheer(id, emoji) {
  return _frApi('/api/friends/send', { to: id, kind: 'cheer', body: { emoji: emoji || '👏' } })
    .then((r) => { _frReloadSoon(100); return r; });
}
window.Friends = Object.freeze({
  get ready() { return _fr.ready; },
  me: () => (_fr.data ? _fr.data.me : null),
  list: () => ((_fr.data && _fr.data.friends) || []).filter(f => f.status === 'friend'),
  get: (id) => friendsGet(id),
  load: (force) => friendsLoad(force !== false),
  send: (to, kind, body, o) => _frApi('/api/friends/send', { to, kind, body, group: (o && o.group) || undefined, revoke: (o && o.revoke) ? true : undefined }).then((r) => { _frReloadSoon(150); return r; }),
  publish: (kind, body) => _frApi('/api/friends/publish', { kind, body }),
  unpublish: (kind) => _frApi('/api/friends/publish', { kind, revoke: true }),
  on(kind, fn) {
    if (typeof fn !== 'function') return () => {};
    const k = String(kind || '*');
    if (!_fr.handlers.has(k)) _fr.handlers.set(k, new Set());
    _fr.handlers.get(k).add(fn);
    return () => _fr.handlers.get(k).delete(fn);
  },
  shared: (id, kind) => _frApi('/api/friends/friend?id=' + encodeURIComponent(id)).then(r => (r.shared && r.shared[kind]) || null),
  feed: (o) => { const q = new URLSearchParams(); o = o || {}; if (o.friend) q.set('friend', o.friend); if (o.kind) q.set('kind', o.kind); if (o.limit) q.set('limit', String(o.limit)); if (o.before != null) q.set('before', String(o.before)); return _frApi('/api/friends/feed?' + q.toString()).then(r => r.entries || []); },
  presence: (id) => { const f = friendsGet(id); return f ? f.presence : 'offline'; },
  describe(kind, fn) { if (typeof fn === 'function') _fr.describers.set(String(kind), fn); },
  registerPanel(def) {
    if (!def || !def.id || typeof def.render !== 'function') return;
    const i = _fr.panels.findIndex(p => p.id === def.id);
    const p = Object.assign({ order: 50, where: 'friend' }, def);
    if (i >= 0) _fr.panels[i] = p; else _fr.panels.push(p);
    _fr.panels.sort((a, b) => a.order - b.order);
  },
  open: (id) => setView('friends:' + id),
});

/* ---------- presence: what this page says about you (only when you share it) ---------- */
function _frPresenceNow() {
  if (_fr.pres.hiddenAt && Date.now() - _fr.pres.hiddenAt > 10 * 60000) return 'away';
  try { if (typeof gameFocusRun === 'function' && gameFocusRun()) return 'focusing'; } catch (e) { /* no focus timer */ }
  try { if (typeof Clock !== 'undefined' && Clock.zone && Clock.home && Clock.zone() !== Clock.home()) return 'travelling'; } catch (e) { /* no clock */ }
  return 'online';
}
function _frPresenceTick() {
  const d = _fr.data;
  if (!d || !d.me || !d.me.prefs || !d.me.prefs.presence || !d.me.prefs.presence.share) return;
  if (!d.counts || !d.counts.friends) return;
  const s = _frPresenceNow();
  if (s === _fr.pres.last && Date.now() - _fr.pres.at < 5 * 60000) return;
  _fr.pres.last = s; _fr.pres.at = Date.now();
  _frApi('/api/friends/presence', { state: s }).catch(() => {});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _fr.pres.hiddenAt = Date.now();
  else { _fr.pres.hiddenAt = 0; _frPresenceTick(); }
});

/* ---------- your game summary for friends (share:game; agent 'perms' decides who sees it) ---------- */
function _frGameSummary() {
  const G = window.OpenDashGame;
  if (!G || typeof G.stats !== 'function') return null;
  const s = G.stats();
  if (!s || !s.level) return null;
  const done = s.streaks && s.streaks.done ? s.streaks.done : {};
  return {
    level: Math.max(1, Math.round(Number(s.level.level) || 1)), title: String(s.level.title || '').slice(0, 40),
    xp: Math.max(0, Math.round(Number(s.xp && s.xp.total) || 0)), xpWeek: Math.max(0, Math.round(Number(s.xp && s.xp.week) || 0)),
    streak: Math.max(0, Math.round(Number(done.current) || 0)), best: Math.max(0, Math.round(Number(done.best) || 0)),
    quests: Math.max(0, Math.round(Number(s.facts && s.facts.questsDone) || 0)), focusMin: Math.max(0, Math.round((Number(s.focus && s.focus.totalMs) || 0) / 60000)),
  };
}
function _frGameShare(force) {
  const d = _fr.data;
  if (!d || !d.counts || !d.counts.friends) return;
  const g = _frGameSummary();
  if (!g) return;
  // Level, streak and quests at once; XP and focus minutes at most every 3 hours (each share is one message per
  // friend, and a friend's drop token takes 100 a day). The server skips a summary identical to the last one.
  const key = [g.level, g.streak, g.best, g.quests].join('|');
  if (!force && key === _fr.game.key && Date.now() - _fr.game.at < 3 * 3600000) return;
  _fr.game.key = key; _fr.game.at = Date.now();
  _frApi('/api/friends/publish', { kind: 'share:game', body: g }).catch(() => {});
}
document.addEventListener('opendash:game', () => { clearTimeout(_fr.game.t); _fr.game.t = setTimeout(() => _frGameShare(false), 5000); });

/* ---------- start: after the page has booted (the server is known to be there) ---------- */
setTimeout(function _frBoot() {
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) { setTimeout(_frBoot, 30000); return; }
  friendsLoad(true).then(() => { _frRepaint(); _frPresenceTick(); _frGameShare(false); }).catch(() => {});
  setInterval(() => { if (!document.hidden) { _frPresenceTick(); _frGameShare(false); } }, 60000);
}, 4000);
