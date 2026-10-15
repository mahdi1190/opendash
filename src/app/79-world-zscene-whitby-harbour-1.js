/* ============================================================
   WORLD SCENE (format v3) world-test / whitby-harbour-1-w3: Whitby harbour, the Esk from Pier Road, with its landmarks.
   The no-example test of WORLD_ENGINE_REQUIREMENTS.md 25 (N5): a place that was never drawn before, from a SHORT spec (place, camera,
   surfaces, buildings by rule, life, style). No fill, no framing, no backdrop, no seasons: the engine's kit ("quayside") supplies them,
   and the places the eye knows come from the building generator's styles (reusable for any town), not from drawn art:
     the ruined abbey      style 'gothic-ruin', preset 'abbey' (70-scene-gen-3ruin.js): a roofless choir of lancets on the cliff top,
                           the tall north wall with its three tiers seen through the broken south side, the east end and its turrets
     St Mary's church      style 'parish-church', crown 'squat-tower': a long low nave and a square tower, at the head of the steps
     the 199 steps         a `stairs` surface up the cliff between the houses, with railings (the engine draws their treads)
     the East Cliff        rows of 'pantile-cottage' houses (red pantiles, colour-washed and stone walls, gable ends to the lane) in
                           `along` rules on five lanes, stepping up the cliff as the real town does; each lane is broken where the
                           steps cross it
     the swing bridge      style 'swing-bridge': two steel lattice trusses with a camel-back chord over a pivot pier, a cabin on the
                           deck, across the upper harbour that bends away to the right
   The view: standing on the west quay (Pier Road) looking east-north-east across the harbour: fishing boats moored under the east quay,
   Church Street's houses, the East Cliff climbing to St Mary's and the abbey on the top, the harbour bending to the right to the swing
   bridge, the West Cliff beyond. The piers and lighthouses at the harbour mouth are behind the left shoulder (out of the frame).
     https://www.whitby.co.uk/  OS Explorer OL27 (Whitby harbour, NZ 898 111; abbey NZ 903 112; swing bridge NZ 898 108)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the 199 steps: from Church Street up the cliff to the churchyard, between the houses; a railing each side
  const STEPS = [[-104, 157], [-98, 172], [-93, 188], [-88, 202], [-85, 209]];
  const stepX = (z) => {
    for (let i = 1; i < STEPS.length; i++) if (z <= STEPS[i][1]) { const a = STEPS[i - 1], b = STEPS[i]; return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]); }
    return STEPS[STEPS.length - 1][0];
  };
  const rail = (dx) => STEPS.map(p => [Math.round((p[0] + dx) * 10) / 10, p[1]]);
  const zAt = (pts, x) => {
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return Math.round((a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])) * 10) / 10; }
    return pts[pts.length - 1][1];
  };
  /**
   * One lane of the East Cliff with the houses on its far side: the lane's path is cut where the steps cross (a gap of a few metres each
   * side) and in the stretches of `skip` (open turf under the abbey), each piece its own surface with its own `along` rule.
   * -> { surfaces, buildings }
   */
  function lane(id, pts, o) {
    o = o || {};
    const zc = zAt(pts, -90), xa = stepX(zc + 1.2) - 3.4, xb = stepX(zc + 9.5) + 3.4, cuts = [[xa, xb]].concat(o.skip || []).sort((p, q) => p[0] - q[0]);
    const x0 = pts[0][0], x1 = pts[pts.length - 1][0], out = { surfaces: [], buildings: [] };
    let cur = x0, k = 0;
    const piece = (a, b) => {
      if (b - a < 9) return;
      const path = [[Math.round(a * 10) / 10, zAt(pts, a)]].concat(pts.filter(p => p[0] > a && p[0] < b), [[Math.round(b * 10) / 10, zAt(pts, b)]]), sid = id + '-' + k++;
      out.surfaces.push({ id: sid, kind: 'path', path, width: 2.4 });
      out.buildings.push(Object.assign({ id: sid + '-h', along: sid, side: 'left', style: 'pantile-cottage', storeys: o.storeys || [2, 3], shops: false }, o.depth ? { depth: o.depth } : null));
    };
    for (const [s0, s1] of cuts) { if (s0 > cur) piece(cur, Math.min(s0, x1)); cur = Math.max(cur, s1); }
    if (cur < x1) piece(cur, x1);
    return out;
  }
  const L1 = lane('l1', [[-170, 166], [-120, 164.5], [-60, 167], [0, 165.5], [56, 167]]);
  const L2 = lane('l2', [[-170, 178], [-110, 179.5], [-50, 177], [10, 179], [56, 177.5]]);
  const L3 = lane('l3', [[-170, 190], [-100, 188.5], [-40, 191], [20, 189.5], [56, 191]]);
  // the top lane: only at the far ends (under the church and the abbey the cliff is open turf)
  const L4 = lane('l4', [[-170, 201.5], [-110, 203], [-50, 200.5], [10, 202], [50, 201]], { storeys: [2, 2], depth: [4.5, 5.5], skip: [[-96, 16]] });
  worldAdd('world-test', { id: 'whitby-harbour-1-w3', label: 'Whitby harbour (world)', site: 'The River Esk from Pier Road, Whitby', mood: 'cheerful', colour: 'brick',
    tags: ['uk', 'north-yorkshire', 'whitby', 'harbour', 'quay', 'fishing-boats', 'abbey', 'swing-bridge', 'world-v3'], liveSky: { lat: 54.4858, lon: -0.6133 } }, {
    v: 3,
    place: { lat: 54.4858, lon: -0.6133, alt: 4, region: 'north-yorkshire', style: 'quayside' },
    camera: { eye: 3, fov: 66, horizon: 430, heading: 78, water: -3 },
    // the East Cliff (a 36 m ridge along the east quay, ending toward the upper harbour) and the lower West Cliff beyond the bridge
    ground: { features: [
      { kind: 'embankment', path: [[-200, 252], [-25, 252]], width: 184, h: 36 },
      { kind: 'embankment', path: [[170, 320], [420, 320]], width: 230, h: 24 },
    ] },
    surfaces: [
      { id: 'quay-w', kind: 'plaza', poly: [[-150, 1], [150, 1], [150, 14], [-150, 14]] },
      // the harbour, bending away to the right as the upper harbour toward the swing bridge
      { id: 'esk', kind: 'water', water: 'harbour', poly: [[-400, 14], [122, 14], [122, 430], [70, 430], [70, 150], [-400, 150]], shallow: 1.5 },
      { id: 'church-st', kind: 'pavement', path: [[-400, 152], [72, 152]], width: 6 },
      { id: 'bank-e', kind: 'pavement', path: [[68, 152], [68, 430]], width: 4 },
      { id: 'bank-w', kind: 'pavement', path: [[124, 14], [124, 430]], width: 4 },
      { id: 'town-w', kind: 'grass', poly: [[126, 14], [400, 14], [400, 430], [126, 430]] },
      { id: 'cliff', kind: 'grass', poly: [[-400, 160], [66, 160], [66, 430], [-400, 430]] },
      { id: 'w-lane', kind: 'path', path: [[146, 150], [146, 430]], width: 3 },
      { id: 'steps', kind: 'stairs', path: STEPS, width: 2.2, from: 'ground', to: 'ground' },
    ].concat(L1.surfaces, L2.surfaces, L3.surfaces, L4.surfaces),
    lines: [
      { id: 'steps-rail-l', kind: 'railing', path: rail(-1.4) }, { id: 'steps-rail-r', kind: 'railing', path: rail(1.4) },
    ],
    buildings: [
      // Church Street along the east quay (broken at the foot of the steps), the lanes above it, the two banks of the upper harbour
      { id: 'q-a', along: 'church-st', side: 'left', style: 'pantile-cottage', storeys: [2, 3], from: 230, to: 297, shops: false },
      { id: 'q-b', along: 'church-st', side: 'left', style: 'pantile-cottage', storeys: [2, 3], from: 306, to: 458, shops: false },
    ].concat(L1.buildings, L2.buildings, L3.buildings, L4.buildings, [
      { id: 'be-a', along: 'bank-e', side: 'left', style: 'pantile-cottage', storeys: [2, 3], from: 8, to: 38, shops: false },
      { id: 'be-b', along: 'bank-e', side: 'left', style: 'pantile-cottage', storeys: [2, 3], from: 58, to: 190, shops: false },
      { id: 'bw-a', along: 'bank-w', side: 'right', style: 'pantile-cottage', storeys: [2, 3], from: 134, to: 184, shops: false },
      { id: 'bw-b', along: 'bank-w', side: 'right', style: 'pantile-cottage', storeys: [2, 3], from: 216, to: 400, shops: false },
      { id: 'bw2', along: 'w-lane', side: 'right', style: 'pantile-cottage', storeys: [2, 3], from: 0, to: 10000, shops: false, depth: [7, 10] },
      // the landmarks (`landmark: true`: the fill never plants a tree across their faces); the abbey is turned a few degrees to the quay
      { id: 'st-marys', foot: [[-88, 212], [-64, 212], [-64, 222], [-88, 222]], storeys: 1, h: 16, landmark: true, style: 'parish-church', crown: 'squat-tower', src: "OS Explorer OL27: St Mary's church on the East Cliff, Whitby (NZ 902 112)" },
      { id: 'abbey', foot: [[-46, 206], [11.5, 234.1], [1.0, 255.7], [-56.5, 227.6]], storeys: 1, h: 28, landmark: true, style: 'gothic-ruin', crown: 'abbey', src: 'OS Explorer OL27: Whitby Abbey on the East Cliff (NZ 903 112)' },
      { id: 'swing-bridge', foot: [[68, 196], [124, 196], [124, 204], [68, 204]], storeys: 1, h: 8, landmark: true, style: 'swing-bridge', src: 'OS Explorer OL27: the swing bridge over the Esk, Whitby (NZ 898 108)' },
    ]),
    entities: [
      // the fleet under the east quay and in the upper harbour, and a few boats on the near side
      { obj: 'boat.fishing-boat', at: [-30, 143], facing: 90 }, { obj: 'boat.fishing-boat', at: [20, 143], facing: 90 }, { obj: 'boat.fishing-boat', at: [-96, 142], facing: 90 },
      { obj: 'boat.fishing-boat', at: [78, 170], facing: 0 }, { obj: 'boat.fishing-boat', at: [116, 240], facing: 0 },
      { obj: 'boat.dinghy', at: [14, 34], facing: 80 }, { obj: 'boat.dinghy', at: [-22, 44], facing: 100 },
      { obj: 'street.bench', at: [-3, 11], facing: 0, id: 'bench-q1' },
    ],
    life: [
      { who: 'walkers', on: 'quay-w', rate: '14/min', mix: { stroll: 0.5, chat: 0.2, family: 0.15, 'dog-walker': 0.15 }, edges: ['W', 'E'] },
      { who: 'visit', mix: { elderly: 0.6, stroll: 0.4 }, rate: '1/min', goals: [{ go: 'bench-q1' }, { do: 'sit', for: [20, 70] }, { leave: 'E' }] },
      // Church Street along the east quay: a few people on the far pavement
      { who: 'walkers', on: 'church-st', rate: '4/min', mix: { stroll: 0.6, chat: 0.2, family: 0.2 }, edges: ['W', 'E'] },
      { who: 'gulls', count: 10 },
      { who: 'mallard', count: 4, on: 'esk' },
    ],
    seed: 21,
  });
})();
