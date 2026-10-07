/* ============================================================
   COMPOSED SCENES: the Basingstoke Canal at Fleet, the shared canal composer
   (docs/dev/SCENE_ENGINE.md, sections 3 and 5). PURE: one function, run
   lazily by the four view files' scene thunks
   (71-scene-uk-south-east-basingstoke-canal-fleet-1..4.js).

   sceneCanalView(V) returns the composed scene data of one view of a narrow
   canal in ONE-POINT PERSPECTIVE, the way the hand-drawn rich views drew it
   (72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1..v4.js, now their
   legacy art): world metres, X across the cut, Y up, z ahead of the eye.
   The Basingstoke Canal through Fleet is about 12.5 m of still green water
   (two narrowboats side by side with room to pass), a 2.5 to 3 m gravel
   towpath between the water and a hedge or tree line, oak, alder, willow and
   birch leaning over both banks, back gardens on the offside, and low brick
   arch road bridges (Reading Road, Pondtail) with the towpath under them.

   Everything is library objects placed in perspective:
   - the land is one strip per bank feature (towpath, verges, banks, fields)
     in its own unhazed 'land' layer, with a vertical gradient from the far
     (paler) to the near colour: aerial perspective in the fill;
   - depth decides an object's layer (its haze) and its size: a placement's
     scale is metres x F / z over the object's height, and a scatter rule's
     sByY table IS the perspective scale (on flat ground the scale grows
     linearly with y below the horizon);
   - the tree lines, hedges, verges and reeds are scatter rules over strips
     along the banks (LOD-thinnable, little data), with the light tree-line
     trees (70-scene-lib-trees-canal.js) so the SVG still stays small;
   - the movers are a measured set: waterfowl paddling, boats bobbing with
     stove smoke, walkers and a cyclist on the towpath, a swan pair gliding,
     a flock, a few trees and the verges swaying in the wind.

   V: { id, lat, lon, heading, at, F, h (eye above the towpath), hor, vx, side (1: towpath on the left),
        eyeX, zMax, bend, bendFrom, bands [z of the fore|near|mid|far|horizon boundaries],
        bridge: { z, v }, boats: [{ off, z, g, l, x, anim }], birds: [[obj, X, z, variant, flip]],
        swans: [X, z0, z1], folk: [[obj, X, zNear, zFar, variant, speed]], houses: [[X, z, h m, v]],
        towTrees, offTrees ({ obj: weight }), trees: [[obj, X, z, m, 'sway'?]] (hand-placed), parapet, seed }
   (When the engine's archetypes land, this becomes the `canal` archetype.)
   ============================================================ */
function sceneCanalView(V) {
  const W = { HEDGE: -3.6, TP0: -1.5, TP1: 1.3, WE: 1.9, WF: 14.4, OFF: 16.6, WY: -0.45 };
  const F = V.F, H = V.h, HOR = V.hor, VX = V.vx, SIDE = V.side || 1, EX = V.eyeX || 0, ZM = V.zMax || 700;
  const r1 = v => Math.round(v), r2 = v => Math.round(v * 100) / 100;
  const bendX = z => (V.bend ? V.bend * Math.pow(Math.max(0, z - (V.bendFrom || 80)), 2) : 0);
  const P = (X, Y, z) => [VX + (SIDE * (X - EX) + bendX(z)) * F / z, HOR + (H - Y) * F / z];
  const Z0 = Math.max(1, F * H / (940 - HOR));
  const rnd = sceneRnd(sceneHash('canal|' + V.id + '|' + (V.seed || 0)));
  const rr = (a, b) => a + rnd() * (b - a);
  const B = V.bands || [Z0, 20, 45, 110, 260, ZM];
  const LAY = ['fore', 'near', 'mid', 'far', 'horizon'];
  const layerOf = z => { for (let i = 0; i < 5; i++) if (z < B[i + 1]) return LAY[i]; return 'horizon'; };
  const cl = v => Math.max(-300, Math.min(1900, v));
  const pt = p => r1(cl(p[0])) + ' ' + r1(cl(p[1]));
  const zsOf = (z0, z1, n) => { const a = []; for (let i = 0; i < n; i++) a.push(z0 * Math.pow(z1 / z0, i / (n - 1))); return a; };
  const strip = (Xa, Ya, Xb, Yb, z0, z1, n) => {
    const zs = zsOf(z0, z1, n || 9);
    return 'M' + zs.map(z => pt(P(Xa, Ya, z))).join('L') + 'L' + zs.slice().reverse().map(z => pt(P(Xb, Yb, z))).join('L') + 'Z';
  };
  const poly = (Xa, Ya, Xb, Yb, z0, z1) => strip(Xa, Ya, Xb, Yb, z0, z1, 5).slice(1, -1).split('L').map(s => s.split(' ').map(Number));
  // object heights (units at s = 1, ground to top) for perspective sizing
  const HT = { tree: 400, 'plant.towpath-hedge': 130, 'plant.hedge': 140, 'plant.shrub': 135, 'plant.holly': 175, 'plant.grass': 34, 'plant.reed': 128, 'building.cottage': 184, 'structure.fence': 46,
    'person.walker': 64, 'person.dog-walker': 68, 'person.jogger': 64, 'person.cyclist': 76, 'person.family': 70, 'person.angler': 83, 'rock.boulder': 73 };
  const sAt = (o, m, z) => m * F / z / HT[o];
  const sBy = (o, m, Y, cap) => {
    const Hh = H - (Y || 0), k = m / Hh / HT[o], c = cap || 1.5, yc = HOR + c / k;   // scale k * (y - HOR), capped at c from yc down
    return yc >= 900 ? [[HOR + 4, r2(k * 4)], [900, r2(k * (900 - HOR))]] : [[HOR + 4, r2(k * 4)], [r1(yc), r2(c)], [900, r2(c)]];
  };
  // flat things on the ground or the water (puddles, leaf drifts, rings): sized by their WIDTH in metres over the object's width
  const sW = (m, wUnits, Y, cap) => { const k = m / (H - (Y || 0)) / wUnits, c = cap || 9, yc = HOR + c / k; return yc >= 900 ? [[HOR + 4, r2(k * 4)], [900, r2(k * (900 - HOR))]] : [[HOR + 4, r2(k * 4)], [r1(yc), r2(c)], [900, r2(c)]]; };
  const yOf = (z, Y) => P(0, Y || 0, z)[1];

  const ground = [], water = [], place = [], scatter = [], actors = [];
  // ---------- the land: one strip per feature, far (paler) to near in a vertical gradient
  const grad = (slot) => ({ lin: [[0, '@' + slot + '.2'], [0.25, '@' + slot + '.1'], [1, '@' + slot + '.0']], x1: 0, y1: HOR, x2: 0, y2: 900 });
  const zA = Z0 * 0.9;
  ground.push({ layer: 'land', d: `M-160 ${HOR - 1}H1760V${r1(HOR + 40)}H-160Z`, fill: grad('field') });
  ground.push({ layer: 'land', d: strip(-70, 0, W.HEDGE, 0, zA, ZM), fill: grad('field') });
  ground.push({ layer: 'land', d: strip(W.HEDGE, 0, W.TP0, 0, zA, ZM), fill: grad('verge') });
  ground.push({ layer: 'land', d: strip(W.TP0, 0, W.TP1, 0, zA, ZM), fill: grad('path') });
  ground.push({ layer: 'land', d: strip(W.TP1, 0, W.WE, W.WY, zA, ZM), fill: grad('bank') });
  ground.push({ layer: 'land', d: strip(W.WF, W.WY, W.OFF, 0.3, zA, ZM), fill: grad('bank') });
  ground.push({ layer: 'land', d: strip(W.OFF, 0.3, 70, 0.3, zA, ZM), fill: grad('field') });
  if (V.houses) ground.push({ layer: 'land', d: strip(W.OFF + 0.5, 0.3, W.OFF + 10, 0.3, zA, ZM * 0.5, 7), fill: grad('lawn') });
  // towpath ruts: a lighter middle line
  ground.push({ layer: 'land', d: strip(-0.35, 0, 0.35, 0, zA, ZM, 7), fill: grad('rut') });
  // ---------- the water: the far reach (reflecting the sky and the far tree line), the near reach (reflecting everything beyond it)
  const zW = B[3];
  water.push({ layer: 'far', d: strip(W.WE, W.WY, W.WF, W.WY, zW * 0.98, ZM, 6), y0: r1(yOf(ZM, W.WY)), y1: r1(yOf(zW, W.WY)), base: ['#a8ccc4', '#7aaaa0', '#5a8a82'], reflect: true });
  water.push({ layer: 'mid', d: strip(W.WE, W.WY, W.WF, W.WY, zA, zW, 7), y0: r1(yOf(zW, W.WY)), y1: 900, base: ['#86b4aa', '#4f8a80', '#2a5a54'], reflect: true, shimmer: 26, lightPath: true });
  const yW = yOf(zW, W.WY), wl = P(W.WE, W.WY, zA), wr = P(W.WF, W.WY, zA);
  const edgeAvoid = [{ rect: [r1(Math.min(wl[0], wr[0]) - 60), r1(yW - 44), r1(Math.max(wl[0], wr[0]) + 60), r1(yW + 44)] }, { rect: [-200, r1(yOf(ZM, W.WY) - 44), 1800, r1(yOf(ZM, W.WY) + 44)] }];
  // ---------- tree lines: scatter rules on strips along both banks, a band at a time (far bands thinner, fewer kinds)
  const towW = V.towTrees || { 'tree.bank-oak': 4, 'tree.bank-birch': 2, 'tree.bank-alder': 2 };
  const offW = V.offTrees || { 'tree.bank-alder': 3, 'tree.bank-willow': 2, 'tree.bank-oak': 2 };
  const tall = V.tall || 14;
  const firstZ = Math.max(B[1], tall * F / (HT.tree * (V.treeCap || 1.25)));
  let seed = 30;
  const treeBand = (w, Xa, Xb, za, zb, spacing, k, deep) => {
    if (zb <= za) return;
    const lay = layerOf((za + zb) / 2), n = Math.max(2, Math.round((zb - za) / spacing / (lay === 'horizon' ? 14 : lay === 'far' ? 5 : 1)));
    const far = lay === 'far' || lay === 'horizon';
    if (far) w = { 'tree.bank-distant': 1 };   // the far bands: the 1 KB distant tree (three shapes), not the bank trees
    scatter.push({ obj: w, layer: lay, seed: seed++, area: { poly: poly(Xa, 0, Xb, 0, za, zb) }, n, minGap: far ? 10 : 3, s: [0.8, 1.15], sByY: sBy('tree', tall * (k || 1), 0, V.treeCap || 1.25),
      variant: far ? (lay === 'horizon' ? [0, 1] : 'random') : deep ? [0, 0] : [0, 1], flip: 0.5, tint: lay === 'horizon' ? null : deep && !far ? { col: '#c8a050', k: [0.04, 0.11] } : V.treeTint === false && !far ? null : { col: '#c8a050', k: [0, 0.08] }, anim: false, mask: far ? null : { avoid: edgeAvoid } });
  };
  for (let i = 1; i < 5; i++) {
    const za = Math.max(B[i], firstZ), zb = B[i + 1], far = i >= 3;
    const fw = w => (far ? Object.fromEntries(Object.entries(w).slice(0, 2)) : w);
    treeBand(fw(towW), W.HEDGE - 1.6, W.HEDGE - 0.4, za, zb, far ? 3.2 : 3.6);
    treeBand(fw(offW), W.OFF + 0.2, W.OFF + 1.8, za, zb, V.houses ? 6 : far ? 3.2 : 3.8, 0.85);
    if (i >= 2) { treeBand({ 'tree.bank-oak': 1 }, W.HEDGE - 16, W.HEDGE - 6, za, zb, 6, 1.2, true); treeBand({ 'tree.bank-oak': 1 }, W.OFF + 12, W.OFF + 26, za, zb, 6, 1.2, true); }
  }
  // hero trees close by (hand-placed; a few sway)
  for (const t of V.trees || []) {
    const [o, X, z, m, sway] = t, p = P(X, 0, z), s = Math.min(V.heroCap || 1.8, m * F / z / HT.tree);
    place.push({ obj: o, x: r1(p[0]), y: r1(p[1]), s: r2(s), layer: t[5] || layerOf(z), variant: r1(z) % 2, flip: rnd() < 0.5, seed: r1(z * 37 + X), anim: sway ? undefined : false });
  }
  // ---------- hedge along the towpath, an understorey on the offside bank, reeds, verges, garden flowers
  const zN = B[2], zF = B[4], zH = Math.min(zN - 2, Math.max(zA, V.hedgeZ || 7));
  // sprite economy (one SVG symbol / canvas sprite per object, variant, haze and tint bucket): the fore, near and mid layers share
  // haze 0, and every rule uses variants 0 and 1 in two tint buckets (k 0 to 0.08 rounds to 0 or 0.08), so at most 4 sprites an object
  const rule = (o) => scatter.push(Object.assign({ variant: [0, 1], flip: 0.5, tint: { col: '#a8a050', k: [0, 0.08] }, anim: false, mask: { avoid: edgeAvoid } }, o));
  rule({ obj: 'plant.towpath-hedge', layer: 'near', seed: 50, area: { poly: poly(W.HEDGE - 0.5, 0, W.HEDGE + 0.1, 0, zH, zN) }, n: 26, minGap: 10, s: [0.85, 1.15], sByY: sBy('plant.towpath-hedge', 2.4, 0, 1.1) });
  rule({ obj: 'plant.towpath-hedge', layer: 'mid', seed: 51, area: { poly: poly(W.HEDGE - 0.5, 0, W.HEDGE + 0.1, 0, zN, zF) }, n: 40, minGap: 3, s: [0.85, 1.15], sByY: sBy('plant.towpath-hedge', 2.4) });
  rule({ obj: 'plant.towpath-hedge', layer: 'near', seed: 52, area: { poly: poly(W.OFF, 0.3, W.OFF + 1.4, 0.3, zH, zN) }, n: 18, minGap: 14, s: [0.8, 1.2], sByY: sBy('plant.towpath-hedge', 2.2, 0.3, 1.1) });
  rule({ obj: 'plant.towpath-hedge', layer: 'mid', seed: 53, area: { poly: poly(W.OFF, 0.3, W.OFF + 1.4, 0.3, zN, zF) }, n: 30, minGap: 3, s: [0.8, 1.2], sByY: sBy('plant.towpath-hedge', 2.2, 0.3) });
  rule({ obj: { 'plant.grass': 5, 'plant.wildflowers': 2 }, layer: 'fore', seed: 11, area: { poly: poly(W.HEDGE, 0, W.TP0 + 0.1, 0, zA, zN) }, n: V.foreN ? V.foreN[0] : 340, minGap: 7, s: [0.75, 1.25], sByY: sBy('plant.grass', 0.55), anim: 'strip' });
  rule({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1 }, layer: 'fore', seed: 12, area: { poly: poly(W.TP1 - 0.1, 0, W.WE, W.WY, zA, zN) }, n: V.foreN ? V.foreN[1] : 180, minGap: 7, s: [0.8, 1.3], sByY: sBy('plant.grass', 0.6) });   // static: y-sorted with the moored boats beside it
  rule({ obj: { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'mid', seed: 13, area: { poly: poly(W.HEDGE, 0, W.TP0, 0, zN, zF) }, n: 80, minGap: 3, s: [0.7, 1.3], sByY: sBy('plant.grass', 0.6) });
  rule({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'mid', seed: 20, area: { poly: poly(W.TP1, 0, W.WE, W.WY, zN, zF) }, n: 40, minGap: 3, s: [0.7, 1.3], sByY: sBy('plant.grass', 0.6) });
  rule({ obj: 'plant.reed', layer: 'near', seed: 14, area: { poly: poly(W.WF + 0.1, W.WY, W.OFF - 0.6, 0.1, zA, zN) }, n: 110, minGap: 9, s: [0.7, 1.25], sByY: sBy('plant.reed', 1.3, W.WY), mask: null });
  rule({ obj: 'plant.reed', layer: 'mid', seed: 15, area: { poly: poly(W.WF + 0.1, W.WY, W.OFF - 0.6, 0.1, zN, zF) }, n: 90, minGap: 6, s: [0.7, 1.3], sByY: sBy('plant.reed', 1.3, W.WY), mask: null });
  rule({ obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, layer: 'near', seed: 21, tint: null, area: { poly: poly(W.WE - 0.2, W.WY, W.WE + 0.3, W.WY, Math.max(zA, 12), zN) }, n: 30, minGap: 16, s: [0.6, 1], sByY: sBy('plant.reed', 1.1, W.WY), mask: { noise: { scale: 120, cut: 0.45 } } });
  rule({ obj: 'ground.leaves', layer: 'fore', seed: 16, area: { poly: poly(W.TP0 + 0.2, 0, W.TP1 - 0.2, 0, zA, zN) }, n: 28, minGap: 16, s: [0.6, 1.1], sByY: sW(0.7, 133, 0, 1.1) });
  rule({ obj: 'water.fish-ring', layer: 'near', seed: 22, area: { poly: poly(W.WE + 2, W.WY, W.WF - 3, W.WY, Math.max(zA, 9), zN) }, n: 8, minGap: 30, s: [0.8, 1.2], tint: null, sByY: sW(0.9, 92, W.WY, 1.2), mask: null });
  if (V.rocks !== false) rule({ obj: { 'rock.boulder': 1, 'rock.stones': 1 }, layer: 'near', seed: 23, area: { poly: poly(W.TP1, 0, W.WE - 0.1, W.WY, Math.max(zA, 6), zN) }, n: 24, minGap: 24, s: [0.55, 1.3], sByY: sBy('rock.boulder', 0.45, 0, 1), mask: { noise: { scale: 90, cut: 0.35 } } });
  rule({ obj: 'ground.puddle', layer: 'fore', seed: 24, tint: null, area: { poly: poly(W.TP0 + 0.3, 0, W.TP1 - 0.3, 0, Math.max(zA, 5), zN) }, n: 8, minGap: 44, s: [0.6, 1.2], sByY: sW(1.1, 160, 0, 1.1) });
  rule({ obj: 'water.lily', layer: 'near', seed: 17, tint: null, area: { poly: poly(W.WF - 2.6, W.WY, W.WF - 0.2, W.WY, Math.max(zA, 9), zN) }, n: 18, minGap: 10, s: [0.7, 1.2], sByY: [[HOR + 4, 0.01], [900, r2(1.2 * (900 - HOR) / (H - W.WY) / 140)]], mask: null });
  rule({ obj: { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'near', seed: 18, area: { poly: poly(W.OFF + 1, 0.3, W.OFF + 14, 0.3, zA, zN) }, n: 150, minGap: 7, s: [0.7, 1.3], sByY: sBy('plant.grass', 0.6, 0.3) });
  rule({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'near', seed: 19, area: { poly: poly(W.HEDGE - 16, 0, W.HEDGE - 0.6, 0, zA, zN) }, n: 110, minGap: 9, s: [0.7, 1.3], sByY: sBy('plant.grass', 0.7) });
  // ---------- the offside houses and their garden fences
  for (const [X, z, m, v, hl] of V.houses || []) {
    const p = P(X, 0.3, z);
    place.push({ obj: 'building.cottage', x: r1(p[0]), y: r1(p[1]), s: r2(sAt('building.cottage', m, z)), layer: hl || layerOf(z), variant: v, flip: SIDE * (X - EX) < 0, seed: r1(z * 7), reflect: true });
    const q = P(W.OFF + 1.6, 0.3, z + 1), s = sAt('structure.fence', 1.3, z + 1);
    if (s < 1.6 && s > 0.12) place.push({ obj: 'structure.fence', x: r1(q[0]), y: r1(q[1]), s: r2(s), layer: layerOf(z), variant: r1(z) % 2, flip: r1(z) % 2 === 0, seed: r1(z * 3), reflect: true });
  }
  // ---------- the brick road bridge down the reach (the towpath passes under its arch)
  if (V.bridge) {
    const z = V.bridge.z, p = P((W.TP0 + W.OFF) / 2 - 0.4, W.WY, z);
    place.push({ obj: 'structure.bridge-brick', x: r1(p[0]), y: r1(p[1]), s: r2(19.5 * F / z / 464), layer: layerOf(z), variant: V.bridge.v || 0, seed: 7, shadow: false });
  }
  // ---------- narrowboats moored along the bank (or one slowly passing), in perspective (boat.narrowboat-receding)
  const U = [70, 19, 104, 64, 20];
  for (const b of V.boats || []) {
    const x0 = b.off ? W.WF - 2.6 : W.WE + (b.x || 0.25), xa = SIDE * (x0 - EX), xb = SIDE * (x0 + 2.1 - EX);
    const Xv = Math.abs(xa) < Math.abs(xb) ? x0 : x0 + 2.1, sx = SIDE * (Xv - EX), p = P(Xv, W.WY, b.z);
    place.push({ obj: 'boat.narrowboat-receding', x: r1(p[0]), y: r1(p[1]), s: r2(F / b.z / U[b.g]), flip: sx > 0, variant: b.g * 3 + b.l, layer: b.layer || layerOf(b.z), seed: r1(b.z * 13), anim: b.anim === false ? false : undefined });
  }
  // ---------- waterfowl on the cut (paddle and turn)
  const LEN = { 'bird.heron': [0.95, 163], 'bird.swan': [1.5, 189], 'bird.mallard': [0.6, 119], 'bird.moorhen': [0.36, 97], 'bird.coot': [0.4, 104], 'bird.grebe': [0.45, 104] };
  for (const [o, X, z, v, flip] of V.birds || []) {
    const p = P(X, W.WY, z);
    place.push({ obj: o, x: r1(p[0]), y: r1(p[1]), s: r2(LEN[o][0] * F / z / LEN[o][1]), layer: layerOf(z), variant: v || 0, flip: !!flip, seed: r1(X * 31 + z) });
  }
  if (V.swans) {
    const [X, za, zb] = V.swans, a = P(X, W.WY, za), b = P(X + 0.6, W.WY, zb), lay = layerOf(za);
    for (const k of [0, 1]) {
      const s0 = r2(1.5 * F / za / 189), s1 = r2(1.5 * F / zb / 189);
      actors.push({ obj: 'bird.swan', variant: k, layer: lay, path: [[r1(a[0] + k * 50 * s0), r1(a[1] + k * 8)], [r1(b[0] + k * 50 * s1), r1(b[1] + k * 4)]], speed: 3, loop: 'pingpong', s: 1, sByY: [[r1(b[1]), s1], [r1(a[1]), s0]], seed: 40 + k, offset: k * 0.04 });
    }
  }
  // ---------- people on the towpath (small: 30 m off or more), walking along it
  for (const [o, X, zn, zf, v, speed] of V.folk || []) {
    const a = P(X, 0, zn), b = P(X, 0, zf);
    const sn = r2(Math.min(sAt(o, 1.72, zn), 58 / HT[o])), sf = Math.min(sAt(o, 1.72, zf), 58 / HT[o]);
    actors.push({ obj: o, variant: v || 0, layer: layerOf(zn), path: [[r1(a[0]), r1(a[1])], [r1(b[0]), r1(b[1])]], speed: speed || 8, loop: 'pingpong', s: sn,
      sByY: [[r1(b[1]), r2(sf / sn)], [r1(a[1]), 1]], seed: r1(zn * 17 + zf), offset: r2(rr(0, 1)) });
  }
  // ---------- the bridge parapet we stand on (the view from Reading Road bridge)
  if (V.parapet) {
    ground.push({ layer: 'front', d: 'M-160 872H1760V960H-160Z', fill: '@brick.0' }, { layer: 'front', d: 'M-160 880H1760V883H-160Z', fill: '@brick.1' });
    ground.push({ layer: 'front', d: 'M-160 860H1760V876H-160Z', fill: '@coping.0' }, { layer: 'front', d: 'M-160 874H1760V877H-160Z', fill: '@coping.1' });
  }
  return {
    v: 1, id: V.id, view: { lat: V.lat, lon: V.lon, heading: V.heading, fov: 70, horizon: HOR, lift: 1 },
    at: V.at || 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural',
    palette: {
      base: { path: ['#b4966a', '#c0a682', '#ccbca4'], rut: ['#c8b08a', '#cdb894', '#d4c6ae'], brick: ['#9a5a40', '#7a4434'], coping: ['#cfc6b4', '#a89e8c'] },
      spring: { field: ['#5f8e3a', '#80a854', '#a8c08a'], verge: ['#55883a', '#76a24e', '#9cb882'], bank: ['#4a7434', '#5e8640', '#8aa478'], lawn: ['#6a9e44', '#86ae5c', '#a8c08a'] },
      summer: { field: ['#4e7c32', '#6e9644', '#9ab07e'], verge: ['#4a7c34', '#6a9244', '#94ac7c'], bank: ['#3e6a30', '#557a3c', '#86a074'], lawn: ['#5e9040', '#7aa452', '#9ab07e'] },
      autumn: { field: ['#7a7a3a', '#9a9452', '#b4ae84'], verge: ['#6e7e3c', '#8a904c', '#aaa882'], bank: ['#5e6434', '#747440', '#9a9a78'], lawn: ['#6e8e40', '#88a052', '#aab084'], path: ['#a88456', '#b8986c', '#c8b296'] },
      winter: { field: ['#7a8672', '#949e8c', '#b4bab0'], verge: ['#6e7c66', '#8a9482', '#acb2a8'], bank: ['#5a6452', '#6e7866', '#9aa094'], lawn: ['#7a8c6e', '#909c86', '#b0b8aa'], path: ['#aaa08e', '#bab2a2', '#cac6ba'], rut: ['#c4bcaa', '#cac4b4', '#d4d0c6'] },
    },
    sky: { stars: 170, clouds: { n: 5, y: [40, Math.max(120, HOR - 140)], speed: 5 }, sunR: 24, moonR: 17 },
    layers: [{ id: 'land', depth: 0.05, haze: 0 }, { id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.3 }, { id: 'mid', depth: 0.45, haze: 0 },
      { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    ground, water, place, scatter, actors,
    flocks: [{ obj: 'bird.small-flight', n: 7, area: [VX - 520, 60, VX + 420, Math.max(160, HOR - 90)], speed: 34, s: 0.55, seed: 9, layer: 'mid' }],
    particles: 'season', weather: 'live',
  };
}
