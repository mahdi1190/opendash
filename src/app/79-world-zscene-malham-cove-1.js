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
    ground: { features: [{ kind: 'cliff', arc: { c: [0, 110], r: 190, from: -85, to: 85 }, h: 70, rock: 'limestone' }] },
    surfaces: [
      { id: 'valley', kind: 'grass', poly: [[-500, 1], [500, 1], [500, 330], [-500, 330]] },
      { id: 'beck', kind: 'water', water: 'river', path: [[-4, 224], [10, 200], [-8, 165], [-34, 128], [-22, 80], [26, 40], [58, 4]], width: 2.4, shallow: 0.35 },
      { id: 'path', kind: 'path', path: [[34, 2], [24, 40], [4, 88], [16, 140], [8, 196], [-2, 218]], width: 1.8 },
    ],
    lines: [
      { id: 'wall-w', kind: 'wall', path: [[-96, 4], [-92, 110], [-88, 214]] },
      { id: 'wall-e', kind: 'wall', path: [[76, 4], [72, 120], [66, 214]], gaps: [{ at: 60, w: 1.6 }] },
      { id: 'wall-x', kind: 'wall', path: [[-92, 150], [-30, 156]] },
    ],
    entities: [
      { obj: 'structure.packhorse-bridge', at: [-14, 104], facing: 90, id: 'bridge' },
    ],
    life: [
      { who: 'walkers', on: 'path', rate: '2/min', mix: { stroll: 0.4, brisk: 0.3, 'dog-walker': 0.3 }, edges: ['S'] },
      { who: 'sheep', count: 7 },
    ],
    seed: 31,
  });
})();
