/* ============================================================
   SCENE LIBRARY: urban planting (docs/dev/SCENE_ENGINE.md 2.3, 2.7 kit urban): the dense ground cover of streets.
   PURE: sceneObjDefine calls only. Anchor: the foot of the planter.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const rr = (r, a, b) => a + r() * (b - a);

  /* ---------- plant.planter: a timber, stone or steel planter of shrubs and flowers, by season ---------- */
  sceneObjDefine({
    id: 'plant.planter', category: 'plant', size: [70, 44], variants: 3, seasonal: true, flippable: true,
    palette: { base: { box: ['#7a5a3e', '#a8a49a', '#4a4e52'], boxShade: '#2e2620' },
      spring: { leaf: ['#3f7a32', '#79aa45', '#a8d06a'], bloom: ['#f2d23a', '#f4f0f6'] },
      summer: { leaf: ['#2f6a2c', '#4f8a38', '#7aac4c'], bloom: ['#d84a6a', '#9a6ad0'] },
      autumn: { leaf: ['#7a6a2a', '#a8803a', '#c89a48'], bloom: ['#d8782a', '#b8482a'] },
      winter: { leaf: ['#3a5040', '#4e6450', '#6a7a64'], bloom: ['#c82a2a', '#e8e8e0'] } },
    tags: ['city', 'planter', 'flowers', 'kit:urban', 'role:ground'],
    credit: 'native: a street planter',
    build(v, r) {
      const lf = ['', '', ''], bl = ['', ''];
      for (let i = 0; i < 14; i++) { const x = rr(r, -30, 30), y = rr(r, -40, -18); lf[i % 3] += ell(x, y, rr(r, 6, 10), rr(r, 5, 8)); }
      for (let i = 0; i < 12; i++) bl[i % 2] += ell(rr(r, -28, 28), rr(r, -42, -24), 2.2, 2.2);
      return { body: [['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@leaf.2', lf[2]], ['@bloom.0', bl[0]], ['@bloom.1', bl[1]], [`@box.${v}`, rect(-34, -20, 68, 20)], ['@boxShade', rect(12, -20, 22, 20), 0.35], ['@boxShade', rect(-34, -20, 68, 2), 0.4]] };
    },
  });
})();
