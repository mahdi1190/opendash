/* Painted vale: the mouths of the ways underground (the depth lane, 26 Nov 2026; the tunnels are 94-garden-zz-8depth-3tunnel.js, their
 * rows assets/garden/vale-depth.json). Every tunnel found standing (gardenTunnels(): by its KIND, never a name) has each mouth drawn in
 * where its row puts it, by how it is built, in the house style (lit from the upper left, no outlines), sized in H (GARDEN_H):
 *   hatch   timber cellar flaps folded back open on the ground, iron rings, worn stone steps going down into the dark, a kerb of slabs;
 *           shut: the flaps down and padlocked
 *   arch    a low arched door of dressed stone set in the wall it stands against, steps going down inside it, an iron gate swung back,
 *           ferns in the joints and a drip stain; shut: the gate across and locked
 *   adit    an old mine's mouth cut into a rock face: a timber frame (two posts and a cap), rails running in, a tub, a spoil heap, a lantern
 *           on its hook (lit at dusk and night); shut: boarded
 *   steps   a stone-lined stair down through the turf, a kerb of flat stones, a marker stone with a mark cut in it; shut: fallen rock
 * Each lies on its own ground: worn earth, a few stones, growth round its foot (rule 13). The hole itself stops the feet (its painted
 * foot, like any painted thing: the collision view and the audit see it); the threshold where you stand stays open. Walk into a mouth, or
 * press E at its prompt, and you go in. Nothing here runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const Hpx = () => (typeof GARDEN_H === 'number' ? GARDEN_H : 41.44);
  const STONE = ['#8e8676', '#b0a690', '#d0c6ae', '#5e584a'], OAK = ['#4a3a2c', '#7a5e40', '#a08460', '#2a2018'], IRON = '#2f3336';
  /** The opening of a mouth in world px: its centre, its half length along the way in (a), its half width across (b), the way in (fx, fy). */
  function opening(L, m) {
    const W = L.W, f0 = 0.2, f1 = 0.95, cx = (m.x + m.fx * (f0 + f1) / 2) * W.cellW, cy = W.sky + (m.y + m.fy * (f0 + f1) / 2) * W.cellH;
    const a = m.fx ? (f1 - f0) / 2 * W.cellW : (f1 - f0) / 2 * W.cellH, b = m.fx ? 0.36 * W.cellH : 0.38 * W.cellW;
    return { cx, cy, a, b, fx: m.fx, fy: m.fy, x0: cx - (m.fx ? a : b), x1: cx + (m.fx ? a : b), y0: cy - (m.fy ? a : b), y1: cy + (m.fy ? a : b) };
  }
  /** Worn ground round a mouth: trodden earth, a scatter of small stones, grass and ferns at its edge (a ground op). */
  function wear(B, r, O, P, paved) {
    const rx = (O.x1 - O.x0) / 2 + 16, ry = (O.y1 - O.y0) / 2 + 12, cx = (O.x0 + O.x1) / 2, cy = (O.y0 + O.y1) / 2 + 3;
    B.cx.save(); B.cx.filter = 'blur(4px)'; B.f(B.ell(cx, cy, rx, ry), paved ? '#6e6250' : '#8a7550', paved ? 0.22 : 0.5); B.cx.filter = 'none'; B.cx.restore();
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 0.75 + r() * 0.45, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, s = 1 + r() * 2.2; B.f(B.ell(x + 0.6, y + 0.6, s, s * 0.6), '#3e3628', 0.45).f(B.ell(x, y, s, s * 0.6), r() < 0.5 ? STONE[1] : STONE[2], 0.9); }
    if (!paved) for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, x = cx + Math.cos(a) * (rx + 3), y = cy + Math.sin(a) * (ry + 2); B.s(`M${x} ${y}q${(r() - 0.5) * 3} -4 ${(r() - 0.5) * 5} -${5 + r() * 4}`, P.leaf ? P.leaf[1] : '#557e40', 1.2, 0.8).s(`M${x + 2} ${y}q${(r() - 0.5) * 3} -3 ${(r() - 0.5) * 4} -${4 + r() * 3}`, P.leaf ? P.leaf[2] : '#7aa255', 1, 0.8); }
  }
  /** Steps going down into the dark inside an opening, the way in (fx, fy): each tread a little darker and lower than the last. */
  function treads(B, O, n, col) {
    const L = O.a * 2, start = { x: O.cx - O.fx * O.a, y: O.cy - O.fy * O.a };
    B.f(B.poly([{ x: O.x0, y: O.y0 }, { x: O.x1, y: O.y0 }, { x: O.x1, y: O.y1 }, { x: O.x0, y: O.y1 }]), '#0d0b09');
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 0.78) / n, drop = k * 2.2, lit = 1 - k / n;
      const ax = start.x + O.fx * L * t0, ay = start.y + O.fy * L * t0 + drop, bx = start.x + O.fx * L * t1, by = start.y + O.fy * L * t1 + drop;
      const px = O.fx ? 0 : O.b - 2, py = O.fx ? O.b - 2 : 0;
      const quad = O.fx ? [{ x: ax, y: ay - py }, { x: bx, y: by - py }, { x: bx, y: by + py }, { x: ax, y: ay + py }] : [{ x: ax - px, y: ay }, { x: ax + px, y: ay }, { x: bx + px, y: by }, { x: bx - px, y: by }];
      B.f(B.poly(quad), col, 0.15 + 0.75 * lit * lit);
      B.f(B.poly(quad), '#ffffff', 0.08 * lit);
    }
    // the dark gathers at the far end
    const g = B.lin(O.cx - O.fx * O.a, O.cy - O.fy * O.a, O.cx + O.fx * O.a, O.cy + O.fy * O.a, [[0, 'rgba(10,8,6,0)'], [0.55, 'rgba(10,8,6,.35)'], [1, 'rgba(10,8,6,.92)']]);
    B.f(B.poly([{ x: O.x0, y: O.y0 }, { x: O.x1, y: O.y0 }, { x: O.x1, y: O.y1 }, { x: O.x0, y: O.y1 }]), g);
  }
  /** A kerb of flat stones round an opening, lit on its upper left. */
  function kerb(B, r, O, cols) {
    const ring = [], ex = 4, x0 = O.x0 - ex, x1 = O.x1 + ex, y0 = O.y0 - ex * 0.7, y1 = O.y1 + ex * 0.7;
    for (let x = x0; x < x1; x += 7 + r() * 3) { ring.push([x, y0, 1]); ring.push([x, y1, 1]); }
    for (let y = y0 + 4; y < y1 - 2; y += 5 + r() * 2) { ring.push([x0, y, 0]); ring.push([x1, y, 0]); }
    for (const [x, y, h] of ring) { const w = h ? 4.4 + r() * 2 : 3.4, hh = h ? 2.6 : 3.4 + r(); B.f(B.rr(x - w / 2 + 0.7, y - hh / 2 + 0.9, w, hh, 1), '#2e2a22', 0.55).f(B.rr(x - w / 2, y - hh / 2, w, hh, 1), cols[Math.floor(r() * 3)]).f(B.rr(x - w / 2 + 0.4, y - hh / 2 + 0.3, w * 0.6, 0.9, 0.4), '#ffffff', 0.22); }
  }
  /* ---------- the four ways in ---------- */
  function hatch(C, T, m, shut, seed) {
    const { L, add, thing, kit, P } = C, O = opening(L, m), r0 = kit.rng(seed), paved = !!(L.mat && L.mat(m.x, m.y) === 'path') || (typeof _plStoneAt === 'function' && _plStoneAt(m.x, m.y));
    add([O.x0 - 40, O.y0 - 34, O.x1 + 40, O.y1 + 34], seed, (B, r) => {
      wear(B, r, O, P, paved);
      // the flaps, folded back flat on the ground either side, iron rings, the hinges
      const along = !!O.fx, f1 = along ? [O.x0, O.y0 - O.b * 0.95, O.x1, O.y0] : [O.x0 - O.b * 0.95, O.y0, O.x0, O.y1], f2 = along ? [O.x0, O.y1, O.x1, O.y1 + O.b * 0.95] : [O.x1, O.y0, O.x1 + O.b * 0.95, O.y1];
      if (!shut) for (const f of [f1, f2]) {
        B.f(B.rect(f[0] + 1, f[1] + 1.4, f[2] - f[0], f[3] - f[1]), '#1e1812', 0.45).f(B.rect(f[0], f[1], f[2] - f[0], f[3] - f[1]), OAK[1]);
        const n = 3; for (let k = 1; k < n; k++) { if (along) { const yy = f[1] + (f[3] - f[1]) * k / n; B.s(`M${f[0]} ${yy}H${f[2]}`, OAK[3], 0.8, 0.6); } else { const xx = f[0] + (f[2] - f[0]) * k / n; B.s(`M${xx} ${f[1]}V${f[3]}`, OAK[3], 0.8, 0.6); } }
        B.f(B.rect(f[0], f[1], along ? (f[2] - f[0]) : 1.6, along ? 1.6 : (f[3] - f[1])), OAK[2], 0.6);
        const cx = (f[0] + f[2]) / 2, cy = (f[1] + f[3]) / 2; B.s(B.ell(cx, cy, 2.2, 1.6), IRON, 1.1, 0.95).s(B.ell(cx - 0.4, cy - 0.4, 1.6, 1.1), '#8a9094', 0.5, 0.6);
        for (const t of [0.22, 0.78]) { const hx = along ? f[0] + (f[2] - f[0]) * t : (f === f1 ? f[2] : f[0]), hy = along ? (f === f1 ? f[3] : f[1]) : f[1] + (f[3] - f[1]) * t; B.f(B.rect(hx - 1.6, hy - 1.6, 3.2, 3.2), IRON, 0.9); }
      }
      kerb(B, r, O, [STONE[0], STONE[1], STONE[2]]);
      if (shut) { B.f(B.rect(O.x0, O.y0, O.x1 - O.x0, O.y1 - O.y0), OAK[1]); if (along) B.s(`M${O.x0} ${O.cy}H${O.x1}`, OAK[3], 1, 0.8); else B.s(`M${O.cx} ${O.y0}V${O.y1}`, OAK[3], 1, 0.8); B.f(B.rect(O.cx - 2, O.cy - 2.5, 4, 5), '#8a6a3a').s(B.ell(O.cx, O.cy - 3, 1.6, 1.4), '#5a5e62', 0.9, 0.9); }
      else treads(B, O, 5, STONE[2]);
    });
    // the hole stops the feet (the threshold where you stand stays open)
    thing({ key: 'dp-hatch-foot|' + T.id + '|' + m.i, x: O.cx, y: O.y1, foot: [-(O.x1 - O.x0) / 2 + 1, (O.x1 - O.x0) / 2 - 1, O.y1 - O.y0 - 1], make: () => null });
    void r0;
  }
  function arch(C, T, m, shut, seed) {
    const { L, thing, kit, add, P } = C, H = Hpx(), W = L.W, x = m.x * W.cellW, base = W.sky + (m.y + m.fy * 0.32) * W.cellH, ow = H * 0.84, oh = H * 1.36, sunk = H * 0.3;
    const O = { x0: x - ow / 2, x1: x + ow / 2, y0: base - 6, y1: base + 4 };
    add([O.x0 - 40, O.y0 - 20, O.x1 + 40, O.y1 + 30], seed, (B, r) => wear(B, r, { x0: x - ow * 0.4, x1: x + ow * 0.4, y0: base, y1: base + 8 }, P, false));
    thing({ key: 'dp-arch|' + T.id + '|' + m.i + '|' + (shut ? 1 : 0) + '|' + C.season, x, y: base + 1, K: 1.6, box: [-ow / 2 - 30, -oh - 22, ow / 2 + 30, 8], shade: false, foot: [-ow / 2 - 6, ow / 2 + 6, 7], draw: B => {
      const r = kit.rng(seed + 3), top = -oh + sunk, rr = ow / 2;
      // the surround: dressed voussoirs round the head, quoins down the jambs, a little proud of the wall it is set in
      const outline = (g) => `M${-rr - g} ${sunk}V${top + rr}A${rr + g} ${rr + g} 0 0 1 ${rr + g} ${top + rr}V${sunk}Z`;
      B.f(outline(7), '#1c1914', 0.35);
      B.f(outline(6), STONE[0]);
      for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, a2 = Math.PI + (i + 0.86) / 8 * Math.PI; if (i === 8) break; const p = (ang, rad) => ({ x: Math.cos(ang) * rad, y: top + rr + Math.sin(ang) * rad }); B.f(B.poly([p(a, rr + 0.6), p(a, rr + 6.4), p(a2, rr + 6.4), p(a2, rr + 0.6)]), i % 2 ? STONE[1] : STONE[2]); B.f(B.poly([p(a, rr + 5), p(a, rr + 6.4), p(a2, rr + 6.4), p(a2, rr + 5)]), '#ffffff', 0.18); }
      for (let y = top + rr; y < sunk - 2; y += 9) for (const s of [-1, 1]) { const w = (y / 9) % 2 ? 6 : 4.6; B.f(B.rect(s < 0 ? -rr - w - 0.4 : rr + 0.4, y, w, 8.2), s < 0 ? STONE[2] : STONE[1]).f(B.rect(s < 0 ? -rr - w - 0.4 : rr + 0.4, y, w, 1.4), '#ffffff', 0.16); }
      // the dark inside, steps going down (the floor inside is below the ground outside)
      B.f(outline(0), '#0b0a08');
      for (let k = 0; k < 4; k++) { const y = sunk - 2 - k * 4.2, w = rr * (0.94 - k * 0.06), lit = 1 - k / 4; B.f(B.rect(-w, y - 1.4, w * 2, 2.6), STONE[2], 0.15 + 0.6 * lit * lit); }
      B.f(outline(0), B.lin(0, top, 0, sunk, [[0, 'rgba(8,7,6,.9)'], [0.7, 'rgba(8,7,6,.35)'], [1, 'rgba(8,7,6,0)']]));
      // the iron gate: swung back against the wall (or across, locked)
      if (shut) { for (let gx = -rr + 3; gx < rr - 1; gx += 5) B.s(`M${gx} ${sunk - 1}V${top + rr * 0.4 + Math.abs(gx) * 0.5}`, IRON, 1.6, 0.95); B.s(`M${-rr + 1} ${top + rr + 6}H${rr - 1}M${-rr + 1} ${sunk - 8}H${rr - 1}`, IRON, 2, 0.95); B.f(B.rect(-2.4, top + rr + 12, 4.8, 5.6), '#8a6a3a'); }
      else { const gx0 = rr + 7; B.f(B.poly([{ x: gx0, y: sunk - 1 }, { x: gx0 + 12, y: sunk - 4 }, { x: gx0 + 12, y: top + rr - 2 }, { x: gx0, y: top + rr + 2 }]), '#1c1d1e', 0.25); for (let k = 0; k <= 4; k++) { const t = k / 4, gx = gx0 + 12 * t; B.s(`M${gx} ${sunk - 1 - 3 * t}V${top + rr + 2 - 4 * t}`, IRON, 1.5, 0.92); } B.s(`M${gx0} ${top + rr + 6}L${gx0 + 12} ${top + rr + 2}M${gx0} ${sunk - 9}L${gx0 + 12} ${sunk - 12}`, IRON, 1.8, 0.92); }
      // a drip stain under the keystone, ferns and moss in the joints, a hart's-tongue at the foot
      B.s(`M1 ${top - 5}v${oh * 0.5}`, '#4a5440', 3, 0.25);
      for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, fx = s * (rr + 4 + r() * 4), fy = top + rr + r() * (oh - rr) * 0.8; B.s(`M${fx} ${fy}q${s * 5} -3 ${s * 9} ${-1 + r() * 3}`, '#557e40', 1.3, 0.85).s(`M${fx} ${fy}q${s * 4} -5 ${s * 7} -${4 + r() * 3}`, '#7aa255', 1, 0.8); }
      B.f(B.ell(-rr - 4, sunk, 7, 2.4), '#3f6534', 0.8).f(B.ell(rr + 5, sunk + 0.4, 6, 2.2), '#557e40', 0.8);
      // the step at the threshold, worn in the middle
      B.f(B.rr(-rr - 3, sunk - 1, ow + 6, 4, 1.4), STONE[1]).f(B.rr(-rr * 0.6, sunk - 0.6, rr * 1.2, 1.2, 0.6), '#ffffff', 0.18);
    } });
  }
  function adit(C, T, m, shut, seed) {
    const { L, thing, kit, add, P } = C, H = Hpx(), W = L.W, x = m.x * W.cellW, base = W.sky + (m.y + m.fy * 0.3) * W.cellH, ow = H * 0.92, oh = H * 1.42, rw = H * 1.7, rh = H * 2.15;
    add([x - rw - 40, base - 30, x + rw + 40, base + 40], seed, (B, r) => {
      wear(B, r, { x0: x - rw * 0.8, x1: x + rw * 0.8, y0: base - 4, y1: base + 14 }, P, false);
      // the rails running out of the mouth, sleepers under them
      for (let y = base + 2; y < base + 30; y += 5.5) B.f(B.rect(x - 10, y, 20, 2.6), OAK[0], 0.85);
      for (const s of [-1, 1]) B.s(`M${x + s * 6} ${base}V${base + 32}`, '#5a5e62', 1.7, 0.95).s(`M${x + s * 6 - 0.5} ${base}V${base + 32}`, '#b8bcbe', 0.6, 0.5);
    });
    // the rock face the adit is cut into, either side of the mouth (each stops the feet), and the timber frame
    for (const s of [-1, 1]) thing({ key: 'dp-adit-rock|' + T.id + '|' + m.i + '|' + s + '|' + C.season, x: x + s * (ow / 2 + rw * 0.42), y: base, K: 1.5, box: [-rw * 0.62, -rh - 6, rw * 0.62, 8], foot: [-rw * 0.5, rw * 0.5, 10], draw: B => {
      const r = kit.rng(seed + (s > 0 ? 11 : 17)), w = rw * 0.5, top = -rh * (0.86 + r() * 0.1);
      const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10, xx = -w + 2 * w * t, inner = s > 0 ? t < 0.12 : t > 0.88; pts.push({ x: xx, y: inner ? -oh - 6 + r() * 4 : top * (0.62 + 0.38 * Math.sin(Math.PI * t)) + (r() - 0.5) * 6 }); }
      const body = [{ x: -w - 4, y: 2 }].concat(pts).concat([{ x: w + 4, y: 2 }]);
      B.shadow(s * 4, 2, w * 1.1, 6, 0.32);
      B.f(B.poly(body), '#5e584e');
      // lit from the upper left: beds of rock, a lit west face, joints, moss and heather on the top
      for (let y = top * 0.9; y < -2; y += 6 + r() * 6) B.s(`M${-w} ${y}Q0 ${y + (r() - 0.5) * 6} ${w} ${y + 2}`, r() < 0.5 ? '#8a8274' : '#3e3a32', 1.2 + r(), 0.55);
      B.f(B.poly(body.map(p => ({ x: p.x * 0.7 - w * 0.25, y: p.y * 0.92 }))), '#7a7264', 0.6);
      for (let k = 0; k < 4; k++) B.s(`M${(r() - 0.5) * w * 1.6} ${top * (0.3 + r() * 0.5)}l${(r() - 0.5) * 4} ${6 + r() * 8}`, '#2a2620', 1, 0.6);
      for (let k = 0; k < 7; k++) { const p = pts[1 + Math.floor(r() * 9)]; B.f(B.ell(p.x, p.y + 2, 5 + r() * 5, 2.6), r() < 0.5 ? (P.leaf ? P.leaf[1] : '#557e40') : '#7a5a6a', 0.85); }
      B.f(B.ell(-s * w * 0.2, -1, w * 0.9, 3.4), '#3f5a34', 0.55);   // (grass and moss at its foot)
    } });
    thing({ key: 'dp-adit-arch|' + T.id + '|' + m.i + '|' + (shut ? 1 : 0) + '|' + C.season, x, y: base + 0.5, K: 1.6, box: [-ow / 2 - 26, -oh - 24, ow / 2 + 34, 10], shade: false, draw: B => {
      const r = kit.rng(seed + 5);
      // the rock over the mouth, the dark inside, rails going in, the frame
      B.f(B.poly([{ x: -ow / 2 - 8, y: -oh + 2 }, { x: -ow * 0.2, y: -oh - 16 }, { x: ow * 0.3, y: -oh - 14 }, { x: ow / 2 + 9, y: -oh + 2 }, { x: ow / 2 + 6, y: -oh + 6 }, { x: -ow / 2 - 5, y: -oh + 6 }]), '#5e584e');
      B.s(`M${-ow / 2 - 6} ${-oh - 6}Q0 ${-oh - 15} ${ow / 2 + 6} ${-oh - 5}`, '#8a8274', 1.4, 0.55);
      B.f(B.rect(-ow / 2, -oh, ow, oh), '#090807');
      B.f(B.rect(-ow / 2, -oh, ow, oh), B.lin(0, -oh, 0, 0, [[0, 'rgba(30,26,20,0)'], [0.7, 'rgba(60,50,38,.25)'], [1, 'rgba(90,76,58,.55)']]));
      for (const s of [-1, 1]) B.s(`M${s * 5} -1L${s * 2.6} ${-oh * 0.45}`, '#5a5e62', 1.3, 0.55);
      for (let y = -2; y > -oh * 0.4; y -= 4) { const k = -y / (oh * 0.4); B.f(B.rect(-7 + k * 3, y, 14 - k * 6, 1.6), OAK[0], 0.7 * (1 - k)); }
      if (shut) { for (let k = 0; k < 5; k++) { const y = -oh + 6 + k * (oh - 10) / 4.4; B.f(B.rect(-ow / 2 - 2, y + 1, ow + 4, 6.4), '#1e1812', 0.4).f(B.rect(-ow / 2 - 2, y, ow + 4, 6), k % 2 ? OAK[1] : OAK[2]).f(B.ell(-ow / 2 + 2, y + 3, 0.8, 0.8), IRON).f(B.ell(ow / 2 - 2, y + 3, 0.8, 0.8), IRON); } }
      // two posts and a cap, set in the rock
      for (const s of [-1, 1]) { const px = s * (ow / 2 + 2.5); B.f(B.rect(px - 3.6, -oh - 2, 7.2, oh + 2), OAK[0]).f(B.rect(px - 3.6, -oh - 2, 2.4, oh + 2), OAK[1], 0.9).s(`M${px + 1} ${-oh + 6}v${oh * 0.5}`, OAK[3], 0.8, 0.55); }
      B.f(B.rect(-ow / 2 - 9, -oh - 9, ow + 18, 8), OAK[0]).f(B.rect(-ow / 2 - 9, -oh - 9, ow + 18, 2.4), OAK[2], 0.75).f(B.rect(-ow / 2 - 9, -oh - 2, ow + 18, 1.2), '#120e0a', 0.6);
      // the lantern on its hook under the cap, the tub on the rails, a pick against the post
      B.s(`M${ow / 2 - 4} ${-oh - 1}v5`, IRON, 1.1, 0.95); B.f(B.rect(ow / 2 - 7.4, -oh + 4, 7, 9), IRON).f(B.rect(ow / 2 - 6.2, -oh + 5.4, 4.6, 6), '#d8c080', 0.85).f(B.ell(ow / 2 - 3.9, -oh + 4, 3.8, 1.2), IRON);
      B.f(B.ell(ow / 2 + 22, 4, 13, 3), '#1a1610', 0.35).f(B.rect(ow / 2 + 11, -10, 22, 12), '#3a3d40').f(B.rect(ow / 2 + 11, -10, 22, 2.2), '#7a7e82').f(B.ell(ow / 2 + 22, -10, 10, 3.4), '#6a6256');
      for (const wx of [ow / 2 + 15, ow / 2 + 29]) B.f(B.ell(wx, 2, 3.2, 3.2), '#1c1c1c').f(B.ell(wx - 0.6, 1.4, 1.2, 1.2), '#6a6e72');
      B.s(`M${-ow / 2 - 9} 2L${-ow / 2 - 4} ${-oh * 0.62}`, OAK[1], 2, 0.95).s(`M${-ow / 2 - 9} ${-oh * 0.6}Q${-ow / 2 - 3} ${-oh * 0.66} ${-ow / 2 + 2} ${-oh * 0.58}`, '#5a5e62', 2.2, 0.95);
      void r;
    } });
    // the lantern lit at dusk and night: a flame that flickers and a warm pool on the rock and the ground (light, added, above the night)
    if (C.live && !shut) C.live({ make: (scene) => {
      const GL = 'gpv-dp-glow'; if (!scene.textures.exists(GL)) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,214,140,.95)'); rg.addColorStop(0.3, 'rgba(255,186,100,.45)'); rg.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); scene.textures.addImage(GL, c); }
      const lx = x + ow / 2 - 3.9, ly = base - oh + 8, root = scene.add.container(0, 0).setDepth(80006).setVisible(false);
      const halo = scene.add.image(lx, ly, GL).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7), pool = scene.add.image(lx, base + 6, GL).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2, 0.8);
      root.add([pool, halo]); let night = 0, checked = -1e9;
      return { obj: root, update(time, view) {
        if (time - checked > 1000) { checked = time; try { const lt = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), d = lt && lt.environment ? lt.environment().daylight : 1; night = Math.max(0, Math.min(1, (0.55 - (d == null ? 1 : d)) / 0.35)); } catch (e) { night = 0; } }
        const near = view && lx > view.x - 200 && lx < view.x + view.w + 200 && ly > view.y - 200 && ly < view.y + view.h + 200;
        if (!(night > 0.02 && near)) { if (root.visible) root.setVisible(false); return; }
        if (!root.visible) root.setVisible(true);
        const f = 1 + 0.06 * Math.sin(time / 90) + 0.04 * Math.sin(time / 37);
        halo.setAlpha(0.75 * night * f); pool.setAlpha(0.28 * night * f);
      } };
    } });
  }
  function steps(C, T, m, shut, seed) {
    const { L, add, thing, kit, P } = C, O = opening(L, m), snowy = C.season === 'winter';
    add([O.x0 - 40, O.y0 - 30, O.x1 + 40, O.y1 + 30], seed, (B, r) => {
      wear(B, r, O, P, false);
      kerb(B, r, O, ['#7e7868', '#a29a86', '#c2b8a0']);
      if (shut) {   // fallen rock fills it, daylight would show only from below
        B.f(B.rect(O.x0, O.y0, O.x1 - O.x0, O.y1 - O.y0), '#14110e');
        for (let i = 0; i < 11; i++) { const bx = O.x0 + 3 + r() * (O.x1 - O.x0 - 6), by = O.y0 + 2 + r() * (O.y1 - O.y0 - 3), rx = 3 + r() * 4.5, ry = rx * 0.66; B.f(B.ell(bx + 1, by + 1, rx, ry), '#2e2a24', 0.6).f(B.ell(bx, by, rx, ry), r() < 0.5 ? '#7a7062' : '#948a7a').f(B.ell(bx - rx * 0.3, by - ry * 0.3, rx * 0.45, ry * 0.32), '#c2b8a4', 0.6); }
      } else treads(B, O, 6, '#c2b8a0');
      if (snowy) B.f(B.ell((O.x0 + O.x1) / 2, O.y0 - 2, (O.x1 - O.x0) / 2 + 5, 2.4), '#f2f4f6', 0.85);
    });
    thing({ key: 'dp-steps-foot|' + T.id + '|' + m.i, x: (O.x0 + O.x1) / 2, y: O.y1, foot: [-(O.x1 - O.x0) / 2 + 1, (O.x1 - O.x0) / 2 - 1, O.y1 - O.y0 - 1], make: () => null });
    // the marker stone beside it, a mark cut in its face (two strokes and a ring: "way under")
    const side = m.fx ? 0 : 1, sx = side ? O.x1 + 9 : (O.x0 + O.x1) / 2 + 8, sy = side ? O.y1 - 1 : O.y1 + 7;
    thing({ key: 'dp-marker-stone|' + T.id + '|' + m.i + '|' + C.season, x: sx, y: sy, K: 1.6, box: [-10, -28, 10, 5], foot: [-5, 5, 5], draw: B => {
      const r = kit.rng(seed + 9), h = Hpx() * 0.56;
      B.shadow(2.6, 1.2, 8, 2.2, 0.32);
      B.f(B.poly([{ x: -5.4, y: 0.6 }, { x: -6, y: -h * 0.7 }, { x: -3, y: -h }, { x: 3, y: -h + 1.6 }, { x: 5.6, y: -h * 0.68 }, { x: 5, y: 0.6 }]), '#7a7264');
      B.f(B.poly([{ x: -5.4, y: 0.6 }, { x: -6, y: -h * 0.7 }, { x: -3, y: -h }, { x: -0.6, y: -h + 0.6 }, { x: -1.6, y: 0.6 }]), '#a29a88');
      B.s(`M-1.4 ${-h * 0.72}v${h * 0.34}M1.6 ${-h * 0.72}v${h * 0.34}`, '#3a352e', 0.9, 0.85).s(B.ell(0.1, -h * 0.28, 2.2, 1.7), '#3a352e', 0.8, 0.8);
      B.f(B.ell(-2, -h + 1.4, 3, 1.1), snowy ? '#f2f4f6' : '#8a9a5a', 0.75).f(B.ell(0, 0.6, 7, 1.6), P.leaf ? P.leaf[1] : '#557e40', 0.7);
      void r;
    } });
  }
  function compose(C) {
    if (typeof gardenTunnels !== 'function') return;
    let list = []; try { list = gardenTunnels() || []; } catch (e) { list = []; }
    C.P = C.P || V.PAL[C.season] || V.PAL.summer;
    for (const T of list) {
      let open = null; try { open = typeof _gdtOpen === 'function' ? _gdtOpen(T) : null; } catch (e) { open = null; }
      for (const m of T.mouths) {
        const shut = !!(open && !open[m.i]), seed = (C.kit.hashStr(T.id) + m.i * 101) % 100000 + 7;
        try { ({ hatch, arch, adit, steps })[m.by](C, T, m, shut, seed); } catch (e) { console.error('[garden depth] mouth', T.id, m.i, e); }
      }
    }
  }
  V.parts.push({ id: 'depth-mouths', compose });
  // the composition follows which mouths are open (a region opening clears its rockfall, unlocks its gate)
  V.groundSigs.push(() => { try { if (typeof gardenTunnels !== 'function') return ''; let s = 'dpm:'; for (const T of gardenTunnels()) s += T.id + (typeof _gdtOpen === 'function' ? _gdtOpen(T).map(o => (o ? 1 : 0)).join('') : '') + ','; return s; } catch (e) { return ''; } });
})();
