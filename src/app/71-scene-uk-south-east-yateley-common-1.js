/* ============================================================
   COMPOSED SCENE uk-south-east / Yateley Common, view 1 of 4 (wide):
   from the heather ridge on the Common's south side, looking south over the
   falling heath, the A30 and Blackbushe airfield (docs/dev/SCENE_ENGINE.md
   section 3; helpers and sources in 71-scene-uk-south-east-yateley-common-0.js).
   A raised view (the horizon high): we stand on the crest. The ridge fills
   the bottom right under a big veteran Scots pine (the frame and the
   signature) and its heather lip runs across the whole foot of the frame,
   so the ground beyond it drops away into the hollow (the heath there is
   seen small, from above). A sandy firebreak runs over the lip and down
   the slope toward the airfield. Below: the open heath of the hollow with
   lone pines, birch scrub and the grazing Belted Galloways; then the A30
   (Hartford Bridge Flats) with its traffic and its roadside trees, the
   airfield's perimeter fence, and Blackbushe itself: mown grass in strips,
   the long runway (07/25) with its threshold stripes, centreline and
   aiming marks, the parallel taxiway and its links, the apron with parked
   light aircraft and a helicopter, the terminal with its tower and cafe,
   hangars of three kinds and sizes, the windsock, and the line of trees
   along the far boundary. A Cessna comes in to land on 25, another taxis
   out, one holds at the runway, another flies the circuit. Far: the wooded
   ridge toward Hazeley Heath. The live sun, moon and stars.
   Lint, look and time it with:
     node tools/anim-pack.mjs scene lint uk-south-east/hampshire-yateley-common-1 --perf
     node tools/anim-pack.mjs scene sheet uk-south-east/hampshire-yateley-common-1 --times --seasons --contact
   ============================================================ */
function sceneYateleyCommon1(season) {
  const Y = _scYc, winter = season === 'winter', summer = season === 'summer', spring = season === 'spring', autumn = season === 'autumn';
  const R = (v) => Math.round(v * 10) / 10;
  // the firebreak: from our feet (bottom left) down the slope toward the airfield (right of centre)
  const TRACK = [[1010, 502, 6], [950, 526, 14], [900, 562, 24], [800, 616, 44], [640, 690, 86], [520, 780, 150], [420, 905, 240]];
  // the ridge we stand on: a bank of heather rising to the bottom right
  const RIDGE = [[700, 905], [820, 830], [980, 752], [1160, 700], [1360, 668], [1560, 656], [1780, 650], [1780, 905]];
  // the lip of the crest across the foot of the frame (the firebreak goes over it a little left of centre)
  const CREST = [[-160, 806], [60, 796], [240, 802], [400, 818], [560, 814], [700, 800], [840, 778], [980, 752], [1160, 700], [1360, 668], [1560, 656], [1780, 650]];
  const ridgeTop = (x) => { for (let i = 0; i < RIDGE.length - 2; i++) { const [x0, y0] = RIDGE[i], [x1, y1] = RIDGE[i + 1]; if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return 650; };
  const trackMid = Y.around(TRACK, 498, 650, 10), trackLow = Y.around(TRACK, 640, 800, 18), trackFore = Y.around(TRACK, 790, 910, 18);
  const ridgeArea = { poly: RIDGE.slice(0, -1).map(([x, y]) => [x, y + 14]).concat([[1780, 905], [700, 905]]) };
  // the slope below the crest is seen from above, far down: its cover stays small right to the lip, so the texture
  // jumps in size at the crest (the drop reads)
  const slope = (r) => (r.layer === 'mid' ? Object.assign({}, r, { sByY: [[562, 0.75], [818, 0.92]] }) : r);
  const sand = { lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: 500, y2: 905 };

  /* ---------- Blackbushe: the airfield seen from the ridge, runway 07/25 running across the view ---------- */
  // the runway's centreline (a little nearer at the left) and its half width
  const rwyY = (x) => 421 - (x - 40) * 8 / 1160, rwyW = (x) => 6.6 - (x - 40) * 1.6 / 1160;
  const tilt = (x) => -(x - 40) * 8 / 1160;   // the airfield's slant (its strips and paint follow the runway)
  const X0 = 40, X1 = 1200;
  const strip = (xa, xb, off, h) => `M${R(xa)} ${R(rwyY(xa) + off * rwyW(xa))}L${R(xb)} ${R(rwyY(xb) + off * rwyW(xb))}l0 ${h}L${R(xa)} ${R(rwyY(xa) + off * rwyW(xa) + h)}z`;
  const RWY = `M${X0} ${R(rwyY(X0) - rwyW(X0))}L${X1} ${R(rwyY(X1) - rwyW(X1))}L${X1 + 2} ${R(rwyY(X1) + rwyW(X1))}L${X0 - 3} ${R(rwyY(X0) + rwyW(X0))}Z`;
  let paint = '', rubber = '';
  // edge lines, the centreline dashes, the threshold stripes and aiming points at both ends, the touchdown zone bars
  paint += strip(X0 + 6, X1 - 6, -0.92, 0.6) + strip(X0 + 6, X1 - 6, 0.86, 0.7);
  for (let x = X0 + 64; x < X1 - 64; x += 30) paint += strip(x, x + 14, -0.06, 0.8);
  for (const [xa, xb] of [[X0 + 6, X0 + 26], [X1 - 26, X1 - 6]]) for (const off of [-0.74, -0.5, -0.26, 0.18, 0.42, 0.66]) paint += strip(xa, xb, off, 0.9);
  for (const [xa, xb] of [[X0 + 150, X0 + 186], [X1 - 186, X1 - 150]]) for (const off of [-0.6, 0.36]) paint += strip(xa, xb, off, 1.6);
  for (const x of [X0 + 70, X0 + 100, X0 + 230, X1 - 100, X1 - 130, X1 - 230]) for (const off of [-0.66, 0.42]) paint += strip(x, x + 12, off, 1);
  // the tyre rubber where the landings touch down (most land on 25: the right end)
  for (const [xa, xb] of [[X1 - 300, X1 - 150], [X1 - 140, X1 - 60], [X0 + 110, X0 + 190]]) rubber += strip(xa, xb, -0.22, rwyW(xa) * 0.4);
  // the parallel taxiway (nearer us) into the apron, its links to the runway, its yellow centreline and holding bars
  const twyY = (x) => rwyY(x) + 19, TW = 2.6;
  let taxi = `M150 ${R(twyY(150) - TW)}L1190 ${R(twyY(1190) - TW)}L1190 ${R(twyY(1190) + TW)}L146 ${R(twyY(146) + TW)}Z`, tline = '', hold = '';
  for (const x of [70, 560, 1130]) {
    const x2 = x === 70 ? 60 : x - 10;
    taxi += `M${x + 70} ${R(twyY(x + 70) - TW)}Q${x + 20} ${R(twyY(x + 20) - TW)} ${x2 + 6} ${R(rwyY(x2) + rwyW(x2))}L${x2 + 20} ${R(rwyY(x2) + rwyW(x2))}Q${x + 30} ${R(twyY(x + 30) - TW - 3)} ${x + 100} ${R(twyY(x + 100) - TW)}Z`;
    hold += `M${x2 + 6} ${R(rwyY(x2) + rwyW(x2) + 4)}h16v0.8h-16z`;
  }
  for (let x = 160; x < 1180; x += 12) tline += `M${x} ${R(twyY(x) - 0.3)}h7v0.6h-7z`;
  // the apron by the terminal and hangars, its parking marks
  const APRON = 'M1150 437L1190 414L1760 408L1760 470L1180 470L1150 456Z';
  let pmark = '';
  for (let x = 1200; x < 1700; x += 70) pmark += `M${x} 459h18v0.7h-18zM${x + 8} 449v10h0.7v-10z`;
  // the grass mown in long strips along the runway (they widen toward us), and its rougher and paler patches
  let mown = '', rough = '', pale = '';
  for (let y = 396, k = 0; y < 476; k++) {
    const h = 1.6 + (y - 396) * 0.07;
    if (k % 2 === 0) mown += `M-160 ${R(y + tilt(-160))}L1760 ${R(y + tilt(1760))}l0 ${R(h)}L-160 ${R(y + tilt(-160) + h)}z`;
    y += h;
  }
  const rp = sceneRnd(7171);
  for (let i = 0; i < 26; i++) {
    const x = -140 + rp() * 1880, y = 400 + rp() * 74, rx = 30 + rp() * 130 * (0.5 + (y - 400) / 74), ry = 0.8 + (y - 400) / 74 * 2.4;
    const yy = y + tilt(x), dd = `M${R(x - rx)} ${R(yy)}Q${R(x - rx * 0.4)} ${R(yy - ry)} ${R(x)} ${R(yy - ry * 0.8)}T${R(x + rx)} ${R(yy)}Q${R(x)} ${R(yy + ry * 0.7)} ${R(x - rx)} ${R(yy)}z`;
    if (i % 3) rough += dd; else pale += dd;
  }
  // the perimeter fence (concrete posts, the wires and the mesh), the A30 verges, the road and its markings
  let posts = '', wires = '';
  for (let x = -160; x < 1760; x += 15) posts += `M${x} 472.4h0.9v6h-0.9z`;
  wires = 'M-160 472.6H1760v0.5H-160zM-160 475.2H1760v0.4H-160z';
  let a30 = '';
  for (let x = -150; x < 1760; x += 26) a30 += `M${x} ${R(490.6 + x * 0.0008)}h12v0.7h-12z`;

  const d = {
    v: 1, id: 'yateley-common-wide-' + season,
    view: { lat: 51.334, lon: -0.836, heading: 185, fov: 78, horizon: 372, lift: 1.6 },
    at: 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', weather: 'live', particles: 'season',
    palette: Y.pal({
      base: { lip: '#3a3024', runway: ['#86867f', '#9e9e97'], paint: '#f2f2ea', rubber: '#5e5e5a', taxi: '#7a7a74', tline: '#e0b830', apron: ['#a4a29a', '#8e8c86'], fence: '#9aa0a2', mesh: '#6e7466', road: ['#45454a', '#5a5a5c'] },
      // the airfield grass: the mown strips (lit), the grass, the rough, the paler dry patches
      spring: { field: ['#94a85e', '#869a50', '#70843f', '#a0ae70'] },
      summer: { field: ['#9ea260', '#909654', '#7a8044', '#b4ae72'] },
      autumn: { field: ['#949a5e', '#878c52', '#727442', '#a89e68'] },
      winter: { field: ['#868a6c', '#7a7e60', '#66694e', '#96927a'] },
    }),
    layers: Y.layers,
    sky: { stars: 200, clouds: { n: 6, y: [30, 250], speed: 5 }, sunR: 26, moonR: 20 },
    ground: [
      // the far ridge toward Hazeley Heath, wooded
      { layer: 'horizon', d: Y.band(366, 3, 60, 400), fill: '@wood.0' },
      // Blackbushe: the grass in mown strips, its rough and pale patches
      { layer: 'far', d: Y.band(392, 2, -40, 500), fill: { lin: [[0, '@field.1'], [1, '@field.2']], y1: 392, y2: 480 } },
      { layer: 'far', d: mown, fill: '@field.0' },
      { layer: 'far', d: rough, fill: '@field.2' },
      { layer: 'far', d: pale, fill: '@field.3' },
      // the runway, its rubber and paint; the taxiway, its links, centreline and holding bars; the apron
      { layer: 'far', d: RWY, fill: { lin: [[0, '@runway.1'], [1, '@runway.0']], y1: 406, y2: 428 } },
      { layer: 'far', d: rubber, fill: '@rubber' },
      { layer: 'far', d: paint, fill: '@paint' },
      { layer: 'far', d: taxi, fill: '@taxi' },
      { layer: 'far', d: APRON, fill: { lin: [[0, '@apron.1'], [1, '@apron.0']], y1: 408, y2: 466 } },
      { layer: 'far', d: tline + hold + pmark, fill: '@tline' },
      // the perimeter fence, the verge, the A30 and its centre line
      { layer: 'far', d: 'M-160 473H1760V478H-160Z', fill: '@mesh' },
      { layer: 'far', d: posts + wires, fill: '@fence' },
      { layer: 'far', d: Y.band(478, 1, 30, 486), fill: '@field.2' },
      { layer: 'far', d: 'M-160 486.5Q600 485 1760 488.5V500Q600 498.5 -160 500Z', fill: { lin: [[0, '@road.1'], [1, '@road.0']], y1: 486, y2: 500 } },
      { layer: 'far', d: a30, fill: '@paint' },
      // the hollow of the Common below us: heath falling away, then the slope up to the crest
      { layer: 'far', d: Y.band(499, 3, 20, 560), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: 498, y2: 560 } },
      { layer: 'far', d: Y.mounds(-160, 1760, 508, 552, 40, 1611, [22, 44]), fill: '@mound.0' },
      { layer: 'far', d: Y.track(TRACK, 500, 560), fill: sand },
      { layer: 'mid', d: Y.band(548, 6, 40, 836), fill: { lin: [[0, '@heath.1'], [0.4, '@heath.2'], [0.8, '@heath.1'], [1, '@heath.0']], y1: 548, y2: 836 } },
      { layer: 'mid', d: Y.mounds(-160, 1760, 562, 640, 30, 1612, [30, 56]), fill: '@mound.1' },
      { layer: 'mid', d: Y.track(TRACK, 552, 826), fill: sand },
      { layer: 'mid', d: Y.ruts(TRACK, 590, 826).ruts, fill: { lin: [[0, '@rut.0'], [1, '@rut.1']], y1: 590, y2: 905 } },
      { layer: 'mid', d: Y.ruts(TRACK, 660, 826).crown, fill: '@crown.1' },
      // the crest we stand on: its lip across the frame (lit along the edge), the firebreak coming over it
      { layer: 'fore', d: Y.poly([[-300, 812]].concat(CREST, [[1900, 648], [1900, 1000], [-300, 1000]]), true), fill: { lin: [[0, '@lip'], [0.12, '@heath.2'], [1, '@bank.1']], y1: 790, y2: 905 } },
      { layer: 'fore', d: Y.track(TRACK, 800, 905), fill: sand },
      { layer: 'fore', d: Y.ruts(TRACK, 806, 905).ruts, fill: '@rut.1' },
      { layer: 'fore', d: Y.ruts(TRACK, 806, 905).crown, fill: '@crown.0' },
      // the ridge bank (its own darker heath), over the slope
      { layer: 'fore', d: Y.poly(RIDGE, true), fill: { lin: [[0, '@mound.0'], [0.12, '@mound.1'], [0.5, '@heath.2'], [1, '@bank.1']], y1: 650, y2: 905 } },
    ],
    place: [
      // Blackbushe: the terminal with its tower and cafe, hangars of three kinds and sizes (the T-hangars and a small
      // hangar across the runway), the windsock
      { obj: 'building.yc-terminal', x: 1262, y: 426, s: 0.4, layer: 'far', seed: 1, anim: false, shadow: false },
      { obj: 'building.yc-hangar', x: 1440, y: 418, s: 0.42, layer: 'far', variant: 0, seed: 2, anim: false, shadow: false },
      { obj: 'building.yc-hangar', x: 1590, y: 416, s: 0.3, layer: 'far', variant: 1, flip: true, seed: 3, anim: false, shadow: false },
      { obj: 'building.yc-hangar', x: 1060, y: 404, s: 0.24, layer: 'far', variant: 2, seed: 4, anim: false, shadow: false },
      { obj: 'building.yc-hangar', x: 900, y: 403, s: 0.2, layer: 'far', variant: 0, flip: true, seed: 5, anim: false, shadow: false },
      { obj: 'prop.yc-windsock', x: 860, y: 431, s: 0.28, layer: 'far', seed: 6 },
      // the apron: light aircraft parked in two rows, a helicopter on its pad
      { obj: 'vehicle.light-aircraft', x: 1196, y: 452, s: 0.25, layer: 'far', variant: 0, seed: 7, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1262, y: 455, s: 0.23, layer: 'far', variant: 1, flip: true, seed: 8, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1332, y: 456, s: 0.24, layer: 'far', variant: 0, seed: 9, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1402, y: 455, s: 0.23, layer: 'far', variant: 1, seed: 10, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1484, y: 456, s: 0.24, layer: 'far', variant: 0, flip: true, seed: 11, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1380, y: 438, s: 0.16, layer: 'far', variant: 0, flip: true, seed: 12, anim: false },
      { obj: 'vehicle.light-aircraft', x: 1530, y: 436, s: 0.17, layer: 'far', variant: 1, seed: 13, anim: false },
      { obj: 'vehicle.yc-helicopter', x: 1296, y: 468, s: 0.26, layer: 'far', variant: 0, flip: true, seed: 14 },
      // a Cessna holding at the runway, ready to line up (the link by the apron)
      { obj: 'vehicle.light-aircraft', x: 1136, y: 428, s: 0.21, layer: 'far', variant: 1, flip: true, seed: 15 },
      // the signature: the veteran Scots pine on the ridge crest, the frame on the right
      { obj: 'tree.pine-veteran', x: 1430, y: ridgeTop(1430) + 26, s: 1.3, layer: 'fore', variant: 0, seed: 20 },
      // the ridge crest: banks of heather and gorse, a dead pine snag (the stonechat's perch)
      { obj: 'plant.wyv-heath-bank', x: 960, y: ridgeTop(960) + 34, s: 1.0, layer: 'fore', variant: 1, seed: 21, anim: false },
      { obj: 'plant.wyv-heath-bank', x: 1170, y: ridgeTop(1170) + 30, s: 1.25, layer: 'fore', variant: 0, flip: true, seed: 22, anim: false },
      { obj: 'plant.wyv-heath-bank', x: 1630, y: ridgeTop(1630) + 40, s: 1.3, layer: 'fore', variant: 2, seed: 23, anim: false },
      { obj: 'plant.gorse', x: 1260, y: ridgeTop(1260) + 60, s: 1.05, layer: 'fore', variant: 1, seed: 24, anim: false },
      { obj: 'plant.gorse', x: 820, y: 900, s: 0.95, layer: 'fore', variant: 0, flip: true, seed: 25, anim: false },
      { obj: 'tree.wyv-snag', x: 1060, y: ridgeTop(1060) + 28, s: 0.9, layer: 'fore', variant: 1, seed: 26, anim: false },
      { obj: 'bird.stonechat', x: 1074, y: ridgeTop(1060) - 122, s: 1.1, layer: 'fore', variant: 0, flip: true, seed: 27 },
      { obj: 'plant.bracken', x: 1540, y: 905, s: 2.1, layer: 'front', variant: 1, flip: true, seed: 28, anim: { sway: { k: 0.6 } } },
      { obj: 'animal.rabbit', x: 640, y: 852, s: 0.9, layer: 'fore', variant: 0, seed: 29 },
      // the left foot of the frame: a gorse spray close up (a Dartford warbler on its dead stem)
      { obj: 'plant.yc-gorse-spray', x: 40, y: 924, s: 1.35, layer: 'front', variant: 1, seed: 30 },
      { obj: 'bird.dartford-warbler', x: -14, y: 664, s: 1.5, layer: 'front', flip: true, seed: 31 },
      // the hollow: Belted Galloways and a red cow grazing, New Forest ponies further over
      { obj: 'animal.cattle', x: 330, y: 590, s: 0.3, layer: 'mid', variant: 2, seed: 32 },
      { obj: 'animal.cattle', x: 400, y: 600, s: 0.32, layer: 'mid', variant: 2, flip: true, seed: 33 },
      { obj: 'animal.cattle', x: 250, y: 606, s: 0.33, layer: 'mid', variant: 0, seed: 34 },
      { obj: 'animal.pony', x: 1240, y: 596, s: 0.24, layer: 'mid', variant: 0, flip: true, seed: 35 },
      { obj: 'animal.pony', x: 1296, y: 602, s: 0.25, layer: 'mid', variant: 2, seed: 36 },
      // birch scrub and a few young pines in the hollow (in clumps, not rows; their tops well below us)
      { obj: 'tree.birch-heath', x: 120, y: 566, s: 0.26, layer: 'mid', variant: 2, seed: 37, anim: false },
      { obj: 'tree.birch-heath', x: 170, y: 572, s: 0.21, layer: 'mid', variant: 0, flip: true, seed: 38, anim: false },
      { obj: 'tree.pine-veteran', x: 560, y: 566, s: 0.24, layer: 'mid', variant: 1, seed: 39, anim: false },
      { obj: 'tree.birch-heath', x: 1460, y: 580, s: 0.3, layer: 'mid', variant: 1, seed: 40, anim: false },
      { obj: 'tree.pine-veteran', x: 1530, y: 590, s: 0.32, layer: 'mid', variant: 0, flip: true, seed: 41, anim: false },
      { obj: 'plant.gorse', x: 640, y: 594, s: 0.3, layer: 'mid', variant: 2, seed: 42, anim: false },
      { obj: 'plant.gorse', x: 1100, y: 610, s: 0.32, layer: 'mid', variant: 0, flip: true, seed: 43, anim: false },
      { obj: 'plant.gorse', x: 960, y: 590, s: 0.28, layer: 'mid', variant: 1, seed: 44, anim: false },
      // the slope below the crest (seen small, from above): gorse with a stonechat, a birch beside the firebreak
      { obj: 'plant.gorse', x: 200, y: 706, s: 0.42, layer: 'near', variant: 0, seed: 45, anim: false },
      { obj: 'plant.gorse', x: 770, y: 716, s: 0.4, layer: 'near', variant: 1, flip: true, seed: 46, anim: false },
      { obj: 'plant.gorse', x: 60, y: 760, s: 0.5, layer: 'near', variant: 1, seed: 47, anim: false },
      { obj: 'bird.stonechat', x: 773, y: 676, s: 0.6, layer: 'near', variant: 1, seed: 48 },
      { obj: 'tree.birch-heath', x: 870, y: 690, s: 0.46, layer: 'near', variant: 1, seed: 49, anim: { sway: { k: 0.7 } } },
    ],
    scatter: [
      // the far wooded ridge, hazed; the airfield's line of trees along its far boundary (oaks and pines, a gap or two)
      { obj: 'tree.woods-edge', layer: 'horizon', seed: 1, area: { rect: [-160, 368, 1760, 374] }, n: 26, minGap: 60, s: [0.16, 0.26], flip: 0.5, variant: [0, 1, 2], anim: false },
      { obj: 'tree.woods-edge', layer: 'far', seed: 2, area: { rect: [-160, 389, 1760, 395] }, n: 30, minGap: 52, s: [0.17, 0.25], flip: 0.5, variant: [0, 1, 2], tint: { col: '#6a7040', k: [0, 0.14] }, anim: false },
      { obj: { 'tree.wyv-far-oak': 2, 'tree.distant-pine': 3 }, layer: 'far', seed: 4, area: { rect: [-160, 393, 1760, 396] }, n: 12, minGap: 90, s: [0.09, 0.16], mask: { noise: { scale: 320, cut: 0.45 } }, flip: 0.5, variant: [0, 1, 2], tint: { col: '#6a7040', k: [0, 0.14] }, anim: false },
      // the A30's roadside trees on the Common side, in clumps (the middle left open: the view down to the runway)
      { obj: { 'tree.wyv-far-oak': 2, 'tree.birch-heath': 2, 'tree.distant-pine': 1 }, layer: 'far', seed: 3, area: { rect: [-160, 500, 1760, 505] }, n: 16, minGap: 26, s: [0.09, 0.16], mask: { noise: { scale: 200, cut: 0.45 }, avoid: [{ rect: [380, 490, 1180, 512] }] }, flip: 0.5, variant: [0, 1], tint: { col: '#7a6a3a', k: [0, 0.14] }, anim: false },
      // scrub along the A30's far verge by the fence (gorse, birch, in patches)
      { obj: { 'plant.gorse': 3, 'tree.birch-heath': 1 }, layer: 'far', seed: 7, area: { rect: [-140, 479, 1740, 482] }, n: 24, minGap: 30, s: [0.06, 0.12], mask: { noise: { scale: 260, cut: 0.5 } }, flip: 0.5, variant: [0, 1], anim: false },
      // lone pines over the hollow, in loose groups (noise), never a row
      { obj: 'tree.pine-veteran', layer: 'far', seed: 5, area: { rect: [-120, 512, 1720, 600] }, n: 7, minGap: 150, s: [0.06, 0.13], sByY: [[512, 0.7], [600, 1.4]], mask: { noise: { scale: 360, cut: 0.5 }, avoid: [{ poly: trackMid }] }, flip: 0.5, variant: [0, 1], anim: false },
      { obj: 'tree.birch-heath', layer: 'far', seed: 6, area: { rect: [-120, 514, 1720, 548] }, n: 8, minGap: 70, s: [0.09, 0.14], sByY: [[514, 0.8], [548, 1.2]], mask: { noise: { scale: 300, cut: 0.5 }, avoid: [{ poly: trackMid }] }, flip: 0.5, variant: [0, 1, 2], anim: false },
      // the heath below the crest is seen from above and far: the mid-sized drifts and carpet run down to the lip
      ...[...Y.drifts({ seed: 10, ride: TRACK, far: [506, 560], mid: [566, 818], fore: [810, 920], n: { far: 110, mid: 190, fore: 24 },
        avoid: { fore: [ridgeArea], mid: [{ poly: RIDGE.map(([x, y]) => [x, y + 40]) }] } }),
      ...Y.carpet({ season, seed: 10, far: [502, 556], mid: [562, 818], fore: [808, 905], n: { far: 60, mid: 170, fore: 40, grass: 26 },
        avoid: { far: [{ poly: trackMid }], mid: [{ poly: trackMid }, { poly: trackLow }, { poly: RIDGE.map(([x, y]) => [x, y + 30]) }], fore: [{ poly: trackFore }, ridgeArea] } })].map(slope),
      // the ridge's own cover: ling and bell heather cushions over the bank
      { obj: { 'plant.heather': 5, 'plant.grass': 1 }, layer: 'fore', seed: 14, area: ridgeArea, n: 46, minGap: 34, s: [1.1, 1.7], sByY: [[690, 0.85], [905, 1.2]], flip: 0.5, variant: [0, 1], anim: false },
      // the heather fringe along the lip, against the drop beyond
      { obj: 'plant.heather', layer: 'fore', seed: 15, area: { poly: CREST.slice(0, 8).map(([x, y]) => [x, y + 2]).concat(CREST.slice(0, 8).reverse().map(([x, y]) => [x, y + 16])) }, n: 30, minGap: 30, s: [0.9, 1.3], mask: { avoid: [{ poly: trackFore }] }, flip: 0.5, variant: [0, 1], anim: false },
      // bracken on the slope left of the firebreak (copper in autumn)
      { obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [-160, 700, 340, 800] }, n: 4, minGap: 70, s: [0.4, 0.62], mask: { avoid: [{ poly: trackLow }] }, flip: 0.5, variant: [0, 1], anim: false },
    ],
    actors: [
      // a Cessna landing on 25 (from the right, descending to touch down, then the rollout), another taxiing along the
      // parallel taxiway, a third flying the circuit
      { obj: 'vehicle.light-aircraft', layer: 'far', path: [[1640, 250], [1420, 300], [1250, 352], [1140, 398], [1070, 409], [900, 412], [700, 414], [460, 417]], speed: 28, loop: 'fade', s: 1, sByY: [[250, 0.42], [410, 0.21]], seed: 71, offset: 0.21 },
      { obj: 'vehicle.light-aircraft', layer: 'far', path: [[1180, R(twyY(1180) - 2.6)], [700, R(twyY(700) - 2.6)], [200, R(twyY(200) - 2.6)]], speed: 9, loop: 'pingpong', s: 0.19, variant: 1, seed: 78, offset: 0.25 },
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 200], [1800, 160]], speed: 22, loop: 'loop', s: 0.4, variant: 1, seed: 72, offset: 0.7 },
      // the A30 traffic, both ways (a coach among the cars)
      { obj: 'vehicle.car', layer: 'far', path: [[-180, 494], [1780, 495]], speed: 46, loop: 'loop', s: 0.15, variant: 0, seed: 73, offset: 0.1 },
      { obj: 'vehicle.car', layer: 'far', path: [[-180, 494], [1780, 495]], speed: 52, loop: 'loop', s: 0.15, variant: 3, seed: 75, offset: 0.62 },
      { obj: 'vehicle.car', layer: 'far', path: [[-180, 494], [1780, 495]], speed: 44, loop: 'loop', s: 0.15, variant: 4, seed: 79, offset: 0.36 },
      { obj: 'vehicle.car', layer: 'far', path: [[1780, 491], [-180, 490]], speed: 40, loop: 'loop', s: 0.14, variant: 2, seed: 74, offset: 0.55 },
      { obj: 'vehicle.car', layer: 'far', path: [[1780, 491], [-180, 490]], speed: 48, loop: 'loop', s: 0.14, variant: 1, seed: 80, offset: 0.08 },
      { obj: 'vehicle.bus', layer: 'far', path: [[1780, 491], [-180, 490]], speed: 36, loop: 'loop', s: 0.13, variant: 0, seed: 81, offset: 0.82 },
      // on the firebreak: a dog walker climbing toward us, a walker going down
    ],
    flocks: [
      { obj: 'bird.small-flight', n: winter ? 9 : 5, area: [200, 120, 1100, 300], speed: 26, s: 0.5, seed: 81, layer: 'horizon' },
      { obj: 'bird.small-flight', n: 3, area: [400, 520, 1000, 580], speed: 34, s: 0.4, seed: 82, layer: 'far' },
    ],
  };
  // the season's own life
  if (summer || spring) {
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1040, 790], [1120, 770], [1080, 806]], speed: 30, loop: 'pingpong', s: 1.1, seed: 83 });
    d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[1300, 760], [1380, 742], [1340, 780]], speed: 26, loop: 'pingpong', s: 1, seed: 84 });
  }
  Y.butterflies[season].forEach((v, i) => d.actors.push({ obj: 'animal.butterfly', layer: 'fore', path: [[160 + i * 220, 840], [280 + i * 200, 812], [220 + i * 210, 870], [340 + i * 190, 846]], speed: 22, loop: 'pingpong', s: 1, variant: v, seed: 90 + i, offset: i * 0.3 }));
  if (winter) d.place.push({ obj: 'bird.robin', x: 1250, y: ridgeTop(1250) + 4, s: 1.3, layer: 'fore', variant: 0, seed: 95 });
  if (autumn) d.flocks.push({ obj: 'bird.goose-flight', n: 6, area: [300, 100, 1000, 220], speed: 30, s: 0.5, seed: 97, layer: 'horizon' });
  // the walkers by the motion behaviours (sceneYgMovers, 70-scene-lib-yateley-green-views.js): on the ground, round the
  // trunks and the gate posts, at their real size for the view's fitted eye (13.1 m)
  if (typeof sceneYgMovers === 'function') d.actors = sceneYgMovers(d, 13.1, [
    { obj: 'person.dog-walker', preset: 'dog-walker', px: Y.path(TRACK, 660, 800).reverse(), layer: 'near', seed: 76, offset: 0.3 },
    { obj: 'person.walker', preset: 'stroll', px: Y.path(TRACK, 540, 640), layer: 'mid', variant: 1, seed: 77, offset: 0.6 },
  ]).concat(d.actors);
  return d;
}
