/* ============================================================
   SCENE LIBRARY: city animals (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   animal.fox: the urban red fox trotting, FACING RIGHT: long legs with
   black stockings, the white bib and tail tip, the brush carried low.
   Its coat is thick and bright in winter, thin and leggy in summer
   (shapeBySeason). v0 a bright vixen, v1 a darker, greyer dog fox, v2 a
   pale sandy young fox. Parts: far legs, tail (sways), body, near legs,
   head (turns: a glance or a sniff). The legs walk. Anchor: the feet.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  // coat per variant [base, shade, light] in summer; winter is fuller and brighter, spring is moulting (patchy)
  const COAT = {
    summer: [['#b85a26', '#8a3e18', '#d47a3e'], ['#9a5a34', '#6a3e24', '#b47a52'], ['#c48a52', '#9a6a3a', '#dcaa72']],
    winter: [['#d06a2a', '#9a4a1a', '#e8904a'], ['#ae6436', '#7a4426', '#c88a5a'], ['#d49a5a', '#aa7a42', '#ecbc84']],
  };
  COAT.spring = COAT.summer.map(c => [c[0], c[1], c[2]]); COAT.autumn = COAT.winter;
  const pal = { base: { white: '#f2ece2', whiteD: '#cfc6b8', black: '#1e1814', eye: '#c89a2a', ink: '#100c0a' } };
  for (const s of SEAS) pal[s] = { coat: COAT[s].map(c => c[0]), coatD: COAT[s].map(c => c[1]), coatL: COAT[s].map(c => c[2]) };
  pal.spring.coat = COAT.summer.map(c => c[0]).map(x => x);   // spring keeps the summer tones; the shape is patchy
  defineObj({
    id: 'animal.fox', category: 'animal', size: [104, 50], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'],
    palette: pal,
    anim: { walk: { parts: ['legsNear', 'legsFar'], pivot: [4, -22], deg: 16, period: .5, bob: 1 }, sway: { part: 'tail', pivot: [-26, -26], deg: 8 }, turn: { part: 'head', pivot: [22, -28], deg: 10, period: 7, hold: .6 } },
    shadow: { rx: 34, ry: 3, h: 40 },
    tags: ['uk', 'london', 'city', 'street', 'garden', 'night', 'fox', 'urban-fox', 'kit:urban', 'kit:animals', 'kit:london', 'role:animal'],
    credit: 'city kit: the urban red fox',
    build(v, r, ctx) {
      const s = ctx.season, thick = s === 'winter' || s === 'autumn', i = v, C = `@coat.${i}`, D = `@coatD.${i}`, L = `@coatL.${i}`;
      const fur = thick ? 2.4 : 0;
      // legs: thin with black stockings; the far pair darker
      const leg = (x, back, far) => {
        const c = far ? D : C;
        return back
          ? [[c, `M${x - 4} -24q-2 8 2 12l-2 10h3.4l3-11q1-6-1-12z`], ['@black', `M${x - 1} -12l-2 10h3.4l2.4-10z`], ['@black', ell(x - 0.6, -1, 3, 1.4)]]
          : [[c, `M${x - 3} -24l-1 22h3.4l2.6-22z`], ['@black', `M${x - 3.6} -12l-.4 10h3.4l.6-10z`], ['@black', ell(x - 1.4, -1, 3, 1.4)]];
      };
      const legsFar = [...leg(-12, true, true), ...leg(22, false, true)], legsNear = [...leg(-18, true, false), ...leg(28, false, false)];
      // the brush: long, low, a white tip; full in winter
      const tail = [[C, `M-26-28q-16-2-28 4q-12 6-16 14q8-2 18-6q14-4 26-6z`], [D, `M-70-10q10-2 20-6q12-4 24-6l1 3q-14 2-24 6q-10 4-21 3z`, .7], ['@white', `M-70-10q2-5 7-7q-1 4-1 6z`]];
      if (thick) tail.push([C, `M-30-29q-18-6-32 2q-10 6-10 14q6-8 18-10z`, .9]);
      // the body: deep chest, slim waist, a white bib under the throat
      const body = [[C, `M-30-26q2-${8 + fur} 16-${10 + fur * .5}q18-2 34 0q10 2 12 10q2 8-4 10q-6 4-14 2q-14-2-24 0q-14 2-20-8z`], [D, `M-28-20q12 4 24 0q14-2 26 2q6 2 10 0q-2 6-10 6q-12-2-24 0q-16 2-26-8z`, .7], [L, `M-14-35q14-3 28-1q-12 1-28 3z`, .7], ['@white', `M18-22q8 2 12-4q1 8-6 10q-4 0-6-6z`]];
      if (s === 'spring') body.push([L, ell(-6, -24, 6, 3) + ell(8, -30, 5, 2.4), .5]);
      if (thick) body.push({ s: L, w: 1, op: .6, d: 'M-20-34l-2-3M-10-36l-1-3M0-36l0-3M10-36l1-3' });
      // the head: pointed muzzle, white cheeks, black-backed ears
      const head = [[C, `M18-36q4-8 12-8q8 0 12 6l10 6q-2 3-8 3q-6 2-12 0q-8 2-14-7z`], ['@white', `M34-29q8 2 17-1q-2 3-8 3q-5 2-9-2z`], ['@ink', ell(51, -32, 1.6, 1.2)], ['@eye', ell(38, -36, 1.4, 1)], ['@ink', ell(38.4, -36, .6, .6)],
        ['@black', `M24-42l2-12l8 9z`], [C, `M26-42l1.8-9l5.6 6.4z`], ['@black', `M30-43l5-10l4 11z`], [D, `M31.4-43l3.4-7l2.6 7.6z`]];
      return { legsFar, tail, body, legsNear, head };
    },
  });
})();
