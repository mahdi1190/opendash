/* ============================================================
   WORLD SCENE (format v3) world-test / malham-cove-1-w3: Malham Cove, the Yorkshire Dales.
   The second no-example test of WORLD_ENGINE_REQUIREMENTS.md 25 (N5): a place that was never drawn, from a SHORT spec, and the one that
   showed the engine's terrain was only good enough for a hill with houses. Everything that makes this view (the 70 m limestone face with
   its beds, joints, ledges and trees, the scree at its foot, the walls up the pasture, the beck, the sheep) is the engine's: the spec says
   only where the cliff is, how high, what rock, and what lives in the valley.
   The view: on the valley floor 250 m south of the cove, looking north (heading 0) up the pasture to the foot of the amphitheatre:
   the beck running out from the foot, the path winding up to it, dry-stone walls running up the fields, sheep and walkers.
     https://www.yorkshiredales.org.uk/  OS Explorer OL2 (Malham Cove, SD 897 641); Malham Beck rises at the foot of the cove
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', { id: 'malham-cove-1-w3', label: 'Malham Cove (world)', site: 'The valley floor below Malham Cove, Yorkshire Dales', mood: 'calm', colour: 'slate',
    tags: ['uk', 'north-yorkshire', 'malham', 'cove', 'limestone', 'cliff', 'dales', 'world-v3'], liveSky: { lat: 54.0715, lon: -2.165 } }, {
    v: 3,
    place: { lat: 54.0715, lon: -2.165, alt: 230, region: 'north-yorkshire', style: 'dale' },
    camera: { eye: 1.7, fov: 66, horizon: 580, heading: 0 },
    ground: { features: [
      // the amphitheatre: the engine makes the face irregular (buttresses and recesses, a stained scoop in the middle, scree gathered in fans
      // of different size, a pavement at the lip); the spec only asks for a little more of it and a talus with real fans
      { kind: 'cliff', arc: { c: [0, 110], r: 190, from: -90, to: 90 }, h: 70, rock: 'limestone', rough: 1.5, scree: { w: 46, h: 17 } },
      { kind: 'bank', path: [[185, 150], [165, 300]], width: 170, h: 46 },        // the dale side rising in front of the cove's right horn
    ] },
    surfaces: [
      { id: 'valley', kind: 'grass', poly: [[-500, 1], [500, 1], [500, 330], [-500, 330]] },
      // two named stretches of the same pasture for the sheep: the near meadow and the hillside under the cove's right horn
      { id: 'meadow', kind: 'grass', poly: [[-100, 40], [30, 40], [30, 120], [-100, 120]] },
      { id: 'hillside', kind: 'grass', poly: [[90, 190], [330, 190], [330, 330], [90, 330]] },
      // Malham Beck rises at the foot of the cove and runs out toward the lens, then bends away to the left
      { id: 'beck', kind: 'water', water: 'river', path: [[2, 283], [-6, 262], [-10, 240], [-30, 205], [-26, 170], [-34, 125], [-24, 82], [-6, 54], [2, 37], [-4, 25], [-16, 16]], width: 2.6, shallow: 0.35 },
      { id: 'path', kind: 'path', path: [[20, 11], [14, 32], [30, 60], [38, 100], [22, 150], [28, 200], [12, 240], [4, 262]], width: 1.8 },
    ],
    lines: [
      { id: 'wall-w', kind: 'wall', path: [[-62, 8], [-58, 130], [-52, 262]] },
      { id: 'wall-e', kind: 'wall', path: [[50, 8], [46, 130], [42, 262]] },
      { id: 'wall-x', kind: 'wall', path: [[40, 168], [24, 167], [2, 165]], gaps: [{ at: [24, 167], w: 3.6 }] },
      // the dale side: walls climbing the flank of the hill, and one along its foot (the boundary of the pasture). They stay inside the
      // cove (a wall behind the face would be drawn over it): 185 m or less from the centre of the arc
      { id: 'wall-h1', kind: 'wall', path: [[90, 196], [116, 200], [142, 195]] },
      { id: 'wall-h2', kind: 'wall', path: [[90, 228], [110, 232], [128, 228]] },
      { id: 'wall-h3', kind: 'wall', path: [[90, 255], [101, 259]] },
      { id: 'wall-h4', kind: 'wall', path: [[90, 190], [92, 226], [88, 262]] },
    ],
    entities: [
      { obj: 'tree.hawthorn', at: [-56, 120], id: 'thorn-1' }, { obj: 'tree.hawthorn', at: [40, 180], id: 'thorn-2' },
    ],
    life: [
      { who: 'walkers', on: 'path', rate: '2/min', mix: { stroll: 0.4, brisk: 0.3, 'dog-walker': 0.3 }, edges: ['S'] },
      { who: 'sheep', count: 4 },
      { who: 'sheep', count: 4, on: 'meadow' },
      { who: 'sheep', count: 6, on: 'hillside' },
    ],
    seed: 31,
  });
})();
