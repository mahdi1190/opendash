/* ============================================================
   SCENE LIBRARY: heathland trees (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only; built lazily, once per (variant, season).
   Scaffolded with `node tools/anim-pack.mjs object new tree.pine-veteran
   --kits temperate --role tree`, then drawn here.

   tree.pine-veteran: the lone, old Scots pine of the Thames Basin heaths
   (Yateley, Hawley and Bramshill commons): a long, crooked trunk, orange-red
   "fox" bark in the upper half, and a few broad, flat-topped plates of needles
   on bent limbs, with one dead snag (the nightjar's song post at dusk). It is
   the SIGNATURE of an open-heath scene (tag `signature`, section 15.2): the
   tree you recognise the heath by. Parts: 'trunk' (still) and 'crown' (sways
   about the top of the trunk). Winter: frost on the plate tops. The sun is on
   the LEFT (lit rims upper left), as in the rest of the library.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const R = Math.round, f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  /** A flat-topped needle plate: a lobed mass wider than tall, centred at (cx, cy). */
  const plate = (r, cx, cy, w, h) => sceneD.lobed(r, cx, cy, w, h, 13, 0.22);
  const tufts = (r, cx, cy, w, h, n) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const t = (i + rr(r, -0.3, 0.3)) / n, x = cx - w + t * 2 * w, y = cy - Math.sqrt(Math.max(0, 1 - ((x - cx) / w) ** 2)) * h * 0.95 + rr(r, -2, 3);
      d += `M${f1(x)} ${f1(y)}l${f1(rr(r, -7, -2))} ${f1(rr(r, -9, -4))}M${f1(x)} ${f1(y)}l${f1(rr(r, -1, 1))} ${f1(rr(r, -10, -6))}M${f1(x)} ${f1(y)}l${f1(rr(r, 2, 7))} ${f1(rr(r, -9, -4))}`;
    }
    return d;
  };
  const build = (v, r, season) => {
    const winter = season === 'winter', spring = season === 'spring';
    const H = v ? 420 : 455, lean = v ? -26 : 18, tw = v ? 26 : 30;
    const xAt = t => lean * t * t + Math.sin(t * 5.2 + v) * 7 * t;   // a crooked trunk
    const trunk = [], crown = [];
    // trunk: tapered, crooked; grey-brown plated bark below, fox-red above
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([xAt(t), -H * t, tw * (1 - t * 0.68)]); }
    const left = pts.map(([x, y, w]) => `${R(x - w / 2)} ${R(y)}`), right = pts.slice().reverse().map(([x, y, w]) => `${R(x + w / 2)} ${R(y)}`);
    trunk.push(['@bark.0', `M${R(-tw * 1.05)} 4Q${R(-tw * 0.6)} -6 ${left[1]}L${left.slice(2).join('L')}L${right.slice(0, -2).join('L')}Q${R(tw * 0.6)} -6 ${R(tw * 1.1)} 4z`]);
    trunk.push({ s: '@bark.1', w: f1(tw * 0.32), op: 0.55, d: 'M' + pts.map(([x, y, w]) => `${R(x + w * 0.22)} ${R(y)}`).join('L') });
    // the fox-red upper bark, lit on the left
    trunk.push({ s: '@fox.0', w: f1(tw * 0.5), d: 'M' + pts.slice(4).map(([x, y, w]) => `${R(x - w * 0.05)} ${R(y)}`).join('L') });
    trunk.push({ s: '@fox.1', w: f1(tw * 0.16), op: 0.8, detail: true, d: 'M' + pts.slice(4).map(([x, y, w]) => `${R(x - w * 0.28)} ${R(y)}`).join('L') });
    // plated bark marks low down
    let marks = '';
    for (let i = 0; i < 22; i++) { const t = rr(r, 0.03, 0.5), x = xAt(t) + rr(r, -0.35, 0.35) * tw * (1 - t * 0.6); marks += `M${R(x)} ${R(-H * t)}l${R(rr(r, -3, 3))} ${-R(rr(r, 6, 15))}`; }
    trunk.push({ s: '@mark', w: 2, d: marks, detail: true });
    // the limbs: bent, rising then levelling out under each plate
    const plates = [];
    const n = v ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const top = i === 0, t = top ? 1 : rr(r, 0.56, 0.9), side = top ? (v ? 1 : -1) * 0.3 : (i % 2 ? 1 : -1);
      const x0 = xAt(t), y0 = -H * t, reach = top ? side * rr(r, 10, 40) : side * rr(r, 90, 170) * (1.2 - t * 0.35);
      const mx = x0 + reach, my = y0 - (top ? rr(r, 40, 60) : rr(r, 14, 40));
      trunk.push({ s: '@bark.0', w: f1(Math.max(4, tw * 0.42 * (1.2 - t * 0.5))), d: `M${R(x0)} ${R(y0)}Q${R(x0 + reach * 0.35)} ${R(my + rr(r, 8, 24))} ${R(mx)} ${R(my)}` });
      plates.push([mx, my, (top ? rr(r, 120, 150) : rr(r, 95, 135)) * (v ? 0.95 : 1), top ? rr(r, 38, 48) : rr(r, 28, 38)]);
      // a second, smaller plate along the same limb
      if (!top && r() < 0.75) plates.push([x0 + reach * 0.5, my + rr(r, 8, 20), rr(r, 60, 84), rr(r, 18, 26)]);
    }
    // the dead snag: a bare, silvered branch sticking out of the crown (a perch)
    const st = 0.8, sx = xAt(st), sy = -H * st, sd = v ? 1 : -1;
    trunk.push({ s: '@snag', w: 5, d: `M${R(sx)} ${R(sy)}q${R(sd * 40)} -18 ${R(sd * 96)} -14m${R(-sd * 40)} 3l${R(sd * 10)} -22` });
    plates.sort((a, b) => a[1] - b[1]);
    // the crown: per plate a dark underside, the mass, a lit top, needle tufts (and frost in winter)
    const under = [], mass = [], lit = [], tuft = [], frost = [];
    for (const [cx, cy, w, h] of plates) {
      under.push(sceneD.ell(cx + 4, cy + h * 0.5, w * 0.92, h * 0.42));
      mass.push(plate(r, cx, cy, w, h));
      lit.push(plate(r, cx - w * 0.16, cy - h * 0.42, w * 0.62, h * 0.38));
      tuft.push(tufts(r, cx, cy - h * 0.2, w * 0.92, h, Math.round(w / 7)));
      if (winter) frost.push(plate(r, cx - w * 0.08, cy - h * 0.62, w * 0.7, h * 0.16));
    }
    crown.push({ f: '@leaf.0', d: under.join(''), detail: true });   // the shadowed undersides: full size only
    crown.push(['@leaf.1', mass.join('')]);
    crown.push(['@leaf.3', lit.join(''), 0.9]);
    crown.push({ s: '@leaf.2', w: 1.8, d: tuft.join(''), detail: true });
    crown.push({ s: '@leaf.4', w: 1.3, d: tufts(r, plates[0][0] - 10, plates[0][1] - plates[0][3] * 0.5, plates[0][2] * 0.6, plates[0][3] * 0.6, 12), op: 0.8, detail: true });
    if (spring) { let c = ''; for (const [cx, cy, w, h] of plates) for (let i = 0; i < 5; i++) c += `M${R(cx + rr(r, -0.8, 0.8) * w)} ${R(cy - h * rr(r, 0.4, 0.8))}l${R(rr(r, -1, 1))} -7`; crown.push({ s: '@shoot', w: 2.4, d: c }); }   // pale new "candles"
    if (winter) crown.push(['@frost', frost.join(''), 0.85]);
    return { trunk, crown };
  };
  sceneObjDefine({
    id: 'tree.pine-veteran',
    category: 'tree',
    size: [520, 540],
    variants: 2,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { bark: ['#6e5a4a', '#3e3028', '#9a8470'], fox: ['#b8643c', '#e09a68'], mark: '#3a2c24', snag: '#b8b0a2', frost: '#f2f6f8', shoot: '#c8d890' },
      spring: { leaf: ['#16352a', '#2c5a42', '#4a7a52', '#6e9a62', '#a6c47e'] },
      summer: { leaf: ['#14301f', '#284f38', '#3f6c48', '#62905a', '#8fb070'] },
      autumn: { leaf: ['#1c3426', '#30563e', '#4c6a44', '#6e8a54', '#a09a5a'] },
      winter: { leaf: ['#1a2c2a', '#2a4440', '#3f5e54', '#5a7a6a', '#90a49a'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -360], deg: 1.1 } },
    shadow: { rx: 110, ry: 14, h: 500 },
    reflect: true,
    tags: ['uk', 'heath', 'evergreen', 'conifer', 'scots-pine', 'veteran', 'signature', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the composed Yateley Common views (the lone heathland Scots pine)',
    build(v, rnd, ctx) { return build(v, rnd, (ctx && ctx.season) || 'summer'); },
  });

  /* ---------- tree.birch-heath: the light silver birch of the open heath ----------
     The spreading young silver birches that colonise Yateley Common (cut back by the rangers to keep the heath
     open): one to three slender white stems with black diamond marks and a dark, rough foot, rising into a
     narrow, airy crown of small leaf clusters with drooping tips. A few hundred path points (a fraction of the
     starter tree.birch), so a heath view can hold a dozen of them and its SVG still stays small. v0 a single stem,
     v1 a twin stem, v2 a three-stemmed clump. Spring: fresh lime leaves and purple-brown catkins; summer green;
     autumn butter-yellow; winter bare (a purple-brown haze of fine twigs). Parts: 'trunk' (still) and 'crown'
     (sways about the upper stem). The sun is on the LEFT (lit rims upper left). */
  const birch = (v, r, season) => {
    const winter = season === 'winter', spring = season === 'spring';
    const stems = [[0, 1, 0], [-10, 0.92, -0.08, 12, 0.78, 0.1], [-16, 0.86, -0.12, 4, 1, 0.02, 20, 0.7, 0.16]][v];
    const H = 380, trunk = [], crown = [], marks = [], tops = [];
    let white = '', shade = '', foot = '', twigs = '';
    for (let i = 0; i < stems.length; i += 3) {
      const x0 = stems[i], h = H * stems[i + 1], lean = stems[i + 2], w = 9 - i * 0.6;
      const xt = x0 + lean * h, xm = x0 + lean * h * 0.5 + rr(r, -6, 6);
      white += `M${f1(x0 - w)} 2Q${f1(xm - w * 0.6)} ${R(-h * 0.5)} ${f1(xt - 1.4)} ${R(-h)}L${f1(xt + 1.4)} ${R(-h)}Q${f1(xm + w * 0.6)} ${R(-h * 0.5)} ${f1(x0 + w)} 2z`;
      shade += `M${f1(x0 + w * 0.2)} 2Q${f1(xm + w * 0.2)} ${R(-h * 0.5)} ${f1(xt + 0.4)} ${R(-h * 0.98)}L${f1(xt + 1.4)} ${R(-h)}Q${f1(xm + w * 0.6)} ${R(-h * 0.5)} ${f1(x0 + w)} 2z`;
      foot += `M${f1(x0 - w - 2)} 3Q${f1(x0 - w * 0.4)} ${R(-h * 0.08)} ${f1(x0 + rr(r, -2, 2))} ${R(-h * 0.13)}Q${f1(x0 + w * 0.5)} ${R(-h * 0.07)} ${f1(x0 + w + 2)} 3z`;
      for (let k = 0; k < 9; k++) {   // the black diamond marks up the stem
        const t = rr(r, 0.12, 0.85), x = x0 + (xt - x0) * t + rr(r, -0.5, 0.5) * w * (1 - t), y = -h * t, mw = rr(r, 2.5, 5) * (1 - t * 0.5);
        marks.push(`M${f1(x - mw)} ${R(y)}l${f1(mw)} ${f1(-1.6)} ${f1(mw)} ${f1(1.6)}l${f1(-mw)} ${f1(1.4)}z`);
      }
      // branches: a few up-swept limbs from the upper stem; drooping twigs off their ends
      for (let k = 0; k < 4; k++) {
        const t = 0.5 + k * 0.12 + rr(r, -0.04, 0.04), side = (k + i) % 2 ? 1 : -1, bx = x0 + (xt - x0) * t, by = -h * t;
        const ex = bx + side * rr(r, 40, 80) * (1.1 - t * 0.5), ey = by - rr(r, 30, 60);
        twigs += `M${f1(bx)} ${R(by)}Q${f1(bx + (ex - bx) * 0.4)} ${R(ey + 10)} ${f1(ex)} ${R(ey)}`;
        tops.push([ex, ey + rr(r, 0, 26), rr(r, 26, 40)]);
      }
      tops.push([xt, -h + 18, rr(r, 30, 42)]);
    }
    trunk.push(['@bark.0', white], ['@bark.1', shade, 0.7], ['@foot', foot], { f: '@mark', d: marks.join(''), detail: true });
    trunk.push({ s: '@twig', w: 2.4, d: twigs });
    if (winter) {
      // bare: fine twig sprays drooping from every limb end, and the purple-brown haze of the crown
      let fine = '';
      for (const [cx, cy, rad] of tops) for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + rr(r, -1.3, 1.3), L = rad * rr(r, 0.7, 1.2); fine += `M${f1(cx)} ${f1(cy)}q${f1(Math.cos(a) * L * 0.6)} ${f1(Math.sin(a) * L * 0.6)} ${f1(Math.cos(a) * L)} ${f1(Math.sin(a) * L * 0.4 + L * 0.3)}`; }
      crown.push(['@haze', tops.map(([cx, cy, rad]) => sceneD.ell(cx, cy, rad * 0.85, rad * 0.7)).join(''), 0.22]);
      crown.push({ s: '@twig', w: 1.2, d: fine });
      return { trunk, crown };
    }
    // leafy: per limb end a cluster (dark under, the mass, a lit top), and drooping leaf tips (detail)
    const under = [], mass = [], lit = [];
    let tips = '';
    for (const [cx, cy, rad] of tops) {
      under.push(sceneD.lobed(r, f1(cx + 4), f1(cy + rad * 0.3), R(rad * 0.95), R(rad * 0.7), 7, 0.3));
      mass.push(sceneD.lobed(r, f1(cx), f1(cy), R(rad), R(rad * 0.8), 9, 0.42));
      lit.push(sceneD.lobed(r, f1(cx - rad * 0.25), f1(cy - rad * 0.3), R(rad * 0.55), R(rad * 0.42), 6, 0.3));
      for (let k = 0; k < 5; k++) { const x = cx + rr(r, -1, 1) * rad, y = cy + rr(r, 0.1, 0.7) * rad; tips += `M${f1(x)} ${f1(y)}q${f1(rr(r, -3, 3))} 8 ${f1(rr(r, -2, 2))} ${f1(rr(r, 12, 20))}`; }
    }
    // at full size, smaller ragged clusters round each mass break the outline into leaves (detail: not in a small still)
    const fringe = [];
    for (const [cx, cy, rad] of tops) for (let k = 0; k < 4; k++) { const a = rr(r, 0, Math.PI * 2); fringe.push(sceneD.lobed(r, f1(cx + Math.cos(a) * rad * 0.9), f1(cy + Math.sin(a) * rad * 0.7 + 4), R(rad * 0.36), R(rad * 0.3), 7, 0.45)); }
    crown.push({ f: '@leaf.0', d: under.join(''), detail: true }, { f: '@leaf.1', d: fringe.join(''), detail: true }, ['@leaf.1', mass.join('')], ['@leaf.2', lit.join(''), 0.9]);
    crown.push({ s: '@leaf.1', w: 3, d: tips, detail: true });
    if (spring) { let c = ''; for (const [cx, cy, rad] of tops) for (let k = 0; k < 4; k++) c += `M${f1(cx + rr(r, -0.9, 0.9) * rad)} ${f1(cy + rr(r, 0, 0.8) * rad)}v7`; crown.push({ s: '@catkin', w: 2.2, d: c }); }
    return { trunk, crown };
  };
  sceneObjDefine({
    id: 'tree.birch-heath',
    category: 'tree',
    size: [240, 440],
    variants: 3,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { bark: ['#f1eee6', '#b9b4aa'], foot: '#3a3430', mark: '#2a2624', twig: '#5a4a46', haze: '#7a5e66', catkin: '#7a5462' },
      spring: { leaf: ['#4e7a34', '#7aa848', '#b2d27a'] },
      summer: { leaf: ['#3a6230', '#58843e', '#8ab25a'] },
      autumn: { leaf: ['#a8801e', '#d6ac2e', '#f2d462'] },
      winter: { leaf: ['#5a4a46', '#6a5a56', '#7a6a66'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -230], deg: 2.2 } },
    shadow: { rx: 60, ry: 9, h: 400 },
    reflect: true,
    tags: ['uk', 'heath', 'deciduous', 'birch', 'silver-birch', 'slender', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the composed Yateley Common views (the young silver birches of the heath)',
    build(v, rnd, ctx) { return birch(v, rnd, (ctx && ctx.season) || 'summer'); },
  });

  /* ---------- tree.woods-edge: a stretch of distant woodland edge for the horizon and far layers ----------
     A belt about 360 units wide of overlapping small trees in simple silhouette (Scots pines with flat plates,
     silver birches with narrow crowns and white stems, round oaks) over a dark under-storey, so a far tree line
     reads as woods, not a row of separate trees, and costs a few dozen shapes (it is placed many times, small and
     hazed). v0 pine-heavy (the heath's pine belts), v1 birch-heavy, v2 mixed with oaks. Winter: the birches and
     oaks are bare (a purple-grey haze of twigs), the pines stay green. Static (no hooks): far trees do not sway. */
  const woods = (v, r, season) => {
    const winter = season === 'winter';
    const mixes = [{ pine: 0.6, birch: 0.3, oak: 0.1 }, { pine: 0.25, birch: 0.6, oak: 0.15 }, { pine: 0.35, birch: 0.25, oak: 0.4 }][v];
    const W = 180, under = [], stems = [], white = [], pine = ['', ''], birch = ['', ''], oak = ['', ''], bare = [];
    // the under-storey: a low dark mass along the whole belt
    let d = `M${-W - 10} 2`;   // tapered at both ends, so belts placed side by side do not read as blocks
    for (let x = -W - 10; x <= W + 10; x += 14) { const e = Math.min(1, (W + 10 - Math.abs(x)) / 60); d += `L${x} ${R(-rr(r, 26, 44) * (0.25 + 0.75 * e))}`; }
    under.push(d + `L${W + 10} 2z`);
    const n = 16 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const x = -W + (i + rr(r, 0.1, 0.9)) * (2 * W / n), k = r(), kind = k < mixes.pine ? 'pine' : k < mixes.pine + mixes.birch ? 'birch' : 'oak';
      const h = kind === 'pine' ? rr(r, 80, 120) : kind === 'birch' ? rr(r, 70, 105) : rr(r, 60, 90), lit = r() < 0.5 ? 1 : 0;
      if (kind === 'pine') {
        stems.push(`M${f1(x - 2)} 0L${f1(x - 1)} ${R(-h)}h2L${f1(x + 2)} 0z`);
        for (let j = 0; j < 3; j++) { const py = -h * (1 - j * 0.18) + 6, pw = rr(r, 14, 26) * (j ? 0.85 : 1); pine[j === 0 ? 1 : 0] += sceneD.lobed(r, f1(x + rr(r, -9, 9)), R(py), R(pw), R(rr(r, 6, 10)), 7, 0.2); }
      } else if (kind === 'birch') {
        white.push(`M${f1(x - 1.4)} 0L${f1(x - 0.6)} ${R(-h * (0.4 + (i * 7 % 5) * 0.05))}h1.2L${f1(x + 1.4)} 0z`);   // the white stems show below the crowns only
        if (winter) bare.push(sceneD.ell(f1(x), R(-h * 0.62), R(h * 0.17), R(h * 0.34)));
        else birch[lit] += sceneD.lobed(r, f1(x), R(-h * 0.62), R(h * 0.17), R(h * 0.34), 8, 0.22);
      } else {
        stems.push(`M${f1(x - 3)} 0L${f1(x - 2)} ${R(-h * 0.45)}h4L${f1(x + 3)} 0z`);
        if (winter) bare.push(sceneD.ell(f1(x), R(-h * 0.66), R(h * 0.4), R(h * 0.32)));
        else oak[lit] += sceneD.lobed(r, f1(x), R(-h * 0.66), R(h * 0.42), R(h * 0.34), 9, 0.3);
      }
    }
    // the lit halves and the white stems are detail: a small still (a tile) draws the belt as its dark masses only
    const body = [['@under', under.join('')], { f: '@stem', d: stems.join(''), detail: true }, { f: '@white', d: white.join(''), op: 0.7, detail: true }];
    if (winter) body.push(['@twig', bare.join(''), 0.45]);
    body.push(['@oak.0', oak[0]], { f: '@oak.1', d: oak[1], detail: true }, ['@birch.0', birch[0]], { f: '@birch.1', d: birch[1], detail: true }, ['@pine.0', pine[0]], { f: '@pine.1', d: pine[1], detail: true });
    return { body: body.filter(sh => (Array.isArray(sh) ? sh[1] : sh.d)) };
  };
  sceneObjDefine({
    id: 'tree.woods-edge',
    category: 'tree',
    size: [380, 130],
    variants: 3,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { under: '#2c3a2c', stem: '#4a3a30', white: '#e8e4da', twig: '#6a5a66', pine: ['#24443a', '#3a6050'] },
      spring: { oak: ['#5a8a3a', '#86b04a'], birch: ['#6a9a40', '#9cc860'] },
      summer: { oak: ['#3a6232', '#567e3e'], birch: ['#4e7e3a', '#76a44a'] },
      autumn: { oak: ['#8a5a26', '#b07a30'], birch: ['#b08a2a', '#d8b040'], under: '#3a3a2a' },
      winter: { oak: ['#5a4a44', '#6a5a52'], birch: ['#6a5a5e', '#7a6a6e'], under: '#2e3430' },
    },
    parts: ['body'],
    tags: ['uk', 'heath', 'woodland', 'treeline', 'distant', 'kit:temperate', 'role:tree'],
    credit: "drawn for the composed Yateley Common views, after the nature kit's K.woods",
    build(v, rnd, ctx) { return woods(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();
