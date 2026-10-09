/* Texas wildflowers and coastal dune plants. Native scene objects, ground anchored. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { define, f1: F, leaf, ell } = sceneDraw;
  const palettes = {
    base: { leaf: ['#385e3d', '#65924d', '#94ad67'], flower: ['#29459a', '#486cc9', '#acc0ef'], cap: '#f2f1da', seed: '#967c4e' },
    spring: { leaf: ['#355c3e', '#66924d', '#9fb970'], flower: ['#304cb1', '#6081df', '#b4c9f4'] },
    summer: { leaf: ['#586b35', '#889450', '#b2ac6c'], flower: ['#586b65', '#97a17c', '#c1bf8f'] },
    autumn: { leaf: ['#725d34', '#aa8d4d', '#c4b87f'], flower: ['#9b8254', '#baa170', '#d2bc90'] },
    winter: { leaf: ['#626c56', '#929780', '#b7baa3'], flower: ['#808b7b', '#abb3a0', '#d1d3bf'] },
  };
  define({
    id: 'plant.texas-bluebonnet', category: 'plant', size: [102, 78], variants: 5, seasonal: true, shapeBySeason: true, flippable: true,
    palette: palettes, parts: ['body'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 3.1 } },
    tags: ['texas', 'bluebonnet', 'lupine', 'ground-cover', 'kit:temperate', 'role:ground'],
    build(v, r, ctx) {
      let stems = '', fineStems = '', leaves = '', darkLeaves = '', fineLeaves = '', petals = ['', '', ''], finePetals = ['', '', ''], caps = '', fineCaps = '', pods = '', finePods = '';
      const spring = ctx.season === 'spring', n = 5 + v;
      for (let j = 0; j < n; j++) {
        const x = -43 + (j + .3 + r() * .5) / n * 86, h = 31 + r() * 38, lean = (r() - .5) * 17, tx = x + lean;
        const stem = `M${F(x)} 0Q${F(x + lean * .2)} ${F(-h * .5)} ${F(tx)} ${F(-h)}`;
        if (j < 3) stems += stem; else fineStems += stem;
        for (let k = 0; k < 3; k++) {
          const yy = -8 - k * 7, xx = x + lean * k * .08;
          for (let f = 0; f < 5; f++) { const a = (-165 + f * 39 + j * 11) * Math.PI / 180, d = leaf(xx, yy, a, 9 + r() * 9, 2.1 + r()); if (k > 0 || j >= 3) fineLeaves += d; else if (f % 2) leaves += d; else darkLeaves += d; }
        }
        if (spring) {
          for (let k = 0; k < 5; k++) { const yy = -h + 4 + k * 4.2, xx = tx - lean * k * .035, w = 2.1 + k * .7;
            (j < 3 ? petals : finePetals)[k % 3] += `M${F(xx)} ${F(yy)}q${F(-w - 2)} -4 ${F(-w * 1.6)} 0q-1 4 ${F(w * 1.6)} 3q${F(w + 2)} -1 ${F(w * 1.6)} -4q-1-3 ${F(-w * 1.6)} 1z`;
          }
          const cap = ell(tx, -h + 1, 2.2, 3.7) + ell(tx - .8, -h + 5, 2.3, 1.4);
          if (j < 3) caps += cap; else fineCaps += cap;
        } else if (ctx.season !== 'winter' || j % 3 === 0) {
          for (let k = 0; k < 3; k++) { const d = leaf(tx + k * .7, -h + k * 6 + 2, (k % 2 ? -2.2 : -.6), 7, 1.8); if (j < 3) pods += d; else finePods += d; }
        }
      }
      const body = [['@leaf.0', darkLeaves], ['@leaf.1', leaves], { f: '@leaf.1', d: fineLeaves, detail: true }, { s: '@leaf.2', w: 1.2, d: stems }, { s: '@leaf.2', w: 1.2, d: fineStems, detail: true }];
      petals.forEach((d, i) => body.push(['@flower.' + i, d])); finePetals.forEach((d, i) => body.push({ f: '@flower.' + i, d, detail: true }));
      body.push(['@cap', caps], ['@seed', pods], { f: '@cap', d: fineCaps, detail: true }, { f: '@seed', d: finePods, detail: true });
      return { body };
    },
  });
  define({
    id: 'plant.texas-sea-oats', category: 'plant', size: [116, 123], variants: 5, seasonal: true, flippable: true,
    palette: {
      base: { grass: ['#425d4a', '#789775', '#b7bf89'], seed: ['#c6ac79', '#e1cb98'] },
      spring: { grass: ['#385c49', '#749673', '#adbd87'], seed: ['#b9a66d', '#dbc78b'] },
      summer: { grass: ['#3d6247', '#7d9e69', '#b7c98a'], seed: ['#c4ac6c', '#e5cf91'] },
      autumn: { grass: ['#6b6645', '#aaa475', '#c9bc8b'], seed: ['#c49a62', '#e0bc7c'] },
      winter: { grass: ['#67716a', '#95a498', '#c0c6b4'], seed: ['#acaa93', '#d0ccad'] },
    }, parts: ['body'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 3.2 } }, shadow: { rx: 29, ry: 3, h: 54 },
    tags: ['texas', 'gulf', 'dune', 'sea-oats', 'ground-cover', 'kit:temperate', 'kit:water', 'role:ground'],
    build(v, r) {
      let back = '', blades = '', stems = '', seed = ['', ''], fineBack = '', fineBlades = '', fineStems = '', fineSeed = ['', ''];
      for (let j = 0; j < 16 + v; j++) { const x = (r() - .5) * 30, h = 25 + r() * 57, bend = (r() - .38) * 75, w = 1.2 + r() * 1.5;
        const d = `M${F(x - w)} 0Q${F(x + bend * .2)} ${F(-h * .6)} ${F(x + bend)} ${F(-h)}Q${F(x + bend * .3)} ${F(-h * .4)} ${F(x + w)} 0z`; if (j >= 8) { if (j % 2) fineBlades += d; else fineBack += d; } else if (j % 2) blades += d; else back += d;
      }
      for (let j = 0; j < 4; j++) { const x = (r() - .5) * 24, h = 82 + r() * 25, bend = 12 + r() * 22;
        let panicle = `M${F(x)} 0Q${F(x + 3)} ${F(-h * .7)} ${F(x + bend)} ${F(-h)}`;
        for (let k = 0; k < 6; k++) {
          const xx = x + bend - k * 1.7, yy = -h + k * 5.1, dx = (k % 2 ? -1 : 1) * (5 + r() * 8), drop = 4 + r() * 5;
          panicle += `M${F(xx)} ${F(yy)}q${F(dx * .8)} -1 ${F(dx)} ${F(drop)}`;
          (j < 2 ? seed : fineSeed)[k % 2] += leaf(xx + dx, yy + drop - 1, 1.15 + r() * .65, 6 + r() * 3, 3 + r() * .8);
          if (k % 2 === 0) (j < 2 ? seed : fineSeed)[(k + 1) % 2] += leaf(xx + dx * .7 - 1, yy + drop + 2, 1.5 + r() * .6, 5 + r() * 3, 2.8);
        }
        if (j < 2) stems += panicle; else fineStems += panicle;
      }
      return { body: [['@grass.0', back], ['@grass.1', blades], { f: '@grass.0', d: fineBack, detail: true }, { f: '@grass.1', d: fineBlades, detail: true }, { s: '@grass.2', w: 1.3, d: stems }, { s: '@grass.2', w: 1.3, d: fineStems, detail: true }, ['@seed.0', seed[0]], ['@seed.1', seed[1]], { f: '@seed.0', d: fineSeed[0], detail: true }, { f: '@seed.1', d: fineSeed[1], detail: true }] };
    },
  });
})();
