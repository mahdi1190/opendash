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
    flippable: true,
    palette: {
      base: { trunk: ['#6a5444', '#4a3a30'], pineTrunk: ['#b0623a', '#7a4430'], birchTrunk: ['#e6e2d8', '#9a968e'], pine: ['#1e4234', '#2e5a44', '#53805a'] },
      spring: { leaf: ['#3f7034', '#68a046', '#a6d070'], pine: ['#1f4536', '#32624a', '#5f9060'] },
      summer: { leaf: ['#2f5a2e', '#4a7e3a', '#80b058'] },
      autumn: { leaf: ['#8a5524', '#c08032', '#e8b450'], pine: ['#21432f', '#33603f', '#6a8a4e'] },
      winter: { leaf: ['#6a5c66', '#857682', '#a8a0a6'], pine: ['#1d3a33', '#2a5044', '#4e7464'] },
    },
    parts: ['body'],
    shadow: { rx: 40, ry: 6, h: 200 },
    reflect: true,
    tags: ['uk', 'woodland', 'distant', 'far-shore'].concat(tags, ['kit:temperate', 'role:tree']),
    credit: 'drawn for the Wyndham\'s Pool scenes after the far woods of the old view art (K.woods)',
    build(v, r) {
      const kind = kindOf, alt = v % 2;
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
        body.push(['@leaf.0', massI(r, cx + 3, cy + 6, rx, ry, 8)], ['@leaf.1', massI(r, cx, cy, rx * 0.9, ry * 0.9, 8)], ['@leaf.2', massI(r, cx - rx * 0.3, cy - ry * 0.3, rx * 0.42, ry * 0.42, 6), 0.9]);
        body.push(['@leaf.1', massI(r, cx + rx * 0.5, cy + ry * 0.5, rx * 0.4, ry * 0.32, 6), 0.95]);
      } else {
        const h = alt ? 170 : 196, w = alt ? 70 : 84;
        body.push(['@trunk.0', `M-5 0L-3 ${f1(-h * 0.42)}L3 ${f1(-h * 0.42)}L5 0z`], { s: '@trunk.0', w: 2.6, cap: 'round', d: `M0 ${f1(-h * 0.36)}l-14 -22M0 ${f1(-h * 0.4)}l12 -26` });
        const cy = -h * 0.66;
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
      base: { bark: ['#ece9e2', '#b9b4aa', '#2e2a28'], twig: ['#5a4038', '#7a5a50'], haze: '#7c5e66' },
      spring: { leaf: ['#4f8a30', '#79b044', '#a8d260', '#d2ec8a'] },
      summer: { leaf: ['#33622a', '#4f8236', '#7caa4c', '#a8cc66'] },
      autumn: { leaf: ['#a8701c', '#d29a26', '#eec444', '#f8e07a'] },
      winter: { leaf: ['#6a5058', '#7c5e66', '#947880', '#b09aa0'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -200], deg: 1.8 } },
    shadow: { rx: 50, ry: 8, h: 420 },
    reflect: true,
    tags: ['uk', 'heath', 'pond', 'woodland', 'deciduous', 'birch', 'silver-birch', 'kit:water', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the Wyndham\'s Pool scenes after the birches of the old view art (K.tree("birch"))',
    build(v, r, ctx) {
      const H = [440, 370, 290][v], lean = [10, -14, 6][v], W0 = [7, 6.2, 5][v], bare = ctx && ctx.season === 'winter';
      const P = (t) => [lean * t * t + Math.sin(t * 4 + v) * 4, -H * 0.97 * t];
      const W = (t) => W0 * (1 - t * 0.8) + 0.8;
      const edge = (t0, t1, side) => { const pts = []; for (let i = 0; i <= 8; i++) { const t = t0 + (t1 - t0) * i / 8, [x, y] = P(t); pts.push([x + side * W(t), y]); } return pts; };
      const poly = (a, b) => 'M' + a.concat(b.reverse()).map(([x, y]) => f1(x) + ' ' + f1(y)).join('L') + 'z';
      const trunk = [];
      // the white trunk, its shaded right side, the dark rough foot, the black dashes and diamonds
      trunk.push(['@bark.0', poly(edge(0, 1, -1), edge(0, 1, 1))], ['@bark.1', poly(edge(0, 1, 0.3), edge(0, 1, 1)), 0.9]);
      const fl = edge(0, 0.13, -1), fr = edge(0, 0.13, 1).reverse();
      fl[fl.length - 1][1] -= rr(r, 0, 14); fr[0][1] -= rr(r, 4, 18);
      trunk.push(['@bark.2', 'M' + fl.concat(fr).map(([x, y]) => f1(x) + ' ' + f1(y)).join('L') + 'z']);
      let marks = '';
      for (let i = 0; i < 18; i++) { const t = rr(r, 0.1, 0.9), [x, y] = P(t), w = W(t); marks += `M${f1(x - w * rr(r, 0.3, 1))} ${f1(y)}l${f1(w * rr(r, 0.6, 1.4))} ${f1(rr(r, -1.5, 1.5))}`; }
      trunk.push({ s: '@bark.2', w: 1.5, cap: 'round', op: 0.85, d: marks });
      let dia = '';
      for (let i = 0; i < 4; i++) { const t = rr(r, 0.25, 0.7), [x, y] = P(t); dia += `M${f1(x - 2)} ${f1(y)}l2 -4l2 4l-2 4z`; }
      trunk.push(['@bark.2', dia, 0.9]);
      // the limbs: up-curving from the upper trunk, the ends of the crown
      const crown = [], ends = [];
      let limbs = '';
      const n = [8, 7, 6][v];
      for (let i = 0; i < n; i++) {
        const t = 0.36 + 0.58 * i / (n - 1), side = i % 2 ? 1 : -1, [x, y] = P(t), len = H * (0.18 + 0.12 * Math.sin(Math.PI * (1 - t) * 1.2)) * rr(r, 0.8, 1.1);
        const ex = x + side * len * 0.8, ey = y - len * 0.42;
        limbs += limb(x, y, ex, ey, side * 0.16);
        ends.push([ex, ey, side, len]);
      }
      const [tx, ty] = P(1);
      ends.push([tx, ty - 6, 0, H * 0.12]);
      crown.push({ s: '@twig.0', w: bare ? 1.8 : 2.2, cap: 'round', d: limbs });
      if (bare) {
        // winter: the purple-brown haze of the twigs, then the fine twigs themselves
        for (const [ex, ey, , len] of ends) crown.push(['@haze', mass(r, ex, ey + len * 0.1, len * 0.42, len * 0.5, 7), 0.32]);
        crown.push({ s: '@twig.1', w: 0.8, cap: 'round', op: 0.8, d: twigs(r, ends, n * 7, H * 0.09) });
        crown.push({ s: '@twig.0', w: 0.6, cap: 'round', op: 0.6, d: twigs(r, ends, n * 6, H * 0.06), detail: true });
        return { trunk, crown };
      }
      // the leafy crown: loose clumps round the limb ends, hanging curtains of fine shoots (the birch's droop)
      const cl = [];
      for (const [ex, ey, side, len] of ends) {
        // a weeping curtain hanging from the limb's end, and a smaller one nearer the trunk
        const rx = len * rr(r, 0.17, 0.22) + 5;
        cl.push([ex + side * rx * 0.2, ey + rx * 1.1, rx, rx * rr(r, 1.5, 1.8)]);
        if (len > H * 0.16) cl.push([ex - side * len * 0.4, ey + len * 0.36, rx * 0.72, rx * 1.15]);
      }
      for (const t of [0.62, 0.8]) { const [x, y] = P(t), rx = H * 0.05 * rr(r, 0.8, 1.1); cl.push([x + rr(r, -6, 6), y, rx, rx * 1.4]); }
      cl.sort((a, b) => a[1] - b[1]);
      let hang = '';
      for (const [cx, cy, rx, ry] of cl) {
        clump(r, crown, cx, cy, rx, ry, 'leaf', Math.round(rx / 3));
        for (let i = 0; i < 3; i++) { const x = cx - rx * 0.6 + r() * rx * 1.2, y = cy + ry * 0.5; hang += `M${f1(x)} ${f1(y)}q${f1(rr(r, -3, 3))} ${f1(rr(r, 8, 14))} ${f1(rr(r, -2, 4))} ${f1(rr(r, 16, 26))}`; }
      }
      crown.push({ s: '@leaf.1', w: 2.2, cap: 'round', op: 0.85, d: hang, detail: true });
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
      base: { bark: ['#5a4a3a', '#3e3228', '#7a6852'], twig: ['#4a3a32', '#6a5248'], haze: '#6e5a5e' },
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
        for (const [ex, ey, , len] of ends) crown.push(['@haze', mass(r, ex, ey, len * 0.4, len * 0.34, 7), 0.34]);
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
