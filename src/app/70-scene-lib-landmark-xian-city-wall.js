/* ============================================================
   SCENE LIBRARY: landmark.xian-city-wall (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Xi'an's Ming city wall at the South Gate (Yongning Gate), seen from the south, outside the
   wall, as the backdrop of the Big Wild Goose Pagoda scene (the archetype's far slot):
   - the real structure: the grey-brick wall (about 12 m) on its stone plinth, the outer
     parapet's crenellations with a shooting hole in each merlon, two ramparts (the projecting
     bastions every 120 m or so); the barbican projecting at the gate, the archery tower on its
     outer wall (a broad brick body with four rows of small square arrow windows in red frames,
     a deep lower eave, then a double hip-and-gable roof of grey tiles with ridge ornaments)
     and, behind it on the main wall, the taller gate tower (red columns and lattice under its
     double grey-tile roof)
   - seen a little from the right: the east ends in shade; lit from the left
   - night: the 'lit' part washes the wall and the towers warm and runs the outline lights
     along the parapet; the arrow windows and the gate tower's lattice glow, and the rows of
     red lanterns under the eaves (glow 'lamp')
   No text, no flags or banners. Anchor: the foot of the main wall below the gate.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const WH = 46, X0 = -700, X1 = 1300;               // the wall's height to the parapet; its ends (the gate stands left of the middle)
  const RAMP = [-560, 560, 1120], RW = 64, BB = 170;  // the ramparts' centres and width, the barbican's half width
  // a hip-and-gable roof seen on its long side: front slope, the shaded east end with its gable, the ridge, tiles, eave tips
  function roof(cx, ey, hw, ry, rh, sw) {
    const lt = [cx - hw - 5, ey - 5], rt = [cx + hw + 5, ey - 5];
    const front = `M${f1(lt[0])} ${f1(lt[1])}Q${f1(cx - hw + 12)} ${f1(ey + 1)} ${f1(cx - hw + 26)} ${f1(ey)}H${f1(cx + hw - 26)}Q${f1(cx + hw - 12)} ${f1(ey + 1)} ${f1(rt[0])} ${f1(rt[1])}`
      + `Q${f1(cx + hw * 0.55)} ${f1(ey - (ey - ry) * 0.3)} ${f1(cx + rh)} ${f1(ry)}H${f1(cx - rh)}Q${f1(cx - hw * 0.55)} ${f1(ey - (ey - ry) * 0.3)} ${f1(lt[0])} ${f1(lt[1])}z`;
    const side = poly([rt, [cx + hw + sw, ey - 3], [cx + rh + sw * 0.7, ry + 2], [cx + rh, ry]]);
    const gable = poly([[cx + rh + 1, ry + 0.5], [cx + rh + sw * 0.66, ry + 2.2], [cx + rh + 3, ry + (ey - ry) * 0.42]]);
    const ridge = rect(cx - rh - 3, ry - 3.2, 2 * rh + 6 + sw * 0.3, 3.6);
    const orn = poly([[cx - rh - 3, ry - 3.2], [cx - rh - 7, ry - 9], [cx - rh - 1, ry - 6], [cx - rh + 2, ry - 3.2]]) + poly([[cx + rh + 3 + sw * 0.3, ry - 3.2], [cx + rh + 7 + sw * 0.3, ry - 9], [cx + rh + 1 + sw * 0.3, ry - 6], [cx + rh - 2 + sw * 0.3, ry - 3.2]]);
    let tiles = ''; const n = Math.round(hw / 5);
    for (let k = 0; k <= n; k++) { const t = -1 + 2 * k / n, xt = cx + t * rh, xb = cx + t * (hw - 4); tiles += `M${f1(xt)} ${f1(ry + 1)}Q${f1(xt + (xb - xt) * 0.7)} ${f1(ry + (ey - ry) * 0.55)} ${f1(xb)} ${f1(ey - 1)}`; }
    const tips = `M${f1(lt[0])} ${f1(lt[1])}l-3 -3M${f1(rt[0])} ${f1(rt[1])}l3 -3M${f1(cx + hw + sw)} ${f1(ey - 3)}l2 -3`;
    return { front, side, gable, ridge, orn, tiles, tips };
  }
  define({
    id: 'landmark.xian-city-wall', category: 'landmark', size: [2000, 200], box: [-704, -204, 1304, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      wall: ['#908b83', '#6e6a64', '#a8a39a', '#7e7a73'], plinth: ['#aaa496', '#8a8478'], roof: ['#4c4e54', '#36383e', '#26282c', '#6a6c72'],
      wood: ['#8a3424', '#5c2a20', '#c8a060'], win: ['#2a2220', '#8a3a2a'], lantern: '#e0482e', flood: '#ffc27a', line: '#ffd890',
    } },
    night: { glow: { window: '#ffc070', lamp: '#ffd9a0' }, on: 0.85 },
    shadow: false,
    reflect: true,
    tags: ['landmark', 'place:asia/place:xian', 'asia', 'asia-east', 'city-wall', 'gate', 'signature'],
    credit: 'native (scene engine upgrade), for the xian-skyline scene',
    build(v, r) {
      const body = [], lit = [];
      // the main wall, its plinth and the parapet band
      body.push(['@wall.0', rect(X0, -WH, X1 - X0, WH)], ['@plinth.0', rect(X0, -5, X1 - X0, 5)], ['@wall.3', rect(X0, -WH - 4, X1 - X0, 4)]);
      body.push({ s: '@plinth.1', w: 0.5, op: 0.5, d: `M${X0} -2.5H${X1}` + Array.from({ length: 66 }, (_, k) => `M${X0 + k * 30 + 10} -5v5`).join(''), detail: true });
      // each wall section between the ramparts and the barbican: merlons with their shooting holes, the shadow under them, brick courses, weather streaks
      const sections = [[X0, RAMP[0] - RW / 2], [RAMP[0] + RW / 2, -BB - 16], [BB + 16, RAMP[1] - RW / 2], [RAMP[1] + RW / 2, RAMP[2] - RW / 2], [RAMP[2] + RW / 2, X1]];
      const merlons = (x0, x1, y) => { let m = '', h = '', s = ''; for (let x = x0 + 2; x + 7 <= x1; x += 12) { m += rect(x, y - 7, 7, 7); h += rect(x + 2.6, y - 4.6, 1.8, 1.8); s += `M${f1(x + 7)} ${f1(y - 6)}v6`; } return { m, h, s }; };
      for (const [x0, x1] of sections) {
        const c = merlons(x0, x1, -WH - 4);
        body.push(['@wall.0', c.m], { f: '@wall.1', d: c.h, detail: true }, { s: '@wall.1', w: 1, op: 0.45, d: c.s, detail: true });
        let bc = ''; for (let y = -10; y > -WH; y -= 6) bc += `M${f1(x0)} ${y}H${f1(x1)}`;
        body.push({ s: '@wall.1', w: 0.5, op: 0.3, d: bc, detail: true });
        let ws = ''; for (let x = x0 + 18 + r() * 20; x < x1 - 10; x += 34 + r() * 40) ws += `M${f1(x)} ${-WH + 2}v${f1(10 + r() * 22)}`;
        body.push({ s: '@wall.1', w: 2.2, op: 0.18, d: ws, detail: true });
      }
      // the two ramparts: a lit face, the east side in shade, their own merlons and courses
      for (const rx of RAMP) {
        const x0 = rx - RW / 2, c = merlons(x0, x0 + RW, -WH - 4);
        body.push(['@wall.2', rect(x0, -WH - 4, RW, WH + 4)], ['@wall.1', rect(x0 + RW, -WH - 4, 9, WH + 4)], { f: '@wall.2', d: c.m + rect(x0 + RW + 1, -WH - 11, 7, 7), detail: false });
        let bc = ''; for (let y = -9; y > -WH; y -= 6) bc += `M${f1(x0)} ${y}h${RW}`;
        body.push({ s: '@wall.1', w: 0.5, op: 0.3, d: bc + c.h, detail: true });
      }
      // the barbican's outer wall, projecting at the gate
      const bc = merlons(-BB, BB, -WH - 4);
      body.push(['@wall.2', rect(-BB, -WH - 4, 2 * BB, WH + 4)], ['@wall.1', rect(BB, -WH - 4, 16, WH + 4)], ['@plinth.0', rect(-BB, -6, 2 * BB + 16, 6)], ['@wall.2', bc.m]);
      let bcc = ''; for (let y = -10; y > -WH; y -= 6) bcc += `M${-BB} ${y}H${BB}`;
      body.push({ s: '@wall.1', w: 0.5, op: 0.3, d: bcc + bc.h, detail: true }, { s: '@wall.1', w: 2, op: 0.16, d: `M-140 -46v24M-62 -46v16M38 -46v30M118 -46v18`, detail: true });
      // the gate tower behind, on the main wall: the top of its lower roof, the upper storey (red columns, lattice, balcony), its roof
      const gx = 14, lo = roof(gx, -138, 128, -152, 88, 14), up = roof(gx, -168, 122, -194, 60, 14);
      body.push(['@roof.0', lo.front], ['@roof.1', lo.side]);
      body.push(['@wood.1', rect(gx - 104, -168, 208, 18)], ['@wood.1', rect(gx + 104, -168, 12, 18), 0.8]);
      let col = '', lat = ''; for (let k = 0; k <= 7; k++) { const x = gx - 102 + k * 29; col += rect(x, -167, 3.4, 17); if (k < 7) lat += rect(x + 6, -164, 20, 10); }
      body.push({ f: '@wood.0', d: col, detail: true }, { f: '@win.0', d: lat, glow: 'window', op: 0.85 }, { s: '@wood.2', w: 0.8, op: 0.7, d: `M${gx - 104} -153H${gx + 116}` + Array.from({ length: 27 }, (_, k) => `M${gx - 102 + k * 8} -153v-3.5`).join(''), detail: true });
      let brk = ''; for (let k = 0; k < 22; k++) brk += rect(gx - 106 + k * 10, -171, 6, 3);
      body.push({ f: '@wood.2', d: brk, op: 0.6, detail: true });
      body.push(['@roof.0', up.front], ['@roof.1', up.side], ['@roof.3', up.gable], ['@roof.2', up.ridge], { f: '@roof.2', d: up.orn + lo.orn, detail: true }, { s: '@roof.3', w: 0.6, op: 0.45, d: up.tiles, detail: true }, { s: '@roof.2', w: 1.4, d: up.tips + lo.tips, detail: true });
      // the archery tower on the barbican: the brick body, four rows of arrow windows, the deep lower eave, the upper band, the double roof
      const ax = 0, top = -104;
      body.push(['@wall.0', rect(ax - 112, top, 224, -WH - 4 - top)], ['@wall.1', rect(ax + 112, top, 16, -WH - 4 - top)]);
      let fr = '', sw = '';
      for (let row = 0; row < 4; row++) {
        const y = top + 10 + row * 12; let wd = '';
        for (let k = 0; k < 12; k++) { const x = ax - 92 + k * 16.4; wd += rect(x, y, 4.4, 5); fr += rect(x - 1.2, y - 1.2, 6.8, 7.4); }
        body.push({ f: '@win.0', d: wd, glow: 'window' });
        sw += rect(ax + 116, y, 2.2, 5) + rect(ax + 122, y, 2.2, 5);
      }
      body.push({ f: '@win.1', d: fr, op: 0.75, detail: true }, ['@win.0', sw, 0.8], { s: '@wall.1', w: 0.5, op: 0.3, d: Array.from({ length: 9 }, (_, k) => `M${ax - 112} ${top + 3 + k * 6}h224`).join(''), detail: true }, { s: '@wall.1', w: 2, op: 0.15, d: `M${ax - 100} ${top + 2}v20M${ax + 60} ${top + 2}v14M${ax + 100} ${top + 2}v26`, detail: true });
      const le = roof(ax, top, 134, top - 10, 118, 18), ur = roof(ax, top - 18, 124, top - 40, 74, 16);
      body.push(['@roof.0', le.front], ['@roof.1', le.side], ['@roof.2', rect(ax - 128, top - 1, 274, 2.4), 0.8], { s: '@roof.3', w: 0.5, op: 0.4, d: le.tiles, detail: true });
      let lb = '', lc = ''; for (let k = 0; k < 20; k++) lb += rect(ax - 104 + k * 11, top - 15, 6, 3);
      for (let k = 0; k <= 9; k++) lc += rect(ax - 100 + k * 22, top - 14, 3, 6);
      body.push(['@wood.1', rect(ax - 108, top - 18, 216, 8)], { f: '@wood.0', d: lc, detail: true }, { f: '@wood.2', d: lb, op: 0.55, detail: true });
      body.push(['@roof.0', ur.front], ['@roof.1', ur.side], ['@roof.3', ur.gable], ['@roof.2', ur.ridge], { f: '@roof.2', d: ur.orn, detail: true }, { s: '@roof.3', w: 0.6, op: 0.45, d: ur.tiles, detail: true }, { s: '@roof.2', w: 1.4, d: ur.tips + le.tips, detail: true });
      // red lanterns under the eaves
      let l1 = '', l2 = ''; for (let k = 0; k < 11; k++) l1 += ell(ax - 100 + k * 20, top + 4, 2.6, 3.4);
      for (let k = 0; k < 7; k++) l2 += ell(gx - 90 + k * 30, -147, 2.4, 3.2);
      body.push({ f: '@lantern', d: l1, glow: 'lamp' }, { f: '@lantern', d: l2, glow: 'lamp' });
      // night: the wall washed warm from below, the outline lights along the parapet, the towers floodlit
      lit.push({ f: { lin: [[0, '@flood', 0.38], [1, '@flood', 0.08]], x1: 0, y1: 0, x2: 0, y2: -WH }, d: rect(X0, -WH - 4, X1 - X0, WH + 4) });
      lit.push({ s: '@line', w: 1.4, op: 0.9, d: `M${X0} ${-WH - 4}H${X1}M${-BB} ${-WH - 11}H${BB}`, glow: 'lamp' });
      lit.push({ f: { lin: [[0, '@flood', 0.42], [1, '@flood', 0.1]], x1: 0, y1: -WH, x2: 0, y2: -196 }, d: rect(ax - 112, top, 240, -WH - 4 - top) + rect(gx - 104, -168, 220, 18) });
      return { body, lit };
    },
  });
})();
