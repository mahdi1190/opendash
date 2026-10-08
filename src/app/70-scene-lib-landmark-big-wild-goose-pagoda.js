/* ============================================================
   SCENE LIBRARY: landmark.big-wild-goose-pagoda (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Started from `scene upgrade asia-east/xian-skyline --box 690,120,910,705` (the old art's
   seven tiers on a platform), then REDRAWN and refined:
   - the real structure: the Tang brick pagoda of the Da Ci'en Temple, square in plan, seven
     storeys on a high grey-brick platform with its south stair; each storey shorter and
     narrower than the one below, its walls slightly battered, divided by relief brick
     pilasters (nine bays on the two lowest storeys, seven on the next two, five above) under
     an architrave with bracket blocks; corbelled brick eaves (stepped courses with a row of
     saw-tooth bricks, the eave course, then the courses stepping back in) instead of tiled
     roofs; a round-headed arch in the middle of every face; the low pyramidal top and its
     gourd-shaped finial on a short spire
   - seen a little from the right: the south face and a narrow east face; lit from the left,
     the east face and the corbels under each eave in shade, the wall darker just under each
     cornice
   - seasons (shapeBySeason): snow on the eaves, the top and the platform in winter; the
     clipped shrubs at the platform's foot fresh in spring, bronze in autumn
   - night: the 'lit' part floodlights the brick gold and runs a warm line along every eave;
     the arches glow (glow 'window')
   No text (the steles in the door niches are left out), no figures. Anchor: the ground at the
   foot of the platform, under the tower's axis.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, poly, define, seasons } = sceneDraw;
  const XC = -12, SIDE = 0.2;   // the axis of the south faces; the east face's width as a share of the south face
  // the seven storeys, bottom up: south-face width at the foot, wall height, bays between the pilasters
  const STOREYS = [[150, 58, 9], [138, 47, 9], [128, 44, 7], [118, 41, 7], [108, 38, 5], [98, 36, 5], [88, 33, 5]];
  // the corbelled eave, bottom up: [outset, height, kind] (c corbel, t saw-tooth course, e eave course, r stepping back)
  const EAVE = [[1.5, 2, 'c'], [3, 2.5, 't'], [4.5, 2, 'c'], [7, 3.5, 'e'], [4, 2, 'r'], [1, 2, 'r']];
  const arch = (x, yb, w, h) => `M${f1(x - w / 2)} ${f1(yb)}v${f1(-(h - w / 2))}a${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(w)} 0v${f1(h - w / 2)}z`;
  define({
    id: 'landmark.big-wild-goose-pagoda', category: 'landmark', size: [340, 486], variants: 1, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      brick: ['#cdb085', '#b89a6c', '#dcc59c'], shade: ['#8e7452', '#6e583c', '#4a3a28'], cornice: ['#c6a878', '#94784f'],
      arch: ['#3a2b1e', '#d4b88a'], plat: ['#a89c88', '#7e7464', '#c6baa4'], finial: ['#6e5e46', '#4a3e30', '#a08c68'],
      snow: ['#f2f6fa', '#d0dae4'], flood: '#ffc272', eave: '#ffdca0',
    } }, seasons({
      shrub: { spring: ['#6a9448', '#88b058'], summer: ['#3e6634', '#557e40'], autumn: ['#7e6a34', '#a08038'], winter: ['#46503e', '#5a6250'] },
    })),
    night: { glow: { window: '#ffc878', lamp: '#ffe2a8' }, on: 0.9 },
    shadow: { rx: 170, ry: 9, h: 240 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:xian', 'asia', 'asia-east', 'pagoda', 'temple', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn xian-skyline art',
    build(v, r, ctx) {
      const body = [], lit = [], winter = ctx.season === 'winter';
      // the platform: grey brick, its coping, the east end in shade, the south stair with its cheek walls
      const PW = 300, PS = 36, PH = 30, px0 = XC - PW / 2, pxb = px0 + PW;
      body.push(['@plat.0', rect(px0, -PH, PW, PH)], ['@plat.1', rect(pxb, -PH, PS, PH)], ['@plat.2', rect(px0 - 2, -PH - 3, PW + PS + 4, 4)]);
      let pc = ''; for (let y = -PH + 6; y < 0; y += 6) pc += `M${f1(px0)} ${y}H${f1(pxb + PS)}`;
      body.push({ s: '@plat.1', w: 0.6, op: 0.45, d: pc, detail: true });
      body.push(['@plat.2', poly([[XC - 20, -PH], [XC + 20, -PH], [XC + 30, 0], [XC - 30, 0]])], ['@plat.1', poly([[XC - 30, 0], [XC - 20, -PH], [XC - 25, -PH], [XC - 37, 0]]) + poly([[XC + 30, 0], [XC + 20, -PH], [XC + 25, -PH], [XC + 37, 0]])]);
      let st = ''; for (let k = 1; k < 10; k++) { const t = k / 10, y = -PH + t * PH, hw = 20 + t * 10; st += `M${f1(XC - hw)} ${f1(y)}h${f1(2 * hw)}`; }
      body.push({ s: '@plat.1', w: 0.8, op: 0.7, d: st, detail: true });
      if (winter) body.push(['@snow.0', rect(px0 - 2, -PH - 5, PW + PS + 4, 3)]);
      // the seven storeys
      const at = body.length;
      let y = -PH - 3, front = '', side = '', cDark = '', cLit = '', cSide = '', arches = '', frames = '', sideArch = '', eaves = '', snow = '';
      STOREYS.forEach(([w, h, bays], i) => {
        const wt = w - 4, top = y - h, fl = XC - w / 2, fr = XC + w / 2, tl = XC - wt / 2, tr = XC + wt / 2;
        front += poly([[fl, y], [fr, y], [tr, top], [tl, top]]);
        side += poly([[fr, y], [fr + w * SIDE, y], [tr + wt * SIDE, top], [tr, top]]);
        // the wall darker just under the cornice
        body.push({ f: { lin: [[0, '@shade.2', 0.42], [1, '@shade.2', 0]], x1: 0, y1: top, x2: 0, y2: top + h * 0.4 }, d: rect(tl, top, wt + wt * SIDE, h * 0.4), detail: true });
        // the relief pilasters (lit edge, shadow line), the architrave with its bracket blocks
        let pil = '', pis = '', arc = rect(tl, top + 2.2, wt, 2.4);
        for (let k = 0; k <= bays; k++) { const x = tl + 1 + k * (wt - 2.6) / bays; pil += rect(x, top + 4, 2.6, h - 4); pis += `M${f1(x + 2.9)} ${f1(top + 5)}V${f1(y - 1)}`; arc += rect(x - 1.8, top, 6.2, 2.4); }
        body.push({ f: '@brick.2', d: pil, op: 0.8, detail: true }, { s: '@shade.0', w: 0.6, op: 0.55, d: pis, detail: true }, { f: '@brick.2', d: arc, detail: true });
        // brick courses and the weather streaks under the arch
        let bc = ''; for (let yy = y - 5; yy > top + 6; yy -= 5) bc += `M${f1(tl)} ${f1(yy)}H${f1(tr)}`;
        body.push({ s: '@brick.1', w: 0.4, op: 0.35, d: bc, detail: true });
        const aw = Math.max(9, (wt - 2.6) / bays * 0.62), ah = h * 0.5;
        body.push({ s: '@shade.0', w: 1.6, op: 0.25, d: `M${f1(XC - aw * 0.3)} ${f1(y - 2)}v${f1(-h * 0.08)}M${f1(XC + aw * 0.25)} ${f1(y - 2)}v${f1(-h * 0.12)}M${f1(tl + 6)} ${f1(top + h * 0.45)}v${f1(h * 0.3)}`, detail: true });
        // the arch in the middle of the south face and its narrow twin on the east face
        arches += arch(XC, y - 2, aw, ah);
        frames += arch(XC, y - 1, aw + 4, ah + 2.5);
        sideArch += arch(tr + wt * SIDE * 0.5, y - 2, aw * 0.28, ah * 0.94);
        // the lit left edge of the storey
        body.push({ s: '@brick.2', w: 1, op: 0.7, d: `M${f1(fl + 0.6)} ${f1(y)}L${f1(tl + 0.6)} ${f1(top + 1)}`, detail: true });
        // the corbelled eave
        let cy = top, teeth = '';
        for (const [e, hh, k] of EAVE) {
          const l = tl - e, rr = tr + e, sr = rr + wt * SIDE + e * 0.6;
          if (k === 'c' || k === 't') cDark += rect(l, cy - hh, rr - l, hh); else cLit += rect(l, cy - hh, rr - l, hh);
          cSide += rect(rr, cy - hh, sr - rr, hh);
          if (k === 't') for (let x = l + 1; x < rr - 3; x += 4) teeth += `M${f1(x)} ${f1(cy)}l2 ${-hh}l2 ${hh}z`;
          if (k === 'e') eaves += `M${f1(l)} ${f1(cy - hh)}H${f1(sr)}`;
          if (winter && (k === 'e' || k === 'r')) snow += rect(l + 1, cy - hh - 1.4, sr - l - 2, 1.6);
          cy -= hh;
        }
        body.push({ f: '@cornice.0', d: teeth, op: 0.85, detail: true });
        y = cy;
      });
      // the faces (what a tile shows), then the cornices over them
      body.splice(at, 0,['@brick.0', front], ['@shade.0', side], ['@arch.1', frames, 0.6], { f: '@arch.0', d: arches, glow: 'window' }, ['@shade.2', sideArch, 0.7]);
      body.push(['@cornice.1', cDark], ['@cornice.0', cLit], ['@shade.1', cSide]);
      // the low pyramidal top, the drum, the gourd and the short spire with its rings
      const tw = 92, ax = XC + tw * SIDE * 0.5, ty = y - 15;
      body.push(['@finial.0', poly([[XC - tw / 2, y], [XC + tw / 2, y], [ax, ty]])], ['@finial.1', poly([[XC + tw / 2, y], [XC + tw / 2 + tw * SIDE, y], [ax, ty]])]);
      body.push({ s: '@finial.2', w: 0.7, op: 0.5, d: `M${f1(XC - tw * 0.3)} ${f1(y)}L${f1(ax)} ${f1(ty)}M${f1(XC + tw * 0.1)} ${f1(y)}L${f1(ax)} ${f1(ty)}`, detail: true });
      body.push(['@finial.1', rect(ax - 6, ty - 4, 12, 4)], ['@finial.0', sceneDraw.ell(ax, ty - 10, 8, 6.5)], ['@finial.0', sceneDraw.ell(ax, ty - 19, 5, 4.2)]);
      body.push({ f: '@finial.2', d: sceneDraw.ell(ax - 2.5, ty - 11, 2.4, 3.6) + sceneDraw.ell(ax - 1.6, ty - 20, 1.4, 2.2), op: 0.6, detail: true });
      body.push(['@finial.1', rect(ax - 1, ty - 38, 2, 15)], { f: '@finial.2', d: rect(ax - 3, ty - 27, 6, 1.2) + rect(ax - 2.5, ty - 31, 5, 1.2) + rect(ax - 2, ty - 35, 4, 1.2), detail: true }, ['@finial.0', sceneDraw.ell(ax, ty - 39.5, 2.2, 2.2)]);
      if (winter) { snow += poly([[XC - tw / 2 + 4, y - 1], [ax, ty + 1], [XC + tw / 2 + tw * SIDE - 4, y - 1], [ax, ty + 5]]); body.push(['@snow.0', snow], ['@snow.1', cSide, 0.2]); }
      // clipped shrubs at the platform's foot, either side of the stair
      let sh0 = '', sh1 = '';
      for (let k = 0; k < 14; k++) { const half = k < 7, x = half ? px0 + 8 + k * 16 : XC + 44 + (k - 7) * 18, d = sceneDraw.blob(r, x + r() * 4, -3, 7 + r() * 2, 4 + r() * 1.5, 7, 0.3); if (k % 2) sh0 += d; else sh1 += d; }
      body.push(['@shrub.0', sh0], ['@shrub.1', sh1]);
      if (winter) body.push(['@snow.0', sh1, 0.6]);
      // night: gold floodlight up the brick, a warm line along every eave, the platform washed from below
      lit.push({ f: { lin: [[0, '@flood', 0.55], [1, '@flood', 0.12]], x1: 0, y1: -PH, x2: 0, y2: ty }, d: front + side });
      lit.push({ s: '@eave', w: 1.4, op: 0.9, d: eaves, glow: 'lamp' });
      lit.push({ f: { lin: [[0, '@flood', 0.4], [1, '@flood', 0.05]], x1: 0, y1: 0, x2: 0, y2: -PH }, d: rect(px0, -PH, PW + PS, PH) });
      return { body, lit };
    },
  });
})();
