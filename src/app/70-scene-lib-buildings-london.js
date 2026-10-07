/* ============================================================
   SCENE LIBRARY: London buildings (docs/dev/SCENE_ENGINE.md 2.3, 2.7 kit london / towers; section 11 demo).
   PURE: sceneObjDefine calls only, built lazily per (variant, season) and memoised by the core.
   Station buildings by era (period architecture only: NO roundel, no logotype, no lettering; the
   name is the engine's sign primitive, 8.3), a terrace row and a generic tower. Lit from the LEFT.
   Anchor: the middle of the frontage at the pavement.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const rr = (r, a, b) => a + r() * (b - a);
  /** A grid of window panes split over n glow groups (so a seeded share lights at dusk), plus frames. */
  const windows = (x0, y0, cols, rows, w, h, gx, gy, n, slot) => {
    const g = Array.from({ length: n }, () => ''), fr = [];
    let k = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = x0 + i * (w + gx), y = y0 + j * (h + gy); g[k++ % n] += rect(x, y, w, h); fr.push(rect(x - 1.5, y - 1.5, w + 3, h + 3)); }
    return [{ f: '@frame', d: fr.join(''), op: 0.9 }].concat(g.map(d => ({ f: slot || '@glass.0', d, glow: 'window' })));
  };
  const brickCourses = (x0, y0, w, h, step) => Array.from({ length: Math.floor(h / step) }, (_, i) => `M${f1(x0)} ${f1(y0 + (i + 1) * step)}h${f1(w)}`).join('');
  const NIGHT = { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.8 };

  /* ---------- building.station-victorian: brick and stone, arched windows, a glass and iron canopy ---------- */
  sceneObjDefine({
    id: 'building.station-victorian', category: 'building', size: [420, 250], variants: 2, seasonal: false, flippable: false,
    palette: { base: { brick: ['#9a5238', '#7a3e2a', '#b8704e', '#5e2e20'], stone: ['#d8cdb4', '#b4a88e', '#efe6d0'], roof: ['#4a5058', '#363a42', '#6a7078'], frame: '#e8e2d2', glass: ['#3a4a5a', '#c8dce8'], iron: ['#2f3a36', '#4a5a54'], canopy: ['#cfdce0', '#a8bcc4'], door: '#3a2a22' } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 210, ry: 14, h: 250 },
    tags: ['uk', 'london', 'station', 'victorian', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'native: a generic Victorian station frontage',
    build(v) {
      const w = 400 + v * 20, x0 = -w / 2, h = 190, body = [];
      body.push(['@brick.0', rect(x0, -h, w, h)], ['@brick.1', rect(x0 + w * 0.8, -h, w * 0.2, h), 0.5], { s: '@brick.3', w: 0.8, op: 0.3, d: brickCourses(x0, -h, w, h, 7) });
      body.push(['@stone.0', rect(x0 - 6, -h - 8, w + 12, 12)], ['@stone.1', rect(x0 - 6, -h + 2, w + 12, 3)], ['@stone.0', rect(x0, -96, w, 8)]);
      // the hipped slate roof with a central clock gable (no face markings: a plain stone disc would read as a sign, so it is a lantern)
      body.push(['@roof.0', `M${f1(x0 - 4)} ${f1(-h - 8)}L${f1(x0 + 30)} ${f1(-h - 56)}H${f1(-x0 - 30)}L${f1(-x0 + 4)} ${f1(-h - 8)}z`], ['@roof.1', `M${f1(-x0 - 30)} ${f1(-h - 56)}L${f1(-x0 + 4)} ${f1(-h - 8)}H${f1(-x0 - 60)}z`, 0.6]);
      body.push(['@stone.0', `M-34 ${-h - 8}V${-h - 70}L0 ${-h - 96}L34 ${-h - 70}V${-h - 8}z`], ['@stone.1', `M0 ${-h - 96}L34 ${-h - 70}V${-h - 8}H18z`, 0.5], ['@roof.0', rect(-6, -h - 118, 12, 24)]);
      // arched upper windows and tall lower ones
      const up = [], cols = 9, gx = (w - 40) / cols;
      for (let i = 0; i < cols; i++) { const x = x0 + 24 + i * gx; up.push(`M${f1(x)} ${-128}v-34a${f1(gx * 0.28)} ${f1(gx * 0.28)} 0 0 1 ${f1(gx * 0.56)} 0v34z`); }
      body.push(['@stone.2', up.join(''), 0.9]);
      body.push(...windows(x0 + 26, -158, cols, 1, gx * 0.48, 28, gx * 0.52, 0, 5));
      // the ground floor: entrance arches
      for (let i = 0; i < 5; i++) { const x = -150 + i * 64; body.push(['@stone.1', `M${x} 0V-62a24 24 0 0 1 48 0V0z`], ['@door', `M${x + 5} 0V-60a19 19 0 0 1 38 0V0z`]); }
      body.push({ f: '@glass.0', d: [0, 1, 2, 3, 4].map(i => rect(-140 + i * 64, -74, 28, 10)).join(''), glow: 'window' });
      // the canopy: glass on iron brackets
      body.push(['@canopy.0', `M${f1(x0 + 20)} -86H${f1(-x0 - 20)}l12 14H${f1(x0 + 8)}z`, 0.85], ['@iron.0', rect(x0 + 8, -72, w - 16, 3)], ...Array.from({ length: 8 }, (_, i) => ['@iron.1', rect(x0 + 30 + i * (w - 60) / 7, -72, 3, 72)]));
      const lit = [{ f: '#ffe2a0', d: `M${f1(x0 + 8)} -70H${f1(-x0 - 8)}L${f1(-x0 + 20)} 0H${f1(x0 - 20)}z`, op: 0.18 }, { f: '#fff1c8', d: ell(0, -h - 82, 9, 9), op: 0.9 }];
      return { body, lit };
    },
  });

  /* ---------- building.station-holden: a brick drum with a tall glazed clerestory (the 1930s suburban type) ---------- */
  sceneObjDefine({
    id: 'building.station-holden', category: 'building', size: [380, 240], variants: 2, seasonal: false, flippable: false,
    palette: { base: { brick: ['#b0684a', '#8c4e36', '#c8866a', '#6a3a28'], concrete: ['#d8d4c8', '#b0aca0', '#f0ece0'], frame: '#2e3438', glass: ['#3a4a5a', '#c8dce8'], door: '#2a2e32' } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 190, ry: 14, h: 240 },
    tags: ['uk', 'london', 'station', 'holden', 'modernist', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'native: a generic 1930s brick-and-glass station',
    build(v) {
      const body = [], dw = v ? 170 : 200, dh = 120;
      // the low single-storey wings
      body.push(['@brick.0', rect(-190, -78, 380, 78)], ['@brick.1', rect(110, -78, 80, 78), 0.5], { s: '@brick.3', w: 0.8, op: 0.3, d: brickCourses(-190, -78, 380, 78, 6) });
      body.push(['@concrete.0', rect(-196, -86, 392, 10)], ['@concrete.1', rect(-196, -78, 392, 2)]);
      // the drum (v0) or box (v1) with the clerestory band of tall windows
      if (!v) {
        body.push(['@brick.0', `M${-dw / 2} -78V${-78 - dh}a${dw / 2} 16 0 0 1 ${dw} 0V-78z`], ['@brick.1', `M${dw / 4} -78V${-78 - dh}a${dw / 2} 16 0 0 1 ${dw / 4} 0V-78z`, 0.5]);
        body.push(['@concrete.0', `M${-dw / 2 - 8} ${-78 - dh}a${dw / 2 + 8} 18 0 0 1 ${dw + 16} 0v-8a${dw / 2 + 8} 18 0 0 0 ${-dw - 16} 0z`]);
      } else {
        body.push(['@brick.0', rect(-dw / 2, -78 - dh, dw, dh)], ['@brick.1', rect(dw / 4, -78 - dh, dw / 4, dh), 0.5], ['@concrete.0', rect(-dw / 2 - 8, -86 - dh, dw + 16, 10)]);
      }
      body.push(['@frame', rect(-dw / 2 + 10, -78 - dh + 18, dw - 20, dh - 34)]);
      body.push(...windows(-dw / 2 + 14, -78 - dh + 22, 7, 1, (dw - 28) / 7 - 4, dh - 42, 4, 0, 4));
      body.push({ s: '@frame', w: 2, d: Array.from({ length: 4 }, (_, i) => `M${-dw / 2 + 14} ${-78 - dh + 30 + i * 18}h${dw - 28}`).join('') });
      // entrance doors and the wing windows
      body.push(['@door', rect(-60, -66, 120, 66)], { f: '@glass.0', d: [0, 1, 2, 3].map(i => rect(-54 + i * 28, -60, 22, 40)).join(''), glow: 'window' });
      body.push(...windows(-176, -64, 3, 1, 26, 30, 12, 0, 2), ...windows(70, -64, 3, 1, 26, 30, 12, 0, 2));
      const lit = [{ f: '#ffe2a0', d: rect(-dw / 2 + 10, -78 - dh + 18, dw - 20, dh - 34), op: 0.22 }, { f: '#ffe8b0', d: `M-70 0L-60 -66H60L70 0z`, op: 0.15 }];
      return { body, lit };
    },
  });

  /* ---------- building.station-modern: a steel and glass canopy over an open concourse (the 1990s extension type) ---------- */
  sceneObjDefine({
    id: 'building.station-modern', category: 'building', size: [440, 200], variants: 2, seasonal: false, flippable: false,
    palette: { base: { steel: ['#8a969e', '#6a767e', '#b8c4cc'], glass: ['#4a6a80', '#c8e0ec'], canopy: ['#9ab4c4', '#6a8494'], concrete: ['#c8c4bc', '#a4a098'], frame: '#3a444a', floor: '#5a5e62' } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 220, ry: 14, h: 200 },
    tags: ['uk', 'london', 'station', 'modern', 'glass', 'signature', 'kit:london', 'role:building-mid'],
    credit: 'native: a generic steel-and-glass station canopy',
    build(v) {
      const w = 420 + v * 30, x0 = -w / 2, body = [];
      // the great curved glass canopy
      body.push(['@canopy.0', `M${f1(x0)} -60Q0 -230 ${f1(-x0)} -60z`, 0.75], ['@canopy.1', `M0 -145Q${f1(-x0 * 0.6)} -150 ${f1(-x0)} -60H0z`, 0.4]);
      body.push({ s: '@steel.0', w: 2.2, d: Array.from({ length: 11 }, (_, i) => { const t = i / 10, x = x0 + t * w, y = -60 - 170 * 4 * t * (1 - t) * 0.5; return `M${f1(x)} -60L${f1(x)} ${f1(y)}`; }).join('') });
      body.push({ s: '@steel.2', w: 3, d: `M${f1(x0)} -60Q0 -230 ${f1(-x0)} -60` });
      // the glass box of the ticket hall
      body.push(['@frame', rect(-150, -100, 300, 100)], ...windows(-146, -96, 8, 2, 32, 42, 4, 6, 5, '@glass.0'));
      body.push(['@concrete.0', rect(x0, -8, w, 8)], ['@floor', rect(-150, -6, 300, 6)]);
      body.push(...Array.from({ length: 6 }, (_, i) => ['@steel.1', rect(x0 + 10 + i * (w - 26) / 5, -62, 6, 62)]));
      const lit = [{ f: '#eef6ff', d: `M${f1(x0)} -60Q0 -230 ${f1(-x0)} -60z`, op: 0.16 }, { f: '#fff0c8', d: rect(-150, -100, 300, 100), op: 0.2 }];
      return { body, lit };
    },
  });

  /* ---------- building.terrace: a row of 2 to 4 storey houses (6 variants), for the far band ---------- */
  sceneObjDefine({
    id: 'building.terrace', category: 'building', size: [300, 150], variants: 6, seasonal: false, flippable: true,
    palette: { base: { brick: ['#8a5a44', '#a0684e', '#c8b8a0', '#7a4e3c', '#b4a48c', '#946048'], shade: '#3a2a22', roof: ['#4a4e56', '#5a4e48'], frame: '#ece6d8', glass: ['#3a4650', '#bcd0dc'], chimney: '#6a4a3a' } },
    night: { glow: { window: '#ffd98a' }, on: 0.55 }, shadow: { rx: 150, ry: 8, h: 150 },
    tags: ['uk', 'london', 'terrace', 'houses', 'row', 'kit:london', 'role:building-far'],
    credit: 'native: a generic London terrace',
    build(v, r) {
      const n = 4 + (v % 3), hw = 300 / n, x0 = -150, floors = 2 + (v % 2) + (v > 3 ? 1 : 0), fh = 34, h = floors * fh + 10, body = [];
      const col = `@brick.${v}`;
      body.push([col, rect(x0, -h, 300, h)], ['@shade', rect(x0, -h, 300, h), 0.06]);
      body.push(['@roof.' + (v % 2), `M${x0 - 4} ${-h}L${x0 + 8} ${-h - 22}H${-x0 - 8}L${-x0 + 4} ${-h}z`]);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * hw;
        body.push(['@shade', rect(x + hw - 1.5, -h, 1.5, h), 0.35], ['@chimney', rect(x + hw * 0.7, -h - 34, 10, 16)]);
        if (v % 2) body.push(['@frame', `M${f1(x + 6)} 0V-36a${f1(hw * 0.18)} ${f1(hw * 0.18)} 0 0 1 ${f1(hw * 0.36)} 0V0z`, 0.9]);
      }
      body.push(...windows(x0 + hw * 0.18, -h + 12, n * 2, floors, hw * 0.24, 18, hw * 0.26, fh - 18, 4));
      return { body };
    },
  });

  /* ---------- building.tower: a generic office tower (8 variants of height, crown and grid), far band ---------- */
  sceneObjDefine({
    id: 'building.tower', category: 'building', size: [120, 420], variants: 8, seasonal: false, flippable: true,
    palette: { base: { wall: ['#7a8a96', '#9aa4ac', '#5e6e7a', '#b4aca0'], glass: ['#3e5a6e', '#a8c8da'], shade: '#24303a', frame: '#c8d0d6' } },
    night: { glow: { window: '#ffe0a0' }, on: 0.45 }, shadow: { rx: 60, ry: 6, h: 420 },
    tags: ['city', 'tower', 'office', 'kit:towers', 'kit:urban', 'role:building-far'],
    credit: 'native: a generic city tower',
    build(v, r) {
      const w = 80 + (v % 3) * 20, h = 240 + (v % 4) * 60 + (v > 5 ? 40 : 0), x0 = -w / 2, body = [];
      body.push([`@wall.${v % 4}`, rect(x0, -h, w, h)], ['@shade', rect(x0 + w * 0.62, -h, w * 0.38, h), 0.32]);
      if (v % 2) body.push(['@frame', rect(x0 + 8, -h - 18, w - 16, 18)], ['@shade', rect(-2, -h - 50, 4, 32)]);
      else body.push([`@wall.${v % 4}`, `M${x0} ${-h}L0 ${-h - 30}L${-x0} ${-h}z`]);
      const cols = Math.round(w / 16), rows = Math.floor((h - 20) / 18);
      body.push(...windows(x0 + 5, -h + 10, cols, rows, w / cols - 6, 10, 6, 8, 6));
      return { body };
    },
  });
})();
