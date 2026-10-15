/* ============================================================
   WORLD SCENE (format v3) world-test / liverpool-pier-head-1-w3: the Pier Head on the Liverpool waterfront, from the river wall.
   The second no-example test of WORLD_ENGINE_REQUIREMENTS.md 25 (N5): a place that was never drawn, from a SHORT spec (place, camera,
   surfaces, a few buildings, a ferry, life). No fill, no framing, no backdrop, no seasons: the engine's kit ("waterfront-city") supplies them,
   and the buildings come from the generator's `baroque-civic` style (towers, domes, clock faces, giant orders), not from drawn art.
   Positions are metres along the waterfront (a, toward 340 degrees: north-north-west) and inland from the river wall (b, toward
   70 degrees), turned into the camera frame by at() below, so the camera can be re-aimed by changing three numbers.
   The view: on the promenade at the river's edge, south of the Pier Head, looking along the waterfront (north-north-west): the broad
   brown River Mersey on the left with the ferry landing stage and a ferry, the three great Edwardian office buildings in Portland
   stone on the right (the block with the great dome, the block with the domed corner tower, and the block with the two clock towers
   and their copper cupolas, the Liver birds on top), the sky over the river.
     https://www.liverpoolmuseums.org.uk/  (Pier Head: three waterfront buildings of 1907 to 1916; OS grid SJ 337 903)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the camera: on the river wall 215 m south of the middle building's frontage, looking 352 degrees (compass)
  const CAM = { a: -215, b: 3, heading: 352 };
  const D = Math.PI / 180, A = [Math.sin(340 * D), Math.cos(340 * D)], B = [Math.sin(70 * D), Math.cos(70 * D)];
  const f = [Math.sin(CAM.heading * D), Math.cos(CAM.heading * D)], r = [Math.cos(CAM.heading * D), -Math.sin(CAM.heading * D)];
  /** A waterfront point (a along the wall, b inland) in the camera frame (x right, z ahead). */
  const at = (a, b) => { const E = (a - CAM.a) * A[0] + (b - CAM.b) * B[0], N = (a - CAM.a) * A[1] + (b - CAM.b) * B[1]; return [Math.round((E * r[0] + N * r[1]) * 10) / 10, Math.round((E * f[0] + N * f[1]) * 10) / 10]; };
  const rect = (a1, a2, b1, b2) => [at(a1, b1), at(a2, b1), at(a2, b2), at(a1, b2)];
  worldAdd('world-test', { id: 'liverpool-pier-head-1-w3', label: 'Liverpool Pier Head (world)', site: 'The Pier Head and the River Mersey, Liverpool', mood: 'proud', colour: 'slate',
    tags: ['uk', 'merseyside', 'liverpool', 'pier-head', 'waterfront', 'river-mersey', 'ferry', 'world-v3'], liveSky: { lat: 53.4064, lon: -2.9958 } }, {
    v: 3,
    place: { lat: 53.4064, lon: -2.9958, alt: 8, region: 'merseyside', style: 'waterfront-city' },
    camera: { eye: 1.7, fov: 72, horizon: 500, heading: CAM.heading, water: -3 },
    surfaces: [
      { id: 'prom', kind: 'pavement', poly: rect(-900, 900, 0, 26) },
      { id: 'plaza', kind: 'plaza', poly: rect(-900, 900, 26, 80) },
      { id: 'road', kind: 'road', poly: rect(-900, 900, 80, 92) },
      { id: 'mersey', kind: 'water', water: 'estuary', poly: rect(-900, 1500, -1250, 0), shallow: 2 },
      { id: 'stage', kind: 'boardwalk', poly: rect(-110, 10, -24, -1) },
    ],
    // the three great waterfront offices, their river fronts on the plaza (b = 95), in Portland stone
    buildings: [
      { id: 'port', foot: rect(-135, -52, 95, 145), storeys: 7, style: 'baroque-civic', crown: 'great-dome' },
      { id: 'cunard', foot: rect(-30, 30, 95, 140), storeys: 8, style: 'baroque-civic', crown: 'corner-dome' },
      { id: 'liver', foot: rect(78, 142, 95, 150), storeys: 12, style: 'baroque-civic', crown: 'twin-towers' },
    ],
    entities: [
      { obj: 'boat.river-ferry', at: at(-66, -34), facing: 348, id: 'ferry-1' }, { obj: 'boat.river-ferry', at: at(-2, -34), facing: 348, id: 'ferry-2' },
    ],
    life: [
      { who: 'walkers', on: 'plaza', rate: '10/min', mix: { stroll: 0.5, chat: 0.2, family: 0.15, 'dog-walker': 0.15 } },
      { who: 'walkers', on: 'prom', rate: '8/min', mix: { stroll: 0.5, brisk: 0.2, couple: 0.15, friends: 0.15 } },
      { who: 'gulls', count: 10 },
      { who: 'buses', on: 'road', rate: '2/min' }, { who: 'cars', on: 'road', rate: '5/min' },
    ],
    seed: 5,
  });
})();
