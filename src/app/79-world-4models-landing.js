/* ============================================================
   WORLD ENGINE v3.1, package appearance: the LANDING STAGE model, and the people-in-boats figure helpers (docs/dev/WORLD_MODELS.md).
   Private names: _wmdLdg. PURE classic script: nothing runs at load but worldModelDefine and the library registration.

   The user (16 Oct) on the Pier Head render: the ferries "look moored in open water", the landing stage was a hairline at eye
   height with no gangway, pontoon, terminal or walkway to it; and (Whitby) the dinghy's crew stood upright and legless at the
   gunwale. Both are models, not scenes: any waterfront with a ferry, a boat trip or a pleasure steamer gets the same stage.

   landing-stage  boat.landing-stage   a floating pontoon moored off a river wall, with:
       the hull (a dark steel pontoon with an antifouling band, a rubbing strake, a safety-yellow edge line, deck seams),
       fenders along the berth side and bollards, guide piles at the corners, lamp standards (lit after dusk),
       a terminal shed (a long low building with a pitched roof, windows lit by the seeded rule, doors, a canopy over the berth),
       a hinged gangway (a bridge) from the river wall down to the deck: a sloping deck on two girders with handrails, a hinge
       pin and bearing plate at the wall end, rollers on the stage, a lamp column at the head, life rings,
       passenger brows out to the ferries' gates, benches, people waiting (some seated), and foam at the waterline.
   The model is drawn from the pontoon's own frame (a along the stage, l across, + toward the river wall, y up from the water).
   The wall's height above the water is read from the entity's waterline (h.base), so one model serves any quay.

   opts (numbers): gap (metres from the stage's inland edge to the wall face, 12), gangway (a of the gangway, +2),
   shed (a of the shed's middle, the gangway's), shedSide (1: the shed on the inland edge, so a ferry on the berth side shows over the stage; default: down the middle), berths ([a of each brow]: opts.berthA, opts.berthB; 0 = none), people (0 to 1: how many wait).

   Figures (_wmdLdgSeated, _wmdLdgStanding) are shared with the vessels (a crew sits in the boat, legs bent, hands on the tiller).
   ============================================================ */

const _WMD_LDG = Object.freeze([
  { name: 'grey', hull: '#3c444c', anti: '#4a3a30', strake: '#1c1f23', deck: '#74766f', line: '#d9b93a', house: '#dcd7c6', base: '#59605c', roof: '#4d5d57', trim: '#2f4a6a', rail: '#eceee9', gang: '#59636b', glass: '#3a4a5a', post: '#2b2f33' },
  { name: 'navy', hull: '#222d44', anti: '#43342c', strake: '#14171c', deck: '#6f7174', line: '#d9b93a', house: '#e6e1d2', base: '#3e4a60', roof: '#7a332b', trim: '#b6382c', rail: '#f0f0ea', gang: '#46505e', glass: '#364454', post: '#22262c' },
  { name: 'green', hull: '#2f4a3e', anti: '#43362c', strake: '#171c19', deck: '#6f726b', line: '#e0c040', house: '#d8dcc9', base: '#4a5d52', roof: '#2f4639', trim: '#e8dcb0', rail: '#e8ece4', gang: '#4c5c54', glass: '#34463f', post: '#24302a' },
]);

const _wmdLdgClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _WMD_LDG_SKIN = Object.freeze(['#e6bf9a', '#d6a77e', '#c89a78', '#9a6a48', '#7a5238']);
const _WMD_LDG_TOPS = Object.freeze(['#c0392b', '#2f6aa8', '#e8b030', '#e9e5da', '#2e8b57', '#6a4a8a', '#d9733a', '#3a4a5a']);
const _WMD_LDG_TROUSERS = Object.freeze(['#2a3340', '#3d4452', '#5a4a3a', '#6b7380', '#26292f']);

/**
 * A SEATED figure (the pose a boat or a bench needs), drawn through d = { line(pts, w, hex, mat, role), disc(c, r, hex, mat, role, k) }
 * in the caller's model frame (a along, l across, y up). o: { a, l, y (the TOP of the seat under the hip), face (+1 looks toward +a,
 * -1 toward -a), out (the lateral sign of a lean: a hiking crew leans out), lean (metres of the shoulders over the hip, along the
 * lean), top, trousers, skin, hair, hat, shoe, k (scale), feet ([a, l, y] where the shins end; default straight down under the knee),
 * hands ([[a, l, y]...] where the hands rest: a tiller, an oar, the knees; default on the lap), legs ('bent' | 'out' | 'cross') }.
 * The legs are real: a thigh forward from the hip, a shin down to the feet (a knee higher than the seat), so a person who sits
 * never reads as a column standing at the gunwale.
 */
function _wmdLdgSeated(d, o) {
  const k = o.k || 1, f = o.face < 0 ? -1 : 1, out = o.out || 0, lean = o.lean == null ? 0.12 : o.lean;
  const a = o.a, l = o.l, y = o.y;
  const hip = [a, l, y + 0.11 * k], sh = [a - f * 0.03 * k + (o.leanA == null ? 0 : o.leanA) * k, l + out * lean * k, y + 0.63 * k];
  const hd = [sh[0] + f * 0.02 * k, sh[1] + out * 0.05 * k, sh[2] + 0.25 * k];
  const trs = o.trousers || '#2a3340', top = o.top || '#2f6aa8', skin = o.skin || '#e6bf9a', shoe = o.shoe || '#23252a';
  for (const s of [-1, 1]) {
    const hl = l + s * 0.1 * k, kneeUp = (o.legs === 'out' ? 0.0 : 0.13) * k;
    const kn = [a + f * (o.legs === 'out' ? 0.46 : 0.4) * k, hl - out * 0.08 * k + (o.legs === 'cross' ? -s * 0.1 * k : 0), y + 0.08 * k + kneeUp];
    const ft = o.feet ? [o.feet[0], o.feet[1] + s * 0.1 * k, o.feet[2]] : [kn[0] + f * 0.06 * k, kn[1], o.legs === 'out' ? y + 0.02 * k : y - 0.4 * k];
    d.line([[hip[0], hl, hip[2]], kn], 0.16 * k, trs, 'fabric', 'thigh');
    d.line([kn, ft], 0.12 * k, trs, 'fabric', 'shin');
    d.line([ft, [ft[0] + f * 0.17 * k, ft[1], ft[2] - 0.02 * k]], 0.09 * k, shoe, 'fabric', 'shoe');
  }
  d.line([hip, sh], 0.31 * k, top, 'fabric', 'torso');
  d.line([[sh[0], sh[1], sh[2] + 0.02 * k], [hd[0], hd[1], hd[2] - 0.12 * k]], 0.1 * k, skin, 'skin', 'neck');
  const hands = o.hands || [[hip[0] + f * 0.34 * k, l + 0.12 * k, y + 0.3 * k], [hip[0] + f * 0.34 * k, l - 0.12 * k, y + 0.3 * k]];
  hands.forEach((hn, i) => {
    const s = i % 2 ? -1 : 1, sp = [sh[0], sh[1] + s * 0.16 * k, sh[2] - 0.05 * k], el = [(sp[0] + hn[0]) / 2 - f * 0.04 * k, (sp[1] + hn[1]) / 2 + s * 0.06 * k, (sp[2] + hn[2]) / 2 - 0.1 * k];
    d.line([sp, el, hn], 0.075 * k, top, 'fabric', 'arm');
    d.disc(hn, 0.035 * k, skin, 'skin', 'hand', 1);
  });
  d.disc(hd, 0.108 * k, skin, 'skin', 'head', 1);
  if (o.hair) d.disc([hd[0] - f * 0.012 * k, hd[1], hd[2] + 0.045 * k], 0.112 * k, o.hair, 'fabric', 'hair', 0.7);
  if (o.hat) d.disc([hd[0], hd[1], hd[2] + 0.07 * k], 0.125 * k, o.hat, 'fabric', 'hat', 0.5);
}

/** A STANDING figure 1.7 m tall at the feet (a, l, y): two legs, a torso, arms, a head; o: { top, trousers, skin, hair, hat, face, k, walk (0..1 stride), bag }. */
function _wmdLdgStanding(d, o) {
  const k = o.k || 1, f = o.face < 0 ? -1 : 1, a = o.a, l = o.l, y = o.y, st = (o.walk || 0) * 0.2 * k;
  const trs = o.trousers || '#2a3340', top = o.top || '#2f6aa8', skin = o.skin || '#e6bf9a', hip = y + 0.92 * k, sh = y + 1.5 * k;
  for (const s of [-1, 1]) d.line([[a, l + s * 0.09 * k, hip], [a + f * s * st, l + s * 0.09 * k, y + 0.04 * k]], 0.15 * k, trs, 'fabric', 'leg');
  d.line([[a, l, hip - 0.04 * k], [a, l, sh]], 0.34 * k, top, 'fabric', 'torso');
  for (const s of [-1, 1]) d.line([[a, l + s * 0.2 * k, sh - 0.04 * k], [a - f * s * st * 0.8, l + s * 0.22 * k, hip - 0.06 * k]], 0.08 * k, top, 'fabric', 'arm');
  d.line([[a, l, sh], [a, l, sh + 0.14 * k]], 0.1 * k, skin, 'skin', 'neck');
  d.disc([a, l, sh + 0.25 * k], 0.11 * k, skin, 'skin', 'head', 1);
  if (o.hair) d.disc([a, l, sh + 0.3 * k], 0.115 * k, o.hair, 'fabric', 'hair', 0.7);
  if (o.hat) d.disc([a, l, sh + 0.33 * k], 0.13 * k, o.hat, 'fabric', 'hat', 0.5);
  if (o.bag) d.line([[a, l + 0.2 * k, sh - 0.2 * k], [a, l + 0.24 * k, hip - 0.22 * k]], 0.16 * k, o.bag, 'fabric', 'bag');
}

/** The seeded look of a person (skin, hair, top, trousers) from a hash source u(key): shared by the stage's passengers. */
function _wmdLdgLook(u, i) {
  const pick = (arr, key) => arr[Math.floor(u(key + i) * arr.length) % arr.length];
  return { skin: pick(_WMD_LDG_SKIN, 'sk'), hair: ['#2a2220', '#4a3626', '#8a6a3e', '#c9b48a', '#8a8a8e', '#1c1c1e'][Math.floor(u('hr' + i) * 6)], top: pick(_WMD_LDG_TOPS, 'tp'), trousers: pick(_WMD_LDG_TROUSERS, 'tr'),
    hat: u('ht' + i) < 0.18 ? '#e8e4d8' : null, bag: u('bg' + i) < 0.35 ? ['#5a3a2a', '#2a3a4a', '#8a2a2a'][Math.floor(u('bgc' + i) * 3)] : null };
}

/* ---------- the stage ---------- */
function _wmdLdgBuild(p, h) {
  const liv = p.livery, L = p.L, B = p.B, hl = L / 2, hb = B / 2, o = p.opts;
  const age = (hex, kind) => h.aged(hex, kind || 'paint', 0.7);
  const fb = 1.15;                                        // the deck above the water
  const quay = Math.max(1.4, -h.base);                    // the wall's top above the water, from the waterline the entity floats at
  const gap = _wmdLdgClamp(o.gap != null ? +o.gap : 12, 3, 40);
  const ga = _wmdLdgClamp(o.gangway != null ? +o.gangway : 2, -hl + 4, hl - 4), sa = _wmdLdgClamp(o.shed != null ? +o.shed : ga, -hl + 14, hl - 14);
  const berths = [o.berthA, o.berthB].filter(v => Number.isFinite(v) && v !== 0);
  const crowd = o.people != null ? _wmdLdgClamp(+o.people, 0, 1) : 0.7;
  // the side of the stage that faces the eye (+1: the river-wall side, where the walkers are): what stands on that edge is drawn last
  const ns = h.sees([0, 1, 0], [0, hb, fb * 0.5]) ? 1 : -1;
  const nearLayer = 4, farLayer = 1;
  const Lp = (pts) => pts.map(q => h.P(q[0], q[1], q[2]));
  const D = { line: (pts, w, hex, mat, role) => h.line(Lp(pts), w, hex, mat, role), disc: (c, r, hex, mat, role, kk) => h.disc(h.P(c[0], c[1], c[2]), r, hex, mat, role, kk) };
  const deckC = age(liv.deck, 'stone'), steel = age(liv.gang, 'metal');
  const px = (m) => h.px(m);

  // ---- the water: foam at the waterline all round, and the dark of the water under the gangway
  h.part('foam', { layer: -5 });
  {
    const e = 0.55, r = [[-hl - e, -hb - e], [hl + e, -hb - e], [hl + e, hb + e], [-hl - e, hb + e]];
    h.face(r.map(([a, l]) => h.P(a, l, 0.01)), '#f4fbfc', 'water', 'foam', null, { alpha: 0.4 });
    const w = 1.9, g = [[ga - w, hb], [ga + w, hb], [ga + w, hb + gap * 0.92], [ga - w, hb + gap * 0.92]];
    h.face(g.map(([a, l]) => h.P(a, l, 0.012)), '#0e1a1c', 'water', 'shade', null, { alpha: 0.3 });
  }

  // ---- fenders and piles on the berth side (the far side from a walker on the wall): below the deck edge, so behind the hull
  h.part('fenders', { layer: ns > 0 ? -1 : nearLayer });
  if (px(0.3) >= 1.2) for (let a = -hl + 3; a <= hl - 2.9; a += 6) h.cyl(a, -hb - 0.2, 0.1, fb - 0.08, 0.19, 0.19, age('#16181b', 'metal'), { mat: 'metal', role: 'fender', n: px(0.19) < 5 ? 5 : 8 });

  // ---- the hull: an antifouling band and the steel side, the deck on top (one convex solid)
  h.part('hull', { layer: 0 });
  h.box(-hl, hl, -hb, hb, 0, 0.5, age(liv.anti, 'paint'), null, 'paint', 'antifoul');
  h.box(-hl, hl, -hb, hb, 0.5, fb, age(liv.hull, 'metal'), deckC, 'metal', 'hull');
  // the rubbing strake and the edge of the deck
  h.box(-hl, hl, hb, hb + 0.12, fb - 0.4, fb - 0.12, age(liv.strake, 'metal'), age(liv.strake, 'metal'), 'metal', 'strake');
  h.box(-hl, hl, -hb - 0.12, -hb, fb - 0.4, fb - 0.12, age(liv.strake, 'metal'), age(liv.strake, 'metal'), 'metal', 'strake');
  // ---- the wash: a low broken skirt of foam at the waterline and a bow wave at each end (a flat collar is a sliver from the wall)
  if (typeof _wmdVesWash === 'function') {
    h.part('wash', { layer: 0.4 });
    const ring = [[-hl, -hb], [-hl, hb], [hl, hb], [hl, -hb]];
    _wmdVesWash({ face: (pts, hx, mt, rl, ins, ex) => h.face(pts.map(q => h.P(q[0], q[1], q[2])), hx, mt, rl, Array.isArray(ins) ? h.P(0, 0, 1.2) : ins, ex) },
      ring, { h, L, tips: [hl - 0.3, -hl + 0.3], tipHb: hb, up: 0.5, fine: h.fine, wedge: 8, gapK: 0.2, valley: 0.45, sea: p.sea == null ? 1 : p.sea });
  }
  // ---- the deck: yellow edge lines, seams
  h.part('deck', { layer: 1 });
  const yD = fb + 0.012;
  for (const s of [-1, 1]) h.face([h.P(-hl, s * (hb - 0.55), yD), h.P(hl, s * (hb - 0.55), yD), h.P(hl, s * (hb - 0.85), yD), h.P(-hl, s * (hb - 0.85), yD)], age(liv.line, 'paint'), 'paint', 'edge-line', null);
  // hatch covers, a dashed yellow walkway line and the cleats (the deck is worked steel, never a bare slab)
  if (h.fine) {
    for (let a = -hl + 5; a < hl - 4; a += 3.2) h.face([h.P(a, hb - 3.1, yD), h.P(a + 1.4, hb - 3.1, yD), h.P(a + 1.4, hb - 3.25, yD), h.P(a, hb - 3.25, yD)], age(liv.line, 'paint'), 'paint', 'dash', null);
    for (let a = -hl + 9; a < hl - 6; a += 13) { const w = 0.9 + 0.5 * h.u('hatch' + a); h.box(a, a + w * 1.6, -1.6 - w, -1.6, fb, fb + 0.07, h.shade(deckC, 0.72), h.shade(deckC, 0.82), 'metal', 'hatch'); }
  }
  if (h.fine) for (let a = -hl + 7; a < hl - 3; a += 7) h.face([h.P(a, -hb + 0.1, yD), h.P(a + 0.06, -hb + 0.1, yD), h.P(a + 0.06, hb - 0.1, yD), h.P(a, hb - 0.1, yD)], h.shade(deckC, 0.8), 'stone', 'seam', null);

  // ---- the terminal shed: a long low building on the deck with a pitched roof, a canopy over the berth, lit windows
  // (opts.shedSide > 0: the shed stands on the INLAND edge, behind the passengers' deck: a ferry moored on the berth side is then never
  //  hidden by the shed when the stage is seen along the wall; the default keeps it down the middle)
  const inland = +o.shedSide > 0;
  const sL = 24, a0 = sa - sL / 2, a1 = sa + sL / 2, l1 = inland ? hb - 1.6 : -hb + 9.6, l0 = l1 - 6.2, yE = fb + 3.3, yR = fb + 4.5;
  h.part('shed', { layer: 2 });
  h.box(a0, a1, l0, l1, fb, yE, age(liv.house, 'paint'), age(liv.roof, 'metal'), 'render', 'wall');
  h.box(a0 - 0.05, a1 + 0.05, l0 - 0.05, l1 + 0.05, fb, fb + 0.7, age(liv.base, 'stone'), null, 'stone', 'plinth');
  h.gable(a0, a1, l0, l1, yE, yR, age(liv.roof, 'metal'), { ridge: 'a', over: 0.55, mat: 'metal', role: 'roof', end: age(liv.house, 'paint') });
  // a flat canopy over the berth side, on posts
  const cl0 = inland ? Math.max(-hb + 0.7, l0 - 4.2) : -hb + 0.7, yC = fb + 3.0;
  h.box(a0 - 1.5, a1 + 1.5, cl0, l0, yC, yC + 0.16, age(liv.roof, 'metal'), age(liv.roof, 'metal'), 'metal', 'canopy');
  if (h.fine) for (let a = a0 - 1; a <= a1 + 1.01; a += 5.2) h.line([h.P(a, cl0 + 0.2, fb), h.P(a, cl0 + 0.2, yC)], 0.14, age(liv.post, 'metal'), 'metal', 'post');
  // windows and doors on the walls the eye can see (the walk side, the berth side, the end)
  for (const [sg, lw] of [[1, l1], [-1, l0]]) {
    if (!h.sees([0, sg, 0], [sa, lw, fb + 1.5])) continue;
    const S = h.surface((u, v, off) => h.P(a0 + u, lw + sg * (off || 0), fb + v), { normal: [0, sg, 0] });
    S.rect(0, sL, 0.7, 0.9, liv.trim, 'paint', 'band', 0.012);
    S.windows({ u0: 1.6, u1: sL - 1.2, v: 1.95, step: 2.6, kind: 'rect', w: 0.75, h: 0.62, glass: liv.glass, trim: age(liv.rail, 'paint'), gaps: [[sL * 0.5 - 1.5, sL * 0.5 + 1.5]], dark: 0.12 });
    // the doors, in the middle: two dark glazed leaves (lit)
    const fx = h.litFx(false);
    S.rect(sL * 0.5 - 1.5, sL * 0.5 + 1.5, 0.7, 2.7, age(liv.rail, 'paint'), 'paint', 'frame', 0.01);
    S.rect(sL * 0.5 - 1.38, sL * 0.5 - 0.05, 0.78, 2.6, liv.glass, 'glass', 'window', 0.014, fx);
    S.rect(sL * 0.5 + 0.05, sL * 0.5 + 1.38, 0.78, 2.6, liv.glass, 'glass', 'window', 0.014, fx);
    // a sign board above the doors (a plain bar in the line colour)
    S.rect(sL * 0.5 - 2.6, sL * 0.5 + 2.6, 2.85, 3.2, liv.trim, 'paint', 'sign', 0.012);
  }
  for (const sg of [-1, 1]) {
    const ae = sg > 0 ? a1 : a0;
    if (!h.sees([sg, 0, 0], [ae, (l0 + l1) / 2, fb + 1.5])) continue;
    const S = h.surface((u, v, off) => h.P(ae + sg * (off || 0), l0 + u, fb + v), { normal: [sg, 0, 0] });
    S.windows({ u0: 1.5, u1: 4.8, v: 1.95, step: 3.0, kind: 'rect', w: 0.7, h: 0.6, glass: liv.glass, trim: age(liv.rail, 'paint'), dark: 0.1 });
  }

  // ---- the gangway (a hinged bridge): from the wall top down to the deck, a deck on two girders with handrails
  const gw = 3.4, gA0 = ga - gw / 2, gA1 = ga + gw / 2, yUp = quay, yDn = fb, lW = hb + gap;
  const gy = (l) => yDn + (yUp - yDn) * _wmdLdgClamp((l - hb) / gap, 0, 1);            // the deck height at l
  h.part('gangway', { layer: ns > 0 ? nearLayer + 0.5 : -0.5 });
  {
    const GP = (a, l, up) => h.P(a, l, gy(l) + (up || 0));
    // the underside, the girders, the deck
    h.face([GP(gA0, hb, -0.75), GP(gA1, hb, -0.75), GP(gA1, lW, -0.75), GP(gA0, lW, -0.75)], age('#23282c', 'metal'), 'metal', 'under', null);
    for (const aa of [gA0, gA1]) h.face([GP(aa, hb, 0), GP(aa, lW, 0), GP(aa, lW, -0.75), GP(aa, hb, -0.75)], steel, 'metal', 'girder', h.P(ga, hb + gap / 2, gy(hb + gap / 2) - 0.4));
    h.face([GP(gA0, hb, 0.04), GP(gA1, hb, 0.04), GP(gA1, lW, 0.04), GP(gA0, lW, 0.04)], age('#7d7466', 'timber'), 'timber', 'deck', null);
    if (h.fine) for (let l = hb + 0.9; l < lW - 0.3; l += 0.9) h.line([GP(gA0, l, 0.05), GP(gA1, l, 0.05)], 0.045, h.shade('#7d7466', 0.78), 'timber', 'plank');
    // handrails: top, mid and knee rails on posts, both sides
    const rails = age(liv.rail, 'paint');
    for (const aa of [gA0 + 0.05, gA1 - 0.05]) {
      for (const [hh, w] of [[1.08, 0.06], [0.56, 0.035]]) h.line([GP(aa, hb, hh), GP(aa, lW, hh)], w, rails, 'metal', 'rail');
      if (px(1.3) >= 3) for (let l = hb; l <= lW + 0.01; l += 1.3) h.line([GP(aa, l, 0), GP(aa, l, 1.08)], 0.045, rails, 'metal', 'post');
    }
    // the roller carriage at the stage end, the bearing plate and the hinge pin at the wall end
    h.box(gA0 - 0.15, gA1 + 0.15, hb - 0.5, hb + 0.9, fb, fb + 0.1, steel, h.shade(steel, 1.15), 'metal', 'plate');
    h.box(gA0 - 0.45, gA1 + 0.45, lW - 0.1, lW + 1.6, yUp - 0.02, yUp + 0.1, steel, h.shade(steel, 1.15), 'metal', 'plate');
    h.tube([gA0 - 0.4, lW, yUp - 0.12], [gA1 + 0.4, lW, yUp - 0.12], 0.17, age('#1d2024', 'metal'), 'metal', 'hinge', { n: 8 });
    // the lamp columns at the head of the gangway, on the quay
    for (const aa of [gA0 - 0.6, gA1 + 0.6]) {
      h.line([h.P(aa, lW + 1.2, yUp), h.P(aa, lW + 1.2, yUp + 3.2)], 0.12, age(liv.post, 'metal'), 'metal', 'post');
      h.lamp(aa, lW + 1.2, yUp + 3.35, 0.2, { kind: 'lamp' });
    }
    // life rings on the rail at both ends
    for (const [aa, l] of [[gA1 + 0.03, hb + 1.1], [gA0 - 0.03, hb + gap * 0.62]]) { const q = h.P(aa, l, gy(l) + 0.7); h.disc(q, 0.34, '#d9402c', 'paint', 'ring', 1); h.disc(q, 0.2, '#ece9e0', 'paint', 'ring-hole', 1); }
  }

  // ---- passenger brows to the ferries' gates: short ramps from the berth edge, a handrail on each
  h.part('brows', { layer: ns > 0 ? farLayer + 0.5 : nearLayer });
  for (const ab of berths) {
    const w = 1.7, lo = -hb, lx = -hb - 2.7, yo = fb + 0.05, yx = fb + 0.75, rails = age(liv.rail, 'paint');
    h.face([h.P(ab - w / 2, lo, yo), h.P(ab + w / 2, lo, yo), h.P(ab + w / 2, lx, yx), h.P(ab - w / 2, lx, yx)], age('#7d7466', 'timber'), 'timber', 'deck', null);
    for (const aa of [ab - w / 2, ab + w / 2]) { h.line([h.P(aa, lo, yo + 1.0), h.P(aa, lx, yx + 1.0)], 0.05, rails, 'metal', 'rail'); h.line([h.P(aa, lo, yo), h.P(aa, lo, yo + 1.0)], 0.045, rails, 'metal', 'post'); }
  }

  // ---- the walk side: rail along the inland edge (a gap at the gangway), posts, bollards, lamp standards, benches
  h.part('edge+', { layer: ns > 0 ? nearLayer : farLayer });
  {
    const rr = age(liv.rail, 'paint'), lE = hb - 0.3, seg = (x0, x1) => { if (x1 - x0 > 0.5) h.rail([[x0, lE], [x1, lE]], fb, 1.05, rr, { post: 2.4, mid: true, w: 0.05, mat: 'metal' }); };
    seg(-hl + 0.3, gA0 - 0.4); seg(gA1 + 0.4, hl - 0.3);
    for (const a of [-hl + 12, hl - 12, ga + 38, ga - 38]) if (Math.abs(a) < hl - 6 && Math.abs(a - ga) > 4) { const q = h.P(a, lE, fb + 0.74); h.disc(q, 0.33, '#d9402c', 'paint', 'ring', 1); h.disc(q, 0.19, '#ece9e0', 'paint', 'ring-hole', 1); }
  }
  h.part('edge-', { layer: ns > 0 ? farLayer : nearLayer });
  {
    const rr = age(liv.rail, 'paint'), lE = -hb + 0.3, seg = (x0, x1) => { if (x1 - x0 > 0.5) h.rail([[x0, lE], [x1, lE]], fb, 1.05, rr, { post: 2.4, mid: true, w: 0.05, mat: 'metal' }); };
    // a rail along the berth side except where a ferry's gate is (the brows): open there
    const gates = berths.slice().sort((x, y) => x - y);
    let from = -hl + 0.3;
    for (const g of gates) { seg(from, g - 1.3); from = g + 1.3; }
    seg(from, hl - 0.3);
    for (let a = -hl + 4; a <= hl - 3.9; a += 9) if (!berths.some(b => Math.abs(a - b) < 2.2)) h.cyl(a, -hb + 0.9, fb, fb + 0.55, 0.17, 0.12, age('#2a2d31', 'metal'), { mat: 'metal', role: 'bollard', n: px(0.17) < 5 ? 5 : 8, cap: age('#16181b', 'metal') });
  }
  // lamp standards on both edges, lit after dusk
  for (const s of [-1, 1]) {
    h.part('lamps' + (s > 0 ? '+' : '-'), { layer: s === ns ? nearLayer : farLayer });
    for (let a = -hl + 8; a <= hl - 7.9; a += 17) {
      if (Math.abs(a - ga) < 3) continue;
      const l = s * (hb - 0.75);
      h.line([h.P(a, l, fb), h.P(a, l, fb + 4.4)], 0.13, age(liv.post, 'metal'), 'metal', 'post');
      h.line([h.P(a, l, fb + 4.3), h.P(a, l - s * 0.5, fb + 4.55)], 0.07, age(liv.post, 'metal'), 'metal', 'arm');
      h.lamp(a, l - s * 0.55, fb + 4.5, 0.2, { kind: 'lamp' });
    }
  }
  // guide piles at the corners of the stage on the berth side and the walk side
  h.part('piles', { layer: ns > 0 ? farLayer : nearLayer });
  for (const a of [-hl + 1.5, hl - 1.5]) for (const s of [-1, 1]) {
    if (s === ns) continue;
    h.cyl(a, s * (hb + 0.8), 0, fb + 3.2, 0.32, 0.28, age('#4a3d30', 'timber'), { mat: 'timber', role: 'pile', n: px(0.3) < 5 ? 5 : 8, cap: age('#2a241c', 'timber') });
  }

  // ---- benches along the shed's walk side and the people on the deck (some seated)
  h.part('people', { layer: ns > 0 ? nearLayer - 0.5 : farLayer + 0.5 });
  const benchL = inland ? l0 - 0.65 : l1 + 0.65;
  const benches = [[a0 + 2.8, a0 + 4.8], [a1 - 4.8, a1 - 2.8]];
  for (const [b0, b1] of benches) {
    h.box(b0, b1, benchL - 0.22, benchL + 0.22, fb + 0.4, fb + 0.46, age('#7a5a38', 'timber'), age('#9a7448', 'timber'), 'timber', 'seat');
    h.box(b0, b1, benchL + 0.19, benchL + 0.24, fb + 0.46, fb + 0.95, age('#7a5a38', 'timber'), age('#9a7448', 'timber'), 'timber', 'back');
    for (const a of [b0 + 0.1, b1 - 0.1]) h.line([h.P(a, benchL, fb), h.P(a, benchL, fb + 0.42)], 0.05, '#25292d', 'metal', 'leg');
  }
  const n = Math.round(crowd * 12);
  const standing = [];
  for (const b of berths) for (let i = 0; i < 4; i++) standing.push([b + (h.u('qa' + b + i) - 0.5) * 3.4, -hb + 1.3 + h.u('ql' + b + i) * 2.2]);
  for (let i = 0; i < 6; i++) standing.push([sa + (h.u('pa' + i) - 0.5) * 30, inland ? l0 - 1.3 - h.u('pl' + i) * 1.5 : hb - 1.2 - h.u('pl' + i) * 1.5]);
  for (let i = 0; i < Math.min(n, standing.length); i++) {
    const [a, l] = standing[i], lk = _wmdLdgLook(h.u, i);
    if (Math.abs(a - ga) < 2.3 && l > hb - 3) continue;
    _wmdLdgStanding(D, { a, l, y: fb, face: h.u('fc' + i) < 0.5 ? 1 : -1, k: 0.97 + 0.1 * h.u('hk' + i), walk: 0, top: lk.top, trousers: lk.trousers, skin: lk.skin, hair: lk.hair, hat: lk.hat, bag: lk.bag });
  }
  // two people sitting on the benches, facing the river
  benches.forEach(([b0, b1], i) => {
    if (h.u('sit' + i) > crowd + 0.2) return;
    const lk = _wmdLdgLook(h.u, 20 + i);
    _wmdLdgSeated(D, { a: (b0 + b1) / 2 + (h.u('sp' + i) - 0.5), l: benchL, y: fb + 0.46, face: 1, out: 0, lean: 0, top: lk.top, trousers: lk.trousers, skin: lk.skin, hair: lk.hair, hat: lk.hat, legs: 'bent', feet: [(b0 + b1) / 2 + 0.42, benchL, fb + 0.02], hands: [[(b0 + b1) / 2 + 0.3, benchL + 0.1, fb + 0.78], [(b0 + b1) / 2 + 0.3, benchL - 0.1, fb + 0.78]] });
  });
  return { height: yR + 0.4, footprint: [[-hl, -hb], [hl, -hb], [hl, hb], [-hl, hb]] };
}

worldModelDefine('landing-stage', {
  name: 'Landing stage (a floating pontoon with a hinged gangway to the river wall, a terminal shed, fenders and a ferry berth)', ids: ['boat.landing-stage'], sampleObj: 'boat.landing-stage', float: true, solidity: 'solid',
  bob: { heave: 0.008, roll: 0.0006, pitch: 0.0003, period: 7.5 },
  moor: { heave: 0.045, roll: 0.0028, pitch: 0.0013, period: 7.8 },   // a 120 m pontoon on its guide piles: less than the ferries it serves
  dims(info, ent) { return { L: 120, B: 14, H: 6.4 }; },
  liveries: () => _WMD_LDG,
  samples: [{ livery: 'grey' }, { livery: 'navy', age: 0.7 }, { livery: 'green', size: 0.8 }],
  build: _wmdLdgBuild,
});

/* the library object (the validator wants a descriptor with a real size; the sprite is the boardwalk art, a fallback only) */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneObj !== 'function') return;
  const id = 'boat.landing-stage';
  if (sceneObj(id)) return;
  const src = sceneObj('boat.river-ferry') || sceneObj('boat.ferry') || sceneObj('boat.dinghy');
  if (!src) return;
  sceneObjDefine(Object.assign({}, src, { id, weight: 0, real: { h: 6.4, l: 120, w: 14 }, views: undefined, tags: ['uk', 'boat', 'harbour', 'ferry', 'landing-stage', 'kit:water', 'role:boat', 'model'],
    credit: 'world landing-stage model (79-world-4models-landing.js): a floating pontoon with a gangway to the quay; the sprite is a ferry hull, a fallback only' }));
})();
