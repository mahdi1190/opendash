/* ============================================================
   FOLK YOU CAN DRIVE (the folk3 plan, step 1). Games, the week, festivals and moments all take a villager out of their day for a while
   and give them back: this is the one small way to do it, so nobody is ever moved by hand somewhere else.
   - Taken: gardenFolkDrive(id, o) sets V.drive. The runner (94-garden-wonder-0vale-folk.js, hook R1) then hands that villager's frame to
     gardenFolkDriveFrame here: to a place on the folk's own lanes (the path service), or along a path given (a race's course), at a walk
     or a run, then a pose (cheer, clap, crouch, count, throw...), facing a way or a point. Stepping round players and waiting at narrow
     crossings work as they always do (_vfrStep). Off the view they still step along: only a few are ever driven at once.
   - Given back: gardenFolkRelease(id) clears it; the runner finds where their plan has them and they walk back there (a little quicker
     when they are late, its own rule). Nobody appears or vanishes in view.
   - Who may take whom: a moment (scene) over a game over a festival over the week. Nobody asleep, indoors, or talking to you is taken.
   - Friends: the host's gl:fk already carries the driven folk; their pose word ('run', 'cheer', ...) needs no change on the wire, and a
     guest's copy runs at VF3_RUN (hook R4 in the guest's frame).
     gardenFolkFree(id, by)          can they be taken now (out of doors, awake, not held, not taken by something stronger)
     gardenFolkDrive(id, o)          o: { to: {x, y}, path: [{x, y}], gait: 'w' | 'r', speed (px/s), pose, face: 1 | -1 | {x, y}, view,
                                         lift (px: stood on something), noTalk (no "Talk to" while driven), by, then(V) (arrived) }
     gardenFolkRelease(id | '*', by) back to their day
     gardenFolkDriven(id)            the drive they are on, or null
     gardenFolkDriveFrame(V, dt, now, view)   the runner's hook (R1)
     gardenFolkDrivePose(V)          the pose word friends get ('run', 'walk', or the pose)
   ============================================================ */
const VF3_STRENGTH = Object.freeze({ scene: 4, game: 3, fest: 2, week: 1 });
const _VF3_POSES = ['idle', 'talk', 'sit', 'read', 'fish', 'cheer', 'clap', 'point', 'crouch', 'peek', 'count', 'listen', 'boots', 'throw', 'ready', 'seek', 'dig', 'shrug', 'laugh'];
const _VF3_PI = new Map(_VF3_POSES.map((p, i) => [p, i]));
function _vf3V(id) { return typeof _vfr !== 'undefined' && _vfr.V ? _vfr.V.get(id) || null : null; }
function gardenFolkFree(id, by) {
  if (typeof _vfr === 'undefined' || !_vfr.on) return false;
  const V = _vf3V(id); if (!V || V.x == null || V.inside || V.hold) return false;
  if (!(_vfr.list || []).includes(V)) return false;   // (not out in the vale today)
  const e = V.entry; if (e && (e.act === 'sleep' || e.offmap || (e.inside && V.arrived))) return false;
  if (V.drive && V.drive.by !== by && (VF3_STRENGTH[V.drive.by] || 0) >= (VF3_STRENGTH[by] || 0)) return false;
  return true;
}
function gardenFolkDriven(id) { const V = _vf3V(id); return V && V.drive ? V.drive : null; }
function gardenFolkDrive(id, o) {
  const V = _vf3V(id); if (!V || !V.row) return null;
  o = o || {};
  const by = o.by || 'game', walk = VALE_FOLK_SPEED * (V.row.speed || 1);
  const D = V.drive && V.drive.by === by ? V.drive : { by };
  D.gait = o.gait === 'r' ? 'r' : 'w';
  D.speed = Number.isFinite(o.speed) && o.speed > 0 ? o.speed : D.gait === 'r' ? VF3_RUN * (V.row.speed || 1) : walk;
  D.pose = o.pose || ''; D.face = o.face == null ? null : o.face; D.view = o.view || '';
  D.noTalk = !!o.noTalk; D.then = typeof o.then === 'function' ? o.then : null; D.lift = Number(o.lift) || 0; D.z = Number.isFinite(o.z) ? o.z : null;
  D.t0 = performance.now(); D.stop = 0; D.failed = false; D.at = 0;
  if (Array.isArray(o.path) && o.path.length) {
    const last = o.path[o.path.length - 1]; D.to = { x: last.x, y: last.y };
    V.path = o.path.slice(); V.pathFor = D.to.x.toFixed(2) + ',' + D.to.y.toFixed(2); V.asking = ''; V.noWay = false;
  } else if (o.to && Number.isFinite(o.to.x) && Number.isFinite(o.to.y)) { D.to = { x: o.to.x, y: o.to.y }; V.path = null; V.pathFor = ''; V.asking = ''; V.noWay = false; }
  else { D.to = null; V.path = null; V.pathFor = ''; }
  V.drive = D; V.visit = null; V.mark = false; V.aside = null; V.greet = null; V.nod = null; V.hold = null; V.drawn = ''; V.waiting = false;   // (a talk that led to this, Play on their card, is over)
  if (V.inside) V.inside = false;
  return D;
}
/** Change only the pose (and facing) of someone already driven: a cheer at the podium, a peek from behind a tree. */
function gardenFolkPose(id, pose, face) { const V = _vf3V(id); if (!V || !V.drive) return false; V.drive.pose = pose || ''; if (face != null) V.drive.face = face; V.drawn = ''; return true; }
function gardenFolkRelease(id, by) {
  if (typeof _vfr === 'undefined' || !_vfr.V) return;
  for (const V of _vfr.V.values()) {
    if (!V.drive || (id !== '*' && V.id !== id) || (by && V.drive.by !== by)) continue;
    V.drive = null; V.entry = null; V.path = null; V.pathFor = ''; V.asking = ''; V.arrived = false; V.drawn = ''; V.waiting = false;
    if (V.S) { V.S.lift = 0; V.S.z = null; }
  }
}
/** The runner's frame for a driven villager (hook R1). Nothing is allocated here: the drive's own target and V's path are reused. */
function gardenFolkDriveFrame(V, dt, now, view) {
  const D = V.drive; if (!D) return;
  const near = _vfrNearView(V.x, V.y, view, VFR_NEAR + 2) || (D.to && _vfrNearView(D.to.x, D.to.y, view, VFR_NEAR));
  if (near) { if (!V.S) _vfrShow(V); } else if (V.S) _vfrHide(V);
  let moving = false;
  if (D.to) {
    const dx = (D.to.x - V.x) * GARDEN_WORLD.cellW, dy = (D.to.y - V.y) * GARDEN_WORLD.cellH;
    if (dx * dx + dy * dy > 9) {
      if (!V.path || !V.path.length) {
        // no way found (or the path ran out short of the place): a short clear step goes straight; a long one is looked for again
        if (V.noWay || (V.path && !V.path.length && !V.asking)) { if (Math.abs(dx) < 4 * GARDEN_WORLD.cellW && Math.abs(dy) < 4 * GARDEN_WORLD.cellH && typeof _vfrLineFree === 'function' && _vfrLineFree(V, D.to)) { V.path = V.path || []; V.path.length = 0; V.path.push(D.to); V.noWay = false; } else if (V.noWay) D.failed = true; }
        if (!V.path || !V.path.length) _vfrAsk(V, D.to, 3);
      }
      if (D.stop && now < D.stop) { /* stopped a moment (a fish in the water): stood, looking */ }
      else if (V.path && V.path.length) { D.stop = 0; _vfrStep(V, dt, D.speed / (VALE_FOLK_SPEED * (V.row.speed || 1))); moving = !V.waiting; }
    } else {
      V.x = D.to.x; V.y = D.to.y; if (V.path) V.path.length = 0; D.to = null; D.at = now;
      const f = D.then; D.then = null; if (f) { try { f(V); } catch (e) { console.error('[folk drive]', e); } }
    }
  }
  if (!moving && D.face != null) { if (D.face === 1 || D.face === -1) V.face = D.face; else if (Number.isFinite(D.face.x) && Math.abs(D.face.x - V.x) > 0.12) V.face = D.face.x > V.x ? 1 : -1; }
  if (V.S) _vf3Draw(V, moving);
}
function _vf3Draw(V, moving) {
  const S = V.S, D = V.drive;
  const pose = moving ? 'idle' : (D.pose || 'idle'), face = V.face < 0 ? -1 : 1;
  let view;
  if (moving) view = _vfrView3(V, true, pose);
  else { view = VF3_POSE_VIEW[pose] || (D.view === 's' || D.view === 'n' ? D.view : 'e'); V.view = view; }
  const pi = _VF3_PI.has(pose) ? _VF3_PI.get(pose) : 0, k = ((pi * 3 + (moving ? (D.gait === 'r' ? 2 : 1) : 0)) * 2 + (face > 0 ? 1 : 0)) * 3 + (view === 's' ? 0 : view === 'n' ? 1 : 2);
  if (V.drawnN !== k || V.drawn !== 'd') { V.drawnN = k; V.drawn = 'd'; wdArt(S, _vfrMarkup(V, pose, moving, face, false, view)); }
  S.x = V.x; S.y = V.y; S.lift = D.lift || 0; S.z = D.z;
  _vf3Stride(V, moving, view, D);
}
/** The stride rig on a driven villager's limbs: a run when they run (feet planted, arms pumping), as the gardener's own. */
function _vf3Stride(V, walking, view, D) {
  if (!walking || !V.S || typeof _gmvStride !== 'function') { if (V.st) { V.st.lpx = V.st.lpy = null; } return; }
  try {
    if (typeof _gmvMotion === 'function' && !_gmvMotion()) return;
    const body = V.S.node && V.S.node.firstChild; if (!body || !body.querySelector) return;
    V.st = V.st || { h: 0 };
    const o = V.st.vf3o || (V.st.vf3o = {});
    o.px = V.x; o.py = V.y; o.moving = true; o.v = D.speed; o.gait = D.gait; o.dir = view; o.yaw = view === 's' ? 0 : view === 'n' ? 180 : 90; o.mirror = view === 'e' ? (V.face < 0 ? -1 : 1) : 1;
    _gmvStride(V.st, body, typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.6, o);
  } catch (e) { /* drawn standing */ }
}
/** The pose word friends are sent for a driven villager (hook R2): moving, 'run' or 'walk'; standing, the pose. */
function gardenFolkDrivePose(V) {
  const D = V.drive; if (!D) return 'idle';
  if (D.to && V.path && V.path.length && !V.waiting && !(D.stop && performance.now() < D.stop)) return D.gait === 'r' ? 'run' : 'walk';
  return D.pose || 'idle';
}
/** For the console (and the sandbox check): drive someone a few cells off, at a run, then cheer. */
function gardenFolkDriveDev(id, dx, dy, pose) {
  const V = _vf3V(id || 'pip'); if (!V) return 'not about';
  const to = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(V.x + (dx || 8), V.y + (dy || 0), 3) : { x: V.x + (dx || 8), y: V.y + (dy || 0) };
  gardenFolkDrive(V.id, { to, gait: 'r', by: 'game', then: () => gardenFolkPose(V.id, pose || 'cheer', 1) });
  return to;
}
