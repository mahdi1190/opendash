/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-kelham-1-w3: Kelham Island, the River Don by the weir.
   docs/dev/WORLD_ENGINE.md 8.8. From the v2 view (71-scene-uk-north-sheffield-kelham.js, SCENE_KLM.v1), enriched by hand.
   The view: from Ball Street bridge looking east-south-east (heading 112) down the Don to the weir below Cornish Place;
   the works and mill on the left bank, the riverside walk and Ball Street's flats on the right, the city's hills behind.
   The weir is a surface (solid to swimmers, falling water): ducks live above and below it, never through it.
     https://www.sheffield.gov.uk/   Kelham Island Museum; Don Catchment Rivers Trust (Ball Street / Cornish Place weir)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const ent = [];
  // the left bank: Cornish Place works, red-brick mills and a chimney, end on to the river
  const left = [['building.warehouse-canal', -27, 30, 90], ['building.mill-red-brick', -27, 58, 90], ['building.mill-red-brick', -27, 88, 90],
    ['building.warehouse-canal', -27, 118, 90], ['building.mill-red-brick', -27, 150, 90], ['building.terrace-northern', -27, 190, 90]];
  for (const [obj, x, z, f] of left) ent.push({ obj, at: [x, z], facing: f });
  // the right bank: riverside flats and the converted works along the walk, street trees and lamps
  const right = [['building.media-block', 35, 26, 270], ['building.warehouse-canal', 35, 60, 270], ['building.townhouse', 35, 86, 270],
    ['building.shopfront', 35, 112, 270], ['building.mill-red-brick', 35, 146, 270], ['building.terrace-victorian', 35, 186, 270]];
  for (const [obj, x, z, f] of right) ent.push({ obj, at: [x, z], facing: f });
  for (let z = 14, i = 0; z <= 170; z += 13, i++) ent.push({ obj: i % 2 ? 'street.lamppost' : 'street.bench', at: [14.4, z], facing: 270, id: i % 2 ? undefined : 'bench-' + i });
  for (const [x, z] of [[-11.5, 18], [-12, 44], [-11, 76], [-12.5, 104], [16.5, 40], [16.8, 96], [17, 140]]) ent.push({ obj: x < 0 ? 'tree.bank-alder' : 'tree.plane', at: [x, z] });
  for (const [x, z] of [[-9.2, 30], [-8.8, 70], [10.2, 52]]) ent.push({ obj: 'tree.bank-willow', at: [x, z] });
  for (const e of ent) if (e.id === undefined) delete e.id;
  ent.push(
    { cluster: 'plant.grass-long', on: 'bank-l', n: 50, seed: 41 }, { cluster: 'plant.shrub', on: 'bank-l', n: 16, seed: 42 },
    { cluster: 'plant.reed', on: 'don', edge: true, n: 24, seed: 43 }, 
    { cluster: 'plant.planter', on: 'walk', n: 6, seed: 45 }, { cluster: 'rock.stones', on: 'don', edge: true, n: 18, seed: 46 },
    { cluster: 'plant.wildflowers', on: 'bank-r', n: 20, seed: 47 }, { cluster: 'ground.leaves', on: 'walk', n: 14, seed: 48 });

  worldAdd('world-test', { id: 'sheffield-kelham-1-w3', label: 'Kelham Island weir (world)', site: 'The River Don from Ball Street bridge, Kelham Island', mood: 'urban', colour: 'brick',
    tags: ['uk', 'sheffield', 'river', 'weir', 'works', 'world-v3'], liveSky: { lat: 53.3906, lon: -1.4719 } }, {
    v: 3,
    place: { lat: 53.3906, lon: -1.4719, alt: 52, region: 'south-yorkshire' },
    camera: { eye: 1.7, fov: 64, horizon: 395, heading: 112, water: -2.6 },
    surfaces: [
      { id: 'bank-l', kind: 'grass', poly: [[-60, 1], [-8, 1], [-8, 220], [-60, 220]] },
      { id: 'don', kind: 'water', water: 'river', poly: [[-8, 1], [9, 1], [9, 220], [-8, 220]], shallow: 0.8 },
      { id: 'weir', kind: 'weir', poly: [[-8, 64], [9, 58], [9, 61], [-8, 67]] },
      { id: 'bank-r', kind: 'grass', poly: [[9, 1], [11, 1], [11, 220], [9, 220]] },
      { id: 'walk', kind: 'path', path: [[12.5, 1], [12.5, 220]], width: 3 },
      { id: 'pave', kind: 'pavement', path: [[20.5, 1], [20.5, 220]], width: 2.4 },
      { id: 'road', kind: 'road', path: [[24.5, 1], [24.5, 220]], width: 6 },
      { id: 'yard-l', kind: 'plaza', poly: [[-60, 1], [-14, 1], [-14, 24], [-60, 24]] },
    ],
    entities: ent,
    landmarks: [
      { obj: 'landmark.kelham-island', at: [-36, 238], facing: 22, src: 'Kelham Island Museum site plan; OS MasterMap' },
    ],
    life: [
      { who: 'walkers', on: 'walk', rate: '20/min', mix: { stroll: 0.4, brisk: 0.25, chat: 0.2, 'dog-walker': 0.15 }, edges: ['S', 'N'] },
      { who: 'walkers', on: 'pave', rate: '8/min', mix: { brisk: 0.7, stroll: 0.3 }, edges: ['S', 'N'] },
      { who: 'visit', mix: { elderly: 0.5, stroll: 0.5 }, rate: '1/2min', goals: [{ go: 'bench-0' }, { do: 'sit', for: [20, 80] }, { leave: 'N' }] },
      { who: 'cyclists', on: 'road', rate: '3/min', edges: ['S', 'N'] },
      { who: 'mallard', count: 10, on: 'don' },   // the weir splits the swim layer: they settle above and below it
      { who: 'goosander', count: 3, on: 'don', state: 'dive' },
      { who: 'heron', count: 1, on: 'don', state: 'stalk' },
    ],
    backdrop: { style: 'city-sheffield-hills', skyline: [
      { obj: 'landmark.sheffield-arts-tower-glass', bearing: 160, dist: 1400, src: 'OS map bearing from Ball Street bridge' },
      { obj: 'landmark.park-hill-flats', bearing: 128, dist: 2100, src: 'OS map bearing from Ball Street bridge' },
      { obj: 'landmark.sheffield-town-hall-tower', bearing: 150, dist: 1300, src: 'OS map bearing from Ball Street bridge' },
    ] },
    seed: 11,
  });
})();
