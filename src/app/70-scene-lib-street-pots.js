/* ============================================================
   SCENE LIBRARY: lane pots (Elm Hill, Norwich; any old lane, doorstep or shop front). PURE: one sceneObjDefine, built lazily per (variant, season).
   plant.lane-planter: what stands against a house wall in an old town, small enough for a 5 m lane (0.7 m high, 0.9 m wide; the flower tub of the
   village library is 1.15 x 1.8 m and fills a corner at 6 m): v0 three terracotta pots of geraniums, v1 an oak half-barrel hooped in iron with
   lavender and pansies, v2 a pair of glazed pots (cream and blue) with ivy and white flowers, v3 a tall terracotta urn with trailing petunias.
   Flowers by season (summer: red, pink, white, purple; autumn: rust chrysanthemums; spring: yellow and pink; winter: bare stems, a little ivy).
   The id carries 'planter' so the world's knowledge base classes it as street dressing. Nothing is lettered.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const r1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${r1(x - rx)} ${r1(y)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0`;
  const FLOWERS = { spring: ['#f2d24a', '#e89ab8', '#f4f0e6'], summer: ['#d23a4a', '#e86aa0', '#f4f0f0', '#8a4ab8'], autumn: ['#c9702a', '#a8442a', '#d8a030'], winter: [] };
  /** A flared pot: rim, body, foot, the lit side. x centre, w mouth width, h height; col the clay or glaze. */
  const pot = (x, w, h, col, lit) => [
    { f: col, d: `M${r1(x - w / 2)} ${-h}L${r1(x + w / 2)} ${-h}L${r1(x + w * 0.34)} 0L${r1(x - w * 0.34)} 0z` },
    { f: lit, d: `M${r1(x - w / 2)} ${-h}L${r1(x - w * 0.18)} ${-h}L${r1(x - w * 0.12)} 0L${r1(x - w * 0.34)} 0z`, op: 0.55 },
    { f: col, d: `M${r1(x - w * 0.56)} ${-h - 4}h${r1(w * 1.12)}l-1 5h${r1(-w * 1.12 + 2)}z` },
    { f: '#1d1a15', d: `M${r1(x - w * 0.34)} 0h${r1(w * 0.68)}l1 -2h${r1(-w * 0.68 - 2)}z`, op: 0.5 },
  ];
  /** A heap of leaf and flower over a pot's mouth: n leaf blobs (three greens), then flowers by season. */
  const heap = (rnd, x, y, w, hgt, ctx, flowers, n) => {
    const leaf = [[], [], []], fl = [];
    for (let i = 0; i < n; i++) {
      const px = x + (rnd() - 0.5) * w, py = y - rnd() * hgt, z = 2.4 + rnd() * 3.2;
      leaf[i % 3].push(`M${r1(px)} ${r1(py)}q${r1(-z)} ${r1(-z * 1.8)} 0 ${r1(-z * 2)}q${r1(z * 1.2)} ${r1(z)} 0 ${r1(z * 2)}z`);
    }
    const cols = ctx.season === 'winter' ? ['#4a574a', '#687767', '#aab4a3'] : ['#244c33', '#416c43', '#709254'];
    const out = leaf.map((d, i) => ({ f: cols[i], d: d.join(''), detail: i > 0 }));
    if (flowers.length) for (let i = 0; i < Math.round(n * 0.4); i++) fl.push({ f: flowers[Math.floor(rnd() * flowers.length)], d: ell(x + (rnd() - 0.5) * w, y - 3 - rnd() * hgt, 2.2 + rnd() * 1.4, 2) });
    return out.concat(fl);
  };
  sceneObjDefine({
    id: 'plant.lane-planter', category: 'plant', size: [110, 96], real: { h: 0.7, l: 0.9, w: 0.4 }, variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    parts: ['body', 'leaf'], palette: { base: {} }, tags: ['uk', 'street', 'lane', 'village', 'planter', 'kit:urban', 'kit:temperate', 'role:street', 'class:street'],
    credit: 'pots and a barrel against a lane wall, drawn for the Elm Hill lane',
    build(v, r, ctx) {
      const rnd = r, flowers = FLOWERS[ctx.season] || FLOWERS.summer, body = [], leaf = [];
      if (v === 0) {                                                                      // three terracotta pots, the middle one the tallest
        for (const [x, w, h, c, l] of [[-30, 32, 30, '#b5603c', '#d28a5e'], [28, 30, 27, '#a85634', '#c9784f'], [0, 38, 42, '#bf6a44', '#dd9468']]) body.push(...pot(x, w, h, c, l));
        for (const [x, y, w, hg, n] of [[-30, -30, 34, 24, 26], [28, -27, 32, 22, 24], [0, -42, 42, 30, 34]]) leaf.push(...heap(rnd, x, y, w, hg, ctx, flowers, n));
      } else if (v === 1) {                                                               // an oak half-barrel, two iron hoops, lavender and pansies
        body.push({ f: '#7a5a38', d: 'M-40-46h80l-6 46h-68z' }, { f: '#a07a4c', d: 'M-40-46h22l-3 46h-6z', op: 0.55 }, { f: '#2b2824', d: 'M-39-36h78v4h-78zM-36-12h72v4h-72z' }, { f: '#3a2c1c', d: 'M-40-48h80v4h-80z' });
        for (let i = 0; i < 9; i++) body.push({ s: '#4f3a22', w: 0.7, op: 0.5, d: `M${-34 + i * 8.5}-44l${i % 2 ? 1 : -1} 40`, detail: true });
        leaf.push(...heap(rnd, 0, -46, 70, 20, ctx, flowers.length ? ['#8a4ab8', '#a86ad0', '#f2d24a'] : [], 30));
        if (ctx.season !== 'winter') for (let i = 0; i < 7; i++) leaf.push({ s: ctx.season === 'autumn' ? '#8a7a58' : '#7a5aa8', w: 1.8, d: `M${-26 + i * 9 + (rnd() - 0.5) * 4} -52q${(rnd() - 0.5) * 6} -${14 + rnd() * 9} ${(rnd() - 0.5) * 8} -${26 + rnd() * 9}` });
      } else if (v === 2) {                                                               // a pair of glazed pots: cream, and blue
        body.push(...pot(-22, 38, 36, '#d8d0b8', '#efe9d6'), ...pot(24, 34, 30, '#3f5f86', '#6684ab'));
        leaf.push(...heap(rnd, -22, -36, 40, 26, ctx, flowers.length ? ['#f4f0f0', '#f4f0f0', '#e9e0a0'] : [], 30), ...heap(rnd, 24, -30, 36, 22, ctx, flowers.length ? ['#f4f0f0', '#f4f0f0'] : [], 26));
        for (let i = 0; i < 5; i++) leaf.push({ s: ctx.season === 'winter' ? '#4a574a' : '#2f5a3a', w: 2.2, d: `M${-30 + i * 8} -34q${(rnd() - 0.5) * 8} 14 ${(rnd() - 0.5) * 8} ${24 + rnd() * 12}`, cap: 'round' });
      } else {                                                                            // a tall urn with trailing flowers
        body.push({ f: '#b5603c', d: 'M-22-58h44l-8 18q10 12 4 40h-36q-6-28 4-40z' }, { f: '#d28a5e', d: 'M-16-54h7l-3 16q-3 12-1 36h-6q-3-24 2-36z', op: 0.5 }, { f: '#b5603c', d: 'M-26-62h52v6h-52z' }, { f: '#8e4a2c', d: 'M-8 0h16v-5h-16z', op: 0.7 });
        leaf.push(...heap(rnd, 0, -62, 46, 28, ctx, flowers, 36));
        for (let i = 0; i < 6; i++) leaf.push({ s: ctx.season === 'winter' ? '#4a574a' : '#3f6a43', w: 2, d: `M${-20 + i * 8} -60q${(rnd() - 0.5) * 6} 12 ${(rnd() - 0.5) * 6} ${20 + rnd() * 14}`, cap: 'round' });
      }
      return { body, leaf };
    },
  });
})();
