/* ============================================================
   SCENE LIBRARY: animals-water (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core. Check with:
   node tools/anim-pack.mjs object lint <id>, and LOOK with:
   node tools/anim-pack.mjs object sheet <id>.

   animal.pond-dragonfly: the dragonflies and damselflies of a heathland
   pond, by SEASON, so an auto-season scene shows the right one without a
   rule of its own: in spring a large red damselfly (variant 0) or an azure
   damselfly (variant 1); in summer an emperor (0) or a black-tailed skimmer
   (1); in autumn a common darter (0) or a migrant hawker (1); in WINTER
   nothing (no dragonflies fly then: the object draws no shapes). Seen from
   above, body pointing right; the wings flap.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const ell = (x, y, rx, ry) => sceneD.ell(x, y, rx, ry);
  const KIND = {
    spring: [{ body: '#c8342a', dark: '#5a1a16', len: 22, w: 2.2, wing: 9 }, { body: '#3a8ad8', dark: '#14243a', len: 22, w: 2, wing: 9 }],
    summer: [{ body: '#3a7ad0', dark: '#1a4a20', len: 30, w: 3.2, wing: 14, thorax: '#4a9a3a' }, { body: '#7aa0c8', dark: '#1a1a1e', len: 26, w: 3, wing: 13 }],
    autumn: [{ body: '#c8402a', dark: '#6a2418', len: 24, w: 2.8, wing: 12 }, { body: '#3a6ab0', dark: '#2a2a1e', len: 27, w: 2.8, wing: 13, thorax: '#8a6a3a' }],
  };
  sceneObjDefine({
    id: 'animal.pond-dragonfly',
    category: 'animal',
    size: [48, 34],
    box: [-36, -26, 16, 26],
    variants: 2,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { wing: '#e8f6fa', vein: '#9ab0b8' },
      spring: { tint: '#f0f4e0' }, summer: { tint: '#e6f6fa' }, autumn: { tint: '#f6eedc' }, winter: { tint: '#ffffff' },
    },
    parts: ['body', 'wings'],
    anim: { flap: { part: 'wings', pivot: [2, 0], sy: [0.25, 1], period: 0.14 } },
    tags: ['uk', 'pond', 'heath', 'waterside', 'dragonfly', 'damselfly', 'insect', 'kit:water', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: 'drawn for the Wyndham\'s Pool scenes (the pool is known for its dragonflies) after the nature kit\'s K.dragonfly',
    build(v, r, ctx) {
      const k = (KIND[ctx.season] || [])[v];
      if (!k) {   // winter: a swarm of winter gnats instead (no dragonfly is on the wing)
        let dots = '', blur = '';
        for (let i = 0; i < 14; i++) { const x = -28 + r() * 40, y = -18 + r() * 36; dots += ell(Math.round(x * 10) / 10, Math.round(y * 10) / 10, 0.9, 0.7); blur += ell(Math.round(x * 10) / 10, Math.round((y - 1) * 10) / 10, 1.8, 0.8); }
        return { body: [['#2a2a2e', dots, 0.85]], wings: [['@wing', blur, 0.45]] };
      }
      const L = k.len, W = k.wing;
      const body = [
        { s: k.body, w: k.w, cap: 'round', d: `M1 0h${-L}` },
        { s: k.dark, w: k.w, op: 0.75, cap: 'round', d: `M-6 0h2M-11 0h2M-16 0h2M-21 0h2${L > 24 ? 'M-26 0h2' : ''}` },
        [k.thorax || k.dark, ell(4, 0, 3.8, 3)],
        [k.body, ell(8.5, 0, 2.6, 2.6)],
      ];
      const wings = [
        ['@wing', `M3-2q-2-${W} 6-${W + 6} 4 8-6 ${W + 6}zM-1-2q-6-${W}-2-${W + 6} 8 8 2 ${W + 6}zM3 2q-2 ${W} 6 ${W + 6} 4-8-6-${W + 6}zM-1 2q-6 ${W}-2 ${W + 6} 8-8 2-${W + 6}z`, 0.62],
        { s: '@vein', w: 0.5, op: 0.6, d: `M3-2l4-${W + 2}M-1-2l-3-${W + 2}M3 2l4 ${W + 2}M-1 2l-3 ${W + 2}` },
        ['@tint', ell(5, -W, 1.6, 2.2) + ell(5, W, 1.6, 2.2), 0.5],
      ];
      return { body, wings };
    },
  });
})();
