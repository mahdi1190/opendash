/* ============================================================
   HEIGHT AND SWIMMING (20 Nov 2026). The owner: "when we climb things we need a concept of height, so we have areas and different
   levels, so we can climb the lighthouse and walk around the top of the lighthouse", "no animations for climbing a ladder", and
   "going for a swim, we should be able to control it".

   LEVELS. A thing of a kind with `levels` (GARDEN_KINDS, 94-garden-zz-7act-0kinds.js) has upper floors: a lighthouse its gallery, a
   treehouse its deck, a barn its hay-loft door. Nothing here names a place: every thing found of that kind, on any layout, has them,
   placed on the thing AS ITS PAINTER DREW IT (gardenAffordDrawnBase), sized in H (the player's height, GARDEN_H).
     A floor:  its middle on the ground (at), how high it is (h), where the feet may go (shape, minus), what you go behind (core).
     A way:    a ladder from a foot on the ground to a top on the floor. Its prompt is at its foot ("Climb up ...") and at its top
               ("Climb down"). You climb hand over hand, rung by rung, the figure rising up the ladder; at the top you step off on to
               the floor. On the floor the feet are held to its shape (nothing on the ground below stops them, the floor's edge does),
               the figure is drawn that high with its shadow on the boards, and in front of the thing, or under it when you walk round
               behind its core (the lamp room).
   SWIMMING. "Go for a swim" at deep water: you wade in, and then the arrow keys (or a click) swim you about, a stroke at a time,
   floating when you stop. Only water holds you; swim at the bank and you climb out on to it.
   FRIENDS. One gl:em when each starts (act-climbup at the ladder's foot, act-climbdown at its top, act-swim, act-swimout): their copy of
   you climbs the same ladder (found from the same layout), is drawn that high while you walk the floor, swims where you swim.
     gardenLevels()            every floor found: [{ key, id (thing), name, cx, cy (ground px of its middle), h (px), ...}]
     gardenHeightLevel()       the floor you are on, or null; gardenHeightLift() how high you are drawn (px)
     gardenHeightSwimming()    in the water under your own control
   ============================================================ */
const _ght = { lv: null, climb: null, swim: null, list: null, listT: 0, listKey: '', seen: '', hintSwim: false };
const GHT_CLIMB = Object.freeze({ rung: 9.4 * 0.592, perRung: 210, step: 420, min: 1300 });   // a rung's spacing (px), ms a rung, ms to step off
function _ghtH() { return typeof GARDEN_H === 'number' ? GARDEN_H : 41.44; }
/** Every upper floor of every thing found standing (drawn here), placed on the thing as drawn. Cached for a second. */
function gardenLevels() {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (_ght.list && now - _ght.listT < 1000) return _ght.list;
  _ght.listT = now;
  const out = []; if (typeof gardenAffordThings !== 'function') return (_ght.list = out);
  const W = GARDEN_WORLD, H = _ghtH();
  let ents = null; try { const w = window.GardenNative && GardenNative.world(); ents = w && w.entities instanceof Map ? w.entities : null; } catch (e) { ents = null; }
  for (const t of gardenAffordThings()) {
    const K = t.kind && GARDEN_KINDS[t.kind]; if (!K || !K.levels || !t.static) continue;
    const rec = ents && ents.get('prop:' + t.id); if (ents && ents.size && !rec) continue;   // not drawn here (not built yet): nothing invisible is climbed
    const B = gardenAffordDrawnBase(t), fx = B.x * W.cellW, fy = W.sky + B.y * W.cellH, depth0 = rec && Number.isFinite(rec.depth) ? rec.depth : fy + 2;
    K.levels.forEach((L, li) => {
      const cx = fx + L.at[0] * H, cy = fy + L.at[1] * H, h = L.h * H;
      // (in front of the thing and of what the world draws on it, its ladder and loft door: up on a floor you are in front of them)
      const depth = Math.max(depth0, ...(L.ways || []).filter(w => w.art).map(w => fy + w.foot[1] * H + 1));
      const lv = { key: t.id + ':' + L.id, id: t.id, kind: t.kind, li, name: L.name || K.name, cx, cy, h, depth, depth0: Math.min(depth0, fy), L, ways: [] };   // (depth0: the thing's own, never below its drawn foot)
      (L.ways || []).forEach((w, wi) => {
        const foot = { x: (fx + w.foot[0] * H) / W.cellW, y: (fy + w.foot[1] * H - W.sky) / W.cellH }, top = { x: (cx + w.top[0] * H) / W.cellW, y: (cy + w.top[1] * H - W.sky) / W.cellH };
        lv.ways.push({ i: wi, by: w.by || 'ladder', name: w.name || 'the ladder', art: w.art || '', loft: !!w.loft, foot, top, lv });
      });
      out.push(lv);
    });
  }
  return (_ght.list = out);
}
/** Is a point (cells, on the floor's own ground plane) where the feet may go on this floor? */
function gardenLevelHas(lv, x, y) {
  if (!lv) return false;
  const W = GARDEN_WORLD, H = _ghtH(), u = (x * W.cellW - lv.cx) / H, v = (W.sky + y * W.cellH - lv.cy) / H, S = lv.L.shape || {};
  const inEll = (cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
  let ok = false;
  if (S.ring) ok = inEll(0, 0, S.ring[0], S.ring[1]) && !inEll(0, 0, S.ring[2], S.ring[3]);
  else if (S.rect) ok = u >= S.rect[0] && u <= S.rect[2] && v >= S.rect[1] && v <= S.rect[3];
  if (!ok) return false;
  for (const m of lv.L.minus || []) { if (m.rect && u >= m.rect[0] && u <= m.rect[2] && v >= m.rect[1] && v <= m.rect[3]) return false; if (m.ell && inEll(m.ell[0], m.ell[1], m.ell[2], m.ell[3])) return false; }
  return true;
}
/** How deep to draw someone standing on a floor at (x, y): under the thing when behind its core, else just in front of it (px). */
function gardenLevelDepth(lv, x, y) {
  const W = GARDEN_WORLD, H = _ghtH(), u = (x * W.cellW - lv.cx) / H, v = (W.sky + y * W.cellH - lv.cy) / H, C = lv.L.core;
  if (C && v < C[1] && Math.abs(u) < C[0]) return (lv.depth0 != null ? lv.depth0 : lv.depth) - 1 + v * 0.01;   // (under the thing itself, not only its ladder)
  return lv.depth + 1.5 + (v + 2) * 0.01;
}
function gardenHeightLevel() { return _ght.lv; }
function gardenHeightSwimming() { return !!(_ght.swim && _ght.swim.on); }
function gardenHeightBusy() { return !!_ght.climb || !!(_ght.swim && !_ght.swim.on); }
/** How high the figure (and its shadow) is drawn: the floor you stand on. (While climbing the figure alone rises: gartActLift.) */
function gardenHeightLift() { return _ght.lv && !_ght.climb ? _ght.lv.h : 0; }
/** How far up the view looks: the floor you are on, or how far up the ladder you are. */
function gardenHeightView() { return gardenHeightLift() + (_ght.climb && _ga.cur && _ga.cur.id === 'climbing' ? _ga.cur.lift || 0 : 0); }
/** The depth to draw you at, or null when the ground decides. */
function gardenHeightDepth() { return _ght.lv && !_ght.climb ? gardenLevelDepth(_ght.lv, _gw.px, _gw.py) : null; }
function _ghtLevelByKey(key) { return gardenLevels().find(l => l.key === key) || null; }
/** The nearest way whose foot (up) or top (down) is by (x, y), within R cells. */
function _ghtWayNear(x, y, up, R) {
  let best = null, bd = R == null ? 1.2 : R;
  for (const lv of gardenLevels()) for (const w of lv.ways) { const p = up ? w.foot : w.top, d = Math.hypot(p.x - x, (p.y - y) * 1.3); if (d < bd) { bd = d; best = w; } }
  return best;
}
/** The prompts the floors offer: at each way's foot when you are on the ground, at its top when you are on its floor. */
function _ghtRows() {
  const out = [];
  for (const lv of gardenLevels()) for (const w of lv.ways) {
    if (_ght.lv) { if (_ght.lv.key !== lv.key) continue; out.push({ key: 'lv:' + lv.key + ':down' + w.i, act: 'climbdown', name: w.name, x: w.top.x, y: w.top.y, promptY: w.top.y - (lv.h / GARDEN_WORLD.cellH) - 1.6, stand: { x: w.top.x, y: w.top.y }, deg: 90, lift: 0, src: lv.id, kind: lv.kind, way: w, noProp: true, onLevel: true }); }
    else out.push({ key: 'lv:' + lv.key + ':up' + w.i, act: 'climbup', name: w.name, x: w.foot.x, y: w.foot.y, top: (w.foot.y - Math.min(lv.h, 140) / GARDEN_WORLD.cellH), stand: { x: w.foot.x, y: w.foot.y }, deg: -90, lift: 0, src: lv.id, kind: lv.kind, way: w, noProp: true, seated: true });
  }
  return out;
}
/* ---------- climbing ---------- */
function _ghtClimbMs(h) { return Math.max(GHT_CLIMB.min, Math.round(h / GHT_CLIMB.rung) * GHT_CLIMB.perRung); }
/** Climb a way: up from its foot (walking there first), or down from its top. */
function gardenClimb(w, up) {
  if (!w || typeof _gw === 'undefined' || !_gw.on || _ght.climb) return false;
  if (typeof gartActStop === 'function') gartActStop();
  if (_ght.swim) return false;
  const go = () => {
    if (_ght.climb) return;
    const lv = w.lv, h = lv.h, ms = _ghtClimbMs(h);
    _gw.path = []; _gw.then = null; _gw.spd = 0; _gw.moving = false;
    const from = up ? { x: w.foot.x, y: w.foot.y } : { x: w.top.x, y: w.top.y };
    _gw.px = from.x; _gw.py = from.y;
    if (!up) { _ght.lv = null; _gw.px = w.foot.x; _gw.py = w.foot.y; }   // (down: the feet go to the ladder's foot at once, the figure drawn at the top and coming down)
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
    _ght.climb = { w, up, t0: performance.now(), ms: _gaMotion() ? ms : 400, step: _gaMotion() ? GHT_CLIMB.step : 1, h, lv };
    // the hand-over-hand pose on the figure, as any move is played (the move's own bookkeeping: prompts hidden, the pet waits)
    const row = GARDEN_ACTS.climbing;
    const cur = _ga.cur = { id: 'climbing', row, spot: { stand: { x: _gw.px, y: _gw.py }, noProp: true, src: lv.id }, doing: false, lift: up ? 0 : h, t0: 0, fxT: 0, fxI: 0 };
    _gaFace(-90);
    try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ }
    cur.doing = true; cur.t0 = performance.now(); cur.x = _gw.px; cur.y = _gw.py; cur.wantDir = 'n';
    try { gardenSfx('step'); } catch (e) { /* quiet */ }
    _gaTell(up ? 'climbup' : 'climbdown', up ? w.foot.x : w.top.x, up ? w.foot.y : w.top.y);
    if (_ga.el) _ga.el.hidden = true;
  };
  if (up) {
    const far = Math.hypot((w.foot.x - _gw.px) * GARDEN_WORLD.cellW, (w.foot.y - _gw.py) * GARDEN_WORLD.cellH);
    if (far < 16) go();
    else if (!gardenWalkToPoint(w.foot, (ok) => { if (ok !== false) go(); }, { radius: 1.6 })) { try { gameDeny(null, { say: 'You cannot get there.' }); } catch (e) { /* fine */ } return false; }
  } else {
    const far = Math.hypot((w.top.x - _gw.px) * GARDEN_WORLD.cellW, (w.top.y - _gw.py) * GARDEN_WORLD.cellH);
    if (far < 10) go();
    else { _gw.path = [{ x: w.top.x, y: w.top.y }]; _gw.then = (ok) => { if (ok !== false) go(); }; _gw.goal = _gw.path[0]; }
  }
  return true;
}
/** Each frame while climbing: the figure goes up (or down) the ladder rung by rung, then steps off. */
function _ghtClimbTick(now) {
  const C = _ght.climb; if (!C) return;
  const cur = _ga.cur, t = now - C.t0, k = Math.min(1, t / C.ms), e = k;   // (one rung after another, at an even pace)
  if (C.up) {
    if (cur && cur.id === 'climbing') cur.lift = C.h * e;
    if (k >= 1) {
      const s = Math.min(1, (t - C.ms) / C.step), q = s * s * (3 - 2 * s);   // the step off the top rung on to the floor
      if (cur && cur.id === 'climbing') cur.lift = C.h;
      _gw.px = C.w.foot.x + (C.w.top.x - C.w.foot.x) * q; _gw.py = C.w.foot.y + (C.w.top.y - C.w.foot.y) * q;
      if (s >= 1) _ghtClimbEnd(); else if (cur) { cur.x = _gw.px; cur.y = _gw.py; }
    }
  } else {
    if (cur && cur.id === 'climbing') cur.lift = C.h * (1 - e);
    if (k >= 1) _ghtClimbEnd();
  }
}
function _ghtClimbEnd() {
  const C = _ght.climb; if (!C) return;
  _ght.climb = null;
  if (_ga.cur && _ga.cur.id === 'climbing') gartActStop(true);
  if (C.up) {
    _ght.lv = C.lv; _gw.px = C.w.top.x; _gw.py = C.w.top.y;
    _gaFace(90); try { _gwBody(); } catch (e) { /* fine */ }
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
    try { _gaFirst({ id: 'climbup', row: GARDEN_ACTS.climbup }); } catch (e) { /* fine */ }
    if (C.lv.L.sit && GARDEN_ACTS[C.lv.L.sit]) setTimeout(() => { if (_ght.lv === C.lv && !_ght.climb) gartActRun(C.lv.L.sit, { stand: { x: _gw.px, y: _gw.py }, seated: true, deg: 90, noProp: true, src: C.lv.id, lift: 0 }); }, 60);
  } else {
    _ght.lv = null; _gw.px = C.w.foot.x; _gw.py = C.w.foot.y + 0.06;
    _gaFace(90); try { _gwBody(); } catch (e) { /* fine */ }
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
  }
  if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked({ x: _gw.px, y: _gw.py }); } catch (e) { /* alone */ }
  _gw.cam.dirty = true;
}
/* ---------- swimming ---------- */
function _ghtWet(x, y) { try { return typeof _gksWetDrawn === 'function' ? _gksWetDrawn(x, y) : _gksWet(x, y); } catch (e) { return false; } }
function _ghtSwimFree(x, y) { return _ghtWet(x, y) && _ghtWet(x - 0.18, y) && _ghtWet(x + 0.18, y) && _ghtWet(x, y - 0.12) && _ghtWet(x, y + 0.14); }
/** Wade in from the bank to where the water holds you, then swim under your own control. */
function gardenSwimStart() {
  if (typeof _gw === 'undefined' || !_gw.on || _ght.swim || _ght.lv || _ght.climb) return false;
  if (typeof gartActStop === 'function') gartActStop();
  let to = null;
  for (const [dx, dy] of [[0, -1], [0.7, -0.7], [-0.7, -0.7], [1, 0], [-1, 0], [0, 1]]) { for (let d = 0.6; d <= 2.6 && !to; d += 0.2) { const x = _gw.px + dx * d, y = _gw.py + dy * d; if (_ghtSwimFree(x, y) && _ghtSwimFree(x + dx * 0.6, y + dy * 0.6)) to = { x: x + dx * 0.25, y: y + dy * 0.25 }; } if (to) break; }
  if (!to) { try { gardenToast('The water is too shallow here for a swim.'); } catch (e) { /* fine */ } return false; }
  _gw.path = []; _gw.then = null; _gw.spd = 0; _gw.moving = false;
  _ght.swim = { on: false, t0: performance.now(), from: { x: _gw.px, y: _gw.py }, to, ms: _gaMotion() ? 1500 : 300, ph: 0, fxT: 0 };
  const dx = to.x - _gw.px, dy = to.y - _gw.py; _gaFace(Math.atan2(dy * GARDEN_WORLD.cellH, dx * GARDEN_WORLD.cellW) * 180 / Math.PI);
  try { _gwBody(); } catch (e) { /* fine */ }
  try { gardenSfx('splash'); } catch (e) { /* quiet */ }
  _gaTell('swim', _gw.px, _gw.py);
  try { _gaFirst({ id: 'swim', row: GARDEN_ACTS.swim }); } catch (e) { /* fine */ }
  if (_ga.el) _ga.el.hidden = true;
  return true;
}
function _ghtSwimTick(now) {
  const S = _ght.swim; if (!S) return;
  if (!S.on) {
    const k = Math.min(1, (now - S.t0) / S.ms), q = k * k * (3 - 2 * k);
    _gw.px = S.from.x + (S.to.x - S.from.x) * q; _gw.py = S.from.y + (S.to.y - S.from.y) * q;
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
    if (k >= 1) {
      S.on = true;
      if (!_ght.hintSwim) { _ght.hintSwim = true; try { gardenToast('Swim with the arrow keys, or click the water. Swim to the bank to climb out.'); } catch (e) { /* fine */ } }
    }
  }
  if (S.out) {
    const k = Math.min(1, (now - S.out.t0) / S.out.ms), q = k * k * (3 - 2 * k);
    _gw.px = S.out.from.x + (S.out.to.x - S.out.from.x) * q; _gw.py = S.out.from.y + (S.out.to.y - S.out.from.y) * q;
    if (k >= 1) { _ght.swim = null; _gw.px = S.out.to.x; _gw.py = S.out.to.y; _ghtLimbsReset(); try { _gwBody(); } catch (e) { /* fine */ } if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked({ x: _gw.px, y: _gw.py }); } catch (e) { /* alone */ } }
    return;
  }
  // splashes as you swim, rings as you float
  if (S.on && window.GardenNativeActions && _gaMotion() && now - S.fxT > (_gw.moving ? 520 : 1900)) { S.fxT = now; const W = GARDEN_WORLD; try { GardenNativeActions.effect('water', _gw.px * W.cellW, W.sky + _gw.py * W.cellH - 2, { width: _gw.moving ? 26 : 34 }); } catch (e) { /* only water */ } }
}
/** Out on to the bank at (x, y): a pull up and a step. */
function _ghtSwimOut(x, y) {
  const S = _ght.swim; if (!S || S.out) return;
  S.out = { t0: performance.now(), ms: _gaMotion() ? 520 : 1, from: { x: _gw.px, y: _gw.py }, to: { x, y } };
  try { gardenSfx('splash'); } catch (e) { /* quiet */ }
  try { if (typeof gartMoveHop === 'function') gartMoveHop(); } catch (e) { /* no hop */ }
  _gaTell('swimout', x, y);
}
/* ---------- the figure: hand over hand up a ladder, strokes in the water ---------- */
const _GHT_SWIM_PROP = '<g class="ght-water"><ellipse cx="0" cy="-25" rx="19" ry="6.4" fill="#4f98ae" opacity="0.72"/><ellipse cx="0" cy="-26" rx="17" ry="4.4" fill="#8ccbdc" opacity="0.55"/><ellipse class="ght-ring" cx="0" cy="-26" rx="22" ry="5.6" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.7"/><path d="M-24 -23q4 2 8 0M16 -22q4 2 8 0" stroke="#e8f6fa" stroke-width="0.9" fill="none" opacity="0.75"/></g>';
/** Called by the gait (94-garden-zz-6move.js) before the walk: true when this frame's pose is ours (a swimmer). */
function gardenHeightBody(body, gw, motion) {
  const S = _ght.swim; if (!S || !body) return false;
  const L = _gmvLimbs(body); if (!L.legA) return false;
  const now = performance.now(), nat = L.native, side = L.side;
  // (a drawing shown again, idle after a stroke, comes back with its limbs as drawn: our pose is written again each frame, not only on a change)
  for (const p of [L.legA, L.legB, L.kneeA, L.kneeB, L.armA, L.armB, L.up, L.root]) if (p && p.el.getAttribute('transform') !== (p.tf || null)) p.tf = null;
  const k = S.on ? 1 : Math.min(1, (now - S.t0) / S.ms), out = S.out ? Math.min(1, (now - S.out.t0) / S.out.ms) : 0, sink = Math.max(0, Math.min(1, k * 1.4 - 0.2)) * (1 - out);
  // the water round the chest: ours, on the body, under its arms
  if (!body._ghtW || !body._ghtW.parentNode) { try { const g = typeof gardenSceneElement === 'function' && nat ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ght-wrap'); g.innerHTML = _GHT_SWIM_PROP; const R = body.querySelector('.gpl-root') || body; R.appendChild(g); body._ghtW = g; } catch (e) { body._ghtW = null; } }
  if (body._ghtW) { const op = String(Math.round(sink * 100) / 100); if (body._ghtW.getAttribute('opacity') !== op) body._ghtW.setAttribute('opacity', op); }
  if (motion) S.ph = (S.ph + (gw.moving ? 0.03 + Math.min(0.05, (gw.spd || 0) / 4000) : 0.008)) % 1;
  const q = Math.sin(S.ph * Math.PI * 2), bobY = Math.sin(now / 520) * 0.9;
  const legS = 1 - sink * 0.94;
  _gmvSet(L.legA, 0, legS, 0, nat); _gmvSet(L.legB, 0, legS, 0, nat); _gmvSet(L.kneeA, 0, null, 0, nat); _gmvSet(L.kneeB, 0, null, 0, nat);
  if (!S.on && !S.out) { _gmvSet(L.armA, 30 * sink, null, 0, nat); _gmvSet(L.armB, -30 * sink, null, 0, nat); _gmvSet(L.root, 0, null, 0, nat); return true; }
  if (gw.moving && motion) {   // a stroke: one arm over and down through the water, then the other
    if (side) { _gmvSet(L.armA, -60 - 110 * (0.5 + 0.5 * q), null, 0, nat); _gmvSet(L.armB, -60 - 110 * (0.5 - 0.5 * q), null, 0, nat); _gmvSet(L.up, 10, null, 0, nat); }
    else { _gmvSet(L.armA, 100 + 70 * q, 0.9, 0, nat); _gmvSet(L.armB, -100 + 70 * q, 0.9, 0, nat); _gmvSet(L.up, 2 * q, null, 0, nat); }
  } else {   // floating, arms out on the water, a slow bob
    _gmvSet(L.armA, side ? -84 : 84 + 5 * q, 0.9, 0, nat); _gmvSet(L.armB, side ? -96 : -84 - 5 * q, 0.9, 0, nat); _gmvSet(L.up, 0, null, 0, nat);
  }
  _gmvSet(L.root, 0, null, bobY, nat);
  return true;
}
/** Out of the water: the legs back, the water off the body (the walk poses it from here). */
function _ghtLimbsReset() {
  try {
    const inner = _gw.node && _gw.node.querySelector('.gd-pl-in'), body = inner && (inner._nativePlayerCurrent ? inner._nativePlayerCurrent.node : inner.firstChild); if (!body) return;
    const L = _gmvLimbs(body); for (const p of [L.legA, L.legB, L.kneeA, L.kneeB, L.armA, L.armB, L.up, L.root]) _gmvSet(p, 0, null, 0, L.native);
    if (body._ghtW) { try { body._ghtW.parentNode.removeChild(body._ghtW); if (body._ghtW.destroy) body._ghtW.destroy(); } catch (e) { /* gone */ } body._ghtW = null; }
  } catch (e) { /* the next drawing is clean */ }
}
/** The shadow at the feet: not under a swimmer or someone on a ladder (the floor's own shadow comes with you). */
function gardenHeightShadowOn() { return !_ght.swim && !_ght.climb; }
/* ---------- the walker: what holds the feet on a floor or in the water ---------- */
if (typeof _gwFree === 'function') {
  const _ghtFree0 = _gwFree;
  _gwFree = function (x, y, m) {   // eslint-disable-line no-func-assign
    if (_ght.climb) return true;   // (on a ladder: nothing to push you off)
    if (_ght.lv) return gardenLevelHas(_ght.lv, x, y);
    if (_ght.swim) return _ght.swim.on ? _ghtSwimFree(x, y) : true;
    return _ghtFree0(x, y, m);
  };
  _ght.free0 = _ghtFree0;
}
if (typeof _gwMoveBy === 'function') {
  const _ghtMove0 = _gwMoveBy;
  _gwMoveBy = function (dx, dy) {   // eslint-disable-line no-func-assign
    if (_ght.climb || (_ght.swim && (!_ght.swim.on || _ght.swim.out))) return false;
    if (_ght.lv && _ght.lv.L.sit) return false;   // (a one-spot floor: you sit there)
    if (_ght.lv || _ght.swim) {
      const x0 = _gw.px, y0 = _gw.py;
      if (_gwFree(x0 + dx, y0 + dy)) { _gw.px += dx; _gw.py += dy; return true; }
      if (_ght.swim) {   // at the bank: climb out where the ground takes your feet
        const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        for (let d = 0.2; d <= 1.0; d += 0.1) { const qx = x0 + ux * d, qy = y0 + uy * d; if (!_ghtWet(qx, qy) && _ght.free0(qx, qy)) { _ghtSwimOut(qx + ux * 0.15, qy + uy * 0.15); return false; } }
      }
      if (dx && Math.abs(dx * 48) > Math.abs(dy * 30) * 0.3 && _gwFree(x0 + dx, y0)) { _gw.px += dx; return true; }   // (a press nearly straight up or down does not creep along the bank)
      if (dy && Math.abs(dy * 30) > Math.abs(dx * 48) * 0.3 && _gwFree(x0, y0 + dy)) { _gw.py += dy; return true; }
      // round what is in the way on a floor (the lamp room, the trunk through the deck) or in the water (a rock): the nearest side the
      // step goes on from, a little at a time, so you walk round it rather than stop (the front way first)
      { const W = GARDEN_WORLD, horiz = Math.abs(dx * W.cellW) >= Math.abs(dy * W.cellH), step = Math.max(Math.abs(dx), Math.abs(dy)) * 0.8;
        for (let k = 1; k <= 30; k++) for (const s of [1, -1]) { const o = s * k * 0.012, ax = horiz ? x0 + dx : x0 + o * 1.6, ay = horiz ? y0 + o : y0 + dy; if (!_gwFree(ax, ay)) continue; const bx = horiz ? x0 : x0 + Math.sign(o) * Math.min(Math.abs(o) * 1.6, step), by = horiz ? y0 + Math.sign(o) * Math.min(Math.abs(o), step * 0.62) : y0; if (_gwFree(bx, by)) { _gw.px = bx; _gw.py = by; return true; } } }
      return false;
    }
    return _ghtMove0(dx, dy);
  };
}
if (typeof gardenWalkToPoint === 'function') {
  const _ghtWalk0 = gardenWalkToPoint;
  gardenWalkToPoint = function (pt, then, o) {   // eslint-disable-line no-func-assign
    if (_ght.climb) return false;
    if (_ght.lv || _ght.swim) {   // a floor or the water: straight there, as far as it holds you (no routes: the ground's map is below)
      if (!pt || (_ght.swim && !_ght.swim.on)) return false;
      let tgt = { x: pt.x, y: pt.y };
      if (_ght.lv) { const sy = tgt.y + _ght.lv.h / GARDEN_WORLD.cellH; if (gardenLevelHas(_ght.lv, tgt.x, sy) || !gardenLevelHas(_ght.lv, tgt.x, tgt.y)) tgt.y = sy; }   // (a click on the floor as drawn: down to its ground plane)
      if (!_gwFree(tgt.x, tgt.y)) { if (_ght.swim && !_ghtWet(tgt.x, tgt.y) && _ght.free0(tgt.x, tgt.y)) { /* a click on the bank: swim to it and climb out */ } else { const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(tgt.x, tgt.y, 1.2) : null; if (!f) return false; tgt = f; } }
      _gw.path = [tgt]; _gw.then = then || null; _gw.goal = tgt; _gw.repaths = 0; _gw.blockT = 0;
      if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked(tgt); } catch (e) { /* alone */ }
      if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
      return true;
    }
    return _ghtWalk0(pt, then, o);
  };
}
if (typeof gardenPlayWalk === 'function') {
  const _ghtPace0 = gardenPlayWalk;
  gardenPlayWalk = function () { return _ghtPace0() * (_ght.swim ? 0.55 : 1); };   // eslint-disable-line no-func-assign
}
/* ---------- the moves: the ladders' prompts, climbing, swimming ---------- */
if (typeof _gaStaticRows === 'function') {
  const _ghtRows0 = _gaStaticRows;
  _gaStaticRows = function () { const rows = _ghtRows0(); if (_ght.lv) return rows; try { for (const r of _ghtRows()) rows.push(r); } catch (e) { /* no floors */ } return rows; };   // eslint-disable-line no-func-assign
}
if (typeof gartActNearby === 'function') {
  const _ghtNear0 = gartActNearby;
  gartActNearby = function () {   // eslint-disable-line no-func-assign
    if (_ght.climb || _ght.swim) return [];
    if (_ght.lv) { const px = _gw.px, py = _gw.py; return _ghtRows().filter(r => Math.hypot(r.x - px, (r.y - py) * 1.3) <= 1.1).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)); }
    return _ghtNear0();
  };
}
if (typeof gartActRun === 'function') {
  const _ghtRun0 = gartActRun;
  gartActRun = function (id, spot) {   // eslint-disable-line no-func-assign
    if (id === 'climbup' || id === 'climbdown') return gardenClimb(spot && spot.way, id === 'climbup');
    if (id === 'swim') return gardenSwimStart();
    if (_ght.climb || _ght.swim) return false;
    return _ghtRun0(id, spot);
  };
}
if (typeof gartActFrame === 'function') {
  const _ghtFrame0 = gartActFrame;
  gartActFrame = function () {   // eslint-disable-line no-func-assign
    const now = performance.now();
    try { _ghtClimbTick(now); _ghtSwimTick(now); _ghtRetell(); _ghtRailFrame(); } catch (e) { console.error('[garden height]', e); _ght.climb = null; }
    return _ghtFrame0();
  };
}
if (typeof gartActInteract === 'function') {
  const _ghtE0 = gartActInteract;
  gartActInteract = function () { if (_ght.climb || (_ght.swim && !_ght.swim.on)) return true; return _ghtE0(); };   // eslint-disable-line no-func-assign   (E on a ladder: you finish the climb)
}
if (typeof gartActMoved === 'function') {
  const _ghtMoved0 = gartActMoved;
  gartActMoved = function () { if (_ght.climb) return; return _ghtMoved0(); };   // eslint-disable-line no-func-assign
}
/** Leaving the garden, a room or a reset: back on the ground, out of the water. */
function gardenHeightReset() { _ght.lv = null; _ght.climb = null; _ght.swim = null; _ght.list = null; }
/* ---------- the pet waits at the ladder's foot ---------- */
if (typeof gardenLifePetGoal === 'function') {
  const _ghtPet0 = gardenLifePetGoal;
  gardenLifePetGoal = function (P, dt) {   // eslint-disable-line no-func-assign
    const lv = _ght.lv || (_ght.climb && _ght.climb.lv);
    if (P && P.me && lv && lv.ways[0]) { const f = lv.ways[0].foot; return { x: f.x + 0.75, y: f.y + 0.35, near: 0.6 }; }
    return _ghtPet0(P, dt);
  };
}
/* ---------- friends ---------- */
/** Someone new here while you are up on a floor or in the water: they see you climb up, or swim, from where you went in. */
function _ghtRetell() {
  if (typeof _gll === 'undefined' || !_gll.actors) return;
  const sig = [..._gll.actors.keys()].join(',');
  if (sig === _ght.seen) return;
  const added = sig.split(',').some(k => k && !_ght.seen.split(',').includes(k)); _ght.seen = sig;
  if (!added) return;
  if (_ght.lv && !_ght.climb) { const w = _ght.lv.ways[0]; if (w) setTimeout(() => { if (_ght.lv) _gaTell('climbup', w.foot.x, w.foot.y); }, 1500); }
}
/** Their copy of someone: climb a way, swim, climb out. Returns true when it was one of these. */
function _ghtRemote(A, id) {
  const W = GARDEN_WORLD;
  if (id === 'climbup' || id === 'climbdown') {
    const up = id === 'climbup', w = _ghtWayNear(A.x, A.y, up, 1.6); if (!w) return true;
    if (A.ghtH) { try { A.ghtH.stop(); } catch (e) { /* gone */ } A.ghtH = null; }
    if (up) { A.x = w.foot.x; A.y = w.foot.y; } else { A.x = w.foot.x; A.y = w.foot.y; A.hLv = null; A.hLift = 0; A.hZ = null; }
    A.tx = null; A.ty = null; A.way = null;
    A.dir = 'n'; A.pose = ''; A.key = ''; if (typeof _gllPaint === 'function') _gllPaint(A);
    A.ghtClimb = { w, up, t0: performance.now(), ms: _ghtClimbMs(w.lv.h) };
    const gpl = A.root && A.root.querySelector('.gpl'); if (gpl) A.ghtH = gartActPlay(gpl, 'climbing', { motion: typeof _gllReduced === 'function' ? !_gllReduced() : true });
    A.actLift = 0; A.hLift = up ? 0 : w.lv.h;   // (the whole figure rises, its name with it: the sprite's own lift)
    return true;
  }
  if (id === 'swim') { A.ghtSwim = { t0: performance.now(), from: { x: A.x, y: A.y }, to: null, on: false }; const W2 = _ghtSwimTo(A.x, A.y); A.ghtSwim.to = W2 || { x: A.x, y: A.y - 1 }; A.swimming = true; A.key = ''; return true; }
  if (id === 'swimout') { { const sh = A.root && A.root.querySelector('.gll-shadow'); if (sh) sh.setAttribute('opacity', '1'); } A.swimming = false; A.ghtSwim = null; if (A.ghtSH) { try { A.ghtSH.stop(); } catch (e) { /* gone */ } A.ghtSH = null; } A.key = ''; return true; }
  void W; return false;
}
function _ghtSwimTo(x, y) {
  for (const [dx, dy] of [[0, -1], [0.7, -0.7], [-0.7, -0.7], [1, 0], [-1, 0], [0, 1]]) for (let d = 0.6; d <= 2.6; d += 0.2) { const qx = x + dx * d, qy = y + dy * d; if (_ghtSwimFree(qx, qy) && _ghtSwimFree(qx + dx * 0.6, qy + dy * 0.6)) return { x: qx + dx * 0.25, y: qy + dy * 0.25 }; }
  return null;
}
/** Each step of their copy: the climb's rise, the floor's height and depth, the swim's wade in and its strokes. */
function _ghtRemoteStep(A) {
  const now = performance.now(), C = A.ghtClimb;
  if (C) {
    const k = Math.min(1, (now - C.t0) / C.ms);
    A.actLift = 0; A.hLift = C.w.lv.h * (C.up ? k : 1 - k);
    if (k >= 1) {
      A.ghtClimb = null; if (A.ghtH) { try { A.ghtH.stop(); } catch (e) { /* gone */ } A.ghtH = null; }
      A.actLift = 0; A.hLift = 0;
      if (C.up) { A.hLv = C.w.lv.key; A.x = C.w.top.x; A.y = C.w.top.y; } else { A.hLv = null; A.y = C.w.foot.y + 0.06; }
      A.dir = 's'; A.key = ''; { const sh = A.root && A.root.querySelector('.gll-shadow'); if (sh) sh.setAttribute('opacity', '1'); }
      if (C.up && C.w.lv.L.sit && typeof gartActRemote === 'function') setTimeout(() => { if (A.hLv === C.w.lv.key) gartActRemote(A, C.w.lv.L.sit); }, 60);
    }
  }
  if (A.hLv) { const lv = _ghtLevelByKey(A.hLv); if (lv) { A.hLift = lv.h; A.hZ = (gardenLevelDepth(lv, A.x, A.y) - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH; } else { A.hLv = null; A.hLift = 0; A.hZ = null; } }
  else if (A.hLift && !A.ghtClimb) { A.hLift = 0; A.hZ = null; }
  const S = A.ghtSwim;
  if (S && !S.on) { const k = Math.min(1, (now - S.t0) / 1500), q = k * k * (3 - 2 * k); A.x = S.from.x + (S.to.x - S.from.x) * q; A.y = S.from.y + (S.to.y - S.from.y) * q; if (k >= 1) S.on = true; }
}
if (typeof gartActRemote === 'function') {
  const _ghtRem0 = gartActRemote;
  gartActRemote = function (A, id) { if (A && (id === 'climbup' || id === 'climbdown' || id === 'swim' || id === 'swimout')) return _ghtRemote(A, id); return _ghtRem0(A, id); };   // eslint-disable-line no-func-assign
}
if (typeof _gllStep === 'function') {
  const _ghtStep0 = _gllStep;
  _gllStep = function (A, dt, quiet) {   // eslint-disable-line no-func-assign
    if (A && (A.ghtClimb || A.hLv || A.ghtSwim || A.hLift)) { try { _ghtRemoteStep(A); } catch (e) { A.ghtClimb = null; } }
    if (A && A.ghtClimb) { A.tx = null; A.ty = null; }
    return _ghtStep0(A, dt, quiet);
  };
}
if (typeof _gllPaint === 'function') {
  const _ghtPaint0 = _gllPaint;
  _gllPaint = function (A) {   // eslint-disable-line no-func-assign
    if (!A || !(A.swimming || A.ghtClimb)) return _ghtPaint0(A);
    const m = A.moving, k0 = A.key; A.moving = false;   // (a swimmer swims and a climber climbs: never the walk)
    { const sh = A.root && A.root.querySelector('.gll-shadow'); if (sh) sh.setAttribute('opacity', '0'); }
    if (A.ghtClimb) A.dir = 'n';
    _ghtPaint0(A); A.moving = m;
    if (A.swimming && (A.key !== k0 || !A.ghtSH)) {   // a new drawing: the stroke and the water go back on it
      if (A.ghtSH) { try { A.ghtSH.stop(); } catch (e) { /* gone */ } }
      const gpl = A.root && A.root.querySelector('.gpl'); A.ghtSH = gpl ? gartActPlay(gpl, A.dir === 'e' ? 'swimmingside' : 'swimming', { motion: typeof _gllReduced === 'function' ? !_gllReduced() : true }) : null;
    }
  };
}
if (typeof _gllWalkTo === 'function') {
  const _ghtWalkTo0 = _gllWalkTo;
  _gllWalkTo = function (A, x, y, then) { if (A && A.ghtClimb) return; return _ghtWalkTo0(A, x, y, then); };   // eslint-disable-line no-func-assign
}
if (typeof _glhWalk === 'function') {
  const _ghtHostWalk0 = _glhWalk;
  _glhWalk = function (A, ev) {   // eslint-disable-line no-func-assign
    if (A && (A.hLv || A.swimming || A.ghtClimb)) {   // up on a floor or in the water: straight there (the ground's routes are below them)
      if (!Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return;
      _gllWalkVia(A, null, ev.x, ev.y);
      if (_gll.actors.size > 1) _glhSend('all', 'go', { w: ev.w, x: ev.x, y: ev.y });
      return;
    }
    return _ghtHostWalk0(A, ev);
  };
}
if (typeof _gaWords === 'function') {
  const _ghtWords0 = _gaWords;
  _gaWords = function (r) {   // eslint-disable-line no-func-assign
    if (r && r.act === 'climbup' && r.way) return 'Climb up to ' + r.way.lv.name;
    if (r && r.act === 'climbdown') return 'Climb down';
    return _ghtWords0(r);
  };
}
/** The parts a floor's ways draw on the thing (a ladder the painter does not draw itself): rows for the world (94-garden-zz-7act-2world.js). */
function gardenLevelWayParts(t) {
  const out = [], H = _ghtH(), S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592;
  for (const lv of gardenLevels()) { if (lv.id !== t.id) continue; for (const w of lv.ways) if (w.art) out.push({ id: 'part-' + t.id + '-lv' + lv.li + 'w' + w.i, owner: t.id, kind: t.kind, art: w.art, x: w.foot.x, y: w.foot.y, row: { top: lv.h / S, loft: w.loft, bare: !w.loft } }); }
  void H; return out;
}
/* In the water the swimmer is drawn facing you or away (its legs under the water): side on, the drawing's legs hang below the surface. */
if (typeof _gmvDrawing === 'function') {
  const _ghtDraw0 = _gmvDrawing;
  _gmvDrawing = function (h) {   // eslint-disable-line no-func-assign
    const D = _ghtDraw0(h);
    if (D.dir !== 'e' || !_ght.swim) return D;
    const a = (((h + 180) % 360) + 360) % 360 - 180;
    return { dir: a < 0 && a > -180 ? 'n' : 's', mirror: 1, sx: 1 };
  };
}
/* The floor's front rail in front of your legs: the thing's picture has its rail, but you are drawn over the whole picture, so the piece
   of rail that passes in front of you is drawn again on you (a level's `rail`: { ring: [rx, ry] } or { line: [x0, x1, y] }, h, color, in H). */
function _ghtRailFrame() { _ghtRailOn(_ght, _gw && _gw.node, _ght.climb ? null : _ght.lv, _gw.px, _gw.py); }
/** A friend's copy up on a floor: the same rail over its legs (called by its sprite each step, 94-garden-live-1core.js). */
function gardenHeightRail(A, node) { if (!A || !node || (!A.hLv && !A.railG)) return; const lv = A.hLv && !A.ghtClimb ? _ghtLevelByKey(A.hLv) : null; _ghtRailOn(A, node, lv, A.x, A.y); }
function _ghtRailOn(K, node, lv, px, py) {
  const R = lv && lv.L.rail;
  const W = GARDEN_WORLD, H = _ghtH(), C = lv && lv.L.core;
  const u = lv ? (px * W.cellW - lv.cx) / H : 0, v = lv ? (W.sky + py * W.cellH - lv.cy) / H : 0;
  const show = !!(R && node && !(C && v < C[1] && Math.abs(u) < C[0]));
  const key = show ? lv.key + '|' + Math.round(u * 400) + ',' + Math.round(v * 400) : '';
  if (key === K.railKey && (!show || (K.railG && K.railG.parentNode === node))) return;
  K.railKey = key;
  if (!show) { if (K.railG) K.railG.setAttribute('opacity', '0'); return; }
  if (!K.railG || K.railG.parentNode !== node) { try { if (K.railG && K.railG.parentNode) K.railG.parentNode.removeChild(K.railG); } catch (e) { /* gone */ } const g = typeof gardenSceneElement === 'function' && typeof gardenVisualIsNative === 'function' && gardenVisualIsNative(node) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ght-rail'); node.appendChild(g); K.railG = g; }
  const ox = -u * H, oy = -v * H, hh = (R.h || 0.36) * H, col = R.color || '#2a2e30', win = 13, N = (k) => Math.round(k * 10) / 10;
  // the rail's front line in the node's own px (its origin at your feet), from win px left of you to win px right
  const at = (x) => { if (R.ring) { const rx = R.ring[0] * H, ry = R.ring[1] * H, k = Math.max(0, 1 - ((x - ox) / rx) ** 2); return oy + ry * Math.sqrt(k); } return oy + R.line[2] * H; };
  const lo = R.ring ? Math.max(-win, ox - R.ring[0] * H + 1) : Math.max(-win, ox + R.line[0] * H), hi = R.ring ? Math.min(win, ox + R.ring[0] * H - 1) : Math.min(win, ox + R.line[1] * H);
  if (hi <= lo || at(0) < -1) { K.railG.setAttribute('opacity', '0'); return; }
  const gap = R.gap ? [ox + R.gap[0] * H, ox + R.gap[1] * H] : null, inGap = (x) => gap && x > gap[0] && x < gap[1];
  let d = '', p = '';
  const step = (R.post || 0.11) * H, o0 = (R.post0 || 0) * H, first = Math.ceil((lo - ox - o0) / step) * step + ox + o0;
  for (let x = first; x <= hi; x += step) if (!inGap(x)) p += `M${N(x)} ${N(at(x) - 0.5)}v${N(-hh)}`;
  for (let x = lo; x < hi; x += 2) { const x1 = Math.min(hi, x + 2); if (inGap(x) || inGap(x1)) continue; d += `M${N(x)} ${N(at(x) - hh)}L${N(x1)} ${N(at(x1) - hh)}` + (R.mid === false ? '' : `M${N(x)} ${N(at(x) - hh * 0.5)}L${N(x1)} ${N(at(x1) - hh * 0.5)}`); }
  K.railG.innerHTML = (p ? `<path d="${p}" stroke="${col}" stroke-width="${R.postW || 0.9}" fill="none"/>` : '') + (d ? `<path d="${d}" stroke="${col}" stroke-width="${R.railW || 1.3}" fill="none" stroke-linecap="round"/>` : '');
  K.railG.setAttribute('opacity', '1');
}
