/* Painted nature: orchard trees for the High orchard's terraces (and any
 * cottage garden): apple, pear, plum and cherry in the scenes' flat-vector
 * style, by season: blossom in spring, green fruit swelling in summer, ripe
 * fruit and turning leaves in autumn, bare forked limbs in winter.
 *
 * GardenPaintWood.orchardTree(scene, { kind, season, h, x, y, v }) returns a
 * Phaser image with its foot at (x, y) (the caller sets its depth from y and
 * adds it to the object layer). Textures are shared: one per kind, season,
 * variant (0..2) and height step of 20 px, so a terrace of thirty trees costs a
 * handful of textures. GardenPaintWood.orchardKinds lists the kinds. */
(function () {
  'use strict';
  if (!window.GardenPaintWood) return;
  const K = 2, TEX = 'gpwo';
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const KINDS = {
    apple: { leaf: ['#3f6a34', '#5c8a42', '#86ae5c', '#b2cc7c'], fruit: { summer: '#9cbc4a', autumn: '#c8402e' }, bloom: ['#fbeef0', '#f4c6d2'], shape: 'round', bark: ['#6a5238', '#4a3a28', '#8c7050'] },
    pear: { leaf: ['#3c6634', '#577f40', '#7fa556', '#a8c272'], fruit: { summer: '#a8c050', autumn: '#d8b84a' }, bloom: ['#fdfaf2', '#f2eee0'], shape: 'tall', bark: ['#5e4a36', '#40322a', '#80684c'] },
    plum: { leaf: ['#3a5c36', '#52743e', '#789852', '#a0b86c'], fruit: { summer: '#7a8a4a', autumn: '#5a2e5e' }, bloom: ['#fdf8f4', '#f6e4ea'], shape: 'round', bark: ['#4e3a30', '#342620', '#6e5444'] },
    cherry: { leaf: ['#3e6232', '#5a8640', '#82aa58', '#aac874'], fruit: { summer: '#c2302a', autumn: '#c2302a' }, bloom: ['#f9d4e0', '#f2b4c8'], shape: 'wide', bark: ['#6a3e32', '#4a2a22', '#8e5a48'] },
  };
  const AUTUMN = ['#8a6a2c', '#b8782e', '#d49a3e', '#e8c260'];
  function draw(cx, kind, season, v, H) {
    const D = KINDS[kind] || KINDS.apple, r = rng(1000 + v * 37 + kind.length * 101), sh = D.shape;
    const crownW = H * (sh === 'wide' ? .62 : sh === 'tall' ? .4 : .52), crownH = H * (sh === 'tall' ? .62 : .5), crownY = -H + crownH * .55, trunkH = H * .42;
    const f = (d, c, a) => { cx.globalAlpha = a == null ? 1 : a; cx.fillStyle = c; cx.fill(new Path2D(d)); cx.globalAlpha = 1; };
    const blob = (x, y, rx, ry, n, rag) => sceneDraw.blob(r, x, y, rx, ry, n, rag);
    // contact shadow on the grass
    { const g = cx.createRadialGradient(4, 0, 0, 4, 0, crownW * .6); g.addColorStop(0, 'rgba(40,50,28,.3)'); g.addColorStop(1, 'rgba(40,50,28,0)'); cx.save(); cx.scale(1, .3); cx.fillStyle = g; cx.beginPath(); cx.arc(4, 0, crownW * .6, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    // trunk: a short bole that forks into three or four limbs (orchard trees are pruned open)
    const lean = (v - 1) * 3, tw = Math.max(3, H * .05);
    cx.fillStyle = D.bark[0]; cx.beginPath(); cx.moveTo(-tw, 0); cx.quadraticCurveTo(-tw * .7 + lean * .3, -trunkH * .5, -tw * .5 + lean, -trunkH); cx.lineTo(tw * .5 + lean, -trunkH); cx.quadraticCurveTo(tw * .7 + lean * .3, -trunkH * .5, tw, 0); cx.closePath(); cx.fill();
    f(`M${-tw * .9} 0Q${-tw * .6 + lean * .3} ${-trunkH * .5} ${-tw * .45 + lean} ${-trunkH}L${-tw * .1 + lean} ${-trunkH}Q${-tw * .2} ${-trunkH * .5} ${-tw * .3} 0Z`, D.bark[2], .7);
    f(`M${tw * .2} 0Q${tw * .5 + lean * .3} ${-trunkH * .5} ${tw * .5 + lean} ${-trunkH}L${tw * .25 + lean} ${-trunkH}Q${tw * .3} ${-trunkH * .5} ${tw * .1} 0Z`, D.bark[1], .6);
    const limbs = []; for (let i = 0; i < (season === 'winter' ? 5 : 4); i++) { const a = -Math.PI / 2 + (i - (season === 'winter' ? 2 : 1.5)) * .45 + (r() - .5) * .2, L = crownH * (.55 + r() * .35); limbs.push([lean, -trunkH, lean + Math.cos(a) * L * (crownW / crownH), -trunkH + Math.sin(a) * L]); }
    cx.lineCap = 'round'; cx.strokeStyle = D.bark[0];
    for (const [x0, y0, x1, y1] of limbs) { cx.lineWidth = tw * .9; cx.beginPath(); cx.moveTo(x0, y0); cx.quadraticCurveTo((x0 + x1) / 2 + (r() - .5) * 8, (y0 + y1) / 2, x1, y1); cx.stroke(); if (season === 'winter') { cx.lineWidth = tw * .35; for (let k = 0; k < 3; k++) { const t = .4 + k * .2, bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t; cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(bx + (r() - .5) * 22, by - 8 - r() * 12); cx.stroke(); } } }
    if (season === 'winter') { cx.globalAlpha = .5; cx.fillStyle = '#9aa08a'; cx.beginPath(); cx.ellipse(lean, crownY, crownW * .45, crownH * .4, 0, 0, Math.PI * 2); cx.globalAlpha = .12; cx.fill(); cx.globalAlpha = 1; return; }
    // crown: lobes in the scenes' three tones, dark below right, light upper left, sky gaps between
    const L = season === 'autumn' ? AUTUMN : D.leaf, lobes = [];
    for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * .55; lobes.push([lean + Math.cos(a) * crownW * .5 * d, crownY + Math.sin(a) * crownH * .45 * d, crownW * (.22 + r() * .14), crownH * (.2 + r() * .12)]); }
    for (const [x, y, rx, ry] of lobes) f(blob(x + rx * .15, y + ry * .2, rx * 1.05, ry * 1.05, 8, .4), L[0]);
    for (const [x, y, rx, ry] of lobes) f(blob(x, y, rx * .9, ry * .9, 8, .4), L[1]);
    for (const [x, y, rx, ry] of lobes) if (x < lean + crownW * .1 || y < crownY) f(blob(x - rx * .25, y - ry * .3, rx * .5, ry * .45, 7, .45), L[2], .9);
    for (let i = 0; i < 5; i++) f(blob(lean - crownW * .25 + r() * crownW * .3, crownY - crownH * .3 + r() * crownH * .25, crownW * .08, crownH * .06, 6, .5), L[3], .85);
    // blossom, fruit
    if (season === 'spring') for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const x = lean + Math.cos(a) * crownW * .5 * d, y = crownY + Math.sin(a) * crownH * .48 * d; cx.fillStyle = D.bloom[i % 2]; cx.beginPath(); cx.arc(x, y, 1.6 + r() * 1.2, 0, Math.PI * 2); cx.fill(); }
    else { const col = D.fruit[season] || D.fruit.summer, big = season === 'autumn' ? 2.6 : 1.8; for (let i = 0; i < (season === 'autumn' ? 22 : 14); i++) { const a = r() * Math.PI * 2, d = .3 + r() * .65; const x = lean + Math.cos(a) * crownW * .48 * d, y = crownY + Math.sin(a) * crownH * .42 * d + crownH * .08; cx.fillStyle = col; cx.beginPath(); if (kind === 'pear') cx.ellipse(x, y, big * .8, big * 1.15, 0, 0, Math.PI * 2); else cx.arc(x, y, big, 0, Math.PI * 2); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.arc(x - big * .35, y - big * .35, big * .35, 0, Math.PI * 2); cx.fill(); }
      if (season === 'autumn') for (let i = 0; i < 4; i++) { cx.fillStyle = col; cx.globalAlpha = .8; cx.beginPath(); cx.ellipse((r() - .5) * crownW * .9, 2 + r() * 5, 2.4, 1.4, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1; } }
  }
  function orchardTree(scene, o) {
    const kind = KINDS[o.kind] ? o.kind : 'apple', season = o.season || 'summer', v = Math.max(0, Math.min(2, o.v | 0)), H = Math.max(60, Math.round((o.h || 110) / 20) * 20);
    const key = TEX + '|' + kind + '|' + season + '|' + v + '|' + H;
    if (!scene.textures.exists(key)) {
      const w = Math.ceil(H * 1.0), hgt = Math.ceil(H * 1.1), c = document.createElement('canvas'); c.width = w * K; c.height = hgt * K;
      const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, w * K / 2, (hgt - 10) * K);
      try { draw(cx, kind, season, v, H); } catch (e) { return null; }
      scene.textures.addCanvas(key, c); scene.textures.get(key).customData = { foot: [.5, (hgt - 10) / hgt] };
    }
    const meta = scene.textures.get(key).customData.foot;
    return scene.add.image(o.x || 0, o.y || 0, key).setOrigin(meta[0], meta[1]).setScale((o.flip ? -1 : 1) / K, 1 / K);
  }
  GardenPaintWood.orchardTree = orchardTree;
  GardenPaintWood.orchardKinds = Object.keys(KINDS);
})();
