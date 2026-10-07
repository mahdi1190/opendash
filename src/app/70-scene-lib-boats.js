/* ============================================================
   SCENE LIBRARY: boats (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   The canal narrowboat after the nature kit's K.narrowboat: a long hull,
   a painted cabin with coachlines, brass-ringed portholes that light at
   real dusk, roof boxes and pots, a chimney. No names or lettering.
   It FACES RIGHT (the bow on the right). Anchor: the waterline at the
   middle. Variants: v0 green and gold, v1 maroon and cream, v2 navy and red.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  defineObj({
    id: 'boat.narrowboat', category: 'boat', size: [476, 103], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      cabin: ['#2f5a46', '#6a2a2e', '#22304a'], cabinD: ['#22443a', '#4e1e22', '#182438'], cabinL: ['#4a7a62', '#8a4248', '#3a4a6a'], trim: ['#e9c86a', '#efe2c4', '#c8402a'],
      panel: ['#b0402a', '#2f5a46', '#e9c86a'], hull: ['#1f2628', '#3a2a22'], port: ['#cfe0e0', '#8aa0a8'], roof: ['#3a2e28', '#5a4a3a'], plant: ['#4a8a3a', '#e05a6a', '#f0c040'],
      stove: '#2a2a2e', rope: '#d8cdb8', wake: '#eefaf6', tiller: '#3a2e28',
    } },
    night: { glow: { window: '#ffd68a' }, on: .8 },
    anim: { bob: { part: '*', dy: 1.2, period: 5 } },
    reflect: true,
    tags: ['uk', 'canal', 'narrowboat', 'boat', 'kit:boats', 'kit:temperate', 'kit:water', 'role:boat'],
    credit: "the nature kit's K.narrowboat, redrawn",
    build(v) {
      const cab = `@cabin.${v}`, body = [];
      body.push({ s: '@wake', w: 1.6, op: .5, d: 'M-236 6h470' });
      // the hull: black with a dark red gunwale band, the counter stern on the left, the bow on the right
      body.push(['@hull.0', 'M-236-14h470q10 0 4 10l-14 18h-436q-12-6-24-28z'], ['@hull.1', 'M-236-14h470v5h-470z']);
      body.push({ s: '#5a6a6e', w: 1, op: .5, d: 'M-226-6h450' });
      // the cabin with its coachlines, a lighter top edge, the shaded lower band
      body.push([cab, 'M-190-14v-44h330l14 10v34z'], [`@cabinD.${v}`, 'M-190-24h344v10h-344z'], [`@cabinL.${v}`, 'M-196-58h340l8 4h-356z']);
      body.push({ s: `@trim.${v}`, w: 2, d: 'M-186-52h322M-186-20h336' });
      // portholes: brass rings, glass that lights at dusk
      for (let i = 0; i < 9; i++) { const x = -150 + i * 34; body.push([`@trim.${v}`, ell(x, -36, 8.2, 8.2)], { f: '@port.0', d: ell(x, -36, 6, 6), glow: 'window' }, ['@port.1', `M${x - 4} -38a5 5 0 0 1 6 -3`, .6]); }
      // the front cabin door panel, the side hatch
      body.push([`@panel.${v}`, rect(154, -58, 40, 44)], { s: `@trim.${v}`, w: 2, d: 'M158-54h32v36h-32z' }, [`@cabinD.${v}`, rect(-182, -54, 22, 34)], { s: `@trim.${v}`, w: 1.4, d: 'M-180-52h18v30h-18z' });
      // roof: boxes, a pole, plant pots in flower, the chimney with its brass bands, a coil of rope at the bow
      body.push(['@roof.0', rect(-140, -64, 12, 6) + rect(-40, -62, 40, 4)], ['@roof.1', rect(-100, -61, 60, 3)], ['@plant.0', 'M-142-64q6-12 16 0zM-38-62q10-16 20-4 10-12 18 4z'], ['@plant.1', ell(-34, -68, 3, 3) + ell(-10, -66, 3, 3)], ['@plant.2', ell(-22, -70, 3, 3)]);
      body.push(['@stove', rect(100, -84, 10, 26)], { s: `@trim.${v}`, w: 2, d: 'M100-78h10M100-70h10' }, { s: '@rope', w: 2.4, d: 'M-224-14q-8-12 4-18' }, { s: '@rope', w: 3, d: 'M226-14q16-16 8-30' }, { s: '@tiller', w: 2.4, d: 'M-232-16q-4-20 18-26' });
      return { body };
    },
  });
})();
