/* Painted vale: the coast's own places. The estuary's salt marsh round the
 * boardwalk (creeks of grey mud, samphire, sea lavender and reed beds, the
 * boardwalk's planks on their piles), the cold cove's shingle and boulders
 * under the north-east cliffs, and the coast's three working buildings painted
 * in the house style in place of their flat drawings: the boathouse on the
 * quay, the tarred eel smokehouse and the bird hide.
 *
 * The ground parts join GardenPaintVale (94-garden-paint-vale-0kit.js); the
 * buildings join GardenPaintedMarks' landmark table (94-garden-paint-terrain-2marks.js),
 * which bakes each one once into a sprite standing on its base line. Only
 * rendering: cells, walking, picking and saved rows are untouched. */
(function () {
  'use strict';
  const V = window.GardenPaintVale;

  /* ---------- the ground: salt marsh and the cold cove ---------- */
  function compose(C) {
    const { L, P, kit, W, add } = C, cw = L.cw, ch = L.ch;
    const cell = (x, y) => ({ x: x / cw, y: (y - W.sky) / ch });
    // dressable marsh ground: open grass, never a plot, a building's footprint or a path
    const marshy = (x, y) => { const c = cell(x, y); return L.kind(c.x, c.y) === 'grass' && L.free(c.x, c.y); }, open = (x, y) => { const c = cell(x, y); return marshy(x, y) && !L.plot(c.x, c.y); };

    // 1. The salt marsh round the boardwalk, from the stepping stones to the smokehouse
    const walk = L.routePts('marsh-boardwalk'), lane = L.routePts('estuary-lane');
    if (walk.length > 1) {
      const bb = kit.bboxOf(walk.concat(lane.slice(-3)), 280);
      const spine = lane.slice(-3).concat(walk.slice(1)), heart = V.walk(spine, 24), near = (x, y) => { let d = 1e9; for (const p of heart) d = Math.min(d, Math.hypot(p.x - x, (p.y - y) * 1.3)); return d; };
      const pal = { mud: '#8a7f68', mudLo: '#6d6352', mudHi: '#a99d82', pool: '#7fa6ac', poolHi: '#cfe2e0', rush: '#7e8a4e', rushHi: '#a4ad62', rushLo: '#5c6a3a', samph: '#8fae4a', lav: C.season === 'winter' ? '#9a92a4' : '#a586c0', thrift: '#e8a0b8' };
      add(bb, 61, (B, r, cb) => {
        B.cx.save(); V.clipGround(B, L, cb, true);
        // a darker, damper sward first, fading out from the boardwalk
        kit.tiles(cb, 70, 20, 61, (tx, ty, rr) => { for (let k = 0; k < 6; k++) { const x = tx + rr() * 70, y = ty + rr() * 70; if (!marshy(x, y)) continue; const d = near(x, y); if (d > 270) continue; const a = Math.min(1, (270 - d) / 110);
          B.f(B.blob(rr, x, y, 40 + rr() * 40, 14 + rr() * 12, 10, .4), rr() < .5 ? pal.rushLo : '#6f7c44', (.05 + rr() * .05) * a); } });
        // creeks: winding grey mud runnels with a thread of water, draining toward the river mouth
        const rc = kit.rng(611);
        for (let i = 0; i < spine.length - 1; i++) {
          const a = spine[i], b = spine[i + 1];
          for (let k = 0; k < 4; k++) {
            const t = .1 + rc() * .8, side = rc() < .5 ? -1 : 1, x0 = a.x + (b.x - a.x) * t, y0 = a.y + (b.y - a.y) * t, len = 70 + rc() * 70, ang = Math.atan2(b.y - a.y, b.x - a.x) + side * (1.1 + rc() * .5);
            const pts = []; for (let s = 0; s <= 8; s++) { const u = s / 8, wob = Math.sin(u * 6 + i * 2 + k) * 10; pts.push({ x: x0 + Math.cos(ang) * (26 + len * u) - Math.sin(ang) * wob, y: y0 + Math.sin(ang) * (26 + len * u) * .8 + Math.cos(ang) * wob * .6 }); }
            if (pts.some(p => !open(p.x, p.y))) continue;   // (all of it on the marsh: a creek with two points in the river ran out across the water as a grey ribbon)
            V.strokePts(B, pts, pal.mudLo, 11, .35); V.strokePts(B, pts, pal.mudHi, 10, .3, -1, -1); V.strokePts(B, pts, pal.mud, 8, .75); V.strokePts(B, pts, pal.pool, 3, .9, 0, .6); V.strokePts(B, pts, pal.poolHi, 1, .55, -.6, -.2);
            const end = pts[pts.length - 1]; B.f(B.blob(rc, end.x, end.y, 9 + rc() * 6, 4, 8, .4), pal.mud).f(B.blob(rc, end.x, end.y, 6, 2.4, 8, .4), pal.pool, .9).f(B.ell(end.x - 2, end.y - 1, 3, .7), pal.poolHi, .7);
          }
        }
        // salt pans: shallow still pools in the sward, sky in them
        kit.tiles(cb, 150, 0, 62, (tx, ty, rr) => { for (let k = 0; k < 2; k++) { const x = tx + 20 + rr() * 110, y = ty + 20 + rr() * 110; if (!open(x, y) || !open(x - 18, y) || !open(x + 18, y) || near(x, y) > 250 || near(x, y) < 34) continue;
          // (a soft muddy lip, lit on its sunny side, not a dark ring round a hole)
          B.f(B.blob(rr, x + 1, y + 1.4, 19 + rr() * 8, 6.4 + rr() * 2, 9, .35), pal.mudLo, .4).f(B.blob(rr, x - 3, y - 1.4, 17 + rr() * 6, 5.4, 9, .35), pal.mudHi, .4).f(B.blob(rr, x, y, 15 + rr() * 6, 5, 9, .35), pal.pool).f(B.ell(x - 4, y - 1.4, 6, 1.1), pal.poolHi, .75);
          for (let j = 0; j < 6; j++) { const a = rr() * Math.PI * 2; B.s(`M${x + Math.cos(a) * 19} ${y + Math.sin(a) * 6.5}l${(rr() - .5) * 2} ${-3 - rr() * 3}`, pal.samph, 1.4, .85); } } });
        // samphire, sea lavender and thrift, then rush tussocks and reeds standing in the wet
        kit.tiles(cb, 60, 10, 63, (tx, ty, rr) => { for (let k = 0; k < 12; k++) { const x = tx + rr() * 60, y = ty + rr() * 60; if (!marshy(x, y)) continue; const d = near(x, y); if (d > 270 || rr() * 270 < d - 70) continue; const t = rr();
          if (t < .3) { for (let j = 0; j < 5; j++) B.s(`M${x + (rr() - .5) * 8} ${y}l${(rr() - .5) * 2} ${-3 - rr() * 3}`, pal.samph, 1.6, .9); }
          else if (t < .5) { B.f(B.blob(rr, x, y, 5, 2.2, 6, .4), pal.rushLo, .7); for (let j = 0; j < 6; j++) B.f(B.circ(x + (rr() - .5) * 9, y - 2 - rr() * 4, .9 + rr() * .5), pal.lav, .9); }
          else if (t < .58 && C.season !== 'winter') { B.f(B.blob(rr, x, y, 4, 2, 6, .4), '#6f8a4a').f(B.circ(x, y - 2.6, 1.6), pal.thrift, .95); }
          else if (t < .85) { B.f(B.blob(rr, x + 1, y + 1, 7, 2.4, 7, .5), pal.rushLo, .5); for (let j = 0; j < 7; j++) { const px = x + (rr() - .5) * 10, h = 7 + rr() * 7; B.s(`M${px} ${y}q${(rr() - .5) * 3} ${-h * .6} ${(rr() - .5) * 5} ${-h}`, rr() < .5 ? pal.rush : pal.rushHi, 1.1, .9); } }
          else { for (let j = 0; j < 4; j++) { const px = x + (rr() - .5) * 8, h = 13 + rr() * 9; B.s(`M${px} ${y}l${(rr() - .5) * 3} ${-h}`, C.season === 'winter' ? '#b8a888' : '#a89a5a', 1.2, .9); if (rr() < .6) B.f(B.ell(px + (rr() - .5) * 2, y - h + 2, 1.5, 4), '#6a4a2a', .95); } } } });
        B.cx.restore();
        // (the boardwalk is the shared path kit's, laid by the shared ground: a second one here had a dark round end like a pill)
      });
    }

    // 2. The cold cove: grey shingle and weed-dark boulders where the moor drops to the sea
    const cove = L.routePts('cold-cove'), coast = (L.coast[0] || []).filter(p => { const c = cell(p.x, p.y); return c.x > 74 && c.x < 83 && c.y > -.5 && c.y < 18; });
    if (cove.length > 1 && coast.length > 2) {
      const bb = kit.bboxOf(coast, 120), R = { rock: '#9a958c', rockLo: '#6e6a62', rockHi: '#c8c2b4', rockDk: '#3e3c38', lichen: '#c9c48a' };
      // (standing sprites, not ground: the fells' moor is laid over the vale's ground up here)
      // in clusters with bare shingle between (they stood in an even row along the tide before: art round 3, 19 Nov 2026):
      // a cluster's middle stone is the biggest, the rest smaller round it, a few out in the water
      // (seaward is +d here; the cluster's others lie up the shingle, never on the trail's way down to the water)
      const tEnd = cove[cove.length - 1], tTo = coast.reduce((a, q) => Math.hypot(q.x - tEnd.x, q.y - tEnd.y) < Math.hypot(a.x - tEnd.x, a.y - tEnd.y) ? q : a, coast[0]);
      const onWay = (x, y) => { const vx = tTo.x - tEnd.x, vy = tTo.y - tEnd.y, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - tEnd.x) * vx + (y - tEnd.y) * vy) / l2)); return Math.hypot(x - tEnd.x - vx * t, y - tEnd.y - vy * t) < 40; };
      const rocks = []; for (const q of V.walk(coast, 20)) { const rr = kit.rng(kit.hash(Math.round(q.x), Math.round(q.y), 67)), n = kit.fbm(q.x / 170, q.y / 170, 69); if (n < .5 || rr() < .35) continue; const k = n > .63 ? 3 : n > .55 ? 2 : 1;
        for (let j = 0; j < k; j++) { const d = j === 0 ? -16 + rr() * 30 : -54 + rr() * 58, along = (rr() - .5) * (j === 0 ? 14 : 44), big = j === 0 ? 1 : .4 + rr() * .35, x = q.x + q.ty * d + q.tx * along, y = q.y - q.tx * d + q.ty * along; if (onWay(x, y) || rocks.some(o => Math.hypot(o.x - x, o.y - y) < 18)) continue; rocks.push({ x, y, s: (9 + rr() * 10 + (n - .47) * 70) * big, seed: kit.hash(Math.round(q.x), Math.round(q.y), 68 + j) }); } }
      // the shingle: one flat sprite under everything that stands, grey stones going smaller up the beach
      const ox = Math.round((bb[0] + bb[2]) / 2), oy = Math.round(bb[3]);
      C.thing({ key: 'cold-cove-shingle', depth: -9000, x: ox, y: oy, box: [bb[0] - ox, bb[1] - oy, bb[2] - ox, 0], K: 1, draw: B => {
        B.cx.save(); B.cx.translate(-ox, -oy); B.cx.clip(V.loopPath(L.coast));
        // (inside the map, and the bands end square under the clip, fading at each end: their round ends showed as two pale
        // discs, one at the map's top edge and one at the foot of the scarp: round 3)
        B.cx.beginPath(); B.cx.rect(bb[0] - 200, W.sky, bb[2] - bb[0] + 400, bb[3] - W.sky + 200); B.cx.clip();
        const line = B.line(coast), band = (w, col, op) => B.s(line, col, w, op, 'butt');
        band(46, '#8f8a7e', .45); band(30, '#a8a294', .6); band(10, '#7a756a', .45);
        B.cx.globalCompositeOperation = 'destination-out';
        for (const e of [coast[0], coast[coast.length - 1]]) { const g = B.cx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.45, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); B.cx.fillStyle = g; B.cx.fillRect(e.x - 64, e.y - 64, 128, 128); }
        B.cx.globalCompositeOperation = 'source-over';
        for (const q of V.walk(coast, 4)) { const rr = kit.rng(kit.hash(Math.round(q.x), Math.round(q.y), 66)); for (let k = 0; k < 3; k++) { const d = rr() * 24, x = q.x - q.ty * d + (rr() - .5) * 4, y = q.y + q.tx * d; B.f(B.ell(x, y, 1.6 + rr() * 2.4 * (1 - d / 30), 1 + rr() * 1.2), ['#b8b2a4', '#8c877c', '#d2ccbe', '#6e6a62'][Math.floor(rr() * 4)], .95); } }
        // the trail runs on as a worn way over the shingle to the water's edge
        const end = cove[cove.length - 1], to = coast.reduce((a, q) => Math.hypot(q.x - end.x, q.y - end.y) < Math.hypot(a.x - end.x, a.y - end.y) ? q : a, coast[0]);
        const way = [end, { x: (end.x * 2 + to.x) / 3, y: (end.y * 2 + to.y) / 3 + 3 }, { x: to.x - 8, y: to.y }];
        // (a trodden way of pebbles pressed flat and paler, narrowing and breaking up towards the water; two broad strokes
        // ended in a pale square-ish patch on the shingle: round 3)
        for (const q of V.walk(way, 3)) { const rr = kit.rng(kit.hash(Math.round(q.x), Math.round(q.y), 61)), u = Math.hypot(q.x - end.x, q.y - end.y) / (Math.hypot(to.x - end.x, to.y - end.y) || 1), wdt = 9 * (1 - u * .6);
          for (let k = 0; k < 3; k++) { if (rr() < u * .7) continue; const d = (rr() - .5) * 2 * wdt; B.f(B.ell(q.x - q.ty * d, q.y + q.tx * d, 1.8 + rr() * 1.6, .9 + rr() * .5), rr() < .5 ? '#c4bcac' : '#b4ac9c', .8); } }
        B.cx.restore();
      } });
      // boulders at the tide line, each its own stone: a tall split block, a low round cobble, a tilted slab; granite, slate
      // or a rusty one now and then; weed only on the ones the tide reaches, at their foot. (round 3 fix: one grey boulder
      // with the same moss band and a white foam plate across its foot stood in a necklace along the water)
      const ROCKS = [R, { rock: '#8f8c86', rockLo: '#66645f', rockHi: '#bdb9b0', rockDk: '#3a3936', lichen: '#b8b884' }, { rock: '#a39684', rockLo: '#776b5c', rockHi: '#cdbfa8', rockDk: '#433a30', lichen: '#d0b85e' }];
      rocks.forEach((k, i) => { const rr0 = kit.rng(k.seed ^ 0x5bd1), form = rr0(), kc = cell(k.x, k.y), wet = typeof gardenIslandCoastDistance === 'function' && gardenIslandCoastDistance(kc.x, kc.y) < 22, w =k.s * (form < .3 ? 1.1 : form < .7 ? 1.7 : 2.1), h = k.s * (form < .3 ? 1.25 : form < .7 ? .85 : .55);
        C.thing({ key: 'cold-cove-rock-' + i, x: k.x, y: k.y + 2, box: [-w * .7, -h * 1.35, w * .7, 8], foot: [-w * .55, w * .55, Math.max(6, h * .45)], draw: B => {
          const rr = kit.rng(k.seed), pal = ROCKS[Math.floor(rr0() * 3)];
          if (form < .7) B.boulder(rr, 0, -1, w, h, pal, C.season === 'winter' && rr() < .4); else B.stone(rr, 0, -h * .4, w * .5, h * .55, pal, rr() < .4 ? pal.lichen : null);
          if (wet) { B.f(B.blob(rr, w * .05, -1.5, w * (.25 + rr() * .2), 1.6 + rr() * 1.2, 7, .6), rr() < .5 ? '#3e4e30' : '#56622f', .75); for (let j = 0; j < 3; j++) B.f(B.circ((rr() - .5) * w * .5, -2 - rr() * h * .3, .6), '#dcd8ca', .7); }
        } }); });
    }

    // 3. Where walking stops at the shore, you see why (common rule 15; art round 3, coast fix 1, 20 Nov 2026).
    //  a. Where two regions meet across a beach, a timber groyne runs from the top of the sand out into the tide: posts worn
    //     round by the sea, a plank or two between them sunk in the sand up the beach, weed and foam at their feet in the
    //     water. While the land past it is shut, a rope is strung from post to post along it and on, on driftwood stakes, over
    //     the open ground near the shore wherever no plot fence already stands (the beach east of the lighthouse was closed
    //     with nothing drawn on the sand at all). All from the regions' own outlines, so it follows any new layout.
    //  b. Where the land runs on to the map's own edge beside the sea (the north-east cove), big boulders lie across the
    //     shingle at the edge, so the way north ends at rock you can see, not at the sky.
    const ek = p => p[0] + ',' + p[1], edges = new Map(), coastD = (x, y) => typeof gardenIslandCoastDistance === 'function' ? gardenIslandCoastDistance(x, y) : 0;
    for (const rg of L.D.regions || []) for (const poly of rg.polygons || []) for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], k = [ek(a), ek(b)].sort().join('|'); let e = edges.get(k); if (!e) edges.set(k, e = { a, b, regions: new Set() }); e.regions.add(rg.id); }
    const lines = [];
    for (const e of edges.values()) {
      if (e.regions.size !== 2) continue; const A = L.cpt(e.a[0], e.a[1]), Bq = L.cpt(e.b[0], e.b[1]), len = Math.hypot(Bq.x - A.x, Bq.y - A.y); if (len < 4) continue;
      const tx = (Bq.x - A.x) / len, ty = (Bq.y - A.y) / len, pts = [];
      // (not along a wall, a rock or a crossing: those show the stop themselves)
      const gates = (L.D.gates || []).map(g => ({ x: g.x, y: g.y })), solidNear = (x, y) => [[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6]].some(([dx, dy]) => { const b = L.base(x + dx, y + dy); return !!(b && b.solid); });
      for (let t = 0; t <= len; t += 6) { const x = A.x + tx * t, y = A.y + ty * t, c = cell(x, y); if (c.x < 0 || c.y < 0 || c.x >= W.cols || c.y >= W.rows || solidNear(c.x, c.y) || gates.some(g => Math.hypot(g.x - c.x, g.y - c.y) < 3.5)) { pts.push(null); continue; } pts.push({ x, y, cx: c.x, cy: c.y, tx, ty, k: L.kind(c.x, c.y), d: coastD(c.x, c.y) }); }
      lines.push(pts);
    }
    const groynes = [];
    for (const pts of lines) {
      // the sand where this edge crosses a beach, and up to 48 px of it on into the water at either end
      let run = []; const flush = () => {
        const firstB = run.findIndex(p => p.k === 'beach'), lastB = run.length - 1 - [...run].reverse().findIndex(p => p.k === 'beach');
        if (firstB >= 0 && run.filter(p => p.k === 'beach').length >= 3) { const g = run.slice(Math.max(0, firstB - 8), lastB + 9); if (g.some(p => p.k === 'sea') || Math.min(...g.map(p => p.d)) < 20) groynes.push(g); }
        run = []; };
      for (const p of pts) { if (p && (p.k === 'beach' || p.k === 'sea')) run.push(p); else flush(); }
      flush();
    }
    const WOODG = ['#7a6a52', '#5e5242', '#a2927a', '#3e362c'], GPG = window.GardenPaintGround;
    // where a groyne parts sand from shingle, each drifts a little way over the other (coast fix round 2: the beach changed
    // from sand to shingle along a ruled line where two regions meet)
    const themeOf = id => { const rg = (L.D.regions || []).find(r => r.id === id); return rg ? rg.theme || '' : ''; };
    for (const g of groynes) {
      const bb = kit.bboxOf(g, 90);
      add(bb, 50, (B) => { B.cx.save(); B.cx.clip(V.loopPath(L.coast));
        for (const p of g) { if (p.k !== 'beach') continue; const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 50));
          for (const side of [-1, 1]) { const ox = -p.ty * side, oy = p.tx * side, c = cell(p.x + ox * 30, p.y + oy * 30), b = L.base(c.x, c.y), cold = !!(b && /ruin|mountain/.test(String(themeOf(b.region))));
            for (let k = 0; k < 9; k++) { const d = 3 + Math.pow(rr(), 1.6) * 64, x = p.x + ox * d + p.tx * (rr() - .5) * 8, y = p.y + oy * d + p.ty * (rr() - .5) * 8, fade = 1 - d / 70;
              if (cold) B.f(B.blob(rr, x, y, 6 + rr() * 8, 2 + rr() * 2, 7, .5), P.sand || '#e2cc98', .22 * fade);
              else { const s = 1.4 + rr() * 2; B.f(B.ell(x + .5, y + .6, s, s * .6), '#6e6452', .25 * fade).f(B.ell(x, y, s, s * .62), ['#a89c88', '#8c8474', '#c2b8a4', '#9a9488'][Math.floor(rr() * 4)], .9 * fade); } } } }
        B.cx.restore(); });
    }
    const ROCKS2 = [{ rock: '#9a958c', rockLo: '#6e6a62', rockHi: '#c8c2b4', rockDk: '#3e3c38', lichen: '#c9c48a' }, { rock: '#8f8c86', rockLo: '#66645f', rockHi: '#bdb9b0', rockDk: '#3a3936', lichen: '#b8b884' }, { rock: '#a39684', rockLo: '#776b5c', rockHi: '#cdbfa8', rockDk: '#433a30', lichen: '#d0b85e' }];
    for (const g of groynes) {
      const bb = kit.bboxOf(g, 40);
      add(bb, 51, (B) => {
        const rr = kit.rng(kit.hash(Math.round(g[0].x), Math.round(g[0].y), 51)), posts = [];
        // (coast fix round 2: a post every few strides, stout and each its own height and lean, the planks between them; a post
        // every 3 px read as a zipper or a line of stitches across the beach)
        for (let i = 0; i < g.length; i += 3) { const p = g[i], sea = p.k === 'sea', wet = sea || p.d < 26, h = sea ? 15 + rr() * 7 : wet ? 13 + rr() * 6 : 6 + Math.min(1, 60 / (p.d + 20)) * 7 + rr() * 3;
          posts.push({ x: p.x + (rr() - .5) * 1.6, y: p.y, h, sea, wet, w: 5.4 + rr() * 1.8 }); }
        posts.sort((a, b) => a.y - b.y);
        // the planks between the posts, sunk in the sand up the beach, standing out of it lower down
        const line = g.map(p => ({ x: p.x, y: p.y }));
        B.cx.save(); B.cx.clip(V.loopPath(L.coast)); V.strokePts(B, line, P.sandWet, 12, .3); B.cx.restore();
        for (const [lift, col, a] of [[3, WOODG[1], .92], [7.5, WOODG[0], .9], [12, WOODG[1], .85]]) { const lifted = g.filter(p => lift < 10 || p.k === 'sea' || p.d < 26).map(p => ({ x: p.x, y: p.y - lift * (p.k === 'sea' || p.d < 26 ? 1 : .35) })); if (lifted.length < 2) continue; V.strokePts(B, lifted, col, 4.2, a); V.strokePts(B, lifted, WOODG[2], 1.1, .5, -.4, -1.6); V.strokePts(B, lifted, WOODG[3], .8, .45, 0, 1.8); }
        if (GPG && GPG.castRuns) GPG.castRuns(B.cx, g.slice(1).map((p, i) => [g[i].x, g[i].y, p.x, p.y, p.k === 'sea' || p.d < 26 ? 14 : 6]), { a: .16 });
        for (const q of posts) {
          if (q.sea) B.f(B.ell(q.x + 1, q.y + 1, 4.4, 1.6), '#2e4a48', .25);
          else if (GPG && GPG.contact) GPG.contact(B.cx, q.x, q.y, 3.4, 1.4, .32); else B.shadow(q.x + 1, q.y + 1, 3.4, 1.4, .3);
          B.post(q.x, q.y - q.h, q.y, q.w, [WOODG[0], WOODG[1], WOODG[2]]).f(B.ell(q.x, q.y - q.h, q.w / 2, 1.3), WOODG[2], .9).f(B.ell(q.x - .6, q.y - q.h - .2, q.w / 4, .6), '#d8ccb0', .7);
          if (q.wet) B.f(B.rect(q.x - q.w / 2, q.y - Math.min(q.h, 6), q.w, Math.min(q.h, 6)), '#3e4e30', .75).f(B.circ(q.x + .6, q.y - 2.6, .6), '#dcd8ca', .8);
          if (q.sea) B.s(`M${q.x - 3.4} ${q.y + .6}q3.4 2 6.8 0`, P.foam, 1.1, .6);
        }
      });
    }
    // the rope while the land beyond is shut: drawn when the ground is baked, from what is open then (the ground bakes again
    // when a region opens: the key below)
    const lockedAt = (x, y) => { try { return String(gardenAreaAt(Math.floor(x), Math.floor(y), (gardenModel().level || {}).level || 1)).startsWith('locked:zn-'); } catch (e) { return false; } };
    const plotAt = (x, y) => { const r = typeof gardenLandCell === 'function' ? gardenLandCell(Math.floor(x), Math.floor(y)) : null; return !!(r && r.plot); };
    const roped = lines.map(pts => pts.filter(p => p && p.k !== 'sea' && p.k !== 'water' && p.d < 9 * cw));
    roped.forEach((pts, li) => { if (pts.length < 3) return; const bb = kit.bboxOf(pts, 40);
      add(bb, 52, (B) => {
        // which stretches are a shut edge now: one side closed land, the other open, and no plot fence there already
        const segs = []; let seg = [];
        // (a plot fence stands there already when the cell either side across the edge is a plot)
        for (const p of pts) { const nx = -p.ty, ny = p.tx, ax = p.cx + nx * .8, ay = p.cy + ny * .8 * cw / ch, bx = p.cx - nx * .8, by = p.cy - ny * .8 * cw / ch, a = lockedAt(ax, ay), b = lockedAt(bx, by);
          if (a !== b && !plotAt(p.cx + nx * .45, p.cy + ny * .45 * cw / ch) && !plotAt(p.cx - nx * .45, p.cy - ny * .45 * cw / ch)) seg.push(p); else { if (seg.length > 2) segs.push(seg); seg = []; } }
        if (seg.length > 2) segs.push(seg);
        for (const s of segs) {
          const rr = kit.rng(kit.hash(Math.round(s[0].x), Math.round(s[0].y), 52 + li)), stakes = [];
          for (let i = 0; i < s.length; i += 5) stakes.push(s[i]); if (stakes[stakes.length - 1] !== s[s.length - 1]) stakes.push(s[s.length - 1]);
          const H = gardenSizePx('fence', 1) * 1.25, top = q => ({ x: q.x, y: q.y - H + 4 });
          if (GPG && GPG.castRuns) GPG.castRuns(B.cx, stakes.slice(1).map((q, i) => [stakes[i].x, stakes[i].y, q.x, q.y, H * .6]), { a: .14 });
          for (let i = 1; i < stakes.length; i++) { const a = top(stakes[i - 1]), b = top(stakes[i]), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 5;
            B.s(`M${a.x} ${a.y + 1.4}Q${mx} ${my + 1.4} ${b.x} ${b.y + 1.4}`, '#3a3226', 1.6, .18).s(`M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}`, '#b89a5e', 2.2, .97).s(`M${a.x} ${a.y - .5}Q${mx} ${my - .5} ${b.x} ${b.y - .5}`, '#efe0b4', .6, .6);
            if (i % 3 === 2) { const fx = mx, fy = my - 1; B.s(`M${fx} ${fy}v3`, P.rope, .8, .9).f(B.ell(fx, fy + 5, 2.4, 3), '#c8402e').f(B.rect(fx - 2.4, fy + 4.4, 4.8, 1.2), '#f4efe2').f(B.ell(fx - .8, fy + 3.8, .8, 1), '#fff', .5); } }
          for (const q of stakes) { const lean = (rr() - .5) * 2.4, h = H * (.95 + rr() * .2), col = rr() < .5 ? ['#9c8e78', '#6e6454', '#c8bca4'] : ['#8a7a60', '#5e5242', '#b4a486'];
            if (GPG && GPG.contact) GPG.contact(B.cx, q.x, q.y, 3.6, 1.4, .3); else B.shadow(q.x + 1, q.y + 1, 3.6, 1.4, .3);
            B.f(`M${q.x - 3} ${q.y}L${q.x - 2.3 + lean} ${q.y - h}L${q.x + 2.3 + lean} ${q.y - h - .8}L${q.x + 3} ${q.y}Z`, col[0]).f(`M${q.x - 1.8} ${q.y}L${q.x - 1.4 + lean} ${q.y - h}L${q.x - .4 + lean} ${q.y - h}L${q.x - .6} ${q.y}Z`, col[2], .6).f(`M${q.x + .8} ${q.y}L${q.x + .9 + lean} ${q.y - h}L${q.x + 1.4 + lean} ${q.y - h - .6}L${q.x + 1.8} ${q.y}Z`, col[1], .7);
            B.tufts(rr, q.x, q.y + .5, 6, 3, q.k === 'beach' ? ['#8fa058', '#b4b868'] : ['#5e7e3e', '#8aa858'], 5); }
          // the level the land past it opens at, on a board at the end you come to first (as on every locked plot's fence)
          // (at the top of the sand, where you walk along the beach into it: at the rope's far end it lay under a plot's fence)
          const sandy = s.filter(p => p.k === 'beach' || p.k === 'path'), end = (sandy.length > 2 ? sandy : s).reduce((m, p) => p.d > m.d ? p : m, (sandy.length > 2 ? sandy : s)[0]), sides = [[end.cx + end.ty * .9, end.cy - end.tx * .9 * cw / ch], [end.cx - end.ty * .9, end.cy + end.tx * .9 * cw / ch]], shut = sides.find(([x, y]) => lockedAt(x, y));
          const rgn = shut && typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(shut[0], shut[1]) : null, lvNeed = rgn && rgn.level;
          // (on the shut side of the rope, so it never stands on a path along the shore)
          if (lvNeed) { const sgn = shut === sides[0] ? 1 : -1, sx = end.x + sgn * end.ty * 12, sy = end.y - sgn * end.tx * 12 + 2, txt = 'Lv ' + lvNeed; B.f(B.rect(sx - 1.4, sy - 22, 2.8, 22), '#5e4c36').f(B.rect(sx - 1.4, sy - 22, 1.1, 22), '#8a7454', .7);
            const cx = B.cx; cx.save(); cx.font = '700 9px system-ui, sans-serif'; const w = cx.measureText(txt).width + 8, x0 = sx - w / 2, y0 = sy - 36;
            B.f(B.rr(x0 + 1, y0 + 1.2, w, 14, 2.4), 'rgba(30,24,16,.3)').f(B.rr(x0, y0, w, 14, 2.4), '#c9a876').f(B.rr(x0, y0, w, 4, 1.6), '#dcc092', .8).s(B.rr(x0, y0, w, 14, 2.4), '#6e5434', .9, .9);
            cx.fillStyle = '#3e2c1a'; cx.textBaseline = 'middle'; cx.fillText(txt, x0 + 4, y0 + 7.4); cx.restore(); }
        }
      });
    });
    // b. the map's own edge by the sea: boulders across the land's last row where it is beach or near the shore
    const edgeRocks = [];
    const seaBy = x => { for (let dx = -4; dx <= 4; dx++) for (let dy = 0; dy <= 2; dy++) { const c = L.base(x + dx + .5, dy + .5); if (c && c.ocean) return true; } return false; };   // (the sea itself close by: the island's outline also runs along the map's edge)
    // (coast fix round 2: a tumble of rock, not a row: big and small stones in heaps with gaps, each its own form, size and
    // stone (a split block, a low cobble, a tilted slab); a row of the same faceted boulder ran along the map's top edge)
    for (let x = 0; x < W.cols; x++) { const b = L.base(x + .5, .5); if (!b || !b.land || b.solid || b.freshwater || !seaBy(x)) continue;
      const rr = kit.rng(kit.hash(x, 0, 53)), heap = kit.fbm(x / 3.2, 0, 55), n = heap > .55 ? 3 : heap > .4 ? 2 : 1;
      for (let j = 0; j < n; j++) { const big = j === 0 && heap > .5, s = big ? 20 + rr() * 12 : 7 + rr() * 9, px = (x + (j + rr() * .8) / n) * cw, py = W.sky + (.15 + rr() * .5) * ch + (j ? 5 + rr() * 6 : 0); edgeRocks.push({ x: px, y: py, s, seed: kit.hash(x, j, 54), beach: !!b.beach, form: rr() }); } }
    edgeRocks.forEach((k, i) => C.thing({ key: 'edge-rock-' + i, x: k.x, y: k.y, box: [-k.s * 1.5, -k.s * 1.8, k.s * 1.5, 8], foot: [-k.s * .9, k.s * .9, Math.max(8, k.y - W.sky + 2)], draw: B => {
      const rr = kit.rng(k.seed), pal = ROCKS2[Math.floor(rr() * ROCKS2.length)], w = k.s * (k.form < .3 ? 1.5 : k.form < .7 ? 2.1 : 2.6), h = k.s * (k.form < .3 ? 1.5 : k.form < .7 ? 1 : .6);
      if (k.form < .7) B.boulder(rr, 0, 0, w, h, pal, C.season === 'winter' && rr() < .5); else B.stone(rr, 0, -h * .4, w * .5, h * .55, pal, rr() < .5 ? pal.lichen : null);
      for (let j = 0, m = 2 + Math.floor(rr() * 4); j < m; j++) { const cx = (rr() - .5) * w * 1.3, cs = 2 + rr() * 3.5; B.f(B.ell(cx + .6, 2 + rr() * 3 + .8, cs, cs * .6), '#3a362e', .3).f(B.ell(cx, 2 + rr() * 3, cs, cs * .62), [pal.rock, pal.rockLo, pal.rockHi][Math.floor(rr() * 3)]); }
      if (!k.beach || rr() < .5) { for (let j = 0, m = 1 + Math.floor(rr() * 4); j < m; j++) B.tufts(rr, (rr() - .5) * w, 1, 6, 3, ['#6f7a44', '#8a9452', '#a0a060'], 4 + rr() * 5); if (rr() < .4) B.f(B.blob(rr, w * .35, -1, w * .22, h * .25, 7, .5), '#5e6e3a', .8); }
    } }));
    // 3c. Plots behind the beaches that nobody has bought yet are rough coast, not bare squares: tussocks of marram and
    // rough grass, a gorse or bramble mound, sea campion and thrift, in drifts by noise (coast fix round 2: dozens of empty
    // fenced squares were the main picture of the coast from any far view). Inside the fence, clear of it; gone once the
    // plot is bought (the ground bakes again then).
    const wildAt = (x, y) => { try { return /^locked:(?!zn-)/.test(String(gardenAreaAt(Math.floor(x), Math.floor(y), (gardenModel().level || {}).level || 1))); } catch (e) { return false; } };
    const wildCells = []; for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { if (!L.plot(x + .5, y + .5) || coastD(x + .5, y + .5) > 16 * cw) continue; wildCells.push([x, y]); }
    for (let i = 0; i < wildCells.length; i += 12) { const set = wildCells.slice(i, i + 12), pts = set.map(([x, y]) => L.cpt(x + .5, y + .5)), bb = kit.bboxOf(pts, 60);
      add(bb, 58, (B) => { const wint = C.season === 'winter', aut = C.season === 'autumn';
        for (const [x, y] of set) { if (!wildAt(x + .5, y + .5)) continue; const rr = kit.rng(kit.hash(x, y, 58)), x0 = x * cw, y0 = W.sky + y * ch, n = kit.fbm(x / 3, y / 3, 59), inside = (px, py) => L.plot(px / cw, (py - W.sky) / ch) && L.plot((px - 9) / cw, (py - W.sky) / ch) && L.plot((px + 9) / cw, (py - W.sky) / ch) && L.plot(px / cw, (py - W.sky - 8) / ch) && L.plot(px / cw, (py - W.sky + 7) / ch);
          // (coast fix round 2, second pass: seen from far off the growth was too fine to change the picture) the ground
          // itself rough: straw-coloured old grass and darker green in soft patches, kept inside the fence
          { const cx = x0 + cw / 2, cy = y0 + ch / 2; if (inside(cx, cy)) { B.f(B.blob(rr, cx + (rr() - .5) * 6, cy, 15 + rr() * 4, 8 + rr() * 2, 9, .5), wint ? '#b4ac88' : aut ? '#b0a060' : '#a4a45c', .3).f(B.blob(rr, cx + (rr() - .5) * 10, cy + (rr() - .5) * 4, 9 + rr() * 4, 5 + rr() * 2, 8, .5), wint ? '#8a8a70' : '#55683a', .22); } }
          // rough grass in tussocks over the whole cell
          for (let k = 0; k < 13; k++) { const px = x0 + 4 + rr() * (cw - 8), py = y0 + 6 + rr() * (ch - 8); if (!inside(px, py)) continue; B.f(B.blob(rr, px + 2, py + 1, 8, 2.6, 7, .5), '#4e5e30', .2);
            for (let j = 0, m = 6 + Math.floor(rr() * 6); j < m; j++) { const h = 10 + rr() * 13, bend = (rr() - .3) * 5; B.s(`M${px + (rr() - .5) * 8} ${py}q${bend * .3} ${-h * .6} ${bend} ${-h}`, wint ? ['#a49c78', '#c4b890'][j % 2] : aut ? ['#a4a058', '#c8b870', '#8a8e4c'][j % 3] : ['#7f9a4a', '#a4ac5c', '#6f8a46', '#c0b870'][j % 4], 1 + rr() * .5, .9); } }
          // here and there a gorse or bramble mound with its contact shade, and flowers in the turf
          if (n > .22 && rr() < .85) { const px = x0 + cw * (.3 + rr() * .4), py = y0 + ch * (.55 + rr() * .25), s = 12 + rr() * 8; if (inside(px, py) && inside(px - s * .8, py) && inside(px + s * .8, py) && inside(px, py - s)) { const gorse = rr() < .6;
            B.f(B.ell(px + 3, py + 1, s * 1.2, s * .35), '#2e3420', .22);
            for (let j = 0; j < 9; j++) { const a = Math.PI * (1 + j / 8), bx = px + Math.cos(a) * s * .8, by = py - s * .45 + Math.sin(a) * s * .55; B.f(B.blob(rr, bx, by, s * .5, s * .38, 7, .5), gorse ? (j % 2 ? '#4e6a34' : '#5f7a3a') : (j % 2 ? '#4a5a34' : '#5a6a3e'), .95); }
            B.f(B.blob(rr, px - s * .3, py - s * .9, s * .4, s * .22, 6, .5), gorse ? '#7a9a4a' : '#6e8048', .7);
            if (!wint) for (let j = 0; j < 9; j++) B.f(B.circ(px + (rr() - .5) * s * 1.6, py - s * .3 - rr() * s * .8, gorse ? 1.2 : .9), gorse ? '#f0c830' : (aut ? '#3a2440' : '#f4eef0'), .95); } }
          if (!wint) for (let k = 0, m = 1 + Math.floor(rr() * 5); k < m; k++) { const px = x0 + 6 + rr() * (cw - 12), py = y0 + 8 + rr() * (ch - 10); if (!inside(px, py)) continue; for (let j = 0; j < 4; j++) B.s(`M${px + (rr() - .5) * 5} ${py}l${(rr() - .5) * 2} ${-4 - rr() * 3}`, '#6f8a4a', .8, .9); for (let j = 0; j < 3; j++) B.f(B.circ(px + (rr() - .5) * 6, py - 5 - rr() * 3, 1.3), rr() < .5 ? '#e8a0b8' : '#f4f2ea', .95); } }
      });
    }

    // 4. The lighthouse at night: the lantern lit, its beam turning slowly over the sea, a warm pulse each time it comes
    // round (it stood dark at dusk and night: art director, round 3). Light, not paint: drawn above the night's grade,
    // added, near the camera only, a few draw calls a frame.
    const lhs = L.stat('ld-lighthouse');
    if (lhs && C.live) C.live({ make: (scene) => {
      const BEAM = 'gpv-lh-beam', HALO = 'gpv-lh-halo';
      if (!scene.textures.exists(BEAM)) { const c = document.createElement('canvas'); c.width = 640; c.height = 160; const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 640, 0); g.addColorStop(0, 'rgba(255,244,214,1)'); g.addColorStop(.12, 'rgba(255,238,196,.6)'); g.addColorStop(.55, 'rgba(255,232,186,.2)'); g.addColorStop(1, 'rgba(255,228,180,0)');
        x.filter = 'blur(5px)'; x.fillStyle = g; x.beginPath(); x.moveTo(4, 76); x.lineTo(636, 4); x.lineTo(636, 156); x.lineTo(4, 84); x.closePath(); x.fill(); x.filter = 'none';
        const v = x.createLinearGradient(0, 0, 0, 160); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(.32, 'rgba(0,0,0,.7)'); v.addColorStop(.5, 'rgba(0,0,0,1)'); v.addColorStop(.68, 'rgba(0,0,0,.7)'); v.addColorStop(1, 'rgba(0,0,0,0)');
        x.globalCompositeOperation = 'destination-in'; x.fillStyle = v; x.fillRect(0, 0, 640, 160); scene.textures.addCanvas(BEAM, c); }
      if (!scene.textures.exists(HALO)) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,246,220,1)'); g.addColorStop(.18, 'rgba(255,226,160,.7)'); g.addColorStop(.5, 'rgba(255,200,120,.18)'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); scene.textures.addCanvas(HALO, c); }
      const pivot = scene.add.container(0, 0).setDepth(80006).setVisible(false), beams = [0, Math.PI].map(a => { const im = scene.add.image(0, 0, BEAM).setOrigin(0, .5).setBlendMode(Phaser.BlendModes.ADD); im._a = a; pivot.add(im); return im; });
      const halo = scene.add.image(0, 0, HALO).setDepth(80006).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      let at = null, night = 0, checked = -1e9, ms = 0;
      // where the lantern is: the top of the lighthouse's own picture (its topmost painted row, found once), a little down
      const lantern = () => { const nw = typeof _gw !== 'undefined' && _gw.nativeWorld, rec = nw && nw.entities && nw.entities.get('prop:ld-lighthouse'); if (!rec || !rec.bounds || !rec.handle || !rec.handle.hitPoint) return null;
        const b = rec.bounds; if (at && at.b === b.y + b.x) return at;
        for (let y = b.y; y < b.y + b.height * .4; y += 2) { const xs = []; for (let x = b.x; x < b.x + b.width; x += 3) if (rec.handle.hitPoint(x, y)) xs.push(x); if (xs.length) { const cx = (Math.min(...xs) + Math.max(...xs)) / 2; return at = { b: b.y + b.x, x: cx, y: y + b.height * .1 }; } }
        return null; };
      return { obj: pivot, stat: () => ({ night: +night.toFixed(2), at, ms: +ms.toFixed(2) }), update(time, view) {
        if (time - checked > 1000) { checked = time; try { const lt = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), d = lt && lt.environment ? lt.environment().daylight : 1; night = Math.max(0, Math.min(1, (.42 - (d == null ? 1 : d)) / .3)); } catch (e) { night = 0; } }
        const on = night > .02 && view && !(typeof _gw !== 'undefined' && _gw.room);
        if (!on) { if (pivot.visible) { pivot.setVisible(false); halo.setVisible(false); } return; }
        const t0 = performance.now(), p = lantern(); if (!p) return;
        if (p.x < view.x - 900 || p.x > view.x + view.w + 900 || p.y < view.y - 700 || p.y > view.y + view.h + 700) { if (pivot.visible) { pivot.setVisible(false); halo.setVisible(false); } return; }
        const turn = (time / 16000) * Math.PI * 2 * (typeof gardenMotionOn === 'function' && !gardenMotionOn() ? 0 : 1);
        pivot.setVisible(true).setPosition(p.x, p.y).setScale(1, .5); halo.setVisible(true).setPosition(p.x, p.y);
        // (the lamp is shielded on the landward side, as a harbour light is: the beam is full over the sea, faint over the land)
        let toward = 0; for (const im of beams) { const a = turn + im._a, sea = Math.sin(a), k = sea > 0 ? .45 + .55 * sea : .18 + .27 * (1 + sea); im.setRotation(a).setScale(1.25, 1).setAlpha(.3 * night * k); toward = Math.max(toward, Math.max(0, sea) ** 6); }
        halo.setScale(.42 + toward * .38).setAlpha((.45 + toward * .4) * night);
        ms = performance.now() - t0;
      } };
    } });
  }
  // 5. The coast after dark: the shore buildings' windows and doors lit warm (the boathouse, the smokehouse and the bird
  // hide stood dark beside the lit tackle shop), and the moon's path on the sea, a broken column of light that glitters
  // on the swell below the moon (the sea was one flat grey-blue with nothing on it). Light, not paint: added above the
  // night's grade, near the camera only.
  function night(C) {
    const { L, kit, W } = C; if (!C.live) return;
    const lit = ['ld-boathouse', 'ld-smoke', 'ld-hide'].map(id => L.stat(id)).filter(Boolean);
    C.live({ make: (scene) => {
      const GLOW = 'gpv-coast-glow', SPARK = 'gpv-coast-spark';
      if (!scene.textures.exists(GLOW)) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,140,.95)'); g.addColorStop(.3, 'rgba(255,190,110,.45)'); g.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); scene.textures.addCanvas(GLOW, c); }
      if (!scene.textures.exists(SPARK)) { const c = document.createElement('canvas'); c.width = 32; c.height = 8; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 32, 0); g.addColorStop(0, 'rgba(230,240,255,0)'); g.addColorStop(.5, 'rgba(240,246,255,1)'); g.addColorStop(1, 'rgba(230,240,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(16, 4, 16, 2.2, 0, 0, Math.PI * 2); x.fill(); scene.textures.addCanvas(SPARK, c); }
      const FLAME = 'gpv-coast-flame';
      if (!scene.textures.exists(FLAME)) { const c = document.createElement('canvas'); c.width = 24; c.height = 40; const x = c.getContext('2d'), g = x.createRadialGradient(12, 30, 1, 12, 26, 18); g.addColorStop(0, 'rgba(255,232,160,1)'); g.addColorStop(.3, 'rgba(255,168,64,.95)'); g.addColorStop(.7, 'rgba(226,92,34,.6)'); g.addColorStop(1, 'rgba(200,60,20,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(12, 2); x.quadraticCurveTo(22, 20, 19, 31); x.quadraticCurveTo(12, 40, 5, 31); x.quadraticCurveTo(2, 20, 12, 2); x.fill(); scene.textures.addCanvas(FLAME, c); }
      const root = scene.add.container(0, 0).setDepth(80006).setVisible(false), glows = [], sparks = [], fires = [];
      for (let i = 0; i < 70; i++) { const im = scene.add.image(0, 0, SPARK).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); root.add(im); sparks.push(im); }
      let night = 0, checked = -1e9, placed = false;
      const place = () => { const nw = typeof _gw !== 'undefined' && _gw.nativeWorld; if (!nw || !nw.entities) return false;
        for (const p of lit) { const rec = nw.entities.get('prop:' + p.id); if (!rec || !rec.bounds) continue; const b = rec.bounds, cx = b.x + b.width / 2, foot = b.y + b.height;
          // a window or a lit door low in the front wall, and a soft spill on the ground in front
          for (const [dx, dy, s, a] of [[-.18, -.3, .9, .9], [.22, -.28, .7, .75], [0, .02, 1.6, .35]]) { const im = scene.add.image(cx + dx * b.width, foot + dy * b.height, GLOW).setBlendMode(Phaser.BlendModes.ADD).setScale(s, s * (dy > 0 ? .45 : 1)); im._a = a; root.add(im); glows.push(im); } }
        // the beach fires (where the harbour painter laid them: GardenPaintVale.coastLights): a pool of firelight on the sand
        // and a flame that flickers on its own beat (coast fix round 2: the coves had no light at all after dark)
        for (const f of (V.coastLights || []).filter(o => o.fire)) { const pool = scene.add.image(f.x, f.y - 2, GLOW).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4, 1.5); const halo = scene.add.image(f.x, f.y - 10, GLOW).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2, 1.4);
          const fl = [0, 1, 2].map(k => scene.add.image(f.x + (k - 1) * 4, f.y - 3, FLAME).setOrigin(.5, .9).setBlendMode(Phaser.BlendModes.ADD).setScale(.36 + (k === 1 ? .14 : 0)));
          for (const im of [pool, halo, ...fl]) root.add(im); fires.push({ pool, halo, fl, ph: (f.x * 7 + f.y * 3) % 6.28 }); }
        // the storm lanterns on their stakes beside nets and boats: a small warm glass and a pool on the sand below
        for (const f of (V.coastLights || []).filter(o => !o.fire)) { const pool = scene.add.image(f.x + 4, f.y - 1, GLOW).setBlendMode(Phaser.BlendModes.ADD).setScale(2.6, 1.05), halo = scene.add.image(f.x + 7, f.y - 23, GLOW).setBlendMode(Phaser.BlendModes.ADD).setScale(.75);
          pool._a = .5; halo._a = .85; root.add(pool); root.add(halo); glows.push(pool, halo); }
        return true; };
      return { obj: root, stat: () => ({ night: +night.toFixed(2), glows: glows.length }), update(time, view) {
        if (time - checked > 1000) { checked = time; try { const lt = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), d = lt && lt.environment ? lt.environment().daylight : 1; night = Math.max(0, Math.min(1, (.4 - (d == null ? 1 : d)) / .28)); } catch (e) { night = 0; } }
        const z = scene.cameras && scene.cameras.main ? scene.cameras.main.zoom : 1;
        if (night < .02 || !view || z < 1 || typeof _gw !== 'undefined' && _gw.room) { if (root.visible) root.setVisible(false); return; }
        if (!placed) placed = place(); root.setVisible(true);
        const flick = .92 + Math.sin(time / 310) * .04 + Math.sin(time / 97) * .03;
        for (const g of glows) g.setAlpha(g._a * night * flick);
        for (const f of fires) { const t = time / 1000 + f.ph, k = .85 + Math.sin(t * 7.3) * .08 + Math.sin(t * 13.1) * .05 + Math.sin(t * 2.3) * .04;
          f.pool.setAlpha(.55 * night * k); f.halo.setAlpha(.35 * night * k);
          f.fl.forEach((im, j) => { const s = (.32 + (j === 1 ? .14 : 0)) * (.85 + Math.sin(t * (9 + j * 3.1) + j) * .15); im.setScale(s * (1 + Math.sin(t * 5 + j) * .08), s).setAlpha(Math.max(night, .25) * (.58 + Math.sin(t * 11 + j * 2) * .16)); }); }
        // the moon's path: below the moon (towards the top right of the view), a column of glints on open sea only
        const t = time / 1000, mx = view.x + view.w * .68; let k = 0;
        for (let i = 0; i < sparks.length; i++) { const u = (i * .618 + Math.floor(t / 2.2 + i * .37) * .31) % 1, row = i / sparks.length, y = view.y + view.h * (.08 + row * .9), spread = 18 + row * view.w * .09, x = mx + (u - .5) * 2 * spread + Math.sin(t * .7 + i) * 4;
          const c = { x: x / L.cw, y: (y - W.sky) / L.ch }, b = L.base(c.x, c.y), im = sparks[i];
          if (!b || !b.ocean || typeof gardenIslandCoastDistance === 'function' && gardenIslandCoastDistance(c.x, c.y) < 30) { im.setVisible(false); continue; }
          const tw = Math.max(0, Math.sin(t * 2.1 + i * 1.7)); im.setVisible(true).setPosition(x, y).setScale(.6 + (1 - Math.abs(u - .5) * 2) * .9, 1).setAlpha(night * (.12 + tw * .38) * (1 - Math.abs(u - .5) * 1.4)); k++; }
        void k; void kit;
      } };
    } });
  }
  if (V) { V.parts.push({ id: 'coast', compose }, { id: 'coast-night', compose: night });
    // the ground bakes again when a region opens or shuts (the rope along a shut edge, 3a above)
    V.groundSigs.push(() => { try { return '|zn:' + (gardenModel().areas || []).filter(a => /^zn-/.test(a)).sort().join(','); } catch (e) { return ''; } }); }

  /* ---------- the buildings ---------- */
  const M = window.GardenPaintedMarks; if (!M || !M.ART) return;
  const KIT = () => window.GardenPaintTerrainKit;
  const WOOD = { body: '#8e7656', lo: '#6a5640', hi: '#b89c74', dk: '#3e3428' };
  const tufts = (B, r, x, y, w, n, season) => B.tufts(r, x, y, w, n, season === 'winter' ? ['#8c9a86', '#b4bea8'] : season === 'autumn' ? ['#8a8a44', '#b4a85a'] : ['#5e7e3e', '#8aa858'], 6);
  // horizontal weatherboards over a box, lit from the left: each board a shadowed lap at its foot
  function boards(B, x, y, w, h, col, lo, hi, step) {
    B.f(B.rect(x, y, w, h), B.lin(x, 0, x + w, 0, [[0, hi], [.18, col], [1, lo]]));
    for (let yy = y + step; yy < y + h; yy += step) B.f(B.rect(x, yy - 1.4, w, 1.4), lo, .55).f(B.rect(x, yy, w, .8), hi, .35);
  }
  function lifebuoy(B, x, y) { B.f(B.circ(x, y, 6.6), '#f4efe2').f(B.circ(x, y, 3.2), '#2c2a26', .85); for (const a of [0, 1, 2, 3]) { const t = a * Math.PI / 2 + .4; B.f(`M${x + Math.cos(t) * 3.2} ${y + Math.sin(t) * 3.2}L${x + Math.cos(t) * 6.6} ${y + Math.sin(t) * 6.6}A6.6 6.6 0 0 1 ${x + Math.cos(t + .7) * 6.6} ${y + Math.sin(t + .7) * 6.6}L${x + Math.cos(t + .7) * 3.2} ${y + Math.sin(t + .7) * 3.2}Z`, '#c8402e'); } }

  Object.assign(M.ART, {
    // the boathouse: blue-grey weatherboard, a slate gable, open doors with a bow in the dark, the loft door at the side
    'ld-boathouse': { box: [-74, -100, 72, 12], draw(B, o) {
      const r = KIT().rng(71), slate = ['#5a646a', '#46505a', '#7a868c'];
      B.shadow(6, 2, 70, 9, .34);
      // the body: the front face, then the gable above it
      boards(B, -60, -44, 120, 44, '#6f8a8e', '#56706f', '#93acac', 7.2);
      B.f(B.poly([[-60, -44], [0, -80], [60, -44]]), B.lin(-60, 0, 60, 0, [[0, '#8aa4a4'], [.4, '#6f8a8e'], [1, '#56706f']]));
      for (let y = -50; y > -78; y -= 7.2) { const half = (y + 80) / 36 * 60; B.f(B.rect(-half, y, half * 2, 1.2), '#56706f', .5); }
      // the slate roof's verges, with its slope seen going back
      B.f(B.poly([[-70, -40], [0, -88], [70, -40], [64, -37], [0, -80], [-64, -37]]), slate[1]).f(B.poly([[-70, -40], [0, -88], [0, -80], [-64, -37]]), slate[2], .8);
      B.f(B.poly([[0, -88], [10, -94], [78, -46], [70, -40]]), slate[0]).f(B.poly([[0, -88], [10, -94], [12, -92], [3, -86]]), slate[2], .6);
      for (let k = 1; k < 6; k++) B.s(`M${k * 13} ${-88 + k * 8.4 - 5}l${8} -5`, slate[1], .8, .5);
      // a round window in the gable and corner boards
      B.f(B.circ(0, -58, 7), '#e8e2d2').f(B.circ(0, -58, 5.4), '#2c3a44').f(B.circ(-1.6, -59.6, 1.8), '#a8c4d0', .7).s('M-5.4 -58h10.8M0 -63.4v10.8', '#e8e2d2', 1);
      B.f(B.rect(-60, -44, 4, 44), '#e8e2d2', .85).f(B.rect(56, -44, 4, 44), '#c8c2b2', .85);
      // the big doors standing open: a dark boat-shed inside, the bow of a red boat on its trolley
      B.f(B.rect(-56, -38, 44, 38), '#1e2428').f(B.rect(-56, -38, 44, 10), '#2c343a', .8);
      // (the bow seen head on, on its trolley: a stem, the hull flaring to white gunwales, planks; it was a red half-disc)
      B.f(B.rect(-52, -3.4, 36, 2.6), '#3a3026').f(B.circ(-47, -.6, 2.4), '#22201c').f(B.circ(-21, -.6, 2.4), '#22201c').f(B.circ(-47.6, -1.2, .8), '#6a645c');
      B.f('M-51 -24Q-49 -9 -34 -4Q-19 -9 -17 -24Q-34 -20 -51 -24Z', '#b8442e').f('M-51 -24Q-49 -9 -34 -4L-34 -21Q-43 -21 -51 -24Z', '#d0644a', .55);
      B.f('M-51 -24Q-34 -20 -17 -24Q-34 -27 -51 -24Z', '#3a2018').s('M-51 -24Q-34 -20 -17 -24', '#f4efe2', 1.6, .95);
      B.s('M-49 -17Q-34 -12 -19 -17', '#8a2e20', .8, .7).s('M-46 -10.5Q-34 -7 -22 -10.5', '#8a2e20', .8, .7).s('M-34 -5V-21', '#7a281a', 1.4, .9).f(B.ell(-34, -24.6, 1.6, 1.2), '#c8b07a');
      B.f(B.poly([[-56, -38], [-66, -34], [-66, 2], [-56, 0]]), '#7c9898').f(B.poly([[-12, -38], [-4, -35], [-4, 1], [-12, 0]]), '#56706f');
      B.s('M-61 -30v24M-8 -30v24', '#e8e2d2', 1.4, .8);
      // the loft door at the side (the way in), a lamp over it, a lifebuoy, oars against the wall
      B.f(B.rect(26, -32, 18, 32), '#4a3a2c').f(B.rect(26, -32, 18, 2), '#e8e2d2').f(B.rect(26, -32, 2, 32), '#e8e2d2').f(B.rect(42, -32, 2, 32), '#c8c2b2');
      for (let x = 30; x < 42; x += 4) B.s(`M${x} -30v30`, '#3a2e22', .8, .6);
      B.f(B.circ(40, -15, 1.2), '#d8b24a').s('M35 -38v-4', '#2a2e30', 1.2).f(B.rr(32, -46, 6, 8, 2), '#2a2e30').f(B.rect(33.2, -44.4, 3.6, 4.6), o.night ? '#ffd88a' : '#e8e4c8', .9);
      lifebuoy(B, 8, -24);
      B.s('M50 0L58 -40M54 0L62 -38', WOOD.body, 2.4).f(B.ell(58.6, -41, 2.4, 5), WOOD.hi).f(B.ell(62.6, -39, 2.4, 5), WOOD.body);
      for (let k = 0; k < 4; k++) B.s(B.ell(14, -3, 6 - k * 1.2, 2.6 - k * .5), k % 2 ? '#c9b07a' : '#a88a54', 1.4, .95);
      tufts(B, r, 50, 1, 20, 5, o.season); tufts(B, r, -66, 1, 10, 3, o.season);
    } },

    // the eel smokehouse: a little tarred shed, the louvred smoke hood on its ridge, wicker eel traps and a drying rack
    'ld-smoke': { box: [-70, -100, 72, 12], draw(B, o) {
      const r = KIT().rng(73), tar = '#3c3530', tarLo = '#2a2420', tarHi = '#5a4e44';
      B.shadow(6, 2, 62, 8, .36);
      // the drying rack at the side: two posts, a pole, a few fish split and hung
      for (const x of [44, 66]) B.f(B.rect(x - 1.6, -36, 3.2, 36), WOOD.lo).f(B.rect(x - 1.6, -36, 1, 36), WOOD.hi, .6);
      B.s('M42 -34H68', WOOD.lo, 2.2);
      for (const x of [48, 54, 60]) B.f(`M${x} -33q-3 7 0 14q3 -7 0 -14z`, '#b89a6a').f(`M${x} -33q-1.6 7 0 14`, '#8a6a44', .6);
      // walls: vertical tarred boards, lit on the left, with the grain catching the light
      B.f(B.rect(-46, -40, 92, 40), B.lin(-46, 0, 46, 0, [[0, tarHi], [.25, tar], [1, tarLo]]));
      for (let x = -40; x < 46; x += 7) B.f(B.rect(x, -40, 1.2, 40), tarLo, .8).f(B.rect(x + 1.2, -40, .8, 40), tarHi, .35);
      B.f(B.poly([[-46, -40], [0, -66], [46, -40]]), B.lin(-46, 0, 46, 0, [[0, tarHi], [.4, tar], [1, tarLo]]));
      for (let x = -40; x < 46; x += 7) { const top = -40 - (46 - Math.abs(x)) / 46 * 26; B.f(B.rect(x, top, 1.2, -40 - top), tarLo, .7); }
      // the roof: black felt with a lighter weathered verge, and the louvred hood on the ridge
      B.f(B.poly([[-54, -37], [0, -72], [54, -37], [48, -35], [0, -65], [-48, -35]]), '#24201e').f(B.poly([[-54, -37], [0, -72], [0, -65], [-48, -35]]), '#4a4440', .8);
      B.f(B.poly([[0, -72], [8, -78], [62, -42], [54, -37]]), '#2e2a27');
      B.f(B.rect(-9, -86, 18, 14), tar).f(B.rect(-9, -86, 5, 14), tarHi, .6).f(B.poly([[-13, -85], [0, -93], [13, -85]]), '#24201e');
      for (let y = -83; y < -73; y += 3.2) B.s(`M-7 ${y}h14`, tarLo, 1.4);
      // the door, ajar, iron straps and a latch; a few smoke stains round the hood
      B.f(B.rect(-12, -30, 22, 30), '#1a1614').f(B.poly([[-12, -30], [-4, -31], [-4, 0], [-12, 0]]), '#4a3e36');
      B.s('M-12 -24h22M-12 -8h22', '#6a6460', 1.2, .8).f(B.circ(6, -15, 1.3), '#8a8480');
      B.f(B.blob(r, 0, -88, 14, 4, 7, .5), '#8a8480', .25);
      // eel traps leaning at the other side, and a barrel
      for (const [x, s] of [[-58, 1], [-50, .85]]) { B.f(`M${x - 6 * s} 0Q${x - 7 * s} ${-16 * s} ${x} ${-24 * s}Q${x + 7 * s} ${-16 * s} ${x + 6 * s} 0Z`, '#a8884e'); for (let k = 1; k < 5; k++) B.s(`M${x - 6.4 * s} ${-k * 5 * s}Q${x} ${-k * 5 * s - 2} ${x + 6.4 * s} ${-k * 5 * s}`, '#7a5e34', .9, .8); B.f(B.ell(x, -24 * s, 2.2 * s, 1.2 * s), '#5a4428'); }
      B.f(B.rr(30, -18, 12, 18, 3), '#7a5e40').f(B.rect(30, -14, 12, 1.6), '#2a2e30').f(B.rect(30, -5, 12, 1.6), '#2a2e30').f(B.rect(32, -17, 3, 16), '#a08060', .6).f(B.ell(36, -18, 6, 2), '#5a4430');
      tufts(B, r, -30, 1, 24, 6, o.season); tufts(B, r, 24, 1, 20, 5, o.season);
    } },

    // the bird hide: a weathered hut on short piles over the wet, a long viewing slot with its flap propped, a turf roof
    'ld-hide': { box: [-62, -76, 60, 12], draw(B, o) {
      const r = KIT().rng(79), grey = '#8c826e', greyLo = '#6c6454', greyHi = '#b0a68e', turf = o.season === 'winter' ? ['#8e9684', '#aab2a0'] : o.season === 'autumn' ? ['#7c8040', '#a49a52'] : ['#5f7c3c', '#86a452'];
      B.shadow(4, 2, 52, 7, .32);
      for (const x of [-38, -12, 14, 38]) B.f(B.rect(x - 2, -8, 4, 10), WOOD.dk).f(B.rect(x - 2, -8, 1.2, 10), WOOD.lo, .7);
      boards(B, -44, -44, 88, 36, grey, greyLo, greyHi, 6);
      B.f(B.rect(-44, -44, 3, 36), greyHi, .7);
      // the slot, with its flap propped open on two sticks, and the shelf under it
      B.f(B.rect(-34, -32, 68, 8), '#1e1c18').f(B.rect(-34, -32, 68, 2), '#2e2a24');
      B.f(B.poly([[-36, -33], [36, -33], [40, -40], [-32, -40]]), greyHi).f(B.poly([[-36, -33], [36, -33], [37, -35], [-35, -35]]), greyLo, .7);
      B.s('M-26 -33l2 -6M26 -33l-1 -6', WOOD.dk, 1.2);
      B.f(B.rect(-36, -24, 72, 3), greyLo).f(B.rect(-36, -24, 72, 1), greyHi, .7);
      // the turf roof, sloping back, with grass hanging over its front edge
      B.f(B.poly([[-50, -42], [50, -42], [44, -58], [-44, -58]]), turf[0]).f(B.poly([[-50, -42], [50, -42], [49, -45], [-49, -45]]), WOOD.lo);
      for (let i = 0; i < 26; i++) { const x = -48 + r() * 96, y = -44 - r() * 13; B.s(`M${x} ${y}l${(r() - .5) * 3} ${-3 - r() * 4}`, turf[r() < .5 ? 0 : 1], 1.2, .9); }
      for (let x = -48; x < 48; x += 3) B.s(`M${x} -42q1 3 ${(r() - .5) * 2} ${3 + r() * 4}`, turf[0], 1, .8);
      if (o.season !== 'winter') for (let i = 0; i < 6; i++) B.f(B.circ(-40 + r() * 80, -50 - r() * 6, 1.3), o.season === 'spring' ? '#f4e46a' : '#e8e2d2', .9);
      // a little plaque, and reeds at its feet
      B.f(B.rr(-6, -18, 12, 6, 1), '#e8dcc0').f(B.rect(-4, -16, 8, .8), '#6a5e4a', .7).f(B.rect(-4, -14, 6, .8), '#6a5e4a', .6);
      for (let i = 0; i < 12; i++) { const x = -56 + r() * 112, h = 10 + r() * 12; if (Math.abs(x) < 46 && r() < .6) continue; B.s(`M${x} 2q${(r() - .5) * 3} ${-h * .6} ${(r() - .5) * 4} ${-h}`, o.season === 'winter' ? '#b8a888' : '#9a8e52', 1.2, .9); }
      tufts(B, r, 0, 3, 90, 9, o.season);
    } },
  });
})();

/** The harbour's standing clutter (crates, lobster pots, the drying net, a boat on the sand, the quay bench, the anchor):
 * where each stands, from the layout alone, so the painter (94-garden-paint-vale-1harbour.js) and walking
 * (_gwBuildSolids) agree. The first candidate spot on the wanted ground, clear of every building, wins.
 * {key, x, y, foot: [x0, y0, x1, y1]} in cells; foot is the box the feet cannot enter. */
function gardenIslandHarbourThings(data) {
  const D = data || (typeof gardenIslandData === 'function' ? gardenIslandData() : null); if (!D || !D.static || D.version < 5) return [];
  const memo = gardenIslandHarbourThings._m; if (memo && memo.d === D) return memo.out;
  const taken = new Set(); for (const p of D.static) for (const b of [p, p.apron].filter(Boolean)) for (let y = Math.floor(b.y) - 1; y <= b.y + b.h; y++) for (let x = Math.floor(b.x) - 1; x <= b.x + b.w; x++) taken.add(x + ',' + y);
  const kind = (x, y) => { const b = gardenIslandBaseCell(x, y); if (!b || !b.land) return 'sea'; if (b.freshwater) return 'water'; if (b.route) return 'path'; if (b.beach) return 'beach'; return 'grass'; };
  // (and clear of a wall or rock by a cell and a half: the boat on the sand lay on the end of the old woodland's ruin wall)
  const nearSolid = (x, y) => { for (let dy = -1.5; dy <= 1.5; dy += .75) for (let dx = -1.5; dx <= 1.5; dx += .75) { const b = gardenIslandBaseCell(Math.floor(x + dx), Math.floor(y + dy)); if (b && b.solid) return true; } return false; };
  const spot = (x, y, want) => !taken.has(Math.floor(x) + ',' + Math.floor(y)) && want.includes(kind(x, y)) && !nearSolid(x, y);
  // [key, candidates, wanted ground, half width and depth of the foot in px]
  // (coast fix round 2: each stands on its own ground, a stride clear of the others and of the harbour lamps; the anchor,
  // the pots and the bench were heaped on one another at the quay's west end, with bollards in front of them)
  const rows = [
    ['crates', [[44.3, 76.6], [43.6, 75.4], [57.3, 75.4]], ['path', 'grass', 'beach'], -28, 34, 12],
    ['pots', [[57.6, 75.2]],   /* (not by the pier head: a harbour lamp stood in front of them) */ ['path', 'grass', 'beach'], -24, 26, 9],
    ['net', [[38.6, 80.6], [39.4, 80.2], [37.6, 81.6]], ['beach', 'grass'], -36, 36, 5],
    ['boat-sand', [[38.4, 83.6], [37.4, 84.4], [42.6, 81.2]], ['beach'], -40, 44, 10],
    ['crate1', [[53.2, 76.1], [46.6, 77.9]], ['path', 'beach'], -10, 10, 8],
    ['bench', [[53.4, 78.55], [46.4, 78.45]], ['path', 'beach'], -24, 24, 6],
    ['anchor', [[44.8, 78.45], [56.4, 76.4]], ['path', 'beach', 'grass'], -10, 10, 5],
    ['fishbox', [[48.3, 78.6], [52.9, 77.2]], ['path', 'beach'], -12, 12, 6],
  ];
  const W = GARDEN_WORLD, out = [], gap = .55;
  const lamps = typeof gardenIslandHarbourLamps === 'function' ? gardenIslandHarbourLamps(D).map(q => [q.x - .3, q.y - .5, q.x + .3, q.y]) : [];
  // (coast fix round 2: on the quay or off it, never across its edge: the crates stood half on the lawn and half over the
  // quay's corner. The quay's box is the harbour painter's: the-quay's centre, 6.1 west, 6.3 east, 1.9 north, 1.65 south)
  const qp = ((D.presentation || {}).plazas || []).find(p => p.id === 'the-quay'), qr = qp ? [qp.x - 6.1, qp.y - 1.9, qp.x + 6.3, qp.y + 1.65] : null;
  const across = f => { if (!qr) return false; const m = .3, hit = f[2] + m > qr[0] && f[0] - m < qr[2] && f[3] + m > qr[1] && f[1] - m < qr[3], within = f[0] > qr[0] + m && f[2] < qr[2] - m && f[1] > qr[1] - 1 && f[3] < qr[3] - m; return hit && !within; };
  const clear = f => !across(f) && out.every(o => f[2] + gap < o.foot[0] || f[0] - gap > o.foot[2] || f[3] + gap < o.foot[1] || f[1] - gap > o.foot[3]) && lamps.every(o => f[2] + gap < o[0] || f[0] - gap > o[2] || f[3] + gap < o[1] || f[1] - gap > o[3]);
  for (const [key, cands, want, l, r, d] of rows) { for (const [x, y] of cands) { const foot = [x + l / W.cellW, y - d / W.cellH, x + r / W.cellW, y]; if (spot(x, y, want) && clear(foot)) { out.push({ key, x, y, foot }); break; } } }
  gardenIslandHarbourThings._m = { d: D, out };
  return out;
}
/** The harbour's lamps: an iron lamp post on the copes at each side of the pier head. From the layout alone (the quay
 * plaza and the pier statics), so the painter (94-garden-paint-vale-1harbour.js), walking (each painted lamp's foot) and
 * the night's lights (94-garden-native-world.js) agree. (The lantern at the pier's far end is drawn with the deck, which
 * grows as the pier is built.) {key, x, y, h} in cells at the foot; h is the height of the lantern's glass in world px. */
function gardenIslandHarbourLamps(data) {
  const D = data || (typeof gardenIslandData === 'function' ? gardenIslandData() : null); if (!D || !D.static || D.version < 5) return [];
  const memo = gardenIslandHarbourLamps._m; if (memo && memo.d === D) return memo.out;
  const quay = ((D.presentation || {}).plazas || []).find(p => p.id === 'the-quay'), piers = D.static.filter(p => /^pier/.test(p.id)), out = [];
  if (quay && piers.length) {
    const x0 = Math.min(...piers.map(p => p.x)), x1 = Math.max(...piers.map(p => p.x + p.w));
    const tall = typeof gardenSizePx === 'function' ? gardenSizePx('lamp', .5) : 78;
    out.push({ key: 'quay-w', x: x0 - .7, y: quay.y + 1.5, h: tall - 8 }, { key: 'quay-e', x: x1 + .7, y: quay.y + 1.5, h: tall - 8 });
  }
  gardenIslandHarbourLamps._m = { d: D, out };
  return out;
}
