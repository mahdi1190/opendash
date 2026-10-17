/* ---------- a Victorian seaside pier as a real 3D model (16 Oct "engine work needed"; reworked 17 Oct, detail/pier) ----------
   structure.pier: a long timber deck on rows of piles (a tide-stained weed band at the foot, a ring of foam where each pile meets the
   water, X braces), a cast-iron railing both sides, lamp standards alternating from side to side with a string of festoon bulbs between
   them (lit after dusk), lifebuoys on the rail, a pair of toll-houses at the landward end, and at the seaward end a wide PAVILION: a
   theatre hall with arched lit windows, a gabled roof with a sign on posts (a painted board with bands, never lettering, edged with
   bulbs), a row of eave bulbs, a canopy over the doors, a domed turret at each front corner and a weather vane (never a flag).
   The deck is `opts.deck` (default 3.1) metres above the base (the waterline); with `opts.ramp` (metres) the landward end is an
   APPROACH that rises from the ground to the deck, so a pier can start on a beach next to a promenade at the same level as the sea.
   `opts.kiosks: true` adds three plain inline kiosks (the default is none: a scene puts `building.kiosk` models, benches and anglers on the
   deck, where each is solid and the people walk round them; `worldPierPlan` below makes the walkable decks and a ramp for the scene).
   Entity: { obj: 'structure.pier', at, facing, attach: 'water' } where `at` is the CENTRE and `facing` runs from the shore to the sea.
   150 m by 9 m at size 1; scale with `model.size`. */
const _WMD_PIER_LIVERIES = Object.freeze([
  { name: 'green-cream', iron: '#2f5b4b', cream: '#efe6cc', deck: '#8a7860', roof: '#587a8e', dome: '#3e6a5a', accent: '#b23a2c', awn: ['#b23a2c', '#f1ead6'] },
  { name: 'white-blue', iron: '#f0ede4', cream: '#f4efe0', deck: '#938168', roof: '#3d5a78', dome: '#2f4a6b', accent: '#2f4a6b', awn: ['#2f6a9a', '#f1ead6'] },
  { name: 'maroon-cream', iron: '#6a2a2c', cream: '#ece1c4', deck: '#85735b', roof: '#4d5a64', dome: '#4a3a3c', accent: '#c9a24a', awn: ['#c9a24a', '#6a2a2c'] },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.pier'))) sceneObjDefine({
  id: 'structure.pier', category: 'structure', size: [900, 120], variants: 1, seasonal: false, flippable: true, real: { h: 14, l: 150, w: 9 },
  palette: { base: { deck: '#8a7860', pile: '#4e4236', hall: '#efe6cc', roof: '#587a8e' } }, parts: ['body'],
  tags: ['uk', 'coast', 'seaside', 'pier', 'kit:temperate', 'kit:water', 'role:landmark', 'class:structure'],
  credit: 'fast-scene test: a generic Victorian pier (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@pile', 'M-440 0H440V-26H-440Z'], ['@deck', 'M-440 -26H440V-34H-440Z'], ['@hall', 'M300 -34H430V-80H300Z'], ['@roof', 'M290 -80L365 -110L440 -80Z']] }; },
});
/** The deck height at `a`: the approach rises from the ground (yG) over `R` metres from the landward end, then it is level. */
function _wmdPierY(a, aS, R, yG, yD) { return R <= 0 || a >= aS + R ? yD : a <= aS ? yG : yG + (yD - yG) * (a - aS) / R; }
/** One pile with its weed band and its ring of foam at the water. */
function _wmdPierPile(h, k, a, l, yTop, wood, weed, foam, yb) {
  yb = yb || 0;
  if (yTop - yb < 0.4 * k) return;
  const yw = Math.min(yTop, yb + 0.85 * k);
  h.cyl(a, l, yb, yw, 0.25 * k, 0.24 * k, weed, { mat: 'timber', role: 'pile-weed', n: 5, cap: false });
  if (yTop > yw) h.cyl(a, l, yw, yTop, 0.24 * k, 0.2 * k, wood, { mat: 'timber', role: 'pile', n: 5, cap: false });
  if (foam && yb < 0.05) { const pts = []; for (let i = 0; i < 8; i++) { const th = i / 8 * 6.2832; pts.push(h.P(a + Math.cos(th) * 0.55 * k, l + Math.sin(th) * 0.55 * k, 0.02)); } h.face(pts, '#e6eef0', 'water', 'foam', null, { alpha: 0.5 }); }
}
/** One bay of the pier from a0 to a1: piles and braces below, the deck slab with its boards, then the far rail, the lamps and buoys of the far side, the near rail and its own. */
function _wmdPierBay(h, p, liv, a0, a1, hw, yFn, k, iron, farFirst, o) {
  const ym = yFn((a0 + a1) / 2);
  h.part('bay' + Math.round(a0 * 10), { layer: 1, key: h.depth((a0 + a1) / 2, 0, ym) });
  const wood = h.aged('#4b4036', 'timber'), weed = h.mix(wood, '#2c3a2a', 0.55), brace = h.aged('#4e4338', 'timber'), fine = h.px(0.9 * k) >= 4;
  for (const a of o.first ? [a0, a1] : [a1]) {
    const yt = yFn(a) - 0.3 * k, yb = o.ground ? o.ground(a) : 0;
    for (const l of [-hw + 0.7 * k, 0, hw - 0.7 * k]) _wmdPierPile(h, k, a, l, yt, wood, weed, h.px(0.5 * k) >= 3, yb);
    if (yt - yb > 1.8 * k && h.px(0.2 * k) >= 2) {
      h.line([h.P(a, -hw + 0.7 * k, yb + 0.9 * k), h.P(a, hw - 0.7 * k, yt - 0.4 * k)], 0.1 * k, brace, 'timber', 'brace');
      h.line([h.P(a, hw - 0.7 * k, yb + 0.9 * k), h.P(a, -hw + 0.7 * k, yt - 0.4 * k)], 0.1 * k, brace, 'timber', 'brace');
    }
  }
  // the deck: a slab (top and two fascias), boards across and a few seams along
  const y0 = yFn(a0), y1 = yFn(a1), t = 0.35 * k, deck = h.aged(liv.deck, 'timber'), ins = h.P((a0 + a1) / 2, 0, (y0 + y1) / 2 - t / 2);
  h.face([h.P(a0, -hw, y0), h.P(a1, -hw, y1), h.P(a1, hw, y1), h.P(a0, hw, y0)], deck, 'timber', 'deck', null);
  for (const l of [-hw, hw]) h.face([h.P(a0, l, y0 - t), h.P(a1, l, y1 - t), h.P(a1, l, y1), h.P(a0, l, y0)], h.shade(deck, 0.86), 'timber', 'fascia', ins);
  if (fine) {
    const sp = 0.9 * k, dk = h.shade(deck, 0.8);
    for (let a = Math.ceil(a0 / sp) * sp; a < a1; a += sp) h.line([h.P(a, -hw, yFn(a) + 0.004), h.P(a, hw, yFn(a) + 0.004)], 0.025 * k, dk, 'timber', 'board');
    for (const l of [-hw * 0.55, 0, hw * 0.55]) h.line([h.P(a0, l, y0 + 0.004), h.P(a1, l, y1 + 0.004)], 0.02 * k, dk, 'timber', 'seam');
  }
  // the railings and what stands along them, the far side first
  const sides = [-1, 1].sort((x, y) => (h.depth(0, y * hw, ym) - h.depth(0, x * hw, ym)));
  for (const sg of sides) {
    const l = sg * hw, top = (a) => yFn(a) + 1.05 * k;
    const n = Math.max(1, Math.round((a1 - a0) / (3 * k))), path = [], mid = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; path.push(h.P(a, l, top(a))); mid.push(h.P(a, l, yFn(a) + 0.5 * k)); }
    h.line(path, 0.045 * k, iron, 'metal', 'rail'); h.line(mid, 0.035 * k, iron, 'metal', 'rail');
    if (h.px(1.5 * k) >= 4) for (let a = Math.ceil(a0 / (1.5 * k)) * 1.5 * k; a <= a1 + 1e-6; a += 1.5 * k) h.line([h.P(a, l, yFn(a)), h.P(a, l, top(a))], 0.04 * k, iron, 'metal', 'baluster');
    for (const it of o.items) {
      if (it.a < a0 || it.a >= a1 || it.side !== sg) continue;
      const yb = yFn(it.a), la = it.a, ll = sg * (hw - 0.3 * k);
      if (it.kind === 'lamp') {
        h.cyl(la, ll, yb, yb + 3.3 * k, 0.07 * k, 0.045 * k, iron, { mat: 'metal', role: 'lamp-post', n: 5 });
        h.line([h.P(la, ll, yb + 3.2 * k), h.P(la, ll - sg * 0.35 * k, yb + 3.45 * k)], 0.035 * k, iron, 'metal', 'arm');
        h.frustum(h.ngon(la, ll - sg * 0.35 * k, 0.05 * k, 5), yb + 3.78 * k, h.ngon(la, ll - sg * 0.35 * k, 0.2 * k, 5), yb + 3.64 * k, iron, { mat: 'metal', role: 'lamp-cap' });
        if (it.light) h.lamp(la, ll - sg * 0.35 * k, yb + 3.52 * k, 0.2 * k, { col: '#ffe6a8', kind: 'pier-lamp' });
        else h.disc(h.P(la, ll - sg * 0.35 * k, yb + 3.52 * k), 0.2 * k, '#d9d2b8', 'glass', 'lamp', 1, { theta: 0, lit: '#ffe6a8', halo: true });
      } else if (it.kind === 'buoy') {
        const c = h.P(la, l - sg * 0.04 * k, yb + 0.8 * k);
        h.disc(c, 0.3 * k, '#c9423a', 'paint', 'lifebuoy', 1); h.disc(c, 0.21 * k, '#f2efe4', 'paint', 'lifebuoy', 1); h.disc(c, 0.12 * k, '#c9423a', 'paint', 'lifebuoy', 1);
      }
    }
    // festoon bulbs: a sagging string between the neighbouring standards on this side (lit after dusk)
    if (o.festoon) for (const f of o.festoon) {
      if (f.side !== sg) continue;
      const fa0 = Math.max(a0, f.a0), fa1 = Math.min(a1, f.a1);
      for (let a = Math.ceil(fa0 / (2.2 * k)) * 2.2 * k; a < fa1; a += 2.2 * k) {
        const u = (a - f.a0) / (f.a1 - f.a0), sag = 0.45 * k * 4 * u * (1 - u), yb = yFn(a);
        h.disc(h.P(a, sg * (hw - 0.12 * k), yb + 3.35 * k - sag), 0.07 * k, '#e9e2c8', 'glass', 'bulb', 1, { theta: 0, lit: '#ffeab0', halo: true });
      }
    }
  }
}
worldModelDefine('pier', {
  name: 'Victorian seaside pier', ids: ['structure.pier', 'landmark.pier-uk'], sampleObj: 'structure.pier', float: true, bob: false, solidity: 'solid', faceCap: 3200,
  dims() { return { L: 150, B: 9, H: 14 }; },   // fixed: the library size is only a sprite's
  liveries: () => _WMD_PIER_LIVERIES,
  params(ent, o, p) { return p.liveryKey != null ? null : { liveryKey: (p.seed >>> 3) % _WMD_PIER_LIVERIES.length }; },
  samples: [{ livery: 'green-cream' }, { livery: 'white-blue', age: 0.5 }, { livery: 'maroon-cream', size: 0.7 }, { livery: 'green-cream', seed: 4, opts: { ramp: 24, deck: 2.6 } }],
  footprint(p) { const L = p.L, hw = p.B / 2, hwP = hw * 1.9, aP = L / 2 - Math.min(36 * p.size, L * 0.3); return [[-L / 2, -hw], [aP, -hw], [aP, -hwP], [L / 2, -hwP], [L / 2, hwP], [aP, hwP], [aP, hw], [-L / 2, hw]]; },
  // the walkable deck: the spine from the landward edge (and the apron, when there is one) to the pavilion, a little inside the rails
  deck(p) {
    const k = p.size, o = p.opts, L = p.L, hw = p.B / 2 - 0.5 * k, yD = (typeof o.deck === 'number' ? o.deck : 3.1) * k, aP = L / 2 - Math.min(36 * k, L * 0.3);
    const eL = typeof o.extL === 'number' ? o.extL : 0, eR = typeof o.extR === 'number' ? o.extR : 0, aS = -L / 2;
    return { y: yD, poly: [[aS - eL, -hw], [aP - 0.3 * k, -hw], [aP - 0.3 * k, hw], [aS - eR, hw]] };
  },
  build(p, h) {
    const k = p.size, L = p.L, hw = p.B / 2, liv = p.livery, o = p.opts, yD = (typeof o.deck === 'number' ? o.deck : 3.1) * k, iron = h.aged(liv.iron, 'metal');
    const R = (typeof o.ramp === 'number' ? o.ramp : 0) * k, yG = 0.25 * k;
    const pavL = Math.min(36 * k, L * 0.3), aP = L / 2 - pavL, aS = -L / 2, yFn = (a) => _wmdPierY(a, aS, R, yG, yD);
    const farFirst = h.depth(0, hw, yD) > h.depth(0, -hw, yD);
    // a beach under the landward end: the ground rises from the water to `beachRise` m at the root over `beachLen` m, the piles stand on it
    const bL = typeof o.beachLen === 'number' ? o.beachLen * k : 0, bR = typeof o.beachRise === 'number' ? o.beachRise : 0;
    const ground = bL > 0 ? (a) => Math.max(0, bR * (1 - (a - aS) / bL)) : null;
    // lamp standards (alternating sides) and the lifebuoys, by position along the pier
    const nl = Math.max(3, Math.round((aP - aS) / (14 * k))), items = [], festoon = [];
    for (let i = 1; i < nl; i++) { const a = aS + (aP - aS) * i / nl; if (a < aS + R * 0.8) continue; items.push({ kind: 'lamp', a, side: i % 2 ? -1 : 1, light: i % 2 === 0 }); }
    const lamps = items.filter(q => q.kind === 'lamp');
    if (o.festoon !== false) for (const sg of [-1, 1]) { const mine = lamps.filter(q => q.side === sg); for (let i = 0; i + 1 < mine.length; i++) festoon.push({ side: sg, a0: mine[i].a, a1: mine[i + 1].a }); }
    for (const [fr, sg] of [[0.33, 1], [0.7, -1]]) items.push({ kind: 'buoy', a: aS + (aP - aS) * (fr + 0.02 * (h.u('bu' + fr) - 0.5)), side: sg });
    // an APRON: the landward end widened back to the wall of the promenade (extL, extR: how far back, in metres, the left and right edges run)
    const eL = typeof o.extL === 'number' ? o.extL : 0, eR = typeof o.extR === 'number' ? o.extR : 0;
    if (eL > 0.3 || eR > 0.3) {
      const cm = h.P(aS - (eL + eR) / 4, 0, yD - 0.2 * k), t = 0.35 * k, deck = h.aged(liv.deck, 'timber'), wood = h.aged('#4b4036', 'timber'), weed = h.mix(wood, '#2c3a2a', 0.55);
      h.part('apron', { layer: 1, key: h.depth(aS - (eL + eR) / 4, 0, yD) });
      for (const [l, e] of [[-hw + 0.7 * k, eL], [0, (eL + eR) / 2], [hw - 0.7 * k, eR]]) for (let a = aS - 0.01; a > aS - e + 0.5; a -= 4 * k) _wmdPierPile(h, k, a, l, yD - 0.3 * k, wood, weed, false, 0);
      h.face([h.P(aS - eL, -hw, yD), h.P(aS, -hw, yD), h.P(aS, hw, yD), h.P(aS - eR, hw, yD)], deck, 'timber', 'deck', null);
      h.face([h.P(aS - eL, -hw, yD - t), h.P(aS, -hw, yD - t), h.P(aS, -hw, yD), h.P(aS - eL, -hw, yD)], h.shade(deck, 0.86), 'timber', 'fascia', cm);
      h.face([h.P(aS - eR, hw, yD - t), h.P(aS, hw, yD - t), h.P(aS, hw, yD), h.P(aS - eR, hw, yD)], h.shade(deck, 0.86), 'timber', 'fascia', cm);
      if (h.px(0.9 * k) >= 4) for (let a = aS - 0.9 * k; a > aS - Math.max(eL, eR); a -= 0.9 * k) {
        let l0 = -hw, l1 = hw;
        if (a < aS - Math.min(eL, eR)) { const lr = -hw + 2 * hw * ((aS - eL) - a) / ((eR - eL) || 1e-6); if (eL < eR) l0 = lr; else l1 = lr; }
        if (l1 - l0 > 0.3) h.line([h.P(a, l0, yD + 0.004), h.P(a, l1, yD + 0.004)], 0.025 * k, h.shade(deck, 0.8), 'timber', 'board');
      }
      for (const [l, e] of [[-hw, eL], [hw, eR]]) { h.line([h.P(aS - e, l, yD + 1.05 * k), h.P(aS, l, yD + 1.05 * k)], 0.045 * k, iron, 'metal', 'rail'); h.line([h.P(aS - e, l, yD + 0.5 * k), h.P(aS, l, yD + 0.5 * k)], 0.035 * k, iron, 'metal', 'rail'); }
    }
    const nb = Math.max(4, Math.round((aP - aS) / (6 * k)));
    for (let i = 0; i < nb; i++) {
      const a0 = aS + (aP - aS) * i / nb, a1 = aS + (aP - aS) * (i + 1) / nb;
      _wmdPierBay(h, p, liv, a0, a1, hw, yFn, k, iron, farFirst, { items, festoon, first: i === 0, ground });
    }
    if (o.kiosks === true) for (let i = 0; i < 3; i++) {
      const a = aS + (aP - aS) * (0.25 + 0.25 * i + 0.04 * (h.u('k' + i) - 0.5)), l = (i % 2 ? 1 : -1) * (hw - 1.7 * k);
      h.part('kiosk' + i, { layer: 3, key: h.depth(a, l, yD + 2) });
      h.box(a - 1.3 * k, a + 1.3 * k, l - 1.1 * k, l + 1.1 * k, yD, yD + 2.5 * k, h.aged(liv.cream), h.aged(liv.cream), 'render', 'kiosk');
      h.gable(a - 1.5 * k, a + 1.5 * k, l - 1.3 * k, l + 1.3 * k, yD + 2.5 * k, yD + 3.3 * k, h.aged(liv.roof), { mat: 'slate', ridge: 'a' });
    }
    // the entrance: two little toll-houses with pitched roofs at the landward end, on the deck where it has reached its height
    const tA = aS + Math.max(2 * k, R + 1 * k);
    if (o.gate !== false && !(R > 0)) h.part('gate', { layer: 3, key: h.depth(tA + 2 * k, 0, yD + 2) });
    if (o.gate !== false && !(R > 0)) for (const sg of [-1, 1]) {
      const l0 = sg > 0 ? hw - 0.2 * k : -hw - 2.6 * k, y = yFn(tA + 2 * k);
      h.box(tA + 0.5 * k, tA + 3.5 * k, l0, l0 + 2.8 * k, y, y + 2.6 * k, h.aged(liv.cream), h.aged(liv.cream), 'render', 'toll-house');
      h.hip(tA + 0.3 * k, tA + 3.7 * k, l0 - 0.2 * k, l0 + 3 * k, y + 2.6 * k, y + 3.8 * k, h.aged(liv.roof), { mat: 'slate' });
    }
    // the pavilion: a wide deck, the hall, two domed turrets at the front corners
    const hwP = hw * 1.9, a0 = aP, a1 = L / 2;
    h.part('pavilion-deck', { layer: 1, key: h.depth((a0 + a1) / 2, 0, yD) });
    const wood = h.aged('#4b4036', 'timber'), weed = h.mix(wood, '#2c3a2a', 0.55);
    for (const a of [a0 + 1 * k, (a0 + a1) / 2, a1 - 1 * k]) for (const l of [-hwP + 0.8 * k, 0, hwP - 0.8 * k]) _wmdPierPile(h, k, a, l, yD - 0.3 * k, wood, weed, h.px(0.5 * k) >= 3);
    h.box(a0, a1, -hwP, hwP, yD - 0.4 * k, yD, h.aged(liv.deck, 'timber'), h.aged(liv.deck, 'timber'), 'timber', 'deck');
    h.part('pavilion', { layer: 2, key: h.depth((a0 + a1) / 2, 0, yD + 3) });
    const ha0 = a0 + 3 * k, ha1 = a1 - 2.5 * k, hl = hwP - 2.2 * k, yE = yD + 6.4 * k, cream = h.aged(liv.cream), accent = h.aged(liv.accent);
    h.box(ha0, ha1, -hl, hl, yD, yE, cream, cream, 'render', 'hall');
    h.gable(ha0 - 0.4 * k, ha1 + 0.4 * k, -hl - 0.4 * k, hl + 0.4 * k, yE, yE + 3.4 * k, h.aged(liv.roof), { mat: 'slate', ridge: 'a', over: 0.1 * k });
    // tall arched lights, lit after dusk (the lit-up pavilion), with pale frames; the door canopy on the seaward end
    const lit = (extra) => Object.assign({ theta: 0.03, lit: '#ffd48a', halo: true }, extra || null);
    const arched = (S, u, w, v0, v1) => {
      S.rect(u - w - 0.07 * k, u + w + 0.07 * k, v0 - 0.05 * k, v1 + 0.05 * k, '#fff7e2', 'paint', 'frame', 0.01);
      S.rect(u - w, u + w, v0, v1, '#2f4452', 'glass', 'window', 0.012, lit());
      S.ring(u, v1, w, '#2f4452', 'glass', 'window', 0.012, lit(), [0, Math.PI]);
    };
    for (const [a, sg] of [[ha0, -1], [ha1, 1]]) {
      if (!h.sees([sg, 0, 0], [a, 0, yD + 2])) continue;
      const S = h.surface((u, v, off) => h.P(a + sg * off, u, v), { normal: [sg, 0, 0] });
      for (let u = -hl + 1.6 * k; u < hl - 0.9 * k; u += 2.6 * k) arched(S, u, 0.5 * k, yD + 2.0 * k, yD + 4.2 * k);
      for (let u = -hl + 1.0 * k; u < hl; u += 0.8 * k) h.disc(h.P(a + sg * 0.05 * k, u, yE - 0.2 * k), 0.05 * k, '#e9e2c8', 'glass', 'bulb', 1, { theta: 0, lit: '#ffeab0', halo: true });
      if (sg > 0) { S.rect(-1.0 * k, 1.0 * k, yD, yD + 2.6 * k, '#3a2c24', 'timber', 'door', 0.012, lit({ theta: 0.15 })); h.cloth([[a, -1.5 * k, yD + 3.0 * k], [a, 1.5 * k, yD + 3.0 * k], [a + 1.3 * k, 1.5 * k, yD + 2.5 * k], [a + 1.3 * k, -1.5 * k, yD + 2.5 * k]], 0.04 * k, liv.awn[0], { stripe: liv.awn, nu: 8, nv: 2, role: 'awning' }); }
    }
    for (const sg of [-1, 1]) {
      if (!h.sees([0, sg, 0], [(ha0 + ha1) / 2, sg * hl, yD + 2])) continue;
      const S = h.surface((u, v, off) => h.P(u, sg * (hl + off), v), { normal: [0, sg, 0] });
      for (let u = ha0 + 1.6 * k; u < ha1 - 0.9 * k; u += 2.8 * k) arched(S, u, 0.5 * k, yD + 2.0 * k, yD + 4.2 * k);
    }
    // the sign on the seaward gable: a board on two posts with painted bands and a ring, edged with bulbs (no lettering)
    h.part('sign', { layer: 3, key: h.depth(ha1 + 0.5 * k, 0, yE + 3) });
    const sa = ha1 + 0.25 * k, sw = hl * 0.6, sy0 = yE + 0.4 * k, sy1 = yE + 2.5 * k;
    for (const sg of [-1, 1]) h.line([h.P(sa, sg * sw * 0.8, yE), h.P(sa, sg * sw * 0.8, sy0)], 0.08 * k, iron, 'metal', 'post');
    h.box(sa - 0.06 * k, sa + 0.06 * k, -sw, sw, sy0, sy1, accent, accent, 'paint', 'sign');
    if (h.sees([1, 0, 0], [sa, 0, sy1])) {
      const SG = h.surface((u, v, off) => h.P(sa + 0.06 * k + off, u, v), { normal: [1, 0, 0] });
      SG.rect(-sw, sw, sy1 - 0.18 * k, sy1, cream, 'paint', 'band', 0.006); SG.rect(-sw, sw, sy0, sy0 + 0.18 * k, cream, 'paint', 'band', 0.006);
      SG.ring(0, (sy0 + sy1) / 2, 0.55 * k, cream, 'paint', 'emblem', 0.01); SG.ring(0, (sy0 + sy1) / 2, 0.38 * k, accent, 'paint', 'emblem', 0.012);
      for (let i = -3; i <= 3; i++) if (Math.abs(i) > 1) SG.rect(i * sw * 0.28 - 0.18 * k, i * sw * 0.28 + 0.18 * k, (sy0 + sy1) / 2 - 0.1 * k, (sy0 + sy1) / 2 + 0.1 * k, cream, 'paint', 'emblem', 0.01);
      for (let i = 0; i <= 10; i++) { const u = -sw + 2 * sw * i / 10; h.disc(h.P(sa + 0.1 * k, u, sy1 + 0.1 * k), 0.06 * k, '#e9e2c8', 'glass', 'bulb', 1, { theta: 0, lit: '#ffeab0', halo: true }); }
    }
    // turrets with domes at the two seaward corners, and a weather vane
    h.part('turrets', { layer: 3, key: h.depth(a1 - 2 * k, 0, yD + 6) });
    for (const sg of [-1, 1]) {
      const ta = ha1 - 0.2 * k, tl = sg * (hl - 0.4 * k);
      h.cyl(ta, tl, yD, yE + 2.0 * k, 1.3 * k, 1.15 * k, cream, { mat: 'render', role: 'turret', n: 10, cap: false });
      h.frustum(h.ngon(ta, tl, 1.55 * k, 10), yE + 2.0 * k, h.ngon(ta, tl, 0.2 * k, 10), yE + 4.6 * k, h.aged(liv.dome, 'metal'), { mat: 'metal', role: 'dome' });
      h.line([h.P(ta, tl, yE + 4.5 * k), h.P(ta, tl, yE + 5.6 * k)], 0.05 * k, iron, 'metal', 'finial');
      if (h.sees([1, 0, 0], [ta, tl, yE])) h.disc(h.P(ta + 1.3 * k, tl, yE + 0.6 * k), 0.16 * k, '#2f4452', 'glass', 'window', 2.2, { theta: 0.1, lit: '#ffd48a', halo: true });
    }
    const rm = (ha0 + ha1) / 2;
    h.line([h.P(rm, 0, yE + 3.3 * k), h.P(rm, 0, yE + 6.6 * k)], 0.08 * k, '#d8d4c8', 'metal', 'vane');
    h.line([h.P(rm - 0.8 * k, 0, yE + 6.1 * k), h.P(rm + 0.8 * k, 0, yE + 6.1 * k)], 0.05 * k, '#d8d4c8', 'metal', 'vane'); h.disc(h.P(rm + 0.9 * k, 0, yE + 6.1 * k), 0.12 * k, accent, 'metal', 'vane', 1);
    // the railing round the pavilion deck
    h.part('pavilion-rail', { layer: 4, key: h.depth((a0 + a1) / 2, 0, yD + 1) });
    h.rail([[a0, -hwP], [a1, -hwP], [a1, hwP], [a0, hwP]], yD, 1.05 * k, iron, { post: 1.5 * k, mid: true, w: 0.04 * k });
    return { height: (yD + 11 * k), footprint: [[-L / 2, -hw], [aP, -hw], [aP, -hwP], [L / 2, -hwP], [L / 2, hwP], [aP, hwP], [aP, hw], [-L / 2, hw]] };
  },
});
/**
 * The walkable side of a pier for a scene (spread the parts into the spec): worldPierPlan({ id, root: [x, z], facing, size, ramp, deck, benches, anglers, kiosks, seed })
 * ROOT is where the approach starts on the shore (the model is centred on the pier, which this works out). Returns
 * { entity, surfaces, entities, deckId, tip: [x, z] }: the pier entity (a model that carries its own walkable DECK: `deck:<id>`, a raised level the people walk on),
 * and kiosks / benches / anglers on it (`attach: 'deck:<id>'`: solid kiosks block the walkers, everything is drawn after the pier). `surfaces` is empty (kept for a ramp).
 * kiosks / benches / anglers are counts (kiosks: [{ kind, side, at (0..1 of the deck) }] to place them).
 */
function worldPierPlan(o) {
  o = o || {};
  const id = o.id || 'pier', k = o.size || 1, L = 150 * k, hw = 4.5 * k, waterY = o.waterY || 0, R = (o.ramp == null ? 0 : o.ramp) * k;
  // the deck's height above the water: `level` is its absolute height in the scene (a seawall promenade is 0 with the water at -2.9), else 3.1 m
  const deckH = typeof o.level === 'number' ? o.level - waterY : (typeof o.deck === 'number' ? o.deck : 3.1) * k, deckAbs = waterY + deckH;
  const f = (o.facing == null ? 40 : o.facing) * Math.PI / 180, ux = Math.sin(f), uz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f), root = o.root || [9, 60];
  const at = (a, l) => [Math.round((root[0] + ux * (a + L / 2) + rx * l) * 100) / 100, Math.round((root[1] + uz * (a + L / 2) + rz * l) * 100) / 100];   // a, l in the model's frame
  const pavL = Math.min(36 * k, L * 0.3), aP = L / 2 - pavL, aS = -L / 2, ids = { deck: id + '-deck', ramp: id + '-ramp', pav: id + '-pav' };
  let s = ((o.seed | 0) * 2654435761 + 977) >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const wl = hw - 0.5 * k, rect = (a0, a1, l0, l1) => [at(a0, l0), at(a1, l0), at(a1, l1), at(a0, l1)];
  const out = { surfaces: [], entities: [], deckId: id, tip: at(L / 2, 0), root };
  out.entity = { id, obj: 'structure.pier', at: at(0, 0), facing: Math.round((o.facing == null ? 40 : o.facing) * 10) / 10, attach: 'water', framed: o.framed !== false, model: Object.assign({ size: k }, o.model || null, { opts: Object.assign({ ramp: R / k, deck: deckH / k }, o.beach ? { beachLen: o.beach[0] / k, beachRise: o.beach[1] } : null, o.model && o.model.opts) }) };
  const aD = aS + R;   // where the deck is level
  const span0 = (L / 2 - Math.min(36 * k, L * 0.3)) - aD;
  /** A point on the deck (for a visitor's goals: { go: PIER.point(0.6, 0.3) }): t 0..1 along it, s -1..1 across it. */
  out.point = (t, sd) => at(aD + span0 * t, (sd || 0) * wl * 0.8);
  // the apron to the promenade wall (`wallX`: the wall's x in the scene; the deck runs back to it)
  let apron = null;
  if (typeof o.wallX === 'number') {
    const eOf = (l) => Math.max(0, (at(aS, l)[0] - o.wallX) / Math.max(0.05, ux)), eL = eOf(-hw), eR = eOf(hw);
    if (eL > 0.3 || eR > 0.3) {
      apron = { eL: Math.round(eL * 10) / 10, eR: Math.round(eR * 10) / 10 }; out.entity.model.opts.extL = apron.eL; out.entity.model.opts.extR = apron.eR;
      // the way on: a short ramp from the promenade to the deck's level (the deck is the pier entity's own raised level: `deck:<id>`)
      const pm = at(aS - (eL + eR) / 4, 0), z0 = Math.round(pm[1] * 10) / 10;
      out.surfaces.push({ id: id + '-way', kind: 'ramp', path: [[Math.round((o.wallX - 2.2) * 10) / 10, z0], [Math.round((o.wallX + 2.6) * 10) / 10, z0]], width: 5, from: 'ground', to: id });
      out.way = [o.wallX, z0];
    }
  }
  // the entities on the deck: kiosks on the sides (solid, so the walkers go round), benches against the rails, anglers by the rail on the sea side
  const kiosk = o.kiosks == null ? [{ kind: 'icecream', side: 1, at: 0.28 }, { kind: 'tea', side: -1, at: 0.52 }] : o.kiosks;
  const span = aP - aD;
  kiosk.forEach((q, i) => {
    const a = aD + span * q.at, l = q.side * (hw - 1.6 * k) , fac = (o.facing == null ? 40 : o.facing) + (q.side > 0 ? 270 : 90);
    out.entities.push({ id: id + '-kiosk-' + i, obj: 'building.kiosk', at: at(a, l), facing: Math.round(fac % 360), attach: 'deck:' + id, model: { size: 0.9 * k, livery: q.livery, seed: (o.seed | 0) * 7 + i, opts: { kind: q.kind || 'icecream' } } });
  });
  const nb = o.benches == null ? 5 : o.benches;
  for (let i = 0; i < nb; i++) {
    const a = aD + span * (0.12 + 0.8 * (i + 0.5 * rnd()) / nb), sg = i % 2 ? 1 : -1;
    if (kiosk.some(q => Math.abs(aD + span * q.at - a) < 3.2 * k && q.side === sg)) continue;
    out.entities.push({ id: id + '-bench-' + i, obj: 'street.bench', at: at(a, sg * (hw - 0.9 * k)), facing: Math.round(((o.facing == null ? 40 : o.facing) + (sg > 0 ? 270 : 90)) % 360), attach: 'deck:' + id });
  }
  const na = o.anglers == null ? 3 : o.anglers;
  for (let i = 0; i < na; i++) {
    const a = aD + span * (0.22 + 0.7 * (i + rnd() * 0.6) / Math.max(1, na)), sg = i % 3 === 1 ? -1 : 1;
    if (kiosk.some(q => Math.abs(aD + span * q.at - a) < 3.6 * k)) continue;
    out.entities.push({ id: id + '-angler-' + i, obj: 'person.angler', at: at(a, sg * (hw - 0.65 * k)), facing: Math.round(((o.facing == null ? 40 : o.facing) + (sg > 0 ? 90 : 270)) % 360), attach: 'deck:' + id });
  }
  return out;
}
