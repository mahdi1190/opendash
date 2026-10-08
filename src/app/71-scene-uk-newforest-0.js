/* ============================================================
   COMPOSED SCENES: the New Forest (docs/dev/SCENE_ENGINE.md, sections 3 and 8).
   ARCHETYPE 'newforest': the area's repeated scene type. PURE.
   One open landscape built from a row: a horizon of woods (or the Isle of
   Wight hills across the Solent), a far, mid, near and fore ground, the land
   cover by kind (heath: heather, gorse, bracken; lawn: grazed forest lawn;
   marsh: reeds and saltmarsh grass; shingle: the spits and beaches), water by
   kind (pond, river, sea, stream), trees by mix, and the life of the Forest:
   commoners' ponies, fallow deer, cattle, stonechats, small birds, gulls,
   walkers, cyclists, moored yachts, a car on the forest road. The scene's own
   landmark and touches come in the patch (sceneFromArchetype).
   The scene files are 71-scene-uk-newforest-1..N.js; the pack file
   72-anim-pack-uk-area-newforest.js registers their items.
   The place: the New Forest National Park, Hampshire: open heath and forest
   lawns grazed by ponies, cattle and donkeys under common rights, ancient
   oak and beech woods, conifer inclosures, and the coast from Lymington to
   Hurst Spit. https://www.newforestnpa.gov.uk/
   ============================================================ */
const _nf = (function () {
  const R = Math.round;
  /** A lobed tree-line silhouette between x0 and x1, its base at y + 60. */
  const woods = (y, seed, k, x0 = -160, x1 = 1760) => {
    const r = sceneRnd(seed);
    let d = `M${x0} ${y + 60}V${y}`;
    for (let x = x0; x < x1;) { const w = 18 + r() * 34, h = (8 + r() * 22) * k, y1 = y - r() * 8 * k; d += `L${R(x)} ${R(y1)}A${R(w / 2)} ${R(h)} 0 0 1 ${R(x + w)} ${R(y1)}`; x += w * (0.7 + r() * 0.2); }
    return d + `L${x1} ${y + 60}Z`;
  };
  /** A smooth ridge (hills) from y with amplitude amp, filled down to y + depth. */
  const ridge = (y, amp, seed, depth = 60) => {
    const r = sceneRnd(seed), n = 7, p = [];
    for (let i = 0; i <= n; i++) p.push([-160 + i * 1920 / n, y - r() * amp]);
    let d = `M-160 ${y + depth}L-160 ${R(p[0][1])}`;
    for (let i = 1; i <= n; i++) d += `Q${R(p[i - 1][0])} ${R(p[i - 1][1])} ${R((p[i - 1][0] + p[i][0]) / 2)} ${R((p[i - 1][1] + p[i][1]) / 2)}`;
    return d + `L1760 ${R(p[n][1])}L1760 ${y + depth}Z`;
  };
  /** A lumpy oval (a pond). */
  const blob = (cx, cy, rx, ry, seed) => {
    const r = sceneRnd(seed); let d = '';
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, k = 1 + (r() - 0.5) * 0.12; d += `${i ? 'L' : 'M'}${R(cx + Math.cos(a) * rx * k)} ${R(cy + Math.sin(a) * ry * k)}`; }
    return d + 'Z';
  };
  /** A ribbon (a track, a lane, a stream) along [x, y, width] points. */
  const ribbon = (pts) => 'M' + pts.map(([x, y, w]) => `${R(x - w / 2)} ${R(y)}`).join('L') + 'L' + pts.slice().reverse().map(([x, y, w]) => `${R(x + w / 2)} ${R(y)}`).join('L') + 'Z';
  /** A band across the scene between two wavy edges. */
  const band = (y0, y1, seed) => {
    const r = sceneRnd(seed), a = [], b = [];
    for (let i = 0; i <= 8; i++) { a.push([-160 + i * 240, y0 + (r() - 0.5) * 8]); b.push([-160 + i * 240, y1 + (r() - 0.5) * 10]); }
    return 'M' + a.map(([x, y]) => `${R(x)} ${R(y)}`).join('L') + 'L' + b.reverse().map(([x, y]) => `${R(x)} ${R(y)}`).join('L') + 'Z';
  };
  /** The scale for an object `h` units tall standing `m` metres tall at row y. */
  const sz = (view, y, h, m) => Math.round(scenePersonHeight(view, y) * (m / 1.72) / h * 100) / 100;
  return { woods, ridge, blob, ribbon, band, sz };
})();

const NF_LANDS = {
  heath: { base: ['#76743e', '#5c5c32', '#8a8648'], spring: ['#7a8040', '#5e6634', '#8e9450'], summer: ['#76664a', '#5c5036', '#8a7258'], autumn: ['#8e7640', '#6e5a30', '#a48c50'], winter: ['#827e66', '#66624e', '#9c9880'] },
  lawn: { base: ['#6a9040', '#4f7434', '#88aa50'], spring: ['#76a046', '#587e38', '#96ba5a'], summer: ['#6a9040', '#4f7434', '#88aa50'], autumn: ['#86883e', '#6a6c32', '#a0a050'], winter: ['#8a9478', '#6e7a62', '#a4ac92'] },
  marsh: { base: ['#7a8450', '#5e6a3e', '#9aa060'], spring: ['#7e9050', '#62743e', '#9ab062'], summer: ['#7a8450', '#5e6a3e', '#9aa060'], autumn: ['#94844a', '#76683a', '#ae9c5a'], winter: ['#9a9478', '#7c7862', '#b2ac92'] },
  shingle: { base: ['#c4b89c', '#a89c80', '#ddd2b8'], spring: ['#c4b89c', '#a89c80', '#ddd2b8'], summer: ['#cabe9e', '#ae9f80', '#e2d6b8'], autumn: ['#bcae92', '#a09276', '#d4c8ac'], winter: ['#b8b2a2', '#9c968a', '#d0cabc'] },
  wood: { base: ['#5e6a36', '#465028', '#727c42'], spring: ['#667a38', '#4c5c2a', '#7c904a'], summer: ['#5e6a36', '#465028', '#727c42'], autumn: ['#86643a', '#684c2a', '#a07a46'], winter: ['#6e6650', '#56503e', '#857c64'] },
  village: { base: ['#6a8a42', '#506c34', '#86a452'], spring: ['#72963e', '#567834', '#90b056'], summer: ['#6a8a42', '#506c34', '#86a452'], autumn: ['#82843e', '#666832', '#9c9c50'], winter: ['#8a9078', '#6e7662', '#a4aa92'] },
};
/** The cover objects (weights) per land kind: near and fore, and the far (static) cover. */
const NF_COVER = {
  heath: { near: { 'plant.heather': 5, 'plant.grass': 2 }, far: { 'plant.heather': 3, 'plant.grass': 1 }, shrub: 'plant.gorse' },
  lawn: { near: { 'plant.grass': 3, 'plant.wildflowers': 2 }, far: { 'plant.grass': 1 }, shrub: 'plant.holly' },
  marsh: { near: { 'plant.reed': 3, 'plant.grass': 4, 'plant.bulrush': 1 }, far: { 'plant.grass': 2, 'plant.reed': 1 }, shrub: 'plant.shrub' },
  shingle: { near: { 'rock.stones': 3, 'plant.grass': 2 }, far: { 'rock.stones': 2, 'plant.grass': 1 }, shrub: 'plant.gorse' },
  wood: { near: { 'plant.grass': 3, 'plant.bluebells': 1 }, fore: { 'plant.bracken': 2, 'plant.grass': 3 }, far: { 'plant.grass': 2, 'plant.bluebells': 1 }, shrub: 'plant.holly' },
  village: { near: { 'plant.grass': 3, 'plant.wildflowers': 2, 'plant.shrub': 1 }, far: { 'plant.grass': 1 }, shrub: 'plant.shrub' },
};
const NF_TREES = { pine: 'tree.pool-pine', birch: 'tree.birch-heath', oak: 'tree.bank-oak', alder: 'tree.bank-alder', willow: 'tree.bank-willow', hawthorn: 'tree.pond-oak', holly: 'plant.holly', 'small-pine': 'tree.pond-pine', 'small-oak': 'tree.pond-oak' };
/** The framing trees (front layer). */
const NF_FRAME = { pine: 'tree.pine-veteran', oak: 'tree.bank-oak', birch: 'tree.pool-birch', alder: 'tree.bank-alder', willow: 'tree.bank-willow' };

function sceneArchNewForest(p, u) {
  const H = Number.isFinite(p.horizon) ? p.horizon : 500, id = String(p.id);
  const landKey = NF_LANDS[p.land] ? p.land : 'heath', cover = NF_COVER[landKey];
  const view = { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 200, fov: 78, horizon: H, lift: 1 };
  const water = p.water || 'none', has = u.has, r = sceneRnd(sceneHash(id + '|nf'));
  const dens = Number.isFinite(p.density) ? p.density : 1, n = k => Math.max(0, Math.round(k * dens));
  const L = NF_LANDS[landKey];
  const palette = {
    base: { hills: ['#8ea2b0', '#a8b8c2'], woods: ['#4a5e44', '#5e7452'], land: L.base, path: ['#c4b08a', '#a8946e', '#dccaa4'], bank: ['#6a5c3a'], sand: ['#d2c4a2', '#b8a888'] },
    spring: { woods: ['#506a46', '#68845a'], land: L.spring },
    summer: { land: L.summer },
    autumn: { woods: ['#6e6038', '#84744a'], land: L.autumn, path: ['#b8a07a', '#9a845e', '#d0bc94'] },
    winter: { woods: ['#5e5e62', '#727276'], hills: ['#9eacb8', '#b8c4cc'], land: L.winter, path: ['#b0a490', '#948876', '#cabfab'] },
  };
  const data = {
    v: 1, id, view, at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: has('village') ? 'mixed' : 'natural', signage: false, palette,
    sky: { stars: 200, clouds: { n: 5, y: [40, Math.max(180, H - 170)], speed: 6 }, sunR: 26, moonR: 20 },
    // the default layers, but mid shares near's haze bucket (0.1): mid and near cover then share their sprites (a small SVG still)
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l, l.id === 'mid' ? { haze: 0.1 } : l.id === 'far' ? { haze: 0.35 } : {})),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  const G = (layer, d, fill) => data.ground.push({ layer, d, fill });
  const lin = (a, b, y1, y2) => ({ lin: [[0, a], [1, b]], x1: 0, y1, x2: 0, y2 });
  const avoid = [];   // rects / polys the cover keeps clear of
  // ---- the horizon: hills (the Isle of Wight across the Solent, or the Forest's own rises), the woods
  if (p.hills) G('horizon', _nf.ridge(H - 4, p.hills, sceneHash(id + 'h')), lin('@hills.0', '@hills.1', H - p.hills, H + 40));
  const sea = water === 'sea', wy0 = Number.isFinite(p.wy) ? p.wy : sea ? H : H + 60, wy1 = wy0 + (Number.isFinite(p.wh) ? p.wh : sea ? 110 : 70);
  if (!has('nowoods')) {
    G('horizon', _nf.woods(H - 2, sceneHash(id + 'w1'), 1.1, -160, sea ? 640 : 1760), '@woods.0');
    if (!sea) G('horizon', _nf.woods(H + 4, sceneHash(id + 'w2'), 0.7), '@woods.1');
  }
  // ---- the land bands
  if (!sea) G('far', `M-160 900V${H + 4}Q500 ${H - 6} 900 ${H + 4}T1760 ${H + 2}V900Z`, lin('@land.2', '@land.0', H, H + 120));
  else G('far', `M-160 ${H + 4}Q300 ${H - 2} 620 ${H + 2}L640 ${H + 12}H-160Z`, '@land.0');
  const midTop = sea ? wy1 - 6 : H + 50;
  G('mid', `M-160 900V${midTop}Q600 ${midTop - 10} 1000 ${midTop + 2}T1760 ${midTop - 2}V900Z`, lin('@land.0', '@land.1', midTop, 900));
  G('near', `M-160 900V${H + 150}Q500 ${H + 140} 900 ${H + 152}T1760 ${H + 146}V900Z`, lin('@land.1', '@land.0', H + 140, 900));
  // ---- water
  const reflectBand = [];
  if (water === 'pond') {
    const cx = p.wx || 560, rx = p.wr || 300, cy = (wy0 + wy1) / 2, ry = (wy1 - wy0) / 2;
    G('mid', _nf.blob(cx, cy, rx + 10, ry + 6, sceneHash(id + 'pb')), '@bank');
    data.water.push({ layer: 'mid', d: _nf.blob(cx, cy, rx, ry, sceneHash(id + 'p')), y0: wy0, y1: wy1, base: ['#8ab0b8', '#4a7a86', '#244a56'], reflect: true, shimmer: 22, lightPath: true });
    avoid.push({ rect: [cx - rx - 20, wy0 - 14, cx + rx + 20, wy1 + 12] });
    reflectBand.push([wy0, wy1]);
  } else if (water === 'river' || sea) {
    const layer = sea ? 'far' : 'mid';
    data.water.push({ layer, d: _nf.band(wy0, wy1, sceneHash(id + 'r')), y0: wy0, y1: wy1, base: sea ? ['#a4c0cc', '#5a8ea4', '#2c5a70'] : ['#8ab0b4', '#4c7c84', '#264c54'], reflect: true, shimmer: 30, lightPath: true });
    if (!sea) G('far', `M-160 ${wy0 + 2}Q600 ${wy0 - 4} 1000 ${wy0 + 3}T1760 ${wy0}V${wy0 + 12}H-160Z`, '@bank');
    avoid.push({ rect: [-160, wy0 - 10, 1760, wy1 + 10] });
    reflectBand.push([wy0, wy1]);
  } else if (water === 'stream') {
    const pts = [[p.wx || 1100, H + 40, 16], [(p.wx || 1100) - 120, H + 120, 40], [(p.wx || 1100) - 260, H + 230, 90], [(p.wx || 1100) - 420, 905, 190]];
    G('near', _nf.ribbon(pts.map(([x, y, w]) => [x, y, w + 22])), '@bank');
    data.water.push({ layer: 'near', d: _nf.ribbon(pts), y0: H + 40, y1: 905, base: ['#94b4b4', '#5a8a8c', '#2e5a5e'], reflect: true, shimmer: 26, lightPath: false });
    avoid.push({ poly: pts.map(([x, y, w]) => [x - w / 2 - 20, y]).concat(pts.slice().reverse().map(([x, y, w]) => [x + w / 2 + 20, y])) });
    reflectBand.push([H + 40, 905]);
  }
  // ---- a track or a lane (from the far edge to the viewer)
  if (p.track) {
    const tx = p.track, lane = has('road'), w0 = lane ? 26 : 10, pts = [[tx, H + 10, w0], [tx - 30, H + 80, w0 * 2.6], [tx + 20, H + 170, w0 * 5], [tx - 40, 905, w0 * 10]];
    G('far', _nf.ribbon(pts.slice(0, 2)), lane ? '#7a7a76' : '@path.1');
    G('mid', _nf.ribbon(pts.slice(1, 3)), lane ? '#73736f' : { lin: [[0, '@path.2'], [1, '@path.0']], x1: 0, y1: H + 80, x2: 0, y2: H + 170 });
    G('near', _nf.ribbon(pts.slice(2)), lane ? '#6c6c68' : { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: H + 170, x2: 0, y2: 900 });
    avoid.push({ poly: pts.map(([x, y, w]) => [x - w / 2 - 6, y]).concat(pts.slice().reverse().map(([x, y, w]) => [x + w / 2 + 6, y])) });
  }
  // ---- a road across (village views)
  if (Number.isFinite(p.road)) {
    const y = p.road;
    G(y < H + 150 ? 'mid' : 'near', `M-160 ${y - 16}H1760V${y + 14}H-160Z`, '#6e6e6a');
    G(y < H + 150 ? 'mid' : 'near', `M-160 ${y - 24}H1760V${y - 16}H-160Z`, '@path.2');
    avoid.push({ rect: [-160, y - 30, 1760, y + 18] });
    const cars = has('cars') ? 2 : 0;
    for (let i = 0; i < cars; i++) data.actors.push({ obj: 'vehicle.car', layer: y < H + 150 ? 'mid' : 'near', path: i ? [[1860, y - 4], [-260, y - 4]] : [[-260, y + 8], [1860, y + 8]], speed: 34 + i * 6, loop: 'loop', s: _nf.sz(view, y, 34, 1.5), seed: 70 + i, offset: 0.2 + i * 0.45, flip: !!i, variant: i + 1 });
  }
  const mask = (extra) => ({ noise: { scale: 220, cut: 0.25 }, avoid: avoid.concat(extra || []) });
  // ---- the far woods and copses (static), the mid and near trees (by mix), the frame
  if (!has('nowoods') && !sea) data.scatter.push({ obj: { 'tree.far-pine': 2, 'tree.far-broad': 3 }, layer: 'far', seed: 3, area: { rect: [-160, H + 2, 1760, H + 16] }, n: n(34), minGap: 34, s: [0.2, 0.5], anim: false, variant: 'random', tint: { col: '#3a5a3a', k: [0, 0.1] }, mask: { noise: { scale: 300, cut: 0.2 } } });
  const mix = {};
  for (const t of (p.trees && p.trees.length ? p.trees : ['pine', 'birch'])) if (NF_TREES[t]) mix[NF_TREES[t]] = (mix[NF_TREES[t]] || 0) + 1;
  if (Object.keys(mix).length) {
    data.scatter.push({ obj: mix, layer: 'mid', seed: 5, area: { rect: [-160, midTop + 8, 1760, midTop + 60] }, n: n(p.ntrees == null ? 9 : p.ntrees), minGap: 110, s: [0.18, 0.3], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#8a7a40', k: [0.08, 0.08] }, mask: mask([{ rect: [560, H, 1040, H + 140] }]) });
    data.scatter.push({ obj: mix, layer: 'near', seed: 6, area: { rect: [-160, H + 160, 1760, H + 200] }, n: n(p.ntrees == null ? 3 : Math.ceil(p.ntrees / 3)), minGap: 260, s: [0.36, 0.5], flip: 0.5, variant: 'random', mask: mask([{ rect: [440, H, 1160, 900] }]) });
  }
  if (p.frame && p.frame.length) {
    const [a, b] = p.frame, A = NF_FRAME[a] || a, B = NF_FRAME[b || a] || b || A;
    const sOf = (oid, h) => { const d = sceneObj(oid); return d ? Math.round(h / d.size[1] * 100) / 100 : 1; };
    if (a !== 'none') data.place.push({ obj: A, x: -40, y: 912, s: sOf(A, 700), layer: 'front', seed: 21, flip: false });
    if ((b || a) !== 'none') data.place.push({ obj: B, x: 1660, y: 916, s: sOf(B, 660), layer: 'front', seed: 22, flip: true });
  }
  // ---- the ground cover: far (static), mid (static), near and fore (wind strips)
  const reflectAt = (y0, y1) => reflectBand.some(([a, b]) => y1 >= a - 40 && y0 <= b + 40);
  const C = (obj, layer, seed, y0, y1, k, s, anim, extra) => data.scatter.push(Object.assign({ obj, layer, seed, area: { rect: [-160, y0, 1760, y1] }, n: n(k), minGap: Math.max(9, Math.round(s[0] * 24)), s, flip: 0.5, variant: [0, 1], anim, mask: mask(), reflect: reflectAt(y0, y1) }, extra || {}));
  if (!sea) C(cover.far, 'far', 7, H + 10, H + 50, 110, [0.22, 0.36], false);
  C(cover.far, 'mid', 8, midTop + 6, H + 150, 200, [0.4, 0.66], false);
  C(cover.near, 'near', 9, H + 152, H + 270, 260, [0.66, 1.0], false);
  C(cover.fore || cover.near, 'fore', 10, H + 270, 905, 190, [1.0, 1.5], 'strip');
  // olive-tinted drifts (one tint bucket, one variant): every cover object shows two colours, the SVG still stays small
  C(cover.near, 'near', 16, H + 152, H + 270, 60, [0.66, 1.0], false, { variant: 2, tint: { col: '#8a7a40', k: [0.09, 0.11] }, mask: { noise: { scale: 260, cut: 0.45 }, avoid } });
  C(cover.fore || cover.near, 'fore', 17, H + 270, 905, 40, [1.0, 1.5], false, { variant: 2, tint: { col: '#8a7a40', k: [0.09, 0.11] }, mask: { noise: { scale: 260, cut: 0.45 }, avoid } });
  if (landKey === 'shingle') C('ground.beach', 'mid', 12, midTop + 4, H + 150, 14, [0.4, 0.7], false, { minGap: 90 });
  // shrubs: gorse on the heath, holly on the lawns and in the woods
  if (landKey === 'heath') data.scatter.push({ obj: cover.shrub, layer: 'mid', seed: 13, area: { rect: [-160, midTop + 10, 1760, H + 140] }, n: n(p.shrubs == null ? 8 : p.shrubs), minGap: 90, s: [0.16, 0.3], flip: 0.5, variant: 0, anim: false, mask: mask(), reflect: reflectAt(midTop, H + 140) });
  data.scatter.push({ obj: cover.shrub, layer: 'near', seed: 14, area: { rect: [-160, H + 160, 1760, H + 260] }, n: n(p.shrubs == null ? 4 : Math.ceil(p.shrubs / 3)), minGap: 200, s: [0.34, 0.56], flip: 0.5, variant: 1, anim: false, mask: mask([{ rect: [500, H, 1100, 900] }]) });
  // ---- the life of the Forest
  const herd = (obj, count, h, m, y0, y1, seedBase) => {
    for (let i = 0; i < count; i++) {
      const x = 180 + ((i * 0.618 + r() * 0.3) % 1) * 1240, y = Math.round(y0 + r() * (y1 - y0));
      data.place.push({ obj, x: Math.round(x), y, s: sceneScaleBucket(_nf.sz(view, y, h, m) * (0.75 + r() * 0.5)), layer: 'near', variant: i % 2, flip: i % 2 === 1, seed: seedBase + i });
    }
  };
  if (p.ponies) herd('animal.pony', p.ponies, 140, 1.55, H + 70, H + 250, 100);
  if (p.deer) herd('animal.deer', p.deer, 108, 1.2, H + 50, H + 200, 120);
  if (p.cattle) herd('animal.cattle', p.cattle, 99, 1.4, H + 60, H + 200, 140);
  if (has('stonechats')) for (const [x, y] of [[300, H + 230], [1240, H + 250]]) data.place.push({ obj: 'bird.stonechat', x, y, s: 0.9, layer: 'near', seed: 160 + x, flip: x > 800 });
  // birds: small birds over the land, gulls on the coast, a heron or egrets on the marsh
  data.flocks.push({ obj: 'bird.small-flight', n: 6, area: [200, 120, 1400, Math.max(220, H - 140)], speed: 30, s: 0.7, seed: 9, layer: 'far' });
  if (has('gulls') || sea) data.flocks.push({ obj: 'bird.gull', n: 5, area: [100, 90, 1500, Math.max(240, H - 120)], speed: 24, s: 0.7, seed: 10, layer: 'mid' });
  else data.flocks.push({ obj: 'bird.small-flight', n: 4, area: [300, 200, 1300, Math.max(260, H - 100)], speed: 22, s: 0.9, seed: 10, layer: 'mid' });
  if (has('egrets')) data.flocks.push({ obj: 'bird.egret-flight', n: 3, area: [200, 260, 1400, Math.max(300, H - 60)], speed: 18, s: 0.8, seed: 11, layer: 'mid' });
  // people: anonymous walkers across a near row, a dog walker, a cyclist on the lane
  const ppl = Math.min(p.walkers == null ? 3 : p.walkers, 6), kinds = ['person.walker', 'person.dog-walker', 'person.walker', 'person.cyclist', 'person.walker', 'person.dog-walker'];
  for (let i = 0; i < ppl; i++) {
    const oid = kinds[i], y = (p.walkY || H + 175) + (i % 3) * 16, back = i % 2 === 1, d = sceneObj(oid);
    data.actors.push({ obj: oid, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: oid === 'person.cyclist' ? 46 : 15 + (i % 3) * 3, loop: 'loop', s: scenePersonScale(d ? d.size[1] : 64, y, view), seed: 50 + i, offset: (i * 0.29 + 0.07) % 1, flip: back, variant: i % 4 });
  }
  // boats: moored yachts on the river or the sea, a dinghy sailing across
  if (p.yachts && (water === 'river' || sea)) {
    for (let i = 0; i < p.yachts; i++) {
      const y = Math.round(wy0 + 16 + (i % 3) * ((wy1 - wy0 - 26) / 3)), x = Math.round(160 + ((i * 0.382 + 0.1) % 1) * 1280);
      data.place.push({ obj: 'boat.yacht', x, y, s: _nf.sz(view, y, 320, 12), layer: sea ? 'far' : 'mid', variant: i % 3, flip: i % 2 === 1, seed: 180 + i, reflect: true });
    }
    data.actors.push({ obj: 'boat.dinghy', layer: sea ? 'far' : 'mid', path: [[-200, wy1 - 10], [1800, wy1 - 14]], speed: 9, loop: 'loop', s: _nf.sz(view, wy1, 200, 6), seed: 190, offset: 0.3 });
  }
  // reflections: anything placed within 40 units of the water mirrors in it
  for (const e of data.place) if (reflectAt(e.y, e.y)) e.reflect = true;
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('newforest', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', horizon: 'number', at: ['afternoon', 'dawn', 'morning', 'day', 'noon', 'golden', 'sunset', 'dusk', 'night'],
      land: ['heath', 'lawn', 'marsh', 'shingle', 'wood', 'village'], water: ['none', 'pond', 'river', 'sea', 'stream'], wy: 'number', wh: 'number', wx: 'number', wr: 'number',
      hills: 'number', track: 'number', road: 'number', trees: 'list', ntrees: 'number', shrubs: 'number', frame: 'list', ponies: 'number', deer: 'number', cattle: 'number',
      walkers: 'number', walkY: 'number', yachts: 'number', density: 'number', features: 'list' },
    kits: ['temperate', 'people', 'birds', 'boats', 'water', 'animals'],
    meta: () => null,
    build: (p, u) => sceneArchNewForest(p, u),
  });
})();
/** Add one New Forest scene: meta (the item fields), the archetype row and the scene's own touches (a THUNK: built when shown or linted). */
function nfSceneAdd(meta, row, patch) {
  if (typeof sceneAdd !== 'function' || typeof sceneFromArchetype !== 'function') return;
  sceneAdd('uk-area-newforest', Object.assign({ lat: row.lat, lon: row.lon, county: 'hampshire' }, meta), () => sceneFromArchetype('newforest', row, patch || {}));
}
