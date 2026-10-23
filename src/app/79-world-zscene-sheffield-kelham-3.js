/* ============================================================
   WORLD SCENE (format v3) world-test / sheffield-kelham-3-w3: Alma Street at the Fat Cat, Kelham Island, Sheffield.
   Converted by `node tools/world.mjs convert uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-3`, then rebuilt by hand
   (22 Oct): the draft had no buildings (every footprint dropped as `unknownSize`), no Fat Cat (the v2 view drew it inline in its
   own camera, so no world object exists), its parked cars removed for overlaps, the traffic lost and the street an open plain.
   The view (one camera, as the v2 view 3): from the corner on Alma Street's near pavement, looking west along the street. Alma
   Street runs away to the right between its works and ale houses; across it, on the corner of the side street, the Fat Cat (a plain
   two-storey Victorian brick ale house, Sheffield's first real-ale free house, 1981) with drinkers at its tables outside; the Kelham
   Island Brewery beside it, then the old cutlery works (flats now) and new brick-and-glass blocks along the street; the side street
   opening on the left with a works chimney rising over the roofs; the hills beyond (backdrop). Our side: works and flats to the
   right, bollards, a planter, a street lime. Life: cars and taxis along Alma Street, cyclists, walkers on both pavements and up the
   side street, people at the pub's tables, a dog, pigeons on the pavements.
   The frame of the view (the v2 lib, 70-scene-lib-sheffield-kelham.js SCENE_KLM.v3): Alma Street straight in plan through c0
   along dir; at(t, k) = c0 + dir t + n k (k > 0 the far side); the side street leaves the far kerb at t 2.6 along n.
   Landmarks (real places; generated buildings, the LAYOUT as the v2 view):
     The Fat Cat, 23 Alma Street (the Alma Hotel of about 1850; a real-ale free house since 1981)   (Sheffield City Council: Kelham
       Island conservation area appraisal; OS map)
     Kelham Island Brewery, Alma Street (1990)   (OS map)
     The works chimney: a Kelham works stack (`landmark.klm-chimney`)   (Kelham Island Museum: https://www.simt.co.uk/kelham-island-museum)
   PURE. Hidden dev pack until approved; the original scene is untouched.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  const r2 = (v) => Math.round(v * 100) / 100;
  const dir = [0.643, 0.766], C0 = [-4.56, 8.52], nl = [-dir[1], dir[0]];
  const at = (t, k) => [r2(C0[0] + dir[0] * t + nl[0] * k), r2(C0[1] + dir[1] * t + nl[1] * k)];
  const line = (k, t0, t1) => [at(t0, k), at(t1, k)];
  const quad = (t0, t1, k0, k1) => [at(t0, k0), at(t1, k0), at(t1, k1), at(t0, k1)];
  const sideC = (u) => [r2(C0[0] + dir[0] * 2.6 + nl[0] * u), r2(C0[1] + dir[1] * 2.6 + nl[1] * u)];
  const sideAt = (u, k) => { const c = sideC(u); return [r2(c[0] + dir[0] * k), r2(c[1] + dir[1] * k)]; };
  const FK = 3.2 + 2.2 + 3.0 + 0.1, NK = -(3.2 + 2.2 + 5.2 + 0.1), t0 = 7.7;   // the far and near building lines; the Fat Cat's corner
  const FA = 40, FN = 310;                                                         // facing along Alma Street, and toward our side
  const ents = [];
  // the Fat Cat's tables out on the pavement: drinkers at them, a dog by the door, a planter and a bin by the brewery
  ents.push({ obj: 'person.cafe-goer', at: at(t0 + 1.8, FK - 2.75) }, { obj: 'person.cafe-goer', at: at(t0 + 3.4, FK - 2.8), variant: 1 }, { obj: 'person.cafe-goer', at: at(t0 + 9.3, FK - 2.75), variant: 2 });
  ents.push({ obj: 'animal.dog', at: at(t0 + 12.5, FK - 1.2), facing: FA });
  ents.push({ obj: 'street.mqn-planter-grass', at: at(t0 + 12.4, FK - 0.6) }, { obj: 'plant.planter', at: at(t0 + 22, FK - 0.6) }, { obj: 'street.mqn-bin', at: at(t0 + 16, FK - 0.6) });
  // street limes and lamp standards in the build-outs between the parking bays; bollards and a planter at our corner
  // (limes in the parking bays found no room to pass beside them: two stand on our wide pavement instead)
  for (const t of [58]) ents.push({ obj: 'tree.plane-avenue', at: at(t, 4.4) });
  ents.push({ obj: 'tree.plane-avenue', at: at(34, -9.8) }, { obj: 'tree.plane-avenue', at: at(66, -9.8) });
  for (const t of [34, 68, 100]) ents.push({ obj: 'street.lamppost', at: at(t, FK - 0.5) });
  for (const t of [2, 6, 10]) ents.push({ obj: 'street.bollard', at: at(t, -5.8) });
  ents.push({ obj: 'plant.planter', at: at(14, -7.4) }, { obj: 'tree.plane-avenue', at: at(20, -6.2) }, { obj: 'street.lamppost', at: at(44, -6) }, { obj: 'street.mqn-bin', at: at(26, -6.4) });
  // cars parked in the bays both sides (the traffic passes between them)
  [[13, -4.3], [27, -4.3], [52, -4.3], [33, 4.3], [46, 4.3], [64, 4.3]].forEach(([t, k], i) => ents.push({ obj: i % 3 === 1 ? 'vehicle.car-city' : 'vehicle.car', at: at(t, k), facing: i % 2 ? FA : FA + 180 - 360, variant: i % 3 }));
  ents.push({ obj: 'ground.leaf-litter', at: at(16, -8.6) }, { obj: 'ground.leaves', at: at(24, FK - 1.6) }, { obj: 'ground.leaf-litter', at: at(36, -9) });
  worldAdd('world-test', { id: 'sheffield-kelham-3-w3', label: 'Kelham Island, Sheffield', site: 'Alma Street at the Fat Cat, Kelham Island',
    tags: ['uk', 'south yorkshire', 'sheffield', 'kelham island', 'street', 'pub', 'works', 'world-v3'], liveSky: { lat: 53.3897, lon: -1.4712 }, mood: 'cheerful', colour: 'brick',
    ukPlace: 'sheffield-kelham', county: 'south-yorkshire', ukTown: 'Sheffield', ukView: 'world-engine', setting: 'a works street with an ale house' }, {
    v: 3,
    place: { lat: 53.3897, lon: -1.4712, region: 'south-yorkshire', style: 'terraced-street' },
    camera: { eye: 1.65, fov: 48, horizon: 520, heading: 300, x0: 660 },
    surfaces: [
      { id: 'side', kind: 'road', path: [sideC(3.4), sideC(30), sideC(90)], width: 6.4 },
      { id: 'side-pl', kind: 'pavement', path: [sideAt(3.4, -4.1), sideAt(30, -4.1), sideAt(90, -4.1)], width: 1.8 },
      { id: 'side-pr', kind: 'pavement', path: [sideAt(3.4, 4.1), sideAt(30, 4.1), sideAt(90, 4.1)], width: 1.8 },
      { id: 'alma', kind: 'road', path: [at(-30, 0), at(60, 0), at(220, 0)], width: 6.4 },
      { id: 'bays-far', kind: 'plaza', path: line(4.3, -30, 220), width: 2.2 },
      { id: 'bays-near', kind: 'plaza', path: line(-4.3, -30, 220), width: 2.2 },
      { id: 'pave-far', kind: 'pavement', path: line(6.95, -30, 220), width: 3 },
      { id: 'pave-near', kind: 'pavement', path: line(-8.05, -30, 220), width: 5.2 },
    ],
    buildings: [
      // the far side: the corner works left of the side street, the Fat Cat on the other corner, the brewery, works, flats
      { id: 'corner-works', foot: quad(-26, -2.6, FK, FK + 12.3), storeys: 3, style: 'kelham-works' },
      { id: 'side-works-l', foot: [sideAt(21, -5.2), sideAt(44, -5.2), sideAt(44, -17), sideAt(21, -17)], storeys: 4, style: 'kelham-works' },
      { id: 'fat-cat', foot: quad(t0, t0 + 11.5, FK, FK + 7.5), storeys: 2, style: 'victorian-terrace', landmark: true,
        src: 'The Fat Cat, 23 Alma Street, Kelham Island: Sheffield City Council, Kelham Island conservation area appraisal; OS map' },
      { id: 'side-works-r', foot: [sideAt(16.2, 5.2), sideAt(36, 5.2), sideAt(36, 15), sideAt(16.2, 15)], storeys: 3, style: 'kelham-works' },
      { id: 'brewery', foot: quad(t0 + 11.6, t0 + 25, FK, FK + 14), storeys: 2, style: 'kelham-works', src: 'Kelham Island Brewery, Alma Street: OS map' },
      { id: 'far-works-1', foot: quad(t0 + 25.1, t0 + 48, FK, FK + 14), storeys: 4, style: 'kelham-works' },
      { id: 'far-flats-1', foot: quad(t0 + 52, t0 + 78, FK, FK + 16), storeys: 5, style: 'kelham-flats' },
      { id: 'far-works-2', foot: quad(t0 + 78.1, t0 + 108, FK, FK + 14), storeys: 3, style: 'kelham-works' },
      { id: 'far-flats-2', foot: quad(t0 + 110, t0 + 150, FK, FK + 16), storeys: 6, style: 'kelham-flats' },
      // our side, to the right: a works range (flats now), a yard, new flats, works
      { id: 'near-works-1', foot: quad(5, 26, NK, NK - 12), storeys: 3, style: 'kelham-works' },
      { id: 'near-flats-1', foot: quad(32, 58, NK, NK - 14), storeys: 5, style: 'kelham-flats' },
      { id: 'near-works-2', foot: quad(60, 92, NK, NK - 12), storeys: 4, style: 'kelham-works' },
      { id: 'near-flats-2', foot: quad(94, 140, NK, NK - 14), storeys: 6, style: 'kelham-flats' },
    ],
    entities: ents,
    landmarks: [{ id: 'chimney', obj: 'landmark.klm-chimney', at: [16, 132], variant: 0, src: 'a Kelham works stack: https://www.simt.co.uk/kelham-island-museum' }],
    life: [
      { who: 'cars', on: 'alma', rate: '4/min', mix: { 'vehicle.car': 5, 'vehicle.car-city': 3, 'vehicle.taxi-black': 1, 'vehicle.taxi': 1 } },
      { who: 'cyclists', on: 'alma', rate: '1/2min', mix: { cyclist: 0.67, 'cyclist-commuter': 0.33 } },
      { who: 'crowd', on: 'pave-far', rate: '6/min', mix: { stroll: 0.2, student: 0.2, couple: 0.1, 'dog-walker': 0.1, 'takeaway-walker': 0.1, shopper: 0.1, commuter: 0.1, buggy: 0.05, elderly: 0.05 } },
      { who: 'crowd', on: 'pave-near', rate: '6/min', mix: { stroll: 0.3, student: 0.2, commuter: 0.2, 'dog-walker': 0.15, shopper: 0.15 } },
      { who: 'walkers', on: 'side-pr', rate: '2/min', mix: { stroll: 0.5, student: 0.5 } },
    ],
    backdrop: { style: 'city-sheffield-hills' },
    seed: 2,   // (seed 1's fill stood a lamp post at the far kerb where the order of the walkers passing it flipped for a frame)
  });
})();
