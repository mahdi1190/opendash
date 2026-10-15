// World engine: traffic (docs/dev/WORLD_ENGINE.md 4.5; requirements A9, T1, M6). Pure (Node + browser).
//
// Vehicles never share a grid: they follow LANES. A road surface (a centre line + width; a polygon gets its long axis) gives
// one directed lane each way, offset to the LEFT of travel where traffic keeps left (SCENE_DRIVE_LEFT from the place's
// lat / lon; the UK by default; `place.drive` overrides). Cars, buses and road cyclists follow their lane with the intelligent
// driver model (they keep a gap and a time headway, brake for the one ahead and never pass through it), stop before a
// crossing with someone on it, give way at a lane crossing, and buses stop at their bus stops. Rail and tram lines (a centre
// line; two tracks when it is wide enough, each direction on its left track) carry trains and trams to a TIMETABLE: a pure
// function of the scene clock, periodic with a period that divides WORLD_LOOP_S (T1), at a plausible speed, stopping at
// platforms. Boats under way are agents of the life sim on the swim layer: this file gives their schedule and the
// mid-channel steering; moored boats never move.
//
//   worldTraffic(world, nav) -> Traffic { drive, lanes, stops, tracks, timetable, conflicts }
//   worldTrafficDrive(world) -> 'left' | 'right'
//   worldLoopPeriod(seconds, alternating?) -> a period that divides WORLD_LOOP_S (the full pattern when alternating)
//   worldTrafficLaneAt(lane, s) -> { x, z, tx, tz }            (a point of a lane and its unit tangent)
//   worldTrafficSpan(T, lane, h, len) -> { s0, s1, fadeIn, fadeOut }   (where a vehicle of height h may be: never a giant at the lens)
//   worldTrafficSchedule(T, o) -> entry                          (a timetable entry: { id, cls, obj, period, offset, tracks, v, a, dwell, len })
//   worldTrafficRailAt(T, entry, t) -> [{ k, track, s, v, x, z, heading, state }]   (every train of an entry on its line at time t;
//                                                                 heading in radians, atan2(dx, dz); s = the train's middle)
//   worldTrafficIdm(veh, ahead, dt, o) -> { v, s }               (one IDM step; never past the one ahead)
//   worldTrafficStep(T, vehicles, dt, o)                         (all lane vehicles one step: gaps, crossings, stops, conflicts)
//   worldTrafficBoatSteer(nav, layer, x, z, dir, r) -> [dx, dz]  (flow direction pulled to the middle of the channel)

const WORLD_TRAFFIC = Object.freeze({ s0: 2.5, headway: 1.2, a: 1.4, b: 2.2, kerb: 0.75, trackGap: 2, railLen: { train: 60, tram: 30 } });
/**
 * The bed a main line's trains run on (a `rail` surface; a tram runs flush in its street): ballast 0.35 m over the ground it is laid
 * on, the rail head 0.15 m over that. A train's wheels are at `h` over the ground (life lifts it), the extruder draws the bed
 * (a `ballast` line under the rails, 79-world-4extrude.js) and the invariants judge a train at the ground plus this.
 */
const WORLD_RAIL_BED = Object.freeze({ ballast: 0.35, rail: 0.15, h: 0.5, gauge: 1.435, shoulder: 1.65, trough: 0.9 });

function _wtrLoopS() { return typeof WORLD_LOOP_S !== 'undefined' && Number.isFinite(WORLD_LOOP_S) && WORLD_LOOP_S > 0 ? WORLD_LOOP_S : 360; }
/** A period near `sec` that divides the loop (T1); for an alternating pattern, twice the period divides it. */
function worldLoopPeriod(sec, alternating) {
  const L = _wtrLoopS(), want = Math.max(5, +sec || 60) * (alternating ? 2 : 1);
  let best = L, bd = Infinity;
  for (let d = 1; d <= L; d++) {
    if (L % d) continue;
    const p = L / d; if (p < 5) break;
    const e = Math.abs(Math.log(p / want));
    if (e < bd - 1e-9) { bd = e; best = p; }
  }
  return alternating ? best / 2 : best;
}
function worldTrafficDrive(world) {
  const p = (world && world.place) || {}, c = (world && world.cam) || {};
  if (p.drive === 'left' || p.drive === 'right') return p.drive;
  const lat = Number.isFinite(p.lat) ? p.lat : c.lat, lon = Number.isFinite(p.lon) ? p.lon : c.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || typeof SCENE_DRIVE_LEFT === 'undefined') return 'left';
  return SCENE_DRIVE_LEFT.boxes.some(b => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3]) ? 'left' : 'right';
}

/* ---------- polylines ---------- */
function _wtrCum(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }
/** A polyline offset by o metres to its LEFT (x right, z forward: the left of travel (tx, tz) is (-tz, tx)). */
function _wtrOffset(P, o) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    out.push([P[i][0] - tz * o, P[i][1] + tx * o]);
  }
  return out;
}
function worldTrafficLaneAt(lane, s) {
  const P = lane.pts, C = lane.cum, n = P.length;
  if (s <= 0 || n < 2) { const tx = P[1][0] - P[0][0], tz = P[1][1] - P[0][1], L = Math.hypot(tx, tz) || 1; return { x: P[0][0] + tx / L * s, z: P[0][1] + tz / L * s, tx: tx / L, tz: tz / L }; }
  if (s >= lane.len) { const tx = P[n - 1][0] - P[n - 2][0], tz = P[n - 1][1] - P[n - 2][1], L = Math.hypot(tx, tz) || 1, e = s - lane.len; return { x: P[n - 1][0] + tx / L * e, z: P[n - 1][1] + tz / L * e, tx: tx / L, tz: tz / L }; }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
  const L = C[hi] - C[lo] || 1, t = (s - C[lo]) / L, tx = (P[hi][0] - P[lo][0]) / L, tz = (P[hi][1] - P[lo][1]) / L;
  return { x: P[lo][0] + (P[hi][0] - P[lo][0]) * t, z: P[lo][1] + (P[hi][1] - P[lo][1]) * t, tx, tz };
}
/** The arc length of the nearest point of a lane to (x, z), and the distance. */
function _wtrProject(lane, x, z) {
  let best = { s: 0, d: Infinity };
  for (let i = 1; i < lane.pts.length; i++) {
    const a = lane.pts[i - 1], b = lane.pts[i], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0, px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { s: lane.cum[i - 1] + t * Math.sqrt(L2), d, side: dx * (z - a[1]) - dz * (x - a[0]) };
  }
  return best;
}
/** A road's centre line: its path, or the long axis of its polygon (principal axis through the centroid, clipped to it). */
function _wtrCentre(s) {
  if (Array.isArray(s.path) && s.path.length >= 2) return { P: s.path.map(p => [p[0], p[1]]), w: s.width || 6 };
  const p = s.poly; let cx = 0, cz = 0; for (const q of p) { cx += q[0]; cz += q[1]; } cx /= p.length; cz /= p.length;
  let sxx = 0, szz = 0, sxz = 0; for (const q of p) { const dx = q[0] - cx, dz = q[1] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(ang), uz = Math.sin(ang);
  let t0 = Infinity, t1 = -Infinity, w0 = Infinity, w1 = -Infinity;
  for (const q of p) { const t = (q[0] - cx) * ux + (q[1] - cz) * uz, v = -(q[0] - cx) * uz + (q[1] - cz) * ux; t0 = Math.min(t0, t); t1 = Math.max(t1, t); w0 = Math.min(w0, v); w1 = Math.max(w1, v); }
  return { P: [[cx + ux * t0, cz + uz * t0], [cx + ux * t1, cz + uz * t1]], w: Math.max(3, w1 - w0) };
}
function _wtrSegX(a, b, c, d) {
  const r1x = b[0] - a[0], r1z = b[1] - a[1], r2x = d[0] - c[0], r2z = d[1] - c[1], den = r1x * r2z - r1z * r2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * r2z - (c[1] - a[1]) * r2x) / den, u = ((c[0] - a[0]) * r1z - (c[1] - a[1]) * r1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t, u] : null;
}
function _wtrKb(id) { if (typeof worldKb !== 'function' || !id) return null; try { return worldKb(id) || null; } catch (e) { return null; } }
function _wtrInShape(s, x, z) {
  if (s.poly) { let c = false; const p = s.poly; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; } return c; }
  if (s.path) { for (let i = 1; i < s.path.length; i++) { const a = s.path[i - 1], b = s.path[i], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz; const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0; if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) <= (s.width || 0) / 2) return true; } }
  return false;
}

/* ---------- the traffic of a world ---------- */
function worldTraffic(world, nav) {
  const drive = worldTrafficDrive(world), side = drive === 'left' ? 1 : -1;
  const surfaces = (world && world.surfaces) || [], ents = (world && world.entities) || [];
  const cam = nav && nav.cam ? nav.cam : { f: 1280, tanL: 0.82, tanR: 0.82, dMin: 4 };
  const T = { drive, lanes: [], stops: [], tracks: [], timetable: [], conflicts: [], cam, spans: new Map(), world, nav };
  // road lanes
  for (const s of surfaces) {
    if (s.kind !== 'road' || !(s.path || s.poly)) continue;
    const c = _wtrCentre(s), off = Math.max(0.75, c.w / 4), rev = c.P.slice().reverse();
    for (const dir of [1, -1]) {
      const pts = _wtrOffset(dir > 0 ? c.P : rev, side * off), cum = _wtrCum(pts);
      T.lanes.push({ id: (s.id || 'road') + (dir > 0 ? ':f' : ':b'), road: s.id || null, kind: 'road', dir, pts, cum, len: cum[cum.length - 1], width: c.w / 2, kerb: side * (c.w / 2 - WORLD_TRAFFIC.kerb - off), cross: [], stops: [], conflicts: [], limit: 13.4 });
    }
  }
  // solids standing in a lane (a parked car, a bollard): traffic never drives through them
  for (const ln of T.lanes) {
    ln.blocks = [];
    for (const e of ents) {
      if (!e || e.static === false || e.solidity !== 'solid' || !Array.isArray(e.foot) || e.foot.length < 3) continue;
      let lo = Infinity, hi = -Infinity;
      for (const q of e.foot) { const pr = _wtrProject(ln, q[0], q[1]); if (pr.d < 1.2) { lo = Math.min(lo, pr.s); hi = Math.max(hi, pr.s); } }
      const c = _wtrProject(ln, e.x, e.z);
      if (c.d < 1.2) { lo = Math.min(lo, c.s); hi = Math.max(hi, c.s); }
      if (lo <= hi) ln.blocks.push({ s0: lo, s1: hi, id: e.id || e.obj });
    }
  }
  // crossings on lanes
  const crossings = surfaces.filter(s => s.kind === 'crossing');
  for (const ln of T.lanes) for (const cr of crossings) {
    let s0 = null, s1 = null;
    for (let s = 0; s <= ln.len; s += 0.5) { const p = worldTrafficLaneAt(ln, s); if (_wtrInShape(cr, p.x, p.z)) { if (s0 == null) s0 = s; s1 = s; } }
    if (s0 != null) ln.cross.push({ s0, s1, id: cr.id || null, shape: cr });
  }
  // conflicts between lanes of different roads (give way: the lower lane id has the priority)
  for (let i = 0; i < T.lanes.length; i++) for (let j = i + 1; j < T.lanes.length; j++) {
    const A = T.lanes[i], B = T.lanes[j]; if (A.road === B.road) continue;
    for (let p = 1; p < A.pts.length; p++) for (let q = 1; q < B.pts.length; q++) {
      const x = _wtrSegX(A.pts[p - 1], A.pts[p], B.pts[q - 1], B.pts[q]); if (!x) continue;
      const sa = A.cum[p - 1] + x[0] * (A.cum[p] - A.cum[p - 1]), sb = B.cum[q - 1] + x[1] * (B.cum[q] - B.cum[q - 1]);
      A.conflicts.push({ s: sa, lane: B.id, os: sb, prio: true }); B.conflicts.push({ s: sb, lane: A.id, os: sa, prio: false });
      T.conflicts.push({ a: A.id, b: B.id, sa, sb });
    }
  }
  // rail and tram tracks: two when the line is wide enough (each direction on its left), else one shared track
  for (const s of surfaces) {
    if ((s.kind !== 'rail' && s.kind !== 'tram') || !Array.isArray(s.path) || s.path.length < 2) continue;
    const two = (s.width || 0) >= 6, off = two ? Math.min(WORLD_TRAFFIC.trackGap, (s.width || 0) / 4) : 0, rev = s.path.slice().reverse();
    for (const dir of two ? [1, -1] : [1]) {
      const pts = off ? _wtrOffset(dir > 0 ? s.path : rev, side * off) : s.path.map(p => [p[0], p[1]]), cum = _wtrCum(pts);
      T.tracks.push({ id: (s.id || s.kind) + (two ? (dir > 0 ? ':f' : ':b') : ''), line: s.id || null, kind: s.kind, dir, shared: !two, pts, cum, len: cum[cum.length - 1], stops: [] });
    }
  }
  // stops: bus stops from the knowledge base; platforms beside a track
  for (const e of ents) {
    const kb = _wtrKb(e.obj), kind = kb && (kb.stop || (kb.cls === 'bus-stop' ? 'bus' : kb.cls === 'tram-stop' ? 'tram' : kb.cls === 'stop' ? 'bus' : null));
    if (!kind || !Number.isFinite(e.x)) continue;
    if (kind === 'bus') {
      let best = null;
      for (const ln of T.lanes) { const p = _wtrProject(ln, e.x, e.z); if (p.d < 8 && p.side * side > 0 && (!best || p.d < best.p.d)) best = { ln, p }; }
      if (best) T.stops.push(_wtrStop(T, 'bus', e.id || e.obj, best.ln, best.p.s, e.x, e.z));
    } else {
      for (const tr of T.tracks) { const p = _wtrProject(tr, e.x, e.z); if (p.d < 8) T.stops.push(_wtrStop(T, kind, e.id || e.obj, tr, p.s, e.x, e.z)); }
    }
  }
  for (const s of surfaces) {
    if (s.kind !== 'platform') continue;
    const pts = s.poly || s.path; let cx = 0, cz = 0; for (const q of pts) { cx += q[0]; cz += q[1]; } cx /= pts.length; cz /= pts.length;
    for (const tr of T.tracks) { const p = _wtrProject(tr, cx, cz); if (p.d < 9) T.stops.push(_wtrStop(T, tr.kind === 'tram' ? 'tram' : 'rail', s.id, tr, p.s, cx, cz)); }
  }
  for (const st of T.stops) st.on.stops.push({ s: st.s, id: st.id, stop: st });
  for (const x of T.lanes.concat(T.tracks)) x.stops.sort((a, b) => a.s - b.s);
  return T;
}
function _wtrStop(T, kind, id, on, s, x, z) {
  const p = worldTrafficLaneAt(on, s);
  // the waiting point: the stop itself, moved off the carriageway; queue slots run back along the kerb
  const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  const wx = p.x + ux * Math.max(d, 2), wz = p.z + uz * Math.max(d, 2);
  const slots = []; for (let i = 0; i < 8; i++) slots.push([wx - p.tx * 0.85 * i, wz - p.tz * 0.85 * i]);
  return { id: id + (T.stops.some(q => q.id === id) ? ':' + T.stops.length : ''), kind, lane: on.id, on, s, x: wx, z: wz, face: [-ux, -uz], slots, door: [p.x + ux * 1.4, p.z + uz * 1.4], waiting: [] };
}

/** Where a vehicle of height h and length len may be on a lane: off the screen's near band (no giant at the lens); fades where an end is on screen. */
function worldTrafficSpan(T, lane, h, len) {
  const key = lane.id + '|' + Math.round(h * 10) + '|' + Math.round(len);
  if (T.spans.has(key)) return T.spans.get(key);
  const cam = T.cam, nearZ = cam.f * h / 405, half = len / 2;
  const onScreen = (p) => p.z > 0.3 && p.x > -p.z * cam.tanL - half && p.x < p.z * cam.tanR + half && cam.f * h / p.z >= 12;
  // a vehicle may be where its lane is on the drive map, and never on screen inside its own near band (no giant at the lens)
  const navOk = (p) => !T.nav || typeof worldNavOk !== 'function' || worldNavOk(T.nav, 'drive', p.x, p.z, 0);
  const blocked = (s) => lane.blocks.some(b => s + half + 2 > b.s0 && s - half - 2 < b.s1);
  const bad = (s) => { const p = worldTrafficLaneAt(lane, s); return !navOk(p) || p.z < nearZ + 0.3 || blocked(s); };
  let s0 = 0; while (s0 < lane.len && bad(s0)) s0 += 0.5;
  let s1 = s0; while (s1 + 0.5 <= lane.len && !bad(s1 + 0.5)) s1 += 0.5;
  // a lane cut by a parked vehicle or another solid in it carries no traffic up to the block (nobody vanishes mid-frame)
  if (s1 + 0.5 <= lane.len && blocked(s1 + 0.5)) { const sp0 = { s0: 0, s1: -1, fadeIn: false, fadeOut: false, blocked: true }; T.spans.set(key, sp0); return sp0; }
  const fadeIn = onScreen(worldTrafficLaneAt(lane, s0)), fadeOut = onScreen(worldTrafficLaneAt(lane, s1));
  const sp = { s0, s1, fadeIn, fadeOut };
  T.spans.set(key, sp);
  return sp;
}

/* ---------- the timetable (T1) ---------- */
/**
 * A timetable entry: o { id, cls: 'train' | 'tram', obj, every (s), line (surface id or null), v, a, dwell, len, rng }.
 * Departures alternate between directions when the line has two tracks (each direction's period is then twice `period`,
 * and that full pattern divides the loop); a single track takes one direction at a time with room between trains.
 */
function worldTrafficSchedule(T, o) {
  let tracks = T.tracks.filter(t => (o.line == null || t.line === o.line) && (o.cls === 'tram' ? t.kind === 'tram' : t.kind === 'rail' || t.kind === 'tram'));
  if (!tracks.length) return null;
  const line = tracks[0].line;
  tracks = tracks.filter(t => t.line === line);                           // one line per entry
  // a shared single track: the return trips run on the same rails, reversed (stops mirrored)
  if (tracks.length === 1 && tracks[0].shared) {
    const tr = tracks[0], pts = tr.pts.slice().reverse(), cum = _wtrCum(pts);
    tracks = [tr, { id: tr.id + ':r', line: tr.line, kind: tr.kind, dir: -1, shared: true, pts, cum, len: tr.len, stops: tr.stops.map(x => ({ s: tr.len - x.s, id: x.id, stop: x.stop })).reverse() }];
  }
  const rnd = o.rng || Math.random;
  const v = o.v || (o.cls === 'tram' ? 11 : 30), a = o.a || (o.cls === 'tram' ? 1.0 : 0.6), len = o.len || WORLD_TRAFFIC.railLen[o.cls] || 40;
  const e = { id: o.id, cls: o.cls, obj: o.obj, tracks, period: worldLoopPeriod(o.every || 240, true), offset: 0, v, a,
    dwell: o.dwell || (o.cls === 'tram' ? 22 : 35), len, shared: !!tracks[0].shared, line };
  // a shared single track: one train on it at a time (the trip must end before the next departure)
  if (e.shared) {
    const trip = Math.max(..._wtrTrips(e));
    for (let n = 0; n < 12 && e.period < trip + 10 && e.period * 2 < _wtrLoopS(); n++) e.period = worldLoopPeriod(e.period * 1.5, true);
  }
  e.offset = Math.floor(rnd() * e.period * 100) / 100;
  // the phase (T1): a line the camera sees shows a train when the scene is shown. o.show0 is the timetable clock at the moment the
  // scene is first drawn: the first train of the first track (a left to right crossing on a line drawn left to right) is then
  // a little way across the frame, so a still and the first seconds of the app carry a crossing, and the same one comes round
  // every loop (the pattern divides it). o.phase 'free' keeps the seeded random phase.
  // (a train parked on the line itself is an obstacle the timetable cannot run round: the seeded phase stays, as it always was)
  if (o.show0 != null && o.phase !== 'free' && !_wtrParkedOn(T, tracks)) { const off = _wtrFramedOffset(T, e, +o.show0); if (off != null) e.offset = off; }
  T.timetable.push(e);
  return e;
}
/** Does a static train or tram stand on one of these tracks (within 2.5 m of its centre line)? */
function _wtrParkedOn(T, tracks) {
  const ents = (T.world && T.world.entities) || [];
  for (const e of ents) {
    if (!e || e.static === false || !Number.isFinite(e.x) || !Number.isFinite(e.z)) continue;
    const cls = e.cls || '';
    if (cls !== 'train' && cls !== 'tram') continue;
    for (const tr of tracks) { const p = _wtrProject(tr, e.x, e.z); if (p.d < 2.5) return true; }
  }
  return false;
}
/**
 * The offset (s, in [0, period x tracks)) that puts the first train of the entry's first track at 30 % of the stretch of that track
 * the frame shows (by the train's middle, entering side first) at clock `show0`. null when the track is never on screen.
 */
function _wtrFramedOffset(T, e, show0) {
  const cam = T.cam, tr = e.tracks[0];
  if (!cam || !tr || !(cam.f > 0) || !Number.isFinite(show0)) return null;
  const tl = cam.tanL0 || cam.tanL, tr0 = cam.tanR0 || cam.tanR;
  if (!(tl > 0) || !(tr0 > 0)) return null;
  const seen = (s) => { const p = worldTrafficLaneAt(tr, s); return p.z > 1 && p.x > -p.z * tl && p.x < p.z * tr0; };
  let sA = null, sB = null;
  for (let s = 0; s <= tr.len; s += 0.5) if (seen(s)) { if (sA == null) sA = s; sB = s; }
  if (sA == null || sB - sA < 5) return null;
  const sStar = sA + 0.3 * (sB - sA), prof = _wtrProfile(e, tr);
  let tau = null;
  for (let t = 0; t <= prof.tEnd + 1e-6; t += 0.1) if (prof.s(t) >= sStar) { tau = t; break; }
  if (tau == null) return null;
  const span = e.period * e.tracks.length;
  let off = (show0 - tau) % span;
  if (off < 0) off += span;
  return Math.floor(off * 100) / 100;
}
/** The trip time of an entry on each of its tracks (s). */
function _wtrTrips(e) { return e.tracks.map(tr => { const p = _wtrProfile(e, tr); return p.tEnd; }); }
/** The speed profile of a train on a track: cruise, brake to the first stop, dwell, accelerate, cruise on. */
function _wtrProfile(e, tr) {
  const key = tr.id;
  e.prof = e.prof || {};
  if (e.prof[key]) return e.prof[key];
  const L = tr.len, a = e.a, st = tr.stops.find(x => x.s > 0 && x.s < L) || null;
  let v = e.v;
  if (!st) { const p = { stop: null, v, tEnd: L / v, s: (t) => v * t, vel: () => v, state: () => 'drive' }; e.prof[key] = p; return p; }
  const sStop = st.s, sStart = 0;
  v = Math.min(v, Math.sqrt(2 * a * Math.max(1, sStop - sStart)));
  const db = v * v / (2 * a), t1 = Math.max(0, (sStop - db - sStart) / v), t2 = t1 + v / a, t3 = t2 + e.dwell, t4 = t3 + v / a, s4 = sStop + db;
  const tEnd = t4 + Math.max(0, (L - s4) / v);
  const p = { stop: st, v, tEnd, t1, t2, t3, t4,
    s: (t) => t <= t1 ? sStart + v * t : t <= t2 ? (sStop - db) + v * (t - t1) - 0.5 * a * (t - t1) * (t - t1) : t <= t3 ? sStop : t <= t4 ? sStop + 0.5 * a * (t - t3) * (t - t3) : s4 + v * (t - t4),
    vel: (t) => t <= t1 ? v : t <= t2 ? Math.max(0, v - a * (t - t1)) : t <= t3 ? 0 : t <= t4 ? a * (t - t3) : v,
    state: (t) => t > t2 && t <= t3 ? 'stopped' : 'drive' };
  e.prof[key] = p;
  return p;
}
/** Every train of an entry on its line at scene time t (pure: the same t gives the same answer, T1). */
function worldTrafficRailAt(T, e, t) {
  const out = [];
  if (!e) return out;
  const maxTrip = Math.max(..._wtrTrips(e));
  const kLast = Math.floor((t - e.offset) / e.period), kFirst = kLast - Math.ceil(maxTrip / e.period) - 1;
  for (let k = kFirst; k <= kLast; k++) {
    const t0 = e.offset + k * e.period, tau = t - t0;
    if (tau < 0) continue;
    const tr = e.tracks[((k % e.tracks.length) + e.tracks.length) % e.tracks.length];
    const prof = _wtrProfile(e, tr);
    if (tau > prof.tEnd) continue;
    const s = prof.s(tau), p = worldTrafficLaneAt(tr, s);
    out.push({ k, track: tr, s, v: prof.vel(tau), x: p.x, z: p.z, heading: Math.atan2(p.tx, p.tz), state: prof.state(tau), t0, dir: tr.dir });
  }
  return out;
}

/* ---------- lane vehicles (intelligent driver model) ---------- */
/** One IDM step. veh { s, v, v0, len }, ahead { s, v, len } | null (an obstacle: len 0, v 0). Never past the one ahead. */
function worldTrafficIdm(veh, ahead, dt, o) {
  o = o || {};
  const a = o.a || WORLD_TRAFFIC.a, b = o.b || WORLD_TRAFFIC.b, s0 = o.s0 || WORLD_TRAFFIC.s0, Th = o.headway || WORLD_TRAFFIC.headway;
  const v0 = Math.max(0.1, veh.v0), v = veh.v;
  let acc = a * (1 - Math.pow(v / v0, 4));
  let limit = Infinity;
  if (ahead) {
    const gap = ahead.s - (ahead.len || 0) / 2 - (veh.s + veh.len / 2), dv = v - (ahead.v || 0);
    const sStar = s0 + Math.max(0, v * Th + v * dv / (2 * Math.sqrt(a * b)));
    acc -= a * Math.pow(sStar / Math.max(0.1, gap), 2);
    limit = ahead.s - (ahead.len || 0) / 2 - veh.len / 2 - 0.5;
  }
  let nv = Math.max(0, Math.min(v0 * 1.05, v + acc * dt));
  let ns = veh.s + nv * dt;
  if (ns > limit) { ns = Math.max(veh.s, limit); nv = Math.min(nv, Math.max(0, (ns - veh.s) / dt)); }
  return { v: nv, s: ns, acc };
}
/**
 * All lane vehicles one step. vehicles: [{ lane, s, v, v0, len, stop?: { s, until, id }, dwell }], o: { t, pedOn(crossing) -> bool,
 * onArrive(veh, stop), onDepart(veh, stop) }. Sorted per lane front first; each vehicle follows the nearest of: the vehicle ahead,
 * a crossing with someone on it, its bus stop, an occupied lane crossing it must give way at.
 */
function worldTrafficStep(T, vehicles, dt, o) {
  o = o || {};
  const byLane = new Map();
  for (const v of vehicles) { if (!byLane.has(v.lane)) byLane.set(v.lane, []); byLane.get(v.lane).push(v); }
  const laneOf = (id) => T.lanes.find(l => l.id === id);
  for (const [lid, list] of byLane) {
    list.sort((p, q) => q.s - p.s);
    const lane = laneOf(lid); if (!lane) continue;
    for (let i = 0; i < list.length; i++) {
      const v = list[i], front = v.s + v.len / 2;
      let ahead = i > 0 ? { s: list[i - 1].s, v: list[i - 1].v, len: list[i - 1].len } : null;
      const consider = (s) => { if (s > front - 0.2 && (!ahead || s < ahead.s - (ahead.len || 0) / 2)) ahead = { s, v: 0, len: 0 }; };
      // crossings with someone on them: stop 1.5 m before
      for (const c of lane.cross) if (c.s0 - front < 25 && c.s1 > v.s - v.len / 2 && o.pedOn && o.pedOn(c)) { if (front <= c.s0 - 0.5) consider(c.s0 - 1.5); }
      // a bus at its stop
      if (v.stopAt && !v.stopAt.done) {
        const st = v.stopAt;
        if (st.until != null) { if ((o.t || 0) >= st.until) { st.done = true; if (o.onDepart) o.onDepart(v, st.stop); } else consider(v.s + v.len / 2 + 0.01); }
        else if (st.s - v.s < 40) {
          // the stop line: an obstacle a standstill gap beyond the bus's front at the stop, so it halts with its middle there
          if (Math.abs(st.s - v.s) < 1.0 && v.v < 0.5) { st.until = (o.t || 0) + st.dwell; v.v = 0; if (o.onArrive) o.onArrive(v, st.stop); consider(v.s + v.len / 2 + 0.01); }
          else consider(st.s + v.len / 2 + (v.s0 || WORLD_TRAFFIC.s0));
        }
      }
      // give way where another lane crosses and is occupied
      for (const cf of lane.conflicts) {
        if (cf.prio || cf.s - front > 20 || cf.s < v.s - v.len / 2) continue;
        const other = byLane.get(cf.lane) || [];
        if (other.some(w => Math.abs(w.s - cf.os) < w.len / 2 + 4)) { if (front <= cf.s - 3) consider(cf.s - 4); }
      }
      const r = worldTrafficIdm(v, ahead, dt, { a: v.accel, s0: v.s0 });
      v.v = r.v; v.s = r.s;
    }
  }
}

/* ---------- boats under way ---------- */
/**
 * The flow direction of a boat pulled towards the middle of its channel: the clearance either side (the swim layer's clear
 * field) decides which way and how hard. Keeps right of another boat it meets (UK waterways pass port to port).
 */
function worldTrafficBoatSteer(nav, layer, x, z, dir, r, o) {
  if (!dir) return null;
  o = o || {};
  const L = nav && nav.layers[layer]; if (!L || !L.data || typeof worldNavCell !== 'function') return dir;
  const lx = -dir[1], lz = dir[0];
  const clearAt = (px, pz) => { const k = worldNavCell(nav, layer, px, pz); return k >= 0 && L.data[k] ? L.clear[k] : 0; };
  let cl = 0, cr = 0;
  for (const d of [1.5, 3, 4.5]) { cl += clearAt(x + lx * d, z + lz * d); cr += clearAt(x - lx * d, z - lz * d); }
  let push = Math.max(-0.9, Math.min(0.9, (cl - cr) / 3 * 0.35));
  if (o.meet) push -= 0.35;                                     // keep to the right of an oncoming boat
  const nx = dir[0] + lx * push, nz = dir[1] + lz * push, n = Math.hypot(nx, nz) || 1;
  return [nx / n, nz / n];
}
