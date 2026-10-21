/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-winter-garden-1-w3: the Winter Garden and Tudor Square, Sheffield city centre.
   Scaffolded by `node tools/world.mjs new sheffield-winter-garden --setting civic-square`, then composed by hand.
   The view (one camera, standing at the edge of the gardens looking north-east, eye 3 m on the top step): on the right the Winter
   Garden's long glass vault on its larch arches (palms and pines inside, lit after dusk), its glazed end with the entrance toward us;
   ahead and to the left the paved square closed by the Millennium Gallery's white portal frames over glass, the 1970s brick Crucible and
   the Edwardian Lyceum with its domed corner turret; the Town Hall's sandstone clock tower rising over the gallery; St Paul's Tower
   beside the Winter Garden on the right; the Supertram crossing the square on its street; in the near left the gardens' lawn, trees
   and the fountain jets; coffee kiosks, benches, a busker, pigeons, shoppers, office workers and students.
   Landmarks (real buildings, real shape and material; the LAYOUT is compressed, not surveyed: the gallery, the theatres and the Winter
   Garden do enclose Tudor Square, the Town Hall and the Peace Gardens lie about 150 m west; the Supertram runs one street away):
     Winter Garden (2003): 70 m x 22 m x 21 m, glulam larch parabolic arches and glass   (Sheffield City Council; Museums Sheffield)
     Millennium Gallery (2001): white portal frames over a glazed front                    (Museums Sheffield)
     Crucible Theatre (1971): brown brick and glass; Lyceum Theatre (1897): cream stucco, domed corner turret   (Sheffield Theatres)
     Town Hall (1897): Stoke Hall sandstone, a 64 m corner clock tower                     (Historic England list entry 1247069)
     St Paul's Tower (2010): a slim white residential tower by the Winter Garden          (OS map)
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  /** A footprint from a front edge (two points, the street side) and a depth behind it (to the left of the edge's direction). */
  const block = (p0, p1, depth) => {
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1], L = Math.hypot(dx, dz), nx = -dz / L * depth, nz = dx / L * depth, r = (v) => Math.round(v * 10) / 10;
    return [p0, p1, [r(p1[0] + nx), r(p1[1] + nz)], [r(p0[0] + nx), r(p0[1] + nz)]];
  };
  const ents = [];
  // the gardens' fountain: jets in a ring rising from the granite (the Goodwin Fountain's kind; a pool beside it was tried and dropped:
  // walkers' low-sun shadows fell on it, which the engine rules out)
  // (a tall jet in the middle, a ring of middle ones and an outer ring of low ones: a cluster reads as a fountain, a row of tall ones as posts)
  const R1 = (v) => Math.round(v * 10) / 10;
  for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; ents.push({ obj: 'water.shc-jet', at: [R1(-12 + Math.cos(t) * 3.4), R1(23 + Math.sin(t) * 2.8)], variant: 0 }); }
  for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5 * Math.PI * 2; ents.push({ obj: 'water.shc-jet', at: [R1(-12 + Math.cos(t) * 1.7), R1(23 + Math.sin(t) * 1.4)], variant: 1 }); }
  ents.push({ obj: 'water.shc-jet', at: [-12, 23], variant: 2 });
  // the gardens' trees on the lawn, and plane trees in pits along the square
  for (const [x, z, o] of [[-34, 14, 'tree.plane-avenue'], [-44, 30, 'tree.plane-avenue'], [-56, 20, 'tree.green-chestnut'], [-38, 6, 'tree.green-birch']]) ents.push({ obj: o, at: [x, z] });
  // two coffee kiosks with their parasols on the square, benches facing the fountain and the Winter Garden, a busker by the kiosks
  ents.push({ obj: 'building.kiosk', at: [9, 30], facing: 230, id: 'kiosk-a', model: { livery: 'navy-cream', seed: 4, opts: { kind: 'tea' } } });
  ents.push({ obj: 'building.kiosk', at: [24, 36], facing: 215, id: 'kiosk-b', model: { livery: 'mint-white', seed: 9, opts: { kind: 'tea' } } });
  ents.push({ obj: 'street.bench', at: [-7, 17], facing: 260, id: 'bench-a' }, { obj: 'street.bench', at: [-2, 35], facing: 250, id: 'bench-b' }, { obj: 'street.bench', at: [7.5, 20.5], facing: 215, id: 'bench-c' });
  ents.push({ obj: 'person.busker', at: [2.5, 26], facing: 200, id: 'busker' });
  // tables out in front of the coffee kiosks, tubs of flowers by the benches, a planter row along the gardens' edge
  ents.push({ obj: 'street.mqn-parasol', at: [12.5, 25.5] }, { obj: 'person.cafe-goer', at: [11.4, 23.6], facing: 230 }, { obj: 'street.mqn-parasol', at: [18.5, 29] }, { obj: 'person.cafe-goer', at: [19.6, 27.4], facing: 200 });
  ents.push({ obj: 'plant.rph-flower-tub', at: [-4.6, 15.6] }, { obj: 'plant.rph-flower-tub', at: [-0.4, 33.8] }, { obj: 'plant.rph-flower-tub', at: [35, 21.6] });
  for (const [x, z] of [[-21, 12], [-21.5, 20], [-22, 36], [-16.5, 30.5], [12.5, 14]]) ents.push({ obj: 'structure.mcr-planter', at: [x, z] });
  // (kept off the walking lines between the fountain, the busker and the kiosks: a bench there made a pinch where walkers met)
  ents.push({ obj: 'plant.rph-flower-tub', at: [15.5, 17] }, { obj: 'plant.rph-flower-tub', at: [24.5, 26.5] }, { obj: 'plant.rph-flower-tub', at: [-17.5, 16.5] }, { obj: 'plant.rph-flower-tub', at: [-7.2, 13.4] }, { obj: 'plant.rph-flower-tub', at: [20.5, 21.5] });
  ents.push({ obj: 'street.bench', at: [-18.4, 23.6], facing: 90 }, { obj: 'street.bench', at: [-6.8, 33.5], facing: 200 });
  // the framing foreground: a lamp standard at each side of the near square (the kit found no legal place for one)
  ents.push({ obj: 'street.lamppost', at: [-8.6, 10.2], id: 'lamp-l' }, { obj: 'street.lamppost', at: [9.4, 10.6], id: 'lamp-r' });
  worldAdd('world-test', { id: 'sheffield-winter-garden-1-w3', label: 'Winter Garden and Tudor Square, Sheffield (world)', site: 'The Winter Garden and Tudor Square, Sheffield city centre', mood: 'cheerful', colour: 'teal',
    tags: ['uk', 'south-yorkshire', 'sheffield', 'winter-garden', 'glasshouse', 'tudor-square', 'theatre', 'town-hall', 'tram', 'world-v3'], liveSky: { lat: 53.3795, lon: -1.4683 },
    ukPlace: 'sheffield-centre', county: 'south-yorkshire', ukTown: 'Sheffield', ukView: 'world-engine', setting: 'a city square under a great glasshouse' }, {
    v: 3,
    place: { lat: 53.3795, lon: -1.4683, alt: 75, region: 'south-yorkshire', style: 'civic-square' },
    camera: { eye: 3, fov: 84, horizon: 575, heading: 60 },
    surfaces: [
      // the gardens' lawn, its corner reaching into the view behind the fountain
      { id: 'gardens', kind: 'grass', poly: [[-110, 2], [-25, 2], [-25, 27], [-13, 27], [-13, 41.5], [-110, 41.5]] },
      { id: 'square', kind: 'plaza', poly: [[-25, 2], [150, 2], [150, 43.5], [-110, 43.5], [-110, 41.5], [-13, 41.5], [-13, 27], [-25, 27]] },
      { id: 'kerb', kind: 'pavement', poly: [[-220, 43.5], [220, 43.5], [220, 51], [-220, 51]] },
      { id: 'tramline', kind: 'tram', path: [[-220, 47.3], [220, 47.3]], width: 3.4 },
      { id: 'cross-a', kind: 'crossing', path: [[-12, 43.5], [-12, 51]], width: 4 },
      { id: 'cross-b', kind: 'crossing', path: [[32, 43.5], [32, 51]], width: 4 },
      // the square's far part; it stops where a walker would be seen THROUGH the Winter Garden's glass (behind its near end, past its far end)
      { id: 'tudor', kind: 'plaza', poly: [[-80, 51], [150, 51], [150, 88], [70, 88], [67, 89.5], [3.7, 55.9], [-7.4, 76.6], [-30.5, 105.1], [-32, 113.8], [-38, 87.8], [-39, 83.7], [-46, 57.7], [-80, 57.7]] },
      // the gallery's forecourt in the angle between the Winter Garden and the gallery front (paved, no through walkers)
      { id: 'forecourt', kind: 'pavement', poly: [[-7.4, 76.6], [1.6, 89.1], [-30.5, 105.1]] },
    ],
    buildings: [
      { id: 'lyceum', foot: block([-47, 58], [-40, 84], 22), storeys: 3, style: 'theatre-edwardian', crown: 'corner-dome', landmark: true },
      { id: 'crucible', foot: block([-39, 88], [-33, 114], 24), storeys: 3, style: 'theatre-brick-1970s', landmark: true },
      { id: 'gallery', foot: block([-30, 106], [2, 90], 14), storeys: 2, style: 'gallery-portal', landmark: true },
      { id: 'town-hall', foot: block([-68, 190], [-30, 184], 32), storeys: 4, style: 'civic-sandstone', crown: 'town-hall-tower', landmark: true },
      { id: 'st-pauls', foot: block([88, 168], [104, 175], 17), storeys: 28, style: 'tower-white' },
    ],
    entities: ents,
    landmarks: [
      { id: 'winter-garden', obj: 'structure.glasshouse', at: [28, 82], facing: 62, src: 'Sheffield Winter Garden (2003): 70 x 22 x 21 m, glulam larch arches; Museums Sheffield / Sheffield City Council', model: { livery: 'larch', seed: 7 } },
    ],
    life: [
      { who: 'crowd', on: 'square', rate: '20/min', mix: { commuter: 0.28, shopper: 0.25, stroll: 0.2, couple: 0.2, elderly: 0.07 }, edges: ['W', 'E', 'S'] },
      // the far square is crossed, not lingered on (groups that stopped to chat there stood at the frame's edge)
      { who: 'crowd', on: 'tudor', rate: '11/min', mix: { commuter: 0.4, shopper: 0.3, brisk: 0.15, stroll: 0.15 }, edges: ['W', 'E'] },
      { who: 'visit', mix: { elderly: 0.4, stroll: 0.3, couple: 0.3 }, rate: '1/min', goals: [{ go: 'bench-a' }, { do: 'sit', for: [25, 80] }, { leave: 'S' }] },
      { who: 'visit', mix: { stroll: 0.6, elderly: 0.4 }, rate: '1/min', goals: [{ go: 'bench-c' }, { do: 'sit', for: [25, 80] }, { leave: 'E' }] },
      { who: 'visit', mix: { stroll: 0.5, shopper: 0.3, elderly: 0.2 }, rate: '1/40s', goals: [{ view: 'busker', for: [15, 45] }, { leave: 'E' }] },
      { who: 'visit', mix: { commuter: 0.5, shopper: 0.5 }, rate: '1/50s', goals: [{ view: 'kiosk-a', for: [10, 30] }, { leave: 'W' }] },
      { who: 'pigeons', count: 7, on: 'tudor' },
      { who: 'tram', on: 'tramline', every: '3min' },
    ],
    backdrop: { style: 'city-sheffield-hills' },
    seed: 21,
  });
})();
