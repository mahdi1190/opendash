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
       rock: 'limestone' | 'gritstone' | 'chalk' | 'sandstone' | 'slate' | 'granite',   the look of the rock (tone, bedding, jointing)
       rough: 1,                how irregular the face is (0 is a ruled plan and a level rim; default 1; 2 is a wild crag): the plan
                                buttresses and recesses (about 5 % of the height), the rim rising and falling, the scree gathered in
                                fans of different size, the beds stepping at faults
       scoop: true | false | { at: 0..1, w, depth },   a stained scoop in the face (a recess in the plan, a notch in the rim, a broad dark
                                water stain down it): default on for a limestone face 150 m long and 40 m high }

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
        g.fold = _wclFolds(pts, cum);
        if (f.high === 'left') g.hi = -1; else if (f.high === 'right') g.hi = 1;
        else { const n0 = _wclNear(g, 0, 0); g.hi = n0.side > 0 ? -1 : 1; }
        // the irregular plan, rim and talus (a face is never a ruled line): see _wclRough
        g.rough = f.rough === false ? 0 : _wclNum(f.rough) && f.rough >= 0 ? Math.min(f.rough, 3) : 1;
        g.slopeTalus = !!(_WCL_LOOK[g.rock] && _WCL_LOOK[g.rock].slopeTalus);
        _wclRough(g, f);
      }
    }
  } catch (e) { g = null; }
  _wclMemo.set(f, g);
  return g;
}
/** A smooth bump of unit height and half width w about c: exp(-((s - c) / w)^2). */
const _wclBump = (s, c, w) => { const u = (s - c) / w; return Math.exp(-u * u); };
/**
 * The irregularity of a face, seeded from the feature (so it is the same in every frame and every build), all of it analytic so the relief
 * grid, the strips and the picture agree: (1) the PLAN wanders toward and away from the camera (buttresses and recesses of 5 % of the
 * height, in three wavelengths) and a scoop is cut into it, (2) the RIM rises and falls (a table of height multipliers, 1 m apart), (3) the
 * SCREE is gathered into fans of different size with a low apron between them (tables of height and width multipliers, normalised so the
 * spec's scree numbers stay the largest). rough: 0 leaves the face as ruled (the tests of the profile maths use it).
 */
function _wclRough(g, f) {
  const n = Math.max(2, Math.ceil(g.L) + 2);
  // a camera ON the plan (within 30 m of it: the lens stands on the rim) keeps the rim where the author put it for the first 300 m: no wobble, no lowered rim
  let lensD = Infinity; for (const q of g.pts) lensD = Math.min(lensD, Math.hypot(q[0], q[1]));
  const lensK = lensD < 30 ? ((x, z) => _wclSm((Math.hypot(x, z) - 30) / 90)) : (() => 1);
  g.mod = null; g.fanH = null; g.fanW = null; g.scoop = null;
  if (!(g.rough > 0)) return;
  g.sd = String(_wclHash((g.id || 'c') + '|' + g.rock + '|' + Math.round(g.L) + '|' + Math.round(g.H) + '|' + Math.round(g.pts[0][0]) + '|' + Math.round(g.pts[0][1])));
  const r = _wclRng(_wclHash(g.sd + 'rough')), K = g.rough;
  // a scoop: a limestone amphitheatre's stained recess (default: a long, high limestone face)
  const sp = f.scoop;
  const want = sp === false ? false : sp === true || (sp && typeof sp === 'object') ? true : g.rock === 'limestone' && g.L >= 150 && g.H >= 40;
  if (want) {
    const so = sp && typeof sp === 'object' ? sp : {}, at = _wclNum(so.at) ? Math.max(0.1, Math.min(0.9, so.at)) : 0.5 + (r() - 0.5) * 0.14;
    const w = _wclNum(so.w) && so.w > 4 ? Math.min(so.w, g.L * 0.4) : Math.max(10, Math.min(g.L * 0.14, g.H * 1.1)), dep = _wclNum(so.depth) && so.depth >= 0 ? so.depth : 0.1 * g.H;
    g.scoop = { s: at * g.L, w, d: dep, notch: 0.05 };
  }
  // (1) the plan
  const P = g.pts, amp = K * Math.min(0.055 * g.H, 6), np = [], lk0 = _WCL_LOOK[g.rock] || _WCL_LOOK.limestone, bt = lk0.buttress ? lk0.buttress * Math.min(0.2 * g.H, lk0.btMax || 4.5) : 0;
  const e = Math.min(30, g.L * 0.2);
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / tl, tz = (b[1] - a[1]) / tl, s = g.cum[i];
    let d = amp * (0.55 * _wclN1(g.sd + 'pa', s / 105) + 0.3 * _wclN1(g.sd + 'pb', s / 41) + 0.15 * _wclN1(g.sd + 'pc', s / 16));
    // a blocky rock (gritstone) stands out in BUTTRESSES: stretches of 5 to 20 m that project or recede by a few metres with sharp steps between, so the
    // real sun lights one block and shades the next (a smooth arc reads as a dam wall)
    if (bt) d += bt * K * _wclStep(g.sd + 'bt', s);
    if (g.scoop) d += g.scoop.d * K * _wclBump(s, g.scoop.s, g.scoop.w);
    d *= _wclSm(s / e) * _wclSm((g.L - s) / e) * lensK(P[i][0], P[i][1]);          // (never near the lens: a spec that stands the camera on the rim keeps it there)
    np.push([P[i][0] + g.hi * tz * d, P[i][1] - g.hi * tx * d]);
  }
  g.pts = np; g.cum = [0]; g.l2 = [];
  for (let i = 1; i < np.length; i++) { const d = Math.hypot(np[i][0] - np[i - 1][0], np[i][1] - np[i - 1][1]); g.cum.push(g.cum[i - 1] + d); g.l2.push(d * d); }
  g.L = g.cum[g.cum.length - 1];
  g.fold = _wclFolds(np, g.cum);
  // (2) the rim: a multiplier of the height by metre of the plan (up to about 7 % lower, never higher)
  const hv = Math.min(0.1, 0.05 * K);
  // a blocky rock's buttresses each have their own top (a buttress a metre or two lower than the next) and a gully between two of them notches the rim
  g.runs = null;
  if (bt) { g.runs = []; let a = 0, i = 0; const w = k => 5 + 15 * (0.5 + 0.5 * _wclL1(g.sd + 'bt' + 'w', k)); while (a < g.L && i < 400) { a += w(i); i++; g.runs.push(a); } }
  g.mod = new Float32Array(Math.max(2, Math.ceil(g.L) + 2));
  for (let i = 0; i < g.mod.length; i++) {
    const s = i, pa = _wclAt(g, s), kn = lensK(pa.x, pa.z);       // (the plateau is exactly `h` beside the lens: the eye stands on it)
    let gully = 0;
    if (g.runs) { for (const b of g.runs) { const u = Math.abs(s - b); if (_wclL1(g.sd + 'gq', Math.round(b)) < 0.62) { if (b > s + 4) break; continue; } const gw = 0.8 + 1.4 * (0.5 + 0.5 * _wclL1(g.sd + 'gw', Math.round(b))); if (u < gw + 0.8) gully = Math.max(gully, (u < gw ? 1 : 1 - (u - gw) / 0.8) * (0.35 + 0.65 * (0.5 + 0.5 * _wclL1(g.sd + 'gl', Math.round(b))))); if (b > s + 4) break; } }
    g.mod[i] = 1 - kn * (hv * (0.35 + 0.65 * (0.5 + 0.5 * _wclN1(g.sd + 'h', s / 70))) + 0.4 * hv * (0.5 + 0.5 * _wclN1(g.sd + 'h2', s / 21)) + (g.scoop ? g.scoop.notch * K * _wclBump(s, g.scoop.s, g.scoop.w * 0.8) : 0)
      + (bt ? K * (0.04 * (0.5 + 0.5 * _wclStep(g.sd + 'bt', s + 0.1)) + 0.09 * gully) : 0));
  }
  // (3) the scree: cones of different size with a low apron between (the largest fan is 1, the apron 0.2)
  const nf = Math.max(1, Math.round(g.L / 42)), fans = [];
  for (let i = 0; i < nf; i++) fans.push({ c: r() * g.L, w: 9 + Math.pow(r(), 1.2) * 38, a: 0.35 + 0.65 * Math.pow(r(), 0.8) });
  fans.sort((p, q) => q.a - p.a);
  if (fans.length) fans[0].a = 1;
  const nn = Math.max(2, Math.ceil(g.L) + 2);
  g.fanH = new Float32Array(nn); g.fanW = new Float32Array(nn);
  for (let i = 0; i < nn; i++) {
    let v = 0.3;
    for (const q of fans) { const u = 1 - Math.abs(i - q.c) / q.w; if (u > 0) v = Math.max(v, q.a * Math.pow(u, 1.5)); }
    g.fanH[i] = v; g.fanW[i] = 0.5 + 0.5 * v;
  }
}
/** A piecewise-constant noise in [-1, 1] along the arc length: runs of 5 to 20 m with a sharp (3 m) step between them. */
function _wclStep(seed, s) {
  // the run boundaries are a seeded walk; find the run holding s and blend 1.5 m either side of its ends
  let a = 0, i = 0, v0 = _wclL1(seed, 0), edge = 0;
  const w = k => 5 + 15 * (0.5 + 0.5 * _wclL1(seed + 'w', k));
  while (a + w(i) < s && i < 400) { a += w(i); i++; }
  const b = a + w(i), v = _wclL1(seed, i), vp = i > 0 ? _wclL1(seed, i - 1) : v, vn = _wclL1(seed, i + 1);
  void v0; void edge;
  if (s - a < 1.5) return vp + (v - vp) * _wclSm((s - a) / 3 + 0.5);
  if (b - s < 1.5) return v + (vn - v) * _wclSm(0.5 - (b - s) / 3);
  return v;
}
/** The table value at arc length s (linear between metres), 1 when the cliff has none. */
function _wclTab(T, s) {
  if (!T) return 1;
  const u = Math.max(0, Math.min(T.length - 1.001, s)), i = Math.floor(u), f = u - i;
  return T[i] * (1 - f) + T[i + 1] * f;
}
/** Does the plan fold back on itself: a vertex within 60 m of one more than 100 m further along? (the two-step nearest search is exact only when it does not) */
function _wclFolds(P, C) {
  for (let i = 0; i < P.length; i += 4) for (let j = i + 1; j < P.length; j += 4) {
    if (C[j] - C[i] <= 100) continue;
    const dx = P[i][0] - P[j][0], dz = P[i][1] - P[j][1];
    if (dx * dx + dz * dz < 3600) return true;
  }
  return false;
}
/** The nearest segment of the plan to (x, z) among segments [i0, i1): the best { d2, s, side, i }. */
function _wclNearIn(g, x, z, i0, i1, best) {
  const P = g.pts;
  for (let i = Math.max(1, i0); i < Math.min(P.length, i1); i++) {
    const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L2 = g.l2[i - 1];
    if (L2 < 1e-12) continue;
    let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + t * dx - x, pz = az + t * dz - z, d2 = px * px + pz * pz;
    if (d2 < best.d2) { best.d2 = d2; best.s = g.cum[i - 1] + t * Math.sqrt(L2); best.side = ((x - ax) * dz - (z - az) * dx); best.i = i - 1; }
  }
  return best;
}
/**
 * The nearest point of the plan to (x, z): { d, s (arc length), side (> 0: right of the direction), i (segment) }. A short plan is
 * searched whole; a long one in two steps (every sixth vertex, then the segments round the best of those): the same answer for any
 * plan that does not fold back on itself (g.fold: a stretch of it within 60 m of another more than 100 m along), at a third of the cost
 * (the strips ask about 100 000 points). A folded plan is always searched whole.
 */
function _wclNear(g, x, z) {
  const P = g.pts, n = P.length;
  const best = { d2: Infinity, s: 0, side: 0, i: 0 };
  if (n <= 24 || g.fold) { _wclNearIn(g, x, z, 1, n, best); return { d: Math.sqrt(best.d2), s: best.s, side: best.side, i: best.i }; }
  let k = 0, bd = Infinity;
  for (let i = 0; i < n; i += 6) { const dx = P[i][0] - x, dz = P[i][1] - z, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; k = i; } }
  _wclNearIn(g, x, z, k - 8, k + 9, best);
  return { d: Math.sqrt(best.d2), s: best.s, side: best.side, i: best.i };
}
/** The height profile across the face at signed distance t (positive toward the high ground) for a taper multiplier m: foot talus, face, lip, plateau. */
function _wclProfile(g, t, m, fh, fw) {
  const H = g.H * m, hs = g.hs * m * (fh == null ? 1 : fh), W = g.w * (fw == null ? 1 : fw);
  if (t <= 0) { const s = -t; return s >= W || W <= 0 ? 0 : hs * Math.pow(1 - s / W, 1.35); }
  const lipH = Math.min(g.lipH * m, H * 0.2), faceTop = H - lipH, rise = Math.max(0, faceTop - hs), tTop = Math.max(0.05, g.b * rise);
  if (t < tTop) return hs + rise * (t / tTop);
  const u = (t - tTop) / g.lipW;
  return u >= 1 ? H : faceTop + lipH * (1 - (1 - u) * (1 - u));
}
/** The taper of the face along its length (s metres from the start): 1 along the face, 0 beyond its ends. */
function _wclTaper(g, s) { const e = g.fade > 0 ? _wclSm(s / g.fade) * _wclSm((g.L - s) / g.fade) : 1; return g.mod ? e * _wclTab(g.mod, s) : e; }
/** The ground height at (x, z) from this cliff alone (see the header). A rock whose talus lies on the slope below it (gritstone: `slopeTalus`) gives 0 on its low side: its talus is `worldCliffTalus`, laid on the ground that is there. */
function worldCliffHeight(f, x, z) {
  const g = worldCliffGeom(f);
  if (!g) return 0;
  const n = _wclNear(g, x, z), t = (n.side * g.hi > 0 ? 1 : -1) * n.d;
  if (t <= 0 && g.slopeTalus) return 0;
  return _wclProfile(g, t, _wclTaper(g, n.s), _wclTab(g.fanH, n.s), _wclTab(g.fanW, n.s));
}
/**
 * The talus of a cliff whose scree lies ON the slope below the face (a gritstone edge: the boulder slope under the crag falls with the hill, it is never a
 * level apron at the foot): its height ABOVE the ground there (0 elsewhere, and 0 for a rock whose talus is an absolute apron, such as a limestone cove).
 */
function worldCliffTalus(f, x, z) {
  const g = worldCliffGeom(f);
  if (!g || !g.slopeTalus) return 0;
  const n = _wclNear(g, x, z), t = (n.side * g.hi > 0 ? 1 : -1) * n.d;
  return t <= 0 ? _wclProfile(g, t, _wclTaper(g, n.s), _wclTab(g.fanH, n.s), _wclTab(g.fanW, n.s)) : 0;
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
  limestone: { base: '#c7c3b8', warm: '#d6cbb0', cool: '#aab0b2', dark: '#4b4843', light: '#e6e3d8', stain: '#3f443f', lichen: '#aaa66a', moss: '#667f48', bed: [1.5, 6.5], joint: [4.5, 15], tone: 0.13, joints: 1, streak: 1, ledge: 1, veg: 1 },
  // millstone grit (Stanage, Almscliff, the Roaches): massive beds a few metres thick cut by joints into big square blocks, dark with weathering and
  // soot, black drip stains, many overhanging roofs, heather and bilberry (not grass) on the ledges and the rim, rock tors against the sky, no trees
  gritstone: { base: '#6e604e', warm: '#86714f', cool: '#5a5650', dark: '#26211b', light: '#a39378', stain: '#272a22', lichen: '#a3a77c', lichen2: '#c2873c', moss: '#4f5f35', bed: [1.6, 5.2], joint: [2.2, 8], tone: 0.16, joints: 1.5, streak: 1.3, ledge: 1.2, veg: 0.5, roof: 0.62, heather: true, tors: true, pave: false, trees: false, scree: 'blocks', blocky: true, buttress: 1, btMax: 7, streakA: 2.3, slopeTalus: true },
  chalk: { base: '#e9e7de', warm: '#f1eadb', cool: '#dcdfdc', dark: '#85827a', light: '#f7f6ee', stain: '#868b7c', lichen: '#bab58c', moss: '#7b9b50', bed: [0.7, 2.4], joint: [10, 30], tone: 0.03, joints: 0.3, streak: 0.4, ledge: 0.55, veg: 1.2 },
  sandstone: { base: '#c8aa80', warm: '#d9b88a', cool: '#b99f84', dark: '#5f4932', light: '#dfc59e', stain: '#5a4a38', lichen: '#a9a35c', moss: '#62793e', bed: [1.2, 4.5], joint: [5, 16], tone: 0.07, joints: 0.7, streak: 0.9, ledge: 0.9, veg: 0.8 },
  slate: { base: '#6e7278', warm: '#7b7468', cool: '#5f666e', dark: '#25282c', light: '#8f949a', stain: '#23262a', lichen: '#7e8564', moss: '#4f6a3e', bed: [0.35, 1.3], joint: [1.2, 4], tone: 0.06, joints: 1.6, streak: 0.8, ledge: 0.6, veg: 0.4 },
  granite: { base: '#a29d95', warm: '#b3a590', cool: '#8f9396', dark: '#3d3a36', light: '#c4c0b8', stain: '#383a38', lichen: '#a09b62', moss: '#5a7340', bed: [2.5, 7.5], joint: [2.5, 8], tone: 0.06, joints: 1.2, streak: 0.8, ledge: 0.7, veg: 0.5 },
});
/** The look table of a rock (tone, bedding, jointing, vegetation) or null. */
function worldCliffLook(rock) { return _WCL_LOOK[rock] || null; }
function _wclHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wclRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Smooth 1-D noise in [-1, 1] from a seed and a position (value noise on a lattice, smoothstep between). */
const _wclLat = new Map();
function _wclL1(seed, i) {
  let m = _wclLat.get(seed);
  if (!m) { if (_wclLat.size > 400) _wclLat.clear(); m = new Map(); _wclLat.set(seed, m); }
  let v = m.get(i);
  if (v === undefined) { v = (_wclHash(seed + '|' + i) % 20001) / 10000 - 1; m.set(i, v); }
  return v;
}
function _wclN1(seed, x) {
  const i = Math.floor(x), t = x - i, a = _wclL1(seed, i), b = _wclL1(seed, i + 1), u = t * t * (3 - 2 * t);
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
  let h = Math.min(0, g.baseMin || 0) - r() * 2;
  while (h < g.H + 3) {
    const th = (lk.bed[0] + (lk.bed[1] - lk.bed[0]) * Math.pow(r(), 1.5)) * (r() < 0.12 ? 1.5 + r() : 1);
    beds.push({ h0: h, th, tone: r() * 2 - 1, warm: r() * 2 - 1, prom: Math.pow(r(), 1.4), dip: (r() * 2 - 1) * 0.6, seed: seed + 'b' + beds.length, lich: r() < 0.3 });
    h += th;
  }
  // ledges: a run of a few metres to a few tens along a bed boundary where that bed stands proud (a dark line, shade below, tufts on it)
  const ledges = [], tufts = [], trees = [];
  beds.forEach((b, k) => {
    if (k < 1 || b.prom < 0.28) return;
    for (let s = r() * 30; s < g.L; ) {
      const len = 8 + Math.pow(r(), 1.3) * 90 * (0.4 + b.prom);
      if (r() < 0.5 + 0.45 * b.prom) {
        ledges.push({ k, s0: s, s1: Math.min(g.L, s + len), prom: b.prom * (0.7 + 0.5 * r()), roof: b.prom > (lk.roof ? 0.36 : 0.5) && len > 14 && r() < (lk.roof || 0.4) });
        // grass and shrub clumps on the ledge: clustered, a few tufts each, never a row
        for (let c = s + r() * 8; c < Math.min(g.L, s + len); c += 6 + r() * 26) {
          if (r() > 0.8 * lk.veg * (0.5 + b.prom)) continue;
          const n = 2 + Math.floor(r() * 4);
          for (let i = 0; i < n; i++) tufts.push({ s: c + (r() - 0.5) * 5, k, w: 0.7 + r() * 1.9, h: 0.5 + r() * 1.1, tone: r(), seed: Math.floor(r() * 1e6) });
        }
        // ash and thorn on the wider ledges: clumps of one to four, each a different size, never an even row
        if (lk.trees !== false && b.prom > 0.34 && len > 10) for (let c = s + r() * len * 0.4; c < s + len; c += 22 + r() * 70) if (r() < 0.34 * lk.veg) {
          const nT = 1 + Math.floor(r() * 2.8), big = 0.6 + 0.5 * b.prom;
          for (let i = 0; i < nT; i++) trees.push({ s: c + (r() - 0.5) * 5, k, h: (2 + r() * 4.6) * big, w: 1.5 + r() * 2.2, seed: Math.floor(r() * 1e6), kind: r() < 0.72 ? 'ash' : 'thorn' });
        }
      }
      s += len + 3 + r() * 45;
    }
  });
  // joints (grykes): vertical, through one bed or many, jogging a little at every bed; a few run the whole height
  const joints = [], blockPanels = [];
  // a BLOCKY rock (gritstone) is cut bed by bed: each bed is a course of blocks 3 to 12 m wide, the joints between them offset from bed to bed like a wall's
  // (never one long vertical), each block its own tone, and a full-height crack (a chimney) every 40 to 90 m
  if (lk.blocky) {
    beds.forEach((b, k) => { for (let sv = r() * 8; sv < g.L; ) { const wv = lk.joint[0] + (lk.joint[1] - lk.joint[0]) * r(), s1 = Math.min(g.L, sv + wv); joints.push({ s: sv, k0: k, k1: k, w: 0.1 + r() * 0.22, k: 0.4 + r() * 0.45, jog: [(r() - 0.5) * 0.5, (r() - 0.5) * 0.5], major: false }); { const u = r(); blockPanels.push({ s0: sv, s1, k0: k, k1: k, dark: u < 0.42, col: u > 0.93 ? 'lichen' : u > 0.86 ? 'stain' : null, a: u < 0.42 ? 0.08 + 0.2 * r() : 0.05 + 0.15 * r(), bevel: r() < 0.4, bv: r(), i0: 0.1 + r() * 0.35 * wv, i1: 0.1 + r() * 0.35 * wv }); } sv = s1; } });
    if (g.runs) { for (const b of g.runs) if (b < g.L - 1) joints.push({ s: b + (r() - 0.5) * 0.6, k0: 0, k1: beds.length - 1, w: 0.45 + r() * 0.5, k: 0.95, jog: [], major: true }); }
    else for (let sv = r() * 50; sv < g.L; sv += 40 + r() * 50) joints.push({ s: sv, k0: 0, k1: beds.length - 1, w: 0.3 + r() * 0.3, k: 0.9, jog: [], major: true });
  }
  for (let s = r() * lk.joint[1]; !lk.blocky && s < g.L; s += (lk.joint[0] + (lk.joint[1] - lk.joint[0]) * r()) / Math.max(0.2, lk.joints)) {
    const major = r() < 0.14, k0 = major ? 0 : Math.floor(r() * beds.length * 0.8), span = major ? beds.length : r() < 0.2 ? 5 + Math.floor(r() * 9) : 1 + Math.floor(Math.pow(r(), 2) * 6);
    joints.push({ s, k0, k1: Math.min(beds.length - 1, k0 + span), w: (major ? 0.3 : 0.12) + r() * 0.3, k: major ? 0.85 : 0.35 + r() * 0.5, jog: Array.from({ length: Math.min(span, beds.length) + 2 }, () => (r() - 0.5) * 0.7), major });
  }
  // weathering streaks: the long dark water stains from a ledge or the rim down the face (the signature of a limestone cliff), short
  // runs under ledges, and a few clean pale ones
  const streaks = [];
  for (let s = r() * 14; s < g.L; s += (5 + r() * 16) / Math.max(0.2, lk.streak)) streaks.push({ s, w: 0.4 + r() * 1.8, k: Math.floor(r() * beds.length), len: 3 + r() * 24, a: (0.09 + r() * 0.16) * (lk.streakA || 1), pale: r() < 0.15, major: false });
  for (let s = r() * 24; s < g.L; s += (14 + r() * 38) / Math.max(0.2, lk.streak)) streaks.push({ s, w: 1.2 + r() * 4.2, k: beds.length - 1, len: g.H * (0.4 + r() * 0.65), a: (0.1 + r() * 0.16) * (lk.streakA || 1), pale: false, major: true });
  // fine marks: hairlines along the bed boundaries (in runs) and short dashes and cracks scattered over the face
  const hair = [], dashes = [];
  beds.forEach((b, k) => { if (k < 1) return; for (let s = r() * 20; s < g.L; ) { const len = 10 + r() * 70; hair.push({ k, s0: s, s1: Math.min(g.L, s + len), a: 0.08 + 0.12 * r() }); s += len + 3 + r() * 25; } });
  for (let s = r() * 2; s < g.L; s += 0.7 + r() * 1.4) { const k = Math.floor(r() * beds.length); dashes.push({ s, k, dh: (r() - 0.3) * Math.min(2.2, beds[k].th) * 0.9, len: 0.8 + Math.pow(r(), 2) * 6, a: 0.1 + r() * 0.2, v: r() < 0.3, w: 0.8 + r() * 0.7 }); }
  const lichen = [];
  for (let s = r() * 9; s < g.L; s += 7 + r() * 16) lichen.push({ s, h: r() * g.H, w: 0.8 + r() * 3, hh: 0.5 + r() * 1.6, k: r() * 0.14 + 0.05, seed: Math.floor(r() * 1e6), g: r() < 0.5 });
  // the rim: turf tussocks and a few thorns standing against the sky
  const rim = [], rimTrees = [];
  for (let s = 0; s < g.L; s += 1.6 + r() * 2.8) rim.push({ s, a: r(), w: 1.5 + r() * 3.5, h: 0.3 + r() * 0.9, seed: Math.floor(r() * 1e6) });
  for (let s = r() * 30; s < g.L; s += 35 + r() * 80) if (lk.trees !== false && r() < 0.6 * lk.veg) rimTrees.push({ s, h: 3 + r() * 4.5, w: 2.2 + r() * 2.6, seed: Math.floor(r() * 1e6), kind: r() < 0.4 ? 'ash' : 'thorn' });
  // tors: clumps of one to three blocks standing on the rim against the sky (gritstone), each 2 to 8 m wide and 1.5 to 5 m high
  const tors = [];
  if (lk.tors) for (let sv = r() * 12; sv < g.L; sv += 9 + r() * 40) { const nT = 1 + Math.floor(r() * 2.6); let o = 0; for (let i = 0; i < nT; i++) { const w = 2 + 6 * Math.pow(r(), 1.3); tors.push({ s: sv + o + w / 2, w, h: 1.4 + 3.6 * r() * (1 - 0.15 * i), tone: r(), ch: 0.15 + 0.3 * r(), seed: Math.floor(r() * 1e6) }); o += w * (0.7 + 0.5 * r()); } }
  // faults: the whole bedding steps up or down by a fraction of a bed at a few of the big joints (a block of rock sits higher than its
  // neighbour), so a ledge line is a run of offset pieces and never one ruled line; faults are the full-height joints
  const faults = [];
  if (g.rough > 0) {
    const nF = Math.max(0, Math.round(g.L / 75));
    for (let i = 0; i < nF; i++) faults.push({ s: (0.05 + 0.9 * r()) * g.L, o: (r() - 0.5) * 1.1 * g.rough });
    faults.sort((a, b) => a.s - b.s);
    for (const ft of faults) joints.push({ s: ft.s, k0: 0, k1: beds.length - 1, w: 0.3, k: 0.4, jog: [], major: true });
  }
  // panels: blocks of rock a little paler or darker than the beds around them (4 to 24 m wide, one to four beds tall)
  const panels = blockPanels;
  if (g.rough > 0 && !lk.blocky) for (let s = r() * 10; s < g.L; s += 3 + r() * 11) {
    const k0 = Math.floor(r() * Math.max(1, beds.length - 2)), span = 1 + Math.floor(r() * 3.5), dark = r() < 0.5;
    panels.push({ s0: s, s1: Math.min(g.L, s + 4 + r() * 20), k0, k1: Math.min(beds.length - 1, k0 + span), dark, a: 0.04 + 0.06 * r() * g.rough });
  }
  // the scoop's own stains: a dense run of broad dark water streaks falling from the notch in the rim
  if (g.scoop) {
    const sc = g.scoop;
    for (let s = sc.s - sc.w * 1.1; s < sc.s + sc.w * 1.1; s += 1.5 + r() * 3.4) {
      const u = Math.abs(s - sc.s) / (sc.w * 1.1), keep = 1 - u * u;
      if (r() > keep + 0.1) continue;
      streaks.push({ s, w: 0.8 + r() * 3.0, k: beds.length - 1, len: g.H * (0.3 + 0.6 * r() * keep + 0.15), a: 0.05 + 0.11 * keep * r(), pale: false, major: true });
    }
  }
  // the pavement at the lip: blocks (clints) 1 to 5 m wide with a narrow dark gap (a grike) between, the top of each at its own height
  const blocks = [];
  for (let s = 0; s < g.L; ) {
    const w = 0.9 + Math.pow(r(), 1.2) * 6, gap = r() < 0.12 ? 0.6 + r() * 1.4 : 0.1 + r() * 0.3;
    blocks.push({ s0: s, s1: Math.min(g.L, s + w), dh: (r() - 0.4) * 2.2, sl: (r() - 0.5) * 0.9, tone: r(), step: r() });
    s += w + gap;
  }
  // turf along the lip comes in patches of a few to a few tens of metres; the rest of the rim is bare pavement
  const turf = [];
  for (let s = r() * 20; s < g.L; s += 5 + r() * 22) turf.push([s, s + 4 + r() * 24]);
  const com = (sx) => {
    if (!faults.length) return 0;
    let o = 0;
    for (const ft of faults) o += ft.o * _wclSm((sx - ft.s) / 2.4 + 0.5);
    return o;
  };
  g.tex = { tors, lk, beds, ledges, hair, dashes, joints, streaks, tufts, trees, lichen, rim, rimTrees, seed, faults, panels, blocks, turf, com };
  return g.tex;
}
/** The height of bed boundary k at arc length s (the strata dip a little and wander: they are never ruled lines). */
function _wclBound(g, T, k, s) {
  const b = T.beds[k], A = Math.min(0.45, 0.2 * b.th) * (g.rough > 0 ? 1 : 0.45);
  return b.h0 + b.dip * s / 100 + A * _wclN1(b.seed, s / 31) + (g.rough > 0 ? 0.35 * A * _wclN1(b.seed + 'f', s / 7.5) + 0.7 * g.rough * _wclN1(T.seed + 'u', s / 64) + T.com(s) : 0);
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
    for (const p of _wclFace(g, cam, o, world.reliefBase ? { relief: world.reliefBase } : null)) out.push(p);
  }
  return out;
}
/**
 * The lip of a face seen from BEHIND (the camera on the plateau, the face turned away): what the eye sees there is the edge itself, a broken line
 * of rounded cap blocks on the rim with the drop beyond (Stanage from the top), never a plateau that simply stops. Blocks 0.8 to 3.5 m long with
 * gaps, each a low loaf with a lit top, a darker outer flank and a dark line where the rock falls away; heather lapping at their foot. Only a blocky
 * rock (gritstone), only nearer than 160 m, only where the eye is above the rim. -> terrain prims (one per depth bin).
 */
function _wclLipSeed(g) { return String(_wclHash((g.id || 'c') + '|lip')); }
function _wclLipBack(g, cam) {
  const lk = _WCL_LOOK[g.rock] || null, out = [];
  if (!lk || !lk.blocky || !(cam.eye > g.H * 0.9)) return out;
  const f = cam.f, x0 = _wclNum(cam.x0) ? cam.x0 : 800, hz = cam.horizon, eye = cam.eye, near = Math.max(0.5, (cam.dMin || 1) * 0.6), lnB = Math.log(1.03);
  const r = _wclRng(_wclHash((g.id || 'c') + '|lipback'));
  const Pt = (x, z, y) => [_wclR1(x0 + f * x / z), _wclR1(hz + f * (eye - y) / z)];
  const bins = new Map();
  for (let s = r() * 2; s < g.L; ) {
    const L = (0.8 + Math.pow(r(), 1.4) * 2.7) * (_wclAt(g, s).z < 12 ? 0.75 : 1), gap = 0.15 + r() * (r() < 0.2 ? 1.6 : 0.5), s1 = Math.min(g.L, s + L), sm = (s + s1) / 2, a = _wclAt(g, sm);
    const nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx, m = _wclTaper(g, sm);
    const back = -(a.x * nx + a.z * nz) <= 0.02 * Math.hypot(a.x, a.z);
    if (back && m > 0.5 && a.z > Math.max(near, 22) && a.z < 160 && eye > g.H * m + 0.3) {
      const X = x0 + f * a.x / a.z;
      if (X > -200 && X < 1800) {
        const H = g.H * m, hb = 0.25 + r() * 0.5, inset = 0.3 + r() * 0.7, tone = r();
        const A = _wclAt(g, s), B = _wclAt(g, s1);
        // the block: its outer foot on the lip line, its body set back onto the plateau by `inset`, a rounded top
        const ox = (q, t) => [q.x - nx * t, q.z - nz * t];
        const p0 = ox(A, -0.2), p1 = ox(B, -0.2), q0 = ox(A, inset), q1 = ox(B, inset);
        const P = (q, y) => Pt(q[0], Math.max(0.3, q[1]), y);
        const midO = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], midI = [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2];
        // (corners rounded: a weathered block of grit is a loaf, never a box)
        const rnd = (pts, k) => { const o = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], a1 = pts[(i + pts.length - 1) % pts.length], b1 = pts[(i + 1) % pts.length]; o.push([_wclR1(p[0] + (a1[0] - p[0]) * k), _wclR1(p[1] + (a1[1] - p[1]) * k)], [_wclR1(p[0] * 0.5 + (a1[0] + b1[0]) * 0.25), _wclR1(p[1] * 0.5 + (a1[1] + b1[1]) * 0.25)], [_wclR1(p[0] + (b1[0] - p[0]) * k), _wclR1(p[1] + (b1[1] - p[1]) * k)]); } return o; };
        const body = rnd([P(p0, H - 0.25), P(p0, H + hb * 0.55), P(q0, H + hb * 0.85), P(midI, H + hb), P(q1, H + hb * 0.8), P(p1, H + hb * 0.5), P(p1, H - 0.25), P(midO, H - 0.35)], 0.2);
        const top = rnd([P(p0, H + hb * 0.55), P(q0, H + hb * 0.85), P(midI, H + hb), P(q1, H + hb * 0.8), P(p1, H + hb * 0.5), P(midO, H + hb * 0.62)], 0.22);
        const zb = a.z, bin = Math.floor(Math.log(zb) / lnB);
        let B0 = bins.get(bin); if (!B0) { B0 = { ops: [], z: zb, foot: [], box: [Infinity, Infinity, -Infinity, -Infinity] }; bins.set(bin, B0); }
        const nrm = [_wclR1(nx * 100) / 100, _wclR1(nz * 100) / 100];
        B0.ops.push({ t: 'f', p: body, m: 'stone', h: _wclShade(lk.base, 0.8 + 0.3 * tone), a: 1, n: nrm });
        B0.ops.push({ t: 'f', p: top, m: 'stone', h: _wclShade(lk.light, 0.86 + 0.18 * tone), a: 0.85, up: true });
        B0.ops.push({ t: 's', p: [P(p0, H - 0.3), P(midO, H - 0.4), P(p1, H - 0.3)], m: 'stone', h: lk.dark, w: Math.max(1, f / zb * 0.12), a: 0.7 });
        if (r() < 0.35) B0.ops.push({ t: 'f', p: [P(q0, H + hb * 0.5), P(midI, H + hb * 0.62), P(q1, H + hb * 0.5), P(midI, H + hb * 0.38)], m: 'stone', h: r() < 0.5 ? lk.lichen : lk.dark, a: 0.35 });
        // a block big on screen shows its bedding and a crack, and lichen in rosettes
        if (f / zb * L > 40) {
          const bed = (u) => [P(p0, H + hb * u), P(midO, H + hb * u * 1.05 + 0.02), P(p1, H + hb * u)];
          B0.ops.push({ t: 's', p: bed(0.3 + 0.1 * r()), m: 'stone', h: lk.dark, w: Math.max(0.8, f / zb * 0.03), a: 0.4 });
          const cu = 0.25 + 0.5 * r(), cq = [p0[0] + (p1[0] - p0[0]) * cu, p0[1] + (p1[1] - p0[1]) * cu];
          B0.ops.push({ t: 's', p: [P(cq, H - 0.3), P(cq, H + hb * 0.45)], m: 'stone', h: lk.dark, w: Math.max(0.8, f / zb * 0.035), a: 0.5 });
          for (let i = 0; i < 3; i++) { const lu = r(), lq = [p0[0] + (p1[0] - p0[0]) * lu, p0[1] + (p1[1] - p0[1]) * lu], c = P(lq, H + hb * (0.15 + 0.3 * r())), rr = Math.max(1.2, f / zb * (0.06 + 0.1 * r())); B0.ops.push({ t: 'f', p: [[c[0] - rr, c[1]], [c[0], c[1] - rr * 0.7], [c[0] + rr, c[1]], [c[0], c[1] + rr * 0.7]], m: 'stone', h: i === 0 && lk.lichen2 ? lk.lichen2 : lk.lichen, a: 0.6 }); }
        }
        for (const q of body) { B0.box[0] = Math.min(B0.box[0], q[0]); B0.box[1] = Math.min(B0.box[1], q[1]); B0.box[2] = Math.max(B0.box[2], q[0]); B0.box[3] = Math.max(B0.box[3], q[1]); }
        B0.foot.push(q0, q1); B0.z = Math.min(B0.z, zb);
      }
    }
    s = s1 + gap;
  }
  // the line of the lip itself, nearer than 90 m: a pale worn edge and, under it, the dark of the rock falling away (in runs that follow the plan)
  for (let s = 0; s < g.L; ) {
    const a = _wclAt(g, s), nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx, m = _wclTaper(g, s);
    const back = -(a.x * nx + a.z * nz) <= 0.02 * Math.hypot(a.x, a.z);
    if (!(back && m > 0.5 && a.z > Math.max(near, 3) && a.z < 90 && eye > g.H * m + 0.3)) { s += 1; continue; }
    const run = [], lo = [];
    let e = s;
    for (; e < g.L && run.length < 40; e += Math.max(0.4, a.z / 40)) {
      const b = _wclAt(g, e), bnx = g.hi > 0 ? -b.tz : b.tz, bnz = g.hi > 0 ? b.tx : -b.tx, bm = _wclTaper(g, e);
      if (!(-(b.x * bnx + b.z * bnz) <= 0.02 * Math.hypot(b.x, b.z)) || b.z < 3 || b.z > 90 || bm < 0.5 || b.z > a.z * 1.03 || b.z < a.z / 1.03) break;
      const H = g.H * bm, w = 0.35 + 0.5 * (0.5 + 0.5 * _wclN1(_wclLipSeed(g) + 'lp', e / 3));
      run.push([b.x - bnx * 0.1, Math.max(0.3, b.z - bnz * 0.1), H + 0.05]); lo.push([b.x + bnx * w, Math.max(0.3, b.z + bnz * w), H - 0.5 - 0.9 * w]);
    }
    if (run.length > 1) {
      const top = run.map(q => Pt(q[0], q[1], q[2])), bot = lo.map(q => Pt(q[0], q[1], q[2])), zb = Math.min(...run.map(q => q[1])), bin = Math.floor(Math.log(Math.max(0.5, zb)) / lnB);
      let B0 = bins.get(bin); if (!B0) { B0 = { ops: [], z: zb, foot: [], box: [Infinity, Infinity, -Infinity, -Infinity] }; bins.set(bin, B0); }
      B0.ops.unshift({ t: 'f', p: top.concat(bot.slice().reverse()), m: 'stone', h: _wclShade(lk.dark, 1.2), a: 0.92 }, { t: 's', p: top, m: 'stone', h: lk.light, w: Math.max(1.2, f / zb * 0.12), a: 0.75, up: true });
      for (const q of top.concat(bot)) { B0.box[0] = Math.min(B0.box[0], q[0]); B0.box[1] = Math.min(B0.box[1], q[1]); B0.box[2] = Math.max(B0.box[2], q[0]); B0.box[3] = Math.max(B0.box[3], q[1]); }
      for (const q of run) B0.foot.push([q[0], q[1]]);
      B0.z = Math.min(B0.z, zb);
    }
    s = Math.max(e, s + 1);
  }
  for (const [bin, B0] of bins) {
    if (!B0.ops.length) continue;
    const xs = B0.foot.map(q => q[0]), zs = B0.foot.map(q => q[1]), xa = Math.min(...xs), xb = Math.max(...xs), za = Math.min(...zs), zb = Math.max(...zs);
    out.push({ id: 'cliff-' + (g.id || 'c') + '-lip-' + bin, kind: 'line', sub: 'terrain', lineKind: 'cliff', box: [B0.box[0] - 2, B0.box[1] - 2, B0.box[2] + 2, B0.box[3] + 2], zKey: za, foot: [[xa, za], [xb, za], [xb, zb + 0.3], [xa, zb + 0.3]], height: 1, solidity: 'passable', faces: [], ops: B0.ops, mat: 'stone', heading: cam.heading || 0 });
  }
  return out;
}
function _wclFace(g, cam, o, baseGrid) {
  // the lowest the ground goes under the face (a spur that stands out over a slope): the beds start there, and a face is drawn from the ground it stands on
  if (g.baseMin === undefined) { g.baseMin = 0; if (baseGrid && typeof sceneGroundHeight === 'function') for (let i = 0; i < g.pts.length; i += 2) g.baseMin = Math.min(g.baseMin, sceneGroundHeight(baseGrid, g.pts[i][0], g.pts[i][1])); }
  const T = _wclTex(g), lk = T.lk, f = cam.f, x0 = _wclNum(cam.x0) ? cam.x0 : 800, hz = cam.horizon, eye = cam.eye, cols = _wclColumns(g, cam), prims = [];
  if (!cols.length) return prims;
  const lnB = Math.log(1.03);
  // the point of the face at arc length s and height y (the batter leans the face back into the rock as it rises)
  const P = (s, y) => {
    const a = _wclAt(g, s), nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx, m = _wclTaper(g, s), off = g.b > 0 ? g.b * Math.max(0, y - g.hs * m) : 0, x = a.x - nx * off, z = a.z - nz * off;
    return { X: x0 + f * x / Math.max(0.3, z), Y: hz + f * (eye - y) / Math.max(0.3, z), k: f / Math.max(0.3, z), z, x, m, nx, nz };
  };
  // the face stands on the ground at its own plan: its foot is the talus top, or the relief that is not the cliff (a hill the face
  // rises out of) where that is higher: a hill is never painted over a face, so it never meets it at a depth-binned staircase
  const bounds = (m, s) => {
    const hi = Math.max(0, g.H * m - Math.min(g.lipH * m, g.H * m * 0.2));
    let lo = g.hs * m * _wclTab(g.fanH, s);
    if (baseGrid && typeof sceneGroundHeight === 'function') { const a = _wclAt(g, s), b = sceneGroundHeight(baseGrid, a.x, a.z); if (g.slopeTalus) lo = Math.min(hi, lo + b); else if (b < 0) lo += b; else if (b > lo) lo = Math.min(b, hi); }   // (below the level the face is measured from: the ground it stands on)
    return [lo, hi];
  };
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
        const y = _wclBound(g, T, k, s) + (yOff || 0), m = P(s, 0).m, [lo, hi] = bounds(m, s);
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
        const [lo, hi] = bounds(c.m, c.s), yb = Math.max(lo, Math.min(hi, _wclBound(g, T, k, c.s))), yt = Math.max(lo, Math.min(hi, k + 1 < T.beds.length ? _wclBound(g, T, k + 1, c.s) : g.H + 5));
        if (yt - yb > 0.02) any = true; else thin = true;
        const pb = P(c.s, yb), pt = P(c.s, yt);
        top.push([pt.X, pt.Y]); bot.push([pb.X, pb.Y + (yt - yb > 0.02 ? 0.7 : 0)]);
        if (i % 2 === 0 || i === Cb.length - 1) {
          const hmid = (bed.h0 + bed.th / 2) / Math.max(1, g.H), tone = 1 + lk.tone * (0.6 * bed.tone + 1.2 * (bed.prom - 0.4)) + 0.03 * _wclN1(bed.seed + 't', c.s / 11) + 0.045 * _wclN1(T.seed + 'v', c.s / 13) + 0.05 * _wclN1(T.seed + 'v2', c.s / 38) + 0.07 * (hmid - 0.5) - (g.scoop ? 0.17 * _wclBump(c.s, g.scoop.s, g.scoop.w * 0.9) : 0);
          // the foot is damp and dark, the top dry and pale
          const amb = 0.86 + 0.18 * Math.pow(Math.max(0, Math.min(1, hmid)), 0.6);
          let hex = _wclShade(lk.base, Math.round(tone * amb * 80) / 80);
          // the beds differ in hue as well as tone: a cream bed, a cooler grey one
          if (Math.abs(bed.warm) > 0.2) hex = _wclMix(hex, bed.warm > 0 ? lk.warm : lk.cool, Math.abs(bed.warm) * 0.28);
          if (hmid < 0.08) hex = _wclMix(hex, lk.moss, 0.2 * (1 - hmid / 0.08));
          if (bed.lich) { const ln = _wclN1(bed.seed + 'l', c.s / 22); if (ln > 0.35) hex = _wclMix(hex, lk.lichen, 0.28 * Math.min(1, (ln - 0.35) * 3)); }
          // the face is never one plane: pillars and recesses turn its normal a little (lit on one side, shaded on the other)
          const wob = 0.42 * _wclN1(T.seed + 'w', c.s / 11) + 0.2 * _wclN1(T.seed + 'w2', c.s / 4.1), cw = Math.cos(wob), sw = Math.sin(wob);
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
    // ---- 2b. panels of paler or darker rock (blocks between the beds), and the broad stain of the scoop
    const spanPts = (s0, s1, yOf) => {
      const ss = [Math.max(s0, sa)];
      for (const c of C) if (c.s > ss[0] + 0.01 && c.s < Math.min(s1, sb) - 0.01) ss.push(c.s);
      ss.push(Math.min(s1, sb));
      return ss.map(sv => { const [lo, hi] = bounds(P(sv, 0).m, sv); return yOf(sv, lo, hi); });
    };
    for (const pn of T.panels) {
      if (pn.s1 <= sa || pn.s0 >= sb) continue;
      // (a blocky rock's panel is a weathered block: its edges wander a little, never a ruled rectangle)
      const jt = lk.blocky ? (sv, k) => (0.5 + 0.5 * _wclN1(T.seed + 'pj' + k, sv / 1.7)) * 0.22 * T.beds[pn.k1].th : () => 0;
      const top = spanPts(pn.s0, pn.s1, (sv, lo, hi) => { const q = P(sv, Math.max(lo, Math.min(hi, _wclBound(g, T, pn.k1, sv) + T.beds[pn.k1].th - jt(sv, 1)))); return [q.X, q.Y]; });
      const bot = spanPts(pn.s0, pn.s1, (sv, lo, hi) => { const q = P(sv, Math.max(lo, Math.min(hi, _wclBound(g, T, pn.k0, sv) + jt(sv, 2)))); return [q.X, q.Y]; });
      if (top.length < 2) continue;
      const pc = pn.col === 'lichen' ? lk.lichen : pn.col === 'stain' ? lk.stain : pn.dark ? lk.dark : lk.light;
      fill(top.concat(bot.slice().reverse()), 'stone', pc, pn.a);
      if (pn.bevel) {
        const th = T.beds[pn.k1].th, edge = (fr, sgn) => spanPts(pn.s0 + pn.i0, pn.s1 - pn.i1, (sv, lo, hi) => { const y0 = sgn > 0 ? _wclBound(g, T, pn.k1, sv) + th : _wclBound(g, T, pn.k0, sv), q = P(sv, Math.max(lo, Math.min(hi, y0 - sgn * fr * th))); return [q.X, q.Y]; });
        const tOut = edge(0, 1), tIn = edge(0.16 + 0.1 * pn.bv, 1), bOut = edge(0, -1), bIn = edge(0.1 + 0.08 * pn.bv, -1);
        if (tOut.length > 1) fill(tOut.concat(tIn.slice().reverse()), 'stone', lk.light, 0.3 + 0.25 * pn.bv, { up: true });
        if (bOut.length > 1) fill(bIn.concat(bOut.slice().reverse()), 'stone', lk.dark, 0.32 + 0.28 * pn.bv);
      }
    }
    if (g.scoop && g.scoop.s + g.scoop.w * 1.3 > sa && g.scoop.s - g.scoop.w * 1.3 < sb) {
      // three nested ragged shapes (wide at the notch, narrowing toward the foot), each a vertical ramp of the stain colour; each group draws
      // only its own stretch of them (clipped in arc length, so the layers never stack across the groups)
      const sc = g.scoop, rows = 11;
      for (let layer = 0; layer < 3; layer++) {
        const wl = sc.w * [1.15, 0.8, 0.5][layer], L2 = [], R2 = [];
        for (let i = 0; i < rows; i++) {
          const u = i / (rows - 1), wv = wl * (1 - 0.4 * u + 0.12 * u * u) * (0.88 + 0.12 * _wclN1(T.seed + 'sc' + layer, u * 4 + layer * 3.1));
          const cen = sc.s + 0.12 * sc.w * _wclN1(T.seed + 'scc' + layer, u * 2.2 + 1.7);
          const a0 = Math.max(sa, cen - wv), a1 = Math.min(sb, cen + wv);
          if (a1 - a0 < 0.05) continue;
          const [lo, hi] = bounds(P(Math.max(sa, Math.min(sb, cen)), 0).m, cen), y = hi - 0.4 - (hi - lo - 0.4) * u;
          const pl = P(a0, y), pr = P(a1, y);
          L2.push([pl.X, pl.Y]); R2.push([pr.X, pr.Y]);
        }
        if (L2.length < 2) continue;
        const poly = L2.concat(R2.reverse()), ym = poly.map(q => q[1]), pp = rnd1(poly); note(pp);
        add({ t: 'fv', p: pp, y0: _wclR1(Math.min(...ym)), y1: _wclR1(Math.max(...ym)), st: [[0, lk.stain, 0.2], [0.5, lk.stain, 0.15], [1, lk.stain, 0.22]], m: 'stone', n: nrm, wetK: 1.2 });
      }
    }
    // ---- 3. weathering streaks (the long dark water stains first), then lichen
    for (const st of T.streaks) {
      if (st.s < sa || st.s >= sb) continue;
      const kk = Math.min(T.beds.length - 1, st.k), p0 = P(st.s, 0), [lo, hi] = bounds(p0.m, st.s), yTop = st.major ? hi - 0.4 - 2.5 * Math.abs(_wclN1(T.seed + 'st' + Math.round(st.s), 2.1)) : Math.min(hi - 0.5, _wclBound(g, T, kk, st.s)), yBot = Math.max(lo, yTop - st.len);
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
        add({ t: 'fv', p: pp, y0: _wclR1(Math.min(...L2.map(q => q.Y), ...R2.map(q => q.Y))), y1: _wclR1(Math.max(...L2.map(q => q.Y), ...R2.map(q => q.Y))), st: [[0, col, st.a * 0.3], [0.1, col, st.a * 1.2], [0.5, col, st.a * 0.85], [1, col, 0]], m: 'stone', n: nrm, wetK: 1.4 });
      } else fill(poly, 'stone', col, st.a * (st.pale ? 0.7 : 1));
    }
    for (const l of T.lichen) {
      if (l.s < sa || l.s >= sb) continue;
      const m = P(l.s, 0).m, [lo, hi] = bounds(m, l.s);
      if (l.h < lo + 1 || l.h > hi - 1) continue;
      const a = P(l.s - l.w / 2, l.h), b = P(l.s + l.w / 2, l.h + l.hh), rr = _wclRng(l.seed), pts = [];
      const cxp = (a.X + b.X) / 2, cyp = (a.Y + b.Y) / 2, rx = Math.max(1.2, Math.abs(b.X - a.X) / 2), ry = Math.max(0.9, Math.abs(a.Y - b.Y) / 2);
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2, rj = 0.7 + rr() * 0.5; pts.push([cxp + Math.cos(an) * rx * rj, cyp + Math.sin(an) * ry * rj]); }
      fill(pts, 'stone', l.g ? lk.lichen : lk.lichen2 && (l.seed % 5) === 0 ? lk.lichen2 : lk.moss, l.k * (lk.lichen2 ? 2.2 : 1.3));
    }
    // ---- 3b. the fine marks: bedding hairlines in runs, dashes and short cracks
    for (const hr of T.hair) {
      if (hr.s1 <= sa || hr.s0 >= sb) continue;
      const run = runPts(hr.k, hr.s0, hr.s1, 0);
      if (run.length > 1) stroke(run.map(q => [q[0], q[1]]), 'stone', lk.dark, 0.8, hr.a);
    }
    for (const d of T.dashes) {
      if (d.s < sa || d.s >= sb) continue;
      const y = _wclBound(g, T, d.k, d.s) + d.dh, m = P(d.s, 0).m, [lo, hi] = bounds(m, d.s);
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
      if (ld.roof) {
        // an overhang: the bed above juts out, so the rock under it is a dark recess, deepest at the middle of the run and closing at its ends
        const n = run.length, lowr = run.map((q, i) => { const u = i / Math.max(1, n - 1), end = Math.min(1, Math.min(u, 1 - u) / 0.12); return [q[0], q[1] + q[2] * (1.2 + 3.2 * ld.prom) * (0.55 + 0.45 * _wclN1(T.seed + 'rf' + Math.round(ld.s0), q[3] / 6)) * (0.2 + 0.8 * end)]; });
        const pr = rnd1(run.map(q => [q[0], q[1]]).concat(lowr.slice().reverse())); note(pr);
        add({ t: 'fv', p: pr, y0: _wclR1(Math.min(...run.map(q => q[1]))), y1: _wclR1(Math.max(...lowr.map(q => q[1]))), st: [[0, lk.dark, 0.36], [0.55, lk.dark, 0.24], [1, lk.dark, 0.05]], m: 'stone', n: nrm });
      }
      if (ld.prom > 0.42) {
        // (broken where the lip is worn away, heavier where it stands further out)
        let seg = [];
        const flush = () => { if (seg.length > 1) stroke(seg, 'stone', lk.dark, Math.max(1, kk * (0.1 + 0.36 * ld.prom * (0.6 + 0.4 * _wclN1(T.seed + 'lw' + ld.k, seg[0][2] / 12))) * lk.ledge), 0.42 + 0.4 * ld.prom); seg = []; };
        for (const q of run) { if (_wclN1(T.seed + 'lg' + ld.k + Math.round(ld.s0), q[3] / 8) < -0.45) flush(); else seg.push([q[0], q[1] + 0.3, q[3]]); }
        flush();
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
        const s = j.s + (j.jog[k - j.k0] || 0), c0 = P(s, 0), [lo, hi] = bounds(c0.m, s), y = Math.max(lo, Math.min(hi, _wclBound(g, T, k, s)));
        if (y <= lo + 0.2 && k > j.k0) continue;
        const p = P(s, y); pts.push([p.X, p.Y, p.k]);
      }
      if (j.major) { const c0 = P(j.s, 0), [lo, hi] = bounds(c0.m, j.s); const pt = P(j.s, hi), pb = P(j.s, lo); pts.unshift([pt.X, pt.Y, pt.k]); pts.push([pb.X, pb.Y, pb.k]); pts.sort((a, b) => a[1] - b[1]); }
      if (pts.length < 2) continue;
      const kk = pts.reduce((a, q) => a + q[2], 0) / pts.length, wpx = Math.max(0.9, kk * j.w * lk.joints * 0.9);
      if (j.major) stroke(pts.map(q => [q[0] + wpx, q[1]]), 'stone', lk.dark, Math.max(3, wpx * 4), 0.1);
      stroke(pts.map(q => [q[0], q[1]]), 'stone', lk.dark, wpx, Math.min(0.8, 0.2 + 0.45 * j.k));
      stroke(pts.map(q => [q[0] + wpx * 0.9, q[1]]), 'stone', lk.light, Math.max(0.7, wpx * 0.6), 0.14 + 0.12 * j.k, { up: true });
    }
    // ---- 6. vegetation on the ledges: tufts (clustered), then the odd small tree
    for (const tf of T.tufts) {
      if (tf.s < sa || tf.s >= sb) continue;
      const y = _wclBound(g, T, tf.k, tf.s), m = P(tf.s, 0).m, [lo, hi] = bounds(m, tf.s);
      if (y < lo + 0.4 || y > hi - 0.3) continue;
      const a = P(tf.s - tf.w / 2, y), b = P(tf.s + tf.w / 2, y), c = P(tf.s, y + tf.h * 0.8), rr = _wclRng(tf.seed), n = 7, pts = [];
      const cxp = (a.X + b.X) / 2, w2 = Math.max(1.3, Math.abs(b.X - a.X) / 2), hh = Math.max(1.3, Math.abs(a.Y - c.Y) * 1.1), cy0 = a.Y - hh * 0.25;
      for (let i = 0; i < n; i++) { const an = Math.PI + i / (n - 1) * Math.PI, rj = 0.75 + rr() * 0.4; pts.push([cxp + Math.cos(an) * w2 * rj, cy0 + Math.sin(an) * hh * rj * 0.85]); }
      pts.push([cxp + w2 * 0.9, cy0 + hh * 0.2], [cxp - w2 * 0.9, cy0 + hh * 0.2]);
      fill(pts, 'grass', lk.heather ? _wclMix(_wclShade('#4d5233', 0.85 + 0.3 * tf.tone), '#7a5a78', tf.tone > 0.62 ? 0.5 : 0.08) : _wclShade('#587340', 0.8 + 0.3 * tf.tone), 0.92);
    }
    for (const tr of T.trees) {
      if (tr.s < sa || tr.s >= sb) continue;
      const y = _wclBound(g, T, tr.k, tr.s), m = P(tr.s, 0).m, [lo, hi] = bounds(m, tr.s);
      if (y < lo + 1 || y > hi - 2) continue;
      const p = P(tr.s, y);
      add({ t: 'tree', x: _wclR1(p.X), y: _wclR1(p.Y + 0.4), h: _wclR1(tr.h * p.k), w: _wclR1(tr.w * p.k), seed: tr.seed, kind: tr.kind, n: nrm });
      note([[p.X - tr.w * p.k, p.Y - tr.h * p.k * 1.1], [p.X + tr.w * p.k, p.Y + 2]]);
    }
    // ---- 7. the rim: the turf cap along the top, tussocks and thorns against the sky
    const capTop = [], capBot = [];
    for (const c of C) {
      const [, hi] = bounds(c.m, c.s), lipH = Math.min(g.lipH * c.m, g.H * c.m * 0.2), bump = 0.35 * lipH * (0.5 + 0.5 * _wclN1(T.seed + 'r', c.s / 4)), lift = rimLift(c.s);
      const pb = P(c.s, hi * lift - 0.35), pt = P(c.s, hi * lift + lipH + bump);
      capBot.push([pb.X, pb.Y]); capTop.push([pt.X, pt.Y]);
    }
    const pave = g.rough > 0 && g.H >= 12 && g.rock !== 'chalk' && lk.pave !== false;
    if (g.H > 3 && pave) {
      // limestone pavement: a dark band (the grikes and the shade behind), the clints on it as pale blocks, each at its own height, and
      // the turf in patches over the lip (the sky is seen between the blocks where a grike cuts through)
      fill(capTop.concat(capBot.slice().reverse()), 'stone', _wclShade(lk.base, 0.5), 1, { up: true });
      const lipAt = (sv) => { const m = P(sv, 0).m, [, hi] = bounds(m, sv); return { hi: hi * rimLift(sv), lip: Math.min(g.lipH * m, g.H * m * 0.2) }; };
      for (const bl of T.blocks) {
        if (bl.s1 <= sa || bl.s0 >= sb) continue;
        const s0 = Math.max(bl.s0, sa), s1 = Math.min(bl.s1, sb), A = lipAt(s0), B = lipAt(s1);
        const yb0 = A.hi - 0.3, yb1 = B.hi - 0.3, yt0 = A.hi + A.lip * (0.55 + 0.5 * bl.step) + bl.dh * 0.5, yt1 = B.hi + B.lip * (0.55 + 0.5 * bl.step) + bl.dh * 0.5 + bl.sl;
        const q = [P(s0, yb0), P(s0, yt0), P(s1, yt1), P(s1, yb1)].map(p => [p.X, p.Y]);
        fill(q, 'stone', _wclShade(lk.base, 0.86 + 0.26 * bl.tone), 1, { up: true });
        // the front face of the clint a little darker under its lit top
        const mid = [P(s0, (yb0 + yt0) / 2), P(s1, (yb1 + yt1) / 2)].map(p => [p.X, p.Y]);
        fill([mid[0], q[0], q[3], mid[1]], 'stone', lk.dark, 0.22);
      }
      for (const [t0, t1] of T.turf) {
        if (t1 <= sa || t0 >= sb) continue;
        const s0 = Math.max(t0, sa), s1 = Math.min(t1, sb), ss = [s0];
        for (const c of C) if (c.s > s0 + 0.01 && c.s < s1 - 0.01) ss.push(c.s);
        ss.push(s1);
        const top = [], bot = [];
        for (const sv of ss) { const A = lipAt(sv), p = P(sv, A.hi + A.lip * (0.7 + 0.3 * _wclN1(T.seed + 'tf', sv / 3)) + 0.35), q = P(sv, A.hi + A.lip * 0.25); top.push([p.X, p.Y]); bot.push([q.X, q.Y]); }
        fill(top.concat(bot.reverse()), 'grass', '#7d9358', 0.96, { up: true });
      }
    } else if (g.H > 3 && lk.blocky) {
      fill(capTop.concat(capBot.slice().reverse()), 'stone', _wclShade(lk.base, 1.08), 1, { up: true });
      for (const [t0, t1] of T.turf) {
        if (t1 <= sa || t0 >= sb) continue;
        const s0 = Math.max(t0, sa), s1 = Math.min(t1, sb), ss = [s0];
        for (const c of C) if (c.s > s0 + 0.01 && c.s < s1 - 0.01) ss.push(c.s);
        ss.push(s1);
        const top = [], bot = [];
        for (const sv of ss) { const m = P(sv, 0).m, [, hi] = bounds(m, sv), lip = Math.min(g.lipH * m, g.H * m * 0.2), p = P(sv, hi * rimLift(sv) + lip * (1.1 + 0.5 * _wclN1(T.seed + 'tf', sv / 2.2))), q = P(sv, hi * rimLift(sv) + lip * 0.3); top.push([p.X, p.Y]); bot.push([q.X, q.Y]); }
        fill(top.concat(bot.reverse()), 'grass', '#5c4a45', 0.95, { up: true });
      }
    } else if (g.H > 3) {
      fill(capTop.concat(capBot.slice().reverse()), 'grass', lk.heather ? '#6c5f44' : '#7d9358', 1, { up: true });
      fill(capTop.map((q, i) => [q[0], q[1] + (capBot[i][1] - q[1]) * 0.45]).concat(capBot.slice().reverse().map(q => [q[0], q[1] + 0.6])), 'grass', lk.heather ? '#4f4a34' : '#5d7541', 0.5);
      stroke(capBot.map(q => [q[0], q[1] + 0.2]), 'stone', lk.light, Math.max(1.2, cm.m * f / cm.z * 0.45), 0.55, { up: true });
      stroke(capBot.map(q => [q[0], q[1] + 0.8]), 'stone', lk.dark, Math.max(1.2, cm.m * f / cm.z * 0.5), 0.5);
    }
    if (g.H > 3 && T.tors.length) {
      // tors: chunky blocks on the lip (a lit top, a shaded flank, a chamfer), sitting ON the rim cap and not above it
      for (const tr of T.tors) {
        if (tr.s < sa || tr.s >= sb) continue;
        const m = P(tr.s, 0).m, [, hi] = bounds(m, tr.s), lipH = Math.min(g.lipH * m, g.H * m * 0.2), y0 = hi * rimLift(tr.s) + lipH * 0.4, rr = _wclRng(tr.seed);
        const A = P(tr.s - tr.w / 2, y0), B = P(tr.s + tr.w / 2, y0), C = P(tr.s + tr.w / 2 - tr.w * tr.ch * 0.5, y0 + tr.h), D = P(tr.s - tr.w / 2 + tr.w * tr.ch, y0 + tr.h * (0.92 + 0.1 * rr())), E = P(tr.s - tr.w / 2, y0 + tr.h * 0.7);
        const rnd = (pts, k) => { const o = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]; o.push([p[0] + (a[0] - p[0]) * k, p[1] + (a[1] - p[1]) * k], [p[0] * 0.5 + (p[0] + (a[0] + b[0]) / 2) * 0.25, p[1] * 0.5 + (p[1] + (a[1] + b[1]) / 2) * 0.25], [p[0] + (b[0] - p[0]) * k, p[1] + (b[1] - p[1]) * k]); } return o; };
        const body = lk.blocky ? rnd([[A.X, A.Y + 1.5], [E.X, E.Y], [D.X, D.Y], [C.X, C.Y], [B.X, B.Y + 1.5]], 0.22) : [[A.X, A.Y + 1.5], [E.X, E.Y], [D.X, D.Y], [C.X, C.Y], [B.X, B.Y + 1.5]];
        fill(body, 'stone', _wclShade(lk.base, 0.78 + 0.3 * tr.tone), 1, { up: true });
        fill([E, D, C, [C.X, C.Y + (B.Y - C.Y) * 0.18], [E.X, E.Y + (A.Y - E.Y) * 0.18]].map(q => Array.isArray(q) ? q : [q.X, q.Y]), 'stone', _wclShade(lk.light, 0.85 + 0.2 * tr.tone), 0.8, { up: true });
        fill([[C.X - (C.X - B.X) * 0.55, C.Y + (B.Y - C.Y) * 0.1], [C.X, C.Y], [B.X, B.Y + 1.5], [B.X - (B.X - A.X) * 0.4, B.Y + 1.5]], 'stone', lk.dark, 0.3);
        stroke([[E.X, E.Y + (A.Y - E.Y) * 0.4], [B.X, E.Y + (B.Y - E.Y) * 0.45]], 'stone', lk.dark, 0.9, 0.4);
      }
    }
    if (g.H > 3) {
      for (const rm of T.rim) {
        if (pave && rm.a > 0.45) continue;
        if (rm.s < sa || rm.s >= sb) continue;
        const m = P(rm.s, 0).m, [, hi] = bounds(m), lipH = Math.min(g.lipH * m, g.H * m * 0.2), p = P(rm.s, hi * rimLift(rm.s) + lipH), p2 = P(rm.s + rm.w, hi * rimLift(rm.s) + lipH + rm.h);
        const rr = _wclRng(rm.seed), n = 6, pts = [], cxp = (p.X + p2.X) / 2, w2 = Math.max(1.5, Math.abs(p2.X - p.X) / 2), hh = Math.max(1.5, Math.abs(p.Y - p2.Y));
        for (let i = 0; i < n; i++) { const an = Math.PI + i / (n - 1) * Math.PI; pts.push([cxp + Math.cos(an) * w2 * (0.8 + rr() * 0.3), p.Y + 1 + Math.sin(an) * hh * (0.7 + rr() * 0.4)]); }
        fill(pts, 'grass', lk.heather ? (rm.a < 0.5 ? '#6e5d4a' : '#5f5238') : rm.a < 0.5 ? '#778f50' : '#69804a', 1, { up: true });
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
  return { t: (n.side * g.hi > 0 ? 1 : -1) * n.d, m: _wclTaper(g, n.s), s: n.s, fh: _wclTab(g.fanH, n.s), fw: _wclTab(g.fanW, n.s) };
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
    const T = _wclTex(g), lk = T.lk, r = _wclRng(_wclHash(T.seed + 'stones')), bg = g.slopeTalus && world.reliefBase && typeof sceneGroundHeight === 'function' ? { relief: world.reliefBase } : null;
    for (let s = 0; s < g.L && out.length < 2400; s += 1.1 + r() * 1.5) {
      const m = _wclTaper(g, s), a = _wclAt(g, s), nx = g.hi > 0 ? -a.tz : a.tz, nz = g.hi > 0 ? a.tx : -a.tx;
      if (m < 0.2 || (-(a.x * nx + a.z * nz) <= 0 && !(g.slopeTalus && eye > g.H * m + 1))) continue;   // (a talus under a face turned away is seen from above: a lens on the rim looks down on it)
      const fh = _wclTab(g.fanH, s), fw = _wclTab(g.fanW, s), n = Math.max(1, Math.round((2 + Math.floor(r() * 3)) * (0.6 + 0.7 * fh)));
      for (let i = 0; i < n; i++) {
        const u = Math.pow(r(), 1.2), t = -g.w * fw * u * 0.97, tuft = u > 0.45 && r() < 0.5 + 0.4 * u;
        const x = a.x + nx * -t + a.tx * (r() - 0.5) * 2, z = a.z + nz * -t + a.tz * (r() - 0.5) * 2, y = _wclProfile(g, t, m, fh, fw) + (bg ? sceneGroundHeight(bg, x, z) : 0);
        if (z <= near) continue;
        const X = x0 + f * x / z;
        if (X < -150 || X > 1750) continue;
        const Y = hz + f * (eye - y) / z, k = f / z, ops = [], nrm = [_wclR1(nx * 100) / 100, _wclR1(nz * 100) / 100];
        const rr = _wclRng(Math.floor(r() * 1e9));
        if (tuft) {
          const w = (0.9 + r() * 2.2) * k, h = (0.4 + r() * 0.7) * k, pts = [];
          for (let q = 0; q < 8; q++) { const an = Math.PI + q / 7 * Math.PI, rj = 0.75 + rr() * 0.35; pts.push([X + Math.cos(an) * w * 0.5 * rj, Y + Math.sin(an) * h * rj]); }
          pts.push([X + w * 0.45, Y + 0.3], [X - w * 0.45, Y + 0.3]);
          ops.push({ t: 'f', p: pts.map(q => [_wclR1(q[0]), _wclR1(q[1])]), m: 'grass', h: lk.heather ? _wclMix(_wclShade('#56532f', 0.8 + 0.35 * rr()), '#7a5a78', rr() < 0.4 ? 0.45 : 0) : _wclShade('#5f7c3f', 0.8 + 0.35 * rr()), a: 0.95 });
        } else {
          const blocks = lk.scree === 'blocks', fleck = r() < (blocks ? 0.2 : 0.35), sz = fleck ? 0.12 + r() * 0.2 : (blocks ? 0.5 : 0.3) + Math.pow(r(), 2) * (blocks ? 4.2 : 3.2), w = Math.max(1.6, sz * k), h = Math.max(1.2, sz * k * (0.5 + 0.25 * r())), tone = 0.64 + 0.3 * rr();
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
