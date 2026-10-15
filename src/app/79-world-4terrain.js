/* ============================================================
   WORLD ENGINE (scene format v3): TERRAIN (docs/dev/WORLD_ENGINE.md 1.5, 2.2; requirements W2, Q2, TR1 to TR9). PURE classic script,
   private prefix _wtr. Nothing runs at load.

   The ground has height (W2: slopes, banks, embankments, cuttings, cliffs: `ground.features` and `ground.relief`). The v2 ground
   follows a relief along the EDGES of a surface polygon only, so a hill INSIDE a polygon (the face of a cliff between its near and
   far edge) was never drawn and everything standing on it hung in the sky above a flat ground (found by the first no-example place,
   Whitby: SCENE_LESSONS J). Terrain is therefore drawn by the world like any other static: the relief is cut into strips of
   constant depth (3 % steps), each strip a prim of quads (the same `line` prim the extruder makes), with a zKey and a footprint
   in metres, so the chunk order puts every house, tree and boat on the strip it stands on, hides what lies behind a nearer rise, and
   reflects the hill in the water, with no special case in the compositor.

   A CLIFF (79-world-4cliff.js) is analytic: the relief grid cannot hold a face that is steep over a few metres. The strips take
   their heights from the cliff's own function, cut every quad the face crosses at the foot and at the lip (the face itself is
   drawn by the cliff pass, true geometry, strata and all) and leave out what lies behind a face taller than the eye (it is hidden:
   nothing is drawn for a plateau nobody can see). A talus skirt at the foot is scree.

     worldTerrainPrims(world, cam, o) -> [prim]   o: { season }. [] when the ground is flat (max relief under 0.4 m) or has no relief.
                                                    A prim: { id, kind: 'line', sub: 'terrain', box, zKey, foot, height, solidity: 'passable',
                                                    faces: [{ pts, role: 'ground', mat, hex, z, alpha }], ops?, mat }. A cliff face is a prim
                                                    with ops only (strokes, fills, trees: see worldTerrainDraw).
     worldTerrainDraw(ctx, prim, o)   -> draws a terrain prim (its faces, then its ops); o as worldExtrudeDraw's (vs, ox, oy, mctx, alpha)
     worldTerrainKind(world, x, z)    -> the surface kind the ground at (x, z) is painted as (the topmost surface there; 'grass' else)
   ============================================================ */

const WORLD_TERRAIN_STEP = 1.03;                    // depth ratio between strips
const WORLD_TERRAIN_FLAT = 0.4;                     // metres: relief below this is flat ground (the v2 base draws it)
const _WTR_COL = Object.freeze({ grass: '#7ea34c', field: '#9aaa5e', heath: '#8c7d58', sand: '#d8c99d', stone: '#a39d90', rock: '#8e8b83', soil: '#8a6e4b' });
const _WTR_STONE = new Set(['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'platform', 'stairs', 'ramp', 'crossing', 'road']);

function worldTerrainKind(world, x, z) {
  const S = (world && world.surfaces) || [];
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    if (!s || s.kind === 'hedge' || s.kind === 'weir' || s.kind === 'rail' || s.kind === 'tram') continue;
    if (typeof _wcSurfContains === 'function' && _wcSurfContains(s, x, z)) return s.kind;
  }
  return 'grass';
}
function _wtrMat(kind, slope) {
  if (kind === 'water') return null;
  if (slope > 1.3) return { mat: 'stone', hex: _WTR_COL.rock };               // a cliff face: bare rock
  if (_WTR_STONE.has(kind)) return { mat: 'stone', hex: _WTR_COL.stone };
  if (kind === 'sand') return { mat: 'soil', hex: _WTR_COL.sand };
  if (kind === 'heath') return { mat: 'grass', hex: _WTR_COL.heath };
  if (kind === 'field') return { mat: 'grass', hex: _WTR_COL.field };
  return { mat: 'grass', hex: _WTR_COL.grass };
}
function _wtrShade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * k))), g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * k))), b = Math.max(0, Math.min(255, Math.round((n & 255) * k)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function _wtrMixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), m = (x, y) => Math.round(x + (y - x) * t);
  return '#' + ((1 << 24) | (m((A >> 16) & 255, (B >> 16) & 255) << 16) | (m((A >> 8) & 255, (B >> 8) & 255) << 8) | m(A & 255, B & 255)).toString(16).slice(1);
}
/** The upper edge of a terrain prim by screen column (32 units wide): what a mover's feet can be hidden by. { w, x0, y: [min Y of the prim's points in each column] } */
function _wtrTops(prim) {
  const W = 32;
  let a = Infinity, b = -Infinity;
  const pts = [];
  for (const f of prim.faces || []) for (const q of f.pts) pts.push(q);
  for (const op of prim.ops || []) { if (op.p) for (const q of op.p) pts.push(q); else if (op.t === 'tree') { pts.push([op.x - op.w, op.y - op.h * 1.1], [op.x + op.w, op.y]); } }
  for (const q of pts) { if (q[0] < a) a = q[0]; if (q[0] > b) b = q[0]; }
  if (!pts.length || !isFinite(a)) return null;
  const x0 = Math.floor(a / W), n = Math.floor(b / W) - x0 + 1, y = new Array(n).fill(Infinity);
  for (const q of pts) { const i = Math.floor(q[0] / W) - x0; if (q[1] < y[i]) y[i] = q[1]; }
  // a quad spans columns its corners do not touch: carry the lower edge across (a column between two corners is at most as high as them)
  return { w: W, x0, y };
}
/** Can this terrain prim hide (part of) a mover with the screen box `box`? Only where the prim's upper edge over the mover's columns reaches above the mover's feet: ground below a mover's feet never covers it. */
function worldTerrainOccludes(prim, box) {
  const T = prim && prim.tops;
  if (!T || !box) return true;
  const b0 = Math.floor(box.x0 / T.w) - T.x0, b1 = Math.floor(box.x1 / T.w) - T.x0;
  let top = Infinity;
  for (let i = Math.max(0, b0); i <= Math.min(T.y.length - 1, b1); i++) if (T.y[i] < top) top = T.y[i];
  return top < box.y1 - 0.5;
}
/** A polygon offset outward by d on every edge (each vertex along the bisector of its two edge normals, mitre limited). */
function _wtrGrow(P, d) {
  const n = P.length;
  let A = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const sg = A >= 0 ? 1 : -1, out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n], e0 = [b[0] - a[0], b[1] - a[1]], e1 = [c[0] - b[0], c[1] - b[1]], l0 = Math.hypot(e0[0], e0[1]) || 1, l1 = Math.hypot(e1[0], e1[1]) || 1;
    const n0 = [e0[1] / l0 * sg, -e0[0] / l0 * sg], n1 = [e1[1] / l1 * sg, -e1[0] / l1 * sg];
    let bx = n0[0] + n1[0], by = n0[1] + n1[1]; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const k = Math.min(3, d / Math.max(0.3, bx * n0[0] + by * n0[1]));
    out.push([Math.round((b[0] + bx * k) * 10) / 10, Math.round((b[1] + by * k) * 10) / 10]);
  }
  return out;
}
function _wtrU(x, z) { let h = Math.imul(Math.round(x * 4) | 0, 374761393) ^ Math.imul(Math.round(z * 4) | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/** Clip a polygon of vertices { x, z, t, m } to t <= T (sgn 1) or t >= T (sgn -1): Sutherland-Hodgman on one line, attributes interpolated. */
function _wtrClipT(poly, T, sgn) {
  const out = [], inside = v => sgn * (v.t - T) <= 1e-9;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const u = (T - a.t) / (b.t - a.t); out.push({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, t: T, m: a.m + (b.m - a.m) * u }); }
  }
  return out;
}
/** How much of a piece (vertices with t) in front of a face is scree: 1 at the face's foot, 0 at the toe of the talus and beyond. */
function _wtrScreeOf(G, V, mm) {
  if (!(G.w > 0)) return 0;
  const t = V.reduce((a, v) => a + v.t, 0) / V.length;
  return Math.max(0, Math.min(1, 1 + t / G.w)) * Math.min(1, mm * 1.5);
}
/**
 * The pieces of a ground quad (plan corners [[x, z] x 4]) that the cliffs leave to the strips: the part in front of a face (with how
 * much of it is scree), and the part behind it unless it is hidden (a plateau above the eye seen from below). The face itself and its
 * lip are the cliff pass's. -> [{ poly: [[x, z]], scree: 0..1 }]
 */
function _wtrCliffPieces(corners, cliffs, cam, hAt) {
  let pieces = [{ poly: corners.map(p => ({ x: p[0], z: p[1], t: 0, m: 0 })), scree: 0, fresh: true }];
  for (const G of cliffs) {
    const next = [];
    for (const pc of pieces) {
      const V = pc.fresh ? pc.poly.map(v => { const s = worldCliffSample(G, v.x, v.z); return { x: v.x, z: v.z, t: s.t, m: s.m }; }) : pc.poly;
      const mm = Math.max(...V.map(v => v.m));
      if (mm < WORLD_CLIFF_MIN_M) { next.push({ poly: V, scree: pc.scree, fresh: false }); continue; }
      const E = worldCliffEdges(G, mm), tmin = Math.min(...V.map(v => v.t)), tmax = Math.max(...V.map(v => v.t));
      // what lies behind the face is hidden only where the sight line from the eye is still below the face's top where it crosses it
      const hide = (poly) => { let cx = 0, cz = 0, hh = 0; for (const v of poly) { cx += v.x; cz += v.z; if (hAt) hh = Math.max(hh, hAt(v.x, v.z)); } return worldCliffHides(G, cx / poly.length, cz / poly.length, hh, cam.eye); };
      if (tmax <= E.tA) next.push({ poly: V, scree: Math.max(pc.scree, _wtrScreeOf(G, V, mm)), fresh: false });
      else if (tmin >= E.tB) { if (!hide(V)) next.push({ poly: V, scree: pc.scree, fresh: false }); }
      else {
        const fr = tmin < E.tA ? _wtrClipT(V, E.tA, 1) : [], bk = tmax > E.tB ? _wtrClipT(V, E.tB, -1) : [];
        if (fr.length >= 3) next.push({ poly: fr, scree: Math.max(pc.scree, _wtrScreeOf(G, fr, mm)), fresh: false });
        if (bk.length >= 3 && !hide(bk)) next.push({ poly: bk, scree: pc.scree, fresh: false });
      }
    }
    pieces = next;
  }
  return pieces.map(p => ({ poly: p.poly.map(v => [v.x, v.z]), scree: p.scree }));
}

/** Does the strip at depth zm (across x within xlim) cross the talus skirt of this cliff? (a finer grid of quads there: the scree is smooth, not a mosaic) */
function _wtrHasScree(G, zm, xlim) {
  for (let x = -xlim; x <= xlim; x += Math.max(4, xlim / 16)) { const s = worldCliffSample(G, x, zm); if (s.m > 0.1 && s.t > -G.w - 3 && s.t < 0.5) return true; }
  return false;
}
// the prims of a world for a camera and a season are made once (the page builds its frame plan more than once: the host's still, the bake, the tools)
const _wtrMemo = new WeakMap();
function worldTerrainPrims(world, cam, o) {
  o = o || {};
  if (world && typeof world === 'object' && cam && cam.relief) {
    const key = (o.season || '') + '|' + cam.f + '|' + cam.horizon + '|' + cam.x0 + '|' + cam.eye + '|' + (world.features ? world.features.length : 0);
    let m = _wtrMemo.get(world);
    if (m && m.key === key && m.relief === cam.relief) return m.out.slice();
    const out = _wtrPrims(world, cam, o);
    _wtrMemo.set(world, { key, relief: cam.relief, out });
    return out.slice();
  }
  return _wtrPrims(world, cam, o);
}
function _wtrPrims(world, cam, o) {
  const R = cam && cam.relief;
  if (!R || !Array.isArray(R.d) || !Array.isArray(R.x) || !Array.isArray(R.h) || typeof sceneGroundHeight !== 'function' || typeof sceneProject !== 'function' || !(cam.f > 0)) return [];
  let hmax = 0, hmin = 0;
  for (const h of R.h) { if (h > hmax) hmax = h; if (h < hmin) hmin = h; }
  if (hmax - Math.min(0, hmin) < WORLD_TERRAIN_FLAT) return [];
  const cliffs = typeof worldCliffGeom === 'function' ? (world.features || []).map(f => worldCliffGeom(f)).filter(Boolean) : [];
  const d0 = Math.max(0.5, R.d[0]), d1 = R.d[1], out = [], x0 = Number.isFinite(cam.x0) ? cam.x0 : 800;   // the strips cover what the frame and its 21:9 crop can show: scene X from -330 to 1930
  // the height of the ground: the grid; with a cliff, the cliff's own analytic function over the relief that is not a cliff
  const baseGrid = world.reliefBase ? { relief: world.reliefBase } : null;
  const hAt = cliffs.length
    ? (x, z) => { let h = baseGrid ? sceneGroundHeight(baseGrid, x, z) : 0; for (const G of cliffs) { const v = worldCliffHeight(G.f, x, z); if (v > h) h = v; } return h; }
    : (x, z) => sceneGroundHeight(cam, x, z);
  const rock = cliffs.length && typeof _WCL_LOOK === 'object' ? (_WCL_LOOK[cliffs[0].rock] || _WCL_LOOK.limestone) : null;
  const stones = cliffs.length && typeof worldCliffStones === 'function' ? worldCliffStones(world, cam) : [];
  let si = 0;
  // the strips: from the relief's near row to its far row in 3 % steps; a row whose strip is flat and low is skipped (the base draws it)
  let k = 0;
  for (let z = d0; z < d1 - 1e-6; z *= WORLD_TERRAIN_STEP, k++) {
    const za = z, zb = Math.min(d1, z * WORLD_TERRAIN_STEP), zm = (za + zb) / 2;
    const xl = Math.max(R.x[0], (-330 - x0) * zb / cam.f - 6), xr = Math.min(R.x[1], (1930 - x0) * zb / cam.f + 6), xlim = Math.max(Math.abs(xl), Math.abs(xr)), screeStrip = cliffs.some(G => G.w > 0 && _wtrHasScree(G, zm, xlim)), step = Math.max(screeStrip ? 0.6 : 0.9, zm / (screeStrip ? 220 : cliffs.length ? 70 : 44)), faces = [], sops = [];
    let hi = 0, xmin = Infinity, xmax = -Infinity, minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (let x = xl; x < xr - 1e-6; x += step) {
      const x2 = Math.min(xr, x + step);
      const pieces = cliffs.length ? _wtrCliffPieces([[x, za], [x2, za], [x2, zb], [x, zb]], cliffs, cam, hAt) : [{ poly: [[x, za], [x2, za], [x2, zb], [x, zb]], scree: 0 }];
      for (const pc of pieces) {
        const poly = pc.poly, hs = poly.map(p => hAt(p[0], p[1])), hm = Math.max(...hs);
        if (hm < 0.12 && Math.min(...hs) > -0.12) continue;                      // flat ground: the v2 base
        let cx0 = 0, cz0 = 0; for (const p of poly) { cx0 += p[0]; cz0 += p[1]; } cx0 /= poly.length; cz0 /= poly.length;
        const kind = worldTerrainKind(world, cx0, cz0);
        // the slope from the plan quad's four corners (a clipped piece keeps the quad's own gradient)
        // (a clipped piece takes the gradient at its own middle: the face's own jump is not its slope)
        const e = Math.max(0.3, (x2 - x) * 0.5), gx = (hAt(cx0 + e, cz0) - hAt(cx0 - e, cz0)) / (2 * e), gz = (hAt(cx0, cz0 + e) - hAt(cx0, Math.max(0.1, cz0 - e))) / (cz0 + e - Math.max(0.1, cz0 - e)), slope = Math.hypot(gx, gz);
        let m = _wtrMat(kind, slope);
        if (!m) continue;
        // the scree of a cliff is where the cliff's own talus is the ground: a hill that rises higher there (the dale side beside the cove) is not scree
        if (pc.scree > 0 && baseGrid && sceneGroundHeight(baseGrid, cx0, cz0) > hAt(cx0, cz0) - 0.3 && sceneGroundHeight(baseGrid, cx0, cz0) > 0.5) pc.scree = 0;
        const jit0 = _wtrU(cx0, cz0);
        // a talus skirt: pale broken rock where the slope comes off the foot of a cliff, grass creeping up from the toe
        const lf = Math.sin(cx0 * 0.09 + 1.3) * Math.sin(cz0 * 0.12 - 0.4);
        if (pc.scree > 0.05 && rock) { const sc = Math.max(0, Math.min(1, pc.scree * (0.9 + 0.3 * lf))); m = sc > 0.5 ? { mat: 'stone', hex: _wtrMixHex(m.hex, _wtrShade(rock.base, 0.74), Math.min(1, sc * 1.1)) } : { mat: 'grass', hex: _wtrMixHex(m.hex, _wtrShade(rock.base, 0.74), sc * 0.9) }; }
        // the shade of the slope against a sun high on the left behind the eye (the light pass grades the colour by the real sun after)
        const nl = Math.hypot(gx, gz, 1), lam = (-gx * -0.45 + -gz * -0.4 + 1 * 0.8) / (nl * 1.0), shade = Math.max(0.6, Math.min(1.12, 0.78 + 0.34 * lam));
        // a few percent of variation along the strip (mowing, grazing) so a slope is never one flat tone; scree varies more
        const jit = 1 + 0.018 * Math.sin(cx0 * 0.37 + cz0 * 0.21) + 0.012 * Math.sin(cx0 * 1.3 - cz0 * 0.7) + (pc.scree > 0.05 ? 0.03 * lf : 0);
        const P = poly.map((p, i) => { const q = sceneProject(cam, p[0], p[1], hs[i]); return [q.X, q.Y]; });
        // a half scene unit of overlap so neighbouring quads never leave a seam (offset along the edges' normals: a thin quad seen along its
        // length is not grown only at its ends)
        const pts = _wtrGrow(P, 0.65);
        for (const q of pts) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }
        hi = Math.max(hi, hm); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x2);
        faces.push({ pts, role: 'ground', mat: m.mat, hex: _wtrShade(m.hex, shade * jit), z: cz0, alpha: 1 });
      }
    }
    // the stones and tussocks of a talus skirt that stand in this strip, near ones last (they overlap the far)
    while (si < stones.length && stones[si].z < za) si++;
    let sj = si; while (sj < stones.length && stones[sj].z < zb) sj++;
    for (let j = sj - 1; j >= si; j--) for (const op of stones[j].ops) { sops.push(op); for (const q of op.p) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); } xmin = Math.min(xmin, stones[j].x); xmax = Math.max(xmax, stones[j].x); }
    if (!faces.length) continue;
    const strip = { id: 'terrain-' + k, kind: 'line', sub: 'terrain', lineKind: 'terrain', box: [minX, minY, maxX, maxY], zKey: za, foot: [[xmin, za], [xmax, za], [xmax, zb], [xmin, zb]], height: Math.max(0.3, hi), solidity: 'passable', faces, mat: 'grass', ops: sops.length ? sops : undefined, heading: cam.heading || 0 };
    strip.tops = _wtrTops(strip);
    out.push(strip);
  }
  // the faces of the cliffs (4cliff): true geometry, strata, joints, ledges, vegetation
  if (cliffs.length && typeof worldCliffPrims === 'function') for (const p of worldCliffPrims(world, cam, o)) { p.tops = _wtrTops(p); out.push(p); }
  // far first: the nearer rise is drawn over what lies behind it
  out.sort((a, b) => b.zKey - a.zKey);
  return out;
}

/* ---------- drawing a terrain prim: its quads, then its ops (a cliff's strata, joints, ledges and trees) ---------- */
const _wtrShadeMemo = new Map();
/** The sun for the shading of faces: its direction on the ground plane in the camera's frame and its altitude. */
function _wtrSun(o, heading) {
  const sk = o && o.mctx && o.mctx.sky, s = sk && sk.sun;
  const az = s && Number.isFinite(s.az) ? s.az : (heading || 0) - 35, alt = s && Number.isFinite(s.alt) ? s.alt : 40, rel = (az - (heading || 0)) * Math.PI / 180;
  return { sx: Math.sin(rel), sz: Math.cos(rel), alt: alt * Math.PI / 180 };
}
/** The multiplier a face lit from the sun gets: a face turned to the sun is lit, one turned away is in its own shade; a top takes the sun's height. */
function _wtrLight(op, sun) {
  if (op.up) return 0.9 + 0.16 * Math.max(0, Math.sin(sun.alt));
  const n = op.n;
  if (!n) return 1;
  const lam = Math.max(0, n[0] * sun.sx + n[1] * sun.sz) * Math.max(0, Math.cos(sun.alt) * 0.7 + 0.3 * Math.max(0, Math.sin(sun.alt)));
  return 0.8 + 0.34 * lam;
}
/** '#rrggbb' and an opacity as an rgba() string (a gradient stop). */
function _wtrRgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }
function _wtrPoly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
/** A small tree or thorn on a ledge or the rim: a trunk and a crown of lobes in leaf, bare limbs and twigs in winter, buds in April. */
function _wtrTree(ctx, op, colour, A, month) {
  const rr = (() => { let a = (op.seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const x = op.x, y = op.y, h = Math.max(4, op.h), w = Math.max(3, op.w), bare = month <= 2 || month >= 10, bud = month === 3, thorn = op.kind === 'thorn';
  let n = 0;
  ctx.globalAlpha = A;
  // the trunk (a little crooked) and the limbs
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = colour('bark', '#5b4a3a'); ctx.lineWidth = Math.max(1, h * 0.06);
  const lean = (rr() - 0.5) * w * 0.4, ty = y - h * 0.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.25, x + lean, ty); ctx.stroke(); n++;
  if (bare || bud) {
    ctx.strokeStyle = colour('bark', '#6d5a48'); ctx.lineWidth = Math.max(0.7, h * 0.035);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i / 8 - 0.5) * (thorn ? 2.6 : 2.0) + (rr() - 0.5) * 0.3, L = h * (0.38 + rr() * 0.3), ex = x + lean + Math.cos(a) * L * (thorn ? 1.0 : 0.8), ey = ty + Math.sin(a) * L;
      ctx.lineWidth = Math.max(0.7, h * 0.035);
      ctx.beginPath(); ctx.moveTo(x + lean, ty + h * 0.05); ctx.lineTo(ex, ey); ctx.stroke(); n++;
      ctx.lineWidth = Math.max(0.5, h * 0.02);
      for (let j = 0; j < 2; j++) { const a2 = a + (j ? 0.6 : -0.6), L2 = L * 0.4, bx = ex - Math.cos(a) * L * 0.25, by = ey - Math.sin(a) * L * 0.25; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a2) * L2, by + Math.sin(a2) * L2); ctx.stroke(); n++; }
    }
    if (bud) { ctx.fillStyle = colour('leaf', '#b3d468'); ctx.globalAlpha = A * 0.55; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(x + lean + (rr() - 0.5) * w * 1.6, ty - rr() * h * 0.5, Math.max(0.8, h * 0.035), 0, 6.3); ctx.fill(); n++; } }
    ctx.globalAlpha = 1;
    return n;
  }
  const cols = thorn ? ['#4a6a35', '#5d7f3f', '#7ba14c'] : ['#4d7138', '#628a43', '#86ad54'], lobes = thorn ? 4 : 5;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = colour('leaf', cols[pass]); ctx.globalAlpha = A * (pass === 2 ? 0.8 : 1);
    for (let i = 0; i < lobes - pass; i++) {
      const cx = x + lean + (rr() - 0.5) * w * 1.5 * (1 - pass * 0.25) - pass * w * 0.08, cy = ty - h * (0.12 + rr() * 0.45) - pass * h * 0.05, rx = w * (0.32 + rr() * 0.22) * (1 - pass * 0.2), ry = rx * (0.7 + rr() * 0.25);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); ctx.fill(); n++;
    }
  }
  ctx.globalAlpha = 1;
  return n;
}
/** Draw the ops of a terrain prim (see 79-world-4cliff.js). Returns the number of draw calls. */
function _wtrDrawOps(ctx, prim, o, colour) {
  const wet = o.mctx && Number.isFinite(o.mctx.wet) ? o.mctx.wet : 0, snowDay = !!(o.mctx && o.mctx.snowDay);
  const A = Number.isFinite(o.alpha) ? o.alpha : 1, sun = _wtrSun(o, prim.heading), month = o.mctx && Number.isFinite(o.mctx.month) ? o.mctx.month : 6, mk = Math.round(sun.sx * 20) + ',' + Math.round(sun.sz * 20) + ',' + Math.round(sun.alt * 10);
  let n = 0;
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (const op of prim.ops) {
    if (op.t === 'tree') { n += _wtrTree(ctx, op, colour, A * (op.a == null ? 1 : op.a), month); ctx.lineCap = 'butt'; continue; }
    if (op.snow && !snowDay) continue;                                                // snow caps and snow on the ledges: snow days only
    let hex = op.h;
    // rock in the rain is darker and its water stains run darker (the material's own wet is a few percent here: a face is the wettest thing in a frame)
    const k = Math.round(_wtrLight(op, sun) * (op.m === 'stone' && wet > 0 ? 1 - 0.2 * wet : 1) * 50) / 50;
    if (k !== 1 && op.m === 'stone' && hex) { const key = hex + k + mk; let v = _wtrShadeMemo.get(key); if (!v) { v = _wtrShade(hex, k); if (_wtrShadeMemo.size > 4000) _wtrShadeMemo.clear(); _wtrShadeMemo.set(key, v); } hex = v; }
    ctx.globalAlpha = A * (op.a == null ? 1 : op.a);
    if (op.t === 'f') { ctx.fillStyle = colour(op.m, hex); _wtrPoly(ctx, op.p); ctx.closePath(); ctx.fill(); n++; }
    else if (op.t === 'fg') {
      // a smooth fill whose colour drifts along it: the stops carry the colour and the normal of their own column (shaded one by one)
      const gr = ctx.createLinearGradient(op.x0, 0, op.x1, 0);
      for (const st of op.st) { const kk = Math.round(_wtrLight({ n: [st[2], st[3]] }, sun) * (wet > 0 ? 1 - 0.2 * wet : 1) * 50) / 50; gr.addColorStop(Math.max(0, Math.min(1, st[0])), colour(op.m, kk === 1 ? st[1] : _wtrShade(st[1], kk))); }
      ctx.fillStyle = gr; _wtrPoly(ctx, op.p); ctx.closePath(); ctx.fill(); n++;
    } else if (op.t === 'fv') {
      // a vertical ramp of one tint's opacity (ambient shade, the soft shadow under a ledge, a water stain)
      const gr = ctx.createLinearGradient(0, op.y0, 0, op.y1);
      for (const st of op.st) gr.addColorStop(Math.max(0, Math.min(1, st[0])), _wtrRgba(colour(op.m, st[1]), st[2] * (op.a == null ? 1 : op.a) * (op.wetK && wet > 0 ? 1 + op.wetK * wet : 1)));
      ctx.globalAlpha = A; ctx.fillStyle = gr; _wtrPoly(ctx, op.p); ctx.closePath(); ctx.fill(); n++;
    }
    else if (op.t === 's') { ctx.strokeStyle = colour(op.m, hex); ctx.lineWidth = op.w || 1; _wtrPoly(ctx, op.p); ctx.stroke(); n++; }
  }
  ctx.globalAlpha = 1;
  return n;
}
function worldTerrainDraw(ctx, prim, o) {
  o = o || {};
  if (!ctx || !prim) return 0;
  let n = 0;
  if (prim.faces && prim.faces.length && typeof worldExtrudeDraw === 'function') n += worldExtrudeDraw(ctx, prim, o) || 0;
  if (prim.ops && prim.ops.length) {
    const vs = Number.isFinite(o.vs) ? o.vs : 1, ox = Number.isFinite(o.ox) ? o.ox : 0, oy = Number.isFinite(o.oy) ? o.oy : 0;
    const colour = (mat, hex) => {
      if (typeof o.colour === 'function') { try { const c = o.colour(mat, hex, { z: prim.zKey, role: 'ground' }); if (typeof c === 'string') return c; } catch (e) { /* base */ } }
      else if (typeof worldMaterialColour === 'function' && o.mctx) { try { const c = worldMaterialColour(mat, hex, Object.assign({}, o.mctx, { z: prim.zKey })); if (typeof c === 'string') return c; } catch (e) { /* base */ } }
      return hex;
    };
    ctx.save();
    ctx.setTransform(vs, 0, 0, vs, ox, oy);
    try { n += _wtrDrawOps(ctx, prim, o, colour); } finally { ctx.restore(); }
  }
  return n;
}
