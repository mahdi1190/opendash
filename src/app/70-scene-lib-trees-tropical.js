/* ============================================================
   SCENE LIBRARY: trees, the TROPICAL kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   tree.rain-tree   the wide umbrella crown of the rain tree (Samanea saman), the shade tree of
                    tropical promenades and parks: a short trunk forking into spreading limbs, a
                    broad flat-topped canopy of fine leaves, ferns and epiphytes on the limbs
                    (3 variants). Seasons are gentle: pink powder-puff flowers in the "spring"
                    flush, deep green, a drier paler canopy.
   Lit from the LEFT. Anchor: the ground at the trunk.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, blob, define, seasons } = sceneDraw;
  const rr = (r, a, b) => a + r() * (b - a);
  define({
    id: 'tree.rain-tree', category: 'tree', size: [300, 210], variants: 3, seasonal: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { bark: ['#5e4c3c', '#3e3228', '#7e6a56'], epi: '#5a8a3a' } }, seasons({
      leaf: { spring: ['#4a7a32', '#6e9e40', '#2e5428', '#9ac058'], summer: ['#3a6a2c', '#5a8a36', '#244a22', '#7aa848'], autumn: ['#4e7230', '#74963e', '#2e4c26', '#a0b050'], winter: ['#5e7a36', '#88a046', '#3a5428', '#b0b85a'] },
      bloom: { spring: '#f08aa8', summer: '#e88aa8', autumn: '#d89aa8', winter: '#c8a8a0' },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -120], deg: 1.2 } },
    shadow: { rx: 130, ry: 12, h: 200 },
    reflect: true,
    tags: ['tropical', 'shade-tree', 'park', 'kit:tropical', 'role:tree'],
    credit: 'native (scene engine pilot)',
    build(v, r, ctx) {
      const trunk = [], crown = [], w = [280, 250, 300][v], h = [190, 170, 205][v], cy = -h * 0.72;
      // trunk and limbs fanning up and out
      trunk.push(['@bark.0', `M-12 0Q-10 -30 -8 -54L8 -54Q10 -30 13 0z`], ['@bark.1', `M2 0Q4 -30 4 -54L8 -54Q10 -30 13 0z`, 0.7]);
      let limbs = '';
      for (let i = 0; i < 6; i++) { const t = (i / 5 - 0.5) * 2, ex = t * w * 0.38, ey = cy + Math.abs(t) * 10 + rr(r, -8, 8); limbs += `M${f1(t * 4)} -52Q${f1(t * w * 0.12)} ${f1(-70 - Math.abs(t) * 6)} ${f1(ex)} ${f1(ey)}`; }
      trunk.push({ s: '@bark.0', w: 6, d: limbs }, { s: '@bark.2', w: 1.6, op: 0.6, d: limbs });
      trunk.push(['@epi', blob(r, -18, -64, 8, 4, 6, 0.4) + blob(r, 26, -70, 7, 4, 6, 0.4), 0.9]);
      // the canopy: a broad, flat-topped dome made of many soft clumps, dark beneath, lit on top-left
      const under = [], mid = [], top = [];
      for (let i = 0; i < 40; i++) {
        const t = rr(r, -1, 1), x = t * w * 0.46, yTop = cy - h * 0.24 * (1 - t * t * 0.7), y = rr(r, yTop, cy + 18);
        const d = blob(r, x, y, rr(r, 24, 38), rr(r, 14, 22), 8, 0.35);
        if (y > cy) under.push(d); else if (x < w * 0.05 && y < cy - 10) top.push(d); else mid.push(d);
      }
      // the canopy's coarse mass first (what a tile shows), then the clumps over it (detail: full size only)
      crown.push(['@leaf.0', blob(r, 0, cy - h * 0.06, w * 0.5, h * 0.24, 14, 0.25)], ['@leaf.2', blob(r, 0, cy + 10, w * 0.44, h * 0.08, 10, 0.3), 0.9]);
      crown.push({ f: '@leaf.2', d: under.join(''), detail: true }, { f: '@leaf.0', d: mid.join(''), detail: true }, { f: '@leaf.1', d: top.join(''), detail: true }, ['@leaf.1', blob(r, -w * 0.18, cy - h * 0.18, w * 0.24, h * 0.1, 10, 0.3), 0.8]);
      let fleck = ''; for (let i = 0; i < 18; i++) fleck += blob(r, rr(r, -w * 0.42, w * 0.2), rr(r, cy - h * 0.22, cy - 4), rr(r, 6, 10), rr(r, 4, 6), 6, 0.4);
      crown.push({ f: '@leaf.3', d: fleck, op: 0.55, detail: true });
      if (ctx.season === 'spring') { let fl = ''; for (let i = 0; i < 30; i++) fl += sceneDraw.circ(rr(r, -w * 0.44, w * 0.44), rr(r, cy - h * 0.26, cy), rr(r, 1.6, 2.6)); crown.push(['@bloom', fl, 0.85]); }
      return { trunk, crown };
    },
  });
})();
