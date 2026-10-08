/* ============================================================
   SCENE LIBRARY: area-woking (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   The objects of the Woking area builder (Surrey):
     landmark.woking-martian         a polished-steel Martian fighting machine on three jointed legs, a
                                     generic tribute to H. G. Wells's novel (the town-centre sculpture)
     landmark.shah-jahan-mosque      the Mughal-style mosque of 1889: the dome on its drum, the cusped
                                     entrance arch, corner kiosks and the parapet (architecture only)
     landmark.woking-lightbox        the modern gallery by the canal: white box, glazed ground floor and
                                     a tall slatted lantern
     landmark.woking-towers          the modern towers of Victoria Square over a low podium
     landmark.woking-station         the 1930s station frontage: long cream bands, a low clock block, canopy
     landmark.horsell-sandpits       the sandpits of Horsell Common: bare sand faces under Scots pines (natural)
   No text, no logos, no people.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = d => sceneObjDefine(Object.assign({}, d, { build: (v, r, ctx) => tidy(d.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  /** A pointed (Mughal) arch opening: x left, y the crown of the arch, w width, h height to the sill. */
  const pointed = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * .5)}Q${f1(x + w * .04)} ${f1(y + w * .08)} ${f1(x + w / 2)} ${f1(y)}Q${f1(x + w * .96)} ${f1(y + w * .08)} ${f1(x + w)} ${f1(y + w * .5)}V${f1(y + h)}z`;
  /** An onion dome: centre x, base y, half-width w, height h. */
  const onion = (x, y, w, h) => `M${f1(x - w * .82)} ${f1(y)}C${f1(x - w * 1.12)} ${f1(y - h * .45)} ${f1(x - w * .7)} ${f1(y - h * .78)} ${f1(x)} ${f1(y - h)}C${f1(x + w * .7)} ${f1(y - h * .78)} ${f1(x + w * 1.12)} ${f1(y - h * .45)} ${f1(x + w * .82)} ${f1(y)}z`;
  /** A tube between two points (a leg segment): a quadrilateral of width w. */
  const tube = (x0, y0, x1, y1, w0, w1) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; return `M${f1(x0 + nx * w0 / 2)} ${f1(y0 + ny * w0 / 2)}L${f1(x1 + nx * w1 / 2)} ${f1(y1 + ny * w1 / 2)}L${f1(x1 - nx * w1 / 2)} ${f1(y1 - ny * w1 / 2)}L${f1(x0 - nx * w0 / 2)} ${f1(y0 - ny * w0 / 2)}z`; };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };

  /* ---------- landmark.woking-martian (the tripod; lit from the left; anchor: between the feet) ---------- */
  def({
    id: 'landmark.woking-martian', category: 'landmark', size: [250, 330], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      steel: ['#c4cad0', '#9aa2aa', '#eef2f4', '#727a82', '#5a6168'], dark: ['#3e444a', '#2a2e33'], eye: ['#1e2a34', '#5a7e96'],
      plinth: ['#a8a296', '#8c8678', '#c4beb2'], flood: ['#e8f0ff', '#fff2d6'],
    } },
    night: { glow: { window: '#9fd4ff', lamp: '#fff0c8' }, on: 1 },
    parts: ['body', 'lit'],
    shadow: { rx: 110, ry: 14, h: 320 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'sculpture', 'war of the worlds', 'tripod', 'kit:urban'],
    credit: 'drawn for the Woking area scenes (a generic tripod in the spirit of the town-centre sculpture honouring H. G. Wells)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the low round plinth
      push(['@plinth.1', ell(0, -2, 118, 12)], ['@plinth.0', `M-118 -4a118 12 0 0 0 236 0v-8a118 12 0 0 0 -236 0z`], ['@plinth.2', ell(0, -12, 116, 11)], ['@plinth.1', ell(0, -12, 96, 8), .4]);
      // three legs: hip -> knee -> ankle -> foot. The back leg first (darker).
      const leg = (pts, back) => {
        const c = back ? ['@steel.3', '@steel.4', '@steel.1'] : ['@steel.1', '@steel.3', '@steel.2'];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], w0 = 13 - i * 3, w1 = 11 - i * 3;
          push([c[0], tube(x0, y0, x1, y1, w0, w1)], [c[2], tube(x0 - 2, y0, x1 - 2, y1, w0 * .3, w1 * .3), back ? .25 : .7], [c[1], tube(x0 + 3, y0, x1 + 3, y1, w0 * .25, w1 * .25), .6]);
          // segment rings
          for (let k = 1; k < 4; k++) { const t = k / 4, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; push([c[1], ell(x, y, (w0 + (w1 - w0) * t) * .55, 2), .7]); }
        }
        for (let i = 1; i < pts.length - 1; i++) push([c[1], ell(pts[i][0], pts[i][1], 9 - i, 9 - i)], [c[2], ell(pts[i][0] - 2, pts[i][1] - 2, 3.5, 3.5), back ? .3 : .8]);
        const [fx, fy] = pts[pts.length - 1];
        push([c[1], `M${fx - 16} ${fy}l5 -7h22l5 7z`], [c[2], rect(fx - 10, fy - 7, 20, 1.6), .6]);
      };
      leg([[4, -196], [26, -128], [12, -60], [20, -12]], true);
      leg([[-26, -192], [-86, -128], [-96, -60], [-104, -12]], false);
      leg([[24, -190], [80, -134], [96, -64], [106, -12]], false);
      // hanging tentacles (jointed cables), curling
      const tent = (x0, pts, w) => { let x = x0, y = -200; for (let i = 0; i < pts.length; i++) { const [dx, dy] = pts[i]; push(['@steel.3', tube(x, y, x + dx, y + dy, w - i * .6, w - (i + 1) * .6)], ['@steel.2', ell(x + dx, y + dy, (w - i * .6) * .45, (w - i * .6) * .45), .7]); x += dx; y += dy; } };
      tent(-40, [[-10, 16], [-16, 14], [-14, 10], [-6, 12], [6, 8]], 5.5);
      tent(-6, [[-2, 18], [4, 16], [10, 12], [12, 4], [8, -6]], 5);
      tent(36, [[12, 14], [16, 12], [10, 14], [-2, 12], [-8, 6]], 5.2);
      // the hood: a long cowled body, tipped forward, its underside darker
      push(['@steel.4', 'M-74 -206Q-60 -186 0 -184Q58 -186 76 -206Q40 -214 0 -214Q-40 -214 -74 -206z']);
      push(['@steel.0', 'M-78 -206Q-92 -262 -46 -300Q-4 -330 46 -318Q92 -300 88 -250Q84 -222 76 -206Q40 -216 0 -216Q-40 -216 -78 -206z']);
      push(['@steel.2', 'M-66 -222Q-76 -266 -40 -294Q-8 -316 26 -314Q-30 -300 -50 -262Q-60 -240 -58 -220z', .75]);
      push(['@steel.1', 'M60 -214Q78 -240 74 -272Q66 -300 46 -312Q86 -298 86 -252Q84 -226 76 -208z', .8]);
      push(['@steel.3', 'M-78 -206Q-40 -218 0 -218Q40 -218 76 -206L76 -202Q40 -212 0 -212Q-40 -212 -78 -202z']);
      // panel seams and rivets
      push({ s: '@steel.3', w: 1.1, op: .55, d: 'M-60 -212Q-74 -258 -36 -292M-20 -216Q-30 -270 6 -312M24 -216Q22 -270 48 -314M58 -212Q70 -252 66 -294' });
      push({ s: '@steel.3', w: 1, op: .45, d: 'M-80 -244Q0 -262 86 -240M-66 -280Q8 -300 82 -276' });
      for (let i = 0; i < 18; i++) { const t = i / 17, x = -72 + t * 148, y = -208 - Math.sin(t * Math.PI) * 8; push(['@steel.4', ell(x, y, 1.3, 1.3), .8]); }
      for (let i = 0; i < 12; i++) { const t = i / 11, x = -64 + t * 140, y = -252 - Math.sin(t * Math.PI) * 10 + t * 4; push(['@steel.3', ell(x, y, 1.1, 1.1), .6]); }
      // the eye: a glass port on the front of the hood, with a hood brow
      push(['@steel.4', ell(-50, -246, 17, 13)], { f: '@eye.0', d: ell(-50, -246, 13, 10), glow: 'window' }, ['@eye.1', ell(-55, -250, 5, 3.4), .8], ['@steel.2', 'M-70 -258Q-50 -276 -30 -258Q-50 -268 -70 -258z']);
      // the heat-ray arm: a jointed arm with a small bell projector
      push(['@steel.1', tube(70, -232, 104, -246, 7, 6)], ['@steel.3', ell(104, -246, 5, 5)], ['@steel.1', tube(104, -246, 120, -226, 6, 5)], ['@steel.0', 'M114 -224L128 -218L124 -210L110 -216z'], { f: '@eye.1', d: ell(121, -213, 3, 3), glow: 'lamp' });
      // the vents along the back of the hood
      for (let i = 0; i < 5; i++) push(['@steel.4', rect(30 + i * 9, -296 + i * 6, 5, 9)]);
      // shine
      push(['@steel.2', 'M-30 -300Q0 -320 30 -316Q0 -312 -26 -296z', .9]);
      // the night look: an uplight wash from the plinth and a glint on the hood
      lit.push(['@flood.0', 'M-110 -10L-70 -320H80L110 -10z', .1], ['@flood.1', ell(0, -12, 116, 11), .3], ['@flood.0', 'M-60 -230Q-40 -290 30 -306Q-20 -280 -40 -226z', .25]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.shah-jahan-mosque (front elevation; anchor: the ground at the centre) ---------- */
  def({
    id: 'landmark.shah-jahan-mosque', category: 'landmark', size: [520, 300], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#ece4d0', '#d6cab0', '#f8f2e4', '#bcae92'], shade: ['#b8aa8c', '#a0927a'], dome: ['#a9c2b0', '#86a292', '#c8dccc', '#6e8a7a'],
      gold: ['#d8b050', '#f0d488'], door: ['#4a3a2c', '#2e241c'], glass: ['#3a4650', '#8aa0b0'], step: ['#c8c0b0', '#aea696'], flood: ['#fff0d0', '#ffe2b0'],
    } },
    night: { glow: { window: '#ffd690', lamp: '#ffe8b0' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 250, ry: 14, h: 220 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'mosque', 'mughal', 'heritage', 'kit:temperate'],
    credit: 'drawn for the Woking area scenes (from public views of the Shah Jahan Mosque, Oriental Road; architecture only)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // side wings
      for (const sgn of [-1, 1]) {
        const x0 = sgn < 0 ? -250 : 120;
        push(['@stone.0', rect(x0, -112, 130, 112)], ['@shade.0', rect(sgn < 0 ? x0 : x0 + 112, -112, 18, 112), .45], ['@stone.3', rect(x0 - 4, -118, 138, 8)]);
        // parapet merlons
        for (let i = 0; i < 9; i++) push(['@stone.2', `M${x0 - 2 + i * 15.5} -118v-8l4 -4 4 4v8z`]);
        // two arched windows per wing, a small door
        for (let i = 0; i < 2; i++) { const wx = x0 + 22 + i * 64; push(['@shade.1', pointed(wx - 3, -96, 30, 58)], { f: '@glass.0', d: pointed(wx, -92, 24, 52), glow: 'window' }, ['@glass.1', pointed(wx + 4, -86, 7, 18), .4], ['@stone.2', rect(wx - 5, -36, 34, 4)]); }
        // a slim corner pinnacle
        const px = sgn < 0 ? x0 - 2 : x0 + 132;
        push(['@stone.2', rect(px - 6, -150, 12, 150)], ['@shade.0', rect(px + 2, -150, 4, 150), .5], ['@stone.3', rect(px - 8, -154, 16, 5)], ['@dome.0', onion(px, -154, 9, 22)], ['@gold.0', rect(px - 1, -184, 2, 10)]);
        for (let k = 0; k < 4; k++) push(['@stone.3', rect(px - 7, -130 + k * 30, 14, 2.5)]);
      }
      // the central block with the great entrance arch (iwan)
      push(['@stone.0', rect(-120, -170, 240, 170)], ['@stone.2', rect(-120, -170, 30, 170), .5], ['@shade.0', rect(96, -170, 24, 170), .45], ['@stone.3', rect(-126, -178, 252, 10)]);
      for (let i = 0; i < 16; i++) push(['@stone.2', `M${-124 + i * 15.8} -178v-9l4.5 -5 4.5 5v9z`]);
      push(['@stone.1', rect(-74, -158, 148, 158)], ['@shade.1', pointed(-62, -150, 124, 150)], ['@shade.0', pointed(-54, -140, 108, 140)]);
      // the arch's cusped edge (small lobes around the opening)
      for (let i = 0; i < 11; i++) { const a = Math.PI * (i / 10), x = -54 * Math.cos(a), y = -88 - Math.sin(a) * 44; push(['@stone.2', ell(x, y, 4.5, 4.5)]); }
      // inside the iwan: the door with its fanlight and two windows
      push(['@door.0', pointed(-24, -96, 48, 96)], ['@door.1', rect(-1, -76, 2, 76)], { f: '@glass.0', d: pointed(-18, -90, 36, 22), glow: 'window' });
      for (const x of [-46, 32]) push({ f: '@glass.0', d: pointed(x, -84, 14, 34), glow: 'window' }, ['@stone.2', rect(x - 2, -48, 18, 3)]);
      push({ s: '@stone.3', w: 1, op: .6, d: 'M-74 -158V0M74 -158V0' });
      // the arch frame panels (spandrels) with small roundels
      for (const x of [-64, 64]) push(['@stone.2', ell(x, -150, 6, 6)], ['@shade.0', ell(x, -150, 3, 3)]);
      // the drum and the dome
      push(['@stone.0', rect(-66, -214, 132, 38)], ['@shade.0', rect(46, -214, 20, 38), .45], ['@stone.3', rect(-70, -218, 140, 6)]);
      for (let i = 0; i < 8; i++) push(['@shade.1', pointed(-58 + i * 15.5, -208, 8, 22)]);
      push(['@dome.0', onion(0, -218, 70, 72)], ['@dome.2', 'M-50 -224C-58 -248 -40 -272 -6 -288C-30 -268 -40 -246 -34 -222z', .7], ['@dome.1', 'M40 -222C50 -250 34 -274 6 -288C40 -276 62 -250 56 -222z', .7]);
      for (let i = 0; i < 7; i++) { const x = -48 + i * 16; push({ s: '@dome.3', w: .8, op: .35, d: `M${x} -220Q${x * .6} -260 0 -288` }); }
      push(['@stone.3', rect(-58, -222, 116, 5)]);
      // the finial: a gilded spire with a crescent
      push(['@gold.0', 'M-4 -290h8l-2 -10h-4z'], ['@gold.0', ell(0, -304, 4, 4)], ['@gold.0', rect(-1, -320, 2, 14)], ['@gold.1', 'M-6 -326a7 7 0 1 0 12 0a5 5 0 1 1 -12 0z']);
      // four corner kiosks (chhatris) on the central block
      for (const x of [-104, -78, 78, 104]) {
        push(['@stone.2', rect(x - 9, -206, 2.5, 26)], ['@stone.2', rect(x + 6.5, -206, 2.5, 26)], ['@shade.0', rect(x - 6, -204, 12, 22), .4], ['@stone.3', rect(x - 12, -210, 24, 5)], ['@dome.0', onion(x, -210, 11, 20)], ['@gold.0', rect(x - 1, -236, 2, 8)]);
      }
      // steps
      push(['@step.0', rect(-90, -6, 180, 6)], ['@step.1', rect(-80, -10, 160, 4)]);
      // the night look
      lit.push(['@flood.0', rect(-130, -230, 260, 230), .14], ['@flood.1', 'M-60 0L0 -80L60 0z', .2], ['@flood.0', onion(0, -218, 70, 72), .18]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.woking-lightbox (the gallery by the canal; anchor: the ground at the centre) ---------- */
  def({
    id: 'landmark.woking-lightbox', category: 'landmark', size: [440, 210], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      white: ['#eceae4', '#d4d2cc', '#f8f8f4', '#b8b6b0'], slat: ['#a88458', '#8a6a44', '#c4a070'], glass: ['#3c4e5c', '#8eacc0', '#5a7488'],
      frame: ['#4a4e52', '#2e3236'], roof: ['#7a7e82'], flood: ['#fff4d8'],
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff0c8' }, on: 0.95 },
    parts: ['body', 'lit'],
    shadow: { rx: 210, ry: 12, h: 180 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'gallery', 'modern', 'canal', 'kit:urban'],
    credit: 'drawn for the Woking area scenes (a contemporary gallery beside the Basingstoke Canal; architecture only)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the long white box
      push(['@white.1', rect(-200, -112, 330, 112)], ['@white.0', rect(-200, -112, 330, 70)], ['@white.3', rect(-200, -44, 330, 3), .6], ['@roof', rect(-204, -116, 338, 5)]);
      // the glazed ground floor: mullions and doors
      push({ f: '@glass.0', d: rect(-192, -40, 314, 40), glow: 'window' }, ['@glass.1', 'M-192 -40h120l-60 40h-60z', .25]);
      let m = ''; for (let i = 0; i <= 16; i++) m += `M${-192 + i * 19.6} -40v40`;
      push({ s: '@frame.0', w: 1.4, d: m }, ['@frame.1', rect(-192, -22, 314, 1.6)]);
      // a long upper window strip and smaller square openings
      for (let i = 0; i < 10; i++) push({ f: i % 4 === 1 ? '@glass.0' : '@glass.2', d: rect(-180 + i * 20, -96, 20, 16), glow: 'window' });
      let um = ''; for (let i = 0; i <= 10; i++) um += `M${-180 + i * 20} -96v16`;
      push({ s: '@frame.0', w: 1, d: um });
      for (let i = 0; i < 4; i++) push(['@frame.1', rect(38 + i * 22, -98, 14, 14)], { f: '@glass.2', d: rect(40 + i * 22, -96, 10, 10), glow: 'window' });
      // the tall lantern block at the right with vertical timber slats
      push(['@white.0', rect(130, -200, 80, 200)], ['@white.3', rect(196, -200, 14, 200), .5], ['@roof', rect(126, -204, 88, 5)]);
      push({ f: '@glass.1', d: rect(138, -190, 64, 150), glow: 'window' });
      for (let i = 0; i < 12; i++) push(['@slat.' + (i % 3), rect(138 + i * 5.4, -190, 3, 150)]);
      push({ f: '@glass.0', d: rect(138, -36, 64, 36), glow: 'window' }, ['@frame.0', rect(168, -36, 2, 36)]);
      // a cantilevered canopy at the left entrance
      push(['@white.2', rect(-214, -52, 80, 6)], ['@frame.1', rect(-210, -46, 2, 46)]);
      // roof plant and rails
      push(['@white.3', rect(-120, -124, 60, 8)], { s: '@frame.0', w: .8, d: 'M-200 -124h120M-200 -120h120', op: .5 });
      for (let i = 0; i < 12; i++) push(['@frame.0', rect(-200 + i * 10, -124, 1, 8), .6]);
      // facade joints
      for (let i = 0; i < 10; i++) push(['@white.3', rect(-200 + i * 33, -112, .8, 70), .35]);
      // planters along the canal frontage
      for (let i = 0; i < 8; i++) push(['@frame.1', rect(-190 + i * 40, -6, 26, 6)], ['@slat.1', ell(-177 + i * 40, -7, 12, 4)]);
      // the night look
      lit.push(['@flood.0', rect(-200, -112, 410, 112), .1], ['@flood.0', rect(130, -200, 80, 160), .16]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.woking-towers (Victoria Square: three modern towers over a podium; anchor: the ground) ---------- */
  def({
    id: 'landmark.woking-towers', category: 'landmark', size: [600, 440], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      clad: ['#d8d6d0', '#b8b6b0', '#eeeeea', '#9c9a94'], glass: ['#5c7488', '#86a2b8', '#3c5466', '#a8c0d0'], fin: ['#e8e6e0', '#8a8c8e'],
      podium: ['#b8a890', '#9a8c76', '#d0c4ae'], frame: ['#3a3e42'], flood: ['#fff2d8'],
    } },
    night: { glow: { window: '#ffd994', lamp: '#fff0c8' }, on: 0.7 },
    parts: ['body', 'lit'],
    shadow: { rx: 290, ry: 16, h: 420 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'towers', 'skyline', 'modern', 'kit:towers'],
    credit: 'drawn for the Woking area scenes (the residential and hotel towers of Victoria Square; generic, no signs)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      const tower = (x, w, h, floors, kind) => {
        const top = -h, fh = (h - 60) / floors;
        push(['@clad.1', rect(x, top, w, h)], ['@clad.2', rect(x, top, w * .18, h), .6], ['@clad.3', rect(x + w * .84, top, w * .16, h), .5]);
        // glazed bays: a horizontal band per floor (glow), white slab edges between
        for (let f = 0; f < floors; f++) {
          const y = top + 14 + f * fh;
          push({ f: f % 3 === 1 ? '@glass.2' : '@glass.0', d: rect(x + w * .1, y, w * .8, fh * .62), glow: 'window' });
          push(['@clad.2', rect(x + w * .06, y + fh * .62, w * .88, fh * .38)]);
        }
        // vertical fins
        let fn = ''; for (let i = 1; i < 6; i++) fn += rect(x + w * .1 + i * w * .8 / 6 - .8, top + 14, 1.6, h - 74);
        push(['@fin.' + (kind === 'hotel' ? 1 : 0), fn, .8]);
        push(['@glass.3', rect(x + w * .12, top + 14, w * .14, h - 74), .25]);
        // the crown
        if (kind === 'crown') push(['@clad.0', rect(x - 4, top - 18, w + 8, 18)], ['@fin.1', rect(x + w * .2, top - 30, w * .6, 12)], { f: '@glass.1', d: rect(x + w * .25, top - 28, w * .5, 6), glow: 'lamp' });
        else if (kind === 'hotel') push(['@clad.0', `M${x - 4} ${top}Q${x + w / 2} ${top - 26} ${x + w + 4} ${top}z`], ['@clad.3', rect(x - 4, top, w + 8, 4)]);
        else push(['@clad.0', rect(x - 3, top - 8, w + 6, 8)], ['@fin.1', rect(x + w * .3, top - 16, w * .2, 8)]);
      };
      tower(-260, 110, 300, 18, 'hotel');
      tower(-110, 96, 440, 28, 'crown');
      tower(60, 120, 360, 22, 'flat');
      // the podium (shops and the square's entrance) with a glazed arcade
      push(['@podium.1', rect(-300, -66, 600, 66)], ['@podium.0', rect(-300, -66, 600, 40)], ['@podium.2', rect(-304, -70, 608, 6)]);
      for (let i = 0; i < 14; i++) push({ f: '@glass.0', d: rect(-290 + i * 42, -60, 34, 26), glow: 'window' }, ['@frame', rect(-290 + i * 42 + 16, -60, 1.5, 26)]);
      push({ f: '@glass.2', d: rect(-290, -24, 580, 24), glow: 'window' });
      let am = ''; for (let i = 0; i <= 20; i++) am += `M${-290 + i * 29} -24v24`;
      push({ s: '@frame', w: 1.2, d: am });
      lit.push(['@flood.0', rect(-300, -70, 600, 70), .12], ['@flood.0', rect(-110, -470, 96, 30), .3]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.woking-station (the 1930s frontage; anchor: the forecourt at the centre) ---------- */
  def({
    id: 'landmark.woking-station', category: 'landmark', size: [560, 160], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      render: ['#ece2c8', '#d4c8aa', '#f8f0dc', '#b8ac8e'], brick: ['#9a5a40', '#7e4630'], glass: ['#33424e', '#8aa2b6'], frame: ['#2e5a46', '#1e3a2e'],
      canopy: ['#3e5a4c', '#2a3e34', '#6a8a7a'], clock: ['#f6f2e6', '#2a2a2a'], flood: ['#fff0d0'],
    } },
    night: { glow: { window: '#ffd690', lamp: '#fff0c0' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 270, ry: 12, h: 140 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'station', 'railway', 'art deco', 'kit:urban'],
    credit: 'drawn for the Woking area scenes (the 1930s Southern Railway station frontage; no signs)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the long low wings
      push(['@render.1', rect(-280, -70, 560, 70)], ['@render.0', rect(-280, -70, 560, 44)], ['@render.3', rect(-284, -76, 568, 7)], ['@brick.0', rect(-280, -10, 560, 10)]);
      // horizontal window bands (the 1930s look): long strips with thin mullions
      for (const [x0, x1] of [[-270, -80], [80, 270]]) {
        push({ f: '@glass.0', d: rect(x0, -60, x1 - x0, 20), glow: 'window' }, ['@render.2', rect(x0, -52, x1 - x0, 2), .8]);
        let m = ''; for (let x = x0; x <= x1; x += 15.8) m += `M${f1(x)} -60v20`;
        push({ s: '@frame.0', w: 1.2, d: m });
        for (let i = 0; i < 5; i++) push({ f: '@glass.0', d: rect(x0 + 8 + i * (x1 - x0 - 16) / 5, -34, (x1 - x0) / 5 - 14, 22), glow: 'window' }, ['@frame.1', rect(x0 + 8 + i * (x1 - x0 - 16) / 5, -36, (x1 - x0) / 5 - 14, 2)]);
      }
      // the central block, taller, with a stepped parapet and tall windows
      push(['@render.0', rect(-80, -128, 160, 128)], ['@render.2', rect(-80, -128, 22, 128), .5], ['@render.3', rect(64, -128, 16, 128), .45]);
      push(['@render.3', rect(-84, -134, 168, 7)], ['@render.0', rect(-46, -146, 92, 14)], ['@render.3', rect(-48, -150, 96, 5)]);
      for (let i = 0; i < 5; i++) { const x = -66 + i * 27; push({ f: '@glass.0', d: rect(x, -116, 18, 60), glow: 'window' }, ['@glass.1', rect(x + 2, -114, 4, 56), .35], ['@frame.0', rect(x, -88, 18, 1.6)]); }
      // the clock on the parapet (plain face, two hands)
      push(['@render.3', ell(0, -140, 13, 13)], ['@clock.0', ell(0, -140, 10.5, 10.5)], { s: '@clock.1', w: 1.6, d: 'M0 -140v-7M0 -140l5 3' });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; push(['@clock.1', ell(Math.sin(a) * 8.5, -140 - Math.cos(a) * 8.5, .7, .7)]); }
      // the canopy over the entrance and its glazed doors
      push(['@canopy.0', rect(-110, -50, 220, 9)], ['@canopy.2', rect(-110, -50, 220, 2)], ['@canopy.1', rect(-110, -41, 220, 3)]);
      for (let i = 0; i < 6; i++) push({ f: '@glass.0', d: rect(-66 + i * 23, -38, 18, 38), glow: 'window' }, ['@frame.0', rect(-66 + i * 23 + 8, -38, 2, 38)]);
      for (let i = 0; i < 6; i++) push({ f: '@clock.0', d: ell(-90 + i * 36, -38, 3, 1.4), glow: 'lamp' });
      // a flagpole-free flat roof line with rooflights
      for (let i = 0; i < 8; i++) push(['@render.3', rect(-260 + i * 68, -80, 30, 4)]);
      lit.push(['@flood.0', rect(-110, -40, 220, 40), .22], ['@flood.0', rect(-80, -150, 160, 110), .1]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.horsell-sandpits (natural: sand faces and pines on Horsell Common; anchor: the ground) ---------- */
  const HEATH = bySeason({
    sand: { spring: ['#e2cc9a', '#c8ac76', '#f0dcb0', '#a88c5c'], summer: ['#e8d2a0', '#ccb078', '#f6e2b6', '#ac905e'], autumn: ['#d8c090', '#bca070', '#e8d2a6', '#9a7e52'], winter: ['#cfc0a0', '#b0a084', '#e0d4b8', '#8c7e64'] },
    heath: { spring: ['#6a7a44', '#88964e', '#a6a85a'], summer: ['#7a5a7e', '#946a94', '#6a7a44'], autumn: ['#8a5a5a', '#a26a5e', '#7a6a3e'], winter: ['#5e5448', '#6e6250', '#7a6e5a'] },
    pine: { spring: ['#2e4a32', '#3e5e3c', '#527448'], summer: ['#2a4630', '#3a583a', '#4c6c44'], autumn: ['#2e4632', '#3e563a', '#526a44'], winter: ['#2a3e30', '#36503a', '#465e44'] },
    bark: { spring: ['#a0603a', '#6a4028'], summer: ['#a8643a', '#6e4228'], autumn: ['#9a5a36', '#664026'], winter: ['#8a5434', '#5a3a24'] },
  });
  def({
    id: 'landmark.horsell-sandpits', category: 'landmark', size: [720, 230], variants: 1, seasonal: true, flippable: false,
    palette: Object.assign({ base: {} }, HEATH),
    tags: ['landmark', 'natural', 'signature', 'place:uk/woking', 'uk', 'woking', 'horsell common', 'heath', 'sand', 'kit:temperate'],
    credit: 'drawn for the Woking area scenes (the sandpits of Horsell Common)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s);
      // the long bank of the common, then the bare sand faces cut into it
      push(['@heath.0', 'M-360 0L-350 -60Q-240 -96 -100 -92Q60 -100 200 -86Q320 -72 360 -40L360 0z']);
      push(['@sand.1', 'M-300 0L-260 -54Q-180 -80 -100 -76L-60 -40Q-20 -20 40 -18L80 -60Q160 -78 240 -66L300 -30L320 0z']);
      push(['@sand.0', 'M-280 0L-246 -48Q-180 -70 -110 -68L-74 -36Q-30 -12 40 -10L90 -54Q160 -70 230 -60L286 -28L300 0z']);
      push(['@sand.2', 'M-246 -48Q-180 -70 -110 -68L-120 -58Q-180 -58 -232 -40z', .9], ['@sand.2', 'M90 -54Q160 -70 230 -60L220 -52Q160 -60 100 -44z', .9]);
      push(['@sand.3', 'M-110 -68L-74 -36Q-30 -12 40 -10L36 -4Q-36 -6 -84 -30z', .5], ['@sand.3', 'M230 -60L286 -28L300 0L270 -4z', .45]);
      // ripples, footprints and gullies in the sand
      for (let i = 0; i < 22; i++) { const x = rr(r, -260, 280), y = rr(r, -40, -6); push({ s: '@sand.3', w: .9, op: .35, d: `M${f1(x)} ${f1(y)}q${f1(rr(r, 6, 12))} -3 ${f1(rr(r, 14, 24))} 0` }); }
      for (let i = 0; i < 8; i++) { const x = rr(r, -230, 250); push({ s: '@sand.3', w: 1.4, op: .4, d: `M${f1(x)} ${f1(rr(r, -66, -50))}q${f1(rr(r, -6, 6))} 20 ${f1(rr(r, -4, 4))} ${f1(rr(r, 30, 44))}` }); }
      // heather and gorse tufts along the lip
      for (let i = 0; i < 40; i++) { const x = rr(r, -350, 350), y = -60 - Math.max(0, 30 - Math.abs(x) / 12) + rr(r, -8, 26) - (Math.abs(x) < 300 ? 18 : 0); push(['@heath.' + (i % 3), ell(x, y, rr(r, 8, 18), rr(r, 4, 8))]); }
      // Scots pines: tall bare trunks and flat umbrella crowns
      for (let i = 0; i < 9; i++) {
        const x = -320 + i * 80 + rr(r, -20, 20), base = -78 + rr(r, -6, 6), h = rr(r, 110, 150), lean = rr(r, -10, 10);
        push(['@bark.0', `M${f1(x - 3)} ${f1(base)}L${f1(x - 1.5 + lean)} ${f1(base - h)}h3L${f1(x + 3)} ${f1(base)}z`], ['@bark.1', `M${f1(x + 1)} ${f1(base)}L${f1(x + 1 + lean)} ${f1(base - h)}h1.5L${f1(x + 3)} ${f1(base)}z`, .6]);
        push({ s: '@bark.1', w: 1.4, d: `M${f1(x + lean * .8)} ${f1(base - h * .8)}l${f1(rr(r, -18, 18))} ${f1(-rr(r, 8, 16))}` });
        for (let k = 0; k < 4; k++) { const cx = x + lean + rr(r, -26, 26), cy = base - h - rr(r, -6, 14), w = rr(r, 18, 30); push(['@pine.' + (k % 3), `M${f1(cx - w)} ${f1(cy)}Q${f1(cx - w * .6)} ${f1(cy - 14)} ${f1(cx)} ${f1(cy - 16)}Q${f1(cx + w * .6)} ${f1(cy - 14)} ${f1(cx + w)} ${f1(cy)}Q${f1(cx)} ${f1(cy + 6)} ${f1(cx - w)} ${f1(cy)}z`]); }
      }
      // birches at the edge
      for (let i = 0; i < 4; i++) { const x = rr(r, -340, 340), base = -64, h = rr(r, 60, 80); push(['#e8e4dc', rect(x - 1.5, base - h, 3, h)], ['@heath.2', ell(x, base - h, 12, 18), .9]); }
      return { body: b };
    },
  });
})();
