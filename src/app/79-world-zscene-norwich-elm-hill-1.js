/* ============================================================
   WORLD SCENE (format v3) world-test / norwich-elm-hill-1-w3: Elm Hill, Norwich.
   The view: standing at the foot of the lane looking north up a cobbled medieval lane that rises about 7 m (Elm Hill's own climb is gentler; the
   rise is stretched so that it reads from the foot), plastered and timber-framed houses with gables to the street and jettied upper floors on both
   sides, a few later flint cottages among them, the one thatched house near the head, and at the head the flint tower of St Peter Hungate behind
   its churchyard wall. A ginger cat on a doorstep, pots and a barrel against the walls, a few visitors.
     https://www.norwich.gov.uk/  OS Explorer 237 (Norwich, TG 231 088); the church and the lane are real, the layout is plausible, not surveyed.
   Different from the Shambles on purpose: cobbles (not flags and a drain), a lane 5.5 m wide that CLIMBS (a `slope` ground feature), pastel limewash with
   many fronts plastered over (`tudor-colourwash`), gable ends to the street, a flint church (not a minster), a cat and pots (not butchers' hooks).
   The kit `cobbled-lane` supplies the ground look, the dressing, the sky share and the life; no fill, framing or backdrop is written here.
   PURE. Registered in the hidden dev pack 'world-test' until approved.
   ============================================================ */
(function () {
  if (typeof worldAdd !== 'function') return;
  // the lane's centre line (x east, z north; it bends a little to the right near the head, as Elm Hill does) and the churchyard in front of the flint tower
  const LANE = [[0, -8], [0, 26], [1, 50], [3.5, 68], [6, 90]];
  const YARD_Z = 94.5, CH = [18, 113];
  // headstones in two loose rows behind the wall, seeded by hand (a hash would also do): x, z, facing
  const STONES = [[-10.5, 97.4, 188], [-7.8, 98.6, 176], [-4.4, 97.9, 181], [-1.2, 99.4, 195], [9.8, 98.2, 170], [12.7, 99.5, 186], [15.9, 98.1, 178], [19.4, 99.2, 192], [23.1, 98.0, 184], [-9.3, 101.4, 90], [-5.6, 102.1, 182], [11.4, 101.6, 175], [21.5, 101.9, 188]];
  worldAdd('world-test', {"id":"norwich-elm-hill-1-w3","label":"Elm Hill, Norwich (world)","site":"Elm Hill, Norwich","mood":"cheerful","colour":"plaster","tags":["uk","norfolk","norwich","elm-hill","medieval","timber-framed","lane","world-v3"],"liveSky":{"lat":52.6314,"lon":1.2918},"ukPlace":"norwich-elm-hill","county":"norfolk","ukTown":"Norwich","ukView":"world-engine","setting":"a cobbled medieval lane rising to a flint church"}, {
    v: 3,
    place: { lat: 52.6314, lon: 1.2918, alt: 12, region: 'norfolk', style: 'cobbled-lane' },
    camera: { eye: 1.7, fov: 54, horizon: 580, heading: 0 },
    // the lane rises about 7 m to its head (a steeper climb than Elm Hill's, so that it reads from the foot)
    ground: { features: [{ id: 'hill', kind: 'slope', path: [[0, 0], [0, 26], [1, 50], [3.5, 68], [6, 90]], width: 360, h: 7, fade: 40 }] },
    surfaces: [
      { id: 'lane', kind: 'plaza', path: LANE, width: 6.6 },
      { id: 'cross', kind: 'pavement', path: [[-50, 90], [6, 90], [60, 93]], width: 5 },
    ],
    lines: [
      // the churchyard wall: flint, about a metre high, with a gap for the gate straight up the lane
      { id: 'yard-wall', kind: 'wall', laid: 'rubble', cope: 'saddle', stone: '#78746e', h: 1.1, width: 0.5, path: [[-16, YARD_Z + 4], [-15.5, YARD_Z], [28, YARD_Z + 0.3], [31, YARD_Z + 6]], gaps: [[24.2, 26.8]] },
    ],
    buildings: [
      { id: 'w-a', along: 'lane', side: 'left', style: 'tudor-colourwash', storeys: [2, 3], from: 0.5, to: 29.2, gap: -0.55 },
      { id: 'w-b', along: 'lane', side: 'left', style: 'norfolk-flint', storeys: [2, 2], from: 30, to: 37.2, shops: false, gap: -0.55 },
      { id: 'w-c', along: 'lane', side: 'left', style: 'tudor-colourwash', storeys: [2, 3], from: 38, to: 67, gap: -0.55 },
      { id: 'w-d', along: 'lane', side: 'left', style: 'tudor-thatch', storeys: [1, 2], from: 68, to: 78.2, shops: false, gap: -0.55 },
      { id: 'w-e', along: 'lane', side: 'left', style: 'tudor-colourwash', storeys: [2, 2], from: 79, to: 88, gap: -0.55 },
      { id: 'e-a', along: 'lane', side: 'right', style: 'tudor-colourwash', storeys: [2, 3], from: 0.5, to: 23.2, gap: -0.55 },
      { id: 'e-b', along: 'lane', side: 'right', style: 'norfolk-flint', storeys: [2, 2], from: 24, to: 31.2, shops: false, gap: -0.55 },
      { id: 'e-c', along: 'lane', side: 'right', style: 'tudor-colourwash', storeys: [2, 3], from: 32, to: 88, gap: -0.55 },
    ],
    landmarks: [{ id: 'church', obj: 'structure.parish-church', at: CH, facing: 90, src: 'St Peter Hungate, Elm Hill: a small flint church with a west tower at the head of the lane', model: { livery: 'flint', size: 1.12, seed: 3, opts: { era: 'perpendicular', aisle: 'south', crown: 'parapet', porch: true } } }],
    entities: [
      // a ginger tabby on the doorstep of the first house on the right, washing in the sun
      { obj: 'animal.cat', at: [2.2, 9.2], facing: 270, id: 'cat-1' },
      // the churchyard gate, straight up the lane
      { obj: 'structure.lychgate', at: [6.1, YARD_Z + 0.1], facing: 0, id: 'lychgate', blocks: true, model: { livery: 'oak', seed: 4 } },
      { obj: 'tree.churchyard-yew', at: [24.5, 100.2], id: 'yew-1', model: { size: 0.85, seed: 2 } },
    ].concat(STONES.map((s, i) => ({ obj: 'structure.headstone', at: [s[0], s[1]], facing: s[2], id: 'stone-' + i, model: { size: 0.9 + (i % 4) * 0.08, seed: i + 3 } }))),
    life: [
      { who: 'walkers', on: 'lane', rate: '4/min', mix: { stroll: 0.6, chat: 0.15, couple: 0.25 }, edges: ['S', 'N'] },
    ],
    seed: 51,
  });
})();
