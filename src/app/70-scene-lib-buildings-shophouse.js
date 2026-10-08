/* ============================================================
   SCENE LIBRARY: buildings, the shophouse kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   variant.

   building.shophouse      one bay of a Peranakan (Straits) shophouse: the
                           five-foot way under the upper floor, a timber
                           shopfront with half doors and barred windows,
                           tall French windows with louvred shutters,
                           fanlights, plaster mouldings, glazed tiles on
                           the pilasters, a clay-tile roof between party
                           walls. 8 variants: pastel colours, two or three
                           storeys, arched or square windows. Units tile
                           side by side (width 120) into a terrace.
   building.shophouse-row  four bays as one terrace (3 variants).

   Front elevations lit from the LEFT. No signboards or lettering. Windows
   light at real dusk (glow 'window'); the five-foot way is lit by a
   hanging lantern (the 'lit' part). Anchor: the ground at the middle of
   the frontage.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

  const WALL = ['#a8dccb', '#f2bcc4', '#f4dc8e', '#acd0ec', '#f7c69e', '#cdb8e2', '#efe5c8', '#86d0c6'];
  const PAL = { base: {
    wall: WALL, wallD: WALL.map(c => mix(c, '#3a3040', .2)), wallL: WALL.map(c => mix(c, '#ffffff', .35)),
    trim: ['#f8f4ea', '#d8d0c0', '#bdb3a2'], shut: ['#2e6a50', '#2a5a82', '#7a3e2c', '#2f6e6e'], shutL: ['#4a8a6c', '#4a7aa2', '#9a5a46', '#4a8e8e'],
    glass: ['#2a3442', '#6a7c8c'], recess: ['#3e3632', '#4e4540', '#62574e'], door: ['#6e3e24', '#4e2c1a', '#8e5a36'],
    tile: ['#2a6a9a', '#d0a640', '#3a8a6a', '#b84a3a', '#f2ece0', '#6a3a7a'], roof: ['#a8543a', '#8a4430', '#c46c4a', '#6e3426'],
    floor: ['#c4b49a', '#a29278', '#8a7a62'], lamp: ['#c0302a', '#e8b040', '#7a1a14'], bars: '#2a2626', plant: ['#2f6a32', '#4a8a3c', '#c84a6a'], pot: '#a0522d',
    wash: '#ffcf8a', spill: '#ffb866',
  } };
  const STOREYS = [2, 2, 3, 2, 2, 3, 2, 3];

  /** One bay at x offset dx: pushes into body and lit. Returns the roof-top height. */
  const bay = (v, dx, body, lit) => {
    const W = 120, x0 = dx - W / 2, st = STOREYS[v], gH = 82, uH = 72, top = -(gH + uH * (st - 1)) - 8;
    const wall = `@wall.${v}`, wallD = `@wallD.${v}`, wallL = `@wallL.${v}`, sh = `@shut.${v % 4}`, shL = `@shutL.${v % 4}`;
    const arched = v % 2 === 1, arcade = v % 3 === 0, pw = 9;
    // the roof behind the parapet: clay tiles in a band, the ridge, the party-wall ends rising above
    body.push(['@roof.0', `M${f1(x0)} ${f1(top)}L${f1(x0 + 8)} ${f1(top - 20)}H${f1(x0 + W - 8)}L${f1(x0 + W)} ${f1(top)}z`]);
    let tiles = '';
    for (let i = 1; i < 4; i++) tiles += `M${f1(x0 + 2 + i * 2)} ${f1(top - i * 5)}H${f1(x0 + W - 2 - i * 2)}`;
    for (let i = 0; i < 20; i++) tiles += `M${f1(x0 + 4 + i * 5.9)} ${f1(top)}v-18`;
    body.push({ s: '@roof.3', w: .8, op: .45, d: tiles }, ['@roof.2', rect(x0 + 8, top - 22, W - 16, 3)], ['@roof.1', `M${f1(x0 + W * .6)} ${f1(top)}L${f1(x0 + W * .6)} ${f1(top - 20)}H${f1(x0 + W - 8)}L${f1(x0 + W)} ${f1(top)}z`, .35]);
    for (const px of [x0, x0 + W - pw]) body.push(['@trim.0', `M${f1(px)} 0V${f1(top - 26)}q${f1(pw / 2)} -6 ${f1(pw)} 0V0z`], ['@trim.1', rect(px + pw * .62, top - 24, pw * .38, -top + 24), .6]);
    // the upper storeys: wall, string courses, the cornice with its frieze
    body.push([wall, rect(x0 + pw, top, W - 2 * pw, -top - gH)], [wallD, rect(x0 + W * .78, top, W * .22 - pw, -top - gH), .45]);
    body.push(['@trim.0', rect(x0 + pw - 2, top, W - 2 * pw + 4, 7)], ['@trim.1', rect(x0 + pw - 2, top + 7, W - 2 * pw + 4, 2)]);
    let frieze = ''; for (let i = 0; i < 17; i++) frieze += rect(x0 + pw + 3 + i * 6, top + 10, 3, 4);
    body.push(['@trim.0', frieze, .9]);
    for (let s = 1; s < st; s++) {
      const fy = -gH - uH * (s - 1);   // floor line of this storey
      body.push(['@trim.0', rect(x0 + pw - 1, fy - 5, W - 2 * pw + 2, 5)], ['@trim.2', rect(x0 + pw - 1, fy - 1, W - 2 * pw + 2, 1.4)]);
      // three French windows: frame, fanlight (glass, lit), shutters (one leaf of the middle window open)
      for (let k = 0; k < 3; k++) {
        const wx = x0 + W * (.25 + k * .25) - 10, wy = fy - uH + 14, ww = 20, wh = 44;
        body.push(['@trim.0', rect(wx - 3, wy - (arched ? 12 : 9), ww + 6, wh + (arched ? 15 : 12))]);
        if (arched) body.push(['@trim.0', `M${f1(wx - 3)} ${f1(wy - 10)}q${f1(ww / 2 + 3)} -14 ${f1(ww + 6)} 0z`], { f: '@glass.0', d: `M${f1(wx)} ${f1(wy - 1)}V${f1(wy - 8)}q${f1(ww / 2)} -10 ${f1(ww)} 0V${f1(wy - 1)}z`, glow: 'window' });
        else body.push({ f: '@glass.0', d: rect(wx, wy - 7, ww, 6), glow: 'window' });
        body.push({ s: '@trim.0', w: .8, d: arched ? `M${f1(wx + ww / 2)} ${f1(wy - 1)}l-6 -7M${f1(wx + ww / 2)} ${f1(wy - 1)}v-11M${f1(wx + ww / 2)} ${f1(wy - 1)}l6 -7` : `M${f1(wx + ww / 3)} ${f1(wy - 7)}v6M${f1(wx + ww * 2 / 3)} ${f1(wy - 7)}v6` });
        const open = k === 1 && v % 4 !== 2;
        if (open) body.push({ f: '@glass.0', d: rect(wx + ww / 2, wy, ww / 2, wh), glow: 'window' }, ['@glass.1', `M${f1(wx + ww / 2)} ${f1(wy)}h${f1(ww / 2)}l-8 14h${f1(-ww / 2 + 8)}z`, .3]);
        for (const half of open ? [0] : [0, 1]) {
          const lx = wx + half * ww / 2;
          let lv = ''; for (let i = 0; i < 13; i++) lv += `M${f1(lx + 1.6)} ${f1(wy + 3 + i * 3.1)}h${f1(ww / 2 - 3.2)}`;
          body.push([sh, rect(lx, wy, ww / 2, wh)], { s: shL, w: 1.1, d: lv }, { s: '@glass.0', w: .5, op: .5, d: `M${f1(lx + ww / 2)} ${f1(wy)}v${wh}` });
        }
        body.push(['@trim.1', rect(wx - 4, wy + wh, ww + 8, 3)], ['@trim.2', rect(wx - 4, wy + wh + 3, ww + 8, 1), .6]);
        // a low balustrade panel under each window
        body.push({ s: '@trim.0', w: .9, d: `M${f1(wx)} ${f1(wy + wh - 10)}h${ww}` + Array.from({ length: 5 }, (_, i) => `M${f1(wx + 2 + i * 4)} ${f1(wy + wh - 10)}v10`).join('') });
      }
      // plaster panels between the windows, a hanging plant on the sill of v3 and v6
      for (let k = 0; k < 2; k++) body.push({ s: wallL, w: 1.1, d: rect(x0 + W * (.375 + k * .25) - 2.5, fy - uH + 18, 5, 36) });
      if (v === 3 || v === 6) body.push(['@pot', rect(x0 + W * .25 - 6, fy - 22, 12, 5)], ['@plant.0', ell(x0 + W * .25, fy - 24, 9, 5)], ['@plant.2', ell(x0 + W * .25 - 3, fy - 26, 1.6, 1.6) + ell(x0 + W * .25 + 4, fy - 25, 1.6, 1.6)]);
    }
    // the five-foot way: the recess under the upper floor, its shadow, the tiled floor, the shopfront at the back
    const ox = x0 + pw, ow = W - 2 * pw, oy = -gH + 10;
    body.push(['@trim.0', rect(x0 + pw, -gH, W - 2 * pw, 10)], ['@trim.1', rect(x0 + pw, -gH + 8, W - 2 * pw, 2)]);
    body.push(['@recess.1', rect(ox, oy, ow, -oy)]);
    body.push(['@recess.2', rect(ox + 6, oy + 8, ow - 12, -oy - 12)]);
    // the shopfront: half doors in the middle, barred windows each side, a lit transom
    const dw = 32, dx0 = dx - dw / 2;
    body.push(['@door.1', rect(dx0 - 2, oy + 12, dw + 4, -oy - 14)], { f: '@glass.0', d: rect(dx0, oy + 14, dw, 9), glow: 'window' }, { s: '@door.1', w: 1, d: `M${f1(dx0 + 8)} ${f1(oy + 14)}v9M${f1(dx0 + 16)} ${f1(oy + 14)}v9M${f1(dx0 + 24)} ${f1(oy + 14)}v9` });
    body.push({ f: '@glass.0', d: rect(dx0, oy + 24, dw, -oy - 26), glow: 'window' }, ['@door.0', rect(dx0, oy + 40, dw / 2 - .6, 26)], ['@door.2', rect(dx + .6, oy + 40, dw / 2 - .6, 26)], { s: '@door.1', w: .8, d: `M${f1(dx0 + 3)} ${f1(oy + 44)}h10v18h-10zM${f1(dx + 3.6)} ${f1(oy + 44)}h10v18h-10z` });
    for (const sx of [ox + 10, dx + dw / 2 + 8]) {
      const swd = (ow - dw) / 2 - 18;
      body.push(['@door.1', rect(sx - 2, oy + 20, swd + 4, 34)], { f: '@glass.0', d: rect(sx, oy + 22, swd, 30), glow: 'window' }, { s: '@bars', w: 1.1, d: Array.from({ length: 5 }, (_, i) => `M${f1(sx + (i + .5) * swd / 5)} ${f1(oy + 22)}v30`).join('') }, ['@door.0', rect(sx - 2, oy + 54, swd + 4, -oy - 58)]);
    }
    body.push(['#000000', rect(ox, oy, ow, 16), .18], ['#000000', rect(ox, oy, ow, 6), .14]);
    // the arcade: arched (v0, v3, v6) or a square opening with brackets
    if (arcade) body.push([wall, `M${f1(ox)} ${f1(oy)}h${f1(ow)}v22q${f1(-ow / 2)} -26 ${f1(-ow)} 0z`], [wallD, `M${f1(ox + ow * .7)} ${f1(oy)}h${f1(ow * .3)}v22q${f1(-ow * .15)} -12 ${f1(-ow * .3)} -18z`, .4], { s: '@trim.0', w: 2, d: `M${f1(ox)} ${f1(oy + 22)}q${f1(ow / 2)} -26 ${f1(ow)} 0` });
    else body.push(['@trim.0', `M${f1(ox)} ${f1(oy)}h10l-10 10zM${f1(ox + ow)} ${f1(oy)}h-10l10 10z`]);
    body.push(['@floor.0', rect(x0, -4, W, 4)], ['@floor.1', rect(x0, -1.2, W, 1.2)], { s: '@floor.2', w: .6, op: .6, d: Array.from({ length: 12 }, (_, i) => `M${f1(x0 + i * 10)} -4v3`).join('') });
    // pilasters: glazed tile dado, capitals
    for (const px of [x0, x0 + W - pw]) {
      let tl = ''; const t2 = [];
      for (let row = 0; row < 6; row++) for (let c = 0; c < 2; c++) { const tx = px + 1 + c * 3.6, ty = -32 + row * 4.4; if ((row + c) % 2) tl += rect(tx, ty, 3.4, 4.2); else t2.push(rect(tx, ty, 3.4, 4.2)); }
      body.push(['@tile.4', rect(px + .6, -33, pw - 1.2, 28)], [`@tile.${v % 4}`, tl], [`@tile.${(v + 1) % 6}`, t2.join(''), .85], ['@trim.1', rect(px - 1, -gH - 2, pw + 2, 4)], ['@trim.2', rect(px - 1, -36, pw + 2, 3)]);
    }
    // the lantern in the five-foot way (and its warm wash after dusk)
    const lx = x0 + W * (v % 2 ? .3 : .7);
    body.push({ s: '@bars', w: .7, d: `M${f1(lx)} ${f1(oy)}v6` }, ['@lamp.0', ell(lx, oy + 12, 5, 6)], ['@lamp.1', rect(lx - 3, oy + 5, 6, 1.6) + rect(lx - 3, oy + 17.4, 6, 1.6)], { f: '@lamp.0', d: ell(lx - 1, oy + 11, 2.4, 3.6), glow: 'lamp' });
    lit.push({ f: { rad: [[0, '@wash', .42], [1, '@wash', 0]], cx: lx, cy: oy + 14, r: 64 }, d: rect(ox, oy, ow, -oy) }, { f: { rad: [[0, '@spill', .3], [1, '@spill', 0]], cx: lx, cy: 0, r: 46 }, d: rect(x0 - 10, -8, W + 20, 10) });
    return top - 26;
  };

  const common = {
    category: 'building', seasonal: false, flippable: true, parts: ['body', 'lit'], palette: PAL,
    night: { glow: { window: '#ffd690', lamp: '#ffb070' }, on: .7 },
    tags: ['asia', 'southeast-asia', 'peranakan', 'straits', 'shophouse', 'street', 'terrace', 'heritage', 'kit:shophouse', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the shophouse kit',
  };
  defineObj(Object.assign({}, common, {
    id: 'building.shophouse', size: [124, 300], variants: 8,
    shadow: { rx: 64, ry: 8, h: 260 },
    build(v) { const body = [], lit = []; bay(v, 0, body, lit); return { body, lit }; },
  }));
  const ROWS = [[0, 3, 1, 4], [6, 2, 7, 5], [3, 1, 5, 0]];
  defineObj(Object.assign({}, common, {
    id: 'building.shophouse-row', size: [484, 300], variants: 3,
    shadow: { rx: 245, ry: 10, h: 260 },
    build(v) { const body = [], lit = []; ROWS[v].forEach((b, i) => bay(b, -180 + i * 120, body, lit)); return { body, lit }; },
  }));
})();
