/* ============================================================
   ARCHETYPE basic (docs/dev/SCENE_ENGINE.md 8.5, section 11): the GENERIC region archetype.
   PURE. Takes SCENE_REGION_PARAMS; the fallback of `scene upgrade` while a suggested archetype is
   not built yet, and the base `station` builds on (sceneArchBasic(p, u, opts)).
   Six layers: horizon and far bands from the palette (or the climate's defaults), a mid band, near
   and fore ground, a front framing layer. Water from `water` (a band between mid and near, with
   reflection, shimmer and the light path). Landmarks in mid (1 centred, 2 at 560 / 1080, 3 spread),
   each about 380 units tall. Fill by ROLE through u.kit (never object ids), so new kit objects reach
   every scene: building-far along the far band, tree scatter in mid and near, dense ground cover in
   near and fore (wind strips), edge along the water, bird flocks, boats on the water, vehicles on a
   road when urban, up to 6 walkers. `density` (default 1) scales every scatter n.
   ============================================================ */
const SCENE_ARCH_CLIMATE_PALETTES = Object.freeze({
  temperate: { base: { hills: ['#7f9aa6', '#9fb4bc'], ground: ['#6a8a44', '#4e6e36', '#3e5a2c'], road: ['#6a6c6e', '#8a8c8a'], pave: ['#b4aea2', '#9a948a'] },
    spring: { ground: ['#74983e', '#57782f', '#42602a'] }, autumn: { ground: ['#8a7e40', '#6e6232', '#54502a'] }, winter: { ground: ['#8a9088', '#6e766c', '#58605a'], hills: ['#9aa8b4', '#b8c4cc'] } },
  tropical: { base: { hills: ['#6e9a8a', '#94b8a8'], ground: ['#5a8a3a', '#447230', '#345a26'], road: ['#6a6a66', '#8a8a84'], pave: ['#c4b8a0', '#a89c86'] } },
  arid: { base: { hills: ['#b48a6a', '#d0a888'], ground: ['#c8a46a', '#a88450', '#8a6a3e'], road: ['#7a7068', '#9a9088'], pave: ['#d4c4a4', '#b8a888'] } },
  alpine: { base: { hills: ['#8a9aac', '#b4c0cc'], ground: ['#6a8a5a', '#4e6a46', '#3a5236'], road: ['#6a6c6e', '#8a8c8a'], pave: ['#b4aea2', '#9a948a'] },
    winter: { ground: ['#e8eef2', '#c8d2da', '#a8b4be'], hills: ['#c8d4e0', '#e4ecf2'] } },
  mediterranean: { base: { hills: ['#9aa48a', '#b8c0a4'], ground: ['#9a9a5a', '#7a7a44', '#5e5e36'], road: ['#7a7470', '#9a948e'], pave: ['#d8ccb0', '#bcb094'] } },
  polar: { base: { hills: ['#b8c8d8', '#d8e4ee'], ground: ['#e4ecf2', '#c4d0da', '#a4b2be'], road: ['#7a8088', '#9aa0a8'], pave: ['#c8ccd0', '#a8acb0'] } },
});
/** The basic scene for params p (SCENE_REGION_PARAMS) and helper u; opts: { setting, road, walkers, extraKits }. Used by every archetype built on it. */
function sceneArchBasic(p, u, opts) {
  opts = opts || {};
  const H = Number.isFinite(p.horizon) ? p.horizon : 520, dens = Number.isFinite(p.density) ? Math.max(0.2, Math.min(2, p.density)) : 1;
  const climate = p.climate || (Math.abs(p.lat || 0) < 23.5 ? 'tropical' : 'temperate');
  const water = p.water && p.water !== 'none' ? p.water : null, setting = opts.setting || 'mixed';
  const palette = JSON.parse(JSON.stringify(SCENE_ARCH_CLIMATE_PALETTES[climate] || SCENE_ARCH_CLIMATE_PALETTES.temperate));
  if (p.palette && typeof p.palette === 'object') for (const [season, slots] of Object.entries(p.palette)) palette[season] = Object.assign({}, palette[season] || {}, slots);
  const n = k => Math.max(0, Math.round(k * dens));
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const pick = (role, keep) => { const w = u.kit(role); if (keep) for (const id of Object.keys(w)) if (!keep(id)) delete w[id]; return u.mix(role, w); };
  // slot picks (8.6): seeded by the scene id and the slot name, never by library order
  const slot = u.slot;
  const any = w => Object.keys(w).length > 0;
  const plantsOnly = id => /^plant\./.test(id);
  const yWater0 = H + 80, yWater1 = H + 150;
  const data = {
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 78, horizon: H, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette,
    sky: { stars: 180, clouds: { n: 5, y: [60, Math.max(160, H - 200)], speed: 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [
      { layer: 'horizon', d: `M-160 ${H}Q200 ${H - 46} 520 ${H - 22}T1120 ${H - 34}T1760 ${H - 18}V${H + 40}H-160Z`, fill: { lin: [[0, '@hills.0'], [1, '@hills.1']], x1: 0, y1: H - 50, x2: 0, y2: H + 40 } },
      { layer: 'far', d: `M-160 ${H + 6}Q500 ${H - 10} 900 ${H + 4}T1760 ${H}V${H + 90}H-160Z`, fill: { lin: [[0, '@ground.1'], [1, '@ground.0']], x1: 0, y1: H, x2: 0, y2: H + 90 } },
      { layer: 'mid', d: `M-160 ${H + 60}Q600 ${H + 44} 1000 ${H + 58}T1760 ${H + 52}V900H-160Z`, fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: H + 50, x2: 0, y2: 900 } },
      { layer: 'near', d: `M-160 ${H + 170}Q500 ${H + 158} 900 ${H + 172}T1760 ${H + 164}V900H-160Z`, fill: { lin: [[0, '@ground.1'], [1, '@ground.2']], x1: 0, y1: H + 160, x2: 0, y2: 900 } },
    ],
    water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  if (water) data.water.push({ layer: 'mid', d: `M-160 ${yWater0}Q400 ${yWater0 - 6} 800 ${yWater0}T1760 ${yWater0 - 4}V${yWater1}Q1200 ${yWater1 + 6} 800 ${yWater1}T-160 ${yWater1}Z`, y0: yWater0, y1: yWater1, base: ['#86b4c4', '#4a8aa0', '#24566e'], reflect: true, shimmer: 30, lightPath: true });
  // landmark slots (8.5): 1 centred, 2 at 560 / 1080, 3 spread; about 380 units tall
  const lms = (p.landmarks || []).filter(id => sceneObj(id)).slice(0, 3), xs = [[800], [560, 1080], [420, 800, 1180]][Math.max(0, lms.length - 1)];
  lms.forEach((id, i) => data.place.push({ obj: id, x: xs[i], y: water ? yWater0 - 4 : H + 70, s: sOf(id, 380), layer: 'mid', seed: 11 + i }));
  // building-far along the far band (a very tall tower is capped under 0.8 of the horizon-to-top space, as in skyline-water)
  const far = pick('building-far');
  if (any(far)) data.scatter.push({ obj: far, layer: 'far', seed: 3, area: { rect: [-140, H + 8, 1740, H + 26] }, n: n(16), minGap: 70, s: [0.3, 0.72], maxH: Math.round(H * 0.8), flip: 0.5, variant: 'random', tint: { col: '#9aa8b4', k: [0, 0.12] }, mask: { noise: { scale: 160, cut: 0.3 } } });
  // trees: mid and near (avoid the landmarks), framing trees in front
  const trees = pick('tree');
  if (any(trees)) {
    const avoid = lms.map((id, i) => ({ rect: [xs[i] - 170, H, xs[i] + 170, H + 160] }));
    data.scatter.push({ obj: trees, layer: 'mid', seed: 5, area: { rect: [-140, H + 40, 1740, H + 70] }, n: n(16), minGap: 70, s: [0.22, 0.36], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.12] }, mask: { avoid } });
    data.scatter.push({ obj: trees, layer: 'near', seed: 6, area: { rect: [-140, H + 175, 1740, H + 200] }, n: n(7), minGap: 180, s: [0.4, 0.55], flip: 0.5, variant: 'random', mask: { avoid: [{ rect: [520, H, 1080, 900] }] } });
    const fr = slot(trees, 'frame'), tid = fr[0], tid2 = fr[1] || fr[0];
    data.place.push({ obj: tid, x: -60, y: 905, s: sOf(tid, 640), layer: 'front', seed: 21, flip: false }, { obj: tid2, x: 1690, y: 910, s: sOf(tid2, 600), layer: 'front', seed: 22, flip: true });
  }
  // dense ground cover (wind strips) in near and fore
  const cover = pick('ground', plantsOnly);
  if (any(cover)) {
    data.scatter.push({ obj: cover, layer: 'near', seed: 7, area: { rect: [-150, H + 178, 1750, H + 270] }, n: n(240), minGap: 13, s: [0.5, 0.85], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.1] }, anim: 'strip' });
    data.scatter.push({ obj: cover, layer: 'fore', seed: 8, area: { rect: [-150, H + 270, 1750, 905] }, n: n(200), minGap: 18, s: [0.8, 1.2], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.1] }, anim: 'strip' });
  }
  const shrubs = pick('shrub');
  if (any(shrubs)) data.scatter.push({ obj: shrubs, layer: 'near', seed: 9, area: { rect: [-150, H + 168, 1750, H + 190] }, n: n(10), minGap: 120, s: [0.24, 0.66], flip: 0.5, variant: 'random' });
  // water: edge plants on both banks, birds on the water, boats crossing
  if (water) {
    const edge = pick('edge', id => !/fish-ring/.test(id));
    if (any(edge)) data.scatter.push({ obj: edge, layer: 'near', seed: 10, area: { rect: [-150, yWater1 - 2, 1750, yWater1 + 14] }, n: n(60), minGap: 22, s: [0.3, 0.6], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.12] }, reflect: true });
    const swim = pick('bird', id => { const d = sceneObj(id); return !!(d && d.anim && (d.anim.paddle)); });
    if (any(swim)) data.scatter.push({ obj: swim, layer: 'mid', seed: 12, area: { rect: [0, yWater0 + 18, 1600, yWater1 - 10] }, n: 6, minGap: 90, s: [0.32, 0.42], flip: 0.5, variant: 'random' });
    const boats = slot(pick('boat'), 'boat');
    boats.slice(0, 2).forEach((id, i) => data.actors.push({ obj: id, layer: 'mid', path: i ? [[1800, yWater0 + 30], [-200, yWater0 + 30]] : [[-200, yWater1 - 12], [1800, yWater1 - 12]], speed: 6 + i * 2, loop: 'loop', s: sOf(id, 34 + i * 6), seed: 30 + i, offset: 0.25 + i * 0.4, flip: !!i }));
  }
  // flying birds
  const fly = slot(pick('bird', id => { const d = sceneObj(id); return !!(d && d.anim && d.anim.flap); }), 'bird');
  if (fly.length) data.flocks.push({ obj: fly[0], n: 7, area: [200, 80, 1400, Math.max(200, H - 160)], speed: 30, s: 0.6, seed: 9, layer: 'far' });
  if (fly.length > 1) data.flocks.push({ obj: fly[1], n: 3, area: [100, 120, 1500, Math.max(240, H - 120)], speed: 22, s: 0.7, seed: 10, layer: 'mid' });
  // a road with vehicles (urban)
  if (opts.road || setting === 'urban') {
    const yr = opts.road || H + 250;
    data.ground.push({ layer: 'near', d: `M-160 ${yr - 22}H1760V${yr + 14}H-160Z`, fill: '@road.0' }, { layer: 'near', d: `M-160 ${yr - 34}H1760V${yr - 22}H-160Z`, fill: '@pave.0' });
    const veh = slot(pick('vehicle', id => !/^rail\./.test(id)), 'vehicle');
    veh.slice(0, 2).forEach((id, i) => data.actors.push({ obj: id, layer: 'near', path: i ? [[1860, yr - 8], [-260, yr - 8]] : [[-260, yr + 6], [1860, yr + 6]], speed: 46 + i * 8, loop: 'loop', s: 1, seed: 40 + i, offset: 0.15 + i * 0.5, flip: !!i }));
  }
  // walkers: anonymous silhouettes, spread out (care rules 8.5), sized by the depth ladder at their row (2.8)
  const walkers = slot(pick('walker', id => { const d = sceneObj(id); return !!d && (d.tags || []).includes('silhouette') && !(d.anim && d.anim.turn && !d.anim.walk); }), 'walker');
  const nw = Math.min(opts.walkers == null ? 6 : opts.walkers, 10);
  for (let i = 0; i < nw && walkers.length; i++) {
    const id = walkers[i % walkers.length], y = (opts.walkY || H + 200) + (i % 3) * 14, back = i % 2 === 1;
    data.actors.push({ obj: id, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 16 + (i % 4) * 3, loop: 'loop', s: scenePersonScale(sceneObj(id).size[1], y, data.view), seed: 50 + i, offset: (i * 0.137 + 0.05) % 1, flip: back });
  }
  // reflections (15.2): everything within 40 units of the water's edge mirrors in it
  if (water) {
    const near = (y0, y1) => y1 >= yWater0 - 40 && y0 <= yWater1 + 40;
    for (const r of data.scatter) { const b = r.area && r.area.rect; if (b && near(b[1], b[3])) r.reflect = true; }
    for (const e of data.place) if (near(e.y, e.y)) e.reflect = true;
  }
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('basic', {
    params: typeof SCENE_REGION_PARAMS !== 'undefined' ? SCENE_REGION_PARAMS : { id: 'id', lat: 'number', lon: 'number' },
    kits: ['temperate', 'people', 'birds', 'boats', 'water'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 600, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchBasic(p, u, {}),
  });
})();
