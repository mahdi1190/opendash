/* ============================================================
   WORLD SCENE (format v3) world-test / manchester-castlefield-1-w3: Castlefield canal basin, Manchester.
   The view: from the towpath on the south side of the Bridgewater Canal basin, looking east-north-east along the water: moored
   narrowboats under the red-brick canal warehouses of the north quay, and three railway viaducts striding across the basin one behind
   the next (the Metrolink's cream lattice girders on brick piers, the brick arcade with a steel span over the water, the grey steel
   viaduct beyond). The canal is drawn in its own frame (s along it, t across it, to the right) and turned into the camera frame by C().
     https://www.castlefield.org.uk   OS Explorer 276 (Castlefield basin, SJ 831 976)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const ANG = 28 * Math.PI / 180, dS = [-Math.sin(ANG), Math.cos(ANG)], dT = [Math.cos(ANG), Math.sin(ANG)];
  const r1 = (v) => Math.round(v * 10) / 10;
  const C = (s, t) => [r1(dS[0] * s + dT[0] * t), r1(dS[1] * s + dT[1] * t)];
  const FA = r1(Math.atan2(dS[0], dS[1]) * 180 / Math.PI);          // facing along the canal (away from the camera)
  const FT = r1(Math.atan2(dT[0], dT[1]) * 180 / Math.PI);          // facing across it (to the right)
  const strip = (s0, s1, t0, t1) => [C(s0, t0), C(s1, t0), C(s1, t1), C(s0, t1)];
  const pathOf = (t, s0, s1) => [C(s0, t), C(s1, t)];
  const WT0 = 3, WT1 = 22;                                            // the water
  const ents = [];
  // the viaducts: each stands across the canal, its middle on the canal's axis
  // (the entity's middle is on the towpath, t 0.5; `gap` and `gapAt` put the abutments on the two banks)
  ents.push({ id: 'via-1', obj: 'structure.viaduct', at: C(58, 0.5), facing: FT, attach: 'ground', framed: true, model: { livery: 'red-cream', seed: 3, opts: { kind: 'girder', len: 150, width: 9.2, h: 10.5, span: 30, gap: 29, gapAt: 10.5, masts: true } } });
  ents.push({ id: 'via-2', obj: 'structure.viaduct', at: C(104, 0.5), facing: FT, attach: 'ground', framed: true, model: { livery: 'red-cream', seed: 8, opts: { kind: 'arcade', len: 150, width: 9.4, h: 9.8, gap: 29, gapAt: 10.5 } } });
  ents.push({ id: 'via-3', obj: 'structure.viaduct', at: C(168, 0.5), facing: FT, attach: 'ground', framed: true, model: { livery: 'soot-grey', seed: 11, opts: { kind: 'girder', len: 170, width: 10, h: 12, span: 34, gap: 29, gapAt: 10.5 } } });
  // narrowboats along the north quay
  [[30, 0], [58, 1], [86, 2], [114, 3], [144, 4]].forEach(([s, i]) => ents.push({ obj: 'boat.narrowboat', at: C(s, 20.4), facing: FA, attach: 'water', model: { seed: 20 + i } }));
  [[30, 5], [62, 6], [96, 7]].forEach(([s, i]) => ents.push({ obj: 'boat.narrowboat', at: C(s, 4.9), facing: FA, attach: 'water', model: { seed: 30 + i } }));
  worldAdd('world-test', { id: 'manchester-castlefield-1-w3', label: 'Castlefield canal basin, Manchester (world)', site: 'Castlefield canal basin, Manchester', mood: 'calm', colour: 'brick',
    tags: ['uk', 'manchester', 'canal', 'basin', 'viaduct', 'warehouses', 'narrowboats', 'world-v3'], liveSky: { lat: 53.4773, lon: -2.2554 },
    ukPlace: 'manchester-castlefield', county: 'greater-manchester', ukTown: 'Castlefield canal basin', ukView: 'world-engine', setting: 'a canal basin under railway viaducts' }, {
    v: 3,
    place: { lat: 53.4773, lon: -2.2554, alt: 38, region: 'greater-manchester', style: 'river-city' },
    camera: { eye: 3.4, fov: 78, horizon: 470, heading: 95, water: -1.2 },
    surfaces: [
      { id: 'quay', kind: 'plaza', path: pathOf(0.5, -20, 260), width: 5 },
      { id: 'water', kind: 'water', water: 'canal', poly: strip(-20, 260, WT0, WT1), shallow: 0.6 },
      { id: 'far-quay', kind: 'pavement', path: pathOf(WT1 + 2.25, -20, 260), width: 4.5 },
      { id: 'behind', kind: 'pavement', path: pathOf(-8.5, -20, 260), width: 11 },
    ],
    buildings: [
      // the north quay's warehouses, broken where the viaducts cross (arc length = s + 20)
      ...[[16, 50], [66, 96], [112, 160], [178, 260]].map(([a, b], i) => ({ id: 'wh-' + i, along: 'far-quay', side: 'right', style: 'canal-warehouse', storeys: [4, 5], from: a + 20, to: b + 20, shops: false, depth: [14, 18], party: 'none', spacing: 2.5 })),
    ],
    entities: ents,

    life: [
      { who: 'walkers', on: 'quay', rate: '5/min', mix: { stroll: 0.5, chat: 0.2, family: 0.15, 'dog-walker': 0.15 }, edges: ['W', 'E'] },
      { who: 'mallard', count: 4, on: 'water' },
    ],
    backdrop: { style: 'city-manchester-towers' },
    seed: 79,
  });
})();
