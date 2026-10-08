/* ============================================================
   SCENE LIBRARY: the shared people builder (docs/dev/SCENE_ENGINE.md 2.8). PURE: functions and
   consts only, nothing drawn at load. Sorts before every other 70-scene-lib-people* file, so their
   objects call it inside build().

   scenePeople.figure(o)        one anonymous, FACELESS person as walk-cycle parts (see figure() for every option):
                                  { legB, body, legA, hip, pivot, head: {x, y, rx, ry}, hands: {near, far},
                                    shoulders: {near, far}, at: {farArm, nearArm}, top, seat, crank, pedals }
   scenePeople.outfit(p, season) a preset's seasonal wardrobe -> the o of figure() (PRESETS: 8 people)
   scenePeople.ik(s, g, L1, L2, side)  two-bone IK: [joint, end] from s towards g (side 1: an elbow, -1: a knee)
   scenePeople.BUILD, TOPS      the body builds and the garment table (how each top sits); ARM_POSES, LEG_POSES

   POSES. o.arms: a pair name for both arms, or { far, near } with one pose (or a hand target) per arm.
     forward  the arm swung forward (the walker's far arm)        back      swung back (the walker's near arm)
     run      bent at the elbow, swinging: far fist forward at the chest, near elbow back, the hand at the hip
     hold     a hand held forward at the waist (a lead, a rod, a bag's handle)
     play     two hands raised for an instrument: far hand up and forward (a neck), near hand at the belly (strum)
     bars     both hands forward on handlebars                    phone, umbrella   raised, as today
     none     no arm: an ARMLESS body (o.arms: 'none'), or one missing arm ({ near: 'none' })
     { hand: [x, y] }  that hand placed at a point in object coordinates (two-bone IK, the elbow down and back)
     Pair names: walk (default: far forward, near back, or phone / umbrella when o.hold says so), forward, back,
     run, hold (far forward, near hold), play, bars, phone and umbrella (far forward), none. The phone and the
     open umbrella themselves are drawn only when o.hold asks for them; a stick or a closed umbrella expects
     the far 'forward' arm and standing legs.
   o.legs: walk (default, straight legs swung by the walk hook) | run (a static stride with bent knees, the far
     shin kicked up; pair it with walkAnim(0.55, 22-30, 2) for a longer stride) | seated (hips on a stool or a
     log whose top is o.seat units above the ground, default 10; the near knee up, the far leg out; the whole
     figure drops so the feet stay on the ground; a long top or a skirt covers the lap) | cycle (the hip on a
     saddle at the standing hip; thigh and shin to pedals on cranks about o.crank [x, y], default [6, -10],
     o.crankLen 6 long, at o.pedal degrees: 0 = the near crank forward, 90 = down; the far crank opposite).
   Headgear: o.hat.kind beanie | cap | flatcap | sunhat | helmet (a bike helmet: shell, vents, strap; hat.strip
     adds a lit reflector), or a hood up (top.hood: 'up').
   RETURNED ANCHORS (object coordinates, the dx and the seated drop applied): hands.near / hands.far: each hand's
     centre ([x, y], null for a 'none' arm), to attach a lead, rod, bag, instrument or handlebar; shoulders.near /
     .far: the shoulder joints; head: the head egg; top: the crown; pivot: the hip joint [x, y] (hip: its y), the
     pivot of the walk hook; seat: where the buttocks rest (seated, cycle: the stool or saddle top); crank and
     pedals.near / .far (cycle). at.farArm / at.nearArm: [start, end) indices of each arm in body, so a caller
     splices a held thing under the near arm (body.splice(at.nearArm[0], 0, ...)) or behind the far one.
   PARTS AND PIVOTS: legB (the far leg), body (everything else), legA (the near leg); the legs turn about pivot
     (scenePeople.walkAnim swings legB and legA in opposite phase and bobs the body). The legs of every pose
     keep this split and pivot, so one walk hook drives walking, running and (a small swing) pedalling.
   scenePeople.define(def)      sceneObjDefine with tidy() (drops empty shapes, round caps on strokes)
   scenePeople.palette(extra)   the tone4 palette { base: { slot: [base, dark, light, deep] } } of every
                                skin, hair and cloth slot (+ extra slots); paints are '@slot.N'
   scenePeople.walkAnim(period, deg, bob)  the walk hook: legB and legA swing about the hip, the body bobs
   scenePeople.tags(extra)      ['uk', 'people', 'anonymous', 'silhouette', ..., 'kit:people', 'role:walker']
   scenePeople.NIGHT            the night look: night.glow colours (rim: cool rim light, lamp, screen)
   helpers: f1, ell, circ, rect, hx, mix, dark, light, tone4, D (path data from commands and points)

   The figure (an adult about 62 units to the crown, the hip pivot at y -31.5, so one walk hook fits
   every preset; FACES RIGHT; anchor: the feet): a head with hair, a hat or a hood and NO face marks
   (no eyes, nose, ears or mouth: the head is a plain egg), neck, shoulders, torso, two-segment arms
   (upper arm and forearm) and legs (thigh and shin), feet. Garments: tee, shirt, blouse, jumper,
   cardigan, hoodie, jacket, rain, parka, coat (top); trousers, jeans, joggers, shorts, skirt (bottom).
   Accessories: crossbody bag, shoulder bag, backpack, umbrella (open or closed), hat, scarf, gloves,
   walking stick, phone. Fine pieces (folds, seams, straps, cuffs, soles, laces, hair strands ...)
   carry `detail: true`: the size tier drops them when the person is drawn under 48 px (sceneDetailAt).
   Layering that holds in every renderer: the canvas and the SVG draw the moving legs AFTER the body,
   so every leg starts below the lowest body edge it meets (the trouser seat, a coat or skirt hem),
   no hand or held thing hangs over a thigh, and a stick or a closed umbrella is held in the FAR hand.
   ============================================================ */
const scenePeople = (function () {
  const f1 = v => Math.round(v * 10) / 10;
  const num = v => { const s = String(f1(v)); return s === '-0' ? '0' : s; };
  /** Path data: D(dx, 'M', x, y, 'Q', cx, cy, x, y, 'Z') -- commands and (x, y) pairs; dx shifts every x. */
  function D(dx, ...a) {
    let o = '', k = 0, prev = false;
    for (const t of a) {
      if (typeof t === 'number') { const s = num(k++ % 2 === 0 ? t + dx : t); o += (prev && s[0] !== '-' ? ' ' : '') + s; prev = true; }
      else { o += t; prev = false; k = 0; }
    }
    return o;
  }
  /** Maps every (x, y) pair of D's arguments through fn(x, y) -> [x, y] (commands pass through). */
  function mapPts(fn, a) {
    const o = [];
    let k = 0, px = 0;
    for (const v of a) {
      if (typeof v !== 'number') { o.push(v); k = 0; } else if (k++ % 2 === 0) px = v; else o.push(...fn(px, v));
    }
    return o;
  }
  /** Two-bone IK: from s towards the goal g with bones L1 and L2 -> [joint, end] (end = g, or the furthest reach).
   *  side 1 bends the joint down and back of the line (an elbow), side -1 forward and up (a knee). */
  function ik(s, g, L1, L2, side) {
    const vx = g[0] - s[0], vy = g[1] - s[1], d = Math.hypot(vx, vy) || 1e-6, ux = vx / d, uy = vy / d;
    const dm = Math.min(d, L1 + L2 - 1e-3), a = (L1 * L1 - L2 * L2 + dm * dm) / (2 * dm), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    return [[s[0] + ux * a - uy * h * side, s[1] + uy * a + ux * h * side], [s[0] + ux * dm, s[1] + uy * dm]];
  }
  const ell = (x, y, rx, ry) => `M${num(x - rx)} ${num(y)}a${num(rx)} ${num(ry)} 0 1 0 ${num(2 * rx)} 0a${num(rx)} ${num(ry)} 0 1 0 ${num(-2 * rx)} 0z`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${num(x)} ${num(y)}h${num(w)}v${num(h)}h${num(-w)}z`;
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const dark = cs => cs.map(c => mix(c, '#000000', .28)), light = cs => cs.map(c => mix(c, '#ffffff', .2));
  /** A colour as its four tones: [base, dark (shade, far limbs), light (lit edges), deep (seams, folds)]. */
  const tone4 = c => [c, mix(c, '#000000', .28), mix(c, '#ffffff', .25), mix(c, '#000000', .52)];
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = (parts[k] || []).filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  function define(def) { return sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) })); }

  /* ---------- palettes: skin, hair and cloth slots, each a tone4 ---------- */
  const SKIN = ['#f2cdb0', '#e2b08c', '#c98f68', '#a46c4a', '#7c5038', '#5a3a2a'];
  const HAIR = ['#2a211c', '#4a3324', '#7a5434', '#b88c56', '#dcc490', '#8e8c8a', '#d4d2ce', '#7a3420'];
  const CLOTH = {
    navy: '#2f3d5c', denim: '#3e5a80', sky: '#86b4d8', teal: '#2f6a6e', forest: '#2e5a3e', olive: '#5f6a3a', khaki: '#9a8c5c',
    stone: '#c4b89c', camel: '#b08a5a', tan: '#9a6a40', rust: '#a8502e', red: '#b83a30', coral: '#e07a62', burgundy: '#7a2e3a',
    pink: '#d88aa0', mustard: '#c89a32', yellow: '#e2c23a', cream: '#ece4d0', white: '#f2f0ea', grey: '#8a8c90', charcoal: '#3a3c42',
    black: '#232328', tweed: '#7a6a52', plum: '#5a3a5e', sole: '#e8e4dc',
  };
  const SLOTS = (() => {
    const o = {};
    SKIN.forEach((c, i) => { o['sk' + i] = tone4(c); });
    HAIR.forEach((c, i) => { o['hr' + i] = tone4(c); });
    for (const [k, c] of Object.entries(CLOTH)) o[k] = tone4(c);
    o.ink = ['#141012', '#141012', '#2a2628', '#000000'];
    return o;
  })();
  const palette = extra => ({ base: Object.assign({}, SLOTS, extra || {}) });
  /** The night look: a cool rim light along the back edge, lamps (reflective strips, a lit umbrella edge) and a phone screen. */
  const NIGHT = Object.freeze({ on: 1, glow: { rim: '#9fc0f2', lamp: '#ffd98a', screen: '#d2e6ff' } });
  const walkAnim = (period, deg, bob) => ({ walk: { parts: ['legB', 'legA'], pivot: [0, HIP], deg: deg || 22, period: period || 0.9, bob: bob == null ? 1.5 : bob } });
  const tags = extra => ['uk', 'people', 'anonymous', 'silhouette', ...(extra || []), 'kit:people', 'kit:temperate', 'kit:urban', 'role:walker'];

  /* ---------- the body plan (an adult 62 units to the crown; side view facing right) ---------- */
  const HIP = -31.5, SEAT = -28.2, KNEE = -17.2, ANK = -2.6, LEGTOP = -29.8;
  const BUILD = {
    slim: { d: 7.6, belly: 0, thigh: 5.4, arm: 2.9 },
    average: { d: 8.6, belly: 0.4, thigh: 6.0, arm: 3.2 },
    broad: { d: 9.6, belly: 0.6, thigh: 6.5, arm: 3.6 },
    stout: { d: 9.8, belly: 2.4, thigh: 6.8, arm: 3.5 },
  };
  /** How a top sits: hem y (short tops end above the legs' tops), thickness, flare at the hem, long sleeves. */
  const TOPS = {
    tee: { hem: -30.4, g: 0, fl: 0, sleeve: 'short' }, blouse: { hem: -30.2, g: 0.2, fl: 0.4, sleeve: 'short' }, shirt: { hem: -30.4, g: 0.1, fl: 0, sleeve: 'long', collar: 1 },
    jumper: { hem: -30.4, g: 0.3, fl: 0, sleeve: 'long', rib: 1 }, cardigan: { hem: -30.2, g: 0.3, fl: 0, sleeve: 'long', open: 1 },
    hoodie: { hem: -30.2, g: 0.5, fl: 0, sleeve: 'long', hood: 1, rib: 1 }, jacket: { hem: -30.6, g: 0.4, fl: 0.2, sleeve: 'long', collar: 1, zip: 1 },
    rain: { hem: -24.5, g: 0.6, fl: 1.2, sleeve: 'long', hood: 1, zip: 1, long: 1 }, parka: { hem: -22.5, g: 1.1, fl: 1, sleeve: 'long', hood: 1, zip: 1, long: 1, quilt: 1 },
    coat: { hem: -17.2, g: 0.7, fl: 1.8, sleeve: 'long', collar: 1, long: 1, buttons: 1 },
  };
  for (const k in TOPS) TOPS[k].kind = k;   // each top knows its name: the garment details below test T.kind
  const t = (slot, k) => `@${slot}.${k || 0}`;

  /**
   * One person. o: { season, dx, build, age ('young' | 'adult' | 'older'), tall (units added to the torso),
   *   skin (0-5), hair: { style: short | crop | long | pony | bun | curly | bald, col (0-7) },
   *   top: { kind (TOPS), col, col2 (an inner layer / trim), hood: 'up' }, bottom: { kind, col, len ('knee' | 'midi') },
   *   tights (a colour, or null for bare legs under a skirt or shorts; was `legs` before v2.1), shoes: { kind: trainer | shoe | boot | sandal, col },
   *   hat: { kind: beanie | cap | flatcap | sunhat | helmet, col, pom, strip (helmet: a lit reflector) }, scarf: { col, col2 }, gloves: col,
   *   bag: { kind: crossbody | shoulder | backpack, col, strip (a reflective strip at night) },
   *   hold: umbrella | brolly (closed, far hand) | stick (far hand) | phone, holdCol,
   *   arms: ARM pair name | { far, near } (a pose name or { hand: [x, y] }), legs: walk | run | seated | cycle,
   *   seat (seated: the seat's height, default 10), crank: [x, y], crankLen, pedal (cycle, degrees) }
   *   (the POSES list at the top of the file explains each pose and every returned anchor)
   */
  function figure(o) {
    const dx = o.dx || 0, B = BUILD[o.build] || BUILD.average, old = o.age === 'older', young = o.age === 'young';
    const stoop = old ? 1 : 0, lean = stoop * 1.3;
    const legPose = o.legs || 'walk', bent = legPose !== 'walk';
    const oy = legPose === 'seated' ? -(o.seat == null ? 10 : o.seat) - SEAT : 0;   // seated: the whole figure drops onto the seat
    const P = (...a) => D(dx, ...(oy ? mapPts((x, y) => [x, y + oy], a) : a)), X = x => x + dx, Y = y => y + oy;
    const sk = 'sk' + ((o.skin | 0) % SKIN.length), hair = o.hair || { style: 'short', col: 0 }, hr = 'hr' + ((hair.col | 0) % HAIR.length);
    const top = o.top || { kind: 'tee', col: 'white' }, T = TOPS[top.kind] || TOPS.tee, tc = top.col;
    const bot = o.bottom || { kind: 'trousers', col: 'charcoal' }, bc = bot.col, skirt = bot.kind === 'skirt', shorts = bot.kind === 'shorts';
    const legCol = o.tights || null;   // tights under a skirt or shorts; null: bare legs
    const ys = -50.4 - (o.tall || 0) + stoop * 0.8 + (young ? 0.8 : 0), H0 = ys - 11.6;   // shoulder line; the crown
    const hyc = ys - 6.9, ry = 4.15, rx = 3.55, hxc = 0.7 + lean * 1.1;              // the head (an egg, no face)
    const d = B.d, xb = -d / 2 - T.g, xf = d / 2 - 0.4 + T.g, belly = B.belly;
    const hoodUp = !!(T.hood && top.hood === 'up'), hat = o.hat || null;
    const body = [], legB = [], legA = [];
    const det = (sh) => Object.assign(Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : sh, { detail: true });
    const strokeD = (s, w, d2, op, extra) => Object.assign({ s, w, d: d2, op }, extra || {});
    const hands = { far: null, near: null };

    /* ---- legs: thigh and shin, a shoe; every leg starts below the lowest body edge it meets ---- */
    // (seated and cycling legs: a skirt ends at the seat and colours the thighs, as a long top's lap does)
    const longHem = T.long ? T.hem : null, skirtHem = skirt ? (bent ? SEAT : bot.len === 'midi' ? -9.5 : -17.5) : null;
    const hemLow = Math.max(longHem == null ? -99 : longHem, skirtHem == null ? -99 : skirtHem);
    const legTop = bent ? LEGTOP : hemLow > -99 ? hemLow - 1.4 : LEGTOP;
    const tw = B.thigh, sh = o.shoes || { kind: 'shoe', col: 'black' };
    /* bent legs (run, seated, cycle): the straight leg below is drawn through a skin that turns the thigh about
       the hip, the shin about the knee and the foot about the ankle (blended across each joint) */
    const L1 = KNEE - HIP, L2 = ANK - KNEE;
    const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const ang = (x, y) => Math.atan2(-x, y);   // a bone's turn from hanging straight down (+: the lower end goes back)
    const skinLeg = (a1, a2, a3) => {
      const kr = rot(a1, 0, L1), K = [kr[0], HIP + kr[1]], ar = rot(a2, 0, L2), A = [K[0] + ar[0], K[1] + ar[1]];
      const T1 = (x, y) => { const r = rot(a1, x, y - HIP); return [r[0], HIP + r[1]]; };
      const T2 = (x, y) => { const r = rot(a2, x, y - KNEE); return [K[0] + r[0], K[1] + r[1]]; };
      const T3 = (x, y) => { const r = rot(a3, x, y - ANK); return [A[0] + r[0], A[1] + r[1]]; };
      const lerp = (p, q, w) => [p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w];
      return (x, y) => {
        const w1 = Math.min(1, Math.max(0, (y - KNEE + 1.5) / 3)), w2 = Math.min(1, Math.max(0, (y - ANK + 2.4) / 1.6));
        const up = w1 < 1 ? lerp(T1(x, y), T2(x, y), w1) : T2(x, y);
        return w2 > 0 ? lerp(up, T3(x, y), w2) : up;
      };
    };
    // a segment that crosses the knee or the ankle is flattened to lines first, so it bends with the leg (a curve's
    // control points on two bones would bulge out of the leg)
    const ZONES = [[KNEE - 1.5, KNEE + 1.5], [ANK - 2.4, ANK - 0.8]], NPTS = { M: 1, L: 1, Q: 2, C: 3, Z: 0 };
    const bez = (c, u) => { let q = c; while (q.length > 1) q = q.slice(1).map((p, i) => [q[i][0] + (p[0] - q[i][0]) * u, q[i][1] + (p[1] - q[i][1]) * u]); return q[0]; };
    const bendPts = (fn, a) => {
      const out = [];
      let i = 0, cur = [0, 0], start = cur;
      while (i < a.length) {
        const c = a[i++], pts = [];
        for (let j = 0; j < NPTS[c]; j++, i += 2) pts.push([a[i], a[i + 1]]);
        if (c === 'Z') { out.push('Z'); cur = start; continue; }
        if (c === 'M') { out.push('M', ...fn(...pts[0])); cur = start = pts[0]; continue; }
        const ctl = [cur, ...pts], lo = Math.min(...ctl.map(p => p[1])), hi = Math.max(...ctl.map(p => p[1]));
        if (ZONES.some(([z0, z1]) => lo < z1 && hi > z0)) { const N = c === 'L' ? 3 : 6; for (let s = 1; s <= N; s++) out.push('L', ...fn(...bez(ctl, s / N))); }
        else { out.push(c); for (const p of pts) out.push(...fn(...p)); }
        cur = pts[pts.length - 1];
      }
      return out;
    };
    const toLeg = (ank, a3) => { const [kn, e] = ik([0, HIP], ank, L1, L2, -1); return skinLeg(ang(kn[0], kn[1] - HIP), ang(e[0] - kn[0], e[1] - kn[1]), a3); };
    let bendA = null, bendB = null, crank = null, pedals = null;
    if (legPose === 'run') { bendA = skinLeg(-0.3, 0.15, 0.15); bendB = skinLeg(0.32, 0.85, 0.85); }   // near leg reaching, far shin kicked up
    else if (legPose === 'seated') { bendA = toLeg([13.6, ANK - oy], 0); bendB = toLeg([22, ANK - oy], 0); }   // near knee up, far leg out; feet flat
    else if (legPose === 'cycle') {
      const c = o.crank || [6, -10], cx = c[0] - dx, cy = c[1], r = o.crankLen || 6, p = (o.pedal || 0) * Math.PI / 180, a3 = 0.2;
      const ped = s => [cx + r * Math.cos(p + s), cy + r * Math.sin(p + s)];
      const ankleOver = q => { const f = rot(a3, 3.1, 2.8); return [q[0] - f[0], q[1] - f[1]]; };   // the ball of the foot on the pedal
      const pn = ped(0), pf = ped(Math.PI);
      bendA = toLeg(ankleOver(pn), a3); bendB = toLeg(ankleOver(pf), a3);
      crank = [X(cx), cy]; pedals = { near: [X(pn[0]), pn[1]], far: [X(pf[0]), pf[1]] };
    }
    const PF = P;
    const leg = (near) => {
      const k = near ? 0 : 1, out = [], bend = near ? bendA : bendB;
      const P = bend ? (...a) => PF(...bendPts(bend, a)) : PF;
      const LC = (x, y, r) => { const q = bend ? bend(x, y) : [x, y]; return circ(X(q[0]), Y(q[1]), r); };
      // trouser colours down the leg, or skin / tights under shorts and skirts
      const shortLen = shorts ? -20.6 : null, cloth = !(shorts || skirt);
      const lower = cloth ? t(bc, k) : (legCol ? t(legCol, k) : t(sk, k)), upper = bent && T.long ? t(tc, k) : bent && skirt ? t(bc, k) : lower;
      const yT = legTop, kn = KNEE;
      if (yT < kn) out.push([upper, P('M', -tw / 2, yT, 'L', tw / 2 - 0.3, yT, 'Q', tw / 2 + 0.2, -22.5, 2.3, kn + 0.8, 'L', -2.0, kn + 0.8, 'Q', -tw / 2 - 0.1, -23, -tw / 2, yT, 'Z')]);
      const sy0 = Math.max(yT, kn - 0.9), wide = cloth && bot.kind !== 'joggers' ? 0.3 : 0;
      out.push([lower, !cloth
        ? P('M', -2.0, sy0, 'L', 2.3, sy0, 'Q', 1.6, -9, 1.1, ANK, 'L', -1.3, ANK, 'Q', -2.9, -10.5, -2.0, sy0, 'Z')
        : P('M', -2.1, sy0, 'L', 2.4, sy0, 'L', 1.9 + wide, -2.2, 'L', -1.8 - wide, -2.2, 'Z')]);
      if (shorts) out.push([t(bc, k), P('M', -tw / 2 - 0.2, yT, 'L', tw / 2, yT, 'L', tw / 2 - 0.4, shortLen, 'L', -tw / 2 + 0.1, shortLen, 'Z')]);
      // the shoe (boots climb the shin)
      const sc = sh.col, boot = sh.kind === 'boot', sandal = sh.kind === 'sandal';
      out.push([t(sc, k), boot ? P('M', -2.4, 0.2, 'L', -2.4, -7.4, 'L', 1.7, -7.4, 'L', 1.9, -3.6, 'Q', 3.8, -3.1, 5.4, -1.7, 'Q', 6.2, -0.9, 5.8, 0.2, 'Z')
        : sandal ? P('M', -2.3, 0.2, 'L', -2.2, -1.2, 'L', 5.2, -1.2, 'Q', 6, -0.6, 5.7, 0.2, 'Z')
          : P('M', -2.3, 0.2, 'L', -2.5, -2.5, 'Q', -2.2, -3.5, -0.7, -3.5, 'L', 1.5, -3.4, 'Q', 3.5, -3, 5.1, -1.7, 'Q', 6, -1, 5.7, 0.2, 'Z')]);
      if (sandal) out.push([t(sk, k), P('M', -1.6, -1.2, 'L', -1.3, ANK, 'L', 1.1, ANK, 'Q', 3.6, -2.4, 4.9, -1.2, 'Z')]);
      // fine pieces: a sole, laces or a strap, a heel, a toe cap; a crease, a seam, a knee fold, a hem
      out.push(det([sh.kind === 'trainer' ? t('sole', 0) : t(sc, 3), P('M', -2.3, -0.5, 'L', 5.8, -0.5, 'L', 5.7, 0.2, 'L', -2.3, 0.2, 'Z')]));
      if (!sandal) {
        out.push(det(strokeD(t(sc, 2), 0.45, P('M', 0.6, -3.1, 'L', 2.6, -2.5, 'M', 1.2, -3.3, 'L', 2, -2.1), 0.8)));
        out.push(det([t(sc, 3), P('M', -2.4, -2.2, 'Q', -2.4, -0.9, -1.4, -0.5, 'L', -2.3, -0.5, 'Z'), 0.7]));
        out.push(det(strokeD(t(sc, 2), 0.5, P('M', 3.4, -2.4, 'Q', 4.8, -1.8, 5.3, -0.8), 0.6)));
      } else out.push(det(strokeD(t(sc, 3), 0.5, P('M', 0.2, -1.2, 'L', 1.8, -2.4), 0.8)), det(strokeD(t(sc, 0), 0.55, P('M', -1.4, -3.0, 'L', 0.9, -3.0), 0.9)),   // the toe strap, the ankle strap
        det(strokeD(t(sc, 2), 0.35, P('M', -2.1, -1.0, 'L', 5.4, -1.0), 0.5)), det(strokeD(t(sc, 3), 0.45, P('M', 2.6, -1.3, 'Q', 3.4, -2.2, 4.0, -1.3), 0.7)));   // the sole's lit edge, a cross strap
      if (boot) out.push(det(strokeD(t(sc, 3), 0.4, P('M', -2.2, -6.8, 'L', 1.5, -6.8), 0.7)));
      if (cloth) {
        // soft, mostly diagonal folds in the dark tone (crossing lines in the deep tone read as a check)
        out.push(det(strokeD(t(bc, 1), 0.4, P('M', 0.9, yT + 1.2, 'Q', 1.6, -18, 1.4, -3), 0.35)));                  // the crease
        out.push(det(strokeD(t(bc, 1), 0.35, P('M', -1.0, yT + 1.6, 'Q', -0.6, -16, -0.7, -3.2), 0.3)));             // the side seam
        out.push(det(strokeD(t(bc, 1), 0.45, P('M', 0.8, kn + 0.8, 'Q', 1.7, kn + 0.1, 2.2, kn + 0.6), 0.45)));          // the knee fold
        out.push(det(strokeD(t(bc, 1), 0.4, P('M', -1.4, kn - 1.2, 'Q', -0.2, kn - 2.6, 1.2, kn - 2.2), 0.35)));       // a fold below the knee
        out.push(det(strokeD(t(bc, 2), 0.5, P('M', -1.6, -3.6, 'L', 2.0, -3.6), 0.45)));                            // the hem
        out.push(det(strokeD(t(bc, 1), 0.4, P('M', -1.8, yT + 1.6, 'Q', -0.6, yT + 2.4, 0.6, yT + 4.2), 0.35)));      // a fold at the top of the thigh
        out.push(det(strokeD(t(bc, 2), 0.6, P('M', 2.0, kn + 3.4, 'Q', 2.4, kn + 0.8, 2.1, kn - 1.6), 0.3)));          // the lit knee
        out.push(det(strokeD(t(bc, 1), 0.4, P('M', -1.8, kn + 0.2, 'Q', -1.2, kn - 0.6, -0.4, kn - 0.2), 0.4)));      // behind the knee
        out.push(det(strokeD(t(bc, 1), 0.35, P('M', -1.4, -10.6, 'Q', -0.4, -9.4, 0.4, -7.4), 0.3)));                // the break above the shoe
        out.push(det(strokeD(t(bc, 1), 0.4, P('M', -1.5, -5.2, 'Q', 0.2, -4.4, 1.9, -5.4), 0.4)));                   // the fabric bunching at the ankle
        out.push(det(strokeD(t(bc, 2), 0.5, P('M', 1.9, kn - 1.6, 'L', 1.7, -4.4), 0.3)));                             // the lit front of the shin
        out.push(det(strokeD(t(bc, 1), 0.5, P('M', -1.9, kn - 1.8, 'Q', -2.2, -10, -1.6, -5), 0.35)));                 // the shaded calf
        if (bot.kind === 'joggers') out.push(det([t(bc, 3), P('M', -1.9, -4, 'L', 2.1, -4, 'L', 2, -2.4, 'L', -1.8, -2.4, 'Z'), 0.6]));
        if (bot.kind === 'jeans') out.push(det(strokeD('@mustard.1', 0.25, P('M', -1.4, yT + 2, 'Q', -0.9, -15, -1.2, -3.4), 0.3)));
      } else {
        out.push(det(strokeD(t(legCol || sk, 3), 0.5, P('M', -2.4, -12.4, 'Q', -2.2, -8, -1.3, -4), 0.35)));        // the calf shade
        out.push(det(strokeD(t(legCol || sk, 2), 0.5, P('M', 1.9, kn - 1.4, 'Q', 1.4, -9, 1.0, -4), 0.4)));          // the shin light
        out.push(det(strokeD(t(legCol || sk, 3), 0.4, P('M', 0.6, kn + 0.3, 'Q', 1.6, kn - 0.4, 2.2, kn + 0.2), 0.4)));   // the knee
        out.push(det(strokeD(t(legCol || sk, 3), 0.35, P('M', -0.8, -3.4, 'Q', -0.2, -3.0, 0.4, -3.4), 0.4)));       // the ankle
      }
      if (!sandal) out.push(det([t(sc, 3), LC(0.9, -3.0, 0.28), 0.8]), det([t(sc, 3), LC(1.8, -2.7, 0.28), 0.8]), det([t(sc, 1), P('M', -2.5, -2.6, 'L', -1.7, -3.5, 'L', -1.2, -3.4, 'L', -2.0, -2.4, 'Z'), 0.85]),   // eyelets, the heel tab
        det(strokeD(t(sc, 3), 0.3, P('M', -2.2, -1.4, 'Q', 1.6, -1.1, 5.4, -0.9), 0.45)));                                                   // the welt's stitching
      if (near) out.push(det({ f: lower, op: 0.6, glow: 'rim', d: P('M', -2.0, Math.max(yT, kn - 0.9), 'Q', -2.9, -10.5, -1.3, ANK, 'L', -0.7, ANK, 'Q', -2.1, -10.5, -1.3, Math.max(yT, kn - 0.9), 'Z') }));   // the rim light down the calf (near tier)
      if (shorts) out.push(det([t(bc, 1), P('M', -tw / 2 + 0.1, shortLen - 1, 'L', tw / 2 - 0.4, shortLen - 1, 'L', tw / 2 - 0.4, shortLen, 'L', -tw / 2 + 0.1, shortLen, 'Z'), 0.7]),   // the turn-up
        det(strokeD(t(bc, 3), 0.4, P('M', 0.6, yT + 1, 'Q', 1.8, yT + 2.4, 2.2, yT + 4.4), 0.45)), det(strokeD(t(bc, 3), 0.35, P('M', -tw / 2 + 0.6, yT + 4.4, 'L', -0.8, yT + 4.2), 0.35)));   // the pocket, a fold
      return out;
    };
    legB.push(...leg(false)); legA.push(...leg(true));

    /* ---- held behind: a walking stick or a closed umbrella (far hand) ---- */
    if (o.hold === 'stick') { body.push(strokeD(t(o.holdCol || 'tan', 1), 1.1, P('M', 6.7, -32.6, 'L', 9.6, 0)), det(strokeD(t(o.holdCol || 'tan', 3), 1.3, P('M', 9.5, -0.4, 'L', 9.6, 0), 1))); }
    if (o.hold === 'brolly') { body.push([t(o.holdCol || 'navy', 1), P('M', 6.8, -30.6, 'L', 8.4, -30.4, 'L', 10.2, -5, 'L', 9.6, -4.8, 'Z')], strokeD(t('charcoal', 1), 0.6, P('M', 7.2, -31.4, 'L', 10.4, -1.2)), det(strokeD(t(o.holdCol || 'navy', 3), 0.35, P('M', 7.6, -29, 'L', 9.6, -8), 0.6))); }

    /* ---- a backpack (behind the torso) ---- */
    const bag = o.bag || null;
    if (bag && bag.kind === 'backpack') {
      const bx = xb - 3.4 - lean * 0.3, by0 = ys + 1.4, by1 = ys + 16.4;
      body.push([t(bag.col, 0), P('M', xb + 0.6, by0, 'Q', bx - 0.4, by0 - 0.4, bx, by0 + 3, 'L', bx - 0.4, by1 - 1.2, 'Q', bx, by1 + 0.4, xb + 0.4, by1, 'Z')]);
      body.push([t(bag.col, 1), P('M', bx + 0.2, by0 + 6, 'L', bx - 0.4, by1 - 1.4, 'Q', bx, by1 + 0.3, bx + 2.4, by1 + 0.1, 'L', bx + 2.3, by0 + 6.4, 'Z'), 0.8]);
      body.push(det(strokeD(t(bag.col, 3), 0.4, P('M', bx + 0.4, by0 + 5.6, 'Q', bx + 1.6, by0 + 6.2, xb + 0.2, by0 + 5.8), 0.6)));
      body.push(det(strokeD(t(bag.col, 2), 0.45, P('M', bx + 0.3, by0 + 3, 'Q', bx + 0.9, by0 + 0.9, xb, by0 + 0.6), 0.6)));
      body.push(det(strokeD(t(bag.col, 3), 0.5, P('M', bx + 0.8, by0 + 9, 'L', bx + 2.2, by0 + 9), 0.8)));
      if (bag.strip) body.push({ f: t('stone', 2), d: P('M', bx - 0.3, by1 - 4.4, 'L', bx + 1.6, by1 - 4.4, 'L', bx + 1.6, by1 - 3.4, 'L', bx - 0.35, by1 - 3.4, 'Z'), op: 0.8, glow: 'lamp' });
    }

    /* ---- long hair and a hood hanging down the back ---- */
    if (T.hood && !hoodUp) body.push([t(tc, 1), P('M', -2.4 + lean, ys - 0.6, 'Q', xb - 2.2, ys - 1, xb - 1.0, ys + 4.4, 'Q', xb + 0.8, ys + 3.4, 0, ys + 0.4, 'Z')]);

    /* ---- the arms: a pose per arm (the far arm behind the body, the near arm in front) ---- */
    const shoulder = near => [(near ? -0.6 : 0.1) + lean, ys + 1.9];
    // the IK poses' hand targets (the hand's centre, in the body's frame), [far, near]
    const TARGET = { run: [[7 + lean, ys + 6.4], [-3.6 + lean * 0.5, ys + 14.2]], hold: [[9.6, ys + 14], [9, ys + 14.5]],
      play: [[13, ys + 6], [4.2, ys + 14]], bars: [[12.6, ys + 10.2], [12.2, ys + 10.4]] };
    const armPts = (near, pose) => {
      const bk = Math.max(0, B.thigh - 6) * 0.6;   // a thick thigh swings further back: the hand stays clear of it
      const P0 = { fwd: [[1.4, ys + 11.2], [6.0, ys + 18.2], [6.6, ys + 19.4]], back: [[-3.6 + lean * 0.5, ys + 10.8], [-5.4 - bk, ys + 19.2], [-5.7 - bk, ys + 20.4]],
        phone: [[-0.6 + lean, ys + 10.4], [4.6, ys + 12.6], [5.5, ys + 12.4]], umbrella: [[0.4, ys + 9.6], [3.4, ys + 3.6], [3.8, ys + 2.6]] }[pose === 'forward' ? 'fwd' : pose];
      if (P0) return P0;
      const g = pose && pose.hand ? [pose.hand[0] - dx, pose.hand[1] - oy] : TARGET[pose][near ? 1 : 0];
      const [e, hd] = ik(shoulder(near), g, 9.4, 9.7, 1), fl = Math.hypot(hd[0] - e[0], hd[1] - e[1]) || 1;
      return [e, [hd[0] - (hd[0] - e[0]) / fl * 1.3, hd[1] - (hd[1] - e[1]) / fl * 1.3], hd];   // the wrist 1.3 short of the hand's centre
    };
    const arm = (near, pose) => {
      const k = near ? 0 : 1, sl = T.sleeve === 'short', sleeve = t(tc, k), skinC = t(sk, k), w = B.arm + T.g * 0.6;
      const [sx, sy] = shoulder(near);
      const [e, wr, hd] = armPts(near, pose), out = [];
      out.push(strokeD(sleeve, w, P('M', sx, sy, 'L', e[0], e[1])));
      out.push(strokeD(sl ? skinC : sleeve, w * (sl ? 0.78 : 0.9), P('M', e[0], e[1], 'L', wr[0], wr[1])));
      if (sl) out.push(strokeD(sleeve, w * 1.18, P('M', sx, sy, 'L', sx + (e[0] - sx) * 0.42, sy + (e[1] - sy) * 0.42)));
      const hc = o.gloves ? t(o.gloves, k) : skinC;
      out.push([hc, ell(X(hd[0]), Y(hd[1]), 1.25, 1.65)]);
      // fine pieces: an elbow crease, a cuff, a sleeve seam, the hand's shade
      out.push(det(strokeD(t(sl ? sk : tc, 3), 0.4, P('M', e[0] - 0.9, e[1] - 0.2, 'Q', e[0], e[1] + 0.6, e[0] + 0.8, e[1] - 0.3), 0.45)));
      if (!sl) out.push(det(strokeD(t(tc, T.rib ? 3 : 2), w * 0.92, P('M', wr[0] - (wr[0] - e[0]) * 0.1, wr[1] - (wr[1] - e[1]) * 0.1, 'L', wr[0], wr[1]), 0.55)));
      out.push(det(strokeD(t(tc, 3), 0.35, P('M', sx + 0.4, sy + 1, 'L', e[0] + 0.4, e[1] - 0.6), 0.3)));
      out.push(det([t(o.gloves || sk, 3), ell(X(hd[0] - 0.3), Y(hd[1] + 0.5), 0.7, 0.9), 0.35]));
      const fx = (e[0] + wr[0]) / 2, fy = (e[1] + wr[1]) / 2, gl = o.gloves || sk;
      out.push(det(strokeD(t(sl ? sk : tc, 2), 0.45, P('M', sx + 0.9, sy + 0.8, 'L', e[0] + 0.8, e[1] - 1), 0.4)));                  // the lit edge of the upper arm
      out.push(det(strokeD(t(sl ? sk : tc, 3), 0.35, P('M', fx - 0.9, fy - 0.2, 'Q', fx, fy + 0.5, fx + 0.8, fy - 0.1), 0.35)));       // a forearm fold
      out.push(det(strokeD(t(gl, 1), 0.5, P('M', hd[0] + 0.6, hd[1] - 0.9, 'Q', hd[0] + 1.4, hd[1] - 0.2, hd[0] + 0.9, hd[1] + 0.6), 0.7)));   // the thumb
      out.push(det(strokeD(t(gl, 3), 0.3, P('M', hd[0] - 0.8, hd[1] + 0.6, 'Q', hd[0], hd[1] + 1.3, hd[0] + 0.8, hd[1] + 0.7), 0.4)));      // the fingers' line
      if (sl) out.push(det(strokeD(t(tc, 3), 0.4, P('M', sx + (e[0] - sx) * 0.42 - w * 0.5, sy + (e[1] - sy) * 0.42, 'L', sx + (e[0] - sx) * 0.42 + w * 0.5, sy + (e[1] - sy) * 0.42 - 0.3), 0.55)));   // the sleeve hem
      out.push(det([t(tc, 3), P('M', sx - w * 0.5, sy - 0.4, 'Q', sx, sy + w * 0.8, sx + w * 0.5, sy - 0.2, 'Q', sx, sy + w * 0.3, sx - w * 0.5, sy - 0.4, 'Z'), 0.35]));   // the armhole's shadow
      out.push(det(strokeD(t(tc, 3), 0.35, P('M', sx + (e[0] - sx) * 0.3 - 0.8, sy + (e[1] - sy) * 0.3, 'Q', sx + (e[0] - sx) * 0.34, sy + (e[1] - sy) * 0.34 + 0.6, sx + (e[0] - sx) * 0.3 + 0.8, sy + (e[1] - sy) * 0.3 - 0.2), 0.35)));   // a fold on the upper sleeve
      if (sl) out.push(det(strokeD(t(sk, 3), 0.6, P('M', e[0] - 0.4, e[1] + 0.8, 'L', wr[0] - 0.6, wr[1] + 0.2), 0.25)));   // the bare forearm's shade
      if (!near && sl) out.push(det(strokeD(t('mustard', 2), 0.45, P('M', wr[0] - 0.8, wr[1] - 0.3, 'L', wr[0] + 0.7, wr[1] + 0.3), 0.8)));   // a bracelet on the bare far wrist
      if (near) out.push(det(strokeD(t(o.gloves ? o.gloves : 'charcoal', o.gloves ? 3 : 0), 0.55, P('M', wr[0] - 0.8, wr[1] - 0.3, 'L', wr[0] + 0.7, wr[1] + 0.3), 0.85)));   // a watch strap or the glove's cuff
      hands[near ? 'near' : 'far'] = [X(hd[0]), Y(hd[1])];
      return out;
    };
    const holdPose = o.hold === 'phone' ? 'phone' : o.hold === 'umbrella' ? 'umbrella' : 'back';
    const PAIRS = { walk: ['forward', holdPose], forward: ['forward', 'forward'], back: ['back', 'back'], run: ['run', 'run'], hold: ['forward', 'hold'],
      play: ['play', 'play'], bars: ['bars', 'bars'], phone: ['forward', 'phone'], umbrella: ['forward', 'umbrella'], none: ['none', 'none'] };
    const ar = o.arms || 'walk', pair = typeof ar === 'string' ? PAIRS[ar] || PAIRS.walk : [ar.far || 'forward', ar.near || holdPose];
    const at = { farArm: [body.length, body.length], nearArm: null };
    if (pair[0] !== 'none') { body.push(...arm(false, pair[0])); at.farArm[1] = body.length; }

    /* ---- the trouser seat (hidden under a long top), or a skirt ---- */
    if (!skirt && !T.long) {
      body.push([t(bc, 0), P('M', xb + T.g + 0.1, -33.6, 'L', d / 2 - 0.8 + belly * 0.5, -33.6, 'Q', d / 2 - 0.2 + belly * 0.3, -29.6, 2.6, SEAT, 'L', -2.4, SEAT, 'Q', xb + T.g - 0.5, -29.2, xb + T.g + 0.1, -33.6, 'Z')]);
      body.push(det(strokeD(t(bc, 3), 0.4, P('M', xb + T.g + 0.3, -32.2, 'Q', -2.6, -31.6, -1.8, -29.2), 0.4)));        // the back pocket
    } else if (skirt) {
      const sh2 = skirtHem, flare = bot.len === 'midi' ? 3.2 : 2.2, sq = Math.min(-27, sh2 - 0.6);   // sq: the sides' curve (above a seated hem)
      body.push([t(bc, 0), P('M', xb + T.g, -35.6, 'L', d / 2 - 0.6 + belly * 0.5, -35.6, 'Q', d / 2 + 0.6, sq, d / 2 + flare, sh2, 'Q', 0, sh2 + 0.9, xb - flare + 0.6, sh2, 'Q', xb - 0.6, sq, xb + T.g, -35.6, 'Z')]);
      body.push([t(bc, 1), P('M', xb + T.g, -35.6, 'L', -1.4, -35.6, 'L', -2.6, sh2 + 0.5, 'Q', xb - flare + 2, sh2 + 0.6, xb - flare + 0.6, sh2, 'Q', xb - 0.6, sq, xb + T.g, -35.6, 'Z'), 0.6]);
      body.push(det(strokeD(t(bc, 3), 0.4, P('M', 2.4, -32.6, 'L', 3.8, sh2 - 0.2), 0.3)), det(strokeD(t(bc, 3), 0.4, P('M', -3.0, -32.4, 'L', -4.4, sh2 + 0.3), 0.3)), det(strokeD(t(bc, 2), 0.7, P('M', xb + T.g + 0.3, -34.9, 'L', d / 2 - 0.8 + belly * 0.5, -34.9), 0.4)));   // pleats, the waistband
      body.push(det(strokeD(t(bc, 3), 0.4, P('M', 0.6, -33, 'L', 1.4, sh2), 0.35)), det(strokeD(t(bc, 3), 0.4, P('M', -1.6, -32, 'L', -2.4, sh2 + 0.4), 0.3)), det(strokeD(t(bc, 2), 0.45, P('M', xb - flare + 1, sh2 - 0.4, 'Q', 0, sh2 + 0.5, d / 2 + flare - 0.4, sh2 - 0.4), 0.5)));
      body.push(det(strokeD(t(bc, 3), 0.4, P('M', 0.8, -33.4, 'Q', 2.2, -32.4, 2.6, -30.4), 0.45)), det(strokeD(t(bc, 2), 0.3, P('M', xb - flare + 1.2, sh2 - 1.2, 'Q', 0, sh2 - 0.4, d / 2 + flare - 0.6, sh2 - 1.2), 0.4)));   // a pocket, the hem's stitching
    }

    /* ---- the neck and the torso (the top garment's outline), its shade and its fine pieces ---- */
    body.push([t(sk, 1), P('M', hxc - 2.3, hyc + 2.2, 'L', hxc + 0.6, hyc + 3.4, 'L', 1.6 + lean, ys + 0.6, 'L', -1.8 + lean, ys + 0.6, 'Z')]);
    const hem = bent && T.long ? SEAT - 0.2 : T.hem, fl = T.fl, bel = belly + (T.g > 0.6 ? 0.2 : 0);
    const torso = P('M', -1.6 + lean, ys - 0.5,
      'Q', xb - 0.4 + lean, ys - 0.7, xb + lean * 0.6, ys + 4.2,
      'Q', xb + 1.1, -38.5, xb + 0.1 - fl * 0.3, -32.6,
      'L', xb - fl, hem,
      'Q', 0, hem + 0.8, xf + fl * 0.7 + bel * 0.3, hem,
      'L', xf - 0.4 + bel, -36.5,
      'Q', xf + 0.8 + bel * 0.4 + lean, -43.5, xf - 0.2 + lean, ys + 1.8,
      'Q', xf - 1.0 + lean, ys - 0.3, 1.5 + lean, ys - 0.3, 'Z');
    body.push([t(tc, 0), torso]);
    if (T.open) body.push([t(top.col2 || 'white', 0), P('M', 1.6 + lean, ys + 0.2, 'Q', xf - 0.6 + lean, ys + 2.4, xf + 0.2 + bel * 0.4 + lean * 0.5, -41, 'L', xf - 0.4 + bel, -36.5, 'L', xf - 0.6 + bel * 0.5, hem + 0.2, 'L', xf - 2.6 + bel * 0.5, hem + 0.2, 'Q', xf - 2.2, -40, 1.6 + lean, ys + 0.2, 'Z')]);
    // the form shade down the back and a lit chest (lit chest: fine)
    body.push([t(tc, 1), P('M', -1.6 + lean, ys - 0.5, 'Q', xb - 0.4 + lean, ys - 0.7, xb + lean * 0.6, ys + 4.2, 'Q', xb + 1.1, -38.5, xb + 0.1 - fl * 0.3, -32.6, 'L', xb - fl, hem, 'L', xb - fl + 2.6, hem + 0.3, 'Q', xb + 2.6, -39, xb + 2.4 + lean * 0.6, ys + 3, 'Z'), 0.7]);
    body.push(det([t(tc, 2), P('M', xf - 2.4 + lean, ys + 2.6, 'Q', xf - 0.6 + lean, ys + 4, xf - 0.4 + bel * 0.5 + lean * 0.5, -41.5, 'Q', xf - 1.8, -42.4, xf - 2.4 + lean, ys + 2.6, 'Z'), 0.5]));
    // seams, folds, hem, pockets, the opening (zip, buttons or the open front), a collar
    body.push(det(strokeD(t(tc, 3), 0.4, P('M', -0.6 + lean, ys + 0.6, 'Q', -0.2, -42, -0.6, hem + 0.6), 0.35)));                       // the side seam
    body.push(det(strokeD(t(tc, 3), 0.4, P('M', xb + 0.8 + lean * 0.6, ys + 2.4, 'Q', -1.2 + lean, ys + 1.2, 0.6 + lean, ys + 0.4), 0.4)));   // the shoulder seam
    body.push(det(strokeD(t(tc, 3), 0.45, P('M', xb + 0.9, -39.6, 'Q', xb + 2.4, -39.2, xb + 3.4, -40.4), 0.4)));                       // folds at the small of the back
    body.push(det(strokeD(t(tc, 3), 0.4, P('M', xb + 0.7, -36.6, 'Q', xb + 2.2, -36.2, xb + 3.2, -37.2), 0.35)));
    body.push(det(strokeD(t(tc, 3), 0.4, P('M', xf - 1.2 + bel, -38.6, 'Q', xf - 2.6, -38.2, xf - 3.6, -39.4), 0.35)));                  // a fold at the waist front
    body.push(det(strokeD(t(tc, 3), 0.4, P('M', 1.2 + lean, ys + 5, 'Q', 2.6 + lean, ys + 7.4, 2.2 + lean * 0.8, ys + 9.8), 0.35)));      // folds from the armpit
    body.push(det(strokeD(t(tc, 3), 0.4, P('M', xb + 1.2 + lean * 0.6, ys + 5, 'Q', xb + 2.2 + lean * 0.6, ys + 7.4, xb + 1.8 + lean * 0.5, ys + 9.8), 0.3)));   // the shoulder blade
    body.push(det(strokeD(t(tc, 2), 0.6, P('M', -1.4 + lean, ys - 0.2, 'Q', xb + 1 + lean, ys + 0.2, xb + 0.6 + lean * 0.6, ys + 3.4), 0.45)));   // the lit top of the shoulder
    body.push(det(strokeD(t(tc, 2), 0.3, P('M', xb - fl + 0.4, hem - 1.3, 'Q', 0, hem - 0.6, xf + fl * 0.7 + bel * 0.3 - 0.4, hem - 1.3), 0.4)));   // the hem's stitching
    if (T.sleeve === 'short' || T.kind === 'jumper') body.push(det(strokeD(t(tc, 3), 0.55, P('M', -1.5 + lean, ys - 0.2, 'Q', 0.2 + lean, ys + 1.2, 1.7 + lean, ys + 0.1), 0.6)));   // the neckline
    body.push(det(strokeD(t(tc, T.rib ? 3 : 2), T.rib ? 1.1 : 0.5, P('M', xb - fl + 0.3, hem - 0.4, 'Q', 0, hem + 0.3, xf + fl * 0.7 + bel * 0.3 - 0.3, hem - 0.4), T.rib ? 0.5 : 0.45)));   // the hem band
    if (T.zip) body.push(det(strokeD(t(tc, 3), 0.45, P('M', xf - 0.6 + lean, ys + 1.6, 'Q', xf + 0.2 + bel * 0.4, -41, xf - 0.5 + bel, hem + 0.4), 0.6)), det([t('grey', 2), rect(X(xf - 0.9 + lean * 0.7), Y(ys + 4.4), 0.7, 1.4), 0.9]));
    if (T.buttons) for (let i = 0; i < 4; i++) { const by = ys + 4 + i * 4.6; body.push(det([t(tc, 3), circ(X(xf - 1.1 + (i < 2 ? lean * 0.5 : bel * 0.6)), Y(by), 0.45), 0.9])); }
    if (T.collar) body.push(det([t(tc, T.kind === 'shirt' ? 0 : 1), P('M', -1.8 + lean, ys - 0.8, 'Q', 0.6 + lean, ys - 1.8, 2.4 + lean, ys + 0.2, 'L', 1.6 + lean, ys + 2.6, 'Q', 0.2 + lean, ys + 0.6, -1.8 + lean, ys + 0.6, 'Z')]), det(strokeD(t(tc, 3), 0.35, P('M', -1.6 + lean, ys + 0.4, 'Q', 0.4 + lean, ys + 0.2, 1.7 + lean, ys + 2.4), 0.5)));
    if (T.kind === 'blouse') body.push(det([t('cream', 1), circ(X(0.2 + lean), Y(ys + 1.4), 0.32) + circ(X(1.0 + lean), Y(ys + 1.9), 0.32) + circ(X(1.8 + lean), Y(ys + 1.7), 0.32), 0.9]));   // a bead necklace
    if (T.kind === 'shirt' || T.kind === 'blouse') {   // the placket and its buttons
      body.push(det(strokeD(t(tc, 3), 0.4, P('M', xf - 0.9 + lean, ys + 1.2, 'Q', xf - 0.2 + bel * 0.4, -41, xf - 0.9 + bel, hem + 0.4), 0.45)));
      for (let i = 0; i < 3; i++) body.push(det([t(tc, 3), circ(X(xf - 1.3 + (i ? bel * 0.5 : lean * 0.6)), Y(ys + 3.4 + i * 5.4), 0.35), 0.8]));
    }
    if (T.long || T.kind === 'jacket') body.push(det(strokeD(t(tc, 3), 0.45, P('M', 0.4, -34.2, 'L', 3.4, -34.6, 'L', 3.0, -31.6), 0.5)));   // a hip pocket (a hoodie has its pocket below)
    if (T.kind === 'jacket' || T.kind === 'shirt') body.push(det(strokeD(t(tc, 3), 0.4, P('M', 2.0 + lean, ys + 5.4, 'L', 3.5 + lean, ys + 5.2), 0.45)));          // a chest pocket (clear of the armpit fold)
    if (T.quilt) for (let i = 1; i <= 4; i++) { const qy = ys + i * 5.2; body.push(det(strokeD(t(tc, 3), 0.4, P('M', xb + 0.3, qy, 'Q', 0, qy + 0.8, xf + bel * 0.3, qy - 0.2), 0.4))); }
    if (T.long) body.push(det(strokeD(t(tc, 3), 0.4, P('M', xb - fl + 1.6, hem + 0.2, 'L', xb + 1.6, -30), 0.4)), det(strokeD(t(tc, 3), 0.45, P('M', 2.4, hem + 0.4, 'Q', 2.8, -26, 1.8, -31), 0.35)));   // the back vent and a front fold
    if (T.kind === 'coat' && top.belt) body.push(det([t(tc, 1), P('M', xb + 0.2, -37.8, 'L', xf + bel - 0.3, -37.8, 'L', xf + bel - 0.3, -36.6, 'L', xb + 0.2, -36.6, 'Z')]), det([t('mustard', 1), rect(X(xf - 1.7 + bel), Y(-38.1), 1.3, 1.8), 0.9]));
    if (T.kind === 'hoodie') body.push(det(strokeD(t(tc, 3), 0.45, P('M', 0, -36.2, 'L', 3.6, -36.4, 'L', 3.4, -32.8, 'L', 0.2, -32.6), 0.5)), det(strokeD(t('white', 1), 0.35, P('M', 2.4 + lean, ys + 0.6, 'L', 2.6 + lean, ys + 6.6), 0.7)));   // the pocket, a drawstring
    const sty = bent && T.long ? hem - 2.4 : -27.6;   // a reflective strip round the coat (above a seated lap)
    if (top.strip) body.push({ f: t('stone', 2), d: P('M', xb - fl + 0.2, sty, 'L', xf + fl * 0.6 + bel * 0.3, sty, 'L', xf + fl * 0.6 + bel * 0.3, sty + 1, 'L', xb - fl + 0.2, sty + 1, 'Z'), op: 0.7, glow: 'lamp' });

    /* ---- hair behind the head (long, pony), the head, hair, a hat or the hood ---- */
    const hx0 = hxc, hy = hyc, hc = t(hr, 0), hd2 = t(hr, 1), hl = t(hr, 2);
    if (!hoodUp && (hair.style === 'long')) body.push([hd2, P('M', hx0 - 1.6, hy - 2, 'Q', hx0 - rx - 1.6, hy + 2, hx0 - rx - 0.9, ys + 6.2, 'Q', hx0 - 2.6, ys + 7, hx0 - 1.2, ys + 1.6, 'Q', hx0 + 0.2, hy + 3, hx0 + 0.6, hy - 1, 'Z')]);
    if (!hoodUp && hair.style === 'pony') body.push([hc, P('M', hx0 - rx + 0.6, hy - 2.6, 'Q', hx0 - rx - 3.6, hy - 1.6, hx0 - rx - 2.4, hy + 5.8, 'Q', hx0 - rx - 1.2, hy + 3, hx0 - rx + 0.8, hy - 0.6, 'Z')], det(strokeD(hl, 0.4, P('M', hx0 - rx - 0.8, hy - 1.8, 'Q', hx0 - rx - 2.6, hy + 0.4, hx0 - rx - 2.2, hy + 4.4), 0.6)), det([t('red', 0), ell(X(hx0 - rx + 0.2), Y(hy - 2.2), 0.7, 0.9)]));
    if (!hoodUp && hair.style === 'bun') body.push([hc, ell(X(hx0 - rx * 0.62), Y(hy - ry * 0.92), 1.9, 1.7)], det(strokeD(hl, 0.4, P('M', hx0 - rx * 0.62 - 1.2, hy - ry * 0.92 - 0.4, 'Q', hx0 - rx * 0.62, hy - ry * 0.92 - 1.5, hx0 - rx * 0.62 + 1.2, hy - ry * 0.92 - 0.2), 0.6)));
    if (hoodUp) body.push([t(tc, 1), P('M', hx0 + rx * 0.62, hy - ry * 1.08, 'C', hx0 - rx - 2.6, hy - ry * 1.7, hx0 - rx - 3.4, hy + ry, hx0 - 1.6, ys + 1.2, 'L', hx0 + 1.6, ys + 1, 'L', hx0 + rx * 0.5, hy + ry * 0.7, 'Q', hx0 + rx * 0.55, hy - 0.4, hx0 + rx * 0.62, hy - ry * 1.08, 'Z')]);
    // the head: a plain egg (forehead, chin and nape, nothing on the face)
    body.push([t(sk, 0), P('M', hx0 - rx, hy - 0.3, 'C', hx0 - rx, hy - ry * 1.12, hx0 + rx * 0.92, hy - ry * 1.16, hx0 + rx * 0.96, hy - 0.5, 'C', hx0 + rx * 1.02, hy + ry * 0.36, hx0 + rx * 0.62, hy + ry * 0.96, hx0 + rx * 0.06, hy + ry * 0.94, 'C', hx0 - rx * 0.5, hy + ry * 0.92, hx0 - rx * 0.96, hy + ry * 0.56, hx0 - rx, hy - 0.3, 'Z')]);
    body.push(det(strokeD(t(sk, 3), 0.5, P('M', hx0 - 2.1, hy + 2.8, 'L', -1.6 + lean, ys - 0.2), 0.35)), det([t(sk, 3), P('M', hx0 - 1.6, hy + ry * 0.94, 'Q', hx0 + 0.4, hy + ry * 1.08, hx0 + 1.6, hy + ry * 0.9, 'L', hx0 + 0.9, hy + ry * 1.3, 'Q', hx0 - 0.4, hy + ry * 1.3, hx0 - 1.6, hy + ry * 0.94, 'Z'), 0.3]));   // the back of the neck, the shadow under the jaw
    body.push(det([t(sk, 1), P('M', hx0 - rx + 0.2, hy + 0.4, 'C', hx0 - rx * 0.9, hy + ry * 0.6, hx0 - rx * 0.4, hy + ry * 0.92, hx0 + rx * 0.06, hy + ry * 0.94, 'Q', hx0 - rx * 0.3, hy + ry * 0.4, hx0 - rx + 0.2, hy + 0.4, 'Z'), 0.55]));   // the jaw's shade, at the back
    const hatTop = hat && (hat.kind === 'beanie' || hat.kind === 'flatcap' || hat.kind === 'cap' || hat.kind === 'sunhat' || hat.kind === 'helmet');
    if (!hoodUp && hair.style !== 'bald') {
      const curly = hair.style === 'curly', crop = hair.style === 'crop', lift = curly ? 0.9 : crop ? -0.35 : 0.3;
      const back = hair.style === 'long' || hair.style === 'pony' || hair.style === 'bun' ? ry * 0.7 : ry * 0.42;
      body.push([hc, curly
        ? P('M', hx0 - rx - 0.6, hy + back, 'Q', hx0 - rx - 1.9, hy - 0.4, hx0 - rx - 0.6, hy - ry * 0.8, 'Q', hx0 - rx * 0.6, hy - ry - 2.4, hx0, hy - ry - 1.4, 'Q', hx0 + rx * 0.8, hy - ry - 1.9, hx0 + rx + 0.5, hy - ry * 0.45, 'Q', hx0 + rx * 0.3, hy - ry * 0.7, hx0 - rx * 0.2, hy - ry * 0.2, 'Q', hx0 - rx * 0.62, hy + 0.4, hx0 - rx * 0.5, hy + back, 'Z')
        : P('M', hx0 - rx - 0.3, hy + back, 'C', hx0 - rx - 0.5 - lift, hy - ry * 1.3 - lift, hx0 + rx * 0.98, hy - ry * 1.36 - lift, hx0 + rx * 0.94, hy - ry * 0.4, 'Q', hx0 + rx * 0.3, hy - ry * 0.74, hx0 - rx * 0.16, hy - ry * 0.28, 'Q', hx0 - rx * 0.6, hy + 0.2, hx0 - rx * 0.56, hy + back, 'Z')]);
      // hair strands and a sheen (fine): over the crown and the back, never on the face (a hat hides them)
      if (!hatTop) for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.9; body.push(det(strokeD(i % 2 ? hd2 : hl, 0.35, P('M', hx0 + rx * 0.5 - i * 1.15, hy - ry * 1.05 + i * 0.25, 'Q', hx0 - rx * 0.4 - i * 0.6, hy - ry * 0.6 + a * 0.2, hx0 - rx * 0.8 - i * 0.2, hy + i * 0.5 - 0.6), i % 2 ? 0.55 : 0.45))); }
      if (!hatTop) body.push(det([hl, P('M', hx0 - rx * 0.4, hy - ry * 1.02, 'Q', hx0 + rx * 0.3, hy - ry * 1.2, hx0 + rx * 0.62, hy - ry * 0.8, 'Q', hx0, hy - ry * 0.95, hx0 - rx * 0.4, hy - ry * 1.02, 'Z'), 0.45]));
    }
    if (!hoodUp && hair.style === 'bald') body.push([hc, P('M', hx0 - rx - 0.3, hy + ry * 0.3, 'Q', hx0 - rx - 0.4, hy - ry * 0.6, hx0 - rx * 0.3, hy - ry * 0.55, 'Q', hx0 - rx * 0.62, hy - 0.2, hx0 - rx * 0.5, hy + ry * 0.4, 'Z')], det([t(sk, 2), ell(X(hx0 - 0.4), Y(hy - ry * 0.82), 1.6, 0.6), 0.5]));
    if (hoodUp) body.push([t(tc, 0), P('M', hx0 + rx * 0.62, hy - ry * 1.08, 'C', hx0 - rx - 1.8, hy - ry * 1.55, hx0 - rx - 2.4, hy + ry * 0.6, hx0 - 1.2, hy + ry + 0.8, 'L', hx0 + rx * 0.3, hy + ry * 0.75, 'Q', hx0 + rx * 0.2, hy - 0.4, hx0 + rx * 0.62, hy - ry * 1.08, 'Z')], det(strokeD(t(tc, 3), 0.55, P('M', hx0 + rx * 0.6, hy - ry * 1.02, 'Q', hx0 + rx * 0.1, hy - 0.4, hx0 + rx * 0.3, hy + ry * 0.75), 0.6)), det(strokeD(t(tc, 2), 0.4, P('M', hx0 - rx * 0.2, hy - ry * 1.2, 'Q', hx0 - rx - 1.6, hy - ry * 0.6, hx0 - rx - 1.2, hy + ry * 0.6), 0.5)));
    // the fur trim: a band along the hood's opening (on the hood, puffing just past its edge), never over the face
    if (hoodUp && T.kind === 'parka') body.push(det([t('stone', 1), P('M', hx0 + rx * 0.62 + 0.5, hy - ry * 1.08, 'Q', hx0 + rx * 0.1 + 0.5, hy - 0.4, hx0 + rx * 0.3 + 0.4, hy + ry * 0.75, 'L', hx0 + rx * 0.3 - 1.1, hy + ry * 0.8, 'Q', hx0 + rx * 0.1 - 1.2, hy - 0.4, hx0 + rx * 0.62 - 1.0, hy - ry * 1.12, 'Q', hx0 + rx * 0.62 - 0.2, hy - ry * 1.3, hx0 + rx * 0.62 + 0.5, hy - ry * 1.08, 'Z')]), det(strokeD(t('stone', 2), 0.4, P('M', hx0 + rx * 0.62 - 0.3, hy - ry * 0.95, 'Q', hx0 + rx * 0.1 - 0.3, hy - 0.3, hx0 + rx * 0.3 - 0.3, hy + ry * 0.6), 0.6)));
    if (hatTop && !hoodUp) {
      const hk = hat.kind, hcol = hat.col;
      body.push(det([t(sk, 3), P('M', hx0 - rx + 0.2, hy - ry * 0.5, 'Q', hx0, hy - ry * 0.62, hx0 + rx * 0.95, hy - ry * 0.45, 'L', hx0 + rx * 0.98, hy - ry * 0.2, 'Q', hx0, hy - ry * 0.32, hx0 - rx + 0.1, hy - ry * 0.12, 'Z'), 0.3]));   // the hat's shadow on the brow
      if (hk === 'beanie') {
        body.push([t(hcol, 0), P('M', hx0 - rx - 0.45, hy - 0.2, 'Q', hx0 - rx - 0.4, hy - ry * 1.5, hx0 + rx * 0.2, hy - ry * 1.42, 'Q', hx0 + rx + 0.5, hy - ry * 1.25, hx0 + rx + 0.35, hy - ry * 0.3, 'Z')]);
        body.push(det([t(hcol, 1), P('M', hx0 - rx - 0.5, hy - 0.2, 'L', hx0 + rx + 0.4, hy - ry * 0.3, 'L', hx0 + rx + 0.3, hy - ry * 0.62, 'L', hx0 - rx - 0.5, hy - ry * 0.42, 'Z')]));
        body.push(det(strokeD(t(hcol, 3), 0.35, P('M', hx0 - rx * 0.4, hy - ry * 0.62, 'L', hx0 - rx * 0.1, hy - ry * 1.3, 'M', hx0 + rx * 0.4, hy - ry * 0.55, 'L', hx0 + rx * 0.5, hy - ry * 1.2), 0.45)));
        if (hat.pom) body.push([t(hat.pom, 0), circ(X(hx0 - rx * 0.1), Y(hy - ry * 1.55), 1.35)], det(strokeD(t(hat.pom, 2), 0.35, P('M', hx0 - rx * 0.1 - 0.7, hy - ry * 1.62, 'Q', hx0 - rx * 0.1, hy - ry * 1.9, hx0 - rx * 0.1 + 0.6, hy - ry * 1.55), 0.6)));
      } else if (hk === 'flatcap') {
        body.push([t(hcol, 0), P('M', hx0 - rx - 0.35, hy - ry * 0.28, 'Q', hx0 - rx - 0.2, hy - ry * 1.3, hx0 + 0.4, hy - ry * 1.22, 'L', hx0 + rx + 2.4, hy - ry * 0.62, 'Q', hx0 + rx + 2.8, hy - ry * 0.32, hx0 + rx + 0.2, hy - ry * 0.3, 'Z')]);
        body.push(det(strokeD(t(hcol, 3), 0.4, P('M', hx0 + rx - 0.4, hy - ry * 0.36, 'Q', hx0 + 0.6, hy - ry * 1.06, hx0 - rx * 0.5, hy - ry * 1.1), 0.5)), det(strokeD(t(hcol, 2), 0.35, P('M', hx0 - rx * 0.6, hy - ry * 0.9, 'L', hx0 + rx * 0.6, hy - ry * 1.02), 0.45)));
      } else if (hk === 'cap') {
        body.push([t(hcol, 0), P('M', hx0 - rx - 0.3, hy - ry * 0.25, 'Q', hx0 - rx - 0.2, hy - ry * 1.42, hx0 + rx * 0.4, hy - ry * 1.26, 'Q', hx0 + rx + 0.3, hy - ry * 1.0, hx0 + rx + 0.2, hy - ry * 0.45, 'L', hx0 + rx + 3.4, hy - ry * 0.5, 'Q', hx0 + rx + 3.2, hy - ry * 0.25, hx0 + rx, hy - ry * 0.2, 'Z')]);
        body.push(det(strokeD(t(hcol, 3), 0.4, P('M', hx0 + rx * 0.2, hy - ry * 1.25, 'Q', hx0 - rx * 0.2, hy - ry * 0.8, hx0 - rx * 0.1, hy - ry * 0.32), 0.45)), det([t(hcol, 3), circ(X(hx0 - rx * 0.1), Y(hy - ry * 1.3), 0.45)]),
          det([t(hcol, 3), circ(X(hx0 - rx * 0.55), Y(hy - ry * 0.95), 0.3), 0.7]), det(strokeD(t(hcol, 1), 0.6, P('M', hx0 - rx - 0.2, hy - ry * 0.3, 'L', hx0 - rx + 0.8, hy - ry * 0.6), 0.8)));   // a vent, the back strap
      } else if (hk === 'sunhat') {
        body.push([t(hcol, 1), P('M', hx0 - rx - 3.2, hy - ry * 0.48, 'Q', hx0, hy - ry * 0.95, hx0 + rx + 3.4, hy - ry * 0.6, 'Q', hx0 + rx + 3.6, hy - ry * 0.36, hx0 + rx + 2.6, hy - ry * 0.3, 'Q', hx0, hy - ry * 0.65, hx0 - rx - 2.8, hy - ry * 0.22, 'Z')]);
        body.push([t(hcol, 0), P('M', hx0 - rx * 0.86, hy - ry * 0.66, 'Q', hx0 - rx * 0.8, hy - ry * 1.62, hx0 + rx * 0.2, hy - ry * 1.56, 'Q', hx0 + rx * 0.95, hy - ry * 1.46, hx0 + rx * 0.9, hy - ry * 0.74, 'Z')]);
        body.push(det([t(hat.band || 'navy', 1), P('M', hx0 - rx * 0.9, hy - ry * 0.8, 'Q', hx0 - rx - 1.4, hy - ry * 0.4, hx0 - rx - 1.2, hy + 0.6, 'L', hx0 - rx - 0.6, hy + 0.4, 'Q', hx0 - rx - 0.6, hy - ry * 0.4, hx0 - rx * 0.7, hy - ry * 0.74, 'Z'), 0.9]));   // the ribbon's tail at the back
        body.push(det([t(hat.band || 'navy', 0), P('M', hx0 - rx * 0.86, hy - ry * 0.66, 'L', hx0 + rx * 0.9, hy - ry * 0.74, 'L', hx0 + rx * 0.92, hy - ry * 0.98, 'L', hx0 - rx * 0.86, hy - ry * 0.92, 'Z')]), det(strokeD(t(hcol, 3), 0.35, P('M', hx0 - rx - 2.4, hy - ry * 0.4, 'Q', hx0, hy - ry * 0.82, hx0 + rx + 2.6, hy - ry * 0.48), 0.4)));
      } else if (hk === 'helmet') {
        // a bike helmet: a shell longer than the head with a tail at the back, a short peak, vents, a strap at the back of the jaw
        body.push([t(hcol, 0), P('M', hx0 - rx - 1.6, hy - ry * 0.2, 'Q', hx0 - rx - 1.4, hy - ry * 1.45, hx0 - 0.2, hy - ry * 1.55, 'Q', hx0 + rx + 0.7, hy - ry * 1.45, hx0 + rx + 1.2, hy - ry * 0.55, 'L', hx0 + rx + 0.3, hy - ry * 0.4, 'Q', hx0, hy - ry * 0.66, hx0 - rx - 0.3, hy - ry * 0.05, 'Z')]);
        body.push([t(hcol, 1), P('M', hx0 - rx - 1.6, hy - ry * 0.2, 'Q', hx0, hy - ry * 0.95, hx0 + rx + 1.2, hy - ry * 0.55, 'L', hx0 + rx + 0.3, hy - ry * 0.4, 'Q', hx0, hy - ry * 0.66, hx0 - rx - 0.3, hy - ry * 0.05, 'Z')]);   // the shell's lower band
        body.push(det([t(hcol, 3), P('M', hx0 + rx * 0.6, hy - ry * 0.62, 'L', hx0 + rx + 1.9, hy - ry * 0.5, 'L', hx0 + rx + 1.2, hy - ry * 0.36, 'Z'), 0.9]));   // the peak
        body.push(det(strokeD(t('ink', 0), 0.55, P('M', hx0 - rx * 0.7, hy - ry * 1.18, 'L', hx0 - rx * 0.2, hy - ry * 1.36, 'M', hx0 + rx * 0.1, hy - ry * 1.4, 'L', hx0 + rx * 0.6, hy - ry * 1.3, 'M', hx0 - rx - 0.4, hy - ry * 0.8, 'L', hx0 - rx * 0.6, hy - ry * 1.0), 0.6)));   // vents
        body.push(det([t(hcol, 2), P('M', hx0 - rx * 0.6, hy - ry * 1.3, 'Q', hx0 + rx * 0.3, hy - ry * 1.55, hx0 + rx * 0.9, hy - ry * 1.05, 'Q', hx0 + rx * 0.2, hy - ry * 1.3, hx0 - rx * 0.6, hy - ry * 1.3, 'Z'), 0.5]));   // the lit crown
        body.push(det(strokeD(t('charcoal', 0), 0.4, P('M', hx0 - rx * 0.35, hy - ry * 0.3, 'L', hx0 - rx * 0.05, hy + ry * 0.6, 'L', hx0 + rx * 0.4, hy + ry * 1.0), 0.8)));   // the strap, behind the cheek
        if (hat.strip) body.push({ f: t('red', 2), d: P('M', hx0 - rx - 1.6, hy - ry * 0.55, 'L', hx0 - rx - 1.1, hy - ry * 0.6, 'L', hx0 - rx - 0.9, hy - ry * 0.25, 'L', hx0 - rx - 1.5, hy - ry * 0.22, 'Z'), op: 0.8, glow: 'lamp' });   // a reflector at the back
      }
    }

    /* ---- a scarf: the wrap at the neck and a hanging end down the front ---- */
    if (o.scarf) {
      const c0 = o.scarf.col, c1 = o.scarf.col2 || c0;
      body.push([t(c0, 0), P('M', -2.6 + lean, ys - 1.4, 'Q', 0.4 + lean, ys - 2.6, 2.8 + lean, ys - 0.6, 'L', 2.6 + lean, ys + 1.6, 'Q', 0 + lean, ys + 0.8, -2.8 + lean, ys + 1.4, 'Z')]);
      body.push([t(c0, 1), P('M', 1.0 + lean, ys + 0.4, 'L', 3.0 + lean, ys + 0.6, 'L', 3.2 + lean * 0.8, ys + 9.6, 'L', 1.2 + lean * 0.8, ys + 9.4, 'Z')]);
      body.push(det(strokeD(t(c1, c1 === c0 ? 2 : 0), 0.7, P('M', 1.1 + lean * 0.8, ys + 5.8, 'L', 3.1 + lean * 0.8, ys + 6, 'M', 1.15 + lean * 0.8, ys + 7.6, 'L', 3.15 + lean * 0.8, ys + 7.8), 0.8)));
      body.push(det(strokeD(t(c0, 1), 0.35, P('M', 1.4 + lean * 0.8, ys + 9.4, 'L', 1.3 + lean * 0.8, ys + 10.6, 'M', 2.0 + lean * 0.8, ys + 9.5, 'L', 2.0 + lean * 0.8, ys + 10.7, 'M', 2.6 + lean * 0.8, ys + 9.5, 'L', 2.7 + lean * 0.8, ys + 10.6), 0.9)));
      body.push(det(strokeD(t(c0, 3), 0.35, P('M', -1.6 + lean, ys - 1.2, 'Q', 0.4 + lean, ys - 0.6, 2.4 + lean, ys + 0.6), 0.45)));
    }

    /* ---- a crossbody or shoulder bag at the near hip (above the legs' tops) ---- */
    if (bag && bag.kind !== 'backpack') {
      const cross = bag.kind === 'crossbody', bx0 = cross ? -1.6 : -0.6, bx1 = cross ? 3.0 : 3.8, by0 = cross ? -35.6 : -38.6, by1 = cross ? -30.6 : -31.4;
      body.push(det(strokeD(t(bag.col, 3), 0.65, cross ? P('M', xf - 0.6 + lean, ys + 1.6, 'Q', 1, -41, bx0 + 0.4, by0 + 0.2) : P('M', -0.2 + lean, ys + 0.4, 'Q', -1.4, -43, bx0 + 0.6, by0 + 0.2), 0.95)));
      body.push([t(bag.col, 0), P('M', bx0, by0, 'L', bx1, by0, 'Q', bx1 + 0.4, by1 - 1, bx1 - 0.2, by1, 'L', bx0 + 0.2, by1, 'Q', bx0 - 0.4, by1 - 1, bx0, by0, 'Z')]);
      body.push(det([t(bag.col, 1), P('M', bx0, by0, 'L', bx1, by0, 'L', bx1 + 0.1, by0 + 2.2, 'Q', (bx0 + bx1) / 2, by0 + 2.8, bx0 - 0.1, by0 + 2.2, 'Z')]));
      body.push(det([t('mustard', 2), rect(X((bx0 + bx1) / 2 - 0.4), Y(by0 + 2), 0.8, 0.7), 0.9]));
      body.push(det(strokeD(t(bag.col, 3), 0.3, P('M', bx0 + 0.5, by1 - 0.5, 'L', bx1 - 0.5, by1 - 0.5), 0.5)));
      body.push(det([t(bag.col, 3), P('M', bx1 - 1.4, by0 + 2.4, 'L', bx1, by0 + 2.2, 'Q', bx1 + 0.4, by1 - 1, bx1 - 0.2, by1, 'L', bx1 - 1.2, by1, 'Z'), 0.4]));
      if (bag.strip) body.push({ f: t('stone', 2), d: P('M', bx0 + 0.2, by1 - 1.6, 'L', bx1 - 0.1, by1 - 1.6, 'L', bx1 - 0.1, by1 - 1, 'L', bx0 + 0.2, by1 - 1, 'Z'), op: 0.7, glow: 'lamp' });
    }
    if (bag && bag.kind === 'backpack') body.push(det(strokeD(t(bag.col, 1), 0.9, P('M', -0.6 + lean, ys + 0.4, 'Q', xf - 0.4 + lean, ys + 4, xf - 1.2 + bel * 0.4, -38.4), 0.95)), det([t('grey', 2), rect(X(xf - 1.8 + lean * 0.7), Y(ys + 6.2), 1.1, 0.8)]));

    /* ---- the near arm (swung back, or raised for the phone or an open umbrella) ---- */
    at.nearArm = [body.length, body.length];
    if (pair[1] !== 'none') { body.push(...arm(true, pair[1])); at.nearArm[1] = body.length; }
    const nh = hands.near && [hands.near[0], hands.near[1] - oy];   // the near hand in the body's (undropped) frame
    if (o.hold === 'phone' && nh) { const [px, py] = nh; body.push([t('charcoal', 0), P('M', px - dx - 0.2, py - 2.6, 'L', px - dx + 1.4, py - 2.4, 'L', px - dx + 1.0, py + 0.6, 'L', px - dx - 0.6, py + 0.4, 'Z')], { f: t('sky', 2), d: P('M', px - dx + 0.05, py - 2.2, 'L', px - dx + 1.1, py - 2.05, 'L', px - dx + 0.8, py + 0.2, 'L', px - dx - 0.3, py + 0.05, 'Z'), op: 0.6, glow: 'screen' }); }
    if (o.hold === 'umbrella' && nh) {
      const [ux, uy] = nh, c = o.holdCol || 'navy', ax = ux - dx - 1.2, ay = H0 - 5.8, R = 12.4;
      body.push(strokeD(t('charcoal', 0), 0.55, P('M', ux - dx, uy + 1.4, 'L', ax, ay)));
      body.push([t(c, 0), P('M', ax - R, ay + 6.6, 'Q', ax - R + 1, ay - 2.4, ax, ay - 2.8, 'Q', ax + R - 1, ay - 2.4, ax + R, ay + 6.6, 'Q', ax + R * 0.75, ay + 5.4, ax + R * 0.5, ay + 6.4, 'Q', ax + R * 0.25, ay + 5.2, ax, ay + 6.2, 'Q', ax - R * 0.25, ay + 5.2, ax - R * 0.5, ay + 6.4, 'Q', ax - R * 0.75, ay + 5.4, ax - R, ay + 6.6, 'Z')]);
      body.push([t(c, 1), P('M', ax - R, ay + 6.6, 'Q', ax - R + 1, ay - 2.4, ax, ay - 2.8, 'Q', ax - R * 0.4, ay - 1, ax - R * 0.5, ay + 6.4, 'Q', ax - R * 0.75, ay + 5.4, ax - R, ay + 6.6, 'Z'), 0.75]);
      body.push(det(strokeD(t(c, 3), 0.4, P('M', ax, ay - 2.8, 'L', ax - R * 0.5, ay + 6.4, 'M', ax, ay - 2.8, 'L', ax, ay + 6.2, 'M', ax, ay - 2.8, 'L', ax + R * 0.5, ay + 6.4), 0.5)));
      body.push(det(strokeD(t(c, 2), 0.45, P('M', ax - R * 0.4, ay - 1.4, 'Q', ax + R * 0.2, ay - 3, ax + R * 0.8, ay + 1), 0.5)));
      body.push(det(strokeD(t('charcoal', 0), 0.6, P('M', ax, ay - 2.8, 'L', ax, ay - 4.2), 1)));
      body.push(det(strokeD(t('tan', 1), 0.8, P('M', ux - dx + 0.2, uy + 1.2, 'Q', ux - dx + 0.4, uy + 2.8, ux - dx - 0.8, uy + 2.6), 1)));
      body.push({ f: t(c, 2), d: P('M', ax - R + 0.4, ay + 6.2, 'Q', ax - R * 0.75, ay + 5, ax - R * 0.5, ay + 6, 'Q', ax - R * 0.25, ay + 4.8, ax, ay + 5.8, 'L', ax, ay + 6.2, 'Q', ax - R * 0.25, ay + 5.2, ax - R * 0.5, ay + 6.4, 'Q', ax - R * 0.75, ay + 5.4, ax - R + 0.4, ay + 6.2, 'Z'), op: 0.5, glow: 'lamp' });
    }

    /* ---- the night rim light: a thin cool edge along the back of the head, the shoulders and the back ---- */
    const rimTop = hatTop && !hoodUp ? (hat.kind === 'sunhat' ? hy - ry * 0.5 : hy - ry * 1.2) : hy - ry * 1.05;
    const rimX = hoodUp ? -2.9 : hatTop && hat.kind === 'sunhat' ? -1.0 : -0.9;
    // (by day each edge takes the colour under it, so it is unseen; at night it lights in the rim colour)
    body.push({ f: t(hoodUp ? tc : (hatTop ? hat.col : hr), 0), op: 0.6, glow: 'rim',
      d: P('M', hx0 - rx * 0.5, rimTop, 'Q', hx0 - rx + rimX - 0.5, hy - ry * 0.6, hx0 - rx + rimX, hy + ry * 0.4, 'Q', hx0 - rx + rimX + 0.5, hy - ry * 0.4, hx0 - rx * 0.4, rimTop + 0.4, 'Z') });
    body.push({ f: t(tc, 0), op: 0.6, glow: 'rim',
      d: P('M', -1.6 + lean, ys - 0.5, 'Q', xb - 0.4 + lean, ys - 0.7, xb + lean * 0.6, ys + 4.2, 'Q', xb + 1.1, -38.5, xb + 0.1 - fl * 0.3, -32.6, 'L', xb + 1.1 - fl * 0.3, -32.8, 'Q', xb + 2.1, -38.5, xb + 1.1 + lean * 0.6, ys + 4.2, 'Q', xb + 0.5 + lean, ys + 0.6, -1.6 + lean, ys - 0.5, 'Z') });

    const sh0 = shoulder(false), sh1 = shoulder(true);
    return { legB, body, legA, hip: Y(HIP), pivot: [X(0), Y(HIP)], head: { x: X(hx0), y: Y(hy), rx, ry }, hands, top: Y(H0),
      shoulders: { far: [X(sh0[0]), Y(sh0[1])], near: [X(sh1[0]), Y(sh1[1])] }, at, seat: bent && legPose !== 'run' ? [X(0), Y(SEAT)] : null, crank, pedals };
  }

  /* ---------- presets: 8 people, each with a wardrobe per season ---------- */
  const PRESETS = [
    { build: 'average', skin: 1, hair: { style: 'short', col: 1 },
      spring: { top: { kind: 'jacket', col: 'olive' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'crossbody', col: 'tan' } },
      summer: { top: { kind: 'tee', col: 'sky' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'crossbody', col: 'tan' } },
      autumn: { top: { kind: 'jacket', col: 'rust' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'mustard' }, bag: { kind: 'crossbody', col: 'tan', strip: 1 } },
      winter: { top: { kind: 'parka', col: 'navy' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'red', col2: 'cream' }, hat: { kind: 'beanie', col: 'red', pom: 'cream' }, gloves: 'charcoal', bag: { kind: 'crossbody', col: 'tan', strip: 1 } } },
    { build: 'slim', skin: 0, hair: { style: 'pony', col: 7 },
      spring: { top: { kind: 'coat', col: 'stone', belt: 1 }, bottom: { kind: 'skirt', col: 'navy' }, tights: 'charcoal', shoes: { kind: 'boot', col: 'black' }, bag: { kind: 'shoulder', col: 'burgundy' }, hold: 'brolly', holdCol: 'navy' },
      summer: { top: { kind: 'blouse', col: 'white' }, bottom: { kind: 'skirt', col: 'teal' }, shoes: { kind: 'sandal', col: 'tan' }, hat: { kind: 'sunhat', col: 'cream', band: 'teal' }, bag: { kind: 'shoulder', col: 'tan' } },
      autumn: { top: { kind: 'jumper', col: 'burgundy' }, bottom: { kind: 'skirt', col: 'charcoal' }, tights: 'black', shoes: { kind: 'boot', col: 'black' }, hold: 'umbrella', holdCol: 'navy' },
      winter: { top: { kind: 'coat', col: 'camel' }, bottom: { kind: 'skirt', col: 'charcoal' }, tights: 'black', shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'cream' }, hat: { kind: 'beanie', col: 'cream' }, gloves: 'burgundy', bag: { kind: 'shoulder', col: 'burgundy' } } },
    { build: 'stout', age: 'older', skin: 2, hair: { style: 'bald', col: 6 },
      spring: { top: { kind: 'cardigan', col: 'forest', col2: 'cream' }, bottom: { kind: 'trousers', col: 'grey' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'flatcap', col: 'tweed' }, hold: 'stick' },
      summer: { top: { kind: 'shirt', col: 'cream' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'flatcap', col: 'stone' }, hold: 'stick' },
      autumn: { top: { kind: 'jacket', col: 'olive' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'mustard', col2: 'rust' }, hold: 'stick' },
      winter: { top: { kind: 'coat', col: 'charcoal' }, bottom: { kind: 'trousers', col: 'grey' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'burgundy' }, gloves: 'tan', hold: 'stick' } },
    { build: 'slim', age: 'young', skin: 4, hair: { style: 'curly', col: 0 },
      spring: { top: { kind: 'hoodie', col: 'red' }, bottom: { kind: 'joggers', col: 'grey' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'charcoal' } },
      summer: { top: { kind: 'tee', col: 'yellow' }, bottom: { kind: 'shorts', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'cap', col: 'navy' }, bag: { kind: 'backpack', col: 'charcoal' } },
      autumn: { top: { kind: 'hoodie', col: 'navy', hood: 'up' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'olive', strip: 1 } },
      winter: { top: { kind: 'parka', col: 'forest', hood: 'up' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'white' }, gloves: 'black', bag: { kind: 'backpack', col: 'charcoal', strip: 1 } } },
    { build: 'broad', skin: 3, hair: { style: 'crop', col: 0 },
      spring: { top: { kind: 'rain', col: 'yellow' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hold: 'phone' },
      summer: { top: { kind: 'tee', col: 'white' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'trainer', col: 'grey' }, hold: 'phone' },
      autumn: { top: { kind: 'rain', col: 'teal' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hold: 'umbrella', holdCol: 'black' },
      winter: { top: { kind: 'parka', col: 'black', strip: 1 }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'grey' }, scarf: { col: 'grey', col2: 'charcoal' }, gloves: 'black', hold: 'phone' } },
    { build: 'slim', age: 'older', skin: 0, hair: { style: 'bun', col: 6 }, tall: -0.6,
      spring: { top: { kind: 'coat', col: 'sky' }, bottom: { kind: 'skirt', col: 'navy', len: 'midi' }, tights: 'stone', shoes: { kind: 'shoe', col: 'navy' }, bag: { kind: 'shoulder', col: 'tan' } },
      summer: { top: { kind: 'blouse', col: 'pink' }, bottom: { kind: 'skirt', col: 'cream', len: 'midi' }, shoes: { kind: 'sandal', col: 'tan' }, hat: { kind: 'sunhat', col: 'stone', band: 'pink' }, bag: { kind: 'shoulder', col: 'tan' } },
      autumn: { top: { kind: 'coat', col: 'burgundy' }, bottom: { kind: 'skirt', col: 'charcoal', len: 'midi' }, tights: 'charcoal', shoes: { kind: 'shoe', col: 'black' }, hold: 'brolly', holdCol: 'plum' },
      winter: { top: { kind: 'coat', col: 'navy' }, bottom: { kind: 'skirt', col: 'charcoal', len: 'midi' }, tights: 'charcoal', shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'plum' }, scarf: { col: 'plum', col2: 'pink' }, gloves: 'plum', bag: { kind: 'shoulder', col: 'black' } } },
    { build: 'average', skin: 5, hair: { style: 'long', col: 0 }, tall: 0.4,
      spring: { top: { kind: 'jacket', col: 'denim' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'tan' } },
      summer: { top: { kind: 'tee', col: 'coral' }, bottom: { kind: 'skirt', col: 'denim' }, shoes: { kind: 'sandal', col: 'tan' }, bag: { kind: 'crossbody', col: 'tan' } },
      autumn: { top: { kind: 'jumper', col: 'mustard' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'rust' }, bag: { kind: 'backpack', col: 'tan', strip: 1 } },
      winter: { top: { kind: 'coat', col: 'black' }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'mustard', col2: 'rust' }, hat: { kind: 'beanie', col: 'mustard' }, gloves: 'black', bag: { kind: 'crossbody', col: 'tan', strip: 1 } } },
    { build: 'broad', skin: 2, hair: { style: 'short', col: 5 }, tall: 0.8,
      spring: { top: { kind: 'jumper', col: 'grey' }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'shoe', col: 'tan' } },
      summer: { top: { kind: 'shirt', col: 'sky' }, bottom: { kind: 'shorts', col: 'stone' }, shoes: { kind: 'trainer', col: 'grey' }, hat: { kind: 'cap', col: 'red' }, bag: { kind: 'crossbody', col: 'charcoal' } },
      autumn: { top: { kind: 'jacket', col: 'tweed' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'black' }, scarf: { col: 'navy', col2: 'sky' }, hold: 'brolly', holdCol: 'black' },
      winter: { top: { kind: 'coat', col: 'charcoal', belt: 0 }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'navy' }, scarf: { col: 'navy', col2: 'sky' }, gloves: 'tan' } },
  ];
  /** A preset's look for a season: the body (build, age, skin, hair, height) and that season's wardrobe. */
  function outfit(p, season) {
    const w = p[season] || p.summer || {};
    return Object.assign({ season, build: p.build, age: p.age, skin: p.skin, hair: p.hair, tall: p.tall || 0 }, w);
  }
  const ARM_POSES = Object.freeze(['forward', 'back', 'run', 'hold', 'play', 'bars', 'phone', 'umbrella', 'none']);
  const LEG_POSES = Object.freeze(['walk', 'run', 'seated', 'cycle']);
  for (const tb of [BUILD, TOPS]) { Object.values(tb).forEach(Object.freeze); Object.freeze(tb); }   // exported read-only
  return Object.freeze({ f1, D, ell, circ, rect, hx, mix, dark, light, tone4, tidy, define, palette, NIGHT, walkAnim, tags, figure, outfit, ik,
    PRESETS, SKIN, HAIR, CLOTH, HIP, BUILD, TOPS, ARM_POSES, LEG_POSES });
})();
