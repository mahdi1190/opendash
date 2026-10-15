/* ============================================================
   WORLD SCENE (format v3) world-test / whitby-harbour-1-w3: Whitby harbour, the Esk from Pier Road.
   The no-example test of WORLD_ENGINE_REQUIREMENTS.md 25 (N5): a place that was never drawn before, from a SHORT spec (place, camera,
   surfaces, a few key entities, life, style). No fill, no framing, no backdrop, no seasons: the engine's kit ("quayside") supplies them.
   The view: standing on the west quay looking east across the harbour: fishing boats moored under the east quay, Church Street's
   terraces climbing the East Cliff in rows, St Mary's church at the top; the harbour piers and lighthouse far left.
     https://www.whitby.co.uk/  OS Explorer OL27 (Whitby harbour, NZ 898 111)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', { id: 'whitby-harbour-1-w3', label: 'Whitby harbour (world)', site: 'The River Esk from Pier Road, Whitby', mood: 'cheerful', colour: 'brick',
    tags: ['uk', 'north-yorkshire', 'whitby', 'harbour', 'quay', 'fishing-boats', 'world-v3'], liveSky: { lat: 54.4858, lon: -0.6133 } }, {
    v: 3,
    place: { lat: 54.4858, lon: -0.6133, alt: 4, region: 'north-yorkshire', style: 'quayside' },
    camera: { eye: 3, fov: 66, horizon: 430, heading: 78, water: -3 },
    ground: { features: [{ kind: 'embankment', path: [[-60, 252], [400, 252]], width: 184, h: 36 }] },
    surfaces: [
      { id: 'quay-w', kind: 'plaza', poly: [[-150, 1], [150, 1], [150, 14], [-150, 14]] },
      { id: 'esk', kind: 'water', water: 'harbour', poly: [[-400, 14], [400, 14], [400, 150], [-400, 150]], shallow: 1.5 },
      { id: 'quay-e', kind: 'pavement', path: [[-400, 152], [400, 152]], width: 6 },
      { id: 'cliff', kind: 'grass', poly: [[-110, 155], [400, 155], [400, 330], [-110, 330]] },
      { id: 'sea', kind: 'water', water: 'sea', poly: [[-400, 150], [-110, 150], [-110, 420], [-400, 420]] },
      { id: 'west-head', kind: 'grass', poly: [[-240, 170], [-190, 170], [-190, 260], [-240, 260]] },
    ],
    // the terraces of Church Street and the lanes above, in rows up the slope (the engine cuts each long footprint into houses)
    buildings: [
      { id: 'cs-a1', foot: [[-104, 158], [-30, 158], [-30, 166], [-104, 166]], storeys: 3, style: 'victorian-terrace' }, { id: 'cs-a2', foot: [[-22, 158], [70, 158], [70, 166], [-22, 166]], storeys: 3, style: 'victorian-terrace' },
      { id: 'cs-a3', foot: [[78, 158], [170, 158], [170, 166], [78, 166]], storeys: 2, style: 'victorian-terrace' },
      { id: 'cs-b1', foot: [[-104, 172], [-6, 172], [-6, 179], [-104, 179]], storeys: 2, style: 'stone-cottage' }, { id: 'cs-b2', foot: [[4, 172], [160, 172], [160, 179], [4, 179]], storeys: 2, style: 'stone-cottage' },
      { id: 'cs-c1', foot: [[-104, 185], [-30, 185], [-30, 193], [-104, 193]], storeys: 3, style: 'victorian-terrace' }, { id: 'cs-c2', foot: [[-20, 185], [90, 185], [90, 193], [-20, 193]], storeys: 3, style: 'victorian-terrace' },
      { id: 'cs-c3', foot: [[100, 185], [190, 185], [190, 193], [100, 193]], storeys: 3, style: 'victorian-terrace' },
      { id: 'cs-d1', foot: [[-100, 198], [40, 198], [40, 205], [-100, 205]], storeys: 2, style: 'stone-cottage' }, { id: 'cs-d2', foot: [[52, 198], [200, 198], [200, 205], [52, 205]], storeys: 2, style: 'stone-cottage' },
    ],
    entities: [
      // the fleet under the east quay and a few boats on the near side
      { obj: 'boat.fishing-boat', at: [-30, 143], facing: 90 }, { obj: 'boat.fishing-boat', at: [8, 144], facing: 270 }, { obj: 'boat.fishing-boat', at: [52, 143], facing: 90 },
      { obj: 'boat.fishing-boat', at: [-96, 142], facing: 90 }, { obj: 'boat.dinghy', at: [14, 34], facing: 80 }, { obj: 'boat.dinghy', at: [-22, 44], facing: 100 },
      // St Mary's on the crest of the cliff, and the lighthouse on the west head
      { obj: 'building.church', at: [30, 238], facing: 180, id: 'st-marys' }, { obj: 'building.lighthouse', at: [-215, 232], facing: 90, id: 'pier-light' },
      { obj: 'street.bench', at: [-3, 11], facing: 0, id: 'bench-q1' },
    ],
    life: [
      { who: 'walkers', on: 'quay-w', rate: '14/min', mix: { stroll: 0.5, chat: 0.2, family: 0.15, 'dog-walker': 0.15 }, edges: ['W', 'E'] },
      { who: 'visit', mix: { elderly: 0.6, stroll: 0.4 }, rate: '1/min', goals: [{ go: 'bench-q1' }, { do: 'sit', for: [20, 70] }, { leave: 'E' }] },
      { who: 'gulls', count: 8 },
      { who: 'mallard', count: 4, on: 'esk' },
    ],
    seed: 21,
  });
})();
