/* ============================================================
   FRAME HELPERS for the Wokingham area scenes (docs/dev/SCENE_ENGINE.md 3).
   PURE: functions and consts only, no DOM. Each scene file (71-scene-uk-wokingham-1.js
   and -2.js) composes its own picture from these: the view, the palette, the
   projection of a street or a lane, the water and the ground bands. Nothing here
   places objects: the composition belongs to each scene.
   ============================================================ */
const SCENE_WOK_PAL = {
  base: { far: ['#8ea2ac', '#a8bac0'], wood: ['#5a7448', '#4a6440'], ground: ['#76a044', '#5e8a38', '#4a7230'], meadow: ['#86ae4e', '#6a9440'], lawn: ['#6aa040', '#5a9038', '#80b450'],
    fieldA: ['#8cae5a', '#7c9e4e'], fieldB: ['#c4b46a', '#ae9e5a'], hedge: ['#4e6e3a'], path: ['#d2c4a6', '#b8aa8a'], pave: ['#bab2a4', '#9c9486', '#d0c8ba'], road: ['#5e6062', '#74767a'], gravel: ['#a8a090', '#8a8476'],
    bank: ['#6a6440', '#56522e'], sand: ['#c8b890', '#ae9e78'], heath: ['#7a6a4a', '#5e5038'], needle: ['#8a6a44', '#6e5436'], brick: ['#a8604a', '#8a4a3a'], cobble: ['#8a8478', '#6e685e'] },
  spring: { wood: ['#6a8a4a', '#567844'], ground: ['#7eac46', '#64923a', '#4e7a32'], meadow: ['#94bc52', '#76a044'], lawn: ['#74ac44', '#62983a', '#8cc054'], fieldA: ['#9cc060', '#86b052'], fieldB: ['#d8d060', '#c4bc52'] },
  autumn: { wood: ['#8a6a3a', '#6e5632'], ground: ['#9a9248', '#80783c', '#666030'], meadow: ['#a89c54', '#8a8244'], lawn: ['#8a9a48', '#7a8a40', '#a0aa58'], fieldA: ['#a8a058', '#948c4c'], fieldB: ['#a88a5a', '#8e744a'], hedge: ['#7a5a2e'], heath: ['#8a5a3a', '#6e4630'] },
  winter: { far: ['#9cacb8', '#b8c6cc'], wood: ['#5e5a50', '#4c4a42'], ground: ['#8a907a', '#72786a', '#5e6458'], meadow: ['#949a82', '#7c826e'], lawn: ['#7c8a6a', '#6c7a5c', '#94a07e'], fieldA: ['#8a9478', '#7a8468'], fieldB: ['#8a7e66', '#766c58'], hedge: ['#5a4e42'], heath: ['#6a5e50', '#544a40'] },
};

/** The view and the data skeleton of one scene. o: { id, lat, lon, heading, at, horizon, setting, fov, clouds }. */
function sceneWokFrame(o) {
  const H = o.horizon;
  const view = { lat: o.lat, lon: o.lon, heading: Number.isFinite(o.heading) ? o.heading : 180, fov: o.fov || 78, horizon: H, lift: o.lift || 1 };
  const ph = y => scenePersonHeight(view, y);
  /** the scale of an object that is m metres tall, standing at y */
  const metres = (id, m, y) => { const d = sceneObj(id); return d && d.size ? Math.round(ph(y) * m / 1.72 / d.size[1] * 100) / 100 : 1; };
  const person = (id, y) => scenePersonScale((sceneObj(id) || { size: [30, 64] }).size[1], y, view);
  /** the scale that makes an object h units tall */
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  /** a [[y, s], ...] ladder: the scale at y0 and y1, relative to the scale at their middle */
  const ladder = (y0, y1) => { const m = (y0 + y1) / 2; return [[y0, ph(y0) / ph(m)], [y1, ph(y1) / ph(m)]]; };
  const data = {
    v: 1, id: String(o.id), view, at: o.at || 'afternoon', season: 'auto', tropic: 'summer', setting: o.setting || 'urban', signage: false,
    palette: JSON.parse(JSON.stringify(SCENE_WOK_PAL)),
    sky: { stars: 200, clouds: { n: o.clouds || 5, y: [50, Math.max(180, H - 170)], speed: 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  return { data, view, H, ph, metres, person, sOf, ladder };
}
/** A polygon path 'M..L..Z' from [[x, y], ...]. */
function sceneWokPoly(pts) { return 'M' + pts.map(p => Math.round(p[0] * 10) / 10 + ' ' + Math.round(p[1] * 10) / 10).join('L') + 'Z'; }
/** A one-point perspective: ground point (X lateral, Z depth) maps to the screen; the vanishing point is (cx, H). */
function sceneWokProj(cx, H, K, C) { return (X, Z) => [cx + X * K / Z, H + C / Z]; }
/** A wavy horizon line (the far tree line or a shore), n points across the scene. */
function sceneWokWave(rnd, y, amp, n) {
  const a = rnd() * 6, b = rnd() * 6, f1 = 1 + rnd() * 1.5, f2 = 2.5 + rnd() * 2, N = n || 24, pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N, x = -160 + t * 1920; pts.push([Math.round(x), Math.round(y + amp * (Math.sin(t * Math.PI * f1 + a) * 0.65 + Math.sin(t * Math.PI * f2 + b) * 0.35))]); }
  return pts;
}
/** The closed band between a top and a bottom line (two point lists, left to right). */
function sceneWokBand(top, bot) { return sceneWokPoly(top.concat(bot.slice().reverse())); }
/** A seeded cover rule over the band y0..y1 of a layer: objects (an id or a weighted map) scattered across the full width, sized by depth. */
function sceneWokCover(d, f, o) {
  const rule = { obj: o.obj, layer: o.layer, seed: o.seed, area: { rect: [-160, o.y0, 1760, o.y1] }, n: o.n, minGap: o.minGap || 20,
    s: o.s || [0.8, 1.1], sByY: f.ladder(o.y0, o.y1), variant: [0, 1], flip: 0.5, anim: o.anim === undefined ? false : o.anim };
  rule.tint = o.tint === null ? undefined : (o.tint || { col: '#8a8270', k: [0, 0.16] });
  if (o.mask) rule.mask = o.mask;
  if (rule.tint === undefined) delete rule.tint;
  d.scatter.push(rule);
  return rule;
}
/** The far tree line or the far roofs: a ground band across the horizon layer, from the wavy line at y down to y2. */
function sceneWokHorizon(d, rnd, y, amp, y2, fill) {
  d.ground.push({ layer: 'horizon', d: sceneWokBand(sceneWokWave(rnd, y, amp), [[1760, y2], [-160, y2]]), fill: fill || '@wood.0' });
}
