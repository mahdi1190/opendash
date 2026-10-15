/* ============================================================
   WORLD SCENE (format v3) world-test / fleet-canal-2-w3: the Basingstoke Canal at Pondtail, Fleet, towpath right.
   docs/dev/WORLD_ENGINE.md 8.8. First converted from the v2 view (70-scene-lib-canal-views.js 'fleet-canal-2'), then
   enriched by hand. World metres only: x right of the camera axis, z forward. No screen, layer, scale, light, shadow
   or reflection fields anywhere: size, depth order, waterlines, shadows and reflections are the engine's.
   The view: standing on the towpath looking south-west along the cut; three narrowboats moored nose to tail on the
   towpath side, a fourth cruising towards us later; willows and alders on the offside, the hawthorn hedge behind the
   towpath, Pondtail bridge where the cut bends away.
     https://basingstoke-canal.org.uk/   OS Explorer 145 (Pondtail Bridge, SU 822 541)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the canal centreline (from the v2 view) and lines offset from it (+ = towpath side, right)
  // (15 Oct) the near reach runs straight past the camera's left, so the moored boats are seen along their sides as in the
  // v2 view, then it bends right towards the bridge
  const C = [[-7.9, 1], [-7.9, 15], [-7.6, 35], [-7, 55], [-5.5, 85], [-2.5, 120], [0, 165], [-4, 230], [-15, 320], [-37, 420]];
  const R1 = v => Math.round(v * 10) / 10;
  const off = (o) => C.map((p, i) => {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    return [R1(p[0] + o * dz / L), R1(p[1] - o * dx / L)];
  });
  const along = (s, o) => {   // the point at arc length s, offset o; and the cut's heading there
    for (let i = 1, acc = 0; i < C.length; i++) {
      const a = C[i - 1], b = C[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (acc + L >= s || i === C.length - 1) { const t = Math.min(1, (s - acc) / L); return { at: [R1(a[0] + dx * t + o * dz / L), R1(a[1] + dz * t - o * dx / L)], h: Math.round(Math.atan2(dx, dz) * 180 / Math.PI) }; }
      acc += L;
    }
  };
  const bankL = off(-6), bankR = off(6), towIn = off(6.4), towOut = off(9.4);
  const ent = [], P = (obj, s, o, x) => { const a = along(s, o); ent.push(Object.assign({ obj, at: a.at, facing: a.h }, x || {})); };

  // moored boats, nose to tail on the towpath side (decks walkable: the boater steps aboard)
  P('boat.narrowboat', 19, 4.5, { id: 'nb1', attach: 'water', variant: 0 });
  P('boat.narrowboat', 39.5, 4.5, { id: 'nb2', attach: 'water', variant: 1 });
  P('boat.narrowboat', 59.5, 4.4, { id: 'nb3', attach: 'water', variant: 2 });
  // mooring kit on the towpath edge
  for (const s of [3, 15, 24, 36, 44, 56]) P('street.bollard', s, 6.7, {});
  P('ground.log', 19, 8.6, {}); P('street.bench', 64, 8.2, { id: 'bench-1', facing: 270 });
  P('structure.fence', 78, 9.6, {}); P('structure.field-gate', 92, 9.4, { id: 'gate-1', open: true });
  // the offside: willows, alders and oak over the water, carr undergrowth
  const offside = [['tree.bank-willow', 6, -8], ['tree.bank-alder', 18, -9.5], ['tree.bank-willow', 33, -8.4], ['tree.bank-oak', 47, -12],
    ['tree.bank-alder', 61, -9], ['tree.bank-willow', 76, -8.6], ['tree.bank-birch', 88, -11], ['tree.bank-oak', 104, -13], ['tree.bank-alder', 126, -10],
    ['tree.bank-willow', 150, -9], ['tree.bank-oak', 178, -14], ['tree.bank-distant', 220, -16], ['tree.bank-distant', 270, -18]];
  for (const [o, s, k] of offside) P(o, s, k, {});
  // the towpath side: hawthorn hedge line with oaks standing out of it
  for (const [o, s] of [['tree.hawthorn', 12], ['tree.bank-oak', 40], ['tree.hawthorn', 58], ['tree.bank-birch', 83], ['tree.bank-oak', 116], ['tree.hawthorn', 140], ['tree.bank-distant', 200]]) P(o, s, 12.5, {});
  // the flowers and reeds of the margin (clustered, world metres; season comes from the descriptors)
  ent.push(
    { cluster: 'plant.reed', on: 'cut', edge: true, n: 46, seed: 3 },
    { cluster: 'plant.bulrush', on: 'cut', edge: true, n: 14, seed: 4 },
    { cluster: 'plant.wildflowers', on: 'verge-r', n: 34, seed: 5 },      // purple loosestrife and meadowsweet mix
    { cluster: 'plant.grass-long', on: 'verge-r', n: 60, seed: 6 },
    { cluster: 'plant.fern', on: 'offside', n: 24, seed: 7 },
    { cluster: 'plant.shrub', on: 'offside', n: 18, seed: 8 },
    { cluster: 'plant.hedgerow-blackberry', on: 'hedge-r', n: 12, seed: 9 },
    { cluster: 'water.lily', on: 'cut', n: 9, seed: 10 },
    { cluster: 'ground.leaf-litter', on: 'tow', n: 20, seed: 11 });

  worldAdd('world-test', { id: 'fleet-canal-2-w3', label: 'Basingstoke Canal (world)', site: 'Basingstoke Canal, Pondtail, Fleet', mood: 'calm', colour: 'slate',
    tags: ['uk', 'hampshire', 'fleet', 'canal', 'towpath', 'narrowboat', 'world-v3'], liveSky: { lat: 51.2905, lon: -0.8228 } }, {
    v: 3,
    place: { lat: 51.2905, lon: -0.8228, alt: 68, region: 'hampshire' },
    camera: { eye: 1.65, fov: 64, horizon: 468, heading: 215, water: -0.45 },
    surfaces: [
      { id: 'offside', kind: 'grass', poly: bankL.concat([[-200, 420], [-200, 1]]) },
      { id: 'verge-r', kind: 'grass', poly: towOut.concat([[200, 420], [200, 1]]).reverse() },
      { id: 'cut', kind: 'water', water: 'canal', poly: bankL.concat(bankR.slice().reverse()), shallow: 0.6 },
      { id: 'tow', kind: 'towpath', path: off(7.9), width: 2.6 },
      { id: 'hedge-r', kind: 'hedge', path: off(11.2), width: 1.2 },
    ],
    entities: ent,
    landmarks: [{ obj: 'structure.bridge-brick', at: along(205, 0).at, facing: along(205, 0).h + 90, attach: 'water', src: 'OS Explorer 145; Basingstoke Canal Society bridge list (Pondtail Bridge)' }],
    life: [
      { who: 'walkers', on: 'tow', rate: '6/min', mix: { stroll: 0.5, brisk: 0.2, 'dog-walker': 0.2, jogger: 0.1 }, edges: ['S', 'N'] },
      { who: 'visit', mix: { elderly: 1 }, rate: '1/3min', goals: [{ go: 'bench-1' }, { do: 'sit', for: [20, 60] }, { leave: 'N' }] },
      { who: 'boater', count: 1, goals: [{ go: 'nb2' }, { do: 'idle', for: [10, 30] }, { go: 'tow' }, { do: 'look', for: [5, 15] }, { go: 'nb2' }] },
      { who: 'mallard', count: 8, on: 'cut' },
      { who: 'mute-swan', count: 2, on: 'cut', group: 'pair' },
      { who: 'heron', count: 1, on: 'cut', state: 'stalk' },
      { who: 'moorhen', count: 2, on: 'cut' },
      { who: 'narrowboat-cruising', on: 'cut', every: '6min' },
    ],
    backdrop: { style: 'canal-wooded' },
    seed: 2,
  });
})();
