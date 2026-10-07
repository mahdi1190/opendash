/* ============================================================
   SCENE LIBRARY: light pond-side trees (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint tree.pond-alder,tree.pond-oak,tree.pond-willow,tree.pond-birch,tree.pond-pine,tree.pond-wood

   Fleet Pond is ringed by trees: alder and willow carr at the water, oak
   and birch on the drier banks, Scots pines on the heathy rises (the tall
   flat-topped pine on the island is the view's landmark tree), and a
   continuous wood on the far shores. A wide view of the pond holds a
   hundred or more trees, so these are LIGHT: a crown is a few masses in
   three tones (shade, mid, lit), each tone one merged path (1 to 3 KB a
   variant). The lit tone, the fine limbs and the twigs are marked `detail`,
   so a tile-sized still (LOD < .5) drops them and stays within its budget.

     tree.pond-alder   dark, upright oval crown, the waterside tree (3 variants)
     tree.pond-oak     broad, heavy, round crown on a short trunk (3 variants)
     tree.pond-willow  a weeping curtain of fine stems (2 variants)
     tree.pond-birch   white stem, small airy crown (2 variants)
     tree.pond-pine    Scots pine: tall orange upper stem, flat dark plates (3 variants)
     tree.pond-wood    a far tree-line segment: 5 to 7 mixed crowns and a pine (4 variants)

   Anchor: the foot of the trunk (tree.pond-wood: the middle of its foot).
   Winter (shapeBySeason): the broadleaves drop to their branches and a
   see-through twig haze; the willow keeps golden stems; pines stay green.
   Light from the upper left, as in the rest of the library.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  /** A lobed mass: a ring of n points joined by outward bumps (compact path data). */
  const ring = (r, cx, cy, rx, ry, n) => {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.3, k = 0.82 + r() * 0.26; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    const f1 = Math.round;   // whole units: lighter path data, invisible at any drawn size
    let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - cx, oy = my - cy, l = Math.hypot(ox, oy) || 1, b = 0.2 + r() * 0.18;
      d += 'Q' + f1(mx + ox / l * rx * b) + ' ' + f1(my + oy / l * ry * b) + ' ' + f1(q[0]) + ' ' + f1(q[1]);
    }
    return d + 'Z';
  };
  /** A tapering trunk from the foot (0, 0) to (x1, y1). */
  const trunkD = (w0, x1, y1, w1) => `M${f1(-w0)} 1Q${f1(-w0 * 0.6 + x1 * 0.3)} ${f1(y1 * 0.45)} ${f1(x1 - w1)} ${f1(y1)}L${f1(x1 + w1)} ${f1(y1)}Q${f1(w0 * 0.7 + x1 * 0.3)} ${f1(y1 * 0.45)} ${f1(w0)} 1Z`;
  /** Limbs from (x, y): [thick, fine] path strings (recursive, deterministic). */
  const limbs = (r, x, y, a, len, depth, out, spread) => {
    const rad = a * Math.PI / 180, x2 = x + Math.sin(rad) * len, y2 = y - Math.cos(rad) * len;
    out[depth >= 2 ? 0 : 1] += `M${f1(x)} ${f1(y)}Q${f1((x + x2) / 2 + rr(r, -len * 0.1, len * 0.1))} ${f1((y + y2) / 2)} ${f1(x2)} ${f1(y2)}`;
    if (depth <= 0) return;
    for (let i = 0; i < 2; i++) limbs(r, x2, y2, a + (i ? 1 : -1) * spread * rr(r, 0.6, 1.1), len * rr(r, 0.6, 0.75), depth - 1, out, spread);
  };
  /** Crown masses in an ellipse: [shade, mid, lit] merged paths. */
  const crown = (r, cx, cy, w, h, n, lobe, flat) => {
    const t = ['', '', ''];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rr(r, -0.4, 0.4), d = i === 0 ? 0 : Math.sqrt(rr(r, 0.35, 1)) * 0.72;
      const x = cx + Math.cos(a) * w * d, y = cy + Math.sin(a) * h * d * (flat || 1), rx = lobe * rr(r, 0.8, 1.2), ry = rx * (flat ? 0.6 : 0.88);
      t[0] += ring(r, x + rx * 0.14, y + ry * 0.2, rx, ry, 7);
      t[1] += ring(r, x - rx * 0.04, y - ry * 0.06, rx * 0.84, ry * 0.8, 7);
      if (y < cy + h * 0.2 && x < cx + w * 0.35) t[2] += ring(r, x - rx * 0.3, y - ry * 0.32, rx * 0.44, ry * 0.4, 7);
    }
    return t;
  };

  const LEAF = {
    oak: { spring: ['#4a7430', '#73a044', '#a6cc66'], summer: ['#2c4c24', '#46703a', '#6e9a4c'], autumn: ['#7a4a1c', '#b4702a', '#dca04a'], winter: ['#5a5048', '#7a6e62', '#9a8e80'] },
    alder: { spring: ['#3a662a', '#5a8a3a', '#88b258'], summer: ['#213e1e', '#355c2c', '#557e3e'], autumn: ['#4a5a26', '#6e7432', '#9a8e44'], winter: ['#4e463e', '#6a5a4e', '#866e5e'] },
    willow: { spring: ['#6a9a3a', '#9cc458', '#cce488'], summer: ['#4a7a34', '#6e9e48', '#9cc46a'], autumn: ['#8a8a34', '#b4a844', '#dccc6a'], winter: ['#8a7a3a', '#b49a46', '#d8bc5a'] },
    birch: { spring: ['#5e8a34', '#8ab44a', '#bcdc72'], summer: ['#3e6a2a', '#5e8e3a', '#8ab45a'], autumn: ['#a07a1c', '#d4a42a', '#f0cc4a'], winter: ['#6a5a52', '#8a7268', '#a88c80'] },
    pine: { spring: ['#22442f', '#33604a', '#5a8a60'], summer: ['#1f3f2f', '#2e5540', '#4f7a58'], autumn: ['#213f30', '#325842', '#56805a'], winter: ['#26403a', '#3a5a4e', '#62806e'] },
  };
  const BARK = { oak: ['#4e4034', '#3a2e24', '#6a5a48'], alder: ['#3e3630', '#2e2824', '#5a4e44'], willow: ['#5a4e3a', '#423828', '#7a6a50'], birch: ['#e8e4dc', '#2e2a28', '#c8c0b4'], pine: ['#a65a3a', '#5e3a2c', '#c87850'] };
  const pal = (k) => ({ base: { bark: BARK[k] }, spring: { leaf: LEAF[k].spring }, summer: { leaf: LEAF[k].summer }, autumn: { leaf: LEAF[k].autumn }, winter: { leaf: LEAF[k].winter } });

  const SPEC = {
    oak: { variants: 3, size: [300, 330], trunk: [14, 110], crown: [120, 92], n: 6, lobe: 62, spread: 32, len: 90, deg: 1.4, extra: ['oak', 'broadleaf'] },
    alder: { variants: 3, size: [200, 360], trunk: [9, 120], crown: [70, 120], n: 6, lobe: 42, spread: 22, len: 90, deg: 1.8, extra: ['alder', 'waterside', 'carr'] },
    willow: { variants: 2, size: [300, 320], trunk: [15, 110], crown: [118, 80], n: 6, lobe: 50, spread: 38, len: 85, deg: 2.4, weep: true, extra: ['willow', 'waterside', 'weeping', 'carr'] },
    birch: { variants: 2, size: [150, 360], trunk: [6, 160], crown: [56, 104], n: 6, lobe: 30, spread: 24, len: 90, deg: 2.6, extra: ['birch', 'heath', 'slender'] },
  };
  /** One broadleaf, its foot at (0, 0): { trunk, crown } shape lists. */
  const broadleaf = (k, S, v, r, season) => {
    const winter = season === 'winter', lean = (v - (S.variants - 1) / 2) * 9 + rr(r, -5, 5), th = S.trunk[1] * rr(r, 0.88, 1.1);
    const tx = lean * 0.4, ty = -th, [cw, ch] = S.crown, cy = ty - ch * 0.62, cx = lean * 0.7;
    const trunk = [['@bark.0', trunkD(S.trunk[0], tx, ty, S.trunk[0] * 0.5)], { s: '@bark.1', w: f1(S.trunk[0] * 0.35), op: 0.5, d: `M${f1(S.trunk[0] * 0.35)} 0Q${f1(tx * 0.5 + 3)} ${f1(ty * 0.5)} ${f1(tx + S.trunk[0] * 0.2)} ${f1(ty)}` }];
    if (k === 'birch') { let d = ''; for (let i = 0; i < 8; i++) { const y = -10 - i * th / 8 - rr(r, 0, 8), x = tx * (-y / th); d += `M${f1(x - S.trunk[0] * 0.9)} ${f1(y)}h${f1(rr(r, 3, 7))}`; } trunk.push({ s: '@bark.1', w: 2.4, cap: 'round', d, detail: true }); }
    const br = ['', ''];
    for (let i = 0; i < 3; i++) limbs(r, tx, ty + 6, (i - 1) * S.spread + lean * 0.3, S.len * rr(r, 0.75, 0.95), winter ? 3 : 1, br, S.spread);
    const out = [];
    if (winter) {
      out.push({ s: '@bark.0', w: f1(S.trunk[0] * 0.45), cap: 'round', d: br[0] }, { s: '@bark.2', w: 1.6, cap: 'round', op: 0.85, d: br[1], detail: true });
      const t = crown(r, cx, cy, cw, ch, Math.max(4, S.n - 2), S.lobe * 1.1);
      out.push(['@leaf.0', t[0], 0.24], ['@leaf.1', t[1], 0.2]);
    } else {
      out.push({ s: '@bark.0', w: f1(S.trunk[0] * 0.4), cap: 'round', d: br[0] + br[1], detail: true });
      const t = crown(r, cx, cy, cw, ch, S.n, S.lobe);
      out.push(['@leaf.0', t[0]], ['@leaf.1', t[1]], { f: '@leaf.2', d: t[2], op: 0.9, detail: true });
    }
    if (S.weep) {
      let d = '', e = '';
      for (let i = 0; i < 30; i++) { const x = cx + rr(r, -cw * 1.05, cw * 1.05), y0 = cy + rr(r, -ch * 0.4, ch * 0.3), len = rr(r, ch * 0.8, ch * 1.6) * (1 - Math.abs(x - cx) / (cw * 2.3)); d += `M${f1(x)} ${f1(y0)}q${f1(rr(r, -5, 5))} ${f1(len * 0.5)} ${f1(rr(r, -3, 3))} ${f1(len)}`; }
      for (let i = 0; i < 16; i++) { const x = cx + rr(r, -cw * 0.9, cw * 0.5), y0 = cy + rr(r, -ch * 0.4, ch * 0.2), len = rr(r, ch * 0.6, ch * 1.2); e += `M${f1(x)} ${f1(y0)}q${f1(rr(r, -4, 4))} ${f1(len * 0.5)} ${f1(rr(r, -3, 3))} ${f1(len)}`; }
      out.push({ s: winter ? '@leaf.2' : '@leaf.1', w: 2.6, cap: 'round', op: winter ? 0.8 : 0.95, d });
      if (!winter) out.push({ s: '@leaf.2', w: 1.8, cap: 'round', op: 0.85, d: e, detail: true });
    }
    return { trunk, crown: out };
  };
  for (const [k, S] of Object.entries(SPEC)) {
    sceneObjDefine({
      id: 'tree.pond-' + k, category: 'tree', size: S.size, variants: S.variants, seasonal: true, shapeBySeason: true, flippable: true,
      palette: pal(k), parts: ['trunk', 'crown'],
      anim: { sway: { part: 'crown', pivot: [0, -S.trunk[1]], deg: S.deg } },
      shadow: { rx: S.size[0] * 0.34, ry: 10, h: S.size[1] }, reflect: true, weight: 1,
      tags: ['uk', 'tree', 'light', 'pond', 'fleet-pond', 'deciduous'].concat(S.extra, ['kit:temperate', 'role:tree']),
      credit: 'drawn for Fleet Pond (light lobed masses; detail-marked for tiles)',
      build(v, r, ctx) { return broadleaf(k, S, v, r, ctx && ctx.season); },
    });
  }

  /** A Scots pine, foot at (0, 0): a bare, orange upper stem and flat-topped dark plates. */
  const pine = (v, r, scale) => {
    const h = (210 + v * 25) * scale * rr(r, 0.92, 1.06), lean = (v - 1) * 10 * scale + rr(r, -4, 4), w0 = 7 * scale;
    const trunk = [['@bark.1', trunkD(w0, lean, -h, w0 * 0.45)], { s: '@bark.2', w: f1(w0 * 0.5), op: 0.8, d: `M${f1(-w0 * 0.3)} ${f1(-h * 0.35)}Q${f1(lean * 0.6 - w0 * 0.3)} ${f1(-h * 0.7)} ${f1(lean - w0 * 0.2)} ${f1(-h)}`, detail: true }];
    const plates = [['', '', ''], ''];
    const np = 4 + (v % 2);
    let br = '';
    for (let i = 0; i < np; i++) {
      const t = i / (np - 1 || 1), y = -h * (0.7 + t * 0.34), x = lean * (0.7 + t * 0.34) + (i % 2 ? 1 : -1) * rr(r, 24, 56) * scale * (1 - t * 0.6);
      const w = rr(r, 50, 76) * scale * (1 - t * 0.35), th = rr(r, 18, 26) * scale;
      br += `M${f1(lean * (0.78 + t * 0.26))} ${f1(y + th)}L${f1(x)} ${f1(y + th * 0.4)}`;
      plates[0][0] += ring(r, x + w * 0.06, y + th * 0.3, w, th, 9);
      plates[0][1] += ring(r, x - w * 0.04, y - th * 0.12, w * 0.86, th * 0.72, 9);
      plates[0][2] += ring(r, x - w * 0.36, y - th * 0.38, w * 0.4, th * 0.36, 7);
    }
    const crownS = [{ s: '@bark.0', w: f1(3 * scale), cap: 'round', d: br }, ['@leaf.0', plates[0][0]], ['@leaf.1', plates[0][1]], { f: '@leaf.2', d: plates[0][2], op: 0.85, detail: true }];
    return { trunk, crown: crownS };
  };
  sceneObjDefine({
    id: 'tree.pond-pine', category: 'tree', size: [220, 360], variants: 3, seasonal: true, shapeBySeason: false, flippable: true,
    palette: pal('pine'), parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -200], deg: 1.2 } },
    shadow: { rx: 60, ry: 9, h: 340 }, reflect: true, weight: 1,
    tags: ['uk', 'tree', 'light', 'pond', 'fleet-pond', 'heath', 'evergreen', 'conifer', 'scots-pine', 'kit:temperate', 'role:tree'],
    credit: 'drawn for Fleet Pond (the island pine and the heathy rises)',
    build(v, r) { return pine(v, r, 1); },
  });

  /** The far tree line, one segment: [dx, kind, size] crowns along a 360-unit foot (variants differ in rhythm and mix). */
  const WOOD = [
    [[-150, 'o', 1], [-90, 'a', 0.9], [-30, 'o', 1.15], [40, 'b', 0.8], [95, 'a', 1], [150, 'o', 0.95]],
    [[-160, 'a', 0.95], [-100, 'o', 1.1], [-30, 'p', 1], [30, 'a', 1], [90, 'o', 1.05], [150, 'b', 0.85]],
    [[-150, 'o', 1.2], [-70, 'o', 0.95], [0, 'a', 1.05], [60, 'w', 1], [130, 'a', 0.9]],
    [[-165, 'b', 0.8], [-110, 'a', 1], [-50, 'o', 1], [10, 'a', 0.95], [70, 'p', 0.9], [120, 'o', 1.1], [170, 'a', 0.85]],
  ];
  sceneObjDefine({
    id: 'tree.pond-wood', category: 'tree', size: [440, 220], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { bark: ['#4a4038', '#5e5248', '#e0dcd2'], pine: ['#24402f', '#34563e', '#4a6e50'] },
      spring: { leaf: ['#3f6a34', '#62953f', '#a2cc6a'], alt: ['#4e7a30', '#7aa444', '#b2d478'] },
      summer: { leaf: ['#2c5229', '#46773a', '#7aa756'], alt: ['#24442a', '#3a6234', '#5e8a4a'] },
      autumn: { leaf: ['#7a4a24', '#b07a34', '#d8aa52'], alt: ['#6a5a2a', '#9a8a3a', '#c8b45a'] },
      winter: { leaf: ['#5a5052', '#7a6e70', '#9a8e8c'], alt: ['#544a48', '#6e6260', '#8c8080'] },
    },
    parts: ['body'], shadow: null, reflect: true, weight: 1,
    tags: ['uk', 'tree', 'light', 'pond', 'fleet-pond', 'woodland', 'distant', 'tree-line', 'kit:temperate', 'role:tree'],
    credit: 'drawn for Fleet Pond (the far shores\' wood)',
    build(v, r, ctx) {
      const winter = ctx && ctx.season === 'winter', body = [], stems = [], t = ['', '', ''], ta = ['', '', ''], pn = ['', '', ''];
      let tw = '';
      for (const [dx, k, sz] of WOOD[v] || WOOD[0]) {
        const x = dx + rr(r, -8, 8), h = (k === 'p' ? 200 : k === 'b' ? 170 : 150) * sz * rr(r, 0.9, 1.1);
        stems.push(`M${f1(x - 3)} 0L${f1(x - 1.5)} ${f1(-h * (k === 'p' ? 0.95 : 0.5))}h3L${f1(x + 3)} 0Z`);
        if (k === 'p') {
          for (let i = 0; i < 3; i++) { const y = -h + i * 20, xx = x + (i === 1 ? 16 : i ? -14 : -4), w = 40 - i * 4; pn[0] += ring(r, xx + 3, y + 5, w, 15, 8); pn[1] += ring(r, xx, y, w * 0.86, 10, 8); pn[2] += ring(r, xx - 12, y - 4, w * 0.36, 5, 6); }
          continue;
        }
        const w = (k === 'a' ? 36 : k === 'b' ? 28 : k === 'w' ? 52 : 50) * sz, hh = (k === 'a' ? 64 : k === 'b' ? 56 : 48) * sz, cy = -h + hh * 0.95, dst = k === 'a' || k === 'w' ? ta : t;
        if (winter && k !== 'w') { tw += ring(r, x, cy, w, hh, 8); continue; }
        dst[0] += ring(r, x + w * 0.08, cy + hh * 0.1, w, hh, 8);
        dst[1] += ring(r, x - w * 0.06, cy - hh * 0.08, w * 0.84, hh * 0.78, 8);
        dst[2] += ring(r, x - w * 0.32, cy - hh * 0.34, w * 0.4, hh * 0.34, 7);
      }
      body.push(['@bark.0', stems.join('')]);
      let us = '';   // the understorey and the carr at the foot (ties the crowns into one wood)
      for (let x = -190; x <= 190; x += 46) us += ring(r, x + rr(r, -10, 10), -rr(r, 16, 26), rr(r, 34, 46), rr(r, 18, 28), 7);
      body.push([winter ? '@leaf.0' : '@alt.0', us, winter ? 0.6 : 1]);
      if (tw) body.push(['@leaf.0', tw, 0.5]);
      for (const [g, slot] of [[t, '@leaf.'], [ta, '@alt.']]) if (g[0]) body.push([slot + '0', g[0]], [slot + '1', g[1]], { f: slot + '2', d: g[2], op: 0.75, detail: true });
      if (pn[0]) body.push(['@pine.0', pn[0]], ['@pine.1', pn[1]], { f: '@pine.2', d: pn[2], op: 0.8, detail: true });
      return { body };
    },
  });
})();
