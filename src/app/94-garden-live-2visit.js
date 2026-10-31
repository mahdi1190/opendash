/* ============================================================
   PLAYING TOGETHER, a visitor's side (docs/dev/GARDEN_TOGETHER.md). A visit is the same world as your own garden (94-garden-visit-0world.js): this file is what is live about it.
   On a friend's garden this knocks at their gate. If they let you in, you are in their garden as it is now: everyone walks in your world as sprites, and what your level allows you
   ask for. You ask; their computer decides. When it says no, or nobody answers, you are in the saved copy, with a plain note in the tag.

     gardenLiveVisitEnter(fid) / gardenLiveVisitLeave()     the page came and went
     gardenLiveOverlay(fid, data)                           the garden as it is NOW instead of the saved copy, while you are there
     _glvWalked(pt)                                         you walked (gardenLiveWalked sends it here): they see where you are going
     _glvIntent(t, f, debit)                                ask for something: it shows at once with a pending look (gardenVisitModel), and goes if it is refused
   ============================================================ */
const _glv = { fid: '', state: '', why: '', lv: 'none', w: null, road: null, touch: false, mode: 'normal', snap: null, beatT: 0, goAt: 0, goT: 0, lastGo: 0, goX: 0, goY: 0, watch: null, pending: new Map(), follow: null, followGo: false, parcels: new Map(), bugs: new Map(), sprites: new Map(), doQ: [], doT: 0, doAt: 0, selfName: '', ver: 0 };
function _glvLive() { return _glv.state === 'live'; }
function _glvFriend() { return _gscFriend(_glv.fid); }
function _glvSend(k, body) { return _gllApi('/api/garden-live/send', { k, body }).catch(() => null); }
function _glvLook() { const l = gardenLiveLook(); if (typeof _gw !== 'undefined' && _gw.on) { l.x = Math.round(_gw.px * 10) / 10; l.y = Math.round(_gw.py * 10) / 10; } return l; }
function gardenLiveVisitEnter(fid) {
  if (_glv.fid === fid && _gll.role === 'visit') return;
  _glvClear();
  _gll.role = 'visit'; _glv.fid = fid; _glv.state = 'knocking';
  _gllApi('/api/garden-live/here', { role: 'visit', on: true, f: fid, look: gardenLiveLook() }).then(_glvTake).catch(() => { _glv.state = 'look'; _glv.why = 'quiet'; _glvHud(); });
  clearInterval(_glv.beatT);
  _glv.beatT = setInterval(() => { if (_glv.fid === fid) _gllApi('/api/garden-live/here', { role: 'visit', on: true, f: fid, look: _glvLook() }).then(_glvTake).catch(() => {}); }, 30000);
  gardenLiveLoad(true).then(() => { if (typeof _gdvTouch === 'function') _gdvTouch(); }).catch(() => {});
}
function gardenLiveVisitLeave() {
  if (_gll.role !== 'visit') return;
  const fid = _glv.fid;
  _glvClear();
  _gll.role = '';
  if (fid) _gllApi('/api/garden-live/here', { role: 'visit', on: false, f: fid }).catch(() => {});
}
function _glvPeopleOut() {
  for (const S of _glv.sprites.values()) S.remove();
  _glv.sprites.clear();
  for (const A of _gll.actors.values()) if (typeof _gllPetDrop === 'function') _gllPetDrop(A);
  if (typeof _gllRoamClear === 'function') _gllRoamClear();
  _gll.actors.clear();
  for (const P of _glv.parcels.values()) if (P.sprite) P.sprite.remove();
  for (const B of _glv.bugs.values()) if (B.sprite) B.sprite.remove();
  _glv.parcels.clear(); _glv.bugs.clear();
  if (typeof _glcGuestClear === 'function') _glcGuestClear();
  if (typeof gardenContestGuestClear === 'function') gardenContestGuestClear();
  if (typeof _glgGuestClear === 'function') _glgGuestClear();
  if (_glv.watch) { _glv.watch.remove(); _glv.watch = null; }
}
function _glvClear() {
  clearInterval(_glv.beatT); clearTimeout(_glv.goT); clearTimeout(_glv.doT);
  _glvPeopleOut();
  _gll.by.clear();
  Object.assign(_glv, { fid: '', state: '', why: '', lv: 'none', w: null, road: null, snap: null, follow: null, ver: 0, selfName: '', doT: 0 });
  _glv.pending.clear(); _glv.doQ.length = 0;
  _gllTip(null, '');
}
function _glvTake(d) {
  const v = d && d.visit;
  if (!v || v.f !== _glv.fid || (v.ver || 0) < (_glv.ver || 0)) return;   // (an answer that left before the latest event)
  _glv.ver = v.ver || 0;
  const was = _glv.state;
  _glv.state = v.state; _glv.why = v.why; _glv.lv = v.lv; _glv.w = v.w; _glv.road = v.road; _glv.touch = v.touch; _glv.mode = v.mode || 'normal';
  if (was === 'live' && _glv.state !== 'live') { if (typeof _gltLost === 'function') _gltLost(); _glvPeopleOut(); _glv.snap = null; _gll.by.clear(); _glv.pending.clear(); _glv.doQ.length = 0; if (typeof _gsvPaint === 'function') _gsvPaint(); }
  if (was !== 'live' && _glv.state === 'live') { _glvResend(); _glvWatchStart(); if (!_glv.snap) _glvSend('me', _glvLook()); if (typeof _gltResume === 'function') _gltResume(); }   // (this page may be new to a visit the server already has: tell me who is here, and the garden as it is)
  _glvHud();
}
/** What you asked for before and never heard back about: the same id, so it can only happen once. (What waits for them went by the mailbox: its answer comes by post.) */
function _glvResend() {
  if (typeof gardenReady !== 'function' || !gardenReady()) return;
  const g = _gdG();
  for (const [k, e] of Object.entries(g.led)) {
    if (!k.startsWith('gl.o.') || !e || e.ok || e.q || e.to !== _glv.fid || !e.t) continue;
    const i = k.slice(5);
    _glv.pending.set(i, { t: e.t, debit: true, resend: true, f: { p: e.p, x: e.x, y: e.y } });
    _glvSendDo({ i, t: e.t, p: e.p, x: e.x, y: e.y, ...(e.k2 ? { k: e.k2, item: e.item, to: e.to2 } : {}) });
  }
}
/** The garden as it is now, not the saved copy, while you are there. */
function gardenLiveOverlay(fid, data) {
  if (_gll.role !== 'visit' || fid !== _glv.fid || !_glv.snap || !data) return data;
  return Object.assign({}, data, { garden: Object.assign({ got: 0, hearts: 0 }, data.garden || {}, { snap: _glv.snap, at: Date.now() }) });   // clock-ok: it is live (and they may have let you in without sharing a saved copy)
}
/* ---------- you, walking ---------- */
/** You walked: they see where you are going. (The route is your own: your feet know this garden as well as theirs do.) */
function _glvWalked(pt) {
  if (!_glv.followGo) _glv.follow = null;
  if (!_glvLive()) return;
  _glv.lastGo = Date.now(); _glv.goX = pt.x; _glv.goY = pt.y;   // clock-ok: spacing messages
  _glvGoSend(pt.x, pt.y);
}
function _glvGoSend(x, y) {
  const gap = _glv.mode === 'thin' ? GL_WALK_GAP.thin : GL_WALK_GAP.normal, t = Date.now();   // clock-ok: spacing messages
  clearTimeout(_glv.goT);
  const go = () => { _glv.goAt = Date.now(); _glvSend('go', { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }); };  // clock-ok: spacing messages
  if (t - _glv.goAt >= gap) go(); else _glv.goT = setTimeout(go, gap - (t - _glv.goAt));
}
/** Keys and holding have no destination: where you are is sent as you go, at most every 0.8 s, and once more when you stop. Nothing while you stand still. */
function _glvWatchStart() {
  if (_glv.watch || typeof gardenWorldAdd !== 'function') return;
  _glv.watch = gardenWorldAdd({
    id: 'glv-watch', svg: '', x: 0, y: 0, still: true,
    update() {
      if (!_glvLive() || (_gw.path && _gw.path.length)) return;
      const t = Date.now(), far = Math.hypot(_gw.px - _glv.goX, _gw.py - _glv.goY);   // clock-ok: spacing messages
      if (_gw.moving ? (t - _glv.lastGo >= 800 && far >= 0.4) : (t - _glv.lastGo >= 200 && far >= 0.15)) _glvWalked({ x: _gw.px, y: _gw.py });
    },
  });
}
/** Sit on a seat: at its foot for your feet, on it for everyone who sees you. Two can. */
function _glvSit(d) {
  const def = d.def, seat = (_glv.w || 0) % 2 ? -0.28 : 0.28, stand = { x: d.x + (def.w || 1) / 2, y: d.y + (def.h || 1) + 0.3 };
  gardenWalkToPoint(stand, () => {
    if (typeof gartEmoteRun === 'function') gartEmoteRun('sit', { quiet: true });
    if (_glvLive()) _glvSend('em', { c: 'em', e: 'sit', x: Math.round((d.x + (def.w || 1) / 2 + seat) * 10) / 10, y: Math.round((d.y + (def.h || 1) * 0.72) * 10) / 10 });
  }, { radius: 1.5 });
}
/* ---------- asking ---------- */
/** What leaves your bag first: one record, a live intent's or one that waits for them (`extra`: q). The sender always pays first; a refusal hands it back. */
function _glvDebit(i, t, f, debit, extra) {
  const g = _gdG();
  g.led['gl.o.' + i] = { d: _gllToday(), k: 'gl', ...(debit ? { i: { [debit]: -1 } } : {}), n: 0, to: _glv.fid, t, p: f.p, x: f.x, y: f.y, ...(f.k ? { k2: f.k, item: f.item, to2: f.to } : {}), ...(f.r != null ? { r: f.r } : {}), ...(extra || {}) };
  _gscSaveGarden();
}
/** An intent, with an id. `debit`: what leaves your bag now. Sent no faster than the rate allows: a drag across a row is a row of messages. */
function _glvIntent(t, f, debit) {
  if (!_glvLive()) return;
  const i = _gllNewId();
  if (debit) _glvDebit(i, t, f, debit);
  _glv.pending.set(i, { t, debit: !!debit, f });
  if (typeof gartPlayerAct === 'function') gartPlayerAct(_GL_POSE[t] || 'pick', 760);
  _glvSendDo({ i, t, ...f });
  if (typeof _gdvTouch === 'function') _gdvTouch();
}
function _glvSendDo(body) { _glv.doQ.push(body); _glvDoPump(); }
function _glvDoPump() {
  if (_glv.doT || !_glv.doQ.length) return;
  const wait = Math.max(0, _glv.doAt + 180 - Date.now());   // clock-ok: spacing messages
  _glv.doT = setTimeout(() => { _glv.doT = 0; const b = _glv.doQ.shift(); if (b) { _glv.doAt = Date.now(); _glvSend('do', b); } _glvDoPump(); }, wait);   // clock-ok: spacing messages
}
/** It happened: your spending stands, and what you planted is on record, so a crop posted for it can be taken. The same whichever road it took. */
function _glvSettled(i, led, t) {
  const g = _gdG();
  led.ok = 1; led.x = t === 'plant' ? 2 : t === 'place' ? 1 : 0;
  if (t === 'plant' && led.p) { g.gv[i] = { f: led.to, p: led.p, at: _gscNow() }; const ks = Object.keys(g.gv); if (ks.length > 240) for (const k of ks.sort((x, y) => g.gv[x].at - g.gv[y].at).slice(0, 40)) delete g.gv[k]; }
}
/** The host said yes: what you see stays, until their next change says the same. */
function _glvEcho(t, f) {
  const s = _glv.snap; if (!s || !f) return;
  const name = _glv.selfName, same = (r) => r[1] === f.x && r[2] === f.y && (!f.p || r[0] === f.p);
  if (t === 'plant') { if (!s.plants.some(r => r[1] === f.x && r[2] === f.y)) s.plants.push([f.p, f.x, f.y, 0, 0, 0]); if (name) _gll.by.set('p|' + f.x + '|' + f.y, name); }
  else if (t === 'place') { if (!s.decor.some(same)) s.decor.push([f.p, f.x, f.y, f.r || 0, 0]); if (name) _gll.by.set('d|' + f.x + '|' + f.y, name); }
  else if (t === 'water') { const r = s.plants.find(same); if (r) r[5] &= ~1; }
  else if (t === 'weed') { const r = s.plants.find(same); if (r) r[5] &= ~2; }
  else if (t === 'harvest') { const r = s.plants.find(same); if (r) { r[5] &= ~4; r[3] = Math.min(3, r[3]); } }
  else if (t === 'dig') s.plants = s.plants.filter(r => !same(r));
  else if (t === 'take') s.decor = s.decor.filter(r => !same(r));
  else if (t === 'move') { const r = s.plants.find(same) || s.decor.find(same); if (r) { r[1] = f.tx; r[2] = f.ty; } }
}
function _glvResult(b) {
  const me = b.w === _glv.w;
  const A = _gll.actors.get(b.w);
  if (b.t === 'bug') { _glvBugAdd(b); return; }
  if (b.t === 'bugend') { const B = _glv.bugs.get(b.u); if (B) { if (B.sprite) B.sprite.remove(); _glv.bugs.delete(b.u); } return; }
  if (b.t === 'undo') { _gllFloat(_glvSvg(), b.x || 10, b.y || 8, '↩️', ''); return; }
  if (!b.ok) {
    if (me && b.i && _glv.pending.has(b.i)) {
      const P = _glv.pending.get(b.i); _glv.pending.delete(b.i);
      if (P.resend && (b.why === 'level' || b.why === 'wait')) { _gdvTouch(); return; }   // asked again and not looked at: it may have happened the first time, when the answer was lost. It stays spent until a real answer or a week.
      _glvRefund(b.i, P); _gdvTouch();
      const at = _glvCellAt(P.f && P.f.x, P.f && P.f.y);
      if (b.why === 'level' && typeof gardenVisitDenied === 'function') gardenVisitDenied(P.t);
      else gameDeny(null, { at: at || undefined, say: 'That did not work here.', kind: 'tool' });
    }
    return;
  }
  if (A) _gllPose(A, _GL_POSE[b.t] || 'pick', 760);
  if (b.t === 'drop') { _glvParcelAdd(b); }
  // a gift is what this page saw left for you, not what any message says it is
  if (b.t === 'pick' || b.t === 'dropend') { const P = _glv.parcels.get(b.u); if (P) { if (P.sprite) P.sprite.remove(); _glv.parcels.delete(b.u); if (b.t === 'pick' && b.to === _glv.w && P.to === _glv.w) _glvGot(b.u, P.k, P.item); } }
  if (b.x != null && _GL_EMOJI[b.t]) _gllFloat(_glvSvg(), b.x, b.y, _GL_EMOJI[b.t], me ? 'You' : A ? A.n : '');
  if (me && b.i) {
    const P = _glv.pending.get(b.i);
    _glv.pending.delete(b.i);
    if (P) _glvEcho(P.t, P.f);
    const g = _gdG(), led = g.led['gl.o.' + b.i];
    if (led && !led.ok) { _glvSettled(b.i, led, b.t); _gscSaveGarden(); }
    if (b.t === 'water') _gscXp('water', _glv.fid, _gllToday());
    if (b.t === 'catch') _glvGotBug(b.u, b.item);
    if (P && b.t === 'take' && b.u) { const d = g.led['gl.o.' + b.u]; if (d && d.to === _glv.fid) { delete g.led['gl.o.' + b.u]; _gscSaveGarden(); } }   // back in your bag (a post says the same, if this answer is lost)
    if (P && b.t === 'give' && b.u && b.p && gardenDecor(b.p)) {
      // given for good: it stays spent. (If a week's refund already handed it back, this is where it leaves your bag again.)
      const d = g.led['gl.o.' + b.u];
      if (d) { if (d.to === _glv.fid) { d.t = 'gave'; d.ok = 1; } } else g.led['gl.o.' + b.u] = { d: _gllToday(), k: 'gl', i: { ['decor:' + b.p]: -1 }, n: 0, to: _glv.fid, t: 'gave', ok: 1 };
      _gscSaveGarden();
    }
    if (P && P.f && P.f.x != null && typeof gameCheer === 'function') { const at = _glvCellAt(P.f.x, P.f.y); if (at) gameCheer(null, { at, text: b.t === 'plant' ? '+2' : '', tone: b.t === 'water' ? 'water' : 'xp' }); }
    _gdvTouch();
  }
}
function _glvSvg() { return typeof _gw !== 'undefined' ? _gw.svg : null; }
function _glvCellAt(x, y) {
  try { const svg = _glvSvg(), m = svg.getScreenCTM(), p = svg.createSVGPoint(); p.x = (x + 0.5) * GARDEN_WORLD.cellW; p.y = GARDEN_WORLD.sky + (y + 0.5) * GARDEN_WORLD.cellH; const q = p.matrixTransform(m); return { x: q.x, y: q.y }; } catch (e) { return null; }
}
function _glvRefund(i, P) { const g = _gdG(); if (g.led['gl.o.' + i] && !g.led['gl.o.' + i].ok) { delete g.led['gl.o.' + i]; _gscSaveGarden(); } void P; }
/* ---------- gifts at your feet ---------- */
function _glvParcelAdd(b) {
  if (_glv.parcels.size >= 24 || !gsocGiftOk(b.k, b.item)) return;
  const P = { u: b.u || b.i, x: Number.isFinite(b.x) ? b.x + 0.5 : 10, y: Number.isFinite(b.y) ? b.y + 0.9 : 9, to: b.to, k: b.k, item: b.item };
  _glv.parcels.set(P.u, P);
  P.sprite = gardenWorldAdd({ id: 'gll-p-' + P.u, svg: _GLL_PARCEL_SVG, x: P.x, y: P.y, still: true, hit: 0.7, cursor: P.to === _glv.w ? 'hand' : 'no', label: P.to === _glv.w ? 'A parcel for you' : 'A parcel', onClick() { _glvGetParcel(P); } });
}
function _glvGetParcel(P) {
  if (P.to !== _glv.w) { gameDeny(P.sprite && P.sprite.node, { say: 'That parcel is for someone else.', kind: 'lock' }); return; }
  _glvIntent('pick', { u: P.u });
}
/** No garden gives you more in a day than this, whatever it says: the host's own caps. */
function _glvGotFull() { const today = _gllToday(); let n = 0; for (const [k, e] of Object.entries(_gdG().led)) if (k.startsWith('gl.g.') && e && e.d === today && e.f === _glv.fid) n++; return n >= GSOC_CAPS.recv.gift[0] + GL_CAPS.catch; }
function _glvGot(u, k, item) {
  const g = _gdG(), key = 'gl.g.' + u;
  if (g.led[key] || !gsocGiftOk(k, item) || _glvGotFull()) return;
  g.led[key] = { d: _gllToday(), k: 'gl', i: { [k + ':' + item]: 1 }, n: 0, f: _glv.fid };
  if (k === 'decor' && !g.disc[item]) g.disc[item] = _gllToday();
  if ((k === 'fish' || k === 'bug') && typeof gardenCatchReceived === 'function') gardenCatchReceived(k, item);
  _gscSaveGarden();
  if (typeof gameCheer === 'function') gameCheer(null, { text: '🎁', tone: 'gold' });
}
/* ---------- a bug everyone can see ---------- */
function _glvBugAdd(b) {
  if (_glv.bugs.has(b.u)) return;
  const def = typeof gardenBugDef === 'function' ? gardenBugDef(b.p) : null; if (!def) return;
  const B = { u: b.u, p: b.p, x: (b.x || 8) + 0.5, y: (b.y || 8) + 0.5 };
  const art = typeof gardenCatchSvg === 'function' ? `<g class="gll-bug"><g transform="translate(-14 -36) scale(0.6)">${String(gardenCatchSvg('bug', b.p, 46, { uid: 'gl' + b.u })).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></g>` : '<circle class="gll-bug" cy="-22" r="4" fill="#d9a441"/>';   // the catalogue's own drawing
  B.sprite = gardenWorldAdd({ id: 'gll-b-' + b.u, svg: art, x: B.x, y: B.y, still: true, hit: 0.9, cursor: 'net', label: def.name, onClick() { _glvIntent('catch', { u: B.u, p: B.p }); } });
  _glv.bugs.set(b.u, B);
}
function _glvGotBug(u, item) {
  const g = _gdG(), key = 'gl.g.' + u;
  if (g.led[key] || !gsocGiftOk('bug', item) || _glvGotFull()) return;
  g.led[key] = { d: _gllToday(), k: 'gl', i: { ['bug:' + item]: 1 }, n: 0, f: _glv.fid };
  if (typeof gardenCatchReceived === 'function') gardenCatchReceived('bug', item);
  _gscSaveGarden();
}
/* ---------- the people here: sprites in your world, as they are in the host's ---------- */
function _glvActorAdd(ev) {
  let A = _gll.actors.get(ev.w);
  if (!A) { A = _gllActor(ev); _gll.actors.set(ev.w, A); }
  else { A.n = ev.n; A.a = ev.a || A.a; A.pet = ev.pet || A.pet; A.lv = ev.lv; A.key = ''; if (A.root) _gllDress(A, A.root); }
  if (!_glv.sprites.has(ev.w)) _glv.sprites.set(ev.w, _gllSprite(A, () => _glvPersonMenu(A)));
  return A;
}
function _glvActorGone(w) {
  const S = _glv.sprites.get(w); if (S) { S.remove(); _glv.sprites.delete(w); }
  const A = _gll.actors.get(w); if (A && typeof _gllPetDrop === 'function') _gllPetDrop(A);
  _gll.actors.delete(w);
  if (_glv.follow === w) _glv.follow = null;
}
/* ---------- what you can say to someone ---------- */
function _glvPersonMenu(A) {
  openPopover(A.root, (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu');
    el.appendChild(_gsvEl('b', null, A.n));
    const r = _gsvEl('div', 'gll-menu-row');
    const go = (label, ic, fn) => r.appendChild(_gsvBtn(label, { icon: ic, kind: 'btn-ghost', run: () => { close(); fn(); } }));
    go('Wave', 'hand', () => { if (typeof gartEmoteRun === 'function') gartEmoteRun('wave', { quiet: true }); _glvSend('em', { c: 'em', e: 'wave', to: A.w }); });
    go('High five', 'hand', () => _glvHigh5(A));
    go(_glv.follow === A.w ? 'Stop following' : 'Follow', 'footprints', () => { _glv.follow = _glv.follow === A.w ? null : A.w; _glvSend('em', { c: 'do', e: _glv.follow != null ? 'follow' : 'unfollow', to: A.w }); if (_glv.follow != null) _glvFollowGo(A.x - 0.8, A.y + 0.3); });
    if (!glMayDo(_glv.lv, 'drop')) go('Give something', 'gift', () => _glvGiveMenu(A));
    if (glAtLeast(_glv.lv, GL_TRADE.lv)) go('Trade', 'repeat', () => gardenLiveTradeOpen(A));
    el.appendChild(r);
  }, { align: 'center' });
}
function _glvFollowGo(x, y) { _glv.followGo = true; try { gardenWalkToPoint({ x, y }, null, { radius: 3 }); } finally { _glv.followGo = false; } }
function _glvHigh5(A) {
  gardenWalkToPoint({ x: A.x - 0.7, y: A.y + 0.1 }, () => {
    if (typeof gartEmoteRun === 'function') gartEmoteRun('clap', { quiet: true });
    _glvSend('em', { c: 'do', e: 'high5', to: A.w });
    _gllFloat(_glvSvg(), A.x - 0.35, A.y - 1.4, '✋', '');
  }, { radius: 2 });
}
function _glvGiveMenu(A) {
  const list = _gsvGiftables();
  openPopover(A.root, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts');
    el.appendChild(_gsvEl('div', 'pop-label', `For ${A.n}`));
    const box = _gsvEl('div', 'gsv-gift-list');
    let any = false;
    for (const k of ['seed', 'decor', 'fish', 'bug']) for (const it of list[k].slice(0, 30)) {
      any = true;
      const id = k === 'fish' ? it.def.id + '-' + it.q : it.id;
      const b = _gsvEl('button', 'gsv-gift'); b.type = 'button';
      const t = _gsvEl('span', 'gsv-gift-t'); t.appendChild(_gsvEl('b', null, it.def.name)); b.appendChild(t); b.appendChild(_gsvEl('span', 'gsv-gift-n', '×' + it.n));
      b.onclick = () => { close(); const x = Math.max(0, Math.min(63, Math.floor(_gw.px))), y = Math.max(0, Math.min(40, Math.floor(_gw.py))); _glvIntent('drop', { k, item: id, to: A.w, x, y }, k + ':' + id); };
      box.appendChild(b);
    }
    if (!any) box.appendChild(_gsvEl('p', 'muted gsv-small', 'Your bag is empty for now.'));
    el.appendChild(box);
  }, { align: 'center', width: 300 });
}
/* ---------- the notes for the tag ---------- */
const _GLV_NOTES = Object.freeze({
  ask: 'You knocked. They can let you in from their garden.',
  closed: 'Their gate is closed just now. This is their garden as they last shared it.',
  away: 'They are not in their garden just now. This is the garden as they last shared it.',
  full: 'Their garden is full just now. Try again in a little while.',
  old: 'Their Freeflo is older than yours, so this is the garden as they last shared it.',
  newer: 'Their Freeflo is newer than yours. Update yours to play together. This is the garden as they last shared it.',
  road: 'Live play needs a quick update of the relay you share. This is the garden as they last shared it.',
  quiet: 'No answer. Their Freeflo has to be open, on the latest version, for you to get in. This is the garden as they last shared it.',
  unsent: 'Your knock could not be sent just now. Check your relay under Settings > Your relay, then knock again. This is the garden as they last shared it.',
  limit: 'Their relay is turning your messages away for now (too many today). It opens again after midnight UTC, or at once when they press Update my relay under Settings > Your relay. This is the garden as they last shared it.',
  lost: 'The connection dropped. Trying again…',
  home: 'They sent you home for now. This is the garden as they last shared it.',
  budget: 'That is all the live play for today. This is the garden as they last shared it.',
  rest: 'The relay is resting for a little while. This is the garden as they last shared it.',
});
/** How you are here changed: the tag says so, and what your level reaches is worked out again. */
function _glvHud() { if (typeof _gdvTouch === 'function') _gdvTouch(); }
function _glvKnockAgain() {
  _glv.state = 'knocking'; _glv.why = ''; _glvHud();
  _gllApi('/api/garden-live/here', { role: 'visit', on: 'again', f: _glv.fid, look: _glvLook() }).then(_glvTake).catch(() => {});
}
/** The phrases anyone in a live garden can say: the host too (2.28), to everyone who is there. */
function gardenLivePhrases(anchor) {
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu');
    const grid = _gsvEl('div', 'gll-menu-col');
    for (const p of GL_PHRASES) grid.appendChild(_gsvBtn(p.t, { kind: 'btn-ghost', run: () => { close(); gardenLiveSay(p.id); } }));
    el.appendChild(grid);
  }, { align: 'center' });
}
const _glvPhrases = gardenLivePhrases;
/** Say one: your own bubble at once, and everyone else's a moment later. */
function gardenLiveSay(id) {
  if (!GL_PHRASE_IDS.includes(id)) return;
  if (_gll.role === 'visit') { if (!_glvLive()) return; _gllSay(_gllMe, id); _glvSend('em', { c: 'say', e: id }); return; }
  if (typeof _glh !== 'undefined' && _glh.on && _glhAnyone()) { _gllSay(_gllMe, id); _glhSend('all', 'em', { c: 'say', e: id }); }
}
/* ---------- what the server hears ---------- */
function _glvEvent(ev) {
  switch (ev.k) {
    case 'state': _glvTake(ev); return;
    case 'budget': _glv.mode = ev.mode || 'normal'; return;
    case 'who': {
      if (ev.w === _glv.w) { _glv.selfName = ev.n; _gdvTouch(); return; }
      if (!ev.on) { _glvActorGone(ev.w); return; }
      _glvActorAdd(ev);
      return;
    }
    case 'go': {
      const A = _gll.actors.get(ev.w); if (!A) return;   // (you are not one of them: your own feet are the world's)
      _gllWalkVia(A, ev.r, ev.x, ev.y); if (_glv.follow === ev.w) _glvFollowGo(ev.x - 0.8, ev.y + 0.3);
      return;
    }
    case 'em': {
      const A = _gll.actors.get(ev.w); if (!A) return;
      if (ev.c === 'em') { if (Number.isFinite(ev.x)) { A.x = ev.x; A.y = ev.y; A.tx = null; } _gllEmote(A, ev.e); }
      else if (ev.c === 'say') _gllSay(A, ev.e);
      else if (ev.c === 'do' && ev.e === 'high5') { _gllEmote(A, 'clap'); if (ev.to === _glv.w && typeof gartEmoteRun === 'function') gartEmoteRun('clap', { quiet: true }); _gllFloat(_glvSvg(), A.x + 0.35, A.y - 1.4, '✋', ''); }
      else if (ev.c === 'do' && ev.e === 'follow' && ev.to === _glv.w) _gllFloat(_glvSvg(), A.x, A.y - 1.4, '🚶', A.n);
      return;
    }
    case 'res': _glvResult(Object.assign({}, ev, { k: ev.ik })); return;
    case 'snap': {
      const first = !_glv.snap;
      _glv.snap = ev.snap;
      _gll.by.clear();
      if (ev.by) for (const [kind, x, y, n] of ev.by.r) _gll.by.set(kind + '|' + x + '|' + y, ev.by.n[n]);
      if (first && typeof _gsvPaint === 'function') _gsvPaint();   // (no saved copy to look at: this may be the first the page has seen of it)
      _gdvTouch();
      return;
    }
    case 'cr': _glcGuestCr(ev.l); return;
    case 'pp': _gllPlacesIn(ev); return;
    case 'tr': if (typeof _gltFromHost === 'function') _gltFromHost(ev); return;
    case 'goal': if (typeof _glgGuestIn === 'function') _glgGuestIn(ev); return;
    case 'fx': {
      if (ev.c === 'ct') { if (typeof _ctGuestEvent === 'function') _ctGuestEvent(ev); return; }   // the host's contest round (94-garden-live-7contest.js)
      const A = _gll.actors.get(ev.w); if (A && typeof _gllFxPlay === 'function') _gllFxPlay(A, ev); return;
    }
    case 'd': _glvDelta(ev.ops); return;
    default:
  }
}
/* ---------- the garden changed ---------- */
function _glvDelta(ops) {
  const s = _glv.snap; if (!s || !Array.isArray(ops)) return;
  // (a path and a bench can share a cell: a decoration's row is told apart by what it is, and by its layer)
  const layer = (id) => { const d = gardenDecor(id); return d && d.layer === 'ground' ? 1 : 0; };
  for (const o of ops) {
    const key = (o.o.endsWith('p') ? 'p|' : 'd|') + o.x + '|' + o.y;
    if (o.o === '+p') { s.plants = s.plants.filter(r => !(r[1] === o.x && r[2] === o.y)); s.plants.push([o.id, o.x, o.y, o.s || 0, o.v || 0, o.f || 0]); if (o.by) _gll.by.set(key, o.by); else _gll.by.delete(key); }
    else if (o.o === '-p') { s.plants = s.plants.filter(r => !(r[1] === o.x && r[2] === o.y)); _gll.by.delete(key); }
    else if (o.o === '~p') { const r = s.plants.find(q => q[1] === o.x && q[2] === o.y); if (r) { r[3] = o.s ?? r[3]; r[5] = o.f ?? r[5]; } }
    else if (o.o === '+d') { s.decor = s.decor.filter(r => !(r[1] === o.x && r[2] === o.y && layer(r[0]) === layer(o.id))); s.decor.push([o.id, o.x, o.y, o.r || 0, o.v || 0]); if (o.by) _gll.by.set(key, o.by); else _gll.by.delete(key); }
    else if (o.o === '-d') { s.decor = s.decor.filter(r => !(r[1] === o.x && r[2] === o.y && (!o.id || r[0] === o.id))); _gll.by.delete(key); }
    else if (o.o === '~d') { const r = s.decor.find(q => q[1] === o.x && q[2] === o.y && (!o.id || q[0] === o.id)); if (r) { r[3] = o.r ?? r[3]; r[4] = o.v ?? r[4]; } }
  }
  _gdvTouch();
}

/* 2.28: a change of clothes or of pet while you are in somebody's garden shows at once, not at your next visit */
(function _glvLookWatch() {
  if (typeof document === 'undefined') return;
  let t = 0;
  const soon = () => { clearTimeout(t); t = setTimeout(() => { try { if (_gll.role === 'visit' && _glvLive()) _glvSend('me', _glvLook()); } catch (e) { /* the next beat has it */ } }, 1500); };
  document.addEventListener('opendash:profile', soon); document.addEventListener('opendash:pet', soon);
})();
