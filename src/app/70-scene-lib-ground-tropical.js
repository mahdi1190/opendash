/* ============================================================
   SCENE LIBRARY: ground, the tropical kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   variant.

   ground.monsoon-puddle  standing water after a monsoon downpour: wide
                          flat puddles in perspective, a dark wet rim, the
                          sky reflected light at the far edge and dark at
                          the near, broken into dashes by the ripples
                          (after real dusk they light: the night sky and
                          a street lamp), raindrop rings and splashes (the
                          'rings' part flickers, so the rain keeps
                          falling). v0 two puddles, v1 one long sheet, v2
                          puddles with fallen frangipani flowers and leaves.

   One look all year (it is the rain, not the season). Anchor: the middle
   of the ground patch.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const D = Math.PI / 180;
  const P = p => `${f1(p[0])} ${f1(p[1])}`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const lobed = (r, cx, cy, rx, ry, n, rag) => {
    const a0 = r() * 6.283, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, k = 1 - rag * r() * .6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = 'M' + P(pts[0]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], b = 1.12 + rag * r() * .2; d += `Q${f1(cx + ((p[0] + q[0]) / 2 - cx) * b)} ${f1(cy + ((p[1] + q[1]) / 2 - cy) * b)} ${P(q)}`; }
    return d + 'z';
  };
  const LAYOUT = [
    [[-48, -2, 62, 8], [56, 3, 40, 6]],
    [[0, 0, 104, 9]],
    [[-60, -1, 46, 7], [30, 2, 54, 7.5], [100, -3, 18, 3.5]],
  ];
  defineObj({
    id: 'ground.monsoon-puddle', category: 'ground', size: [230, 26], variants: 3, seasonal: false, flippable: true, parts: ['body', 'rings'],
    palette: { base: {
      wet: ['#3e342a', '#4e4436', '#5e5242'], sky: ['#3e5260', '#7a929e', '#b8c8d0'], sheen: '#e8f0f4', ring: '#e4eef2', drop: '#d8e6ee',
      bloom: ['#fbf8ee', '#f2c63a'], leaf: ['#7a8a3a', '#a8903a'],
    } },
    night: { glow: { sky: '#6a7ea6', lamp: '#f0c878' }, on: .8 },   // the reflections after real dusk: the night sky's glow and a street lamp
    anim: { flicker: { part: 'rings', op: [.15, 1], period: 1.1 } },
    tags: ['tropical', 'monsoon', 'rain', 'puddle', 'street', 'path', 'wet', 'kit:tropical', 'kit:water', 'kit:urban', 'role:ground'],
    credit: 'drawn for the tropical kit',
    build(v, r) {
      const body = [], rings = [];
      let wet = '', wet2 = '', ring = '', drop = '', sky = '', lamp = '';
      /** A thin lens (one dash of a rippled reflection) about w wide at (x, y); whole-unit x and an even width (lighter markup). */
      const dash = (x, y, w, h) => { const q = Math.max(1, Math.round(w / 2)); return `M${Math.round(x)} ${f1(y)}q${q} ${f1(-h)} ${2 * q} 0q${-q} ${f1(h)} ${-2 * q} 0z`; };
      LAYOUT[v].forEach(([x, y, rx, ry], i) => {
        // the reflection, broken into dashes by the ripples: the sky in rows (long at the far edge), and in the first puddle a
        // street lamp's vertical streak; both are glow shapes, so after real dusk they light (cool sky, warm lamp) on the dark water
        for (let k = 0; k < 3; k++) { const dy = (k * .45 - .55) * ry, half = rx * Math.sqrt(1 - (dy / ry) * (dy / ry)) * .8; for (let j = 0; j < 3 - k; j++) { const w = rx * rr(r, .14, .3) * (1 - k * .2), xx = x + rr(r, -half, half - w); sky += dash(xx, y + dy, w, 1.3 - k * .3); } }
        if (!i) [[-.6, 12], [-.1, 8], [.4, 5]].forEach(([k, w]) => { lamp += dash(x + rx * .3 - w / 2, y + k * ry, w, 1.5); });
      });
      for (const [x, y, rx, ry] of LAYOUT[v]) {
        wet += lobed(r, x, y, rx + 6, ry + 2.6, 11, .35);
        wet2 += lobed(r, x + 2, y + .6, rx + 3, ry + 1.6, 11, .3);
        const water = lobed(r, x, y, rx, ry, 12, .3);
        body.push({ f: { lin: [[0, '@sky.2'], [.45, '@sky.1'], [1, '@sky.0']], x1: 0, y1: y - ry, x2: 0, y2: y + ry }, d: water });
        body.push({ s: '@sheen', w: .9, op: .55, d: `M${f1(x - rx * .55)} ${f1(y - ry * .45)}q${f1(rx * .3)} ${f1(-ry * .15)} ${f1(rx * .6)} 0` });   // the near sheen is now the reflection's dashes
        const n = Math.round(rx / 9);
        for (let i = 0; i < n; i++) {
          const px = x + rr(r, -rx * .75, rx * .75), py = y + rr(r, -ry * .55, ry * .55), rr0 = rr(r, 2.4, 6.5);
          ring += ell(px, py, rr0, rr0 * .3);
          if (r() < .55) ring += ell(px, py, rr0 * .5, rr0 * .15);
          if (r() < .5) drop += `M${f1(px)} ${f1(py - 1)}v-2.6M${f1(px - 1.6)} ${f1(py - .6)}l-1 -1.6M${f1(px + 1.6)} ${f1(py - .6)}l1 -1.6`;
        }
      }
      body.unshift(['@wet.0', wet, .45], ['@wet.1', wet2, .7]);
      body.push({ f: '@sky.2', d: sky, op: .55, glow: 'sky' }, { f: '@sky.1', d: lamp, op: .6, glow: 'lamp' });
      if (v === 2) {
        let fl = '', ey = '', lf = '';
        for (let i = 0; i < 7; i++) {
          const x = rr(r, -100, 110), y = rr(r, -6, 6), rot = rr(r, 0, 72);
          for (let k = 0; k < 5; k++) { const a = (rot + k * 72) * D, b = a + .62; fl += `M${f1(x)} ${f1(y)}Q${f1(x + Math.cos(a) * 4.2)} ${f1(y + Math.sin(a) * 1.8)} ${f1(x + Math.cos(b) * 3.4)} ${f1(y + Math.sin(b) * 1.4)}z`; }
          ey += ell(x, y, .9, .5);
        }
        for (let i = 0; i < 6; i++) { const x = rr(r, -110, 110), y = rr(r, -5, 6); lf += `M${f1(x)} ${f1(y)}q4 -2 9 0q-4 2 -9 0z`; }
        body.push(['@leaf.0', lf, .9], ['@bloom.0', fl], ['@bloom.1', ey]);
      }
      rings.push({ s: '@ring', w: .7, op: .75, d: ring }, { s: '@drop', w: .7, op: .7, d: drop });
      return { body, rings };
    },
  });
})();
