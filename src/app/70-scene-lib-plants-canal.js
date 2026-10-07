/* ============================================================
   SCENE LIBRARY: towpath plants (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   plant.towpath-hedge: a stretch of mixed towpath hedge (hawthorn, blackthorn,
   hazel and bramble) as it lines the Basingstoke Canal towpath: a long, low,
   rounded mass of leaf lobes in two tones over a dark base, may blossom in
   spring, red haws and blackberries in autumn, a grey-brown tangle of twigs
   in winter. LIGHT on purpose (about 1.5 KB a variant at tile sizes): a
   canal view lines both banks with forty or more of them, so the heavier
   plant.hedge / plant.shrub would blow the SVG tile budget (150 KB).
   3 variants (long and low, rounded, a taller clump with a hazel spray).

   Anchor: the middle of the hedge foot. Lit from the upper left.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const SHAPE = [[220, 110, 9], [170, 130, 8], [150, 160, 8]];   // [width, height, lobes]
  sceneObjDefine({
    id: 'plant.towpath-hedge', category: 'plant', size: [240, 170], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { stem: ['#4a3e32', '#6a5a4a'] },
      spring: { leaf: ['#355a26', '#5a8a36', '#8ab452'], fleck: ['#f6f2ea', '#f0e0e8'] },
      summer: { leaf: ['#24401c', '#3e6a2c', '#5e8e3e'], fleck: ['#e8e0d0', '#c8a0c0'] },
      autumn: { leaf: ['#4a4a22', '#7a6a2a', '#a8883a'], fleck: ['#b02a22', '#2a1e2a'] },
      winter: { leaf: ['#4a4038', '#665a4e', '#857868'], fleck: ['#a02a22', '#d8dce0'] },
    },
    parts: ['body'], shadow: { rx: 110, ry: 9, h: 120 }, reflect: true, weight: 1,
    tags: ['uk', 'hedge', 'hedgerow', 'towpath', 'canal', 'light', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the canal towpath (after the hedge masses of the nature kit)',
    build(v, r, ctx) {
      const [w, h, n] = SHAPE[v % 3], season = ctx.season, winter = season === 'winter', body = [];
      let base = '', mid = '', lit = '', fl0 = '', fl1 = '';
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = (t - 0.5) * w * 0.9 + rr(r, -6, 6), top = h * (0.55 + 0.45 * Math.sin(Math.PI * t)) * rr(r, 0.85, 1.05);
        const rx = w / n * rr(r, 0.85, 1.15), ry = top * 0.5;
        base += sceneD.lobed(r, f1(x), f1(-ry * 0.95), f1(rx * 1.05), f1(ry), 8, 0.22);
        mid += sceneD.lobed(r, f1(x - rx * 0.12), f1(-ry * 1.12), f1(rx * 0.85), f1(ry * 0.78), 7, 0.25);
        if (i % 2 === 0) lit += sceneD.lobed(r, f1(x - rx * 0.3), f1(-ry * 1.4), f1(rx * 0.45), f1(ry * 0.36), 6, 0.25);
        if (season !== 'summer') for (let j = 0; j < 4; j++) { const fx = f1(x + rr(r, -rx, rx) * 0.8), fy = f1(-rr(r, 0.4, 1.6) * ry); (j % 2 ? fl1 = fl1 + sceneD.circ(fx, fy, 2.6) : fl0 = fl0 + sceneD.circ(fx, fy, 3)); }
      }
      body.push(['@stem.0', `M${f1(-w * 0.45)} 0L${f1(w * 0.45)} 0L${f1(w * 0.4)} -8L${f1(-w * 0.4)} -8Z`]);
      body.push(['@leaf.0', base, winter ? 0.7 : 1], ['@leaf.1', mid, winter ? 0.55 : 1], { f: '@leaf.2', d: lit, op: winter ? 0.4 : 0.9, detail: true });
      if (winter) { let d = ''; for (let i = 0; i < 16; i++) { const x = rr(r, -w * 0.45, w * 0.45); d += `M${f1(x)} -4l${f1(rr(r, -14, 14))} ${f1(-rr(r, 0.5, 1) * h)}`; } body.push({ s: '@stem.1', w: 2, cap: 'round', op: 0.8, d, detail: true }); }
      if (fl0) body.push({ f: '@fleck.0', d: fl0, detail: true });
      if (fl1) body.push({ f: '@fleck.1', d: fl1, detail: true });
      return { body };
    },
  });
})();
