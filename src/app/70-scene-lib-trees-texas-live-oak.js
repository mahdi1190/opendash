/* A low, wide, wind-shaped Texas live oak. Evergreen foliage; warm fallen leaves in autumn. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { define, blob, leaf, f1: F } = sceneDraw;
  define({
    id: 'tree.texas-live-oak', category: 'tree', size: [550, 336], variants: 3, seasonal: true, flippable: true,
    parts: ['trunk', 'crown'], palette: {
      base: { bark: ['#594b3a', '#8e7b59', '#342e28'], leaf: ['#1e4134', '#416644', '#75945a', '#9eab6b'] },
      spring: { leaf: ['#254b37', '#4c7545', '#8aa45e', '#b2be7b'] },
      summer: { leaf: ['#1d4334', '#426b43', '#779554', '#a4ad6d'] },
      autumn: { leaf: ['#3d492d', '#697247', '#a3a05c', '#c5bb7b'] },
      winter: { leaf: ['#314b43', '#5a7769', '#8fa394', '#b8c0a1'] },
    }, anim: { sway: { part: 'crown', pivot: [0, -120], deg: .48 } },
    shadow: { rx: 55, ry: 7, h: 85 }, reflect: true,
    tags: ['texas', 'live-oak', 'evergreen', 'signature', 'kit:temperate', 'role:tree'],
    build(v, r) {
      const lean = [14, -22, 31][v], trunk = [
        ['@bark.0', `M-25 0q21-45 11-94l-23-63-42-27-41-13 7-12 48 9 37 19-8-53 13-9 20 46 12-28 6-48 12 6-3 56 15 13 42-30 46-10 37-6 5 10-47 18-35 16-28 25q-17 47-17 75l14 101z`],
        ['@bark.1', 'M-17-2q15-58 1-104l-14-37 9-9 23 40q6 46-6 110z', .62],
        ['@bark.2', 'M3 0q-7-52 8-91l21-66 35-28-15 38-23 24q-15 73 2 123z', .6],
        { s: '@bark.2', w: 2.3, d: 'M-17-13q6-37-4-68M-9-104l-19-48M6-27q-5-32 5-60M-40-165l-35-19M38-151l27-25', detail: true },
      ], crown = [];
      // A continuous spreading silhouette, with lower hollow bays exposing the boughs.
      crown.push(['@leaf.0', blob(r, lean * .1, -251, 259, 79, 23, .38)]);
      crown.push(['@leaf.1', blob(r, -17 + lean * .15, -269, 226, 49, 20, .42)]);
      for (let j = 0; j < 7; j++) { const x = -180 + j * 57 + (r() - .5) * 15 + lean * .12, y = -267 - Math.sin((j + .4) / 7 * Math.PI) * 23 + (r() - .5) * 9; crown.push({ f: '@leaf.2', d: blob(r, x, y, 19 + r() * 16, 8 + r() * 6, 9, .52), op: .3 + r() * .12, detail: true }); }
      let tips = '', veins = '';
      for (let j = 0; j < 110; j++) { const x = (r() - .5) * 430, y = -254 - Math.sqrt(Math.max(0, 1 - (x / 240) ** 2)) * (10 + r() * 30), d = leaf(x, y, -2.3 + r() * 1.1, 4 + r() * 6, 1.6 + r()); if (j % 2) tips += d; else veins += d; }
      crown.push({ f: '@leaf.3', d: tips, op: .56, detail: true }, { f: '@leaf.0', d: veins, op: .7, detail: true });
      return { trunk, crown };
    },
  });
})();
