/* ============================================================
   PLAYING TOGETHER, a visitor's side (docs/dev/GARDEN_TOGETHER.md). On a friend's visit page (94-garden-social-2visit.js) this knocks
   at their gate. If they let you in, you are in their garden: you walk where you click, you see everyone walk and do things, and
   what your level allows you ask for. You ask; their computer decides. When it says no, or nobody answers, the visit stays the saved
   copy it has always been, with a plain note.

     gardenLiveVisitEnter(fid) / gardenLiveVisitLeave()     the page came and went
     gardenLiveStage(box, fig, f)                           the stage was drawn: everyone goes on it
     gardenLiveOverlay(fid, data)                           the garden as it is NOW instead of the saved copy, while you are there
   ============================================================ */
const _glv = { fid: '', state: '', why: '', lv: 'none', w: null, road: null, touch: false, mode: 'normal', box: null, svg: null, hud: null, snap: null, raf: 0, last: 0, beatT: 0, tool: 'hand', goAt: 0, goT: 0, pending: new Map(), follow: null, parcels: new Map(), bugs: new Map(), seat: 0 };
function _glvMe() { return _glv.w != null ? _gll.actors.get(_glv.w) : null; }
function _glvLive() { return _glv.state === 'live'; }
function _glvFriend() { return _gscFriend(_glv.fid); }
function _glvSend(k, body) { return _gllApi('/api/garden-live/send', { k, body }).catch(() => null); }
function _glvLook() { const me = _glvMe(), l = gardenLiveLook(); if (me) { l.x = Math.round(me.x * 10) / 10; l.y = Math.round(me.y * 10) / 10; } return l; }
function gardenLiveVisitEnter(fid) {
  if (_glv.fid === fid && _gll.role === 'visit') return;
  _glvClear();
  _gll.role = 'visit'; _glv.fid = fid; _glv.state = 'knocking';
  _gllApi('/api/garden-live/here', { role: 'visit', on: true, f: fid, look: gardenLiveLook() }).then(_glvTake).catch(() => { _glv.state = 'look'; _glv.why = 'quiet'; _glvHud(); });
  clearInterval(_glv.beatT);
  _glv.beatT = setInterval(() => { if (_glv.fid === fid) _gllApi('/api/garden-live/here', { role: 'visit', on: true, f: fid, look: _glvLook() }).then(_glvTake).catch(() => {}); }, 30000);
  gardenLiveLoad(true).catch(() => {});
}
function gardenLiveVisitLeave() {
  if (_gll.role !== 'visit') return;
  const fid = _glv.fid;
  _glvClear();
  _gll.role = '';
  if (fid) _gllApi('/api/garden-live/here', { role: 'visit', on: false, f: fid }).catch(() => {});
}
function _glvClear() {
  clearInterval(_glv.beatT); cancelAnimationFrame(_glv.raf); clearTimeout(_glv.goT);
  for (const A of _gll.actors.values()) { if (A.root) A.root.remove(); if (A.petNode) A.petNode.remove(); }
  _gll.actors.clear(); _gll.by.clear();
  for (const P of _glv.parcels.values()) if (P.node) P.node.remove();
  for (const P of _glv.bugs.values()) if (P.node) P.node.remove();
  Object.assign(_glv, { fid: '', state: '', why: '', lv: 'none', w: null, road: null, snap: null, raf: 0, tool: 'hand', follow: null, box: null, svg: null, hud: null, ver: 0 });
  _glv.parcels.clear(); _glv.bugs.clear();
  _gllTip(null, '');
}
function _glvTake(d) {
  const v = d && d.visit;
  if (!v || v.f !== _glv.fid || (v.ver || 0) < (_glv.ver || 0)) return;   // (an answer that left before the latest event)
  _glv.ver = v.ver || 0;
  const was = _glv.state;
  _glv.state = v.state; _glv.why = v.why; _glv.lv = v.lv; _glv.w = v.w; _glv.road = v.road; _glv.touch = v.touch; _glv.mode = v.mode || 'normal';
  if (_glv.state === 'live' && _glv.w != null && !_gll.actors.has(_glv.w)) _gll.actors.set(_glv.w, _gllActor({ w: _glv.w, me: true, n: "You", a: gardenLiveLook().a, pet: gardenLiveLook().pet }));
  if (was === 'live' && _glv.state !== 'live') { for (const [w, A] of _gll.actors) { if (!A.me) { if (A.root) A.root.remove(); if (A.petNode) A.petNode.remove(); _gll.actors.delete(w); } } _glv.snap = null; if (typeof _gsvPaint === 'function') _gsvPaint(); }
  if (was !== 'live' && _glv.state === 'live') { _glvResend(); _glvLoopStart(); if (!_glv.snap) _glvSend('me', _glvLook()); }   // (this page may be new to a visit the server already has: tell me who is here, and the garden as it is)
  _glvHud();
}
/** What you asked for before and never heard back about: the same id, so it can only happen once. */
function _glvResend() {
  if (typeof gardenReady !== 'function' || !gardenReady()) return;
  const g = _gdG();
  for (const [k, e] of Object.entries(g.led)) {
    if (!k.startsWith('gl.o.') || !e || e.ok || e.to !== _glv.fid || !e.t) continue;
    const i = k.slice(5);
    _glv.pending.set(i, { t: e.t, debit: true, resend: true });
    _glvSend('do', { i, t: e.t, p: e.p, x: e.x, y: e.y, ...(e.k2 ? { k: e.k2, item: e.item, to: e.to2 } : {}) });
  }
}
/* ---------- the stage ---------- */
function gardenLiveStage(box, fig, f) {
  if (_gll.role !== 'visit' || !f || f.id !== _glv.fid) return;
  _glv.box = box; _glv.svg = fig && (fig.matches('svg') ? fig : fig.querySelector('svg'));
  box.classList.toggle('is-gl-live', _glvLive());
  if (!box._gllBound) {
    box._gllBound = true;
    box.addEventListener('click', _glvClick, true);
    box.addEventListener('pointermove', _glvHover, { passive: true });
    box.addEventListener('pointerleave', () => { _gllTip(null, ''); _glvGhost(null); });
  }
  requestAnimationFrame(_glvHud);   // (the page puts the stage in place after this returns)
  if (_glvLive()) _glvLoopStart();
}
/** The garden as it is now, not the saved copy, while you are there. */
function gardenLiveOverlay(fid, data) {
  if (_gll.role !== 'visit' || fid !== _glv.fid || !_glv.snap || !data) return data;
  return Object.assign({}, data, { garden: Object.assign({ got: 0, hearts: 0 }, data.garden || {}, { snap: _glv.snap, at: Date.now() }) });   // clock-ok: it is live (and they may have let you in without sharing a saved copy)
}
function _glvLoopStart() { if (!_glv.raf) _glv.raf = requestAnimationFrame(_glvFrame); }
function _glvFrame(ts) {
  _glv.raf = 0;
  if (_gll.role !== 'visit' || !_glv.svg || !_glv.svg.isConnected) return;
  const dt = Math.min(0.11, _glv.last ? (ts - _glv.last) / 1000 : 0.016); _glv.last = ts;
  const W = GARDEN_WORLD;
  let busy = false;
  for (const A of _gll.actors.values()) {
    if (!A.root || !A.root.isConnected || A.root.ownerSVGElement !== _glv.svg) { const g = _gllSvgEl('g'); g.setAttribute('data-live', '1'); _gllDress(A, g); A.tf = null; A.zk = null; }
    if (_gllStep(A, dt)) busy = true;
    const tf = `translate(${(A.x * W.cellW).toFixed(1)} ${(W.sky + A.y * W.cellH).toFixed(1)})`;
    if (A.tf !== tf) { A.tf = tf; A.root.setAttribute('transform', tf); }
    const zk = Math.floor(A.y * 3);
    if (A.zk !== zk || !A.root.parentNode) { A.zk = zk; A.root.setAttribute('data-z', A.y.toFixed(2)); _gllPlace(_glv.svg, A.root, A.y); }
    _gllPetStep(A, dt, _glv.svg);
  }
  _glvPetsGreet();
  // a phone shows part of the garden and scrolls: keep yourself in it
  { const me = _glvMe(), col = _glv.box && _glv.box.closest('.gsv-col'); if (me && me.moving && col && col.scrollWidth > col.clientWidth + 4) { const B = gardenCropBox(_gsv.crop || 'all'), to = me.x * W.cellW * (col.scrollWidth / B.w) - col.clientWidth / 2; col.scrollLeft += (to - col.scrollLeft) * 0.08; } }
  // (the page's own loop never stops for long: one frame only when something moves, else a few a second)
  if (busy) _glv.raf = requestAnimationFrame(_glvFrame);
  else setTimeout(() => { if (_gll.role === 'visit' && !_glv.raf && !document.hidden) _glv.raf = requestAnimationFrame(_glvFrame); }, 160);
}
/** Two pets near each other say hello: a heart, on this side only, nothing sent. */
function _glvPetsGreet() {
  const list = [..._gll.actors.values()].filter(A => A.pet && A.petNode);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], key = a.w + '|' + b.w, now = Date.now();   // clock-ok: only spacing a flourish
    if (Math.hypot(a.petX - b.petX, (a.petY - b.petY) * 0.6) > 1.6 || now - (_glv.greeted && _glv.greeted[key] || 0) < 60000) continue;
    (_glv.greeted = _glv.greeted || {})[key] = now;
    _gllFloat(_glv.svg, (a.petX + b.petX) / 2, (a.petY + b.petY) / 2, '💞', '');
  }
}
/* ---------- where the pointer is ---------- */
function _glvPt(ev) {
  try { const svg = _glv.svg, ctm = svg.getScreenCTM(); if (!ctm) return null; const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const p = pt.matrixTransform(ctm.inverse()), W = GARDEN_WORLD; return { x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH }; } catch (e) { return null; }
}
function _glvItem(t) { const g = t && t.closest ? t.closest('.gd-it') : null; if (!g || !_glv.box || !_glv.box.contains(g) || g.classList.contains('gd-pet')) return null; return { g, x: +g.getAttribute('data-x'), y: +g.getAttribute('data-y'), plant: g.classList.contains('gd-plant') }; }
/** What stands on this cell, when the pointer is between its leaves. */
function _glvItemAt(pt) {
  const s = _glvSnapNow(); if (!s || !pt || !_glv.svg) return null;
  const x = Math.floor(pt.x), y = Math.floor(pt.y);
  for (const r of s.plants) { const f = (gardenPlant(r[0]) || {}).fp || 1; if (x >= r[1] && x < r[1] + f && y >= r[2] && y < r[2] + f) { const g = _glv.svg.querySelector(`.gd-plant[data-x="${r[1]}"][data-y="${r[2]}"]`); if (g) return { g, x: r[1], y: r[2], plant: true }; } }
  for (const r of s.decor) { const d = gardenDecor(r[0]); if (!d || d.layer === 'ground') continue; if (x >= r[1] && x < r[1] + (d.w || 1) && y >= r[2] && y < r[2] + (d.h || 1)) { const g = _glv.svg.querySelector(`.gd-decor[data-x="${r[1]}"][data-y="${r[2]}"]`); if (g) return { g, x: r[1], y: r[2], plant: false }; } }
  return null;
}
function _glvRow(it) { const s = _glvSnapNow(); if (!s || !it) return null; return it.plant ? s.plants.find(r => r[1] === it.x && r[2] === it.y) : s.decor.find(r => r[1] === it.x && r[2] === it.y); }
function _glvSnapNow() { const c = gardenSocialFriendCached(_glv.fid); return c && c.garden ? c.garden.snap : null; }
function _glvHover(ev) {
  if (_gll.role !== 'visit' || !_glv.svg) return;
  const it = _glvItem(ev.target) || _glvItemAt(_glvPt(ev));
  if (it) _gllTip(_glv.box, _gllByLine(it.plant ? 'p' : 'd', _gll.by.get((it.plant ? 'p|' : 'd|') + it.x + '|' + it.y)), ev); else _gllTip(_glv.box, '', ev);
  if (_glvLive() && _glv.tool !== 'hand' && _glv.tool !== 'water') {
    const p = _glvPt(ev);
    _glvGhost(p ? { x: Math.floor(p.x), y: Math.floor(p.y) } : null);
  } else _glvGhost(null);
}
/** Why this can't go here, as far as a visitor can tell: the host has the last word. */
function _glvPlaceWhy(tool, x, y) {
  const s = _glvSnapNow(); if (!s) return 'wait';
  const [kind, id] = tool.split(':');
  const def = kind === 'seed' ? gardenPlant(id) : gardenDecor(id);
  if (!def) return 'unknown';
  const why = gardenCellOk(def, x, y, s.lv, kind === 'seed' ? 'plant' : 'decor');
  if (why) return why;
  const w = kind === 'seed' ? def.fp || 1 : def.w || 1, h = kind === 'seed' ? def.fp || 1 : def.h || 1;
  const hits = (ax, ay, aw, ah) => x < ax + aw && ax < x + w && y < ay + ah && ay < y + h;
  for (const r of s.plants) { const d = gardenPlant(r[0]), f = d ? d.fp || 1 : 1; if (hits(r[1], r[2], f, f)) return 'taken'; }
  for (const r of s.decor) { const d = gardenDecor(r[0]); if (!d) continue; if (kind === 'seed' ? (d.layer === 'ground' && hits(r[1], r[2], d.w || 1, d.h || 1)) : ((d.layer === 'ground') === (def.layer === 'ground') && hits(r[1], r[2], d.w || 1, d.h || 1))) return 'taken'; }
  return '';
}
function _glvGhost(cell) {
  const svg = _glv.svg; if (!svg) return;
  let g = svg.querySelector(':scope > .gll-ghost');
  if (!cell) { if (g) g.remove(); if (_glv.box) _glv.box.classList.remove('gll-cant'); return; }
  if (!g) { g = _gllSvgEl('rect', 'gll-ghost'); g.setAttribute('width', String(GARDEN_WORLD.cellW)); g.setAttribute('height', String(GARDEN_WORLD.cellH)); g.setAttribute('rx', '4'); svg.appendChild(g); }
  g.setAttribute('x', String(cell.x * GARDEN_WORLD.cellW)); g.setAttribute('y', String(GARDEN_WORLD.sky + cell.y * GARDEN_WORLD.cellH));
  const bad = !!_glvPlaceWhy(_glv.tool, cell.x, cell.y);
  g.classList.toggle('is-bad', bad);
  _glv.box.classList.toggle('gll-cant', bad);
}
/* ---------- a click ---------- */
function _glvClick(ev) {
  if (!_glvLive() || !_glv.svg) return;
  if (ev.target && ev.target.closest && ev.target.closest('.gll-hud, .gsv-toolbar, .gd-camui, button, a, input')) return;
  const pt = _glvPt(ev); if (!pt) return;
  const at = { x: ev.clientX, y: ev.clientY };
  ev.stopPropagation(); ev.preventDefault();
  _glv.follow = null;
  // someone: their little menu; a parcel or a bug: go and get it
  for (const P of _glv.parcels.values()) if (Math.hypot(P.x - pt.x, (P.y - pt.y) * 1.2) < 0.8) { _glvGetParcel(P, at); return; }
  for (const B of _glv.bugs.values()) if (Math.hypot(B.x - pt.x, (B.y - pt.y) * 1.2) < 0.9) { _glvGetBug(B, at); return; }
  for (const A of _gll.actors.values()) if (!A.me && Math.hypot(A.x - pt.x, (A.y - 0.9 - pt.y) * 0.6) < 0.9) { _glvPersonMenu(A, ev); return; }
  const it = _glvItem(ev.target) || _glvItemAt(pt);
  if (_glv.tool.includes(':')) { _glvPlaceClick(pt, at); return; }
  if (it) { _glvItemClick(it, at); return; }
  _glvWalk(pt.x, pt.y);
}
function _glvWalk(x, y, then) {
  const me = _glvMe(); if (!me) return;
  const W = GARDEN_WORLD;
  const px = Math.max(0.3, Math.min(W.cols - 0.3, x)), py = Math.max(0.1, Math.min(W.rows - 0.1, y));
  _gllWalkTo(me, px, py, then);
  _glvLoopStart();
  _glvGoSend(px, py);
}
function _glvGoSend(x, y) {
  const gap = _glv.mode === 'thin' ? GL_WALK_GAP.thin : GL_WALK_GAP.normal, t = Date.now();   // clock-ok: spacing messages
  clearTimeout(_glv.goT);
  const go = () => { _glv.goAt = Date.now(); _glvSend('go', { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }); };  // clock-ok: spacing messages
  if (t - _glv.goAt >= gap) go(); else _glv.goT = setTimeout(go, gap - (t - _glv.goAt));
}
function _glvNear(x, y, then) {
  const me = _glvMe(); if (!me) return;
  if (Math.hypot((x - me.x) * GARDEN_WORLD.cellW, (y - me.y) * GARDEN_WORLD.cellH) < 58) { then(); return; }
  _glvWalk(x, y, then);
}
function _glvItemClick(it, at) {
  const row = _glvRow(it); if (!row) return;
  const stand = { x: it.x + 0.5, y: it.y + 1.25 };
  if (it.plant) {
    const flags = row[5] || 0, mine = _glvMine('p', it.x, it.y);
    const can = (t) => !glMayDo(_glv.lv, t);
    if (_glv.tool === 'water' || (flags & 1)) {
      if (!can('water') || !gsocWaterOk(row[0])) { gameDeny(it.g, { at, say: 'Your friend has not let you water here.', kind: 'water' }); _glvWalk(stand.x, stand.y); return; }
      _glvNear(stand.x, stand.y, () => _glvIntent('water', { p: row[0], x: it.x, y: it.y }));
      return;
    }
    if (flags & 4) {
      if (!can('harvest') || (!mine && !_glv.touch)) { gameDeny(it.g, { at, say: 'That is not yours to pick.', kind: 'lock' }); _glvWalk(stand.x, stand.y); return; }
      _glvNear(stand.x, stand.y, () => _glvIntent('harvest', { p: row[0], x: it.x, y: it.y }));
      return;
    }
    if (flags & 2) {
      if (!can('weed')) { gameDeny(it.g, { at, say: 'Your friend has not let you tidy here.', kind: 'lock' }); _glvWalk(stand.x, stand.y); return; }
      _glvNear(stand.x, stand.y, () => _glvIntent('weed', { p: row[0], x: it.x, y: it.y }));
      return;
    }
    _glvWalk(stand.x, stand.y, () => { if (typeof _gsvPlantCard === 'function' && _glvFriend() && it.g.isConnected) _gsvPlantCard(_glvFriend(), row, it.g); });
    return;
  }
  const def = gardenDecor(row[0]);
  if (def && def.effect && def.effect.kind === 'sit') {   // a seat: you sit on it (two can)
    const seat = (_glv.w || 0) % 2 ? -0.28 : 0.28;   // a place each
    _glvWalk(it.x + (def.w || 1) / 2 + seat, it.y + (def.h || 1) * 0.72, () => { const me = _glvMe(); if (me) { _gllEmote(me, 'sit'); _glvSend('em', { c: 'em', e: 'sit', x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10 }); } });
    return;
  }
  if (_glvMine('d', it.x, it.y) && !glMayDo(_glv.lv, 'take')) { _glvWalk(stand.x, stand.y, () => _glvDecorMenu(it, row)); return; }
  _glvWalk(stand.x, stand.y);
}
function _glvMine(kind, x, y) { const me = _gll.by.get(kind + '|' + x + '|' + y); const self = _glv.selfName; return !!me && !!self && me === self; }
function _glvDecorMenu(it, row) {
  const def = gardenDecor(row[0]); if (!def || !it.g.isConnected) return;
  openPopover(it.g, (el, close) => {
    el.classList.add('gsv-pop');
    el.appendChild(_gsvEl('b', null, def.name));
    el.appendChild(_gsvEl('span', 'muted gsv-small', 'You placed this'));
    const r = _gsvEl('div', 'gsv-row');
    r.appendChild(_gsvBtn('Take it back', { icon: 'package', run: () => { close(); _glvIntent('take', { p: row[0], x: it.x, y: it.y }); } }));
    r.appendChild(_gsvBtn(`Give it to ${_gscFirst(_glv.fid)}`, { icon: 'gift', kind: 'btn-ghost', run: () => { close(); _glvIntent('give', { p: row[0], x: it.x, y: it.y }); } }));
    el.appendChild(r);
  }, { align: 'center' });
}
/** Plant or place what is in your hand: it comes out of your own bag first. */
function _glvPlaceClick(pt, at) {
  const x = Math.floor(pt.x), y = Math.floor(pt.y), tool = _glv.tool, [kind, id] = tool.split(':');
  const t = kind === 'seed' ? 'plant' : 'place';
  if (glMayDo(_glv.lv, t)) { gameDeny(null, { at, say: 'Your friend has not let you plant here.', kind: 'lock' }); return; }
  if (gardenHas(tool) < 1) { gameDeny(null, { at, say: 'None left in your bag.', kind: 'bag' }); _glv.tool = 'hand'; _glvHud(); return; }
  const why = _glvPlaceWhy(tool, x, y);
  if (why) { gameDeny(null, { at, say: why, kind: 'tool' }); return; }
  _glvNear(x + 0.5, y + 1.3, () => { if (gardenHas(tool) >= 1) _glvIntent(t, { p: id, x, y }, tool); });
}
/* ---------- asking ---------- */
/** An intent, with an id. `debit`: what leaves your bag now (the sender always pays first; a refusal hands it back). */
function _glvIntent(t, f, debit) {
  if (!_glvLive()) return;
  const i = _gllNewId(), g = _gdG();
  if (debit) { g.led['gl.o.' + i] = { d: _gllToday(), k: 'gl', i: { [debit]: -1 }, n: 0, to: _glv.fid, t, p: f.p, x: f.x, y: f.y, ...(f.k ? { k2: f.k, item: f.item, to2: f.to } : {}) }; _gscSaveGarden(); }
  _glv.pending.set(i, { t, debit: !!debit, f });
  const me = _glvMe(); if (me) _gllPose(me, _GL_POSE[t] || 'pick', 760);
  _glvSend('do', { i, t, ...f });
}
function _glvResult(b) {
  const me = b.w === _glv.w;
  const A = _gll.actors.get(b.w);
  if (b.t === 'bug') { _glvBugAdd(b); return; }
  if (b.t === 'bugend') { const B = _glv.bugs.get(b.u); if (B) { if (B.node) B.node.remove(); _glv.bugs.delete(b.u); } return; }
  if (b.t === 'undo') { _gllFloat(_glv.svg, b.x || 10, b.y || 8, '↩️', ''); return; }
  if (!b.ok) {
    if (me && b.i && _glv.pending.has(b.i)) {
      const P = _glv.pending.get(b.i); _glv.pending.delete(b.i);
      if (P.resend && (b.why === 'level' || b.why === 'wait')) return;   // asked again and not looked at: it may have happened the first time, when the answer was lost. It stays spent until a real answer or a week.
      _glvRefund(b.i, P); const at = _glvCellAt(P.f && P.f.x, P.f && P.f.y); gameDeny(null, { at: at || undefined, say: 'That did not work here.', kind: 'tool' });
    }
    return;
  }
  if (A && !A.me) _gllPose(A, _GL_POSE[b.t] || 'pick', 760);
  if (b.t === 'drop') { _glvParcelAdd(b); }
  // a gift is what this page saw left for you, not what any message says it is
  if (b.t === 'pick' || b.t === 'dropend') { const P = _glv.parcels.get(b.u); if (P) { if (P.node) P.node.remove(); _glv.parcels.delete(b.u); if (b.t === 'pick' && b.to === _glv.w && P.to === _glv.w) _glvGot(b.u, P.k, P.item); } }
  if (b.x != null && _GL_EMOJI[b.t]) _gllFloat(_glv.svg, b.x, b.y, _GL_EMOJI[b.t], A ? (A.me ? 'You' : A.n) : '');
  if (me && b.i) {
    const P = _glv.pending.get(b.i);
    _glv.pending.delete(b.i);
    const g = _gdG(), led = g.led['gl.o.' + b.i];
    if (led && !led.ok) { led.ok = 1; led.x = b.t === 'plant' ? 2 : b.t === 'place' ? 1 : 0; if (b.t === 'plant' && led.p) { g.gv[b.i] = { f: _glv.fid, p: led.p, at: _gscNow() }; const ks = Object.keys(g.gv); if (ks.length > 240) for (const k of ks.sort((x, y) => g.gv[x].at - g.gv[y].at).slice(0, 40)) delete g.gv[k]; } _gscSaveGarden(); }
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
  }
}
function _glvCellAt(x, y) {
  try { const svg = _glv.svg, m = svg.getScreenCTM(), p = svg.createSVGPoint(); p.x = (x + 0.5) * GARDEN_WORLD.cellW; p.y = GARDEN_WORLD.sky + (y + 0.5) * GARDEN_WORLD.cellH; const q = p.matrixTransform(m); return { x: q.x, y: q.y }; } catch (e) { return null; }
}
function _glvRefund(i, P) { const g = _gdG(); if (g.led['gl.o.' + i] && !g.led['gl.o.' + i].ok) { delete g.led['gl.o.' + i]; _gscSaveGarden(); } void P; }
/* ---------- gifts at your feet ---------- */
function _glvParcelNode(P) {
  const svg = _glv.svg; if (!svg) return;
  const g = _gllSvgEl('g', 'gll-parcel'); g.setAttribute('data-live', '1');
  g.setAttribute('transform', `translate(${(P.x * GARDEN_WORLD.cellW).toFixed(1)} ${(GARDEN_WORLD.sky + P.y * GARDEN_WORLD.cellH).toFixed(1)})`); g.setAttribute('data-z', String(P.y));
  g.innerHTML = '<ellipse cx="0" cy="1" rx="11" ry="3" fill="#000000" fill-opacity="0.16"/><rect x="-9" y="-15" width="18" height="15" rx="2" fill="#e8799a" stroke="#b84a6f"/><rect x="-2" y="-15" width="4" height="15" fill="#fff0c8"/><path d="M0 -15c-6 -7 -10 -2 -6 0zM0 -15c6 -7 10 -2 6 0z" fill="#fff0c8" stroke="#d9c188"/>';
  _gllPlace(svg, g, P.y);
  P.node = g;
}
function _glvParcelAdd(b) { if (_glv.parcels.size >= 24 || !gsocGiftOk(b.k, b.item)) return; const P = { u: b.u || b.i, x: Number.isFinite(b.x) ? b.x + 0.5 : 10, y: Number.isFinite(b.y) ? b.y + 0.9 : 9, to: b.to, k: b.k, item: b.item }; _glv.parcels.set(P.u, P); _glvParcelNode(P); }
function _glvGetParcel(P, at) {
  if (P.to !== _glv.w) { gameDeny(P.node, { at, say: 'That parcel is for someone else.', kind: 'lock' }); return; }
  _glvNear(P.x, P.y + 0.4, () => _glvIntent('pick', { u: P.u }));
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
  if (typeof gameCheer === 'function') gameCheer(_glv.hud, { text: '🎁', tone: 'gold' });
}
/* ---------- a bug everyone can see ---------- */
function _glvBugAdd(b) {
  if (_glv.bugs.has(b.u)) return;
  const def = typeof gardenBugDef === 'function' ? gardenBugDef(b.p) : null; if (!def) return;
  const B = { u: b.u, p: b.p, x: (b.x || 8) + 0.5, y: (b.y || 8) + 0.5 };
  const g = _gllSvgEl('g', 'gll-bug'); g.setAttribute('data-live', '1');
  g.setAttribute('transform', `translate(${(B.x * GARDEN_WORLD.cellW).toFixed(1)} ${(GARDEN_WORLD.sky + B.y * GARDEN_WORLD.cellH - 22).toFixed(1)})`);
  g.innerHTML = typeof gardenCatchSvg === 'function' ? `<g transform="translate(-14 -14) scale(0.6)">${String(gardenCatchSvg('bug', b.p, 46, { uid: 'gl' + b.u })).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>` : '<circle r="4" fill="#d9a441"/>';   // the catalogue's own drawing
  const fx = _glv.svg && _glv.svg.querySelector('.gd-actors'); if (fx) fx.appendChild(g);
  B.node = g; _glv.bugs.set(b.u, B);
}
function _glvGetBug(B, at) {
  if (glMayDo(_glv.lv, 'catch')) { gameDeny(B.node, { at, say: 'Not yet.', kind: 'lock' }); return; }
  _glvNear(B.x, B.y + 0.5, () => _glvIntent('catch', { u: B.u, p: B.p }));
}
function _glvGotBug(u, item) {
  const g = _gdG(), key = 'gl.g.' + u;
  if (g.led[key] || !gsocGiftOk('bug', item) || _glvGotFull()) return;
  g.led[key] = { d: _gllToday(), k: 'gl', i: { ['bug:' + item]: 1 }, n: 0, f: _glv.fid };
  if (typeof gardenCatchReceived === 'function') gardenCatchReceived('bug', item);
  _gscSaveGarden();
}
/* ---------- what you can say to someone ---------- */
function _glvPersonMenu(A, ev) {
  const el0 = _glv.box;
  openPopover(_gllAnchorAt(ev), (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu');
    el.appendChild(_gsvEl('b', null, A.n));
    const r = _gsvEl('div', 'gll-menu-row');
    const go = (label, ic, fn) => r.appendChild(_gsvBtn(label, { icon: ic, kind: 'btn-ghost', run: () => { close(); fn(); } }));
    go('Wave', 'hand', () => { const me = _glvMe(); if (me) _gllEmote(me, 'wave'); _glvSend('em', { c: 'em', e: 'wave', to: A.w }); });
    go('High five', 'hand', () => _glvHigh5(A));
    go(_glv.follow === A.w ? 'Stop following' : 'Follow', 'footprints', () => { _glv.follow = _glv.follow === A.w ? null : A.w; _glvSend('em', { c: 'do', e: _glv.follow != null ? 'follow' : 'unfollow', to: A.w }); if (_glv.follow != null) _glvWalk(A.x - 0.8, A.y + 0.3); });
    if (!glMayDo(_glv.lv, 'drop')) go('Give something', 'gift', () => _glvGiveMenu(A, ev));
    el.appendChild(r);
  }, { align: 'center' });
  void el0;
}
function _glvHigh5(A) {
  _glvWalk(A.x - 0.7, A.y + 0.1, () => {
    const me = _glvMe(); if (!me) return;
    me.face = 1; _gllEmote(me, 'clap');
    _glvSend('em', { c: 'do', e: 'high5', to: A.w });
    _gllFloat(_glv.svg, A.x - 0.35, A.y - 1.4, '✋', '');
  });
}
function _glvGiveMenu(A, ev) {
  const list = _gsvGiftables();
  openPopover(_gllAnchorAt(ev), (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts');
    el.appendChild(_gsvEl('div', 'pop-label', `For ${A.n}`));
    const box = _gsvEl('div', 'gsv-gift-list');
    let any = false;
    for (const k of ['seed', 'decor', 'fish', 'bug']) for (const it of list[k].slice(0, 30)) {
      any = true;
      const id = k === 'fish' ? it.def.id + '-' + it.q : it.id;
      const b = _gsvEl('button', 'gsv-gift'); b.type = 'button';
      const t = _gsvEl('span', 'gsv-gift-t'); t.appendChild(_gsvEl('b', null, it.def.name)); b.appendChild(t); b.appendChild(_gsvEl('span', 'gsv-gift-n', '×' + it.n));
      b.onclick = () => { close(); const me = _glvMe(); const x = Math.max(0, Math.min(63, Math.floor(me ? me.x : 10))), y = Math.max(0, Math.min(40, Math.floor(me ? me.y : 9))); _glvIntent('drop', { k, item: id, to: A.w, x, y }, k + ':' + id); };
      box.appendChild(b);
    }
    if (!any) box.appendChild(_gsvEl('p', 'muted gsv-small', 'Your bag is empty for now.'));
    el.appendChild(box);
  }, { align: 'center', width: 300 });
}
/* ---------- the row over the garden ---------- */
const _GLV_NOTES = Object.freeze({
  knocking: 'Knocking at the gate…',
  ask: 'You knocked. They can let you in from their garden.',
  closed: 'Their gate is closed just now. This is their garden as they last shared it.',
  away: 'They are not in their garden just now. This is the garden as they last shared it.',
  full: 'Their garden is full just now. Try again in a little while.',
  old: 'Their Freeflo is older than yours, so this is the garden as they last shared it.',
  road: 'Live play needs a quick update of the relay you share. This is the garden as they last shared it.',
  quiet: 'No answer from their computer. This is the garden as they last shared it.',
  lost: 'The connection dropped. Trying again…',
  home: 'They sent you home for now. This is the garden as they last shared it.',
  budget: 'That is all the live play for today. This is the garden as they last shared it.',
  rest: 'The relay is resting for a little while. This is the garden as they last shared it.',
});
function _glvHud() {
  const box = _glv.box; if (!box || !box.isConnected) return;
  box.classList.toggle('is-gl-live', _glvLive());
  if (_gsv.root) _gsv.root.classList.toggle('is-gl-live', _glvLive());
  let hud = box.querySelector(':scope > .gll-hud');
  if (!hud) { hud = document.createElement('div'); hud.className = 'gll-hud'; box.appendChild(hud); }
  _glv.hud = hud; hud.textContent = '';
  const first = _gscFirst(_glv.fid);
  if (!_glvLive()) {
    const note = _GLV_NOTES[_glv.state === 'knocking' ? 'knocking' : _glv.why] || '';
    if (note) { const n = _gsvEl('div', 'gll-note' + (_glv.state === 'knocking' ? ' is-wait' : '')); n.innerHTML = icon(_glv.state === 'knocking' ? 'loader-circle' : 'lock', 'i-sm'); n.appendChild(_gsvEl('span', null, note)); if (_glv.state === 'look' && _glv.why && _glv.why !== 'home') n.appendChild(_gsvBtn('Knock again', { kind: 'btn-ghost', run: _glvKnockAgain })); hud.appendChild(n); }
    return;
  }
  const lvl = _gsvEl('div', 'gll-chip gll-level is-' + _glv.lv);
  lvl.innerHTML = icon(_glv.lv === 'play' ? 'sprout' : _glv.lv === 'help' ? 'droplet' : 'eye', 'i-sm');
  lvl.appendChild(_gsvEl('span', null, `${first} lets you ${_glv.lv === 'play' ? 'play' : _glv.lv === 'help' ? 'help' : 'look'}`));
  lvl.title = _glv.lv === 'play' ? 'You can plant, place, water and pick what is yours. You spend your own coins and seeds.' : _glv.lv === 'help' ? 'You can water, tidy and pick what you planted.' : 'You can walk around and wave.';
  if (_glv.road) { const d = _gsvEl('i', 'gll-road is-' + _glv.road); d.title = _glv.road === 'direct' ? 'A direct link between your computers' : 'Through the relay, sealed'; lvl.appendChild(d); }
  hud.appendChild(lvl);
  const tools = _gsvEl('div', 'gll-tools');
  const tb = (id, ic, tip, fn, on) => { const b = _gsvBtn('', { icon: ic, cls: 'gll-tool' + (on ? ' is-on' : ''), kind: 'btn-ghost', tip, aria: tip, run: fn }); b.dataset.gl = id; tools.appendChild(b); return b; };
  tb('hand', 'hand', 'Walk and do the obvious thing', () => { _glv.tool = 'hand'; _glvHud(); }, _glv.tool === 'hand');
  if (!glMayDo(_glv.lv, 'water')) tb('water', 'droplet', 'Water', () => { _glv.tool = 'water'; _glvHud(); }, _glv.tool === 'water');
  if (!glMayDo(_glv.lv, 'plant')) tb('bag', 'package', 'Your bag and the shop: your own seeds and coins', (e, b) => _glvBag(b), _glv.tool.includes(':'));
  tb('wave', 'smile', 'A move', (e, b) => _glvEmotes(b));
  tb('say', 'message-circle', 'Say something', (e, b) => _glvPhrases(b));
  hud.appendChild(tools);
  const people = _gsvEl('div', 'gll-people');
  for (const A of _gll.actors.values()) { if (A.me) continue; const p = _gsvEl('span', 'gll-person' + (A.w === 0 ? ' is-host' : ''), A.n.slice(0, 1).toUpperCase()); p.title = A.n; people.appendChild(p); }
  hud.appendChild(people);
  if (_glv.tool.includes(':')) {
    const [k, id] = _glv.tool.split(':'), def = k === 'seed' ? gardenPlant(id) : gardenDecor(id);
    const hand = _gsvEl('div', 'gll-chip gll-hand');
    hand.appendChild(_gsvEl('span', null, `${def ? def.name : ''} ×${gardenHas(_glv.tool)}`));
    hand.appendChild(_gsvBtn('', { icon: 'x', kind: 'btn-ghost', aria: 'Put it away', run: () => { _glv.tool = 'hand'; _glvGhost(null); _glvHud(); } }));
    hud.appendChild(hand);
  }
}
function _glvKnockAgain() {
  _glv.state = 'knocking'; _glv.why = ''; _glvHud();
  _gllApi('/api/garden-live/here', { role: 'visit', on: 'again', f: _glv.fid, look: _glvLook() }).then(_glvTake).catch(() => {});
}
function _glvBag(anchor) {
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts', 'gll-bag');
    const w = typeof gardenReady === 'function' && gardenReady() && gardenEnsure() ? gardenWallet() : null;
    const head = _gsvEl('div', 'gll-bag-h'); head.appendChild(_gsvEl('b', null, 'Your bag')); if (w) { const c = _gsvEl('span', 'gll-coins'); c.innerHTML = icon('coins', 'i-sm'); c.appendChild(_gsvEl('span', null, String(w.coins))); head.appendChild(c); } el.appendChild(head);
    const list = _gsvEl('div', 'gsv-gift-list');
    const row = (item, name, n, kind, id) => { const b = _gsvEl('button', 'gsv-gift'); b.type = 'button'; const ic = _gsvEl('span', 'gsv-gift-ic'); ic.innerHTML = gardenIconSvg(id, { kind: kind === 'seed' ? 'seed' : 'decor', px: 30 }); b.appendChild(ic); const t = _gsvEl('span', 'gsv-gift-t'); t.appendChild(_gsvEl('b', null, name)); b.appendChild(t); b.appendChild(_gsvEl('span', 'gsv-gift-n', '×' + n)); b.onclick = () => { close(); _glv.tool = item; _glvHud(); }; list.appendChild(b); };
    let any = false;
    if (w) for (const [k, n] of Object.entries(w.items)) { if (!(n > 0)) continue; const i = k.indexOf(':'), kind = k.slice(0, i), id = k.slice(i + 1); if (kind === 'seed' && gardenPlant(id)) { row(k, gardenPlant(id).name, Math.floor(n), 'seed', id); any = true; } else if (kind === 'decor' && gardenDecor(id)) { row(k, gardenDecor(id).name, Math.floor(n), 'decor', id); any = true; } }
    if (!any) list.appendChild(_gsvEl('p', 'muted gsv-small', 'Nothing in your bag yet.'));
    el.appendChild(list);
    // the shop, with your own coins (this changes nothing of theirs)
    if (w) {
      el.appendChild(_gsvEl('div', 'pop-label', 'Buy with your own coins'));
      const shop = _gsvEl('div', 'gsv-gift-list');
      const m = gardenModel();
      const buy = (item, name, kind, id) => { const pr = gardenPriceOf(item, m); if (pr.price == null || pr.why) return; const b = _gsvEl('button', 'gsv-gift'); b.type = 'button'; const ic = _gsvEl('span', 'gsv-gift-ic'); ic.innerHTML = gardenIconSvg(id, { kind: kind === 'seed' ? 'seed' : 'decor', px: 30 }); b.appendChild(ic); const t = _gsvEl('span', 'gsv-gift-t'); t.appendChild(_gsvEl('b', null, name)); b.appendChild(t); b.appendChild(_gsvEl('span', 'gsv-gift-n', String(pr.price))); b.onclick = () => { const r = gardenBuy(item, 1); if (r && r.ok) { close(); _glv.tool = item; _glvHud(); if (typeof gameCheer === 'function') gameCheer(anchor, { text: '-' + pr.price, tone: 'coin' }); } else gameDeny(b, { kind: 'coins', say: r ? r.msg : '' }); }; shop.appendChild(b); };
      for (const p of GARDEN_PLANTS.slice(0, 200)) { if (shop.children.length >= 16) break; if (p.price > 0 && p.price <= w.coins * 2 && p.special !== 'heart') buy('seed:' + p.id, p.name, 'seed', p.id); }
      for (const d of GARDEN_DECOR.slice(0, 120)) { if (shop.children.length >= 24) break; if (d.price > 0 && d.price <= w.coins * 2) buy('decor:' + d.id, d.name, 'decor', d.id); }
      el.appendChild(shop);
    }
  }, { align: 'center', width: 320 });
}
function _glvEmotes(anchor) {
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu');
    const grid = _gsvEl('div', 'gll-menu-row');
    for (const id of GL_EMOTES) {
      if (typeof gartEmoteOwned === 'function' && !gartEmoteOwned(id)) continue;
      const row = typeof GART_EMOTES !== 'undefined' ? GART_EMOTES[id] : null; if (!row) continue;
      grid.appendChild(_gsvBtn(row.name, { icon: row.icon, kind: 'btn-ghost', run: () => { close(); const me = _glvMe(); if (me) _gllEmote(me, id); _glvSend('em', { c: 'em', e: id }); } }));
    }
    el.appendChild(grid);
  }, { align: 'center' });
}
function _glvPhrases(anchor) {
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu');
    const grid = _gsvEl('div', 'gll-menu-col');
    for (const p of GL_PHRASES) grid.appendChild(_gsvBtn(p.t, { kind: 'btn-ghost', run: () => { close(); const me = _glvMe(); if (me) _gllSay(me, p.id); _glvSend('em', { c: 'say', e: p.id }); } }));
    el.appendChild(grid);
  }, { align: 'center' });
}
/* ---------- what the server hears ---------- */
function _glvEvent(ev) {
  switch (ev.k) {
    case 'state': _glvTake(ev); return;
    case 'budget': _glv.mode = ev.mode || 'normal'; return;
    case 'who': {
      if (ev.w === _glv.w) { _glv.selfName = ev.n; return; }
      if (!ev.on) { const A = _gll.actors.get(ev.w); if (A) { if (A.root) A.root.remove(); if (A.petNode) A.petNode.remove(); _gll.actors.delete(ev.w); if (_glv.follow === ev.w) _glv.follow = null; } _glvHud(); return; }
      const A = _gll.actors.get(ev.w);
      if (A) { A.n = ev.n; A.a = ev.a || A.a; A.pet = ev.pet || A.pet; A.lv = ev.lv; A.key = ''; if (A.root) _gllDress(A, A.root); }
      else _gll.actors.set(ev.w, _gllActor(ev));
      _glvLoopStart(); _glvHud();
      return;
    }
    case 'go': {
      const A = _gll.actors.get(ev.w); if (!A) return;
      // the host says which way round the beds. You are already walking: only if you are still going there
      if (A.me) { if (ev.r && ev.r.length && A.tx != null && Math.abs(A.gx - ev.x) < 0.11 && Math.abs(A.gy - ev.y) < 0.11) _gllWalkVia(A, ev.r, ev.x, ev.y); return; }
      _gllWalkVia(A, ev.r, ev.x, ev.y); _glvLoopStart(); if (_glv.follow === ev.w) _glvWalk(ev.x - 0.8, ev.y + 0.3);
      return;
    }
    case 'em': {
      const A = _gll.actors.get(ev.w); if (!A) return;
      if (ev.c === 'em') { if (Number.isFinite(ev.x)) { A.x = ev.x; A.y = ev.y; A.tx = null; } _gllEmote(A, ev.e); }
      else if (ev.c === 'say') _gllSay(A, ev.e);
      else if (ev.c === 'do' && ev.e === 'high5') { _gllEmote(A, 'clap'); if (ev.to === _glv.w) { const me = _glvMe(); if (me) _gllEmote(me, 'clap'); } _gllFloat(_glv.svg, A.x + 0.35, A.y - 1.4, '✋', ''); }
      else if (ev.c === 'do' && ev.e === 'follow' && ev.to === _glv.w) _gllFloat(_glv.svg, A.x, A.y - 1.4, '🚶', A.n);
      _glvLoopStart();
      return;
    }
    case 'res': _glvResult(Object.assign({}, ev, { k: ev.ik })); _glvLoopStart(); return;
    case 'snap': {
      const first = !_glv.snap;
      _glv.snap = ev.snap;
      _gll.by.clear();
      if (ev.by) for (const [kind, x, y, n] of ev.by.r) _gll.by.set(kind + '|' + x + '|' + y, ev.by.n[n]);
      if (first && !_glv.svg && typeof _gsvPaint === 'function') { _gsvPaint(); return; }   // no saved copy to look at: this is the first the page has seen of it
      _glvRedraw();
      return;
    }
    case 'd': _glvDelta(ev.ops); return;
    default:
  }
}
/* ---------- the garden changed ---------- */
function _glvDelta(ops) {
  const s = _glv.snap; if (!s || !Array.isArray(ops)) return;
  for (const o of ops) {
    const key = (o.o.endsWith('p') ? 'p|' : 'd|') + o.x + '|' + o.y;
    if (o.o === '+p') { s.plants = s.plants.filter(r => !(r[1] === o.x && r[2] === o.y)); s.plants.push([o.id, o.x, o.y, o.s || 0, o.v || 0, o.f || 0]); if (o.by) _gll.by.set(key, o.by); else _gll.by.delete(key); }
    else if (o.o === '-p') { s.plants = s.plants.filter(r => !(r[1] === o.x && r[2] === o.y)); _gll.by.delete(key); }
    else if (o.o === '~p') { const r = s.plants.find(q => q[1] === o.x && q[2] === o.y); if (r) { r[3] = o.s ?? r[3]; r[5] = o.f ?? r[5]; } }
    else if (o.o === '+d') { s.decor = s.decor.filter(r => !(r[1] === o.x && r[2] === o.y)); s.decor.push([o.id, o.x, o.y, o.r || 0, o.v || 0]); if (o.by) _gll.by.set(key, o.by); else _gll.by.delete(key); }
    else if (o.o === '-d') { s.decor = s.decor.filter(r => !(r[1] === o.x && r[2] === o.y)); _gll.by.delete(key); }
    else if (o.o === '~d') { const r = s.decor.find(q => q[1] === o.x && q[2] === o.y); if (r) { r[3] = o.r ?? r[3]; r[4] = o.v ?? r[4]; } }
  }
  _glvRedraw();
}
function _glvRedraw() {
  const svg = _glv.svg, s = _glv.snap; if (!svg || !s || !svg.isConnected) return;
  const clean = gardenSnapshotClean(s); if (!clean) return;
  const still = !gardenMotionOn();
  const sc = _gdrSceneFromSnapshot(clean, { still });
  const f = _glvFriend();
  const parts = gardenSceneParts(sc, { size: 'm', crop: _gsv.crop || 'all', still, uid: 'glv', label: '', fit: undefined, readOnly: true, friend: f || null });
  const objects = svg.querySelector('.gd-objects');
  if (objects) _gdrPatchItems(objects, parts.items);
  const was = svg.querySelector('.gd-paths'), layer = parts.layers.find(l => l[0] === 'paths');
  if (was && layer) { const nu = _gdrParse(layer[1])[0]; if (nu) was.replaceWith(nu); }
  // new plants can be reached from the keyboard too
  for (const g of svg.querySelectorAll('.gd-it.gd-plant:not([tabindex])')) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); }
  _glvLoopStart();
}
