/* ============================================================
   GARDEN ART, the vale's cast, redrawn for the Painted village (Nov 2026). The owner: the folk must reach the opening scenes' bar.
   Drawn the way the scene kit draws its people and animals (70-scene-lib-people-0figure.js, 70-scene-lib-animals-cat.js): no ink outlines;
   every form is a shade silhouette with its lit body laid over it, offset toward the sun at the upper left, then a light glaze along the lit
   edge and a few deep accents; fur, feathers and cloth carry a painted texture of short strokes (seeded, so the same every time).
   Each character has a silhouette of their own, readable at 40 px:
     tam       a mole: low and round, a flat cap, specs on a long pink snout, big digging hands, a spade
     bramble   a badger: broad and square, a wide hat, a brick waistcoat, the striped face, a map roll under the arm
     pip       an otter: long and leaning, a red scarf whose ends fly, a satchel, the long tail curling behind
     thistle   a hedgehog: a pear in a rose dress and apron, a great spiked cloak of spines, a wooden spoon, a frog in her pocket
     wick      an owl: a tall egg, ear tufts, the pale facial disc and amber eyes, folded barred wings, talons
     quince    a hare: tall, one ear upright and one folded, a straw sun hat, a honey jar, a bee that circles
     hollin    a stag (the woodsman): the tallest, antlers, a moss jerkin and rolled sleeves, an axe over the shoulder, a carved wren
     angler    the old angler: a stooped old man in a waxed coat and a battered hat, a white beard, a rod over the shoulder
     perpetua  the snail post: a striped shell, a post cap and a satchel of letters

   gardenCastSvg(id, o)   -> an SVG fragment, feet at 0,0, facing right, inside <g class="wd-flip">, or '' for an id it does not draw.
                             o.walk: the walking cycle (legs, arms, bob, cloth and tail lag); otherwise the idle (breath, a look round,
                             an ear or tail now and then). Motion is CSS on named groups (94-garden-art-paint.css), transforms only:
                             the native renderer caches each group's drawing once and only moves it, so nothing is drawn per frame.
                             Reduced motion and the garden's motion setting stop it with everything else.
   gardenCastTop(id)      -> how tall the figure is (its crown, antlers or ears), for the mark above their head
   gardenCastOn()         -> true when the Painted village style draws the cast (the classic style keeps its own drawing)
   gardenCastWalkSync(S)  -> called by a wonder sprite each frame: swaps to the walk or idle drawing when the caller starts or stops (a compare)
   Cached per id and state (bounded). Pure string work: no DOM at load.
   ============================================================ */
const _GCA = { cache: new Map(), walkNow: false };
const GCA_TOP = Object.freeze({ tam: 44, bramble: 54, pip: 54, thistle: 48, wick: 54, quince: 68, hollin: 80, angler: 62, perpetua: 30 });
function gardenCastOn() { try { return typeof gardenFigurePaintStyle === 'function' && gardenFigurePaintStyle(); } catch (e) { return false; } }
function gardenCastTop(id) { return GCA_TOP[id] || 50; }
/** Four tones of a colour, the scene kit's way: [base, shade, light, deep]. The shade leans to the painted ground's warm green, never black. */
function _gcaT(c) { const A = GART; return [c, A.mix(c, '#2c3424', 0.3), A.mix(c, '#fff2d2', 0.3), A.mix(c, '#1c1a14', 0.56)]; }
function _gcaKit(seed) {
  const A = GART, f = A.f1, r = A.rng('gca|' + seed);
  const P = A.P, S = A.S;
  /** One form: the shade silhouette, the lit body offset toward the sun, a light glaze. */
  const form = (c, outer, inner, lit, lo) => { const t = _gcaT(c); return P(t[1], outer) + P(t[0], inner) + (lit ? P(t[2], lit, lo == null ? 0.5 : lo) : ''); };
  /** Painted texture: n short strokes inside an ellipse, leaning along angle a (radians from up), in one path. */
  const strokes = (cx, cy, rx, ry, n, len, a, col, w, o) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const t = r() * Math.PI * 2, k = Math.sqrt(r()), x = cx + Math.cos(t) * rx * k, y = cy + Math.sin(t) * ry * k, g = a + (r() - 0.5) * 0.7, L = len * (0.6 + r() * 0.6);
      d += `M${f(x)} ${f(y)}l${f(Math.sin(g) * L)} ${f(-Math.cos(g) * L)}`;
    }
    return S(col, w || 0.55, d, o == null ? 0.5 : o);
  };
  /** An eye: the deep iris, a lid shadow above it, a catchlight toward the sun. */
  const eye = (x, y, rr, iris) => P('#1a1612', A.ell(x, y, rr * 0.86, rr)) + (iris ? P(iris, A.ell(x + rr * 0.08, y + rr * 0.1, rr * 0.6, rr * 0.7)) + P('#120e0a', A.circ(x + rr * 0.12, y + rr * 0.12, rr * 0.36)) : '') + P('#fffaf0', A.circ(x - rr * 0.32, y - rr * 0.34, rr * 0.3), 0.92);
  /** A limb as a tapered tube from (x, y) along a (radians from straight up: pi hangs down), shade under, the lit side offset. */
  const limb = (x, y, a, L, w0, w1, c, bend) => {
    const t = _gcaT(c), sh = A.limb(x, y, a, L, w0, w1, bend || 0), li = A.limb(x - 0.35, y - 0.25, a, L * 0.97, w0 * 0.72, w1 * 0.72, bend || 0);
    return { d: P(t[1], sh.d) + P(t[0], li.d), tip: sh.tip };
  };
  /** A named group with a pivot: the hook the CSS motion turns. */
  const G = (cls, x, y, inner) => (inner ? `<g class="${cls}" style="transform-origin:${f(x)}px ${f(y)}px">${inner}</g>` : '');
  return { A, f, r, P, S, form, strokes, eye, limb, G, T: _gcaT };
}
/** A pair of legs (or feet) from the hips, each in its own swinging group: far leg in shade, near leg lit. */
function _gcaLegs(K, o) {
  const { A, P, G } = K, hy = o.hy, out = [];
  for (const [side, cls] of [[-1, 'gca-b'], [1, 'gca-a']]) {
    const x = o.x + side * o.gap, far = side < 0, c = far ? A.mix(o.c, '#2c3424', 0.22) : o.c;
    let s = K.limb(x, hy, Math.PI + (far ? 0.04 : -0.04), -hy - o.foot * 0.6, o.w, o.w * 0.86, c).d;
    const fc = far ? A.mix(o.fc || o.c, '#2c3424', 0.22) : (o.fc || o.c), ft = K.T(fc);
    s += P(ft[1], A.ell(x + o.toe * 0.45, -o.foot * 0.5, o.toe, o.foot * 0.62)) + P(ft[0], A.ell(x + o.toe * 0.4 - 0.3, -o.foot * 0.62, o.toe * 0.86, o.foot * 0.44));
    if (o.claws) s += K.S(ft[3], 0.45, `M${K.f(x + o.toe * 1.1)} ${K.f(-o.foot * 0.5)}l1.1 0.3M${K.f(x + o.toe * 1.0)} ${K.f(-o.foot * 0.15)}l1.1 0.2`, 0.8);
    out.push(G('gca-lg ' + cls, x, hy, s));
  }
  return out.join('');
}
/* ---------- the characters ---------- */
function _gcaTam(K) {
  const { A, P, S, form, strokes, eye, G } = K, fur = '#4e4446', coat = '#6e8a4e', pink = '#d9a0a0', ft = K.T(fur), ct = K.T(coat), pk = K.T(pink);
  const legs = _gcaLegs(K, { x: -1, gap: 4.6, hy: -6, w: 4.4, c: '#45403a', fc: pink, foot: 3.2, toe: 3.4, claws: 1 });
  let body = form(coat, 'M-13 -5C-15 -17 -12 -28 -1 -30C10 -31 14 -20 13 -5C7 -1 -7 -1 -13 -5z', 'M-12.4 -6C-14 -17 -11 -27 -1.4 -28.6C8.4 -29.4 11.6 -19.6 11.2 -6.4C5.6 -3 -6.4 -3 -12.4 -6z', 'M-11 -10C-12 -19 -8 -26 -2 -27C-7 -23 -9.4 -17 -9.6 -9z', 0.55);
  body += S(ct[1], 0.7, 'M0.4 -28.4L1.4 -5M-6 -14q4 1.6 7.4 0', 0.8) + P(ct[3], A.circ(3.4, -22, 0.7) + A.circ(3.6, -16.6, 0.7) + A.circ(3.8, -11.2, 0.7), 0.7);   // the button band, a pocket
  body += P(A.mix(coat, '#c8a86a', 0.5), A.rrect(-8.8, -14.6, 6, 4.6, 1.2), 0.5) + strokes(-1, -16, 10, 11, 26, 1.6, 0.2, ct[2], 0.5, 0.22);
  // the head: a velvet dome straight off the shoulders (moles have no neck), the long pink snout reaching right and down
  let head = form(fur, A.ell(1.6, -32, 10.6, 9.4), A.ell(0.8, -32.8, 9.6, 8.4), 'M-6.4 -37C-3 -41 3 -41.4 6 -39C1.4 -39.4 -3 -38 -5.4 -35z', 0.6);
  head += strokes(0.6, -33, 8.4, 7, 34, 1.4, -0.4, ft[2], 0.5, 0.4) + strokes(3, -30, 8, 5, 16, 1.2, 0.6, ft[3], 0.5, 0.35);
  head += P(pk[1], 'M7 -33.4C11 -34 15.6 -32.6 16.6 -30.4C17 -28.6 15 -27.8 12.6 -28.2C10 -28.6 7.6 -29.4 6.4 -30.6z') + P(pk[0], 'M7.2 -33C11 -33.6 15 -32.2 16 -30.6C14.6 -29.8 11 -30 7.2 -31.2z') + P(pk[3], A.ell(16.4, -30.4, 1.3, 1.1)) + P('#fff6ec', A.circ(16, -31, 0.4), 0.8);
  head += S(A.mix(pink, '#ffffff', 0.4), 0.3, 'M13 -30.4l4.4 -1.6M13 -29.6l4.6 0.4M12.6 -29l4 1.8', 0.6);   // whiskers, pale
  head += eye(7.2, -35.4, 0.9) + S('#e0d0a8', 0.55, `M5.2 -35.4a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0 -4.2 0M9.4 -35.4L11.8 -34.6`, 0.9) + P('#ffffff', A.ell(6.4, -36.2, 0.8, 0.5), 0.35);   // specs, with the sky in the glass
  head += P(A.mix(pink, '#d86060', 0.25), A.ell(9.6, -31.6, 1.6, 0.9), 0.32);   // a warm cheek
  // the flat cap, its peak over the eyes
  const cap = K.T('#8a6a44');
  head += P(cap[1], 'M-8 -38.6C-7.6 -44 -2 -46 3.4 -45.4C8.4 -44.8 10.6 -41.6 10 -39C4 -38.6 -2 -38.2 -8 -38.6z') + P(cap[0], 'M-7.4 -39.4C-7 -43.6 -2 -45.2 3 -44.8C7.6 -44.2 9.2 -41.8 8.8 -39.8C3 -39.4 -2 -39 -7.4 -39.4z') + P(cap[2], 'M-6 -41.6C-4 -44 0 -44.6 3 -44.2C-0.6 -43.4 -3.4 -42.6 -6 -41.6z', 0.55);
  head += P(cap[3], 'M6 -40.4C9 -40.6 12.4 -40 13.4 -39C12.6 -38.2 9 -38.2 6 -38.8z') + S(cap[1], 0.4, 'M-2 -44.6Q0 -41.6 -0.6 -39', 0.7);
  // arms: the far one behind (in shade), the near one with its great pink hand on the spade
  const arF = K.limb(-9, -24, Math.PI * 0.94, 11, 4.4, 3.8, A.mix(coat, '#2c3424', 0.2));
  const far = G('gca-ar gca-b', -9, -24, arF.d + P(pk[1], A.ell(arF.tip[0], arF.tip[1] + 1, 3, 2.4)));
  const spade = S('#6a4a2e', 1.5, 'M15 -26L15 -1', 1) + S('#a68454', 0.5, 'M14.6 -26L14.6 -2', 0.8) + P('#7f8a90', 'M12.2 -3h5.6v3.4q-0.6 2.4 -2.8 3.4q-2.2 -1 -2.8 -3.4z') + P('#b8c2c8', 'M12.8 -2.4h1.8v4q-1.2 -0.8 -1.8 -2.2z', 0.8) + S('#6a4a2e', 1.4, 'M13 -26.4h4');
  const arN = K.limb(8, -24, Math.PI * 0.72, 9, 4.8, 4.2, coat);
  const near = arN.d + P(pk[1], A.ell(14.8, -19.6, 3.4, 2.8)) + P(pk[0], A.ell(14.4, -20.2, 2.8, 2.2)) + S(pk[3], 0.4, 'M16.4 -21.4l1.6 -0.6M16.8 -19.6l1.6 0.2M16.2 -18l1.4 0.8', 0.8);
  return { legs, back: far + spade, body, near, head, hd: [1, -26] };
}
function _gcaBramble(K) {
  const { A, P, S, form, strokes, eye, G } = K, fur = '#8a8884', vest = '#8a4a34', shirt = '#e6dcc4', ft = K.T(fur), vt = K.T(vest);
  const legs = _gcaLegs(K, { x: 0, gap: 5.6, hy: -12, w: 5.6, c: '#3a3432', fc: '#2e2a28', foot: 3.4, toe: 3.8, claws: 1 });
  let body = form(shirt, 'M-14 -11C-16 -26 -12 -37 0 -38C12 -38 16 -26 14 -11C8 -7 -8 -7 -14 -11z', 'M-13.4 -12C-15 -25 -11 -35.6 -0.4 -36.6C10.6 -36.6 13.6 -25.4 12.4 -12.4C7 -9 -7.6 -9 -13.4 -12z');
  body += form(vest, 'M-14.4 -10.6C-16 -24 -13 -34 -6 -36.4L-1 -18L4 -36.6C11 -34.4 15.4 -25 14.4 -10.6C8 -7 -8 -7 -14.4 -10.6z', 'M-13.8 -11.6C-15.2 -24 -12.4 -32.8 -6.4 -35L-1.4 -18.6L3.4 -35C9.6 -32.8 13.2 -24.4 12.6 -12C7 -9.2 -7.6 -9.2 -13.8 -11.6z', 'M-12.4 -14C-13.4 -24 -11 -31 -7 -33.6C-9.4 -27 -10.6 -20 -10.4 -13.4z', 0.5);
  body += P(vt[3], A.circ(1.8, -24, 0.8) + A.circ(1.2, -19.4, 0.8) + A.circ(0.8, -14.8, 0.8)) + P('#d8b45a', A.circ(1.6, -24.2, 0.36) + A.circ(1, -19.6, 0.36), 0.9) + S('#c8a24a', 0.45, 'M-10 -18q3 3 7 2', 0.8);   // buttons, a watch chain
  body += strokes(0, -22, 11, 11, 22, 1.8, 0.1, vt[2], 0.45, 0.2);
  // the head: broad, the white face with two black stripes running back over the eyes, the snout to the right
  let head = form(fur, 'M-9 -38C-11 -47 -5 -52 3 -51.6C10 -51 13.6 -46 13.4 -42C16.6 -41 18 -39 17 -37.4C14 -35 6 -34 -2 -34.6C-6 -35 -8.6 -36 -9 -38z', 'M-8.4 -38.8C-10 -46.6 -4.6 -50.8 2.8 -50.4C9.4 -49.8 12.6 -45.4 12.4 -41.8C15 -41 16.6 -39.4 15.8 -38.2C13 -36.4 6 -35.6 -1.8 -36C-5.6 -36.4 -8 -37.4 -8.4 -38.8z');
  head += P('#f2eee4', 'M-6 -46C-2 -50.6 6 -50.4 11 -46.4C13.6 -44.4 14.6 -42.4 14.6 -41C16.6 -40.4 17.4 -39 16.6 -37.8C13 -36 6 -36 1 -37C-3 -37.8 -6 -40 -6 -46z') + P('#dcd6c8', 'M2 -37.4C7 -36.6 12.6 -36.6 16.4 -37.8C13 -35.8 6.6 -35.4 2 -37.4z', 0.9);
  head += P('#26211f', 'M15 -41.6C11 -43.4 6 -45.6 0 -47.6C-3 -48.4 -6 -47.6 -6.4 -45.6C-6.4 -44 -4.6 -43.4 -2.6 -43.4C3 -43 9 -41.2 14.4 -39.8C15.4 -40 15.6 -41 15 -41.6z') + P(A.mix('#26211f', '#ffffff', 0.22), 'M10 -43C6 -44.6 1 -46.4 -3.6 -47.2C1 -46.6 6 -45.2 10.6 -43.6z', 0.6);
  head += P('#3a3634', 'M-8.6 -39C-6 -36.6 -1 -35.4 4 -35.6C1 -34 -4 -34 -7.6 -35.6z', 0.8);
  head += strokes(2, -40, 7, 3, 22, 1.4, -1.3, '#ffffff', 0.4, 0.4) + P('#1a1614', A.ell(16.8, -38.6, 1.5, 1.2)) + P('#fff', A.circ(16.4, -39.2, 0.4), 0.7) + P('#4a4442', A.circ(7.6, -42.6, 1.6)) + eye(7.6, -42.6, 1.05);
  head += P('#26211f', A.ell(-5.4, -47.6, 2.4, 2.2)) + P('#f2eee4', A.ell(-5.8, -48.4, 1.5, 1.1), 0.9);   // the small white-tipped ear
  head += S('#4a3a30', 0.5, 'M9.4 -36.4q3 1 6 -0.6', 0.8);   // a dry mouth
  const hat = K.T('#5a4a34');
  head += G('gca-hat', 1, -49, P(hat[1], 'M-13 -48.4C-12 -50.4 -4 -51.4 2 -51.4C9 -51.4 15.6 -50.2 16.4 -48.6C14 -47 -10 -46.6 -13 -48.4z') + P(hat[0], 'M-6.6 -50.4C-6.6 -56 -2 -58 2.6 -58C7.4 -58 10 -55.6 10 -50.6C4 -49.6 -1 -49.6 -6.6 -50.4z') + P(hat[2], 'M-5.4 -51.6C-5.4 -55 -2.4 -57 1.4 -57.2C-1.6 -55.8 -3.4 -53.6 -3.8 -51.4z', 0.6) + P('#7a2e26', 'M-6.6 -51.2C-1 -50.4 4.4 -50.4 10 -51.2V-52.6C4.4 -51.8 -1 -51.8 -6.6 -52.6z') + P(hat[2], 'M-12.4 -48.6C-8 -50.2 -1 -50.6 4 -50.6C-2 -49.6 -8 -49 -12.4 -48.6z', 0.5) + P('#7a8a5a', 'M10 -52l3.6 -4.4l-0.6 4.8z', 0.9));   // a sprig in the band
  // the map roll under the far arm, the near arm resting on his belly
  const roll = P('#d8ccb0', A.rrect(-18, -31, 6, 15, 2.6)) + P('#efe6cc', A.rrect(-17.4, -31, 3.4, 15, 1.6)) + S('#a89870', 0.5, 'M-18 -24h6M-18 -20h6', 0.8) + P('#b09a70', A.ell(-15, -31, 3, 1.2));
  const arF = K.limb(-11, -32, Math.PI * 0.96, 12, 5, 4.4, A.mix(shirt, '#2c3424', 0.25));
  const far = G('gca-ar gca-b', -11, -32, roll + arF.d + P('#26211f', A.ell(arF.tip[0], arF.tip[1] + 1, 2.8, 2.4)));
  const arN = K.limb(10, -32, Math.PI * 0.93, 12, 5.2, 4.6, shirt);
  const near = G('gca-ar gca-a', 10, -32, arN.d + P(K.T(shirt)[1], A.ell(arN.tip[0], arN.tip[1] - 0.6, 2.8, 1.2)) + P('#26211f', A.ell(arN.tip[0] + 0.4, arN.tip[1] + 1.4, 2.8, 2.5)) + P('#4a4442', A.ell(arN.tip[0], arN.tip[1] + 0.8, 1.8, 1.4), 0.8) + S('#d8d2c4', 0.4, `M${K.f(arN.tip[0] + 1.6)} ${K.f(arN.tip[1] + 2.6)}l1 0.6M${K.f(arN.tip[0] + 0.4)} ${K.f(arN.tip[1] + 3.4)}l0.6 0.8`, 0.8));
  return { legs, back: far, body, near, head, hd: [1, -36] };
}
function _gcaPip(K) {
  const { A, P, S, form, strokes, eye, G } = K, fur = '#7a5636', jum = '#3f7fa8', scarf = '#d8503a', ft = K.T(fur), jt = K.T(jum), st = K.T(scarf);
  // the long tail on the ground behind, thick at the root, curling up at the tip
  const tail = G('gca-tail', -8, -10, P(ft[1], 'M-6 -12C-14 -10 -22 -6 -25 -1C-26 1 -24 2 -22 0C-18 -4 -12 -6 -5 -7z') + P(ft[0], 'M-6 -11.4C-13 -9.6 -20 -6.2 -23.4 -1.6C-19 -4.6 -12.6 -7 -5.6 -8.6z') + strokes(-15, -6, 7, 2.4, 12, 1.4, -1.2, ft[2], 0.45, 0.4));
  const legs = _gcaLegs(K, { x: 1, gap: 3.6, hy: -11, w: 4, c: fur, fc: A.mix(fur, '#2c3424', 0.25), foot: 2.6, toe: 3.8 });
  let body = form(jum, 'M-9 -10C-11 -22 -8 -34 1 -36C9 -37 12 -28 11 -10C6 -7 -4 -7 -9 -10z', 'M-8.4 -11C-10 -22 -7.4 -32.6 0.6 -34.4C8 -35.2 10.4 -27 9.8 -11.2C5 -8.6 -4 -8.6 -8.4 -11z', 'M-7.4 -14C-8.4 -23 -6 -30.4 -1 -32.6C-4.4 -27 -5.6 -21 -5.4 -13.6z', 0.5);
  body += S(jt[1], 0.6, 'M-7.6 -12.6q8 2.4 17 0M-7.8 -14.4q8 2.4 17.2 0', 0.7) + strokes(0, -22, 8, 10, 30, 1.2, 0, jt[2], 0.45, 0.25) + strokes(1, -20, 8, 9, 16, 1.2, 0, jt[3], 0.45, 0.25);   // a ribbed hem, knitted texture
  body += S('#6a4a2a', 1.1, 'M-6 -33L9 -14', 1) + P('#b08a5a', A.rrect(4, -17, 9, 8, 2)) + P('#c8a470', A.rrect(4.4, -17, 8.2, 3, 1.4)) + P('#7a5a34', A.rect(7.6, -15, 1.6, 2.2));   // the satchel
  let head = form(fur, 'M-5 -36C-6.4 -44 -2 -48.6 4 -48.4C10 -48 13 -44 13 -40C15.4 -39.4 16 -37 14.6 -35.8C12 -34 6 -33.6 0 -34.4C-3 -34.6 -4.6 -35 -5 -36z', 'M-4.4 -36.8C-5.6 -43.6 -1.6 -47.6 3.8 -47.4C9.2 -47 12 -43.4 12 -40C14 -39.6 14.8 -37.6 13.6 -36.6C11 -35.2 6 -35 0.4 -35.6C-2.4 -35.8 -4 -36.2 -4.4 -36.8z', 'M-3.6 -40.4C-3 -45 0.4 -47 4 -46.8C0.4 -45.6 -1.8 -43.2 -2.4 -40z', 0.6);
  head += P('#e2ccaa', 'M6 -38.6C9 -40 13 -40 14.6 -38C15 -36.4 12 -35.4 8.6 -35.6C6.6 -35.8 5.4 -37.4 6 -38.6z') + P('#2a1e16', A.ell(14.4, -39, 1.4, 1.1)) + P('#fff', A.circ(14, -39.5, 0.35), 0.7) + eye(8.4, -42.4, 1.05);
  head += S('#efe4d0', 0.28, 'M11.4 -37.6l5.2 -1.4M11.6 -37l5.4 0.6M11.2 -36.4l4.6 1.6', 0.75) + P(ft[1], A.ell(-0.6, -46, 2.2, 1.8)) + P('#c89a7a', A.ell(-0.6, -46.2, 1.1, 0.9), 0.8) + strokes(2, -42, 6, 4.6, 24, 1.2, -0.8, ft[2], 0.45, 0.45);
  head += S('#4a3020', 0.45, 'M10.2 -36.2q1.8 0.8 3.2 0.2', 0.8);   // a small smile
  // the scarf: wound twice at the neck, its two ends flying back (they lag behind the walk)
  const wrap = P(st[1], 'M-5.6 -34.6C-2 -32 6 -31.6 11 -34.2L11 -36.6C6 -34.6 -1.6 -34.6 -5.4 -37z') + P(st[0], 'M-5.2 -35.4C-1.6 -33.2 5.6 -33 10.6 -35.2L10.6 -36.4C5.6 -34.8 -1.4 -35 -5.2 -37z') + S(st[2], 0.5, 'M-3 -35q5 2 11 0', 0.7);
  const ends = G('gca-cl', -4, -35, P(st[1], 'M-4 -35.4C-9 -35 -14 -32 -17 -28.4L-15 -27C-12 -29.4 -8 -31.6 -3.6 -32.6z') + P(st[0], 'M-4 -34.8C-8.4 -34 -12.8 -31.6 -15.6 -28.4C-12 -30.6 -8 -32.4 -3.8 -33.2z') + P(st[1], 'M-3 -33C-6 -29 -8 -25 -8.4 -21L-6.4 -21.2C-5.6 -25 -4 -29 -1.4 -32z') + S(st[3], 0.4, 'M-15.4 -27.6l-0.6 1.6M-14.4 -27l-0.4 1.6M-7.8 -21.2v1.6M-7 -21.2v1.6', 0.8));
  const arF = K.limb(-6, -31, Math.PI * 0.86, 11, 3.6, 3, A.mix(jum, '#2c3424', 0.22));
  const far = G('gca-ar gca-b', -6, -31, arF.d + P(ft[1], A.ell(arF.tip[0], arF.tip[1] + 0.6, 2, 1.8)));
  const arN = K.limb(7, -31, Math.PI * 1.08, 11, 3.8, 3.2, jum);
  const near = G('gca-ar gca-a', 7, -31, arN.d + P(ft[0], A.ell(arN.tip[0], arN.tip[1] + 0.6, 2.2, 1.9)));
  return { legs, back: tail + ends + far, body, near: wrap + near, head, hd: [2, -35], lean: 6 };
}
function _gcaThistle(K) {
  const { A, P, S, form, strokes, eye, G, r } = K, fur = '#b08a68', dress = '#a85a6a', apron = '#efe4d0', spine = '#6a5442', ft = K.T(fur), dt = K.T(dress), sp = K.T(spine);
  // the cloak of spines behind her: a dark mass, then rows of quills in three tones from the crown down the back
  let quills = P(sp[3], 'M-15 -8C-19 -20 -17 -34 -8 -42C-2 -46 6 -46 9 -42C2 -40 -4 -32 -5 -22C-5 -16 -8 -10 -15 -8z');
  let qd = ['', '', ''];
  for (let i = 0; i < 46; i++) {
    const t = i / 46, ang = -0.4 - t * 2.1 + (r() - 0.5) * 0.24, rad = 8 + r() * 3, cx = -2 - t * 6, cy = -36 + t * 22, x = cx + Math.sin(ang) * rad * 0.4, y = cy - Math.cos(ang) * rad * 0.4, L = 5 + r() * 3;
    qd[i % 3] += `M${K.f(x)} ${K.f(y)}l${K.f(Math.sin(ang) * L)} ${K.f(-Math.cos(ang) * L)}`;
  }
  quills += S(sp[1], 1.4, qd[0], 1) + S(sp[0], 1.1, qd[1], 1) + S(A.mix(spine, '#f0e0c0', 0.5), 0.7, qd[2], 0.9);
  const legs = _gcaLegs(K, { x: 1, gap: 3.4, hy: -5, w: 3, c: ft[1], fc: '#4a3a30', foot: 2.4, toe: 3 });
  let body = form(dress, 'M-12 -4C-14 -14 -11 -28 0 -30C11 -30 14 -16 13 -4C6 -1 -6 -1 -12 -4z', 'M-11.4 -5C-13.2 -14 -10.4 -26.6 -0.4 -28.6C9.6 -28.6 12.4 -15.6 11.6 -5.4C5.6 -2.8 -5.4 -2.8 -11.4 -5z', 'M-10 -8C-11.4 -15 -9 -24 -3 -26.6C-6.6 -21 -8 -14 -7.6 -7.4z', 0.55);
  body += form(apron, 'M-3 -24C1 -25 7 -24.6 10 -23C11.6 -16 11.6 -9 10.6 -4.4C5 -2.6 -1 -2.6 -4.4 -4C-5 -11 -4.6 -18 -3 -24z', 'M-2.4 -23.4C1.4 -24.2 6.6 -23.8 9.4 -22.6C10.6 -16 10.8 -9.6 9.8 -5.2C4.8 -3.6 -0.6 -3.6 -3.8 -4.6C-4.4 -11 -4 -17.6 -2.4 -23.4z');
  body += S(dt[1], 0.55, 'M-2 -24q6 1.6 12 0.6', 0.8) + P(A.mix(apron, '#2c3424', 0.18), A.rrect(1, -14, 6.4, 5, 1.4)) + strokes(3, -12, 6, 7, 10, 1.6, 0.05, '#d8c8a8', 0.4, 0.4);
  body += G('gca-frog', 4.6, -14, P('#5f9a48', A.ell(4.2, -14.6, 2.6, 2)) + P('#7cba5e', A.ell(3.8, -15.2, 1.8, 1.2)) + P('#fff8e0', A.circ(3, -16.4, 0.9) + A.circ(5.4, -16.4, 0.9)) + P('#1a1a12', A.circ(3.1, -16.4, 0.45) + A.circ(5.5, -16.4, 0.45)));   // a frog in her pocket
  body += strokes(-6, -14, 4, 9, 16, 1.6, 0.2, dt[2], 0.45, 0.3) + P(A.mix(dress, '#ffffff', 0.5), A.circ(-7, -20, 0.6) + A.circ(-4.4, -12, 0.6) + A.circ(-8, -9, 0.6), 0.55);   // a sprig print
  // the head: a soft cone tipped by a pointed snout and a button nose, the face pale under the spines
  let head = form(fur, 'M-6 -32C-7 -40 -2 -44 3 -43.6C8 -43 11 -39.4 13.6 -35C15 -33.2 14 -31.6 12 -31.4C7 -31 1 -30 -3 -30C-5 -30.2 -5.8 -31 -6 -32z', 'M-5.4 -32.8C-6.2 -39.6 -1.6 -42.8 3 -42.4C7.4 -41.8 10 -38.6 12.6 -34.6C13.6 -33.2 12.8 -32.4 11.4 -32.4C7 -32 1 -31.2 -3 -31.2C-4.6 -31.4 -5.2 -32 -5.4 -32.8z', 'M-4 -36C-3 -40 0.4 -41.8 3.4 -41.4C0 -40.4 -2 -38.6 -2.6 -35.6z', 0.55);
  head += P('#2a1c18', A.ell(14.2, -33.4, 1.3, 1.1)) + P('#fff', A.circ(13.9, -33.9, 0.36), 0.75) + eye(6.6, -36.8, 0.95) + S('#4a3428', 0.4, 'M5.2 -38.6q1.6 -0.8 3 0', 0.8) + P('#e08080', A.ell(7.4, -33.6, 1.8, 1), 0.4);
  head += S('#5a3a2e', 0.4, 'M9.4 -31.8q1.8 0.8 3.4 -0.2', 0.8) + strokes(2, -36, 5, 4, 14, 1, -0.6, ft[2], 0.4, 0.5);
  head += P(sp[0], 'M-7 -37C-4 -44 3 -47 9 -44C5 -44 0 -42 -3 -38z') + S(sp[1], 1, 'M-5 -41l-3 -4M-2 -43l-1.6 -4.6M1.4 -44.4l-0.4 -4.6M4.6 -44.6l1 -4.2M7.4 -44l2.4 -3.4', 1) + S(A.mix(spine, '#f0e0c0', 0.5), 0.6, 'M-3.6 -42l-2.4 -3.6M3 -44.6l0.4 -4', 0.9);
  // a shawl over the shoulders, and the wooden spoon in the near hand
  const sh = K.T('#8a6a86');
  body += P(sh[1], 'M-11 -25C-6 -29.4 5 -30 11 -26.6C10 -22 7 -18.6 3 -18C-1 -17.6 -7 -20 -11 -25z') + P(sh[0], 'M-10.4 -25.4C-5.6 -29 4.6 -29.4 10.2 -26.6C9 -22.6 6.4 -19.6 2.8 -19.2C-1 -18.8 -6.6 -21 -10.4 -25.4z') + S(sh[2], 0.45, 'M-8 -25.6q7 -3 15 -0.8M-6 -23.4q6 -2 12 -0.6', 0.6) + S(sh[3], 0.4, 'M-6 -21l-0.6 1.8M-3 -19.6l-0.4 1.8M0 -19l-0.2 1.8M3 -18.6v1.8M6 -19.6l0.4 1.6', 0.8) + strokes(0, -24, 8, 3, 16, 1, 0.9, sh[2], 0.4, 0.4);
  const arN = K.limb(9, -24, Math.PI * 0.8, 8, 3.4, 3, dress);
  const spoon = S('#8a6440', 1.1, 'M14.6 -18L19 -30', 1) + P('#a87c50', A.ell(19.6, -31.6, 1.8, 2.6)) + P('#c89a68', A.ell(19.2, -32.2, 1, 1.4), 0.8);
  const near = G('gca-ar gca-a', 9, -24, spoon + arN.d + P(ft[0], A.ell(arN.tip[0], arN.tip[1] + 0.4, 2, 1.8)));
  return { legs, back: quills, body, near, head, hd: [3, -30] };
}
function _gcaWick(K) {
  const { A, P, S, form, strokes, eye, G } = K, fe = '#8a6a44', breast = '#e4d4b8', ft = K.T(fe), bt = K.T(breast);
  const legs = G('gca-lg gca-b', -3, -3, P('#c8a060', 'M-5 -3h3v1.6l1.6 1.2h-6.4l1.6 -1.2z')) + G('gca-lg gca-a', 3, -3, P('#d8b070', 'M2 -3h3v1.6l1.6 1.2h-6.4l1.6 -1.2z') + S('#3a2a1a', 0.5, 'M-5.4 -0.2l-1 0.6M1.6 -0.2l-1 0.6M6.4 -0.2l1 0.6', 0.9));
  let body = form(fe, 'M-12 -4C-15 -18 -13 -36 0 -40C13 -36 15 -18 12 -4C6 0 -6 0 -12 -4z', 'M-11.4 -5C-14.2 -18 -12.4 -34.6 -0.4 -38.4C11.6 -34.6 13.4 -18 11 -5.2C5.6 -1.6 -5.6 -1.6 -11.4 -5z');
  body += form(breast, 'M-7 -5C-9 -14 -8 -25 0 -28C8 -25 9 -14 7 -5C3 -3 -3 -3 -7 -5z', 'M-6.6 -5.6C-8.4 -14 -7.6 -24.2 -0.4 -27C6.8 -24.2 7.8 -14 6.4 -5.8C2.8 -4 -3 -4 -6.6 -5.6z', 'M-5.8 -8C-6.8 -15 -5.8 -22.4 -1 -25C-3.6 -20 -4.4 -14 -4 -7.6z', 0.6);
  let bars = ''; for (let row = 0; row < 6; row++) for (let i = -2; i <= 2; i++) { const x = i * 2.6 + (row % 2) * 1.3, y = -24 + row * 3.2; if (Math.abs(x) < 6.6 - Math.abs(row - 2.5) * 0.5) bars += `M${K.f(x - 0.9)} ${K.f(y)}l0.9 1l0.9 -1`; }
  body += S(bt[3], 0.5, bars, 0.6);
  // the wings, folded at the sides: layered feather ends, barred, the near one lit, its tips lifting now and then
  const wing = (sx, c, cls) => { const t = K.T(c), m = sx; return G(cls, m * 9, -30, P(t[1], `M${m * 8} -32C${m * 15} -28 ${m * 15} -14 ${m * 11} -3C${m * 9} -2 ${m * 7.6} -4 ${m * 8} -8C${m * 7} -16 ${m * 6.6} -24 ${m * 8} -32z`) + P(t[0], `M${m * 8.4} -31C${m * 14} -27 ${m * 14} -15 ${m * 10.6} -4.6C${m * 9.4} -5.6 ${m * 8.8} -8 ${m * 8.8} -10C${m * 8} -17 ${m * 7.6} -24 ${m * 8.4} -31z`) + S(t[3], 0.55, `M${m * 9} -24l${m * 4} 2M${m * 9} -19l${m * 4.6} 2M${m * 9} -14l${m * 4} 2M${m * 9.4} -9l${m * 2.6} 1.6`, 0.7) + S(t[2], 0.5, `M${m * 9.4} -28q${m * 3} 1 ${m * 4} 4`, 0.6)); };
  const wF = wing(-1, A.mix(fe, '#2c3424', 0.2), 'gca-ar gca-b'), wN = wing(1, fe, 'gca-ar gca-a');
  // the head: the round crown, ear tufts, the pale facial disc in two lobes, great amber eyes, the hooked beak
  let head = form(fe, A.ell(0, -40, 12.6, 10.6), A.ell(-0.6, -40.8, 11.6, 9.6), 'M-9 -44C-6 -49 2 -50.6 7 -48.4C1 -48.4 -4 -47 -8 -42.6z', 0.55);
  head += G('gca-ear', -8, -47, P(ft[1], 'M-11.6 -44.4L-10.4 -53.6L-5.4 -47.4z') + P(ft[0], 'M-10.8 -45L-10 -51.6L-6.6 -47.4z')) + G('gca-ear', 8, -47, P(ft[1], 'M11.6 -44.4L10.4 -53.6L5.4 -47.4z') + P(ft[2], 'M10.8 -45L10 -51.6L7 -47.6z', 0.7));
  head += strokes(0, -45, 9, 3.6, 22, 1.2, 0, ft[2], 0.45, 0.4) + P(bt[1], A.ell(-4.6, -39.4, 5.6, 5.4) + A.ell(4.6, -39.4, 5.6, 5.4)) + P(bt[0], A.ell(-4.9, -39.9, 5, 4.8) + A.ell(4.3, -39.9, 5, 4.8)) + S(ft[1], 0.5, 'M-4.6 -34.4C-8 -34.6 -10 -36.6 -10.4 -39.4M4.6 -34.4C8 -34.6 10 -36.6 10.4 -39.4', 0.6);
  head += eye(-4.4, -40, 2.8, '#e0a032') + eye(4.6, -40, 2.8, '#e0a032') + S(ft[3], 0.6, 'M-7.4 -43.2q3 -1.6 6 -0.4M7.6 -43.2q-3 -1.6 -6 -0.4', 0.7);   // heavy, thoughtful brows
  head += P('#b8862a', 'M-1.4 -37.4C-0.6 -38.4 0.6 -38.4 1.4 -37.4L0.6 -33.6C0.2 -33 -0.2 -33 -0.6 -33.6z') + P('#e8c060', 'M-0.8 -37.4L0 -34.4L-0.2 -37.6z', 0.8);
  return { legs, back: wF, body, near: wN, head, hd: [0, -32] };
}
function _gcaQuince(K) {
  const { A, P, S, form, strokes, eye, G } = K, fur = '#b8926a', dress = '#d8b84a', apron = '#f2ead8', ft = K.T(fur), dt = K.T(dress);
  const legs = _gcaLegs(K, { x: 0, gap: 3.6, hy: -9, w: 3.4, c: fur, fc: '#efe2cc', foot: 2.4, toe: 4.4 });
  let body = form(dress, 'M-10 -7C-12 -18 -9 -32 0 -34C9 -34 12 -18 11 -7C6 -4 -5 -4 -10 -7z', 'M-9.4 -8C-11.2 -18 -8.4 -30.6 -0.4 -32.6C8 -32.6 10.4 -18 10 -8.2C5.4 -5.6 -4.6 -5.6 -9.4 -8z', 'M-8 -11C-9.4 -19 -7 -28 -2 -30.6C-5 -24 -6 -17 -5.6 -10.4z', 0.55);
  body += form(apron, 'M-2 -26C2 -26.6 6 -26 9 -24.6C10.4 -18 10.4 -11 9.4 -6.4C5 -5 0 -5 -3 -6C-3.4 -13 -3.4 -20 -2 -26z', 'M-1.4 -25.4C2.4 -25.8 5.8 -25.4 8.4 -24.2C9.6 -18 9.6 -11.4 8.8 -7.2C4.6 -6 0.4 -6 -2.4 -6.8C-2.8 -13 -2.8 -19.6 -1.4 -25.4z');
  body += S(dt[1], 0.5, 'M-8 -16q2 4 1 8M-5 -14q1 4 0.4 7', 0.5) + strokes(3.6, -15, 4, 7, 8, 1.6, 0, '#d8ccb0', 0.4, 0.4) + P('#e8a84a', A.ell(3, -18, 1.6, 1.3) + A.ell(6.4, -12, 1.4, 1.2), 0.4);   // a honey smear on the apron
  // the ears: one straight up, one folded over at the tip; their pink insides; each twitches on its own
  const earUp = G('gca-ear', -2, -44, P(ft[1], 'M-4.4 -44C-6.6 -54 -6.4 -64 -3.6 -66.4C-1 -65 -0.4 -55 -1 -44z') + P(ft[0], 'M-4 -44.6C-5.8 -54 -5.6 -62.6 -3.6 -65C-1.8 -63.4 -1.4 -55 -1.6 -44.6z') + P('#e8b0a0', 'M-3.6 -47C-4.6 -54 -4.4 -60.4 -3.4 -62.4C-2.4 -60.4 -2.2 -54 -2.4 -47z', 0.8) + S(ft[2], 0.45, 'M-5 -50q-0.4 -6 0.6 -12', 0.6));
  const earFold = G('gca-ear', 3, -44, P(ft[1], 'M1.4 -44.4C1 -52 2 -58 4.4 -60C7 -60.4 11 -57.6 12.6 -54.4C11 -54.6 8.6 -55.6 6.6 -56C5.4 -52 4.8 -48 4.8 -44z') + P(ft[0], 'M2 -44.6C1.8 -51.6 2.8 -57 4.6 -58.6C6.8 -58.6 9.6 -56.8 11 -54.8C9 -55.2 7.4 -55.8 6 -55.6C5 -52 4.4 -48 4.2 -44.6z') + P(ft[3], 'M10.6 -54.6C11.6 -54.2 12.4 -54.2 12.8 -54.6L12.4 -53.4z', 0.6));
  let head = form(fur, 'M-6 -36C-7 -43 -2 -47 4 -46.6C10 -46 13 -42 13 -38.6C14.8 -37.6 15 -35.4 13.6 -34.6C11 -33 5 -32.6 0 -33.2C-3.4 -33.6 -5.6 -34.4 -6 -36z', 'M-5.4 -36.8C-6.2 -42.6 -1.6 -46 3.8 -45.6C9.2 -45 12 -41.6 12 -38.6C13.6 -37.8 14 -36 12.8 -35.4C10.4 -34.2 5 -33.8 0.4 -34.4C-2.8 -34.8 -5 -35.4 -5.4 -36.8z', 'M-4.4 -39C-3.6 -43.6 0 -45.4 3.6 -45.2C0 -44 -2.4 -41.6 -3 -38.6z', 0.55);
  head += P('#f2e6d2', 'M7 -37C9.6 -38.6 13 -38.4 14 -36.4C14 -35 11.6 -34.2 9 -34.4C7.4 -34.6 6.6 -36 7 -37z') + P('#c87070', A.ell(14, -37, 0.9, 0.8)) + S('#efe4d0', 0.25, 'M11.6 -36l4.6 -1.4M11.8 -35.4l4.8 0.4', 0.7) + eye(8, -40.6, 1.15, '#7a4a1e') + S('#5a3a22', 0.4, 'M6.4 -42.4q1.6 -0.8 3.4 -0.2', 0.8) + strokes(2, -40, 6, 4, 22, 1.1, -0.8, ft[2], 0.4, 0.45);
  head += S('#6a3a2a', 0.45, 'M10.6 -34.6q1.4 1 2.8 0.4', 0.8) + P('#e09080', A.ell(9, -36.4, 1.6, 0.9), 0.35);
  // the straw sun hat, worn back between the ears, a blue ribbon whose tails lift
  const hat = K.T('#d8c490');
  const hatG = P(hat[1], 'M-11 -44.4C-8 -46.6 0 -47.6 6 -47.4C12 -47.2 16 -46 16.4 -44.6C12 -43 -6 -42.8 -11 -44.4z') + P(hat[0], 'M-4.4 -46.6C-4.4 -50.6 -0.6 -52.4 3.4 -52.2C7.6 -52 9.6 -50 9.6 -46.8C4 -46 -0.4 -46 -4.4 -46.6z') + P(hat[2], 'M-3.6 -47.6C-3.4 -50.4 -0.6 -51.6 2.4 -51.6C0 -50.6 -1.6 -49.4 -2 -47.4z', 0.6) + S(hat[1], 0.35, 'M-9 -44.8q12 -2 24 0M-6.6 -45.6q10 -1.6 20 0', 0.6) + P('#4a7aa8', 'M-4.4 -47.2C0 -46.4 5 -46.4 9.6 -47.4V-48.8C5 -47.8 0 -47.8 -4.4 -48.6z') + G('gca-cl', -4, -47.6, P('#4a7aa8', 'M-4.4 -48C-7 -46.4 -9 -43 -9.6 -40L-8.4 -40.4C-7.6 -43 -6 -45.6 -4 -46.8z') + P('#5f90bc', 'M-4.4 -47.6C-6.4 -45.6 -7.6 -43.4 -8 -41.4L-7 -41.8C-6.4 -43.6 -5.4 -45.4 -4 -46.8z', 0.8));
  // the honey jar in the near hand, and a bee that goes round it
  const jar = P('#c8862a', A.rrect(11, -21, 6.4, 7.6, 2)) + P('#e8b040', A.rrect(11.6, -20.4, 5.2, 6.4, 1.6)) + P('#f8d878', A.rect(12.4, -19.4, 1.4, 4.6), 0.8) + P('#8a6a44', A.rrect(10.8, -22.2, 6.8, 1.8, 0.7)) + P('#efe4c8', A.rect(12.6, -18.4, 3.4, 2.4), 0.85);
  const arN = K.limb(8, -28, Math.PI * 0.82, 9, 3.4, 3, dress);
  const near = G('gca-ar gca-a', 8, -28, arN.d + jar + P(ft[0], A.ell(arN.tip[0] + 0.6, arN.tip[1] + 0.6, 2.2, 1.9)));
  const bee = G('gca-bee', 16, -28, P('#2a2214', A.ell(18, -27, 1.6, 1.1)) + P('#e8b830', A.rect(17.4, -28, 0.9, 2)) + P('#f8fbff', A.ell(17.4, -28.6, 1, 0.7) + A.ell(18.6, -28.6, 1, 0.7), 0.75));
  const arF = K.limb(-7, -28, Math.PI * 0.94, 10, 3.2, 2.8, A.mix(dress, '#2c3424', 0.22));
  const far = G('gca-ar gca-b', -7, -28, arF.d + P(ft[1], A.ell(arF.tip[0], arF.tip[1] + 0.6, 1.9, 1.7)));
  return { legs, back: earUp + far, body, near: near + bee, head: head + earFold + hatG, hd: [2, -33] };
}
function _gcaHollin(K) {
  const { A, P, S, form, strokes, eye, G } = K, fur = '#8a5a36', jer = '#4f6a3a', shirt = '#c8b894', trou = '#5a4a3a', ft = K.T(fur), jt = K.T(jer);
  const legs = _gcaLegs(K, { x: 0, gap: 3.6, hy: -24, w: 4.4, c: trou, fc: '#3a2a1e', foot: 3.4, toe: 4.4 });
  // the axe over the far shoulder, its head behind his back
  const axe = S('#6a4a2a', 1.7, 'M-12 -21L-3 -63', 1) + S('#a68454', 0.5, 'M-11.5 -22L-2.7 -62', 0.7) + P('#5a646a', 'M-3.6 -58.6L-11.6 -62.4C-13 -59.6 -13 -55.6 -11.4 -52.4L-4.6 -55.4z') + P('#8a949a', 'M-4 -57.8L-10.6 -60.8C-11.6 -58.6 -11.6 -56 -10.6 -53.6L-4.6 -56.2z') + P('#d0d8dc', 'M-11 -61.4C-12 -59 -12 -56 -11 -53.4L-10.2 -54C-10.8 -56.2 -10.8 -58.6 -10.2 -60.8z', 0.9);
  let body = form(shirt, 'M-9 -22C-10 -36 -8 -48 0 -49C8 -49 10 -36 9 -22C5 -20 -5 -20 -9 -22z', 'M-8.4 -23C-9.4 -36 -7.4 -47.4 -0.4 -48C7 -48 8.6 -36 8.2 -23C4.6 -21.4 -4.6 -21.4 -8.4 -23z');
  body += form(jer, 'M-10 -20C-11 -34 -9 -46 -3 -49L1 -36L4 -49C9 -46 11 -34 10 -20C5 -18 -5 -18 -10 -20z', 'M-9.4 -21C-10.4 -34 -8.4 -45 -3.4 -47.6L0.6 -36.6L3.6 -47.6C8 -45 9.8 -34 9.4 -21.2C4.8 -19.4 -4.8 -19.4 -9.4 -21z', 'M-8.4 -23C-9.4 -32 -8 -41 -4.4 -45C-6 -38 -6.6 -30 -6.2 -22.6z', 0.5);
  body += P('#3a2a1a', A.rect(-9.6, -27, 19.4, 2.4)) + P('#b89a5a', A.rrect(-0.8, -27.4, 3.2, 3, 0.6)) + P('#3a2a1a', A.rect(0, -26.6, 1.6, 1.4)) + strokes(0, -36, 8, 10, 30, 1.4, 0.1, jt[2], 0.45, 0.25) + strokes(1, -33, 8, 10, 18, 1.4, 0, jt[3], 0.45, 0.3);   // a belt; felted wool
  body += P(A.mix(jer, '#7a9a5a', 0.5), A.ell(-6, -42, 1.4, 1) + A.ell(6.4, -38, 1.2, 0.8), 0.5);   // moss on the shoulders, from working under trees
  // the head: a long muzzle, the ears out sideways, the neck rising from the collar; the antlers, many-pointed, catching the light
  let neck = form(fur, 'M-3 -46C-3 -52 -1 -57 2 -58C6 -57 7 -52 6 -46z', 'M-2.4 -46.4C-2.4 -52 -0.6 -56 2 -57C5 -56 5.6 -52 5.2 -46.4z') + S(ft[2], 0.5, 'M-1.6 -48q0 -4 1.6 -7', 0.6);
  let head = form(fur, 'M-3 -60C-3 -66 1 -69 5 -68.6C9 -68 11 -64 14 -60C16 -58 16 -56 14 -55.4C11 -55 7 -55.4 3 -56C-1 -56.6 -3 -58 -3 -60z', 'M-2.4 -60.6C-2.4 -65.6 1.2 -68 4.8 -67.6C8.4 -67 10.2 -63.6 13 -60C14.6 -58.4 14.6 -57 13.2 -56.6C10.6 -56.2 7 -56.6 3.2 -57.2C-0.4 -57.6 -2.4 -58.8 -2.4 -60.6z', 'M-1.4 -62.6C-1 -66 1.6 -67.4 4.4 -67C2 -66.2 0.4 -64.6 0 -62.4z', 0.55);
  head += P('#2a1e16', A.ell(14.6, -57, 1.3, 1.1)) + P('#fff', A.circ(14.3, -57.4, 0.35), 0.7) + P('#e8dcc8', 'M10 -55.6C11.6 -55 13 -55 14.4 -55.4C13 -54.2 11.2 -54.2 10 -55.6z', 0.8) + eye(6.6, -62.2, 1.1, '#3a2414') + S('#3a2414', 0.4, 'M5 -64q1.6 -0.6 3.2 0.2', 0.7) + strokes(4, -61, 6, 4, 18, 1.1, -0.9, ft[2], 0.4, 0.4);
  head += P(A.mix(fur, '#ffffff', 0.5), A.ell(-2.4, -59.4, 2, 1.6), 0.5);   // the pale patch under the jaw
  const ear = G('gca-ear', 0, -64, P(ft[1], 'M0 -64C-4 -66 -8 -66 -10 -64C-8 -62 -4 -61.6 0 -62.6z') + P('#d8a890', 'M-1 -63.6C-4 -64.8 -6.6 -64.8 -8.4 -63.8C-6.4 -62.8 -3.6 -62.6 -1 -63z', 0.75));
  const ant = K.T('#d8c8a8');
  const antD = 'M3 -67C2 -71 -1 -74 -4 -77M-0.6 -72.6C-3 -72.6 -5.4 -71.6 -7 -70M-2.4 -75C-2 -78 -1 -80 0.6 -81M6 -67C8 -71 11 -73 14 -74M9.6 -71.4C10 -74.4 11 -76.6 12.6 -78M12 -73.4C14 -73 16 -71.6 17 -70';
  head += S(ant[1], 1.6, antD, 1) + S(ant[0], 1, antD, 1) + S(ant[2], 0.45, 'M2.4 -68.4C1.4 -71.4 -1 -74 -3.4 -76.2M6.4 -68C8.4 -71 11 -72.8 13.4 -73.6', 0.8);
  // the near arm, sleeve rolled to the elbow, and in its hand a small carved wren
  const arN = K.limb(7, -45, Math.PI * 0.9, 9, 4, 3.6, jer), fore = K.limb(arN.tip[0], arN.tip[1], Math.PI * 0.62, 8, 3.4, 3, fur);
  const wren = P('#b08a5a', A.ell(fore.tip[0] + 2, fore.tip[1] - 1.4, 2.6, 1.8)) + P('#c8a470', A.circ(fore.tip[0] + 4, fore.tip[1] - 2.8, 1.3)) + P('#8a6440', `M${K.f(fore.tip[0] - 0.4)} ${K.f(fore.tip[1] - 2)}l-2 -2l0.4 2.6z`) + P('#5a3a22', A.circ(fore.tip[0] + 4.3, fore.tip[1] - 3, 0.3));
  const near = G('gca-ar gca-a', 7, -45, arN.d + P(K.T(shirt)[0], A.ell(arN.tip[0], arN.tip[1], 2.4, 1.6)) + fore.d + P(ft[1], A.ell(fore.tip[0] + 0.6, fore.tip[1], 2, 1.7)) + wren);
  const arF = K.limb(-6, -45, Math.PI * 0.98, 17, 3.6, 3, A.mix(jer, '#2c3424', 0.22));
  const far = G('gca-ar gca-b', -6, -45, arF.d + P(ft[1], A.ell(arF.tip[0], arF.tip[1] + 0.6, 1.9, 1.7)));
  return { legs, back: far + axe, body, near, head: neck + ear + head, hd: [1, -47] };
}
function _gcaAngler(K) {
  const { A, P, S, form, strokes, eye, G } = K, coat = '#5f6a4a', skin = '#e2b894', boots = '#3e4a3a', ct = K.T(coat), sk = K.T(skin);
  const legs = _gcaLegs(K, { x: 0, gap: 3.4, hy: -20, w: 4.4, c: '#4a4a3e', fc: boots, foot: 3.6, toe: 4.2 });
  const rod = S('#7a5a34', 1.2, 'M-10 -20L-28 -64', 1) + S('#c8a86a', 0.4, 'M-9.6 -21L-27.6 -63.4', 0.7) + S('#e8e4dc', 0.25, 'M-28 -64Q-34 -40 -30 -18', 0.6) + P('#4a3a2a', A.circ(-11, -24, 1.6));
  let body = form(coat, 'M-10 -16C-12 -30 -9 -43 1 -45C10 -45 12 -32 11 -16C6 -13 -5 -13 -10 -16z', 'M-9.4 -17C-11.2 -30 -8.4 -41.6 0.6 -43.4C9 -43.4 10.6 -31.4 10.2 -17.2C5.4 -14.6 -4.6 -14.6 -9.4 -17z', 'M-8.4 -20C-9.6 -29 -7.6 -37 -3 -40.6C-5.6 -34 -6.4 -27 -6.2 -19.6z', 0.5);
  body += S(ct[1], 0.6, 'M1.4 -43L2.4 -16M-8 -26q4 1.4 8 0', 0.7) + P(ct[1], A.rrect(-8, -28, 6.4, 5, 1.2)) + P(ct[3], A.circ(3.6, -36, 0.7) + A.circ(3.8, -30, 0.7) + A.circ(4, -24, 0.7), 0.8) + strokes(0, -30, 9, 12, 20, 1.8, 0.1, ct[2], 0.45, 0.2);
  // the head bowed a little: a weathered face, a long white beard, heavy brows, the battered hat
  let head = form(skin, A.ell(3, -52, 7, 7.6), A.ell(2.4, -52.6, 6.2, 6.8));
  head += P(sk[1], 'M8.6 -50C10 -50.6 10.6 -49 9.8 -48C9.2 -47.6 8.6 -48 8.4 -48.6z') + eye(6.4, -53.2, 0.85) + S('#efeae0', 1, 'M4 -55.6q2.4 -1.4 4.6 -0.4', 1) + P('#e09a80', A.ell(7, -50.4, 1.6, 0.9), 0.35);
  head += P('#c8c2b6', 'M-2 -50C-1 -44 2 -38 6 -36C9 -38 10 -43 10 -48C7 -46.6 3 -46.6 -2 -50z') + P('#efeae2', 'M-1.4 -50C-0.6 -45 2 -40 5.6 -38C8 -40 9 -44 9.2 -47.6C6.4 -46.6 2.6 -46.8 -1.4 -50z') + strokes(4, -43, 3.4, 4, 12, 2, 0.15, '#c8c2b6', 0.4, 0.7) + S('#8a7a6a', 0.5, 'M5.2 -46.8q2 0.8 3.8 0', 0.8);
  const hat = K.T('#6e5a3a');
  head += P(hat[1], 'M-6 -56.4C-6 -63 -1 -65 4 -64.6C9 -64.2 11 -61 11 -56.4C13 -56 14.6 -55 14 -54.2C8 -53.2 -2 -53.4 -8 -54.6C-8.6 -55.6 -7.4 -56.2 -6 -56.4z') + P(hat[0], 'M-5.4 -57C-5.4 -62.4 -0.6 -64 3.8 -63.6C8.2 -63.2 10 -60.4 10 -56.8C4 -56 -1 -56.2 -5.4 -57z') + P(hat[2], 'M-4.4 -58C-4 -61.4 -1 -63 2.6 -62.8C0 -62 -1.8 -60.4 -2.4 -57.8z', 0.6) + P(hat[3], 'M-5.4 -57.4C0 -56.6 5 -56.6 10 -57.2V-58.4C5 -57.8 0 -57.8 -5.4 -58.6z') + P('#c84a3a', 'M7 -58.6l2 -3.4l0.8 3.4z', 0.9);   // a fly in the band
  const arF = K.limb(-7, -40, Math.PI * 0.82, 14, 4, 3.4, A.mix(coat, '#2c3424', 0.22));
  const far = G('gca-ar gca-b', -7, -40, arF.d + P(sk[1], A.ell(arF.tip[0], arF.tip[1] + 0.6, 2, 1.8)));
  const arN = K.limb(7, -40, Math.PI * 1.02, 14, 4.2, 3.6, coat);
  const near = G('gca-ar gca-a', 7, -40, arN.d + S(ct[2], 0.6, 'M6 -38.6q0.8 5 0.6 10', 0.5) + P(ct[3], A.ell(arN.tip[0], arN.tip[1] - 0.6, 2.3, 1)) + P(sk[1], A.ell(arN.tip[0] + 0.3, arN.tip[1] + 1.4, 1.7, 2.3)) + P(sk[0], A.ell(arN.tip[0], arN.tip[1] + 1, 1.2, 1.8)));
  return { legs, back: rod + far, body, near, head, hd: [2, -45], lean: 3 };
}
function _gcaPerpetua(K) {
  const { A, P, S, form, strokes, eye, G } = K, shell = '#c88a5a', skin = '#b8a890', st = K.T(shell), bt = K.T(skin);
  let body = P(bt[1], 'M-16 0C-16 -3 -10 -4 0 -4C8 -4 12 -6 14 -12C15 -16 18 -18 20 -16C22 -14 21 -8 18 -4C15 -1 8 0 -16 0z') + P(bt[0], 'M-15 -0.8C-14.6 -2.8 -9 -3.4 0 -3.4C7.6 -3.4 11.4 -5.6 13.4 -11.4C14.6 -15 17 -16.6 19 -15.4C17.6 -12 16.6 -7 13 -4.4C9.6 -2.4 2 -1.6 -15 -0.8z') + strokes(2, -2, 12, 1.4, 14, 1.4, 1.5, bt[3], 0.4, 0.3) + P('#ffffff', 'M-12 -1.4C-4 -2.4 4 -2.6 10 -3.6', 0.0);
  body += S(bt[1], 0.7, 'M18 -16l1 -6M20 -15.6l3 -5', 1) + P(bt[1], A.circ(19, -22, 1) + A.circ(23, -20.6, 1)) + eye(19.1, -22.1, 0.7) + eye(23.1, -20.7, 0.7) + S('#6a5a44', 0.4, 'M19.4 -12.6q1.4 0.6 2.4 -0.4', 0.8);
  const sx = -2, sy = -12;
  let sh = form(shell, A.ell(sx, sy, 11.4, 10.4), A.ell(sx - 0.6, sy - 0.6, 10.4, 9.4), 'M-11 -16C-9 -21 -3 -23.4 2 -22C-3 -21 -7 -19 -9.4 -14z', 0.6);
  let sp = ''; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 4.2, rr = 9.4 * (1 - t * 0.9); sp += (i ? 'L' : 'M') + K.f(sx + Math.cos(a) * rr) + ' ' + K.f(sy + Math.sin(a) * rr * 0.92); }
  sh += S(st[3], 1.1, sp, 0.6) + S(st[2], 0.5, sp, 0.4) + strokes(sx, sy, 8, 7, 20, 1.6, 0.5, st[1], 0.45, 0.35);
  const cap = K.T('#3a4a6a');
  const capG = P(cap[1], 'M15.6 -23C16 -27 21 -28.6 24 -26.4C25 -25.4 25 -24 24 -23.6C21 -23 18 -22.8 15.6 -23z') + P(cap[0], 'M16.2 -23.6C16.8 -26.6 20.6 -27.6 23 -26C24 -25.2 23.6 -24.4 23 -24.2C20.6 -23.8 18.4 -23.6 16.2 -23.6z') + P(cap[3], 'M22 -24.4C24.4 -24.6 26.4 -24 27 -23.2C25.4 -22.6 23.4 -22.8 22 -23.2z') + P('#d8b44a', A.circ(19.6, -25.6, 0.6));
  const bag = S('#6a4a2a', 0.9, 'M-6 -22L4 -6', 1) + P('#a8763e', A.rrect(1, -10, 10, 8, 1.8)) + P('#c8945a', A.rrect(1.4, -10, 9.2, 3, 1.4)) + P('#f2ead8', 'M3 -12l4 -2l3 3l-6 1z') + P('#c84a3a', A.circ(6, -6, 0.9));
  return { legs: '', back: '', body: body + sh, near: bag, head: capG, hd: [18, -14], snail: 1 };
}
const _GCA_DRAW = Object.freeze({ tam: _gcaTam, bramble: _gcaBramble, pip: _gcaPip, thistle: _gcaThistle, wick: _gcaWick, quince: _gcaQuince, hollin: _gcaHollin, angler: _gcaAngler, perpetua: _gcaPerpetua });
function gardenCastSvg(id, o) {
  o = o || {};
  const draw = _GCA_DRAW[id]; if (!draw) return '';
  const walk = !!(o.walk || _GCA.walkNow), key = id + (walk ? 'w' : 'i');
  let s = _GCA.cache.get(key);
  if (s != null) return s;
  try {
    const K = _gcaKit(id), F = draw(K), A = K.A, w = id === 'perpetua' ? 22 : id === 'hollin' ? 12 : 13;
    const shadow = typeof gardenFigureShadowSvg === 'function' ? gardenFigureShadowSvg(w, w * 0.26) : A.P('#2a3322', A.ell(0, 0.6, w, w * 0.26), 0.22);
    const up = `<g class="gca-up" style="transform-origin:0px 0px">${F.back}${F.body}${K.G('gca-hd', F.hd[0], F.hd[1], F.head)}${F.near}</g>`;
    const lean = F.lean ? `<g transform="skewX(${-F.lean})">${up}</g>` : up;
    s = `<g class="wd-flip"><g class="gca gca-${walk ? 'walk' : 'idle'} gca-${id}">${shadow}${F.legs}${lean}</g></g>`;
  } catch (e) { s = ''; }
  if (_GCA.cache.size > 40) _GCA.cache.clear();
  _GCA.cache.set(key, s);
  return s;
}
/** A wonder sprite's frame: the cast swap between walking and standing when they start or stop (the painted style only). */
function gardenCastWalkSync(S) {
  if (!S || !S.row || !_GCA_DRAW[S.row.id] || typeof _wdFolkMarkup !== 'function' || !gardenCastOn()) return;
  const walking = !!(S.path && S.path.length && !S.hold);
  if (S._gcaWalk === walking) return;
  S._gcaWalk = walking;
  _GCA.walkNow = walking;
  let svg = '';
  try { svg = _wdFolkMarkup(S.row, String(S.svg || '').indexOf('wd-mark') >= 0); } catch (e) { svg = ''; } finally { _GCA.walkNow = false; }
  if (svg && typeof wdArt === 'function') wdArt(S, svg);
}
