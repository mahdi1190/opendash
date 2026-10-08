/* ============================================================
   COMPOSED SCENES, area "peaks" (the Peak District): the shared archetype
   (docs/dev/SCENE_ENGINE.md sections 3 and 8). PURE: nothing is built at load.

   _scPeaks.vista(row) turns one data row into scene data: a Peak landscape in
   six depth layers (far hills, the moor or dale sides, fields with dry stone
   walls, the near slope, the foreground, a framing front), the row's own
   signature landmark, water when the row has it (reservoir or river, with
   reflections and the light path), farms and villages in gritstone whose
   windows light at real dusk, sheep, walkers, birds and paragliders.
   Seasons, the live sky and the weather are automatic (season 'auto').
   The rows are in 71-scene-uk-peaks-1.js (one row per view); the pack file
   72-anim-pack-uk-area-peaks.js registers one item per row.

   The places (public sources):
     https://www.peakdistrict.gov.uk/visiting/places-to-visit/stanage-and-north-lees
     https://www.peakdistrict.gov.uk/visiting/miles-without-stiles/mam-tor-landslip
     https://www.nationaltrust.org.uk/visit/peak-district/edale-and-mam-tor
     https://www.english-heritage.org.uk/visit/places/peveril-castle/
     https://www.nationaltrust.org.uk/visit/peak-district/dovedale
     https://www.visitpeakdistrict.com/explore/bakewell
     https://www.stwater.co.uk/wonderful-on-tap/our-reservoirs/upper-derwent-valley/
   ============================================================ */
const _scPeaks = (function () {
  const R = v => Math.round(v);
  const rnd = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  /** Catmull-Rom samples through [[x, y], ...]. */
  const smooth = (pts, n = 6) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const pathOf = pts => 'M' + pts.map(p => R(p[0]) + ' ' + R(p[1])).join('L');
  /** A land band: a seeded skyline round y (amp up and down), closed down to foot. ctrl overrides the seeded points. */
  const band = (seed, y, amp, n = 6, foot = 905, ctrl) => {
    const r = rnd(seed), pts = ctrl ? ctrl.map(p => p.slice()) : [];
    if (!ctrl) for (let i = 0; i <= n; i++) pts.push([-160 + i * 1920 / n, y - amp * (r() * 2 - 1)]);
    return pathOf(smooth(pts)) + `L1760 ${foot}L-160 ${foot}Z`;
  };
  /** A river or lake: a band between two wavy lines. */
  const waterBand = (seed, y0, y1, wob = 6) => {
    const r = rnd(seed), top = [], bot = [];
    for (let i = 0; i <= 6; i++) { const x = -160 + i * 320; top.push([x, y0 + (r() * 2 - 1) * wob]); bot.push([x, y1 + (r() * 2 - 1) * wob]); }
    return pathOf(smooth(top)) + 'L' + smooth(bot).reverse().map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
  };
  /** The scene palette: moor, pasture and far hills by season (nature colours change, section 15.2). */
  const PALETTE = {
    base: { hill: ['#8a9cb2', '#a6b6c6'], far: ['#7c8e8a', '#98a6a0'], moor: ['#7a5e74', '#5a4658', '#94728c'], pasture: ['#74984a', '#5a803a', '#466a2e'], scree: ['#a8a294', '#8a8478'], path: ['#c8b894', '#a8987a'], road: ['#6e6e6a', '#8a8a84'] },
    spring: { moor: ['#7a7450', '#5c5840', '#90885e'], pasture: ['#86ac54', '#68903f', '#4f7232'], far: ['#7e9a82', '#9ab09c'] },
    summer: { moor: ['#7a5e74', '#5a4658', '#94728c'], pasture: ['#74984a', '#5a803a', '#466a2e'], far: ['#748e7c', '#90a696'] },
    autumn: { moor: ['#96683c', '#6e4c2e', '#ac7c4a'], pasture: ['#949250', '#7a7842', '#5e5e34'], far: ['#94886c', '#aca082'], hill: ['#9a96a4', '#b4aebc'] },
    winter: { moor: ['#8e8c86', '#6e6c66', '#aaa8a2'], pasture: ['#9ca290', '#808676', '#64695c'], far: ['#aab0b4', '#c4c8cc'], hill: ['#c4ccd8', '#dde2ea'] },
  };
  const LAYERS = [
    { id: 'horizon', depth: 0.08, haze: 0.6 }, { id: 'far', depth: 0.2, haze: 0.42 }, { id: 'mid', depth: 0.45, haze: 0.18 },
    { id: 'near', depth: 0.75, haze: 0.05 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
  ];
  const ROWS = [];
  /**
   * One Peak view from a row:
   *   id, lat, lon, heading, horizon, at, land ('moor' | 'pasture' | 'dale')
   *   sig: [{ obj, x, y, s, layer }]       the landmark(s): the scene's signature
   *   hills: false | ctrl points            the far skyline (default: seeded)
   *   water: { y0, y1, kind: 'lake' | 'river', layer }
   *   farms: [[x, y, s, variant]]           gritstone farms and cottages (lit windows at dusk)
   *   village: { rect: [x0, y0, x1, y1], n }  a scattered village
   *   walls: number of field walls (pasture) ; sheep: number ; cows: number
   *   woods: { rect, n, obj }               conifer or broadleaf woods
   *   walk: [[x, y], ...]                   the walkers' line ; walkers: number
   *   gliders: number (paragliders over a ridge) ; birds: 'curlew' etc
   *   extra: { place, scatter, actors, flocks, ground, water } appended as is
   */
  function vista(p) {
    const H = p.horizon || 470, land = p.land || 'moor', s0 = p.seed || 100, r = rnd(s0 * 7 + 13);
    const cover = p.cover || (land === 'moor' ? { 'plant.heather': 6, 'plant.grass': 2 } : land === 'dale' ? { 'plant.grass': 5, 'plant.heather': 1 } : { 'plant.grass': 6, 'plant.heather': 0.6 });
    const fill = land === 'moor' ? 'moor' : 'pasture';
    const d = {
      v: 1, id: 'peaks-' + p.id,
      view: { lat: p.lat, lon: p.lon, heading: p.heading || 180, fov: 78, horizon: H, lift: 1 },
      at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, weather: 'live', particles: 'season',
      palette: PALETTE, layers: LAYERS.map(l => Object.assign({}, l)),
      sky: { stars: 200, clouds: { n: p.clouds || 6, y: [40, Math.max(200, H - 170)], speed: 6 }, sunR: 26, moonR: 20 },
      ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], camera: { pan: 0, period: 90 },
    };
    // real-world sizes from the depth ladder: a person's height at y (2.8), and things in proportion to it
    const PH = y => (typeof scenePersonHeight === 'function' ? scenePersonHeight(d.view, y) : 40 + (y - H) * 0.12);
    const k2 = v => Math.round(v * 100) / 100;
    // 1. far hills and the moor tops
    if (p.hills !== false) d.ground.push({ layer: 'horizon', d: band(s0 + 1, H - 34, 34, 5, H + 60, p.hills), fill: { lin: [[0, '@hill.0'], [1, '@hill.1']], y1: H - 90, y2: H + 60 } });
    d.ground.push({ layer: 'far', d: band(s0 + 2, H + 6, 14, 6, H + 140), fill: { lin: [[0, '@far.0'], [1, '@far.1']], y1: H - 20, y2: H + 140 } });
    // 2. the land: mid, near and fore bands
    const yMid = H + 60, yNear = H + 0.45 * (900 - H), yFore = H + 0.72 * (900 - H);
    d.ground.push({ layer: 'mid', d: band(s0 + 3, yMid, 12, 5), fill: { lin: [[0, `@${fill}.2`], [0.5, `@${fill}.0`], [1, `@${fill}.1`]], y1: yMid - 20, y2: 900 } });
    d.ground.push({ layer: 'near', d: band(s0 + 4, yNear, 14, 4), fill: { lin: [[0, `@${fill}.0`], [1, `@${fill}.1`]], y1: yNear - 20, y2: 900 } });
    d.ground.push({ layer: 'fore', d: band(s0 + 5, yFore, 18, 4), fill: { lin: [[0, `@${fill}.0`], [1, `@${fill}.1`]], y1: yFore - 20, y2: 900 } });
    // 3. water: a reservoir or a river through the mid ground
    const W = p.water;
    if (W) {
      d.water.push({ layer: W.layer || 'mid', d: W.d || waterBand(s0 + 6, W.y0, W.y1, W.wob == null ? 5 : W.wob), y0: W.y0, y1: W.y1, base: W.kind === 'river' ? ['#8ab0b4', '#4e7e86', '#2c5058'] : ['#86a8bc', '#4a7890', '#284a5e'], reflect: true, shimmer: W.kind === 'river' ? 34 : 26, lightPath: true });
      d.scatter.push({ obj: { 'plant.reed': 2, 'plant.grass': 3, 'rock.stones': 1 }, layer: W.layer || 'mid', seed: s0 + 7, area: { rect: [-150, W.y1 - 4, 1750, W.y1 + 16] }, n: W.edgeN || 40, minGap: 26, s: [0.22, 0.75], flip: 0.5, variant: 'random', reflect: true, anim: false, mask: { noise: { scale: 200, cut: 0.35 } } });
    }
    // 4. the signature landmark(s)
    for (const [i, sg] of (p.sig || []).entries()) d.place.push(Object.assign({ layer: 'far', seed: 11 + i, anim: false }, sg, sg.reflect == null && W ? { reflect: true } : {}));
    // 5. woods, farms and the village
    if (p.woods) for (const [i, w] of [].concat(p.woods).entries()) d.scatter.push({ obj: w.obj || { 'tree.far-broad': 2, 'tree.distant': 1 }, layer: w.layer || 'far', seed: s0 + 20 + i, area: { rect: w.rect }, n: w.n || 18, minGap: w.gap || 34, s: w.s || [0.16, 0.28], sByY: [[w.rect[1], 0.85], [w.rect[3], 1.15]], flip: 0.5, variant: 'random', tint: { col: '#6a7a5a', k: [0, 0.08] }, anim: false, reflect: !!(W && w.rect[3] >= W.y0 - 40) });
    for (const [i, f] of (p.farms || [[260 + r() * 200, yMid + 18, 1, 0], [1040 + r() * 260, yMid + 8, 1, 2], [700 + r() * 120, H + 26, 1, 1]]).entries()) {
      const fs = k2(PH(f[1]) * 3.4 / 130 * (f[2] || 1));
      d.place.push({ obj: 'building.peak-cottage', x: R(f[0]), y: R(f[1]), s: fs, layer: f[4] || (f[1] < H + 40 ? 'far' : 'mid'), variant: f[3] || 0, flip: i % 2 === 1, seed: 31 + i, reflect: !!W });
      d.place.push({ obj: 'tree.far-broad', x: R(f[0] + (i % 2 ? -1 : 1) * 120 * fs), y: R(f[1] + 2), s: k2(fs * 0.75), layer: f[4] || (f[1] < H + 40 ? 'far' : 'mid'), variant: i % 2, seed: 41 + i, anim: false });
    }
    if (p.village) d.scatter.push({ obj: p.village.obj || { 'building.peak-cottage': 3, 'building.sheffield-terrace': 1 }, layer: p.village.layer || 'mid', seed: s0 + 30, area: { rect: p.village.rect }, n: p.village.n || 12, minGap: p.village.gap || 70, s: p.village.s || [0.32, 0.46], sByY: [[p.village.rect[1], 0.85], [p.village.rect[3], 1.15]], flip: 0.5, variant: 'random', anim: false });
    // 6. ground cover: far, mid, near and fore (wind strips at the foot), boulders and bracken
    d.scatter.push({ obj: cover, layer: 'far', seed: s0 + 40, area: { rect: [-150, H + 14, 1750, H + 56] }, n: p.nFar || 70, minGap: 14, s: [0.2, 0.34], flip: 0.5, variant: [0, 1], anim: false, reflect: !!(W && W.y0 <= H + 100), mask: p.avoidFar ? { avoid: p.avoidFar } : undefined });
    d.scatter.push({ obj: cover, layer: 'mid', seed: s0 + 41, area: { rect: [-150, yMid + 8, 1750, yNear - 6] }, n: p.nMid || 110, minGap: 18, s: [0.36, 0.6], sByY: [[yMid, 0.8], [yNear, 1.2]], flip: 0.5, variant: [2, 3], tint: { col: '#8a7a40', k: [0.1, 0.1] }, anim: false, reflect: !!W, mask: { avoid: [].concat(W ? [{ rect: [-160, W.y0 - 10, 1760, W.y1 + 4] }] : [], p.avoidMid || []), noise: { scale: 240, cut: 0.2 } } });
    const wetNear = false, wetFore = false, wetAvoid = W ? [{ rect: [-160, W.y0 - 6, 1760, W.y1 + 24] }] : [];
    const av = extra => { const a = wetAvoid.concat(extra || []); return a.length ? { avoid: a } : undefined; };
    d.scatter.push({ obj: Object.assign({}, cover, { 'rock.boulder': 0.2 }), layer: 'near', seed: s0 + 42, area: { rect: [-150, yNear + 8, 1750, yFore - 4] }, n: p.nNear || 175, minGap: p.gapNear || 22, s: [0.55, 0.9], sByY: [[yNear, 0.85], [yFore, 1.2]], flip: 0.5, variant: [0, 1], anim: false, reflect: wetNear, mask: av(p.avoidNear) });
    d.scatter.push({ obj: Object.assign({}, cover, { 'rock.boulder': 0.12 }), layer: 'fore', seed: s0 + 43, area: { rect: [-150, yFore + 10, 1750, 905] }, n: p.nFore || 130, minGap: p.gapFore || 28, s: [0.95, 1.6], sByY: [[yFore, 0.9], [900, 1.2]], flip: 0.5, variant: [2, 3], anim: false, reflect: wetFore, mask: av(p.avoidFore) });
    d.scatter.push({ obj: 'plant.bracken', layer: 'fore', seed: s0 + 46, area: { rect: [-150, yFore + 20, 1750, 905] }, n: land === 'pasture' ? 4 : 6, minGap: 110, s: [0.5, 1.2], flip: 0.5, variant: 'random', anim: false, mask: Object.assign({ noise: { scale: 300, cut: 0.4 } }, av(p.avoidFore)) });
    if (land !== 'moor') for (const v of [0, 2]) d.scatter.push({ obj: 'plant.wildflowers', layer: 'near', seed: s0 + 45 + v, area: { rect: [-150, yNear + 8, 1750, 905] }, n: 45, minGap: 36, s: [0.6, 1.1], sByY: [[yNear, 0.8], [900, 1.3]], flip: 0.5, variant: v, tint: v ? { col: '#c8a040', k: [0.1, 0.1] } : undefined, anim: false, mask: av(p.avoidNear) });
    d.scatter.push({ obj: 'plant.grass', layer: 'fore', seed: s0 + 44, area: { rect: [-150, 860, 1750, 905] }, n: 60, minGap: 24, s: [1.3, 1.9], flip: 0.5, variant: [0, 1], tint: { col: '#a09040', k: [0, 0.08] }, anim: 'strip', mask: p.avoidFore ? { avoid: p.avoidFore } : undefined });
    // 7. dry stone walls across the fields
    const nWalls = p.walls == null ? (land === 'pasture' ? 6 : 3) : p.walls;
    for (let i = 0; i < nWalls; i++) {
      const y = R(yMid + 20 + r() * (yNear - yMid - 24)), sc = PH(y) * 0.7 / 62 * (0.55 + r() * 1.0);
      d.place.push({ obj: 'structure.dry-wall', x: R(-100 + r() * 1800), y, s: Math.round(sc * 1.35 * 100) / 100, layer: 'mid', variant: land === 'dale' ? (i % 3 ? 1 : 0) : (i % 3 ? 0 : 1), flip: i % 3 === 1, seed: 51 + i, anim: false, reflect: !!W });
    }
    // 8. sheep (and cattle in the dales), heads turning as they graze
    const nSheep = p.sheep == null ? 8 : p.sheep;
    const flocks = [0, 1, 2].map(() => [120 + r() * 1360, yMid + 30 + r() * (yFore - yMid - 30)]);
    for (let i = 0; i < nSheep; i++) {
      const fc = flocks[i % 3], y = R(Math.min(yFore + 40, Math.max(yMid + 24, fc[1] + (r() * 2 - 1) * 40))), sc = PH(y) * 0.6 / 74 * (0.7 + r() * 0.7);
      d.place.push({ obj: 'animal.sheep', x: R(fc[0] + (r() * 2 - 1) * (90 + i * 13)), y, s: Math.round(sc * 100) / 100, layer: y < yNear ? 'mid' : 'near', variant: i % 4, flip: i % 2 === 1, seed: 61 + i, reflect: !!W });
    }
    for (let i = 0; i < (p.cows || 0); i++) { const y = R(yMid + 40 + r() * 120); d.place.push({ obj: 'animal.cattle', x: R(200 + r() * 1200), y, s: k2(PH(y) * 0.85 / 99), layer: 'mid', variant: i % 4, flip: r() < 0.5, seed: 71 + i }); }
    // 9. walkers on the path (tiny anonymous silhouettes), birds, gliders
    const walk = p.walk || [[-80, yNear + 20], [700, yNear + 6], [1680, yNear + 26]];
    const nWalk = p.walkers == null ? 3 : p.walkers, kinds = ['person.walker', 'person.dog-walker', 'person.jogger', 'person.walker'];
    for (let i = 0; i < nWalk; i++) {
      const back = i % 2 === 1, path = back ? walk.slice().reverse() : walk;
      const yy = (walk[0][1] + walk[walk.length - 1][1]) / 2;
      d.actors.push({ obj: kinds[i % kinds.length], layer: p.walkLayer || 'near', path, speed: 9 + i * 2, loop: 'pingpong', s: typeof scenePersonScale === 'function' ? scenePersonScale(64, yy, d.view) : 0.8, sByY: true, seed: 81 + i, offset: (i * 0.29 + 0.1) % 1 });
    }
    d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [200, 90, 1400, Math.max(200, H - 160)], speed: 26, s: 0.55, seed: 91, layer: 'horizon' });
    d.flocks.push({ obj: 'bird.curlew-flight', n: 3, area: [300, Math.max(160, H - 200), 1300, Math.max(240, H - 90)], speed: 22, s: 1, seed: 92, layer: 'horizon' });
    for (let i = 0; i < (p.gliders || 0); i++) {
      const y = 120 + i * 70 + r() * 40;
      d.actors.push({ obj: 'vehicle.paraglider', layer: 'horizon', path: i % 2 ? [[1700, y], [200, y + 30], [900, y - 20]] : [[-100, y], [1400, y + 20], [600, y - 30]], speed: 14 + i * 3, loop: 'pingpong', s: 0.7 - i * 0.12, variant: i % 3, seed: 95 + i, offset: i * 0.37 });
    }
    // 10. the framing: a gritstone boulder and a hawthorn (or the row's own)
    for (const [i, f] of (p.frame || [{ obj: 'rock.boulder', x: 90, y: 905, s: 1.5, layer: 'front' }, { obj: 'tree.pool-oak', x: 1610, y: 912, s: 1.25, layer: 'front', flip: true }]).entries()) d.place.push(Object.assign({ seed: 101 + i, variant: i % 2, anim: f.obj.startsWith('tree.') ? { sway: { k: 0.7 } } : false }, f));
    // extras, appended
    const X = p.extra || {};
    for (const k of ['ground', 'water', 'place', 'scatter', 'actors', 'flocks']) if (X[k]) d[k].push(...X[k]);
    return d;
  }
  return {
    vista, band, waterBand, smooth, pathOf, rnd, PALETTE,
    /** A view row (71-scene-uk-peaks-1.js); the pack file turns each into an item. */
    row(meta, params) { ROWS.push({ meta, params }); },
    rows() { return ROWS.slice(); },
  };
})();
