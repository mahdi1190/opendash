/* ============================================================
   SCENE LIBRARY: street trees (docs/dev/SCENE_ENGINE.md 2.3, 2.7 kits urban / temperate).
   PURE: sceneObjDefine calls only. A LIGHT tree for dense urban scenes (about 60 shapes and well under
   the 60 KB path budget, where the heath trees are far heavier). Lit from the LEFT. Anchor: the foot of the trunk.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  /** A soft lobed cluster: n quadratic bumps round an ellipse. */
  const blob = (r, cx, cy, rx, ry, n) => {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.3, k = 0.86 + r() * 0.18; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - cx, oy = my - cy, l = Math.hypot(ox, oy) || 1, b = 0.3 * Math.hypot(q[0] - p[0], q[1] - p[1]); d += `Q${f1(mx + ox / l * b)} ${f1(my + oy / l * b)} ${f1(q[0])} ${f1(q[1])}`; }
    return d + 'z';
  };
  /* ---------- tree.plane: a London plane (mottled bark, a broad rounded crown; bare with seed balls in winter) ---------- */
  sceneObjDefine({
    id: 'tree.plane', category: 'tree', size: [300, 420], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    parts: ['trunk', 'crown'],
    palette: { base: { bark: ['#8a8470', '#6a6452', '#b8b49a', '#c8c0a0'], twig: '#5a5444', ball: '#6a5a3a' },
      spring: { leaf: ['#3f6e2e', '#5f9a3a', '#8cc05a', '#b4dc7a'] },
      summer: { leaf: ['#2a5226', '#3e7032', '#5a9040', '#86b45a'] },
      autumn: { leaf: ['#7a5a22', '#a87a2e', '#c8983a', '#e2bc5a'] },
      winter: { leaf: ['#5a5444', '#6a6452', '#7a7462', '#8a8472'] } },
    anim: { sway: { part: 'crown', pivot: [0, -170], deg: 1.6 } },
    shadow: { rx: 90, ry: 12, h: 420 }, reflect: true,
    tags: ['uk', 'london', 'street-tree', 'plane', 'deciduous', 'kit:urban', 'kit:temperate', 'role:tree'],
    credit: 'native: a London plane',
    build(v, r, ctx) {
      const s = ctx.season, h = 380 + v * 20, w = 250 + v * 25, tw = 16 + v * 2;
      const trunk = [['@bark.0', `M${-tw / 2} 0C${-tw / 2} -60 ${-tw * 0.4} -120 -6 -170L6 -170C${tw * 0.4} -120 ${tw / 2} -60 ${tw / 2} 0z`], ['@bark.1', `M2 0C3 -60 4 -120 6 -170L${tw * 0.4} -150C${tw / 2} -80 ${tw / 2} -40 ${tw / 2} 0z`, 0.6]];
      let mott = '';
      for (let i = 0; i < 9; i++) { const y = -rr(r, 10, 160), x = rr(r, -tw / 2 + 3, tw / 2 - 5); mott += `M${f1(x)} ${f1(y)}h${f1(rr(r, 3, 6))}v${f1(rr(r, 5, 10))}h${f1(-rr(r, 3, 6))}z`; }
      trunk.push(['@bark.2', mott, 0.7]);
      // limbs (always): three main forks
      const limbs = [[-0.9, 0.62], [-0.15, 0.85], [0.7, 0.66]].map(([dx, k]) => `M0 -168Q${f1(dx * w * 0.2)} ${f1(-170 - h * 0.2 * k)} ${f1(dx * w * 0.36)} ${f1(-170 - h * 0.42 * k)}`).join('');
      const crown = [{ s: '@bark.1', w: 7, cap: 'round', d: limbs }];
      if (s === 'winter') {
        let tw2 = '', balls = '';
        for (let i = 0; i < 26; i++) { const a = rr(r, -2.6, -0.5), L = rr(r, 40, 110), x0 = rr(r, -w * 0.32, w * 0.32), y0 = -rr(r, 200, h * 0.82); tw2 += `M${f1(x0)} ${f1(y0)}l${f1(Math.cos(a) * L)} ${f1(Math.sin(a) * L * 0.6)}`; if (i % 3 === 0) balls += `M${f1(x0 + Math.cos(a) * L)} ${f1(y0 + Math.sin(a) * L * 0.6)}m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`; }
        crown.push({ s: '@twig', w: 1.4, cap: 'round', d: tw2, op: 0.9 }, ['@ball', balls]);
        return { trunk, crown };
      }
      // the crown: clusters toned dark (bottom right) to light (top left)
      const sparse = s === 'autumn' ? 0.8 : 1, tones = ['', '', '', ''], cy = -170 - h * 0.36;
      tones[0] += blob(r, 10, cy + 20, w * 0.5, h * 0.27, 11);
      const n = Math.round(16 * sparse);
      for (let i = 0; i < n; i++) {
        const a = rr(r, 0, Math.PI * 2), d = Math.sqrt(r()), x = Math.cos(a) * w * 0.38 * d, y = cy + Math.sin(a) * h * 0.22 * d, light = (-x / w - (y - cy) / h) + rr(r, -0.2, 0.2);
        const k = light > 0.18 ? 3 : light > 0 ? 2 : light > -0.2 ? 1 : 0;
        tones[k] += blob(r, x, y, rr(r, 34, 54), rr(r, 26, 40), 7);
      }
      tones.forEach((d, i) => d && crown.push([`@leaf.${i}`, d]));
      return { trunk, crown };
    },
  });
})();
