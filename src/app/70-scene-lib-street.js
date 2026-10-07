/* ============================================================
   SCENE LIBRARY: street furniture (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Benches and lamp posts after the Yateley Green views. Lamps light at
   real dusk: the lantern glass has glow 'lamp' and the 'lit' part holds
   the halo and the pool of light on the ground (baked only while lit, so
   free per frame). Anchor: the ground at the foot.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;

  /* ---------- street.bench: v0 a slatted park bench, v1 a heavy memorial bench, v2 cast-iron ends ---------- */
  defineObj({
    id: 'street.bench', category: 'street', size: [88, 40], variants: 3, seasonal: false, flippable: true,
    palette: { base: { wood: ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], iron: ['#2a2e30', '#4a5054'], plaque: '#c8a850' } },
    shadow: { rx: 44, ry: 5, h: 36 },
    tags: ['uk', 'green', 'park', 'path', 'bench', 'kit:temperate', 'kit:urban', 'kit:london', 'role:street'],
    credit: 'the Yateley Green view art (the bench on the green), redrawn',
    build(v) {
      const body = [];
      if (v === 2) body.push({ s: '@iron.0', w: 3, d: 'M-36 0q-2-8 0-14q4-6 0-12v-12M36 0q2-8 0-14q-4-6 0-12v-12' }, { s: '@iron.1', w: 1, op: .7, d: 'M-37-14h3M35-14h3' });
      else body.push({ s: '@wood.3', w: v ? 6 : 4, d: 'M-34 0v-22M34 0v-22M-30 0v-10M30 0v-10' });
      // back slats and the seat
      const slats = v === 1 ? [[-40, -40, 6], [-40, -30, 6]] : [[-40, -36, 4.4], [-40, -28, 4.4]];
      for (const [x, y, h] of slats) body.push(['@wood.0', rect(x, y, 80, h)], ['@wood.2', rect(x, y, 80, 1.4), .8]);
      body.push(['@wood.1', rect(-42, -16, 84, 5)], ['@wood.0', rect(-42, -18, 84, 3)], ['@wood.2', rect(-42, -18, 84, 1.2), .8]);
      if (v === 1) body.push(['@wood.3', rect(-44, -24, 6, 24) + rect(38, -24, 6, 24)], ['@plaque', rect(-8, -38, 16, 4)]);
      if (v === 2) body.push({ s: '@iron.0', w: 2.6, d: 'M-40-16l-4-8M40-16l4-8' });
      return { body };
    },
  });

  /* ---------- street.lamp: v0 a Victorian-style cast-iron lantern post, v1 a plain modern column ---------- */
  defineObj({
    id: 'street.lamp', category: 'street', size: [138, 190], variants: 2, seasonal: false, flippable: true, parts: ['lit', 'body'],
    palette: { base: { iron: ['#2a2e30', '#4a5054', '#1a1c1e'], glass: ['#d8dcd0', '#f4f2e6'], halo: '#ffe2a0', pool: '#ffd890', grey: ['#8a8e90', '#b8bcbe'] } },
    night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    anim: { flicker: { part: 'lit', op: [.86, 1], period: 2.6 } },
    shadow: { rx: 10, ry: 2.4, h: 140 },
    tags: ['uk', 'green', 'street', 'path', 'lamp', 'lamp-post', 'kit:temperate', 'kit:urban', 'kit:london', 'role:street'],
    credit: 'the Yateley Green view art (lampPost and K.lamp), redrawn',
    build(v) {
      const body = [];
      let ly;
      if (v === 0) {
        ly = -132;
        body.push(['@iron.0', 'M-7 0v-6h14v6zM-5-6v-14h10v14z'], { s: '@iron.0', w: 4.2, d: 'M0-20V-116' }, { s: '@iron.1', w: 1.2, op: .7, d: 'M-1.2-22V-114' }, ['@iron.0', rect(-4, -60, 8, 3)]);
        body.push({ s: '@iron.0', w: 1.6, d: 'M-10-114h20' }, ['@iron.0', 'M-9-118h18l-2 4h-14z']);
        body.push({ f: '@glass.0', d: 'M-8-136h16l-3 18h-10z', glow: 'lamp' }, { s: '@iron.0', w: 1, d: 'M0-136v18M-8-136l3 18M8-136l-3 18' }, ['@iron.0', 'M-12-136h24l-6-8h-12z'], ['@iron.0', ell(0, -146, 2.4, 2.4)]);
      } else {
        ly = -138;
        body.push({ s: '@grey.0', w: 4.6, d: 'M0 0V-136' }, { s: '@grey.1', w: 1.2, op: .7, d: 'M-1.4-4V-134' }, { s: '@grey.0', w: 3, d: 'M0-136q0-6 10-6h10' }, ['@grey.0', 'M8-144h18l2 4h-22z'], { f: '@glass.0', d: 'M9-140h18v3h-18z', glow: 'lamp' });
      }
      const cx = v ? 18 : 0;
      const lit = [{ f: { rad: [[0, '@halo', .55], [.35, '@halo', .2], [1, '@halo', 0]], cx, cy: ly + 6, r: 46 }, d: ell(cx, ly + 6, 46, 46) },
        { f: { rad: [[0, '@pool', .3], [1, '@pool', 0]], cx, cy: 0, r: 60 }, d: ell(cx, 0, 60, 12) }];
      return { lit, body };
    },
  });
})();
