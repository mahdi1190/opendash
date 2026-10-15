/* ============================================================
   WORLD ENGINE v3.1, package `appearance`: perspective geometry (docs/dev/WORLD_ENGINE.md 1.4, 14.2, 14.3; requirements
   Q2, Q3, Q4 (long hulls), Q5). Private names: _wex. PURE classic script: nothing runs at load; the v2 building generator
   (sceneBuildingProject), the camera (sceneProject, sceneGroundHeight) and the look package (worldMaterialColour) are reached
   through typeof guards.

   The author gives centre lines, footprints and heights in metres; the engine projects them. Everything here is in CAMERA
   metres (x right, z forward, y up); the screen is the 1600 x 900 frame of the v2 camera (X = x0 + f x / z,
   Y = horizon + f (eye - y) / z), clipped at the near plane.

   API
     WORLD_EXTRUDE_KINDS                    wall, fence, railing, hedge, kerb, coping: width, height, solidity, material, detail
     worldExtrude(world, cam, o) -> [prim]  every primitive of a world, far to near: its `lines` (Q2), `buildings` (Q3) and its
                                            long static hulls (Q4: boats, trains, trams drawn in perspective). Each prim has a
                                            footprint, zKey (its nearest ground z) and a screen box, so it orders and occludes like
                                            any static (2.2). o: { season, snowDepth, tierCap, hulls (false: none) }
     worldExtrudeLine(line, cam, o) -> [prim]   a linear feature { id, kind, path, width?, h?, gaps?, y? } cut into pieces of
                                            bounded depth span (a piece never spans more than max(1 m, 8 % of its depth), so a
                                            mover beside a long wall is ordered against the right piece), with converging edges
                                            and the true width at every depth, following the ground's slope (curves: the path's
                                            points); gates as gaps: gaps [{ at: metres along | [x, z], w }] or [[s0, s1]].
     worldExtrudeBuilding(b, cam, o) -> prim | null   a building { id, foot, storeys | h, roof, style, seed, front } through
                                            the v2 generator (visible faces only, roofs, windows in courses, styles); a simple
                                            prism when the generator is not loaded. Landmarks keep their hand-drawn art (they are
                                            entities: placed and scaled by the camera, never extruded).
     worldExtrudeHull(ent, cam, o) -> prim | null   a long hull in perspective: its side art laid along its real length in
                                            depth slices (each slice an affine map of the art: nothing is a flat slab), the end the
                                            eye sees (bow or stern art), the roof when the eye is above it.
     worldExtrudeBoatModel(ent, cam, o) -> prim   a canal boat (narrowboat, widebeam) as a 3D model: true size, hull, cabin, cratch, tiller,
                                            roof clutter, ropes to the bank (o.regions), lit windows at night, a bob (o.t); see its block
     worldExtrudeDraw(ctx, prim, o) -> draws   draws a prim on a 2D context. o: { vs, ox, oy (device = vs * scene + o), litGlow (a hull's
                                            lit windows at night), sprite
                                            (the renderer's env.sprite: hull art), colour(mat, hex, { z, role }) (materials,
                                            look's worldMaterialColour by default), night, windowShare, alpha, season, haze }
     worldForeshorten(cam, z, w) -> { across, along, row }   Q5: the screen size of w metres at depth z across the view
                                            (f w / z) and along it on the ground (f eye w / (z (z + w))), and the ground row at z:
                                            what any texture, course, stripe or ripple at that depth must scale by.
   ============================================================ */
const WORLD_EXTRUDE_KINDS = Object.freeze({
  wall: Object.freeze({ w: 0.45, h: 1.4, solid: true, mat: 'stone', hex: '#9a9184', top: '#b4ab9c', detail: 'courses' }),
  fence: Object.freeze({ w: 0.08, h: 1.2, solid: true, mat: 'timber', hex: '#7a5a3c', top: '#8a6a4a', detail: 'rails' }),
  railing: Object.freeze({ w: 0.05, h: 1.05, solid: true, mat: 'metal', hex: '#34383c', top: '#45494d', detail: 'bars' }),
  hedge: Object.freeze({ w: 1.1, h: 1.7, solid: true, mat: 'leaf', hex: '#4f6b35', top: '#5f7d40', detail: 'leafy' }),
  kerb: Object.freeze({ w: 0.15, h: 0.12, solid: false, mat: 'stone', hex: '#a8a49c', top: '#c2beb6', detail: null }),
  coping: Object.freeze({ w: 0.4, h: 0.08, solid: false, mat: 'stone', hex: '#a39b8a', top: '#c4bcab', detail: null }),
  // a railway's bed (laid by the fill under every `rail` surface, 79-world-1fill.js): the ballast and the rails of its tracks
  // (`tracks`: the offsets of each track's centre), and the concrete cable troughs along it
  ballast: Object.freeze({ w: 7.4, h: 0.35, solid: false, mat: 'stone', hex: '#8d877b', top: '#a39c8d', detail: 'track' }),
  trough: Object.freeze({ w: 0.45, h: 0.25, solid: false, mat: 'stone', hex: '#aeaaa0', top: '#c6c2b8', detail: null }),
});
const _wexNum = v => typeof v === 'number' && Number.isFinite(v);
const _wexPt = p => Array.isArray(p) && p.length >= 2 && _wexNum(p[0]) && _wexNum(p[1]);
const _wexR = (v, n) => { const k = Math.pow(10, n == null ? 2 : n); return Math.round(v * k) / k; };
const _wexClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function _wexHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

/* ---------- camera maths ---------- */
const _wexNear = cam => Math.max(0.3, (cam && cam.dMin ? cam.dMin : 1) * 0.25);
function _wexP(cam, x, z, y) {
  const k = cam.f / Math.max(1e-3, z), x0 = _wexNum(cam.x0) ? cam.x0 : 800;
  return [x0 + k * x, cam.horizon + k * (cam.eye - y)];
}
const _wexG = (cam, x, z) => (cam && cam.relief && typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, z) : 0);
/** Clip a 3D polygon ([x, y, z]) to z >= near (Sutherland-Hodgman on one plane). */
function _wexClip3(poly, near) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = a[2] >= near, ib = b[2] >= near;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]); }
  }
  return out;
}
function _wexProjPoly(cam, poly3) {
  const q = _wexClip3(poly3, _wexNear(cam));
  return q.length >= 3 ? q.map(p => _wexP(cam, p[0], p[2], p[1]).map(v => _wexR(v, 2))) : null;
}
function _wexBox(pts, b) {
  b = b || [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of pts) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
  return b;
}
/** Is a face with outward normal n (x, y, z) at point p seen by the eye (0, eye, 0)? */
const _wexSees = (cam, n, p) => n[0] * -p[0] + n[1] * (cam.eye - p[1]) + n[2] * -p[2] > 1e-6;
/** Q5: the screen size of w metres at depth z (see the header). */
function worldForeshorten(cam, z, w) {
  w = _wexNum(w) ? w : 1;
  if (!cam || !_wexNum(cam.f) || !(z > 0)) return { across: 0, along: 0, row: null };
  return { across: cam.f * w / z, along: cam.f * cam.eye * w / (z * (z + w)), row: cam.horizon + cam.f * cam.eye / z };
}

/* ---------- linear features (Q2) ---------- */
function _wexLen(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; }
/** The point at arc length s and its unit direction. */
function _wexAlong(path, s) {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) continue;
    if (acc + L >= s || i === path.length - 1) { const t = _wexClamp((s - acc) / L, 0, 1); return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], t: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }; }
    acc += L;
  }
  const a = path[0]; return { p: [a[0], a[1]], t: [0, 1] };
}
/** The arc length of the point of a path nearest to (x, z). */
function _wexArcOf(path, x, z) {
  let best = Infinity, at = 0, acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 1e-9) continue;
    const t = _wexClamp(((x - a[0]) * dx + (z - a[1]) * dz) / (L * L), 0, 1), d = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
    if (d < best) { best = d; at = acc + t * L; }
    acc += L;
  }
  return at;
}
/** The runs of a line between its gaps: [[s0, s1], ...] in metres along. */
function _wexRuns(line, total) {
  const gaps = [];
  for (const g of Array.isArray(line.gaps) ? line.gaps : []) {
    if (Array.isArray(g) && g.length === 2 && _wexNum(g[0]) && _wexNum(g[1])) gaps.push([Math.min(g[0], g[1]), Math.max(g[0], g[1])]);
    else if (g && typeof g === 'object') {
      const s = _wexPt(g.at) ? _wexArcOf(line.path, g.at[0], g.at[1]) : _wexNum(g.at) ? g.at : null, w = _wexNum(g.w) && g.w > 0 ? g.w : 1.2;
      if (s != null) gaps.push([s - w / 2, s + w / 2]);
    }
  }
  gaps.sort((a, b) => a[0] - b[0]);
  const runs = [];
  let s = 0;
  for (const [g0, g1] of gaps) { if (g0 > s + 0.05) runs.push([s, Math.min(g0, total)]); s = Math.max(s, g1); }
  if (total > s + 0.05) runs.push([s, total]);
  return runs;
}
/** The sample arc lengths of a run: every path vertex inside it, plus cuts so a piece's depth span stays bounded. */
function _wexSamples(path, s0, s1, cam) {
  const out = [s0];
  let acc = 0;
  for (let i = 1; i < path.length; i++) { acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (acc > s0 + 1e-6 && acc < s1 - 1e-6) out.push(acc); }
  out.push(s1);
  out.sort((a, b) => a - b);
  // subdivide: a step no longer than max(0.5 m, 4 % of the depth) so curves, slopes and the near plane stay exact
  const fine = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    let s = a;
    while (b - s > 1e-6) {
      const z = Math.max(_wexNear(cam), _wexAlong(path, s).p[1]), step = Math.max(0.5, 0.04 * z);
      s = Math.min(b, s + step);
      fine.push(s);
    }
  }
  return fine;
}
/** The base colour of a material (prims keep base colours; materials, season, light and haze are applied when drawn: V2, V5). */
const _wexMat = (o, mat, hex) => hex;
/** One piece of a line: faces and details from centreline samples (arc lengths ss) of a run. */
function _wexPiece(line, K, cam, ss, ends, o, idx) {
  const w = _wexNum(line.width) && line.width > 0 ? line.width : K.w, h = _wexNum(line.h) && line.h > 0 ? line.h : K.h, y0 = _wexNum(line.y) ? line.y : 0;
  const C = ss.map(s => _wexAlong(line.path, s));
  // vertex normals (left of travel: (-tz, tx)), mitred and limited
  const N = C.map((c, i) => {
    const t0 = C[Math.max(0, i - 1)].t, t1 = c.t, tx = t0[0] + t1[0], tz = t0[1] + t1[1], L = Math.hypot(tx, tz) || 1;
    const nx = -tz / L, nz = tx / L, cos = Math.max(0.5, nx * -t1[1] + nz * t1[0]);
    return [nx / cos, nz / cos];
  });
  const Lp = C.map((c, i) => [c.p[0] + N[i][0] * w / 2, c.p[1] + N[i][1] * w / 2]), Rp = C.map((c, i) => [c.p[0] - N[i][0] * w / 2, c.p[1] - N[i][1] * w / 2]);
  // each side stands on the ground under it (a cross-slope never floats or buries an edge); the top is level across at the
  // centre's ground plus the height, so the line follows the slope along its length (W2, Q2)
  const base = C.map(c => y0 + _wexG(cam, c.p[0], c.p[1])), top = base.map(b => b + h);
  const baseL = Lp.map(p => y0 + _wexG(cam, p[0], p[1])), baseR = Rp.map(p => y0 + _wexG(cam, p[0], p[1]));
  const foot = Lp.concat(Rp.slice().reverse()).map(p => [_wexR(p[0], 3), _wexR(p[1], 3)]);
  const zs = foot.map(p => p[1]), zKey = Math.min(...zs);
  const faces = [], details = [];
  let box = null;
  const addFace = (poly3, role, hex, alpha) => {
    const pts = _wexProjPoly(cam, poly3);
    if (!pts) return null;
    const z = poly3.reduce((s, p) => s + p[2], 0) / poly3.length;
    const f = { pts, role, mat: K.mat, hex: _wexMat(o, K.mat, hex, z, role), z: _wexR(z, 2), alpha: alpha == null ? 1 : alpha };
    faces.push(f); box = _wexBox(pts, box);
    return f;
  };
  const solidFaces = K.detail !== 'rails' && K.detail !== 'bars';
  // the side faces, one per segment (a curve turns its faces; each is seen or not on its own)
  for (let i = 1; i < C.length; i++) {
    for (const side of [1, -1]) {
      const P = side > 0 ? Lp : Rp, B0 = side > 0 ? baseL : baseR, a = P[i - 1], b = P[i];
      const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez) || 1;
      const n = side > 0 ? [-ez / L, 0, ex / L] : [ez / L, 0, -ex / L];
      const mid = [(a[0] + b[0]) / 2, (B0[i - 1] + B0[i] + top[i - 1] + top[i]) / 4, (a[1] + b[1]) / 2];
      if (!_wexSees(cam, n, mid)) continue;
      const quad = [[a[0], B0[i - 1], a[1]], [b[0], B0[i], b[1]], [b[0], top[i], b[1]], [a[0], top[i - 1], a[1]]];
      if (solidFaces) addFace(quad, 'side', K.hex);
      else if (K.detail === 'bars') {
        // a railing far away reads as a light screen; near it shows its bars (below)
        const pts = _wexProjPoly(cam, quad);
        if (pts) { box = _wexBox(pts, box); if (cam.f * 0.12 / Math.max(0.3, mid[2]) < 2.2) faces.push({ pts, role: 'screen', mat: K.mat, hex: _wexMat(o, K.mat, K.hex, mid[2], 'screen'), z: _wexR(mid[2], 2), alpha: 0.35 }); }
      } else { const pts = _wexProjPoly(cam, quad); if (pts) box = _wexBox(pts, box); }
    }
  }
  // the top (seen from above the line's top), the end caps at a run's ends
  const topSeen = cam.eye > Math.min(...top) + 1e-3;
  if (solidFaces && topSeen) {
    const poly = Lp.map((p, i) => [p[0], top[i], p[1]]).concat(Rp.map((p, i) => [p[0], top[i], p[1]]).reverse());
    addFace(poly, 'top', K.top);
  }
  if (solidFaces) for (const [k, sg] of [[0, -1], [C.length - 1, 1]]) {
    if (!(sg < 0 ? ends[0] : ends[1])) continue;
    const t = C[k].t, n = [t[0] * sg, 0, t[1] * sg], c = [C[k].p[0], base[k] + h / 2, C[k].p[1]];
    if (!_wexSees(cam, n, c)) continue;
    addFace([[Lp[k][0], baseL[k], Lp[k][1]], [Rp[k][0], baseR[k], Rp[k][1]], [Rp[k][0], top[k], Rp[k][1]], [Lp[k][0], top[k], Lp[k][1]]], 'end', K.hex);
  }
  // details: wall courses, fence posts and rails, railing bars, the hedge's leafy top
  const near = _wexNear(cam), mid = Math.floor(C.length / 2);
  const seenL = N[mid][0] * -C[mid].p[0] + N[mid][1] * -C[mid].p[1] > 0, seenSide = seenL ? Lp : Rp, seenBase = seenL ? baseL : baseR;   // the side facing the eye
  const line3 = (P, hy, B) => P.map((p, i) => [p[0], (B || base)[i] + hy, p[1]]).filter(p => p[2] >= near).map(p => _wexP(cam, p[0], p[2], p[1]).map(v => _wexR(v, 2)));
  if (K.detail === 'courses') {
    const zMid = C[Math.floor(C.length / 2)].p[1];
    if (cam.f * 0.3 / Math.max(near, zMid) >= 3) for (let hy = 0.3; hy < h - 0.05; hy += 0.3) { const pts = line3(seenSide, hy, seenBase); if (pts.length >= 2) details.push({ type: 'stroke', pts, width: _wexR(Math.max(0.4, cam.f * 0.012 / Math.max(near, zMid)), 2), hex: _wexMat(o, K.mat, '#6e665a', zMid, 'course'), alpha: 0.45 }); }
  } else if (K.detail === 'drystone') {
    if (typeof worldDrystoneDetails === 'function') worldDrystoneDetails({ line, cam, ss, K, details, h, w, seenL, idx, grow: (p) => { box = _wexBox(p, box); } });
  } else if (K.detail === 'rails' || K.detail === 'bars') {
    const zMid = C[Math.floor(C.length / 2)].p[1], lw = Math.max(0.5, cam.f * (K.detail === 'rails' ? 0.06 : 0.035) / Math.max(near, zMid));
    for (const hy of K.detail === 'rails' ? [0.4 * h, 0.9 * h] : [0.1, h]) { const pts = line3(C.map(c => c.p), hy); if (pts.length >= 2) details.push({ type: 'stroke', pts, width: _wexR(lw, 2), hex: _wexMat(o, K.mat, K.hex, zMid, 'rail'), alpha: 1 }); }
    const step = K.detail === 'rails' ? 2.4 : 0.12, s0 = ss[0], s1 = ss[ss.length - 1];
    if (K.detail === 'rails' || cam.f * step / Math.max(near, zMid) >= 2.2) {
      for (let s = Math.ceil(s0 / step) * step; s <= s1 + 1e-6; s += step) {
        const a = _wexAlong(line.path, s), g = y0 + _wexG(cam, a.p[0], a.p[1]);
        if (a.p[1] < near) continue;
        const pw = K.detail === 'rails' ? 0.1 : 0.016, top = K.detail === 'rails' ? h + 0.05 : h;
        const q = [[a.p[0] - a.t[0] * pw / 2, g, a.p[1] - a.t[1] * pw / 2], [a.p[0] + a.t[0] * pw / 2, g, a.p[1] + a.t[1] * pw / 2], [a.p[0] + a.t[0] * pw / 2, g + top, a.p[1] + a.t[1] * pw / 2], [a.p[0] - a.t[0] * pw / 2, g + top, a.p[1] - a.t[1] * pw / 2]];
        const pts = _wexProjPoly(cam, q);
        if (pts) { details.push({ type: 'fill', pts, hex: _wexMat(o, K.mat, K.hex, a.p[1], 'post'), alpha: 1, minW: 0.6 }); box = _wexBox(pts, box); }
      }
    }
  } else if (K.detail === 'track') {
    // the rails of every track on a ballast bed (line.tracks: the offsets of each track's centre from the bed's centre line): a pair
    // 1.435 m apart a rail's height over the ballast, a hairline of at least half a pixel (a bed 200 m away is one fine dark line per
    // track), and, near enough to read, the sleepers across the bed (the v2 ground's own sleepers stay under the bed)
    const gauge = typeof WORLD_RAIL_BED === 'object' ? WORLD_RAIL_BED.gauge : 1.435, rh = typeof WORLD_RAIL_BED === 'object' ? WORLD_RAIL_BED.rail : 0.15;
    const offs = (Array.isArray(line.tracks) && line.tracks.length ? line.tracks : [0]).filter(_wexNum), zMid = C[Math.floor(C.length / 2)].p[1];
    const lw = Math.max(0.5, cam.f * 0.07 / Math.max(near, zMid));
    const railAt = (o) => C.map((c, i) => [c.p[0] + N[i][0] * o, top[i] + rh, c.p[1] + N[i][1] * o]).filter(p => p[2] >= near).map(p => _wexP(cam, p[0], p[2], p[1]).map(v => _wexR(v, 2)));
    if (cam.eye > Math.min(...top) + 1e-3 && cam.f * 0.6 / Math.max(near, zMid) >= 3) {
      const s0 = ss[0], s1 = ss[ss.length - 1];
      for (let s = Math.ceil(s0 / 0.6) * 0.6; s <= s1 + 1e-6; s += 0.6) {
        const a = _wexAlong(line.path, s), nx = -a.t[1], nz = a.t[0], g = y0 + _wexG(cam, a.p[0], a.p[1]) + h + 0.02;
        if (a.p[1] < near) continue;
        for (const off of offs) {
          const c0 = [a.p[0] + nx * off, a.p[1] + nz * off], hw = 1.3, lh = 0.13;
          const q = [[c0[0] - nx * hw - a.t[0] * lh, g, c0[1] - nz * hw - a.t[1] * lh], [c0[0] + nx * hw - a.t[0] * lh, g, c0[1] + nz * hw - a.t[1] * lh], [c0[0] + nx * hw + a.t[0] * lh, g, c0[1] + nz * hw + a.t[1] * lh], [c0[0] - nx * hw + a.t[0] * lh, g, c0[1] - nz * hw + a.t[1] * lh]];
          const pts = _wexProjPoly(cam, q);
          if (pts) { details.push({ type: 'fill', pts, hex: '#5b4b3c', alpha: 0.9 }); box = _wexBox(pts, box); }
        }
      }
    }
    for (const off of offs) for (const g of [-gauge / 2, gauge / 2]) {
      const pts = railAt(off + g);
      if (pts.length >= 2) { details.push({ type: 'stroke', pts, width: _wexR(lw, 2), hex: '#3d4045', alpha: 0.95 }); for (const q of pts) box = _wexBox([q], box); }
    }
  } else if (K.detail === 'leafy') {
    // a seeded lumpy top: bumps of 0.1-0.25 m every 0.6-1 m along the outline seen against the sky
    const rnd = (() => { let a = _wexHash((line.id || 'hedge') + '|' + idx) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const s0 = ss[0], s1 = ss[ss.length - 1], pts3 = [];
    for (let s = s0; s <= s1 + 1e-6; s += 0.35) { const a = _wexAlong(line.path, s), g = y0 + _wexG(cam, a.p[0], a.p[1]); pts3.push([a.p[0], g + h + 0.06 + 0.16 * Math.abs(Math.sin(s * 3.1 + rnd() * 6)) * rnd(), a.p[1]]); }
    const lastA = _wexAlong(line.path, s1);
    const outline = pts3.concat([[lastA.p[0], y0 + _wexG(cam, lastA.p[0], lastA.p[1]) + h - 0.05, lastA.p[1]], [C[0].p[0], base[0] + h - 0.05, C[0].p[1]]]);
    const pts = _wexProjPoly(cam, outline);
    if (pts) { details.push({ type: 'fill', pts, hex: _wexMat(o, K.mat, K.top, zKey, 'leaf'), alpha: 1 }); box = _wexBox(pts, box); }
  }
  if (!box) return null;
  // the vanishing point of the piece's mean direction (tests and the debug overlay): where its parallel edges meet on screen
  const t = C[C.length - 1].p, f0 = C[0].p, dx = t[0] - f0[0], dz = t[1] - f0[1], x0 = _wexNum(cam.x0) ? cam.x0 : 800;
  const vp = Math.abs(dz) > 1e-6 ? [_wexR(x0 + cam.f * dx / dz, 2), cam.horizon] : null;
  return { id: (line.id || 'line') + ':' + idx, kind: 'line', sub: line.kind || 'wall', ent: line.id || null, foot, zKey: _wexR(zKey, 3), zFar: _wexR(Math.max(...zs), 3),
    y0: _wexR(Math.min(...baseL, ...baseR), 3), height: h, width: w, solidity: K.solid ? 'solid' : 'passable', mat: K.mat, faces: faces.sort((p, q) => q.z - p.z), details, box: box.map(v => _wexR(v, 1)), vp,
    edges: { left: Lp.map((p, i) => [p[0], baseL[i], p[1]]), right: Rp.map((p, i) => [p[0], baseR[i], p[1]]), top, h } };
}
/** A linear feature as primitives (see the header). */
function worldExtrudeLine(line, cam, o) {
  o = o || {};
  if (!line || !cam || !_wexNum(cam.f) || !Array.isArray(line.path) || line.path.length < 2 || !line.path.every(_wexPt)) return [];
  // a wall in the uplands is a dry-stone wall (4drystone: the place's style says so)
  const K = line.kind === 'wall' && o.drystone && typeof WORLD_EXTRUDE_DRYSTONE === 'object' ? WORLD_EXTRUDE_DRYSTONE : (WORLD_EXTRUDE_KINDS[line.kind] || WORLD_EXTRUDE_KINDS.wall), total = _wexLen(line.path), near = _wexNear(cam);
  const out = [];
  let idx = 0;
  for (const [s0, s1] of _wexRuns(line, total)) {
    const ss = _wexSamples(line.path, s0, s1, cam);
    // pieces: cut where the depth span passes max(1 m, 8 % of the depth) or the length passes 25 m
    let start = 0;
    for (let i = 1; i < ss.length; i++) {
      const za = _wexAlong(line.path, ss[start]).p[1], zb = _wexAlong(line.path, ss[i]).p[1], zmin = Math.max(near, Math.min(za, zb));
      const last = i === ss.length - 1;
      if (last || Math.abs(zb - za) >= Math.max(1, 0.08 * zmin) || ss[i] - ss[start] >= 25) {
        const piece = _wexPiece(line, K, cam, ss.slice(start, i + 1), [start === 0, last], o, idx++);
        if (piece) out.push(piece);
        start = i;
      }
    }
  }
  return out;
}

/* ---------- buildings (Q3) ---------- */
// terrace-like styles and their house frontage (metres): a long footprint of one of these is a ROW of houses, never one blank block
const _WEX_TERRACE = Object.freeze({ 'victorian-terrace': [4.6, 6.2], edwardian: [5, 7], georgian: [6, 9], 'stone-cottage': [5, 7.5], 'norfolk-flint': [5, 7],
  'semi-1930s': [7, 9], 'interwar-shops': [5, 7] });
const _WEX_STREET = new Set(['road', 'pavement', 'path', 'plaza', 'towpath', 'water', 'crossing', 'cycleway', 'tramway', 'platform', 'boardwalk', 'track']);
function _wexInSurf(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) { let c = false; const P = s.poly; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; }
  if (Array.isArray(s.path) && s.path.length >= 2) { const hw = (Number(s.width) || 2) / 2; for (let i = 1; i < s.path.length; i++) { const a = s.path[i - 1], b = s.path[i], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 ? _wexClamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1) : 0; if (Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) <= hw) return true; } }
  return false;
}
/** The footprint edge (input order) that faces the building's street (K3: buildings face their street), or null to leave it to
    the generator (the edge most toward the camera). The street: the nearest road, pavement, path, square, towpath or water. */
function _wexFrontOf(b, world, cam) {
  const P = b.foot, S = (world && world.surfaces || []).filter(s => s && _WEX_STREET.has(s.kind));
  if (!S.length || P.length < 3) return null;
  let area = 0; for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length]; area += a[0] * c[1] - c[0] * a[1]; }
  let best = null;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], c = P[(i + 1) % P.length], ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez) || 1;
    const n = area > 0 ? [ez / L, -ex / L] : [-ez / L, ex / L], m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    let hit = null;
    for (const k of [1.2, 3, 6, 11, 18, 26]) { if (S.some(s => _wexInSurf(s, m[0] + n[0] * k, m[1] + n[1] * k))) { hit = k; break; } }
    if (hit == null) continue;
    const seen = n[0] * -m[0] + n[1] * -m[1] > 0 ? 4 : 0, score = 30 - hit + seen + Math.min(L, 60) * 0.05;
    if (!best || score > best.score) best = { i, score };
  }
  return best ? best.i : null;
}
/** The long edge of a four-cornered footprint that faces the camera most (the camera is at the origin looking along +z); its index. */
function _wexLongFront(P) {
  let area = 0; for (let i = 0; i < 4; i++) { const a = P[i], c = P[(i + 1) % 4]; area += a[0] * c[1] - c[0] * a[1]; }
  let best = 0, bs = -Infinity;
  const Ls = P.map((a, i) => { const c = P[(i + 1) % 4]; return Math.hypot(c[0] - a[0], c[1] - a[1]); }), Lmax = Math.max(...Ls);
  for (let i = 0; i < 4; i++) {
    const a = P[i], c = P[(i + 1) % 4], ex = c[0] - a[0], ez = c[1] - a[1], L = Ls[i] || 1, n = area > 0 ? [ez / L, -ex / L] : [-ez / L, ex / L], m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const seen = n[0] * -m[0] + n[1] * -m[1], sc = (L >= Lmax * 0.8 ? 100 : 0) + seen / Math.hypot(m[0], m[1] || 1);
    if (sc > bs) { bs = sc; best = i; }
  }
  return best;
}
/**
 * A world building as the buildings the generator draws (Q3, K3): its front turned to its street when the spec gives none, and a
 * long footprint of a terrace-like style (a street of terraces) cut into houses of the style's frontage along that front, each
 * with its own seed (doors, colours, wear vary house to house), so a row reads as houses with doors and windows, never as one
 * blank 90 m wall. Any other building is returned as it is (with its front). -> [building]
 */
function worldBuildingParts(b, world, cam) {
  if (!b || !Array.isArray(b.foot) || b.foot.length < 3) return [b];
  let fi = Number.isInteger(b.front) ? b.front : _wexFrontOf(b, world, cam);
  const range = _WEX_TERRACE[b.style || 'victorian-terrace'];
  // no street within reach (a lane high on a hillside): a terrace faces the camera along its LONG side, never its gable end (a roof spanning
  // the long side was a pyramid 60 m tall: SCENE_LESSONS K)
  if (range && b.foot.length === 4) {
    const P4 = b.foot, Ls = P4.map((q, i) => Math.hypot(P4[(i + 1) % 4][0] - q[0], P4[(i + 1) % 4][1] - q[1]));
    // a gable end that faces the street or the sea (the nearest 'street' was beside the row, not in front of it) is not the front either
    if (fi == null || Ls[fi] < Math.max(...Ls) * 0.8) fi = _wexLongFront(P4);
  }
  if (fi == null) return [b];
  if (b.foot.length !== 4 || !range) return [Object.assign({}, b, { front: fi })];
  const n0 = b.foot.length, P = b.foot.slice(fi).concat(b.foot.slice(0, fi)).map(p => [p[0], p[1]]);
  const L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  if (L <= range[1] * 1.6) return [Object.assign({}, b, { foot: P, front: 0 })];
  const mean = (range[0] + range[1]) / 2, n = Math.max(2, Math.min(80, Math.round(L / mean))), seed0 = _wexHash(String(b.id || '') + JSON.stringify(b.foot));
  // seeded house widths within the style's range, scaled to fill the frontage exactly
  const w = []; for (let k = 0; k < n; k++) w.push(0.88 + 0.24 * ((_wexHash(seed0 + '|' + k) % 1000) / 1000));
  const tot = w.reduce((a, v) => a + v, 0), lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], out = [];
  let t0 = 0;
  for (let k = 0; k < n; k++) {
    const t1 = k === n - 1 ? 1 : t0 + w[k] / tot;
    // a street of terraces is never one height: a house in four is a storey lower or higher (seeded; a spec that pins `storeys: [n]` or `level: false` keeps its own)
    const r = (_wexHash(seed0 + '|s' + k) % 1000) / 1000, st0 = _wexNum(b.storeys) ? b.storeys : 3, st = b.level === false ? st0 : r < 0.14 ? Math.max(2, st0 - 1) : r > 0.86 ? st0 + 1 : st0;
    out.push(Object.assign({}, b, { storeys: st, id: (b.id || 'building') + '#' + k, foot: [lerp(P[0], P[1], t0), lerp(P[0], P[1], t1), lerp(P[3], P[2], t1), lerp(P[3], P[2], t0)].map(p => [_wexR(p[0], 3), _wexR(p[1], 3)]),
      front: 0, seed: (seed0 + k * 7919) % 100000, frontage: undefined, part: { of: b.id || null, k, n } }));
    t0 = t1;
  }
  void n0;
  return out;
}
/** A building through the v2 generator (see the header); a plain prism without it. */
function worldExtrudeBuilding(b, cam, o) {
  o = o || {};
  if (!b || !cam || !_wexNum(cam.f) || !Array.isArray(b.foot) || b.foot.length < 3 || !b.foot.every(_wexPt)) return null;
  const foot = b.foot.map(p => [p[0], p[1]]), zKey = Math.min(...foot.map(p => p[1]));
  if (Math.max(...foot.map(p => p[1])) < _wexNear(cam)) return null;
  const spec = Object.assign({}, b, { foot, seed: b.seed != null ? b.seed : _wexHash(b.id || JSON.stringify(foot)) % 100000 });
  if (!spec.style) spec.style = 'victorian-terrace';
  if (typeof sceneBuildingProject === 'function') {
    let d = null;
    // a building stands on the ground where it is (W2): a footprint on a slope is projected from an eye lowered by the ground's height at
    // its lowest corner (the generator measures everything from a flat ground), so a terrace on a cliff stands on the cliff, not at its foot
    const g = foot.reduce((m, p) => Math.min(m, _wexG(cam, p[0], p[1])), Infinity), camB = Number.isFinite(g) && Math.abs(g) > 0.02 ? Object.assign({}, cam, { eye: cam.eye - g }) : cam;
    try { d = sceneBuildingProject(spec, camB, { season: o.season || 'summer', snowDepth: o.snowDepth || 0, tierCap: o.tierCap }); } catch (e) { d = null; }
    if (d) {
      // the outward normal of every visible wall (the generator's counter-clockwise footprint, front edge first)
      const F = d.foot || foot, walls = (d.walls || []).map(i => { const a = F[i], c = F[(i + 1) % F.length], ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez) || 1; return { edge: i, a, b: c, n: [ez / L, -ex / L] }; });
      return { id: b.id || null, kind: 'building', ent: b.id || null, foot, zKey: _wexR(zKey, 3), y0: Number.isFinite(g) ? _wexR(g, 3) : 0, height: d.h, eave: d.eave, box: d.box, direct: d, walls, solidity: 'solid', style: d.style };
    }
  }
  // the fallback prism: walls that face the eye and a flat roof
  const h = _wexNum(b.h) ? b.h : (_wexNum(b.storeys) ? b.storeys : 2) * 3, faces = [], walls = [];
  let area = 0;
  for (let i = 0; i < foot.length; i++) { const a = foot[i], c = foot[(i + 1) % foot.length]; area += a[0] * c[1] - c[0] * a[1]; }
  const ccw = area > 0;   // counter-clockwise in (x, z): outward normal to the right of a -> c
  let box = null;
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i], c = foot[(i + 1) % foot.length], ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez) || 1;
    const n = ccw ? [ez / L, 0, -ex / L] : [-ez / L, 0, ex / L], g0 = _wexG(cam, a[0], a[1]), g1 = _wexG(cam, c[0], c[1]);
    if (!_wexSees(cam, n, [(a[0] + c[0]) / 2, (g0 + g1) / 2 + h / 2, (a[1] + c[1]) / 2])) continue;
    const pts = _wexProjPoly(cam, [[a[0], g0, a[1]], [c[0], g1, c[1]], [c[0], g1 + h, c[1]], [a[0], g0 + h, a[1]]]);
    if (pts) { faces.push({ pts, role: 'wall', mat: 'brick', hex: _wexMat(o, 'brick', '#8c5a46', (a[1] + c[1]) / 2, 'wall'), z: (a[1] + c[1]) / 2, alpha: 1 }); box = _wexBox(pts, box); walls.push({ edge: i, a, b: c, n: [n[0], n[2]] }); }
  }
  if (cam.eye > h) { const pts = _wexProjPoly(cam, foot.map(p => [p[0], _wexG(cam, p[0], p[1]) + h, p[1]])); if (pts) { faces.push({ pts, role: 'roof', mat: 'slate', hex: _wexMat(o, 'slate', '#4a5058', zKey, 'roof'), z: zKey, alpha: 1 }); box = _wexBox(pts, box); } }
  if (!box) return null;
  return { id: b.id || null, kind: 'building', ent: b.id || null, foot, zKey: _wexR(zKey, 3), height: h, box: box.map(v => _wexR(v, 1)), faces: faces.sort((p, q) => q.z - p.z), walls, solidity: 'solid', fallback: true };
}

/* ---------- long hulls in perspective (Q4) ---------- */
function _wexArt(obj, v, season) {
  let box = null;
  if (typeof sceneObjShapes === 'function') { try { const sh = sceneObjShapes(obj, v | 0, season || 'summer'); if (sh && Array.isArray(sh.box)) box = sh.box; } catch (e) { box = null; } }
  const def = typeof sceneObj === 'function' ? sceneObj(obj) : null;
  if (!box && def && Array.isArray(def.size)) box = [-def.size[0] / 2, -def.size[1], def.size[0] / 2, 0];
  return def && box ? { box, size: def.size } : null;
}
const _wexProfMemo = new Map();
/** The top of an object's art per column (64 columns over its box; art units, y up negative): its silhouette against the sky. */
function _wexProfile(obj, v, season) {
  const key = obj + '|' + (v | 0) + '|' + (season || 'summer');
  if (_wexProfMemo.has(key)) return _wexProfMemo.get(key);
  let out = null;
  try {
    const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(obj, v | 0, season || 'summer') : null;
    if (sh && Array.isArray(sh.box) && sh.parts) {
      const N = 64, b = sh.box, w = b[2] - b[0], tops = new Array(N).fill(Infinity), step = w / 256;
      const put = (x, y) => { const i = Math.floor((x - b[0]) / w * N); if (i >= 0 && i < N && y < tops[i]) tops[i] = y; };
      for (const part of Object.keys(sh.parts)) {
        if (part === 'lit' || /shadow|reflect|smoke/.test(part)) continue;
        for (const s0 of sh.parts[part] || []) {
          if (!s0 || !s0.d || s0.m || !(s0.f || s0.s)) continue;
          // trace the outline (curves by their control points), densified so every column sees its top
          let last = null, first = null;
          const seg = (x, y) => { if (last) { const n = Math.max(1, Math.ceil(Math.hypot(x - last[0], y - last[1]) / step)); for (let k = 1; k <= n; k++) put(last[0] + (x - last[0]) * k / n, last[1] + (y - last[1]) * k / n); } else put(x, y); last = [x, y]; };
          _wexTrace({ moveTo(x, y) { last = null; seg(x, y); first = [x, y]; }, lineTo: seg, quadraticCurveTo(a, c, x, y) { seg(a, c); seg(x, y); }, bezierCurveTo(a, c, d, e, x, y) { seg(a, c); seg(d, e); seg(x, y); }, closePath() { if (first) seg(first[0], first[1]); } }, s0.d);
        }
      }
      out = { box: b, N, tops };
    }
  } catch (e) { out = null; }
  _wexProfMemo.set(key, out);
  return out;
}
/**
 * Where to cut an art so its middle can repeat seamlessly: the longest FLAT run of its top profile between 15 % and 85 % of its
 * width (a plain stretch of cabin side between the features), so the repeat never duplicates a chimney, pots or a door and its
 * two ends meet the same roof line. [c0, c1] as fractions of the width; null when no run of at least 6 % exists (the art is
 * then stretched instead).
 */
function _wexRepeatCuts(obj, v, season) {
  const P = _wexProfile(obj, v, season);
  if (!P) return null;
  const T = P.tops, N = P.N, h = (P.box[3] - P.box[1]) || 1, tol = Math.max(1, 0.012 * h), lo = Math.ceil(0.15 * N), hi = Math.floor(0.85 * N);
  let best = null;
  for (let i = lo; i < hi; i++) {
    if (!Number.isFinite(T[i])) continue;
    let mn = T[i], mx = T[i], j = i;
    while (j + 1 <= hi && Number.isFinite(T[j + 1]) && Math.max(mx, T[j + 1]) - Math.min(mn, T[j + 1]) <= tol) { j++; mn = Math.min(mn, T[j]); mx = Math.max(mx, T[j]); }
    const len = j - i + 1, mid = Math.abs((i + j) / 2 - N / 2);
    if (len >= Math.max(4, Math.round(0.06 * N)) && (!best || len > best.len || (len === best.len && mid < best.mid))) best = { i, j, len, mid };
  }
  return best ? [best.i / N, (best.j + 1) / N] : null;
}
/** The affine map [a, b, c, d, e, f] that sends art points p0, p1, p2 (u, v) to screen points q0, q1, q2. */
function _wexAffine(p0, p1, p2, q0, q1, q2) {
  // solve [a c e; b d f] * [u v 1]^T = [X Y]^T from three point pairs
  const u0 = p0[0], v0 = p0[1], u1 = p1[0], v1 = p1[1], u2 = p2[0], v2 = p2[1];
  const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
  if (Math.abs(det) < 1e-12) return null;
  const sol = (w0, w1, w2) => { const A = ((w1 - w0) * (v2 - v0) - (w2 - w0) * (v1 - v0)) / det, C = ((u1 - u0) * (w2 - w0) - (u2 - u0) * (w1 - w0)) / det; return [A, C, w0 - A * u0 - C * v0]; };
  const X = sol(q0[0], q1[0], q2[0]), Y = sol(q0[1], q1[1], q2[1]);
  return [X[0], Y[0], X[1], Y[1], X[2], Y[2]].map(v => _wexR(v, 5));
}
/**
 * The end face of a hull that has NO end art (a ferry with only a side view), built from its side art so it is never one flat slab: a
 * STEPPED silhouette, the hull across the full beam, the house narrower over it, the upper deck and the mast narrower still, each band the
 * colour of the largest shape of the side art at that height, and rows of windows when the art has lit glass. -> { bands: [{ t0, t1, u, hex }]
 * (t: the share of the height from the waterline, u: the inset each side as a share of the beam), rows: [{ t0, t1, u, hex }] }, or null.
 */
const _WEX_END_STEPS = Object.freeze([[0, 0.36, 0], [0.36, 0.64, 0.1], [0.64, 0.86, 0.22], [0.86, 1, 0.4]]);
function _wexEndBands(obj, v, season) {
  let sh = null;
  try { sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(obj, v | 0, season || 'summer') : null; } catch (e) { sh = null; }
  if (!sh || !Array.isArray(sh.box) || !sh.parts) return null;
  const b = sh.box, H = (b[3] - b[1]) || 1, zone = _WEX_END_STEPS.map(() => new Map());
  let glass = null;
  for (const part of Object.keys(sh.parts)) {
    if (/lit|shadow|reflect|smoke|wake|snow/.test(part)) continue;
    for (const s0 of sh.parts[part] || []) {
      if (!s0 || !s0.d || s0.m || typeof s0.f !== 'string' || s0.f[0] !== '#' || (s0.op != null && s0.op < 0.6)) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const pt = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
      _wexTrace({ moveTo: pt, lineTo: pt, quadraticCurveTo(a, c, x, y) { pt(x, y); }, bezierCurveTo(a, c, d, e, x, y) { pt(x, y); }, closePath() {} }, s0.d);
      if (!(x1 > x0) || !(y1 > y0)) continue;
      const t = (b[3] - (y0 + y1) / 2) / H, area = (x1 - x0) * (y1 - y0);
      if (s0.glow) { glass = glass || s0.f; continue; }
      if (t < 0 || t > 1.05) continue;
      const k = _WEX_END_STEPS.findIndex(st => t < st[1]), z = zone[k < 0 ? zone.length - 1 : k];
      z.set(s0.f, (z.get(s0.f) || 0) + area);
    }
  }
  const top = (m) => { let best = null, a = 0; for (const [k, v0] of m) if (v0 > a) { a = v0; best = k; } return best; };
  let prev = null;
  const hexes = zone.map(m => (prev = top(m) || prev));
  const first = hexes.find(h => h);
  if (!first) return null;
  const bands = _WEX_END_STEPS.map((st, i) => ({ t0: st[0], t1: st[1], u: st[2], hex: hexes[i] || first }));
  return { bands, rows: glass ? [{ t0: 0.42, t1: 0.5, u: 0.16, hex: glass }, { t0: 0.7, t1: 0.77, u: 0.28, hex: glass }] : [] };
}
/**
 * A long hull drawn in perspective (see the header). ent in camera metres: { id, obj, variant, x, z, y, facing | vx, vz, height }.
 * The side art is laid along the hull's real length: when the art is much shorter than the hull at its own proportions (a 9 m
 * picture of an 18 m narrowboat) its middle is repeated rather than stretched, so portholes keep their shape. The side is
 * cut into slices by depth (each slice spans at most 2 % of depth, or 10 units on screen), and each slice into two triangles,
 * each mapped exactly from the art (a triangle's affine map is exact at its corners): neighbouring slices share their edges,
 * so the hull's lines run straight and continuous into the distance with no steps.
 */
/* ---------- a narrowboat as a real 3D model (15 Oct; polished 16 Oct) ----------
   A side sprite and a back sprite glued onto a box broke at most angles (ends floating apart, sides squeezed into stripes).
   Canal boats are a small 3D model drawn from any angle, at the standard of the v2 hand-drawn boats:
   - true size (K8): the gunwale 0.5 m above the waterline, a 1.2 m cabin, the roof about 1.75 m and the chimney's hat about
     2.05 m above the water (16 Oct: it stood 2.52 m, a giant in every cell); the hull starts at the waterline (the part under
     the water is never drawn over it);
   - a hull with a rounded bow sweep and a rising sheer, a rounded counter stern, rubbing strakes, a rudder and a swan-neck
     tiller; a trad, semi-trad or cruiser stern (rails) by livery;
   - a cabin with tumblehome (its sides lean in), a cambered roof with handrails, coachlined panels, a name panel (shapes, no
     text), portholes or windows with curtains, a side hatch, stern and front doors and a sliding hatch;
   - a cratch board and its cover over the bow well;
   - roof clutter seeded per boat: chimney, mushroom vents, pole and plank, plant pots, coal bags, a solar panel, a bike, a
     roof box, logs;
   - mooring ropes from the stern and bow studs to pins on the bank (moored boats only; the bank side from o.regions, the
     entity's bankSide, else the side towards the eye);
   - lit windows at night (a seeded share of boats has someone aboard), with a soft glow (emissive: never graded);
   - a gentle bob on the water when the caller passes the time (o.t, seconds): heave, roll and pitch, seeded per boat.
   It is drawn in painter's groups valid from any angle: the hull (convex: its seen faces never overlap), the decks, the far
   end's gear, the cabin (convex) with its details, the roof and its clutter (before the cabin when the eye is below the roof),
   the near end's gear, and the ropes (first when the bank is on the far side). Colours come from the livery and a soft sky
   light; the material pass grades them by light like everything else, except lit windows. */
const WORLD_BOAT_LIVERIES = Object.freeze([
  { cabin: '#2f5e3e', panel: '#3b7350', trim: '#d9b44a', roof: '#6b5f52', door: '#9a2a24', name: '#e9dcb4', canvas: '#2f4a3a', curtain: '#b8433a', stern: 'trad', win: 'port' },
  { cabin: '#7a1f2b', panel: '#8e2a36', trim: '#e0c060', roof: '#4a4440', door: '#2f5e3e', name: '#f0e2b8', canvas: '#3b3b46', curtain: '#e8d9a8', stern: 'trad', win: 'port' },
  { cabin: '#22406b', panel: '#2d5385', trim: '#d9b44a', roof: '#8a8478', door: '#7a1f2b', name: '#e9dcb4', canvas: '#22314a', curtain: '#d9c47a', stern: 'cruiser', win: 'rect' },
  { cabin: '#2e2e33', panel: '#3b3b42', trim: '#c9a24a', roof: '#6a5a48', door: '#9a2a24', name: '#c9a24a', canvas: '#4a3a2a', curtain: '#8fb0c8', stern: 'semi', win: 'rect' },
  { cabin: '#5b2a4a', panel: '#6e3659', trim: '#e0c060', roof: '#4a4440', door: '#22406b', name: '#efe0b0', canvas: '#3a2a38', curtain: '#f2d27a', stern: 'trad', win: 'port' },
  { cabin: '#1f4f55', panel: '#2a6a70', trim: '#e8d39a', roof: '#c9c2b0', door: '#b5452c', name: '#e8d39a', canvas: '#1d3a3e', curtain: '#e8a0a0', stern: 'cruiser', win: 'rect' },
  { cabin: '#8a3b1e', panel: '#a24a26', trim: '#f0d080', roof: '#3e4a3a', door: '#2b4b2f', name: '#f3e6c0', canvas: '#4a3426', curtain: '#f4e9cf', stern: 'trad', win: 'port' },
  { cabin: '#3f5a2a', panel: '#d8cfa8', trim: '#7a1f2b', roof: '#5a5048', door: '#7a1f2b', name: '#7a1f2b', canvas: '#344a2a', curtain: '#c86848', stern: 'semi', win: 'port' },
  { cabin: '#14233f', panel: '#7a2232', trim: '#d9b44a', roof: '#4a4440', door: '#d9b44a', name: '#d9b44a', canvas: '#1c2a42', curtain: '#efe2c0', stern: 'trad', win: 'rect' },
  { cabin: '#6a6e72', panel: '#868b90', trim: '#26303a', roof: '#3b4046', door: '#c0392b', name: '#26303a', canvas: '#3b4046', curtain: '#f1c40f', stern: 'cruiser', win: 'rect' },
]);
/** The boat's true proportions in metres (K8: a narrowboat stands 1.7-2.1 m above the water to its chimney's hat). */
const WORLD_BOAT_DIMS = Object.freeze({ freeboard: 0.5, cabin: 1.2, camber: 0.06, chimney: 0.26, hat: 0.03, hatch: 0.08 });
function _wexShade(hex, k) {
  const n = parseInt(String(hex).slice(1), 16);
  if (!Number.isFinite(n) || String(hex).length !== 7) return hex;
  const c = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}
/** Newell's normal of a 3D polygon (unit). */
function _wexNewell(p) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
  const L = Math.hypot(nx, ny, nz) || 1;
  return [nx / L, ny / L, nz / L];
}
function _wexInPolyM(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / ((b[1] - a[1]) || 1e-12) + a[0]) c = !c; } return c; }
/** The soft sky light every boat face is shaded by (from above and the eye's left): 0.78 .. 1.08. */
const _wexLit = n => 0.78 + 0.3 * Math.max(0, -0.45 * n[0] + 0.8 * n[1] - 0.4 * n[2]);
function worldExtrudeBoatModel(ent, cam, o) {
  o = o || {};
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(ent.obj) : null;
  const L = info && info.size && info.size.w > 4 ? info.size.w : 18, B = info && info.size && info.size.d > 1 ? Math.min(info.size.d, 3.6) : 2.1;
  const y0 = _wexNum(ent.y) ? ent.y : 0, near = _wexNear(cam), D = WORLD_BOAT_DIMS;
  const yW = _wexNum(ent.waterline) ? Math.max(y0, ent.waterline) : y0;
  const sp = Math.hypot(ent.vx || 0, ent.vz || 0), moving = sp > 0.05;
  const fdeg = moving ? Math.atan2(ent.vx, ent.vz) * 180 / Math.PI : _wexNum(ent.facing) ? ent.facing : 90;
  const f = fdeg * Math.PI / 180, ax = Math.sin(f), az = Math.cos(f), rx = az, rz = -ax;
  const seed = _wexHash(String(ent.id != null ? ent.id : ent.obj + '@' + ent.x + ',' + ent.z) + '|' + (ent.variant | 0));
  const rnd = (() => { let a = seed || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  // the gentle bob (o.t seconds; none without a time, so a baked static never jitters)
  // (an agent's own animation clock when the caller gives none: a cruising boat is rebuilt every frame)
  const an = ent.anim, t = _wexNum(o.t) ? o.t : ent.static === false && an && _wexNum(an.t) ? an.t + (_wexNum(an.phase) ? an.phase * 5 : 0) : null;
  const ph = rnd() * Math.PI * 2, ph2 = rnd() * Math.PI * 2;
  const heave = t == null ? 0 : (moving ? 0.018 : 0.01) * Math.sin(t * 2 * Math.PI / 3.6 + ph);
  const roll = t == null ? 0 : (moving ? 0.01 : 0.006) * Math.sin(t * 2 * Math.PI / 4.7 + ph2);
  const pitch = t == null ? 0 : 0.0015 * Math.sin(t * 2 * Math.PI / 5.3 + ph * 0.6);
  const P = (a, lat, y) => [ent.x + ax * a + rx * lat, y + heave + lat * roll + a * pitch, ent.z + az * a + rz * lat];
  // the livery: the variant picks the family (0 green, 1 maroon, 2 blue, as the library art), the boat's own seed one of its
  // liveries, so a row of moored boats is never three copies (16 Oct: more liveries)
  const NL = WORLD_BOAT_LIVERIES.length, vb = Math.abs(ent.variant | 0) % 3, fam = [];
  for (let i = vb; i < NL; i += 3) fam.push(i);
  const livN = fam[(seed >>> 3) % fam.length], liv = WORLD_BOAT_LIVERIES[livN];
  const season = o.season || 'summer';
  // ---- proportions ----
  const hb = B / 2, s0 = -L / 2, bowA = L / 2, bowLen = Math.min(3.4, 0.2 * L), sternLen = Math.min(1.0, 0.07 * L);
  const Gm = yW + D.freeboard;
  const G = a => Gm + 0.3 * Math.pow(Math.max(0, (a - (bowA - 5)) / 5), 2) + 0.1 * Math.pow(Math.max(0, (s0 + 2 - a) / 2), 2);
  const half = a => {
    if (a > bowA - bowLen) { const u = (a - (bowA - bowLen)) / bowLen; return hb * (1 - Math.pow(Math.min(1, u), 1.9)); }
    if (a < s0 + sternLen) { const u = (s0 + sternLen - a) / sternLen; return hb * Math.sqrt(Math.max(0, 1 - u * u)); }
    return hb;
  };
  const stern = liv.stern, aCr = bowA - bowLen + 0.35, c1 = aCr - 1.5, c0 = s0 + (stern === 'cruiser' ? 2.3 : stern === 'semi' ? 1.7 : 1.15);
  const Gc = Gm, CT = Gm + D.cabin, wB = hb - 0.12, wT = wB - 0.09, ridge = CT + D.camber;
  const zMin = Math.max(near, Math.min(P(s0, 0, Gm)[2], P(bowA, 0, Gm)[2], P(0, hb, Gm)[2], P(0, -hb, Gm)[2]));
  const px = m => cam.f * m / zMin;   // metres to pixels at the boat's nearest point: the level of detail
  const fine = px(0.1) >= 1.5, finer = px(0.05) >= 1.5;   // 10 cm (5 cm) at least 1.5 px: else the small details drop
  // ---- the outline in plan, (a, lat): from the stern round the right side to the stem and back down the left ----
  const R = [];
  for (let k = 0; k <= 5; k++) { const th = k / 5 * Math.PI / 2; R.push([s0 + sternLen * (1 - Math.cos(th)), hb * Math.sin(th)]); }
  for (let a = s0 + sternLen + 2.5; a < bowA - bowLen - 0.3; a += 2.5) R.push([a, hb]);
  for (let k = 0; k <= 8; k++) { const a = bowA - bowLen + bowLen * k / 8; R.push([a, half(a)]); }
  const Ot = R.concat(R.slice(1, -1).reverse().map(([a, l]) => [a, -l]));
  // ---- face builders ----
  const groups = { hull: [], deck: [], aft: [], fore: [], cabin: [], roof: [], clutter: [], ropes: [] };
  const SEAL = new Set(['hull', 'cabin', 'roof', 'cover', 'gunwale', 'deck']);   // big panels made of pieces: sealed so no seam shows
  let cur = groups.hull;
  const centre = P(0, 0, (yW + Gm) / 2);
  const push = (fc) => { cur.push(fc); return fc; };
  const zOf = pts3 => pts3.reduce((s, p) => s + p[2], 0) / pts3.length;
  /** A face, culled by its outward normal (pointing away from `inside`; never culled when inside is null), shaded by the sky. */
  const face = (pts3, hex, mat, role, inside, extra) => {
    let n = null;
    if (inside !== null) {
      n = _wexNewell(pts3);
      const c = [0, 1, 2].map(i => pts3.reduce((s, p) => s + p[i], 0) / pts3.length), ref = inside || centre;
      if (n[0] * (c[0] - ref[0]) + n[1] * (c[1] - ref[1]) + n[2] * (c[2] - ref[2]) < 0) n = n.map(v => -v);
      if (!_wexSees(cam, n, c)) return null;
    }
    const pts = _wexProjPoly(cam, pts3);
    if (!pts) return null;
    return push(Object.assign({ pts, hex: n ? _wexShade(hex, _wexLit(n)) : hex, mat, role, z: _wexR(zOf(pts3), 3) }, SEAL.has(role) ? { seal: true } : null, extra || {}));
  };
  /** A line in 3D (a rope, a rail, a tiller): its width in metres, drawn at its own depth. */
  const line = (pts3, wM, hex, mat, role, extra) => {
    const q = pts3.filter(p => p[2] >= near);
    if (q.length < 2) return null;
    const z = zOf(q);
    return push(Object.assign({ line: true, pts: q.map(p => _wexP(cam, p[0], p[2], p[1]).map(v => _wexR(v, 2))), w: _wexR(Math.max(0.5, cam.f * wM / z), 2), hex, mat, role, z: _wexR(z, 3) }, extra || {}));
  };
  /** A disc facing the eye (a fender, a pot plant, a log end, a vent cap); k squashes it. */
  const disc = (c3, r, hex, mat, role, k, extra) => {
    if (c3[2] < near) return null;
    const q = _wexP(cam, c3[0], c3[2], c3[1]), rp = cam.f * r / c3[2], ry = rp * (k || 1), pts = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push([_wexR(q[0] + Math.cos(a) * rp, 2), _wexR(q[1] + Math.sin(a) * ry, 2)]); }
    return push(Object.assign({ pts, hex, mat, role, z: _wexR(c3[2], 3) }, extra || {}));
  };
  /** A box on the boat (a0..a1 along, l0..l1 across, ya..yb up): its seen sides, then its top. */
  const box = (a0, a1, l0, l1, ya, yb, hex, top, mat, role) => {
    const ins = P((a0 + a1) / 2, (l0 + l1) / 2, (ya + yb) / 2);
    face([P(a0, l0, ya), P(a1, l0, ya), P(a1, l0, yb), P(a0, l0, yb)], hex, mat, role, ins);
    face([P(a0, l1, ya), P(a1, l1, ya), P(a1, l1, yb), P(a0, l1, yb)], hex, mat, role, ins);
    face([P(a0, l0, ya), P(a0, l1, ya), P(a0, l1, yb), P(a0, l0, yb)], hex, mat, role, ins);
    face([P(a1, l0, ya), P(a1, l1, ya), P(a1, l1, yb), P(a1, l0, yb)], hex, mat, role, ins);
    face([P(a0, l0, yb), P(a1, l0, yb), P(a1, l1, yb), P(a0, l1, yb)], top || hex, mat, role, ins);
  };
  const dEye = p => Math.hypot(p[0], p[1] - cam.eye, p[2]);
  const sternNear = dEye(P(s0, 0, Gm)) < dEye(P(bowA, 0, Gm));
  const roofSeen = cam.eye > CT + heave;
  // ---- 1. the hull: its sides from the waterline to the sheer, all round the outline ----
  cur = groups.hull;
  const seen = [];
  for (let i = 0; i < Ot.length; i++) {
    const [a1, l1] = Ot[i], [a2, l2] = Ot[(i + 1) % Ot.length];
    if (face([P(a1, l1, yW), P(a2, l2, yW), P(a2, l2, G(a2)), P(a1, l1, G(a1))], '#1e1f21', 'paint', 'hull', centre)) seen.push([a1, l1, a2, l2]);
  }
  // rubbing strakes and the gunwale's edge on the seen sides (lines just proud of the hull)
  if (fine) for (const [a1, l1, a2, l2] of seen) {
    const k = 1.012;
    line([P(a1, l1 * k, G(a1) - 0.1), P(a2, l2 * k, G(a2) - 0.1)], 0.035, '#3a3b3e', 'paint', 'strake');
    line([P(a1, l1 * k, G(a1) - 0.27), P(a2, l2 * k, G(a2) - 0.27)], 0.03, '#323336', 'paint', 'strake');
    line([P(a1, l1 * k, G(a1) - 0.01), P(a2, l2 * k, G(a2) - 0.01)], 0.025, '#4a4b4e', 'paint', 'gunwale');
  }
  // ---- 2. the decks (seen from above): the gunwale top, the stern deck, the bow well and the foredeck ----
  cur = groups.deck;
  if (cam.eye > Gm + 0.05) {
    face(Ot.map(([a, l]) => P(a, l, G(a))), '#2a2b2e', 'paint', 'gunwale', null);
    const inset = (a0, a1, d, dy) => { const pts = []; for (const [a, l] of R) if (a >= a0 - 1e-6 && a <= a1 + 1e-6) pts.push([a, Math.max(0, l - d)]); pts.push([a1, Math.max(0, half(a1) - d)]); pts.unshift([a0, Math.max(0, half(a0) - d)]); return pts.map(([a, l]) => P(a, l, G(a) + dy)).concat(pts.slice().reverse().map(([a, l]) => P(a, -l, G(a) + dy))); };
    face(inset(s0, c0, 0.1, 0.005), '#6e604f', 'timber', 'deck', null);
    face(inset(c1, aCr, 0.14, -0.12), '#4a4038', 'timber', 'deck', null);
    face(inset(aCr, bowA, 0.1, 0.005), '#6e604f', 'timber', 'deck', null);
  }
  // ---- 3. the stern's gear: rudder, swan-neck tiller, stern fender, cruiser rails ----
  const aft = () => {
    face([P(s0 - 0.05, 0, yW), P(s0 - 0.62, 0, yW), P(s0 - 0.62, 0, Gm - 0.12), P(s0 - 0.05, 0, Gm - 0.02)], '#202123', 'metal', 'rudder', null);
    line([P(s0 - 0.08, 0, Gm - 0.05), P(s0 + 0.02, 0, G(s0) + 0.12)], 0.06, '#26272a', 'metal', 'rudder');
    // the swan neck rises from the rudder post and curves forward into the wooden tiller bar
    const tb = G(s0) + 0.1, neck = [[0.02, 0], [-0.02, 0.32], [0.05, 0.62], [0.2, 0.8], [0.38, 0.86]].map(([da, dy]) => P(s0 + da, 0, tb + dy));
    line(neck, 0.05, '#232325', 'metal', 'tiller');
    const barEnd = Math.min(s0 + 1.35, c0 - 0.2);
    line([P(s0 + 0.38, 0, tb + 0.86), P(barEnd, 0, tb + 0.9)], 0.045, '#9a6a3a', 'timber', 'tiller');
    if (finer) { disc(P(s0 + 0.24, 0, tb + 0.86), 0.035, '#d9b44a', 'metal', 'brass'); disc(P(barEnd, 0, tb + 0.9), 0.03, '#d9b44a', 'metal', 'brass'); }
    if (fine) disc(P(s0 - 0.04, 0, Gm - 0.18), 0.17, '#6e5636', 'fabric', 'fender', 0.75);
    if (stern === 'cruiser' || stern === 'semi') {
      // rails round the stern deck at hip height, on posts
      const yr = G(s0) + (stern === 'cruiser' ? 0.72 : 0.5), pts = [];
      for (const [a, l] of R) if (a <= c0 - 0.05) pts.push([a, l * 0.92]);
      const loop = pts.slice().reverse().map(([a, l]) => P(a, -l, yr)).concat(pts.map(([a, l]) => P(a, l, yr)));
      line(loop, 0.03, '#26272a', 'metal', 'rail');
      if (fine) pts.forEach(([a, l], i) => { if (i % 2 === 0 && l > 0.2) for (const sg of [-1, 1]) line([P(a, sg * l, G(a)), P(a, sg * l, yr)], 0.025, '#26272a', 'metal', 'rail'); });
    }
  };
  // ---- 4. the bow's gear: the cratch board and its cover over the well, the stem fender ----
  const fore = () => {
    const wC = Math.max(0.3, Math.min(wB - 0.04, half(aCr) - 0.06)), yb = G(aCr) + 0.04, apex = CT - 0.04;   // the cover narrows to the board
    const board = [P(aCr, -wC, yb), P(aCr, wC, yb), P(aCr, 0, apex)];
    const ins = P((c1 + aCr) / 2, 0, (Gc + CT) / 2);
    const drawBoard = () => {
      face(board, liv.cabin, 'paint', 'cratch', null);
      if (fine) {
        const c = P(aCr, 0, (yb * 2 + apex) / 3), m = (q, u) => c.map((v, i) => v + (q[i] - v) * u);
        face(board.map(p => m(p, 0.74)), liv.trim, 'paint', 'cratch', null);
        face(board.map(p => m(p, 0.64)), liv.panel, 'paint', 'cratch', null);
        const dm = (yb + apex) / 2 - 0.05, da = aCr + 0.012 * (_wexSees(cam, [ax, 0, az], c) ? 1 : -1);
        face([P(da, 0, dm - 0.14), P(da, 0.11, dm), P(da, 0, dm + 0.14), P(da, -0.11, dm)], liv.trim, 'paint', 'cratch', null);
      }
    };
    const bowSees = _wexSees(cam, [ax, 0, az], P(aCr, 0, (yb + apex) / 2));
    if (!bowSees) drawBoard();
    for (const sg of [-1, 1]) face([P(c1, sg * wB, Gc + 0.02), P(aCr, sg * wC, yb), P(aCr, 0, apex), P(c1, 0, CT + 0.01)], liv.canvas, 'fabric', 'cover', ins);
    if (bowSees) drawBoard();
    if (fine) { disc(P(bowA + 0.05, 0, G(bowA) - 0.22), 0.13, '#7a6040', 'fabric', 'fender', 1.1); disc(P(aCr + 0.5, 0, G(aCr + 0.5) + 0.12), 0.05, '#2a2a2c', 'metal', 'stud'); }
  };
  // ---- 5. the cabin: tumblehome sides with panels, windows, curtains, a side hatch and the name panel; doors at the ends ----
  const latAt = y => wB - (wB - wT) * (y - Gc) / (CT - Gc);
  const SP = (a, y, sg, off) => P(a, sg * (latAt(y) + (off || 0.006)), y);
  const LIT = { glass: '#ffd48a', curtain: '#f2b25e' };
  const aboard = rnd();   // a seeded share of boats has someone aboard: their windows light after dusk
  const glassFx = (dark) => ({ theta: _wexR(dark ? 2 : aboard, 3), lit: LIT.glass, halo: true });
  const cabin = () => {
    const ins = P((c0 + c1) / 2, 0, (Gc + CT) / 2), sides = [];
    for (const sg of [-1, 1]) if (face([P(c0, sg * wB, Gc), P(c1, sg * wB, Gc), P(c1, sg * wT, CT), P(c0, sg * wT, CT)], liv.cabin, 'paint', 'cabin', ins)) sides.push(sg);
    const rearSeen = !!face([P(c0, -wB, Gc), P(c0, wB, Gc), P(c0, wT, CT), P(c0, -wT, CT)], liv.cabin, 'paint', 'cabin', ins);
    const frontSeen = !!face([P(c1, -wB, Gc), P(c1, wB, Gc), P(c1, wT, CT), P(c1, -wT, CT)], liv.cabin, 'paint', 'cabin', ins);
    for (const sg of sides) {
      const kk = _wexLit([rx * sg, 0, rz * sg]), S = hex => _wexShade(hex, kk);
      const rect = (a0, a1, ya, yb, hex, mat, role, off, extra) => face([SP(a0, ya, sg, off), SP(a1, ya, sg, off), SP(a1, yb, sg, off), SP(a0, yb, sg, off)], hex, mat, role, null, extra);
      const ring = (ac, yc, r, hex, mat, role, off, extra, arc) => {
        const pts = [];
        if (arc) for (let k = 0; k <= 7; k++) { const th = arc[0] + (arc[1] - arc[0]) * k / 7; pts.push(SP(ac + Math.cos(th) * r, yc + Math.sin(th) * r, sg, off)); }
        else for (let k = 0; k < 12; k++) { const th = k / 12 * Math.PI * 2; pts.push(SP(ac + Math.cos(th) * r, yc + Math.sin(th) * r, sg, off)); }
        return face(pts, hex, mat, role, null, extra);
      };
      // the coachline frame and the panel
      const pa0 = c0 + 0.22, pa1 = c1 - 0.22, py0 = Gc + 0.18, py1 = CT - 0.2;
      if (fine) { rect(pa0, pa1, py0, py1, S(liv.trim), 'paint', 'trim', 0.006); rect(pa0 + 0.04, pa1 - 0.04, py0 + 0.03, py1 - 0.03, S(liv.panel), 'paint', 'panel', 0.008); }
      else rect(pa0, pa1, CT - 0.22, CT - 0.16, S(liv.trim), 'paint', 'trim', 0.006);
      // the name panel near the stern: a framed sign with ornaments (no text)
      const n0 = c0 + 0.5, n1 = n0 + Math.min(2.0, 0.24 * (c1 - c0)), ny0 = Gc + 0.38, ny1 = Gc + 0.84;
      if (fine) {
        rect(n0, n1, ny0, ny1, S(liv.trim), 'paint', 'name', 0.01);
        rect(n0 + 0.04, n1 - 0.04, ny0 + 0.04, ny1 - 0.04, S(liv.name), 'paint', 'name', 0.012);
        if (finer) {
          const ym = (ny0 + ny1) / 2;
          for (const ac of [n0 + 0.16, n1 - 0.16]) face([SP(ac - 0.07, ym, sg, 0.014), SP(ac, ym - 0.1, sg, 0.014), SP(ac + 0.07, ym, sg, 0.014), SP(ac, ym + 0.1, sg, 0.014)], S(liv.cabin), 'paint', 'name', null);
          rect(n0 + 0.3, n1 - 0.3, ym - 0.012, ym + 0.012, S(liv.cabin), 'paint', 'name', 0.014);
        }
      }
      // the side hatch (double doors with lights) amidships
      const hA = (c0 + c1) / 2 + 0.6;
      if (fine) {
        rect(hA - 0.38, hA + 0.38, Gc + 0.1, CT - 0.1, S(liv.door), 'paint', 'door', 0.012);
        rect(hA - 0.006, hA + 0.006, Gc + 0.1, CT - 0.1, S(_wexShade(liv.door, 0.7)), 'paint', 'door', 0.014);
        for (const d of [-0.19, 0.19]) { rect(hA + d - 0.1, hA + d + 0.1, CT - 0.5, CT - 0.25, S(liv.trim), 'paint', 'brass', 0.014); rect(hA + d - 0.075, hA + d + 0.075, CT - 0.475, CT - 0.275, '#8fa3ad', 'glass', 'window', 0.016, glassFx(false)); }
      }
      // windows: portholes or framed windows, curtains drawn half across
      const yc = Gc + 0.68, gaps = [[n0 - 0.3, n1 + 0.3], [hA - 0.75, hA + 0.75]], step = liv.win === 'port' ? 0.95 : 1.55;
      for (let a = n1 + 0.75; a < c1 - 0.45; a += step) {
        if (gaps.some(([g0, g1]) => a > g0 && a < g1)) continue;
        const fx = glassFx(rnd() < 0.18), cf = { theta: fx.theta, lit: LIT.curtain };
        if (liv.win === 'port') {
          ring(a, yc, 0.165, S('#c9a24a'), 'metal', 'brass', 0.01);
          ring(a, yc, 0.12, '#9fb3bd', 'glass', 'window', 0.012, fx);
          if (fine) {
            const cc = S(rnd() < 0.5 ? liv.curtain : _wexShade(liv.curtain, 0.85));
            ring(a, yc, 0.12, cc, 'fabric', 'curtain', 0.014, cf, [Math.PI * 0.7, Math.PI * 1.3]);
            ring(a, yc, 0.12, cc, 'fabric', 'curtain', 0.014, cf, [-Math.PI * 0.3, Math.PI * 0.3]);
          }
        } else {
          const w = 0.3, h = 0.2;
          rect(a - w - 0.03, a + w + 0.03, yc - h - 0.03, yc + h + 0.03, S(liv.trim), 'paint', 'frame', 0.01);
          rect(a - w, a + w, yc - h, yc + h, '#9fb3bd', 'glass', 'window', 0.012, fx);
          if (fine) {
            const cc = S(liv.curtain), open = 0.3 + 0.2 * rnd();
            rect(a - w, a - w + 2 * w * open / 2, yc - h, yc + h, cc, 'fabric', 'curtain', 0.014, cf);
            rect(a + w - 2 * w * open / 2, a + w, yc - h, yc + h, cc, 'fabric', 'curtain', 0.014, cf);
            rect(a - w, a + w, yc + h - 0.06, yc + h, S(_wexShade(liv.curtain, 0.85)), 'fabric', 'curtain', 0.015, cf);
          }
        }
      }
      // the roof's lip along the top of the side
      rect(c0, c1, CT - 0.05, CT, S(_wexShade(liv.roof, 0.8)), 'paint', 'lip', 0.01);
    }
    // the bulkheads: double doors with lights, a porthole each side
    for (const [aE, seenE, sgn] of [[c0, rearSeen, -1], [c1, frontSeen, 1]]) {
      if (!seenE || !fine) continue;
      const kk = _wexLit([ax * sgn, 0, az * sgn]), E = (l, y, d) => P(aE + sgn * d, l, y);
      const quad = (l0, l1, ya, yb, hex, mat, role, d, extra) => face([E(l0, ya, d), E(l1, ya, d), E(l1, yb, d), E(l0, yb, d)], hex, mat, role, null, extra);
      quad(-0.52, 0.52, Gc + 0.04, CT - 0.08, _wexShade(liv.trim, kk), 'paint', 'trim', 0.01);
      quad(-0.48, -0.02, Gc + 0.06, CT - 0.12, _wexShade(liv.door, kk), 'paint', 'door', 0.014);
      quad(0.02, 0.48, Gc + 0.06, CT - 0.12, _wexShade(liv.door, kk), 'paint', 'door', 0.014);
      for (const l of [-0.25, 0.25]) quad(l - 0.08, l + 0.08, CT - 0.5, CT - 0.24, '#8fa3ad', 'glass', 'window', 0.018, glassFx(false));
      for (const l of [-0.74, 0.74]) if (Math.abs(l) + 0.15 < wB) {
        const ring = [], pane = [];
        for (let k = 0; k < 12; k++) { const th = k / 12 * Math.PI * 2; ring.push(E(l + Math.cos(th) * 0.12, Gc + 0.68 + Math.sin(th) * 0.12, 0.014)); pane.push(E(l + Math.cos(th) * 0.085, Gc + 0.68 + Math.sin(th) * 0.085, 0.016)); }
        face(ring, _wexShade('#c9a24a', kk), 'metal', 'brass', null); face(pane, '#9fb3bd', 'glass', 'window', null, glassFx(false));
      }
    }
  };
  // ---- 6. the roof, its handrails and its clutter ----
  const roof = () => {
    if (!roofSeen) return;
    const lw = wT + 0.03, ins = P((c0 + c1) / 2, 0, CT - 0.4);
    for (const sg of [-1, 1]) face([P(c0, sg * lw, CT), P(c1, sg * lw, CT), P(c1, 0, ridge), P(c0, 0, ridge)], liv.roof, 'slate', 'roof', ins);
    if (fine) for (const sg of [-1, 1]) { const l = sg * (wT - 0.07), y = CT + 0.06; line([P(c0 + 0.15, l, y), P(c1 - 0.15, l, y)], 0.03, _wexShade(liv.roof, 0.7), 'metal', 'handrail'); }
  };
  const items = [];
  const yR = l => CT + D.camber * (1 - Math.min(1, Math.abs(l) / (wT + 0.03)));   // the roof's height across it
  const addItem = (a, fn) => items.push({ a, fn });
  // the chimney near the front, brass bands and a hat; the sliding hatch at the stern; mushroom vents
  const chA = c1 - 0.85, chL = 0.18, chTop = yR(chL) + D.chimney + D.hat;
  addItem(chA, () => {
    const w = 0.075, yb = yR(chL), yt = yb + D.chimney;
    box(chA - w, chA + w, chL - w, chL + w, yb, yt, '#161616', '#0c0c0c', 'metal', 'chimney');
    if (fine) for (const y of [yb + 0.07, yb + 0.17]) box(chA - w - 0.01, chA + w + 0.01, chL - w - 0.01, chL + w + 0.01, y, y + 0.025, '#c9a24a', null, 'metal', 'brass');
    box(chA - w - 0.03, chA + w + 0.03, chL - w - 0.03, chL + w + 0.03, yt, yt + D.hat, '#1c1c1c', null, 'metal', 'chimney');
  });
  addItem(c0 + 0.35, () => box(c0 - 0.02, c0 + 0.75, -0.36, 0.36, yR(0) - 0.01, yR(0) + D.hatch, _wexShade(liv.roof, 0.85), liv.door, 'paint', 'hatch'));
  if (fine) for (const a of [c0 + 2.2, (c0 + c1) / 2 + 1.8, c1 - 0.25]) if (a < c1 - 0.1 && Math.abs(a - chA) > 0.3) addItem(a, () => { box(a - 0.07, a + 0.07, -0.07, 0.07, yR(0), yR(0) + 0.06, '#c9a24a', null, 'metal', 'vent'); disc(P(a, 0, yR(0) + 0.075), 0.09, '#b8923e', 'metal', 'vent', 0.35); });
  // the pole and plank along one side of the roof
  const pS = rnd() < 0.5 ? -1 : 1;
  if (fine) addItem((c0 + c1) / 2, () => {
    const l = pS * (wT - 0.14), y = yR(l) + 0.02;
    box(c0 + 1.0, c0 + 1.0 + Math.min(4.0, (c1 - c0) * 0.55), l - 0.11, l + 0.11, y, y + 0.04, '#8a6a44', '#9a7a52', 'timber', 'plank');
    line([P(c0 + 0.8, l - pS * 0.16, y + 0.03), P(c0 + 0.8 + Math.min(4.6, (c1 - c0) * 0.65), l - pS * 0.16, y + 0.03)], 0.045, '#7a5a34', 'timber', 'pole');
  });
  // the seeded clutter, in slots down the middle of the roof (clear of the chimney)
  if (fine) {
    const kinds = ['pots', 'coal', 'solar', 'bike', 'box', 'logs', 'pots'], len = { pots: 0.9, coal: 1.0, solar: 1.1, bike: 1.8, box: 1.1, logs: 0.8 };
    const nItems = 3 + Math.floor(rnd() * 3), lc = -pS * 0.12;
    let a = c0 + 1.15;
    for (let i = 0; i < nItems; i++) {
      const kd = kinds[Math.floor(rnd() * kinds.length)];
      let a0 = a + 0.15 + rnd() * 0.4, a1 = a0 + len[kd];
      if (a1 > chA - 0.25 && a0 < chA + 0.25) { a0 = chA + 0.3; a1 = a0 + len[kd]; }
      if (a1 > c1 - 0.15) break;
      a = a1;
      const am = (a0 + a1) / 2, y = yR(lc), r2 = rnd(), r3 = rnd();
      if (kd === 'pots') addItem(am, () => {
        const nP = 2 + Math.floor(r2 * 3), green = season === 'winter' ? '#4a5a3a' : season === 'autumn' ? '#6a7038' : '#4f7a3a';
        for (let k = 0; k < nP; k++) {
          const pa = a0 + (k + 0.5) * (a1 - a0) / nP, pl = lc + ((k * 0.37 + r3) % 1 - 0.5) * 0.25, hex = ['#b5653a', '#2f5e3e', '#7a1f2b', '#c9a24a'][(k + Math.floor(r3 * 4)) % 4];
          box(pa - 0.11, pa + 0.11, pl - 0.11, pl + 0.11, y, y + 0.2, hex, _wexShade(hex, 0.7), 'paint', 'pot');
          disc(P(pa, pl, y + 0.3), 0.15, green, 'flower', 'plant', 0.8);
          if (season !== 'winter' && finer) { disc(P(pa + 0.05, pl, y + 0.36), 0.04, ['#e04a5a', '#f2c94c', '#f7f2e8', '#c45ab0'][(k + Math.floor(r2 * 4)) % 4], 'flower', 'flower'); disc(P(pa - 0.06, pl, y + 0.33), 0.035, '#f2c94c', 'flower', 'flower'); }
        }
      });
      else if (kd === 'coal') addItem(am, () => {
        const nB = 2 + Math.floor(r2 * 2), hex = r3 < 0.5 ? '#e6e4dc' : '#3b5f8c';
        for (let k = 0; k < nB; k++) { const ba = a0 + k * (a1 - a0) / nB + 0.04; box(ba, ba + (a1 - a0) / nB - 0.06, lc - 0.24, lc + 0.24, y, y + 0.16, hex, _wexShade(hex, 1.05), 'fabric', 'coal'); }
      });
      else if (kd === 'solar') addItem(am, () => {
        const l0 = lc - 0.36, l1 = lc + 0.36;
        face([P(a0, l0, y + 0.06), P(a1, l0, y + 0.06), P(a1, l1, y + 0.17), P(a0, l1, y + 0.17)], '#1d2a44', 'glass', 'solar', null);
        if (finer) { line([P(a0, l0, y + 0.065), P(a1, l0, y + 0.065), P(a1, l1, y + 0.175), P(a0, l1, y + 0.175), P(a0, l0, y + 0.065)], 0.02, '#b8bcc0', 'metal', 'solar'); line([P(am, l0, y + 0.065), P(am, l1, y + 0.175)], 0.012, '#5a6a8a', 'metal', 'solar'); }
      });
      else if (kd === 'bike') addItem(am, () => {
        const hex = ['#c0392b', '#2c6fbb', '#2e8b57', '#d4a017', '#222222'][Math.floor(r2 * 5)], yb = y + 0.04, r = 0.32;
        const wheel = ac => { const pts = []; for (let k = 0; k <= 14; k++) { const th = k / 14 * Math.PI * 2; pts.push(P(ac + Math.cos(th) * r, lc + Math.sin(th) * r * 0.9, yb)); } line(pts, 0.03, '#1a1a1a', 'metal', 'bike'); };
        wheel(a0 + r); wheel(a1 - r);
        line([P(a0 + r, lc, yb + 0.02), P(am, lc + 0.05, yb + 0.03), P(a1 - r, lc, yb + 0.02), P(am + 0.1, lc - 0.25, yb + 0.04), P(am, lc + 0.05, yb + 0.03)], 0.035, hex, 'metal', 'bike');
      });
      else if (kd === 'box') addItem(am, () => box(a0, a1, lc - 0.28, lc + 0.28, y, y + 0.34, '#7a5a3c', '#6a4a2e', 'timber', 'box'));
      else if (kd === 'logs') addItem(am, () => {
        box(a0, a1, lc - 0.22, lc + 0.22, y, y + 0.22, '#5e432a', '#6e5236', 'timber', 'logs');
        if (finer) for (let k = 0; k < 5; k++) disc(P(sternNear ? a0 - 0.005 : a1 + 0.005, lc - 0.14 + (k % 3) * 0.14, y + 0.06 + Math.floor(k / 3) * 0.11), 0.055, '#c8a070', 'timber', 'log');
      });
    }
  }
  const clutter = () => { for (const it of items.slice().sort((p, q) => dEye(P(q.a, 0, CT)) - dEye(P(p.a, 0, CT)))) it.fn(); };   // far to near
  // ---- 7. the mooring ropes (moored boats only): from the stern and bow studs to pins on the bank ----
  let bank = 0, bankD = 0.75;   // the bank's side (+1 right, -1 left) and how far beyond the hull its land starts
  if (!moving && ent.static !== false && !ent.underway) {
    if (ent.bankSide === 1 || ent.bankSide === -1) bank = ent.bankSide;
    else {
      const regs = Array.isArray(o.regions) ? o.regions.filter(r => r && Array.isArray(r.polyM) && r.polyM.length >= 3) : [];
      if (regs.length) {
        // the nearest land beside the hull on each side (probes at 0.3-2.4 m out, at the middle and both quarters)
        const landAt = sg => { for (const d of [0.3, 0.6, 1.0, 1.5, 2.4]) { if ([-L / 4, 0, L / 4].some(a => { const p = P(a, sg * (hb + d), 0); return !regs.some(r => _wexInPolyM(r.polyM, p[0], p[2])); })) return d; } return Infinity; };
        const dr = landAt(1), dl = landAt(-1);
        bank = dr === Infinity && dl === Infinity ? 0 : dr <= dl ? 1 : -1;
        if (bank) bankD = Math.min(dr, dl);
      }   // no water outline and no bankSide: no ropes (a rope into open water is worse than none)
    }
  }
  const bankFacesEye = bank !== 0 && _wexSees(cam, [rx * bank, 0, rz * bank], P(0, bank * hb, Gm));
  const ropes = () => {
    if (!bank || !fine) return;
    const rope = (from, aTo) => {
      const at = P(aTo, bank * (hb + bankD + 0.6), 0), gy = _wexG(cam, at[0], at[2]);
      const end = [at[0], gy + 0.22, at[2]], pts = [];
      for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([from[0] + (end[0] - from[0]) * u, from[1] + (end[1] - from[1]) * u - 0.2 * 4 * u * (1 - u), from[2] + (end[2] - from[2]) * u]); }
      line(pts, 0.022, '#d6c7a0', 'fabric', 'rope');
      line([[end[0], gy, end[2]], [end[0], gy + 0.28, end[2]]], 0.035, '#3a3a3c', 'metal', 'pin');
    };
    rope(P(s0 + 0.35, bank * (hb - 0.12), G(s0 + 0.35) + 0.06), s0 - 1.1);
    rope(P(aCr + 0.5, 0, G(aCr + 0.5) + 0.14), bowA + 1.2);
  };
  // ---- the painter's order for this view ----
  cur = groups.aft; aft();
  cur = groups.fore; fore();
  cur = groups.cabin; cabin();
  cur = groups.roof; roof();
  cur = groups.clutter; clutter();
  cur = groups.ropes; ropes();
  const nearEnd = sternNear ? groups.aft : groups.fore, farEnd = sternNear ? groups.fore : groups.aft;
  const rudderFar = sternNear ? [] : groups.aft.filter(fc => fc.role === 'rudder');   // behind the counter: under the hull
  const top = roofSeen ? [...groups.cabin, ...groups.roof, ...groups.clutter] : [...groups.clutter, ...groups.cabin];
  const faces = [...(bankFacesEye ? [] : groups.ropes), ...rudderFar, ...groups.hull, ...groups.deck, ...farEnd.filter(fc => !rudderFar.includes(fc)), ...top, ...nearEnd, ...(bankFacesEye ? groups.ropes : [])]
    .filter(fc => fc && fc.pts && fc.pts.length >= 2);
  if (!faces.some(fc => !fc.line)) return null;
  let bx = null;
  for (const fc of faces) bx = _wexBox(fc.pts, bx);
  const foot = [[-L / 2, -hb], [L / 2, -hb], [L / 2, hb], [-L / 2, hb]].map(([a, l]) => { const p = P(a, l, 0); return [_wexR(p[0], 3), _wexR(p[2], 3)]; });
  // the end the eye sees (bow or stern), for callers that ask which end shows
  const sternSeen = _wexSees(cam, [-ax, 0, -az], P(s0, 0, yW + 0.3)), bowSeen = _wexSees(cam, [ax, 0, az], P(bowA, 0, yW + 0.3));
  const which = sternSeen && bowSeen ? (sternNear ? 'stern' : 'bow') : sternSeen ? 'stern' : bowSeen ? 'bow' : null;
  const end = which ? { which, quad: (faces.find(fc => fc.role === 'hull') || faces[0]).pts, z: _wexR(Math.min(...faces.map(fc => fc.z)), 3) } : null;
  return { end, strips: [], side: 1, id: ent.id != null ? ent.id : null, kind: 'hull', model: true, noCut: true, ent: ent.id != null ? ent.id : null, obj: ent.obj, variant: ent.variant == null ? null : ent.variant,
    faces, foot, zKey: _wexR(Math.min(...foot.map(p => p[1])), 3), height: _wexR(chTop - yW, 3), roofH: _wexR(ridge - yW, 3), waterline: _wexR(yW, 3), livery: livN, stern, bank,
    windows: faces.filter(fc => fc.role === 'window').length, box: bx.map(v => _wexR(v, 1)), solidity: 'solid', art: { box: [0, 0, 1, 1], size: [1, 1], repeat: 0 } };
}
function worldExtrudeHull(ent, cam, o) {
  o = o || {};
  if (!ent || !cam || !_wexNum(cam.f) || typeof ent.obj !== 'string') return null;
  if (/narrowboat|widebeam|boat\.canal/.test(ent.obj)) { const m = worldExtrudeBoatModel(ent, cam, o); if (m) return m; }
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(ent.obj) : null;
  if (!info || !info.size) return null;
  const L = info.size.w, B = Math.max(0.3, info.size.d), h = _wexNum(ent.height) && ent.height > 0 ? ent.height : info.size.h, y0 = _wexNum(ent.y) ? ent.y : 0;
  const sp = Math.hypot(ent.vx || 0, ent.vz || 0), fdeg = sp > 0.05 ? Math.atan2(ent.vx, ent.vz) * 180 / Math.PI : _wexNum(ent.facing) ? ent.facing : 90;
  const f = fdeg * Math.PI / 180, ax = Math.sin(f), az = Math.cos(f), rx = az, rz = -ax;   // the bow's direction and its right
  const near = _wexNear(cam), season = o.season || 'summer';
  const P = (a, lat, y) => [ent.x + ax * a + rx * lat, y, ent.z + az * a + rz * lat];
  const Q = (p) => _wexP(cam, p[0], p[2], p[1]);
  const foot = [[-L / 2, -B / 2], [L / 2, -B / 2], [L / 2, B / 2], [-L / 2, B / 2]].map(([a, l]) => { const p = P(a, l, 0); return [_wexR(p[0], 3), _wexR(p[2], 3)]; });
  if (Math.max(...foot.map(p => p[1])) < near) return null;
  const art = _wexArt(ent.obj, ent.variant, season);
  if (!art) return null;
  const [bxa, by0, bxb, by1raw] = art.box, kv = h / art.size[1];   // metres per art unit (the host's scale), for lengths
  // the side art's hull runs between its first and last columns that rise to at least 40 % of its height: open decks, tillers
  // and fenders beyond them are not the hull's ends, so the end faces meet the side where the hull really starts (15 Oct)
  let bx0 = bxa, bx1 = bxb;
  { const pf = typeof _wexProfile === 'function' ? _wexProfile(ent.obj, ent.variant, season) : null;
    if (pf && pf.tops) { const lim = by0 * 0.4, ok = pf.tops.map(t => Number.isFinite(t) && t <= lim), i0 = ok.indexOf(true), i1 = ok.lastIndexOf(true), w = pf.box[2] - pf.box[0];
      if (i0 >= 0 && i1 > i0 + 8) { bx0 = pf.box[0] + w * i0 / pf.N; bx1 = pf.box[0] + w * (i1 + 1) / pf.N; } } }
  // the side and the end share ONE vertical frame: the art from its top down to the waterline (anything the art draws below
  // its foot is clipped) spans exactly y0 .. y0 + h, so the end face and the side meet edge to edge (15 Oct: they drew about
  // 20 px apart and the side's hull fell under the waterline cut)
  const by1 = Math.min(by1raw, 0), kvy = h / Math.max(1e-6, by1 - by0);
  const toY = v => y0 - v * kvy;
  const tri = (pa, pb, pc, qa, qb, qc) => { const m = _wexAffine(pa, pb, pc, qa, qb, qc); return m ? { m, pts: [qa, qb, qc].map(q => q.map(v => _wexR(v, 2))), art: [pa, pb, pc] } : null; };
  // the art along the hull: pieces [art u0, u1] -> [hull a0, a1]; the middle repeats when the art is short for the hull
  const natural = (bx1 - bx0) * kv, segs = [], cuts = L / natural > 1.25 ? _wexRepeatCuts(ent.obj, ent.variant, season) : null;
  if (cuts) {
    // the stern and bow ends at their own proportions; the middle (cut where its roof line matches) repeats to fill the length
    const mid0 = bx0 + (bx1 - bx0) * cuts[0], mid1 = bx0 + (bx1 - bx0) * cuts[1], e0 = (mid0 - bx0) * kv, e1 = (bx1 - mid1) * kv;
    const reps = Math.max(1, Math.round((L - e0 - e1) / ((mid1 - mid0) * kv))), midLen = (L - e0 - e1) / reps;
    segs.push({ u0: bx0, u1: mid0, a0: -L / 2, a1: -L / 2 + e0 });
    for (let k = 0; k < reps; k++) segs.push({ u0: mid0, u1: mid1, a0: -L / 2 + e0 + k * midLen, a1: -L / 2 + e0 + (k + 1) * midLen });
    segs.push({ u0: mid1, u1: bx1, a0: L / 2 - e1, a1: L / 2 });
  } else segs.push({ u0: bx0, u1: bx1, a0: -L / 2, a1: L / 2 });
  // the side that faces the eye
  const sideSeen = lat => _wexSees(cam, [rx * Math.sign(lat), 0, rz * Math.sign(lat)], P(0, lat, y0 + h / 2));
  const sg = sideSeen(B / 2) ? 1 : sideSeen(-B / 2) ? -1 : 0;
  const strips = [];
  let box = null;
  if (sg) {
    const lat = sg * B / 2;
    let budget = 120;
    for (const S of segs) {
      const pa = P(S.a0, lat, y0), pb = P(S.a1, lat, y0);
      if (pa[2] < near && pb[2] < near) continue;
      const za = Math.max(near, pa[2]), zb = Math.max(near, pb[2]), qa = Q([pa[0], pa[1], za]), qb = Q([pb[0], pb[1], zb]);
      const n = _wexClamp(Math.ceil(Math.max(Math.hypot(qb[0] - qa[0], qb[1] - qa[1]) / 10, Math.abs(Math.log(zb / za)) / 0.02)), 1, Math.max(1, Math.min(64, budget)));
      budget -= n;
      for (let j = 0; j < n; j++) {
        const t0 = j / n, t1 = (j + 1) / n, u0 = S.u0 + (S.u1 - S.u0) * t0, u1 = S.u0 + (S.u1 - S.u0) * t1, a0 = S.a0 + (S.a1 - S.a0) * t0, a1 = S.a0 + (S.a1 - S.a0) * t1;
        const p00 = P(a0, lat, toY(by1)), p10 = P(a1, lat, toY(by1)), p01 = P(a0, lat, toY(by0)), p11 = P(a1, lat, toY(by0));
        if (p00[2] < near || p10[2] < near) continue;
        const q00 = Q(p00), q10 = Q(p10), q01 = Q(p01), q11 = Q(p11);
        const A = tri([u0, by1], [u1, by1], [u0, by0], q00, q10, q01), C = tri([u1, by1], [u1, by0], [u0, by0], q10, q11, q01);
        if (!A || !C) continue;
        strips.push({ u0: _wexR(u0, 3), u1: _wexR(u1, 3), a0: _wexR(a0, 3), a1: _wexR(a1, 3), m: A.m, tris: [A, C], quad: [q00, q10, q11, q01].map(q => q.map(v => _wexR(v, 2))), z: _wexR((p00[2] + p10[2]) / 2, 3) });
        box = _wexBox([q00, q10, q11, q01], box);
      }
    }
  }
  // the end the eye sees: the bow (front view art) or the stern (back view art), mapped onto the end face
  let end = null;
  const views = typeof sceneObjViews === 'function' ? (sceneObjViews(ent.obj) || {}) : {};
  // the side's drawn span along the hull: an end face is drawn only where the side reaches it (15 Oct: a stern face near the
  // lens floated apart from its side, whose nearest strips were dropped inside the near plane)
  const drawnA0 = strips.length ? Math.min(...strips.map(t => t.a0)) : null, drawnA1 = strips.length ? Math.max(...strips.map(t => t.a1)) : null;
  for (const [which, aEnd, sgn] of [['bow', L / 2, 1], ['stern', -L / 2, -1]]) {
    if (sg && strips.length && (which === 'bow' ? drawnA1 < aEnd - 0.5 : drawnA0 > aEnd + 0.5)) continue;
    const c = P(aEnd, 0, y0 + h / 2);
    if (!_wexSees(cam, [ax * sgn, 0, az * sgn], c)) continue;
    const corners = [P(aEnd, -B / 2, y0), P(aEnd, B / 2, y0), P(aEnd, B / 2, y0 + h), P(aEnd, -B / 2, y0 + h)];
    if (corners.some(p => p[2] < near)) break;
    const quad = corners.map(p => Q(p).map(v => _wexR(v, 2)));
    const eObj = which === 'bow' ? (views.front || null) : (views.back || views.rear || null), eArt = eObj ? _wexArt(eObj, ent.variant, season) : null;
    let tris = null, m = null;
    if (eArt) {
      let [ex0, ey0, ex1, ey1raw] = eArt.box;
      const ey1 = Math.min(ey1raw, 0), ek = h / Math.max(1e-6, ey1 - ey0);   // the same frame as the side
      // the end's solid width (columns rising to 40 % of its height) spans the full beam, like the side's hull (15 Oct)
      { const pf = typeof _wexProfile === 'function' ? _wexProfile(eObj, ent.variant, season) : null;
        if (pf && pf.tops) { const lim = ey0 * 0.4, ok = pf.tops.map(t => Number.isFinite(t) && t <= lim), i0 = ok.indexOf(true), i1 = ok.lastIndexOf(true), w = pf.box[2] - pf.box[0];
          if (i0 >= 0 && i1 > i0 + 8) { ex0 = pf.box[0] + w * i0 / pf.N; ex1 = pf.box[0] + w * (i1 + 1) / pf.N; } } }
      // facing the bow the viewer's right is the boat's left; facing the stern it is the boat's right
      const latOf = u => (which === 'bow' ? -1 : 1) * ((u - (ex0 + ex1) / 2) / (ex1 - ex0)) * B;
      const E = (u, v) => Q(P(aEnd, latOf(u), y0 - v * ek));
      const A = tri([ex0, ey1], [ex1, ey1], [ex0, ey0], E(ex0, ey1), E(ex1, ey1), E(ex0, ey0)), C = tri([ex1, ey1], [ex1, ey0], [ex0, ey0], E(ex1, ey1), E(ex1, ey0), E(ex0, ey0));
      if (A && C) { tris = [A, C]; m = A.m; }
    }
    end = { which, obj: eObj && tris ? eObj : null, m, tris, quad, z: _wexR(c[2], 3), hex: '#2a2e30' };
    if (!end.obj) end.face = _wexEndBands(ent.obj, ent.variant, season);   // no end art: hull and house bands from the side art, never a flat dark slab
    box = _wexBox(quad, box);
    break;
  }
  // the roof, when the eye is above it (drawn before the side and the end: it lies behind them)
  let roof = null;
  if (cam.eye > y0 + h) {
    const r3 = [P(-L / 2 + 0.06 * L, -0.42 * B, y0 + h), P(L / 2 - 0.1 * L, -0.42 * B, y0 + h), P(L / 2 - 0.1 * L, 0.42 * B, y0 + h), P(-L / 2 + 0.06 * L, 0.42 * B, y0 + h)];
    const pts = _wexProjPoly(cam, r3);
    if (pts) { roof = { pts, hex: _wexMat(o, 'paint', '#4a4440', ent.z, 'roof') }; box = _wexBox(pts, box); }
  }
  if (!box) return null;
  return { id: ent.id != null ? ent.id : null, kind: 'hull', ent: ent.id != null ? ent.id : null, obj: ent.obj, variant: ent.variant == null ? null : ent.variant, side: sg,
    strips, end, roof, foot, zKey: _wexR(Math.min(...foot.map(p => p[1])), 3), height: h, box: box.map(v => _wexR(v, 1)), solidity: 'solid',
    art: { box: art.box, size: art.size, repeat: segs.length > 1 ? segs.length - 2 : 0 } };
}

/* ---------- the extruder over a world ---------- */
/** Every primitive of a world, far to near (see the header). */
function worldExtrude(world, cam, o) {
  o = o || {};
  cam = cam || (world && world.cam);
  if (!world || !cam || !_wexNum(cam.f)) return [];
  const prims = [];
  if (o.drystone === undefined && typeof worldDrystoneIs === 'function') o = Object.assign({}, o, { drystone: worldDrystoneIs(world) });
  for (const L of Array.isArray(world.lines) ? world.lines : []) { try { prims.push(...worldExtrudeLine(L, cam, o)); } catch (e) { /* one bad line never stops the rest (G8) */ } }
  for (const b0 of Array.isArray(world.buildings) ? world.buildings : []) {
    let parts = [b0];
    try { parts = worldBuildingParts(b0, world, cam); } catch (e) { parts = [b0]; }
    for (const b of parts) { try { const p = worldExtrudeBuilding(b, cam, o); if (p) prims.push(p); } catch (e) { /* G8 */ } }
  }
  if (o.hulls !== false) for (const e of Array.isArray(world.entities) ? world.entities : []) {
    if (!e || e.static === false || typeof e.obj !== 'string' || e.landmark) continue;
    let v = null;
    if (typeof worldViewOf === 'function') { try { v = worldViewOf(e, cam); } catch (err) { v = null; } }
    if (!v || !v.persp) continue;
    try { const p = worldExtrudeHull(e, cam, o); if (p) prims.push(p); } catch (err) { /* G8 */ }
  }
  return prims.sort((a, b) => b.zKey - a.zKey || String(a.id).localeCompare(String(b.id)));
}

/* ---------- drawing ---------- */
/** A path string of the v2 generator (M, L, H, V, Q, C, Z; absolute or relative) traced onto a context. */
function _wexTrace(ctx, d) {
  const t = String(d).match(/[MLHVQCZmlhvqcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0, x = 0, y = 0, sx = 0, sy = 0, cmd = 'M';
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { ctx.closePath(); x = sx; y = sy; if (i < t.length && !/[A-Za-z]/.test(t[i])) i++; continue; }
    if (C === 'M' || C === 'L') { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } if (C === 'M') { ctx.moveTo(nx, ny); sx = nx; sy = ny; cmd = rel ? 'l' : 'L'; } else ctx.lineTo(nx, ny); x = nx; y = ny; }
    else if (C === 'H') { let nx = num(); if (rel) nx += x; ctx.lineTo(nx, y); x = nx; }
    else if (C === 'V') { let ny = num(); if (rel) ny += y; ctx.lineTo(x, ny); y = ny; }
    else if (C === 'Q') { let a = num(), b = num(), c = num(), e = num(); if (rel) { a += x; b += y; c += x; e += y; } ctx.quadraticCurveTo(a, b, c, e); x = c; y = e; }
    else if (C === 'C') { let a = num(), b = num(), c = num(), e = num(), g = num(), k = num(); if (rel) { a += x; b += y; c += x; e += y; g += x; k += y; } ctx.bezierCurveTo(a, b, c, e, g, k); x = g; y = k; }
    else i++;
  }
}
function _wexFillPts(ctx, pts, hex, alpha) {
  if (!pts || pts.length < 3) return 0;
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = hex;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
  return 1;
}
/** Draw one prim (see the header). Returns the number of draw calls. */
function worldExtrudeDraw(ctx, prim, o) {
  o = o || {};
  if (!ctx || !prim) return 0;
  const vs = _wexNum(o.vs) ? o.vs : 1, ox = _wexNum(o.ox) ? o.ox : 0, oy = _wexNum(o.oy) ? o.oy : 0, A = _wexNum(o.alpha) ? o.alpha : 1;
  const colour = (mat, hex, z, role) => {
    if (typeof o.colour === 'function') { try { const c = o.colour(mat, hex, { z, role }); if (typeof c === 'string') return c; } catch (e) { /* base */ } }
    else if (typeof worldMaterialColour === 'function' && o.mctx) { try { const c = worldMaterialColour(mat, hex, Object.assign({}, o.mctx, { z })); if (typeof c === 'string') return c; } catch (e) { /* base */ } }
    return hex;
  };
  let n = 0;
  ctx.save();
  ctx.setTransform(vs, 0, 0, vs, ox, oy);
  try {
    if (prim.model) {
      // a boat model: faces, lines (ropes, rails, tiller) and, after dusk, lit windows (emissive: never graded) with a glow
      const night = !!o.night, share = _wexNum(o.windowShare) ? _wexClamp(o.windowShare, 0.45, 0.9) : 0.7;
      // the warm glow round a lit window, drawn right after it (so whatever lies nearer, a cratch cover, still hides it)
      const glow = (f) => {
        const b = _wexBox(f.pts), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, r = Math.max(1.5, 1.6 * Math.max(b[2] - b[0], b[3] - b[1]));
        ctx.globalAlpha = 0.28 * A;
        if (typeof ctx.createRadialGradient === 'function') {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, 'rgba(255,200,120,0.9)'); g.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = g;
        } else ctx.fillStyle = '#ffc878';
        ctx.beginPath(); ctx.moveTo(cx + r, cy);
        for (let k = 1; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
        return 1;
      };
      for (const f of prim.faces || []) {
        const on = night && _wexNum(f.theta) && f.theta < share && f.lit;
        if (f.line) {
          if (!f.pts || f.pts.length < 2) continue;
          ctx.globalAlpha = A; ctx.strokeStyle = colour(f.mat, f.hex, f.z, f.role); ctx.lineWidth = f.w || 1;
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(f.pts[0][0], f.pts[0][1]); for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]); ctx.stroke(); n++;
        } else if (on) {
          n += _wexFillPts(ctx, f.pts, f.lit, A);
          if (f.halo) n += glow(f);
        } else {
          const c = colour(f.mat, f.hex, f.z, f.role);
          n += _wexFillPts(ctx, f.pts, c, (f.alpha == null ? 1 : f.alpha) * A);
          // neighbouring pieces of one panel share their edges: a hairline of the same colour hides the anti-aliased seam
          if (f.seal) { ctx.strokeStyle = c; ctx.lineWidth = 0.7 / Math.max(0.25, vs); ctx.lineJoin = 'round'; ctx.stroke(); }
        }
      }
    } else if (prim.kind === 'line' || (prim.kind === 'building' && prim.fallback)) {
      for (const f of prim.faces || []) n += _wexFillPts(ctx, f.pts, colour(f.mat, f.hex, f.z, f.role), (f.alpha == null ? 1 : f.alpha) * A);
      for (const d of prim.details || []) {
        if (d.type === 'fill') n += _wexFillPts(ctx, d.pts, colour(prim.mat, d.hex, prim.zKey, 'detail'), (d.alpha == null ? 1 : d.alpha) * A);
        else if (d.type === 'stroke' && d.pts.length >= 2) {
          ctx.globalAlpha = (d.alpha == null ? 1 : d.alpha) * A; ctx.strokeStyle = colour(prim.mat, d.hex, prim.zKey, 'detail'); ctx.lineWidth = d.width || 1;
          ctx.beginPath(); ctx.moveTo(d.pts[0][0], d.pts[0][1]); for (let i = 1; i < d.pts.length; i++) ctx.lineTo(d.pts[i][0], d.pts[i][1]); ctx.stroke(); n++;
        }
      }
    } else if (prim.kind === 'building' && prim.direct) {
      const D = prim.direct, night = !!o.night, share = _wexNum(o.windowShare) ? o.windowShare : 0;
      const nightCol = (typeof SCENE_GEN_NIGHT === 'object' && SCENE_GEN_NIGHT) || {};
      for (const sh of D.shapes || []) {
        if (!sh || !sh.d) continue;
        const lit = night && sh.glow && (sh.theta == null || sh.theta < share);
        ctx.globalAlpha = (sh.op == null ? 1 : sh.op) * A;
        ctx.fillStyle = lit ? (nightCol[sh.glow] || '#ffd98a') : colour(sh.part === 'roof' ? 'slate' : 'brick', o.sun && sh.n && typeof worldSunTone === 'function' && typeof sh.f === 'string' ? worldSunTone(sh.f, sh.n, o.sun) : sh.f, prim.zKey, sh.part || 'wall');
        if (typeof Path2D === 'function') ctx.fill(new Path2D(sh.d)); else { ctx.beginPath(); _wexTrace(ctx, sh.d); ctx.fill(); }
        n++;
      }
      if (night) for (const sh of D.lit || []) { ctx.globalAlpha = (sh.op == null ? 1 : sh.op) * A; ctx.fillStyle = sh.f; if (typeof Path2D === 'function') ctx.fill(new Path2D(sh.d)); else { ctx.beginPath(); _wexTrace(ctx, sh.d); ctx.fill(); } n++; }
    } else if (prim.kind === 'hull') {
      const spriteOf = (obj) => {
        if (typeof o.sprite !== 'function') return null;
        try { const s = o.sprite({ o: obj, v: prim.variant == null ? 0 : prim.variant, part: '*', season: o.season || 'summer', haze: o.haze || 0, tint: null, scale: Math.max(0.05, ((prim.box[3] - prim.box[1]) / Math.max(1, prim.art.box[3] - prim.art.box[1])) * vs), flip: false, cls: null, litGlow: !!o.litGlow }); return s && s.c ? s : null; } catch (e) { return null; }
      };
      const grow = 0.6 / vs;   // half a device pixel or so: neighbouring triangles overlap, never leave a seam
      const triDraw = (s, t) => {
        const c = [(t.pts[0][0] + t.pts[1][0] + t.pts[2][0]) / 3, (t.pts[0][1] + t.pts[1][1] + t.pts[2][1]) / 3];
        const out = t.pts.map(q => { const dx = q[0] - c[0], dy = q[1] - c[1], l = Math.hypot(dx, dy) || 1; return [q[0] + dx / l * grow, q[1] + dy / l * grow]; });
        const us = t.art.map(p => p[0]), a = Math.max(s.x0, Math.min(...us) - 0.6), b = Math.min(s.x0 + s.w, Math.max(...us) + 0.6);
        if (!(b > a)) return 0;
        ctx.save();
        ctx.setTransform(vs, 0, 0, vs, ox, oy);
        ctx.beginPath(); ctx.moveTo(out[0][0], out[0][1]); ctx.lineTo(out[1][0], out[1][1]); ctx.lineTo(out[2][0], out[2][1]); ctx.closePath(); ctx.clip();
        const m = t.m;
        ctx.setTransform(vs * m[0], vs * m[1], vs * m[2], vs * m[3], vs * m[4] + ox, vs * m[5] + oy);
        ctx.globalAlpha = A;
        ctx.drawImage(s.c, (a - s.x0) / s.w * s.c.width, 0, (b - a) / s.w * s.c.width, s.c.height, a, s.y0, b - a, s.h);
        ctx.restore();
        return 1;
      };
      ctx.setTransform(vs, 0, 0, vs, ox, oy);
      if (prim.roof) n += _wexFillPts(ctx, prim.roof.pts, colour('paint', prim.roof.hex, prim.zKey, 'roof'), A);
      const sp = spriteOf(prim.obj);
      for (const st of prim.strips || []) {
        if (sp && st.tris) for (const t of st.tris) n += triDraw(sp, t);
        else { ctx.setTransform(vs, 0, 0, vs, ox, oy); n += _wexFillPts(ctx, st.quad, colour('paint', '#3a4a40', st.z, 'hull'), A); }
      }
      if (prim.end) {
        const es = prim.end.obj && prim.end.tris ? spriteOf(prim.end.obj) : null;
        if (es) for (const t of prim.end.tris) n += triDraw(es, t);
        else if (prim.end.face) {
          // the end without art: bands from the waterline up (the quad runs bottom-left, bottom-right, top-right, top-left), windows across the house
          ctx.setTransform(vs, 0, 0, vs, ox, oy);
          const q = prim.end.quad, L = (p, c, t) => [p[0] + (c[0] - p[0]) * t, p[1] + (c[1] - p[1]) * t], at = (u, t) => L(L(q[0], q[1], u), L(q[3], q[2], u), t);
          for (const b of prim.end.face.bands) n += _wexFillPts(ctx, [at(b.u, b.t0), at(1 - b.u, b.t0), at(1 - b.u, b.t1), at(b.u, b.t1)], colour('paint', b.hex, prim.end.z, 'end'), A);
          for (const r of prim.end.face.rows) n += _wexFillPts(ctx, [at(r.u, r.t0), at(1 - r.u, r.t0), at(1 - r.u, r.t1), at(r.u, r.t1)], colour('glass', r.hex, prim.end.z, 'end'), A * 0.92);
        } else { ctx.setTransform(vs, 0, 0, vs, ox, oy); n += _wexFillPts(ctx, prim.end.quad, colour('paint', prim.end.hex, prim.end.z, 'end'), A); }
      }
    }
  } finally { ctx.restore(); }
  return n;
}
