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
            if (pts.filter(p => open(p.x, p.y)).length < 7) continue;
            V.strokePts(B, pts, pal.mudLo, 11, .55); V.strokePts(B, pts, pal.mud, 8, .9); V.strokePts(B, pts, pal.pool, 3, .9, 0, .6); V.strokePts(B, pts, pal.poolHi, 1, .55, -.6, -.2);
            const end = pts[pts.length - 1]; B.f(B.blob(rc, end.x, end.y, 9 + rc() * 6, 4, 8, .4), pal.mud).f(B.blob(rc, end.x, end.y, 6, 2.4, 8, .4), pal.pool, .9).f(B.ell(end.x - 2, end.y - 1, 3, .7), pal.poolHi, .7);
          }
        }
        // salt pans: shallow still pools in the sward, sky in them
        kit.tiles(cb, 150, 0, 62, (tx, ty, rr) => { for (let k = 0; k < 2; k++) { const x = tx + 20 + rr() * 110, y = ty + 20 + rr() * 110; if (!open(x, y) || !open(x - 18, y) || !open(x + 18, y) || near(x, y) > 250 || near(x, y) < 34) continue;
          B.f(B.blob(rr, x, y + 1, 18 + rr() * 8, 6 + rr() * 2, 9, .35), pal.mudLo, .8).f(B.blob(rr, x, y, 15 + rr() * 6, 5, 9, .35), pal.pool).f(B.ell(x - 4, y - 1.4, 6, 1.1), pal.poolHi, .75); } });
        // samphire, sea lavender and thrift, then rush tussocks and reeds standing in the wet
        kit.tiles(cb, 60, 10, 63, (tx, ty, rr) => { for (let k = 0; k < 12; k++) { const x = tx + rr() * 60, y = ty + rr() * 60; if (!marshy(x, y)) continue; const d = near(x, y); if (d > 270 || rr() * 270 < d - 70) continue; const t = rr();
          if (t < .3) { for (let j = 0; j < 5; j++) B.s(`M${x + (rr() - .5) * 8} ${y}l${(rr() - .5) * 2} ${-3 - rr() * 3}`, pal.samph, 1.6, .9); }
          else if (t < .5) { B.f(B.blob(rr, x, y, 5, 2.2, 6, .4), pal.rushLo, .7); for (let j = 0; j < 6; j++) B.f(B.circ(x + (rr() - .5) * 9, y - 2 - rr() * 4, .9 + rr() * .5), pal.lav, .9); }
          else if (t < .58 && C.season !== 'winter') { B.f(B.blob(rr, x, y, 4, 2, 6, .4), '#6f8a4a').f(B.circ(x, y - 2.6, 1.6), pal.thrift, .95); }
          else if (t < .85) { B.f(B.blob(rr, x + 1, y + 1, 7, 2.4, 7, .5), pal.rushLo, .5); for (let j = 0; j < 7; j++) { const px = x + (rr() - .5) * 10, h = 7 + rr() * 7; B.s(`M${px} ${y}q${(rr() - .5) * 3} ${-h * .6} ${(rr() - .5) * 5} ${-h}`, rr() < .5 ? pal.rush : pal.rushHi, 1.1, .9); } }
          else { for (let j = 0; j < 4; j++) { const px = x + (rr() - .5) * 8, h = 13 + rr() * 9; B.s(`M${px} ${y}l${(rr() - .5) * 3} ${-h}`, C.season === 'winter' ? '#b8a888' : '#a89a5a', 1.2, .9); if (rr() < .6) B.f(B.ell(px + (rr() - .5) * 2, y - h + 2, 1.5, 4), '#6a4a2a', .95); } } } });
        B.cx.restore();
        // the boardwalk itself: planks across two rails on short piles, weathered silver, over the trail's line
        const pts = V.walk(walk, 7);
        for (const q of pts) { const nx = -q.ty, ny = q.tx; for (const s of [-15, 15]) { if (Math.round(q.x / 7) % 6) continue; const px = q.x + nx * s, py = q.y + ny * s * .8; B.f(B.rect(px - 2, py - 1, 4, 7), '#4e4436', .9).f(B.ell(px, py + 6, 4, 1.4), '#3e4a3c', .4); } }
        V.strokePts(B, walk, 'rgba(40,46,32,.22)', 40, 1, 2, 4);
        V.strokePts(B, walk, '#6e604a', 34, 1); V.strokePts(B, walk, '#8f8068', 30, 1);
        for (const q of pts) { const nx = -q.ty * 14, ny = q.tx * 11, tone = kit.rng(kit.hash(Math.round(q.x), Math.round(q.y), 64))();
          B.s(`M${q.x - nx} ${q.y - ny}L${q.x + nx} ${q.y + ny}`, tone < .3 ? '#a49a84' : tone < .7 ? '#b3a88f' : '#c4baa2', 5.2, 1, 'butt');
          B.s(`M${q.x - nx} ${q.y - ny + 2.4}L${q.x + nx} ${q.y + ny + 2.4}`, '#5e5242', .8, .55, 'butt'); }
        V.strokePts(B, walk, '#6e604a', 1.2, .6, 0, 0);
      });
    }

    // 2. The cold cove: grey shingle and weed-dark boulders where the moor drops to the sea
    const cove = L.routePts('cold-cove'), coast = (L.coast[0] || []).filter(p => { const c = cell(p.x, p.y); return c.x > 74 && c.x < 83 && c.y > -.5 && c.y < 18; });
    if (cove.length > 1 && coast.length > 2) {
      const bb = kit.bboxOf(coast, 120), R = { rock: '#9a958c', rockLo: '#6e6a62', rockHi: '#c8c2b4', rockDk: '#3e3c38', lichen: '#c9c48a' };
      // (standing sprites, not ground: the fells' moor is laid over the vale's ground up here)
      const rocks = []; for (const q of V.walk(coast, 20)) { const rr = kit.rng(kit.hash(Math.round(q.x), Math.round(q.y), 67)); if (rr() < .45) continue; const n = rr() < .3 ? 2 : 1; for (let j = 0; j < n; j++) { const d = -8 + rr() * 36, along = (rr() - .5) * 16; rocks.push({ x: q.x + q.ty * d + q.tx * along, y: q.y - q.tx * d + q.ty * along, s: (d > 18 ? 5 : 7) + rr() * (d > 18 ? 9 : 15), seed: kit.hash(Math.round(q.x), Math.round(q.y), 68 + j) }); } }
      // the shingle: one flat sprite under everything that stands, grey stones going smaller up the beach
      const ox = Math.round((bb[0] + bb[2]) / 2), oy = Math.round(bb[3]);
      C.thing({ key: 'cold-cove-shingle', depth: -9000, x: ox, y: oy, box: [bb[0] - ox, bb[1] - oy, bb[2] - ox, 0], K: 1, draw: B => {
        B.cx.save(); B.cx.translate(-ox, -oy); B.cx.clip(V.loopPath(L.coast));
        V.strokePts(B, coast, '#8f8a7e', 46, .45); V.strokePts(B, coast, '#a8a294', 30, .6); V.strokePts(B, coast, '#7a756a', 10, .45);
        for (const q of V.walk(coast, 4)) { const rr = kit.rng(kit.hash(Math.round(q.x), Math.round(q.y), 66)); for (let k = 0; k < 3; k++) { const d = rr() * 24, x = q.x - q.ty * d + (rr() - .5) * 4, y = q.y + q.tx * d; B.f(B.ell(x, y, 1.6 + rr() * 2.4 * (1 - d / 30), 1 + rr() * 1.2), ['#b8b2a4', '#8c877c', '#d2ccbe', '#6e6a62'][Math.floor(rr() * 4)], .95); } }
        // the trail runs on as a worn way over the shingle to the water's edge
        const end = cove[cove.length - 1], to = coast.reduce((a, q) => Math.hypot(q.x - end.x, q.y - end.y) < Math.hypot(a.x - end.x, a.y - end.y) ? q : a, coast[0]);
        const way = [end, { x: (end.x * 2 + to.x) / 3, y: (end.y * 2 + to.y) / 3 + 3 }, { x: to.x - 8, y: to.y }];
        V.strokePts(B, way, P.pathEdge, 18, .35); V.strokePts(B, way, '#b8b0a0', 12, .55);
        B.cx.restore();
      } });
      // boulders at the tide line, half in the water, with weed and a line of foam at their feet
      rocks.forEach((k, i) => C.thing({ key: 'cold-cove-rock-' + i, x: k.x, y: k.y + 2, box: [-k.s * 1.2, -k.s * 1.3, k.s * 1.2, 8], foot: [-k.s * .75, k.s * .75, k.s * .45], draw: B => {
        const rr = kit.rng(k.seed); B.boulder(rr, 0, -2, k.s * 1.6, k.s, R, C.season === 'winter' && rr() < .4); B.f(B.blob(rr, 0, -2, k.s * .9, k.s * .18, 7, .5), '#4f5a36', .7); B.s(`M${-k.s} 1q${k.s} 3 ${k.s * 2} 0`, P.foam, 1.2, .55);
      } }));
    }

  }
  if (V) V.parts.push({ id: 'coast', compose });

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
      B.f('M-52 0Q-50 -14 -34 -16Q-20 -14 -16 0Z', '#b8442e').f('M-50 0Q-48 -10 -34 -12Q-24 -10 -20 0Z', '#d86a4e', .5).f(B.rect(-50, -3, 32, 3), '#f4efe2', .85);
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
  const spot = (x, y, want) => !taken.has(Math.floor(x) + ',' + Math.floor(y)) && want.includes(kind(x, y));
  // [key, candidates, wanted ground, half width and depth of the foot in px]
  const rows = [
    ['crates', [[44.3, 76.6], [43.6, 75.4], [57.3, 75.4]], ['path', 'grass', 'beach'], -28, 34, 12],
    // (village fix round 2: each block as wide as the foot drawn on the ground: the audit found the pots' and the anchor's
    // blocks two to six times their base, and the net's a wall on the sand between its two posts with nothing at its foot)
    ['pots', [[43.2, 77.6], [47.5, 76.7], [57.6, 75.2], [45.3, 78.7]], ['path', 'grass', 'beach'], -11, 11, 7],
    ['net', [[38.6, 80.6], [39.4, 80.2], [37.6, 81.6]], ['beach', 'grass'], -36, 36, 5],
    ['boat-sand', [[38.4, 83.6], [37.4, 84.4], [42.6, 81.2]], ['beach'], -40, 44, 10],
    ['crate1', [[53.2, 76.1], [46.6, 77.9]], ['path', 'beach'], -10, 10, 8],
    ['bench', [[53.4, 78.55], [46.2, 78.6]], ['path', 'beach'], -24, 24, 6],
    ['anchor', [[44.7, 78.7], [56.4, 76.4]], ['path', 'beach', 'grass'], -4, 4, 4],
    ['fishbox', [[48.3, 78.6], [52.9, 77.2]], ['path', 'beach'], -12, 12, 6],
  ];
  const W = GARDEN_WORLD, out = [];
  for (const [key, cands, want, l, r, d] of rows) { const at = cands.find(([x, y]) => spot(x, y, want)); if (at) out.push({ key, x: at[0], y: at[1], foot: [at[0] + l / W.cellW, at[1] - d / W.cellH, at[0] + r / W.cellW, at[1]] }); }
  gardenIslandHarbourThings._m = { d: D, out };
  return out;
}
