/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Sheffield: Kelham Island and the River Don, four views.
   docs/dev/SCENE_ENGINE_V2.md. Ground plans, building styles and own objects: 70-scene-lib-sheffield-kelham.js (SCENE_KLM).
   Registered by 72-anim-pack-uk-north-sheffield-kelham.js. PURE: functions only, nothing runs at load.
     https://www.simt.co.uk/kelham-island-museum
   ============================================================ */

/* ---------- shared helpers of the four views ---------- */
const _klmR1 = v => Math.round(v * 10) / 10, _klmR2 = v => Math.round(v * 100) / 100;
/** The band layer of a depth (the engine's default bands). */
function _klmBand(d) { return d >= 800 ? 'horizon' : d >= 200 ? 'far' : d >= 50 ? 'mid' : d >= 15 ? 'near' : 'fore'; }
/**
 * A one-off piece drawn in a camera's perspective (screen units): its shapes become a library object of its own
 * (structure.klm-p-<key>, defined lazily, memoised) placed pinned at its anchor, so it sorts in its depth band over the water
 * like any sprite. shapes: [{ f | s, w, d (absolute screen path: M / L / Q / C / Z with absolute numbers), op, glow }].
 */
const _klmPieces = new Set();
/**
 * shapes: an array, or a function (season) -> array (a seasonal piece: snow on its ledges, baskets in summer). o: { ay (the anchor
 * row; above the horizon = no ground point, so it never sorts among the buildings), reflect, night: true (its glow shapes light
 * after dusk), place (extra placement fields) }.
 */
function _klmPiece(key, shapes, anchor0, layer, o) {
  o = o || {};
  const id = (o.landmark ? 'landmark.klm-p-' : 'structure.klm-p-') + key, fn = typeof shapes === 'function' ? shapes : null, base = fn ? fn('summer') : shapes;
  // the box of every number pair (absolute M / L / C / Q paths): the sprite is exactly that box, anchored at its foot centre
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of base) { const t = String(s.d).match(/-?\d+(?:\.\d+)?/g) || []; for (let i = 0; i + 1 < t.length; i += 2) { const X = Math.max(-200, Math.min(1800, +t[i])), Y = Math.max(-40, Math.min(940, +t[i + 1])); if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } }
  const anchor = [_klmR1((x0 + x1) / 2), _klmR1(o.ay != null ? o.ay : y1)];
  const sh = (d) => { let i = 0; return String(d).replace(/-?\d+(?:\.\d+)?/g, (m) => { const even = i++ % 2 === 0, v = Math.max(even ? -200 : -40, Math.min(even ? 1800 : 940, +m)); return _klmR1(v - (even ? anchor[0] : anchor[1])) + ''; }); };
  const rel = (list) => list.map(s => Object.assign({}, s, { d: sh(s.d) }, s.f && typeof s.f === 'object' && s.f.lin ? { f: Object.assign({}, s.f, { x1: s.f.x1 - anchor[0], y1: s.f.y1 - anchor[1], x2: s.f.x2 - anchor[0], y2: s.f.y2 - anchor[1] }) } : {}));
  if (!_klmPieces.has(id) && typeof sceneObjDefine === 'function') {
    _klmPieces.add(id);
    const memo = {}, get = (season) => memo[season] || (memo[season] = rel(fn ? fn(season) : shapes));
    sceneObjDefine({ id, category: o.landmark ? 'landmark' : 'structure', size: [Math.max(4, Math.ceil(x1 - x0)), Math.max(4, Math.ceil(y1 - y0))], variants: 1, seasonal: !!fn, shapeBySeason: !!fn, flippable: false,
      parts: ['body'], weight: 0, reflect: !!o.reflect, shadow: false, real: o.real || { h: 1 },
      night: o.night ? { glow: { window: '#ffd28a', lamp: '#ffe6a8' }, on: o.on || 0.75 } : undefined,
      tags: ['uk', 'sheffield', 'kit:urban', o.landmark ? 'role:landmark' : 'role:structure', o.landmark ? 'class:landmark' : 'class:structure', 'projected'],
      credit: 'drawn for the Kelham Island views in the camera perspective', build(v, rnd, ctx) { return { body: get((ctx && ctx.season) || 'summer').map(b => Object.assign({}, b)) }; } });
  }
  return Object.assign({ obj: id, x: anchor[0], y: anchor[1], s: 1, pin: true, layer, shadow: false, anim: false }, o.place || {});
}
/** An ellipse with absolute coordinates only (pieces shift every number pair): four quadratic arcs, one decimal. */
const _klmEll = (x, y, rx, ry) => { const F = _klmR1; return `M${F(x - rx)} ${F(y)}Q${F(x - rx)} ${F(y - ry)} ${F(x)} ${F(y - ry)}Q${F(x + rx)} ${F(y - ry)} ${F(x + rx)} ${F(y)}Q${F(x + rx)} ${F(y + ry)} ${F(x)} ${F(y + ry)}Q${F(x - rx)} ${F(y + ry)} ${F(x - rx)} ${F(y)}Z`; };
const _klmPath = (pts) => 'M' + pts.map(q => _klmR1(q[0]) + ' ' + _klmR1(q[1])).join('L');
/**
 * A retaining wall in perspective (river or goit walls): the face between the bank line at h 0 and the water at h w, one piece
 * per depth band (so each sorts with its band). line: [[x, d], ...] near to far. Returns placements.
 */
function _klmWall(cam, line, w, cols, key) {
  const P = SCENE_KLM.proj(cam).p, out = [];
  line = line.filter(p => { const a = P(p[0], p[1], w); return a[0] > -900 && a[0] < 2500 && a[1] < 1500 && p[1] > 1.2; });
  let run = [], n = 0;
  const flush = () => {
    if (run.length < 2) { run = []; return; }
    const top = run.map(p => P(p[0], p[1], 0)), bot = run.map(p => P(p[0], p[1], w));
    // the gritstone face in one flat tone (so the band pieces meet without a seam), its courses and staggered joints, the
    // coping along the top, the dark wet band and a green slime line at the waterline
    const shapes = [{ f: cols[0], d: _klmPath(top.concat(bot.slice().reverse())) + 'Z' }];
    let c = '', j = '';
    const rows = 6;
    for (let k = 1; k < rows; k++) c += _klmPath(run.map(p => P(p[0], p[1], w * k / rows)));
    for (let i = 0; i < run.length - 1; i++) {
      const a = run[i], b = run[i + 1], seg = Math.hypot(b[0] - a[0], b[1] - a[1]), hpx = Math.abs(P(a[0], a[1], 0)[1] - P(a[0], a[1], w)[1]);
      if (hpx < 70) continue;
      for (let k = 0; k < rows; k++) {
        const z0 = w * k / rows, z1 = w * (k + 1) / rows, step = 1.3, off = (k % 2) * step / 2;
        for (let u = off; u < seg; u += step) { const t = u / seg, x = a[0] + (b[0] - a[0]) * t, d = a[1] + (b[1] - a[1]) * t; j += _klmPath([P(x, d, z0), P(x, d, z1)]); }
      }
    }
    shapes.push({ s: cols[3], w: 0.9, d: c + j, op: 0.5 });
    shapes.push({ f: cols[1], d: _klmPath(top.concat(run.map(p => P(p[0], p[1], w * 0.06)).reverse())) + 'Z' });
    const wet = run.map(p => P(p[0], p[1], w * 0.8)), slime = run.map(p => P(p[0], p[1], w * 0.93));
    shapes.push({ f: cols[2], d: _klmPath(wet.concat(bot.slice().reverse())) + 'Z', op: 0.75 });
    shapes.push({ f: '#3e5a34', d: _klmPath(slime.concat(bot.slice().reverse())) + 'Z', op: 0.6 });
    out.push(_klmPiece(key + '-' + (n++), shapes, null, _klmBand(run[run.length - 1][1])));
    run = [];
  };
  const edges = [15, 50, 200, 800];
  for (let i = 0; i < line.length; i++) {
    run.push(line[i]);
    if (i < line.length - 1 && edges.some(e => line[i][1] < e && line[i + 1][1] >= e)) { flush(); run.push(line[i]); }
  }
  flush();
  return out;
}

/** Shapes as ground fills of a layer (drawn first in it, never sorted among the items; fills only, opaque). */
function _klmGround(shapes, layer) { return shapes.filter(s => s.f && s.d).map(s => ({ layer, d: s.d, fill: s.f })); }
/**
 * Sheffield's far hillside (screen units, absolute): the ridge, then rows of stone and brick terraces stepping up it along the
 * contours (roofs, walls, a lit window or two), trees and the fields between. Returns shapes for one horizon piece.
 */
function _klmHillside(seed, x0, x1, base, top, o) {
  o = o || {};
  const r = SCENE_KLM.rnd(seed), sh = [], ridge = (x) => top + Math.sin(x / 230 + seed) * 12 + Math.sin(x / 70 + seed * 2) * 3;
  let d = `M${x0} ${base}`;
  for (let x = x0; x <= x1; x += 40) d += `L${x} ${Math.round(ridge(x))}`;
  sh.push({ f: { lin: [[0, o.hill0 || '#7a8a72'], [1, o.hill1 || '#62705c']], x1: 0, y1: top - 20, x2: 0, y2: base }, d: d + `L${x1} ${base}Z` });
  let fa = '', fb = '';
  for (let i = 0; i < 14; i++) { const x = x0 + r() * (x1 - x0), y = ridge(x) + 6 + r() * Math.max(2, base - ridge(x) - 10), w = 30 + r() * 70, h = 3 + r() * 5, q = _klmPath([[x, y], [x + w, y], [x + w - 6, y + h], [x - 6, y + h]]) + 'Z'; if (r() < 0.5) fa += q; else fb += q; }
  sh.push({ f: o.field0 || '#8a9a78', d: fa, op: 0.7 }, { f: o.field1 || '#5a6a50', d: fb, op: 0.6 });
  let roofs = '', walls = '', walls2 = '', wins = '', trees = '', trees2 = '';
  const rows = o.rows || 7;
  for (let k = 0; k < rows; k++) {
    const t = (k + 0.5) / rows;
    let x = x0 + r() * 40;
    while (x < x1) {
      const run = 40 + r() * 110, yb = ridge(x) + (base - ridge(x)) * t + Math.sin(x / 50) * 1.5, hh = 3.2 + t * 2.4, rh = 1.6 + t * 1.2;
      if (r() < 0.75) {
        const slope = (ridge(x + run) - ridge(x)) * (1 - t) * 0.5;
        roofs += `M${Math.round(x)} ${Math.round(yb - hh)}L${Math.round(x + run)} ${Math.round(yb - hh + slope)}L${Math.round(x + run - 2)} ${Math.round(yb - hh - rh + slope)}L${Math.round(x + 2)} ${Math.round(yb - hh - rh)}Z`;
        const wd = `M${Math.round(x)} ${Math.round(yb - hh)}L${Math.round(x + run)} ${Math.round(yb - hh + slope)}L${Math.round(x + run)} ${Math.round(yb + slope)}L${Math.round(x)} ${Math.round(yb)}Z`;
        if (r() < 0.6) walls += wd; else walls2 += wd;
        for (let wx = x + 3; wx < x + run - 3; wx += 5 + r() * 4) if (r() < 0.4) { const wy = yb - hh * 0.6 + slope * (wx - x) / run; wins += `M${Math.round(wx)} ${Math.round(wy)}L${Math.round(wx + 1.6)} ${Math.round(wy)}L${Math.round(wx + 1.6)} ${Math.round(wy + 1.4)}L${Math.round(wx)} ${Math.round(wy + 1.4)}Z`; }
      } else {
        for (let j = 0; j < 4; j++) { const tx = x + r() * run, ty = yb - 2, rr = 3 + r() * 5 * (0.5 + t), e = _klmEll(tx, ty - rr * 0.6, rr * 1.2, rr); if (r() < 0.5) trees += e; else trees2 += e; }
      }
      x += run + 4 + r() * 22;
    }
  }
  sh.push({ f: o.wall0 || '#9a8a74', d: walls }, { f: o.wall1 || '#8a5a48', d: walls2 }, { f: o.roof || '#4a4e56', d: roofs });
  sh.push({ f: o.tree0 || '#4e6044', d: trees }, { f: o.tree1 || '#3e5038', d: trees2 });
  sh.push({ f: '#3a3e44', d: wins, op: 0.8, glow: 'window' });
  return sh;
}
/**
 * The bridge parapet we lean on (screen units, absolute): a gritstone coping seen from just above (its top, its rounded nose,
 * its weathered face), a plinth below, lichen and stains. Returns shapes for one front piece.
 */
function _klmParapet(seed, x0, x1, yTop, yBot) {
  const r = SCENE_KLM.rnd(seed), sh = [], top = (x) => yTop + (x - x0) / (x1 - x0) * 10;
  sh.push({ f: { lin: [[0, '#c4b89c'], [1, '#a89c80']], x1: 0, y1: yTop - 4, x2: 0, y2: yTop + 30 }, d: `M${x0} ${top(x0) + 30}L${x0} ${top(x0)}L${x1} ${top(x1)}L${x1} ${top(x1) + 30}Z` });
  sh.push({ f: '#e0d6bc', d: `M${x0} ${top(x0)}L${x1} ${top(x1)}L${x1} ${top(x1) + 4}L${x0} ${top(x0) + 4}Z`, op: 0.8 });
  sh.push({ f: { lin: [[0, '#7e7462'], [1, '#4a4438']], x1: 0, y1: yTop + 30, x2: 0, y2: yBot }, d: `M${x0} ${yBot + 10}L${x0} ${top(x0) + 30}L${x1} ${top(x1) + 30}L${x1} ${yBot + 10}Z` });
  // the joints of the coping stones, lichen blotches, a dark weather streak under the nose
  let j = '', li = '', li2 = '';
  for (let x = x0 + 60 + r() * 60; x < x1; x += 150 + r() * 90) j += `M${_klmR1(x)} ${_klmR1(top(x))}L${_klmR1(x - 3)} ${_klmR1(top(x) + 30)}`;
  for (let i = 0; i < 34; i++) { const x = x0 + r() * (x1 - x0), y = top(x) + 4 + r() * 24, e = _klmEll(x, y, 4 + r() * 12, 1.5 + r() * 3); if (r() < 0.6) li += e; else li2 += e; }
  sh.push({ s: '#5a5244', w: 1.6, d: j, op: 0.7 }, { f: '#a8b088', d: li, op: 0.6 }, { f: '#d8d2a0', d: li2, op: 0.5 });
  sh.push({ f: '#3a342a', d: `M${x0} ${top(x0) + 30}L${x1} ${top(x1) + 30}L${x1} ${top(x1) + 38}L${x0} ${top(x0) + 38}Z`, op: 0.6 });
  return sh;
}

/* ============================================================
   View 1: Ball Street bridge, looking east-south-east down the Don to the weir.
   Leaning on the bridge parapet over the river: the Don runs away from under the bridge between its stone walls, pours over
   the weir in a long diagonal white sheet and bends away left towards the city. On the left bank Cornish Place, the great
   Victorian Britannia metal works, stands straight up from the river wall, its ranks of small-paned windows (flats now), an
   old works chimney behind; on the right bank the riverside walk under willows and alders, people and dogs on it, newer
   brick-and-glass flats behind; Pitsmoor's terraced hillside rising beyond. A heron on the weir crest, mallards in the slack
   water, gulls overhead. Buddleia and balsam self-sown on the wall tops. Framing: the bridge's parapet and lamp standard.
   ============================================================ */
function sceneUkSheffieldKelhamV1() {
  const V = SCENE_KLM.v1, cam = V.camera, J = SCENE_KLM.proj(cam), f = J.f, P = J.p, H = cam.horizon;
  const C = SCENE_KLM.line(V.river, 10), hw = V.width / 2;
  const bankL = SCENE_KLM.offset(C, -hw), bankR = SCENE_KLM.offset(C, hw);
  const river = bankL.concat(bankR.slice().reverse());
  const walkC = SCENE_KLM.offset(C, hw + 2.4), vergeO = SCENE_KLM.offset(C, hw + 12), lipR = SCENE_KLM.offset(C, hw + 0.7);
  const verge = SCENE_KLM.offset(C, hw + 4).concat(vergeO.slice().reverse());
  const lipL = SCENE_KLM.offset(C, -hw - 0.9), plotL = bankL.concat(SCENE_KLM.offset(C, -hw - 40).reverse());

  const data = {
    v: 2, id: 'sheffield-kelham-1',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: { density: 0.4 }, particles: 'season', signage: false,
    kits: ['urban', 'temperate', 'water', 'birds', 'people'],
    sky: { stars: 160, clouds: { n: 3, y: [40, 260], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'yard-l', kind: 'grass', poly: plotL },
      { id: 'walk-l', kind: 'path', path: SCENE_KLM.offset(C, -hw - 2.6).filter(p => p[1] > 8 && p[1] < 40), width: 2.2 },
      { id: 'verge', kind: 'verge', poly: verge },
      { id: 'lip-r', kind: 'verge', poly: bankR.concat(lipR.slice().reverse()) },
      { id: 'lip-l', kind: 'verge', poly: bankL.concat(lipL.slice().reverse()) },
      { id: 'walk', kind: 'path', path: walkC, width: 3.2 },
    ],
    water: [{ id: 'don', kind: 'river', poly: river, edge: 'none', flow: 0.5, ripple: 0.35, mirror: 0.6, rings: true }],
    buildings: [], ground: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, S = data.scatter, A = data.actors;
  // Pitsmoor's terraced hillside beyond the bend
  Pl.push(_klmPiece('v1-hill', _klmHillside(3, 560, 1300, H + 4, H - 64, { rows: 3 }), null, 'horizon', { ay: H - 2 }));
  // the river walls (stone, smoke-dark, a wet band at the waterline)
  Pl.push(..._klmWall(cam, bankL, cam.water, ['#7a7060', '#a89c82', '#3a3630', '#4e4638'], 'v1-wl'), ..._klmWall(cam, bankR, cam.water, ['#847a68', '#b0a488', '#3a3630', '#4e4638'], 'v1-wr'));
  // Cornish Place along the left bank, standing on the river wall (each block its own seed), the works behind
  const block = (d0, d1, depth, o) => {
    const a = bankL.filter(p => p[1] >= d0 && p[1] <= d1), first = a[0], last = a[a.length - 1];
    const back = SCENE_KLM.offset([first, last], -depth);
    B.push(Object.assign({ foot: [first, last, back[1], back[0]], style: 'kelham-works' }, o));
  };
  block(34, 64, 13, { storeys: 4, seed: 101 });
  block(65, 104, 14, { storeys: 3, seed: 103 });
  block(105, 150, 12, { storeys: 4, seed: 104 });
  B.push({ foot: [[-98, 168], [-70, 163], [-67, 188], [-95, 193]], style: 'kelham-works', storeys: 3, seed: 105 });
  Pl.push({ obj: 'landmark.klm-chimney', at: [-36, 238], fix: true, variant: 1 });
  // Cornish Place's riverside garden in front of the near block: a gravel walk on the wall top, birches and benches
  S.push({ obj: { 'tree.bank-birch': 2, 'tree.bank-alder': 1 }, on: 'yard-l', d: [10, 32], n: 4, dist: 'ground', minGap: 80, k: [0.75, 0.95], variant: [0, 1], seed: 35, anim: false });
  S.push({ obj: { 'plant.grass': 3, 'plant.grass-long': 1, 'plant.planter': 1 }, on: 'yard-l', d: [8, 32], n: 22, dist: 'screen', minGap: 34, k: [0.8, 1.3], seed: 36, anim: false, tint: { col: '#8a8a40', k: [0, 0.16] } });
  Pl.push({ obj: 'street.bench', on: 'yard-l', d: 18, u: 0.85, face: 'right' }, { obj: 'person.bench-sitter', on: 'yard-l', d: 18, u: 0.85, face: 'right' });
  // the next road bridge downstream, across the bend: two gritstone arches, a parapet, its lamps
  { const c = [-49, 206], n = [0.93, 0.37], a = [c[0] - n[0] * 17, c[1] - n[1] * 17], b = [c[0] + n[0] * 17, c[1] + n[1] * 17];
    const F = SCENE_KLM_DRAW.facade(cam, a, b), L = F.len, wl = cam.water;
    const sh = [{ f: '#8a8070', d: F.poly([[0, wl, 0], [L, wl, 0], [L, 1.1, 0], [0, 1.1, 0]]) }];
    for (const [s0, s1] of [[5, 16.4], [17.6, 29]]) sh.push({ f: '#2a2a26', d: F.poly(F.arch(s0, s1, wl, wl + 1.4, 0.02, 12)) }, { s: '#b8ae96', w: 1, d: F.line(F.arch(s0 - 0.4, s1 + 0.4, wl, wl + 1.4, 0.03, 12).slice(2)) });
    sh.push({ f: '#b4aa92', d: F.poly([[-0.2, 1.1, 0.1], [L + 0.2, 1.1, 0.1], [L + 0.2, 1.35, 0.1], [-0.2, 1.35, 0.1]]) });
    for (const s0 of [3, 31]) sh.push({ f: '#1e2224', d: F.rect(s0, s0 + 0.18, 1.35, 5.2, 0.1) }, { f: '#fff0c4', d: F.rect(s0 - 0.25, s0 + 0.43, 5.2, 5.7, 0.1), glow: 'window' });
    Pl.push(_klmPiece('v1-bridge', sh, null, 'far', { night: true, on: 1 })); }
  // the newer flats behind the riverside walk, and a works converted beyond them
  B.push({ foot: [[34, 20], [50, 20], [50, 44], [34, 44]], style: 'kelham-flats', storeys: 5, seed: 201 });
  B.push({ foot: [[29, 58], [44, 58], [44, 84], [29, 84]], style: 'kelham-flats', storeys: 5, seed: 202 });
  B.push({ foot: [[17, 102], [31, 102], [29, 136], [15, 136]], style: 'kelham-works', storeys: 4, seed: 203 });
  B.push({ foot: [[-6, 168], [14, 164], [17, 186], [-3, 190]], style: 'kelham-works', storeys: 3, seed: 205 });
  B.push({ foot: [[-24, 236], [2, 230], [6, 254], [-20, 260]], style: 'kelham-flats', storeys: 6, seed: 204 });
  // trees along the walk: willows and alders leaning over the water, a sycamore or two behind
  S.push({ obj: { 'tree.bank-willow': 2, 'tree.bank-alder': 3, 'tree.bank-birch': 1 }, on: 'verge', d: [12, 170], n: 12, dist: 'ground', cluster: { centres: 5, spread: 6 }, gap: 'foot', k: [0.75, 1.05], variant: [0, 1], seed: 31, anim: false, tint: { col: '#6a7a3a', k: [0, 0.14] } });
  S.push({ obj: { 'plant.grass-long': 4, 'plant.wildflowers': 1 }, on: 'verge', d: [8, 100], n: 30, dist: 'screen', minGap: 32, mask: { noise: { scale: 240, cut: 0.4 } }, cluster: { centres: 8, spread: 2 }, k: [0.8, 1.2], seed: 32, anim: false, tint: { col: '#8a8a40', k: [0, 0.16] } });
  // (no lamp standards along the walk: a double-headed standard's footprint spans the path's lanes in the motion lint)
  // self-sown buddleia, balsam and grass along the wall tops
  S.push({ obj: { 'plant.grass-long': 4, 'plant.canal-view-loosestrife': 3 }, on: ['lip-l', 'lip-r'], d: [14, 120], n: 18, dist: 'screen', minGap: 32, cluster: { centres: 6, spread: 3 }, k: [0.7, 1.2], variant: [0, 1], seed: 33, anim: false, tint: { col: '#7a5a8a', k: [0, 0.18] } });
  // the weir: a long diagonal step, its crest a dark stone band, the falling sheet white, the churned foam below
  { const [wa, wb] = V.weir, wN = 26, crest = [], toe = [];
    for (let i = 0; i <= wN; i++) { const t = i / wN, x = wa[0] + (wb[0] - wa[0]) * t, d = wa[1] + (wb[1] - wa[1]) * t; crest.push([x, d]); toe.push([x, d + 2.6]); }
    const pp = (L, h) => L.map(p => P(p[0], p[1], h));
    const hC = cam.water + 0.02, hT = cam.water - 1.1, sh = [];
    const yC = P(0, 52, hC)[1], yT = P(0, 52, hT)[1];
    sh.push({ f: '#5e6a66', d: _klmPath(pp(crest.map(p => [p[0], p[1] - 0.5]), hC + 0.1).concat(pp(crest, hC).reverse())) + 'Z' });
    sh.push({ f: { lin: [[0, '#eef4f4'], [0.45, '#a8bcc2'], [1, '#f6fafa']], x1: 0, y1: yC, x2: 0, y2: yT + 4 }, d: _klmPath(pp(crest, hC).concat(pp(toe, hT).reverse())) + 'Z' });
    let streaks = '';
    for (let i = 0; i < 36; i++) { const t = i / 36, x = wa[0] + (wb[0] - wa[0]) * t, d = wa[1] + (wb[1] - wa[1]) * t, a = P(x, d, hC), b = P(x, d + 2.6, hT); streaks += `M${_klmR1(a[0])} ${_klmR1(a[1])}L${_klmR1(b[0])} ${_klmR1(b[1])}`; }
    sh.push({ s: '#ffffff', w: 1.1, d: streaks, op: 0.6 });
    // the glassy tongue at the crest (the sky in it), then the standing waves thrown up below, white humps
    sh.push({ f: '#c8dce4', d: _klmPath(pp(crest.map(p => [p[0], p[1] - 1.2]), hC).concat(pp(crest, hC).reverse())) + 'Z', op: 0.7 });
    const r = SCENE_KLM.rnd(41);
    let waves = '';
    for (let i = 0; i < 30; i++) { const t = r(), x = wa[0] + (wb[0] - wa[0]) * t, d = wa[1] + (wb[1] - wa[1]) * t + 2.8 + r() * 1.2, q = P(x, d, hT), k = f / d, w = k * (0.4 + r() * 0.5), hh = k * (0.15 + r() * 0.25); waves += `M${_klmR1(q[0] - w)} ${_klmR1(q[1])}Q${_klmR1(q[0] - w * 0.3)} ${_klmR1(q[1] - hh * 2)} ${_klmR1(q[0] + w * 0.2)} ${_klmR1(q[1] - hh * 0.4)}Q${_klmR1(q[0] + w * 0.6)} ${_klmR1(q[1] - hh)} ${_klmR1(q[0] + w)} ${_klmR1(q[1])}Z`; }
    sh.push({ f: '#ffffff', d: waves, op: 0.9 });
    let foam = '', foam2 = '', trails = '';
    for (let i = 0; i < 28; i++) { const t = r(), x = wa[0] + (wb[0] - wa[0]) * t + (r() - 0.5) * 1.5, d = wa[1] + (wb[1] - wa[1]) * t + 2.4 + Math.pow(r(), 1.6) * 9, q = P(x, d, hT), k = f / d, e = _klmEll(q[0], q[1], k * (0.3 + r() * 0.8), k * (0.06 + r() * 0.1)); if (r() < 0.5) foam += e; else foam2 += e; }
    // foam trails drifting away downstream (along the flow, thinning out)
    for (let i = 0; i < 14; i++) { const t = r(), x = wa[0] + (wb[0] - wa[0]) * t, d0 = wa[1] + (wb[1] - wa[1]) * t + 4, L = 4 + r() * 12, pts = []; for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push(P(x - u * L * 0.18 + Math.sin(u * 5 + i) * 0.3, d0 + u * L, hT)); } trails += _klmPath(pts); }
    sh.push({ f: '#f2f6f6', d: foam, op: 0.8 }, { f: '#cfdcde', d: foam2, op: 0.7 }, { s: '#e8f0f0', w: 0.8, d: trails, op: 0.3 });
    Pl.push(_klmPiece('v1-weir', sh, null, 'mid')); }
  // the life on the water and the banks: the heron on the weir crest, mallards in the slack water, a pair of swans far off
  { const [wa, wb] = V.weir, t = 0.38, x = wa[0] + (wb[0] - wa[0]) * t, d = wa[1] + (wb[1] - wa[1]) * t, q = P(x, d - 0.2, cam.water + 0.05), def = typeof sceneObj === 'function' ? sceneObj('bird.heron') : null;
    if (def) Pl.push({ obj: 'bird.heron', x: _klmR1(q[0]), y: _klmR1(q[1]), s: _klmR2(f / d * 0.95 / def.size[1]), pin: true, layer: 'near', flip: true }); }
  A.push(..._klmBehave(data, { obj: 'bird.mallard', ground: [[-7, 27], [-1, 25]], speedM: 0.25, loop: 'pingpong', seed: 47, offset: 0.6 }));
  A.push(..._klmBehave(data, { obj: 'bird.swan', ground: [[6, 16], [2, 19], [-3, 22], [-6, 27]], speedM: 0.18, loop: 'pingpong', k: 1, seed: 50, offset: 0.15 }));
  A.push(..._klmBehave(data, { obj: 'bird.swan', ground: [[7.2, 17.2], [3.2, 20.2], [-1.8, 23.2], [-4.8, 28.2]], speedM: 0.18, loop: 'pingpong', k: 0.95, variant: 1, seed: 51, offset: 0.17 }));
  A.push(..._klmBehave(data, { obj: 'bird.moorhen', ground: [[9.6, 30], [10.8, 40]], speedM: 0.1, loop: 'pingpong', k: 1.1, seed: 52, offset: 0.6 }));
  data.flows.push({ id: 'walkers', kind: 'walk', on: ['walk', 'walk-l'], density: 1.6, profile: 'town', mix: { 'person.walker': 3, 'person.dog-walker': 3, 'person.jogger': 1, 'person.couple': 1, 'person.buggy-walker': 1 }, speed: [1.1, 1.5], both: true, max: 6 });
  data.flows.push({ id: 'cycles', kind: 'cycle', on: 'walk', density: 0.3, profile: 'leisure', mix: { 'person.cyclist': 1 }, max: 2 });
  data.flocks.push({ obj: 'bird.gull', n: 4, area: [300, 120, 1300, 300], speed: 40, s: 0.45, seed: 65, layer: 'mid' });
  S.push({ obj: 'bird.pigeon-feral', on: 'lip-r', d: [18, 40], n: 5, dist: 'screen', minGap: 30, seed: 67, k: [0.9, 1.1] });
  A.push(..._klmBehave(data, { obj: 'bird.wp-heron-stalk', ground: [[13.4, 20.5], [13.9, 23], [14.2, 25.5]], speedM: 0.05, loop: 'pingpong', k: 1.0, seed: 43, offset: 0.3 }));
  // framing: the parapet across the foot of the frame, the lamp standard on the left
  Pl.push(_klmPiece('v1-parapet', _klmParapet(11, -170, 1770, 790, 900), null, 'front'));
  Pl.push({ obj: 'plant.klm-sycamore-bough', x: -40, y: -20, s: 1.15, pin: true, layer: 'front', shadow: false, variant: 1, anim: false });
  return data;
}

/**
 * Iron railings along a bank top in perspective (posts every ~2 m, a top rail and a middle rail, dog bars near the camera), one
 * piece per depth band. line: [[x, d], ...] near to far.
 */
function _klmRailing(cam, line, h, key) {
  const P = SCENE_KLM.proj(cam).p, out = [], f = SCENE_KLM.proj(cam).f;
  line = line.filter(p => { const a = P(p[0], p[1], 0); return a[0] > -400 && a[0] < 2000 && a[1] < 1300 && p[1] > 1.5; });
  let run = [], n = 0;
  const flush = () => {
    if (run.length < 2) { run = []; return; }
    let posts = '', rails = '', bars = '';
    rails += _klmPath(run.map(p => P(p[0], p[1], h))) + _klmPath(run.map(p => P(p[0], p[1], h * 0.55)));
    for (let i = 0; i < run.length; i++) {
      const p = run[i], a = P(p[0], p[1], 0), b = P(p[0], p[1], h + 0.08), w = Math.max(0.8, f * 0.06 / p[1]);
      posts += `M${_klmR1(a[0] - w)} ${_klmR1(a[1])}L${_klmR1(b[0] - w)} ${_klmR1(b[1])}L${_klmR1(b[0] + w)} ${_klmR1(b[1])}L${_klmR1(a[0] + w)} ${_klmR1(a[1])}Z`;
      if (i < run.length - 1 && p[1] < 30) { const q = run[i + 1]; for (let k = 1; k < 4; k++) { const t = k / 4, x = p[0] + (q[0] - p[0]) * t, d = p[1] + (q[1] - p[1]) * t; bars += _klmPath([P(x, d, 0.05), P(x, d, h * 0.55)]); } }
    }
    const shapes = [{ f: '#1e2224', d: posts }, { s: '#1e2224', w: 1.6, d: rails }, { s: '#2a2e30', w: 1, d: bars, op: 0.9 }];
    out.push(_klmPiece(key + '-' + (n++), shapes, null, _klmBand(run[run.length - 1][1])));
    run = [];
  };
  const edges = [15, 50, 200, 800];
  for (let i = 0; i < line.length; i++) {
    run.push(line[i]);
    if (i < line.length - 1 && edges.some(e => line[i][1] < e && line[i + 1][1] >= e)) { flush(); run.push(line[i]); }
  }
  flush();
  return out;
}
/** Points every `step` metres along a polyline (for railing posts). */
function _klmEvery(L, step) {
  const out = [L[0]];
  let acc = 0;
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1], b = L[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = step - acc;
    while (t <= seg) { out.push([_klmR2(a[0] + (b[0] - a[0]) * t / seg), _klmR2(a[1] + (b[1] - a[1]) * t / seg)]); t += step; }
    acc = (acc + seg) % step;
  }
  return out;
}

/* ============================================================
   View 2: the goit at Kelham Island Museum, looking north-west along the goit to the River Don Engine house.
   On the museum side of the goit (the mill race cut to drive the town's corn mill, which makes Kelham an island), beside its
   iron railings: the narrow walled channel runs away, still and green, curving right past the tall brick engine hall with
   its round-arched windows and oculus, where the River Don Engine (1905, the most powerful working steam engine in Europe)
   still turns over on demonstration days. In the museum yard on the right the Bessemer converter stands on its plinth, the
   old generating station's long brick range beside it, the museum's chimney over the roofs. Across the goit the backs of
   the cutlery works, flats now, rise straight from the water. Visitors and families in the yard, a dog walker on the goit
   path, mallards and a moorhen on the water, pigeons on the setts; the hills of Upperthorpe beyond.
   ============================================================ */
function sceneUkSheffieldKelhamV2() {
  const V = SCENE_KLM.v2, cam = V.camera, J = SCENE_KLM.proj(cam), f = J.f, P = J.p, H = cam.horizon;
  const C = SCENE_KLM.line(V.goit, 5), hw = V.width / 2;
  const bankL = SCENE_KLM.offset(C, -hw), bankR = SCENE_KLM.offset(C, hw);
  const goit = bankL.concat(bankR.slice().reverse());
  const walkC = SCENE_KLM.offset(C, hw + 1.5), walkO = SCENE_KLM.offset(C, hw + 2.9);
  const yard = walkO.filter(p => p[1] <= 56).concat([[40, 56], [40, 3]]);
  const lipL = SCENE_KLM.offset(C, -hw - 1.0);
  const data = {
    v: 2, id: 'sheffield-kelham-2',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'temperate', 'water', 'birds', 'people'],
    sky: { stars: 160, clouds: { n: 3, y: [40, 240], speed: 4 }, sunR: 24, moonR: 18 },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'yard', kind: 'plaza', poly: yard },
      { id: 'green', kind: 'grass', poly: [[10, 36], [18, 36], [18, 56], [10, 56]] },
      { id: 'lip-l', kind: 'verge', poly: bankL.concat(lipL.slice().reverse()) },
      { id: 'walk', kind: 'path', path: walkC, width: 2.8 },
    ],
    water: [{ id: 'goit', kind: 'canal', poly: goit, edge: 'none', ripple: 0.12, mirror: 0.85, rings: true }],
    buildings: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, S = data.scatter, A = data.actors;
  // the hills of Upperthorpe and Walkley over the valley, terraces along their contours
  Pl.push(_klmPiece('v2-hill', _klmHillside(17, 380, 1700, H + 2, H - 72, { rows: 6, wall0: '#a08e76', wall1: '#8e6250' }), null, 'horizon', { ay: H - 2 }));
  // the goit walls
  Pl.push(..._klmWall(cam, bankL, cam.water, ['#7e7462', '#a89c82', '#3a3630', '#4e4638'], 'v2-wl'));   // (the near wall faces the water, away from us)
  // across the goit: the backs of the cutlery works rising from the water (flats now), a newer block among them
  const block = (d0, d1, depth, o) => {
    const a = bankL.filter(p => p[1] >= d0 && p[1] <= d1), first = a[0], last = a[a.length - 1];
    const back = SCENE_KLM.offset([first, last], -depth);
    B.push(Object.assign({ foot: [first, last, back[1], back[0]], style: 'kelham-works' }, o));
  };
  block(22, 44, 11, { storeys: 3, seed: 301 });
  block(46, 72, 12, { storeys: 4, seed: 302 });
  block(74, 104, 12, { storeys: 3, seed: 303 });
  // the near bank opposite: a strip of rough ground behind the wall, an alder and an elder leaning out, the works' old yard wall
  S.push({ obj: { 'tree.bank-alder': 2, 'tree.bank-willow': 1 }, on: 'lip-l', d: [7, 20], n: 3, dist: 'ground', minGap: 60, k: [0.72, 0.9], seed: 335, anim: false });
  B.push({ foot: [[-30, 120], [-8, 116], [-6, 150], [-28, 154]], style: 'kelham-flats', storeys: 6, seed: 304 });
  // the museum: the old generating station's long range on the right, the engine hall at the end of the vista, the chimney
  B.push({ foot: [[13, 4], [13, 30], [27, 30], [27, 4]], style: 'mill', storeys: 3, seed: 311 });
  const hallFoot = [[2.2, 60], [17, 58], [19, 86], [4.2, 88]];
  Pl.push(_klmPiece('v2-hall', (season) => SCENE_KLM_DRAW.hall(cam, hallFoot, 12, 16.5, season), null, 'mid', { night: true, on: 0.5, landmark: true }));
  B.push({ foot: [[20, 92], [40, 92], [40, 118], [20, 118]], style: 'kelham-works', storeys: 3, seed: 312 });
  Pl.push({ obj: 'landmark.klm-chimney', at: [30, 128], fix: true, variant: 0 });
  Pl.push({ obj: 'structure.klm-bessemer', at: [6.6, 25], fix: true, flip: true });
  Pl.push({ obj: 'person.photographer', at: [4.6, 21], face: 'right' }, { obj: 'person.elderly-couple', at: [8.8, 21.5], face: 'left' });
  // trees on the little green by the hall, buddleia and grass along the far wall top
  Pl.push({ obj: 'tree.bank-alder', at: [15, 52], k: 0.8, anim: false }, { obj: 'tree.bank-birch', at: [14, 42], k: 0.8, anim: false });
  S.push({ obj: { 'plant.grass-long': 4, 'plant.canal-view-loosestrife': 3 }, on: 'lip-l', d: [10, 110], n: 26, dist: 'screen', minGap: 22, cluster: { centres: 5, spread: 3 }, k: [0.75, 1.2], seed: 333, anim: false, tint: { col: '#7a5a8a', k: [0, 0.18] } });
  S.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, on: 'green', d: [36, 56], n: 14, k: [0.55, 1.45], minGap: 20, dist: 'screen', minGap: 14, cluster: { centres: 3, spread: 2 }, k: [0.8, 1.2], seed: 334, anim: false, tint: { col: '#8a8a40', k: [0, 0.16] } });
  // the railings along the goit edge on the walk side (the leading line)
  Pl.push(..._klmRailing(cam, _klmEvery(SCENE_KLM.offset(C, hw + 0.25), 2.2), 1.1, 'v2-rail'));
  // the life: mallards and a moorhen on the goit, a heron on the far wall top, pigeons on the setts, visitors and families
  A.push(..._klmBehave(data, { obj: 'bird.mallard', ground: [[-5.2, 14], [-4.2, 22], [-3.6, 30]], speedM: 0.2, loop: 'pingpong', seed: 341, offset: 0.2 }));
  A.push(..._klmBehave(data, { obj: 'bird.mallard', ground: [[-4.6, 15], [-3.6, 23], [-3.0, 31]], speedM: 0.2, loop: 'pingpong', variant: 1, seed: 342, offset: 0.24 }));
  A.push(..._klmBehave(data, { obj: 'bird.moorhen', ground: [[-6.6, 40], [-6.2, 46], [-5.6, 52]], speedM: 0.12, loop: 'pingpong', k: 1.1, seed: 343, offset: 0.5 }));
  { const q = P(-8.4, 34, 0), def = typeof sceneObj === 'function' ? sceneObj('bird.heron') : null; if (def) Pl.push({ obj: 'bird.heron', x: _klmR1(q[0]), y: _klmR1(q[1]), s: _klmR2(f / 34 * 0.95 / def.size[1]), pin: true, layer: 'near' }); }
  S.push({ obj: 'bird.pigeon-feral', on: 'yard', d: [9, 30], n: 7, dist: 'screen', minGap: 18, cluster: { centres: 2, spread: 2 }, seed: 344, k: [0.9, 1.1] });
  data.flows.push({ id: 'visitors', kind: 'walk', on: ['walk', 'yard'], density: 3, profile: 'town', mix: { 'person.couple': 3, 'person.walker': 2, 'person.student': 2, 'person.child-scooter': 1, 'person.elderly-couple': 1, 'person.photographer': 1, 'person.dog-walker': 2, 'person.family': 1 }, speed: [0.9, 1.3], both: true, max: 12 });
  data.flocks.push({ obj: 'bird.pigeon-feral', n: 5, area: [500, 120, 1300, 300], speed: 50, s: 0.4, seed: 345, layer: 'mid' });
  // framing: the lamp standard on the walk, a sycamore bough over the top right
  Pl.push({ obj: 'street.lamppost', at: [4.2, 9.5], fix: true, anim: false }, { obj: 'street.lamppost', at: [2.6, 30], fix: true, anim: false });
  Pl.push({ obj: 'person.bench-sitter', at: [6.5, 14], face: 'left' });
  // the yard's furniture: benches, planters with shrubs, bollards at the gate, a museum sign post (blank)
  Pl.push({ obj: 'street.bench', at: [6.5, 14], face: 'left' }, { obj: 'street.bench', at: [7.2, 34], face: 'left' });
  Pl.push({ obj: 'plant.planter', at: [11.5, 12], k: 1 }, { obj: 'plant.planter', at: [12.2, 40], k: 0.9 }, { obj: 'plant.planter', at: [4.6, 44], k: 1.1 });
  S.push({ obj: 'street.bollard', on: 'yard', d: [16, 26], n: 4, dist: 'screen', minGap: 26, seed: 336 });
  // the foot of the frame: tufts in the joints of the setts and along the walk's edge, leaves blown against the railings
  S.push({ obj: { 'ground.leaf-litter': 3, 'ground.leaves': 1, 'plant.grass': 3, 'plant.wildflowers': 1 }, on: ['walk', 'yard'], d: [3.2, 12], n: 72, dist: 'screen', minGap: 30, mask: { noise: { scale: 200, cut: 0.35 } }, k: [0.8, 1.3], seed: 337, anim: false, tint: { col: '#8a7a40', k: [0, 0.16] } });
  // (the busier visitors' flow below fills the yard with people; the leaf litter and tufts already texture the setts)
  Pl.push({ obj: 'plant.klm-sycamore-bough', x: 1700, y: -30, s: 1.1, pin: true, layer: 'front', shadow: false, flip: true, variant: 0 });
  return data;
}

/** The point and unit tangent of a polyline at arc length s: [x, d, tx, td]. */
function _klmAt(L, s) {
  let acc = 0;
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1], b = L[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= s || i === L.length - 1) { const t = Math.max(0, Math.min(1, (s - acc) / seg)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / seg, (b[1] - a[1]) / seg]; }
    acc += seg;
  }
  return [L[0][0], L[0][1], 0, 1];
}
/**
 * Frontages along a street edge: buildings placed one after another from arc s0, each [frontage, depth, style, storeys, seed,
 * extra]; side -1 (the left of the path's direction) or 1, at offset o from the centreline. A frontage of style null is a gap.
 */
function _klmRow(L, s0, side, o, list) {
  const out = [];
  let s = s0;
  for (const [w, dp, style, storeys, seed, extra] of list) {
    if (style) {
      const a = _klmAt(L, s), b = _klmAt(L, s + w);
      const n = (q) => [q[0] + side * q[3] * o, q[1] - side * q[2] * o];
      const n2 = (q) => [q[0] + side * q[3] * (o + dp), q[1] - side * q[2] * (o + dp)];
      out.push(Object.assign({ foot: [n(a), n(b), n2(b), n2(a)].map(p => [_klmR2(p[0]), _klmR2(p[1])]), style, storeys, seed }, extra || {}));
    }
    s += w;
  }
  return out;
}

/**
 * People on foot built with the behaviour presets (true scale, routed round furniture, eased stops): each entry
 * [obj, preset, route (ground metres), seed, offset]; a 'dog' preset entry makes a walker with an off-lead dog.
 */
function _klmPeople(data, list) {
  if (typeof sceneBehave === 'undefined') return;
  for (const [obj, preset, route, seed, offset] of list) {
    const spec = { obj, preset, route, seed, offset: offset || 0 };
    const out = preset === 'dog' ? sceneBehave.walkWithDog(data, { walker: obj, route, seed, offset: offset || 0 }) : sceneBehave.actors(data, spec);
    for (const a of out) data.actors.push(a);
  }
}

/**
 * A water bird or wader as a behaviour preset (sceneBehave): the route in ground metres (kept on the water, round the boats and
 * banks), true size, eased turns, its own pauses (preen, dabble, look). o: { obj, ground: route, preset?, seed, offset, variant }.
 */
function _klmBehave(data, o) {
  if (typeof sceneBehave === 'undefined') return [];
  const preset = o.preset || (/heron/.test(o.obj) ? 'heron-stalk' : null) || undefined;
  // (no up-ending dabble: its companion actor doubles the data; a look round and a preen are enough on a town river.
  // k 1.45 on the small water birds: the behaviour sizes them by real height, the motion lint by body length (0.69 apart))
  return sceneBehave.actors(data, { obj: o.obj, preset, k: /mallard|moorhen|coot/.test(o.obj) ? 1.45 : undefined, route: o.ground, seed: o.seed, offset: o.offset || 0, variant: o.variant | 0, acts: /mallard|duck/.test(o.obj) ? ['look', 'preen', 'look'] : undefined });
}

/* ============================================================
   View 3: Alma Street at the Fat Cat, looking west along the street on a busy day.
   From the corner on the near pavement: Alma Street runs away to the right between its works and ale houses, cobbled
   gutters, cars and taxis nosing along it, people on both pavements. Across the street the Fat Cat, the plain two-storey
   brick ale house (opened 1981 as Sheffield's first real-ale free house) with its dark green pub front, drinkers at the
   tables outside; the Kelham Island Brewery beside it, then the old works, flats now, and new blocks further along; the
   side street opening on its left with a works chimney rising over the roofs. Pigeons on the pavement, a cyclist, dog
   walkers, a couple with takeaway coffee. Framing: a young street lime on the near kerb, its bough over the top, bollards.
   ============================================================ */
function sceneUkSheffieldKelhamV3() {
  const V = SCENE_KLM.v3, cam = V.camera, J = SCENE_KLM.proj(cam), H = cam.horizon;
  // Alma Street as a straight line in plan: C0 + t * dir; its left normal (the far side) and right normal (our side)
  const dir = V.dir, C0 = V.c0, nl = [-dir[1], dir[0]], nr = [dir[1], -dir[0]];
  const at = (t, k) => [_klmR2(C0[0] + dir[0] * t + nl[0] * k), _klmR2(C0[1] + dir[1] * t + nl[1] * k)];   // k > 0: the far side
  const quad = (t0, t1, k0, k1) => [at(t0, k0), at(t1, k0), at(t1, k1), at(t0, k1)];
  // the side street (Alma Street's corner): from the far kerb at t 2.6, away along the far normal
  const sideC = (u) => [_klmR2(C0[0] + dir[0] * 2.6 + nl[0] * u), _klmR2(C0[1] + dir[1] * 2.6 + nl[1] * u)];
  const sideAt = (u, k) => { const c = sideC(u); return [_klmR2(c[0] + dir[0] * k), _klmR2(c[1] + dir[1] * k)]; };   // k > 0: toward the pub
  const data = {
    v: 2, id: 'sheffield-kelham-3',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'temperate', 'birds', 'people'],
    sky: { stars: 140, clouds: { n: 3, y: [40, 240], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'side', kind: 'road', path: [sideC(3.4), sideC(30), sideC(90)], width: 6.4, markings: 'none' },
      { id: 'side-pl', kind: 'pavement', beside: 'side', side: 'left', width: 1.8, kerb: 0.12 },
      { id: 'side-pr', kind: 'pavement', beside: 'side', side: 'right', width: 1.8, kerb: 0.12 },
      { id: 'alma', kind: 'road', path: [at(-30, 0), at(60, 0), at(220, 0)], width: 6.4, markings: 'centre' },
      { id: 'bays-far', kind: 'parking', beside: 'alma', side: 'left', width: 2.2 },
      { id: 'bays-near', kind: 'parking', beside: 'alma', side: 'right', width: 2.2 },
      { id: 'pave-far', kind: 'pavement', beside: 'bays-far', side: 'left', width: 3.0, kerb: 0.12 },
      { id: 'pave-near', kind: 'pavement', beside: 'bays-near', side: 'right', width: 5.2, kerb: 0.12 },
      { id: 'xing', kind: 'road', path: [at(4.5, -5.4), at(4.5, 5.4)], width: 3, markings: 'zebra', crossing: true },
    ],
    buildings: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, S = data.scatter;
  const FK = 3.2 + 2.2 + 3.0 + 0.1, NK = -(3.2 + 2.2 + 5.2 + 0.1);   // the far and near building lines
  // the far side: the corner works left of the side street, the Fat Cat on the other corner, the brewery, works, flats on
  B.push({ foot: quad(-26, -2.6, FK, FK + 13), style: 'kelham-works', storeys: 3, seed: 401 });
  B.push({ foot: [sideAt(21, -5.2), sideAt(44, -5.2), sideAt(44, -17), sideAt(21, -17)], style: 'kelham-works', storeys: 4, seed: 408 });
  const t0 = 7.7, Fa = at(t0, FK), Fb = at(t0 + 11.5, FK);
  Pl.push(_klmPiece('v3-fatcat', (season) => SCENE_KLM_DRAW.fatCat(SCENE_KLM_DRAW.facade(cam, Fa, Fb), season), null, 'near', { night: true, on: 1, landmark: true }));
  B.push({ foot: [sideAt(16.2, 5.2), sideAt(36, 5.2), sideAt(36, 15), sideAt(16.2, 15)], style: 'kelham-works', storeys: 3, seed: 409 });
  B.push({ foot: quad(t0 + 11.6, t0 + 25, FK, FK + 14), style: 'kelham-works', storeys: 2, seed: 403 });
  B.push({ foot: quad(t0 + 25, t0 + 48, FK, FK + 14), style: 'kelham-works', storeys: 4, seed: 404 });
  B.push({ foot: quad(t0 + 52, t0 + 78, FK, FK + 16), style: 'kelham-flats', storeys: 5, seed: 405 });
  B.push({ foot: quad(t0 + 78, t0 + 108, FK, FK + 14), style: 'kelham-works', storeys: 3, seed: 406 });
  B.push({ foot: quad(t0 + 110, t0 + 150, FK, FK + 16), style: 'kelham-flats', storeys: 6, seed: 407 });
  // our side, to the right: a works range (flats now), a gap to a yard, new flats, works
  B.push({ foot: quad(5, 26, NK, NK - 12), style: 'kelham-works', storeys: 3, seed: 411 });
  B.push({ foot: quad(32, 58, NK, NK - 14), style: 'kelham-flats', storeys: 5, seed: 412 });
  B.push({ foot: quad(60, 92, NK, NK - 12), style: 'kelham-works', storeys: 4, seed: 413 });
  B.push({ foot: quad(94, 140, NK, NK - 14), style: 'kelham-flats', storeys: 6, seed: 414 });
  // over the roofs: the works chimney up the side street, the hills beyond
  Pl.push({ obj: 'landmark.klm-chimney', at: [16, 132], fix: true, variant: 0 });
  Pl.push(_klmPiece('v3-hill', _klmHillside(29, -170, 1770, H + 2, H - 60, { rows: 5 }), null, 'horizon', { ay: H - 2 }));
  // street furniture: lamp standards and young limes in pits along the far pavement, bollards and a planter on our side
  // (the limes and lamps stand in build-outs between the parking bays, so the pavement stays clear for people)
  for (const t of [39, 58, 80]) Pl.push({ obj: 'tree.plane-avenue', at: at(t, 4.4), pit: true, k: 0.5, anim: false });
  for (const t of [2, 6, 10]) Pl.push({ obj: 'street.bollard', at: at(t, -5.8) });
  Pl.push({ obj: 'plant.planter', at: at(14, -7.4), k: 1 }, { obj: 'tree.plane-avenue', at: at(20, -6.0), pit: true, k: 0.55, anim: false });
  // cars parked in the bays both sides (the traffic passes between them)
  [[11, -4.3, 2], [27, -4.3, 1], [33, 4.3, 1], [46, 4.3, 2]].forEach(([t, k, v], i) => Pl.push({ obj: i % 3 === 1 ? 'vehicle.car-city' : 'vehicle.car', at: at(t, k), variant: v, dir: i % 2 ? 'away' : 'toward' }));
  S.push({ obj: 'bird.pigeon-feral', on: ['pave-near', 'pave-far'], d: [8, 40], n: 9, dist: 'screen', minGap: 20, cluster: { centres: 3, spread: 2 }, seed: 422, k: [0.9, 1.1] });
  // the drinkers outside the Fat Cat (placed: they sit), a dog by the door
  // (the seated drinkers sit on the benches' street side: their table lamps' spill must not wash the pub front at night)
  Pl.push({ obj: 'person.cafe-goer', at: at(t0 + 1.8, FK - 2.75), face: 'left', k: 0.78 }, { obj: 'person.cafe-goer', at: at(t0 + 3.0, FK - 2.8), face: 'right', variant: 1, k: 0.78 },
    { obj: 'person.cafe-goer', at: at(t0 + 9.3, FK - 2.75), face: 'left', variant: 2, k: 0.78 }, { obj: 'animal.dog', at: at(t0 + 12.5, FK - 1.2), face: 'left' });
  // a few people with a behaviour of their own (true scale, eased stops, there and back so nobody pops mid-frame): a pair
  // stopping to chat past the brewery, a shopper, a walker up the side street; the crowd itself is the flows below
  _klmPeople(data, [
    ['person.shopper', 'brisk', [at(25, FK - 1.4), at(43, FK - 1.4)], 3111, 0.55], ['person.walker', 'stroll', [sideAt(26, -6.0), sideAt(44, -6.0)], 3114, 0.6],
  ]);
  if (typeof sceneBehave !== 'undefined') data.actors.push(...sceneBehave.pair(data, { objs: ['person.walker', 'person.takeaway-walker'], route: [at(t0 + 13, FK - 0.6), at(t0 + 34, FK - 0.6)], seed: 3120, offset: 0.25 }));
  // the far pavement's dressing: a bin and planters by the brewery, worn and patched flags, leaves (the limes stand in the bays)
  Pl.push({ obj: 'street.mqn-planter-grass', at: at(t0 + 12.4, FK - 0.45), variant: 0 }, { obj: 'plant.planter', at: at(t0 + 22, FK - 0.45), k: 0.9 });
  S.push({ obj: { 'ground.stockyards-wear': 2, 'ground.stockyards-paving': 2, 'ground.leaves': 1 }, on: ['pave-near', 'pave-far', 'side-pl', 'side-pr'], d: [3, 40], n: 46, dist: 'screen', minGap: 26, mask: { noise: { scale: 220, cut: 0.3 } }, k: [0.8, 1.3], seed: 3130, anim: false, tint: { col: '#7a7468', k: [0, 0.2] } });
  // the street's life: a steady crowd on both pavements and up the side street, people on the zebra, the traffic, cyclists
  data.flows.push({ id: 'crossers', kind: 'walk', on: 'xing', density: 2.4, profile: 'town', mix: { 'person.walker': 2, 'person.student': 2, 'person.shopper': 1, 'person.couple': 1 }, speed: [1.1, 1.4], both: true, max: 4 });
  data.flows.push({ id: 'walkers', kind: 'walk', on: ['pave-far', 'pave-near', 'side-pl', 'side-pr'], density: 4, profile: 'town', mix: { 'person.walker': 3, 'person.student': 3, 'person.couple': 2, 'person.dog-walker': 2, 'person.takeaway-walker': 2, 'person.shopper': 2, 'person.commuter': 2, 'person.buggy-walker': 1, 'person.elderly-walker': 1 }, speed: [1.1, 1.5], both: true, max: 26 });
  data.flows.push({ id: 'traffic', kind: 'drive', on: 'alma', density: 1.2, profile: 'town', mix: { 'vehicle.car': 5, 'vehicle.car-city': 3, 'vehicle.taxi-black': 1, 'vehicle.taxi': 1 }, max: 7 });
  data.flows.push({ id: 'cycles', kind: 'cycle', on: 'alma', density: 0.6, profile: 'town', mix: { 'person.cyclist': 2, 'person.cyclist-commuter': 1 }, max: 2 });
  data.flocks.push({ obj: 'bird.pigeon-feral', n: 6, area: [300, 120, 1300, 320], speed: 55, s: 0.4, seed: 424, layer: 'mid' });
  data.flocks.push({ obj: 'bird.herring-gull-flight', n: 2, area: [100, 60, 1500, 200], speed: 30, s: 0.45, seed: 425, layer: 'far' });
  // framing: a lime's bough over the top left from the tree behind us
  Pl.push({ obj: 'plant.klm-sycamore-bough', x: -50, y: -40, s: 1.1, pin: true, layer: 'front', shadow: false, variant: 1 });
  return data;
}

/* ============================================================
   View 4: Green Lane at the Works gateway, looking south-west along Green Lane.
   On the pavement of Green Lane: the street runs away to the left, and across it the long front of Green Lane Works (1795,
   rebuilt 1860 for the Hoole family's stove-grate and fender works, flats now) with its gateway: a triumphal arch of ashlar
   between paired columns, an attic over and on top the clock turret with its cupola. The works' brick range runs on either
   side of it, more works and new flats beyond along the street; a glimpse through the arch into the yard. Cyclists on the
   cycle route, people walking to the bars and the river, a dog walker, cars and a van; pigeons on the gateway's cornice.
   Framing: a young lime's trunk and bough on our kerb at the right, cast-iron bollards.
   ============================================================ */
function sceneUkSheffieldKelhamV4() {
  const V = SCENE_KLM.v4, cam = V.camera, J = SCENE_KLM.proj(cam), H = cam.horizon, P = J.p, f = J.f;
  // Green Lane, straight in plan: C0 + t * dir (receding to the LEFT); the far side is its right (nf), ours its left
  const dir = V.dir, C0 = V.c0, nf = [dir[1], -dir[0]];
  const at = (t, k) => [_klmR2(C0[0] + dir[0] * t + nf[0] * k), _klmR2(C0[1] + dir[1] * t + nf[1] * k)];   // k > 0: the far side
  const quad = (t0, t1, k0, k1) => [at(t0, k0), at(t1, k0), at(t1, k1), at(t0, k1)];
  const data = {
    v: 2, id: 'sheffield-kelham-4',
    view: { lat: cam.lat, lon: cam.lon },
    camera: Object.assign({}, cam),
    at: 'afternoon', season: 'auto', setting: 'urban', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season', signage: false,
    kits: ['urban', 'temperate', 'birds', 'people'],
    sky: { stars: 140, clouds: { n: 3, y: [40, 240], speed: 5 }, sunR: 24, moonR: 18 },
    surfaces: [
      { id: 'land', kind: 'plot', rest: true },
      { id: 'lane', kind: 'road', path: [at(-30, 0), at(60, 0), at(220, 0)], width: 6.6, markings: 'centre' },
      { id: 'cycle', kind: 'cycleway', beside: 'lane', side: 'right', width: 1.6 },
      { id: 'pave-far', kind: 'pavement', beside: 'cycle', side: 'right', width: 2.8, kerb: 0.12 },
      { id: 'pave-near', kind: 'pavement', beside: 'lane', side: 'left', width: 11, kerb: 0.12 },
    ],
    buildings: [], place: [], scatter: [], actors: [], flocks: [], flows: [],
  };
  const B = data.buildings, Pl = data.place, S = data.scatter;
  const FK = 3.3 + 1.6 + 2.8 + 0.1, NK = -(3.3 + 11 + 0.1);
  // the works front: the range to the right of the gateway (nearer), the gateway, the range to its left, more works, flats
  const g0 = 21.6;
  B.push({ foot: quad(-30, -6, FK, FK + 12), style: 'kelham-works', storeys: 3, seed: 501 });
  B.push({ foot: quad(-4, g0, FK, FK + 12), style: 'kelham-works', storeys: 2, seed: 506 });
  const Ga = at(g0, FK - 0.05), Gb = at(g0 + 10, FK - 0.05);
  Pl.push(_klmPiece('v4-gateway-wall', (season) => SCENE_KLM_DRAW.gateway(SCENE_KLM_DRAW.facade(cam, Ga, Gb), season), null, 'near', { landmark: true, night: true, on: 1, real: { h: 1, w: 0.4 } }));
  B.push({ foot: quad(g0 + 10, g0 + 44, FK, FK + 12), style: 'kelham-works', storeys: 2, seed: 502 });
  B.push({ foot: quad(g0 + 46, g0 + 70, FK, FK + 14), style: 'kelham-works', storeys: 4, seed: 503 });
  B.push({ foot: quad(g0 + 74, g0 + 104, FK, FK + 16), style: 'kelham-flats', storeys: 6, seed: 504 });
  B.push({ foot: quad(g0 + 106, g0 + 150, FK, FK + 14), style: 'kelham-works', storeys: 3, seed: 505 });
  // our side, ahead on the left: flats, a works, more flats
  B.push({ foot: quad(2, 30, NK, NK - 14), style: 'kelham-flats', storeys: 5, seed: 511 });
  B.push({ foot: quad(32, 62, NK, NK - 12), style: 'kelham-works', storeys: 3, seed: 512 });
  B.push({ foot: quad(64, 110, NK, NK - 16), style: 'kelham-flats', storeys: 6, seed: 513 });
  // the forecourt's paving: granite bands across the setts, in perspective (lines only, the near part)
  { const lines = { fore: ['', ''], near: ['', ''] };
    const add = (pts, k) => { let run = [], band = null; const flush = () => { if (run.length > 1) lines[band][k] += _klmPath(run.map(p => P(p[0], p[1], 0))); run = []; };
      for (const p of pts) { const b = p[1] < 15 ? 'fore' : 'near'; if (band && b !== band) { run.push(p); flush(); } band = b; run.push(p); } flush(); };
    for (let k = -4.4; k > NK + 0.5; k -= 1.6) { const pts = []; for (let t = -8; t <= 40; t += 1) pts.push(at(t, k)); add(pts.filter(p => p[1] > 3), 0); }
    for (let t = -8; t <= 40; t += 2.4) { const pts = []; for (let k = -3.4; k > NK + 0.4; k -= 1) pts.push(at(t, k)); add(pts.filter(p => p[1] > 3), 1); }
    for (const band of ['fore', 'near']) Pl.push(_klmPiece('v4-paving-' + band, [{ s: '#8a8478', w: 1.2, d: lines[band][0] || 'M0 0', op: 0.5 }, { s: '#9a948a', w: 0.8, d: lines[band][1] || 'M0 0', op: 0.35 }], null, band, { ay: H - 2 })); }
  // the forecourt of the flats on our side: benches, planters, a young lime or two
  Pl.push({ obj: 'street.bench', at: at(17, -9), face: 'right' }, { obj: 'person.bench-reader', at: at(17, -9), face: 'right' }, { obj: 'plant.planter', at: at(12, -12), k: 1 }, { obj: 'street.bench', at: at(4, -10.6), face: 'right' });
  // more on the forecourt: street trees in pits, cycle hoops with their bikes, a litter bin, grass planters, worn flags and leaves
  for (const [t, k, v] of [[14, -13.2, 2]]) Pl.push({ obj: 'tree.mqn-street-tree', at: at(t, k), variant: v, pit: true, anim: false, flip: v === 1 });
  for (const [t, v] of [[7.4, 0], [8.6, 2], [9.8, 1], [11, 0]]) Pl.push({ obj: 'street.mqn-bike-hoop', at: at(t, -6.2), variant: v });
  Pl.push({ obj: 'street.mqn-planter-grass', at: at(24, -12.8), variant: 2 });
  S.push({ obj: { 'ground.stockyards-wear': 2, 'ground.stockyards-paving': 2, 'ground.leaves': 1 }, on: ['pave-near', 'pave-far'], d: [3, 40], n: 40, dist: 'screen', minGap: 30, mask: { noise: { scale: 220, cut: 0.3 } }, k: [0.8, 1.3], seed: 5130, anim: false, tint: { col: '#7a7468', k: [0, 0.2] } });
  // over the roofs: a works chimney and the hills
  Pl.push({ obj: 'landmark.klm-chimney', at: at(70, FK + 40), fix: true, variant: 1 });
  Pl.push(_klmPiece('v4-hill', _klmHillside(41, -170, 1770, H + 2, H - 58, { rows: 5, wall0: '#a4927a' }), null, 'horizon', { ay: H - 2 }));
  // street furniture: lamp standards on the far pavement, limes in pits on ours, bollards at the kerb, a cycle stand
  for (const t of [62, 92]) Pl.push({ obj: 'street.lamppost', at: at(t, FK - 0.6), anim: false });
  for (const t of [22, 50, 80]) Pl.push({ obj: 'tree.plane-avenue', at: at(t, -4.0), pit: true, k: 0.5, anim: false });
  for (const t of [-1, 3, 7]) Pl.push({ obj: 'street.bollard', at: at(t, -3.7) });
  // pigeons on the gateway's cornice and on the pavements
  { const F = SCENE_KLM_DRAW.facade(cam, Ga, Gb); [[0.9, 8.45], [1.6, 8.45], [8.6, 8.45], [5.6, 12.9]].forEach(([sg, z], i) => { const q = F.p(sg, z, 0.8), dd = Math.hypot(...at(g0 + sg, FK)), def = typeof sceneObj === 'function' ? sceneObj('bird.pigeon-feral') : null; if (def) Pl.push({ obj: 'bird.pigeon-feral', x: _klmR1(q[0]), y: _klmR1(q[1]), s: _klmR2(f / dd * 0.3 / def.size[1]), pin: true, layer: 'near', flip: i % 2 === 0 }); }); }
  S.push({ obj: 'bird.pigeon-feral', on: ['pave-near', 'pave-far'], d: [8, 36], n: 7, dist: 'screen', minGap: 22, cluster: { centres: 2, spread: 2 }, seed: 522, k: [0.9, 1.1] });
  // people on our forecourt: a couple talking, someone on the phone, a dog walker stopped for a chat
  Pl.push({ obj: 'person.couple', at: at(20, -10.5), face: 'left' }, { obj: 'person.phone-idler', at: at(16, -6.5), face: 'right' }, { obj: 'person.dog-walker', at: at(22, -7.5), face: 'right' }, { obj: 'person.student', at: at(28, -12), face: 'left' });
  // people: a couple under the arch, someone photographing the gateway, the flows on both pavements and the cycle lane
  Pl.push({ obj: 'person.photographer', at: at(g0 + 2, FK - 2.2), face: 'right' }, { obj: 'person.couple', at: at(g0 + 5.4, FK - 0.6), face: 'left' }, { obj: 'person.bench-reader', at: at(g0 + 12, FK - 1.0), face: 'left' });
  data.flows.push({ id: 'walkers', kind: 'walk', on: ['pave-far', 'pave-near'], density: 3.6, profile: 'town', mix: { 'person.walker': 3, 'person.student': 3, 'person.couple': 2, 'person.dog-walker': 2, 'person.jogger': 1, 'person.takeaway-walker': 2, 'person.shopper': 1, 'person.commuter': 2, 'person.buggy-walker': 1, 'person.elderly-walker': 1 }, speed: [1.1, 1.5], both: true, max: 24 });
  data.flows.push({ id: 'cycles', kind: 'cycle', on: 'cycle', density: 0.8, profile: 'commuter', mix: { 'person.cyclist': 2, 'person.cyclist-commuter': 2 }, max: 4 });
  data.flows.push({ id: 'traffic', kind: 'drive', on: 'lane', density: 0.8, profile: 'town', mix: { 'vehicle.car': 5, 'vehicle.car-city': 3, 'vehicle.taxi-black': 1 }, max: 4 });
  data.flocks.push({ obj: 'bird.pigeon-feral', n: 6, area: [300, 100, 1300, 300], speed: 55, s: 0.4, seed: 524, layer: 'mid' });
  data.flocks.push({ obj: 'bird.herring-gull-flight', n: 3, area: [100, 60, 1500, 200], speed: 30, s: 0.45, seed: 525, layer: 'far' });
  // framing: a lime's bough over the top right
  Pl.push({ obj: 'plant.klm-sycamore-bough', x: 1690, y: -40, s: 1.1, pin: true, layer: 'front', shadow: false, flip: true, variant: 0 });
  return data;
}
