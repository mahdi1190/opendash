/* ============================================================
   SCENE LIBRARY: city people (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Anonymous city figures after the people kit (70-scene-lib-people.js):
   side views about 60 units tall, FACING RIGHT, no faces beyond a nose and
   an eye dot, no logos on clothes or bags. City clothes follow the season
   (shapeBySeason): overcoats, trench coats, puffers, scarves and hats in
   winter; macs and jackets in spring and autumn; shirt sleeves and
   summer dresses in summer. Umbrellas are up in the wet seasons for the
   variants that carry one, furled in summer.

   Parts: 'legB' (the far leg), 'body', 'legA' (the near leg). The walk
   hook swings the legs about the hip and bobs the body (a cyclist's legs
   pedal the same way). Anchor: the feet (the wheels' contact for a bike).
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
  const dark = cs => cs.map(c => mix(c, '#000000', .3)), light = cs => cs.map(c => mix(c, '#ffffff', .22));
  const SKIN = ['#e8bfa0', '#c98e6a', '#9a6444', '#6e4630', '#f0cdb0', '#b07850'];
  const HAIR = ['#2a1e18', '#6a4a2a', '#c9a060', '#141010', '#9a9a9a', '#8a3a1e'];
  // city colours: charcoal, navy, camel, black, olive, burgundy, stone (trench), forest, slate blue, rust
  const COAT = ['#3a3c42', '#1f2c44', '#b08a5a', '#1a1a1e', '#5a5e3a', '#6a2430', '#c8b48a', '#2a4434', '#4a5a72', '#a8542e'];
  const SHIRT = ['#e8ecf0', '#9ec0dc', '#f0e8d8', '#d86a6a', '#5a8a6a', '#f2c84a', '#e8a0b4', '#3a4a6a'];
  const TROU = ['#24282e', '#3a4454', '#5a4e40', '#2a3a5a', '#7a7466', '#c4b490'];
  const SHOE = ['#1a1614', '#4a2e1e', '#e8e4dc', '#2e2e34'];
  const KNIT = ['#a8323a', '#d8b040', '#3a6aa0', '#e8e0d0', '#5a7a4a', '#7a4a7a'];
  const BRELLA = ['#1a1a1e', '#1f2c5a', '#b02a30', '#2a5a4a', '#5a3a6a', '#d8a030'];
  const PAL = { base: { skin: SKIN, skinD: dark(SKIN), hair: HAIR, coat: COAT, coatD: dark(COAT), coatL: light(COAT), shirt: SHIRT, shirtD: dark(SHIRT), trou: TROU, trouD: dark(TROU), shoe: SHOE, knit: KNIT, brella: BRELLA, brellaD: dark(BRELLA), bag: ['#2a2420', '#6a4a2a', '#2a3a5a', '#d8ccb4'], cup: ['#f2eee6', '#8a5a3a'], phone: '#14161a', ink: '#141010', metal: '#9a9ea2' } };
  // the season tint for the bloom of a scarf in winter: used so a seasonal object differs (clothes differ by season anyway)
  const SEAS = { spring: {}, summer: {}, autumn: {}, winter: {} };

  /* The wardrobe per variant and season. */
  const DRESS = [
    // 0 a man in a suit: long overcoat in winter, a mac in autumn, the suit jacket in spring, shirt sleeves in summer; a briefcase
    { coat: { winter: 'long', autumn: 'long', spring: 'hip', summer: 'none' }, c: 0, cA: 6, sh: 0, tr: 0, so: 0, hair: 0, sk: 0, carry: 'brief', hat: { winter: 'none' } },
    // 1 a woman in a trench coat with an umbrella (up except in summer), a summer dress
    { coat: { winter: 'long', autumn: 'long', spring: 'long', summer: 'none' }, c: 6, cW: 3, sh: 6, tr: 0, so: 3, hair: 2, sk: 4, long: true, dress: { summer: true }, carry: 'brella', br: 2 },
    // 2 a young commuter: a puffer in winter, a hoodie, a T-shirt; a backpack, a phone
    { coat: { winter: 'puffer', autumn: 'hip', spring: 'hip', summer: 'none' }, c: 8, cA: 4, sh: 3, tr: 3, so: 2, hair: 3, sk: 2, carry: 'phone', pack: true, hat: { winter: 'beanie' } },
    // 3 a mac and a tote, a scarf in winter, the umbrella up in winter and autumn
    { coat: { winter: 'long', autumn: 'long', spring: 'hip', summer: 'none' }, c: 4, cW: 1, sh: 1, tr: 2, so: 1, hair: 1, sk: 1, carry: 'brellaW', br: 1, tote: true, long: true },
    // 4 an older man: a tweed overcoat and a flat cap, a folded newspaper (blank)
    { coat: { winter: 'long', autumn: 'long', spring: 'long', summer: 'none' }, c: 2, sh: 2, tr: 4, so: 1, hair: 4, sk: 0, carry: 'paper', hat: { winter: 'cap', autumn: 'cap', spring: 'cap', summer: 'cap' }, k: .97 },
    // 5 a woman with a takeaway cup and a crossbody bag: a wool coat, a jacket, a shirt
    { coat: { winter: 'long', autumn: 'hip', spring: 'hip', summer: 'none' }, c: 5, cA: 9, sh: 5, tr: 5, so: 0, hair: 5, sk: 3, carry: 'cup', cross: true, long: true },
  ];

  const figure = (season, v, o = {}) => {
    const W = DRESS[v % DRESS.length], k = W.k || (1 + ((v * 7) % 3 - 1) * .04), h = 58 * k, hip = -h * .45, sh = -h * .8;
    const coatK = (W.coat || {})[season] || 'hip', ci = season === 'winter' && W.cW != null ? W.cW : season === 'autumn' && W.cA != null ? W.cA : W.c;
    const summer = season === 'summer', winter = season === 'winter', dress = W.dress && W.dress[season];
    const top = coatK === 'none' ? `@shirt.${W.sh}` : `@coat.${ci}`, topD = coatK === 'none' ? `@shirtD.${W.sh}` : `@coatD.${ci}`;
    const sk = W.sk, legB = [], body = [], legA = [];
    // legs: trousers (or bare legs under a dress / skirt) and shoes
    const leg = (near) => {
      const w0 = 3.1 * k, w1 = 2.2 * k, c = near ? '' : 'D', out = [];
      if (dress) out.push([near ? `@skin.${sk}` : `@skinD.${sk}`, `M${f1(-w0 + .6)} ${f1(hip)}L${f1(-w1 + .4)} -2h${f1(2 * w1 - .8)}L${f1(w0 - .6)} ${f1(hip)}z`]);
      else out.push([v === 1 ? `@trou${c}.0` : `@trou${c}.${W.tr}`, `M${f1(-w0)} ${f1(hip - 1)}h${f1(2 * w0)}L${f1(w1)} -2h${f1(-2 * w1)}z`]);
      out.push([`@shoe.${W.so}`, `M${f1(-w1 - .4)} -3.4h${f1(2 * w1 + 2.8 * k)}q${f1(1.6 * k)} 0 ${f1(1.6 * k)} 1.7t${f1(-1.6 * k)} 1.7h${f1(-2 * w1 - 2.8 * k)}z`]);
      return out;
    };
    legB.push(...leg(false)); legA.push(...leg(true));
    if (W.pack) body.push([`@bag.${v % 3}`, `M${f1(-11 * k)} ${f1(sh + 1)}h${f1(7 * k)}q1 0 1 1.4v${f1(h * .27)}h${f1(-8 * k)}z`]);
    if (W.long) body.push([`@hair.${W.hair}`, `M${f1(-5.6 * k)} ${f1(sh - 8 * k)}q${f1(-2 * k)} ${f1(8 * k)} ${f1(-1 * k)} ${f1(13 * k)}h${f1(5 * k)}z`]);
    // the far arm swings back behind the body
    const sleeve = (c) => coatK === 'none' ? `@skin${c}.${sk}` : `@coat${c}.${ci}`;
    body.push({ s: sleeve('D'), w: f1(3.4 * k), d: `M${f1(-1.5)} ${f1(sh + 3)}q${f1(-3)} ${f1(h * .16)} ${f1(-4.5)} ${f1(h * .3)}` }, [winter ? `@knit.${(v + 2) % 6}` : `@skinD.${sk}`, circ(-6, sh + 3 + h * .31, 1.9 * k)]);
    // the torso and the coat: a long coat to the knee (flared), a hip jacket, a quilted puffer, a dress, a shirt
    const tb = coatK === 'long' ? hip + h * .24 : coatK === 'puffer' ? hip + 3 : dress ? hip + h * .22 : hip + 4;
    const flare = coatK === 'long' || dress ? 2.4 * k : 0, wx = coatK === 'puffer' ? 1.6 * k : 0;
    body.push([dress ? `@shirt.${W.sh}` : top, `M${f1(-7 * k - flare - wx)} ${f1(tb)}q${f1(-1 * k)} ${f1(-(tb - sh) * .8)} ${f1(3 * k + flare + wx)} ${f1(-(tb - sh))}h${f1(9 * k + wx)}q${f1(4 * k + wx)} ${f1((tb - sh) * .25)} ${f1(3 * k + flare)} ${f1(tb - sh)}z`]);
    body.push([dress ? `@shirtD.${W.sh}` : topD, `M${f1(2 * k)} ${f1(tb)}q${f1(3 * k)} ${f1(-(tb - sh) * .55)} ${f1(2 * k)} ${f1(-(tb - sh) * .97)}h${f1(1.6 * k)}q${f1(4 * k + wx)} ${f1((tb - sh) * .25)} ${f1(3 * k + flare)} ${f1(tb - sh)}z`, .55]);
    if (coatK === 'puffer') body.push({ s: topD, w: .9, op: .7, d: [1, 2, 3, 4].map(i => `M${f1(-7 * k)} ${f1(sh + (tb - sh) * i / 5)}h${f1(13 * k)}`).join('') });
    if (coatK === 'long' || coatK === 'hip') body.push({ s: topD, w: .8, op: .7, d: `M${f1(4.6 * k)} ${f1(sh + 2)}v${f1(tb - sh - 3)}` }, [`@shirt.${W.sh}`, `M${f1(2 * k)} ${f1(sh)}l${f1(2.6 * k)} ${f1(5 * k)}l${f1(1.2 * k)} ${f1(-5 * k)}z`]);
    if (coatK === 'long' && (v === 1 || v === 3)) body.push({ s: topD, w: 1.1, op: .7, d: `M${f1(-6.5 * k)} ${f1(hip)}h${f1(13 * k)}` });   // a trench belt
    if (coatK === 'none' && !dress && v === 0) body.push({ s: '#5a2430', w: 1.4, d: `M${f1(4 * k)} ${f1(sh + 2)}v${f1(h * .2)}` });   // a tie
    if (W.cross) body.push({ s: `@bag.1`, w: 1, d: `M${f1(-4 * k)} ${f1(sh + 1)}L${f1(5 * k)} ${f1(hip + 2)}` }, [`@bag.1`, rect(4 * k, hip - 1, 6 * k, 5 * k)]);
    // neck, scarf, head, hair or hat
    body.push([`@skinD.${sk}`, rect(-1.6 * k, sh - 2 * k, 3.4 * k, 3 * k)]);
    if (winter || (season === 'autumn' && v % 2 === 1)) body.push([`@knit.${(v * 2 + 1) % 6}`, `M${f1(-4.5 * k)} ${f1(sh + 1)}h${f1(10 * k)}l${f1(-1 * k)} ${f1(3.4 * k)}h${f1(-8 * k)}zM${f1(-3 * k)} ${f1(sh + 3)}l${f1(-2 * k)} ${f1(9 * k)}h${f1(2.6 * k)}l${f1(1 * k)} ${f1(-9 * k)}z`]);
    const hy = sh - 7 * k;
    body.push([`@skin.${sk}`, circ(0, hy, 5.6 * k)], [`@skin.${sk}`, `M${f1(5 * k)} ${f1(hy - 1 * k)}l${f1(2 * k)} ${f1(2.2 * k)}l${f1(-2 * k)} ${f1(.8 * k)}z`], [`@skinD.${sk}`, circ(-1.2 * k, hy + .5 * k, 1.3 * k), .6], ['@ink', circ(3 * k, hy - 1 * k, .7 * k), .8]);
    const hat = (W.hat || {})[season];
    if (hat === 'cap') body.push(['@coatD.2', `M${f1(-6 * k)} ${f1(hy - 2 * k)}q${f1(5 * k)} ${f1(-6 * k)} ${f1(11 * k)} ${f1(-1 * k)}l${f1(3 * k)} ${f1(1.6 * k)}h${f1(-14 * k)}z`]);
    else if (hat === 'beanie') body.push([`@knit.${v % 6}`, `M${f1(-6 * k)} ${f1(hy - 1 * k)}q${f1(6 * k)} ${f1(-12 * k)} ${f1(12 * k)} 0z`]);
    else body.push([`@hair.${W.hair}`, `M${f1(-5.8 * k)} ${f1(hy + 1 * k)}q${f1(1 * k)} ${f1(-8 * k)} ${f1(7 * k)} ${f1(-7 * k)}q${f1(5 * k)} ${f1(1 * k)} ${f1(4.6 * k)} ${f1(5 * k)}q${f1(-4 * k)} ${f1(-2 * k)} ${f1(-7 * k)} ${f1(-1 * k)}z`]);
    // the near arm and what it carries
    if (o.ride) {
      body.push({ s: sleeve(''), w: f1(3.4 * k), d: `M1 ${f1(sh + 3)}l${f1(6 * k)} ${f1(h * .14)}l${f1(6 * k)} ${f1(h * .02)}` }, [winter ? `@knit.${(v + 2) % 6}` : `@skin.${sk}`, circ(13 * k, sh + 3 + h * .16, 1.9 * k)]);
      return { legB, body, legA, hip };
    }
    const hand = [5 * k, sh + 3 + h * .3], up = W.carry === 'brella' ? !summer : W.carry === 'brellaW' ? (winter || season === 'autumn') : false;
    if (up || W.carry === 'phone' || W.carry === 'cup') {
      const hx2 = up ? 6 * k : 7 * k, hy2 = up ? sh - 1 : sh + h * .12;
      body.push({ s: sleeve(''), w: f1(3.4 * k), d: `M1 ${f1(sh + 3)}q${f1(1)} ${f1(h * .16)} ${f1(hx2 - 1)} ${f1(hy2 - sh - 3)}` }, [winter ? `@knit.${(v + 2) % 6}` : `@skin.${sk}`, circ(hx2, hy2, 1.9 * k)]);
      if (up) {
        const b = W.br, cx = hx2 - 2 * k, top = hy - 22 * k, rad = 17 * k;
        body.push({ s: '@ink', w: 1, d: `M${f1(hx2)} ${f1(hy2 + 2)}V${f1(top)}` }, [`@brella.${b}`, `M${f1(cx - rad)} ${f1(top + 9 * k)}Q${f1(cx - rad * .8)} ${f1(top - 4 * k)} ${f1(cx)} ${f1(top - 5 * k)}Q${f1(cx + rad * .8)} ${f1(top - 4 * k)} ${f1(cx + rad)} ${f1(top + 9 * k)}q${f1(-rad / 4)} ${f1(-3 * k)} ${f1(-rad / 2)} 0q${f1(-rad / 4)} ${f1(-3 * k)} ${f1(-rad / 2)} 0q${f1(-rad / 4)} ${f1(-3 * k)} ${f1(-rad / 2)} 0q${f1(-rad / 4)} ${f1(-3 * k)} ${f1(-rad / 2)} 0z`], [`@brellaD.${b}`, `M${f1(cx)} ${f1(top - 5 * k)}Q${f1(cx + rad * .8)} ${f1(top - 4 * k)} ${f1(cx + rad)} ${f1(top + 9 * k)}q${f1(-rad / 4)} ${f1(-3 * k)} ${f1(-rad / 2)} 0z`, .7], { s: `@brellaD.${b}`, w: .7, d: `M${f1(cx)} ${f1(top - 5 * k)}L${f1(cx - rad / 2)} ${f1(top + 8 * k)}M${f1(cx)} ${f1(top - 5 * k)}V${f1(top + 7 * k)}` }, ['@ink', circ(cx, top - 6 * k, .9)]);
      } else if (W.carry === 'phone') body.push(['@phone', rect(hx2 - .4, hy2 - 4.5, 2.4, 4.6)]);
      else body.push(['@cup.0', `M${f1(hx2 - 1.6)} ${f1(hy2 - 5.5)}h${f1(4.6)}l-.6 6h${f1(-3.4)}z`], ['@cup.1', rect(hx2 - 1.4, hy2 - 3.4, 4, 1.6)]);
    } else {
      body.push({ s: sleeve(''), w: f1(3.4 * k), d: `M1 ${f1(sh + 3)}q${f1(2.5)} ${f1(h * .18)} ${f1(3)} ${f1(h * .32)}` }, [winter ? `@knit.${(v + 2) % 6}` : `@skin.${sk}`, circ(4, sh + 3 + h * .33, 1.9 * k)]);
      const hy3 = sh + 3 + h * .33;
      if (W.carry === 'brief') body.push(['@bag.0', `M${f1(-1)} ${f1(hy3 + 2)}h${f1(11 * k)}v${f1(8 * k)}h${f1(-11 * k)}z`], { s: '@bag.0', w: 1, d: `M${f1(2)} ${f1(hy3 + 2)}q2 -3 4 0` }, ['@metal', rect(3.4, hy3 + 4, 1.6, 1.2)]);
      if (W.carry === 'paper') body.push(['#e8e4da', `M${f1(3)} ${f1(hy3 - 1)}l${f1(6 * k)} ${f1(-3)}l1 ${f1(9 * k)}l${f1(-6 * k)} 3z`], { s: '#b8b4aa', w: .6, d: `M${f1(4.5)} ${f1(hy3 + 1)}l${f1(4.6 * k)} -2M${f1(4.8)} ${f1(hy3 + 3.4)}l${f1(4.6 * k)} -2` });
      if (W.carry === 'brella' || W.carry === 'brellaW') body.push({ s: `@brella.${W.br}`, w: 2.6, d: `M${f1(4.5)} ${f1(hy3)}L${f1(9 * k)} -3` }, { s: '@ink', w: .9, d: `M${f1(4.5)} ${f1(hy3)}q-2 -3 0 -4` });
      if (W.tote) body.push([`@bag.3`, `M${f1(-3 * k)} ${f1(hip - 4)}h${f1(9 * k)}l${f1(1 * k)} ${f1(11 * k)}h${f1(-11 * k)}z`], { s: '@bag.3', w: .9, d: `M${f1(-1 * k)} ${f1(hip - 4)}q${f1(2.5 * k)} ${f1(-12 * k)} ${f1(5 * k)} 0` });
    }
    return { legB, body, legA, hip };
  };
  const walkAnim = (hip, period, deg) => ({ walk: { parts: ['legA', 'legB'], pivot: [0, Math.round(hip)], deg, period, bob: 1.4 } });

  /* ---------- person.commuter: city walkers in coats, with umbrellas, briefcases, phones, cups ---------- */
  defineObj({
    id: 'person.commuter', category: 'person', size: [44, 84], variants: 6, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: Object.assign({}, PAL, SEAS), anim: walkAnim(-26, .85, 22), shadow: { rx: 11, ry: 2.4, h: 64 },
    tags: ['uk', 'london', 'city', 'people', 'anonymous', 'commuter', 'pedestrian', 'umbrella', 'street', 'kit:people', 'kit:urban', 'kit:london', 'role:walker'],
    credit: 'city kit: commuters after the people kit figure, with a city wardrobe',
    build(v, r, ctx) { const f = figure(ctx.season, v); return { legB: f.legB, body: f.body, legA: f.legA }; },
  });

  /* ---------- person.cyclist-commuter: v0 a road commuter (helmet, a bright reflective vest, panniers),
     v1 an upright step-through with a front basket, v2 a heavy grey hire-style bike (no logos) ---------- */
  defineObj({
    id: 'person.cyclist-commuter', category: 'person', size: [76, 80], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'bike', 'body', 'legA'],
    palette: Object.assign({}, PAL, SEAS, { base: Object.assign({}, PAL.base, { tyre: '#202124', rim: '#a0a4a8', frame: ['#2a2e34', '#4a7a6a', '#8a9096'], vest: '#d8f040', vestS: '#e8eef0', helmet: ['#e8e4dc', '#2a2e34'], basket: ['#8a6a3a', '#5a4428'], pannier: '#1a1c20', lamp: '#fff0c8' }) }),
    night: { glow: { lamp: '#fff0c8' }, on: 1 },
    anim: { walk: { parts: ['legA', 'legB'], pivot: [-4, -42], deg: 26, period: .95, bob: .4 } }, shadow: { rx: 36, ry: 3, h: 62 },
    tags: ['uk', 'london', 'city', 'people', 'anonymous', 'cyclist', 'bike', 'commuter', 'street', 'kit:people', 'kit:urban', 'kit:london', 'role:walker'],
    credit: 'city kit: commuter cyclists',
    build(v, r, ctx) {
      const s = ctx.season, map = [0, 5, 2][v], f = figure(s, map, { ride: true }), fr = `@frame.${v}`;
      // seat the walker's body on the saddle: lean forward (road bike) or sit upright
      const t = [.42, .12, .2][v], c = Math.round(Math.cos(t) * 1000) / 1000, si = Math.round(Math.sin(t) * 1000) / 1000, hip = f.hip;
      const seat = [c, si, -si, c, f1(-4 + si * hip), f1(-42 - c * hip)];
      const keep = f.body.filter(sh => !(Array.isArray(sh) ? String(sh[0]).startsWith('@cup') || sh[0] === '@phone' : false));
      const place = arr => arr.map(sh => { const o = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh); o.m = seat; return o; });
      const wheel = cx => [{ s: '@tyre', w: 3, d: circ(cx, -15, 15) }, { s: '@rim', w: .8, d: circ(cx, -15, 12.4) }, { s: '@rim', w: .6, op: .8, d: `M${cx - 12} -15h24M${cx} -27v24M${cx - 8.6} -23.6l17.2 17.2M${cx - 8.6} -6.4l17.2-17.2` }, ['@rim', circ(cx, -15, 1.8)]];
      const bike = [...wheel(-22), ...wheel(24)];
      if (v === 1) bike.push({ s: fr, w: 2.6, d: 'M-22-15l16-1 8-10q6-8 14-10M-6-16l30 1-8-22M-8-42l2 26M16-37h8' }, { s: '@basket.0', w: 1, d: 'M26-40h14l-2 12h-10z' }, ['@basket.1', 'M26-40h14l-2 12h-10z', .7]);
      else bike.push({ s: fr, w: v === 2 ? 3.6 : 2.4, d: 'M-22-15l16-1 10-20M-6-16l30 1-8-22M-8-42l4-1M-6-16l-2-26M16-37h10' });
      if (v === 0) bike.push(['@pannier', 'M-34-36h18v14h-18z'], { s: '@tyre', w: 1.2, d: 'M-34-36h22l4 20' });
      if (v === 2) bike.push({ s: fr, w: 3, d: 'M-36-26q14-6 26-2M12-28q14-4 24 2' }, ['@frame.2', 'M20-42h10v6h-10z']);
      bike.push(['@tyre', 'M-14-44h11l1 2h-12z'], { s: '@tyre', w: 2, d: 'M24-38l4-2' }, { f: '@lamp', d: circ(30, -36, 1.8), glow: 'lamp' }, ['#c02a2a', rect(-30, -34, 3, 2)]);
      const legPair = near => { const cc = near ? '' : 'D', W = 3.6; return [{ s: `@trou${cc}.${[0, 5, 3][v]}`, w: W, d: near ? 'M-4-42l12 12-6 14' : 'M-4-42l6 16-8 8' }, [`@shoe.${[0, 0, 1][v]}`, near ? ell(3, -15, 3.4, 1.8) : ell(-5, -17, 3.4, 1.8)]]; };
      const body = place(keep);
      // the hi-vis vest and the helmet (road commuter), a helmet on the hire bike outside summer
      const hy = -58 * .8 - 7, hxw = -si * hy + seat[4], hyw = c * hy + seat[5];
      if (v === 0) body.push(...place([['@vest', 'M-7.6-26q-1-16 3-21h9q4 4 3.6 21z', .95], { s: '@vestS', w: 1.4, d: 'M-7-32h14M-7-38h14' }]), { f: '@helmet.0', d: `M${f1(hxw - 6.6)} ${f1(hyw - .5)}q1.5 -9 8 -8.6q5.6 1 5.6 7z` }, { s: '@tyre', w: .8, op: .6, d: `M${f1(hxw - 6)} ${f1(hyw - .8)}h12` });
      if (v === 2 && s !== 'summer') body.push({ f: '@helmet.1', d: `M${f1(hxw - 6.6)} ${f1(hyw - .5)}q1.5 -9 8 -8.6q5.6 1 5.6 7z` });
      return { legB: legPair(false), bike, body, legA: legPair(true) };
    },
  });
})();
