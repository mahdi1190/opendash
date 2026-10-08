/* ============================================================
   SCENE LIBRARY: seasonal ground cover (docs/dev/SCENE_ENGINE_V2.md 10; builder A).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   The small things the v2 compile scatters over grass and paths by season (sceneCoverAuto, 70-scene-1scatter.js):
   leaf litter in autumn, blossom petals and daisies in spring, long grass tufts in summer (and pale winter tufts).
   Flat pieces lie on the ground (drawn foreshortened, wider than tall); the anchor is the ground under the middle.
   Each has its real size (`real`), so the depth gives its scale. The existing ground.leaves (a woodland litter heap)
   stays a hand-placed piece; these are the light, many-times-repeated cover. weight: 0 keeps them out of every kit pick
   (sceneKitPick), so the v1 archetypes compile exactly as before; the cover rules and scenes name them.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const rr = (r, a, b) => a + r() * (b - a), f1 = v => Math.round(v * 10) / 10;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)); return parts; };
  /** A small leaf lying flat: an ellipse-ish blade squashed by the view (ry ~ 0.4 of rx), rotated in the ground plane. */
  const flatLeaf = (x, y, len, a) => {
    const c = Math.cos(a), s = Math.sin(a) * 0.35, w = len * 0.42;
    const p = (u, v) => `${f1(x + u * c - v * Math.sin(a))} ${f1(y + u * s + v * Math.cos(a) * 0.35)}`;
    return `M${p(-len / 2, 0)}Q${p(-len / 6, -w)} ${p(len / 2, 0)}Q${p(-len / 6, w)} ${p(-len / 2, 0)}z`;
  };

  /* ---------- ground.leaf-litter: a light scatter of fallen leaves (three looks) ---------- */
  sceneObjDefine({
    id: 'ground.leaf-litter', category: 'ground', size: [64, 12], variants: 3, seasonal: true, flippable: true, weight: 0,
    real: { h: 0.12, l: 0.7, w: 0.7 },
    palette: bySeason({
      leaf: { spring: ['#8a6e4a', '#6e5a3c', '#a08860'], summer: ['#7a7a3e', '#8e7a44', '#6a6436'], autumn: ['#c0702a', '#e0a040', '#9a4a1e'], winter: ['#6a4e34', '#5a422c', '#7a5e40'] },
      shade: { spring: '#5a4a32', summer: '#4e5230', autumn: '#6a3c18', winter: '#3e3024' },
    }),
    tags: ['uk', 'leaf-litter', 'autumn', 'cover', 'park', 'path', 'kit:temperate', 'kit:urban', 'role:ground'],
    credit: 'v2 seasonal cover (SCENE_ENGINE_V2.md 10)',
    build(v, r) {
      const n = 9 + v * 3, cols = ['', '', ''];
      let shade = '';
      for (let i = 0; i < n; i++) {
        const x = rr(r, -28, 28) * (1 - 0.15 * v), y = rr(r, -9, 0), len = rr(r, 6, 11), a = rr(r, 0, Math.PI * 2);
        cols[i % 3] += flatLeaf(x, y, len, a);
        if (i % 3 === 0) shade += flatLeaf(x + 0.8, y + 0.6, len * 0.9, a);
      }
      return tidy({ body: [['@shade', shade, 0.35], ['@leaf.0', cols[0]], ['@leaf.1', cols[1]], ['@leaf.2', cols[2]]] });
    },
  });

  /* ---------- ground.petals: blossom petals under a cherry in spring ---------- */
  sceneObjDefine({
    id: 'ground.petals', category: 'ground', size: [56, 10], variants: 2, seasonal: true, flippable: true, weight: 0,
    real: { h: 0.08, l: 0.6, w: 0.6 },
    palette: bySeason({
      petal: { spring: ['#fbe4ec', '#f4c4d4', '#ffffff'], summer: ['#e8d8d0', '#d8c0b8', '#f0e8e0'], autumn: ['#c8a890', '#b49078', '#d8c0a8'], winter: ['#d8d0cc', '#c8c0bc', '#e8e4e0'] },
    }),
    tags: ['uk', 'blossom', 'petals', 'spring', 'cover', 'park', 'kit:temperate', 'kit:urban', 'role:ground'],
    credit: 'v2 seasonal cover (SCENE_ENGINE_V2.md 10)',
    build(v, r) {
      const cols = ['', '', ''], n = 16 + v * 6;
      for (let i = 0; i < n; i++) { const x = rr(r, -26, 26), y = rr(r, -8, 0), rx = rr(r, 1.2, 2.2); cols[i % 3] += `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(rx * 0.45)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(rx * 0.45)} 0 1 0 ${f1(-2 * rx)} 0z`; }
      return tidy({ body: [['@petal.1', cols[1]], ['@petal.0', cols[0]], ['@petal.2', cols[2]]] });
    },
  });

  /* ---------- plant.daisies: a clump of daisies (and a celandine or two) in short grass ---------- */
  sceneObjDefine({
    id: 'plant.daisies', category: 'plant', size: [44, 18], variants: 3, seasonal: true, flippable: true, weight: 0,
    real: { h: 0.12, l: 0.4, w: 0.4 },
    palette: bySeason({
      blade: { spring: ['#5f9a3c', '#7ab04a'], summer: ['#5a8a36', '#6e9a40'], autumn: ['#7a8040', '#8e8a48'], winter: ['#6a7458', '#7a8064'] },
      petal: { spring: ['#ffffff', '#f6eef2'], summer: ['#fafaf4', '#f0ece4'], autumn: ['#e8e2d6', '#dcd4c6'], winter: ['#c8c4b8', '#b8b4a8'] },
      eye: { spring: '#f0c020', summer: '#e8b820', autumn: '#c89a28', winter: '#9a8a50' },
      cel: { spring: '#f4d020', summer: '#e8c838', autumn: '#c0a040', winter: '#8a8058' },
    }),
    tags: ['uk', 'daisy', 'celandine', 'spring', 'flowers', 'lawn', 'cover', 'kit:temperate', 'kit:urban', 'role:ground'],
    credit: 'v2 seasonal cover (SCENE_ENGINE_V2.md 10)',
    build(v, r, ctx) {
      let blades = '', blades2 = '', pet = '', pet2 = '', eye = '', cel = '';
      for (let i = 0; i < 14; i++) { const x = rr(r, -20, 20), h = rr(r, 4, 9), a = rr(r, -3, 3); const b = `M${f1(x - 1)} 0Q${f1(x + a * 0.4)} ${f1(-h * 0.6)} ${f1(x + a)} ${f1(-h)}Q${f1(x + a * 0.3)} ${f1(-h * 0.5)} ${f1(x + 1)} 0z`; if (i % 2) blades += b; else blades2 += b; }
      const nd = ctx.season === 'winter' ? 1 : 3 + v;
      for (let i = 0; i < nd; i++) {
        const x = rr(r, -17, 17), y = -rr(r, 6, 12), rx = rr(r, 2.4, 3.4);
        const pd = `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(rx * 0.6)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(rx * 0.6)} 0 1 0 ${f1(-2 * rx)} 0z`;
        if (i % 2) pet += pd; else pet2 += pd;
        eye += `M${f1(x - 0.9)} ${f1(y)}a0.9 0.7 0 1 0 1.8 0a0.9 0.7 0 1 0 -1.8 0z`;
        blades += `M${f1(x - 0.3)} ${f1(y + 1)}L${f1(x + 0.3)} ${f1(y + 1)}L${f1(x + 0.5)} 0L${f1(x - 0.5)} 0z`;
      }
      if (v === 2) { const x = rr(r, -12, 12), y = -rr(r, 5, 8); cel += `M${f1(x - 2.2)} ${f1(y)}a2.2 1.3 0 1 0 4.4 0a2.2 1.3 0 1 0 -4.4 0z`; }
      return tidy({ body: [['@blade.0', blades2], ['@blade.1', blades], ['@petal.1', pet2], ['@petal.0', pet], ['@eye', eye], ['@cel', cel]] });
    },
  });

  /* ---------- plant.grass-long: a tuft of long grass (seed heads in summer, straw in autumn, pale winter tufts) ---------- */
  sceneObjDefine({
    id: 'plant.grass-long', category: 'plant', size: [52, 62], variants: 3, seasonal: true, flippable: true, weight: 0,
    real: { h: 0.6, l: 0.5, w: 0.5 },
    palette: bySeason({
      blade: { spring: ['#4f8a34', '#6aa040', '#8ab858'], summer: ['#5a8436', '#7a9a44', '#a4ac5c'], autumn: ['#8a8044', '#a89656', '#c2ae70'], winter: ['#9a9070', '#b0a684', '#c4bca0'] },
      seed: { spring: '#8aa850', summer: '#c8b878', autumn: '#d4c08a', winter: '#d8d0b8' },
    }),
    tags: ['uk', 'grass', 'long-grass', 'meadow', 'verge', 'cover', 'kit:temperate', 'role:ground'],
    credit: 'v2 seasonal cover (SCENE_ENGINE_V2.md 10)',
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 3 } },
    build(v, r, ctx) {
      const cols = ['', '', ''];
      let seed = '';
      const n = 11 + v * 2;
      for (let i = 0; i < n; i++) {
        const x = rr(r, -14, 14), h = rr(r, 34, 60), lean = rr(r, -16, 16) + x * 0.4, w = rr(r, 1.4, 2.4);
        cols[i % 3] += `M${f1(x - w)} 0Q${f1(x + lean * 0.3)} ${f1(-h * 0.55)} ${f1(x + lean)} ${f1(-h)}Q${f1(x + lean * 0.3 + w * 0.4)} ${f1(-h * 0.5)} ${f1(x + w)} 0z`;
        if ((ctx.season === 'summer' || ctx.season === 'autumn') && i % 3 === 0) { const sx = x + lean, sy = -h; seed += `M${f1(sx - 1.2)} ${f1(sy + 7)}Q${f1(sx - 1.6)} ${f1(sy + 2)} ${f1(sx)} ${f1(sy - 1)}Q${f1(sx + 1.6)} ${f1(sy + 2)} ${f1(sx + 1.2)} ${f1(sy + 7)}z`; }
      }
      return tidy({ body: [['@blade.0', cols[0]], ['@blade.1', cols[1]], ['@blade.2', cols[2]], ['@seed', seed]] });
    },
  });
})();
