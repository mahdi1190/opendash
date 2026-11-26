/* ============================================================
   YOUR OWN HOUSE, the rooms you build on (FUN-ROADMAP Phase 6: "a pantry, a loft up a ladder..."): their pictures, in the same
   hand as the kitchen (94-garden-house-1shell.js) and the Painted village's rooms (94-garden-native-roomart-0kit.js).

     the parlour (slot 1)    a doorway back to the kitchen, a bay window with a cushioned seat, a small fireplace with a mantel,
                             and, once the loft is built, the ladder up to a hatch in the ceiling
     the loft (slot 2)       under the roof: the gable wall with a round window, the rafters and the thatch above, the hatch in the
                             floor with the ladder's top, and, once it is built, the plank door to the guest room (its friend's name on it)
     the guest room (slot 3) a plank door back, a dormer window with a window box, the roof sloping down on the right

   Every shape comes from the room's shell (houseShellFor, 94-garden-house-0rules.js): what is drawn is what blocks and what answers
   a click. P = { slot, open (its way on is built), look, wall, floor, tod, season, wx, guest (the name on the guest room's door) }.
   Functions only: nothing runs at load.
   ============================================================ */
/** The view through any window (clipped by the caller): the sky by the hour and weather, the hills, the hedge and flowers by the season. */
function _hsPaintView(T, P, x0, y0, x1, y1, o) {
  o = o || {};
  const S = HOUSE_SKY[P.tod] || HOUSE_SKY.day, season = P.season || 'summer', rain = P.wx === 1, snow = P.wx === 2, w = x1 - x0, h = y1 - y0;
  const dim = P.tod === 'night' ? -.62 : P.tod === 'dusk' ? -.25 : P.tod === 'dawn' ? -.12 : 0;
  T.rect(x0, y0, w, h, T.lin(0, y0, 0, y1, [[0, rain ? T.mix(S.top, '#8a949c', .6) : S.top], [1, rain ? T.mix(S.low, '#b8c0c4', .6) : S.low]]));
  if (P.tod === 'night') { for (let i = 0; i < Math.round(w * h / 700); i++) T.ell(T.rnd(x0, x1), T.rnd(y0, y0 + h * .55), .8 + T.r() * .9, .8 + T.r() * .9, '#fff8e0', .5 + T.r() * .5); if (!rain) { T.ell(x1 - w * .25, y0 + h * .2, 8, 8, '#f8f4e0'); T.glow(x1 - w * .25, y0 + h * .2, 28, '#c8d8ff', .3); } }
  else if (!rain) { T.glow(x0 + w * .25, y0 + h * .18, w * .4, S.sun, .5); T.blob(x1 - w * .28, y0 + h * .2, w * .16, h * .05, '#ffffff', P.tod === 'dusk' ? .45 : .8); T.blob(x0 + w * .2, y0 + h * .3, w * .11, h * .04, '#ffffff', .6); }
  else for (let i = 0; i < 5; i++) T.blob(T.rnd(x0, x1), T.rnd(y0, y0 + h * .3), w * .2, h * .08, '#9aa4ac', .7);
  const far = o.high ? .7 : .52, near = o.high ? .82 : .64;   // (from the loft you see over the hedge: the hills sit lower in the glass)
  const hills = { spring: ['#7aa860', '#5a9048'], summer: ['#6a9a4e', '#4a823a'], autumn: ['#a89a4e', '#8a7a3a'], winter: ['#b8c4cc', '#9aa8b4'] }[season] || ['#6a9a4e', '#4a823a'];
  T.fill(`M${x0} ${y0 + h * far}Q${x0 + w * .25} ${y0 + h * (far - .14)} ${x0 + w * .55} ${y0 + h * (far - .04)}T${x1} ${y0 + h * (far - .08)}V${y1}H${x0}Z`, T.shade(hills[0], dim - .05));
  T.fill(`M${x0} ${y0 + h * near}Q${x0 + w * .35} ${y0 + h * (near - .12)} ${x0 + w * .68} ${y0 + h * (near - .02)}T${x1} ${y0 + h * (near - .06)}V${y1}H${x0}Z`, T.shade(hills[1], dim));
  if (season === 'winter' || snow) T.fill(`M${x0} ${y0 + h * far}Q${x0 + w * .25} ${y0 + h * (far - .14)} ${x0 + w * .55} ${y0 + h * (far - .04)}T${x1} ${y0 + h * (far - .08)}V${y0 + h * (far - .02)}Q${x0 + w * .5} ${y0 + h * (far + .02)} ${x0} ${y0 + h * (far + .05)}Z`, '#ffffff', P.tod === 'night' ? .3 : .75);
  if (o.high) {   // far off, the vale's water and a roof or two
    T.fill(`M${x0 + w * .52} ${y0 + h * .86}Q${x0 + w * .7} ${y0 + h * .8} ${x1} ${y0 + h * .84}V${y0 + h * .9}Q${x0 + w * .7} ${y0 + h * .92} ${x0 + w * .52} ${y0 + h * .9}Z`, T.shade('#8ab8d0', dim), .9);
    for (const [k, c] of [[.22, '#a85a3a'], [.36, '#c8b078']]) { const rx = x0 + w * k, ry = y0 + h * .86; T.poly([[rx - 9, ry], [rx, ry - 7], [rx + 9, ry]], T.shade(c, dim)); T.rect(rx - 7, ry, 14, 6, T.shade('#e8e0cc', dim)); }
  } else {
    const hedge = { spring: '#4a8a3a', summer: '#3f7a32', autumn: '#7a7030', winter: '#5a6650' }[season] || '#3f7a32';
    for (let i = 0; i < Math.ceil(w / 17) + 1; i++) T.blob(x0 + i * 17, y1 - 6, 14, 10, T.shade(hedge, dim + (T.r() - .5) * .2), 1, 8, .4);
    const fl = { spring: ['#f4d8e0', '#fff4f4', '#f8e070'], summer: ['#e84a5a', '#f4c040', '#c870d8', '#ffffff'], autumn: ['#e8803a', '#c84a2a', '#f4b040'], winter: [] }[season] || [];
    for (let i = 0; i < (fl.length ? Math.round(w / 9) : 0); i++) T.ell(T.rnd(x0, x1), T.rnd(y1 - 16, y1 - 4), 2, 2, T.shade(fl[i % fl.length], dim * .8), .95);
  }
  if (snow) for (let i = 0; i < Math.round(w * h / 400); i++) T.ell(T.rnd(x0, x1), T.rnd(y0, y1), 1.2, 1.2, '#ffffff', .8);
  if (rain) for (let i = 0; i < Math.round(w * h / 560); i++) { const x = T.rnd(x0, x1), y = T.rnd(y0, y1); T.stroke(`M${x} ${y}l-2 8`, '#e8f0f4', .8, .5); }
  if (P.tod === 'night') T.rect(x0, y0, w, h, '#0a1430', .35);
  T.rect(x0, y0, w, h, T.lin(x0, y0, x1, y1, [[0, '#ffffff', P.tod === 'night' ? .04 : .2], [.35, '#ffffff', 0], [.7, '#ffffff', .05], [1, '#ffffff', 0]]));
}
/** Curtains on a pole over a window (x0..x1), tied back. */
function _hsPaintCurtains(T, P, x0, x1, y0, h, col) {
  T.rect(x0 - 30, y0 - 18, x1 - x0 + 60, 5, '#3a2818'); T.ell(x0 - 32, y0 - 15.5, 5, 5, '#6a4a2a'); T.ell(x1 + 32, y0 - 15.5, 5, 5, '#6a4a2a');
  for (const [cx0, dir] of [[x0 - 30, 1], [x1 + 30, -1]]) {
    const w = 44, x = dir > 0 ? cx0 : cx0 - w;
    T.cloth(x, y0 - 14, w, h, col, { folds: 4, flare: 4, hem: 8 });
    T.fill(`M${x + (dir > 0 ? w : 0)} ${y0 + h * .46}q${-dir * 12} 8 ${-dir * 4} 18q${dir * 10} 2 ${dir * 6} -16z`, T.shade(col, -.3));
    T.rect(x, y0 + h * .5, w, 5, '#e8c878', .8);
    for (let i = 0; i < 5; i++) T.ell(x + 6 + i * 9, y0 + 16 + (i % 2) * h * .3, 3, 3, T.shade(col, .3), .45);
  }
}
/** A window's light: the shaft on the floor and the pool where it lands. */
function _hsPaintShaft(T, P, gx0, gx1, gy1, lean) {
  const S = HOUSE_SKY[P.tod] || HOUSE_SKY.day; if (S.shaftA <= .05) return;
  lean = lean == null ? 1 : lean;
  T.shaft([[gx0 + 6, gy1 + 2], [gx1 - 6, gy1 + 2], [gx1 + 190 * lean, 600], [gx0 + 60 * lean, 600]], S.shaft, S.shaftA * .8, gy1, 600);
  T.ell((gx0 + gx1) / 2 + 110 * lean, 520, 150, 34, T.rad((gx0 + gx1) / 2 + 110 * lean, 520, 150, [[0, S.shaft, S.shaftA * 1.2], [1, S.shaft, 0]]));
}
/** An open doorway in the back wall (D), a warm room beyond it: the thick wall's reveal, a lintel, the floor going through. */
function _hsPaintOpening(T, P, L, D, o) {
  if (!D) return;
  o = o || {}; const w = D.x1 - D.x0, h = D.y1 - D.y0, night = P.tod === 'night' || P.tod === 'dusk';
  T.soft((D.x0 + D.x1) / 2, D.y1 + 4, w * .7, 8, .45);
  // beyond: the other room's wall lit warm, its skirting and boards running away, a picture's edge, a chair back (always the same)
  const far = o.beyond === 'kitchen' ? '#e8dcc2' : '#efe2cc', lit = night ? T.shade(far, -.35) : far;
  T.rect(D.x0, D.y0, w, h, T.lin(0, D.y0, 0, D.y1, [[0, T.shade(lit, -.18)], [.75, lit], [1, T.shade(lit, -.25)]]));
  T.rect(D.x0, D.y1 - 22, w, 22, T.lin(0, D.y1 - 22, 0, D.y1, [[0, '#7a5434'], [1, '#5a3a22']]));
  for (let i = 1; i < 5; i++) T.stroke(`M${D.x0 + i * w / 5} ${D.y1 - 22}L${D.x0 + i * w / 5 + (i - 2.5) * 3} ${D.y1}`, '#3a2414', .9, .5);
  T.rect(D.x0, D.y1 - 26, w, 4, T.shade(L.skirt, .1));
  if (o.beyond === 'kitchen') { T.rect(D.x0 + w * .55, D.y0 + 28, w * .45, 44, '#5a7a8a'); T.rect(D.x0 + w * .55, D.y0 + 40, w * .45, 3, '#e8e4dc', .8); for (let i = 0; i < 2; i++) T.ell(D.x0 + w * .66 + i * 14, D.y0 + 52, 5, 5, '#f4f0e6'); }   // the dresser's end, its plates
  else { T.rect(D.x0 + w * .18, D.y0 + 24, 26, 20, '#c8963e'); T.rect(D.x0 + w * .18 + 3, D.y0 + 27, 20, 14, '#7aa060'); T.stroke(`M${D.x0 + w * .62} ${D.y1 - 22}V${D.y0 + 52}M${D.x0 + w * .84} ${D.y1 - 22}V${D.y0 + 52}M${D.x0 + w * .62} ${D.y0 + 58}H${D.x0 + w * .84}`, '#6a4426', 4, .9); }   // a little picture, a chair's back
  T.rect(D.x0, D.y0, w, h, T.lin(0, D.y0, 0, D.y1, [[0, '#ffcf80', night ? .22 : .08], [1, '#ffcf80', 0]]));   // the lamp-light in there
  T.rect(D.x0, D.y0, w, h, T.lin(D.x0, 0, D.x1, 0, [[0, '#000', .28], [.3, '#000', .05], [1, '#000', .18]]));
  // the reveal: the wall is thick; its right side catches the light, the left is in shade
  const rv = 12;
  T.poly([[D.x0, D.y0], [D.x0 + rv, D.y0 + 8], [D.x0 + rv, D.y1], [D.x0, D.y1]], T.shade(L.hearth, -.35));
  T.poly([[D.x1, D.y0], [D.x1 - rv, D.y0 + 8], [D.x1 - rv, D.y1], [D.x1, D.y1]], T.shade(L.hearth, -.05));
  T.poly([[D.x0, D.y0], [D.x1, D.y0], [D.x1 - rv, D.y0 + 8], [D.x0 + rv, D.y0 + 8]], T.shade(L.hearth, -.5));
  // the lintel: an old beam over the opening
  T.rect(D.x0 - 14, D.y0 - 18, w + 28, 14, T.lin(0, D.y0 - 18, 0, D.y0 - 4, [[0, L.beamLit], [1, L.beam]])); T.grain(D.x0 - 14, D.y0 - 18, w + 28, 14, '#120a04', .4, false, 4);
  T.soft((D.x0 + D.x1) / 2, D.y0 - 2, w * .6, 4, .35);
  T.rect(D.x0 - 4, D.y0 - 4, 4, h + 4, T.shade(L.hearth, -.2)); T.rect(D.x1, D.y0 - 4, 4, h + 4, T.shade(L.hearth, -.4));
  T.rect(D.x0 - 2, D.y1 - 2, w + 4, 3, '#3a2a1a', .8);   // the threshold
}
/** A hatch in the ceiling (the loft's, over the parlour): a square hole between the beams, warm light falling from it. */
function _hsPaintCeilHatch(T, P, L, H) {
  const x0 = H.x0, x1 = H.x1, y0 = H.y0, y1 = H.y1;
  T.rect(x0 - 6, y0 - 4, x1 - x0 + 12, y1 - y0 + 8, T.shade(L.beam, -.3));
  T.rect(x0, y0, x1 - x0, y1 - y0, T.lin(0, y0, 0, y1, [[0, '#1a1008'], [1, '#3a2614']]));
  T.glow((x0 + x1) / 2, y1 - 4, (x1 - x0) * .7, '#ffcf80', P.tod === 'night' || P.tod === 'dusk' ? .45 : .25);
  T.rect(x0, y0, x1 - x0, 3, '#000', .45); T.rect(x0, y1 - 3, x1 - x0, 3, T.shade(L.beamLit, .1), .6);
}
/** The ladder up to the loft, leaning on the back wall from the floor into its hatch. W: the shell's way (x0..x1 at the floor). */
function _hsPaintLadder(T, P, L, Wy) {
  const fx0 = Wy.x0 + 8, fx1 = Wy.x1 - 8, ty = Wy.y0 - 30, tx0 = fx0 + 6, tx1 = fx1 - 6, foot = Wy.y1 + 22;
  _hsPaintCeilHatch(T, P, L, { x0: tx0 - 14, x1: tx1 + 14, y0: ty - 16, y1: ty + 20 });
  T.soft((fx0 + fx1) / 2, foot + 2, (fx1 - fx0) * .7, 6, .55);
  T.fill(`M${tx0 + 8} ${ty + 20}L${fx0 + 14} ${foot - 4}L${fx1 + 10} ${foot - 4}L${tx1 + 6} ${ty + 20}Z`, '#000', .12);   // its shadow on the wall
  const wood = '#8a6238';
  for (let y = ty + 26; y < foot - 10; y += 26) { const k = (y - ty) / (foot - ty), xa = tx0 + (fx0 - tx0) * k, xb = tx1 + (fx1 - tx1) * k; T.rrect(xa, y, xb - xa, 6, 2, T.lin(0, y, 0, y + 6, [[0, '#c8945a'], [1, '#6a4426']])); T.rect(xa + 2, y + 6, xb - xa - 4, 2, '#000', .25); }
  for (const [a, b] of [[tx0, fx0], [tx1, fx1]]) { T.fill(`M${a - 4} ${ty}L${b - 6} ${foot}L${b + 6} ${foot}L${a + 4} ${ty}Z`, T.lin(b - 6, 0, b + 6, 0, [[0, T.shade(wood, .25)], [.5, wood], [1, T.shade(wood, -.4)]])); T.stroke(`M${a - 1} ${ty + 4}L${b - 2} ${foot - 4}`, '#3a2414', 1, .4); }
  for (const b of [fx0, fx1]) T.ell(b, foot - 1, 8, 3, '#000', .3);
  T.glow((tx0 + tx1) / 2, ty + 30, 60, '#ffcf80', P.tod === 'night' || P.tod === 'dusk' ? .3 : .14);
}
/** A plank door in the wall (closed), its frame and latch; o.plate: a name on a little brass plate. */
function _hsPaintPlankDoor(T, P, L, D, o) {
  o = o || {}; const w = D.x1 - D.x0, h = D.y1 - D.y0, col = o.col || L.door;
  T.soft((D.x0 + D.x1) / 2, D.y1 + 4, w * .7, 8, .5);
  T.rect(D.x0 - 10, D.y0 - 12, w + 20, h + 12, T.shade(L.hearth, -.25));
  T.rect(D.x0 - 14, D.y0 - 18, w + 28, 12, T.lin(0, D.y0 - 18, 0, D.y0 - 6, [[0, L.beamLit], [1, L.beam]])); T.grain(D.x0 - 14, D.y0 - 18, w + 28, 12, '#120a04', .4, false, 4);
  T.rect(D.x0 - 4, D.y0 - 4, w + 8, h + 4, '#120c08');
  T.planksV(D.x0, D.y0, D.x1, D.y1, { base: col, w: 17, wMax: 22, var: .14, gap: .5, grainA: .4 });
  for (const y of [D.y0 + 14, D.y1 - 26]) { T.rect(D.x0 + 2, y, w - 4, 9, T.shade(col, -.25)); T.rect(D.x0 + 2, y, w - 4, 2, T.shade(col, .2), .6); }
  T.stroke(`M${D.x0 + 6} ${D.y1 - 26}L${D.x1 - 6} ${D.y0 + 24}`, T.shade(col, -.3), 7, .9);
  T.ell(D.x1 - 13, D.y0 + h * .52, 4, 4, '#2a2a2e'); T.stroke(`M${D.x1 - 28} ${D.y0 + h * .52}h15`, '#2a2a2e', 3.2); T.ell(D.x1 - 13.6, D.y0 + h * .52 - .8, 1.4, 1.4, '#8a8a90', .8);
  T.rect(D.x0 + 2, D.y1 - 3, w - 4, 3, '#ffcf80', .35);   // lamp-light under it
  if (o.plate) {
    const px = (D.x0 + D.x1) / 2, py = D.y0 + 30, pw = Math.min(w - 10, 14 + o.plate.length * 6.2);
    T.soft(px, py + 7, pw * .55, 3, .3); T.rrect(px - pw / 2, py - 8, pw, 16, 3, T.lin(0, py - 8, 0, py + 8, [[0, '#f8e098'], [.5, '#d8a848'], [1, '#8a5e22']]));
    T.rect(px - pw / 2 + 2, py - 7, pw - 4, 2, '#fff4c8', .6);
    const cx = T.cx; cx.save(); cx.fillStyle = '#3a2410'; cx.font = 'italic 600 11px Georgia, serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(o.plate, px, py + .5); cx.restore();
  }
}
/** The parlour's bay window: three lights in a deep recess, a cushioned seat in it, its panelled front below, curtains on a pole. */
function* _hsPaintBay(T, P, L) {
  const W = _hsShellP(P).window, S = HOUSE_SKY[P.tod] || HOUSE_SKY.day, d = 22;   // d: how deep the bay goes, at its sides
  const gx0 = W.x0 + d, gx1 = W.x1 - d, gy0 = W.y0 + 8, gy1 = W.y1 - 34, seat = W.y1 - 30;
  T.soft((W.x0 + W.x1) / 2, W.y1 + 8, (W.x1 - W.x0) * .6, 10, .45);
  // the recess: its back is the middle light, its sides the angled lights
  T.rect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0, T.shade(L.hearth, -.3));
  T.clipRect(gx0 + 4, gy0, gx1 - gx0 - 8, gy1 - gy0, () => _hsPaintView(T, P, gx0 + 4, gy0, gx1 - 4, gy1));
  for (const [ax, bx, sh] of [[W.x0, gx0, .06], [W.x1, gx1, -.32]]) {   // the angled side lights: the view squeezed, the glass catching the sky
    const pts = [[ax + (ax < bx ? 6 : -6), W.y0 + 12], [bx, gy0], [bx, gy1], [ax + (ax < bx ? 6 : -6), seat - 2]];
    T.clip(`M${pts.map(p => p.join(' ')).join('L')}Z`, () => { const lo = Math.min(ax, bx), hi = Math.max(ax, bx); _hsPaintView(T, P, lo, W.y0, hi + 2, gy1); T.rect(lo, W.y0, hi - lo + 2, gy1 - W.y0, T.shade(S.top, sh), .35); });
    T.stroke(`M${(ax + bx) / 2} ${(W.y0 + 12 + gy0) / 2}V${(seat + gy1) / 2 - 2}`, '#5a3e26', 3);
  }
  yield;
  // the glazing: thin bars, a transom, the frame posts at the bay's corners
  const frame = P.look === 'stone' ? '#f0ebe2' : P.look === 'timber' ? '#6a7a5a' : '#5a3e26', fsh = T.shade(frame, -.35);
  for (let i = 1; i < 3; i++) { const x = gx0 + (gx1 - gx0) * i / 3; T.stroke(`M${x} ${gy0}V${gy1}`, frame, 4); T.stroke(`M${x + 1.5} ${gy0}V${gy1}`, fsh, 1.2, .7); }
  T.stroke(`M${gx0} ${gy0 + (gy1 - gy0) * .32}H${gx1}`, frame, 4); T.stroke(`M${gx0} ${gy0 + (gy1 - gy0) * .32 + 2}H${gx1}`, fsh, 1.2, .7);
  for (const x of [gx0, gx1]) { T.rect(x - 4, gy0 - 4, 8, seat - gy0, T.lin(x - 4, 0, x + 4, 0, [[0, T.shade(frame, .15)], [1, fsh]])); }
  T.rect(W.x0 - 6, W.y0 - 6, W.x1 - W.x0 + 12, 8, frame); T.rect(W.x0 - 6, W.y0 + 2, W.x1 - W.x0 + 12, 2, '#000', .25);
  // the seat in the bay: its board, a long cushion, two plump ones, and the panelled front down to the skirting
  T.poly([[W.x0, seat], [W.x1, seat], [gx1, seat - 12], [gx0, seat - 12]], T.shade(L.beamLit, .1));
  const cush = P.look === 'stone' ? '#7a8aa8' : P.look === 'timber' ? '#a8603a' : '#8a9a6a';
  T.rrect(W.x0 + 8, seat - 12, W.x1 - W.x0 - 16, 14, 6, T.lin(0, seat - 12, 0, seat + 2, [[0, T.shade(cush, .25)], [1, T.shade(cush, -.2)]]));
  for (let x = W.x0 + 26; x < W.x1 - 20; x += 36) T.ell(x, seat - 5, 1.6, 1.6, T.shade(cush, -.4), .7);   // the buttons
  for (const [x, c, r] of [[W.x0 + 34, '#c8584a', -.2], [W.x1 - 40, '#e8c878', .25]]) { const cx = T.cx; cx.save(); cx.translate(x, seat - 18); cx.rotate(r); T.rrect(-17, -14, 34, 28, 9, T.lin(-17, -14, 17, 14, [[0, T.shade(c, .3)], [1, T.shade(c, -.25)]])); T.stroke('M-12 -9Q0 -4 12 -9M-12 9Q0 4 12 9', T.shade(c, -.35), 1, .5); cx.restore(); T.soft(x, seat - 4, 18, 3, .3); }
  const fy0 = W.y1, fy1 = 390, wood = P.look === 'stone' ? '#e8e0d0' : L.beamLit;
  T.rect(W.x0, fy0, W.x1 - W.x0, fy1 - fy0, T.lin(0, fy0, 0, fy1, [[0, T.shade(wood, -.05)], [1, T.shade(wood, -.25)]]));
  for (let i = 0; i < 3; i++) { const pw = (W.x1 - W.x0 - 32) / 3, px = W.x0 + 8 + i * (pw + 8); T.rect(px, fy0 + 8, pw, fy1 - fy0 - 16, T.shade(wood, -.16)); T.rect(px, fy0 + 8, pw, 2, '#ffffff', .2); T.rect(px + pw - 2, fy0 + 8, 2, fy1 - fy0 - 16, '#000', .2); }
  T.rect(W.x0 - 4, fy0 - 3, W.x1 - W.x0 + 8, 5, T.shade(wood, .15));
  const cur = P.look === 'stone' ? '#8a4a5a' : P.look === 'timber' ? '#4a6a8a' : '#6a7a4a';
  _hsPaintCurtains(T, P, W.x0, W.x1, W.y0, W.y1 - W.y0 + 26, cur);
  _hsPaintShaft(T, P, gx0, gx1, gy1 + 30, .8);
}
/** The parlour's small fireplace: a painted surround and mantel shelf, tiled slips, a cast-iron grate with the fire in it. */
function* _hsPaintGrate(T, P, L) {
  const SH = _hsShellP(P), H = SH.hearth, F = SH.fire, cx = (H.x0 + H.x1) / 2, night = P.tod === 'night' || P.tod === 'dusk';
  const sur = P.look === 'stone' ? '#f0ebe2' : P.look === 'timber' ? '#5a6a4a' : '#7a5232', mantelY = H.y0 + 18;
  T.soft(cx, 404, (H.x1 - H.x0) * .6, 10, .5);
  T.ell(cx, F.y0 - 40, 90, 50, T.rad(cx, F.y0 - 30, 90, [[0, '#1a1008', .25], [1, '#1a1008', 0]]));   // a little soot over the years
  // the surround
  T.rect(H.x0 + 6, mantelY + 10, H.x1 - H.x0 - 12, 400 - mantelY - 10, T.lin(H.x0, 0, H.x1, 0, [[0, T.shade(sur, .18)], [.5, sur], [1, T.shade(sur, -.28)]]));
  if (P.look !== 'stone') T.grain(H.x0 + 6, mantelY + 10, H.x1 - H.x0 - 12, 400 - mantelY - 10, T.shade(sur, -.45), .25, true, 5);
  for (const x of [H.x0 + 14, H.x1 - 34]) { T.rect(x, mantelY + 22, 20, 400 - mantelY - 34, T.shade(sur, -.1)); T.rect(x, mantelY + 22, 2, 400 - mantelY - 34, '#ffffff', .18); T.rect(x + 18, mantelY + 22, 2, 400 - mantelY - 34, '#000', .2); }
  // the tiled slips each side of the opening
  const tile = P.look === 'stone' ? '#3a64a8' : P.look === 'timber' ? '#5a8a5a' : '#2e6a7a';
  for (const [x0, x1] of [[F.x0 - 18, F.x0 - 2], [F.x1 + 2, F.x1 + 18]]) for (let y = F.y0 - 14; y < 398; y += 16) { T.rect(x0, y, x1 - x0, 15, '#f2efe6'); T.ell((x0 + x1) / 2, y + 7.5, 5, 5, tile, .8); T.ell((x0 + x1) / 2, y + 7.5, 2, 2, '#f2efe6'); T.rect(x0, y + 15, x1 - x0, 1, '#8a8478', .6); }
  yield;
  // the opening: an iron arch, the grate's basket of coals, the fire
  T.fill(`M${F.x0} 400V${F.y0 + 14}Q${F.x0} ${F.y0 - 6} ${cx} ${F.y0 - 8}Q${F.x1} ${F.y0 - 6} ${F.x1} ${F.y0 + 14}V400Z`, '#1a1a1e');
  T.fill(`M${F.x0 + 6} 400V${F.y0 + 16}Q${F.x0 + 6} ${F.y0 + 2} ${cx} ${F.y0}Q${F.x1 - 6} ${F.y0 + 2} ${F.x1 - 6} ${F.y0 + 16}V400Z`, '#0a0604');
  T.glow(cx, 380, 40, '#ff8a3a', .55);
  const gy = 372; T.rrect(F.x0 + 10, gy, F.x1 - F.x0 - 20, 18, 4, '#26262a');
  for (let i = 0; i < 9; i++) T.ell(T.rnd(F.x0 + 14, F.x1 - 14), T.rnd(gy - 2, gy + 6), 5, 3.4, T.pick(['#ff8a3a', '#ffc860', '#d84a1a', '#ffb050']), .95);
  for (const [x, k] of [[cx - 10, .9], [cx + 6, 1.15], [cx + 18, .8]]) T.flame(x, gy - 2, k);
  for (let i = 0; i < 4; i++) T.rect(F.x0 + 12, gy + 4 + i * 4, F.x1 - F.x0 - 24, 1.4, '#3a3a40');
  T.rect(F.x0 - 22, 392, F.x1 - F.x0 + 44, 8, '#2a2a2e'); T.rect(F.x0 - 22, 392, F.x1 - F.x0 + 44, 2, '#5a5a62', .8);   // the iron fender
  // the mantel shelf, and what stands on it: two brass candlesticks, a little jug of dried flowers, a china dog
  T.soft(cx, mantelY + 14, (H.x1 - H.x0) * .55, 5, .45);
  T.rect(H.x0 - 6, mantelY, H.x1 - H.x0 + 12, 12, T.lin(0, mantelY, 0, mantelY + 12, [[0, T.shade(sur, .3)], [1, T.shade(sur, -.2)]]));
  T.rect(H.x0 - 6, mantelY, H.x1 - H.x0 + 12, 2, '#ffffff', .3);
  for (const x of [H.x0 + 16, H.x1 - 16]) { T.ell(x, mantelY - 1, 6, 2, '#8a5e22'); T.rect(x - 1.6, mantelY - 14, 3.2, 13, '#d8a848'); T.rrect(x - 2.5, mantelY - 28, 5, 14, 1.4, '#fff8ec'); if (night) T.flame(x, mantelY - 29, .5); }
  T.fill(`M${cx - 30} ${mantelY}l2 -16q4 -4 8 0l2 16z`, '#e8e4dc'); T.stroke(`M${cx - 30} ${mantelY - 8}h12`, '#3a64a8', 1.2, .7);
  for (let i = 0; i < 7; i++) T.stroke(`M${cx - 24} ${mantelY - 16}q${(i - 3) * 3} -10 ${(i - 3) * 5} -18`, T.pick(['#c8a050', '#a8784a', '#d8b880']), 1, .9);
  T.ell(cx + 22, mantelY - 7, 7, 6, '#f4f0e6'); T.ell(cx + 27, mantelY - 13, 4, 4, '#f4f0e6'); T.ell(cx + 28.4, mantelY - 13.6, .9, .9, '#2a2a2a'); T.ell(cx + 20, mantelY - 10, 3, 2, '#c8584a', .6);
  T.glow(cx, 360, night ? 200 : 140, '#ff9a4a', night ? .2 : .1);
}
/** The underside of a roof slope over a room: the thatch's reed (or the boards of a slate roof), the rafters coming toward you. pts: the slope's outline, edge: its lower edge [x0, y0, x1, y1] where it meets the wall. */
function _hsPaintRoofUnder(T, P, L, pts, edge) {
  const d = `M${pts.map(p => p.join(' ')).join('L')}Z`, [ex0, ey0, ex1, ey1] = edge, len = Math.hypot(ex1 - ex0, ey1 - ey0), nx = -(ey1 - ey0) / len, ny = (ex1 - ex0) / len;   // (n: away from the wall, up toward you)
  const sx = ny < 0 ? -nx : nx, sy = ny < 0 ? -ny : ny;   // (the side the roof is on: upward)
  const ux = -sx, uy = -sy;
  T.fill(d, P.look === 'thatch' ? '#b8945a' : P.look === 'stone' ? '#8a7a64' : '#9a7650');
  T.clip(d, () => {
    if (P.look === 'thatch') { for (let i = 0; i < 700; i++) { const t = T.r(), k = T.r() * 300, x = ex0 + (ex1 - ex0) * t + ux * k, y = ey0 + (ey1 - ey0) * t + uy * k; T.stroke(`M${x} ${y}l${(ex1 - ex0) / len * 14} ${(ey1 - ey0) / len * 14}`, T.pick(['#d8b878', '#a8844a', '#c8a464', '#8a6a3a']), 1.2, .7); } }
    else for (let k = 0; k < 300; k += 14) { const c = T.shade(P.look === 'stone' ? '#9a8a70' : '#a87c50', (T.r() - .5) * .2); T.stroke(`M${ex0 + ux * k} ${ey0 + uy * k}L${ex1 + ux * k} ${ey1 + uy * k}`, c, 13); T.stroke(`M${ex0 + ux * (k + 7)} ${ey0 + uy * (k + 7)}L${ex1 + ux * (k + 7)} ${ey1 + uy * (k + 7)}`, '#2a1a10', 1, .4); }
    // the rafters: each one runs down the slope, nearer ones bigger (they come toward you)
    for (let k = 34, w = 10; k < 320; k += 46 + k * .25, w *= 1.18) {
      const ax = ex0 + ux * k, ay = ey0 + uy * k, bx = ex1 + ux * k, by = ey1 + uy * k;
      T.stroke(`M${ax} ${ay}L${bx} ${by}`, L.beam, w); T.stroke(`M${ax - ux * w * .3} ${ay - uy * w * .3}L${bx - ux * w * .3} ${by - uy * w * .3}`, L.beamLit, w * .25, .6);
      T.stroke(`M${ax + ux * (w * .5 + 2)} ${ay + uy * (w * .5 + 2)}L${bx + ux * (w * .5 + 2)} ${by + uy * (w * .5 + 2)}`, '#000', 3, .22);
    }
    T.rect(0, 0, 960, 600, T.lin(ex0, ey0, ex0 + ux * 260, ey0 + uy * 260, [[0, '#000', .05], [1, '#000', .42]]));   // dimmer up under the roof
  });
  T.stroke(`M${ex0} ${ey0}L${ex1} ${ey1}`, L.beam, 9); T.stroke(`M${ex0} ${ey0 + 3}L${ex1} ${ey1 + 3}`, '#000', 2, .35);   // the plate where the slope meets the wall
}
/** The loft's round window in the gable: a deep plaster ring, a cross of glazing bars, the vale far below. */
function _hsPaintRound(T, P, L) {
  const W = _hsShellP(P).window, cx = (W.x0 + W.x1) / 2, cy = (W.y0 + W.y1) / 2, r = (W.x1 - W.x0) / 2;
  T.soft(cx, cy + r + 8, r * .9, 7, .4);
  T.ell(cx, cy, r + 10, r + 10, T.shade(L.hearth, -.32));
  T.ell(cx + 3, cy + 3, r + 2, r + 2, T.shade(L.hearth, -.55));
  T.clip(`M${cx + r - 6} ${cy}A${r - 6} ${r - 6} 0 1 0 ${cx - r + 6} ${cy}A${r - 6} ${r - 6} 0 1 0 ${cx + r - 6} ${cy}Z`, () => { _hsPaintView(T, P, cx - r, cy - r, cx + r, cy + r, { high: true }); });
  const frame = P.look === 'stone' ? '#f0ebe2' : P.look === 'timber' ? '#6a7a5a' : '#5a3e26';
  T.stroke(`M${cx - r + 6} ${cy}H${cx + r - 6}M${cx} ${cy - r + 6}V${cy + r - 6}`, frame, 5);
  T.stroke(`M${cx + r - 5} ${cy}A${r - 5} ${r - 5} 0 1 0 ${cx - r + 5} ${cy}A${r - 5} ${r - 5} 0 1 0 ${cx + r - 5} ${cy}`, frame, 7);
  T.stroke(`M${cx - r * .7} ${cy - r * .7}A${r} ${r} 0 0 1 ${cx + r * .7} ${cy - r * .7}`, '#ffffff', 2, .25);
  T.rect(cx - r * .7, cy + r - 2, r * 1.4, 8, T.shade(L.hearth, .05)); T.rect(cx - r * .7, cy + r - 2, r * 1.4, 2, '#ffffff', .3);   // a ledge for a pot
  const S = HOUSE_SKY[P.tod] || HOUSE_SKY.day;
  if (S.shaftA > .05) T.shaft([[cx - r * .6, cy + r * .4], [cx + r * .6, cy + r * .4], [cx + r * 2.6, 600], [cx - r * .2, 600]], S.shaft, S.shaftA * .9, cy, 600);
}
/** The hatch in the loft's floor and the top of the ladder up from the parlour, a short rail round it. D: the shell's door (the ladder's top). */
function _hsPaintHatch(T, P, L, D) {
  const x0 = D.x0, x1 = D.x1, hy0 = 404, hy1 = 444, night = P.tod === 'night' || P.tod === 'dusk';
  T.poly([[x0 - 6, hy0], [x1 + 6, hy0], [x1 + 16, hy1 + 4], [x0 - 14, hy1 + 4]], T.shade(L.beam, -.2));
  T.poly([[x0, hy0 + 3], [x1, hy0 + 3], [x1 + 8, hy1], [x0 - 8, hy1]], T.lin(0, hy0, 0, hy1, [[0, '#1a1008'], [1, '#4a3018']]));
  T.glow((x0 + x1) / 2, hy1 - 6, 70, '#ffcf80', night ? .55 : .3);   // the parlour's light coming up
  const lx0 = x0 + 18, lx1 = x1 - 18, top = D.y0, wood = '#8a6238';
  for (let y = top + 18; y < hy1 - 4; y += 22) T.rrect(lx0, y, lx1 - lx0, 5, 2, T.lin(0, y, 0, y + 5, [[0, '#c8945a'], [1, '#6a4426']]));
  for (const x of [lx0, lx1]) { T.rrect(x - 5, top, 10, hy1 - top, 4, T.lin(x - 5, 0, x + 5, 0, [[0, T.shade(wood, .25)], [.5, wood], [1, T.shade(wood, -.4)]])); T.ell(x, top + 1, 5, 2.4, T.shade(wood, .35)); }
  T.soft((lx0 + lx1) / 2, top + 6, 40, 6, .2);
  // the rail: two posts and a top rail along the hatch's open side
  const rx = x1 + 22;
  for (const y of [hy0 - 2, hy1 + 2]) { T.soft(rx + (y - hy0) * .2, y + 2, 7, 2.4, .4); T.rect(rx - 3 + (y - hy0) * .2, y - 58, 6, 58, T.lin(rx - 3, 0, rx + 3, 0, [[0, T.shade(wood, .2)], [1, T.shade(wood, -.35)]])); }
  T.stroke(`M${rx} ${hy0 - 58}L${rx + (hy1 - hy0) * .2} ${hy1 - 54}`, T.shade(wood, .1), 6);
}
/** The guest room's dormer window: a little casement set back in the roof's thickness, a window box of flowers outside. */
function* _hsPaintDormer(T, P, L) {
  const W = _hsShellP(P).window, gx0 = W.x0 + 16, gx1 = W.x1 - 16, gy0 = W.y0 + 12, gy1 = W.y1 - 16, season = P.season || 'summer';
  T.soft((W.x0 + W.x1) / 2, W.y1 + 6, (W.x1 - W.x0) * .62, 10, .4);
  T.rect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0, T.shade(L.hearth, -.22));
  T.poly([[W.x0, W.y0], [gx0, gy0], [gx0, gy1], [W.x0, W.y1]], T.shade(L.hearth, .04)); T.poly([[W.x1, W.y0], [gx1, gy0], [gx1, gy1], [W.x1, W.y1]], T.shade(L.hearth, -.36)); T.poly([[W.x0, W.y0], [W.x1, W.y0], [gx1, gy0], [gx0, gy0]], T.shade(L.hearth, -.5));
  T.clipRect(gx0, gy0, gx1 - gx0, gy1 - gy0, () => {
    _hsPaintView(T, P, gx0, gy0, gx1, gy1);
    // the window box outside, along the bottom of the glass
    const dim = P.tod === 'night' ? -.6 : P.tod === 'dusk' ? -.25 : 0, by = gy1 - 14;
    T.rect(gx0 - 4, by + 4, gx1 - gx0 + 8, 12, T.shade('#7a5232', dim));
    const fl = { spring: ['#f4d8e0', '#f8e070', '#ffffff'], summer: ['#e84a5a', '#f4c040', '#c870d8'], autumn: ['#e8803a', '#c84a2a', '#f4b040'], winter: ['#2f6a3a'] }[season] || ['#e84a5a'];
    for (let i = 0; i < 22; i++) { const x = gx0 + 4 + T.r() * (gx1 - gx0 - 8), y = by + 2 - T.r() * 12; T.blob(x, y + 4, 6, 4, T.shade('#3f7a32', dim + (T.r() - .5) * .2), 1, 7, .4); if (season !== 'winter') T.ell(x, y, 3, 3, T.shade(fl[i % fl.length], dim * .8), .95); }
  });
  yield;
  const frame = P.look === 'stone' ? '#f0ebe2' : P.look === 'timber' ? '#6a7a5a' : '#f2ece0', fsh = T.shade(frame, -.35);
  T.stroke(`M${(gx0 + gx1) / 2} ${gy0}V${gy1}`, frame, 6); T.stroke(`M${gx0} ${(gy0 + gy1) / 2 - 4}H${gx1}`, frame, 4);
  T.rect(gx0 - 6, gy0 - 6, gx1 - gx0 + 12, 6, frame); T.rect(gx0 - 6, gy1, gx1 - gx0 + 12, 4, fsh); T.rect(gx0 - 6, gy0, 6, gy1 - gy0, frame); T.rect(gx1, gy0, 6, gy1 - gy0, fsh);
  T.rect(W.x0 - 8, W.y1 - 12, W.x1 - W.x0 + 16, 12, T.lin(0, W.y1 - 12, 0, W.y1, [[0, '#9a7a54'], [1, '#6a4a2c']])); T.rect(W.x0 - 8, W.y1 - 12, W.x1 - W.x0 + 16, 2, '#ffffff', .3);
  _hsPaintCurtains(T, P, W.x0, W.x1, W.y0, W.y1 - W.y0 + 24, P.look === 'stone' ? '#a86a7a' : '#d8907a');
  _hsPaintShaft(T, P, gx0, gx1, gy1, .7);
}
/** A coat peg by a door, and what hangs on it (a guest room has a dressing gown). */
function _hsPaintPeg(T, kx, ky, col, long) {
  T.ell(kx, ky, 2.6, 2.6, '#3a2818');
  const h = long ? 70 : 44;
  T.fill(`M${kx - 10} ${ky + 5}Q${kx} ${ky - 3} ${kx + 10} ${ky + 5}L${kx + 14} ${ky + h}Q${kx} ${ky + h + 6} ${kx - 14} ${ky + h}Z`, T.lin(kx - 14, 0, kx + 14, 0, [[0, T.shade(col, .15)], [.5, col], [1, T.shade(col, -.4)]]));
  T.stroke(`M${kx} ${ky + 4}V${ky + h + 2}`, T.shade(col, -.45), 1.2, .8); if (long) T.stroke(`M${kx - 12} ${ky + h * .5}q12 4 24 0`, T.shade(col, .3), 2.4, .8);
  T.soft(kx + 2, ky + h + 8, 14, 3, .22);
}

/* ---------- the rooms ---------- */
function _hsRoomFinish(T, P) {
  if (P.tod === 'night' || P.tod === 'dusk') { const nt = P.tod === 'night'; T.rect(0, 0, 960, 600, nt ? '#0a0c1e' : '#1e1020', nt ? .36 : .14); }
  T.finish({ vignette: .42, vcol: '#0a0604', dabs: 420 });
}
/** The floor of any room: its finish, the skirting, the warm pool of a fire (fx: its middle). */
function _hsRoomFloor(T, P, L, fx) {
  (HOUSE_FLOORS[P.floor] || HOUSE_FLOORS['hff-boards'])(T, 400, 600);
  T.skirt(402, .5);
  T.rect(0, 388, 960, 13, T.lin(0, 388, 0, 401, [[0, T.shade(L.skirt, .25)], [1, L.skirt]])); T.rect(0, 388, 960, 2, '#ffffff', .18);
  if (fx != null) { const night = P.tod === 'night' || P.tod === 'dusk'; T.ell(fx, 470, 260, 60, T.rad(fx, 450, 260, [[0, '#ff9a4a', night ? .2 : .1], [1, '#ff9a4a', 0]])); }
}
function _hsSpecRoom(P) {
  const SH = _hsShellP(P), L = HOUSE_LOOK_PAL[P.look] || HOUSE_LOOK_PAL.thatch, S = HOUSE_SKY[P.tod] || HOUSE_SKY.day, W = SH.window, night = P.tod === 'night', rain = P.wx === 1;
  const wx = (W.x0 + W.x1) / 2, F = SH.fire, fireX = F ? (F.x0 + F.x1) / 2 : null;
  const fx = {}, lights = [{ id: 'hs-window', x: wx, y: W.y1 - 30, radius: 300, height: 140, color: S.shaft, intensity: S.win * (rain ? .6 : 1) }];
  if (S.shaftA > .05 && !rain) fx.motes = [{ x0: W.x0, x1: W.x1 + 140, y0: W.y1, y1: 560, n: 14, c: '#fff6dc', a: .4, rise: 4 }];
  if (rain) fx.streaks = [{ x: W.x0 + 16, y: W.y0 + 12, w: W.x1 - W.x0 - 32, h: W.y1 - W.y0 - 40, a: .3, speed: 240 }];
  if (F) { fx.flicker = [{ x: fireX, y: F.y1 - 24, r: 90, c: '#ff8a3a', a: night ? .26 : .15, amt: .32 }, { x: fireX, y: 470, r: 170, c: '#ff9a4a', a: night ? .12 : .06, amt: .22, depth: 60 }]; fx.motes = (fx.motes || []).concat([{ x0: fireX - 30, x1: fireX + 30, y0: F.y0 - 10, y1: F.y1 - 20, n: 4, c: '#ffc070', a: .5, rise: 22 }]); lights.push({ id: 'hs-fire', x: fireX, y: F.y1 - 30, radius: night ? 300 : 240, height: 50, color: '#ff9a4a', intensity: night ? .42 : .24 }); }
  if (SH.kind === 'loft') lights.push({ id: 'hs-hatch', x: (SH.door.x0 + SH.door.x1) / 2, y: 430, radius: 220, height: 30, color: '#ffcf80', intensity: night ? .32 : .16 });
  const amb = Math.max(.42, S.amb - (rain ? .08 : 0) - (SH.kind === 'loft' ? .08 : 0));
  return {
    plate: '#2a1c12', ambient: amb, lights, fx,
    *paint(T) {
      T.rect(0, 0, 960, 600, L.plate);
      if (SH.kind === 'parlour') {
        yield* _hsPaintCeiling(T, P, L, { herbs: false, soot: fireX, sootR: 180, hatch: null }); yield;
        _hsPaintWall(T, P, L); yield;
        yield* _hsPaintBay(T, P, L); yield;
        yield* _hsPaintGrate(T, P, L); yield;
        _hsPaintOpening(T, P, L, SH.door, { beyond: 'kitchen' }); yield;
        if (SH.way) { _hsPaintLadder(T, P, L, SH.way); yield; }
        _hsRoomFloor(T, P, L, fireX);
        const H = SH.hearth; T.poly([[H.x0 + 8, 400], [H.x1 - 8, 400], [H.x1 + 4, 428], [H.x0 - 4, 428]], '#6a645a'); T.poly([[H.x0 + 10, 402], [H.x1 - 10, 402], [H.x1, 426], [H.x0, 426]], T.lin(0, 402, 0, 426, [[0, '#a8a296'], [1, '#8a847a']])); T.rect(H.x0, 402, H.x1 - H.x0, 2, '#ffffff', .2);
        yield;
      } else if (SH.kind === 'loft') {
        // the gable wall first, then the roof's two slopes over it, the round window, the hatch, the guest room's door
        const gable = `M0 400L0 292L480 36L960 292L960 400Z`;
        T.clip(gable, () => { (HOUSE_WALLS[P.wall] || HOUSE_WALLS['hfw-limewash'])(T, { x0: 0, x1: 960, y0: 36, y1: 400 }); T.rect(0, 36, 960, 364, T.lin(0, 36, 0, 400, [[0, '#0a0604', .38], [.4, '#0a0604', .06], [1, '#0a0604', .14]])); T.rect(0, 36, 960, 364, T.lin(0, 0, 960, 0, [[0, '#0a0604', .36], [.2, '#0a0604', 0], [.8, '#0a0604', 0], [1, '#0a0604', .36]])); });
        yield;
        _hsPaintRoofUnder(T, P, L, [[0, 0], [480, 0], [480, 36], [0, 292]], [0, 292, 480, 36]); yield;
        _hsPaintRoofUnder(T, P, L, [[480, 0], [960, 0], [960, 292], [480, 36]], [480, 36, 960, 292]); yield;
        T.rect(472, 0, 16, 40, T.lin(472, 0, 488, 0, [[0, L.beamLit], [1, L.beam]]));   // the ridge, end on
        T.rect(318, 104, 324, 16, T.lin(0, 104, 0, 120, [[0, L.beamLit], [.4, L.beam], [1, T.shade(L.beam, -.45)]])); T.grain(318, 104, 324, 16, '#120a04', .45, false, 4); T.soft(480, 124, 160, 4, .3);   // the collar beam
        _hsPaintRound(T, P, L); yield;
        if (SH.way) { _hsPaintPlankDoor(T, P, L, SH.way, { plate: P.guest ? P.guest + '’s room' : '' }); yield; }
        _hsRoomFloor(T, P, L, null);
        _hsPaintHatch(T, P, L, SH.door); yield;
      } else {   // the guest room
        yield* _hsPaintCeiling(T, P, L, { herbs: false, soot: null }); yield;
        T.clip('M0 150L620 150L960 300L960 400L0 400Z', () => _hsPaintWall(T, P, L)); yield;
        _hsPaintRoofUnder(T, P, L, [[620, 0], [960, 0], [960, 300], [620, 150]], [620, 150, 960, 300]); yield;
        yield* _hsPaintDormer(T, P, L); yield;
        _hsPaintPlankDoor(T, P, L, SH.door, {}); _hsPaintPeg(T, SH.door.x1 + 30, SH.door.y0 + 8, '#c8a0b8', true); yield;
        _hsRoomFloor(T, P, L, null); yield;
      }
      _hsRoomFinish(T, P);
    },
  };
}
