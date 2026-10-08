/* ============================================================
   ARCHETYPE sheffield-view (docs/dev/SCENE_ENGINE.md 8.1, 8.5): one Sheffield view, the area's
   repeated scene type. PURE. The scenes are rows (71-scene-uk-sheffield-views.js), registered by
   72-anim-pack-uk-area-sheffield.js.

   Layers (far to near):
     horizon  two of the city's hills, hazy, with red-brick terraces climbing them (building.sheffield-terrace)
     far      the far ground band, far trees and more terraces
     mid      the LANDMARKS (the `landmarks` list: 'id@x@h' = anchor x and drawn height, at `lmy`), trees, works
     near     the main ground: a lawn, a paved plaza or a street (with Supertram rails and wires when tram is set),
              a river, pond, fountain pool or brook (reflections, shimmer), benches, lamps, pigeons, walkers
     fore     dense cover (wind strips), planters or wildflowers by `ground`
     front    framing trees (frame: 0 none, 1 left, 2 right, 3 both)
   Every object is named by id (the Sheffield library objects have weight 0, so no other archetype picks
   them); the shared library supplies trees, plants, people, birds, street furniture and cars.
   ============================================================ */
const SCENE_ARCH_SHEFFIELD_PAL = Object.freeze({
  base: { hills: ['#7d927e', '#a4b4ac'], far: ['#6f8a5a', '#5e7a4c'], ground: ['#5f8a3e', '#4a7232', '#3c5e2a'], pave: ['#b8b0a2', '#a09888', '#cfc8ba'],
    road: ['#55585c', '#6e7276'], rail: ['#9aa0a4'], wire: ['#2a2e32'], bank: ['#6a5c3a'], water: ['#86aab4', '#4e7a88', '#26505e'] },
  spring: { ground: ['#6c9a40', '#527c34', '#42662c'], far: ['#7a965a', '#68844c'] },
  autumn: { ground: ['#8a8240', '#6e6832', '#58542a'], far: ['#8a7e4a', '#76683c'], hills: ['#8a8a6e', '#aaa894'], pave: ['#b4a890', '#9a8e76', '#c8bca2'] },
  winter: { ground: ['#9aa092', '#7e8676', '#666e60'], far: ['#8a9084', '#767e72'], hills: ['#a2aab0', '#c0c8cc'], pave: ['#c8ccd0', '#aeb4b8', '#dde0e2'], water: ['#9ab4bc', '#6a8a96', '#3e5c68'] },
});
function sceneArchSheffield(p, u) {
  const H = Number.isFinite(p.horizon) ? p.horizon : 500, dens = Number.isFinite(p.density) ? Math.max(0.4, Math.min(1.6, p.density)) : 1;
  const n = (k) => Math.max(1, Math.round(k * dens));
  const r = u.rnd;
  const palette = JSON.parse(JSON.stringify(SCENE_ARCH_SHEFFIELD_PAL));
  if (p.palette && typeof p.palette === 'object') for (const [season, slots] of Object.entries(p.palette)) palette[season] = Object.assign({}, palette[season] || {}, slots);
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const view = { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 74, horizon: H, lift: 1 };
  const ps = (id, y) => scenePersonScale((sceneObj(id) || { size: [1, 64] }).size[1], y, view);
  const ground = p.ground || 'lawn', water = p.water && p.water !== 'none' ? p.water : null, tram = p.tram && p.tram !== 'none' ? p.tram : null;
  const feat = new Set(p.features || []), has = (f) => feat.has(f);
  const setting = p.setting || (ground === 'lawn' || ground === 'park' ? 'mixed' : 'urban');
  const lmy = Number.isFinite(p.lmy) ? p.lmy : H + 110;
  const yN = Math.round(lmy + 40), yF = Math.round(yN + (900 - yN) * 0.45);
  const hills = Number.isFinite(p.hills) ? p.hills : 1;
  const data = {
    v: 1, id: String(p.id), view, at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette,
    sky: { stars: 170, clouds: { n: 6, y: [50, Math.max(170, H - 190)], speed: 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  const G = (layer, d, fill) => data.ground.push({ layer, d, fill });
  const lin = (a, b, y1, y2) => ({ lin: [[0, a], [1, b]], x1: 0, y1, x2: 0, y2 });
  // the hills (horizon) and the far band
  const hy = Math.round(H - 70 * hills), hy2 = Math.round(H - 40 * hills);
  G('horizon', `M-160 ${H + 10}V${H - 10}Q${100 + r() * 200} ${hy - 20} ${520 + r() * 120} ${hy + 10}T${1100 + r() * 100} ${hy - 10}T1760 ${H - 20}V${H + 10}Z`, lin('@hills.1', '@hills.0', hy - 20, H + 10));
  G('horizon', `M-160 ${H + 20}V${H}Q${300 + r() * 200} ${hy2} ${800 + r() * 100} ${hy2 + 20}T1760 ${hy2 + 4}V${H + 20}Z`, lin('@hills.0', '@far.0', hy2, H + 20));
  G('far', `M-160 900V${H + 8}Q500 ${H - 2} 900 ${H + 8}T1760 ${H + 4}V900Z`, lin('@far.0', '@far.1', H, H + 80));
  G('mid', `M-160 900V${lmy - 10}Q600 ${lmy - 18} 1000 ${lmy - 8}T1760 ${lmy - 12}V900Z`, lin('@ground.0', '@ground.1', lmy - 20, 900));
  // terraces on the hills and the far trees
  const hTop = Math.min(hy + 30, H - 30);
  if (hills > 0) {
    data.scatter.push({ obj: { 'building.sheffield-terrace': 2, 'building.sheffield-works': 1 }, layer: 'horizon', variant: 'random', seed: 3, area: { rect: [-140, hTop, 1740, H - 4] }, n: n(9), minGap: 90, s: [0.14, 0.3], sByY: [[hTop, 0.8], [H, 1.2]], flip: 0.5, tint: { col: '#9aaab4', k: [0.2, 0.34] }, anim: false, mask: { noise: { scale: 220, cut: 0.35 } } });
    data.scatter.push({ obj: 'tree.distant', layer: 'horizon', variant: [0, 1], seed: 4, area: { rect: [-140, hTop, 1740, H + 6] }, n: n(12), minGap: 40, s: [0.1, 0.24], sByY: [[hTop, 0.8], [H, 1.2]], flip: 0.5, tint: { col: '#8a9aa0', k: [0.2, 0.3] }, anim: false });
  }
  data.scatter.push({ obj: { 'building.sheffield-terrace': 2, 'building.sheffield-works': 1 }, layer: 'far', variant: 'random', seed: 5, area: { rect: [-140, H + 12, 1740, H + 30] }, n: n(6), minGap: 160, s: [0.3, 0.52], flip: 0.5, tint: { col: '#a0aab0', k: [0.08, 0.18] }, anim: false, mask: { noise: { scale: 260, cut: 0.4 } } });
  data.scatter.push({ obj: { 'tree.distant': 1, 'tree.far-broad': 1 }, layer: 'far', variant: [0, 1], seed: 6, area: { rect: [-140, H + 14, 1740, H + 40] }, n: n(14), minGap: 36, s: [0.18, 0.42], sByY: [[H + 14, 0.85], [H + 40, 1.15]], flip: 0.5, tint: { col: '#6a8070', k: [0.04, 0.14] }, anim: false, mask: { noise: { scale: 150, cut: 0.3 } } });
  // the landmarks: 'id@x@h' (default: centred, 300 tall)
  const lmAvoid = [];
  (p.landmarks || []).forEach((spec, i) => {
    const [id, xs, hs, ys] = String(spec).split('@'); if (!sceneObj(id)) return;
    const x = Number(xs) || 800, h = Number(hs) || 300, y = Number(ys) || lmy, s = sOf(id, h), w = sceneObj(id).size[0] * s;
    data.place.push({ obj: id, x, y, s, layer: 'mid', seed: 11 + i });
    lmAvoid.push({ rect: [x - w * 0.55, y - h, x + w * 0.55, y + 30] });
  });
  if (has('works')) data.place.push({ obj: 'building.sheffield-works', x: Number.isFinite(p.worksx) ? p.worksx : 1380, y: lmy - 4, s: 0.9, layer: 'mid', variant: 1, seed: 19, flip: true });
  // mid trees, kept off the landmarks
  const treeMix = setting === 'urban' ? { 'tree.plane': 2, 'tree.green-birch': 1 } : { 'tree.green-oak': 1, 'tree.green-chestnut': 1 };
  data.scatter.push({ obj: treeMix, layer: 'mid', variant: [0, 1], seed: 7, area: { rect: [-140, lmy - 6, 1740, lmy + 14] }, n: n(Number.isFinite(p.trees) ? p.trees : 9), minGap: 120, s: [0.2, 0.48], flip: 0.5, tint: { col: '#8a7a40', k: [0, 0.12] }, anim: false, mask: { avoid: lmAvoid, noise: { scale: 180, cut: 0.25 } } });
  // the near ground
  const yG = yN - 6;
  if (ground === 'plaza' || ground === 'street') G('near', `M-160 900V${yG}Q700 ${yG - 6} 1760 ${yG + 2}V900Z`, lin('@pave.2', '@pave.0', yG, 900));
  else G('near', `M-160 900V${yG}Q700 ${yG - 8} 1760 ${yG + 2}V900Z`, lin('@ground.1', '@ground.2', yG, 900));
  if (ground === 'plaza') {
    // paving courses in perspective, and lawn beds either side
    let d = ''; for (let k = 0; k < 6; k++) { const y = yG + 12 + k * k * 9 + k * 14; d += `M-160 ${y}H1760V${y + 1.4 + k * 0.4}H-160Z`; }
    G('near', d, '@pave.1');
    G('near', `M-160 900V${yF - 30}Q140 ${yF - 40} 360 ${yF - 20}L460 900Z`, lin('@ground.0', '@ground.2', yF - 40, 900));
    G('near', `M1760 900V${yF - 26}Q1460 ${yF - 40} 1240 ${yF - 18}L1140 900Z`, lin('@ground.0', '@ground.2', yF - 40, 900));
  }
  if ((ground === 'lawn' || ground === 'park') && water !== 'brook') {
    // a curving footpath
    G('near', `M${560} ${yG + 2}Q${700} ${yG + 60} ${560} ${yF}T${640} 905H${880}Q${780} ${yF + 30} ${820} ${yF - 20}T${640} ${yG + 2}Z`, lin('@pave.2', '@pave.0', yG, 900));
  }
  // the street and the Supertram
  const yR = Number.isFinite(p.roady) ? p.roady : Math.round(yN + 46);
  if (ground === 'street' || tram) {
    G('near', `M-160 ${yR - 26}H1760V${yR + 22}H-160Z`, '@road.0');
    G('near', `M-160 ${yR - 32}H1760V${yR - 26}H-160ZM-160 ${yR + 22}H1760V${yR + 28}H-160Z`, '@pave.1');
    if (tram) {
      G('near', `M-160 ${yR - 4}H1760V${yR - 2.6}H-160ZM-160 ${yR + 8}H1760V${yR + 9.6}H-160Z`, '@rail');
      const tH = Math.round(ps('person.walker', yR) * 64 * 2.4), wy = yR - Math.round(tH * 1.35);
      G('near', `M-160 ${wy}H1760V${wy + 1.6}H-160Z`, '@wire');
      for (const x of [80, 560, 1040, 1520]) G('near', `M${x} ${yR - 30}V${wy - 18}H${x + 4}V${yR - 30}ZM${x} ${wy - 2}H${x + 40}V${wy}H${x}Z`, '@wire');
      const ts = Math.round(tH / 86 * 100) / 100;
      data.actors.push({ obj: 'vehicle.sheffield-supertram', layer: 'near', path: tram === 'west' ? [[1980, yR + 6], [-380, yR + 6]] : [[-380, yR + 6], [1980, yR + 6]], speed: 46, loop: 'loop', s: ts, seed: 31, offset: 0.35, flip: tram === 'west' });
    }
    if (ground === 'street' || has('cars')) {
      const cs = Math.round(ps('person.walker', yR) * 64 * 0.86 / 80 * 100) / 100;
      data.actors.push({ obj: 'vehicle.car-city', layer: 'near', path: [[1900, yR - 12], [-300, yR - 12]], speed: 60, loop: 'loop', s: cs, seed: 32, variant: 3, offset: 0.1, flip: true });
      data.actors.push({ obj: 'vehicle.car-city', layer: 'near', path: [[-300, yR + 16], [1900, yR + 16]], speed: 54, loop: 'loop', s: cs, seed: 33, variant: 7, offset: 0.7 });
      if (has('bus')) data.actors.push({ obj: 'vehicle.bus-double-decker', layer: 'near', path: [[1960, yR - 12], [-400, yR - 12]], speed: 38, loop: 'loop', s: Math.round(cs * 80 / 160 * 2.4 * 100) / 100, seed: 34, offset: 0.55, flip: true });
    }
  }
  // water
  if (water === 'river') {
    const y0 = lmy + 8, y1 = yN + 30;
    G('mid', `M-160 ${y0 - 6}H1760V${y1 + 8}H-160Z`, '@bank');
    data.water.push({ layer: 'mid', d: `M-160 ${y0}Q400 ${y0 - 4} 800 ${y0}T1760 ${y0 - 2}V${y1}Q1200 ${y1 + 4} 800 ${y1}T-160 ${y1}Z`, y0, y1, base: ['#86aab4', '#4e7a88', '#26505e'], reflect: true, shimmer: 26, lightPath: true });
    data.scatter.push({ obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'near', variant: 'random', seed: 41, area: { rect: [-150, y1 - 2, 1750, y1 + 8] }, n: n(40), minGap: 24, s: [0.3, 0.5], flip: 0.5, tint: { col: '#8a7a40', k: [0, 0.12] }, anim: false, reflect: true });
    for (const pl of data.place) if (pl.y >= y0 - 40 && pl.y <= y1 + 40) pl.reflect = true;
    for (const sc of data.scatter) { const b = sc.area && sc.area.rect; if (b && b[3] >= y0 - 40 && b[1] <= y1 + 40) sc.reflect = true; }
    data.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[300, y0 + 20], [620, y0 + 24]], speed: 5, loop: 'pingpong', s: 0.3, seed: 42, variant: 0, offset: 0.2 });
    data.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1200, y1 - 10], [900, y1 - 12]], speed: 4, loop: 'pingpong', s: 0.34, seed: 43, variant: 1, offset: 0.6, flip: true });
    data.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[700, y0 + 34], [1000, y0 + 30]], speed: 3, loop: 'pingpong', s: 0.3, seed: 44, offset: 0.4 });
  }
  if (water === 'pond' || water === 'fountain') {
    const cx = Number.isFinite(p.poolx) ? p.poolx : 800, cy = yN + 50, rx = water === 'fountain' ? 300 : 380, ry = water === 'fountain' ? 34 : 50;
    G('near', `M${cx - rx - 10} ${cy}A${rx + 10} ${ry + 8} 0 1 0 ${cx + rx + 10} ${cy}A${rx + 10} ${ry + 8} 0 1 0 ${cx - rx - 10} ${cy}Z`, water === 'fountain' ? '@pave.0' : '@bank');
    data.water.push({ layer: 'near', d: `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`, y0: cy - ry, y1: cy + ry, base: water === 'fountain' ? ['#a8c8d0', '#6a9aa8', '#3a6a78'] : ['#86aab4', '#4e7a88', '#26505e'], reflect: true, shimmer: water === 'fountain' ? 40 : 24, lightPath: true });
    if (water === 'pond') {
      data.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[cx - 200, cy - 10], [cx + 40, cy - 6]], speed: 5, loop: 'pingpong', s: 0.36, seed: 45, offset: 0.3 });
      data.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[cx + 220, cy + 14], [cx + 20, cy + 18]], speed: 4, loop: 'pingpong', s: 0.4, seed: 46, variant: 1, offset: 0.7, flip: true });
      data.actors.push({ obj: 'bird.moorhen', layer: 'near', path: [[cx - 80, cy + 20], [cx + 100, cy + 22]], speed: 4, loop: 'pingpong', s: 0.32, seed: 47, offset: 0.5 });
      data.scatter.push({ obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'near', variant: 'random', seed: 48, area: { rect: [cx - rx, cy - ry - 4, cx - rx + 160, cy - ry + 10] }, n: 14, minGap: 12, s: [0.28, 0.56], flip: 0.5, anim: false, reflect: true });
      data.scatter.push({ obj: 'water.fish-ring', layer: 'near', variant: [0, 1], seed: 49, area: { rect: [cx - rx * 0.6, cy - ry * 0.5, cx + rx * 0.6, cy + ry * 0.5] }, n: 3, minGap: 80, s: [0.4, 0.6] });
    } else {
      // the fountain jets: glinting water rings, and pigeons at the rim
      data.scatter.push({ obj: 'water.fish-ring', layer: 'near', variant: [0, 1], seed: 49, area: { rect: [cx - rx * 0.7, cy - ry * 0.5, cx + rx * 0.7, cy + ry * 0.5] }, n: 3, minGap: 90, s: [0.5, 0.8] });
    }
  }
  if (water === 'brook') {
    const bx = Number.isFinite(p.poolx) ? p.poolx : 800;
    const d = `M${bx - 40} ${lmy + 4}Q${bx - 160} ${yN + 20} ${bx - 60} ${yF}T${bx - 280} 905H${bx + 60}Q${bx + 60} ${yF + 20} ${bx + 70} ${yF - 10}T${bx + 10} ${lmy + 4}Z`;
    G('near', `M${bx - 60} ${lmy}Q${bx - 190} ${yN + 20} ${bx - 90} ${yF}T${bx - 320} 905H${bx + 100}Q${bx + 90} ${yF + 20} ${bx + 100} ${yF - 10}T${bx + 30} ${lmy}Z`, '@bank');
    data.water.push({ layer: 'near', d, y0: lmy + 4, y1: 900, base: ['#8aaab0', '#4e7480', '#2a4a54'], reflect: true, shimmer: 16, lightPath: false });
    data.scatter.push({ obj: { 'rock.stones': 2, 'rock.boulder': 1 }, layer: 'near', variant: 'random', seed: 50, area: { poly: [[bx - 100, yN], [bx + 60, yN], [bx + 70, 900], [bx - 300, 900]] }, n: 16, minGap: 50, s: [0.3, 0.7], sByY: [[yN, 0.7], [900, 1.3]], flip: 0.5, reflect: true });
    data.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[bx - 80, yN + 30], [bx - 20, yN + 40]], speed: 3, loop: 'pingpong', s: 0.34, seed: 51, offset: 0.2 });
    data.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[bx - 140, yF + 30], [bx - 60, yF + 10]], speed: 3, loop: 'pingpong', s: 0.44, seed: 52, variant: 1, offset: 0.6 });
  }
  // near furniture: benches, lamps; ground pigeons on paving, a squirrel on grass
  const paved = ground === 'plaza' || ground === 'street';
  const yB = Math.round(yN + (900 - yN) * 0.3);
  data.place.push({ obj: 'street.lamppost', x: Number.isFinite(p.lampx) ? p.lampx : 1260, y: yB + 10, s: Math.round(ps('person.walker', yB) * 64 * 2.4 / 250 * 100) / 100, layer: 'near', variant: 1, seed: 61 });
  data.place.push({ obj: 'street.lamppost', x: Number.isFinite(p.lampx) ? 1600 - p.lampx : 300, y: yB + 6, s: Math.round(ps('person.walker', yB) * 64 * 2.4 / 250 * 100) / 100, layer: 'near', variant: 1, seed: 62 });
  data.place.push({ obj: 'street.bench', x: Number.isFinite(p.lampx) ? p.lampx - 90 : 1170, y: yB + 12, s: Math.round(ps('person.walker', yB) * 64 * 0.5 / 40 * 100) / 100, layer: 'near', variant: 0, seed: 63 });
  data.place.push({ obj: 'street.bench', x: Number.isFinite(p.lampx) ? 1690 - p.lampx : 390, y: yB + 8, s: Math.round(ps('person.walker', yB) * 64 * 0.5 / 40 * 100) / 100, layer: 'near', variant: 1, seed: 64, flip: true });
  if (paved || has('pigeons')) data.scatter.push({ obj: 'bird.pigeon', layer: 'near', variant: 'random', seed: 65, area: { rect: [300, yB + 20, 1300, yB + 80] }, n: 9, minGap: 36, s: [0.32, 0.86], sByY: [[yB + 20, 0.85], [yB + 80, 1.2]], flip: 0.5, mask: { avoid: water ? [{ rect: [400, yN, 1200, yN + 110] }] : [] } });
  else data.scatter.push({ obj: { 'bird.robin': 1, 'bird.pigeon': 2 }, layer: 'near', variant: 'random', seed: 65, area: { rect: [200, yB + 20, 1400, yB + 80] }, n: 7, minGap: 50, s: [0.32, 0.86], sByY: [[yB + 20, 0.85], [yB + 80, 1.2]], flip: 0.5 });
  if (!paved) data.place.push({ obj: 'animal.squirrel', x: 1430, y: yB + 40, s: 0.6, layer: 'near', seed: 66, flip: true });
  // cover: the near band and the fore band (wind strips)
  const nearCover = paved ? { 'plant.planter': 1, 'plant.grass': 3 } : { 'plant.grass': 3, 'plant.wildflowers': 1 };
  const nearAvoid = [];
  if (ground === 'street' || tram) nearAvoid.push({ rect: [-200, yR - 34, 1800, yR + 30] });
  if (water === 'pond' || water === 'fountain') { const cx = Number.isFinite(p.poolx) ? p.poolx : 800; nearAvoid.push({ rect: [cx - 400, yN - 10, cx + 400, yN + 110] }); }
  if (water === 'brook') { const bx = Number.isFinite(p.poolx) ? p.poolx : 800; nearAvoid.push({ poly: [[bx - 100, lmy], [bx + 110, lmy], [bx + 110, 905], [bx - 340, 905]] }); }
  data.scatter.push({ obj: nearCover, layer: 'near', variant: [0, 1], seed: 71, area: { rect: [-150, yN, 1750, yF] }, n: n(paved ? 70 : 170), minGap: paved ? 22 : 12, s: [0.36, 0.62], sByY: [[yN, 0.8], [yF, 1.2]], flip: 0.5, tint: { col: '#8a7a40', k: [0, 0.12] }, anim: false, mask: { avoid: nearAvoid.concat(paved ? [{ rect: [380, yN, 1220, yF] }] : []) } });
  const foreCover = { 'plant.grass': 2, 'plant.wildflowers': 1 };
  data.scatter.push({ obj: foreCover, layer: 'fore', variant: [0, 1], seed: 72, area: { rect: [-150, yF + (paved ? 40 : 0), 1750, 905] }, n: n(paved ? 230 : 240), minGap: 13, s: [0.7, 1.1], sByY: [[yF, 0.85], [900, 1.25]], flip: 0.5, tint: { col: '#a09050', k: [0, 0.12] }, anim: 'strip', mask: { avoid: water === 'brook' ? nearAvoid.slice(-1) : [] } });
  if (paved) data.scatter.push({ obj: { 'plant.planter': 2, 'street.bollard': 1 }, layer: 'fore', variant: 'random', seed: 73, area: { rect: [-150, yF, 1750, yF + 36] }, n: 30, minGap: 50, s: [0.7, 1.1], flip: 0.5, anim: false });
  // framing trees
  const fr = Number.isFinite(p.frame) ? p.frame : 3, frId = setting === 'urban' ? 'tree.plane' : 'tree.green-oak';
  if (fr & 1) data.place.push({ obj: frId, x: -40, y: 905, s: sOf(frId, 620), layer: 'front', variant: 0, seed: 81, anim: { sway: { k: 0.6 } } });
  if (fr & 2) data.place.push({ obj: frId, x: 1660, y: 910, s: sOf(frId, 580), layer: 'front', variant: 0, seed: 82, flip: true, anim: { sway: { k: 0.6 } } });
  // birds overhead
  data.flocks.push({ obj: 'bird.small-flight', n: 7, area: [200, 80, 1400, Math.max(220, H - 170)], speed: 28, s: 0.55, seed: 91, layer: 'far' });
  data.flocks.push({ obj: 'bird.small-flight', n: 4, area: [100, 140, 1500, Math.max(260, H - 120)], speed: 22, s: 0.7, seed: 92, layer: 'mid' });
  // people: anonymous silhouettes, spread out; a dog walker on grass
  const walkY = Number.isFinite(p.walky) ? p.walky : yB + 30;
  const who = paved ? ['person.walker', 'person.student', 'person.shopper', 'person.cyclist', 'person.couple', 'person.walker', 'person.student'] : ['person.walker', 'person.dog-walker', 'person.jogger', 'person.buggy-walker', 'person.student', 'person.couple', 'person.walker'];
  const nw = Number.isFinite(p.walkers) ? Math.min(7, p.walkers) : 5;
  for (let i = 0; i < nw; i++) {
    const id = who[i % who.length], y = walkY + (i % 3) * 22, back = i % 2 === 1;
    data.actors.push({ obj: id, layer: i % 3 === 2 ? 'fore' : 'near', path: back ? [[1720, y], [-120, y + 6]] : [[-120, y], [1720, y - 4]], speed: id === 'person.cyclist' ? 40 : id === 'person.jogger' ? 28 : 15 + (i % 3) * 2, loop: 'loop', s: ps(id, y), seed: 100 + i, variant: i % 3, offset: (i * 0.21 + 0.05) % 1, flip: back });
  }
  // reflections (15.2): everything within 40 units of a water area's edge mirrors in it
  for (const w of data.water) {
    const near = (a, b) => b >= w.y0 - 40 && a <= w.y1 + 40;
    for (const sc of data.scatter) { const b = sc.area && (sc.area.rect || null); if (b && near(b[1], b[3])) sc.reflect = true; if (sc.area && sc.area.poly) { const ys = sc.area.poly.map(q => q[1]); if (near(Math.min(...ys), Math.max(...ys))) sc.reflect = true; } }
    for (const pl of data.place) if (near(pl.y, pl.y)) pl.reflect = true;
  }
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('sheffield-view', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: typeof SCENE_MOMENTS !== 'undefined' ? SCENE_MOMENTS.slice() : ['afternoon'], horizon: 'number',
      setting: ['urban', 'mixed', 'natural'], ground: ['lawn', 'park', 'plaza', 'street'], water: ['none', 'river', 'pond', 'fountain', 'brook'], tram: ['none', 'east', 'west'],
      landmarks: 'list', lmy: 'number', hills: 'number', trees: 'number', frame: 'number', lampx: 'number', poolx: 'number', roady: 'number', walky: 'number', walkers: 'number', worksx: 'number',
      features: 'list', density: 'number', palette: 'object' },
    kits: ['temperate', 'urban', 'people', 'birds', 'vehicles'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 600, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchSheffield(p, u),
  });
})();
