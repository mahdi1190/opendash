/* ---------- a narrowboat as a real 3D model (15 Oct; polished 16 Oct) ----------
   A side sprite and a back sprite glued onto a box broke at most angles (ends floating apart, sides squeezed into stripes).
   Canal boats are a small 3D model drawn from any angle, at the standard of the v2 hand-drawn boats:
   - true size (K8): the gunwale 0.5 m above the waterline, a 1.2 m cabin, the roof about 1.75 m and the chimney's hat about
     2.05 m above the water (16 Oct: it stood 2.52 m, a giant in every cell); the hull starts at the waterline (the part under
     the water is never drawn over it);
   - a hull with a rounded bow sweep and a rising sheer, a rounded counter stern, rubbing strakes, a rudder and a swan-neck
     tiller; a trad, semi-trad or cruiser stern (rails) by livery;
   - a cabin with tumblehome (its sides lean in), a cambered roof with handrails, coachlined panels, a name panel (shapes, no
     text), portholes or windows with curtains, a side hatch, stern and front doors and a sliding hatch;
   - a cratch board and its cover over the bow well;
   - roof clutter seeded per boat: chimney, mushroom vents, pole and plank, plant pots, coal bags, a solar panel, a bike, a
     roof box, logs;
   - mooring ropes from the stern and bow studs to pins on the bank (moored boats only; the bank side from o.regions, the
     entity's bankSide, else the side towards the eye);
   - lit windows at night (a seeded share of boats has someone aboard), with a soft glow (emissive: never graded);
   - a gentle bob on the water when the caller passes the time (o.t, seconds): heave, roll and pitch, seeded per boat.
   It is drawn in painter's groups valid from any angle: the hull (convex: its seen faces never overlap), the decks, the far
   end's gear, the cabin (convex) with its details, the roof and its clutter (before the cabin when the eye is below the roof),
   the near end's gear, and the ropes (first when the bank is on the far side). Colours come from the livery and a soft sky
   light; the material pass grades them by light like everything else, except lit windows. */
const WORLD_BOAT_LIVERIES = Object.freeze([
  { cabin: '#2f5e3e', panel: '#3b7350', trim: '#d9b44a', roof: '#6b5f52', door: '#9a2a24', name: '#e9dcb4', canvas: '#2f4a3a', curtain: '#b8433a', stern: 'trad', win: 'port' },
  { cabin: '#7a1f2b', panel: '#8e2a36', trim: '#e0c060', roof: '#4a4440', door: '#2f5e3e', name: '#f0e2b8', canvas: '#3b3b46', curtain: '#e8d9a8', stern: 'trad', win: 'port' },
  { cabin: '#22406b', panel: '#2d5385', trim: '#d9b44a', roof: '#8a8478', door: '#7a1f2b', name: '#e9dcb4', canvas: '#22314a', curtain: '#d9c47a', stern: 'cruiser', win: 'rect' },
  { cabin: '#2e2e33', panel: '#3b3b42', trim: '#c9a24a', roof: '#6a5a48', door: '#9a2a24', name: '#c9a24a', canvas: '#4a3a2a', curtain: '#8fb0c8', stern: 'semi', win: 'rect' },
  { cabin: '#5b2a4a', panel: '#6e3659', trim: '#e0c060', roof: '#4a4440', door: '#22406b', name: '#efe0b0', canvas: '#3a2a38', curtain: '#f2d27a', stern: 'trad', win: 'port' },
  { cabin: '#1f4f55', panel: '#2a6a70', trim: '#e8d39a', roof: '#c9c2b0', door: '#b5452c', name: '#e8d39a', canvas: '#1d3a3e', curtain: '#e8a0a0', stern: 'cruiser', win: 'rect' },
  { cabin: '#8a3b1e', panel: '#a24a26', trim: '#f0d080', roof: '#3e4a3a', door: '#2b4b2f', name: '#f3e6c0', canvas: '#4a3426', curtain: '#f4e9cf', stern: 'trad', win: 'port' },
  { cabin: '#3f5a2a', panel: '#d8cfa8', trim: '#7a1f2b', roof: '#5a5048', door: '#7a1f2b', name: '#7a1f2b', canvas: '#344a2a', curtain: '#c86848', stern: 'semi', win: 'port' },
  { cabin: '#14233f', panel: '#7a2232', trim: '#d9b44a', roof: '#4a4440', door: '#d9b44a', name: '#d9b44a', canvas: '#1c2a42', curtain: '#efe2c0', stern: 'trad', win: 'rect' },
  { cabin: '#6a6e72', panel: '#868b90', trim: '#26303a', roof: '#3b4046', door: '#c0392b', name: '#26303a', canvas: '#3b4046', curtain: '#f1c40f', stern: 'cruiser', win: 'rect' },
]);
/** The boat's true proportions in metres (K8: a narrowboat stands 1.7-2.1 m above the water to its chimney's hat). */
const WORLD_BOAT_DIMS = Object.freeze({ freeboard: 0.5, cabin: 1.2, camber: 0.06, chimney: 0.26, hat: 0.03, hatch: 0.08 });

/* ---------- the registered model ---------- */
worldModelDefine('narrowboat', {
  name: 'Canal narrowboat, widebeam and cruiser', ids: [/narrowboat|widebeam|boat\.canal/], sampleObj: 'boat.narrowboat', float: true, bob: false, sunLit: false, faceCap: 1e9, solidity: 'solid',
  liveries: () => WORLD_BOAT_LIVERIES,
  samples: [{ livery: 0 }, { livery: 2, age: 0.8 }, { livery: 5, size: 1.15 }],
  /** A narrowboat is 6 to 22 m long and at most 3.6 m wide (a widebeam), whatever the library's size says. */
  dims(info) { const s = info && info.size; return { L: s && s.w > 4 ? s.w : 18, B: s && s.d > 1 ? Math.min(s.d, 3.6) : 2.1, H: s && s.h > 0 ? s.h : 2.1 }; },
  /** The livery: the variant picks the family (0 green, 1 maroon, 2 blue, as the library art), the boat's own seed one of its liveries; a scene's model.livery wins. */
  params(ent, o, p) {
    if (p.liveryKey != null) return null;
    const NL = WORLD_BOAT_LIVERIES.length, vb = Math.abs(ent.variant | 0) % 3, fam = [];
    for (let i = vb; i < NL; i += 3) fam.push(i);
    return { liveryKey: fam[(p.seed >>> 3) % fam.length] };
  },
  build(p, h) {
    const ent = h.ent, cam = h.cam, o = h.o || {}, D = WORLD_BOAT_DIMS, P = h.P, rnd = h.rnd;
    const L = p.L, B = p.B, yW = 0, ax = h.ax, az = h.az, rx = h.rx, rz = h.rz, moving = p.moving, t = p.t;   // y is relative to the waterline
    // the gentle bob (a time from the caller, or an agent's own clock; none without one, so a baked static never jitters)
    const ph = rnd() * Math.PI * 2, ph2 = rnd() * Math.PI * 2;
    const heave = t == null ? 0 : (moving ? 0.018 : 0.01) * Math.sin(t * 2 * Math.PI / 3.6 + ph);
    const roll = t == null ? 0 : (moving ? 0.01 : 0.006) * Math.sin(t * 2 * Math.PI / 4.7 + ph2);
    const pitch = t == null ? 0 : 0.0015 * Math.sin(t * 2 * Math.PI / 5.3 + ph * 0.6);
    h.pose.heave = heave; h.pose.roll = roll; h.pose.pitch = pitch;
    const liv = p.livery, livN = p.liveryIndex, season = p.season;
    // ---- proportions ----
    const hb = B / 2, s0 = -L / 2, bowA = L / 2, bowLen = Math.min(3.4, 0.2 * L), sternLen = Math.min(1.0, 0.07 * L);
    const Gm = yW + D.freeboard;
    const G = a => Gm + 0.3 * Math.pow(Math.max(0, (a - (bowA - 5)) / 5), 2) + 0.1 * Math.pow(Math.max(0, (s0 + 2 - a) / 2), 2);
    const half = a => {
      if (a > bowA - bowLen) { const u = (a - (bowA - bowLen)) / bowLen; return hb * (1 - Math.pow(Math.min(1, u), 1.9)); }
      if (a < s0 + sternLen) { const u = (s0 + sternLen - a) / sternLen; return hb * Math.sqrt(Math.max(0, 1 - u * u)); }
      return hb;
    };
    const stern = liv.stern, aCr = bowA - bowLen + 0.35, c1 = aCr - 1.5, c0 = s0 + (stern === 'cruiser' ? 2.3 : stern === 'semi' ? 1.7 : 1.15);
    const Gc = Gm, CT = Gm + D.cabin, wB = hb - 0.12, wT = wB - 0.09, ridge = CT + D.camber;
    h.lod(Math.min(P(s0, 0, Gm)[2], P(bowA, 0, Gm)[2], P(0, hb, Gm)[2], P(0, -hb, Gm)[2]));
    const fine = h.fine, finer = h.finer;   // 10 cm (5 cm) at least 1.5 px: else the small details drop
    // ---- the outline in plan, (a, lat): from the stern round the right side to the stem and back down the left ----
    const R = [];
    for (let k = 0; k <= 5; k++) { const th = k / 5 * Math.PI / 2; R.push([s0 + sternLen * (1 - Math.cos(th)), hb * Math.sin(th)]); }
    for (let a = s0 + sternLen + 2.5; a < bowA - bowLen - 0.3; a += 2.5) R.push([a, hb]);
    for (let k = 0; k <= 8; k++) { const a = bowA - bowLen + bowLen * k / 8; R.push([a, half(a)]); }
    const Ot = R.concat(R.slice(1, -1).reverse().map(([a, l]) => [a, -l]));
    // ---- face builders (the shared kit: 79-world-4models.js) ----
    const groups = {};
    for (const k of ['hull', 'deck', 'aft', 'fore', 'cabin', 'roof', 'clutter', 'ropes']) groups[k] = h.part(k);
    h.sealRoles = new Set(['hull', 'cabin', 'roof', 'cover', 'gunwale', 'deck']);   // big panels made of pieces: sealed so no seam shows
    const centre = P(0, 0, (yW + Gm) / 2);
    h.centre = centre;
    const face = h.face, line = h.line, disc = h.disc, box = h.box;
    const dEye = p => Math.hypot(p[0], p[1] - cam.eye, p[2]);
    const sternNear = dEye(P(s0, 0, Gm)) < dEye(P(bowA, 0, Gm));
    const roofSeen = h.eyeY > CT + heave;
    // ---- 1. the hull: its sides from the waterline to the sheer, all round the outline ----
    h.part('hull');
    const seen = [];
    for (let i = 0; i < Ot.length; i++) {
      const [a1, l1] = Ot[i], [a2, l2] = Ot[(i + 1) % Ot.length];
      if (face([P(a1, l1, yW), P(a2, l2, yW), P(a2, l2, G(a2)), P(a1, l1, G(a1))], '#1e1f21', 'paint', 'hull', centre)) seen.push([a1, l1, a2, l2]);
    }
    // rubbing strakes and the gunwale's edge on the seen sides (lines just proud of the hull)
    if (fine) for (const [a1, l1, a2, l2] of seen) {
      const k = 1.012;
      line([P(a1, l1 * k, G(a1) - 0.1), P(a2, l2 * k, G(a2) - 0.1)], 0.035, '#3a3b3e', 'paint', 'strake');
      line([P(a1, l1 * k, G(a1) - 0.27), P(a2, l2 * k, G(a2) - 0.27)], 0.03, '#323336', 'paint', 'strake');
      line([P(a1, l1 * k, G(a1) - 0.01), P(a2, l2 * k, G(a2) - 0.01)], 0.025, '#4a4b4e', 'paint', 'gunwale');
    }
    // ---- 2. the decks (seen from above): the gunwale top, the stern deck, the bow well and the foredeck ----
    h.part('deck');
    if (h.eyeY > Gm + 0.05) {
      face(Ot.map(([a, l]) => P(a, l, G(a))), '#2a2b2e', 'paint', 'gunwale', null);
      const inset = (a0, a1, d, dy) => { const pts = []; for (const [a, l] of R) if (a >= a0 - 1e-6 && a <= a1 + 1e-6) pts.push([a, Math.max(0, l - d)]); pts.push([a1, Math.max(0, half(a1) - d)]); pts.unshift([a0, Math.max(0, half(a0) - d)]); return pts.map(([a, l]) => P(a, l, G(a) + dy)).concat(pts.slice().reverse().map(([a, l]) => P(a, -l, G(a) + dy))); };
      face(inset(s0, c0, 0.1, 0.005), '#6e604f', 'timber', 'deck', null);
      face(inset(c1, aCr, 0.14, -0.12), '#4a4038', 'timber', 'deck', null);
      face(inset(aCr, bowA, 0.1, 0.005), '#6e604f', 'timber', 'deck', null);
    }
    // ---- 3. the stern's gear: rudder, swan-neck tiller, stern fender, cruiser rails ----
    const aft = () => {
      face([P(s0 - 0.05, 0, yW), P(s0 - 0.62, 0, yW), P(s0 - 0.62, 0, Gm - 0.12), P(s0 - 0.05, 0, Gm - 0.02)], '#202123', 'metal', 'rudder', null);
      line([P(s0 - 0.08, 0, Gm - 0.05), P(s0 + 0.02, 0, G(s0) + 0.12)], 0.06, '#26272a', 'metal', 'rudder');
      // the swan neck rises from the rudder post and curves forward into the wooden tiller bar
      const tb = G(s0) + 0.1, neck = [[0.02, 0], [-0.02, 0.32], [0.05, 0.62], [0.2, 0.8], [0.38, 0.86]].map(([da, dy]) => P(s0 + da, 0, tb + dy));
      line(neck, 0.05, '#232325', 'metal', 'tiller');
      const barEnd = Math.min(s0 + 1.35, c0 - 0.2);
      line([P(s0 + 0.38, 0, tb + 0.86), P(barEnd, 0, tb + 0.9)], 0.045, '#9a6a3a', 'timber', 'tiller');
      if (finer) { disc(P(s0 + 0.24, 0, tb + 0.86), 0.035, '#d9b44a', 'metal', 'brass'); disc(P(barEnd, 0, tb + 0.9), 0.03, '#d9b44a', 'metal', 'brass'); }
      if (fine) disc(P(s0 - 0.04, 0, Gm - 0.18), 0.17, '#6e5636', 'fabric', 'fender', 0.75);
      if (stern === 'cruiser' || stern === 'semi') {
        // rails round the stern deck at hip height, on posts
        const yr = G(s0) + (stern === 'cruiser' ? 0.72 : 0.5), pts = [];
        for (const [a, l] of R) if (a <= c0 - 0.05) pts.push([a, l * 0.92]);
        const loop = pts.slice().reverse().map(([a, l]) => P(a, -l, yr)).concat(pts.map(([a, l]) => P(a, l, yr)));
        line(loop, 0.03, '#26272a', 'metal', 'rail');
        if (fine) pts.forEach(([a, l], i) => { if (i % 2 === 0 && l > 0.2) for (const sg of [-1, 1]) line([P(a, sg * l, G(a)), P(a, sg * l, yr)], 0.025, '#26272a', 'metal', 'rail'); });
      }
    };
    // ---- 4. the bow's gear: the cratch board and its cover over the well, the stem fender ----
    const fore = () => {
      const wC = Math.max(0.3, Math.min(wB - 0.04, half(aCr) - 0.06)), yb = G(aCr) + 0.04, apex = CT - 0.04;   // the cover narrows to the board
      const board = [P(aCr, -wC, yb), P(aCr, wC, yb), P(aCr, 0, apex)];
      const ins = P((c1 + aCr) / 2, 0, (Gc + CT) / 2);
      const drawBoard = () => {
        face(board, liv.cabin, 'paint', 'cratch', null);
        if (fine) {
          const c = P(aCr, 0, (yb * 2 + apex) / 3), m = (q, u) => c.map((v, i) => v + (q[i] - v) * u);
          face(board.map(p => m(p, 0.74)), liv.trim, 'paint', 'cratch', null);
          face(board.map(p => m(p, 0.64)), liv.panel, 'paint', 'cratch', null);
          const dm = (yb + apex) / 2 - 0.05, da = aCr + 0.012 * (_wexSees(cam, [ax, 0, az], c) ? 1 : -1);
          face([P(da, 0, dm - 0.14), P(da, 0.11, dm), P(da, 0, dm + 0.14), P(da, -0.11, dm)], liv.trim, 'paint', 'cratch', null);
        }
      };
      const bowSees = _wexSees(cam, [ax, 0, az], P(aCr, 0, (yb + apex) / 2));
      if (!bowSees) drawBoard();
      for (const sg of [-1, 1]) face([P(c1, sg * wB, Gc + 0.02), P(aCr, sg * wC, yb), P(aCr, 0, apex), P(c1, 0, CT + 0.01)], liv.canvas, 'fabric', 'cover', ins);
      if (bowSees) drawBoard();
      if (fine) { disc(P(bowA + 0.05, 0, G(bowA) - 0.22), 0.13, '#7a6040', 'fabric', 'fender', 1.1); disc(P(aCr + 0.5, 0, G(aCr + 0.5) + 0.12), 0.05, '#2a2a2c', 'metal', 'stud'); }
    };
    // ---- 5. the cabin: tumblehome sides with panels, windows, curtains, a side hatch and the name panel; doors at the ends ----
    const latAt = y => wB - (wB - wT) * (y - Gc) / (CT - Gc);
    const SP = (a, y, sg, off) => P(a, sg * (latAt(y) + (off || 0.006)), y);
    const LIT = { glass: '#ffd48a', curtain: '#f2b25e' };
    const aboard = rnd();   // a seeded share of boats has someone aboard: their windows light after dusk
    const glassFx = (dark) => ({ theta: _wexR(dark ? 2 : aboard, 3), lit: LIT.glass, halo: true });
    const cabin = () => {
      const ins = P((c0 + c1) / 2, 0, (Gc + CT) / 2), sides = [];
      for (const sg of [-1, 1]) if (face([P(c0, sg * wB, Gc), P(c1, sg * wB, Gc), P(c1, sg * wT, CT), P(c0, sg * wT, CT)], liv.cabin, 'paint', 'cabin', ins)) sides.push(sg);
      const rearSeen = !!face([P(c0, -wB, Gc), P(c0, wB, Gc), P(c0, wT, CT), P(c0, -wT, CT)], liv.cabin, 'paint', 'cabin', ins);
      const frontSeen = !!face([P(c1, -wB, Gc), P(c1, wB, Gc), P(c1, wT, CT), P(c1, -wT, CT)], liv.cabin, 'paint', 'cabin', ins);
      for (const sg of sides) {
        const kk = _wexLit([rx * sg, 0, rz * sg]), S = hex => _wexShade(hex, kk);
        const rect = (a0, a1, ya, yb, hex, mat, role, off, extra) => face([SP(a0, ya, sg, off), SP(a1, ya, sg, off), SP(a1, yb, sg, off), SP(a0, yb, sg, off)], hex, mat, role, null, extra);
        const ring = (ac, yc, r, hex, mat, role, off, extra, arc) => {
          const pts = [];
          if (arc) for (let k = 0; k <= 7; k++) { const th = arc[0] + (arc[1] - arc[0]) * k / 7; pts.push(SP(ac + Math.cos(th) * r, yc + Math.sin(th) * r, sg, off)); }
          else for (let k = 0; k < 12; k++) { const th = k / 12 * Math.PI * 2; pts.push(SP(ac + Math.cos(th) * r, yc + Math.sin(th) * r, sg, off)); }
          return face(pts, hex, mat, role, null, extra);
        };
        // the coachline frame and the panel
        const pa0 = c0 + 0.22, pa1 = c1 - 0.22, py0 = Gc + 0.18, py1 = CT - 0.2;
        if (fine) { rect(pa0, pa1, py0, py1, S(liv.trim), 'paint', 'trim', 0.006); rect(pa0 + 0.04, pa1 - 0.04, py0 + 0.03, py1 - 0.03, S(liv.panel), 'paint', 'panel', 0.008); }
        else rect(pa0, pa1, CT - 0.22, CT - 0.16, S(liv.trim), 'paint', 'trim', 0.006);
        // the name panel near the stern: a framed sign with ornaments (no text)
        const n0 = c0 + 0.5, n1 = n0 + Math.min(2.0, 0.24 * (c1 - c0)), ny0 = Gc + 0.38, ny1 = Gc + 0.84;
        if (fine) {
          rect(n0, n1, ny0, ny1, S(liv.trim), 'paint', 'name', 0.01);
          rect(n0 + 0.04, n1 - 0.04, ny0 + 0.04, ny1 - 0.04, S(liv.name), 'paint', 'name', 0.012);
          if (finer) {
            const ym = (ny0 + ny1) / 2;
            for (const ac of [n0 + 0.16, n1 - 0.16]) face([SP(ac - 0.07, ym, sg, 0.014), SP(ac, ym - 0.1, sg, 0.014), SP(ac + 0.07, ym, sg, 0.014), SP(ac, ym + 0.1, sg, 0.014)], S(liv.cabin), 'paint', 'name', null);
            rect(n0 + 0.3, n1 - 0.3, ym - 0.012, ym + 0.012, S(liv.cabin), 'paint', 'name', 0.014);
          }
        }
        // the side hatch (double doors with lights) amidships
        const hA = (c0 + c1) / 2 + 0.6;
        if (fine) {
          rect(hA - 0.38, hA + 0.38, Gc + 0.1, CT - 0.1, S(liv.door), 'paint', 'door', 0.012);
          rect(hA - 0.006, hA + 0.006, Gc + 0.1, CT - 0.1, S(_wexShade(liv.door, 0.7)), 'paint', 'door', 0.014);
          for (const d of [-0.19, 0.19]) { rect(hA + d - 0.1, hA + d + 0.1, CT - 0.5, CT - 0.25, S(liv.trim), 'paint', 'brass', 0.014); rect(hA + d - 0.075, hA + d + 0.075, CT - 0.475, CT - 0.275, '#8fa3ad', 'glass', 'window', 0.016, glassFx(false)); }
        }
        // windows: portholes or framed windows, curtains drawn half across
        const yc = Gc + 0.68, gaps = [[n0 - 0.3, n1 + 0.3], [hA - 0.75, hA + 0.75]], step = liv.win === 'port' ? 0.95 : 1.55;
        for (let a = n1 + 0.75; a < c1 - 0.45; a += step) {
          if (gaps.some(([g0, g1]) => a > g0 && a < g1)) continue;
          const fx = glassFx(rnd() < 0.18), cf = { theta: fx.theta, lit: LIT.curtain };
          if (liv.win === 'port') {
            ring(a, yc, 0.165, S('#c9a24a'), 'metal', 'brass', 0.01);
            ring(a, yc, 0.12, '#9fb3bd', 'glass', 'window', 0.012, fx);
            if (fine) {
              const cc = S(rnd() < 0.5 ? liv.curtain : _wexShade(liv.curtain, 0.85));
              ring(a, yc, 0.12, cc, 'fabric', 'curtain', 0.014, cf, [Math.PI * 0.7, Math.PI * 1.3]);
              ring(a, yc, 0.12, cc, 'fabric', 'curtain', 0.014, cf, [-Math.PI * 0.3, Math.PI * 0.3]);
            }
          } else {
            const w = 0.3, hh = 0.2;
            rect(a - w - 0.03, a + w + 0.03, yc - hh - 0.03, yc + hh + 0.03, S(liv.trim), 'paint', 'frame', 0.01);
            rect(a - w, a + w, yc - hh, yc + hh, '#9fb3bd', 'glass', 'window', 0.012, fx);
            if (fine) {
              const cc = S(liv.curtain), open = 0.3 + 0.2 * rnd();
              rect(a - w, a - w + 2 * w * open / 2, yc - hh, yc + hh, cc, 'fabric', 'curtain', 0.014, cf);
              rect(a + w - 2 * w * open / 2, a + w, yc - hh, yc + hh, cc, 'fabric', 'curtain', 0.014, cf);
              rect(a - w, a + w, yc + hh - 0.06, yc + hh, S(_wexShade(liv.curtain, 0.85)), 'fabric', 'curtain', 0.015, cf);
            }
          }
        }
        // the roof's lip along the top of the side
        rect(c0, c1, CT - 0.05, CT, S(_wexShade(liv.roof, 0.8)), 'paint', 'lip', 0.01);
      }
      // the bulkheads: double doors with lights, a porthole each side
      for (const [aE, seenE, sgn] of [[c0, rearSeen, -1], [c1, frontSeen, 1]]) {
        if (!seenE || !fine) continue;
        const kk = _wexLit([ax * sgn, 0, az * sgn]), E = (l, y, d) => P(aE + sgn * d, l, y);
        const quad = (l0, l1, ya, yb, hex, mat, role, d, extra) => face([E(l0, ya, d), E(l1, ya, d), E(l1, yb, d), E(l0, yb, d)], hex, mat, role, null, extra);
        quad(-0.52, 0.52, Gc + 0.04, CT - 0.08, _wexShade(liv.trim, kk), 'paint', 'trim', 0.01);
        quad(-0.48, -0.02, Gc + 0.06, CT - 0.12, _wexShade(liv.door, kk), 'paint', 'door', 0.014);
        quad(0.02, 0.48, Gc + 0.06, CT - 0.12, _wexShade(liv.door, kk), 'paint', 'door', 0.014);
        for (const l of [-0.25, 0.25]) quad(l - 0.08, l + 0.08, CT - 0.5, CT - 0.24, '#8fa3ad', 'glass', 'window', 0.018, glassFx(false));
        for (const l of [-0.74, 0.74]) if (Math.abs(l) + 0.15 < wB) {
          const ring = [], pane = [];
          for (let k = 0; k < 12; k++) { const th = k / 12 * Math.PI * 2; ring.push(E(l + Math.cos(th) * 0.12, Gc + 0.68 + Math.sin(th) * 0.12, 0.014)); pane.push(E(l + Math.cos(th) * 0.085, Gc + 0.68 + Math.sin(th) * 0.085, 0.016)); }
          face(ring, _wexShade('#c9a24a', kk), 'metal', 'brass', null); face(pane, '#9fb3bd', 'glass', 'window', null, glassFx(false));
        }
      }
    };
    // ---- 6. the roof, its handrails and its clutter ----
    const roof = () => {
      if (!roofSeen) return;
      const lw = wT + 0.03, ins = P((c0 + c1) / 2, 0, CT - 0.4);
      for (const sg of [-1, 1]) face([P(c0, sg * lw, CT), P(c1, sg * lw, CT), P(c1, 0, ridge), P(c0, 0, ridge)], liv.roof, 'slate', 'roof', ins);
      if (fine) for (const sg of [-1, 1]) { const l = sg * (wT - 0.07), y = CT + 0.06; line([P(c0 + 0.15, l, y), P(c1 - 0.15, l, y)], 0.03, _wexShade(liv.roof, 0.7), 'metal', 'handrail'); }
    };
    const items = [];
    const yR = l => CT + D.camber * (1 - Math.min(1, Math.abs(l) / (wT + 0.03)));   // the roof's height across it
    const addItem = (a, fn) => items.push({ a, fn });
    // the chimney near the front, brass bands and a hat; the sliding hatch at the stern; mushroom vents
    const chA = c1 - 0.85, chL = 0.18, chTop = yR(chL) + D.chimney + D.hat;
    addItem(chA, () => {
      const w = 0.075, yb = yR(chL), yt = yb + D.chimney;
      box(chA - w, chA + w, chL - w, chL + w, yb, yt, '#161616', '#0c0c0c', 'metal', 'chimney');
      if (fine) for (const y of [yb + 0.07, yb + 0.17]) box(chA - w - 0.01, chA + w + 0.01, chL - w - 0.01, chL + w + 0.01, y, y + 0.025, '#c9a24a', null, 'metal', 'brass');
      box(chA - w - 0.03, chA + w + 0.03, chL - w - 0.03, chL + w + 0.03, yt, yt + D.hat, '#1c1c1c', null, 'metal', 'chimney');
    });
    addItem(c0 + 0.35, () => box(c0 - 0.02, c0 + 0.75, -0.36, 0.36, yR(0) - 0.01, yR(0) + D.hatch, _wexShade(liv.roof, 0.85), liv.door, 'paint', 'hatch'));
    if (fine) for (const a of [c0 + 2.2, (c0 + c1) / 2 + 1.8, c1 - 0.25]) if (a < c1 - 0.1 && Math.abs(a - chA) > 0.3) addItem(a, () => { box(a - 0.07, a + 0.07, -0.07, 0.07, yR(0), yR(0) + 0.06, '#c9a24a', null, 'metal', 'vent'); disc(P(a, 0, yR(0) + 0.075), 0.09, '#b8923e', 'metal', 'vent', 0.35); });
    // the pole and plank along one side of the roof
    const pS = rnd() < 0.5 ? -1 : 1;
    if (fine) addItem((c0 + c1) / 2, () => {
      const l = pS * (wT - 0.14), y = yR(l) + 0.02;
      box(c0 + 1.0, c0 + 1.0 + Math.min(4.0, (c1 - c0) * 0.55), l - 0.11, l + 0.11, y, y + 0.04, '#8a6a44', '#9a7a52', 'timber', 'plank');
      line([P(c0 + 0.8, l - pS * 0.16, y + 0.03), P(c0 + 0.8 + Math.min(4.6, (c1 - c0) * 0.65), l - pS * 0.16, y + 0.03)], 0.045, '#7a5a34', 'timber', 'pole');
    });
    // the seeded clutter, in slots down the middle of the roof (clear of the chimney)
    if (fine) {
      const kinds = ['pots', 'coal', 'solar', 'bike', 'box', 'logs', 'pots'], len = { pots: 0.9, coal: 1.0, solar: 1.1, bike: 1.8, box: 1.1, logs: 0.8 };
      const nItems = 3 + Math.floor(rnd() * 3), lc = -pS * 0.12;
      let a = c0 + 1.15;
      for (let i = 0; i < nItems; i++) {
        const kd = kinds[Math.floor(rnd() * kinds.length)];
        let a0 = a + 0.15 + rnd() * 0.4, a1 = a0 + len[kd];
        if (a1 > chA - 0.25 && a0 < chA + 0.25) { a0 = chA + 0.3; a1 = a0 + len[kd]; }
        if (a1 > c1 - 0.15) break;
        a = a1;
        const am = (a0 + a1) / 2, y = yR(lc), r2 = rnd(), r3 = rnd();
        if (kd === 'pots') addItem(am, () => {
          const nP = 2 + Math.floor(r2 * 3), green = season === 'winter' ? '#4a5a3a' : season === 'autumn' ? '#6a7038' : '#4f7a3a';
          for (let k = 0; k < nP; k++) {
            const pa = a0 + (k + 0.5) * (a1 - a0) / nP, pl = lc + ((k * 0.37 + r3) % 1 - 0.5) * 0.25, hex = ['#b5653a', '#2f5e3e', '#7a1f2b', '#c9a24a'][(k + Math.floor(r3 * 4)) % 4];
            box(pa - 0.11, pa + 0.11, pl - 0.11, pl + 0.11, y, y + 0.2, hex, _wexShade(hex, 0.7), 'paint', 'pot');
            disc(P(pa, pl, y + 0.3), 0.15, green, 'flower', 'plant', 0.8);
            if (season !== 'winter' && finer) { disc(P(pa + 0.05, pl, y + 0.36), 0.04, ['#e04a5a', '#f2c94c', '#f7f2e8', '#c45ab0'][(k + Math.floor(r2 * 4)) % 4], 'flower', 'flower'); disc(P(pa - 0.06, pl, y + 0.33), 0.035, '#f2c94c', 'flower', 'flower'); }
          }
        });
        else if (kd === 'coal') addItem(am, () => {
          const nB = 2 + Math.floor(r2 * 2), hex = r3 < 0.5 ? '#e6e4dc' : '#3b5f8c';
          for (let k = 0; k < nB; k++) { const ba = a0 + k * (a1 - a0) / nB + 0.04; box(ba, ba + (a1 - a0) / nB - 0.06, lc - 0.24, lc + 0.24, y, y + 0.16, hex, _wexShade(hex, 1.05), 'fabric', 'coal'); }
        });
        else if (kd === 'solar') addItem(am, () => {
          const l0 = lc - 0.36, l1 = lc + 0.36;
          face([P(a0, l0, y + 0.06), P(a1, l0, y + 0.06), P(a1, l1, y + 0.17), P(a0, l1, y + 0.17)], '#1d2a44', 'glass', 'solar', null);
          if (finer) { line([P(a0, l0, y + 0.065), P(a1, l0, y + 0.065), P(a1, l1, y + 0.175), P(a0, l1, y + 0.175), P(a0, l0, y + 0.065)], 0.02, '#b8bcc0', 'metal', 'solar'); line([P(am, l0, y + 0.065), P(am, l1, y + 0.175)], 0.012, '#5a6a8a', 'metal', 'solar'); }
        });
        else if (kd === 'bike') addItem(am, () => {
          const hex = ['#c0392b', '#2c6fbb', '#2e8b57', '#d4a017', '#222222'][Math.floor(r2 * 5)], yb = y + 0.04, r = 0.32;
          const wheel = ac => { const pts = []; for (let k = 0; k <= 14; k++) { const th = k / 14 * Math.PI * 2; pts.push(P(ac + Math.cos(th) * r, lc + Math.sin(th) * r * 0.9, yb)); } line(pts, 0.03, '#1a1a1a', 'metal', 'bike'); };
          wheel(a0 + r); wheel(a1 - r);
          line([P(a0 + r, lc, yb + 0.02), P(am, lc + 0.05, yb + 0.03), P(a1 - r, lc, yb + 0.02), P(am + 0.1, lc - 0.25, yb + 0.04), P(am, lc + 0.05, yb + 0.03)], 0.035, hex, 'metal', 'bike');
        });
        else if (kd === 'box') addItem(am, () => box(a0, a1, lc - 0.28, lc + 0.28, y, y + 0.34, '#7a5a3c', '#6a4a2e', 'timber', 'box'));
        else if (kd === 'logs') addItem(am, () => {
          box(a0, a1, lc - 0.22, lc + 0.22, y, y + 0.22, '#5e432a', '#6e5236', 'timber', 'logs');
          if (finer) for (let k = 0; k < 5; k++) disc(P(sternNear ? a0 - 0.005 : a1 + 0.005, lc - 0.14 + (k % 3) * 0.14, y + 0.06 + Math.floor(k / 3) * 0.11), 0.055, '#c8a070', 'timber', 'log');
        });
      }
    }
    const clutter = () => { for (const it of items.slice().sort((p, q) => dEye(P(q.a, 0, CT)) - dEye(P(p.a, 0, CT)))) it.fn(); };   // far to near
    // ---- 7. the mooring ropes (moored boats only): from the stern and bow studs to pins on the bank ----
    let bank = 0, bankD = 0.75;   // the bank's side (+1 right, -1 left) and how far beyond the hull its land starts
    if (!moving && ent.static !== false && !ent.underway) {
      if (ent.bankSide === 1 || ent.bankSide === -1) bank = ent.bankSide;
      else {
        const regs = Array.isArray(o.regions) ? o.regions.filter(r => r && Array.isArray(r.polyM) && r.polyM.length >= 3) : [];
        if (regs.length) {
          // the nearest land beside the hull on each side (probes at 0.3-2.4 m out, at the middle and both quarters)
          const landAt = sg => { for (const d of [0.3, 0.6, 1.0, 1.5, 2.4]) { if ([-L / 4, 0, L / 4].some(a => { const p = P(a, sg * (hb + d), 0); return !regs.some(r => _wexInPolyM(r.polyM, p[0], p[2])); })) return d; } return Infinity; };
          const dr = landAt(1), dl = landAt(-1);
          bank = dr === Infinity && dl === Infinity ? 0 : dr <= dl ? 1 : -1;
          if (bank) bankD = Math.min(dr, dl);
        }   // no water outline and no bankSide: no ropes (a rope into open water is worse than none)
      }
    }
    const bankFacesEye = bank !== 0 && _wexSees(cam, [rx * bank, 0, rz * bank], P(0, bank * hb, Gm));
    const ropes = () => {
      if (!bank || !fine) return;
      const rope = (from, aTo) => {
        const at = P(aTo, bank * (hb + bankD + 0.6), 0), gy = _wexG(cam, at[0], at[2]);
        const end = [at[0], gy + 0.22, at[2]], pts = [];
        for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([from[0] + (end[0] - from[0]) * u, from[1] + (end[1] - from[1]) * u - 0.2 * 4 * u * (1 - u), from[2] + (end[2] - from[2]) * u]); }
        line(pts, 0.022, '#d6c7a0', 'fabric', 'rope');
        line([[end[0], gy, end[2]], [end[0], gy + 0.28, end[2]]], 0.035, '#3a3a3c', 'metal', 'pin');
      };
      rope(P(s0 + 0.35, bank * (hb - 0.12), G(s0 + 0.35) + 0.06), s0 - 1.1);
      rope(P(aCr + 0.5, 0, G(aCr + 0.5) + 0.14), bowA + 1.2);
    };
    // ---- the painter's order for this view ----
    h.part('aft'); aft();
    h.part('fore'); fore();
    h.part('cabin'); cabin();
    h.part('roof'); roof();
    h.part('clutter'); clutter();
    h.part('ropes'); ropes();
    const nearEnd = sternNear ? groups.aft : groups.fore, farEnd = sternNear ? groups.fore : groups.aft;
    const rudderFar = sternNear ? [] : groups.aft.filter(fc => fc.role === 'rudder');   // behind the counter: under the hull
    const top = roofSeen ? [...groups.cabin, ...groups.roof, ...groups.clutter] : [...groups.clutter, ...groups.cabin];
    const faces = [...(bankFacesEye ? [] : groups.ropes), ...rudderFar, ...groups.hull, ...groups.deck, ...farEnd.filter(fc => !rudderFar.includes(fc)), ...top, ...nearEnd, ...(bankFacesEye ? groups.ropes : [])]
      .filter(fc => fc && fc.pts && fc.pts.length >= 2);
    if (!faces.some(fc => !fc.line)) return null;
    // the end the eye sees (bow or stern), for callers that ask which end shows
    const sternSeen = _wexSees(cam, [-ax, 0, -az], P(s0, 0, yW + 0.3)), bowSeen = _wexSees(cam, [ax, 0, az], P(bowA, 0, yW + 0.3));
    const which = sternSeen && bowSeen ? (sternNear ? 'stern' : 'bow') : sternSeen ? 'stern' : bowSeen ? 'bow' : null;
    const end = which ? { which, quad: (faces.find(fc => fc.role === 'hull') || faces[0]).pts, z: _wexR(Math.min(...faces.map(fc => fc.z)), 3) } : null;
    return { faces, height: chTop - yW, extra: { end, livery: livN, stern, bank, roofH: _wexR(ridge - yW, 3), waterline: _wexR(h.base, 3) } };
  },
});
