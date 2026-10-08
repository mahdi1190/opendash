/* ============================================================
   SHEFFIELD (second set): the drawing kit for the composed scenes in
   71-scene-uk-sheffield2-a..d.js (docs/dev/SCENE_ENGINE.md section 3). PURE.
   No archetype here: each scene is written as its own data (its camera, its
   horizon, its foreground and its landmark). This file only supplies the
   shared plumbing: the palette, the sky and layer defaults, and small
   placement helpers (cover, walkers, flocks, lamps) that the bar needs.
   Top-level names are sceneSh2... (private to this round). Helpers call
   core functions (sceneObj, scenePersonScale, SCENE_LAYERS_DEFAULT) only
   lazily, inside functions that run after load.
   ============================================================ */
function sceneSh2Pal() {
  return {
    base: {
      pave: ['#b8b0a2', '#a09684', '#cdc6b8'], cobble: ['#7e7a72', '#66625c', '#8e8a80'], road: ['#4e5256', '#63676c'],
      kerb: ['#cfc8ba'], line: ['#ece8dc'], rail: ['#9aa0a4'], wire: ['#2a2e32'],
      hills: ['#7d927e', '#a4b4ac'], far: ['#6f8a5a', '#5e7a4c'], ground: ['#5f8a3e', '#4a7232', '#3c5e2a'],
      wood: ['#3e5a30', '#4e6c3a', '#2e4824'], water: ['#86aab4', '#4e7a88', '#26505e'], bank: ['#6a5c3a'],
      stone: ['#c8c0ae', '#a69e8c'], dark: ['#2e3236', '#44484d'], glass: ['#3a4c58', '#7a94a2'], warm: ['#f0c070'],
      brick: ['#8a4a3a', '#6e3a2e'], sand: ['#d8c49a', '#bca878'],
    },
    spring: { ground: ['#6c9a40', '#527c34', '#42662c'], wood: ['#5a8040', '#6e9450', '#466a32'] },
    autumn: { ground: ['#8a8240', '#6e6832', '#58542a'], wood: ['#8a6a32', '#a07a3a', '#6a5028'], far: ['#8a7e4a', '#76683c'] },
    winter: { ground: ['#9aa092', '#7e8676', '#666e60'], wood: ['#6a6a5e', '#7a7a6c', '#56564c'], far: ['#8a9084', '#767e72'], hills: ['#a2aab0', '#c0c8cc'], water: ['#9ab4bc', '#6a8a96', '#3e5c68'] },
  };
}
/** A new scene: the sky, the layers and the empty lists. o: id, lat, lon, heading, H (horizon y), at, fov, setting, clouds. */
function sceneSh2Make(o) {
  const H = o.H;
  return {
    v: 1, id: String(o.id), view: { lat: o.lat, lon: o.lon, heading: o.heading, fov: o.fov || 74, horizon: H, lift: o.lift || 1 },
    at: o.at || 'afternoon', season: 'auto', tropic: 'summer', setting: o.setting || 'urban', signage: false, palette: sceneSh2Pal(),
    sky: { stars: 170, clouds: { n: o.clouds == null ? 5 : o.clouds, y: [50, Math.max(160, H - 180)], speed: 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: o.particles || 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
}
/** A linear fill from palette slot a (at y1) to b (at y2). */
function sceneSh2Lin(a, b, y1, y2) { return { lin: [[0, a], [1, b]], x1: 0, y1, x2: 0, y2 }; }
/** A rectangle path. */
function sceneSh2Rect(x0, y0, x1, y1) { return `M${x0} ${y0}H${x1}V${y1}H${x0}Z`; }
/** Scale that makes an object h units tall. */
function sceneSh2Sof(id, h) { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; }
/** A cover scatter: n anchors of objs in rect, sized by depth, flipped, tinted. */
function sceneSh2Cover(d, layer, rect, objs, n, s, seed, extra) {
  const y0 = rect[1], y1 = rect[3];
  d.scatter.push(Object.assign({ obj: objs, layer, variant: 'random', seed, area: { rect }, n, minGap: 26, s, sByY: [[y0, 0.8], [y1, 1.2]], flip: 0.5, anim: false,
    tint: { col: '#8a8a7a', k: [0, 0.12] } }, extra || {}));
}
/** A person-sized scale at height y (the depth ladder). */
function sceneSh2Ps(d, id, y) { const def = sceneObj(id); return scenePersonScale(def ? def.size[1] : 64, y, d.view); }
/** A walker (or any actor) along y from x0 to x1 (back = true walks right to left). */
function sceneSh2Walk(d, id, x0, x1, y, layer, seed, extra) {
  const back = x1 < x0;
  d.actors.push(Object.assign({ obj: id, layer, path: [[x0, y], [x1, y]], speed: id.includes('cyclist') ? 40 : id.includes('jogger') ? 28 : 15, loop: 'loop',
    s: sceneSh2Ps(d, id, y), seed, variant: seed % 3, offset: (seed * 0.37) % 1, flip: back }, extra || {}));
}
/** Flying birds over an area [x0, y0, x1, y1]. */
function sceneSh2Flock(d, obj, n, area, seed, extra) { d.flocks.push(Object.assign({ obj, n, area, speed: 24, s: 0.55, seed, layer: 'far' }, extra || {})); }
/** A placed object: id at x, y (its ground) with height h (or s when h is absent). */
function sceneSh2Put(d, id, x, y, layer, seed, o) {
  const opt = o || {};
  const s = opt.s != null ? opt.s : sceneSh2Sof(id, opt.h || 200);
  d.place.push(Object.assign({ obj: id, x: Math.round(x), y: Math.round(y), s, layer, seed, variant: opt.v || 0, flip: !!opt.flip }, opt.extra || {}));
}
/** A lamppost at x with height h. */
function sceneSh2Lamp(d, x, y, h, layer, seed) { sceneSh2Put(d, 'street.lamppost', x, y, layer, seed, { h }); }
/** The sensible bar rows for a town scene: a cover band, two kinds of growth and the pigeons. */
function sceneSh2Pigeons(d, rect, n, seed) { sceneSh2Cover(d, 'near', rect, { 'bird.pigeon': 3, 'bird.pigeon-feral': 1 }, n, [0.36, 0.8], seed, { flip: 0.5 }); }
/** The scene's depth frame: a horizon band of land, the far ground, the near water-free ground. */
function sceneSh2Ground(d, layer, path, fill) { d.ground.push({ layer, d: path, fill }); }
/** A water area with reflections (the glitter road on by default). */
function sceneSh2Water(d, layer, y0, y1, o) {
  const opt = o || {}, base = opt.base || ['#8aaab0', '#4e7480', '#2a4a54'];
  d.water.push({ layer, d: `M-160 ${y0}Q400 ${y0 - 4} 800 ${y0}T1760 ${y0 - 2}V${y1}Q1200 ${y1 + 4} 800 ${y1}T-160 ${y1}Z`, y0, y1, base,
    reflect: true, shimmer: opt.shimmer || 26, lightPath: opt.lightPath !== false });
}
/** Stamp a scene to the registry (the pack file lists them with sceneItems). */
function sceneSh2Add(meta, build) {
  if (typeof sceneAdd !== 'function') return;
  sceneAdd('uk-area-sheffield2', Object.assign({ intensity: 'subtle' }, meta), build);
}
/** The bar's ground for a city or park scene: a horizon band, a far treeline (wood fill), an optional planted verge,
    a cover band of the scene's own objects (o.cover) and a fore band (o.fore). Each part is optional but the cover. */
function sceneSh2Bar(d, o) {
  const opt = o || {}, H = d.view.horizon, yc = Math.round(H + (900 - H) * 0.35), seed = opt.seed || 7000;
  sceneSh2Ground(d, 'horizon', sceneSh2Rect(-160, H - 34, 1760, H + 4), sceneSh2Lin('@hills.1', '@hills.0', H - 34, H + 4));
  sceneSh2Ground(d, 'far', sceneSh2Rect(-160, H - 40, 1760, H + 30), sceneSh2Lin('@wood.1', '@wood.2', H - 40, H + 30));
  sceneSh2Cover(d, 'far', [-160, H - 12, 1760, H + 32], opt.far || { 'tree.distant': 2, 'tree.far-broad': 1 }, opt.farN || 22, [0.2, 0.5], seed + 1, { flip: 0.5, mask: { noise: { scale: 160, cut: 0.3 } } });
  if (opt.verge) sceneSh2Ground(d, 'near', sceneSh2Rect(-160, opt.verge[0], 1760, opt.verge[1]), sceneSh2Lin('@ground.0', '@ground.2', opt.verge[0], opt.verge[1]));
  sceneSh2Cover(d, 'near', [-160, yc, 1760, 900], opt.cover || { 'street.bollard': 2, 'plant.planter': 1, 'bird.pigeon': 3 }, opt.n || 300, [0.45, 1.0], seed + 2, { flip: 0.5, minGap: 16, reflect: !!opt.reflect });
  const fy = Math.round(yc + (900 - yc) * 0.6);
  sceneSh2Flock(d, 'bird.small-flight', 6, [200, 110, 1500, Math.max(200, H - 60)], seed + 9, { speed: 24, s: 0.5 });
  sceneSh2Cover(d, 'fore', [-160, fy, 1760, 905], opt.fore || { 'plant.grass': 2, 'plant.wildflowers': 1 }, opt.foreN || 40, [0.5, 1.2], seed + 3, { flip: 0.5, minGap: 22, reflect: !!opt.reflect });
}
