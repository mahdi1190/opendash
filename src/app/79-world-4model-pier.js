/* ---------- a Victorian seaside pier as a real 3D model (16 Oct, "engine work needed" of the fast-scene test) ----------
   structure.pier: a long timber deck carried on pairs of piles with cross braces, a cast-iron railing both sides, lamp standards,
   small kiosks (gabled, striped awnings), an entrance pair of little toll-houses at the landward end, and at the seaward end a
   wide PAVILION (a theatre hall with arched windows, a gabled roof, a domed turret at each front corner and a flagpole).
   It is a FLOATER only in the sense that its base is the waterline: the deck is 3.1 m above it (a pier over the sea, a seawall
   promenade 3 m above the water at its landward end), the piles stand in the water. Entity: { obj: 'structure.pier', at, facing,
   attach: 'water' } where `at` is the CENTRE and `facing` runs from the shore to the sea. 150 m by 9 m at size 1; scale with `model.size`. */
const _WMD_PIER_LIVERIES = Object.freeze([
  { name: 'green-cream', iron: '#2f5b4b', cream: '#efe6cc', deck: '#8a7860', roof: '#587a8e', dome: '#3e6a5a', accent: '#b23a2c', awn: ['#b23a2c', '#f1ead6'] },
  { name: 'white-blue', iron: '#f0ede4', cream: '#f4efe0', deck: '#938168', roof: '#3d5a78', dome: '#2f4a6b', accent: '#2f4a6b', awn: ['#2f6a9a', '#f1ead6'] },
  { name: 'maroon-cream', iron: '#6a2a2c', cream: '#ece1c4', deck: '#85735b', roof: '#4d5a64', dome: '#4a3a3c', accent: '#c9a24a', awn: ['#c9a24a', '#6a2a2c'] },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.pier'))) sceneObjDefine({
  id: 'structure.pier', category: 'structure', size: [900, 120], variants: 1, seasonal: false, flippable: true, real: { h: 12, l: 150, w: 9 },
  palette: { base: { deck: '#8a7860', pile: '#4e4236', hall: '#efe6cc', roof: '#587a8e' } }, parts: ['body'],
  tags: ['uk', 'coast', 'seaside', 'pier', 'kit:temperate', 'kit:water', 'role:landmark', 'class:structure'],
  credit: 'fast-scene test: a generic Victorian pier (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@pile', 'M-440 0H440V-26H-440Z'], ['@deck', 'M-440 -26H440V-34H-440Z'], ['@hall', 'M300 -34H430V-80H300Z'], ['@roof', 'M290 -80L365 -110L440 -80Z']] }; },
});
/** One bay of the pier from a0 to a1 at width B: the piles below the deck, the deck, then the railings far side first. */
function _wmdPierBay(h, p, liv, a0, a1, hw, yD, k, iron, farFirst) {
  h.part('bay' + Math.round(a0), { layer: 1, key: h.depth((a0 + a1) / 2, 0, yD) });
  // piles: two rows of two, braced
  for (const a of [a0 + 0.4 * k, a1 - 0.4 * k]) {
    for (const l of [-hw + 0.7 * k, hw - 0.7 * k]) h.cyl(a, l, 0, yD, 0.24 * k, 0.2 * k, h.aged('#4b4036', 'timber'), { mat: 'timber', role: 'pile', n: 6, cap: false });
    h.line([h.P(a, -hw + 0.7 * k, 0.9 * k), h.P(a, hw - 0.7 * k, yD - 0.4 * k)], 0.1 * k, h.aged('#4e4338', 'timber'), 'timber', 'brace');
    h.line([h.P(a, hw - 0.7 * k, 0.9 * k), h.P(a, -hw + 0.7 * k, yD - 0.4 * k)], 0.1 * k, h.aged('#4e4338', 'timber'), 'timber', 'brace');
  }
  h.box(a0, a1, -hw, hw, yD - 0.35 * k, yD, h.aged(liv.deck, 'timber'), h.aged(liv.deck, 'timber'), 'timber', 'deck');
  // the deck's boards: a few seams along its length (only when near enough to read)
  if (h.fine) for (const l of [-hw * 0.5, 0, hw * 0.5]) h.line([h.P(a0, l, yD + 0.004), h.P(a1, l, yD + 0.004)], 0.03 * k, h.shade(liv.deck, 0.78), 'timber', 'seam');
  const rails = [[-hw, -1], [hw, 1]].sort((x, y) => (farFirst ? y[1] - x[1] : x[1] - y[1]));
  for (const [l] of rails) h.rail([[a0, l], [a1, l]], yD, 1.05 * k, iron, { mat: 'metal', post: 1.5 * k, mid: true, w: 0.04 * k });
}
worldModelDefine('pier', {
  name: 'Victorian seaside pier', ids: ['structure.pier', 'landmark.pier-uk'], sampleObj: 'structure.pier', float: true, bob: false, solidity: 'solid', faceCap: 1500,
  dims() { return { L: 150, B: 9, H: 12 }; },   // fixed: the library size is only a sprite's
  liveries: () => _WMD_PIER_LIVERIES,
  params(ent, o, p) { return p.liveryKey != null ? null : { liveryKey: (p.seed >>> 3) % _WMD_PIER_LIVERIES.length }; },
  samples: [{ livery: 'green-cream' }, { livery: 'white-blue', age: 0.5 }, { livery: 'maroon-cream', size: 0.7 }],
  build(p, h) {
    const k = p.size, L = p.L, hw = p.B / 2, liv = p.livery, yD = 3.1 * k, iron = h.aged(liv.iron, 'metal');
    const pavL = Math.min(36 * k, L * 0.3), aP = L / 2 - pavL, aS = -L / 2;
    // which rail is the far one from the eye (drawn first)
    const farFirst = h.depth(0, hw, yD) > h.depth(0, -hw, yD);
    // the bays, far to near along the pier by their centres (the part key does it)
    const nb = Math.max(4, Math.round((aP - aS) / (7 * k)));
    for (let i = 0; i < nb; i++) _wmdPierBay(h, p, liv, aS + (aP - aS) * i / nb, aS + (aP - aS) * (i + 1) / nb, hw, yD, k, iron, farFirst);
    // lamp standards along the deck, and kiosks
    h.part('furniture', { layer: 3, key: h.depth(0, 0, yD + 2) });
    const nl = Math.max(3, Math.round((aP - aS) / (16 * k)));
    for (let i = 1; i < nl; i++) {
      const a = aS + (aP - aS) * i / nl, l = i % 2 ? -hw + 0.3 * k : hw - 0.3 * k;
      h.cyl(a, l, yD, yD + 3.4 * k, 0.07 * k, 0.045 * k, iron, { mat: 'metal', role: 'lamp-post', n: 5 });
      h.lamp(a, l, yD + 3.65 * k, 0.22 * k, { col: '#ffe6a8', kind: 'pier-lamp' });
    }
    for (let i = 0; i < 3; i++) {
      const a = aS + (aP - aS) * (0.25 + 0.25 * i + 0.04 * (h.u('k' + i) - 0.5)), l = (i % 2 ? 1 : -1) * (hw - 1.7 * k);
      h.box(a - 1.3 * k, a + 1.3 * k, l - 1.1 * k, l + 1.1 * k, yD, yD + 2.5 * k, h.aged(liv.cream), h.aged(liv.cream), 'render', 'kiosk');
      h.gable(a - 1.5 * k, a + 1.5 * k, l - 1.3 * k, l + 1.3 * k, yD + 2.5 * k, yD + 3.3 * k, h.aged(liv.roof), { mat: 'slate', ridge: 'a' });
      h.cloth([[a - 1.5 * k, l - 1.3 * k, yD + 2.4 * k], [a + 1.5 * k, l - 1.3 * k, yD + 2.4 * k], [a + 1.5 * k, l - 1.9 * k, yD + 1.9 * k], [a - 1.5 * k, l - 1.9 * k, yD + 1.9 * k]], 0.05, liv.awn[0], { stripe: liv.awn, nu: 6, nv: 1 });
    }
    // the entrance: two little toll-houses with pitched roofs at the landward end
    h.part('gate', { layer: 3, key: h.depth(aS + 2 * k, 0, yD + 2) });
    for (const sg of [-1, 1]) {
      const l0 = sg > 0 ? hw - 0.2 * k : -hw - 2.6 * k;
      h.box(aS + 0.5 * k, aS + 3.5 * k, l0, l0 + 2.8 * k, yD, yD + 2.6 * k, h.aged(liv.cream), h.aged(liv.cream), 'render', 'toll-house');
      h.hip(aS + 0.3 * k, aS + 3.7 * k, l0 - 0.2 * k, l0 + 3 * k, yD + 2.6 * k, yD + 3.8 * k, h.aged(liv.roof), { mat: 'slate' });
    }
    // the pavilion: a wide deck, the hall, two domed turrets at the front corners
    const hwP = hw * 1.9, a0 = aP, a1 = L / 2;
    h.part('pavilion-deck', { layer: 1, key: h.depth((a0 + a1) / 2, 0, yD) });
    for (const a of [a0 + 1 * k, (a0 + a1) / 2, a1 - 1 * k]) for (const l of [-hwP + 0.8 * k, 0, hwP - 0.8 * k]) h.cyl(a, l, 0, yD, 0.26 * k, 0.22 * k, h.aged('#4b4036', 'timber'), { mat: 'timber', role: 'pile', n: 6, cap: false });
    h.box(a0, a1, -hwP, hwP, yD - 0.4 * k, yD, h.aged(liv.deck, 'timber'), h.aged(liv.deck, 'timber'), 'timber', 'deck');
    h.part('pavilion', { layer: 2, key: h.depth((a0 + a1) / 2, 0, yD + 3) });
    const ha0 = a0 + 3 * k, ha1 = a1 - 2.5 * k, hl = hwP - 2.2 * k, yE = yD + 6.4 * k;
    h.box(ha0, ha1, -hl, hl, yD, yE, h.aged(liv.cream), h.aged(liv.cream), 'render', 'hall');
    h.gable(ha0 - 0.4 * k, ha1 + 0.4 * k, -hl - 0.4 * k, hl + 0.4 * k, yE, yE + 3.4 * k, h.aged(liv.roof), { mat: 'slate', ridge: 'a', over: 0.1 * k });
    for (const [a, sg] of [[ha0, -1], [ha1, 1]]) {
      const S = h.surface((u, v, off) => h.P(a + sg * off, u, v), { normal: [sg, 0, 0] });
      S.windows({ u0: -hl + 1.4 * k, u1: hl - 0.8 * k, v: yD + 3.2 * k, step: 2.6 * k, kind: 'rect', w: 0.6 * k, h: 1.5 * k, glass: '#2f4452', trim: '#fff7e2', dark: 0.2 });
    }
    for (const sg of [-1, 1]) {
      const S = h.surface((u, v, off) => h.P(u, sg * (hl + off), v), { normal: [0, sg, 0] });
      S.windows({ u0: ha0 + 1.4 * k, u1: ha1 - 0.8 * k, v: yD + 3.2 * k, step: 2.8 * k, kind: 'rect', w: 0.6 * k, h: 1.5 * k, glass: '#2f4452', trim: '#fff7e2', dark: 0.2 });
    }
    // turrets with domes at the two seaward corners, and a flagpole
    h.part('turrets', { layer: 3, key: h.depth(a1 - 2 * k, 0, yD + 6) });
    for (const sg of [-1, 1]) {
      const ta = ha1 - 0.2 * k, tl = sg * (hl - 0.4 * k);
      h.cyl(ta, tl, yD, yE + 2.0 * k, 1.3 * k, 1.15 * k, h.aged(liv.cream), { mat: 'render', role: 'turret', n: 10, cap: false });
      h.frustum(h.ngon(ta, tl, 1.55 * k, 10), yE + 2.0 * k, h.ngon(ta, tl, 0.2 * k, 10), yE + 4.6 * k, h.aged(liv.dome, 'metal'), { mat: 'metal', role: 'dome' });
      h.line([h.P(ta, tl, yE + 4.5 * k), h.P(ta, tl, yE + 5.6 * k)], 0.05 * k, iron, 'metal', 'finial');
    }
    h.line([h.P((ha0 + ha1) / 2, 0, yE + 3.3 * k), h.P((ha0 + ha1) / 2, 0, yE + 8.4 * k)], 0.08 * k, '#d8d4c8', 'metal', 'flagpole');
    h.cloth([[(ha0 + ha1) / 2, 0, yE + 8.2 * k], [(ha0 + ha1) / 2, 0, yE + 7.2 * k], [(ha0 + ha1) / 2 + 1.9 * k, 0.1, yE + 7.3 * k], [(ha0 + ha1) / 2 + 1.9 * k, 0.1, yE + 8.1 * k]], 0.15 * k, liv.accent, { nu: 4, nv: 2 });
    // the railing round the pavilion deck
    h.part('pavilion-rail', { layer: 4, key: h.depth((a0 + a1) / 2, 0, yD + 1) });
    h.rail([[a0, -hwP], [a1, -hwP], [a1, hwP], [a0, hwP]], yD, 1.05 * k, iron, { post: 1.5 * k, mid: true, w: 0.04 * k });
    return { height: (yD + 12 * k), footprint: [[-L / 2, -hw], [aP, -hw], [aP, -hwP], [L / 2, -hwP], [L / 2, hwP], [aP, hwP], [aP, hw], [-L / 2, hw]] };
  },
});
