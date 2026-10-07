/* ============================================================
   SCENE LIBRARY: people (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   person.walker is drawn by the shared, faceless builder (scenePeople, 70-scene-lib-people-0figure.js);
   the others still use the local figure() below until they move to it.
   Small, anonymous figures after the nature kit's walkers (K.walker,
   K.jogger, K.family, K.cyclist and the anglers of the Wyndhams Pool views):
   side views about 58 units tall (66 with a hat) (the care rule: silhouettes at most 70),
   no faces beyond a nose and an eye dot. Every figure FACES RIGHT. Anchor:
   the feet. Clothes follow the season (shapeBySeason): long coats, hats,
   scarves and gloves in winter; jackets in spring and autumn; short sleeves,
   shorts and sun hats in summer. Variants differ in build, skin, hair and
   colours.

   Parts: 'legB' (the far leg), 'body', 'legA' (the near leg). The walk hook
   swings the two legs in opposite phase about the hip and bobs the body.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const dark = cs => cs.map(c => mix(c, '#000000', .28)), light = cs => cs.map(c => mix(c, '#ffffff', .2));
  const SKIN = ['#e8bfa0', '#c98e6a', '#9a6444', '#6e4630', '#f0cdb0'];
  const HAIR = ['#3a2a20', '#6a4a2a', '#c9a060', '#1f1a18', '#8a8a8a', '#a0522d'];
  const COAT = ['#c0583a', '#3a6a8a', '#5a7a4a', '#8a4a6a', '#d0a040', '#4a4a5a', '#2f5a5a', '#b8b0a0', '#6a3a3a'];
  const SHIRT = ['#e8e4dc', '#3a8ac0', '#e0c040', '#d05a5a', '#5aa070', '#f0a0b0'];
  const TROU = ['#2f3640', '#4a5a6a', '#5a4a3a', '#3a4a6a', '#6a6458', '#c8b890'];
  const SHOE = ['#2a2422', '#5a3a26', '#e8e4dc', '#3a3a44'];
  const KNIT = ['#b03a3a', '#d8b040', '#3a6aa0', '#e8e0d0', '#7a9a4a'];
  const PAL = { base: { skin: SKIN, skinD: dark(SKIN), hair: HAIR, coat: COAT, coatD: dark(COAT), coatL: light(COAT), shirt: SHIRT, shirtD: dark(SHIRT), trou: TROU, trouD: dark(TROU), shoe: SHOE, knit: KNIT, bag: ['#3a3a44', '#6a5a3a', '#2a4a6a'], ink: '#141010', lead: '#3a2e28' } };

  /* A figure as parts, h 64 at k 1; dx shifts it; o: {season, v, kid, bent (jogger arms), lean (deg), sit} */
  const figure = (o) => {
    const { season, v } = o, k = o.kid ? .62 : 1 + ((v * 7) % 3 - 1) * .04, h = 58 * k, hip = -h * .45, sh = -h * .8, dx = o.dx || 0;
    const sk = (v * 3 + (o.kid ? 2 : 0)) % SKIN.length, hr = (v * 5 + (o.kid ? 1 : 0)) % HAIR.length, co = (v * 4 + (o.salt || 0)) % COAT.length, st = (v * 5 + (o.salt || 0)) % SHIRT.length, tr = (v * 3 + (o.salt || 0)) % TROU.length, so = (v + (o.salt || 0)) % SHOE.length, kn = (v * 2 + (o.salt || 0)) % KNIT.length;
    const winter = season === 'winter', summer = season === 'summer', jacket = season === 'spring' || season === 'autumn';
    const shorts = summer && (v % 2 === 1 || o.sport), longCoat = winter && !o.sport, longHair = (v + (o.kid ? 1 : 0)) % 3 === 0;
    const top = summer ? `@shirt.${st}` : `@coat.${co}`, topD = summer ? `@shirtD.${st}` : `@coatD.${co}`;
    const X = x => f1(x + dx);
    // a leg from the hip down: thigh and shin taper, a shoe; trouser or skin (shorts)
    const leg = (near) => {
      const w0 = 3.2 * k, w1 = 2.3 * k, len = -hip, c = near ? '' : 'D';
      const out = [];
      if (shorts) {
        out.push([`@trou${c}.${tr}`, `M${X(-w0 - .4)} ${f1(hip - 1)}h${f1(2 * w0 + .8)}l-.4 ${f1(len * .38)}h${f1(-2 * w0)}z`]);
        out.push([near ? `@skin.${sk}` : `@skinD.${sk}`, `M${X(-w0 + .6)} ${f1(hip + len * .36)}L${X(-w1)} ${f1(-2)}h${f1(2 * w1)}L${X(w0 - .6)} ${f1(hip + len * .36)}z`]);
      } else out.push([`@trou${c}.${tr}`, `M${X(-w0)} ${f1(hip - 1)}h${f1(2 * w0)}L${X(w1)} -2h${f1(-2 * w1)}z`]);
      out.push([`@shoe.${so}`, `M${X(-w1 - .4)} -3.4h${f1(2 * w1 + 2.6 * k)}q${f1(1.6 * k)} 0 ${f1(1.6 * k)} 1.7t${f1(-1.6 * k)} 1.7h${f1(-2 * w1 - 2.6 * k)}z`]);
      return out;
    };
    const body = [];
    if (o.pack) body.push([`@bag.${v % 3}`, `M${X(-10 * k)} ${f1(sh + 2)}h${f1(6 * k)}v${f1(h * .27)}h${f1(-6 * k)}z`]);
    if (longHair) body.push([`@hair.${hr}`, `M${X(-5.6 * k)} ${f1(sh - 8 * k)}q${f1(-2 * k)} ${f1(8 * k)} ${f1(-1 * k)} ${f1(13 * k)}h${f1(5 * k)}z`]);
    // the far arm (behind the body)
    const arm = (near) => {
      const c = near ? '' : 'D', sx = near ? 1 : -1.5, sy = sh + 3;
      const sleeve = summer ? `@skin${c}.${sk}` : `@coat${c}.${co}`;
      if (o.bent) return [{ s: sleeve, w: f1(3.6 * k), d: `M${X(sx)} ${f1(sy)}l${f1(near ? -3 : 3)} ${f1(h * .17)}l${f1(7 * k)} ${f1(-h * .07)}` }, ['@skin.' + sk, circ(dx + sx + (near ? -3 : 3) + 7 * k, sy + h * .1, 1.8 * k)]];
      const out = [];
      if (summer) out.push({ s: `@shirt${c}.${st}`, w: f1(4 * k), d: `M${X(sx)} ${f1(sy)}l${f1(near ? 1.5 : -1.5)} ${f1(h * .1)}` });
      out.push({ s: sleeve, w: f1(3.4 * k), d: `M${X(sx)} ${f1(sy)}q${f1(near ? 2.5 : -2.5)} ${f1(h * .18)} ${f1(near ? 3 : -2)} ${f1(h * .32)}` });
      out.push([winter ? `@knit.${kn}` : `@skin${c}.${sk}`, circ(dx + sx + (near ? 3 : -2), sy + h * .33, 1.9 * k)]);
      return out;
    };
    body.push(...arm(false));
    // torso (a long coat reaches the knee), shading on the side away from the light, a lit edge
    const tb = longCoat ? hip + h * .2 : hip + 4;
    body.push([top, `M${X(-7 * k)} ${f1(tb)}q${f1(-1 * k)} ${f1(-(tb - sh) * .8)} ${f1(3 * k)} ${f1(-(tb - sh))}h${f1(9 * k)}q${f1(4 * k)} ${f1((tb - sh) * .25)} ${f1(3 * k)} ${f1(tb - sh)}z`]);
    body.push([topD, `M${X(2 * k)} ${f1(tb)}q${f1(3 * k)} ${f1(-(tb - sh) * .55)} ${f1(2 * k)} ${f1(-(tb - sh) * .97)}h${f1(1.6 * k)}q${f1(4 * k)} ${f1((tb - sh) * .25)} ${f1(3 * k)} ${f1(tb - sh)}z`, .55]);
    body.push({ s: summer ? `@shirt.${st}` : `@coatL.${co}`, w: f1(1.1 * k), op: .6, d: `M${X(-5 * k)} ${f1(sh + 4)}v${f1((tb - sh) * .7)}` });
    if (jacket || winter) body.push({ s: topD, w: .8, op: .7, d: `M${X(4.5 * k)} ${f1(sh + 2)}v${f1(tb - sh - 3)}` });   // the zip / button line
    if (longCoat) body.push({ s: `@coatD.${co}`, w: 1, op: .6, d: `M${X(-6 * k)} ${f1(hip)}h${f1(13 * k)}` });   // a belt
    // neck, head, face
    body.push([`@skinD.${sk}`, `M${X(-1.6 * k)} ${f1(sh - 2 * k)}h${f1(3.4 * k)}v${f1(3 * k)}h${f1(-3.4 * k)}z`]);
    if ((winter || (season === 'autumn' && v % 2 === 0)) && !o.sport) body.push([`@knit.${kn}`, `M${X(-4.5 * k)} ${f1(sh + 1)}h${f1(10 * k)}l${f1(-1 * k)} ${f1(3.4 * k)}h${f1(-8 * k)}zM${X(-3 * k)} ${f1(sh + 3)}l${f1(-2 * k)} ${f1(8 * k)}h${f1(2.6 * k)}l${f1(1 * k)} ${f1(-8 * k)}z`]);
    const hy = sh - 7 * k;
    body.push([`@skin.${sk}`, circ(dx, hy, 5.6 * k)], [`@skin.${sk}`, `M${X(5 * k)} ${f1(hy - 1 * k)}l${f1(2 * k)} ${f1(2.2 * k)}l${f1(-2 * k)} ${f1(.8 * k)}z`], [`@skinD.${sk}`, circ(dx - 1.2 * k, hy + .5 * k, 1.3 * k), .6], ['@ink', circ(dx + 3 * k, hy - 1 * k, .7 * k), .8]);
    if (winter && !o.sport) body.push([`@knit.${(kn + 2) % KNIT.length}`, `M${X(-6 * k)} ${f1(hy - 1.5 * k)}q${f1(6 * k)} ${f1(-11 * k)} ${f1(12 * k)} 0z`], [`@knit.${kn}`, `M${X(-6.2 * k)} ${f1(hy - 1.5 * k)}h${f1(12.4 * k)}v${f1(1.8 * k)}h${f1(-12.4 * k)}z`]);
    else if (summer && v % 4 === 2 && !o.kid) body.push(['@coat.7', `M${X(-8 * k)} ${f1(hy - 2.5 * k)}h${f1(16 * k)}l${f1(-3 * k)} ${f1(-1.5 * k)}q${f1(-5 * k)} ${f1(-7 * k)} ${f1(-10 * k)} 0z`]);   // a sun hat
    else body.push([`@hair.${hr}`, `M${X(-5.8 * k)} ${f1(hy + 1 * k)}q${f1(1 * k)} ${f1(-8 * k)} ${f1(7 * k)} ${f1(-7 * k)}q${f1(5 * k)} ${f1(1 * k)} ${f1(4.6 * k)} ${f1(5 * k)}q${f1(-4 * k)} ${f1(-2 * k)} ${f1(-7 * k)} ${f1(-1 * k)}z`]);
    body.push(...arm(true));
    return { legB: leg(false), body, legA: leg(true), hip };
  };
  const walkAnim = (hip, period, deg) => ({ walk: { parts: ['legA', 'legB'], pivot: [0, Math.round(hip)], deg, period, bob: 1.5 } });
  const peopleTags = extra => ['uk', 'people', 'anonymous', 'silhouette', ...extra, 'kit:people', 'kit:temperate', 'kit:urban', 'role:walker'];

  /* ---------- person.walker: the reference person on the shared builder (70-scene-lib-people-0figure.js) ----------
     8 presets (scenePeople.PRESETS): age, build, skin, hair and a wardrobe per season; faceless; 100 to 150 shapes
     near, the fine ones (detail: true) dropped under 48 px (detailPx); at night a cool rim light, lit strips and screens. */
  const PP = typeof scenePeople !== 'undefined' ? scenePeople : null;
  if (PP) PP.define({
    id: 'person.walker', category: 'person', size: [29, 64], variants: PP.PRESETS.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PP.palette(), anim: PP.walkAnim(0.9, 22, 1.5), shadow: { rx: 11, ry: 2.4, h: 64 }, night: PP.NIGHT, detailPx: true,
    tags: PP.tags(['walker', 'path']),
    credit: 'the shared people builder (scenePeople.figure, 8 presets with a seasonal wardrobe)',
    build(v, r, ctx) { const f = PP.figure(PP.outfit(PP.PRESETS[v], ctx.season)); return { legB: f.legB, body: f.body, legA: f.legA }; },
  });

  /* ---------- person.jogger: sportswear, bent arms, a forward lean ---------- */
  defineObj({
    id: 'person.jogger', category: 'person', size: [37, 64], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PAL, anim: walkAnim(-26, .55, 34), shadow: { rx: 11, ry: 2.4, h: 64 },
    tags: peopleTags(['jogger', 'runner', 'path']),
    credit: "the nature kit's K.jogger",
    build(v, r, ctx) {
      const f = figure({ season: ctx.season === 'winter' ? 'autumn' : ctx.season, v, bent: true, sport: true, salt: 2 });
      const lean = [Math.cos(.12), Math.sin(.12), -Math.sin(.12), Math.cos(.12), 0, 0].map(n => Math.round(n * 1000) / 1000);
      const tilt = s => Array.isArray(s) ? { f: s[0], d: s[1], op: s[2], m: lean } : Object.assign({}, s, { m: lean });
      return { legB: f.legB, body: f.body.map(tilt), legA: f.legA };
    },
  });

  /* ---------- person.dog-walker: a walker with a dog on a lead (the dog trots with a bob) ---------- */
  defineObj({
    id: 'person.dog-walker', category: 'person', size: [67, 68], variants: 4, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA', 'dog'],
    palette: Object.assign({}, PAL, { base: Object.assign({}, PAL.base, { dog: ['#c9a46a', '#2a2420', '#8a5a34', '#e8e0d0'], dogD: dark(['#c9a46a', '#2a2420', '#8a5a34', '#e8e0d0']), collar: '#b03030' }) }),
    anim: Object.assign(walkAnim(-26, .9, 22), { bob: { part: 'dog', dy: 1.6, period: .42 } }), shadow: { rx: 28, ry: 2.6, h: 64 },
    tags: peopleTags(['dog-walker', 'dog', 'path']),
    credit: "the nature kit's K.walker with o.dog",
    build(v, r, ctx) {
      const f = figure({ season: ctx.season, v, salt: 1 });
      const c = `@dog.${v}`, d = `@dogD.${v}`;
      // the lead from the near hand to the collar, slack
      f.body.push({ s: '@lead', w: 1, d: 'M4 -24q14 9 26 2' });
      const dog = [{ s: d, w: 3, d: 'M17-10l-1 10M35-10l2 10' }, ['#1f2a1e', ell(26, 1, 13, 2), .2], [c, 'M14-10q-2-10 8-10h12q6 0 6 8l-4 4h-20z'], [d, 'M16-12q10 3 20 0-2 3-4 4h-14z', .5],
        [c, 'M38-16q2-10 10-8l5 4-1 4-9 2z'], ['@ink', 'M52-20l2 2-2 1z'], [d, 'M41-22q-1 6 3 9l3-8z'], ['@ink', circ(47, -18, 1.2)], { s: '@collar', w: 1.6, d: 'M39-17l3 5' },
        { s: c, w: 3, d: 'M14-14q-6-4-8-12' }, { s: c, w: 3, d: 'M20-10l-1 10M38-10l1 10' }];
      return { legB: f.legB, body: f.body, legA: f.legA, dog };
    },
  });

  /* ---------- person.family: two adults and a child walking together ---------- */
  defineObj({
    id: 'person.family', category: 'person', size: [70, 70], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PAL, anim: walkAnim(-26, .8, 18), shadow: { rx: 32, ry: 2.6, h: 64 },
    tags: peopleTags(['family', 'child', 'path']).filter(t => t !== 'silhouette'),   // a group (66 shapes): not a single silhouette for the care rule
    credit: "the nature kit's K.family",
    build(v, r, ctx) {
      // the lead adult (front, right) carries the walk; the child and the second adult step in a held mid-stride
      const a = figure({ season: ctx.season, v, dx: 18, salt: 0 }), kid = figure({ season: ctx.season, v: v + 1, dx: -4, kid: true, salt: 3 }), b = figure({ season: ctx.season, v: v + 2, dx: -28, salt: 5, pack: true });
      const rot = (deg, px, py) => { const t = deg * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t), q = n => Math.round(n * 1000) / 1000; return [q(c), q(sn), q(-sn), q(c), q(px - c * px + sn * py), q(py - sn * px - c * py)]; };
      const posed = (shapes, m) => shapes.map(sh => Object.assign(Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh), { m }));
      const still = (f, dx) => [...posed(f.legB, rot(-16, dx, f.hip)), ...posed(f.legA, rot(16, dx, f.hip))];
      return { legB: a.legB, body: [...still(b, -28), ...b.body, ...still(kid, -4), ...kid.body, ...a.body], legA: a.legA };
    },
  });

  /* ---------- person.cyclist: a rider on a bike; the legs pedal (walk about the hip) ---------- */
  defineObj({
    id: 'person.cyclist', category: 'person', size: [70, 76], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'bike', 'body', 'legA'],
    palette: Object.assign({}, PAL, { base: Object.assign({}, PAL.base, { tyre: '#2a2a2e', rim: '#9a9aa0', frame: ['#3a5a7a', '#c0402a', '#2a7a5a'], helmet: ['#f0c030', '#e8e4dc', '#3a8ac0'] }) }),
    anim: { walk: { parts: ['legA', 'legB'], pivot: [-4, -40], deg: 26, period: .9, bob: .4 } }, shadow: { rx: 34, ry: 3, h: 60 },
    tags: peopleTags(['cyclist', 'bike', 'path', 'towpath']),
    credit: "the nature kit's K.cyclist",
    build(v, r, ctx) {
      const f = figure({ season: ctx.season, v, salt: 4, bent: true, sport: v === 2 });
      // seat the figure: the torso leans forward over the bars, the hip on the saddle at (-4, -40)
      const t = .5, c = Math.round(Math.cos(t) * 1000) / 1000, s = Math.round(Math.sin(t) * 1000) / 1000, hip = f.hip;
      const seat = [c, s, -s, c, Math.round((-4 + s * hip) * 10) / 10, Math.round((-40 - c * hip) * 10) / 10];
      const place = arr => arr.map(sh => { const o = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh); o.m = seat; return o; });
      const fr = `@frame.${v}`;
      const wheel = cx => [{ s: '@tyre', w: 2.8, d: circ(cx, -14, 14) }, { s: '@rim', w: .8, d: circ(cx, -14, 11.6) }, { s: '@rim', w: .7, op: .8, d: `M${cx - 11} -14h22M${cx} -25v22M${cx - 8} -22l16 16M${cx - 8} -6l16-16` }, ['@rim', circ(cx, -14, 1.6)]];
      const bike = [...wheel(-20), ...wheel(22), { s: fr, w: 2.6, d: 'M-20-14l14-2 10-18M-6-16l28 2-8-20M-8-38l4-2M-6-16l-2-22M14-34h10' }, ['@tyre', 'M-12-41h9l1 2h-10z'], { s: '@tyre', w: 2, d: 'M22-36l4-2' }];
      if (v !== 2) bike.push({ s: '@rim', w: 1.4, d: 'M-32-22q12-3 20 0' });   // a mudguard
      // the legs go from the hip at the saddle to the pedals; the walk hook turns them about the hip
      const legPair = near => { const c2 = near ? '' : 'D'; return [{ s: `@trou${c2}.${(v * 3 + 4) % 6}`, w: 4.4, d: near ? 'M-4-40l12 12-6 14' : 'M-4-40l6 16-8 8' }, [`@shoe.${(v + 4) % 4}`, near ? ell(3, -14, 3.4, 1.8) : ell(-5, -16, 3.4, 1.8)]]; };
      const hy = -58 * .8 - 7, hxw = -s * hy + seat[4], hyw = c * hy + seat[5];   // the head centre after seating
      const helmet = ctx.season !== 'winter' || v === 2 ? [{ f: `@helmet.${v}`, d: `M${f1(hxw - 6.6)} ${f1(hyw - .5)}q${f1(1.5)} ${f1(-9)} ${f1(8)} ${f1(-8.6)}q${f1(5.6)} ${f1(1)} ${f1(5.6)} ${f1(7)}z` }, { s: '@tyre', w: .8, op: .6, d: `M${f1(hxw - 6)} ${f1(hyw - .8)}h${f1(12)}` }] : [];
      return { legB: legPair(false), bike, body: [...place(f.body), ...helmet], legA: legPair(true) };
    },
  });

  /* ---------- person.angler: sitting on a box at the water's edge with a rod; the rod tip twitches ---------- */
  defineObj({
    id: 'person.angler', category: 'person', size: [184, 83], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['gear', 'body', 'rod'],
    palette: Object.assign({}, PAL, { base: Object.assign({}, PAL.base, { box: ['#3a6a4a', '#5a7a5a', '#e8e0c8'], rod: '#2a2420', line: '#e8f0f0', brolly: ['#2f5a3a', '#4a7a4a', '#6a4a3a'], float: '#e0402a' }) }),
    anim: { turn: { part: 'rod', pivot: [10, -30], deg: 3, period: 5, hold: .5 } },
    tags: ['uk', 'people', 'anonymous', 'silhouette', 'angler', 'fishing', 'pond', 'canal', 'kit:people', 'kit:temperate', 'kit:water', 'role:walker'],
    credit: 'the Wyndhams Pool view art (anglers on the bank)',
    build(v, r, ctx) {
      const f = figure({ season: ctx.season, v, salt: 6 });
      // sitting: drop the body by the thigh length and set the legs forward
      const drop = 14, m = [1, 0, 0, 1, 0, drop];
      const body = f.body.map(sh => { const o = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh); o.m = m; return o; });
      const tr = (v * 3 + 6) % 6;
      body.unshift({ s: `@trouD.${tr}`, w: 5, d: 'M-2-16h12l2 14' }, { s: `@trou.${tr}`, w: 5.4, d: 'M0-14h12l1 12' }, [`@shoe.${v % 4}`, ell(15, -1.5, 4.5, 2)]);
      const gear = [['@box.0', 'M-10-14h18v14h-18z'], ['@box.1', 'M-10-14h18v4h-18z'], { s: '@box.2', w: .8, d: 'M-10-7h18' }];
      if (v !== 1) gear.unshift(['@brolly.' + v, 'M-56-20q20-50 66-34l-62 34z'], { s: '@rod', w: 1.4, d: 'M-20-40l14 40' });
      if (v === 1) gear.push(['@bag.1', 'M-28-10h14v10h-14z'], ['#3a3a44', 'M-26-10q5-6 10 0z']);
      const rod = [{ s: '@rod', w: 1.8, d: 'M10-30l60-36q24-10 40-6' }, { s: '@line', w: .7, op: .8, d: 'M110-72q6 30 14 72' }, ['@float', ell(124, -1, 1.6, 2.4)]];
      return { gear, body, rod };
    },
  });
})();
