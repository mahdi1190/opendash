/* ============================================================
   SCENE LIBRARY: trees-green (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   tree.distant: a clump of woodland seen far off (the horizon and the tree
   line behind a village, a far bank), the cheap stand-in for a row of full
   trees that would be a few pixels tall. A few lobed crowns with a shaded
   underside and a lit top-left rim (the sun on the LEFT), a glimpse of
   trunks, and in winter bare, see-through crowns of grey-purple twigs.
   About 15 shapes and 3 KB of path data a variant, so hundreds of them cost
   little to bake and nothing per frame (they never sway: anim none).
     v0 broadleaf clump (oak, ash), v1 broadleaf with a Scots pine,
     v2 tall narrow crowns (poplar, birch), v3 a low wide belt (hedgerow trees).
   tree.distant-pine: a stand of Scots pines far off (the heath and the green's
   edges round Yateley): tall bare stems, flat dark crowns, evergreen (only a
   little paler in winter). 3 variants (3, 4 and 5 stems).
   Anchor: the foot of the clump. Check: object lint tree.distant; LOOK:
   object sheet tree.distant.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core is not in this build
  const f1 = (n) => Math.round(n * 10) / 10;
  /** A lobed crown outline (a ring of bumps), deterministic from r. */
  const crown = (r, cx, cy, rx, ry, n) => {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.84 + r() * 0.26; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const ox = mx - cx, oy = my - cy, l = Math.hypot(ox, oy) || 1, bump = 0.22 + r() * 0.18;
      d += `Q${f1(mx + ox / l * rx * bump)} ${f1(my + oy / l * ry * bump)} ${f1(q[0])} ${f1(q[1])}`;
    }
    return d + 'z';
  };
  /** The crowns of each variant: [cx, cy (centre), rx, ry, kind] (kind 'p' = a pine: a dark, flat-topped crown on a tall bare stem). */
  const CLUMPS = [
    [[-70, -96, 62, 56], [0, -132, 78, 74], [70, -100, 64, 58], [-22, -70, 70, 46], [40, -66, 66, 44]],
    [[-74, -90, 58, 52], [-8, -118, 70, 64], [58, -150, 44, 30, 'p'], [64, -84, 62, 54], [10, -66, 70, 44]],
    [[-60, -130, 30, 92], [-14, -160, 34, 120], [34, -136, 30, 96], [74, -100, 36, 62], [-90, -84, 34, 56]],
    [[-120, -60, 64, 42], [-50, -78, 70, 52], [20, -70, 72, 48], [90, -64, 66, 44], [150, -54, 52, 36]],
  ];
  sceneObjDefine({
    id: 'tree.distant',
    category: 'tree',
    size: [300, 280],
    variants: 4,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { bark: ['#4a4038', '#5e5248'], pine: ['#24402f', '#34563e', '#4a6e50'], twig: ['#6e6268', '#8a7e80', '#a89c98'] },
      spring: { leaf: ['#3f6a34', '#62953f', '#a2cc6a'] },
      summer: { leaf: ['#2c5229', '#46773a', '#7aa756'] },
      autumn: { leaf: ['#7a4a24', '#b07a34', '#d8aa52'], leafAlt: ['#6a5a2a', '#9a8a3a', '#c8b45a'] },
      winter: { leaf: ['#5a5052', '#7a6e70', '#9a8e8c'] },
    },
    parts: ['body'],
    shadow: null,
    reflect: true,
    tags: ['uk', 'woodland', 'distant', 'kit:temperate', 'role:tree'],
    build(v, rnd, ctx) {
      const winter = ctx && ctx.season === 'winter', autumn = ctx && ctx.season === 'autumn';
      const list = CLUMPS[v] || CLUMPS[0], body = [];
      // trunks first (seen under and between the crowns)
      for (const [cx, cy, , ry, k] of list) {
        const foot = 0, top = cy + ry * (k === 'p' ? 0.2 : 0.5), w = k === 'p' ? 3 : 4 + rnd() * 3;
        body.push(['@bark.' + (k === 'p' ? 1 : 0), `M${f1(cx - w / 2)} ${foot}L${f1(cx - w * 0.3)} ${f1(top)}h${f1(w * 0.6)}L${f1(cx + w / 2)} ${foot}z`]);
      }
      list.forEach(([cx, cy, rx, ry, k], i) => {
        if (k === 'p') {
          body.push(['@pine.0', crown(rnd, cx + 4, cy + 6, rx, ry, 9)], ['@pine.1', crown(rnd, cx, cy, rx * 0.9, ry * 0.8, 9)], { f: '@pine.2', d: crown(rnd, cx - rx * 0.35, cy - ry * 0.3, rx * 0.4, ry * 0.4, 7), op: 0.8, detail: true });
          return;
        }
        if (winter) {
          // bare crowns: a see-through haze of twigs over a few branch lines
          body.push(['@twig.0', crown(rnd, cx, cy, rx, ry, 10), 0.5], ['@twig.1', crown(rnd, cx - rx * 0.2, cy - ry * 0.15, rx * 0.7, ry * 0.7, 9), 0.4]);
          body.push({ s: '@twig.0', w: 2, cap: 'round', d: `M${cx} ${f1(cy + ry * 0.6)}L${f1(cx - rx * 0.4)} ${f1(cy - ry * 0.3)}M${cx} ${f1(cy + ry * 0.4)}L${f1(cx + rx * 0.45)} ${f1(cy - ry * 0.2)}M${cx} ${f1(cy + ry * 0.5)}V${f1(cy - ry * 0.5)}`, op: 0.8 });
          return;
        }
        const slot = autumn && i % 2 ? '@leafAlt.' : '@leaf.';
        body.push([slot + '0', crown(rnd, cx + rx * 0.08, cy + ry * 0.1, rx, ry, 11)]);
        body.push([slot + '1', crown(rnd, cx - rx * 0.06, cy - ry * 0.08, rx * 0.86, ry * 0.8, 10)]);
        body.push({ f: slot + '2', d: crown(rnd, cx - rx * 0.32, cy - ry * 0.34, rx * 0.42, ry * 0.36, 8), op: 0.75, detail: true });
      });
      return { body };
    },
  });
  sceneObjDefine({
    id: 'tree.distant-pine',
    category: 'tree',
    size: [240, 300],
    variants: 3,
    seasonal: true,
    flippable: true,
    palette: {
      base: { stem: ['#8a4e36', '#5e3a2c'], pine: ['#1f3f2f', '#2e5540', '#4f7a58'] },
      spring: { pine: ['#22442f', '#33604a', '#5a8a60'] },
      summer: { pine: ['#1f3f2f', '#2e5540', '#4f7a58'] },
      autumn: { pine: ['#213f30', '#325842', '#56805a'] },
      winter: { pine: ['#26403a', '#3a5a4e', '#62806e'] },
    },
    parts: ['body'],
    reflect: true,
    tags: ['uk', 'woodland', 'distant', 'heath', 'conifer', 'kit:temperate', 'role:tree'],
    build(v, rnd) {
      const n = 3 + v, body = [], stems = [];
      for (let i = 0; i < n; i++) stems.push([(i - (n - 1) / 2) * (150 / n) + (rnd() - 0.5) * 18, 180 + rnd() * 110]);
      for (const [x, h] of stems) body.push(['@stem.' + (x > 0 ? 1 : 0), `M${f1(x - 3)} 0L${f1(x - 1.6)} ${f1(-h)}h3.2L${f1(x + 3)} 0z`]);
      for (const [x, h] of stems) {
        const w = 34 + rnd() * 26, t = 22 + rnd() * 14, k = rnd() < 0.5 ? -1 : 1;
        body.push(['@pine.0', crown(rnd, x + 4, -h + t * 0.25, w, t, 9)]);
        body.push(['@pine.1', crown(rnd, x + k * 6, -h - t * 0.1, w * 0.8, t * 0.7, 9)]);
        body.push({ f: '@pine.2', d: crown(rnd, x - w * 0.35, -h - t * 0.35, w * 0.4, t * 0.36, 7), op: 0.8, detail: true });
        body.push(['@pine.0', crown(rnd, x - k * w * 0.5, -h * 0.82, w * 0.45, t * 0.45, 7)]);
      }
      return { body };
    },
  });
})();
/* ============================================================
   tree.green-oak, tree.green-chestnut, tree.green-willow, tree.green-alder, tree.green-birch:
   the library's kit trees (70-scene-lib-trees.js) in a LIGHT form for the Yateley Green
   views, where several big trees share a frame. The same drawing (built lazily from the
   source tree, so they always match it), re-flagged for the level of detail:
     - kept at every size: the trunk and limbs, one lobe in four of the crown's big masses
       and the outline of one leaf cluster in twenty (enough for the crown at tile size);
     - detail (fill / hero only): the rest of the masses and as many cluster outlines, then
       shading and leaf ticks, as fit a 52 KB path budget (object lint: 60 KB), taken evenly
       across the crown's tones; what does not fit is dropped (texture at full size only).
   The canvas renderer bakes each sprite once, so this costs nothing per frame; it keeps
   the SVG still and the tile under the scene budgets (section 10.2).
   Parts, sway, shadow and size are the source tree's; anchor: the foot of the trunk.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneObjShapes !== 'function') return;
  const firstSub = (d) => { const i = d.indexOf('M', 1); return i < 0 ? [d, ''] : [d.slice(0, i), d.slice(i)]; };
  /** The path budget of one light tree (object lint: at most 60 KB of path data, all levels of detail together). */
  const BUDGET = 52000;
  /** Keep about `frac` of a list, spread evenly (an accumulator, so every tone of the crown keeps its share). */
  const spread = (frac) => { let acc = 0; return () => { acc += frac; if (acc >= 1) { acc -= 1; return true; } return false; }; };
  const light = (src, v, season) => {
    const sh = sceneObjShapes(src, v, season);
    const out = { trunk: [], crown: [] };
    if (!sh) return out;
    const base = (s) => ({ f: s.f || undefined, s: s.s || undefined, w: s.w || undefined, cap: s.cap || undefined, op: s.op, m: s.m || undefined });
    // sort the source shapes: the structure (trunk, limbs, crown masses, twigs), the leaf clusters (blob + ticks), the source's own detail
    const keep = [], clusters = [], extra = [];
    let fixed = 0, blobBytes = 0, tickBytes = 0, extraBytes = 0;
    for (const part of ['trunk', 'crown']) for (const s of sh.parts[part] || []) {
      if (part === 'crown' && s.m && s.f && !s.detail) { const [blob, ticks] = firstSub(s.d); clusters.push({ part, s, blob, ticks }); blobBytes += blob.length; tickBytes += ticks.length; }
      else if (s.detail) { extra.push({ part, s }); extraBytes += s.d.length; }
      else { keep.push({ part, s }); fixed += s.d.length; }
    }
    // what fits: the cluster outlines first, then the source's detail, then the leaf ticks
    // (the willow's hanging strands are the source's detail: for it they come before the cluster outlines)
    let room = Math.max(0, BUDGET - fixed), fb, fe;
    if (src === 'tree.willow') { fe = Math.min(1, room / (extraBytes || 1)); room -= fe * extraBytes; fb = Math.min(1, Math.max(0, room) / (blobBytes || 1)); room -= fb * blobBytes; }
    else { fb = Math.min(1, room / (blobBytes || 1)); room -= fb * blobBytes; fe = Math.min(1, Math.max(0, room) / (extraBytes || 1)); room -= fe * extraBytes; }
    const ft = Math.min(1, Math.max(0, room) / (tickBytes || 1));
    for (const { part, s } of keep) {
      const subs = s.d.split(/(?=M)/);
      // a big mass, a twig lattice or a frost line (many subpaths): one subpath in four at every size, the rest as detail
      if (subs.length > 12 && (part === 'crown' || subs.length > 40)) { out[part].push(Object.assign(base(s), { d: subs.filter((_, j) => j % 4 === 0).join(''), detail: false }), Object.assign(base(s), { d: subs.filter((_, j) => j % 4 !== 0).join(''), detail: true })); continue; }
      out[part].push(Object.assign(base(s), { d: s.d, detail: false }));
    }
    // the clusters in their drawing order (dark to light): one in twenty at every size, the rest as detail
    const kb = spread(fb), kt = spread(ft), ke = spread(fe);
    clusters.forEach(({ part, s, blob, ticks }, i) => {
      const tile = i % 20 === 0;
      if (tile || kb()) out[part].push(Object.assign(base(s), { d: blob, detail: !tile }));
      if (ticks && kt()) out[part].push(Object.assign(base(s), { d: ticks, detail: true }));
    });
    for (const { part, s } of extra) if (ke()) out[part].push(Object.assign(base(s), { d: s.d, detail: true }));
    return out;
  };
  const SRC = [
    ['tree.green-oak', 'tree.oak', [791, 635], [0, -120], 1.6, { rx: 120, ry: 14, h: 330 }, ['oak', 'broadleaf']],
    ['tree.green-chestnut', 'tree.horse-chestnut', [713, 594], [0, -110], 1.2, { rx: 140, ry: 15, h: 360 }, ['horse-chestnut', 'broadleaf']],
    ['tree.green-willow', 'tree.willow', [667, 571], [0, -140], 1.8, { rx: 130, ry: 14, h: 330 }, ['willow', 'weeping', 'waterside']],
    ['tree.green-alder', 'tree.alder', [380, 430], [0, -230], 2, { rx: 80, ry: 12, h: 440 }, ['alder', 'waterside']],
    ['tree.green-birch', 'tree.birch', [336, 511], [0, -300], 2.6, { rx: 70, ry: 10, h: 520 }, ['birch', 'slender']],
  ];
  for (const [id, src, size, pivot, deg, shadow, tags] of SRC) {
    sceneObjDefine({
      id, category: 'tree', size, variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
      palette: { base: {}, spring: {}, summer: {}, autumn: {}, winter: {} },
      parts: ['trunk', 'crown'], anim: { sway: { part: 'crown', pivot, deg } }, shadow, reflect: true,
      tags: ['uk', 'green', 'deciduous', 'light'].concat(tags, ['kit:temperate', 'role:tree']),
      credit: `the light form of ${src} (the nature kit's K.tree)`,
      build(v, rnd, ctx) { return light(src, v, (ctx && ctx.season) || 'summer'); },
    });
  }
})();
