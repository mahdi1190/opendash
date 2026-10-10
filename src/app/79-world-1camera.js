/* ============================================================
   WORLD ENGINE v3.1, package `appearance`: cameras, frames and framing (docs/dev/WORLD_ENGINE.md 1.1, 12.4, 14;
   requirements W5, Q1, Q6, Q7 (with sense), C1, C4, section 19 wide frames and tiny screens). Private names: _wcm.
   PURE classic script: functions and consts only, nothing runs at load; every other package is reached through typeof
   guards (a missing package removes a feature, never the scene).

   Two frames (1.1). PLACE: x east of the place origin, z north, compass facings (0 = north, 90 = east). CAMERA: x right of
   the camera axis, z forward, facings 0 = away from the camera, 90 = right. A v3.1 spec is written in the place frame and has
   `cameras`; a v3.0 spec has one `camera` and is already in its camera frame (the transform is the identity).

   API
     worldCameraResolve(spec, i, o) -> Camera   the v2 camera block of camera i (an index or a camera id) of a spec, by INTENT:
         { at: [lat, lon] | [x, z], height, lookAt: <landmark / entity / building id> | <bearing>, fov, pitch?, heading?, preset? }
         or { frame: [ids], at? }. The heading comes from lookAt (the landmark centred) or frame (the subjects fitted, the
         position solved in front of their faces when `at` is missing); the horizon row from the pitch (a shift lens: Y_h =
         450 + f tan(pitch), + up), which is chosen so the subject fits (top >= 8 % from the top edge, base above the bottom);
         the fov is widened to fit when the author gave none. The block carries a REAL position (W5): lat / lon / alt of the
         camera itself, its place metres `pos`, height, heading (compass), pitch, fov, f, and `ms` when o.ms or o.ctx.ms gives
         the time (date and time otherwise come from the time context). Everything the v2 camera reads (eye, fov, horizon,
         heading, x0, lat, lon, alt, water, preset) is there; block.camera holds exactly those keys (sense: sceneCamera({ camera: block.camera })).
         o: { ms, ctx, groundAt(x, z) (ground height in place metres), log: [] (notes are pushed here too) }.
         Never throws: an unknown lookAt or a malformed camera falls back to a sensible default and is logged (block.log).
     worldCameraXform(spec, i) -> { toCam(x, z) -> [x, z], toPlace(x, z), facing(deg) -> camera facing, facingToPlace(deg),
         pts(list), heading, pos, cam, identity }   the place frame -> camera frame transform of camera i (sense calls it for Q7).
     worldCameraSpec(spec, i, o) -> a camera-frame spec (v 3 shape: one `camera`, every point, polygon, path, footprint and
         facing in camera metres) for camera i: the convenience the tools and the fallback build use (one world, 4 cameras).
     worldCameraBearing(cam, x, z) -> the compass bearing of a camera-frame point (backdrop bearings come from the camera, W5).
     worldScreenBox(ent, cam, o) -> { box: [X0, Y0, X1, Y1], z, near, persp } | null   what an entity covers on screen, from
         the view it is drawn with (appearance's worldViewOf): a long hull in perspective (its footprint prism), a sprite
         (its view object's box at its real size), or a footprint prism (buildings, line pieces). near: the footprint crosses
         the near plane (the thing passes beside or under the lens).
     worldFrameCheck(world, cam, o) -> { ok, issues: [{ id, obj, cls, size, cut: [edges], box, fix: { action, to, facing, by } }],
         log }   C1: no entity larger than about 25 % of the frame (visible area > 25 %, or a full width or height over 60 %:
         the long flat slab) is cut by a frame edge, unless it is framing (trees, boughs, fronds, hedges, fences, walls,
         reeds, buildings and line pieces: the wall edge; anything with framing / framed / auto 'frame'). The fix, in order:
         move along its habitat (a boat along its bank, others to the nearest legal spot, preferring farther away), turn to a
         view that fits (free-orientation things only), else drop. o: { apply (mutate the world and log), agents (report
         movers too), frame: [X0, Y0, X1, Y1] }. Landmarks are never moved: their issue carries fix 'aim' (C4).
     worldLandmarkCheck(world, cam, o) -> { ok, landmarks: [{ id, obj, ok, visible, tile, cropped, dwarfed, occluders, msg, fix }] }
         C4 and section 19 (tiny screens): each declared landmark shows >= 60 % of its main face (inside the frame and not
         hidden by nearer statics), also inside the square tile crop, and is neither dwarfed (< 4 % of the frame height) nor
         cropped (> 10 % of its face outside the frame). o: { season, apply: clear the face (auto-placed occluders dropped,
         soft authored ones moved aside along their habitat or dropped; buildings and structures never touched), logged }.
     worldOverscan(cam, aspect, o) -> { aspect, box, extend, crop, hfov, dNear, xAt(z), contains(X, Y), vs, ox, oy }
         Q6: the region of the world a frame of that aspect shows, never stretched (one uniform scale). aspect: a number,
         a name of WORLD_OVERSCAN_FRAMES, { W, H } (adds vs, ox, oy: device = vs * scene + o) or 'all' (the union every
         frame needs: what the fill, the ground and the backdrop must cover). Wide frames (21:9) show more world to the
         sides at the full height; the tile is the square crop of C4; tall phones show a centred column with more sky and
         foreground.
   ============================================================ */
const WORLD_CAMERA_W = 1600, WORLD_CAMERA_H = 900;
/** The frames the engine must fill (Q6, R3): aspect ratios by name. 4K is 16:9 with more pixels (R3 keeps it sharp). */
const WORLD_OVERSCAN_FRAMES = Object.freeze({ '21:9': 21 / 9, '32:9': 32 / 9, '16:9': 16 / 9, '4k': 16 / 9, '16:10': 16 / 10, '4:3': 4 / 3, tile: 1, square: 1,
  phone: 9 / 19.5, 'phone-land': 19.5 / 9 });
/** Classes that may be cut by a frame edge (C1: boughs, trunks, hedges, wall edges): framing elements. */
const WORLD_FRAMING_CLASSES = Object.freeze(['tree', 'bough', 'branch', 'frond', 'hedge', 'fence', 'wall', 'railing', 'reed', 'shrub', 'cover', 'building', 'line', 'kerb', 'coping']);
const _WCM_DEG = Math.PI / 180;
const _wcmNum = v => typeof v === 'number' && Number.isFinite(v);
const _wcmPt = p => Array.isArray(p) && p.length >= 2 && _wcmNum(p[0]) && _wcmNum(p[1]);
const _wcmObj = v => v != null && typeof v === 'object' && !Array.isArray(v);
const _wcmClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _wcmR = (v, n) => { const k = Math.pow(10, n == null ? 3 : n); return Math.round(v * k) / k + 0; };
const _wcm360 = d => ((d % 360) + 360) % 360;
const _wcm180 = d => ((((d % 360) + 540) % 360) - 180);

/* ---------- geography: the place origin and metres per degree ---------- */
function _wcmOrigin(spec) {
  const P = spec && _wcmObj(spec.place) ? spec.place : {};
  if (Array.isArray(P.origin) && _wcmNum(P.origin[0]) && _wcmNum(P.origin[1])) return { lat: P.origin[0], lon: P.origin[1], alt: _wcmNum(P.alt) ? P.alt : null };
  if (_wcmObj(P.origin) && _wcmNum(P.origin.lat) && _wcmNum(P.origin.lon)) return { lat: P.origin.lat, lon: P.origin.lon, alt: _wcmNum(P.alt) ? P.alt : null };
  if (_wcmNum(P.lat) && _wcmNum(P.lon)) return { lat: P.lat, lon: P.lon, alt: _wcmNum(P.alt) ? P.alt : null };
  return null;
}
/** Metres per degree of latitude and longitude at a latitude (WGS84 series). */
function _wcmMpd(lat) {
  const p = lat * _WCM_DEG;
  return [111132.92 - 559.82 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p), 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p)];
}
function _wcmLL2XZ(org, lat, lon) { const m = _wcmMpd(org.lat); return [(lon - org.lon) * m[1], (lat - org.lat) * m[0]]; }
function _wcmXZ2LL(org, x, z) { const m = _wcmMpd(org.lat); return [org.lat + z / m[0], org.lon + x / m[1]]; }
/** Is a camera `at` given as [lat, lon]? Yes when the spec has an origin and the pair lies within half a degree of it. */
function _wcmIsLL(org, p) { return !!org && _wcmPt(p) && Math.abs(p[0] - org.lat) < 0.5 && Math.abs(p[1] - org.lon) < 0.5 && Math.abs(p[0]) <= 90; }

/* ---------- lens ---------- */
const _wcmF = fov => (WORLD_CAMERA_W / 2) / Math.tan(_wcmClamp(fov, 10, 150) * _WCM_DEG / 2);
const _wcmHorizonOf = (pitch, f) => WORLD_CAMERA_H / 2 + f * Math.tan(pitch * _WCM_DEG);
const _wcmPitchOf = (horizon, f) => Math.atan((horizon - WORLD_CAMERA_H / 2) / f) / _WCM_DEG;
/** The default horizon row for an eye height (the v2 presets: about 465 at eye level, lower from a bridge or a hill). */
const _wcmHorizonDefault = h => _wcmClamp(465 - 9 * Math.max(0, h - 1.7), 300, 470);

/* ---------- the cameras of a spec ---------- */
function _wcmIsV31(spec) { return !!spec && Array.isArray(spec.cameras) && spec.cameras.length > 0; }
/** The camera entry i (index or id) of a spec: { c, index, v31 }. */
function _wcmPick(spec, i) {
  if (_wcmIsV31(spec)) {
    const list = spec.cameras;
    let k = typeof i === 'string' ? list.findIndex(c => c && c.id === i) : _wcmNum(i) ? Math.floor(i) : 0;
    if (!(k >= 0 && k < list.length)) k = 0;
    return { c: _wcmObj(list[k]) ? list[k] : {}, index: k, v31: true };
  }
  return { c: spec && _wcmObj(spec.camera) ? spec.camera : {}, index: 0, v31: false };
}
/** Everything a camera can aim at, in place metres: entities, landmarks and buildings with ids. -> { x, z, h, w, d, facing, kind, y } */
function _wcmTargets(spec) {
  const out = new Map();
  const add = (e, kind) => {
    if (!_wcmObj(e) || typeof e.id !== 'string') return;
    if (_wcmPt(e.at)) {
      const info = typeof worldObjectInfo === 'function' && typeof e.obj === 'string' ? worldObjectInfo(e.obj) : null;
      const sz = info && info.size ? info.size : { w: 2, d: 2, h: 2 };
      out.set(e.id, { x: e.at[0], z: e.at[1], h: sz.h, w: sz.w, d: sz.d, facing: _wcmNum(e.facing) ? e.facing : null, kind, obj: e.obj || null, y: 0 });
    } else if (Array.isArray(e.foot) && e.foot.length >= 3 && e.foot.every(_wcmPt)) {
      const xs = e.foot.map(p => p[0]), zs = e.foot.map(p => p[1]);
      const h = _wcmNum(e.h) ? e.h : _wcmNum(e.storeys) ? e.storeys * 3 + 2 : 8;
      out.set(e.id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2, h, w: Math.max(...xs) - Math.min(...xs), d: Math.max(...zs) - Math.min(...zs), facing: null, kind, foot: e.foot, y: 0 });
    }
  };
  for (const e of (spec && Array.isArray(spec.entities) ? spec.entities : [])) add(e, 'entity');
  for (const e of (spec && Array.isArray(spec.buildings) ? spec.buildings : [])) add(e, 'building');
  for (const e of (spec && Array.isArray(spec.landmarks) ? spec.landmarks : [])) add(e, 'landmark');
  return out;
}
/** The bearing (compass degrees) from a place point to another. */
const _wcmBearing = (ax, az, bx, bz) => _wcm360(Math.atan2(bx - ax, bz - az) / _WCM_DEG);
/** Is a place point on water (by the spec's surfaces, later wins)? */
function _wcmOnWater(spec, x, z) {
  const S = spec && Array.isArray(spec.surfaces) ? spec.surfaces : [];
  for (let i = S.length - 1; i >= 0; i--) { const s = S[i]; if (_wcmObj(s) && _wcmSurfHas(s, x, z)) return s.kind === 'water'; }
  return false;
}
function _wcmInPoly(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / ((b[1] - a[1]) || 1e-12) + a[0]) c = !c; }
  return c;
}
function _wcmSegD(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? _wcmClamp(((px - a[0]) * dx + (pz - a[1]) * dz) / L, 0, 1) : 0; return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); }
function _wcmSurfHas(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wcmInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2 && s.width > 0) { let d = Infinity; for (let i = 1; i < s.path.length; i++) d = Math.min(d, _wcmSegD(x, z, s.path[i - 1], s.path[i])); return d <= s.width / 2; }
  return false;
}

/**
 * The v2 camera block of camera i, by intent (Q1, W5). See the file header. Never throws.
 */
function worldCameraResolve(spec, i, o) {
  o = o || {};
  const log = [], note = (rule, reason) => { const r = { id: 'camera', action: 'default', rule, reason, by: 'appearance' }; log.push(r); if (Array.isArray(o.log)) o.log.push(r); };
  const pick = _wcmPick(spec, i), c = pick.c, org = _wcmOrigin(spec);
  // a preset fills what the author left out (v2 presets: eye, fov, horizon)
  let pre = null;
  if (typeof c.preset === 'string' && typeof sceneCameraPreset === 'function') { try { pre = sceneCameraPreset(c.preset, {}); } catch (e) { pre = null; } }
  const ms = _wcmNum(o.ms) ? o.ms : o.ctx && _wcmNum(o.ctx.ms) ? o.ctx.ms : null;

  if (!pick.v31) {
    // v3.0: the spec is already in this camera's frame (camera at its origin); the block is the authored camera, the pitch derived
    const fov = _wcmNum(c.fov) ? _wcmClamp(c.fov, 10, 150) : pre ? pre.fov : 66, f = _wcmF(fov);
    const eye = _wcmNum(c.eye) && c.eye > 0 ? c.eye : pre ? pre.eye : 1.65;
    const horizon = _wcmNum(c.horizon) ? _wcmClamp(c.horizon, -1000, 880) : pre ? pre.horizon : _wcmHorizonDefault(eye);
    const heading = _wcm360(_wcmNum(c.heading) ? c.heading : 180);
    const block = { eye, fov, horizon: _wcmR(horizon, 1), heading, x0: _wcmNum(c.x0) ? c.x0 : WORLD_CAMERA_W / 2, f: _wcmR(f, 3), pitch: _wcmR(_wcmPitchOf(horizon, f), 3), height: eye,
      pos: [0, 0], id: c.id || 'camera', index: 0, src: 'v3.0', log };
    const lat = _wcmNum(c.lat) ? c.lat : org ? org.lat : null, lon = _wcmNum(c.lon) ? c.lon : org ? org.lon : null;
    if (lat != null) block.lat = lat;
    if (lon != null) block.lon = lon;
    if (_wcmNum(c.alt)) block.alt = c.alt; else if (org && org.alt != null) block.alt = org.alt;
    if (_wcmNum(c.water)) block.water = c.water;
    if (c.preset) block.preset = c.preset;
    if (ms != null) block.ms = ms;
    return _wcmV2(block);
  }

  // ---- v3.1: a camera by intent in the place frame ----
  let pos = null, at = c.at;
  if (_wcmIsLL(org, at)) pos = _wcmLL2XZ(org, at[0], at[1]);
  else if (_wcmPt(at)) pos = [at[0], at[1]];
  else if (_wcmNum(c.lat) && _wcmNum(c.lon) && org) pos = _wcmLL2XZ(org, c.lat, c.lon);
  const height = _wcmNum(c.height) && c.height > 0 ? c.height : _wcmNum(c.eye) && c.eye > 0 ? c.eye : pre ? pre.eye : 1.65;
  const fovGiven = _wcmNum(c.fov);
  let fov = fovGiven ? _wcmClamp(c.fov, 10, 150) : pre ? pre.fov : 62;
  const T = _wcmTargets(spec);
  // the subjects: lookAt (one id) or frame (ids)
  let subjects = [];
  if (Array.isArray(c.frame)) { for (const id of c.frame) { const t = T.get(id); if (t) subjects.push(Object.assign({ id }, t)); else note('unknownFrame', `frame names ${JSON.stringify(id)}, which is not an entity, landmark or building id`); } }
  let lookBearing = null;
  if (typeof c.lookAt === 'string') { const t = T.get(c.lookAt); if (t) subjects = [Object.assign({ id: c.lookAt }, t)]; else note('unknownLookAt', `lookAt ${JSON.stringify(c.lookAt)} is not an entity, landmark or building id; looking at the place instead`); }
  else if (_wcmNum(c.lookAt)) lookBearing = _wcm360(c.lookAt);
  // frame without a position: stand in front of the subjects' faces, far enough to fit them
  if (!pos && subjects.length) {
    const cx = subjects.reduce((s, t) => s + t.x, 0) / subjects.length, cz = subjects.reduce((s, t) => s + t.z, 0) / subjects.length;
    const faced = subjects.filter(t => _wcmNum(t.facing));
    let dir;
    if (faced.length) { const sx = faced.reduce((s, t) => s + Math.sin(t.facing * _WCM_DEG), 0), sz = faced.reduce((s, t) => s + Math.cos(t.facing * _WCM_DEG), 0); dir = Math.hypot(sx, sz) > 1e-6 ? Math.atan2(sx, sz) / _WCM_DEG : null; }
    if (dir == null) dir = Math.hypot(cx, cz) > 1 ? _wcmBearing(cx, cz, 0, 0) : 180;   // from the subjects back towards the place origin
    // the distance that fits the subjects' spread (75 % of the width) and height (60 % of the height)
    let spread = 0, top = 0;
    for (const t of subjects) { spread = Math.max(spread, Math.hypot(t.x - cx, t.z - cz) * 2 + Math.max(t.w, t.d)); top = Math.max(top, t.h); }
    const hf = (fov / 2) * _WCM_DEG, vf = Math.atan(Math.tan(hf) * WORLD_CAMERA_H / WORLD_CAMERA_W);
    let D = Math.max(spread / 2 / Math.tan(hf * 0.75), top / Math.tan(vf * 0.6) / 1.6, 8);
    let px = cx + D * Math.sin(dir * _WCM_DEG), pz = cz + D * Math.cos(dir * _WCM_DEG);
    for (let k = 0; k < 12 && _wcmOnWater(spec, px, pz); k++) { D *= 1.15; px = cx + D * Math.sin(dir * _WCM_DEG); pz = cz + D * Math.cos(dir * _WCM_DEG); }
    if (_wcmOnWater(spec, px, pz)) note('cameraOnWater', 'no dry standpoint found in front of the subjects; the camera stands over the water');
    pos = [px, pz];
  }
  if (!pos) { pos = [0, 0]; if (!_wcmPt(at)) note('cameraAt', 'the camera has no position (at); it stands at the place origin'); }
  const eye = height + (typeof o.groundAt === 'function' ? (Number(o.groundAt(pos[0], pos[1])) || 0) : 0);
  // heading: authored > lookAt / frame subjects > lookAt bearing > towards the place origin > north
  let heading;
  if (_wcmNum(c.heading)) heading = _wcm360(c.heading);
  else if (subjects.length) {
    // centre the subjects: the bearing to the middle of their angular span
    const bs = subjects.map(t => _wcm180(_wcmBearing(pos[0], pos[1], t.x, t.z) - _wcmBearing(pos[0], pos[1], subjects[0].x, subjects[0].z)));
    heading = _wcm360(_wcmBearing(pos[0], pos[1], subjects[0].x, subjects[0].z) + (Math.min(...bs) + Math.max(...bs)) / 2);
  } else if (lookBearing != null) heading = lookBearing;
  else heading = Math.hypot(pos[0], pos[1]) > 1 ? _wcmBearing(pos[0], pos[1], 0, 0) : 0;
  // camera-frame coordinates of the subjects (for fitting)
  const H = heading * _WCM_DEG, toCam = (x, z) => { const dx = x - pos[0], dz = z - pos[1]; return [dx * Math.cos(H) - dz * Math.sin(H), dx * Math.sin(H) + dz * Math.cos(H)]; };
  const sub = subjects.map(t => { const p = toCam(t.x, t.z); return Object.assign({}, t, { cx: p[0], cz: p[1] }); }).filter(t => t.cz > 0.5);
  // fit the width: widen the fov (when the author gave none) so the subjects span <= 80 % of the frame width
  if (sub.length && !fovGiven) {
    let need = 0;
    for (const t of sub) { const r = Math.max(t.w, t.d) / 2; need = Math.max(need, Math.abs(Math.atan2(t.cx + r, t.cz)), Math.abs(Math.atan2(t.cx - r, t.cz))); }
    const want = 2 * Math.atan(Math.tan(need) / 0.8) / _WCM_DEG;
    if (want > fov) fov = _wcmClamp(want, fov, 100);
  }
  let f = _wcmF(fov);
  // the horizon: authored horizon > authored pitch > fitted to the subjects > the default for the height
  let horizon;
  if (_wcmNum(c.horizon)) horizon = _wcmClamp(c.horizon, -1000, 880);
  else if (_wcmNum(c.pitch)) horizon = _wcmHorizonOf(_wcmClamp(c.pitch, -60, 60), f);
  else {
    horizon = pre ? pre.horizon : _wcmHorizonDefault(height);
    if (sub.length) {
      // top >= 8 % from the top edge; base above 95 % of the height; keep a sky share (horizon 200..700)
      const fit = (ff) => {
        let lo = -Infinity, hi = Infinity;
        for (const t of sub) { const yb = t.y || 0, yt = yb + t.h; lo = Math.max(lo, 0.08 * WORLD_CAMERA_H - ff * (eye - yt) / t.cz); hi = Math.min(hi, 0.95 * WORLD_CAMERA_H - ff * (eye - yb) / t.cz); }
        return [lo, hi];
      };
      let [lo, hi] = fit(f);
      if (lo > hi && !fovGiven) {
        for (let k = 0; k < 20 && lo > hi; k++) { fov = Math.min(100, fov * 1.08); f = _wcmF(fov); [lo, hi] = fit(f); }
      }
      if (lo > hi) note('subjectTooTall', 'the subject does not fit the frame vertically; it is centred and will be cropped (C4 reports it)');
      horizon = lo > hi ? (lo + hi) / 2 : _wcmClamp(horizon, lo, hi);
      horizon = _wcmClamp(horizon, 200, 700);
    }
  }
  const ll = org ? _wcmXZ2LL(org, pos[0], pos[1]) : null;
  const block = { eye: _wcmR(eye, 3), fov: _wcmR(fov, 2), horizon: _wcmR(horizon, 1), heading: _wcmR(heading, 3), x0: WORLD_CAMERA_W / 2, f: _wcmR(f, 3),
    pitch: _wcmR(_wcmPitchOf(horizon, f), 3), height: _wcmR(height, 3), pos: [_wcmR(pos[0], 3), _wcmR(pos[1], 3)], id: c.id || 'cam' + pick.index, index: pick.index, src: 'intent', log };
  if (ll) { block.lat = _wcmR(ll[0], 7); block.lon = _wcmR(ll[1], 7); }
  if (org && org.alt != null) block.alt = _wcmR(org.alt + eye, 2);
  if (_wcmNum(c.water)) block.water = c.water;
  if (c.preset) block.preset = c.preset;
  if (typeof c.lookAt === 'string' || _wcmNum(c.lookAt)) block.lookAt = c.lookAt;
  if (Array.isArray(c.frame)) block.frame = c.frame.slice();
  if (ms != null) block.ms = ms;
  return _wcmV2(block);
}
/** block.camera: exactly the keys the v2 camera reads (sense builds the world's camera from it: sceneCamera({ camera })). */
function _wcmV2(block) {
  const c = {};
  for (const k of ['eye', 'fov', 'horizon', 'heading', 'x0', 'lat', 'lon', 'alt', 'water', 'preset']) if (block[k] != null) c[k] = block[k];
  block.camera = c;
  return block;
}

/**
 * The place -> camera transform of camera i (Q7). For a v3.0 spec the identity. Pure; never throws.
 */
function worldCameraXform(spec, i, o) {
  const cam = worldCameraResolve(spec, i, o);
  if (!_wcmIsV31(spec)) {
    const id2 = (x, z) => [x, z];
    return { identity: true, cam, heading: cam.heading, pos: [0, 0], toCam: id2, toPlace: id2, facing: d => d, facingToPlace: d => d, pts: list => (Array.isArray(list) ? list.map(p => [p[0], p[1]]) : list) };
  }
  const H = cam.heading * _WCM_DEG, ch = Math.cos(H), sh = Math.sin(H), cx = cam.pos[0], cz = cam.pos[1];
  const toCam = (x, z) => { const dx = x - cx, dz = z - cz; return [_wcmR(dx * ch - dz * sh, 4), _wcmR(dx * sh + dz * ch, 4)]; };
  const toPlace = (x, z) => [_wcmR(cx + x * ch + z * sh, 4), _wcmR(cz - x * sh + z * ch, 4)];
  return { identity: false, cam, heading: cam.heading, pos: cam.pos.slice(), toCam, toPlace,
    facing: d => (_wcmNum(d) ? _wcm360(d - cam.heading) : d), facingToPlace: d => (_wcmNum(d) ? _wcm360(d + cam.heading) : d),
    pts: list => (Array.isArray(list) ? list.map(p => (_wcmPt(p) ? toCam(p[0], p[1]) : p)) : list) };
}

/** The compass bearing of a camera-frame point (W5: backdrop bearings come from the camera's heading). */
function worldCameraBearing(cam, x, z) { return _wcm360((cam && _wcmNum(cam.heading) ? cam.heading : 0) + Math.atan2(x, z) / _WCM_DEG); }

/**
 * A camera-frame spec for camera i: one `camera` (the resolved v2 block), every point, polygon, path, footprint and facing in
 * camera metres. Keys it does not know are copied unchanged (bearings stay compass bearings). o.keep: keep `cameras`.
 */
function worldCameraSpec(spec, i, o) {
  o = o || {};
  if (!_wcmObj(spec)) return spec;
  const X = worldCameraXform(spec, i, o), cam = X.cam;
  const out = {};
  for (const k of Object.keys(spec)) if (k !== 'cameras' || o.keep) out[k] = spec[k];
  const block = { eye: cam.eye, fov: cam.fov, horizon: cam.horizon, heading: cam.heading, x0: cam.x0 };
  for (const k of ['lat', 'lon', 'alt', 'water', 'preset']) if (cam[k] != null) block[k] = cam[k];
  out.camera = block;
  if (X.identity) return out;
  out.v = 3;
  const P = p => (_wcmPt(p) ? X.toCam(p[0], p[1]) : p);
  const pts = L => (Array.isArray(L) ? L.map(P) : L);
  const surf = s => { if (!_wcmObj(s)) return s; const r = Object.assign({}, s); if (Array.isArray(s.poly)) r.poly = pts(s.poly); if (Array.isArray(s.path)) r.path = pts(s.path); return r; };
  const ent = e => {
    if (!_wcmObj(e)) return e;
    const r = Object.assign({}, e);
    if (_wcmPt(e.at)) r.at = P(e.at);
    if (_wcmNum(e.facing)) r.facing = X.facing(e.facing);
    if (Array.isArray(e.foot)) r.foot = pts(e.foot);
    if (Array.isArray(e.path)) r.path = pts(e.path);
    return r;
  };
  if (Array.isArray(spec.surfaces)) out.surfaces = spec.surfaces.map(surf);
  for (const k of ['entities', 'landmarks', 'buildings', 'lines']) if (Array.isArray(spec[k])) out[k] = spec[k].map(ent);
  if (Array.isArray(spec.life)) out.life = spec.life.map(L => {
    if (!_wcmObj(L)) return L;
    const r = Object.assign({}, L);
    if (Array.isArray(L.goals)) r.goals = L.goals.map(g => { if (!_wcmObj(g)) return g; const q = Object.assign({}, g); for (const v of ['go', 'view', 'feed', 'fish']) if (_wcmPt(g[v])) q[v] = P(g[v]); return q; });
    return r;
  });
  if (_wcmObj(spec.ground)) {
    const g = Object.assign({}, spec.ground);
    if (Array.isArray(spec.ground.features)) g.features = spec.ground.features.map(ent);
    out.ground = g;
  }
  if (_wcmObj(spec.place)) { const p = Object.assign({}, spec.place); delete p.origin; out.place = p; }
  return out;
}

/* ---------- screen boxes ---------- */
function _wcmProj(cam, x, z, y) {
  if (typeof sceneProject === 'function' && cam && _wcmNum(cam.f)) return sceneProject(cam, x, z, y);
  const k = cam.f / Math.max(0.01, z);
  return { X: (cam.x0 != null ? cam.x0 : 800) + k * x, Y: cam.horizon + k * (cam.eye - (y || 0)), k };
}
const _wcmNear = cam => Math.max(0.3, (cam && cam.dMin ? cam.dMin : 1) * 0.25);
/** The screen box of a footprint prism (base y0, height h), clipped at the near plane. */
function _wcmPrismBox(cam, foot, y0, h) {
  const near = _wcmNear(cam), pts = [];
  let crosses = false;
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i], b = foot[(i + 1) % foot.length];
    if (a[1] >= near) pts.push(a); else crosses = true;
    if ((a[1] >= near) !== (b[1] >= near)) { const t = (near - a[1]) / (b[1] - a[1]); pts.push([a[0] + (b[0] - a[0]) * t, near]); }
  }
  if (!pts.length) return null;
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const p of pts) for (const y of [y0, y0 + h]) { const q = _wcmProj(cam, p[0], p[1], y); X0 = Math.min(X0, q.X); X1 = Math.max(X1, q.X); Y0 = Math.min(Y0, q.Y); Y1 = Math.max(Y1, q.Y); }
  return { box: [X0, Y0, X1, Y1], near: crosses, z: Math.min(...pts.map(p => p[1])) };
}
function _wcmInfo(obj) { return typeof worldObjectInfo === 'function' && typeof obj === 'string' ? worldObjectInfo(obj) : null; }
/** The sprite box of an object id at scale s (object units: anchor at the foot, y up negative). */
function _wcmArtBox(obj, v) {
  let b = null;
  if (typeof sceneObjShapes === 'function') { try { const sh = sceneObjShapes(obj, v | 0, 'summer'); if (sh && Array.isArray(sh.box)) b = sh.box; } catch (e) { b = null; } }
  if (!b && typeof sceneObj === 'function') { const d = sceneObj(obj); if (d && Array.isArray(d.size)) b = [-d.size[0] / 2, -d.size[1], d.size[0] / 2, 0]; }
  return b;
}
/**
 * What an entity covers on screen (see the header). ent in camera metres: { obj, x, z, y, foot, height, facing, view, mirror }.
 */
function worldScreenBox(ent, cam, o) {
  o = o || {};
  if (!ent || !cam || !_wcmNum(cam.f)) return null;
  const info = _wcmInfo(ent.obj), h = _wcmNum(ent.height) && ent.height > 0 ? ent.height : info && info.size ? info.size.h : 1.5;
  const y0 = _wcmNum(ent.y) ? ent.y : 0;
  let v = null;
  if (ent.obj && typeof worldViewOf === 'function') { try { v = worldViewOf(ent, cam, { keep: true }); } catch (e) { v = null; } }
  // prisms: long hulls drawn in perspective, footprint things without art (line pieces, buildings)
  if (Array.isArray(ent.foot) && ent.foot.length >= 3 && ((v && v.persp) || !ent.obj)) {
    const r = _wcmPrismBox(cam, ent.foot, y0, h);
    return r ? Object.assign(r, { persp: true }) : null;
  }
  if (!(ent.z > _wcmNear(cam))) {
    if (Array.isArray(ent.foot) && ent.foot.length >= 3) { const r = _wcmPrismBox(cam, ent.foot, y0, h); return r ? Object.assign(r, { persp: false }) : null; }
    return null;
  }
  const obj = v && v.obj ? v.obj : ent.obj, def = typeof sceneObj === 'function' && obj ? sceneObj(obj) : null;
  const art = obj ? _wcmArtBox(obj, v && v.variant != null ? v.variant : ent.variant) : null;
  if (!def || !art || !Array.isArray(def.size) || !(def.size[1] > 0)) {
    const k = cam.f / ent.z, P = _wcmProj(cam, ent.x, ent.z, y0), w = (info && info.size ? info.size.w : h * 0.5) * k;
    return { box: [P.X - w / 2, P.Y - h * k, P.X + w / 2, P.Y], z: ent.z, near: false, persp: false };
  }
  const s = (cam.f / ent.z) * h / def.size[1], P = _wcmProj(cam, ent.x, ent.z, y0), flip = v ? !!v.mirror : !!ent.mirror;
  const bx0 = flip ? -art[2] : art[0], bx1 = flip ? -art[0] : art[2];
  return { box: [P.X + bx0 * s, P.Y + art[1] * s, P.X + bx1 * s, P.Y + art[3] * s], z: ent.z, near: false, persp: false, s, anchor: [P.X, P.Y], flip, obj,
    variant: v && v.variant != null ? v.variant : ent.variant };
}

/* ---------- C1: the frame check ---------- */
const _wcmFrame = o => (o && Array.isArray(o.frame) && o.frame.length === 4 ? o.frame : [0, 0, WORLD_CAMERA_W, WORLD_CAMERA_H]);
function _wcmIsFraming(e) {
  if (!e) return false;
  if (e.framing === true || e.framed === true || e.auto === 'frame' || e.kind === 'line' || e.line) return true;
  const cls = e.cls || (_wcmInfo(e.obj) || {}).cls;
  return WORLD_FRAMING_CLASSES.includes(cls) || /^(tree|plant\.hedge|plant\.reed)/.test(String(e.obj || '')) && cls !== 'boat';
}
/** How big and how cut a box is in a frame: { size, vis, cut: ['left', ...] }. size: the C1 measure (see the header). */
function _wcmCut(b, F) {
  const W = F[2] - F[0], H = F[3] - F[1], A = W * H;
  const vis = Math.max(0, Math.min(F[2], b[2]) - Math.max(F[0], b[0])) * Math.max(0, Math.min(F[3], b[3]) - Math.max(F[1], b[1])) / A;
  const wS = (b[2] - b[0]) / W, hS = (b[3] - b[1]) / H, size = Math.max(vis, wS * 0.25 / 0.6, hS * 0.25 / 0.6);
  const tx = Math.max(4, 0.02 * (b[2] - b[0])), ty = Math.max(4, 0.02 * (b[3] - b[1])), cut = [];
  if (vis > 0) {
    if (b[0] < F[0] - tx) cut.push('left');
    if (b[2] > F[2] + tx) cut.push('right');
    if (b[1] < F[1] - ty) cut.push('top');
    if (b[3] > F[3] + ty) cut.push('bottom');
  }
  return { size, vis, cut };
}
/** Does an entity at its current pose break C1? -> null (fine) or { size, cut, box }. */
function _wcmBreaks(ent, cam, F) {
  const r = worldScreenBox(ent, cam);
  if (!r) return null;
  const c = _wcmCut(r.box, F);
  if (r.near && c.vis > 0 && !c.cut.length) c.cut.push('bottom');
  return c.size >= 0.25 && c.cut.length ? { size: c.size, vis: c.vis, cut: c.cut, box: r.box } : null;
}
/** Convex penetration depth (separating axis), 0 when apart. */
function _wcmPen(A, B) {
  let best = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = -(b[1] - a[1]), nz = b[0] - a[0], L = Math.hypot(nx, nz);
    if (!L) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = (q[0] * nx + q[1] * nz) / L; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
    for (const q of B) { const v = (q[0] * nx + q[1] * nz) / L; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
    const ov = Math.min(a1, b1) - Math.max(a0, b0);
    if (ov <= 0) return 0;
    best = Math.min(best, ov);
  }
  return best === Infinity ? 0 : best;
}
/** The surface of the world under a point, ignoring entities (later surfaces win). */
function _wcmSurfAt(world, x, z) {
  const S = world && Array.isArray(world.surfaces) ? world.surfaces : [];
  for (let i = S.length - 1; i >= 0; i--) if (_wcmObj(S[i]) && _wcmSurfHas(S[i], x, z)) return S[i];
  return null;
}
/** Is (x, z, facing) a legal spot for ent? sense's worldPlaceOk when loaded, else habitat by the original surface kind + no overlap. */
function _wcmLegal(world, ent, x, z, facing, foot) {
  if (typeof worldPlaceOk === 'function') {
    try { const r = worldPlaceOk(world, ent, x, z, facing); if (r && typeof r.ok === 'boolean') return r.ok; } catch (e) { /* the fallback */ }
  }
  const floats = /^water/.test(String(ent.attach || '')) || ent.cls === 'boat';
  const here = _wcmSurfAt(world, ent.x, ent.z), kind0 = here ? here.kind : null;
  const pts = foot.concat([[x, z]]);
  for (const p of pts) {
    const s = _wcmSurfAt(world, p[0], p[1]), k = s ? s.kind : null;
    if (floats ? k !== 'water' : (k === 'water' || k !== kind0)) return false;
  }
  if (ent.solidity === 'solid') for (const o2 of world.entities || []) {
    if (o2 === ent || o2.solidity !== 'solid' || !Array.isArray(o2.foot) || /^(air|deck|wall)/.test(String(o2.attach || ''))) continue;
    if (Math.abs(o2.z - z) > 60) continue;
    if (_wcmPen(o2.foot, foot) > 0.05) return false;
  }
  return true;
}
const _wcmShift = (poly, dx, dz) => poly.map(p => [_wcmR(p[0] + dx, 3), _wcmR(p[1] + dz, 3)]);
function _wcmRotFoot(foot, cx, cz, deg) {
  const a = deg * _WCM_DEG, c = Math.cos(a), s = Math.sin(a);
  // facing rotates clockwise (0 = +z, 90 = +x): a point (u, v) about the centre turns the same way
  return foot.map(p => { const u = p[0] - cx, v = p[1] - cz; return [_wcmR(cx + u * c + v * s, 3), _wcmR(cz - u * s + v * c, 3)]; });
}
function _wcmOrientFree(ent) {
  if (typeof worldKb === 'function') { try { const kb = worldKb(ent.obj); if (kb && kb.orient) return kb.orient === 'free'; } catch (e) { /* by class */ } }
  return !['boat', 'vehicle', 'train', 'tram', 'bench', 'gate', 'fence', 'walkway', 'weir', 'building', 'landmark', 'structure'].includes(ent.cls);
}
/** The C1 fix for one entity: move along its habitat, turn, else drop. -> { action, to, facing, shift } */
function _wcmFix(world, ent, cam, F) {
  const foot0 = Array.isArray(ent.foot) && ent.foot.length >= 3 ? ent.foot : [[ent.x, ent.z]];
  const test = (x, z, facing, foot) => {
    if (!_wcmLegal(world, ent, x, z, facing, foot)) return false;
    return !_wcmBreaks(Object.assign({}, ent, { x, z, facing, foot, view: null }), cam, F);
  };
  // 1. move along the habitat: a hull along its own axis (parallel to its bank); others outward in rings, farther first
  const cands = [];
  if (ent.cls === 'boat' || ent.cls === 'train' || ent.cls === 'tram' || ent.cls === 'vehicle') {
    const f = (_wcmNum(ent.facing) ? ent.facing : 0) * _WCM_DEG, ax = Math.sin(f), az = Math.cos(f);
    const L = ent.size && ent.size.w ? ent.size.w : 10, maxS = Math.max(30, 3 * L);
    for (let s = 0.5; s <= maxS; s += s < 6 ? 0.5 : 1) for (const sg of [1, -1]) cands.push([ax * s * sg, az * s * sg, s]);
  } else {
    for (let r = 0.5; r <= 8; r += 0.5) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; cands.push([Math.sin(a) * r, Math.cos(a) * r, r - 0.05 * Math.cos(a)]); }
  }
  cands.sort((p, q) => {
    const fp = p[1] >= 0 ? 0 : 0.25, fq = q[1] >= 0 ? 0 : 0.25;   // prefer farther (smaller, fits): a small tie-break
    return (p[2] + fp) - (q[2] + fq);
  });
  for (const [dx, dz] of cands) {
    const x = ent.x + dx, z = ent.z + dz;
    if (!(z > _wcmNear(cam))) continue;
    const foot = _wcmShift(foot0, dx, dz);
    if (test(x, z, ent.facing, foot)) return { action: 'move', to: [_wcmR(x, 3), _wcmR(z, 3)], shift: [_wcmR(dx, 3), _wcmR(dz, 3)], facing: ent.facing, foot };
  }
  // 2. turn to a view that fits (free orientation only): end-on to the eye first, then the three-quarter views
  if (_wcmOrientFree(ent)) {
    const b = Math.atan2(ent.x, ent.z) / _WCM_DEG;
    for (const d of [0, 180, 45, -45, 135, -135]) {
      const facing = _wcm360(b + d), foot = _wcmRotFoot(foot0, ent.x, ent.z, facing - (_wcmNum(ent.facing) ? ent.facing : 0));
      if (test(ent.x, ent.z, facing, foot)) return { action: 'rotate', to: [ent.x, ent.z], facing, foot };
    }
  }
  return { action: 'drop' };
}
function _wcmLog(world, rec) {
  if (!world) return;
  if (!Array.isArray(world.log)) world.log = [];
  world.log.push(rec);
}
/**
 * C1 (see the header). world and cam in camera metres (cam: the v2 camera; world.cam when omitted).
 */
function worldFrameCheck(world, cam, o) {
  o = o || {};
  cam = cam || (world && world.cam);
  const out = { ok: true, issues: [], log: [] };
  if (!world || !cam || !_wcmNum(cam.f)) return out;
  const F = _wcmFrame(o), ents = Array.isArray(world.entities) ? world.entities.slice() : [];
  const list = ents.concat(o.agents ? (o.agents || []).map(a => Object.assign({ agent: true }, a)) : []);
  for (const e of list) {
    if (!e || e.backdrop || _wcmIsFraming(e)) continue;
    if (e.agent && (e.framed || e.layer === 'air')) continue;
    const br = _wcmBreaks(e, cam, F);
    if (!br) continue;
    const issue = { id: e.id != null ? e.id : null, obj: e.obj || null, cls: e.cls || null, size: _wcmR(br.size, 3), cut: br.cut, box: br.box.map(v => _wcmR(v, 1)), fix: null };
    if (e.landmark) issue.fix = { action: 'aim', by: 'camera', reason: 'a landmark is never moved: re-aim the camera (lookAt / frame) or widen it' };
    else if (e.agent) issue.fix = { action: 'none', reason: 'movers are kept out of the clip band by life (C2)' };
    else {
      const fx = _wcmFix(world, e, cam, F);
      issue.fix = fx.action === 'drop' ? { action: 'drop' } : { action: fx.action, to: fx.to, facing: fx.facing, shift: fx.shift };
      if (o.apply) {
        const from = [e.x, e.z];
        if (fx.action === 'drop') {
          const k = world.entities.indexOf(e);
          if (k >= 0) world.entities.splice(k, 1);
        } else {
          const dx = fx.to[0] - e.x, dz = fx.to[1] - e.z, turn = fx.action === 'rotate' ? fx.facing - (_wcmNum(e.facing) ? e.facing : 0) : 0;
          e.x = fx.to[0]; e.z = fx.to[1]; e.foot = fx.foot;
          if (fx.action === 'rotate') { e.facing = fx.facing; e.view = null; }
          if (e.deck && Array.isArray(e.deck.poly)) e.deck = Object.assign({}, e.deck, { poly: turn ? _wcmRotFoot(e.deck.poly, e.x, e.z, turn) : _wcmShift(e.deck.poly, dx, dz) });
          if (Array.isArray(e.lights)) e.lights = e.lights.map(l => Object.assign({}, l, { x: _wcmR(l.x + dx, 3), z: _wcmR(l.z + dz, 3) }));
          if (!/^water/.test(String(e.attach || '')) && typeof sceneGroundHeight === 'function' && !/^(deck|wall|air)/.test(String(e.attach || ''))) e.y = _wcmR(sceneGroundHeight(world.cam || cam, e.x, e.z), 3);
        }
        const rec = { id: e.id != null ? e.id : null, obj: e.obj || null, action: fx.action === 'rotate' ? 'rotate' : fx.action, rule: 'C1',
          reason: `${e.obj} was too big for the frame (${Math.round(br.vis * 100)} % of it, as wide as ${Math.round((br.box[2] - br.box[0]) / (F[2] - F[0]) * 100)} % of the frame) and cut by the ${br.cut.join(' and ')} edge`, from, to: fx.action === 'drop' ? null : fx.to, by: 'appearance' };
        out.log.push(rec); _wcmLog(world, rec);
      }
    }
    out.issues.push(issue);
  }
  out.ok = !out.issues.length || !!(o.apply && out.issues.every(i => i.fix && (i.fix.action === 'move' || i.fix.action === 'rotate' || i.fix.action === 'drop')));
  return out;
}

/* ---------- C4: landmarks ---------- */
const _WCM_SEE_THROUGH = Object.freeze({ tree: 0.85, shrub: 0.7, reed: 0.5, cover: 0.5, fence: 0.3, railing: 0.2, hedge: 1, rock: 1 });
/** The subpaths of an SVG path (M, L, H, V, Q, C, Z, absolute or relative) as point lists (curves by their control points). */
function _wcmSubpaths(d) {
  const t = String(d || '').match(/[MLHVQCZmlhvqcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], out = [];
  let i = 0, x = 0, y = 0, cmd = 'M', cur = null;
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase();
    if (C === 'Z') { if (cur) cur.closed = true; if (i < t.length && !/[A-Za-z]/.test(t[i])) i++; continue; }
    const n = C === 'M' || C === 'L' ? 2 : C === 'H' || C === 'V' ? 1 : C === 'Q' ? 4 : C === 'C' ? 6 : 0;
    if (!n) { i++; continue; }
    const a = []; for (let k = 0; k < n; k++) a.push(num());
    if (a.some(v => !Number.isFinite(v))) break;
    if (C === 'M') { x = rel ? x + a[0] : a[0]; y = rel ? y + a[1] : a[1]; cur = { pts: [[x, y]], closed: false }; out.push(cur); cmd = rel ? 'l' : 'L'; continue; }
    if (!cur) { cur = { pts: [[x, y]], closed: false }; out.push(cur); }
    if (C === 'H') x = rel ? x + a[0] : a[0];
    else if (C === 'V') y = rel ? y + a[0] : a[0];
    else { for (let k = 0; k + 1 < n - 2; k += 2) cur.pts.push([rel ? x + a[k] : a[k], rel ? y + a[k + 1] : a[k + 1]]); x = rel ? x + a[n - 2] : a[n - 2]; y = rel ? y + a[n - 1] : a[n - 1]; }
    cur.pts.push([x, y]);
  }
  return out;
}
const _wcmMaskMemo = new Map();
/**
 * A coarse silhouette of an object's art (32 x 32 cells over its box, each the opacity drawn there; foliage marked so a bare
 * winter crown lets the view through): fills by their outline, strokes along their segments at their width. Memoised.
 */
function _wcmMask(obj, v, season) {
  const key = obj + '|' + (v | 0) + '|' + (season || 'summer');
  if (_wcmMaskMemo.has(key)) return _wcmMaskMemo.get(key);
  let res = null;
  try {
    const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(obj, v | 0, season || 'summer') : null;
    if (sh && Array.isArray(sh.box) && sh.parts) {
      const N = 32, b = sh.box, cw = (b[2] - b[0]) / N, ch = (b[3] - b[1]) / N, cells = new Float32Array(N * N), leaf = new Uint8Array(N * N);
      if (cw > 0 && ch > 0) {
        const mark = (i, j, op, lf) => { if (i < 0 || j < 0 || i >= N || j >= N) return; const k = j * N + i; if (op > cells[k]) cells[k] = op; if (lf) leaf[k] = 1; };
        for (const part of Object.keys(sh.parts)) {
          if (part === 'lit' || /shadow|reflect/.test(part)) continue;
          const lf = /crown|leaf|foliage|canopy|frond|bough/.test(part);
          for (const s0 of sh.parts[part] || []) {
            if (!s0 || !s0.d || s0.m) continue;
            const op = Math.min(1, s0.op == null ? 1 : s0.op);
            for (const sp of _wcmSubpaths(s0.d)) {
              const P = sp.pts;
              if (s0.f && P.length >= 3) {
                let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
                for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
                for (let j = Math.max(0, Math.floor((y0 - b[1]) / ch)); j <= Math.min(N - 1, Math.floor((y1 - b[1]) / ch)); j++)
                  for (let i = Math.max(0, Math.floor((x0 - b[0]) / cw)); i <= Math.min(N - 1, Math.floor((x1 - b[0]) / cw)); i++)
                    if (_wcmInPoly(P, b[0] + (i + 0.5) * cw, b[1] + (j + 0.5) * ch)) mark(i, j, op, lf);
              }
              if (s0.s && s0.w > 0 && P.length >= 2) {
                const w = s0.w, rx = Math.max(0, Math.floor(w / 2 / cw)), ry = Math.max(0, Math.floor(w / 2 / ch));
                const opS = op * Math.min(1, w / Math.min(cw, ch));
                for (let k = 1; k < P.length; k++) {
                  const a = P[k - 1], c = P[k], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / (Math.min(cw, ch) / 2)));
                  for (let q = 0; q <= n; q++) { const u = a[0] + (c[0] - a[0]) * q / n, w2 = a[1] + (c[1] - a[1]) * q / n, i = Math.floor((u - b[0]) / cw), j = Math.floor((w2 - b[1]) / ch);
                    for (let di = -rx; di <= rx; di++) for (let dj = -ry; dj <= ry; dj++) mark(i + di, j + dj, opS, lf); }
                }
              }
            }
          }
        }
        res = { box: b, N, cells, leaf };
      }
    }
  } catch (e) { res = null; }
  _wcmMaskMemo.set(key, res);
  return res;
}
function _wcmEvergreen(obj) { return /pine|fir\b|yew|holly|conifer|spruce|cedar|palm|ivy|laurel|scots|cypress|juniper/.test(String(obj || '')); }
/** The coverage (0..1) an occluder's silhouette gives at a screen point: its art's mask when it is a sprite, else its class shape. */
function _wcmCover(occ, X, Y, season) {
  const b = occ.box;
  if (X < b[0] || X > b[2] || Y < b[1] || Y > b[3]) return 0;
  const cls = occ.cls, r = occ.r;
  if (Array.isArray(occ.polys)) {
    // an extruded building or line piece: inside one of its outlines
    for (const P of occ.polys) if (_wcmInPoly(P, X, Y)) return _WCM_SEE_THROUGH[cls] != null ? _WCM_SEE_THROUGH[cls] : 1;
    return 0;
  }
  if (r && r.anchor && r.s > 0 && r.obj) {
    const M = _wcmMask(r.obj, r.variant, season);
    if (M) {
      const u = (X - r.anchor[0]) / r.s * (r.flip ? -1 : 1), v = (Y - r.anchor[1]) / r.s;
      const i = Math.floor((u - M.box[0]) / (M.box[2] - M.box[0]) * M.N), j = Math.floor((v - M.box[1]) / (M.box[3] - M.box[1]) * M.N);
      if (i < 0 || j < 0 || i >= M.N || j >= M.N) return 0;
      const k = j * M.N + i, c = M.cells[k];
      // a bare deciduous crown in winter lets most of the view through (the mask is of the summer art)
      return M.leaf[k] && season === 'winter' && !_wcmEvergreen(occ.obj) ? c * 0.35 : M.leaf[k] ? c * _WCM_SEE_THROUGH.tree : c;
    }
  }
  if (cls === 'tree') {
    const w = b[2] - b[0], h = b[3] - b[1], cx = (b[0] + b[2]) / 2;
    // the crown: an ellipse over the top three quarters; the trunk: the middle tenth of the width below it
    const ey = b[1] + h * 0.375, ry = h * 0.375, rx = w / 2;
    const inCrown = ((X - cx) / rx) ** 2 + ((Y - ey) / ry) ** 2 <= 1, inTrunk = Y > b[1] + h * 0.7 && Math.abs(X - cx) < w * 0.06;
    if (inTrunk) return 1;
    if (!inCrown) return 0;
    return season === 'winter' && !_wcmEvergreen(occ.obj) ? 0.35 : _WCM_SEE_THROUGH.tree;
  }
  return _WCM_SEE_THROUGH[cls] != null ? _WCM_SEE_THROUGH[cls] : 1;
}
/** The classes the C4 fix never moves or drops: they are the place itself (a mill in front of a museum is a camera problem). */
const _WCM_HARD = Object.freeze(['building', 'structure', 'landmark', 'walkway', 'weir', 'fence', 'wall', 'line', 'rail-kit', 'train', 'tram']);
/** The convex hull of screen points (Andrew's monotone chain). */
function _wcmHull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/**
 * The occluders of a world for a camera: statics with a box and some height (never landmarks or backdrop members), and the
 * extruded buildings and line pieces (appearance's worldExtrude: their real outlines; they are the place, never moved).
 */
function _wcmOccluders(world, cam) {
  const occs = [];
  for (const e of Array.isArray(world.entities) ? world.entities : []) {
    if (!e || e.landmark || e.backdrop || !(e.z > 0)) continue;
    const q = _wcmOccOf(e, cam);
    if (q) occs.push(q);
  }
  if (typeof worldExtrude === 'function' && ((world.buildings && world.buildings.length) || (world.lines && world.lines.length))) {
    let prims = [];
    try { prims = worldExtrude(world, cam, { hulls: false }) || []; } catch (e) { prims = []; }
    for (const pr of prims) {
      if (!pr || !Array.isArray(pr.box) || !(pr.height >= 0.8)) continue;
      let polys = null;
      if (pr.kind === 'building' && pr.direct && Array.isArray(pr.direct.shapes)) {
        const pts = [];
        for (const sh of pr.direct.shapes) { const t = String(sh.d || '').match(/-?\d*\.?\d+/g) || []; for (let i = 0; i + 1 < t.length; i += 2) pts.push([+t[i], +t[i + 1]]); }
        if (pts.length >= 3) polys = [_wcmHull(pts)];
      } else if (Array.isArray(pr.faces)) polys = pr.faces.filter(f => f.pts && f.pts.length >= 3).map(f => f.pts).concat((pr.details || []).filter(d => d.type === 'fill').map(d => d.pts));
      const cls = pr.kind === 'building' ? 'building' : (pr.sub === 'hedge' ? 'hedge' : pr.sub === 'fence' ? 'fence' : pr.sub === 'railing' ? 'railing' : 'wall');
      occs.push({ e: null, prim: pr, id: pr.ent || pr.id, obj: null, cls, box: pr.box, polys, front: pr.zKey, auto: null, host: null });
    }
  }
  return occs;
}
function _wcmOccOf(e, cam) {
  const info = _wcmInfo(e.obj), h = _wcmNum(e.height) ? e.height : info && info.size ? info.size.h : 0;
  if (h < 0.8) return null;
  const r = worldScreenBox(e, cam);
  if (!r) return null;
  const front = Array.isArray(e.foot) && e.foot.length ? Math.min(...e.foot.map(p => p[1])) : e.z;
  return { e, id: e.id, obj: e.obj, cls: e.cls || (info && info.cls), box: r.box, r, front, auto: e.auto || null, host: e.host || null };
}
/**
 * How much of a landmark's face shows: a 16 x 12 grid over its drawn box, each sample weighted by the landmark's own
 * silhouette (its arch openings and the sky round it are not its face), counted when inside the frame (and the tile crop for
 * the tile figure) and not covered by a nearer occluder. -> { n, vis, visT, inF, inT, by: Map(occluder -> hidden weight) }
 */
function _wcmFace(L, r, mine, F, tile, season) {
  const b = r.box, self = { box: b, r, cls: 'landmark', obj: L.obj }, by = new Map();
  let vis = 0, visT = 0, inF = 0, inT = 0, n = 0;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) {
    const X = b[0] + (b[2] - b[0]) * (i + 0.5) / 16, Y = b[1] + (b[3] - b[1]) * (j + 0.5) / 12;
    const w = r.anchor ? _wcmCover(self, X, Y, 'summer') : 1;
    if (!(w > 0.05)) continue;
    n += w;
    if (!(X >= F[0] && X <= F[2] && Y >= F[1] && Y <= F[3])) continue;
    inF += w;
    let hid = 0;
    for (const q of mine) {
      const c = _wcmCover(q, X, Y, season);
      if (c > 0) { const take = Math.min(c, 1 - hid); hid += take; by.set(q, (by.get(q) || 0) + w * take); }
      if (hid >= 1) break;
    }
    const v = w * Math.max(0, 1 - hid);
    vis += v;
    if (X >= tile[0] && X <= tile[2] && Y >= tile[1] && Y <= tile[3]) { visT += v; inT += w; }
  }
  return { n: n > 0 ? n : 1, vis, visT, inF, inT, by };
}
/** Move a static by (dx, dz) in camera metres, keeping its footprint, deck and lights with it. */
function _wcmMoveEnt(world, e, dx, dz, cam) {
  e.x = _wcmR(e.x + dx, 3); e.z = _wcmR(e.z + dz, 3);
  if (Array.isArray(e.foot)) e.foot = _wcmShift(e.foot, dx, dz);
  if (e.deck && Array.isArray(e.deck.poly)) e.deck = Object.assign({}, e.deck, { poly: _wcmShift(e.deck.poly, dx, dz) });
  if (Array.isArray(e.lights)) e.lights = e.lights.map(l => Object.assign({}, l, { x: _wcmR(l.x + dx, 3), z: _wcmR(l.z + dz, 3) }));
  if (!/^(water|deck|wall|air)/.test(String(e.attach || '')) && typeof sceneGroundHeight === 'function') e.y = _wcmR(sceneGroundHeight(world.cam || cam, e.x, e.z), 3);
}
/**
 * C4 (see the header). o.apply: clear the face: auto-placed occluders are dropped; other soft ones (trees, shrubs, reeds, boats,
 * street things) are moved sideways along their habitat just far enough to clear it, or dropped when no legal spot is near;
 * buildings, structures and other landmarks are never touched (that is a camera or spec problem, reported). Every action is
 * logged (rule C4, by appearance).
 */
function worldLandmarkCheck(world, cam, o) {
  o = o || {};
  cam = cam || (world && world.cam);
  const out = { ok: true, landmarks: [] };
  if (!world || !cam || !_wcmNum(cam.f)) return out;
  const F = _wcmFrame(o), tile = worldOverscan(cam, 'tile').box, season = o.season || world.season || 'summer';
  const lms = (Array.isArray(world.entities) ? world.entities : []).filter(e => e && e.landmark);
  if (!lms.length) return out;
  let occs = _wcmOccluders(world, cam);
  for (const L of lms) {
    const r = worldScreenBox(L, cam);
    const rec = { id: L.id != null ? L.id : L.obj, obj: L.obj, ok: false, visible: 0, tile: 0, inFrame: 0, cropped: false, dwarfed: false, occluders: [], heightPx: 0, msg: '', fix: null };
    if (!r) { rec.msg = `landmark ${rec.id} is behind the camera`; rec.fix = { action: 'aim', bearing: _wcmR(worldCameraBearing(cam, L.x, L.z), 1) }; out.landmarks.push(rec); out.ok = false; continue; }
    const b = r.box, lfront = Array.isArray(L.foot) && L.foot.length ? Math.min(...L.foot.map(p => p[1])) : L.z;
    const mineOf = () => occs.filter(q => q.front < lfront - 0.5 && q.host !== L.id && !(q.box[2] < b[0] || q.box[0] > b[2] || q.box[3] < b[1] || q.box[1] > b[3]));
    let mine = mineOf(), S = _wcmFace(L, r, mine, F, tile, season);
    rec.cropped = S.inF / S.n < 0.9;
    // dwarfed: shorter than 4 % of the frame AND smaller than 0.6 % of its area (a long low embankment or weir still reads)
    rec.dwarfed = (b[3] - b[1]) < 0.04 * (F[3] - F[1]) && (b[3] - b[1]) * (b[2] - b[0]) < 0.006 * (F[2] - F[0]) * (F[3] - F[1]);
    // the fix (o.apply): clear the face of what hides it until 65 % shows, cheapest first: every soft culprit is first moved
    // along its habitat (the biggest culprit first); only then are culprits dropped: auto-placed ones first, then plants,
    // then small things, boats and vehicles last
    const short = () => S.vis / S.n < 0.65 || S.visT / S.n < 0.65;
    // ... and only when it can work: if the buildings and structures alone hide too much, nothing soft is touched (reported)
    const hardOnly = S.vis / S.n < 0.6 || S.visT / S.n < 0.6 ? _wcmFace(L, r, mine.filter(q => !q.e || _WCM_HARD.includes(q.cls)), F, tile, season) : null;
    if (o.apply && hardOnly && hardOnly.vis / hardOnly.n >= 0.65 && hardOnly.visT / hardOnly.n >= 0.65 && !rec.cropped && !rec.dwarfed && S.inT / S.n >= 0.6) {
      const tried = new Set();
      const face = (qq) => { let hid = 0; for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) { const X = b[0] + (b[2] - b[0]) * (i + 0.5) / 16, Y = b[1] + (b[3] - b[1]) * (j + 0.5) / 12; if (X < F[0] || X > F[2] || Y < F[1] || Y > F[3]) continue; const w = r.anchor ? _wcmCover({ box: b, r, cls: 'landmark', obj: L.obj }, X, Y, 'summer') : 1; if (w > 0.05) hid += w * _wcmCover(qq, X, Y, season); } return hid; };
      const act = (q, done) => {
        const e = q.e, from = q.from;
        _wcmLog(world, { id: e.id != null ? e.id : null, obj: e.obj, action: done, rule: 'C4', reason: `it hid the face of landmark ${rec.id}`, from, to: done === 'drop' ? null : [e.x, e.z], by: 'appearance' });
        occs = occs.filter(x => x !== q);
        if (done === 'move') { const nq = _wcmOccOf(e, cam); if (nq) occs.push(nq); }
        mine = mineOf(); S = _wcmFace(L, r, mine, F, tile, season);
      };
      // 1. moves
      for (let guard = 0; guard < 32 && short(); guard++) {
        const q = [...S.by.entries()].filter(([x]) => x.e && !_WCM_HARD.includes(x.cls) && !x.auto && !tried.has(x.e)).sort((u, v) => v[1] - u[1]).map(x => x[0])[0];
        if (!q) break;
        tried.add(q.e);
        const e = q.e, h0 = face(q), cands = [];
        if (['boat', 'vehicle', 'train', 'tram'].includes(q.cls)) {
          // a boat or a vehicle slides along its own axis: it stays alongside its bank or in its lane (K3)
          const f = (_wcmNum(e.facing) ? e.facing : 0) * _WCM_DEG;
          for (let sd = 1; sd <= 40; sd += sd < 10 ? 1 : 2) for (const sg of [1, -1]) cands.push([Math.sin(f) * sd * sg, Math.cos(f) * sd * sg]);
        } else {
          const kx = e.z / cam.f, need = [(b[0] - q.box[2] - 6) * kx, (b[2] - q.box[0] + 6) * kx].sort((u, v) => Math.abs(u) - Math.abs(v));
          for (const dx0 of need) for (const k of [1, 1.25, 1.6, 2.2, 3]) if (Math.abs(dx0 * k) <= 12) cands.push([dx0 * k, 0]);
        }
        for (const [dx, dz] of cands) {
          if (!(e.z + dz > _wcmNear(cam))) continue;
          const foot = Array.isArray(e.foot) ? _wcmShift(e.foot, dx, dz) : [[e.x + dx, e.z + dz]];
          if (!_wcmLegal(world, e, e.x + dx, e.z + dz, e.facing, foot)) continue;
          const probe = Object.assign({}, e, { x: e.x + dx, z: e.z + dz, foot, view: null }), moved = _wcmOccOf(probe, cam);
          if (moved && face(moved) > 0.1 * h0) continue;
          if (_wcmBreaks(probe, cam, F)) continue;   // never into a C1 cut
          q.from = [e.x, e.z];
          _wcmMoveEnt(world, e, dx, dz, cam);
          act(q, 'move');
          break;
        }
      }
      // 2. drops, cheapest loss first
      const rank = (x) => (x.auto ? 0 : ['tree', 'shrub', 'reed', 'cover', 'hedge', 'plant'].includes(x.cls) ? 1 : ['boat', 'vehicle'].includes(x.cls) ? 3 : 2);
      for (let guard = 0; guard < 32 && short(); guard++) {
        const q = [...S.by.entries()].filter(([x]) => x.e && !_WCM_HARD.includes(x.cls)).sort((u, v) => rank(u[0]) - rank(v[0]) || v[1] - u[1]).map(x => x[0])[0];
        if (!q) break;
        q.from = [q.e.x, q.e.z];
        const k = world.entities.indexOf(q.e);
        if (k >= 0) world.entities.splice(k, 1);
        act(q, 'drop');
      }
    }
    rec.visible = _wcmR(S.vis / S.n, 3); rec.tile = _wcmR(S.visT / S.n, 3); rec.inFrame = _wcmR(S.inF / S.n, 3);
    rec.heightPx = _wcmR(b[3] - b[1], 1);
    rec.occluders = [...S.by.keys()].map(q => (q.id != null ? q.id : q.obj));
    rec.ok = rec.visible >= 0.6 && rec.tile >= 0.6 && !rec.cropped && !rec.dwarfed;
    const why = [];
    if (rec.visible < 0.6) why.push(`${Math.round(rec.visible * 100)} % of its face visible`);
    if (rec.tile < 0.6) why.push(`${Math.round(rec.tile * 100)} % in the tile crop`);
    if (rec.cropped) why.push('cropped by the frame');
    if (rec.dwarfed) why.push(`only ${Math.round(b[3] - b[1])} units tall`);
    rec.msg = rec.ok ? '' : `landmark ${rec.id}: ${why.join(', ')}${rec.visible < 0.6 || rec.tile < 0.6 ? ' (60 % needed)' : ''}`;
    if (!rec.ok) {
      const bearing = _wcmR(worldCameraBearing(cam, L.x, L.z), 1);
      const aim = { action: 'aim', bearing, reason: 'centre it: lookAt the landmark (its heading) or frame: [id]' };
      const hard = [...S.by.keys()].filter(q => !q.e || _WCM_HARD.includes(q.cls)).map(q => (q.id != null ? q.id : q.obj));
      const clear = { action: 'clear', ids: rec.occluders, hard, reason: hard.length ? 'buildings or structures stand in front of it: move the camera or the landmark' : 'what hides it is moved aside or dropped at load (apply)' };
      if (rec.cropped) rec.fix = aim;
      else if (rec.visible < 0.6) rec.fix = clear;                              // in frame but hidden: the occluders are the cause
      else if (rec.tile < 0.6) rec.fix = S.inT / S.n < 0.6 ? aim : clear;     // off the tile's square, or hidden there
      else rec.fix = { action: 'nearer', reason: 'move the camera nearer or narrow the fov' };
      out.ok = false;
    }
    out.landmarks.push(rec);
  }
  return out;
}

/* ---------- Q6: overscan ---------- */
/**
 * The region a frame of `aspect` shows (see the header). cam: a v2 camera (for hfov, dNear and xAt; optional).
 */
function worldOverscan(cam, aspect, o) {
  o = o || {};
  const W0 = WORLD_CAMERA_W, H0 = WORLD_CAMERA_H, core = W0 / H0;
  let dev = null, a;
  if (aspect === 'all') {
    let u = [0, 0, W0, H0];
    for (const k of Object.keys(WORLD_OVERSCAN_FRAMES)) { const b = worldOverscan(cam, k, o).box; u = [Math.min(u[0], b[0]), Math.min(u[1], b[1]), Math.max(u[2], b[2]), Math.max(u[3], b[3])]; }
    return _wcmOverscanRec(cam, u, null, 'all', false);
  }
  if (_wcmObj(aspect) && _wcmNum(aspect.W) && _wcmNum(aspect.H) && aspect.W > 0 && aspect.H > 0) { dev = aspect; a = aspect.W / aspect.H; }
  else if (typeof aspect === 'string' && WORLD_OVERSCAN_FRAMES[aspect]) a = WORLD_OVERSCAN_FRAMES[aspect];
  else if (_wcmNum(aspect) && aspect > 0) a = aspect;
  else a = core;
  const sx = _wcmNum(o.subjectX) ? _wcmClamp(o.subjectX, 0, W0) : W0 / 2;
  let box, crop = false;
  if (aspect === 'tile' || aspect === 'square' || o.mode === 'crop') {
    // the tile crop (C4 at tile size): the frame sliced to the aspect about its centre (xMidYMid slice), never extended
    if (a >= core) { const h = W0 / a; box = [0, (H0 - h) / 2, W0, (H0 + h) / 2]; }
    else { const w = H0 * a; box = [W0 / 2 - w / 2, 0, W0 / 2 + w / 2, H0]; }
    crop = true;
  } else if (a >= core - 1e-9) {
    // wide: the full height, more world to each side
    const w = H0 * a; box = [W0 / 2 - w / 2, 0, W0 / 2 + w / 2, H0];
  } else if (a >= 1) {
    // between square and 16:9 (4:3, 16:10): the full width, more sky and foreground
    const h = W0 / a, extra = h - H0; box = [0, -extra * 0.55, W0, H0 + extra * 0.45];
  } else {
    // tall (a phone held upright): a centred column about the subject with more sky and foreground, never a sliver of the core
    const h = H0 * (1 + 0.6 * (1 - a)), w = h * a, extra = h - H0;
    const x0 = _wcmClamp(sx - w / 2, 0, W0 - w);
    box = [x0, -extra * 0.55, x0 + w, H0 + extra * 0.45];
    crop = true;
  }
  return _wcmOverscanRec(cam, box, dev, a, crop);
}
function _wcmOverscanRec(cam, box, dev, a, crop) {
  const W0 = WORLD_CAMERA_W, H0 = WORLD_CAMERA_H;
  const rec = { aspect: a, box: box.map(v => _wcmR(v, 2)), crop, extend: { left: _wcmR(Math.max(0, -box[0]), 1), right: _wcmR(Math.max(0, box[2] - W0), 1), top: _wcmR(Math.max(0, -box[1]), 1), bottom: _wcmR(Math.max(0, box[3] - H0), 1) },
    contains: (X, Y) => X >= box[0] && X <= box[2] && Y >= box[1] && Y <= box[3] };
  if (cam && _wcmNum(cam.f)) {
    const x0 = _wcmNum(cam.x0) ? cam.x0 : W0 / 2;
    rec.hfov = _wcmR((Math.atan((x0 - box[0]) / cam.f) + Math.atan((box[2] - x0) / cam.f)) / _WCM_DEG, 2);
    // the nearest ground seen at the bottom row (flat ground): where the near surfaces and fill must reach
    rec.dNear = box[3] > cam.horizon ? _wcmR(cam.f * cam.eye / (box[3] - cam.horizon), 3) : Infinity;
    rec.xAt = (z) => [_wcmR((box[0] - x0) * z / cam.f, 3), _wcmR((box[2] - x0) * z / cam.f, 3)];
  }
  if (dev) {
    // one uniform scale: nothing is ever stretched
    const vs = Math.min(dev.W / (box[2] - box[0]), dev.H / (box[3] - box[1]));
    rec.vs = vs; rec.ox = (dev.W - (box[2] - box[0]) * vs) / 2 - box[0] * vs; rec.oy = (dev.H - (box[3] - box[1]) * vs) / 2 - box[1] * vs;
  }
  return rec;
}
