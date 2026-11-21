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
  turnRate: 640,          // degrees a second the heading swings (a reversal's turn in about 0.28 s)
  // per gait: stride as a share of the leg's length, the planted share of a leg's cycle, arm swing (deg), lean (deg), bob (px)
  walk: Object.freeze({ stride: 1.38, stance: 0.58, arm: 30, lean: 3, lift: 0.16, knee: 42 }),
  run: Object.freeze({ stride: 1.5, stance: 0.36, arm: 52, lean: 9, lift: 0.3, flight: 2.6, knee: 88 }),
  creep: Object.freeze({ stride: 0.8, stance: 0.66, arm: 6, lean: 10, lift: 0.1, crouch: 0.97, knee: 30 }),   // (round 3: the crouch is in the bent knees and the hands held up, not the figure squashed)
  stairs: Object.freeze({ stride: 1.0, stance: 0.6, arm: 18, lean: 5, lift: 0.34, knee: 60 }),
  hop: Object.freeze({ ms: 380, high: 15 }),
});
const _gmv = { h: 90, want: 90, last: 0, phase: 0, limbs: new WeakMap(), hop: 0, hopT: 0, gait: 'walk', sx: 1, stairs: null, stairT: 0, uphill: 0, dir: 's', face: 1, steer: null };
/** (move360) The yaw a drawn key was made at (gartPlayerPaint's key: pose, family, yaw, ...). */
function _gmvKeyYaw(key) { const m = /^[a-z]+[sen](\d+(?:\.5)?)/.exec(key || ''); return m ? Number(m[1]) : null; }
function _gmvMotion() { try { return typeof _gartMotionOk === 'function' ? _gartMotionOk() : gardenMotionOn(); } catch (e) { return true; } }
function _gmvWrap(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }
/**
 * (move360) The drawing for a heading: sixteen ways round. h: degrees on the screen (0 east, 90 south). The figure has nine drawings, yaw
 * 0 (facing you) to 180 (walking away) in 22.5 steps, and the west half is the east half mirrored. prev: the yaw drawn now, kept until the
 * heading is well past the half-way mark (no flicker between two drawings on a slanting path). sx: the small narrowing between drawings,
 * so the turn is smooth between the sixteen. Returns {dir: the family (s, e, n), yaw, mirror, sx}.
 */
const GMV_STEP = 22.5;
const GMV_GROUND = 30 / 48;   // a step towards you on the ground, on the screen
const GMV_DIP = 0.4;          // how much of a stiff leg's drop the hip takes (the knee bends for the rest)
function _gmvDrawing(h, prev, step) {
  if (arguments.length === 1) {   // one argument: the plain front, side or back an action is drawn in (94-garden-zz-7act-1core.js _gaFace), as before
    const a = _gmvWrap(h), c = Math.cos(a * Math.PI / 180);
    if (Math.abs(a) < 52 || Math.abs(a) > 128) return { dir: 'e', yaw: 90, mirror: c < 0 ? -1 : 1, sx: 1 };
    return { dir: a > 0 ? 's' : 'n', yaw: a > 0 ? 0 : 180, mirror: 1, sx: 1 };
  }
  step = step || GMV_STEP;
  // the heading's own terms stretch a row by 1.6 (gartMoveStep); a cell is square on the ground, so the way the body faces is the angle in cells
  const hr = h * Math.PI / 180, hg = Math.atan2(Math.sin(hr) / 1.6, Math.cos(hr)) * 180 / Math.PI;
  const u = _gmvWrap(90 - hg), yawRaw = Math.abs(u), mirror = u < 0 ? -1 : 1;
  let yaw = Math.round(yawRaw / step) * step;
  if (Number.isFinite(prev) && Math.abs(yawRaw - prev) < step * 0.5 + 4 && prev % step === 0) yaw = prev;
  yaw = Math.max(0, Math.min(180, yaw));
  const off = Math.min(1, Math.abs(yawRaw - yaw) / step);   // how far between two drawings
  const dir = typeof gplYawDir === 'function' ? gplYawDir(yaw) : yaw < 30 ? 's' : yaw > 150 ? 'n' : 'e';
  return { dir, yaw, mirror: yaw === 0 || yaw === 180 ? 1 : mirror, sx: 1 - 0.07 * off * Math.abs(Math.cos(yaw * Math.PI / 180)) - 0.05 * off };
}
/** Steer (keys only): the way you walk swings round too, so a reversal is a small arc, never a jump. ux, uy: unit vector wanted. */
function gartMoveSteer(ux, uy, dt) {
  _gmv.keyAt = performance.now();
  if (!_gmvMotion()) { _gmv.steer = null; _gmv.keyH = _gmvKeyHeading(ux, uy); return [ux, uy]; }
  const want = Math.atan2(uy, ux);
  if (!_gmv.steer || _gmv.steerT < performance.now() - 250) { _gmv.steer = want; _gmv.steerT = performance.now(); _gmv.keyH = _gmvKeyHeading(ux, uy); return [ux, uy]; }
  _gmv.steerT = performance.now();
  // (n-move) two keys are never let go in the same instant: a diagonal that drops to one key for a moment before you stop keeps its way
  // (and its facing) for that moment, so you stop facing the diagonal you walked, not turned a sixteenth towards the key let go last
  const diag = Math.abs(ux) > 0.2 && Math.abs(uy) > 0.2, tNow = performance.now();
  if (diag) { _gmv.diagH = _gmvKeyHeading(ux, uy); _gmv.diagU = [ux, uy]; _gmv.diagAt = tNow; }
  else if (_gmv.diagU && tNow - (_gmv.diagAt || 0) < 110 && Math.abs(Math.atan2(Math.sin(want - Math.atan2(_gmv.diagU[1], _gmv.diagU[0])), Math.cos(want - Math.atan2(_gmv.diagU[1], _gmv.diagU[0])))) < 1.25) { _gmv.keyH = _gmv.diagH; return [Math.cos(_gmv.steer), Math.sin(_gmv.steer)]; }
  let d = want - _gmv.steer; d = Math.atan2(Math.sin(d), Math.cos(d));
  // (round 3) a reversal (or near one) is a pivot, as in Animal Crossing or Stardew: the feet go back the way you came at once, from a
  // planted step (the speed drops, then builds again), and only the drawing turns through the in-between ways. An arc there walked you
  // three quarters of a cell off the line, off a plank or a bridge's edge
  if (Math.abs(d) > 2.1) { _gmv.steer = want; _gmv.keyH = _gmvKeyHeading(ux, uy); if (typeof _gw !== 'undefined') _gw.spd = Math.min(_gw.spd || 0, 40); return [ux, uy]; }
  const step = 13 * dt;   // radians a second: a quarter turn in about 0.12 s, a reversal in 0.24 s
  _gmv.steer += Math.abs(d) <= step ? d : Math.sign(d) * step;
  _gmv.keyH = _gmvKeyHeading(Math.cos(_gmv.steer), Math.sin(_gmv.steer));
  return [Math.cos(_gmv.steer), Math.sin(_gmv.steer)];
}
/** (round 2) A pressed way (screen px, unit) as a heading in the walker's own terms (cells, rows stretched by 1.6: gartMoveStep). */
function _gmvKeyHeading(ux, uy) { const W = GARDEN_WORLD; return Math.atan2(uy / W.cellH * 1.6, ux / W.cellW) * 180 / Math.PI; }
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
    // (n-move) the same steering at a held pointer: a slide round a post or a bed's corner does not turn you to face the camera for a step
    if (gw.hold && gw.hold.steer && gw.holdU && !gw.boat && !(gw.keys && ['left', 'right', 'up', 'down'].some(k => gw.keys.has(k)))) { const kw = _gmvKeyHeading(gw.holdU[0], gw.holdU[1]); if (Math.abs(_gmvWrap(_gmv.want - kw)) > 55) _gmv.want = kw; }
    if (typeof gartEmoteMoved === 'function') gartEmoteMoved();
    if (typeof gartActMoved === 'function') gartActMoved();
  } else if (!gw.moving && gw.keys && gw.keys.size && !(gw.path && gw.path.length) && !(gw.fishing && gw.fishing.state && gw.fishing.state !== 'idle') && !gw.boat && !(typeof _ga !== 'undefined' && _ga.cur && _ga.cur.doing)) {
    // pressing a way you cannot go (a wall, a bank, a fence): you face the way you press, not the way a last little nudge took you
    // (stopped at the brook on the way to the mill, holding right, you turned round to face the camera)
    const kx = (gw.keys.has('right') ? 1 : 0) - (gw.keys.has('left') ? 1 : 0), ky = (gw.keys.has('down') ? 1 : 0) - (gw.keys.has('up') ? 1 : 0);
    if (kx || ky) _gmv.want = Math.atan2(ky * 1.6, kx) * 180 / Math.PI;
  }
  // (round 2) keys held: you face the way you press, not the way a wall or a bank pushes the feet (pressing into the stream turned you to the camera)
  if (_gmv.keyH != null && now - (_gmv.keyAt || 0) < 90) _gmv.want = _gmv.keyH;
  if (_gmv.faceTo != null) { _gmv.want = _gmv.faceTo; _gmv.faceTo = null; }
  let d = _gmvWrap(_gmv.want - _gmv.h);
  if (!_gmvMotion()) _gmv.h = _gmv.want;
  else {
    // a reversal from side on turns through facing you (south), the way a person turns to the camera, not away from it
    if (Math.abs(Math.abs(d) - 180) < 8) { const a = _gmvWrap(_gmv.h); d = (a > -90 && a < 90) ? 179 : -179; if (Math.abs(a + 90) < 30 || Math.abs(a - 90) < 30) d = 180 * Math.sign(d); }
    const step = GPL_MOVE.turnRate * dt; _gmv.h = _gmvWrap(_gmv.h + (Math.abs(d) <= step ? d : Math.sign(d) * step));
  }
  const D = _gmvDrawing(_gmv.h, gplYawDir(_GPL.yaw) === _GPL.dir ? _GPL.yaw : null);
  _gmv.sx = D.sx; _gmv.mirror = D.mirror;
  const turned = D.dir !== _GPL.dir || D.yaw !== _GPL.yaw || ((D.yaw % 180) && D.mirror !== _gmv.face);
  _gmv.face = D.mirror;
  if (turned) { _GPL.dir = D.dir; _GPL.yaw = D.yaw; return true; }
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
/** (2.74.1) The stride on any drawn body: the gardener's own (st = _gmv) and a friend's figure on your screen (st = their own record), the same legs from the same table. */
function _gmvStride(st, body, S, o) {
  const L = _gmvLimbs(body); if (!L.legA || !L.legB) return null;
  const now = performance.now();
  // the gait: run, creep, stairs or walk; the stride follows the ground actually covered
  const v = o.moving ? Math.max(0, o.v || 0) : 0;
  if (now - (st.stairT || 0) > 200) { st.stairT = now; st.onStairs = _gmvStairAt(o.px, o.py); const a = (st.h || 0) * Math.PI / 180; st.uphill = _gmvUphill(o.px, o.py, Math.sin(a), Math.cos(a)); }
  // (round 2) the gait the walker chose (Shift, Z, a long click), not a guess from the speed: slow ground took a run under 205 and drew it as a walk
  const gait = o.gait || (o.sneak ? 'c' : v > 205 ? 'r' : 'w');
  const G = gait === 'c' || o.sneak ? GPL_MOVE.creep : st.onStairs ? GPL_MOVE.stairs : gait === 'r' ? GPL_MOVE.run : GPL_MOVE.walk;
  const runK = G === GPL_MOVE.run ? 1 : 0, creepK = G === GPL_MOVE.creep ? 1 : 0;
  const legLen = Math.max(8, Math.abs(L.legA.oy) * S);   // the hip's height in world px
  // (move360) towards you or away the step is shorter and quicker: a long step seen end on stretches one leg far down the screen
  const yaw0 = Number.isFinite(o.yaw) ? o.yaw : L.side ? 90 : o.dir === 'n' ? 180 : 0;
  const stride = G.stride * legLen * ((runK ? 0.78 : 0.6) + (runK ? 0.22 : 0.4) * Math.abs(Math.sin(yaw0 * Math.PI / 180)));   // (a run's step stays long end on too)
  // the ground actually covered this frame (not the speed asked for: a wall, a slide along it, a diagonal), along the way the drawing faces
  const side = L.side, native = L.native, Wd = GARDEN_WORLD;
  const ddx = st.lpx == null ? 0 : (o.px - st.lpx) * Wd.cellW, ddy = st.lpy == null ? 0 : (o.py - st.lpy) * Wd.cellH; st.lpx = o.px; st.lpy = o.py;
  // (move360) one body for every way round: yaw 0 facing you, 90 side on (east), 180 away. The ground is drawn shorter up and down than
  // across (a cell is 48 by 30), so a foot a step ahead of the hip, seen from the front, is lower on the screen by GMV_GROUND of that step.
  const yaw = Number.isFinite(o.yaw) ? o.yaw : side ? 90 : o.dir === 'n' ? 180 : 0, yr = yaw * Math.PI / 180, sy = Math.sin(yr), cy = Math.cos(yr), m = o.mirror || 1;
  // the ground covered along the way the drawing faces (a slide along a wall sideways to it does not walk the legs)
  const along = Math.abs(ddx * m * sy + ddy * (Wd.cellW / Wd.cellH) * cy);
  const covered = Math.min(40, along);
  st.phase = ((st.phase || 0) + (o.moving ? covered : 0) * G.stance / stride) % 1;
  const lim = (v) => Math.max(-0.98, Math.min(0.98, v));
  // a planted leg: the foot stays where it was put; the knee takes some of the drop, so the hip sinks only GMV_DIP of what a stiff leg would
  const dipOf = (x) => (legLen - Math.sqrt(legLen * legLen - Math.pow(lim(x / legLen) * legLen, 2))) * GMV_DIP;
  const leg = (p) => {   // -> {x: the foot ahead of the hip on the ground (px), h: the hip-to-foot height, planted, knee (deg)}
    if (p < G.stance) { const x = stride / 2 - stride * (p / G.stance); return { x, planted: true, knee: 0, lift: 0 }; }
    const q = (p - G.stance) / (1 - G.stance), e = q * q * (3 - 2 * q), x = -stride / 2 + stride * e;
    const k = L.kneeA ? 0.35 : 1;   // with a knee the shin folds back instead (the leg is not squashed as much)
    return { x, planted: false, knee: G.knee * Math.sin(Math.PI * Math.pow(q, 0.8)), lift: G.lift * k * (1 + runK * Math.abs(cy) * 1.3) * Math.sin(Math.PI * q) };   // (round 2: a run end on lifts its knees so you see it)
  };
  const pa = st.phase, pb = (pa + 0.5) % 1, A = leg(pa), B = leg(pb);
  // the hip rides the planted leg (lower as the legs open); a run has a little flight between steps
  const planted = A.planted ? A : B.planted ? B : null;
  const dip = planted ? dipOf(planted.x) : 0;
  let hip = dip / S + creepK * legLen * 0.16 / S;   // (round 2) a creep goes along with bent knees, low
  if (!planted && G.flight) hip = -G.flight;
  if (st.onStairs) hip += -Math.abs(Math.sin(pa * Math.PI * 2)) * 1.6;
  const lean = (G.lean + (st.uphill > 0 ? 6 : st.uphill < 0 ? -3 : 0)) * Math.min(1, v / 120);
  // the leg as drawn: from the hip to where the foot is on the screen, as a turn about the hip and a stretch along the leg
  const pose = (Lg) => {
    const down = (Lg.planted ? legLen - dip : (legLen - dip) * (1 - Lg.lift)) - creepK * legLen * 0.16;
    const fx = Lg.x * sy, fy = down + Lg.x * cy * GMV_GROUND;
    return [Math.atan2(-fx, fy) * 180 / Math.PI, Math.hypot(fx, fy) / legLen];
  };
  const knee = (k) => {   // the shin folding back: side on it turns, from the front it shortens (the foot goes away from you), from behind it lengthens
    k = (k || 0) + creepK * 26;   // (a creep: both knees bent all the time)
    if (!k) return [0, null];
    const r = k * Math.PI / 180, kx = Math.sin(r) * sy, ky = Math.cos(r) - Math.sin(r) * cy * 0.3;
    return [Math.atan2(kx, Math.max(0.3, ky)) * 180 / Math.PI, Math.max(0.62, Math.hypot(kx, ky))];
  };
  // the arms swing against the legs: forward is towards you from the front, so a hand coming forward is lower and one going back rises
  // (round 2) from the front and back the swing is what you see of the hands, so it is wider there: the hand coming towards you drops
  // and swings in across the body, the one going back rises and goes out; a run pumps with bent arms (shorter), a creep holds them low and still
  const ac = Math.abs(cy), armSpan = (1 + 0.8 * ac) * (runK ? 1.1 : 1), armLen = runK ? 1 - 0.16 * ac : 1;
  const arm = (Lg, inSign) => {
    const f = Math.max(-70, Math.min(70, -Math.asin(lim(Lg.x / legLen / (0.6 + 0.4 * Math.abs(sy)))) * 180 / Math.PI / 40 * G.arm * armSpan)), r = f * Math.PI / 180;
    const sr = Math.sin(r), fwd = Math.max(0, sr), bk = Math.max(0, -sr);
    // side on it turns; end on it tips in across the body. A run pumps: the forward hand comes up to the chest and in, the back one out
    if (creepK) {   // (round 3) a creep: the hands held up in front, elbows bent (shorter arms), barely swinging: from the front they come in over the belly
      const rotC = Math.atan2(-Math.sin(0.85 + r) * sy, Math.cos(0.85 + r)) * 180 / Math.PI - inSign * ac * 16;
      return [rotC, 0.74 + 0.1 * sy];
    }
    // (n-move) the turn seen side on uses the arm's own swing, not the wider end-on one: a quarter turned from behind (157.5) swung a hand out level with the shoulder
    const r0 = r / armSpan * (runK ? 1.1 : 1);
    const rot = Math.atan2(-Math.sin(r0) * sy, Math.cos(r0)) * 180 / Math.PI - inSign * ac * (runK ? 26 * fwd - 8 * bk : 22 * sr);
    const lenEnd = runK ? armLen * (1 - 0.42 * fwd + 0.06 * bk) : (1 + 0.6 * sr * cy) * armLen;   // a walk end on: forward (towards you) is lower on the screen, back is higher
    return [rot, ac > 0.2 || runK ? sy * sy + lenEnd * cy * cy : null];
  };
  // where the planted foot is on the ground (world px), for checks: it should not move while planted
  { const wx = o.px * Wd.cellW, wy = Wd.sky + o.py * Wd.cellH, f = (Lg) => (Lg.planted ? [Math.round((wx + m * Lg.x * sy) * 10) / 10, Math.round((wy + Lg.x * cy * GMV_GROUND) * 10) / 10] : null); st.feet = [f(A), f(B)]; }
  const PA = pose(A), PB = pose(B), KA = knee(A.knee), KB = knee(B.knee);
  _gmvSet(L.legA, PA[0], PA[1], 0, native); _gmvSet(L.legB, PB[0], PB[1], 0, native);
  _gmvSet(L.kneeA, KA[0], KA[1], 0, native); _gmvSet(L.kneeB, KB[0], KB[1], 0, native);
  const AA = arm(A, 1), AB = arm(B, -1);
  _gmvSet(L.armA, AA[0], AA[1], 0, native); _gmvSet(L.armB, AB[0], AB[1], 0, native);
  // the body leans into the pace (side on), and from the front the weight shifts over the planted foot, smoothly
  const sway = Math.sin(pa * Math.PI * 2) * (1.1 + runK * 0.8) * Math.abs(cy) * Math.min(1, v / 90);
  // (round 2) end on, a lean shows as the body shortened over the hips (towards you or away): a run and a creep bend into it
  const leanEnd = ac * Math.min(1, v / 120) * (runK ? 0.06 : creepK ? 0.1 : 0.015);
  _gmvSet(L.up, lean * sy + sway, 1 - leanEnd, creepK * ac * 1.2, native);
  _gmvSet(L.root, 0, null, hip, native);
  return L;
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
  const drawnYaw = inner._gplKey && typeof gplDirYaw === 'function' ? _gmvKeyYaw(inner._gplKey) : null;
  const mirror = fishing ? (gw.face < 0 ? -1 : 1) : (_GPL.dir === 'e' || (drawnYaw != null && drawnYaw % 180)) ? _gmv.mirror || 1 : 1;
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
  if (body && gw.boat && !acting) { _gmvRow(body, gw, motion); return; }
  if (body && !acting && typeof gardenHeightBody === 'function' && gardenHeightBody(body, gw, motion)) { _gmv.lpx = _gmv.lpy = null; return; }   // swimming: strokes, or floating (94-garden-zz-7act-3height.js)   // (16) in the boat: seated at the oars, pulling as it moves
  if (body && typeof _ga !== 'undefined' && _ga.carry && !acting && !(_GPL.pose === 'stride' || (inner._gplKey || '').startsWith('stride'))) gartActCarryFrame(body, _gmvLimbs(body));
  if (acting || !body || !motion || _GPL.pose !== 'stride' && !(inner._gplKey || '').startsWith('stride')) { _gmv.lpx = _gmv.lpy = null; return; }
  const L = _gmvStride(_gmv, body, S, { px: gw.px, py: gw.py, moving: !!gw.moving, v: gw.spd || 0, sneak: !!gw.sneak, gait: gw.sneak ? 'c' : gw.gait || null, dir: _GPL.dir, yaw: drawnYaw, mirror }); if (!L) return;
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
function gartMoveState() { return { heading: Math.round(_gmv.h), want: Math.round(_gmv.want), dir: _GPL.dir, yaw: _GPL.yaw, mirror: _gmv.mirror, sx: _gmv.sx, phase: _gmv.phase, stairs: !!_gmv.onStairs, uphill: _gmv.uphill, hop: _gmv.hop > 0, feet: _gmv.feet || null }; }
/**
 * (2.74.1) A friend's figure on your screen (94-garden-live-1core.js _gllStep calls this once a frame): the same turn through the
 * in-between drawings and the same stride, walk or run, as your own, worked out from where their figure goes. Nothing extra is sent:
 * the walk messages already carry where they are going and how fast, so the legs, the run and the turn follow on every screen.
 * A: the live actor (x, y, moving, dir, face, inner). Leaves a figure that is doing something (an action, a line out, a seat) alone.
 */
function gartMoveActor(A) {
  if (!A || !A.inner || A.inner._dead) return;
  const W = GARDEN_WORLD, now = performance.now(), motion = _gmvMotion();
  const st = A.gm || (A.gm = { h: A.hd != null ? A.hd : A.dir === 'n' ? -90 : A.dir === 'e' ? (A.face < 0 ? 180 : 0) : 90, phase: 0, lpx: null, lpy: null, ox: A.x, oy: A.y, t: 0, v: 0 });
  const dt = Math.min(0.1, st.t ? (now - st.t) / 1000 : 0); st.t = now;
  const cx = A.x - st.ox, cy = A.y - st.oy, mx = cx * W.cellW, my = cy * W.cellH; st.ox = A.x; st.oy = A.y;
  if (dt > 0) st.v = st.v * 0.75 + Math.min(600, Math.hypot(mx, my) / dt) * 0.25;
  const busy = !!(A.actUndo || A.actId || A.fish || A.sit || A.actHold || A.hold || (A.anims && A.anims.length));
  if (busy || !A.moving) {
    st.lpx = st.lpy = null;
    // (round 2) only when what they are drawn as is another family: resetting every busy frame swung a standing friend 45, 90, 45, 0
    if ((busy || !motion) && (!motion || _gmvDrawing(st.h, null, 45).dir !== A.dir)) st.h = A.dir === 'n' ? -90 : A.dir === 'e' ? (A.face < 0 ? 180 : 0) : 90;
    if (!A.moving) { st.v = 0; A.keyEnd = false; }
    // (move360) stood still: they turn to the way they last said they face (every walk message carries it), through the in-between drawings
    if (!busy && !A.moving && A.hd != null && A.standDeg == null && motion) {
      let d = _gmvWrap(A.hd - st.h); const step = GPL_MOVE.turnRate * dt; st.h = _gmvWrap(st.h + (Math.abs(d) <= step ? d : Math.sign(d) * step));
      const D = _gmvDrawing(st.h, Number.isFinite(A.yaw) && gplYawDir(A.yaw) === A.dir ? A.yaw : null, GMV_STEP);
      if (D.dir !== A.dir || D.yaw !== A.yaw || ((D.yaw % 180) && D.mirror !== A.face)) { A.dir = D.dir; A.yaw = D.yaw; if (D.yaw % 180) A.face = D.mirror; A.key = ''; if (typeof _gllPaint === 'function') _gllPaint(A); }
    }
    if (!A.moving && A.standDeg != null && typeof gartActStandFace === 'function') gartActStandFace(A);
    if (!busy && typeof gartActCarryActor === 'function') { const b0 = A.inner.firstChild; if (b0 && b0.querySelector) gartActCarryActor(A, b0); }
    return;
  }
  if (Math.abs(cx) + Math.abs(cy * 1.6) >= 0.004) st.want = Math.atan2(cy * 1.6, cx) * 180 / Math.PI;   // (the heading in the same terms as your own: gartMoveStep)
  // (n-move) walking by the keys, they said which way they face: their figure catching up between two messages goes a little aslant, and
  // was drawn a sixteenth or two off the way they really face (a run diagonal showed side on)
  // (n-move, critic) and the same for the last stretch after they stop (the message that ends a key walk has no kw): a figure catching up
  // from a diagonal to where they stopped facing east walked the slant facing 135, then spun on the spot. Within a cell or so of the spot a
  // catch-up is only a correction, so it faces the way they say however far off it goes (short of walking backwards)
  const keyed = A.keyWalk || A.keyEnd;
  if (keyed && A.hd != null && st.want != null) {
    const off = Math.abs(_gmvWrap(st.want - A.hd)), left = A.tx != null ? Math.hypot((A.tx - A.x) * W.cellW, (A.ty - A.y) * W.cellH) : 0;
    if (off < 60 || (off < 115 && left < 64)) st.want = A.hd;
  }
  if (st.want != null) {
    let d = _gmvWrap(st.want - st.h);
    if (!motion) st.h = st.want;
    else {
      if (Math.abs(Math.abs(d) - 180) < 8) { const a = _gmvWrap(st.h); d = (a > -90 && a < 90) ? 179 : -179; if (Math.abs(a + 90) < 30 || Math.abs(a - 90) < 30) d = 180 * Math.sign(d); }
      const step = GPL_MOVE.turnRate * dt; st.h = _gmvWrap(st.h + (Math.abs(d) <= step ? d : Math.sign(d) * step));
    }
  }
  // (n-move) a friend's figure turns through the same sixteen drawings as yours: friends see the way you really face, not the nearest eighth
  const D = _gmvDrawing(st.h, Number.isFinite(A.yaw) && gplYawDir(A.yaw) === A.dir ? A.yaw : null, GMV_STEP);
  if (D.dir !== A.dir || D.yaw !== A.yaw || ((D.yaw % 180) && D.mirror !== A.face)) { A.dir = D.dir; A.yaw = D.yaw; if (D.yaw % 180) A.face = D.mirror; A.key = ''; if (typeof _gllPaint === 'function') _gllPaint(A); }
  const S = typeof GL_ACT_SCALE === 'number' ? GL_ACT_SCALE : 0.74 * GARDEN_ACTOR_SCALE;
  const sneak = A.sneakUntil > Date.now(), mirror = (A.yaw % 180) && A.face < 0 ? -1 : 1, sx = motion ? D.sx : 1;   // clock-ok: a creep
  const tf = `scale(${_gmvN(mirror * S * sx)} ${_gmvN(S * (sneak ? GPL_MOVE.creep.crouch : 1))})`;
  if (A.inner.getAttribute('transform') !== tf) A.inner.setAttribute('transform', tf);
  if (!motion) return;
  const body = A.inner.firstChild; if (!body || !body.querySelector) return;
  const v = A.gait === 'r' ? Math.max(st.v, 230) : A.gait === 'w' ? Math.min(st.v, 200) : st.v;   // (move360) the gait they said, not a guess from how fast their figure catches up
  const L = _gmvStride(st, body, S, { px: A.x, py: A.y, moving: true, v, sneak, gait: sneak ? 'c' : A.gait === 'r' || A.gait === 'w' ? A.gait : null, dir: A.dir, yaw: A.yaw, mirror });
  if (typeof gartActCarryActor === 'function') gartActCarryActor(A, body, L);   // (carrying: both hands on it, as yours)
}

/** (n-move) A heading on the wire: the sixteenth of a turn on the ground (cells, as the drawings are made), not of the walker's heading,
 *  whose rows are stretched by 1.6: a diagonal sent in those terms came back a sixteenth off on a friend's screen (45 drawn as 22.5). */
function _gmvH16(h) { const r = h * Math.PI / 180, g = Math.atan2(Math.sin(r) / 1.6, Math.cos(r)) * 180 / Math.PI; return Math.round(((g % 360) + 360) % 360 / 22.5) % 16; }
function _gmvFromH16(n) { const g = n * 22.5 * Math.PI / 180; return _gmvWrap(Math.atan2(Math.sin(g) * 1.6, Math.cos(g)) * 180 / Math.PI); }
/** (nf-walk) A heading told to friends as the sixteenth of the drawing you will show once turned to it (h: your heading, screen terms as
 *  _gmv.h). Your figure keeps the drawing it has until a heading is well past the half-way mark to the next one (_gmvDrawing), and turns
 *  through the drawings in between, so from the drawing shown now (_GPL.yaw and its mirror) it ends on the first one along the turn whose
 *  band holds the heading, not always the nearest: told the nearest, a friend's figure turned a sixteenth further than yours. */
function _gmvTold(h) {
  const n = _gmvH16(h);
  if (typeof _GPL === 'undefined' || !Number.isFinite(_GPL.yaw) || _GPL.yaw % GMV_STEP || gplYawDir(_GPL.yaw) !== _GPL.dir) return n;
  const hr = h * Math.PI / 180, hg = Math.atan2(Math.sin(hr) / 1.6, Math.cos(hr)) * 180 / Math.PI, u = _gmvWrap(90 - hg);   // (signed: the west half negative)
  const u0 = _GPL.yaw % 180 ? (_gmv.mirror || 1) * _GPL.yaw : _GPL.yaw, d = _gmvWrap(u - u0), band = GMV_STEP * 0.5 + 4;
  // (a turn of more than three quarters goes the way the walker's own turn picks, through facing you: there the nearest drawing is told)
  if (Math.abs(d) > 135) return n;
  const k = Math.abs(d) < band ? 0 : Math.floor((Math.abs(d) - band) / GMV_STEP) + 1, f = _gmvWrap(u0 + Math.sign(d) * k * GMV_STEP);
  return Math.round((((90 - f) % 360) + 360) % 360 / 22.5) % 16;
}
/** (move360) What your walk messages say besides where: the way you face (in sixteenths of a turn, screen degrees as gartMoveFacingDeg) and the gait (w walk, r run, c creep). */
function gartMoveTell() {
  // (round 2) the way you will face when the turn is done (want), and the gait you chose: the last one while moving, kept for the 'stopped' message,
  // which used to say walk and drew the rest of a friend's run as a walk on their screen
  const hw = _gmv.want != null ? _gmv.want : _gmv.h || 0;
  // (nf-walk) the drawing you will show once turned that way, which keeps the one you show now near the half-way mark between two
  // (_gmvTold): a run stopped at 99 degrees showed 112.5 on your screen and 90 on a friend's, and a click's walk at 112.5 was drawn
  // facing you on your screen and a sixteenth round on a friend's for the whole walk
  const h = _gmvTold(hw);
  if (typeof _gw !== 'undefined' && _gw.moving) _gmv.tellGait = _gw.sneak ? 'c' : _gw.gait || 'w';
  // (round 3) a click's walk, told as it starts: the gait it will have (chosen once for the way: _gw.clickRun) and the way to its first turn,
  // not the gait and facing of whatever you did before (a click walk told friends 'run', then 'walk')
  const way = typeof _gw !== 'undefined' && _gw.path && _gw.path.length ? _gw.path[0] : null;
  if (way) {
    const ddx = way.x - _gw.px, ddy = (way.y - _gw.py) * 1.6;
    const hw = Math.abs(ddx) + Math.abs(ddy) > 0.05 ? _gmvTold(Math.atan2(ddy, ddx) * 180 / Math.PI) : h;
    return { h: hw, g: _gw.sneak ? 'c' : _gw.clickRun ? 'r' : 'w' };
  }
  const g = _gmv.tellGait || 'w';
  return { h, g, ...(typeof _gw !== 'undefined' && _gw.moving ? { kw: 1 } : {}) };
}
/** (move360) A friend's walk message heard: keep the way they face and their gait on their figure (gartMoveActor uses both).
 *  whole: a whole-state message (gl:who, a join, the host's list, the garden snapshot): someone you have only just seen, or seen again after a
 *  dropped line, stands facing the way they really face at once, not the default way until they next move. Gait there is gt (g is their gear). */
function gartMoveTold(A, ev, whole) {
  if (!A || !ev) return;
  const g = typeof ev.g === 'string' ? ev.g : ev.gt;
  if (Number.isInteger(ev.h) && ev.h >= 0 && ev.h < 16) {
    A.hd = _gmvFromH16(ev.h);
    if (whole && !A.moving && !(A.actId || A.sit || A.fish)) {
      const D = _gmvDrawing(A.hd, null, GMV_STEP);
      A.dir = D.dir; A.yaw = D.yaw; if (D.yaw % 180) A.face = D.mirror;
      if (A.gm) A.gm.h = A.hd;
      A.key = '';
    }
  }
  if (g === 'w' || g === 'r' || g === 'c') { A.gait = g; if (!whole) A.sneakUntil = g === 'c' ? Date.now() + 1500 : 0; }   // clock-ok: a creep lasts while they keep saying so
  if (!whole) { const was = A.keyWalk; A.keyWalk = ev.kw === 1; A.keyEnd = !A.keyWalk && !!was; A.drift = null; A.lux = A.luy = null; }   // (keyEnd: the stop after a key walk; it lasts until the figure stands)   // (kw: walking by the keys and still going; a message without it is where they stopped)
}
/** (move360 round 3) A friend walking by the keys, between two of their messages: on the way they were going, at their pace, never into
 *  anything that blocks walking, for at most the time the next message takes. Returns whether the figure moved. */
function gartMoveDrift(A, dt) {
  const D = A.drift, W = GARDEN_WORLD; if (!D) return false;
  if (Date.now() > D.until || A.sit || A.actId) { A.drift = null; return false; }   // clock-ok: how long to carry on
  const step = D.v * dt * (A.sneakUntil > Date.now() ? 0.45 : 1), nx = A.x + D.ux * step / W.cellW, ny = A.y + D.uy * step / W.cellH;   // clock-ok: a creep
  if (typeof _gwFree === 'function' && !_gwFree(nx, ny)) { A.drift = null; return false; }
  A.x = nx; A.y = ny; return true;
}
/** (move360) The same for the whole-state messages you send (your look: gl:me, the host's "here"): h and gt. */
function gartMoveWhole() { const t = gartMoveTell(); return { h: t.h, gt: t.g }; }

/* (n-move) DRAWINGS MADE AHEAD. Each of the sixteen ways round is one of nine drawings (the west half mirrored), walking and standing: 18 for a
   figure. The first turn to one not made yet built it there and then, 20-42 ms in one frame on a friend's screen as your figure went round a
   corner (long tasks of 55-92 ms with the frame's own work). They are now made one at a time while nobody is walking, hidden beside the one
   shown (GardenNativeArt.warmBody), so a turn only swaps in a ready drawing. */
const _gmvWarm = { q: [], busy: false, n: 0, ms: 0 };   // (n, ms: how many made, the longest one took: for checks)
const GMV_WARM_POSES = ['stride', 'idle'];
/** Queue the drawings for one figure. inner: its native inner group; sig: what it looks like (a new look queues them again);
 *  svgOf(pose, dir, yaw): the drawing's source, exactly as the figure's own painter asks for it. */
function gartMoveWarm(inner, sig, svgOf) {
  if (!inner || !inner._native || inner._gmvWarmSig === sig) return;
  if (!(window.GardenNativeArt && typeof GardenNativeArt.warmBody === 'function')) return;
  inner._gmvWarmSig = sig;
  _gmvWarm.q = _gmvWarm.q.filter(j => j.inner !== inner);
  for (const pose of GMV_WARM_POSES) for (let i = 0; i <= 8; i++) _gmvWarm.q.push({ inner, sig, svgOf, pose, yaw: i * 22.5 });
  if (!_gmvWarm.busy) { _gmvWarm.busy = true; _gmvWarmLater(); }
}
function _gmvWarmWalking() {
  // (a pause between two walks is not a standstill: only after 1.5 s with nobody moving)
  let walking = false;
  if (typeof _gw !== 'undefined' && (_gw.moving || (_gw.keys && _gw.keys.size) || (_gw.path && _gw.path.length))) walking = true;
  try { if (!walking && typeof _gll !== 'undefined' && _gll.actors) for (const A of _gll.actors.values()) if (!A.me && (A.moving || A.tx != null)) { walking = true; break; } } catch (e) { /* no friends here */ }
  const now = performance.now(); if (walking) _gmvWarm.walkAt = now;
  return walking || now - (_gmvWarm.walkAt || 0) < 1500;
}
function _gmvWarmGo(dl) {
  // while anyone walks the frame has no room for a drawing: wait for a standstill (one not made by then is made when it is needed, as before)
  if (_gmvWarmWalking() || (dl && !dl.didTimeout && dl.timeRemaining() < 6)) { _gmvWarmLater(); return; }
  const t0 = performance.now();
  let j; while ((j = _gmvWarm.q.shift()) && (j.inner._dead || j.inner._gmvWarmSig !== j.sig)) { /* gone or out of date */ }
  // a figure out of view (gart-off) is drawn hidden, and drawn again when it is back: its drawings wait for it to come into view
  if (j && typeof j.inner.closest === 'function' && j.inner.closest('.gart-off')) { _gmvWarm.q.push(j); if (_gmvWarm.q.every(q => q.inner.closest('.gart-off'))) { setTimeout(_gmvWarmLater, 700); return; } _gmvWarmLater(); return; }
  if (j) { try { const s = j.svgOf(j.pose, gplYawDir(j.yaw), j.yaw); if (s) GardenNativeArt.warmBody(j.inner, s); } catch (e) { /* made when it is needed instead */ } _gmvWarm.n = (_gmvWarm.n || 0) + 1; _gmvWarm.ms = Math.max(_gmvWarm.ms || 0, performance.now() - t0); }
  if (_gmvWarm.q.length) _gmvWarmLater(); else _gmvWarm.busy = false;
}
function _gmvWarmLater() { if (typeof requestIdleCallback === 'function') requestIdleCallback(_gmvWarmGo, { timeout: 500 }); else setTimeout(_gmvWarmGo, 60); }
