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
// where a face tapers below this share of its height it is no longer drawn as a face (the terrain strips draw the slope that is left)
const WORLD_CLIFF_MIN_M = 0.2;
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
  if (m < WORLD_CLIFF_MIN_M) return false;
  const tTop = Math.max(0.05, g.b * Math.max(0, g.H * m - Math.min(g.lipH * m, g.H * m * 0.2) - g.hs * m));
  return t > -1.2 && t < tTop + g.lipW + 1.2;
}

/* ============================================================
   The picture of the face (TR6 to TR9). worldCliffPrims(world, cam, o) -> [prim]: the face in COLUMNS (a column is where the face is
   one screen-column wide, about 7 px), grouped by depth (3 % bins, as the terrain strips) so every group orders with whatever stands
   on the ground in front of it, each prim { kind: 'line', sub: 'terrain', zKey, foot (the plan of the run), box, ops }. The ops are
   the drawing, in the order it is painted: the beds of the rock (horizontal strata: one smooth gradient fill a bed, so the tone drifts
   along it and never tiles), an ambient shade (the foot is damp and dark, the top dry and pale), the shade under every bed that stands
   proud, weathering streaks (the long dark water stains are the face's signature), lichen, the ledge lines (a dark line with a light
   catch, in runs of a few metres to a few tens, never across the whole cliff), the joints (grykes: vertical, dark, jogging at the beds),
   tufts and small trees on the ledges, and the turf of the rim. Everything is placed in (s, h) along the face (metres along the plan,
   metres of height), from a seeded texture of the whole cliff, so it is the same in every group and every frame and never shimmers
   (TR8). The colours are base colours: the material system and the light grade them when drawn.
   ============================================================ */
const _WCL_LOOK = Object.freeze({
  limestone: { base: '#c7c3b8', dark: '#4b4843', light: '#e6e3d8', stain: '#3f443f', lichen: '#aaa66a', moss: '#667f48', bed: [1.5, 6.5], joint: [3, 10], tone: 0.1, joints: 1, streak: 1, ledge: 1, veg: 1 },
  gritstone: { base: '#968d7c', dark: '#3b3731', light: '#b9b09e', stain: '#34332e', lichen: '#9b9656', moss: '#586f3a', bed: [3, 9], joint: [9, 28], tone: 0.07, joints: 0.5, streak: 0.8, ledge: 0.9, veg: 0.6 },
  chalk: { base: '#e9e7de', dark: '#85827a', light: '#f7f6ee', stain: '#868b7c', lichen: '#bab58c', moss: '#7b9b50', bed: [0.7, 2.4], joint: [10, 30], tone: 0.03, joints: 0.3, streak: 0.4, ledge: 0.55, veg: 1.2 },
  sandstone: { base: '#c8aa80', dark: '#5f4932', light: '#dfc59e', stain: '#5a4a38', lichen: '#a9a35c', moss: '#62793e', bed: [1.2, 4.5], joint: [5, 16], tone: 0.07, joints: 0.7, streak: 0.9, ledge: 0.9, veg: 0.8 },
  slate: { base: '#6e7278', dark: '#25282c', light: '#8f949a', stain: '#23262a', lichen: '#7e8564', moss: '#4f6a3e', bed: [0.35, 1.3], joint: [1.2, 4], tone: 0.06, joints: 1.6, streak: 0.8, ledge: 0.6, veg: 0.4 },
  granite: { base: '#a29d95', dark: '#3d3a36', light: '#c4c0b8', stain: '#383a38', lichen: '#a09b62', moss: '#5a7340', bed: [2.5, 7.5], joint: [2.5, 8], tone: 0.06, joints: 1.2, streak: 0.8, ledge: 0.7, veg: 0.5 },
});
function _wclHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wclRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Smooth 1-D noise in [-1, 1] from a seed and a position (value noise on a lattice, smoothstep between). */
function _wclN1(seed, x) {
  const i = Math.floor(x), t = x - i, a = (_wclHash(seed + '|' + i) % 20001) / 10000 - 1, b = (_wclHash(seed + '|' + (i + 1)) % 20001) / 10000 - 1, u = t * t * (3 - 2 * t);
  return a + (b - a) * u;
}
const _wclR1 = v => Math.round(v * 10) / 10;
function _wclShade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
}
function _wclMix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), m = (x, y) => Math.round(x + (y - x) * t);
  return '#' + ((1 << 24) | (m((A >> 16) & 255, (B >> 16) & 255) << 16) | (m((A >> 8) & 255, (B >> 8) & 255) << 8) | m(A & 255, B & 255)).toString(16).slice(1);
}
/** The point of the plan at arc length s, with its unit tangent. */
function _wclAt(g, s) {
  const P = g.pts, C = g.cum;
  if (s <= 0) { const L = Math.sqrt(g.l2[0]) || 1; return { x: P[0][0], z: P[0][1], tx: (P[1][0] - P[0][0]) / L, tz: (P[1][1] - P[0][1]) / L }; }
  let lo = 1, hi = C.length - 1;
  if (s >= C[hi]) { const L = Math.sqrt(g.l2[hi - 1]) || 1; return { x: P[hi][0], z: P[hi][1], tx: (P[hi][0] - P[hi - 1][0]) / L, tz: (P[hi][1] - P[hi - 1][1]) / L }; }
  while (lo < hi) { const mid = (lo + hi) >> 1; if (C[mid] < s) lo = mid + 1; else hi = mid; }
  const i = lo, L = Math.sqrt(g.l2[i - 1]) || 1, t = (s - C[i - 1]) / L;
  return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, z: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, tx: (P[i][0] - P[i - 1][0]) / L, tz: (P[i][1] - P[i - 1][1]) / L };
}
/** The texture of the whole cliff (seeded, memoised on the geometry): beds, ledges, joints, streaks, tufts, trees, lichen. All in (s, h) metres. */
function _wclTex(g) {
  if (g.tex) return g.tex;
  const lk = _WCL_LOOK[g.rock] || _WCL_LOOK.limestone, r = _wclRng(_wclHash((g.id || 'cliff') + '|' + g.rock + '|' + Math.round(g.L) + '|' + Math.round(g.H))), seed = String(_wclHash((g.id || 'c') + g.rock));
  const beds = [];
  let h = -r() * 2;
  while (h < g.H + 3) {
    const th = lk.bed[0] + (lk.bed[1] - lk.bed[0]) * Math.pow(r(), 1.5);
    beds.push({ h0: h, th, tone: r() * 2 - 1, prom: Math.pow(r(), 1.4), dip: (r() * 2 - 1) * 0.6, seed: seed + 'b' + beds.length, lich: r() < 0.3 });
    h += th;
  }
  // ledges: a run of a few metres to a few tens along a bed boundary where that bed stands proud (a dark line, shade below, tufts on it)
  const ledges = [], tufts = [], trees = [];
  beds.forEach((b, k) => {
    if (k < 1 || b.prom < 0.28) return;
    for (let s = r() * 30; s < g.L; ) {
      const len = 8 + Math.pow(r(), 1.3) * 90 * (0.4 + b.prom);
      if (r() < 0.5 + 0.45 * b.prom) {
        ledges.push({ k, s0: s, s1: Math.min(g.L, s + len), prom: b.prom * (0.7 + 0.5 * r()) });
        // grass and shrub clumps on the ledge: clustered, a few tufts each, never a row
        for (let c = s + r() * 8; c < Math.min(g.L, s + len); c += 6 + r() * 26) {
          if (r() > 0.8 * lk.veg * (0.5 + b.prom)) continue;
          const n = 2 + Math.floor(r() * 4);
          for (let i = 0; i < n; i++) tufts.push({ s: c + (r() - 0.5) * 5, k, w: 0.7 + r() * 1.9, h: 0.5 + r() * 1.1, tone: r(), seed: Math.floor(r() * 1e6) });
        }
        if (b.prom > 0.6 && len > 18) for (let c = s + r() * len; c < s + len; c += 30 + r() * 60) if (r() < 0.42 * lk.veg) trees.push({ s: c, k, h: 2.5 + r() * 5, w: 1.6 + r() * 2.2, seed: Math.floor(r() * 1e6), kind: r() < 0.5 ? 'ash' : 'thorn' });
      }
      s += len + 3 + r() * 45;
    }
  });
  // joints (grykes): vertical, through one bed or many, jogging a little at every bed; a few run the whole height
  const joints = [];
  for (let s = r() * lk.joint[1]; s < g.L; s += (lk.joint[0] + (lk.joint[1] - lk.joint[0]) * r()) / Math.max(0.2, lk.joints)) {
    const major = r() < 0.14, k0 = major ? 0 : Math.floor(r() * beds.length * 0.8), span = major ? beds.length : r() < 0.2 ? 5 + Math.floor(r() * 9) : 1 + Math.floor(Math.pow(r(), 2) * 6);
    joints.push({ s, k0, k1: Math.min(beds.length - 1, k0 + span), w: (major ? 0.3 : 0.12) + r() * 0.3, k: major ? 0.85 : 0.35 + r() * 0.5, jog: Array.from({ length: Math.min(span, beds.length) + 2 }, () => (r() - 0.5) * 0.7), major });
  }
  // weathering streaks: the long dark water stains from a ledge or the rim down the face (the signature of a limestone cliff), short
  // runs under ledges, and a few clean pale ones
  const streaks = [];
  for (let s = r() * 14; s < g.L; s += (5 + r() * 16) / Math.max(0.2, lk.streak)) streaks.push({ s, w: 0.4 + r() * 1.8, k: Math.floor(r() * beds.length), len: 3 + r() * 24, a: 0.09 + r() * 0.16, pale: r() < 0.15, major: false });
  for (let s = r() * 24; s < g.L; s += (14 + r() * 38) / Math.max(0.2, lk.streak)) streaks.push({ s, w: 1.2 + r() * 4.2, k: beds.length - 1, len: g.H * (0.4 + r() * 0.65), a: 0.1 + r() * 0.16, pale: false, major: true });
  // fine marks: hairlines along the bed boundaries (in runs) and short dashes and cracks scattered over the face
  const hair = [], dashes = [];
  beds.forEach((b, k) => { if (k < 1) return; for (let s = r() * 20; s < g.L; ) { const len = 10 + r() * 70; hair.push({ k, s0: s, s1: Math.min(g.L, s + len), a: 0.08 + 0.12 * r() }); s += len + 3 + r() * 25; } });
  for (let s = r() * 2; s < g.L; s += 0.7 + r() * 1.4) { const k = Math.floor(r() * beds.length); dashes.push({ s, k, dh: (r() - 0.3) * Math.min(2.2, beds[k].th) * 0.9, len: 0.8 + Math.pow(r(), 2) * 6, a: 0.1 + r() * 0.2, v: r() < 0.3, w: 0.8 + r() * 0.7 }); }
  const lichen = [];
  for (let s = r() * 9; s < g.L; s += 7 + r() * 16) lichen.push({ s, h: r() * g.H, w: 0.8 + r() * 3, hh: 0.5 + r() * 1.6, k: r() * 0.14 + 0.05, seed: Math.floor(r() * 1e6), g: r() < 0.5 });
  // the rim: turf tussocks and a few thorns standing against the sky
  const rim = [], rimTrees = [];
  for (let s = 0; s < g.L; s += 1.6 + r() * 2.8) rim.push({ s, a: r(), w: 1.5 + r() * 3.5, h: 0.3 + r() * 0.9, seed: Math.floor(r() * 1e6) });
  for (let s = r() * 30; s < g.L; s += 35 + r() * 80) if (r() < 0.6 * lk.veg) rimTrees.push({ s, h: 3 + r() * 4.5, w: 2.2 + r() * 2.6, seed: Math.floor(r() * 1e6), kind: r() < 0.4 ? 'ash' : 'thorn' });
  g.tex = { lk, beds, ledges, hair, dashes, joints, streaks, tufts, trees, lichen, rim, rimTrees, seed };
  return g.tex;
}
/** The height of bed boundary k at arc length s (the strata dip a little and wander: they are never ruled lines). */
function _wclBound(g, T, k, s) {
  const b = T.beds[k];
  return b.h0 + b.dip * s / 100 + 0.2 * _wclN1(b.seed, s / 28);
}
/** The columns of a cliff's face: where it is seen, one every ~7 px of screen. [{ s, x, z, X, nx, nz, m }] (n: the unit normal toward the low side). */
function _wclColumns(g, cam) {
  const f = cam.f, x0 = _wclNum(cam.x0) ? cam.x0 : 800, near = Math.max(0.3, (cam.dMin || 1) * 0.25), cols = [];
  let s = 0, guard = 0;
  while (s <= g.L + 1e-6 && guard++ < 1600) {
    const a = _wclAt(g, s), x = a.x, z = a.z, nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx, m = _wclTaper(g, s);
    let step = 5;
    if (z > near) {
      const X = x0 + f * x / z, cross = Math.abs(a.tx * z - x * a.tz);
      step = Math.max(0.25, Math.min(5, 7 * z * z / (f * Math.max(0.02, cross))));
      if (m > WORLD_CLIFF_MIN_M && -(x * nx + z * nz) > 0.02 * Math.hypot(x, z) && X > -450 && X < 2050) cols.push({ s, x, z, X, nx, nz, tx: a.tx, tz: a.tz, m });
    }
    s += step;
  }
  return cols;
}
function worldCliffPrims(world, cam, o) {
  o = o || {};
  const out = [];
  if (!world || !cam || !_wclNum(cam.f)) return out;
  for (const f of world.features || []) {
    const g = worldCliffGeom(f);
    if (!g) continue;
    for (const p of _wclFace(g, cam, o)) out.push(p);
  }
  return out;
}
function _wclFace(g, cam, o) {
  const T = _wclTex(g), lk = T.lk, f = cam.f, x0 = _wclNum(cam.x0) ? cam.x0 : 800, hz = cam.horizon, eye = cam.eye, cols = _wclColumns(g, cam), prims = [];
  if (!cols.length) return prims;
  const lnB = Math.log(1.03);
  // the point of the face at arc length s and height y (the batter leans the face back into the rock as it rises)
  const P = (s, y) => {
    const a = _wclAt(g, s), nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx, m = _wclTaper(g, s), off = g.b > 0 ? g.b * Math.max(0, y - g.hs * m) : 0, x = a.x - nx * off, z = a.z - nz * off;
    return { X: x0 + f * x / Math.max(0.3, z), Y: hz + f * (eye - y) / Math.max(0.3, z), k: f / Math.max(0.3, z), z, x, m, nx, nz };
  };
  const bounds = (m) => { const hi = Math.max(0, g.H * m - Math.min(g.lipH * m, g.H * m * 0.2)); return [g.hs * m, hi]; };
  const rimLift = (s) => 1 + 0.012 * _wclN1(T.seed + 'rl', s / 55);          // the rim is never a ruled line
  // groups of columns by depth bin
  const groups = [];
  let cur = null;
  for (const c of cols) {
    const bin = Math.floor(Math.log(c.z) / lnB);
    if (cur && bin === cur.bin && c.s - cur.cols[cur.cols.length - 1].s <= 8) cur.cols.push(c); else { cur = { bin, cols: [c] }; groups.push(cur); }
  }
  groups.forEach((G, gi) => {
    const C = G.cols.slice(), nxt = groups[gi + 1];
    // the beds reach two columns into a NEARER neighbour (which is drawn after and covers them): an overlap, never a hairline seam; the
    // overlap must never be under a farther neighbour, whose own marks it would paint over
    const prv = groups[gi - 1];
    let Cb = C;
    if (nxt && nxt.cols[0].s - C[C.length - 1].s <= 8) { C.push(nxt.cols[0]); if (nxt.cols[0].z < G.cols[G.cols.length - 1].z) Cb = Cb.concat(nxt.cols.slice(1, 3)); }
    if (prv && C[0].s - prv.cols[prv.cols.length - 1].s <= 8 && prv.cols[prv.cols.length - 1].z < G.cols[0].z) Cb = prv.cols.slice(-3, -1).concat(Cb);
    if (C.length < 2) return;
    const sa = C[0].s, sb = C[C.length - 1].s, ops = [], cm = C[Math.floor(C.length / 2)], nrm = [_wclR1(cm.nx * 100) / 100, _wclR1(cm.nz * 100) / 100];
    const add = (op) => { ops.push(op); return op; };
    const colBox = [Infinity, Infinity, -Infinity, -Infinity];
    const note = (pts) => { for (const q of pts) { if (q[0] < colBox[0]) colBox[0] = q[0]; if (q[1] < colBox[1]) colBox[1] = q[1]; if (q[0] > colBox[2]) colBox[2] = q[0]; if (q[1] > colBox[3]) colBox[3] = q[1]; } };
    const rnd1 = pts => pts.map(q => [_wclR1(q[0]), _wclR1(q[1])]);
    const fill = (pts, mat, hex, a, extra) => { if (pts.length < 3) return; const p = rnd1(pts); note(p); add(Object.assign({ t: 'f', p, m: mat, h: hex, a: a == null ? 1 : a, n: nrm }, extra || {})); };
    const stroke = (pts, mat, hex, w, a, extra) => { if (pts.length < 2) return; const p = rnd1(pts); note(p); add(Object.assign({ t: 's', p, m: mat, h: hex, w: Math.round(Math.max(0.4, w) * 10) / 10, a: a == null ? 1 : a, n: nrm }, extra || {})); };
    // the screen polyline of a run along bed boundary k between arc lengths s0 and s1 (columns of the group inside it, and its own ends)
    const runPts = (k, s0, s1, yOff) => {
      const ss = [Math.max(s0, sa)];
      for (const c of C) if (c.s > ss[0] + 0.01 && c.s < Math.min(s1, sb) - 0.01) ss.push(c.s);
      ss.push(Math.min(s1, sb));
      const out = [];
      for (const s of ss) {
        const y = _wclBound(g, T, k, s) + (yOff || 0), m = P(s, 0).m, [lo, hi] = bounds(m);
        if (y <= lo + 0.3 || y >= hi - 0.2) { if (out.length > 1) break; out.length = 0; continue; }
        const p = P(s, y); out.push([p.X, p.Y, p.k, s]);
      }
      return out.length > 1 ? out : [];
    };
    // ---- 1. the beds: one smooth gradient fill a bed across the whole group (the tone drifts along it, shaded by each column's own normal)
    for (let k = 0; k < T.beds.length; k++) {
      const bed = T.beds[k], top = [], bot = [], stops = [];
      let any = false, thin = false;
      const X0 = Cb[0].X, X1 = Cb[Cb.length - 1].X, span = Math.max(1, X1 - X0);
      Cb.forEach((c, i) => {
        const [lo, hi] = bounds(c.m), yb = Math.max(lo, Math.min(hi, _wclBound(g, T, k, c.s))), yt = Math.max(lo, Math.min(hi, k + 1 < T.beds.length ? _wclBound(g, T, k + 1, c.s) : g.H + 5));
        if (yt - yb > 0.02) any = true; else thin = true;
        const pb = P(c.s, yb), pt = P(c.s, yt);
        top.push([pt.X, pt.Y]); bot.push([pb.X, pb.Y + (yt - yb > 0.02 ? 0.7 : 0)]);
        if (i % 2 === 0 || i === Cb.length - 1) {
          const hmid = (bed.h0 + bed.th / 2) / Math.max(1, g.H), tone = 1 + lk.tone * (0.6 * bed.tone + 1.2 * (bed.prom - 0.4)) + 0.03 * _wclN1(bed.seed + 't', c.s / 11) + 0.045 * _wclN1(T.seed + 'v', c.s / 13) + 0.07 * (hmid - 0.5);
          // the foot is damp and dark, the top dry and pale
          const amb = 0.86 + 0.18 * Math.pow(Math.max(0, Math.min(1, hmid)), 0.6);
          let hex = _wclShade(lk.base, Math.round(tone * amb * 80) / 80);
          if (hmid < 0.08) hex = _wclMix(hex, lk.moss, 0.2 * (1 - hmid / 0.08));
          if (bed.lich) { const ln = _wclN1(bed.seed + 'l', c.s / 22); if (ln > 0.35) hex = _wclMix(hex, lk.lichen, 0.28 * Math.min(1, (ln - 0.35) * 3)); }
          // the face is never one plane: pillars and recesses turn its normal a little (lit on one side, shaded on the other)
          const wob = 0.28 * _wclN1(T.seed + 'w', c.s / 9) + 0.16 * _wclN1(T.seed + 'w2', c.s / 3.7), cw = Math.cos(wob), sw = Math.sin(wob);
          stops.push([_wclR1((c.X - X0) / span * 100) / 100, hex, _wclR1((c.nx * cw - c.nz * sw) * 100) / 100, _wclR1((c.nx * sw + c.nz * cw) * 100) / 100]);
        }
      });
      if (!any) continue;
      const poly = top.concat(bot.reverse()), cx = poly.reduce((s, q) => s + q[0], 0) / poly.length, cy = poly.reduce((s, q) => s + q[1], 0) / poly.length;
      // (a bed that pinches out where the face tapers to nothing is not grown: slivers there would stripe the ground beyond)
      const pp = rnd1(thin ? poly : poly.map(q => { const dx = q[0] - cx, dy = q[1] - cy, L = Math.hypot(dx, dy) || 1; return [q[0] + dx / L * 0.5, q[1] + dy / L * 0.3]; }));
      note(pp);
      add({ t: 'fg', p: pp, m: 'stone', x0: _wclR1(X0), x1: _wclR1(X1), st: stops, a: 1, n: nrm });
    }
    // ---- 2. (the ambient shade of the foot and the top is in the beds' own tone: an overlay per group left a hairline at every group's edge)
    // ---- 3. weathering streaks (the long dark water stains first), then lichen
    for (const st of T.streaks) {
      if (st.s < sa || st.s >= sb) continue;
      const kk = Math.min(T.beds.length - 1, st.k), p0 = P(st.s, 0), [lo, hi] = bounds(p0.m), yTop = st.major ? hi - 0.4 - 2.5 * Math.abs(_wclN1(T.seed + 'st' + Math.round(st.s), 2.1)) : Math.min(hi - 0.5, _wclBound(g, T, kk, st.s)), yBot = Math.max(lo, yTop - st.len);
      if (yTop - yBot < 1) continue;
      const pa = P(st.s - st.w / 2, yTop), pb = P(st.s + st.w / 2, yTop), qa = P(st.s - st.w * (st.major ? 0.7 : 0.9), yBot), qb = P(st.s + st.w * (st.major ? 0.7 : 0.9), yBot);
      const col = st.pale ? lk.light : lk.stain, rr = _wclRng(Math.round(st.s * 100) + 7), nS = 9, L2 = [], R2 = [];
      // ragged edges: the half width swells and shrinks down the run, the centre wanders
      for (let i = 0; i <= nS; i++) {
        const u = i / nS, y = yTop + (yBot - yTop) * u, wv = st.w * (st.major ? 0.5 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.1)) : 0.5 + 0.5 * u) * (0.75 + rr() * 0.5), cen = (rr() - 0.5) * st.w * 0.35;
        L2.push(P(st.s + cen - wv, y)); R2.push(P(st.s + cen + wv, y));
      }
      const poly = L2.map(q => [q.X, q.Y]).concat(R2.slice().reverse().map(q => [q.X, q.Y]));
      if (st.major) {
        // a soft vertical gradient: dark under the rim, fading out down the face
        const pp = rnd1(poly); note(pp);
        add({ t: 'fv', p: pp, y0: _wclR1(Math.min(...L2.map(q => q.Y), ...R2.map(q => q.Y))), y1: _wclR1(Math.max(...L2.map(q => q.Y), ...R2.map(q => q.Y))), st: [[0, col, st.a * 1.2], [0.5, col, st.a * 0.85], [1, col, 0]], m: 'stone', n: nrm, wetK: 1.4 });
      } else fill(poly, 'stone', col, st.a * (st.pale ? 0.7 : 1));
    }
    for (const l of T.lichen) {
      if (l.s < sa || l.s >= sb) continue;
      const m = P(l.s, 0).m, [lo, hi] = bounds(m);
      if (l.h < lo + 1 || l.h > hi - 1) continue;
      const a = P(l.s - l.w / 2, l.h), b = P(l.s + l.w / 2, l.h + l.hh), rr = _wclRng(l.seed), pts = [];
      const cxp = (a.X + b.X) / 2, cyp = (a.Y + b.Y) / 2, rx = Math.max(1.2, Math.abs(b.X - a.X) / 2), ry = Math.max(0.9, Math.abs(a.Y - b.Y) / 2);
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2, rj = 0.7 + rr() * 0.5; pts.push([cxp + Math.cos(an) * rx * rj, cyp + Math.sin(an) * ry * rj]); }
      fill(pts, 'stone', l.g ? lk.lichen : lk.moss, l.k * 1.3);
    }
    // ---- 3b. the fine marks: bedding hairlines in runs, dashes and short cracks
    for (const hr of T.hair) {
      if (hr.s1 <= sa || hr.s0 >= sb) continue;
      const run = runPts(hr.k, hr.s0, hr.s1, 0);
      if (run.length > 1) stroke(run.map(q => [q[0], q[1]]), 'stone', lk.dark, 0.8, hr.a);
    }
    for (const d of T.dashes) {
      if (d.s < sa || d.s >= sb) continue;
      const y = _wclBound(g, T, d.k, d.s) + d.dh, m = P(d.s, 0).m, [lo, hi] = bounds(m);
      if (y < lo + 0.5 || y > hi - 0.5) continue;
      const a = P(d.s, y), b = d.v ? P(d.s + 0.15, y - d.len * 0.6) : P(d.s + d.len, y + d.len * 0.02);
      stroke([[a.X, a.Y], [(a.X + b.X) / 2 + (d.v ? 0.6 : 0), (a.Y + b.Y) / 2], [b.X, b.Y]], 'stone', lk.dark, d.w, d.a);
    }
    // ---- 4. the ledges: shade below the lip, a dark line, a pale catch (runs, not rules)
    for (const ld of T.ledges) {
      if (ld.s1 <= sa || ld.s0 >= sb) continue;
      const run = runPts(ld.k, ld.s0, ld.s1, 0);
      if (run.length < 2) continue;
      const kk = run.reduce((a, q) => a + q[2], 0) / run.length, sh = (0.5 + 3.4 * ld.prom * ld.prom * ld.prom * lk.ledge) * kk;
      const pp = rnd1(run.map(q => [q[0], q[1]]).concat(run.slice().reverse().map(q => [q[0], q[1] + sh]))); note(pp);
      add({ t: 'fv', p: pp, y0: _wclR1(Math.min(...run.map(q => q[1]))), y1: _wclR1(Math.max(...run.map(q => q[1])) + sh), st: [[0, lk.dark, (0.22 + 0.32 * ld.prom) * lk.ledge], [0.35, lk.dark, (0.1 + 0.14 * ld.prom) * lk.ledge], [1, lk.dark, 0]], m: 'stone', n: nrm });
      if (ld.prom > 0.42) {
        stroke(run.map(q => [q[0], q[1] + 0.3]), 'stone', lk.dark, Math.max(1, kk * (0.12 + 0.34 * ld.prom) * lk.ledge), 0.42 + 0.4 * ld.prom);
        stroke(run.map(q => [q[0], q[1] - Math.max(0.9, kk * 0.14)]), 'stone', lk.light, Math.max(0.8, kk * 0.1), 0.16 + 0.2 * ld.prom, { up: true });
        // snow lies along the lip of a ledge that stands proud (snow days only)
        stroke(run.map(q => [q[0], q[1] - Math.max(0.9, kk * 0.12)]), 'grass', '#cbd8c4', Math.max(1.4, kk * (0.16 + 0.3 * ld.prom)), 0.95, { snow: true, up: true });
      }
    }
    // ---- 5. the joints: grykes
    for (const j of T.joints) {
      if (j.s < sa || j.s >= sb) continue;
      const pts = [];
      for (let k = j.k0; k <= j.k1 + 1 && k < T.beds.length; k++) {
        const s = j.s + (j.jog[k - j.k0] || 0), c0 = P(s, 0), [lo, hi] = bounds(c0.m), y = Math.max(lo, Math.min(hi, _wclBound(g, T, k, s)));
        if (y <= lo + 0.2 && k > j.k0) continue;
        const p = P(s, y); pts.push([p.X, p.Y, p.k]);
      }
      if (j.major) { const c0 = P(j.s, 0), [lo, hi] = bounds(c0.m); const pt = P(j.s, hi), pb = P(j.s, lo); pts.unshift([pt.X, pt.Y, pt.k]); pts.push([pb.X, pb.Y, pb.k]); pts.sort((a, b) => a[1] - b[1]); }
      if (pts.length < 2) continue;
      const kk = pts.reduce((a, q) => a + q[2], 0) / pts.length, wpx = Math.max(0.9, kk * j.w * lk.joints * 0.9);
      stroke(pts.map(q => [q[0], q[1]]), 'stone', lk.dark, wpx, Math.min(0.85, 0.26 + 0.5 * j.k));
      stroke(pts.map(q => [q[0] + wpx * 0.9, q[1]]), 'stone', lk.light, Math.max(0.7, wpx * 0.6), 0.14 + 0.12 * j.k, { up: true });
    }
    // ---- 6. vegetation on the ledges: tufts (clustered), then the odd small tree
    for (const tf of T.tufts) {
      if (tf.s < sa || tf.s >= sb) continue;
      const y = _wclBound(g, T, tf.k, tf.s), m = P(tf.s, 0).m, [lo, hi] = bounds(m);
      if (y < lo + 0.4 || y > hi - 0.3) continue;
      const a = P(tf.s - tf.w / 2, y), b = P(tf.s + tf.w / 2, y), c = P(tf.s, y + tf.h * 0.8), rr = _wclRng(tf.seed), n = 7, pts = [];
      const cxp = (a.X + b.X) / 2, w2 = Math.max(1.3, Math.abs(b.X - a.X) / 2), hh = Math.max(1.3, Math.abs(a.Y - c.Y) * 1.1), cy0 = a.Y - hh * 0.25;
      for (let i = 0; i < n; i++) { const an = Math.PI + i / (n - 1) * Math.PI, rj = 0.75 + rr() * 0.4; pts.push([cxp + Math.cos(an) * w2 * rj, cy0 + Math.sin(an) * hh * rj * 0.85]); }
      pts.push([cxp + w2 * 0.9, cy0 + hh * 0.2], [cxp - w2 * 0.9, cy0 + hh * 0.2]);
      fill(pts, 'grass', _wclShade('#587340', 0.8 + 0.3 * tf.tone), 0.92);
    }
    for (const tr of T.trees) {
      if (tr.s < sa || tr.s >= sb) continue;
      const y = _wclBound(g, T, tr.k, tr.s), m = P(tr.s, 0).m, [lo, hi] = bounds(m);
      if (y < lo + 1 || y > hi - 2) continue;
      const p = P(tr.s, y);
      add({ t: 'tree', x: _wclR1(p.X), y: _wclR1(p.Y + 0.4), h: _wclR1(tr.h * p.k), w: _wclR1(tr.w * p.k), seed: tr.seed, kind: tr.kind, n: nrm });
      note([[p.X - tr.w * p.k, p.Y - tr.h * p.k * 1.1], [p.X + tr.w * p.k, p.Y + 2]]);
    }
    // ---- 7. the rim: the turf cap along the top, tussocks and thorns against the sky
    const capTop = [], capBot = [];
    for (const c of C) {
      const [, hi] = bounds(c.m), lipH = Math.min(g.lipH * c.m, g.H * c.m * 0.2), bump = 0.35 * lipH * (0.5 + 0.5 * _wclN1(T.seed + 'r', c.s / 4)), lift = rimLift(c.s);
      const pb = P(c.s, hi * lift - 0.35), pt = P(c.s, hi * lift + lipH + bump);
      capBot.push([pb.X, pb.Y]); capTop.push([pt.X, pt.Y]);
    }
    if (g.H > 3) {
      fill(capTop.concat(capBot.slice().reverse()), 'grass', '#6d8a45', 1, { up: true });
      fill(capTop.map((q, i) => [q[0], q[1] + (capBot[i][1] - q[1]) * 0.45]).concat(capBot.slice().reverse().map(q => [q[0], q[1] + 0.6])), 'grass', '#4f6a35', 0.55);
      stroke(capBot.map(q => [q[0], q[1] + 0.8]), 'stone', lk.dark, Math.max(1.2, cm.m * f / cm.z * 0.5), 0.5);
      for (const rm of T.rim) {
        if (rm.s < sa || rm.s >= sb) continue;
        const m = P(rm.s, 0).m, [, hi] = bounds(m), lipH = Math.min(g.lipH * m, g.H * m * 0.2), p = P(rm.s, hi * rimLift(rm.s) + lipH), p2 = P(rm.s + rm.w, hi * rimLift(rm.s) + lipH + rm.h);
        const rr = _wclRng(rm.seed), n = 6, pts = [], cxp = (p.X + p2.X) / 2, w2 = Math.max(1.5, Math.abs(p2.X - p.X) / 2), hh = Math.max(1.5, Math.abs(p.Y - p2.Y));
        for (let i = 0; i < n; i++) { const an = Math.PI + i / (n - 1) * Math.PI; pts.push([cxp + Math.cos(an) * w2 * (0.8 + rr() * 0.3), p.Y + 1 + Math.sin(an) * hh * (0.7 + rr() * 0.4)]); }
        fill(pts, 'grass', rm.a < 0.5 ? '#6a8944' : '#5a7a3b', 1, { up: true });
      }
      for (const rt of T.rimTrees) {
        if (rt.s < sa || rt.s >= sb) continue;
        const m = P(rt.s, 0).m, [, hi] = bounds(m), lipH = Math.min(g.lipH * m, g.H * m * 0.2), p = P(rt.s, hi * rimLift(rt.s) + lipH);
        add({ t: 'tree', x: _wclR1(p.X), y: _wclR1(p.Y + 1), h: _wclR1(rt.h * p.k), w: _wclR1(rt.w * p.k), seed: rt.seed, kind: rt.kind, n: nrm, up: true });
        note([[p.X - rt.w * p.k, p.Y - rt.h * p.k * 1.1], [p.X + rt.w * p.k, p.Y + 2]]);
      }
    }
    if (!ops.length || !isFinite(colBox[0])) return;
    // the plan of this run (a thin quad along the face) is its footprint: the chunk order puts what stands in front of it after it
    const left = C.map(c => [Math.round(c.x * 100) / 100, Math.round(c.z * 100) / 100]), right = C.map(c => [Math.round((c.x + c.nx * 0.5) * 100) / 100, Math.round((c.z + c.nz * 0.5) * 100) / 100]).reverse();
    const foot = left.concat(right), zs = foot.map(q => q[1]);
    prims.push({ id: 'cliff-' + (g.id || 'c') + '-' + gi, kind: 'line', sub: 'terrain', lineKind: 'cliff', box: colBox.map(v => _wclR1(v - 2)), zKey: Math.min(...zs), foot, height: g.H, solidity: 'passable', faces: [], ops, mat: 'stone', heading: cam.heading || 0 });
  });
  return prims;
}
/** Where a point is against a cliff: { t (signed distance, positive toward the high ground), m (the taper), s (arc length) }. */
function worldCliffSample(g, x, z) {
  const n = _wclNear(g, x, z);
  return { t: (n.side * g.hi > 0 ? 1 : -1) * n.d, m: _wclTaper(g, n.s), s: n.s };
}
/** The signed distances that bound the face's own picture at taper m: from just below its foot to just past its lip. -> { tA, tB } */
function worldCliffEdges(g, m) {
  const H = g.H * m, lipH = Math.min(g.lipH * m, H * 0.2), tTop = Math.max(0.05, g.b * Math.max(0, H - lipH - g.hs * m));
  return { tA: -0.2, tB: tTop + g.lipW + 0.9 };
}
/**
 * The stones and tussocks on the talus skirt at the foot of the faces: [{ z, x, ops }] by depth (near first). The scree is thickest at the
 * face and thins to the toe, where the grass takes over; pale broken limestone, each stone with a lit top and a shadow under it. Seeded,
 * placed in plan metres (so the order puts a walker among them in the right place) and clamped to what the frame can show.
 */
function worldCliffStones(world, cam) {
  const out = [];
  if (!world || !cam || !_wclNum(cam.f)) return out;
  const f = cam.f, x0 = _wclNum(cam.x0) ? cam.x0 : 800, hz = cam.horizon, eye = cam.eye, near = Math.max(0.3, (cam.dMin || 1) * 0.25);
  for (const ft of world.features || []) {
    const g = worldCliffGeom(ft);
    if (!g || !(g.w > 2) || !(g.hs > 0.3)) continue;
    const T = _wclTex(g), lk = T.lk, r = _wclRng(_wclHash(T.seed + 'stones'));
    for (let s = 0; s < g.L && out.length < 2400; s += 1.1 + r() * 1.5) {
      const m = _wclTaper(g, s), a = _wclAt(g, s), nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx;
      if (m < 0.2 || -(a.x * nx + a.z * nz) <= 0) continue;
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const u = Math.pow(r(), 1.2), t = -g.w * u * 0.97, tuft = u > 0.45 && r() < 0.5 + 0.4 * u;
        const x = a.x + nx * -t + a.tx * (r() - 0.5) * 2, z = a.z + nz * -t + a.tz * (r() - 0.5) * 2, y = _wclProfile(g, t, m);
        if (z <= near) continue;
        const X = x0 + f * x / z;
        if (X < -150 || X > 1750) continue;
        const Y = hz + f * (eye - y) / z, k = f / z, ops = [], nrm = [_wclR1(nx * 100) / 100, _wclR1(nz * 100) / 100];
        const rr = _wclRng(Math.floor(r() * 1e9));
        if (tuft) {
          const w = (0.9 + r() * 2.2) * k, h = (0.4 + r() * 0.7) * k, pts = [];
          for (let q = 0; q < 8; q++) { const an = Math.PI + q / 7 * Math.PI, rj = 0.75 + rr() * 0.35; pts.push([X + Math.cos(an) * w * 0.5 * rj, Y + Math.sin(an) * h * rj]); }
          pts.push([X + w * 0.45, Y + 0.3], [X - w * 0.45, Y + 0.3]);
          ops.push({ t: 'f', p: pts.map(q => [_wclR1(q[0]), _wclR1(q[1])]), m: 'grass', h: _wclShade('#5f7c3f', 0.8 + 0.35 * rr()), a: 0.95 });
        } else {
          const fleck = r() < 0.35, sz = fleck ? 0.12 + r() * 0.2 : 0.3 + Math.pow(r(), 2) * 3.2, w = Math.max(1.6, sz * k), h = Math.max(1.2, sz * k * (0.5 + 0.25 * r())), tone = 0.64 + 0.3 * rr();
          const J = () => (rr() - 0.5) * 0.18;
          const body = [[X - w * 0.5, Y + 0.4], [X - w * (0.5 + J()), Y - h * 0.45], [X - w * (0.2 + J()), Y - h], [X + w * (0.22 + J()), Y - h * 0.96], [X + w * (0.5 + J()), Y - h * 0.4], [X + w * 0.48, Y + 0.4]];
          ops.push({ t: 'f', p: [[X - w * 0.6, Y + 0.5], [X + w * 0.7, Y + 0.5], [X + w * 0.55, Y + 1.4 + h * 0.1], [X - w * 0.45, Y + 1.4 + h * 0.1]].map(q => [_wclR1(q[0]), _wclR1(q[1])]), m: 'stone', h: lk.dark, a: 0.26 });
          ops.push({ t: 'f', p: body.map(q => [_wclR1(q[0]), _wclR1(q[1])]), m: 'stone', h: _wclShade(lk.base, tone), a: 1, n: nrm });
          ops.push({ t: 'f', p: [body[1], body[2], body[3], body[4], [X + w * 0.25, Y - h * 0.62], [X - w * 0.25, Y - h * 0.6]].map(q => [_wclR1(q[0]), _wclR1(q[1])]), m: 'stone', h: _wclShade(lk.light, 0.82 + 0.2 * rr()), a: 0.85, up: true });
          ops.push({ t: 'f', p: [body[2], body[3], [X + w * 0.32, Y - h * 0.68], [X - w * 0.3, Y - h * 0.7]].map(q => [_wclR1(q[0]), _wclR1(q[1])]), m: 'grass', h: '#d3deca', a: 0.95, snow: true, up: true });
        }
        out.push({ z, x, ops });
      }
    }
  }
  out.sort((p, q) => p.z - q.z);
  return out;
}
/**
 * Does a cliff hide the ground point (x, z) at height h from the eye (0, eye)? The sight line crosses the plan of the face at some
 * point; the point is hidden when the line is still below the top of the face there (never for a camera above the rim, never for a
 * point the line reaches before the face, and not for what lies beyond a face's tapering end: the line misses it).
 */
function worldCliffHides(g, x, z, h, eye) {
  const P = g.pts;
  let best = Infinity, bs = 0;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, den = x * dz - z * dx;
    if (Math.abs(den) < 1e-9) continue;
    const u = (ax * dz - az * dx) / den, v = (ax * z - az * x) / den;          // the ray O + u (x, z) against the segment A + v (dx, dz)
    if (u > 0 && u < 1 && v >= 0 && v <= 1 && u < best) { best = u; bs = g.cum[i - 1] + v * Math.sqrt(g.l2[i - 1]); }
  }
  if (!(best < 1)) return false;
  const m = _wclTaper(g, bs), top = g.H * m, yRay = eye + (h - eye) * best;
  return m > WORLD_CLIFF_MIN_M && yRay < top - 0.3;
}
