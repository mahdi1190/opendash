/* ============================================================
   SCENE LIBRARY: buildings, structures and plants of the EAST-ASIAN kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   building.house-jp       a Japanese town house seen from above the town: a two-storey block with a
                           grey-tiled hipped or gabled roof (the ridge and the eaves picked out), plaster
                           or timber walls, sliding windows that light at real dusk; snow on the roof in
                           winter (6 variants: roof form, wall, size)
   building.apartment-jp   a low concrete apartment block of a Japanese country town: three or four
                           storeys, a flat roof with a water tank, a balcony rail on every floor, a stair
                           core at the end; windows lit at real dusk (4 variants: height, colour)
   structure.lantern-stone the stone lantern (toro) of temple and shrine grounds: a base, a shaft, the
                           fire box with its openings (lit at real dusk, a flicker), the curved cap and its
                           finial; moss in spring and summer, snow on the cap in winter (2 variants)
   plant.sasa              dwarf bamboo grass, the low cover of Japanese hill woods: tufts of broad pointed
                           leaves; the leaf edges whiten in winter (3 variants)
   plant.azalea            a clipped azalea mound (tsutsuji) of temple grounds: dense small leaves, a sheet
                           of pink, red or white flowers in spring, red-bronze in autumn (3 variants)
   plant.susuki            Japanese silver grass (Miscanthus): an arching fountain of narrow blades, the
                           silver-pink plumes of autumn, straw-coloured and bent in winter (3 variants)
   Lit from the LEFT. Anchors: the ground at the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, blob, leaf, define, seasons } = sceneDraw;
  const rr = (r, a, b) => a + r() * (b - a);

  /* ---------- building.house-jp ---------- */
  define({
    id: 'building.house-jp', category: 'building', size: [150, 90], variants: 6, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body'],
    palette: { base: {
      roof: ['#4a4e58', '#5e626c', '#3a3e46'], roofL: ['#7a808c', '#8a909a'], wall: ['#e8e2d4', '#cfc6b2', '#8a6a4a', '#b8b0a0'], wallS: ['#b8b0a0', '#9a9282', '#6a5038', '#8e8676'],
      win: ['#3a4048', '#56606a'], frame: '#5a4a3a', snow: ['#f4f8fc', '#d6e0ea'], base: '#6a665e',
    }, spring: { garden: ['#7aaa4a', '#f2b8c8'] }, summer: { garden: ['#3e7a34', '#5a8a3e'] }, autumn: { garden: ['#c0502a', '#e08a30'] }, winter: { garden: ['#6a5a4a', '#8a7a68'] } },
    night: { glow: { window: '#ffd68a' }, on: 0.7 },
    shadow: { rx: 50, ry: 5, h: 50 },
    tags: ['japan', 'house', 'town', 'roof', 'kit:east-asian', 'role:building-far'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const body = [], winter = ctx.season === 'winter', hip = v % 2 === 0, wi = v % 4, w = [96, 84, 104, 76, 90, 100][v], h = [44, 40, 34, 46, 38, 42][v], x0 = -w / 2, side = w * 0.2;
      // walls: the lit front and the shaded end wall, a stone footing, the floor band between the storeys
      body.push([`@wallS.${wi}`, poly([[w / 2, 0], [w / 2, -h], [w / 2 + side, -h - side * 0.3], [w / 2 + side, -side * 0.3]])], [`@wall.${wi}`, rect(x0, -h, w, h)], ['@base', rect(x0, -4, w + side, 4)]);
      body.push({ s: `@wallS.${wi}`, w: 1.2, op: 0.8, d: `M${f1(x0)} ${f1(-h / 2)}h${f1(w)}` });
      if (wi === 2) body.push({ s: '@frame', w: 0.6, op: 0.5, d: Array.from({ length: Math.floor(w / 8) }, (_, i) => `M${f1(x0 + 4 + i * 8)} ${-h + 2}V-4`).join(''), detail: true });
      // windows: two storeys of sliding panes, lit at dusk in three groups
      const g = ['', '', '', ''];
      for (let row = 0; row < 2; row++) for (let x = x0 + 6; x < w / 2 - 12; x += 16) g[Math.floor(r() * 4)] += rect(x, -h + 5 + row * (h / 2), 11, h / 2 - 11);
      g.forEach(d => { if (d) body.push({ f: '@win.0', d, op: 0.85, glow: 'window' }); });
      body.push({ s: '@frame', w: 0.6, op: 0.6, d: `M${f1(x0 + 2)} ${f1(-h / 2 - 1)}h${f1(w - 4)}`, detail: true });
      // the roof: hipped (a trapezoid with a short ridge) or gabled (a long ridge, the gable on the end wall)
      const ry = -h - 4, rt = ry - [22, 20, 18, 24, 20, 22][v], ov = 7;
      if (hip) body.push(['@roof.0', poly([[x0 - ov, ry], [x0 + w * 0.25, rt], [w / 2 - w * 0.25, rt], [w / 2 + ov, ry]])], ['@roof.2', poly([[w / 2 - w * 0.25, rt], [w / 2 + ov, ry], [w / 2 + side + ov, ry - side * 0.3], [w / 2 + side - w * 0.2, rt - side * 0.3]])]);
      else body.push(['@roof.0', poly([[x0 - ov, ry], [x0 + 4, rt], [w / 2 - 4, rt], [w / 2 + ov, ry]])], [`@wallS.${wi}`, poly([[w / 2, ry + 4], [w / 2 + side / 2, rt - side * 0.15], [w / 2 + side, ry + 4 - side * 0.3]])], ['@roof.2', poly([[w / 2 - 4, rt], [w / 2 + ov, ry], [w / 2 + ov + 2, ry - 2], [w / 2, rt - 1]])]);
      body.push(['@roofL.0', rect(x0 - ov, ry - 1.6, w + ov * 2, 2.4)], ['@roof.2', rect(hip ? x0 + w * 0.25 : x0 + 4, rt - 2.4, hip ? w * 0.5 : w - 8, 3)]);
      let tiles = ''; for (let x = x0 - ov + 4; x < w / 2 + ov - 2; x += 5) tiles += `M${f1(x)} ${f1(ry - 2)}L${f1(x + (x < 0 ? 3 : -3) * (hip ? 1 : 0.3))} ${f1(rt + 2)}`;
      body.push({ s: '@roofL.1', w: 0.6, op: 0.45, d: tiles, detail: true });
      // the garden tree by the end wall (a maple or a cherry: its colour tells the season)
      const gx = w / 2 + side + 8;
      body.push({ s: '@frame', w: 1.6, d: `M${f1(gx)} 0V-14` }, ['@garden.0', blob(r, gx, -22, 12, 10, 8, 0.35)], ['@garden.1', blob(r, gx - 3, -26, 6, 5, 6, 0.4), 0.85]);
      if (winter) body.push(['@snow.0', hip ? poly([[x0 - ov + 2, ry - 3], [x0 + w * 0.25, rt - 2], [w / 2 - w * 0.25, rt - 2], [w / 2 + ov - 2, ry - 3]]) : poly([[x0 - ov + 2, ry - 3], [x0 + 4, rt - 2], [w / 2 - 4, rt - 2], [w / 2 + ov - 2, ry - 3]])], ['@snow.1', rect(x0 - ov, ry - 2, w + ov * 2, 2), 0.9]);
      return { body };
    },
  });

  /* ---------- structure.lantern-stone ---------- */
  define({
    id: 'structure.lantern-stone', category: 'structure', size: [44, 92], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, parts: ['lit', 'body'],
    palette: Object.assign({ base: { stone: ['#a8a294', '#868070', '#c8c2b4', '#5e5a50'], fire: '#ffcf80', halo: '#ffd890', snow: ['#f4f8fc', '#d6e0ea'] } }, seasons({
      moss: { spring: '#6a8a3e', summer: '#4e7a36', autumn: '#7a7a3a', winter: '#5a6a4a' },
    })),
    night: { glow: { lamp: '#ffd890' }, on: 1 },
    anim: { flicker: { part: 'lit', op: [0.75, 1], period: 1.8 } },
    shadow: { rx: 16, ry: 3, h: 70 },
    tags: ['japan', 'temple', 'shrine', 'lantern', 'toro', 'stone', 'kit:east-asian', 'role:street'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const body = [], winter = ctx.season === 'winter', tall = v === 1, k = tall ? 1.18 : 1;
      const Y = y => f1(y * k);
      // the base (a stepped plinth), the shaft with its collar, the platform under the fire box
      body.push(['@stone.1', `M-14 0V${Y(-6)}H14V0z`], ['@stone.0', `M-14 ${Y(-6)}V0H4V${Y(-6)}z`], ['@stone.2', `M-12 ${Y(-8)}H12L14 ${Y(-6)}H-14z`]);
      body.push(['@stone.1', `M-5 ${Y(-8)}L-4 ${Y(-40)}H4L5 ${Y(-8)}z`], ['@stone.0', `M-5 ${Y(-8)}L-4 ${Y(-40)}H0V${Y(-8)}z`], ['@stone.2', rect(-6, -24 * k, 12, 3 * k)]);
      body.push(['@stone.1', `M-13 ${Y(-40)}L-10 ${Y(-46)}H10L13 ${Y(-40)}z`], ['@stone.2', rect(-13, -41 * k, 26, 2)]);
      // the fire box and its openings (the light shows through them at night)
      body.push(['@stone.0', rect(-9, -64 * k, 18, 18 * k)], ['@stone.1', rect(3, -64 * k, 6, 18 * k), 0.8]);
      body.push({ f: '@stone.3', d: rect(-5, -61 * k, 6, 11 * k) + rect(4, -61 * k, 3, 11 * k), glow: 'lamp' });
      // the cap: a wide curved roof with upturned corners, the finial (a jewel on a lotus)
      body.push(['@stone.0', `M-20 ${Y(-64)}Q-10 ${Y(-66)} -8 ${Y(-74)}H8Q10 ${Y(-66)} 20 ${Y(-64)}L22 ${Y(-67)}Q12 ${Y(-70)} 9 ${Y(-78)}H-9Q-12 ${Y(-70)} -22 ${Y(-67)}z`], ['@stone.1', `M0 ${Y(-74)}H8Q10 ${Y(-66)} 20 ${Y(-64)}L22 ${Y(-67)}Q12 ${Y(-70)} 9 ${Y(-78)}H0z`, 0.6]);
      body.push(['@stone.2', ell(0, -82 * k, 4, 4 * k)], ['@stone.0', `M-2 ${Y(-86)}Q0 ${Y(-92)} 2 ${Y(-86)}z`]);
      if (!winter) body.push(['@moss', blob(r, -6, -66 * k, 6, 2, 6, 0.4) + blob(r, -9, -2, 5, 2, 6, 0.4), 0.85]);
      else body.push(['@snow.0', `M-21 ${Y(-67)}Q-10 ${Y(-71)} -8 ${Y(-77)}H8Q10 ${Y(-71)} 21 ${Y(-67)}Q10 ${Y(-74)} 0 ${Y(-76)}Q-10 ${Y(-74)} -21 ${Y(-67)}z`], ['@snow.1', rect(-14, -8 * k, 28, 2)]);
      const lit = [{ f: { rad: [[0, '@halo', 0.6], [0.4, '@halo', 0.22], [1, '@halo', 0]], cx: 0, cy: -55 * k, r: 34 }, d: ell(0, -55 * k, 34, 34) }, { f: '@fire', d: rect(-5, -61 * k, 6, 11 * k) + rect(4, -61 * k, 3, 11 * k), op: 0.95 }];
      return { lit, body };
    },
  });

  /* ---------- plant.sasa ---------- */
  define({
    id: 'plant.sasa', category: 'plant', size: [70, 44], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body'],
    palette: seasons({
      leaf: { spring: ['#4e8a3a', '#78aa4a', '#2e5e2a'], summer: ['#3a7a30', '#5e9a3e', '#245024'], autumn: ['#4a7230', '#6e8e3e', '#2e4e24'], winter: ['#4e6a34', '#6e8644', '#34502a'] },
      edge: { spring: '#9ac060', summer: '#88b050', autumn: '#c8c08a', winter: '#eef0e6' },
    }),
    tags: ['japan', 'bamboo-grass', 'ground', 'woodland', 'kit:east-asian', 'role:ground'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const body = [], n = 9 + v * 3, L = ['', '', ''];
      let edge = '';
      for (let i = 0; i < n; i++) {
        const x = rr(r, -28, 28), a = -Math.PI / 2 + rr(r, -1.1, 1.1) + x * 0.01, len = rr(r, 16, 30), y = rr(r, -16, 0);
        L[i % 3] += leaf(x, y, a, len, len * 0.2);
        if (ctx.season === 'winter' && i % 2) { const ex = x + Math.cos(a) * len * 0.7, ey = y + Math.sin(a) * len * 0.7; edge += `M${f1(x + Math.cos(a) * len * 0.3)} ${f1(y + Math.sin(a) * len * 0.3)}L${f1(ex)} ${f1(ey)}`; }
      }
      body.push({ s: '@leaf.2', w: 1, op: 0.7, d: 'M-10 0L-6 -18M6 0L4 -16M0 0V-20' }, ['@leaf.2', L[0]], ['@leaf.0', L[1]], ['@leaf.1', L[2], 0.95]);
      if (edge) body.push({ s: '@edge', w: 1, op: 0.9, d: edge });
      return { body };
    },
  });

  /* ---------- plant.azalea ---------- */
  define({
    id: 'plant.azalea', category: 'plant', size: [110, 56], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body'],
    palette: Object.assign({ base: { flower: ['#f070a8', '#e8403a', '#f8f0f4'] } }, seasons({
      leaf: { spring: ['#4a7a34', '#6a9a40', '#2e5428'], summer: ['#2e6028', '#4a7e34', '#1e4220'], autumn: ['#8a3a24', '#a85a2e', '#5e2a1c'], winter: ['#3e5430', '#5a6e3e', '#2a3a24'] },
    })),
    shadow: { rx: 50, ry: 5, h: 40 },
    tags: ['japan', 'temple', 'shrub', 'flowers', 'kit:east-asian', 'role:shrub'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const body = [], w = [52, 44, 58][v], h = [30, 26, 34][v];
      body.push(['@leaf.2', `M${-w} 0Q${-w} ${-h * 1.1} 0 ${-h * 1.15}Q${w} ${-h * 1.1} ${w} 0z`]);
      body.push(['@leaf.0', blob(r, -w * 0.15, -h * 0.65, w * 0.75, h * 0.5, 11, 0.25)], ['@leaf.1', blob(r, -w * 0.35, -h * 0.85, w * 0.4, h * 0.25, 8, 0.3), 0.9]);
      let fl = '';
      if (ctx.season === 'spring') for (let i = 0; i < 40; i++) { const t = rr(r, -0.95, 0.95), x = t * w, y = -h * (1.05 - t * t * 0.8) * rr(r, 0.3, 1); fl += ell(x, y, 2.6, 2.2); }
      if (fl) body.push([`@flower.${v}`, fl, 0.95]);
      let tw = ''; for (let i = 0; i < 18; i++) { const x = rr(r, -w * 0.9, w * 0.9), y = -h * rr(r, 0.2, 0.95) * (1 - (x / w) * (x / w) * 0.6); tw += ell(x, y, 1.6, 1.2); }
      body.push({ f: '@leaf.1', d: tw, op: 0.7, detail: true });
      return { body };
    },
  });

  /* ---------- plant.susuki ---------- */
  define({
    id: 'plant.susuki', category: 'plant', size: [70, 70], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body'],
    palette: seasons({
      blade: { spring: ['#6a9a48', '#8ab85a', '#4a7a36'], summer: ['#4e8a3a', '#6aa04a', '#3a6a2e'], autumn: ['#9a9a5a', '#b8b070', '#7a7a46'], winter: ['#c8b488', '#dccaa0', '#a8946a'] },
      plume: { spring: '#9ab86a', summer: '#a8c070', autumn: '#e8dcd0', winter: '#efe4cc' },
    }),
    tags: ['japan', 'grass', 'silver-grass', 'autumn', 'kit:east-asian', 'role:ground'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const body = [], n = 12 + v * 3, B = ['', '', ''], s = ctx.season, h = [56, 46, 64][v];
      for (let i = 0; i < n; i++) {
        const x = rr(r, -8, 8), lean = rr(r, -1, 1), len = h * rr(r, 0.6, 1), tipx = x + lean * len * 0.7, tipy = -len * (1 - Math.abs(lean) * 0.35);
        B[i % 3] += `M${f1(x - 1.2)} 0Q${f1(x + lean * len * 0.2)} ${f1(-len * 0.6)} ${f1(tipx)} ${f1(tipy)}Q${f1(x + lean * len * 0.25 + 1)} ${f1(-len * 0.55)} ${f1(x + 1.2)} 0z`;
      }
      body.push(['@blade.2', B[0]], ['@blade.0', B[1]], ['@blade.1', B[2], 0.9]);
      if (s === 'autumn' || s === 'winter') {
        let pl = '';
        for (let i = 0; i < 5 + v; i++) { const x = rr(r, -14, 14), y = -h * rr(r, 0.85, 1.1), a = -Math.PI / 2 + rr(r, -0.6, 0.6) + (s === 'winter' ? 0.5 : 0); pl += leaf(x, y + 10, a, 16, 3.2); }
        body.push(['@plume', pl, 0.9]);
      }
      return { body };
    },
  });

  /* ---------- building.apartment-jp ---------- */
  define({
    id: 'building.apartment-jp', category: 'building', size: [170, 90], variants: 4, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body'],
    palette: { base: { wall: ['#e4e0d6', '#d6d0c0', '#c8ccd0', '#e8dcc8'], wallS: ['#aea898', '#9e9884', '#8e949a', '#b0a28a'], rail: '#7a7e84', win: ['#3a4250', '#56606c'], roof: '#8a8a86', tank: '#b8bcc0', snow: '#f2f6fa' },
      spring: { garden: ['#7aaa4a', '#f2b8c8'] }, summer: { garden: ['#3e7a34', '#5a8a3e'] }, autumn: { garden: ['#c0502a', '#e08a30'] }, winter: { garden: ['#6a5a4a', '#8a7a68'] } },
    night: { glow: { window: '#ffd890', lamp: '#f0f4ff' }, on: 0.66 },
    shadow: { rx: 56, ry: 5, h: 70 },
    tags: ['japan', 'apartment', 'town', 'kit:east-asian', 'role:building-far'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const body = [], fl = v % 2 ? 4 : 3, fh = 14, h = fl * fh + 4, w = [100, 112, 92, 120][v], x0 = -w / 2, side = 18, c = v;
      body.push([`@wallS.${c}`, `M${w / 2} 0V${-h}L${w / 2 + side} ${-h - 5}V-5z`], [`@wall.${c}`, rect(x0, -h, w, h)], ['@roof', rect(x0 - 1, -h - 3, w + side + 1, 3)]);
      body.push([`@wallS.${c}`, rect(x0, -h, 16, h), 0.6], ['@tank', rect(x0 + w * 0.6, -h - 13, 14, 10)], ['@roof', rect(x0 + w * 0.6 + 2, -h - 3, 2, 3) + rect(x0 + w * 0.6 + 10, -h - 3, 2, 3)]);
      const g = ['', '', '', ''];
      let rails = '';
      for (let f = 0; f < fl; f++) {
        const y = -h + 4 + f * fh;
        for (let x = x0 + 22; x < w / 2 - 12; x += 14) g[Math.floor(r() * 4)] += rect(x, y + 1, 9, fh - 6);
        rails += `M${f1(x0 + 18)} ${f1(y + fh - 4)}H${f1(w / 2 - 2)}`;
      }
      g.forEach(d => { if (d) body.push({ f: '@win.0', d, op: 0.9, glow: 'window' }); });
      body.push({ s: '@rail', w: 1.6, d: rails }, { f: '@win.1', d: rect(x0 + 4, -h + 6, 8, h - 10), op: 0.7, glow: 'lamp' });
      // the hedge and the street tree along the front (their colour tells the season)
      body.push(['@garden.0', blob(r, x0 + 30, -6, 26, 7, 9, 0.3) + blob(r, x0 + w - 24, -6, 22, 6, 8, 0.3)], ['@garden.1', blob(r, w / 2 + side + 10, -26, 13, 12, 8, 0.35)], { s: '@rail', w: 1.6, d: `M${w / 2 + side + 10} 0V-16` });
      if (ctx.season === 'winter') body.push(['@snow', rect(x0 - 1, -h - 5, w + side + 1, 3)], ['@snow', rect(x0 + w * 0.6, -h - 15, 14, 3)]);
      return { body };
    },
  });
})();
