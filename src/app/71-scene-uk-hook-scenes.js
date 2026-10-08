/* ============================================================
   COMPOSED SCENES: the Hook area, Hampshire. Six views, six real places,
   each composed for its own spot (docs/dev/SCENE_ENGINE.md 3 and 8).
   Scenes are DATA (PURE): each one is a thunk that returns its own
   layout, so no two share a camera or a composition.

   The list of distinct locations (one scene each):
     1. hook-london-road      London Road, Hook: one-point perspective down the
                              high street from the crossroads, shopfronts both
                              sides, the Georgian coaching inn at the far end
     2. hook-platform         Hook station: from the platform looking along the
                              main line, a train on the through road, the station
                              building across the tracks
     3. greywell-tunnel       The Greywell Tunnel: a low view from the towpath on
                              the east bank, the portal in the left third, the
                              canal running in toward the bat roost
     4. odiham-castle-hill    Odiham Castle from the high meadow above
                              North Warnborough: an elevated panorama over the
                              canal, the keep on the far bank
     5. butter-wood-ride     Butter Wood: a woodland ride looking UP the trees
                              to a slot of sky, bluebells on the verges
     6. whitewater-footbridge The River Whitewater at Greywell: a chalk stream
                              seen from a plank footbridge, watercress beds, the
                              brick packhorse bridge downstream
   Removed in this pass (same spot or templated): the dusk and evening copies
   (the dusk look is automatic in every scene), and the fields by the main line,
   Hook Common and North Warnborough canal rows of the first pass.

   Registered by 72-anim-pack-uk-area-hook.js (pack 'uk-area-hook').
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || typeof _hookArch === 'undefined') return;
  const PACK = 'uk-area-hook';
  const CL = (v, a, b) => Math.max(a, Math.min(b, v));
  // the palette of the area (70-scene-lib-area-hook.js) plus the built-town colours used by these views
  const EXTRA = { brick: ['#8e4a34', '#6c3626', '#a85c42'], slate: ['#4e5258', '#3a3e44'], render: ['#d8ccb0', '#bcae92'], shop: ['#2e5a6a', '#8a3a2e', '#c8a040'], steel: ['#4e5a58', '#38423f'], trim: ['#e8e4d8', '#c8c4b8'], glass: ['#2a3a40', '#4a5e66'], plank: ['#8a6a44', '#6e5234', '#a08056'], dark: ['#1e2420', '#2c3430'], cress: ['#3e7a3a', '#2e6030'], shadow: ['#20302a'], reedy: ['#5a7a3a', '#48662e'] };
  const LAYERS = () => [{ id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }];
  /** The scene shell: the view, the sky, the empty layers. The horizon is the camera height. */
  function shell(id, v, setting) {
    const pal = JSON.parse(JSON.stringify(_hookArch.palette));
    Object.assign(pal.base, EXTRA);
    const H = v.horizon;
    return {
      v: 1, id, view: { lat: v.lat, lon: v.lon, heading: v.heading, fov: v.fov || 78, horizon: H, lift: v.lift || 1 },
      at: v.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette: pal,
      layers: LAYERS(), sky: { stars: 200, clouds: { n: v.clouds || 4, y: [40, Math.max(120, H - 120)], speed: v.cloudSpeed || 5 }, sunR: 24, moonR: 18 },
      ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], signs: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
    };
  }
  /** A person's scale at their ground height (the scene's own perspective). */
  const ppl = (d, id, y) => scenePersonScale((sceneObj(id) || { size: [30, 64] }).size[1], y, d.view);
  const ground = (d, layer, path, fill) => d.ground.push({ layer, d: path, fill });
  const finish = (d) => { if (!d.water.length) delete d.water; if (!d.signs.length) delete d.signs; return d; };

  /* ---------- 1. Hook: London Road, looking down the high street ---------- */
  function londonRoad() {
    const d = shell('hampshire-hook-london-road', { lat: 51.2786, lon: -0.9618, heading: 20, horizon: 430, at: 'afternoon', clouds: 3 }, 'urban');
    const VX = 830, K = 540;
    // the road and the two pavements converge on the vanishing point; the kerbs run straight to it
    ground(d, 'near', 'M-160 905L560 540L1040 540L1760 905Z', { lin: [[0, '@road.1'], [1, '@road.0']], y1: 540, y2: 905 });
    ground(d, 'near', 'M-160 640L560 520L560 540L-160 905Z', '@pave.0');
    ground(d, 'near', 'M1760 650L1040 520L1040 540L1760 905Z', '@pave.1');
    ground(d, 'mid', 'M-160 640L560 520V528L-160 648Z', '@pave.1');   // the building line kerb
    ground(d, 'mid', 'M1760 650L1040 520V528L1760 658Z', '@pave.1');
    ground(d, 'horizon', 'M-160 240H1760V440H-160Z', '@wood.1');
    ground(d, 'far', 'M-160 404H1760V540H-160Z', { lin: [[0, '@render.0'], [1, '@render.1']], y1: 404, y2: 520 });   // the far facades (flat) behind the shop line
    // the Georgian inn closes the view: landmark, right of the vanishing point
    d.place.push({ obj: 'landmark.hook-coaching-inn', x: 1010, y: 520, s: 0.74, layer: 'far', seed: 3 });
    // the shop line: fronts in perspective, each nearer one bigger
    const shops = [[-120, 634, 1.0, 1], [120, 603, 0.7, 0], [330, 569, 0.52, 1], [1700, 642, 1.0, 0], [1460, 599, 0.72, 1], [1270, 563, 0.55, 0], [1120, 538, 0.42, 1]];
    shops.forEach(([x, y, s, f], i) => d.place.push({ obj: 'building.shopfront', x, y, s, flip: !!f, variant: i % 3, layer: s > 0.8 ? 'near' : 'mid', seed: 10 + i, anim: false }));
    d.place.push({ obj: 'building.townhouse', x: 500, y: 540, s: 0.4, variant: 1, layer: 'mid', seed: 20, anim: false });
    // the street furniture: one lamp post and the bus stop nearest the camera
    d.place.push({ obj: 'street.lamp', x: 452, y: 556, s: 0.62, layer: 'mid', seed: 21 });
    d.place.push({ obj: 'street.bollard', x: 40, y: 880, s: 1.5, layer: 'fore', seed: 22, anim: false });
    d.place.push({ obj: 'street.bench', x: 1560, y: 868, s: 1.3, layer: 'fore', seed: 23, anim: false });
    // trees pushed up above the roof line, far behind the inn
    d.scatter.push({ obj: { 'tree.plane': 2, 'plant.shrub': 4, 'plant.hedge': 3, 'tree.bank-distant': 1 }, layer: 'far', seed: 24, area: { rect: [-150, 300, 1750, 420] }, n: 14, minGap: 60, s: [0.3, 0.46], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ rect: [860, 380, 1160, 560] }] } });
    // paving detail: the kerb and the slab joints, a few planters at the shop doors, leaves in the gutter
    d.scatter.push({ obj: { 'ground.leaves': 2, 'ground.puddle': 1 }, layer: 'near', seed: 26, area: { poly: [[-160, 905], [560, 540], [1040, 540], [1760, 905]] }, n: 90, minGap: 14, s: [0.6, 0.9], sByY: [[560, 0.5], [905, 1.0]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] }, mask: { noise: { scale: 140, cut: 0.25 } } });
    d.scatter.push({ obj: { 'ground.leaves': 3, 'ground.puddle': 1 }, layer: 'fore', seed: 25, tint: { col: '#6a8a4a', k: [0, 0.14] }, area: { poly: [[-160, 905], [560, 540], [740, 540], [-20, 905]] }, n: 26, minGap: 40, s: [0.6, 0.9], flip: 0.5, variant: [0, 1], anim: false });
    // life: a bus up the road, a car behind it, a cyclist, shoppers and a dog walker on the pavements
    d.actors.push({ obj: 'vehicle.bus', layer: 'near', path: [[1900, 760], [-300, 700]], speed: 34, loop: 'loop', s: 0.9, seed: 30, offset: 0.1 });
    d.actors.push({ obj: 'vehicle.car', layer: 'mid', path: [[-200, 600], [1700, 580]], speed: 26, loop: 'loop', s: 0.7, seed: 31, offset: 0.55, variant: 1 });
    d.actors.push({ obj: 'person.cyclist', layer: 'near', path: [[1800, 830], [-200, 760]], speed: 22, loop: 'loop', s: ppl(d, 'person.cyclist', 800), seed: 32, offset: 0.4, flip: true });
    d.actors.push({ obj: 'person.shopper', layer: 'near', path: [[-60, 830], [480, 596]], speed: 6, loop: 'pingpong', s: ppl(d, 'person.shopper', 800), sByY: true, seed: 33, offset: 0.2 });
    d.actors.push({ obj: 'vehicle.car-city', layer: 'mid', path: [[1700, 600], [-260, 620]], speed: 18, loop: 'loop', s: 0.62, seed: 43, offset: 0.3, flip: true });
    d.actors.push({ obj: 'person.student', layer: 'near', path: [[-80, 760], [520, 560]], speed: 5, loop: 'pingpong', s: ppl(d, 'person.student', 760), sByY: true, seed: 44, offset: 0.7 });
    d.actors.push({ obj: 'vehicle.taxi', layer: 'mid', path: [[-260, 640], [1700, 610]], speed: 22, loop: 'loop', s: 0.6, seed: 38, offset: 0.8, variant: 0 });
    d.actors.push({ obj: 'person.jogger', layer: 'near', path: [[-60, 880], [1500, 620]], speed: 9, loop: 'pingpong', s: ppl(d, 'person.jogger', 800), sByY: true, seed: 39, offset: 0.5 });
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: [[1660, 700], [1170, 560]], speed: 5, loop: 'pingpong', s: ppl(d, 'person.dog-walker', 700), sByY: true, seed: 34, offset: 0.6, flip: true });
    d.place.push({ obj: 'person.cafe-goer', x: 1330, y: 618, s: ppl(d, 'person.cafe-goer', 618), layer: 'mid', seed: 35, anim: false });
    d.place.push({ obj: 'person.bench-sitter', x: 1540, y: 856, s: ppl(d, 'person.bench-sitter', 856), layer: 'fore', seed: 36, anim: false });
    d.flocks.push({ obj: 'bird.pigeon', n: 6, area: [560, 760, 1100, 840], speed: 2, s: 0.8, seed: 37, layer: 'near' });
    // the pavement cover: planters, bollards and the leaves along the kerbs (tinted and sized by depth)
    d.scatter.push({ obj: { 'plant.planter': 2, 'plant.grass': 1, 'street.bollard': 0.3, 'street.bench': 0.2 }, layer: 'near', seed: 41, area: { poly: [[-160, 640], [560, 520], [560, 540], [-160, 905]] }, n: 70, minGap: 18, s: [0.5, 1.0], sByY: [[640, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] }, mask: { noise: { scale: 120, cut: 0.3 } } });
    d.scatter.push({ obj: { 'plant.planter': 2, 'plant.grass': 1, 'street.bollard': 0.3, 'street.bench': 0.2 }, layer: 'near', seed: 42, area: { poly: [[1760, 650], [1040, 520], [1040, 540], [1760, 905]] }, n: 70, minGap: 18, s: [0.5, 1.0], sByY: [[650, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] }, mask: { noise: { scale: 120, cut: 0.3 } } });
    return finish(d);
  }

  /* ---------- 2. Hook station: along the platform, a train on the through road ---------- */
  function platform() {
    const d = shell('hampshire-hook-platform', { lat: 51.2800, lon: -0.9614, heading: 250, horizon: 400, at: 'morning', clouds: 4 }, 'urban');
    // the far side: embankment with grass, the through road and the second line, both on ballast
    ground(d, 'horizon', 'M-160 366H1760V404H-160Z', '@wood.0');
    d.scatter.push({ obj: { 'plant.shrub': 3, 'plant.hedge': 1, 'tree.birch': 0.4 }, layer: 'horizon', seed: 39, area: { rect: [-150, 362, 1750, 400] }, n: 10, minGap: 80, s: [0.3, 0.46], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ rect: [1020, 300, 1400, 480] }] } });
    ground(d, 'far', 'M-160 400H1760V450H-160Z', '@wood.1');
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1, 'plant.shrub': 0.5 }, layer: 'far', seed: 40, area: { rect: [-150, 404, 1750, 446] }, n: 60, minGap: 16, s: [0.3, 0.55], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ rect: [1020, 300, 1400, 480] }] } });
    ground(d, 'mid', 'M-160 452H1760V500H-160Z', { lin: [[0, '@gravel.1'], [1, '@gravel.0']], y1: 452, y2: 500 });
    for (const y of [462, 476]) ground(d, 'mid', `M-160 ${y}H1760V${y + 3}H-160Z`, '#5a5450');
    ground(d, 'mid', 'M-160 490H1760V492H-160Z', '#9a9488');
    // the station building across the lines: the brick block with its canopy, to the right
    d.place.push({ obj: 'landmark.hook-station', x: 1200, y: 452, s: 1.12, layer: 'mid', seed: 41 });
    // the platform: a long perspective slab from the near corner, the yellow edge along the track
    ground(d, 'near', 'M-160 905L-160 620L1760 556L1760 905Z', { lin: [[0, '@pave.1'], [1, '@pave.0']], y1: 556, y2: 905 });
    ground(d, 'near', 'M-160 620L1760 556L1760 566L-160 632Z', '#e6d36a');
    // the near track bed in front of the platform edge
    ground(d, 'near', 'M-160 632L1760 566L1760 580L-160 646Z', '@gravel.0');
    d.actors.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[-900, 486], [2500, 486]], speed: 92, loop: 'loop', s: 0.95, seed: 42, offset: 0.35, variant: 1 });
    d.actors.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[2500, 470], [-900, 470]], speed: 70, loop: 'loop', s: 0.85, seed: 43, offset: 0.8, variant: 4, flip: true });
    // the platform furniture: a canopy bay over the far end, the station clock, one lamp, and benches
    d.place.push({ obj: 'rail.canopy', x: 1040, y: 560, s: 0.9, layer: 'near', seed: 44, anim: false });
    d.place.push({ obj: 'street.station-clock', x: 780, y: 626, s: 0.84, layer: 'near', seed: 45, anim: false });
    d.place.push({ obj: 'street.lamp', x: 300, y: 640, s: 0.8, layer: 'near', seed: 46, anim: false });
    d.place.push({ obj: 'street.bench', x: 1420, y: 720, s: 1.1, layer: 'near', seed: 47, anim: false });
    // people waiting on the platform, each at their own depth
    const waiters = [['person.student', 620, 690], ['person.phone-idler', 1080, 680], ['person.wheelchair-user', 1480, 760]];
    waiters.forEach(([id, x, y], i) => d.place.push({ obj: id, x, y, s: ppl(d, id, y), variant: i, layer: 'near', seed: 48 + i, anim: false }));
    d.actors.push({ obj: 'person.walker', layer: 'near', path: [[-80, 830], [1680, 840]], speed: 14, loop: 'loop', s: ppl(d, 'person.walker', 835), seed: 52, offset: 0.4, variant: 5 });
    d.actors.push({ obj: 'person.buggy-walker', layer: 'near', path: [[1680, 880], [-80, 874]], speed: 9, loop: 'loop', s: ppl(d, 'person.buggy-walker', 880), seed: 53, offset: 0.7, flip: true });
    d.actors.push({ obj: 'bird.pigeon', layer: 'fore', path: [[660, 868], [700, 872]], speed: 3, loop: 'pingpong', s: 0.9, seed: 54 });
    d.actors.push({ obj: 'person.jogger', layer: 'near', path: [[1700, 720], [-100, 706]], speed: 13, loop: 'loop', s: ppl(d, 'person.jogger', 712), seed: 55, offset: 0.9, flip: true });
    d.actors.push({ obj: 'person.student', layer: 'mid', path: [[200, 600], [480, 610]], speed: 5, loop: 'pingpong', s: ppl(d, 'person.student', 606), seed: 56, offset: 0.3 });
    // platform paving: the tactile slabs on the edge, litter bins are not needed; the cover is grass where the platform meets the verge
    d.scatter.push({ obj: { 'street.bollard': 2, 'plant.planter': 1, 'street.bench': 0.6, 'ground.leaves': 1, 'ground.puddle': 1, 'plant.grass': 1 }, layer: 'fore', seed: 57, area: { rect: [-150, 800, 1750, 905] }, n: 110, minGap: 30, s: [0.7, 1.0], sByY: [[800, 0.7], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: { 'plant.planter': 2, 'street.bollard': 1, 'plant.grass': 2, 'ground.leaves': 1 }, layer: 'near', seed: 58, area: { rect: [-150, 606, 1750, 640] }, n: 90, minGap: 22, s: [0.45, 0.7], sByY: [[606, 0.45], [640, 0.7]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.flocks.push({ obj: 'bird.small-flight', n: 5, area: [200, 120, 1500, 280], speed: 36, s: 0.44, seed: 59, layer: 'horizon' });
    d.flocks.push({ obj: 'bird.pigeon', n: 5, area: [400, 740, 1000, 860], speed: 2, s: 0.8, seed: 60, layer: 'near' });
    return finish(d);
  }

  /* ---------- 3. Greywell Tunnel: the towpath, the portal in the left third ---------- */
  function tunnelTowpath() {
    const d = shell('hampshire-greywell-tunnel', { lat: 51.2597, lon: -0.9650, heading: 250, horizon: 432, at: 'afternoon', clouds: 4 }, 'natural');
    // the cutting: wooded banks rising either side, the left bank steep and dark, the right bank the towpath edge
    ground(d, 'horizon', 'M-160 440L-160 250Q200 300 540 430L600 440L1760 300V440Z', '@wood.0');
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-alder': 1, 'tree.far-broad': 2 }, layer: 'far', seed: 60, area: { rect: [-150, 300, 1750, 436] }, n: 18, minGap: 40, s: [0.36, 0.7], sByY: [[300, 0.7], [436, 1.0]], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ rect: [400, 330, 800, 470] }] } });
    // the water: the canal from the portal to the near corner, narrowing toward the mouth
    d.water.push({ layer: 'mid', d: 'M600 500H700L1640 905H-120Z', y0: 500, y1: 905, base: ['#7aa49c', '#3e6e64', '#22463e'], reflect: true, shimmer: 16, lightPath: false });
    // the left bank: dark earth and wood down to the water; the right bank: the towpath to the lens of the camera
    ground(d, 'mid', 'M-160 905L-160 470Q200 470 600 500L-120 905Z', { lin: [[0, '@bank.0'], [1, '@ground.2']], y1: 470, y2: 905 });
    ground(d, 'near', 'M700 500L1760 470V905H1640Z', { lin: [[0, '@path.1'], [1, '@path.0']], y1: 500, y2: 905 });
    ground(d, 'near', 'M700 500L1640 905H1600L690 512Z', '@bank.2');
    // the portal, left of centre, facing down the water
    d.place.push({ obj: 'landmark.greywell-tunnel-portal', x: 600, y: 500, s: 0.9, layer: 'far', seed: 61, reflect: true });
    // trees on the left bank, a willow hanging over the towpath on the right
    d.place.push({ obj: 'tree.bank-oak', x: -40, y: 905, s: 1.9, variant: 1, layer: 'front', seed: 62, anim: false, reflect: true });
    d.place.push({ obj: 'tree.bank-willow', x: 1620, y: 760, s: 1.25, flip: true, variant: 0, layer: 'near', seed: 63, anim: false, reflect: true });
    d.place.push({ obj: 'tree.bank-alder', x: 320, y: 620, s: 0.82, variant: 1, layer: 'mid', seed: 64, anim: false, reflect: true });
    // the water's edge: reeds, crowfoot on the surface, watercress
    d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.grass': 2 }, layer: 'near', seed: 65, area: { poly: [[600, 500], [700, 500], [1000, 905], [-120, 905], [-40, 800]] }, n: 90, minGap: 12, s: [0.5, 1.2], sByY: [[500, 0.4], [905, 1.3]], flip: 0.5, variant: [0, 1], anim: false, reflect: true, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: 'plant.water-crowfoot', layer: 'mid', seed: 66, area: { poly: [[640, 520], [690, 520], [1300, 880], [820, 880]] }, n: 26, minGap: 30, s: [0.4, 1.0], sByY: [[520, 0.4], [880, 1.1]], variant: [0, 1], anim: false, tint: { col: '#a0a050', k: [0, 0.1] } });
    d.scatter.push({ obj: { 'plant.towpath-hedge': 0.6, 'plant.grass': 4, 'plant.wildflowers': 1 }, layer: 'near', seed: 67, area: { poly: [[1100, 560], [1400, 600], [1760, 760], [1760, 905], [1300, 905]] }, n: 70, minGap: 14, s: [0.4, 1.0], sByY: [[560, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false });
    // life: a swan on the still water, a moorhen and mallards, a kingfisher down the cut, a walker and a dog on the towpath
    d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[860, 700], [1040, 610]], speed: 3, loop: 'pingpong', s: 0.4, seed: 68, offset: 0.6 });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'near', path: [[1700, 620], [820, 520]], speed: 150, loop: 'loop', s: 0.8, seed: 69 });
    d.place.push({ obj: 'bird.moorhen', x: 980, y: 820, s: 0.44, layer: 'near', seed: 70, flip: true, reflect: true }, { obj: 'bird.mallard', x: 1080, y: 760, s: 0.34, layer: 'mid', seed: 71, reflect: true });
    d.actors.push({ obj: 'person.walker', layer: 'near', path: [[1500, 905], [1260, 640]], speed: 6, loop: 'pingpong', s: ppl(d, 'person.walker', 780), sByY: true, seed: 72, offset: 0.2, variant: 3 });
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: [[1260, 640], [1500, 905]], speed: 7, loop: 'pingpong', s: ppl(d, 'person.dog-walker', 780), sByY: true, seed: 73, offset: 0.7 });
    d.flocks.push({ obj: 'bird.small-flight', n: 8, area: [200, 100, 1400, 260], speed: 30, s: 0.4, seed: 74, layer: 'horizon' });
    d.actors.push({ obj: 'bird.coot', layer: 'mid', path: [[1100, 700], [900, 730]], speed: 3, loop: 'pingpong', s: 0.4, seed: 75, offset: 0.4 });
    d.place.push({ obj: 'street.lamppost', x: 1330, y: 640, s: 0.8, layer: 'near', seed: 76, anim: false });
    d.place.push({ obj: 'street.lamppost', x: 1000, y: 560, s: 0.6, layer: 'mid', seed: 77, anim: false });
    // the bank cover in the lower band: grass, ferns and wildflowers down both banks (not in the water)
    d.scatter.push({ obj: { 'ground.leaves': 2, 'ground.log': 1, 'ground.puddle': 1 }, layer: 'near', seed: 78, area: { poly: [[-160, 596], [420, 596], [-120, 905], [-160, 905]] }, n: 180, minGap: 22, s: [0.5, 1.1], sByY: [[596, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: { 'ground.leaves': 1, 'plant.towpath-hedge': 1, 'plant.wildflowers': 1, 'ground.log': 1 }, layer: 'near', seed: 79, area: { poly: [[930, 596], [1760, 596], [1760, 905], [1640, 905]] }, n: 170, minGap: 22, s: [0.5, 1.1], sByY: [[596, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    return finish(d);
  }

  /* ---------- 4. Odiham Castle from the high meadow above North Warnborough ---------- */
  function castleHill() {
    const d = shell('hampshire-odiham-castle-hill', { lat: 51.2626, lon: -0.9575, heading: 200, horizon: 250, at: 'golden', clouds: 6, cloudSpeed: 7 }, 'natural');
    // the valley: far woods and the village roofs on the rise, the castle on the far bank
    ground(d, 'horizon', 'M-160 300Q300 280 700 300T1760 290V420H-160Z', '@wood.0');
    d.scatter.push({ obj: { 'tree.distant': 3, 'tree.far-broad': 2 }, layer: 'horizon', seed: 80, area: { rect: [-150, 280, 1750, 330] }, n: 22, minGap: 40, s: [0.22, 0.4], flip: 0.5, variant: [0, 1], anim: false });
    ground(d, 'far', 'M-160 340Q500 330 900 350T1760 360V460H-160Z', { lin: [[0, '@fieldA.1'], [1, '@fieldA.0']], y1: 340, y2: 460 });
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-birch': 1, 'tree.far-broad': 1 }, layer: 'far', seed: 81, area: { rect: [-150, 350, 1750, 450] }, n: 16, minGap: 70, s: [0.28, 0.5], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ rect: [1020, 240, 1320, 470] }] } });
    // the castle on the far bank, right of centre, and the cottages of the village behind it
    d.place.push({ obj: 'landmark.odiham-castle', x: 1200, y: 470, s: 0.92, layer: 'far', seed: 82 });
    d.place.push({ obj: 'building.cottage', x: 260, y: 430, s: 0.3, variant: 0, layer: 'far', seed: 83, anim: false });
    d.place.push({ obj: 'building.cottage', x: 390, y: 436, s: 0.26, variant: 2, flip: true, layer: 'far', seed: 84, anim: false });
    // the canal in the valley floor, a narrow band with a moored boat
    d.water.push({ layer: 'mid', d: 'M-160 520H1760V578H-160Z', y0: 520, y1: 578, base: ['#8fb0a2', '#4a7a70', '#2a5048'], reflect: true, shimmer: 14, lightPath: true });
    d.place.push({ obj: 'boat.narrowboat', x: 560, y: 548, s: 0.66, variant: 1, layer: 'mid', seed: 85, reflect: true });
    d.actors.push({ obj: 'boat.narrowboat', layer: 'mid', path: [[1900, 552], [-300, 552]], speed: 4, loop: 'loop', s: 0.62, seed: 86, offset: 0.4, variant: 0 });
    // the near meadow slopes down to the canal, with a field gate and a fence
    ground(d, 'mid', 'M-160 580Q800 560 1760 590V905H-160Z', { lin: [[0, '@meadow.0'], [1, '@meadow.1']], y1: 560, y2: 905 });
    ground(d, 'near', 'M-160 600Q800 586 1760 604V616Q800 600 -160 614Z', '@bank.0');
    d.place.push({ obj: 'structure.field-gate', x: 260, y: 640, s: 0.8, layer: 'near', seed: 87 });
    d.scatter.push({ obj: 'structure.fence', layer: 'near', seed: 88, area: { rect: [300, 680, 1700, 700] }, n: 3, minGap: 300, s: [0.7, 0.8], variant: [0, 1], anim: false });
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 2, 'plant.reed': 1 }, layer: 'near', seed: 89, area: { rect: [-150, 620, 1750, 760] }, n: 120, minGap: 16, s: [0.4, 0.8], sByY: [[620, 0.5], [760, 1.0]], flip: 0.5, variant: [0, 1], anim: false });
    d.scatter.push({ obj: { 'plant.grass': 5, 'plant.wildflowers': 1, 'plant.bracken': 0.5 }, layer: 'fore', seed: 90, area: { rect: [-150, 760, 1750, 905] }, n: 200, minGap: 14, s: [0.8, 1.3], sByY: [[760, 0.8], [905, 1.3]], flip: 0.5, variant: [0, 1], anim: 'strip', tint: { col: '#6a8a4a', k: [0, 0.14] } });
    // a diagonal footpath from the foreground gate down to the canal
    ground(d, 'near', 'M-120 905L620 640L700 646L-20 905Z', '@path.0');
    // life: sheep on the slope, a walker on the footpath, a heron on the canal edge
    d.scatter.push({ obj: 'animal.sheep', layer: 'mid', seed: 91, area: { rect: [700, 600, 1500, 680] }, n: 6, minGap: 90, s: [0.42, 0.52], sByY: [[600, 0.8], [680, 1.0]], variant: [0, 1], mask: { noise: { scale: 200, cut: 0.4 } } });
    d.actors.push({ obj: 'person.walker', layer: 'near', path: [[360, 905], [520, 690]], speed: 5, loop: 'pingpong', s: ppl(d, 'person.walker', 800), sByY: true, seed: 92, offset: 0.5, variant: 2 });
    d.place.push({ obj: 'bird.heron', x: 1450, y: 596, s: 0.6, layer: 'near', seed: 93, reflect: true });
    d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[1000, 556], [1200, 552]], speed: 3, loop: 'pingpong', s: 0.36, seed: 94, offset: 0.2 });
    d.flocks.push({ obj: 'bird.goose-flight', n: 6, area: [200, 110, 1500, 230], speed: 28, s: 0.34, seed: 95, layer: 'horizon' });
    d.actors.push({ obj: 'bird.coot', layer: 'mid', path: [[300, 556], [560, 562]], speed: 3, loop: 'pingpong', s: 0.36, seed: 96, offset: 0.1 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1400, 560], [1100, 566]], speed: 4, loop: 'pingpong', s: 0.36, seed: 97, offset: 0.6 });
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1 }, layer: 'near', seed: 98, area: { rect: [-150, 600, 1750, 700] }, n: 90, minGap: 14, s: [0.4, 0.8], sByY: [[600, 0.5], [700, 0.9]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    return finish(d);
  }

  /* ---------- 5. Butter Wood: a woodland ride, looking up the trunks to the sky ---------- */
  function woodRide() {
    const d = shell('hampshire-butter-wood-ride', { lat: 51.2745, lon: -0.9885, heading: 0, horizon: 380, at: 'morning', clouds: 2, cloudSpeed: 3 }, 'natural');
    // the sky slot: a narrow gap between the canopies, and the far wood at the end of the ride
    ground(d, 'horizon', 'M-160 300H1760V420H-160Z', '@wood.1');
    d.scatter.push({ obj: { 'tree.pond-wood': 2, 'tree.distant': 2 }, layer: 'horizon', seed: 100, area: { rect: [-150, 340, 1750, 396] }, n: 3, minGap: 26, s: [0.2, 0.4], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    // the ride: a pale gravel track from the foreground converging on the far trees
    ground(d, 'mid', 'M760 905L800 384L900 384L1090 905Z', { lin: [[0, '@path.1'], [1, '@path.0']], y1: 384, y2: 905 });
    // the wood edges: the verges, ferns and bluebells on the ground
    ground(d, 'far', 'M-160 380L660 380L-160 905Z', { lin: [[0, '@wood.0'], [1, '@ground.2']], y1: 380, y2: 905 });
    ground(d, 'far', 'M1760 380L1200 380L1760 905Z', { lin: [[0, '@wood.0'], [1, '@ground.2']], y1: 380, y2: 905 });
    // trunks: the big ones frame the picture at both edges, the middle ones step in toward the ride
    // the veteran oak of the ride: the one landmark of the view, left of the track
    d.place.push({ obj: 'landmark.butter-wood-oak', x: 230, y: 770, s: 1.0, layer: 'mid', seed: 105, anim: false, reflect: false });
    d.place.push({ obj: 'landmark.butter-wood-oak', x: -40, y: 905, s: 1.7, layer: 'front', seed: 103, anim: false });
    d.place.push({ obj: 'landmark.butter-wood-oak', x: 1660, y: 905, s: 1.5, flip: true, layer: 'front', seed: 104, anim: false });
    // the verges: bluebells and ferns under the trunks, the path edged with grass
    d.scatter.push({ obj: { 'plant.bluebells': 1, 'plant.grass': 2 }, layer: 'near', seed: 109, area: { poly: [[-150, 905], [-150, 560], [520, 620], [640, 905]] }, n: 60, minGap: 12, s: [0.5, 1.0], sByY: [[560, 0.5], [905, 1.3]], variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: { 'plant.bluebells': 1, 'plant.grass': 2 }, layer: 'near', seed: 110, area: { poly: [[1760, 905], [1760, 560], [1280, 620], [1180, 905]] }, n: 60, minGap: 12, s: [0.5, 1.0], sByY: [[560, 0.5], [905, 1.3]], variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: { 'plant.fern': 2, 'plant.bracken': 1, 'plant.grass': 2 }, layer: 'near', seed: 111, area: { poly: [[600, 905], [620, 720], [700, 700], [680, 905]] }, n: 14, minGap: 18, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], anim: false });
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 112, area: { poly: [[640, 905], [770, 560], [940, 560], [1220, 905]] }, n: 30, minGap: 22, s: [0.5, 0.9], sByY: [[560, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ poly: [[760, 905], [800, 384], [900, 384], [1090, 905]] }] } });
    // life: a deer at the far end of the ride, a dog walker and a walker on the track, a robin on a trunk root
    d.place.push({ obj: 'animal.deer', x: 880, y: 436, s: 0.3, flip: true, layer: 'far', seed: 113 });
    d.actors.push({ obj: 'person.dog-walker', layer: 'mid', path: [[1000, 402], [700, 720]], speed: 6, loop: 'pingpong', s: ppl(d, 'person.dog-walker', 560), sByY: true, seed: 114, offset: 0.5 });
    d.actors.push({ obj: 'person.walker', layer: 'near', path: [[760, 400], [900, 905]], speed: 4, loop: 'pingpong', s: ppl(d, 'person.walker', 700), sByY: true, seed: 115, offset: 0.1, variant: 4 });
    d.actors.push({ obj: 'animal.butterfly', layer: 'mid', path: [[560, 540], [640, 500], [600, 470]], speed: 14, loop: 'pingpong', s: 0.5, seed: 116 });
    d.place.push({ obj: 'bird.robin', x: 1080, y: 830, s: 0.7, layer: 'near', seed: 117 });
    d.place.push({ obj: 'street.lamppost', x: 1000, y: 430, s: 0.5, layer: 'far', seed: 121, anim: false });
    d.place.push({ obj: 'street.lamppost', x: 720, y: 470, s: 0.5, layer: 'far', seed: 122, anim: false });
    d.flocks.push({ obj: 'bird.small-flight', n: 12, area: [600, 120, 1200, 300], speed: 30, s: 0.36, seed: 118, layer: 'horizon' });
    // the wood floor: grass, ferns and bracken across the whole width, kept off the ride
    d.scatter.push({ obj: { 'plant.grass': 5, 'plant.wildflowers': 1 }, layer: 'near', seed: 119, area: { rect: [-150, 600, 1760, 905] }, n: 240, minGap: 14, s: [0.5, 1.1], sByY: [[600, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] }, mask: { avoid: [{ poly: [[660, 905], [800, 384], [900, 384], [1200, 905]] }] } });
    return finish(d);
  }

  /* ---------- 6. The River Whitewater at Greywell: from a footbridge, looking up the chalk stream ---------- */
  function whitewater() {
    const d = shell('hampshire-river-whitewater', { lat: 51.2585, lon: -0.9688, heading: 180, horizon: 400, at: 'noon', clouds: 4 }, 'natural');
    // the water meadows on either side, the willows and alders far off
    ground(d, 'horizon', 'M-160 372H1760V402H-160Z', '@wood.1');
    ground(d, 'far', 'M-160 400H1760V470H-160Z', { lin: [[0, '@meadow.0'], [1, '@meadow.1']], y1: 400, y2: 470 });
    d.scatter.push({ obj: { 'tree.green-willow': 2, 'tree.green-alder': 2, 'tree.bank-alder': 1 }, layer: 'far', seed: 120, area: { rect: [-150, 402, 1750, 430] }, n: 14, minGap: 60, s: [0.22, 0.44], flip: 0.5, variant: [0, 1], anim: false, reflect: true, mask: { avoid: [{ rect: [700, 300, 920, 470] }] } });
    // the stream: a chalk river from the footbridge deck to the far brick packhorse bridge
    d.water.push({ layer: 'mid', d: 'M560 470H880L1400 905H180Z', y0: 470, y1: 905, base: ['#a8ccc4', '#5e9e98', '#2e6a6a'], reflect: true, shimmer: 12, lightPath: false });
    // the banks: the watercress beds in the shallows, the water meadow on the banks
    ground(d, 'mid', 'M-160 470L560 470L180 905H-160Z', { lin: [[0, '@meadow.0'], [1, '@bank.0']], y1: 470, y2: 905 });
    ground(d, 'mid', 'M880 470H1760V905H1400Z', { lin: [[0, '@meadow.1'], [1, '@bank.0']], y1: 470, y2: 905 });
    d.scatter.push({ obj: 'plant.watercress', layer: 'mid', seed: 121, area: { poly: [[560, 480], [600, 480], [520, 640], [360, 760], [300, 720]] }, n: 60, minGap: 8, s: [0.5, 1.2], sByY: [[480, 0.5], [760, 1.2]], variant: [0, 1], anim: false, reflect: true, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: 'plant.watercress', layer: 'near', seed: 122, area: { poly: [[880, 480], [840, 480], [1000, 680], [1240, 820], [1320, 760]] }, n: 56, minGap: 8, s: [0.5, 1.2], sByY: [[480, 0.5], [820, 1.2]], variant: [0, 1], anim: false, reflect: true, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: 'plant.water-crowfoot', layer: 'mid', seed: 123, area: { rect: [600, 540, 860, 800] }, n: 22, minGap: 28, s: [0.5, 1.0], sByY: [[540, 0.5], [800, 1.2]], variant: [0, 1], anim: false, tint: { col: '#c0b060', k: [0, 0.1] } });
    // the footbridge: a plank boardwalk across the foreground, the rails at the near edge, and the posts
    d.place.push({ obj: 'structure.boardwalk', x: 780, y: 840, s: 1.5, layer: 'front', seed: 126, anim: false, reflect: true });
    // the packhorse bridge downstream, a brick arch on the far stream
    d.place.push({ obj: 'landmark.whitewater-brick-bridge', x: 800, y: 470, s: 1.0, layer: 'mid', seed: 128, reflect: true });
    d.place.push({ obj: 'street.lamppost', x: 1000, y: 800, s: 0.8, layer: 'near', seed: 136, anim: false });
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.reed': 1, 'plant.wildflowers': 1 }, layer: 'near', seed: 137, area: { poly: [[-150, 600], [400, 600], [-150, 905]] }, n: 80, minGap: 12, s: [0.5, 1.1], sByY: [[600, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 2, 'plant.shrub': 0.5 }, layer: 'near', seed: 138, area: { poly: [[1000, 600], [1760, 600], [1760, 905], [1200, 905]] }, n: 80, minGap: 12, s: [0.5, 1.1], sByY: [[600, 0.5], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false, tint: { col: '#6a8a4a', k: [0, 0.14] } });
    // the chalk-stream bank cover: grass, marsh marigold (wildflowers), reeds, and the bank shrubs
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 2, 'plant.reed': 1 }, layer: 'near', seed: 129, area: { rect: [-150, 620, 1750, 800] }, n: 130, minGap: 14, s: [0.4, 0.8], sByY: [[620, 0.5], [800, 1.0]], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ poly: [[560, 470], [880, 470], [1400, 905], [180, 905]] }] } });
    d.scatter.push({ obj: { 'plant.grass': 5, 'plant.wildflowers': 1, 'plant.fern': 1 }, layer: 'fore', seed: 130, area: { rect: [-150, 860, 1750, 905] }, n: 40, minGap: 20, s: [0.8, 1.2], flip: 0.5, variant: [0, 1], anim: 'strip', mask: { avoid: [{ rect: [520, 800, 1040, 905] }], noise: { scale: 90, cut: 0.4 } } });
    // life: an angler on the far bank, a heron in the shallows, a moorhen, and a walker on the footbridge
    d.place.push({ obj: 'person.walker', x: 360, y: 640, s: ppl(d, 'person.walker', 640), layer: 'mid', seed: 131, flip: false, variant: 1, anim: false });
    d.place.push({ obj: 'bird.heron', x: 1180, y: 740, s: 0.6, layer: 'near', seed: 132, reflect: true });
    d.actors.push({ obj: 'person.walker', layer: 'near', path: [[-200, 860], [1800, 850]], speed: 4, loop: 'loop', s: ppl(d, 'person.walker', 850), seed: 133, offset: 0.3, variant: 2 });
    d.actors.push({ obj: 'bird.moorhen', layer: 'near', path: [[1300, 620], [1100, 640]], speed: 5, loop: 'pingpong', s: 0.4, seed: 134, offset: 0.2, flip: true });
    d.flocks.push({ obj: 'bird.small-flight', n: 12, area: [300, 150, 1300, 330], speed: 34, s: 0.4, seed: 135, layer: 'horizon' });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'mid', path: [[1500, 560], [700, 520]], speed: 150, loop: 'loop', s: 0.7, seed: 139 });
    d.actors.push({ obj: 'person.hiker', layer: 'mid', path: [[1500, 470], [1000, 470]], speed: 5, loop: 'pingpong', s: ppl(d, 'person.hiker', 490), seed: 140, offset: 0.4, flip: true });
    return finish(d);
  }

  // each entry: id, label, site, kind, place, colour, mood, tags, lat, lon, the scene thunk
  const DEFS = [
    ['hampshire-hook-london-road', 'Hook high street', 'The London Road, Hook, looking down the shops to the coaching inn', 'heritage', 'hook-high-street', 'red', 'cosy', 'hook|high street|london road|coaching inn|village|shops', 51.2786, -0.9618, londonRoad],
    ['hampshire-hook-platform', 'Hook station', 'The platform at Hook, the main line through the station', 'heritage', 'hook-station', 'slate', 'cheerful', 'hook|station|platform|railway|main line|commuters', 51.2800, -0.9614, platform],
    ['hampshire-greywell-tunnel', 'The Greywell Tunnel', 'The canal runs in toward the Greywell Tunnel from the towpath', 'heritage', 'greywell-tunnel', 'green', 'calm', 'greywell|basingstoke canal|tunnel|towpath|bats|nature reserve', 51.2597, -0.9650, tunnelTowpath],
    ['hampshire-odiham-castle-hill', 'Odiham Castle from the hill', "King John's Castle across the canal from North Warnborough", 'heritage', 'odiham-castle', 'amber', 'dreamy', 'odiham castle|north warnborough|basingstoke canal|castle|ruin|meadow', 51.2626, -0.9575, castleHill],
    ['hampshire-butter-wood-ride', 'Butter Wood', 'A woodland ride in Butter Wood, looking up the trunks to the sky', 'landscape', 'hook-woods', 'green', 'calm', 'hook|butter wood|bluebells|woodland|ride|nature reserve', 51.2745, -0.9885, woodRide],
    ['hampshire-river-whitewater', 'The River Whitewater', 'The River Whitewater at Greywell from the footbridge, a brick bridge beyond', 'landscape', 'river-whitewater', 'teal', 'calm', 'river whitewater|greywell|chalk stream|watercress|trout|footbridge', 51.2585, -0.9688, whitewater],
  ];
  DEFS.forEach(([id, label, site, kind, place, colour, mood, tags, lat, lon, build]) => {
    sceneAdd(PACK, { id, label, site, ukKind: kind, ukPlace: place, colour, mood, intensity: 'subtle', tags: tags.split('|'), lat, lon }, build);
  });
})();
