/* ============================================================
   SCENE LIBRARY: objects for the four Wyndham's Pool views (71-scene-uk-south-east-wyndhams-pool-{wide,close,detail,evening}.js).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

     tree.wyv-birch-bough   a silver birch bough hanging into the frame from the top-left (flip it for the top-right):
                            pendulous twigs, small toothed leaves (gold in autumn, catkins in spring, bare purple twigs in winter)
     tree.wyv-snag          a dead branch standing out of the shallows, anchor at the waterline (a perch: kingfisher, heron)
     tree.wyv-far-oak       a far-bank oak drawn to be seen small: limbs and leaf clumps with sky between (4 variants)
     tree.wyv-far-sallow    grey / goat willow scrub at the far waterline: a fan of stems, narrow grey-green clumps
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
      spring: {}, summer: {}, autumn: {},   // the same wood and moss as the base (the four seasons are declared: the bar's seasons rule)
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

  /* ---------- tree.wyv-far-oak: a pedunculate oak on the far bank, drawn to be seen small (scale 0.25 to 0.5) ----------
     A bole that forks low into three to six crooked limbs, each limb ending in its own leaf clump (shade base, mid mass up
     and left, a lit cap), sky left between the clumps so the crown reads as limbs and clumps rather than one dome; leaf
     flecks break the rims. Autumn turns the clumps unevenly (olive, ochre, a little russet: mid-October oaks are mostly
     still olive), winter leaves the limbs, the twig haze and (on the young tree) marcescent brown leaves.
     v0 broad open-grown, v1 tall woodland oak, v2 leaning out over the water, v3 a young oak. Anchor: the foot. */
  {
    const OK = {
      spring: [['#3e6a2a', '#5e8e36', '#94bc56'], ['#4e7a2c', '#76a23e', '#b0d06a']],
      summer: [['#1f3a1c', '#33582a', '#5a843e'], ['#26421e', '#3e6630', '#6a9448']],
      autumn: [['#2c3a1a', '#4e5e28', '#7e8a40'], ['#4e4218', '#82702a', '#c0a444'], ['#4a3218', '#7a5626', '#a8803e']],
      winter: [['#4a3e34', '#5e5044', '#7a6a5c']],
    };
    const tone = s => Object.fromEntries(['a', 'b', 'c'].map((k, i) => [k, OK[s][i] || OK[s][0]]));
    const SHAPE = [
      { th: 58, w0: 22, nL: 5, spread: 1.05, len: [112, 150], R: [44, 58], lean: 0 },
      { th: 80, w0: 18, nL: 4, spread: 0.7, len: [124, 165], R: [38, 50], lean: 4 },
      { th: 64, w0: 20, nL: 4, spread: 0.88, len: [110, 145], R: [40, 52], lean: 26 },
      { th: 46, w0: 12, nL: 3, spread: 0.8, len: [72, 98], R: [28, 36], lean: -6 },
    ];
    sceneObjDefine({
      id: 'tree.wyv-far-oak', category: 'tree', size: [340, 320], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
      real: { h: 16, w: 17 },
      palette: { base: { bark: ['#4a4038', '#2e2722', '#6e6458', '#7a5a3a'], fleck: ['#e2cc6a', '#1e2416'], twig: '#5a4a50' },
        spring: tone('spring'), summer: tone('summer'), autumn: Object.assign(tone('autumn'), { fleck: ['#e8c460', '#2a2414'] }), winter: tone('winter') },
      parts: ['trunk', 'crown'], reflect: true, shadow: false, weight: 1,
      tags: ['uk', 'tree', 'oak', 'broadleaf', 'deciduous', 'far-bank', 'pond', 'kit:temperate', 'role:tree'],
      credit: "drawn for the Wyndham's Pool views: a far-bank pedunculate oak (Quercus robur), limbs and clumps",
      build(v, rnd, ctx) {
        const season = (ctx && ctx.season) || 'summer', winter = season === 'winter', S = SHAPE[v % 4], r = rndOf(71 + v * 29), trunk = [], crown = [];
        const rr = (a, b) => a + r() * (b - a);
        const th = S.th * rr(0.9, 1.1), w0 = S.w0, fx = S.lean * 0.6, fy = -th;
        trunk.push({ f: '@bark.0', d: `M${R(-w0 * 1.3)} 2Q${R(-w0 * 0.6)} -8 ${R(-w0 * 0.55)} -20Q${R(-w0 * 0.5 + fx * 0.4)} ${R(fy * 0.6)} ${R(fx - w0 * 0.45)} ${R(fy)}L${R(fx + w0 * 0.45)} ${R(fy)}Q${R(w0 * 0.5 + fx * 0.5)} ${R(fy * 0.5)} ${R(w0 * 0.6)} -18Q${R(w0 * 0.65)} -6 ${R(w0 * 1.3)} 2Z` });
        trunk.push({ f: '@bark.2', op: 0.7, d: taper([[-w0 * 0.42, -6], [-w0 * 0.36 + fx * 0.4, fy * 0.5], [fx - w0 * 0.32, fy + 2]], 4, 2) });
        let fis = '';
        for (let i = 0; i < 5; i++) { const y0 = rr(-8, fy * 0.6), x = rr(-w0 * 0.3, w0 * 0.3) + fx * (-y0 / th); fis += `M${R(x)} ${R(y0)}l${R(rr(-1.5, 1.5))} ${R(-rr(10, 22))}`; }
        trunk.push({ s: '@bark.1', w: 1.4, op: 0.7, d: fis, detail: true });
        // the limbs: crooked tapers from the fork, two elbows each; a side shoot off the first elbow carries a smaller clump
        const limbs = [];
        let limbD = '', fine = '';
        for (let i = 0; i < S.nL; i++) {
          const t = S.nL === 1 ? 0.5 : i / (S.nL - 1), ang = (t - 0.5) * 2 * S.spread + rr(-0.14, 0.14) + S.lean * 0.008, len = rr(S.len[0], S.len[1]) * (1 - Math.abs(t - 0.5) * 0.4);
          const pts = [[fx + (t - 0.5) * w0 * 0.6, fy + 4]];
          let x = pts[0][0], y = pts[0][1], a = ang;
          for (let k = 0; k < 3; k++) { a += (k % 2 ? 1 : -1) * rr(0.12, 0.32); const l = len / 3 * rr(0.85, 1.15); x += Math.sin(a) * l; y -= Math.cos(a) * l; pts.push([x, y]); }
          limbD += taper(pts, w0 * 0.62 * rr(0.75, 1), 2.5);
          limbs.push({ x, y, a, R0: rr(S.R[0], S.R[1]) });
          if (r() < 0.75) {
            const p = pts[1 + Math.floor(r() * 2)], b = a + (r() < 0.5 ? -1 : 1) * rr(0.6, 1.0), l = len * rr(0.28, 0.42), ex = p[0] + Math.sin(b) * l, ey = p[1] - Math.cos(b) * l;
            fine += `M${R(p[0])} ${R(p[1])}Q${R(p[0] + Math.sin(b) * l * 0.5)} ${R(p[1] - Math.cos(b) * l * 0.65)} ${R(ex)} ${R(ey)}`;
            limbs.push({ x: ex, y: ey, a: b, R0: rr(S.R[0], S.R[1]) * 0.62, small: true });
          }
        }
        crown.push({ f: '@bark.0', d: limbD }, { s: '@bark.0', w: 2.6, cap: 'round', d: fine });
        // an inner clump or two over the fork, so the crown's heart is not bare (sky still shows round them)
        if (!winter) { const ty = Math.min(...limbs.map(L => L.y)), mid = (fy + ty) / 2; for (let i = 0; i < (S.nL > 3 ? 2 : 1); i++) limbs.push({ x: fx + (i ? 1 : -1) * rr(10, 30), y: mid + rr(-14, 6), a: (i ? 0.3 : -0.3), R0: S.R[0] * 0.7, small: true }); }
        if (winter) {
          const starts = limbs.map(L => [L.x, L.y, L.a + rr(-0.2, 0.2), L.R0 * 0.7]);
          crown.push({ s: '@bark.0', w: 1.4, cap: 'round', op: 0.9, d: sceneDraw.twigs(r, starts, 3, 0.5) });
          crown.push({ s: '@twig', w: 0.9, cap: 'round', op: 0.55, d: sceneDraw.twigs(r, starts.map(s => [s[0], s[1], s[2] + 0.45, s[3] * 0.85]), 3, 0.55), detail: true });
          const top = Math.min(...limbs.map(L => L.y)), cx = limbs.reduce((s, L) => s + L.x, 0) / limbs.length;
          crown.push({ s: '@twig', w: 0.8, op: 0.35, d: sceneDraw.twigHaze(r, cx, top + 30, (S.spread * 110 + 40), 60, 16, 2), detail: true });
          if (v === 3) { let mar = ''; for (let i = 0; i < 40; i++) { const L = limbs[Math.floor(r() * limbs.length)]; mar += sceneD.leaf(L.x + rr(-24, 24), L.y + rr(-20, 18), rr(0, 6.28), rr(5, 8), 2.6); } crown.push({ f: '@bark.3', op: 0.9, d: mar }); }
          return { trunk, crown };
        }
        // the clumps: one per limb end, sky between them; each clump 4 to 6 lobed masses in three tones
        const keys = season === 'autumn' ? ['a', 'a', 'b', 'b', 'c'] : ['a', 'b'], T = {};
        for (const k of ['a', 'b', 'c']) T[k] = ['', '', ''];
        let flL = '', flD = '', tw = '';
        limbs.sort((p, q) => (q.small ? 1 : 0) - (p.small ? 1 : 0));
        for (const L of limbs) {
          const R0 = L.R0, cx = L.x + Math.sin(L.a) * R0 * 0.3, cy = L.y - R0 * 0.2, t = T[keys[Math.floor(r() * keys.length)]], n = L.small ? 4 : 6;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rr(-0.4, 0.4), dd = i === 0 ? 0 : rr(0.4, 0.75), x = cx + Math.cos(a) * R0 * dd, y = cy + Math.sin(a) * R0 * dd * 0.7, rx = R0 * rr(0.38, 0.55);
            t[0] += sceneD.lobed(r, R(x + rx * 0.12), R(y + rx * 0.16), R(rx), R(rx * 0.8), 8, 0.4);
            t[1] += sceneD.lobed(r, R(x - rx * 0.1), R(y - rx * 0.14), R(rx * 0.78), R(rx * 0.62), 7, 0.38);
            if (y < cy + R0 * 0.1 && x < cx + R0 * 0.3) t[2] += sceneD.lobed(r, R(x - rx * 0.3), R(y - rx * 0.34), R(rx * 0.44), R(rx * 0.34), 6, 0.34);
          }
          for (let i = 0; i < (L.small ? 6 : 11); i++) { const a = rr(-2.7, -0.4), d = R0 * rr(0.65, 1.02); flL += sceneD.leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.75, rr(-1.2, 1.2), rr(6, 9), 2.6); }
          for (let i = 0; i < (L.small ? 4 : 8); i++) { const a = rr(0.3, 2.8), d = R0 * rr(0.3, 0.8); flD += sceneD.leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, rr(2.2, 4), rr(6, 9), 2.6); }
          for (let i = 0; i < 3; i++) { const a = rr(-3, 0), x = cx + Math.cos(a) * R0 * 0.88, y = cy + Math.sin(a) * R0 * 0.66, l = rr(7, 14); tw += `M${R(x)} ${R(y)}l${R(Math.cos(a) * l)} ${R(Math.sin(a) * l)}`; }
        }
        crown.push({ s: '@bark.1', w: 1.2, cap: 'round', op: 0.8, d: tw, detail: true });
        for (const k of ['a', 'b', 'c']) if (T[k][0]) crown.push({ f: '@' + k + '.0', d: T[k][0] });
        for (const k of ['a', 'b', 'c']) if (T[k][1]) crown.push({ f: '@' + k + '.1', d: T[k][1] });
        crown.push({ f: '@fleck.1', op: 0.4, d: flD, detail: true });
        for (const k of ['a', 'b', 'c']) if (T[k][2]) crown.push({ f: '@' + k + '.2', d: T[k][2], op: 0.92 });
        crown.push({ f: '@fleck.0', op: 0.5, d: flL, detail: true });
        return { trunk, crown };
      },
    });
  }

  /* ---------- tree.wyv-far-sallow: grey / goat willow scrub at the far water's edge (Salix cinerea, S. caprea) ----------
     Several stems fanning up from one stool, each carrying narrow, upright leaf clumps (grey-green, silvery underneath),
     sky between the stems; spring pussy-willow catkins, autumn yellow-green thinning, winter a bare fan of orange-brown
     wands. Smaller and lower than the oaks: it sits at the waterline in front of them. Anchor: the foot. v0 broad, v1 tall. */
  {
    const SL = {
      spring: ['#4a6a2c', '#6e9040', '#a4bc68'], summer: ['#344a2c', '#506a40', '#7e9468'],
      autumn: ['#4e5626', '#7a7e34', '#aea456'], winter: ['#6a4630', '#8a5e3a', '#a87a4e'],
    };
    sceneObjDefine({
      id: 'tree.wyv-far-sallow', category: 'tree', size: [260, 220], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
      real: { h: 6, w: 7 },
      palette: { base: { stem: ['#4a4036', '#6a5a48'], silver: '#b4bea6', catkin: '#e6d46a' },
        spring: { leaf: SL.spring }, summer: { leaf: SL.summer }, autumn: { leaf: SL.autumn, silver: '#c8c088' }, winter: { leaf: SL.winter } },
      parts: ['trunk', 'crown'], reflect: true, shadow: false, weight: 1,
      tags: ['uk', 'tree', 'willow', 'sallow', 'scrub', 'waterside', 'far-bank', 'pond', 'kit:temperate', 'role:tree'],
      credit: "drawn for the Wyndham's Pool views: grey and goat willow scrub (sallow) at the water's edge",
      build(v, rnd, ctx) {
        const season = (ctx && ctx.season) || 'summer', winter = season === 'winter', r = rndOf(113 + v * 41), trunk = [], crown = [];
        const rr = (a, b) => a + r() * (b - a), nS = v ? 5 : 7, H = v ? 190 : 150, W = v ? 0.55 : 0.85, tips = [];
        let st = '', wands = '';
        for (let i = 0; i < nS; i++) {
          const t = i / (nS - 1), a = (t - 0.5) * 2 * W + rr(-0.1, 0.1), h = H * rr(0.7, 1) * (1 - Math.abs(t - 0.5) * 0.45), bx = (t - 0.5) * 18;
          const mx = bx + Math.sin(a) * h * 0.45 + rr(-6, 6), my = -h * 0.5, ex = bx + Math.sin(a) * h, ey = -Math.cos(a) * h;
          st += taper([[bx, 2], [mx, my], [ex, ey]], 7, 1.5);
          tips.push([mx, my, ex, ey, a]);
        }
        trunk.push({ f: '@stem.0', d: st });
        if (winter) {
          for (const [mx, my, ex, ey, a] of tips) for (let k = 0; k < 7; k++) { const u = rr(0.3, 1), x = mx + (ex - mx) * u, y = my + (ey - my) * u, b = a + rr(-0.35, 0.35), l = rr(26, 54); wands += `M${R(x)} ${R(y)}q${R(Math.sin(b) * l * 0.4)} ${R(-l * 0.55)} ${R(Math.sin(b) * l)} ${R(-Math.cos(b) * l)}`; }
          crown.push({ s: '@leaf.1', w: 1.4, op: 0.95, d: wands }, { s: '@leaf.2', w: 0.8, op: 0.6, d: sceneDraw.twigs(r, tips.map(p => [p[2], p[3], p[4], 20]), 2, 0.4), detail: true });
          return { trunk, crown };
        }
        // narrow upright clumps along the upper stems, gaps between the stems
        const C = ['', '', ''];
        let sil = '', cat = '';
        for (const [mx, my, ex, ey] of tips) for (let k = 0; k < 4; k++) {
          const u = 0.2 + k * 0.27 + rr(-0.06, 0.06), sd = (k % 2 ? 1 : -1) * rr(3, 9), x = mx + (ex - mx) * u + sd, y = my + (ey - my) * u, rx = rr(9, 14) * (k === 3 ? 0.8 : 1), ry = rx * rr(1.2, 1.6);
          C[0] += sceneD.lobed(r, R(x + 3), R(y + 4), R(rx), R(ry), 9, 0.45);
          C[1] += sceneD.lobed(r, R(x - 2), R(y - 3), R(rx * 0.74), R(ry * 0.74), 8, 0.42);
          if (r() < 0.6) C[2] += sceneD.lobed(r, R(x - rx * 0.35), R(y - ry * 0.4), R(rx * 0.4), R(ry * 0.36), 6, 0.35);
          for (let j = 0; j < 5; j++) sil += sceneD.leaf(x + rr(-rx * 1.1, rx * 1.1), y + rr(-ry * 1.1, ry * 0.4), rr(-2.4, -0.7), rr(7, 11), 1.6);
          if (season === 'spring' && r() < 0.6) cat += sceneD.ell(x + rr(-rx, rx), y - ry * rr(0.3, 0.9), 2.4, 3.2);
        }
        crown.push({ f: '@leaf.0', d: C[0] }, { f: '@leaf.1', d: C[1] }, { f: '@leaf.2', d: C[2], op: 0.9 }, { f: '@silver', op: 0.5, d: sil, detail: true });
        if (cat) crown.push({ f: '@catkin', d: cat });
        return { trunk, crown };
      },
    });
  }

  /* ---------- animal.wyv-dragonfly: a blue hawker / common darter over the pool, on the wing in summer only (June to August;
     user request, 9 Oct: no dragonflies in the cold months); the other seasons draw nothing ---------- */
  sceneObjDefine({
    id: 'animal.wyv-dragonfly', category: 'animal', size: [40, 48], box: [-30, -24, 14, 24], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'wings'],
    palette: { base: { body: ['#2f8ac6', '#c43a2a'], dark: ['#1f5a82', '#8a2a1e'], wing: '#e6f6fa' }, autumn: { body: ['#3a6a8a', '#a8442a'], dark: ['#2a4a62', '#7a3020'] }, winter: { body: ['#5a6a74', '#7a5a52'], dark: ['#3a444a', '#5a4440'] } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [0.2, 1], period: 0.12 } },
    tags: ['uk', 'pond', 'waterside', 'dragonfly', 'insect', 'summer', 'kit:water', 'role:animal', 'class:air'],
    credit: "drawn for the Wyndham's Pool views after the nature kit's K.dragonfly",
    build(v, rnd, ctx) {
      if (!ctx || ctx.season !== 'summer') return { body: [{ f: `@dark.${v}`, d: sceneD.ell(0, 0, 0.4, 0.4), op: 0.02 }], wings: [] };   // not on the wing
      return {
        body: [{ s: `@body.${v}`, w: 3, cap: 'round', d: 'M2 0h-30' }, { s: `@dark.${v}`, w: 3, op: 0.7, d: 'M-6 0h2M-12 0h2M-18 0h2M-24 0h2' }, { f: `@dark.${v}`, d: sceneD.ell(5, 0, 4, 3.2) }, { f: `@body.${v}`, d: sceneD.ell(9, 0, 2.6, 2.6) }],
        wings: [{ f: '@wing', d: 'M2-2q-2-14 6-22 4 8-6 22zM-2-2q-6-14-2-22 8 8 2 22zM2 2q-2 14 6 22 4-8-6-22zM-2 2q-6 14-2 22 8-8 2-22z', op: 0.7 }],
      };
    },
  });
})();
