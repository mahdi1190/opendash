/* ============================================================
   WORLD ENGINE (scene format v3): TERRAIN (docs/dev/WORLD_ENGINE.md 1.5, 2.2; requirements W2, Q2, TR1 to TR9). PURE classic script,
   private prefix _wtr. Nothing runs at load.

   The ground has height (W2: slopes, banks, embankments, cuttings, cliffs: `ground.features` and `ground.relief`). The v2 ground
   follows a relief along the EDGES of a surface polygon only, so a hill INSIDE a polygon (the face of a cliff between its near and
   far edge) was never drawn and everything standing on it hung in the sky above a flat ground (found by the first no-example place,
   Whitby: SCENE_LESSONS K). Terrain is therefore drawn by the world like any other static: the relief is cut into strips of
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
   A RAILWAY BANK (an embankment or cutting with a `rail` surface along its crest) is lineside ground: its slope is mottled grass,
   darker and wetter at a foot in the water, and carries scrub (op `scrub`: bramble, hawthorn and sallow thickets in patches, on
   the slope the camera sees only: the far side falls away behind the crest). The bed and rails on top are the fill's (4extrude).
   ============================================================ */

const WORLD_TERRAIN_STEP = 1.03;                    // depth ratio between strips
const WORLD_TERRAIN_GENTLE = 0.2;                   // a slope (rise per run) under this leaves a thin paved surface to the base
const WORLD_TERRAIN_FLAT = 0.4;                     // metres: relief below this is flat ground (the v2 base draws it)
const _WTR_COL = Object.freeze({ grass: '#7ea34c', field: '#9aaa5e', heath: '#8c7d58', sand: '#d8c99d', stone: '#a39d90', rock: '#8e8b83', soil: '#8a6e4b' });
const _WTR_STONE = new Set(['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'platform', 'stairs', 'ramp', 'crossing', 'road']);

/** The topmost surface at a ground point (the one worldTerrainKind reads), or null. */
function worldTerrainSurface(world, x, z) {
  const S = (world && world.surfaces) || [];
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    if (!s || s.kind === 'hedge' || s.kind === 'weir' || s.kind === 'rail' || s.kind === 'tram') continue;
    if (typeof _wcSurfContains === 'function' && _wcSurfContains(s, x, z)) return s;
  }
  return null;
}
/** Is (x, z) within `margin` metres of the edge of a thin paved surface (a lane or a path: a `path` surface of 12 m or less, no polygon)? */
function _wtrBesideThinPaved(world, x, z, margin) {
  const S = (world && world.surfaces) || [];
  if (typeof _wcLineDist !== 'function') return false;
  for (const s of S) if (s && _WTR_STONE.has(s.kind) && Array.isArray(s.path) && !Array.isArray(s.poly) && s.width > 0 && s.width <= 12 && _wcLineDist(s.path, x, z) <= s.width / 2 + margin) return true;
  return false;
}
function worldTerrainKind(world, x, z) {
  const S = (world && world.surfaces) || [];
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    if (!s || s.kind === 'hedge' || s.kind === 'weir' || s.kind === 'rail' || s.kind === 'tram') continue;
    if (typeof _wcSurfContains === 'function' && _wcSurfContains(s, x, z)) return s.kind;
  }
  return 'grass';
}
/** Do the surfaces under a plan quad differ (five samples)? Then the strip cuts it finer. */
function worldTerrainMixed(world, x0, x1, z0, z1) {
  const first = worldTerrainKind(world, (x0 + x1) / 2, (z0 + z1) / 2);
  for (const [u, v] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85], [0.5, 0.15], [0.5, 0.85]]) if (worldTerrainKind(world, x0 + (x1 - x0) * u, z0 + (z1 - z0) * v) !== first) return true;
  return false;
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
  for (const op of prim.ops || []) { if (op.p) for (const q of op.p) pts.push(q); else if (op.ps) { for (const P of op.ps) for (const q of P) pts.push(q); } else if (op.t === 'tree' || op.t === 'scrub') { pts.push([op.x - op.w, op.y - op.h * 1.1], [op.x + op.w, op.y]); } }
  for (const q of pts) { if (q[0] < a) a = q[0]; if (q[0] > b) b = q[0]; }
  if (!pts.length || !isFinite(a)) return null;
  const x0 = Math.floor(a / W), n = Math.floor(b / W) - x0 + 1, y = new Array(n).fill(1e9);                     // 1e9: no quad in the column (a plain number: the frame record is JSON, which turns Infinity into null)
  for (const q of pts) { const i = Math.floor(q[0] / W) - x0; if (q[1] < y[i]) y[i] = q[1]; }
  // a quad spans columns its corners do not touch: carry the lower edge across (a column between two corners is at most as high as them)
  return { w: W, x0, y };
}
/** Can this terrain prim hide (part of) a mover with the screen box `box`? Only where the prim's upper edge over the mover's columns reaches above the mover's feet: ground below a mover's feet never covers it. */
function worldTerrainOccludes(prim, box) {
  const T = prim && prim.tops;
  if (!T || !box) return true;
  const b0 = Math.floor(box.x0 / T.w) - T.x0, b1 = Math.floor(box.x1 / T.w) - T.x0;
  let top = 1e9;
  for (let i = Math.max(0, b0); i <= Math.min(T.y.length - 1, b1); i++) { const v = T.y[i]; if (v != null && v < top) top = v; }
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
/** Smooth value noise in [-1, 1] on a metre lattice (bilinear, smoothstep): the same everywhere, so a hillside never shimmers. */
function _wtrN2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const v = (a, b) => _wtrU(a * 0.25 + 91, b * 0.25 - 37) * 2 - 1;
  return (v(ix, iz) * (1 - ux) + v(ix + 1, iz) * ux) * (1 - uz) + (v(ix, iz + 1) * (1 - ux) + v(ix + 1, iz + 1) * ux) * uz;
}
/**
 * The railway banks of a world: the embankments and cuttings with a `rail` surface along their crest -> [{ path, half }]. A railway
 * bank is lineside ground, never a lawn: its slope is mottled (rough grass, scrub, dry patches) and darker and wetter at a foot
 * that stands in the water (see _wtrPrims).
 */
function _wtrRailBanks(world) {
  const out = [], feats = (world && world.features) || [], rails = ((world && world.surfaces) || []).filter(s => s && s.kind === 'rail' && Array.isArray(s.path) && s.path.length >= 2);
  if (!rails.length || typeof _wcLineDist !== 'function') return out;
  for (const f of feats) {
    if (!f || (f.kind !== 'embankment' && f.kind !== 'cutting') || !Array.isArray(f.path) || f.path.length < 2 || !(f.width > 0)) continue;
    const half = f.width / 2;
    if (rails.some(s => s.path.every(p => _wcLineDist(f.path, p[0], p[1]) < half * 0.5))) out.push({ path: f.path, half, h: Math.abs(f.h || 0) });
  }
  return out;
}
/**
 * The scrub of a railway bank in the strip between depths za and zb: thickets (low wide bramble, hawthorn, taller sallow) in
 * patches on the slope the camera sees (the near side, from the foot to the bed's edge), seeded by plan cell so the same bush
 * stands in the same place whatever the strip steps are. -> ops far to near, each { t: 'scrub', x, y, w, h, seed, k } in scene units.
 */
function _wtrBankScrub(world, cam, banks, za, zb, xl, xr, hAt) {
  const ops = [];
  if (!banks.length || typeof _wcLineDist !== 'function') return ops;
  const cell = 2.6, c0 = Math.floor(xl / cell), c1 = Math.floor(xr / cell);
  for (const b of banks) {
    for (let c = c0; c <= c1; c++) {
      for (let j = 0; j < 3; j++) {
        // a patch field: thickets cluster along the bank (value noise on a 16 m grain) and leave open grass between
        const px = (c + 0.5) * cell, patch = _wtrU(Math.floor(px / 16) + 55, Math.floor(za * 0.37) + j * 3);
        if (patch < 0.42) continue;
        const u1 = _wtrU(c * 5 + j, Math.round(za * 7) + 11), u2 = _wtrU(c * 5 + j + 91, Math.round(za * 7) + 13), u3 = _wtrU(c * 7 + j + 3, Math.round(za * 5) + 29), u4 = _wtrU(c * 11 + j, Math.round(za * 3) + 37);
        if (u3 > 0.35 + 0.55 * patch) continue;
        const x = c * cell + u1 * cell, z = za + (zb - za) * u2;
        if (z >= zb) continue;
        // the near side of the bank only, between the foot and the bed (0.6 m of margin each side), never in the water
        const d = _wcLineDist(b.path, x, z);
        if (!(d < b.half - 0.6 && d > 5.4)) continue;
        if (!(z < _wtrPathZ(b.path, x, z))) continue;                                      // the camera side of the line
        const h0 = hAt(x, z);
        if (h0 < 0.3) continue;                                                        // the wet foot is reeds, not scrub
        if (worldTerrainKind(world, x, z) === 'water') continue;
        const tall = u4 > 0.86, wm = tall ? 2.2 + 1.6 * u1 : 1.6 + 2.4 * u2, hm = tall ? 3.0 + 1.8 * u2 : 0.8 + 1.1 * u1 + 0.6 * u4;
        const q = sceneProject(cam, x, z, h0), k = cam.f / Math.max(1, z);
        ops.push({ t: 'scrub', x: Math.round(q.X * 10) / 10, y: Math.round(q.Y * 10) / 10, w: Math.max(2.2, wm * k), h: Math.max(1.6, hm * k), seed: Math.floor(u1 * 1e6) + c * 131 + j, k: tall ? 1 : u4 < 0.4 ? 0 : 2, z, wx: Math.round(x * 100) / 100 });
      }
    }
  }
  ops.sort((a, b) => b.z - a.z);
  return ops;
}
/** The z of the point of a path nearest to (x, z) (the side of a line a point lies on). */
function _wtrPathZ(path, x, z) {
  let best = path[0][1], bd = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], e = path[i], dx = e[0] - a[0], dz = e[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)), q = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
    if (q < bd) { bd = q; best = a[1] + t * dz; }
  }
  return best;
}
/** The colour of a railway bank's ground at (x, z): the base grass broken into patches of olive scrub and dry straw by a seeded field. */
function _wtrBankTone(hex, x, z, wet) {
  // smooth value noise (two scales: long patches along the bank, and a finer grain), so neighbouring quads shade into each other
  const sm = (a) => a * a * (3 - 2 * a), vn = (px, pz, sx, sz, k) => {
    const gx = px / sx, gz = pz / sz, ix = Math.floor(gx), iz = Math.floor(gz), fx = sm(gx - ix), fz = sm(gz - iz);
    const a = _wtrU(ix + k, iz), b = _wtrU(ix + 1 + k, iz), c = _wtrU(ix + k, iz + 1), d = _wtrU(ix + 1 + k, iz + 1);
    return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
  };
  const t = 0.62 * vn(x, z, 14, 4, 0) + 0.38 * vn(x, z, 5, 1.8, 311), u = vn(x, z, 22, 7, 977);
  let c = hex;
  if (t < 0.5) c = _wtrMixHex(c, '#4f6d36', Math.min(0.62, (0.5 - t) * 1.5));        // scrub and bramble
  else c = _wtrMixHex(c, '#aaa862', Math.min(0.45, (t - 0.5) * 1.1));                // dry grass
  if (u > 0.74) c = _wtrMixHex(c, '#6e5f3c', Math.min(0.4, (u - 0.74) * 2));         // a patch of bare earth
  if (wet > 0) c = _wtrMixHex(c, '#4a6234', Math.min(0.7, wet));                      // damp grass at the water's foot
  return c;
}
/**
 * The tone of a field seen from far off (a valley's patchwork: grass, silage, hay, stubble, a darker pasture), by the SURFACE's id: every field is
 * one polygon with its own id, so each takes its own tone and the mosaic reads at two kilometres without a colour in the spec. Only 'field' polygons.
 */
function _wtrFieldTone(hex, id) {
  const u = _wtrU(_wtrHashId(id) * 0.013, 17.3), v = _wtrU(_wtrHashId(id) * 0.007 + 5, 3.1);
  const picks = ['#6f9a3f', '#a7ad58', '#d0c47a', '#86a548', '#4f7a38', '#b0a45a', '#7d9d4a', '#8a7a4f', '#5c8a3a', '#c8bd72'];
  const c = picks[Math.floor(u * picks.length) % picks.length];
  return _wtrShade(_wtrMixHex(hex, c, 0.72), 0.92 + 0.16 * v);
}
/** The ground's grass and heather in the season: pasture and moor go straw in autumn and a grey-brown mat in winter (the strips are baked from fixed colours, so the season is mixed in here; stone and scree keep theirs). */
function _wtrSeasonTone(hex, season) {
  if (season === 'autumn') return _wtrMixHex(hex, '#a99a5c', 0.3);
  if (season === 'winter') return _wtrShade(_wtrMixHex(hex, '#7d7664', 0.5), 0.93);
  if (season === 'spring') return _wtrMixHex(hex, '#8fc05a', 0.1);
  return hex;
}
function _wtrHashId(id) { let h = 2166136261 >>> 0; const t = String(id); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 9973) + 1; }
/**
 * A moor through the year (month 0..11, the northern hemisphere): the colour of each plant of it that month. Ling heather is a dark olive-brown carpet
 * that flowers purple in August and the first half of September (a few early bells of bell heather in late July) and goes bronze-brown after; bracken
 * unfurls green in May, yellows in September, is russet in October and stands dead brown all winter; the bents and purple moor-grass bleach to
 * pale straw from October to March (a winter moor is brown and bleached, never green); bilberry is green in summer and red in autumn. ONE seasonal
 * model: the ground's material ('heath') does not season it again.
 */
function _wtrMoorCols(month) {
  const m = Number.isFinite(month) ? ((Math.round(month) % 12) + 12) % 12 : 6;
  const bloom = m === 7 ? 1 : m === 8 ? 0.6 : m === 6 ? 0.2 : 0;
  const hb = m >= 3 && m <= 5 ? '#4f4c36' : m >= 6 && m <= 8 ? '#4c4733' : m === 9 || m === 10 ? '#5d4533' : '#57402f';
  const BR = ['#87593a', '#87593a', '#83583a', '#7c5938', '#7d7f3c', '#66833a', '#62803a', '#6c8a3c', '#94953e', '#ad692e', '#985a31', '#8a593a'];
  const GR = ['#c2b48c', '#c0b28a', '#b8ad84', '#aba876', '#98a462', '#8e9e58', '#8f9c56', '#9a9d5a', '#a9a062', '#b9a56c', '#c0ae7e', '#c3b48c'];
  const BI = ['#6b4a3a', '#6a4b3a', '#6c4d3a', '#5f5a36', '#557a38', '#4f7034', '#4f6e34', '#56703a', '#6a6a34', '#8c3b2a', '#7a3e2e', '#6b4a3a'];
  return { heather: _wtrMixHex(hb, '#8d5389', bloom * 0.8), bloom, bracken: BR[m], grass: GR[m], bilberry: BI[m], peat: '#3b3127', m };
}
const _wtrSm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
/**
 * The tone of a moor at a point: drifts of heather, bracken (thickest on the steep slopes under an edge), bleached bents, dark bilberry and bare peat,
 * in patches of 20 to 60 m with a finer grain near the lens, blended smoothly (a threshold drew patches as staircases of quads). In plan metres, so it
 * is the same in every frame; the colours are the month's (_wtrMoorCols).
 */
function _wtrMoorTone(hex, x, z, dist, Mc, slope) {
  const M = Mc || _wtrMoorCols(6), d = dist || 0;
  const near = Math.max(0, Math.min(1, 1.6 - d / 160)), far = Math.max(0.08, Math.min(1, 1.5 - d / 1200));
  const a = _wtrN2(x / 70 + 11, z / 70 - 5) * 0.75 + 0.45 * _wtrN2(x / 31 + 3, z / 31 - 9), b = near * _wtrN2(x / 13 - 3, z / 13 + 8), c = _wtrN2(x / 140 + 2, z / 140 + 41);
  let t = _wtrMixHex(M.grass, M.heather, 0.25 + 0.65 * _wtrSm((a + 0.3) / 0.65));
  const wBr = Math.max(_wtrSm((-a - 0.35) / 0.35) * 0.8, _wtrSm(((slope || 0) - 0.12) / 0.9) * _wtrSm((_wtrN2(x / 40 + 7, z / 40 - 3) + 0.15) / 0.6) * 0.75);
  t = _wtrMixHex(t, M.bracken, wBr);
  if (b > 0.2) t = _wtrMixHex(t, M.grass, Math.min(0.45, (b - 0.2) * 0.8));
  else if (b < -0.3) t = _wtrMixHex(t, b < -0.6 ? M.peat : M.bilberry, Math.min(0.42, (-0.3 - b) * 0.8));
  // far off the drifts merge into the moor's mean tone (a mosaic of 20 m patches at two kilometres is noise)
  t = _wtrMixHex(_wtrMixHex(M.grass, M.heather, 0.55), t, far);
  return _wtrShade(_wtrMixHex(hex, t, 0.92), 0.95 + 0.1 * c);
}
/** '#rrggbb' quantised to steps of q (so the clumps of a strip share a few fills). */
function _wtrQuant(hex, q) { const n = parseInt(hex.slice(1), 16), f = v => Math.min(255, Math.round(v / q) * q); return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1); }
/**
 * The carpet of a moor nearer than 260 m: clumps of heather and bilberry (dark domes, their shadow side), tufts of bleached bents catching the light,
 * the purple of the heather's flowers in its months, snow lying on the tops on a snow day. Each clump 3 to 10 px across, so it reads as texture at
 * any depth; placed by hashes of the quad (the same in every frame) and collected by colour into a few fills per strip (B: Map hex -> polygons).
 */
function _wtrMoorDeco(q, cam, hAt, B, ext, Mc, snow) {
  if (q.cz > 700 || q.cz < 7) return;
  const k = cam.f / Math.max(1, q.cz);
  const yA = sceneProject(cam, q.cx, q.za, hAt(q.cx, q.za)).Y, yB = sceneProject(cam, q.cx, q.zb, hAt(q.cx, q.zb)).Y;
  const wpx = (q.x2 - q.x) * k, hpx = Math.max(1, Math.abs(yA - yB));
  const n = Math.min(16, Math.floor(wpx * hpx / (q.slope > 0.15 ? 30 : 46) + _wtrU(q.cx * 1.3 + 3, q.cz * 0.7)));
  const put = (hex, pts) => { const key = _wtrQuant(hex, 9); let L = B.get(key); if (!L) { L = []; B.set(key, L); } L.push(pts); for (const p of pts) { if (p[0] < ext.minX) ext.minX = p[0]; if (p[0] > ext.maxX) ext.maxX = p[0]; if (p[1] < ext.minY) ext.minY = p[1]; if (p[1] > ext.maxY) ext.maxY = p[1]; } };
  for (let i = 0; i < n; i++) {
    const u1 = _wtrU(q.cx * 3.1 + i * 7.3, q.cz * 1.7 + i), u2 = _wtrU(q.cx * 0.7 - i * 3.9, q.cz * 2.9 + i * 1.3), u3 = _wtrU(q.cx * 5.3 + i, q.cz * 0.3 - i * 2.1);
    const x = q.x + (q.x2 - q.x) * u1, z = q.za + (q.zb - q.za) * u2, y = hAt(x, z);
    const sz = Math.max(0.1, Math.min(2.2, (q.slope > 0.15 ? 4 + 9 * u3 : 3 + 7 * u3) / k)), p = sceneProject(cam, x, z, y), X = p.X, Y = p.Y + 0.6, w2 = Math.max(1.2, sz * k * 0.5), hh = Math.max(1, sz * k * (0.28 + 0.14 * u2));
    const col = _wtrMoorTone('#5a5038', x, z, q.cz, Mc, q.slope), lit = u3 > 0.58;
    const pts = [], ns = w2 > 3 ? 4 : 3, hs = hh * (lit ? 1.6 : 1.25);
    pts.push([X - w2, Y]);
    for (let j = 0; j < ns; j++) {
      const t0 = (j + 0.5) / ns, tx = X - w2 + 2 * w2 * t0 + (_wtrU(x * 7 + j, z * 5) - 0.5) * w2 * 0.5, th = hs * (0.7 + 0.5 * _wtrU(x * 3 - j, z * 11 + j));
      pts.push([tx, Y - th], [X - w2 + 2 * w2 * (j + 1) / ns, Y - th * (lit ? 0.18 : 0.42)]);
    }
    pts[pts.length - 1] = [X + w2, Y];
    for (let j = 0; j < pts.length; j++) pts[j] = [Math.round(pts[j][0] * 10) / 10, Math.round(pts[j][1] * 10) / 10];
    const stone = q.slope > 0.15 && u1 < 0.06;
    put(stone ? _wtrShade("#8d8270", 0.85 + 0.3 * u2) : lit ? _wtrShade(col, 1.12 + 0.16 * u1) : _wtrShade(col, 0.56 + 0.16 * u1), pts);
    // the flowers of the heather in its months: a few purple points on the top of a dark clump
    if (!lit && Mc && Mc.bloom > 0.15 && u2 < Mc.bloom * 0.8 && w2 > 1.6) { const r = Math.max(0.6, w2 * 0.22); put('#a7609f', [[X - r, Y - hh * 0.75], [X, Y - hh * 0.95 - r], [X + r, Y - hh * 0.75], [X, Y - hh * 0.55]]); }
    // snow lies on the tops of the clumps on a snow day
    if (snow && u1 < 0.45 + 0.4 * snow) put('#e8edf0', [[X - w2 * 0.8, Y - hs * 0.35], [X, Y - hs * 0.75], [X + w2 * 0.8, Y - hs * 0.35], [X, Y - hs * 0.15]]);
  }
}
function _wtrU(x, z) { let h = Math.imul(Math.round(x * 4) | 0, 374761393) ^ Math.imul(Math.round(z * 4) | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/* ---------- a valley seen from above: fields, woods and lanes as their own shapes (18 Oct, Stanage: "a smooth, flat-shaded, CG-looking smear") ----------
   The quads of a strip are 10 to 40 m wide at a kilometre: a field's edge drawn by them is a staircase and its walls and hedges are lost. So every field,
   wood and lane of the world (the valley's mosaic, or any author's) is also drawn as ITS OWN polygon, clipped to each strip's depth band and laid on the
   relief there: the boundaries are crisp lines, the dry-stone walls of the upper rows and the hedges of the valley floor are drawn as dark lines with the
   hedgerow trees along them, a wood is a dark canopy of crowns, a lane a pale line winding between the walls. The colours are the month's (hay cut pale
   in July, pasture green, straw and dull winter greens), shaded by the slope and hazed with distance like the quads under them. */
function _wtrValleyOf(world) {
  const out = { fields: [], lanes: [] };
  for (const s of (world && world.surfaces) || []) {
    if (!s || !s.id) continue;
    const wood = /^wood-/.test(s.id);
    if ((s.kind === 'field' || wood) && Array.isArray(s.poly) && s.poly.length >= 3) {
      let z0 = Infinity, z1 = -Infinity; for (const p of s.poly) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      const m = /^fld-(\d+)-/.exec(s.id);
      if (z1 > 120) out.fields.push({ id: s.id, poly: s.poly, z0, z1, wood, row: m ? +m[1] : 0, h: _wtrHashId(s.id) });
    } else if ((s.kind === 'track' || s.kind === 'lane') && Array.isArray(s.path) && s.path.length >= 2) out.lanes.push({ id: s.id, path: s.path, w: Number.isFinite(s.width) ? s.width : 4 });
  }
  return out;
}
/** The fields' colours in a month (0..11): pasture, silage, hay meadow (cut pale in July and August), rough grazing. */
function _wtrFieldPal(month) {
  const m = Number.isFinite(month) ? ((Math.round(month) % 12) + 12) % 12 : 6;
  if (m >= 5 && m <= 7) return ['#6f9a40', '#80a648', '#93ae52', '#c9c27a', '#b9b76a', '#5f8c3a', '#a3b45c', '#7a9c46', '#d2c784', '#688f3e'];
  if (m >= 8 && m <= 10) return ['#73923f', '#82984a', '#94a052', '#a9a462', '#b4a86c', '#668a3c', '#8c9a4e', '#9a9a58'];
  if (m >= 3 && m <= 4) return ['#75a648', '#88b452', '#6c9c42', '#98b95c', '#80aa4c', '#a0bc62'];
  return ['#6f8448', '#7d8c52', '#8a9058', '#69804a', '#949464', '#76874e', '#868a5c'];
}
/** Clip a plan polygon to zA <= z <= zB (Sutherland-Hodgman on two lines). */
function _wtrClipZ(P, zA, zB) {
  const cut = (Q, Z, keepAbove) => { const o = []; for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length], ia = keepAbove ? a[1] >= Z : a[1] <= Z, ib = keepAbove ? b[1] >= Z : b[1] <= Z; if (ia) o.push(a); if (ia !== ib) { const t = (Z - a[1]) / (b[1] - a[1]); o.push([a[0] + (b[0] - a[0]) * t, Z]); } } return o; };
  const A = cut(P, zA, true); return A.length >= 3 ? cut(A, zB, false) : [];
}
/** Clip a segment to zA <= z <= zB: [[x, z], [x, z]] or null. */
function _wtrSegZ(a, b, zA, zB) {
  let t0 = 0, t1 = 1; const dz = b[1] - a[1];
  if (Math.abs(dz) < 1e-9) { if (a[1] < zA || a[1] > zB) return null; }
  else { const u = (zA - a[1]) / dz, v = (zB - a[1]) / dz; t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v)); if (t0 >= t1) return null; }
  return [[a[0] + (b[0] - a[0]) * t0, a[1] + dz * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + dz * t1]];
}
function _wtrInPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/** The ops of the valley's fields, woods and lanes in the strip [za, zb] (pushed onto sops; ext grown). */
function _wtrValleyOps(V, cam, hAt, za, zb, month, ops, ext) {
  const zm = (za + zb) / 2, k = cam.f / zm, L = Math.max(4, zm * 0.025), pal = _wtrFieldPal(month), winter = !(month >= 3 && month <= 9);
  const hz = (hex) => zm > 500 ? _wtrMixHex(hex, '#a3b7cb', Math.min(0.78, 0.9 * (1 - Math.exp(-(zm - 500) / 3600)))) : hex;
  const r1 = v => Math.round(v * 10) / 10;
  const proj = (x, z) => { const p = sceneProject(cam, x, z, hAt(x, z) + 0.15); return [r1(p.X), r1(p.Y)]; };
  const grow = (pts) => { for (const q of pts) { if (q[0] < ext.minX) ext.minX = q[0]; if (q[0] > ext.maxX) ext.maxX = q[0]; if (q[1] < ext.minY) ext.minY = q[1]; if (q[1] > ext.maxY) ext.maxY = q[1]; } };
  const line = (a, b) => { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / L)), o = []; for (let i = 0; i <= n; i++) o.push(proj(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)); return o; };
  const xl = (-400 - cam.x0) * zb / cam.f, xr = (2000 - cam.x0) * zb / cam.f;
  const dots = new Map(), dot = (hex, X, Y, r) => { let D = dots.get(hex); if (!D) { D = []; dots.set(hex, D); } const n = r > 3 ? 8 : 6, P = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P.push([r1(X + Math.cos(a) * r), r1(Y + Math.sin(a) * r * 0.82)]); } D.push(P); grow(P); };
  const strokes = new Map(), stroke = (hex, w, pts) => { const key = hex + '|' + w; let S = strokes.get(key); if (!S) { S = []; strokes.set(key, S); } S.push(pts); grow(pts); };
  for (const F of V.fields) {
    if (F.z1 < za || F.z0 > zb) continue;
    const C = _wtrClipZ(F.poly, za, zb);
    if (C.length < 3) continue;
    let cx = 0, cz = 0; for (const q of C) { cx += q[0]; cz += q[1]; } cx /= C.length; cz /= C.length;
    if (Math.max(...C.map(q => q[0])) < xl || Math.min(...C.map(q => q[0])) > xr) continue;
    const pts = []; for (let i = 0; i < C.length; i++) { const seg = line(C[i], C[(i + 1) % C.length]); seg.pop(); for (const q of seg) pts.push(q); }
    // the slope's light, as on the quads under it
    const e = Math.max(4, zm * 0.02), gx = (hAt(cx + e, cz) - hAt(cx - e, cz)) / (2 * e), gz = (hAt(cx, cz + e) - hAt(cx, cz - e)) / (2 * e), nl = Math.hypot(gx, gz, 1), lam = (gx * 0.45 + gz * 0.4 + 0.8) / nl, shade = Math.max(0.66, Math.min(1.12, 0.8 + 0.3 * lam));
    const u = (F.h % 997) / 997;
    let hex = F.wood ? (winter ? (u < 0.5 ? '#5d5a48' : '#4a5440') : (u < 0.5 ? '#3f5c30' : '#4a6636')) : pal[F.h % pal.length];
    hex = _wtrShade(hex, shade * (0.95 + 0.1 * u));
    const gp = _wtrGrow(pts, 0.6); ops.push({ t: 'f', p: gp, m: 'heath', h: hz(hex), a: 1 }); grow(gp);
    // a wood is a canopy of crowns (dark and lit), never a flat green
    if (F.wood) {
      const g = Math.max(9, 4 / k * 3);
      for (let x = Math.floor(Math.min(...C.map(q => q[0])) / g) * g; x < Math.max(...C.map(q => q[0])); x += g) for (let z = Math.floor(za / g) * g; z < zb; z += g * 0.6) {
        const h1 = _wtrU(x * 0.31 + 5, z * 0.17), xx = x + g * h1, zz = z + g * 0.6 * _wtrU(x * 0.13, z * 0.29 + 2);
        if (zz < za || zz > zb || !_wtrInPoly(F.poly, xx, zz)) continue;
        const p = sceneProject(cam, xx, zz, hAt(xx, zz) + 6), r = Math.max(0.9, (4 + 3 * h1) * k);
        dot(hz(_wtrShade(winter ? '#5f5848' : '#3a5530', h1 < 0.5 ? 0.82 : 1.22)), p.X, p.Y, r);
      }
    }
    // the boundaries: dry-stone walls on the upper rows (grey), hedges with their trees on the valley floor (dark green; bare in winter)
    const hedge = !F.wood && F.row >= 3, wallK = F.row < 3 && !F.wood;
    for (let i = 0; i < F.poly.length; i++) {
      const s = _wtrSegZ(F.poly[i], F.poly[(i + 1) % F.poly.length], za, zb); if (!s) continue;
      const P2 = line(s[0], s[1]);
      if (wallK || hedge) stroke(hz(wallK ? '#57524a' : '#3d5230'), Math.round(Math.max(0.7, Math.min(2.2, (wallK ? 1.4 : 3) * k)) * 10) / 10, P2);
      if (hedge && ((F.h + i * 7) % 10) < 6) {
        const len = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]), sp = 26 + 20 * u;
        for (let d = (F.h % 13); d < len; d += sp * (0.7 + 0.6 * _wtrU(d * 0.1 + i, F.h * 0.01))) {
          const t = d / len, xx = s[0][0] + (s[1][0] - s[0][0]) * t, zz = s[0][1] + (s[1][1] - s[0][1]) * t, p = sceneProject(cam, xx, zz, hAt(xx, zz) + 5);
          dot(hz(winter ? '#6a6250' : _wtrShade('#3c5a2e', 0.9 + 0.25 * _wtrU(xx, zz))), p.X, p.Y, Math.max(0.8, (3 + 2.5 * _wtrU(zz, xx)) * k));
        }
      }
    }
  }
  // lanes: a pale line between the walls
  for (const Ln of V.lanes) for (let i = 1; i < Ln.path.length; i++) {
    const s = _wtrSegZ(Ln.path[i - 1], Ln.path[i], za, zb); if (!s) continue;
    stroke(hz('#b3aa92'), Math.round(Math.max(0.8, Math.min(3, Ln.w * k)) * 10) / 10, line(s[0], s[1]));
  }
  for (const [key, S] of strokes) { const [h, w] = key.split('|'); for (const P2 of S) ops.push({ t: 's', p: P2, m: 'heath', h, w: +w, a: 0.9 }); }   // (heath: a wall or hedge two kilometres off is a dark line at night, never a moonlit wire)
  for (const [h, D] of dots) ops.push({ t: 'fm', ps: D, m: 'heath', h, a: 1 });
}

/**
 * What a pasture hillside has that a flat colour has not (found on Malham Cove: a green slab): sheep trods along the contours
 * (terracettes: a dark line with a pale catch under it), tussocks and rush, and pale limestone scars where the hill is steep. Placed in
 * plan metres from hashes of the position (the same in every frame), in the colour of the quad they stand in so the season and the
 * light grade them with it. q: { cx, cz, x, x2, za, zb, gx, gz, slope, hex, hm }; ops and ext (the strip's box) are filled.
 */
function _wtrHillDeco(q, cam, hAt, ops, ext) {
  const h = (a, b, c) => _wtrU(q.cx * a + c, q.cz * b - c);
  const P = (x, z, y) => { const p = sceneProject(cam, x, z, y); return [Math.round(p.X * 10) / 10, Math.round(p.Y * 10) / 10]; };
  const k = cam.f / Math.max(1, q.cz), cl = Math.hypot(q.gx, q.gz) || 1, W = q.x2 - q.x;
  const note = (pts) => { for (const p of pts) { if (p[0] < ext.minX) ext.minX = p[0]; if (p[0] > ext.maxX) ext.maxX = p[0]; if (p[1] < ext.minY) ext.minY = p[1]; if (p[1] > ext.maxY) ext.maxY = p[1]; } };
  const n1 = _wtrN2(q.cx / 14, q.cz / 14), n2 = _wtrN2(q.cx / 5 + 3, q.cz / 5);
  // a sheep trod: along the contour, a few metres to a dozen long, thicker where the slope is steeper
  if (q.kind !== 'heath' && h(1.7, 1.3, 11) < 0.15 + 0.1 * Math.max(0, n2) && q.slope > 0.12) {
    const cx = -q.gz / cl, cz = q.gx / cl, half = 2.5 + 6 * h(0.9, 2.1, 5), pts = [], lo = [];
    for (let i = 0; i <= 4; i++) {
      const t = (i / 4 * 2 - 1) * half, x = q.x + W * h(3.1, 0.7, 2) + cx * t, z = Math.max(1, Math.min(q.zb, q.za + (q.zb - q.za) * h(0.4, 4.3, 9)) + cz * t * 0.25), y = hAt(x, z);
      const p = P(x, z, y + 0.03), p2 = P(x, z, y - 0.18); pts.push(p); lo.push(p2);
    }
    ops.push({ t: 's', p: pts, m: 'grass', h: _wtrShade(q.hex, 0.74), w: Math.max(0.7, Math.min(2.4, 0.2 * k)), a: 0.5 });
    ops.push({ t: 's', p: lo, m: 'grass', h: _wtrShade(q.hex, 1.18), w: Math.max(0.6, Math.min(1.8, 0.12 * k)), a: 0.3 });
    note(pts); note(lo);
  }
  // tussocks and rush: dark rounded bumps, in clusters where the noise is high
  if (q.cz > (q.kind === 'heath' ? 30 : 0) && h(2.3, 1.1, 21) < 0.16 + 0.2 * Math.max(0, n1)) {
    const x = q.x + W * h(5.3, 0.3, 4), z = q.za + (q.zb - q.za) * h(0.2, 6.1, 3), y = hAt(x, z), sz = (0.5 + 1.1 * h(1.9, 2.9, 8)) * (q.kind === 'heath' ? 0.55 : 1), pts = [];
    const [X, Y] = P(x, z, y), w2 = Math.max(1.2, sz * k * 0.5), hh = Math.max(1.1, sz * k * 0.38);
    for (let i = 0; i < 8; i++) { const an = Math.PI + i / 7 * Math.PI, rj = 0.78 + 0.3 * _wtrU(q.cx + i, q.cz); pts.push([X + Math.cos(an) * w2 * rj, Y + Math.sin(an) * hh * rj]); }
    pts.push([X + w2 * 0.9, Y + 0.4], [X - w2 * 0.9, Y + 0.4]);
    const e = pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
    ops.push({ t: 'f', p: e, m: 'grass', h: _wtrShade(n1 > 0.3 ? '#7f8f4c' : q.hex, 0.62 + 0.3 * h(7.1, 1.7, 6)), a: 0.9 });
    note(e);
  }
  // limestone scars on the steeper pasture, in clusters: a ragged outcrop (a lit, stepped top, a darker front, a shadow under it)
  if (q.kind !== 'heath' && q.slope > 0.25 && n1 + 0.6 * n2 > 0.62 && h(3.7, 2.7, 31) < 0.34) {
    const x = q.x + W * h(2.1, 3.3, 13), z = q.za + (q.zb - q.za) * h(4.4, 0.9, 17), wm = 0.9 + 2.8 * h(1.3, 5.7, 19), hm = 0.7 + 1.2 * h(6.1, 1.1, 23), nS = 5;
    const bot = [], top = [];
    for (let i = 0; i <= nS; i++) {
      const u = i / nS, xx = x + (u - 0.5) * wm, y0 = hAt(xx, z), env = Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)) ** 0.7;
      bot.push(P(xx, z, y0 - 0.05));
      top.push(P(xx, z, y0 + hm * env * (0.55 + 0.6 * _wtrU(q.cx + i * 3.1, q.cz + 7))));
    }
    const shade = 0.82 + 0.25 * h(8.3, 1.9, 29), sh = Math.max(1, 0.1 * k);
    const body = top.concat(bot.slice().reverse());
    ops.push({ t: 'f', p: body.map(p => [p[0], p[1] + sh]), m: 'stone', h: '#4b4843', a: 0.28 });
    ops.push({ t: 'f', p: body, m: 'stone', h: _wtrShade('#b9b5a8', shade * 0.82), a: 0.97, n: [0, -1] });
    // the lit top edge: the upper half of the body in a paler tone
    ops.push({ t: 'f', p: top.concat(top.map((p, i) => [p[0], p[1] + (bot[i][1] - p[1]) * 0.4]).reverse()), m: 'stone', h: _wtrShade('#d4d0c3', shade), a: 0.9, up: true });
    note(body);
  }
}
/** Clip a polygon of vertices { x, z, t, m } to t <= T (sgn 1) or t >= T (sgn -1): Sutherland-Hodgman on one line, attributes interpolated. */
function _wtrClipT(poly, T, sgn) {
  const out = [], inside = v => sgn * (v.t - T) <= 1e-9;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const u = (T - a.t) / (b.t - a.t); out.push({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, t: T, m: a.m + (b.m - a.m) * u, fw: (a.fw == null ? 1 : a.fw) + ((b.fw == null ? 1 : b.fw) - (a.fw == null ? 1 : a.fw)) * u, s: a.s != null && b.s != null ? a.s + (b.s - a.s) * u : a.s }); }
  }
  return out;
}
/** How much of a piece (vertices with t) in front of a face is scree: 1 at the face's foot, 0 at the toe of the talus and beyond. */
function _wtrScreeOf(G, V, mm) {
  const W = G.w * V.reduce((a, v) => a + (v.fw == null ? 1 : v.fw), 0) / V.length;
  if (!(W > 0)) return 0;
  const t = V.reduce((a, v) => a + v.t, 0) / V.length;
  return Math.max(0, Math.min(1, 1 + t / W)) * Math.min(1, mm * 1.5);
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
      const V = pc.fresh || pc.G !== G ? pc.poly.map(v => { const s = worldCliffSample(G, v.x, v.z); return { x: v.x, z: v.z, t: s.t, m: s.m, fw: s.fw, s: s.s }; }) : pc.poly;
      const mm = Math.max(...V.map(v => v.m));
      if (mm < WORLD_CLIFF_MIN_M) { next.push({ poly: V, scree: pc.scree, fresh: false, G }); continue; }
      const E = worldCliffEdges(G, mm), tmin = Math.min(...V.map(v => v.t)), tmax = Math.max(...V.map(v => v.t));
      // what lies behind the face is hidden only where the sight line from the eye is still below the face's top where it crosses it
      const hide = (poly) => { let cx = 0, cz = 0, hh = 0; for (const v of poly) { cx += v.x; cz += v.z; if (hAt) hh = Math.max(hh, hAt(v.x, v.z)); } return worldCliffHides(G, cx / poly.length, cz / poly.length, hh, cam.eye); };
      if (tmax <= E.tA) next.push({ poly: V, scree: Math.max(pc.scree, _wtrScreeOf(G, V, mm)), fresh: false, G });
      else if (tmin >= E.tB) { if (!hide(V)) next.push({ poly: V, scree: pc.scree, fresh: false, G }); }
      else {
        const fr = tmin < E.tA ? _wtrClipT(V, E.tA, 1) : [], bk = tmax > E.tB ? _wtrClipT(V, E.tB, -1) : [];
        if (fr.length >= 3) next.push({ poly: fr, scree: Math.max(pc.scree, _wtrScreeOf(G, fr, mm)), fresh: false, G });
        if (bk.length >= 3 && !hide(bk)) next.push({ poly: bk, scree: pc.scree, fresh: false, G });
      }
    }
    pieces = next;
    // a blocky rock's plateau ends in bare rock: the cap (2 to 7 m of slab behind the lip, its width wandering along the edge)
    if (G.slopeTalus && typeof _WCL_LOOK === 'object' && _WCL_LOOK[G.rock] && _WCL_LOOK[G.rock].blocky) {
      const next2 = [];
      for (const pc of pieces) {
        const V = pc.poly, mm = Math.max(...V.map(v => v.m == null ? 0 : v.m));
        if (pc.cap != null || mm < 0.5 || !V.every(v => v.t != null)) { next2.push(pc); continue; }
        const E = worldCliffEdges(G, mm), tmin = Math.min(...V.map(v => v.t)), sm = V.reduce((a, v) => a + (v.s || 0), 0) / V.length;
        const cw = E.tB + 1.5 + 3 * (0.5 + 0.5 * Math.sin(sm / 9.3 + 1.1) * Math.cos(sm / 23.7 - 0.4)), zc = V.reduce((a, v) => a + v.z, 0) / V.length;
        if (zc < 9 || tmin < E.tB - 0.01 || tmin >= cw) { next2.push(pc); continue; }
        const ins = _wtrClipT(V, cw, 1), out = _wtrClipT(V, cw, -1);
        if (ins.length >= 3) next2.push({ poly: ins, scree: pc.scree, fresh: false, cap: 1 });
        if (out.length >= 3) next2.push({ poly: out, scree: pc.scree, fresh: false, cap: 0 });
      }
      pieces = next2;
    }
  }
  return pieces.map(p => ({ poly: p.poly.map(v => [v.x, v.z]), scree: p.scree, cap: p.cap || 0 }));
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
    const key = (o.season || '') + '|' + (Number.isFinite(o.month) ? o.month : '') + '|' + (o.snow ? 1 : 0) + '|' + cam.f + '|' + cam.horizon + '|' + cam.x0 + '|' + cam.eye + '|' + (world.features ? world.features.length : 0);
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
    ? (x, z) => { let h = baseGrid ? sceneGroundHeight(baseGrid, x, z) : 0, tal = 0; for (const G of cliffs) if (G.slopeTalus) tal = Math.max(tal, worldCliffTalus(G.f, x, z)); h += tal; for (const G of cliffs) { const v = worldCliffHeight(G.f, x, z); if (v > 0 && v > h) h = v; } return h; }   // (a cliff only counts where it stands: its 0 away from it is not a floor under a valley)
    : (x, z) => sceneGroundHeight(cam, x, z);
  const VAL = _wtrValleyOf(world), railBanks = _wtrRailBanks(world), MC = _wtrMoorCols(Number.isFinite(o.month) ? o.month : o.season === 'winter' ? 0 : o.season === 'autumn' ? 9 : o.season === 'spring' ? 4 : 6);
  const rock = cliffs.length && typeof _WCL_LOOK === 'object' ? (_WCL_LOOK[cliffs[0].rock] || _WCL_LOOK.limestone) : null;
  const stones = cliffs.length && typeof worldCliffStones === 'function' ? worldCliffStones(world, cam) : [];
  let si = 0;
  // the strips: from the relief's near row to its far row in 3 % steps; a row whose strip is flat and low is skipped (the base draws it)
  let k = 0;
  for (let z = d0; z < d1 - 1e-6; z *= WORLD_TERRAIN_STEP, k++) {
    const za = z, zb = Math.min(d1, z * WORLD_TERRAIN_STEP), zm = (za + zb) / 2;
    const xl = Math.max(R.x[0], (-330 - x0) * zb / cam.f - 6), xr = Math.min(R.x[1], (1930 - x0) * zb / cam.f + 6), xlim = Math.max(Math.abs(xl), Math.abs(xr)), screeStrip = cliffs.some(G => G.w > 0 && _wtrHasScree(G, zm, xlim));
    // a strip crossing a railway bank is cut finer (its mottling is smooth patches, not slabs)
    const bankStrip = railBanks.length && typeof _wcLineDist === 'function' && railBanks.some(b => { for (let x = xl; x <= xr; x += Math.max(20, (xr - xl) / 8)) if (_wcLineDist(b.path, x, zm) < b.half) return true; return false; });
    const step = Math.max(screeStrip ? 0.6 : 0.9, zm / (screeStrip ? 220 : cliffs.length ? 70 : bankStrip ? 120 : 44)), faces = [], sops = [];
    let hi = 0, xmin = Infinity, xmax = -Infinity, minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    const hillQ = [], capQ = [];
    for (let x = xl; x < xr - 1e-6; x += step) {
      const x2 = Math.min(xr, x + step);
      // a quad that more than one surface kind lies under (a lane, a flight of steps, a path across a slope) is cut into a finer grid, so a
      // narrow surface is never lost between the centres of two big quads (SCENE_LESSONS T: the 199 steps vanished from the cliff)
      const quads = [[[x, za], [x2, za], [x2, zb], [x, zb]]];
      if (!cliffs.length && worldTerrainMixed(world, x, x2, za, zb)) {
        quads.length = 0;
        const nx = Math.max(2, Math.min(8, Math.round((x2 - x) / 0.7))), nz = 2;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const xa = x + (x2 - x) * i / nx, xb = x + (x2 - x) * (i + 1) / nx, za2 = za + (zb - za) * j / nz, zb2 = za + (zb - za) * (j + 1) / nz; quads.push([[xa, za2], [xb, za2], [xb, zb2], [xa, zb2]]); }
      }
      for (const qd of quads) {
      const pieces = cliffs.length ? _wtrCliffPieces(qd, cliffs, cam, hAt) : [{ poly: qd, scree: 0 }];
      for (const pc of pieces) {
        const poly = pc.poly, hs = poly.map(p => hAt(p[0], p[1])), hm = Math.max(...hs);
        if (hm < 0.12 && Math.min(...hs) > -0.12) continue;                      // flat ground: the v2 base
        let cx0 = 0, cz0 = 0; for (const p of poly) { cx0 += p[0]; cz0 += p[1]; } cx0 /= poly.length; cz0 /= poly.length;
        const surf = worldTerrainSurface(world, cx0, cz0), kind = surf ? surf.kind : 'grass';
        // the slope from the plan quad's four corners (a clipped piece keeps the quad's own gradient)
        // (a clipped piece takes the gradient at its own middle: the face's own jump is not its slope)
        const e = Math.max(0.3, (x2 - x) * 0.5), gx = (hAt(cx0 + e, cz0) - hAt(cx0 - e, cz0)) / (2 * e), gz = (hAt(cx0, cz0 + e) - hAt(cx0, Math.max(0.1, cz0 - e))) / (cz0 + e - Math.max(0.1, cz0 - e)), slope = Math.hypot(gx, gz);
        let m = _wtrMat(kind, slope);
        if (!m) continue;
        // a thin paved surface (a lane, a path) on a GENTLE slope: the base draws it, tilted along its own centre line (a straight 3D edge is a
        // straight screen edge), with its setts, flags and gutter. A flat strip over it hid every mark: a lane up a hill was a grey ribbon (Elm Hill)
        // (only where the base CAN draw it: below the horizon row. Ground above eye level projects above it and the base draws nothing there, so the strip stays)
        const belowHorizon = poly.every((p, i) => sceneProject(cam, p[0], p[1], hs[i]).Y >= (cam.horizon || 0) + 2);
        if (belowHorizon && slope < WORLD_TERRAIN_GENTLE && !cliffs.length) {
          if (_WTR_STONE.has(kind)) { const sf = worldTerrainSurface(world, cx0, cz0); if (sf && Array.isArray(sf.path) && !Array.isArray(sf.poly) && sf.width <= 12) continue; }
          // the ground beside such a surface (the sliver a quad's centre puts outside it, the foot of a wall): not a green wedge cutting into the paving
          else if (kind === 'grass' && _wtrBesideThinPaved(world, cx0, cz0, Math.max(0.9, (x2 - x) * 1.1))) continue;
        }
        if (rock && (kind === 'path' || kind === 'track') && m.mat === 'stone' && slope <= 1.3) { const pn = _wtrN2(cx0 / 3.1 + 7, cz0 / 3.1 - 2), pn2 = _wtrN2(cx0 / 0.9, cz0 / 0.9 + 3); m = { mat: 'gravel', hex: _wtrShade(_wtrMixHex(_wtrMixHex(rock.light, '#7a6a50', 0.45), pn < -0.2 ? '#4a3d30' : '#b0a080', Math.min(0.5, Math.abs(pn) * 0.7)), 0.95 + 0.07 * pn2) }; }
        // a steep quad beside a cliff is the cliff's own rock (never the generic pale grey: a gritstone edge is dark, chalk is white)
        if (m.mat === 'stone' && slope > 1.3 && rock) m = { mat: 'stone', hex: _wtrMixHex(rock.base, rock.dark, 0.3) };
        if (m.mat === 'grass' && kind === 'heath' && slope < 1.3) {
          let hx = _wtrMoorTone(m.hex, cx0, cz0, Math.hypot(cx0, cz0), MC, slope);
          // snow on a snow day: drifts in the hollows and on the lee of the walls and the rim, the tops of the heather showing through elsewhere
          if (o.snow) { const sn = 0.6 * _wtrN2(cx0 / 22 + 5, cz0 / 22 - 7) + 0.4 * _wtrN2(cx0 / 7 - 2, cz0 / 7 + 4) + 0.35 * (o.snow - 0.5); hx = _wtrMixHex(hx, '#e6ebee', 0.88 * _wtrSm((sn + 0.05) / 0.35)); }
          m = { mat: Math.hypot(cx0, cz0) > 900 ? 'grass' : 'heath', hex: hx };
        }
        else if (m.mat === 'grass' && kind === 'field' && surf && surf.id) m = { mat: m.mat, hex: _wtrFieldTone(m.hex, surf.id) };
        // the scree of a cliff is where the cliff's own talus is the ground: a hill that rises higher there (the dale side beside the cove) is not scree
        if (pc.scree > 0 && baseGrid && sceneGroundHeight(baseGrid, cx0, cz0) > hAt(cx0, cz0) - 0.3 && sceneGroundHeight(baseGrid, cx0, cz0) > 0.5) pc.scree = 0;
        if (pc.cap && rock) {
          const cn = _wtrN2(cx0 / 9 + 4, cz0 / 9 - 1), cn2 = _wtrN2(cx0 / 25 - 3, cz0 / 25 + 2);
          m = { mat: 'stone', hex: _wtrShade(_wtrMixHex(_wtrMixHex(rock.light, rock.base, 0.35 + 0.25 * cn2), cn < 0 ? rock.dark : rock.lichen || rock.light, Math.min(0.18, Math.abs(cn) * 0.25)), 0.98 + 0.04 * cn) };
          capQ.push({ cx: cx0, cz: cz0, x, x2, za, zb });
        }
        const jit0 = _wtrU(cx0, cz0);
        // a pasture is patchy (dry bent, rush, a greener flush by a spring), never one tone: two scales of noise in the colour, the yellower and the darker patches mixed in
        if ((m.mat === 'grass' || m.mat === 'heath') && pc.scree <= 0.05 && Math.max(hm, -Math.min(...hs)) > 0.5) {
          const na = _wtrN2(cx0 / 13, cz0 / 13), nb = _wtrN2(cx0 / 4.1 + 5, cz0 / 4.1 - 2);
          let hx = m.hex;
          if (kind === 'heath') { /* the moor has its own patches (_wtrMoorTone) */ } else if (kind === 'field') { hx = _wtrShade(hx, 1 + 0.05 * na); } else if (na > 0.25) hx = _wtrMixHex(hx, '#b4ab62', Math.min(0.5, (na - 0.25) * 0.7)); else if (na < -0.3) hx = _wtrMixHex(hx, '#4d7a3a', Math.min(0.5, (-0.3 - na) * 0.8));
          m = kind === 'field' ? { mat: m.mat, hex: hx } : { mat: m.mat, hex: _wtrShade(hx, 1 + 0.07 * na + 0.05 * nb) };
          hillQ.push({ cx: cx0, cz: cz0, x, x2, za, zb, gx, gz, slope, hex: m.hex, hm, kind });
        }
        // a talus skirt: pale broken rock where the slope comes off the foot of a cliff, grass creeping up from the toe
        const lf = Math.sin(cx0 * 0.09 + 1.3) * Math.sin(cz0 * 0.12 - 0.4);
        if (pc.scree > 0.05 && rock) { const sc = Math.max(0, Math.min(1, pc.scree * (0.9 + 0.3 * lf))); m = sc > 0.5 ? { mat: 'scree', hex: _wtrMixHex(m.hex, _wtrShade(rock.base, 0.74), Math.min(1, sc * 1.1)) } : { mat: 'grass', hex: _wtrMixHex(m.hex, _wtrShade(rock.base, 0.74), sc * 0.9) }; }
        // the shade of the slope against a sun high on the left behind the eye (the light pass grades the colour by the real sun after)
        const nl = Math.hypot(gx, gz, 1), lam = (-gx * -0.45 + -gz * -0.4 + 1 * 0.8) / (nl * 1.0), shade = kind === 'heath' ? Math.max(0.72, Math.min(1.08, 0.86 + 0.22 * lam)) : Math.max(0.6, Math.min(1.12, 0.78 + 0.34 * lam));
        // a few percent of variation along the strip (mowing, grazing) so a slope is never one flat tone; scree varies more
        const jit = 1 + 0.018 * Math.sin(cx0 * 0.37 + cz0 * 0.21) + 0.012 * Math.sin(cx0 * 1.3 - cz0 * 0.7) + (pc.scree > 0.05 ? 0.03 * lf : 0);
        // a railway bank is mottled, and wetter at a foot standing in the water
        if (railBanks.length && m.mat === 'grass' && pc.scree <= 0.05) {
          for (const rb of railBanks) {
            if (typeof _wcLineDist === 'function' && _wcLineDist(rb.path, cx0, cz0) < rb.half) { m = { mat: m.mat, hex: _wtrBankTone(m.hex, cx0, cz0, Math.max(0, 1 - hm / 0.5)) }; break; }
          }
        }
        const P = poly.map((p, i) => { const q = sceneProject(cam, p[0], p[1], hs[i]); return [q.X, q.Y]; });
        // a half scene unit of overlap so neighbouring quads never leave a seam (offset along the edges' normals: a thin quad seen along its
        // length is not grown only at its ends)
        const pts = _wtrGrow(P, 0.65);
        for (const q of pts) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }
        hi = Math.max(hi, hm); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x2);
        // a lane drawn flat (above the eye the base draws nothing): its cells vary a few percent cell to cell, so it reads as worn stone and not as a tarmac ribbon
        const stoneJit = _WTR_STONE.has(kind) && slope < WORLD_TERRAIN_GENTLE ? 1 + 0.12 * (jit0 - 0.5) + 0.05 * Math.sin(cx0 * 2.3 + cz0 * 0.9) : 1;
                // the far ground is hazy: a ridge at four kilometres is blue-grey and soft, never the saturated tone of the heather at your feet (the haze of
        // a fair day; the light pass grades it after, so night and dusk follow)
        let hexF = _wtrShade(m.mat === 'grass' ? _wtrSeasonTone(m.hex, o.season) : m.hex, shade * jit * stoneJit);
        if (zm > 500) hexF = _wtrMixHex(hexF, '#a3b7cb', Math.min(0.78, 0.9 * (1 - Math.exp(-(zm - 500) / 3600))));
        faces.push({ pts, role: 'ground', mat: m.mat, hex: hexF, z: cz0, alpha: 1 });
      }
      }
    }
    // the pasture's own marks (trods, tussocks, scars), far to near within the strip
    if (hillQ.length) {
      const ext = { minX, maxX, minY, maxY }, B = new Map();
      for (const q of hillQ) { if (q.kind === 'heath') _wtrMoorDeco(q, cam, hAt, B, ext, MC, o.snow || 0); else _wtrHillDeco(q, cam, hAt, sops, ext); }
      for (const [h, ps] of B) sops.push({ t: 'fm', ps, m: 'heath', h, a: 0.96 });
      ({ minX, maxX, minY, maxY } = ext);
    }
    // the cap's marks: joints across the slab, round weathering pits (dark, a pale rim), lichen rosettes; in plan metres from hashes
    for (const q of capQ) {
      const k = cam.f / Math.max(1, q.cz); if (k > 90) continue; const n = Math.min(4, Math.floor((q.x2 - q.x) * k / 40 + _wtrU(q.cx * 2.1, q.cz * 1.3)));
      for (let i = 0; i < n; i++) {
        const u1 = _wtrU(q.cx * 1.7 + i * 3.3, q.cz * 2.3 - i), u2 = _wtrU(q.cx * 4.1 - i, q.cz * 0.9 + i * 2.7), u3 = _wtrU(q.cx * 0.3 + i * 7, q.cz * 5.1);
        const x = q.x + (q.x2 - q.x) * u1, z = q.za + (q.zb - q.za) * u2, y = hAt(x, z) + 0.01, p = sceneProject(cam, x, z, y);
        if (u3 < 0.35) { const L = (0.6 + 1.6 * u1) * k, a2 = (u2 - 0.5) * 0.6, e = [[p.X - L * Math.cos(a2), p.Y - L * 0.12 * Math.sin(a2)], [p.X, p.Y + 0.4], [p.X + L * Math.cos(a2), p.Y + L * 0.12 * Math.sin(a2)]]; sops.push({ t: 's', p: e.map(q2 => [Math.round(q2[0] * 10) / 10, Math.round(q2[1] * 10) / 10]), m: 'stone', h: rock.dark, w: Math.max(0.7, 0.05 * k), a: 0.55 }); }
        else { const rx = (0.12 + 0.35 * u1) * k, ry = Math.max(0.6, rx * Math.min(0.5, 30 / Math.max(30, q.cz * 4) + 0.12)), pit = u3 < 0.7, P4 = [[p.X - rx, p.Y], [p.X - rx * 0.6, p.Y - ry * 0.8], [p.X + rx * 0.5, p.Y - ry * 0.9], [p.X + rx, p.Y], [p.X + rx * 0.5, p.Y + ry * 0.8], [p.X - rx * 0.6, p.Y + ry * 0.75]].map(q2 => [Math.round(q2[0] * 10) / 10, Math.round(q2[1] * 10) / 10]); sops.push({ t: 'f', p: P4, m: 'stone', h: pit ? rock.dark : (u2 < 0.4 && rock.lichen2 ? rock.lichen2 : rock.lichen), a: pit ? 0.45 : 0.55 }); }
        minX = Math.min(minX, p.X - 30); maxX = Math.max(maxX, p.X + 30); minY = Math.min(minY, p.Y - 10); maxY = Math.max(maxY, p.Y + 10);
      }
    }
    // scrub on a railway bank's slope: drawn with the strip (the same depth as the ground it stands on), far to near
    if (bankStrip && faces.length) {
      for (const op of _wtrBankScrub(world, cam, railBanks, za, zb, xl, xr, hAt)) {
        sops.push(op);
        minX = Math.min(minX, op.x - op.w); maxX = Math.max(maxX, op.x + op.w); minY = Math.min(minY, op.y - op.h * 1.1); maxY = Math.max(maxY, op.y);
      }
    }
    // the stones and tussocks of a talus skirt that stand in this strip, near ones last (they overlap the far)
    while (si < stones.length && stones[si].z < za) si++;
    let sj = si; while (sj < stones.length && stones[sj].z < zb) sj++;
    for (let j = sj - 1; j >= si; j--) for (const op of stones[j].ops) { sops.push(op); for (const q of op.p) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); } xmin = Math.min(xmin, stones[j].x); xmax = Math.max(xmax, stones[j].x); }
    // the valley's fields, woods and lanes as their own shapes (beyond 120 m: nearer, the quads and the dressing are the ground)
    if (faces.length && zb > 120 && (VAL.fields.length || VAL.lanes.length)) {
      const ext = { minX, maxX, minY, maxY };
      _wtrValleyOps(VAL, cam, hAt, za, zb, MC.m, sops, ext);
      ({ minX, maxX, minY, maxY } = ext);
    }
    if (!faces.length) continue;
    const strip = { id: 'terrain-' + k, kind: 'line', sub: 'terrain', lineKind: 'terrain', box: [minX, minY, maxX, maxY], zKey: za, orderZ: zb, foot: [[xmin, za], [xmax, za], [xmax, zb], [xmin, zb]], height: Math.max(0.3, hi), solidity: 'passable', faces, mat: 'grass', ops: sops.length ? sops : undefined, heading: cam.heading || 0 };
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
  const lean = (rr() - 0.5) * w * 0.5, ty = y - h * 0.34;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.16, x + lean, ty); ctx.stroke(); n++;
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
  // October: an ash goes yellow before it drops its leaves, a thorn red and orange
  const turn = month === 9;
  const cols = turn ? (thorn ? ['#74381f', '#a3472a', '#c96a30'] : ['#82701f', '#b99a2c', '#dcc04b']) : thorn ? ['#4a6a35', '#5d7f3f', '#7ba14c'] : ['#486b35', '#628a43', '#8fb45a'], lobes = (thorn ? 5 : 7) - (turn ? 1 : 0);
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = colour('leaf', cols[pass]); ctx.globalAlpha = A * (pass === 2 ? 0.75 : 1);
    for (let i = 0; i < lobes - pass * 2; i++) {
      const cx = x + lean + (rr() - 0.5) * w * 1.9 * (1 - pass * 0.25) - pass * w * 0.08, cy = ty - h * (0.04 + rr() * 0.5) - pass * h * 0.06, rx = w * (0.3 + rr() * 0.26) * (1 - pass * 0.18), ry = rx * (0.55 + rr() * 0.3);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); ctx.fill(); n++;
    }
  }
  ctx.globalAlpha = 1;
  return n;
}
/**
 * A thicket on a railway bank: a dark foot, then lobes of mid and light leaf (bramble and hawthorn low and wide, sallow tall on
 * grey stems), the light on the upper left; in summer colours through the leaf material (the look package turns, browns and bares
 * them by the date: ONE source of seasonal state). op: { x, y (its foot), w, h, seed, k: 0 bramble, 1 sallow, 2 hawthorn }.
 */
function _wtrScrub(ctx, op, colour, A, month) {
  let a = (op.seed >>> 0) || 1;
  const rr = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const bare = month <= 2 || month >= 11, x = op.x, y = op.y, w = op.w, h = op.h;
  const pal = op.k === 1 ? ['#486f33', '#5f8a3e', '#86ad54'] : op.k === 2 ? ['#3f6532', '#5a8540', '#7fa650'] : ['#37602d', '#4f7d38', '#78a24c'];
  let n = 0;
  // a soft dark foot where the bush sits in the grass
  ctx.globalAlpha = A * 0.35; ctx.fillStyle = colour('leaf', '#2c4a22');
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.04, w * 0.55, Math.max(0.6, h * 0.1), 0, 0, 6.2832); ctx.fill(); n++;
  if (op.k === 1) {
    // a sallow: two or three grey-green stems and a tall loose crown
    ctx.globalAlpha = A * (bare ? 0.7 : 1); ctx.strokeStyle = colour('bark', '#5c5446'); ctx.lineWidth = Math.max(0.8, w * 0.06); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const bx = x + (i - 1) * w * 0.14; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + (i - 1) * w * 0.1, y - h * 0.55); ctx.stroke(); n++; }
    ctx.lineCap = 'butt';
  }
  const lobes = op.k === 1 ? 6 : 5, top = op.k === 1 ? 0.28 : 0.1;
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = colour('leaf', pal[pass]); ctx.globalAlpha = A * (bare ? 0.5 : pass === 2 ? 0.85 : 1);
    for (let i = 0; i < lobes - pass; i++) {
      const u = rr(), v = rr(), cx = x + (u - 0.5) * w * (0.9 - pass * 0.18) - pass * w * 0.07, cy = y - h * (top + v * (1 - top) * 0.7) - pass * h * 0.06;
      const rx = w * (0.2 + 0.2 * rr()) * (1 - pass * 0.12), ry = Math.min(h * 0.4, rx * (0.8 + 0.3 * rr()));
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.8, rx), Math.max(0.7, ry), 0, 0, 6.2832); ctx.fill(); n++;
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
    if (op.t === 'scrub') { n += _wtrScrub(ctx, op, colour, A, month); continue; }
    if (op.snow && !snowDay) continue;                                                // snow caps and snow on the ledges: snow days only
    let hex = op.h;
    // rock in the rain is darker and its water stains run darker (the material's own wet is a few percent here: a face is the wettest thing in a frame)
    const k = Math.round(_wtrLight(op, sun) * (op.m === 'stone' && wet > 0 ? 1 - 0.12 * wet : 1) * 50) / 50;
    if (k !== 1 && op.m === 'stone' && hex) { const key = hex + k + mk; let v = _wtrShadeMemo.get(key); if (!v) { v = _wtrShade(hex, k); if (_wtrShadeMemo.size > 4000) _wtrShadeMemo.clear(); _wtrShadeMemo.set(key, v); } hex = v; }
    ctx.globalAlpha = A * (op.a == null ? 1 : op.a);
    if (op.t === 'f') { ctx.fillStyle = colour(op.m, hex); _wtrPoly(ctx, op.p); ctx.closePath(); ctx.fill(); n++; }
    else if (op.t === 'fm') { ctx.fillStyle = colour(op.m, hex); ctx.beginPath(); for (const pts of op.ps) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); } ctx.fill(); n++; }
    else if (op.t === 'fg') {
      // a smooth fill whose colour drifts along it: the stops carry the colour and the normal of their own column (shaded one by one)
      const gr = ctx.createLinearGradient(op.x0, 0, op.x1, 0);
      for (const st of op.st) { const kk = Math.round(_wtrLight({ n: [st[2], st[3]] }, sun) * (wet > 0 ? 1 - 0.12 * wet : 1) * 50) / 50; gr.addColorStop(Math.max(0, Math.min(1, st[0])), colour(op.m, kk === 1 ? st[1] : _wtrShade(st[1], kk))); }
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
