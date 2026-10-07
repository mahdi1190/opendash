/* ============================================================
   SCENE LIBRARY: plants, the TROPICAL kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   plant.palm-coconut    a leaning ringed trunk, a crown of drooping feathery fronds, nuts (3 variants)
   plant.palm-royal      a straight pale trunk, the green crownshaft, arching fronds (2 variants)
   plant.banana          paddle leaves on a soft stem, some torn (3 variants)
   plant.bougainvillea   a sprawling shrub heavy with magenta, orange or white bracts (3 variants)
   plant.ixora           a clipped flowering hedge shrub (red or orange heads), the city's planting (3 variants)
   plant.grass-tropical  broad-bladed tufts and ground fern (4 variants)
   The tropics have no four seasons; the palettes still change gently with them (the scene's
   `tropic` season is normally used): spring flush, summer deep green, the drier months a
   little paler with browned tips. Lit from the LEFT. Anchor: the ground at the stem.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, blob, leaf, frond, define, seasons } = sceneDraw;
  const rr = (r, a, b) => a + r() * (b - a);
  /** sceneDraw.frond plus `sil`: one tapering leaf along the drooping rib, the frond's coarse outline (what a tile shows). */
  const frondS = (x, y, ang, len, droop, w, n) => {
    const fr = frond(x, y, ang, len, droop, w, n), c = Math.cos(ang), s = Math.sin(ang), ex = x + c * len, ey = y + s * len + droop;
    const qx = x + c * len * 0.5, qy = y + s * len * 0.5 - droop * 0.15, nx = -s * w * 0.42, ny = c * w * 0.42;
    fr.sil = `M${f1(x)} ${f1(y)}Q${f1(qx + nx)} ${f1(qy + ny)} ${f1(ex)} ${f1(ey)}Q${f1(qx - nx)} ${f1(qy - ny)} ${f1(x)} ${f1(y)}z`;
    return fr;
  };
  const FROND = seasons({
    frond: { spring: ['#4f8a3a', '#78aa4a', '#2f5a2a'], summer: ['#3f7a32', '#62983e', '#28502a'], autumn: ['#5a8238', '#86a048', '#34562a'], winter: ['#6a8a3e', '#a0a050', '#4a6030'] },
  });

  /* ---------- plant.palm-coconut ---------- */
  define({
    id: 'plant.palm-coconut', category: 'plant', size: [170, 260], variants: 3, seasonal: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { trunk: ['#9a8468', '#6e5a44', '#c0aa88'], nut: ['#6a7a2a', '#8a6a2a'] } }, FROND),
    anim: { sway: { part: 'crown', pivot: [0, -230], deg: 3 } },
    shadow: { rx: 50, ry: 6, h: 240 },
    reflect: true,
    tags: ['tropical', 'palm', 'kit:tropical', 'role:tree'],
    credit: 'native (scene engine pilot)',
    build(v, r) {
      const trunk = [], crown = [];
      const lean = [24, -14, 38][v], h = [236, 250, 222][v], tx = lean, ty = -h;
      // the trunk: a curve, wider at the foot, with growth rings
      const L = `M-7 0Q${f1(lean * 0.2)} ${f1(-h * 0.5)} ${f1(tx - 4)} ${f1(ty)}H${f1(tx + 4)}Q${f1(lean * 0.2 + 10)} ${f1(-h * 0.5)} 9 0z`;
      trunk.push(['@trunk.0', L], ['@trunk.1', `M3 0Q${f1(lean * 0.2 + 6)} ${f1(-h * 0.5)} ${f1(tx + 1)} ${f1(ty)}H${f1(tx + 4)}Q${f1(lean * 0.2 + 10)} ${f1(-h * 0.5)} 9 0z`, 0.7]);
      let rings = '';
      for (let i = 1; i < 26; i++) { const t = i / 26, x = (1 - t) * (1 - t) * 1 + 2 * (1 - t) * t * (lean * 0.2 + 2) + t * t * tx, y = -h * t, w = 8 - t * 4; rings += `M${f1(x - w)} ${f1(y)}q${f1(w)} 2 ${f1(w * 2)} 0`; }
      trunk.push({ s: '@trunk.2', w: 0.8, op: 0.6, d: rings, detail: true });
      // the crown: fronds all round, the far ones darker, drooping
      const n = 11, back = [], front = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.9 + rr(r, -0.1, 0.1), len = rr(r, 78, 104);
        const f = frondS(tx, ty, a, len, len * (0.35 + Math.abs(Math.cos(a)) * 0.45), 32, 8);
        (i % 3 === 0 ? back : front).push(f);
      }
      // each frond: a coarse silhouette (what a tile shows) under its blades (detail: drawn at full size only)
      for (const f of back) crown.push(['@frond.2', f.sil], { f: '@frond.2', d: f.blades, detail: true }, { s: '@frond.2', w: 1.6, d: f.rib });
      for (const f of front) crown.push(['@frond.0', f.sil], { f: '@frond.0', d: f.blades, detail: true }, { s: '@frond.0', w: 1.8, d: f.rib });
      crown.push({ f: '@frond.1', d: front[0].blades, op: 0.7, detail: true });
      crown.push(['@nut.0', ell(tx - 4, ty + 6, 5, 5.5) + ell(tx + 5, ty + 7, 5, 5.5) + ell(tx, ty + 11, 4.6, 5)], ['@nut.1', ell(tx + 2, ty + 9, 3, 3), 0.6]);
      return { trunk, crown };
    },
  });

  /* ---------- plant.palm-royal ---------- */
  define({
    id: 'plant.palm-royal', category: 'plant', size: [150, 300], variants: 2, seasonal: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { trunk: ['#c8c2b4', '#9a9486', '#e4dfd4'], shaft: ['#5a8a3a', '#3e6a2c'] } }, FROND),
    anim: { sway: { part: 'crown', pivot: [0, -250], deg: 2.4 } },
    shadow: { rx: 40, ry: 5, h: 280 },
    reflect: true,
    tags: ['tropical', 'palm', 'street-tree', 'kit:tropical', 'role:tree'],
    credit: 'native (scene engine pilot)',
    build(v, r) {
      const trunk = [], crown = [], h = [250, 280][v];
      trunk.push(['@trunk.0', `M-9 0Q-5 ${f1(-h * 0.45)} -6 ${f1(-h * 0.78)}H6Q5 ${f1(-h * 0.45)} 9 0z`], ['@trunk.1', `M2 0Q3 ${f1(-h * 0.45)} 2 ${f1(-h * 0.78)}H6Q5 ${f1(-h * 0.45)} 9 0z`, 0.7], ['@trunk.2', rect(-7, -h * 0.78, 3, h * 0.7), 0.5]);
      let rings = ''; for (let y = -10; y > -h * 0.78; y -= 9) rings += `M-7 ${y}h14`;
      trunk.push({ s: '@trunk.1', w: 0.6, op: 0.5, d: rings, detail: true });
      trunk.push(['@shaft.0', `M-6 ${f1(-h * 0.78)}Q-8 ${f1(-h * 0.88)} -3 ${f1(-h * 0.97)}H3Q8 ${f1(-h * 0.88)} 6 ${f1(-h * 0.78)}z`], ['@shaft.1', `M1 ${f1(-h * 0.78)}Q4 ${f1(-h * 0.88)} 3 ${f1(-h * 0.97)}Q8 ${f1(-h * 0.88)} 6 ${f1(-h * 0.78)}z`, 0.7]);
      const ty = -h * 0.96, n = 10;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.7 + rr(r, -0.08, 0.08), len = rr(r, 70, 90);
        const f = frondS(0, ty, a, len, len * (0.25 + Math.abs(Math.cos(a)) * 0.5), 28, 8);
        const c = i % 3 ? '@frond.0' : '@frond.2';
        crown.push([c, f.sil], { f: c, d: f.blades, detail: true }, { s: c, w: 1.5, d: f.rib });
      }
      return { trunk, crown };
    },
  });

  /* ---------- plant.banana ---------- */
  define({
    id: 'plant.banana', category: 'plant', size: [110, 130], variants: 3, seasonal: true, flippable: true, parts: ['body'],
    palette: Object.assign({ base: { stem: ['#7a9a4a', '#5a7a34'] } }, seasons({ leaf: { spring: ['#6aa040', '#9ac858', '#3e7030'], summer: ['#4f8a34', '#7ab048', '#2e6028'], autumn: ['#5e8a36', '#8aac4a', '#386028'], winter: ['#7a9a40', '#a8b45a', '#5a6a30'] } })),
    shadow: { rx: 34, ry: 5, h: 100 },
    tags: ['tropical', 'banana', 'kit:tropical', 'role:shrub'],
    credit: 'native (scene engine pilot)',
    build(v, r) {
      const body = [];
      body.push(['@stem.0', 'M-6 0Q-4 -40 -3 -72H3Q4 -40 6 0z'], ['@stem.1', 'M1 0Q2 -40 1 -72H3Q4 -40 6 0z', 0.7]);
      const n = 6 + v;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.6 + rr(r, -0.12, 0.12), len = rr(r, 48, 64), x0 = 0, y0 = -70 + rr(r, -4, 4);
        const c = Math.cos(a), s = Math.sin(a), tx = x0 + c * len, ty = y0 + s * len + len * 0.25 * Math.abs(c), nx = -s * 17, ny = c * 17;
        const d = `M${f1(x0)} ${f1(y0)}Q${f1((x0 + tx) / 2 + nx)} ${f1((y0 + ty) / 2 + ny - 6)} ${f1(tx)} ${f1(ty)}Q${f1((x0 + tx) / 2 - nx)} ${f1((y0 + ty) / 2 - ny)} ${f1(x0)} ${f1(y0)}z`;
        body.push([i % 2 ? '@leaf.0' : '@leaf.2', d], { s: '@leaf.1', w: 0.9, op: 0.8, d: `M${f1(x0)} ${f1(y0)}Q${f1((x0 + tx) / 2)} ${f1((y0 + ty) / 2 - 3)} ${f1(tx)} ${f1(ty)}` });
      }
      body.push(['@leaf.1', blob(r, -8, -60, 9, 6, 6, 0.2), 0.5]);
      return { body };
    },
  });

  /* ---------- plant.bougainvillea ---------- */
  define({
    id: 'plant.bougainvillea', category: 'plant', size: [100, 70], variants: 3, seasonal: true, flippable: true, parts: ['body'],
    palette: Object.assign({ base: { stem: '#5a4a34' } }, seasons({
      leaf: { spring: ['#3e7030', '#5a8a3a'], summer: ['#2f6028', '#4a7a32'], autumn: ['#3a6a2e', '#567e36'], winter: ['#4a6a34', '#6a823e'] },
      bract: { spring: ['#e0389a', '#f070b8', '#f08a3a', '#f4f0f0'], summer: ['#d02a8a', '#e8559e', '#e8782a', '#f8f4f4'], autumn: ['#c82a7e', '#d84a90', '#d86a2a', '#ecdcdc'], winter: ['#c04088', '#d06aa0', '#d0884a', '#e8e0e0'] },
    })),
    shadow: { rx: 44, ry: 5, h: 50 },
    tags: ['tropical', 'flowers', 'shrub', 'kit:tropical', 'role:ground'],
    credit: 'native (scene engine pilot)',
    build(v, r) {
      const body = [], col = ['@bract.0', '@bract.2', '@bract.3'][v], col2 = ['@bract.1', '@bract.2', '@bract.3'][v];
      let l0 = '', l1 = '', b0 = '', b1 = '';
      for (let i = 0; i < 9; i++) { const x = rr(r, -40, 40), y = rr(r, -50, -10) * (1 - Math.abs(x) / 70); const d = blob(r, x, y, rr(r, 12, 18), rr(r, 9, 13), 7, 0.4); if (i % 2) l0 += d; else l1 += d; }
      for (let i = 0; i < 18; i++) { const x = rr(r, -44, 44), y = rr(r, -58, -6) * (1 - Math.abs(x) / 80); const d = blob(r, x, y, rr(r, 5, 8), rr(r, 3.6, 5.6), 5, 0.5); if (i % 3) b0 += d; else b1 += d; }
      body.push({ s: '@stem', w: 1.2, op: 0.7, d: 'M0 0Q-10 -20 -24 -30M0 0Q8 -24 22 -36M0 0V-40' }, ['@leaf.0', blob(r, 0, -28, 44, 26, 9, 0.3)], { f: '@leaf.0', d: l0, detail: true }, { f: '@leaf.1', d: l1, detail: true }, [col, b0], { f: col2, d: b1, op: 0.85, detail: true });
      return { body };
    },
  });

  /* ---------- plant.ixora ---------- */
  define({
    id: 'plant.ixora', category: 'plant', size: [70, 40], variants: 3, seasonal: true, flippable: true, parts: ['body'],
    palette: seasons({
      leaf: { spring: ['#2f6a2e', '#4e8a3c', '#1f4a24'], summer: ['#2a5e2a', '#468036', '#1a4220'], autumn: ['#2e6028', '#4e7e34', '#1e4422'], winter: ['#3a6a30', '#5a843c', '#284a26'] },
      head: { spring: ['#e83a2a', '#f08a2a'], summer: ['#d8302a', '#e87a20'], autumn: ['#c8402a', '#e09030'], winter: ['#c04a34', '#d89a40'] },
    }),
    shadow: { rx: 32, ry: 4, h: 30 },
    tags: ['tropical', 'hedge', 'flowers', 'kit:tropical', 'role:ground'],
    credit: 'native (scene engine pilot)',
    build(v, r) {
      const body = [], hc = v === 1 ? '@head.1' : '@head.0';
      let a = '', b = '', c = '', h = '';
      for (let i = 0; i < 8; i++) { const x = rr(r, -28, 28), y = rr(r, -26, -8); const d = blob(r, x, y, rr(r, 9, 13), rr(r, 7, 10), 7, 0.3); if (i % 3 === 0) a += d; else if (i % 3 === 1) b += d; else c += d; }
      for (let i = 0; i < (v === 2 ? 3 : 9); i++) h += sceneDraw.circ(rr(r, -28, 28), rr(r, -30, -12), rr(r, 2.4, 3.6));
      body.push(['@leaf.2', blob(r, 0, -17, 32, 14, 8, 0.25)], { f: '@leaf.2', d: a, detail: true }, ['@leaf.0', b], { f: '@leaf.1', d: c, op: 0.9, detail: true }, [hc, h]);
      return { body };
    },
  });

  /* ---------- plant.grass-tropical ---------- */
  define({
    id: 'plant.grass-tropical', category: 'plant', size: [60, 40], variants: 4, seasonal: true, flippable: true, parts: ['body'],
    palette: seasons({ blade: { spring: ['#5a9a3a', '#86b84a', '#3a6e2c'], summer: ['#4a8a32', '#76aa42', '#2e5e26'], autumn: ['#5e8a34', '#8aa444', '#3e6228'], winter: ['#7a9a40', '#a8b050', '#5a7034'] } }),
    tags: ['tropical', 'grass', 'kit:tropical', 'role:ground'],
    credit: 'native (scene engine pilot)',
    build(v, r) {
      const body = [], n = 10 + v * 3;
      const bl = ['', '', ''];
      for (let i = 0; i < n; i++) { const x = rr(r, -22, 22), a = -Math.PI / 2 + rr(r, -0.7, 0.7) + x * 0.012, len = rr(r, 18, 38) * (v === 3 ? 0.7 : 1); bl[i % 3] += leaf(x, 0, a, len, v === 3 ? 4.5 : 2.6); }
      body.push(['@blade.2', bl[0]], ['@blade.0', bl[1]], ['@blade.1', bl[2], 0.9]);
      return { body };
    },
  });
})();
