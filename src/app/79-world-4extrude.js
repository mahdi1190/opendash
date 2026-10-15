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
     worldExtrudeDraw(ctx, prim, o) -> draws   draws a prim on a 2D context. o: { vs, ox, oy (device = vs * scene + o), sprite
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
  const K = WORLD_EXTRUDE_KINDS[line.kind] || WORLD_EXTRUDE_KINDS.wall, total = _wexLen(line.path), near = _wexNear(cam);
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
    try { d = sceneBuildingProject(spec, cam, { season: o.season || 'summer', snowDepth: o.snowDepth || 0, tierCap: o.tierCap }); } catch (e) { d = null; }
    if (d) {
      // the outward normal of every visible wall (the generator's counter-clockwise footprint, front edge first)
      const F = d.foot || foot, walls = (d.walls || []).map(i => { const a = F[i], c = F[(i + 1) % F.length], ex = c[0] - a[0], ez = c[1] - a[1], L = Math.hypot(ex, ez) || 1; return { edge: i, a, b: c, n: [ez / L, -ex / L] }; });
      return { id: b.id || null, kind: 'building', ent: b.id || null, foot, zKey: _wexR(zKey, 3), height: d.h, eave: d.eave, box: d.box, direct: d, walls, solidity: 'solid', style: d.style };
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
 * A long hull drawn in perspective (see the header). ent in camera metres: { id, obj, variant, x, z, y, facing | vx, vz, height }.
 * The side art is laid along the hull's real length: when the art is much shorter than the hull at its own proportions (a 9 m
 * picture of an 18 m narrowboat) its middle is repeated rather than stretched, so portholes keep their shape. The side is
 * cut into slices by depth (each slice spans at most 2 % of depth, or 10 units on screen), and each slice into two triangles,
 * each mapped exactly from the art (a triangle's affine map is exact at its corners): neighbouring slices share their edges,
 * so the hull's lines run straight and continuous into the distance with no steps.
 */
function worldExtrudeHull(ent, cam, o) {
  o = o || {};
  if (!ent || !cam || !_wexNum(cam.f) || typeof ent.obj !== 'string') return null;
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
  for (const L of Array.isArray(world.lines) ? world.lines : []) { try { prims.push(...worldExtrudeLine(L, cam, o)); } catch (e) { /* one bad line never stops the rest (G8) */ } }
  for (const b of Array.isArray(world.buildings) ? world.buildings : []) { try { const p = worldExtrudeBuilding(b, cam, o); if (p) prims.push(p); } catch (e) { /* G8 */ } }
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
    if (prim.kind === 'line' || (prim.kind === 'building' && prim.fallback)) {
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
        ctx.fillStyle = lit ? (nightCol[sh.glow] || '#ffd98a') : colour(sh.part === 'roof' ? 'slate' : 'brick', sh.f, prim.zKey, sh.part || 'wall');
        if (typeof Path2D === 'function') ctx.fill(new Path2D(sh.d)); else { ctx.beginPath(); _wexTrace(ctx, sh.d); ctx.fill(); }
        n++;
      }
      if (night) for (const sh of D.lit || []) { ctx.globalAlpha = (sh.op == null ? 1 : sh.op) * A; ctx.fillStyle = sh.f; if (typeof Path2D === 'function') ctx.fill(new Path2D(sh.d)); else { ctx.beginPath(); _wexTrace(ctx, sh.d); ctx.fill(); } n++; }
    } else if (prim.kind === 'hull') {
      const spriteOf = (obj) => {
        if (typeof o.sprite !== 'function') return null;
        try { const s = o.sprite({ o: obj, v: prim.variant == null ? 0 : prim.variant, part: '*', season: o.season || 'summer', haze: o.haze || 0, tint: null, scale: Math.max(0.05, ((prim.box[3] - prim.box[1]) / Math.max(1, prim.art.box[3] - prim.art.box[1])) * vs), flip: false, cls: null }); return s && s.c ? s : null; } catch (e) { return null; }
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
        else { ctx.setTransform(vs, 0, 0, vs, ox, oy); n += _wexFillPts(ctx, prim.end.quad, colour('paint', prim.end.hex, prim.end.z, 'end'), A); }
      }
    }
  } finally { ctx.restore(); }
  return n;
}
