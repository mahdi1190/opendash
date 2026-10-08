/* ============================================================
   COMPOSED SCENES, Sheffield second set, part D (docs/dev/SCENE_ENGINE.md section 3).
   Each scene is its own composition (no archetype). Five locations in this part:
     16 general-cemetery  up the path to the Egyptian gate of the General Cemetery
     17 rivelin-footbridge the Rivelin river below a footbridge, the weir and the mill dam wall
     18 forge-dam-cafe      the stone cafe and spillway at Forge Dam, paddleboarders on the water
     19 wardsend-bank      the Don at Wardsend, headstones on the bank, the old sexton's house above
     20 abbeydale-wheel    the tilt forge and its water wheel across the mill dam at golden hour
   Registered by 72-anim-pack-uk-area-sheffield2.js (pack uk-area-sheffield2).
   Data only (PURE). No names, no crests, no logos, no text. People are silhouettes.
   ============================================================ */
(function () {
  if (typeof sceneSh2Make !== 'function' || typeof sceneSh2Add !== 'function') return;

  /* 16. The General Cemetery: a path climbs between old trees to the Egyptian gate, seen from below. */
  function cemeteryGate() {
    const d = sceneSh2Make({ id: 'general-cemetery-gate', lat: 53.3695, lon: -1.4830, heading: 210, H: 430, at: 'golden', fov: 80, clouds: 4 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 400, 1760, 470), sceneSh2Lin('@wood.1', '@wood.2', 400, 470));
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 460, 1760, 900), sceneSh2Lin('@ground.0', '@ground.2', 460, 900));
    // the path: a wide pale band narrowing up the slope to the gate
    sceneSh2Ground(d, 'mid', 'M700 500L860 500L1260 900L240 900Z', sceneSh2Lin('@pave.1', '@pave.2', 500, 900));
    sceneSh2Put(d, 'landmark.sheffield2-cemetery-gate', 780, 520, 'far', 1601, { s: 1.5 });
    // old trees left and right, framing the gate: big ones in the mid and front, far ones behind
    sceneSh2Put(d, 'tree.green-oak', -60, 900, 'front', 1603, { s: 1.0, v: 0, extra: { anim: { sway: { k: 0.5 } } } });
    sceneSh2Put(d, 'tree.green-oak', 1520, 880, 'front', 1605, { s: 1.2, v: 1, flip: true, extra: { anim: { sway: { k: 0.5 } } } });
    sceneSh2Put(d, 'tree.bank-birch', 240, 640, 'mid', 1607, { s: 1.2, v: 0 });
    sceneSh2Put(d, 'tree.bank-oak', 1250, 620, 'mid', 1609, { s: 1.1, v: 1 });
    sceneSh2Put(d, 'structure.lantern-stone', 620, 700, 'near', 1611, { s: 1.0 });
    sceneSh2Put(d, 'structure.lantern-stone', 960, 690, 'near', 1613, { s: 1.0, flip: true });
    sceneSh2Bar(d, { seed: 1600, far: { 'tree.far-broad': 2, 'tree.far-pine': 1, 'tree.distant': 1 }, farN: 8, cover: { 'structure.sheffield2-headstones': 1, 'structure.lantern-stone': 1, 'plant.fern': 1, 'plant.holly': 1, 'plant.grass': 1, 'ground.leaves': 1, 'ground.log': 1, 'rock.stones': 1, 'rock.millstone': 1 }, n: 180, fore: { 'plant.fern': 1, 'plant.holly': 1 }, foreN: 4 });
    sceneSh2Walk(d, 'person.walker', 1700, -140, 880, 'fore', 1615, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.hiker', -140, 1700, 730, 'mid', 1617, { speed: 12 });
    sceneSh2Walk(d, 'person.walker', 1500, 200, 700, 'near', 1618, { speed: 9, flip: true });
    sceneSh2Walk(d, 'person.jogger', -140, 1700, 620, 'mid', 1616, { speed: 22 });
    sceneSh2Walk(d, 'person.elderly-couple', 660, 900, 760, 'near', 1619, { speed: 6, loop: 'pingpong' });
    sceneSh2Flock(d, 'bird.small-flight', 3, [260, 120, 1400, 300], 1621, { speed: 18, s: 0.5 });
    d.actors.push({ obj: 'bird.dartford-warbler', layer: 'mid', path: [[200, 420], [400, 440]], speed: 20, loop: 'pingpong', s: 0.6, seed: 1623, offset: 0.4 });
    return d;
  }

  /* 17. Rivelin valley: a river in its valley, seen from the footbridge, the weir and the old mill dam wall ahead. */
  function rivelinFootbridge() {
    const d = sceneSh2Make({ id: 'rivelin-footbridge', lat: 53.3940, lon: -1.5420, heading: 250, H: 420, at: 'afternoon', fov: 74, clouds: 6 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 390, 1760, 460), sceneSh2Lin('@hills.1', '@far.0', 390, 460));
    sceneSh2Cover(d, 'far', [-160, 400, 1760, 462], { 'tree.woods-edge': 2, 'tree.far-broad': 2, 'tree.far-birch': 1 }, 26, [0.3, 0.55], 1701, { flip: 0.5, tint: { col: '#6a8070', k: [0.02, 0.12] }, mask: { noise: { scale: 170, cut: 0.3 } } });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 440, 1760, 560), sceneSh2Lin('@bank', '@ground.1', 440, 560));
    sceneSh2Water(d, 'mid', 540, 640, { base: ['#8aaab0', '#4e7480', '#2a4a54'], shimmer: 30 });
    sceneSh2Water(d, 'near', 620, 760, { base: ['#94b4ba', '#56808c', '#2c5462'], shimmer: 34 });
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 760, 1760, 900), sceneSh2Lin('@ground.1', '@ground.2', 760, 900));
    sceneSh2Put(d, 'landmark.sheffield2-rivelin-dam', 540, 556, 'mid', 1703, { s: 1.3, extra: { reflect: true } });
    sceneSh2Put(d, 'structure.sheffield2-weir', 1040, 600, 'mid', 1705, { s: 1.15, extra: { reflect: true } });
    sceneSh2Put(d, 'structure.packhorse-bridge', 1380, 480, 'far', 1707, { s: 1.0, extra: { reflect: true } });
    sceneSh2Lamp(d, 1330, 560, 260, 'mid', 1727);
    sceneSh2Lamp(d, 420, 600, 230, 'mid', 1729);
    sceneSh2Put(d, 'tree.bank-alder', 1560, 590, 'mid', 1709, { s: 1.2, v: 0, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-willow', 80, 600, 'mid', 1711, { s: 1.2, v: 1, extra: { reflect: true } });
    sceneSh2Bar(d, { seed: 1700, reflect: true, far: { 'tree.woods-edge': 2, 'tree.far-broad': 1, 'tree.far-birch': 1 }, farN: 8, cover: { 'plant.reed': 1, 'plant.fern': 1, 'rock.stones': 1, 'rock.boulder': 1, 'plant.grass': 1, 'water.fish-ring': 1, 'water.lily': 1 }, n: 190, fore: { 'plant.bracken': 1, 'plant.bluebells': 1 }, foreN: 6 });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'mid', path: [[-100, 610], [1700, 600]], speed: 70, loop: 'loop', s: 0.4, seed: 1713, offset: 0.3 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[260, 660], [680, 680]], speed: 4, loop: 'pingpong', s: 0.36, seed: 1715, offset: 0.2 });
    d.actors.push({ obj: 'bird.grebe', layer: 'mid', path: [[1200, 700], [1420, 690]], speed: 4, loop: 'pingpong', s: 0.4, seed: 1717, offset: 0.5 });
    sceneSh2Walk(d, 'person.hiker', -140, 1700, 830, 'fore', 1719, { speed: 12 });
    sceneSh2Walk(d, 'person.dog-walker', 1700, -140, 790, 'near', 1721, { speed: 12, flip: true });
    sceneSh2Put(d, 'bird.heron', 1200, 760, 'near', 1723, { s: 0.5, flip: true, extra: { reflect: true } });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 120, 1300, 300], 1725, { speed: 20 });
    return d;
  }

  /* 18. Forge Dam: the stone cafe and its spillway seen across the water, paddleboarders out on the dam. */
  function forgeDamCafe() {
    const d = sceneSh2Make({ id: 'forge-dam-cafe', lat: 53.3610, lon: -1.5390, heading: 260, H: 420, at: 'afternoon', fov: 76, clouds: 6 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 390, 1760, 440), sceneSh2Lin('@wood.1', '@wood.2', 390, 440));
    sceneSh2Cover(d, 'far', [-160, 396, 1760, 442], { 'tree.bank-oak': 2, 'tree.bank-birch': 1, 'tree.bank-alder': 1 }, 18, [0.3, 0.55], 1801, { flip: 0.5, mask: { noise: { scale: 170, cut: 0.3 } } });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 430, 1760, 560), sceneSh2Lin('@ground.0', '@ground.1', 430, 560));
    sceneSh2Water(d, 'mid', 520, 660, { base: ['#86a8b0', '#4c7480', '#274a54'], shimmer: 26 });
    sceneSh2Water(d, 'near', 680, 780, { base: ['#90b2ba', '#4e7e8c', '#284e5c'], shimmer: 34 });
    sceneSh2Put(d, 'landmark.sheffield2-forge-dam', 720, 560, 'mid', 1803, { s: 1.6, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.pond-oak', 1340, 540, 'mid', 1805, { s: 1.2, v: 1, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.pond-pine', 110, 520, 'mid', 1807, { s: 1.1, v: 0, extra: { reflect: true } });
    sceneSh2Put(d, 'street.bench', 1160, 596, 'mid', 1809, { s: 0.8, flip: true, extra: { reflect: true } });
    sceneSh2Bar(d, { seed: 1800, reflect: true, far: { 'tree.bank-oak': 1, 'tree.far-broad': 1, 'tree.far-pine': 1 }, farN: 16, cover: { 'plant.grass': 2, 'plant.shrub': 1, 'street.bench': 1, 'street.lamppost': 1, 'plant.reed': 1, 'water.lily': 1, 'water.fish-ring': 1, 'rock.stones': 1, 'rock.boulder': 1 }, n: 190, fore: { 'plant.grass': 1, 'plant.wildflowers': 1 }, foreN: 8 });
    sceneSh2Water(d, 'near', 760, 800, { base: ['#a2c4cc', '#5e8e9c', '#2e5e6c'], shimmer: 30 });
    sceneSh2Walk(d, 'person.paddleboarder', 1700, -140, 690, 'mid', 1811, { speed: 8, flip: true });
    d.actors.push({ obj: 'person.paddleboarder', layer: 'near', path: [[260, 760], [1000, 740]], speed: 7, loop: 'pingpong', s: 0.9, seed: 1813, offset: 0.2 });
    sceneSh2Walk(d, 'person.picnicker', 880, 960, 830, 'fore', 1815, { speed: 1, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.couple', 1200, 1500, 800, 'near', 1817, { speed: 2, loop: 'pingpong' });
    sceneSh2Walk(d, 'person.dog-walker', -140, 1700, 700, 'mid', 1819, { speed: 12 });
    d.actors.push({ obj: 'bird.goose', layer: 'mid', path: [[320, 640], [700, 650]], speed: 4, loop: 'pingpong', s: 0.44, seed: 1821, offset: 0.4 });
    d.actors.push({ obj: 'bird.coot', layer: 'mid', path: [[1000, 630], [1280, 640]], speed: 3, loop: 'pingpong', s: 0.4, seed: 1823, offset: 0.1, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 110, 1300, 300], 1825, { speed: 20 });
    return d;
  }

  /* 19. Wardsend: low on the riverbank, headstones in the grass, the old sexton's house above the trees. */
  function wardsendBank() {
    const d = sceneSh2Make({ id: 'wardsend-bank', lat: 53.4040, lon: -1.4930, heading: 200, H: 380, at: 'golden', fov: 76, clouds: 5 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 350, 1760, 420), sceneSh2Lin('@wood.1', '@wood.2', 350, 420));
    sceneSh2Cover(d, 'far', [-160, 360, 1760, 420], { 'tree.woods-edge': 2, 'tree.far-broad': 2, 'tree.far-birch': 1 }, 26, [0.3, 0.55], 1901, { flip: 0.5, mask: { noise: { scale: 170, cut: 0.3 } } });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 380, 1760, 560), sceneSh2Lin('@ground.0', '@ground.2', 380, 560));
    sceneSh2Water(d, 'mid', 560, 640, { base: ['#a0bcc2', '#60848e', '#2e5058'], shimmer: 28 });
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 640, 1760, 900), sceneSh2Lin('@bank', '@ground.2', 640, 900));
    sceneSh2Put(d, 'landmark.sheffield2-wardsend', 1000, 500, 'mid', 1903, { s: 1.35, extra: { reflect: false } });
    sceneSh2Put(d, 'tree.bank-willow', 1500, 520, 'mid', 1905, { s: 1.3, v: 1, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-alder', 120, 500, 'mid', 1907, { s: 1.3, v: 2, extra: { reflect: true } });
    sceneSh2Bar(d, { seed: 1900, reflect: true, far: { 'tree.woods-edge': 1, 'tree.far-broad': 1, 'tree.far-pine': 1 }, farN: 16, cover: { 'structure.sheffield2-headstones': 1, 'structure.lantern-stone': 1, 'plant.grass': 2, 'plant.fern': 1, 'plant.bluebells': 1, 'ground.leaves': 1, 'ground.log': 1, 'rock.stones': 1, 'rock.millstone': 1 }, n: 180, fore: { 'plant.bluebells': 1, 'plant.grass': 1 }, foreN: 4 });
    d.actors.push({ obj: 'bird.heron', layer: 'mid', path: [[300, 620], [340, 624]], speed: 1, loop: 'pingpong', s: 0.6, seed: 1909, offset: 0.2 });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'mid', path: [[-100, 600], [1700, 610]], speed: 70, loop: 'loop', s: 0.4, seed: 1911, offset: 0.7 });
    sceneSh2Walk(d, 'person.dog-walker', 1700, -140, 760, 'near', 1912, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.couple', -140, 1700, 880, 'fore', 1914, { speed: 9 });
    sceneSh2Walk(d, 'person.walker', 1700, -140, 690, 'mid', 1916, { speed: 11, flip: true });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[860, 600], [1200, 606]], speed: 4, loop: 'pingpong', s: 0.36, seed: 1913, offset: 0.2, flip: true });
    sceneSh2Walk(d, 'person.walker', -140, 1700, 810, 'near', 1915, { speed: 11 });
    sceneSh2Walk(d, 'person.hiker', 1700, -140, 860, 'fore', 1917, { speed: 12, flip: true });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 120, 1300, 300], 1919, { speed: 20 });
    return d;
  }

  /* 20. Abbeydale: the tilt forge and its water wheel across the mill dam at golden hour, the stone wall in front. */
  function abbeydaleWheel() {
    const d = sceneSh2Make({ id: 'abbeydale-wheel', lat: 53.3410, lon: -1.5090, heading: 150, H: 400, at: 'golden', fov: 74, clouds: 4 });
    sceneSh2Ground(d, 'far', sceneSh2Rect(-160, 360, 1760, 430), sceneSh2Lin('@wood.1', '@wood.2', 360, 430));
    sceneSh2Cover(d, 'far', [-160, 370, 1760, 430], { 'tree.bank-oak': 2, 'tree.bank-alder': 1, 'tree.bank-birch': 1 }, 18, [0.3, 0.55], 2001, { flip: 0.5, mask: { noise: { scale: 170, cut: 0.3 } } });
    sceneSh2Ground(d, 'mid', sceneSh2Rect(-160, 420, 1760, 580), sceneSh2Lin('@ground.0', '@ground.1', 420, 580));
    sceneSh2Water(d, 'mid', 580, 680, { base: ['#c8a880', '#8e6e50', '#4a3a2a'], shimmer: 22 });
    sceneSh2Put(d, 'landmark.sheffield2-abbeydale', 780, 580, 'mid', 2003, { s: 1.15, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-oak', 1460, 540, 'mid', 2005, { s: 1.3, v: 0, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-birch', 110, 540, 'mid', 2007, { s: 1.2, v: 1, extra: { reflect: true } });
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 680, 1760, 900), sceneSh2Lin('@stone.0', '@bank', 680, 900));
    sceneSh2Ground(d, 'near', sceneSh2Rect(-160, 682, 1760, 690), '@stone.1');
    sceneSh2Bar(d, { seed: 2000, reflect: true, far: { 'tree.bank-oak': 1, 'tree.far-broad': 1, 'tree.far-birch': 1 }, farN: 14, cover: { 'structure.drystone-wall': 1, 'tree.bank-birch': 1, 'plant.grass': 2, 'plant.wildflowers': 1, 'plant.fern': 1, 'rock.stones': 1, 'rock.millstone': 1, 'street.bench': 1, 'street.bollard': 1 }, n: 210, fore: { 'plant.wildflowers': 1, 'plant.grass': 1 }, foreN: 10 });
    d.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[1100, 640], [1400, 646]], speed: 4, loop: 'pingpong', s: 0.36, seed: 2009, offset: 0.2, flip: true });
    d.actors.push({ obj: 'bird.heron', layer: 'mid', path: [[1200, 600], [1220, 602]], speed: 1, loop: 'pingpong', s: 0.6, seed: 2011, offset: 0.1, flip: true });
    sceneSh2Walk(d, 'person.couple', -140, 1700, 760, 'near', 2013, { speed: 9 });
    sceneSh2Walk(d, 'person.walker', 1700, -140, 860, 'fore', 2015, { speed: 12, flip: true });
    sceneSh2Walk(d, 'person.hiker', -140, 1700, 700, 'near', 2016, { speed: 11 });
    sceneSh2Flock(d, 'bird.small-flight', 3, [240, 100, 1300, 280], 2018, { speed: 20 });
    sceneSh2Put(d, 'tree.bank-alder', 1200, 530, 'mid', 2019, { s: 1.1, v: 1, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-willow', 360, 520, 'mid', 2021, { s: 1.1, v: 0, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-oak', 760, 530, 'mid', 2023, { s: 1.0, v: 1, extra: { reflect: true } });
    sceneSh2Put(d, 'tree.bank-alder', 1000, 540, 'mid', 2025, { s: 0.9, v: 2, extra: { reflect: true } });
    sceneSh2Flock(d, 'bird.small-flight', 3, [260, 120, 1300, 300], 2017, { speed: 20 });
    return d;
  }

  const D = [
    [cemeteryGate, { id: 'general-cemetery-gate', label: 'The General Cemetery gate', site: 'The Egyptian gate of the General Cemetery among the old trees', tags: ['cemetery', 'heritage', 'woodland', 'victorian', 'gate', 'trees'], mood: 'calm', colour: 'green', ukPlace: 'general-cemetery', ukView: 'gate', viewReason: 'The gate seen up the path between the old trees, at golden hour', ukKind: 'heritage' }],
    [rivelinFootbridge, { id: 'rivelin-footbridge', label: 'The Rivelin from the footbridge', site: 'The Rivelin below a footbridge, the weir and the mill dam wall ahead', tags: ['river', 'woodland', 'mill-dam', 'weir', 'trail', 'kingfisher'], mood: 'calm', colour: 'green', ukPlace: 'rivelin', ukView: 'river', viewReason: 'The river below the footbridge, the weir and the old dam wall', ukKind: 'landscape' }],
    [forgeDamCafe, { id: 'forge-dam-cafe', label: 'The cafe at Forge Dam', site: 'The stone cafe and spillway at Forge Dam, paddleboarders on the water', tags: ['mill-dam', 'cafe', 'woodland', 'porter-valley', 'paddleboard', 'lake'], mood: 'cheerful', colour: 'green', ukPlace: 'forge-dam', ukView: 'lake', viewReason: 'The stone cafe across the dam water on a summer afternoon', ukKind: 'landscape' }],
    [wardsendBank, { id: 'wardsend-bank', label: 'Wardsend on the Don', site: 'The Don at Wardsend, headstones on the bank, the old house above the trees', tags: ['cemetery', 'river', 'woodland', 'heritage', 'don-valley', 'headstones'], mood: 'calm', colour: 'green', ukPlace: 'wardsend', ukView: 'riverbank', viewReason: 'The headstones on the bank with the sexton\'s house above the trees', ukKind: 'heritage' }],
    [abbeydaleWheel, { id: 'abbeydale-water-wheel', label: 'The water wheel at Abbeydale', site: 'The tilt forge and its water wheel across the mill dam at Abbeydale', tags: ['industry', 'waterwheel', 'heritage', 'scythes', 'mill-dam', 'golden-hour'], mood: 'dreamy', colour: 'amber', ukPlace: 'abbeydale', ukView: 'golden', viewReason: 'The tilt forge and wheel across the mill dam at golden hour', ukKind: 'heritage' }],
  ];
  for (const [build, meta] of D) sceneSh2Add(meta, build);
})();
