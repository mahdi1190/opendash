/* ============================================================
   ARCHETYPE woking-view (docs/dev/SCENE_ENGINE.md 8.1, 8.5): one Woking view, the area's
   repeated scene type. PURE. The scenes are rows (71-scene-uk-woking-views.js), registered by
   72-anim-pack-uk-area-woking.js.

   Woking is flat: no hills, a low wooded horizon with the town's roofs, the Victoria Square
   towers standing over it where a row asks for them (`skyline`).
   Layers (far to near):
     horizon  a low line of woods (pines on the heath) and, in town, roofs and far towers
     far      the far ground band, far trees
     mid      the LANDMARKS (the `landmarks` list: 'id@x@h[@y]'), trees kept off them
     near     the main ground: lawn, park, paved plaza or open heath (sand, heather, gorse);
              the Basingstoke Canal (towpath, narrowboats), a pond, or the railway (tracks and a train)
     fore     dense cover (wind strips): grass and flowers, planters, or heather
     front    framing trees (frame: 0 none, 1 left, 2 right, 3 both)
   Every object is named by id; the shared library supplies trees, plants, people, birds,
   boats, trains and street furniture.
   ============================================================ */
const SCENE_ARCH_WOKING_PAL = Object.freeze({
  base: { sky: ['#9fb0b8', '#b8c4c8'], far: ['#6f8a5a', '#5e7a4c'], ground: ['#5f8a3e', '#4a7232', '#3c5e2a'], pave: ['#c2b8a8', '#a69c8c', '#d8d0c2'],
    sand: ['#e4cc98', '#c8ac76', '#a88c5c'], heath: ['#7a6a48', '#5e5a3a', '#8a7a52'], bank: ['#6a5c3a'], ballast: ['#8a8278', '#6e6860'], rail: ['#9aa0a4'], sleeper: ['#5a4a3a'] },
  spring: { ground: ['#6c9a40', '#527c34', '#42662c'], far: ['#7a965a', '#68844c'], heath: ['#6e7a44', '#56603a', '#86924e'] },
  summer: { heath: ['#7e5e7a', '#62506a', '#946e8a'] },
  autumn: { ground: ['#8a8240', '#6e6832', '#58542a'], far: ['#8a7e4a', '#76683c'], pave: ['#bcb098', '#a09478', '#d0c4a8'], heath: ['#8a5e4a', '#6e4e3c', '#a07050'] },
  winter: { ground: ['#9aa092', '#7e8676', '#666e60'], far: ['#8a9084', '#767e72'], pave: ['#ccd0d2', '#b0b6b8', '#e0e2e4'], heath: ['#6a5e50', '#584e44', '#7e7262'], sand: ['#d4c6a6', '#b4a486', '#948468'] },
});
function sceneArchWoking(p, u) {
  const H = Number.isFinite(p.horizon) ? p.horizon : 500, dens = Number.isFinite(p.density) ? Math.max(0.4, Math.min(1.6, p.density)) : 1;
  const n = (k) => Math.max(1, Math.round(k * dens));
  const r = u.rnd;
  const palette = JSON.parse(JSON.stringify(SCENE_ARCH_WOKING_PAL));
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const view = { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 74, horizon: H, lift: 1 };
  const ps = (id, y) => scenePersonScale((sceneObj(id) || { size: [1, 64] }).size[1], y, view);
  const ground = p.ground || 'lawn', water = p.water && p.water !== 'none' ? p.water : null, rail = p.rail && p.rail !== 'none' ? p.rail : null;
  const feat = new Set(p.features || []), has = (f) => feat.has(f);
  const heath = ground === 'heath';
  const setting = p.setting || (ground === 'plaza' ? 'urban' : heath ? 'natural' : 'mixed');
  const lmy = Number.isFinite(p.lmy) ? p.lmy : H + 110;
  const yN = Math.round(lmy + 40), yF = Math.round(yN + (900 - yN) * 0.45);
  const data = {
    v: 1, id: String(p.id), view, at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette,
    sky: { stars: 170, clouds: { n: 6, y: [50, Math.max(170, H - 190)], speed: 6 }, sunR: 26, moonR: 20 },
    layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  const G = (layer, d, fill) => data.ground.push({ layer, d, fill });
  const lin = (a, b, y1, y2) => ({ lin: [[0, a], [1, b]], x1: 0, y1, x2: 0, y2 });
  // ---- the low horizon: a band of woods, the far ground, the mid ground
  G('horizon', `M-160 ${H + 12}V${H - 6}Q${200 + r() * 200} ${H - 22} ${700 + r() * 100} ${H - 12}T1760 ${H - 8}V${H + 12}Z`, lin('@sky.0', '@far.0', H - 24, H + 12));
  G('far', `M-160 900V${H + 6}Q500 ${H} 900 ${H + 6}T1760 ${H + 4}V900Z`, lin('@far.0', '@far.1', H, H + 80));
  G('mid', `M-160 900V${lmy - 10}Q600 ${lmy - 18} 1000 ${lmy - 8}T1760 ${lmy - 12}V900Z`, heath ? lin('@heath.0', '@heath.1', lmy - 20, 900) : lin('@ground.0', '@ground.1', lmy - 20, 900));
  data.scatter.push({ obj: heath ? { 'tree.distant-pine': 2, 'tree.far-pine': 1, 'tree.distant': 1 } : { 'tree.distant': 2, 'tree.far-broad': 1, 'tree.distant-pine': 1 }, layer: 'horizon', variant: [0, 1], seed: 4, area: { rect: [-140, H - 8, 1740, H + 8] }, n: n(24), minGap: 26, s: [0.1, 0.38], sByY: [[H - 8, 0.85], [H + 8, 1.15]], flip: 0.5, tint: { col: '#8a9aa0', k: [0.16, 0.28] }, anim: false, mask: { noise: { scale: 170, cut: 0.3 } } });
  // the town's roofs and towers on the skyline
  if (has('roofs')) data.scatter.push({ obj: { 'building.terrace-victorian': 2, 'building.shopfront': 1 }, layer: 'far', variant: 'random', seed: 5, area: { rect: [-140, H + 10, 1740, H + 22] }, n: n(7), minGap: 150, s: [0.18, 0.3], flip: 0.5, tint: { col: '#a0aab0', k: [0.12, 0.22] }, anim: false, mask: { noise: { scale: 260, cut: 0.35 } } });
  if (p.skyline) { const [sx, sh] = String(p.skyline).split('@').map(Number); data.place.push({ obj: 'landmark.woking-towers', x: sx || 1200, y: H + 14, s: sOf('landmark.woking-towers', sh || 160), layer: 'far', seed: 9, tint: { col: '#aab4bc', k: 0.18 } }); }
  data.scatter.push({ obj: heath ? { 'tree.far-pine': 2, 'tree.far-birch': 1 } : { 'tree.distant': 1, 'tree.far-broad': 1 }, layer: 'far', variant: [0, 1], seed: 6, area: { rect: [-140, H + 14, 1740, H + 40] }, n: n(16), minGap: 34, s: [0.18, 0.42], sByY: [[H + 14, 0.85], [H + 40, 1.15]], flip: 0.5, tint: { col: '#6a8070', k: [0.04, 0.14] }, anim: false, mask: { noise: { scale: 150, cut: 0.3 } } });
  // ---- the landmarks: 'id@x@h[@y]'
  const lmAvoid = [];
  (p.landmarks || []).forEach((spec, i) => {
    const [id, xs, hs, ys] = String(spec).split('@'); if (!sceneObj(id)) return;
    const x = Number(xs) || 800, h = Number(hs) || 300, y = Number(ys) || lmy, s = sOf(id, h), w = sceneObj(id).size[0] * s;
    data.place.push({ obj: id, x, y, s, layer: 'mid', seed: 11 + i });
    lmAvoid.push({ rect: [x - w * 0.55, y - h, x + w * 0.55, y + 30] });
  });
  // mid trees, kept off the landmarks
  const treeMix = heath ? { 'tree.pine-veteran': 2, 'tree.birch-heath': 3 } : setting === 'urban' ? { 'tree.plane': 2, 'tree.green-birch': 1 } : { 'tree.green-oak': 1, 'tree.green-chestnut': 1, 'tree.green-birch': 1 };
  data.scatter.push({ obj: treeMix, layer: 'mid', variant: [0, 1], seed: 7, area: { rect: [-140, lmy - 6, 1740, lmy + 14] }, n: n(Number.isFinite(p.trees) ? p.trees : 9), minGap: heath ? 80 : 120, s: heath ? [0.22, 0.56] : [0.2, 0.48], sByY: [[lmy - 6, 0.8], [lmy + 14, 1.2]], flip: 0.5, tint: { col: '#8a7a40', k: [0, 0.12] }, anim: false, mask: { avoid: lmAvoid, noise: { scale: heath ? 130 : 180, cut: heath ? 0.4 : 0.25 } } });
  // ---- the near ground
  const yG = yN - 6;
  if (ground === 'plaza') G('near', `M-160 900V${yG}Q700 ${yG - 6} 1760 ${yG + 2}V900Z`, lin('@pave.2', '@pave.0', yG, 900));
  else if (heath) G('near', `M-160 900V${yG}Q700 ${yG - 8} 1760 ${yG + 2}V900Z`, lin('@heath.0', '@heath.1', yG, 900));
  else G('near', `M-160 900V${yG}Q700 ${yG - 8} 1760 ${yG + 2}V900Z`, lin('@ground.1', '@ground.2', yG, 900));
  if (ground === 'plaza') {
    let d = ''; for (let k = 0; k < 6; k++) { const y = yG + 12 + k * k * 9 + k * 14; d += `M-160 ${y}H1760V${y + 1.4 + k * 0.4}H-160Z`; }
    G('near', d, '@pave.1');
    let dv = ''; for (let k = -6; k <= 6; k++) { const x0 = 800 + k * 60, x1 = 800 + k * 200; dv += `M${x0} ${yG}L${x1} 905L${x1 + 2} 905L${x0 + 1} ${yG}Z`; }
    G('near', dv, '@pave.1');
    G('near', `M-160 900V${yF - 30}Q140 ${yF - 40} 340 ${yF - 20}L420 900Z`, lin('@ground.0', '@ground.2', yF - 40, 900));
    G('near', `M1760 900V${yF - 26}Q1460 ${yF - 40} 1260 ${yF - 18}L1180 900Z`, lin('@ground.0', '@ground.2', yF - 40, 900));
  }
  if ((ground === 'lawn' || ground === 'park') && !water) G('near', `M${560} ${yG + 2}Q${700} ${yG + 60} ${560} ${yF}T${640} 905H${880}Q${780} ${yF + 30} ${820} ${yF - 20}T${640} ${yG + 2}Z`, lin('@pave.2', '@pave.0', yG, 900));
  if (heath) {
    // bare sand tracks and blow-outs through the heather
    const bx = Number.isFinite(p.poolx) ? p.poolx : 760;
    G('near', `M${bx - 30} ${yG + 2}Q${bx + 120} ${yG + 70} ${bx - 40} ${yF}T${bx + 40} 905H${bx + 330}Q${bx + 140} ${yF + 40} ${bx + 170} ${yF - 20}T${bx + 20} ${yG + 2}Z`, lin('@sand.0', '@sand.1', yG, 900));
    for (let i = 0; i < 4; i++) { const x = 120 + i * 420 + r() * 80, y = yN + 30 + r() * 80, w = 70 + r() * 60; G('near', `M${Math.round(x - w)} ${Math.round(y)}Q${Math.round(x)} ${Math.round(y - 22)} ${Math.round(x + w)} ${Math.round(y)}Q${Math.round(x)} ${Math.round(y + 14)} ${Math.round(x - w)} ${Math.round(y)}Z`, '@sand.1'); }
  }
  // ---- the Basingstoke Canal: a level band across the scene, a towpath on the near side
  let c0 = 0, c1 = 0;
  if (water === 'canal') {
    c0 = lmy + 8; c1 = yN + 34;
    G('mid', `M-160 ${c0 - 6}H1760V${c1 + 6}H-160Z`, '@bank');
    data.water.push({ layer: 'mid', d: `M-160 ${c0}H1760V${c1}H-160Z`, y0: c0, y1: c1, base: ['#8aa89c', '#557a6e', '#2e4e46'], reflect: true, shimmer: 14, lightPath: true });
    G('near', `M-160 ${c1 + 4}H1760V${c1 + 26}H-160Z`, lin('@pave.0', '@pave.1', c1 + 4, c1 + 26));
    G('near', `M-160 ${c1 + 2}H1760V${c1 + 5}H-160Z`, '@ballast.1');
    data.scatter.push({ obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'mid', variant: 'random', seed: 41, area: { rect: [-150, c0 - 4, 1750, c0 + 4] }, n: n(30), minGap: 30, s: [0.26, 0.42], flip: 0.5, tint: { col: '#8a7a40', k: [0, 0.12] }, anim: false, reflect: true, mask: { noise: { scale: 200, cut: 0.35 } } });
    // a narrowboat under way and two moored at the far bank
    const nbS = Math.round(ps('person.walker', c0 + 20) * 64 * 1.8 / 103 * 100) / 100;
    data.actors.push({ obj: 'boat.narrowboat', layer: 'mid', path: p.boat === 'west' ? [[1900, c0 + 22], [-400, c0 + 22]] : [[-400, c0 + 24], [1900, c0 + 24]], speed: 7, loop: 'loop', s: nbS, seed: 43, variant: 1, offset: 0.3, flip: p.boat === 'west' });
    for (const [x, v] of [[Number.isFinite(p.moorx) ? p.moorx : 260, 0], [(Number.isFinite(p.moorx) ? p.moorx : 260) + 300, 2]]) data.place.push({ obj: 'boat.narrowboat', x, y: c0 + 10, s: Math.round(nbS * 0.86 * 100) / 100, layer: 'mid', seed: 44 + v, variant: v, reflect: true });
    data.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[900, c1 - 8], [1180, c1 - 10]], speed: 4, loop: 'pingpong', s: 0.32, seed: 45, offset: 0.5 });
    data.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[1300, c0 + 30], [1050, c0 + 34]], speed: 3, loop: 'pingpong', s: 0.3, seed: 46, offset: 0.2, flip: true });
  }
  if (water === 'pond') {
    const cx = Number.isFinite(p.poolx) ? p.poolx : 800, cy = yN + 50, rx = 380, ry = 50;
    G('near', `M${cx - rx - 10} ${cy}A${rx + 10} ${ry + 8} 0 1 0 ${cx + rx + 10} ${cy}A${rx + 10} ${ry + 8} 0 1 0 ${cx - rx - 10} ${cy}Z`, '@bank');
    data.water.push({ layer: 'near', d: `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`, y0: cy - ry, y1: cy + ry, base: ['#86aab4', '#4e7a88', '#26505e'], reflect: true, shimmer: 16, lightPath: true });
    data.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[cx - 200, cy - 10], [cx + 40, cy - 6]], speed: 5, loop: 'pingpong', s: 0.36, seed: 45, offset: 0.3 });
    data.actors.push({ obj: 'bird.coot', layer: 'near', path: [[cx + 220, cy + 14], [cx + 20, cy + 18]], speed: 4, loop: 'pingpong', s: 0.4, seed: 46, offset: 0.7, flip: true });
    data.actors.push({ obj: 'bird.goose', layer: 'near', path: [[cx - 80, cy + 20], [cx + 100, cy + 22]], speed: 3, loop: 'pingpong', s: 0.4, seed: 47, offset: 0.5 });
    data.scatter.push({ obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'near', variant: 'random', seed: 48, area: { rect: [cx - rx, cy - ry - 4, cx - rx + 160, cy - ry + 10] }, n: 14, minGap: 12, s: [0.28, 0.56], flip: 0.5, anim: false, reflect: true });
    data.scatter.push({ obj: 'water.fish-ring', layer: 'near', variant: [0, 1], seed: 49, area: { rect: [cx - rx * 0.6, cy - ry * 0.5, cx + rx * 0.6, cy + ry * 0.5] }, n: 3, minGap: 80, s: [0.4, 0.6] });
  }
  // ---- the railway: ballast, two tracks and a train running through
  let yR = 0;
  if (rail) {
    yR = Number.isFinite(p.roady) ? p.roady : Math.round(yN + 30);
    G('near', `M-160 ${yR - 22}H1760V${yR + 20}H-160Z`, lin('@ballast.0', '@ballast.1', yR - 22, yR + 20));
    let sl = ''; for (let x = -160; x < 1760; x += 14) sl += `M${x} ${yR - 16}h6v10h-6zM${x} ${yR + 4}h6v10h-6z`;
    G('near', sl, '@sleeper');
    G('near', `M-160 ${yR - 14}H1760V${yR - 12.4}H-160ZM-160 ${yR - 6}H1760V${yR - 4.4}H-160ZM-160 ${yR + 6}H1760V${yR + 7.6}H-160ZM-160 ${yR + 13}H1760V${yR + 14.6}H-160Z`, '@rail');
    // a platform edge on the far side
    G('near', `M-160 ${yR - 34}H1760V${yR - 22}H-160Z`, lin('@pave.2', '@pave.1', yR - 34, yR - 22));
    G('near', `M-160 ${yR - 35}H1760V${yR - 32}H-160Z`, '#e8d890');
    const tS = Math.round(ps('person.walker', yR) * 64 * 3.9 / 46 * 100) / 100;
    data.actors.push({ obj: 'rail.train-mainline', layer: 'near', path: rail === 'west' ? [[2300, yR - 2], [-700, yR - 2]] : [[-700, yR + 10], [2300, yR + 10]], speed: 70, loop: 'loop', s: tS, seed: 31, offset: 0.4, flip: rail === 'west' });
    for (const x of [140, 1460]) data.place.push({ obj: 'street.lamppost', x, y: yR - 30, s: Math.round(ps('person.walker', yR) * 64 * 2.4 / 250 * 100) / 100, layer: 'near', variant: 1, seed: 33 + x % 7 });
  }
  // ---- near furniture: benches and lamps in town and park; birds on the ground
  const paved = ground === 'plaza';
  const yB = Math.round(yN + (900 - yN) * 0.3) + (rail ? 30 : 0);
  if (!heath) {
    const lx = Number.isFinite(p.lampx) ? p.lampx : 1260, ls = Math.round(ps('person.walker', yB) * 64 * 2.4 / 250 * 100) / 100, bs = Math.round(ps('person.walker', yB) * 64 * 0.5 / 40 * 100) / 100;
    data.place.push({ obj: 'street.lamppost', x: lx, y: yB + 10, s: ls, layer: 'near', variant: 1, seed: 61 });
    data.place.push({ obj: 'street.lamppost', x: 1600 - lx, y: yB + 6, s: ls, layer: 'near', variant: 1, seed: 62 });
    data.place.push({ obj: 'street.bench', x: lx - 90, y: yB + 12, s: bs, layer: 'near', variant: 0, seed: 63 });
    data.place.push({ obj: 'street.bench', x: 1690 - lx, y: yB + 8, s: bs, layer: 'near', variant: 1, seed: 64, flip: true });
  }
  if (paved) data.scatter.push({ obj: 'bird.pigeon', layer: 'near', variant: 'random', seed: 65, area: { rect: [300, yB + 20, 1300, yB + 80] }, n: 9, minGap: 36, s: [0.32, 0.86], sByY: [[yB + 20, 0.85], [yB + 80, 1.2]], flip: 0.5 });
  else if (heath) { for (const [id, x, k] of [['bird.stonechat', 380, 0], ['bird.dartford-warbler', 1240, 1], ['bird.stonechat', 1460, 2]]) data.place.push({ obj: id, x, y: yF - 30 + k * 16, s: 0.5, layer: 'near', seed: 66 + k, flip: !!(k % 2) }); }
  else { data.scatter.push({ obj: { 'bird.robin': 1, 'bird.pigeon': 2 }, layer: 'near', variant: 'random', seed: 65, area: { rect: [200, yB + 20, 1400, yB + 80] }, n: 7, minGap: 50, s: [0.32, 0.86], sByY: [[yB + 20, 0.85], [yB + 80, 1.2]], flip: 0.5 }); data.place.push({ obj: 'animal.squirrel', x: 1430, y: yB + 40, s: 0.6, layer: 'near', seed: 66, flip: true }); }
  // ---- cover: the near band and the fore band
  const nearAvoid = [];
  if (rail) nearAvoid.push({ rect: [-200, yR - 40, 1800, yR + 24] });
  if (water === 'canal') nearAvoid.push({ rect: [-200, c0 - 10, 1800, c1 + 28] });
  if (water === 'pond') { const cx = Number.isFinite(p.poolx) ? p.poolx : 800; nearAvoid.push({ rect: [cx - 400, yN - 10, cx + 400, yN + 110] }); }
  if (heath) { const bx = Number.isFinite(p.poolx) ? p.poolx : 760; nearAvoid.push({ poly: [[bx - 40, yG], [bx + 40, yG], [bx + 340, 905], [bx + 20, 905]] }); }
  const nearCover = paved ? { 'plant.planter': 1, 'plant.grass': 3 } : heath ? { 'plant.heather': 3, 'plant.gorse': 1, 'plant.grass': 1 } : { 'plant.grass': 3, 'plant.wildflowers': 1 };
  data.scatter.push({ obj: nearCover, layer: 'near', variant: [0, 1], seed: 71, area: { rect: [-150, yN, 1750, yF] }, n: n(paved ? 60 : heath ? 220 : 190), minGap: paved ? 22 : heath ? 13 : 11, s: [0.36, 0.62], sByY: [[yN, 0.8], [yF, 1.2]], flip: 0.5, tint: { col: '#8a7a40', k: [0, 0.12] }, anim: false, mask: { avoid: nearAvoid.concat(paved ? [{ rect: [380, yN, 1220, yF] }] : []) } });
  if (heath) data.scatter.push({ obj: { 'plant.gorse': 1, 'plant.bracken': 1, 'tree.birch-heath': 1 }, layer: 'near', variant: [0, 1], seed: 74, area: { rect: [-150, yN - 6, 1750, yN + 40] }, n: n(9), minGap: 110, s: [0.22, 0.62], sByY: [[yN - 6, 0.75], [yN + 40, 1.3]], flip: 0.5, anim: false, mask: { avoid: nearAvoid } });
  const foreCover = heath ? { 'plant.heather': 3, 'plant.grass': 1, 'plant.bracken': 1 } : { 'plant.grass': 2, 'plant.wildflowers': 1 };
  data.scatter.push({ obj: foreCover, layer: 'fore', variant: [0, 1], seed: 72, area: { rect: [-150, yF + (paved ? 40 : 0), 1750, 905] }, n: n(paved ? 190 : heath ? 120 : 200), minGap: heath ? 26 : 13, s: [0.7, 1.1], sByY: [[yF, 0.85], [900, 1.25]], flip: 0.5, tint: { col: '#a09050', k: [0, 0.12] }, anim: heath ? false : 'strip', mask: { avoid: heath ? nearAvoid.slice(-1) : [] } });
  if (heath) data.scatter.push({ obj: 'plant.grass', layer: 'front', variant: [0, 1], seed: 75, area: { rect: [-160, 878, 1760, 906] }, n: 50, minGap: 16, s: [1.3, 1.8], flip: 0.5, anim: 'strip' });
  if (paved) data.scatter.push({ obj: { 'plant.planter': 2, 'street.bollard': 1 }, layer: 'fore', variant: 'random', seed: 73, area: { rect: [-150, yF, 1750, yF + 90] }, n: 22, minGap: 60, s: [0.6, 1.2], sByY: [[yF, 0.75], [yF + 90, 1.3]], flip: 0.5, anim: false });
  // ---- framing trees
  const fr = Number.isFinite(p.frame) ? p.frame : 3, frId = heath ? 'tree.birch-heath' : setting === 'urban' ? 'tree.plane' : 'tree.green-oak';
  if (fr & 1) data.place.push({ obj: frId, x: -40, y: 905, s: sOf(frId, 620), layer: 'front', variant: 0, seed: 81, anim: water ? false : { sway: { k: 0.6 } } });
  if (fr & 2) data.place.push({ obj: frId, x: 1660, y: 910, s: sOf(frId, 580), layer: 'front', variant: 0, seed: 82, flip: true, anim: water ? false : { sway: { k: 0.6 } } });
  // ---- birds overhead
  data.flocks.push({ obj: 'bird.small-flight', n: 7, area: [200, 80, 1400, Math.max(220, H - 170)], speed: 28, s: 0.55, seed: 91, layer: 'far' });
  data.flocks.push({ obj: heath ? 'bird.goose-flight' : 'bird.small-flight', n: 4, area: [100, 140, 1500, Math.max(260, H - 120)], speed: 22, s: 0.6, seed: 92, layer: 'mid' });
  // ---- people: anonymous silhouettes, spread out
  const walkY = Number.isFinite(p.walky) ? p.walky : water === 'canal' ? c1 + 16 : yB + 30;
  const who = paved ? ['person.shopper', 'person.walker', 'person.photographer', 'person.cyclist', 'person.couple', 'person.child-scooter', 'person.student']
    : heath ? ['person.dog-walker', 'person.hiker', 'person.jogger', 'person.walker', 'person.cyclist', 'person.dog-walker', 'person.couple']
      : water === 'canal' ? ['person.walker', 'person.cyclist', 'person.dog-walker', 'person.jogger', 'person.couple', 'person.buggy-walker', 'person.walker']
        : ['person.walker', 'person.dog-walker', 'person.jogger', 'person.buggy-walker', 'person.child-scooter', 'person.couple', 'person.walker'];
  const nw = Number.isFinite(p.walkers) ? Math.min(7, p.walkers) : 5;
  for (let i = 0; i < nw; i++) {
    const id = sceneObj(who[i % who.length]) ? who[i % who.length] : 'person.walker';
    const y = water === 'canal' && i < 2 ? walkY + i * 6 : (water === 'canal' ? yB + 40 : walkY) + (i % 3) * 22, back = i % 2 === 1;
    data.actors.push({ obj: id, layer: i % 3 === 2 && water !== 'canal' ? 'fore' : 'near', path: back ? [[1720, y], [-120, y + 6]] : [[-120, y], [1720, y - 4]], speed: id === 'person.cyclist' ? 40 : id === 'person.jogger' ? 28 : 15 + (i % 3) * 2, loop: 'loop', s: ps(id, y), seed: 100 + i, variant: i % 3, offset: (i * 0.21 + 0.05) % 1, flip: back });
  }
  if (has('sitter') && !heath) data.place.push({ obj: 'person.bench-sitter', x: (Number.isFinite(p.lampx) ? p.lampx : 1260) - 90, y: yB + 14, s: ps('person.bench-sitter', yB + 14), layer: 'near', seed: 110 });
  // ---- reflections (15.2)
  for (const w of data.water) {
    const near = (a, b) => b >= w.y0 - 40 && a <= w.y1 + 40;
    for (const sc of data.scatter) { const b = sc.area && (sc.area.rect || null); if (b && near(b[1], b[3])) sc.reflect = true; }
    for (const pl of data.place) if (pl.layer !== 'front' && near(pl.y, pl.y)) pl.reflect = true;
  }
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('woking-view', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: typeof SCENE_MOMENTS !== 'undefined' ? SCENE_MOMENTS.slice() : ['afternoon'], horizon: 'number',
      setting: ['urban', 'mixed', 'natural'], ground: ['lawn', 'park', 'plaza', 'heath'], water: ['none', 'canal', 'pond'], rail: ['none', 'east', 'west'], boat: ['east', 'west'],
      landmarks: 'list', skyline: 'string', lmy: 'number', trees: 'number', frame: 'number', lampx: 'number', poolx: 'number', moorx: 'number', roady: 'number', walky: 'number', walkers: 'number',
      features: 'list', density: 'number' },
    kits: ['temperate', 'urban', 'people', 'birds', 'boats', 'vehicles'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 600, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchWoking(p, u),
  });
})();
