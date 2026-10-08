/* ============================================================
   SCENE LIBRARY, AREA nottingham (docs/dev/SCENE_ENGINE.md 2.2, 8.1): the Nottingham and Sherwood
   objects and the 'notts-city' archetype the composed Nottingham scenes are built from
   (71-scene-uk-nottingham-*.js, registered by 72-anim-pack-uk-area-nottingham.js).
   Drawn after the public form of each place, simplified, no text, no emblems, no club colours:
   - landmark.nottingham-castle       Castle Rock, the red sandstone cliff with its caves, and the
                                      Italianate ducal mansion on its top
   - landmark.trip-to-jerusalem       the whitewashed inn built against the foot of the rock, the
                                      castle wall above (its hanging sign is a blank board)
   - landmark.nottingham-council-house the Portland stone Council House: the arcaded ground floor,
                                      the portico, the drum and dome, the two stone lions in front
   - landmark.market-square-fountains the long granite pool of the Old Market Square and its jets
   - landmark.wollaton-hall           the Elizabethan prospect house: corner towers with strapwork
                                      gables and the raised central hall with its turrets
   - landmark.trent-bridge            three cast-iron arches on stone piers with a balustrade and lamps
   - landmark.major-oak               the great spreading oak of Sherwood, its limbs on props, in a
                                      ring fence; bare in winter
   - landmark.goose-fair-rides        a helter-skelter, a gallopers carousel and striped stalls
   - structure.goose-fair-wheel       a travelling big wheel (it turns)
   - building.lace-market-warehouse   v0 a tall red-brick lace warehouse with taking-in doors,
                                      v1 a classical lace showroom front with a pedimented centre
   - vehicle.nottingham-tram          a silver and dark-green low-floor tram (no operator marks)
   PURE: definitions only; build() runs lazily. All names here are local to the IIFE except the
   archetype function sceneArchNottsCity.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const { f1, rect, ell, circ, poly, define, winGroups } = sceneDraw;
  const lin = (a, b, y1, y2, x1, x2) => ({ lin: [[0, a], [1, b]], x1: x1 || 0, y1, x2: x2 || 0, y2 });
  const archW = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}a${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(w)} 0V${f1(y + h)}z`;
  const spike = (x, y, w, h) => poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]]);
  const limb = (x0, y0, x1, y1, w0, w1) => {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    return poly([[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]]);
  };
  const LEAF = sceneDraw.seasons({
    leaf: { spring: ['#5f9a3e', '#8cc05a', '#3e7230'], summer: ['#3f7a34', '#62a044', '#2c5a28'], autumn: ['#b8742a', '#d8a040', '#8a5a26'], winter: ['#6a6a58', '#8a8a74', '#4e5046'] },
  });

  /* ---------- landmark.nottingham-castle ---------- */
  define({
    id: 'landmark.nottingham-castle', category: 'landmark', size: [760, 470], variants: 1, seasonal: true, flippable: false,
    parts: ['body', 'trees', 'lit'],
    palette: Object.assign({ base: {
      rock: ['#c4865c', '#a46a48', '#7c4e36', '#d89c70'], stone: ['#ddcaa6', '#c2ae8a', '#9c8a68', '#efe4c8'], roof: ['#6a6e70', '#4c5052'],
      glass: ['#36424c', '#262e36'], cave: '#3a261e', flood: '#ffd6a4', warm: '#ffcf88',
    } }, LEAF),
    night: { glow: { window: '#ffd894', lamp: '#ffe8c0' }, on: 0.6 },
    shadow: { rx: 370, ry: 10, h: 200 },
    tags: ['landmark', 'signature', 'place:uk/nottingham-castle', 'uk', 'nottingham', 'castle', 'rock', 'sandstone', 'kit:urban'],
    credit: 'native: drawn for the Nottingham area scenes (after Castle Rock and the ducal mansion)',
    build(v, r) {
      const body = [], trees = [], lit = [], T = -300;
      const xl = y => (y > -50 ? -380 : -380 + (-y - 50) / (-T - 50) * 220);
      // the rock: a sloping east side and the sheer south-west face
      const pts = [[-380, 0], [-380, -50]];
      for (let y = -70; y >= T; y -= 30) pts.push([xl(y) + (r() - 0.5) * 12, y]);
      pts.push([-60, T - 6], [120, T - 4], [300, T], [338, T + 18], [350, -220], [356, -150], [366, -80], [378, -30], [380, 0]);
      body.push({ f: lin('@rock.3', '@rock.1', T, 0), d: poly(pts) });
      body.push(['@rock.2', poly([[300, T], [338, T + 18], [350, -220], [356, -150], [366, -80], [378, -30], [380, 0], [330, 0], [320, -120], [310, -230]]), 0.5]);
      let strata = '';
      for (let y = -24; y > T + 10; y -= 19 + Math.floor(r() * 8)) {
        const a = xl(y) + 14; let x = a; strata += `M${f1(a)} ${f1(y)}`;
        while (x < 340) { x += 40 + r() * 40; strata += `L${f1(Math.min(x, 345))} ${f1(y + (r() - 0.5) * 6)}`; }
      }
      body.push({ s: '@rock.2', w: 1.2, op: 0.5, d: strata, detail: true });
      let cracks = ''; for (let k = 0; k < 9; k++) { const x = -160 + k * 52 + r() * 20, y = -40 - r() * 200; cracks += `M${f1(x)} ${f1(y)}l${f1((r() - 0.5) * 8)} ${f1(30 + r() * 40)}`; }
      body.push({ s: '@rock.2', w: 1.6, op: 0.55, d: cracks, detail: true });
      // the caves cut in the foot of the rock
      for (const [x, w, h] of [[-120, 26, 40], [-40, 34, 52], [60, 22, 34], [190, 30, 44], [270, 20, 30]]) body.push(['@cave', archW(x, -h, w, h)], { f: '@warm', d: archW(x + 4, -h + 6, w - 8, h - 6), op: 0.12, glow: 'lamp' });
      body.push({ f: '@cave', d: archW(-10, -170, 18, 26), op: 0.8 }, { f: '@cave', d: archW(140, -210, 16, 22), op: 0.8 });
      // the terrace wall along the top and the ducal mansion
      body.push(['@stone.2', rect(-200, T - 12, 520, 14)]);
      let bal = ''; for (let x = -196; x < 318; x += 8) bal += `M${x} ${T - 12}v-10`;
      body.push({ s: '@stone.1', w: 2.2, d: bal }, ['@stone.0', rect(-200, T - 26, 520, 5)]);
      const M0 = -150, M1 = 270, MT = T - 150;
      body.push({ f: lin('@stone.3', '@stone.1', MT, T), d: rect(M0, MT, M1 - M0, T - MT - 12) }, ['@stone.2', rect(M1 - 12, MT, 12, T - MT - 12), 0.6]);
      // the central bay brought forward, with its pediment
      body.push({ f: lin('@stone.3', '@stone.0', MT - 30, T), d: rect(30, MT - 14, 90, T - MT + 2) }, ['@stone.0', poly([[24, MT - 14], [75, MT - 44], [126, MT - 14]])], ['@stone.2', poly([[40, MT - 17], [75, MT - 37], [110, MT - 17]]), 0.5]);
      body.push(['@stone.0', rect(M0 - 4, MT - 4, M1 - M0 + 8, 8)]);
      let bal2 = ''; for (let x = M0; x < M1; x += 7) bal2 += `M${x} ${MT - 4}v-9`;
      body.push({ s: '@stone.1', w: 2, d: bal2 }, ['@stone.0', rect(M0 - 4, MT - 16, M1 - M0 + 8, 4)]);
      for (const row of [[MT + 20, 44], [MT + 82, 40]]) for (let x = M0 + 16; x < M1 - 20; x += 32) {
        body.push({ f: '@glass.0', d: rect(x, row[0], 16, row[1]), glow: 'window' }, ['@stone.0', rect(x - 3, row[0] - 6, 22, 5)]);
      }
      body.push({ s: '@stone.2', w: 1, op: 0.5, d: `M${M0} ${MT + 74}H${M1}`, detail: true });
      // the chimneys and the roof line
      for (const cx of [M0 + 30, M1 - 40]) body.push(['@roof.0', rect(cx, MT - 34, 14, 18)]);
      // trees on the slope and the top
      for (let k = 0; k < 8; k++) {
        const y = -60 - k * 32, x = xl(y) + 30 + r() * 40, s = 22 + r() * 18;
        trees.push({ f: '@leaf.' + (k % 3), d: sceneDraw.blob(r, x, y - s * 0.4, s, s * 0.8, 7, 0.4) });
      }
      for (const x of [-190, -170, 300]) trees.push({ f: '@leaf.2', d: sceneDraw.blob(r, x, T - 40, 26, 34, 7, 0.4) }, { f: '@leaf.0', d: sceneDraw.blob(r, x + 8, T - 50, 16, 20, 6, 0.4), op: 0.8 });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.38]], x1: 0, y1: MT - 40, x2: 0, y2: 0 }, d: poly(pts) });
      return { body, trees, lit };
    },
  });

  /* ---------- landmark.trip-to-jerusalem ---------- */
  define({
    id: 'landmark.trip-to-jerusalem', category: 'landmark', size: [540, 400], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      rock: ['#c4865c', '#a46a48', '#7c4e36', '#d89c70'], render: ['#f2eee4', '#d8d2c4', '#b4ae9e'], tile: ['#9a4a34', '#7a3a2a'], stone: ['#c8b48e', '#a89470'],
      frame: '#2e3a30', glass: ['#34404a', '#232a32'], sign: '#2c4a36', wood: ['#7a5a3e', '#5a4230'], warm: '#ffcf88', flood: '#ffd6a8',
    } },
    night: { glow: { window: '#ffd690', lamp: '#ffe6b8' }, on: 0.85 },
    shadow: { rx: 260, ry: 8, h: 160 },
    tags: ['landmark', 'signature', 'place:uk/trip-to-jerusalem', 'uk', 'nottingham', 'inn', 'pub', 'rock', 'heritage', 'kit:urban'],
    credit: 'native: drawn for the Nottingham area scenes (after the inn at the foot of Castle Rock; no sign text)',
    build(v, r) {
      const body = [], lit = [];
      // the rock face rising behind, the castle wall on top
      const rp = [[-270, 0], [-270, -220], [-240, -280], [-200, -330], [-120, -350], [0, -358], [120, -350], [200, -340], [262, -320], [270, -200], [270, 0]];
      body.push({ f: lin('@rock.3', '@rock.1', -360, 0), d: poly(rp) });
      let st = ''; for (let y = -30; y > -340; y -= 22) st += `M-266 ${y}Q0 ${y + (r() - 0.5) * 10} 266 ${y - 4}`;
      body.push({ s: '@rock.2', w: 1.1, op: 0.45, d: st, detail: true });
      body.push(['@rock.2', poly([[200, -340], [262, -320], [270, -200], [270, 0], [236, 0], [230, -220]]), 0.5]);
      body.push(['@stone.1', rect(-60, -386, 300, 30)]);
      let cren = ''; for (let x = -58; x < 236; x += 18) cren += rect(x, -398, 10, 12);
      body.push(['@stone.0', cren], { s: '@stone.1', w: 0.8, op: 0.5, d: 'M-60 -372H240', detail: true });
      // the cave windows in the rock
      body.push(['@rock.2', archW(150, -280, 28, 36)], { f: '@glass.1', d: archW(156, -274, 16, 28), glow: 'window' }, ['@rock.2', archW(-210, -250, 22, 30)]);
      // the inn: the tall whitewashed front and the low wing set into the rock
      body.push({ f: lin('@render.0', '@render.1', -200, 0), d: rect(-170, -190, 190, 190) }, ['@render.2', rect(8, -190, 12, 190), 0.6]);
      body.push({ f: lin('@tile.0', '@tile.1', -240, -186), d: poly([[-182, -186], [-120, -238], [-36, -238], [28, -186]]) });
      body.push(['@render.1', rect(-130, -262, 18, 30)], ['@tile.1', rect(-134, -266, 26, 5)]);
      body.push({ f: lin('@render.0', '@render.1', -120, 0), d: rect(20, -120, 190, 120) }, { f: '@tile.0', d: poly([[14, -116], [40, -144], [214, -144], [214, -116]]) });
      body.push(['@rock.1', poly([[150, -144], [214, -170], [240, -120], [240, 0], [210, 0], [210, -120]])]);
      body.push(['@render.2', rect(-172, -8, 384, 8)]);
      // the sash windows and the doors
      const wins = [[-150, -172], [-100, -172], [-50, -172], [-150, -106], [-50, -106], [44, -96], [94, -96], [144, -96]];
      for (const [x, y] of wins) body.push({ f: '@glass.0', d: rect(x, y, 28, 40), glow: 'window' }, { s: '@frame', w: 1.4, d: `M${x} ${y + 20}h28M${x + 14} ${y}v40`, detail: true }, ['@frame', rect(x - 3, y + 40, 34, 4)]);
      body.push(['@frame', archW(-104, -78, 32, 74)], { f: '@warm', d: archW(-100, -72, 24, 68), op: 0.35, glow: 'lamp' }, ['@frame', rect(70, -62, 26, 58)], { f: '@warm', d: rect(73, -58, 20, 52), op: 0.3, glow: 'lamp' });
      // the hanging sign (a blank board), the lamps, the tables outside
      body.push({ s: '@frame', w: 2, d: 'M-14 -150h40M22 -150v10' }, ['@sign', rect(8, -140, 30, 36)], { s: '@stone.0', w: 1.2, d: rect(11, -137, 24, 30) });
      for (const lx of [-130, 40]) body.push(['@frame', rect(lx - 3, -96, 6, 12)], { f: '@warm', d: rect(lx - 2, -94, 4, 8), glow: 'lamp' });
      for (const tx of [-230, 230]) body.push(['@wood.0', rect(tx - 28, -22, 56, 5)], ['@wood.1', rect(tx - 34, -12, 68, 3)], { s: '@wood.1', w: 3, d: `M${tx - 22} -17l-6 17M${tx + 22} -17l6 17` });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.3]], x1: 0, y1: -400, x2: 0, y2: 0 }, d: poly(rp) }, { f: '@warm', d: rect(-170, -190, 380, 190), op: 0.12 });
      return { body, lit };
    },
  });

  /* ---------- landmark.nottingham-council-house ---------- */
  define({
    id: 'landmark.nottingham-council-house', category: 'landmark', size: [720, 520], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#ece6d4', '#d2c9b2', '#aea58c', '#8a836c'], lead: ['#8ea29a', '#6a807a', '#a8bcb4'], glass: ['#38444e', '#262e38'], granite: ['#9c9a96', '#7c7a76'],
      lion: ['#d8d0bc', '#b4ac96'], gold: '#d8b860', warm: '#ffd690', flood: '#fff0d0',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff0cc' }, on: 0.8 },
    shadow: { rx: 350, ry: 10, h: 220 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/council-house', 'uk', 'nottingham', 'civic', 'dome', 'classical', 'square', 'kit:urban'],
    credit: 'native: drawn for the Nottingham area scenes (after the Council House on the Old Market Square)',
    build() {
      const body = [], lit = [], W = 330, C = -210;
      body.push({ f: lin('@stone.0', '@stone.2', 0, 0, -W, W), d: rect(-W, C, 2 * W, -C) });
      // the arcaded ground floor
      let arc = '', arcIn = ''; for (let x = -W + 10; x < W - 30; x += 44) { arc += archW(x, -76, 30, 76); arcIn += archW(x + 4, -70, 22, 70); }
      body.push(['@stone.2', arc], { f: '@warm', d: arcIn, op: 0.25, glow: 'lamp' });
      body.push(['@stone.1', rect(-W, -90, 2 * W, 10)]);
      let rust = ''; for (let y = -10; y > -80; y -= 12) rust += `M${-W} ${y}H${W}`;
      body.push({ s: '@stone.3', w: 0.6, op: 0.3, d: rust, detail: true });
      // the upper windows
      let wA = '', wB = '', wH = '';
      for (let x = -W + 16; x < W - 20; x += 32) {
        if (Math.abs(x + 8) < 130) continue;
        wA += rect(x, -160, 16, 50); wH += poly([[x - 4, -164], [x + 8, -172], [x + 20, -164]]); wB += rect(x + 1, -196, 14, 20);
      }
      body.push({ f: '@glass.0', d: wA, glow: 'window' }, ['@stone.1', wH], { f: '@glass.1', d: wB, glow: 'window' });
      body.push(['@stone.1', rect(-W - 4, C - 6, 2 * W + 8, 10)]);
      let bal = ''; for (let x = -W; x < W; x += 8) bal += `M${x} ${C - 6}v-12`;
      body.push({ s: '@stone.1', w: 2.2, d: bal }, ['@stone.0', rect(-W - 4, C - 22, 2 * W + 8, 5)]);
      // corner pavilions with small domed turrets
      for (const px of [-W, W - 60]) {
        body.push({ f: lin('@stone.0', '@stone.1', C - 30, 0), d: rect(px, C - 30, 60, -C + 30) }, ['@stone.1', rect(px - 4, C - 36, 68, 8)]);
        body.push({ f: lin('@lead.2', '@lead.1', C - 80, C - 36), d: `M${px + 8} ${C - 36}Q${px + 30} ${C - 92} ${px + 52} ${C - 36}z` }, ['@stone.0', rect(px + 27, C - 92, 6, 12)]);
      }
      // the portico: columns, entablature and the sculpted pediment
      for (let k = 0; k < 6; k++) { const x = -112 + k * 42; body.push({ f: lin('@stone.0', '@stone.2', 0, 0, x, x + 16), d: rect(x, -206, 16, 116) }, ['@stone.1', rect(x - 3, -210, 22, 6)], ['@stone.1', rect(x - 2, -94, 20, 5)]); }
      body.push(['@glass.1', rect(-104, -200, 208, 108), 0.4], { f: '@warm', d: rect(-30, -180, 60, 86), op: 0.25, glow: 'lamp' });
      body.push(['@stone.0', rect(-128, -232, 256, 22)], ['@stone.1', poly([[-134, -232], [0, -282], [134, -232]])], ['@stone.2', poly([[-110, -236], [0, -274], [110, -236]]), 0.45]);
      body.push({ s: '@stone.3', w: 1.4, op: 0.5, d: 'M-80 -240q10 -14 20 0q10 -16 20 0M20 -240q10 -16 20 0q10 -14 20 0M-14 -244q14 -22 28 0', detail: true });
      // the drum, dome, lantern and the golden ball
      body.push(['@stone.1', rect(-86, -312, 172, 30)], { f: lin('@stone.0', '@stone.2', 0, 0, -66, 66), d: rect(-66, -380, 132, 68) });
      for (let k = 0; k < 9; k++) { const x = -60 + k * 15; body.push(['@stone.0', rect(x, -378, 5, 64)]); if (k < 8) body.push({ f: '@glass.0', d: rect(x + 6, -366, 8, 36), glow: 'window' }); }
      body.push(['@stone.1', rect(-72, -388, 144, 10)]);
      body.push({ f: lin('@lead.2', '@lead.1', 0, 0, -74, 74), d: 'M-74 -388Q-72 -488 0 -494Q72 -488 74 -388z' });
      body.push({ s: '@lead.1', w: 1.4, op: 0.7, d: 'M-40 -390Q-38 -470 0 -492M40 -390Q38 -470 0 -492M0 -390V-492M-62 -390Q-60 -450 -22 -484M62 -390Q60 -450 22 -484' });
      body.push(['@stone.0', rect(-14, -526, 28, 36)], ['@lead.1', 'M-18 -526Q0 -546 18 -526z'], ['@gold', circ(0, -552, 6)]);
      for (let k = 0; k < 3; k++) body.push({ f: '@glass.1', d: rect(-9 + k * 7, -520, 4, 22), glow: 'window' });
      // the steps and the two lions on their plinths
      body.push(['@stone.2', rect(-150, -8, 300, 8)], ['@stone.1', rect(-140, -14, 280, 6)]);
      for (const [lx, dir] of [[-240, -1], [240, 1]]) {
        body.push({ f: lin('@granite.0', '@granite.1', -40, 0), d: rect(lx - 40, -40, 80, 40) }, ['@granite.0', rect(lx - 44, -44, 88, 6)]);
        body.push(['@lion.1', ell(lx - dir * 6, -54, 30, 11)], ['@lion.0', ell(lx + dir * 22, -62, 13, 15)], ['@lion.1', ell(lx + dir * 30, -56, 7, 6)]);
        body.push(['@lion.0', rect(lx + dir * 6 - 18, -50, 36, 6)], { s: '@lion.1', w: 2, d: `M${lx - dir * 34} -50q${-dir * 8} -4 ${-dir * 4} -12`, detail: true });
      }
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.4]], x1: 0, y1: -560, x2: 0, y2: 0 }, d: rect(-80, -560, 160, 560) });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.3]], x1: 0, y1: -240, x2: 0, y2: 0 }, d: rect(-W, -240, 2 * W, 240) }, ['@gold', circ(0, -552, 4)]);
      return { body, lit };
    },
  });

  /* ---------- landmark.market-square-fountains ---------- */
  define({
    id: 'landmark.market-square-fountains', category: 'landmark', size: [780, 150], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'jets', 'spray', 'lit'],
    palette: { base: {
      granite: ['#b8b6b0', '#9a9892', '#7a7872', '#d4d2cc'], water: ['#8ab4c4', '#5a8a9c', '#c4e0ea'], jet: '#e8f4f8', lamp: '#d8f0ff',
    } },
    night: { glow: { lamp: '#cfeaff' }, on: 1 },
    anim: { flicker: { part: 'jets', op: [0.6, 1], period: 1.7 }, bob: { part: 'spray', dy: 3, period: 1.3 } },
    shadow: { rx: 380, ry: 6, h: 20 },
    tags: ['landmark', 'place:uk/old-market-square', 'uk', 'nottingham', 'fountain', 'water', 'square', 'kit:urban'],
    credit: 'native: drawn for the Nottingham area scenes (after the pools and jets of the Old Market Square)',
    build() {
      const body = [], jets = [], spray = [], lit = [];
      // the long low cascade wall, the pool and its granite kerb
      body.push({ f: lin('@granite.3', '@granite.1', -40, -20), d: rect(-360, -40, 720, 22) }, ['@granite.2', rect(-360, -20, 720, 3), 0.7]);
      body.push({ f: lin('@water.2', '@water.0', -40, -32), d: rect(-356, -38, 712, 4), op: 0.8 });
      body.push({ f: lin('@water.0', '@water.1', -18, 0), d: 'M-390 -18H390L380 -4H-380z' }, ['@granite.0', rect(-392, -4, 784, 6)]);
      let ripples = ''; for (let x = -360; x < 360; x += 30) ripples += `M${x} -10h14`;
      body.push({ s: '@water.2', w: 1, op: 0.6, d: ripples, detail: true });
      // the jets along the pool, tall and short in turn
      for (let k = 0; k < 19; k++) {
        const x = -342 + k * 38, h = k % 2 ? 52 : 92 + (k % 4) * 6;
        jets.push({ s: '@jet', w: 2.6, d: `M${x} -16Q${x + 2} ${-16 - h * 0.6} ${x} ${-16 - h}` });
        spray.push({ f: '@jet', d: circ(x - 3, -16 - h, 4) + circ(x + 3, -14 - h, 3.4) + circ(x, -10 - h * 0.5, 2.4), op: 0.75 });
        lit.push({ f: '@lamp', d: ell(x, -14, 6, 3), op: 0.7 });
        body.push({ f: '@lamp', d: ell(x, -15, 2.4, 1.2), op: 0.5, glow: 'lamp' });
      }
      return { body, jets, spray, lit };
    },
  });

  /* ---------- landmark.wollaton-hall ---------- */
  define({
    id: 'landmark.wollaton-hall', category: 'landmark', size: [760, 470], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#e2cc98', '#c8b07c', '#a08a5c', '#f0e0b4'], roof: ['#6a6a62', '#4e4e48'], glass: ['#3c4650', '#2a323a'], warm: '#ffd08a', flood: '#ffe4b0',
    } },
    night: { glow: { window: '#ffd894', lamp: '#ffeac4' }, on: 0.6 },
    shadow: { rx: 370, ry: 10, h: 240 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/wollaton-hall', 'uk', 'nottingham', 'elizabethan', 'hall', 'park', 'kit:urban', 'kit:temperate'],
    credit: 'native: drawn for the Nottingham area scenes (after Wollaton Hall)',
    build() {
      const body = [], lit = [];
      const mull = (x, y, w, h) => { body.push({ f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, { s: '@stone.1', w: 1.4, d: `M${x} ${y + h * 0.4}h${w}M${x + w / 2} ${y}v${h}`, detail: true }); };
      const gable = (cx, y, w) => {
        body.push({ f: '@stone.3', d: `M${cx - w / 2} ${y}C${cx - w / 2} ${y - 20} ${cx - w / 4} ${y - 14} ${cx - w / 4} ${y - 30}C${cx - w / 4} ${y - 44} ${cx} ${y - 40} ${cx} ${y - 56}C${cx} ${y - 40} ${cx + w / 4} ${y - 44} ${cx + w / 4} ${y - 30}C${cx + w / 4} ${y - 14} ${cx + w / 2} ${y - 20} ${cx + w / 2} ${y}z` });
        body.push(['@stone.1', spike(cx, y - 56, 6, 16)], ['@stone.1', spike(cx - w / 2 + 3, y, 6, 22)], ['@stone.1', spike(cx + w / 2 - 3, y, 6, 22)]);
      };
      // the main block, two storeys of mullioned windows with niches between
      body.push({ f: lin('@stone.3', '@stone.1', -180, 0), d: rect(-290, -180, 580, 180) });
      for (let x = -270; x < 270; x += 46) { mull(x, -160, 26, 56); mull(x, -84, 26, 62); }
      for (let x = -246; x < 250; x += 46) body.push(['@stone.2', archW(x + 1, -150, 14, 30), 0.7], ['@stone.2', archW(x + 1, -76, 14, 30), 0.7]);
      body.push(['@stone.1', rect(-292, -96, 584, 6)], ['@stone.0', rect(-294, -186, 588, 8)]);
      let bal = ''; for (let x = -290; x < 290; x += 8) bal += `M${x} -186v-10`;
      body.push({ s: '@stone.1', w: 2, d: bal }, ['@stone.0', rect(-294, -200, 588, 4)]);
      // the four corner towers (two seen) with strapwork gables and obelisks
      for (const tx of [-370, 270]) {
        body.push({ f: lin('@stone.3', '@stone.1', -260, 0), d: rect(tx, -260, 100, 260) }, ['@stone.2', rect(tx + 90, -260, 10, 260), 0.5]);
        for (const y of [-240, -160, -84]) mull(tx + 14, y, 72, y === -240 ? 50 : 60);
        body.push(['@stone.1', rect(tx - 4, -266, 108, 8)]);
        gable(tx + 50, -266, 70);
        for (const ox of [tx + 2, tx + 98]) body.push(['@stone.0', rect(ox - 3, -290, 6, 24)], ['@stone.1', spike(ox, -290, 8, 18)]);
      }
      // the raised central hall with its great windows and corner turrets
      body.push({ f: lin('@stone.3', '@stone.1', -400, -200), d: rect(-120, -390, 240, 190) }, ['@stone.2', rect(110, -390, 10, 190), 0.5]);
      for (let x = -104; x < 100; x += 42) { mull(x, -372, 30, 70); mull(x, -290, 30, 76); }
      body.push(['@stone.1', rect(-124, -298, 248, 6)], ['@stone.0', rect(-126, -396, 252, 8)]);
      for (const cx of [-120, 120]) {
        body.push({ f: lin('@stone.0', '@stone.1', -440, -200), d: rect(cx - 18, -440, 36, 240) }, ['@stone.1', rect(cx - 22, -446, 44, 8)]);
        body.push({ f: '@glass.0', d: rect(cx - 8, -420, 16, 30), glow: 'window' }, { f: '@glass.0', d: rect(cx - 8, -340, 16, 40), glow: 'window' });
        for (const ox of [cx - 18, cx + 18]) body.push(['@stone.1', spike(ox, -446, 8, 22)]);
        body.push(['@roof.0', spike(cx, -446, 26, 18)]);
      }
      for (const gx of [-60, 60]) gable(gx, -396, 70);
      // the terrace and its steps
      body.push(['@stone.2', rect(-380, -6, 760, 6)], ['@stone.1', rect(-60, -14, 120, 8)]);
      body.push(['@glass.1', archW(-18, -72, 36, 58)], { f: '@warm', d: archW(-14, -66, 28, 52), op: 0.3, glow: 'lamp' });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.36]], x1: 0, y1: -470, x2: 0, y2: 0 }, d: rect(-370, -470, 740, 470) });
      return { body, lit };
    },
  });

  /* ---------- landmark.trent-bridge ---------- */
  define({
    id: 'landmark.trent-bridge', category: 'landmark', size: [1000, 190], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#d4c4a2', '#b4a482', '#8c7e60', '#e8dcc0'], iron: ['#5e7884', '#465e6a', '#8aa4ae'], cream: '#e8e0c8', lamp: '#ffe6a8', post: '#2e3a40',
    } },
    night: { glow: { lamp: '#ffe8b0' }, on: 1 },
    shadow: { rx: 480, ry: 6, h: 60 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/trent-bridge', 'uk', 'nottingham', 'bridge', 'river', 'trent', 'ironwork', 'kit:urban', 'kit:water'],
    credit: 'native: drawn for the Nottingham area scenes (after Trent Bridge)',
    build() {
      const body = [], lit = [], DK = -128;
      const spans = [[-460, -190], [-150, 150], [190, 460]];
      // the piers and abutments
      for (const [x, w] of [[-500, 40], [-190, 40], [150, 40], [460, 40]]) {
        body.push({ f: lin('@stone.3', '@stone.1', DK, 0), d: rect(x, DK, w, -DK) }, ['@stone.2', rect(x + w - 8, DK, 8, -DK), 0.6]);
        body.push({ s: '@stone.2', w: 0.8, op: 0.5, d: `M${x} -30h${w}M${x} -60h${w}M${x} -90h${w}`, detail: true }, ['@stone.0', rect(x - 4, -48, w + 8, 6)]);
      }
      // the iron arches: a rib, the spandrel posts and rings
      for (const [a, b] of spans) {
        const m = (a + b) / 2, half = (b - a) / 2, yAt = x => -30 - 88 * (1 - ((x - m) / half) ** 2);
        let rib = `M${a} -30`; for (let x = a + 10; x <= b; x += 10) rib += `L${x} ${f1(yAt(x))}`;
        body.push({ s: '@iron.1', w: 9, d: rib }, { s: '@iron.2', w: 2.4, d: rib.replace(/L(-?\d+) (-?[\d.]+)/g, (q, x, y) => `L${x} ${f1(+y - 3)}`) });
        let posts = '', rings = '';
        for (let x = a + 20; x < b - 10; x += 22) { const y = yAt(x); posts += `M${x} ${f1(y - 4)}V${DK + 10}`; if (y - (DK + 10) > 24) rings += ell(x + 11, f1((y + DK + 10) / 2), 6, 6); }
        body.push({ s: '@iron.0', w: 2.4, d: posts }, { s: '@iron.0', w: 1.6, d: rings || 'M0 0', detail: true });
      }
      // the deck fascia, the balustrade and the lamp standards
      body.push({ f: lin('@iron.2', '@iron.0', DK - 4, DK + 12), d: rect(-500, DK, 1000, 14) }, ['@cream', rect(-500, DK + 4, 1000, 2), 0.8]);
      body.push(['@stone.1', rect(-504, DK - 26, 1008, 6)], ['@stone.0', rect(-504, DK - 4, 1008, 5)]);
      let bal = ''; for (let x = -500; x < 500; x += 9) bal += `M${x} ${DK - 20}v16`;
      body.push({ s: '@stone.1', w: 2.6, d: bal });
      for (const lx of [-480, -170, 170, 480, -320, 0, 320]) {
        body.push({ s: '@post', w: 3, d: `M${lx} ${DK - 26}V${DK - 70}` }, ['@post', rect(lx - 7, DK - 84, 14, 14)], { f: '@lamp', d: rect(lx - 5, DK - 82, 10, 10), glow: 'lamp' });
        lit.push({ f: '@lamp', d: circ(lx, DK - 77, 14), op: 0.25 });
      }
      return { body, lit };
    },
  });

  /* ---------- landmark.major-oak ---------- */
  define({
    id: 'landmark.major-oak', category: 'landmark', size: [820, 540], variants: 1, seasonal: true, shapeBySeason: true, flippable: true,
    parts: ['trunk', 'props', 'crown'],
    palette: {
      base: { bark: ['#5e4c3a', '#43362a', '#7c6a54'], moss: '#6a7a3e', prop: ['#3a3e40', '#5a5e60'], fence: ['#7a6248', '#5a4632'], leaf: ['#2f5a2a', '#47732f', '#6f9a42', '#94b858'] },
      spring: { leaf: ['#4a7a30', '#6a9a3a', '#94bc4a', '#c0da6a'] },
      summer: { leaf: ['#2a5226', '#406c2e', '#62903e', '#86ae50'] },
      autumn: { leaf: ['#6e4a1e', '#9a6426', '#c08a34', '#dcb04a'] },
      winter: { leaf: ['#6a5a48', '#7e6c58', '#94826a', '#a89880'] },
    },
    anim: { sway: { part: 'crown', pivot: [0, -150], deg: 0.5 } },
    shadow: { rx: 380, ry: 14, h: 120 },
    tags: ['landmark', 'signature', 'place:uk/major-oak', 'uk', 'nottingham', 'sherwood', 'oak', 'tree', 'forest', 'kit:temperate'],
    credit: 'native: drawn for the Nottingham area scenes (after the Major Oak in Sherwood Forest)',
    build(v, r, ctx) {
      const trunk = [], props = [], crown = [], bare = ctx && ctx.season === 'winter';
      // the great bole, its burrs, and the limbs reaching far out and low
      trunk.push({ f: lin('@bark.2', '@bark.1', 0, 0, -80, 80), d: 'M-90 0C-70 -40 -66 -100 -60 -150C-40 -170 40 -172 62 -150C66 -100 74 -40 96 0z' });
      trunk.push({ s: '@bark.1', w: 2, op: 0.6, d: 'M-50 -10C-44 -60 -40 -110 -30 -150M10 0C12 -60 8 -110 14 -158M50 -6C46 -60 46 -110 40 -150', detail: true }, ['@moss', ell(-40, -60, 14, 22), 0.4], ['@bark.1', ell(30, -90, 10, 14), 0.6]);
      const limbs = [[-40, -150, -340, -230, 26, 9], [-30, -160, -200, -330, 24, 9], [0, -165, 30, -400, 24, 8], [30, -160, 220, -320, 24, 9], [40, -150, 350, -210, 26, 9], [-10, -160, -110, -420, 18, 6], [20, -160, 140, -410, 18, 6]];
      for (const [x0, y0, x1, y1, w0, w1] of limbs) trunk.push({ f: '@bark.0', d: limb(x0, y0, x1, y1, w0, w1) }, { f: '@bark.2', d: limb(x0, y0 - 3, x1, y1 - 3, w0 * 0.3, w1 * 0.3), op: 0.5 });
      // branches out from each limb end
      let tw = '';
      for (const [, , x1, y1] of limbs) for (let k = 0; k < (bare ? 7 : 3); k++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4, L = 40 + r() * 70; tw += `M${x1} ${y1}l${f1(Math.cos(a) * L)} ${f1(Math.sin(a) * L)}`; }
      trunk.push({ s: '@bark.0', w: bare ? 3 : 4, d: tw });
      // the props under the long limbs and the ring fence
      for (const [x, y] of [[-300, -222], [-190, -300], [300, -206], [200, -300]]) props.push({ s: '@prop.0', w: 5, d: `M${x} 0V${y + 8}` }, ['@prop.1', rect(x - 9, y + 4, 18, 6)], ['@prop.0', rect(x - 8, -4, 16, 4)]);
      let rails = ''; for (let x = -390; x <= 390; x += 39) rails += `M${x} 2v-30`;
      props.push({ s: '@fence.1', w: 3, d: rails }, { s: '@fence.0', w: 2.4, d: 'M-392 -24H392M-392 -12H392' });
      // the crown: a broad low dome of leaf masses (thin and twiggy in winter)
      const n = bare ? 26 : 46;
      for (let k = 0; k < n; k++) {
        const a = Math.PI + (k / n) * Math.PI, rr = 0.55 + r() * 0.45, cx = Math.cos(a) * 340 * rr, cy = -230 + Math.sin(a) * 260 * rr, s = 40 + r() * 46;
        crown.push({ f: '@leaf.' + Math.floor(r() * 4), d: sceneDraw.blob(r, cx, cy, s, s * 0.75, 8, 0.45), op: bare ? 0.35 : 1 });
      }
      if (!bare) for (let k = 0; k < 14; k++) crown.push({ f: '@leaf.3', d: sceneDraw.blob(r, -280 + r() * 560, -420 + r() * 200, 20 + r() * 16, 14 + r() * 10, 6, 0.4), op: 0.8 });
      return { trunk, props, crown };
    },
  });

  /* ---------- structure.goose-fair-wheel ---------- */
  define({
    id: 'structure.goose-fair-wheel', category: 'structure', size: [340, 400], variants: 1, seasonal: false, flippable: false,
    parts: ['legs', 'wheel', 'lit'],
    palette: { base: { steel: ['#f4f2ee', '#c8c6c2', '#8a8a8e'], cab: ['#d8443a', '#f2c230', '#3a8ad0', '#4aae6a', '#9a5ab8'], bulb: '#ffe68a', hub: '#e8d8a8' } },
    night: { glow: { lamp: '#ffe8a0' }, on: 1 },
    anim: { spin: { part: 'wheel', pivot: [0, -226], period: 90 } },
    shadow: { rx: 120, ry: 5, h: 40 },
    tags: ['uk', 'nottingham', 'goose fair', 'fair', 'wheel', 'big wheel', 'kit:urban', 'role:building-mid'],
    credit: 'native: drawn for the Nottingham area scenes (a travelling big wheel at the Goose Fair, no marks)',
    build() {
      const legs = [], wheel = [], lit = [], HY = -226, R = 160, N = 16;
      legs.push({ s: '@steel.2', w: 8, d: `M-110 -6L-4 ${HY}M110 -6L4 ${HY}` }, { s: '@steel.0', w: 4, d: `M-110 -6L-4 ${HY}M110 -6L4 ${HY}` }, { s: '@steel.1', w: 3, d: 'M-80 -70H80M-50 -130H50' });
      legs.push(['@steel.2', rect(-130, -10, 260, 10)], ['@cab.0', rect(-60, -30, 120, 20)], ['@steel.0', rect(-66, -34, 132, 5)]);
      wheel.push({ s: '@steel.0', w: 4, d: ell(0, HY, R, R) }, { s: '@steel.1', w: 2, d: ell(0, HY, R - 14, R - 14) });
      let sp = ''; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; sp += `M0 ${HY}L${f1(Math.cos(a) * R)} ${f1(HY + Math.sin(a) * R)}`; }
      wheel.push({ s: '@steel.1', w: 1.6, d: sp }, ['@hub', circ(0, HY, 14)]);
      const cabs = ['', '', '', '', ''];
      for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2; cabs[i % 5] += ell(Math.cos(a) * (R + 4), HY + Math.sin(a) * (R + 4), 10, 10); }
      cabs.forEach((d, k) => wheel.push(['@cab.' + k, d]));
      let bl = ''; for (let i = 0; i < N * 2; i++) { const a = i / (N * 2) * Math.PI * 2; bl += circ(Math.cos(a) * R, HY + Math.sin(a) * R, 2.4); }
      wheel.push({ f: '@bulb', d: bl, glow: 'lamp' });
      lit.push({ s: '@bulb', w: 3, op: 0.5, d: ell(0, HY, R, R) }, { s: '@bulb', w: 2, op: 0.35, d: sp });
      return { legs, wheel, lit };
    },
  });

  /* ---------- landmark.goose-fair-rides ---------- */
  define({
    id: 'landmark.goose-fair-rides', category: 'landmark', size: [840, 330], variants: 1, seasonal: false, flippable: true,
    parts: ['body', 'ride', 'lit'],
    palette: { base: {
      red: ['#d43c34', '#a82a24'], white: ['#f6f2ea', '#d8d2c6'], gold: ['#e8c050', '#b8902c'], blue: ['#2e5aa8', '#22447e'], green: ['#2e8a52', '#226a3e'],
      wood: ['#7a5a3e', '#5a4230'], horse: ['#f4efe4', '#c8a070'], bulb: '#ffe68a', warm: '#ffd690', dark: '#2a2a30',
    } },
    night: { glow: { lamp: '#ffe8a0' }, on: 1 },
    anim: { bob: { part: 'ride', dy: 4, period: 1.6 } },
    shadow: { rx: 410, ry: 8, h: 80 },
    tags: ['landmark', 'signature', 'place:uk/goose-fair', 'uk', 'nottingham', 'goose fair', 'fair', 'tradition', 'kit:urban'],
    credit: 'native: drawn for the Nottingham area scenes (the rides of a travelling fair; no marks, no text)',
    build() {
      const body = [], ride = [], lit = [];
      // the helter-skelter: a striped tapering tower, the spiral slide and the cap with its pennant
      const hx = -300;
      for (let k = 0; k < 10; k++) { const y0 = -k * 26, y1 = y0 - 26, w0 = 46 - k * 2.2, w1 = 46 - (k + 1) * 2.2; body.push(['@' + (k % 2 ? 'white.0' : 'red.0'), poly([[hx - w0, y0], [hx - w1, y1], [hx + w1, y1], [hx + w0, y0]])]); }
      let slide = ''; for (let k = 0; k < 5; k++) { const y = -250 + k * 52; slide += `M${hx - 60} ${y + 10}L${hx + 60} ${y + 36}M${hx + 60} ${y + 36}L${hx - 60} ${y + 62}`; }
      body.push({ s: '@gold.1', w: 8, d: slide }, { s: '@gold.0', w: 4, d: slide });
      body.push(['@red.1', poly([[hx - 40, -260], [hx, -320], [hx + 40, -260]])], ['@white.0', poly([[hx - 40, -260], [hx - 14, -300], [hx - 6, -260]]), 0.4], { s: '@dark', w: 1.6, d: `M${hx} -320v-14` }, ['@blue.0', poly([[hx, -334], [hx + 18, -330], [hx, -326]])]);
      // the gallopers: platform, the striped canopy, the rounding boards, poles and horses (they rise and fall)
      const cx = 0, CY = -210;
      body.push(['@wood.1', ell(cx, -12, 150, 14)], ['@gold.1', rect(cx - 150, -24, 300, 12)]);
      for (let k = 0; k < 12; k++) { const x0 = cx - 160 + k * 26.7; body.push(['@' + (k % 2 ? 'white.0' : 'red.0'), poly([[x0, CY], [cx, CY - 70], [x0 + 26.7, CY]])]); }
      body.push(['@gold.0', rect(cx - 160, CY, 320, 22)], ['@red.1', rect(cx - 160, CY + 22, 320, 6)]);
      for (let k = 0; k < 10; k++) body.push(['@white.0', `M${cx - 160 + k * 32} ${CY + 28}a16 10 0 0 0 32 0z`]);
      body.push(['@gold.0', circ(cx, CY - 74, 8)], { s: '@dark', w: 1.6, d: `M${cx} ${CY - 82}v-14` }, ['@red.0', poly([[cx, CY - 96], [cx + 18, CY - 92], [cx, CY - 88]])]);
      body.push(['@dark', rect(cx - 30, CY + 34, 60, 160), 0.35]);
      for (let k = 0; k < 7; k++) {
        const x = cx - 132 + k * 44, y = -80 - (k % 2) * 16;
        body.push({ s: '@gold.0', w: 2.4, d: `M${x} ${CY + 34}V-24` });
        const hd = k % 2 ? -1 : 1;
        ride.push(['@horse.0', ell(x, y, 18, 8)], ['@horse.0', poly([[x + hd * 12, y - 4], [x + hd * 24, y - 22], [x + hd * 30, y - 18], [x + hd * 18, y + 2]])], ['@red.0', rect(x - 6, y - 8, 12, 5)]);
        ride.push({ s: '@horse.1', w: 2.4, d: `M${x - 12} ${y + 6}l-6 14M${x + 12} ${y + 6}l6 14` });
      }
      // the stalls: striped awnings, counters and prizes
      for (let k = 0; k < 3; k++) {
        const sx = 180 + k * 84, col = ['blue', 'green', 'red'][k];
        body.push(['@wood.0', rect(sx, -110, 76, 110)], ['@dark', rect(sx + 6, -96, 64, 50), 0.6], ['@' + col + '.0', rect(sx, -46, 76, 46)]);
        for (let j = 0; j < 4; j++) body.push(['@' + (j % 2 ? 'white.0' : col + '.0'), poly([[sx + j * 19, -110], [sx + j * 19 + 6, -134], [sx + (j + 1) * 19 + 6, -134], [sx + (j + 1) * 19, -110]])]);
        for (let j = 0; j < 4; j++) body.push(['@' + ['gold.0', 'red.0', 'blue.0', 'green.0'][(j + k) % 4], circ(sx + 14 + j * 16, -80, 6)]);
      }
      // the bulbs along every edge
      const bulbs = [];
      for (let k = 0; k <= 20; k++) bulbs.push([cx - 160 + k * 16, CY + 6]);
      for (let k = 0; k < 9; k++) bulbs.push([hx - 44 + k * 2.6, -14 - k * 28], [hx + 44 - k * 2.6, -14 - k * 28]);
      for (let k = 0; k < 16; k++) bulbs.push([180 + k * 16, -136]);
      body.push({ f: '@bulb', d: bulbs.map(([x, y]) => circ(x, y, 2.4)).join(''), glow: 'lamp' });
      lit.push({ f: '@warm', d: ell(cx, -110, 190, 120), op: 0.22 }, { f: '@warm', d: rect(176, -140, 256, 140), op: 0.2 }, { f: '@warm', d: ell(hx, -140, 70, 160), op: 0.16 });
      return { body, ride, lit };
    },
  });

  /* ---------- building.lace-market-warehouse (v0 a lace warehouse, v1 a classical showroom front) ---------- */
  define({
    id: 'building.lace-market-warehouse', category: 'building', size: [420, 360], variants: 2, seasonal: false, flippable: true,
    parts: ['body', 'lit'],
    palette: { base: {
      brick: ['#a4553c', '#86422e', '#bf6c4e', '#622e20'], stone: ['#ddd0b2', '#b8aa8a'], roof: ['#4e5458', '#3a3f43'], glass: ['#3a4650', '#26303a'],
      door: ['#2e4a3a', '#3a2e2a'], iron: '#2a2c30', warm: '#ffcf86',
    } },
    night: { glow: { window: '#ffd488' }, on: 0.55 },
    shadow: { rx: 200, ry: 10, h: 300 },
    tags: ['signature', 'row', 'uk', 'nottingham', 'lace market', 'warehouse', 'brick', 'victorian', 'kit:urban', 'role:building-mid'],
    credit: 'native: drawn for the Nottingham area scenes (Lace Market warehouses and Hockley fronts, generic)',
    build(v, r) {
      const body = [], lit = [], show = v === 1, H = show ? 280 : 330, x0 = -200, x1 = 200;
      body.push({ f: lin('@brick.2', '@brick.1', -H, 0), d: rect(x0, -H, x1 - x0, H) }, ['@brick.3', rect(x1 - 8, -H, 8, H), 0.4]);
      body.push({ s: '@brick.3', w: 0.6, op: 0.22, d: Array.from({ length: Math.floor(H / 8) }, (_, k) => `M${x0} ${-4 - k * 8}H${x1}`).join(''), detail: true });
      const floors = show ? 4 : 5, fh = (H - 40) / floors, cols = show ? 8 : 7, cw = (x1 - x0) / cols;
      const cells = [];
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        if (!show && c === 3) continue;
        if (show && f === floors - 1 && (c === 3 || c === 4)) continue;
        cells.push([x0 + c * cw + cw * 0.18, -H + 22 + f * fh, cw * 0.64, fh * 0.66]);
      }
      winGroups(r, cells, 8).forEach(d => body.push({ f: '@glass.0', d, glow: 'window' }));
      let heads = ''; for (const c of cells) heads += `M${f1(c[0] - 1)} ${f1(c[1] + 2)}Q${f1(c[0] + c[2] / 2)} ${f1(c[1] - 6)} ${f1(c[0] + c[2] + 1)} ${f1(c[1] + 2)}`;
      body.push({ s: '@stone.0', w: 2, op: 0.85, d: heads, detail: true });
      let bands = ''; for (let f = 1; f < floors; f++) bands += `M${x0} ${f1(-H + 16 + f * fh)}H${x1}`;
      body.push({ s: '@stone.1', w: 2.4, op: 0.8, d: bands });
      body.push(['@stone.0', rect(x0 - 4, -H - 8, x1 - x0 + 8, 10)]);
      if (!show) {
        // the taking-in doors up the middle, the hoist beam and the gable with its round window
        for (let f = 0; f < floors; f++) body.push(['@door.0', rect(-14, -H + 22 + f * fh, 28, fh * 0.72)]);
        body.push(['@iron', rect(-4, -H - 6, 8, 20)], ['@brick.1', poly([[-70, -H - 8], [0, -H - 50], [70, -H - 8]])], ['@stone.0', poly([[-76, -H - 6], [0, -H - 54], [76, -H - 6], [70, -H - 6], [0, -H - 46], [-70, -H - 6]])], { f: '@glass.0', d: circ(0, -H - 24, 9), glow: 'window' });
        body.push(['@door.1', archW(-130, -50, 34, 50)], ['@door.1', archW(96, -50, 34, 50)]);
      } else {
        // the classical centre: a pedimented frontispiece and a portico on the street
        body.push(['@stone.0', rect(-60, -H - 8, 120, H + 8)], ['@stone.1', poly([[-70, -H - 8], [0, -H - 48], [70, -H - 8]])], ['@stone.0', poly([[-58, -H - 12], [0, -H - 42], [58, -H - 12]]), 0.6]);
        for (let k = 0; k < 3; k++) body.push({ f: '@glass.0', d: archW(-40 + k * 30, -H + 30 + 0, 20, 50), glow: 'window' }, { f: '@glass.0', d: rect(-40 + k * 30, -H + 110, 20, 46), glow: 'window' });
        for (let k = 0; k < 4; k++) body.push(['@stone.0', rect(-56 + k * 34, -86, 10, 80)], ['@stone.1', rect(-58 + k * 34, -90, 14, 5)]);
        body.push(['@stone.1', rect(-66, -100, 132, 12)], ['@door.0', rect(-18, -70, 36, 64)], { f: '@warm', d: rect(-14, -66, 28, 60), op: 0.25 });
        body.push(['@roof.0', rect(x0 + 6, -H - 22, x1 - x0 - 12, 14)]);
      }
      body.push(['@brick.3', rect(x0, -6, x1 - x0, 6)]);
      lit.push({ f: '@warm', d: rect(x0, -60, x1 - x0, 54), op: 0.16 });
      return { body, lit };
    },
  });

  /* ---------- vehicle.nottingham-tram (generic: silver with a dark green band, no marks) ---------- */
  define({
    id: 'vehicle.nottingham-tram', category: 'vehicle', size: [480, 120], variants: 1, seasonal: false, flippable: true,
    parts: ['body', 'lit'],
    palette: { base: {
      silver: ['#dcdfe0', '#b4b9bc', '#8c9296'], green: ['#1e5a44', '#164434'], glass: ['#222c34', '#4e6474'], skirt: ['#3a3e42', '#26282a'], pan: '#3a3c40', head: '#fff6d8',
    } },
    night: { glow: { window: '#fff2cc', lamp: '#fff6d8' }, on: 1 },
    anim: { bob: { part: 'body', dy: 0.5, period: 0.9 } },
    shadow: { rx: 230, ry: 6, h: 100 },
    tags: ['uk', 'nottingham', 'tram', 'rail', 'traffic', 'kit:urban', 'kit:vehicles', 'role:vehicle'],
    credit: 'native: drawn for the Nottingham area scenes (a low-floor tram, no operator marks)',
    build() {
      const body = [], lit = [];
      for (const [a, b] of [[-238, -4], [4, 238]]) {
        const front = a < 0;
        body.push({ f: lin('@silver.0', '@silver.2', -100, -8), d: front ? `M${a} -10V-60Q${a} -98 ${a + 34} -100H${b}V-10z` : `M${a} -10V-100H${b - 34}Q${b} -98 ${b} -60V-10z` });
        body.push({ f: '@glass.0', d: front ? `M${a + 4} -56Q${a + 6} -90 ${a + 32} -92V-56z` : `M${b - 4} -56Q${b - 6} -90 ${b - 32} -92V-56z`, glow: 'window' });
        body.push({ f: '@glass.0', d: rect(a + 40, -88, b - a - 70, 34), glow: 'window' });
        for (let k = 1; k < 5; k++) body.push({ s: '@silver.1', w: 3, d: `M${a + 40 + k * (b - a - 70) / 5} -88v34` });
        body.push(['@green.0', rect(a + 2, -50, b - a - 4, 14)], ['@green.1', rect(a + 2, -38, b - a - 4, 4)]);
        const dx = a + (b - a) / 2 - 14;
        body.push(['@silver.1', rect(dx, -88, 28, 78)], { f: '@glass.1', d: rect(dx + 3, -84, 10, 40), glow: 'window' }, { f: '@glass.1', d: rect(dx + 15, -84, 10, 40), glow: 'window' });
        body.push(['@skirt.0', rect(a + 6, -14, b - a - 12, 6)]);
        body.push({ f: '@head', d: circ(front ? a + 10 : b - 10, -26, 3.5), glow: 'lamp' });
        for (const wx of [a + 50, b - 50]) body.push(['@skirt.1', circ(wx, -6, 8)]);
      }
      body.push(['@skirt.0', rect(-6, -96, 12, 86)], ['@silver.1', rect(-60, -106, 120, 6)]);
      body.push({ s: '@pan', w: 2, d: 'M-30 -106L0 -124L30 -106M-16 -124H16' });
      lit.push({ f: '@head', d: poly([[-238, -28], [-310, -16], [-310, -40]]), op: 0.25 });
      return { body, lit };
    },
  });

  /* ---------- structure.sandstone-steps (a flight of cut sandstone steps with a rail; no marks) ---------- */
  define({
    id: 'structure.sandstone-steps', category: 'structure', size: [360, 300], variants: 1, seasonal: false, flippable: true,
    parts: ['body'],
    palette: { base: { stone: ['#dcc49a', '#c0a474', '#947a52'], tread: ['#efe0bc', '#d4bc8e'], rail: ['#4a4036', '#2e2820'] } },
    shadow: { rx: 170, ry: 8, h: 40 },
    tags: ['uk', 'nottingham', 'steps', 'sandstone', 'structure', 'kit:urban'],
    credit: 'native: drawn for the Nottingham area scenes (a flight of cut sandstone steps)',
    build() {
      const body = [], N = 7, w = 360 / N, h = 260 / N;
      for (let i = 0; i < N; i++) {
        const x0 = -180 + i * w, top = -(i + 1) * h;
        body.push(['@stone.0', rect(x0, top, w, (i + 1) * h)]);
        body.push(['@stone.2', rect(x0, top + 4, 2.5, (i + 1) * h - 4)]);
        body.push(['@tread.0', rect(x0 - 2, top, w + 3, 5)]);
      }
      body.push({ s: '@rail.0', w: 2.5, d: `M${-180 + w / 2} ${-h - 46}L${180 - w / 2} ${-N * h - 46}` });
      for (let i = 0; i < N; i += 2) body.push({ s: '@rail.1', w: 2, d: `M${-180 + w / 2 + i * w} ${-(i + 1) * h - 2}V${-h - 46 - (i) * (N * h - h) / (N - 1)}` });
      return { body };
    },
  });

  /* ---------- street.tram-shelter (a glass-backed tram shelter with a bench; no timetable or marks) ---------- */
  define({
    id: 'street.tram-shelter', category: 'street', size: [220, 170], variants: 1, seasonal: false, flippable: true,
    parts: ['body', 'lit'],
    palette: { base: { frame: ['#4a5258', '#333a40', '#252b30'], roof: ['#8a949a', '#6a7478'], glass: ['#2a3a44', '#5a7480'], seat: ['#5a4a38', '#3e3226'], warm: '#fff2cc' } },
    night: { glow: { window: '#fff2cc' }, on: 0.8 },
    shadow: { rx: 110, ry: 6, h: 60 },
    tags: ['uk', 'nottingham', 'tram', 'shelter', 'street', 'kit:urban', 'role:street'],
    credit: 'native: drawn for the Nottingham area scenes (a glass tram shelter, no marks)',
    build() {
      const body = [], lit = [];
      body.push(['@frame.0', rect(-104, -8, 208, 8)]);
      body.push(['@frame.1', rect(-98, -150, 8, 142)], ['@frame.1', rect(90, -150, 8, 142)]);
      body.push(['@roof.0', rect(-112, -164, 224, 14)], ['@roof.1', rect(-112, -152, 224, 4)]);
      body.push({ f: '@glass.0', d: rect(-90, -138, 180, 128), glow: 'window' });
      body.push(['@frame.2', rect(-3, -138, 6, 128)]);
      body.push(['@seat.0', rect(-72, -58, 144, 8)], ['@seat.1', rect(-68, -50, 6, 42)], ['@seat.1', rect(62, -50, 6, 42)]);
      lit.push({ f: '@warm', d: rect(-90, -138, 180, 128), op: 0.22 });
      return { body, lit };
    },
  });

  /* ---------- landmark.edwinstowe-church (a Gothic church tower and nave, no marks; for the Sherwood views) ---------- */
  define({
    id: 'landmark.edwinstowe-church', category: 'landmark', size: [360, 380], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#d8c9a6', '#bca982', '#8a7a5c', '#ece2c8'], roof: ['#5a5e5c', '#44484a'], glass: ['#2e3a40', '#1e262c'], warm: '#ffd894',
    } },
    night: { glow: { window: '#ffd894' }, on: 0.6 },
    shadow: { rx: 170, ry: 8, h: 90 },
    tags: ['landmark', 'signature', 'place:uk/edwinstowe', 'uk', 'nottingham', 'sherwood', 'church', 'gothic', 'tower', 'kit:temperate'],
    credit: 'native: drawn for the Nottingham area scenes (a Gothic parish church tower and nave, no marks)',
    build() {
      const body = [], lit = [];
      // the nave and aisles (low, with a steep roof), the west tower with battlements and a lancet pair
      body.push(['@stone.0', rect(-170, -150, 260, 150)]);
      body.push(['@roof.0', poly([[-180, -150], [-40, -236], [100, -150]])]);
      body.push(['@stone.2', rect(-170, -150, 260, 6)]);
      body.push(['@stone.1', rect(-110, -300, 120, 150)]);
      body.push(['@stone.0', rect(-118, -340, 136, 42)]);
      for (let i = -118; i < 18; i += 22) body.push(['@stone.3', rect(i, -352, 12, 14)]);
      body.push(['@roof.1', poly([[-118, -300], [-50, -300], [-84, -270]])]);
      for (const x of [-80, -50]) body.push({ f: '@glass.0', d: `M${x} -272a8 14 0 0 1 16 0V-240h-16z`, glow: 'window' });
      body.push({ f: '@glass.0', d: `M-30 -150v-40a10 18 0 0 1 20 0v40z`, glow: 'window' });
      for (const x of [20, 50, 80, 120]) body.push({ f: '@glass.0', d: `M${x} -128a7 14 0 0 1 14 0V-108h-14z`, glow: 'window' });
      lit.push({ f: '@warm', d: poly([[-118, -150], [140, -150], [140, -20], [-118, -20]]), op: 0.12 });
      return { body, lit };
    },
  });
})();
/* ============================================================
   THE NOTTINGHAM SCENE KIT (PURE helpers, docs/dev/SCENE_ENGINE.md 8.1). NOTTS.make(o) gives a
   scene SKELETON: the view, the sky, the six layers, the palette, the horizon and far strips and a
   foreground strip. Every scene then composes its own ground (roads, pavements, cobbles, water,
   grass), its own placements, scatter, actors and flocks by calling the helpers, and names its own
   cover mix (o.cover). No archetype composes a picture for a scene.
   Data only; the seasons come from the date ('auto') and the light from the live sky.
   ============================================================ */
const NOTTS = (function () {
  const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000000; };
  const size = id => { const d = sceneObj(id); return d && d.size ? d.size : [100, 100]; };
  // the object's scale for a target height in scene units (the anchor is its foot)
  const sFor = (id, px) => Math.round(px / size(id)[1] * 1000) / 1000;
  // a gradient from palette key 'key' (its .0 and .1 slots) between two y values
  const lin = (key, y0, y1) => ({ lin: [[0, '@' + key + '.0'], [1, '@' + key + '.1']], x1: 0, y1: y0, x2: 0, y2: y1 });
  const pathRect = (x0, y0, x1, y1) => `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
  // objects whose placements cast a shadow along the live sun (the shadow rule, 15.2)
  const SHADOWED = /^(tree|building|person|vehicle|structure|landmark|animal)\./;
  const PAL = {
    base: {
      far: ['#a8b4c0', '#c0c8d0'], pave: ['#bcb2a2', '#a09686', '#847a6c'], road: ['#5e6266', '#74787a'], kerb: ['#cfc8ba', '#a8a294'],
      grass: ['#5e8a3e', '#4a7232'], path: ['#b49a74', '#94805e'], floor: ['#7a6a4e', '#5e5240'], wall: ['#8a7a62', '#6a5c48'],
      water: ['#7a9eaa', '#4a7080', '#2a4a58'], stone: ['#d2c09a', '#b8a27c', '#8a7a5e'], cobble: ['#8e8476', '#726a5e', '#5a544c'],
      sand: ['#d8c49a', '#bca678'], tarmac: ['#4e5256', '#646a6e'], rail: ['#7c7468', '#5c564c'],
    },
    spring: { grass: ['#6a9a40', '#527c34'] },
    autumn: { tarmac: ['#4e4a40', '#5e5848'], rail: ['#6e5e44', '#58492f'], wall: ['#8a6a44', '#6a4e30'], kerb: ['#b8a078', '#9a8258'], grass: ['#7a8a3e', '#5e6e30'], sand: ['#b89050', '#9a7444'], path: ['#8a6a3c', '#6e5230'], pave: ['#b4a48a', '#988a72', '#7e725e'], floor: ['#8a5a2e', '#6a4626'], cobble: ['#8e7e62', '#72644c'] },
    winter: { tarmac: ['#7a8084', '#8a9094'], rail: ['#a8a8a4', '#8e8e8a'], wall: ['#b8b0a0', '#a09684'], kerb: ['#e6e4de', '#c8c6be'], grass: ['#c8d0d0', '#a8b4b8'], pave: ['#d8dcdc', '#bcc2c4', '#9aa2a6'], far: ['#b8c0c8', '#ccd2d8'], road: ['#6a6e72', '#82868a'],
      path: ['#c8c0b0', '#aaa290'], floor: ['#b8b4a8', '#9a968a'], cobble: ['#b8bcbc', '#9aa0a2'], sand: ['#e4dccb', '#cdc4ad'], stone: ['#e4dccb', '#cfc4ad', '#a69c86'] },
  };
  function make(o) {
    const H = o.H, view = { lat: o.lat, lon: o.lon, heading: o.heading, fov: o.fov || 70, horizon: H, lift: 1 };
    const pal = JSON.parse(JSON.stringify(PAL));
    if (o.palette) for (const [s, slots] of Object.entries(o.palette)) pal[s] = Object.assign({}, pal[s] || {}, slots);
    const setting = o.setting || 'urban';
    const d = {
      v: 1, id: String(o.id), view, at: o.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette: pal,
      sky: { stars: 140, clouds: { n: 6, y: [40, Math.max(200, H - 200)], speed: 6 }, sunR: 24, moonR: 20 },
      layers: [{ id: 'horizon', depth: 0.08, haze: 0.6 }, { id: 'far', depth: 0.2, haze: 0.36 }, { id: 'mid', depth: 0.45, haze: 0.12 },
        { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
      ground: [{ layer: 'horizon', d: `M-160 ${H - 2}H1760V${H + 14}H-160Z`, fill: lin('far', H - 2, H + 14) }],
      water: [], place: [], scatter: [], actors: [], flocks: [],
      particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
    };
    const bandTop = Math.round(H + 0.35 * (900 - H));
    d.ground.push({ layer: 'far', d: pathRect(-160, H + 6, 1760, H + 40), fill: lin('far', H + 6, H + 40) });
    // the foreground strip: grass in the natural views, paving in the urban ones (the scene paints over it)
    d.ground.push({ layer: 'fore', d: pathRect(-160, 884, 1760, 905), fill: setting === 'natural' ? lin('grass', 884, 905) : lin('pave', 884, 905) });
    const k = {
      data: d, view, H, bandTop,
      // a ground polygon in a layer; fill is a palette key name, a lin() gradient or a raw colour
      ground(layer, dpath, fill) { d.ground.push({ layer, d: dpath, fill: typeof fill === 'string' && /^[a-z]+$/.test(fill) ? '@' + fill + '.0' : fill }); return k; },
      rect(layer, x0, y0, x1, y1, fill) { return k.ground(layer, pathRect(x0, y0, x1, y1), fill); },
      water(layer, y0, y1, o2) { d.water.push(Object.assign({ layer, d: pathRect(-160, y0, 1760, y1), y0, y1, base: ['@water.0', '@water.1', '@water.2'], reflect: true, shimmer: 30, lightPath: true }, o2 || {})); return k; },
      // one hand-placed object: h is its height in scene units (or o.s its scale)
      place(obj, x, y, h, layer, o3) {
        o3 = o3 || {};
        const p = { obj, x, y, s: o3.s != null ? o3.s : sFor(obj, h), layer, seed: o3.seed != null ? o3.seed : hash(d.id + '|' + obj + '|' + x + '|' + y),
          variant: o3.variant != null ? o3.variant : 0, flip: !!o3.flip, reflect: o3.reflect != null ? !!o3.reflect : d.water.length > 0, season: o3.season };
        if (SHADOWED.test(obj)) p.shadow = true;
        d.place.push(p);
        return k;
      },
      // a seeded scatter rule over an area (rect [x0,y0,x1,y1]); a size range grows with the depth, the colour varies a little
      scatter(obj, layer, rect, n, o4) {
        o4 = o4 || {};
        const extra = o4.extra || {}, rest = Object.assign({}, o4); delete rest.extra;
        const first = typeof obj === 'string' ? obj : Object.keys(obj)[0];
        const rule = Object.assign({ obj, layer, seed: hash(d.id + '|s|' + obj + '|' + layer), area: { rect }, n, minGap: 20,
          s: [0.55, 1.0], flip: 0.5, variant: 'random', anim: false, tint: { col: '#6a7a40', k: [0, 0.12] } }, rest, extra);
        if (Array.isArray(rule.s) && !rule.sByY) rule.sByY = [[rect[1], 0.7], [905, 1.25]];
        if (/bollard|pigeon|planter|puddle/.test(first) && !rule.mask) rule.mask = { noise: { scale: 120, cut: 0.3 } };
        if (SHADOWED.test(first)) rule.shadow = true;
        if (rule.reflect == null && d.water.length > 0) rule.reflect = true;
        d.scatter.push(rule);
        return k;
      },
      // a person (or any walker) along a line at y, from x0 to x1 and back as a loop; its scale follows the depth
      walk(obj, layer, y, x0, x1, speed, o5) {
        o5 = o5 || {};
        const s = o5.s != null ? o5.s : Math.round(scenePersonScale(size(obj)[1], y, view) * (o5.k || 1) * 1000) / 1000;
        d.actors.push({ obj, layer, path: o5.pingpong ? [[x0, y], [x1, y]] : (o5.back ? [[x1, y], [x0, y]] : [[x0, y], [x1, y]]), speed, loop: o5.pingpong ? 'pingpong' : 'loop',
          s, seed: o5.seed != null ? o5.seed : hash(d.id + '|w|' + obj + '|' + y), offset: o5.offset != null ? o5.offset : (hash(obj + y) % 100) / 100, flip: !!o5.flip });
        return k;
      },
      // a vehicle or any mover along a path (points [[x,y],...]); h is its height in scene units
      drive(obj, layer, path, speed, h, o6) {
        o6 = o6 || {};
        d.actors.push({ obj, layer, path, speed, loop: o6.pingpong ? 'pingpong' : 'loop', s: o6.s != null ? o6.s : sFor(obj, h), seed: o6.seed != null ? o6.seed : hash(d.id + '|d|' + obj),
          offset: o6.offset != null ? o6.offset : 0.3, flip: !!o6.flip, variant: o6.variant != null ? o6.variant : 0 });
        return k;
      },
      flock(obj, n, area, speed, s, layer, seed) { d.flocks.push({ obj, n, area, speed, s, layer, seed: seed != null ? seed : hash(d.id + '|f|' + obj) }); return k; },
      // the scene's own cover mix across the lower band (the bar counts it); o.cover = { 'plant.grass': 3, 'ground.leaves': 1 }
      done() {
        const mix = o.cover || (setting === 'natural' ? { 'plant.grass': 3, 'plant.wildflowers': 1 } : { 'ground.leaves': 2, 'plant.planter': 1 });
        const plantOnly = Object.keys(mix).every(x => x.startsWith('plant.'));
        d.scatter.push({ obj: mix, layer: 'near', seed: hash(d.id + '|cover'), area: { rect: [-150, bandTop, 1750, 905] },
          n: o.coverN || 150, minGap: 10, s: [0.5, 0.9], sByY: [[bandTop, 0.6], [905, 1.25]], flip: 0.5, variant: 'random', shadow: false,
          tint: { col: '#6a7a40', k: [0, 0.12] }, anim: plantOnly ? 'strip' : false });
        return d;
      },
    };
    return k;
  }
  return { make, sFor, lin, pathRect, hash, PAL };
})();
