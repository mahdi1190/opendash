/* ============================================================
   WORLD ENGINE (scene format v3): MARSH, a reed bed with its boardwalk (SCENE_LESSONS T). PURE classic script, private prefix
   _wmh. Nothing runs at load. The marsh is to wet ground what the cliff (79-world-4cliff.js) is to a rock face: a scene gives a
   boardwalk and a few numbers and gets the whole wetland, none of it a ruled polygon.

     worldMarsh({ walk: [[x, z], ...],  the boardwalk's centre line (camera metres), land at its start
                  width: 1.6,           deck width
                  id: 'marsh',          prefix of every id it makes
                  seed: 1,
                  from: 0,              metres along the walk where the wet ground begins (the walk before it stays on the carr)
                  reach: 9,             metres of marsh each side of the walk (it varies 0.3 .. 1.35 x along the walk)
                  open: 0.45,           0 .. 1: how much of the marsh is open water between the stands (channels and pools)
                  density: 1,           the reeds' density
                  water: 'pond',        the kind of the open water
                  rails: true,          timber posts and rails along the walk (and round the platform), nowhere else
                  platform: { size: [3.6, 4.4], bench: true } | false })   at the end of the walk, on reed ground
       -> { surfaces, lines, entities, walk, deck, report }

   What it makes (listed in the order a scene must keep, water first so the stands win over it):
     - ONE water: the marsh band, an organic outline (smooth lobes and bays, round ends), merging with whatever water it touches
     - the SPINE: the wet ground under the walk, a soft-edged band that narrows and widens (reeds close in on both sides)
     - ISLANDS: wet-ground blobs (radial noise, elongated along the walk, never a rectangle) with a channel of open water between
       every two of them and between them and the spine
     - the PLANTS as clusters: reed in stands (with reedmace and sedge, a little loosestrife), reedmace along the water margin,
       lilies on the open water, litter and wet patches (mud) at the island toes
     - the WALK (boardwalk), its rails (fence lines on both sides) and the PLATFORM (a deck at the reed edge: rails on its three
       outer sides, a bench looking out). No rail runs anywhere else.
   Every outline is a smooth curve (Catmull-Rom through noise-driven points), and the engine's own natural-edge pass
   (_wcNaturalEdge) roughens the reeds and pond polygons again when the world is built. Deterministic from the seed.
   ============================================================ */
const _wmhNum = v => typeof v === 'number' && Number.isFinite(v);
const _wmhR = v => Math.round(v * 100) / 100;
const _wmhClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function _wmhRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Lattice noise in -1..1 and its smooth interpolation (cubic) along one axis. */
function _wmhLat(seed, i) { let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295 * 2 - 1; }
function _wmhN(seed, x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return _wmhLat(seed, i) * (1 - u) + _wmhLat(seed, i + 1) * u; }
function _wmhArea(P) { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); }
/** The centre line resampled every `step` metres: { pts: [{ s, x, z, tx, tz, nx, nz }], L }; n is the right-hand normal. */
function _wmhPath(P, step) {
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.ceil(L / step)), pts = [];
  for (let k = 0; k <= n; k++) {
    const s = L * k / n;
    let j = 1;
    while (j < P.length - 1 && cum[j] < s) j++;
    const a = P[j - 1], b = P[j], t = _wmhClamp((s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]), 0, 1);
    pts.push({ s, x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t });
  }
  for (let k = 0; k < pts.length; k++) {
    const p = pts[Math.max(0, k - 1)], q = pts[Math.min(pts.length - 1, k + 1)], tx = q.x - p.x, tz = q.z - p.z, m = Math.hypot(tx, tz) || 1;
    pts[k].tx = tx / m; pts[k].tz = tz / m; pts[k].nx = tz / m; pts[k].nz = -tx / m;
  }
  return { pts, L };
}
/** A closed curve through control points (Catmull-Rom), a point every `step` metres at most: a smooth organic outline. */
function _wmhSmooth(P, step) {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n], m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(c => _wmhR(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))));
    }
  }
  return out;
}
/** A band round a centre line: half-widths dl(s) to the left and dr(s) to the right, round ends of `cap0` and `cap1` metres. */
function _wmhBand(pts, dl, dr, cap0, cap1, step) {
  const L = [], R = [], n = pts.length, ctl = [];
  for (let k = 0; k < n; k += 1) { const p = pts[k]; L.push([p.x - p.nx * dl(p.s), p.z - p.nz * dl(p.s)]); R.push([p.x + p.nx * dr(p.s), p.z + p.nz * dr(p.s)]); }
  const cap = (p, cp, dirSign, thetas) => thetas.map(th => {
    const c = Math.cos(th), lat = -(c >= 0 ? dl(p.s) : dr(p.s)) * c, fw = dirSign * cp * Math.sin(th);
    return [p.x + p.nx * lat + p.tx * fw, p.z + p.nz * lat + p.tz * fw];
  });
  for (const q of L) ctl.push(q);
  for (const q of cap(pts[n - 1], cap1, 1, [Math.PI * 0.2, Math.PI * 0.5, Math.PI * 0.8])) ctl.push(q);
  for (let k = n - 1; k >= 0; k--) ctl.push(R[k]);
  for (const q of cap(pts[0], cap0, -1, [Math.PI * 0.8, Math.PI * 0.5, Math.PI * 0.2])) ctl.push(q);
  return _wmhSmooth(ctl, step || 1.2);
}
/** An island: a closed blob (radial noise, two lobes, elongated along `ang`), smoothed. */
function _wmhBlob(cx, cz, rx, rz, ang, rnd, seed) {
  const n = 12, ctl = [], ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = 1 + 0.28 * Math.sin(2 * a + ph[0]) + 0.17 * Math.sin(3 * a + ph[1]) + 0.1 * Math.sin(5 * a + ph[2]) + 0.12 * (rnd() - 0.5);
    const u = Math.cos(a) * rx * r, v = Math.sin(a) * rz * r;
    ctl.push([cx + u * c - v * s, cz + u * s + v * c]);
  }
  return _wmhSmooth(ctl, 0.9);
}
const _wmhInPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

function worldMarsh(o) {
  o = o && typeof o === 'object' ? o : {};
  const walk = Array.isArray(o.walk) ? o.walk.filter(p => Array.isArray(p) && _wmhNum(p[0]) && _wmhNum(p[1])).map(p => [p[0], p[1]]) : [];
  if (walk.length < 2) return { surfaces: [], lines: [], entities: [], walk: null, deck: null, report: { error: 'a marsh needs a walk of two points or more' } };
  const id = typeof o.id === 'string' && o.id ? o.id : 'marsh', seed = (o.seed | 0) || 1, width = _wmhNum(o.width) && o.width > 0.6 ? o.width : 1.6;
  const reach = _wmhNum(o.reach) && o.reach > 2 ? Math.min(o.reach, 40) : 9, open = _wmhClamp(_wmhNum(o.open) ? o.open : 0.45, 0, 1), dens = _wmhClamp(_wmhNum(o.density) ? o.density : 1, 0.2, 3);
  const from = _wmhNum(o.from) ? Math.max(0, o.from) : 0, waterKind = typeof o.water === 'string' ? o.water : 'pond', rails = o.rails !== false;
  const plat = o.platform === false ? null : Object.assign({ size: [3.6, 4.4], bench: true }, o.platform && typeof o.platform === 'object' ? o.platform : {});
  const rnd = _wmhRng(seed * 7919 + 13), surfaces = [], lines = [], entities = [], report = { islands: 0, plants: 0, water: 0 };
  const { pts, L } = _wmhPath(walk, 1.2), last = pts[pts.length - 1], first = pts[0];

  // the platform: a deck on the line of the walk's last leg, its far side the reed edge
  let deck = null;
  const ext = plat ? plat.size[1] : 0, endX = last.x + last.tx * ext, endZ = last.z + last.tz * ext;
  // the marsh's own extent: from `from` to the platform's far side and a little beyond (open water, reeds at its far edge)
  const sIn = pts.filter(p => p.s >= from - 0.01);
  const sp = sIn.length >= 2 ? sIn : pts;
  const reachAt = (seedK, s) => reach * _wmhClamp(0.62 + 0.5 * _wmhN(seed * 3 + seedK, s / 10) + 0.22 * _wmhN(seed * 5 + seedK, s / 3.7 + 11) + 0.12 * _wmhN(seed * 7 + seedK, s / 1.5 + 23), 0.3, 1.35);
  const capEnd = reach * 0.75 + ext, capStart = Math.min(reach * 0.45, 4);
  const outline = _wmhBand(sp, s => reachAt(1, s), s => reachAt(2, s), capStart, capEnd, 1.4);
  const waterId = id + '-water';
  surfaces.push({ id: waterId, kind: 'water', water: waterKind, shallow: 0.9, poly: outline });
  report.water = Math.round(_wmhArea(outline));

  // the spine: wet ground under and beside the walk; it closes in on the deck and breathes along it
  const spineHalf = s => width / 2 + 0.5 + 0.55 * (0.5 + 0.5 * _wmhN(seed + 31, s / 5)) + 0.35 * Math.abs(_wmhN(seed + 32, s / 2.2)) + 0.24 * _wmhN(seed + 33, s / 1.3 + 5);
  const spineExt = plat ? Math.min(ext * 0.85, 4) : 1.2;
  const spine = _wmhBand(sp, s => spineHalf(s), s => spineHalf(s + 7), 0.35, spineExt + 1.2, 0.9);
  const spineId = id + '-spine';

  // the islands: stations along the walk, both sides, a channel of open water between any two and between each and the spine
  const gap = 0.55 + 1.7 * open, isles = [];
  const edgeOf = (cx, cz) => { let best = Infinity; for (const p of sp) { const d = Math.hypot(p.x - cx, p.z - cz); if (d < best) best = d; } return best; };
  const ok = (cx, cz, R) => {
    for (const q of isles) if (Math.hypot(q.cx - cx, q.cz - cz) < q.R + R + gap) return false;
    return edgeOf(cx, cz) > spineHalf(0) + 1.0 + gap * 0.4 + R * 0.5;
  };
  const step0 = 2.2 + 2.0 * open;
  for (let s = from - 2; s < L + capEnd * 0.9 + 1; s += step0 * (0.7 + 0.7 * rnd())) {
    for (const side of [-1, 1]) {
      for (let tries = 0; tries < 4; tries++) {
        const sc = _wmhClamp(s, 0, L), k = _wmhClamp(Math.round(sc / (L / (pts.length - 1))), 0, pts.length - 1), p = pts[k];
        const beyond = s > L ? s - L : 0;
        const room = (side < 0 ? reachAt(1, sc) : reachAt(2, sc)) * (beyond ? 0.9 : 1);
        const r = (0.6 + rnd() * (0.7 + 0.4 * (1 - open))) * _wmhClamp(room / reach, 0.6, 1.2);
        const rx = r * (1.2 + rnd() * 0.6), rz = r * (0.8 + rnd() * 0.3), R = Math.max(rx, rz) * 1.3;
        const latMin = spineHalf(0) + 1.1 + gap * 0.5 + R * 0.55;
        if (latMin > room) continue;
        const lat = latMin + rnd() * Math.max(0, room - latMin - R * 0.2);
        const cx = p.x + p.tx * beyond + p.nx * side * lat, cz = p.z + p.tz * beyond + p.nz * side * lat;
        if (!ok(cx, cz, R)) continue;
        // never on the platform's ground
        if (plat && Math.hypot(cx - last.x - last.tx * ext * 0.5, cz - last.z - last.tz * ext * 0.5) < ext * 0.5 + width + R * 0.7) continue;
        isles.push({ cx, cz, r, R, poly: _wmhBlob(cx, cz, rx, rz, Math.atan2(p.tz, p.tx) + (rnd() - 0.5) * 0.6, rnd, seed) });
        break;
      }
    }
  }
  isles.forEach((q, i) => { q.id = `${id}-isle-${i}`; surfaces.push({ id: q.id, kind: 'reeds', poly: q.poly }); });
  report.islands = isles.length;
  surfaces.push({ id: spineId, kind: 'reeds', poly: spine });

  // the walk and its rails
  const walkId = id + '-walk';
  surfaces.push({ id: walkId, kind: 'boardwalk', path: walk.map(p => [p[0], p[1]]), width });
  if (plat) {
    const w = plat.size[0], x0 = last.x - last.tx * 0.6, z0 = last.z - last.tz * 0.6;
    deck = { id: id + '-deck', kind: 'deck', path: [[_wmhR(x0), _wmhR(z0)], [_wmhR(endX), _wmhR(endZ)]], width: w };
    surfaces.push(deck);
  }
  if (rails) {
    const off = width / 2 + 0.08, rs = pts.filter(p => p.s >= Math.min(L, 2.5) && p.s <= L - (plat ? 0.4 : 0));
    if (rs.length >= 2) for (const sg of [-1, 1]) lines.push({ id: `${id}-rail-${sg < 0 ? 'l' : 'r'}`, kind: 'fence', h: 1.0, width: 0.16, path: rs.map(p => [_wmhR(p.x + p.nx * sg * off), _wmhR(p.z + p.nz * sg * off)]) });
    if (plat) {
      // three sides, each its own line and a post's length short of the next (corner pieces never overlap)
      const w = plat.size[0], d = plat.size[1], hw = w / 2, cut = 0.2;
      const P = (u, v) => [_wmhR(last.x + last.nx * u + last.tx * v), _wmhR(last.z + last.nz * u + last.tz * v)];
      lines.push({ id: id + '-rail-pl', kind: 'fence', h: 1.0, width: 0.16, path: [P(-hw, 0.9), P(-hw, d - cut)] });
      lines.push({ id: id + '-rail-pf', kind: 'fence', h: 1.0, width: 0.16, path: [P(-hw + cut, d), P(hw - cut, d)] });
      lines.push({ id: id + '-rail-pr', kind: 'fence', h: 1.0, width: 0.16, path: [P(hw, d - cut), P(hw, 0.9)] });
      if (plat.bench !== false) { const bx = last.x + last.tx * (d - 0.7), bz = last.z + last.tz * (d - 0.7); entities.push({ obj: 'street.bench', at: [_wmhR(bx), _wmhR(bz)], facing: _wmhR(Math.atan2(last.tx, last.tz) * 180 / Math.PI), id: id + '-bench' }); }
    }
  }

  // the plants: clusters on the spine and on every island (reed in stands, reedmace and sedge among it), reedmace round the
  // margin of the open water, lilies on it, litter and wet patches (mud) at the island toes
  const cl = (obj, on, n, extra) => { if (n >= 1) { entities.push(Object.assign({ cluster: obj, on, n: Math.round(n), seed: 1 + Math.floor(rnd() * 9000) }, extra || {})); report.plants += Math.round(n); } };
  const mix = (on, area, k) => {
    const n = Math.max(4, area * k * dens);
    cl('plant.reed', on, n * 0.66);
    cl('plant.bulrush', on, n * 0.18);
    cl('plant.grass-long', on, n * 0.16);
    if (rnd() < 0.5) cl('plant.canal-view-loosestrife', on, Math.max(1, n * 0.08));
  };
  mix(spineId, _wmhArea(spine), 1.5);
  for (const q of isles) mix(q.id, _wmhArea(q.poly), 1.9);
  cl('plant.bulrush', waterId, Math.min(120, 8 + report.water / 14 * dens), { edge: true });
  cl('water.lily', waterId, _wmhClamp(report.water * 0.1, 6, 46));
  for (const q of isles) if (rnd() < 0.5) cl(rnd() < 0.5 ? 'ground.puddle' : 'ground.leaf-litter', q.id, 2 + rnd() * 3);
  cl('ground.leaf-litter', spineId, 4 + _wmhArea(spine) / 12);
  return { surfaces, lines, entities, walk: walkId, deck: deck ? deck.id : null, report };
}
