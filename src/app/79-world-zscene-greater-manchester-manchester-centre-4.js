/* ============================================================
   WORLD SCENE (format v3) world-test / greater-manchester-manchester-centre-4-w3: Deansgate at the John Rylands Library, Manchester.
   Converted by `node tools/world.mjs convert uk-north-manchester-centre/greater-manchester-manchester-centre-4`, then rebuilt by hand
   (22 Oct): the draft had no buildings at all (every footprint was dropped as `unknownSize`), the library was removed for an overlap,
   the traffic population was unknown and the far side of the road was an empty paved plain to the horizon.
   The view (one camera, as the v2 view 4): from Deansgate's east pavement, eye 1.65 m, looking south-west across the road at an angle.
   Deansgate sweeps from the near left to the far right (the leading line); along its far (west) side, left to right: Victorian
   commercial palazzi in stone and red brick (shops on the ground floor), the John Rylands Library's red sandstone Gothic front, then the
   Spinningfields glass offices and another stone block, the towers of the city (Beetham Tower) in the backdrop. Framing: the tram
   stop shelter on our pavement at the left, a lamp standard and a street tree at the right, the kerb across the foot. Life: buses
   (double-deckers), black cabs and cars both ways, cyclists, the crowd on both pavements, people waiting and crossing at the zebra by
   the library, pigeons on our pavement.
   The frame of the view (as the v2 lib, 70-scene-lib-manchester-centre.js SCENE_MCR_VIEWS.v4): t metres along Deansgate (toward the
   far right), k across it (toward the far side); P(t, k) = n k + u t. Road centre k 14 (12 m wide), our pavement k -1..8, theirs
   k 20..24.4, the far fronts at k 24.5.
   Landmark (real building, real shape and material):
     John Rylands Library, 150 Deansgate (Basil Champneys, 1890-1900): Penrith red sandstone Gothic, two pinnacled towers either side
     of a great oriel over the entrance arch; Historic England list entry 1254669 (Grade I). Drawn for this camera as
     `landmark.mcr-john-rylands` (its front corner at P(28, 24.5); the entity stands 1.3 m behind the corner so its footprint (the
     corner only: WORLD_SIZE_GAPS) is clear of the pavement and the neighbour; the drawing moves under 3 px).
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const u = [Math.SQRT1_2, Math.SQRT1_2], n = [-Math.SQRT1_2, Math.SQRT1_2];
  const P = (t, k) => [Math.round((n[0] * k + u[0] * t) * 100) / 100, Math.round((n[1] * k + u[1] * t) * 100) / 100];
  const line = (k, t0, t1) => [P(t0, k), P(t1, k)];
  const FU = 45, FN = 315;                     // facing along Deansgate (toward the far right), and across it toward us
  /** A far-side block: front from t0 to t0 + w at k 24.5, depth dp behind it. */
  const block = (id, t0, w, dp, style, storeys, roof) => ({ id, foot: [P(t0, 24.5), P(t0 + w, 24.5), P(t0 + w, 24.5 + dp), P(t0, 24.5 + dp)], storeys, style, roof: roof || 'flat' });
  const ents = [];
  // our pavement: lamp standards (not in step with theirs), the tram stop shelter as the left framing, bins, a cycle stand, a totem
  ents.push({ obj: 'street.mcr-tram-shelter', at: P(3.2, 6.6), facing: FU, id: 'shelter' }, { obj: 'street.mcr-bin', at: P(5.9, 4.9) }, { obj: 'person.phone-idler', at: P(8.6, 3.4) });
  ents.push({ obj: 'street.lamppost', at: P(10, 7.4), variant: 2 }, { obj: 'street.lamppost', at: P(46, 7.4), variant: 2 }, { obj: 'street.lamppost', at: P(82, 7.4), variant: 2 });
  ents.push({ obj: 'street.mcr-bin', at: P(18, 7.2), variant: 1 }, { obj: 'street.mcr-bin', at: P(31.6, 7.3) }, { obj: 'street.mcr-cycle-stand', at: P(21, 1.2), facing: FU }, { obj: 'street.mcr-totem', at: P(23, 6.9), variant: 1 });
  ents.push({ obj: 'tree.plane-avenue', at: P(33, 6.6), variant: 1 }, { obj: 'tree.plane-avenue', at: P(58, 6.8), variant: 2 });
  ents.push({ obj: 'plant.rph-flower-tub', at: P(14, 1.4) }, { obj: 'structure.mcr-planter', at: P(38, 1.6) }, { obj: 'street.bench', at: P(40, 6.6), id: 'bench-e' });
  // the far pavement: an A-board by the palazzi' shops, bike hoops (a parasol here was pushed to the kerb, over the cycle line)
  ents.push({ obj: 'street.mqn-aboard', at: P(9, 23.9) }, { obj: 'street.mqn-bike-hoop', at: P(60, 23.8), facing: FU }, { obj: 'street.mqn-bike-hoop', at: P(63, 23.8), facing: FU });
  // the zebra's bollards both sides, their lamps across the road, the far pavement's street trees and bins
  ents.push({ obj: 'street.bollard', at: P(24, 7.5) }, { obj: 'street.bollard', at: P(28, 7.5) }, { obj: 'street.bollard', at: P(24.4, 20.4) }, { obj: 'street.bollard', at: P(27.8, 20.4) });
  ents.push({ obj: 'street.lamppost', at: P(12, 20.5), variant: 2 }, { obj: 'street.lamppost', at: P(48, 20.5), variant: 2 }, { obj: 'street.lamppost', at: P(84, 20.5), variant: 2 }, { obj: 'street.lamppost', at: P(124, 20.5), variant: 2 });
  ents.push({ obj: 'tree.plane-avenue', at: P(62, 21.4), variant: 2 });   // (more trees on this 4.4 m pavement left no room to pass: dropped)
  ents.push({ obj: 'street.mcr-bin', at: P(54, 20.8) }, { obj: 'street.mcr-bin', at: P(6, 20.8) }, { obj: 'street.mcr-cycle-stand', at: P(64, 1.2), facing: FU });
  // people stopped: one waiting at the crossing, a photographer at the library door, a couple and a student on our side
  ents.push({ obj: 'person.phone-idler', at: P(25, 21.6), id: 'idler' }, { obj: 'person.photographer', at: P(40, 22.6), id: 'photo' }, { obj: 'person.couple', at: P(30, 4.6) }, { obj: 'person.elderly-couple', at: P(46, 23) });
  ents.push({ obj: 'ground.leaf-litter', at: P(16, 6.6) }, { obj: 'ground.leaves', at: P(34, 7.2) }, { obj: 'ground.leaf-litter', at: P(9, 21.4) }, { obj: 'ground.leaves', at: P(66, 22) });
  worldAdd('world-test', { id: 'greater-manchester-manchester-centre-4-w3', label: 'Deansgate, Manchester', site: 'Deansgate — buses and bikes pass the John Rylands Library\'s red sandstone Gothic',
    tags: ['uk', 'north west', 'greater manchester', 'manchester', 'city', 'civic', 'john rylands library', 'deansgate', 'gothic', 'bus', 'street', 'world-v3'], liveSky: { lat: 53.4806, lon: -2.2473 }, mood: 'energetic', colour: 'red',
    ukPlace: 'manchester-centre', county: 'greater-manchester', ukTown: 'Manchester', ukView: 'world-engine', setting: 'a city street under a Gothic library' }, {
    v: 3,
    place: { lat: 53.4806, lon: -2.2473, region: 'greater-manchester', style: 'civic-square' },
    camera: { eye: 1.65, fov: 80, horizon: 680, heading: 214 },
    surfaces: [
      { id: 'pave-e', kind: 'pavement', path: line(3.5, -60, 300), width: 9 },
      // the traffic's road starts 6 m along: a bus fading out at the near band's end (t 4) had its front corner below the frame (edgeCut);
      // the asphalt runs on to the left edge as a second piece with no traffic, and the bus stop shelter on our kerb hides where they fade
      { id: 'deansgate', kind: 'road', path: line(14, 6, 300), width: 12 },
      { id: 'deansgate-s', kind: 'road', path: line(14, -60, 7), width: 12 },
      { id: 'pave-w', kind: 'pavement', path: line(22.2, -60, 300), width: 4.4 },
    ],
    buildings: [
      // north of the library (left): Victorian commercial palazzi, stone and red brick, shops below
      block('pal-1', -40, 16, 16, 'mcr-palazzo', 5), block('pal-2', -24, 14, 16, 'mcr-palazzo', 4), block('pal-3', -10, 14, 16, 'mcr-palazzo', 4),
      block('pal-4', 4.2, 10, 18, 'mcr-palazzo', 5, 'mansard'), block('pal-5', 14.4, 13.2, 18, 'mcr-palazzo', 4),
      // south of it (right): the Spinningfields glass, then a stone block and more glass toward the far end of the street
      block('glass-1', 71, 26, 24, 'modern-glass', 9), block('glass-2', 98, 30, 26, 'modern-glass', 12), block('pal-6', 130, 30, 26, 'mcr-palazzo', 6),
      block('pal-7', 162, 24, 22, 'mcr-palazzo', 5), block('glass-3', 188, 34, 26, 'modern-glass', 14), block('pal-8', 224, 26, 22, 'mcr-palazzo', 5),
    ],
    entities: ents,
    landmarks: [{ id: 'rylands', obj: 'landmark.mcr-john-rylands', at: P(29.5, 25.8), facing: FU, src: 'John Rylands Library, 150 Deansgate (Basil Champneys, 1900): Historic England list entry 1254669; OS map' }],
    life: [
      { who: 'buses', on: 'deansgate', every: '3min', mix: { 'vehicle.bus-double-decker': 1 } },
      { who: 'cars', on: 'deansgate', rate: '8/min', mix: { 'vehicle.car-city': 5, 'vehicle.taxi-black': 3, 'vehicle.car': 2 } },
      { who: 'cyclists', on: 'deansgate', rate: '1/min', mix: { 'cyclist-commuter': 0.67, cyclist: 0.33 } },
      { who: 'crowd', on: 'pave-e', rate: '22/min', mix: { stroll: 0.2, commuter: 0.25, student: 0.15, shopper: 0.15, couple: 0.1, 'takeaway-walker': 0.05, buggy: 0.05, 'dog-walker': 0.05 } },
      { who: 'crowd', on: 'pave-w', rate: '14/min', mix: { commuter: 0.35, shopper: 0.25, stroll: 0.25, couple: 0.15 } },
      { who: 'visit', mix: { stroll: 0.5, student: 0.5 }, rate: '1/min', goals: [{ view: 'rylands', for: [10, 30] }, { leave: 'far' }] },
      { who: 'visit', mix: { elderly: 0.5, stroll: 0.3, 'takeaway-walker': 0.2 }, rate: '1/min', goals: [{ go: 'bench-e' }, { do: 'sit', for: [25, 80] }, { leave: 'far' }] },
      { who: 'gulls', count: 3 },
    ],
    backdrop: { style: 'city-manchester-towers' },
    seed: 1,
  });
})();
