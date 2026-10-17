/* ============================================================
   SCENE LIBRARY: trees-water (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core. Check with:
   node tools/anim-pack.mjs object lint <id>, and LOOK with:
   node tools/anim-pack.mjs object sheet <id>.

   The trees of a wooded pond or lake (drawn for Wyndham's Pool, Yateley
   Common: silver birch and Scots pine round the water, oak and alder
   behind), LIGHT by design: a crown is a handful of lobed clumps in three
   tones with a little leaf texture (detail, dropped in tiles), so a view
   with a dozen near trees stays inside the SVG budgets (the heath library
   trees carry 90 to 280 KB of path data each). All lit from the upper LEFT
   (a flipped placement takes the light from the right).

   tree.pool-pine: the veteran Scots pines on the banks of the pool, its
     signature trees: a long bare trunk, grey and plated low down and ORANGE
     above, crooked limbs holding flat, cloud-like clumps of needles.
     Variant 0: a tall veteran leaning out over the water; 1: a shorter,
     broader pine leaning the other way; 2: a young pine. Seasons by palette:
     fresh pale candles on the clump tops in spring, frost / snow along them
     in winter. Tagged landmark + signature + place:uk/wyndhams-pool so a
     scene's signature rule (15.2) can name it; weight 0, so archetypes never
     pick it as a generic pine.
   tree.pool-birch: a silver birch: a slender white trunk with black
     diamonds and a dark rough foot, up-curving limbs and a loose, drooping
     crown; bright fresh green in spring, green in summer, butter-yellow in
     autumn, and in winter (shapeBySeason) bare: the purple-brown haze of
     fine twigs. Variants 0 to 2: tall, medium, young.
   tree.pool-oak: the broadleaves behind the banks: variant 0 a spreading
     oak, 1 an alder (narrower, darker, at the water's edge); bare twig
     crowns in winter.
   tree.far-pine, tree.far-birch, tree.far-broad: the far-shore and
     skyline trees, drawn for DISTANCE (about 40 to 200 units tall on
     screen): a few lobed masses in three tones on a thin trunk. Two
     variants each. In winter the broadleaves' crowns turn to the
     purple-grey haze of bare twigs while the pines stay green.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = (v) => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  /** A lobed crown mass centred at (cx, cy): n lobes round an ellipse rx x ry (seeded). */
  const mass = (r, cx, cy, rx, ry, n) => {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 2 * i / n, k = 0.82 + r() * 0.3, x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
      if (!i) { d = `M${f1(x)} ${f1(y)}`; continue; }
      const am = Math.PI * 2 * (i - 0.5) / n, bulge = 1.28 + r() * 0.22;
      d += `Q${f1(cx + Math.cos(am) * rx * bulge)} ${f1(cy + Math.sin(am) * ry * bulge)} ${f1(x)} ${f1(y)}`;
    }
    return d + 'z';
  };
  /** mass with whole-number coordinates (the distant trees: a smaller SVG still). */
  const massI = (r, cx, cy, rx, ry, n) => mass(r, cx, cy, rx, ry, n).replace(/-?\d+\.\d+/g, (v) => String(Math.round(+v)));
  const distant = (id, kindOf, tags) => sceneObjDefine({
    id,
    category: 'tree',
    size: [130, 220],
    variants: 2,
    seasonal: true,
    shapeBySeason: kindOf !== 'pine',   // the broadleaves go bare in winter
    flippable: true,
    palette: {
      base: { trunk: ['#6a5444', '#4a3a30'], pineTrunk: ['#b0623a', '#7a4430'], birchTrunk: ['#e6e2d8', '#9a968e'], pine: ['#1e4234', '#2e5a44', '#53805a'] },
      spring: { leaf: ['#3f7034', '#68a046', '#a6d070'], pine: ['#1f4536', '#32624a', '#5f9060'] },
      summer: { leaf: ['#2f5a2e', '#4a7e3a', '#80b058'] },
      autumn: { leaf: ['#8a5524', '#c08032', '#e8b450'], pine: ['#21432f', '#33603f', '#6a8a4e'] },
      winter: { leaf: ['#4a3e36', '#5e5046', '#76685c'], pine: ['#1d3a33', '#2a5044', '#4e7464'] },
    },
    parts: ['body'],
    shadow: { rx: 40, ry: 6, h: 200 },
    reflect: true,
    tags: ['uk', 'woodland', 'distant', 'far-shore'].concat(tags, ['kit:temperate', 'role:tree']),
    credit: 'drawn for the Wyndham\'s Pool scenes after the far woods of the old view art (K.woods)',
    build(v, r, ctx) {
      const kind = kindOf, alt = v % 2, bare = kind !== 'pine' && ctx && ctx.season === 'winter';
      const body = [];
      if (kind === 'pine') {
        const h = alt ? 200 : 218, lean = alt ? -8 : 10;
        body.push(['@pineTrunk.0', `M-4 0L${lean - 1.5} ${f1(-h * 0.9)}L${lean + 1.5} ${f1(-h * 0.9)}L4 0z`], ['@pineTrunk.1', `M1 0L${lean + 1} ${f1(-h * 0.9)}L${lean + 1.5} ${f1(-h * 0.9)}L4 0z`]);
        const plates = alt ? [[0.62, -16, 54, 20], [0.76, 14, 60, 22], [0.9, -4, 66, 24]] : [[0.58, 14, 50, 18], [0.7, -18, 62, 22], [0.82, 10, 64, 22], [0.95, -2, 56, 20]];
        let lim = '';
        for (const [t, dx] of plates) lim += `M${f1(lean * t)} ${f1(-h * t)}l${dx} -6`;
        body.push({ s: '@pineTrunk.1', w: 2.4, cap: 'round', d: lim });
        for (const [t, dx, w, hh] of plates) { const cx = lean * t + dx, cy = -h * t - 8; body.push(['@pine.0', massI(r, cx + 2, cy + 4, w / 2, hh / 2, 6)], ['@pine.1', massI(r, cx, cy, w / 2 * 0.94, hh / 2 * 0.86, 6)], ['@pine.2', massI(r, cx - w * 0.12, cy - hh * 0.18, w * 0.26, hh * 0.24, 5), 0.9]); }
      } else if (kind === 'birch') {
        const h = alt ? 190 : 214, lean = alt ? 6 : -6;
        body.push(['@birchTrunk.0', `M-2.6 0L${lean - 1.4} ${f1(-h * 0.94)}L${lean + 1.4} ${f1(-h * 0.94)}L2.6 0z`]);
        let marks = '';
        for (let i = 0; i < 6; i++) { const t = 0.08 + r() * 0.5; marks += `M${f1(lean * t - 2.4)} ${f1(-h * t)}h${f1(2 + r() * 2)}`; }
        body.push({ s: '@birchTrunk.1', w: 1.4, d: marks });
        const cx = lean * 0.7, cy = -h * 0.66, rx = alt ? 30 : 26, ry = h * 0.3;
        if (bare) {   // winter: up-swept limbs off the white stem and the fine twig haze of the crown
          let lim = '';
          for (let i = 0; i < 5; i++) { const t = 0.45 + i * 0.1, s = i % 2 ? 1 : -1; lim += `M${f1(lean * t)} ${f1(-h * t)}l${f1(s * rr(r, 12, 22))} ${f1(-rr(r, 16, 26))}`; }
          const hz = sceneDraw.twigHazeLod(r, cx, cy, rx, ry, 9);
          body.push({ s: '@leaf.0', w: 1.6, cap: 'round', d: lim }, { s: '@leaf.1', w: 1, cap: 'round', op: 0.6, d: hz.core }, { s: '@leaf.1', w: 1, cap: 'round', op: 0.6, d: hz.fine, detail: true });
          return { body };
        }
        body.push(['@leaf.0', massI(r, cx + 3, cy + 6, rx, ry, 8)], ['@leaf.1', massI(r, cx, cy, rx * 0.9, ry * 0.9, 8)], ['@leaf.2', massI(r, cx - rx * 0.3, cy - ry * 0.3, rx * 0.42, ry * 0.42, 6), 0.9]);
        body.push(['@leaf.1', massI(r, cx + rx * 0.5, cy + ry * 0.5, rx * 0.4, ry * 0.32, 6), 0.95]);
      } else {
        const h = alt ? 170 : 196, w = alt ? 70 : 84;
        body.push(['@trunk.0', `M-5 0L-3 ${f1(-h * 0.42)}L3 ${f1(-h * 0.42)}L5 0z`], { s: '@trunk.0', w: 2.6, cap: 'round', d: `M0 ${f1(-h * 0.36)}l-14 -22M0 ${f1(-h * 0.4)}l12 -26` });
        const cy = -h * 0.66;
        if (bare) {   // winter: the branch fork and the fine twig haze of a bare oak or alder
          const y0 = -h * 0.4, lim = sceneDraw.twigs(r, [[-1, y0, -0.75, w * 0.42], [1, y0, 0.7, w * 0.42], [0, y0, 0.05, h * 0.3]], 1, 0.42);
          const hz = sceneDraw.twigHazeLod(r, 0, cy, w / 2, h * 0.3, 16);
          body.push({ s: '@trunk.0', w: 2.2, cap: 'round', d: lim }, { s: '@leaf.1', w: 1, cap: 'round', op: 0.6, d: hz.core }, { s: '@leaf.1', w: 1, cap: 'round', op: 0.6, d: hz.fine, detail: true });
          return { body };
        }
        body.push(['@leaf.0', massI(r, 4, cy + 8, w / 2, h * 0.32, 9)], ['@leaf.1', massI(r, 0, cy, w / 2 * 0.92, h * 0.3, 9)]);
        body.push(['@leaf.2', massI(r, -w * 0.18, cy - h * 0.12, w * 0.24, h * 0.14, 6), 0.9], ['@leaf.2', massI(r, w * 0.1, cy - h * 0.2, w * 0.16, h * 0.1, 5), 0.8]);
        body.push(['@leaf.0', massI(r, w * 0.2, cy + h * 0.1, w * 0.14, h * 0.08, 5), 0.7]);
      }
      return { body };
    },
  });
  distant('tree.far-pine', 'pine', ['conifer', 'scots-pine']);
  distant('tree.far-birch', 'birch', ['deciduous', 'birch']);
  distant('tree.far-broad', 'broad', ['deciduous', 'oak', 'alder']);

  /* ---------- the near trees ---------- */
  /** One leafy clump in three tones (shade down-right, body, the lit lobe up-left) and leaf texture (detail). */
  const clump = (r, out, cx, cy, rx, ry, slot, dots, flat) => {
    out.push([`@${slot}.0`, massI(r, cx + rx * 0.1, cy + ry * 0.14, rx, ry, flat ? 9 : 8)]);
    out.push([`@${slot}.1`, massI(r, cx - rx * 0.05, cy - ry * 0.06, rx * 0.86, ry * 0.8, flat ? 9 : 8)]);
    out.push([`@${slot}.2`, massI(r, cx - rx * 0.3, cy - ry * (flat ? 0.36 : 0.3), rx * 0.5, ry * 0.42, 6), 0.95]);
    if (dots) {
      let d = '';
      for (let i = 0; i < dots; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.8; d += sceneD.ell(f1(cx - rx * 0.15 + Math.cos(a) * rx * k), f1(cy - ry * 0.15 + Math.sin(a) * ry * k), f1(rr(r, 1.6, 3)), f1(rr(r, 1.1, 2))); }
      out.push({ f: `@${slot}.3`, d, op: 0.8, detail: true });
    }
  };
  /** A limb as a curved stroke from (x, y) to (ex, ey), bowed by bow. */
  const limb = (x, y, ex, ey, bow) => `M${f1(x)} ${f1(y)}Q${f1((x + ex) / 2 - (ey - y) * bow)} ${f1((y + ey) / 2 + (ex - x) * bow)} ${f1(ex)} ${f1(ey)}`;
  /** Fine winter twigs fanning out from the limb ends: n short forked strokes (one path). */
  const twigs = (r, ends, n, len) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const [x, y, side] = ends[i % ends.length], a = -Math.PI / 2 + side * rr(r, 0.1, 1.2) + rr(r, -0.5, 0.5), l = len * rr(r, 0.5, 1);
      const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
      d += `M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}l${f1(rr(r, -8, 8))} ${f1(-rr(r, 4, 10))}`;
    }
    return d;
  };

  sceneObjDefine({
    id: 'tree.pool-pine',
    category: 'tree',
    size: [340, 620],
    variants: 3,
    seasonal: true,
    flippable: true,
    weight: 0,
    palette: {
      base: { bark: ['#5e4a3a', '#3b2f26', '#86705c'], barkUp: ['#c0683a', '#86442c', '#e49a62'], limb: ['#6a3e28', '#4a2c20'], cone: '#5a3e26', root: '#4a3a2c' },
      spring: { needle: ['#1c4032', '#2e5e46', '#55895a', '#8fbf74'], top: '#c4e48e' },
      summer: { needle: ['#1a3b2e', '#2a5640', '#4c7a4e', '#7aa468'], top: '#6e9a5c' },
      autumn: { needle: ['#1f3e2c', '#315c3c', '#5f834a', '#98a45c'], top: '#b4a456' },
      winter: { needle: ['#19362f', '#284c41', '#46695e', '#7c9a90'], top: '#f2f6f8' },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [20, -380], deg: 1 } },
    shadow: { rx: 90, ry: 12, h: 560 },
    reflect: true,
    tags: ['uk', 'heath', 'pond', 'evergreen', 'conifer', 'scots-pine', 'veteran', 'landmark', 'signature', 'place:uk/wyndhams-pool', 'kit:water', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the Wyndham\'s Pool scenes after the pines of the old view art (K.tree("pine"))',
    build(v, r) {
      const H = [600, 500, 330][v], lean = [40, -30, 12][v], sw = v === 1 ? -1 : 1, W0 = [15, 14, 9][v];
      const P = (t) => [lean * (0.55 * t * t + 0.45 * t) + Math.sin(t * 3.3) * 6 * sw, -H * 0.94 * t];
      const W = (t) => W0 * (1 - t) + 2.6;
      const edge = (t0, t1, side) => { const pts = []; for (let i = 0; i <= 8; i++) { const t = t0 + (t1 - t0) * i / 8, [x, y] = P(t); pts.push([x + side * W(t), y]); } return pts; };
      const poly = (a, b) => 'M' + a.concat(b.reverse()).map(([x, y]) => f1(x) + ' ' + f1(y)).join('L') + 'z';
      const trunk = [];
      // the root flare and the plated grey-brown foot; the orange, flaking upper trunk, shaded right, lit left
      trunk.push(['@root', `M${-W0 * 2} 2Q${-W0 * 1.3} -4 ${-W0} -20L${W0} -20Q${W0 * 1.3} -4 ${W0 * 2.1} 3Q0 8 ${-W0 * 2} 2z`]);
      trunk.push(['@bark.0', poly(edge(0, 0.42, -1), edge(0, 0.42, 1))], ['@bark.1', poly(edge(0, 0.42, 0.2), edge(0, 0.42, 1))]);
      let marks = '';
      for (let i = 0; i < 12; i++) { const t = rr(r, 0.02, 0.4), [x, y] = P(t), w = W(t); marks += `M${f1(x - w * rr(r, 0.2, 0.9))} ${f1(y)}l${f1(rr(r, 4, 10))} ${f1(rr(r, -2, 2))}`; }
      trunk.push({ s: '@bark.1', w: 1.7, cap: 'round', d: marks });
      trunk.push(['@barkUp.0', poly(edge(0.38, 1, -1), edge(0.38, 1, 1))], ['@barkUp.1', poly(edge(0.38, 1, 0.35), edge(0.38, 1, 1))]);
      trunk.push(['@barkUp.2', poly(edge(0.4, 0.97, -1), edge(0.4, 0.97, -0.45)), 0.85]);
      let flakes = '';
      for (let i = 0; i < 10; i++) { const t = rr(r, 0.44, 0.9), [x, y] = P(t), w = W(t); flakes += `M${f1(x - w * 0.5)} ${f1(y)}l${f1(w * 0.8)} ${f1(-rr(r, 1, 3))}`; }
      trunk.push({ s: '@barkUp.1', w: 1.1, cap: 'round', op: 0.8, d: flakes });
      // the crown: crooked limbs out to flat cloud-like clumps; the top clump crowns the trunk
      const tops = [
        [[0.56, -1, 120], [0.62, 1, 104], [0.7, -1, 150], [0.77, 1, 132], [0.85, -1, 96], [0.9, 1, 90], [1, 0, 100]],
        [[0.55, 1, 128], [0.63, -1, 140], [0.71, 1, 150], [0.8, -1, 120], [0.88, 1, 96], [1, 0, 120]],
        [[0.5, -1, 70], [0.6, 1, 74], [0.7, -1, 66], [0.8, 1, 60], [0.9, -1, 50], [1, 0, 56]],
      ][v];
      const crown = [], clumps = [];
      let limbs = '', small = '';
      for (const [t, side, len] of tops) {
        const [x, y] = P(Math.min(1, t));
        const ex = x + side * len * rr(r, 0.62, 0.78) + (side === 0 ? sw * 8 : 0), ey = y - rr(r, 10, 30) - (side === 0 ? 22 : 0);
        limbs += limb(x, y, ex, ey, side * 0.18);
        small += `M${f1(ex)} ${f1(ey)}l${f1(side * rr(r, 8, 20))} ${f1(-rr(r, 4, 10))}M${f1((x + ex) / 2)} ${f1((y + ey) / 2 + 4)}l${f1(side * rr(r, 6, 14))} ${f1(-rr(r, 8, 14))}`;
        const rx = len * rr(r, 0.42, 0.52) + 12, ry = rx * rr(r, 0.36, 0.44);
        clumps.push([ex + side * rx * 0.25, ey - ry * 0.3, rx, ry]);
        if (len > 100) clumps.push([ex - side * rx * 0.45, ey - ry * 0.1, rx * 0.6, ry * 0.85]);
      }
      crown.push({ s: '@limb.0', w: v === 2 ? 4 : 6, cap: 'round', d: limbs }, { s: '@limb.1', w: 2.4, cap: 'round', d: small });
      clumps.sort((a, b) => a[1] - b[1]);
      let top = '', cones = '';
      for (const [cx, cy, rx, ry] of clumps) {
        clump(r, crown, cx, cy, rx, ry, 'needle', Math.round(rx / 4), true);
        for (let i = 0; i < 3; i++) top += sceneD.ell(f1(cx - rx * 0.55 + r() * rx * 0.9), f1(cy - ry * rr(r, 0.62, 0.78)), f1(rr(r, 5, 10)), f1(rr(r, 1.4, 2.4)));
        if (r() < 0.5) cones += sceneD.ell(f1(cx + rr(r, -rx * 0.3, rx * 0.3)), f1(cy + ry * 0.5), 2.2, 3.4);
      }
      crown.push({ f: '@top', d: top, op: 0.9, detail: true }, { f: '@cone', d: cones, detail: true });
      return { trunk, crown };
    },
  });

  sceneObjDefine({
    id: 'tree.pool-birch',
    category: 'tree',
    size: [190, 450],
    variants: 3,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { bark: ['#eeebe4', '#b4afa6', '#26221f', '#fbf8f2'], peel: ['#d8b49a', '#c8c2b8'], twig: ['#4e3632', '#6e5048'], haze: '#6a5a50', catkin: '#7a5a3e' },
      spring: { leaf: ['#4a8030', '#6ea640', '#9ccc58', '#cfe98a'], catkin: '#b89a48' },
      summer: { leaf: ['#2e5a26', '#457a32', '#6fa046', '#a6cc66'] },
      autumn: { leaf: ['#9a6a1c', '#c99424', '#e8bf3e', '#f6df7c'] },
      winter: { leaf: ['#6a5058', '#7c5e66', '#947880', '#b09aa0'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -200], deg: 1.8 } },
    shadow: { rx: 50, ry: 8, h: 420 },
    reflect: true,
    tags: ['uk', 'heath', 'pond', 'woodland', 'deciduous', 'birch', 'silver-birch', 'kit:water', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the Wyndham\'s Pool scenes after the birches of the old view art (K.tree("birch"))',
    // a silver birch (Betula pendula): a white, peeling trunk with black lenticels, black chevrons under the limbs and a
    // dark fissured foot; limbs that rise and arch over; long fine twigs hanging from them, strung with small diamond
    // leaves in loose clusters, so the light shows through the crown (no solid clumps). Winter: the bare hanging twigs
    // and the purple-brown haze, with the male catkins at the twig ends.
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', bare = season === 'winter';
      const H = [440, 370, 290][v], lean = [10, -14, 6][v], W0 = [7.6, 6.4, 5.2][v], k = H / 440;
      const P = (t) => [lean * t * t + Math.sin(t * 4 + v) * 4, -H * 0.97 * t];
      const W = (t) => W0 * (1 - t * 0.85) + 0.7;
      const edge = (t0, t1, side) => { const pts = []; for (let i = 0; i <= 10; i++) { const t = t0 + (t1 - t0) * i / 10, [x, y] = P(t); pts.push([x + side * W(t), y]); } return pts; };
      const poly = (a, b) => 'M' + a.concat(b.reverse()).map(([x, y]) => f1(x) + ' ' + f1(y)).join('L') + 'z';
      const trunk = [];
      // the white trunk, a bright lit strip on the left, the shaded right side
      trunk.push(['@bark.0', poly(edge(0, 1, -1), edge(0, 1, 1))]);
      trunk.push(['@bark.1', poly(edge(0.05, 1, 0.25), edge(0.05, 1, 1)), 0.85]);
      trunk.push(['@bark.3', poly(edge(0.12, 0.9, -0.85), edge(0.12, 0.9, -0.35)), 0.9]);
      // the dark, deeply fissured foot: a ragged top edge, pale ridges between the black cracks
      const ft = rr(r, 0.07, 0.11), fl = edge(0, ft, -1.08), fr = edge(0, ft, 1.08).reverse();
      let foot = 'M' + fl.map(([x, y]) => f1(x) + ' ' + f1(y)).join('L');
      const [, ty0] = P(ft);
      for (let i = 1; i < 6; i++) { const [x] = P(ft), u = -1 + 2 * i / 6; foot += `L${f1(x + u * W(ft))} ${f1(ty0 + (i % 2 ? rr(r, 4, 14) : -rr(r, 1, 6)) * k)}`; }
      foot += 'L' + fr.map(([x, y]) => f1(x) + ' ' + f1(y)).join('L') + 'z';
      trunk.push(['@bark.2', foot, 0.9]);
      let ridges = '';
      for (let i = 0; i < 6; i++) { const t = rr(r, 0, ft * 0.85), [x, y] = P(t), w = W(t); ridges += `M${f1(x + w * rr(r, -0.8, 0.5))} ${f1(y)}l${f1(rr(r, -1, 1))} ${f1(-rr(r, 8, 22) * k)}`; }
      trunk.push({ s: '@bark.1', w: 1.4, cap: 'round', op: 0.75, d: ridges });
      // black lenticels: horizontal dashes, thicker and denser low down; a few wide black patches
      let marks = '';
      for (let i = 0; i < 30; i++) { const t = ft + Math.pow(r(), 1.3) * (0.92 - ft), [x, y] = P(t), w = W(t), a = rr(r, -1, 0.6); marks += `M${f1(x + w * a)} ${f1(y)}l${f1(w * rr(r, 0.4, 1.3))} ${f1(rr(r, -0.8, 0.8))}`; }
      trunk.push({ s: '@bark.2', w: W0 > 6 ? 1.4 : 1.1, cap: 'round', op: 0.9, d: marks });
      let patch = '';
      for (let i = 0; i < 5; i++) { const t = rr(r, ft + 0.02, 0.5), [x, y] = P(t), w = W(t), s = r() < 0.5 ? -1 : 1; patch += `M${f1(x + s * w)} ${f1(y)}l${f1(-s * w * rr(r, 0.6, 1.1))} ${f1(rr(r, -1.5, 0.5))}l${f1(s * rr(r, 0, 1.5))} ${f1(rr(r, 2.5, 4.5))}z`; }
      trunk.push(['@bark.2', patch, 0.9]);
      // the peeling papery bark: little curls catching the light, a warm under-layer showing
      let curls = '', under = '';
      for (let i = 0; i < 9; i++) {
        const t = rr(r, ft + 0.04, 0.85), [x, y] = P(t), w = W(t), x0 = x - w * rr(r, 0.2, 0.9);
        under += `M${f1(x0)} ${f1(y)}l${f1(w * rr(r, 0.4, 0.9))} 0l0 1.6l${f1(-w * 0.5)} 0z`;
        curls += `M${f1(x0)} ${f1(y - 0.6)}q${f1(w * 0.4)} -2.2 ${f1(w * 0.8)} -0.4`;
      }
      trunk.push(['@peel.0', under, 0.7], { s: '@bark.3', w: 1, cap: 'round', d: curls }, { s: '@peel.1', w: 0.7, cap: 'round', op: 0.8, d: curls.replace(/q/g, 'm0 1.4q'), detail: true });
      // the limbs: they rise steeply from the upper trunk, arch over and droop at their ends; the twigs hang from them
      const crown = [], hangs = [];
      const n = [10, 8, 6][v];
      let lim = '', lim2 = '', chev = '';
      const cub = (a, b, c, d, u) => { const m = 1 - u; return m * m * m * a + 3 * m * m * u * b + 3 * m * u * u * c + u * u * u * d; };
      let side = r() < 0.5 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const t = 0.32 + 0.62 * Math.pow((i + rr(r, 0.1, 0.9)) / n, 0.9), [x, y] = P(t);
        side = r() < 0.72 ? -side : side;
        const len = H * (0.11 + 0.15 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.3))) * rr(r, 0.75, 1.2) + 10 * k;
        const rise = rr(r, 0.45, 0.85), c1 = [x + side * len * rr(r, 0.12, 0.3), y - len * rise], c2 = [x + side * len * rr(r, 0.55, 0.75), y - len * rise * rr(r, 0.8, 1.05)];
        const e = [x + side * len * rr(r, 0.85, 1), y - len * rr(r, 0.02, 0.4)];
        const at = (u) => [cub(x, c1[0], c2[0], e[0], u), cub(y, c1[1], c2[1], e[1], u)];
        const p4 = at(0.38);
        lim += `M${f1(x)} ${f1(y)}Q${f1((x + c1[0]) / 2)} ${f1((y + c1[1]) / 2)} ${f1(p4[0])} ${f1(p4[1])}`;
        lim2 += `M${f1(x)} ${f1(y)}C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(e[0])} ${f1(e[1])}`;
        // the birch's black chevron under the limb
        if (t < 0.8) { const w = W(t); chev += `M${f1(x - w * 0.95)} ${f1(y + 2)}L${f1(x + side * w * 0.3)} ${f1(y + 4 + w * 1.3)}L${f1(x + w * 0.95)} ${f1(y + 2)}L${f1(x + side * w * 0.2)} ${f1(y + 3 + w * 0.5)}z`; }
        // the hanging twigs along the outer limb; a side shoot with its own
        const m = Math.max(3, Math.round(len / (11 * k + 3)));
        for (let j = 0; j < m; j++) { const u = 0.25 + 0.75 * (j + rr(r, 0, 0.8)) / m, [ax, ay] = at(Math.min(1, u)); hangs.push([ax, ay, side, len * rr(r, 0.28, 0.62) * (0.6 + u * 0.5) + 8 * k, u]); }
        const su = rr(r, 0.4, 0.6), [sx, sy] = at(su), sl = len * rr(r, 0.3, 0.45), se = [sx + side * sl * 0.8, sy - sl * rr(r, 0.05, 0.35)];
        lim2 += `M${f1(sx)} ${f1(sy)}Q${f1(sx + side * sl * 0.4)} ${f1(sy - sl * 0.55)} ${f1(se[0])} ${f1(se[1])}`;
        for (let j = 0; j < 3; j++) hangs.push([sx + side * sl * (0.3 + j * 0.3), sy - sl * (0.3 - j * 0.08), side, len * rr(r, 0.25, 0.5) + 8 * k, 0.6]);
      }
      // the leader: the trunk's top runs on into a fine spire of twigs; short twigs hang close round the trunk (the crown's core)
      const [tx, ty] = P(1);
      lim2 += `M${f1(tx)} ${f1(ty)}q${f1(lean * 0.2)} ${f1(-H * 0.05)} ${f1(lean * 0.1 + 2)} ${f1(-H * 0.09)}`;
      for (let j = 0; j < 5; j++) hangs.push([tx + rr(r, -14, 14) * k, ty - rr(r, 0, H * 0.08), j % 2 ? 1 : -1, H * rr(r, 0.06, 0.12), 0.9]);
      for (let j = 0; j < [9, 7, 5][v]; j++) { const t = rr(r, 0.45, 0.92), [x, y] = P(t); hangs.push([x + rr(r, -1, 1) * H * 0.06, y - rr(r, 0, H * 0.04), r() < 0.5 ? -1 : 1, H * rr(r, 0.07, 0.15), 0.5]); }
      trunk.push(['@bark.2', chev, 0.92]);
      const cx0 = P(0.7)[0], cy0 = P(0.7)[1], CW = H * 0.3, CH = H * 0.36;
      // the hanging twigs: long, fine, nearly straight down, a little swing at the tip
      let tw = '', tw2 = '', cat = '';
      const strands = [];
      for (const [ax, ay, sd, L] of hangs) {
        const sw = sd * rr(r, 1, 7) * k + rr(r, -3, 3), bow = sd * rr(r, 2, 6) * k;
        const d = `M${f1(ax)} ${f1(ay)}q${f1(bow)} ${f1(L * 0.3)} ${f1(sw)} ${f1(L)}`;
        if (r() < 0.55) tw += d; else tw2 += d;
        strands.push([ax, ay, bow, sw, L]);
        // winter: a curtain of more fine twigs beside each one (the purple-brown haze of a bare birch)
        if (bare) for (let j = 0; j < 1; j++) { const ox = rr(r, -6, 6) * k, l2 = L * rr(r, 0.5, 0.9); tw2 += `M${f1(ax + ox)} ${f1(ay + rr(r, 0, 6))}q${f1(bow * 0.6)} ${f1(l2 * 0.3)} ${f1(sw * 0.8 + ox * 0.3)} ${f1(l2)}`; }
        if ((bare || season === 'spring') && r() < 0.5) cat += `M${f1(ax + sw)} ${f1(ay + L - 1)}l${f1(rr(r, -0.6, 0.6))} ${f1((bare ? 4 : 7) * k + 2)}`;
      }
      if (bare) {
        // winter: the purple-brown haze round the limb ends, the bare hanging twigs, the catkins at their tips
        let hz = '';
        for (const [ax, ay, , L, u] of hangs) if (u > 0.7 && r() < 0.5) hz += sceneDraw.twigHaze(r, ax, ay + L * 0.4, L * 0.35, L * 0.45, 2);
        crown.push({ s: '@haze', w: 0.6, cap: 'round', op: 0.45, d: hz, detail: true });
        crown.push({ s: '@twig.1', w: 0.6, cap: 'round', op: 0.7, d: tw2, detail: true }, { s: '@twig.0', w: [1.4, 1.25, 1.1][v], cap: 'round', d: lim2 });
        crown.push({ s: '@twig.0', w: [3.6, 3.1, 2.6][v], cap: 'round', d: lim }, { s: '@bark.1', w: [2.2, 1.9, 1.6][v], cap: 'round', d: lim });
        crown.push({ s: '@twig.0', w: 0.8, cap: 'round', op: 0.85, d: tw });
        crown.push({ s: '@catkin', w: 1.8, cap: 'round', op: 0.85, d: cat, detail: true });
        return { trunk, crown };
      }
      // the leaves: small diamond leaves in sprays along each hanging twig, gaps between the sprays and the twigs so the light
      // shows through; each spray darker below and to the right, the crown lit from the upper left. Spring and autumn
      // crowns are thinner (more twig and sky)
      const dens = season === 'summer' ? 0.9 : season === 'autumn' ? 0.78 : 0.7, ls = (season === 'spring' ? 5.6 : 6.8) * (0.6 + k * 0.4);
      const tone = ['', '', '', ''], I = Math.round;
      for (const [ax, ay, bow, sw, L] of strands) {
        const m = Math.max(2, Math.round(L / (ls * 3.1) * dens + 0.4));
        for (let j = 0; j < m; j++) {
          if (r() < 0.16) continue;
          const u = 0.1 + 0.9 * (j + r() * 0.5) / m, qx = ax + 2 * (1 - u) * u * bow + u * u * sw, qy = ay + L * (0.6 * u * (1 - u) + u * u);
          const base = -(qx - cx0) / CW * 0.45 - (qy - cy0) / CH * 0.6 + rr(r, -0.5, 0.5), tn0 = base > 0.6 ? 2 : base > -0.3 ? 1 : 0;
          // the spray: a cluster of pointed leaves as one jagged outline, hanging (one shape, not four: cheap to raster)
          const np = 7, a0 = rr(r, 0, 6.28), big = season === 'summer' ? 1.04 : 1;
          let sp = '', px = 0, py = 0;
          for (let q = 0; q < np; q++) {
            const an = a0 + Math.PI * 2 * q / np + rr(r, -0.25, 0.25), tip = q % 2 === 0 || r() < 0.3, rad = ls * big * (tip ? rr(r, 0.95, 1.35) : rr(r, 0.35, 0.55));
            const x = Math.cos(an) * rad, y = Math.sin(an) * rad * 1.15 + ls * 0.3;
            sp += q ? `${I(x - px)} ${I(y - py)} ` : `M${f1(qx + x)} ${f1(qy + y)}l`;
            px = x; py = y;
          }
          tone[tn0] += sp.trimEnd() + 'z';
          // a single leaf catching the light on its top, now and then one in shade below
          const leafAt = (lx, ly, tn) => { const an = Math.PI / 2 + rr(r, -1.1, 1.1), sz = ls * rr(r, 0.75, 1.05), ca = Math.cos(an) * sz, sa = Math.sin(an) * sz; tone[tn] += `M${f1(lx)} ${f1(ly)}l${I(ca * 0.5 - sa * 0.42)} ${I(sa * 0.5 + ca * 0.42)} ${I(ca * 0.85 + sa * 0.42)} ${I(sa * 0.85 - ca * 0.42)} ${I(-ca * 0.85 + sa * 0.42)} ${I(-sa * 0.85 - ca * 0.42)}z`; };
          if (r() < 0.5) leafAt(qx - ls * 0.4, qy - ls * 0.3, Math.min(3, tn0 + 1 + (tn0 === 2 && r() < 0.5 ? 1 : 0)));
          if (r() < 0.25) leafAt(qx + ls * 0.5, qy + ls * 0.7, Math.max(0, tn0 - 1));
        }
      }
      crown.push(['@leaf.0', tone[0]]);
      crown.push({ s: '@twig.0', w: [1.4, 1.25, 1.1][v], cap: 'round', d: lim2 }, { s: '@twig.0', w: [3.6, 3.1, 2.6][v], cap: 'round', d: lim }, { s: '@bark.1', w: [2.2, 1.9, 1.6][v], cap: 'round', d: lim });
      crown.push({ s: '@twig.1', w: 0.75, cap: 'round', op: 0.8, d: tw }, { s: '@twig.0', w: 0.65, cap: 'round', op: 0.6, d: tw2, detail: true });
      crown.push(['@leaf.1', tone[1]], ['@leaf.2', tone[2]], { f: '@leaf.3', d: tone[3], op: 0.95 });
      if (cat) crown.push({ s: '@catkin', w: 2, cap: 'round', op: 0.9, d: cat, detail: true });
      return { trunk, crown };
    },
  });

  sceneObjDefine({
    id: 'tree.pool-oak',
    category: 'tree',
    size: [300, 380],
    variants: 2,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { bark: ['#5a4a3a', '#3e3228', '#7a6852'], twig: ['#4a3a32', '#6a5248'], haze: '#62544a' },
      spring: { leaf: ['#4a7a2c', '#6a9e3a', '#98c456', '#c4e07a'] },
      summer: { leaf: ['#284e22', '#3e6a30', '#628e40', '#8cb45a'] },
      autumn: { leaf: ['#7a441a', '#a8642a', '#cc8c36', '#e6b45c'] },
      winter: { leaf: ['#584850', '#6e5a5e', '#866e74', '#a08a8e'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -150], deg: 1.2 } },
    shadow: { rx: 110, ry: 14, h: 360 },
    reflect: true,
    tags: ['uk', 'woodland', 'pond', 'deciduous', 'oak', 'alder', 'kit:water', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the Wyndham\'s Pool scenes after the oaks and alders of the old view art (K.tree)',
    build(v, r, ctx) {
      const alder = v === 1, H = alder ? 330 : 360, CW = alder ? 90 : 150, W0 = alder ? 9 : 16, bare = ctx && ctx.season === 'winter';
      const trunk = [];
      const bole = alder ? 0.55 : 0.4;
      trunk.push(['@bark.0', `M${-W0 * 1.5} 2Q${-W0} -10 ${-W0} -30L${f1(-W0 * 0.5)} ${f1(-H * bole)}L${f1(W0 * 0.5)} ${f1(-H * bole)}L${W0} -30Q${W0} -10 ${f1(W0 * 1.6)} 2z`]);
      trunk.push(['@bark.1', `M${f1(W0 * 0.2)} 0L${f1(W0 * 0.1)} ${f1(-H * bole)}L${f1(W0 * 0.5)} ${f1(-H * bole)}L${W0} -30Q${W0} -10 ${f1(W0 * 1.6)} 2z`, 0.9]);
      let fiss = '';
      for (let i = 0; i < 9; i++) { const y = -rr(r, 10, H * bole), x = rr(r, -W0 * 0.7, W0 * 0.4); fiss += `M${f1(x)} ${f1(y)}l${f1(rr(r, -1, 1))} ${f1(-rr(r, 8, 20))}`; }
      trunk.push({ s: '@bark.1', w: 1.4, cap: 'round', op: 0.8, d: fiss });
      // the limbs out to the crown's clumps
      const crown = [], ends = [];
      let limbs = '';
      const n = alder ? 7 : 8;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * (alder ? 1.5 : 2.3), y0 = -H * bole * rr(r, 0.9, 1.05);
        const len = (alder ? H * 0.42 : H * 0.48) * rr(r, 0.7, 1);
        const ex = Math.cos(a) * len * (CW / 150), ey = y0 + Math.sin(a) * len * 0.85;
        limbs += limb(0, y0, ex, ey, (ex > 0 ? 1 : -1) * 0.1);
        ends.push([ex, ey, ex > 0 ? 1 : -1, len]);
      }
      crown.push({ s: '@twig.0', w: alder ? 3.5 : 5, cap: 'round', d: limbs });
      if (bare) {
        let hz = '', hzF = '';
        for (const [ex, ey, , len] of ends) { const h = sceneDraw.twigHazeLod(r, ex, ey, len * 0.4, len * 0.34, 5); hz += h.core; hzF += h.fine; }
        crown.push({ s: '@haze', w: 0.8, cap: 'round', op: 0.5, d: hz }, { s: '@haze', w: 0.8, cap: 'round', op: 0.5, d: hzF, detail: true });
        crown.push({ s: '@twig.1', w: 1, cap: 'round', op: 0.8, d: twigs(r, ends, n * 7, H * 0.1) });
        crown.push({ s: '@twig.0', w: 0.6, cap: 'round', op: 0.6, d: twigs(r, ends, n * 6, H * 0.07), detail: true });
        return { trunk, crown };
      }
      const cl = [];
      for (const [ex, ey, , len] of ends) {
        cl.push([ex, ey, len * rr(r, 0.36, 0.46), len * rr(r, 0.3, 0.38)]);
        cl.push([ex * 0.55, ey * 0.55 - H * bole * 0.45, len * rr(r, 0.28, 0.36), len * rr(r, 0.24, 0.3)]);
      }
      cl.push([0, -H * 0.8, CW * 0.5, CW * 0.36], [0, -H * 0.62, CW * 0.56, CW * 0.34]);
      cl.sort((a, b) => a[1] - b[1]);
      for (const [cx, cy, rx, ry] of cl) clump(r, crown, cx, cy, rx, ry, 'leaf', Math.round(rx / 3));
      return { trunk, crown };
    },
  });
})();
