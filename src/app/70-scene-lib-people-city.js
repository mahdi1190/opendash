/* ============================================================
   SCENE LIBRARY: city people (docs/dev/SCENE_ENGINE.md, section 2.8).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Drawn by the shared, FACELESS people builder (scenePeople, 70-scene-lib-people-0figure.js): anonymous
   side views FACING RIGHT, the head a plain egg, no logos or text on clothes, bags or papers. Anchor: the
   feet (the wheels' contact for a bike). size[1] 64 stands for a 1.72 m person (the depth ladder, 2.8);
   detailPx: under 48 px only the silhouette is drawn (every fine piece carries detail: true).

   person.commuter wears the CITY WARDROBE (a suit, a trench, a mac, a tweed overcoat, office shirts) and
   carries what city walkers carry: a leather briefcase, an umbrella up in the wet seasons (furled in
   summer), a small backpack and a phone, a canvas tote, a folded blank newspaper, a takeaway cup. The
   station's commuters (70-scene-lib-people-london-stations.js) wear travel kit instead.
   person.cyclist-commuter: riders on the builder's cycle pose (hips on the saddle, feet on the pedals,
   hands on the bars), the body leaning over the bars; at night a cool rim light along the near arm and
   thigh (as the builder's along the head and back), the lamps and reflective strips lit.

   Parts: 'legB' (the far leg), 'body', 'legA' (the near leg); a bike's 'bike' between the far leg and the
   rider. The walk hook swings the legs about the hip and bobs the body; a rider pedals with the near leg
   only, so the far leg stays behind the frame in every renderer (moving parts draw last).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof scenePeople === 'undefined') return;   // the engine core or the builder is not in this build
  const PP = scenePeople, P = (...a) => PP.D(0, ...a), t = (slot, k) => `@${slot}.${k || 0}`;
  const det = sh => Object.assign(Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : sh, { detail: true });
  const rr = (x, y, w, h, r) => P('M', x + r, y, 'L', x + w - r, y, 'Q', x + w, y, x + w, y + r, 'L', x + w, y + h - r, 'Q', x + w, y + h, x + w - r, y + h, 'L', x + r, y + h, 'Q', x, y + h, x, y + h - r, 'L', x, y + r, 'Q', x, y, x + r, y, 'Z');
  const q3 = n => Math.round(n * 1000) / 1000;

  /* ---------- person.commuter: the city wardrobe (the far hand carries; the near hand an umbrella, a phone or a cup) ---------- */
  const CITY = [
    // 0 a suit: a blazer and tie, shirt sleeves and tie, a belted mac, an overcoat; a tan briefcase
    { build: 'average', skin: 0, hair: { style: 'short', col: 2 }, tall: 0.6, carry: 'brief', tie: 'burgundy',
      spring: { top: { kind: 'cardigan', col: 'charcoal', col2: 'white' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'black' } },
      summer: { top: { kind: 'shirt', col: 'sky' }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'shoe', col: 'black' } },
      autumn: { top: { kind: 'coat', col: 'stone', belt: 1 }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'black' } },
      winter: { top: { kind: 'coat', col: 'navy' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'black' }, scarf: { col: 'burgundy' }, gloves: 'black' } },
    // 1 a belted trench and an umbrella up (furled in summer, with a blouse and a midi skirt)
    { build: 'slim', skin: 4, hair: { style: 'long', col: 1 }, carry: 'umbrella', brolly: 'red',
      spring: { top: { kind: 'coat', col: 'khaki', belt: 1 }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'boot', col: 'black' } },
      summer: { top: { kind: 'blouse', col: 'pink' }, bottom: { kind: 'skirt', col: 'navy', len: 'midi' }, shoes: { kind: 'shoe', col: 'tan' } },
      autumn: { top: { kind: 'coat', col: 'camel', belt: 1 }, bottom: { kind: 'skirt', col: 'charcoal' }, tights: 'black', shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'cream' } },
      winter: { top: { kind: 'coat', col: 'khaki', belt: 1 }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'red', col2: 'cream' }, gloves: 'black' } },
    // 2 young: a hoodie, a tee, a bomber, a puffer; a small backpack and the phone
    { build: 'slim', age: 'young', skin: 2, hair: { style: 'crop', col: 0 }, carry: 'phone',
      spring: { top: { kind: 'hoodie', col: 'grey' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'navy' } },
      summer: { top: { kind: 'tee', col: 'teal' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'navy' } },
      autumn: { top: { kind: 'jacket', col: 'olive' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'charcoal', strip: 1 } },
      winter: { top: { kind: 'parka', col: 'black' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'beanie', col: 'mustard' }, bag: { kind: 'backpack', col: 'charcoal', strip: 1 } } },
    // 3 a mac and a canvas tote; the umbrella up in autumn and winter, a scarf in winter
    { build: 'average', skin: 1, hair: { style: 'bun', col: 1 }, carry: 'tote', brolly: 'forest',
      spring: { top: { kind: 'rain', col: 'olive' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'shoe', col: 'black' } },
      summer: { top: { kind: 'blouse', col: 'sky' }, bottom: { kind: 'trousers', col: 'cream' }, shoes: { kind: 'sandal', col: 'tan' } },
      autumn: { top: { kind: 'rain', col: 'navy' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' } },
      winter: { top: { kind: 'coat', col: 'forest' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'mustard', col2: 'rust' }, gloves: 'tan' } },
    // 4 an older man: a tweed overcoat and a flat cap, a folded newspaper (blank)
    { build: 'broad', age: 'older', skin: 3, hair: { style: 'short', col: 6 }, carry: 'paper',
      spring: { top: { kind: 'coat', col: 'tweed' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'flatcap', col: 'tweed' } },
      summer: { top: { kind: 'jacket', col: 'stone' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'flatcap', col: 'stone' } },
      autumn: { top: { kind: 'coat', col: 'tweed' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'black' }, hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'burgundy' } },
      winter: { top: { kind: 'coat', col: 'tweed' }, bottom: { kind: 'trousers', col: 'grey' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'flatcap', col: 'charcoal' }, scarf: { col: 'burgundy', col2: 'cream' }, gloves: 'tan' } },
    // 5 a takeaway cup and a crossbody bag: a jacket, a shirt, a wool coat
    { build: 'slim', skin: 3, hair: { style: 'pony', col: 0 }, tall: 0.3, carry: 'cup',
      spring: { top: { kind: 'jacket', col: 'navy' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'shoe', col: 'black' }, bag: { kind: 'crossbody', col: 'burgundy' } },
      summer: { top: { kind: 'shirt', col: 'white' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'crossbody', col: 'tan' } },
      autumn: { top: { kind: 'coat', col: 'burgundy' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'mustard' }, bag: { kind: 'crossbody', col: 'black' } },
      winter: { top: { kind: 'coat', col: 'camel' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'plum', col2: 'pink' }, hat: { kind: 'beanie', col: 'plum' }, gloves: 'plum', bag: { kind: 'crossbody', col: 'black' } } },
  ];

  /* What the hands carry. A far-hand thing hangs on the far side: it goes under the far arm and the torso (its tones a
     shade darker); a near-hand thing goes under the near arm, so the hand closes over it. */
  const briefcase = ([hx, hy]) => {
    const x0 = hx - 6.2, y0 = hy + 2.3, w = 12.4, h = 8.6;
    return [{ s: t('tan', 3), w: 0.9, d: P('M', hx - 1.7, y0 + 0.2, 'Q', hx - 1.6, hy - 1.1, hx, hy - 1.1, 'Q', hx + 1.6, hy - 1.1, hx + 1.7, y0 + 0.2) },   // the handle
      [t('tan', 1), rr(x0, y0, w, h, 1.1)],
      [t('tan', 3), P('M', x0, y0 + 1.1, 'Q', x0, y0, x0 + 1.1, y0, 'L', x0 + w - 1.1, y0, 'Q', x0 + w, y0, x0 + w, y0 + 1.1, 'L', x0 + w, y0 + 3.4, 'L', x0, y0 + 3.4, 'Z'), 0.75],   // the flap
      det([t('mustard', 2), PP.rect(x0 + 2.4, y0 + 2.7, 1.2, 1.5) + PP.rect(x0 + w - 3.6, y0 + 2.7, 1.2, 1.5), 0.9]),   // the buckles
      det({ s: t('tan', 2), w: 0.35, op: 0.5, d: P('M', x0 + 0.7, y0 + 3.9, 'L', x0 + w - 0.7, y0 + 3.9) }),   // the flap's stitching
      det([t('tan', 3), P('M', x0 + 0.3, y0 + h - 1.8, 'L', x0 + w - 0.3, y0 + h - 1.8, 'Q', x0 + w - 0.3, y0 + h - 0.3, x0 + w - 1.4, y0 + h - 0.3, 'L', x0 + 1.4, y0 + h - 0.3, 'Q', x0 + 0.3, y0 + h - 0.3, x0 + 0.3, y0 + h - 1.8, 'Z'), 0.45]),   // the shaded base
      det({ s: t('tan', 0), w: 0.4, op: 0.5, d: P('M', x0 + 1.2, y0 + 0.5, 'L', x0 + w - 1.2, y0 + 0.5) })];   // the lit top edge
  };
  const tote = ([hx, hy]) => {
    const y0 = hy + 4.2, y1 = y0 + 9.4;
    return [{ s: t('stone', 3), w: 0.6, d: P('M', hx - 3.4, y0 + 0.3, 'Q', hx - 2.4, hy - 0.5, hx, hy - 0.7, 'Q', hx + 2.4, hy - 0.5, hx + 3.4, y0 + 0.3) },   // the handles
      [t('stone', 1), P('M', hx - 4.4, y0, 'L', hx + 4.4, y0, 'L', hx + 5.1, y1, 'Q', hx, y1 + 0.6, hx - 5.1, y1, 'Z')],
      [t('forest', 1), P('M', hx - 4.7, y0 + 5.4, 'L', hx + 4.8, y0 + 5.4, 'L', hx + 4.95, y0 + 7.0, 'L', hx - 4.85, y0 + 7.0, 'Z'), 0.9],   // a woven band (plain: no print)
      det([t('stone', 3), P('M', hx + 2.6, y0, 'L', hx + 4.4, y0, 'L', hx + 5.1, y1, 'L', hx + 3.2, y1 + 0.3, 'Z'), 0.4]),   // the shaded side
      det({ s: t('stone', 2), w: 0.4, op: 0.5, d: P('M', hx - 4.2, y0 + 0.6, 'L', hx + 4.2, y0 + 0.6) }),   // the top hem
      det({ s: t('stone', 3), w: 0.35, op: 0.4, d: P('M', hx - 2.2, y0 + 1.2, 'Q', hx - 1.4, y0 + 3.4, hx - 2.0, y0 + 5.0) })];   // a soft fold
  };
  const paper = ([hx, hy]) => [   // a folded newspaper hanging from the hand: blank (no type, no lines)
    [t('cream', 1), P('M', hx - 1.8, hy - 1.7, 'L', hx + 2.4, hy - 2.1, 'L', hx + 3.6, hy + 8.8, 'L', hx - 0.6, hy + 9.4, 'Z')],
    det([t('cream', 3), P('M', hx + 0.7, hy - 1.9, 'L', hx + 2.4, hy - 2.1, 'L', hx + 3.6, hy + 8.8, 'L', hx + 1.9, hy + 9.1, 'Z'), 0.35]),   // the folded half in shade
    det({ s: t('cream', 0), w: 0.35, op: 0.6, d: P('M', hx - 1.6, hy - 1.4, 'L', hx - 0.4, hy + 9.2) })];   // the fold's lit edge
  const cup = ([hx, hy]) => [   // a paper takeaway cup with a card sleeve and a lid
    [t('cream', 0), P('M', hx - 1.2, hy - 3.4, 'L', hx + 1.9, hy - 3.4, 'L', hx + 1.5, hy + 1.3, 'L', hx - 0.8, hy + 1.3, 'Z')],
    [t('tan', 1), P('M', hx - 1.05, hy - 1.8, 'L', hx + 1.75, hy - 1.8, 'L', hx + 1.6, hy - 0.1, 'L', hx - 0.9, hy - 0.1, 'Z')],
    [t('white', 0), P('M', hx - 1.5, hy - 3.4, 'L', hx + 2.2, hy - 3.4, 'L', hx + 2.0, hy - 4.2, 'L', hx - 1.3, hy - 4.2, 'Z')],
    det([t('white', 1), P('M', hx + 0.8, hy - 4.2, 'L', hx + 1.6, hy - 4.2, 'L', hx + 1.5, hy - 4.7, 'L', hx + 0.9, hy - 4.7, 'Z')]),   // the sip spout
    det([t('cream', 3), P('M', hx + 0.9, hy - 3.4, 'L', hx + 1.9, hy - 3.4, 'L', hx + 1.5, hy + 1.3, 'L', hx + 0.8, hy + 1.3, 'Z'), 0.3])];   // the shaded side
  /** A tie down the shirt front (in the open blazer or the shirt): seen edge on, a narrow blade. */
  const tie = (f, o, col) => {
    const ys = f.shoulders.near[1] - 1.9, xf = PP.BUILD[o.build].d / 2 - 0.4 + PP.TOPS[o.top.kind].g;
    return [[t(col, 0), P('M', 1.6, ys + 0.3, 'L', 2.9, ys + 0.5, 'Q', xf - 0.1, ys + 5, xf - 0.2, -38.4, 'L', xf - 1.4, -37.4, 'Q', xf - 1.6, ys + 5.4, 1.6, ys + 0.3, 'Z')],
      det([t(col, 3), P('M', 1.6, ys + 0.3, 'L', 2.9, ys + 0.5, 'L', 2.7, ys + 1.6, 'L', 1.9, ys + 1.5, 'Z'), 0.7])];   // the knot
  };

  PP.define({
    id: 'person.commuter', category: 'person', size: [36, 64], variants: CITY.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PP.palette(), anim: PP.walkAnim(0.85, 22, 1.4), shadow: { rx: 11, ry: 2.4, h: 64 }, night: PP.NIGHT, detailPx: true,
    tags: ['uk', 'london', 'city', 'people', 'anonymous', 'commuter', 'pedestrian', 'umbrella', 'street', 'kit:people', 'kit:urban', 'kit:london', 'role:walker'],
    credit: 'the shared people builder (scenePeople.figure) in a city wardrobe, with what city walkers carry',
    build(v, r, ctx) {
      const p = CITY[v], s = ctx.season, o = PP.outfit(p, s), wet = s === 'autumn' || s === 'winter';
      if (p.carry === 'umbrella') Object.assign(o, { hold: s === 'summer' ? 'brolly' : 'umbrella', holdCol: p.brolly });
      if (p.carry === 'tote' && wet) Object.assign(o, { hold: 'umbrella', holdCol: p.brolly });
      if (o.hold === 'umbrella') o.arms = { far: 'forward', near: { hand: [6.2, -46.6] } };   // the handle held in front of the chest: the shaft clears the face
      if (p.carry === 'phone') o.hold = 'phone';
      if (p.carry === 'cup') o.arms = { far: 'forward', near: 'phone' };   // the hand raised to the chest, no phone in it
      const f = PP.figure(o), body = f.body;
      const far = { brief: briefcase, tote, paper }[p.carry], near = [];
      if (p.tie && !PP.TOPS[o.top.kind].long) near.push(...tie(f, o, p.tie));
      if (p.carry === 'cup') near.push(...cup(f.hands.near));
      body.splice(f.at.nearArm[0], 0, ...near);                       // under the near arm (it starts after the far arm)
      if (far) body.splice(f.at.farArm[0], 0, ...far(f.hands.far));   // under the far arm and the torso
      return { legB: f.legB, body, legA: f.legA };
    },
  });

  /* ---------- person.cyclist-commuter: v0 a road commuter (helmet, hi-vis vest, panniers, drop bars), v1 an upright
     step-through (a basket, mudguards, a chain guard), v2 a heavy grey hire-style bike (a front carrier; no logos) ---------- */
  const DX = -8.5, HUB = -12.6, RW = 11.6, BB = [-3, -10.4], CRANK = 5.6, REAR = [-19, HUB], FRONT = [19.5, HUB];   // the saddle (hip) x, the wheels, the cranks
  const BIKES = {   // per frame: the head tube (top, bottom), the seat cluster, the stem's top and the grip (the hands' point)
    road: { head: [[13.4, -31.4], [15.0, -25.4]], seat: [-7.6, -24.8], stem: [15.4, -32.6], grip: [16.4, -33.4], tube: 2.0 },
    dutch: { head: [[11.8, -34.2], [14.4, -25.2]], seat: [-7.4, -24.2], stem: [12.0, -37.8], grip: [8.8, -38.8], tube: 2.2 },
    hire: { head: [[12.4, -33.2], [14.8, -25.0]], seat: [-7.4, -24.0], stem: [12.6, -36.6], grip: [10.4, -37.6], tube: 3.2 },
  };
  const RIDERS = [
    { build: 'average', skin: 2, hair: { style: 'short', col: 0 }, kind: 'road', frame: 'charcoal', lean: 0.36, pedal: 40, helmet: 'white', vest: 1,
      spring: { top: { kind: 'jacket', col: 'charcoal' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'grey' } },
      summer: { top: { kind: 'tee', col: 'teal' }, bottom: { kind: 'shorts', col: 'black' }, shoes: { kind: 'trainer', col: 'grey' } },
      autumn: { top: { kind: 'jacket', col: 'navy' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'grey' }, gloves: 'black' },
      winter: { top: { kind: 'jacket', col: 'black' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, gloves: 'black', scarf: { col: 'grey' } } },
    { build: 'slim', skin: 4, hair: { style: 'bun', col: 0 }, kind: 'dutch', frame: 'forest', lean: 0.06, pedal: 20,
      spring: { top: { kind: 'jacket', col: 'mustard' }, bottom: { kind: 'skirt', col: 'navy' }, tights: 'charcoal', shoes: { kind: 'boot', col: 'tan' } },
      summer: { top: { kind: 'blouse', col: 'white' }, bottom: { kind: 'skirt', col: 'red' }, shoes: { kind: 'sandal', col: 'tan' } },
      autumn: { top: { kind: 'coat', col: 'camel', belt: 1 }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'rust' } },
      winter: { top: { kind: 'coat', col: 'navy' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'cream', col2: 'red' }, hat: { kind: 'beanie', col: 'red' }, gloves: 'cream' } },
    { build: 'broad', skin: 0, hair: { style: 'short', col: 1 }, kind: 'hire', frame: 'grey', lean: 0.16, pedal: 65, helmet: 'charcoal',
      spring: { top: { kind: 'jacket', col: 'forest' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'shirt', col: 'white' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'rust' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' } },
      winter: { top: { kind: 'parka', col: 'grey' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, gloves: 'black' } },
  ];
  const wheel = ([cx, cy]) => [{ s: t('charcoal', 0), w: 2, d: PP.circ(cx, cy, RW) }, { s: t('steel', 1), w: 0.7, d: PP.circ(cx, cy, RW - 1.4) },
    det({ s: t('steel', 2), w: 0.25, op: 0.75, d: [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 6 + 0.2, x = Math.cos(a) * (RW - 1.6), y = Math.sin(a) * (RW - 1.6); return P('M', cx - x, cy - y, 'L', cx + x, cy + y); }).join('') }),   // the spokes
    [t('steel', 1), PP.circ(cx, cy, 1.1)], det({ s: t('charcoal', 2), w: 0.3, op: 0.5, d: P('M', cx - RW * 0.6, cy - RW * 0.86, 'Q', cx, cy - RW * 1.1, cx + RW * 0.6, cy - RW * 0.86) })];   // the hub, the tyre's lit top
  const arc = ([cx, cy], r, a0, a1) => P('M', cx + r * Math.cos(a0), cy + r * Math.sin(a0), 'A', r, r, 0, 0, 1, cx + r * Math.cos(a1), cy + r * Math.sin(a1));
  /** The bike under rider f (its pedals): wheels, frame, cranks and kit; drawn between the far leg and the rider. */
  const bike = (p, f) => {
    const B = BIKES[p.kind], fr = p.frame, [ht, hb] = B.head, sc = B.seat, w = B.tube, out = [];
    out.push({ s: t('steel', 1), w: 1.1, d: P('M', BB[0], BB[1], 'L', f.pedals.far[0], f.pedals.far[1]) }, [t('ink', 0), PP.rect(f.pedals.far[0] - 1.5, f.pedals.far[1] - 0.4, 3, 0.9)]);   // the far crank and pedal
    out.push(...wheel(REAR), ...wheel(FRONT));
    if (p.kind !== 'road') out.push({ s: t(fr, 1), w: 1.1, d: arc(REAR, RW + 1.7, Math.PI * 1.05, Math.PI * 1.85) }, { s: t(fr, 1), w: 1.1, d: arc(FRONT, RW + 1.7, Math.PI * 1.15, Math.PI * 1.95) });   // mudguards
    out.push({ s: t(fr, 1), w: 1.3, d: P('M', BB[0], BB[1], 'L', REAR[0], REAR[1], 'L', sc[0], sc[1]) });   // the chain and seat stays
    out.push(det({ s: t('ink', 0), w: 0.45, op: 0.8, d: P('M', BB[0], BB[1] - 3, 'L', REAR[0], REAR[1] - 1.2, 'M', BB[0], BB[1] + 3, 'L', REAR[0], REAR[1] + 1.2) }));   // the chain
    if (p.kind === 'road') out.push({ s: t(fr, 0), w, d: P('M', BB[0], BB[1], 'L', sc[0], sc[1], 'L', ht[0], ht[1] + 1, 'M', BB[0], BB[1], 'L', hb[0], hb[1] - 0.6) });   // the diamond frame
    else if (p.kind === 'dutch') out.push({ s: t(fr, 0), w, d: P('M', hb[0], hb[1] - 1, 'Q', 4, -10, BB[0] - 0.4, BB[1], 'L', sc[0], sc[1], 'M', ht[0] + 0.5, ht[1] + 3, 'Q', 1, -16, sc[0] + 0.6, sc[1] + 4.4) });   // a step-through: two swooping tubes
    else out.push({ s: t(fr, 0), w, d: P('M', hb[0], hb[1] - 1.4, 'Q', 2, -9, BB[0] - 0.4, BB[1], 'L', sc[0], sc[1]) });   // a heavy single swoop
    out.push(det({ s: t(fr, 2), w: 0.4, op: 0.6, d: P('M', sc[0] + 0.6, sc[1] + 1, 'L', BB[0] + 0.5, BB[1] - 1.4) }));   // a lit edge on the seat tube
    out.push({ s: t(fr, 0), w: w + 0.6, d: P('M', ht[0], ht[1], 'L', hb[0], hb[1]) }, { s: t(fr, 1), w: 1.5, d: P('M', hb[0], hb[1], 'Q', hb[0] + 2.8, (hb[1] + FRONT[1]) / 2, FRONT[0], FRONT[1]) });   // the head tube, the fork
    out.push({ s: t('steel', 1), w: 1.1, d: P('M', sc[0], sc[1], 'L', DX + 0.2, -27.6) }, [t('ink', 0), P('M', DX - 4.6, -28.6, 'Q', DX - 1, -29.4, DX + 3.8, -28.4, 'L', DX + 3.4, -27.3, 'Q', DX - 1, -27.4, DX - 4.4, -27.2, 'Z')]);   // the seat post, the saddle
    if (p.kind === 'road') out.push({ s: t('ink', 0), w: 1.1, d: P('M', ht[0], ht[1], 'L', B.stem[0], B.stem[1], 'Q', B.grip[0] + 1.6, B.stem[1] - 0.2, B.grip[0] + 1.4, -30.6, 'Q', B.grip[0] + 1, -28.8, B.grip[0] - 0.6, -29.2) });   // the stem and the drop bar
    else out.push({ s: t('steel', 1), w: 1.1, d: P('M', ht[0], ht[1], 'L', B.stem[0], B.stem[1], 'Q', B.stem[0] - 1, B.grip[1] - 1.2, B.grip[0], B.grip[1]) }, { s: t('ink', 0), w: 1.7, d: P('M', B.grip[0] + 0.9, B.grip[1] - 0.2, 'L', B.grip[0] - 0.8, B.grip[1] + 0.2) });   // the stem, swept-back bars, a grip
    out.push({ s: t('steel', 1), w: 0.9, d: PP.circ(BB[0], BB[1], 2.9) }, det({ s: t('steel', 2), w: 0.3, op: 0.6, d: PP.circ(BB[0], BB[1], 2.4) }));   // the chainring
    if (p.kind !== 'road') out.push([t(fr, 1), P('M', BB[0] - 1, BB[1] - 3.6, 'L', REAR[0] + 2, REAR[1] - 2.2, 'Q', REAR[0] + 0.4, REAR[1] - 0.6, REAR[0] + 2, REAR[1] + 0.8, 'L', BB[0] + 1.4, BB[1] + 2.4, 'Q', BB[0] + 3.6, BB[1] - 1, BB[0] - 1, BB[1] - 3.6, 'Z'), 0.95]);   // the chain guard
    out.push({ s: t('steel', 0), w: 1.2, d: P('M', BB[0], BB[1], 'L', f.pedals.near[0], f.pedals.near[1]) }, [t('ink', 0), PP.rect(f.pedals.near[0] - 1.6, f.pedals.near[1] - 0.4, 3.2, 1)]);   // the near crank and pedal
    // the kit: panniers on a rack (road), a basket (dutch), a front carrier and a stand (hire); lamps front and back
    if (p.kind === 'road') {
      out.push({ s: t('steel', 1), w: 0.7, d: P('M', REAR[0], REAR[1], 'L', REAR[0] + 2.6, -24.2, 'M', REAR[0] - 4.6, -24.4, 'L', sc[0] - 0.4, -24.4) });   // the rack
      out.push([t('black', 0), rr(REAR[0] - 5.6, -24.2, 12.4, 11.4, 1.4)], [t('black', 1), P('M', REAR[0] - 5.6, -21.4, 'L', REAR[0] + 6.8, -21.4, 'L', REAR[0] + 6.8, -24.2, 'L', REAR[0] - 5.6, -24.2, 'Z')],   // the pannier, its roll top
        { f: t('stone', 2), d: PP.rect(REAR[0] - 5.2, -17.4, 11.6, 1.1), op: 0.75, glow: 'lamp' }, det({ s: t('black', 2), w: 0.35, op: 0.5, d: P('M', REAR[0] - 4.8, -20.6, 'L', REAR[0] + 6, -20.6) }));   // a reflective strip, a seam
    } else if (p.kind === 'dutch') {
      out.push({ s: t('steel', 1), w: 0.7, d: P('M', REAR[0], REAR[1], 'L', REAR[0] + 1.8, -24.6, 'M', REAR[0] - 5, -24.6, 'L', sc[0] - 0.6, -24.6) });   // the rear rack
      out.push([t('camel', 1), P('M', 14.6, -41.2, 'L', 24.2, -41.2, 'L', 23.0, -33.4, 'L', 15.4, -33.4, 'Z')], [t('camel', 3), P('M', 14.6, -41.2, 'L', 24.2, -41.2, 'L', 24.0, -40.0, 'L', 14.7, -40.0, 'Z'), 0.8],   // the wicker basket, its rim
        det({ s: t('camel', 3), w: 0.35, op: 0.55, d: P('M', 15, -38, 'L', 23.7, -38, 'M', 15.2, -35.7, 'L', 23.4, -35.7, 'M', 17.6, -40, 'L', 17.8, -33.4, 'M', 20.4, -40, 'L', 20.4, -33.4) }),   // the weave
        [t('rust', 1), P('M', 16.4, -40.2, 'Q', 18.6, -43.6, 21.4, -41.4, 'L', 20.8, -40.2, 'Z')]);   // a bag in the basket
    } else {
      out.push({ s: t(fr, 1), w: 1.2, d: P('M', hb[0] - 0.4, -30.4, 'L', 26.2, -30.4, 'M', 18.6, -30.4, 'L', FRONT[0] + 0.6, FRONT[1]) }, [t('charcoal', 0), PP.rect(16.6, -33.2, 8.6, 2.8)],   // the front carrier, a strapped bag
        det({ s: t('mustard', 1), w: 0.4, op: 0.9, d: P('M', 19.2, -33.2, 'L', 19.2, -30.4, 'M', 22.8, -33.2, 'L', 22.8, -30.4) }), { s: t('steel', 1), w: 0.8, d: P('M', BB[0] - 1, BB[1] + 1, 'L', BB[0] - 4.6, -0.4) });   // its straps, the stand
    }
    out.push([t('charcoal', 0), rr(B.stem[0] + 0.2, B.stem[1] + 1.2, 3.2, 2.4, 0.6)], { f: t('cream', 0), d: PP.ell(B.stem[0] + 3.4, B.stem[1] + 2.4, 0.9, 1.3), glow: 'lamp' });   // the front lamp
    out.push({ f: t('red', 1), d: rr(sc[0] - 3.0, sc[1] - 0.6, 1.6, 2.2, 0.4), glow: 'tail' });   // the rear lamp
    return out;
  };
  /** A thin band along polyline pts (on the side the rim light comes from: behind and above), offsets o0..o1 from it. */
  const rimBand = (pts, o0, o1, fill) => {
    const n = pts.slice(1).map((q, i) => { const dx = q[0] - pts[i][0], dy = q[1] - pts[i][1], L = Math.hypot(dx, dy) || 1, a = [dy / L, -dx / L]; return -a[0] - a[1] >= 0 ? a : [-a[0], -a[1]]; });
    const nv = pts.map((_, i) => { const a = n[Math.max(0, i - 1)], b = n[Math.min(n.length - 1, i)], x = a[0] + b[0], y = a[1] + b[1], L = Math.hypot(x, y) || 1; return [x / L, y / L]; });
    const side = (o, ends) => pts.map((p, i) => { const k = ends && (i === 0 || i === pts.length - 1) ? o1 - 0.15 : o; return [p[0] + nv[i][0] * k, p[1] + nv[i][1] * k]; });
    const a = side(o1, false), b = side(o0, true).reverse();
    return det({ f: fill, op: 0.6, glow: 'rim', d: P('M', ...a[0], ...a.slice(1).flatMap(q => ['L', ...q]), ...b.flatMap(q => ['L', ...q]), 'Z') });
  };
  /** The hi-vis vest over the torso and its two reflective bands (the bands light at night). */
  const vest = (f, o) => {
    const ys = f.shoulders.near[1] - 1.9, Bd = PP.BUILD[o.build].d, T = PP.TOPS[o.top.kind], xb = DX - Bd / 2 - T.g, xf = DX + Bd / 2 - 0.4 + T.g;
    return [[t('vest', 0), P('M', DX - 1.6, ys - 0.2, 'Q', xb - 0.2, ys - 0.2, xb + 0.2, ys + 4.4, 'Q', xb + 0.9, -39, xb + 0.2, -32.9, 'L', xf + 0.2, -32.9, 'L', xf - 0.3, -37, 'Q', xf + 0.5, ys + 5, xf - 0.4, ys + 2, 'L', DX + 0.8, ys + 5.2, 'L', DX + 1.4, ys + 0.2, 'Z'), 0.97],
      det([t('vest', 1), P('M', DX - 1.6, ys - 0.2, 'Q', xb - 0.2, ys - 0.2, xb + 0.2, ys + 4.4, 'Q', xb + 0.9, -39, xb + 0.2, -32.9, 'L', xb + 2.4, -32.9, 'Q', xb + 2.6, -40, xb + 2.2, ys + 3, 'Z'), 0.6]),   // the shade down the back
      { f: t('stone', 2), d: P('M', xb + 0.5, -41.4, 'L', xf - 0.1, -41.4, 'L', xf - 0.1, -40.3, 'L', xb + 0.45, -40.3, 'Z'), op: 0.85, glow: 'lamp' },
      { f: t('stone', 2), d: P('M', xb + 0.4, -36.6, 'L', xf + 0.1, -36.6, 'L', xf + 0.1, -35.5, 'L', xb + 0.35, -35.5, 'Z'), op: 0.85, glow: 'lamp' }];
  };
  const cyAnim = PP.walkAnim(0.95, 10, 0);
  cyAnim.walk.parts = ['legA']; cyAnim.walk.pivot = [DX, PP.HIP];   // the near leg pedals; the far leg stays behind the frame

  PP.define({
    id: 'person.cyclist-commuter', category: 'person', size: [64, 64], variants: RIDERS.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'bike', 'body', 'legA'],
    palette: PP.palette({ vest: PP.tone4('#cfe23c'), steel: PP.tone4('#9aa0a6') }), anim: cyAnim, shadow: { rx: 30, ry: 3, h: 62 }, detailPx: true,
    night: { on: 1, glow: Object.assign({}, PP.NIGHT.glow, { lamp: '#fff0c8', tail: '#ff5a48' }) },
    tags: ['uk', 'london', 'city', 'people', 'anonymous', 'cyclist', 'bike', 'commuter', 'street', 'kit:people', 'kit:urban', 'kit:london', 'role:walker'],
    credit: 'the shared people builder (scenePeople.figure, the cycle pose) on three city bikes',
    build(v, r, ctx) {
      const p = RIDERS[v], s = ctx.season, B = BIKES[p.kind], o = PP.outfit(p, s), H = PP.HIP;
      const c = Math.cos(p.lean), sn = Math.sin(p.lean);
      const toBody = ([x, y]) => [DX + c * (x - DX) + sn * (y - H), H - sn * (x - DX) + c * (y - H)];   // a world point in the unleaned body's frame
      Object.assign(o, { dx: DX, legs: 'cycle', crank: BB, crankLen: CRANK, pedal: p.pedal,
        arms: { far: { hand: toBody([B.grip[0] + 0.6, B.grip[1] - 0.3]) }, near: { hand: toBody(B.grip) } } });
      if (p.helmet && (p.kind === 'road' || s !== 'summer')) o.hat = { kind: 'helmet', col: p.helmet, strip: 1 };
      const f = PP.figure(o), body = f.body, tc = t(o.top.col, 0);
      if (p.vest) body.splice(f.at.nearArm[0], 0, ...vest(f, o));
      // the night rim along the near arm (shoulder, elbow, hand) and the near thigh (hip to knee)
      const sh = f.shoulders.near, hn = f.hands.near, el = PP.ik(sh, hn, 9.4, 9.7, 1)[0], aw = (PP.BUILD[o.build].arm + PP.TOPS[o.top.kind].g * 0.6) / 2;
      body.push(rimBand([sh, el, hn], aw - 0.75, aw - 0.05, tc));
      const fa = [3.1 * Math.cos(0.2) - 2.8 * Math.sin(0.2), 3.1 * Math.sin(0.2) + 2.8 * Math.cos(0.2)], ank = [f.pedals.near[0] - fa[0], f.pedals.near[1] - fa[1]];
      const knee = PP.ik([DX, H], ank, 14.3, 14.6, -1)[0], tw = PP.BUILD[o.build].thigh / 2, h0 = [DX, H + 1.4];   // the builder's thigh and shin
      const legC = PP.TOPS[o.top.kind].long ? tc : t(o.bottom.col, 0);   // a long top's lap, or the trousers, shorts or skirt
      const legA = f.legA.concat(rimBand([h0, [h0[0] + (knee[0] - h0[0]) * 0.8, h0[1] + (knee[1] - h0[1]) * 0.8]], tw - 0.85, tw - 0.15, legC));
      const m = [q3(c), q3(sn), q3(-sn), q3(c), q3(DX - c * DX + sn * H), q3(H - sn * DX - c * H)];   // the lean: the body turns forward about the hip
      return { legB: f.legB, bike: bike(p, f), body: body.map(x => Object.assign(Array.isArray(x) ? { f: x[0], d: x[1], op: x[2] } : Object.assign({}, x), { m })), legA };
    },
  });
})();
