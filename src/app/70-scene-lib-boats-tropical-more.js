/* ============================================================
   SCENE LIBRARY: boats, the tropical kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   variant.

   boat.longtail  a long-tail boat: a long narrow wooden hull with a high
                  swept bow dressed with coloured cloth, a car engine on a
                  pivot at the stern driving a long propeller shaft, the
                  boatman standing at the tiller. v0 open, v1 with a
                  canopy and two passengers, v2 a plain working boat.
   boat.sampan    a small flat-bottomed sampan with an arched woven
                  canopy; the rower stands at the stern working a long
                  oar (the 'oar' part turns). v0 one canopy, v1 a market
                  boat with baskets and a short canopy.

   Both FACE RIGHT (the bow on the right) and ride the swell (paddle).
   Anchor: the waterline at the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const SKIN = ['#9a6444', '#c98e6a', '#6e4630'];
  /** A standing figure facing right at (x, 0 = the deck), h about 54: returns shapes. o: shirt, trou, hat, arms ('tiller' | 'oar' | 'rest'). */
  const standing = (x, y, o) => {
    const sk = o.skin;
    // (the arms and the neck are detail: a tile still draws the legs, the body, the head and the hat)
    const out = [{ s: o.trou, w: 5, d: `M${f1(x - 2)} ${f1(y - 26)}L${f1(x - 4)} ${f1(y)}M${f1(x + 2)} ${f1(y - 26)}L${f1(x + 4)} ${f1(y)}` }, { s: o.shirt, w: 10, d: `M${f1(x)} ${f1(y - 26)}L${f1(x + 1)} ${f1(y - 44)}` }];
    if (o.arms === 'tiller') out.push({ s: o.shirt, w: 3.4, d: `M${f1(x + 1)} ${f1(y - 42)}L${f1(x - 6)} ${f1(y - 32)}`, detail: true }, { s: sk, w: 2.6, d: `M${f1(x - 6)} ${f1(y - 32)}L${f1(x - 12)} ${f1(y - 29)}`, detail: true });
    else if (o.arms === 'oar') out.push({ s: o.shirt, w: 3.4, d: `M${f1(x + 1)} ${f1(y - 42)}L${f1(x - 5)} ${f1(y - 34)}`, detail: true }, { s: sk, w: 2.6, d: `M${f1(x - 5)} ${f1(y - 34)}L${f1(x - 9)} ${f1(y - 33)}`, detail: true });
    else out.push({ s: o.shirt, w: 3.4, d: `M${f1(x + 1)} ${f1(y - 42)}L${f1(x + 3)} ${f1(y - 30)}`, detail: true });
    out.push({ s: sk, w: 3, d: `M${f1(x + 1)} ${f1(y - 45)}v-3`, detail: true }, [sk, circ(x + 1.4, y - 51, 4.2)]);
    if (o.hat) out.push([o.hat, `M${f1(x - 9)} ${f1(y - 52)}L${f1(x + 1.4)} ${f1(y - 60)}L${f1(x + 12)} ${f1(y - 52)}q${f1(-10.5)} 2 ${f1(-21)} 0z`]);
    else out.push(['#1f1a18', `M${f1(x - 3)} ${f1(y - 52)}a4.6 4.6 0 0 1 9 -1q-4 -2 -9 1z`]);
    return out;
  };

  /* ---------- boat.longtail ---------- */
  defineObj({
    id: 'boat.longtail', category: 'boat', size: [380, 96], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      hull: ['#6a4a30', '#4a3220', '#8a6a48'], strake: ['#2a7ab0', '#c0302a', '#2f8a5a'], strakeL: ['#5aa0d0', '#e05a4a', '#5aaa7a'], inner: '#3a2a1c',
      cloth: ['#e8c040', '#d84a7a', '#3a9a6a', '#e8e4dc', '#c0302a'], canopy: ['#2a5a8a', '#3a7aaa'], engine: ['#4a4e54', '#2a2c30', '#7a8088'], shaft: '#8a9098',
      skin: SKIN, shirt: ['#d8a040', '#3a6a9a', '#c84a3a', '#e8e4dc'], trou: ['#2a2a34', '#4a3a2a'], hat: '#c8b078', wake: '#eef8f8', water: '#3a6a7a',
    } },
    anim: { paddle: { dy: 1.4, deg: 1.6, period: 2.6 } },
    reflect: true,
    tags: ['asia', 'southeast-asia', 'thailand', 'river', 'canal', 'longtail', 'boat', 'kit:boats', 'kit:tropical', 'kit:water', 'role:boat'],
    credit: 'drawn for the tropical boats kit',
    build(v) {
      const body = [];
      // the propeller shaft trails astern into the water, a plume of spray where it bites
      body.push({ s: '@shaft', w: 2.4, d: 'M-150 -30L-214 8' }, { s: '@wake', w: 1.6, op: .7, d: 'M-226 9q8 -6 16 0q8 6 16 0M-170 4h30M90 3q20 -2 50 2' }, ['@wake', ell(-214, 7, 8, 3), .6]);
      // the hull: low midships, a long rising sweep to the tall bow, a short transom; the coloured strake, the inside
      body.push(['@hull.0', 'M-160 -20Q-150 -14 -140 -13H120Q150 -18 168 -64L172 -66L170 -58Q156 -10 132 4H-136Q-156 0 -160 -20z']);
      body.push(['@inner', 'M-152 -17Q-120 -13 -60 -13H118Q146 -18 162 -54Q148 -26 120 -18H-60Q-120 -18 -152 -21z', .9]);
      body.push([`@strake.${v}`, 'M-158 -12Q-150 -7 -136 -6H124Q148 -10 164 -46L166 -40Q152 -4 128 -1H-134Q-152 -3 -158 -8z'], [`@strakeL.${v}`, 'M-158 -12Q-150 -7 -136 -6H124Q148 -10 164 -46l.6 2Q150 -8 126 -4H-136Q-150 -5 -158 -10z', .7]);
      body.push(['@hull.1', 'M-136 4H132Q150 -6 160 -24Q150 -2 132 2H-136z', .7], { s: '@hull.2', w: .8, op: .5, d: 'M-150 -16Q-130 -12 -100 -12H118Q142 -16 158 -50' });
      // the bow cloths (plain coloured fabric tied at the stem)
      body.push({ s: '@cloth.0', w: 2.6, d: 'M169 -62q4 8 -1 16' }, { s: '@cloth.1', w: 2.4, d: 'M168 -60q8 6 4 18' }, { s: '@cloth.2', w: 2.2, d: 'M167 -58q-3 10 2 16' }, ['@cloth.3', ell(170, -64, 3, 2.4)]);
      // thwarts, a canopy (v1), passengers (v1), a cargo of crates (v2)
      body.push({ s: '@hull.2', w: 2, d: 'M-80 -14v-3M-20 -14v-3M40 -14v-3M90 -14v-3' });
      if (v === 1) {
        for (const [x, sk, sh, hair] of [[-30, '@skin.1', '@shirt.3', 1], [22, '@skin.2', '@shirt.2', 0]]) body.push({ s: sh, w: 9, d: `M${x} -14L${x + 1} -32` }, { s: sk, w: 2.6, d: `M${x + 1} -28l5 6` }, [sk, circ(x + 1.5, -38, 4.2)], ['#1f1a18', hair ? `M${x - 3} -38a4.6 4.6 0 0 1 9 -1q-1 4 -2 8q-1 -6 -7 -7z` : `M${x - 3} -39a4.6 4.6 0 0 1 9 -1q-4 -2 -9 1z`]);
        body.push({ s: '@engine.1', w: 1.6, d: 'M-60 -14V-56M80 -14V-56M10 -14V-58' }, ['@canopy.0', 'M-68 -56Q10 -66 88 -56V-52Q10 -61 -68 -52z'], ['@canopy.1', 'M-68 -56Q10 -66 88 -56l-1 1.4Q10 -64 -67 -54.6z', .7]);
        let fr = ''; for (let i = 0; i < 26; i++) fr += `M${-66 + i * 6} ${f1(-52 - Math.sin((i / 26) * Math.PI) * 9 + .5)}q3 3 6 0`;
        body.push({ s: '@canopy.1', w: 1, d: fr });
      }
      if (v === 2) body.push(['@hull.2', rect(-40, -26, 26, 13)], ['@hull.0', rect(-12, -24, 22, 11)], ['@hull.1', rect(16, -22, 18, 9)], { s: '@hull.1', w: .7, op: .6, d: 'M-40 -20h26M-12 -18h22' });
      // the engine on its pivot at the stern, the boatman at the tiller
      body.push(['@engine.0', 'M-158 -30h22l4 6v10h-30z'], ['@engine.1', rect(-156, -40, 18, 10)], ['@engine.2', rect(-156, -40, 18, 2)], ['@engine.1', ell(-147, -42, 6, 2)], { s: '@engine.1', w: 2, d: 'M-158 -26L-170 -20' });
      body.push(...standing(-124, -14, { skin: '@skin.0', shirt: `@shirt.${v}`, trou: '@trou.1', hat: v === 2 ? null : '@hat', arms: 'tiller' }));
      return { body };
    },
  });

  /* ---------- boat.sampan ---------- */
  defineObj({
    id: 'boat.sampan', category: 'boat', size: [220, 76], variants: 2, seasonal: false, flippable: true, parts: ['body', 'oar'],
    palette: { base: {
      hull: ['#7a5a3a', '#5a4028', '#9a7a54', '#3e2c1c'], mat: ['#b89a5a', '#8a7040', '#d8bc7a'], pole: '#5a4028',
      skin: SKIN, shirt: ['#3a5a7a', '#6a7a5a'], trou: '#2a2a30', hat: '#c8b078', basket: ['#a8884a', '#7a6030'], fruit: ['#e8a030', '#5a9a3a', '#c83a2a', '#e8d040'], wake: '#eef8f8',
    } },
    anim: { paddle: { dy: 1.2, deg: 2, period: 3 }, turn: { part: 'oar', pivot: [-86, -16], deg: 7, period: 3.2, hold: .1 } },
    reflect: true,
    tags: ['asia', 'east-asia', 'southeast-asia', 'river', 'harbour', 'sampan', 'boat', 'kit:boats', 'kit:tropical', 'kit:east-asian', 'kit:water', 'role:boat'],
    credit: 'drawn for the tropical and east-asian boats kits',
    build(v) {
      const body = [], oar = [];
      // a tile still (LOD < .5) draws the hull, the canopy or cargo and the rower: the shading and the wake are detail
      body.push({ s: '@wake', w: 1.4, op: .6, d: 'M-90 4h40M60 3q20 -1 40 2', detail: true });
      // the hull: a flat sheer, a squared bow lifting forward, a raised stern
      body.push(['@hull.0', 'M-96 -22L-90 -14H84L104 -26L106 -22Q96 -2 80 4H-82Q-94 -6 -96 -22z'], { f: '@hull.1', d: 'M-82 4H80Q96 -2 102 -16Q90 -4 78 0H-84z', op: .75, detail: true }, { f: '@hull.2', d: 'M-94 -21L-89 -14H84L104 -26l.4 2L85 -11H-88z', op: .8, detail: true });
      let pl = ''; for (let i = 0; i < 3; i++) pl += `M-88 ${-8 + i * 4}H${84 - i * 3}`;
      body.push({ s: '@hull.3', w: .7, op: .5, d: pl, detail: true });
      if (v === 0) {
        // a long arched canopy of woven matting over the middle
        body.push(['@mat.0', 'M-46 -14V-34Q-40 -52 0 -54Q40 -52 46 -34V-14z'], { f: '@mat.1', d: 'M10 -14V-53Q40 -50 46 -34V-14z', op: .55, detail: true }, ['@hull.3', 'M-38 -14V-30Q-34 -44 0 -46Q34 -44 38 -30V-14z', .85]);
        let wv = ''; for (let i = 0; i < 8; i++) wv += `M${-46 + i * 13} -14V${f1(-34 - Math.sin(((i + .3) / 7.3) * Math.PI) * 18)}`;
        body.push({ s: '@mat.2', w: .9, op: .6, d: wv + 'M-46 -34Q-40 -52 0 -54Q40 -52 46 -34', detail: true });
      } else {
        body.push(['@mat.0', 'M-60 -14V-30Q-56 -44 -32 -46Q-10 -44 -6 -30V-14z'], { f: '@mat.1', d: 'M-34 -14V-46Q-10 -44 -6 -30V-14z', op: .5, detail: true }, ['@hull.3', 'M-54 -14V-28Q-50 -38 -32 -40Q-14 -38 -12 -28V-14z', .85]);
        for (const [x, k] of [[8, 0], [34, 1], [58, 2]]) body.push(['@basket.0', `M${x - 11} -14l2 -10h18l2 10z`], { s: '@basket.1', w: .8, d: `M${x - 9} -20h18M${x - 8} -17h16`, detail: true }, [`@fruit.${k}`, ell(x - 3, -25, 4, 3) + ell(x + 4, -25.4, 3.6, 3)], [`@fruit.${(k + 1) % 4}`, ell(x, -27, 3, 2.4)]);
      }
      // the rower at the stern; the long oar is its own part (it sculls)
      body.push(...standing(-80, -14, { skin: '@skin.0', shirt: `@shirt.${v}`, trou: '@trou', hat: '@hat', arms: 'oar' }));
      oar.push({ s: '@pole', w: 2.4, d: 'M-88 -33L-86 -16L-128 10' }, ['@pole', 'M-128 10l-10 4l-4 -3l12 -5z']);
      return { body, oar };
    },
  });
})();
