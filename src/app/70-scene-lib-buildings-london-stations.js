/* ============================================================
   SCENE LIBRARY: buildings, the London station kit (docs/dev/SCENE_ENGINE.md,
   section 2; signage and the legal note, sections 8.3 and 8.4).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   London station ARCHETYPES by period, front elevations lit from the LEFT,
   at about 10 units per metre (the scale of rail.train and the village
   buildings). Anchor: the pavement at the middle of the front wall.

   NO marks: no roundel (no ring with a bar, not even as a finial or a
   clock), no logotype, no line diagram, no lettering. Each station carries a
   BLANK fascia band where the engine's sign primitive (style 'fascia' or
   'board') can put the name from data; its centre is noted per object.

   Seasons (shapeBySeason): planters, hanging baskets and the buddleia that
   grows from London railway brickwork change with the season; snow lies on
   the ledges in winter; autumn leaves gather at the foot. Windows light at
   real dusk (glow 'window', lamps 'lamp'); the 'lit' part holds the
   floodlight washes and the light spilling onto the pavement.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  /** A round-headed opening: left x, bottom yb, width w, total height h. */
  const archD = (x, yb, w, h) => { const r = w / 2, ys = yb - h + r; return `M${f1(x)} ${f1(yb)}V${f1(ys)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(ys)}V${f1(yb)}z`; };
  /** A pointed (gothic) opening. */
  const gothD = (x, yb, w, h) => { const ys = yb - h + w * .8; return `M${f1(x)} ${f1(yb)}V${f1(ys)}Q${f1(x)} ${f1(ys - w * .55)} ${f1(x + w / 2)} ${f1(yb - h)}Q${f1(x + w)} ${f1(ys - w * .55)} ${f1(x + w)} ${f1(ys)}V${f1(yb)}z`; };
  /** A leafy clump (after the kit's K.lobed): a ragged ellipse of small scallops; local so the file needs nothing beyond the core. */
  const lobed = (r, cx, cy, rx, ry, n, rag = .3) => {
    const ph = r() * 6.3, pts = [];
    for (let i = 0; i < n; i++) { const a = (i + rr(r, -.25, .25)) / n * Math.PI * 2, k = 1 + rag * .6 * Math.sin(3 * a + ph) + rr(r, -.08, .08), s = Math.sin(a); pts.push([cx + Math.cos(a) * rx * k, cy + (s > 0 ? s * .65 : s) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, f1(Math.hypot(p[0] - q[0], p[1] - q[1]) * .62)); d += `A${lr} ${lr} 0 0 1 ${f1(p[0])} ${f1(p[1])}`; }
    return d + 'z';
  };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const GREEN = {
    leaf: { spring: ['#4f8a3a', '#7ab04a', '#a6cc6a'], summer: ['#2f6a2c', '#4f8a38', '#78a84a'], autumn: ['#8a6a2a', '#b8823a', '#d8a050'], winter: ['#3e4a38', '#56604a', '#6a7058'] },
    bloom: { spring: ['#f4d23a', '#f8f4ec', '#e8a8c8'], summer: ['#d8405a', '#f4a0c0', '#f8f0f4'], autumn: ['#d8782a', '#c04a2a', '#e8b040'], winter: ['#6a5a4a', '#7a6a5a', '#5a4a3a'] },
    spike: { spring: ['#6a8a4a', '#88a860'], summer: ['#8a4ab0', '#b07ad0'], autumn: ['#7a5a3a', '#94744a'], winter: ['#5a4a3a', '#6a5a48'] },
  };
  /** Palette: base slots + the seasonal greenery, merged per season. */
  const pal = (base) => Object.assign({ base: Object.assign({ snow: ['#f4f6f8', '#d8e0e8'], tub: ['#3a3e44', '#5a4a3a', '#d8d2c4'], flood: '#ffe6b0', spill: '#ffd890', twig: '#5a4a3a' }, base) }, bySeason(GREEN));
  const glass = (x, y, w, h, op) => [{ f: '@glass.0', d: rect(x, y, w, h), glow: 'window', op: op == null ? 1 : op }, ['@glass.1', `M${f1(x)} ${f1(y)}h${f1(w * .5)}l${f1(-w * .5)} ${f1(Math.min(h, w * 1.4))}z`, .28]];
  const courses = (x, y, w, h, slot, step = 3.2) => { let d = ''; for (let yy = y + step; yy < y + h - .5; yy += step) d += `M${f1(x)} ${f1(yy)}h${f1(w)}`; return { s: slot, w: .55, op: .32, d, detail: true }; };
  const wash = (cx, cy, rx, ry, op, slot = '@flood') => ({ f: { rad: [[0, slot, op], [.5, slot, op * .45], [1, slot, 0]], cx, cy, r: Math.max(rx, ry) }, d: ell(cx, cy, rx, ry) });
  /** Seasonal dressing: planters [x, w], hanging baskets [x, y], buddleia [x, y, s], snow ledges [x, y, w], autumn leaves [x0, x1]. */
  const dress = (out, ctx, r, o) => {
    const s = ctx.season, winter = s === 'winter';
    for (const [x, w] of o.planters || []) {
      out.push(['@tub.0', rect(x - w / 2, -11, w, 11)], ['@tub.2', rect(x - w / 2 - 1, -12, w + 2, 2)], ['#000000', rect(x + w * .2, -11, w * .3, 11), .18]);
      out.push(['@leaf.0', lobed(r, x, -16, w * .52, 8, 9, .35)], ['@leaf.1', lobed(r, x - w * .12, -19, w * .3, 5, 7, .3)]);
      if (!winter) { let b = ''; for (let i = 0; i < 7; i++) b += ell(x + rr(r, -w * .45, w * .45), rr(r, -22, -12), 1.5, 1.5); out.push(['@bloom.' + (Math.floor(x) & 1), b]); }
      else out.push(['@snow.0', `M${f1(x - w * .5)} -18q${f1(w * .5)} -9 ${f1(w)} 0z`]);
    }
    for (const [x, y] of o.baskets || []) {
      out.push({ s: '@tub.0', w: .6, d: `M${f1(x)} ${f1(y)}v8M${f1(x)} ${f1(y + 8)}l-5 6M${f1(x)} ${f1(y + 8)}l5 6` }, ['@tub.0', `M${f1(x - 6)} ${f1(y + 14)}h12q0 6 -6 6q-6 0 -6 -6z`]);
      out.push(['@leaf.1', lobed(r, x, y + 14, 8, 4, 7, .35)]);
      if (!winter) { let b = ''; for (let i = 0; i < 6; i++) b += ell(x + rr(r, -7, 7), y + rr(r, 10, 22), 1.3, 1.3); out.push(['@bloom.' + ((Math.floor(y) & 1) ? 1 : 0), b], { s: '@leaf.0', w: .8, d: `M${f1(x - 6)} ${f1(y + 16)}q-2 6 -1 10M${f1(x + 6)} ${f1(y + 16)}q2 5 0 9` }); }
    }
    for (const [x, y, k] of o.buddleia || []) {
      let st = ''; for (let i = 0; i < 6; i++) { const a = -2.4 + i * .36; st += `M${f1(x)} ${f1(y)}q${f1(Math.cos(a) * 6 * k)} ${f1(Math.sin(a) * 10 * k)} ${f1(Math.cos(a) * 12 * k)} ${f1(Math.sin(a) * 8 * k + 4)}`; }
      out.push({ s: winter ? '@twig' : '@leaf.0', w: .9, d: st });
      if (!winter) out.push(['@leaf.1', lobed(r, x, y - 4 * k, 8 * k, 4 * k, 7, .45)]);
      let sp = ''; for (let i = 0; i < 4; i++) { const a = -2.3 + i * .5, ex = x + Math.cos(a) * 12 * k, ey = y + Math.sin(a) * 8 * k + 2; sp += `M${f1(ex)} ${f1(ey)}l${f1(Math.cos(a) * 4)} ${f1(3 + Math.sin(a) * 2)}`; }
      out.push({ s: '@spike.0', w: 2, d: sp });
    }
    if (winter) for (const [x, y, w] of o.snow || []) out.push(['@snow.0', `M${f1(x)} ${f1(y)}q${f1(w * .1)} -3 ${f1(w * .5)} -3t${f1(w * .5)} 3z`], ['@snow.1', rect(x, y - .6, w, .8), .7]);
    if (s === 'autumn' && o.leaves) { let lv = '', lv2 = ''; for (let i = 0; i < 26; i++) { const d = ell(rr(r, o.leaves[0], o.leaves[1]), rr(r, -1.5, 1), rr(r, 1.2, 2.2), .9); if (i & 1) lv += d; else lv2 += d; } out.push(['@bloom.0', lv, .9], ['@bloom.1', lv2, .9]); }
  };

  /* ---------- building.station-holden: 1930s brick and glass; v0 the drum, v1 the box hall, v2 the box with a tower ---------- */
  defineObj({
    id: 'building.station-1930s', category: 'building', size: [330, 200], variants: 3, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: pal({ brick: ['#8e4e38', '#6e3a2a', '#ac6a50', '#4e2a1e'], conc: ['#e2dccc', '#bcb4a2', '#f2ecdc'], glass: ['#3c4c5a', '#a8c0cc'], frame: ['#3a3430', '#8a6a3a'], door: '#2a2a2e', fascia: ['#efe8d6', '#cfc6b0'], plinth: '#3e2a22' }),
    night: { glow: { window: '#ffd98a', lamp: '#fff0c8' }, on: .95 },
    shadow: { rx: 160, ry: 12, h: 150 },
    tags: ['uk', 'london', 'station', 'holden', '1930s', 'modernist', 'brick', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'after the 1930s Piccadilly line extension stations (drum and box halls); generic, no marks',
    signFascia: { v0: [0, -46, 96, 7], v1: [0, -46, 120, 7], v2: [-10, -46, 110, 7] },
    build(v, r, ctx) {
      const body = [], lit = [];
      // low wings either side (single storey, flat concrete roof)
      const wl = v === 0 ? 160 : 150, wh = v === 0 ? 40 : 36;
      body.push(['@brick.0', rect(-wl, -wh, 2 * wl, wh)], ['@brick.3', rect(-wl, -wh, 2 * wl, wh), .0], courses(-wl, -wh, 2 * wl, wh, '@brick.3'), ['@plinth', rect(-wl, -4, 2 * wl, 4)]);
      body.push(['@conc.0', rect(-wl - 3, -wh - 4, 2 * wl + 6, 4)], ['@conc.1', rect(-wl - 3, -wh - 1, 2 * wl + 6, 1.2)]);
      // ribbon windows in the wings
      for (const sx of [-1, 1]) {
        const x0 = sx < 0 ? -wl + 12 : wl - 72;
        body.push(['@frame.0', rect(x0 - 1.5, -wh + 8, 61, 15)]);
        for (let i = 0; i < 4; i++) body.push(...glass(x0 + i * 15, -wh + 9.5, 13.5, 12));
        body.push(['@conc.2', rect(x0 - 3, -wh + 23, 65, 2)]);
      }
      if (v === 0) {
        // the drum: a brick cylinder with a tall clerestory ring, a thin concrete roof disc
        const R = 82, y0 = -wh, yg0 = -60, yg1 = -122, yt = -136;
        body.push({ f: { lin: [[0, '@brick.2'], [.4, '@brick.0'], [1, '@brick.3']], x1: -R, y1: 0, x2: R, y2: 0 }, d: rect(-R, yt, 2 * R, -yt + y0) });
        body.push(courses(-R, yt, 2 * R, -yt + y0, '@brick.3'));
        const n = 16; let fins = '';
        for (let i = 0; i < n; i++) {
          const a0 = -Math.PI / 2 + (i + .18) * Math.PI / n, a1 = -Math.PI / 2 + (i + .82) * Math.PI / n, x0 = R * Math.sin(a0), x1 = R * Math.sin(a1);
          if (x1 - x0 < 1.2) continue;
          body.push({ f: '@glass.0', d: rect(x0, yg1, x1 - x0, yg0 - yg1), glow: 'window' });
          if (i < n / 2) body.push(['@glass.1', rect(x0, yg1, (x1 - x0) * .45, yg0 - yg1), .25]);
          fins += `M${f1((x0 + x1) / 2)} ${yg1}V${yg0}`;
        }
        body.push({ s: '@frame.0', w: .6, op: .7, d: fins + `M${-R} -84H${R}M${-R} -104H${R}` }, ['@brick.3', rect(-R, yg0, 2 * R, 2), .6]);
        body.push(['#000000', rect(R * .55, yt, R * .45, -yt + y0), .16]);
        body.push(['@conc.0', rect(-R - 6, yt - 5, 2 * R + 12, 5)], ['@conc.1', rect(-R - 6, yt - 1.4, 2 * R + 12, 1.4)], ['@conc.2', rect(-R - 6, yt - 5, 2 * R + 12, 1)]);
        // the entrance: a glazed screen with doors under a cantilevered slab; the blank fascia above
        body.push(['@frame.0', rect(-46, -36, 92, 36)]);
        for (let i = 0; i < 6; i++) body.push(...glass(-44 + i * 15, -34, 13, i === 2 || i === 3 ? 34 : 24));
        body.push({ s: '@frame.1', w: .8, d: 'M-44-24h88' }, ['@door', rect(-14, -2, 28, 2), .6]);
        body.push(['@conc.0', rect(-60, -42, 120, 5)], ['@conc.1', rect(-60, -38, 120, 1.2)], ['@fascia.0', rect(-48, -50, 96, 7)], ['@fascia.1', rect(-48, -44, 96, 1)]);
        dress(body, ctx, r, { planters: [[-120, 30], [120, 30]], snow: [[-wl - 3, -wh - 4, 2 * wl + 6], [-R - 6, yt - 5, 2 * R + 12], [-60, -42, 120]], leaves: [-160, 160] });
        lit.push(wash(0, -92, 120, 70, .28), wash(0, 2, 90, 14, .4, '@spill'));
      } else {
        // the box hall: brick ends, a great clerestory grid, a concrete coping; v2 adds a brick tower with a slot window and a concrete fin
        const bw = v === 1 ? 72 : 62, bh = v === 1 ? 124 : 114, bx = v === 2 ? -14 : 0;
        body.push(['@brick.0', rect(bx - bw, -bh, 2 * bw, bh)], courses(bx - bw, -bh, 2 * bw, bh, '@brick.3'), ['@plinth', rect(bx - bw, -4, 2 * bw, 4)]);
        const gx0 = bx - bw + 12, gw = 2 * bw - 24, cols = v === 1 ? 6 : 5, cw = gw / cols, gy0 = -bh + 14, gy1 = -48;
        body.push(['@frame.0', rect(gx0 - 1.5, gy0 - 1.5, gw + 3, gy1 - gy0 + 3)]);
        for (let i = 0; i < cols; i++) body.push(...glass(gx0 + i * cw + .8, gy0, cw - 1.6, gy1 - gy0));
        let tr = ''; for (let j = 1; j < 4; j++) tr += `M${f1(gx0)} ${f1(gy0 + j * (gy1 - gy0) / 4)}h${f1(gw)}`; body.push({ s: '@frame.0', w: 1, d: tr });
        body.push(['#000000', rect(bx + bw - 14, -bh, 14, bh), .14]);
        body.push(['@conc.0', rect(bx - bw - 5, -bh - 6, 2 * bw + 10, 6)], ['@conc.1', rect(bx - bw - 5, -bh - 1.6, 2 * bw + 10, 1.6)]);
        // doors under the long slab canopy, the blank fascia on the slab
        body.push(['@frame.0', rect(bx - 50, -36, 100, 36)]);
        for (let i = 0; i < 6; i++) body.push(...glass(bx - 48 + i * 16.2, -34, 14.4, 34));
        body.push({ s: '@frame.1', w: .8, d: `M${bx - 48} -22h96` });
        const cl = v === 1 ? 72 : 66;
        body.push(['@conc.0', rect(bx - cl, -44, 2 * cl, 7)], ['@conc.1', rect(bx - cl, -38, 2 * cl, 1.4)], ['@fascia.0', rect(bx - cl + 6, -50, 2 * cl - 12, 6)], ['@fascia.1', rect(bx - cl + 6, -45, 2 * cl - 12, 1)]);
        if (v === 2) {
          const tx = 64, tw = 30, th = 196;
          body.push(['@brick.0', rect(tx, -th, tw, th)], courses(tx, -th, tw, th, '@brick.3'), ['#000000', rect(tx + tw * .6, -th, tw * .4, th), .16]);
          body.push(['@frame.0', rect(tx + 10, -th + 22, 10, 126)]);
          for (let j = 0; j < 6; j++) body.push({ f: '@glass.0', d: rect(tx + 11, -th + 23 + j * 21, 8, 19.4), glow: 'window' });
          // the stepped concrete fin finial (a plain fin, never a disc)
          body.push(['@conc.0', rect(tx - 3, -th - 5, tw + 6, 5)], ['@conc.0', rect(tx + 8, -th - 22, 14, 17)], ['@conc.1', rect(tx + 18, -th - 22, 4, 17), .6], ['@conc.0', rect(tx + 12, -th - 36, 6, 14)]);
        }
        dress(body, ctx, r, { planters: [[-118, 28], [v === 2 ? 118 : 118, 28]], snow: [[-wl - 3, -wh - 4, 2 * wl + 6], [bx - bw - 5, -bh - 6, 2 * bw + 10], [bx - cl, -44, 2 * cl]], leaves: [-150, 150] });
        lit.push(wash(bx, -84, bw + 50, 70, .26), wash(bx, 2, 90, 14, .4, '@spill'));
      }
      // the lamp at the entrance: a plain globe-free lantern box on the slab ends
      body.push({ f: '@glass.0', d: rect(-56, -50, 5, 6), glow: 'lamp' }, { f: '@glass.0', d: rect(51, -50, 5, 6), glow: 'lamp' });
      return { body, lit };
    },
  });

  /* ---------- building.station-victorian: a terminus frontage; v0 yellow-stock twin arches and a clock tower, v1 red-brick gothic with a corner spire, v2 stone Italianate with an iron porte-cochere ---------- */
  defineObj({
    id: 'building.station-terminus', category: 'building', size: [540, 400], variants: 3, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: pal({ stock: ['#d0bc90', '#a8946c', '#e2d2aa', '#8a7856'], red: ['#a24c36', '#7e3828', '#bc6a50', '#5a2a1e'], stone: ['#dcd2bc', '#b8ae96', '#eee6d2', '#968c76'], slate: ['#4a4e58', '#383c46', '#6a6e7a'],
      glass: ['#3a4856', '#a8bccc'], iron: ['#2e3438', '#4a5258', '#1e2226'], door: '#2a2620', clock: ['#f2ecdc', '#1e1e22'], copper: ['#5a8a7a', '#3e6a5a'] }),
    night: { glow: { window: '#ffd98a', lamp: '#fff2cc' }, on: .85 },
    shadow: { rx: 270, ry: 16, h: 260 },
    tags: ['uk', 'london', 'station', 'terminus', 'victorian', 'brick', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'after the great London termini (twin-arch, gothic and Italianate frontages); generic, no marks',
    signFascia: { v0: [0, -66, 160, 9], v1: [-30, -60, 160, 9], v2: [0, -62, 200, 9] },
    build(v, r, ctx) {
      const body = [], lit = [];
      if (v === 0) {
        const W = 260, H = 262;
        body.push(['@stock.0', rect(-W, -H, 2 * W, H)], courses(-W, -H, 2 * W, H, '@stock.3', 3.6), ['#000000', rect(W - 30, -H, 30, H), .12]);
        // the two great arches: a deep brick reveal, the end screens glazed with radial bars
        for (const cx of [-128, 128]) {
          const w = 200, x0 = cx - w / 2, yb = -64, top = -250, R = w / 2, ys = top + R;
          body.push(['@stock.1', archD(x0 - 10, yb, w + 20, yb - top + 10)], ['@stock.3', archD(x0 - 3, yb, w + 6, yb - top + 3)]);
          const cols = 10, cw = w / cols;
          for (let i = 0; i < cols; i++) {
            const xa = x0 + i * cw, xm = xa + cw / 2, dy = Math.sqrt(Math.max(0, R * R - (xm - cx) * (xm - cx)));
            body.push({ f: '@glass.0', d: `M${f1(xa)} ${yb}V${f1(ys - Math.sqrt(Math.max(0, R * R - (xa - cx) ** 2)))}L${f1(xa + cw)} ${f1(ys - Math.sqrt(Math.max(0, R * R - (xa + cw - cx) ** 2)))}V${yb}z`, glow: 'window' });
            if (i < 3) body.push(['@glass.1', rect(xa, ys - dy + 6, cw * .5, yb - ys + dy - 6), .22]);
          }
          let bars = ''; for (let i = 1; i < cols; i++) bars += `M${f1(x0 + i * cw)} ${yb}V${f1(ys)}`;
          for (let j = 0; j < 4; j++) bars += `M${f1(x0)} ${f1(yb - 22 - j * 22)}h${w}`;
          for (let k = 1; k < 8; k++) { const a = Math.PI + k * Math.PI / 8; bars += `M${cx} ${ys}L${f1(cx + Math.cos(a) * R)} ${f1(ys + Math.sin(a) * R)}`; }
          body.push({ s: '@iron.0', w: 1.6, d: bars }, { s: '@iron.0', w: 3, d: `M${f1(x0)} ${f1(ys)}A${R} ${R} 0 0 1 ${f1(x0 + w)} ${f1(ys)}` }, { s: '@iron.1', w: 1.2, d: `M${f1(cx - 26)} ${f1(ys)}A26 26 0 0 1 ${f1(cx + 26)} ${f1(ys)}` });
          // the arcade at street level under each arch
          for (let i = 0; i < 5; i++) { const ax = x0 + 6 + i * 38.6; body.push(['@stock.1', archD(ax - 2, 0, 32, 54)], ['@door', archD(ax, 0, 28, 50)], ...glass(ax + 3, -44, 22, 26)); }
          body.push(['@stock.2', rect(x0 - 10, -64, w + 20, 6)]);
        }
        // the central pier and clock tower with a pyramid cap and a cupola
        body.push(['@stock.0', rect(-26, -330, 52, 330)], courses(-26, -330, 52, 330, '@stock.3', 3.6), ['#000000', rect(8, -330, 18, 330), .14]);
        body.push(['@stock.2', rect(-30, -334, 60, 6)], ['@stock.2', rect(-30, -268, 60, 5)]);
        body.push(['@clock.1', ell(0, -300, 16, 16)], { f: '@clock.0', d: ell(0, -300, 14, 14), glow: 'lamp' }, { s: '@clock.1', w: 1.8, d: 'M0-300V-310M0-300l7 4' });
        let tk = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; tk += `M${f1(Math.cos(a) * 11)} ${f1(-300 + Math.sin(a) * 11)}L${f1(Math.cos(a) * 13)} ${f1(-300 + Math.sin(a) * 13)}`; } body.push({ s: '@clock.1', w: 1, d: tk });
        body.push(['@slate.0', 'M-30-334L0-366 30-334z'], ['@slate.1', 'M0-366L30-334H6z'], ['@stock.2', rect(-8, -384, 16, 18)], ['@iron.0', rect(-6, -380, 4, 10)], ['@iron.0', rect(2, -380, 4, 10)], ['@copper.0', 'M-10-384L0-398 10-384z'], { s: '@iron.0', w: 1.2, d: 'M0-398V-410' });
        // the parapet and its coping, end pilasters, the blank fascia over the centre
        body.push(['@stock.2', rect(-W - 4, -H - 6, 2 * W + 8, 6)], ['@stock.1', rect(-W, -H, 14, H)], ['@stock.1', rect(W - 14, -H, 14, H)]);
        body.push(['@stone.2', rect(-80, -71, 160, 9)], ['@stone.1', rect(-80, -63, 160, 1.2)]);
        dress(body, ctx, r, { planters: [[-W + 14, 26], [-40, 28], [40, 28], [W - 14, 26]], buddleia: [[-W + 16, -200, 1.2], [W - 16, -150, 1], [30, -240, .9], [-W + 8, -120, 1]], snow: [[-W - 4, -H - 6, 2 * W + 8], [-30, -334, 60], [-W, -64, 2 * W]], leaves: [-W, W] });
        lit.push(wash(-128, -150, 140, 120, .22), wash(128, -150, 140, 120, .22), wash(0, -300, 34, 34, .5, '@spill'), wash(0, 2, 240, 18, .35, '@spill'));
      } else if (v === 1) {
        // red-brick gothic: a long hotel range with stone bands, steep slate roofs and dormers, a corner tower and spire
        const x0 = -270, x1 = 190, H = 196;
        body.push(['@red.0', rect(x0, -H, x1 - x0, H)], courses(x0, -H, x1 - x0, H, '@red.3', 3.6));
        for (let j = 0; j < 4; j++) body.push(['@stone.0', rect(x0, -50 - j * 40, x1 - x0, 3.5)]);
        for (let j = 0; j < 4; j++) for (let i = 0; i < 12; i++) {
          const wx = x0 + 14 + i * 37.5, wy = -50 - j * 40 - 6, wh = j === 0 ? 30 : 26;
          body.push(['@stone.1', gothD(wx - 2, wy + 2, 17, wh + 3)], { f: '@glass.0', d: gothD(wx, wy, 13, wh), glow: 'window' }, { s: '@stone.2', w: .7, d: `M${f1(wx + 6.5)} ${f1(wy)}v${f1(-wh + 6)}` });
        }
        // the ground floor: a pointed-arch arcade of entrances
        for (let i = 0; i < 8; i++) { const ax = x0 + 18 + i * 56; body.push(['@stone.1', gothD(ax - 3, 0, 40, 44)], ['@door', gothD(ax, 0, 34, 40)], ...glass(ax + 4, -34, 26, 20)); }
        body.push(['@stone.2', rect(x0, -50, x1 - x0, 4)]);
        // the roof: steep slate with gabled dormers and chimneys
        body.push(['@slate.0', `M${x0 - 4} ${-H}L${x0 + 30} ${-H - 56}H${x1 - 10}L${x1} ${-H}z`], { s: '@slate.2', w: .7, op: .45, d: `M${x0 + 10} ${-H - 14}H${x1 - 2}M${x0 + 20} ${-H - 28}H${x1 - 4}M${x0 + 28} ${-H - 42}H${x1 - 7}`, detail: true });
        for (let i = 0; i < 6; i++) { const dx = x0 + 40 + i * 72; body.push(['@red.1', `M${dx} ${-H - 4}v-26l11-14 11 14v26z`], ['@stone.2', `M${dx - 2} ${-H - 30}l13-16 13 16h-3l-10-12-10 12z`], { f: '@glass.0', d: gothD(dx + 6, -H - 8, 10, 18), glow: 'window' }); }
        for (const cx of [x0 + 70, x0 + 250]) body.push(['@red.1', rect(cx, -H - 74, 12, 30)], ['@stone.2', rect(cx - 2, -H - 76, 16, 4)]);
        body.push(['@red.0', rect(x0 - 4, -H - 2, x1 - x0 + 4, 3)]);
        // the corner tower and its spire, a clock in a stone square panel
        const tx = x1, tw = 64, th = 300;
        body.push(['@red.0', rect(tx, -th, tw, th)], courses(tx, -th, tw, th, '@red.3', 3.6), ['#000000', rect(tx + tw * .6, -th, tw * .4, th), .16]);
        for (let j = 0; j < 6; j++) body.push(['@stone.0', rect(tx, -50 - j * 40, tw, 3.5)]);
        for (let j = 0; j < 5; j++) body.push({ f: '@glass.0', d: gothD(tx + 14, -56 - j * 40, 12, 26), glow: 'window' }, { f: '@glass.0', d: gothD(tx + 38, -56 - j * 40, 12, 26), glow: 'window' });
        body.push(['@stone.0', rect(tx + 10, -th + 10, tw - 20, tw - 20)], { f: '@clock.0', d: ell(tx + tw / 2, -th + 32, 15, 15), glow: 'lamp' }, { s: '@clock.1', w: 1.6, d: `M${tx + tw / 2} ${-th + 32}v-10M${tx + tw / 2} ${-th + 32}l6 3` });
        body.push(['@slate.0', `M${tx - 4} ${-th}L${tx + tw / 2} ${-th - 120}L${tx + tw + 4} ${-th}z`], ['@slate.1', `M${tx + tw / 2} ${-th - 120}L${tx + tw + 4} ${-th}H${tx + tw / 2 + 6}z`]);
        for (const px of [tx - 2, tx + tw - 6]) body.push(['@stone.0', `M${px} ${-th}v-14l4-16 4 16v14z`]);
        body.push({ s: '@iron.0', w: 1.4, d: `M${tx + tw / 2} ${-th - 120}v-18` });
        body.push(['@stone.2', rect(-110, -63, 160, 9)], ['@stone.1', rect(-110, -55, 160, 1.2)]);
        dress(body, ctx, r, { planters: [[x0 + 10, 26], [tx + tw / 2, 30]], buddleia: [[x0 + 6, -150, 1], [tx + 8, -220, 1]], baskets: [[x0 + 60, -50], [x0 + 172, -50], [x0 + 284, -50], [x0 + 396, -50]], snow: [[x0 - 4, -H - 2, x1 - x0 + 4], [tx - 4, -th, tw + 8]], leaves: [x0, tx + tw] });
        lit.push(wash(tx + tw / 2, -th + 40, 60, 80, .3), wash(-40, -100, 240, 110, .16), wash(-40, 2, 240, 18, .35, '@spill'));
      } else {
        // stone Italianate: rusticated ground floor, three storeys of pedimented windows, a mansard, a central pediment, an iron and glass porte-cochere
        const W = 254, H = 176;
        body.push(['@stone.0', rect(-W, -H, 2 * W, H)], ['#000000', rect(W - 34, -H, 34, H), .1]);
        let rus = ''; for (let y = -8; y > -58; y -= 8) rus += `M${-W} ${y}H${W}`; body.push({ s: '@stone.3', w: .8, op: .5, d: rus });
        for (let j = 0; j < 3; j++) body.push(['@stone.2', rect(-W, -64 - j * 38, 2 * W, 3)]);
        for (let j = 0; j < 3; j++) for (let i = 0; i < 13; i++) {
          if (i === 6 && j === 2) continue;
          const wx = -W + 14 + i * 38.6, wy = -94 - j * 38;
          body.push(['@stone.1', rect(wx - 2, wy - 2, 18, 26)], ...glass(wx, wy, 14, 22), { s: '@stone.3', w: .7, d: `M${f1(wx + 7)} ${wy}v22M${wx} ${wy + 11}h14` }, j === 0 ? ['@stone.2', `M${f1(wx - 3)} ${wy - 3}l10 -6 10 6z`] : ['@stone.2', rect(wx - 3, wy - 5, 20, 3)]);
        }
        // ground floor arches behind the porte-cochere
        for (let i = 0; i < 11; i++) { const ax = -W + 18 + i * 45.5; body.push(['@stone.1', archD(ax - 2, 0, 30, 50)], ['@door', archD(ax, 0, 26, 48)], ...glass(ax + 3, -42, 20, 22)); }
        // the mansard with dormers and the central pediment block
        body.push(['@slate.0', `M${-W - 2} ${-H}L${-W + 14} ${-H - 36}H${W - 14}L${W + 2} ${-H}z`], ['@stone.2', rect(-W - 6, -H - 4, 2 * W + 12, 5)]);
        for (let i = 0; i < 9; i++) { const dx = -W + 30 + i * 56; if (Math.abs(dx + 6) < 60) continue; body.push(['@stone.0', rect(dx, -H - 30, 14, 22)], { f: '@glass.0', d: rect(dx + 3, -H - 26, 8, 16), glow: 'window' }, ['@stone.2', `M${dx - 2} ${-H - 30}l9 -6 9 6z`]); }
        body.push(['@stone.0', rect(-62, -H - 30, 124, 30)], ['@stone.2', `M-70 ${-H - 30}L0 ${-H - 64}L70 ${-H - 30}z`], ['@stone.1', `M-56 ${-H - 34}L0 ${-H - 58}L56 ${-H - 34}z`]);
        body.push(['@stone.1', rect(-62, -H, 6, H)], ['@stone.1', rect(56, -H, 6, H)]);
        body.push({ f: '@clock.0', d: ell(0, -H - 15, 11, 11), glow: 'lamp' }, { s: '@clock.1', w: 1.4, d: `M0 ${-H - 15}v-8M0 ${-H - 15}l5 3` });
        // the porte-cochere: a glazed ridge roof on iron columns with a dagger-board valance
        const py = -62, pw = 236;
        body.push(['@iron.1', `M${-pw} ${py}L${-pw + 10} ${py - 14}H${pw - 10}L${pw} ${py}z`], ['@glass.1', `M${-pw + 12} ${py - 3}L${-pw + 18} ${py - 12}H${pw - 18}L${pw - 12} ${py - 3}z`, .55]);
        let dag = `M${-pw} ${py}`; for (let x = -pw; x < pw; x += 6) dag += `L${x + 3} ${py + 6}L${x + 6} ${py}`; body.push(['@iron.0', dag + 'z']);
        let col = ''; for (let x = -pw + 8; x <= pw - 8; x += 78) col += `M${f1(x)} 0V${py}`; body.push({ s: '@iron.0', w: 2.6, d: col });
        for (let x = -pw + 8; x <= pw - 8; x += 78) body.push({ s: '@iron.0', w: 1, d: `M${f1(x - 10)} ${py}q10 2 10 10q0 -8 10 -10` });
        body.push(['@stone.2', rect(-100, py - 22, 200, 8)]);
        for (let x = -pw + 47; x < pw - 30; x += 78) body.push({ f: '@clock.0', d: rect(x - 2.5, py + 2, 5, 6), glow: 'lamp' });
        dress(body, ctx, r, { planters: [[-W + 20, 26], [W - 20, 26]], snow: [[-W - 6, -H - 4, 2 * W + 12], [-pw + 10, py - 14, 2 * pw - 20]], leaves: [-W, W] });
        lit.push(wash(0, -120, 260, 120, .2), wash(0, py + 30, 240, 30, .3, '@spill'), wash(0, 2, 250, 18, .35, '@spill'));
      }
      return { body, lit };
    },
  });

  /* ---------- building.train-shed: the end screen of a terminus train shed; v0 one great arch, v1 twin arches, v2 ridge-and-furrow bays ---------- */
  defineObj({
    id: 'building.train-shed', category: 'building', size: [520, 270], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: pal({ stock: ['#c8b48a', '#a08c66', '#dccaa2', '#7e6c4e'], glass: ['#5a6e7c', '#b8ccd8'], iron: ['#2e3a40', '#46545c', '#1c2226'], dark: ['#3a4046', '#5a6268'], plat: ['#a8a49a', '#d8d2c4', '#e0c040'], rail: '#6a6e72', lamp: '#f0ead8', train: ['#c8ccd0', '#3a6a9a', '#1e2830'] }),
    night: { glow: { window: '#ffe2a0', lamp: '#fff4d0' }, on: .95 },
    shadow: { rx: 250, ry: 14, h: 200 },
    tags: ['uk', 'london', 'station', 'terminus', 'train-shed', 'victorian', 'iron', 'glass', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'after the iron and glass train sheds of the London termini; generic',
    build(v, r, ctx) {
      const body = [], lit = [];
      const spans = v === 0 ? [[0, 230]] : v === 1 ? [[-122, 112], [122, 112]] : null;
      // the shed interior, seen through the open end: dark, platforms, tracks
      const ix0 = -240, ix1 = 240;
      body.push(['@dark.0', rect(ix0, -112, ix1 - ix0, 112)]);
      body.push({ f: { lin: [[0, '@dark.1', 0], [1, '@dark.1', 1]], x1: 0, y1: -112, x2: 0, y2: 0 }, d: rect(ix0, -112, ix1 - ix0, 112), op: .8 });
      // the roof receding into the shed: converging ribs and a lit band where the far end opens
      body.push(['@glass.0', rect(-60, -70, 120, 30), .35], { s: '@iron.1', w: .8, op: .6, d: Array.from({ length: 9 }, (_, i) => `M${ix0 + i * 60} -112L${-60 + i * 15} -70`).join('') });
      // a train standing at a platform, its windows lit
      body.push(['@train.0', 'M-120 -16V-40q0-6 6-6H-28q10 0 14 10l2 20z'], ['@train.1', rect(-120, -24, 106, 3)], ['@train.2', 'M-20-40q6 1 8 8h-8z']);
      for (let i = 0; i < 6; i++) body.push({ f: '@glass.0', d: rect(-114 + i * 15, -40, 10, 8), glow: 'window' });
      for (const px of [-170, -50, 70, 190]) body.push(['@plat.0', `M${px - 30} 0L${px - 14} -16H${px + 14}L${px + 30} 0z`], ['@plat.1', `M${px - 14} -16h28v1.4h-28z`], ['@plat.2', `M${px - 14} -14.6h28v.8h-28z`]);
      let rl = ''; for (const px of [-110, 10, 130]) rl += `M${px - 22} 0L${px - 8} -16M${px + 22} 0L${px + 8} -16`; body.push({ s: '@rail', w: 1, d: rl });
      if (spans) {
        for (const [cx, R] of spans) {
          const ys = -60, top = ys - R * .82;
          // the end screen inside the arch: vertical mullions, the arch ribs, a valance of dagger boards
          const cols = Math.round(R / 14), cw = 2 * R / cols, yv = -112;
          const archY = x => ys - R * .82 * Math.sqrt(Math.max(0, 1 - ((x - cx) / R) ** 2));
          for (let i = 0; i < cols; i++) {
            const xa = cx - R + i * cw, xb = xa + cw;
            body.push({ f: '@glass.0', d: `M${f1(xa)} ${yv}V${f1(archY(xa))}L${f1((xa + xb) / 2)} ${f1(archY((xa + xb) / 2))}L${f1(xb)} ${f1(archY(xb))}V${yv}z`, glow: 'window', op: .92 });
          }
          body.push(['@glass.1', `M${cx - R} ${yv}V${ys}Q${cx - R} ${f1(top + 30)} ${f1(cx - R * .55)} ${f1(top + 12)}V${yv}z`, .18]);
          let m = ''; for (let i = 1; i < cols; i++) { const x = cx - R + i * cw; m += `M${f1(x)} ${yv}V${f1(archY(x))}`; }
          for (let j = 1; j < 5; j++) { const y = yv - j * 26; if (y < top + 8) break; let xa = cx - R; while (xa < cx + R && archY(xa) > y) xa += 2; m += `M${f1(xa)} ${y}H${f1(2 * cx - xa)}`; }
          body.push({ s: '@iron.1', w: 1, d: m });
          body.push({ s: '@iron.0', w: 5, d: `M${cx - R} ${ys}A${R} ${f1(R * .82)} 0 0 1 ${cx + R} ${ys}` }, { s: '@iron.2', w: 2.2, d: `M${cx - R + 8} ${ys}A${R - 8} ${f1((R - 8) * .82)} 0 0 1 ${cx + R - 8} ${ys}` });
          let dag = `M${cx - R} ${yv}`; for (let x = cx - R; x < cx + R - 1; x += 7) dag += `L${f1(x + 3.5)} ${yv + 8}L${f1(x + 7)} ${yv}`; body.push(['@iron.1', rect(cx - R, yv - 3, 2 * R, 3)], ['@iron.0', dag + 'z']);
          // hanging lamps under the screen
          for (let x = cx - R + 30; x < cx + R - 20; x += 50) body.push({ s: '@iron.0', w: .6, d: `M${x} ${yv + 8}v14` }, { f: '@lamp', d: rect(x - 3, yv + 22, 6, 5), glow: 'lamp' });
          if (ctx.season === 'winter') body.push({ s: '@snow.0', w: 3, d: `M${cx - R + 4} ${ys - 22}A${R} ${f1(R * .82)} 0 0 1 ${cx + R - 4} ${ys - 22}`, op: .9 });
          lit.push(wash(cx, ys - 40, R * 1.1, R * .8, .22));
        }
        // the brick abutments and piers
        const piers = v === 0 ? [-250, 230] : [-250, -10, 234];
        for (const px of piers) body.push(['@stock.0', rect(px, -112, 20, 112)], courses(px, -112, 20, 112, '@stock.3', 3.6), ['@stock.2', rect(px - 3, -116, 26, 5)], ['@stock.2', rect(px - 2, -64, 24, 3)], ['#000000', rect(px + 12, -112, 8, 112), .16]);
        dress(body, ctx, r, { baskets: spans.flatMap(([cx, R]) => [[cx - R + 55, -110], [cx + R - 45, -110]]), planters: piers.map(px => [px + 10, 18]), buddleia: piers.flatMap((px, i) => [[px + 10, -64 + i * 6, 1.2], [px + 6, -36, .9]]), snow: piers.map(px => [px - 3, -116, 26]), leaves: [-250, 250] });
      } else {
        // ridge-and-furrow: four pitched glazed bays on iron columns with lattice girders and dagger valances
        const bays = 4, bw = 120, x0 = -bays * bw / 2, yv = -100, yr = -150;
        for (let i = 0; i < bays; i++) {
          const a = x0 + i * bw, m = a + bw / 2;
          body.push({ f: '@glass.0', d: `M${a} ${yv}L${m} ${yr}L${a + bw} ${yv}z`, glow: 'window', op: .9 }, ['@glass.1', `M${a} ${yv}L${m} ${yr}V${yv}z`, .2]);
          body.push({ s: '@iron.0', w: 3, d: `M${a} ${yv}L${m} ${yr}L${a + bw} ${yv}` }, { s: '@iron.1', w: .9, d: `M${m} ${yr}V${yv}M${a + bw * .25} ${yv - 12.5}V${yv}M${a + bw * .75} ${yv - 12.5}V${yv}M${a + 12} ${yv - 10}h${bw - 24}` });
          let dag = `M${a} ${yv}`; for (let x = a; x < a + bw - 1; x += 6) dag += `L${x + 3} ${yv + 7}L${x + 6} ${yv}`; body.push(['@iron.1', rect(a, yv - 3, bw, 3)], ['@iron.0', dag + 'z']);
          body.push({ f: '@lamp', d: rect(m - 3, yv + 16, 6, 5), glow: 'lamp' }, { s: '@iron.0', w: .6, d: `M${m} ${yv + 4}v12` });
          if (ctx.season === 'winter') body.push({ s: '@snow.0', w: 2.6, d: `M${a + 4} ${yv - 4}L${m} ${yr - 2}L${a + bw - 4} ${yv - 4}` });
        }
        let cols = ''; for (let i = 0; i <= bays; i++) cols += `M${x0 + i * bw} 0V${yv}`; body.push({ s: '@iron.0', w: 3.4, d: cols });
        for (let i = 0; i <= bays; i++) body.push({ s: '@iron.0', w: 1.2, d: `M${x0 + i * bw - 12} ${yv}q12 2 12 12q0 -10 12 -12` }, ['@iron.1', rect(x0 + i * bw - 4, -4, 8, 4)]);
        dress(body, ctx, r, { baskets: [[x0 + 60, yv + 2], [x0 + 300, yv + 2]], leaves: [x0, -x0] });
        if (ctx.season === 'winter') body.push(['@snow.0', rect(x0, -2, bays * bw, 2), .5]);
        lit.push(wash(0, -60, 260, 80, .2));
      }
      lit.push(wash(0, 2, 230, 14, .3, '@spill'));
      return { body, lit };
    },
  });

  /* ---------- building.station-modern: late-1990s steel and glass (the Jubilee extension idiom); v0 a curved glass canopy shell, v1 a glass drum, v2 a glass hall under a wave roof ---------- */
  defineObj({
    id: 'building.station-glass', category: 'building', size: [400, 160], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: pal({ glass: ['#6a8ea4', '#cfe2ec', '#3e5a6e'], steel: ['#9aa4ac', '#6a747c', '#c8d0d6', '#3e464c'], pave: ['#b4b0a8', '#8e8a82'], blue: ['#2e5a8a', '#244a72'], esc: ['#cfd6dc', '#5a646c'], light: '#f6f6ee' }),
    night: { glow: { window: '#fff0c8', lamp: '#ffffff' }, on: 1 },
    shadow: { rx: 190, ry: 12, h: 110 },
    tags: ['uk', 'london', 'station', 'modern', 'glass', 'steel', 'jubilee', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'after the late-1990s steel-and-glass extension stations; generic, no marks',
    build(v, r, ctx) {
      const body = [], lit = [];
      body.push(['@pave.0', rect(-200, -4, 400, 4)], { s: '@pave.1', w: .6, op: .5, d: Array.from({ length: 20 }, (_, i) => `M${-200 + i * 20} -4v4`).join(''), detail: true });
      if (v === 0) {
        // a long glass shell rising from the plaza to a tall open mouth on the right; steel arch ribs; escalators inside
        const yAt = t => { const u = 1 - t; return { x: u * u * u * -180 + 3 * u * u * t * -150 + 3 * u * t * t * 70 + t * t * t * 180, y: 3 * u * u * t * -82 + 3 * u * t * t * -130 + t * t * t * -112 }; };
        const P = []; for (let i = 0; i <= 24; i++) P.push(yAt(i / 24));
        const shell = 'M-180 -4' + P.map(p => `L${f1(p.x)} ${f1(p.y - 4)}`).join('') + 'L180 -4z';
        body.push(['@esc.1', 'M-60 -4L120 -96H150L-20 -4z', .8], ['@esc.0', 'M-60 -4L120 -96', .0], { s: '@esc.0', w: 1.6, d: 'M-60 -6L120 -98M-20 -6L150 -98' });
        let k = 0;
        for (let i = 0; i < 24; i += 2) { const a = P[i], b = P[i + 2]; body.push({ f: '@glass.0', d: `M${f1(a.x)} -4L${f1(a.x)} ${f1(a.y - 4)}L${f1(b.x)} ${f1(b.y - 4)}L${f1(b.x)} -4z`, glow: 'window', op: .55 }); k++; }
        body.push({ f: { lin: [[0, '@glass.1', .6], [1, '@glass.1', 0]], x1: -120, y1: -120, x2: 40, y2: 0 }, d: shell });
        let ribs = ''; for (let i = 2; i < 24; i += 2) ribs += `M${f1(P[i].x)} -4V${f1(P[i].y - 4)}`;
        body.push({ s: '@steel.1', w: 1.2, d: ribs }, { s: '@steel.3', w: 3.2, d: 'M-180 -4' + P.map(p => `L${f1(p.x)} ${f1(p.y - 4)}`).join('') }, { s: '@steel.2', w: .8, op: .8, d: 'M-176 -8' + P.slice(1, 23).map(p => `L${f1(p.x)} ${f1(p.y - 1)}`).join('') });
        body.push({ s: '@steel.3', w: 3, d: 'M180 -4V-116' }, { s: '@steel.1', w: 1, d: 'M180 -40h-8M180 -76h-8' });
        for (let i = 3; i < 22; i += 3) body.push({ f: '@light', d: rect(P[i].x - 3, P[i].y + 2, 6, 2), glow: 'lamp' });
        dress(body, ctx, r, { planters: [[-170, 26], [190, 18]], snow: [[-180, -6, 120]], leaves: [-200, 200] });
        lit.push(wash(40, -60, 170, 80, .26), wash(150, 0, 80, 14, .4, '@spill'));
      } else if (v === 1) {
        // a glass drum under a thin overhanging roof disc, one floor slab, a spiral of escalator inside
        const R = 92, H = 118;
        body.push({ f: { lin: [[0, '@glass.1'], [.35, '@glass.0'], [1, '@glass.2']], x1: -R, y1: 0, x2: R, y2: 0 }, d: rect(-R, -H, 2 * R, H - 4) });
        body.push(['@esc.1', 'M-50 -4L40 -60H62L-28 -4z', .7], ['@steel.1', rect(-R, -62, 2 * R, 4)]);
        const n = 14; let mul = '';
        for (let i = 0; i < n; i++) {
          const a0 = -Math.PI / 2 + i * Math.PI / n, a1 = a0 + Math.PI / n, x0 = R * Math.sin(a0), x1 = R * Math.sin(a1);
          body.push({ f: '@glass.0', d: rect(x0, -H, x1 - x0, H - 4), glow: 'window', op: .5 });
          mul += `M${f1(x1)} -4V${-H}`;
        }
        body.push({ s: '@steel.0', w: 1.1, d: mul + `M${-R} -34H${R}M${-R} -90H${R}` }, ['@glass.1', rect(-R + 8, -H, 26, H - 4), .2]);
        body.push(['@steel.3', `M${-R - 22} ${-H - 8}h${2 * R + 44}v6h${-2 * R - 44}z`], ['@steel.2', rect(-R - 22, -H - 8, 2 * R + 44, 1.6)], ['@steel.1', `M${-R - 22} ${-H - 2}h${2 * R + 44}l-6 3h${-2 * R - 32}z`]);
        for (let x = -R + 16; x < R; x += 30) body.push({ f: '@light', d: rect(x - 3, -H + 2, 6, 2), glow: 'lamp' });
        dress(body, ctx, r, { planters: [[-140, 34], [140, 34]], snow: [[-R - 22, -H - 8, 2 * R + 44]], leaves: [-190, 190] });
        lit.push(wash(0, -60, 140, 90, .28), wash(0, 2, 120, 14, .4, '@spill'));
      } else {
        // a tall glass hall with a blue-glazed core, under a sweeping wave roof on raking steel struts
        const W = 168, H = 96;
        body.push(['@blue.0', rect(-W, -H, 2 * W, H - 4)]);
        const cols = 12, cw = 2 * W / cols;
        for (let i = 0; i < cols; i++) body.push({ f: '@glass.0', d: rect(-W + i * cw + .6, -H + 2, cw - 1.2, H - 6), glow: 'window', op: i % 4 === 1 ? .9 : .75 });
        body.push({ s: '@steel.0', w: 1.2, d: Array.from({ length: cols + 1 }, (_, i) => `M${f1(-W + i * cw)} -4V${-H}`).join('') + `M${-W} -36H${W}M${-W} -66H${W}` }, ['@glass.1', `M${-W} ${-H}h70l-70 60z`, .22]);
        body.push(['@esc.1', `M-40 -4L60 -66H80L-20 -4z`, .5]);
        const wave = x => -H - 22 - 16 * Math.sin((x + 210) / 420 * Math.PI * 1.6);
        let top = '', bot = '';
        for (let x = -212; x <= 212; x += 12) { top += `${x === -212 ? 'M' : 'L'}${x} ${f1(wave(x))}`; }
        for (let x = 212; x >= -212; x -= 12) bot += `L${x} ${f1(wave(x) + 8)}`;
        body.push(['@steel.2', top + bot + 'z'], ['@steel.1', `M-212 ${f1(wave(-212) + 6)}` + Array.from({ length: 36 }, (_, i) => `L${-212 + (i + 1) * 12} ${f1(wave(-212 + (i + 1) * 12) + 6)}`).join('') + `L212 ${f1(wave(212) + 8)}` + Array.from({ length: 36 }, (_, i) => `L${212 - (i + 1) * 12} ${f1(wave(212 - (i + 1) * 12) + 8)}`).join('') + 'z']);
        let st = ''; for (const x of [-200, -120, 120, 200]) st += `M${x} -4L${x + (x < 0 ? 22 : -22)} ${f1(wave(x) + 8)}`; body.push({ s: '@steel.3', w: 2.6, d: st });
        for (let x = -150; x <= 150; x += 50) body.push({ f: '@light', d: rect(x - 4, f1(wave(x) + 9), 8, 2), glow: 'lamp' });
        dress(body, ctx, r, { planters: [[-186, 22], [186, 22]], snow: [[-212, f1(wave(-212)), 140], [100, f1(wave(100)), 110]], leaves: [-200, 200] });
        lit.push(wash(0, -54, 200, 70, .26), wash(0, 2, 170, 14, .4, '@spill'));
      }
      return { body, lit };
    },
  });

  /* ---------- building.station-cut-cover: a sub-surface street building over the cut; v0 1860s Italianate stucco, v1 Edwardian glazed terracotta, v2 brick with an iron canopy ---------- */
  defineObj({
    id: 'building.station-cut-cover', category: 'building', size: [300, 150], variants: 3, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: pal({ stucco: ['#ece4d0', '#cbc1aa', '#faf5ea', '#a89e88'], terra: ['#8a2c26', '#6a1e1a', '#a84038', '#4a1410'], stock: ['#ccb88e', '#a6926c', '#e0cea6', '#86744e'], red: ['#a24c36', '#7a3626'],
      glass: ['#34424e', '#a8bccc'], frame: ['#efe8d8', '#2e3438'], iron: ['#2e3438', '#4a5258'], door: '#2a2420', fascia: ['#f2ecdc', '#cfc6b0'], lamp: '#f4efe0' }),
    night: { glow: { window: '#ffd98a', lamp: '#fff0c8' }, on: .85 },
    shadow: { rx: 150, ry: 12, h: 120 },
    tags: ['uk', 'london', 'station', 'sub-surface', 'cut-and-cover', 'victorian', 'edwardian', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'after the 1860s sub-surface station buildings and the Edwardian terracotta station fronts; generic, no marks',
    signFascia: { v0: [0, -66, 90, 8], v1: [0, -50, 220, 9], v2: [0, -50, 200, 8] },
    build(v, r, ctx) {
      const body = [], lit = [];
      if (v === 0) {
        const W = 142, H = 84;
        body.push(['@stucco.0', rect(-W, -H, 2 * W, H)], ['#000000', rect(W - 22, -H, 22, H), .1]);
        let rus = ''; for (let y = -7; y > -H; y -= 7) rus += `M${-W} ${y}H${W}`; body.push({ s: '@stucco.3', w: .6, op: .35, d: rus, detail: true });
        // the entrance bay projects a little: pilasters, a big arched doorway with a fanlight, the blank frieze above
        body.push(['@stucco.2', rect(-44, -H - 4, 88, H + 4)], ['@stucco.1', rect(-44, -H - 4, 7, H + 4)], ['@stucco.1', rect(37, -H - 4, 7, H + 4)]);
        body.push(['@stucco.3', archD(-26, 0, 52, 62)], ['@door', archD(-22, 0, 44, 58)], ...glass(-20, -54, 40, 30), { s: '@frame.0', w: 1, d: 'M0-24v-30M-20-38h40' });
        let fan = ''; for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; fan += `M0 -36L${f1(Math.cos(a) * 20)} ${f1(-36 + Math.sin(a) * 20)}`; } body.push({ s: '@frame.0', w: .9, d: fan }, ['@stucco.2', 'M-4-62h8l-1 6h-6z']);
        body.push(['@fascia.0', rect(-45, -70, 90, 8)], ['@fascia.1', rect(-45, -63, 90, 1)]);
        for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const wx = sx < 0 ? -W + 18 + i * 44 : W - 46 - i * 44; body.push(['@stucco.3', archD(wx - 3, -14, 30, 54)], { f: '@glass.0', d: archD(wx, -16, 24, 50), glow: 'window' }, ['@glass.1', archD(wx, -16, 10, 44), .22], { s: '@frame.0', w: .9, d: `M${wx + 12} -16v-50M${wx} -38h24` }, ['@stucco.2', rect(wx - 4, -16, 32, 3)]); }
        // the cornice and the balustrade
        body.push(['@stucco.2', rect(-W - 5, -H - 6, 2 * W + 10, 6)], ['@stucco.1', rect(-W - 5, -H - 1.6, 2 * W + 10, 1.6)], ['@stucco.2', rect(-W - 2, -H - 26, 2 * W + 4, 4)], ['@stucco.0', rect(-W - 2, -H - 9, 2 * W + 4, 3)]);
        let bal = ''; for (let x = -W + 3; x < W - 2; x += 7) bal += `M${x} ${-H - 9}c-2-3 2-5 0-7s2-3 0-4h4c-2 1 2 2 0 4s2 4 0 7z`; body.push(['@stucco.1', bal]);
        for (const px of [-W - 2, -50, 44, W - 6]) body.push(['@stucco.2', rect(px, -H - 26, 8, 20)]);
        for (const lx of [-48, 48]) body.push({ s: '@iron.0', w: 1.4, d: `M${lx} -50h${lx < 0 ? -8 : 8}` }, ['@iron.0', rect(lx + (lx < 0 ? -12 : 4), -58, 8, 3)], { f: '@lamp', d: rect(lx + (lx < 0 ? -11 : 5), -55, 6, 8), glow: 'lamp' });
        dress(body, ctx, r, { planters: [[-W + 14, 24], [W - 14, 24]], snow: [[-W - 5, -H - 6, 2 * W + 10], [-W - 2, -H - 26, 2 * W + 4]], leaves: [-W, W] });
        lit.push(wash(0, -40, 70, 60, .3), wash(0, 2, 110, 14, .4, '@spill'));
      } else if (v === 1) {
        // glazed oxblood terracotta, two storeys: wide ground-floor openings, a fascia band, big semicircular first-floor windows, a dentil cornice
        const W = 132, H = 124;
        body.push(['@terra.0', rect(-W, -H, 2 * W, H)]);
        let tl = ''; for (let y = -6; y > -H; y -= 6) tl += `M${-W} ${y}H${W}`; for (let x = -W + 12; x < W; x += 12) tl += `M${x} 0V${-H}`; body.push({ s: '@terra.3', w: .5, op: .35, d: tl, detail: true });
        body.push({ f: { lin: [[0, '#ffffff', .16], [.5, '#ffffff', 0], [1, '#000000', .12]], x1: -W, y1: 0, x2: W, y2: 0 }, d: rect(-W, -H, 2 * W, H) });
        for (const px of [-W, -46, 40, W - 6]) body.push(['@terra.2', rect(px, -H, 6, H)], ['@terra.3', rect(px + 4, -H, 2, H), .5]);
        for (const [x0, x1] of [[-W + 6, -46], [-40, 40], [46, W - 6]]) {
          const w = x1 - x0 - 8, x = x0 + 4;
          body.push(['@door', rect(x, -40, w, 40)], ...glass(x + 3, -38, w - 6, 16), { s: '@frame.1', w: 1, d: `M${f1(x + w / 2)} 0V-22M${x} -22h${w}` }, ['@frame.1', rect(x + 4, -20, w - 8, 18), .5]);
          // the lunette above: radial glazing bars, a keystone
          const cx = x0 + (x1 - x0) / 2, R = (x1 - x0) / 2 - 10;
          body.push(['@terra.3', `M${f1(cx - R - 3)} -62A${f1(R + 3)} ${f1(R + 3)} 0 0 1 ${f1(cx + R + 3)} -62z`], { f: '@glass.0', d: `M${f1(cx - R)} -62A${f1(R)} ${f1(R)} 0 0 1 ${f1(cx + R)} -62z`, glow: 'window' }, ['@glass.0', rect(cx - R, -62, 2 * R, 0)]);
          let rb = ''; for (let k = 1; k < 4; k++) { const a = Math.PI + k * Math.PI / 4; rb += `M${f1(cx)} -62L${f1(cx + Math.cos(a) * R)} ${f1(-62 + Math.sin(a) * R)}`; }
          body.push({ s: '@frame.1', w: 1, d: rb + `M${f1(cx - R)} -62h${f1(2 * R)}` }, ['@terra.2', `M${f1(cx - 4)} ${f1(-62 - R - 4)}h8l-1 8h-6z`]);
          body.push({ f: '@glass.0', d: rect(cx - R, -60 + 0, 2 * R, 10), glow: 'window' }, { s: '@frame.1', w: .8, d: `M${f1(cx)} -60v10` });
        }
        body.push(['@fascia.0', rect(-W + 6, -54, 2 * W - 12, 9)], ['@fascia.1', rect(-W + 6, -46, 2 * W - 12, 1.2)], ['@terra.2', rect(-W, -45, 2 * W, 3)]);
        body.push(['@terra.2', rect(-W - 4, -H - 6, 2 * W + 8, 6)], ['@terra.3', rect(-W - 4, -H - 1.4, 2 * W + 8, 1.4)]);
        let den = ''; for (let x = -W - 2; x < W; x += 5) den += rect(x, -H, 2.6, 3); body.push(['@terra.3', den]);
        body.push(['@terra.0', rect(-W, -H - 14, 2 * W, 8)], ['@terra.2', rect(-W - 2, -H - 16, 2 * W + 4, 2.4)]);
        dress(body, ctx, r, { baskets: [[-43, -44], [43, -44]], snow: [[-W - 4, -H - 6, 2 * W + 8], [-W - 2, -H - 16, 2 * W + 4]], leaves: [-W, W] });
        lit.push(wash(0, -70, 150, 60, .22), wash(0, 2, 120, 14, .4, '@spill'));
      } else {
        // yellow-stock brick, two storeys with red bands, sash windows, an ornate iron and glass canopy over the pavement
        const W = 140, H = 110;
        body.push(['@stock.0', rect(-W, -H, 2 * W, H)], courses(-W, -H, 2 * W, H, '@stock.3', 3.4), ['#000000', rect(W - 24, -H, 24, H), .12]);
        for (const y of [-58, -H + 6]) body.push(['@red.0', rect(-W, y, 2 * W, 5)]);
        for (let i = 0; i < 6; i++) { const wx = -W + 16 + i * 45; body.push(['@red.0', archD(wx - 3, -64, 26, 40)], ...glass(wx, -66, 20, 34), { s: '@frame.0', w: 1, d: `M${wx} -50h20M${wx + 10} -66v-14` }, ['@stock.2', rect(wx - 3, -66, 26, 2.6)]); }
        body.push(['@red.0', archD(-24, 0, 48, 52)], ['@door', archD(-20, 0, 40, 48)], ...glass(-17, -44, 34, 18));
        for (const wx of [-W + 14, -84, 54, W - 44]) body.push(['@door', rect(wx, -40, 30, 36)], ...glass(wx + 2, -38, 26, 28), ['@stock.2', rect(wx - 2, -42, 34, 2.4)]);
        body.push(['@stock.2', rect(-W - 4, -H - 5, 2 * W + 8, 5)]);
        for (const cx of [-90, 90]) body.push(['@red.1', rect(cx - 7, -H - 26, 14, 22)], ['@stock.2', rect(cx - 9, -H - 28, 18, 3)]);
        // the canopy: a glazed lean-to on brackets, the dagger valance, the blank fascia board on the canopy front
        const cy = -48, cw = 132;
        body.push(['@iron.1', `M${-cw} ${cy}L${-cw + 6} ${cy - 10}H${cw - 6}L${cw} ${cy}z`], ['@glass.1', `M${-cw + 8} ${cy - 2}L${-cw + 12} ${cy - 8}H${cw - 12}L${cw - 8} ${cy - 2}z`, .5]);
        let dag = `M${-cw} ${cy}`; for (let x = -cw; x < cw; x += 6) dag += `L${x + 3} ${cy + 6}L${x + 6} ${cy}`; body.push(['@iron.0', dag + 'z']);
        body.push(['@fascia.0', rect(-100, cy - 10, 200, 8)], ['@fascia.1', rect(-100, cy - 3, 200, 1)]);
        body.push({ s: '@iron.0', w: 2.2, d: `M${-cw + 6} 0V${cy}M${cw - 6} 0V${cy}` }, { s: '@iron.0', w: 1, d: `M${-cw + 6} ${cy + 12}q4 -10 14 -12M${cw - 6} ${cy + 12}q-4 -10 -14 -12` });
        for (const lx of [-60, 0, 60]) body.push({ f: '@lamp', d: rect(lx - 3, cy + 7, 6, 6), glow: 'lamp' });
        dress(body, ctx, r, { buddleia: [[W - 10, -H + 14, .7]], baskets: [[-110, cy + 2], [110, cy + 2]], snow: [[-cw + 6, cy - 10, 2 * cw - 12], [-W - 4, -H - 5, 2 * W + 8]], leaves: [-W, W] });
        lit.push(wash(0, cy + 20, 150, 40, .32, '@spill'), wash(0, 2, 130, 14, .4, '@spill'));
      }
      return { body, lit };
    },
  });

  /* ---------- building.station-dlr: an elevated light-railway station on a concrete viaduct; v0 a curved canopy and a stair, v1 a long barrel canopy and a lift tower, v2 a butterfly canopy and both ---------- */
  defineObj({
    id: 'building.station-dlr', category: 'building', size: [460, 170], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: pal({ conc: ['#c8c4bc', '#a29e96', '#dedad2', '#7e7a74'], steel: ['#5a6670', '#3a444c', '#8a96a0'], roof: ['#e4e6e8', '#b8bec4', '#2a8a8a'], glass: ['#6a8ea4', '#cfe2ec'], edge: ['#e8c838', '#f4f0e4'], dark: '#3a3c40', lamp: '#f6f6ee' }),
    night: { glow: { window: '#fff0c8', lamp: '#ffffff' }, on: 1 },
    shadow: { rx: 220, ry: 12, h: 120 },
    tags: ['uk', 'london', 'station', 'elevated', 'light-railway', 'viaduct', 'docklands', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'after the elevated light-railway stations of east London; generic, no marks',
    signFascia: { v0: [0, -122, 80, 7], v1: [0, -124, 100, 7], v2: [0, -126, 80, 7] },
    build(v, r, ctx) {
      const body = [], lit = [];
      const W = 200, dy = -86;
      // the piers (a tapering stem and a Y head) and the deck beam; the shadowed soffit
      for (const px of [-140, 0, 140]) body.push(['@conc.0', `M${px - 9} 0L${px - 7} ${dy + 26}L${px - 18} ${dy + 14}H${px + 18}L${px + 7} ${dy + 26}L${px + 9} 0z`], ['@conc.3', `M${px + 3} 0L${px + 4} ${dy + 26}L${px + 18} ${dy + 14}H${px + 10}L${px + 7} ${dy + 26}L${px + 9} 0z`, .5]);
      body.push(['@conc.0', rect(-W - 10, dy, 2 * W + 20, 14)], ['@conc.3', rect(-W - 10, dy + 12, 2 * W + 20, 2)], ['@conc.2', rect(-W - 10, dy, 2 * W + 20, 2)], { s: '@conc.1', w: .6, op: .5, d: Array.from({ length: 10 }, (_, i) => `M${-W - 10 + i * 46} ${dy}v14`).join('') });
      // the platform: edge line, a parapet screen of glass panels
      body.push(['@edge.1', rect(-W, dy - 3, 2 * W, 3)], ['@edge.0', rect(-W, dy - 3, 2 * W, .9)]);
      for (let x = -W; x < W; x += 20) body.push(['@glass.1', rect(x + 1, dy - 14, 18, 11), .35]);
      body.push({ s: '@steel.0', w: 1, d: `M${-W} ${dy - 14}H${W}` + Array.from({ length: 21 }, (_, i) => `M${-W + i * 20} ${dy - 14}v11`).join('') });
      // the canopy
      const cx0 = v === 1 ? -170 : -120, cx1 = v === 1 ? 170 : 120, ch = dy - 46;
      let posts = ''; for (let x = cx0 + 10; x <= cx1 - 10; x += 40) posts += `M${x} ${dy - 3}V${ch + 4}`;
      body.push({ s: '@steel.0', w: 2.4, d: posts });
      if (v === 2) {
        body.push(['@roof.1', `M${cx0 - 6} ${ch - 8}L0 ${ch + 2}L${cx1 + 6} ${ch - 8}v4L0 ${ch + 6}L${cx0 - 6} ${ch - 4}z`], ['@roof.2', `M${cx0 - 6} ${ch - 8}L0 ${ch + 2}L${cx1 + 6} ${ch - 8}v1.6L0 ${ch + 3.6}L${cx0 - 6} ${ch - 6.4}z`]);
      } else {
        body.push(['@roof.0', `M${cx0 - 8} ${ch + 2}Q0 ${ch - 20} ${cx1 + 8} ${ch + 2}v9Q0 ${ch - 8} ${cx0 - 8} ${ch + 11}z`], ['@roof.1', `M${cx0 - 8} ${ch + 7}Q0 ${ch - 13} ${cx1 + 8} ${ch + 7}v4Q0 ${ch - 8} ${cx0 - 8} ${ch + 11}z`], ['@roof.2', `M${cx0 - 8} ${ch + 2}Q0 ${ch - 20} ${cx1 + 8} ${ch + 2}v2.2Q0 ${ch - 17.8} ${cx0 - 8} ${ch + 4.2}z`]);
        let rib = ''; for (let x = cx0 + 10; x <= cx1 - 10; x += 40) rib += `M${x} ${ch + 4}l-8 -4M${x} ${ch + 4}l8 -4`; body.push({ s: '@steel.0', w: 1.2, d: rib });
      }
      for (let x = cx0 + 30; x < cx1 - 10; x += 40) body.push({ f: '@lamp', d: rect(x - 5, ch + 6, 10, 2), glow: 'lamp' });
      body.push({ f: '@roof.0', d: rect(-40, ch + 12, 80, 7) }, ['@roof.2', rect(-40, ch + 19, 80, 1.2)]);   // the blank name panel under the canopy
      // a shelter of glass with a bench
      body.push({ f: '@glass.0', d: rect(-30, dy - 30, 60, 27), glow: 'window', op: .55 }, { s: '@steel.0', w: 1, d: `M-30 ${dy - 30}h60v27M-30 ${dy - 30}v27` }, ['@dark', rect(-20, dy - 10, 40, 2)]);
      // access: a stair (v0, v2) and a glazed lift tower (v1, v2)
      if (v !== 1) {
        // one straight flight from the platform end down to the street, a half landing, steel stringers and a handrail
        const sx = W + 8, ex = W + 96, ly = dy / 2;
        body.push(['@conc.0', rect(W - 2, dy, 12, 6)], ['@conc.1', `M${sx} ${dy}L${sx + 40} ${ly}H${sx + 52}L${ex} 0H${ex - 10}L${sx + 50} ${ly + 5}H${sx + 38}L${sx - 2} ${dy + 6}z`]);
        let tr = ''; for (let i = 1; i < 8; i++) tr += `M${f1(sx + i * 5)} ${f1(dy + i * (ly - dy) / 8)}v3`; for (let i = 1; i < 8; i++) tr += `M${f1(sx + 52 + i * 5.5)} ${f1(ly + i * -ly / 8)}v3`;
        body.push({ s: '@conc.3', w: .9, d: tr }, { s: '@steel.1', w: 1.4, d: `M${sx} ${dy + 6}L${sx + 40} ${ly + 6}H${sx + 52}L${ex} 6` }, { s: '@steel.0', w: 1.2, d: `M${sx} ${dy - 12}L${sx + 40} ${ly - 12}H${sx + 52}L${ex} -12` }, { s: '@steel.0', w: .8, d: `M${sx + 46} ${ly}V${ly - 12}M${sx + 20} ${(dy + ly) / 2}v-12M${sx + 74} ${ly / 2}v-12` }, ['@conc.0', rect(sx + 42, ly + 4, 6, -ly - 4)]);
      }
      if (v !== 0) {
        const lx = -W - 34;
        body.push(['@steel.1', rect(lx, dy - 30, 26, -dy + 30)], { f: '@glass.0', d: rect(lx + 3, dy - 27, 20, -dy + 25), glow: 'window', op: .8 }, ['@steel.2', rect(lx - 2, dy - 34, 30, 4)], { s: '@steel.1', w: .8, d: `M${lx + 13} ${dy - 27}V-2M${lx + 3} ${dy / 2}h20` }, ['@steel.1', rect(lx + 26, dy - 3, 14, 4)]);
        body.push({ f: '@glass.1', d: rect(lx + 6, dy / 2 - 12, 14, 18), op: .7 });
      }
      dress(body, ctx, r, { planters: [[-70, 30], [70, 30]], snow: [[cx0 - 8, ch, cx1 - cx0 + 16], [-W - 10, dy, 2 * W + 20]], leaves: [-W, W] });
      lit.push(wash(0, ch + 30, (cx1 - cx0) / 2 + 30, 34, .3), wash(0, 2, 160, 12, .22, '@spill'));
      return { body, lit };
    },
  });

  /* ---------- building.station-brick: a suburban rail station building; v0 single-storey Victorian with round arches, v1 two-storey Italianate station house, v2 1930s concrete with a fin tower ---------- */
  defineObj({
    id: 'building.station-brick', category: 'building', size: [290, 180], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: pal({ stock: ['#ccb88e', '#a6926c', '#e0cea6', '#86744e'], red: ['#a24c36', '#7a3626', '#bc6a50', '#5a2a1e'], render: ['#ece6d6', '#c8c0ac', '#faf6ec', '#a29a88'], slate: ['#4a4e58', '#383c46', '#6a6e7a'],
      glass: ['#34424e', '#a8bccc'], frame: ['#efe8d8', '#2e5a3a', '#2e3438'], iron: ['#2e3438', '#4a5258'], door: '#2a2420', fascia: ['#f2ecdc', '#cfc6b0'], lamp: '#f4efe0' }),
    night: { glow: { window: '#ffd98a', lamp: '#fff0c8' }, on: .8 },
    shadow: { rx: 140, ry: 12, h: 130 },
    tags: ['uk', 'london', 'station', 'suburban', 'overground', 'national-rail', 'brick', 'kit:london', 'kit:temperate', 'role:building-mid'],
    credit: 'after London suburban and orbital railway station buildings; generic, no marks',
    signFascia: { v0: [0, -60, 120, 8], v1: [-60, -54, 100, 8], v2: [10, -64, 160, 8] },
    build(v, r, ctx) {
      const body = [], lit = [];
      if (v === 0) {
        const W = 130, H = 56;
        body.push(['@stock.0', rect(-W, -H, 2 * W, H)], courses(-W, -H, 2 * W, H, '@stock.3', 3.4), ['#000000', rect(W - 20, -H, 20, H), .12], ['@red.0', rect(-W, -H, 2 * W, 4)], ['@red.0', rect(-W, -18, 2 * W, 3)]);
        for (const qx of [-W, W - 8]) { let q = ''; for (let y = 0; y > -H; y -= 8) q += rect(qx + ((y / 8) & 1 ? 0 : 2), y - 4, 6, 4); body.push(['@red.0', q]); }
        for (let i = 0; i < 5; i++) { const wx = -W + 18 + i * 50; if (i === 2) { body.push(['@red.0', archD(wx - 4, 0, 30, 46)], ['@door', archD(wx, 0, 22, 42)], ...glass(wx + 2, -38, 18, 14)); continue; } body.push(['@red.0', archD(wx - 3, -12, 26, 38)], { f: '@glass.0', d: archD(wx, -12, 20, 34), glow: 'window' }, ['@glass.1', archD(wx, -12, 8, 30), .2], { s: '@frame.0', w: 1, d: `M${wx + 10} -12v-30M${wx} -28h20` }, ['@render.0', rect(wx - 3, -12, 26, 2.4)]); }
        body.push(['@slate.0', `M${-W - 6} ${-H}L${-W + 24} ${-H - 40}H${W - 24}L${W + 6} ${-H}z`], ['@slate.1', `M${W - 24} ${-H - 40}L${W + 6} ${-H}H${W - 40}z`, .6], { s: '@slate.2', w: .7, op: .4, d: `M${-W} ${-H - 10}H${W}M${-W + 10} ${-H - 20}H${W - 10}M${-W + 18} ${-H - 30}H${W - 18}`, detail: true });
        for (const cx of [-80, 80]) body.push(['@stock.0', rect(cx - 7, -H - 62, 14, 34)], ['@red.0', rect(cx - 9, -H - 64, 18, 4)], ['@red.1', rect(cx - 4, -H - 70, 4, 6)], ['@red.1', rect(cx + 1, -H - 70, 4, 6)]);
        // the street canopy over the door, with its valance and the blank board
        const cy = -46;
        body.push(['@iron.1', `M-46 ${cy}L-42 ${cy - 8}H42L46 ${cy}z`]);
        let dag = `M-46 ${cy}`; for (let x = -46; x < 46; x += 6) dag += `L${x + 3} ${cy + 6}L${x + 6} ${cy}`; body.push(['@frame.1', dag + 'z'], { s: '@iron.0', w: 1.8, d: `M-42 0V${cy}M42 0V${cy}` });
        body.push(['@fascia.0', rect(-60, -64, 120, 8)], ['@fascia.1', rect(-60, -57, 120, 1)]);
        body.push({ f: '@lamp', d: rect(-3, cy + 7, 6, 6), glow: 'lamp' });
        dress(body, ctx, r, { planters: [[-W + 20, 22], [W - 20, 22]], baskets: [[-36, cy + 2], [36, cy + 2]], snow: [[-W - 6, -H, 2 * W + 12]], leaves: [-W, W] });
        lit.push(wash(0, cy + 16, 70, 30, .32, '@spill'), wash(0, 2, 110, 12, .35, '@spill'));
      } else if (v === 1) {
        // the station house (right) and the booking-hall wing (left)
        const hx0 = 0, hx1 = 130, hh = 104, wx0 = -140, wh = 50;
        body.push(['@red.0', rect(wx0, -wh, hx0 - wx0, wh)], courses(wx0, -wh, hx0 - wx0, wh, '@red.3', 3.4), ['@slate.0', `M${wx0 - 6} ${-wh}L${wx0 + 14} ${-wh - 22}H${hx0}V${-wh}z`]);
        for (let i = 0; i < 3; i++) { const x = wx0 + 14 + i * 44; body.push(['@stock.2', rect(x - 3, -42, 26, 34)], ...glass(x, -40, 20, 30), { s: '@frame.0', w: 1, d: `M${x} -25h20M${x + 10} -40v30` }); }
        body.push(['@red.0', rect(hx0, -hh, hx1 - hx0, hh)], courses(hx0, -hh, hx1 - hx0, hh, '@red.3', 3.4), ['#000000', rect(hx1 - 26, -hh, 26, hh), .14], ['@stock.2', rect(hx0, -54, hx1 - hx0, 4)]);
        for (const fl of [0, 1]) for (let i = 0; i < 3; i++) { const x = hx0 + 14 + i * 38, y = fl ? -94 : -44; if (!fl && i === 1) { body.push(['@stock.2', rect(x - 3, -44, 26, 44)], ['@frame.1', rect(x, -40, 20, 40)], ...glass(x + 2, -38, 16, 12)); continue; } body.push(['@stock.2', rect(x - 3, y - 2, 26, 36)], ...glass(x, y, 20, 32), { s: '@frame.0', w: 1, d: `M${x} ${y + 16}h20M${x + 10} ${y}v32` }); }
        body.push(['@slate.0', `M${hx0 - 10} ${-hh}L${hx0 + 30} ${-hh - 34}H${hx1 - 30}L${hx1 + 10} ${-hh}z`], ['@slate.1', `M${hx1 - 30} ${-hh - 34}L${hx1 + 10} ${-hh}H${hx1 - 20}z`, .6]);
        let br = ''; for (let x = hx0 - 6; x < hx1 + 8; x += 12) br += rect(x, -hh, 3, 4); body.push(['@stock.2', br]);
        for (const cx of [hx0 + 26, hx1 - 26]) body.push(['@red.0', rect(cx - 7, -hh - 56, 14, 30)], ['@stock.2', rect(cx - 9, -hh - 58, 18, 4)]);
        const cy = -48;
        body.push(['@iron.1', `M${wx0 + 6} ${cy}L${wx0 + 10} ${cy - 8}H${hx0 - 10}L${hx0 - 6} ${cy}z`]);
        let dag = `M${wx0 + 6} ${cy}`; for (let x = wx0 + 6; x < hx0 - 6; x += 6) dag += `L${x + 3} ${cy + 6}L${x + 6} ${cy}`; body.push(['@frame.1', dag + 'z']);
        body.push(['@fascia.0', rect(-110, cy - 10, 100, 8)], ['@fascia.1', rect(-110, cy - 3, 100, 1)]);
        dress(body, ctx, r, { planters: [[hx1 + 2, 18]], baskets: [[wx0 + 30, cy + 2], [hx0 - 30, cy + 2]], buddleia: [[hx1 - 8, -60, .6]], snow: [[hx0 - 10, -hh, hx1 - hx0 + 20], [wx0 - 6, -wh, hx0 - wx0 + 6]], leaves: [wx0, hx1] });
        lit.push(wash(-70, cy + 16, 80, 30, .3, '@spill'), wash(0, 2, 140, 12, .3, '@spill'));
      } else {
        // 1930s: a rendered booking hall with a long window band and a cantilever canopy, beside a tall fin tower with a slot window
        const W = 120, H = 70;
        body.push(['@render.0', rect(-W, -H, 2 * W, H)], ['#000000', rect(W - 22, -H, 22, H), .1], ['@render.2', rect(-W - 3, -H - 4, 2 * W + 6, 4)]);
        body.push(['@frame.2', rect(-W + 12, -60, 2 * W - 24, 18)]);
        for (let i = 0; i < 12; i++) body.push(...glass(-W + 13 + i * 18.8, -59, 17, 16));
        body.push(['@frame.2', rect(-40, -34, 80, 34)]); for (let i = 0; i < 4; i++) body.push(...glass(-38 + i * 19.5, -32, 18, 32));
        for (const wx of [-W + 14, W - 54]) body.push(['@frame.2', rect(wx, -32, 40, 22)], ...glass(wx + 2, -30, 17, 18), ...glass(wx + 21, -30, 17, 18));
        body.push(['@render.2', rect(-W - 10, -40, 2 * W + 20, 5)], ['@render.1', rect(-W - 10, -36, 2 * W + 20, 1.2)], ['@fascia.0', rect(-70, -68, 160, 7)]);
        body.push(['@red.3', rect(-W, -4, 2 * W, 4)]);
        const tx = -W - 30, tw = 34, th = 168;
        body.push(['@render.0', rect(tx, -th, tw, th)], ['#000000', rect(tx + tw * .62, -th, tw * .38, th), .14], ['@frame.2', rect(tx + 12, -th + 18, 10, 110)]);
        for (let j = 0; j < 5; j++) body.push({ f: '@glass.0', d: rect(tx + 13, -th + 19 + j * 22, 8, 20.4), glow: 'window' });
        let fins = ''; for (let j = 0; j < 4; j++) fins += rect(tx - 2, -th + 6 + j * 4, tw + 4, 1.6); body.push(['@render.2', fins], ['@render.2', rect(tx - 4, -th - 4, tw + 8, 4)]);
        dress(body, ctx, r, { planters: [[W + 16, 22], [-W + 30, 22]], snow: [[-W - 10, -40, 2 * W + 20], [-W - 3, -H - 4, 2 * W + 6], [tx - 4, -th - 4, tw + 8]], leaves: [tx, W] });
        lit.push(wash(0, -50, 140, 50, .25), wash(0, 2, 120, 12, .35, '@spill'));
      }
      return { body, lit };
    },
  });

  /* ---------- building.ticket-hall: a street-level glazed ticket-hall front with the hall seen inside (tiled wall, gate line, lights); v0 1930s bronze grid, v1 frameless modern glass, v2 Victorian iron arches ---------- */
  defineObj({
    id: 'building.ticket-hall', category: 'building', size: [250, 130], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: pal({ tile: ['#e8e2d0', '#cfc8b4', '#2e6a5a'], floor: ['#8a8680', '#6a6660'], gate: ['#9aa2a8', '#5a646c', '#d84a3a', '#3aa060'], glass: ['#5a6e7c', '#cfe0ea'], frame: ['#7a5a32', '#c8ced2', '#2e3438'],
      wall: ['#a24c36', '#7e3828', '#d8d2c4', '#5a2a1e'], light: '#fbf8ec', door: '#2a2a2e' }),
    night: { glow: { window: '#fff2cc', lamp: '#ffffff' }, on: 1 },
    shadow: { rx: 120, ry: 8, h: 110 },
    tags: ['uk', 'london', 'station', 'ticket-hall', 'glazing', 'interior', 'kit:london', 'kit:urban', 'role:building-near'],
    credit: 'after London ticket-hall frontages of three periods; generic, no marks',
    build(v, r, ctx) {
      const body = [], lit = [];
      const W = 116, H = v === 2 ? 112 : 100;
      // the hall inside: a tiled back wall with a coloured band, the floor, a gate line, ceiling lights
      body.push(['@tile.0', rect(-W, -H, 2 * W, H)], { s: '@tile.1', w: .5, op: .6, d: Array.from({ length: 14 }, (_, i) => `M${-W} ${-H + i * 7}H${W}`).join('') + Array.from({ length: 34 }, (_, i) => `M${-W + i * 7} ${-H}V0`).join(''), detail: true }, ['@tile.2', rect(-W, -46, 2 * W, 5)]);
      body.push(['@floor.0', rect(-W, -12, 2 * W, 12)], ['@floor.1', rect(-W, -12, 2 * W, 1.4)]);
      for (let i = 0; i < 7; i++) { const gx = -84 + i * 28; body.push(['@gate.1', rect(gx - 4, -30, 8, 20)], ['@gate.0', rect(gx - 4, -30, 8, 3)], ['@gate.' + (i % 2 ? 2 : 3), rect(gx - 1.6, -26, 3.2, 1.6)], ['@gate.0', `M${gx + 4} -24h7l1 4h-8z`, .8]); }
      for (let x = -90; x <= 90; x += 45) body.push({ f: '@light', d: rect(x - 10, -H + 6, 20, 3), glow: 'lamp' });
      // the glazing over it
      if (v === 0) {
        const cols = 6, cw = (2 * W - 8) / cols, rh = (H - 4) / 3;
        for (let i = 0; i < cols; i++) for (let j = 0; j < 3; j++) { const x = -W + 4 + i * cw, y = -H + 4 + j * rh; body.push({ f: '@glass.0', d: rect(x, y, cw, rh), glow: 'window', op: j === 0 ? .55 : .3 }); }
        body.push(['@glass.1', `M${-W} ${-H}h80l-80 64z`, .22]);
        let g = `M${-W + 2} ${-H}V0M${W - 2} ${-H}V0`; for (let i = 1; i < cols; i++) g += `M${f1(-W + 4 + i * cw)} ${-H}V0`; for (let j = 1; j < 3; j++) g += `M${-W} ${f1(-H + 4 + j * rh)}H${W}`;
        body.push({ s: '@frame.0', w: 3, d: g }, { s: '@frame.0', w: .7, d: Array.from({ length: cols }, (_, i) => `M${f1(-W + 4 + (i + .5) * cw)} ${-H + 4}V${f1(-H + 4 + rh)}`).join('') }, ['@frame.0', rect(-W, -H, 2 * W, 4)]);
        body.push(['@frame.0', rect(-30, -50, 60, 50), .0], { s: '@frame.0', w: 2, d: 'M0 0V-50' });
        body.push(['@frame.0', rect(-W - 4, -H - 8, 2 * W + 8, 8)], ['@frame.1', rect(-W - 4, -H - 8, 2 * W + 8, 1.4)]);
      } else if (v === 1) {
        body.push({ f: '@glass.0', d: rect(-W, -H, 2 * W, H), glow: 'window', op: .38 }, ['@glass.1', `M${-W} ${-H}h90l-90 70z`, .25]);
        let fin = ''; for (let x = -W; x <= W; x += 2 * W / 5) fin += `M${f1(x)} ${-H}V0`; body.push({ s: '@frame.1', w: 2.4, d: fin }, { s: '@frame.2', w: .6, d: fin, op: .5 });
        for (const x of [-30, 30]) body.push({ f: '@glass.0', d: rect(x - 18, -60, 36, 60), glow: 'window', op: .3 }, { s: '@frame.1', w: 1.4, d: `M${x} -60V0M${x - 18} -60h36` });
        body.push(['@frame.1', `M${-W - 14} ${-H - 10}H${W + 14}l-4 6H${-W - 10}z`], ['@frame.2', rect(-W - 14, -H - 10, 2 * W + 28, 1.4)]);
      } else {
        body.push(['@wall.0', rect(-W - 10, -H - 10, 2 * W + 20, H + 10)]);
        let cour = ''; for (let y = -H - 10; y < 0; y += 3.4) cour += `M${-W - 10} ${f1(y)}h${2 * W + 20}`; body.push({ s: '@wall.3', w: .5, op: .3, d: cour, detail: true });
        for (let i = 0; i < 3; i++) {
          const x = -W + 4 + i * 77, w = 70;
          body.push(['@wall.2', archD(x - 3, 0, w + 6, H + 3)], ['@tile.0', archD(x, 0, w, H)]);
          // re-draw the interior clipped by the arch: lights and gate line already sit below; glaze it
          body.push({ f: '@glass.0', d: archD(x, 0, w, H), glow: 'window', op: .5 });
          let bars = `M${x} -60h${w}M${x + w / 2} 0V${-H}`; for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; bars += `M${x + w / 2} ${-H + w / 2}L${f1(x + w / 2 + Math.cos(a) * w / 2)} ${f1(-H + w / 2 + Math.sin(a) * w / 2)}`; }
          body.push({ s: '@frame.2', w: 1.2, d: bars }, ['@wall.2', `M${x + w / 2 - 4} ${-H - 4}h8l-1 8h-6z`]);
          // the hall behind each arch shows through (gates, floor) as a dark lower band
          body.push(['@gate.1', rect(x + 6, -30, w - 12, 18), .55], ['@floor.0', rect(x, -12, w, 12), .9]);
        }
        body.push(['@wall.2', rect(-W - 12, -H - 14, 2 * W + 24, 5)]);
      }
      dress(body, ctx, r, { planters: v === 2 ? [] : [[-W - 14, 22]], snow: [[-W - 14, -H - 10, 2 * W + 28]], leaves: [-W, W] });
      if (ctx.season === 'winter' && v === 2) body.push(['@floor.0', rect(-W, -2, 2 * W, 2), .4]);
      lit.push(wash(0, -50, 140, 60, .25), wash(0, 4, 130, 16, .45, '@spill'));
      return { body, lit };
    },
  });
})();
