/* ============================================================
   WORLD ENGINE (scene format v3): CLIFFS (docs/dev/WORLD_ENGINE.md 1.5; requirements W2, TR5 to TR9). PURE classic script, private
   prefix _wcl. Nothing runs at load.

   A cliff is a ground feature of its own kind, `ground.features[{ kind: 'cliff', ... }]`: a rock face a few metres thick in plan and tens
   of metres high, which the relief grid (x by log depth) can never hold (at 200 m one grid row is 2 to 8 m deep: a 70 m face would
   be a ramp). So the cliff is ANALYTIC: this file owns its shape (`worldCliffHeight`, sampled by the relief compiler into the coarse
   grid every other system reads) and its picture (the face, drawn by the terrain pass with true geometry: vertical, with strata,
   joints, ledges, vegetation and a talus skirt). Any crag, quarry face, sea cliff or gorge wall takes the same spec.

     { kind: 'cliff', arc: { c: [x, z], r, from, to } | path: [[x, z], ...],   plan (camera metres): an arc of a circle (bearings in
                                                                                  degrees from straight ahead, + to the right) or a polyline
       h: 70,                   metres from the foot of the talus to the plateau
       scree: { w, h } | false, the talus skirt: horizontal width and height at the face base (default 0.45 h wide, 0.16 h high)
       batter: 0,               setback of the face per metre of height (0 is vertical; an overhang is texture, never geometry)
       rim: { w, h },           the rounded lip of the plateau (default 3 m wide, 1.5 m high)
       high: 'far' | 'left' | 'right',  which side of the path is the high ground (default: away from the camera)
       fade: m,                 the face tapers to the ground over this length at each end (default 15 % of the length, at most 40 m)
       rock: 'limestone' | 'gritstone' | 'chalk' | 'sandstone' | 'slate' | 'granite',   the look of the rock (tone, bedding, jointing) }

     worldCliffArcPath(arc)        -> [[x, z]] the arc as a polyline (a point every 5 m at most), or null
     worldCliffGeom(f)             -> the compiled cliff (smoothed path, side, profile numbers), memoised per feature object, or null
     worldCliffHeight(f, x, z)     -> the ground height at (x, z) from this cliff alone (0 away from it)
     worldCliffZone(f, x, z)       -> true where the face's own picture stands in for the ground (the face and its lip, with a margin)
   ============================================================ */
const WORLD_CLIFF_ROCKS = Object.freeze(['limestone', 'gritstone', 'chalk', 'sandstone', 'slate', 'granite']);
const _wclMemo = new WeakMap();
const _wclSm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const _wclNum = v => typeof v === 'number' && Number.isFinite(v);

/** An arc { c: [x, z], r, from, to } as a polyline: bearings in degrees from +z, positive toward +x. A point every 5 m at most (never fewer than 6). */
function worldCliffArcPath(arc) {
  if (!arc || typeof arc !== 'object' || !Array.isArray(arc.c) || arc.c.length !== 2 || !arc.c.every(_wclNum) || !_wclNum(arc.r) || !(arc.r > 1) || !_wclNum(arc.from) || !_wclNum(arc.to) || arc.from === arc.to) return null;
  const a0 = Math.min(arc.from, arc.to) * Math.PI / 180, a1 = Math.max(arc.from, arc.to) * Math.PI / 180, rev = arc.from > arc.to;
  const n = Math.max(6, Math.min(400, Math.ceil((a1 - a0) * arc.r / 5))), out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([Math.round((arc.c[0] + arc.r * Math.sin(a)) * 1000) / 1000, Math.round((arc.c[1] + arc.r * Math.cos(a)) * 1000) / 1000]); }
  return rev ? out.reverse() : out;
}
/** A polyline smoothed (Catmull-Rom) so a segment is at most about 4 m: the plan of a face is a curve, never a polygon. */
function _wclSmooth(P) {
  if (P.length < 3) {
    if (P.length === 2) { const L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), n = Math.max(1, Math.min(200, Math.ceil(L / 4))); return Array.from({ length: n + 1 }, (_, i) => [P[0][0] + (P[1][0] - P[0][0]) * i / n, P[0][1] + (P[1][1] - P[0][1]) * i / n]); }
    return P.slice();
  }
  const at = i => P[Math.max(0, Math.min(P.length - 1, i))], out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), n = Math.max(1, Math.min(60, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4)));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
}
/** The compiled cliff of a feature (see the header), or null when it has no usable plan. */
function worldCliffGeom(f) {
  if (!f || typeof f !== 'object' || f.kind !== 'cliff') return null;
  if (_wclMemo.has(f)) return _wclMemo.get(f);
  let g = null;
  try {
    const raw = Array.isArray(f.path) && f.path.length >= 2 && f.path.every(p => Array.isArray(p) && p.length >= 2 && _wclNum(p[0]) && _wclNum(p[1])) ? f.path.map(p => [p[0], p[1]]) : worldCliffArcPath(f.arc);
    const H = _wclNum(f.h) && f.h > 0 ? Math.min(f.h, 400) : 0;
    if (raw && raw.length >= 2 && H > 0) {
      const pts = _wclSmooth(raw), cum = [0], l2 = [];
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(cum[i - 1] + d); l2.push(d * d); }
      const L = cum[cum.length - 1];
      if (L > 0.5) {
        const sc = f.scree === false ? { w: 0, h: 0 } : (f.scree && typeof f.scree === 'object' ? f.scree : {});
        const sw = f.scree === false ? 0 : _wclNum(sc.w) && sc.w >= 0 ? Math.min(sc.w, 400) : 0.45 * H, sh = f.scree === false ? 0 : Math.min(H * 0.6, _wclNum(sc.h) && sc.h >= 0 ? sc.h : 0.16 * H);
        const rim = f.rim && typeof f.rim === 'object' ? f.rim : {}, lipW = _wclNum(rim.w) && rim.w > 0 ? Math.min(rim.w, 40) : 3, lipH = Math.min(H * 0.1, _wclNum(rim.h) && rim.h >= 0 ? rim.h : 1.5);
        g = { f, pts, cum, l2, L, H, hs: sh, w: sw, b: _wclNum(f.batter) && f.batter > 0 ? Math.min(f.batter, 3) : 0, lipW, lipH,
          fade: _wclNum(f.fade) && f.fade >= 0 ? Math.min(f.fade, L / 2) : Math.min(40, 0.15 * L), hi: 1, rock: WORLD_CLIFF_ROCKS.includes(f.rock) ? f.rock : 'limestone', id: f.id || null };
        // which side is the high ground: away from the camera (the origin) unless the spec says left or right
        if (f.high === 'left') g.hi = -1; else if (f.high === 'right') g.hi = 1;
        else { const n0 = _wclNear(g, 0, 0); g.hi = n0.side > 0 ? -1 : 1; }
      }
    }
  } catch (e) { g = null; }
  _wclMemo.set(f, g);
  return g;
}
/** The nearest point of the plan to (x, z): { d, s (arc length), side (> 0: right of the direction), i (segment) }. */
function _wclNear(g, x, z) {
  const P = g.pts;
  let bd = Infinity, bs = 0, bside = 0, bi = 0;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L2 = g.l2[i - 1];
    if (L2 < 1e-12) continue;
    let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + t * dx - x, pz = az + t * dz - z, d2 = px * px + pz * pz;
    if (d2 < bd) { bd = d2; bs = g.cum[i - 1] + t * Math.sqrt(L2); bside = ((x - ax) * dz - (z - az) * dx); bi = i - 1; }
  }
  return { d: Math.sqrt(bd), s: bs, side: bside, i: bi };
}
/** The height profile across the face at signed distance t (positive toward the high ground) for a taper multiplier m: foot talus, face, lip, plateau. */
function _wclProfile(g, t, m) {
  const H = g.H * m, hs = g.hs * m;
  if (t <= 0) { const s = -t; return s >= g.w || g.w <= 0 ? 0 : hs * Math.pow(1 - s / g.w, 1.35); }
  const lipH = Math.min(g.lipH * m, H * 0.2), faceTop = H - lipH, rise = Math.max(0, faceTop - hs), tTop = Math.max(0.05, g.b * rise);
  if (t < tTop) return hs + rise * (t / tTop);
  const u = (t - tTop) / g.lipW;
  return u >= 1 ? H : faceTop + lipH * (1 - (1 - u) * (1 - u));
}
/** The taper of the face along its length (s metres from the start): 1 along the face, 0 beyond its ends. */
function _wclTaper(g, s) { return g.fade > 0 ? _wclSm(s / g.fade) * _wclSm((g.L - s) / g.fade) : 1; }
/** The ground height at (x, z) from this cliff alone (see the header). */
function worldCliffHeight(f, x, z) {
  const g = worldCliffGeom(f);
  if (!g) return 0;
  const n = _wclNear(g, x, z), t = (n.side * g.hi > 0 ? 1 : -1) * n.d;
  return _wclProfile(g, t, _wclTaper(g, n.s));
}
/** Is (x, z) in the zone the face's picture stands in for: from just below the face's foot to just past its lip? */
function worldCliffZone(f, x, z) {
  const g = worldCliffGeom(f);
  if (!g) return false;
  const n = _wclNear(g, x, z), t = (n.side * g.hi > 0 ? 1 : -1) * n.d, m = _wclTaper(g, n.s);
  if (m < 0.05) return false;
  const tTop = Math.max(0.05, g.b * Math.max(0, g.H * m - Math.min(g.lipH * m, g.H * m * 0.2) - g.hs * m));
  return t > -1.2 && t < tTop + g.lipW + 1.2;
}
