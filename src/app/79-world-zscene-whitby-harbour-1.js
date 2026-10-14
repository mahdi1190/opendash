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
  const rows = (obj, z, from, to, step, facing) => { const out = []; for (let x = from; x <= to; x += step) out.push({ obj, at: [x, z], facing }); return out; };
  worldAdd('world-test', { id: 'whitby-harbour-1-w3', label: 'Whitby harbour (world)', site: 'The River Esk from Pier Road, Whitby', mood: 'cheerful', colour: 'brick',
    tags: ['uk', 'north-yorkshire', 'whitby', 'harbour', 'quay', 'fishing-boats', 'world-v3'], liveSky: { lat: 54.4858, lon: -0.6133 } }, {
    v: 3,
    place: { lat: 54.4858, lon: -0.6133, alt: 4, region: 'north-yorkshire', style: 'quayside' },
    camera: { eye: 1.7, fov: 66, horizon: 430, heading: 78, water: -3 },
    ground: { features: [{ kind: 'embankment', path: [[-60, 170], [400, 170]], width: 150, h: 36 }] },
    surfaces: [
      { id: 'quay-w', kind: 'plaza', poly: [[-120, 1], [120, 1], [120, 18], [-120, 18]] },
      { id: 'esk', kind: 'water', water: 'harbour', poly: [[-400, 18], [400, 18], [400, 100], [-400, 100]], shallow: 1.5 },
      { id: 'quay-e', kind: 'pavement', path: [[-400, 104], [400, 104]], width: 7 },
      { id: 'cliff', kind: 'grass', poly: [[-110, 107.5], [400, 107.5], [400, 330], [-110, 330]] },
      { id: 'sea', kind: 'water', water: 'sea', poly: [[-400, 100], [-110, 100], [-110, 420], [-400, 420]] },
      { id: 'west-head', kind: 'grass', poly: [[-225, 120], [-180, 120], [-180, 200], [-225, 200]] },
    ],
    entities: [
      // the fleet under the east quay and a few boats on the near side
      { obj: 'boat.fishing-boat', at: [-22, 94], facing: 90 }, { obj: 'boat.fishing-boat', at: [6, 95], facing: 270 }, { obj: 'boat.fishing-boat', at: [34, 94], facing: 90 },
      { obj: 'boat.fishing-boat', at: [-70, 93], facing: 90 }, { obj: 'boat.dinghy', at: [14, 24], facing: 80 }, { obj: 'boat.dinghy', at: [-18, 28], facing: 100 },
      // the terraces of Church Street and the lanes above, in rows up the slope, then St Mary's on the crest
      ...rows('building.terrace-victorian', 114, -90, 140, 24, 180), ...rows('building.cottage', 132, -85, 120, 21, 180), ...rows('building.terrace-victorian', 152, -70, 150, 26, 180),
      ...rows('building.cottage', 178, -80, 110, 23, 180), { obj: 'building.church', at: [20, 198], facing: 180, id: 'st-marys' },
      { obj: 'building.lighthouse', at: [-200, 176], facing: 90, id: 'pier-light' },
      // the quay's own kit: bollards and lamps along the edge
      ...rows('street.bollard', 17, -100, 100, 16, 0), ...rows('street.lamppost', 13, -90, 90, 30, 0),
      { obj: 'street.bench', at: [-34, 11], facing: 0, id: 'bench-q1' }, { obj: 'street.bench', at: [48, 11], facing: 0, id: 'bench-q2' },
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
