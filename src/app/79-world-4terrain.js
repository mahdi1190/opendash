/* ============================================================
   WORLD ENGINE (scene format v3): TERRAIN (docs/dev/WORLD_ENGINE.md 1.5, 2.2; requirements W2, Q2). PURE classic script, private
   prefix _wtr. Nothing runs at load.

   The ground has height (W2: slopes, banks, embankments, cuttings, cliffs: `ground.features` and `ground.relief`). The v2 ground
   follows a relief along the EDGES of a surface polygon only, so a hill INSIDE a polygon (the face of a cliff between its near and
   far edge) was never drawn and everything standing on it hung in the sky above a flat ground (found by the first no-example place,
   Whitby: SCENE_LESSONS J). Terrain is therefore drawn by the world like any other static: the relief is cut into strips of
   constant depth (3 % steps), each strip a prim of quads (the same `line` prim the extruder makes, drawn by worldExtrudeDraw),
   with a zKey and a footprint in metres, so the chunk order puts every house, tree and boat on the strip it stands on, hides what
   lies behind a nearer rise, and reflects the hill in the water, with no special case in the compositor.

     worldTerrainPrims(world, cam, o) -> [prim]   o: { season }. [] when the ground is flat (max relief under 0.4 m) or has no relief.
                                                    A prim: { id, kind: 'line', sub: 'terrain', box, zKey, foot, height, solidity: 'passable',
                                                    faces: [{ pts, role: 'ground', mat, hex, z, alpha }], mat }
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
function worldTerrainPrims(world, cam, o) {
  o = o || {};
  const R = cam && cam.relief;
  if (!R || !Array.isArray(R.d) || !Array.isArray(R.x) || !Array.isArray(R.h) || typeof sceneGroundHeight !== 'function' || typeof sceneProject !== 'function' || !(cam.f > 0)) return [];
  let hmax = 0, hmin = 0;
  for (const h of R.h) { if (h > hmax) hmax = h; if (h < hmin) hmin = h; }
  if (hmax - Math.min(0, hmin) < WORLD_TERRAIN_FLAT) return [];
  const d0 = Math.max(0.5, R.d[0]), d1 = R.d[1], out = [], half = Math.max(0.2, Math.tan((cam.fov || 66) * Math.PI / 360) * 1.3 * (cam.aspect || 1.78) / 1.78);
  const hAt = (x, z) => sceneGroundHeight(cam, x, z);
  // the strips: from the relief's near row to its far row in 3 % steps; a row whose strip is flat and low is skipped (the base draws it)
  let k = 0;
  for (let z = d0; z < d1 - 1e-6; z *= WORLD_TERRAIN_STEP, k++) {
    const za = z, zb = Math.min(d1, z * WORLD_TERRAIN_STEP), zm = (za + zb) / 2;
    const xlim = Math.min(Math.abs(R.x[0]), Math.abs(R.x[1]), zb * 1.6 + 6), step = Math.max(0.9, zm / 44), faces = [];
    let hi = 0, xmin = Infinity, xmax = -Infinity, minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (let x = -xlim; x < xlim - 1e-6; x += step) {
      const x2 = Math.min(xlim, x + step), xm = (x + x2) / 2;
      const ha = [hAt(x, za), hAt(x2, za), hAt(x2, zb), hAt(x, zb)], hm = Math.max(ha[0], ha[1], ha[2], ha[3]);
      if (hm < 0.12 && Math.min(ha[0], ha[1], ha[2], ha[3]) > -0.12) continue;       // flat ground: the v2 base
      const kind = worldTerrainKind(world, xm, zm), slope = Math.hypot((ha[1] - ha[0] + ha[2] - ha[3]) / (2 * (x2 - x)), (ha[3] - ha[0] + ha[2] - ha[1]) / (2 * (zb - za)));
      const m = _wtrMat(kind, slope);
      if (!m) continue;
      // the shade of the slope against a sun high on the left behind the eye (the light pass grades the colour by the real sun after)
      const gx = (ha[1] - ha[0] + ha[2] - ha[3]) / (2 * (x2 - x)), gz = (ha[3] - ha[0] + ha[2] - ha[1]) / (2 * (zb - za)), nl = Math.hypot(gx, gz, 1);
      const lam = (-gx * -0.45 + -gz * -0.4 + 1 * 0.8) / (nl * 1.0), shade = Math.max(0.6, Math.min(1.12, 0.78 + 0.34 * lam));
      // a few percent of variation along the strip (mowing, grazing) so a slope is never one flat tone
      const jit = 1 + 0.018 * Math.sin(xm * 0.37 + zm * 0.21) + 0.012 * Math.sin(xm * 1.3 - zm * 0.7);
      const P = [[x, za, ha[0]], [x2, za, ha[1]], [x2, zb, ha[2]], [x, zb, ha[3]]].map(p => { const q = sceneProject(cam, p[0], p[1], p[2]); return [q.X, q.Y]; });
      // a half scene unit of overlap so neighbouring quads never leave a seam
      const cx = (P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, cy = (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4;
      const pts = P.map(q => { const dx = q[0] - cx, dy = q[1] - cy, L = Math.hypot(dx, dy) || 1; return [Math.round((q[0] + dx / L * 0.7) * 10) / 10, Math.round((q[1] + dy / L * 0.7) * 10) / 10]; });
      for (const q of pts) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }
      hi = Math.max(hi, hm); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x2);
      faces.push({ pts, role: 'ground', mat: m.mat, hex: _wtrShade(m.hex, shade * jit), z: zm, alpha: 1 });
    }
    if (!faces.length) continue;
    out.push({ id: 'terrain-' + k, kind: 'line', sub: 'terrain', lineKind: 'terrain', box: [minX, minY, maxX, maxY], zKey: za, foot: [[xmin, za], [xmax, za], [xmax, zb], [xmin, zb]], height: Math.max(0.3, hi), solidity: 'passable', faces, mat: 'grass' });
  }
  // far first: the nearer rise is drawn over what lies behind it
  out.sort((a, b) => b.zKey - a.zKey);
  return out;
}
