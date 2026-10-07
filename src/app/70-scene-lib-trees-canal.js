/* ============================================================
   SCENE LIBRARY: trees for tree LINES (canal banks, hedgerows, distance)
   (docs/dev/SCENE_ENGINE.md, section 2). PURE: sceneObjDefine calls only,
   built lazily per (variant, season).

   Light trees: a canal, a river or a lane is lined by dozens of trees that
   recede into the distance, and every one of them is a symbol in the SVG
   still and a sprite on the canvas. The detailed nature-kit trees
   (tree.oak, tree.alder ... 100 to 300 KB of path data a variant) are for
   a few hero trees; these are about 3 to 8 KB a variant, so a scene can hold
   a hundred of them and still fit the SVG budgets (1 MB at fill, 150 KB at
   tile). Each crown is three tones of lobed leaf masses (shade, mid, lit),
   merged into one path per tone, over a trunk and the limbs that show in its
   gaps; in winter (shapeBySeason) the leaves give way to the branch
   structure and a haze of twigs (golden stems on the willow).

     tree.bank-oak     broad, round, heavy crown on a short trunk (3 variants)
     tree.bank-alder   dark, upright oval crown, the waterside tree (3 variants)
     tree.bank-willow  a weeping curtain of fine stems (2 variants)
     tree.bank-birch   slender white trunk, small airy crown (2 variants)
     tree.bank-distant a far tree-line tree, about 1 KB: v0 a round oak, v1 an upright alder, v2 a weeping
                       willow (for the far and horizon bands, where 20 to 60 of them stand in the haze)

   Anchor: the foot of the trunk. The crown sways about its base. The sun is on
   the LEFT (lit lobes upper left), as in the rest of the library. At tile sizes (the SVG still at LOD < .5)
   only the mid-tone crown, the trunk and the main limbs are drawn (the rest is `detail`).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const LEAF = {
    oak: { spring: ['#4f7a30', '#7aa444', '#a8cc66'], summer: ['#2c4c24', '#46703a', '#6e9a4c'], autumn: ['#7a4a1c', '#b4702a', '#dca04a'], winter: ['#5a5048', '#7a6e62', '#9a8e80'] },
    alder: { spring: ['#3e6a2c', '#5e8e3c', '#8ab45a'], summer: ['#22401e', '#365e2c', '#557e3e'], autumn: ['#4a5a26', '#6e7432', '#9a8e44'], winter: ['#4e463e', '#6a5a4e', '#866e5e'] },
    willow: { spring: ['#6a9a3a', '#9cc458', '#cce488'], summer: ['#4a7a34', '#6e9e48', '#9cc46a'], autumn: ['#8a8a34', '#b4a844', '#dccc6a'], winter: ['#8a7a3a', '#b49a46', '#d8bc5a'] },
    birch: { spring: ['#5e8a34', '#8ab44a', '#bcdc72'], summer: ['#3e6a2a', '#5e8e3a', '#8ab45a'], autumn: ['#a07a1c', '#d4a42a', '#f0cc4a'], winter: ['#6a5a52', '#8a7268', '#a88c80'] },
  };
  const BARK = { oak: ['#4e4034', '#3a2e24', '#6a5a48'], alder: ['#3e3630', '#2e2824', '#5a4e44'], willow: ['#5a4e3a', '#423828', '#7a6a50'], birch: ['#e8e4dc', '#2e2a28', '#c8c0b4'] };
  const pal = (k) => ({ base: { bark: BARK[k] }, spring: { leaf: LEAF[k].spring }, summer: { leaf: LEAF[k].summer }, autumn: { leaf: LEAF[k].autumn }, winter: { leaf: LEAF[k].winter } });

  /** Branches from (x, y) at angle a (degrees from up), length len: returns [thick, mid, fine] path strings. */
  const branches = (r, x, y, a, len, depth, out, spread) => {
    const rad = a * Math.PI / 180, x2 = x + Math.sin(rad) * len, y2 = y - Math.cos(rad) * len, mx = (x + x2) / 2 + rr(r, -len * 0.08, len * 0.08), my = (y + y2) / 2;
    const k = depth >= 3 ? 0 : depth === 2 ? 1 : 2;
    out[k] += `M${f1(x)} ${f1(y)}Q${f1(mx)} ${f1(my)} ${f1(x2)} ${f1(y2)}`;
    if (depth <= 0) return;
    const n = depth >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) branches(r, x2, y2, a + (i - (n - 1) / 2) * spread + rr(r, -12, 12), len * rr(r, 0.58, 0.74), depth - 1, out, spread);
  };
  /** A crown of lobed leaf masses inside an ellipse (cx, cy, w, h): [shade, mid, lit] path strings. */
  const crownMass = (r, cx, cy, w, h, n, lobe) => {
    const t = ['', '', ''];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.78, x = cx + Math.cos(a) * w * d, y = cy + Math.sin(a) * h * d, rx = lobe * rr(r, 0.75, 1.2);
      t[0] += sceneD.lobed(r, f1(x + rx * 0.18), f1(y + rx * 0.22), f1(rx), f1(rx * 0.86), 9, 0.3);
      t[1] += sceneD.lobed(r, f1(x), f1(y), f1(rx * 0.86), f1(rx * 0.74), 9, 0.3);
      if (y < cy + h * 0.25 && x < cx + w * 0.4) t[2] += sceneD.lobed(r, f1(x - rx * 0.28), f1(y - rx * 0.3), f1(rx * 0.5), f1(rx * 0.42), 8, 0.28);
    }
    return t;
  };
  const trunkPath = (x0, w0, x1, y1, w1) => `M${f1(x0 - w0)} 2Q${f1(x0 - w0 * 0.5)} ${f1(y1 * 0.4)} ${f1(x1 - w1)} ${f1(y1)}L${f1(x1 + w1)} ${f1(y1)}Q${f1(x0 + w0 * 0.6)} ${f1(y1 * 0.4)} ${f1(x0 + w0 * 1.1)} 2Z`;

  const SPEC = {
    oak: { variants: 3, size: [340, 420], trunk: [16, 150], crown: [150, 120, 290], n: 16, lobe: 52, spread: 34, depth: 4, len: 120, extra: ['oak', 'broadleaf'] },
    alder: { variants: 3, size: [220, 430], trunk: [11, 130], crown: [92, 150, 300], n: 14, lobe: 40, spread: 24, depth: 4, len: 120, extra: ['alder', 'waterside'] },
    willow: { variants: 2, size: [330, 400], trunk: [17, 140], crown: [150, 110, 270], n: 12, lobe: 46, spread: 40, depth: 3, len: 110, weep: true, extra: ['willow', 'waterside', 'weeping'] },
    birch: { variants: 2, size: [180, 420], trunk: [7, 170], crown: [74, 130, 310], n: 12, lobe: 30, spread: 26, depth: 4, len: 120, extra: ['birch', 'heath'] },
  };
  for (const [k, S] of Object.entries(SPEC)) {
    sceneObjDefine({
      id: 'tree.bank-' + k, category: 'tree', size: S.size, variants: S.variants, seasonal: true, shapeBySeason: true, flippable: true,
      palette: pal(k), parts: ['trunk', 'crown'],
      anim: { sway: { part: 'crown', pivot: [0, -S.trunk[1]], deg: k === 'willow' ? 2.6 : 1.8 } },
      shadow: { rx: S.size[0] * 0.36, ry: 12, h: S.size[1] }, reflect: true, weight: 1,
      tags: ['uk', 'tree', 'light', 'tree-line', 'canal', 'bank', 'deciduous'].concat(S.extra, ['kit:temperate', 'role:tree']),
      credit: 'drawn for tree lines (after the lobed masses of the nature kit)',
      build(v, r, ctx) {
        const winter = ctx.season === 'winter';
        const lean = (v - (S.variants - 1) / 2) * 10 + rr(r, -6, 6), th = S.trunk[1] * rr(r, 0.88, 1.12);
        const tx = lean * 0.45, ty = -th, [cw, ch, ctop] = S.crown, cy = -(ctop - ch * 0.9) - ch * 0.45, cx = lean * 0.8;
        const trunk = [], crown = [];
        trunk.push(['@bark.0', trunkPath(0, S.trunk[0], tx, ty, S.trunk[0] * 0.55)]);
        trunk.push({ s: '@bark.1', w: f1(S.trunk[0] * 0.35), op: 0.5, detail: true, d: `M${f1(S.trunk[0] * 0.35)} 0Q${f1(tx * 0.5 + 4)} ${f1(ty * 0.5)} ${f1(tx + S.trunk[0] * 0.2)} ${f1(ty)}` });
        if (k === 'birch') { let d = ''; for (let i = 0; i < 9; i++) { const y = -8 - i * th / 9 - rr(r, 0, 8), x = tx * (-y / th); d += `M${f1(x - S.trunk[0] * 0.9)} ${f1(y)}h${f1(rr(r, 3, 8))}`; } trunk.push({ s: '@bark.1', w: 2.4, cap: 'round', d, detail: true }); }
        // limbs (always: they show through the crown's gaps, and carry the winter look)
        const br = ['', '', ''];
        for (let i = 0; i < 3; i++) branches(r, tx, ty + 6, (i - 1) * S.spread * 0.9 + lean * 0.3, S.len * rr(r, 0.75, 0.95), winter ? S.depth : 1, br, S.spread);
        if (winter) {
          crown.push({ s: '@bark.0', w: f1(S.trunk[0] * 0.6), cap: 'round', d: br[0] }, { s: '@bark.0', w: f1(Math.max(2, S.trunk[0] * 0.3)), cap: 'round', d: br[1] }, { s: '@bark.2', w: 1.4, cap: 'round', op: 0.85, d: br[2], detail: true });
          // the twig haze (willow: golden hanging stems)
          const t = crownMass(r, cx, cy, cw, ch, Math.round(S.n * 0.6), S.lobe * 1.1);
          crown.push(['@leaf.0', t[0], 0.22], { f: '@leaf.1', d: t[1], op: 0.18, detail: true });
        } else {
          crown.push({ s: '@bark.0', w: f1(S.trunk[0] * 0.55), cap: 'round', d: br[2], detail: true });
          const t = crownMass(r, cx, cy, cw, ch, S.n, S.lobe);
          crown.push({ f: '@leaf.0', d: t[0], detail: true }, ['@leaf.1', t[1]], { f: '@leaf.2', d: t[2], op: 0.9, detail: true });   // tiles (LOD < .5): the mid tone alone
        }
        if (S.weep) {
          let d = '';
          for (let i = 0; i < 46; i++) { const x = cx + rr(r, -cw * 1.05, cw * 1.05), y0 = cy + rr(r, -ch * 0.5, ch * 0.3), len = rr(r, ch * 0.7, ch * 1.4) * (1 - Math.abs(x - cx) / (cw * 2.2)); d += `M${f1(x)} ${f1(y0)}q${f1(rr(r, -6, 6))} ${f1(len * 0.5)} ${f1(rr(r, -4, 4))} ${f1(len)}`; }
          crown.push({ s: winter ? '@leaf.2' : '@leaf.1', w: 2.4, cap: 'round', op: winter ? 0.8 : 0.95, d });
          if (!winter) { let e = ''; for (let i = 0; i < 26; i++) { const x = cx + rr(r, -cw * 0.9, cw * 0.6), y0 = cy + rr(r, -ch * 0.5, ch * 0.2), len = rr(r, ch * 0.5, ch * 1.1); e += `M${f1(x)} ${f1(y0)}q${f1(rr(r, -5, 5))} ${f1(len * 0.5)} ${f1(rr(r, -3, 3))} ${f1(len)}`; } crown.push({ s: '@leaf.2', w: 1.8, cap: 'round', op: 0.85, d: e, detail: true }); }
        }
        return { trunk, crown };
      },
    });
  }

  /* ---------- tree.bank-distant: the far tree line (one crown tone + a darker base, a stub of trunk) ---------- */
  const DIST = [['oak', 150, 110, 270, 6], ['alder', 88, 150, 300, 5], ['willow', 140, 120, 250, 5]];
  sceneObjDefine({
    id: 'tree.bank-distant', category: 'tree', size: [320, 400], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: { base: { bark: BARK.oak },
      spring: { leaf: LEAF.oak.spring, alt: LEAF.alder.spring, weep: LEAF.willow.spring },
      summer: { leaf: LEAF.oak.summer, alt: LEAF.alder.summer, weep: LEAF.willow.summer },
      autumn: { leaf: LEAF.oak.autumn, alt: LEAF.alder.autumn, weep: LEAF.willow.autumn },
      winter: { leaf: LEAF.oak.winter, alt: LEAF.alder.winter, weep: LEAF.willow.winter } },
    parts: ['body'], shadow: { rx: 110, ry: 10, h: 400 }, reflect: true, weight: 1,
    tags: ['uk', 'tree', 'light', 'tree-line', 'distant', 'canal', 'bank', 'deciduous', 'kit:temperate', 'role:tree'],
    credit: 'drawn for far tree lines (the light bank trees, simplified)',
    build(v, r, ctx) {
      const [k, cw, ch, ctop, n] = DIST[v % 3], winter = ctx.season === 'winter', slot = k === 'oak' ? 'leaf' : k === 'alder' ? 'alt' : 'weep';
      const cy = -(ctop - ch * 0.9) - ch * 0.45, body = [];
      body.push(['@bark.0', `M-9 2L-5 ${f1(cy + ch * 0.5)}L5 ${f1(cy + ch * 0.5)}L9 2Z`]);
      let a = '', b = '';
      for (let i = 0; i < n; i++) {
        const t = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.7, x = Math.cos(t) * cw * d, y = cy + Math.sin(t) * ch * d, rx = cw * rr(r, 0.38, 0.5);
        a += sceneD.lobed(r, f1(x + rx * 0.12), f1(y + rx * 0.16), f1(rx * 1.1), f1(rx), 6, 0.25);
        if (y < cy + ch * 0.1) b += sceneD.lobed(r, f1(x - rx * 0.2), f1(y - rx * 0.22), f1(rx * 0.62), f1(rx * 0.52), 6, 0.25);
      }
      body.push(['@' + slot + '.0', a, winter ? 0.55 : 1], { f: '@' + slot + '.1', d: b, op: winter ? 0.45 : 1, detail: true });
      if (k === 'willow' && !winter) { let d = ''; for (let i = 0; i < 14; i++) { const x = rr(r, -cw, cw), y0 = cy + rr(r, -ch * 0.2, ch * 0.3); d += `M${f1(x)} ${f1(y0)}l${f1(rr(r, -3, 3))} ${f1(rr(r, ch * 0.5, ch))}`; } body.push({ s: '@weep.2', w: 3, op: 0.8, d, detail: true }); }
      return { body };
    },
  });
})();
