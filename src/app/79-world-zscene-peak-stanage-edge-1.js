/* ============================================================
   WORLD SCENE (format v3) world-test / peak-stanage-edge-1-w3: Stanage Edge above Hathersage, the Peak District.
   The place: a gritstone edge, a long broken escarpment of buttresses, gullies and tors along the top of the moor, with the Hope Valley falling
   away below it to the west. Seen from the top of a buttress that juts out over the slope (the classic view along the edge to the north-west):
   at the lens the heather carpet of the plateau and the rounded cap blocks of the rim with the drop beyond; ahead the edge curves back into a bay
   and runs away for a kilometre and more, its west face lit, buttress after buttress, with the boulder field and the bracken below it; walkers on
   the path along the top, sheep in the heather; on the left the moor falls to the intake walls and the walled fields of the valley, a hamlet and its
   church, woods, and the far hills across it.
     Stanage Edge (SK 2285 8460): a gritstone escarpment facing west over Hathersage (OS Explorer OL1). Heading 345: the edge runs NNW from the
     lens, the valley falls away to the left (west), the afternoon sun lights the face.
   View (one only): eye 1.7 m above the plateau on the buttress top (37.7 m above the foot of the crag under the lens).
   Reusable parts it needed: worldValley (relief, field mosaic, hamlet), the gritstone look of the cliff (blocks, gullies, a talus that lies on the
   slope, the lip seen from behind), the gritstone block model, the moor's own seasonal carpet (4terrain), plant.ling-heather.
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the valley below the edge is generated from these numbers (worldValley, expanded by the validator and the build): the plateau is the cliff's own
  // height (36 m over the relief's zero at the foot of the buttress under the lens); the slope under the far face rises toward it (up.grade), so the
  // far face stands 15 to 25 m over its boulder slope. Contours run straight ahead (bearing 0): at(s, u) is metres downhill (left) and metres along.
  const VALLEY = {
    seed: 11, bearing: 0, drop: 300, fall: 1000, floor: 1300, shoulder: 0, noise: 1, up: { grade: 0.2, run: 70, tail: 0.03 },
    far: { rise: 400, run: 900 }, end: { at: 3600, rise: 330, run: 1800 },
    fields: { from: 260, to: 2300, u: [-700, 3800], rows: 7, cell: 520, wallsTo: 1150, cross: false },
    woods: { n: 18, s: [500, 2150], u: [-200, 3600], size: [70, 230], obj: ['tree.far-broad', 'tree.distant', 'tree.far-birch', 'tree.far-broad'], density: 0.0002 },
    hamlet: { at: [1250, 2100], houses: 14, spread: 80, style: 'stone-cottage' },
  };
  const at = (s, u) => [-s, u];
  // the rim (camera metres [x, z]): the buttress the lens stands on, its tip 4 m ahead-left, then the edge swings back into a bay and runs away
  // north-west, its west face toward the lens
  const EDGE = [[-40, -300], [-12, -80], [-5, -20], [-4.5, 0], [-3.5, 5], [0, 8], [5, 10], [12, 13], [22, 18], [35, 28], [48, 45], [58, 70], [65, 100], [70, 140], [74, 200], [80, 280], [90, 380], [105, 500], [125, 650], [150, 820], [185, 1020], [230, 1250], [285, 1500], [350, 1800]];
  worldAdd('world-test', { id: 'peak-stanage-edge-1-w3', label: 'Stanage Edge, Peak District (world)', site: 'Stanage Edge above Hathersage, Derbyshire', mood: 'calm', colour: 'slate',
    tags: ['uk', 'derbyshire', 'peak-district', 'stanage', 'gritstone', 'edge', 'moor', 'world-v3'], liveSky: { lat: 53.3436, lon: -1.6317 },
    ukPlace: 'peak-stanage-edge', county: 'derbyshire', ukTown: 'Stanage Edge', ukView: 'world-engine', setting: 'a gritstone edge over a valley' }, {
    v: 3, place: { lat: 53.3436, lon: -1.6317, alt: 440, region: 'derbyshire', style: 'moor' },
    camera: { eye: 37.7, fov: 70, horizon: 380, heading: 345 },
    valley: VALLEY,
    ground: { features: [
      { id: 'edge', kind: 'cliff', path: EDGE, h: 36, rock: 'gritstone', rough: 1.4, scoop: false, scree: { w: 34, h: 4.5 }, rim: { w: 1.5, h: 0.6 }, fade: 50, high: 'right' },
    ] },
    surfaces: [
      { id: 'moor', kind: 'heath', poly: [at(-3000, -900), at(-3000, 9000), at(260, 9000), at(260, -900)] },
      { id: 'farhill', kind: 'heath', poly: [at(2300, -900), at(2300, 9000), at(5200, 9000), at(5200, -900)] },
      // the buttress top at the lens and the plateau round the bay (2.5 m back from the rim: the nav keeps everything on foot off the lip)
      { id: 'pl-0', kind: 'heath', poly: [[-1.2, 3.2], [-0.6, 5.6], [1.6, 7.6], [5.6, 9.4], [9, 9.4], [9, 3.2]] },
      { id: 'pl-a', kind: 'heath', poly: [[1.6, 7.6], [6, 9.8], [12.6, 12.6], [22.4, 17.4], [35.4, 27.2], [40, 33], [40, 7.6]] },
      { id: 'pl-b', kind: 'heath', poly: [[40, 33], [48.6, 44.4], [58.8, 69.4], [66, 99.6], [71, 139.6], [75, 199.6], [81, 279.6], [140, 279.6], [140, 33]] },
      // the cap rocks along the lip of the buttress and the bay (gritstone blocks, the models)
      { id: 'rimrocks', kind: 'heath', poly: [[13.2, 10.5], [23.5, 15.7], [37, 26.1], [50.5, 43.7], [60.7, 69.2], [67.7, 99.4], [68.9, 99.1], [61.8, 68.8], [51.5, 43.1], [37.9, 25.2], [24.2, 14.6], [13.7, 9.4]] },
      // the slope under the edge: the boulder field at the foot of the face, then bracken, heather and bilberry down to the intake wall
      { id: 'boulders', kind: 'heath', poly: [[44, 46], [54, 71], [61, 101], [66, 141], [70, 200], [76, 280], [86, 380], [66, 380], [56, 280], [50, 200], [46, 141], [42, 101], [36, 71], [30, 50]] },
      { id: 'slope', kind: 'heath', poly: [[-7, 2.5], [-6, 6.7], [-1.5, 10.6], [3.8, 12.8], [10.7, 15.7], [20.4, 20.5], [32.8, 30.1], [36, 71], [42, 101], [46, 141], [50, 200], [56, 280], [66, 380], [-90, 380], [-90, 2.5]] },
      { id: 'slope-far', kind: 'heath', poly: [[66, 380], [86, 380], [100, 500], [118, 650], [-60, 650], [-90, 380]] },
      // the path along the top of the edge: from behind the lens over the buttress, round the bay and out along the far rim (two pieces: a long route is over the A* cap)
      { id: 'path', kind: 'path', path: [[3, -30], [2.2, 0], [3.3, 2.4], [7.5, 4], [14.8, 7.1], [25.6, 12.6], [39.7, 23.5], [46, 31]], width: 1.6 },
      { id: 'path-far', kind: 'path', path: [[46, 31], [53.7, 41.9], [64.2, 68.1], [71.4, 98.9], [76.5, 139.4], [80.5, 199.5], [86.5, 279.4], [96.5, 379.3], [111.4, 499.2]], width: 1.6 },
    ],
    lines: [
      // a wall on the plateau coming up to the path, and the intake wall on the slope below the bay
      { id: 'wall-pl', kind: 'wall', stone: '#6a6358', path: [[140, 60], [110, 66], [84, 64], [62, 70]], h: 1.3 },
      { id: 'wall-in', kind: 'wall', stone: '#6a6358', path: [at(70, 60), at(60, 140), at(66, 240), at(80, 380)], h: 1.3, gaps: [[120, 128]] },
    ],
    landmarks: [{ id: 'church', obj: 'structure.parish-church', at: at(1250, 2150), facing: 90, src: 'St Michael and All Angels, Hathersage (OS Explorer OL1), the spire above the hamlet', model: { livery: 'grey-limestone', size: 1.15, opts: { crown: 'spire', era: 'perpendicular' } } }],
    entities: [
      // the heather carpet at the lens: ling, bilberry, bents and a few cotton-grass heads; the slope's bracken drifts and the boulder field (authored: the fill is off)
      { cluster: 'plant.ling-heather', on: 'pl-0', n: 46, seed: 51, gap: 0.3 }, { cluster: 'plant.bilberry', on: 'pl-0', n: 14, seed: 53, gap: 0.4 }, { cluster: 'plant.grass-long', on: 'pl-0', n: 8, seed: 52, gap: 0.6 }, { cluster: 'plant.rph-short-grass', on: 'pl-0', n: 10, seed: 54, gap: 0.45 },
      { cluster: 'rock.gritstone-block', on: 'rimrocks', n: 30, seed: 81, gap: 0.5 },
      // the cap rocks of the buttress the lens stands on: the edge itself, in front of the drop (framing: they stand nearer than the near band of a prop)
      { obj: 'rock.gritstone-block', id: 'cap-1', at: [-1.0, 5.1], facing: 20, framed: true, model: { size: 0.62, seed: 3, livery: 'weathered' } },
      { obj: 'rock.gritstone-block', id: 'cap-2', at: [1.9, 7.5], facing: 70, framed: true, model: { size: 0.5, seed: 7, livery: 'sooty' } },
      { obj: 'rock.gritstone-block', id: 'cap-3', at: [4.6, 6.1], facing: 110, framed: true, model: { size: 0.55, seed: 11 } },
      { cluster: 'plant.ling-heather', on: 'pl-a', n: 70, seed: 3, gap: 0.6 }, { cluster: 'plant.bilberry', on: 'pl-a', n: 30, seed: 4, gap: 0.9 }, { cluster: 'plant.grass-long', on: 'pl-a', n: 14, seed: 5, gap: 1.4 }, { cluster: 'plant.yc-cotton-grass', on: 'pl-a', n: 8, seed: 7, gap: 1.2 }, { cluster: 'rock.gritstone-block', on: 'pl-a', n: 4, seed: 8, gap: 5 },
      { cluster: 'plant.ling-heather', on: 'pl-b', n: 60, seed: 13, gap: 1.6 }, { cluster: 'plant.bilberry', on: 'pl-b', n: 20, seed: 14, gap: 1.6 }, { cluster: 'rock.gritstone-block', on: 'pl-b', n: 8, seed: 18, gap: 6 },
      { cluster: 'rock.gritstone-block', on: 'boulders', n: 40, seed: 36, gap: 2.5 }, { cluster: 'plant.bracken', on: 'boulders', n: 30, seed: 34, gap: 2 }, { cluster: 'plant.ling-heather', on: 'boulders', n: 20, seed: 33, gap: 2 },
      { cluster: 'plant.bracken', on: 'slope', n: 90, seed: 58, gap: 2.2 }, { cluster: 'plant.ling-heather', on: 'slope', n: 60, seed: 57, gap: 2.4 }, { cluster: 'plant.bilberry', on: 'slope', n: 24, seed: 45, gap: 2.4 }, { cluster: 'rock.gritstone-block', on: 'slope', n: 14, seed: 46, gap: 8 }, { cluster: 'tree.green-birch', on: 'slope', n: 6, seed: 61, gap: 10 },
      { cluster: 'plant.bracken', on: 'slope-far', n: 40, seed: 71, gap: 5 }, { cluster: 'rock.gritstone-block', on: 'slope-far', n: 12, seed: 72, gap: 9 },
    ],
    life: [
      // walkers both ways along the top (in from behind the lens and from the far end of the edge), sheep in the heather and on the slope, a buzzard over the valley
      { who: 'walkers', on: 'path', rate: '2/min', mix: { stroll: 0.3, brisk: 0.4, couple: 0.3 }, edges: ['near', 'right'] },
      // people walk out onto the buttress to look along the edge, then go on
      { who: 'visit', on: 'pl-a', mix: { stroll: 0.5, couple: 0.3, 'dog-walker': 0.2 }, rate: '1/70s', edges: ['right'], goals: [{ go: [4, 8.6] }, { do: 'look', for: [20, 60] }, { leave: 'right' }] },
      { who: 'walkers', on: 'path-far', rate: '2/min', mix: { brisk: 0.5, couple: 0.3, 'dog-walker': 0.2 }, edges: ['far', 'right'] },
      { who: 'sheep', count: 4, on: 'pl-a' }, { who: 'sheep', count: 4, on: 'slope' }, { who: 'sheep', count: 3, on: 'pl-b' },
    ],
    backdrop: { style: 'upland' },
    fill: false,
    seed: 61,
  });
})();
