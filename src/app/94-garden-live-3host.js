/* ============================================================
   PLAYING TOGETHER, the host's side (docs/dev/GARDEN_TOGETHER.md). While you are in your own garden: who is at the gate, who is here,
   what they asked for. THE GARDEN IS YOURS: an intent is checked here against the garden as it is, with the same rules your own clicks
   go through (_gdPlaceOk), and only then applied, once, keyed by the visitor's id. Your own coins and bag are never touched by a visitor.
   Every record names who placed it by friend id (`by`), never by name: friend text does not enter the state file. One tab hosts: the server names it (`lead`).

   Exactly once, with ownership. A decoration a visitor placed is theirs while `own` names them (their bag's debit `gl.o.<gi>` stands for it); a plant is theirs while `by` does.
   Once it has been handed back, given or posted, nothing brings it back: a diary line whose record something later touched is `over` (only the newest line
   of a record can be undone; undoing it makes the one before the newest), a line that ended in a post or a gift has `noUndo`, and those records are not restored by Put my garden back (`glt`: '!').

     gardenLiveHostPainted(m)         after every paint: you are here; everyone goes on the stage; what changed goes to who is here
     gardenLiveHostGone()             you left your garden
     gardenLiveWalked(pt) / gardenLiveEmoted(id)     you walked or did a move: they see it
     gardenLiveShareOf(f) / gardenLivePostsSoon()   for 94-garden-1core.js: this friend's share of a harvest; there are posts in the queue
     gardenLiveUndo(key) / gardenLivePutBack()  the diary's Undo, and "Put my garden back"
   ============================================================ */
const _glh = { on: false, beatT: 0, lastGo: 0, watch: null, sent: new Map(), diffT: 0, hud: null, panel: false, unseen: 0, seenAt: 0, drops: new Map(), bugT: 0, bugs: new Map(), posting: false, sprites: new Map(), hoverBound: null };
const _GLH_SEEN_KEY = 'opendash.gardenLive.seen.v1';
function _glhSend(to, k, body) { return _gllPipe('/api/garden-live/host', { to, k, body, tab: _GLL_TAB }); }
function _glhHereBody(on) { const l = gardenLiveLook(); if (typeof _gw !== 'undefined') { l.x = Math.round(_gw.px * 10) / 10; l.y = Math.round(_gw.py * 10) / 10; } return { role: 'host', on, look: l, name: _gllMyName(), tab: _GLL_TAB, hidden: typeof document !== 'undefined' && !!document.hidden }; }
function _glhPerm(fid) { const v = _gll.view; const p = v && v.perms && v.perms[fid]; return p || { lv: 'none', touch: false, share: 'keeper' }; }

/* ---------- you are here ---------- */
function gardenLiveHostPainted(m) {
  if (typeof _gw === 'undefined' || !_gw.on) return;
  if (!_glh.on) {
    if (_gll.role === 'visit') return;
    if (!_gscFriendList().length) { if (!_glh.retryT) _glh.retryT = setTimeout(() => { _glh.retryT = 0; gardenLiveHostPainted(); }, 3000); return; }
    _glhClaim();   // (and it asks again by itself)
    return;
  }
  _glhHud();
  _glhHoverBind();
  _glhDiffSoon(250);
  void m;
}
/** Ask the server to be the host. Two tabs on the garden would each apply what a visitor asks, so the other one waits and says so. */
function _glhClaim() {
  if (_glh.claiming || _glh.claimT) return;
  _glh.claiming = true;
  const later = () => { _glh.claimT = setTimeout(() => { _glh.claimT = 0; _glhClaim(); }, 30000); };
  _gllApi('/api/garden-live/here', _glhHereBody(true)).then((d) => {
    _glh.claiming = false;
    if (_glh.on || typeof _gw === 'undefined' || !_gw.on || state.view !== 'garden') return;
    if (d && d.lead === false) { _glhElsewhere(true); later(); return; }
    _glhStart();
  }).catch(() => { _glh.claiming = false; later(); });
}
function _glhStart() {
  _glh.on = true; _gll.role = 'host';
  _glhElsewhere(false);
  _glhOldDrops();
  if (typeof _gltHostStart === 'function') _gltHostStart();
  try { _glh.seenAt = Number(localStorage.getItem(_GLH_SEEN_KEY)) || 0; } catch (e) { _glh.seenAt = 0; }
  gardenLiveLoad(true).then((d) => { for (const p of (d && d.host && d.host.people) || []) _glhEvent({ k: 'join', again: true, ...p }); _glhHud(); _glhFlushPosts(); _glhQueueRun(d); }).catch(() => {});
  clearInterval(_glh.beatT);
  _glh.beatAt = Date.now();   // clock-ok: spacing
  _glh.beatT = setInterval(_glhBeat, 30000);
  _glhWatchStart();
  if (typeof _glcHostStart === 'function') _glcHostStart();
  if (typeof _glgHostStart === 'function') _glgHostStart();
  _glhHud();
  _glhHoverBind();
  _glhDiffSoon(250);
}
/** I am still here. Also from the fish's clock (94-garden-live-8sync.js), which a hidden tab does not slow. */
function _glhBeat() {
  if (!_glh.on) return;
  _glh.beatAt = Date.now();   // clock-ok: spacing
  if (typeof _gw === 'undefined' || !_gw.on || state.view !== 'garden') { gardenLiveHostGone(); return; }
  _gllApi('/api/garden-live/here', _glhHereBody(true)).then((d) => { if (d && d.lead === false && _glh.on) { gardenLiveHostGone(); _glhClaim(); } }).catch(() => {});
  _glhDiffSoon(0);
}
/** This tab is on your garden, and another one is hosting it. */
function _glhElsewhere(on) {
  const box = typeof _gw !== 'undefined' ? _gw.box : null; if (!box) return;
  let n = box.querySelector(':scope > .gll-elsewhere');
  if (!on) { if (n) n.remove(); return; }
  if (n) return;
  n = _gsvEl('div', 'gll-note gll-elsewhere', 'Your garden is open in another tab, so friends play there.');
  box.appendChild(n);
}
function gardenLiveHostGone() {
  clearTimeout(_glh.claimT); _glh.claimT = 0; _glhElsewhere(false);
  if (!_glh.on) return;
  if (typeof gardenContestHostGone === 'function') gardenContestHostGone();   // (a round ends with a clean stop, while the host can still speak)
  if (typeof _gltHostStop === 'function') _gltHostStop();   // (an open trade is called off while the server can still carry the word)
  _glh.on = false; clearInterval(_glh.beatT);
  if (_gll.role === 'host') _gll.role = '';
  _gllApi('/api/garden-live/here', { role: 'host', on: false, tab: _GLL_TAB }).catch(() => {});
  for (const S of _glh.sprites.values()) S.remove();
  _glh.sprites.clear(); _gll.actors.clear(); _glh.sent.clear();
  if (_glh.watch) { _glh.watch.remove(); _glh.watch = null; }
  if (typeof _glcHostStop === 'function') _glcHostStop();
  if (typeof _glgHostStop === 'function') _glgHostStop();
  _glhReturnDrops();
  clearTimeout(_glh.bugT);
}
// A reload: the visit goes on, and whichever tab speaks next is the host.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('pagehide', () => { if (!_glh.on) return; try { fetch('/api/garden-live/here', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'host', on: 'release', tab: _GLL_TAB }) }); } catch (e) { /* the server sees the silence */ } });
/** Your own walk: where you are going, once; keys and holding are sent as you go, at most every 0.8 s. Nothing while nobody is here. */
function gardenLiveWalked(pt) { if (_gll.role === 'visit') { _glvWalked(pt); return; } if (!_glh.on || !_glhAnyone()) return; _glh.lastGo = Date.now(); _glh.goX = pt.x; _glh.goY = pt.y; _glhSend('all', 'go', { x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10, ..._glhTurns(_gw.path) }); }  // clock-ok: spacing messages
/** The way round the beds, as turns on the wire: every point but the last (that is the destination). */
function _glhTurns(path) {
  const pts = (path || []).slice(0, -1).slice(0, 12).map(p => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
  return pts.length ? { r: pts } : {};
}
/** Someone here walks: this page knows the garden, so it works out the way (the same routes your own feet take) and tells everyone, the walker too. */
function _glhWalk(A, ev) {
  let way = null;
  const t = Date.now();   // clock-ok: spacing the sums
  // (a hidden tab draws nothing, so the figure is not where it was: it would be routed from an old place, and everyone would see it walk back)
  if (typeof document !== 'undefined' && document.hidden) { A.x = ev.x; A.y = ev.y; A.tx = null; A.way = null; }
  else if (typeof _gwRoute === 'function' && !(A.g && A.g.bt) && t - (A.routeAt || 0) >= 200) {   // (someone in a boat goes straight over the water)
    A.routeAt = t;
    try {
      const tgt = _gwFree(ev.x, ev.y) ? { x: ev.x, y: ev.y } : _gwNearestFreePt(ev.x, ev.y, 3);   // (a seat is on the bench itself: as near as the feet go, then there)
      way = tgt ? _gwRoute({ x: A.x, y: A.y }, tgt) : null;
      if (way && (tgt.x !== ev.x || tgt.y !== ev.y)) way = way.concat([{ x: ev.x, y: ev.y }]);
    } catch (e) { way = null; }
  }
  const turns = _glhTurns(way);
  _gllWalkVia(A, turns.r, ev.x, ev.y);
  if (_gll.actors.size > 1) _glhSend('all', 'go', { w: ev.w, x: ev.x, y: ev.y, ...turns });   // (with nobody else here, nobody needs telling: the walker's own feet are their own)
}
function _glhWatchStart() {
  if (_glh.watch || typeof gardenWorldAdd !== 'function') return;
  _glh.watch = gardenWorldAdd({
    id: 'gll-watch', svg: '', x: 0, y: 0, still: true,
    update() {
      if (!_glh.on || !_glhAnyone() || (_gw.path && _gw.path.length)) return;
      // as you go, at most every 0.8 s, and once more when you stop: without that last one everyone else saw you stop short, up to a few cells away, until the next check
      const t = Date.now(), far = Math.hypot(_gw.px - (_glh.goX || 0), _gw.py - (_glh.goY || 0));   // clock-ok: spacing messages
      if (_gw.moving ? (t - _glh.lastGo >= 800 && far >= 0.4) : (t - _glh.lastGo >= 200 && far >= 0.15)) gardenLiveWalked({ x: _gw.px, y: _gw.py });
    },
  });
}
function gardenLiveEmoted(id) { if (_gll.role === 'visit') { if (_glvLive() && GL_EMOTES.includes(id)) _glvSend('em', { c: 'em', e: id }); return; } if (_glh.on && _glhAnyone() && GL_EMOTES.includes(id)) _glhSend('all', 'em', { c: 'em', e: id }); }
function _glhAnyone() { return _gll.actors.size > 0; }
/** Is anyone looking? A guest whose tab is hidden says so; what only moves on a screen (fish, creatures, pets, the checks) waits until someone is back, or has a line out. */
function _glhLooking() { for (const A of _gll.actors.values()) if (!A.away || A.fish) return true; return false; }
/** Someone has just come in, or is back after a drop: what is going on now that they would otherwise only hear when it ended. A line out, a seat. */
function _glhCatchUp(fid, who) {
  const F = typeof _gw !== 'undefined' ? _gw.fishing : null;
  if (F && F.state && F.state !== 'idle' && F.state !== 'land') _glhSend(fid, 'fx', { c: 'fish', e: 'cast', x: Math.floor(F.bx), y: Math.floor(F.by), ...(F.plan && F.plan.baitDef ? { i: F.plan.baitDef.id } : {}) });
  if (typeof _pe !== 'undefined' && _pe.hold) _glhSend(fid, 'em', { c: 'em', e: 'sit' });
  for (const A of _gll.actors.values()) {
    if (A === who) continue;
    if (A.fish && A.fish.state !== 'land') _glhSend(fid, 'fx', { w: A.w, c: 'fish', e: 'cast', x: Math.floor(A.fish.bx), y: Math.floor(A.fish.by), ...(A.fish.bait ? { i: A.fish.bait } : {}) });
    if (A.hold) _glhSend(fid, 'em', { w: A.w, c: 'em', e: A.hold, x: Math.round(A.x * 10) / 10, y: Math.round(A.y * 10) / 10 });
  }
  for (const B of _glh.bugs.values()) if (B.x != null) _glhSend(fid, 'res', { w: 0, t: 'bug', ok: true, u: B.u, p: B.p, x: B.x, y: B.y });
}
/** Can you say something here now? A visitor on a live visit, or the host while somebody is in the garden (the quick bar asks). */
function gardenLiveCanSay(m) { return !!(m && m.visit ? m.visit.live : _glh.on && _glhAnyone()); }
function _glhQuickSoon() { setTimeout(() => { try { if (typeof gardenHudPaint === 'function' && typeof _gw !== 'undefined' && _gw.on) gardenHudPaint(gardenHere()); } catch (e) { /* the next paint */ } }, 80); }

/* ---------- the people here ---------- */
function _glhAdd(ev) {
  let A = _gll.actors.get(ev.w);
  if (!A) { A = _gllActor(ev); A.f = ev.f; _gll.actors.set(ev.w, A); }
  else if (ev.pet && A.petAway) { A.petAway = false; A.pet = ev.pet; }   // (their look has a pet in it again: it is home)
  else if (A.n !== ev.n || JSON.stringify([A.a, A.g, A.pet]) !== JSON.stringify([ev.a || A.a, ev.g || A.g, ev.pet || A.pet])) { A.n = ev.n; A.a = ev.a || A.a; A.g = ev.g || A.g; A.pet = ev.pet || A.pet; A.lv = ev.lv; A.key = ''; if (A.root) _gllDress(A, A.root); }   // (the same person told again changes nothing on screen)
  else A.lv = ev.lv;
  A.f = ev.f;
  if (!_glh.sprites.has(ev.w) && typeof gardenWorldAdd === 'function') _glh.sprites.set(ev.w, _gllSprite(A, () => _glhPersonMenu(A)));
  _glhQuickSoon();   // (the Say button shows while somebody is here)
  return A;
}
function _glhRemove(w) {
  if (typeof _glgLeft === 'function') _glgLeft(w);   // (a slot is given to the next person to come in: what this one did in a shared goal stays counted, and is theirs no longer)
  const S = _glh.sprites.get(w); if (S) { S.remove(); _glh.sprites.delete(w); }
  const A = _gll.actors.get(w); if (A && typeof _gllPetDrop === 'function') _gllPetDrop(A);
  _gll.actors.delete(w);
  _glhQuickSoon();
}
function _glhByName(fid) { try { const f = _gscFriend(fid); return f ? String(f.name || gardenSocialName(f)).split(/\s+/)[0].slice(0, 40) : 'A friend'; } catch (e) { return 'A friend'; } }
function _glhEvent(ev) {
  switch (ev.k) {
    case 'join': {
      const A = _glhAdd(ev);
      if (ev.lookOnly) return;   // (new clothes, nothing else)
      A.away = false;
      _glhSnapshotTake();
      if (!ev.again) setTimeout(() => _gllEmote(A, 'wave'), 400);
      _glhSendSnap(ev.f);
      if (typeof _gfs !== 'undefined') _gfs.dirty = true;   // (the fish in the water, at once)
      if (typeof _gllRoamTell === 'function') _gllRoamTell(ev.f);
      if (typeof eeTell === 'function') eeTell(ev.f);
      if (typeof gardenRoomTell === 'function') gardenRoomTell(ev.f);
      if (typeof _glcJoin === 'function') _glcJoin(ev.f);
      if (typeof gardenContestJoin === 'function') gardenContestJoin(ev.f);
      if (typeof _glgJoin === 'function') _glgJoin(ev.f);
      _glhResendDrops(ev.f);
      _glhCatchUp(ev.f, A);
      if (typeof _gly !== 'undefined') _gly.atAt = 0;   // (where everyone stands, at the next tick)
      _glhBugsMaybe();
      gardenLiveLoad(true).then(_glhHud).catch(() => {});
      return;
    }
    case 'tr': if (typeof _gltHostOn === 'function') _gltHostOn(ev); return;
    case 'leave': if (typeof _gltHostLeft === 'function') _gltHostLeft(ev.w); _glhRemove(ev.w); if (typeof gardenContestLeave === 'function') gardenContestLeave(ev.w); _glhReturnDrops(ev.w); gardenLiveLoad(true).then(_glhHud).catch(() => {}); return;
    case 'go': { const A = _gll.actors.get(ev.w); if (A) { _gllGoPace(A, ev); _glhWalk(A, ev); if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); } return; }
    case 'em': {
      const A = _gll.actors.get(ev.w); if (!A) return;
      if (ev.c === 'em') _gllEmoteAt(A, ev);
      else if (ev.c === 'say') _gllSay(A, ev.e);
      else if (ev.c === 'do' && ev.e === 'high5') { _gllEmote(A, 'clap'); if (ev.to === 0 && typeof gartEmoteRun === 'function') gartEmoteRun('clap', { quiet: true }); _gllFloat(_gw.svg, A.x + 0.35, A.y - 1.4, '✋', ''); }
      else if (ev.c === 'do' && ev.e === 'follow' && ev.to === 0) _gllFloat(_gw.svg, A.x, A.y - 1.4, '🚶', A.n);
      return;
    }
    case 'fx': { const A = _gll.actors.get(ev.w); if (A && typeof _gllFxPlay === 'function') _gllFxPlay(A, ev); return; }
    case 'pp': _gllPlacesIn(ev); return;
    case 'do': _glhIntent(Object.assign({}, ev, { k: ev.ik })); return;
    case 'queue': clearTimeout(_glh.queueT); _glh.queueT = setTimeout(() => { gardenLiveLoad(true).then(_glhQueueRun).catch(() => {}); }, 300); return;
    case 'knock': case 'host': case 'road': case 'budget': if (ev.note && _gll.view) _gll.view.host = Object.assign(_gll.view.host || {}, { note: ev.note }); gardenLiveLoad(true).then(_glhHud).catch(() => {}); return;
    default:
  }
}
/* ---------- the garden as it is, for who just came in ---------- */
function _glhByTable() {
  const g = _gdG(), m = gardenModel(), names = [], idx = new Map(), rows = [];
  const add = (kind, x, y, fid) => { if (!fid) return; let i = idx.get(fid); if (i == null) { if (names.length >= 16) return; i = names.length; names.push(_glhByName(fid)); idx.set(fid, i); } rows.push([kind, x, y, i]); };
  for (const p of m.plants) { const r = g.plants[p.uid]; if (r && r.by) add('p', p.x, p.y, r.by); }
  for (const d of m.decor) { const r = g.decor[d.uid]; if (r && r.by) add('d', d.x, d.y, r.by); }
  return { n: names, r: rows };
}
function _glhSendSnap(fid) {
  const s = gardenSnapshot(); if (!s) return;
  _glhDiff();   // what has changed goes to everyone first: the line below counts it as told, and everyone else must not miss it
  _glhRemember(gardenModel());
  _glhSend(fid, 'snap', { g: s, by: _glhByTable() });
}
function _glhRows(m) {
  const g = _gdG(), out = new Map();
  for (const p of m.plants) { const r = g.plants[p.uid]; out.set('p|' + p.x + '|' + p.y, { o: 'p', id: p.def.id, x: p.x, y: p.y, s: p.stage, v: p.variant, f: (p.thirsty ? 1 : 0) | (p.overgrown ? 2 : 0) | (p.ripe ? 4 : 0), by: r && r.by ? r.by : '' }); }
  for (const d of m.decor) { const r = g.decor[d.uid]; out.set((d.def.layer === 'ground' ? 'g|' : 'd|') + d.x + '|' + d.y, { o: 'd', id: d.def.id, x: d.x, y: d.y, r: d.r, v: d.v, by: r && r.by ? r.by : '' }); }
  return out;
}
function _glhRemember(m) { _glh.sent = _glhRows(m); }
function _glhDiffSoon(ms) { clearTimeout(_glh.diffT); if (!_glh.on || !_glhAnyone()) return; _glh.diffT = setTimeout(_glhDiff, ms == null ? 250 : ms); }
function _glhDiff() {
  if (!_glh.on || !_glhAnyone()) return;
  let m; try { m = gardenModel(); } catch (e) { return; }
  const now = _glhRows(m), ops = [];
  for (const [k, r] of now) {
    const was = _glh.sent.get(k);
    if (!was || was.id !== r.id || was.by !== r.by) { ops.push(r.o === 'p' ? { o: '+p', id: r.id, x: r.x, y: r.y, s: r.s, v: r.v, f: r.f, ...(r.by ? { by: _glhByName(r.by) } : {}) } : { o: '+d', id: r.id, x: r.x, y: r.y, r: r.r, v: r.v, ...(r.by ? { by: _glhByName(r.by) } : {}) }); continue; }
    if (r.o === 'p' && (was.s !== r.s || was.f !== r.f)) ops.push({ o: '~p', x: r.x, y: r.y, s: r.s, f: r.f });
    if (r.o === 'd' && (was.r !== r.r || was.v !== r.v)) ops.push({ o: '~d', id: r.id, x: r.x, y: r.y, r: r.r, v: r.v });
  }
  for (const [k, r] of _glh.sent) if (!now.has(k)) ops.push(r.o === 'p' ? { o: '-p', x: r.x, y: r.y } : { o: '-d', id: r.id, x: r.x, y: r.y });
  _glh.sent = now;
  if (!ops.length) return;
  // removals first: something moved within one frame leaves its old cell before it takes its new one
  ops.sort((a, b) => (a.o[0] === '-' ? 0 : 1) - (b.o[0] === '-' ? 0 : 1));
  for (let i = 0; i < ops.length; i += 24) _glhSend('all', 'd', { ops: ops.slice(i, i + 24) }).then((r) => { if (r == null && typeof _glySendFailed === 'function') _glySendFailed(); });
}
/* ---------- an intent ---------- */
function _glhKeyOf(f, i) { return String(f).slice(0, 8) + '.' + String(i).slice(0, 40) + '.0'; }   // (never ends in a word sync takes for a credential's name)
/** Level, May touch and share as the server read them for this very message (it reads the synced file fresh); the page's copy only if there is none. */
function _glhPermOf(ev) { return ev.lv ? { lv: ev.lv, touch: ev.touch === true, share: ev.share || 'keeper' } : _glhPerm(ev.f); }
function _glhCount(f, t) { const today = _gllToday(); let n = 0; for (const e of Object.values(_gdG().gl)) if (e && e.f === f && e.t === t && e.d === today) n++; return n; }
function _glhCell(ev, m) {
  const def = gardenPlant(ev.p);
  if (GL_ACTS[ev.t].on === 'decor') return { d: m.decor.find(q => q.x === ev.x && q.y === ev.y && q.def.id === ev.p) || null };
  if (def && GL_ACTS[ev.t].on !== 'decor') { const p = m.plants.find(q => q.x === ev.x && q.y === ev.y && q.def.id === ev.p); if (p) return { p }; }
  if (GL_ACTS[ev.t].on === 'any') return { d: m.decor.find(q => q.x === ev.x && q.y === ev.y && q.def.id === ev.p) || null };
  return {};
}
function _glhIntent(ev) {
  if (typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) { if (!ev.away) _glhSend(ev.f, 'res', { i: ev.i, w: ev.w, t: ev.t, ok: false, why: 'wait' }); return; }
  const g = _gdG(), key = _glhKeyOf(ev.f, ev.i);
  // the same id again: the same answer, nothing done twice
  if (g.gl[key]) { if (!ev.away) _glhSend('all', 'res', _glhResOf(ev, g.gl[key])); return; }
  // (the server checked level and tables; the page checks them again with the same table)
  if (!g.glc) _glhSnapshotTake();
  const lv = _glhPermOf(ev).lv;
  const no = glMayDo(lv, ev.t) || glIntentOk(ev) || (_glhCount(ev.f, ev.t) >= (GL_CAPS[ev.t] || 0) ? 'cap' : '') || (ev.away && !GL_QUEUE.acts.includes(ev.t) ? 'kind' : '');
  const why = no || _glhApply(ev, key);
  if (why) {
    if (ev.away) _glhQueueNo(ev, key, why);
    else _glhSend(ev.f, 'res', { i: ev.i, w: ev.w, t: ev.t, ok: false, why: String(why).slice(0, 80) });
    return;
  }
  const e = g.gl[key];
  if (ev.away) { e.away = ev.away; g.gq['d' + ev.i + '0'] = { to: ev.f, why: 'did', i: ev.i, at: _gdNow() }; }   // (in the same save: the answer cannot be lost)
  _glhLine(key, e);
  _glhPrune();
  _gdSave();
  if (!ev.away) _glhSend('all', 'res', _glhResOf(ev, e));
  const A = _gll.actors.get(ev.w);
  if (A) _gllPose(A, _GL_POSE[ev.t] || 'pick', 760);
  if (ev.x != null && _GL_EMOJI[ev.t]) _gllFloat(_gw.svg, ev.x, ev.y, _GL_EMOJI[ev.t], A ? A.n : '');
  _glhFlushPosts();
  _glh.unseen++;
  _glhHud();
  _glhDiffSoon(60);
  if (typeof _glgApplied === 'function') _glgApplied(ev);   // (a shared goal counts what was really applied)
}
/* ---------- what waited for you ---------- */
/** It could not be done: it is on record, so the same id can never be tried again, and what they spent goes back by the usual post, once. */
function _glhQueueNo(ev, key, why) {
  const g = _gdG();
  g.gl[key] = { f: ev.f, t: 'q-no', i: ev.i, d: _gllToday(), at: _gdNow(), why: String(why).slice(0, 40), noUndo: true };
  g.gq['b' + ev.i + '0'] = { to: ev.f, why: 'back', i: ev.i, at: _gdNow() };
  _glhPrune();
  _gdSave();
}
/**
 * You are back: what friends left for you goes through _glhIntent, in order: the same rules, the same level (read fresh by your server), the same ids, as if they had been here.
 * Only after the save does the server forget them, so a crash can only mean the same ids again, and those do nothing.
 */
function _glhQueueRun(d) {
  const list = d && Array.isArray(d.queue) ? d.queue : [];
  if (!_glh.on || !list.length || _glh.queueBusy || typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) return;
  _glh.queueBusy = true;
  const pass = Math.floor(_gdNow()), done = [];
  _glhSnapshotTake();   // (Put my garden back can undo this too)
  for (const q of list) {
    if (!_GL_ID_RE.test(String(q.i || ''))) continue;
    _glhIntent({ k: 'do', away: pass, f: q.f, i: q.i, t: q.t, p: q.p, x: q.x, y: q.y, ...(q.r != null ? { r: q.r } : {}), lv: q.lv || 'none', touch: q.touch === true, share: q.share || 'keeper' });
    done.push(q.f + '.' + q.i);
  }
  _glhFlushPosts(); _glhDiffSoon(60); _glhHud();
  for (const G of _glhDiaryGroups().filter(x => x.e.away === pass).slice(0, 3)) if (typeof _gdgNote === 'function') _gdgNote(_glhDiaryLine(G.e, G.keys.length), icon('sprout'));
  _gllApi('/api/garden-live/queued', { ids: done }).then(() => gardenLiveLoad(true)).then(_glhHud).catch(() => {}).finally(() => { _glh.queueBusy = false; });
}
function _glhResOf(ev, e) {
  return { i: ev.i, w: ev.w, t: e.t, ok: true, ...(e.p ? { p: e.p } : {}), ...(e.x != null ? { x: e.x, y: e.y } : {}), ...(e.gi ? { u: e.gi } : {}), ...(e.n ? { n: e.n } : {}), ...(e.bug ? { item: e.bug, u: ev.u } : {}), ...(e.dropU ? { u: e.dropU, k: e.k, item: e.item, to: e.to } : {}) };
}
/** A new line in the diary: the lines before it about the same record can no longer be undone, nor your own Undo steps on it, and Put my garden back knows what it did. */
function _glhLine(key, e) {
  if (!e.u) return;
  const g = _gdG();
  for (const [k, o] of Object.entries(g.gl)) if (k !== key && o && o.u === e.u && !o.undone && !o.over) o.over = key;
  if (e.mp) { _gdUndoDrop(e.mp, e.u); if (e.noUndo) g.glt[e.u] = '!'; else if (g.glt[e.u] !== '!') g.glt[e.u] = e.mp; }
}
/** Apply one intent. '' when done (the entry is written, with what Undo needs), else why not. */
function _glhApply(ev, key) {
  const g = _gdG(), m = gardenModel(), today = m.today, now = m.now, t = ev.t, f = ev.f;
  const act = GL_ACTS[t];
  const hit = act.on ? _glhCell(ev, m) : {};
  const rec = hit.p ? g.plants[hit.p.uid] : hit.d ? g.decor[hit.d.uid] : null;
  if (act.on && !rec) return 'gone';
  // Whose it is: a plant is its planter's, a decoration its owner's (`own`: given to the host, it is the host's); no name there, the host's.
  const owner = !rec ? '' : hit.p ? rec.by || '' : rec.own || '', mine = !!rec && owner === f;
  // what is the host's stays the host's unless the host said otherwise, and what is another visitor's is theirs, whatever May touch says
  if (act.mine && !mine && (owner || !_glhPermOf(ev).touch)) return 'not-yours';
  const mp = hit.p ? 'plants' : hit.d ? 'decor' : '';
  const entry = { f, t, i: ev.i, d: today, at: _gdNow(), p: ev.p, x: ev.x, y: ev.y, ...(mp ? { mp } : {}) };   // (m.now is the model's, up to a minute behind: this one sorts against the visit's start)
  const put = (mark, extra) => { g.gl[key] = Object.assign(entry, { mark }, extra || {}); return ''; };
  switch (t) {
    case 'plant': {
      const def = gardenPlant(ev.p);
      const whyNot = _gdPlaceOk(m, def, ev.x, ev.y, 'plant'); if (whyNot) return whyNot;
      const uid = _gdUid('p'), mark = _gdMark([['plants', uid]]), variants = (def.look.v || []).length || 1;
      g.plants[uid] = { p: def.id, x: ev.x, y: ev.y, t: now, w: now, v: gardenHash(uid) % variants, by: f, gi: ev.i };
      return put(mark, { u: uid, mp: 'plants' });
    }
    case 'place': {
      const def = gardenDecor(ev.p);
      const whyNot = _gdPlaceOk(m, def, ev.x, ev.y, 'decor'); if (whyNot) return whyNot;
      const uid = _gdUid('d'), mark = _gdMark([['decor', uid]]);
      g.decor[uid] = { d: def.id, x: ev.x, y: ev.y, r: def.rot ? ((Number(ev.r) || 0) & 3) : 0, v: 0, at: now, by: f, own: f, gi: ev.i };
      return put(mark, { u: uid, mp: 'decor' });
    }
    case 'water': {
      const p = hit.p; if (!p.def.thirst || p.def.special === 'heart') return 'no-need';
      if (m.rain.now) return 'rain';
      if (!p.thirsty && (m.now - p.lastWater) / 3600000 < Math.min(8, p.def.thirst / 2)) return 'happy';
      const mark = _gdMark([['plants', p.uid]]);
      rec.dh = Math.round(((Number(rec.dh) || 0) + (Number(p.dry) || 0)) * 10) / 10; rec.w = now;
      // the friend-garden rules: a little faster, once a plant a day, a few a day
      const boosted = Object.values(g.gl).filter(e => e && e.t === 'water' && e.d === today && e.b);
      const b = boosted.length < GSOC_BOOST.perDay && !boosted.some(e => e.u === p.uid) ? 1 : 0;
      if (b) rec.fb = (Number(rec.fb) || 0) + GSOC_BOOST.hours;
      return put(mark, { u: p.uid, b });
    }
    case 'weed': {
      const p = hit.p; if (p.stage < 3) return 'young';
      if (rec.pr && now - rec.pr < 20 * 3600000) return 'done';
      const mark = _gdMark([['plants', p.uid]]);
      rec.pr = now;
      return put(mark, { u: p.uid });
    }
    case 'harvest': {
      const p = hit.p; if (!p.def.yield) return 'looks'; if (!p.ripe) return 'not-ripe';
      const lk = 'h.' + today + '.' + p.uid + '.' + (p.hc || 0);
      const r = _gdHarvestOne(m, p, { visitor: true });
      if (g.led[lk]) g.led[lk].x = 0;   // the host earns no XP for a friend's picking
      // a harvest of their own plant has been posted: it is theirs, there is no taking it back
      return put(r.mark, { u: p.uid, n: r.n, noUndo: !!mine });
    }
    case 'dig': {
      const p = hit.p; if (p.def.special === 'heart') return 'heart';
      const mark = _gdMark([['plants', p.uid]]);
      delete g.plants[p.uid];
      return put(mark, { u: p.uid, noUndo: !!mine });
    }
    case 'feed': {
      const p = hit.p; if (p.def.special === 'heart') return 'heart';
      if (rec.f && _gdDayOf(rec.f) === today) return 'fed';
      if (p.stage >= 4 && !p.def.yield) return 'grown';
      const mark = _gdMark([['plants', p.uid]]);
      rec.f = now; rec.fb = (Number(rec.fb) || 0) + 12;
      return put(mark, { u: p.uid });
    }
    case 'turn': {
      const d = hit.d, def = d.def, mark = _gdMark([['decor', d.uid]]);
      if (ev.r !== 1 && def.rot) rec.r = ((Number(rec.r) || 0) + 1) & 3;
      else if (def.v > 1) rec.v = ((Number(rec.v) || 0) + 1) % def.v;
      else return 'same';
      rec.at = now;
      return put(mark, { u: d.uid });
    }
    case 'move': {
      const it = hit.p || hit.d, kind = hit.p ? 'plant' : 'decor';
      const whyNot = _gdPlaceOk(m, it.def, ev.tx, ev.ty, kind, it.uid); if (whyNot) return whyNot;
      const mark = _gdMark([[hit.p ? 'plants' : 'decor', it.uid]]);
      rec.x = ev.tx; rec.y = ev.ty;
      return put(mark, { u: it.uid });
    }
    case 'take': {
      const d = hit.d, mark = _gdMark([['decor', d.uid]]);
      const gi = mine ? rec.gi : '';
      if (mine) _gdDecorBack(rec);                            // its own post too: if the answer is lost, it still comes back, once
      delete g.decor[d.uid];
      return put(mark, { u: d.uid, noUndo: !!mine, ...(gi ? { gi } : {}) });
    }
    case 'give': {
      if (!mine) return 'not-yours';
      const d = hit.d, lk = 'gl.d.' + ev.i, gi = rec.gi, mark = _gdMark([['decor', d.uid], ['led', lk]]);
      delete rec.own; delete rec.by; delete rec.gi;           // now it is the host's, for good: nothing here points back at their bag
      g.led[lk] = { d: today, k: 'gl', i: { ['decor:' + d.def.id]: 1 }, n: 0 };   // (a placed decoration comes off the bag's count)
      return put(mark, { u: d.uid, noUndo: true, ...(gi ? { gi } : {}) });
    }
    case 'drop': {
      const to = ev.to;
      if (to !== 0 && ![..._gll.actors.values()].some(A => A.w === to)) return 'who';
      const A = _gll.actors.get(ev.w), toF = to === 0 ? 'host' : (_gll.actors.get(to) || {}).f;
      const u = 'c' + ev.i;   // (the same parcel whichever tab or try made it)
      _glh.drops.set(u, { u, key, from: ev.f, fromW: ev.w, i: ev.i, to, toF, k: ev.k, item: ev.item, x: ev.x, y: ev.y });
      void A;
      if (to === 0) _glhParcelAdd(_glh.drops.get(u));
      return put([], { noUndo: true, dropU: u, k: ev.k, item: ev.item, to });
    }
    case 'pick': {
      const D = _glh.drops.get(ev.u);
      if (!D || D.toF !== f) return 'gone';
      if (Object.values(g.gl).filter(e => e && e.t === 'pick' && e.d === today).length >= GSOC_CAPS.recv.gift[0]) return 'cap';
      _glh.drops.delete(ev.u);
      if (D.key && g.gl[D.key]) g.gl[D.key].closed = 1;
      return put([], { noUndo: true, dropU: ev.u, k: D.k, item: D.item, to: ev.w });
    }
    case 'catch': {
      const B = _glh.bugs.get(ev.u);
      if (!B || B.caught.has(f)) return 'gone';
      B.caught.add(f);
      return put([], { noUndo: true, bug: B.p });
    }
    default: return 'kind';
  }
}
function _glhPrune() {
  const g = _gdG(), ks = Object.keys(g.gl);
  if (ks.length <= 340) return;
  for (const k of ks.sort((a, b) => (g.gl[a].at || 0) - (g.gl[b].at || 0)).slice(0, ks.length - 300)) delete g.gl[k];
}
/* ---------- what 94-garden-1core.js asks: a harvest's share, and the queue ---------- */
function gardenLiveShareOf(f) { return _glhPerm(f).share || 'keeper'; }
function gardenLivePostsSoon() { clearTimeout(_glh.flushT); _glh.flushT = setTimeout(_glhFlushPosts, 100); }
/** What is queued goes out. A post waiting out your Undo stays; when it goes, that Undo step goes with it. */
function _glhFlushPosts() {
  if (_glh.posting) { _glh.flushAgain = true; return; }
  const g0 = _gdG(), t = _gdNow(), ids = Object.keys(g0.gq);
  if (!ids.length) return;
  const waiting = ids.map(id => (g0.gq[id] && g0.gq[id].hold) || 0).filter(h => h > t);
  if (waiting.length) { clearTimeout(_glh.flushT); _glh.flushT = setTimeout(_glhFlushPosts, Math.min(...waiting) - t + 50); }
  const due = ids.filter(id => !(g0.gq[id] && g0.gq[id].hold > t));
  if (!due.length) return;
  _glh.posting = true;
  (async () => {
    let changed = false, failed = false;
    for (const id of due.slice(0, 20)) {
      const g = _gdG(), p = g.gq[id];
      if (!p || !p.to) { delete g.gq[id]; changed = true; continue; }
      _gdUndoDrop('gq', id);
      try { await _gllApi('/api/garden-live/post', { to: p.to, id, why: p.why, ...(p.i ? { i: p.i } : {}), ...(p.d ? { d: p.d } : {}), ...(p.items ? { items: p.items } : {}) }); delete _gdG().gq[id]; changed = true; }
      catch (e) { if (e && e.status === 400) { delete _gdG().gq[id]; changed = true; } else failed = true; }
    }
    if (changed && typeof saveUI === 'function') saveUI();
    if (due.length > 20 || failed) { clearTimeout(_glh.flushT); _glh.flushT = setTimeout(_glhFlushPosts, failed ? 60000 : 200); }
  })().finally(() => { _glh.posting = false; if (_glh.flushAgain) { _glh.flushAgain = false; clearTimeout(_glh.flushT); _glh.flushT = setTimeout(_glhFlushPosts, 50); } });
}
/* ---------- Undo ---------- */
/** Why this line cannot be undone just now, or ''. Something that would come back needs its place free, and what it would change must still be there. */
function _glhUndoWhy(e) {
  const g = _gdG(), cur = e.u && e.mp ? g[e.mp][e.u] : null;
  if (!cur && ['plant', 'place', 'water', 'weed', 'move', 'feed', 'turn'].includes(e.t)) return 'That has already gone.';
  const m = gardenModel();
  for (const [k, id, old] of e.mark || []) {
    if ((k !== 'plants' && k !== 'decor') || !old) continue;
    const def = k === 'plants' ? gardenPlant(old.p) : gardenDecor(old.d);
    if (def && _gdPlaceOk(m, def, old.x, old.y, k === 'plants' ? 'plant' : 'decor', id)) return 'Something else is there now.';
  }
  return '';
}
function gardenLiveUndo(key, o) {
  const g = _gdG(), e = g.gl[key], quiet = !!(o && o.quiet);
  if (!e || e.undone || e.noUndo || e.over) return false;
  const why = _glhUndoWhy(e);
  if (why) { if (!quiet && typeof toast === 'function') toast(why, { icon: 'undo-2' }); return false; }
  // what they spent goes back to them, if it is still theirs: never twice, never for what was picked or given meanwhile
  const cur = e.u && e.mp ? g[e.mp][e.u] : null;
  const refund = !!cur && (e.t === 'feed' || (cur.gi === e.i && (e.t === 'plant' ? cur.by === e.f && !cur.hc : e.t === 'place' && cur.own === e.f)));
  // (nothing was there: a saved mark says null, one not yet saved says undefined)
  for (const [k, id, old] of (e.mark || []).slice().reverse()) { if (!g[k]) g[k] = {}; if (old === undefined || old === null) delete g[k][id]; else g[k][id] = old; }
  e.undone = _gdNow(); e.mark = [];
  if (refund) g.gq['b' + e.i + '0'] = { to: e.f, why: 'back', i: e.i, at: _gdNow() };
  for (const x of Object.values(g.gl)) if (x && x.over === key) delete x.over;   // the line before this one is the newest again
  _gd.rev++; _gd.memoKey = '';
  if (!quiet) { _gdSave(); _glhFlushPosts(); _glhDiffSoon(60); _glhHud(); if (typeof toast === 'function') toast('Undone', { icon: 'undo-2' }); }
  return true;
}
/** The copy Put my garden back goes back to, in the state (it is the same on every device). Someone arriving again never makes a new one: only when it has done its work, or is over a day old with nothing newer than it. */
function _glhSnapshotTake() {
  const g = _gdG(), c = g.glc;
  if (c && c.at) {
    const young = _gdNow() - c.at < 86400000, newer = Object.values(g.gl).some(e => e && (e.at || 0) >= c.at && !e.undone);
    if (young || newer) return;
  }
  g.glc = { at: _gdNow(), plants: JSON.parse(JSON.stringify(g.plants)), decor: JSON.parse(JSON.stringify(g.decor)) };
  g.glt = {};
  if (typeof saveUI === 'function') saveUI();
}
/** Everything visitors did since the copy, newest first; then anything they touched is as it was in the copy, even if its line has left the diary. What you did yourself stays, and what has been handed back, given or posted stays gone. */
function gardenLivePutBack() {
  const g = _gdG(), snap = g.glc && g.glc.at ? g.glc : null, today = _gllToday();
  // (no copy: only today's, never a month of friends' plants with no question)
  const list = Object.entries(g.gl).filter(([, e]) => e && (snap ? (e.at || 0) >= snap.at : e.d === today)).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  let n = 0;
  for (const [k] of list) if (gardenLiveUndo(k, { quiet: true })) n++;
  if (snap) for (const [uid, mp] of Object.entries(g.glt)) {
    if (mp !== 'plants' && mp !== 'decor') continue;
    const was = snap[mp] && snap[mp][uid], cur = g[mp][uid];
    if (was) {
      if (JSON.stringify(was) === JSON.stringify(cur || null)) continue;
      const def = mp === 'plants' ? gardenPlant(was.p) : gardenDecor(was.d);
      if (def && !_gdPlaceOk(gardenModel(), def, was.x, was.y, mp === 'plants' ? 'plant' : 'decor', uid)) { g[mp][uid] = JSON.parse(JSON.stringify(was)); _gd.rev++; _gd.memoKey = ''; n++; }
    } else if (cur && cur.gi && (mp === 'plants' ? cur.by && !cur.hc : cur.own)) {
      // theirs, new since the copy, and its line is gone: it goes back to them
      const to = mp === 'plants' ? cur.by : cur.own;
      g.gq['b' + cur.gi + '0'] = { to, why: 'back', i: cur.gi, at: _gdNow() };
      delete g[mp][uid]; _gd.rev++; _gd.memoKey = ''; n++;
    }
  }
  g.glc = null; g.glt = {};
  if (_glhAnyone()) _glhSnapshotTake();
  _gdSave(); _glhFlushPosts(); _glhDiffSoon(60); _glhHud();
  if (typeof toast === 'function') toast(n ? (snap ? `Your garden is back as it was (${n} undone)` : `Today's changes are undone (${n}). Older ones stay: there is no copy from before them.`) : 'Nothing to put back', { icon: 'undo-2', kind: n ? 'ok' : '' });
  return n;
}
/* ---------- parcels and bugs ---------- */
function _glhParcelAdd(D) {
  if (typeof gardenWorldAdd !== 'function') return;
  D.sprite = gardenWorldAdd({
    id: 'gll-p-' + D.u, svg: _GLL_PARCEL_SVG,
    x: (D.x || 10) + 0.5, y: (D.y || 9) + 0.9, still: true, hit: 0.7, cursor: 'hand', label: 'A parcel',
    onClick() { _glhPick(D); },
  });
}
function _glhPick(D) {
  if (!_glh.drops.has(D.u) || D.to !== 0) return;
  const g = _gdG(), key = 'gl.g.' + D.u;
  _glh.drops.delete(D.u);
  if (D.key && g.gl[D.key]) g.gl[D.key].closed = 1;
  if (D.sprite) D.sprite.remove();
  if (!g.led[key] && gsocGiftOk(D.k, D.item)) {
    g.led[key] = { d: _gllToday(), k: 'gl', i: { [D.k + ':' + D.item]: 1 }, n: 0 };
    if (D.k === 'decor' && !g.disc[D.item]) g.disc[D.item] = _gllToday();
    if ((D.k === 'fish' || D.k === 'bug') && typeof gardenCatchReceived === 'function') gardenCatchReceived(D.k, D.item);
    _gdSave();
  }
  _glhSend('all', 'res', { w: 0, t: 'pick', ok: true, u: D.u, k: D.k, item: D.item, to: 0 });
  if (typeof gameCheer === 'function') gameCheer(null, { text: '🎁', tone: 'gold' });
}
function _glhResendDrops(fid) { for (const D of _glh.drops.values()) _glhSend(fid, 'res', { w: D.fromW, t: 'drop', ok: true, u: D.u, k: D.k, item: D.item, to: D.to, x: D.x, y: D.y }); }
/** Parcels from before this page was opened: their picker is gone, so they go back to who left them. */
function _glhOldDrops() {
  const g = _gdG(); let changed = false;
  for (const [k, e] of Object.entries(g.gl)) {
    if (!e || e.t !== 'drop' || e.closed || _glh.drops.has(e.dropU)) continue;
    e.closed = 1; changed = true;
    if (e.i) g.gq['b' + e.i + '0'] = { to: e.f, why: 'back', i: e.i, at: _gdNow() };
  }
  if (changed) { if (typeof saveUI === 'function') saveUI(); setTimeout(_glhFlushPosts, 500); }
}
/** A parcel nobody picked up goes back to who left it. */
function _glhReturnDrops(w) {
  const g = _gdG();
  for (const D of [..._glh.drops.values()]) {
    if (w != null && D.fromW !== w && D.to !== w) continue;
    _glh.drops.delete(D.u);
    if (D.sprite) D.sprite.remove();
    if (D.key && g.gl[D.key]) g.gl[D.key].closed = 1;
    if (D.from) g.gq['b' + D.i + '0'] = { to: D.from, why: 'back', i: D.i, at: _gdNow() };
    _glhSend('all', 'res', { w: D.fromW, t: 'dropend', ok: true, u: D.u });
  }
  _glhFlushPosts();
}
/** Now and then, with two or more here, a bug everyone can see and each can catch once. */
function _glhBugsMaybe() {
  clearTimeout(_glh.bugT);
  if (!_glh.on || _gll.actors.size < 1) return;
  _glh.bugT = setTimeout(() => {
    _glhBugsMaybe();
    if (document.hidden || typeof GARDEN_BUGS === 'undefined') return;
    const m = gardenModel(), pool = GARDEN_BUGS.filter(b => !b.needs && (b.rarity === 'common' || b.rarity === 'uncommon') && b.lv <= m.level.level && b.seasons.includes(m.season));
    if (!pool.length) return;
    const def = pool[Math.floor(Math.random() * pool.length)], u = 'b' + _gllNewId(), x = 4 + Math.floor(Math.random() * 12), y = 5 + Math.floor(Math.random() * 5);
    _glh.bugs.set(u, { u, p: def.id, x, y, caught: new Set() });
    _glhSend('all', 'res', { w: 0, t: 'bug', ok: true, u, p: def.id, x, y });
    setTimeout(() => { _glh.bugs.delete(u); _glhSend('all', 'res', { w: 0, t: 'bugend', ok: true, u }); }, 45000);
  }, 90000);
}
/* ---------- the tip: "Planted by Taylor" ---------- */
function _glhHoverBind() {
  const box = _gw.box; if (!box || _glh.hoverBound === box) return;
  _glh.hoverBound = box;
  box.addEventListener('pointermove', (ev) => {
    if (_gll.role !== 'host') return;
    const n = ev.target && ev.target.closest ? ev.target.closest('.gd-it[data-uid]') : null;
    if (!n) { _gllTip(box, '', ev); return; }
    const g = _gdG(), uid = n.getAttribute('data-uid'), plant = n.classList.contains('gd-plant'), r = plant ? g.plants[uid] : g.decor[uid];
    _gllTip(box, r && r.by ? _gllByLine(plant ? 'p' : 'd', _glhByName(r.by)) : '', ev);
  }, { passive: true });
  box.addEventListener('pointerleave', (ev) => _gllTip(box, '', ev));
}
/* ---------- your gate: who is here, what they may do, what happened ---------- */
function _glhPersonMenu(A) {
  const f = A.f;
  openPopover(A.root, (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu');
    el.appendChild(_gsvEl('b', null, A.n));
    { const carries = typeof gardenGearRow === 'function' ? gardenGearRow(A.g) : null; if (carries) el.appendChild(carries); }
    const r = _gsvEl('div', 'gll-menu-row');
    r.appendChild(_gsvBtn('Wave', { icon: 'hand', kind: 'btn-ghost', run: () => { close(); if (typeof gartEmoteRun === 'function') gartEmoteRun('wave', { quiet: true }); _glhSend('all', 'em', { c: 'em', e: 'wave', to: A.w }); } }));
    r.appendChild(_gsvBtn('High five', { icon: 'hand', kind: 'btn-ghost', run: () => { close(); gardenWalkToPoint({ x: A.x - 0.7, y: A.y + 0.1 }, () => { if (typeof gartEmoteRun === 'function') gartEmoteRun('clap', { quiet: true }); _gllEmote(A, 'clap'); _glhSend('all', 'em', { c: 'do', e: 'high5', to: A.w }); }); } }));
    r.appendChild(_gsvBtn('Trade', { icon: 'repeat', kind: 'btn-ghost', tip: 'Swap things from your bags, face to face', run: () => { close(); gardenLiveTradeOpen(A); } }));
    r.appendChild(_gsvBtn('Send home', { icon: 'log-out', kind: 'btn-ghost', tip: 'Ends their visit and turns their permission off', run: () => { close(); _gllApi('/api/garden-live/home', { id: f }).then(() => gardenLiveLoad(true)).then(_glhHud).catch(() => {}); } }));
    el.appendChild(r);
  }, { align: 'center' });
}
function _glhDiary() {
  const g = _gdG();
  return Object.entries(g.gl).filter(([, e]) => e && e.t && e.t !== 'catch' && e.t !== 'q-no').sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 60);
}
/** The diary's lines: what one friend left for you, of one kind, is one line ("While you were away, Taylor planted 3 carrots"), with one Undo for all of it. */
function _glhDiaryGroups() {
  const out = [];
  for (const [k, e] of _glhDiary()) {
    const G = out[out.length - 1];
    if (G && e.away && G.e.away === e.away && G.e.f === e.f && G.e.t === e.t && G.e.p === e.p) G.keys.push(k); else out.push({ e, keys: [k] });
  }
  return out;
}
function _glhMany(name) { return /y$/.test(name) ? name.slice(0, -1) + 'ies' : /s$/.test(name) ? name : name + 's'; }
function _glhDiaryLine(e, n) {
  const line = _glhDiaryWhat(e, n || 1);
  return e.away ? 'While you were away, ' + line : line;
}
function _glhDiaryWhat(e, n) {
  const who = _glhByName(e.f), p = e.p ? gardenPlant(e.p) : null, d = e.p ? gardenDecor(e.p) : null, what = (p || d) ? (p || d).name.toLowerCase().replace(/^the /, '') : 'something';
  const some = n > 1 ? n + ' ' + _glhMany(what) : _gscA(what);
  switch (e.t) {
    case 'plant': return `${who} planted ${some}`;
    case 'place': return `${who} placed ${some}`;
    case 'water': return n > 1 ? `${who} watered ${n} of your ${_glhMany(what)}` : `${who} watered your ${what}`;
    case 'feed': return `${who} fed your ${what}`;
    case 'turn': return `${who} turned the ${what}`;
    case 'weed': return `${who} tidied your ${what}`;
    case 'harvest': return `${who} picked the ${what}`;
    case 'dig': return `${who} dug up the ${what}`;
    case 'move': return `${who} moved the ${what}`;
    case 'take': return e.gi ? `${who} took back the ${what}` : `${who} took your ${what}`;
    case 'give': return `${who} gave you the ${what}`;
    case 'drop': return `${who} left a parcel`;
    case 'pick': return `${who} picked up a parcel`;
    case 'trade': return e.f2 ? `${who} and ${_glhByName(e.f2)} traded` : `${who} traded with you`;
    default: return `${who} was here`;
  }
}
function _glhHud() {
  if (!_glh.on || typeof _gw === 'undefined' || !_gw.box || !_gw.box.isConnected) return;
  const box = _gw.box;
  let hud = box.querySelector(':scope > .gll-gate');
  if (!hud) { hud = document.createElement('div'); hud.className = 'gll-gate'; box.appendChild(hud); }
  hud.textContent = '';
  const v = _gll.view || {}, people = [..._gll.actors.values()], knocks = (v.host && v.host.knocks) || [], asks = ((v.host && v.host.asks) || []).filter(id => !knocks.includes(id));
  const b = _gsvBtn('', { icon: v.open === false ? 'lock' : 'fence', cls: 'gll-gate-b' + (knocks.length || asks.length ? ' is-knock' : ''), kind: 'btn-secondary', tip: 'Your gate: who may come in and what happened', aria: 'Your gate', pressed: !!_glh.panel, run: () => { _glh.panel = !_glh.panel; _glhHud(); } });
  const unseen = Object.values((_gdG() || {}).gl || {}).filter(e => e && (e.at || 0) > _glh.seenAt && e.t !== 'catch' && e.t !== 'q-no').length;
  if (people.length) b.appendChild(_gsvEl('span', 'gll-count', String(people.length)));
  if (unseen || knocks.length || asks.length) b.appendChild(_gsvEl('i', 'gll-dot'));
  hud.appendChild(b);
  if (typeof gardenContestHostBtn === 'function') gardenContestHostBtn(hud);
  for (const A of people.slice(0, 7)) { const p = _gsvEl('span', 'gll-person', A.n.slice(0, 1).toUpperCase()); p.title = A.n; hud.appendChild(p); }
  // someone at the gate: one tap lets them in
  for (const id of knocks.slice(0, 3)) {
    const k = _gsvEl('div', 'gll-knock');
    k.appendChild(_gsvEl('span', null, `${_gscFirst(id)} is at your gate`));
    for (const lv of ['look', 'help', 'play']) k.appendChild(_gsvBtn(GL_LEVEL_NAMES[lv], { kind: 'btn-ghost', run: () => { _gllApi('/api/garden-live/perm', { id, lv }).then(() => gardenLiveLoad(true)).then(_glhHud).catch(() => {}); } }));
    hud.appendChild(k);
  }
  // someone here, or away, asking to do more: one tap says yes
  for (const id of asks.slice(0, 3)) {
    const k = _gsvEl('div', 'gll-knock');
    k.appendChild(_gsvEl('span', null, `${_gscFirst(id)} asks to do more`));
    for (const lv of ['help', 'play']) k.appendChild(_gsvBtn(GL_LEVEL_NAMES[lv], { kind: 'btn-ghost', run: () => { _gllApi('/api/garden-live/perm', { id, lv }).then(() => gardenLiveLoad(true)).then(_glhHud).catch(() => {}); } }));
    hud.appendChild(k);
  }
  let panel = box.querySelector(':scope > .gll-panel');
  if (!_glh.panel) { if (panel) panel.remove(); return; }
  if (!panel) { panel = document.createElement('aside'); panel.className = 'gll-panel'; box.appendChild(panel); }
  _glhPanel(panel, v);
}
function _glhPanel(el, v) {
  const keepY = el.scrollTop;
  el.textContent = '';
  el.appendChild(_gsvBtn('', { icon: 'x', cls: 'gll-panel-x', kind: 'btn-ghost', aria: 'Close', run: () => { _glh.panel = false; _glhHud(); } }));
  el.appendChild(_gsvEl('h3', 'gd-h3', 'Your gate'));
  const row = _gsvEl('div', 'gll-switch');
  const sw = (label, on, fn) => { const b = _gsvEl('button', 'gll-seg' + (on ? ' is-on' : ''), label); b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.onclick = fn; return b; };
  const prefs = (o) => _gllApi('/api/garden-live/prefs', o).then(() => gardenLiveLoad(true)).then(_glhHud).catch((e) => toast(e.message, { kind: 'err' }));
  row.append(sw('Open', v.open !== false, () => prefs({ open: true })), sw('Closed', v.open === false, () => prefs({ open: false })));
  el.appendChild(row);
  const note = v.host && v.host.note;
  if (note) { const msg = { 'old-mine': 'Friends on another network can only play here after a quick update: Settings > Your connection to friends > Update.', 'old-theirs': 'Friends on another network can only play here once the relay you share is updated.', norelay: 'Friends on another network need a relay to play here: Settings > Your connection to friends. On the same network they can play now.', unreachable: 'Your connection to friends cannot be reached just now.', refused: 'Your connection to friends does not let you host rooms now: its owner may have taken your access back.', rest: 'The relay is resting for a little while. Friends on your network can still play.' }[note]; if (msg) el.appendChild(_gsvEl('p', 'muted gsv-small gll-panel-note', msg)); }
  if (v.budget && v.budget.mode === 'over') el.appendChild(_gsvEl('p', 'muted gsv-small gll-panel-note', 'That is all the live play through your connection to friends for today. It keeps your sync safe. Friends on your network can still play.'));
  el.appendChild(_gsvEl('h4', 'gll-h', 'Who may come in'));
  const list = _gsvEl('div', 'gll-friends');
  const setP = (id, o) => _gllApi('/api/garden-live/perm', { id, ...o }).then(() => gardenLiveLoad(true)).then(_glhHud).catch((e) => toast(e.message, { kind: 'err' }));
  for (const f of _gscFriendList().slice(0, 60)) {
    const p = _glhPerm(f.id);
    const r = _gsvEl('div', 'gll-friend');
    const top = _gsvEl('div', 'gll-friend-t'); top.appendChild(_gsvEl('b', null, gardenSocialName(f)));
    const here = [..._gll.actors.values()].find(A => A.f === f.id);
    if (here) { top.appendChild(_gsvEl('span', 'gll-here', 'here now')); top.appendChild(_gsvBtn('Send home', { kind: 'btn-ghost', icon: 'log-out', run: () => _gllApi('/api/garden-live/home', { id: f.id }).then(() => gardenLiveLoad(true)).then(_glhHud).catch(() => {}) })); }
    r.appendChild(top);
    const seg = _gsvEl('div', 'gll-switch');
    for (const lv of GL_LEVELS) seg.appendChild(sw(GL_LEVEL_NAMES[lv], p.lv === lv, () => setP(f.id, { lv })));
    r.appendChild(seg);
    if (p.lv === 'help' || p.lv === 'play') {
      const opt = _gsvEl('div', 'gll-friend-o');
      const c = document.createElement('label'); c.className = 'gll-check'; const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!p.touch; i.onchange = () => setP(f.id, { touch: i.checked }); c.append(i, _gsvEl('span', null, 'May touch my things'));
      opt.appendChild(c);
      const s = document.createElement('select'); s.className = 'input gll-select'; s.setAttribute('aria-label', 'Sharing the harvest'); for (const k of GL_SHARES) { const o = document.createElement('option'); o.value = k; o.textContent = GL_SHARE_NAMES[k]; if (p.share === k) o.selected = true; s.appendChild(o); } s.onchange = () => setP(f.id, { share: s.value });
      opt.appendChild(s);
      r.appendChild(opt);
    }
    list.appendChild(r);
  }
  if (!list.children.length) list.appendChild(_gsvEl('p', 'muted gsv-small', 'Add a friend first.'));
  el.appendChild(list);
  { const c = document.createElement('label'); c.className = 'gll-check'; const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!v.groupLook; i.onchange = () => prefs({ groupLook: i.checked }); c.append(i, _gsvEl('span', null, 'People in my groups may look')); el.appendChild(c); }
  { const c = document.createElement('label'); c.className = 'gll-check'; const i = document.createElement('input'); i.type = 'checkbox'; i.checked = v.queueOn !== false; i.onchange = () => prefs({ queue: i.checked }); c.append(i, _gsvEl('span', null, 'Friends with Help or Play can leave things for when I am back')); el.appendChild(c); }
  if (typeof gardenLiveGoalsOn === 'function') { const c = document.createElement('label'); c.className = 'gll-check'; const i = document.createElement('input'); i.type = 'checkbox'; i.checked = gardenLiveGoalsOn(); i.onchange = () => gardenLiveGoalsSet(i.checked); c.append(i, _gsvEl('span', null, 'Suggest shared goals while friends are here')); el.appendChild(c); }
  el.appendChild(_gsvEl('h4', 'gll-h', 'What happened here'));
  const diary = _gsvEl('ul', 'gll-diary');
  for (const { e, keys } of _glhDiaryGroups()) {
    const li = _gsvEl('li', e.undone ? 'is-undone' : ((e.at || 0) > _glh.seenAt ? 'is-new' : ''));
    const em = _gsvEl('span', 'gll-diary-e', _GL_EMOJI[e.t] || '🌿'); li.appendChild(em);
    const tx = _gsvEl('span', 'gll-diary-t'); tx.appendChild(_gsvEl('span', null, _glhDiaryLine(e, keys.length))); tx.appendChild(_gsvEl('span', 'muted gsv-small', _gsvAgo(e.at))); li.appendChild(tx);
    if (!e.undone && !e.noUndo && !e.over && e.mark && e.mark.length) li.appendChild(_gsvBtn('Undo', { kind: 'btn-ghost', icon: 'undo-2', run: () => { for (const k of keys.slice(0, -1)) gardenLiveUndo(k, { quiet: true }); gardenLiveUndo(keys[keys.length - 1]); } }));
    diary.appendChild(li);
  }
  if (!diary.children.length) diary.appendChild(_gsvEl('li', 'muted gsv-small', 'Nothing yet. When friends play here, it shows up here, and you can undo any of it.'));
  el.appendChild(diary);
  el.appendChild(_gsvBtn('Put my garden back', { icon: 'rotate-ccw', kind: 'btn-secondary', tip: 'Undoes what visitors did since the first of them came in. What you did yourself stays.', run: () => gardenLivePutBack() }));
  // reading it: what is new is seen
  _glh.seenAt = _gdNow(); try { localStorage.setItem(_GLH_SEEN_KEY, String(_glh.seenAt)); } catch (e) { /* this page only */ }
  el.scrollTop = keepY;
}
/* your own garden actions, for who is here: the can tips, the plant appears */
document.addEventListener('opendash:garden', (ev) => {
  if (!_glh.on || !_glhAnyone()) return;
  const d = ev && ev.detail;
  // land, something built, a find: everyone here sees it now, not when they next come (after the action has finished saving)
  if (d && (d.kind === 'land' || d.kind === 'landshow')) { setTimeout(() => { if (_glh.on) for (const A of _gll.actors.values()) if (A.f) _glhSendSnap(A.f); }, 0); return; }
  if (!d || d.x == null) return;
  const t = { water: 'water', plant: 'plant', harvest: 'harvest', prune: 'weed', feed: 'water' }[d.kind]; if (!t) return;
  _glhSend('all', 'res', { w: 0, t, ok: true, x: Math.floor(d.x), y: Math.floor(d.y) });
});

/* 2.28: the same for the host: the server tells everyone who is here as soon as your look changes (it hears it with the next "here") */
(function _glhLookWatch() {
  if (typeof document === 'undefined') return;
  let t = 0;
  const soon = () => { clearTimeout(t); t = setTimeout(() => { try { if (_glh.on && _glhAnyone()) _gllApi('/api/garden-live/here', _glhHereBody(true)).catch(() => {}); } catch (e) { /* the next beat has it */ } }, 1500); };
  document.addEventListener('opendash:profile', soon); document.addEventListener('opendash:pet', soon);
  document.addEventListener('opendash:garden', (ev) => { const k = ev && ev.detail && ev.detail.kind; if (k === 'buy' || k === 'gear') soon(); });   // (a new rod: they see it now)
})();
