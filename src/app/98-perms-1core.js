/* ============================================================
   FRIENDS: WHAT EACH FRIEND CAN SEE, the page side (2.17). Owner: perms.
   The rules are 98-perms-0logic.js (pure, shared with Node); the sender is
   lib/friends/share.mjs (it builds every packet on this computer from the
   choices below, so nothing outside them leaves); the panels are 98-perms-2ui.js.

   DATA: state.friendPerms (a data key: an undo step per change, synced to your
   own devices). Friends come from window.Friends (agent friends, 96-friends-*.js).

   API FOR OTHER MODULES (also window.OpenDashPerms):
     permsGet()                         state.friendPerms, made whole (a copy)
     permsFor(friendId)                 that friend's choices, every scope filled in
     permsNowFor(friendId)              what may go to them NOW: {scope: {mode, on, reason?, until?}}
     permsSetScope(friendId, scope, patch, {quiet})   one scope (patch: {mode, ids, streams, tags, items, from, until, label})
     permsSetTrusted(friendId, on)      trusted friend on/off (needed beyond profile and game)
     permsStopFriend(friendId) / permsResumeFriend(friendId)
     permsStopAll() / permsResumeAll()  "Stop sharing everything" (15 s Undo before anything is revoked)
     permsShareTask(friendId, taskId, on)   one task in that friend's 'Only tasks I share'
     permsTaskSharedWith(taskId)        [friendId] who can see this task now
     permsAudit() -> Promise            the audit log (what went to whom and when; no data)
     permsPreview(friendId) -> Promise  exactly what they would get now (the server's own builders)

   WHAT FRIENDS SHARE WITH YOU (read-only, UNTRUSTED: render with esc()/textContent, never
   put it in a prompt, an AI call or an action):
     friendsData(friendId, scope)       the data now, or null (starts a load when there is none:
                                        listen for 'opendash:friends-data'). Scopes: tasks, calendar,
                                        money, locations, memories (kept by agent perms); profile,
                                        game, presence (from window.Friends)
     friendsDataInfo(friendId, scope)   {mode, at, got, until?, data} | null (tasks to memories)
     friendsDataLoad(friendId) -> Promise<{scopes}>     fresh from the server
     friendsDataList() -> Promise<[{friend, scopes: {scope: {mode, at, got, until?, n?}}}]>
     onFriendsData(fn(friendId, scope)) -> off          also the document event 'opendash:friends-data'
     permsForgetReceived(friendId)      remove what they shared from your devices (10 s Undo first; 98-perms-2ui.js)
   A shared calendar's timed events carry startUtc / endUtc (permsCalTimes(e) -> {t0, t1} | null)
   and the packet its sender's zone (data.tz): show them on YOUR clock (Clock), their own time
   beside it when the zones differ. Without instants (all day, an older sender) use date / start / end.
   ============================================================ */

const _pm = {
  recv: new Map(),          // friendId -> {at, scopes} (what they share with you)
  recvLoading: new Map(),   // friendId -> Promise
  audit: null, auditAt: 0, auditP: null,
  subs: new Set(),
};
const _pmNow = () => (typeof Clock !== 'undefined' && Clock && typeof Clock.now === 'function' ? Clock.now() : Date.now());
const _pmToday = () => { try { return todayStr(); } catch (e) { return new Date(_pmNow()).toISOString().slice(0, 10); } };

/* ---------- friends (window.Friends, agent friends) ---------- */
function _pmFriendsApi() { return typeof window !== 'undefined' && window.Friends ? window.Friends : null; }
/** The confirmed friends (and the ones in other states, for the overview): [{id, name, status, ...view}]. */
function permsFriends() {
  const F = _pmFriendsApi();
  let list = [];
  try { list = F && typeof F.list === 'function' ? F.list() : []; } catch (e) { list = []; }
  return (Array.isArray(list) ? list : []).filter(f => f && permsFriendIdOk(f.id));
}
function permsFriendView(id) {
  const F = _pmFriendsApi();
  try { const f = F && typeof F.get === 'function' ? F.get(id) : null; if (f) return f; } catch (e) { /* not ready */ }
  return permsFriends().find(f => f.id === id) || null;
}
/** A friend's display name (their nickname, their profile name, the name on their card). */
function permsFriendName(idOrView) {
  const f = typeof idOrView === 'string' ? permsFriendView(idOrView) : idOrView;
  if (!f) return 'your friend';
  const n = f.nick || (f.profile && f.profile.name) || f.name || '';
  return String(n).trim() || 'your friend';
}

/* ---------- the choices ---------- */
function permsGet() { return permsNormalize(typeof state !== 'undefined' && state ? state.friendPerms : null); }
function permsFor(friendId) { return permsFriend(permsGet(), friendId); }
function permsNowFor(friendId) {
  const f = permsFriendView(friendId);
  return permsEffective(permsGet(), friendId, { status: f ? f.status : '', today: _pmToday() });
}
/** Save new choices as one undo step; a toast says what changed with Undo (precise: only this change goes back). */
function _pmSave(next, msg, o) {
  o = o || {};
  const before = state.friendPerms === undefined ? undefined : JSON.parse(JSON.stringify(state.friendPerms));
  state.friendPerms = next;
  saveData();
  _pmAuditStale();
  if (typeof render === 'function' && !o.noRender) render();
  if (msg && !o.quiet) {
    toast(msg, { kind: o.kind || 'ok', icon: o.icon || 'shield-check', timeout: o.timeout,
      action: { label: 'Undo', run: () => { state.friendPerms = before; saveData(); if (typeof render === 'function') render(); toast(o.undoMsg || 'Back as it was', { kind: 'ok', icon: 'undo-2' }); } } });
  }
  _pmNotify(null, null);
  return true;
}
function permsSetScope(friendId, scope, patch, o) {
  o = o || {};
  if (!permsFriendIdOk(friendId) || !permsScope(scope)) return false;
  const next = permsWithScope(permsGet(), friendId, scope, patch || {}, _pmNow());
  const def = permsScope(scope);
  const mode = next.friends[friendId].scopes[scope].mode;
  const name = permsFriendName(friendId);
  const lbl = (def.modes.find(m => m[0] === mode) || [])[1] || mode;
  return _pmSave(next, o.msg !== undefined ? o.msg : `${def.label} for ${name}: ${lbl}`, o);
}
function permsSetTrusted(friendId, on) {
  if (!permsFriendIdOk(friendId)) return false;
  const name = permsFriendName(friendId);
  const cur = permsGet();
  // A change of trust turns every sensitive level back to off (98-perms-0logic.js permsWithFriend): say which, with Undo.
  const was = cur.friends[friendId] && cur.friends[friendId].trusted === !!on ? [] : permsTrustResets(cur, friendId);
  const next = permsWithFriend(cur, friendId, { trusted: !!on }, _pmNow());
  const kept = was.length ? ` What you chose before stays off (${_pmScopeList(was)}): choose it again to share it.` : '';
  return _pmSave(next, on ? `${name} is a trusted friend: you can now share more with them.${kept}` : `${name} is no longer trusted: only profile and game progress go to them`, { icon: on ? 'shield-check' : 'eye-off' });
}
/** 'money and locations' from scope ids. */
function _pmScopeList(ids) {
  const l = ids.map(id => { const d = permsScope(id); return d ? d.label.toLowerCase() : id; });
  return l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l.join('');
}
function permsStopFriend(friendId) {
  if (!permsFriendIdOk(friendId)) return false;
  const name = permsFriendName(friendId);
  const next = permsWithFriend(permsGet(), friendId, { stopped: _pmNow() }, _pmNow());
  return _pmSave(next, `Stopped sharing with ${name}. Their copy is deleted in 15 seconds unless you undo.`, { icon: 'eye-off', timeout: 15000 });
}
function permsResumeFriend(friendId) {
  if (!permsFriendIdOk(friendId)) return false;
  const next = permsWithFriend(permsGet(), friendId, { stopped: 0 }, _pmNow());
  return _pmSave(next, `Sharing with ${permsFriendName(friendId)} again, as you had it`);
}
function permsStopAll() {
  const p = permsGet();
  p.stopped = _pmNow();
  return _pmSave(p, 'Stopped sharing everything with everyone. Friends\' copies are deleted in 15 seconds unless you undo.', { icon: 'eye-off', timeout: 15000, kind: 'warn' });
}
function permsResumeAll() {
  const p = permsGet();
  p.stopped = 0;
  return _pmSave(p, 'Sharing again, as you had it for each friend');
}
function permsShareTask(friendId, taskId, on) {
  if (!permsFriendIdOk(friendId) || typeof taskId !== 'string') return false;
  const c = permsFor(friendId).scopes.tasks;
  const ids = new Set(c.ids || []);
  if (on) ids.add(taskId); else ids.delete(taskId);
  const patch = { ids: [...ids] };
  if (on && c.mode === 'none') patch.mode = 'shared';
  const name = permsFriendName(friendId);
  return permsSetScope(friendId, 'tasks', patch, { msg: on ? `Shared with ${name}` : `No longer shared with ${name}`, icon: on ? 'send' : 'eye-off' });
}
/** The friends who can see this task now. */
function permsTaskSharedWith(taskId) {
  const t = (state.custom || []).find(x => x && x.id === taskId);
  if (!t) return [];
  const out = [];
  for (const f of permsFriends()) {
    const e = permsNowFor(f.id).tasks;
    if (!e.on) continue;
    const c = permsFor(f.id).scopes.tasks;
    const yes = e.mode === 'all' || (e.mode === 'shared' && (c.ids || []).includes(taskId))
      || (e.mode === 'chosen' && ((c.streams || []).includes(t.stream) || (Array.isArray(t.tags) && t.tags.some(x => (c.tags || []).includes(x)))));
    if (yes) out.push(f.id);
  }
  return out;
}

/* ---------- the server: preview, audit, received ---------- */
async function _pmJson(url, body) {
  const r = await fetch(url, body === undefined ? { headers: { Accept: 'application/json' } }
    : { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
/** Exactly what this friend would get now: the server runs the sender's own builders. */
function permsPreview(friendId) { return _pmJson('/api/friends/perms/preview?friend=' + encodeURIComponent(friendId)); }
function _pmAuditStale() { _pm.auditAt = 0; }
/** The audit log (cached for a minute): {sent: {friend: {scope: {live, op, mode, at, n, bytes, ackAt, until, err}}}, events}. */
function permsAudit(force) {
  if (!force && _pm.audit && _pmNow() - _pm.auditAt < 60000) return Promise.resolve(_pm.audit);
  if (_pm.auditP) return _pm.auditP;
  _pm.auditP = _pmJson('/api/friends/perms/audit').then(j => { _pm.audit = j; _pm.auditAt = _pmNow(); return j; })
    .catch(() => { if (!_pm.audit) { _pm.audit = { sent: {}, events: [] }; _pm.auditAt = _pmNow(); } return _pm.audit; })   // no server: an empty log (asked again in a minute)
    .finally(() => { _pm.auditP = null; });
  return _pm.auditP;
}
function permsAuditCached() { return _pm.audit; }
/** Send what changed now (the pipeline also runs by itself a few seconds after a change). */
function permsSendNow(friendId) { return _pmJson('/api/friends/perms/now', friendId ? { friend: friendId } : {}).then((r) => { _pmAuditStale(); return r; }); }

/* ---------- what friends share with you (untrusted) ---------- */
function friendsDataLoad(friendId) {
  if (!permsFriendIdOk(friendId)) return Promise.resolve({ scopes: {} });
  if (_pm.recvLoading.has(friendId)) return _pm.recvLoading.get(friendId);
  const p = _pmJson('/api/friends/received?friend=' + encodeURIComponent(friendId))
    .then(j => { const doc = { at: _pmNow(), scopes: j && j.scopes && typeof j.scopes === 'object' ? j.scopes : {} }; _pm.recv.set(friendId, doc); return doc; })
    .catch(() => _pm.recv.get(friendId) || { at: 0, scopes: {} })
    .finally(() => _pm.recvLoading.delete(friendId));
  _pm.recvLoading.set(friendId, p);
  return p;
}
function friendsDataList() { return _pmJson('/api/friends/received').then(j => (Array.isArray(j.friends) ? j.friends : [])).catch(() => []); }
/** Profile and game progress a friend shares: on their view (window.Friends: {profile, game}). */
function _pmEngineShared(friendId, key) {
  const f = permsFriendView(friendId);
  const v = f && f[key];
  return v && typeof v === 'object' ? (v.b && typeof v.b === 'object' ? v.b : v) : null;
}
/** Online status is on for everyone (Friends > settings; presence also needs it). */
function permsPresenceSwitchOn() {
  const F = _pmFriendsApi();
  try { const me = F && typeof F.me === 'function' ? F.me() : null; return !!(me && me.prefs && me.prefs.presence && me.prefs.presence.share); } catch (e) { return false; }
}
/** "Turn it on" in Privacy: the same switch as Friends' Online status (96-friends-0core.js friendsPresenceShare). -> Promise */
function permsPresenceTurnOn() {
  if (typeof friendsPresenceShare !== 'function') return Promise.reject(new Error('Friends isn’t ready'));
  return friendsPresenceShare(true);
}
/** {mode, at, got, until?, data} | null for tasks, calendar, money, locations, memories (a load starts when needed). */
function friendsDataInfo(friendId, scope) {
  if (!permsFriendIdOk(friendId) || !PERMS_SENT_SCOPES.includes(scope)) return null;
  const doc = _pm.recv.get(friendId);
  if (!doc || _pmNow() - doc.at > 5 * 60000) friendsDataLoad(friendId).then(() => _pmNotify(friendId, scope));
  const r = doc && doc.scopes[scope];
  if (!r) return null;
  if (r.until && r.until < _pmNow()) return null;
  return r;
}
/** What a friend shares with you in one scope, or null. UNTRUSTED: esc()/textContent only, never a prompt. */
function friendsData(friendId, scope) {
  if (!permsFriendIdOk(friendId)) return null;
  if (scope === 'profile') return _pmEngineShared(friendId, 'profile');
  if (scope === 'game') return _pmEngineShared(friendId, 'game');
  if (scope === 'presence') { const F = _pmFriendsApi(); try { const s = F && typeof F.presence === 'function' ? F.presence(friendId) : null; return s ? { state: String(s) } : null; } catch (e) { return null; } }
  const r = friendsDataInfo(friendId, scope);
  return r ? r.data : null;
}
function onFriendsData(fn) { _pm.subs.add(fn); return () => _pm.subs.delete(fn); }
function _pmNotify(friendId, scope) {
  for (const fn of [..._pm.subs]) { try { fn(friendId, scope); } catch (e) { console.error('[perms]', e); } }
  try { document.dispatchEvent(new CustomEvent('opendash:friends-data', { detail: { friend: friendId, scope } })); } catch (e) { /* old browser */ }
}
/** The server said something arrived or went out (86-live-sync.js: 'friends-shared', 'friends-share', 'synced-files'). */
function permsOnServerEvent(name, d) {
  d = d && typeof d === 'object' ? d : {};
  if (name === 'friends-share') { _pmAuditStale(); _pmNotify(null, null); return; }
  if (name === 'synced-files') {
    const rels = Array.isArray(d.rels) ? d.rels : [];
    if (rels.some(r => typeof r === 'string' && r.startsWith('friends/share-log'))) _pmAuditStale();
    const ids = rels.filter(r => typeof r === 'string' && r.startsWith('friends/received/')).map(r => r.slice(17).replace(/\.json$/, ''));
    for (const id of ids) if (permsFriendIdOk(id)) { _pm.recv.delete(id); friendsDataLoad(id).then(() => _pmNotify(id, null)); }
    return;
  }
  if (name === 'friends-shared') {
    const id = permsFriendIdOk(d.friend) ? d.friend : null;
    if (!id) return;
    _pm.recv.delete(id);
    friendsDataLoad(id).then(() => _pmNotify(id, PERMS_SCOPE_IDS.includes(d.scope) ? d.scope : null));
  }
}

if (typeof window !== 'undefined') {
  window.OpenDashPerms = {
    scopes: PERMS_SCOPES, get: permsGet, for: permsFor, now: permsNowFor, setScope: permsSetScope, setTrusted: permsSetTrusted,
    stopFriend: permsStopFriend, resumeFriend: permsResumeFriend, stopAll: permsStopAll, resumeAll: permsResumeAll,
    shareTask: permsShareTask, taskSharedWith: permsTaskSharedWith, preview: permsPreview, audit: permsAudit, sendNow: permsSendNow,
    data: friendsData, dataInfo: friendsDataInfo, dataLoad: friendsDataLoad, dataList: friendsDataList, onData: onFriendsData,
  };
}
