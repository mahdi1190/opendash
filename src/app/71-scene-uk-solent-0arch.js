/* ============================================================
   COMPOSED SCENES, the Solent area (Portsmouth, Gosport, Southsea, Southampton): the
   ARCHETYPE 'solent-shore' (docs/dev/SCENE_ENGINE.md 8.1). PURE: one sceneArchetypeDefine.
   The scene rows are in 71-scene-uk-solent-*.js; the pack is 72-anim-pack-uk-area-coast.js.

   A view across the water of the Solent, a harbour or Southampton Water from a shore:
     horizon  the far shore: the Isle of Wight downs ('island'), a low town ('town'), the
              container port ('docks') or a bare sea line ('sea'), hazed
     far      what stands on the far shore (trees, roofs, cranes) and the far boats
     mid      the water (live sky, reflection, shimmer, glitter road), the hero objects of
              the row (a landmark, a fort, a pier), boats at three depths, gulls on the water
     near     the shore of the row: 'beach' (shingle, groynes, sea kale and grass), 'prom'
              (a sea wall, railing, paving, lamps, benches) or 'quay' (dressed stone edge,
              bollards, paving); walkers by the depth ladder
     fore     ground cover: grass and flowers of the Common, shingle plants, planters
     front    framing: trees on a prom or quay, tall grass on a beach
   Params: hero / extra are lists of 'obj@x@y@h[@layer[@flip]]' (h = drawn height); boats a
   list of 'obj@t@dir@speed[@k]' (t 0..1 from the far lane to the near lane, dir 1 = to the
   right, k a size factor). Life is gulls, boats, walkers and wind; seasons come from the date.
   ============================================================ */
const SOLENT_PAL = Object.freeze({
  base: {
    isle: ['#7f9a86', '#93ab94', '#6c8676'], town: ['#9aa4ac', '#b4bcc2'], sea: ['#a6c6cc', '#4e8494', '#23505e'],
    shingle: ['#c8b89a', '#a8977a', '#8a7a62', '#6e6250'], wet: ['#7a6e5c'], foam: ['#f4f8f6'],
    pave: ['#c4bcae', '#aaa294', '#8e8678'], wall: ['#b4ab98', '#8e8676', '#6e675a'], rail: ['#e6e8ea', '#30363e'],
    lawn: ['#6f9a48', '#4f7a36'], quay: ['#9a9488', '#7c7668', '#5e584c'],
  },
  spring: { isle: ['#7aa07e', '#8fb28e', '#678a6c'], lawn: ['#78a84c', '#56863a'] },
  summer: { isle: ['#7f9a78', '#98ae84', '#6c8668'], lawn: ['#7a9e48', '#577a34'] },
  autumn: { isle: ['#8a8e6a', '#a09c78', '#767a5c'], lawn: ['#8a9448', '#66703a'], shingle: ['#c4b494', '#a49274', '#86765e', '#6a5e4c'] },
  winter: { isle: ['#8a948e', '#a2aaa4', '#76807a'], lawn: ['#8e9a74', '#6e7a5a'], sea: ['#a0b8c0', '#4a7482', '#22424e'] },
});
function sceneArchSolentShore(p, u) {
  const H = Number.isFinite(p.horizon) ? p.horizon : 500;
  const dens = Number.isFinite(p.density) ? Math.max(0.4, Math.min(1.6, p.density)) : 1;
  const n = k => Math.max(1, Math.round(k * dens));
  const shore = p.shore || 'beach', far = p.far || 'island';
  const yS = Math.round(H + (Number.isFinite(p.shoreAt) ? p.shoreAt : 0.5) * (900 - H));   // the near water's edge
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 1000) / 1000 : 1; };
  const has = id => !!sceneObj(id);
  const ALIAS = { spinnaker: 'landmark.solent-spinnaker-tower', victory: 'landmark.solent-hms-victory', carferry: 'boat.solent-car-ferry', hover: 'boat.solent-hovercraft',
    yacht: 'boat.solent-yacht', liner: 'boat.solent-cruise-liner', boxship: 'boat.solent-container-ship', crane: 'building.solent-dock-crane', boxes: 'building.solent-containers',
    store: 'building.solent-storehouse', fort: 'building.solent-harbour-fort', seafort: 'building.solent-sea-fort', pier: 'structure.solent-pier', villa: 'building.solent-seafront-villa',
    ferry: 'boat.ferry', tug: 'boat.tug', taxi: 'boat.water-taxi', fishing: 'boat.fishing-boat' };
  const spec = s => { const a = String(s).split('@'); a[0] = ALIAS[a[0]] || a[0]; return a; };
  const data = {
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 72, horizon: H, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: shore === 'beach' ? 'mixed' : 'urban', signage: false,
    palette: JSON.parse(JSON.stringify(SOLENT_PAL)),
    sky: { stars: 180, clouds: { n: 6, y: [50, Math.max(180, H - 200)], speed: 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  const r = sceneRnd(sceneHash(String(p.id) + '|solent'));
  /* ---- horizon: the far shore ---- */
  const ridge = (y, amp, seed, step) => {
    const rr = sceneRnd(seed); let d = `M-160 ${y + 30}V${y}`;
    for (let x = -160; x < 1760; x += step) { const yy = y - amp * (0.4 + 0.6 * Math.sin((x + seed) / 380) ** 2) - rr() * amp * 0.25; d += `Q${x + step / 2} ${Math.round(yy - 4)} ${x + step} ${Math.round(yy)}`; }
    return d + `V${y + 30}Z`;
  };
  if (far === 'island') {
    data.ground.push({ layer: 'horizon', d: ridge(H + 2, Number.isFinite(p.hills) ? p.hills : 34, 11 + (p.lon * 100 | 0), 120), fill: { lin: [[0, '@isle.1'], [1, '@isle.0']], x1: 0, y1: H - 40, x2: 0, y2: H + 4 } });
    data.ground.push({ layer: 'horizon', d: ridge(H + 3, 10, 29, 70), fill: '@isle.2' });
    if (has('tree.distant')) data.scatter.push({ obj: { 'tree.distant': 2, 'tree.far-broad': 1 }, layer: 'horizon', seed: 1101, area: { rect: [-150, H - 4, 1750, H + 2] }, n: n(32), minGap: 18, s: [0.07, 0.22], mask: { noise: { scale: 150, cut: 0.28 } }, sByY: [[H - 4, 0.8], [H + 2, 1.2]], variant: [0, 1], tint: { col: '#8aa2a8', k: [0.06, 0.18] }, shadow: false, anim: false, reflect: true });
  } else if (far === 'town' || far === 'docks') {
    data.ground.push({ layer: 'horizon', d: ridge(H + 2, 12, 37, 160), fill: { lin: [[0, '@town.1'], [1, '@town.0']], x1: 0, y1: H - 20, x2: 0, y2: H + 4 } });
    data.ground.push({ layer: 'far', d: `M-160 ${H + 10}H1760V${H + 2}Q800 ${H - 2} -160 ${H + 2}Z`, fill: '@quay.1' });
    const roofs = { 'building.solent-seafront-villa': 2, 'building.solent-storehouse': 1 };
    if (far === 'town') {
      data.scatter.push({ obj: roofs, layer: 'far', seed: 1103, area: { rect: [-150, H + 2, 1750, H + 6] }, n: n(18), minGap: 30, s: [0.12, 0.28], flip: 0.5, variant: 'random', mask: { noise: { scale: 170, cut: 0.3 } }, tint: { col: '#9aaab4', k: [0.06, 0.18] }, shadow: false, reflect: true });
      data.scatter.push({ obj: { 'tree.distant': 2, 'tree.far-broad': 1, 'tree.far-pine': 1 }, layer: 'far', seed: 1104, area: { rect: [-150, H + 4, 1750, H + 8] }, n: n(30), minGap: 30, s: [0.1, 0.26], variant: [0, 1], tint: { col: '#8aa0a8', k: [0.06, 0.18] }, shadow: false, anim: false, reflect: true });
    } else {
      data.scatter.push({ obj: 'building.solent-dock-crane', layer: 'far', seed: 1105, area: { rect: [-100, H + 6, 1700, H + 8] }, n: n(9), minGap: 120, s: [0.24, 0.46], flip: 0.5, variant: 'random', tint: { col: '#9aaab4', k: [0.06, 0.18] }, shadow: false, reflect: true });
      data.scatter.push({ obj: 'building.solent-containers', layer: 'far', seed: 1106, area: { rect: [-150, H + 8, 1750, H + 10] }, n: n(24), minGap: 40, s: [0.2, 0.46], flip: 0.5, variant: 'random', tint: { col: '#9aaab4', k: [0.06, 0.18] }, shadow: false, reflect: true });
    }
  }
  /* ---- the water ---- */
  data.water.push({ layer: 'mid', d: `M-160 ${H + (far === 'sea' || far === 'island' ? 0 : 10)}H1760V${yS + 6}H-160Z`, y0: H, y1: yS + 6, base: ['@sea.0', '@sea.1', '@sea.2'], reflect: true, shimmer: 40, lightPath: true });
  /* ---- hero and extra objects ---- */
  for (const s of [].concat(p.hero || [], p.extra || [])) {
    const a = spec(s), id = a[0];
    if (!has(id)) continue;
    const x = +a[1], y = +a[2], h = +a[3], layer = a[4] || 'mid';
    const sc = sOf(id, h), wide = sceneObj(id).size[0] * sc > 360;   // a big hull rides still (a whole-sprite bob that wide costs the frame)
    data.place.push({ obj: id, x, y, s: sc, layer, seed: 1200 + data.place.length * 7, flip: a[5] === 'flip', reflect: true, shadow: true, anim: wide && /^boat\./.test(id) ? false : undefined });
  }
  /* ---- boats: 'obj@t@dir@speed@k' ---- */
  (p.boats || []).forEach((s, i) => {
    const a = spec(s), id = a[0];
    if (!has(id)) return;
    const t = +a[1] || 0, dir = a[2] === '-1' ? -1 : 1, sp = +a[3] || 8, k = +a[4] || 1;
    const y = Math.round(H + 8 + t * (yS - H - 30)), sc = (0.22 + t * 0.62) * k;
    data.actors.push({ obj: id, layer: t < 0.15 ? 'far' : 'mid', path: dir > 0 ? [[-260, y], [1860, y]] : [[1860, y], [-260, y]], speed: sp, loop: 'loop', s: Math.round(sc * 1000) / 1000, seed: 1300 + i * 11, offset: (0.17 + i * 0.31) % 1, flip: dir < 0 });
  });
  /* ---- gulls ---- */
  if (has('bird.herring-gull-flight')) data.flocks.push({ obj: 'bird.herring-gull-flight', n: 5, area: [120, 90, 1480, Math.max(220, H - 150)], speed: 22, s: 0.55, seed: 1401, layer: 'far' });
  if (has('bird.gull')) data.flocks.push({ obj: 'bird.gull', n: 3, area: [200, 200, 1400, Math.max(300, H - 60)], speed: 16, s: 0.7, seed: 1402, layer: 'mid' });
  if (has('bird.herring-gull')) for (let i = 0; i < 2; i++) data.actors.push({ obj: 'bird.herring-gull', layer: 'mid', path: [[300 + i * 760, yS - 30 - i * 20], [420 + i * 760, yS - 34 - i * 20]], speed: 3, loop: 'pingpong', s: 0.32, seed: 1410 + i * 3, offset: 0.3 + i * 0.4 });
  /* ---- the near shore ---- */
  const walkY = [];
  const walkers = ['person.walker', 'person.dog-walker', 'person.jogger', 'person.walker', 'person.cyclist'].filter(id => has(id) && (sceneObj(id).tags || []).includes('silhouette'));
  if (shore === 'beach') {
    data.ground.push({ layer: 'near', d: `M-160 ${yS}Q400 ${yS - 6} 800 ${yS + 2}T1760 ${yS - 2}V905H-160Z`, fill: { lin: [[0, '@wet'], [0.12, '@shingle.1'], [0.5, '@shingle.0'], [1, '@shingle.2']], x1: 0, y1: yS, x2: 0, y2: 900 } });
    data.ground.push({ layer: 'near', d: `M-160 ${yS + 1}Q400 ${yS - 5} 800 ${yS + 3}T1760 ${yS - 1}V${yS + 5}Q800 ${yS + 8} -160 ${yS + 6}Z`, fill: '@foam' });
    data.ground.push({ layer: 'near', d: `M-160 ${yS + 40}Q500 ${yS + 30} 900 ${yS + 44}T1760 ${yS + 36}V${yS + 46}Q900 ${yS + 54} -160 ${yS + 48}Z`, fill: '@shingle.3' });
    if (has('structure.groyne')) {
      data.place.push({ obj: 'structure.groyne', x: 260, y: yS + 70, s: 0.7, layer: 'near', seed: 1501, variant: 0, reflect: true, shadow: true });
      data.place.push({ obj: 'structure.groyne', x: 1380, y: yS + 60, s: 0.6, layer: 'near', seed: 1502, variant: 0, flip: true, reflect: true, shadow: true });
    }
    data.scatter.push({ obj: { 'rock.stones': 2, 'rock.boulder': 1 }, layer: 'near', seed: 1503, area: { rect: [-150, yS + 8, 1750, yS + 120] }, n: n(150), minGap: 9, s: [0.2, 0.6], sByY: [[yS, 0.7], [yS + 120, 1.2]], flip: 0.5, variant: 'random', tint: { col: '#8a7a62', k: [0, 0.1] }, anim: false, reflect: true });
    data.scatter.push({ obj: { 'rock.stones': 3, 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.bracken': 1 }, layer: 'fore', seed: 1504, area: { rect: [-150, yS + 110, 1750, 900] }, n: n(200), minGap: 11, s: [0.5, 1.1], sByY: [[yS + 110, 0.8], [900, 1.3]], flip: 0.5, variant: [0, 1], tint: { col: '#b0a070', k: [0, 0.1] }, anim: 'strip' });
    data.scatter.push({ obj: 'plant.grass', layer: 'front', seed: 1505, area: { rect: [-150, 868, 1750, 906] }, n: n(46), minGap: 22, s: [0.9, 1.8], variant: [0, 1], tint: { col: '#a09050', k: [0, 0.1] }, anim: 'strip' });
    walkY.push(yS + 34, yS + 64, yS + 92);
  } else {
    // irregular rows along the waterfront (seeded gaps, sizes and variants: never a stamp grid)
    const row = (obj, y, g0, g1, sr, seed) => {
      const rr = sceneRnd(seed), nv = (sceneObj(obj) || {}).variants || 1;
      for (let x = -120 + rr() * g0, i = 0; x < 1720; x += g0 + rr() * (g1 - g0), i++)
        data.place.push({ obj, x: Math.round(x), y: y + Math.round(rr() * 4), s: Math.round((sr[0] + rr() * (sr[1] - sr[0])) * 100) / 100, layer: 'near', seed: seed + i * 3, variant: i % nv, flip: i % 2 === 1, anim: false, shadow: true, reflect: true });
    };
    // a sea wall or a quay edge, the railing (prom) or bollards (quay), the paving, then a bed or lawn
    const yE = yS + 16, yP = Math.round(yS + 0.5 * (900 - yS)), quay = shore === 'quay';
    data.ground.push({ layer: 'near', d: `M-160 ${yS}H1760V${yE}H-160Z`, fill: { lin: [[0, quay ? '@quay.0' : '@wall.0'], [1, quay ? '@quay.2' : '@wall.2']], x1: 0, y1: yS, x2: 0, y2: yE } });
    let joints = '';
    for (let x = -150; x < 1760; x += 34) joints += `M${x} ${yS + 1}h1.2v${yE - yS - 2}h-1.2z`;
    data.ground.push({ layer: 'near', d: joints, fill: quay ? '@quay.2' : '@wall.2' });
    data.ground.push({ layer: 'near', d: `M-160 ${yE}H1760V${yP}H-160Z`, fill: { lin: [[0, '@pave.0'], [0.7, '@pave.1'], [1, '@pave.2']], x1: 0, y1: yE, x2: 0, y2: yP } });
    let slabs = '';
    for (let y = yE + 12, k = 0; y < yP; y += 10 + k * 4, k++) slabs += `M-160 ${y}H1760v1H-160z`;
    data.ground.push({ layer: 'near', d: slabs, fill: '@pave.2' });
    data.ground.push({ layer: 'fore', d: `M-160 ${yP}Q500 ${yP - 4} 800 ${yP}T1760 ${yP}V905H-160Z`, fill: { lin: [[0, '@lawn.0'], [1, '@lawn.1']], x1: 0, y1: yP, x2: 0, y2: 900 } });
    if (!quay) {
      let posts = '';
      for (let x = -150; x < 1760; x += 20) posts += `M${x} ${yE - 24}h2.2v24h-2.2z`;
      data.ground.push({ layer: 'near', d: posts + `M-160 ${yE - 26}H1760v3H-160zM-160 ${yE - 13}H1760v2H-160z`, fill: '@rail.0' });
    } else if (has('street.bollard')) {
      row('street.bollard', yE + 3, 70, 150, [0.34, 0.74], 1601);
    }
    if (has('street.lamp')) row('street.lamp', yE + 7, 330, 560, [0.5, 0.8], 1602);
    if (has('street.bench')) row('street.bench', yE + 11, 330, 600, [0.52, 0.74], 1603);
    if (quay && has('plant.planter')) row('plant.planter', yP - 14, 150, 330, [0.42, 0.82], 1604);
    data.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1 }, layer: 'near', seed: 1605, area: { rect: [-150, yE + 1, 1750, yE + 6] }, n: n(40), minGap: 40, s: [0.25, 0.5], flip: 0.5, variant: [0, 1], tint: { col: '#a0a050', k: [0, 0.1] }, anim: false, reflect: true });
    data.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 2, 'plant.shrub': 1 }, layer: 'fore', seed: 1606, area: { rect: [-150, yP + 4, 1750, 900] }, n: n(200), minGap: 15, s: [0.6, 1.1], sByY: [[yP, 0.8], [900, 1.3]], flip: 0.5, variant: [0, 1], tint: { col: '#a0a050', k: [0, 0.1] }, anim: 'strip' });
    data.scatter.push({ obj: 'plant.grass', layer: 'front', seed: 1607, area: { rect: [-150, 872, 1750, 906] }, n: n(36), minGap: 32, s: [0.9, 1.7], variant: [0, 1], tint: { col: '#8a9a40', k: [0, 0.1] }, anim: 'strip' });
    const tree = has('tree.plane') ? 'tree.plane' : 'tree.oak';
    if (has(tree)) data.place.push({ obj: tree, x: 20, y: 912, s: sOf(tree, 470), layer: 'front', seed: 1610, variant: 1, shadow: true }, { obj: tree, x: 1660, y: 916, s: sOf(tree, 430), layer: 'front', seed: 1611, flip: true, variant: 2, shadow: true });
    walkY.push(yE + 20, yE + 34, yE + 50);
  }
  /* ---- walkers (anonymous silhouettes, by the depth ladder) ---- */
  const nw = Math.min(6, Number.isFinite(p.walkers) ? p.walkers : 5);
  for (let i = 0; i < nw && walkers.length; i++) {
    const id = walkers[i % walkers.length], y = walkY[i % walkY.length] + (i > 2 ? 6 : 0), back = i % 2 === 1;
    data.actors.push({ obj: id, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: (id === 'person.cyclist' ? 30 : id === 'person.jogger' ? 22 : 12) + (i % 3) * 2, loop: 'loop', s: scenePersonScale(sceneObj(id).size[1], y, data.view), seed: 1700 + i * 13, offset: (i * 0.211 + 0.07) % 1, flip: back });
  }
  void r; void u;
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('solent-shore', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', horizon: 'number', shoreAt: 'number', hills: 'number', walkers: 'number', density: 'number',
      at: typeof SCENE_AT_MOMENTS !== 'undefined' ? SCENE_AT_MOMENTS : 'id', shore: ['beach', 'prom', 'quay'], far: ['island', 'town', 'docks', 'sea'], hero: 'list', extra: 'list', boats: 'list' },
    kits: ['temperate', 'urban', 'water', 'boats', 'birds', 'people'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 560, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchSolentShore(p, u),
  });
})();
