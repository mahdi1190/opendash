/* ============================================================
   SCENE LIBRARY: water details (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   The water itself is scene geometry (scene.water: live sky colours,
   reflections, shimmer); these are the pieces placed on and along it: a
   stretch of bank edge, water lilies (the nature kit's K.lilies) and the
   rings of a rising fish. Anchor: the waterline.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const rr = (r, a, b) => a + r() * (b - a);
  const R = Math.round, f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const VERGE = { spring: ['#4c7a37', '#6f9f40', '#a6c95e'], summer: ['#3f6b31', '#5f8f3a', '#8db352'], autumn: ['#5f6a35', '#8a8a45', '#b5a65c'], winter: ['#6b735a', '#8d9277', '#b3b59c'] };

  /* ---------- water.edge: a stretch of bank where land meets water (grassy, stony or sandy with roots) ---------- */
  defineObj({
    id: 'water.edge', category: 'water', size: [355, 48], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: { bank: ['#5a4a38', '#7a6650', '#a08a6a'], wet: '#2e2a24', stone: ['#7a7468', '#a29a8a', '#d2cab8'], sand: ['#c8b48a', '#e0d0a8'], root: '#4a3a2c', glint: '#e8f4f8' } }, bySeason({ verge: VERGE })),
    reflect: true,
    tags: ['uk', 'waterside', 'bank', 'shore', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: 'library: a bank edge after the Fleet Pond and Wyndhams Pool margins',
    build(v, r) {
      const w = 170, top = [];
      for (let i = 0; i <= 12; i++) top.push([-w + i * w / 6, -rr(r, 8, 18) - (v === 2 ? 4 : 0)]);
      const lip = top.map(([x, y], i) => `${i ? 'L' : 'M'}${R(x)} ${R(y)}`).join('');
      const body = [];
      // the bank face: earth with a lit top, a dark wet band at the water, the grass verge over the top
      body.push(['@bank.0', `${lip}L${w} 0L${w} 4L${-w} 4z`]);
      body.push(['@bank.1', top.map(([x, y], i) => `${i ? 'L' : 'M'}${R(x)} ${R(y + 3)}`).join('') + `L${w} ${R(top[12][1] + 9)}L${-w} ${R(top[0][1] + 9)}z`, .8]);
      body.push(['@wet', `M${-w} -3Q0 ${-7} ${w} -3L${w} 4L${-w} 4z`, .6]);
      if (v === 2) {
        // a sandy beach shelving into the water, with exposed roots
        body.push(['@sand.0', `M${-w} -2Q${R(-w * .3)} -14 ${R(w * .4)} -8T${w} -2L${w} 3L${-w} 3z`], ['@sand.1', `M${R(-w * .7)} -6Q0 -12 ${R(w * .5)} -7`, .8]);
        let roots = ''; for (let i = 0; i < 5; i++) { const x = rr(r, -w * .8, w * .8); roots += `M${R(x)} -14q${R(rr(r, -10, 10))} 8 ${R(rr(r, -18, 18))} 14`; }
        body.push({ s: '@root', w: 3, d: roots });
      }
      if (v === 1 || v === 2) { const d = ['', '', '']; for (let i = 0; i < 16; i++) { const x = rr(r, -w * .95, w * .95), y = rr(r, -4, 2), sw = rr(r, 4, 11), sh = sw * rr(r, .45, .65); d[0] += ell(x, y - sh * .3, sw, sh); d[1] += ell(x - sw * .15, y - sh * .55, sw * .75, sh * .5); d[2] += ell(x - sw * .35, y - sh * .8, sw * .3, sh * .2); } body.push(['@stone.0', d[0]], ['@stone.1', d[1]], ['@stone.2', d[2]]); }
      // the verge: a grass mass along the top with blades over the edge
      body.push(['@verge.0', lip + top.slice().reverse().map(([x, y]) => `L${R(x)} ${R(y - rr(r, 6, 14))}`).join('') + 'z']);
      let bl = ['', ''];
      for (let i = 0; i < 70; i++) { const t = rr(r, 0, 12), i0 = Math.min(11, Math.floor(t)), u = t - i0, x = top[i0][0] + (top[i0 + 1][0] - top[i0][0]) * u, y = top[i0][1] + (top[i0 + 1][1] - top[i0][1]) * u, a = rr(r, -.7, .7), h = rr(r, 8, 22); bl[i % 2] += `M${f1(x - 1.4)} ${f1(y + 2)}Q${f1(x + a * h * .3)} ${f1(y - h * .6)} ${f1(x + a * h)} ${f1(y - h)}Q${f1(x + a * h * .3 + 1.4)} ${f1(y - h * .6)} ${f1(x + 1.4)} ${f1(y + 2)}z`; }
      body.push(['@verge.1', bl[0]], ['@verge.2', bl[1]]);
      body.push({ s: '@glint', w: 1.4, op: .55, d: `M${R(-w * .6)} 2h${R(w * .25)}M${R(w * .2)} 3h${R(w * .3)}` });
      return { body };
    },
  });

  /* ---------- water.lily: a raft of lily pads; flowers in summer, yellowing in autumn, a few brown pads in winter ---------- */
  defineObj({
    id: 'water.lily', category: 'water', size: [147, 33], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { flower: ['#fbf8f0', '#f4c2d2', '#e8d8d0'], heart: '#f2c94a', vein: '#9cc88a' } }, bySeason({
      pad: { spring: ['#3f7a4a', '#5f9a58'], summer: ['#2f6a44', '#4f8a50'], autumn: ['#6a6a2a', '#8a7a3a'], winter: ['#5a5a3a', '#6a6a48'] },
    })),
    anim: { bob: { part: '*', dy: 1.2, period: 5 } },
    tags: ['uk', 'pond', 'water-lily', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: "the nature kit's K.lilies",
    build(v, r, ctx) {
      const s = ctx.season, n = s === 'winter' ? 3 + v : s === 'spring' ? 5 + v : 7 + v * 2, pads = ['', ''], veins = [], fl = ['', ''], hearts = [];
      for (let i = 0; i < n; i++) {
        const x = rr(r, -60, 60), y = rr(r, -6, 6), k = .7 + (y + 6) / 12 * .5, rx = rr(r, 12, 22) * k, ry = rx * .36, a = rr(r, -.5, .5);
        // a round pad with its notch: points round the ellipse from just past the notch back to it
        let pd = `M${f1(x)} ${f1(y)}`;
        for (let j = 0; j <= 18; j++) { const t = a + .42 + j / 18 * (Math.PI * 2 - .5), wob = 1 + Math.sin(j * 1.7 + i) * .03; pd += `L${f1(x + Math.cos(t) * rx * wob)} ${f1(y + Math.sin(t) * ry * wob)}`; }
        pads[i % 2] += pd + 'z';
        veins.push(`M${R(x - rx * .6)} ${R(y - ry * .2)}q${R(rx * .6)} ${-R(ry * .4)} ${R(rx * 1.2)} 0`);
        if (s === 'summer' && r() < .45) {
          const c = r() < .7 ? 0 : 1;
          fl[c] += `M${R(x - 7 * k)} ${R(y - 2 * k)}l${R(2 * k)} ${-R(9 * k)} ${R(3 * k)} ${R(5 * k)} ${R(2 * k)} ${-R(8 * k)} ${R(2 * k)} ${R(8 * k)} ${R(3 * k)} ${-R(5 * k)} ${R(2 * k)} ${R(9 * k)}z`;
          hearts.push(ell(x, y - 3 * k, 1.8 * k, 1.8 * k));
        }
        if (s === 'spring' && i === 0) fl[0] += ell(x + 4, y - 3, 3, 4);   // a bud
      }
      const body = [['@pad.0', pads[0]], ['@pad.1', pads[1]], { s: '@vein', w: 1, op: .5, d: veins.join('') }];
      if (fl[0] || fl[1]) body.push(['@flower.0', fl[0]], ['@flower.1', fl[1]], ['@heart', hearts.join('')]);
      return { body };
    },
  });

  /* ---------- water.fish-ring: the spreading rings where a fish rose (they pulse and fade) ---------- */
  defineObj({
    id: 'water.fish-ring', category: 'water', size: [92, 22], variants: 2, seasonal: false, flippable: true,
    palette: { base: { ring: ['#e8f4f8', '#ffffff'], splash: '#d8ecf2' } },
    parts: ['rings', 'splash'],
    anim: { flicker: { part: 'rings', op: [0, .9], period: 3.4 } },
    tags: ['uk', 'pond', 'canal', 'fish', 'ripple', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: "the nature kit's K.fish rings",
    build(v) {
      let rings = '';
      for (let i = 0; i < 3 + v; i++) { const rx = 10 + i * 12, ry = rx * .24; rings += ell(0, 0, rx, ry); }
      return { rings: [{ s: '@ring.0', w: 1.6, d: rings, op: .8 }, { s: '@ring.1', w: 1, d: ell(0, -.5, 6, 1.5) }], splash: v ? [['@splash', 'M-3 0l1-6 2 4 1-7 2 6 1-4 1 7z', .8]] : [] };
    },
  });
})();
