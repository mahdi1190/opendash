/* ============================================================
   WORLD SCENE (format v3) world-test / peak-stanage-edge-1-w3: Stanage Edge above Hathersage, the Peak District.
   The place: a gritstone edge, a long dark escarpment along the skyline of the moor, with the Hope Valley falling away below it. Seen from the
   heather slope at its foot, a hundred metres from the face: the path along the foot of the crags, dry-stone walls climbing to the rock, big
   weathered blocks lying in the heather and bracken, sheep, two walkers with rucksacks; on the left the moor falls away to the intake wall and
   the patchwork of walled fields, a hamlet and its church tower on the floor of the valley, and the far ridge across it on the horizon.
     Stanage Edge (SK 2285 8460): a gritstone escarpment facing west over Hathersage (OS Explorer OL1); the foot path and the intake wall are
     the real shape of the hill; the valley is the engine's (worldValley). Heading 345: the edge runs along the contour, the valley falls away to
     the left, so the sun of an autumn evening rakes the face.
   View (one only): eye 1.7 m on the slope, 60 m below the foot of the edge; the lens looks along the contour with the face on the right.
   Reusable parts it needed: worldValley (relief, field mosaic, hamlet), a gritstone block model, a gritstone look for the cliff, per-field tones.
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the valley below the edge is generated from these numbers (worldValley, expanded by the validator and the build): the camera stands on the plateau, 36 m above the
  // foot of the crags (the relief's zero is the foot; the plateau is the cliff's own height). Contours run straight ahead (bearing 0): at(s, u) is metres downhill (to the
  // left) and metres along.
  const VALLEY = {
    seed: 11, bearing: 0, drop: 300, fall: 1000, floor: 1300, shoulder: 0, noise: 1, up: { grade: 0, run: 0, tail: 0 },
    far: { rise: 400, run: 900 }, end: { at: 3600, rise: 330, run: 1800 },
    fields: { from: 260, to: 2300, u: [-700, 3800], rows: 7, cell: 520, wallsTo: 1150, cross: false },
    woods: { n: 30, s: [500, 2150], u: [-200, 3600], size: [70, 230], obj: ['tree.far-broad', 'tree.distant', 'tree.far-birch', 'tree.far-broad'], density: 0.0009 },
    hamlet: { at: [1250, 2100], houses: 14, spread: 80, style: 'stone-cottage' },
  };
  const at = (s, u) => [-s, u];
  // the rim: a few metres from the lens along the contour, with spurs and bays (the edge is a line of buttresses); the face of each spur's near flank
  // looks back toward the lens. (s metres downhill of the camera line, u metres along it)
  const EDGE = [[1.6, -420], [1.6, -30], [2, 70], [3, 130], [8, 170], [22, 200], [38, 228], [46, 270], [40, 322], [24, 362], [14, 400], [20, 480], [40, 560], [62, 640], [78, 668], [100, 700], [108, 748], [92, 795], [78, 830], [84, 900], [108, 1000], [130, 1090], [150, 1130], [176, 1190], [182, 1250], [160, 1290], [150, 1340], [160, 1500]].map(p => at(p[0], p[1]));
  worldAdd('world-test', { id: 'peak-stanage-edge-1-w3', label: 'Stanage Edge, Peak District (world)', site: 'Stanage Edge above Hathersage, Derbyshire', mood: 'calm', colour: 'slate',
    tags: ['uk', 'derbyshire', 'peak-district', 'stanage', 'gritstone', 'edge', 'moor', 'world-v3'], liveSky: { lat: 53.3436, lon: -1.6317 },
    ukPlace: 'peak-stanage-edge', county: 'derbyshire', ukTown: 'Stanage Edge', ukView: 'world-engine', setting: 'a gritstone edge over a valley' }, {
    v: 3, place: { lat: 53.3436, lon: -1.6317, alt: 440, region: 'derbyshire', style: 'moor' },
    camera: { eye: 37.7, fov: 70, horizon: 380, heading: 345 },
    valley: VALLEY,
    ground: { features: [
      { id: 'edge', kind: 'cliff', path: EDGE, h: 36, rock: 'gritstone', rough: 1.4, scoop: false, scree: false, rim: { w: 1.5, h: 0.6 }, fade: 50, high: 'right' },
    ] },
    surfaces: [
      { id: 'moor', kind: 'heath', poly: [at(-3000, -900), at(-3000, 9000), at(260, 9000), at(260, -900)] },
      // the plateau behind the rim, in two stretches (the dressing is authored here: the engine's fill dresses the screen's rows, and the valley takes them)
      { id: 'pl-a', kind: 'heath', poly: [[7.5, 3], [14, 3], [48, 40], [7.5, 40]] },
      { id: 'pl-b', kind: 'heath', poly: [[7.5, 40], [48, 40], [130, 140], [7.5, 140]] },
      { id: 'pl-c', kind: 'heath', poly: [[7.5, 140], [130, 140], [300, 400], [7.5, 400]] },
      { id: 'farhill', kind: 'heath', poly: [at(2300, -900), at(2300, 9000), at(5200, 9000), at(5200, -900)] },
      { id: 'path', kind: 'path', path: [at(-4.6, -60), at(-5, 40), at(-5.6, 110)], width: 1.7 },
      { id: 'path-b', kind: 'path', path: [at(-5.6, 108), at(-6, 160), at(-14, 240), at(-18, 330), at(-9, 420), at(-6, 560), at(-8, 800), at(-8, 1100)], width: 1.7 },
    ],
    lines: [
      // a wall on the plateau coming up to the rim, and the intake wall (the first of the field walls) a little way down the slope
      { id: 'wall-pl', kind: 'wall', stone: '#6a6358', path: [at(-70, 60), at(-48, 66), at(-20, 62), at(0, 66)], h: 1.3, gaps: [[62, 69]] },
    ],
    landmarks: [{ id: 'church', obj: 'structure.parish-church', at: at(1250, 2150), facing: 90, src: 'St Michael and All Angels, Hathersage (OS Explorer OL1), the spire above the hamlet', model: { livery: 'grey-limestone', size: 1.15, opts: { crown: 'spire', era: 'perpendicular' } } }],
    entities: [
      { cluster: 'plant.moor-heather', on: 'pl-a', n: 70, seed: 3, gap: 1.1 }, { cluster: 'plant.bilberry', on: 'pl-a', n: 40, seed: 4, gap: 1.1 }, { cluster: 'plant.grass-long', on: 'pl-a', n: 40, seed: 5, gap: 1.1 }, { cluster: 'plant.bracken', on: 'pl-a', n: 22, seed: 6, gap: 1.1 }, { cluster: 'plant.yc-cotton-grass', on: 'pl-a', n: 9, seed: 7, gap: 1.1 }, { cluster: 'rock.gritstone-block', on: 'pl-a', n: 5, seed: 8, gap: 4 }, { cluster: 'rock.stones', on: 'pl-a', n: 8, seed: 9 },
      { cluster: 'plant.moor-heather', on: 'pl-b', n: 150, seed: 13, gap: 1.1 }, { cluster: 'plant.bilberry', on: 'pl-b', n: 70, seed: 14, gap: 1.1 }, { cluster: 'plant.bracken', on: 'pl-b', n: 60, seed: 16, gap: 1.1 }, { cluster: 'plant.grass-long', on: 'pl-b', n: 60, seed: 15, gap: 1.1 }, { cluster: 'plant.yc-cotton-grass', on: 'pl-b', n: 14, seed: 17, gap: 1.1 }, { cluster: 'rock.gritstone-block', on: 'pl-b', n: 12, seed: 18, gap: 4 }, { cluster: 'rock.stones', on: 'pl-b', n: 14, seed: 19 },
      { cluster: 'plant.moor-heather', on: 'pl-c', n: 260, seed: 23, gap: 1.1 }, { cluster: 'plant.bracken', on: 'pl-c', n: 110, seed: 26, gap: 1.1 }, { cluster: 'plant.bilberry', on: 'pl-c', n: 80, seed: 24, gap: 1.1 }, { cluster: 'rock.gritstone-block', on: 'pl-c', n: 22, seed: 28, gap: 4 }, { cluster: 'rock.stones', on: 'pl-c', n: 24, seed: 29 },
    ],
    life: [
      // walkers both ways along the edge path (a couple, a brisk pair, one on their own), and sheep on the moor by the path
      { who: 'walkers', on: 'path', rate: '2.5/min', mix: { stroll: 0.3, brisk: 0.4, couple: 0.3 }, edges: ['right'] },
      { who: 'sheep', count: 4, on: 'pl-c' }, { who: 'sheep', count: 3, on: 'pl-b' }, { who: 'sheep', count: 3, on: 'pl-a' },
    ],
    backdrop: { style: 'upland' },
    seed: 61,
  });
})();
