/* ============================================================
   THE GARDENER'S MOVES (round 3, "player" branch). The owner: "The player should have way more animations, turning circles etc."
   Everything here runs once a frame from the native walker (94-garden-native-world.js drawPlayer) and touches only the figure's
   own named limbs (94-garden-art-g-player.js draws them: gpl-root, gpl-up, gpl-hd, gpl-lg/gpl-lf legs, gpl-as/gpl-af arms).

   TURNING. The figure keeps a heading (degrees on the screen: 0 east, 90 south, 180 west, -90 north) that swings towards the way
   it is going at GPL_MOVE.turnRate, so a change of direction passes through the in-between drawings (east -> south -> west when you
   turn back, not a mirror snap), and the drawing is narrowed as it turns (foreshortened), so the turn reads as a turn.
   STRIDE. While walking the legs are driven from a phase that advances with the distance actually covered, not a clock: each foot
   is planted for the stance part of its cycle and moves backwards under the hip exactly as fast as the ground goes by (side on),
   so feet never slide. The body dips as the legs open (the hip follows the planted leg), the arms swing against the legs, the body
   leans into the pace (more for a run, more uphill on the fells, a shorter higher step on the stairs).
   EASING. The walker already eases speed up and down (GW_ACC); the stride follows the speed, so the first and last steps are short.
   RUN: hold Shift. CREEP (was Shift): hold Z. HOP: Space while you are walking.
   Reduced motion: no gait, no hop, no turning sweep (the drawing turns at once), as before.
   ============================================================ */
const GPL_MOVE = Object.freeze({
  turnRate: 560,          // degrees a second the heading swings
  // per gait: stride as a share of the leg's length, the planted share of a leg's cycle, arm swing (deg), lean (deg), bob (px)
  walk: Object.freeze({ stride: 1.38, stance: 0.58, arm: 24, lean: 3, lift: 0.16, knee: 42 }),
  run: Object.freeze({ stride: 1.5, stance: 0.36, arm: 52, lean: 9, lift: 0.3, flight: 2.6, knee: 88 }),
  creep: Object.freeze({ stride: 0.8, stance: 0.66, arm: 8, lean: 10, lift: 0.1, crouch: 0.9, knee: 30 }),
  stairs: Object.freeze({ stride: 1.0, stance: 0.6, arm: 18, lean: 5, lift: 0.34, knee: 60 }),
  hop: Object.freeze({ ms: 380, high: 15 }),
});
const _gmv = { h: 90, want: 90, last: 0, phase: 0, limbs: new WeakMap(), hop: 0, hopT: 0, gait: 'walk', sx: 1, stairs: null, stairT: 0, uphill: 0, dir: 's', face: 1, steer: null };
function _gmvMotion() { try { return typeof _gartMotionOk === 'function' ? _gartMotionOk() : gardenMotionOn(); } catch (e) { return true; } }
function _gmvWrap(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }
/** The drawing for a heading, and how wide it is drawn (foreshortened while it turns). */
function _gmvDrawing(h) {
  const a = _gmvWrap(h), c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
  if (Math.abs(a) < 52 || Math.abs(a) > 128) return { dir: 'e', mirror: c < 0 ? -1 : 1, sx: 0.8 + 0.2 * Math.abs(c) };
  return { dir: s > 0 ? 's' : 'n', mirror: 1, sx: 0.9 + 0.1 * Math.abs(s) };
}
/** Steer (keys only): the way you walk swings round too, so a reversal is a small arc, never a jump. ux, uy: unit vector wanted. */
function gartMoveSteer(ux, uy, dt) {
  if (!_gmvMotion()) { _gmv.steer = null; return [ux, uy]; }
  const want = Math.atan2(uy, ux);
  if (!_gmv.steer || _gmv.steerT < performance.now() - 250) { _gmv.steer = want; _gmv.steerT = performance.now(); return [ux, uy]; }
  _gmv.steerT = performance.now();
  let d = want - _gmv.steer; d = Math.atan2(Math.sin(d), Math.cos(d));
  const step = 13 * dt;   // radians a second: a quarter turn in about 0.12 s, a reversal in 0.24 s
  _gmv.steer += Math.abs(d) <= step ? d : Math.sign(d) * step;
  return [Math.cos(_gmv.steer), Math.sin(_gmv.steer)];
}
/** Once a walker frame (from gartPlayerStep): where am I heading, which drawing does that need. Returns true when the drawing changed. */
function gartMoveStep(gw) {
  const now = performance.now(), dt = Math.min(0.1, _gmv.last ? (now - _gmv.last) / 1000 : 0); _gmv.last = now;
  const x = gw.px, y = gw.py;
  if (_GPL.lastX == null) { _GPL.lastX = x; _GPL.lastY = y; }
  const dx = x - _GPL.lastX, dy = (y - _GPL.lastY) * 1.6;
  if (Math.abs(dx) + Math.abs(dy) >= 0.02) {
    _GPL.lastX = x; _GPL.lastY = y;
    _gmv.want = Math.atan2(dy, dx) * 180 / Math.PI;
    // stepping round a corner (a door jamb, a post, a trunk) while you hold one way: you sidestep it still facing the way you press, as a
    // person does, not turned side on for the few frames of the step (walking up to the mill door you turned east and slid; round 2)
    if (gw.keys && gw.keys.size && !(gw.path && gw.path.length) && !gw.boat) {
      const kx = (gw.keys.has('right') ? 1 : 0) - (gw.keys.has('left') ? 1 : 0), ky = (gw.keys.has('down') ? 1 : 0) - (gw.keys.has('up') ? 1 : 0);
      if (kx || ky) { const kw = Math.atan2(ky * 1.6, kx) * 180 / Math.PI; if (Math.abs(_gmvWrap(_gmv.want - kw)) > 55) _gmv.want = kw; }
    }
    if (typeof gartEmoteMoved === 'function') gartEmoteMoved();
    if (typeof gartActMoved === 'function') gartActMoved();
  } else if (!gw.moving && gw.keys && gw.keys.size && !(gw.path && gw.path.length) && !(gw.fishing && gw.fishing.state && gw.fishing.state !== 'idle') && !gw.boat && !(typeof _ga !== 'undefined' && _ga.cur && _ga.cur.doing)) {
    // pressing a way you cannot go (a wall, a bank, a fence): you face the way you press, not the way a last little nudge took you
    // (stopped at the brook on the way to the mill, holding right, you turned round to face the camera)
    const kx = (gw.keys.has('right') ? 1 : 0) - (gw.keys.has('left') ? 1 : 0), ky = (gw.keys.has('down') ? 1 : 0) - (gw.keys.has('up') ? 1 : 0);
    if (kx || ky) _gmv.want = Math.atan2(ky * 1.6, kx) * 180 / Math.PI;
  }
  if (_gmv.faceTo != null) { _gmv.want = _gmv.faceTo; _gmv.faceTo = null; }
  let d = _gmvWrap(_gmv.want - _gmv.h);
  if (!_gmvMotion()) _gmv.h = _gmv.want;
  else {
    // a reversal from side on turns through facing you (south), the way a person turns to the camera, not away from it
    if (Math.abs(Math.abs(d) - 180) < 8) { const a = _gmvWrap(_gmv.h); d = (a > -90 && a < 90) ? 179 : -179; if (Math.abs(a + 90) < 30 || Math.abs(a - 90) < 30) d = 180 * Math.sign(d); }
    const step = GPL_MOVE.turnRate * dt; _gmv.h += Math.abs(d) <= step ? d : Math.sign(d) * step;
  }
  const D = _gmvDrawing(_gmv.h);
  _gmv.sx = D.sx; _gmv.mirror = D.mirror;
  const turned = D.dir !== _GPL.dir || (D.dir === 'e' && D.mirror !== _gmv.face);
  _gmv.face = D.mirror;
  if (turned) { _GPL.dir = D.dir; return true; }
  return false;
}
/** Turn to look at a point (an action's facing), through the in-between drawings. deg: heading, or {x, y} in cells. */
function gartMoveFace(to) {
  if (to == null) return;
  if (typeof to === 'number') { _gmv.want = to; return; }
  if (typeof _gw === 'undefined') return;
  const dx = to.x - _gw.px, dy = (to.y - _gw.py) * 1.6;
  if (Math.abs(dx) + Math.abs(dy) < 0.01) return;
  _gmv.want = Math.atan2(dy, dx) * 180 / Math.PI;
}
function gartMoveFacingDeg() { return _gmv.h; }
/** Which way the drawing is mirrored (side on): 1 east, -1 west. */
function gartMoveMirror() { return _gmv.mirror || 1; }
/** Hop: a little jump while walking. */
function gartMoveHop() {
  if (!_gmvMotion() || _gmv.hop > 0) return false;
  _gmv.hop = GPL_MOVE.hop.ms / 1000; _gmv.hopT = 0;
  try { if (typeof gardenSfx === 'function') gardenSfx('hop'); } catch (e) { /* no sound */ }
  return true;
}
/** The named limbs of a drawn body, found once per body, with the pivot each turns about (from its own transform-origin). */
function _gmvLimbs(body) {
  let L = _gmv.limbs.get(body); if (L) return L;
  const pick = (sel) => { const el = body.querySelector(sel); if (!el) return null; const m = /transform-origin:\s*(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(el.getAttribute('style') || ''); return { el, ox: m ? Number(m[1]) : 0, oy: m ? Number(m[2]) : 0, tf: '' }; };
  const native = typeof gardenVisualIsNative === 'function' && gardenVisualIsNative(body);
  L = { native, root: pick('.gpl-root'), up: pick('.gpl-up'), heads: [...body.querySelectorAll('.gpl-hd')].map(el => ({ el, ox: 0, oy: 0, tf: '' })),
    side: !!body.querySelector('.gpl-lg'),
    legA: pick('.gpl-lg.gpl-a') || pick('.gpl-lf.gpl-a'), legB: pick('.gpl-lg.gpl-b') || pick('.gpl-lf.gpl-b'),
    armA: pick('.gpl-as.gpl-a') || pick('.gpl-af.gpl-b'), armB: pick('.gpl-as.gpl-b') || pick('.gpl-af.is-r'),
    kneeA: pick('.gpl-kn.is-a'), kneeB: pick('.gpl-kn.is-b') };
  _gmv.limbs.set(body, L);
  return L;
}
const _gmvN = (v) => (Math.round(v * 100) / 100);
function _gmvSet(p, rot, sy, ty, native) {
  if (!p) return;
  let tf = '';
  if (ty) tf += `translate(0 ${_gmvN(ty)}) `;
  if (rot) tf += native ? `rotate(${_gmvN(rot)} ${p.ox} ${p.oy}) ` : `rotate(${_gmvN(rot)}) `;
  if (sy != null && Math.abs(sy - 1) > 0.002) tf += native ? `translate(${p.ox} ${p.oy}) scale(1 ${_gmvN(sy)}) translate(${-p.ox} ${-p.oy})` : `scale(1 ${_gmvN(sy)})`;
  tf = tf.trim();
  if (tf === p.tf) return;
  p.tf = tf;
  if (tf) p.el.setAttribute('transform', tf); else p.el.removeAttribute('transform');
}
/** Is the gardener on a stair (a route made of steps)? Read from the layout's own routes, cached. */
function _gmvStairAt(x, y) {
  if (!_gmv.stairs) {
    _gmv.stairs = [];
    try { for (const r of (gardenIslandData().routes || [])) if (/stair|steps/.test(r.id) && Array.isArray(r.points)) _gmv.stairs.push({ pts: r.points, w: (r.widthCells || 1.5) / 2 + 0.3 }); } catch (e) { /* no island */ }
  }
  for (const s of _gmv.stairs) for (let i = 1; i < s.pts.length; i++) {
    const [ax, ay] = s.pts[i - 1], [bx, by] = s.pts[i], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)), qx = ax + vx * t - x, qy = ay + vy * t - y;
    if (qx * qx + qy * qy < s.w * s.w) return true;
  }
  return false;
}
/** Uphill? Read from the ground itself (gardenTerrainUp: the layout's landforms and cells, any region): 1 climbing, -1 going down, 0 flat. */
function _gmvUphill(x, y, uy, ux) {
  try { const up = typeof gardenTerrainUp === 'function' ? gardenTerrainUp(x, y) : null; if (up) { const d = (ux || 0) * up.x + uy * up.y; return d > 0.3 ? 1 : d < -0.3 ? -1 : 0; } } catch (e) { /* no ground */ }
  return 0;
}
/**
 * Once a frame, after the walker has placed the figure: the turn's foreshortening, the hop, and (walking) the stride.
 * inner: the .gd-pl-in node (scaled), bob: .gd-pl-bob, gw: the walker. Returns nothing; touches transforms only.
 */
function gartMoveFrame(inner, bob, gw, time) {
  if (!inner) return;
  const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.74, motion = _gmvMotion();
  const now = performance.now(), dt = Math.min(0.1, _gmv.fl ? (now - _gmv.fl) / 1000 : 0); _gmv.fl = now;
  const body = inner._nativePlayerCurrent && inner._nativePlayerCurrent.node || inner.firstChild;
  const fishing = gw.fishing && gw.fishing.state !== 'idle';
  const acting = typeof gartActBusy === 'function' && gartActBusy();
  // the drawing, narrowed as it turns, mirrored for the west (fishing keeps the game's own facing)
  const front = typeof GPL_POSE_FRONT !== 'undefined' && _GPL.pose && GPL_POSE_FRONT.has(_GPL.pose);
  const mirror = fishing ? (gw.face < 0 ? -1 : 1) : _GPL.dir === 'e' ? _gmv.mirror || 1 : 1;
  const sx = fishing || front || acting ? 1 : _gmv.sx || 1;
  const crouch = gw.moving && gw.sneak ? GPL_MOVE.creep.crouch : 1;
  const tf = `scale(${_gmvN(mirror * S * sx)} ${_gmvN(S * crouch)})`;
  if (inner.getAttribute('transform') !== tf) inner.setAttribute('transform', tf);
  // the hop
  let hopY = 0;
  if (_gmv.hop > 0) {
    _gmv.hopT += dt; const T = GPL_MOVE.hop.ms / 1000, p = Math.min(1, _gmv.hopT / T);
    hopY = -GPL_MOVE.hop.high * Math.sin(Math.PI * p);
    if (p >= 1) { _gmv.hop = 0; try { if (window.GardenNativeActions) GardenNativeActions.effect('lift', gw.px * GARDEN_WORLD.cellW, GARDEN_WORLD.sky + gw.py * GARDEN_WORLD.cellH, { width: 20 }); } catch (e) { /* only dust */ } }
  }
  const lift = typeof gartActLift === 'function' ? gartActLift() : 0;
  if (bob && (hopY || lift || _gmv.hopWas)) { bob.setAttribute('transform', `translate(0 ${_gmvN(hopY - lift)})`); _gmv.hopWas = !!(hopY || lift); }
  if (typeof gartActFrame === 'function') gartActFrame();
  if (body && gw.boat && !acting) { _gmvRow(body, gw, motion); return; }   // (16) in the boat: seated at the oars, pulling as it moves
  if (body && typeof _ga !== 'undefined' && _ga.carry && !acting && !(_GPL.pose === 'stride' || (inner._gplKey || '').startsWith('stride'))) gartActCarryFrame(body, _gmvLimbs(body));
  if (acting || !body || !motion || _GPL.pose !== 'stride' && !(inner._gplKey || '').startsWith('stride')) { _gmv.lpx = _gmv.lpy = null; return; }
  const L = _gmvLimbs(body); if (!L.legA || !L.legB) return;
  // the gait: run, creep, stairs or walk; the stride follows the ground actually covered
  const v = gw.moving ? Math.max(0, gw.spd || 0) : 0;
  if (now - (_gmv.stairT || 0) > 200) { _gmv.stairT = now; _gmv.onStairs = _gmvStairAt(gw.px, gw.py); const a = (_gmv.h || 0) * Math.PI / 180; _gmv.uphill = _gmvUphill(gw.px, gw.py, Math.sin(a), Math.cos(a)); }
  const G = gw.sneak ? GPL_MOVE.creep : _gmv.onStairs ? GPL_MOVE.stairs : v > 205 ? GPL_MOVE.run : GPL_MOVE.walk;
  const legLen = Math.max(8, Math.abs(L.legA.oy) * S);   // the hip's height in world px
  const stride = G.stride * legLen;
  // the ground actually covered this frame (not the speed asked for: a wall, a slide along it, a diagonal), along the way the drawing faces
  const side = L.side, native = L.native, Wd = GARDEN_WORLD;
  const ddx = _gmv.lpx == null ? 0 : (gw.px - _gmv.lpx) * Wd.cellW, ddy = _gmv.lpy == null ? 0 : (gw.py - _gmv.lpy) * Wd.cellH; _gmv.lpx = gw.px; _gmv.lpy = gw.py;
  const covered = Math.min(40, side ? Math.abs(ddx) : Math.hypot(ddx, ddy));
  _gmv.phase = (_gmv.phase + (gw.moving ? covered : 0) * G.stance / stride) % 1;
  const leg = (p) => {   // -> [angle (deg), knee (scaleY), planted]
    if (p < G.stance) { const x = stride / 2 - stride * (p / G.stance); return [Math.asin(Math.max(-0.98, Math.min(0.98, x / legLen))) * 180 / Math.PI, 1, x]; }
    const q = (p - G.stance) / (1 - G.stance), e = q * q * (3 - 2 * q), x = -stride / 2 + stride * e;
    const k = L.kneeA ? 0.35 : 1;   // with a knee the shin folds back instead (the leg is not squashed as much)
    return [Math.asin(Math.max(-0.98, Math.min(0.98, x / legLen))) * 180 / Math.PI, 1 - G.lift * k * Math.sin(Math.PI * q), null, G.knee * Math.sin(Math.PI * Math.pow(q, 0.8))];
  };
  const pa = _gmv.phase, pb = (pa + 0.5) % 1, A = leg(pa), B = leg(pb);
  // the hip rides the planted leg (lower as the legs open); a run has a little flight between steps
  const planted = A[2] != null ? A : B[2] != null ? B : null;
  let hip = planted ? legLen * (1 - Math.cos(planted[0] * Math.PI / 180)) / S : 0;
  if (!planted && G.flight) hip = -G.flight;
  if (_gmv.onStairs) hip += -Math.abs(Math.sin(pa * Math.PI * 2)) * 1.6;
  const lean = (G.lean + (_gmv.uphill > 0 ? 6 : _gmv.uphill < 0 ? -3 : 0)) * Math.min(1, v / 120);
  // where the planted foot is on the ground (world px), for checks: it should not move while planted
  { const wx = gw.px * GARDEN_WORLD.cellW, m = _gmv.mirror || 1; _gmv.feet = [A[2] != null ? wx + m * A[2] : null, B[2] != null ? wx + m * B[2] : null]; }
  if (side) {
    // side on (drawn facing east; the mirror flips it): legs turn about the hip, forward is +x, so a positive turn swings the foot back
    _gmvSet(L.legA, -A[0], A[1], 0, native); _gmvSet(L.legB, -B[0], B[1], 0, native);
    _gmvSet(L.kneeA, A[3] || 0, null, 0, native); _gmvSet(L.kneeB, B[3] || 0, null, 0, native);   // the swinging shin folds back at the knee
    _gmvSet(L.armA, A[0] / 40 * G.arm, null, 0, native); _gmvSet(L.armB, B[0] / 40 * G.arm, null, 0, native);
    _gmvSet(L.up, lean, null, 0, native);
  } else {
    // facing you or away: the swing leg lifts (knee up), the planted one takes the weight; arms swing a little out and in
    const toward = _GPL.dir === 's' ? 1 : -1;
    _gmvSet(L.legA, 0, A[1] * (1 + (A[2] != null ? toward * A[2] / legLen * 0.12 : 0)), 0, native);
    _gmvSet(L.legB, 0, B[1] * (1 + (B[2] != null ? toward * B[2] / legLen * 0.12 : 0)), 0, native);
    _gmvSet(L.armA, A[0] / 40 * G.arm * 0.45, null, 0, native); _gmvSet(L.armB, B[0] / 40 * G.arm * 0.45, null, 0, native);
    _gmvSet(L.up, (pa < 0.5 ? 1 : -1) * Math.min(1.6, v / 90), null, 0, native);
  }
  _gmvSet(L.root, 0, null, hip, native);
  if (typeof _ga !== 'undefined' && _ga.carry && typeof gartActCarryFrame === 'function') gartActCarryFrame(body, L);   // (25) carrying: both hands on it
}
/** (16) Rowing: seated low in the boat (the boat is drawn round the feet), the oars pulled through the water, a stroke every so much ground. */
const _GMV_OARS = '<g class="gmv-oars"><path d="M-30 -18L30 -18" stroke="#8a6438" stroke-width="2" stroke-linecap="round"/><path d="M-36 -19l-7 -1l1 4zM36 -19l7 -1l-1 4z" fill="#a07a48" stroke="#5a3e22" stroke-width="0.5"/></g>';
function _gmvRow(body, gw, motion) {
  const L = _gmvLimbs(body); if (!L.legA) return;
  if (!body._gmvOars || !body._gmvOars.parentNode) { try { const g = typeof gardenSceneElement === 'function' && L.native ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = _GMV_OARS; (body.querySelector('.gpl-up') || body).appendChild(g); body._gmvOars = g; } catch (e) { /* no oars */ } }
  const Wd = GARDEN_WORLD, ddx = _gmv.rpx == null ? 0 : (gw.px - _gmv.rpx) * Wd.cellW, ddy = _gmv.rpy == null ? 0 : (gw.py - _gmv.rpy) * Wd.cellH; _gmv.rpx = gw.px; _gmv.rpy = gw.py;
  if (motion) _gmv.rphase = ((_gmv.rphase || 0) + Math.min(30, Math.hypot(ddx, ddy)) / 46 + (gw.moving ? 0 : 0.004)) % 1;
  const q = Math.sin((_gmv.rphase || 0) * Math.PI * 2), side = L.side, nat = L.native;
  // (round 4) the hips down on the thwart, inside the hull, whichever way you row (moving or still): the thighs level, the shins down into the boat
  _gmvSet(L.root, 0, null, side ? 19 : 15, nat);
  _gmvSet(L.legA, side ? -86 : 0, side ? 1 : 0.4, 0, nat); _gmvSet(L.legB, side ? -80 : 0, side ? 1 : 0.4, 0, nat);
  _gmvSet(L.kneeA, side ? 92 : 0, side ? null : 2.5, 0, nat); _gmvSet(L.kneeB, side ? 86 : 0, side ? null : 2.5, 0, nat);
  _gmvSet(L.up, side ? -8 * q : 0, side ? null : 1 - 0.03 * q, 0, nat);
  _gmvSet(L.armA, side ? -60 - 30 * q : 30 + 20 * q, side ? null : 0.85, 0, nat); _gmvSet(L.armB, side ? -60 - 30 * q : -30 - 20 * q, side ? null : 0.85, 0, nat);
  if (body._gmvOars) { const tf = side ? `translate(${_gmvN(6 * q)} 0)` : `translate(0 ${_gmvN(2 * q)}) scale(${_gmvN(1 - 0.12 * q)} 1)`; if (body._gmvOars.getAttribute('transform') !== tf) body._gmvOars.setAttribute('transform', tf); }
}
/** How the walk is going, for checks: heading, drawing, gait, phase, stride (px). */
function gartMoveState() { return { heading: Math.round(_gmv.h), want: Math.round(_gmv.want), dir: _GPL.dir, mirror: _gmv.mirror, sx: _gmv.sx, phase: _gmv.phase, stairs: !!_gmv.onStairs, uphill: _gmv.uphill, hop: _gmv.hop > 0, feet: _gmv.feet || null }; }
