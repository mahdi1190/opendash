/* Painted vale: the High orchard dressed (C:/tmp/regions/orchard.md): the
 * terraces' grass in mown strips under rows of apple, pear, plum and cherry
 * (GardenPaintWood.orchardTree), the ring of eight old perry pears, the Mother
 * tree propped on her crutch, windfalls in autumn, thyme and heather on the top
 * terrace and cowslips on the rise. Trees keep off paths, plots the player can
 * buy, statics and the terrace walls. See 94-garden-paint-vale-0kit.js. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const ROWS = ['apple', 'pear', 'plum', 'cherry', 'apple', 'plum', 'pear', 'apple'];

  function compose(C) {
    const { L, P, kit, add, thing, season } = C, cw = L.cw, ch = L.ch, W = L.W;
    const reg = (L.D.regions || []).find(r => r.id === 'orchard-headland'); if (!reg || !window.GardenPaintWood || !GardenPaintWood.orchardTree) return;
    const loops = (reg.polygons || []).map(l => l.map(L.pt)), regP = V.loopPath(loops), coastP = V.loopPath(L.coast), rb = kit.bboxOf(loops.flat(), 20);
    const wallRows = (L.D.landforms || []).filter(f => f.kind === 'terrace-wall' && f.polygon), walls = wallRows.map(f => f.polygon);
    const nearWall = (x, y, d) => walls.some(poly => poly.some(p => Math.abs(p[0] - x) < d && Math.abs(p[1] - y) < d * .8));
    // This lawn sits above the fells layer. Its cell-sized lobes must not
    // overpaint the shared water contours or the terrace masonry below it.
    const groundCuts = (L.D.freshwater || []).filter(f => f.boundary).map(f => f.boundary.map(L.pt));
    for (const f of wallRows) {
      const poly = f.polygon, n = poly.length >> 1, a = poly.slice(0, n), b = poly.slice(n).reverse();
      const north = a.reduce((s, p) => s + p[1], 0) <= b.reduce((s, p) => s + p[1], 0);
      const upper = (north ? a : b).map(L.pt), lower = (north ? b : a).map(L.pt), lift = f.thin ? 26 : 0;   // (a thin wall's face stands 26 px above its line: 94-garden-paint-terrain-1fells.js THIN_LIFT)
      // terraceOps draws upright coping up to six pixels above the upper rim.
      groundCuts.push(upper.map((p, i, A) => ({ x: p.x, y: p.y - 7 - lift * Math.min(1, i / 3, (A.length - 1 - i) / 3) })).concat(lower.slice().reverse()));
    }
    const groundClips = groundCuts.map(poly => {
      const cut = new Path2D(); cut.rect(rb[0], rb[1], rb[2] - rb[0], rb[3] - rb[1]);
      cut.addPath(V.loopPath([poly])); return cut;
    });
    const inReg = (x, y) => { const b = L.base(x, y); return !!(b && b.region === 'orchard-headland'); };
    const grass = (x, y) => inReg(x, y) && L.kind(x + .5, y + .5) === 'grass';

    // 1. The terraces' grass: mown strips that follow the terraces, long grass at the edges, flowers by place
    add(rb, 91, (B, r, cb) => {
      B.cx.clip(regP); B.cx.clip(coastP);
      for (const cut of groundClips) B.cx.clip(cut, 'evenodd');
      V.clipGround(B, L, cb, true);
      V.lawn(B, r, L, P, cb, (x, y) => grass(x, y), null, { salt: 91, base: kit.mix(P.lawn, '#b8c47a', season === 'winter' ? 0 : .12) });
      // Quiet continuous mowing bands stop at the same paths and shore as the
      // meadow. Cell-shaped scallops made the terrace read as loose patches.
      for (let y = Math.floor((cb[1] - W.sky) / (ch * 4)) * ch * 4 + W.sky; y < cb[3]; y += ch * 4) {
        const col = season === 'winter' ? '#c4cab8' : '#c2cc84', g = B.lin(0, y, 0, y + ch * 2, [[0, kit.rgba(col, 0)], [.2, kit.rgba(col, .07)], [.8, kit.rgba(col, .07)], [1, kit.rgba(col, 0)]]);
        B.f(B.rect(cb[0], y, cb[2] - cb[0], ch * 2), g);
      }
      kit.tiles(cb, 100, 20, 92, (tx, ty, rr) => { for (let k = 0; k < 8; k++) { const x = tx + rr() * 100, y = ty + rr() * 100, cx = x / cw, cy = (y - W.sky) / ch; if (!grass(Math.floor(cx), Math.floor(cy))) continue;
        if (cy < 25 && cx > 69 && cx < 79) { B.heather(rr, x, y, 7 + rr() * 5, { heather: '#8d6a92', heatherLo: '#5f4a62', heatherHi: '#b07ab8' }, season === 'summer' ? '#c79ac0' : null); continue; }
        if (cx > 81.5 && cy > 33.5 && cy < 39.5) { if (season === 'spring' || season === 'summer') for (let f = 0; f < 5; f++) B.f(B.circ(x + (rr() - .5) * 14, y + (rr() - .5) * 6, 1.6), f % 3 ? '#f0d24a' : '#f8f4e8', .95); B.tufts(rr, x, y, 10, 4, [P.lawnLo, '#9a9a52'], 7); continue; }
        if (rr() < .3) B.tufts(rr, x, y, 10, 4, [P.lawnLo, P.lawnHi], 6); } });
    }, {});

    // 1b. The orchard pond's margin: a worn earth bank with sedge and a few stones, so the grass meets the water at a
    // shore (as the Mere's does) and not at a bare glassy lip. Drawn under the water's own shallows.
    // (fix round 1: the dip too, its warm pool under the bank)
    for (const pool of (L.D.freshwater || []).filter(w => (w.id === 'orchard-pool' || w.id === 'orchard-dip') && w.boundary && w.boundary.length > 2)) {
      const pts = pool.boundary.map(L.pt), loop = V.loopPath([pts]), bb = kit.bboxOf(pts, 40);
      add(bb, 97, (B, r) => {
        B.s(loop, season === 'winter' ? '#8e8a74' : '#8a7a52', 26, .5).s(loop, '#6e6040', 12, .55).s(loop, '#5a5238', 4, .45);
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let t = 0; t < 1; t += .34) { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, d = Math.hypot(x - cx, (y - cy) * 1.6) || 1, ox = (x - cx) / d, oy = (y - cy) * 1.6 / d;
          if (r() < .32) B.stone(r, x + ox * 9, y + oy * 5, 3 + r() * 3, 2 + r() * 1.4, { rock: '#b4aa94', rockLo: '#8c8270', rockHi: '#d8cfb8', rockDk: '#4e483e' }, null);
          if (season !== 'winter' && r() < .7) B.tufts(r, x + ox * (14 + r() * 8), y + oy * (8 + r() * 5), 12, 6, ['#9a9a52', '#7c8a44', season === 'autumn' ? '#b8a05a' : '#a8b468'], 9); } }
      });
    }

    // (High orchard fix round 1) what the plan names and nothing drew: the grass lanes, the flights of steps, the cliff top
    // and its face, the dip's steam. Each is painted into the ground, from the layout's own routes and shapes.
    const rpts = id => { const rt = L.routes.get(id); if (!rt || !rt.points || rt.points.length < 2) return null; return gardenIslandRoutePath(rt).points.map(q => ({ x: q.x * cw, y: W.sky + q.y * ch, w: typeof gardenIslandRouteWidthAt === 'function' ? gardenIslandRouteWidthAt(rt, q.x, q.y) : (rt.widthCells || 2) })); };
    const even = (pts, step) => { const out = [pts[0]]; let carry = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y); let d = step - carry; while (d <= l) { const t = d / l; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t }); d += step; } carry = l - (d - step); } return out; };
    const across = (pts, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l }; };
    // the half width of a path in px across its line (cells are wider than deep)
    const halfPx = (q, d) => q.w * .5 * Math.hypot(d.ny * cw, d.nx * ch);
    const STONE = { rock: '#b4aa94', rockLo: '#8c8270', rockHi: '#d8cfb8', rockDk: '#4e483e', lichen: '#d8c86a' };

    // 1c. The grass lanes (the folly trail on the midsummer line, the ridge path): mown turf, the mower's passes along
    // them light and dark, a soft longer edge, never the bare earth of the other walks.
    for (const rt of [...L.routes.values()].filter(q => q.zone === 4 && q.surface === 'grass')) {
      const pts = rpts(rt.id); if (!pts) continue; const ev0 = even(pts, 6), bb = kit.bboxOf(ev0, 70);
      // where it meets a worn path, the path wins (a lane painted over the pass's end hid it)
      const others = [...L.routes.values()].filter(q => q.zone === 4 && q.surface !== 'grass' && q.tier !== 'plaza' && q.points || q.id === 'pass-summit').map(q => rpts(q.id)).filter(Boolean);
      const onOther = q => others.some(o => o.some(p => Math.hypot((p.x - q.x) / cw, (p.y - q.y) / ch) < p.w * .5 + .35));
      const ev = ev0.filter(q => !onOther(q)); if (ev.length < 2) continue;
      add(bb, 93, (B, r) => {
        B.cx.save(); B.cx.clip(coastP); B.cx.lineCap = 'round'; B.cx.lineJoin = 'round';
        const lane = (k, col, a) => { for (let i = 1; i < ev.length; i++) { if (Math.hypot(ev[i].x - ev[i - 1].x, ev[i].y - ev[i - 1].y) > 14) continue; const d = across(ev, i), h = halfPx(ev[i], d) * k; B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, col, h * 2, a); } };
        B.cx.filter = 'blur(5px)'; lane(1.18, kit.mix(P.lawn, P.lawnLo, .4), .9); B.cx.filter = 'none';
        lane(1, P.lawn, 1); lane(.92, kit.mix(P.lawn, P.lawnHi, .35), 1);
        // the mower's passes: two stripes along the lane, one lit and one in shade
        const runs = []; let cur = [ev[0]]; for (let i = 1; i < ev.length; i++) { if (Math.hypot(ev[i].x - ev[i - 1].x, ev[i].y - ev[i - 1].y) > 14) { runs.push(cur); cur = []; } cur.push(ev[i]); } runs.push(cur);
        for (const run of runs.filter(q => q.length > 1)) for (const [o, col, a] of [[-.45, season === 'winter' ? '#c4cab8' : kit.mix(P.lawnHi, '#d8e0a0', .3), .55], [.45, P.lawnLo, .32]]) { const line = run.map((q, i) => { const d = across(run, i), h = halfPx(q, d); return { x: q.x + d.nx * h * o, y: q.y + d.ny * h * o }; }); V.strokePts(B, line, col, Math.max(6, halfPx(run[0], across(run, 0)) * .8), a); }
        // daisies and clover in the sward, tufts of longer grass at the edges
        for (let i = 0; i < ev.length; i += 2) { const q = ev[i], d = across(ev, i), h = halfPx(q, d);
          if (season !== 'winter' && r() < .5) B.f(B.circ(q.x + d.nx * h * (r() - .5) * 1.4, q.y + d.ny * h * (r() - .5) * 1.4, 1.2), r() < .7 ? '#f8f4e8' : '#f0d24a', .9);
          for (const sd of [-1, 1]) if (r() < .45) B.tufts(r, q.x + d.nx * h * sd * 1.05, q.y + d.ny * h * sd * 1.05 + 2, 8, 3, [P.lawnLo, '#9a9a52'], 6); }
        B.cx.restore();
      }, {});
    }

    // 1d. Flights of steps: stone treads across the way, each lit on its top and shaded on its riser, worn hollow in the
    // middle, with grass and a stone cheek at either end. The lakeside steps climb the bank to the pass; the cliff steps
    // climb the rock from the cove to the pippin.
    const flight = (pts, opts) => {
      const ev = even(pts, opts.step || 10), bb = kit.bboxOf(ev, 60);
      add(bb, 94 + (opts.salt || 0), (B, r) => {
        B.cx.save(); B.cx.clip(coastP);
        const tread = opts.rock ? ['#a89c86', '#b5a990', '#8c8270'] : ['#b8ad94', '#c4b99e', '#a39880'];
        // the bed the steps are set in: trodden earth between them, soft at its edges
        B.cx.lineCap = 'butt'; B.cx.filter = 'blur(3px)'; if (opts.rock) for (let i = 1; i < ev.length; i++) { const d = across(ev, i), h = halfPx(ev[i], d) * .98; B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, opts.rock ? '#8a8070' : '#a08e6a', h * 2, .75); } B.cx.filter = 'none';
        if (opts.rock) for (let i = 0; i < ev.length; i += 2) { const q = ev[i], d = across(ev, i), h = halfPx(q, d); for (const sd of [-1, 1]) B.boulder(r, q.x + d.nx * (h + 7) * sd, q.y + d.ny * (h + 7) * sd + 4, 14 + r() * 10, 12 + r() * 9, STONE, false); }
        // back to front, so each nearer step overlaps the one above it
        const order = ev.map((q, i) => i).sort((a, b) => ev[a].y - ev[b].y);
        for (const i of order) { const q = ev[i], d = across(ev, i), h = halfPx(q, d) * .84, dep = (opts.step || 10) * .5, up = d.ty < 0 ? 1 : -1;
          const ax = q.x - d.nx * h, ay = q.y - d.ny * h, bx = q.x + d.nx * h, by = q.y + d.ny * h, ux = d.tx * dep * up, uy = d.ty * dep * up;
          const tone = tread[Math.floor(r() * 2)];
          B.f(B.poly([[ax, ay + 3], [bx, by + 3], [bx, by], [ax, ay]]), opts.rock ? '#6e665a' : '#8a8068', .85);   // the riser in shade
          B.f(B.poly([[ax, ay], [bx, by], [bx + ux, by + uy], [ax + ux, ay + uy]]), tone);   // the tread
          B.f(B.poly([[ax, ay], [bx, by], [bx + ux * .25, by + uy * .25], [ax + ux * .25, ay + uy * .25]]), tread[1], .7);   // its lit nosing
          B.f(B.ell(q.x + ux * .5, q.y + uy * .5, h * .34, dep * .22), '#e8e0cc', .35);   // worn pale in the middle
          for (let c = 0; c < 2; c++) { const t0 = r(); B.s(`M${ax + (bx - ax) * t0} ${ay + (by - ay) * t0}l${ux * .5} ${uy * .5}`, '#8a826e', .6, .5); }
          for (const [x, y] of [[ax, ay], [bx, by]]) { B.stone(r, x, y + 1, 4 + r() * 2.4, 3 + r() * 1.4, STONE, null); if (season !== 'winter') B.tufts(r, x, y + 3, 6, 3, [P.lawnLo, '#9cb062'], 5); }
        }
        B.cx.restore();
      }, {});
    };
    // (the lakeside steps are a path with one short flight, where they climb through the gap in the orchard bank)
    { const ls = rpts('lakeside-steps'), g = L.cpt(61, 38.4); if (ls) { const seg = ls.filter(q => Math.hypot((q.x - g.x) / cw, (q.y - g.y) / ch) < 1.5); if (seg.length > 2) flight(seg, { step: 13, salt: 1 }); } }
    // where a path climbs through a thin terrace wall: the wall's two ends squared off and a short flight up through the gap
    { const thin = wallRows.filter(f => f.thin).map(f => { const n = f.polygon.length >> 1, a = f.polygon.slice(0, n); return { id: f.id, a: a[0], b: a[a.length - 1] }; });
      for (const w of thin) for (const o of thin) { if (o === w || o.a[0] <= w.b[0] || o.a[0] - w.b[0] > 4.5 || Math.abs(o.a[1] - w.b[1]) > 1.2) continue;
        const near = [...L.routes.values()].filter(rt => rt.zone === 4 && rt.tier !== 'plaza' && rt.points).map(rt => ({ rt, pts: rpts(rt.id) })).filter(q => q.pts).map(q => ({ q, i: q.pts.reduce((m, p, k) => { const c = { x: p.x / cw, y: (p.y - W.sky) / ch }; const dd = Math.hypot(c.x - (w.b[0] + o.a[0]) / 2, c.y - (w.b[1] + o.a[1]) / 2); return dd < m.d ? { d: dd, k } : m; }, { d: 9, k: -1 }) })).filter(z => z.i.k >= 0 && z.i.d < 1.2).sort((a, b) => a.i.d - b.i.d)[0];
        if (!near) continue; const pts = near.q.pts, k = near.i.k, seg = pts.slice(Math.max(0, k - 5), Math.min(pts.length, k + 6)); if (seg.length > 2) flight(seg, { step: 9, salt: 3 }); } }

    // 1e. The cliff top, east of the cowslip rise: bare rock and thrift where the sand gave out, a lit lip at the sea edge
    // with the face falling away under it, blackthorn bent by the wind, a trod worn along the cliff walk; and across the
    // cove's head the low rock face the cliff steps climb (the sand ran on up to the pippin).
    const CLIFF = [[87.2, 28.4], [91, 28.4], [91, 41.2], [88.8, 41.2], [87.2, 40.6], [85.6, 40.5], [85.4, 38.6], [86.6, 37.6], [87, 33]].map(p => L.cpt(p[0], p[1]));
    const FACE_Y = 40.55, faceFrom = 85.5;
    { const cl = V.loopPath([CLIFF]), bb = kit.bboxOf(CLIFF, 80), on = (x, y) => { const k = L.kind(x / cw, (y - W.sky) / ch); return k === 'beach' || k === 'grass' || k === 'path'; };
      add(bb, 95, (B, r, cb) => {
        B.cx.save(); B.cx.clip(coastP);
        // the rock floor, its edge on the grass soft and broken (a ruled line read as a cut-out): broad slabs, cracked,
        // lichened, with thrift and turf in the joints, thinning out over the edge
        B.cx.filter = 'blur(7px)'; B.f(cl, '#9a917c', .96); B.cx.filter = 'none';
        const inCl = (x, y) => { let o = false; for (let i = 0, j = CLIFF.length - 1; i < CLIFF.length; j = i++) { const a = CLIFF[i], b = CLIFF[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) o = !o; } return o; };
        kit.tiles(cb, 40, 30, 96, (tx, ty, rr) => { for (let k = 0; k < 3; k++) { const x = tx + rr() * 40, y = ty + rr() * 40; if (!on(x, y) || !inCl(x + (rr() - .5) * 30, y + (rr() - .5) * 20)) continue; const t = rr(); B.f(B.blob(rr, x, y, 10 + rr() * 12, 5 + rr() * 5, 7, .35), t < .33 ? STONE.rock : t < .66 ? '#a59b85' : STONE.rockLo, .9).f(B.blob(rr, x - 3, y - 2, 6 + rr() * 5, 2.4 + rr() * 2, 6, .4), STONE.rockHi, .55);
          if (rr() < .35) B.s(`M${x - 8} ${y + 1}l${6 + rr() * 6} ${(rr() - .5) * 3}`, STONE.rockDk, .7, .45);
          if (rr() < .4) B.f(B.blob(rr, x + 6, y - 1, 3 + rr() * 2, 1.4, 6, .5), season === 'winter' ? '#dfe2da' : STONE.lichen, .6);
          if (season !== 'winter' && rr() < .32) { const cx0 = x + (rr() - .5) * 14, cy0 = y + 4; B.f(B.blob(rr, cx0, cy0, 5, 2.6, 7, .4), '#6a7e44', .95); if (season !== 'autumn') for (let j = 0; j < 5; j++) B.f(B.circ(cx0 + (rr() - .5) * 7, cy0 - 1.4 - rr() * 2, 1.3), '#e8a0b8', .95); }
          else if (rr() < .3) B.tufts(rr, x, y + 3, 10, 4, ['#7c8a44', '#9a9a52'], 5); } });
        // the trod along the cliff walk: turf and grit worn pale where feet go
        const cw0 = rpts('cliff-walk'); if (cw0) { const ev = even(cw0, 6); B.cx.lineCap = 'round'; for (let i = 1; i < ev.length; i++) { const d = across(ev, i), h = halfPx(ev[i], d); B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, '#b9ad92', h * 1.3, .55); B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, '#cfc4a8', h * .7, .5); } }
        B.cx.restore();
        // the sea edge: a lit lip, the face stepping down under it in beds, darker as it goes, spray at its foot
        for (const l of L.coast) { const near = l.filter(p => p.x > cb[0] - 60 && p.x < cb[2] + 60 && p.y > bb[1] && p.y < bb[3] && p.x > 86.6 * cw); if (near.length < 2) continue;
          for (const [dx, dy, col, w, a] of [[16, 30, '#3e3a34', 14, .55], [12, 22, '#5a5348', 12, .9], [8, 14, '#746b5c', 10, 1], [4, 7, '#8c8270', 8, 1], [1, 2, STONE.rockHi, 3, .9]]) V.strokePts(B, near.map(p => ({ x: p.x + dx, y: p.y + dy })), col, w, a);
          for (let i = 0; i < near.length; i += 2) { const p = near[i]; B.s(`M${p.x + 3} ${p.y + 6}l${(r() - .5) * 3} ${10 + r() * 14}`, '#3e3a34', 1, .45); if (r() < .4) B.f(B.blob(r, p.x + 18, p.y + 32, 8, 3, 6, .5), '#f2f6f4', .55); } }
        // blackthorn bent by the wind on the cliff top, its back to the sea
        for (const [x, y] of [[89.2, 30.6], [89.6, 33.8], [88.9, 36.2]]) { const c = L.cpt(x, y); if (!on(c.x, c.y)) continue; B.shadow(c.x + 6, c.y + 2, 20, 5, .3);
          for (let k = 0; k < 7; k++) B.f(B.blob(r, c.x - 6 + k * 2 - r() * 4, c.y - 8 - r() * 10, 9 + r() * 5, 6 + r() * 3, 7, .45), k < 3 ? '#3f4e2e' : k < 5 ? '#55663a' : '#6a7a46', .95);
          if (season === 'spring') for (let k = 0; k < 14; k++) B.f(B.circ(c.x - 14 + r() * 26, c.y - 20 + r() * 14, 1.3), '#fbf7ee', .95);
          else if (season === 'autumn') for (let k = 0; k < 8; k++) B.f(B.circ(c.x - 12 + r() * 22, c.y - 16 + r() * 10, 1.6), '#3e4a7a', .95); }
        // the cliff top's edge above the beach walk: a low blackthorn hedge, knee high (it stops the feet: 94-garden-wonder-7shortcuts.js)
        for (let y = 36.6; y < 40.4; y += .3) { const c = L.cpt(85.25 + Math.sin(y * 3.1) * .06, y); B.f(B.ell(c.x + 4, c.y + 2, 13, 4), '#22301a', .2);
          for (let k = 0; k < 4; k++) B.f(B.blob(r, c.x - 4 + r() * 8, c.y - 6 - r() * 12, 7 + r() * 4, 5 + r() * 3, 7, .45), k < 2 ? '#3f4e2e' : k < 3 ? '#55663a' : '#6a7a46', .97);
          if (season === 'spring') for (let k = 0; k < 4; k++) B.f(B.circ(c.x - 7 + r() * 14, c.y - 18 + r() * 10, 1.3), '#fbf7ee', .95);
          else if (season === 'autumn' && r() < .6) B.f(B.circ(c.x - 5 + r() * 10, c.y - 12 + r() * 6, 1.6), '#3e4a7a', .95); }
      }, {});
      // the cove's head: a rock face about a figure high from the steps to the sea, the steps cut through it
      const fpts = []; for (let x = faceFrom; x <= 91; x += .25) fpts.push(L.cpt(x, FACE_Y + Math.sin(x * 2.3) * .08));
      add(kit.bboxOf(fpts, 70), 96, (B, r) => {
        B.cx.save(); B.cx.clip(coastP);
        const sl = rpts('cliff-steps'), gap = sl ? (() => { const q = sl.reduce((m, p) => Math.abs(p.y - L.cpt(0, FACE_Y).y) < Math.abs(m.y - L.cpt(0, FACE_Y).y) ? p : m, sl[0]); return [q.x - halfPx(q, { nx: 1, ny: 0 }) - 2, q.x + halfPx(q, { nx: 1, ny: 0 }) + 2]; })() : [0, 0];
        for (const seg of [fpts.filter(p => p.x < gap[0]), fpts.filter(p => p.x > gap[1])]) { if (seg.length < 2) continue; const top = seg.map(p => ({ x: p.x, y: p.y - 4 })), foot = seg.map(p => ({ x: p.x, y: p.y + 36 }));
          B.cx.filter = 'blur(5px)'; B.f(B.poly(foot.map(p => ({ x: p.x, y: p.y - 6 })).concat(foot.slice().reverse().map(p => ({ x: p.x + 6, y: p.y + 10 })))), '#2e3420', .3); B.cx.filter = 'none';
          B.f(B.poly(top.concat(foot.slice().reverse())), B.lin(0, top[0].y, 0, foot[0].y, [[0, '#a89c86'], [.35, '#8c8270'], [1, '#5e564a']]));
          // its beds: ledges along it, cracks down it, a lit edge on each ledge
          for (let k = 1; k < 4; k++) V.strokePts(B, seg.map((p, i) => ({ x: p.x, y: p.y - 4 + k * 10 + Math.sin(i * .9 + k) * 1.6 })), '#d0c6ae', 1.4, .5);
          for (let i = 0; i < seg.length; i += 1 + Math.floor(r() * 2)) { const p = seg[i]; B.s(`M${p.x} ${p.y}l${(r() - .5) * 3} ${12 + r() * 20}`, '#3e3a34', .9, .55); }
          V.strokePts(B, top, STONE.rockHi, 3, .95);
          if (season !== 'winter') for (let i = 0; i < seg.length; i += 3) { const p = seg[i]; if (r() < .5) B.f(B.blob(r, p.x, p.y - 4, 4 + r() * 3, 1.6, 6, .5), '#7c8a44', .9); if (r() < .4) B.tufts(r, p.x, p.y + 38, 8, 3, ['#7c8a44', '#a8a860'], 5); }
          // boulders fallen at its foot on the sand
          for (let i = 2; i < seg.length; i += 5) if (r() < .55) B.boulder(r, seg[i].x + (r() - .5) * 8, seg[i].y + 44, 12 + r() * 10, 8 + r() * 6, STONE, false);
        }
        B.cx.restore();
      }, {});
      const cs = rpts('cliff-steps'); if (cs) flight(cs, { step: 9, salt: 5, rock: true });
    }

    // 1f. The dip's steam: soft wisps lifting off the warm water, thicker on a cold morning
    { const dip = (L.D.freshwater || []).find(w => w.id === 'orchard-dip'); if (dip && dip.boundary) { const pts = dip.boundary.map(L.pt), bb = kit.bboxOf(pts, 50);
      add([bb[0], bb[1] - 60, bb[2], bb[3]], 99, (B, r) => { const cx0 = (bb[0] + bb[2]) / 2, cy0 = (bb[1] + bb[3]) / 2, a = season === 'winter' ? .34 : season === 'autumn' ? .26 : .16;
        B.cx.filter = 'blur(6px)'; for (let k = 0; k < 7; k++) B.f(B.blob(r, cx0 + (r() - .5) * 30, cy0 - 6 - k * 7 + (r() - .5) * 4, 12 - k * .8, 6, 7, .5), '#f4f6f6', a * (1 - k / 9)); B.cx.filter = 'none'; }, {}); } }
    // 2. Trees in rows along the terraces, clear of everything the player uses
    const trees = [], kinds = GardenPaintWood.orchardKinds || ['apple'];
    // What the rows keep clear of, measured from the painted shapes, not cell centres: a trunk never stands on a
    // path's ribbon or the cider square's setts, in the stair's mouth, at the pond's lip or crowding the ring.
    // (round 3 layouts: every path of the orchard, the hand-authored ones included, and the climb to the pass)
    const ROUTE_IDS = [...L.routes.values()].filter(rt => rt.zone === 4 && rt.tier !== 'plaza' || rt.id === 'pass-summit').map(rt => rt.id);
    const ribbons = ROUTE_IDS.map(id => { const rt = L.routes.get(id); return rt && rt.points && rt.points.length > 1 ? { w: rt.widthCells || 1.4, pts: gardenIslandRoutePath(rt).points, grass: rt.surface === 'grass' } : null; }).filter(Boolean);
    const segD = (px, py, a, b) => { const ax = a.x * cw, ay = a.y * ch, bx = b.x * cw, by = b.y * ch, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    const offPath = (x, y, pad) => ribbons.every(rb2 => { const lim = rb2.w / 2 * cw * .5 + pad + (rb2.grass ? 64 : 0);   /* (fix round 1: nothing tall on the grass lanes, the midsummer line: a crown stood over the folly trail) */ for (let i = 1; i < rb2.pts.length; i++) if (segD(x * cw, y * ch, rb2.pts[i - 1], rb2.pts[i]) < lim) return false; return true; });
    const sq = L.routes.get('cider-square'), sqA = sq && sq.points ? sq.points[0] : null, sqB = sq && sq.points ? sq.points[sq.points.length - 1] : null;
    const sqShape = sq && sq.shape, inPoly = (x, y, pts) => { let on = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) on = !on; } return on; };
    const offSquare = (x, y) => { if (sqShape) return ![[0, 0], [.9, 0], [-.9, 0], [0, .7], [0, -.7]].some(([dx, dy]) => inPoly(x + dx, y + dy, sqShape)); if (!sqA) return true; const cx = Math.max(sqA[0], Math.min(sqB[0], x)), cy = sqA[1] + (sqB[1] - sqA[1]) * ((cx - sqA[0]) / ((sqB[0] - sqA[0]) || 1)); return ((x - cx) / 2.7) ** 2 + ((y - cy) / 2.5) ** 2 > 1; };
    const gate = (L.D.gates || []).find(g => g.id === 'island-orchard'), offGate = (x, y) => !gate || Math.abs(x - gate.x - .5) > 3.4 || y < gate.y - 3.2 || y > gate.y + 2;
    const dipC = (L.D.freshwater || []).filter(w => w.id === 'orchard-dip' && w.boundary).map(w => [w.boundary.reduce((a, p) => a + p[0], 0) / w.boundary.length, w.boundary.reduce((a, p) => a + p[1], 0) / w.boundary.length]);
    const dryLip = (x, y) => [[0, 0], [1.1, 0], [-1.1, 0], [0, 1], [0, -1.2], [.8, .8], [-.8, .8]].every(([dx, dy]) => L.kind(x + dx, y + dy) !== 'water') && dipC.every(([px, py]) => Math.hypot(x - px, (y - py) * 1.3) > 2.8 && !(Math.abs(x - px) < 2.6 && y > py && y < py + 4.6));   // (fix round 1: no crown over the dip)
    const ringS = L.stat('ld-ring'), ringC = ringS ? { x: ringS.x + ringS.w / 2, y: ringS.y + .5 } : null;
    // (round 3 layouts) the ring's eight trunks and the Mother tree where the hand-authored orchard puts them (presentation.orchard)
    const OR = (L.D.presentation && L.D.presentation.orchard) || {}, MOM = OR.mother ? [OR.mother.x, OR.mother.y] : [84.6, 45.2], RINGT = OR.ring && OR.ring.trunks;
    // (round 3 layouts) no row tree stands on or just in front of one of the orchard's places (a crown hid the bell and the press)
    const places = (L.D.static || []).filter(q => q.district === 'orchard-headland' && q.id !== 'ld-ring'), byPlace = (x, y) => places.some(q => x > q.x - 1.2 && x < q.x + q.w + 1.2 && y > q.y - .6 && y < q.y + q.h + 2.4);
    const clearOf = (x, y) => offPath(x, y, 5) && offSquare(x, y) && offGate(x, y) && dryLip(x, y) && !byPlace(x, y);
    for (let y = 21.6, row = 0; y < 47; y += 1.75, row++) for (let x = 60 + (row % 2) * 1.15; x < 89; x += 2.3) {
      const jx = x + (kit.hash(Math.round(x * 10), Math.round(y * 10), 93) % 100) / 100 * .7 - .35, jy = y + (kit.hash(Math.round(x * 10), Math.round(y * 10), 94) % 100) / 100 * .5 - .25;
      const fx = Math.floor(jx), fy = Math.floor(jy);
      // the trunk's own cell is grass (or the edge of a path cell the painted ribbon does not reach), on land the orchard owns
      const own = inReg(fx, fy) && (grass(fx, fy) || L.kind(fx + .5, fy + .5) === 'path' && offPath(jx, jy, 24));
      if (!own || !L.free(jx, jy) || L.plot(jx, jy) || L.plot(jx, jy - 1) || L.plot(jx - .8, jy) || L.plot(jx + .8, jy) || nearWall(jx, jy, 1.3)) continue;
      // the thyme terrace, the cowslip rise and the folly's ridge stay open: no rows there
      if (jy < 25 || (jx > 81.5 && jy > 33.5 && jy < 39.5) || (jx > 82 && jy < 33.5)) continue;
      if (!clearOf(jx, jy)) continue;
      if (ringC && ((jx - ringC.x) / 4.6) ** 2 + ((jy - ringC.y) / 3) ** 2 < 1) continue;   // the ring is its own eight pears
      if (Math.hypot(jx - MOM[0], (jy - MOM[1]) * 1.4) < 2.4) continue;   // room round the Mother tree
      if (kit.hash(fx, fy, 95) % 8 === 0) continue;   // a gap now and then, so rows read as planted, not stamped
      trees.push({ x: jx, y: jy, kind: ROWS[row % ROWS.length], h: 92 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // then fill the gaps the plots and paths leave: the same rules, a finer sieve, never closer than a row's spacing to a neighbour
    for (let y = 25.2; y < 47; y += .9) for (let x = 60.4 + (Math.round(y * 10) % 2) * .5; x < 89; x += 1.05) {
      if (trees.length >= 64) break;
      const jx = x + (kit.hash(Math.round(x * 10), Math.round(y * 10), 98) % 100) / 100 * .4 - .2, jy = y + (kit.hash(Math.round(x * 10), Math.round(y * 10), 99) % 100) / 100 * .3 - .15, fx = Math.floor(jx), fy = Math.floor(jy);
      if (!(inReg(fx, fy) && grass(fx, fy)) || !L.free(jx, jy) || L.plot(jx, jy) || L.plot(jx, jy - 1) || L.plot(jx - .8, jy) || L.plot(jx + .8, jy) || nearWall(jx, jy, 1.3)) continue;
      if ((jx > 81.5 && jy > 33.5 && jy < 39.5) || (jx > 82 && jy < 33.5) || !clearOf(jx, jy)) continue;
      if (ringC && ((jx - ringC.x) / 4.6) ** 2 + ((jy - ringC.y) / 3) ** 2 < 1 || Math.hypot(jx - MOM[0], (jy - MOM[1]) * 1.4) < 2.4) continue;
      if (trees.some(t => ((t.x - jx) / 2.05) ** 2 + ((t.y - jy) / 1.6) ** 2 < 1)) continue;
      const row = Math.round((jy - 21.6) / 1.75);
      trees.push({ x: jx, y: jy, kind: ROWS[((row % ROWS.length) + ROWS.length) % ROWS.length], h: 88 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // the ring of eight old perry pears round the mown centre
    const ring = L.stat('ld-ring');
    if (ring) { const c = L.cpt(ring.x + ring.w / 2, ring.y + .5); add([c.x - 170, c.y - 80, c.x + 170, c.y + 80], 99, (B, r) => { B.f(B.blob(r, c.x, c.y, 150, 58, 14, .12), season === 'winter' ? '#c4cab8' : '#b8c47a', .45); B.s(B.blob(r, c.x, c.y, 150, 58, 14, .12), P.lawnLo, 5, .25); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 150 + r() * 16; B.tufts(r, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * .4, 8, 4, [P.lawnLo, '#9a9a52'], 8); }
      // (fix round 1) mown in rings round the stone, light and dark, so the centre reads as kept lawn among the pears
      for (let k = 1; k < 5; k++) B.s(B.ell(c.x, c.y, k * 28, k * 11.5), k % 2 ? (season === 'winter' ? '#d0d6c4' : '#c8d48c') : P.lawnLo, 9, k % 2 ? .4 : .22); }); }
    if (ring && RINGT) RINGT.forEach(([x, y], i) => { if (inReg(x, y)) trees.push({ x, y, kind: 'pear', h: 168 + (i * 7) % 18, v: i % 3 }); });   // (4.2 H perry pears, round the mown centre)
    else if (ring) { const c = { x: ring.x + ring.w / 2, y: ring.y + .5 }; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, x = c.x + Math.cos(a) * 3.1, y = c.y + Math.sin(a) * 1.9; if (inReg(x, y) && L.kind(x, y) !== 'path' && offPath(x, y, 4) && offSquare(x, y)) trees.push({ x, y, kind: 'pear', h: 132 + (i * 7) % 20, v: i % 3 }); } }
    // their trunks are solid where they stand (the leaves are for walking behind): GardenPaintVale.orchardTrunks(), 94-garden-world-0walk.js
    trunks = trees.map(t => [+t.x.toFixed(2), +t.y.toFixed(2), t.h > 125 ? .42 : .32]).concat(inReg(MOM[0], MOM[1]) ? [[MOM[0], MOM[1], .5], [MOM[0] + 26 / cw, MOM[1] + .05, .22]] : []);   // (and the crutch's foot: you walked through it)
    for (const t of trees) { const p = L.cpt(t.x, t.y); thing({ y: p.y, make: scene => GardenPaintWood.orchardTree(scene, { kind: kinds.includes(t.kind) ? t.kind : 'apple', season, h: t.h, x: p.x, y: p.y, v: t.v, flip: (Math.round(t.x * 7) % 2) === 1 }) }); }
    // windfalls under the trees in autumn
    if (season === 'autumn' && trees.length) add(kit.bboxOf(trees.map(t => L.cpt(t.x, t.y)), 40), 98, (B, r) => { for (const t of trees) { const p = L.cpt(t.x, t.y); for (let k = 0; k < 5; k++) B.f(B.circ(p.x + (r() - .5) * 40, p.y + (r() - .3) * 10, 2.2), r() < .6 ? '#c8442e' : '#e0b23a', .9); } });
    // the Mother tree: the oldest apple, leaning, propped on a crutch
    const mt = L.cpt(MOM[0], MOM[1]);
    if (inReg(MOM[0], MOM[1])) {
      thing({ y: mt.y, make: scene => { const im = GardenPaintWood.orchardTree(scene, { kind: 'apple', season, h: 170, x: mt.x, y: mt.y, v: 2 }); if (im) im.setAngle(-9); return im; } });
      thing({ key: 'crutch', x: mt.x + 26, y: mt.y + 2, box: [-30, -80, 10, 6], draw: B => { B.s('M0 0L-22 -66', '#6a5034', 4).s('M-28 -64L-15 -70', '#6a5034', 4).s('M0 0L-22 -66', '#9a7a54', 1.4, .7); } });
    }
  }

  // The orchard's trunks as [x, y, width] in cells, while the painted vale is what is shown (null otherwise).
  let trunks = null;
  // The painted orchard plants its own rows, so the world leaves out its generic grove stands there (94-garden-native-world.js).
  V.ownsRegion = id => id === 'orchard-headland' && V.wanted();
  V.orchardTrunks = () => (V.wanted() && trunks) || null;
  V.parts.push({ id: 'orchard', compose });
})();
