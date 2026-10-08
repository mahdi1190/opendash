/* ============================================================
   COMPOSED SCENES: Wokingham, Berkshire, the town (part 1). docs/dev/SCENE_ENGINE.md 3.
   Four different real places, each composed for its own view:
     wokingham-market-place  the Market Place from its south side: stalls, shoppers, the Town Hall off to the right
     wokingham-broad-street  Broad Street in one-point perspective, the Town Hall closing the far end
     wokingham-rose-street   Rose Street, a narrow lane of timber-framed houses, All Saints' tower over the roofs
     wokingham-station       the station and the level crossing, the barriers down, a train passing
   Data only (PURE): each builder makes its scene from the frame helpers (71-scene-uk-wokingham-0frame.js)
   and the library (70-scene-lib-area-wokingham.js). The season comes from the date, the light from the live sky.
   Registered by 72-anim-pack-uk-area-wokingham.js.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneWokFrame !== 'function') return;
  const PACK = 'uk-area-wokingham';
  const TH = 'landmark.wokingham-town-hall', AS = 'landmark.all-saints-wokingham', ST = 'landmark.wokingham-station';
  const TINT = (c, k) => ({ col: c, k: k || [0, 0.14] });

  /* ---------- the Market Place: a square seen from its south side, low and wide ---------- */
  function marketPlace(m) {
    const H = 350, f = sceneWokFrame(m), { data: d, metres, person, sOf } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(4101);
    const frontY = H + 70, cx = 1060;           // the frontage line, and the vanishing point of the paving joints
    sceneWokHorizon(d, r, H - 4, 6, frontY);
    // the square: paving that runs from the frontage down past the bottom of the frame, the joints converging on the Town Hall
    G.push({ layer: 'far', d: `M-160 ${frontY}H1760V900H-160Z`, fill: { lin: [[0, '@pave.1'], [1, '@pave.0']], x1: 0, y1: frontY, x2: 0, y2: 900 } });
    for (let k = -14; k <= 14; k++) { const xb = cx + k * 150; G.push({ layer: 'far', d: `M${cx + k * 3} ${frontY}L${cx + k * 3 + 2} ${frontY}L${xb + 3} 900L${xb} 900Z`, fill: '@pave.2' }); }
    // the frontage: the Market Place houses on the left and right, the Town Hall off-centre to the right
    const hs = metres('building.wokingham-street', 9.5, frontY);
    let x = -160, k = 0;
    while (x < 1760) {
      if (x > 700 && x < 1290) { x = 1290; continue; }
      const id = 'building.wokingham-street', w = sceneObj(id).size[0] * hs;
      P.push({ obj: id, x: Math.round(x + w / 2), y: frontY, s: Math.round(hs * (0.72 + r() * 0.56) * 100) / 100, variant: k % 4, flip: k % 2 === 1, layer: 'far', seed: 300 + k, anim: false, tint: k % 2 ? TINT('#9aa8b4', [0.06, 0.16]) : undefined });
      x += w * (0.78 + r() * 0.36); k++;
    }
    P.push({ obj: 'tree.plane', x: -30, y: 905, s: sOf('tree.plane', 560), layer: 'front', seed: 311, flip: true, anim: false });
    P.push({ obj: 'tree.green-chestnut', x: 1600, y: 740, s: sOf('tree.green-chestnut', 520), layer: 'near', seed: 312 }, { obj: 'tree.plane', x: 1180, y: 418, s: sOf('tree.plane', 300), layer: 'far', seed: 313, anim: false });
    P.push({ obj: TH, x: 1000, y: frontY + 6, s: metres(TH, 24, frontY + 6), layer: 'far', seed: 5, anim: false });
    P.push({ obj: 'tree.plane', x: 40, y: frontY + 4, s: sOf('tree.plane', 420), layer: 'far', seed: 310, flip: true });
    // the stalls: a diagonal row down the left, two more by the Town Hall steps on the right
    [[60, 560], [318, 606], [571, 646], [861, 704]].forEach(([sx, sy], i) => P.push({ obj: 'street.market-stall', x: sx, y: sy, s: metres('street.market-stall', 2.9, sy), variant: i % 3, flip: i % 2 === 0, layer: 'near', seed: 60 + i }));
    [[1380, 640], [1620, 600]].forEach(([sx, sy], i) => P.push({ obj: 'street.market-stall', x: sx, y: sy, s: metres('street.market-stall', 2.9, sy), variant: (i + 1) % 3, flip: i === 0, layer: 'near', seed: 66 + i }));
    // a few people only (the square is not a crowd): a family and a shopper by the stalls, a phone-idler on the steps
    P.push({ obj: 'person.couple', x: 470, y: 606, s: person('person.couple', 606), layer: 'near', seed: 70, flip: true });
    P.push({ obj: 'person.shopper', x: 1210, y: 560, s: person('person.shopper', 560), layer: 'mid', seed: 71, variant: 1 });
    P.push({ obj: 'person.phone-idler', x: 1420, y: 716, s: person('person.phone-idler', 716), layer: 'near', seed: 72 });
    // people crossing the square, a pigeon by the steps, a cyclist along the back
    A.push({ obj: 'person.shopper', layer: 'mid', path: [[-120, 452], [1720, 452]], speed: 8, loop: 'loop', s: person('person.shopper', 452), seed: 80, offset: 0.2 });
    A.push({ obj: 'person.walker', layer: 'near', path: [[1720, 790], [-120, 772]], speed: 11, loop: 'loop', s: person('person.walker', 780), seed: 81, offset: 0.6, flip: true });
    A.push({ obj: 'person.cyclist', layer: 'mid', path: [[-200, 520], [1800, 500]], speed: 18, loop: 'loop', s: person('person.cyclist', 510), seed: 82, offset: 0.35 });
    A.push({ obj: 'bird.pigeon', layer: 'near', path: [[880, 806], [920, 812]], speed: 3, loop: 'pingpong', s: 0.8, seed: 83 });
    d.flocks.push({ obj: 'bird.small-flight', n: 7, area: [200, 70, 1450, 220], speed: 24, s: 0.46, seed: 84, layer: 'far' });
    d.flocks.push({ obj: 'bird.gull', n: 4, area: [640, 40, 1200, 150], speed: 30, s: 0.5, seed: 85, layer: 'far' });
    // the cover: leaves on the paving, bollards and planters at the kerb, the market debris of a morning
    sceneWokCover(d, f, { obj: { 'ground.leaves': 3, 'street.bollard': 2, 'plant.planter': 1, 'ground.puddle': 1, 'street.lamp': 1, 'plant.shrub': 1 }, layer: 'near', seed: 90, y0: 546, y1: 900, n: 185, minGap: 22, s: [0.85, 1.1] });
    P.push({ obj: 'building.shopfront', x: -40, y: 900, s: metres('building.shopfront', 4.4, 900), layer: 'front', seed: 91, anim: false });
    sceneWokCover(d, f, { obj: { 'plant.planter': 2, 'street.bollard': 1, 'street.lamp': 1, 'plant.shrub': 1 }, layer: 'fore', seed: 92, y0: 800, y1: 900, n: 14, minGap: 80, s: [0.9, 1.1] });
    return d;
  }

  /* ---------- Broad Street: one-point perspective down the street to the Town Hall ---------- */
  function broadStreet(m) {
    const H = 430, f = sceneWokFrame(m), { data: d, metres, person } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(4202);
    const proj = sceneWokProj(800, H, 1000, 260), zs = [0.5, 0.8, 1.2, 2, 3, 4.5, 7, 9];
    const edge = X => zs.map(z => proj(X, z));
    const rev = pts => pts.slice().reverse();
    sceneWokHorizon(d, r, H - 2, 8, H + 40);
    // the road between the kerbs, the pavements to the facades, a dashed centre line
    G.push({ layer: 'near', d: sceneWokPoly(edge(-0.62).concat(rev(edge(0.62)))), fill: { lin: [[0, '@road.1'], [1, '@road.0']], x1: 0, y1: H, x2: 0, y2: 900 } });
    G.push({ layer: 'near', d: sceneWokPoly(edge(-1).concat(rev(edge(-0.62)))), fill: { lin: [[0, '@pave.1'], [1, '@pave.0']], x1: 0, y1: H, x2: 0, y2: 900 } });
    G.push({ layer: 'near', d: sceneWokPoly(edge(0.62).concat(rev(edge(1)))), fill: { lin: [[0, '@pave.1'], [1, '@pave.0']], x1: 0, y1: H, x2: 0, y2: 900 } });
    for (let i = 0; i < zs.length - 1; i += 2) { const a = proj(-0.02, zs[i]), b = proj(0.02, zs[i]), c = proj(0.02, zs[i + 1]), e = proj(-0.02, zs[i + 1]); G.push({ layer: 'near', d: sceneWokPoly([a, b, c, e]), fill: '#e8e4d8' }); }
    // the facades either side, a house for each step of depth: the near ones in front, the far ones behind
    [1.0, 1.6, 2.6, 4.2, 6.5].forEach((z, k) => {
      const layer = z < 1.9 ? 'near' : z < 3.6 ? 'mid' : 'far';
      for (const side of [-1, 1]) {
        const [x0, y0] = proj(side, z), s = metres('building.wokingham-street', 9, y0 + 6), odd = (k + side) % 3 === 0;
        P.push({ obj: odd ? 'building.cottage' : 'building.wokingham-street', x: Math.round(x0), y: Math.round(y0 + 6), s, variant: (k + (side > 0 ? 2 : 0)) % 4, flip: side > 0, layer, seed: 400 + k * 2 + (side > 0 ? 1 : 0), anim: false });
      }
    });
    // the plane trees on the pavements (they sway), the Town Hall at the far end of the street
    [[-0.84, 1.3]].forEach(([X, z], i) => {
      const [x0, y0] = proj(X, z); P.push({ obj: 'tree.plane-avenue', x: Math.round(x0), y: Math.round(y0 + 4), s: metres('tree.plane-avenue', 13, y0), layer: z < 2 ? 'near' : 'mid', seed: 420 + i, variant: i % 3, flip: i % 2 === 0, anim: i > 1 ? false : undefined });
    });
    const [tx, ty] = proj(0, 4.5);
    P.push({ obj: TH, x: Math.round(tx), y: Math.round(ty + 10), s: metres(TH, 24, ty + 10), layer: 'far', seed: 5, anim: false });
    // parked cars along the kerbs, two pedestrians on the pavements, the bus and a cyclist on the road
    [[-0.44, 1.6, 'vehicle.car', 1], [0.42, 2.3, 'vehicle.car-city', 2], [-0.46, 3.3, 'vehicle.car', 0], [0.44, 4.9, 'vehicle.taxi', 1]].forEach(([X, z, id, v], i) => {
      const [x0, y0] = proj(X, z); P.push({ obj: id, x: Math.round(x0), y: Math.round(y0 + 8), s: metres(id, 1.5, y0), variant: v, flip: X > 0, layer: z < 2 ? 'near' : 'mid', seed: 440 + i, anim: false });
    });
    const p1 = proj(-0.9, 1.1), p2 = proj(0.86, 2.4);
    P.push({ obj: 'person.shopper', x: Math.round(p1[0]), y: Math.round(p1[1] + 14), s: person('person.shopper', p1[1] + 14), layer: 'near', seed: 460, variant: 1 });
    P.push({ obj: 'person.student', x: Math.round(p2[0]), y: Math.round(p2[1] + 14), s: person('person.student', p2[1] + 14), layer: 'mid', seed: 461, flip: true });
    A.push({ obj: 'vehicle.bus', layer: 'near', path: [[1900, 780], [-320, 780]], speed: 26, loop: 'loop', s: metres('vehicle.bus', 3.3, 780), seed: 480, offset: 0.3, flip: true });
    A.push({ obj: 'person.cyclist', layer: 'near', path: [[-260, 852], [1820, 846]], speed: 16, loop: 'loop', s: person('person.cyclist', 852), seed: 481, offset: 0.7 });
    A.push({ obj: 'person.walker', layer: 'mid', path: [[1720, 560], [-120, 566]], speed: 6, loop: 'loop', s: person('person.walker', 562), seed: 482, offset: 0.45, flip: true });
    d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [220, 80, 1400, 230], speed: 22, s: 0.44, seed: 483, layer: 'far' });
    d.flocks.push({ obj: 'bird.gull', n: 4, area: [560, 50, 1100, 160], speed: 28, s: 0.5, seed: 487, layer: 'far' });
    // the cover: leaves and bollards along the pavement and gutter, planters at the nearest kerb
    sceneWokCover(d, f, { obj: { 'street.bollard': 2, 'ground.leaves': 3, 'plant.planter': 1, 'ground.puddle': 1, 'street.lamp': 1, 'plant.shrub': 1 }, layer: 'near', seed: 484, y0: 595, y1: 900, n: 175, minGap: 22, s: [0.8, 1.05] });
    sceneWokCover(d, f, { obj: { 'plant.planter': 2, 'street.bollard': 1, 'street.lamp': 1, 'plant.shrub': 1 }, layer: 'fore', seed: 486, y0: 830, y1: 900, n: 10, minGap: 90, s: [1, 1.2] });
    return d;
  }

  /* ---------- Rose Street: a narrow lane of timber-framed houses, All Saints' over the roofs ---------- */
  function roseStreet(m) {
    const H = 470, f = sceneWokFrame(m), { data: d, metres, person, sOf } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(4303);
    const proj = sceneWokProj(560, H, 700, 240), zs = [0.55, 0.8, 1.2, 2, 3.2, 5, 8];
    const edge = X => zs.map(z => proj(X, z));
    const rev = pts => pts.slice().reverse();
    sceneWokHorizon(d, r, H - 16, 8, H + 30);
    // the lane: cobbles between the two rows, a raised footway on the right
    G.push({ layer: 'near', d: sceneWokPoly(edge(-0.5).concat(rev(edge(0.5)))), fill: { lin: [[0, '@cobble.1'], [1, '@cobble.0']], x1: 0, y1: H, x2: 0, y2: 900 } });
    G.push({ layer: 'near', d: sceneWokPoly(edge(0.5).concat(rev(edge(1.05)))), fill: { lin: [[0, '@pave.1'], [1, '@pave.0']], x1: 0, y1: H, x2: 0, y2: 900 } });
    for (let i = 0; i < zs.length - 1; i += 2) { const a = proj(-0.1, zs[i]), b = proj(0.1, zs[i]), c = proj(0.1, zs[i + 1]), e = proj(-0.1, zs[i + 1]); G.push({ layer: 'near', d: sceneWokPoly([a, b, c, e]), fill: '@cobble.0' }); }
    // the right row, huge and near: timber-framed and gabled fronts, a cottage at the top of the lane
    [0.6, 1.1, 2.3, 4.2].forEach((z, k) => {
      const [x0, y0] = proj(1.05, z), id = k === 3 ? 'building.cottage' : 'building.wokingham-street', s = metres(id, 9.5, y0 + 4);
      P.push({ obj: id, x: Math.round(x0), y: Math.round(y0 + 4), s, variant: [2, 3, 2, 0][k], flip: true, layer: z < 1.5 ? 'fore' : z < 3 ? 'near' : 'mid', seed: 500 + k, anim: false });
    });
    // the left row, receding to the far end of the lane
    [0.9, 1.5, 2.1, 2.9, 3.9, 5.2].forEach((z, k) => {
      const [x0, y0] = proj(-1.05, z), id = 'building.wokingham-street', s = metres(id, 9, y0 + 4);
      P.push({ obj: id, x: Math.round(x0), y: Math.round(y0 + 4), s, variant: [1, 0, 3, 2, 1, 0][k], flip: k % 2 === 0, layer: z < 1.6 ? 'near' : z < 3 ? 'mid' : 'far', seed: 520 + k, anim: false, tint: k % 3 === 1 ? TINT('#b0a890', [0.06, 0.12]) : undefined });
    });
    // All Saints' tower over the roofs at the top of the lane, partly hidden by the right-hand house
    P.push({ obj: AS, x: 1080, y: H + 40, s: metres(AS, 26, H + 40), layer: 'far', seed: 5, anim: false });
    P.push({ obj: 'tree.green-chestnut', x: 300, y: H + 60, s: sOf('tree.green-chestnut', 300), layer: 'far', seed: 530, flip: false });
    // three people in the lane (a shopper in a doorway, a walker, a cafe-goer at the table), a small van creeping up it
    P.push({ obj: 'person.shopper', x: 1270, y: 620, s: person('person.shopper', 620), layer: 'mid', seed: 542, flip: true, variant: 1 });
    A.push({ obj: 'person.walker', layer: 'mid', path: [[-120, 700], [1720, 690]], speed: 7, loop: 'pingpong', s: person('person.walker', 700), seed: 540, offset: 0.3 });
    A.push({ obj: 'person.cafe-goer', layer: 'near', path: [[1760, 860], [-120, 848]], speed: 5, loop: 'pingpong', s: person('person.cafe-goer', 852), seed: 541, offset: 0.5, flip: true });
    A.push({ obj: 'vehicle.car-city', layer: 'mid', path: [[-200, 600], [1600, 610]], speed: 5, loop: 'pingpong', s: metres('vehicle.car-city', 1.6, 605), seed: 543, offset: 0.1 });
    d.flocks.push({ obj: 'bird.small-flight', n: 8, area: [200, 60, 1150, 230], speed: 20, s: 0.44, seed: 556, layer: 'far' });
    d.flocks.push({ obj: 'bird.gull', n: 3, area: [880, 40, 1500, 140], speed: 26, s: 0.5, seed: 557, layer: 'far' });
    // the cover: planters at the footway, bollards, leaves in the gutter
    sceneWokCover(d, f, { obj: { 'plant.planter': 1, 'street.bollard': 1, 'ground.leaves': 3, 'ground.puddle': 1, 'street.lamp': 1, 'plant.shrub': 1 }, layer: 'near', seed: 550, y0: 600, y1: 900, n: 200, minGap: 18, s: [0.8, 1.05] });
    sceneWokCover(d, f, { obj: { 'plant.shrub': 1, 'plant.planter': 2 }, layer: 'fore', seed: 551, y0: 830, y1: 900, n: 10, minGap: 90, s: [0.9, 1.1] });
    return d;
  }

  /* ---------- the station and the level crossing: the barriers down, a train passing the platform ---------- */
  function stationCrossing(m) {
    const H = 400, f = sceneWokFrame(m), { data: d, metres, person, sOf } = f;
    const G = d.ground, P = d.place, A = d.actors, r = sceneRnd(4404);
    const pY = H + 70, tY = H + 128, road = 800;
    sceneWokHorizon(d, r, H + 6, 8, H + 70);
    d.scatter.push({ obj: { 'tree.distant': 2, 'tree.far-broad': 1 }, layer: 'horizon', seed: 600, area: { rect: [-150, H + 10, 1750, H + 40] }, n: 20, minGap: 40, s: [0.3, 0.5], variant: [0, 1], anim: false, tint: { col: '#7a8a9a', k: [0, 0.08] } });
    // the platform: a concrete edge, the lines on their ballast, the crossing road in front
    G.push({ layer: 'mid', d: `M-160 ${pY}H1760V${tY - 16}H-160Z`, fill: { lin: [[0, '@gravel.0'], [1, '@gravel.1']], x1: 0, y1: pY, x2: 0, y2: tY } });
    G.push({ layer: 'mid', d: `M-160 ${tY - 16}H1760V${tY - 10}H-160Z`, fill: '#c8c2b4' });
    for (const y of [tY, tY + 18, tY + 62]) G.push({ layer: 'mid', d: `M-160 ${y}H1760V${y + 3}H-160Z`, fill: '#5a5450' }, { layer: 'mid', d: `M-160 ${y + 9}H1760V${y + 12}H-160Z`, fill: '#4a4640' });
    G.push({ layer: 'near', d: `M-160 ${tY + 84}H1760V900H-160Z`, fill: { lin: [[0, '@road.1'], [1, '@road.0']], x1: 0, y1: tY + 84, x2: 0, y2: 900 } });
    G.push({ layer: 'near', d: `M${road - 210} ${tY + 84}H${road + 210}L${road + 360} 900H${road - 360}Z`, fill: '@pave.1' });
    for (let i = 0; i < 6; i++) G.push({ layer: 'near', d: `M${road - 200 + i * 2} ${tY + 88 + i * 18}H${road + 200 - i * 2}V${tY + 94 + i * 18}H${road - 200 + i * 2}Z`, fill: '#e8e4d8' });
    // the station building on the far platform (sized to read as a landmark), a clock and a lamp on the platform edge
    P.push({ obj: ST, x: 540, y: pY + 6, s: sOf(ST, 330), layer: 'far', seed: 5, anim: false });
    P.push({ obj: 'street.station-clock', x: 1260, y: pY + 30, s: metres('street.station-clock', 3.2, pY + 30), layer: 'mid', seed: 610, anim: false });
    P.push({ obj: 'street.lamppost', x: 1500, y: pY + 40, s: 1.0, layer: 'mid', seed: 611, anim: false });
    // the trains: one on the far line, one on the near line running the other way
    A.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[2100, tY + 30], [-900, tY + 30]], speed: 64, loop: 'loop', s: metres('rail.train-mainline', 3.8, tY + 30), seed: 620, offset: 0.25, variant: 3, flip: true });
    A.push({ obj: 'rail.train-mainline', layer: 'near', path: [[-900, tY + 96], [2400, tY + 96]], speed: 42, loop: 'loop', s: metres('rail.train-mainline', 3.8, tY + 96), seed: 621, offset: 0.8, variant: 1 });
    // the level crossing: the booms down over the road, cars queued either side, a tuk-tuk turning out
    P.push({ obj: 'structure.level-crossing', x: road, y: tY + 104, s: 1.2, layer: 'fore', seed: 630 });
    P.push({ obj: 'vehicle.car', x: road - 340, y: tY + 170, s: 1.4, variant: 1, layer: 'fore', seed: 631 });
    P.push({ obj: 'vehicle.car-city', x: road - 140, y: tY + 240, s: 1.7, variant: 2, layer: 'fore', seed: 632, flip: true });
    P.push({ obj: 'vehicle.tuk-tuk', x: road + 330, y: tY + 150, s: 1.3, variant: 0, layer: 'near', seed: 633, flip: true });
    // three people: two waiting by the barrier, one on the platform; a cyclist and a cyclist-commuter on the road
    P.push({ obj: 'person.phone-idler', x: road - 220, y: tY + 40, s: person('person.phone-idler', tY + 40), layer: 'mid', seed: 640 });
    P.push({ obj: 'person.student', x: road + 230, y: tY + 36, s: person('person.student', tY + 36), layer: 'mid', seed: 641, flip: true });
    P.push({ obj: 'person.student', x: 1140, y: pY + 26, s: person('person.student', pY + 26), layer: 'mid', seed: 642 });
    A.push({ obj: 'person.cyclist', layer: 'near', path: [[-200, tY + 150], [1800, tY + 152]], speed: 16, loop: 'loop', s: person('person.cyclist', tY + 150), seed: 644, offset: 0.4 });
    A.push({ obj: 'person.cyclist', layer: 'mid', path: [[1700, tY + 6], [-200, tY + 8]], speed: 9, loop: 'loop', s: person('person.cyclist', tY + 8), seed: 645, offset: 0.9, flip: true });
    // movers: a flock of small birds over the station, gulls over the roofs
    d.flocks.push({ obj: 'bird.small-flight', n: 8, area: [260, 70, 1400, 230], speed: 22, s: 0.44, seed: 656, layer: 'far' });
    d.flocks.push({ obj: 'bird.gull', n: 4, area: [120, 40, 1000, 130], speed: 30, s: 0.5, seed: 657, layer: 'far' });
    // the cover: trackside grass that sways in the wind, weeds on the ballast, bollards, planters and leaves on the road edge
    sceneWokCover(d, f, { obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'mid', seed: 650, y0: tY + 20, y1: tY + 60, n: 120, minGap: 16, s: [0.4, 0.95], anim: 'strip', mask: { avoid: [{ rect: [350, tY, 1100, tY + 70] }] } });
    sceneWokCover(d, f, { obj: { 'street.bollard': 2, 'plant.planter': 1, 'ground.leaves': 2, 'ground.puddle': 1, 'street.lamp': 1, 'plant.shrub': 1 }, layer: 'near', seed: 652, y0: tY + 90, y1: 900, n: 200, minGap: 20, s: [0.8, 1.05], mask: { avoid: [{ rect: [road - 300, tY + 90, road + 300, 900] }] } });
    sceneWokCover(d, f, { obj: { 'plant.grass': 2, 'ground.leaves': 1, 'ground.puddle': 1 }, layer: 'fore', seed: 653, y0: 840, y1: 900, n: 12, minGap: 80, s: [0.9, 1.1], anim: 'strip' });
    sceneWokCover(d, f, { obj: { 'plant.grass': 1, 'ground.leaves': 1 }, layer: 'near', seed: 659, y0: 600, y1: 660, n: 60, minGap: 20, s: [0.6, 0.9] });
    sceneWokCover(d, f, { obj: { 'plant.grass': 2, 'plant.wildflowers': 1 }, layer: 'mid', seed: 658, y0: 584, y1: 650, n: 90, minGap: 26, s: [0.4, 0.95], anim: 'strip' });
    P.push({ obj: 'street.lamp', x: 180, y: tY + 12, s: 1.05, layer: 'mid', seed: 655, anim: false });
    return d;
  }

  const ITEMS = [
    ['wokingham-market-place', 51.4113, -0.8339, 20, 350, 'Wokingham Market Place', 'The Market Place, Wokingham, from the south side', 'landmark', 'red', 'cheerful', 'wokingham|market place|market stalls|town hall|shoppers|berkshire', marketPlace],
    ['wokingham-broad-street', 51.4107, -0.8366, 80, 430, 'Broad Street, Wokingham', 'Broad Street, looking down to the Town Hall', 'heritage', 'red', 'calm', 'wokingham|broad street|georgian|one point perspective|town hall|berkshire', broadStreet],
    ['wokingham-rose-street', 51.4128, -0.8318, 30, 470, 'Rose Street, Wokingham', "Rose Street, a lane of timber-framed houses and All Saints' tower", 'heritage', 'amber', 'cosy', 'wokingham|rose street|timber framed|all saints|lane|berkshire', roseStreet],
    ['wokingham-station', 51.4114, -0.8428, 350, 400, 'Wokingham station and the level crossing', 'Wokingham station, the barriers down at the level crossing', 'heritage', 'blue', 'cheerful', 'wokingham|station|level crossing|railway|commuters|berkshire', stationCrossing],
  ];
  ITEMS.forEach(([key, lat, lon, heading, horizon, label, site, ukKind, colour, mood, tags, build]) => {
    const id = 'berkshire-' + key;
    sceneAdd(PACK, { id, label, site, ukKind, colour, mood, intensity: 'subtle', lat, lon, tags: tags.split('|') },
      () => build({ id, lat, lon, heading, horizon, at: 'afternoon', setting: 'urban', clouds: 5 }));
  });
})();
