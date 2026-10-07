/* ============================================================
   SCENE LIBRARY: buildings, the TOWERS kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   building.tower-glass   a GENERATOR: 16 seeded variants of height class, setbacks, crown
                          (flat with plant, slanted, spire, stepped, rounded) and curtain-wall
                          grid; glass in blue, teal, silver or bronze. Lit windows in seeded
                          groups after real dusk, a lit crown on some.
   building.tower-stone   masonry towers (8 variants): limestone, brick or granite, setbacks
                          (the "wedding cake"), punched windows, cornices, a crown (flat with a
                          rooftop water tank, copper pyramid, small spire or stepped top).
   building.skyline-band  the DISTANT skyline as one object (6 variants): 14 to 22 towers of a
                          far district merged into a lit face and a shaded face, a few crowns and
                          spires, a sparse scatter of lit floor strips at dusk. Cheap by design: a
                          whole horizon is 4 or 5 placements, not 60 towers.
   Front elevations lit from the LEFT; the right-hand side face is in shade. Anchor: the
   ground at the middle of the front face. Unbranded and unnamed: generic skyline fill that
   a landmark stands among.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define, winGroups } = sceneDraw;
  const rr = (r, a, b) => a + r() * (b - a);

  /* ---------- building.tower-glass ---------- */
  define({
    id: 'building.tower-glass', category: 'building', size: [90, 340], variants: 16, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      // four glass families: blue, teal, silver, bronze (index = family)
      glassT: ['#9fc4e2', '#a6d8d4', '#d4dce4', '#d8c4a0'], glassB: ['#3e6a96', '#2f7a7a', '#7a8794', '#7a5a3a'],
      side: ['#2a4a6e', '#245a5a', '#59636e', '#5a422a'], mull: ['#e8f0f6', '#e0f2ee', '#f4f6f8', '#f2e4c8'],
      cell: ['#24405e', '#1e4a4a', '#46505a', '#4a3424'], roof: ['#56606a', '#3e464e', '#8a949e'], beacon: '#e0503a', crown: '#bfe0ff',
    } },
    night: { glow: { window: '#ffe2a6' }, on: 0.5 },
    shadow: { rx: 50, ry: 6, h: 300 },
    reflect: true,
    tags: ['city', 'skyline', 'tower', 'glass', 'kit:towers', 'kit:urban', 'role:building-far'],
    credit: 'native (scene engine pilot): a seeded curtain-wall tower generator',
    build(v, r) {
      const fam = v % 4, cls = [0.55, 0.75, 1, 1.3][(v >> 2) % 4];
      const w = rr(r, 46, 92), h = Math.round(rr(r, 230, 330) * cls), side = w * rr(r, 0.16, 0.26), x0 = -w / 2;
      const steps = r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2, crown = Math.floor(r() * 5);
      const body = [], lit = [], cells = [];
      const g = c => `@${c}.${fam}`;
      // the stacked segments (each setback narrower), from the ground up
      const segs = []; let y = 0, ww = w;
      for (let i = 0; i <= steps; i++) { const hh = i === steps ? h - (-y) : h * rr(r, 0.45, 0.6) / (i + 1); segs.push({ x: -ww / 2, y: y - hh, w: ww, h: hh }); y -= hh; ww *= rr(r, 0.72, 0.86); }
      for (const s of segs) {
        // side face (shade) then the front with a sky-reflection gradient, floor lines, mullions, a diagonal glint
        body.push([g('side'), poly([[s.x + s.w, s.y + s.h], [s.x + s.w, s.y + side * 0.18], [s.x + s.w + side, s.y + side * 0.18 - side * 0.3], [s.x + s.w + side, s.y + s.h]])]);
        body.push({ f: { lin: [[0, g('glassT')], [1, g('glassB')]], x1: 0, y1: s.y, x2: 0, y2: s.y + s.h }, d: rect(s.x, s.y, s.w, s.h) });
        const fl = 7 + (v % 3) * 1.5;
        let floors = '', mull = '';
        for (let yy = s.y + fl; yy < s.y + s.h - 2; yy += fl) floors += `M${f1(s.x)} ${f1(yy)}h${f1(s.w)}`;
        const cols = Math.max(3, Math.round(s.w / (5 + (v % 2) * 3)));
        for (let i = 1; i < cols; i++) mull += `M${f1(s.x + i * s.w / cols)} ${f1(s.y)}v${f1(s.h)}`;
        body.push({ s: g('cell'), w: 0.9, op: 0.45, d: floors, detail: true }, { s: g('mull'), w: 0.6, op: 0.28, d: mull, detail: true });
        body.push([g('mull'), `M${f1(s.x)} ${f1(s.y + s.h * 0.15)}L${f1(s.x + s.w * 0.55)} ${f1(s.y)}h${f1(s.w * 0.22)}L${f1(s.x)} ${f1(s.y + s.h * 0.42)}z`, 0.14]);
        body.push([g('mull'), rect(s.x, s.y, 1.6, s.h), 0.5]);
        // window cells: a seeded share of each floor's bays, grouped so a pattern of floors lights at dusk
        const bay = s.w / cols;
        // runs of lit bays along a floor (one rect per run: offices light in sections), every other floor pair
        for (let yy = s.y + 3, k = 0; yy < s.y + s.h - fl; yy += fl, k++) {
          if (r() < 0.6) continue;
          for (let i = 0; i < cols;) { const run = 2 + Math.floor(r() * Math.min(7, cols - i)); if (r() < 0.55) cells.push([s.x + i * bay + 0.8, yy + 1, run * bay - 1.6, fl - 3.2]); i += run + 1; }
        }
      }
      const groups = winGroups(r, cells, 8);
      groups.forEach(d => { if (d) body.push({ f: g('cell'), d, op: 0.55, glow: 'window', detail: true }); });   // detail: a tile skips the day glass (the night glow still draws)
      // the crown
      const top = segs[segs.length - 1], tx = top.x, tw = top.w, ty = top.y;
      if (crown === 0) body.push(['@roof.0', rect(tx + tw * 0.15, ty - 9, tw * 0.6, 9)], ['@roof.1', rect(tx + tw * 0.15 + tw * 0.45, ty - 9, tw * 0.15, 9)], ['@roof.2', rect(tx + tw * 0.15, ty - 10, tw * 0.6, 1.5)]);
      else if (crown === 1) { body.push([g('glassT'), poly([[tx, ty], [tx + tw, ty - tw * 0.55], [tx + tw, ty]])], [g('side'), poly([[tx + tw, ty - tw * 0.55], [tx + tw + side, ty - tw * 0.55 - side * 0.3], [tx + tw + side, ty], [tx + tw, ty]])]); lit.push({ s: '@crown', w: 2.2, op: 0.9, d: `M${f1(tx)} ${f1(ty)}L${f1(tx + tw)} ${f1(ty - tw * 0.55)}` }); }
      else if (crown === 2) { body.push(['@roof.0', rect(tx + tw * 0.2, ty - 12, tw * 0.6, 12)], ['@roof.2', poly([[-1.6, ty - 12], [0, ty - 12 - h * 0.16], [1.6, ty - 12]])], ['@beacon', ell(0, ty - 12 - h * 0.16, 1.8, 1.8)]); lit.push(['@beacon', ell(0, ty - 12 - h * 0.16, 4, 4), 0.8]); }
      else if (crown === 3) { let yy = ty, ww2 = tw; for (let i = 0; i < 3; i++) { ww2 *= 0.72; body.push([g('glassB'), rect(-ww2 / 2, yy - 8, ww2, 8)], [g('mull'), rect(-ww2 / 2, yy - 8, ww2, 1.4), 0.6]); yy -= 8; } lit.push({ s: '@crown', w: 1.4, op: 0.85, d: `M${f1(-tw * 0.36)} ${f1(ty - 8)}h${f1(tw * 0.72)}M${f1(-tw * 0.26)} ${f1(ty - 16)}h${f1(tw * 0.52)}` }); }
      else { body.push([g('glassT'), `M${f1(tx)} ${f1(ty)}Q${f1(tx)} ${f1(ty - tw * 0.6)} ${f1(tx + tw / 2)} ${f1(ty - tw * 0.62)}Q${f1(tx + tw)} ${f1(ty - tw * 0.6)} ${f1(tx + tw)} ${f1(ty)}z`], [g('side'), `M${f1(tx + tw / 2)} ${f1(ty - tw * 0.62)}Q${f1(tx + tw)} ${f1(ty - tw * 0.6)} ${f1(tx + tw)} ${f1(ty)}h${f1(-tw * 0.25)}z`, 0.6]); lit.push({ s: '@crown', w: 1.6, op: 0.8, d: `M${f1(tx)} ${f1(ty)}Q${f1(tx)} ${f1(ty - tw * 0.6)} ${f1(tx + tw / 2)} ${f1(ty - tw * 0.62)}Q${f1(tx + tw)} ${f1(ty - tw * 0.6)} ${f1(tx + tw)} ${f1(ty)}` }); }
      // the street-level lobby: a lighter glazed band and a dark base line
      body.push([g('glassT'), rect(x0, -10, w, 10), 0.7], { f: g('cell'), d: rect(x0 + 3, -8, w - 6, 6), glow: 'window' }, ['@roof.1', rect(x0, -1.5, w + side, 1.5)]);
      return { body, lit };
    },
  });

  /* ---------- building.tower-stone ---------- */
  define({
    id: 'building.tower-stone', category: 'building', size: [96, 300], variants: 8, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      // limestone, red brick, grey granite, buff brick (index = material)
      wall: ['#d8ccb0', '#a8604a', '#9aa0a4', '#c8a878'], wallS: ['#9a8e74', '#6e3a2c', '#626a70', '#8a6e48'], trim: ['#efe6d0', '#d8c0a8', '#c8ced2', '#e6d4b0'],
      win: ['#3a4250', '#2e3440', '#343c48', '#3a3a40'], copper: ['#5aa08a', '#3e7a68'], tank: ['#7a5a3e', '#5a3e2a', '#9a7a5a'], roof: ['#4a4e54', '#33373c'], flood: '#ffe6b0',
    } },
    night: { glow: { window: '#ffd690' }, on: 0.58 },
    shadow: { rx: 52, ry: 6, h: 260 },
    reflect: true,
    tags: ['city', 'skyline', 'tower', 'masonry', 'kit:towers', 'kit:urban', 'kit:brownstone', 'role:building-far'],
    credit: 'native (scene engine pilot): masonry setback towers',
    build(v, r) {
      const mat = v % 4, w = rr(r, 54, 96), h = rr(r, 150, 300) * (v >= 4 ? 1.15 : 0.85), side = w * 0.2;
      const m = c => `@${c}.${mat}`, body = [], lit = [], cells = [];
      const segs = []; let y = 0, ww = w;
      const steps = 1 + Math.floor(r() * 3);
      for (let i = 0; i < steps; i++) { const hh = i === steps - 1 ? h + y : h * (i === 0 ? rr(r, 0.45, 0.65) : rr(r, 0.2, 0.35)); segs.push({ x: -ww / 2, y: y - hh, w: ww, h: hh }); y -= hh; ww *= rr(r, 0.68, 0.84); }
      for (const s of segs) {
        body.push([m('wallS'), poly([[s.x + s.w, s.y + s.h], [s.x + s.w, s.y + 3], [s.x + s.w + side, s.y - side * 0.25], [s.x + s.w + side, s.y + s.h]])]);
        body.push([m('wall'), rect(s.x, s.y, s.w, s.h)], [m('wallS'), rect(s.x + s.w * 0.86, s.y, s.w * 0.14, s.h), 0.35]);
        // cornice and string courses
        body.push([m('trim'), rect(s.x - 2, s.y - 2, s.w + 4 + side * 0.6, 3)], { s: m('wallS'), w: 0.8, op: 0.5, d: `M${f1(s.x)} ${f1(s.y + 12)}h${f1(s.w)}M${f1(s.x)} ${f1(s.y + s.h - 14)}h${f1(s.w)}` });
        // punched windows: pairs between piers
        const fl = 8.5, cols = Math.max(3, Math.round(s.w / 9)), bw = s.w / cols;
        let pier = '';
        for (let i = 1; i < cols; i++) pier += `M${f1(s.x + i * bw)} ${f1(s.y + 4)}v${f1(s.h - 8)}`;
        body.push({ s: m('trim'), w: 1, op: 0.35, d: pier, detail: true });
        let punched = '';
        for (let yy = s.y + 6; yy < s.y + s.h - 10; yy += fl) {
          for (let i = 0; i < cols; i++) punched += rect(s.x + i * bw + bw * 0.25, yy, bw * 0.5, fl * 0.55);
          // the lit runs at dusk: a seeded share of each floor, one rect per run of windows
          if (r() < 0.5) continue;
          for (let i = 0; i < cols;) { const run = 2 + Math.floor(r() * Math.min(5, cols - i)); if (r() < 0.5) cells.push([s.x + i * bw + bw * 0.2, yy, run * bw - bw * 0.4, fl * 0.55]); i += run + 1; }
        }
        body.push({ f: m('win'), d: punched, op: 0.85, detail: true });   // the punched windows by day (a tile skips them)
      }
      // the lit window runs: barely there by day (glass catching the sky), lit in seeded groups at dusk
      const groups = winGroups(r, cells, 7);
      groups.forEach(d => { if (d) body.push({ f: m('win'), d, op: 0.2, glow: 'window', detail: true }); });
      const top = segs[segs.length - 1], tx = top.x, tw = top.w, ty = top.y, crown = v % 4 === 0 ? 0 : (v + mat) % 3 + 1;
      if (crown === 0 || crown === 3) {
        // a rooftop water tank on a steel stand (a city roofscape detail) and a stair bulkhead
        const cx = tx + tw * rr(r, 0.25, 0.6);
        body.push(['@roof.0', rect(tx + tw * 0.1, ty - 8, tw * 0.3, 8)], ['@roof.1', `M${f1(cx - 6)} ${f1(ty)}l2 -10M${f1(cx + 6)} ${f1(ty)}l-2 -10`], { s: '@roof.1', w: 1, d: `M${f1(cx - 6)} ${f1(ty)}l2 -10M${f1(cx + 6)} ${f1(ty)}l-2 -10M${f1(cx - 5)} ${f1(ty - 5)}h10` });
        body.push(['@tank.0', rect(cx - 6, ty - 22, 12, 12)], ['@tank.1', rect(cx + 2, ty - 22, 4, 12), 0.7], ['@tank.0', `M${f1(cx - 7)} ${f1(ty - 22)}L${f1(cx)} ${f1(ty - 29)}L${f1(cx + 7)} ${f1(ty - 22)}z`], { s: '@tank.2', w: 0.6, op: 0.6, d: `M${f1(cx - 6)} ${f1(ty - 18)}h12M${f1(cx - 6)} ${f1(ty - 14)}h12` });
      } else if (crown === 1) {
        // a copper pyramid roof, weathered green, with a lit band at night
        body.push(['@copper.0', poly([[tx - 2, ty], [tx + tw / 2, ty - tw * 0.7], [tx + tw + 2, ty]])], ['@copper.1', poly([[tx + tw / 2, ty - tw * 0.7], [tx + tw + 2, ty], [tx + tw * 0.62, ty]]), 0.8], { s: '@copper.1', w: 0.7, op: 0.5, d: `M${f1(tx + tw * 0.2)} ${f1(ty - tw * 0.28)}h${f1(tw * 0.6)}M${f1(tx + tw * 0.33)} ${f1(ty - tw * 0.46)}h${f1(tw * 0.34)}` });
        lit.push({ f: { rad: [[0, '@flood', 0.55], [1, '@flood', 0]], cx: tx + tw / 2, cy: ty - tw * 0.3, r: tw * 0.75 }, d: poly([[tx - 2, ty], [tx + tw / 2, ty - tw * 0.7], [tx + tw + 2, ty]]) });
      } else {
        // a stepped top with a short spire, floodlit at night
        body.push([m('wall'), rect(tx + tw * 0.2, ty - 14, tw * 0.6, 14)], [m('trim'), rect(tx + tw * 0.18, ty - 15, tw * 0.64, 2)], [m('wall'), rect(tx + tw * 0.34, ty - 24, tw * 0.32, 10)], ['@roof.0', poly([[-1.4, ty - 24], [0, ty - 52], [1.4, ty - 24]])]);
        lit.push({ f: { rad: [[0, '@flood', 0.5], [1, '@flood', 0]], cx: 0, cy: ty - 10, r: tw * 0.8 }, d: rect(tx, ty - 30, tw, 40) });
      }
      body.push([m('trim'), rect(segs[0].x, -12, segs[0].w, 12), 0.6], { f: m('win'), d: rect(segs[0].x + 4, -10, segs[0].w - 8, 7), glow: 'window' }, ['@roof.1', rect(segs[0].x, -1.5, segs[0].w + side, 1.5)]);
      return { body, lit };
    },
  });

  /* ---------- building.skyline-band ---------- */
  define({
    id: 'building.skyline-band', category: 'building', size: [520, 230], variants: 6, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { face: ['#9aaabb', '#a8a4b4', '#8fa4b0'], shade: ['#6e7e92', '#7a7488', '#62788a'], edge: '#dfe8f0', strip: '#56667a', beacon: '#e0503a' } },
    night: { glow: { window: '#ffe2a6', lamp: '#ff8a6a' }, on: 0.7 },
    reflect: true,
    tags: ['city', 'skyline', 'tower', 'distant', 'kit:towers', 'kit:urban', 'role:building-far'],
    credit: 'native (scene engine pilot): a seeded far-skyline band',
    build(v, r) {
      const fam = v % 3, body = [];
      let face = '', shade = '', edge = '', crowns = '', top = [0, 0];
      const lit = ['', '', '', ''];
      for (let x = -250; x < 240;) {
        const w = rr(r, 16, 38), h = rr(r, 50, 215) * (r() < 0.2 ? 0.55 : 1), sd = w * 0.22;
        face += rect(x, -h, w, h); shade += rect(x + w, -h + sd * 0.3, sd, h - sd * 0.3); edge += rect(x, -h, 1.2, h);
        if (h > top[1]) top = [x + w / 2, h];
        const c = r();
        if (c < 0.18) crowns += poly([[x + w * 0.45, -h], [x + w * 0.5, -h - h * 0.18], [x + w * 0.55, -h]]);
        else if (c < 0.36) crowns += rect(x + w * 0.2, -h - 6, w * 0.6, 6);
        else if (c < 0.46) crowns += poly([[x, -h], [x + w, -h - w * 0.5], [x + w, -h]]);
        // a few lit floor strips per tower (one rect each), spread over four groups
        for (let k = 0, nn = 2 + Math.floor(h / 45); k < nn; k++) if (r() < 0.6) lit[Math.floor(r() * 4)] += rect(x + 2, -h + 6 + r() * (h - 14), w - 4, 1.8);
        x += w + sd + rr(r, -6, 4);
      }
      body.push([`@shade.${fam}`, shade], [`@face.${fam}`, face], [`@face.${fam}`, crowns], ['@edge', edge, 0.35]);
      lit.forEach(d => { if (d) body.push({ f: '@strip', d, op: 0.35, glow: 'window' }); });
      body.push({ f: '@beacon', d: ell(top[0], -top[1] - 2, 1.4, 1.4), glow: 'lamp' });   // the aircraft light on the tallest
      return { body };
    },
  });
})();
