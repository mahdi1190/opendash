/* ============================================================
   ARCHETYPE skyline-water (docs/dev/SCENE_ENGINE.md 8.5, 17 converter Y): a city skyline over a
   bay, harbour or wide river, seen from a waterfront promenade. PURE. Takes SCENE_REGION_PARAMS.

   Layers (far to near):
     horizon  the far shore and a dense haze of small towers (building-far, 40 to 80 by density)
     far      a second, larger row of towers with gaps (noise mask), so the landmarks read
     mid      the far quay (a low embankment with trees and lamps) carrying the LANDMARK slots,
              then the water: reflection, shimmer and the glitter road; boats crossing at three
              depths (scaled by y), birds on the water where the kit has swimmers
     near     the promenade: paving, a railing, lamps, benches and up to 6 walkers (sized by the depth ladder)
     fore     the planting bed: dense ground cover by role (wind strips), shrubs
     front    two framing trees, one per side
   Landmarks (the `landmarks` list): an id, or 'id@x@h' (the x of its anchor and its drawn height),
   or 'id@x@h@front[@dy]' to stand it in the water dy (default 34) below the quay (a bridge). Without @: 1 centred,
   2 at 560 / 1080, 3 at 420 / 800 / 1180, each 380 tall.
   Fill by ROLE through u.kit (never object ids): building-far, tree, ground, shrub, street, walker,
   vehicle, boat (tagged harbour) and bird (flight: flap; swimmers: paddle). `density` scales the fill.
   ============================================================ */
const SCENE_ARCH_SKYLINE_PAL = Object.freeze({
  base: { far: ['#8a9cb0', '#a8b8c8'], quay: ['#8a8e92', '#6a7076'], pave: ['#bdb6aa', '#a49e92', '#8a8478'], rail: ['#3a4048', '#5a626a'],
    bed: ['#4a5a36', '#3a4a2a'], water: ['#8ab8cc', '#3e7896', '#1e4660'] },
  // away from the tropics the planting bed and the paving follow the season (the tropics use the summer set)
  spring: { bed: ['#4e6236', '#3c4e2a'] },
  autumn: { bed: ['#6a5a34', '#4e4228'], pave: ['#b8a888', '#9e8e70', '#84765c'], far: ['#9a9aa4', '#b4b2b8'] },
  winter: { bed: ['#d8dee4', '#aeb8c2'], pave: ['#e4e8ec', '#c4ccd4', '#9aa4ae'], quay: ['#c8ced4', '#9aa2aa'], far: ['#b4bcc8', '#ccd2da'] },
});
function sceneArchSkylineWater(p, u) {
  const H = Number.isFinite(p.horizon) ? p.horizon : 540, dens = Number.isFinite(p.density) ? Math.max(0.3, Math.min(2, p.density)) : 1;
  const climate = p.climate || (Math.abs(p.lat || 0) < 23.5 ? 'tropical' : 'temperate');
  const n = k => Math.max(1, Math.round(k * dens));
  const clim = (typeof SCENE_ARCH_CLIMATE_PALETTES !== 'undefined' && SCENE_ARCH_CLIMATE_PALETTES[climate]) || { base: {} };
  const palette = JSON.parse(JSON.stringify(clim));
  for (const [season, slots] of Object.entries(SCENE_ARCH_SKYLINE_PAL)) { palette[season] = palette[season] || {}; for (const [k, v] of Object.entries(slots)) if (season !== 'base' || !palette.base[k]) palette[season][k] = v; }
  if (p.palette && typeof p.palette === 'object') for (const [season, slots] of Object.entries(p.palette)) palette[season] = Object.assign({}, palette[season] || {}, slots);
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  // nature roles (tree, ground, shrub) come from the scene's climate kits only, so a tropical bay never gets a plane tree
  const NATURE = ['tropical', 'temperate', 'arid', 'alpine', 'mediterranean', 'polar', 'east-asian'];
  const natKits = (u.kits || []).filter(k => NATURE.includes(k));
  const pick = (role, keep, tags) => {
    const w = ['tree', 'ground', 'shrub'].includes(role) && natKits.length ? sceneKitPick(natKits, role, { tags }) : u.kit(role, tags);
    if (keep) for (const id of Object.keys(w)) if (!keep(id)) delete w[id];
    return u.mix(role, w);
  };
  // slot picks (8.6): seeded by the scene id and the slot name, never by library order
  const slot = u.slot;
  // ranked ids of a role: the climate kit first, then harbour things, then the slot's hash order
  // a thing of another climate (a tropical bumboat in a temperate harbour) is never picked
  const foreign = id => { const t = (sceneObj(id) || {}).tags || [], cl = NATURE.filter(k => t.includes('kit:' + k)); return cl.length > 0 && !cl.includes(climate) && !cl.some(k => (u.kits || []).includes(k)); };
  const own = name => [].concat(u.picks[name] || []);   // the scene's own picks lead whatever their kit
  const ranked = (w, name) => slot(w, name).filter(id => !foreign(id)).map((id, i) => { const t = (sceneObj(id) || {}).tags || []; return [id, (own(name).includes(id) ? 4 : 0) + (t.includes('kit:' + climate) ? 2 : 0) + (t.includes('harbour') ? 1 : 0), i]; })
    .sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
  const any = w => Object.keys(w).length > 0;
  const anim = (id, k) => { const d = sceneObj(id); return !!(d && d.anim && d.anim[k]); };
  const yQ = H + 22, yW0 = H + 26, yP = Math.round(H + 0.6 * (900 - H)), yW1 = yP, yBed = yP + 46;
  const data = {
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 70, horizon: H, lift: 1 },
    at: p.at || 'dusk', season: 'auto', tropic: 'summer', setting: 'urban', signage: false, palette,
    sky: { stars: 160, clouds: { n: 5, y: [50, Math.max(160, H - 240)], speed: 5 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [
      { layer: 'horizon', d: `M-160 ${H - 4}Q300 ${H - 10} 700 ${H - 6}T1760 ${H - 6}V${H + 12}H-160Z`, fill: { lin: [[0, '@far.0'], [1, '@far.1']], x1: 0, y1: H - 10, x2: 0, y2: H + 12 } },
      { layer: 'mid', d: `M-160 ${H + 8}H1760V${yQ + 6}H-160Z`, fill: { lin: [[0, '@quay.0'], [1, '@quay.1']], x1: 0, y1: H + 8, x2: 0, y2: yQ + 6 } },
      { layer: 'near', d: `M-160 ${yP - 2}H1760V${yP + 46}H-160Z`, fill: { lin: [[0, '@pave.0'], [0.7, '@pave.1'], [1, '@pave.2']], x1: 0, y1: yP, x2: 0, y2: yP + 46 } },
      { layer: 'near', d: `M-160 ${yP - 2}H1760V${yP + 2}H-160Z`, fill: '@rail.1' },
      { layer: 'fore', d: `M-160 ${yBed}Q400 ${yBed - 4} 800 ${yBed}T1760 ${yBed}V905H-160Z`, fill: { lin: [[0, '@bed.0'], [1, '@bed.1']], x1: 0, y1: yBed, x2: 0, y2: 900 } },
    ],
    water: [{ layer: 'mid', d: `M-160 ${yW0}H1760V${yW1}H-160Z`, y0: yW0, y1: yW1, base: ['@water.0', '@water.1', '@water.2'], reflect: true, shimmer: 40, lightPath: true }],
    place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  // the railing along the promenade edge: one path of posts and two rails (ground fill, static)
  let posts = '';
  for (let x = -150; x < 1760; x += 22) posts += `M${x} ${yP - 26}h2.4v26h-2.4z`;
  data.ground.push({ layer: 'near', d: posts + `M-160 ${yP - 28}H1760v3H-160zM-160 ${yP - 14}H1760v2H-160z`, fill: '@rail.0' });
  // landmarks
  const lmIn = (p.landmarks || []).map(s => String(s).split('@')).filter(a => sceneObj(a[0])).slice(0, 4);
  const xs = [[800], [560, 1080], [420, 800, 1180], [300, 640, 960, 1300]][Math.max(0, lmIn.length - 1)];
  const avoid = [];
  lmIn.forEach((a, i) => {
    const id = a[0], x = a[1] ? +a[1] : xs[i], h = a[2] ? +a[2] : 380, front = a[3] === 'front', dy = a[4] ? +a[4] : 34, d = sceneObj(id);
    const s = sOf(id, h), w = (d.size[0] * s) / 2;
    data.place.push({ obj: id, x, y: front ? yW0 + dy : yQ, s, layer: 'mid', seed: 11 + i, reflect: true, shadow: !front });
    if (!front) avoid.push({ rect: [x - w - 10, H - 20, x + w + 10, yQ + 8] });
  });
  // towers: the horizon haze and the far row (landmark spaces kept clear in the far row)
  // the horizon: far-skyline bands where the kit has them (a whole district per placement), else small towers
  const bands = pick('building-far', null, ['distant']);
  let far = pick('building-far', id => !((sceneObj(id).tags || []).includes('distant')), ['skyline']);
  if (!any(far)) far = pick('building-far', id => /tower/.test(id));
  if (any(bands)) data.scatter.push({ obj: bands, layer: 'horizon', seed: 2, area: { rect: [-120, H, 1720, H + 2] }, n: 5, minGap: 300, s: [0.5, 0.8], flip: 0.4, variant: 'random', tint: { col: '#9aaabb', k: [0.08, 0.08] }, shadow: false, anim: false });
  // height caps (maxH): a very tall tower (a 1700-unit skyscraper) never overtops the sky or the landmarks: the far row stays under
  // 0.8 of the horizon-to-top space, the horizon haze under half of it
  if (any(far)) {
    if (!any(bands)) data.scatter.push({ obj: far, layer: 'horizon', seed: 3, area: { rect: [-150, H - 1, 1750, H + 3] }, n: n(52), minGap: 20, s: [0.24, 0.52], maxH: Math.round(H * 0.5), flip: 0.5, variant: 'random', tint: { col: '#9aaabb', k: [0.16, 0.16] }, shadow: false, anim: false });
    data.scatter.push({ obj: far, layer: 'far', seed: 4, area: { rect: [-150, H + 4, 1750, H + 9] }, n: n(30), minGap: 40, s: [0.45, 0.85], maxH: Math.round(H * 0.8), flip: 0.5, variant: 'random', tint: { col: '#8a9aac', k: [0, 0.08] }, mask: { noise: { scale: 140, cut: 0.32 }, avoid }, shadow: false, anim: false });
  }
  // the far quay: small trees and lamps along it (static: distance makes their sway invisible)
  const trees = pick('tree');
  const treeIds = Object.keys(trees);
  if (treeIds.length) data.scatter.push({ obj: trees, layer: 'mid', seed: 15, area: { rect: [-140, yQ - 2, 1740, yQ + 4] }, n: n(26), minGap: 46, s: [0.16, 0.26], flip: 0.5, tint: { col: '#6a8a9a', k: [0.08, 0.08] }, variant: [0, 1], mask: { avoid: avoid.map(a => ({ rect: [a.rect[0] + 30, a.rect[1], a.rect[2] - 30, a.rect[3]] })) }, anim: false, reflect: true });
  const lamps = pick('street', id => /lamp/.test(id));
  const lampId = slot(lamps, 'lamp')[0];
  // boats on the water (harbour boats), at three depths, scaled by y
  const boats = ranked(pick('boat', null, ['harbour']), 'boat');
  const lanes = [yW0 + 22, yW0 + 58, yW0 + 104, yW1 - 40, yW1 - 16];
  const sBy = [[yW0, 0.38], [yW1, 1.05]];
  boats.slice(0, 5).forEach((id, i) => {
    const y = lanes[i % lanes.length], back = i % 2 === 1;
    data.actors.push({ obj: id, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed: 7 + (i % 3) * 4, loop: 'loop', s: 1, sByY: sBy, seed: 30 + i, offset: (0.13 + i * 0.29) % 1, flip: back });
  });
  // birds: a flock over the water, one higher
  const fly = ranked(pick('bird', id => anim(id, 'flap')), 'bird');
  if (fly.length) data.flocks.push({ obj: fly[0], n: 6, area: [160, 110, 1440, Math.max(220, H - 120)], speed: 26, s: 0.55, seed: 9, layer: 'far' });
  if (fly.length > 1) data.flocks.push({ obj: fly[1], n: 3, area: [80, 200, 1500, Math.max(300, H - 60)], speed: 18, s: 0.8, seed: 10, layer: 'mid' });
  // the promenade: lamps, benches, walkers (tiny anonymous silhouettes, spread out)
  if (lampId) data.scatter.push({ obj: lampId, layer: 'near', seed: 13, area: { rect: [-100, yP + 6, 1700, yP + 8] }, n: 5, minGap: 300, s: [0.62, 0.72], flip: 0.4, variant: 1, anim: false });
  const bench = slot(pick('street', id => /bench/.test(id)), 'bench')[0];
  if (bench) data.scatter.push({ obj: bench, layer: 'near', seed: 14, area: { rect: [-60, yP + 10, 1660, yP + 12] }, n: 5, minGap: 260, s: [0.62, 0.74], flip: 0.5, variant: 'random' });
  const walkers = slot(pick('walker', id => { const d = sceneObj(id); return !!d && (d.tags || []).includes('silhouette') && anim(id, 'walk') && !/angler|cyclist/.test(id); }), 'walker');
  for (let i = 0; i < 5 && walkers.length; i++) {
    const id = walkers[i % walkers.length], y = yP + 18 + (i % 3) * 8, back = i % 2 === 1;
    data.actors.push({ obj: id, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 14 + (i % 4) * 3, loop: 'loop', s: scenePersonScale(sceneObj(id).size[1], y, data.view), seed: 50 + i, offset: (i * 0.173 + 0.05) % 1, flip: back });
  }
  // the planting bed: dense ground cover (wind strips) and shrubs
  const cover = pick('ground', id => /^plant\./.test(id));
  if (any(cover)) {
    data.scatter.push({ obj: cover, layer: 'fore', seed: 7, area: { rect: [-150, yBed + 2, 1750, yBed + 60] }, n: n(170), minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], anim: 'strip' });
    data.scatter.push({ obj: cover, layer: 'fore', seed: 8, area: { rect: [-150, yBed + 60, 1750, 905] }, n: n(125), minGap: 22, s: [0.9, 1.3], flip: 0.5, variant: [1, 2], tint: { col: '#6a7a40', k: [0.08, 0.08] }, anim: 'strip' });
  }
  const shrubs = pick('shrub');
  if (any(shrubs)) data.scatter.push({ obj: shrubs, layer: 'fore', seed: 9, area: { rect: [-150, yBed + 10, 1750, yBed + 40] }, n: n(9), minGap: 150, s: [0.6, 0.95], flip: 0.5, variant: 'random', anim: false });
  // the framing trees, one per side (they sway): the slot's first two
  if (treeIds.length) {
    const fr = slot(trees, 'frame'), a = fr[0], b = fr[1] || fr[0];
    data.place.push({ obj: a, x: 10, y: 908, s: sOf(a, 470), layer: 'front', seed: 21, flip: false, variant: 2 }, { obj: b, x: 1690, y: 912, s: sOf(b, 440), layer: 'front', seed: 22, flip: true });
  }
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('skyline-water', {
    params: typeof SCENE_REGION_PARAMS !== 'undefined' ? SCENE_REGION_PARAMS : { id: 'id', lat: 'number', lon: 'number' },
    kits: ['towers', 'urban', 'temperate', 'people', 'boats', 'birds', 'water'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 562, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchSkylineWater(p, u),
  });
})();
