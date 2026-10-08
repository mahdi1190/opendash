/* ============================================================
   SCENE LIBRARY: landmark.golden-gate-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Drawn by hand after the suspension bridge in the hand-drawn san-francisco-bridge-fog art (its two
   tall towers, the sweeping main cable and the hangers; `scene upgrade us-pacific/san-francisco-bridge-fog
   --box 300,200,1320,720` gave only the old art's flat pieces, so nothing extracted was kept):
   - the real structure: the Golden Gate Bridge, seen from Crissy Field (about 0.8 km east and 0.75 km
     south of the south tower, looking north-west), built in metres and put through one perspective
     projection, so the near (south) tower stands tall on the left and the far (north) tower is
     smaller; the 1,280 m main span and the 343 m side spans; each 227 m tower is two stepped legs
     (setbacks at the struts) joined by four portal struts above the roadway and by a strut and
     X-bracing below it, standing on a concrete pier (the south pier in its oval fender); the two
     main cables over the tower tops dip almost to the roadway at mid-span and run down to the
     anchorages; vertical hangers every 15.2 m; the deck's stiffening truss, its underside and the rail;
     the Marin approach viaduct on its piers
   - International Orange, lit from the left: the towers' south faces in the light, their east faces
     in shade
   - night: the towers floodlit in warm light (the 'lit' part), the roadway lamps (glow), the lit
     rail (no line at lamp-head height) and the red aviation lights on the tower tops
   No text, no flags. The fog is the scene's, not the object's. Anchor: the waterline at the south
   (near) tower's foot. 1 unit is about 1 m at that tower.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, ell, poly, define } = sceneDraw;
  // the camera, in metres from the south tower (w east, v north along the bridge, z above the water)
  const CE = 820, CN = -760, EYE = 30, FOC = 1650, HD = 322 * Math.PI / 180;
  const FX = Math.sin(HD), FY = Math.cos(HD), RX = Math.cos(HD), RY = -Math.sin(HD);
  const raw = (w, v, z) => { const a = w - CE, b = v - CN, d = a * FX + b * FY; return [FOC * (a * RX + b * RY) / d, -FOC * (z - EYE) / d]; };
  const O = raw(0, 0, 0);
  const P = (w, v, z) => { const p = raw(w, v, z); return [p[0] - O[0], p[1] - O[1]]; };
  const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
  const q = (pts) => poly(pts.map(a => P(a[0], a[1], a[2])));
  const SPAN = 1280, SIDE = 343, CW = 13.7, LEG = 16, PANEL = 15.2;
  // the roadway (a little camber on the main span) and the main cable's height along the bridge
  const deckZ = v => v >= 0 && v <= SPAN ? 64 + 3 * (1 - Math.pow((v - SPAN / 2) / (SPAN / 2), 2)) : 64 - 3 * Math.min(1, (v < 0 ? -v : v - SPAN) / SIDE);
  const cabZ = v => {
    if (v >= 0 && v <= SPAN) return 76 + 140 * Math.pow((v - SPAN / 2) / (SPAN / 2), 2);
    const t = v < 0 ? (v + SIDE) / SIDE : (SPAN + SIDE - v) / SIDE;
    return 46 + 170 * t - 72 * t * (1 - t);
  };
  // the towers: leg segments [z0, z1, half-width across, half-depth along], the portal struts [z0, z1]
  const SEG = [[13, 64, 4.8, 8.2], [64, 123, 4.5, 7.6], [123, 166, 4.1, 6.8], [166, 201, 3.7, 6], [201, 227, 3.4, 5.4]];
  const STRUT = [[114, 123], [158, 166], [194, 201], [216, 224]];
  const segAt = z => SEG.find(s => z >= s[0] && z <= s[1]) || SEG[SEG.length - 1];
  define({
    id: 'landmark.golden-gate-bridge', category: 'landmark', size: [1425, 374], box: [-520, -356, 905, 18], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      io: ['#d24a2f', '#a5341f', '#e8704f', '#7a2416'], deck: ['#b23c24', '#5a1e14', '#e08068', '#8e2e1c'], cable: ['#b8402a', '#8a2c1a'],
      conc: ['#c6beb0', '#968e80', '#6e685e'], flood: '#ffd49a', rail: '#ffcf8a', beacon: '#ff3b2e',
    } },
    night: { glow: { lamp: '#ffd690' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:us/place:san-francisco', 'us', 'us-pacific', 'bridge', 'suspension-bridge', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn san-francisco-bridge-fog art (its towers and cable)',
    build() {
      const body = [], lit = [];
      // the cables' sample points (40 m chords: the sag's chord error stays under 0.1 m); a vertical line stays vertical in this camera
      const vs = []; for (let k = 0; k <= 9; k++) vs.push(-SIDE + k * SIDE / 9); for (let k = 1; k <= 32; k++) vs.push(k * SPAN / 32); for (let k = 1; k <= 9; k++) vs.push(SPAN + k * SIDE / 9);
      const cable = w => line(vs.map(v => P(w, v, cabZ(v))));
      const hangers = w => { let d = ''; for (let v = -SIDE + PANEL; v < SPAN + SIDE - 4; v += PANEL) { if (Math.abs(v) < 9 || Math.abs(v - SPAN) < 9) continue; const a = P(w, v, cabZ(v)), b = P(w, v, deckZ(v) + 1); d += `M${f1(a[0])} ${f1(a[1])}V${f1(b[1])}`; } return d; };
      // 1. the far (west) cable and its hangers, faint behind the deck and the towers
      body.push({ s: '@cable.1', w: 1.6, op: 0.85, d: cable(-CW) }, { s: '@cable.1', w: 0.5, op: 0.6, d: hangers(-CW), detail: true });
      // the Marin approach: its piers down to the shore, behind the deck
      for (const v of [1700, 1780, 1860]) body.push(['@conc.1', q([[CW, v - 4, 0], [CW, v + 4, 0], [CW, v + 4, deckZ(v) - 7], [CW, v - 4, deckZ(v) - 7]])]);
      // the anchorage housings at the side spans' ends
      for (const v of [-SIDE, SPAN + SIDE]) {
        const s = v < 0 ? -1 : 1;
        body.push(['@conc.1', q([[-22, v - s * 12, 0], [22, v - s * 12, 0], [22, v - s * 12, 58], [-22, v - s * 12, 58]])], ['@conc.2', q([[22, v - 12, 0], [22, v + 12, 0], [22, v + 12, 58], [22, v - 12, 58]])]);
      }
      // 2. the towers, far parts first: the pier, the west leg, the bracing under the deck, the portal struts
      const at =(v0, pts) => pts.map(p => [p[0], p[1] + v0, p[2]]);
      const qa = (v0, pts) => q(at(v0, pts));
      const leg = (v0, wc, part) => {
        SEG.forEach(([z0, z1, hw, ha], i) => {
          body.push(['@io.0', qa(v0, [[wc - hw, -ha, z0], [wc + hw, -ha, z0], [wc + hw, -ha, z1], [wc - hw, -ha, z1]])], ['@io.1', qa(v0, [[wc + hw, -ha, z0], [wc + hw, ha, z0], [wc + hw, ha, z1], [wc + hw, -ha, z1]])]);
          // the setback's ledge, catching the light
          if (i > 0) body.push(['@io.2', qa(v0, [[wc - SEG[i - 1][2], -SEG[i - 1][3], z0], [wc + hw, -ha, z0 + 1.6], [wc - hw, -ha, z0 + 1.6]]), 0.8]);
          if (part === 'near') {
            // the leg's recessed flutes (detail): two grooves down the lit face, one down the shaded face
            const fl = [-0.35, 0.35].map(k => line([P(wc + k * hw, v0 - ha, z0 + 2), P(wc + k * hw, v0 - ha, z1 - 2)])).join('') + line([P(wc + hw, v0, z0 + 2), P(wc + hw, v0, z1 - 2)]);
            body.push({ s: '@io.3', w: 0.7, op: 0.55, d: fl, detail: true });
          }
        });
        // the saddle housing on the leg's top
        const [, , hw, ha] = SEG[SEG.length - 1];
        body.push(['@io.2', qa(v0, [[wc - hw + 0.6, -ha + 1, 227], [wc + hw - 0.6, -ha + 1, 227], [wc + hw - 0.6, -ha + 1, 229.5], [wc - hw + 0.6, -ha + 1, 229.5]])]);
      };
      const towerBack = v0 => {
        // the pier at the waterline: its lit face, its shaded side, its top and the wet foot
        body.push(['@conc.0', qa(v0, [[-24, -14, 0], [24, -14, 0], [24, -14, 13], [-24, -14, 13]])], ['@conc.1', qa(v0, [[24, -14, 0], [24, 14, 0], [24, 14, 13], [24, -14, 13]])], ['@conc.0', qa(v0, [[-24, -14, 13], [24, -14, 13], [24, 14, 13], [-24, 14, 13]]), 0.8], ['@conc.2', qa(v0, [[-24, -14, 0], [24, -14, 0], [24, 14, 0], [24, 14, 1.6], [24, -14, 1.6], [-24, -14, 1.6]]), 0.7]);
        if (v0 === 0) {
          // the south pier's oval fender: its outer wall where it faces the camera (north-east round to south-west), its lit top
          const ring = []; for (let k = 0; k <= 12; k++) { const a = (0.32 - k / 12) * Math.PI; ring.push([38 * Math.cos(a), 44 * Math.sin(a)]); }
          body.push(['@conc.1', poly(ring.map(([w, v]) => P(w, v, 0)).concat(ring.slice().reverse().map(([w, v]) => P(w, v, 6))))], ['@conc.0', poly(ring.map(([w, v]) => P(w, v, 6)).concat(ring.slice().reverse().map(([w, v]) => P(w * 0.88, v * 0.9, 6))))]);
        }
        leg(v0, -LEG, 'far');
        // under the deck: the X-bracing between the legs and the strut just below the roadway
        const xb = (z0, z1) => line([P(-LEG + 4.8, v0 - 7.6, z0), P(LEG - 4.8, v0 - 7.6, z1)]) + line([P(LEG - 4.8, v0 - 7.6, z0), P(-LEG + 4.8, v0 - 7.6, z1)]);
        body.push({ s: '@io.1', w: 2.6, d: xb(16, 52) }, ['@io.1', qa(v0, [[-LEG + 4.8, -7.4, 52], [LEG - 4.8, -7.4, 52], [LEG - 4.8, -7.4, 58], [-LEG + 4.8, -7.4, 58]])]);
        // the portal struts above the roadway: the lit face, its shaded soffit and the recessed panels (detail)
        STRUT.forEach(([z0, z1]) => {
          const [, , hw, ha] = segAt(z0 + 0.1), wi = LEG - hw;
          body.push(['@io.0', qa(v0, [[-wi, -ha + 0.8, z0], [wi, -ha + 0.8, z0], [wi, -ha + 0.8, z1], [-wi, -ha + 0.8, z1]])], ['@io.3', qa(v0, [[-wi, -ha + 0.8, z0], [wi, -ha + 0.8, z0], [wi, ha - 0.8, z0], [-wi, ha - 0.8, z0]]), 0.8]);
          let rib = ''; for (let k = 1; k < 8; k++) { const w = -wi + k * 2 * wi / 8; rib += line([P(w, v0 - ha + 0.8, z0 + 1.4), P(w, v0 - ha + 0.8, z1 - 1.4)]); }
          body.push({ s: '@io.1', w: 0.6, op: 0.7, d: rib, detail: true });
        });
      };
      towerBack(SPAN); towerBack(0);
      // 3. the deck: the underside between the trusses, the east truss face, its panels, the rail and the roadway's edge
      // (the deck is straight but for the main span's camber: a few points carry it)
      const dv = [-SIDE, 0, 160, 320, 480, 640, 800, 960, 1120, SPAN, SPAN + SIDE, 1880];
      body.push(['@deck.1', poly(dv.map(v => P(CW, v, deckZ(v) - 7.6)).concat(dv.slice().reverse().map(v => P(-CW, v, deckZ(v) - 7.6))))]);
      body.push(['@deck.0', poly(dv.map(v => P(CW, v, deckZ(v) + 0.6)).concat(dv.slice().reverse().map(v => P(CW, v, deckZ(v) - 7.6))))]);
      body.push(['@deck.3', poly(dv.map(v => P(CW, v, deckZ(v) - 5.6)).concat(dv.slice().reverse().map(v => P(CW, v, deckZ(v) - 7.6)))), 0.9]);
      let tr = ''; for (let v = -SIDE; v < 1880; v += PANEL) tr += line([P(CW, v, deckZ(v) - 0.4), P(CW, v + PANEL / 2, deckZ(v + PANEL / 2) - 7.2), P(CW, v + PANEL, deckZ(v + PANEL) - 0.4)]);
      body.push({ s: '@deck.3', w: 0.7, op: 0.75, d: tr, detail: true });
      const railD = line(dv.map(v => P(CW + 0.4, v, deckZ(v) + 1.4)));
      body.push({ s: '@deck.2', w: 1, op: 0.85, d: railD }, { s: '@deck.2', w: 0.6, op: 0.5, d: line(dv.map(v => P(CW, v, deckZ(v) + 0.4))), detail: true });
      // 4. the near (east) legs, in front of the deck, then the beacons on the tower tops
      for (const v0 of [SPAN, 0]) {
        leg(v0, LEG, 'near');
        for (const wc of [-LEG, LEG]) body.push(['@beacon', ell(...P(wc, v0 - 2, 231), 0.9, 0.9)]);
      }
      // 5. the near (east) cable over the saddles, its hangers, and a highlight along its top
      body.push({ s: '@cable.0', w: 2.4, d: cable(CW) }, { s: '@io.2', w: 0.8, op: 0.6, d: line(vs.map(v => P(CW, v, cabZ(v) + 0.7))), detail: true });
      body.push({ s: '@cable.0', w: 0.8, op: 0.9, d: hangers(CW) });
      // the roadway lamps on the east rail: their orange standards and the heads, in six groups (glow)
      const lampsD = ['', '', '', '', '', ''];
      let posts = '', i = 0;
      for (let v = -SIDE + 20; v < SPAN + SIDE; v += 46, i++) {
        const a = P(CW + 0.6, v, deckZ(v) + 1.2), p = P(CW + 0.6, v, deckZ(v) + 6), r = Math.max(0.45, 1.1 * 1100 / (1100 + v));
        posts += `M${f1(a[0])} ${f1(a[1])}L${f1(p[0])} ${f1(p[1])}`; lampsD[(i * 5) % 6] += ell(p[0], p[1], r, r * 0.8);
      }
      body.push({ s: '@io.1', w: 0.6, d: posts });
      lampsD.forEach(d => body.push({ f: '@io.3', d, glow: 'lamp' }));
      // night: the towers floodlit from below (each leg's two faces and the struts), the lit rail, the beacons' glow
      for (const v0 of [0, SPAN]) {
        for (const wc of [-LEG, LEG]) {
          const top = P(wc, v0, 227), foot = P(wc, v0, 13);
          // the floods light the legs' outer faces (the south face of both, the east face of the near one); the inner faces stay dark
          const out = wc < 0 ? [[wc - 4.8, -8.2, 13], [wc + 4.8, -8.2, 13], [wc + 3.4, -5.4, 227], [wc - 3.4, -5.4, 227]] : [[wc - 4.8, -8.2, 13], [wc + 4.8, -8.2, 13], [wc + 4.8, 8.2, 13], [wc + 3.4, 5.4, 227], [wc + 3.4, -5.4, 227], [wc - 3.4, -5.4, 227]];
          lit.push({ f: { lin: [[0, '@flood', 0.62], [0.55, '@flood', 0.32], [1, '@flood', 0.14]], x1: 0, y1: foot[1], x2: 0, y2: top[1] }, d: qa(v0, out) });
          lit.push({ f: { rad: [[0, '@beacon', 0.75], [1, '@beacon', 0]], cx: P(wc, v0 - 2, 231)[0], cy: P(wc, v0 - 2, 231)[1], r: 5 }, d: ell(...P(wc, v0 - 2, 231), 5, 5) });
        }
        const wi = LEG - 4.1;
        lit.push({ f: '@flood', op: 0.3, d: STRUT.map(([z0, z1]) => qa(v0, [[-wi, -6, z0], [wi, -6, z0], [wi, -6, z1], [-wi, -6, z1]])).join('') });
      }
      lit.push({ s: '@rail', w: 1.4, op: 0.85, d: railD });
      return { body, lit };
    },
  });
})();
