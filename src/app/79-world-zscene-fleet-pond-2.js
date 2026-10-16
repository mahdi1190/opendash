/* ============================================================
   WORLD SCENE (format v3) world-test / fleet-pond-2-w3: Fleet Pond, the Gelvert boardwalk through the carr and the reed bed.
   docs/dev/WORLD_ENGINE.md 8.8. Rebuilt 16 Oct from the ground plan of the good old-engine view (71-scene-uk-south-east-
   fleet-pond-v2.js, SCENE_FPV.v2 in 70-scene-lib-fleet-pond-views.js).
   The view: on the boardwalk at the south-west carr, looking north (heading 8). The railed walk runs on over the wet alder
   carr, crosses the Gelvert stream by a short footbridge (a 3 m span between two banks), and goes on into the reed bed to a
   small platform at the reed edge. The reed bed is made by the marsh generator (79-world-4marsh.js, the `marsh` key below) from
   the walk and a few numbers: wet-ground islands with soft outlines, reed stands in clumps, open-water channels between them, litter and wet
   patches at their toes, lilies, reedmace round the water, reeds closing in on both sides of the deck, rails and posts only
   along the walk and its platform. Beyond: the open pond, the south western main line on its low bank along the far (north)
   shore with trains, birches along the line, Fleet's woods behind; ivy-clad alder and willow frame the sides. The walk never
   leaves land (invariant walkwayWater, SCENE_LESSONS Q, S).
   The line is third-rail (no masts or wires). The engine lays its bed (ballast, two tracks, cable troughs), dresses the bank (mottled
   grass, bramble and sallow scrub) and phases the timetable so that a train crosses left to right in the first seconds and every loop
   (SCENE_LESSONS V); the water ends at the bank's foot, 15 m before the line's centre.
     https://www.hart.gov.uk/fleet-pond-local-nature-reserve   https://fleetpond.org.uk/about-fleet-pond/
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const rail0 = 196, slope = 0.06, railZ = x => Math.round((rail0 + slope * x) * 10) / 10;
  // the water ends at the foot of the main line's bank: the embankment feature below is 30 m across (a flat top 15 m, a slope 7.5 m
  // each side), so its foot is 15 m before the line's centre; the reeds stand in the shallows there
  const toe = x => railZ(x) - 15.5;
  // the boardwalk's centre line: carr floor, the stream bridge (z 8.4 .. 11.8), then the reed bed to the platform
  const walk = [[0.2, 1.0], [0.2, 5], [0.4, 7.4], [0.6, 10], [0.9, 12.4], [1.9, 14.6], [2.4, 17], [2.8, 19.0]];
  const ent = [];
  // the carr either side of the frame: alder, sallow, birch, with ivy-clad alder framing the left edge
  const carr = [['tree.pond-alder', -5.6, 5], ['tree.pond-willow', -9, 12], ['tree.pond-birch', -14, 19], ['tree.pond-alder', -22, 22], ['tree.pond-willow', -31, 20],
    ['tree.pond-birch', -45, 23], ['tree.pond-alder', 6.2, 6], ['tree.pond-willow', 9.6, 14], ['tree.pond-birch', 13, 19], ['tree.pond-alder', 22, 21],
    ['tree.pond-willow', 34, 19], ['tree.pond-birch', 52, 18], ['tree.pond-oak', 70, 17], ['tree.pond-wood', -70, 24], ['tree.pond-wood', 95, 16]];
  for (const [obj, x, z] of carr) ent.push({ obj, at: [x, z] });
  // the lineside birches and the far woods
  for (let x = -240, i = 0; x <= 240; x += 30, i++) ent.push({ obj: i % 3 ? 'tree.far-birch' : 'tree.far-broad', at: [x + (i % 2) * 9, railZ(x) + 12 + (i % 3) * 4] });
  ent.push(
    // the far reed beds either side of the bay and the far shore's reeds; the near marsh makes its own
    { cluster: 'plant.reed', on: 'reeds-l', n: 90, seed: 21 }, { cluster: 'plant.reed', on: 'reeds-r', n: 80, seed: 22 },
    { cluster: 'plant.reed', on: 'reeds-n', n: 90, seed: 23 },
    { cluster: 'plant.fern', on: 'carr-l', n: 26, seed: 25 }, { cluster: 'plant.fern', on: 'carr-r', n: 22, seed: 26 },
    { cluster: 'plant.grass-long', on: 'carr-l', n: 40, seed: 27 }, { cluster: 'plant.grass-long', on: 'carr-r', n: 30, seed: 37 },
    { cluster: 'plant.shrub', on: 'carr-r', n: 12, seed: 28 },
    { cluster: 'water.lily', on: 'pond', n: 14, seed: 30 },
    { cluster: 'ground.leaf-litter', on: 'carr-l', n: 18, seed: 31 });

  worldAdd('world-test', { id: 'fleet-pond-2-w3', label: 'Fleet Pond boardwalk (world)', site: 'Fleet Pond, the Gelvert boardwalk', mood: 'calm', colour: 'green',
    tags: ['uk', 'hampshire', 'fleet', 'pond', 'boardwalk', 'reeds', 'railway', 'world-v3'], liveSky: { lat: 51.2853, lon: -0.8266 } }, {
    v: 3,
    place: { lat: 51.2853, lon: -0.8266, alt: 66, region: 'hampshire' },
    camera: { eye: 2.4, fov: 66, horizon: 400, heading: 8, water: -0.1 },
    surfaces: [
      // the carr floor, left and right of the walk (wet alder and willow wood); the water and the reeds are listed after it and win
      { id: 'carr-l', kind: 'grass', poly: [[-120, 0.5], [0, 0.5], [0, 12], [-6, 14], [-8, 24.2], [-120, 24.2]] },
      { id: 'carr-r', kind: 'grass', poly: [[0, 0.5], [120, 0.5], [120, 30], [0, 30]] },
      // ONE water: the stream coming in from the right under the footbridge, the pool left of the walk, the bay at the mouth, the
      // open pond and the far shore at the foot of the railway embankment (the marsh adds its own channels to it)
      { id: 'pond', kind: 'water', water: 'pond', shallow: 1.0, poly: [
        [14, 9.7], [11.4, 9.3], [8.8, 9.9], [6.2, 9.3], [3.9, 9.7], [2.2, 8.9], [-0.2, 8.6], [-2.4, 8.4],
        [-4.0, 9.4], [-5.0, 11.4], [-5.8, 14.0], [-6.6, 16.6], [-7.2, 19.4], [-7.6, 21.8], [-8.4, 24.8], [-8.2, 27], [-8.4, 30.4], [-8.8, 33.6], [-11, 38],
        [-20, 44], [-40, 50], [-80, 56], [-150, 64], [-300, 86],
        [-300, toe(-300)], [300, toe(300)],
        [300, 86], [120, 62], [60, 52], [30, 46], [14, 41], [8, 36], [5.6, 31],
        [3.4, 27.8], [3.1, 25.4], [2.6, 23.0], [1.8, 20.6], [0.6, 18.4], [-0.2, 16.0], [-0.6, 13.6], [-0.4, 11.8],
        [1.6, 11.4], [3.3, 11.9], [5.1, 11.3], [7.0, 10.9], [9.1, 11.2], [11.3, 10.6], [14, 10.5]] },   // the stream meanders and thins toward the right: no ruled bank
      // the far reed beds either side of the bay (from the carr's edge to the water) and along the far shore
      { id: 'reeds-l', kind: 'reeds', poly: [[-80, 22], [-12, 21], [-8.6, 24], [-9.4, 29], [-9.8, 33.5], [-12.6, 38.5], [-21, 44.6], [-40, 50.6], [-80, 56.6], [-150, 64.6], [-150, 24]] },
      { id: 'reeds-r', kind: 'reeds', poly: [[3.6, 25.6], [9, 24.5], [30, 25], [70, 30], [150, 40], [150, 63], [120, 62.6], [60, 52.6], [30, 46.6], [14, 41.6], [8.2, 36.6], [5.8, 31.4], [3.6, 28.4]] },
      { id: 'reeds-n', kind: 'reeds', poly: [[-300, railZ(-300) - 22], [300, railZ(300) - 22], [300, railZ(300) - 6], [-300, railZ(-300) - 6]] },
      { id: 'lineside', kind: 'grass', poly: [[-300, railZ(-300) - 6], [300, railZ(300) - 6], [300, railZ(300) + 60], [-300, railZ(-300) + 60]] },
      { id: 'railway', kind: 'rail', path: [[-320, railZ(-320)], [320, railZ(320)]], width: 9 },
    ],
    // the marsh (79-world-4marsh.js, expanded by the engine into surfaces, rails and plants): from the far bank of the stream on,
    // the walk goes through a reed bed to a platform at the reed edge. fen-water joins the pond; the islands, the spine, the walk
    // (over the carr floor, the 3 m footbridge over the stream, then the reed bed) and the platform come last in the surface list
    marsh: [{ id: 'fen', walk, width: 1.6, seed: 11, from: 11.4, reach: 9.5, open: 0.5, density: 1, platform: { size: [3.6, 4.4], bench: true } }],
    entities: ent,
    // the main line on its low bank along the north shore (OS Explorer 145): a long flat-topped embankment the tracks run along
    ground: { features: [{ id: 'emb', kind: 'embankment', path: [[-420, railZ(-420)], [420, railZ(420)]], width: 30, h: 2.0 }] },
    life: [
      { who: 'walkers', on: 'fen-walk', rate: '3/min', mix: { stroll: 0.6, birdwatcher: 0.2, 'dog-walker': 0.2 }, edges: ['S'] },
      { who: 'visit', on: 'fen-walk', mix: { birdwatcher: 1 }, rate: '1/4min', edges: ['S'], goals: [{ go: 'fen-deck' }, { do: 'look', for: [30, 90] }, { leave: 'S' }] },
      { who: 'train', on: 'railway', every: '2min', mix: { 'rail.train-mainline': 1 } },
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
