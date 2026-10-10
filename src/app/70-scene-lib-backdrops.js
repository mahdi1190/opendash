/* ============================================================
   SCENE ENGINE v2: the BACKDROP (an engine default). Scenes used to draw only their near subject and leave the horizon as
   bare sky; real places show layer on layer of buildings, chimneys, spires, towers, trees and hills behind. Every v2 scene
   now gets 3 to 5 depth bands of place-styled silhouettes that fade into the haze, generated here from the camera.
   PURE classic script: data and functions only, nothing runs at load. Private names: _scbd.

   A scene declares at most   backdrop: { style: 'sheffield' }   (or false / 'none' to switch it off); otherwise the style
   is inferred from the camera's lat / lon, then the scene's id / county / town words, then its setting. A scene never
   draws its own skyline any more.

   SCENE_BACKDROP_STYLES      the place styles as data (bands, hills, building mix, palette, landmarks, far ridge)
   sceneBackdropStyleOf(data, cam)   -> a style id | null
   sceneBackdropItems(G, season)     -> compiled `direct` items (one per band; shapes only, no sprites), farthest first
   sceneBackdropApply(G, C)          the compile hook (70-scene-1ground.js sceneCompileV2Finish): items at the front of
                                     C.items (drawn first in the horizon layer), then the emptyBackdrop lint
   Season: the trees and hills take the compiled season. Night: window shapes are `glow: 'win'` (lit by the engine's
   window share after dusk). Haze: each band carries its depth (dz), so the atmosphere pass hazes it (7.1).
   Landmarks sit at their real bearing and distance when the camera has lat / lon (and heading); otherwise only the
   generic vernacular is drawn.
   ============================================================ */

const _SCBD_SEASON_TREES = Object.freeze({
  spring: ['#8fb06a', '#7ea25c', '#a2be7d', '#6f9452'],
  summer: ['#5f8048', '#4f7040', '#6c8c52', '#56783f'],
  autumn: ['#a07a3c', '#8c5a32', '#b08d48', '#6f7444', '#9a6a3a'],
  winter: ['#857a70', '#776e66', '#8d847a', '#7c7470'],
});
const _SCBD_CONIFER = '#47604a';
const _SCBD_HILL = Object.freeze({ spring: '#8aa96c', summer: '#7d9a62', autumn: '#93905e', winter: '#8e9089' });
const _SCBD_FADE = '#b8c5ce';

/** The place styles. bands: depths (m); hill: the hill amplitude per band (m); dens: the built share per band; mix: type weights. */
const SCENE_BACKDROP_STYLES = Object.freeze({
  sheffield: { kind: 'city', vx: 1.5, bands: [680, 1300, 2400, 4800], hill: [18, 60, 120, 190], dens: [0.7, 0.78, 0.8, 0.6], woodTop: 0.6, rows: [1, 2, 3, 4],
    mix: { terrace: 6, mill: 2.2, chimney: 1.4, church: 0.6, towerBlock: 1.2, crane: 0.3, trees: 1.4, works: 1.2 },
    pal: { brick: ['#8a4a3a', '#7d4434', '#94553f', '#6f3d31', '#9b5f48'], stone: ['#9a8f7c', '#857b69', '#a39884'], roof: ['#4b4b52', '#57565c', '#5e5550'], concrete: ['#aaa69d', '#9b978e'], glass: ['#73889a', '#62788a'], win: '#2e3740' },
    landmarks: [
      { id: 'park-hill', lat: 53.3787, lon: -1.4598, elev: 95, h: 40, w: 290, draw: 'parkHill' },
      { id: 'st-pauls-tower', lat: 53.37865, lon: -1.4693, elev: 75, h: 101, w: 24, draw: 'stPauls' },
      { id: 'arts-tower', lat: 53.3818, lon: -1.4870, elev: 112, h: 78, w: 36, draw: 'artsTower' },
      { id: 'cathedral', lat: 53.3831, lon: -1.4700, elev: 78, h: 48, w: 30, draw: 'spire' },
    ] },
  manchester: { kind: 'city', bands: [600, 1200, 2300, 4800], hill: [1, 3, 6, 10], dens: [0.82, 0.86, 0.86, 0.7], rows: [1, 2, 2, 2],
    mix: { mill: 4, warehouse: 3, terrace: 1.5, civic: 1.4, chimney: 0.6, glass: 2.4, towerBlock: 1, crane: 0.7, trees: 0.8, church: 0.3 },
    pal: { brick: ['#8e4636', '#7a3c30', '#9c5240', '#843f31'], stone: ['#b3a58c', '#a39678', '#c0b498'], roof: ['#4c4d55', '#55565e'], concrete: ['#a9a7a0', '#98968f'], glass: ['#6f8494', '#5e7383', '#8396a3', '#4f6577'], win: '#2c353e' },
    ridge: { from: 25, to: 135, d: 22000, h: 330 },
    landmarks: [
      { id: 'beetham-tower', lat: 53.4762, lon: -2.2522, elev: 0, h: 169, w: 28, draw: 'beetham' },
      { id: 'deansgate-square', lat: 53.4728, lon: -2.2510, elev: 0, h: 201, w: 26, draw: 'deansgateSq' },
      { id: 'cis-tower', lat: 53.4873, lon: -2.2393, elev: 0, h: 118, w: 34, draw: 'cis' },
      { id: 'town-hall', lat: 53.47945, lon: -2.2446, elev: 0, h: 87, w: 12, draw: 'clockTower' },
    ] },
  'hampshire-heath': { kind: 'nature', vx: 2.6, bands: [600, 1400, 3200, 8500], hill: [2, 6, 16, 55], trees: 'heath', village: 0.25, hedge: false },
  'hampshire-village': { kind: 'nature', vx: 1.6, bands: [450, 1100, 2600, 7500], hill: [3, 8, 20, 50], trees: 'oak', village: 1, hedge: true,
    pal: { brick: ['#9a5a44', '#8c4f3b', '#a5664d'], stone: ['#8e8a80', '#d8cfbd'], roof: ['#7a4a38', '#6b3f30', '#5a4a44'], win: '#2f363c' } },
  'lowland-woodland': { kind: 'nature', vx: 1.6, bands: [600, 1500, 3400, 9000], hill: [3, 12, 32, 85], trees: 'mixed', village: 0.45, hedge: true },
  'generic-uk-town': { kind: 'city', bands: [480, 1050, 2300, 6000], hill: [4, 12, 30, 70], dens: [0.62, 0.7, 0.72, 0.5], woodTop: 0.75, rows: [1, 2, 2, 2],
    mix: { terrace: 4, house: 3, church: 0.7, towerBlock: 0.4, mill: 0.6, trees: 2.2, crane: 0.15, civic: 0.4 },
    pal: { brick: ['#93543f', '#86503e', '#a0644c'], stone: ['#a79e8c', '#cfc6b4'], roof: ['#4f4f57', '#6b4436', '#5b5257'], concrete: ['#aaa69d'], glass: ['#7890a0'], win: '#2e3740' } },
  'generic-city': { kind: 'city', bands: [500, 1100, 2400, 6000], hill: [1, 3, 8, 40], dens: [0.8, 0.84, 0.82, 0.6], rows: [1, 2, 2, 2],
    mix: { glass: 3, towerBlock: 2.5, civic: 1, warehouse: 1, trees: 1, crane: 0.5 },
    pal: { brick: ['#9a6a55', '#8c5e4c'], stone: ['#b9b09e', '#a9a291'], roof: ['#55565e'], concrete: ['#a8a7a2', '#9c9a94', '#b4b2ab'], glass: ['#7890a0', '#647c8c', '#8aa0ae'], win: '#2c353e' } },
  'distant-hills': { kind: 'nature', bands: [2600, 7500], hill: [40, 140], trees: 'mixed', village: 0, hedge: false },
});

/* ---------- small helpers ---------- */
const _scbdF = v => Math.round(v * 10) / 10;
function _scbdRnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _scbdHex(c) { const h = String(c).replace('#', ''); return h.length === 3 ? h.split('').map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function _scbdMix(a, b, t) { const A = _scbdHex(a), B = _scbdHex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** Smooth 1D value noise in [0, 1] (cosine interpolation), and three octaves of it. */
const _scbdLat = new Map();
function _scbdNoise(seed, x) {
  const i = Math.floor(x), f = x - i, u = (1 - Math.cos(f * Math.PI)) / 2;
  const h = (n) => { const key = seed + ':' + n; let v = _scbdLat.get(key); if (v === undefined) { if (_scbdLat.size > 50000) _scbdLat.clear(); v = (sceneHash(key) % 10007) / 10006; _scbdLat.set(key, v); } return v; };
  return h(i) * (1 - u) + h(i + 1) * u;
}
function _scbdFbm(seed, x) { return (_scbdNoise(seed, x) * 0.6 + _scbdNoise(seed + 'b', x * 2.3) * 0.28 + _scbdNoise(seed + 'c', x * 5.1) * 0.12); }
function _scbdPick(rnd, a) { return a[Math.floor(rnd() * a.length) % a.length]; }
function _scbdWeighted(rnd, mix) { const e = Object.entries(mix); let t = rnd() * e.reduce((s, [, w]) => s + w, 0); for (const [k, w] of e) { t -= w; if (t <= 0) return k; } return e[0][0]; }
let _scbdTop = Infinity;   // the highest row drawn in the band being built (its bake box)
let _scbdCols = new Float32Array(100);   // per 16-unit column: the highest row drawn (the emptyBackdrop lint)
function _scbdColMark(x0, x1, y) { for (let i = Math.max(0, Math.floor(x0 / 16)); i <= Math.min(99, Math.floor(x1 / 16)); i++) if (y < _scbdCols[i]) _scbdCols[i] = y; }
const _scbdRect = (x, y, w, h) => { _scbdTop = Math.min(_scbdTop, y, y + h); _scbdColMark(Math.min(x, x + w), Math.max(x, x + w), Math.min(y, y + h)); return `M${_scbdF(x)} ${_scbdF(y)}h${_scbdF(w)}v${_scbdF(h)}h${_scbdF(-w)}z`; };
const _scbdPoly = (P) => { for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; if (p[1] < _scbdTop) _scbdTop = p[1]; _scbdColMark(Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.max(p[1], q[1])); } return 'M' + P.map(p => _scbdF(p[0]) + ' ' + _scbdF(p[1])).join('L') + 'z'; };

/* ---------- the style of a scene ---------- */
const _SCBD_BOX = [
  ['sheffield', 53.30, 53.45, -1.60, -1.35], ['manchester', 53.40, 53.54, -2.36, -2.12],
  ['hampshire', 50.70, 51.40, -1.95, -0.72],
];
/** The backdrop style of a scene: the declared one, else from lat / lon, the scene's words, its setting. null = none. */
function sceneBackdropStyleOf(data, cam) {
  data = data || {}; cam = cam || {};
  const b = data.backdrop;
  if (b === false || b === 'none' || (b && b.style === 'none')) return null;
  if (typeof b === 'string' && SCENE_BACKDROP_STYLES[b]) return b;
  if (b && typeof b === 'object' && SCENE_BACKDROP_STYLES[b.style]) return b.style;
  if (data.paint && data.paint.back) return null;
  const v = data.view || {}, sky = data.liveSky || {};
  const lat = [cam.lat, v.lat, sky.lat, data.lat].find(Number.isFinite), lon = [cam.lon, v.lon, sky.lon, data.lon].find(Number.isFinite);
  const urban = /urban|city|town|street|suburb|village|civic|industrial/.test(String(data.setting || ''));
  const words = [data.id, data.county, data.town, data.ukTown, data.ukPlace, data.place, data.region, data.label, data.site].filter(Boolean).join(' ').toLowerCase();
  let place = null;
  if (Number.isFinite(lat) && Number.isFinite(lon)) for (const [id, a, b2, c, d] of _SCBD_BOX) if (lat >= a && lat <= b2 && lon >= c && lon <= d) { place = id; break; }
  if (!place) place = /sheffield|kelham|south-yorkshire/.test(words) ? 'sheffield' : /manchester|castlefield|salford/.test(words) ? 'manchester' : /hampshire|yateley|fleet|wyndham|basingstoke/.test(words) ? 'hampshire' : null;
  const uk = place || (Number.isFinite(lat) ? lat > 49.8 && lat < 61 && lon > -8.7 && lon < 2 : /\buk\b|england|scotland|wales|-shire|yorkshire|london/.test(words));
  if (place === 'sheffield') return 'sheffield';
  if (place === 'manchester') return urban ? 'manchester' : 'generic-uk-town';
  if (place === 'hampshire') return urban ? 'hampshire-village' : 'hampshire-heath';
  if (uk) return urban ? 'generic-uk-town' : 'lowland-woodland';
  return urban ? 'generic-city' : 'distant-hills';
}

/* ---------- the band painter: shapes by tier and colour, windows in glow groups ---------- */
const _SCBD_TIERS = ['ridge', 'hill', 'tall', 'tallW', 'mid', 'midW', 'low', 'lowW', 'tree'];
function _scbdBand() {
  const g = {};
  for (const t of _SCBD_TIERS) g[t] = new Map();
  return {
    add(tier, col, d, op) { const m = g[tier], k = col + '|' + (op || 1); m.set(k, (m.get(k) || '') + d); },
    win(tier, grp, d) { this.add(tier + 'W', 'g' + grp, d); },
    shapes(winCol) {
      const out = [];
      for (const t of _SCBD_TIERS) for (const [k, d] of g[t]) {
        const [col, op] = k.split('|');
        if (col[0] === 'g') out.push({ f: winCol, d, glow: 'win' });
        else out.push(op !== '1' ? { f: col, d, op: +op } : { f: col, d });
      }
      return out;
    },
  };
}

/* ---------- trees: a canopy mass from crowns (one path per colour) ---------- */
/** crowns: [{ x, r, ry, top }] (units). Returns the outline polygon of their union down to base(x) + 2. */
function _scbdCanopy(crowns, base, step) {
  if (!crowns.length) return null;
  let x0 = Infinity, x1 = -Infinity;
  for (const c of crowns) { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); }
  step = Math.max(0.8, step || 1.5);
  const n = Math.ceil((x1 - x0) / step) + 1, top = new Float32Array(n).fill(Infinity);
  for (const c of crowns) {
    const i0 = Math.max(0, Math.floor((c.x - c.r - x0) / step)), i1 = Math.min(n - 1, Math.ceil((c.x + c.r - x0) / step));
    for (let i = i0; i <= i1; i++) { const dx = x0 + i * step - c.x; if (Math.abs(dx) > c.r) continue; const y = c.top + c.ry - c.ry * Math.sqrt(1 - (dx * dx) / (c.r * c.r)); if (y < top[i]) top[i] = y; }
  }
  // runs of covered columns, each a polygon
  const polys = [];
  let run = null;
  for (let i = 0; i < n; i++) {
    const X = x0 + i * step;
    if (top[i] < Infinity) { if (!run) run = []; run.push([X, top[i]]); }
    if ((top[i] === Infinity || i === n - 1) && run) { if (run.length > 1) { const a = run[0][0], b = run[run.length - 1][0]; run.push([b, base(b) + 2], [a, base(a) + 2]); polys.push(run); } run = null; }
  }
  return { d: polys.map(_scbdPoly).join(''), x0, x1, top, step };
}
function _scbdTreeCols(season, rnd, kind) {
  const cols = (_SCBD_SEASON_TREES[season] || _SCBD_SEASON_TREES.summer).slice();
  if (kind === 'heath') cols.push(_SCBD_CONIFER, _SCBD_CONIFER);
  else if (kind === 'mixed' && rnd() < 0.7) cols.push(_SCBD_CONIFER);
  return cols;
}
/** A row of trees across [xa, xb] at band scale k (units / m), standing on base(X); heights h0..h1 m. */
function _scbdTrees(B, season, rnd, k, xa, xb, base, o) {
  o = o || {};
  const cols = _scbdTreeCols(season, rnd, o.kind), groups = new Map(), h0 = o.h0 || 9, h1 = o.h1 || 18, dens = o.dens == null ? 1 : o.dens;
  let x = xa;
  while (x < xb) {
    const r = k * (2.5 + rnd() * 3.5) * (o.kind === 'heath' ? 0.85 : 1), h = k * (h0 + rnd() * (h1 - h0));
    if (rnd() < dens) {
      const col = _scbdPick(rnd, cols), pine = o.kind === 'heath' && col === _SCBD_CONIFER;
      const ry = pine ? r * 0.45 : r * (0.75 + rnd() * 0.3);
      if (!groups.has(col)) groups.set(col, []);
      groups.get(col).push({ x, r, ry, top: base(x) - h });
      if (pine && k > 0.5) B.add('tree', '#4a3b30', _scbdRect(x - k * 0.25, base(x) - h + ry, Math.max(0.6, k * 0.5), h - ry), 1);
      if (pine && !o.noUnder) groups.get(col).push({ x: x + r * 0.6, r: r * 0.8, ry: r * 0.6, top: base(x) - h * 0.45 });
    }
    x += r * (o.gap || (0.9 + rnd() * 0.9));
  }
  const step = Math.max(1.4, k * 1.2);
  for (const [col, crowns] of groups) { const cn = _scbdCanopy(crowns, base, step); if (cn) B.add('tree', season === 'winter' && col !== _SCBD_CONIFER ? col : col, cn.d, season === 'winter' && col !== _SCBD_CONIFER ? 0.9 : 1); }
}

/* ---------- buildings (front elevations, metres scaled by k) ---------- */
/** Windows of a facade into glow groups: storeys every 3 m, bays every bay m; skipped when the band is too small to read. */
function _scbdWindows(B, tier, rnd, k, x, w, yBase, hm, o) {
  o = o || {};
  const st = o.storey || 3, bay = o.bay || 3.6, ww = k * (o.ww || 1.2), wh = k * (o.wh || 1.6);
  if (ww < 0.9) {   // far: a sparse dot grid that only shows at night (day: the facade tone)
    if (k < 0.45 || k * st < 1.6) return;
    for (let y = yBase - k * 2.2; y > yBase - k * (hm - 1.5); y -= k * st) for (let X = x + k * 1.5; X < x + w - k; X += k * bay * 2) if (rnd() < 0.55) B.win(tier, Math.floor(rnd() * 10), _scbdRect(X, y - 0.9, 0.9, 0.9));
    return;
  }
  const nb = Math.max(1, Math.floor(w / (k * bay))), pad = (w - nb * k * bay) / 2;
  for (let y = yBase - k * (o.sill || 1.6); y - wh > yBase - k * (hm - 0.8); y -= k * st) {
    const rowG = Math.floor(rnd() * 12);
    for (let i = 0; i < nb; i++) if (k >= 1.5 || rnd() < 0.45) B.win(tier, rnd() < 0.6 ? rowG : Math.floor(rnd() * 12), _scbdRect(x + pad + (i + 0.5) * k * bay - ww / 2, y - wh, ww, wh));
  }
}
const _scbdTall = { chimney: 1, towerBlock: 1, glass: 1, crane: 1, church: 1 };
/** One building of a type at X (units), its foot on base(X). Returns its width in units. */
function _scbdBuilding(B, type, S, rnd, k, X, base, ctx) {
  const P = S.pal, brick = _scbdPick(rnd, P.brick), roof = _scbdPick(rnd, P.roof), stone = _scbdPick(rnd, P.stone);
  const tier = _scbdTall[type] ? 'tall' : type === 'terrace' || type === 'house' ? 'low' : 'mid';
  const slope = (xa, xb) => Math.max(base(xa), base(xb), base((xa + xb) / 2)) + k * 0.5;
  const R = (a, b) => a + rnd() * (b - a);
  if (type === 'terrace') {
    // a run of houses stepping with the slope; chimney stacks on the party walls
    const n = 3 + Math.floor(rnd() * 9), fw = R(4.6, 5.8), hm = R(6.5, 8.5), w = n * fw * k;
    let x = X;
    const step = k < 0.9 ? n : Math.max(1, Math.round(n / (1 + Math.floor(rnd() * 3))));
    for (let i = 0; i < n; i += step) {
      const m = Math.min(step, n - i), ww = m * fw * k, y = slope(x, x + ww), h = hm * k, rh = k * R(2.2, 3.2);
      B.add('low', brick, _scbdRect(x, y - h, ww + 0.3, h + 3));
      B.add('low', roof, _scbdPoly([[x - k * 0.2, y - h], [x + k * 0.6, y - h - rh], [x + ww - k * 0.6, y - h - rh], [x + ww + k * 0.2, y - h]]));
      for (let j = 0; j <= m; j++) if (rnd() < 0.8 && (k >= 0.6 || j % 3 === 0)) B.add('low', _scbdMix(brick, '#3a2a24', 0.25), _scbdRect(x + j * fw * k - k * 0.6, y - h - rh - k * 1.6, k * 1.2, k * 1.8));
      _scbdWindows(B, 'low', rnd, k, x, ww, y, hm, { storey: 2.9, bay: fw / 2, ww: 1.1, wh: 1.5 });
      x += ww;
    }
    return w;
  }
  if (type === 'house') {
    const wm = R(8, 13), hm = R(5.5, 7), w = wm * k, y = slope(X, X + w), h = hm * k, rh = k * R(3, 4.5), body = rnd() < 0.3 ? stone : brick;
    B.add('low', body, _scbdRect(X, y - h, w, h + 3));
    B.add('low', roof, rnd() < 0.5 ? _scbdPoly([[X - k * 0.3, y - h], [X + w / 2, y - h - rh], [X + w + k * 0.3, y - h]]) : _scbdPoly([[X - k * 0.3, y - h], [X + k * 2, y - h - rh], [X + w - k * 2, y - h - rh], [X + w + k * 0.3, y - h]]));
    if (rnd() < 0.7) B.add('low', _scbdMix(body, '#3a2a24', 0.2), _scbdRect(X + w * R(0.2, 0.75), y - h - rh - k * 1.2, k * 1, k * 2));
    _scbdWindows(B, 'low', rnd, k, X, w, y, hm, { storey: 2.8, bay: 3.2 });
    return w + k * R(2, 6);
  }
  if (type === 'mill' || type === 'warehouse' || type === 'works') {
    const wm = type === 'works' ? R(30, 70) : R(28, 75), hm = type === 'works' ? R(9, 14) : R(15, 27), w = wm * k, y = slope(X, X + w), h = hm * k;
    const body = type === 'warehouse' && rnd() < 0.3 ? _scbdMix(brick, stone, 0.4) : brick;
    B.add('mid', body, _scbdRect(X, y - h, w, h + 3));
    if (type === 'works' || rnd() < 0.25) {   // north-light (sawtooth) roofs
      const n = Math.max(2, Math.round(wm / 7)), tw = w / n;
      const P2 = [[X, y - h]];
      for (let i = 0; i < n; i++) P2.push([X + i * tw, y - h - k * 3.5], [X + (i + 1) * tw, y - h]);
      P2.push([X + w, y - h]);
      B.add('mid', roof, _scbdPoly(P2));
    } else {
      B.add('mid', _scbdMix(body, '#2a2522', 0.25), _scbdRect(X - k * 0.4, y - h - k * 0.9, w + k * 0.8, k * 1));   // cornice / parapet
      if (rnd() < 0.35) B.add('mid', _scbdMix(body, '#2a2522', 0.3), _scbdRect(X + w * R(0.1, 0.7), y - h - k * 6, k * 5, k * 5.2));   // a stair tower / water tank
    }
    if (type !== 'works') _scbdWindows(B, 'mid', rnd, k, X, w, y, hm, { storey: 3.6, bay: 3.4, ww: 1.4, wh: 2 });
    return w + k * R(1, 8);
  }
  if (type === 'civic') {
    const wm = R(35, 70), hm = R(16, 24), w = wm * k, y = slope(X, X + w), h = hm * k;
    B.add('mid', stone, _scbdRect(X, y - h, w, h + 3));
    B.add('mid', roof, _scbdPoly([[X, y - h], [X + k * 3, y - h - k * 4], [X + w - k * 3, y - h - k * 4], [X + w, y - h]]));
    if (rnd() < 0.5) { const tx = X + w * R(0.35, 0.6), tw = k * R(7, 10), th = k * R(14, 26); B.add('mid', stone, _scbdRect(tx - tw / 2, y - h - th, tw, th)); B.add('mid', roof, _scbdPoly([[tx - tw / 2 - k * 0.5, y - h - th], [tx, y - h - th - k * R(6, 12)], [tx + tw / 2 + k * 0.5, y - h - th]])); }
    _scbdWindows(B, 'mid', rnd, k, X, w, y, hm, { storey: 4.2, bay: 3.8, ww: 1.3, wh: 2.4 });
    return w + k * R(2, 6);
  }
  if (type === 'chimney') {
    const hm = R(32, 62), bw = k * R(3.4, 5), y = base(X), h = hm * k, col = _scbdMix(brick, '#2e2420', 0.2);
    B.add('tall', col, _scbdPoly([[X - bw / 2, y + 2], [X - bw * 0.32, y - h], [X + bw * 0.32, y - h], [X + bw / 2, y + 2]]));
    B.add('tall', _scbdMix(col, '#1e1a18', 0.4), _scbdRect(X - bw * 0.4, y - h - k * 0.8, bw * 0.8, k * 1.4));
    return k * R(4, 14);
  }
  if (type === 'towerBlock') {
    const wm = R(18, 30), hm = R(34, 66), w = wm * k, y = slope(X, X + w), h = hm * k, col = _scbdPick(rnd, P.concrete || P.stone);
    B.add('tall', col, _scbdRect(X, y - h, w, h + 3));
    B.add('tall', _scbdMix(col, '#3a3a40', 0.35), _scbdRect(X + w * 0.3, y - h - k * 2.5, w * 0.4, k * 2.6));
    _scbdWindows(B, 'tall', rnd, k, X, w, y, hm, { storey: 2.8, bay: 3.2, ww: 1.4, wh: 1.4 });
    return w + k * R(6, 20);
  }
  if (type === 'glass') {
    const wm = R(24, 42), hm = R(36, 95), w = wm * k, y = slope(X, X + w), h = hm * k, col = _scbdPick(rnd, P.glass || P.concrete), top = rnd();
    const P2 = top < 0.25 ? [[X, y + 3], [X, y - h], [X + w, y - h - k * R(6, 14)], [X + w, y + 3]] : [[X, y + 3], [X, y - h], [X + w, y - h], [X + w, y + 3]];
    B.add('tall', col, _scbdPoly(P2));
    B.add('tall', _scbdMix(col, '#ffffff', 0.18), _scbdRect(X + w * 0.08, y - h + k, Math.max(0.6, w * 0.12), h - k));
    _scbdWindows(B, 'tall', rnd, k, X, w, y, hm, { storey: 3.4, bay: 2.6, ww: 1.8, wh: 1.8 });
    return w + k * R(4, 18);
  }
  if (type === 'church') {
    const nw = R(18, 28), nh = R(9, 13), tw = R(6, 8), th = R(18, 26), sp = rnd() < 0.6 ? R(14, 26) : 0, y = slope(X, X + (nw + tw) * k);
    const c = stone;
    B.add('mid', c, _scbdRect(X, y - nh * k, nw * k, nh * k + 3));
    B.add('mid', roof, _scbdPoly([[X, y - nh * k], [X + k * 2, y - nh * k - k * 5], [X + nw * k - k * 2, y - nh * k - k * 5], [X + nw * k, y - nh * k]]));
    const tx = X + nw * k;
    B.add('tall', c, _scbdRect(tx, y - th * k, tw * k, th * k + 3));
    if (sp) B.add('tall', _scbdMix(c, '#3a3632', 0.25), _scbdPoly([[tx - k * 0.2, y - th * k], [tx + tw * k / 2, y - (th + sp) * k], [tx + tw * k + k * 0.2, y - th * k]]));
    else for (let i = 0; i < 4; i++) B.add('tall', c, _scbdRect(tx + i * tw * k / 3.5, y - th * k - k * 1.4, tw * k / 7, k * 1.5));
    return (nw + tw) * k + k * R(6, 16);
  }
  if (type === 'crane') {
    const hm = R(45, 75), jib = R(35, 60), y = base(X), h = hm * k, col = rnd() < 0.6 ? '#d8a63a' : '#c9c4b8', t = Math.max(0.7, k * 1.4);
    B.add('tall', col, _scbdRect(X - t / 2, y - h, t, h + 2));
    const dir = rnd() < 0.5 ? -1 : 1, ja = X - dir * jib * 0.28 * k, jb = X + dir * jib * k;
    B.add('tall', col, _scbdRect(Math.min(ja, jb), y - h - t, Math.abs(jb - ja), Math.max(0.6, t * 0.7)));
    B.add('tall', col, _scbdPoly([[X - t / 2, y - h - t], [X, y - h - k * 7], [X + t / 2, y - h - t]]));
    B.add('tall', '#4a4a4e', _scbdRect(ja - (dir < 0 ? 0 : k * 3), y - h, k * 3, k * 2));
    return k * R(15, 40);
  }
  return k * 10;
}

/* ---------- landmarks: drawn at their real bearing, distance and height ---------- */
const _SCBD_LANDMARK_DRAW = {
  parkHill(B, k, X, y, L, rnd, S) {   // the long deck-access slab: roofline level while the hill falls, coloured spandrel panels
    const w = L.w * k, cols = ['#c0533a', '#d98b3a', '#e2c044', '#8fae4c'], c = '#b7b2a6';
    const P = [[X - w / 2, y + 3], [X - w / 2, y - k * 13], [X - w * 0.1, y - k * 13], [X - w * 0.1, y - k * 22], [X + w * 0.25, y - k * 30], [X + w / 2, y - k * 40], [X + w / 2, y + 3]];
    B.add('tall', c, _scbdPoly(P));
    for (let f = 1; f < 13; f++) for (let x = X - w / 2 + k * 2; x < X + w / 2 - k * 2; x += k * 8) {
      const top = x < X - w * 0.1 ? 13 : x < X + w * 0.25 ? 22 + (x - X + w * 0.1) / (w * 0.35) * 8 : 30 + (x - X - w * 0.25) / (w * 0.25) * 10;
      if (f * 3 > top - 1) continue;
      if (rnd() < 0.5) B.add('tall', cols[(f + Math.floor(x)) % 4], _scbdRect(x, y - k * f * 3, k * 3, k * 1.2));
      else B.win('tall', Math.floor(rnd() * 12), _scbdRect(x, y - k * f * 3, k * 3, k * 1.2));
    }
  },
  stPauls(B, k, X, y, L) { const w = L.w * k, h = L.h * k; B.add('tall', '#d9dcdc', _scbdRect(X - w / 2, y - h, w, h + 3)); B.add('tall', '#7a95a8', _scbdRect(X - w * 0.3, y - h + k * 3, w * 0.6, h - k * 3)); B.add('tall', '#e8eaea', _scbdRect(X - w / 2 - k, y - h - k * 2, w + 2 * k, k * 2.5)); for (let f = 2; f < L.h / 3.2; f++) B.win('tall', f % 12, _scbdRect(X - w * 0.28, y - k * f * 3.2, w * 0.56, k * 1.4)); },
  artsTower(B, k, X, y, L) { const w = L.w * k, h = L.h * k; B.add('tall', '#4a5a66', _scbdRect(X - w / 2, y - h, w, h + 3)); B.add('tall', '#cfd2d0', _scbdRect(X - w / 2, y - h, w, k * 5)); B.add('tall', '#cfd2d0', _scbdRect(X - w * 0.62, y - k * 12, w * 1.24, k * 12)); for (let f = 4; f < L.h / 3.6 - 1; f++) B.win('tall', (f * 5) % 12, _scbdRect(X - w * 0.45, y - k * f * 3.6, w * 0.9, k * 1.6)); },
  spire(B, k, X, y, L) { const c = '#857d6e', tw = k * 9; B.add('tall', c, _scbdRect(X - L.w * k / 2, y - k * 14, L.w * k, k * 14 + 3)); B.add('tall', c, _scbdRect(X - tw / 2, y - k * 26, tw, k * 26)); B.add('tall', '#6e675b', _scbdPoly([[X - tw / 2, y - k * 26], [X, y - L.h * k], [X + tw / 2, y - k * 26]])); },
  beetham(B, k, X, y, L) {   // the slim slab, its 23rd-floor cantilever and the blade on top
    const w = L.w * k, h = L.h * k, c = '#7d93a3', ov = k * 4;
    B.add('tall', c, _scbdPoly([[X - w / 2, y + 3], [X - w / 2, y - h * 0.4], [X - w / 2 - ov, y - h * 0.42], [X - w / 2 - ov, y - h], [X + w / 2, y - h], [X + w / 2, y + 3]]));
    B.add('tall', '#a9bac5', _scbdRect(X - w / 2 - ov, y - h * 0.42, k * 2, h * 0.42 - h + h));
    B.add('tall', '#c9d2d8', _scbdPoly([[X + w * 0.2, y - h], [X + w * 0.32, y - h - k * 14], [X + w * 0.4, y - h - k * 14], [X + w * 0.4, y - h]]));
    for (let f = 2; f < L.h / 3.3; f++) B.win('tall', (f * 7) % 12, _scbdRect(X - w * 0.4 - (f * 3.3 > L.h * 0.42 ? ov : 0), y - k * f * 3.3, w * 0.8, k * 1.3));
  },
  deansgateSq(B, k, X, y, L, rnd) {   // four towers, 201 / 158 / 140 / 120 m, serrated crowns, dark glass with a light rib
    [[0, 201], [-1.6, 158], [1.5, 140], [2.8, 120]].forEach(([o, hm]) => {
      const w = L.w * k, x = X + o * w * 1.15, h = hm * k;
      B.add('tall', '#4d5c68', _scbdPoly([[x - w / 2, y + 3], [x - w / 2, y - h + k * 4], [x - w / 4, y - h], [x, y - h + k * 4], [x + w / 4, y - h], [x + w / 2, y - h + k * 4], [x + w / 2, y + 3]]));
      B.add('tall', '#b9c3c9', _scbdRect(x - k * 1, y - h + k * 4, k * 2, h - k * 4));
      for (let f = 3; f < hm / 3.2 - 2; f += 1) if (rnd() < 0.7) B.win('tall', (f + Math.round(o * 3)) % 12, _scbdRect(x - w * 0.42, y - k * f * 3.2, w * 0.3, k * 1.2));
    });
  },
  cis(B, k, X, y, L) { const w = L.w * k, h = L.h * k; B.add('tall', '#5d6670', _scbdRect(X - w / 2, y - h, w, h + 3)); B.add('tall', '#a8a59d', _scbdRect(X + w / 2, y - h - k * 8, k * 9, h + k * 8 + 3)); B.add('tall', '#a8a59d', _scbdRect(X - w / 2, y - k * 9, w + k * 9, k * 9)); for (let f = 4; f < L.h / 3.6; f++) B.win('tall', (f * 3) % 12, _scbdRect(X - w * 0.45, y - k * f * 3.6, w * 0.9, k * 1.2)); },
  clockTower(B, k, X, y, L) { const c = '#a79a7e', tw = L.w * k; B.add('tall', c, _scbdRect(X - tw / 2, y - k * 62, tw, k * 62 + 3)); B.add('tall', '#6d6a62', _scbdPoly([[X - tw / 2, y - k * 62], [X, y - L.h * k], [X + tw / 2, y - k * 62]])); },
};
/** The landmarks in view: { L, X, d (m), k } at their real bearing; none without lat / lon. */
function _scbdLandmarks(S, cam) {
  if (!S.landmarks || !Number.isFinite(cam.lat) || !Number.isFinite(cam.lon)) return [];
  const out = [];
  for (const L of S.landmarks) {
    const dy = (L.lat - cam.lat) * 110540, dx = (L.lon - cam.lon) * 111320 * Math.cos(cam.lat * Math.PI / 180), dist = Math.hypot(dx, dy);
    if (dist < 380 || dist > 15000) continue;   // nearer than that, the scene draws it itself
    let rel = Math.atan2(dx, dy) * 180 / Math.PI - cam.heading;
    rel = ((rel + 540) % 360) - 180;
    if (Math.abs(rel) > cam.fov / 2 + 4) continue;
    const r = rel * Math.PI / 180, dm = dist * Math.cos(r), X = cam.x0 + cam.f * Math.tan(r);
    out.push({ L, X, d: dm, k: cam.f / dm });
  }
  return out;
}

/* ---------- one band ---------- */
function _scbdBandShapes(S, sid, bi, cam, season, seed, lms, terrainHills) {
  const d = S.bands[bi], nb = S.bands.length, k = cam.f / d, H = cam.horizon, rnd = _scbdRnd(seed), B = _scbdBand();
  const far = bi / Math.max(1, nb - 1), amp = (S.hill[bi] || 0) * (terrainHills ? 0.25 : 1), ns = sid + '|' + bi;
  const ground0 = H + cam.f * cam.eye / d;
  // the hill line: metres above the camera's ground, broad near and rolling far (noise in metres across)
  const hillM = (X) => amp * (S.vx || 1) * Math.max(0, Math.min(1.5, 0.35 * far + _scbdFbm(ns, ((X - cam.x0) / k) / (380 + 900 * far)) * 1.9 - 0.45));
  // the hill line sampled every 2 units (the generator asks for it thousands of times)
  const HS = new Float32Array(Math.ceil((1800 + 240) / 2) + 2);
  for (let i = 0; i < HS.length; i++) HS[i] = hillM(-240 + i * 2);
  const hillAt = (X) => { const t = (Math.max(-240, Math.min(1800, X)) + 240) / 2, i = Math.floor(t), f = t - i; return HS[i] * (1 - f) + HS[Math.min(HS.length - 1, i + 1)] * f; };
  const base = (X) => ground0 - k * hillAt(X);
  const xa = -60, xb = 1660, top = new Float32Array(101).fill(ground0);
  const fade = (c) => _scbdMix(c, _SCBD_FADE, 0.06 + 0.4 * far);
  // the hill / ground body
  const hillCol = fade(S.kind === 'city' && sid !== 'sheffield' ? _scbdMix(_SCBD_HILL[season] || _SCBD_HILL.summer, '#8a8278', 0.45) : (_SCBD_HILL[season] || _SCBD_HILL.summer));
  const HP = [[xa, ground0 + 8]];
  for (let X = xa; X <= xb; X += 8) HP.push([X, base(X)]);
  HP.push([xb, ground0 + 8]);
  B.add('hill', hillCol, _scbdPoly(HP));
  // a far ridge (the Pennines from Manchester) behind the farthest band, at its real bearing
  if (S.ridge && bi === nb - 1 && Number.isFinite(cam.lat)) {
    const R = S.ridge, kr = cam.f / R.d, g0 = H + cam.f * cam.eye / R.d, pts = [];
    for (let X = xa; X <= xb; X += 10) {
      const b = (cam.heading + Math.atan((X - cam.x0) / cam.f) * 180 / Math.PI + 360) % 360;
      const inR = R.from <= R.to ? b >= R.from && b <= R.to : b >= R.from || b <= R.to, e = inR ? Math.min(1, Math.min(b - R.from, R.to - b) / 15) : 0;
      pts.push([X, g0 - kr * R.h * e * (0.7 + 0.3 * _scbdFbm(sid + 'ridge', X / 140))]);
    }
    if (pts.some(p => p[1] < g0 - 2)) B.add('ridge', _scbdMix(_SCBD_HILL[season] || _SCBD_HILL.summer, _SCBD_FADE, 0.72), _scbdPoly([[xa, g0 + 6]].concat(pts, [[xb, g0 + 6]])));
  }
  if (S.kind === 'city') {
    const dens = (S.dens && S.dens[bi]) || 0.7, step = k * 9, peak = amp * (S.vx || 1) * 1.5 * k;
    // rows of buildings climbing the hill: row 0 at the hill line (green woods on the tops), each next row a storey-and-roof lower
    // down the slope (nearer, drawn later); a row exists only where the slope is still above the flat ground
    const rows = Math.max((S.rows && S.rows[bi]) || 1, Math.min(6, Math.ceil(peak / step)));
    for (let r = 0; r < rows; r++) {
      const off = r * step, rb = (X) => Math.min(ground0 + 1, base(X) + off), live = (X) => r === 0 || base(X) + off < ground0 - k * 2;
      let X = xa + rnd() * 30;
      while (X < xb) {
        if (!live(X)) { X += 6 + rnd() * 10; continue; }
        const cl = _scbdFbm(ns + 'cl' + r, X / 90);   // clusters and breaks
        const hillFrac = peak > 0 ? (ground0 - base(X) - off) / peak : 0;
        if (S.woodTop && hillFrac > S.woodTop) { const w = 30 + rnd() * 50; _scbdTrees(B, season, rnd, k, X, X + w, rb, { h0: 10, h1: 20, kind: 'mixed' }); X += w; continue; }
        if (cl < 1 - dens) { const w = 10 + rnd() * 40; _scbdTrees(B, season, rnd, k, X, X + w, rb, { h0: 7, h1: 15, dens: 0.8 }); X += w; continue; }
        let type = _scbdWeighted(rnd, S.mix);
        if (type === 'trees') { const w = 8 + rnd() * 26; _scbdTrees(B, season, rnd, k, X, X + w, rb, { h0: 7, h1: 14, dens: 0.9 }); X += w; continue; }
        if (hillFrac > 0.15 && _scbdTall[type] && rnd() < 0.55) type = 'terrace';   // up the slopes: mostly terraces
        X += _scbdBuilding(B, type, S, rnd, k, X, rb, {}) + (rnd() < 0.2 ? rnd() * 10 : 0);
      }
    }
    // street trees in front of the nearest row
    if (bi <= 1) for (let X = xa + rnd() * 80; X < xb; X += 60 + rnd() * 160) _scbdTrees(B, season, rnd, k, X, X + 6 + rnd() * 26, (x) => Math.min(ground0 + 1, base(x)), { h0: 6, h1: 12, dens: 0.85 });
  } else {
    // nature: a woodland edge with breaks, hedgerows near, a village with a church tower now and then
    const kind = S.trees || 'mixed';
    let X = xa;
    while (X < xb) {
      const cl = _scbdFbm(ns + 'wood', X / (120 + 200 * far));
      const w = 20 + rnd() * 120;
      if (cl > 0.36 - 0.1 * far) _scbdTrees(B, season, rnd, k, X, X + w, base, { h0: kind === 'heath' ? 10 : 12, h1: kind === 'heath' ? 20 : 24, kind, gap: 0.7 });
      else if (S.hedge && bi <= 1) { _scbdTrees(B, season, rnd, k, X, X + w, base, { h0: 2, h1: 3.2, gap: 0.6 }); if (rnd() < 0.7) _scbdTrees(B, season, rnd, k, X + w * rnd(), X + w * 0.9, base, { h0: 12, h1: 20, dens: 0.35, gap: 4 }); }
      X += w;
    }
    if (S.village && (bi === 1 || bi === 2) && rnd() < S.village) {
      const VS = { pal: S.pal || SCENE_BACKDROP_STYLES['hampshire-village'].pal }, vx = 120 + rnd() * 1360;
      let x = vx - 40 * k - rnd() * 60;
      const n = 4 + Math.floor(rnd() * 8), ci = Math.floor(rnd() * n);
      for (let i = 0; i < n; i++) x += (i === ci ? _scbdBuilding(B, 'church', VS, rnd, k, x, base, {}) : _scbdBuilding(B, 'house', VS, rnd, k, x, base, {})) * (0.7 + rnd() * 0.4);
      _scbdTrees(B, season, rnd, k, vx - 60 * k, x + 30 * k, base, { h0: 8, h1: 16, dens: 0.5, gap: 2.2 });
    }
  }
  // landmarks that belong to this band (between this band's depth and the next nearer one)
  for (const m of lms) if (m.band === bi) { const y = ground0 - (Number.isFinite(cam.alt) ? m.k * Math.max(0, (m.L.elev || 0) - cam.alt) : m.k * Math.max(0, ((m.L.elev || 0) - 50) * 0.6)); _SCBD_LANDMARK_DRAW[m.L.draw](B, m.k, m.X, y, m.L, rnd, S); }
  const shapes = B.shapes((S.pal && S.pal.win) || '#2e3740').map(s => (s.glow ? s : Object.assign(s, { f: s.f === hillCol ? s.f : fade(s.f) })));
  return { shapes, ground0 };
}

/** The backdrop's compiled `direct` items (farthest band first). G: the v2 compile context. */
function sceneBackdropItems(G, season) {
  const data = G.data || {}, cam = G.cam;
  if (!cam || !(cam.horizon > 8 && cam.horizon < 892)) return [];
  if (Array.isArray(G.water) && G.water.some(w => w && w.v2 && w.v2.kind === 'sea')) return [];
  const sid = sceneBackdropStyleOf(data, cam);
  if (!sid) return [];
  const S = SCENE_BACKDROP_STYLES[sid];
  const se = season || G.season || 'summer', seed0 = sceneHash(String(data.id || '') + '|' + sid + '|' + Math.round(cam.heading) + '|' + Math.round((cam.lat || 0) * 1e4));
  const terrainHills = !!(data.terrain && Array.isArray(data.terrain.ridges) && data.terrain.ridges.length);
  const lms = _scbdLandmarks(S, cam).map(m => { let b = 0; for (let i = 0; i < S.bands.length; i++) if (S.bands[i] >= m.d) b = i; return Object.assign(m, { band: b }); });
  const obj = typeof _scbgDirectObj === 'function' ? _scbgDirectObj() : null;
  if (!obj) return [];
  const layer = typeof sceneDepthBand === 'function' ? sceneDepthBand(cam, 1e5) : 0, out = [];
  // farthest first: bands are listed near to far in the style, drawn far to near
  const order = S.bands.map((d, i) => i).sort((a, b) => S.bands[b] - S.bands[a]);
  order.forEach((bi, rank) => {
    _scbdTop = Infinity; _scbdCols = new Float32Array(100).fill(Infinity);
    const { shapes, ground0 } = _scbdBandShapes(S, sid, bi, cam, se, seed0 + bi * 7919, lms.map(m => Object.assign({}, m, { band: m.band === bi ? bi : -1 })), terrainHills);
    if (!shapes.length) return;
    const y0 = Math.min(_scbdTop, ground0) - 2;
    const d = S.bands[bi];
    out.push({ o: obj, v: 0, x: cam.x0, y: _scbdF(ground0), s: 1, flip: false, layer, haze: null, tint: null, season: se, seed: (seed0 + bi) >>> 0, z: -20000 + rank, strip: -1, anim: [], glowOn: null,
      shadow: false, reflect: true, lit: false, shade: false, g: { x: 0, d, h: 0, surf: null, snapped: 0 }, dz: d, cls: 'backdrop', view: 'side', backdrop: sid,
      cols: Array.from(_scbdCols, v => (Number.isFinite(v) ? Math.round(v) : null)), direct: { shapes, box: [-60, Math.max(-40, Math.floor(y0)), 1660, Math.ceil(ground0 + 10)], anchor: [cam.x0, _scbdF(ground0)], glowOn: null } });
  });
  return out;
}

/** The compile hook: the backdrop at the front of C.items (index lists shifted), then the emptyBackdrop lint. */
function sceneBackdropApply(G, C) {
  let items = [];
  try { items = sceneBackdropItems(G, C.season); } catch (e) { C.problems.push({ rule: 'backdrop', sev: 'warn', i: null, obj: null, at: null, msg: 'the backdrop failed: ' + String(e && e.message).slice(0, 120), fix: 'check backdrop' }); }
  const n = items.length;
  if (n) {
    C.items.unshift(...items);
    for (const st of C.strips || []) st.items = st.items.map(k => k + n);
    for (const b of C.buildings || []) if (Number.isInteger(b.i)) b.i += n;
    if (C.stats) C.stats.backdrop = { style: items[0].backdrop, bands: n };
  }
  sceneBackdropLint(G, C);
}
/** emptyBackdrop: more than ~20 % of the columns just above the horizon show bare sky (nothing drawn there). */
function sceneBackdropLint(G, C) {
  const cam = G.cam;
  if (!cam || !(cam.horizon > 40 && cam.horizon < 880)) return;
  // the horizon band: the 30 units above eye level (people's heads stop at the horizon). A 16-unit column is covered when something
  // standing on the ground (its box reaching the horizon) or the backdrop rises through the whole band there.
  const H = cam.horizon, N = 100, top = new Float32Array(N).fill(Infinity), band = H - 30;
  const mark = (x0, x1, y) => { for (let i = Math.max(0, Math.floor(x0 / 16)); i <= Math.min(N - 1, Math.floor(x1 / 16)); i++) if (y < top[i]) top[i] = y; };
  for (const it of C.items) {
    if (it.cls === 'air' || it.cls === 'bird-air' || /^(sky|bird)\./.test(it.o)) continue;
    if (it.backdrop) { (it.cols || []).forEach((y, i) => { if (y != null && y < top[i]) top[i] = y; }); continue; }
    const b = typeof _scgrItemBox === 'function' ? _scgrItemBox(it) : null;
    if (b && b[3] >= H - 2) mark(b[0] + (b[2] - b[0]) * 0.15, b[2] - (b[2] - b[0]) * 0.15, b[1]);   // sprite boxes carry padding: their middle 70 %
  }
  for (const g of C.ground || []) if (g.ridge && typeof scenePathBox === 'function') { const b = scenePathBox(g.d); if (b) mark(b[0], b[2], b[1]); }
  let bareN = 0;
  for (let i = 0; i < N; i++) if (!(top[i] <= band)) bareN++;
  const bare = bareN / N;
  if (C.stats) C.stats.backdropBare = Math.round(bare * 100) / 100;
  if (bare > 0.2) C.problems.push({ rule: 'emptyBackdrop', sev: 'warn', i: null, obj: null, at: null, msg: `${Math.round(bare * 100)}% of the horizon band (30 units above eye level) shows bare sky or flat ground`, fix: "leave the backdrop on (the engine default; backdrop: { style } to choose the place style), or frame more of the place" });
}

/* ---------- v1 scenes (the renderer hook, 78-scene-canvas.js): the same bands, drawn into the farthest layer at bake ---------- */
const _scbdV1Memo = new WeakMap();
/**
 * The backdrop of a compiled v1 scene, its camera inferred from its view (horizon, fov, heading, lat / lon; eye from the
 * horizon as the sanity lint does). -> { layer, items } | null. The v1 compile itself is untouched (byte-identical, V2 14.1).
 */
function sceneBackdropV1(C) {
  if (!C || C.v === 2 || !Array.isArray(C.layers) || !C.layers.length) return null;
  if (_scbdV1Memo.has(C)) return _scbdV1Memo.get(C);
  let res = null;
  try {
    const v = C.view || {}, hor = Number.isFinite(v.horizon) ? v.horizon : 560;
    const data = { id: C.id, setting: C.setting, backdrop: C.backdrop, paint: C.paint, view: v,
      camera: { horizon: hor, fov: Number.isFinite(v.fov) ? v.fov : 66, heading: Number.isFinite(v.heading) ? v.heading : 180, eye: Math.max(1.2, Math.min(40, 1.72 * (900 - hor) / 132)), lat: v.lat, lon: v.lon } };
    const cam = typeof sceneCamera === 'function' ? sceneCamera(data) : null;
    const items = cam ? sceneBackdropItems({ data, cam, season: C.season, water: [] }, C.season) : [];
    if (items.length) res = { layer: 0, items };
  } catch (e) { res = null; }
  _scbdV1Memo.set(C, res);
  return res;
}
