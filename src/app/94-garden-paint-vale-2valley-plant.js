/* Painted vale: Millwater valley's trees and planting (see 94-garden-paint-vale-0kit.js and docs/dev/PAINT_KIT.md).
 * The valley is open farm country after the wood: its trees stand where farm trees stand, each group for a reason.
 *  - Along the river and the mill race: weeping willows and alders on the banks, in loose groups at the bends,
 *    leaning out over the water; old pollard willows in a line along the water meadows' edge.
 *  - Along the field edges (the lanes, the field track, the edges of the plots): hedgerow standards, an oak now and
 *    then with hawthorns between, and bushes of hawthorn and elder at their feet.
 *  - Out in the open fields: one old field oak where the ground rises, never more.
 *  - Under all of them: meadowsweet and rushes at the water's edge, cow parsley and nettles along the hedge foot.
 * Every place comes from the layout (the valley region, its fresh water, its routes, plots, statics, gates and
 * crossings): no cell is named here, so the planting follows the layout when it is redesigned.
 * Sizes from the size standard (gardenSizePx). Trees are standing things of the vale kit: a sprite each with its own
 * shadow along the one light, a crown that fades when you stand under it, and a trunk foot that walking stops at
 * (GardenPaintVale.feet, 94-garden-world-0walk.js). Low planting is painted into the vale's ground layer (no frame cost).
 * Only rendering and the trunk feet: cells, plots and saved rows are untouched. Nothing runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const REGION = 'east-mill';
  const inRegion = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x, y) : null; return !!(r && (r.id === REGION || r.theme === 'valley')); };

  /* ---------- the valley's own willows (the shared tree kit has none) ---------- */
  const WILLOW = {
    summer: ['#26402e', '#3c5c40', '#587a52', '#7e9c6c', '#a8c092'], spring: ['#30522e', '#4c7442', '#6c9a5a', '#94bc7a', '#c2dca2'],
    autumn: ['#46462a', '#686630', '#928a40', '#bcae5e', '#dcd08e'], winter: ['#5a4426', '#80602e', '#a8843c', '#cca456', '#e6c47a'],
  };
  const WBARK = ['#2e2620', '#4a3e32', '#6a5a48', '#8e7c64'];
  const mixC = (a, b, t) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), c = (x, y) => Math.max(0, Math.min(255, Math.round(x + (y - x) * t))); return '#' + ((1 << 24) + (c(p >> 16, q >> 16) << 16) + (c((p >> 8) & 255, (q >> 8) & 255) << 8) + c(p & 255, q & 255)).toString(16).slice(1); };
  /** A weeping willow, foot at (0, 0), H tall: a short leaning bole that forks, limbs arching up into a dome, and the
   *  curtain of hanging strands falling from them nearly to the grass, the sky showing between the strands. Lit from the
   *  upper left: the strands on the sunny side are pale silver-green, the far side and the inside deep. */
  function weeping(cx, r, H, season, v) {
    const C = WILLOW[season] || WILLOW.summer, bare = season === 'winter', lean = ((v % 3) - 1) * .05 + (r() - .5) * .03;
    const tw = H * .05, fork = -H * .3, fx = lean * H * .3, ccx = fx + lean * H * .25, ccy = -H * .66, rx = H * .4, ry = H * .27;
    // the back of the curtain: strands on the far side, in shade
    const strand = (ax, ay, len, w, col, a) => {
      const out = (ax - ccx) / rx, ex = ax + out * H * .07 + (r() - .5) * H * .025, ey = Math.min(-H * .05 - r() * H * .05, ay + len);
      cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); cx.moveTo(ax, ay);
      cx.bezierCurveTo(ax + out * H * .06, ay - H * .03, ex - out * H * .01, ay + (ey - ay) * .45, ex, ey); cx.stroke();
      if (a > .8) { cx.globalAlpha = a * .55; cx.strokeStyle = mixC(col, '#e8eed8', .3); cx.lineWidth = w * .55; cx.setLineDash([H * .012, H * .02]); cx.beginPath(); cx.moveTo(ax - w * .3, ay); cx.bezierCurveTo(ax + out * H * .06 - w * .3, ay - H * .03, ex - out * H * .01 - w * .3, ay + (ey - ay) * .45, ex - w * .3, ey); cx.stroke(); cx.setLineDash([]); }
      return { ex, ey };
    };
    cx.lineCap = 'round';
    if (!bare) { // a soft body behind the strands, broken so the sky shows through
      cx.globalAlpha = .55; cx.fillStyle = C[0];
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i / 6 * .9), x = ccx + Math.cos(a) * rx * .55, y = ccy + Math.sin(a) * ry * .45 + H * .06; cx.beginPath(); cx.ellipse(x, y, rx * (.32 + r() * .1), H * (.22 + r() * .08), 0, 0, Math.PI * 2); cx.fill(); }
    }
    const N = Math.round(70 + H * .4);
    for (let i = 0; i < N; i++) { const u = r(), a = Math.PI * (1.04 + u * .92), k = .5 + r() * .45, ax = ccx + Math.cos(a) * rx * k, ay = ccy + Math.sin(a) * ry * k + H * .04; strand(ax, ay, H * (.38 + r() * .26), H * (.013 + r() * .006), bare ? C[1] : C[1 + (r() < .4 ? 1 : 0)], bare ? .7 : .9); }
    // the bole: thick, short, fissured, flaring into roots, lit on its left
    const g = cx.createLinearGradient(-tw * 2, 0, tw * 2, 0); g.addColorStop(0, WBARK[3]); g.addColorStop(.35, WBARK[2]); g.addColorStop(.75, WBARK[1]); g.addColorStop(1, WBARK[0]);
    cx.globalAlpha = 1; cx.fillStyle = g; cx.beginPath(); cx.moveTo(-tw * 2.3, 1.5);
    cx.quadraticCurveTo(-tw * 1.1, -tw * .6, -tw * 1.05 + fx * .4, fork * .55); cx.quadraticCurveTo(-tw * .9 + fx * .8, fork * .9, fx - tw * 1.4, fork - tw * .8);
    cx.lineTo(fx + tw * 1.3, fork - tw * .6); cx.quadraticCurveTo(tw * 1 + fx * .8, fork * .85, tw * 1.1 + fx * .4, fork * .5);
    cx.quadraticCurveTo(tw * 1.2, -tw * .5, tw * 2.5, 1.5); cx.quadraticCurveTo(0, 3.2, -tw * 2.3, 1.5); cx.fill();
    cx.strokeStyle = WBARK[0]; cx.lineWidth = Math.max(.6, tw * .12); cx.globalAlpha = .55;
    for (let i = 0; i < 5; i++) { const x0 = (r() - .5) * tw * 1.4; cx.beginPath(); cx.moveTo(x0, -1); cx.quadraticCurveTo(x0 + fx * .3 + (r() - .5) * tw * .5, fork * .5, x0 * .7 + fx * .9, fork * (.8 + r() * .15)); cx.stroke(); }
    // the limbs, arching up and out into the crown (seen through the strands)
    cx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { const t = i / 3 - .5, ex = ccx + t * rx * 1.5, ey = ccy - ry * (.75 - Math.abs(t) * .7); cx.strokeStyle = WBARK[i < 2 ? 2 : 1]; cx.lineWidth = tw * (.9 - Math.abs(t) * .5); cx.beginPath(); cx.moveTo(fx + t * tw, fork); cx.quadraticCurveTo(fx + t * rx * .5, fork - H * .2, ex, ey); cx.stroke(); }
    // the front of the curtain, the sunny side paler; then a fringe of leaf flecks on the lit edge
    for (let i = 0; i < N * 1.5; i++) {
      const u = r(), a = Math.PI * (1.02 + u * .96), k = .7 + r() * .38, ax = ccx + Math.cos(a) * rx * k, ay = ccy + Math.sin(a) * ry * k + H * .02;
      const lit = -(ax - ccx) / rx * .55 - (ay - ccy) / ry * .6 + (r() - .5) * .5, col = bare ? C[lit > .2 ? 4 : lit > -.2 ? 3 : 2] : C[lit > .45 ? 4 : lit > .05 ? 3 : lit > -.35 ? 2 : 1];
      const e = strand(ax, ay, H * (.3 + r() * .32) * (1 - Math.abs(u - .5) * .4), H * (.008 + r() * .006), col, bare ? .85 : .95);
      if (!bare && r() < .55) { cx.globalAlpha = .9; cx.fillStyle = C[Math.min(4, (lit > .2 ? 4 : 3))]; cx.beginPath(); cx.ellipse(e.ex, e.ey - H * .01, H * .009, H * .022, 0, 0, Math.PI * 2); cx.fill(); }
    }
    // the crown's top, catching the sun
    if (!bare) { cx.globalAlpha = .8; cx.strokeStyle = C[4]; cx.lineWidth = H * .012; for (let i = 0; i < 18; i++) { const a = Math.PI * (1.08 + r() * .5), ax = ccx + Math.cos(a) * rx * (.55 + r() * .4), ay = ccy + Math.sin(a) * ry * (.7 + r() * .3); cx.beginPath(); cx.moveTo(ax, ay); cx.quadraticCurveTo(ax - H * .03, ay - H * .02, ax - H * .05, ay + H * .07); cx.stroke(); } }
    cx.globalAlpha = 1;
  }
  /** An old pollard willow, foot at (0, 0), H tall: a squat gnarled trunk cut at head height long ago, a knuckled head,
   *  and from it a round mop of slender wands, their narrow silver-green leaves in soft clumps, the outer wands bowing out
   *  (bare golden-orange wands in winter). Lit from the upper left. */
  function pollard(cx, r, H, season) {
    const C = WILLOW[season] || WILLOW.summer, bare = season === 'winter', th = H * .42, tw = H * .085, hy = -th - tw * .6;
    const mx = 0, my = -H * .68, mrx = H * .38, mry = H * .3;
    cx.lineCap = 'round';
    const wands = [];
    for (let i = 0; i < 34; i++) { const a = -Math.PI / 2 + (r() - .5) * 2.5, ex = mx + Math.cos(a) * mrx * (.7 + r() * .35), ey = my + Math.sin(a) * mry * (.7 + r() * .35) + Math.abs(Math.cos(a)) * H * .1; wands.push({ x0: (r() - .5) * tw * 1.6, y0: hy - r() * tw * .4, ex, ey, a, lit: -Math.cos(a) * .6 - Math.sin(a) * .2 + (r() - .5) * .5 }); }
    wands.sort((p, q) => q.lit - p.lit);   // shaded wands first, the sunny side on top
    // the mop's dark heart, so it reads as one rounded head and not a fan
    if (!bare) { cx.globalAlpha = .85; cx.fillStyle = C[0]; for (let i = 0; i < 5; i++) { cx.beginPath(); cx.ellipse(mx + (r() - .5) * mrx * .6, my + (r() - .3) * mry * .5, mrx * (.5 + r() * .2), mry * (.45 + r() * .2), 0, 0, Math.PI * 2); cx.fill(); } }
    const leaf = (x, y, ang, len, col, a) => { cx.globalAlpha = a; cx.fillStyle = col; cx.beginPath(); cx.ellipse(x, y, len, len * .32, ang, 0, Math.PI * 2); cx.fill(); };
    for (const w of wands) {
      const bx = (w.x0 + w.ex) / 2 + Math.cos(w.a) * H * .04, by = (w.y0 + w.ey) / 2 - H * .05;
      cx.globalAlpha = 1; cx.strokeStyle = bare ? (w.lit > 0 ? '#d08a40' : '#9a5a2c') : '#5e5a36'; cx.lineWidth = Math.max(.7, H * .011); cx.beginPath(); cx.moveTo(w.x0, w.y0); cx.quadraticCurveTo(bx, by, w.ex, w.ey + H * .03); cx.stroke();
      if (bare) continue;
      const col = C[w.lit > .4 ? 4 : w.lit > .05 ? 3 : w.lit > -.3 ? 2 : 1];
      for (let k = 0; k < 5; k++) { const t = .45 + k * .13, px = (1 - t) * (1 - t) * w.x0 + 2 * t * (1 - t) * bx + t * t * w.ex, py = (1 - t) * (1 - t) * w.y0 + 2 * t * (1 - t) * by + t * t * (w.ey + H * .03); const ang = w.a + (r() - .5) * .8 + Math.PI / 2 * (r() < .5 ? .25 : -.25);
        leaf(px + (r() - .5) * H * .03, py + (r() - .5) * H * .02, ang, H * (.038 + r() * .02), col, .95);
        if (r() < .5) leaf(px + (r() - .5) * H * .04, py + H * .015, ang + .6, H * .03, C[Math.max(1, (w.lit > .2 ? 3 : 2))], .9); }
    }
    // the trunk: wider at the head than the waist, fissured, a dark hollow on its shaded side
    const g = cx.createLinearGradient(-tw * 1.6, 0, tw * 1.6, 0); g.addColorStop(0, WBARK[3]); g.addColorStop(.4, WBARK[2]); g.addColorStop(1, WBARK[0]);
    cx.globalAlpha = 1; cx.fillStyle = g; cx.beginPath(); cx.moveTo(-tw * 1.7, 1.5); cx.quadraticCurveTo(-tw * .8, -th * .4, -tw * 1.2, -th * .85); cx.quadraticCurveTo(-tw * 1.9, -th - tw * .7, -tw * .4, -th - tw * .9);
    cx.quadraticCurveTo(tw * .4, -th - tw * 1.3, tw * 1.5, -th - tw * .5); cx.quadraticCurveTo(tw * 1.4, -th * .8, tw * .9, -th * .5); cx.quadraticCurveTo(tw * 1.1, -tw * .5, tw * 1.9, 1.5); cx.quadraticCurveTo(0, 3, -tw * 1.7, 1.5); cx.fill();
    cx.globalAlpha = .6; cx.fillStyle = WBARK[0]; cx.beginPath(); cx.ellipse(tw * .45, -th * .55, tw * .3, th * .16, .1, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = WBARK[0]; cx.lineWidth = Math.max(.6, tw * .14); for (let i = 0; i < 4; i++) { const x0 = (r() - .6) * tw * 1.2; cx.beginPath(); cx.moveTo(x0, 0); cx.quadraticCurveTo(x0 + (r() - .5) * tw, -th * .5, x0 * .8, -th * .9); cx.stroke(); }
    // the knuckled head, lit on top, half hidden in the wands' feet
    for (let i = 0; i < 5; i++) { const x = (i / 4 - .5) * tw * 2.2, y = -th - tw * (.5 + r() * .4); cx.globalAlpha = 1; cx.fillStyle = WBARK[i < 2 ? 2 : 1]; cx.beginPath(); cx.ellipse(x, y, tw * .45, tw * .35, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = .55; cx.fillStyle = WBARK[3]; cx.beginPath(); cx.ellipse(x - tw * .12, y - tw * .14, tw * .22, tw * .12, 0, 0, Math.PI * 2); cx.fill(); }
    // a few wands in front of the head, so it sits inside its mop
    if (!bare) for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (r() - .5) * 1.6, px = Math.cos(a) * tw * 1.4, py = hy - tw * .8 + Math.sin(a) * tw; leaf(px, py, a + Math.PI / 2, H * .035, C[i < 3 ? 3 : 2], .95); }
    cx.globalAlpha = 1;
  }

  /* ---------- where things stand ---------- */
  function compose(C) {
    if (typeof gardenLandCell !== 'function' || typeof gardenIslandBaseCell !== 'function' || !window.GardenPaintTrees || typeof gardenSizePx !== 'function') return;
    const { L, W, kit, season, thing, add } = C, cw = W.cellW, ch = W.cellH, D = L.D;
    const region = (D.regions || []).find(r => r.id === REGION); if (!region) return;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const p of region.polygons) for (const [x, y] of p) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
    bx0 = Math.max(0, Math.floor(bx0)); by0 = Math.max(0, Math.floor(by0)); bx1 = Math.min(W.cols - 1, Math.ceil(bx1)); by1 = Math.min(W.rows - 1, Math.ceil(by1));
    const base = (x, y) => gardenIslandBaseCell(x, y), row = (x, y) => gardenLandCell(x, y);
    const wet = (x, y) => { const b = base(x, y); return !b || !b.land || !!b.freshwater || L.kind(x + .5, y + .5) === 'water'; };
    const fresh = (x, y) => { const b = base(x, y); return !!(b && b.freshwater) || L.kind(x + .5, y + .5) === 'water'; };
    const plotAt = (x, y) => { const rw = row(x, y); return !!(rw && rw.plot); };
    const pathAt = (x, y) => { const rw = row(x, y); return !!(rw && (rw.trail || rw.lane)) || L.mat(x, y) === 'path'; };
    // every route's painted ribbon, in world px: nothing stands on a path's width
    const ribbons = [];
    for (const rt of D.routes || []) {
      if (!rt.points || rt.points.length < 2 || typeof gardenIslandRoutePath !== 'function') continue;
      const kind = window.GardenPaintGround ? GardenPaintGround.routeKind(rt) : 'earth', w = rt.tier === 'plaza' ? (Number(rt.widthCells) || 3) * cw : Number(rt.paintWidth) || (window.GardenPaintGround && GardenPaintGround.ROUTE_WIDTH[kind]) || 26;
      ribbons.push({ half: w / 2, pts: gardenIslandRoutePath(rt).points.map(p => ({ x: p.x * cw, y: W.sky + p.y * ch })) });
    }
    const pathGap = (X, Y) => { let best = Infinity; for (const rb of ribbons) for (let i = 1; i < rb.pts.length; i++) { const a = rb.pts[i - 1], b = rb.pts[i], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - a.x) * dx + (Y - a.y) * dy) / l)), d = Math.hypot(X - a.x - dx * t, Y - a.y - dy * t) - rb.half; if (d < best) best = d; } return best; };
    // statics with their aprons (and the four rows in front of them, where a crown would hide them), gates, crossings
    const statics = D.static || [], held = new Set(), screened = new Set();
    for (const s of statics) for (const b of [s, s.apron].filter(Boolean)) {
      for (let y = Math.floor(b.y) - 1; y <= b.y + (b.h || 1); y++) for (let x = Math.floor(b.x) - 1; x <= b.x + (b.w || 1); x++) held.add(x + ',' + y);
      for (let y = Math.floor(b.y + (b.h || 1)); y <= b.y + (b.h || 1) + 4; y++) for (let x = Math.floor(b.x) - 2; x <= b.x + (b.w || 1) + 1; x++) screened.add(x + ',' + y);
    }
    const gates = D.gates || [], byGate = (x, y) => gates.some(g => Math.abs(x - g.x) <= 3.5 && y - g.y >= -2.5 && y - g.y <= 5.5);
    const crossings = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : [], crossPts = [];
    for (const c of crossings) for (const p of c.points || []) crossPts.push(p);
    for (const c of (D.presentation || {}).crossings || []) crossPts.push({ x: c.x, y: c.y });
    const byCrossing = (x, y) => crossPts.some(p => Math.abs(x - p.x) < 2.6 && y - p.y > -2 && y - p.y < 4.5);
    const finds = typeof GARDEN_GATE_FINDS !== 'undefined' && typeof gardenGateFindPoint === 'function' ? GARDEN_GATE_FINDS.map(f => gardenGateFindPoint(f)).filter(Boolean) : [], byFind = (x, y) => finds.some(q => Math.abs(x - q.x) <= 2.5 && y - q.y >= -1 && y - q.y <= 3.5);
    // the trees the woods painter already plants on the valley's banks (94-garden-paint-wood-0core.js): keep clear of them
    const woodFeet = []; { const t = window.GardenPaintWood && GardenPaintWood.trunks ? V.ok(() => GardenPaintWood.trunks()) : null; if (t && t.list) for (const b of t.list) woodFeet.push({ x: (b.x0 + b.x1) / 2, y: b.y1 }); }
    const near = (x, y, rad, test) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (test(x + dx, y + dy)) return true; return false; };
    const distTo = (x, y, rad, test) => { let best = 99; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (test(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy)); return best; };
    const N = (x, y, s, k) => kit.noise(x / s, y / s, k);

    // 1. what each free cell of the valley is: a bank, a field edge, or open field
    const cand = [], why = {};
    const map = {}, no = (k, x, y) => { why[k] = (why[k] || 0) + 1; };
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!inRegion(x + .5, y + .5)) continue;
      const b = base(x, y), rw = row(x, y);
      if (!b || !b.land || b.beach || b.freshwater || b.solid || b.reserved || b.ocean || L.kind(x + .5, y + .5) !== 'grass') { no('ground'); continue; }
      if (rw && (rw.plot || rw.trail || rw.lane || rw.solid)) { no('row'); continue; }
      const k = x + ',' + y; if (held.has(k) || screened.has(k) || byGate(x, y) || byCrossing(x, y) || byFind(x, y)) { no('kept'); continue; }
      const shore = near(x, y, 1, (a, c) => { const bb = base(a, c); return !!(bb && (bb.beach || bb.ocean || !bb.land && !bb.freshwater)); });   // (at the beach's top only a low wind-cut thorn)
      // a crown rises about four rows up the screen: nothing just in front of (south of) a plot, so a plot and its sign stay in view
      // (a small tree, a hawthorn or a pollard, may stand at a plot's side; a big one keeps a column clear and three rows)
      const overPlot = plotAt(x, y - 1), bigOver = overPlot || shore || plotAt(x - 1, y - 1) || plotAt(x + 1, y - 1) || near(x, y - 2, 1, plotAt) || plotAt(x, y - 3) || plotAt(x - 1, y) || plotAt(x + 1, y);
      if (overPlot) { no('plot'); continue; }
      const dw = distTo(x, y, 3, fresh), dp = distTo(x, y, 2, (a, c) => pathAt(a, c) || plotAt(a, c));
      const kind = dw <= 2.3 ? 'bank' : dp <= 1.5 ? 'edge' : 'field';
      // a wall's face hangs below its line: no trunk at its foot, no crown standing up over it (the terrace wall, the scarp; a willow
      // at the river, where the wall ends, leans clear of it)
      if (kind !== 'bank' && (near(x, y - 1, 1, (a, c) => { const bb = base(a, c); return !!(bb && bb.solid); }) || near(x, y - 2, 1, (a, c) => { const bb = base(a, c); return !!(bb && bb.solid); })) ) { no('wall'); continue; }
      cand.push({ x, y, kind, dw, small: bigOver, score: kit.hash(x, y, 811) / 4294967296 });
    }
    // 2. choose, best first, keeping each kind's own spacing and clear of paths, other trees and the woods' trees
    const trees = [];
    const spacing = { bank: 2.1, edge: 3.4, field: 9 }, F = sp => GardenPaintTrees.form(sp);
    cand.sort((a, b) => a.score - b.score);
    for (const c of cand) {
      const { x, y, kind } = c;
      // groups, not a scatter: the clustering field decides where a group stands (banks at the bends, hedgerows by stretches)
      const group = N(x, y, kind === 'bank' ? 4.5 : 6, kind === 'bank' ? 3 : 5), roll = kit.hash(x, y, 812) / 4294967296;
      const want = kind === 'bank' ? (group > .48 ? .85 : group > .32 ? .45 : .1) : kind === 'edge' ? (group > .5 ? .62 : group > .34 ? .3 : .07) : (group > .7 ? .25 : 0);
      if (roll > want) { no('want-' + kind); continue; }
      // the species: what grows there
      const pick = kit.hash(x, y, 813) / 4294967296, meadowSide = N(x, y, 9, 21) > .5;
      let sp, h;
      if (c.small) sp = kind === 'bank' ? 'pollard' : pick < .7 ? 'hawthorn' : kind === 'field' ? 'hawthorn' : 'cherry';
      else if (kind === 'bank') { sp = c.dw <= 1.5 ? (pick < .55 ? 'willow' : pick < .85 ? 'alder' : meadowSide ? 'pollard' : 'alder') : (pick < .4 ? 'pollard' : pick < .75 ? 'alder' : 'willow'); }
      else if (kind === 'edge') sp = pick < .34 ? 'oak' : pick < .78 ? 'hawthorn' : pick < .9 ? 'cherry' : 'alder';
      else sp = pick < .7 ? 'oak' : 'chestnut';
      const t = kit.hash(x, y, 814) / 4294967296;
      h = sp === 'pollard' ? gardenSizePx('young', .1 + t * .5) : sp === 'hawthorn' || sp === 'cherry' ? gardenSizePx('young', .4 + t * .6) : sp === 'willow' ? gardenSizePx('tree', .15 + t * .5) : sp === 'alder' ? gardenSizePx('tree', .1 + t * .4) : gardenSizePx('tree', kind === 'field' ? .6 + t * .4 : .3 + t * .5);
      h = Math.round(h / 12) * 12;   // (a few heights per species, so trees share pictures)
      const jx = (kit.hash(x, y, 815) / 4294967296 - .5) * .5, jy = (kit.hash(x, y, 816) / 4294967296 - .5) * .3, tx = x + .5 + jx, ty = y + .85 + jy;
      const X = tx * cw, Y = W.sky + ty * ch;
      if (pathGap(X, Y) < 12) { no('pathgap'); continue; }
      if (wet(Math.floor(tx), Math.floor(ty)) || wet(Math.floor(tx + .3), Math.floor(ty)) || wet(Math.floor(tx - .3), Math.floor(ty))) continue;
      const gap = Math.max(spacing[kind], sp === 'pollard' ? 1.8 : 0);
      if (trees.some(o => Math.hypot(o.x - tx, (o.y - ty) * 1.3) < Math.max(gap, spacing[o.kind] * .8))) { no('spacing'); continue; }
      if (woodFeet.some(o => Math.hypot(o.x - tx, o.y - ty) < 2.8)) { no('wood'); continue; }
      trees.push({ x: tx, y: ty, kind, sp, h, v: kit.hash(x, y, 817) % 3, flip: kit.hash(x, y, 818) % 2 === 1, seed: kit.hash(x, y, 819) % 99991 });
    }
    // the open meadows each keep one old field oak, where the most open ground is round it (a field tree, not a scatter)
    const opens = cand.filter(c => c.kind === 'field' && !c.small).map(c => Object.assign({ room: distTo(c.x, c.y, 3, (a, b) => pathAt(a, b) || plotAt(a, b) || held.has(a + ',' + b) || fresh(a, b)) }, c)).filter(c => c.room >= 2).sort((a, b) => b.room - a.room || a.score - b.score);
    for (const c of opens) {
      if (trees.filter(t => t.kind === 'field').length >= 4) break;
      const tx = c.x + .5, ty = c.y + .85;
      if (pathGap(tx * cw, W.sky + ty * ch) < 24 || trees.some(o => Math.hypot(o.x - tx, (o.y - ty) * 1.3) < (o.kind === 'field' ? 9 : 3.6)) || woodFeet.some(o => Math.hypot(o.x - tx, o.y - ty) < 3)) continue;
      const t = kit.hash(c.x, c.y, 824) / 4294967296;
      trees.push({ x: tx, y: ty, kind: 'field', sp: t < .75 ? 'oak' : 'chestnut', h: Math.round(gardenSizePx('tree', .55 + t * .45) / 12) * 12, v: kit.hash(c.x, c.y, 825) % 3, flip: kit.hash(c.x, c.y, 826) % 2 === 1, seed: kit.hash(c.x, c.y, 827) % 99991 });
    }
    // 3. stand them: a sprite each (shared by species, height and variant), its shadow along the light, its crown fading
    for (const t of trees) {
      const p = { x: t.x * cw, y: W.sky + t.y * ch }, H = t.h, own = t.sp === 'willow' || t.sp === 'pollard';
      let box, crown, half;
      if (t.sp === 'willow') { box = [-H * .62, -H * 1.02, H * .62, 8]; crown = { x: 0, y: -H * .62, rx: H * .42, ry: H * .3 }; half = Math.max(6, H * .06); }
      else if (t.sp === 'pollard') { box = [-H * .5, -H * 1.02, H * .5, 8]; crown = { x: 0, y: -H * .66, rx: H * .36, ry: H * .3 }; half = Math.max(5, H * .1); }
      else { const f = F(t.sp), hw = H * Math.max(f.rx * 1.35, .3) + 6; box = [-hw, -(H * (f.cy + f.ry * 1.25) + 6), hw, 8]; crown = { x: 0, y: -H * f.cy, rx: H * f.rx, ry: H * f.ry }; half = Math.max(4, Math.min(11, H * f.girth * 1.4)); }
      box = box.map(Math.round);
      const key = t.sp + '|' + season + '|' + t.v + '|' + H + '|' + t.seed + (t.flip ? '|f' : '');   // (each tree its own picture: they are few and small, and no two hawthorns stand alike)
      thing({ key, x: p.x, y: p.y, box, K: 1.25, crown: crown && { x: crown.x, y: crown.y, rx: crown.rx, ry: crown.ry }, foot: [-half, half, 7], shade: { a: own ? .3 : .34 }, draw: B => {
        const cx = B.cx, m = cx.getTransform(), sc = Math.hypot(m.a, m.b) || 1, r = kit.rng(kit.hash(t.v + 3, H, t.seed + 31));
        cx.save(); if (t.flip) cx.scale(-1, 1);
        if (t.sp === 'willow') weeping(cx, r, H, season, t.v);
        else if (t.sp === 'pollard') pollard(cx, r, H, season);
        else { const c = GardenPaintTrees.canvas({ species: t.sp, season, v: t.v, h: H, K: Math.min(4, sc), seed: t.seed }); if (c) cx.drawImage(c.c, -c.ox / c.k, -c.oy / c.k, c.c.width / c.k, c.c.height / c.k); }
        cx.restore();
      } });
    }
    V._valleyTrees = { list: trees.map(t => t.sp + '@' + t.x.toFixed(1) + ',' + t.y.toFixed(1) + ':' + t.h).join(' '), trees: trees.length, cand: cand.length, why, kinds: cand.reduce((a, c) => (a[c.kind] = (a[c.kind] || 0) + 1, a), {}) };

    // 4. the low planting at their feet and along the water and the hedge lines, painted into the ground (walked over)
    const lows = [];
    // a low plant stands on open ground only: never on a plot or its fence, a path's cells, a doorway or the water
    const lowOk = (x, y, h) => { const hw = h * .6 / cw; for (const dx of [-hw, 0, hw]) for (const dy of [0, -.45]) { const cx = Math.floor(x + dx), cy = Math.floor(y + dy), b = base(cx, cy); if (!b || !b.land || b.freshwater || b.beach || b.reserved || plotAt(cx, cy) || held.has(cx + ',' + cy)) return false; } return pathGap(x * cw, W.sky + y * ch) > 6; };
    for (const t of trees) {
      const n = t.kind === 'edge' ? 3 : t.kind === 'bank' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const a = (kit.hash(Math.round(t.x * 10), Math.round(t.y * 10), 820 + i) / 4294967296) * Math.PI * 2, d = .55 + (kit.hash(Math.round(t.x * 10), i, 821) / 4294967296) * .7;
        const x = t.x + Math.cos(a) * d, y = t.y + Math.abs(Math.sin(a)) * d * .4 + .05; if (!lowOk(x, y, 34)) continue;
        const pick = kit.hash(Math.round(x * 10), Math.round(y * 10), 822) % 6;
        const id = t.kind === 'bank' ? ['plant.canal-view-meadowsweet', 'plant.reed', 'plant.canal-view-meadowsweet', 'plant.grass', 'plant.reed', 'plant.wildflowers'][pick] : ['plant.hedge', 'plant.wildflowers', 'plant.hedge', 'plant.bracken', 'plant.grass', 'plant.hedge'][pick];
        lows.push({ id, v: pick % 3, h: id === 'plant.hedge' ? 30 + pick * 3 : id === 'plant.reed' ? 34 + pick * 2 : 20 + pick * 3, x: x * cw, y: W.sky + y * ch });
      }
    }
    // rushes and meadowsweet along the open water's edge between the trees
    for (const c of cand) if (c.kind === 'bank' && c.dw <= 1.5 && kit.hash(c.x, c.y, 830) % 4 === 0) {
      const x = c.x + .5 + (kit.hash(c.x, c.y, 831) / 4294967296 - .5) * .6, y = c.y + .9; if (!lowOk(x, y, 30)) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.y - y) < .9)) continue;
      const pick = kit.hash(c.x, c.y, 832) % 4; lows.push({ id: ['plant.reed', 'plant.canal-view-meadowsweet', 'plant.reed', 'plant.bulrush'][pick], v: pick % 3, h: 30 + pick * 4, x: x * cw, y: W.sky + y * ch });
    }
    if (lows.length && window.GardenNativePainted && GardenNativePainted.objectCanvas) {
      const cans = new Map(), canOf = (i, m) => { const k = i.id + ':' + i.v + ':' + i.h + ':' + m; let o = cans.get(k); if (o === undefined) { o = V.ok(() => GardenNativePainted.objectCanvas(i.id, i.v, season, { h: i.h * m })); cans.set(k, o); } return o; };
      const tone = season === 'winter' ? ['#8a9878', '#a4ae90'] : season === 'autumn' ? ['#7e9446', '#9aaa58'] : ['#5e8a3e', '#7aa24c'];
      const bb = kit.bboxOf(lows.map(i => ({ x: i.x, y: i.y })), 60);
      add(bb, 8401, (B, r0, cb) => {
        const gx = B.cx, m = gx.getTransform(), lvl = Math.max(1, Math.min(2, Math.hypot(m.a, m.b) / 2));
        for (const i of lows) {
          if (cb && (i.x < cb[0] - 60 || i.x > cb[2] + 60 || i.y < cb[1] - 10 || i.y > cb[3] + 70)) continue;
          const o = canOf(i, lvl); if (!o) continue;
          // (the library canvas holds two px a world px at the height it was asked for, here lvl times the planting's own)
          const dw = o.c.width / 2 / lvl, dh = o.c.height / 2 / lvl, ox = o.ox / 2 / lvl, oy = o.oy / 2 / lvl;
          gx.globalAlpha = .2; gx.fillStyle = '#2e3e22'; gx.beginPath(); gx.ellipse(i.x + 2, i.y - .5, Math.min(dw * .46, i.h * .9), 2.8, 0, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = 1;
          gx.drawImage(o.c, i.x - ox, i.y - oy, dw, dh);
          const blades = Math.max(3, Math.round(Math.min(dw, i.h * 1.6) / 2.8)), seed = Math.abs(Math.round(i.x * 7 + i.y * 13)); gx.lineCap = 'round';
          for (let b = 0; b < blades; b++) { const tt = blades > 1 ? b / (blades - 1) : .5, hh = ((seed + b * 37) % 7) / 7, px = i.x - dw * .4 + tt * dw * .8, len = (3 + hh * 4.5) * (1 - Math.abs(tt - .5) * .6); gx.strokeStyle = tone[(seed + b) % 2]; gx.globalAlpha = .9; gx.lineWidth = 1.1; gx.beginPath(); gx.moveTo(px, i.y + .6); gx.quadraticCurveTo(px + (hh - .5) * 2, i.y - len * .5, px + (hh - .5) * 4, i.y - len); gx.stroke(); }
          gx.globalAlpha = 1;
        }
      });
    }
  }
  V.parts.push({ id: 'valley-planting', compose });
})();
