/* ============================================================
   COMPOSED SCENES, area "peaks": the view rows (one row = one item).
   _scPeaks.row(meta, params): meta holds the item's identity (the id without the
   county, label, place, town, view, reason, kind, tags); params are the archetype's
   (71-scene-uk-peaks-0.js). The first four rows REBUILD the hand-drawn Peak views of
   the uk-north-west pack with the same ids, place, view and caption fields.
   ============================================================ */
(function () {
  if (typeof _scPeaks !== 'object') return;
  const row = _scPeaks.row;

  /* ---------- Stanage Edge (rebuilt: wide and close-evening; new: High Neb, the Plantation boulders) ---------- */
  row({ id: 'stanage-edge', label: 'Stanage Edge', place: 'stanage-edge', town: 'Castleton', view: 'wide', reason: 'Gritstone ledges above the moor', kind: 'landscape', tags: ['gritstone', 'moorland', 'millstones'] },
    { id: 'stanage-edge', lat: 53.347, lon: -1.632, heading: 40, horizon: 450, at: 'afternoon', land: 'moor', seed: 510,
      sig: [{ obj: 'landmark.stanage-edge', x: 760, y: 606, s: 1.22, layer: 'mid' }],
      avoidMid: [{ rect: [-100, 470, 1700, 600] }],
      farms: [[90, 618, 0.55, 0, 'mid'], [1520, 622, 0.5, 2, 'mid'], [1340, 640, 0.45, 1, 'mid']],
      walk: [[-60, 700], [500, 668], [900, 652], [1660, 680]], walkers: 4, sheep: 6,
      extra: { place: [
        { obj: 'rock.millstone', x: 520, y: 640, s: 0.5, layer: 'near', variant: 0, seed: 201 },
        { obj: 'rock.millstone', x: 980, y: 650, s: 0.55, layer: 'near', variant: 1, seed: 202 },
        { obj: 'rock.millstone', x: 1210, y: 806, s: 1.1, layer: 'fore', variant: 2, seed: 203 },
      ] } });

  row({ id: 'stanage-edge-2', label: 'Stanage Edge', place: 'stanage-edge', town: 'Castleton', view: 'close-evening', reason: 'A discarded millstone below the edge', kind: 'landscape', tags: ['gritstone', 'millstone', 'evening'] },
    { id: 'stanage-edge-2', lat: 53.343, lon: -1.628, heading: 30, horizon: 470, at: 'golden', land: 'moor', seed: 520,
      sig: [{ obj: 'landmark.stanage-edge', x: 880, y: 574, s: 1.05, layer: 'mid' }],
      avoidMid: [{ rect: [-100, 480, 1700, 570] }], walkers: 2, sheep: 5,
      farms: [[150, 590, 0.5, 0, 'mid'], [1480, 596, 0.5, 1, 'mid'], [1290, 584, 0.4, 2, 'mid']],
      avoidFore: [{ rect: [380, 700, 760, 905] }, { rect: [900, 740, 1180, 860] }],
      extra: { place: [
        { obj: 'rock.millstone', x: 560, y: 868, s: 2.7, layer: 'fore', variant: 1, seed: 211 },
        { obj: 'rock.millstone', x: 1040, y: 812, s: 2.1, layer: 'near', variant: 0, seed: 212 },
        { obj: 'rock.millstone', x: 1340, y: 742, s: 1.3, layer: 'near', variant: 2, seed: 213, flip: true },
        { obj: 'rock.millstone', x: 300, y: 724, s: 1.1, layer: 'near', variant: 0, seed: 214, flip: true },
      ] } });

  row({ id: 'stanage-edge-3', label: 'Stanage Edge', place: 'stanage-edge', town: 'Castleton', view: 'plantation', reason: 'Pines of the Plantation below the crags', kind: 'landscape', tags: ['gritstone', 'pines', 'climbing'] },
    { id: 'stanage-edge-3', lat: 53.352, lon: -1.640, heading: 60, horizon: 440, at: 'morning', land: 'moor', seed: 530,
      sig: [{ obj: 'landmark.stanage-edge', x: 1060, y: 590, s: 1.5, layer: 'mid' }],
      avoidMid: [{ rect: [-100, 470, 1700, 586] }], walkers: 3, sheep: 3,
      farms: [[1500, 610, 0.45, 0, 'mid'], [120, 640, 0.45, 2, 'mid'], [380, 632, 0.4, 1, 'mid']],
      woods: [{ rect: [-150, 600, 640, 650], obj: { 'tree.far-pine': 3, 'tree.distant-pine': 1 }, layer: 'mid', n: 16, gap: 40, s: [0.45, 0.7] }],
      frame: [{ obj: 'rock.boulder', x: 1450, y: 905, s: 1.8, layer: 'front' }, { obj: 'tree.pool-pine', x: -20, y: 912, s: 1.25, layer: 'front' }] });

  /* ---------- Mam Tor and the Great Ridge (rebuilt: wide signature and close-evening; new: the ridge, the landslip) ---------- */
  row({ id: 'mam-tor', label: 'Mam Tor', place: 'mam-tor', town: 'Castleton', view: 'wide', reason: 'The stepped path along the ridge', kind: 'signature', tags: ['peak district', 'ridge', 'landscape'] },
    { id: 'mam-tor', lat: 53.349, lon: -1.810, heading: 340, horizon: 490, at: 'afternoon', land: 'pasture', seed: 540,
      sig: [{ obj: 'landmark.mam-tor', x: 820, y: 552, s: 0.95, layer: 'far' }],
      farms: [[300, 590, 0.8, 0], [1210, 584, 0.7, 2], [760, 612, 0.75, 1]], walls: 6, sheep: 10, gliders: 2,
      woods: { rect: [-150, 560, 1750, 600], n: 14, s: [0.2, 0.32] } });

  row({ id: 'mam-tor-2', label: 'Mam Tor', place: 'mam-tor', town: 'Castleton', view: 'close-evening', reason: 'Foreground stone and the ridge at dusk', kind: 'landmark', tags: ['peak district', 'ridge', 'landscape'] },
    { id: 'mam-tor-2', lat: 53.343, lon: -1.800, heading: 330, horizon: 520, at: 'dusk', land: 'moor', seed: 550,
      sig: [{ obj: 'landmark.mam-tor', x: 960, y: 590, s: 1.3, layer: 'far' }],
      farms: [[220, 640, 0.7, 0], [1420, 650, 0.6, 1], [700, 660, 0.6, 2]], walls: 3, sheep: 6, gliders: 1, walkers: 2,
      frame: [{ obj: 'rock.boulder', x: 120, y: 905, s: 2.4, layer: 'front' }, { obj: 'rock.boulder', x: 1480, y: 910, s: 2, layer: 'front', flip: true }] });

  row({ id: 'mam-tor-3', label: 'Mam Tor', place: 'mam-tor', town: 'Castleton', view: 'great-ridge', reason: 'Paragliders riding the wind off the Great Ridge', kind: 'landscape', tags: ['great ridge', 'paragliding', 'edale'] },
    { id: 'mam-tor-3', lat: 53.360, lon: -1.800, heading: 170, horizon: 500, at: 'noon', land: 'pasture', seed: 560,
      sig: [{ obj: 'landmark.mam-tor', x: 760, y: 566, s: 1.1, layer: 'far' }],
      farms: [[180, 610, 0.8, 0], [1380, 600, 0.75, 1], [980, 640, 0.8, 2]], walls: 5, sheep: 7, cows: 4, gliders: 4,
      woods: { rect: [-150, 580, 1750, 620], n: 10, s: [0.22, 0.34] } });

  row({ id: 'mam-tor-4', label: 'Mam Tor', place: 'mam-tor', town: 'Castleton', view: 'landslip', reason: 'The broken road below the shivering mountain', kind: 'landscape', tags: ['landslip', 'shivering mountain', 'old road'] },
    { id: 'mam-tor-4', lat: 53.345, lon: -1.806, heading: 300, horizon: 540, at: 'afternoon', land: 'pasture', seed: 570,
      sig: [{ obj: 'landmark.mam-tor', x: 1330, y: 640, s: 1.6, layer: 'mid' }],
      avoidMid: [{ rect: [-160, 560, 1760, 638] }], farms: [[120, 660, 0.6, 0, 'mid'], [380, 650, 0.5, 2, 'mid'], [1560, 680, 0.5, 1, 'near']], walls: 2, sheep: 5, gliders: 1,
      walk: [[-60, 760], [600, 742], [1660, 770]],
      avoidNear: [{ rect: [200, 700, 1300, 790] }], avoidFore: [{ rect: [200, 700, 1300, 800] }],
      extra: { ground: [
        { layer: 'near', d: 'M-160 772L240 742L620 736L640 752L260 760L-160 790Z', fill: { lin: [[0, '@road.1'], [1, '@road.0']], y1: 736, y2: 790 } },
        { layer: 'near', d: 'M660 744L960 730L1000 748L700 764Z', fill: '@road.0' },
        { layer: 'near', d: 'M1030 740L1340 724L1760 728L1760 746L1340 744L1060 758Z', fill: { lin: [[0, '@road.1'], [1, '@road.0']], y1: 724, y2: 758 } },
        { layer: 'near', d: 'M620 752L660 744L700 764L640 770Z', fill: '@scree.1' },
      ], place: [{ obj: 'rock.stones', x: 650, y: 768, s: 0.9, layer: 'near', variant: 1, seed: 231 }, { obj: 'rock.stones', x: 1010, y: 760, s: 0.8, layer: 'near', variant: 2, seed: 232 }] } });

  /* ---------- Ladybower and the Upper Derwent ---------- */
  row({ id: 'ladybower-reservoir', label: 'Ladybower Reservoir', place: 'ladybower', town: 'Castleton', view: 'wide', reason: 'The viaduct across the still water', kind: 'landscape', tags: ['reservoir', 'viaduct', 'forest'] },
    { id: 'ladybower-reservoir', lat: 53.383, lon: -1.708, heading: 10, horizon: 440, at: 'afternoon', land: 'pasture', seed: 580,
      hills: [[-160, 410], [200, 392], [520, 410], [900, 380], [1150, 300], [1300, 350], [1500, 392], [1760, 402]],
      water: { y0: 520, y1: 660, kind: 'lake' },
      sig: [{ obj: 'landmark.ladybower-viaduct', x: 820, y: 606, s: 1.0, layer: 'mid' }],
      woods: [{ rect: [-150, 452, 1750, 512], obj: { 'tree.far-pine': 3, 'tree.distant-pine': 2 }, layer: 'far', n: 34, gap: 34, s: [0.16, 0.3] }],
      farms: [[160, 506, 0.5, 0, 'far'], [1460, 500, 0.45, 2, 'far'], [1240, 512, 0.45, 1, 'far']], walls: 2, sheep: 4,
      walk: [[-60, 700], [800, 690], [1660, 706]],
      extra: { place: [{ obj: 'structure.bellmouth', x: 300, y: 630, s: 0.9, layer: 'mid', seed: 241 }] } });

  row({ id: 'ladybower-reservoir-2', label: 'Ladybower Reservoir', place: 'ladybower', town: 'Castleton', view: 'bellmouth', reason: 'The bellmouth overflow brimming after rain', kind: 'landscape', tags: ['reservoir', 'bellmouth', 'overflow'] },
    { id: 'ladybower-reservoir-2', lat: 53.375, lon: -1.712, heading: 350, horizon: 460, at: 'morning', land: 'pasture', seed: 590, cover: { 'plant.grass': 6, 'plant.heather': 0.25 },
      hills: [[-160, 420], [300, 380], [700, 420], [1100, 400], [1400, 360], [1760, 400]],
      water: { y0: 540, y1: 790, kind: 'lake', wob: 3 },
      sig: [{ obj: 'landmark.ladybower-viaduct', x: 900, y: 568, s: 0.95, layer: 'far' }],
      woods: [{ rect: [-150, 470, 1750, 532], obj: { 'tree.far-pine': 3, 'tree.distant-pine': 2 }, layer: 'far', n: 40, gap: 30, s: [0.18, 0.32] }],
      farms: [[220, 520, 0.5, 0, 'far'], [1500, 524, 0.45, 2, 'far'], [1300, 516, 0.4, 1, 'far']], walls: 0, sheep: 3, walkers: 3, nFore: 220, gapFore: 20,
      walk: [[-60, 830], [800, 816], [1660, 834]], avoidMid: [{ rect: [-160, 520, 1760, 800] }], avoidNear: [{ rect: [-160, 520, 1760, 800] }],
      extra: { place: [{ obj: 'structure.bellmouth', x: 720, y: 700, s: 2.4, layer: 'mid', seed: 251 }] } });

  row({ id: 'derwent-dam', label: 'Derwent Dam', place: 'derwent-dam', town: 'Castleton', view: 'wide', reason: 'The towers of the dam above the wooded valley', kind: 'heritage', tags: ['dam', 'reservoir', 'towers'] },
    { id: 'derwent-dam', lat: 53.405, lon: -1.738, heading: 0, horizon: 470, at: 'afternoon', land: 'pasture', seed: 600, nFar: 45, nMid: 90,
      hills: [[-160, 250], [200, 300], [500, 400], [800, 430], [1100, 400], [1400, 300], [1760, 250]],
      water: { y0: 660, y1: 720, kind: 'river', wob: 4 },
      sig: [{ obj: 'landmark.derwent-dam', x: 800, y: 640, s: 1.0, layer: 'mid' }],
      woods: [{ rect: [-150, 420, 360, 640], obj: { 'tree.far-pine': 3, 'tree.distant-pine': 2, 'tree.far-broad': 1 }, layer: 'far', n: 16, gap: 50, s: [0.22, 0.42] }, { rect: [1240, 420, 1750, 640], obj: { 'tree.far-pine': 3, 'tree.distant-pine': 2, 'tree.far-broad': 1 }, layer: 'far', n: 16, gap: 50, s: [0.22, 0.42] }],
      avoidMid: [{ rect: [300, 470, 1300, 660] }], farms: [[120, 650, 0.5, 0, 'mid'], [1480, 656, 0.5, 2, 'mid'], [1300, 690, 0.5, 1, 'mid']], walls: 2, sheep: 4,
      walk: [[-60, 760], [800, 748], [1660, 770]] });

  /* ---------- Castleton ---------- */
  row({ id: 'castleton', label: 'Castleton', place: 'castleton', town: 'Castleton', view: 'wide', reason: 'Stone cottages below Peveril Castle', kind: 'heritage', tags: ['village', 'castle', 'limestone'] },
    { id: 'castleton', lat: 53.343, lon: -1.776, heading: 200, horizon: 480, at: 'afternoon', land: 'pasture', seed: 610,
      sig: [{ obj: 'landmark.peveril-castle', x: 1020, y: 590, s: 0.95, layer: 'far' }, { obj: 'landmark.mam-tor', x: 260, y: 520, s: 0.45, layer: 'horizon' }],
      village: { rect: [60, 640, 1540, 700], n: 14, gap: 90, s: [0.42, 0.56] },
      woods: { rect: [-150, 600, 1750, 640], n: 16, s: [0.26, 0.4], layer: 'mid' },
      farms: [[1500, 610, 0.6, 2, 'mid']], walls: 3, sheep: 4, walk: [[-60, 750], [800, 736], [1660, 756]], walkers: 4 });

  row({ id: 'castleton-2', label: 'Castleton', place: 'castleton', town: 'Castleton', view: 'cave-dale', reason: 'The keep high above the limestone walls of Cave Dale', kind: 'heritage', tags: ['cave dale', 'castle', 'limestone'] },
    { id: 'castleton-2', lat: 53.340, lon: -1.774, heading: 10, horizon: 470, at: 'morning', land: 'dale', seed: 620,
      sig: [{ obj: 'landmark.peveril-castle', x: 760, y: 560, s: 1.0, layer: 'far' }],
      farms: [[200, 540, 0.45, 0, 'far'], [1380, 548, 0.45, 2, 'far'], [1180, 530, 0.4, 1, 'far']], walls: 2, sheep: 6, walkers: 3,
      walk: [[620, 905], [700, 760], [780, 640], [800, 580]], walkLayer: 'near',
      extra: { ground: [
        { layer: 'near', d: 'M-160 905L-160 420L60 470L180 560L260 700L330 905Z', fill: { lin: [[0, '@scree.0'], [1, '@scree.1']], y1: 420, y2: 905 } },
        { layer: 'near', d: 'M1760 905L1760 400L1520 470L1400 580L1300 720L1250 905Z', fill: { lin: [[0, '@scree.0'], [1, '@scree.1']], y1: 400, y2: 905 } },
      ], scatter: [{ obj: { 'rock.boulder': 1, 'rock.stones': 1.4, 'plant.grass': 2 }, layer: 'near', seed: 625, area: { poly: [[-150, 480], [200, 560], [320, 900], [-150, 900]] }, n: 26, minGap: 30, s: [0.3, 1.0], flip: 0.5, variant: 'random', tint: { col: '#6a6458', k: [0, 0.08] }, anim: false }, { obj: { 'rock.boulder': 1, 'rock.stones': 1.4, 'plant.grass': 2 }, layer: 'near', seed: 626, area: { poly: [[1750, 460], [1400, 590], [1260, 900], [1750, 900]] }, n: 26, minGap: 30, s: [0.3, 1.0], flip: 0.5, variant: 'random', tint: { col: '#6a6458', k: [0, 0.08] }, anim: false }] } });

  /* ---------- Bakewell ---------- */
  row({ id: 'bakewell-bridge', label: 'Bakewell Bridge', place: 'bakewell', town: 'Bakewell', view: 'wide', reason: 'The medieval bridge over the Wye', kind: 'heritage', tags: ['bridge', 'river wye', 'market town'] },
    { id: 'bakewell-bridge', lat: 53.214, lon: -1.672, heading: 250, horizon: 470, at: 'afternoon', land: 'pasture', seed: 630,
      water: { y0: 620, y1: 720, kind: 'river' },
      sig: [{ obj: 'landmark.bakewell-bridge', x: 800, y: 676, s: 1.45, layer: 'mid' }],
      village: { rect: [-100, 520, 1700, 590], n: 18, gap: 80, s: [0.36, 0.5], layer: 'far' },
      woods: { rect: [-150, 560, 1750, 610], n: 18, s: [0.26, 0.42], layer: 'mid' },
      farms: [[1450, 600, 0.6, 1, 'mid']], walls: 0, sheep: 0, walk: [[-60, 770], [800, 756], [1660, 776]], walkers: 4,
      extra: { actors: [
        { obj: 'bird.mallard', layer: 'mid', path: [[200, 700], [520, 704]], speed: 4, loop: 'pingpong', s: 0.45, seed: 261, offset: 0.2 },
        { obj: 'bird.mallard', layer: 'mid', path: [[1100, 708], [1400, 704]], speed: 3, loop: 'pingpong', s: 0.42, variant: 1, seed: 262, offset: 0.6 },
        { obj: 'bird.swan', layer: 'mid', path: [[1300, 690], [900, 694]], speed: 3, loop: 'pingpong', s: 0.5, seed: 263, offset: 0.4 },
      ] } });

  row({ id: 'bakewell-bridge-2', label: 'Bakewell Bridge', place: 'bakewell', town: 'Bakewell', view: 'meadow', reason: 'Ducks and swans on the Wye below the town', kind: 'heritage', tags: ['river wye', 'ducks', 'meadow'] },
    { id: 'bakewell-bridge-2', lat: 53.212, lon: -1.670, heading: 300, horizon: 460, at: 'golden', land: 'pasture', seed: 640,
      water: { y0: 600, y1: 780, kind: 'river', wob: 10 },
      sig: [{ obj: 'landmark.bakewell-bridge', x: 1100, y: 600, s: 1.45, layer: 'far' }],
      village: { rect: [-100, 500, 1700, 560], n: 16, gap: 80, s: [0.3, 0.42], layer: 'far' },
      woods: { rect: [-150, 540, 700, 590], n: 10, s: [0.3, 0.45], layer: 'mid', obj: { 'tree.far-broad': 3, 'tree.far-pine': 1 } },
      farms: [[260, 580, 0.5, 0, 'mid']], walls: 0, sheep: 0, nFore: 220, gapFore: 20, avoidMid: [{ rect: [-160, 590, 1760, 790] }], avoidNear: [{ rect: [-160, 590, 1760, 790] }],
      walk: [[-60, 830], [800, 816], [1660, 836]], walkers: 3,
      extra: { actors: [
        { obj: 'bird.mallard', layer: 'near', path: [[300, 740], [700, 748]], speed: 5, loop: 'pingpong', s: 0.8, seed: 271, offset: 0.1 },
        { obj: 'bird.mallard', layer: 'near', path: [[760, 760], [1100, 756]], speed: 4, loop: 'pingpong', s: 0.85, variant: 1, seed: 272, offset: 0.5 },
        { obj: 'bird.swan', layer: 'near', path: [[1300, 720], [900, 730]], speed: 3, loop: 'pingpong', s: 0.8, seed: 273, offset: 0.3 },
        { obj: 'bird.swan', layer: 'mid', path: [[400, 650], [700, 660]], speed: 3, loop: 'pingpong', s: 0.5, variant: 1, seed: 274, offset: 0.8 },
      ] } });

  /* ---------- Dovedale ---------- */
  row({ id: 'dovedale', label: 'Dovedale stepping stones', place: 'dovedale', town: 'Ashbourne', view: 'wide', reason: 'The stepping stones below Thorpe Cloud', kind: 'landscape', tags: ['stepping stones', 'river dove', 'limestone'] },
    { id: 'dovedale', lat: 53.062, lon: -1.776, heading: 160, horizon: 460, at: 'afternoon', land: 'dale', seed: 650, nFar: 40, nMid: 80, frame: [{ obj: 'rock.boulder', x: 90, y: 905, s: 1.5, layer: 'front' }, { obj: 'rock.boulder', x: 1540, y: 912, s: 2.1, layer: 'front', flip: true }],
      hills: [[-160, 300], [100, 280], [380, 330], [600, 420], [1000, 440], [1760, 430]],
      water: { y0: 650, y1: 740, kind: 'river' },
      sig: [{ obj: 'landmark.thorpe-cloud', x: 1080, y: 616, s: 1.05, layer: 'far' }],
      woods: { rect: [-150, 480, 480, 620], obj: { 'tree.far-broad': 3, 'tree.distant': 1 }, n: 12, gap: 40, s: [0.24, 0.42] },
      farms: [[1500, 600, 0.45, 0, 'mid'], [700, 560, 0.4, 2, 'far'], [140, 640, 0.45, 1, 'mid']], walls: 1, sheep: 7, walkers: 3,
      walkLayer: 'mid', walk: [[380, 706], [700, 696], [1040, 686]], avoidMid: [{ rect: [-160, 640, 1760, 748] }],
      extra: { place: [{ obj: 'structure.stepping-stones', x: 710, y: 706, s: 1.15, layer: 'mid', seed: 281, variant: 0 }] } });

  row({ id: 'dovedale-2', label: 'Dovedale stepping stones', place: 'dovedale', town: 'Ashbourne', view: 'close', reason: 'Crossing the Dove from stone to stone', kind: 'landscape', tags: ['stepping stones', 'river dove', 'walkers'] },
    { id: 'dovedale-2', lat: 53.061, lon: -1.775, heading: 130, horizon: 480, at: 'morning', land: 'dale', seed: 660,
      water: { y0: 670, y1: 780, kind: 'river', layer: 'near', wob: 6, edgeN: 28 },
      sig: [{ obj: 'landmark.thorpe-cloud', x: 620, y: 600, s: 0.85, layer: 'far' }],
      woods: { rect: [900, 520, 1750, 640], obj: { 'tree.far-broad': 3, 'tree.distant': 1 }, n: 16, gap: 40, s: [0.26, 0.44] },
      farms: [[1300, 560, 0.45, 0, 'far'], [180, 600, 0.45, 2, 'mid'], [1560, 620, 0.4, 1, 'mid']], walls: 2, sheep: 5, walkers: 3, nMid: 160, nFore: 240, gapFore: 18, nNear: 230, gapNear: 16,
      walkLayer: 'near', walk: [[260, 760], [800, 730], [1400, 706]],
      extra: { place: [{ obj: 'structure.stepping-stones', x: 820, y: 742, s: 1.8, layer: 'near', seed: 291, variant: 1 }] } });

  /* ---------- Hathersage ---------- */
  row({ id: 'hathersage', label: 'Hathersage', place: 'hathersage', town: 'Castleton', view: 'wide', reason: 'St Michael\'s spire above the village', kind: 'heritage', tags: ['church', 'spire', 'village'] },
    { id: 'hathersage', lat: 53.332, lon: -1.651, heading: 20, horizon: 470, at: 'afternoon', land: 'pasture', seed: 670,
      sig: [{ obj: 'landmark.hathersage-church', x: 760, y: 640, s: 0.95, layer: 'mid' }, { obj: 'landmark.stanage-edge', x: 900, y: 520, s: 0.55, layer: 'horizon' }],
      village: { rect: [-100, 640, 1700, 700], n: 12, gap: 110, s: [0.42, 0.56] },
      woods: { rect: [-150, 590, 1750, 640], obj: { 'tree.far-broad': 2, 'tree.distant-pine': 1 }, n: 11, s: [0.3, 0.46], layer: 'mid' },
      avoidMid: [{ rect: [520, 560, 1000, 640] }], farms: [[1500, 600, 0.6, 2, 'mid']], walls: 3, sheep: 4, walkers: 4, walk: [[-60, 760], [800, 744], [1660, 766]] });

  row({ id: 'hathersage-2', label: 'Hathersage', place: 'hathersage', town: 'Castleton', view: 'evening', reason: 'Evening lights along the Hope Valley', kind: 'heritage', tags: ['church', 'village', 'evening'] },
    { id: 'hathersage-2', lat: 53.330, lon: -1.660, heading: 60, horizon: 440, at: 'dusk', land: 'pasture', seed: 680,
      sig: [{ obj: 'landmark.hathersage-church', x: 1040, y: 600, s: 0.75, layer: 'mid' }],
      village: { rect: [-100, 560, 1700, 640], n: 18, gap: 80, s: [0.36, 0.52], obj: { 'building.peak-cottage': 2, 'building.sheffield-terrace': 1 } },
      woods: { rect: [-150, 520, 1750, 570], n: 18, s: [0.24, 0.36], layer: 'far' },
      avoidMid: [{ rect: [900, 520, 1200, 600] }], farms: [[200, 520, 0.5, 0, 'far'], [600, 510, 0.45, 1, 'far']], walls: 4, sheep: 6, walkers: 2 });

  /* ---------- new views: Winnats Pass, Bamford Edge over Ladybower, Hollins Cross at dawn ---------- */
  row({ id: 'winnats-pass', label: 'Winnats Pass', place: 'winnats-pass', town: 'Castleton', view: 'gorge', reason: 'The road winding up between the limestone walls', kind: 'landscape', tags: ['limestone', 'gorge', 'road'] },
    { id: 'winnats-pass', lat: 53.337, lon: -1.797, heading: 270, horizon: 470, at: 'afternoon', land: 'dale', seed: 700,
      sig: [{ obj: 'landmark.mam-tor', x: 1120, y: 540, s: 0.6, layer: 'far' }], nFar: 36, nMid: 60,
      farms: [[760, 560, 0.4, 0, 'far']], walls: 1, sheep: 9, walkers: 3, walkLayer: 'near', frame: [{ obj: 'rock.boulder', x: 90, y: 905, s: 1.6, layer: 'front' }, { obj: 'rock.boulder', x: 1530, y: 912, s: 2, layer: 'front', flip: true }],
      walk: [[560, 905], [700, 760], [780, 620], [820, 560]],
      extra: { ground: [
        { layer: 'mid', d: 'M780 905L800 700L830 600L850 548L870 548L860 600L880 700L1000 905Z', fill: { lin: [[0, '@road.1'], [1, '@road.0']], y1: 548, y2: 905 } },
        { layer: 'near', d: 'M-160 905L-160 340L60 380L240 470L380 600L520 760L600 905Z', fill: { lin: [[0, '@scree.0'], [1, '@pasture.2']], y1: 340, y2: 905 } },
        { layer: 'near', d: 'M1760 905L1760 320L1500 360L1300 470L1150 620L1060 780L1020 905Z', fill: { lin: [[0, '@scree.0'], [1, '@pasture.2']], y1: 320, y2: 905 } },
      ], scatter: [
        { obj: { 'rock.boulder': 1, 'rock.stones': 1.4, 'plant.grass': 3 }, layer: 'near', seed: 705, area: { poly: [[-150, 400], [240, 490], [580, 900], [-150, 900]] }, n: 28, minGap: 34, s: [0.3, 1.0], flip: 0.5, variant: 'random', tint: { col: '#6a6458', k: [0, 0.08] }, anim: false },
        { obj: { 'rock.boulder': 1, 'rock.stones': 1.4, 'plant.grass': 3 }, layer: 'near', seed: 706, area: { poly: [[1750, 380], [1300, 490], [1040, 900], [1750, 900]] }, n: 28, minGap: 34, s: [0.3, 1.0], flip: 0.5, variant: 'random', tint: { col: '#6a6458', k: [0, 0.08] }, anim: false },
      ] } });

  row({ id: 'ladybower-reservoir-3', label: 'Ladybower Reservoir', place: 'ladybower', town: 'Castleton', view: 'bamford-edge', reason: 'Looking down from Bamford Edge over the arms of the reservoir', kind: 'landscape', tags: ['reservoir', 'gritstone', 'viewpoint'] },
    { id: 'ladybower-reservoir-3', lat: 53.360, lon: -1.690, heading: 300, horizon: 380, at: 'golden', land: 'moor', seed: 710, nFar: 40, nMid: 80,
      hills: [[-160, 350], [200, 330], [600, 300], [900, 340], [1200, 320], [1500, 350], [1760, 340]],
      water: { y0: 470, y1: 560, kind: 'lake', wob: 12 },
      sig: [{ obj: 'landmark.ladybower-viaduct', x: 1000, y: 530, s: 0.92, layer: 'far' }],
      woods: [{ rect: [-150, 420, 1750, 466], obj: { 'tree.far-pine': 3, 'tree.distant-pine': 2 }, layer: 'far', n: 30, gap: 34, s: [0.14, 0.24] }],
      farms: [[1400, 576, 0.4, 0, 'mid'], [500, 580, 0.35, 1, 'mid']], walls: 2, sheep: 4, walkers: 2,
      walk: [[-60, 790], [700, 770], [1660, 800]],
      frame: [{ obj: 'rock.boulder', x: 1480, y: 905, s: 2.2, layer: 'front', flip: true }, { obj: 'rock.boulder', x: 420, y: 840, s: 1.6, layer: 'front', variant: 1 }],
      extra: { ground: [
        { layer: 'front', d: 'M-160 905L-160 790L40 770L120 782L260 760L420 772L560 800L640 840L700 905Z', fill: { lin: [[0, '@scree.0'], [1, '@scree.1']], y1: 760, y2: 905 } },
        { layer: 'front', d: 'M-160 820L60 800L240 790L420 800L560 826L560 834L420 810L240 800L60 812L-160 832Z', fill: '@scree.1' },
      ] } });

  row({ id: 'mam-tor-5', label: 'Mam Tor', place: 'mam-tor', town: 'Castleton', view: 'hollins-cross-dawn', reason: 'First light along the ridge from Hollins Cross', kind: 'landscape', tags: ['great ridge', 'dawn', 'hope valley'] },
    { id: 'mam-tor-5', lat: 53.352, lon: -1.788, heading: 260, horizon: 500, at: 'dawn', land: 'moor', seed: 723,
      sig: [{ obj: 'landmark.mam-tor', x: 1000, y: 560, s: 1.2, layer: 'far' }],
      farms: [[260, 620, 0.6, 0], [1360, 640, 0.55, 2]], walls: 4, sheep: 6, walkers: 3, gliders: 0,
      walk: [[-60, 720], [600, 690], [1200, 676], [1660, 700]] });
})();
