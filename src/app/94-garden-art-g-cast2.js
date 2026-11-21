/* ============================================================
   THE VALE'S CAST SEEN FROM THE FRONT AND FROM BEHIND (npcs-PLAN 3.6, Phase 1). 94-garden-art-g-cast.js draws each villager side on;
   these are the same people walking towards you and away from you, in the same painted manner (a shade silhouette, the lit form laid
   over it toward the sun at the upper left, a light glaze, short strokes of fur and cloth), the same colours, hats and things they carry.
   With the side drawing (mirrored for the west) that is every way round, like the gardener's family of drawings (gplYawDir).
   The limbs carry the gardener's rig names as well as their own (gpl-root, gpl-up, gpl-lf legs, gpl-af arms, gpl-lg / gpl-as side on),
   so the one stride driver (_gmvStride, 94-garden-zz-6move.js) walks them: feet planted for the stance part of each step and moved by the
   ground actually covered, hands that rise and fall from the front and the back, no bob. Nothing here is per character code beyond its
   look: one builder, a row of looks (_GCF_LOOK).
   gardenCastViewSvg(id, view, o) -> SVG fragment (feet at 0,0), view 's' front or 'n' back; '' for an id without a look.
   ============================================================ */
const _GCF_LOOK = Object.freeze({
  //        fur / skin   clothes            legs            feet         hip  gap  leg w  shoulders  body top   head y  head rx,ry  arm colour  hand
  tam:      { fur: '#4e4446', cloth: '#6e8a4e', leg: '#45403a', foot: '#d9a0a0', hy: -6, gap: 4.6, lw: 4.4, sh: [11, -24], top: -30, bot: -4, w: 13, head: [-33, 10.4, 9.2], arm: '#6e8a4e', hand: '#d9a0a0', armL: 11 },
  bramble:  { fur: '#8a8884', cloth: '#e6dcc4', vest: '#8a4a34', leg: '#3a3432', foot: '#2e2a28', hy: -12, gap: 5.6, lw: 5.6, sh: [12.5, -33], top: -38, bot: -10, w: 14, head: [-43, 10, 9], arm: '#e6dcc4', hand: '#3a3432', armL: 13 },
  pip:      { fur: '#7a5636', cloth: '#3f7fa8', leg: '#7a5636', foot: '#5f4430', hy: -11, gap: 3.6, lw: 4, sh: [9, -31], top: -36, bot: -9, w: 10, head: [-41.5, 8, 7.4], arm: '#3f7fa8', hand: '#7a5636', armL: 12 },
  thistle:  { fur: '#b08a68', cloth: '#a85a6a', apron: '#efe4d0', leg: '#8a6a50', foot: '#4a3a30', hy: -5, gap: 3.4, lw: 3, sh: [10.5, -25], top: -30, bot: -3, w: 12.5, head: [-36, 7.8, 7.2], arm: '#a85a6a', hand: '#b08a68', armL: 10 },
  wick:     { fur: '#8a6a44', cloth: '#8a6a44', breast: '#e4d4b8', leg: '#c8a060', foot: '#c8a060', hy: -4, gap: 3, lw: 2.6, sh: [11, -30], top: -40, bot: -3, w: 13, head: [-40, 12.4, 10.4], arm: '#7a5c3a', hand: '#7a5c3a', armL: 14, wings: true },
  quince:   { fur: '#b8926a', cloth: '#d8b84a', apron: '#f2ead8', leg: '#b8926a', foot: '#efe2cc', hy: -9, gap: 3.6, lw: 3.4, sh: [9, -29], top: -34, bot: -6, w: 10.5, head: [-40, 7.8, 7.4], arm: '#d8b84a', hand: '#b8926a', armL: 11 },
  hollin:   { fur: '#8a5a36', cloth: '#c8b894', vest: '#4f6a3a', leg: '#5a4a3a', foot: '#3a2a1e', hy: -24, gap: 3.6, lw: 4.4, sh: [8.6, -45], top: -49, bot: -21, w: 9.5, head: [-61, 5.8, 7], arm: '#4f6a3a', hand: '#8a5a36', armL: 17 },
  angler:   { fur: '#e2b894', cloth: '#5f6a4a', leg: '#4a4a3e', foot: '#3e4a3a', hy: -20, gap: 3.4, lw: 4.4, sh: [9.6, -41], top: -45, bot: -15, w: 11, head: [-52, 6.8, 7.4], arm: '#5f6a4a', hand: '#e2b894', armL: 16 },
  perpetua: { fur: '#b8a890', cloth: '#c88a5a', hy: 0, shell: true, head: [-20, 4.6, 5.4], top: -30, bot: 0, w: 12 },
});
function _gcfBody(K, L, c, back) {
  const { f, form } = K, w = L.w, t = L.top, b = L.bot, m = b - (b - t) * 0.45;
  const outer = `M${f(-w)} ${f(b)}C${f(-w - 2)} ${f(m)} ${f(-w * 0.82)} ${f(t + 1.5)} 0 ${f(t)}C${f(w * 0.82)} ${f(t + 1.5)} ${f(w + 2)} ${f(m)} ${f(w)} ${f(b)}C${f(w * 0.5)} ${f(b + 3.2)} ${f(-w * 0.5)} ${f(b + 3.2)} ${f(-w)} ${f(b)}z`;
  const iw = w - 1, it = t + 1.2, ib = b - 1;
  const inner = `M${f(-iw - 0.6)} ${f(ib)}C${f(-iw - 2.4)} ${f(m - 0.6)} ${f(-iw * 0.84)} ${f(it + 1.4)} ${f(-0.6)} ${f(it)}C${f(iw * 0.7)} ${f(it + 1.6)} ${f(iw + 0.8)} ${f(m)} ${f(iw - 0.6)} ${f(ib)}C${f(iw * 0.4)} ${f(ib + 2.6)} ${f(-iw * 0.5)} ${f(ib + 2.6)} ${f(-iw - 0.6)} ${f(ib)}z`;
  const lit = `M${f(-w * 0.8)} ${f(b - 3)}C${f(-w * 0.95)} ${f(m)} ${f(-w * 0.6)} ${f(t + 3)} ${f(-w * 0.1)} ${f(t + 1.6)}C${f(-w * 0.5)} ${f(t + 5)} ${f(-w * 0.72)} ${f(m)} ${f(-w * 0.58)} ${f(b - 3)}z`;
  return form(c, outer, inner, back ? null : lit, 0.5) + K.strokes(0, (t + b) / 2, w * 0.75, (b - t) * 0.4, 30, 1.6, 0.15, K.T(c)[back ? 3 : 2], 0.5, back ? 0.2 : 0.24);
}
function _gcfLegs(K, L, back) {
  const { A, P, G } = K, out = [];
  if (L.shell) return '';
  for (const [side, cls] of [[-1, 'gca-b gpl-lf gpl-a'], [1, 'gca-a gpl-lf gpl-b']]) {
    const x = side * L.gap, c = side < 0 ? L.leg : A.mix(L.leg, '#2c3424', 0.14), ft = K.T(L.foot);
    let s = K.limb(x, L.hy, Math.PI + side * 0.03, -L.hy - 1.2, L.lw, L.lw * 0.86, c).d;
    // the foot seen end on: the toes towards you (front) or the heel (back), a round shape under the leg
    s += P(ft[1], A.ell(x + side * 0.5, -1.1, L.lw * 0.78, 1.9)) + P(ft[0], A.ell(x + side * 0.4 - 0.3, -1.5, L.lw * 0.62, 1.3));
    if (!back) s += K.S(ft[3], 0.4, `M${K.f(x - 1)} ${K.f(-0.3)}v0.9M${K.f(x + 1)} ${K.f(-0.3)}v0.9`, 0.6);
    out.push(G('gca-lg ' + cls, x, L.hy, s));
  }
  return out.join('');
}
function _gcfArms(K, L, back, hold) {
  const { A, P, G } = K;
  if (L.shell) return ['', ''];
  const mk = (side) => {
    const x = side * L.sh[0], y = L.sh[1], c = side < 0 ? L.arm : A.mix(L.arm, '#2c3424', 0.12);
    if (L.wings) {   // an owl's folded wing down each side: a barred feather mass, the tip a little out
      const t = K.T(c), d = `M${K.f(x)} ${K.f(y)}C${K.f(x + side * 4.6)} ${K.f(y + 6)} ${K.f(x + side * 4)} ${K.f(y + 18)} ${K.f(x + side * 1.4)} ${K.f(y + 24)}C${K.f(x - side * 1.4)} ${K.f(y + 18)} ${K.f(x - side * 2.4)} ${K.f(y + 8)} ${K.f(x)} ${K.f(y)}z`;
      return P(t[1], d) + P(t[0], d, 0.0) + K.S(t[3], 0.6, `M${K.f(x - side * 0.6)} ${K.f(y + 6)}l${side * 2.4} 1.4M${K.f(x - side * 0.4)} ${K.f(y + 11)}l${side * 2.6} 1.4M${K.f(x)} ${K.f(y + 16)}l${side * 2.2} 1.2`, 0.7) + K.S(t[2], 0.5, `M${K.f(x + side * 0.6)} ${K.f(y + 2)}q${side * 2.6} 8 ${side * 1.2} 18`, 0.5);
    }
    const a = K.limb(x, y, Math.PI - side * 0.16, L.armL, L.lw * 0.82 + 0.4, L.lw * 0.66, A.mix(c, '#3a3020', 0.12)), ht = K.T(L.hand);
    return a.d + P(ht[1], A.ell(a.tip[0], a.tip[1] + 0.8, 2.6, 2.4)) + P(ht[0], A.ell(a.tip[0] - 0.3, a.tip[1] + 0.4, 2.1, 1.9)) + (hold && side === 1 ? hold(a.tip[0], a.tip[1] + 1) : '');
  };
  return [G('gca-ar gca-b gpl-af gpl-b', -L.sh[0], L.sh[1], mk(-1)), G('gca-ar gca-a gpl-af gpl-a is-r', L.sh[0], L.sh[1], mk(1))];
}
function _gcfHead(K, L, c) {
  const { A, form } = K, [cy, rx, ry] = L.head;
  return form(c, A.ell(0, cy, rx, ry), A.ell(-0.6, cy - 0.7, rx * 0.92, ry * 0.9), A.ell(-rx * 0.38, cy - ry * 0.44, rx * 0.4, ry * 0.3), 0.45) + K.strokes(0, cy, rx * 0.8, ry * 0.75, 26, 1.3, 0, K.T(c)[2], 0.45, 0.3);
}
/** The things each villager is: ears, faces, hats, what they carry. front: toward you; returns {under (behind the body), over (after the head), hold (a fn for the right hand)}. */
function _gcfParts(id, K, L, back) {
  const { A, P, S, eye, f } = K, [cy, rx, ry] = L.head, o = { under: '', head: '', over: '', hold: null };
  const fr = !back;
  if (id === 'tam') {
    const pk = K.T('#d9a0a0'), cap = K.T('#8a6a44');
    if (fr) {
      o.head += P(pk[1], 'M-3.6 -31C-3.8 -27 -2 -24.4 0 -24.2C2 -24.4 3.8 -27 3.6 -31C2 -32 -2 -32 -3.6 -31z') + P(pk[0], 'M-2.8 -30.6C-3 -27.4 -1.6 -25.4 0 -25.2C1.4 -25.6 2.6 -27.6 2.6 -30.4C1.4 -31.2 -1.6 -31.2 -2.8 -30.6z') + P(pk[3], A.ell(0, -24.8, 1.6, 1.1)) + P('#fff6ec', A.circ(-0.5, -25.3, 0.4), 0.8);
      o.head += S('#f0e4cc', 0.3, 'M-2.6 -27l-4.4 -0.8M-2.6 -26.2l-4.2 0.8M2.6 -27l4.4 -0.8M2.6 -26.2l4.2 0.8', 0.55);
      o.head += eye(-3.6, -34.6, 0.85) + eye(3.6, -34.6, 0.85) + S('#e0d0a8', 0.55, 'M-5.7 -34.6a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0 -4.2 0M1.5 -34.6a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0 -4.2 0M-1.5 -34.8h3', 0.9);
      o.head += P(A.mix('#d9a0a0', '#d86060', 0.25), A.ell(-6.4, -30.6, 1.6, 0.9), 0.3) + P(A.mix('#d9a0a0', '#d86060', 0.25), A.ell(6.4, -30.6, 1.6, 0.9), 0.3);
    }
    o.head += P(cap[1], 'M-9.6 -38.6C-9.4 -44 -4 -46.4 0 -46.4C4 -46.4 9.4 -44 9.6 -38.6C4 -37.8 -4 -37.8 -9.6 -38.6z') + P(cap[0], 'M-8.8 -39.2C-8.6 -43.6 -4 -45.6 -0.4 -45.6C3.4 -45.6 8 -43.6 8.4 -39.4C3.4 -38.8 -3.6 -38.8 -8.8 -39.2z') + P(cap[2], 'M-7 -41.6C-5 -44.2 -2 -45 0.6 -45C-2.4 -43.8 -5 -42.8 -7 -41.6z', 0.55) + S(cap[1], 0.4, 'M0 -46V-39', 0.6);
    if (fr) o.head += P(cap[3], 'M-7.6 -39.6C-4 -37.2 4 -37.2 7.6 -39.6C5 -36.8 -5 -36.8 -7.6 -39.6z');
    o.over += P(K.T('#6e8a4e')[3], A.circ(0, -22, 0.7) + A.circ(0, -16.6, 0.7) + A.circ(0, -11.2, 0.7), fr ? 0.7 : 0);
    o.hold = (x, y) => S('#6a4a2e', 1.5, `M${f(x + 1)} ${f(y - 12)}L${f(x + 1)} ${f(y + 6)}`, 1) + P('#7f8a90', `M${f(x - 1.8)} ${f(y + 5)}h5.6v3.2q-0.6 2.2 -2.8 3q-2.2 -0.8 -2.8 -3z`) + S('#6a4a2e', 1.4, `M${f(x - 1)} ${f(y - 12.4)}h4`);
  } else if (id === 'bramble') {
    const vt = K.T('#8a4a34'), hat = K.T('#5a4a3a');
    o.over += fr ? P(vt[1], 'M-14 -12C-15.4 -24 -13 -33 -7 -36.6L-3 -14z') + P(vt[0], 'M-13.2 -13C-14.4 -24 -12 -32 -7 -35.2L-3.8 -14.6z') + P(vt[1], 'M14 -12C15.4 -24 13 -33 7 -36.6L3 -14z') + P(vt[0], 'M13.2 -13C14.4 -24 12 -32 7 -35.2L3.8 -14.6z') + P('#d8c090', A.circ(-4.2, -22, 0.7) + A.circ(-4.4, -17, 0.7))
      : P(vt[1], 'M-14 -12C-16 -26 -12 -37 0 -38C12 -38 16 -26 14 -12C8 -8 -8 -8 -14 -12z') + P(vt[0], 'M-13 -13C-14.6 -25 -11 -35.6 -0.6 -36.4C10 -36.4 12.6 -25 12.4 -13.4C7 -10 -7.6 -10 -13 -13z') + S(vt[3], 0.6, 'M0 -36V-11M-9 -24q9 2 18 0', 0.6);
    if (fr) {   // the badger's face: white, a dark band from the nose over each eye to the ear
      o.head += P('#ece6da', 'M-3.6 -51C-5 -46 -5 -40 -2.6 -36C-1.4 -34.6 1.4 -34.6 2.6 -36C5 -40 5 -46 3.6 -51C1.6 -52 -1.6 -52 -3.6 -51z');
      o.head += P('#2a2624', 'M-3.4 -50C-6.6 -47 -7 -42 -4.4 -37.8C-6.4 -40 -9.6 -45 -8 -50C-6.6 -51.6 -4.4 -51.4 -3.4 -50z') + P('#2a2624', 'M3.4 -50C6.6 -47 7 -42 4.4 -37.8C6.4 -40 9.6 -45 8 -50C6.6 -51.6 4.4 -51.4 3.4 -50z');
      o.head += eye(-5.2, -43.4, 0.85) + eye(5.2, -43.4, 0.85) + P('#1a1612', A.ell(0, -36.4, 1.8, 1.3)) + P('#fffaf0', A.circ(-0.6, -36.8, 0.4), 0.8);
    } else o.head += P('#6e6c68', A.ell(0, -44, 7, 6), 0.4);
    o.head += P('#2a2624', A.ell(-8.4, -49.4, 2.4, 2.2)) + P('#2a2624', A.ell(8.4, -49.4, 2.4, 2.2)) + P('#d8d2c4', A.ell(-8.4, -49.8, 1.2, 1.1)) + P('#d8d2c4', A.ell(8.4, -49.8, 1.2, 1.1));
    o.head += P(hat[1], A.ell(0, -51, 15, 3.6)) + P(hat[0], A.ell(-0.4, -51.4, 14, 2.8)) + P(hat[1], 'M-8 -51C-8 -57 -5 -59.6 0 -59.6C5 -59.6 8 -57 8 -51z') + P(hat[0], 'M-7.2 -51.4C-7.2 -56.6 -4.6 -58.8 -0.4 -58.8C3.6 -58.8 6.6 -56.6 6.8 -51.4z') + P(hat[2], 'M-6 -54C-5 -57 -3 -58 -0.6 -58.2C-3 -57 -4.6 -55.6 -6 -54z', 0.5) + P('#8a4a34', 'M-7.4 -52.6h14.6v1.6h-14.6z', 0.9);
    o.under += back ? '' : P('#c8b080', 'M10 -30l8 -6l1.6 2l-8 6z') + P('#e8d8b0', A.ell(18.8, -35, 1.4, 1.6));   // the map roll's end under the arm
    if (back) o.over += P('#c8b080', 'M-16 -34l26 -4l0.4 2.6l-26 4z') + P('#e8d8b0', A.ell(10.4, -36.6, 1.4, 1.6));
  } else if (id === 'pip') {
    const st = K.T('#d8503a');
    if (back) o.under += ''; else o.under += P(K.T('#7a5636')[1], 'M8 -2C14 -1 18 -4 18.6 -9C19 -12 17.4 -13 16.6 -11C16 -7.6 13 -5 8 -5z');   // the tail behind, its tip curling up beside him
    if (back) o.over += P(K.T('#7a5636')[1], 'M-3 -10C-4 -4 -2 1 2 2C6 3 9 1 9.4 -2C9.6 -4 8 -4.4 7.4 -3C6.8 -1 4 -0.2 2 -1C0 -2 -0.4 -6 0 -10z') + P(K.T('#7a5636')[0], 'M-2.2 -10C-3 -5 -1.4 -0.6 2 0.4C4.6 1 7 0.2 7.8 -1.6C6 -0.6 3.4 -0.4 1.6 -1.4C0 -2.4 -0.6 -6 -0.2 -10z');
    if (fr) {
      o.head += P('#e0c4a0', 'M-5 -40C-5 -36 -2.6 -34.4 0 -34.4C2.6 -34.4 5 -36 5 -40C3 -41.6 -3 -41.6 -5 -40z') + P('#2a1a10', A.ell(0, -39.6, 1.7, 1.2)) + S('#2a1a10', 0.5, 'M0 -38.4v1.6M-1.6 -36.6q1.6 1 3.2 0', 0.8);
      o.head += eye(-3.6, -43.4, 0.85) + eye(3.6, -43.4, 0.85) + S('#f0e0c8', 0.3, 'M-3.4 -38.6l-4.4 -0.6M-3.4 -37.6l-4.2 0.8M3.4 -38.6l4.4 -0.6M3.4 -37.6l4.2 0.8', 0.55);
    }
    o.head += P(K.T('#7a5636')[1], A.ell(-6.8, -47, 2, 1.8)) + P(K.T('#7a5636')[1], A.ell(6.8, -47, 2, 1.8)) + P('#4a3020', A.ell(-6.8, -47, 1, 0.9)) + P('#4a3020', A.ell(6.8, -47, 1, 0.9));
    o.over += P(st[1], 'M-8.6 -34.6C-4 -32 4 -32 8.6 -34.6C9 -32 8.6 -30.4 7.6 -29.6C3 -28 -3 -28 -7.6 -29.6C-8.6 -30.4 -9 -32 -8.6 -34.6z') + P(st[0], 'M-7.8 -34C-3.6 -31.8 3.6 -31.8 7.8 -34C8 -32 7.6 -31 6.8 -30.4C2.6 -29 -2.6 -29 -6.8 -30.4C-7.6 -31 -8 -32 -7.8 -34z');
    o.over += `<g class="gca-cl" style="transform-origin:${fr ? 4 : -4}px -30px">` + P(st[1], fr ? 'M3 -31L5.6 -18L8.8 -18.6L6.6 -31z' : 'M-3 -31L-5.6 -18L-8.8 -18.6L-6.6 -31z') + P(st[0], fr ? 'M3.6 -31L5.8 -19.4L7.8 -19.6L6 -31z' : 'M-3.6 -31L-5.8 -19.4L-7.8 -19.6L-6 -31z') + '</g>';
    o.over += P('#7a5a34', fr ? 'M-9.4 -22h6.6v6.4h-6.6z' : 'M-8 -30L8 -16l-1 1.4L-9 -28.6z', 0.95) + (fr ? S('#5a3e22', 0.6, 'M-8.6 -31L-6 -22', 0.9) : '');   // the satchel and its strap
  } else if (id === 'thistle') {
    const sp = K.T('#6a5442'), r = K.r;
    // the cloak of spines: behind her from the front (a spiked halo round the head and shoulders), all over her back from behind
    let q = ''; const cx = 0, top = back ? -46 : -44, n = back ? 26 : 18;
    for (let i = 0; i < n; i++) { const t = -Math.PI * 0.95 + (Math.PI * 0.9) * (i / (n - 1)) + (r() - 0.5) * 0.1, R = 14 + r() * 3, bx = cx + Math.cos(t) * 9, by = -26 + Math.sin(t) * 12; q += `M${f(bx - 1.6)} ${f(by)}L${f(cx + Math.cos(t) * R)} ${f(-26 + Math.sin(t) * (R + 4))}L${f(bx + 1.6)} ${f(by)}z`; }
    const mass = `M-15 -4C-18 -14 -17 -30 -10 ${top + 4}C-4 ${top} 4 ${top} 10 ${top + 4}C17 -30 18 -14 15 -4C8 -1 -8 -1 -15 -4z`;
    const spines = P(sp[3], q) + P(sp[1], mass) + P(sp[0], `M-14 -5C-16.6 -14 -15.6 -29 -9.4 ${top + 5.4}C-4 ${top + 1.6} 3 ${top + 1.6} 8.6 ${top + 5.4}C11 -30 10 -16 8 -6z`, 0.9) + K.strokes(0, -24, 12, 16, 60, 3, 0, sp[2], 0.7, 0.55) + K.strokes(0, -22, 13, 16, 40, 3.4, 0.2, sp[3], 0.7, 0.5);
    if (back) o.over += spines; else o.under += spines;
    if (fr) {
      o.over += P(K.T('#efe4d0')[1], 'M-7 -22C-8 -14 -7.6 -7 -6.6 -4C-2 -2.6 2 -2.6 6.6 -4C7.6 -7 8 -14 7 -22C3 -23.4 -3 -23.4 -7 -22z') + P('#efe4d0', 'M-6.2 -21.4C-7 -14 -6.8 -7.6 -6 -4.8C-2 -3.6 2 -3.6 6 -4.8C6.8 -7.6 7 -14 6.2 -21.4C2.6 -22.6 -2.6 -22.6 -6.2 -21.4z') + S('#d8c8b0', 0.4, 'M-6 -22L-4 -29M6 -22L4 -29', 0.9);
      o.over += P('#6a9a4a', A.ell(4.4, -12, 2, 1.6)) + P('#1a1612', A.circ(3.6, -12.8, 0.4) + A.circ(5.2, -12.8, 0.4));   // the frog in her pocket
      o.head += P('#d8b898', 'M-3.4 -35C-3.4 -31.4 -1.6 -29.4 0 -29.2C1.6 -29.4 3.4 -31.4 3.4 -35z') + P('#1a1612', A.ell(0, -29.6, 1.2, 0.9)) + eye(-3, -37.4, 0.75) + eye(3, -37.4, 0.75) + P('#d87070', A.ell(-4.8, -33.4, 1.3, 0.7), 0.3) + P('#d87070', A.ell(4.8, -33.4, 1.3, 0.7), 0.3);
    }
    o.head += P(K.T('#b08a68')[1], A.ell(-6, -41.6, 1.8, 1.6)) + P(K.T('#b08a68')[1], A.ell(6, -41.6, 1.8, 1.6));
    o.hold = (x, y) => S('#a07a4a', 1.1, `M${f(x)} ${f(y - 8)}L${f(x)} ${f(y + 4)}`, 1) + P('#b08a58', A.ell(x, y - 9, 1.6, 2.4));
    if (back) o.over += P('#efe4d0', 'M-1 -14C-5 -17 -7 -14 -5 -12C-3 -11 -1 -13 0 -14C1 -13 3 -11 5 -12C7 -14 5 -17 1 -14z') + S('#efe4d0', 1, 'M-1 -13L-3 -7M1 -13L3 -7', 0.9);   // her apron's bow
  } else if (id === 'wick') {
    const bt = K.T('#e4d4b8'), ft = K.T('#8a6a44');
    if (fr) {
      o.over += P(bt[1], 'M-8 -30C-9 -20 -7 -8 0 -5C7 -8 9 -20 8 -30C4 -32 -4 -32 -8 -30z') + P(bt[0], 'M-7.2 -29.4C-8 -20 -6.2 -9 0 -6.2C6 -9 7.6 -20 7 -29.4C3.6 -31 -3.6 -31 -7.2 -29.4z') + S(ft[1], 0.6, 'M-4 -26q1 1 2 0M2 -26q1 1 2 0M-5 -21q1 1 2 0M-1 -21q1 1 2 0M3 -21q1 1 2 0M-4 -16q1 1 2 0M2 -16q1 1 2 0M-2 -11q1 1 2 0', 0.7);
      o.head += P('#efe4cc', A.ell(-4.4, -40, 4.6, 4.6)) + P('#efe4cc', A.ell(4.4, -40, 4.6, 4.6)) + S('#a88a62', 0.6, 'M-9 -40a4.6 4.6 0 0 1 9 -1M0 -41a4.6 4.6 0 0 1 9 1', 0.7);
      o.head += P('#1a1612', A.circ(-4.2, -40, 2.1) + A.circ(4.2, -40, 2.1)) + P('#e0a030', A.circ(-4.2, -40, 1.6) + A.circ(4.2, -40, 1.6)) + P('#120e0a', A.circ(-4.1, -39.9, 0.9) + A.circ(4.3, -39.9, 0.9)) + P('#fffaf0', A.circ(-4.8, -40.6, 0.5) + A.circ(3.6, -40.6, 0.5), 0.9);
      o.head += P('#c8a050', 'M-1.2 -37.6L0 -34L1.2 -37.6z');
    } else o.over += S(ft[3], 0.7, 'M-8 -32q2 1.6 4 0q2 1.6 4 0q2 1.6 4 0q2 1.6 4 0M-9 -24q2 1.6 4 0q2 1.6 4 0q2 1.6 4 0q2 1.6 4 0M-8 -16q2 1.6 4 0q2 1.6 4 0q2 1.6 4 0q2 1.6 4 0', 0.6);
    o.head += `<g class="gca-ear" style="transform-origin:-7px -48px">${P(ft[1], 'M-9.6 -47L-11 -55L-5 -49.4z')}</g><g class="gca-ear" style="transform-origin:7px -48px">${P(ft[1], 'M9.6 -47L11 -55L5 -49.4z')}</g>`;
  } else if (id === 'quince') {
    const ft = K.T('#b8926a'), hat = K.T('#e0c47a');
    // the ears, out of the hat: one tall and upright, one folded over at the tip
    o.head += `<g class="gca-ear" style="transform-origin:-3px -46px">${P(ft[1], 'M-5.4 -45C-7 -54 -6.6 -63 -4 -67C-1.6 -63 -1 -54 -1.6 -45z') + P('#e8c0b0', 'M-4.6 -47C-5.6 -54 -5.2 -61 -4 -64.4C-2.8 -61 -2.4 -54 -2.6 -47z', 0.8)}</g>`;
    o.head += `<g class="gca-ear" style="transform-origin:3px -46px">${P(ft[1], 'M1.6 -45C1.4 -51 2.6 -56 5 -57C8.4 -57.4 11 -54 11.6 -50C10 -52 7.6 -53.6 5.4 -52.6C4 -51 4 -48 4.6 -45z') + P('#e8c0b0', 'M2.6 -46C2.4 -50 3.2 -54 5 -55C7.6 -55.4 9.4 -53.6 10.2 -51.6C8 -52.6 6 -52.4 4.8 -51.4C3.8 -50 3.6 -48 3.8 -46z', 0.7)}</g>`;
    o.head += `<g class="gca-hat" style="transform-origin:0px -46px">${P(hat[1], A.ell(0, -45.6, 13.6, 3.2)) + P(hat[0], A.ell(-0.4, -46, 12.8, 2.6)) + P(hat[1], 'M-6.6 -45.8C-6.6 -50 -4 -51.6 0 -51.6C4 -51.6 6.6 -50 6.6 -45.8z') + P(hat[0], 'M-6 -46.2C-6 -49.6 -3.6 -51 -0.4 -51C3 -51 5.6 -49.6 5.8 -46.2z') + K.strokes(0, -46, 11, 2, 26, 1.6, 1.5, hat[3], 0.4, 0.45) + P('#8aa85a', 'M-6.4 -47h12.8v1.4h-12.8z', 0.85) + P('#e86060', A.circ(4.6, -47.6, 1.3))}</g>`;
    if (fr) {
      o.head += P('#efe2cc', 'M-4 -38C-4.4 -35 -2 -33.4 0 -33.4C2 -33.4 4.4 -35 4 -38C2 -39 -2 -39 -4 -38z') + P('#c87070', A.ell(0, -37.6, 1.2, 0.9)) + S('#8a6a50', 0.45, 'M0 -36.8v1.4M-1.4 -35q1.4 0.8 2.8 0', 0.8) + eye(-3.4, -41.4, 0.85, '#5a3a1a') + eye(3.4, -41.4, 0.85, '#5a3a1a');
      o.over += P(K.T('#f2ead8')[1], 'M-6 -24C-6.6 -16 -6 -10 -5.4 -7C-2 -6 2 -6 5.4 -7C6 -10 6.6 -16 6 -24C3 -25 -3 -25 -6 -24z') + P('#f2ead8', 'M-5.4 -23.4C-6 -16 -5.4 -10.4 -4.8 -7.8C-2 -7 2 -7 4.8 -7.8C5.4 -10.4 6 -16 5.4 -23.4C2.6 -24.2 -2.6 -24.2 -5.4 -23.4z');
    }
    o.over += `<g class="gca-bee" style="transform-origin:0px 0px">${P('#2a2010', A.ell(-12, -48, 1.4, 1)) + P('#f0c030', A.ell(-12, -48, 0.7, 0.9)) + P('#ffffff', A.ell(-12.4, -49.4, 0.9, 0.6), 0.6)}</g>`;
    if (back) o.over += P('#f2ead8', 'M-1 -21C-5 -24 -7 -21 -5 -19C-3 -18 -1 -20 0 -21C1 -20 3 -18 5 -19C7 -21 5 -24 1 -21z') + S('#f2ead8', 1, 'M-1 -20L-3 -13M1 -20L3 -13', 0.9) + K.S(K.T('#d8b84a')[3], 0.5, 'M0 -33V-8', 0.4);   // her apron's bow, the dress's back seam
    o.hold = (x, y) => P('#c88a30', A.rrect(x - 2.6, y - 1, 5.2, 5.6, 1.4)) + P('#f0d080', A.rrect(x - 2, y - 0.4, 2, 4.4, 0.8), 0.6) + P('#e8dcc0', A.rrect(x - 3, y - 2.2, 6, 1.6, 0.6));
  } else if (id === 'hollin') {
    const ft = K.T('#8a5a36'), jt = K.T('#4f6a3a'), an = K.T('#d8c4a0');
    o.over += fr ? P(jt[1], 'M-9.4 -23C-10.4 -36 -8.4 -45 -4 -48L-2 -24z') + P(jt[0], 'M-8.6 -24C-9.6 -36 -7.6 -44 -4 -46.6L-2.6 -24.6z') + P(jt[1], 'M9.4 -23C10.4 -36 8.4 -45 4 -48L2 -24z') + P(jt[0], 'M8.6 -24C9.6 -36 7.6 -44 4 -46.6L2.6 -24.6z') + P('#4a3a2a', 'M-9 -26h18v2.4h-18z')
      : P(jt[1], 'M-9 -22C-10 -36 -8 -48 0 -49C8 -49 10 -36 9 -22C5 -20 -5 -20 -9 -22z') + P(jt[0], 'M-8.4 -23C-9.4 -36 -7.4 -47 -0.4 -48C7 -48 8.6 -36 8.2 -23.4C4.6 -21.6 -4.8 -21.6 -8.4 -23z') + P('#4a3a2a', 'M-9 -26h18v2.4h-18z');
    o.under += P(ft[1], 'M-2.4 -49h4.8v-6h-4.8z');   // the neck
    o.head += P(ft[1], 'M-6 -62C-9.6 -63 -11.6 -61.4 -11.4 -60C-9.6 -59.4 -7.6 -59.6 -5.6 -60.4z') + P(ft[1], 'M6 -62C9.6 -63 11.6 -61.4 11.4 -60C9.6 -59.4 7.6 -59.6 5.6 -60.4z');
    if (fr) o.head += P('#c8a888', 'M-3 -59C-3.4 -55.6 -1.6 -54 0 -54C1.6 -54 3.4 -55.6 3 -59C1.6 -60 -1.6 -60 -3 -59z') + P('#2a1a10', A.ell(0, -55.6, 1.4, 1)) + eye(-2.8, -62.4, 0.8) + eye(2.8, -62.4, 0.8);
    const antler = (s) => `M${f(s * 2.4)} -67C${f(s * 4)} -72 ${f(s * 6)} -76 ${f(s * 8)} -80M${f(s * 5.2)} -73.6C${f(s * 7.6)} -74 ${f(s * 9.6)} -73 ${f(s * 11)} -71M${f(s * 6.8)} -77.6C${f(s * 6)} -80 ${f(s * 5.6)} -82 ${f(s * 5.8)} -84M${f(s * 3.6)} -70C${f(s * 2.6)} -73 ${f(s * 2.4)} -75 ${f(s * 2.6)} -77`;
    o.head += S(an[1], 1.6, antler(-1) + antler(1), 1) + S(an[2], 0.6, antler(-1), 0.7);
    if (back) o.over += S('#6a4a2e', 1.6, 'M-12 -30L10 -56', 1) + P('#8a96a0', 'M8 -58l6 -2l1 4.4l-5 1.4z');   // the axe across his back
    else o.hold = (x, y) => S('#6a4a2e', 1.4, `M${f(x)} ${f(y - 4)}L${f(x)} ${f(y + 12)}`, 1) + P('#8a96a0', `M${f(x)} ${f(y + 9)}l4 1l0 4.4l-4 -1z`);
  } else if (id === 'angler') {
    const ct = K.T('#5f6a4a'), hat = K.T('#6a5a40');
    if (fr) {
      o.head += eye(-2.6, -53.4, 0.7) + eye(2.6, -53.4, 0.7) + P(K.T('#e2b894')[1], A.ell(0, -50.6, 1.4, 1.2)) + P('#d88a70', A.ell(-4, -50.6, 1.4, 0.8), 0.3) + P('#d88a70', A.ell(4, -50.6, 1.4, 0.8), 0.3);
      o.head += P('#d8d4cc', 'M-6 -51C-6.6 -46 -4 -41 0 -40C4 -41 6.6 -46 6 -51C4 -48.4 -4 -48.4 -6 -51z') + P('#f0ece4', 'M-5 -50C-5.4 -46 -3.2 -42 0 -41.2C-2 -43.4 -3 -46.6 -2.6 -49.4z', 0.8) + S('#b8b2a8', 0.4, 'M-2 -47l0.4 4M0 -47.4v5.4M2 -47l-0.4 4', 0.6);
      o.over += S(ct[3], 0.6, 'M0 -44V-16', 0.7) + P('#3a3a30', A.circ(-1.4, -36, 0.7) + A.circ(-1.4, -28, 0.7), 0.8) + P(ct[1], 'M-10 -26h6v5h-6z', 0.6) + P(ct[1], 'M4 -26h6v5h-6z', 0.6);
    } else o.head += P('#cfcac0', 'M-7 -55C-7.4 -50 -5.6 -46.4 0 -45.6C5.6 -46.4 7.4 -50 7 -55C4 -56.4 -4 -56.4 -7 -55z') + K.strokes(0, -50, 5.4, 3.6, 18, 1.4, 0, '#f0ece4', 0.5, 0.6) + P('#d8d4cc', 'M-6.4 -47C-5 -44 5 -44 6.4 -47C5 -45.6 -5 -45.6 -6.4 -47z', 0.8);   // (from behind: his white hair under the hat, the beard's edge each side)
    o.head += P(hat[1], 'M-11.6 -56.6C-8 -58.2 8 -58.2 11.6 -56.6C10 -54.6 -10 -54.6 -11.6 -56.6z') + P(hat[1], 'M-6.4 -57C-6.8 -61.6 -4 -64 0.6 -63.6C4.6 -63.4 7 -61 6.6 -57z') + P(hat[0], 'M-5.8 -57.4C-6 -61 -3.6 -63 0.4 -62.8C4 -62.6 6 -60.6 5.8 -57.4z') + P(hat[2], 'M-4.4 -59.6C-3.6 -61.8 -1.4 -62.6 0.6 -62.4C-1.6 -61.6 -3 -60.8 -4.4 -59.6z', 0.5) + P('#4a3a28', 'M-6.2 -58.4h12.4v1.2h-12.4z', 0.9);
    o.under += S('#6e4c2a', 1.4, fr ? 'M10 -38L19 -72' : 'M-10 -38L-19 -72', 1);   // the rod over his shoulder, its butt in his hand
  } else if (id === 'perpetua') {
    const st = K.T('#c88a5a'), bt = K.T('#b8a890');
    const foot = P(bt[1], 'M-13 0C-13 -3 -7 -4 0 -4C7 -4 13 -3 13 0z') + P(bt[0], 'M-12 -0.6C-11.6 -2.8 -6 -3.4 0 -3.4C6 -3.4 11.6 -2.8 12 -0.6z');
    const shell = P(st[1], A.ell(0, -13, 13, 12)) + P(st[0], A.ell(-0.8, -13.8, 11.8, 10.8)) + S(st[3], 1, 'M0 -13m-8 0a8 8 0 1 1 8 8a6 6 0 1 1 -6 -6a4 4 0 1 1 4 4', 0.6) + S(st[2], 1.2, 'M-9 -18a11 11 0 0 1 8 -6', 0.6) + S('#e8d0a0', 1.4, 'M-12 -10q12 3 24 0', 0.5);
    const head = P(bt[1], 'M-4.4 -4C-5 -10 -5 -18 -3 -22C-1 -25 1 -25 3 -22C5 -18 5 -10 4.4 -4z') + P(bt[0], 'M-3.6 -4.4C-4 -10 -4 -17.6 -2.4 -21.2C-0.8 -23.6 0.8 -23.6 2.4 -21.2C3.6 -17.6 3.6 -10 3.6 -4.4z')
      + S(bt[1], 1, 'M-1.6 -23L-3.6 -29M1.6 -23L3.6 -29', 1) + P('#1a1612', A.circ(-3.6, -29.4, 1) + A.circ(3.6, -29.4, 1)) + P('#fffaf0', A.circ(-3.9, -29.8, 0.35) + A.circ(3.3, -29.8, 0.35), 0.9)
      + P('#3a5a8a', 'M-4 -21.6C-4 -24.4 4 -24.4 4 -21.6z') + P('#2a4a7a', 'M-4.8 -21.6h9.6v1.2h-9.6z');
    o.shellOnly = back ? foot + head + shell : foot + shell + head + P('#7a5a34', 'M6 -10h7v6h-7z', 0.9) + P('#f4ecdc', 'M7 -11.4h4.4v2.4h-4.4z');
  }
  return o;
}
const _GCF = { cache: new Map() };
function gardenCastViewSvg(id, view, o) {
  o = o || {};
  const L = _GCF_LOOK[id]; if (!L || (view !== 's' && view !== 'n')) return '';
  const st = o.state || 'idle', key = id + view + st;
  let s = _GCF.cache.get(key); if (s != null) return s;
  try {
    const K = _gcaKit(id + view), back = view === 'n', A = K.A, P = _gcfParts(id, K, L, back), w = id === 'perpetua' ? 15 : id === 'hollin' ? 11 : 12;
    const shadow = typeof gardenFigureShadowSvg === 'function' ? gardenFigureShadowSvg(w, w * 0.32) : A.P('#2a3322', A.ell(0, 0.6, w, w * 0.32), 0.22);
    let up;
    if (L.shell) up = P.shellOnly;
    else {
      const [aL, aR] = _gcfArms(K, L, back, back ? null : P.hold), body = _gcfBody(K, L, L.cloth, back);
      const head = K.G('gca-hd', 0, L.head[0] + L.head[2], _gcfHead(K, L, L.fur) + P.head);
      up = P.under + body + P.over + aL + aR + head;   // (the arms over the body's sides, so they read as arms, not as a wider body)
      if (back) up = P.under + body + aL + aR + head + P.over;
    }
    s = `<g class="wd-flip">${shadow}<g class="gca gca-${st} gca-fv gca-${id} gpl-root" style="transform-origin:0px 0px">${_gcfLegs(K, L, back)}<g class="gca-up gpl-up" style="transform-origin:0px ${L.hy}px">${up}</g></g></g>`;
  } catch (e) { s = ''; }
  if (_GCF.cache.size > 60) _GCF.cache.clear();
  _GCF.cache.set(key, s);
  return s;
}
