/* ---------- a lychgate as a real 3D model (17 Oct, the Cotswold green: "no lychgate") ----------
   structure.lychgate: the roofed timber gateway to an English churchyard: four oak corner posts on stone footings, tie beams, a pitched
   roof (stone slates in courses with a ridge, or clay tiles) with barge boards, a timber-framed gable (a king post and struts on an
   infill) at each end, a seat rail each side, and a pair of low slatted gates across the path (shut or ajar by seed). It is
   `passable`: a path runs through it. The ridge runs along `facing` (the line of the path through the gate), a gable faces the lane.
   3.6 m by 3.2 m by 3.9 m at size 1. Livery: oak, black-white, red-tile. */
const _WMD_LG_LIVERIES = Object.freeze([
  { name: 'oak', post: '#7a6a55', infill: '#d9cfb4', roof: '#857963', roofHi: '#a09578', roofMat: 'slate', gate: '#6f5a40' },
  { name: 'black-white', post: '#2f2a26', infill: '#e6dfc9', roof: '#7b8a8c', roofHi: '#97a4a5', roofMat: 'slate', gate: '#2f2a26' },
  { name: 'red-tile', post: '#6e5a45', infill: '#d6c9a7', roof: '#9a4c36', roofHi: '#b5603f', roofMat: 'tile', gate: '#5d4a38' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.lychgate'))) sceneObjDefine({
  id: 'structure.lychgate', category: 'structure', size: [110, 130], variants: 1, seasonal: false, flippable: true, real: { h: 3.9, l: 3.6, w: 3.2 },
  palette: { base: { post: '#7a6a55', roof: '#857963' } }, parts: ['body'], tags: ['uk', 'village', 'churchyard', 'kit:temperate', 'role:street', 'class:street'],
  credit: 'a churchyard lychgate (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@post', 'M-50 0V-90H-42V0Z'], ['@post', 'M42 0V-90H50V0Z'], ['@roof', 'M-60 -90L0 -125L60 -90Z']] }; },
});
worldModelDefine('lychgate', {
  name: 'Lychgate', ids: ['structure.lychgate'], sampleObj: 'structure.lychgate', solidity: 'passable', faceCap: 700,
  dims() { return { L: 3.6, B: 3.2, H: 3.9 }; },
  liveries: () => _WMD_LG_LIVERIES,
  samples: [{ livery: 'oak', seed: 3 }, { livery: 'black-white', seed: 6 }, { livery: 'red-tile', seed: 9, age: 0.7 }, { livery: 'oak', size: 1.2, seed: 12 }],
  build(p, h) {
    const k = p.size, liv = p.livery, A = 1.8 * k, Lh = 1.45 * k, post = h.aged(liv.post, 'timber'), roof = h.aged(liv.roof, 'stone', 0.7), yE = 2.45 * k, yR = 3.95 * k, pw = 0.1 * k;
    const rn = (() => { let a = (p.seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    h.contactShadow(-A - 0.3 * k, A + 0.3 * k, -Lh - 0.3 * k, Lh + 0.3 * k, 0.3);
    h.part('base', { layer: 1 });
    const stone = h.aged('#a39b86', 'stone', 0.7);
    for (const sa of [-1, 1]) for (const sl of [-1, 1]) h.box(sa * A - 0.2 * k, sa * A + 0.2 * k, sl * Lh - 0.2 * k, sl * Lh + 0.2 * k, 0, 0.3 * k, stone, h.shade(stone, 1.1), 'stone', 'footing');
    for (const sl of [-1, 1]) h.box(-A + 0.2 * k, A - 0.2 * k, sl * Lh - 0.09 * k, sl * Lh + 0.09 * k, 0.42 * k, 0.5 * k, post, post, 'timber', 'seat');
    h.part('posts', { layer: 2 });
    for (const sl of [-1, 1]) for (const y of [0.9 * k, 1.35 * k]) h.box(-A, A, sl * Lh - 0.035 * k, sl * Lh + 0.035 * k, y, y + 0.08 * k, post, post, 'timber', 'rail');
    for (const sa of [-1, 1]) for (const sl of [-1, 1]) h.box(sa * A - pw, sa * A + pw, sl * Lh - pw, sl * Lh + pw, 0.3 * k, yE, post, post, 'timber', 'post');
    for (const sa of [-1, 1]) h.box(sa * A - 0.06 * k, sa * A + 0.06 * k, -Lh - 0.1 * k, Lh + 0.1 * k, yE - 0.16 * k, yE, post, post, 'timber', 'tie-beam');
    for (const sl of [-1, 1]) h.box(-A - 0.2 * k, A + 0.2 * k, sl * Lh - 0.06 * k, sl * Lh + 0.06 * k, yE - 0.1 * k, yE + 0.06 * k, post, post, 'timber', 'plate');
    // the timber-framed gable at each end: infill panel, king post, two struts
    h.part('gables', { layer: 3 });
    for (const sa of [-1, 1]) {
      const a = sa * A;
      if (!h.sees([sa, 0, 0], [a, 0, yE + 0.5 * k])) continue;
      const nn = h.nOf([sa, 0, 0]);
      h.face([h.P(a, -Lh, yE), h.P(a, Lh, yE), h.P(a, 0, yR - 0.1 * k)], h.aged(liv.infill, 'paint', 0.7), 'render', 'infill', null, { n: nn.map(v => Math.round(v * 100) / 100), sun: 1 });
      h.line([h.P(a + sa * 0.01, 0, yE), h.P(a + sa * 0.01, 0, yR - 0.05 * k)], 0.1 * k, post, 'timber', 'king-post');
      for (const sl of [-1, 1]) h.line([h.P(a + sa * 0.01, sl * 0.05 * k, yE + 0.7 * k), h.P(a + sa * 0.01, sl * Lh * 0.7, yE)], 0.07 * k, post, 'timber', 'strut');
    }
    h.part('roof', { layer: 4 });
    h.gable(-A - 0.45 * k, A + 0.45 * k, -Lh, Lh, yE, yR, roof, { mat: liv.roofMat, ridge: 'a', over: 0.35 * k, end: h.aged(liv.infill, 'paint', 0.7), endMat: 'render' });
    for (const sl of [-1, 1]) {
      const e = Lh + 0.35 * k, yo = yE - 0.1 * k;
      if (!h.sees([0, sl * (yR - yE), e], [0, sl * e * 0.5, (yE + yR) / 2])) continue;
      const at = (a, t) => h.P(a, sl * e * (1 - t), yo + (yR - yo) * t);
      for (let t = 0.12; t < 1; t += 0.16 - 0.08 * t) { if (h.px(0.3 * k) < 2) break; h.line([at(-A - 0.45 * k, t), at(A + 0.45 * k, t)], 0.03 * k, h.shade(roof, 0.74), liv.roofMat, 'course', { alpha: 0.55 }); }
      for (let t = 0.05; t < 1; t += 0.2) { const a0 = -A - 0.45 * k + rn() * 2 * k, a1 = Math.min(A + 0.45 * k, a0 + (1 + rn() * 2) * k); h.face([at(a0, t), at(a1, t), at(a1, t + 0.18), at(a0, t + 0.18)], h.mix(roof, liv.roofHi, rn()), liv.roofMat, 'slates', null, { alpha: 0.4 }); }
    }
    h.line([h.P(-A - 0.45 * k, 0, yR + 0.07 * k), h.P(A + 0.45 * k, 0, yR + 0.07 * k)], 0.2 * k, h.shade(liv.roofHi, 1.05), 'stone', 'ridge');
    for (const sa of [-1, 1]) for (const sl of [-1, 1]) h.line([h.P(sa * (A + 0.45 * k), sl * (Lh + 0.35 * k), yE - 0.12 * k), h.P(sa * (A + 0.45 * k), 0, yR + 0.02 * k)], 0.1 * k, post, 'timber', 'barge-board');
    // the gates: two low slatted leaves across the path in the middle, shut or ajar
    h.part('gate', { layer: 5 });
    const ajar = rn() < 0.4, gh = 1.15 * k, gc = h.aged(liv.gate, 'timber');
    for (const sl of [-1, 1]) {
      const l0 = sl * 0.04 * k, l1 = sl * (Lh - 0.15 * k), a1 = ajar && sl > 0 ? 0.7 * k : 0;
      const e1 = a1 === 0 ? l1 : sl * Math.sqrt(Math.max(0.01, (Lh - 0.15 * k) ** 2 - a1 ** 2));
      for (const y of [0.2 * k, 0.65 * k, gh]) h.line([h.P(0, l0, y), h.P(a1, e1, y)], 0.06 * k, gc, 'timber', 'gate-rail');
      for (let i = 0; i <= 6; i++) { const t = i / 6; h.line([h.P(a1 * t, l0 + (e1 - l0) * t, 0.2 * k), h.P(a1 * t, l0 + (e1 - l0) * t, gh)], 0.045 * k, gc, 'timber', 'slat'); }
    }
    return { height: yR + 0.2 * k };
  },
});
