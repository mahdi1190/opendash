/* ============================================================
   HIDDEN ROOMS, the water and the net (the owner: "if we are fishing then the fish should spawn like it does as a shadow and we fish normally"). There is no second fishing game: this file only tells the real one where it is.
   A room's water has cells of its own past the edge of the map, from GARDEN_ROOM_X on. To the game they are water like any other:
     a fish there is one more row in the one list (_gfs.list), run by whoever runs the water, so friends see the same shadows and a fish goes to one line
     a cast is the usual `fish cast` with those cells; the bite, the reel, the catch moment, the book and the market are the usual ones
   While you are in a room, _gwActors, _gwFeet, _gwPx and _gdgBox answer for the room. Drawn in one layer scaled by GRW.k, so the rod, the float and the moment fit the figure.

     R.water  {room, kinds, cx, cy, e: [[x, y, rx, ry], ...]}  the shape in room units (ellipses), cy its first row; needs.room on a fish keeps it to this water
     R.net    the kinds in a room, as real bugs (gardenNetOdds, gardenCatchBug, the usual moment)
   SAVES: nothing new. FRIENDS: nothing new: `hall` says who is in which room, `fish` and `fs` carry the rest.
   ============================================================ */
const GRW = Object.freeze({ k: EE.fig / GW_SCALE, cw: 48 * EE.fig / GW_SCALE, ch: 30 * EE.fig / GW_SCALE, rows: 8, gap: 0.3 });
const _grwa = { w: null, map: new Map() };

/* ---------- the shape ---------- */
function _grwOf(R) {
  if (!R || !R.water) return null;
  let w = _grwa.map.get(R.id);
  if (!w) {
    const W = R.water, x0 = Math.min(...W.e.map(e => e[0] - e[2])), y0 = Math.min(...W.e.map(e => e[1] - e[3])), x1 = Math.max(...W.e.map(e => e[0] + e[2])), y1 = Math.max(...W.e.map(e => e[1] + e[3]));
    w = Object.assign({}, W, { R, x0, y0, x1, y1, cx: W.cx == null ? GARDEN_ROOM_X : W.cx });
    _grwa.map.set(R.id, w);
  }
  return w;
}
function _grwAll() { return GRM_ROOMS.map(_grwOf).filter(Boolean); }
function _grwByCell(x, y) { for (const w of _grwAll()) if (y >= w.cy && y < w.cy + GRW.rows) return w; return null; }
function _grwIn(w, x, y, pad) { const p = pad || 0; return w.e.some(([cx, cy, rx, ry]) => { const a = (x - cx) / (rx + p), b = (y - cy) / (ry + p * 0.6); return a * a + b * b <= 1; }); }
function _grwCell(w, x, y) { return { x: w.cx + (x - w.x0) / GRW.cw, y: w.cy + (y - w.y0) / GRW.ch }; }
function _grwRoomPt(w, vx, vy) { return { x: w.x0 + (vx - w.cx) * GRW.cw, y: w.y0 + (vy - w.cy) * GRW.ch }; }
/** _gwPx for a room's cells: the game's layer is scaled, so its units are the outdoor ones. */
function gardenRoomPx(x, y) { const w = _grwByCell(x, y); if (!w) return [-999, -999]; const p = _grwRoomPt(w, x, y); return [p.x / GRW.k, p.y / GRW.k]; }
function gardenRoomMeCell() { const M = _grm.me, w = _grwa.w; return M && w ? _grwCell(w, M.x, M.y) : { x: GARDEN_ROOM_X, y: 0 }; }

/* ---------- the one list: a band for each water with somebody at it ---------- */
function _grwPeopleIn(R) {
  if (_grm.on && _grm.R === R) return true;
  if (typeof _gll !== 'undefined' && _gll.role === 'host') for (const A of _gll.actors.values()) if (A.rm === R.id) return true;
  return false;
}
function gardenRoomBands() {
  const out = [];
  for (const w of _grwAll()) if (_grwPeopleIn(w.R)) { const a = _grwCell(w, w.x0, w.y0), b = _grwCell(w, w.x1, w.y1); out.push({ key: 'R:' + w.R.id, room: w.room, kinds: w.kinds, zone: 'pond', x0: a.x, x1: b.x, y0: a.y, y1: b.y, n: 1, w }); }
  return out;
}
/** Somewhere in this water. */
function gardenRoomSpot(b, near) {
  const w = b.w;
  for (let i = 0; i < 24; i++) {
    const base = near ? _grwRoomPt(w, near.x, near.y) : null;
    const x = base ? base.x + (Math.random() - 0.5) * 300 : w.x0 + Math.random() * (w.x1 - w.x0), y = base ? base.y + (Math.random() - 0.5) * 80 : w.y0 + Math.random() * (w.y1 - w.y0);
    if (_grwIn(w, x, y, -22)) return _grwCell(w, x, y);
  }
  const e = w.e[0]; return _grwCell(w, e[0], e[1]);
}
/** Coming in: a fish straight away, not in a minute's time. */
function _grwStock(R) { if (_grwOf(R) && typeof _gfs !== 'undefined' && !_gfs.band.has('R:' + R.id)) _gfs.band.set('R:' + R.id, 0.2); }

/* ---------- the shadows: as _gfsFrame, but in the room's layer and every frame ---------- */
function _grwFishFrame(dt) {
  const w = _grwa.w, layer = _grm.school; if (!w || !layer) return;
  const k = Math.min(1, dt * 4), t = _grm.t, moving = gardenMotionOn();
  for (const f of _gfs.list.values()) {
    if (f.x < GARDEN_ROOM_X) continue;
    if (f.y < w.cy || f.y >= w.cy + GRW.rows) { if (f.node) { f.node.remove(); f.node = null; } continue; }
    if (!f.node) { f.node = _gwEl('g', { class: 'gd-fs is-seen', opacity: '0' }); f.node.innerHTML = _gfsArt(f.def, f.cm, f.v) + (f.z && typeof gardenFishMark === 'function' ? gardenFishMark(f) : ''); f.a = 0; f.sx = f.x; f.sy = f.y; layer.appendChild(f.node); }
    const dx = f.x - f.sx; if (Math.abs(dx) > 0.015) f.face = dx > 0 ? 1 : -1;
    f.sx += dx * k; f.sy += (f.y - f.sy) * k;
    if (f.a < 1) { f.a = Math.min(1, f.a + dt * 0.8); f.node.setAttribute('opacity', f.a.toFixed(2)); }
    if (f.st === GF_ST.nibble && f.n !== f.dn) _gfsRing(f.x, f.y, 0.6);
    f.dn = f.n;
    if (f.st !== f.dst) { if (f.st === GF_ST.bite) { _gfsRing(f.x, f.y, 1.3); _gfsRing(f.x, f.y, 0.8); } else if (f.st === GF_ST.bolt) _gfsRing(f.sx, f.sy, 1.1); f.dst = f.st; }
    const [px, py] = _gwPx(f.sx, f.sy);
    const fast = f.st === GF_ST.hooked ? 16 : f.st === GF_ST.bolt ? 12 : 3 + 2 * Math.min(1, 40 / Math.max(10, f.cm));
    const wob = moving ? Math.sin(t * fast + f.seed) * (f.st === GF_ST.hooked ? 11 : 4 * gardenFishWobble(f.def)) : 0;
    f.node.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${wob.toFixed(1)}) scale(${f.face} 1)`);
  }
}
/** Out of the room: its layer goes with it, so the shadows are made again next time. */
function _grwFishForget() { for (const f of _gfs.list.values()) if (f.x >= GARDEN_ROOM_X && f.node) { f.node.remove(); f.node = null; } }

/* ---------- a cast: click the water, or Space and E beside it ---------- */
function _grwSnap(w, c) {
  const try1 = (x, y) => { const p = _grwRoomPt(w, x, y); return x >= w.cx && y >= w.cy && _grwIn(w, p.x, p.y, -8) ? { x, y } : null; };
  const x0 = Math.floor(c.x) + 0.5, y0 = Math.floor(c.y) + 0.5;
  let best = try1(x0, y0), bd = best ? 0 : 1e9;
  if (!best) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = try1(x0 + dx, y0 + dy), d = Math.hypot(dx, dy); if (q && d < bd) { bd = d; best = q; } }
  return best;
}
/** Cast there, walking up to the bank first if the rod does not reach. */
function _grwCastAt(x, y) {
  const w = _grwa.w, M = _grm.me; if (!w || !M) return;
  if (gardenFun() === 'off') { _grmSay('Fishing is switched off in Settings.'); return; }
  const t = _grwSnap(w, _grwCell(w, x, y)); if (!t) return;
  const reach = gardenRod().st.range - 0.15, tp = _grwRoomPt(w, t.x, t.y), me = _grwCell(w, M.x, M.y), d = Math.hypot(me.x - t.x, me.y - t.y);
  const go = () => { M.tx = M.ty = null; M.go = null; _gwFishCast(t); M.face = _gw.face; };
  if (d <= reach) { go(); return; }
  // the nearest place on the bank from which it reaches
  let best = null, bd = 1e9;
  for (let a = 0; a < 6.283; a += 0.2) for (const r of [reach, reach * 0.8, reach * 0.6]) {
    const px = tp.x + Math.cos(a) * r * GRW.cw, py = tp.y + Math.sin(a) * r * GRW.ch, c = _grmClamp(px, py);
    if (Math.abs(c.x - px) > 1 || Math.abs(c.y - py) > 1) continue;
    const dd = Math.hypot(c.x - M.x, c.y - M.y); if (dd < bd) { bd = dd; best = c; }
  }
  if (!best) { _grmSay(`Out of reach for the ${gardenRod().name.toLowerCase()}. Try from nearer the water.`); return; }
  _grmWalk(best.x, best.y, go);
}
function _grwFront() {
  const w = _grwa.w, M = _grm.me; let best = null, bd = 1e9;
  for (const [cx, cy, rx, ry] of w.e) { const n = Math.hypot((M.x - cx) / rx, (M.y - cy) / ry) || 1, x = cx + (M.x - cx) / n * 0.55, y = cy + (M.y - cy) / n * 0.55, d = Math.hypot(x - M.x, y - M.y); if (d < bd) { bd = d; best = { x, y }; } }
  if (best) _grwCastAt(best.x, best.y);
}

/* ---------- people in a room: their figure, their rod, their moment ---------- */
/** What a figure is doing now. */
function _grmPose(M) {
  const A = M.me ? null : _gll.actors.get(M.w), now = Date.now();   // clock-ok: how long a pose lasts
  let pose = M.moving && gardenMotionOn() ? 'walk' : 'idle', rod = false;
  if (M.me ? _gwFishBusy() : !!(A && A.fish)) { pose = 'fish'; rod = true; }
  if (M.me) { if (_GPL.pose && now < _GPL.until && !M.moving) pose = _GPL.pose; }
  else if (M.pose && now < M.until) pose = M.pose;
  return { pose, rod, gear: M.me ? _gplMyGear() : (A && A.g) || null, dir: GPL_POSE_FRONT.has(pose) ? 's' : rod ? 'e' : M.dir };
}
function _grmPaintFig(M, t) {
  const P = _grmPose(M), motion = gardenMotionOn(), key = P.pose + P.dir + (motion ? 'm' : '') + JSON.stringify(P.gear);
  if (M.key !== key) { M.key = key; let s = ''; try { s = gartPlayerSvg(M.a, { dir: P.dir, pose: P.pose, motion, stageRod: P.rod, gear: P.gear }); } catch (e) { s = ''; } M.in.innerHTML = s || _eeFigure(M.a, P.dir, M.moving); }
  const bob = !motion ? 0 : M.moving ? -Math.abs(Math.sin(t * 11)) * 2 : 0;
  M.g.setAttribute('transform', `translate(${M.x.toFixed(1)} ${M.y.toFixed(1)})`);
  if (P.rod && M.me) M.face = _gw.face;
  M.bob.setAttribute('transform', `translate(0 ${bob.toFixed(2)}) scale(${P.dir === 'e' && M.face < 0 ? -EE.fig : EE.fig} ${EE.fig})`);
  const tag = M.g.querySelector('.ee-pname'); if (tag) tag.style.display = _grm.on && M.heldG ? 'none' : '';
}
/** Is that person's line in the room you are in? null: it is out in the garden. false: in a room, not yours. Else where to draw it from. */
function gardenRoomFxAt(A, F) {
  if (!F || F.bx < GARDEN_ROOM_X) return null;
  if (!_grm.on || !_grm.game) return false;
  const w = _grwa.w, Q = _grm.m.get(A.w);
  if (!w || !Q || F.by < w.cy || F.by >= w.cy + GRW.rows) return false;
  if (!Q.fxr || !Q.fxr.isConnected) { Q.fxr = _gwEl('g', { class: 'grm-fxr' }); _grm.game.appendChild(Q.fxr); }
  Q.fxr.setAttribute('transform', `translate(${(Q.x / GRW.k).toFixed(1)} ${(Q.y / GRW.k).toFixed(1)})`);
  const c = _grwCell(w, Q.x, Q.y), face = F.bx >= c.x ? 1 : -1;
  A.face = face; Q.face = face;
  return { root: Q.fxr, x: c.x, y: c.y };
}
/** They are inside somewhere and caught something. True: dealt with here. */
function gardenRoomGot(A, spec, who) {
  if (!A.rm) return false;
  A.fish = null; _gllFxClear(A);
  const Q = _grm.on && _grm.R && _grm.R.id === A.rm ? _grm.m.get(A.w) : null;
  if (!Q || gardenFun() === 'off') { _gllFeed(`${who} ${spec.verb} ${_gscA(spec.name)}`); return true; }
  const ms = gardenMomentMs(spec), g = _gwEl('g', { class: 'gll-held', transform: `scale(${EE.fig})` });
  g.innerHTML = gardenMomentSvg(spec, { who });
  Q.pose = 'hold'; Q.until = Date.now() + ms; Q.dir = 's'; Q.g.appendChild(g); Q.heldG = g;   // clock-ok: how long a pose lasts
  setTimeout(() => { g.remove(); if (Q.heldG === g) Q.heldG = null; }, ms);
  if (typeof _fxSound === 'function') _fxSound('sparkle');
  return true;
}
function gardenRoomSwing(A) {
  if (!A.rm) return false;
  const Q = _grm.on && _grm.R && _grm.R.id === A.rm ? _grm.m.get(A.w) : null;
  if (Q && gardenMotionOn()) {
    const g = _gwEl('g', { transform: `translate(0 -52) scale(${(Q.face < 0 ? -1 : 1) * EE.fig} ${EE.fig})` });
    g.innerHTML = '<path d="M6 8Q30 -16 30 -34" stroke="#fbfbf2" stroke-width="2.6" stroke-opacity="0.8" fill="none" stroke-linecap="round"/>' + (A.g && A.g.nk && typeof gardenLookNetSwing === 'function' ? gardenLookNetSwing(A.g.nk) : '');
    Q.g.appendChild(g); setTimeout(() => g.remove(), 360);
    Q.pose = 'pick'; Q.until = Date.now() + 500;   // clock-ok: how long a pose lasts
  }
  return true;
}

/* ---------- bugs in a room: they sit, they hop, they bolt if you run at them. You creep up and swing, as outside ---------- */
const GRB = Object.freeze({ sneak: 74, reach: GRW.cw, scale: 0.8 });
function _grbMake(R, S) {
  const layer = _grm.props, out = _grmNetToday(R).filter(q => !q.gone);
  void S; void layer;
  return out.map(q => {
    const def = gardenBugDef(q.id);
    return { key: q.key, id: q.id, v: q.v, hab: 'flower', def, x: q.x, y: q.y, ax: q.x, ay: q.y, tx: q.x, ty: q.y, state: 'rest', timer: 1 + Math.random() * 3, lift: def.rest === 'crawl' ? 0 : 8, face: 1, seed: Math.random() * 9, node: null };
  });
}
function _grbNode(b) {
  const k = GRB.scale * b.def.size, g = _gwEl('g', { class: 'gd-bug is-seen' + (b.def.glow ? ' is-glow' : '') });
  g.innerHTML = `<ellipse cx="0" cy="1" rx="${(9 * k).toFixed(1)}" ry="${(3 * k).toFixed(1)}" fill="#000" fill-opacity=".22"/><g class="grb-lift"><g class="grb-in" transform="scale(${k.toFixed(2)})">${gardenBugArt(b.id, { uid: 'rb' + (gardenHash(b.key) % 9999).toString(36), v: b.v })}</g></g>`;
  b.node = g; b.liftEl = g.querySelector('.grb-lift'); b.inEl = g.querySelector('.grb-in');
  return g;
}
function _grbPick(b, far) {
  const F = _grm.R.floor || GRM.floor;
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * 6.283, r = far ? 160 + Math.random() * 180 : 24 + Math.random() * 70, x = (far ? b.x : b.ax) + Math.cos(a) * r, y = (far ? b.y : b.ay) + Math.sin(a) * r * 0.6;
    if (x > F.x0 + 70 && x < F.x1 && y > 180 && y < F.y1) return { x, y };
  }
  return { x: b.ax, y: b.ay };
}
function _grbFrame(dt) {
  const S = _grm.S, M = _grm.me; if (!S || !S.bugs) return;
  const motion = gardenMotionOn(), sneak = _grm.keys.has('shift') || !!M.net;
  for (const b of S.bugs) {
    if (!b.node) { _grm.bugL.appendChild(_grbNode(b)); }
    const F = _grm.R.floor || GRM.floor; if (b.state === 'flee' && (b.tx < 0 || b.tx > 960 || b.ty > F.y1 + 40 || b.ty < 0 || b.needPick)) { const q = _grbPick(b, true); b.tx = q.x; b.ty = q.y; }   // (a miss sent it off in world cells)
    if (motion) {
      const d = Math.hypot(b.x - M.x, (b.y - M.y) * 1.2), skit = GRW.cw * (0.9 + 0.38 * b.def.skit), r = M.moving && !sneak ? skit : sneak && M.moving ? skit * 0.42 : skit * 0.28;
      if (b.state !== 'flee' && d < r && Math.random() < dt * (M.moving && !sneak ? 9 : 1.1 * b.def.skit / 3)) { b.state = 'flee'; b.fleeT = 1.6 + Math.random(); const q = _grbPick(b, true); b.tx = q.x; b.ty = q.y; }
      b.timer -= dt;
      const crawl = b.def.rest === 'crawl';
      if (b.state === 'rest') { if (b.timer <= 0 && !(M.net === b)) { const q = _grbPick(b, false); b.tx = q.x; b.ty = q.y; b.state = 'fly'; b.timer = 3; } b.lift += ((crawl ? 0 : 8 + (b.def.rest === 'hover' ? 10 : 0)) - b.lift) * Math.min(1, dt * 5); }
      else {
        const sp = b.state === 'flee' ? 260 : crawl ? 26 : 90, dx = b.tx - b.x, dy = b.ty - b.y, dist = Math.hypot(dx, dy);
        if (dist < 6 || b.timer < -6) { b.state = 'rest'; b.timer = crawl ? 1 + Math.random() * 3 : 2.5 + Math.random() * 5; }
        else { b.x += dx / dist * sp * dt; b.y += dy / dist * sp * dt * 0.7; if (Math.abs(dx) > 1) b.face = dx > 0 ? 1 : -1; b.lift += ((crawl ? 0 : 26 + Math.sin(_grm.t * 5 + b.seed) * 5) - b.lift) * Math.min(1, dt * 4); }
        if (b.state === 'flee') { b.fleeT -= dt; if (b.fleeT <= 0) { b.state = 'fly'; b.timer = 3; } }
      }
    }
    b.node.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`);
    b.liftEl.setAttribute('transform', `translate(0 ${(-b.lift).toFixed(1)})`);
    b.inEl.setAttribute('transform', `scale(${(b.face * GRB.scale * b.def.size).toFixed(2)} ${(GRB.scale * b.def.size).toFixed(2)})`);
  }
  // creeping up on one
  if (M.net) {
    const b = M.net; if (!S.bugs.includes(b)) { M.net = null; return; }
    if (M.swing > 0) { M.swing -= dt; if (M.swing <= 0) { M.net = null; _grbResolve(b); } return; }
    const d = Math.hypot(b.x - M.x, (b.y - M.y) * 1.3);
    if (d <= gardenNet().st.reach * GRB.reach) { M.tx = M.ty = null; M.swing = gardenNet().st.swing; M.face = b.x >= M.x ? 1 : -1; _gw.face = M.face; _gwNetAir(); return; }
    if (M.keyed) { M.net = null; return; }
    const p = _grmClamp(b.x + (M.x < b.x ? -30 : 30), Math.max((_grm.R.floor || GRM.floor).y0 + 4, b.y + 14)); M.tx = p.x; M.ty = p.y;
    M.netT = (M.netT || 0) + dt; if (M.netT > 9) { M.net = null; _grmSay('It got away from you.'); }
  }
}
function _grbChase(b) { const M = _grm.me; M.net = b; M.netT = 0; M.swing = 0; M.go = null; gardenLiveFx('bug', 'sneak'); }
/** Space, E: swing at whatever is in reach, or say nothing is. */
function _grbSwingNear() {
  const S = _grm.S, M = _grm.me, reach = gardenNet().st.reach * GRB.reach * 1.35; let best = null, bd = reach;
  for (const b of S.bugs || []) { const d = Math.hypot(b.x - M.x, (b.y - M.y) * 1.3); if (d < bd) { bd = d; best = b; } }
  if (!best) { _grmSay('No bug in reach. Click one, and you will creep up on it.'); _gwNetAir(); return; }
  M.net = best; M.netT = 0; M.swing = gardenNet().st.swing; M.face = best.x >= M.x ? 1 : -1; _gw.face = M.face; _gwNetAir();
}
function _grbResolve(b) {
  const M = _grm.me, d = Math.hypot(b.x - M.x, (b.y - M.y) * 1.3) / GRW.cw;
  const ok = !(_gw.goneKeys && _gw.goneKeys.has(b.key)) && Math.random() < gardenNetOdds(b, d, _grm.keys.has('shift') || true);
  if (!ok) { gardenLiveFx('bug', 'miss'); b.state = 'flee'; b.fleeT = 2; b.needPick = true; _grmSay('It got away!', 2200); return; }
  const claim = gardenLiveBugClaim(b);
  if (claim === 'wait') return;
  if (claim === 'lost') { b.state = 'flee'; b.fleeT = 2; b.needPick = true; _grmSay('Somebody else netted that one.'); return; }
  _grbTake(b);
}
function _grbTake(b) {
  const S = _grm.S, R = _grm.R; if (!S || !S.bugs) { _gwBugTaken(b); return; }
  S.bugs = S.bugs.filter(x => x !== b);
  _gwBugTaken(b);   // the bag, the book, the moment, the card, friends told
  if (!S.won && !gpVisiting()) { S.won = true; _grmPay(R, R.gotLine || 'That is a good one.'); }
  if (!S.bugs.length) setTimeout(() => { if (_grm.R === R) _grmSay(R.goneLine, 7000); }, 6000);
}
/** Somebody here netted it. True: it was one of a room's. */
function gardenRoomBugGone(key) {
  if (!String(key).startsWith('rm')) return false;
  const S = _grm.S, b = S && S.bugs && S.bugs.find(x => x.key === key);
  if (b) { S.bugs = S.bugs.filter(x => x !== b); if (b.node) b.node.remove(); if (_grm.me && _grm.me.net === b) _grm.me.net = null; }
  return true;
}
