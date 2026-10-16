/* ============================================================
   SCENE LIBRARY: the Pier Head (Liverpool) street dressing (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   street.walker-group   four bronze figures walking in a loose line on a low granite plinth: silhouettes only (a mop of hair, a jacket,
                         trousers, a stride). NO faces, no inscription, no name: a generic group statue that a plaza can stand
                         in front of (v0 and v1 are the same group seen walking left or right in a different order, v2 with a plain
                         wide plinth). Anchor: the ground at the middle of the plinth.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data; strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;

  /** One walking figure, facing right, its feet on y = y0 (up is negative), `h` units tall; `st` the stride (-1 .. 1), `hair` a mop of hair 0 | 1 | 2. */
  const walker = (x, y0, h, st, hair, col) => {
    const k = h / 70, P = (a, b) => `${f1(x + a * k)} ${f1(y0 + b * k)}`;
    const out = [], hip = -33, sh = -57, back = -8 * st, front = 9 * st;
    // the trailing leg and the leading leg: tapered trousers with a foot each
    out.push([col[2], `M${P(-3, hip)}L${P(3, hip)}L${P(back + 3, -1)}L${P(back + 9, -1)}L${P(back + 9, -4)}L${P(back - 2, -4)}Z`]);
    out.push([col[1], `M${P(-3, hip)}L${P(4, hip)}L${P(front + 4, -1)}L${P(front + 11, -1)}L${P(front + 11, -4)}L${P(front - 2, -4)}Z`]);
    // the jacket: shoulders to hips, a little lean
    out.push([col[0], `M${P(-6, sh)}L${P(5, sh)}Q${P(8, sh + 6)} ${P(6, hip + 2)}L${P(-5, hip + 2)}Q${P(-8, sh + 8)} ${P(-6, sh)}Z`]);
    // the arms: one swung back, one forward, hanging from the shoulder
    out.push([col[3], `M${P(-4, sh + 2)}L${P(-1, sh + 2)}L${P(back * 0.8 - 1, hip + 6)}L${P(back * 0.8 - 4, hip + 6)}Z`]);
    out.push([col[0], `M${P(1, sh + 2)}L${P(5, sh + 2)}L${P(front * 0.8 + 6, hip + 6)}L${P(front * 0.8 + 2, hip + 6)}Z`]);
    // the neck and head (a bare ellipse: no features), with a mop of hair across the brow
    out.push([col[1], `M${P(-1.8, sh - 4)}h${f1(3.6 * k)}v${f1(4.4 * k)}h${f1(-3.6 * k)}z`]);
    out.push([col[0], ell(x + 0.6 * k, y0 + (sh - 9) * k, 4.8 * k, 5.6 * k)]);
    if (hair) out.push([col[3], `M${P(-5, sh - 9)}Q${P(-6, sh - 18)} ${P(1, sh - 17)}Q${P(8, sh - 17)} ${P(6, sh - 9)}Q${P(hair === 2 ? 9 : 5, sh - 12)} ${P(-1, sh - 12)}Z`]);
    return out;
  };

  /* ---------- street.walker-group ---------- */
  defineObj({
    id: 'street.walker-group', category: 'street', size: [236, 84], variants: 3, seasonal: false, flippable: true,
    palette: { base: { bronze: ['#4a5446', '#36403a', '#2a322d', '#1f2722'], granite: ['#9a948c', '#7c766e', '#b4aea4'] } },
    parts: ['body'], shadow: { rx: 112, ry: 8, h: 74 }, real: { h: 2.1, l: 5.9 },
    tags: ['uk', 'liverpool', 'statue', 'memorial', 'waterfront', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Pier Head view: a generic group of four walking bronze figures (silhouettes: no likeness, no inscription)',
    build(v) {
      const b = [], col = ['@bronze.0', '@bronze.1', '@bronze.2', '@bronze.3'];
      // the low plinth: two granite steps and a slab
      b.push({ f: '@granite.1', d: rect(-118, -6, 236, 6) }, { f: '@granite.0', d: rect(-112, -12, 224, 6) }, { f: '@granite.2', d: rect(-112, -12, 224, 1.6), op: 0.8 });
      const poses = v === 1 ? [[-84, 1, -0.9, 1], [-28, 0.97, 0.7, 2], [28, 1.0, -0.4, 0], [84, 0.96, 0.9, 1]] : v === 2 ? [[-78, 1, 0.6, 2], [-26, 0.98, -0.7, 1], [26, 1.01, 0.8, 0], [78, 0.97, -0.5, 1]] : [[-84, 0.98, 0.8, 1], [-28, 1, -0.6, 2], [28, 0.97, 0.5, 1], [84, 1.02, -0.8, 0]];
      for (const [x, k, st, hair] of poses) {
        for (const [c, d] of walker(x, -12, 70 * k, st, hair, col)) b.push({ f: c, d });
      }
      return { body: b };
    },
  });
})();
