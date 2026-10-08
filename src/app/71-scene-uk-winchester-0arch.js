/* ============================================================
   ARCHETYPE chalk-country (docs/dev/SCENE_ENGINE.md 8.1): the repeated scene
   types of the Winchester area builder. PURE. One archetype, five kinds:
     river   a chalk stream through water meadows (the Test, the Itchen): clear
             water with crowfoot beds, trout holding in the current, swans,
             willows and alders on the banks, cattle in the meadow, a landmark beyond
     downs   open chalk downland: a great rounded down, patchwork fields, sheep,
             hawthorn and gorse, a white chalk track with walkers
     rail    downs with the heritage railway on its embankment and a steam train
     cress   the watercress beds of the Alresford springs: long shallow beds and gravel walks
     green   a lawn, close or village green before a building landmark (the
             cathedral Close, the house at Chawton): paths, big trees, benches, lamps
   Rows (71-scene-uk-winchester-*.js) give: id, lat, lon, heading, at, kind,
   landmark (an object id or ''), lx, lh (its height in units), horizon, features
   (sheep cattle farm angler swans trout cottages walkers lamps hedges wildflowers
   heron poppies gate bridge), seed. Every scene: season 'auto', the live sky,
   weather 'live', seasonal particles. Seeds come from the row id.
   ============================================================ */
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  const S = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
  const PAL = {
    base: { downs: ['#93aab0', '#adc0c0'], fieldA: ['#8cae5a', '#7c9e4e'], fieldB: ['#b8b46a', '#a8a45e'], hedge: ['#4e6e3a'], ground: ['#76a044', '#5e8a38', '#4a7230'], meadow: ['#86ae4e', '#6a9440'],
      chalk: ['#ece6d2', '#d6ccb2'], gravel: ['#c8bea4', '#aca288'], bank: ['#6a6040'], lawn: ['#6aa040', '#5a9038', '#80b450'], path: ['#d8ccb0', '#c0b294'] },
    spring: { fieldA: ['#9cc060', '#86b052'], fieldB: ['#d8d060', '#c4bc52'], ground: ['#7eac46', '#64923a', '#4e7a32'], meadow: ['#94bc52', '#76a044'], lawn: ['#74ac44', '#62983a', '#8cc054'] },
    autumn: { fieldA: ['#a8a058', '#948c4c'], fieldB: ['#c0a46a', '#a88a56'], hedge: ['#7a5a2e'], ground: ['#9a9248', '#80783c', '#666030'], meadow: ['#a89c54', '#8a8244'], lawn: ['#8a9a48', '#7a8a40', '#a0aa58'] },
    winter: { downs: ['#9cacb8', '#b8c6cc'], fieldA: ['#8a9478', '#7a8468'], fieldB: ['#a0987e', '#8c846c'], hedge: ['#5a4e42'], ground: ['#8a907a', '#72786a', '#5e6458'], meadow: ['#949a82', '#7c826e'],
      lawn: ['#7c8a6a', '#6c7a5c', '#94a07e'] },
  };
  /** A smooth seeded wavy line across the scene: [[x, y], ...] from x -160 to 1760. */
  const wave = (rnd, y, amp, n) => { const a = rnd() * 6, b = rnd() * 6, f1 = 1 + rnd() * 1.5, f2 = 2.5 + rnd() * 2, pts = []; for (let i = 0; i <= (n || 24); i++) { const t = i / (n || 24), x = -160 + t * 1920; pts.push([Math.round(x), Math.round(y + amp * (Math.sin(t * Math.PI * f1 + a) * .65 + Math.sin(t * Math.PI * f2 + b) * .35))]); } return pts; };
  const L = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
  const band = (top, bot) => L(top) + bot.slice().reverse().map(p => 'L' + p[0] + ' ' + p[1]).join('') + 'Z';
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };

  sceneArchetypeDefine('chalk-country', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: SCENE_AT_MOMENTS, kind: ['river', 'downs', 'rail', 'cress', 'green'],
      lx: 'number', lh: 'number', horizon: 'number', features: 'list', seed: 'number' },
    kits: ['temperate', 'people', 'birds', 'water', 'animals'],
    meta: () => null,
    build: (p, u) => {
      const kind = p.kind || 'river', has = f => (p.features || []).includes(f), r = u.rnd;
      const H = Number.isFinite(p.horizon) ? p.horizon : kind === 'downs' || kind === 'rail' ? 440 : 480;
      const view = { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 78, horizon: H, lift: 1 };
      const ph = y => scenePersonHeight(view, y);   // a person's height at row y
      const metres = (id, m, y) => { const d = sceneObj(id); return d && d.size ? Math.round(ph(y) * m / 1.72 / d.size[1] * 100) / 100 : 1; };
      const ladder = (y0, y1) => { const m = (y0 + y1) / 2; return [[y0, ph(y0) / ph(m)], [y1, ph(y1) / ph(m)]]; };
      const data = {
        v: 1, id: String(p.id), view, at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: kind === 'green' ? 'mixed' : 'natural', signage: false,
        palette: JSON.parse(JSON.stringify(PAL)),
        sky: { stars: 200, clouds: { n: 5, y: [50, Math.max(180, H - 170)], speed: 6 }, sunR: 26, moonR: 20 },
        layers: SCENE_LAYERS_DEFAULT.map(l => Object.assign({}, l)),
        ground: [], water: [], place: [], scatter: [], actors: [], flocks: [],
        particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
      };
      const G = data.ground, W = data.water, P = data.place, SC = data.scatter, A = data.actors;
      // ---- the horizon: the line of the downs, a second nearer ridge, and the patchwork of fields below it
      const ridge1 = wave(r, H - 18, 9), ridge2 = wave(r, H - 6, 12), fl = wave(r, H + 4, 4);
      G.push({ layer: 'horizon', d: L(ridge1) + `L1760 ${H + 60}L-160 ${H + 60}Z`, fill: { lin: [[0, '@downs.0'], [1, '@downs.1']], x1: 0, y1: H - 50, x2: 0, y2: H + 40 } });
      G.push({ layer: 'horizon', d: L(ridge2) + `L1760 ${H + 60}L-160 ${H + 60}Z`, fill: { lin: [[0, '@fieldA.1'], [1, '@fieldA.0']], x1: 0, y1: H - 20, x2: 0, y2: H + 40 } });
      // fields: alternating strips in perspective, hedgerow lines between them
      const fy0 = H + 2, fy1 = H + 70;
      G.push({ layer: 'far', d: `M-160 ${fy0}H1760V${fy1 + 40}H-160Z`, fill: '@fieldA.0' });
      let x = -160, k = 0, fd = '', hd = '';
      while (x < 1760) { const w = 120 + r() * 220, x1 = Math.min(1760, x + w), yA = fy0 + 6 + r() * 20, yB = yA + 14 + r() * 22; if (k++ % 2) fd += `M${Math.round(x)} ${Math.round(yA)}L${Math.round(x1)} ${Math.round(yA - 4)}L${Math.round(x1 + 30)} ${Math.round(yB)}L${Math.round(x - 20)} ${Math.round(yB + 3)}Z`; hd += `M${Math.round(x1)} ${fy0}l${Math.round(30 + r() * 30)} ${fy1 - fy0}h3l${-Math.round(30 + r() * 20)} ${fy0 - fy1}Z`; x = x1; }
      G.push({ layer: 'far', d: fd, fill: '@fieldB.0' }, { layer: 'far', d: hd, fill: '@hedge.0' }, { layer: 'far', d: L(fl) + `L1760 ${fy0 + 6}L-160 ${fy0 + 6}Z`, fill: '@hedge.0' });
      SC.push({ obj: { 'tree.distant': 3, 'tree.far-broad': 2 }, layer: 'far', seed: 11, area: { rect: [-150, fy0 - 2, 1750, fy0 + 52] }, n: 18, minGap: 34, s: [0.18, 0.46], variant: [0, 2], anim: false, mask: { noise: { scale: 200, cut: 0.35 }, avoid: p.landmark && kind !== 'downs' && kind !== 'rail' ? [{ rect: [p.lx - 220, fy0 - 20, p.lx + 220, fy0 + 40] }] : [] } });
      // ---- the main ground bands
      const midTop = wave(r, H + 70, 8), nearTop = wave(r, H + 200, 10);
      G.push({ layer: 'mid', d: L(midTop) + 'L1760 900L-160 900Z', fill: { lin: [[0, kind === 'green' ? '@lawn.2' : '@meadow.0'], [1, kind === 'green' ? '@lawn.0' : '@meadow.1']], x1: 0, y1: H + 60, x2: 0, y2: 900 } });
      G.push({ layer: 'near', d: L(nearTop) + 'L1760 900L-160 900Z', fill: { lin: [[0, kind === 'green' ? '@lawn.0' : '@ground.0'], [1, kind === 'green' ? '@lawn.1' : '@ground.2']], x1: 0, y1: H + 190, x2: 0, y2: 900 } });
      // ---- the landmark
      const lm = p.landmark && sceneObj(p.landmark) ? p.landmark : null, lx = Number.isFinite(p.lx) ? p.lx : 800;
      let wy0 = 0, wy1 = 0;
      // ---- kinds
      if (kind === 'river') {
        wy0 = H + 130; wy1 = H + 210;
        const top = wave(r, wy0, 10), bot = wave(r, wy1, 12);
        G.push({ layer: 'mid', d: band(top.map(q => [q[0], q[1] - 8]), bot.map(q => [q[0], q[1] + 10])), fill: '@bank.0' });
        W.push({ layer: 'mid', d: band(top, bot), y0: wy0 - 12, y1: wy1 + 14, base: ['#a8ccc4', '#5e9e98', '#2e6a6a'], reflect: true, shimmer: 26, lightPath: true });
        SC.push({ obj: 'plant.water-crowfoot', layer: 'mid', seed: 21, area: { rect: [-150, wy0 + 14, 1750, wy1 - 8] }, n: 18, minGap: 44, s: [0.7, 1.3], sByY: [[wy0, 0.7], [wy1, 1.3]], variant: [0, 1], anim: false, tint: { col: '#c0b060', k: [0, 0.1] } });
        // banks: willows and alders (mirrored), reeds and bulrushes along both edges
        SC.push({ obj: { 'tree.green-willow': 2, 'tree.green-alder': 3 }, layer: 'mid', seed: 22, area: { rect: [-150, wy0 - 18, 1750, wy0 - 4] }, n: 8, minGap: 110, s: [0.4, 0.62], variant: [0, 1], reflect: true, anim: false,
          mask: { avoid: lm ? [{ rect: [lx - 200, wy0 - 40, lx + 200, wy0 + 10] }] : [] } });
        SC.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 23, area: { rect: [-150, wy0 - 8, 1750, wy0 + 2] }, n: 36, minGap: 22, s: [0.35, 0.55], variant: [0, 1], reflect: true, anim: 'strip', tint: { col: '#a09050', k: [0, 0.1] } });
        SC.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.grass': 2 }, layer: 'near', seed: 24, area: { rect: [-150, wy1 + 4, 1750, wy1 + 20] }, n: 64, minGap: 14, s: [0.6, 0.9], variant: [0, 1], reflect: true, anim: 'strip', tint: { col: '#a09050', k: [0, 0.1] } });
        // life on the water: trout holding, swans and mallards drifting
        for (let i = 0; i < 3; i++) { const y = wy0 + 26 + i * 14, x0 = 200 + ((i * 397) % 1100); A.push({ obj: 'animal.trout', layer: 'mid', path: [[x0, y], [x0 + 30 + i * 8, y + 2]], speed: 2.5, loop: 'pingpong', s: 0.9 + i * 0.15, seed: 31 + i, variant: i % 2, offset: i * 0.23 }); }
        const sw = [['bird.swan', 0.5], ['bird.swan', 0.46], ['bird.mallard', 0.42], ['bird.moorhen', 0.36]];
        sw.forEach(([id, s], i) => { const y = wy0 + 20 + (i % 3) * 18, x0 = 150 + i * 290; A.push({ obj: id, layer: 'mid', path: [[x0, y], [x0 + 120 + i * 20, y + 4]], speed: 4 + i * .4, loop: 'pingpong', s, seed: 41 + i, variant: i % 2, offset: (i * .31) % 1, flip: !!(i % 2) }); });
        if (has('heron')) P.push({ obj: 'bird.heron', x: 1240, y: wy1 + 6, s: 0.62, layer: 'near', seed: 48, reflect: true });
        if (has('angler')) P.push({ obj: 'person.angler', x: 420, y: wy1 + 18, s: scenePersonScale(sceneObj('person.angler').size[1], wy1 + 18, view), layer: 'near', seed: 49, reflect: true });
        if (has('cattle')) SC.push({ obj: 'animal.cattle', layer: 'mid', seed: 25, area: { rect: [-100, H + 80, 1700, H + 122] }, n: 7, minGap: 90, s: [metres('animal.cattle', 1.5, H + 100) * .7, metres('animal.cattle', 1.5, H + 100) * 1.4], sByY: ladder(H + 80, H + 122), variant: [0, 1], mask: { noise: { scale: 220, cut: 0.35 }, avoid: lm ? [{ rect: [lx - 220, H, lx + 220, H + 130] }] : [] } });
        if (has('bridge')) P.push({ obj: 'structure.bridge-brick', x: 1320, y: wy1 + 4, s: 0.5, layer: 'mid', seed: 47, reflect: true });
      }
      if (kind === 'downs' || kind === 'rail') {
        // the down's flank in front of the fields; a white chalk track climbing it
        const flank = wave(r, H + 120, 30);
        G.push({ layer: 'mid', d: L(flank) + 'L1760 900L-160 900Z', fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: H + 90, x2: 0, y2: 900 } });
        G.push({ layer: 'mid', d: `M${lx - 40} ${H + 130}Q${lx + 140} ${H + 220} ${lx - 60} ${H + 320}Q${lx - 260} ${H + 420} ${lx + 120} 905H${lx + 230}Q${lx - 160} ${H + 420} ${lx - 30} ${H + 322}Q${lx + 180} ${H + 222} ${lx - 26} ${H + 130}Z`, fill: { lin: [[0, '@chalk.1'], [1, '@chalk.0']], x1: 0, y1: H + 130, x2: 0, y2: 900 } });
        SC.push({ obj: 'animal.sheep', layer: 'mid', seed: 26, area: { rect: [-140, H + 140, 1740, H + 230] }, n: 12, minGap: 60, s: [metres('animal.sheep', 0.9, H + 185) * .9, metres('animal.sheep', 0.9, H + 185) * 1.1], sByY: ladder(H + 140, H + 230), variant: [0, 1], tint: { col: '#8a7a60', k: [0, 0.1] }, mask: { noise: { scale: 260, cut: 0.4 }, avoid: [{ rect: [lx - 120, H + 120, lx + 200, H + 260] }] } });
        SC.push({ obj: 'animal.sheep', layer: 'near', seed: 27, area: { rect: [-140, H + 250, 1740, H + 330] }, n: 5, minGap: 140, s: [metres('animal.sheep', 0.9, H + 290) * .9, metres('animal.sheep', 0.9, H + 290) * 1.1], variant: [0, 1], tint: { col: '#8a7a60', k: [0, 0.1] }, mask: { avoid: [{ rect: [lx - 300, H + 240, lx + 340, 900] }] } });
        { const rb = metres('animal.rabbit', 0.25, H + 300); [[-560, 0, 1], [-521, 13, 1.22], [-618, 34, 1.4], [430, 4, .86], [476, 44, 1.38], [705, 72, 1.62], [-330, 96, 1.75], [262, 120, 1.9]].slice(0, kind === 'rail' ? 8 : 6).forEach(([dx, dy, k], j) => P.push({ obj: 'animal.rabbit', x: ((lx + dx + 160 + 1920) % 1920) - 160, y: H + 300 + dy, s: Math.round(rb * k * 100) / 100, layer: 'near', seed: 140 + j, variant: j % 2, flip: j % 3 === 0 })); }
        SC.push({ obj: { 'plant.gorse': 2, 'plant.shrub': 2 }, layer: 'mid', seed: 28, area: { rect: [-150, H + 124, 1750, H + 236] }, n: 22, minGap: 40, s: [0.22, 0.6], sByY: ladder(H + 128, H + 220), variant: [0, 2], anim: false, mask: { noise: { scale: 150, cut: 0.3 }, avoid: [{ rect: [lx - 100, H + 110, lx + 180, H + 220] }] } });
        if (kind === 'rail') {
          const ry = H + 236, sE = 0.62;
          const rt = ry - 64 * sE;
          G.push({ layer: 'mid', d: `M-160 ${ry}L-160 ${rt + 8}Q800 ${rt + 4} 1760 ${rt + 8}L1760 ${ry}Z`, fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], x1: 0, y1: rt, x2: 0, y2: ry } },
            { layer: 'mid', d: `M-160 ${rt + 8}L-160 ${rt - 1}H1760V${rt + 8}Z`, fill: '@gravel.1' }, { layer: 'mid', d: `M-160 ${rt - 3}H1760V${rt - 1}H-160Z`, fill: '#6a6460' }, { layer: 'mid', d: `M-160 ${rt + 2}H1760V${rt + 4}H-160Z`, fill: '#8a8480' });
          SC.push({ obj: { 'plant.shrub': 2, 'plant.hedge': 1, 'plant.bracken': 1 }, layer: 'mid', seed: 61, area: { rect: [-150, ry - 6, 1750, ry + 4] }, n: 16, minGap: 70, s: [0.3, 0.55], variant: [0, 1], anim: false, tint: { col: '#6a5a30', k: [0, 0.1] }, mask: { noise: { scale: 240, cut: 0.35 } } });
          A.push({ obj: 'rail.steam-train', layer: 'mid', path: [[-520, ry - 64 * sE + 1], [2120, ry - 64 * sE + 1]], speed: 30, loop: 'loop', s: 0.62, seed: 66, variant: has('black') ? 1 : 0, offset: 0.42 });
        }
      }
      if (kind === 'cress') {
        // long shallow beds of spring water receding to the far hedge, gravel walks between them
        for (let i = 0; i < 5; i++) {
          const y0 = H + 90 + i * i * 9 + i * 34, y1 = y0 + 18 + i * 10, sk = 40 + i * 30;
          G.push({ layer: i < 2 ? 'mid' : 'near', d: `M-160 ${y0 - 6}H1760V${y1 + 6}H-160Z`, fill: '@gravel.' + (i % 2) });
          W.push({ layer: i < 2 ? 'mid' : 'near', d: `M${-160} ${y0}L${1760} ${y0}L${1760} ${y1}L${-160} ${y1}Z`, y0, y1, base: ['#b8dcd4', '#78b4ac', '#3e7e7c'], reflect: i === 0, shimmer: i < 2 ? 10 : 0, lightPath: i === 1 });
          SC.push({ obj: 'plant.watercress', layer: i < 2 ? 'mid' : 'near', seed: 70 + i, area: { rect: [-150, y0 + 4, 1750, y1 - 1] }, n: 40 + i * 10, minGap: 9 + i * 5, s: [0.5 + i * .25, 0.8 + i * .3], variant: [0, 1], anim: false, reflect: i === 0, tint: { col: '#a0b040', k: [0, 0.1] }, mask: { noise: { scale: 120, cut: 0.15 } } });
          if (i === 2) wy1 = y1;
        }
        A.push({ obj: 'bird.heron', layer: 'near', path: [[1180, H + 250], [1200, H + 252]], speed: 1, loop: 'pingpong', s: 0.6, seed: 77 });
        A.push({ obj: 'bird.moorhen', layer: 'mid', path: [[300, H + 115], [420, H + 117]], speed: 4, loop: 'pingpong', s: 0.3, seed: 78 });
        A.push({ obj: 'bird.mallard', layer: 'near', path: [[700, H + 196], [860, H + 198]], speed: 4, loop: 'pingpong', s: 0.4, seed: 79, offset: 0.5 });
      }
      if (kind === 'green') {
        // the lawn, the gravel paths to the landmark, lime and oak trees, benches and lamps
        G.push({ layer: 'near', d: `M${lx - 40} ${H + 150}L${lx + 40} ${H + 150}L${lx + 330} 905H${lx - 330}Z`, fill: { lin: [[0, '@path.1'], [1, '@path.0']], x1: 0, y1: H + 150, x2: 0, y2: 900 } });
        G.push({ layer: 'mid', d: `M-160 ${H + 156}H1760V${H + 168}H-160Z`, fill: '@path.1' });
        SC.push({ obj: { 'tree.green-oak': 2, 'tree.green-chestnut': 2, 'tree.green-alder': 1 }, layer: 'mid', seed: 81, area: { rect: [-150, H + 140, 1750, H + 150] }, n: 7, minGap: 170, s: [0.5, 0.7], variant: [0, 1], anim: false, mask: { avoid: [{ rect: [lx - (p.lh || 300) * 1.4, H, lx + (p.lh || 300) * 1.4, H + 160] }] } });
        for (const [x, f] of [[lx - 220, false], [lx + 220, true]]) P.push({ obj: 'street.bench', x, y: H + 260, s: 0.8, layer: 'near', seed: 82 + (f ? 1 : 0), flip: f });
        for (const x of [lx - 380, lx + 380, -40, 1640]) P.push({ obj: 'street.lamp', x, y: H + 236, s: 0.7, layer: 'near', seed: 84 + Math.round(x) % 7 });
        A.push({ obj: 'person.couple', layer: 'near', path: [[lx + 30, H + 200], [lx + 150, H + 380]], speed: 5, loop: 'pingpong', s: scenePersonScale(sceneObj('person.couple').size[1], H + 290, view), sByY: ladder(H + 200, H + 380), seed: 86, offset: 0.3 });
        P.push({ obj: 'person.bench-sitter', x: lx - 220, y: H + 262, s: scenePersonScale(sceneObj('person.bench-sitter').size[1], H + 262, view), layer: 'near', seed: 88 });
        A.push({ obj: 'bird.pigeon', layer: 'near', path: [[lx - 120, H + 300], [lx - 60, H + 304]], speed: 3, loop: 'pingpong', s: 0.5, seed: 87 });
      }
      // ---- the landmark itself (after the kinds: it stands on their ground)
      if (lm) {
        const d = sceneObj(lm), nat = (d.tags || []).includes('natural');
        const y = Number.isFinite(p.ly) ? p.ly : kind === 'river' && /mill/.test(lm) ? (wy0 + wy1) / 2 + 6 : nat ? H + 40 : kind === 'green' ? H + 150 : H + 66;
        P.push({ obj: lm, x: lx, y, s: sOf(lm, p.lh || 220), layer: nat ? 'far' : 'mid', seed: 5, reflect: kind === 'river' });
      }
      // ---- cottages and a farm (they light at dusk)
      if (has('cottages') || has('farm')) {
        const xs = has('farm') ? [lx > 800 ? 260 : 1340, lx > 800 ? 380 : 1460] : [lx > 800 ? 200 : 1300, lx > 800 ? 420 : 1520];
        xs.forEach((cx, i) => P.push({ obj: 'building.cottage', x: cx, y: H + 82 + i * 3, s: 0.36 + i * 0.03, layer: 'mid', seed: 90 + i, variant: i % 3, flip: !!(i % 2) }));
      }
      // ---- dense ground cover: grass and flowers in near and fore (static, free per frame), wind strips in front
      const cy0 = kind === 'river' ? wy1 + 18 : kind === 'cress' ? wy1 + 10 : H + 200;
      const flowers = has('wildflowers') || has('poppies') ? { 'plant.wildflowers': 2, 'plant.grass': 3 } : { 'plant.grass': 3, 'plant.wildflowers': 1 };
      SC.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'mid', seed: 101, area: { rect: [-150, H + 76, 1750, Math.max(H + 120, cy0 - 70)] }, n: 60, minGap: 13, s: [0.22, 0.4], sByY: ladder(H + 76, cy0), variant: [0, 1], anim: false,
        mask: { avoid: [kind === 'river' ? { rect: [-160, wy0 - 14, 1760, wy1 + 12] } : { rect: [0, 0, 1, 1] }, kind === 'green' ? { rect: [lx - 70, H + 140, lx + 70, H + 220] } : { rect: [0, 0, 1, 1] }] } });
      SC.push({ obj: flowers, layer: 'near', seed: 102, area: { rect: [-150, cy0, 1750, Math.min(820, cy0 + 220)] }, n: kind === 'river' ? 170 : 210, minGap: 10, s: [0.5, 0.8], sByY: ladder(cy0, Math.min(820, cy0 + 220)), variant: [0, 1], anim: false,
        mask: { avoid: kind === 'green' ? [{ poly: [[lx - 50, H + 150], [lx + 50, H + 150], [lx + 340, 905], [lx - 340, 905]] }] : [] } });
      SC.push({ obj: flowers, layer: 'fore', seed: 103, area: { rect: [-150, 800, 1750, 900] }, n: kind === 'river' ? 110 : 130, minGap: 13, s: [0.9, 1.25], variant: [0, 1], anim: false, tint: { col: '#b0a050', k: [0, 0.1] } });
      SC.push({ obj: 'plant.grass', layer: 'front', seed: 104, area: { rect: [-160, 878, 1760, 906] }, n: 50, minGap: 16, s: [1.3, 1.8], variant: [0, 1], anim: 'strip' });
      if (has('hedges')) SC.push({ obj: { 'plant.hedge': 2, 'plant.shrub': 2 }, layer: 'near', seed: 105, area: { rect: [-150, cy0 + 2, 1750, cy0 + 26] }, n: 10, minGap: 40, s: [0.35, 0.85], sByY: ladder(cy0, cy0 + 26), variant: [0, 1], anim: false, mask: { noise: { scale: 130, cut: 0.3 }, avoid: kind === 'green' || kind === 'downs' || kind === 'rail' ? [{ rect: [lx - 380, cy0 - 10, lx + 380, cy0 + 30] }] : [] } });
      // framing trees, left and right
      P.push({ obj: kind === 'river' ? 'tree.green-willow' : 'tree.green-oak', x: -40, y: 900, s: sOf(kind === 'river' ? 'tree.green-willow' : 'tree.green-oak', 560), layer: 'front', seed: 111, anim: false });
      P.push({ obj: kind === 'downs' || kind === 'rail' ? 'tree.green-oak' : 'tree.green-alder', x: 1680, y: 904, s: sOf(kind === 'downs' || kind === 'rail' ? 'tree.green-oak' : 'tree.green-alder', 480), layer: 'front', seed: 112, flip: true, anim: false });
      if (has('gate')) P.push({ obj: 'structure.field-gate', x: 1380, y: cy0 + 40, s: 0.7, layer: 'near', seed: 113 });
      // ---- walkers on the path through the near ground (anonymous silhouettes, spread out)
      const walkers = ['person.hiker', 'person.dog-walker', 'person.walker', 'person.elderly-couple', 'person.jogger'].filter(id => sceneObj(id));
      const yw = kind === 'river' || kind === 'cress' ? cy0 + 40 : H + 240;
      const nw = has('walkers') ? 3 : 2;
      for (let i = 0; i < nw && walkers.length; i++) {
        const id = walkers[i % walkers.length], y = yw + (i % 2) * 22, back = i % 2 === 1;
        A.push({ obj: id, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 14 + i * 3, loop: 'loop', s: scenePersonScale(sceneObj(id).size[1], y, view), seed: 120 + i, offset: (i * 0.27 + 0.1) % 1, flip: back });
      }
      // ---- birds: rooks and small birds over the fields, a skein of geese higher up
      data.flocks.push({ obj: 'bird.small-flight', n: 7, area: [160, 90, 1440, Math.max(220, H - 150)], speed: 26, s: 0.5, seed: 131, layer: 'far' });
      data.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [300, 60, 1300, 200], speed: 20, s: 0.45, seed: 132, layer: 'far' });
      // reflections (15.2): everything within 40 units of a water area's band mirrors in it
      for (const w of W.filter(w => w.reflect)) { const near = (a, b) => b >= w.y0 - 40 && a <= w.y1 + 40;
        for (const e of SC) { const b = e.area && e.area.rect; if (b && near(b[1], b[3])) e.reflect = true; }
        for (const e of P) if (near(e.y, e.y)) e.reflect = true; }
      return data;
    },
  });
})();
