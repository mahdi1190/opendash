/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-manchester-centre-3-w3: Peter Street and the Midland Hotel, Manchester.
   Converted by `node tools/world.mjs convert uk-north-manchester-centre/greater-manchester-manchester-centre-3`, then rebuilt by hand
   (22 Oct): the draft had no buildings (every footprint dropped as `unknownSize`), the Midland was removed (its pinned drawing's 120 m
   length, centred on its corner, covered Peter Street's pavement), the traffic was an unknown population and the square ran as bare
   paving to the horizon.
   The view (one camera, as the v2 view 3): from the top of the Central Library's portico steps (eye 2.6 m), looking south-west over
   St Peter's Square's tram stop and across Peter Street to the Midland Hotel. The tram line is the leading line: it runs from under our
   feet down the stop between its two platforms and away past the Midland's flank down Lower Mosley Street, trams coming head on and
   going away. One St Peter's Square's glass wall rises on the left; Peter Street's Victorian palazzi run off on the right; the city's
   towers (Beetham Tower) stand far off over the roofs. Framing: the square's plane trees at both sides (the v2 view's portico
   column cannot stand as a world object: see the entities).
   Life: Metrolink trams in and out of the stop, people waiting on the platforms, the crowd on the square, buses, black cabs, cars and
   bikes along Peter Street, walkers on both its pavements.
   Landmarks (real buildings, real shape and material; the camera frame is the v2 view's: x to the right, z ahead, metres):
     The Midland Hotel, Peter Street (Charles Trubshaw, 1903): red brick and buff-brown terracotta, round domed corner turrets;
       Historic England list entry 1270423 (Grade II*). Built by the generator (style `mcr-terracotta-hotel`, 70-scene-gen-style-
       manchester-midland.js) on the v2 lib's footprint (SCENE_MCR_SPEC.midland[0]), set back 1.5 to 4 m to clear its pavement.
     One St Peter's Square (2014): a 14-storey glass and pale-metal office slab, generated (`modern-glass`). Its footprint runs to the
       tram stop's edge: a wall seen this obliquely is drawn over whatever stands in front of it (statics are ordered by their nearest
       z), so nothing may stand between it and the platform.
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const ents = [];
  // the stop: a canopy on each platform, people waiting under and beside them
  // (the shelters stand at the far half of the platforms: the stop is where a tram halts, and with them at 28 m a coupled pair's nose
  // halted 7.9 m from the lens)
  // (the shelters stand 10 m off the line's centre: nearer, the trams halt there, and the riders they set down were both put on one spot,
  // 0 m apart (personalSpace, an engine fault of the tram stop); a tram at 4.5 m swung a section into the shelter on the curve)
  ents.push({ obj: 'street.mcr-tram-shelter', at: [3.4, 39], id: 'stop-l' }, { obj: 'street.mcr-tram-shelter', at: [19.6, 53], id: 'stop-r' });
  ents.push({ obj: 'person.phone-idler', at: [1.2, 37.2] }, { obj: 'person.elderly-walker', at: [6.4, 37.4], variant: 2 }, { obj: 'person.student', at: [22.8, 52.4] });
  ents.push({ obj: 'tree.plane-avenue', at: [-8, 20.5], variant: 1 }, { obj: 'tree.plane-avenue', at: [21, 12.5], variant: 0 });
  // the square: lamp standards (not in a row), street trees in their beds, planters, benches (people sit on them), bins, a cycle
  // stand, a totem (all kept 2 m and more off the tram's curve); low planters and a bench in the near square, never a tree in front of
  // the Midland
  ents.push({ obj: 'street.lamppost', at: [-17.5, 24.5] }, { obj: 'street.lamppost', at: [26, 47] }, { obj: 'street.lamppost', at: [34, 10.5] });
  ents.push({ obj: 'tree.plane-avenue', at: [-18, 21], variant: 2 }, { obj: 'tree.plane-avenue', at: [24, 50], variant: 1 }, { obj: 'tree.plane-avenue', at: [34, 44], variant: 0 }, { obj: 'tree.plane-avenue', at: [44, 40], variant: 2 });
  ents.push({ obj: 'structure.mcr-planter', at: [-11, 13], variant: 1 }, { obj: 'street.bench', at: [-9, 15.4], id: 'bench-l' }, { obj: 'street.bench', at: [10, 20.5], id: 'bench-c' });
  ents.push({ obj: 'structure.mcr-planter', at: [31, 6.5] }, { obj: 'structure.mcr-planter', at: [-30, 18] }, { obj: 'plant.rph-flower-tub', at: [-14, 8.5] });
  ents.push({ obj: 'street.mcr-bin', at: [-8.4, 11], variant: 1 }, { obj: 'street.mcr-bin', at: [20, 19.5] }, { obj: 'street.mcr-cycle-stand', at: [-15, 24.5], variant: 1 }, { obj: 'street.mcr-totem', at: [18, 33] });
  ents.push({ obj: 'ground.leaf-litter', at: [-16, 30] }, { obj: 'ground.leaves', at: [19, 26] },{ obj: 'ground.leaf-litter', at: [-9, 19] },{ obj: 'ground.leaves', at: [-22, 14] });
  // Peter Street's far pavement: lamps, a street tree, bins, a bike hoop by the hotel door
  ents.push({ obj: 'street.lamppost', at: [20, 70.4] }, { obj: 'street.lamppost', at: [60, 68.4] }, { obj: 'street.lamppost', at: [-30, 73] }, { obj: 'street.mcr-bin', at: [40, 69.3] }, { obj: 'street.mqn-bike-hoop', at: [8, 71.2] });
  // (the v2 view framed its right edge with one of the portico's giant columns, pinned at the frame's edge; as a world object 5 m off
  // it is twice the frame's width and the appearance pass moves it away: the framing is the trees and the stop's shelters instead)
  worldAdd('world-test', { id: 'greater-manchester-manchester-centre-3-w3', label: 'Peter Street, Manchester', site: 'Peter Street — trams curve past the Midland Hotel\'s red terracotta',
    tags: ['uk', 'north west', 'greater manchester', 'manchester', 'city', 'civic', 'midland hotel', 'metrolink', 'tram', 'terracotta', 'street', 'world-v3'], liveSky: { lat: 53.4779, lon: -2.2442 }, mood: 'energetic', colour: 'red',
    ukPlace: 'manchester-centre', county: 'greater-manchester', ukTown: 'Manchester', ukView: 'world-engine', setting: 'a tram stop on a city square' }, {
    v: 3,
    place: { lat: 53.4779, lon: -2.2442, region: 'greater-manchester', style: 'civic-square' },
    camera: { eye: 2.6, fov: 72, horizon: 585, heading: 214 },
    surfaces: [
      // the city's paving under everything (first, so every later surface lies on it): with gaps of bare ground between the platforms,
      // the tram's bed and the square, the kit grew grass verges and flowers along the tram line
      { id: 'land', kind: 'plaza', poly: [[-220, 0], [220, 0], [220, 280], [-220, 280]] },
      // the Central Library's portico steps under the lens (below the frame: the ground shows from 9 m)
      { id: 'steps', kind: 'plaza', poly: [[-60, 0], [60, 0], [60, 6], [-60, 6]] },
      { id: 'sq-l', kind: 'plaza', poly: [[-62, 6], [-7, 6], [-8.4, 30], [-10.6, 52], [-12.4, 54], [-11.4, 29.4], [-62, 29.4]] },
      { id: 'sq-r', kind: 'plaza', poly: [[12.4, 6], [60, 6], [60, 50.5], [7.8, 50.5], [11, 30]] },
      // the square's middle, between the two halves, crossed by its own crowd
      { id: 'sq-c', kind: 'plaza', poly: [[-7, 6], [12.4, 6], [11, 30], [7.8, 50.5], [-10.6, 52], [-8.4, 30]] },
      // the tram line swings in from the right across the square (as the real line crosses St Peter's Square) in a long curve (radius
      // about 40 m) that enters the frame at 27 m, then runs down the stop and away down Lower Mosley Street. A line from under our feet
      // brought every tram to the lens (a tram runs the whole track, its sections trailing behind its head: edgeCut, nearBand); a
      // tight curve swung its sections over the paving
      { id: 'tram', kind: 'tram', path: [[130, 20], [95, 22], [68, 25.5], [48, 30], [33, 35], [22, 40], [13, 45], [6, 50], [1, 55], [-2.5, 60], [-5, 64], [-15, 100], [-30, 160], [-50, 240]], width: 7 },
      // planted beds in the near square: a low one in the middle (the Midland stays clear above it), one each side with a tree
      { id: 'bed-c', kind: 'grass', poly: [[-1, 10], [11, 10], [11, 16], [-1, 16]] },
      { id: 'bed-nl', kind: 'grass', poly: [[-11, 17], [-5, 17], [-5, 24], [-11, 24]] },
      { id: 'bed-nr', kind: 'grass', poly: [[15, 9], [26, 9], [26, 16], [15, 16]] },
      { id: 'pave-n', kind: 'pavement', path: [[-160.35, 65.01], [-0.35, 57.01], [159.65, 49.01]], width: 4 },
      { id: 'peter', kind: 'road', path: [[-160, 72], [0, 64], [160, 56]], width: 10 },
      { id: 'pave-s', kind: 'pavement', path: [[-159.64, 79.24], [0.36, 71.24], [160.36, 63.24]], width: 4.5 },
      // the square's planted beds round its trees (a tree needs soil: on bare setts the world drops it)
      ...[[-18, 21], [24, 50], [34, 44], [44, 40]].map(([x, z], i) => ({ id: 'bed-' + i, kind: 'grass', poly: [[x - 1.8, z - 1.8], [x + 1.8, z - 1.8], [x + 1.8, z + 1.8], [x - 1.8, z + 1.8]] })),
      // Lower Mosley Street's pavement beside the tram, along the Midland's flank
      { id: 'mosley', kind: 'pavement', path: [[-5.2, 80], [-8, 110], [-12, 140]], width: 2.4 },
    ],
    buildings: [
      { id: 'midland', foot: [[-4, 77.5], [72, 72], [76, 134], [0, 141]], storeys: 6, style: 'mcr-terracotta-hotel', crown: 'corner-turrets', landmark: true,
        src: 'The Midland Hotel, Peter Street (Charles Trubshaw, 1903): Historic England list entry 1270423; OS map' },
      { id: 'one-sps', foot: [[-62, 30], [-12, 30], [-12.8, 55], [-60, 55]], storeys: 14, style: 'modern-glass', src: 'One St Peter\'s Square (2014): OS map' },
      // the far end of Lower Mosley Street beyond the Midland, both sides of the tram: offices and the convention quarter
      { id: 'lms-1', foot: [[-22, 160], [0, 160], [0, 190], [-28, 190]], storeys: 9, style: 'modern-glass' },
      { id: 'lms-2', foot: [[-96, 232], [-58, 232], [-60, 270], [-96, 270]], storeys: 12, style: 'modern-glass' },
      { id: 'lms-3', foot: [[-28, 200], [-8, 200], [-8, 230], [-28, 230]], storeys: 5, style: 'mcr-palazzo' },
      { id: 'lms-4', foot: [[-66, 150], [-40, 150], [-44, 182], [-66, 182]], storeys: 6, style: 'mcr-palazzo' },
      { id: 'lms-5', foot: [[-80, 190], [-46, 190], [-56, 230], [-80, 230]], storeys: 5, style: 'mcr-palazzo' },
      // Peter Street's palazzi running off on the right (the v2 view's four blocks, the Free Trade Hall's long front among them)
      ...[[74, 26, 5], [100.4, 30, 4], [130.8, 18, 6], [149.2, 24, 5]].map(([x, w, st], i) => ({ id: 'ps-' + i, storeys: st, style: 'mcr-palazzo', roof: i === 1 ? 'mansard' : 'flat',
        foot: [[x, 34 - x * 0.05], [x + w, 34 - (x + w) * 0.05], [x + w, 50 - (x + w) * 0.05], [x, 50 - x * 0.05]].map(p => [p[0], Math.round(p[1] * 10) / 10]) })),
      // the far side of Peter Street beyond the Midland (seen over and between them)
      { id: 'pf-1', foot: [[82, 70.4], [108, 69.1], [108, 85.7], [82, 87]], storeys: 6, style: 'mcr-palazzo' },
      { id: 'pf-2', foot: [[108.4, 69.1], [138.4, 67.6], [138.4, 84.2], [108.4, 85.7]], storeys: 7, style: 'modern-glass' },
    ],
    entities: ents,
    life: [
      { who: 'tram', on: 'tram', every: '2min', mix: { 'vehicle.metrolink-m5000': 1 } },
      { who: 'buses', on: 'peter', every: '4min', mix: { 'vehicle.bus-double-decker': 1 } },
      { who: 'cars', on: 'peter', rate: '6/min', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 3, 'vehicle.car': 2 } },
      { who: 'cyclists', on: 'peter', rate: '1/min', mix: { 'cyclist-commuter': 0.7, cyclist: 0.3 } },
      { who: 'crowd', on: 'sq-r', rate: '10/min', mix: { commuter: 0.33, stroll: 0.27, student: 0.13, shopper: 0.13, couple: 0.07, 'takeaway-walker': 0.07 } },
      { who: 'walkers', on: 'sq-c', rate: '6/min', mix: { commuter: 0.5, brisk: 0.3, student: 0.2 } },
      { who: 'crowd', on: 'sq-l', rate: '7/min', mix: { commuter: 0.4, stroll: 0.3, shopper: 0.2, couple: 0.1 } },
      { who: 'visit', mix: { commuter: 0.6, student: 0.4 }, rate: '1/40s', goals: [{ view: 'stop-l', for: [15, 50] }, { leave: 'W' }] },
      { who: 'visit', mix: { commuter: 0.5, shopper: 0.5 }, rate: '1/40s', goals: [{ view: 'stop-r', for: [15, 50] }, { leave: 'E' }] },
      { who: 'crowd', on: 'pave-n', rate: '6/min', mix: { commuter: 0.4, stroll: 0.3, shopper: 0.3 } },
      { who: 'crowd', on: 'pave-s', rate: '6/min', mix: { commuter: 0.4, stroll: 0.3, couple: 0.3 } },
      { who: 'visit', mix: { elderly: 0.5, stroll: 0.3, student: 0.2 }, rate: '1/min', goals: [{ go: 'bench-l' }, { do: 'sit', for: [25, 80] }, { leave: 'W' }] },
      { who: 'visit', mix: { stroll: 0.5, student: 0.3, elderly: 0.2 }, rate: '1/min', goals: [{ go: 'bench-c' }, { do: 'sit', for: [25, 80] }, { leave: 'E' }] },
      { who: 'gulls', count: 3 },
    ],
    backdrop: { style: 'city-manchester-towers' },
    seed: 1,
  });
})();
