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
      const lv = { key: t.id + ':' + L.id, id: t.id, kind: t.kind, li, name: L.name || K.name, cx, cy, h, depth, depth0: Math.min(depth0, fy), fx, fy, py0: rec && rec.handle && rec.handle.foot && Number.isFinite(rec.handle.foot.y) ? rec.handle.foot.y : fy, L, ways: [] };   // (depth0: the thing's own, never below its drawn foot)
      (L.ways || []).forEach((w, wi) => {
        const foot = { x: (fx + w.foot[0] * H) / W.cellW, y: (fy + w.foot[1] * H - W.sky) / W.cellH }, top = { x: (cx + w.top[0] * H) / W.cellW, y: (cy + w.top[1] * H - W.sky) / W.cellH };
        lv.ways.push({ i: wi, by: w.by || 'ladder', inside: !!w.inside, door: w.door || null, doorAt: { x: (fx + w.foot[0] * H) / W.cellW, y: B.y }, depth0: Math.min(depth0, fy), name: w.name || 'the ladder', art: w.art || '', loft: !!w.loft, foot, top, lv });
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
function gardenHeightLift() { return _ght.lv && !_ght.climb ? _ght.lv.h : _ght.climb && _ght.climb.inside ? _ght.climb.lift || 0 : 0; }
/** How far up the view looks: the floor you are on, or how far up the ladder you are. */
function gardenHeightView() { const C = _ght.climb; if (C && C.inside) return C.view || 0; return gardenHeightLift() + (C && _ga.cur && _ga.cur.id === 'climbing' ? _ga.cur.lift || 0 : 0); }
/** The depth to draw you at, or null when the ground decides. */
/* (rising out of a stair head: drawn behind the thing, so its own wall hides your legs) */
function gardenHeightDepth() { const C = _ght.climb; if (C && C.inside && C.atTop) return C.behind ? C.lv.depth0 - 1 : gardenLevelDepth(C.lv, _gw.px, _gw.py); return _ght.lv && !_ght.climb ? gardenLevelDepth(_ght.lv, _gw.px, _gw.py) : null; }
/** A stair's door standing open while someone goes in or comes out (a way's `door`: { w, h, up } in H: its width, height, and how far
 *  its sill is above the drawn foot), drawn just in front of the thing: the dark of the stair inside, the door swung back. */
function _ghtDoor(w, on, who) {
  const G = window.GardenNative && GardenNative.world && GardenNative.world(); if (!G || !w || !w.door) return;
  const id = 'ght-door-' + w.lv.key + '-' + w.i + '-' + (who || 'me');
  if (!on) { if (_ght.doors && _ght.doors[id]) { delete _ght.doors[id]; try { G.remove(id); } catch (e) { /* gone */ } } return; }
  (_ght.doors || (_ght.doors = {}))[id] = 1;
  const H = _ghtH(), dw = w.door.w * H, dh = w.door.h * H, up = (w.door.up || 0) * H, N = (k) => Math.round(k * 10) / 10, r = dw / 2;
  const arch = `M${N(-r)} ${N(-up)}V${N(-up - dh + r * 1.24)}Q${N(-r)} ${N(-up - dh)} 0 ${N(-up - dh)}Q${N(r)} ${N(-up - dh)} ${N(r)} ${N(-up - dh + r * 1.24)}V${N(-up)}Z`;
  const svg = `<path d="${arch}" fill="#1a1510"/><path d="M${N(-r + 2)} ${N(-up)}V${N(-up - dh * 0.6)}" stroke="#3a2c1e" stroke-width="2" opacity="0.6"/><path d="M${N(r)} ${N(-up)}l${N(r * 0.55)} 2V${N(-up - dh + r * 1.2)}l${N(-r * 0.55)} -3z" fill="#5a4228" stroke="#2e2a26" stroke-width="0.8"/><path d="M${N(r + 1)} ${N(-up - dh * 0.25)}l${N(r * 0.5)} 1.4M${N(r + 1)} ${N(-up - dh * 0.62)}l${N(r * 0.5)} 1.4" stroke="#2e2a26" stroke-width="1.4"/>`;
  try { G.actor(id, svg, w.doorAt.x, w.doorAt.y, { depth: w.depth0 + 0.5 }); } catch (e) { /* no door drawn */ }
}
/** A stair inside a thing: how long the way up takes (ms), a little longer the higher it goes. */
function _ghtStairMs(h) { return Math.max(2600, Math.round(h / _ghtH() * 420)); }
/** Seen or not (going in at a door, coming up a stair head): the figure's own opacity. */
function _ghtAlpha(node, a) { if (!node) return; const v = String(Math.round(a * 100) / 100); if (node._ghtA === v) return; node._ghtA = v; try { if (node.target && typeof node.target.setAlpha === 'function') node.target.setAlpha(a); else node.setAttribute('opacity', v); } catch (e) { /* drawn as it is */ } }
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
    else out.push({ key: 'lv:' + lv.key + ':up' + w.i, act: 'climbup', name: w.name, x: w.foot.x, y: w.foot.y, top: (w.foot.y - Math.min(lv.h, 140) / GARDEN_WORLD.cellH), stand: { x: w.foot.x, y: w.foot.y }, deg: -90, lift: 0, src: lv.id, kind: lv.kind, way: w, noProp: true, seated: true, pri: 0.5 });   // (pri: the way up before a nap under the tree it is built in)
  }
  return out;
}
/* ---------- climbing ---------- */
/** How high up the ladder the feet are when you step off: where the top's floor is on screen above the ladder's foot (a landing out in
 *  front of a wall is reached a little lower than its height, its front edge nearer). */
function _ghtLadderTop(w) { const h = w.lv.h, d = (w.top.y - w.foot.y) * GARDEN_WORLD.cellH; return d > 0 ? Math.max(h * 0.5, h - d) : h; }
function _ghtClimbMs(h) { return Math.max(GHT_CLIMB.min, Math.round(h / GHT_CLIMB.rung) * GHT_CLIMB.perRung); }
/** Climb a way: up from its foot (walking there first), or down from its top. */
function gardenClimb(w, up) {
  if (!w || typeof _gw === 'undefined' || !_gw.on || _ght.climb) return false;
  if (up) _ght.after = null;
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
    if (w.inside) {   // a stair inside: in at the door and up out of sight, out at the top (or the other way); no ladder pose
      _ght.climb = { w, up, inside: true, t0: performance.now(), ms: _gaMotion() ? _ghtStairMs(h) : 400, h, lv, lift: up ? 0 : h, view: up ? 0 : h, atTop: !up, stepT: 0 };
      if (!up) { _gw.px = w.top.x; _gw.py = w.top.y; }
      _gaFace(up ? -90 : 90); try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* fine */ }
      try { gardenSfx('step'); } catch (e) { /* quiet */ }
      _gaTell(up ? 'climbup' : 'climbdown', up ? w.foot.x : w.top.x, up ? w.foot.y : w.top.y);
      if (_ga.el) _ga.el.hidden = true;
      return;
    }
    const hEnd = _ghtLadderTop(w);
    _ght.climb = { w, up, t0: performance.now(), ms: _gaMotion() ? ms : 400, step: _gaMotion() ? GHT_CLIMB.step : 1, h, hEnd, lv };
    // the hand-over-hand pose on the figure, as any move is played (the move's own bookkeeping: prompts hidden, the pet waits)
    const row = GARDEN_ACTS.climbing;
    const cur = _ga.cur = { id: 'climbing', row, spot: { stand: { x: _gw.px, y: _gw.py }, noProp: true, src: lv.id }, doing: false, lift: up ? 0 : hEnd, t0: 0, fxT: 0, fxI: 0 };
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
  if (C.inside) { _ghtStairTick(C, now); return; }
  const cur = _ga.cur, t = now - C.t0, k = Math.min(1, t / C.ms), e = k;   // (one rung after another, at an even pace)
  if (C.up) {
    if (cur && cur.id === 'climbing') cur.lift = C.hEnd * e;
    if (k >= 1) {
      const s = Math.min(1, (t - C.ms) / C.step), q = s * s * (3 - 2 * s);   // the step off the top rung on to the floor (level on screen)
      if (cur && cur.id === 'climbing') cur.lift = C.hEnd + (C.h - C.hEnd) * q;
      _gw.px = C.w.foot.x + (C.w.top.x - C.w.foot.x) * q; _gw.py = C.w.foot.y + (C.w.top.y - C.w.foot.y) * q;
      if (s >= 1) _ghtClimbEnd(); else if (cur) { cur.x = _gw.px; cur.y = _gw.py; }
    }
  } else {
    if (cur && cur.id === 'climbing') cur.lift = C.hEnd * (1 - e);
    if (k >= 1) _ghtClimbEnd();
  }
}
/** Up a stair inside a thing: a few steps in at its door, fading into the dark; the footsteps going up; then up out of the stair head at
 *  the top (rising the last few steps, the battlements in front), on to the floor. Down the other way. The feet are where the figure is. */
function _ghtStairTick(C, now) {
  const k = Math.min(1, (now - C.t0) / C.ms), H = _ghtH(), W = GARDEN_WORLD, w = C.w;
  const door = { x: w.foot.x, y: w.foot.y - 0.42 * H / W.cellH };   // (just inside the door)
  const ease = (q) => q * q * (3 - 2 * q), kIn = C.up ? k : 1 - k;   // (kIn: 0 at the foot, 1 at the top)
  let a = 1;
  if (kIn < 0.28) {   // at the door: walking in (or out), fading
    const q = ease(Math.min(1, kIn / 0.24)); C.atTop = false; C.lift = 0;
    if (!C.up && !C.out) { C.out = true; _gaFace(90); try { _gwBody(); } catch (e) { /* fine */ } }   // (out of the door: facing you)
    _gw.px = w.foot.x + (door.x - w.foot.x) * q; _gw.py = w.foot.y + (door.y - w.foot.y) * q; a = 1 - q;
    C.view = 0;
  } else if (kIn < 0.72) {   // inside, out of sight: the view goes up with the footsteps
    a = 0; C.atTop = false; C.lift = 0;
    C.view = C.h * ease((kIn - 0.28) / 0.44);
    if (_gaMotion() && now - C.stepT > 330) { C.stepT = now; try { gardenSfx('step'); } catch (e) { /* quiet */ } }
  } else {   // the stair head: rising (or sinking) behind the battlements, then on to the floor
    const q = ease(Math.min(1, (kIn - 0.72) / 0.22)); C.atTop = true; C.view = C.h;
    _gw.px = w.top.x; _gw.py = w.top.y; C.lift = C.h - 1.15 * H * (1 - q); a = q > 0 ? 1 : 0; C.behind = q < 0.999;   // (wholly under the floor at first, drawn behind the thing: its own wall hides you)
  }
  _ghtAlpha(_gw.node, a);
  _ghtDoor(w, kIn < 0.33 && k < 1);
  if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
  _gw.cam.dirty = true;
  if (k >= 1) _ghtClimbEnd();
}
function _ghtClimbEnd() {
  const C = _ght.climb; if (!C) return;
  _ght.climb = null;
  if (C.inside) { _ghtAlpha(_gw.node, 1); _ghtDoor(C.w, false); }
  if (_ga.cur && _ga.cur.id === 'climbing') gartActStop(true);
  if (C.up) {
    _ght.lv = C.lv; _gw.px = C.w.top.x; _gw.py = C.w.top.y;
    _gaFace(90); try { _gwBody(); } catch (e) { /* fine */ }
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
    try { const fid = C.w.by === 'stair' && GARDEN_ACTS.stairup ? 'stairup' : 'climbup'; _gaFirst({ id: fid, row: GARDEN_ACTS[fid] }); } catch (e) { /* fine */ }
    if (C.lv.L.sit && GARDEN_ACTS[C.lv.L.sit]) setTimeout(() => { if (_ght.lv === C.lv && !_ght.climb) gartActRun(C.lv.L.sit, { stand: { x: _gw.px, y: _gw.py }, seated: true, deg: 90, noProp: true, src: C.lv.id, lift: 0 }); }, 60);
  } else {
    if (_ght.after) { const A = _ght.after; _ght.after = null; setTimeout(() => { if (!_ght.lv && !_ght.climb) gardenWalkToPoint(A.pt, A.then); }, 120); }   // (then on to where you clicked)
    _ght.lv = null; _gw.px = C.w.foot.x; _gw.py = C.w.foot.y + 0.06;
    _gaFace(90); try { _gwBody(); } catch (e) { /* fine */ }
    if (typeof _GPL !== 'undefined') { _GPL.lastX = _gw.px; _GPL.lastY = _gw.py; }
  }
  if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked({ x: _gw.px, y: _gw.py }); } catch (e) { /* alone */ }
  _gw.cam.dirty = true;
}
/* ---------- swimming ---------- */
function _ghtWet(x, y) { try { return typeof _gksWetDrawn === 'function' ? _gksWetDrawn(x, y) : _gksWet(x, y); } catch (e) { return false; } }
function _ghtSwimFree(x, y) { return _ghtWet(x, y) && _ghtWet(x - 0.18, y) && _ghtWet(x + 0.18, y) && _ghtWet(x, y - 0.12) && _ghtWet(x, y + 0.14) && !_ghtAfloat(x, y) && !_ghtDeck(x, y); }
/** Is (x, y) on or under a way across the water (a bridge's deck, a weir walk, stepping stones: any crossing the layout lays, as its
 *  standing surface is drawn)? You swim round it, never up on to it or under it, and never climb out on to it from the water. */
function _ghtDeck(x, y) {
  let C = null; try { C = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : null; } catch (e) { C = null; }
  if (!C || !C.length || typeof gardenIslandInPolygon !== 'function') return false;
  for (const c of C) { const S = c.support; if (!S || S.length < 3) continue; for (const [dx, dy] of [[0, 0], [-0.3, 0], [0.3, 0], [0, -0.3], [0, 0.35]]) if (gardenIslandInPolygon(x + dx, y + dy, S)) return true; }
  return false;
}
/** A straight wade from the bank to (to): through water, never across a deck. */
function _ghtWadeClear(from, to) { for (let k = 0.15; k <= 1.001; k += 0.15) { const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k; if (_ghtDeck(x, y)) return false; } return true; }
/** Is something standing in the water here (a moored boat, a pier's legs, a buoy: any thing found whose foot is in the water)? You
 *  swim round it, not through it. The list is made again every few seconds. */
function _ghtAfloat(x, y) {
  const now = performance.now();
  if (!_ght.afloat || now - _ght.afloatT > 4000) {
    _ght.afloatT = now; _ght.afloat = [];
    try { for (const t of gardenAffordThings()) { if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue; const w = Math.max(0.5, t.w || 1), h = Math.max(0.3, Math.min(t.h || 1, 3)); if (_ghtWet(t.x, t.y - h / 2) || _ghtWet(t.x, t.y - 0.1)) _ght.afloat.push([t.x - w / 2, t.y - h, t.x + w / 2, t.y + 0.1]); } } catch (e) { /* none */ }
  }
  for (const b of _ght.afloat) if (x > b[0] - 0.15 && x < b[2] + 0.15 && y > b[1] - 0.1 && y < b[3] + 0.15) return true;
  return false;
}
/** Wade in from the bank to where the water holds you, then swim under your own control. */
function gardenSwimStart() {
  if (typeof _gw === 'undefined' || !_gw.on || _ght.swim || _ght.lv || _ght.climb) return false;
  if (typeof gartActStop === 'function') gartActStop();
  let to = null;
  for (const [dx, dy] of [[0, -1], [0.7, -0.7], [-0.7, -0.7], [1, 0], [-1, 0], [0, 1]]) { for (let d = 0.6; d <= 2.6 && !to; d += 0.2) { const x = _gw.px + dx * d, y = _gw.py + dy * d; if (_ghtSwimFree(x, y) && _ghtSwimFree(x + dx * 0.6, y + dy * 0.6) && _ghtWadeClear({ x: _gw.px, y: _gw.py }, { x: x + dx * 0.25, y: y + dy * 0.25 })) to = { x: x + dx * 0.25, y: y + dy * 0.25 }; } if (to) break; }
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
const _GHT_SWIM_PROP = '<g class="ght-water"><ellipse cx="0" cy="-25" rx="19" ry="6.4" fill="#4f98ae" opacity="0.62"/><ellipse cx="0" cy="-26" rx="17" ry="4.4" fill="#8ccbdc" opacity="0.4"/><ellipse class="ght-ring" cx="0" cy="-26" rx="22" ry="5.6" fill="none" stroke="#e8f6fa" stroke-width="1" opacity="0.5"/><path d="M-24 -23q4 2 8 0M16 -22q4 2 8 0" stroke="#e8f6fa" stroke-width="0.9" fill="none" opacity="0.75"/></g>';
/** Called by the gait (94-garden-zz-6move.js) before the walk: true when this frame's pose is ours (a swimmer). */
function gardenHeightBody(body, gw, motion) {
  const S = _ght.swim; if (!body) return false;
  if (!S) {
    if (!body._ghtSeen) { body._ghtSeen = 1; try { if (body.querySelector && body.querySelector('.ght-wrap')) (_ght.wet || (_ght.wet = new Set())).add(body); } catch (e) { /* plain */ } }   // (a drawing made from a wet one)
    if (body._ghtW || (_ght.wet && _ght.wet.size)) _ghtLimbsReset();
    return false;
  }   // (out of the water: no drawing keeps the water ring or the swim pose)
  const L = _gmvLimbs(body); if (!L.legA) return false;
  const now = performance.now(), nat = L.native, side = L.side;
  // (a drawing shown again, idle after a stroke, comes back with its limbs as drawn: our pose is written again each frame, not only on a change)
  for (const p of [L.legA, L.legB, L.kneeA, L.kneeB, L.armA, L.armB, L.up, L.root]) if (p && p.el.getAttribute('transform') !== (p.tf || null)) p.tf = null;
  const k = S.on ? 1 : Math.min(1, (now - S.t0) / S.ms), out = S.out ? Math.min(1, (now - S.out.t0) / S.out.ms) : 0, sink = Math.max(0, Math.min(1, k * 1.4 - 0.2)) * (1 - out);
  // the water round the chest: ours, on the body, under its arms
  if (!body._ghtW || !body._ghtW.parentNode) { try { const g = typeof gardenSceneElement === 'function' && nat ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ght-wrap'); g.innerHTML = _GHT_SWIM_PROP; const R = body.querySelector('.gpl-root') || body; R.appendChild(g); body._ghtW = g; } catch (e) { body._ghtW = null; } }
  (_ght.wet || (_ght.wet = new Set())).add(body);   // (every drawing posed in the water: each facing has its own, all cleared on the way out)
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
  const bodies = new Set(_ght.wet || []);
  try { const inner = _gw.node && _gw.node.querySelector('.gd-pl-in'), body = inner && (inner._nativePlayerCurrent ? inner._nativePlayerCurrent.node : inner.firstChild); if (body) bodies.add(body); } catch (e) { /* none on screen */ }
  for (const body of bodies) {
    try {
      const L = _gmvLimbs(body); for (const p of [L.legA, L.legB, L.kneeA, L.kneeB, L.armA, L.armB, L.up, L.root]) _gmvSet(p, 0, null, 0, L.native);
      if (body._ghtW) { try { if (body._ghtW.parentNode) body._ghtW.parentNode.removeChild(body._ghtW); if (body._ghtW.destroy) body._ghtW.destroy(); } catch (e) { /* gone */ } body._ghtW = null; }
      try { for (const g of [...(body.querySelectorAll ? body.querySelectorAll('.ght-wrap') : [])]) { if (g.parentNode) g.parentNode.removeChild(g); if (g.destroy) g.destroy(); } } catch (e) { /* none left */ }
    } catch (e) { /* the next drawing is clean */ }
  }
  if (_ght.wet) _ght.wet.clear();
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
        for (let d = 0.2; d <= 1.0; d += 0.1) { const qx = x0 + ux * d, qy = y0 + uy * d; if (_ghtDeck(qx, qy)) break; if (!_ghtWet(qx, qy) && _ght.free0(qx, qy)) { _ghtSwimOut(qx + ux * 0.15, qy + uy * 0.15); return false; } }
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
      if (!_gwFree(tgt.x, tgt.y)) { if (_ght.swim && !_ghtWet(tgt.x, tgt.y) && !_ghtDeck(tgt.x, tgt.y) && _ght.free0(tgt.x, tgt.y)) { /* a click on the bank: swim to it and climb out */ } else { const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(tgt.x, tgt.y, 1.2) : null; if (!f) return _ght.lv ? _ghtDownThen(pt, then) : false; tgt = f; } }
      _gw.path = [tgt]; _gw.then = then || null; _gw.goal = tgt; _gw.repaths = 0; _gw.blockT = 0;
      if (typeof gardenLiveWalked === 'function') try { gardenLiveWalked(tgt); } catch (e) { /* alone */ }
      if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
      return true;
    }
    return _ghtWalk0(pt, then, o);
  };
}
/* A click while you swim swims you there (or to the bank you clicked, and out on to it): never a cast, a pick or a walk to a door. While
   wading in or climbing, a click waits. (Before the world's own steps: its third, a click on the water, would cast a line.) */
if (typeof gardenWorldClick === 'function') {
  const _ghtClick0 = gardenWorldClick;
  gardenWorldClick = function (it, cell, ev, m) {   // eslint-disable-line no-func-assign
    if (typeof _gw === 'undefined' || !_gw.on || !(_ght.swim || _ght.climb)) return _ghtClick0(it, cell, ev, m);
    if (_ght.climb || !_ght.swim.on || _ght.swim.out) return true;
    const pt = (typeof _gwPointAt === 'function' && _gwPointAt(ev)) || (cell ? { x: cell.x + 0.5, y: cell.y + 0.5 } : null);
    if (!pt || !gardenWalkToPoint(pt, null, { radius: 8 })) { try { gameDeny(null, { at: ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null, say: 'You cannot swim there.' }); } catch (e) { /* fine */ } }
    return true;
  };
}
if (typeof gardenPlayWalk === 'function') {
  const _ghtPace0 = gardenPlayWalk;
  gardenPlayWalk = function () { return _ghtPace0() * (_ght.swim ? 0.55 : 1); };   // eslint-disable-line no-func-assign
}
/* ---------- the moves: the ladders' prompts, climbing, swimming ---------- */
/* Deep water that is not straight ahead to the north (a beach with the sea to the south, a river bank to the east): a swim too. The
   water's other moves (the ducks, a skim) stay where they were; only the swim is offered every way round, read from the ground. */
if (typeof _gaWaterRows === 'function') {
  const _ghtWater0 = _gaWaterRows;
  _gaWaterRows = function (px, py) {   // eslint-disable-line no-func-assign
    const rows = _ghtWater0(px, py); if (rows.length || _ghtWet(px, py)) return rows;
    try { for (const t of gardenAffordThings()) { const K = GARDEN_KINDS[t.kind]; if (K && K.calmsWater && Math.hypot(px - t.x, (py - t.y) * 1.3) < Math.max(K.calmsWater, t.w || 1)) return rows; } } catch (e) { /* none */ }
    for (const [dx, dy, deg] of [[0, 1, 90], [1, 0, 0], [-1, 0, 180]]) {
      const wx = px + dx * 1.1, wy = py + dy * 1.0;
      if (_ghtWet(wx, wy) && _ghtSwimFree(wx + dx * 0.8, wy + dy * 0.8) && _ghtSwimFree(wx + dx * 1.8, wy + dy * 1.8) && _ghtSwimFree(wx + dx * 2.8, wy + dy * 2.8))
        return [{ key: 'water:swim', act: 'swim', name: 'the water', x: wx, y: wy, stand: null, deg, lift: 0, src: 'water' }];
    }
    return rows;
  };
}
if (typeof _gaStaticRows === 'function') {
  const _ghtRows0 = _gaStaticRows;
  _gaStaticRows = function () { const rows = _ghtRows0(); if (_ght.lv) return rows; try { for (const r of _ghtRows()) rows.push(r); } catch (e) { /* no floors */ } return rows; };   // eslint-disable-line no-func-assign
}
if (typeof gartActNearby === 'function') {
  const _ghtNear0 = gartActNearby;
  gartActNearby = function () {   // eslint-disable-line no-func-assign
    if (_ght.climb || _ght.swim) return [];
    if (_ght.lv) { const px = _gw.px, py = _gw.py; return _ghtRows().filter(r => Math.hypot(r.x - px, (r.y - py) * 1.3) <= 1.1).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)); }
    return _ghtRank(_ghtNear0());
  };
}
/** On the ground: a way up is offered from in front of its foot only (not from behind the thing it climbs), and before the moves of a
 *  tree it is built in; deep water's swim comes before a nap or a tree's moves on the bank. Read from the rows, by kind, on any layout. */
function _ghtRank(rows) {
  const px = _gw.px, py = _gw.py;
  rows = rows.filter(r => r.act !== 'climbup' || !r.way || (py >= r.way.foot.y - 0.55 && Math.hypot(r.way.foot.x - px, (r.way.foot.y - py) * 1.3) <= 1.8));
  const up = rows.find(r => r.act === 'climbup');
  if (up && rows[0] !== up && rows[0].src === 'tree' && Math.hypot((rows[0].x - up.way.foot.x), (rows[0].y - up.way.foot.y)) < 3.2) { rows.splice(rows.indexOf(up), 1); rows.unshift(up); }
  if (!rows.length || rows[0].src === 'water' || up) return rows;
  if (rows[0].src !== 'tree' && rows[0].act !== 'nap' && rows[0].act !== 'lie') return rows;   // (a thing of its own right here: a bench, a pier end)
  let water = []; try { water = _gaWaterRows(px, py) || []; } catch (e) { water = []; }
  const swim = water.find(r => r.act === 'swim');
  if (swim) rows.unshift(swim);
  return rows;
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
    try { _ghtClimbTick(now); _ghtSwimTick(now); _ghtRetell(); _ghtStillThere(); _ghtRailFrame(); } catch (e) { console.error('[garden height]', e); _ght.climb = null; }
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
/** A click on the ground far from the floor you are on: down the nearest way, then on to where you clicked. */
function _ghtDownThen(pt, then) {
  const lv = _ght.lv; if (!lv || !lv.ways.length) return false;
  const w = lv.ways.slice().sort((a, b) => Math.hypot(a.top.x - _gw.px, a.top.y - _gw.py) - Math.hypot(b.top.x - _gw.px, b.top.y - _gw.py))[0];
  if (!gardenClimb(w, false)) return false;
  _ght.after = { pt: { x: pt.x, y: pt.y }, then: then || null };
  return true;
}
function gardenHeightReset() { _ght.after = null; if (_ght.climb && _ght.climb.inside) { _ghtAlpha(_gw && _gw.node, 1); _ghtDoor(_ght.climb.w, false); } _ght.lv = null; _ght.climb = null; _ght.swim = null; _ght.list = null; }
/** Where you would be on the ground: the foot of the way you went up, or the bank you swam from (the position saved, a garden left). */
function _ghtGroundPoint() {
  const lv = _ght.lv || (_ght.climb && _ght.climb.lv); if (lv && lv.ways[0]) { const f = (_ght.climb && _ght.climb.w) || lv.ways[0]; return { x: f.foot.x, y: f.foot.y + 0.06 }; }
  if (_ght.swim) return { x: _ght.swim.from.x, y: _ght.swim.from.y };
  return null;
}
/** Back on the ground at once (the garden closed, the thing you stood on gone from the layout). */
function _ghtToGround() { const g = _ghtGroundPoint(); gardenHeightReset(); try { _ghtLimbsReset(); } catch (e) { /* fine */ } if (g && typeof _gw !== 'undefined') { _gw.px = g.x; _gw.py = g.y; _gw.path = []; if (typeof _GPL !== 'undefined') { _GPL.lastX = g.x; _GPL.lastY = g.y; } } }
if (typeof gardenWorldStop === 'function') {
  const _ghtStop0 = gardenWorldStop;
  gardenWorldStop = function (keepOn) { if (!keepOn && (_ght.lv || _ght.climb || _ght.swim)) { try { _ghtToGround(); } catch (e) { gardenHeightReset(); } } return _ghtStop0(keepOn); };   // eslint-disable-line no-func-assign
}
if (typeof _gwSaveSoon === 'function') {   // (the place kept for next time is on the ground, never up on a floor or in the water)
  const _ghtSave0 = _gwSaveSoon;
  _gwSaveSoon = function () {   // eslint-disable-line no-func-assign
    const g = (_ght.lv || _ght.climb || _ght.swim) ? _ghtGroundPoint() : null; if (!g) return _ghtSave0();
    const x = _gw.px, y = _gw.py; _gw.px = g.x; _gw.py = g.y; try { return _ghtSave0(); } finally { _gw.px = x; _gw.py = y; }
  };
}
/** Up on a floor of something no longer drawn here (a layout changed, a visit began): down at its foot. Checked once a second. */
function _ghtStillThere() {
  const now = performance.now(); if (!_ght.lv || now - (_ght.thereT || 0) < 1000) return; _ght.thereT = now;
  const key = _ght.lv.key, lv = gardenLevels().find(l => l.key === key);
  if (!lv) _ghtToGround(); else if (lv !== _ght.lv) _ght.lv = lv;   // (the list made again: the same floor, its new record)
}
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
/** Where you are, told again: someone new here (or back after a drop, or whose copy of you missed the climb) sees you up on your floor
 *  or out in the water at once, not climbing again. A small message when the people here change (1.5 s and 5 s later: their world may
 *  still be drawing the thing you are on) and every 6 s while you are up there; each is the same state, so one more changes nothing. */
function _ghtRetell() {
  if (typeof _gll === 'undefined' || !_gll.actors) return;
  const now = performance.now(), sig = [..._gll.actors.keys()].join(',');
  if (sig !== _ght.seen) { const added = sig.split(',').some(k => k && !_ght.seen.split(',').includes(k)); _ght.seen = sig; if (added) _ght.tellAt = [now + 1500, now + 5000]; }
  if (!_gll.actors.size) return;
  const up = _ght.lv && !_ght.climb, wet = _ght.swim && _ght.swim.on && !_ght.swim.out;
  if (!up && !wet) { _ght.tellAt = null; return; }
  const due = (_ght.tellAt && _ght.tellAt.length && now >= _ght.tellAt[0]) || now - (_ght.toldT || 0) > 6000;
  if (!due) return;
  if (_ght.tellAt && _ght.tellAt.length && now >= _ght.tellAt[0]) _ght.tellAt.shift();
  _ght.toldT = now;
  if (up) { const w = _ght.lv.ways[0]; if (w) _gaTell('onlevel', w.foot.x, w.foot.y); }
  else _gaTell('inwater', _gw.px, _gw.py);
}
/** Their copy of someone told where they are (onlevel, inwater): put there at once, no walk over first, no climb. A floor this world has
 *  not drawn yet is tried again for a while (a visit just begun). */
function _ghtRemoteState(A, ev) {
  const id = String(ev.e).slice(4), now = performance.now();
  if (id === 'onlevel') {
    if (A.ghtClimb) return;   // (a climb already on its way up)
    const w = _ghtWayNear(ev.x, ev.y, true, 1.6);
    if (!w) { A.ghtPend = { ev: { e: ev.e, x: ev.x, y: ev.y }, until: (A.ghtPend && A.ghtPend.until) || now + 25000, t: now }; return; }
    A.ghtPend = null;
    if (A.hLv === w.lv.key) return;
    if (A.ghtSwim || A.swimming) _ghtRemote(A, 'swimout');
    if (A.ghtH) { try { A.ghtH.stop(); } catch (e) { /* gone */ } A.ghtH = null; }
    if (!gardenLevelHas(w.lv, A.x, A.y)) { A.x = w.top.x; A.y = w.top.y; }
    A.tx = null; A.ty = null; A.way = null; A.then = null;
    A.hLv = w.lv.key; A.hLift = w.lv.h; A.actLift = 0; A.hZ = (gardenLevelDepth(w.lv, A.x, A.y) - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH;
    A.dir = 's'; A.pose = ''; A.key = ''; if (typeof _gllPaint === 'function') _gllPaint(A);
    { const sh = A.root && A.root.querySelector('.gll-shadow'); if (sh) sh.setAttribute('opacity', '1'); }
    if (w.lv.L.sit && typeof gartActRemote === 'function') setTimeout(() => { if (A.hLv === w.lv.key) gartActRemote(A, w.lv.L.sit); }, 60);
    return;
  }
  if (id === 'inwater') {
    if (A.swimming && A.ghtSwim) return;
    if (!_ghtWet(ev.x, ev.y)) return;
    if (A.hLv) { A.hLv = null; A.hLift = 0; A.hZ = null; }
    A.x = ev.x; A.y = ev.y; A.tx = null; A.ty = null; A.then = null;
    A.ghtSwim = { t0: now - 2000, from: { x: ev.x, y: ev.y }, to: { x: ev.x, y: ev.y }, on: true }; A.swimming = true; A.key = '';
    if (typeof _gllPaint === 'function') _gllPaint(A);
  }
}
if (typeof _gllEmoteAt === 'function') {
  const _ghtEmAt0 = _gllEmoteAt;
  _gllEmoteAt = function (A, ev) {   // eslint-disable-line no-func-assign
    if (A && ev && (ev.e === GA_WIRE + 'onlevel' || ev.e === GA_WIRE + 'inwater')) { if (Number.isFinite(ev.x) && Number.isFinite(ev.y)) _ghtRemoteState(A, ev); return; }
    if (A && ev && ev.e === GA_WIRE + 'climbup' && A.ghtPend) A.ghtPend = null;
    return _ghtEmAt0(A, ev);
  };
}
/** Their copy of someone: climb a way, swim, climb out. Returns true when it was one of these. */
function _ghtRemote(A, id) {
  const W = GARDEN_WORLD;
  if (id === 'climbup' || id === 'climbdown') {
    const up = id === 'climbup', w = _ghtWayNear(A.x, A.y, up, 1.6); if (!w) return true;
    if (A.ghtH) { try { A.ghtH.stop(); } catch (e) { /* gone */ } A.ghtH = null; }
    if (up) { A.x = w.foot.x; A.y = w.foot.y; A.hLv = null; A.hZ = null; } else {   // (up from the ground, whatever this copy thought before)
      A.x = w.foot.x; A.y = w.foot.y; A.hLv = null; A.hLift = 0; A.hZ = null; }
    A.tx = null; A.ty = null; A.way = null;
    A.dir = 'n'; A.pose = ''; A.key = ''; if (typeof _gllPaint === 'function') _gllPaint(A);
    A.ghtClimb = { w, up, t0: performance.now(), ms: w.inside ? _ghtStairMs(w.lv.h) : _ghtClimbMs(w.lv.h) };
    const gpl = !w.inside && A.root && A.root.querySelector('.gpl'); if (gpl) A.ghtH = gartActPlay(gpl, 'climbing', { motion: typeof _gllReduced === 'function' ? !_gllReduced() : true });
    if (w.inside) { A.dir = up ? 'n' : 's'; if (!up) { A.x = w.top.x; A.y = w.top.y; } }
    A.actLift = 0; A.hLift = up ? 0 : w.lv.h;   // (the whole figure rises, its name with it: the sprite's own lift)
    return true;
  }
  if (id === 'swim') { A.ghtSwim = { t0: performance.now(), from: { x: A.x, y: A.y }, to: null, on: false }; const W2 = _ghtSwimFree(A.x, A.y) ? { x: A.x, y: A.y } : _ghtSwimTo(A.x, A.y); A.ghtSwim.to = W2 || { x: A.x, y: A.y - 1 }; /* (already out in the water: they swim on from there) */ A.swimming = true; A.key = ''; return true; }
  if (id === 'swimout') { { const sh = A.root && A.root.querySelector('.gll-shadow'); if (sh) sh.setAttribute('opacity', '1'); } A.swimming = false; A.ghtSwim = null; if (A.ghtSH) { try { A.ghtSH.stop(); } catch (e) { /* gone */ } A.ghtSH = null; } A.key = ''; return true; }
  void W; return false;
}
function _ghtSwimTo(x, y) {
  for (const [dx, dy] of [[0, -1], [0.7, -0.7], [-0.7, -0.7], [1, 0], [-1, 0], [0, 1]]) for (let d = 0.6; d <= 2.6; d += 0.2) { const qx = x + dx * d, qy = y + dy * d; if (_ghtSwimFree(qx, qy) && _ghtSwimFree(qx + dx * 0.6, qy + dy * 0.6) && _ghtWadeClear({ x, y }, { x: qx + dx * 0.25, y: qy + dy * 0.25 })) return { x: qx + dx * 0.25, y: qy + dy * 0.25 }; }
  return null;
}
/** Each step of their copy: the climb's rise, the floor's height and depth, the swim's wade in and its strokes. */
function _ghtRemoteStep(A) {
  const now = performance.now(), C = A.ghtClimb;
  if (C && C.w.inside) {   // their stair: in at the door, out of sight, up out of the stair head (as yours: _ghtStairTick)
    const k = Math.min(1, (now - C.t0) / C.ms), kIn = C.up ? k : 1 - k, w = C.w, H = _ghtH(), W = GARDEN_WORLD, q0 = (q) => q * q * (3 - 2 * q);
    let a = 1;
    if (kIn < 0.28) { const q = q0(Math.min(1, kIn / 0.24)); A.x = w.foot.x; A.y = w.foot.y - 0.42 * H / W.cellH * q; A.hLift = 0; A.hZ = null; a = 1 - q; }
    else if (kIn < 0.72) { a = 0; A.hLift = 0; }
    else { const q = q0(Math.min(1, (kIn - 0.72) / 0.22)); A.x = w.top.x; A.y = w.top.y; A.hLift = w.lv.h - 1.15 * H * (1 - q); A.hZ = ((q < 0.999 ? w.lv.depth0 - 1 : gardenLevelDepth(w.lv, A.x, A.y)) - W.sky) / W.cellH; a = q > 0 ? 1 : 0; }
    A.tx = null; A.ty = null; _ghtAlpha(A.root, a); _ghtDoor(w, kIn < 0.33 && k < 1, A.w);
    if (k >= 1) {
      A.ghtClimb = null; _ghtAlpha(A.root, 1); _ghtDoor(w, false, A.w);
      if (C.up) { A.hLv = w.lv.key; A.x = w.top.x; A.y = w.top.y; A.hLift = w.lv.h; } else { A.hLv = null; A.hLift = 0; A.hZ = null; A.x = w.foot.x; A.y = w.foot.y + 0.06; }
      A.dir = 's'; A.key = '';
    }
    return;
  }
  if (C) {
    const k = Math.min(1, (now - C.t0) / C.ms);
    A.actLift = 0; A.hLift = _ghtLadderTop(C.w) * (C.up ? k : 1 - k);
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
    if (A && A.ghtPend) { const P = A.ghtPend, now = performance.now(); if (now > P.until) A.ghtPend = null; else if (now - P.t > 600) { P.t = now; _ght.list = null; _ghtRemoteState(A, P.ev); } }   // (their floor not drawn here yet: tried again)
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
    if (r && r.act === 'climbup' && r.way) return (r.way.by === 'stair' ? 'Go up to ' : 'Climb up to ') + r.way.lv.name;
    if (r && r.act === 'climbdown') return r.way && r.way.by === 'stair' ? 'Go down the stair' : 'Climb down';
    return _ghtWords0(r);
  };
}
/** A loft's landing as the world draws it with its ladder (px from the ladder's foot): boards from the wall to the rail, the rail's
 *  posts and top bar from the level's own rail numbers, so the piece drawn again over your legs (_ghtRailOn) lies on it exactly. */
function _ghtDeckArt(lv, w) {
  const L = lv.L, R = L.rail, Sh = L.shape && L.shape.rect, Wd = (L.ways || [])[w.i]; if (!R || !R.line || !Sh || !Wd) return null;
  const H = _ghtH(), ax = (L.at[0] - Wd.foot[0]) * H, ay = (L.at[1] - Wd.foot[1]) * H - lv.h;
  const X = (u) => ax + u * H, Y = (v) => ay + v * H, posts = [];
  for (let u = R.post0 || 0; u <= R.line[1] + 1e-6; u += R.post || 0.11) if (u >= R.line[0] - 1e-6 && !(R.gap && u > R.gap[0] && u < R.gap[1])) posts.push(X(u));
  return { x0: X(R.line[0]), x1: X(R.line[1]), yb: Y(Sh[1] - 0.05), yf: Y(R.line[2]), rh: (R.h || 0.36) * H, g0: X(R.gap ? R.gap[0] : 0), g1: X(R.gap ? R.gap[1] : 0), posts, col: R.color || '#2a2e30', w: R.railW || 1.3, pw: R.postW || 0.9 };
}
/** The parts a floor's ways draw on the thing (a ladder the painter does not draw itself): rows for the world (94-garden-zz-7act-2world.js). */
function gardenLevelWayParts(t) {
  const out = [], H = _ghtH(), S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592;
  for (const lv of gardenLevels()) { if (lv.id !== t.id) continue; for (const w of lv.ways) if (w.art) out.push({ id: 'part-' + t.id + '-lv' + lv.li + 'w' + w.i, owner: t.id, kind: t.kind, art: w.art, x: w.foot.x, y: w.foot.y, row: { top: lv.h / S, loft: w.loft, bare: !w.loft, deck: w.loft ? _ghtDeckArt(lv, w) : null } }); }
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
function _ghtRailFrame() {
  const C = _ght.climb, node = _gw && _gw.node;
  if (C && C.inside && C.atTop && !C.behind) _ghtRailOn(_ght, node, C.lv, _gw.px, _gw.py, C.lift || 0);
  else _ghtRailOn(_ght, node, C ? null : _ght.lv, _gw.px, _gw.py, _ght.lv ? _ght.lv.h : 0);
}
/** A friend's copy up on a floor: the same rail over its legs (called by its sprite each step, 94-garden-live-1core.js). */
function gardenHeightRail(A, node) {
  if (!A || !node || (!A.hLv && !A.railG && !A.ghtClimb)) return;
  const C = A.ghtClimb, up = C && C.w.inside && A.hLift >= C.w.lv.h - 0.5 ? C.w.lv : null, lv = up || (A.hLv && !C ? _ghtLevelByKey(A.hLv) : null);
  _ghtRailOn(A, node, lv, A.x, A.y, up ? A.hLift : lv ? lv.h : 0);
}
/** A floor's `front`: the piece of the thing's own picture that stands in front of the floor (battlements, a parapet), in H from the
 *  painter's foot, drawn again over the figure within win px either side of it (clipped to that strip, so nothing else is covered). */
function _ghtFrontSvg(F, lv, px, py, win, lift) {
  const W = GARDEN_WORLD, H = _ghtH(), N = (k) => Math.round(k * 10) / 10;
  const X = (p) => lv.fx + p[0] * H - px * W.cellW, Y = (p) => lv.py0 + p[1] * H - (W.sky + py * W.cellH) + (Number.isFinite(lift) ? lift : lv.h);
  let pts = F.poly.map(p => [X(p), Y(p)]);
  const clip = (P, x, keepLeft) => { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ia = keepLeft ? a[0] <= x : a[0] >= x, ib = keepLeft ? b[0] <= x : b[0] >= x; if (ia) out.push(a); if (ia !== ib) { const t = (x - a[0]) / (b[0] - a[0]); out.push([x, a[1] + (b[1] - a[1]) * t]); } } return out; };
  pts = clip(clip(pts, -win, false), win, true);
  // only over the figure itself (from its feet up to its waist): the rest of the crest is the thing's own picture, as drawn
  const clipY = (P, y, keepAbove) => { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ia = keepAbove ? a[1] <= y : a[1] >= y, ib = keepAbove ? b[1] <= y : b[1] >= y; if (ia) out.push(a); if (ia !== ib) { const t = (y - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, y]); } } return out; };
  if (pts.length >= 3) pts = clipY(clipY(pts, 0.5, true), -0.72 * H, false);
  if (pts.length < 3) return '';
  let out = `<path d="M${pts.map(p => N(p[0]) + ' ' + N(p[1])).join('L')}Z" fill="${F.fill || '#a39d8b'}"/>`;

  if (F.line) {   // its lit top edge, the poly's first lineTo points
    const L = F.poly.slice(0, (F.lineTo || F.poly.length) + 1).map(p => [X(p), Y(p)]); let d = '';
    for (let i = 0; i + 1 < L.length; i++) { let [a, b] = [L[i], L[i + 1]]; if (a[0] > b[0]) [a, b] = [b, a]; if (b[0] < -win || a[0] > win) continue; const cl = (q, x) => { const t = (x - q[0][0]) / ((q[1][0] - q[0][0]) || 1); return [x, q[0][1] + (q[1][1] - q[0][1]) * t]; }; const A2 = a[0] < -win ? cl([a, b], -win) : a, B2 = b[0] > win ? cl([a, b], win) : b; if (Math.max(A2[1], B2[1]) < -0.72 * H || Math.min(A2[1], B2[1]) > 0.5) continue; d += `M${N(A2[0])} ${N(A2[1])}L${N(B2[0])} ${N(B2[1])}`; }
    if (d) out += `<path d="${d}" stroke="${F.line}" stroke-width="1.6" fill="none" opacity="0.8"/>`;
  }
  return out;
}
function _ghtRailOn(K, node, lv, px, py, lift) {
  const R = lv && lv.L.rail, F = lv && lv.L.front;
  const W = GARDEN_WORLD, H = _ghtH(), C = lv && lv.L.core;
  const u = lv ? (px * W.cellW - lv.cx) / H : 0, v = lv ? (W.sky + py * W.cellH - lv.cy) / H : 0;
  const show = !!((R || F) && node && !(C && v < C[1] && Math.abs(u) < C[0]));
  if (!Number.isFinite(lift)) lift = lv ? lv.h : 0;
  const key = show ? lv.key + '|' + Math.round(u * 400) + ',' + Math.round(v * 400) + '|' + Math.round(lift) : '';
  if (key === K.railKey && (!show || (K.railG && K.railG.parentNode === node))) return;
  K.railKey = key;
  if (!show) { if (K.railG) K.railG.setAttribute('opacity', '0'); return; }
  if (!K.railG || K.railG.parentNode !== node) { try { if (K.railG && K.railG.parentNode) K.railG.parentNode.removeChild(K.railG); } catch (e) { /* gone */ } const g = typeof gardenSceneElement === 'function' && typeof gardenVisualIsNative === 'function' && gardenVisualIsNative(node) ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ght-rail'); node.appendChild(g); K.railG = g; }
  if (!R) { const svg = _ghtFrontSvg(F, lv, px, py, 13, lift); K.railG.innerHTML = svg; K.railG.setAttribute('opacity', svg ? '1' : '0'); return; }
  const ox = -u * H, oy = -v * H + (lift - lv.h) + (R.own ? 0 : (lv.py0 - lv.fy) || 0), hh = (R.h || 0.36) * H, col = R.color || '#2a2e30', win = 13, N = (k) => Math.round(k * 10) / 10;
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
