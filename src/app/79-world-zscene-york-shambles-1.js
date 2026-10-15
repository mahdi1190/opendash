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
  // the church's footprint in the camera frame: 30 m west front, 150 m long, centred 235 m ahead, axis turned 14 degrees
  const MINSTER = (() => { const a = -0.03, c = Math.cos(a), s = Math.sin(a); return [[-15, 0], [15, 0], [15, 150], [-15, 150]].map(([x, d]) => [Math.round((x * c - d * s + 1.5) * 10) / 10, Math.round((x * s + d * c + 285) * 10) / 10]); })();
  worldAdd('world-test', { id: 'york-shambles-1-w3', label: 'The Shambles, York (world)', site: 'The Shambles, York', mood: 'cheerful', colour: 'brick',
    tags: ['uk', 'north-yorkshire', 'york', 'shambles', 'medieval', 'timber-framed', 'lane', 'world-v3'], liveSky: { lat: 53.959, lon: -1.0815 } }, {
    v: 3,
    place: { lat: 53.959, lon: -1.0815, alt: 15, region: 'north-yorkshire', style: 'old-town-lane' },
    camera: { eye: 1.7, fov: 62, horizon: 590, heading: 318 },
    surfaces: [
      { id: 'lane', kind: 'plaza', path: [[0, -6], [0, 40], [3, 70], [3, 122]], width: 3.8 },
      { id: 'cross', kind: 'pavement', path: [[-40, 122], [40, 122]], width: 5 },
    ],
    buildings: [
      { id: 'minster', foot: MINSTER, storeys: 4, style: 'gothic-minster', crown: 'twin-towers' },
      // the Shambles was the street of the butchers: the first houses on each side still keep their stall boards and hooks, then the mix of today
      { id: 'west-0', along: 'lane', side: 'left', style: 'timber-framed', storeys: [2, 3], from: 2, to: 6.4, shops: false },
      { id: 'west-a', along: 'lane', side: 'left', style: 'timber-framed', storeys: [2, 3], from: 6.4, to: 21, shops: ['butcher', 'butcher', 'deli'] },
      { id: 'west', along: 'lane', side: 'left', style: 'timber-framed', storeys: [2, 3], from: 21, to: 119 },
      { id: 'east-0', along: 'lane', side: 'right', style: 'timber-framed', storeys: [2, 3], from: 2, to: 8.2, shops: false },
      { id: 'east-a', along: 'lane', side: 'right', style: 'timber-framed', storeys: [2, 3], from: 8.2, to: 24, shops: ['butcher', 'bakery', 'butcher'] },
      { id: 'east', along: 'lane', side: 'right', style: 'timber-framed', storeys: [2, 3], from: 24, to: 119 },
      { id: 'end', along: 'cross', side: 'left', style: 'timber-framed', storeys: [2, 3], from: 24, to: 58, depth: [8, 10] },
    ],
    life: [
      { who: 'walkers', on: 'lane', rate: '9/min', mix: { stroll: 0.6, chat: 0.15, couple: 0.25 }, edges: ['S', 'N'] },
    ],
    seed: 5,
  });
})();
