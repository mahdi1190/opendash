/* ============================================================
   SCENE LIBRARY: the Yateley Common views (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only; built lazily, once per (variant, season).
   Drawn for the composed Yateley Common views (71-scene-uk-south-east-yateley-common-1..4.js),
   so the open heath reads as a DENSE carpet with a frame, not a brown floor dotted with sprigs.

     ground.yc-heath-drift  a wide drift of heath (about 320 x 60): overlapping heather cushions,
                            v0 ling, v1 ling with bell heather (darker, more purple), v2 grass heath
                            (purple moor-grass tussocks: straw-gold in autumn and winter), v3 heather
                            with dwarf gorse (yellow, July to October). Laid in clustered, noise-masked
                            drifts in the mid, near and fore layers, they cover the ground; the cushion
                            sprites (plant.heather) sit on top as texture. Anchor: the foot, centre.
     tree.yc-birch-bough    silver birch twigs hanging into the frame from the top-left (flip it for
                            the top-right): a silvered limb, purple-brown pendulous twigs, small
                            diamond leaves (lime in spring, green, butter-yellow in autumn, bare with
                            catkins in winter). Anchor: where it leaves the frame.
     plant.yc-gorse-spray   a close-up gorse spray for the foreground corner: spiny green shoots,
                            pea flowers (thick in spring, scattered in autumn and winter), a dead
                            silvered stem (a perch). Anchor: the foot, centre.
   The sun is on the LEFT (lit rims upper left), as in the rest of the library.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const by = (o) => {   // { slot: { spring, summer, autumn, winter } } -> { spring: { slot }, ... }
    const out = {};
    for (const slot in o) for (const se in o[slot]) (out[se] || (out[se] = {}))[slot] = o[slot][se];
    return out;
  };

  /* ---------- ground.yc-heath-drift ---------- */
  const driftPal = by({
    // the ground showing between the cushions, the cushions dark, mid, lit
    heath: {
      spring: ['#2c3424', '#3e4a2e', '#55643a', '#74844c'],
      summer: ['#2c3022', '#40482c', '#566238', '#727e48'],
      autumn: ['#30261e', '#4c3a2c', '#664e3a', '#84664a'],
      winter: ['#2a2622', '#3e3630', '#54483e', '#6c5e50'],
    },
    // the flower (or seed-head) tones: ling, bell heather
    bloom: {
      spring: ['#7a8a4a', '#94a45a', '#5e6e3a'],
      summer: ['#9a5a96', '#b878b0', '#8a3a7a'],
      autumn: ['#8a5a4e', '#a27466', '#7a4652'],
      winter: ['#5e4a44', '#74605a', '#4e3c3a'],
    },
    // purple moor-grass: the tussock, its blades, the lit blades
    grass: {
      spring: ['#4a5a34', '#6a7c44', '#8a9c5a'],
      summer: ['#4e6236', '#6e8448', '#94a862'],
      autumn: ['#8a6a3a', '#b08a4a', '#d4b070'],
      winter: ['#7a6448', '#9a8260', '#bca47e'],
    },
    // dwarf gorse: its green and flowers (Jul to Oct; only a few in spring and winter)
    gorse: {
      spring: ['#2e4a2c', '#46663a', '#e8c030'],
      summer: ['#2c4628', '#44623a', '#f0c428'],
      autumn: ['#2c4228', '#425e38', '#f0c02a'],
      winter: ['#2a3c2c', '#3e563c', '#d8b440'],
    },
  });
  const driftFlowers = { spring: 0.25, summer: 1, autumn: 0.55, winter: 0.2 };
  const gorseFlowers = { spring: 0.3, summer: 0.8, autumn: 1, winter: 0.15 };
  sceneObjDefine({
    id: 'ground.yc-heath-drift',
    category: 'ground',
    size: [320, 64],
    detailPx: 40,
    variants: 4,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: Object.assign({ base: { glint: '#f4f0e0' } }, driftPal),
    parts: ['body'],
    shadow: false,
    reflect: true,
    tags: ['uk', 'heath', 'heather', 'ling', 'bell-heather', 'molinia', 'dwarf-gorse', 'ground-cover', 'drift', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the composed Yateley Common views (a drift of lowland heath)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [];
      const W = 150, grassy = v === 2, dwarf = v === 3;
      // the cushions along the drift: centre, half width, height; taller in the middle, lower at the ends
      const cush = [];
      let x = -W;
      while (x < W) {
        const w = rr(r, 18, 34), cx = x + w, end = 1 - Math.abs(cx / W) ** 2;
        cush.push([cx, w, (grassy ? rr(r, 22, 36) : rr(r, 18, 32)) * (0.4 + 0.6 * end)]);
        x += w * rr(r, 1.2, 1.6);
      }
      // the silhouette: the highest cushion top at each x
      const top = (xx) => { let h = 0; for (const [cx, w, ch] of cush) { const t = (xx - cx) / w; if (t > -1 && t < 1) h = Math.max(h, ch * Math.sqrt(1 - t * t)); } return h; };
      let sil = `M${-W - 6} 2`;
      for (let xx = -W - 4; xx <= W + 4; xx += 10) sil += `L${xx} ${f1(-top(xx) + (r() - 0.5) * 2.4)}`;
      sil += `L${W + 6} 2Z`;
      body.push(['@heath.0', sil]);
      // the cushion masses (mid tone) and their lit upper-left caps
      let mid = '', lit = '', mid2 = '';
      cush.forEach(([cx, w, h], i) => {
        const m = sceneD.lobed(r, cx + 2, -h * 0.55, w * 0.9, h * 0.42, 7, 0.18);
        if (i % 3 === 1) mid2 += m; else mid += m;
        lit += sceneD.lobed(r, cx - w * 0.22, -h * 0.72, w * 0.5, h * 0.24, 5, 0.2);
      });
      if (grassy) {
        body.push(['@grass.0', mid, 0.9]);
        // tussock blades: fans of arching strokes from each cushion's crown
        let b0 = '', b1 = '', b2 = '';
        for (const [cx, w, h] of cush) {
          const n = Math.round(w * 0.42);
          for (let j = 0; j < n; j++) {
            const sx = cx + rr(r, -0.6, 0.6) * w, sy = -h * rr(r, 0.2, 0.6), a = rr(r, -1.1, 1.1), L = h * rr(r, 0.7, 1.5);
            const ex = sx + Math.sin(a) * L, ey = sy - Math.cos(a) * L * 0.8;
            const d = `M${f1(sx)} ${f1(sy)}Q${f1(sx + Math.sin(a) * L * 0.4)} ${f1(sy - L * 0.7)} ${f1(ex)} ${f1(ey + L * 0.25)}`;
            if (j % 3 === 0) b2 += d; else if (j % 2) b1 += d; else b0 += d;
          }
        }
        body.push({ s: '@grass.0', w: 1.6, d: b0 });
        body.push({ s: '@grass.1', w: 1.5, d: b1 });
        body.push({ s: '@grass.2', w: 1.3, d: b2, op: 0.9 });
        // a few heather cushions among the grass
        body.push(['@heath.2', mid2, 0.9]);
      } else {
        body.push(['@heath.1', mid]);
        body.push([dwarf ? '@gorse.0' : '@heath.2', mid2]);
        body.push(['@heath.3', lit, 0.7]);
        // the shoots: short upright strokes all over the cushions (the ling's texture)
        let st = '';
        for (const [cx, w, h] of cush) for (let j = 0; j < Math.round(w * 0.3); j++) {
          const sx = cx + rr(r, -0.9, 0.9) * w, t = (sx - cx) / w, sy = -h * Math.sqrt(Math.max(0, 1 - t * t)) * rr(r, 0.55, 1.02), L = rr(r, 3, 7);
          st += `M${f1(sx)} ${f1(sy)}l${f1(rr(r, -1.5, 1.5) + t * 2)} ${f1(-L)}`;
        }
        body.push({ s: '@heath.3', w: 1.2, d: st, op: 0.75, detail: true });
        // the flowers: beaded spikes along the tops (purple in summer, rusty in autumn), bell heather darker
        const k = driftFlowers[season] || 0.5;
        let b0 = '', b1 = '', b2 = '';
        for (const [cx, w, h] of cush) {
          const n = Math.round(w * 0.36 * k);
          for (let j = 0; j < n; j++) {
            const sx = cx + rr(r, -0.85, 0.85) * w, t = (sx - cx) / w, sy = -h * Math.sqrt(Math.max(0, 1 - t * t)) * rr(r, 0.7, 1.05), L = rr(r, 3, 6);
            const d = `M${f1(sx)} ${f1(sy)}l${f1(rr(r, -1, 1))} ${f1(-L)}`;
            if (v === 1 && j % 2) b2 += d; else if (j % 2) b1 += d; else b0 += d;
          }
        }
        body.push({ s: '@bloom.0', w: 2.8, cap: 'round', d: b0 });
        body.push({ s: '@bloom.1', w: 2.2, cap: 'round', d: b1 });
        if (b2) body.push({ s: '@bloom.2', w: 2.8, cap: 'round', d: b2 });
        if (dwarf) {
          // dwarf gorse: spiny green stars with yellow flowers
          let sp = '', fl = '';
          const kg = gorseFlowers[season] || 0.5;
          cush.forEach(([cx, w, h], i) => {
            if (i % 3 !== 1) return;
            for (let j = 0; j < 14; j++) { const sx = cx + rr(r, -0.8, 0.8) * w, sy = -h * rr(r, 0.4, 1.05), a = rr(r, -0.9, 0.9); sp += `M${f1(sx)} ${f1(sy)}l${f1(Math.sin(a) * 6)} ${f1(-Math.cos(a) * 6)}`; }
            for (let j = 0; j < Math.round(10 * kg); j++) fl += sceneD.circ(cx + rr(r, -0.75, 0.75) * w, -h * rr(r, 0.5, 1.05), rr(r, 1.4, 2.2));
          });
          body.push({ s: '@gorse.1', w: 1.4, d: sp });
          if (fl) body.push(['@gorse.2', fl]);
        }
      }
      // a few glints of light on the lit tops (detail only)
      let gl = '';
      for (let j = 0; j < 8; j++) { const c = cush[Math.floor(r() * cush.length)]; gl += `M${f1(c[0] - c[1] * rr(r, 0.1, 0.6))} ${f1(-c[2] * rr(r, 0.8, 1))}l${f1(rr(r, 2, 5))} -1`; }
      body.push({ s: '@glint', w: 1, op: 0.18, d: gl, detail: true });
      return { body };
    },
  });

  /* ---------- tree.yc-birch-bough ---------- */
  sceneObjDefine({
    id: 'tree.yc-birch-bough',
    category: 'tree',
    size: [560, 360],
    variants: 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { bark: ['#e8e4dc', '#b8b2a8', '#3a3030', '#5a4440'], twig: ['#4a3434', '#6a4a44'], catkin: ['#7a5a3a', '#9a7a4a'] },
      spring: { leaf: ['#5a8a36', '#7aa844', '#a8cc5a', '#c8e078'] },
      summer: { leaf: ['#2e5426', '#3e6a30', '#5a8a3e', '#7aa650'] },
      autumn: { leaf: ['#a8862a', '#d0a832', '#e8c448', '#f4dc78'] },
      winter: { leaf: ['#4a3434', '#5a4040', '#6a4a44', '#7a5a50'] },
    },
    parts: ['branch', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [0, 0], deg: 1.4 } },
    shadow: false,
    reflect: false,
    tags: ['uk', 'heath', 'birch', 'silver-birch', 'bough', 'framing', 'class:air', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the composed Yateley Common views (a silver birch bough, the foreground frame)',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { branch: [], leaves: [] }, R = f1;
      const limb = (pts, w0, w1, f) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
          const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
          L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
        }
        out.branch.push({ f, d: 'M' + L.concat(Rr.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z' });
      };
      // the limb: silver-white near the frame (black lenticels), going purple-brown as it thins
      const main = [[-30, -8], [40, 4], [110, 24], [180, 50], [250, 80], [320, 104], [400, 124], [480, 136], [540, 140]];
      limb(main.slice(0, 5), 22, 9, '@bark.0');
      limb(main.slice(0, 5).map(([x, y]) => [x + 2, y + 3]), 8, 3, '@bark.1');
      limb(main.slice(4), 9, 2, '@twig.0');
      let marks = '';
      for (let i = 0; i < 14; i++) { const t = rnd() * 0.95, x = -20 + t * 260, y = -4 + t * 80 + rr(rnd, -4, 4); marks += `M${R(x)} ${R(y)}l${R(rr(rnd, 4, 9))} ${R(rr(rnd, 0.5, 2))}`; }
      out.branch.push({ s: '@bark.2', w: 2.2, d: marks, cap: 'round' });
      const sides = [[[110, 24], [160, 40], [210, 30], [250, 20]], [[200, 58], [250, 110], [270, 190], [272, 250]], [[330, 112], [390, 108], [440, 92], [480, 84]], [[420, 128], [450, 180], [460, 240]], [[50, 8], [90, 40], [104, 100]]];
      sides.forEach((s, i) => limb(s, 6 - i * 0.6, 1.5, '@twig.' + (i % 2)));
      // the pendulous twigs: long, fine, hanging; leaves (or catkins) along them
      const anchors = [];
      const along = (pts, n) => { for (let i = 1; i <= n; i++) { const u = i / (n + 1), k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), t = u * (pts.length - 1) - k; anchors.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t]); } };
      along(main.slice(1), 14); sides.forEach(s => along(s, 5));
      let tw = '', tw2 = '', cat = '';
      const nLeaf = season === 'winter' ? 0 : season === 'autumn' ? 7 : 9;
      for (const [ax, ay] of anchors) {
        const L = rr(rnd, 40, 110), tx = ax + rr(rnd, -12, 22), ty = ay + L;
        const d = `M${R(ax)} ${R(ay)}Q${R(ax + (tx - ax) * 0.2 + 8)} ${R(ay + L * 0.2)} ${R(tx)} ${R(ty)}`;
        if (rnd() < 0.5) tw += d; else tw2 += d;
        if ((season === 'winter' || season === 'spring') && rnd() < 0.45) cat += `M${R(tx)} ${R(ty - 2)}q1 7-1 13`;
        for (let j = 0; j < nLeaf; j++) {
          const u = 0.25 + 0.75 * j / nLeaf, lx = ax + (tx - ax) * u + rr(rnd, -5, 5), ly = ay + (ty - ay) * u + rr(rnd, -3, 3);
          const a = Math.PI / 2 + rr(rnd, -1.2, 1.2), len = rr(rnd, 9, 14), tone = Math.floor(rnd() * 4);
          out.leaves.push({ f: '@leaf.' + tone, d: sceneD.leaf(lx, ly, a, len, len * 0.62) });
        }
      }
      out.branch.push({ s: '@twig.0', w: 1.5, d: tw, cap: 'round' });
      out.branch.push({ s: '@twig.1', w: 1.1, d: tw2, cap: 'round' });
      if (cat) out.leaves.push({ s: '@catkin.' + (season === 'spring' ? 1 : 0), w: 3, cap: 'round', d: cat });
      return out;
    },
  });

  /* ---------- plant.yc-gorse-spray ---------- */
  sceneObjDefine({
    id: 'plant.yc-gorse-spray',
    category: 'plant',
    size: [300, 200],
    variants: 2,
    seasonal: true,
    shapeBySeason: false,
    flippable: true,
    palette: Object.assign({ base: { stem: ['#5a4a3a', '#b8b0a2'], shade: '#16261a' } }, by({
      spine: { spring: ['#22401f', '#36582e', '#5a7e44', '#86a45e'], summer: ['#22401f', '#36582e', '#5a7e44', '#86a45e'], autumn: ['#24401f', '#365630', '#567844', '#7e9a5a'], winter: ['#22382a', '#32503a', '#4e6e50', '#7a907a'] },
      flower: { spring: ['#f4c01a', '#ffe060', '#d8960e'], summer: ['#f0bc1a', '#ffdc58', '#d8960e'], autumn: ['#ecb81c', '#f8d450', '#d0900e'], winter: ['#e4b434', '#f2d470', '#c8901a'] },
    })),
    parts: ['body'],
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 1.4 } },
    shadow: false,
    tags: ['uk', 'heath', 'gorse', 'furze', 'spray', 'framing', 'foreground', 'kit:temperate', 'role:shrub'],
    credit: 'drawn for the composed Yateley Common views (a gorse spray close up)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [];
      const flowers = { spring: 1, summer: 0.55, autumn: 0.4, winter: 0.25 }[season];
      // the shoots: arching stems from the foot, each a dense column of spines
      const shoots = [];
      const n = v ? 9 : 11;
      for (let i = 0; i < n; i++) {
        const a = -1.15 + 2.3 * (i + rr(r, 0.1, 0.9)) / n, L = rr(r, 110, 190) * (1 - Math.abs(a) * 0.25);
        shoots.push([a, L]);
      }
      let mass = '', dark = '', sp = ['', '', ''], st = '', fl = ['', '', ''];
      for (const [a, L] of shoots) {
        const ex = Math.sin(a) * L, ey = -Math.cos(a) * L, mx = ex * 0.45 + rr(r, -10, 10), my = ey * 0.6;
        st += `M0 0Q${f1(mx)} ${f1(my)} ${f1(ex)} ${f1(ey)}`;
        // the green mass along the shoot (wider low down)
        for (let k = 0; k < 6; k++) {
          const t = 0.3 + 0.7 * k / 5, px = 2 * (1 - t) * t * mx + t * t * ex, py = 2 * (1 - t) * t * my + t * t * ey, w = 20 * (1.2 - t);
          (k % 2 ? mass : dark) !== null && (k % 2 ? (mass += sceneD.lobed(r, px, py, w, w * 0.8, 7, 0.35)) : (dark += sceneD.lobed(r, px + 3, py + 3, w * 0.9, w * 0.7, 7, 0.35)));
          // spines: short sharp strokes radiating
          for (let j = 0; j < 9; j++) { const b = rr(r, 0, Math.PI * 2), l = rr(r, 6, 13), x0 = px + Math.cos(b) * w * 0.5, y0 = py + Math.sin(b) * w * 0.5; sp[j % 3] += `M${f1(x0)} ${f1(y0)}l${f1(Math.cos(b - 0.5) * l)} ${f1(Math.sin(b - 0.5) * l)}`; }
          // pea flowers near the tips, on the lit (upper) side
          const nf = Math.round((t > 0.5 ? 4 : 1.5) * flowers + r() * flowers);
          for (let j = 0; j < nf; j++) { const fx = px + rr(r, -w, w) * 0.7, fy = py - rr(r, 0, w) * 0.7, s = rr(r, 2.6, 4.2); fl[j % 3] += `M${f1(fx - s)} ${f1(fy)}q${f1(s)} ${f1(-s * 1.6)} ${f1(s * 2)} 0q${f1(-s)} ${f1(s * 0.9)} ${f1(-s * 2)} 0z`; }
        }
      }
      body.push(['@shade', dark, 0.95]);
      body.push({ s: '@stem.0', w: 4, d: st, cap: 'round' });
      body.push(['@spine.1', mass]);
      body.push({ s: '@spine.0', w: 1.8, d: sp[0] });
      body.push({ s: '@spine.2', w: 1.6, d: sp[1] });
      body.push({ s: '@spine.3', w: 1.3, d: sp[2], op: 0.85 });
      // a dead, silvered stem standing clear (the perch)
      body.push({ s: '@stem.1', w: 3.2, cap: 'round', d: v ? 'M-10 -20Q-30 -120 -60 -196M-46 -150l-22 -14' : 'M8 -30Q20 -130 50 -204M38 -150l20 -16' });
      body.push(['@flower.0', fl[0]]);
      body.push(['@flower.1', fl[1]]);
      body.push(['@flower.2', fl[2], 0.9]);
      return { body };
    },
  });

  /* ---------- ground.yc-sphagnum ----------
     A mat of bog moss on the wet heath (the mire by the Common's pools): soft, rounded hummocks of sphagnum in greens,
     ochre and crimson (Sphagnum capillifolium is red on the hummock tops), the moss heads stippled on them, the mat's edge
     feathering into the ground. v0 green lawn, v1 red and ochre hummocks, v2 mixed with a few wet hollows that catch the sky.
     Anchor: the foot, centre. */
  const mossPal = by({
    green: { spring: ['#4e6a2a', '#6a8634', '#8ea84c'], summer: ['#4a6a28', '#668632', '#8aa646'], autumn: ['#5a6a2a', '#768234', '#94a04a'], winter: ['#465230', '#5a643a', '#727c4c'] },
    red: { spring: ['#6a3a2a', '#8a5236', '#a87a48'], summer: ['#743228', '#965034', '#b87a46'], autumn: ['#7c3028', '#a0442e', '#c06a3a'], winter: ['#5c3a30', '#764a3c', '#926a52'] },
  });
  sceneObjDefine({
    id: 'ground.yc-sphagnum',
    category: 'ground',
    size: [260, 46],
    detailPx: 40,
    variants: 3,
    seasonal: true,
    shapeBySeason: false,
    flippable: true,
    palette: Object.assign({ base: { wet: '#9ab4bc', glint: '#f4f0e0' } }, mossPal),
    parts: ['body'],
    shadow: false,
    reflect: true,
    tags: ['uk', 'heath', 'mire', 'bog', 'sphagnum', 'moss', 'ground-cover', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the composed Yateley Common views (bog moss on the wet heath)',
    build(v, r) {
      const body = [], W = 124;
      // the hummocks along the mat: centre, half width, height (lower at the ends, so the mat feathers into the ground)
      const hum = [];
      let x = -W;
      while (x < W) { const w = rr(r, 14, 28), cx = x + w; hum.push([cx, w, rr(r, 10, 22) * (0.35 + 0.65 * (1 - Math.abs(cx / W) ** 2))]); x += w * rr(r, 0.9, 1.3); }
      // the silhouette of the whole mat (the highest hummock at each x), in the shade tone: no flat base bar
      const top = (xx) => { let h = 0; for (const [cx, w, hh] of hum) { const t = (xx - cx) / w; if (t > -1 && t < 1) h = Math.max(h, hh * Math.sqrt(1 - t * t)); } return h; };
      let sil = `M${-W - 8} 2`;
      for (let xx = -W - 6; xx <= W + 6; xx += 8) sil += `L${xx} ${f1(-top(xx) + (r() - 0.5) * 1.6)}`;
      sil += `L${W + 8} 2Z`;
      const redMat = v === 1;
      body.push([redMat ? '@red.0' : '@green.0', sil]);
      // a few wet hollows (v2), the sky in them
      if (v === 2) { let wt = ''; for (let i = 0; i < 3; i++) wt += sceneD.ell(rr(r, -W * 0.7, W * 0.7), -1.5, rr(r, 10, 18), 2); body.push(['@wet', wt, 0.5]); }
      // the hummocks' lit tops, overlapping: mostly the mat's own colour, a few of the other kind
      let a = '', b = '', st = '', st2 = '';
      hum.forEach(([cx, w, h], i) => {
        const red = redMat ? i % 4 !== 3 : v === 2 ? i % 3 === 0 : i % 6 === 0;
        const cap = sceneD.lobed(r, cx - w * 0.15, -h * 0.62, w * 0.72, h * 0.36, 7, 0.16);
        if (red) a += cap; else b += cap;
        for (let j = 0; j < Math.round(w * 0.45); j++) {
          const px = cx + rr(r, -0.8, 0.8) * w, t = (px - cx) / w, py = -Math.sqrt(Math.max(0, 1 - t * t)) * h * rr(r, 0.45, 0.95);
          const sd = `M${f1(px - 1.1)} ${f1(py)}h2.2M${f1(px)} ${f1(py - 1.1)}v2.2`;
          if (red) st += sd; else st2 += sd;
        }
      });
      if (a) body.push(['@red.1', a, 0.9]);
      if (b) body.push(['@green.1', b, 0.9]);
      if (st) body.push({ s: '@red.2', w: 1, d: st, detail: true, op: 0.8 });
      if (st2) body.push({ s: '@green.2', w: 1, d: st2, detail: true, op: 0.8 });
      return { body };
    },
  });

  /* ---------- plant.yc-cotton-grass ----------
     Common cotton-grass (Eriophorum angustifolium) of the wet heath and the pool margins: a tuft of narrow, channelled
     leaves (red-tipped from late summer) and slender stems, each with two to five drooping tassels of white cotton (May to
     August; ragged in autumn; none in winter, the leaves straw and rust). v0 a tuft, v1 a taller stand, v2 a low tuft.
     Anchor: the foot, centre. */
  sceneObjDefine({
    id: 'plant.yc-cotton-grass',
    category: 'plant',
    size: [110, 140],
    variants: 3,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: Object.assign({ base: { stem: '#5a5a3a' } }, by({
      head: { spring: ['#fbfaf4', '#e2e0d6', '#c8c4b4'], summer: ['#fbfaf4', '#e2e0d6', '#c8c4b4'], autumn: ['#d8ccb0', '#bcae90', '#9a8a6c'], winter: ['#8a7a60', '#6e604a', '#5a4e3c'] },
      leaf: { spring: ['#3e5a2a', '#5e7e3a', '#7a8a42'], summer: ['#3e5a2a', '#5a7a36', '#a04a2c'], autumn: ['#7a4a2a', '#a8582e', '#c88a4a'], winter: ['#7a6a4a', '#9a8660', '#6a4a32'] },
    })),
    parts: ['body'],
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 3 } },
    shadow: false,
    reflect: true,
    tags: ['uk', 'heath', 'mire', 'bog', 'cotton-grass', 'eriophorum', 'sedge', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the composed Yateley Common views (cotton-grass on the wet heath)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [];
      const H = [100, 130, 70][v], nLeaf = [16, 20, 12][v], nStem = { spring: 3, summer: [6, 9, 4][v], autumn: [3, 4, 2][v], winter: [2, 3, 1][v] }[season];
      let l0 = '', l1 = '', l2 = '';
      for (let i = 0; i < nLeaf; i++) {
        const a = rr(r, -0.75, 0.75), L = H * rr(r, 0.35, 0.7), ex = Math.sin(a) * L * 1.1, ey = -Math.cos(a) * L;
        const d = `M${f1(rr(r, -6, 6))} 0Q${f1(ex * 0.3)} ${f1(ey * 0.7)} ${f1(ex)} ${f1(ey)}`;
        if (i % 3 === 0) l2 += d; else if (i % 2) l1 += d; else l0 += d;
      }
      body.push({ s: '@leaf.0', w: 2.2, d: l0, cap: 'round' });
      body.push({ s: '@leaf.1', w: 1.8, d: l1, cap: 'round' });
      body.push({ s: '@leaf.2', w: 1.6, d: l2, cap: 'round', op: 0.9 });
      let st = '', h0 = '', h1 = '', h2 = '';
      for (let i = 0; i < nStem; i++) {
        const x0 = rr(r, -8, 8), a = rr(r, -0.3, 0.3), L = H * rr(r, 0.75, 1), tx = x0 + Math.sin(a) * L, ty = -L;
        st += `M${f1(x0)} 0Q${f1(x0 + (tx - x0) * 0.4)} ${f1(ty * 0.5)} ${f1(tx)} ${f1(ty)}`;
        // the tassels: drooping tufts of cotton on short stalks from the stem's tip
        const n = season === 'spring' ? 1 : Math.round(rr(r, 2, 5));
        for (let j = 0; j < n; j++) {
          const b = -Math.PI / 2 + rr(r, -1.3, 1.3), s = season === 'spring' ? 2.6 : season === 'autumn' ? rr(r, 3, 5) : season === 'winter' ? rr(r, 1.6, 2.6) : rr(r, 5, 8);
          const hx = tx + Math.cos(b) * 6, hy = ty + Math.sin(b) * 4 + s * 0.6;
          st += `M${f1(tx)} ${f1(ty)}L${f1(hx)} ${f1(hy - s * 0.4)}`;
          const blob = season === 'spring' ? sceneD.ell(hx, hy, s * 0.5, s) : sceneD.lobed(r, hx, hy, s * 0.8, s * 1.1, 7, season === 'summer' ? 0.25 : 0.45);
          if (j % 3 === 0) h2 += blob; else if (j % 2) h1 += blob; else h0 += blob;
        }
      }
      if (st) body.push({ s: '@stem', w: 1.3, d: st });
      const dark = season === 'spring';
      if (h0) body.push([dark ? '@leaf.2' : '@head.0', h0]);
      if (h1) body.push([dark ? '@leaf.2' : '@head.1', h1]);
      if (h2) body.push([dark ? '@leaf.1' : '@head.2', h2, 0.95]);
      return { body };
    },
  });

  /* ---------- plant.yc-sundew ----------
     Round-leaved sundew (Drosera rotundifolia) on the wet sphagnum: a low rosette of round, red-haired leaves on long
     stalks, each hair tipped with a glistening drop of glue; in summer a slender stalk of small white flowers. In winter it
     dies back to a tight red bud. Drawn big, for the foreground at eye level. v0, v1 (more leaves). Anchor: the foot, centre. */
  sceneObjDefine({
    id: 'plant.yc-sundew',
    category: 'plant',
    size: [80, 70],
    variants: 2,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: { base: { leaf: ['#7a8a3a', '#9aa848'], hair: ['#b8302a', '#d84a3a'], dew: ['#fff4f0', '#ffd8d0'], stalk: '#7a4a3a', flower: '#fbfaf2', bud: '#8a2a24' }, autumn: { leaf: ['#8a5a2a', '#a8742e'] }, winter: { leaf: ['#6a3a2a', '#8a4a32'] } },
    parts: ['body'],
    shadow: false,
    reflect: false,
    tags: ['uk', 'heath', 'mire', 'bog', 'sundew', 'drosera', 'carnivorous', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the composed Yateley Common views (round-leaved sundew)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [];
      if (season === 'winter') {
        body.push(['@bud', sceneD.lobed(r, 0, -2.4, 3.2, 2.4, 7, 0.2)]);
        body.push(['@hair.0', sceneD.lobed(r, -0.6, -3.4, 1.8, 1.3, 6, 0.2), 0.8]);
        return { body };
      }
      const n = v ? 9 : 7;
      let stalk = '', pads = '', pads2 = '', hair = '', dew = '', dew2 = '';
      for (let i = 0; i < n; i++) {
        // the rosette seen from low down: leaves fan out to the sides, the front ones lower and bigger
        const a = Math.PI * (0.05 + 0.9 * (i + rr(r, 0.2, 0.8)) / n), front = Math.sin(a), L = rr(r, 16, 26) * (0.8 + 0.3 * front);
        const ex = -Math.cos(a) * L * 1.2, ey = -4 - (1 - front) * rr(r, 4, 9) + front * 2;
        stalk += `M0 -2Q${f1(ex * 0.5)} ${f1(ey - 3)} ${f1(ex)} ${f1(ey)}`;
        const pr = rr(r, 6, 8.5);
        if (i % 2) pads += sceneD.ell(ex, ey, pr, pr * 0.72); else pads2 += sceneD.ell(ex, ey, pr, pr * 0.72);
        for (let j = 0; j < 9; j++) {
          const b = j / 9 * Math.PI * 2, hx = ex + Math.cos(b) * pr * 1.5, hy = ey + Math.sin(b) * pr * 1.1;
          hair += `M${f1(ex + Math.cos(b) * pr * 0.8)} ${f1(ey + Math.sin(b) * pr * 0.6)}L${f1(hx)} ${f1(hy)}`;
          if (j % 2) dew += sceneD.circ(hx, hy, 1.6); else dew2 += sceneD.circ(hx, hy, 1.3);
        }
      }
      body.push({ s: '@stalk', w: 2, d: stalk });
      body.push(['@leaf.0', pads]);
      body.push(['@leaf.1', pads2]);
      body.push({ s: '@hair.0', w: 1.5, d: hair });
      body.push(['@hair.1', dew2]);
      body.push(['@dew.0', dew, 0.95]);
      if (season === 'summer') {
        // the flower stalk, nodding at the tip, a few white flowers opening
        body.push({ s: '@stalk', w: 1.3, d: 'M2 -4Q6 -34 2 -60Q0 -64 -4 -63' });
        let fl = '';
        for (const [x, y] of [[3, -46], [3.4, -52], [1.6, -58], [-3, -62]]) fl += sceneD.lobed(r, x + 2.4, y, 2.6, 2.6, 5, 0.3);
        body.push(['@flower', fl]);
      } else if (season === 'spring') body.push(['@dew.1', sceneD.circ(0, -5, 2.4), 0.6]);
      return { body };
    },
  });

  /* ---------- prop.yc-field-gate ----------
     A timber five-bar field gate between two square posts, with the stock fence (posts, two strands of wire) running off
     either side: the grazing fence of the Common, where the cattle and ponies are let in. Weathered silver oak, a lichen
     bloom on the top rail. Faces the viewer. Anchor: the gate's foot, centre. */
  sceneObjDefine({
    id: 'prop.yc-field-gate',
    category: 'prop',
    size: [520, 130],
    variants: 1,
    seasonal: false,
    flippable: true,
    real: { h: 1.3, l: 14, w: 0.2 },
    palette: { base: { wood: ['#9a9284', '#7a7266', '#c4bcae', '#5a544a'], wire: '#6a6660', lichen: '#b8c07a', iron: '#3a3634' } },
    parts: ['body'],
    shadow: { rx: 200, ry: 6, h: 50 },
    reflect: false,
    tags: ['uk', 'heath', 'gate', 'field-gate', 'fence', 'grazing', 'kit:temperate', 'role:edge'],
    credit: 'drawn for the composed Yateley Common views (the grazing gate)',
    build(v, r) {
      const body = [];
      // the stock fence either side: posts leaning a little, two wires sagging between them
      let posts = '', wires = '';
      for (const x of [-250, -196, -142, 142, 196, 250]) { const lean = rr(r, -2, 2); posts += `M${x - 3} 0L${x - 3 + lean} -86L${x + 3 + lean} -88L${x + 3} 0Z`; }
      for (const y of [-74, -44]) wires += `M-252 ${y}Q-223 ${y + 3} -196 ${y}Q-169 ${y + 3} -142 ${y}L-92 ${y + 1}M92 ${y + 1}L142 ${y}Q169 ${y + 3} 196 ${y}Q223 ${y + 3} 252 ${y}`;
      body.push(['@wood.1', posts]);
      body.push({ s: '@wire', w: 1.2, d: wires, op: 0.85 });
      // the gate posts (hanging post left, clapping post right)
      body.push(['@wood.3', 'M-96 2V-108H-80V2ZM80 2V-100H94V2Z']);
      body.push(['@wood.0', 'M-96 -108H-88V2H-96ZM80 -100H86V2H80Z', 0.6]);
      // the gate: five rails, the heel and head stiles, the diagonal brace, the lichen on the top rail
      let rails = '';
      for (let i = 0; i < 5; i++) { const y = -96 + i * 19 + (i > 2 ? 2 : 0); rails += `M-80 ${y}H78V${y + (i ? 6 : 8)}H-80Z`; }
      body.push(['@wood.0', rails]);
      body.push(['@wood.1', 'M-80 -98H-70V-12H-80ZM70 -98H78V-12H70Z']);
      body.push({ s: '@wood.1', w: 7, d: 'M-74 -16L74 -92' });
      body.push({ s: '@wood.2', w: 2, d: 'M-80 -96H78M-80 -77H78', op: 0.7 });
      body.push({ s: '@lichen', w: 2.4, d: 'M-60 -94h12M-20 -95h22M30 -94h10', cap: 'round', op: 0.7 });
      // the iron: the hinges and the latch
      body.push(['@iron', 'M-96 -92h22v3h-22zM-96 -30h22v3h-22zM72 -60h14v4h-14z']);
      return { body };
    },
  });

  /* ---------- building.yc-hangar ----------
     A hangar on Blackbushe airfield, seen across the Common: v0 a curved-roof hangar (wartime Belfast truss) with wide
     sliding doors part open, v1 a newer pale clad shed with a shallow pitched roof, a row of high windows and the office
     on its end. Lit windows and an apron light after dusk. Anchor: the foot, centre. */
  sceneObjDefine({
    id: 'building.yc-hangar',
    category: 'building',
    size: [320, 110],
    variants: 2,
    seasonal: false,
    flippable: true,
    real: { h: 12, l: 50, w: 30 },
    palette: { base: { clad: ['#a8aeb0', '#868c90', '#c8ccce'], roof: ['#6a7276', '#8a9296'], door: ['#5a6064', '#3a3e42'], dark: '#1e2226', window: '#3a4a54', apron: '#8a8a84' } },
    night: { glow: { window: '#ffe2a8' }, on: 0.9 },
    parts: ['body'],
    shadow: { rx: 140, ry: 6, h: 60 },
    reflect: false,
    tags: ['uk', 'airfield', 'blackbushe', 'hangar', 'aviation', 'kit:temperate', 'role:building-far', 'class:building'],
    credit: 'drawn for the composed Yateley Common views (Blackbushe airfield hangars)',
    build(v) {
      const body = [];
      if (v === 0) {
        body.push({ f: '@roof.0', d: 'M-130 0V-56Q-130 -100 0 -102Q130 -100 130 -56V0Z' });
        body.push({ f: '@roof.1', d: 'M-130 -56Q-130 -100 0 -102Q-100 -96 -110 -56Z', op: 0.7 });
        body.push({ s: '@door.0', w: 1.2, d: 'M-120 -70Q-60 -96 0 -98', op: 0.5 });
        body.push({ f: '@clad.1', d: 'M-116 0V-60H116V0Z' });
        let dl = ''; for (let x = -112; x < 116; x += 16) dl += `M${x} -58V0`;
        body.push({ s: '@door.0', w: 1.4, d: dl, op: 0.6 });
        body.push({ f: '@dark', d: 'M-20 0V-56H40V0Z' });
        for (const x of [-110, -76, 46, 80]) body.push({ f: '@window', d: `M${x} -66h30v6h-30z`, glow: 'window' });
      } else {
        body.push({ f: '@clad.0', d: 'M-130 0V-64L-120 -76H120L130 -64V0Z' });
        body.push({ f: '@roof.0', d: 'M-132 -64L-120 -78H120L132 -64Z' });
        body.push({ f: '@clad.2', d: 'M-130 -64H-60V0H-130Z', op: 0.5 });
        body.push({ f: '@door.0', d: 'M-50 0V-56H120V0Z' });
        let dl = ''; for (let x = -40; x < 120; x += 20) dl += `M${x} -56V0`;
        body.push({ s: '@door.1', w: 1.4, d: dl, op: 0.6 });
        for (let x = -124; x < -66; x += 14) body.push({ f: '@window', d: `M${x} -50h9v10h-9z`, glow: 'window' });
        body.push({ f: '@clad.2', d: 'M-150 0V-38H-130V0Z' });
        body.push({ f: '@window', d: 'M-148 -32h16v8h-16z', glow: 'window' });
      }
      // an apron light on its mast
      body.push({ s: '@apron', w: 2, d: 'M150 0V-90' });
      body.push({ f: '@window', d: 'M144 -94h12v5h-12z', glow: 'window' });
      return { body };
    },
  });

  /* ---------- prop.yc-windsock ----------
     The airfield windsock: an orange-and-white striped cone on a mast. The sock swings in the wind. Anchor: the foot. */
  sceneObjDefine({
    id: 'prop.yc-windsock',
    category: 'prop',
    size: [70, 100],
    variants: 1,
    seasonal: false,
    flippable: true,
    real: { h: 6, l: 3, w: 1 },
    palette: { base: { mast: '#c8ccd0', sock: ['#e8642a', '#f4f2ec'] } },
    parts: ['mast', 'sock'],
    anim: { sway: { part: 'sock', pivot: [0, -92], deg: 6 } },
    shadow: false,
    reflect: false,
    tags: ['uk', 'airfield', 'blackbushe', 'windsock', 'aviation', 'kit:temperate', 'role:street'],
    credit: 'drawn for the composed Yateley Common views (the Blackbushe windsock)',
    build() {
      const mast = [{ s: '@mast', w: 2.4, d: 'M0 0V-96' }];
      const sock = [{ f: '@sock.0', d: 'M0 -98L14 -99L14 -85L0 -86Z' }, { f: '@sock.1', d: 'M14 -99L28 -98L28 -87L14 -85Z' }, { f: '@sock.0', d: 'M28 -98L42 -97L42 -89L28 -87Z' }, { f: '@sock.1', d: 'M42 -97L54 -95L54 -91L42 -89Z' }];
      return { mast, sock };
    },
  });
})();
