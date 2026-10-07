/* ============================================================
   SCENE LIBRARY: trees, the EAST-ASIAN kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per (variant, season): shapeBySeason.

   tree.cherry           a flowering cherry: a spreading crown on a dark, often leaning trunk.
                         Spring: clouds of pale pink blossom; summer: green; autumn: orange
                         and red; winter: bare twigs (snow on the limbs) (3 variants)
   tree.maple-japanese   a Japanese maple: layered, airy tiers of small leaves on fine limbs.
                         Spring: fresh green with red tips; summer: green; autumn: blazing red
                         and orange; winter: bare (3 variants)
   tree.cedar            the tall Japanese cedar of temple hillsides: a straight trunk, a narrow
                         dark cone of drooping sprays; bronze-tinted in winter, with snow on
                         the sprays (3 variants)
   Lit from the LEFT. Anchor: the ground at the trunk.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, blob, ell, define, seasons } = sceneDraw;
  const rr = (r, a, b) => a + r() * (b - a);
  /** A branching limb system: returns { byDepth: [path, ...], tips: [[x, y], ...] }. */
  function limbs(r, x, y, ang, len, depth, spread, out) {
    out = out || { byDepth: ['', '', '', '', ''], tips: [], nodes: [] };
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, bend = rr(r, -0.25, 0.25);
    out.byDepth[Math.min(4, 4 - depth)] += `M${f1(x)} ${f1(y)}Q${f1((x + ex) / 2 + Math.cos(ang + 1.57) * len * bend * 0.3)} ${f1((y + ey) / 2 + Math.sin(ang + 1.57) * len * bend * 0.3)} ${f1(ex)} ${f1(ey)}`;
    if (depth <= 0) { out.tips.push([ex, ey]); return out; }
    if (depth <= 2) out.nodes.push([ex, ey]);
    const n = depth > 2 ? 2 : r() < 0.5 ? 2 : 3;
    for (let i = 0; i < n; i++) limbs(r, ex, ey, ang + (i / (n - 1 || 1) - 0.5) * spread + rr(r, -0.2, 0.2), len * rr(r, 0.62, 0.78), depth - 1, spread, out);
    return out;
  }
  const widths = [1, 1.8, 3, 5, 8];

  /* ---------- tree.cherry ---------- */
  define({
    id: 'tree.cherry', category: 'tree', size: [230, 200], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { bark: ['#4a3a34', '#2e2420', '#6a5650'], snow: ['#f4f8fc', '#d6e0ea'] } }, seasons({
      leaf: { spring: ['#f6c8d6', '#fbe4ec', '#e8a2b8', '#ffffff'], summer: ['#3e6a32', '#5a8a3e', '#2a4e26', '#7aa04a'], autumn: ['#c8502a', '#e08038', '#9a3424', '#f0b048'], winter: ['#6a5650', '#4a3a34', '#2e2420', '#8a7670'] },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -110], deg: 1.4 } },
    shadow: { rx: 90, ry: 10, h: 180 },
    reflect: true,
    tags: ['east-asian', 'blossom', 'cherry', 'kit:east-asian', 'kit:temperate', 'role:tree'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const s = ctx.season, trunk = [], crown = [], lean = [-0.12, 0.08, 0.2][v];
      const L = limbs(r, 0, 0, -Math.PI / 2 + lean, 70, 4, 1.25);
      trunk.push({ s: '@bark.1', w: 11, d: L.byDepth[0] }, { s: '@bark.0', w: 7, d: L.byDepth[0] }, { s: '@bark.0', w: 5, d: L.byDepth[1] }, { s: '@bark.0', w: 3, d: L.byDepth[2] });
      crown.push({ s: '@bark.0', w: 1.8, d: L.byDepth[3] }, { s: '@bark.2', w: 1, d: L.byDepth[4] });
      if (s === 'winter') {
        crown.push({ s: '@snow.0', w: 2, op: 0.9, d: L.byDepth[1] + L.byDepth[2] });
        // snow lying in the forks and along the upper limbs, and the winter buds at the tips (filled, so the season reads at a glance)
        let sn = '', bud = '';
        for (const [x, y] of L.nodes) sn += blob(r, x, y - 2, rr(r, 7, 12), rr(r, 3, 5), 6, 0.35);
        for (const [x, y] of L.tips) bud += ell(x, y, 1.6, 1.6);
        crown.push(['@snow.0', sn, 0.95], ['@leaf.3', bud, 0.9]);
        return { trunk, crown };
      }
      // the crown: soft clumps round the limb tips, the blossom (or leaves) lighter top-left
      const c = ['', '', '', ''];
      for (const [x, y] of L.tips.concat(L.nodes, L.nodes)) for (let k = 0; k < 2; k++) {
        const px = x + rr(r, -16, 16), py = y + rr(r, -12, 8), d = blob(r, px, py, rr(r, 15, 23), rr(r, 11, 16), 8, 0.4);
        c[px < -10 && py < -150 ? 1 : py > -110 ? 2 : r() < 0.5 ? 0 : 3] += d;
      }
      // the crown's coarse mass first (what a tile shows), the clumps over it at full size
      const xs = L.tips.map(t => t[0]), ys = L.tips.map(t => t[1]), mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
      crown.push(['@leaf.2', blob(r, mx, my + 8, (Math.max(...xs) - Math.min(...xs)) * 0.42, (Math.max(...ys) - Math.min(...ys)) * 0.42 + 6, 12, 0.3)]);
      crown.push({ f: '@leaf.2', d: c[2], detail: true }, { f: '@leaf.0', d: c[0], detail: true }, { f: '@leaf.3', d: c[3], op: 0.9, detail: true }, ['@leaf.1', c[1]]);
      if (s === 'spring') { let p = ''; for (let i = 0; i < 40; i++) { const t = L.tips[i % L.tips.length]; p += ell(t[0] + rr(r, -18, 18), t[1] + rr(r, -14, 14), 1.6, 1.6); } crown.push(['@leaf.3', p]); }
      return { trunk, crown };
    },
  });

  /* ---------- tree.maple-japanese ---------- */
  define({
    id: 'tree.maple-japanese', category: 'tree', size: [170, 150], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { bark: ['#5a4a40', '#3a2e28'], snow: '#f2f6fa' } }, seasons({
      leaf: { spring: ['#8aba48', '#b8d860', '#5e8a3a', '#b8784a'], summer: ['#4a8a34', '#6aaa44', '#2e6428', '#88bc54'], autumn: ['#d8302a', '#f0602a', '#a81e24', '#f8a030'], winter: ['#5a4a40', '#3a2e28', '#7a6a60', '#5a4a40'] },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -80], deg: 1.8 } },
    shadow: { rx: 70, ry: 8, h: 130 },
    reflect: true,
    tags: ['east-asian', 'maple', 'autumn-colour', 'kit:east-asian', 'kit:temperate', 'role:tree'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const s = ctx.season, trunk = [], crown = [];
      const L = limbs(r, 0, 0, -Math.PI / 2 + [0.1, -0.15, 0.25][v], 46, 4, 1.5);
      trunk.push({ s: '@bark.1', w: 8, d: L.byDepth[0] }, { s: '@bark.0', w: 5, d: L.byDepth[0] + L.byDepth[1] }, { s: '@bark.0', w: 2.6, d: L.byDepth[2] });
      crown.push({ s: '@bark.0', w: 1.4, d: L.byDepth[3] + L.byDepth[4] });
      if (s === 'winter') {
        let sn = '';
        for (const [x, y] of L.nodes) sn += blob(r, x, y - 2, rr(r, 6, 10), rr(r, 2.4, 4), 6, 0.35);
        crown.push({ s: '@snow', w: 1.6, op: 0.85, d: L.byDepth[1] + L.byDepth[2] }, ['@snow', sn, 0.95]);
        return { trunk, crown };
      }
      // layered tiers: flattened clumps (lighter on top), small leaf flecks at the edges
      const c = ['', '', '', ''];
      for (const [x, y] of L.tips.concat(L.nodes)) {
        c[y < -110 ? 1 : y > -70 ? 2 : 0] += blob(r, x + rr(r, -8, 8), y, rr(r, 14, 22), rr(r, 6, 9), 8, 0.45);
        c[3] += blob(r, x + rr(r, -10, 10), y - 4, rr(r, 5, 8), rr(r, 3, 5), 6, 0.5);
      }
      const xs = L.tips.map(t => t[0]), ys = L.tips.map(t => t[1]), mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
      crown.push(['@leaf.2', blob(r, mx, my + 6, (Math.max(...xs) - Math.min(...xs)) * 0.42, (Math.max(...ys) - Math.min(...ys)) * 0.42 + 4, 12, 0.35)]);
      crown.push({ f: '@leaf.2', d: c[2], detail: true }, { f: '@leaf.0', d: c[0], detail: true }, ['@leaf.1', c[1]], { f: '@leaf.3', d: c[3], op: 0.9, detail: true });
      return { trunk, crown };
    },
  });

  /* ---------- tree.cedar ---------- */
  define({
    id: 'tree.cedar', category: 'tree', size: [90, 280], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { bark: ['#6a4a34', '#4a3424'], snow: ['#f4f8fc', '#d4dee8'] } }, seasons({
      needle: { spring: ['#2e5232', '#466a40', '#1e3a24'], summer: ['#264a2c', '#3a6038', '#183420'], autumn: ['#32502e', '#4a663a', '#203a22'], winter: ['#4a4a30', '#62603a', '#33341f'] },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -40], deg: 0.9 } },
    shadow: { rx: 34, ry: 6, h: 260 },
    reflect: true,
    tags: ['east-asian', 'conifer', 'temple', 'kit:east-asian', 'kit:alpine', 'role:tree'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const trunk = [], crown = [], h = [260, 230, 280][v], w = [62, 54, 70][v];
      trunk.push(['@bark.0', `M-6 0L-3 ${-h * 0.95}H3L6 0z`], ['@bark.1', `M1 0L1 ${-h * 0.95}H3L6 0z`, 0.7]);
      // tiers of drooping sprays, a narrow cone, darker on the right
      const t0 = [], t1 = [], t2 = [];
      for (let i = 0; i < 16; i++) {
        const y = -h * 0.2 - i * (h * 0.78) / 16, k = 1 - (i / 16), ww = w * (0.25 + 0.75 * k) * rr(r, 0.85, 1.1);
        const left = `M0 ${f1(y - 10)}Q${f1(-ww * 0.6)} ${f1(y - 6)} ${f1(-ww)} ${f1(y + 6)}Q${f1(-ww * 0.5)} ${f1(y + 3)} 0 ${f1(y + 4)}z`;
        const right = `M0 ${f1(y - 10)}Q${f1(ww * 0.6)} ${f1(y - 6)} ${f1(ww)} ${f1(y + 6)}Q${f1(ww * 0.5)} ${f1(y + 3)} 0 ${f1(y + 4)}z`;
        t0.push(left); t2.push(right);
        if (i % 2) t1.push(blob(r, -ww * 0.4, y - 2, ww * 0.35, 5, 6, 0.4));
      }
      crown.push(['@needle.0', t0.join('')], ['@needle.2', t2.join('')], { f: '@needle.1', d: t1.join(''), op: 0.9, detail: true }, ['@needle.0', `M-4 ${-h * 0.96}L0 ${-h - 8}L4 ${-h * 0.96}z`]);
      if (ctx.season === 'winter') {
        let sn = '';
        for (let i = 1; i < 16; i += 2) { const y = -h * 0.2 - i * (h * 0.78) / 16, ww = w * (0.25 + 0.75 * (1 - i / 16)); sn += `M${f1(-ww * 0.9)} ${f1(y + 4)}Q${f1(-ww * 0.5)} ${f1(y - 6)} 0 ${f1(y - 9)}Q${f1(ww * 0.4)} ${f1(y - 6)} ${f1(ww * 0.7)} ${f1(y + 2)}Q${f1(0)} ${f1(y - 3)} ${f1(-ww * 0.9)} ${f1(y + 4)}z`; }
        crown.push(['@snow.0', sn, 0.92]);
      }
      return { trunk, crown };
    },
  });
})();
