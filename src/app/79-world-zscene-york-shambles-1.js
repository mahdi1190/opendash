/* ============================================================
   WORLD SCENE (format v3) world-test / york-shambles-1-w3: the Shambles, York.
   The no-example test (WORLD_ENGINE_REQUIREMENTS.md 25, N5) for a medieval street: a place never drawn before, from a SHORT spec.
   The view: standing in the lane looking along it, between two rows of jettied, timber-framed houses whose upper floors nearly
   touch above the street; a sliver of sky, the setts with their central drain, and a lane full of visitors.
     https://www.york.gov.uk/  OS Explorer 290 (York, SE 603 520)
   No fill, no framing, no dressing, no backdrop: the engine's kit and its timber-framed style supply them.
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  worldAdd('world-test', { id: 'york-shambles-1-w3', label: 'The Shambles, York (world)', site: 'The Shambles, York', mood: 'cheerful', colour: 'brick',
    tags: ['uk', 'north-yorkshire', 'york', 'shambles', 'medieval', 'timber-framed', 'lane', 'world-v3'], liveSky: { lat: 53.959, lon: -1.0815 } }, {
    v: 3,
    place: { lat: 53.959, lon: -1.0815, alt: 15, region: 'north-yorkshire', style: 'old-town-lane' },
    camera: { eye: 1.7, fov: 62, horizon: 470, heading: 318 },
    surfaces: [
      { id: 'lane', kind: 'plaza', path: [[0, -6], [0, 40], [3, 70], [3, 122]], width: 3.8 },
      { id: 'cross', kind: 'pavement', path: [[-40, 122], [40, 122]], width: 5 },
    ],
    buildings: [
      { id: 'west', along: 'lane', side: 'left', style: 'timber-framed', storeys: [2, 4], from: 2, to: 119 },
      { id: 'east', along: 'lane', side: 'right', style: 'timber-framed', storeys: [2, 4], from: 2, to: 119 },
      { id: 'end', along: 'cross', side: 'left', style: 'timber-framed', storeys: [3, 4], from: 24, to: 58, depth: [8, 10] },
    ],
    life: [
      { who: 'walkers', on: 'lane', rate: '14/min', mix: { stroll: 0.5, chat: 0.2, family: 0.15, couple: 0.15 }, edges: ['S', 'N'] },
    ],
    seed: 5,
  });
})();
