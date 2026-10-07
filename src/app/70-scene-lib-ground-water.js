/* ============================================================
   SCENE LIBRARY: ground-water (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core. Check with:
   node tools/anim-pack.mjs object lint <id>, and LOOK with:
   node tools/anim-pack.mjs object sheet <id>.

   ground.swim: an angler's wooden swim (a fishing peg) set into a pond or
   lake bank, as along Wyndham's Pool: a low plank deck on posts at the
   water's edge, its front board and posts weathered green in summer and
   frosted in winter, with a bank stick for a rod. The anchor is the bank
   edge at the deck's front centre; the deck faces away from the viewer, out
   over the water (place it on the near bank with an angler on it). Category
   ground (it lies on the bank, unlit), so a natural scene needs no night
   lights for it. Variant 0: a short single swim; variant 1: a wider double
   swim with a step and a rail post.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build

  sceneObjDefine({
    id: 'ground.swim',
    category: 'ground',
    size: [190, 40],
    variants: 2,
    seasonal: true,
    flippable: true,
    palette: {
      base: { wood: ['#7a5e44', '#5a4432', '#a08262'], post: ['#4a3a2c', '#33281f'], plank: '#3e3024', stick: '#2e2a24', earth: '#5a4a38' },
      spring: { weather: '#6a7a4a', top: '#9a8060' },
      summer: { weather: '#5f7a3e', top: '#a68866' },
      autumn: { weather: '#7a6a3a', top: '#8a6e50' },
      winter: { weather: '#8a9090', top: '#dfe7ea' },
    },
    parts: ['body'],
    shadow: { rx: 80, ry: 6, h: 30 },
    reflect: true,
    tags: ['uk', 'pond', 'lake', 'fishing', 'angling', 'swim', 'peg', 'kit:water', 'kit:temperate', 'role:edge'],
    credit: 'drawn after the angler\'s swims of the Wyndham\'s Pool view art',
    build(v) {
      const w = v === 0 ? 76 : 98, back = 14;   // half width; how far the deck reaches back (up the picture, out over the water)
      const body = [];
      // the earth bank it is cut into, then the posts standing in the water below the deck's far edge
      body.push(['@earth', `M${-w - 14} 4Q${-w} -6 ${-w + 12} -2L${w - 10} -2Q${w + 2} -6 ${w + 16} 4Q0 10 ${-w - 14} 4z`]);
      let posts = '';
      for (let i = 0; i < (v === 0 ? 4 : 5); i++) { const x = -w + 8 + i * ((2 * w - 16) / (v === 0 ? 3 : 4)); posts += `M${x - 3} ${-back - 2}h6v${back + 18}h-6z`; }
      body.push(['@post.1', posts]);
      // the deck top (seen from a little above), the planks across it, the lit near edge
      body.push(['@wood.0', `M${-w} -4L${w} -4L${w - 8} ${-back - 4}L${-w + 8} ${-back - 4}z`]);
      let planks = '';
      for (let x = -w + 14; x < w - 6; x += 13) planks += `M${x} -4l${x > 0 ? -3 : 3} ${-back}`;
      body.push({ s: '@plank', w: 1.1, op: 0.75, d: planks });
      body.push(['@top', `M${-w + 8} ${-back - 4}L${w - 8} ${-back - 4}l1 2H${-w + 7}z`, 0.9]);
      // the front board facing the viewer, its weathering, and the front posts
      body.push(['@wood.1', `M${-w} -4H${w}V5H${-w}z`]);
      body.push(['@weather', `M${-w} 2H${w}V5H${-w}z`, 0.7]);
      body.push({ s: '@wood.2', w: 1, op: 0.8, d: `M${-w} -4H${w}` });
      let front = '';
      for (const x of v === 0 ? [-w + 4, 0, w - 4] : [-w + 4, -w / 3, w / 3, w - 4]) front += `M${x - 3.5} -6h7v14h-7z`;
      body.push(['@post.0', front]);
      if (v === 1) {
        body.push(['@wood.1', `M${w - 30} 5h28v6h-28z`], ['@post.0', `M${-w + 2} -30h5v26h-5z`], { s: '@wood.2', w: 1, d: `M${-w + 4} -30v24` });
      }
      // a bank stick (rod rest) at the deck's front corner
      body.push({ s: '@stick', w: 1.6, cap: 'round', d: `M${w - 22} -2l2 -20M${w - 26} -21h10` });
      return { body };
    },
  });
})();
