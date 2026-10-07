/* ============================================================
   SCENE LIBRARY: ground details and rocks (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Static pieces that bake into the layer bitmaps: a stretch of worn path,
   a fallen log (the nature kit's K.log), stones, a puddle that holds the
   sky, leaf litter. Light from the LEFT. Anchor: the ground under the
   middle of the piece (a path's near end).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const rr = (r, a, b) => a + r() * (b - a);
  const R = Math.round, f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  /** A smooth irregular closed outline round an ellipse (Catmull-Rom through jittered points). */
  const smoothBlob = (r, cx, cy, rx, ry, n, j) => {
    const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + rr(r, -j, j); p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
    for (let i = 0; i < n; i++) { const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n]; d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`; }
    return d + 'z';
  };
  /** A fringe of short grass blades along the ground from x0 to x1. */
  const blades = (r, x0, x1, n, h) => { let d = ''; for (let i = 0; i < n; i++) { const x = rr(r, x0, x1), a = rr(r, -.5, .5); d += `M${f1(x)} 1q${f1(a * 3)} ${f1(-h * .5)} ${f1(a * h)} ${f1(-h * rr(r, .6, 1.1))}`; } return d; };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const GROUND = { spring: ['#8a7553', '#a99069', '#cbb48a'], summer: ['#8c7651', '#ad936a', '#d2ba8e'], autumn: ['#7d6247', '#9e7f5a', '#c4a57c'], winter: ['#7a6a58', '#9a8a76', '#c4b8a6'] };
  const VERGE = { spring: ['#4c7a37', '#6f9f40', '#a6c95e'], summer: ['#3f6b31', '#5f8f3a', '#8db352'], autumn: ['#5f6a35', '#8a8a45', '#b5a65c'], winter: ['#6b735a', '#8d9277', '#b3b59c'] };

  /* ---------- ground.path: a stretch of worn track running away from the viewer (near end at the anchor) ---------- */
  defineObj({
    id: 'ground.path', category: 'ground', size: [412, 224], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { stone: ['#8c8072', '#d8cdb8'], root: ['#5a4232', '#8a6a4a'], sky: '#a9cde0', mud: '#4a4038', leaves: ['#b0642a', '#d9a040', '#8a4a20'] } }, bySeason({ ground: GROUND, verge: VERGE })),
    tags: ['uk', 'heath', 'woodland', 'path', 'track', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's K.track, as a placeable stretch",
    build(v, r, ctx) {
      const s = ctx.season, wet = s === 'winter' || s === 'autumn';
      // centre line far -> near: [x, y, width]; the far end is narrow and slightly off-axis
      const bend = rr(r, -60, 60), pts = [];
      for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([bend * (1 - t) * (1 - t) + Math.sin(t * 3 + v) * 14 * (1 - t), -190 * (1 - t), 30 + 250 * t * t + 30 * t]); }
      const side = (sgn, k) => pts.map(([x, y, w], i) => { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [x + sgn * (-dy / L) * w * k / 2, y + sgn * (dx / L) * w * k / 2]; });
      const smooth = a => { let d = `M${R(a[0][0])} ${R(a[0][1])}`; for (let i = 1; i < a.length; i++) { const p0 = a[Math.max(0, i - 2)], p1 = a[i - 1], p2 = a[i], p3 = a[Math.min(a.length - 1, i + 1)]; d += `C${R(p1[0] + (p2[0] - p0[0]) / 6)} ${R(p1[1] + (p2[1] - p0[1]) / 6)} ${R(p2[0] - (p3[0] - p1[0]) / 6)} ${R(p2[1] - (p3[1] - p1[1]) / 6)} ${R(p2[0])} ${R(p2[1])}`; } return d; };
      const outline = k => { const Lf = side(-1, k), Rt = side(1, k).reverse(); return smooth(Lf) + 'L' + smooth(Rt).slice(1) + 'z'; };
      const along = t => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
      const body = [['@verge.0', outline(1.3), .7], ['@ground.0', outline(1.12)], ['@ground.1', outline(1)], ['@ground.2', outline(.55), .55], { s: '@mud', w: 2, op: .3, d: smooth(side(-1, .32)) + smooth(side(1, .32)) }];
      const st = ['', ''];
      for (let i = 0; i < 40; i++) { const [x, y, w] = along(r()), k = w / 160, sx = x + rr(r, -.5, .5) * w * .95, sw = rr(r, 3, 8) * k * 1.6; st[0] += ell(sx, y, sw, sw * .55); st[1] += ell(sx - sw * .2, y - sw * .2, sw * .5, sw * .25); }
      body.push(['@stone.0', st[0]], ['@stone.1', st[1]]);
      if (v === 1) { let roots = ''; for (let i = 0; i < 4; i++) { const [x, y, w] = along(rr(r, .45, 1)), sgn = r() < .5 ? -1 : 1; roots += `M${R(x + sgn * w * .7)} ${R(y + 4)}q${R(-sgn * w * .3)} ${R(-6 * w / 160)} ${R(-sgn * w * .55)} ${R(w * .04)}t${R(-sgn * w * .3)} ${R(-w * .03)}`; } body.push({ s: '@root.0', w: 5, d: roots }, { s: '@root.1', w: 2, d: roots }); }
      if (wet) for (let i = 0; i < 2; i++) { const [x, y, w] = along(rr(r, .5, .95)), k = w / 160, px = x + rr(r, -.25, .25) * w; body.push(['@mud', ell(px, y, w * .22, 8 * k), .8], ['@sky', ell(px, y - k, w * .2, 6.5 * k), .85], { s: '#ffffff', w: f1(1.5 * k), op: .7, d: `M${R(px - w * .12)} ${R(y - 2 * k)}h${R(w * .1)}` }); }
      if (s === 'autumn') { const lv = ['', '', '']; for (let i = 0; i < 30; i++) { const [x, y, w] = along(r()), k = w / 160; lv[i % 3] += sceneD.leaf(x + rr(r, -.6, .6) * w, y, rr(r, 0, 6.3), 7 * k + 2, 3 * k + 1); } body.push(['@leaves.0', lv[0]], ['@leaves.1', lv[1]], ['@leaves.2', lv[2]]); }
      return { body };
    },
  });

  /* ---------- ground.log: a fallen log with moss, fungi in autumn and frost in winter (K.log) ---------- */
  defineObj({
    id: 'ground.log', category: 'ground', size: [282, 74], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { bark: ['#62504a', '#2e2420', '#a08a76', '#7a6248'], wood: ['#c8a878', '#9a7a54'], fungus: ['#c9a77a', '#8a6a48'], toadstool: ['#c96a3a', '#efe0c8'], frost: '#f4f8f8', shade: '#1f241c' } }, bySeason({
      moss: { spring: ['#4e7a30', '#6e9a3e'], summer: ['#4e7a30', '#6e9a3e'], autumn: ['#5e6e30', '#7e8e3e'], winter: ['#6e7a5e', '#9aa88a'] },
      tuft: { spring: '#6a9a3a', summer: '#6a9a3a', autumn: '#a49a5a', winter: '#8a8a6a' },
    })),
    shadow: { rx: 150, ry: 9, h: 40 },
    tags: ['uk', 'woodland', 'heath', 'log', 'deadwood', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's K.log",
    build(v, r, ctx) {
      const win = ctx.season === 'winter', aut = ctx.season === 'autumn', L = v ? .8 : 1;
      const m = [L, 0, 0, 1, 0, 0];   // the short variant: the same log, scaled along its length
      const body = [];
      const P = (f, d, op) => body.push({ f, d, op, m });
      const S = (s, w, d, op) => body.push({ s, w, d, op, m });
      P('@bark.0', 'M-138-6Q-142-30-124-36L-60-42 40-46 118-44Q136-40 136-14 134 4 116 6L-40 6-128 4Q-138 2-138-6z');
      P('@bark.2', 'M-124-36L-60-42 40-46 118-44Q130-41 133-30L40-34-60-30-128-24Q-132-32-124-36z', .55);
      P('@bark.1', 'M-136 0L-40-2 116 0Q130-2 135-10L134-4Q130 6 116 6L-40 6-128 4Q-137 3-136 0z', .7);
      S('@bark.1', 1.6, 'M-110-28Q-40-34 30-36T110-34M-118-16Q-30-22 60-22T120-20M-100-6Q0-10 100-8M-70-34q40-4 90-6', .55);
      S('@bark.2', 1, 'M-90-22q60-6 120-6M-50-12q70-4 140-2', .5);
      P('@bark.0', ell(124, -19, 11, 25)); P('@wood.0', ell(125, -19, 9, 22));
      S('@wood.1', 1, 'M125-35a5 16 0 1 0 1 0M125-27a2.6 8 0 1 0 1 0', .8); S('@bark.1', 1, 'M125-19l5-14M125-19l-4 15', .4);
      P('@bark.3', 'M-128-30l-14 4 8 3-12 6 12 1-8 8 14-2z');
      P('@bark.0', 'M-40-40l-10-22 8-2 10 22z'); P('@wood.0', ell(-46, -62, 4.4, 2.4)); P('@bark.0', 'M66-12l26 16-4 6-26-14z');
      let mo = '', ml = '';
      for (const [cx, w] of [[-96, 26], [-52, 34], [6, 22], [58, 30], [100, 16]]) { const cy = -38 - (cx + 140) * .03 + rr(r, -1, 1); mo += ell(cx, cy + 2, w, 5); ml += ell(cx - w * .2, cy, w * .5, 2.4); }
      P('@moss.0', mo, .9); P('@moss.1', ml, .8);
      P('@fungus.0', 'M-20-16q10-6 18 0l-2 3q-8-3-14 0zM-8-8q9-5 16 0l-2 3q-7-3-12 0z'); S('@fungus.1', .8, 'M-20-16q10-5 18 0M-8-8q9-4 16 0', .7);
      if (aut) { P('@toadstool.0', 'M-74-2q8-12 17 0zM-58-1q6-9 12 0zM30 2q8-12 17 0z'); S('@toadstool.1', 3, 'M-65-2v7M-52-1v6M39 2v7'); }
      if (win) S('@frost', 4, 'M-124-35Q-40-44 40-47T120-44', .85);
      S('@tuft', 1.6, 'M-126 6l-4-12M-118 6l2-14M-104 6l-6-10M-60 6l-3-13M-52 6l4-11M10 6l-2-12M18 6l5-10M76 6l-4-13M84 6l3-9M108 6l-2-11');
      return { body };
    },
  });

  /* ---------- rock.stones: a scatter of pebbles and a few larger stones, lit from the left ---------- */
  defineObj({
    id: 'rock.stones', category: 'rock', size: [133, 31], variants: 4, seasonal: false, flippable: true,
    palette: { base: { stone: ['#7a7468', '#a29a8a', '#d2cab8'], shade: '#2a2a24', moss: '#5a7a3a' } },
    tags: ['uk', 'heath', 'waterside', 'stones', 'pebbles', 'kit:temperate', 'kit:water', 'role:rock'],
    credit: "the nature kit's K.stones, as a placeable cluster",
    build(v, r) {
      const d = ['', '', ''], sh = [];
      const n = 6 + v * 3, big = v % 2 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = rr(r, -55, 55), y = rr(r, -4, 4), w = i < big ? rr(r, 14, 22) : rr(r, 3, 10), h = w * rr(r, .45, .7);
        sh.push(ell(x + 2, y + 1, w * 1.05, h * .45));
        d[0] += ell(x, y - h * .4, w, h); d[1] += ell(x - w * .15, y - h * .65, w * .75, h * .55); d[2] += ell(x - w * .35, y - h * .85, w * .3, h * .2);
      }
      return { body: [['@shade', sh.join(''), .3], ['@stone.0', d[0]], ['@stone.1', d[1]], ['@stone.2', d[2]], ['@moss', ell(rr(r, -30, 30), -3, 8, 2), .6]] };
    },
  });

  /* ---------- rock.boulder: a lichened sandstone or flint boulder ---------- */
  defineObj({
    id: 'rock.boulder', category: 'rock', size: [148, 73], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: { rock: ['#5e584e', '#847c6e', '#b0a896', '#d8d0bc'], lichen: ['#b8b46a', '#d8d4a0'], shade: '#1e201a' } }, bySeason({ moss: { spring: ['#4e7a30', '#78a048'], summer: ['#46702e', '#6a9440'], autumn: ['#5e6e30', '#86904a'], winter: ['#5a6a4a', '#7e8a6a'] } })),
    shadow: { rx: 70, ry: 8, h: 70 },
    tags: ['uk', 'heath', 'moor', 'boulder', 'rock', 'kit:temperate', 'kit:alpine', 'role:rock'],
    credit: 'library: faceted boulder',
    build(v, r) {
      const w = rr(r, 50, 70), h = rr(r, 45, 75) * (v === 2 ? .7 : 1);
      const pts = []; const n = 9;
      for (let i = 0; i <= n; i++) { const a = Math.PI * (1 - i / n), k = rr(r, .85, 1.08); pts.push([Math.cos(a) * w * k, -Math.sin(a) * h * k * (i === 0 || i === n ? .1 : 1)]); }
      const outline = 'M' + pts.map(p => `${R(p[0])} ${R(p[1])}`).join('L') + 'z';
      const top = pts.slice(2, 6), lit = 'M' + [[pts[1][0] * .9, pts[1][1] * .8], ...top.map(p => [p[0] * .92, p[1] * .96]), [top[top.length - 1][0] * .2, -h * .45], [-w * .6, -h * .25]].map(p => `${R(p[0])} ${R(p[1])}`).join('L') + 'z';
      const dark = 'M' + [[w * .1, -h * .5], ...pts.slice(6).map(p => [p[0], p[1]])].map(p => `${R(p[0])} ${R(p[1])}`).join('L') + `L${R(w * .2)} 0z`;
      let cracks = ''; for (let i = 0; i < 3; i++) { const x = rr(r, -w * .5, w * .5), y = -rr(r, h * .2, h * .7); cracks += `M${R(x)} ${R(y)}l${R(rr(r, -8, 8))} ${R(rr(r, 6, 16))}l${R(rr(r, -6, 6))} ${R(rr(r, 4, 10))}`; }
      let li = ''; for (let i = 0; i < 6; i++) li += sceneD.lobed(r, rr(r, -w * .5, w * .4), -rr(r, h * .3, h * .85), rr(r, 3, 7), rr(r, 2, 4), 6, .4);
      return { body: [['@shade', ell(4, 1, w * 1.05, 7), .35], ['@rock.1', outline], ['@rock.2', lit], ['@rock.0', dark, .75], ['@rock.3', sceneD.lobed(r, -w * .35, -h * .7, w * .25, h * .12, 7, .3), .6], { s: '@rock.0', w: 1.4, d: cracks, op: .7 }, ['@lichen.0', li, .85], ['@moss.0', `M${R(-w * .95)} 1Q${R(-w * .5)} ${R(-10)} ${R(w * .1)} -4T${R(w * .6)} 1z`], { s: '@moss.0', w: 1.6, d: blades(r, -w * .9, w * .5, 16, 9) }, { s: '@moss.1', w: 1.3, d: blades(r, -w * .8, w * .2, 10, 7) }] };
    },
  });

  /* ---------- ground.puddle: rain water on a path or field, holding the sky ---------- */
  defineObj({
    id: 'ground.puddle', category: 'ground', size: [160, 29], variants: 3, seasonal: false, flippable: true,
    palette: { base: { mud: ['#4a4038', '#6a5a48'], sky: ['#a9cde0', '#cfe4ee'], glint: '#ffffff' } },
    tags: ['uk', 'path', 'puddle', 'rain', 'kit:temperate', 'kit:water', 'role:ground'],
    credit: "the nature kit's track puddles, as a placeable piece",
    build(v, r) {
      const w = 40 + v * 18, h = 7 + v * 2;
      return { body: [['@mud.1', smoothBlob(r, 0, 0, w * 1.1, h * 1.3, 9, .22), .7], ['@mud.0', smoothBlob(r, 0, 0, w, h, 9, .2)], ['@sky.0', smoothBlob(r, 1.5, -.6, w * .93, h * .8, 9, .16)], ['@sky.1', smoothBlob(r, -w * .3, -h * .25, w * .38, h * .22, 7, .1), .7], { s: '@glint', w: 1.5, op: .7, d: `M${R(-w * .5)} ${R(-h * .3)}h${R(w * .3)}M${R(w * .1)} ${R(h * .2)}h${R(w * .18)}` }] };
    },
  });

  /* ---------- ground.leaves: a drift of fallen leaves (autumn; sparse brown in winter, a few in spring and summer) ---------- */
  defineObj({
    id: 'ground.leaves', category: 'ground', size: [133, 37], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: bySeason({ leaves: { spring: ['#7a6a48', '#9a845a', '#6a5a40'], summer: ['#7a6a48', '#9a845a', '#6a5a40'], autumn: ['#b0642a', '#d9a040', '#8a4a20'], winter: ['#6a5040', '#8a6a50', '#5a4636'] } }),
    tags: ['uk', 'woodland', 'leaf-litter', 'autumn', 'kit:temperate', 'kit:urban', 'role:ground'],
    credit: 'library: leaf litter',
    build(v, r, ctx) {
      const n = { spring: 10, summer: 12, autumn: 60, winter: 34 }[ctx.season] + v * 8, lv = ['', '', ''], dv = ['', '', ''];
      // the first 18 leaves draw at every size; the rest of a thick autumn drift is fine detail (tile stills leave it out)
      for (let i = 0; i < n; i++) { const a = rr(r, 0, Math.PI * 2), d = Math.sqrt(r()), x = Math.cos(a) * 64 * d, y = Math.sin(a) * 10 * d, lf = sceneD.leaf(x, y, rr(r, 0, 6.3), rr(r, 6, 10), rr(r, 2.4, 3.6)); if (i < 18) lv[i % 3] += lf; else dv[i % 3] += lf; }
      const body = [['@leaves.2', lv[2]], ['@leaves.0', lv[0]], ['@leaves.1', lv[1]]];
      for (const k of [2, 0, 1]) if (dv[k]) body.push({ f: '@leaves.' + k, d: dv[k], detail: true });
      return { body };
    },
  });
})();
