/* ============================================================
   SCENE LIBRARY: people, the London station kit (docs/dev/SCENE_ENGINE.md, section 2.8; the care rule:
   anonymous FACELESS figures, at most 10 at a station, no crowds).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Drawn by the shared, faceless people builder (scenePeople, 70-scene-lib-people-0figure.js): side views
   FACING RIGHT, the head a plain egg, no logos, makers' marks or text. Anchor: the feet. size[1] 64 stands
   for a 1.72 m person (the depth ladder, 2.8); detailPx: under 48 px only the silhouette is drawn.

   person.commuter-station wears TRAVEL KIT (rain jackets, parkas, jeans and trainers; the city's office
   wardrobe is person.commuter's) and carries what station commuters carry: a hard attache case, a phone held
   up (its screen lit after dusk), a big travel rucksack and headphones, a canvas tote on the shoulder, a
   two-tone golf umbrella when it is not summer (a steel travel mug when it is), a wheeled case.
   person.busker: a guitarist, a violinist and a saxophonist (one connected instrument), standing, an open case
   with coins at their feet.

   Parts: 'legB' (the far leg), 'body', 'legA' (the near leg) and, for the busker, 'arm' (the strumming or
   bowing arm, a 'turn' hook about the near shoulder; the saxophonist's hands stay on the keys, so the
   saxophone's 'arm' is empty and the bob carries the movement).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof scenePeople === 'undefined') return;   // the engine core or the builder is not in this build
  const PP = scenePeople, P = (...a) => PP.D(0, ...a), t = (slot, k) => `@${slot}.${k || 0}`;
  const det = sh => Object.assign(Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : sh, { detail: true });
  const rr = (x, y, w, h, r) => P('M', x + r, y, 'L', x + w - r, y, 'Q', x + w, y, x + w, y + r, 'L', x + w, y + h - r, 'Q', x + w, y + h, x + w - r, y + h, 'L', x + r, y + h, 'Q', x, y + h, x, y + h - r, 'L', x, y + r, 'Q', x, y, x + r, y, 'Z');
  const poly = pts => P('M', ...pts[0], ...pts.slice(1).flatMap(q => ['L', ...q]), 'Z');
  const ys0 = f => f.shoulders.near[1] - 1.9;   // the shoulder line of a standing figure

  /* ---------- person.commuter-station: v0 a hard attache, v1 a phone held up, v2 a rucksack and headphones, v3 a tote on
     the shoulder, v4 a golf umbrella (a travel mug in summer), v5 a wheeled case ---------- */
  const KIT = [
    { build: 'slim', skin: 0, hair: { style: 'short', col: 4 }, carry: 'attache',
      spring: { top: { kind: 'rain', col: 'navy' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'blouse', col: 'white' }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'shoe', col: 'navy' } },
      autumn: { top: { kind: 'rain', col: 'charcoal' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'black' } },
      winter: { top: { kind: 'parka', col: 'navy' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'grey' }, gloves: 'black' } },
    { build: 'average', age: 'young', skin: 1, hair: { style: 'crop', col: 2 }, carry: 'phone',
      spring: { top: { kind: 'jacket', col: 'black' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'crossbody', col: 'charcoal' } },
      summer: { top: { kind: 'tee', col: 'white' }, bottom: { kind: 'shorts', col: 'navy' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'crossbody', col: 'charcoal' } },
      autumn: { top: { kind: 'hoodie', col: 'forest' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'crossbody', col: 'charcoal', strip: 1 } },
      winter: { top: { kind: 'parka', col: 'olive' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'beanie', col: 'mustard' }, bag: { kind: 'crossbody', col: 'charcoal', strip: 1 } } },
    { build: 'average', age: 'young', skin: 3, hair: { style: 'pony', col: 1 }, carry: 'rucksack',
      spring: { top: { kind: 'hoodie', col: 'plum' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'tee', col: 'mustard' }, bottom: { kind: 'shorts', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'forest' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' } },
      winter: { top: { kind: 'parka', col: 'teal' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, gloves: 'charcoal' } },
    { build: 'slim', skin: 2, hair: { style: 'short', col: 0 }, carry: 'tote',
      spring: { top: { kind: 'jumper', col: 'forest' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'tee', col: 'sky' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'tan' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' } },
      winter: { top: { kind: 'coat', col: 'navy' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'mustard' }, hat: { kind: 'beanie', col: 'rust' } } },
    { build: 'broad', skin: 0, hair: { style: 'short', col: 7 }, carry: 'golf',
      spring: { top: { kind: 'rain', col: 'olive' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' } },
      summer: { top: { kind: 'shirt', col: 'white' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'tan' } },
      autumn: { top: { kind: 'rain', col: 'navy' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' } },
      winter: { top: { kind: 'parka', col: 'black' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'navy' }, gloves: 'black' } },
    { build: 'slim', skin: 1, hair: { style: 'long', col: 3 }, carry: 'wheelie',
      spring: { top: { kind: 'jacket', col: 'sky' }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'blouse', col: 'yellow' }, bottom: { kind: 'trousers', col: 'white' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'burgundy' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' } },
      winter: { top: { kind: 'coat', col: 'grey' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'teal' }, gloves: 'teal' } },
  ];
  const WHEELIE = { tilt: 0.61, w: 13, h: 20 };   // the case leans 35 degrees toward the hand on its wheels

  /** A black hard attache case in the far hand (the far side: under the far arm and the torso). */
  const attache = ([hx, hy]) => {
    const x0 = hx - 5.6, y0 = hy + 2.4, w = 11.2, h = 8.2;
    return [[t('black', 0), P('M', hx - 2, y0 + 0.1, 'L', hx - 1.6, hy - 0.9, 'L', hx + 1.6, hy - 0.9, 'L', hx + 2, y0 + 0.1, 'L', hx + 1.2, y0 + 0.1, 'L', hx + 1, hy, 'L', hx - 1, hy, 'L', hx - 1.2, y0 + 0.1, 'Z')],   // the handle
      [t('black', 1), rr(x0, y0, w, h, 0.7)],
      det({ s: t('steel', 1), w: 0.4, op: 0.8, d: P('M', x0 + 0.3, y0 + 1.6, 'L', x0 + w - 0.3, y0 + 1.6) }),   // the lid's rim
      det([t('steel', 2), PP.rect(x0 + 1.8, y0 + 1.1, 1.3, 1.1) + PP.rect(x0 + w - 3.1, y0 + 1.1, 1.3, 1.1), 0.9]),   // the latches
      det({ s: t('black', 2), w: 0.4, op: 0.5, d: P('M', x0 + 0.8, y0 + 0.5, 'L', x0 + w - 0.8, y0 + 0.5) }),   // the lit top edge
      det([t('black', 3), P('M', x0 + w - 2.4, y0 + 0.3, 'L', x0 + w - 0.3, y0 + 0.3, 'L', x0 + w - 0.3, y0 + h - 0.3, 'L', x0 + w - 2.4, y0 + h - 0.3, 'Z'), 0.5])];   // the shaded end
  };
  /** The phone held up below the chin, turned three-quarters toward the face (its screen lights after dusk). */
  const phoneUp = ([hx, hy]) => [[t('charcoal', 0), poly([[hx - 1.0, hy + 0.5], [hx + 1.3, hy + 0.9], [hx + 2.0, hy - 3.7], [hx - 0.3, hy - 4.1]])],
    { f: t('sky', 2), d: poly([[hx - 0.6, hy + 0.1], [hx + 1.0, hy + 0.4], [hx + 1.55, hy - 3.3], [hx - 0.05, hy - 3.6]]), op: 0.55, glow: 'screen' },
    det({ s: t('charcoal', 2), w: 0.3, op: 0.6, d: P('M', hx + 1.4, hy + 0.8, 'L', hx + 2.05, hy - 3.6) })];   // the lit edge
  /** Over-ear headphones: the band over the crown and the near cup over the ear (behind the head's centre, not on the face). */
  const headphones = (h, top) => [{ s: t('charcoal', 0), w: 1.1, d: P('M', h.x - 1.4, h.y - 1.3, 'Q', h.x - 2.0, top + 1.6, h.x - 0.7, top - 0.4) },
    [t('red', 0), PP.ell(h.x - 1.5, h.y + 0.5, 1.6, 2.0)], det([t('red', 3), P('M', h.x - 3.1, h.y + 0.5, 'Q', h.x - 3.0, h.y + 2.3, h.x - 1.5, h.y + 2.5, 'Q', h.x - 2.4, h.y + 1.8, h.x - 2.5, h.y + 0.4, 'Z'), 0.6]),   // the cup's shaded back
    det({ s: t('red', 2), w: 0.35, op: 0.7, d: P('M', h.x - 2.7, h.y - 0.4, 'Q', h.x - 2.2, h.y - 1.4, h.x - 1.2, h.y - 1.4) })];
  /** A big travel rucksack on the back (under the far arm) and its near shoulder strap (under the near arm). */
  const rucksack = (f, o) => {
    const ys = ys0(f), xb = -PP.BUILD[o.build].d / 2 - PP.TOPS[o.top.kind].g, bx = xb - 6.4;
    const back = [[t('rust', 1), P('M', xb + 0.4, ys - 2.2, 'Q', bx, ys - 3, bx - 0.2, ys + 2, 'L', bx - 0.6, -30.4, 'Q', bx + 0.2, -28.6, xb + 0.2, -29.4, 'Z')],
      [t('rust', 0), P('M', bx + 0.6, ys - 2.6, 'Q', xb + 0.2, ys - 3.4, xb + 0.6, ys - 0.6, 'L', xb - 0.6, ys + 2.4, 'Q', bx + 1, ys + 2.6, bx, ys + 1.2, 'Z')],   // the lid
      [t('rust', 3), rr(bx - 1.3, -40.6, 2.4, 8.2, 0.8), 0.85],   // a side pocket
      det({ s: t('charcoal', 1), w: 0.6, op: 0.9, d: P('M', bx - 0.4, ys + 6, 'L', xb, ys + 6, 'M', bx - 0.5, -35, 'L', xb, -35) }),   // compression straps
      det({ s: t('rust', 2), w: 0.4, op: 0.6, d: P('M', bx + 0.4, ys + 3.2, 'Q', bx - 0.2, -40, bx - 0.2, -31) }),   // the lit back edge
      { f: t('stone', 2), d: PP.rect(bx - 0.5, -32.6, 3.6, 1), op: 0.8, glow: 'lamp' }];   // a reflective tab
    const strap = [{ s: t('charcoal', 1), w: 1.1, d: P('M', -1.2, ys - 0.2, 'Q', PP.BUILD[o.build].d / 2 + 0.2, ys + 3, PP.BUILD[o.build].d / 2 - 1.4, -39.6) },
      det([t('grey', 2), PP.rect(PP.BUILD[o.build].d / 2 - 1.9, ys + 7, 1.1, 0.8)])];   // the chest strap's buckle
    return { back, strap };
  };
  /** A canvas tote on the near shoulder, hanging at the back of the hip (under the near arm). */
  const shoulderTote = (f) => {
    const ys = ys0(f), x0 = -6.6, x1 = 1.6, y0 = -42, y1 = -30.6;
    return [{ s: t('cream', 3), w: 0.7, d: P('M', x0 + 1.2, y0 + 0.4, 'Q', -2.6, ys - 1.4, -0.6, ys + 0.6, 'Q', 0.6, ys + 2.4, x1 - 1.2, y0 + 0.4) },   // the straps over the shoulder
      [t('cream', 0), P('M', x0, y0, 'L', x1, y0, 'L', x1 + 0.6, y1, 'Q', (x0 + x1) / 2, y1 + 0.5, x0 - 0.4, y1, 'Z')],
      [t('navy', 0), P('M', x0 - 0.25, y1 - 3.2, 'L', x1 + 0.45, y1 - 3.2, 'L', x1 + 0.6, y1, 'Q', (x0 + x1) / 2, y1 + 0.5, x0 - 0.4, y1, 'Z')],   // a dyed base (plain: no print)
      det([t('cream', 3), P('M', x0, y0, 'L', x0 + 2, y0, 'L', x0 + 1.6, y1 - 3.2, 'L', x0 - 0.25, y1 - 3.2, 'Z'), 0.35]),   // the shade at the back
      det({ s: t('cream', 3), w: 0.35, op: 0.45, d: P('M', -2.6, y0 + 1.4, 'Q', -1.8, y0 + 4, -2.4, y0 + 6.4) })];   // a fold
  };
  /** A two-tone golf umbrella (eight panels) over the head on a long shaft, its J handle in the near hand. */
  const golf = (f) => {
    const [ux, uy] = f.hands.near, ax = ux + 0.8, ay = f.top - 8.4, R = 15.6, sc = (k) => [ax + R * k, ay + 6.4 - Math.abs(k) * 0.4];
    const rim = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map(k => sc(k));
    const dome = P('M', ...rim[0], 'Q', ax - R + 1.2, ay - 3.2, ax, ay - 3.6, 'Q', ax + R - 1.2, ay - 3.2, ...rim[8], ...rim.slice(0, 8).reverse().flatMap((q, i) => ['Q', (q[0] + rim[7 - i + 1][0]) / 2, q[1] - 1.2, ...q]), 'Z');
    const panel = (i) => P('M', ax, ay - 3.6, 'L', ...rim[i], 'Q', (rim[i][0] + rim[i + 1][0]) / 2, rim[i][1] - 1.2, ...rim[i + 1], 'Z');
    return [{ s: t('charcoal', 0), w: 0.6, d: P('M', ux, uy + 1.4, 'L', ax, ay - 3.6) },   // the shaft
      [t('navy', 0), dome], [t('white', 0), panel(1) + panel(3) + panel(5) + panel(7)],
      [t('navy', 1), P('M', ...rim[0], 'Q', ax - R + 1.2, ay - 3.2, ax, ay - 3.6, 'L', ...rim[2], 'Q', (rim[1][0] + rim[2][0]) / 2, rim[1][1] - 1.2, ...rim[1], 'Q', (rim[0][0] + rim[1][0]) / 2, rim[0][1] - 1.2, ...rim[0], 'Z'), 0.5],   // the shade on the far side
      det({ s: t('navy', 3), w: 0.35, op: 0.5, d: [2, 4, 6].map(i => P('M', ax, ay - 3.6, 'L', ...rim[i])).join('') }),   // the ribs' seams
      det({ s: t('charcoal', 0), w: 0.6, d: P('M', ax, ay - 3.6, 'L', ax, ay - 5) }), det({ s: t('tan', 1), w: 0.9, d: P('M', ux + 0.1, uy + 1.2, 'Q', ux + 0.4, uy + 3, ux - 0.9, uy + 2.8) }),   // the tip, the J handle
      { f: t('white', 2), d: P('M', ...rim[0], ...rim.slice(1).flatMap((q, i) => ['Q', (q[0] + rim[i][0]) / 2, q[1] - 1.2, ...q]), 'L', rim[8][0], rim[8][1] - 0.5, ...rim.slice(0, 8).reverse().flatMap((q, i) => ['Q', (q[0] + rim[7 - i + 1][0]) / 2, q[1] - 1.7, q[0], q[1] - 0.5]), 'Z'), op: 0.4, glow: 'lamp' }];   // the lit edge
  };
  /** A steel travel mug in the raised near hand (under the hand). */
  const mug = ([hx, hy]) => [[t('steel', 1), rr(hx - 1.2, hy - 3.6, 2.6, 5.4, 0.5)], [t('black', 0), rr(hx - 1.4, hy - 4.6, 3, 1.2, 0.4)], det({ s: t('steel', 3), w: 0.5, op: 0.5, d: P('M', hx + 0.9, hy - 3.2, 'L', hx + 0.9, hy + 1.4) }), det({ s: t('steel', 3), w: 0.4, op: 0.6, d: P('M', hx - 1.1, hy - 1.2, 'L', hx + 1.3, hy - 1.2) })];
  /** A wheeled case pulled behind by the near hand: tilted onto its wheels, the handle along its back edge (under the hand). */
  const wheelie = ([hx, hy]) => {
    const { tilt, w, h } = WHEELIE, c = Math.cos(tilt), s = Math.sin(tilt), Wy = -1.6, TRy = Wy - h * c, L = (TRy - hy) / c, TRx = hx - L * s, W = [TRx - h * s, Wy];
    const at = (x, y) => [W[0] + c * x - s * y, W[1] + s * x + c * y];   // the case's own frame: x back from the wheels, y up
    const body = poly([at(0, 0), at(-w, 0), at(-w, -h), at(0, -h)]);
    return [{ s: t('steel', 1), w: 0.8, d: P('M', ...at(-0.8, -h), 'L', hx - 0.3, hy + 0.6) },   // the telescopic handle
      [t('teal', 0), body], [t('teal', 1), poly([at(0, 0), at(-2.6, 0), at(-2.6, -h), at(0, -h)]), 0.8],   // the shell, its back face in shade
      det({ s: t('teal', 3), w: 0.4, op: 0.5, d: [-5, -8, -11].map(x => P('M', ...at(x, -1), 'L', ...at(x, -h + 1))).join('') }),   // the shell's ridges
      det({ s: t('teal', 2), w: 0.4, op: 0.55, d: P('M', ...at(-w + 0.6, -h + 0.4), 'L', ...at(-0.6, -h + 0.4)) }),   // the lit top
      [t('black', 0), PP.circ(W[0], W[1], 1.6)], det([t('grey', 2), PP.circ(W[0], W[1], 0.6)]), det([t('black', 0), PP.circ(...at(-w + 1.2, 0.6), 0.8)])];   // the wheel, its hub, a foot
  };

  PP.define({
    id: 'person.commuter-station', category: 'person', size: [36, 64], variants: KIT.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PP.palette({ steel: PP.tone4('#a8acb0') }), anim: PP.walkAnim(0.82, 20, 1.5), shadow: { rx: 12, ry: 2.4, h: 64 }, night: PP.NIGHT, detailPx: true,
    tags: ['uk', 'london', 'people', 'anonymous', 'commuter', 'walker', 'station', 'street', 'kit:people', 'kit:london', 'kit:urban', 'role:walker'],
    credit: 'the shared people builder (scenePeople.figure) in travel kit, with what station commuters carry',
    build(v, r, ctx) {
      const p = KIT[v], s = ctx.season, o = PP.outfit(p, s), golfUp = p.carry === 'golf' && s !== 'summer';
      if (p.carry === 'phone') o.arms = { far: 'forward', near: { hand: [7.4, -48.8] } };   // the phone up below the chin
      if (p.carry === 'golf') o.arms = { far: 'forward', near: golfUp ? { hand: [6.4, -46.6] } : 'phone' };   // the handle held in front: the shaft clears the face
      if (p.carry === 'wheelie') o.arms = { far: 'forward', near: { hand: [-9, -32] } };
      const f = PP.figure(o), body = f.body, under = [], over = [];
      let back = null;
      if (p.carry === 'phone') over.push(...phoneUp(f.hands.near));
      if (p.carry === 'rucksack') { const k = rucksack(f, o); back = k.back; under.push(...k.strap); over.push(...headphones(f.head, f.top)); }
      if (p.carry === 'tote') under.push(...shoulderTote(f));
      if (p.carry === 'golf') (golfUp ? over : under).push(...(golfUp ? golf(f) : mug(f.hands.near)));
      if (p.carry === 'wheelie') under.push(...wheelie(f.hands.near));
      body.splice(f.at.nearArm[1], 0, ...over);    // over the near arm (before the rim lights)
      body.splice(f.at.nearArm[0], 0, ...under);   // under the near arm
      if (p.carry === 'attache') body.splice(f.at.farArm[0], 0, ...attache(f.hands.far));
      if (back) body.splice(f.at.farArm[0], 0, ...back);
      return { legB: f.legB, body, legA: f.legA };
    },
  });

  /* ---------- person.busker: v0 a guitarist, v1 a violinist, v2 a saxophonist; an open case with coins at the feet ---------- */
  const BUSK = [
    { build: 'average', skin: 3, hair: { style: 'long', col: 1 }, play: 'guitar', box: 'black', lining: 'burgundy',
      spring: { top: { kind: 'jacket', col: 'denim' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'tan' } },
      summer: { top: { kind: 'tee', col: 'white' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'tan' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'rust' } },
      winter: { top: { kind: 'jacket', col: 'black' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'grey', col2: 'charcoal' }, hat: { kind: 'beanie', col: 'grey' } } },
    { build: 'slim', skin: 0, hair: { style: 'bun', col: 3 }, play: 'violin', box: 'burgundy', lining: 'forest',
      spring: { top: { kind: 'cardigan', col: 'forest', col2: 'cream' }, bottom: { kind: 'skirt', col: 'navy', len: 'midi' }, tights: 'charcoal', shoes: { kind: 'shoe', col: 'black' } },
      summer: { top: { kind: 'blouse', col: 'cream' }, bottom: { kind: 'skirt', col: 'teal', len: 'midi' }, shoes: { kind: 'sandal', col: 'tan' } },
      autumn: { top: { kind: 'jumper', col: 'burgundy' }, bottom: { kind: 'skirt', col: 'charcoal', len: 'midi' }, tights: 'black', shoes: { kind: 'boot', col: 'black' } },
      winter: { top: { kind: 'coat', col: 'charcoal' }, bottom: { kind: 'skirt', col: 'charcoal', len: 'midi' }, tights: 'black', shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'plum' } } },
    { build: 'broad', skin: 5, hair: { style: 'crop', col: 0 }, play: 'sax', box: 'charcoal', lining: 'navy',
      spring: { top: { kind: 'jacket', col: 'charcoal' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'shoe', col: 'black' } },
      summer: { top: { kind: 'shirt', col: 'sky' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'shoe', col: 'tan' } },
      autumn: { top: { kind: 'jacket', col: 'burgundy' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'shoe', col: 'black' }, hat: { kind: 'flatcap', col: 'charcoal' } },
      winter: { top: { kind: 'coat', col: 'black' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'red' }, hat: { kind: 'beanie', col: 'charcoal' } } },
  ];
  // the hands per instrument (object coordinates): far on the neck or the upper keys, near strumming, bowing or on the lower keys
  const HANDS = { guitar: { far: [14.2, -45.6], near: [3.6, -35.6] }, violin: { far: [16.2, -52.8], near: [4.8, -44.2] }, sax: { far: [9.6, -46.2], near: [8.6, -38.8] } };
  const about = (deg, px, py) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), q = n => Math.round(n * 1000) / 1000; return [q(c), q(s), q(-s), q(c), q(px - c * px + s * py), q(py - s * px - c * py)]; };
  const posed = (shapes, m) => shapes.map(x => Object.assign(Array.isArray(x) ? { f: x[0], d: x[1], op: x[2] } : Object.assign({}, x), { m }));
  /** A point on an instrument's axis: a along it from o, b across it (b > 0: below the axis). */
  const axis = (o, e) => { const L = Math.hypot(e[0] - o[0], e[1] - o[1]), u = [(e[0] - o[0]) / L, (e[1] - o[1]) / L]; return (a, b) => [o[0] + u[0] * a - u[1] * b, o[1] + u[1] * a + u[0] * b]; };
  /** The outline of a bodied instrument along axis A: half-widths at stations a (a figure-of-eight). */
  const bodyOf = (A, st) => P('M', ...A(st[0][0], 0), ...st.flatMap(([a, w]) => ['L', ...A(a, w)]), ...st.slice().reverse().flatMap(([a, w]) => ['L', ...A(a, -w)]), 'Z');
  const fingers = ([x, y], col) => det([col, P('M', x - 1.0, y - 0.9, 'Q', x + 0.4, y - 1.6, x + 1.2, y - 0.6, 'L', x + 1.0, y + 0.6, 'Q', x - 0.2, y + 1.0, x - 1.1, y + 0.3, 'Z')]);
  const guitar = (hand, col) => {
    const A = axis([-1.6, -32.4], [17.8, -47.8]), st = [[0, 1.2], [0.8, 3.0], [2.4, 3.9], [4.4, 3.5], [5.8, 2.5], [7.0, 2.7], [8.4, 3.0], [9.8, 2.4], [10.6, 1.1]];
    return [[t('wood', 1), bodyOf(A, st.map(([a, w]) => [a, w + 0.5]))],   // the sides (rim) behind the top
      [t('wood', 0), bodyOf(A, st)], [t('ink', 0), PP.circ(...A(6.6, 0), 1.2)],   // the top, the soundhole
      { s: t('wood', 3), w: 1.5, d: P('M', ...A(10.4, 0), 'L', ...A(22.6, 0)) }, [t('wood', 3), poly([A(22.4, -1.0), A(25.4, -1.3), A(25.2, 1.2), A(22.4, 0.9)])],   // the neck, the headstock
      [t('wood', 3), poly([A(2.1, -1.5), A(3.0, -1.5), A(3.0, 1.5), A(2.1, 1.5)]), 0.9],   // the bridge
      det({ s: t('cream', 0), w: 0.18, op: 0.7, d: P('M', ...A(2.5, -0.5), 'L', ...A(23, -0.4), 'M', ...A(2.5, 0.5), 'L', ...A(23, 0.4)) }),   // strings
      det({ s: t('wood', 2), w: 0.25, op: 0.6, d: [12.4, 14.4, 16.2, 17.8, 19.3, 20.6].map(a => P('M', ...A(a, -0.7), 'L', ...A(a, 0.7))).join('') }),   // frets
      det([t('wood', 2), P('M', ...A(1.2, -2.6), 'Q', ...A(2.6, -3.6), ...A(4.4, -3.1), 'Q', ...A(3, -2.4), ...A(1.2, -2.6), 'Z'), 0.5]),   // the lit upper edge
      det([t('wood', 3), PP.circ(...A(6.6, 0), 1.55), 0.5]), det([t('steel', 2), PP.circ(...A(23.4, -1.3), 0.35) + PP.circ(...A(24.6, -1.4), 0.35), 0.9]),   // the rosette, tuning pegs
      det({ s: t('charcoal', 0), w: 0.5, op: 0.9, d: P('M', ...A(10.2, -1.2), 'Q', 3.4, -47.2, -0.4, -49.6) }),   // the strap up to the shoulder
      fingers(hand, col)];
  };
  const violin = (hand, col) => {
    const A = axis([1.6, -51.0], [21.2, -53.4]), st = [[0, 0.9], [0.6, 1.9], [2.4, 2.3], [4.2, 1.9], [5.6, 1.3], [6.8, 1.6], [8.6, 1.9], [10.2, 1.5], [11.4, 0.5]];
    return [[t('wood', 1), bodyOf(A, st.map(([a, w]) => [a, w + 0.4]))], [t('wood', 0), bodyOf(A, st)],
      { s: t('ink', 0), w: 0.9, d: P('M', ...A(11.2, 0), 'L', ...A(17.6, 0)) }, [t('wood', 3), PP.circ(...A(18.6, 0), 1.0)],   // the fingerboard, the scroll
      [t('ink', 0), poly([A(0.2, -0.9), A(1.6, -1.1), A(1.6, 1.0), A(0.2, 0.8)])],   // the chinrest
      det([t('ink', 0), P('M', ...A(5.2, -1.2), 'Q', ...A(5.8, 0), ...A(5.2, 1.2), 'M', ...A(7.0, -1.2), 'Q', ...A(6.4, 0), ...A(7.0, 1.2)), 0.7]),   // the f-holes
      det({ s: t('cream', 0), w: 0.15, op: 0.7, d: P('M', ...A(2.6, -0.2), 'L', ...A(17.4, -0.2)) }), det([t('wood', 2), P('M', ...A(1.0, -1.8), 'Q', ...A(2.6, -2.6), ...A(4.0, -2.0), 'Q', ...A(2.6, -1.6), ...A(1.0, -1.8), 'Z'), 0.5]),   // the strings, a lit edge
      fingers(hand, col)];
  };
  /** The bow in the near hand: forward and up across the strings, clear of the head (it moves with the arm). */
  const bow = ([hx, hy]) => [{ s: t('wood', 3), w: 0.55, d: P('M', hx - 0.6, hy + 0.8, 'L', hx + 11.6, hy - 15.2) }, det({ s: t('cream', 1), w: 0.25, op: 0.8, d: P('M', hx + 0.4, hy + 0.9, 'L', hx + 12.0, hy - 14.6) }), [t('ink', 0), PP.rect(hx - 0.6, hy - 0.2, 1.4, 1.2)]];
  /** The saxophone as ONE tube: the mouthpiece at the lips, the crook, the body down to the bow, the bell up and flared. */
  const SAX = [[4.0, -55.4, 0.4], [5.6, -54.6, 0.55], [7.3, -53.7, 0.5], [8.6, -52.1, 0.55], [9.3, -49.8, 0.8], [9.2, -45.6, 1.05], [8.6, -40.4, 1.3], [7.8, -35.4, 1.55], [7.6, -32.2, 1.7], [8.6, -30.0, 1.75], [10.8, -29.8, 1.75], [12.2, -31.8, 1.75], [12.9, -34.8, 1.9], [13.3, -37.4, 2.5], [13.6, -39.0, 3.3]];
  const sax = (hands, col) => {
    const N = SAX.map((p, i) => { const a = SAX[Math.max(0, i - 1)], b = SAX[Math.min(SAX.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dy / L, -dx / L]; });
    const side = k => SAX.map((p, i) => [p[0] + N[i][0] * p[2] * k, p[1] + N[i][1] * p[2] * k]);
    const L1 = side(1), R1 = side(-1), last = SAX[SAX.length - 1];
    return [{ s: t('ink', 1), w: 0.4, d: P('M', 9.0, -51.4, 'Q', 5.4, -52.4, 1.6, -50.8) },   // the neck strap
      [t('brass', 0), poly([...L1, ...R1.slice().reverse()])],
      [t('brass', 1), poly([...side(-0.1).slice(4), ...R1.slice(4).reverse()]), 0.6],   // the shaded back of the body and the bow
      [t('ink', 0), poly([[3.8, -55.0], [4.0, -55.9], [5.8, -55.2], [7.5, -54.4], [7.2, -53.3], [5.5, -54.1]])],   // the mouthpiece and the neck's cork, one piece from the lips to the crook
      [t('brass', 3), PP.ell(last[0] + 0.3, last[1] - 0.2, 3.1, 0.9), 0.9],   // the bell's mouth
      det({ s: t('brass', 2), w: 0.4, op: 0.75, d: P('M', ...L1[4], ...L1.slice(5, 9).flatMap(q => ['L', ...q])) }),   // the lit front
      det([t('brass', 3), [[9.6, -47.6], [9.4, -44.6], [9.0, -41.4], [8.5, -38.2], [8.1, -35.0]].map(([x, y]) => PP.circ(x + 1.1, y, 0.5)).join(''), 0.9]),   // the keys
      det({ s: t('brass', 2), w: 0.5, op: 0.8, d: P('M', last[0] - 3, last[1] + 0.2, 'Q', last[0], last[1] - 0.9, last[0] + 3.3, last[1] - 0.2) }),   // the bell's rim
      fingers(hands.far, col)];
  };
  /** The open case on the ground in front, its lining and coins (a 3/4 view: the base, the lining, the lid up behind). */
  const openCase = (p, len) => {
    const x0 = 15.4, x1 = x0 + len, c = p.box, l = p.lining;
    return [[t(c, 1), P('M', x0 + 0.6, -4.2, 'L', x0 - 0.4, -10.6, 'Q', x0 + len / 2, -12.4, x1 + 0.6, -10.4, 'L', x1 - 0.6, -4.2, 'Z')],   // the lid, open behind
      [t(l, 1), P('M', x0 + 1.4, -4.6, 'L', x0 + 0.8, -9.6, 'Q', x0 + len / 2, -11.2, x1 - 0.2, -9.4, 'L', x1 - 1.2, -4.6, 'Z'), 0.9],   // the lid's lining
      [t(c, 0), rr(x0, -4.6, len, 4.6, 1.4)], [t(l, 0), P('M', x0 + 1, -4.4, 'Q', x0 + len / 2, -6.2, x1 - 1, -4.4, 'Q', x0 + len / 2, -3.2, x0 + 1, -4.4, 'Z')],   // the base, the lining inside
      [t('brass', 2), [0.22, 0.38, 0.5, 0.63, 0.78].map((k, i) => PP.ell(x0 + len * k, -4.5 + (i % 2) * 0.4, 0.9, 0.4)).join(''), 0.95],   // the coins
      det([t('steel', 2), PP.ell(x0 + len * 0.3, -4.2, 0.8, 0.35) + PP.ell(x0 + len * 0.7, -4.6, 0.8, 0.35), 0.9]),   // silver coins
      det({ s: t(c, 2), w: 0.4, op: 0.5, d: P('M', x0 + 1.2, -4.2, 'L', x1 - 1.2, -4.2) }), det([t('steel', 2), PP.rect(x0 + len * 0.3, -2.8, 1.2, 0.8) + PP.rect(x0 + len * 0.7, -2.8, 1.2, 0.8), 0.9])];   // the base's lit rim, the catches
  };
  const busk0 = PP.figure(PP.outfit(BUSK[0], 'summer'));   // the near shoulder: the playing arm's pivot

  PP.define({
    id: 'person.busker', category: 'person', size: [50, 64], variants: BUSK.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA', 'arm'],
    palette: PP.palette({ wood: PP.tone4('#c07a36'), brass: PP.tone4('#d4a634'), steel: PP.tone4('#b4b8bc') }),
    anim: { turn: { part: 'arm', pivot: busk0.shoulders.near.map(n => Math.round(n * 10) / 10), deg: 9, period: 0.55, hold: 0 }, bob: { part: '*', dy: 0.8, period: 1.6 } },
    shadow: { rx: 24, ry: 2.6, h: 62 }, night: PP.NIGHT, detailPx: true,
    tags: ['uk', 'london', 'people', 'anonymous', 'busker', 'music', 'station', 'kit:people', 'kit:london', 'kit:urban', 'role:walker'],
    credit: 'the shared people builder (scenePeople.figure) with instruments (no makers\' marks)',
    build(v, r, ctx) {
      const p = BUSK[v], o = Object.assign(PP.outfit(p, ctx.season), { arms: { far: { hand: HANDS[p.play].far }, near: { hand: HANDS[p.play].near } } });
      const f = PP.figure(o), H = PP.HIP, hand = o.gloves ? t(o.gloves, 0) : t('sk' + p.skin, 0);
      const arm = f.body.splice(f.at.nearArm[0], f.at.nearArm[1] - f.at.nearArm[0]);
      // standing: the far foot back, the near one forward; the case and the instrument over the near leg (the legs do not move)
      const legA = posed(f.legA, about(-5, 0, H)).concat(openCase(p, { guitar: 25, violin: 18, sax: 21 }[p.play]));
      if (p.play === 'guitar') legA.push(...guitar(f.hands.far, hand));
      if (p.play === 'violin') { legA.push(...violin(f.hands.far, hand)); arm.push(...bow(f.hands.near)); }
      if (p.play === 'sax') legA.push(...sax(f.hands, hand), ...arm.splice(0));   // the near hand on the keys, over the saxophone
      return { legB: posed(f.legB, about(7, 0, H)), body: f.body, legA, arm };
    },
  });
})();
