/* ============================================================
   ARCHETYPE temple-mountain (docs/dev/SCENE_ENGINE.md 8.5, 17 converter Z): a temple or pagoda on a
   wooded hillside before a great mountain, a town in the valley between. PURE. Takes SCENE_REGION_PARAMS.

   Layers (far to near):
     horizon  the MOUNTAIN (landmark slot 1: an id, or 'id@x@h'), standing on the horizon
     far      the forested foothills across its foot (cedars as texture), then the valley town
              (building-far: houses, 30 to 50 by density, lit at dusk)
     mid      the temple hill rising on the temple's side: the TEMPLE (landmark slot 2), cedars
              behind it, cherries and maples round it, lanterns on its terrace
     near     the hillside: trees by role (static), shrubs, a stair path up to the terrace with
              stone lanterns along it and up to 3 tiny walkers on it
     fore     dense ground cover by role (wind strips)
     front    two framing trees whose crowns fill the top corners (they sway)
   Water: 'lake' or 'pond' lays a lake across the valley floor (reflections, shimmer) instead of
   the town's near half. Fill by ROLE through the climate kits (tree, ground, shrub, building-far,
   street) so new kit objects reach every scene; birds from the kit's flight birds.
   ============================================================ */
const SCENE_ARCH_TEMPLE_PAL = Object.freeze({
  base: { ridge: ['#5a6e62', '#46584e'], plain: ['#7a8a5a', '#6a7a4e'], hill: ['#56703e', '#46602e', '#3a5028'], path: ['#b8ae98', '#9a907c'], step: '#7a7262' },
  spring: { ridge: ['#5e7464', '#4a5e50'], plain: ['#86a05a', '#74904e'], hill: ['#62803e', '#4e6c30', '#405a2a'] },
  summer: { ridge: ['#4a6452', '#3a5244'], plain: ['#6a8a44', '#5a7a3a'], hill: ['#4a6e34', '#3c5e2a', '#304e24'] },
  autumn: { ridge: ['#7a6a4a', '#5e5640'], plain: ['#a08a4e', '#8a7640'], hill: ['#8a6a34', '#6e5a2e', '#584a28'] },
  winter: { ridge: ['#a8b0b8', '#8a949e'], plain: ['#e2e8ee', '#ccd4dc'], hill: ['#dfe6ec', '#c4ced8', '#a8b4c0'], path: ['#e8ecf0', '#c8d0d8'] },
});
function sceneArchTempleMountain(p, u) {
  const H = Number.isFinite(p.horizon) ? p.horizon : 560, dens = Number.isFinite(p.density) ? Math.max(0.3, Math.min(2, p.density)) : 1;
  const climate = p.climate || 'temperate', n = k => Math.max(1, Math.round(k * dens));
  const palette = JSON.parse(JSON.stringify((typeof SCENE_ARCH_CLIMATE_PALETTES !== 'undefined' && SCENE_ARCH_CLIMATE_PALETTES[climate]) || { base: {} }));
  for (const [season, slots] of Object.entries(SCENE_ARCH_TEMPLE_PAL)) palette[season] = Object.assign({}, slots, palette[season] || {}, season === 'base' ? palette.base : {});
  if (p.palette && typeof p.palette === 'object') for (const [season, slots] of Object.entries(p.palette)) palette[season] = Object.assign({}, palette[season] || {}, slots);
  const NATURE = ['tropical', 'temperate', 'arid', 'alpine', 'mediterranean', 'polar', 'east-asian'];
  const natKits = (u.kits || []).filter(k => NATURE.includes(k));
  const pick = (role, keep, tags) => { const w = natKits.length ? sceneKitPick(natKits, role, { tags }) : u.kit(role, tags); if (keep) for (const id of Object.keys(w)) if (!keep(id)) delete w[id]; return w; };
  const any = w => Object.keys(w).length > 0;
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const anim = (id, k) => { const d = sceneObj(id); return !!(d && d.anim && d.anim[k]); };
  const tagged = (id, t) => ((sceneObj(id) || {}).tags || []).includes(t);
  // landmarks: [mountain, temple]
  const lm = (p.landmarks || []).map(s => String(s).split('@')).filter(a => sceneObj(a[0]));
  const mtn = lm[0] || null, tmp = lm[1] || null;
  const tx = tmp && tmp[1] ? +tmp[1] : 1120, right = tx >= 800, water = p.water === 'lake' || p.water === 'pond';
  const yRidge = H + 34, yTown0 = H + 44, yTown1 = H + 110, yT = H + 150;   // the ridge foot, the town band, the temple terrace
  // the hill: from the temple terrace down to the near ground on the temple's side
  const hx0 = right ? tx - 330 : tx + 330, hEdge = right ? 1760 : -160;
  const hill = right
    ? `M${hx0} ${yT + 70}Q${tx - 160} ${yT - 6} ${tx} ${yT - 12}Q${tx + 260} ${yT - 22} 1760 ${yT - 40}V905H${hx0 - 200}Z`
    : `M${hx0} ${yT + 70}Q${tx + 160} ${yT - 6} ${tx} ${yT - 12}Q${tx - 260} ${yT - 22} -160 ${yT - 40}V905H${hx0 + 200}Z`;
  const yN = H + 196;   // the near hillside's top edge
  const data = {
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 70, horizon: H, lift: 1 },
    at: p.at || 'dawn', season: 'auto', tropic: 'summer', setting: 'mixed', signage: false, palette,
    sky: { stars: 200, clouds: { n: 4, y: [60, Math.max(160, H - 300)], speed: 4 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [
      { layer: 'far', d: `M-160 ${H - 6}Q140 ${H - 34} 420 ${H - 12}Q700 ${H + 6} 980 ${H - 18}Q1300 ${H - 40} 1760 ${H - 10}V${yRidge + 10}H-160Z`, fill: { lin: [[0, '@ridge.0'], [1, '@ridge.1']], x1: 0, y1: H - 40, x2: 0, y2: yRidge } },
      { layer: 'far', d: `M-160 ${yRidge}Q600 ${yRidge - 8} 1760 ${yRidge + 2}V${yN + 40}H-160Z`, fill: { lin: [[0, '@plain.0'], [1, '@plain.1']], x1: 0, y1: yRidge, x2: 0, y2: yN + 40 } },
      { layer: 'mid', d: hill, fill: { lin: [[0, '@hill.0'], [1, '@hill.1']], x1: 0, y1: yT - 40, x2: 0, y2: yN + 40 } },
      { layer: 'near', d: `M-160 ${yN + 10}Q300 ${yN - 6} 700 ${yN + 4}Q1100 ${yN + 14} 1760 ${yN - 8}V905H-160Z`, fill: { lin: [[0, '@hill.1'], [1, '@hill.2']], x1: 0, y1: yN, x2: 0, y2: 900 } },
    ],
    water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  if (water) data.water.push({ layer: 'far', d: `M-160 ${yTown0 + 30}Q700 ${yTown0 + 24} 1760 ${yTown0 + 32}V${yTown1 + 30}H-160Z`, y0: yTown0 + 28, y1: yTown1 + 30, base: ['#9ab8c8', '#5a8aa0', '#2e5a70'], reflect: true, shimmer: 30, lightPath: true });
  // the mountain and the temple
  if (mtn) data.place.push({ obj: mtn[0], x: mtn[1] ? +mtn[1] : 640, y: H + 6, s: sOf(mtn[0], mtn[2] ? +mtn[2] : 360), layer: 'horizon', seed: 11, shadow: false });
  if (tmp) data.place.push({ obj: tmp[0], x: tx, y: yT, s: sOf(tmp[0], tmp[2] ? +tmp[2] : 260), layer: 'mid', seed: 12 });
  // the foothills' cedars (texture) and the valley town
  const conifers = pick('tree', id => tagged(id, 'conifer'));
  if (any(conifers)) data.scatter.push({ obj: conifers, layer: 'far', seed: 3, area: { poly: [[-150, H - 4], [1750, H - 4], [1750, yRidge], [-150, yRidge]] }, n: n(70), minGap: 18, s: [0.1, 0.17], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a8a', k: [0.16, 0.16] }, anim: false, shadow: false });
  const houses = pick('building-far');
  const townY1 = water ? yTown0 + 26 : yTown1;
  if (any(houses)) {
    data.scatter.push({ obj: houses, layer: 'far', seed: 4, area: { rect: [-150, yTown0, 1750, townY1] }, n: n(water ? 26 : 46), minGap: 30, s: [0.3, 0.42], sByY: [[yTown0, 0.85], [yTown1, 1.15]], flip: 0.5, variant: 'random', tint: { col: '#8a98a8', k: [0, 0.08] }, mask: { avoid: [{ rect: right ? [hx0 - 60, yTown0, 1760, yTown1 + 10] : [-160, yTown0, hx0 + 60, yTown1 + 10] }] }, anim: false, shadow: false });
  }
  // round the temple: cedars behind, flowering and autumn trees beside, lanterns on the terrace
  const trees = pick('tree', id => !tagged(id, 'conifer'));
  const tw = tmp ? sceneObj(tmp[0]).size[0] * sOf(tmp[0], tmp[2] ? +tmp[2] : 260) / 2 : 80;
  if (any(conifers)) data.scatter.push({ obj: conifers, layer: 'mid', seed: 5, area: { rect: [tx - tw - 140, yT - 30, tx + tw + 140, yT - 12] }, n: 9, minGap: 26, s: [0.55, 0.8], flip: 0.5, variant: 'random', anim: false });
  if (any(trees)) data.scatter.push({ obj: trees, layer: 'mid', seed: 6, area: { rect: right ? [hx0 + 40, yT - 8, 1740, yT + 60] : [-140, yT - 8, hx0 - 40, yT + 60] }, n: n(14), minGap: 46, s: [0.45, 0.7], flip: 0.5, variant: 'random', tint: { col: '#8a7a50', k: [0, 0.08] }, mask: { avoid: [{ rect: [tx - tw - 10, yT - 300, tx + tw + 10, yT + 14] }] }, anim: false });
  const lanterns = Object.keys(pick('street', id => tagged(id, 'lantern')));
  if (lanterns.length) data.place.push({ obj: lanterns[0], x: tx - tw - 24, y: yT + 4, s: 0.5, layer: 'mid', seed: 13 }, { obj: lanterns[0], x: tx + tw + 26, y: yT + 6, s: 0.5, layer: 'mid', seed: 14, flip: true });
  // the stair path from the near ground up to the terrace, lanterns along it, a few walkers on it
  const sx0 = right ? tx - 120 : tx + 120, sx1 = right ? tx - 260 : tx + 260;
  let steps = '';
  for (let k = 0; k <= 16; k++) { const t = k / 16, y = yT + 8 + t * (yN + 40 - yT - 8), x = sx0 + (sx1 - sx0) * t, w = 18 + t * 40; steps += `M${Math.round(x - w)} ${Math.round(y)}h${Math.round(w * 2)}v2h${-Math.round(w * 2)}z`; }
  data.ground.push({ layer: 'near', d: `M${sx0 - 18} ${yT + 8}H${sx0 + 18}L${sx1 + 58} ${yN + 40}H${sx1 - 58}Z`, fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: yT, x2: 0, y2: yN + 40 } }, { layer: 'near', d: steps, fill: '@step' });
  if (lanterns.length) for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.24, y = yT + 8 + t * (yN + 40 - yT - 8), x = sx0 + (sx1 - sx0) * t, w = 18 + t * 40 + 12; data.place.push({ obj: lanterns[k % lanterns.length], x: Math.round(x - w), y: Math.round(y), s: 0.42 + t * 0.3, layer: 'near', seed: 15 + k, variant: k % 2 }, { obj: lanterns[k % lanterns.length], x: Math.round(x + w), y: Math.round(y), s: 0.42 + t * 0.3, layer: 'near', seed: 25 + k, flip: true, variant: (k + 1) % 2 }); }
  const walkers = Object.keys(u.kit('walker', ['silhouette'])).filter(id => anim(id, 'walk') && !/cyclist|angler|jogger/.test(id));
  for (let i = 0; i < 3 && walkers.length; i++) {
    const down = i === 1, a = [sx0, yT + 10], b = [sx1, yN + 36];
    data.actors.push({ obj: walkers[i % walkers.length], layer: 'near', path: down ? [a, b] : [b, a], speed: 7 + i * 2, loop: 'pingpong', s: 0.36, sByY: [[yT, 0.3], [yN + 40, 0.52]], seed: 50 + i, offset: (0.2 + i * 0.31) % 1 });
  }
  // the near hillside: trees (static), shrubs; the cover in near and fore
  if (any(trees)) data.scatter.push({ obj: trees, layer: 'near', seed: 7, area: { rect: [-140, yN + 20, 1740, yN + 70] }, n: n(9), minGap: 150, s: [0.75, 1.05], flip: 0.5, variant: 'random', mask: { avoid: [{ rect: [sx1 - 120, yN - 40, sx1 + 120, yN + 80] }] }, anim: false });
  const shrubs = pick('shrub');
  if (any(shrubs)) data.scatter.push({ obj: shrubs, layer: 'near', seed: 8, area: { rect: [-150, yN + 12, 1750, yN + 90] }, n: n(16), minGap: 80, s: [0.5, 0.85], flip: 0.5, variant: 'random', tint: { col: '#6a7a40', k: [0, 0.08] }, mask: { avoid: [{ rect: [sx1 - 70, yN, sx1 + 70, yN + 60] }] }, anim: false });
  const cover = pick('ground', id => /^plant\./.test(id));
  if (any(cover)) {
    data.scatter.push({ obj: cover, layer: 'near', seed: 9, area: { rect: [-150, yN + 8, 1750, yN + 110] }, n: n(190), minGap: 13, s: [0.5, 0.8], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [sx1 - 64, yN, sx1 + 64, yN + 50] }] }, anim: 'strip' });
    data.scatter.push({ obj: cover, layer: 'fore', seed: 10, area: { rect: [-150, yN + 110, 1750, 905] }, n: n(190), minGap: 18, s: [0.85, 1.3], flip: 0.5, variant: [1, 2], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' });
  }
  // birds over the valley (the kit's flight birds)
  const fly = Object.keys(u.kit('bird')).filter(id => anim(id, 'flap'));
  if (fly.length) data.flocks.push({ obj: fly[0], n: 8, area: [200, 100, 1400, Math.max(240, H - 200)], speed: 22, s: 0.5, seed: 9, layer: 'far' });
  if (fly.length > 1) data.flocks.push({ obj: fly[fly.length - 1], n: 6, area: [100, 260, 1500, H - 40], speed: 30, s: 0.6, seed: 10, layer: 'mid' });
  // the framing: tall conifers at both edges (the temple grove), partly out of frame; a flowering or autumn tree
  // low in each near corner
  const frame = Object.keys(conifers).length ? Object.keys(conifers) : Object.keys(trees);
  if (frame.length) data.place.push({ obj: frame[0], x: -50, y: 940, s: sOf(frame[0], 820), layer: 'front', seed: 21, variant: 2 }, { obj: frame[0], x: 1660, y: 940, s: sOf(frame[0], 760), layer: 'front', seed: 22, flip: true, variant: 0 });
  if (any(trees)) { const ids = Object.keys(trees); data.place.push({ obj: ids[0], x: 130, y: 905, s: 1.25, layer: 'fore', seed: 23, variant: 1 }, { obj: ids[ids.length - 1], x: 1480, y: 908, s: 1.3, layer: 'fore', seed: 24, flip: true, variant: 2 }); }
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('temple-mountain', {
    params: typeof SCENE_REGION_PARAMS !== 'undefined' ? SCENE_REGION_PARAMS : { id: 'id', lat: 'number', lon: 'number' },
    kits: ['east-asian', 'people', 'birds'],
    slots: [{ id: 'mountain', layer: 'horizon', x: 640, y: 566, s: 1 }, { id: 'temple', layer: 'mid', x: 1120, y: 710, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchTempleMountain(p, u),
  });
})();
