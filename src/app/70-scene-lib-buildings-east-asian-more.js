/* ============================================================
   SCENE LIBRARY: buildings, the east-asian kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   (variant, season).

   building.pagoda       a tiered pagoda on a stone plinth: storeys that
                         step in, bracket bands, deep eaves with a gentle
                         upward sweep (rafters showing beneath), and a
                         spire of nine rings. v0 five tiers of dark timber
                         and white plaster, v1 three tiers in vermilion,
                         v2 five tiers in vermilion, v3 a seven-tier
                         octagonal masonry pagoda with short upturned eaves
                         and corner bells.
   building.temple-hall  a generic East Asian temple hall on a podium:
                         columns, lattice doors, bracket sets and a great
                         hip-and-gable roof with ridge-end fins. v0
                         Japanese (dark tile, natural timber), v1 Chinese
                         (green glazed tile, red columns, strong upturn),
                         v2 double-eaved with a copper-green roof.

   No figures, emblems or inscriptions. Snow lies on every roof in winter;
   azaleas at the plinth change with the season. Doors and windows light at
   real dusk; a floodlight wash is the 'lit' part. Lit from the LEFT.
   Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const P = p => `${f1(p[0])} ${f1(p[1])}`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const stable = (id, v) => sceneRnd(sceneHash(id + '#' + v));
  const lobed = (r, cx, cy, rx, ry, n, rag) => {
    const a0 = r() * 6.283, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, k = 1 - rag * r() * .6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = 'M' + P(pts[0]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], b = 1.22 + rag * r() * .3; d += `Q${f1(cx + ((p[0] + q[0]) / 2 - cx) * b)} ${f1(cy + ((p[1] + q[1]) / 2 - cy) * b)} ${P(q)}`; }
    return d + 'z';
  };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const SHRUB = bySeason({
    shrub: { spring: ['#3a6a30', '#5a8a3c', '#e27aa0'], summer: ['#2a5428', '#3e7034', '#4e8240'], autumn: ['#7a2e1e', '#a8442a', '#d0702e'], winter: ['#3e4a34', '#55603e', '#6a7048'] },
  });

  /**
   * An eave roof (o: yb the eave line at the middle, ew the half width at the corners, tw the half width at the top,
   * rh the slope height, up the corner lift, ft the fascia, curl a hooked tip, snow): pushes shapes, returns the top y.
   * Paint slots by name in o.pal: roof, roofD, roofL, fascia, rafter.
   */
  const roof = (out, o) => {
    const { yb, ew, tw, rh, up = 8, ft = 5 } = o, pl = o.pal, yt = yb - ft - rh;
    const fb = x => yb - up * Math.pow(Math.abs(x) / ew, 2.2);                 // the fascia bottom (the eave line)
    const sY = x => { const u = Math.max(0, (Math.abs(x) - tw) / (ew - tw)); return yt + (fb(x) - ft - yt) * Math.pow(u, 1.7); };
    const curve = (f, dy, a, b, n = 12) => { let d = ''; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; d += (i ? 'L' : '') + `${f1(x)} ${f1(f(x) + dy)}`; } return d; };
    // rafters under the eave, then the fascia, then the tiled slope
    const rw = o.rafterW || ew * .86;
    out.push([pl.rafter, `M${curve(fb, 0, -rw, rw)}L${curve(x => fb(x), 6, rw, -rw).slice(0)}z`]);
    let raf = ''; for (let x = -rw + 3; x < rw; x += 4.5) raf += `M${f1(x)} ${f1(fb(x))}v5`;
    out.push({ s: pl.fascia, w: 1, op: .55, d: raf }, ['#000000', `M${curve(fb, 0, -rw, rw)}L${curve(fb, 3, rw, -rw)}z`, .2]);
    const slope = `M${curve(sY, 0, -ew, -tw, 10)}L${f1(tw)} ${f1(yt)}L${curve(sY, 0, tw, ew, 10)}L${curve(fb, -ft, ew, -ew, 16)}z`;
    out.push([pl.roof, slope]);
    let tl = ''; for (let x = -ew + 5; x < ew - 3; x += o.tile || 5.5) tl += `M${f1(x)} ${f1(fb(x) - ft)}V${f1(sY(x) + 1)}`;
    out.push({ s: pl.roofL, w: .9, op: .35, d: tl });
    out.push([pl.roofD, `M0 ${f1(yt)}L${f1(tw)} ${f1(yt)}L${curve(sY, 0, tw, ew, 10)}L${curve(fb, -ft, ew, 0, 8)}z`, .28]);
    out.push({ s: pl.roofL, w: 1.8, op: .8, d: `M${curve(sY, 0, -ew, -tw, 10)}M${curve(sY, 0, tw, ew, 10)}` });
    out.push([pl.fascia, `M${curve(fb, 0, -ew, ew, 16)}L${curve(fb, -ft, ew, -ew, 16)}z`]);
    out.push({ s: pl.roofL, w: .8, op: .6, d: `M${curve(fb, -ft + .4, -ew, ew, 16)}` });
    if (o.curl) for (const s of [-1, 1]) out.push([pl.fascia, `M${f1(s * (ew - 4))} ${f1(fb(ew) - ft)}Q${f1(s * (ew + 6))} ${f1(fb(ew) - ft - 2)} ${f1(s * (ew + 9))} ${f1(fb(ew) - ft - o.curl)}Q${f1(s * (ew + 4))} ${f1(fb(ew) - 2)} ${f1(s * (ew - 6))} ${f1(fb(ew) + .5)}z`]);
    if (o.bells) for (const s of [-1, 1]) out.push({ s: pl.fascia, w: .7, d: `M${f1(s * (ew - 2))} ${f1(fb(ew))}v5` }, [o.bells, `M${f1(s * (ew - 2) - 2.2)} ${f1(fb(ew) + 9)}q2.2 -6 4.4 0z`]);
    if (o.snow) {
      const a = ew * .9;
      snowTiles(out, `M${curve(sY, -1.5, -a, -tw, 8)}L${f1(tw)} ${f1(yt - 1.5)}L${curve(sY, -1.5, tw, a, 8)}`, a, sY, x => fb(x) - ft - 1, (o.tile || 5.5) * 2, sceneRnd(sceneHash('snow' + f1(yb) + f1(ew))));
      out.push({ s: '@snow.0', w: 1.8, op: .85, d: `M${curve(fb, -ft - .6, -ew + 3, ew - 3, 16)}` }, ['@snow.1', `M0 ${f1(yt - 1.5)}L${f1(tw)} ${f1(yt - 1.5)}L${curve(sY, -1.5, tw, a, 8)}L${f1(a * .3)} ${f1(sY(a * .3) + rh * .3)}z`, .4]);
    }
    return yt;
  };
  /**
   * Snow on a tiled slope: from the top edge (topD, ending at x = a) down to a soft, seeded hem whose tongues run down the
   * tile channels (step apart), with a blue-grey under-edge and the tile ridges showing through. top(x) / bot(x): the slope.
   */
  const snowTiles = (out, topD, a, top, bot, step, z, k = .42) => {
    const n = Math.max(4, Math.round(2 * a / step)), Y = (x, f) => top(x) + (bot(x) - top(x)) * f;
    let d = topD + `L${f1(a)} ${f1(Y(a, k))}`, rd = '';
    for (let j = n - 1; j >= 0; j--) {
      const x = -a + j * 2 * a / n, xm = x + a / n, y = Y(x, k + rr(z, -.07, .07));
      d += `Q${f1(xm)} ${f1(Y(xm, Math.min(1.1, k + rr(z, 0, .45))))} ${f1(x)} ${f1(y)}`;
      if (j) rd += `M${f1(x)} ${f1(top(x) + 1)}V${f1(y - 1)}`;
    }
    out.push({ f: '@snow.1', d: d + 'z', op: .55, m: [1, 0, 0, 1, .8, 1.6] }, ['@snow.0', d + 'z'], { s: '@snow.1', w: .8, op: .55, d: rd, detail: true });
  };
  /** A soft glow on an opening or a lantern (the lit part): a radial gradient that fades to nothing at its own edge. */
  const halo = (cx, cy, r, a = .55) => ({ f: { rad: [[0, '@flood', a], [.35, '@flood', a * .45], [1, '@flood', 0]], cx: f1(cx), cy: f1(cy), r: f1(r) }, d: ell(cx, cy, r, r) });
  /** Azaleas either side (seasonal), and snow on them in winter. */
  const shrubs = (r, out, xs, s) => {
    const a = ['', ''], b = ['', ''];
    let fl = '';
    for (const x0 of xs) for (let i = 0; i < 4; i++) {
      const x = x0 + rr(r, -16, 16), rx = rr(r, 10, 16), ry = rr(r, 7, 11);
      a[i % 2] += lobed(r, x, -ry * .8, rx, ry, 10, .3);
      b[i % 2] += lobed(r, x - rx * .25, -ry * 1.1, rx * .55, ry * .5, 7, .3);
      if (s === 'spring') for (let k = 0; k < 6; k++) fl += ell(x + rr(r, -rx, rx) * .8, -ry * rr(r, .5, 1.5), 1.6, 1.4);
    }
    out.push(['@shrub.0', a[0]], ['@shrub.1', a[1]], ['@shrub.1', b[0], .9], ['@shrub.2', b[1], .7]);
    if (fl) out.push(['@shrub.2', fl]);
    if (s === 'winter') out.push(['@snow.0', b[0] + b[1], .9]);
  };

  /* ---------- building.pagoda ---------- */
  const PG = [
    { n: 5, bw0: 96, step: .1, h0: 46, hu: 30, oh: 44, rh: 20, up: 9, style: 'jp' },
    { n: 3, bw0: 104, step: .13, h0: 52, hu: 38, oh: 48, rh: 24, up: 10, style: 'jp' },
    { n: 5, bw0: 92, step: .1, h0: 46, hu: 32, oh: 44, rh: 20, up: 10, style: 'jp' },
    { n: 7, bw0: 84, step: .075, h0: 44, hu: 30, oh: 22, rh: 11, up: 12, style: 'cn' },
  ];
  defineObj({
    id: 'building.pagoda', category: 'building', size: [300, 470], variants: 4, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      wall: ['#ece6d6', '#f2ead8', '#f2ead8', '#d9ccae'], wallD: ['#c8c0ae', '#d0c6b2', '#d0c6b2', '#b4a688'], post: ['#4a3428', '#c0432a', '#c0432a', '#9a8a6a'],
      roof: ['#3e4248', '#3a4642', '#3e4248', '#56665e'], roofD: '#101418', roofL: ['#6a7078', '#647068', '#6a7078', '#8a9a90'], fascia: ['#26282c', '#2a302e', '#26282c', '#3a4640'],
      rafter: ['#c8b08a', '#e0c070', '#e0c070', '#c8b896'], bracket: ['#5a4030', '#2f6a5a', '#2f6a5a', '#8a7a5a'], glass: ['#2a2420', '#5a4a3a'], door: ['#6a4a30', '#8a2c1e'],
      stone: ['#a8a294', '#8a8478', '#c4bfb2'], bronze: ['#6a5a3a', '#a8904a', '#3e3424'], bell: '#3a4038', flood: '#ffe2b0', snow: ['#f6f8fc', '#c8d4e4'], ground: '#5a5040',
    } }, SHRUB),
    night: { glow: { window: '#ffcf80' }, on: .85 },
    shadow: { rx: 120, ry: 12, h: 440 },
    tags: ['japan', 'china', 'east-asia', 'pagoda', 'temple', 'tower', 'signature', 'kit:east-asian', 'role:building-mid'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('building.pagoda', v), s = ctx.season, c = PG[v], body = [], lit = [];
      const pal = { roof: `@roof.${v}`, roofD: '@roofD', roofL: `@roofL.${v}`, fascia: `@fascia.${v}`, rafter: `@rafter.${v}` };
      const cn = c.style === 'cn', pw = c.bw0 / 2 + 34;
      // the plinth: two stone courses and front steps
      body.push(['@ground', ell(0, 0, pw + 20, 4), .45], ['@stone.0', rect(-pw, -14, pw * 2, 14)], ['@stone.2', rect(-pw - 3, -15, pw * 2 + 6, 3)], ['@stone.1', rect(pw * .55, -12, pw * .45, 12), .45]);
      body.push({ s: '@stone.1', w: .8, op: .6, d: `M${f1(-pw)} -7H${f1(pw)}` + Array.from({ length: 8 }, (_, i) => `M${f1(-pw + (i + .5) * pw / 4)} ${i % 2 ? -14 : -7}v7`).join('') }, ['@stone.2', rect(-16, -5, 32, 5)], ['@stone.0', rect(-14, -10, 28, 5)]);
      if (s === 'winter') body.push(['@snow.0', `M${f1(-pw - 3)} -15q${f1(pw)} -4 ${f1(pw * 2 + 6)} 0v2h${f1(-pw * 2 - 6)}z`]);
      let y = -14, top = 0;
      for (let i = 0; i < c.n; i++) {
        const bw = c.bw0 * (1 - c.step * i), bh = i === 0 ? c.h0 : c.hu, x0 = -bw / 2;
        // the storey: wall, its shaded right side, posts, the door (lit at dusk), a railing on the upper storeys
        body.push([`@wall.${v}`, rect(x0, y - bh, bw, bh)], [`@wallD.${v}`, rect(bw * .22, y - bh, bw * .28, bh), .5]);
        if (cn) {
          body.push({ s: `@wallD.${v}`, w: .7, op: .6, d: Array.from({ length: Math.floor(bh / 6) }, (_, k) => `M${f1(x0)} ${f1(y - 3 - k * 6)}h${f1(bw)}`).join('') });
          for (const sx of [-.33, .33]) body.push([`@post.${v}`, `M${f1(sx * bw - 5)} ${f1(y - bh * .2)}v${f1(-bh * .4)}q5 -7 10 0v${f1(bh * .4)}z`, .7]);
          body.push(['@door.0', `M-7 ${f1(y - 2)}v${f1(-bh * .5)}q7 -9 14 0v${f1(bh * .5)}z`], { f: '@glass.0', d: `M-5 ${f1(y - 4)}v${f1(-bh * .46)}q5 -7 10 0v${f1(bh * .46)}z`, glow: 'window' });
          lit.push(halo(0, y - bh * .3, bh * .5));
        } else {
          const dw = bw * .26, dh = bh * .64;
          let posts = ''; for (const px of [x0, x0 + bw * .32, x0 + bw * .68 - 4, x0 + bw - 4]) posts += rect(px, y - bh, 4, bh);
          body.push([`@post.${v}`, posts], [`@post.${v}`, rect(x0, y - bh * .55, bw, 3)]);
          body.push(['@door.' + (v === 0 ? 0 : 1), rect(-dw / 2 - 2, y - dh - 2, dw + 4, dh + 2)], { f: '@glass.0', d: rect(-dw / 2, y - dh, dw, dh), glow: 'window' }, { s: `@post.${v}`, w: 1.2, d: `M0 ${f1(y - dh)}v${f1(dh)}` + Array.from({ length: 4 }, (_, k) => `M${f1(-dw / 2)} ${f1(y - dh + (k + 1) * dh / 5)}h${f1(dw)}`).join('') });
          for (const sx of [-1, 1]) body.push({ f: '@glass.0', d: rect(sx * bw * .34 - 5, y - bh * .78, 10, bh * .26), glow: 'window' }, { s: `@post.${v}`, w: .8, d: `M${f1(sx * bw * .34 - 1.6)} ${f1(y - bh * .78)}v${f1(bh * .26)}M${f1(sx * bw * .34 + 1.6)} ${f1(y - bh * .78)}v${f1(bh * .26)}` }) && lit.push(halo(sx * bw * .34, y - bh * .65, bh * .32, .42));
          lit.push(halo(0, y - dh / 2, dh * .85));
          if (i > 0) body.push([`@bracket.${v}`, rect(x0 - 7, y - 7, bw + 14, 3)], { s: `@bracket.${v}`, w: 1, d: Array.from({ length: Math.round((bw + 14) / 6) }, (_, k) => `M${f1(x0 - 6 + k * 6)} ${f1(y - 4)}v4`).join('') }, [`@bracket.${v}`, rect(x0 - 7, y - 1.2, bw + 14, 1.2)]);
        }
        // the bracket band, then the eave roof
        const yb = y - bh - 8;
        body.push([`@bracket.${v}`, rect(x0 - 4, yb, bw + 8, 8)]);
        let bk = ''; for (let k = 0; k <= 6; k++) bk += rect(x0 - 3 + k * (bw + 2) / 6, yb + 1.5, 4, 4);
        body.push([`@rafter.${v}`, bk, .8], ['#000000', rect(x0, yb + 8, bw, 3), .18]);
        const last = i === c.n - 1, nbw = last ? (cn ? 10 : 8) : c.bw0 * (1 - c.step * (i + 1));
        const ew = bw / 2 + c.oh * (1 - i * .04);
        y = roof(body, { yb, ew, tw: nbw / 2 + 1, rh: last ? c.rh + (cn ? 22 : 30) : c.rh, up: c.up, pal, curl: cn ? 7 : 0, bells: cn ? '@bell' : null, snow: s === 'winter', rafterW: bw / 2 + c.oh * .8 });
        top = y;
      }
      // the spire: a base block, nine rings on a mast (or a gourd finial on the octagonal pagoda)
      if (cn) {
        body.push(['@bronze.0', rect(-6, top - 6, 12, 6)], ['@bronze.1', ell(0, top - 13, 7, 7)], ['@bronze.1', ell(0, top - 24, 5, 5)], { s: '@bronze.0', w: 2.4, d: `M0 ${f1(top - 28)}v-18` }, ['@bronze.2', ell(2, top - 13, 4, 6), .4]);
      } else {
        body.push(['@bronze.2', rect(-9, top - 8, 18, 8)], ['@bronze.0', rect(-11, top - 10, 22, 3)], { s: '@bronze.0', w: 3.4, d: `M0 ${f1(top - 8)}v-80` });
        let rings = ''; for (let k = 0; k < 9; k++) rings += ell(0, top - 18 - k * 5.6, 7.4 - k * .22, 1.5);
        body.push({ s: '@bronze.1', w: 1.6, d: rings }, { s: '@bronze.0', w: 1.6, d: `M0 ${f1(top - 74)}c-9 -2 -9 -10 -3 -14M0 ${f1(top - 74)}c9 -2 9 -10 3 -14` }, ['@bronze.1', ell(0, top - 92, 3.2, 3.6)]);
      }
      shrubs(r, body, [-pw - 6, pw + 6], s);
      lit.unshift(halo(0, -14, pw + 24, .24));   // a soft pool of light on the plinth, under the openings' own glows
      return { body, lit };
    },
  });

  /* ---------- building.temple-hall ---------- */
  defineObj({
    id: 'building.temple-hall', category: 'building', size: [480, 270], variants: 3, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      wall: ['#ece6d6', '#e8dcc0', '#ece6d6'], col: ['#6a4a32', '#b0281e', '#7a5638'], colD: ['#4a3222', '#7a1a14', '#563c26'], beam: ['#5a4030', '#2a6a5a', '#6a4a32'], beamB: ['#c8b08a', '#3a5a9a', '#d0b890'],
      roof: ['#3c4046', '#2f7a4a', '#5a9a8a'], roofD: '#0e1214', roofL: ['#686e76', '#d8b040', '#8ac4b4'], fascia: ['#26282c', '#1e4a30', '#2e5a50'], rafter: ['#c8b08a', '#c83a2a', '#d0b890'],
      ridge: ['#2a2c30', '#d8a830', '#3a6a60'], glass: ['#2a2420', '#5a4a3a'], lattice: ['#5a3e2a', '#c0302a', '#6a4a32'],
      stone: ['#aaa496', '#8a8478', '#c6c1b4'], flood: '#ffe2b0', snow: ['#f6f8fc', '#c8d4e4'], ground: '#5a5040', gold: '#d8b040',
    } }, SHRUB),
    night: { glow: { window: '#ffcf80' }, on: .9 },
    shadow: { rx: 230, ry: 14, h: 240 },
    tags: ['japan', 'china', 'korea', 'east-asia', 'temple', 'hall', 'shrine', 'roof', 'signature', 'kit:east-asian', 'role:building-mid'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('building.temple-hall', v), s = ctx.season, body = [], lit = [];
      const W = v === 2 ? 320 : 360, hw = W / 2, pod = 22, Hc = v === 2 ? 70 : 84, cn = v === 1;
      const pal = { roof: `@roof.${v}`, roofD: '@roofD', roofL: `@roofL.${v}`, fascia: `@fascia.${v}`, rafter: `@rafter.${v}` };
      // the podium with its steps
      body.push(['@ground', ell(0, 0, hw + 60, 5), .45], ['@stone.0', rect(-hw - 30, -pod, W + 60, pod)], ['@stone.2', rect(-hw - 33, -pod - 3, W + 66, 4)], ['@stone.1', rect(hw * .5, -pod + 1, hw * .5 + 30, pod - 1), .4]);
      body.push({ s: '@stone.1', w: .8, op: .55, d: `M${-hw - 30} -11H${hw + 30}` + Array.from({ length: 14 }, (_, i) => `M${f1(-hw - 30 + (i + .5) * (W + 60) / 14)} ${i % 2 ? -pod : -11}v11`).join('') });
      for (let k = 0; k < 4; k++) body.push([k % 2 ? '@stone.0' : '@stone.2', rect(-46 + k * 2, -pod + k * 5.5, 92 - k * 4, 5.5)]);
      if (s === 'winter') body.push(['@snow.0', `M${-hw - 33} -${pod + 3}q${hw + 33} -4 ${W + 66} 0v2.4h${-W - 66}z`]);
      // columns and bays: lattice doors in the middle bays, plaster panels at the ends
      const n = 5, bay = W / n, yc = -pod - Hc;
      for (let i = 0; i < n; i++) {
        const bx = -hw + i * bay, mid = i > 0 && i < n - 1;
        if (mid) {
          body.push(['@glass.1', rect(bx + 5, yc + 8, bay - 10, Hc - 8)], { f: '@glass.0', d: rect(bx + 7, yc + 10, bay - 14, Hc - 26), glow: 'window' });
          lit.push(halo(bx + bay / 2, yc + Hc * .45, bay * .7, .42));
          let lt = ''; for (let k = 1; k < 8; k++) lt += `M${f1(bx + 7 + k * (bay - 14) / 8)} ${f1(yc + 10)}v${f1(Hc - 26)}`; for (let k = 1; k < 7; k++) lt += `M${f1(bx + 7)} ${f1(yc + 10 + k * (Hc - 26) / 7)}h${f1(bay - 14)}`;
          body.push({ s: `@lattice.${v}`, w: 1.3, d: lt }, { s: `@lattice.${v}`, w: 2.4, d: `M${f1(bx + bay / 2)} ${f1(yc + 10)}v${f1(Hc - 10)}` }, [`@lattice.${v}`, rect(bx + 7, -pod - 16, bay - 14, 14)]);
        } else {
          body.push([`@wall.${v}`, rect(bx + 4, yc + 8, bay - 8, Hc - 8)], [`@col.${v}`, rect(bx + 4, yc + Hc * .5, bay - 8, 3)], [`@col.${v}`, rect(bx + 4, -pod - 18, bay - 8, 18)], { s: `@colD.${v}`, w: 1, op: .6, d: `M${f1(bx + bay / 2)} ${f1(-pod - 18)}v18` });
          lit.push(halo(bx + bay / 2, yc + 22, 22, .42));
          body.push({ f: '@glass.0', d: rect(bx + bay / 2 - 10, yc + 14, 20, 16), glow: 'window' }, { s: `@lattice.${v}`, w: 1.1, d: Array.from({ length: 5 }, (_, k) => `M${f1(bx + bay / 2 - 10 + (k + .5) * 4)} ${f1(yc + 14)}v16`).join('') });
        }
      }
      body.push(['#000000', rect(-hw, yc + 8, W, 10), .2]);
      for (let i = 0; i <= n; i++) { const x = -hw + i * bay; body.push([`@col.${v}`, rect(x - 5, yc, 10, Hc)], [`@colD.${v}`, rect(x + 1, yc, 4, Hc), .7], ['@stone.2', rect(x - 7, -pod - 4, 14, 4)]); }
      // the beam, the painted band, the bracket sets
      body.push([`@beam.${v}`, rect(-hw - 8, yc - 10, W + 16, 10)], [`@beamB.${v}`, rect(-hw - 8, yc - 7, W + 16, 3.4), .9]);
      if (cn) { let pt = ''; for (let k = 0; k < 24; k++) pt += rect(-hw - 6 + k * (W + 12) / 24, yc - 9, 6, 2); body.push(['@gold', pt]); }
      const yb0 = yc - 24;
      body.push([`@beam.${v}`, rect(-hw - 12, yb0, W + 24, 14)]);
      let bk = ''; for (let k = 0; k <= 15; k++) { const x = -hw - 10 + k * (W + 20) / 15; bk += rect(x - 4, yb0 + 2, 8, 4) + rect(x - 2.5, yb0 + 7, 5, 5); }
      body.push([`@rafter.${v}`, bk, .85], ['#000000', rect(-hw - 12, yb0 + 14, W + 24, 4), .2]);
      // the roof: hip below (v2: a pent roof first, then an upper wall), then the gable, the ridge and its end fins
      const snow = s === 'winter';
      let yt;
      if (v === 2) {
        const y1 = roof(body, { yb: yb0, ew: hw + 40, tw: hw - 40, rh: 26, up: 8, pal, snow, rafterW: hw + 30 });
        const uw = W - 90, uh = 34;
        body.push([`@wall.${v}`, rect(-uw / 2, y1 - uh, uw, uh)], [`@beam.${v}`, rect(-uw / 2 - 4, y1 - uh - 10, uw + 8, 10)]);
        for (let k = 0; k <= 4; k++) body.push([`@col.${v}`, rect(-uw / 2 + k * uw / 4 - 3, y1 - uh, 6, uh)]);
        for (let k = 0; k < 4; k++) { const x = -uw / 2 + (k + .5) * uw / 4; body.push({ f: '@glass.0', d: rect(x - 14, y1 - uh + 8, 28, 16), glow: 'window' }, { s: `@lattice.${v}`, w: 1, d: Array.from({ length: 6 }, (_, j) => `M${f1(x - 14 + (j + .5) * 28 / 6)} ${f1(y1 - uh + 8)}v16`).join('') }); lit.push(halo(x, y1 - uh + 16, 26, .42)); }
        yt = roof(body, { yb: y1 - uh - 10, ew: uw / 2 + 56, tw: uw / 2 * .55, rh: 40, up: 10, pal, snow, rafterW: uw / 2 + 40 });
      } else {
        yt = roof(body, { yb: yb0, ew: hw + (cn ? 46 : 56), tw: hw * .6, rh: cn ? 40 : 46, up: cn ? 16 : 10, pal, curl: cn ? 10 : 0, snow, tile: 5, rafterW: hw + 40 });
      }
      const tw = v === 2 ? (W - 90) / 2 * .55 : hw * .6, gh = v === 2 ? 30 : 38;
      body.push([`@roof.${v}`, `M${f1(-tw)} ${f1(yt + 1)}L${f1(-tw * .9)} ${f1(yt - gh)}H${f1(tw * .9)}L${f1(tw)} ${f1(yt + 1)}z`], ['@roofD', `M0 ${f1(yt + 1)}V${f1(yt - gh)}H${f1(tw * .9)}L${f1(tw)} ${f1(yt + 1)}z`, .26]);
      let tl = ''; for (let x = -tw * .9 + 3; x < tw * .9; x += 5) tl += `M${f1(x)} ${f1(yt)}V${f1(yt - gh + 2)}`;
      body.push({ s: `@roofL.${v}`, w: .9, op: .35, d: tl }, ['#000000', rect(-tw, yt - 1, tw * 2, 2.4), .3]);
      if (snow) snowTiles(body, `M${f1(-tw * .9)} ${f1(yt - gh - 1.5)}H${f1(tw * .9)}`, tw * .9, () => yt - gh, () => yt - 1, 10, stable('gable', v), .45);
      const ry = yt - gh;
      body.push([`@ridge.${v}`, rect(-tw * .94, ry - 9, tw * 1.88, 10)], [`@roofL.${v}`, rect(-tw * .94, ry - 9, tw * 1.88, 2), .7]);
      for (const sd of [-1, 1]) {
        const ex = sd * tw * .94;
        if (cn) body.push([`@ridge.${v}`, `M${f1(ex - sd * 10)} ${f1(ry - 8)}q${f1(sd * 14)} -2 ${f1(sd * 16)} -14q${f1(sd * 2)} -6 ${f1(-sd * 4)} -6q${f1(-sd * 5)} 1 ${f1(-sd * 2)} 5q${f1(sd * 3)} 2 ${f1(sd * 2)} -2l${f1(sd * 2)} 1q0 8 ${f1(-sd * 6)} 10l${f1(-sd * 6)} 6z`]);
        else body.push([`@ridge.${v}`, `M${f1(ex - sd * 12)} ${f1(ry - 8)}q${f1(sd * 8)} -4 ${f1(sd * 8)} -16q${f1(sd * 6)} 4 ${f1(sd * 8)} 16z`], [`@roofL.${v}`, `M${f1(ex - sd * 4)} ${f1(ry - 23)}q${f1(sd * 2)} 8 ${f1(sd * 3)} 14l${f1(-sd * 1.4)} 0q0 -8 ${f1(-sd * 1.6)} -14z`, .6]);
      }
      if (snow) body.push({ s: '@snow.0', w: 3, d: `M${f1(-tw * .94)} ${f1(ry - 9.5)}h${f1(tw * 1.88)}` });
      shrubs(r, body, [-hw - 50, hw + 50], s);
      // night: lanterns hang either side of the doors, each with its own soft glow; a faint pool of light on the steps
      for (const sx of [-bay * 1.5, bay * 1.5]) body.push({ s: '#2a2420', w: .8, d: `M${f1(sx)} ${f1(yc)}v10` }, ['#c0402a', ell(sx, yc + 17, 5.5, 7)], { f: '#e06a3a', d: ell(sx - 1, yc + 16, 2.6, 4.4), glow: 'window' }) && lit.push(halo(sx, yc + 17, 22, .75));
      lit.unshift(halo(0, -pod, hw * .7, .2));
      return { body, lit };
    },
  });
})();
