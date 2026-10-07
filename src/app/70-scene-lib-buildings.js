/* ============================================================
   SCENE LIBRARY: buildings (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Village buildings after the Yateley Green views (the cottages round the
   green and St Peter's, K.stPeters): front elevations lit from the LEFT,
   windows that light at real dusk (glow 'window'), a seeded share of them
   on. Anchor: the ground at the middle of the front wall.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  /** A sash or casement window: frame, glass (glow), glazing bars, sill. Returns shapes. */
  const win = (x, y, w, h, o = {}) => {
    const out = [['@frame', rect(x - 1.6, y - 1.6, w + 3.2, h + 3.2)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', `M${f1(x)} ${f1(y)}h${f1(w * .45)}l${f1(-w * .45)} ${f1(h * .55)}z`, .35]];
    if (o.bars !== false) out.push({ s: '@frame', w: 1, d: `M${f1(x + w / 2)} ${f1(y)}v${f1(h)}M${f1(x)} ${f1(y + h / 2)}h${f1(w)}` });
    if (o.arch) out.push(['@frame', `M${f1(x - 1.6)} ${f1(y)}q${f1(w / 2 + 1.6)} ${f1(-w * .7)} ${f1(w + 3.2)} 0z`]);
    out.push(['@sill', rect(x - 3, y + h + 1.4, w + 6, 2.4)]);
    return out;
  };

  /* ---------- building.cottage: v0 red-brick gable, v1 white render under thatch, v2 tile-hung; a front garden by season ---------- */
  defineObj({
    id: 'building.cottage', category: 'building', size: [188, 188], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: {
      brick: ['#a65a40', '#8a4632', '#c47a5a', '#6a3424'], render: ['#ece4d4', '#cfc4b0', '#fbf6ec', '#a89c88'], tilehang: ['#9a4a34', '#7a3626', '#b8664a', '#5a2a1e'],
      roof: ['#7a3e2e', '#5a2c20', '#9a5a44'], thatch: ['#a8884a', '#7a6234', '#c8a868'], slate: ['#4a4e56', '#3a3e46', '#6a6e78'],
      frame: '#efe9dc', glass: ['#3a4a5a', '#c8dce8'], sill: '#d8d0c0', door: ['#2f4a3a', '#5a2a2a', '#2a3a5a'], step: '#a8a094', chimney: ['#8a4632', '#5a3a2a'], pot: '#a0522d',
      path: '#b8ac94', hedge: ['#2c5530', '#467a3a'],
    } }, bySeason({
      bloom: { spring: ['#f6d21e', '#fbf6f0', '#e8c020'], summer: ['#d8506a', '#f4a0b4', '#e8e0f0'], autumn: ['#c86a2a', '#d8a040', '#9a5a2a'], winter: ['#5a4a3a', '#6a5a48', '#4a3e30'] },
      leaf: { spring: ['#3f7a32', '#79aa45'], summer: ['#2f6a2c', '#4f8a38'], autumn: ['#7a6a2a', '#a8803a'], winter: ['#4a5038', '#5e6048'] },
    })),
    night: { glow: { window: '#ffd98a' }, on: .65 },
    shadow: { rx: 100, ry: 10, h: 150 },
    tags: ['uk', 'village', 'green', 'cottage', 'house', 'kit:temperate', 'kit:london', 'role:building-mid'],
    credit: 'the Yateley Green view art (cottages round the green), redrawn',
    build(v, r, ctx) {
      const s = ctx.season, w = 150 + v * 10, h = 86, x0 = -w / 2, wy = -h;
      const wall = ['@brick', '@render', '@tilehang'][v], roof = v === 1 ? '@thatch' : v === 2 ? '@slate' : '@roof';
      const body = [];
      // the wall, its shade (right), courses or render texture
      body.push([wall + '.0', rect(x0, wy, w, h)], [wall + '.1', rect(x0 + w * .78, wy, w * .22, h), .55]);
      if (v === 0) body.push({ s: wall + '.3', w: .9, op: .35, d: Array.from({ length: 14 }, (_, i) => `M${f1(x0)} ${f1(wy + 6 + i * 6)}h${f1(w)}`).join('') });
      if (v === 2) { let t = ''; for (let row = 0; row < 7; row++) for (let i = 0; i < 16; i++) t += `M${f1(x0 + i * w / 16 + (row % 2) * w / 32)} ${f1(wy + row * 6)}q${f1(w / 32)} 5 ${f1(w / 16)} 0`; body.push({ s: wall + '.3', w: .9, op: .5, d: t }, [wall + '.0', rect(x0, wy + 44, w, h - 44)], ['@brick.1', rect(x0, wy + 44, w, 3)]); }
      if (v === 1) body.push(['@render.3', rect(x0, -6, w, 6), .5]);
      // the roof: thatch overhangs deeply with a rounded ridge; tiles and slate are straight
      const rh = v === 1 ? 74 : 62;
      if (v === 1) body.push([roof + '.0', `M${f1(x0 - 14)} ${f1(wy + 14)}Q${f1(x0 - 4)} ${f1(wy - rh * .5)} ${f1(x0 + w * .2)} ${f1(wy - rh)}H${f1(x0 + w * .8)}Q${f1(x0 + w + 4)} ${f1(wy - rh * .5)} ${f1(x0 + w + 14)} ${f1(wy + 14)}z`], [roof + '.1', `M${f1(x0 - 14)} ${f1(wy + 14)}H${f1(x0 + w + 14)}l-2 -5H${f1(x0 - 12)}z`], { s: roof + '.2', w: 1.4, op: .5, d: Array.from({ length: 22 }, (_, i) => { const t = (i + .5) / 22; return `M${f1(x0 + w * .22 + t * w * .56)} ${f1(wy - rh + 6)}L${f1(x0 - 6 + t * (w + 12))} ${f1(wy + 8)}`; }).join('') }, [roof + '.1', `M${f1(x0 + w * .2)} ${f1(wy - rh)}H${f1(x0 + w * .8)}v6H${f1(x0 + w * .2)}z`]);
      else body.push([roof + '.0', `M${f1(x0 - 8)} ${f1(wy + 3)}L${f1(x0 + w * .16)} ${f1(wy - rh)}H${f1(x0 + w * .84)}L${f1(x0 + w + 8)} ${f1(wy + 3)}z`], [roof + '.1', `M${f1(x0 + w * .84)} ${f1(wy - rh)}L${f1(x0 + w + 8)} ${f1(wy + 3)}H${f1(x0 + w * .7)}z`, .55], { s: roof + '.1', w: 1, op: .45, d: Array.from({ length: 6 }, (_, i) => { const t = (i + 1) / 7, y = wy - rh + rh * t; return `M${f1(x0 + w * .16 - (w * .16 + 8) * t)} ${f1(y)}H${f1(x0 + w * .84 + (w * .16 + 8) * t)}`; }).join('') }, [roof + '.2', `M${f1(x0 + w * .16)} ${f1(wy - rh)}H${f1(x0 + w * .84)}v2.5H${f1(x0 + w * .16)}z`, .8]);
      // a dormer in the thatch, chimneys
      const cx = x0 + w * (v === 1 ? .2 : .74);
      body.push(['@chimney.0', rect(cx, wy - rh - 18, 14, 30)], ['@chimney.1', rect(cx + 9, wy - rh - 18, 5, 30), .6], ['@chimney.1', rect(cx - 2, wy - rh - 20, 18, 4)], ['@pot', rect(cx + 2, wy - rh - 27, 4, 7)], ['@pot', rect(cx + 8, wy - rh - 26, 4, 6)]);
      // windows (two up, two down) and the door with its step and a little porch
      const ww = 20, wh = 22;
      body.push(...win(x0 + w * .14, wy + 10, ww, wh), ...win(x0 + w * .86 - ww, wy + 10, ww, wh));
      if (v === 1) body.push(['@thatch.0', `M${f1(x0 + w * .5 - 18)} ${f1(wy + 4)}q18 -24 36 0z`]), body.push(...win(x0 + w * .5 - 8, wy - 12, 16, 12, { bars: false }));
      body.push(...win(x0 + w * .12, wy + 48, ww + 4, wh + 2), ...win(x0 + w * .88 - ww - 4, wy + 48, ww + 4, wh + 2));
      const dx = x0 + w * .5 - 10;
      body.push([`@door.${v}`, rect(dx, -36, 20, 36)], ['@frame', rect(dx - 2, -38, 24, 2.4)], { f: '@glass.0', d: `M${f1(dx + 4)} -34h12v6h-12z`, glow: 'window' }, ['#d8b84a', ell(dx + 16, -18, 1.3, 1.3)], ['@step', rect(dx - 4, -3, 28, 3)]);
      body.push(['@roof.0', `M${f1(dx - 6)} -38L${f1(dx + 10)} -50L${f1(dx + 26)} -38z`], ['@roof.1', `M${f1(dx + 10)} -50L${f1(dx + 26)} -38h-7z`, .6]);
      // the front garden: a low hedge or flowers either side of the path, seasonal (bare in winter)
      const lf = ['', ''], bl = ['', '', ''];
      for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
        const x = (side < 0 ? x0 + 4 : x0 + w * .58 + 4) + i * (w * .38 / 9) + rr(r, -2, 2), y = rr(r, -3, 0), hh = s === 'winter' ? rr(r, 4, 7) : rr(r, 7, 13);
        lf[i % 2] += sceneD.lobed(r, x, y - hh * .5, rr(r, 5, 8), hh * .55, 7, .3);
        if (s !== 'winter') for (let j = 0; j < 2; j++) bl[(i + j) % 3] += ell(x + rr(r, -4, 4), y - hh * rr(r, .6, 1), 1.8, 1.8);
      }
      body.push(['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@bloom.0', bl[0]], ['@bloom.1', bl[1]], ['@bloom.2', bl[2]]);
      return { body };
    },
  });

  /* ---------- building.church: v0 flint tower with battlements, v1 stone broach spire, v2 timber belfry and shingled spire ---------- */
  defineObj({
    id: 'building.church', category: 'building', size: [212, 264], variants: 3, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      flint: ['#8a8a84', '#6a6a66', '#a8a8a0', '#4a4a48'], stone: ['#d6c79c', '#b8a77c', '#e8dcb8', '#8a7a58'], board: ['#5a4a40', '#3e322a', '#7a6a5c'], red: ['#a8432e', '#7a2c1e'],
      roof: ['#6a4636', '#553628', '#3e281e'], shingle: ['#4c423c', '#3a322e', '#6a5e54'], frame: '#efe9dc', glass: ['#2c3448', '#7a8aa8'], sill: '#c8bca8', door: '#3a2c24',
      clock: ['#2c3448', '#d8b84a'], vane: '#3a322e', flood: '#ffe8b0',
    } },
    night: { glow: { window: '#f2c070' }, on: .9 },
    shadow: { rx: 130, ry: 12, h: 240 },
    tags: ['uk', 'village', 'green', 'church', 'tower', 'spire', 'kit:temperate', 'kit:london', 'role:building-mid'],
    credit: "the nature kit's K.stPeters (St Peter's, Yateley), generalised",
    build(v) {
      const wall = v === 0 ? '@flint' : '@stone', body = [];
      // the nave (left) with its roof running along the view, lancet windows, a porch
      body.push([wall + '.0', 'M-172 0V-34H-14V0z'], [wall + '.1', 'M-172-8H-14V0H-172z', .6]);
      if (v === 0) { let fl = ''; for (let i = 0; i < 40; i++) fl += ell(-168 + (i * 37) % 150, -4 - (i * 13) % 28, 2.2, 1.6); body.push(['@flint.3', fl, .5], ['@stone.2', 'M-172-34h6V0h-6zM-20-34h6V0h-6z']); }
      body.push(['@roof.0', 'M-178-32L-150-66H-20L-8-32z'], ['@roof.1', 'M-178-32L-150-66L-140-32z', .6], { s: '@roof.2', w: 1, op: .35, d: 'M-170-40H-12M-162-50H-16M-154-59H-19' });
      for (let i = 0; i < 3; i++) { const wx = -150 + i * 36 + (i > 0 ? 18 : 0); body.push(['@frame', `M${wx - 1.4} -27.4h9.8v16.8h-9.8z`], { f: '@glass.0', d: `M${wx} -26h7v15h-7z`, glow: 'window' }, ['@frame', `M${wx - 1.4} -26q4.9-8 9.8 0z`], { s: '@frame', w: .8, d: `M${wx + 3.5} -26v15` }); }
      body.push(['@stone.2', 'M-112 0V-18H-90V0z'], ['@door', 'M-105 0V-12q4-5 8 0V0z'], ['@roof.0', 'M-116-16L-101-32-86-16z']);
      // the tower (right of the nave, nearest the viewer)
      if (v === 2) {
        body.push(['@red.0', 'M-28 0V-34H28V0z'], { s: '@red.1', w: 1, op: .55, d: 'M-22 0V-32M-14 0V-32M-6 0V-32M2 0V-32M10 0V-32M18 0V-32' }, ['@door', 'M-6 0V-14h10V0z']);
        for (const wx of [-22, 12]) body.push(['@frame', `M${wx - 1} -29h8v12h-8z`], { f: '@glass.0', d: `M${wx} -28h6v10h-6z`, glow: 'window' });
        body.push(['@board.0', 'M-19-40V-104H19V-40z'], ['#000000', 'M4-40V-104H19V-40z', .2], { s: '@board.2', w: .8, op: .5, d: 'M-19-50H19M-19-58H19M-19-66H19M-19-74H19' });
        body.push(['@roof.0', 'M-34-30L-19-46H19L34-30z'], ['@roof.1', 'M19-46L34-30H20z', .7]);
        body.push(['@stone.2', 'M-16-102H16V-88H-16z'], { s: '@board.0', w: 1, d: 'M-12-102V-88M-6-102V-88M0-102V-88M6-102V-88M12-102V-88' });
        body.push(['@clock.0', 'M0-78L8-70 0-62-8-70z'], { s: '@clock.1', w: 1.1, d: 'M0-70V-75M0-70h3.5' });
        body.push(['@shingle.0', 'M-23-103L0-150 23-103z'], ['@shingle.1', 'M0-150L23-103H5z'], { s: '@shingle.2', w: .8, op: .5, d: 'M-15-116H15M-9-129H9' }, { s: '@vane', w: 1.2, d: 'M0-150V-162' }, ['@vane', 'M-6-160h10l2-2-2-2h-10z']);
      } else {
        const top = v === 0 ? -150 : -120;
        body.push([wall + '.0', `M-30 0V${top}H30V0z`], [wall + '.1', `M10 0V${top}H30V0z`, .55], { s: wall + '.3', w: 1.2, op: .45, d: `M-30-40H30M-30-90H30` });
        if (v === 0) { let fl = ''; for (let i = 0; i < 70; i++) fl += ell(-27 + (i * 23) % 54, -4 - (i * 29) % 140, 2.2, 1.6); body.push(['@flint.3', fl, .5], ['@stone.2', `M-30 0V${top}h5V0zM25 0V${top}h5V0z`]); }
        // the west door, a big window, belfry louvres, the clock
        body.push(['@stone.2', 'M-12 0V-26q12-14 24 0V0z'], ['@door', 'M-9 0V-24q9-10 18 0V0z']);
        body.push(['@frame', 'M-10-76h20v26h-20z'], { f: '@glass.0', d: 'M-8-74h16v24h-16z', glow: 'window' }, ['@frame', 'M-10-74q10-14 20 0z'], { s: '@frame', w: 1, d: 'M0-74v24M-8-62h16' });
        body.push(['@clock.0', ell(0, -102, 9, 9)], { s: '@clock.1', w: 1.2, d: 'M0-102V-108M0-102h4' }, { s: '@clock.1', w: .8, op: .8, d: ell(0, -102, 9, 9) });
        if (v === 0) {
          body.push(['@board.1', 'M-14-140h8v14h-8zM6-140h8v14h-8z'], { s: '@board.2', w: 1, d: 'M-14-136h8M-14-132h8M6-136h8M6-132h8' });
          // battlements and corner pinnacles
          let b = ''; for (let i = 0; i < 6; i++) b += rect(-32 + i * 11.6, top - 8, 7, 8); body.push([wall + '.0', b], ['@stone.2', rect(-34, top - 1, 68, 3)], ['@stone.0', 'M-34-158l3-12 3 12zM28-158l3-12 3 12z']);
          body.push({ s: '@vane', w: 1.2, d: 'M24-170V-184' }, ['@vane', 'M18-182h10l2-2-2-2h-10z']);
        } else {
          body.push(['@board.1', 'M-14-118h8v14h-8zM6-118h8v14h-8z']);
          // the broach spire: an octagonal spire on a square tower, lit face and shaded face
          body.push(['@stone.0', `M-30 ${top}L0 -250 30 ${top}z`], ['@stone.1', `M0 -250L30 ${top}H6z`, .7], ['@stone.3', `M-30 ${top}l8 -16 -2 16zM30 ${top}l-8 -16 2 16z`, .5], { s: '@stone.1', w: .8, op: .6, d: 'M-20-150h40M-14-180h28M-8-210h16' }, ['@frame', 'M-6-170h5v10h-5z'], { s: '@vane', w: 1.2, d: 'M0-250V-262' }, ['@vane', 'M-6-260h10l2-2-2-2h-10z']);
        }
      }
      // night: a soft floodlight wash up the tower (baked only after real dusk)
      const lit = [{ f: { rad: [[0, '@flood', .32], [1, '@flood', 0]], cx: 0, cy: -40, r: 110 }, d: v === 2 ? 'M-28 0V-104H28V0z' : `M-30 0V${v === 0 ? -150 : -120}H30V0z` }];
      return { body, lit };
    },
  });
})();
