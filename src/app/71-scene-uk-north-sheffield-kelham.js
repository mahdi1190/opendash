/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Sheffield: Kelham Island and the River Don, four views.
   docs/dev/SCENE_ENGINE_V2.md. Ground plans, building styles and own objects: 70-scene-lib-sheffield-kelham.js (SCENE_KLM).
   Registered by 72-anim-pack-uk-north-sheffield-kelham.js. PURE: functions only, nothing runs at load.
     https://www.simt.co.uk/kelham-island-museum
   ============================================================ */

/* ---------- shared helpers of the four views ---------- */
const _klmR1 = v => Math.round(v * 10) / 10, _klmR2 = v => Math.round(v * 100) / 100;
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
function sceneUkSheffieldKelhamV1() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
function sceneUkSheffieldKelhamV2() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
function sceneUkSheffieldKelhamV3() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
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
