/* ============================================================
   SCENE LIBRARY: objects for the four Wyndham's Pool views (71-scene-uk-south-east-wyndhams-pool-{wide,close,detail,evening}.js).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

     tree.wyv-birch-bough   a silver birch bough hanging into the frame from the top-left (flip it for the top-right):
                            pendulous twigs, small toothed leaves (gold in autumn, catkins in spring, bare purple twigs in winter)
     tree.wyv-snag          a dead branch standing out of the shallows, anchor at the waterline (a perch: kingfisher, heron)
     plant.wyv-heath-bank   a mound of heathland: heather, a gorse cushion, purple moor grass and a sandy scar,
                            one sprite in place of a dozen (fills a bank densely at little cost)
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = v => Math.round(v * 10) / 10;
  const rndOf = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  /** A filled taper along a polyline (w0 at the start, w1 at the end). */
  const taper = (pts, w0, w1) => {
    const L = [], Rr = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
      L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
    }
    return 'M' + L.concat(Rr.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
  };

  /* ---------- tree.wyv-birch-bough: anchor at the frame corner (0, 0); the limb runs right and down, the twigs hang ---------- */
  sceneObjDefine({
    id: 'tree.wyv-birch-bough', category: 'tree', size: [560, 360], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { bark: ['#e8e4dc', '#c8c2b6', '#2a2624', '#8a8278'], twig: ['#5a3a34', '#6e4a3e'], leaf: ['#3a5a26', '#4e7230', '#6a8e3e', '#8aac52'], catkin: ['#8a6a3a', '#b08a48'] },
      spring: { leaf: ['#5a8a30', '#76a83a', '#9cc850', '#c0dc70'], catkin: ['#a88a3a', '#cca64a'] },
      summer: { leaf: ['#2e4c22', '#3e6228', '#567e34', '#76984a'] },
      autumn: { leaf: ['#b08a26', '#d0a830', '#e6c444', '#8a7a2a'] },
      winter: { bark: ['#dcd8d2', '#b8b2a8', '#24201e', '#7e766e'], twig: ['#4a2e2e', '#5e3a38'] },
    },
    parts: ['branch', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [0, 0], deg: 1.4 } },
    reflect: false, shadow: false,
    tags: ['uk', 'silver-birch', 'birch', 'bough', 'frame', 'heath', 'kit:temperate', 'role:frame', 'class:air'],
    credit: "drawn for the Wyndham's Pool views: a silver birch (Betula pendula) bough",
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { branch: [], leaves: [] }, r = rndOf(11 + v * 7);
      const main = v ? [[-30, 6], [60, 30], [150, 44], [240, 80], [320, 104], [400, 150], [450, 206]] : [[-30, 10], [70, 36], [170, 48], [270, 78], [360, 96], [440, 136], [520, 180]];
      out.branch.push({ f: '@bark.1', d: taper(main, 44, 5) }, { f: '@bark.0', d: taper(main.map(([x, y]) => [x, y - 4]), 26, 2) });
      // the birch's black lenticels and diamonds on the thick end
      for (let i = 0; i < 9; i++) { const x = 4 + i * 26 + r() * 10, y = main[0][1] + (main[2][1] - main[0][1]) * (x / 200) - 4 + r() * 4; out.branch.push({ f: '@bark.2', d: `M${R(x)} ${R(y - 4)}l${R(5 + r() * 6)} ${R(1 + r() * 2)}l-${R(2 + r() * 3)} ${R(4 + r() * 3)}z`, op: 0.85 }); }
      const sides = v ? [[[120, 32], [170, 70], [190, 120]], [[230, 70], [300, 74], [370, 66], [430, 60]], [[320, 116], [340, 170], [330, 220]]]
        : [[[110, 30], [160, 64], [176, 112]], [[250, 58], [320, 52], [400, 44], [470, 46]], [[360, 98], [392, 150], [396, 200]], [[460, 152], [500, 160], [540, 170]]];
      sides.forEach((s, i) => out.branch.push({ f: '@bark.3', d: taper(s, 7 - i, 1.5) }));
      // the pendulous twigs: long, fine, hanging almost straight down from every limb, leaves strung along them
      const anchors = [];
      const along = (pts, n) => { for (let i = 0; i < n; i++) { const u = (i + 0.3 + r() * 0.4) / n, k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), t = u * (pts.length - 1) - k; anchors.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t]); } };
      along(main.slice(1), 26); sides.forEach(s => along(s, 7));
      const nLeaf = season === 'winter' ? 0 : season === 'autumn' ? 9 : 13;
      for (const [ax, ay] of anchors) {
        const len = (40 + r() * 90) * (season === 'winter' ? 0.6 : 1), sw = (r() - 0.5) * 34, tx = ax + sw, ty = ay + len;
        out.branch.push({ s: '@twig.' + (r() < 0.5 ? 0 : 1), w: 1.1, d: `M${R(ax)} ${R(ay)}Q${R(ax + sw * 0.2 + 6)} ${R(ay + len * 0.5)} ${R(tx)} ${R(ty)}`, cap: 'round' });
        if (r() < 0.5) { const bx = ax + (tx - ax) * 0.4, by = ay + len * 0.4; out.branch.push({ s: '@twig.1', w: 0.8, d: `M${R(bx)} ${R(by)}q${R(-8 + r() * 16)} ${R(len * 0.2)} ${R(-6 + r() * 12)} ${R(len * 0.45)}`, cap: 'round' }); }
        if ((season === 'spring' || season === 'winter') && r() < 0.45) out.leaves.push({ s: '@catkin.' + (r() < 0.5 ? 0 : 1), w: 3, cap: 'round', d: `M${R(tx)} ${R(ty - 2)}q1 9 -1 ${R(14 + r() * 8)}` });
        for (let j = 0; j < nLeaf; j++) {
          const u = 0.08 + (j / nLeaf) * 0.92, lx = ax + (tx - ax) * u + (r() - 0.5) * 22, ly = ay + len * u + (r() - 0.5) * 10;
          const a = Math.PI / 2 + (r() - 0.5) * 2.2, l = 10 + r() * 7, tone = u < 0.4 ? Math.floor(r() * 2) : 1 + Math.floor(r() * 3);
          out.leaves.push({ f: '@leaf.' + tone, d: sceneD.leaf(lx, ly, a, l, l * 0.62) });
        }
      }
      return out;
    },
  });

  /* ---------- tree.wyv-snag: a dead branch out of the water; anchor at the waterline, the perch tip at (34, -150) ---------- */
  sceneObjDefine({
    id: 'tree.wyv-snag', category: 'tree', size: [110, 170], box: [-40, -166, 70, 6], variants: 2, seasonal: true, flippable: true,
    palette: {
      base: { wood: ['#6e665c', '#4e483f', '#8e877c', '#2e2a26'], moss: ['#5e6e3a', '#76864a'], wet: '#2a2824' },
      winter: { wood: ['#7a746c', '#58524a', '#9a948a', '#34302c'], moss: ['#56604a', '#6a7458'] },
    },
    parts: ['body'], reflect: true,
    tags: ['uk', 'pond', 'dead-wood', 'perch', 'snag', 'kit:water', 'class:water', 'role:prop'],
    credit: "drawn for the Wyndham's Pool views",
    build(v) {
      const r = rndOf(5 + v * 13), body = [];
      const stem = v ? [[0, 4], [6, -40], [14, -90], [26, -130], [34, -150]] : [[0, 4], [-4, -50], [6, -96], [22, -136], [34, -150]];
      body.push({ f: '@wood.1', d: taper(stem, 16, 4) }, { f: '@wood.2', d: taper(stem.map(([x, y]) => [x - 2, y]), 6, 1.5), op: 0.7 });
      const br = v ? [[[10, -70], [-14, -100], [-30, -112]], [[20, -112], [46, -124], [60, -140]]] : [[[2, -60], [30, -84], [52, -96]], [[8, -104], [-14, -128], [-22, -150]]];
      br.forEach(b => body.push({ f: '@wood.0', d: taper(b, 6, 1.2) }));
      body.push({ f: '@moss.0', d: sceneD.ell(1, -8, 9, 5), op: 0.8 }, { f: '@moss.1', d: sceneD.ell(-1, -16, 6, 3), op: 0.6 }, { f: '@wet', d: sceneD.ell(0, 2, 10, 2.4), op: 0.7 });
      for (let i = 0; i < 5; i++) { const t = 0.2 + r() * 0.6, p = stem[Math.floor(t * 4)]; body.push({ s: '@wood.3', w: 1, op: 0.5, d: `M${R(p[0] - 2)} ${R(p[1])}l${R(1 + r() * 2)} ${R(-8 - r() * 8)}` }); }
      return { body };
    },
  });

  /* ---------- plant.wyv-heath-bank: anchor at the bottom centre; a heath mound about 300 wide ---------- */
  sceneObjDefine({
    id: 'plant.wyv-heath-bank', category: 'plant', size: [320, 120], box: [-160, -112, 160, 6], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { heather: ['#5a4a52', '#6e5a62', '#8a6e7a', '#3e3438'], green: ['#3e5230', '#4e6638', '#2e3e26'], gorse: ['#2e4a2a', '#3e5e34', '#24361f'], bloom: ['#e8c43a', '#f4d65a'], grass: ['#8a8a50', '#a8a064'], sand: ['#c8b080', '#a8905e'], soil: '#4a3e30' },
      spring: { heather: ['#4a4a40', '#5e5a4a', '#6e6a56', '#36342e'], grass: ['#7a8a46', '#96a656'] },
      summer: { heather: ['#8a4a8a', '#a45ea0', '#c27cba', '#5e3a5e'], grass: ['#8a9a50', '#a4b064'] },
      autumn: { heather: ['#6a4a4a', '#84585a', '#9a6e66', '#463234'], grass: ['#b0965a', '#c8ac6a'], bloom: ['#d4b03a', '#e6c656'] },
      winter: { heather: ['#4a3e3e', '#5a4a48', '#6e5e58', '#322a2a'], green: ['#34402e', '#42503a', '#262e22'], grass: ['#a69a7a', '#bcae8c'], sand: ['#b8a888', '#9a8a6c'] },
    },
    parts: ['body'],
    tags: ['uk', 'heath', 'heather', 'gorse', 'yateley', 'kit:temperate', 'role:ground-cover', 'class:shrub'],
    credit: "drawn for the Wyndham's Pool views: Calluna heather, gorse and Molinia on Yateley Common",
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', r = rndOf(31 + v * 17), body = [];
      const W = 150;
      // the mound's soil and a sandy scar where the path wears it
      body.push({ f: '@soil', d: `M${-W} 4Q${-W * 0.6} -26 0 -30Q${W * 0.7} -26 ${W} 4Z`, op: 0.9 });
      const sx = (r() - 0.5) * 120;
      body.push({ f: '@sand.1', d: `M${R(sx - 40)} 4Q${R(sx - 20)} -12 ${R(sx + 6)} -14Q${R(sx + 34)} -10 ${R(sx + 50)} 4Z` }, { f: '@sand.0', d: `M${R(sx - 26)} 2Q${R(sx - 8)} -8 ${R(sx + 8)} -9Q${R(sx + 26)} -6 ${R(sx + 36)} 2Z`, op: 0.9 });
      // a gorse cushion off-centre: dark spiny mass, flowers (most in spring, some all year: "kissing's out of season...")
      const gx = (v === 1 ? -1 : 1) * (40 + r() * 50), gw = 54 + r() * 30, gh = 46 + r() * 34;
      body.push({ f: '@gorse.2', d: sceneD.lobed(r, gx, -gh * 0.5, gw, gh * 0.55, 9, 0.25) });
      body.push({ f: '@gorse.0', d: sceneD.lobed(r, gx - 4, -gh * 0.58, gw * 0.86, gh * 0.46, 8, 0.3) });
      for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); body.push({ s: '@gorse.1', w: 1.2, d: `M${R(gx + Math.cos(a) * gw * 0.8 * d)} ${R(-gh * 0.55 + Math.sin(a) * gh * 0.4 * d)}l${R(-3 + r() * 6)} ${R(-4 - r() * 4)}`, cap: 'round' }); }
      const nBloom = season === 'spring' ? 46 : season === 'winter' ? 8 : 16;
      for (let i = 0; i < nBloom; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.9; body.push({ f: '@bloom.' + (r() < 0.5 ? 0 : 1), d: sceneD.circ(gx + Math.cos(a) * gw * d, -gh * 0.6 + Math.sin(a) * gh * 0.45 * d - 4, 2 + r() * 1.6) }); }
      // heather tussocks across the mound: dark base, spikes coloured by season, packed tight
      for (let i = 0; i < 22; i++) {
        const x = -W + 10 + r() * (W * 2 - 20), base = -4 - Math.max(0, 22 * (1 - Math.abs(x) / W)) * r(), h = 16 + r() * 22, w = 14 + r() * 16;
        if (Math.abs(x - gx) < gw * 0.6 && r() < 0.7) continue;
        body.push({ f: '@heather.3', d: sceneD.ell(x, base - h * 0.3, w, h * 0.4) });
        let d = '';
        for (let k = 0; k < 9; k++) { const bx = x - w + r() * w * 2, l = h * (0.5 + r() * 0.6); d += `M${R(bx)} ${R(base)}q${R(-2 + r() * 4)} ${R(-l * 0.5)} ${R(-3 + r() * 6)} ${R(-l)}`; }
        body.push({ s: '@heather.' + Math.floor(r() * 3), w: 3.2, d, cap: 'round' });
        body.push({ s: '@heather.2', w: 2, op: 0.8, d: `M${R(x - w * 0.5)} ${R(base - h * 0.7)}l2 -5M${R(x + w * 0.3)} ${R(base - h * 0.8)}l-1 -6`, cap: 'round' });
      }
      // purple moor grass / wavy hair-grass tufts arching over the front
      let g = '';
      for (let i = 0; i < 16; i++) { const x = -W + r() * W * 2, l = 22 + r() * 26, lean = (r() - 0.5) * 30; g += `M${R(x)} 2q${R(lean * 0.3)} ${R(-l * 0.6)} ${R(lean)} ${R(-l)}`; }
      body.push({ s: '@grass.0', w: 1.6, d: g, cap: 'round' });
      body.push({ f: '@green.2', d: `M${-W} 4Q0 -6 ${W} 4Z`, op: 0.6 });
      return { body };
    },
  });
})();
