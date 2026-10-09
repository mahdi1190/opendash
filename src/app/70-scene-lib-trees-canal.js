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
    oak: { spring: ['#4f7a30', '#7aa444', '#a8cc66'], summer: ['#2c4c24', '#46703a', '#6e9a4c'], autumn: ['#7a4a1c', '#b4702a', '#dca04a'], winter: ['#463a30', '#5a4c40', '#74645a'] },
    alder: { spring: ['#3e6a2c', '#5e8e3c', '#8ab45a'], summer: ['#22401e', '#365e2c', '#557e3e'], autumn: ['#4a5a26', '#6e7432', '#9a8e44'], winter: ['#42382f', '#54473c', '#6e5e52'] },
    willow: { spring: ['#6a9a3a', '#9cc458', '#cce488'], summer: ['#4a7a34', '#6e9e48', '#9cc46a'], autumn: ['#8a8a34', '#b4a844', '#dccc6a'], winter: ['#8a7a3a', '#b49a46', '#d8bc5a'] },
    birch: { spring: ['#5e8a34', '#8ab44a', '#bcdc72'], summer: ['#3e6a2a', '#5e8e3a', '#8ab45a'], autumn: ['#a07a1c', '#d4a42a', '#f0cc4a'], winter: ['#4e403a', '#62524a', '#7a6a60'] },
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
          crown.push({ s: '@leaf.1', w: 1.1, cap: 'round', op: 0.6, d: sceneDraw.twigHaze(r, cx, cy, cw * 0.95, ch * 0.9, S.weep ? 10 : 22) });
          crown.push({ s: '@leaf.0', w: 0.7, cap: 'round', op: 0.45, d: sceneDraw.twigHaze(r, cx, cy, cw, ch, S.weep ? 8 : 16), detail: true });
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

  /* ---------- tree.canal-oak: the hero oak of the canal views (round 2) ----------
     A near, open-grown pedunculate oak as it leans over the Basingstoke Canal: a short, flared bole forking into four to six
     crooked limbs (tapering, elbowed: oak limbs never run straight), each limb carrying its own leaf CLUMP with sky between
     the clumps, so the crown reads as limbs and clumps rather than one cloud. Every clump is three tones (a shade base, the mid
     mass up and left of it, a lit cap on its upper left) broken by small leaf flecks (lit on top, dark underneath) for a leaf
     texture; in autumn the clumps turn unevenly (some still olive-green, some russet, some gold), in winter the limbs, the
     twig sprays and a few marcescent brown leaves stay. Anchor: the foot of the trunk. A hero: a scene holds two to six of
     them; the light tree.bank-* stand behind. */
  {
    const CO = {
      spring: [['#3e6a2a', '#5e8e36', '#94bc56'], ['#4e7a2c', '#76a23e', '#b0d06a']],
      summer: [['#223e1c', '#36602a', '#5e8a40'], ['#2a4a20', '#426e30', '#6e9a4c']],
      autumn: [['#6a3e18', '#a0602a', '#d4943e'], ['#4e5222', '#76722e', '#a89a44'], ['#7a5418', '#b8862a', '#e4b44a']],
      winter: [['#4a3e34', '#5e5044', '#7a6a5c']],
    };
    const tone = (s) => Object.fromEntries(['a', 'b', 'c'].map((k, i) => [k, (CO[s][i] || CO[s][0])]));
    sceneObjDefine({
      id: 'tree.canal-oak', category: 'tree', size: [520, 520], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
      real: { h: 15, w: 16 },
      palette: { base: { bark: ['#4a3c30', '#33281f', '#6e5c48', '#8a7a64'], fleck: ['#e8c460', '#2a2418'] },
        spring: Object.assign(tone('spring'), { fleck: ['#c4e07a', '#2c4a1e'] }), summer: Object.assign(tone('summer'), { fleck: ['#8cb85c', '#18301a'] }),
        autumn: Object.assign(tone('autumn'), { fleck: ['#f0c860', '#4a3016'] }), winter: tone('winter') },
      parts: ['trunk', 'crown'],
      anim: { sway: { part: 'crown', pivot: [0, -150], deg: 1.2 } },
      shadow: { rx: 190, ry: 14, h: 520 }, reflect: true, weight: 1,
      tags: ['uk', 'tree', 'oak', 'broadleaf', 'canal', 'bank', 'deciduous', 'hero', 'kit:temperate', 'role:tree'],
      credit: 'drawn for the Basingstoke Canal views: a hero pedunculate oak (Quercus robur), limbs and clumps',
      build(v, r, ctx) {
        const season = ctx.season, winter = season === 'winter', trunk = [], crown = [];
        const lean = (v - 1) * 14 + rr(r, -6, 6), th = rr(r, 105, 135), w0 = 30;
        const fx = lean * 0.5, fy = -th;
        // the bole: a flared foot, a slight twist, the bark's dark fissures and a lit edge on the left
        trunk.push(['@bark.0', `M${f1(-w0 * 1.5)} 2Q${f1(-w0 * 0.7)} -12 ${f1(-w0 * 0.75)} -34Q${f1(-w0 * 0.6 + fx * 0.4)} ${f1(fy * 0.55)} ${f1(fx - w0 * 0.6)} ${f1(fy)}L${f1(fx + w0 * 0.6)} ${f1(fy)}Q${f1(w0 * 0.7 + fx * 0.45)} ${f1(fy * 0.5)} ${f1(w0 * 0.8)} -30Q${f1(w0 * 0.8)} -10 ${f1(w0 * 1.6)} 2Z`]);
        let fis = '';
        for (let i = 0; i < 7; i++) { const x = rr(r, -w0 * 0.55, w0 * 0.55), y0 = rr(r, -16, fy * 0.3); fis += `M${f1(x + fx * (-y0 / th))} ${f1(y0)}l${f1(rr(r, -3, 3))} ${f1(-rr(r, 18, 40))}`; }
        trunk.push({ s: '@bark.1', w: 1.8, op: 0.75, d: fis, detail: true }, { s: '@bark.2', w: 3, op: 0.55, d: `M${f1(-w0 * 0.62)} -28Q${f1(-w0 * 0.5 + fx * 0.4)} ${f1(fy * 0.5)} ${f1(fx - w0 * 0.45)} ${f1(fy + 4)}` });
        // the limbs: crooked, tapering polygons from the fork to each clump (three elbows), side branches stroked
        const nL = 4 + (v % 3 === 1 ? 2 : 1), limbs = [];
        const taper = (pts, wa, wb) => {
          const Lp = [], Rp = [];
          for (let i = 0; i < pts.length; i++) {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, w = (wa + (wb - wa) * i / (pts.length - 1)) / 2;
            Lp.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rp.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
          }
          return 'M' + Lp.concat(Rp.reverse()).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
        };
        let limbD = '', fine = '';
        for (let i = 0; i < nL; i++) {
          const t = i / (nL - 1), ang = (-1.25 + 2.5 * t) + rr(r, -0.15, 0.15) + lean * 0.004, len = rr(r, 175, 235) * (1 - Math.abs(t - 0.5) * 0.3);
          const pts = [[fx + (t - 0.5) * 14, fy + 6]];
          let x = pts[0][0], y = pts[0][1], a = ang;
          // elbowed: each segment kinks the other way, the outer limbs droop a little at the tip (an open-grown oak spreads wide)
          for (let k = 0; k < 4; k++) { a += (k % 2 ? 1 : -1) * rr(r, 0.2, 0.42) + (k === 3 ? Math.sign(ang) * Math.abs(ang) * 0.25 : 0); const l = len / 4 * rr(r, 0.8, 1.2); x += Math.sin(a) * l; y -= Math.cos(a) * l; pts.push([x, y]); }
          limbD += taper(pts, w0 * 0.75 * rr(r, 0.8, 1), 5);
          limbs.push({ x, y, a, len });
          // side branches from the first and second elbows, each with a smaller clump
          // (outward, away from the crown's middle, so the side clumps fill the spread rather than stack in the centre)
          const out = ang < 0 ? -1 : 1;
          for (let k = 0; k < (Math.abs(t - 0.5) < 0.2 ? 1 : 2); k++) {
            const p = pts[2 + k], b = a + (k ? out * rr(r, 0.6, 1.0) : -out * rr(r, 0.3, 0.6)), l = len * rr(r, 0.25, 0.4), ex = p[0] + Math.sin(b) * l, ey = p[1] - Math.cos(b) * l;
            fine += `M${f1(p[0])} ${f1(p[1])}Q${f1(p[0] + Math.sin(b) * l * 0.5)} ${f1(p[1] - Math.cos(b) * l * 0.6)} ${f1(ex)} ${f1(ey)}`;
            limbs.push({ x: ex, y: ey, a: b, len: l * 1.6, small: true });
          }
        }
        crown.push(['@bark.0', limbD], { s: '@bark.0', w: 4, cap: 'round', d: fine });
        if (winter) {
          const starts = limbs.map(L => [L.x, L.y, L.a + rr(r, -0.2, 0.2), L.len * (L.small ? 0.3 : 0.32)]);
          crown.push({ s: '@bark.0', w: 1.6, cap: 'round', op: 0.85, d: sceneDraw.twigs(r, starts, 3, 0.5) }, { s: '@a.1', w: 0.9, cap: 'round', op: 0.5, d: sceneDraw.twigs(r, starts.map(s => [s[0], s[1], s[2] + 0.4, s[3] * 0.8]), 3, 0.55), detail: true });
          let mar = '';
          for (let i = 0; i < 26; i++) { const L = limbs[Math.floor(r() * limbs.length)]; mar += sceneD.ell(L.x + rr(r, -40, 40), L.y + rr(r, -30, 20), 3, 2.2); }
          crown.push({ f: '@bark.3', op: 0.8, d: mar, detail: true });
          return { trunk, crown };
        }
        // the clumps: one per limb end (the side shoots' clumps smaller), sky left between them. Each clump is a loose cluster of
        // small lobes spread out from its centre (not one cloud), so its rim is broken and light shows through it.
        const keys = season === 'autumn' ? ['a', 'b', 'c'] : ['a', 'b'], T = {};
        for (const k of keys) T[k] = ['', '', ''];
        let flL = '', flD = '';
        limbs.sort((p, q) => (q.small ? 1 : 0) - (p.small ? 1 : 0));
        for (const L of limbs) {
          const R0 = L.small ? rr(r, 30, 40) : rr(r, 46, 60), cx = L.x + Math.sin(L.a) * R0 * 0.35, cy = L.y - R0 * 0.3;
          const t = T[keys[Math.floor(r() * keys.length)]], n = L.small ? 4 : 6;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rr(r, -0.35, 0.35), dd = i === 0 ? 0 : rr(r, 0.6, 0.95), x = cx + Math.cos(a) * R0 * dd, y = cy + Math.sin(a) * R0 * dd * 0.7, rx = R0 * (i === 0 ? 0.55 : rr(r, 0.34, 0.48));
            t[0] += sceneD.lobed(r, f1(x + rx * 0.12), f1(y + rx * 0.16), f1(rx), f1(rx * 0.8), 8, 0.4);
            t[1] += sceneD.lobed(r, f1(x - rx * 0.1), f1(y - rx * 0.14), f1(rx * 0.78), f1(rx * 0.62), 7, 0.38);
            if (y < cy + R0 * 0.15 && x < cx + R0 * 0.45) t[2] += sceneD.lobed(r, f1(x - rx * 0.28), f1(y - rx * 0.3), f1(rx * 0.44), f1(rx * 0.34), 6, 0.34);
          }
          // the leaf texture: lit leaves over the upper-left of the clump and out past its rim, darker leaves in its underside
          for (let i = 0; i < (L.small ? 10 : 18); i++) { const a = rr(r, -2.8, -0.2), d = R0 * rr(r, 0.35, 1.15); flL += sceneD.leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.75, rr(r, -1.4, 1.4), rr(r, 6, 10), 3); }
          for (let i = 0; i < (L.small ? 6 : 10); i++) { const a = rr(r, 0.3, 2.8), d = R0 * rr(r, 0.3, 0.9); flD += sceneD.leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, rr(r, 2.2, 4), rr(r, 6, 9), 3); }
        }
        for (const k of keys) crown.push(['@' + k + '.0', T[k][0]]);
        for (const k of keys) crown.push(['@' + k + '.1', T[k][1]]);
        crown.push({ f: '@fleck.1', op: 0.5, d: flD, detail: true });
        for (const k of keys) crown.push({ f: '@' + k + '.2', d: T[k][2], op: 0.92, detail: true });
        crown.push({ f: '@fleck.0', op: 0.7, d: flL, detail: true });
        return { trunk, crown };
      },
    });
  }

  /* ---------- tree.canal-willow: the hero weeping willow of the canal views (round 2) ----------
     A big weeping willow at the water's edge: a short, leaning, often split bole, three or four limbs arching up and out, and
     from them a dome of hanging whips that falls almost to the ground and sways. The whips are soft tapering ribbons (a darker
     body, a lit one up the sunny side) with narrow leaves lying close along them, alternate and shortening to the tip; behind
     them the dome's shaded inside (a few dark masses) so the curtain has depth, with gaps where the trunk shows through.
     Spring lime with catkins, summer green, autumn yellow-green thinning, winter bare golden whips. Anchor: the foot. */
  {
    const WL = {
      spring: ['#5a8a2e', '#86b440', '#b4d466', '#d4e888'], summer: ['#3a6428', '#56863a', '#80aa52', '#a8c870'],
      autumn: ['#6a7428', '#9a9a36', '#c4b448', '#e0cc66'], winter: ['#8a6a30', '#a8843a', '#c8a048', '#e0bc5a'],
    };
    sceneObjDefine({
      id: 'tree.canal-willow', category: 'tree', size: [520, 470], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
      real: { h: 14, w: 16 },
      palette: { base: { bark: ['#5a4c38', '#3e3426', '#7a6a50'], catkin: '#e0d070' },
        spring: { leaf: WL.spring }, summer: { leaf: WL.summer }, autumn: { leaf: WL.autumn }, winter: { leaf: WL.winter } },
      parts: ['trunk', 'crown'],
      anim: { sway: { part: 'crown', pivot: [0, -150], deg: 1.8 } },
      shadow: { rx: 200, ry: 14, h: 470 }, reflect: true, weight: 1,
      tags: ['uk', 'tree', 'willow', 'weeping', 'waterside', 'canal', 'bank', 'deciduous', 'hero', 'kit:temperate', 'role:tree'],
      credit: 'drawn for the Basingstoke Canal views: a hero weeping willow, whips and leaves',
      build(v, r, ctx) {
        const season = ctx.season, winter = season === 'winter', trunk = [], crown = [];
        const lean = v ? -18 : 14, th = rr(r, 90, 115), w0 = 26, fx = lean, fy = -th;
        trunk.push(['@bark.0', `M${f1(-w0 * 1.4)} 2Q${f1(-w0 * 0.7)} -14 ${f1(-w0 * 0.7 + fx * 0.3)} ${f1(fy * 0.45)}Q${f1(-w0 * 0.55 + fx * 0.8)} ${f1(fy * 0.85)} ${f1(fx - w0 * 0.55)} ${f1(fy)}L${f1(fx + w0 * 0.55)} ${f1(fy)}Q${f1(w0 * 0.6 + fx * 0.7)} ${f1(fy * 0.6)} ${f1(w0 * 0.75)} -24Q${f1(w0 * 0.8)} -8 ${f1(w0 * 1.5)} 2Z`]);
        let fis = '';
        for (let i = 0; i < 6; i++) { const x = rr(r, -w0 * 0.5, w0 * 0.5), y0 = rr(r, -10, fy * 0.5); fis += `M${f1(x + fx * (-y0 / th))} ${f1(y0)}l${f1(rr(r, -2, 4))} ${f1(-rr(r, 20, 40))}`; }
        trunk.push({ s: '@bark.1', w: 2, op: 0.7, d: fis, detail: true });
        // the limbs: arching up and out, their tips the dome's crown line
        const limbs = [], nL = 4;
        let limbD = '';
        for (let i = 0; i < nL; i++) {
          const t = i / (nL - 1), a = -1.0 + 2.0 * t + rr(r, -0.12, 0.12), L = rr(r, 150, 200) * (1 - Math.abs(t - 0.5) * 0.3);
          const x0 = fx + (t - 0.5) * 16, y0 = fy + 4, x1 = x0 + Math.sin(a) * L * 0.45, y1 = y0 - L * (0.75 + 0.35 * Math.cos(a)), x2 = x0 + Math.sin(a) * L * 1.05, y2 = y1 + Math.abs(Math.sin(a)) * L * 0.22 - L * 0.12;
          const ww = w0 * 0.7, wb = 4, n = Math.hypot(x2 - x0, y2 - y0) || 1, nx = -(y2 - y0) / n, ny = (x2 - x0) / n;
          limbD += `M${f1(x0 - nx * ww / 2)} ${f1(y0 - ny * ww / 2)}Q${f1(x1)} ${f1(y1)} ${f1(x2 - nx * wb / 2)} ${f1(y2 - ny * wb / 2)}L${f1(x2 + nx * wb / 2)} ${f1(y2 + ny * wb / 2)}Q${f1(x1 + nx * ww * 0.4)} ${f1(y1 + ny * ww * 0.4)} ${f1(x0 + nx * ww / 2)} ${f1(y0 + ny * ww / 2)}Z`;
          limbs.push([x0, y0, x1, y1, x2, y2]);
        }
        crown.push(['@bark.0', limbD]);
        // the dome's shaded inside: a few dark masses under the crown line (not in winter)
        const top = Math.min(...limbs.map(l => Math.min(l[3], l[5]))), cx = fx, span = 230;
        if (!winter) {
          let dk = '';
          for (let i = 0; i < 6; i++) { const x = cx + rr(r, -span * 0.55, span * 0.55), y = top + rr(r, 20, 70) + Math.abs(x - cx) * 0.3, rx = rr(r, 40, 64); dk += sceneD.lobed(r, f1(x), f1(y), f1(rx), f1(rx * 0.9), 8, 0.3); }
          crown.push({ f: '@leaf.0', op: 0.85, d: dk });
        }
        // the whips: from points along each limb's arc, hanging to the dome's skirt (longest at the sides of the dome)
        let whips = '', bodyD = '', bodyL = '', cat = '';
        const leaves = ['', '', '', ''], nW = winter ? 56 : 48;
        for (let i = 0; i < nW; i++) {
          const lb = limbs[i % nL], u = 0.2 + r() * 0.8, iu = 1 - u;
          const ax = iu * iu * lb[0] + 2 * iu * u * lb[2] + u * u * lb[4] + rr(r, -14, 14), ay = iu * iu * lb[1] + 2 * iu * u * lb[3] + u * u * lb[5] + rr(r, -6, 10);
          const skirt = -rr(r, 6, 40) - Math.max(0, 1 - Math.abs(ax - cx) / span) * rr(r, 10, 60), Lh = Math.max(60, skirt - ay);
          const ex = ax + (ax - cx) * 0.08 + rr(r, -8, 8) + 10, ey = ay + Lh, qx = ax + (ax - cx) * 0.06, qy = ay + Lh * 0.5;
          const P = (t) => { const s = 1 - t; return [s * s * ax + 2 * s * t * qx + t * t * ex, s * s * ay + 2 * s * t * qy + t * t * ey]; };
          const Tg = (t) => { const dx = 2 * (1 - t) * (qx - ax) + 2 * t * (ex - qx), dy = 2 * (1 - t) * (qy - ay) + 2 * t * (ey - qy), m = Math.hypot(dx, dy) || 1; return [dx / m, dy / m]; };
          whips += `M${f1(ax)} ${f1(ay)}Q${f1(qx)} ${f1(qy)} ${f1(ex)} ${f1(ey)}`;
          if (winter) continue;
          const lit = ax < cx - span * 0.1 ? r() < 0.7 : r() < 0.3, Lp = [], Rp = [];
          for (let k = 0; k <= 6; k++) { const t = k / 6, p = P(t), g = Tg(t), w = 4.5 * Math.min(1, 0.3 + t * 5) * (1 - t * 0.85) + 0.4; Lp.push([p[0] - g[1] * w, p[1] + g[0] * w]); Rp.push([p[0] + g[1] * w, p[1] - g[0] * w]); }
          const rib = 'M' + Lp.concat(Rp.reverse()).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
          if (lit) bodyL += rib; else bodyD += rib;
          const step = season === 'autumn' ? 15 : 12, nLf = Math.floor(Lh / step);
          for (let j = 0; j < nLf; j++) {
            if (season === 'autumn' && r() < 0.25) continue;
            const t = 0.04 + 0.94 * j / nLf, p = P(t), g = Tg(t), sd = j % 2 ? 1 : -1, sp = (0.3 + r() * 0.3) * sd;
            const ux = g[0] * Math.cos(sp) - g[1] * Math.sin(sp), uy = g[0] * Math.sin(sp) + g[1] * Math.cos(sp), len = (18 - 8 * t) * (0.8 + r() * 0.3), w = len * 0.16;
            const mx = p[0] + ux * len * 0.45, my = p[1] + uy * len * 0.45;
            leaves[lit ? (sd < 0 ? 3 : 2) : (sd < 0 ? 2 : 1)] += `M${f1(p[0])} ${f1(p[1])}Q${f1(mx - uy * w)} ${f1(my + ux * w)} ${f1(p[0] + ux * len)} ${f1(p[1] + uy * len)}Q${f1(mx + uy * w)} ${f1(my - ux * w)} ${f1(p[0])} ${f1(p[1])}Z`;
          }
          if (season === 'spring' && r() < 0.4) { const p = P(0.2 + r() * 0.5); cat += sceneD.ell(p[0] + 2, p[1], 1.6, 4.5); }
        }
        crown.push({ s: winter ? '@leaf.2' : '@bark.2', w: winter ? 1.6 : 1, cap: 'round', op: winter ? 0.9 : 0.7, d: whips });
        if (winter) { crown.push({ s: '@leaf.3', w: 0.9, cap: 'round', op: 0.6, d: sceneDraw.twigHaze(r, cx, top + 40, span * 0.6, 70, 10), detail: true }); return { trunk, crown }; }
        crown.push({ f: '@leaf.1', op: 0.75, d: bodyD }, { f: '@leaf.2', op: 0.75, d: bodyL });
        leaves.forEach((d, i) => { if (d) crown.push({ f: '@leaf.' + i, d, detail: i === 1 }); });
        if (cat) crown.push({ f: '@catkin', d: cat, detail: true });
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
      if (winter) {   // bare: the limbs out of the trunk top and the fine twig haze (the willow's in its golden stems)
        const y0 = cy + ch * 0.5, lim = sceneDraw.twigs(r, [[-2, y0, -0.7, ch * 0.55], [2, y0, 0.65, ch * 0.55], [0, y0, 0, ch * 0.7]], 2, 0.4);
        body.push({ s: '@bark.0', w: 3, cap: 'round', d: lim }, { s: '@' + slot + (k === 'willow' ? '.2' : '.1'), w: 1.2, cap: 'round', op: 0.6, d: sceneDraw.twigHaze(r, 0, cy, cw * 0.95, ch * 0.9, 20) });
        return { body };
      }
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
