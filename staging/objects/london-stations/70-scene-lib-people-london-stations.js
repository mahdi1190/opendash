/* ============================================================
   SCENE LIBRARY: people, the London station kit (docs/dev/SCENE_ENGINE.md,
   section 2; the care rule: tiny anonymous silhouettes, at most 10 at a
   station, no crowds).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Commuters and a busker after the figures of 70-scene-lib-people.js (the
   same build, proportions and palette: side views about 58 units tall, no
   faces beyond a nose and an eye dot), FACING RIGHT, anchor: the feet.
   Clothes follow the season (shapeBySeason): long coats, scarves and hats in
   winter; jackets in spring and autumn; shirts in summer. The commuters
   carry what London commuters carry: a briefcase, a phone held up (its
   screen glows after dusk), a backpack and headphones, a tote, an umbrella
   when it is not summer (a coffee cup when it is), a wheeled case.

   Parts: 'legB' (far leg), 'body', 'legA' (near leg) and, for the busker,
   'arm' (the strumming or bowing arm, a 'turn' hook about the shoulder).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const dark = cs => cs.map(c => mix(c, '#000000', .28)), light = cs => cs.map(c => mix(c, '#ffffff', .2));
  const SKIN = ['#e8bfa0', '#c98e6a', '#9a6444', '#6e4630', '#f0cdb0'];
  const HAIR = ['#3a2a20', '#6a4a2a', '#c9a060', '#1f1a18', '#8a8a8a', '#a0522d'];
  // city coats: navy, charcoal, camel, black, olive, burgundy, slate, stone, a red
  const COAT = ['#2e3a52', '#3e4046', '#b08a5a', '#22242a', '#5a6040', '#6a2a34', '#4a5a6a', '#b8b0a0', '#b0443a'];
  const SHIRT = ['#e8e4dc', '#9ab8d8', '#f0d8c0', '#d05a5a', '#5aa070', '#f4f0e8'];
  const TROU = ['#2a2e36', '#3a4a6a', '#4a4a4e', '#2a3448', '#6a6458', '#c8b890'];
  const SHOE = ['#1e1a18', '#4a2e1e', '#e8e4dc', '#2e2e34'];
  const KNIT = ['#8a2a2a', '#c8a040', '#2e5a8a', '#e0d8c8', '#5a7a4a'];
  const PAL = { base: { skin: SKIN, skinD: dark(SKIN), hair: HAIR, coat: COAT, coatD: dark(COAT), coatL: light(COAT), shirt: SHIRT, shirtD: dark(SHIRT), trou: TROU, trouD: dark(TROU), shoe: SHOE, knit: KNIT,
    bag: ['#2a2420', '#5a3a26', '#1e2a3a', '#c8b89a', '#6a2a2a'], metal: ['#a8acb0', '#6a6e72'], ink: '#141010', screen: '#9ab8d0', brolly: ['#1e2228', '#2e4a7a', '#8a2a2a', '#3a5a3a'], cup: ['#f4f0e8', '#8a5a3a'],
    wood: ['#a8642c', '#7a4420', '#e0b070'], case: ['#2a2a30', '#8a2a3a', '#c8a050'], coin: '#d8c070', brass: ['#d8b048', '#a8822a'] } };

  /* A figure as parts, h 58 at k 1. o: {season, v, salt, nearArm: false (draw it yourself), longCoat (any season), pack, head tilt} */
  const figure = (o) => {
    const { season, v } = o, k = 1 + ((v * 7) % 3 - 1) * .04, h = 58 * k, hip = -h * .45, sh = -h * .8;
    const sk = (v * 3 + (o.salt || 0)) % SKIN.length, hr = (v * 5 + (o.salt || 0)) % HAIR.length, co = (v * 4 + (o.salt || 0)) % COAT.length, st = (v * 5 + (o.salt || 0)) % SHIRT.length, tr = (v * 3 + (o.salt || 0)) % TROU.length, so = (v + (o.salt || 0)) % SHOE.length, kn = (v * 2 + (o.salt || 0)) % KNIT.length;
    const winter = season === 'winter', summer = season === 'summer' && !o.longCoat, jacket = !summer && !winter;
    const longCoat = (winter || o.longCoat) && !summer, longHair = (v + (o.salt || 0)) % 3 === 0;
    const top = summer ? `@shirt.${st}` : `@coat.${co}`, topD = summer ? `@shirtD.${st}` : `@coatD.${co}`;
    const leg = (near) => {
      const w0 = 3.2 * k, w1 = 2.3 * k, c = near ? '' : 'D';
      return [[`@trou${c}.${tr}`, `M${f1(-w0)} ${f1(hip - 1)}h${f1(2 * w0)}L${f1(w1)} -2h${f1(-2 * w1)}z`], [`@shoe.${so}`, `M${f1(-w1 - .4)} -3.4h${f1(2 * w1 + 2.6 * k)}q${f1(1.6 * k)} 0 ${f1(1.6 * k)} 1.7t${f1(-1.6 * k)} 1.7h${f1(-2 * w1 - 2.6 * k)}z`]];
    };
    const body = [];
    const sleeve = (near) => summer ? `@skin${near ? '' : 'D'}.${sk}` : `@coat${near ? '' : 'D'}.${co}`;
    if (o.pack) body.push([`@bag.${(v + 2) % 5}`, `M${f1(-11 * k)} ${f1(sh + 1)}q-1 ${f1(h * .14)} 1 ${f1(h * .28)}h${f1(6 * k)}v${f1(-h * .28)}z`], { s: `@bag.${(v + 2) % 5}`, w: 1, d: `M${f1(-5 * k)} ${f1(sh + 1)}l3 3` });
    if (longHair) body.push([`@hair.${hr}`, `M${f1(-5.6 * k)} ${f1(sh - 8 * k)}q${f1(-2 * k)} ${f1(8 * k)} ${f1(-1 * k)} ${f1(13 * k)}h${f1(5 * k)}z`]);
    // the far arm, behind the body
    const sy = sh + 3;
    if (summer) body.push({ s: `@shirtD.${st}`, w: f1(4 * k), d: `M-1.5 ${f1(sy)}l-1.5 ${f1(h * .1)}` });
    body.push({ s: sleeve(false), w: f1(3.4 * k), d: `M-1.5 ${f1(sy)}q-2.5 ${f1(h * .18)} -2 ${f1(h * .32)}` }, [winter ? `@knit.${kn}` : `@skinD.${sk}`, circ(-3.5, sy + h * .33, 1.9 * k)]);
    const tb = longCoat ? hip + h * .2 : hip + 4;
    body.push([top, `M${f1(-7 * k)} ${f1(tb)}q${f1(-1 * k)} ${f1(-(tb - sh) * .8)} ${f1(3 * k)} ${f1(-(tb - sh))}h${f1(9 * k)}q${f1(4 * k)} ${f1((tb - sh) * .25)} ${f1(3 * k)} ${f1(tb - sh)}z`]);
    body.push([topD, `M${f1(2 * k)} ${f1(tb)}q${f1(3 * k)} ${f1(-(tb - sh) * .55)} ${f1(2 * k)} ${f1(-(tb - sh) * .97)}h${f1(1.6 * k)}q${f1(4 * k)} ${f1((tb - sh) * .25)} ${f1(3 * k)} ${f1(tb - sh)}z`, .55]);
    body.push({ s: summer ? `@shirt.${st}` : `@coatL.${co}`, w: f1(1.1 * k), op: .6, d: `M${f1(-5 * k)} ${f1(sh + 4)}v${f1((tb - sh) * .7)}` });
    if (!summer) body.push({ s: topD, w: .8, op: .7, d: `M${f1(4.5 * k)} ${f1(sh + 2)}v${f1(tb - sh - 3)}` }, ['@shirt.0', `M${f1(1 * k)} ${f1(sh)}l${f1(2 * k)} ${f1(4 * k)}l${f1(2 * k)} ${f1(-4 * k)}z`, .9]);
    if (longCoat) body.push({ s: `@coatD.${co}`, w: 1, op: .6, d: `M${f1(-6 * k)} ${f1(hip)}h${f1(13 * k)}` });
    body.push([`@skinD.${sk}`, `M${f1(-1.6 * k)} ${f1(sh - 2 * k)}h${f1(3.4 * k)}v${f1(3 * k)}h${f1(-3.4 * k)}z`]);
    if (winter || (season === 'autumn' && v % 2 === 0)) body.push([`@knit.${kn}`, `M${f1(-4.5 * k)} ${f1(sh + 1)}h${f1(10 * k)}l${f1(-1 * k)} ${f1(3.4 * k)}h${f1(-8 * k)}zM${f1(-3 * k)} ${f1(sh + 3)}l${f1(-2 * k)} ${f1(8 * k)}h${f1(2.6 * k)}l${f1(1 * k)} ${f1(-8 * k)}z`]);
    const hy = sh - 7 * k, tilt = o.tilt || 0, hxp = tilt * 1.2;
    body.push([`@skin.${sk}`, circ(hxp, hy, 5.6 * k)], [`@skin.${sk}`, `M${f1(hxp + 5 * k)} ${f1(hy - 1 * k + tilt)}l${f1(2 * k)} ${f1(2.2 * k)}l${f1(-2 * k)} ${f1(.8 * k)}z`], [`@skinD.${sk}`, circ(hxp - 1.2 * k, hy + .5 * k, 1.3 * k), .6], ['@ink', circ(hxp + 3 * k, hy - 1 * k + tilt * .8, .7 * k), .8]);
    if (winter && !o.noHat) body.push([`@knit.${(kn + 2) % KNIT.length}`, `M${f1(hxp - 6 * k)} ${f1(hy - 1.5 * k)}q${f1(6 * k)} ${f1(-11 * k)} ${f1(12 * k)} 0z`], [`@knit.${kn}`, `M${f1(hxp - 6.2 * k)} ${f1(hy - 1.5 * k)}h${f1(12.4 * k)}v${f1(1.8 * k)}h${f1(-12.4 * k)}z`]);
    else body.push([`@hair.${hr}`, `M${f1(hxp - 5.8 * k)} ${f1(hy + 1 * k)}q${f1(1 * k)} ${f1(-8 * k)} ${f1(7 * k)} ${f1(-7 * k)}q${f1(5 * k)} ${f1(1 * k)} ${f1(4.6 * k)} ${f1(5 * k)}q${f1(-4 * k)} ${f1(-2 * k)} ${f1(-7 * k)} ${f1(-1 * k)}z`]);
    // the near arm hanging, the hand at (3, sy + h * .33)
    const hand = [3, sy + h * .33];
    const nearArm = [];
    if (summer) nearArm.push({ s: `@shirt.${st}`, w: f1(4 * k), d: `M1 ${f1(sy)}l1.5 ${f1(h * .1)}` });
    nearArm.push({ s: sleeve(true), w: f1(3.4 * k), d: `M1 ${f1(sy)}q2.5 ${f1(h * .18)} 2 ${f1(h * .32)}` }, [winter ? `@knit.${kn}` : `@skin.${sk}`, circ(hand[0], hand[1], 1.9 * k)]);
    return { legB: leg(false), body, legA: leg(true), nearArm, hip, hand, sy, hy, k, h, sk, co, kn, st, summer, winter, sleeve: sleeve(true), mitt: winter ? `@knit.${kn}` : `@skin.${sk}` };
  };
  const walkAnim = (hip, period, deg) => ({ walk: { parts: ['legA', 'legB'], pivot: [0, Math.round(hip)], deg, period, bob: 1.5 } });
  const tags = extra => ['uk', 'london', 'people', 'anonymous', 'commuter', ...extra, 'kit:people', 'kit:london', 'kit:urban', 'role:walker'];

  /* ---------- person.commuter: v0 briefcase, v1 phone held up, v2 backpack and headphones, v3 tote, v4 umbrella (a coffee cup in summer), v5 wheeled case ---------- */
  defineObj({
    id: 'person.commuter', category: 'person', size: [44, 72], variants: 6, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PAL, anim: walkAnim(-26, .82, 20), shadow: { rx: 12, ry: 2.4, h: 64 },
    night: { glow: { lamp: '#cfe4ff' }, on: 1 },
    tags: tags(['walker', 'station', 'street']),
    credit: 'after the figures of 70-scene-lib-people.js, with commuter kit',
    build(v, r, ctx) {
      const s = ctx.season;
      const f = figure({ season: s, v, salt: v === 0 ? 3 : 0, longCoat: v === 0, pack: v === 2, tilt: v === 1 ? 1.6 : 0 });
      const out = { legB: f.legB, body: f.body, legA: f.legA };
      const [hx0, hy0] = f.hand;
      if (v === 0) {
        out.body.push(...f.nearArm, ['@bag.0', `M${f1(hx0 - 6)} ${f1(hy0 + 2)}h12q1 0 1 1v8q0 1 -1 1h-12q-1 0 -1 -1v-8q0 -1 1 -1z`], { s: '@bag.0', w: .9, d: `M${f1(hx0 - 2)} ${f1(hy0 + 2)}v-2h4v2` }, ['@metal.0', rect(hx0 - 1, hy0 + 4, 2, 1.2)]);
      } else if (v === 1) {
        // the near arm bent up, the phone before the face, its screen lit after dusk
        out.body.push({ s: f.sleeve, w: f1(3.4 * f.k), d: `M1 ${f1(f.sy)}l2 ${f1(f.h * .17)}l5 ${f1(-f.h * .1)}` }, [f.mitt, circ(8, f.sy + f.h * .07, 1.8)], ['@ink', `M7.6 ${f1(f.sy + f.h * .07 - 6)}l3 -.6 1 6 -3 .6z`], { f: '@screen', d: `M8.1 ${f1(f.sy + f.h * .07 - 5.4)}l2 -.4 .8 4.6 -2 .4z`, glow: 'lamp' });
      } else if (v === 2) {
        out.body.push(...f.nearArm, { s: '@ink', w: 1.1, d: `M${f1(-5)} ${f1(f.hy - 2)}q5 -8 10 0` }, ['@bag.2', ell(-1.6, f.hy + .6, 1.7, 2.3)], ['@ink', ell(-1.6, f.hy + .6, 1, 1.5), .6]);
      } else if (v === 3) {
        out.body.push({ s: `@bag.${3 + (s === 'winter' ? 1 : 0)}`, w: 1, d: `M-1 ${f1(f.sy - 1)}L-6 ${f1(f.hip + 2)}` }, [`@bag.${3 + (s === 'winter' ? 1 : 0)}`, `M-12 ${f1(f.hip)}h10l1 12h-12z`], ...f.nearArm);
      } else if (v === 4) {
        if (s === 'summer') out.body.push({ s: f.sleeve, w: f1(3.4 * f.k), d: `M1 ${f1(f.sy)}l2 ${f1(f.h * .2)}l4 ${f1(-f.h * .06)}` }, ['@cup.0', `M5.6 ${f1(f.sy + f.h * .07)}h4.4l-.6 6h-3.2z`], ['@cup.1', rect(5.8, f.sy + f.h * .07 + 2, 4, 1.6)], [f.mitt, circ(7, f.sy + f.h * .2, 1.8)]);
        else {
          const ux = 5, uy = f.hy - 12, c = `@brolly.${v % 4}`;
          out.body.push({ s: f.sleeve, w: f1(3.4 * f.k), d: `M1 ${f1(f.sy)}l3 ${f1(f.h * .12)}l1 ${f1(-f.h * .04)}` }, { s: '@ink', w: .9, d: `M${ux} ${f1(f.sy + f.h * .08)}V${f1(uy)}` }, [f.mitt, circ(ux, f.sy + f.h * .09, 1.8)]);
          out.body.push([c, `M${ux - 22} ${f1(uy + 6)}q22 -24 44 0q-3.7 -2.4 -7.3 0q-3.7 -2.4 -7.3 0q-3.7 -2.4 -7.4 0q-3.7 -2.4 -7.3 0q-3.7 -2.4 -7.3 0q-3.7 -2.4 -7.4 0z`], ['#ffffff', `M${ux - 18} ${f1(uy + 2)}q10 -14 22 -16q-14 6 -18 18z`, .12], { s: '@ink', w: .8, d: `M${ux} ${f1(uy - 6)}v-3` });
        }
      } else {
        // a wheeled case pulled behind, the handle up to the near hand drawn back
        out.body.push({ s: f.sleeve, w: f1(3.4 * f.k), d: `M1 ${f1(f.sy)}q-2 ${f1(f.h * .18)} -6 ${f1(f.h * .3)}` }, [f.mitt, circ(-5, f.sy + f.h * .3, 1.8)], { s: '@metal.1', w: 1.1, d: `M-5 ${f1(f.sy + f.h * .3)}L-16 -16` }, [`@case.${v % 3}`, `M-28 -2l3 -18q.4 -1.4 1.8 -1.4h9q1.4 0 1.2 1.4l-3 18q-.2 1.4 -1.6 1.4h-9q-1.4 0 -1.4 -1.4z`], ['@ink', circ(-25.5, -1, 1.4) + circ(-15.5, -1, 1.4)], { s: '@ink', w: .5, op: .4, d: 'M-25.4-14h10M-26-8h10' });
      }
      return out;
    },
  });

  /* ---------- person.busker: v0 a guitarist, v1 a violinist, v2 a saxophonist; standing, an open case with coins at the feet; the playing arm moves ---------- */
  defineObj({
    id: 'person.busker', category: 'person', size: [62, 66], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA', 'arm'],
    palette: PAL,
    anim: { turn: { part: 'arm', pivot: [1, -43], deg: 9, period: .55, hold: 0 }, bob: { part: '*', dy: .8, period: 1.6 } },
    shadow: { rx: 26, ry: 2.6, h: 62 },
    tags: ['uk', 'london', 'people', 'anonymous', 'busker', 'music', 'station', 'kit:people', 'kit:london', 'kit:urban', 'role:walker'],
    credit: 'after the figures of 70-scene-lib-people.js, with instruments (no makers\' marks)',
    build(v, r, ctx) {
      const f = figure({ season: ctx.season, v: v + 3, salt: 4 + v, noHat: v === 1 });
      // the legs stand a little apart: shift the far leg back, the near one forward
      const shift = (shapes, dx) => shapes.map(sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m: [1, 0, 0, 1, dx, 0] } : Object.assign({}, sh, { m: [1, 0, 0, 1, dx, 0] }));
      const out = { legB: shift(f.legB, -3), body: f.body, legA: shift(f.legA, 3), arm: [] };
      // the open case on the ground in front, coins inside
      const cx = 22;
      out.legA.push([`@case.${v}`, `M${cx - 2} 0h28l2 -5h-32z`], ['@case.0', `M${cx} -1.4h24l1 -2.6h-26z`, .7], [`@case.${v}`, `M${cx - 2} -5l-3 -9h3l3 9z`], ['@coin', circ(cx + 6, -2.6, .9) + circ(cx + 10, -2.2, .9) + circ(cx + 15, -2.8, .9) + circ(cx + 19, -2.3, .9)]);
      const sy = f.sy, hip = f.hip;
      if (v === 0) {
        // the guitar across the body, the neck up to the far hand; the strumming arm over the soundhole
        out.body.push(['@wood.0', `M-6 ${f1(hip - 2)}q-4 -5 0 -9q3 -2 6 0q4 -2 7 1q4 5 0 9q-6 5 -13 -1z`], ['@wood.1', `M0 ${f1(hip - 8)}q4 -2 7 1q4 5 0 9q-3 2 -6 1z`, .5], ['@ink', circ(0, hip - 6, 1.8)], { s: '@wood.1', w: 2.2, d: `M3 ${f1(hip - 9)}L16 ${f1(sy - 4)}` }, ['@wood.1', `M15 ${f1(sy - 6)}l4 -1 1 3 -4 1z`], { s: '@wood.2', w: .3, op: .8, d: `M-4 ${f1(hip - 6)}L17 ${f1(sy - 4.4)}` });
        out.body.push({ s: f.sleeve.replace('@coat.', '@coatD.').replace('@skin.', '@skinD.'), w: 3.2, d: `M-1 ${f1(sy)}q6 6 14 ${f1(-2)}` }, [f.mitt, circ(14, sy - 3, 1.7)]);
        out.arm.push({ s: f.sleeve, w: 3.4, d: `M1 ${f1(sy)}q5 7 1 ${f1(hip - sy - 6)}` }, [f.mitt, circ(1, hip - 6, 1.8)]);
      } else if (v === 1) {
        // the violin under the chin, the bow arm out in front
        out.body.push({ s: f.sleeve.replace('@coat.', '@coatD.').replace('@skin.', '@skinD.'), w: 3.2, d: `M-1 ${f1(sy)}q8 2 14 -6` }, ['@wood.0', `M2 ${f1(f.hy + 7)}q3 -3 6 -1q3 -1 5 1q2 3 -1 5q-4 2 -7 0q-4 -1 -3 -5z`, 1], { s: '@ink', w: 1.2, d: `M10 ${f1(f.hy + 6)}l6 -4` }, [f.mitt, circ(15, f.hy + 2, 1.6)]);
        out.arm.push({ s: f.sleeve, w: 3.4, d: `M1 ${f1(sy)}q4 10 10 8` }, [f.mitt, circ(11, sy + 8, 1.8)], { s: '@wood.1', w: .9, d: `M11 ${f1(sy + 8)}L-2 ${f1(sy - 14)}` }, { s: '@cup.0', w: .3, op: .8, d: `M11.4 ${f1(sy + 7.4)}L-1.4 ${f1(sy - 14.4)}` });
      } else {
        // the saxophone: a brass body hanging on its strap, the crook up to the mouth, the bell out front
        out.body.push({ s: '@ink', w: .6, d: `M-1 ${f1(sy - 1)}L3 ${f1(hip)}` }, ['@brass.0', `M6 ${f1(f.hy + 3)}q2 3 0 8l-2 ${f1(hip - f.hy - 10)}q-1 5 4 6q5 0 7 -6l1 -5h3l-1 7q-2 9 -10 8q-8 -1 -7 -9l2 ${f1(-(hip - f.hy - 14))}q1 -5 -1 -7z`], ['@brass.1', `M13 ${f1(hip - 5)}h6l-.5 3h-5.5z`], { s: '@brass.1', w: .6, d: `M6 ${f1(sy + 4)}v3M5.6 ${f1(sy + 10)}v3M5.2 ${f1(sy + 16)}v3` });
        out.body.push({ s: f.sleeve.replace('@coat.', '@coatD.').replace('@skin.', '@skinD.'), w: 3.2, d: `M-1 ${f1(sy)}q4 6 7 4` }, [f.mitt, circ(6.5, sy + 4, 1.6)]);
        out.arm.push({ s: f.sleeve, w: 3.4, d: `M1 ${f1(sy)}q3 10 4 ${f1(hip - sy - 4)}` }, [f.mitt, circ(5.5, hip - 3, 1.8)]);
      }
      return out;
    },
  });
})();
