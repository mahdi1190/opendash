/* ============================================================
   SCENE LIBRARY: more people (docs/dev/SCENE_ENGINE.md, section 2.8).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Every person is drawn by the shared, FACELESS people builder (scenePeople, 70-scene-lib-people-0figure.js):
   anonymous side views FACING RIGHT, a plain egg for a head, no logos, badges or text on clothes, bags, boats or
   papers. Anchor: the feet (a hull's waterline, a board's or a wheel's contact). size[1] 64 stands for a 1.72 m person.
   detailPx: under 48 px only the silhouette is drawn (fine pieces carry detail: true).

   A POOL of twelve adults and four children (ages, builds, skin tones, hair) each with a wardrobe per season; every
   object below picks four of them and adds its own pose, props and overrides, so one object gives four genuinely
   different people in four seasons. At night: the builder's cool rim light, plus lit props (a cafe candle, a bike
   or buggy clip light, a kayak's or a dinghy's lamp, reflective strips, a phone screen).

   Objects: walkers (student, hiker, shopper, elderly-walker, takeaway-walker, football-fan), pairs (couple,
   elderly-couple), buggy-walker, sitters (bench-sitter, bench-reader, cafe-goer, picnicker, wheelchair-user),
   standing (phone-idler, photographer, birdwatcher), children (child-ball, child-scooter, child-jumping),
   skateboarder, and on the water (rower, paddleboarder, kayaker, sailor).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof scenePeople === 'undefined') return;   // the engine core or the builder is not in this build
  const PP = scenePeople, HIP = PP.HIP, { D, ell, circ, tone4 } = PP;
  const P = (...a) => D(0, ...a);
  const t = (slot, k) => `@${slot}.${k || 0}`;
  const shape = sh => (Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh));
  const det = sh => Object.assign(shape(sh), { detail: true });
  const line = (s, w, d, op, extra) => Object.assign({ s, w, d, op }, extra || {});

  /* ---------- affine path maps (a child's scale, a held stride, a lift onto a board) ---------- */
  const about = (deg, px, py, k, tx, ty) => { const r = deg * Math.PI / 180, c = Math.cos(r) * k, s = Math.sin(r) * k; return [c, s, -s, c, px - c * px + s * py + (tx || 0), py - s * px - c * py + (ty || 0)]; };
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const apply = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
  const fmt = a => { let o = ''; for (const v of a) { const s = String(Math.round(v * 10) / 10 || 0); o += (o && s[0] !== '-' ? ' ' : '') + s; } return o; };
  function xf(d, M) {
    const k = Math.hypot(M[0], M[1]), deg = Math.atan2(M[1], M[0]) * 180 / Math.PI;
    const pt = (x, y, rel) => [M[0] * x + M[2] * y + (rel ? 0 : M[4]), M[1] * x + M[3] * y + (rel ? 0 : M[5])];
    let o = '';
    for (const [, c, a] of String(d).matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
      const n = (a.match(NUM) || []).map(Number), rel = c !== c.toUpperCase(), u = c.toUpperCase(), q = [];
      if (u === 'Z') { o += c; continue; }
      if (u === 'A') for (let i = 0; i + 7 <= n.length; i += 7) q.push(n[i] * k, n[i + 1] * k, n[i + 2] + deg, n[i + 3], n[i + 4], ...pt(n[i + 5], n[i + 6], rel));
      else if ((u === 'H' || u === 'V') && rel) { for (const v of n) q.push(...pt(u === 'H' ? v : 0, u === 'V' ? v : 0, true)); o += 'l' + fmt(q); continue; }
      else if ('MLQC'.includes(u)) for (let i = 0; i + 1 < n.length; i += 2) q.push(...pt(n[i], n[i + 1], rel));
      else throw new Error('people-plus xf: path command ' + c + ' is not supported');
      o += c + fmt(q);
    }
    return o;
  }
  const move = (list, M) => { const k = Math.hypot(M[0], M[1]); return list.map(sh => { const o = shape(sh); o.d = xf(o.d, M); if (o.w && k !== 1) o.w = Math.round(o.w * k * 100) / 100; return o; }); };
  const S = (k, x, y) => [k, 0, 0, k, x || 0, y || 0];
  /** The far tier: form shading and rim lights become fine pieces, stroke widths rounded. */
  const farTier = list => list.map(sh => {
    const o = shape(sh);
    if (!o.detail && (o.glow === 'rim' || (!o.glow && o.op != null && o.op < 1))) o.detail = true;
    if (o.w) o.w = Math.round(o.w * 100) / 100;
    return o;
  });
  /** scenePeople.figure with a slim far tier (each hand and a sleeve's cuff are fine pieces). */
  const figure = o => {
    const f = PP.figure(o);
    for (const r of [f.at.farArm, f.at.nearArm]) {
      let n = 0;
      for (let i = r[0]; i < r[1]; i++) { const sh = shape(f.body[i]); if (sh.detail) continue; n++; if (!sh.s || n === 3) f.body[i] = Object.assign(sh, { detail: true }); }
    }
    return f;
  };
  /** A whole figure's parts in a held stride (legs turned +-deg about the hip), scaled k about the feet, at x (one list). */
  const posed = (f, deg, k, x, y) => {
    const at = a => mul(S(k, x, y || 0), about(a, 0, HIP, 1));
    return [...move(f.legB, at(deg)), ...move(f.body, S(k, x, y || 0)), ...move(f.legA, at(-deg))];
  };
  /** Drop the fine pieces of a second figure (a pair stays inside the silhouette budget). */
  const coarse = list => list.filter(sh => !shape(sh).detail && shape(sh).glow !== 'rim');

  /* ---------- palette and night ---------- */
  const PAL = PP.palette({ tyre: tone4('#26272b'), alloy: tone4('#a9adb4'), wood: tone4('#8a6240'), iron: tone4('#2e3236'), hull: tone4('#e8e6df'),
    hullb: tone4('#2f5a86'), hullr: tone4('#b4402e'), sail: tone4('#f1eee4'), board: tone4('#e6d27a'), ball: tone4('#f4f2ec'), lime: tone4('#c6dc3c'),
    rug: tone4('#c25a4a'), rug2: tone4('#e9d9b0'), cone: tone4('#d6a35c'), scoop: tone4('#f3dcc2'), paper: tone4('#f2efe6'), cup: tone4('#f0ece2'), ink2: tone4('#1d1f24'),
    water: tone4('#6f95ac') });
  const NIGHT = { on: 1, glow: Object.assign({}, PP.NIGHT.glow, { led: '#ff4d3d', beam: '#fff4d6', candle: '#ffc46a', kicks: '#ff6ad5' }) };
  const TAGS = (extra, kits) => ['uk', 'people', 'anonymous', 'silhouette', ...(extra || []), 'kit:people', ...(kits || ['kit:temperate', 'kit:urban']), 'role:walker'];

  /* ---------- the POOL: twelve adults (A) and four children (K), each a body and a wardrobe per season ---------- */
  const W = (top, tcol, bot, bcol, shoe, scol, more) => Object.assign({ top: { kind: top, col: tcol }, bottom: { kind: bot, col: bcol }, shoes: { kind: shoe, col: scol } }, more || {});
  const A = [
    { build: 'slim', age: 'young', skin: 3, hair: { style: 'long', col: 0 },
      spring: W('jacket', 'denim', 'jeans', 'black', 'trainer', 'white'), summer: W('tee', 'coral', 'shorts', 'denim', 'sandal', 'tan'),
      autumn: W('jumper', 'mustard', 'jeans', 'denim', 'boot', 'tan', { scarf: { col: 'rust' } }), winter: W('coat', 'camel', 'jeans', 'black', 'boot', 'black', { scarf: { col: 'cream' }, hat: { kind: 'beanie', col: 'cream' }, gloves: 'tan' }) },
    { build: 'average', age: 'young', skin: 5, hair: { style: 'crop', col: 0 },
      spring: W('hoodie', 'grey', 'joggers', 'charcoal', 'trainer', 'white'), summer: W('tee', 'white', 'shorts', 'khaki', 'trainer', 'white', { hat: { kind: 'cap', col: 'navy' } }),
      autumn: W('jacket', 'olive', 'jeans', 'denim', 'trainer', 'white'), winter: W('parka', 'black', 'joggers', 'black', 'trainer', 'white', { gloves: 'black', hat: { kind: 'beanie', col: 'charcoal' } }) },
    { build: 'broad', skin: 1, hair: { style: 'short', col: 2 },
      spring: W('jacket', 'navy', 'trousers', 'stone', 'shoe', 'tan'), summer: W('shirt', 'sky', 'shorts', 'stone', 'trainer', 'grey'),
      autumn: W('jacket', 'tweed', 'jeans', 'denim', 'boot', 'tan', { scarf: { col: 'navy', col2: 'sky' } }), winter: W('parka', 'forest', 'jeans', 'denim', 'boot', 'black', { hat: { kind: 'beanie', col: 'red' }, gloves: 'charcoal', scarf: { col: 'red' } }) },
    { build: 'stout', skin: 2, hair: { style: 'bun', col: 1 },
      spring: W('cardigan', 'teal', 'trousers', 'navy', 'shoe', 'navy'), summer: W('blouse', 'yellow', 'skirt', 'navy', 'sandal', 'tan'),
      autumn: W('rain', 'burgundy', 'trousers', 'charcoal', 'boot', 'black'), winter: W('coat', 'plum', 'trousers', 'charcoal', 'boot', 'black', { scarf: { col: 'pink' }, gloves: 'plum' }) },
    { build: 'slim', age: 'older', skin: 0, hair: { style: 'bald', col: 6 },
      spring: W('jacket', 'olive', 'trousers', 'grey', 'shoe', 'tan', { hat: { kind: 'flatcap', col: 'tweed' } }), summer: W('shirt', 'cream', 'trousers', 'khaki', 'shoe', 'tan', { hat: { kind: 'sunhat', col: 'stone', band: 'navy' } }),
      autumn: W('jacket', 'tweed', 'trousers', 'charcoal', 'boot', 'tan', { hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'mustard' } }), winter: W('coat', 'charcoal', 'trousers', 'grey', 'boot', 'black', { hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'burgundy' }, gloves: 'tan' }) },
    { build: 'average', age: 'older', skin: 4, hair: { style: 'short', col: 6 },
      spring: W('coat', 'sky', 'skirt', 'navy', 'shoe', 'navy', { tights: 'stone', bottom: { kind: 'skirt', col: 'navy', len: 'midi' } }), summer: W('blouse', 'pink', 'trousers', 'cream', 'sandal', 'tan', { hat: { kind: 'sunhat', col: 'cream', band: 'pink' } }),
      autumn: W('coat', 'rust', 'trousers', 'charcoal', 'shoe', 'black'), winter: W('coat', 'navy', 'trousers', 'charcoal', 'boot', 'black', { hat: { kind: 'beanie', col: 'plum' }, scarf: { col: 'plum', col2: 'pink' }, gloves: 'plum' }) },
    { build: 'slim', skin: 5, hair: { style: 'curly', col: 0 },
      spring: W('rain', 'yellow', 'jeans', 'denim', 'boot', 'tan'), summer: W('tee', 'teal', 'skirt', 'denim', 'sandal', 'tan'),
      autumn: W('cardigan', 'rust', 'jeans', 'black', 'boot', 'black', { scarf: { col: 'mustard' } }), winter: W('parka', 'burgundy', 'jeans', 'black', 'boot', 'black', { gloves: 'black', scarf: { col: 'cream' } }) },
    { build: 'slim', age: 'young', skin: 2, hair: { style: 'short', col: 1 },
      spring: W('shirt', 'white', 'jeans', 'denim', 'trainer', 'white'), summer: W('tee', 'forest', 'shorts', 'navy', 'trainer', 'white'),
      autumn: W('hoodie', 'navy', 'jeans', 'denim', 'trainer', 'grey'), winter: W('jacket', 'charcoal', 'jeans', 'black', 'boot', 'black', { scarf: { col: 'grey', col2: 'charcoal' }, hat: { kind: 'beanie', col: 'navy' } }) },
    { build: 'stout', skin: 4, hair: { style: 'short', col: 0 },
      spring: W('jumper', 'grey', 'trousers', 'navy', 'shoe', 'black'), summer: W('shirt', 'white', 'shorts', 'khaki', 'trainer', 'grey'),
      autumn: W('rain', 'navy', 'trousers', 'charcoal', 'shoe', 'black'), winter: W('coat', 'black', 'trousers', 'charcoal', 'boot', 'black', { hat: { kind: 'beanie', col: 'grey' }, scarf: { col: 'grey' }, gloves: 'black' }) },
    { build: 'broad', age: 'older', skin: 3, hair: { style: 'short', col: 5 },
      spring: W('cardigan', 'forest', 'trousers', 'grey', 'shoe', 'tan'), summer: W('shirt', 'sky', 'trousers', 'stone', 'shoe', 'tan', { hat: { kind: 'flatcap', col: 'stone' } }),
      autumn: W('jacket', 'olive', 'trousers', 'charcoal', 'boot', 'tan', { hat: { kind: 'flatcap', col: 'tweed' } }), winter: W('parka', 'navy', 'trousers', 'charcoal', 'boot', 'black', { hat: { kind: 'beanie', col: 'navy' }, scarf: { col: 'red' }, gloves: 'black' }) },
    { build: 'slim', age: 'young', skin: 0, hair: { style: 'pony', col: 4 },
      spring: W('jacket', 'pink', 'jeans', 'denim', 'trainer', 'white'), summer: W('tee', 'sky', 'shorts', 'denim', 'trainer', 'white', { hat: { kind: 'cap', col: 'white' } }),
      autumn: W('jumper', 'forest', 'skirt', 'charcoal', 'boot', 'black', { tights: 'black' }), winter: W('parka', 'sky', 'jeans', 'denim', 'boot', 'tan', { hat: { kind: 'beanie', col: 'white', pom: 'sky' }, gloves: 'white', scarf: { col: 'white' } }) },
    { build: 'average', skin: 1, hair: { style: 'curly', col: 7 },
      spring: W('jacket', 'mustard', 'trousers', 'charcoal', 'boot', 'black'), summer: W('shirt', 'cream', 'trousers', 'olive', 'sandal', 'tan'),
      autumn: W('rain', 'teal', 'jeans', 'denim', 'boot', 'black'), winter: W('coat', 'forest', 'jeans', 'black', 'boot', 'black', { scarf: { col: 'mustard', col2: 'rust' }, gloves: 'tan' }) },
  ];
  const K = [
    { build: 'slim', age: 'young', tall: -3, skin: 1, hair: { style: 'short', col: 3 },
      spring: W('rain', 'yellow', 'trousers', 'navy', 'boot', 'red'), summer: W('tee', 'red', 'shorts', 'navy', 'trainer', 'white', { hat: { kind: 'cap', col: 'sky' } }),
      autumn: W('hoodie', 'teal', 'trousers', 'navy', 'boot', 'red'), winter: W('parka', 'red', 'trousers', 'navy', 'boot', 'black', { hat: { kind: 'beanie', col: 'navy', pom: 'white' }, gloves: 'navy' }) },
    { build: 'slim', age: 'young', tall: -3, skin: 3, hair: { style: 'pony', col: 0 },
      spring: W('jacket', 'pink', 'skirt', 'denim', 'trainer', 'white', { tights: 'white' }), summer: W('tee', 'yellow', 'shorts', 'pink', 'sandal', 'tan'),
      autumn: W('rain', 'red', 'trousers', 'navy', 'boot', 'yellow'), winter: W('parka', 'plum', 'joggers', 'charcoal', 'boot', 'black', { gloves: 'pink', hat: { kind: 'beanie', col: 'pink', pom: 'white' } }) },
    { build: 'slim', age: 'young', tall: -3, skin: 5, hair: { style: 'curly', col: 0 },
      spring: W('hoodie', 'forest', 'joggers', 'grey', 'trainer', 'white'), summer: W('tee', 'sky', 'shorts', 'khaki', 'trainer', 'white'),
      autumn: W('jumper', 'mustard', 'jeans', 'denim', 'trainer', 'red', { scarf: { col: 'red' } }), winter: W('coat', 'navy', 'jeans', 'denim', 'boot', 'black', { hat: { kind: 'beanie', col: 'red', pom: 'white' }, gloves: 'red' }) },
    { build: 'slim', age: 'young', tall: -3, skin: 0, hair: { style: 'long', col: 4 },
      spring: W('hoodie', 'coral', 'joggers', 'grey', 'trainer', 'white'), summer: W('blouse', 'white', 'shorts', 'denim', 'sandal', 'tan', { hat: { kind: 'sunhat', col: 'cream', band: 'coral' } }),
      autumn: W('rain', 'teal', 'jeans', 'denim', 'boot', 'red'), winter: W('parka', 'coral', 'joggers', 'navy', 'boot', 'white', { gloves: 'white', hat: { kind: 'beanie', col: 'white' } }) },
  ];
  /** A pool person's look for a season, with the object's overrides (an object, or fn(season, v) -> object). */
  const look = (p, season, over, v) => Object.assign(PP.outfit(p, season), typeof over === 'function' ? over(season, v) : (over || {}));
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const warm = s => s === 'autumn' || s === 'winter';

  /** One definition: four pool people (pick), each built by make(o, v, season) -> parts. */
  function def(id, spec) {
    PP.define(Object.assign({
      id, category: 'person', variants: spec.pick.length, seasonal: true, shapeBySeason: true, flippable: true,
      palette: PAL, night: NIGHT, detailPx: true, shadow: spec.shadow || { rx: 11, ry: 2.4, h: 64 },
      credit: 'the shared people builder (scenePeople.figure) with a pool of twelve adults and four children',
    }, spec.def, {
      build(v, r, ctx) {
        const p = (spec.kids ? K : A)[spec.pick[v]], o = look(p, ctx.season, spec.over, v);
        const parts = spec.make(o, v, ctx.season);
        for (const k of Object.keys(parts)) parts[k] = farTier(parts[k]);
        return parts;
      },
    }));
  }
  const walkParts = f => ({ legB: f.legB, body: f.body, legA: f.legA });

  /* ================= WALKERS ================= */
  /* person.student: a backpack, a phone or a tote, books under the arm in autumn */
  const BAGC = ['charcoal', 'teal', 'mustard', 'navy'];
  def('person.student', {
    pick: [0, 1, 7, 10],
    def: { size: [30, 64], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(0.85, 22, 1.4), tags: TAGS(['walker', 'student', 'path', 'campus']) },
    over: (s, v) => ({ bag: { kind: 'backpack', col: BAGC[v], strip: warm(s) ? 1 : 0 }, hold: v % 2 ? 'phone' : null, arms: v % 2 ? 'phone' : 'walk' }),
    make: o => walkParts(figure(o)),
  });
  /* person.hiker: a rucksack, a walking pole, boots */
  def('person.hiker', {
    pick: [2, 6, 9, 11],
    def: { size: [32, 66], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(1.0, 20, 1.2), tags: TAGS(['walker', 'hiker', 'rambler', 'path', 'moor', 'hill'], ['kit:temperate']) },
    over: (s, v) => ({ bag: { kind: 'backpack', col: ['red', 'forest', 'navy', 'mustard'][v], strip: 1 }, hold: 'stick', shoes: { kind: 'boot', col: v % 2 ? 'tan' : 'charcoal' },
      bottom: { kind: s === 'summer' && v % 2 ? 'shorts' : 'trousers', col: ['charcoal', 'olive', 'khaki', 'grey'][v] },
      top: s === 'summer' ? { kind: 'tee', col: ['sky', 'coral', 'stone', 'teal'][v] } : { kind: warm(s) ? 'rain' : 'jacket', col: ['red', 'teal', 'olive', 'plum'][v] },
      hat: s === 'summer' ? { kind: 'sunhat', col: 'stone', band: 'olive' } : s === 'winter' ? { kind: 'beanie', col: 'red', pom: 'cream' } : null }),
    make: o => walkParts(figure(o)),
  });
  /* person.shopper: a carrier bag hanging from the far hand (plain, no print) */
  const BAGS = ['cream', 'sky', 'coral', 'stone'];
  def('person.shopper', {
    pick: [3, 5, 8, 0],
    def: { size: [30, 64], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(0.95, 18, 1.3), tags: TAGS(['walker', 'shopper', 'high-street', 'market']) },
    over: () => ({ hold: null, arms: { far: { hand: [3.6, -29] }, near: 'back' } }),
    make: (o, v) => {
      const f = figure(o), [hx, hy] = f.hands.far, c = BAGS[v];
      const bag = [line(t(c, 2), 0.6, P('M', hx - 2, hy + 3, 'Q', hx, hy - 1.4, hx + 2, hy + 3)),
        [t(c, 0), P('M', hx - 4.2, hy + 2.6, 'L', hx + 4.2, hy + 2.6, 'L', hx + 3.8, hy + 13, 'L', hx - 3.8, hy + 13, 'Z')],
        [t(c, 1), P('M', hx - 4.2, hy + 2.6, 'L', hx - 1.8, hy + 2.6, 'L', hx - 1.6, hy + 13, 'L', hx - 3.8, hy + 13, 'Z'), 0.6],
        det(line(t(c, 3), 0.35, P('M', hx - 3.8, hy + 4.6, 'L', hx + 3.8, hy + 4.6), 0.5))];
      const body = f.body.slice(); body.splice(f.at.farArm[1], 0, ...bag);
      return { legB: f.legB, body, legA: f.legA };
    },
  });
  /* person.elderly-walker: a slow older walker with a stick */
  def('person.elderly-walker', {
    pick: [4, 5, 9, 3],
    def: { size: [30, 62], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(1.25, 13, 0.8), tags: TAGS(['walker', 'elderly', 'path', 'promenade']) },
    over: (s, v) => ({ age: 'older', hold: v === 3 ? 'brolly' : 'stick', holdCol: 'navy' }),
    make: o => walkParts(figure(o)),
  });
  /* person.takeaway-walker: a cone in the warm months, a takeaway cup in the cold ones (near hand at the chest) */
  def('person.takeaway-walker', {
    pick: [10, 1, 3, 9],
    def: { size: [30, 64], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(1.0, 18, 1.2), tags: TAGS(['walker', 'ice-cream', 'coffee', 'promenade', 'seaside', 'park'], ['kit:temperate', 'kit:urban', 'kit:water']) },
    over: () => ({ hold: null, arms: { far: 'forward', near: { hand: [7.4, -43] } } }),
    make: (o, v, s) => {
      const f = figure(o), [x, y] = f.hands.near, out = [];
      if (s === 'summer' || s === 'spring') {
        out.push([t('cone', 0), P('M', x - 1.6, y - 1.2, 'L', x + 1.6, y - 1.2, 'L', x, y + 4.2, 'Z')], det(line(t('cone', 3), 0.3, P('M', x - 1, y, 'L', x + 0.6, y + 1.8, 'M', x + 1, y, 'L', x - 0.6, y + 1.8), 0.6)),
          [t(['scoop', 'pink', 'mustard', 'scoop'][v], 0), circ(x, y - 2.4, 1.9)], det([t('white', 0), circ(x - 0.5, y - 3.1, 0.6), 0.6]));
      } else {
        out.push([t('cup', 0), P('M', x - 1.7, y - 3.6, 'L', x + 1.7, y - 3.6, 'L', x + 1.3, y + 1.6, 'L', x - 1.3, y + 1.6, 'Z')], [t(['charcoal', 'tan', 'forest', 'charcoal'][v], 0), P('M', x - 1.9, y - 4.6, 'L', x + 1.9, y - 4.6, 'L', x + 1.8, y - 3.5, 'L', x - 1.8, y - 3.5, 'Z')],
          [t('tan', 0), P('M', x - 1.6, y - 2, 'L', x + 1.6, y - 2, 'L', x + 1.45, y - 0.2, 'L', x - 1.45, y - 0.2, 'Z')], det(line(t('white', 0), 0.35, P('M', x, y - 5.4, 'Q', x + 0.8, y - 7, x - 0.2, y - 8.4), 0.35)));
      }
      const body = f.body.slice(); body.push(...out);
      return { legB: f.legB, body, legA: f.legA };
    },
  });
  /* person.football-fan: a two-colour supporters' scarf (plain stripes, no crest), a matching shirt or hat; walking to the match */
  const TEAM = [['red', 'white'], ['navy', 'sky'], ['burgundy', 'sky'], ['mustard', 'black']];
  def('person.football-fan', {
    pick: [1, 2, 8, 10],
    def: { size: [30, 64], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(0.85, 22, 1.5), tags: TAGS(['walker', 'football', 'fan', 'stadium', 'matchday']) },
    over: (s, v) => { const [a, b] = TEAM[v]; return { scarf: { col: a, col2: b }, hold: null, top: s === 'summer' ? { kind: 'tee', col: a } : s === 'spring' ? { kind: 'jacket', col: a } : { kind: s === 'winter' ? 'parka' : 'jacket', col: 'charcoal' },
      hat: warm(s) ? { kind: 'beanie', col: a, pom: b } : null }; },
    make: o => walkParts(figure(o)),
  });

  /* ================= PAIRS ================= */
  /* person.couple / person.elderly-couple: the lead walks (the hook), the partner beside in a held stride, hand in hand or arm in arm */
  const pair = (lead, other, ox, meetY, slow) => (o, v, s) => {
    const po = look(A[other[v]], s, slow ? { age: 'older', hold: null } : { hold: null }), meet = [ox + 6.4, meetY];
    const a = figure(Object.assign({}, o, { hold: null, arms: { far: { hand: meet }, near: slow ? { hand: [6.6, -37] } : 'back' } }));
    const b = figure(Object.assign({}, po, { arms: { far: 'forward', near: { hand: [meet[0] - ox, meet[1]] } } }));
    return { legB: a.legB, body: [...coarse(posed(b, slow ? 10 : 15, 1, ox)), ...a.body], legA: a.legA };
  };
  def('person.couple', {
    pick: [1, 7, 2, 11],
    def: { size: [44, 64], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(0.95, 18, 1.2), shadow: { rx: 20, ry: 2.4, h: 64 }, tags: TAGS(['walker', 'couple', 'pair', 'path', 'promenade']) },
    over: () => ({ hold: null }),
    make: pair(0, [0, 10, 6, 8], -12, -31, false),
  });
  def('person.elderly-couple', {
    pick: [9, 4, 5, 2],
    def: { size: [40, 62], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(1.25, 12, 0.8), shadow: { rx: 18, ry: 2.4, h: 64 }, tags: TAGS(['walker', 'couple', 'elderly', 'pair', 'promenade', 'park']) },
    over: () => ({ age: 'older', hold: null }),
    make: pair(0, [5, 3, 4, 5], -9, -38, true),
  });

  /* ================= BUGGY ================= */
  function buggy(col, kind) {
    const out = [];
    out.push(line(t('iron', 0), 1.0, P('M', 10.6, -37.2, 'L', 21, -10.6, 'L', 33.4, -3.2, 'M', 21, -10.6, 'L', 20, -3.4)));
    out.push(line(t('tyre', 0), 1.3, circ(20, -3.2, 2.6)), line(t('tyre', 0), 1.2, circ(33.4, -2.6, 2.1)));
    if (kind === 'pram') {   // a carrycot pram: a deep bed and a big hood
      out.push([t(col, 0), P('M', 15.6, -24, 'Q', 24, -25, 33.4, -23.6, 'Q', 33, -15, 28, -12.4, 'L', 19, -12.4, 'Q', 15.4, -15, 15.6, -24, 'Z')]);
      out.push([t(col, 1), P('M', 15.2, -23.6, 'Q', 15, -34.6, 26, -34.4, 'Q', 23.4, -29, 24.6, -24.4, 'Q', 19.6, -24.6, 15.2, -23.6, 'Z')]);
    } else {
      out.push([t(col, 0), P('M', 16.2, -21.6, 'Q', 22, -24, 30.4, -20.8, 'L', 31.6, -13.6, 'Q', 24, -11.4, 16.8, -13.4, 'Z')]);
      out.push([t(col, 1), P('M', 15.4, -21.4, 'Q', 15.6, -31.4, 24.4, -31.6, 'Q', 22.4, -27, 23.6, -22.4, 'Q', 19.2, -22.6, 15.4, -21.4, 'Z')]);
    }
    out.push([t('cream', 0), P('M', 24, -22.8, 'Q', 27.6, -24.4, 30.6, -21, 'Q', 27, -19.8, 24, -20.6, 'Z')]);
    out.push(det(line(t(col, 3), 0.4, P('M', 17, -26.4, 'Q', 19.6, -29.6, 23.6, -29.8), 0.6)), det([t('alloy', 0), circ(20, -3.2, 0.6)]), det([t('alloy', 0), circ(33.4, -2.6, 0.5)]),
      det(line(t('tyre', 2), 0.35, P('M', 20, -5.8, 'L', 20, -0.6, 'M', 17.4, -3.2, 'L', 22.6, -3.2), 0.7)), det([t('iron', 1), P('M', 17, -11, 'L', 31, -11, 'L', 30, -8.6, 'L', 18, -8.6, 'Z'), 0.8]));
    out.push({ f: t('iron', 1), d: P('M', 31.4, -17.4, 'L', 32.6, -17.6, 'L', 32.7, -16, 'L', 31.5, -15.8, 'Z'), glow: 'led' });
    return out;
  }
  def('person.buggy-walker', {
    pick: [0, 2, 6, 8],
    def: { size: [70, 64], parts: ['legB', 'body', 'legA'], anim: PP.walkAnim(0.9, 18, 1.2), shadow: { rx: 24, ry: 2.6, h: 64 }, tags: TAGS(['walker', 'buggy', 'pram', 'parent', 'park', 'path']) },
    over: () => ({ hold: null, bag: null, arms: { far: { hand: [11.6, -37.6] }, near: { hand: [10.4, -36.8] } } }),
    make: (o, v) => { const f = figure(o); return { legB: f.legB, body: [...f.body, ...buggy(['teal', 'navy', 'red', 'charcoal'][v], v === 1 ? 'pram' : 'buggy')], legA: f.legA }; },
  });

  /* ================= SITTERS ================= */
  const SEAT = 16;   // a bench or chair seat, 16 units (about 43 cm)
  const LAP = { far: { hand: [8.6, -22.4] }, near: { hand: [9.6, -21.6] } };
  function bench(kind) {
    const out = [], w = kind === 'park' ? 'wood' : kind === 'iron' ? 'iron' : 'forest';
    // legs and arm ends (iron), slats, back
    out.push(line(t('iron', 0), 1.4, P('M', -9, -SEAT, 'L', -10, 0, 'M', 9, -SEAT, 'L', 10, 0, 'M', -10, -SEAT, 'L', -12.4, -SEAT - 15)));
    out.push([t(w, 0), P('M', -12, -SEAT - 1.4, 'L', 12, -SEAT - 1.4, 'L', 12, -SEAT + 0.4, 'L', -12, -SEAT + 0.4, 'Z')]);
    out.push([t(w, 1), P('M', -13.4, -SEAT - 6, 'L', -11.6, -SEAT - 6.2, 'L', -11, -SEAT - 15.6, 'L', -12.8, -SEAT - 15.4, 'Z')]);
    out.push(det(line(t(w, 2), 0.4, P('M', -12, -SEAT - 1.3, 'L', 12, -SEAT - 1.3), 0.7)), det(line(t('iron', 2), 0.4, P('M', 9, -SEAT + 0.6, 'Q', 13, -SEAT + 3, 10, -SEAT + 6), 0.6)));
    return out;
  }
  def('person.bench-sitter', {
    pick: [4, 5, 3, 9],
    def: { size: [36, 52], parts: ['bench', 'legB', 'body', 'legA'], anim: { turn: { part: 'body', pivot: [0, -SEAT - 3], deg: 3, period: 7, hold: 0.6 } }, shadow: { rx: 14, ry: 2.4, h: 40 },
      tags: TAGS(['bench', 'sitting', 'park', 'promenade', 'idle']) },
    over: () => ({ hold: null, legs: 'seated', seat: SEAT, arms: LAP }),
    make: (o, v) => { const f = figure(o); return { bench: bench(['park', 'iron', 'park', 'green'][v]), legB: f.legB, body: f.body, legA: f.legA }; },
  });
  def('person.bench-reader', {
    pick: [0, 7, 11, 2],
    def: { size: [36, 52], parts: ['bench', 'legB', 'body', 'legA'], anim: { turn: { part: 'body', pivot: [0, -SEAT - 3], deg: 2, period: 9, hold: 0.7 } }, shadow: { rx: 14, ry: 2.4, h: 40 },
      tags: TAGS(['bench', 'sitting', 'reading', 'park', 'idle']) },
    over: () => ({ hold: null, legs: 'seated', seat: SEAT, arms: { far: { hand: [10.4, -31] }, near: { hand: [11, -29.6] } } }),
    make: (o, v) => {
      const f = figure(o), x = 11.2, y = -30.6, c = ['red', 'navy', 'forest', 'paper'][v];
      const book = v === 3
        ? [[t('paper', 0), P('M', x - 1, y - 6, 'L', x + 2.4, y - 5.4, 'L', x + 2.4, y + 4.6, 'L', x - 1, y + 4, 'Z')], det(line(t('paper', 3), 0.3, P('M', x - 0.2, y - 3, 'L', x + 1.6, y - 2.6, 'M', x - 0.2, y - 1, 'L', x + 1.6, y - 0.6), 0.5))]
        : [[t(c, 0), P('M', x - 0.6, y - 4, 'L', x + 2.2, y - 3.6, 'L', x + 2.2, y + 3.2, 'L', x - 0.6, y + 2.8, 'Z')], [t('paper', 0), P('M', x + 0.4, y - 3.6, 'L', x + 2, y - 3.3, 'L', x + 2, y + 2.8, 'L', x + 0.4, y + 2.5, 'Z')]];
      const body = f.body.slice(); body.splice(f.at.nearArm[0], 0, ...book);
      return { bench: bench(['park', 'iron', 'green', 'park'][v]), legB: f.legB, body, legA: f.legA };
    },
  });
  /* person.cafe-goer: on a cafe chair at a small round table, a cup in hand; a candle in a jar lit at night */
  def('person.cafe-goer', {
    pick: [10, 1, 6, 8],
    def: { size: [44, 54], parts: ['chair', 'legB', 'body', 'legA', 'table'], anim: { turn: { part: 'body', pivot: [0, -SEAT - 3], deg: 3, period: 6, hold: 0.5 } }, shadow: { rx: 18, ry: 2.4, h: 40 },
      tags: TAGS(['cafe', 'sitting', 'high-street', 'terrace', 'idle']) },
    over: () => ({ hold: null, bag: null, legs: 'seated', seat: SEAT, arms: { far: { hand: [16, -27.6] }, near: { hand: [12, -30.6] } } }),
    make: (o, v) => {
      const f = figure(o), tc = ['iron', 'wood', 'iron', 'teal'][v], tx = 22;
      const chair = [line(t(tc, 0), 1.1, P('M', -7, -SEAT, 'L', -8.4, 0, 'M', 7, -SEAT, 'L', 8, 0, 'M', -7.6, -SEAT, 'L', -9.4, -SEAT - 14)), [t(tc, 1), P('M', -8.4, -SEAT - 1, 'L', 8.4, -SEAT - 1, 'L', 8.2, -SEAT + 0.6, 'L', -8.2, -SEAT + 0.6, 'Z')]];
      const [cx, cy] = f.hands.near;
      const table = [line(t(tc, 0), 1.3, P('M', tx, -26, 'L', tx, -1, 'M', tx - 5, 0, 'L', tx + 5, 0)), [t(tc, 1), P('M', tx - 8, -27.2, 'L', tx + 8, -27.2, 'L', tx + 7.6, -25.8, 'L', tx - 7.6, -25.8, 'Z')],
        [t('cup', 0), P('M', tx + 2, -30.2, 'L', tx + 5, -30.2, 'L', tx + 4.6, -27.2, 'L', tx + 2.4, -27.2, 'Z')],
        { f: t('cup', 1), d: P('M', tx - 4, -29.6, 'L', tx - 2.2, -29.6, 'L', tx - 2.2, -27.2, 'L', tx - 4, -27.2, 'Z'), op: 0.8 }, { f: t('mustard', 2), d: circ(tx - 3.1, -28.6, 0.6), glow: 'candle' }];
      const mug = [[t('cup', 0), P('M', cx - 0.6, cy - 3, 'L', cx + 2.2, cy - 3, 'L', cx + 1.9, cy + 0.6, 'L', cx - 0.3, cy + 0.6, 'Z')]];
      const body = f.body.slice(); body.splice(f.at.nearArm[0], 0, ...mug);
      return { chair, legB: f.legB, body, legA: f.legA, table };
    },
  });
  /* person.picnicker: seated low on a rug (a basket beside); in winter a flask */
  def('person.picnicker', {
    pick: [0, 6, 1, 11],
    def: { size: [44, 46], parts: ['rug', 'legB', 'body', 'legA'], anim: { turn: { part: 'body', pivot: [0, -6], deg: 3, period: 7, hold: 0.6 } }, shadow: false,
      tags: TAGS(['picnic', 'sitting', 'park', 'beach', 'meadow', 'idle'], ['kit:temperate']) },
    over: () => ({ hold: null, bag: null, legs: 'seated', seat: 2, arms: { far: { hand: [-6, -4] }, near: { hand: [9, -12] } } }),
    make: (o, v, s) => {
      const f = figure(o), rc = ['rug', 'teal', 'mustard', 'navy'][v];
      const rug = [[t(rc, 0), P('M', -16, 1.6, 'L', 30, 1.6, 'L', 28, -1.4, 'L', -14, -1.4, 'Z')], det(line(t('rug2', 0), 0.5, P('M', -12, -0.6, 'L', 26, -0.6, 'M', -12, 0.8, 'L', 26, 0.8, 'M', -2, -1.3, 'L', -3, 1.5, 'M', 10, -1.3, 'L', 10, 1.5), 0.8)),
        [t('wood', 2), P('M', -13, -0.6, 'L', -5, -0.6, 'L', -5.6, -6.6, 'L', -12.4, -6.6, 'Z')], line(t('wood', 1), 0.7, P('M', -11.6, -6.6, 'Q', -9, -10.6, -6.2, -6.6))];
      if (s === 'winter') rug.push([t('charcoal', 0), P('M', 22, -1.2, 'L', 24.4, -1.2, 'L', 24.4, -8.4, 'L', 22, -8.4, 'Z')]);
      return { rug, legB: f.legB, body: f.body, legA: f.legA };
    },
  });
  /* person.wheelchair-user: a self-propelled chair, the near wheel spins as they roll */
  const WH = [-2, -11], WR = 11;
  def('person.wheelchair-user', {
    pick: [2, 10, 9, 6],
    def: { size: [40, 60], parts: ['chair', 'legB', 'body', 'legA', 'wheel'], anim: { spin: { part: 'wheel', pivot: WH.slice(), period: 3 }, bob: { part: 'body', dy: 0.4, period: 1.5 } },
      shadow: { rx: 16, ry: 2.4, h: 50 }, tags: TAGS(['wheelchair', 'path', 'promenade', 'park', 'inclusive']) },
    over: () => ({ hold: null, bag: null, legs: 'seated', seat: 18, arms: { far: { hand: [3, -20.6] }, near: { hand: [5, -19.6] } } }),
    make: (o, v) => {
      const f = figure(o), fc = ['charcoal', 'teal', 'burgundy', 'navy'][v];
      const chair = [line(t('iron', 0), 1.1, P('M', -9.6, -38, 'L', -8, -18, 'L', 12, -18, 'L', 18, -3, 'L', 24, -3, 'M', 12, -18, 'L', 15, -3.2, 'M', -11.6, -38.6, 'L', -8.6, -38.2)),
        [t(fc, 0), P('M', -9.4, -36, 'L', -7.2, -36.2, 'L', -6.6, -20, 'L', -8.6, -19.8, 'Z')], [t(fc, 1), P('M', -8, -19.4, 'L', 12, -19.4, 'L', 12, -17.8, 'L', -8, -17.8, 'Z')],
        line(t('tyre', 0), 1.0, circ(15.6, -1.6, 1.6)), line(t('tyre', 1), 1.6, circ(WH[0] - 2, WH[1], WR - 0.6), 0.7)];
      const sp = []; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 6; sp.push('M', WH[0] + Math.cos(a) * (WR - 2), WH[1] + Math.sin(a) * (WR - 2), 'L', WH[0] - Math.cos(a) * (WR - 2), WH[1] - Math.sin(a) * (WR - 2)); }
      const wheel = [line(t('tyre', 0), 1.8, circ(WH[0], WH[1], WR - 0.9)), line(t('alloy', 1), 0.6, circ(WH[0], WH[1], WR - 2.6)), line(t('alloy', 2), 0.3, P(...sp), 0.8),
        [t(fc, 0), circ(WH[0], WH[1], 1.4)], { f: t('lime', 0), d: P('M', WH[0] + 6.6, WH[1] - 1, 'L', WH[0] + 8.2, WH[1] - 0.6, 'L', WH[0] + 8, WH[1] + 0.6, 'L', WH[0] + 6.4, WH[1] + 0.2, 'Z'), glow: 'lamp' }];
      return { chair, legB: f.legB, body: f.body, legA: f.legA, wheel };
    },
  });

  /* ================= STANDING ================= */
  def('person.phone-idler', {
    pick: [7, 0, 8, 5],
    def: { size: [26, 64], parts: ['legB', 'body', 'legA'], anim: { turn: { part: 'body', pivot: [0, HIP], deg: 2, period: 8, hold: 0.7 } }, tags: TAGS(['standing', 'waiting', 'phone', 'bus-stop', 'station', 'idle']) },
    over: () => ({ hold: 'phone', arms: 'phone' }),
    make: o => walkParts(figure(o)),
  });
  /** A camera or binoculars at the face: both hands up at the head's front. */
  const atFace = (o, kind, v) => {
    const f = figure(Object.assign({}, o, { hold: null, arms: { far: { hand: [6.6, -57.4] }, near: { hand: [5.6, -55.2] } } }));
    const x = f.head.x + f.head.rx + 0.4, y = f.head.y, c = ['ink2', 'charcoal', 'olive', 'ink2'][v];
    const gear = kind === 'camera'
      ? [[t(c, 0), P('M', x - 1, y - 2.2, 'L', x + 4.6, y - 2.2, 'L', x + 4.6, y + 1.8, 'L', x - 1, y + 1.8, 'Z')], [t(c, 1), circ(x + 5.6, y - 0.2, 1.6)], det([t('alloy', 1), circ(x + 6, y - 0.2, 0.7)])]
      : [[t(c, 0), P('M', x - 0.6, y - 1.8, 'L', x + 4.4, y - 1.6, 'L', x + 4.4, y + 0.8, 'L', x - 0.6, y + 0.6, 'Z')], det([t('sky', 1), circ(x + 4.6, y - 0.4, 0.8)])];
    const body = f.body.slice(); body.splice(f.at.nearArm[0], 0, ...gear);
    return { legB: f.legB, body, legA: f.legA };
  };
  def('person.photographer', {
    pick: [6, 2, 10, 9],
    def: { size: [28, 64], parts: ['legB', 'body', 'legA'], anim: { turn: { part: 'body', pivot: [0, HIP], deg: 3, period: 6, hold: 0.7 } }, tags: TAGS(['standing', 'tourist', 'camera', 'viewpoint', 'promenade', 'idle']) },
    over: (s, v) => ({ bag: v % 2 ? { kind: 'crossbody', col: 'tan' } : { kind: 'backpack', col: 'charcoal' } }),
    make: (o, v) => atFace(o, 'camera', v),
  });
  def('person.birdwatcher', {
    pick: [4, 3, 11, 8],
    def: { size: [28, 64], parts: ['legB', 'body', 'legA'], anim: { turn: { part: 'body', pivot: [0, HIP], deg: 2, period: 9, hold: 0.8 } }, tags: TAGS(['standing', 'birdwatcher', 'binoculars', 'reserve', 'heath', 'marsh', 'idle'], ['kit:temperate', 'kit:water']) },
    over: (s, v) => ({ top: { kind: warm(s) ? 'parka' : 'jacket', col: ['olive', 'forest', 'khaki', 'tweed'][v] }, shoes: { kind: 'boot', col: 'charcoal' } }),
    make: (o, v) => atFace(o, 'binoculars', v),
  });

  /* ================= CHILDREN (the KIDS pool, scaled 0.62 about the feet) ================= */
  const KS = 0.62;
  const kidParts = (f, k, extra) => ({ legB: move(f.legB, S(k)), body: [...move(f.body, S(k)), ...(extra || [])], legA: move(f.legA, S(k)) });
  def('person.child-ball', {
    pick: [0, 1, 2, 3], kids: true,
    def: { size: [30, 42], parts: ['legB', 'body', 'legA', 'ball'], anim: { bob: { part: 'ball', dy: 3, period: 0.6 } }, shadow: { rx: 8, ry: 2, h: 40 },
      tags: TAGS(['child', 'playing', 'football', 'park', 'green', 'beach']) },
    over: () => ({ arms: 'run', legs: 'run', hold: null, bag: null }),
    make: (o, v) => {
      const f = figure(o), bx = 13, by = -3.4, bc = ['ball', 'red', 'yellow', 'ball'][v];
      return Object.assign(kidParts(f, KS), { ball: [[t(bc, 0), circ(bx, by, 3.2)], det(line(t(bc === 'ball' ? 'ink2' : bc, 3), 0.4, P('M', bx - 1.4, by - 2.6, 'L', bx + 0.6, by - 0.4, 'L', bx - 0.6, by + 2.8, 'M', bx + 0.6, by - 0.4, 'L', bx + 3, by - 0.8), 0.7))] });
    },
  });
  def('person.child-scooter', {
    pick: [2, 3, 0, 1], kids: true,
    def: { size: [30, 44], parts: ['scooter', 'legB', 'body', 'legA'], anim: { bob: { part: '*', dy: 0.5, period: 0.7 } }, shadow: { rx: 12, ry: 2, h: 40 },
      tags: TAGS(['child', 'scooter', 'park', 'path', 'promenade']) },
    over: (s, v) => ({ hold: null, bag: null, hat: s === 'summer' ? o_hat(v) : { kind: 'helmet', col: ['red', 'sky', 'pink', 'lime'][v] }, arms: { far: { hand: [9.2 / KS, -24.6 / KS] }, near: { hand: [8.6 / KS, -24.2 / KS] } } }),
    make: (o, v) => {
      const f = figure(o), c = ['red', 'sky', 'pink', 'teal'][v];
      const scooter = [line(t(c, 0), 1.3, P('M', -9, -2.6, 'L', 12, -2.6, 'L', 9, -24.4)), line(t('iron', 0), 1.0, P('M', 6.4, -24.6, 'L', 11.4, -24.4)),
        line(t('tyre', 0), 1.2, circ(-8, -1.6, 1.6)), line(t('tyre', 0), 1.2, circ(13, -1.6, 1.6)), { f: t('lime', 0), d: circ(13, -1.6, 0.6), glow: 'kicks' }];
      return Object.assign(kidParts(f, KS), { scooter: move(scooter, S(1, 0, 0)) }, { legB: move(f.legB, S(KS, 0, -2.6)), body: move(f.body, S(KS, 0, -2.6)), legA: move(f.legA, S(KS, 0, -2.6)) });
    },
  });
  function o_hat(v) { return v % 2 ? { kind: 'cap', col: 'yellow' } : { kind: 'helmet', col: 'sky' }; }
  /* person.child-jumping: wellies and a splash in the wet seasons, a hop in summer; the whole child bobs */
  def('person.child-jumping', {
    pick: [1, 0, 3, 2], kids: true,
    def: { size: [26, 44], parts: ['puddle', 'legB', 'body', 'legA'], anim: { bob: { part: 'body', dy: 3, period: 0.7 } }, shadow: { rx: 8, ry: 2, h: 40 },
      tags: TAGS(['child', 'playing', 'puddle', 'park', 'path']) },
    over: (s, v) => ({ hold: null, bag: null, legs: 'run', arms: { far: { hand: [-2, -66] }, near: { hand: [9, -64] } }, shoes: { kind: 'boot', col: ['yellow', 'red', 'pink', 'forest'][v] } }),
    make: (o, v, s) => {
      const f = figure(o), all = [...move(f.legB, S(KS, 0, -3)), ...move(f.body, S(KS, 0, -3)), ...move(f.legA, S(KS, 0, -3))];
      const puddle = s === 'summer' ? [{ f: t('stone', 1), d: ell(2, 0.4, 9, 1.2), op: 0.35 }]
        : [{ f: t('water', 0), d: ell(2, 0.4, 11, 1.6), op: 0.75 }, det({ f: t('water', 2), d: ell(0, 0, 6, 0.6), op: 0.6 }), line(t('water', 2), 0.6, P('M', -8, -0.6, 'L', -10, -3.4, 'M', 11, -0.6, 'L', 13.4, -3.6, 'M', -4, -1, 'L', -5, -4.6, 'M', 7, -1, 'L', 8.4, -4.4), 0.8)];
      return { puddle, legB: [], body: all, legA: [] };
    },
  });
  /* person.skateboarder: a teen on a board, knees soft; the rider bobs over the board */
  def('person.skateboarder', {
    pick: [1, 7, 10, 11],
    def: { size: [34, 66], parts: ['board', 'legB', 'body', 'legA'], anim: { bob: { part: '*', dy: 0.6, period: 0.8 } }, shadow: { rx: 14, ry: 2, h: 60 },
      tags: TAGS(['skateboard', 'teen', 'skatepark', 'promenade', 'path']) },
    over: (s, v) => ({ hold: null, bag: null, arms: { far: { hand: [10, -36] }, near: { hand: [-9, -38] } }, shoes: { kind: 'trainer', col: ['white', 'black', 'red', 'white'][v] } }),
    make: (o, v) => {
      const f = figure(o), c = ['wood', 'red', 'teal', 'mustard'][v], L = S(1, 0, -3.4);
      const board = [[t(c, 0), P('M', -13, -3.4, 'L', 13, -3.4, 'Q', 15.6, -3.6, 16, -5.2, 'L', 16.4, -4.6, 'Q', 16, -2.2, 13, -2.2, 'L', -13, -2.2, 'Q', -16, -2.2, -16.4, -4.6, 'L', -16, -5.2, 'Q', -15.6, -3.6, -13, -3.4, 'Z')],
        [t('iron', 0), P('M', -10, -2.2, 'L', -7, -2.2, 'L', -8, -1.2, 'Z')], [t('iron', 0), P('M', 7, -2.2, 'L', 10, -2.2, 'L', 9, -1.2, 'Z')], [t('cream', 1), circ(-8.5, -0.6, 1.2)], [t('cream', 1), circ(8.5, -0.6, 1.2)]];
      return { board, legB: move(f.legB, mul(L, about(10, 0, HIP, 1))), body: move(f.body, L), legA: move(f.legA, mul(L, about(-10, 0, HIP, 1))) };
    },
  });

  /* ================= ON THE WATER (anchor: the waterline at y 0) ================= */
  const waterline = (x0, x1) => ({ f: t('water', 2), d: P('M', x0, -0.2, 'Q', (x0 + x1) / 2, 0.8, x1, -0.2, 'L', x1, 0.6, 'Q', (x0 + x1) / 2, 1.6, x0, 0.6, 'Z'), op: 0.5 });
  /* person.rower: a single scull; seated low, the near oar sweeps (turn about the rigger) */
  def('person.rower', {
    pick: [7, 10, 2, 6],
    def: { size: [96, 44], parts: ['legB', 'body', 'legA', 'hull', 'oars'], anim: { paddle: { dy: 0.8, deg: 1, period: 2.6 }, turn: { part: 'oars', pivot: [4, -9], deg: 16, period: 2.6, hold: 0 } },
      shadow: false, tags: TAGS(['rower', 'rowing', 'river', 'boat', 'regatta'], ['kit:temperate', 'kit:water']) },
    over: (s, v) => ({ hold: null, bag: null, hat: s === 'summer' ? { kind: 'cap', col: 'white' } : warm(s) ? { kind: 'beanie', col: 'navy' } : null,
      top: { kind: warm(s) ? 'jacket' : 'tee', col: ['navy', 'teal', 'red', 'plum'][v] }, bottom: { kind: 'shorts', col: 'black' }, tights: warm(s) ? 'black' : null, legs: 'seated', seat: 5,
      arms: { far: { hand: [14.4, -21] }, near: { hand: [13.4, -20] } } }),
    make: (o, v) => {
      const f = figure(o), hc = ['hull', 'hullb', 'board', 'hullr'][v];
      const hull = [[t(hc, 0), P('M', -46, -4, 'Q', 0, -5.4, 48, -3.6, 'Q', 44, 0.6, 30, 1.2, 'L', -34, 1.2, 'Q', -44, 0.6, -46, -4, 'Z')], [t(hc, 1), P('M', -40, -0.8, 'Q', 0, -0.4, 40, -0.6, 'L', 30, 1.2, 'L', -34, 1.2, 'Z'), 0.7],
        line(t('iron', 0), 0.7, P('M', 4, -4.6, 'L', 6, -9, 'L', 0, -9.4)), waterline(-48, 50), { f: t('lime', 0), d: circ(46, -4.4, 0.7), glow: 'lamp' }];
      const oars = [line(t('wood', 2), 0.9, P('M', 15.4, -20.6, 'L', -14, 0.4)), [t('red', 0), P('M', -14.6, -1, 'L', -24, 1.8, 'L', -23.4, 3.2, 'L', -13.8, 1.4, 'Z')]];
      return { legB: f.legB, body: f.body, legA: f.legA, hull, oars };
    },
  });
  /* person.paddleboarder: standing on a board, the paddle strokes (turn about the top hand) */
  def('person.paddleboarder', {
    pick: [0, 2, 10, 11],
    def: { size: [76, 70], parts: ['board', 'legB', 'body', 'legA', 'paddle'], anim: { paddle: { dy: 0.8, deg: 1.5, period: 3 }, turn: { part: 'paddle', pivot: [7, -50], deg: 14, period: 2.2, hold: 0 } },
      shadow: false, tags: TAGS(['paddleboard', 'sup', 'river', 'lake', 'beach', 'harbour'], ['kit:temperate', 'kit:water']) },
    over: (s, v) => ({ hold: null, bag: null, hat: s === 'summer' ? { kind: 'cap', col: 'white' } : null, shoes: { kind: 'sandal', col: 'black' },
      top: warm(s) ? { kind: 'jacket', col: ['black', 'navy', 'teal', 'charcoal'][v] } : { kind: 'tee', col: ['coral', 'sky', 'yellow', 'white'][v] },
      bottom: { kind: s === 'summer' ? 'shorts' : 'joggers', col: 'black' }, arms: { far: { hand: [7, -50] }, near: { hand: [10.6, -38] } } }),
    make: (o, v) => {
      const f = figure(o), c = ['board', 'sky', 'coral', 'white'][v], L = S(1, 0, -1.4);
      const board = [[t(c, 0), P('M', -30, -1.4, 'L', 30, -1.4, 'Q', 37, -1.6, 38, -3.4, 'Q', 37, 0.4, 30, 0.6, 'L', -30, 0.6, 'Q', -33, 0.4, -33.4, -1.4, 'Z')], det(line(t(c, 3), 0.4, P('M', -28, -0.6, 'L', 30, -0.6), 0.6)), waterline(-36, 40)];
      const paddle = [line(t('ink2', 1), 0.9, P('M', 7, -51, 'L', 20, 2)), [t('ink2', 0), P('M', 19, 0, 'L', 21.6, -0.6, 'L', 23.4, 7, 'L', 21, 7.4, 'Z'), 0.85], line(t('ink2', 0), 1.2, P('M', 5.6, -51.4, 'L', 8.4, -51.8))];
      return { board, legB: move(f.legB, L), body: move(f.body, L), legA: move(f.legA, L), paddle: move(paddle, L) };
    },
  });
  /* person.kayaker: a sit-on kayak, a double-bladed paddle that rocks side to side; a white stern light at night */
  def('person.kayaker', {
    pick: [11, 6, 7, 3],
    def: { size: [70, 44], parts: ['legB', 'body', 'legA', 'hull', 'paddle'], anim: { paddle: { dy: 0.7, deg: 1.5, period: 2.4 }, turn: { part: 'paddle', pivot: [10, -26], deg: 22, period: 1.6, hold: 0 } },
      shadow: false, tags: TAGS(['kayak', 'canoe', 'river', 'lake', 'canal', 'harbour'], ['kit:temperate', 'kit:water']) },
    over: (s, v) => ({ hold: null, bag: null, legs: 'seated', seat: 3, hat: s === 'summer' ? { kind: 'sunhat', col: 'stone', band: 'teal' } : { kind: 'helmet', col: ['red', 'white', 'yellow', 'sky'][v] },
      top: { kind: 'jacket', col: ['red', 'mustard', 'teal', 'navy'][v] }, arms: { far: { hand: [13, -29] }, near: { hand: [8, -24] } } }),
    make: (o, v) => {
      const f = figure(o), hc = ['hullr', 'board', 'hullb', 'teal'][v];
      const hull = [[t(hc, 0), P('M', -32, -4.6, 'Q', -4, -9, 34, -4.4, 'Q', 28, 1.2, 18, 1.4, 'L', -22, 1.4, 'Q', -30, 1, -32, -4.6, 'Z')],
        [t('iron', 0), P('M', -6, -6.8, 'Q', 2, -7.8, 10, -6.6, 'L', 9.6, -5.6, 'Q', 2, -6.6, -5.6, -5.8, 'Z')], [t(hc, 1), P('M', -28, -1, 'Q', 0, -0.4, 30, -1.4, 'L', 18, 1.4, 'L', -22, 1.4, 'Z'), 0.7],
        waterline(-34, 36), { f: t('white', 0), d: circ(-30, -5.4, 0.7), glow: 'beam' }];
      const paddle = [line(t('iron', 0), 0.9, P('M', -4, -12, 'L', 24, -40)), [t(['yellow', 'red', 'charcoal', 'mustard'][v], 0), P('M', -4, -12, 'L', -8.4, -6.4, 'L', -10, -8, 'L', -5.4, -13.2, 'Z')],
        [t(['yellow', 'red', 'charcoal', 'mustard'][v], 1), P('M', 24, -40, 'L', 28.4, -45.6, 'L', 30, -44, 'L', 25.4, -38.8, 'Z')]];
      return { legB: f.legB, body: f.body, legA: f.legA, hull, paddle };
    },
  });
  /* person.sailor: a small sailing dinghy, the sailor sitting out on the side, hand on the tiller; the sail sways */
  def('person.sailor', {
    pick: [9, 0, 1, 11],
    def: { size: [70, 92], parts: ['hull', 'sail', 'legB', 'body', 'legA', 'side'], anim: { paddle: { dy: 1, deg: 2, period: 3.2 }, sway: { part: 'sail', pivot: [6, -6], deg: 2.5 } },
      shadow: false, tags: TAGS(['sailor', 'sailing', 'dinghy', 'boat', 'harbour', 'lake', 'estuary'], ['kit:temperate', 'kit:water']) },
    over: (s, v) => ({ hold: null, bag: null, legs: 'seated', seat: 8, hat: s === 'summer' ? { kind: 'cap', col: 'navy' } : warm(s) ? { kind: 'beanie', col: 'red' } : null,
      top: { kind: 'jacket', col: ['red', 'yellow', 'navy', 'teal'][v] }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'boot', col: 'charcoal' },
      arms: { far: { hand: [-8, -24] }, near: { hand: [10, -26] } } }),
    make: (o, v) => {
      const sx = -10, f = figure(o), hc = ['hull', 'hullb', 'hullr', 'hull'][v], sc = ['sail', 'sail', 'cream', 'sky'][v];
      const shift = l => move(l, S(1, sx, -4));
      const hull = [[t(hc, 0), P('M', -30, -8, 'L', 30, -8, 'Q', 32, -4, 26, 1.4, 'L', -26, 1.4, 'Q', -30, -2, -30, -8, 'Z')], line(t('iron', 0), 1.2, P('M', 6, -8, 'L', 6, -84)),
        line(t('wood', 0), 0.9, P('M', -30, -8, 'L', -34, 2, 'M', -30, -7, 'L', -22, -16)), { f: t('mustard', 2), d: circ(6, -84.6, 0.9), glow: 'lamp' }];
      const sail = [[t(sc, 0), P('M', 7, -82, 'Q', 22, -40, 24, -12, 'L', 7, -12, 'Z')], [t(sc, 1), P('M', 5, -80, 'Q', -12, -46, -24, -14, 'L', 5, -14, 'Z')], line(t('iron', 0), 0.8, P('M', -26, -13, 'L', 6, -13)),
        det(line(t(sc, 3), 0.3, P('M', 6, -60, 'L', 15, -58, 'M', 6, -40, 'L', 20, -38, 'M', 4, -50, 'L', -8, -48, 'M', 4, -30, 'L', -16, -28), 0.5))];
      const side = [[t(hc, 1), P('M', -30, -6, 'L', 30, -6, 'Q', 31, -3, 26, 1.4, 'L', -26, 1.4, 'Q', -29.6, -1.6, -30, -6, 'Z'), 0.9], line(t(hc, 2), 0.7, P('M', -30, -8, 'L', 30, -8), 0.8), waterline(-34, 34)];
      return { hull, sail, legB: shift(f.legB), body: shift(f.body), legA: shift(f.legA), side };
    },
  });

  void SEASONS;
})();
