/* ============================================================
   WORLD SCENE (format v3) world-test / fleet-pond-2-w3: Fleet Pond, the boardwalk through the reed bed.
   docs/dev/WORLD_ENGINE.md 8.8. From the v2 view (71-scene-uk-south-east-fleet-pond-v2.js, SCENE_FPV.v2), enriched by hand.
   The view: on the boardwalk at the south-west carr, looking north (heading 8) over the Gelvert stream mouth and the
   open pond to the South Western main line on its low bank along the north shore, birches along the line, Fleet's
   woods behind. The boardwalk is a deck surface over water (walkers only there); reeds are a reeds surface (waders and
   small birds only); the kingfisher perches on a real post.
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve   https://fleetpond.org.uk/about-fleet-pond/
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const rail0 = 196, slope = 0.06, railZ = x => Math.round((rail0 + slope * x) * 10) / 10;
  const walk = [[0.6, 1], [0.7, 8], [0.6, 12], [1.4, 18], [3.2, 24], [5.6, 29]];   // the boardwalk centreline (v2 deck)
  const ent = [];
  // the boardwalk's own piles and rail posts along the edges (a perch host for the kingfisher)
  ent.push({ obj: 'structure.boardwalk', at: [1.2, 16], facing: 8, id: 'bw' });
  ent.push({ obj: 'structure.viewing-platform', at: [6.6, 31], facing: 40, id: 'platform' });
  // the carr either side of the frame: alder, sallow, birch, with ivy-clad alder framing the left edge
  const carr = [['tree.pond-alder', -5.6, 5], ['tree.pond-willow', -9, 12], ['tree.pond-birch', -14, 19], ['tree.pond-alder', -22, 22], ['tree.pond-willow', -31, 20],
    ['tree.pond-birch', -45, 23], ['tree.pond-alder', 6.2, 6], ['tree.pond-willow', 9.6, 13], ['tree.pond-birch', 13, 19], ['tree.pond-alder', 22, 21],
    ['tree.pond-willow', 34, 19], ['tree.pond-birch', 52, 18], ['tree.pond-oak', 70, 17], ['tree.pond-wood', -70, 24], ['tree.pond-wood', 95, 16]];
  for (const [obj, x, z] of carr) ent.push({ obj, at: [x, z] });
  // the lineside birches and the far woods
  for (let x = -240, i = 0; x <= 240; x += 30, i++) ent.push({ obj: i % 3 ? 'tree.far-birch' : 'tree.far-broad', at: [x + (i % 2) * 9, railZ(x) + 12 + (i % 3) * 4] });
  ent.push(
    { cluster: 'plant.reed', on: 'reeds-l', n: 70, seed: 21 }, { cluster: 'plant.reed', on: 'reeds-r', n: 60, seed: 22 },
    { cluster: 'plant.reed', on: 'reeds-n', n: 90, seed: 23 }, { cluster: 'plant.bulrush', on: 'cut', edge: true, n: 18, seed: 24 },
    { cluster: 'plant.fern', on: 'carr-l', n: 26, seed: 25 }, { cluster: 'plant.fern', on: 'carr-r', n: 22, seed: 26 },
    { cluster: 'plant.grass-long', on: 'carr-l', n: 40, seed: 27 }, { cluster: 'plant.shrub', on: 'carr-r', n: 14, seed: 28 },
    { cluster: 'plant.bracken', on: 'lineside', n: 40, seed: 29 }, { cluster: 'water.lily', on: 'pond', n: 12, seed: 30 },
    { cluster: 'ground.leaf-litter', on: 'carr-l', n: 18, seed: 31 });

  worldAdd('world-test', { id: 'fleet-pond-2-w3', label: 'Fleet Pond boardwalk (world)', site: 'Fleet Pond, the Gelvert boardwalk', mood: 'calm', colour: 'green',
    tags: ['uk', 'hampshire', 'fleet', 'pond', 'boardwalk', 'reeds', 'railway', 'world-v3'], liveSky: { lat: 51.2853, lon: -0.8266 } }, {
    v: 3,
    place: { lat: 51.2853, lon: -0.8266, alt: 66, region: 'hampshire' },
    camera: { eye: 2.4, fov: 66, horizon: 400, heading: 8, water: -0.2 },
    surfaces: [
      { id: 'carr-l', kind: 'grass', poly: [[-120, 1], [-4.4, 1], [-5.6, 13], [-8.6, 21.5], [-120, 24]] },
      { id: 'carr-r', kind: 'grass', poly: [[4.6, 1], [120, 1], [120, 26], [10, 22], [6.2, 14]] },
      { id: 'pond', kind: 'water', water: 'pond', poly: [[-300, 24], [-8.6, 21.5], [-4.4, 1], [4.6, 1], [6.2, 14], [10, 22], [300, 30], [300, railZ(300) - 6], [-300, railZ(-300) - 6]], shallow: 1.2 },
      { id: 'cut', kind: 'water', water: 'pond', poly: [[-3.6, 1], [3.8, 1], [5.2, 18], [3.4, 28], [-2, 28], [-6, 18]], shallow: 0.5 },
      { id: 'reeds-l', kind: 'reeds', poly: [[-120, 24], [-12, 21], [-9.4, 29], [-21, 44], [-120, 60]] },
      { id: 'reeds-r', kind: 'reeds', poly: [[8, 23], [120, 32], [120, 62], [30, 46], [8.2, 36]] },
      { id: 'reeds-n', kind: 'reeds', poly: [[-300, railZ(-300) - 22], [300, railZ(300) - 22], [300, railZ(300) - 6], [-300, railZ(-300) - 6]] },
      { id: 'lineside', kind: 'grass', poly: [[-300, railZ(-300) - 6], [300, railZ(300) - 6], [300, railZ(300) + 60], [-300, railZ(-300) + 60]] },
      { id: 'walk', kind: 'boardwalk', path: walk, width: 1.6 },
      { id: 'deck', kind: 'deck', poly: [[4.6, 27.4], [8.6, 28.6], [8.2, 33.4], [4.2, 32.4]] },
      { id: 'railway', kind: 'rail', path: [[-320, railZ(-320)], [320, railZ(320)]], width: 9 },
    ],
    entities: ent,
    landmarks: [
      { obj: 'rail.embankment', at: [0, railZ(0)], facing: 90, src: 'OS Explorer 145; South Western main line along the north shore of Fleet Pond' },
    ],
    life: [
      { who: 'walkers', on: 'walk', rate: '3/min', mix: { stroll: 0.6, birdwatcher: 0.2, 'dog-walker': 0.2 }, edges: ['S'] },
      { who: 'visit', mix: { birdwatcher: 1 }, rate: '1/4min', goals: [{ go: 'deck' }, { do: 'look', for: [30, 90] }, { leave: 'S' }] },
      { who: 'train', on: 'railway', every: '4min', mix: { 'rail.train-mainline': 1 } },
      { who: 'heron', count: 1, on: 'pond', state: 'wade' },
      { who: 'kingfisher', count: 1, goals: [{ do: 'perch', for: [20, 60] }, { do: 'dive', for: [1, 2] }, { do: 'perch', for: [20, 60] }] },
      { who: 'coot', count: 6, on: 'pond' },
      { who: 'mallard', count: 6, on: 'pond' },
      { who: 'mute-swan', count: 2, on: 'pond', group: 'pair' },
      { who: 'grebe', count: 2, on: 'pond' },
    ],
    backdrop: { style: 'woodland' },
    seed: 7,
  });
})();
