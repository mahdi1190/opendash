/* ============================================================
   NORWICH SCENE HELPERS (the Norwich area builder). PURE helper functions for the
   composed scenes of 71-scene-uk-norwich-1.js and -2.js: no archetype, no composition.
   Each scene is written out in its own build function (its camera, horizon, ground,
   water, objects, people and birds); these helpers only supply the palette, the sky,
   the default land bands and small placement shorthands. Heights are given in pixels
   on the scene (h), and the scale is worked out from the object's own size.
   Every random draw is the engine's (scene data is deterministic per id).
   ============================================================ */
const NW_PAL = {
  base: { hills: ['#7f9aa6', '#9fb4bc'], ground: ['#6a8a44', '#4e6e36', '#3e5a2c'], road: ['#5e6062', '#7a7c7e'], pave: ['#b4aea2', '#9a948a', '#c8c0b2'],
    cobble: ['#8e887c', '#766f64', '#a8a296'], path: ['#d8ccb0', '#c0b294'], marsh: ['#8aa850', '#74963e', '#a4b860'], reed: ['#8c9a4c', '#6e7e3a'],
    water: ['#86b4c4', '#4a8aa0', '#24566e'], brick: ['#a86a4c', '#8a5038'], lawn: ['#6aa040', '#5a9038', '#80b450'] },
  spring: { ground: ['#7eac46', '#64923a', '#4e7a32'], lawn: ['#74ac44', '#62983a', '#8cc054'], marsh: ['#96b450', '#7ea040', '#b0c464'] },
  autumn: { ground: ['#9a9248', '#80783c', '#666030'], lawn: ['#8a9a48', '#7a8a40', '#a0aa58'], marsh: ['#b0a058', '#98884a', '#c4b06a'], reed: ['#b0a25a', '#8e8244'] },
  winter: { hills: ['#9cacb8', '#b8c6cc'], ground: ['#8a907a', '#72786a', '#5e6458'], lawn: ['#7c8a6a', '#6c7a5c', '#94a07e'], marsh: ['#a09a7a', '#8a846a', '#b4ae8e'], reed: ['#a89e7a', '#8a8062'] },
};

/** A new scene skeleton for a view: the palette, the open sky, the six default layers and empty lists. */
function nwData(o) {
  return {
    v: 1, id: String(o.id), view: { lat: o.lat, lon: o.lon, heading: o.heading, fov: o.fov || 78, horizon: o.H, lift: 1 },
    at: o.at || 'afternoon', season: 'auto', tropic: 'summer', setting: o.setting || 'natural', signage: false,
    palette: JSON.parse(JSON.stringify(NW_PAL)),
    sky: { stars: 180, clouds: { n: o.clouds || 5, y: o.cloudY || [60, Math.max(160, o.H - 200)], speed: o.cloudSpeed || 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
}

/** The default land: a hill band on the horizon, then far, mid and near ground bands (the bands every scene starts from). */
function nwLand(d, H) {
  d.ground.push(
    { layer: 'horizon', d: `M-160 ${H}Q200 ${H - 46} 520 ${H - 22}T1120 ${H - 34}T1760 ${H - 18}V${H + 40}H-160Z`, fill: { lin: [[0, '@hills.0'], [1, '@hills.1']], x1: 0, y1: H - 50, x2: 0, y2: H + 40 } },
    { layer: 'far', d: `M-160 ${H + 6}Q500 ${H - 10} 900 ${H + 4}T1760 ${H}V${H + 90}H-160Z`, fill: { lin: [[0, '@ground.1'], [1, '@ground.0']], x1: 0, y1: H, x2: 0, y2: H + 90 } },
    { layer: 'mid', d: `M-160 ${H + 60}Q600 ${H + 44} 1000 ${H + 58}T1760 ${H + 52}V900H-160Z`, fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: H + 50, x2: 0, y2: 900 } },
    { layer: 'near', d: `M-160 ${H + 170}Q500 ${H + 158} 900 ${H + 172}T1760 ${H + 164}V900H-160Z`, fill: { lin: [[0, '@ground.1'], [1, '@ground.2']], x1: 0, y1: H + 160, x2: 0, y2: 900 } });
  return d;
}

/** A placed object, height h in scene pixels (its scale comes from its own size). */
function nwPut(d, id, layer, x, y, h, o) {
  const ob = sceneObj(id), s = ob && ob.size ? Math.round(h / ob.size[1] * 1000) / 1000 : 1;
  d.place.push(Object.assign({ obj: id, layer, x, y, s, seed: 101 + d.place.length * 7 }, o || {}));
}
/** A placed person (anonymous silhouette), sized by the depth ladder at its foot. */
function nwPerson(d, id, layer, x, y, o) {
  const ob = sceneObj(id); if (!ob) return;
  d.place.push(Object.assign({ obj: id, layer, x, y, s: scenePersonScale(ob.size[1], y, d.view), seed: 201 + d.place.length * 5 }, o || {}));
}
/** Seeded scatter in a rectangle [x0, y0, x1, y1] (or a poly), n items, sizes s0..s1 growing towards the viewer (sByY), a colour tint and wind strips for plants. */
function nwScat(d, obj, layer, area, n, s0, s1, o) {
  const a = Array.isArray(area) ? { rect: area } : area, r = a.rect || [0, 600, 1600, 900];
  const strip = /plant./.test(JSON.stringify(obj));
  d.scatter.push(Object.assign({ obj, layer, seed: 301 + d.scatter.length * 13, area: a, n, minGap: 14, s: [s0, s1], sByY: [[r[1], 0.7], [r[3], 1.25]], flip: 0.5, variant: 'random' }, strip ? { anim: 'strip' } : {}, { tint: { col: '#8a7a40', k: [0, 0.14] } }, o || {}));
}
/** The floor of a scene: dense ground cover across the near and fore layers below the horizon H (two species or more: pass an array). */
function nwFloor(d, objs, H, n, o) {
  nwScat(d, objs, 'near', [-150, Math.min(H + 150, 800), 1750, 900], n, 0.6, 1.0, Object.assign({ minGap: 20, tint: { col: '#8a7a40', k: [0, 0.16] } }, o || {}));
  nwScat(d, objs, 'fore', [-150, Math.min(H + 300, 850), 1750, 905], Math.round(n * 0.7), 0.85, 1.35, Object.assign({ minGap: 20, tint: null }, o || {}));
}
/** An actor that walks, cycles, paddles or sails along a path (speed in px per second). */
function nwAct(d, obj, layer, path, speed, s, o) {
  d.actors.push(Object.assign({ obj, layer, path, speed, loop: 'loop', s, seed: 401 + d.actors.length * 11, offset: ((d.actors.length * 0.37) % 1) }, o || {}));
}
/** A flock that crosses the scene (travellers). */
function nwFlock(d, obj, layer, n, area, speed, s, o) {
  d.flocks.push(Object.assign({ obj, layer, n, area, speed, s, seed: 501 + d.flocks.length * 17 }, o || {}));
}
/** A ground or water polygon in a layer, with a palette fill (a token like '@pave.0' or a gradient object). */
function nwGround(d, layer, path, fill) { d.ground.push({ layer, d: path, fill }); }
/** Water: a band or polygon, with reflections, shimmer and the glitter road. */
function nwWater(d, layer, y0, y1, path, o) {
  d.water.push(Object.assign({ layer, d: path || `M-160 ${y0}H1760V${y1}H-160Z`, y0, y1, base: NW_PAL.base.water, reflect: true, shimmer: 30, lightPath: true }, o || {}));
}
