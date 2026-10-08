/* ============================================================
   SCENE LIBRARY: city buildings (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   The urban / city kit: a skyscraper GENERATOR (glass curtain wall, stone
   art deco, a modern twisted tower, a residential tower), the Victorian
   brick terrace, the stucco townhouse row and the high-street shopfront.
   Generic designs only: no real tower is copied, no text, no logos, no
   brand liveries (fascias are plain colour bands).

   Front elevations lit from the LEFT (the right return face is in shade).
   Windows light at real dusk (glow 'window'): window cells are grouped into
   many glow shapes, so a seeded share of floors and flats light up. The
   'lit' part holds what only shows after dusk (crown floodlights, LED
   edges, light spilling onto the pavement). Anchor: the ground at the
   middle of the front wall.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const R = Math.round;
  const rr = (r, a, b) => a + r() * (b - a);
  const ri = (r, a, b) => Math.floor(a + r() * (b - a + 1));
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const quad = (a, b, c, d) => `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(c[0])} ${f1(c[1])}L${f1(d[0])} ${f1(d[1])}z`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  /** Glow groups: N strings; add(i, d) appends a window to group i. shapes(paint) returns one glow shape per group.
      The windows are detail: a tile still (LOD < .5) draws the tower's massing without them (they light up at night all the same). */
  const groups = (n) => { const g = Array.from({ length: n }, () => ''); return { g, add: (i, d) => { g[((i % n) + n) % n] += d; }, shapes: (paint, op) => g.map((d, i) => ({ f: typeof paint === 'function' ? paint(i) : paint, d, op, glow: 'window', detail: true })) }; };
  /**
   * Night variety: a seeded share of the facade's glow shapes (62 to 76 %, set per variant) can light, the rest lose `glow`
   * and stay dark all night; night.on (.9) then picks among them per placement, so about 56 to 68 % are lit. With curt, a
   * share of the lightable rectangular panes get a half-drawn blind or a pair of curtains.
   */
  const nightMix = (body, id, v, curt = 0) => {
    const z = sceneRnd(sceneHash(id + '|night|' + v)), keep = .62 + z() * .14, out = [];
    for (const sh of body) {
      if (Array.isArray(sh) || !sh.glow) { out.push(sh); continue; }
      if (z() > keep) { const c = Object.assign({}, sh); delete c.glow; out.push(c); continue; }
      const b = out.push(sh) && curt && z() < curt && /^M(-?[\d.]+) (-?[\d.]+)h([\d.]+)v([\d.]+)h-[\d.]+z$/.exec(sh.d);
      if (b) { const [x, y, w, h] = b.slice(1).map(Number), k = z(); out.push(['#6a4438', k < .5 ? rect(x, y, w, h * (.3 + k * .6)) : rect(x, y, w * .2, h) + rect(x + w * .8, y, w * .2, h), .85]); }
    }
    return out;
  };

  /* =====================================================================
     building.skyscraper: a GENERATOR. v % 4 picks the style, v the seed:
       0 glass curtain wall (setbacks, mullion grid, sky reflections; flat, sloped or spire crown)
       1 stone art deco (ziggurat setbacks, piers and recessed windows, a fluted crown and needle)
       2 modern twisted (square floor plates turning up the height, ribbon windows, a tapered top)
       3 residential (balconies, flats, coloured panels or brick cladding, a plant room on top)
     16 variants. Aviation beacons blink (flicker on 'beacon').
     ===================================================================== */
  const STY = ['glass', 'deco', 'twist', 'resi'];
  const towerGlass = (v, r, out) => {
    const { body, lit, beacon } = out;
    const W = R(rr(r, 210, 300)), H = R(rr(r, 1150, 1650)), sw = R(W * rr(r, .16, .24)), tint = ['glass', 'glassG', 'glassD'][v % 3 === 1 ? 1 : v % 5 === 2 ? 2 : 0];
    const nT = ri(r, 1, 3), crown = ri(r, 0, 2);
    const tiers = []; let y = 0, w = W;
    for (let i = 0; i < nT; i++) { const h = i === nT - 1 ? H - (-y) : R(H * (i === 0 ? rr(r, .45, .62) : rr(r, .18, .26))); tiers.push({ x0: -w / 2, w, y0: y - h, y1: y, sw: R(sw * w / W) }); y -= h; w = R(w * rr(r, .7, .84)); }
    const fh = 18, glow = groups(40), g2 = groups(10);
    let mull = '', span = '', sideL = '';
    tiers.forEach((t, ti) => {
      const { x0, w, y0, y1, sw: s } = t, top = ti === tiers.length - 1;
      // the return face (shaded), then the front face: a sky gradient in the glass
      body.push([`@${tint}.3`, rect(x0 + w, y0 + 6, s, y1 - y0 - 6)], [`@${tint}.0`, rect(x0 + w, y0 + 6, s * .35, y1 - y0 - 6), .35]);
      body.push({ f: { lin: [[0, `@${tint}.4`], [.45, `@${tint}.2`], [1, `@${tint}.0`]], x1: 0, y1: y0, x2: 0, y2: y1 }, d: rect(x0, y0, w, y1 - y0) });
      // cells: vision glass per floor, grouped in blocks of floors and bays (offices light in blocks)
      const cols = Math.max(4, R(w / 12)), cw = w / cols, bays = Math.max(2, R(cols / 4));
      for (let fy = y1 - fh; fy > y0 + (top && crown === 1 ? 40 : 6); fy -= fh) {
        const fl = R((y1 - fy) / fh), blockF = Math.floor(fl / ri(r, 2, 4));
        for (let b = 0; b < bays; b++) { const c0 = R(b * cols / bays), c1 = R((b + 1) * cols / bays); glow.add(blockF * 7 + b * 3 + ti * 11 + (r() < .3 ? ri(r, 0, 39) : 0), rect(x0 + c0 * cw + 1, fy + 3, (c1 - c0) * cw - 2, fh - 7)); }
        g2.add(blockF + ti, rect(x0 + w + 1, fy + 3, s - 2, fh - 7));
        span += `M${f1(x0)} ${f1(fy + fh - 2)}h${f1(w)}`;
        sideL += `M${f1(x0 + w)} ${f1(fy + fh - 2)}h${f1(s)}`;
      }
      for (let c = 1; c < cols; c++) mull += `M${f1(x0 + c * cw)} ${f1(y0 + 2)}V${f1(y1)}`;
      // a band of sky reflected across the glass, and a cloud
      const rx = x0 + w * rr(r, .1, .5);
      body.push({ f: `@${tint}.4`, d: `M${f1(rx)} ${f1(y1)}L${f1(rx + w * .35)} ${f1(y1)}L${f1(Math.min(x0 + w, rx + w * .9))} ${f1(Math.max(y0, y1 - (y1 - y0) * .7))}L${f1(Math.min(x0 + w, rx + w * .55))} ${f1(Math.max(y0, y1 - (y1 - y0) * .7))}z`, op: .16, detail: true });
      body.push({ f: '#ffffff', d: ell(x0 + w * rr(r, .25, .75), y0 + (y1 - y0) * rr(r, .2, .6), w * .18, 14), op: .1, detail: true });
      // the setback ledge and its parapet
      body.push(['@metal.0', rect(x0 - 3, y0 - 4, w + s + 3, 6)], ['@metal.1', rect(x0 + w, y0 - 4, s, 6), .6]);
    });
    body.push(...glow.shapes(i => `@${tint}.${[0, 1, 2, 1, 0][i % 5]}`, .5), ...g2.shapes(`@${tint}.3`, .7));
    body.push({ s: '@mull.1', w: 1.1, op: .55, d: mull, detail: true }, { s: '@mull.1', w: 3.2, op: .5, d: span, detail: true }, { s: '@mull.1', w: 2.6, op: .45, d: sideL, detail: true }, ['@mull.0', rect(tiers[0].x0, -3, tiers[0].w, 3), .6]);
    // the entrance: a double-height lobby
    const lx = tiers[0].x0, lw = tiers[0].w;
    body.push(['@dark', rect(lx + lw * .3, -34, lw * .4, 34)], { f: '@glass.2', d: rect(lx + lw * .32, -32, lw * .36, 30), glow: 'window', op: .6 }, ['@metal.0', rect(lx + lw * .26, -40, lw * .48, 6)]);
    const t = tiers[tiers.length - 1], cx = t.x0 + t.w / 2;
    if (crown === 0) {
      // a flat top with a plant screen and a mast
      body.push(['@metal.1', rect(t.x0 + t.w * .15, t.y0 - 34, t.w * .7, 30)], { s: '@metal.0', w: 1, op: .6, d: Array.from({ length: 10 }, (_, i) => `M${f1(t.x0 + t.w * .15 + i * t.w * .07)} ${f1(t.y0 - 34)}v30`).join('') }, { s: '@metal.0', w: 3, d: `M${f1(cx)} ${f1(t.y0 - 34)}V${f1(t.y0 - 150)}` });
      beacon.push({ f: '#7a2a22', d: ell(cx, t.y0 - 152, 3.4, 3.4), glow: 'lamp' }, { f: '#7a2a22', d: ell(t.x0 + t.w * .17, t.y0 - 37, 2.6, 2.6), glow: 'lamp' });
      lit.push({ s: '@led', w: 2.2, op: .85, d: `M${f1(t.x0)} ${f1(t.y0 - 1)}h${f1(t.w)}` }, { f: { rad: [[0, '@red', .55], [1, '@red', 0]], cx, cy: t.y0 - 152, r: 18 }, d: ell(cx, t.y0 - 152, 18, 18) });
    } else if (crown === 1) {
      // a sloped crown: the glass is cut on a diagonal, an open frame behind the slope
      const hc = R(t.w * rr(r, .45, .7));
      body.push({ f: { lin: [[0, `@${tint}.4`], [1, `@${tint}.2`]], x1: 0, y1: t.y0 - hc, x2: 0, y2: t.y0 }, d: `M${f1(t.x0)} ${f1(t.y0)}L${f1(t.x0 + t.w)} ${f1(t.y0 - hc)}V${f1(t.y0)}z` }, [`@${tint}.3`, `M${f1(t.x0 + t.w)} ${f1(t.y0 - hc)}h${f1(t.sw)}V${f1(t.y0)}h${f1(-t.sw)}z`], { s: '@mull.0', w: 1, op: .5, d: Array.from({ length: 8 }, (_, i) => `M${f1(t.x0 + t.w * (i + 1) / 9)} ${f1(t.y0)}V${f1(t.y0 - hc * (i + 1) / 9)}`).join('') }, { s: '@metal.0', w: 2.4, d: `M${f1(t.x0)} ${f1(t.y0)}L${f1(t.x0 + t.w)} ${f1(t.y0 - hc)}` });
      beacon.push({ f: '#7a2a22', d: ell(t.x0 + t.w, t.y0 - hc - 4, 3.4, 3.4), glow: 'lamp' }, { f: '#7a2a22', d: ell(t.x0 + 6, t.y0 - 6, 2.6, 2.6), glow: 'lamp' });
      lit.push({ s: '@led', w: 2.6, op: .9, d: `M${f1(t.x0)} ${f1(t.y0)}L${f1(t.x0 + t.w)} ${f1(t.y0 - hc)}` }, { f: { lin: [[0, '@led', .3], [1, '@led', 0]], x1: 0, y1: t.y0 - hc, x2: 0, y2: t.y0 + 60 }, d: `M${f1(t.x0)} ${f1(t.y0)}L${f1(t.x0 + t.w)} ${f1(t.y0 - hc)}V${f1(t.y0 + 60)}H${f1(t.x0)}z` });
    } else {
      // a spire: a tapering lattice needle on a crown drum
      const sh = R(rr(r, 180, 300));
      body.push(['@metal.0', rect(cx - t.w * .3, t.y0 - 26, t.w * .6, 24)], ['@metal.1', rect(cx + t.w * .1, t.y0 - 26, t.w * .2, 24), .7], ['@metal.2', `M${f1(cx - 9)} ${f1(t.y0 - 26)}L${f1(cx)} ${f1(t.y0 - 26 - sh)}L${f1(cx + 9)} ${f1(t.y0 - 26)}z`], ['@metal.1', `M${f1(cx)} ${f1(t.y0 - 26 - sh)}L${f1(cx + 9)} ${f1(t.y0 - 26)}H${f1(cx + 2)}z`, .7], { s: '@metal.1', w: .8, op: .6, d: Array.from({ length: 8 }, (_, i) => { const yy = t.y0 - 26 - sh * (i + 1) / 9, ww = 9 * (1 - (i + 1) / 9); return `M${f1(cx - ww)} ${f1(yy)}h${f1(2 * ww)}`; }).join('') });
      beacon.push({ f: '#7a2a22', d: ell(cx, t.y0 - 30 - sh, 3.2, 3.2), glow: 'lamp' }, { f: '#7a2a22', d: ell(cx, t.y0 - 26 - sh * .55, 2.4, 2.4), glow: 'lamp' });
      lit.push({ f: { rad: [[0, '@led', .5], [1, '@led', 0]], cx, cy: t.y0 - 26 - sh * .4, r: sh * .6 }, d: `M${f1(cx - 14)} ${f1(t.y0 - 26)}L${f1(cx)} ${f1(t.y0 - 30 - sh)}L${f1(cx + 14)} ${f1(t.y0 - 26)}z` }, { s: '@led', w: 2, op: .9, d: `M${f1(t.x0)} ${f1(t.y0 - 1)}h${f1(t.w)}` });
    }
  };

  const towerDeco = (v, r, out) => {
    const { body, lit, beacon } = out;
    const W = R(rr(r, 260, 340)), H = R(rr(r, 1000, 1400)), st = v % 8 === 5 ? 'stoneB' : 'stone', sw = R(W * .18);
    // ziggurat: a base, then 3 to 4 symmetric setbacks
    const nT = ri(r, 3, 4), tiers = []; let y = 0, w = W;
    for (let i = 0; i < nT; i++) { const h = R(i === 0 ? H * rr(r, .5, .58) : H * (1 - .55) / (nT - 1) * rr(r, .85, 1.1)); tiers.push({ x0: -w / 2, w, y0: y - h, y1: y, sw: R(sw * w / W) }); y -= h; w = R(w * rr(r, .72, .82)); }
    const glow = groups(36), fh = 20;
    let piers = '', recess = '', spand = '';
    tiers.forEach((t, ti) => {
      const { x0, w, y0, y1, sw: s } = t;
      body.push([`@${st}.1`, rect(x0 + w, y0, s, y1 - y0)], [`@${st}.0`, rect(x0, y0, w, y1 - y0)]);
      // the bays: recessed window strips between strong vertical piers
      const bays = Math.max(3, R(w / 22)), bw = w / bays;
      for (let b = 0; b < bays; b++) {
        const bx = x0 + b * bw + 4, ww = bw - 8;
        if (b === 0 || b === bays - 1) continue;   // solid corner piers
        recess += rect(bx, y0 + 14, ww, y1 - y0 - (ti === 0 ? 70 : 20));
        for (let fy = y0 + 16; fy < y1 - (ti === 0 ? 62 : 8); fy += fh) {
          const fl = R((y1 - fy) / fh);
          glow.add(ti * 9 + Math.floor(fl / ri(r, 1, 3)) * 5 + b + (r() < .35 ? ri(r, 0, 35) : 0), rect(bx + 1.5, fy + 2, ww - 3, fh - 8));
          spand += rect(bx, fy + fh - 6, ww, 5);
        }
        piers += rect(x0 + b * bw - 1.5, y0 + 6, 3, y1 - y0 - 6);
      }
      // the return face: narrow punched windows in shade
      for (let fy = y0 + 16; fy < y1 - (ti === 0 ? 62 : 8); fy += fh) glow.add(ti + R(fy / fh) * 3, rect(x0 + w + s * .3, fy + 2, s * .4, fh - 8));
      // the setback: a fluted parapet with chevrons
      body.push([`@${st}.2`, rect(x0 - 2, y0 - 8, w + s + 2, 10)], { s: `@${st}.3`, w: 1, op: .6, d: Array.from({ length: R(w / 10) }, (_, i) => `M${f1(x0 + 4 + i * 10)} ${f1(y0 - 6)}l3 4 3-4`).join(''), detail: true });
      lit.push({ f: { lin: [[0, '@flood', .38], [1, '@flood', 0]], x1: 0, y1: y0, x2: 0, y2: y0 + 160 }, d: rect(x0, y0, w, Math.min(160, y1 - y0)) });
    });
    body.push(['@dark', recess], ...glow.shapes(i => (i % 3 ? '@dglass.0' : '@dglass.1'), .9), { f: `@${st}.1`, d: spand, detail: true }, { f: `@${st}.2`, d: piers, op: .9, detail: true });
    // the base: a tall entrance arch, bronze doors, a stone plinth
    const b0 = tiers[0];
    body.push([`@${st}.3`, rect(b0.x0, -60, b0.w, 60), .35], [`@${st}.2`, rect(b0.x0, -64, b0.w, 5)], ['@bronze.0', `M-26 0V-46q26-30 52 0V0z`], { f: '@dglass.1', d: 'M-20-2V-44q20-22 40 0V-2z', glow: 'window' }, { s: '@bronze.1', w: 1.2, d: 'M0-2V-62M-20-30h40M-14-46l14 8 14-8' });
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) body.push(['@dark', rect(sx * (b0.w * .28 + i * 30) - 9, -48, 18, 34)], { f: '@dglass.1', d: rect(sx * (b0.w * .28 + i * 30) - 7, -46, 14, 30), glow: 'window' });
    // the crown: stepped fins round a drum, a sunburst of arches, the needle
    const t = tiers[tiers.length - 1], cx = t.x0 + t.w / 2, cw = t.w * .62, ch = R(rr(r, 90, 130)), nh = R(rr(r, 120, 220));
    for (let k = 0; k < 3; k++) {
      const ww = cw * (1 - k * .26), yy = t.y0 - ch * (k + 1) / 3;
      body.push([`@${st}.${k === 1 ? 2 : 0}`, rect(cx - ww / 2, yy, ww, ch / 3 + 1)], [`@${st}.1`, rect(cx + ww / 2 - ww * .18, yy, ww * .18, ch / 3 + 1), .7]);
      // sunburst: nested arches in each step (the deco signature)
      const arc = Array.from({ length: 3 }, (_, j) => { const rw = ww * .32 * (1 - j * .28); return `M${f1(cx - rw)} ${f1(yy + ch / 3)}a${f1(rw)} ${f1(rw * .9)} 0 0 1 ${f1(2 * rw)} 0`; }).join('');
      body.push({ s: `@${st}.3`, w: 1.4, op: .7, d: arc, detail: true });
      glow.add(0, '');
      body.push({ f: '@dglass.0', d: Array.from({ length: 4 }, (_, j) => rect(cx - ww * .38 + j * ww * .22, yy + ch / 3 * .3, ww * .08, ch / 3 * .55)).join(''), glow: 'window' });
    }
    body.push(['@metal.2', `M${f1(cx - 6)} ${f1(t.y0 - ch)}L${f1(cx)} ${f1(t.y0 - ch - nh)}L${f1(cx + 6)} ${f1(t.y0 - ch)}z`], ['@metal.1', `M${f1(cx)} ${f1(t.y0 - ch - nh)}L${f1(cx + 6)} ${f1(t.y0 - ch)}H${f1(cx + 1)}z`, .7]);
    beacon.push({ f: '#7a2a22', d: ell(cx, t.y0 - ch - nh - 2, 3, 3), glow: 'lamp' });
    lit.push({ f: { rad: [[0, '@flood', .55], [.6, '@flood', .2], [1, '@flood', 0]], cx, cy: t.y0 - ch * .5, r: cw * .9 }, d: ell(cx, t.y0 - ch * .5, cw * .9, ch * .9) }, { f: { rad: [[0, '@red', .5], [1, '@red', 0]], cx, cy: t.y0 - ch - nh, r: 16 }, d: ell(cx, t.y0 - ch - nh, 16, 16) });
  };

  const towerTwist = (v, r, out) => {
    const { body, lit, beacon } = out;
    const S = R(rr(r, 150, 200)), H = R(rr(r, 1150, 1600)), th0 = rr(r, 8, 30) * Math.PI / 180, turn = rr(r, 55, 95) * Math.PI / 180 * (v % 8 < 4 ? 1 : -1);
    const bh = 12, nb = Math.floor(H / bh), tint = v % 3 === 0 ? 'glassD' : 'glass';
    const tone = ['', '', '', ''], glow = groups(36), rib = { a: '', b: '' };
    let edge = '', edges = [];
    const facesAt = (i) => {
      const t = i / nb, th = th0 + turn * t, k = t > .86 ? 1 - (t - .86) / .14 * .45 : 1, a = S / 2 * Math.SQRT2 * k;
      const cs = [0, 1, 2, 3].map(j => { const p = th + Math.PI / 4 + j * Math.PI / 2; return [Math.cos(p) * a, Math.sin(p)]; });
      return cs;
    };
    for (let i = 0; i < nb; i++) {
      const c0 = facesAt(i), c1 = facesAt(i + 1), y0 = -i * bh, y1 = -(i + 1) * bh;
      // visible faces: those whose outward normal points at the viewer (positive depth)
      for (let j = 0; j < 4; j++) {
        const j2 = (j + 1) % 4, nx = (c0[j][1] + c0[j2][1]) / 2;   // the depth of the face centre ~ sin
        const mx = c0[j][0] + c0[j2][0], zx = nx;
        if (zx <= 0.02) continue;
        const nAng = Math.atan2(zx, mx / (S * Math.SQRT2)), shade = (Math.cos(nAng) + 1) / 2;   // 0 faces left (lit) .. 1 faces right (shade)
        const ti = Math.min(3, Math.floor(shade * 4));
        tone[ti] += quad([c0[j][0], y0], [c0[j2][0], y0], [c1[j2][0], y1], [c1[j][0], y1]);
        // the ribbon window of this floor on this face (glow)
        const p = (c, u) => c[j][0] + (c[j2][0] - c[j][0]) * u;
        if (Math.abs(c0[j2][0] - c0[j][0]) > 6) glow.add(Math.floor(i / ri(r, 2, 5)) * 3 + j * 7 + (r() < .3 ? ri(r, 0, 35) : 0), quad([p(c0, .03), y0 - 3.4], [p(c0, .97), y0 - 3.4], [p(c1, .97), y1 + 1.6], [p(c1, .03), y1 + 1.6]));
      }
      if (i % 2 === 0) { let best = 0, bz = -9; for (let j = 0; j < 4; j++) if (c0[j][1] > bz) { bz = c0[j][1]; best = j; } edges.push([c0[best][0], y0]); }
    }
    // a tile still draws the tower's outline in its mid tone (hidden under the faces at full size) instead of every floor's faces
    const sil = [];
    for (let i = 0; i <= nb; i += 4) { const xs = facesAt(Math.min(i, nb)).map(c => c[0]); sil.push([Math.min(...xs), -Math.min(i, nb) * bh, Math.max(...xs)]); }
    if (sil[sil.length - 1][1] !== -nb * bh) { const xs = facesAt(nb).map(c => c[0]); sil.push([Math.min(...xs), -nb * bh, Math.max(...xs)]); }
    body.push([`@${tint}.2`, 'M' + sil.map(q => `${R(q[0]) + 1} ${q[1]}`).concat(sil.slice().reverse().map(q => `${R(q[2]) - 1} ${q[1]}`)).join('L') + 'z']);
    body.push({ f: `@${tint}.4`, d: tone[0], detail: true }, { f: `@${tint}.2`, d: tone[1], detail: true }, { f: `@${tint}.1`, d: tone[2], detail: true }, { f: `@${tint}.3`, d: tone[3], detail: true });
    body.push(...glow.shapes(i => `@${tint}.${[3, 0, 1][i % 3]}`, .55));
    // the leading corner reads as a helix: a bright line up the nearest edge (broken where it jumps to the next corner)
    let prev = null; for (const [x, y] of edges) { edge += (prev && Math.abs(prev[0] - x) < 30 ? `L${f1(x)} ${f1(y)}` : `M${f1(x)} ${f1(y)}`); prev = [x, y]; }
    body.push({ s: '@mull.0', w: 1.6, op: .75, d: edge });
    // a slender crown spire and the lobby canopy
    const top = -nb * bh, sh = R(rr(r, 120, 220));
    body.push(['@metal.2', `M-5 ${top}L0 ${top - sh}L5 ${top}z`], ['@metal.1', `M0 ${top - sh}L5 ${top}H1z`, .7], ['@metal.0', rect(-S * .55, -42, S * 1.1, 5)], ['@dark', rect(-S * .35, -36, S * .7, 36)], { f: `@${tint}.2`, d: rect(-S * .33, -34, S * .66, 32), glow: 'window', op: .7 });
    beacon.push({ f: '#7a2a22', d: ell(0, top - sh - 2, 3, 3), glow: 'lamp' });
    lit.push({ s: '@led', w: 2.4, op: .85, d: edge }, { f: { rad: [[0, '@led', .45], [1, '@led', 0]], cx: 0, cy: top - sh * .4, r: sh * .5 }, d: ell(0, top - sh * .4, sh * .5, sh * .5) });
  };

  const towerResi = (v, r, out) => {
    const { body, lit, beacon } = out;
    const W = R(rr(r, 210, 280)), H = R(rr(r, 720, 1100)), sw = R(W * .2), brick = v % 8 === 3, fh = 22;
    const wall = brick ? 'brickT' : 'conc', bays = ri(r, 4, 6), bw = W / bays, x0 = -W / 2, y0 = -H;
    const accent = ri(r, 0, 3);
    body.push([`@${wall}.1`, rect(W / 2, y0, sw, H)], [`@${wall}.0`, rect(x0, y0, W, H)]);
    if (brick) body.push({ s: '@brickT.3', w: .7, op: .3, d: Array.from({ length: R(H / 8) }, (_, i) => `M${x0} ${f1(y0 + 4 + i * 8)}h${W}`).join(''), detail: true });
    const glow = groups(44); let slab = '', rail = '', panel = '', frame = '';
    for (let fy = y0 + 10, fl = 0; fy < -60; fy += fh, fl++) {
      for (let b = 0; b < bays; b++) {
        const bx = x0 + b * bw, balc = (b + (v % 2)) % 2 === 0;
        // coloured spandrel panels on alternate bays (not brick)
        if (!brick && (b + fl) % 3 === accent % 3) panel += rect(bx + 3, fy, bw - 6, 5);
        glow.add(fl * 5 + b * 7 + ri(r, 0, 43), rect(bx + 5, fy + 5, bw - 10, fh - 9));
        frame += `M${f1(bx + bw / 2)} ${f1(fy + 5)}v${fh - 9}`;
        if (balc) { slab += rect(bx + 1, fy + fh - 4, bw - 2, 3); rail += rect(bx + 2, fy + fh - 12, bw - 4, 8); }
      }
      glow.add(fl * 3, rect(W / 2 + sw * .25, fy + 5, sw * .5, fh - 9));
    }
    body.push(...glow.shapes(i => (i % 4 ? '@wglass.0' : '@wglass.1'), 1));
    body.push({ s: `@${wall}.2`, w: 1.4, op: .8, d: frame, detail: true }, { f: '@clad.' + accent, d: panel, detail: true }, { f: '@rail.0', d: rail, op: .45, detail: true }, { s: '@rail.1', w: 1, op: .8, d: rail.replace(/z/g, ''), detail: true }, { f: `@${wall}.2`, d: slab, detail: true }, { f: `@${wall}.3`, d: slab, op: .25, detail: true });
    // a glazed ground floor with a canopy; a plant room and a water tank on the roof
    body.push(['@dark', rect(x0, -60, W, 60)], { f: '@wglass.0', d: rect(x0 + 6, -54, W - 12, 50), glow: 'window', op: .8 }, { s: `@${wall}.0`, w: 3, d: Array.from({ length: bays + 1 }, (_, i) => `M${f1(x0 + i * bw)} -60V0`).join('') }, ['@metal.0', rect(x0 - 4, -64, W + 8, 5)]);
    body.push([`@${wall}.2`, rect(x0 - 2, y0 - 6, W + sw + 2, 8)], ['@metal.1', rect(x0 + W * .2, y0 - 40, W * .4, 34)], ['@metal.0', rect(x0 + W * .2, y0 - 40, W * .4, 4)], ['@metal.1', rect(x0 + W * .66, y0 - 26, W * .16, 20), .9], { s: '@metal.0', w: 1, op: .6, d: Array.from({ length: 6 }, (_, i) => `M${f1(x0 + W * .22 + i * W * .065)} ${f1(y0 - 34)}v26`).join('') });
    beacon.push({ f: '#7a2a22', d: ell(x0 + W * .2 + 3, y0 - 43, 2.6, 2.6), glow: 'lamp' }, { f: '#7a2a22', d: ell(x0 + W * .6 - 3, y0 - 43, 2.6, 2.6), glow: 'lamp' });
    lit.push({ f: { lin: [[0, '@flood', .3], [1, '@flood', 0]], x1: 0, y1: -64, x2: 0, y2: 0 }, d: rect(x0 - 10, -64, W + 20, 70) });
  };

  defineObj({
    id: 'building.skyscraper', category: 'building', size: [340, 1700], variants: 16, seasonal: false, flippable: true, parts: ['body', 'beacon', 'lit'], weight: 0.3,
    palette: { base: {
      glass: ['#5d7d98', '#7896b0', '#a2bcd2', '#3d566e', '#cadbe8'], glassG: ['#4e7470', '#6f9690', '#a0c4bc', '#344f4c', '#c8e0d8'], glassD: ['#3c4656', '#56647a', '#8696aa', '#262e3a', '#aebaca'],
      dglass: ['#2a2e36', '#3a4048'], wglass: ['#3a4654', '#5a6a7c'], mull: ['#d4d8dc', '#7a828a'], dark: '#1c2128',
      stone: ['#d8cbb0', '#b0a184', '#ece2cc', '#7e7058'], stoneB: ['#b48c6a', '#8a6a4e', '#d0ae8a', '#5e4432'], bronze: ['#6a5034', '#a88a5a'],
      conc: ['#d2d0ca', '#a4a29c', '#ebe9e4', '#7a7872'], brickT: ['#9a5a44', '#74402e', '#c08a6e', '#4e2a1e'], clad: ['#d4704e', '#e0b450', '#5e8eae', '#6ea47e'], rail: ['#9ab8c8', '#e8eef2'],
      metal: ['#a0a8b0', '#6a727a', '#c8d0d6'], led: '#cfe8ff', flood: '#ffe6b8', red: '#ff3a2a',
    } },
    night: { glow: { window: '#f8e2ae', lamp: '#ff3a2a' }, on: .9 },
    anim: { flicker: { part: 'beacon', op: [.2, 1], period: 1.6 } },
    shadow: { rx: 170, ry: 14, h: 1400 }, reflect: true,
    tags: ['city', 'skyline', 'tower', 'skyscraper', 'office', 'generator', 'kit:towers', 'kit:urban', 'role:building-far'],
    credit: 'city kit: a seeded skyscraper generator (glass, deco, twisted, residential)',
    build(v, r) {
      const out = { body: [], beacon: [], lit: [] };
      ({ glass: towerGlass, deco: towerDeco, twist: towerTwist, resi: towerResi })[STY[v % 4]](v, r, out);
      out.body = nightMix(out.body, 'building.skyscraper', v);
      return out;
    },
  });

  /* =====================================================================
     building.terrace: a row of three Victorian terraced houses in London
     stock or red brick. Two or three storeys over a basement area, canted
     bay windows (one or two storeys), sash windows with stucco dressings,
     panelled doors with fanlights, a slate roof behind a parapet with
     party-wall chimney stacks, low front walls with railings and front
     gardens that follow the season (snow on the roof in winter).
     v0 stock brick, two-storey bays; v1 red brick, ground-floor bays;
     v2 three storeys, stock brick, no bays, painted ground floor;
     v3 red brick with gables over the bays; v4 painted (pastel) fronts;
     v5 polychrome brick (bands of red over yellow).
     ===================================================================== */
  const TERR = [
    { brick: 'stock', bay: 2, st: 2 }, { brick: 'red', bay: 1, st: 2 }, { brick: 'stock', bay: 0, st: 3, paintG: true },
    { brick: 'red', bay: 2, st: 2, gable: true }, { brick: 'paint', bay: 1, st: 2 }, { brick: 'poly', bay: 2, st: 2 },
  ];
  const sash = (out, x, y, w, h, o = {}) => {
    out.push([o.dress || '@stucco.0', rect(x - 3, y - (o.head ? 6 : 3), w + 6, h + (o.head ? 9 : 6))]);
    if (o.head) out.push([o.dress || '@stucco.0', `M${f1(x - 5)} ${f1(y - 6)}h${f1(w + 10)}l-2 -4h${f1(-w - 6)}z`]);
    out.push({ f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', `M${f1(x)} ${f1(y)}h${f1(w * .5)}l${f1(-w * .5)} ${f1(h * .5)}z`, .25]);
    out.push({ s: '@frame', w: 1.3, d: `M${f1(x)} ${f1(y + h / 2)}h${f1(w)}M${f1(x + w / 2)} ${f1(y)}v${f1(h)}` }, { s: '@frame', w: 1, op: .8, d: rect(x, y, w, h) });
    out.push(['@stucco.1', rect(x - 4, y + h, w + 8, 3)]);
  };
  defineObj({
    id: 'building.terrace-victorian', category: 'building', size: [480, 330], variants: 6, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      stock: ['#c8ae7e', '#a48a5e', '#dcc69a', '#7a6444'], red: ['#a8553c', '#843f2c', '#c4765a', '#5a2a1c'], paint: ['#e9dfcc', '#c9bea8', '#f7f0e2', '#9a8e78'], paintAlt: ['#cfe0d4', '#e8d4d8', '#e8e0b8', '#d4dce8'],
      stucco: ['#efe8da', '#cfc6b4'], slate: ['#4a5058', '#3a3f46', '#6a7078'], chimney: ['#8a5a44', '#5a3a2a'], pot: '#b0603a',
      frame: '#f4efe4', glass: ['#334050', '#bfd4e2'], door: ['#1f3a5a', '#5a1f24', '#1f4a34', '#222428', '#6a5a2a', '#3a2a4a'], fan: '#2e3846',
      iron: ['#1e2124', '#3a3e42'], step: ['#d4ccbc', '#a8a090'], area: '#5a5650', pave: ['#b4ae9e', '#8a8478'], flood: '#ffd890',
    } }, bySeason({
      leaf: { spring: ['#3f7a32', '#7aac48'], summer: ['#2e6a2c', '#4e8a38'], autumn: ['#8a6a2a', '#b8843a'], winter: ['#3e4a34', '#566048'] },
      bloom: { spring: ['#f4e050', '#f6f0f4'], summer: ['#d8506a', '#e8a0c0'], autumn: ['#c8602a', '#e0a040'], winter: ['#c02a2a', '#e8e4dc'] },
      snow: { spring: '#4a5058', summer: '#4a5058', autumn: '#4a5058', winter: '#f2f6fa' },
    })),
    night: { glow: { window: '#ffd68a' }, on: .9 },
    shadow: { rx: 250, ry: 12, h: 300 },
    tags: ['uk', 'london', 'city', 'street', 'terrace', 'victorian', 'house', 'brick', 'kit:london', 'kit:urban', 'kit:brownstone', 'role:building-mid'],
    credit: 'city kit: Victorian terraced houses, generic',
    build(v, r, ctx) {
      const T = TERR[v % 6], s = ctx.season, winter = s === 'winter', body = [], lit = [];
      const n = 3, hw = 160, x0 = -n * hw / 2, sh = 92, H = T.st * sh, top = -H - 10;
      const wall = T.brick === 'poly' ? 'stock' : T.brick;
      // party walls and the front plane
      for (let i = 0; i < n; i++) {
        const hx = x0 + i * hw, wc = T.brick === 'paint' ? `@paintAlt.${(i + v) % 4}` : `@${wall}.0`;
        body.push([wc, rect(hx, top, hw, H + 10)]);
        if (T.brick !== 'paint') body.push({ s: `@${wall}.3`, w: .7, op: .32, d: Array.from({ length: R((H + 10) / 6) }, (_, k) => `M${f1(hx)} ${f1(top + 3 + k * 6)}h${hw}`).join('') });
        if (T.brick === 'poly') body.push(['@red.0', Array.from({ length: T.st }, (_, k) => rect(hx, -sh * (k + 1) + 4, hw, 7)).join('')], ['@red.0', rect(hx, top, hw, 10)]);
        if (T.paintG) body.push(['@stucco.0', rect(hx, -sh, hw, sh)], { s: '@stucco.1', w: .8, op: .7, d: Array.from({ length: 10 }, (_, k) => `M${f1(hx)} ${f1(-sh + 8 + k * 8.5)}h${hw}`).join('') });
        body.push(['#000000', rect(hx + hw - 3, top, 3, H + 10), .12]);
        // string course and cornice
        body.push(['@stucco.0', rect(hx, -sh - 3, hw, 4)], ['@stucco.0', rect(hx - 1, top - 2, hw + 2, 6)], ['@stucco.1', rect(hx - 1, top + 3, hw + 2, 2)]);
        // the door (left of each house) with a fanlight, a portico in stucco
        const dx = hx + 14, dw = 30, dh = 66;
        body.push(['@stucco.0', rect(dx - 8, -dh - 18, dw + 16, dh + 18)], ['@stucco.1', rect(dx + dw + 4, -dh - 18, 4, dh + 18), .6], ['@stucco.0', rect(dx - 11, -dh - 22, dw + 22, 5)]);
        body.push([`@door.${(i * 2 + v) % 6}`, rect(dx, -dh, dw, dh - 6)], { s: '#000000', w: .9, op: .3, d: `${rect(dx + 4, -dh + 6, dw / 2 - 6, 20)}${rect(dx + dw / 2 + 2, -dh + 6, dw / 2 - 6, 20)}${rect(dx + 4, -dh + 32, dw / 2 - 6, 22)}${rect(dx + dw / 2 + 2, -dh + 32, dw / 2 - 6, 22)}` }, { f: '@fan', d: `M${f1(dx)} ${f1(-dh)}h${dw}v-10h${-dw}z`, glow: 'window' }, ['#d8b84a', ell(dx + dw - 5, -dh / 2 + 2, 1.4, 1.4)]);
        body.push(['@step.0', rect(dx - 4, -6, dw + 8, 3)], ['@step.1', rect(dx - 8, -3, dw + 16, 3)]);
        // the bay (right of the door): a canted bay is lit on its left cheek, shaded on its right
        const bx = hx + 60, bw = 82;
        const bayH = T.bay === 2 ? 2 * sh - 20 : T.bay === 1 ? sh - 14 : 0;
        if (bayH) {
          const bt = -bayH - 8;
          body.push([`@${T.brick === 'paint' ? 'stucco' : 'stucco'}.0`, rect(bx, bt, bw, -bt)], ['@stucco.1', rect(bx + bw - 12, bt, 12, -bt), .8], ['#ffffff', rect(bx, bt, 12, -bt), .25]);
          for (let k = 0; k < T.bay; k++) {
            const wy = -sh * (k + 1) + 20, wh = sh - 40;
            sash(body, bx + 3, wy, 7, wh, { dress: '@stucco.0' }); sash(body, bx + 17, wy, 48, wh, { dress: '@stucco.0' }); sash(body, bx + 72, wy, 7, wh, { dress: '@stucco.0' });
          }
          body.push(['@slate.0', `M${f1(bx - 4)} ${f1(bt)}h${f1(bw + 8)}l-8 -12h${f1(-bw + 8)}z`], ['@snow', `M${f1(bx + 2)} ${f1(bt - 12)}h${f1(bw - 4)}l1 3h${f1(-bw + 2)}z`]);
          if (T.gable) body.push([`@${wall}.0`, `M${f1(bx - 2)} ${f1(bt - 2)}L${f1(bx + bw / 2)} ${f1(bt - 46)}L${f1(bx + bw + 2)} ${f1(bt - 2)}z`], { s: '@stucco.0', w: 3, d: `M${f1(bx - 4)} ${f1(bt)}L${f1(bx + bw / 2)} ${f1(bt - 48)}L${f1(bx + bw + 4)} ${f1(bt)}` }, { f: '@glass.0', d: ell(bx + bw / 2, bt - 18, 7, 7), glow: 'window' });
        }
        // upper windows: tall sashes with stucco heads, smaller up the house
        for (let k = (T.bay === 2 ? 2 : T.bay === 1 ? 1 : 0); k < T.st; k++) { const wy = -sh * (k + 1) + 18 + k * 4, wh = sh - 40 - k * 6; sash(body, bx + 18, wy, 44, wh, { head: true }); }
        for (let k = 1; k < T.st; k++) { const wy = -sh * (k + 1) + 20 + k * 4, wh = sh - 44 - k * 6; sash(body, dx + 2, wy, 26, wh, { head: true }); }
        // the front: a low wall with railings, a little garden (shrubs and flowers by season)
        body.push(['@' + (T.brick === 'paint' ? 'stucco' : wall) + '.1', rect(hx + 50, -16, hw - 50, 16)], ['@stucco.0', rect(hx + 50, -18, hw - 50, 3)], { s: '@iron.0', w: 1.4, d: Array.from({ length: 14 }, (_, k) => `M${f1(hx + 54 + k * 7.5)} -18v-14`).join('') + `M${f1(hx + 52)} -28h${hw - 54}` });
        let lf = ['', ''], bl = ['', ''];
        for (let k = 0; k < 7; k++) { const gx = hx + 56 + k * 14 + rr(r, -3, 3), gh = winter ? rr(r, 8, 12) : rr(r, 12, 20); lf[k % 2] += sceneD.ell(gx, -18 - gh * .4, rr(r, 6, 9), gh * .5); if (!winter || k % 3 === 0) bl[k % 2] += sceneD.circ(gx + rr(r, -4, 4), -18 - gh * rr(r, .5, .9), 1.8); }
        body.push(['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@bloom.0', bl[0]], ['@bloom.1', bl[1]]);
        // night: a soft glow on the step under the fanlight
        lit.push({ f: { rad: [[0, '@flood', .35], [1, '@flood', 0]], cx: dx + dw / 2, cy: -10, r: 34 }, d: ell(dx + dw / 2, -10, 34, 34), m: [1, 0, 0, .4, 0, -6] });
      }
      // the roof: slate pitch seen over the parapet, chimney stacks on the party walls, snow in winter
      const rt = top - 4;
      body.unshift(['@slate.0', `M${f1(x0)} ${f1(rt + 4)}L${f1(x0 + 16)} ${f1(rt - 34)}H${f1(-x0 - 16)}L${f1(-x0)} ${f1(rt + 4)}z`], ['@slate.2', `M${f1(x0 + 16)} ${f1(rt - 34)}H${f1(-x0 - 16)}v3H${f1(x0 + 16)}z`], ['@snow', `M${f1(x0 + 6)} ${f1(rt - 14)}L${f1(x0 + 16)} ${f1(rt - 34)}H${f1(-x0 - 16)}L${f1(-x0 - 6)} ${f1(rt - 14)}z`, winter ? .95 : 0]);
      for (let i = 0; i <= n; i++) {
        const cx = x0 + i * hw;
        if (i === 0 || i === n) continue;
        body.splice(3, 0, ['@chimney.0', rect(cx - 18, rt - 64, 36, 62)], ['@chimney.1', rect(cx + 6, rt - 64, 12, 62), .6], ['@stucco.1', rect(cx - 20, rt - 66, 40, 5)], ['@pot', Array.from({ length: 4 }, (_, k) => rect(cx - 15 + k * 8, rt - 76, 5, 10)).join('')]);
      }
      // the pavement edge
      body.push(['@pave.0', rect(x0 - 6, -2, n * hw + 12, 4)], ['@pave.1', rect(x0 - 6, 1, n * hw + 12, 1.5)]);
      return { body: nightMix(body, 'building.terrace-victorian', v, .4), lit };
    },
  });

  /* =====================================================================
     building.townhouse: a row of three tall stucco or brick townhouses
     (Georgian and Regency squares, Italianate villas, gabled red brick):
     four storeys over a basement area with railings, a columned porch, a
     first-floor balcony in black iron, tall sashes that shorten up the house,
     a cornice and a parapet. v0 white stucco, v1 brick over a rusticated
     stucco ground floor, v2 pastel painted fronts, v3 red brick with
     shaped gables. Window boxes and porch planters follow the season.
     ===================================================================== */
  defineObj({
    id: 'building.townhouse', category: 'building', size: [420, 470], variants: 4, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      stucco: ['#f2ede2', '#d2cbbb', '#ffffff', '#a8a08e'], brick: ['#a8774e', '#866040', '#c4966a', '#5a4028'], red: ['#a44a32', '#823624', '#c06a4e', '#5a2418'],
      pastel: ['#f2d4d0', '#d4e4d4', '#f2e2b0', '#cfdcea'], pastelD: ['#d2b0ac', '#b0c4b0', '#d2c08c', '#aabcd0'],
      frame: '#f7f3ea', glass: ['#2e3a4a', '#b8cede'], iron: ['#1c1f22', '#3a3e42'], door: ['#1e2226', '#1f3a5a', '#5a1f24', '#1f4a34'], fan: '#2c3646',
      slate: ['#4c525a', '#383d44'], chimney: ['#c8c0b0', '#9a9284'], pot: '#b0603a', step: ['#dcd6c8', '#aaa494'], flood: '#ffdc98',
    } }, bySeason({
      leaf: { spring: ['#3f7a32', '#7aac48'], summer: ['#2e6a2c', '#4e8a38'], autumn: ['#7a6a2a', '#a8803a'], winter: ['#2a4a34', '#3e5a44'] },
      bloom: { spring: ['#f4e050', '#f6f0f4'], summer: ['#d8506a', '#f0a0c0'], autumn: ['#c8602a', '#e0a040'], winter: ['#b02a2a', '#e8e4dc'] },
      snow: { spring: '#4c525a', summer: '#4c525a', autumn: '#4c525a', winter: '#f2f6fa' },
    })),
    night: { glow: { window: '#ffdc94' }, on: .9 },
    shadow: { rx: 220, ry: 12, h: 440 },
    tags: ['uk', 'london', 'city', 'street', 'square', 'townhouse', 'georgian', 'regency', 'stucco', 'house', 'kit:london', 'kit:urban', 'kit:brownstone', 'role:building-mid'],
    credit: 'city kit: Georgian / Regency / Victorian townhouse row, generic',
    build(v, r, ctx) {
      const s = ctx.season, winter = s === 'winter', body = [], lit = [];
      const n = 3, hw = 136, x0 = -n * hw / 2, flo = [96, 112, 88, 74, 60], H = flo.reduce((a, b) => a + b, 0) - 30, top = -H;
      for (let i = 0; i < n; i++) {
        const hx = x0 + i * hw;
        const up = v === 0 ? '@stucco.0' : v === 1 ? '@brick.0' : v === 2 ? `@pastel.${(i + 1) % 4}` : '@red.0';
        const upD = v === 0 ? '@stucco.1' : v === 1 ? '@brick.1' : v === 2 ? `@pastelD.${(i + 1) % 4}` : '@red.1';
        const gr = v === 3 ? '@red.0' : v === 2 ? up : '@stucco.0';
        body.push([up, rect(hx, top, hw, H)], [upD, rect(hx + hw - 4, top, 4, H), .7]);
        if (v === 1 || v === 3) body.push({ s: v === 1 ? '@brick.3' : '@red.3', w: .7, op: .3, d: Array.from({ length: R(H / 6) }, (_, k) => `M${f1(hx)} ${f1(top + 3 + k * 6)}h${hw}`).join('') });
        // the ground floor: rusticated stucco (lines), the porch with two columns
        const g0 = -flo[0] + 6;
        body.push([gr, rect(hx, g0, hw, -g0)], { s: v === 3 ? '@red.3' : '@stucco.1', w: .9, op: .6, d: Array.from({ length: 9 }, (_, k) => `M${f1(hx)} ${f1(g0 + 9 + k * 10)}h${hw}`).join('') });
        const dx = hx + 16, dw = 32, dh = 74;
        body.push(['@stucco.0', rect(dx - 14, -dh - 26, dw + 28, 8)], ['@stucco.1', rect(dx - 14, -dh - 19, dw + 28, 3)], ['@stucco.2', rect(dx - 12, -dh - 18, 7, dh + 12)], ['@stucco.2', rect(dx + dw + 5, -dh - 18, 7, dh + 12)], ['@stucco.1', rect(dx + dw + 9, -dh - 18, 3, dh + 12), .7]);
        body.push([`@door.${(i + v) % 4}`, rect(dx, -dh, dw, dh - 8)], { s: '#000000', w: .9, op: .3, d: `${rect(dx + 4, -dh + 6, 10, 26)}${rect(dx + 18, -dh + 6, 10, 26)}${rect(dx + 4, -dh + 38, 10, 24)}${rect(dx + 18, -dh + 38, 10, 24)}` }, { f: '@fan', d: `M${f1(dx)} ${f1(-dh)}a${dw / 2} 13 0 0 1 ${dw} 0z`, glow: 'window' }, { s: '@frame', w: 1, d: `M${f1(dx + dw / 2)} ${f1(-dh)}v-12M${f1(dx + 4)} ${f1(-dh - 4)}l${f1(dw / 2 - 4)} -8l${f1(dw / 2 - 4)} 8` });
        body.push(['@step.0', rect(dx - 8, -8, dw + 16, 4)], ['@step.1', rect(dx - 12, -4, dw + 24, 4)]);
        // ground floor windows (two tall sashes)
        sash(body, hx + 66, -flo[0] + 22, 26, 58, { dress: v === 3 ? '@stucco.0' : '@stucco.2' }); sash(body, hx + 100, -flo[0] + 22, 26, 58, { dress: v === 3 ? '@stucco.0' : '@stucco.2' });
        // the piano nobile: floor-length windows onto a continuous iron balcony
        let y = -flo[0];
        const fy = y - flo[1];
        for (let k = 0; k < 3; k++) sash(body, hx + 14 + k * 40, fy + 12, 28, flo[1] - 20, { head: true, dress: v === 1 || v === 3 ? '@stucco.0' : '@stucco.2' });
        body.push(['@stucco.1', rect(hx - 1, y - 6, hw + 2, 6)], { s: '@iron.0', w: 1.2, d: Array.from({ length: 20 }, (_, k) => `M${f1(hx + 3 + k * 6.6)} ${f1(y - 6)}v-18`).join('') + `M${f1(hx + 1)} ${f1(y - 24)}h${hw - 2}M${f1(hx + 1)} ${f1(y - 14)}h${hw - 2}` });
        // window boxes on the balcony by season
        let lf = ['', ''], bl = ['', ''];
        for (let k = 0; k < 6; k++) { const gx = hx + 10 + k * 22 + rr(r, -3, 3); lf[k % 2] += sceneD.ell(gx, y - 10, rr(r, 7, 10), winter ? 4 : 6); if (!winter || k % 2) bl[k % 2] += sceneD.circ(gx + rr(r, -4, 4), y - 13, 2); }
        body.push(['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@bloom.0', bl[0]], ['@bloom.1', bl[1]]);
        y = fy;
        // upper floors: the sashes shorten
        for (let f = 2; f < flo.length; f++) {
          const yy = y - flo[f];
          if (f < flo.length - 1 || v !== 3) for (let k = 0; k < 3; k++) sash(body, hx + 16 + k * 40, yy + 12, 24, flo[f] - 24, { head: f === 2, dress: v === 1 || v === 3 ? '@stucco.0' : '@stucco.2' });
          y = yy;
        }
        // the cornice and parapet (or a shaped gable)
        if (v === 3) {
          const gy = top + 30;
          body.push(['@red.0', `M${f1(hx + 8)} ${f1(gy)}V${f1(gy - 40)}h18l10-14q32-26 64 0l10 14h18V${f1(gy)}z`], { s: '@stucco.0', w: 3, d: `M${f1(hx + 8)} ${f1(gy - 40)}h18l10-14q32-26 64 0l10 14h18` }, { f: '@glass.0', d: rect(hx + hw / 2 - 12, gy - 40, 24, 30), glow: 'window' }, { s: '@frame', w: 1.2, d: `M${f1(hx + hw / 2)} ${f1(gy - 40)}v30` + rect(hx + hw / 2 - 12, gy - 40, 24, 30) });
        } else body.push(['@stucco.2', rect(hx - 2, top - 4, hw + 4, 10)], ['@stucco.1', rect(hx - 2, top + 6, hw + 4, 3)], [up, rect(hx, top - 22, hw, 18)], ['@stucco.1', rect(hx - 1, top - 24, hw + 2, 3)]);
        // the basement area: railings at the pavement edge on a stone plinth
        body.push(['@step.1', rect(hx + 56, -6, hw - 56, 6)], { s: '@iron.0', w: 1.6, d: Array.from({ length: 12 }, (_, k) => `M${f1(hx + 60 + k * 6.4)} -6v-26`).join('') + `M${f1(hx + 58)} -30h${hw - 60}` }, ['@iron.0', Array.from({ length: 12 }, (_, k) => `M${f1(hx + 58.6 + k * 6.4)} -32l1.4-3.4 1.4 3.4z`).join('')]);
        // a porch lantern
        body.push(['@iron.0', rect(dx + dw / 2 - 3, -dh - 44, 6, 12)], { f: '#e8e0c8', d: rect(dx + dw / 2 - 2, -dh - 42, 4, 8), glow: 'window' });
        lit.push({ f: { rad: [[0, '@flood', .4], [1, '@flood', 0]], cx: dx + dw / 2, cy: -dh - 38, r: 40 }, d: ell(dx + dw / 2, -dh - 38, 40, 40) });
      }
      // chimneys on the party walls, the roof behind the parapet
      for (let i = 1; i < n; i++) { const cx = x0 + i * hw; body.unshift(['@chimney.0', rect(cx - 16, top - 70, 32, 50)], ['@chimney.1', rect(cx + 6, top - 70, 10, 50), .6], ['@pot', Array.from({ length: 4 }, (_, k) => rect(cx - 13 + k * 7, top - 80, 4.4, 10)).join('')], ['@snow', rect(cx - 17, top - 72, 34, 3), winter ? .95 : 0]); }
      body.unshift(['@slate.0', `M${f1(x0 + 4)} ${f1(top - 18)}L${f1(x0 + 26)} ${f1(top - 46)}H${f1(-x0 - 26)}L${f1(-x0 - 4)} ${f1(top - 18)}z`], ['@snow', `M${f1(x0 + 18)} ${f1(top - 36)}L${f1(x0 + 26)} ${f1(top - 46)}H${f1(-x0 - 26)}L${f1(-x0 - 18)} ${f1(top - 36)}z`, winter ? .95 : 0]);
      return { body: nightMix(body, 'building.townhouse', v, .4), lit };
    },
  });

  /* =====================================================================
     building.shopfront: a high-street building, three storeys of brick or
     render over a shop. The shop has pilasters with consoles, a plain fascia
     band (NO lettering), a stallriser and a big display window full of
     generic goods; a striped canvas awning, pulled out in spring and summer,
     rolled up in autumn and winter. The window glows at night and spills
     light on the pavement.
     v0 greengrocer (crates of seasonal produce), v1 cafe (tables outside in
     summer), v2 bakery (shelves of loaves), v3 florist (buckets of seasonal
     flowers), v4 bookshop / general store (stacked shelves), v5 corner shop
     in green glazed tiles with a corner door.
     ===================================================================== */
  defineObj({
    id: 'building.shopfront', category: 'building', size: [200, 360], variants: 6, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      brick: ['#b0603e', '#8a4a30', '#c8805e', '#5a2e1e'], stock: ['#c6aa7a', '#a0865a', '#dac496', '#7a6444'], render: ['#ece4d6', '#cbc2b0', '#faf6ee', '#9a917e'],
      stucco: ['#efe9dc', '#c8c0ae'], fascia: ['#1f3a5a', '#5a1f2a', '#24503c', '#2a2a30', '#6a4a1e', '#3a5a5a'], trim: ['#efe9dc', '#c8c0ae'], tile: ['#2e5a46', '#1e4434', '#4a7a62'],
      stripe: ['#2e6a4a', '#b02e2e', '#2a4a7a', '#c8a030', '#5a3a5a', '#2e5a5a'], canvas: '#f2ece0',
      glass: ['#2e3a46', '#9fb8c8', '#42505c'], frame: '#f4efe4', door: ['#2a2e34', '#3a2a24'],
      crate: ['#a8824e', '#7a5a34'], shelf: ['#6a4e34', '#4a3424'], loaf: ['#c88a4a', '#a0682e', '#e0b070'], book: ['#a83a2e', '#2e5a8a', '#d8b040', '#3a7a4a', '#e8e0d0', '#6a3a6a'],
      table: ['#2a2e30', '#e8e4dc'], chair: '#3a3e42', pave: ['#b4ae9e', '#8a8478'], pot: ['#8a8e90', '#b8bcbe'], spill: '#ffe2a8',
    } }, bySeason({
      fruit: { spring: ['#6ab040', '#e8d040', '#d84a3a', '#f0a030'], summer: ['#d83a3a', '#f0c030', '#7ab040', '#e8783a'], autumn: ['#c84a2a', '#e0a030', '#8a3a5a', '#b0a040'], winter: ['#e8742a', '#f0c84a', '#5a8a3a', '#c83a3a'] },
      flower: { spring: ['#f4e050', '#f6f0f4', '#e86a9a', '#8a6ad0'], summer: ['#e83a5a', '#f0a0c0', '#f0d040', '#6a9ae0'], autumn: ['#d8602a', '#c8302a', '#e0a040', '#8a3a5a'], winter: ['#c02a2a', '#f4f0e8', '#2e6a3a', '#d8b84a'] },
      leaf: { spring: ['#4a8a3a', '#7aac48'], summer: ['#2e6a2c', '#4e8a38'], autumn: ['#6a7a2a', '#8a8a3a'], winter: ['#2a5a34', '#3e6a44'] },
    })),
    night: { glow: { window: '#ffdc98' }, on: .75 },
    shadow: { rx: 104, ry: 10, h: 340 },
    tags: ['uk', 'london', 'city', 'street', 'high-street', 'shop', 'shopfront', 'awning', 'kit:urban', 'kit:london', 'role:building-near'],
    credit: 'city kit: high-street shopfronts, generic, no lettering',
    build(v, r, ctx) {
      const s = ctx.season, warm = s === 'spring' || s === 'summer', body = [], lit = [];
      // per variant: width, storey and fascia heights, door side, roofline
      const W = [180, 164, 192, 172, 186, 180][v], x0 = -W / 2, gH = 128, uH = [82, 86, 80, 84, 88, 78][v], nU = v === 5 ? 3 : 2, top = -gH - nU * uH - 18;
      const wall = ['brick', 'stock', 'render', 'brick', 'stock', 'brick'][v], fas = `@fascia.${v}`, str = `@stripe.${v}`;
      // the upper floors: wall, sashes, a cornice and parapet; chimney
      body.push([`@${wall}.0`, rect(x0, top, W, -top - gH)], [`@${wall}.1`, rect(x0 + W - 6, top, 6, -top - gH), .7]);
      if (wall !== 'render') body.push({ s: `@${wall}.3`, w: .7, op: .3, d: Array.from({ length: R((-top - gH) / 6) }, (_, k) => `M${x0} ${f1(top + 3 + k * 6)}h${W}`).join('') });
      for (let f = 0; f < nU; f++) { const yy = -gH - (f + 1) * uH; for (let k = 0; k < 3; k++) sash(body, x0 + 22 + k * (W - 76) / 2, yy + 16, 32, uH - 30 - f * 4, { head: f === 0, dress: '@trim.0' }); }
      body.push(['@trim.0', rect(x0 - 3, top - 2, W + 6, 8)], ['@trim.1', rect(x0 - 3, top + 6, W + 6, 2)], [`@${wall}.0`, rect(x0, top - 16, W, 14)], ['@trim.0', rect(x0 - 1, top - 18, W + 2, 3)]);
      const rf = [0, 1, 2, 3, 1, 0][v], pw = W * .3, cx = v % 2 ? x0 + 12 : x0 + W - 40;   // roofline: flat, pediment, raised centre, curved gable
      if (rf === 1) body.push(['@trim.0', `M${f1(-pw - 6)} ${top - 17}L0 ${top - 46}L${f1(pw + 6)} ${top - 17}z`], [`@${wall}.0`, `M${f1(-pw + 6)} ${top - 19}L0 ${top - 39}L${f1(pw - 6)} ${top - 19}z`]);
      if (rf === 2) body.push([`@${wall}.0`, rect(-pw, top - 34, pw * 2, 18)], ['@trim.0', rect(-pw - 2, top - 36, pw * 2 + 4, 3)]);
      if (rf === 3) { const g = `M${f1(-pw)} ${top - 17}q0 -12 ${f1(pw * .25)} -14q${f1(pw * .15)} -20 ${f1(pw * .75)} -22q${f1(pw * .6)} 2 ${f1(pw * .75)} 22q${f1(pw * .25)} 2 ${f1(pw * .25)} 14z`; body.push([`@${wall}.0`, g], { s: '@trim.0', w: 2.4, d: g }); }
      body.unshift([`@${wall}.1`, rect(cx, top - 46, 28, 32)], ['@brick.3', rect(cx - 2, top - 48, 32, 4)]);
      // the shop: pilasters, consoles, the fascia band, the cornice over it
      const fy = -gH, fh = [22, 30, 18, 26, 20, 24][v];
      body.push(v === 5 ? ['@tile.0', rect(x0, fy, W, gH)] : ['@trim.0', rect(x0, fy, W, gH)]);
      body.push([fas, rect(x0 + 10, fy + 4, W - 20, fh)], ['#ffffff', rect(x0 + 10, fy + 4, W - 20, 3), .18], ['@trim.0', rect(x0 - 4, fy - 4, W + 8, 7)], ['@trim.1', rect(x0 - 4, fy + 2, W + 8, 2)]);
      for (const px of [x0, x0 + W - 12]) body.push([v === 5 ? '@tile.2' : '@trim.0', rect(px, fy, 12, gH)], [v === 5 ? '@tile.1' : '@trim.1', rect(px + 8, fy, 4, gH), .8], ['@trim.0', `M${f1(px - 2)} ${f1(fy + 4)}h16v${fh}q-8 6-16 0z`], ['@trim.1', rect(px - 2, -10, 16, 10)]);
      if (v === 5) body.push({ s: '@tile.1', w: .8, op: .6, d: Array.from({ length: 12 }, (_, k) => `M${x0} ${f1(fy + 10 * k)}h${W}`).join('') });
      // the display window and the door
      const sx = x0 + 14, wy = fy + fh + 10, ww = W - 28, wh = gH - fh - 36, dw = 34, dl = v === 2 || v === 4;   // dl: the door on the left
      const dx = dl ? sx + 4 : v === 5 ? sx + ww - dw : sx + ww - dw - 4, wx = dl ? dx + dw + 6 : sx, winW = dl ? sx + ww - wx : dx - wx - 6;
      body.push(['@trim.1', rect(wx, -24, winW, 24)], [v === 5 ? '@tile.1' : `@${wall}.1`, rect(wx + 2, -22, winW - 4, 20)]);   // the stallriser
      body.push({ f: '@glass.0', d: rect(wx, wy, winW, wh - 2), glow: 'window' }, { f: '@glass.2', d: rect(wx, wy, winW, wh * .3), glow: 'window' }, ['@glass.1', `M${f1(wx)} ${f1(wy)}h${f1(winW * .3)}l${f1(-winW * .3)} ${f1(wh * .6)}z`, .2]);
      // goods in the window (drawn over the glass; they read against the lit window at night)
      const gy = wy + wh - 2, goods = [];
      if (v === 0) for (let k = 0; k < 4; k++) { const cx = wx + 6 + k * (winW - 12) / 4; goods.push(['@crate.0', rect(cx, gy - 16, (winW - 12) / 4 - 4, 16)], ['@crate.1', rect(cx, gy - 10, (winW - 12) / 4 - 4, 2)]); let fr = ''; for (let j = 0; j < 7; j++) fr += sceneD.circ(cx + 4 + j * 4.6, gy - 17 - (j % 2) * 3, 3); goods.push([`@fruit.${k}`, fr]); }
      if (v === 1) goods.push(['@table.1', rect(wx + 8, gy - 30, winW - 16, 3)], ['@table.0', rect(wx + 14, gy - 27, 3, 27)], ['@table.0', rect(wx + winW - 17, gy - 27, 3, 27)], ['@shelf.0', rect(wx + 6, wy + 10, winW - 12, 3)], ['@pot.1', Array.from({ length: 6 }, (_, j) => rect(wx + 12 + j * 12, wy + 2, 6, 8)).join('')]);
      if (v === 2) for (let j = 0; j < 3; j++) { const sy = wy + 14 + j * 18; goods.push(['@shelf.0', rect(wx + 4, sy, winW - 8, 3)]); let lo = ''; for (let k = 0; k < 7; k++) lo += sceneD.ell(wx + 12 + k * (winW - 20) / 7, sy - 4, 6, 4); goods.push([`@loaf.${j}`, lo]); }
      if (v === 3) for (let k = 0; k < 5; k++) { const cx = wx + 10 + k * (winW - 20) / 4; goods.push(['@pot.0', `M${f1(cx - 6)} ${f1(gy)}l-1-14h14l-1 14z`]); let st = '', fl = ''; for (let j = 0; j < 5; j++) { const fx = cx + rr(r, -8, 8), fyy = gy - rr(r, 22, 34); st += `M${f1(cx)} ${f1(gy - 12)}L${f1(fx)} ${f1(fyy)}`; fl += sceneD.circ(fx, fyy, rr(r, 2.6, 3.6)); } goods.push({ s: '@leaf.0', w: 1, d: st }, [`@flower.${k % 4}`, fl]); }
      if (v === 4 || v === 5) for (let j = 0; j < 3; j++) { const sy = wy + 16 + j * 17; goods.push(['@shelf.1', rect(wx + 4, sy, winW - 8, 2.4)]); for (let k = 0; k < 14; k++) { const bh = rr(r, 8, 13); goods.push([`@book.${(k + j * 3) % 6}`, rect(wx + 6 + k * (winW - 12) / 14, sy - bh, (winW - 12) / 14 - 1, bh)]); } }
      body.push(...goods);
      body.push({ s: '@frame', w: 2, d: rect(wx, wy, winW, wh - 2) + `M${f1(wx + winW / 2)} ${f1(wy)}v${f1(wh - 2)}M${f1(wx)} ${f1(wy + wh * .3)}h${f1(winW)}` });
      body.push(['@trim.1', rect(dx - 2, wy - 2, dw + 4, -wy + 2)], [`@door.${v % 2}`, rect(dx, wy, dw, -wy)], { f: '@glass.0', d: rect(dx + 5, wy + 4, dw - 10, -wy * .55), glow: 'window' }, ['#d8b84a', ell(dx + dw - 6, wy * .45, 1.4, 1.4)], ['@trim.1', rect(dx - 4, -3, dw + 8, 3)]);
      // the awning: out (a sloping striped canvas with a scalloped valance) in spring and summer, rolled in a box otherwise
      const ax0 = x0 + 6, aw = W - 12, ay = fy + fh + 6;
      if (warm) {
        const drop = 30, ex = 7, ns = 10, sw0 = aw / ns, sw1 = (aw + 2 * ex) / ns;
        let st = '';
        for (let k = 0; k < ns; k += 2) st += `M${f1(ax0 + k * sw0)} ${f1(ay)}h${f1(sw0)}L${f1(ax0 - ex + (k + 1) * sw1)} ${f1(ay + drop)}h${f1(-sw1)}z`;
        body.push(['@canvas', `M${f1(ax0)} ${f1(ay)}h${f1(aw)}l${ex} ${drop}H${f1(ax0 - ex)}z`], [str, st], ['#000000', `M${f1(ax0 - ex * .8)} ${f1(ay + drop - 6)}h${f1(aw + ex * 1.6)}l${f1(ex * .2)} 6H${f1(ax0 - ex)}z`, .14]);
        const tw = aw + 2 * ex, sw = tw / 12;
        let val = `M${f1(ax0 - ex)} ${f1(ay + drop)}h${f1(tw)}v4`; for (let k = 0; k < 12; k++) val += `q${f1(-sw / 2)} 8 ${f1(-sw)} 0`;
        body.push([str, val + 'z'], ['@canvas', `M${f1(ax0 - ex)} ${f1(ay + drop)}h${f1(tw)}v1.4h${f1(-tw)}z`, .6]);
      } else body.push([str, rect(ax0, ay - 4, aw, 7)], ['@trim.1', rect(ax0, ay + 2, aw, 2)]);
      // outside: cafe tables in summer, crates of produce on a stand, flower buckets
      // bistro chairs: solid silhouettes, never strokes
      const chair = (c, k) => `M${f1(c - 5 * k)} -13q0 -10 ${f1(5 * k)} -10q${f1(5 * k)} 0 ${f1(5 * k)} 10v1h${f1(2 * k)}l${f1(1.5 * k)} 2l${f1(-2 * k)} 1l${f1(1.5 * k)} 9h${f1(-2.6 * k)}l${f1(-1.6 * k)} -8h${f1(-6 * k)}l${f1(-1.6 * k)} 8h${f1(-2.6 * k)}l${f1(1.4 * k)} -9l${f1(-1.6 * k)} -1l${f1(1.6 * k)} -2z`;
      if (v === 1 && warm) for (const tx of [x0 - 6, x0 + 62]) body.push(['@chair', chair(tx + 2, 1) + chair(tx + 20, -1)], ['@table.0', rect(tx + 10, -22, 2.4, 22) + ell(tx + 11, -1, 6, 1.6)], ['@table.1', ell(tx + 11, -23, 12, 2.4)]);
      if (v === 0) { body.push(['@crate.1', rect(x0 + 18, -26, 70, 4)], { s: '@crate.1', w: 2, d: `M${f1(x0 + 22)} -22v22M${f1(x0 + 84)} -22v22` }); for (let k = 0; k < 3; k++) { body.push(['@crate.0', rect(x0 + 20 + k * 22, -40, 20, 14)]); let fr = ''; for (let j = 0; j < 4; j++) fr += sceneD.circ(x0 + 24 + k * 22 + j * 4.4, -41 - (j % 2) * 2.4, 2.8); body.push([`@fruit.${(k + 1) % 4}`, fr]); } }
      if (v === 3) for (let k = 0; k < 4; k++) { const cx = x0 + 26 + k * 18; body.push(['@pot.0', `M${f1(cx - 6)} 0l-1-16h14l-1 16z`]); let fl = ''; for (let j = 0; j < 4; j++) fl += sceneD.circ(cx + rr(r, -7, 7), -18 - rr(r, 4, 14), 3); body.push(['@leaf.1', sceneD.ell(cx, -20, 8, 5)], [`@flower.${(k + 1) % 4}`, fl]); }
      body.push(['@pave.0', rect(x0 - 6, -2, W + 12, 4)]);
      // soft light: a glow on the window, a pool on the pavement (a circle squashed by m)
      const gx = wx + winW / 2, gy2 = wy + wh / 2, gr = winW * .8;
      lit.push({ f: { rad: [[0, '@spill', .32], [.4, '@spill', .12], [1, '@spill', 0]], cx: f1(gx), cy: f1(gy2), r: f1(gr) }, d: ell(gx, gy2, gr, gr) }, { f: { rad: [[0, '@spill', .45], [1, '@spill', 0]], cx: f1(gx), cy: 0, r: 110 }, d: ell(gx, 0, 110, 110), m: [1, 0, 0, .15, 0, 0] });
      return { body, lit };
    },
  });
})();
