/* ============================================================
   SCENE LIBRARY: city birds (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per variant.

   bird.pigeon: the feral pigeon of pavements, squares and ledges, standing,
   FACING RIGHT, with its head bobbing and pecking (turn on 'head'). The
   plumage morphs of real feral flocks: blue bar, blue chequer, dark
   chequer, pale (near white), red (chestnut). The neck shows its green and
   purple sheen. Anchor: the feet.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  // per morph: body [base, shade, light], wing, bars / chequer, tail band
  const MORPH = [
    { body: ['#8e96a4', '#6a7280', '#b4bac6'], wing: '#a4acb8', mark: '#2e3038', head: '#6e7684', check: false },   // blue bar
    { body: ['#868c98', '#626874', '#aab0bc'], wing: '#8e94a0', mark: '#3a3c44', head: '#646a78', check: true },    // blue chequer
    { body: ['#4e525c', '#383a42', '#6a6e78'], wing: '#565a64', mark: '#26282e', head: '#3e424a', check: true },    // dark chequer
    { body: ['#e6e4e0', '#c4c2bc', '#f8f6f2'], wing: '#ecebe6', mark: '#a8a49c', head: '#dcdad4', check: false },  // pale
    { body: ['#a07462', '#7e5646', '#c4988a'], wing: '#b08676', mark: '#6a3e30', head: '#8a6252', check: false },  // red
  ];
  defineObj({
    id: 'bird.pigeon-feral', category: 'bird', size: [40, 32], variants: 5, seasonal: false, flippable: true, parts: ['body', 'head'],
    palette: { base: {
      body: MORPH.map(m => m.body[0]), bodyD: MORPH.map(m => m.body[1]), bodyL: MORPH.map(m => m.body[2]), wing: MORPH.map(m => m.wing), mark: MORPH.map(m => m.mark), head: MORPH.map(m => m.head),
      sheenG: '#4a8a6a', sheenP: '#8a5a9a', leg: '#c8545a', bill: ['#3a3a3e', '#e8e2da'], eye: '#e8742a', ink: '#141214',
    } },
    anim: { turn: { part: 'head', pivot: [9, -18], deg: 22, period: 2.2, hold: .45 }, bob: { part: '*', dy: .5, period: .9 } },
    shadow: { rx: 11, ry: 2, h: 14 },
    tags: ['uk', 'london', 'city', 'square', 'pavement', 'pigeon', 'feral-pigeon', 'kit:urban', 'kit:birds', 'kit:london', 'role:bird'],
    credit: 'city kit: the feral pigeon in five plumage morphs',
    build(v) {
      const M = MORPH[v], i = v, body = [], head = [];
      // legs (coral pink, toes forward), the body: a plump breast, the back sloping to a square tail
      body.push({ s: '@leg', w: 1.5, d: 'M-1-6l-.6 5.4h4M-1-.6l-2.6.6M3-6l.6 5.4h4M3.6-.6l-2.4.6' });
      body.push([`@body.${i}`, 'M12-16C13-9 6-5-2-5C-8-5-13-8-16-11L-25-13L-24-16L-14-17C-8-22 2-23 8-21z'], [`@bodyD.${i}`, 'M12-14C11-8 5-5-2-5C-8-5-13-8-16-11C-8-8 4-8 12-14z', .75]);
      // the folded wing, its two dark bars (or chequer) and the dark primaries
      body.push([`@wing.${i}`, 'M-15-16C-8-21 2-21 7-18C4-13-6-11-15-14z'], [`@bodyL.${i}`, 'M-8-19C-2-21 3-20 6-18C1-19-4-19-8-19z', .7]);
      if (M.check) { let c = ''; for (let k = 0; k < 10; k++) c += ell(-11 + (k % 5) * 3.6 + (k > 4 ? 1.8 : 0), -16.4 + (k > 4 ? 2 : 0), 1, .7); body.push([`@mark.${i}`, c, .85]); }
      body.push({ s: `@mark.${i}`, w: 1.2, op: .9, d: 'M-11-15.2q4-1.8 8-1.8M-10.4-13.2q4-1.4 8-1.4' });
      body.push([`@mark.${i}`, 'M-15-15L-22-14.6L-15-13.4z'], [`@mark.${i}`, 'M-22-13.6L-25-13L-24-16L-21.6-16.3z']);
      // the neck and head (iridescent green and purple on the neck), the bill with its pale cere, the orange eye
      head.push([`@head.${i}`, 'M3-19C4-24 8-28 11-29L14.6-26.6C14.6-22 13.6-18 12-15C9-15 5-16 3-19z'], ['@sheenG', ell(10.4, -20.5, 3.2, 3.6), v === 3 ? .25 : .6], ['@sheenP', ell(11.4, -17.6, 2.4, 2), v === 3 ? .25 : .55]);
      head.push([`@head.${i}`, ell(12.4, -27, 3.7, 3.4)], ['@bill.0', 'M15.6-27.6L19-26.4L15.6-25.6z'], ['@bill.1', ell(16, -27.4, 1, .7)], ['@eye', ell(13.2, -27.8, 1.1, 1.1)], ['@ink', ell(13.4, -27.8, .5, .5)]);
      return { body, head };
    },
  });
})();
