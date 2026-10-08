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
      for (let i = 0; i < N; i++) {
        const a = (i + 0.5) / N * Math.PI * 2, cx = Math.cos(a) * (R + 4), cy = HY + Math.sin(a) * (R + 4);
        wheel.push(['@cab.' + (i % 5), ell(cx, cy, 10, 10)]);
      }
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
})();

/* ============================================================
   ARCHETYPE notts-city: a Nottingham street, square, riverside, park, forest or fairground with its
   landmark. PURE.
   Layers: horizon (distant city or wooded skyline, hazed), far (a row of warehouses and towers, or
   woodland), mid (the landmarks on their ground line; the Trent in front of them), near (the road,
   towpath, path or grass with traffic, a tram, people, deer; lamps and benches), fore (cover by
   ground type; wind strips), front (two framing trees).
   Params: id, lat, lon, heading, at, horizon, landmarks ('id@x@h@layer@dy@variant@flip' list),
   ground (street | square | riverside | park | forest | fair), water (none | river), tram (none |
   street), far (brick | mixed | trees), features list (buses, cyclists, gulls, deer, rowers, bracken,
   crowd), palette.
   ============================================================ */
function sceneArchNottsCity(p, u) {
  const R = Math.round, H = Number.isFinite(p.horizon) ? p.horizon : 500, has = f => (p.features || []).includes(f);
  const water = p.water || 'none', ground = p.ground || 'street', tram = p.tram || 'none', far = p.far || 'mixed';
  const green = ground === 'park' || ground === 'forest' || ground === 'riverside', roadless = green || ground === 'fair';
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const wet = water !== 'none', yL = wet ? H + 60 : H + 150;
  const yW0 = yL + 6, yW1 = wet ? yL + 170 : yL;
  const yR = wet ? yW1 + 40 : yL + 70;
  const yF = Math.max(yR + 70, 800);
  const palette = {
    base: { far: ['#a8b4c0', '#c0c8d0'], pave: ['#bcb2a2', '#a09686', '#847a6c'], road: ['#5e6266', '#74787a'], kerb: ['#cfc8ba', '#a8a294'],
      grass: ['#5e8a3e', '#4a7232'], path: ['#b49a74', '#94805e'], floor: ['#7a6a4e', '#5e5240'], wall: ['#8a7a62', '#6a5c48'], water: ['#7a9eaa', '#4a7080', '#2a4a58'] },
    spring: { grass: ['#6a9a40', '#527c34'] },
    autumn: { grass: ['#7a8a3e', '#5e6e30'], pave: ['#b4a48a', '#988a72', '#7e725e'], floor: ['#8a5a2e', '#6a4626'] },
    winter: { grass: ['#c8d0d0', '#a8b4b8'], pave: ['#d8dcdc', '#bcc2c4', '#9aa2a6'], far: ['#b8c0c8', '#ccd2d8'], road: ['#6a6e72', '#82868a'], path: ['#c8c0b0', '#aaa290'], floor: ['#b8b4a8', '#9a968a'] },
  };
  if (p.palette && typeof p.palette === 'object') for (const [s, slots] of Object.entries(p.palette)) palette[s] = Object.assign({}, palette[s] || {}, slots);
  const grassFill = (y0, y1) => ({ lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: y0, x2: 0, y2: y1 });
  const nearFill = ground === 'forest' ? { lin: [[0, '@floor.0'], [1, '@floor.1']], x1: 0, y1: yR - 30, x2: 0, y2: yF } : green ? grassFill(yR - 30, yF)
    : ground === 'fair' ? { lin: [[0, '@pave.1'], [1, '@pave.2']], x1: 0, y1: yR - 30, x2: 0, y2: yF } : { lin: [[0, '@road.1'], [1, '@road.0']], x1: 0, y1: yR - 30, x2: 0, y2: yF };
  const data = {
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 70, horizon: H, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: green ? 'natural' : 'urban', signage: false, palette,
    sky: { stars: 140, clouds: { n: 6, y: [40, Math.max(200, H - 200)], speed: 6 }, sunR: 24, moonR: 20 },
    layers: [{ id: 'horizon', depth: 0.08, haze: 0.6 }, { id: 'far', depth: 0.2, haze: 0.36 }, { id: 'mid', depth: 0.45, haze: 0.12 },
      { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    ground: [
      { layer: 'horizon', d: `M-160 ${H - 2}H1760V${H + 14}H-160Z`, fill: { lin: [[0, '@far.0'], [1, '@far.1']], x1: 0, y1: H - 2, x2: 0, y2: H + 14 } },
      { layer: 'far', d: `M-160 ${H + 10}H1760V${yL + 4}H-160Z`, fill: green ? grassFill(H + 10, yL) : { lin: [[0, '@pave.0'], [1, '@pave.1']], x1: 0, y1: H + 10, x2: 0, y2: yL } },
      { layer: 'mid', d: `M-160 ${yL - 6}H1760V${(wet ? yW0 : yR) + 2}H-160Z`, fill: green || ground === 'fair' ? grassFill(yL - 6, yR) : { lin: [[0, '@pave.0'], [1, '@pave.1']], x1: 0, y1: yL - 6, x2: 0, y2: yR } },
      { layer: 'near', d: `M-160 ${yR - 30}H1760V${yF + 4}H-160Z`, fill: nearFill },
      { layer: 'fore', d: `M-160 ${yF}Q400 ${yF - 6} 800 ${yF}T1760 ${yF}V905H-160Z`, fill: ground === 'square' || ground === 'fair' ? { lin: [[0, '@pave.0'], [1, '@pave.2']], x1: 0, y1: yF, x2: 0, y2: 900 } : ground === 'forest' ? { lin: [[0, '@floor.0'], [1, '@floor.1']], x1: 0, y1: yF, x2: 0, y2: 900 } : grassFill(yF, 900) },
    ],
    water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  if (!roadless) data.ground.push({ layer: 'near', d: `M-160 ${yR + 26}H1760V${yR + 32}H-160Z`, fill: '@kerb.0' });
  // a path through the grass, the forest or along the river
  if (green) data.ground.push({ layer: 'near', d: `M-160 ${yR + 34}Q500 ${yR + 22} 800 ${yR + 30}T1760 ${yR + 28}V${yR + 60}Q1100 ${yR + 54} 800 ${yR + 62}T-160 ${yR + 58}Z`, fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: yR + 22, x2: 0, y2: yR + 62 } });
  if (wet) {
    data.water.push({ layer: 'mid', d: `M-160 ${yW0}H1760V${yW1}H-160Z`, y0: yW0, y1: yW1, base: ['@water.0', '@water.1', '@water.2'], reflect: true, shimmer: 34, lightPath: true });
    data.ground.push({ layer: 'mid', d: `M-160 ${yW0 - 6}H1760V${yW0 + 1}H-160Z`, fill: '@wall.0' }, { layer: 'near', d: `M-160 ${yW1 - 2}H1760V${yW1 + 6}H-160Z`, fill: '@wall.1' });
  }
  // the distant skyline and the far row (warehouses and towers, or woodland)
  if (far === 'trees') data.scatter.push({ obj: { 'tree.bank-distant': 2, 'tree.distant': 1 }, layer: 'horizon', seed: 2, area: { rect: [-140, H, 1740, H + 3] }, n: 30, minGap: 40, s: [0.5, 0.8], flip: 0.5, variant: 'random', tint: { col: '#8aa0a8', k: [0.18, 0.18] }, shadow: false, anim: false });
  else data.scatter.push({ obj: 'building.skyline-band', layer: 'horizon', seed: 2, area: { rect: [-120, H, 1720, H + 2] }, n: 3, minGap: 420, s: [0.36, 0.6], flip: 0.5, variant: [0, 1], tint: { col: '#a8b4c4', k: [0.16, 0.16] }, shadow: false, anim: false });
  const farMix = far === 'trees' ? { 'tree.woods-edge': 3, 'tree.far-broad': 2, 'tree.far-birch': 1 } : far === 'brick' ? { 'building.lace-market-warehouse': 3, 'building.tower-stone': 1 } : { 'building.lace-market-warehouse': 2, 'building.tower': 1, 'building.terrace-victorian': 1 };
  const avoid = [];
  (p.landmarks || []).map(s => String(s).split('@')).filter(a => sceneObj(a[0])).forEach((a, i) => {
    const id = a[0], x = a[1] ? +a[1] : 800, h = a[2] ? +a[2] : 360, layer = a[3] || 'mid', yy = a[4] ? yL + +a[4] : yL, d = sceneObj(id), s = sOf(id, h), w = d.size[0] * s / 2;
    data.place.push({ obj: id, x, y: yy, s, layer, seed: 11 + i, reflect: wet, shadow: false, variant: a[5] ? +a[5] : 0, flip: a[6] === 'flip' });
    if (layer === 'mid' && h > 150) avoid.push({ rect: [x - w - 10, H - 40, x + w + 10, yL + 8] });
  });
  data.scatter.push({ obj: farMix, layer: 'far', seed: 4, area: { rect: [-150, H + 24, 1750, H + 30] }, n: far === 'trees' ? 22 : 13, minGap: far === 'trees' ? 50 : 64, s: far === 'trees' ? [0.5, 0.9] : [0.24, 0.6], maxH: Math.round(H * 0.6), flip: 0.5, variant: [0, 1], tint: { col: '#9aa6b4', k: [0.08, 0.08] }, mask: { noise: { scale: 90, cut: 0.25 }, avoid }, shadow: false, anim: false });
  // trees along the landmarks' ground line (oak and birch in the forest)
  const midTrees = ground === 'forest' ? { 'tree.oak': 3, 'tree.birch': 2, 'tree.ancient-oak': 1 } : green ? { 'tree.oak': 2, 'tree.horse-chestnut': 1, 'tree.far-broad': 1 } : { 'tree.plane': 1, 'tree.far-broad': 1, 'tree.far-birch': 1 };
  data.scatter.push({ obj: midTrees, layer: 'mid', seed: 15, area: { rect: [-140, yL - 2, 1740, yL + 3] }, n: ground === 'forest' ? 14 : 10, minGap: ground === 'forest' ? 90 : 80, s: ground === 'forest' ? [0.4, 0.75] : [0.18, 0.38], flip: 0.5, variant: 'random', tint: { col: '#6a8a9a', k: [0, 0.08] }, mask: { noise: { scale: 110, cut: 0.2 }, avoid: avoid.map(a => ({ rect: [a.rect[0] + 40, a.rect[1], a.rect[2] - 40, a.rect[3]] })) }, anim: false, reflect: wet });
  if (!green || ground === 'riverside') data.scatter.push({ obj: 'street.lamppost', layer: 'near', seed: 13, area: { rect: [-100, yR + 34, 1700, yR + 38] }, n: 5, minGap: 260, s: [0.4, 0.62], flip: 0.5, variant: [0, 3], anim: false });
  if (ground !== 'forest') data.scatter.push({ obj: 'street.bench', layer: 'near', seed: 14, area: { rect: [-60, yR + 40, 1660, yR + 44] }, n: 3, minGap: 340, s: [0.5, 0.6], flip: 0.5, variant: 'random' });
  if (!roadless) data.scatter.push({ obj: { 'street.bollard': 2 }, layer: 'near', seed: 16, area: { rect: [-140, yR + 30, 1740, yR + 34] }, n: 20, minGap: 54, s: [0.5, 0.82], flip: 0.5, variant: 'random', tint: { col: '#3a4048', k: [0, 0.16] }, mask: { noise: { scale: 200, cut: 0.2 } }, anim: false });
  // traffic and the tram
  const lane = (k) => yR - 22 + k * 22, carS = y => Math.round((0.32 + (y - H) / (900 - H) * 0.32) * 100) / 100;
  if (!roadless) {
    const cars = [['vehicle.car-city', 0], ['vehicle.taxi-black', 1], ['vehicle.car', 0], has('buses') ? ['vehicle.bus', 1] : ['vehicle.car-city', 1]];
    if (tram === 'none') cars.push(['vehicle.car', 1]);
    cars.forEach(([obj, k], i) => { const y = lane(k), back = k === 1; data.actors.push({ obj, layer: 'near', path: back ? [[1800, y], [-200, y]] : [[-200, y], [1800, y]], speed: 40 + i * 7, loop: 'loop', s: carS(y), seed: 30 + i, offset: (0.11 + i * 0.23) % 1, flip: back, variant: i % 2 }); });
  }
  if (has('cyclists')) data.actors.push({ obj: 'person.cyclist', layer: 'near', path: [[-120, lane(0) + 10], [1720, lane(0) + 10]], speed: 26, loop: 'loop', s: scenePersonScale(sceneObj('person.cyclist').size[1], lane(0) + 10, data.view), seed: 41, offset: 0.4 });
  if (tram === 'street') data.actors.push({ obj: 'vehicle.nottingham-tram', layer: 'near', path: [[-440, yR - 34], [2040, yR - 34]], speed: 34, loop: 'loop', s: carS(yR - 34) * 1.05, seed: 44, offset: 0.35 });
  if (wet) {
    const craft = has('rowers') ? ['person.rower', 'person.kayaker', 'boat.narrowboat'] : ['boat.narrowboat', 'person.kayaker', 'boat.narrowboat-receding'];
    const lanesW = [yW0 + (yW1 - yW0) * 0.35, yW0 + (yW1 - yW0) * 0.75, yW0 + (yW1 - yW0) * 0.55];
    craft.forEach((obj, i) => { const y = R(lanesW[i]), back = i % 2 === 1, boat = obj.startsWith('boat.'); data.actors.push({ obj, layer: 'mid', path: back ? [[1800, y], [-200, y]] : [[-200, y], [1800, y]], speed: boat ? 6 + i * 2 : 12 + i * 3, loop: 'loop', s: 1, sByY: boat ? [[yW0, 0.34], [yW1, 0.6]] : [[yW0, 0.5], [yW1, 0.8]], seed: 50 + i, offset: (0.2 + i * 0.31) % 1, flip: back }); });
    data.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[1000, R(yW1 - 16)], [1300, R(yW1 - 14)]], speed: 2.5, loop: 'pingpong', s: 0.44, seed: 55, offset: 0.7 });
    data.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[260, R(yW1 - 12)], [560, R(yW1 - 10)]], speed: 3, loop: 'pingpong', s: 0.42, seed: 54, offset: 0.2 });
  }
  // deer grazing on the park grass
  if (has('deer')) {
    const spots = [[260, yL + 30], [420, yL + 52], [1180, yL + 36], [1330, yL + 58], [1460, yL + 24], [640, yR + 6]];
    spots.forEach(([x, y], i) => data.place.push({ obj: 'animal.deer', x, y, s: Math.round((0.32 + (y - H) / (900 - H) * 0.55) * 100) / 100, layer: y > yR - 20 ? 'near' : 'mid', seed: 70 + i, variant: i % 2, flip: i % 3 === 1 }));
  }
  // people: tiny anonymous walkers (at most 7)
  const people = ground === 'forest' ? ['person.hiker', 'person.dog-walker', 'person.elderly-walker', 'person.walker', 'person.photographer', 'person.jogger']
    : ground === 'fair' ? ['person.couple', 'person.walker', 'person.child-scooter', 'person.elderly-couple', 'person.shopper', 'person.student', 'person.dog-walker']
    : green ? ['person.walker', 'person.dog-walker', 'person.jogger', 'person.couple', 'person.buggy-walker']
    : ['person.walker', 'person.shopper', 'person.student', 'person.couple', 'person.buggy-walker', 'person.commuter'];
  const nPeople = has('crowd') ? Math.min(7, people.length) : Math.min(5, people.length), pBase = green ? yR + 36 : yR + 40;
  for (let i = 0; i < nPeople; i++) {
    const id = people[i], y = pBase + (i % 3) * 12, back = i % 2 === 1;
    data.actors.push({ obj: id, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 12 + (i % 4) * 3, loop: 'loop', s: scenePersonScale(sceneObj(id).size[1], y, data.view), seed: 60 + i, offset: (i * 0.19 + 0.07) % 1, flip: back });
  }
  // birds
  data.flocks.push({ obj: 'bird.small-flight', n: 5, area: [160, 100, 1440, Math.max(220, H - 140)], speed: 26, s: 0.5, seed: 9, layer: 'far' });
  data.flocks.push({ obj: has('gulls') ? 'bird.herring-gull-flight' : 'bird.small-flight', n: 4, area: [80, 160, 1500, Math.max(300, H - 80)], speed: 20, s: 0.7, seed: 10, layer: 'mid' });
  if (!green) data.scatter.push({ obj: 'bird.pigeon-feral', layer: 'near', seed: 17, area: { rect: [100, yR + 50, 1500, yR + 76] }, n: 5, minGap: 50, s: [0.6, 1.15], sByY: [[yR + 50, 0.85], [yR + 76, 1.15]], flip: 0.5, variant: 'random', mask: { noise: { scale: 120, cut: 0.3 } } });
  // the near and fore cover by ground type
  const nearCover = ground === 'forest' ? { 'plant.bracken': 3, 'plant.fern': 2, 'plant.grass': 1 } : { 'plant.grass': 3, 'plant.wildflowers': 2 };
  const cover = ground === 'square' || ground === 'fair' ? { 'plant.planter': 1, 'plant.grass': 2, 'plant.wildflowers': 1 } : ground === 'forest' ? { 'plant.bracken': 3, 'plant.fern': 2, 'plant.grass': 1 } : ground === 'riverside' ? { 'plant.grass': 2, 'plant.reed': 1, 'plant.wildflowers': 1 } : { 'plant.grass': 3, 'plant.wildflowers': 2 };
  data.scatter.push({ obj: nearCover, layer: 'near', seed: 18, area: { rect: [-150, yR + 46, 1750, yF] }, n: 90, minGap: 24, s: [0.45, 0.75], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: false });
  data.scatter.push({ obj: cover, layer: 'fore', seed: 7, area: { rect: [-150, yF + 2, 1750, yF + 50] }, n: 150, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: false });
  data.scatter.push({ obj: ground === 'forest' ? { 'plant.bracken': 2, 'plant.grass': 2 } : { 'plant.grass': 3, 'plant.wildflowers': 2 }, layer: 'fore', seed: 8, area: { rect: [-150, yF + 50, 1750, 905] }, n: 110, minGap: 22, s: [0.9, 1.3], flip: 0.5, variant: [1, 2], tint: { col: '#6a7a40', k: [0.08, 0.16] }, anim: 'strip' });
  data.scatter.push({ obj: ground === 'forest' ? { 'plant.holly': 1, 'plant.hedgerow-blackberry': 1 } : { 'plant.shrub': 2, 'plant.hedge': 1 }, layer: 'fore', seed: 19, area: { rect: [-150, yF + 6, 1750, yF + 40] }, n: 5, minGap: 150, s: [0.45, 1.1], flip: 0.5, variant: 'random', mask: { noise: { scale: 220, cut: 0.3 } }, anim: false });
  data.scatter.push({ obj: 'ground.leaves', layer: 'fore', seed: 20 + String(p.id).length * 3, area: { rect: [-150, yF + 10, 1750, 900] }, n: 14, minGap: 60, s: [0.7, 1.1], flip: 0.5, variant: 'random', anim: false });
  if (ground === 'forest') data.scatter.push({ obj: 'ground.log', layer: 'near', seed: 24, area: { rect: [-100, yR + 10, 1700, yR + 20] }, n: 2, minGap: 500, s: [0.5, 0.7], flip: 0.5, variant: 'random', anim: false });
  // the framing trees
  const frame = ground === 'forest' ? 'tree.oak' : green ? 'tree.horse-chestnut' : 'tree.plane';
  data.place.push({ obj: frame, x: 20, y: 910, s: sOf(frame, 500), layer: 'front', seed: 21, variant: 2 }, { obj: frame, x: 1600, y: 912, s: sOf(frame, 470), layer: 'front', seed: 22, flip: true, variant: 1 });
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('notts-city', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: typeof SCENE_AT_MOMENTS !== 'undefined' ? SCENE_AT_MOMENTS : 'id', horizon: 'number', landmarks: 'list',
      ground: ['street', 'square', 'riverside', 'park', 'forest', 'fair'], water: ['none', 'river'], tram: ['none', 'street'], far: ['mixed', 'brick', 'trees'], features: 'list', palette: 'object' },
    kits: ['urban', 'temperate', 'people', 'birds', 'boats', 'animals'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 650, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchNottsCity(p, u),
  });
})();
