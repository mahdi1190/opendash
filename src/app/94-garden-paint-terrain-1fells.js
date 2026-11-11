/* Painted terrain: Cloudbreak, the high ground of Fleetwater Vale, painted as
 * one composed picture with the kit of 94-garden-paint-terrain-0kit.js.
 *
 * The layout drives it (assets/garden/island-v5.json, never edited here):
 *   regions[theme 'mountain']        the fell: grass, heather moor west of the tarn, contour-shaded tops
 *   landforms kind 'mountain'        a peak: a tall occluder sprite on its footprint (snow by season)
 *   landforms kind 'rock-wall'       the Edge: the scarp face, its lip, scree and cast shadow; its gaps
 *                                    become the pass col and the falls cave stair (presentation.falls)
 *   landforms kind 'terrace-wall'    the high orchard's dry-stone terrace walls
 *   freshwater river 'gorge', tarn   the gorge walls cut into the fell, the tarn's stony rim, the ford
 *   routes in the mountain zone      worn fell trails; plazas become stony summit pads
 *   presentation.falls.caveStair     the rock-cut stair and the cave mouth beside the falls
 * Paint is cut by the land, the region and the water, so what is a wall or a
 * drop and what is walkable reads from the picture. Seasons move the snow line
 * (deep winter to the Edge, spring on the tops, autumn a dusting on the peaks,
 * summer only in the gullies); dusk and night come from the scene's own grade.
 * Only rendering: nothing here changes a cell. Nothing runs at load. */
window.GardenPaintedTerrain = (function () {
  'use strict';
  const KIT = () => window.GardenPaintTerrainKit;
  const K = 1.5, CHUNK = 512, DEPTH = -9350;
  let current = null, sprites = [], lastError = null, stats = {};
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };

  const BASE = { rock: '#a49a8c', rockLo: '#7d7468', rockHi: '#c9c1b0', rockDk: '#4e473f', lichen: '#c9c48a', moss: '#7d8f4e', peat: '#5a4636', path: '#c4b089', pathLo: '#9c8a66', pathHi: '#dccfac', snow: '#fbfbf7', snowSh: '#c8d6e6', snowDk: '#a9bccf', pine: '#3c5a3a', pineHi: '#58784a', bark: '#b06a3a', water: '#6d9fb0', shallow: '#93bfbd', foam: '#eef2e2', cave: '#1d2224' };
  const PAL = {
    summer: Object.assign({}, BASE, { fell: '#a6b276', fellLo: '#8c9a5e', fellHi: '#c2c78e', bleach: '#d6cfa8', heather: '#8d6a92', heatherHi: '#b07ab8', heatherLo: '#5f4a62', bloom: '#c48ad0', bracken: '#7f8c48', far: ['#a9b5bd', '#93a3ad', '#7f919c'], farSnow: 0 }),
    spring: Object.assign({}, BASE, { fell: '#a2b672', fellLo: '#86a05a', fellHi: '#bccb88', bleach: '#cfcba0', heather: '#7e6478', heatherHi: '#9a7e92', heatherLo: '#56445a', bloom: null, bracken: '#8a9050', far: ['#adb8c0', '#97a6b0', '#83959f'], farSnow: .45 }),
    autumn: Object.assign({}, BASE, { fell: '#b4a670', fellLo: '#978a58', fellHi: '#cbbd88', bleach: '#dacb9a', heather: '#85605a', heatherHi: '#a27460', heatherLo: '#5a4038', bloom: null, bracken: '#b0672e', far: ['#b1b6b8', '#9ba2a6', '#878f95'], farSnow: .2 }),
    winter: Object.assign({}, BASE, { fell: '#a8a78e', fellLo: '#8e8d76', fellHi: '#c0bfa6', bleach: '#cfcab0', heather: '#7a5a4a', heatherHi: '#8e6e5a', heatherLo: '#54403a', bloom: null, bracken: '#8a5a3a', far: ['#b9c2ca', '#a2aeb8', '#8e9ba6'], farSnow: .85 }),
  };
  const SNOW = { winter: 99, spring: 7.5, autumn: 0, summer: -9 };          // the snow line on the fell, in cell rows (snow north of it)
  const PEAK_SNOW = { winter: .8, spring: .52, autumn: .24, summer: .1 };  // a peak's cap as a share of its height

  function wanted() { return !!(window.GardenNativePainted && GardenNativePainted.wanted() && GardenNativePainted.ready() && KIT() && typeof gardenIslandActive === 'function' && gardenIslandActive()); }

  /* ---------- reading the layout ---------- */
  function readLayout(W) {
    const D = gardenIslandData(), pt = p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }), cpt = (x, y) => ({ x: x * W.cellW, y: W.sky + y * W.cellH });
    const regions = (D.regions || []).filter(r => r.theme === 'mountain');
    if (!regions.length) return null;
    const regionLoops = regions.flatMap(r => r.polygons || []).map(l => l.map(pt));
    const coast = ((D.coast && D.coast.land) || []).map(l => l.map(pt));
    const forms = D.landforms || [], ids = new Set(regions.map(r => r.id));
    const peaks = forms.filter(f => f.kind === 'mountain' && f.polygon).map(f => ({ id: f.id, pts: f.polygon.map(pt) }));
    // the scarp: each rock-wall ribbon is its lip (first half) and its foot (second half, reversed); joined end to end into runs
    const segs = forms.filter(f => f.kind === 'rock-wall' && ids.has(f.region) && f.polygon && f.polygon.length >= 4).map(f => {
      const n = f.polygon.length >> 1, a = f.polygon.slice(0, n), b = f.polygon.slice(n).reverse();
      const north = a.reduce((s, p) => s + p[1], 0) < b.reduce((s, p) => s + p[1], 0), lip = north ? a : b, foot = north ? b : a;
      const pairs = lip.map((p, i) => ({ lip: pt(p), foot: pt(foot[i]) }));
      if (pairs[0].lip.x > pairs[pairs.length - 1].lip.x) pairs.reverse();
      return pairs;
    }).sort((p, q) => p[0].lip.x - q[0].lip.x);
    const runs = [];
    for (const s of segs) { const last = runs[runs.length - 1], end = last && last[last.length - 1]; if (end && Math.hypot(end.lip.x - s[0].lip.x, end.lip.y - s[0].lip.y) < 14) last.push(...s.slice(1)); else runs.push(s.slice()); }
    const terraces = forms.filter(f => f.kind === 'terrace-wall' && f.polygon).map(f => ({ id: f.id, pts: f.polygon.map(pt), cells: f.polygon }));
    const inRegion = (x, y) => { const c = gardenIslandBaseCell(x, y); return !!(c && ids.has(c.region)); };
    const water = (D.freshwater || []).filter(b => b.boundary && inRegion(b.boundary[0][0], b.boundary[0][1]) || b.river === 'gorge').map(b => ({ id: b.id, river: b.river || '', pts: b.boundary.map(pt) }));
    const gorge = D.presentation && D.presentation.rivers && D.presentation.rivers.gorge;
    const zones = new Set(regions.map(r => r.zone));
    const routes = (D.routes || []).filter(r => zones.has(r.zone) && r.points && r.points.length > 1).map(r => ({ id: r.id, tier: r.tier, width: r.widthCells || 1.4, points: gardenIslandRoutePath(r).points.map(p => cpt(p.x, p.y)) }));
    const falls = D.presentation && D.presentation.falls;
    const gates = (D.gates || []).filter(g => g.kind === 'pass' || ids.has(g.district));
    return { D, W, pt, cpt, regions, regionLoops, coast, peaks, runs, terraces, water, gorge, routes, falls, gates, ids, inRegion };
  }
  const loopPath = (loops) => { const p = new Path2D(); for (const l of loops) { if (!l.length) continue; p.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) p.lineTo(l[i].x, l[i].y); p.closePath(); } return p; };

  /* ---------- the composition ---------- */
  function compose(L, season) {
    const kit = KIT(), P = PAL[season] || PAL.summer, W = L.W, cw = W.cellW, ch = W.cellH, ops = [];
    const coastP = loopPath(L.coast), regionP = loopPath(L.regionLoops);
    const clipFell = (B) => { B.cx.clip(coastP, 'evenodd'); B.cx.clip(regionP, 'evenodd'); };
    const rb = kit.bboxOf(L.regionLoops.flat()), worldW = W.cols * cw, top = W.sky - 150;
    const fellBB = [Math.max(-40, rb[0]), Math.max(top, rb[1]), Math.min(worldW + 40, rb[2]), rb[3] + 60];
    const cellOf = (x, y) => gardenIslandBaseCell(x / cw, (y - W.sky) / ch);
    const fellAt = (x, y) => { const c = cellOf(x, y); return !!(c && c.land && L.ids.has(c.region) && !c.freshwater); };
    const moor = x => Math.max(0, Math.min(1, (28 * cw - x) / (7 * cw)));
    const snowRow = SNOW[season];
    const snowAt = (x, y) => { const row = (y - W.sky) / ch; if (snowRow > 90) return 1; if (snowRow < -5) return 0; const edge = snowRow + (kit.fbm(x / 140, y / 90, 41) - .5) * 4.5; return row < edge - .8 ? 1 : row < edge + .8 ? (edge + .8 - row) / 1.6 : 0; };
    const add = (bb, seed, draw, extra) => ops.push(Object.assign({ bb, seed, draw }, extra || {}));

    // 1. The fell: one base with broad lobed drifts; the moor west is heather-dark, the pasture east is short turf.
    add(fellBB, 11, (B, r, cb) => {
      clipFell(B);
      B.f(B.rect(cb[0] - 2, cb[1] - 2, cb[2] - cb[0] + 4, cb[3] - cb[1] + 4), B.lin(0, top, 0, rb[3], [[0, P.fellHi], [.45, P.fell], [1, P.fellLo]]));
      kit.tiles(cb, 150, 90, 3, (tx, ty, r) => {
        for (let k = 0; k < 3; k++) {
          const x = tx + r() * 150, y = ty + r() * 150, m = moor(x), n = kit.fbm(x / 420, y / 300, 5), s = 40 + r() * 70;
          const col = m > .5 && r() < .85 ? (r() < .5 ? P.heather : P.heatherLo) : n > .55 ? P.fellHi : n < .4 ? P.fellLo : r() < .3 ? P.bleach : P.fell;
          B.f(B.blob(r, x, y, s, s * .5, 9, .55), col, m > .5 ? .55 : .3 + r() * .2);
        }
      });
    });
    // 2. The tops: contour-ringed rises, each ring a lit north-west rim and a shaded south-east fall, so height reads from above.
    const tops = [[50, 9.6, 8, 4.6, 6], [43.5, 15, 4.6, 2.6, 4], [31, 3.6, 6.4, 1.9, 3], [60, 15.4, 4, 1.8, 3], [21, 15, 6, 2.6, 3], [9, 16, 5, 2.2, 3], [74, 12.5, 3.6, 2, 3], [36.5, 7.5, 3.2, 1.6, 3]];
    tops.forEach(([x, y, rx, ry, n], hi) => {
      const c = L.cpt(x, y), RX = rx * cw, RY = ry * ch;
      add([c.x - RX - 30, c.y - RY - 40, c.x + RX + 30, c.y + RY + 30], 100 + hi, (B) => {
        clipFell(B);
        for (let k = 0; k < n; k++) {
          const s = 1 - k / (n + .4), rr = kit.rng(900 + hi * 31 + k), cx0 = c.x - k * 5, cy0 = c.y - k * RY * .18, m = moor(cx0);
          const base = m > .5 ? kit.mix(P.heather, P.fellHi, k / n * .5) : kit.mix(P.fell, P.fellHi, k / n);
          const d = B.blob(rr, cx0, cy0, RX * s, RY * s, 11, .32);
          B.cx.save(); B.cx.translate(RX * s * .06 + 3, RY * s * .12 + 3); B.f(d, m > .5 ? P.heatherLo : P.fellLo, .42); B.cx.restore();
          B.f(d, base, .9);
          B.f(B.blob(rr, cx0 - RX * s * .28, cy0 - RY * s * .3, RX * s * .42, RY * s * .26, 8, .4), P.fellHi, .22);
        }
      });
    });
    // 3. The near ground: heather clumps, tussocks, turf, stones, sheep trods, peat hags, cotton grass and bracken, by hashed tiles.
    add(fellBB, 21, (B, r0, cb) => {
      clipFell(B);
      const peakNear = (x, y) => L.peaks.some(pk => { const b = kit.bboxOf(pk.pts); return x > b[0] - 90 && x < b[2] + 90 && y > b[1] - 40 && y < b[3] + 70; });
      kit.tiles(cb, 64, 24, 7, (tx, ty, r) => {
        for (let k = 0; k < 7; k++) {
          const x = tx + r() * 64, y = ty + r() * 64, pick = r(), sz = r(); if (!fellAt(x, y)) continue;
          const m = moor(x), row = (y - W.sky) / ch, tarnNear = Math.hypot(x / cw - 31, row - 11) < 7.5, wet = tarnNear || Math.hypot(x / cw - 73, row - 18) < 4.2;
          if (m > .35 && pick < .55 * m + .1) { B.heather(r, x, y, 5 + sz * 7, P, P.bloom && r() < .7 ? P.bloom : null); continue; }
          if (pick < .5) { B.tufts(r, x, y, 10, 4 + Math.floor(sz * 4), [P.fellLo, P.fellHi, P.bleach], 5); continue; }
          if (pick < .62 && (peakNear(x, y) || row < 11 && x > 44 * cw && x < 56 * cw || r() < .25)) { B.stone(r, x, y, 2 + sz * 4, 1.2 + sz * 2.2, P); continue; }
          if (pick < .7 && wet) { B.f(B.blob(r, x, y, 5 + sz * 4, 2.6 + sz * 2, 7, .5), P.fellLo, .7); B.tufts(r, x, y - 1, 9, 7, ['#6f7f48', P.bleach], 7); if (season !== 'winter' && season !== 'autumn') for (let i = 0; i < 4; i++) B.f(B.circ(x + (r() - .5) * 10, y - 6 - r() * 4, 1.3), '#f6f4ec', .95); continue; }
          if (pick < .78 && x > 46 * cw && m < .2) { const L2 = 16 + sz * 26; B.s(`M${x} ${y}q${L2 / 2} ${-2 - r() * 3} ${L2} ${(r() - .5) * 3}`, P.fellLo, 1.4, .55).s(`M${x} ${y - 1.2}q${L2 / 2} ${-2 - r() * 3} ${L2} ${(r() - .5) * 3}`, P.fellHi, .8, .5); continue; }
          if (pick < .84 && m > .4) { const w = 10 + sz * 14; B.f(B.blob(r, x, y + 2, w, w * .28, 8, .4), P.peat, .8).f(B.blob(r, x - 1, y - 1, w * .95, w * .26, 8, .4), P.heather, .9); continue; }
          if (pick < .9 && (season === 'autumn' || season === 'summer') && (m > .2 || row > 17)) { B.f(B.blob(r, x, y, 6 + sz * 5, 3 + sz * 2.4, 7, .6), P.bracken, .75); B.tufts(r, x, y - 1, 10, 5, [P.bracken, P.fellLo], 6); continue; }
        }
      });
    });
    // 4. The far fells beyond the north edge (backdrop only): three ridges into haze, the near one meeting the fell.
    add([-60, top - 40, Math.min(worldW, 84 * cw), W.sky + 40], 31, (B) => {
      B.cx.clip(coastP, 'evenodd');
      const xs0 = -60, xs1 = Math.min(worldW, 82.5 * cw), foot = W.sky + 4;
      for (let layer = 0; layer < 3; layer++) {
        const rr = kit.rng(700 + layer), base = W.sky - 52 + layer * 20, amp = [92, 66, 40][layer], col = P.far[layer], pts = [];
        for (let x = xs0; x <= xs1 + 1; x += 18) { const n = kit.fbm(x / [520, 380, 260][layer], layer * 7.3, 60 + layer); pts.push({ x, y: base - amp * (.3 + n * .9) }); }
        const end = pts[pts.length - 1]; pts.push({ x: end.x + 70, y: foot }, { x: xs0, y: foot });
        const body = B.poly(pts);
        B.f(body, col);
        // lit west flanks: each crest takes the light on its left and falls into shade on its right
        for (let i = 2; i < pts.length - 3; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1]; if (b.y < a.y && b.y < c.y) { const w = 50 + rr() * 50, d = Math.min(w * 1.1, foot - b.y); B.f(B.poly([b, { x: b.x - w, y: b.y + d }, { x: b.x - w * .15, y: b.y + d }]), kit.mix(col, '#ffffff', .18), .6); B.f(B.poly([b, { x: b.x + w * .1, y: b.y + d }, { x: b.x + w * .8, y: b.y + d * .9 }]), kit.mix(col, '#3a4650', .14), .5); if (P.farSnow && layer < 2) { const sn = P.farSnow * .5; B.f(B.poly([b, { x: b.x - w * sn, y: b.y + d * sn }, { x: b.x - w * sn * .3, y: b.y + d * sn * .7 }, { x: b.x + w * .05, y: b.y + d * sn * .9 }, { x: b.x + w * sn * .6, y: b.y + d * sn * .8 }]), P.snow, .92); } } }
        B.f(body, B.lin(0, base - amp, 0, foot, [[0, 'rgba(232,238,240,0)'], [1, kit.rgba('#dfe6ea', .5 - layer * .14)]]));
      }
      // where the near ridge meets the fell: a soft band of haze
      B.f(B.rect(xs0, W.sky - 26, xs1 - xs0 + 70, 46), B.lin(0, W.sky - 26, 0, W.sky + 20, [[0, kit.rgba('#e4eaec', 0)], [.55, kit.rgba('#e4eaec', .4)], [1, kit.rgba('#e4eaec', 0)]]));
    });
    // 5. Snow above the snow line: a white blanket with a ragged edge, blue shade in the south-east falls, rock and heather through it.
    if (snowRow > -5) add(fellBB, 41, (B, r0, cb) => {
      clipFell(B);
      kit.tiles(cb, 40, 30, 9, (tx, ty, r) => {
        for (let k = 0; k < 3; k++) { const x = tx + r() * 40, y = ty + r() * 40, s = snowAt(x, y); if (s <= 0 || y < W.sky - 4) continue; const R = 18 + r() * 22; B.f(B.blob(r, x, y, R, R * .55, 8, .4), P.snow, s >= 1 ? 1 : s * .9); }
      });
      tops.forEach(([x, y, rx, ry, n], hi) => { const c = L.cpt(x, y); for (let k = 0; k < n; k++) { const s = 1 - k / (n + .4), rr = kit.rng(900 + hi * 31 + k), cx0 = c.x - k * 5, cy0 = c.y - k * ry * ch * .18; if (snowAt(cx0, cy0) <= .2) continue; const d = B.blob(rr, cx0, cy0, rx * cw * s, ry * ch * s, 11, .32); B.cx.save(); B.cx.translate(rx * cw * s * .06 + 3, ry * ch * s * .12 + 3); B.f(d, P.snowSh, .55); B.cx.restore(); B.f(d, P.snow, .85); } });
      kit.tiles(cb, 56, 10, 13, (tx, ty, r) => {
        for (let k = 0; k < 6; k++) { const x = tx + r() * 56, y = ty + r() * 56, s = snowAt(x, y); if (s < .6 || !fellAt(x, y)) continue; const p = r();
          if (p < .35) B.f(B.blob(r, x, y, 8 + r() * 14, 2 + r() * 3, 7, .5), P.snowSh, .55);
          else if (p < .6) { B.f(B.blob(r, x, y, 2 + r() * 3, 1 + r() * 1.5, 6, .5), moor(x) > .4 ? P.heatherLo : P.rockLo, .75); B.f(B.blob(r, x - .6, y - 1, 2, .8, 6, .5), P.snow, .9); }
          else if (p < .7) B.tufts(r, x, y, 8, 4, [P.bleach, P.fellLo], 4); }
      });
    });
    // 6. Water: holes through the paint where the layout has water (the water painter shows through), a stony rim, the gorge's walls.
    add(fellBB, 51, (B) => {
      B.cx.globalCompositeOperation = 'destination-out';
      for (const w of L.water) B.f(B.poly(w.pts), '#000');
      B.cx.globalCompositeOperation = 'source-over';
    });
    for (const w of L.water) if (!w.river) {
      const ring = kit.resample(w.pts.concat([w.pts[0]]), 7);
      add(kit.bboxOf(w.pts, 30), 61 + w.id.length, (B, r) => {
        B.s(B.line(ring), snowRow > 90 ? P.snowSh : '#b4ab94', 9, .9).s(B.line(ring), snowRow > 90 ? P.snow : '#cfc6ae', 4, .9);
        for (let i = 0; i < ring.length; i += 2) { const p = ring[i]; B.stone(r, p.x + (r() - .5) * 8, p.y + (r() - .5) * 5, 2 + r() * 4, 1.4 + r() * 2.2, P, snowRow > 90 ? 'snow' : P.lichen); }
      });
    }
    if (L.gorge && L.gorge.line) gorgeOps(L, P, ops, add, season, snowRow > 90);
    // 7. Trails: worn earth and stone, edges ragged with turf; plazas are stony pads.
    for (const rt of L.routes) {
      const pts = kit.resample(rt.points, 5), bb = kit.bboxOf(pts, 30), plaza = rt.tier === 'plaza', wpx = plaza ? rt.width * ch * .9 : Math.max(16, rt.width * 14);
      add(bb, 71 + rt.id.length * 3, (B, r, cb) => {
        clipFell(B);
        const near = pts.filter(p => p.x > cb[0] - 40 && p.x < cb[2] + 40 && p.y > cb[1] - 40 && p.y < cb[3] + 40); if (!near.length) return;
        const snowy = p => snowAt(p.x, p.y) > .5;
        for (const p of near) B.f(B.ell(p.x + 2, p.y + 3, wpx * .62, wpx * .34), snowy(p) ? P.snowDk : P.fellLo, .1);
        for (const p of near) { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 5)); B.f(B.blob(rr, p.x, p.y, wpx * .6, wpx * .36, 7, .5), snowy(p) ? P.snowSh : P.pathLo, 1); }
        for (const p of near) { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 9)); B.f(B.blob(rr, p.x, p.y - 1, wpx * .48, wpx * .27, 7, .45), snowy(p) ? '#dfe7ee' : P.path, 1); }
        for (const p of near) B.f(B.ell(p.x - 1, p.y - 1.5, wpx * .2, wpx * .1), snowy(p) ? P.snowSh : P.pathHi, .55);
        for (const p of near) { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 13)); if (rr() < .35) B.stone(rr, p.x + (rr() - .5) * wpx * .8, p.y + (rr() - .5) * wpx * .4, 1.2 + rr() * 2.2, .8 + rr() * 1.2, P); if (snowy(p) && rr() < .5) B.f(B.ell(p.x + (rr() - .5) * 5, p.y + (rr() - .5) * 3, 1.3, .8), P.snowDk, .8); }
        if (plaza) for (const p of near) { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 17)); for (let i = 0; i < 5; i++) { const x = p.x + (rr() - .5) * wpx, y = p.y + (rr() - .5) * wpx * .5; B.f(B.blob(rr, x, y, 5 + rr() * 5, 2.4 + rr() * 2, 6, .3), rr() < .5 ? P.rock : P.rockHi, .8); } }
      });
    }
    // 8. The Edge: the scarp face with its beds, buttresses and ledges, the lip, scree at the foot and its shadow on the vale.
    L.runs.forEach((run, ri) => scarpOps(L, P, add, run, ri, season, moor, snowRow > 90));
    // 9. Gaps in the Edge: the falls cave stair (with the cave mouth) and the pass col.
    if (L.falls && L.falls.caveStair) caveStairOps(L, P, add, L.falls.caveStair, season, snowRow > 90);
    for (const g of L.gates) if (g.kind === 'pass') passOps(L, P, add, g, season, snowRow > 90);
    // 10. Sea cliffs where the fell meets the coast: a rock rim with a lit edge.
    add(fellBB, 91, (B, r, cb) => {
      B.cx.clip(regionP, 'evenodd');
      for (const l of L.coast) { const near = l.filter(p => p.x > cb[0] - 40 && p.x < cb[2] + 40 && p.y > cb[1] - 40 && p.y < cb[3] + 40 && p.y > W.sky); if (near.length < 2) continue; const pts = kit.resample(near, 8);
        B.s(B.line(pts.map(p => ({ x: p.x + 3, y: p.y + 7 }))), P.rockDk, 12, .5).s(B.line(pts.map(p => ({ x: p.x + 1, y: p.y + 3 }))), P.rockLo, 9, 1).s(B.line(pts), P.rockHi, 3, .9);
        for (let i = 0; i < pts.length; i += 3) { const p = pts[i]; B.s(`M${p.x} ${p.y + 2}l${(r() - .5) * 2} ${5 + r() * 5}`, P.rockDk, .9, .5); } }
    });
    // 11. The high orchard's terraces: dry-stone walls with their courses, through-stones and cope.
    for (const t of L.terraces) terraceOps(L, P, add, t, season, snowRow > 90);
    return ops;
  }

  /* ---------- the gorge ---------- */
  function gorgeOps(L, P, ops, add, season, snowy) {
    const kit = KIT(), W = L.W, line = L.gorge.line, hw = L.gorge.halfWidth || .85, n = line.length;
    // banks in cell space (the cells are not square), then world px
    const nrm = line.map((p, i) => { const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
    const far = [], farIn = [], near = [], nearIn = [], mid = [];
    line.forEach((p, i) => {
      const [nx, ny] = nrm[i], t = i / (n - 1), s = ny < 0 ? 1 : -1;      // s points the normal to the far (northern, upper) bank
      const depth = .38 + t * .22;
      far.push(L.pt([p[0] + nx * s * (hw + .1), p[1] + ny * s * (hw + .1)])); farIn.push(L.pt([p[0] + nx * s * hw * (1 - depth * 2), p[1] + ny * s * hw * (1 - depth * 2)]));
      near.push(L.pt([p[0] - nx * s * (hw + .05), p[1] - ny * s * (hw + .05)])); nearIn.push(L.pt([p[0] - nx * s * hw * .78, p[1] - ny * s * hw * .78])); mid.push(L.pt(p));
    });
    const bb = kit.bboxOf(far.concat(near), 40);
    // the ford at the stepping stones: the river runs on through the path's gap as shallows, with flat stones across
    const xs = (L.D.presentation.crossings || []).filter(c => c.over === 'gorge');
    for (const c of xs) { const p = L.cpt(c.x, c.y); add([p.x - 60, p.y - 50, p.x + 60, p.y + 50], 131, (B, r) => {
      const i = mid.reduce((bi, q, k) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(mid[bi].x - p.x, mid[bi].y - p.y) ? k : bi, 0), seg = mid.slice(Math.max(0, i - 5), i + 6);
      B.s(B.line(seg), P.rockLo, hw * 2 * W.cellH * .95, .9).s(B.line(seg), P.water, hw * 2 * W.cellH * .8, 1).s(B.line(seg), P.shallow, hw * W.cellH * .9, .7);
      for (let k = 0; k < 4; k++) { const q = mid[Math.max(0, Math.min(mid.length - 1, i))], a = (k - 1.5) * 12; B.f(B.ell(q.x - 8 + a * .9 + 2, q.y - a * .55 + 2, 7, 3.6), P.rockDk, .45).f(B.blob(r, q.x - 8 + a * .9, q.y - a * .55, 7, 3.6, 7, .25), P.rock).f(B.ell(q.x - 10 + a * .9, q.y - a * .55 - 1, 3.5, 1.4), P.rockHi, .8).s(`M${q.x - 14 + a * .9} ${q.y - a * .55 + 2}q6 2 12 0`, P.foam, 1, .7); }
    }); }
    add(bb, 141, (B, r, cb) => {
      // the far wall: a face from the lip down into the water, deeper towards the falls
      const face = B.poly(far.concat(farIn.slice().reverse()));
      B.f(face, B.lin(0, bb[1], 0, bb[3], [[0, P.rockLo], [1, P.rockDk]]));
      B.cx.save(); B.cx.clip(new Path2D(face));
      for (let b = 1; b < 4; b++) { const band = far.map((p, i) => ({ x: p.x + (farIn[i].x - p.x) * b / 4, y: p.y + (farIn[i].y - p.y) * b / 4 })); B.s(B.line(band), P.rockHi, 1.2, .35).s(B.line(band.map(p => ({ x: p.x, y: p.y + 1.6 }))), P.rockDk, 1.6, .35); }
      for (let i = 0; i < far.length; i++) { const a = far[i], b = farIn[i], rr = kit.rng(i * 7 + 3); if (rr() < .55) B.s(`M${a.x + rr() * 6} ${a.y}L${b.x + rr() * 6} ${b.y}`, rr() < .5 ? P.rockDk : P.rockHi, rr() < .5 ? 1 : 2.2, .45); if (rr() < .3) B.s(`M${a.x} ${a.y + 2}L${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + 3}`, '#3a3a34', 2.6, .35); }
      B.cx.restore();
      B.s(B.line(farIn), '#2e3a3c', 3, .45);   // the wet foot of the wall
      B.s(B.line(far), snowy ? P.snow : P.rockHi, 2.2, .95);
      // moss, ferns and heather along the far lip
      for (let i = 0; i < far.length; i += 2) { const p = far[i]; if (r() < .6) B.f(B.blob(r, p.x + (r() - .5) * 6, p.y - 1, 3 + r() * 4, 1.6 + r() * 1.6, 6, .5), snowy ? P.snow : r() < .5 ? P.moss : P.fellLo, .9); if (!snowy && r() < .25) for (let k = 0; k < 4; k++) B.s(`M${p.x} ${p.y + 1}q${(k - 1.5) * 2} 2 ${(k - 1.5) * 4} 6`, '#5f7a3c', 1, .85); }
      // the near lip: a lit rim with a dark undercut into the water and boulders at the edge
      B.s(B.line(nearIn), P.rockDk, 4, .32).s(B.line(near), P.rockLo, 3.6, .95).s(B.line(near.map(p => ({ x: p.x, y: p.y - 1.4 }))), snowy ? P.snow : P.rockHi, 1.8, .9);
      for (let i = 0; i < near.length; i += 3) { const p = near[i]; if (r() < .5) B.stone(r, p.x + (r() - .5) * 6, p.y, 3 + r() * 4, 2 + r() * 2, P, snowy ? 'snow' : P.lichen); }
      // white water: short foam strokes in the channel, more towards the falls
      for (let i = 2; i < mid.length - 1; i++) { const t = i / mid.length, p = mid[i], q = farIn[i]; if (r() < .35 + t * .4) { const x = (p.x + q.x) / 2 + (r() - .5) * 8, y = (p.y + q.y) / 2 + 4 + (r() - .5) * 6; B.s(`M${x} ${y}q4 -1.4 8 0`, P.foam, 1.2, .75); } }
    });
  }

  /* ---------- the Edge ---------- */
  function scarpOps(L, P, add, run, ri, season, moor, snowy) {
    const kit = KIT(), W = L.W, lip = run.map(q => q.lip), foot = run.map(q => q.foot), n = run.length;
    if (n < 2) return;
    // resample lip and foot together
    const pairs = []; for (let i = 1; i < n; i++) { const a = run[i - 1], b = run[i], len = Math.hypot(b.lip.x - a.lip.x, b.lip.y - a.lip.y), k = Math.max(1, Math.ceil(len / 6)); for (let j = 0; j < k; j++) { const t = j / k; pairs.push({ lip: { x: a.lip.x + (b.lip.x - a.lip.x) * t, y: a.lip.y + (b.lip.y - a.lip.y) * t }, foot: { x: a.foot.x + (b.foot.x - a.foot.x) * t, y: a.foot.y + (b.foot.y - a.foot.y) * t } }); } }
    pairs.push(run[n - 1]);
    const L2 = pairs.map(p => p.lip), F2 = pairs.map(p => p.foot), bb = kit.bboxOf(L2.concat(F2), 50); bb[3] += 30;
    const worldW = W.cols * W.cellW, openStart = L2[0].x > 30, openEnd = L2[L2.length - 1].x < worldW - 30;
    const at = (t, i) => ({ x: L2[i].x + (F2[i].x - L2[i].x) * t, y: L2[i].y + (F2[i].y - L2[i].y) * t });
    const seed = 300 + ri * 17;
    // the shadow it throws on the vale (light from the upper left: it falls below and to the right), and the scree
    add(bb, seed, (B, r) => {
      B.cx.filter = 'blur(6px)';
      B.f(B.poly(F2.map(p => ({ x: p.x + 4, y: p.y - 6 })).concat(F2.slice().reverse().map(p => ({ x: p.x + 14, y: p.y + 20 })))), '#28301e', .26);
      B.cx.filter = 'none';
      for (let i = 0; i < F2.length; i += 5) { const rr = kit.rng(seed * 31 + i); if (rr() < .45) continue; const p = F2[i], w = 10 + rr() * 22;
        B.f(B.poly([{ x: p.x - w * .3, y: p.y - 4 }, { x: p.x + w * .4, y: p.y - 4 }, { x: p.x + w * .7, y: p.y + 8 + rr() * 6 }, { x: p.x - w * .6, y: p.y + 7 + rr() * 6 }]), snowy ? P.snowSh : P.rockLo, .7);
        for (let k = 0; k < 6; k++) B.stone(rr, p.x + (rr() - .5) * w * 1.1, p.y + rr() * 10, 1.2 + rr() * 2.4, .8 + rr() * 1.4, P, snowy && rr() < .5 ? 'snow' : null); }
    });
    // the face
    add(bb, seed + 1, (B, r) => {
      const face = B.poly(L2.concat(F2.slice().reverse())), fp = new Path2D(face);
      B.f(face, P.rockLo);
      B.cx.save(); B.cx.clip(fp);
      // beds: blocky gritstone, each block its own tone
      const beds = [0, .2 + r() * .06, .42 + r() * .06, .62 + r() * .06, .82, 1];
      for (let b = 0; b < beds.length - 1; b++) {
        let i = 0;
        while (i < pairs.length - 1) {
          const len = 8 + Math.floor(r() * 18), j = Math.min(pairs.length - 1, i + len), tone = r(), col = tone < .3 ? P.rock : tone < .65 ? kit.mix(P.rock, P.rockLo, .45) : tone < .9 ? P.rockLo : kit.mix(P.rockHi, P.rock, .4);
          const top = [], bot = []; for (let k = i; k <= j; k++) { top.push(at(beds[b] + (b ? (kit.noise(k / 9, b, 3) - .5) * .05 : 0), k)); bot.push(at(beds[b + 1] + (b < beds.length - 2 ? (kit.noise(k / 9, b + 1, 3) - .5) * .05 : 0), k)); }
          B.f(B.poly(top.concat(bot.reverse())), col, .92);
          // the block's lit top edge and a dark seam under it
          B.s(B.line(top), P.rockHi, 1.1, .55);
          if (r() < .5) B.s(`M${top[top.length - 1].x} ${top[top.length - 1].y}L${bot[0].x + (top[top.length - 1].x - top[0].x)} ${bot[0].y}`, P.rockDk, 1, .5);
          i = j;
        }
      }
      // buttresses and recesses: lit columns and shaded clefts, jogging at the beds
      for (let i = 4; i < pairs.length - 4; i += 9 + Math.floor(r() * 14)) {
        const w = 6 + r() * 10, kind = r();
        const col = []; for (let b = 0; b < beds.length; b++) { const p = at(beds[b], Math.min(pairs.length - 1, i + Math.round((r() - .5) * 2))); col.push(p); }
        const left = col.map(p => ({ x: p.x, y: p.y })), right = col.map(p => ({ x: p.x + w, y: p.y }));
        if (kind < .55) { B.f(B.poly(left.concat(right.slice().reverse())), P.rockHi, .32); B.f(B.poly(right.concat(right.slice().reverse().map(p => ({ x: p.x + 3 + r() * 3, y: p.y })))), P.rockDk, .5); }
        else { B.f(B.poly(left.concat(left.slice().reverse().map(p => ({ x: p.x + 3 + r() * 4, y: p.y })))), P.rockDk, .55); }
      }
      // ledges: proud runs with a lit top, a shade beneath, and what grows or lies on them
      for (let b = 1; b < beds.length - 1; b++) for (let i = 0; i < pairs.length - 3; i += 5 + Math.floor(r() * 18)) {
        if (r() < .45) continue;
        const len = 3 + Math.floor(r() * 10), seg = []; for (let k = i; k < Math.min(pairs.length, i + len); k++) seg.push(at(beds[b], k));
        B.s(B.line(seg.map(p => ({ x: p.x, y: p.y + 2.2 }))), P.rockDk, 2.6, .4).s(B.line(seg), snowy ? P.snow : P.rockHi, snowy ? 2.4 : 1.6, .9);
        if (!snowy && r() < .6) { const p = seg[Math.floor(seg.length / 2)]; B.f(B.blob(r, p.x, p.y - 1, 3 + r() * 3, 1.6 + r(), 6, .5), r() < .5 ? P.moss : (moor(p.x) > .4 ? P.heather : P.fellLo), .9); }
        // a drip streak below some ledges
        if (r() < .4) { const p = seg[Math.floor(r() * seg.length)]; B.s(`M${p.x} ${p.y + 2}q${(r() - .5) * 2} ${8} ${(r() - .5) * 3} ${10 + r() * 14}`, '#3c3932', 1.4 + r() * 2.4, .28); }
      }
      // joints and lichen
      for (let i = 0; i < pairs.length; i += 3) { if (r() < .6) continue; const b = Math.floor(r() * (beds.length - 1)), a = at(beds[b], i), c = at(beds[b + 1], i); B.s(`M${a.x} ${a.y + 1}L${c.x + (r() - .5) * 2} ${c.y - 1}`, P.rockDk, .8, .55); if (r() < .3) B.f(B.blob(r, a.x + 2, (a.y + c.y) / 2, 1.6 + r() * 2, 1 + r(), 6, .5), P.lichen, .55); }
      B.cx.restore();
      // the foot: a dark damp line where the rock meets the ground
      B.s(B.line(F2), P.rockDk, 2.4, .55);
    });
    // the lip: the edge of the fell, lit; turf and heather hang over it; snow cornices in deep winter
    add(bb, seed + 2, (B, r) => {
      B.s(B.line(L2.map(p => ({ x: p.x, y: p.y + 1.5 }))), P.rockDk, 2.4, .35);
      for (let i = 0; i < L2.length; i += 1) { const p = L2[i]; if (r() < .35) continue; const m = moor(p.x), col = snowy ? (r() < .6 ? P.snow : P.snowSh) : m > .45 && r() < .7 ? (r() < .5 ? P.heather : P.heatherLo) : r() < .5 ? P.fellLo : P.fell;
        B.f(B.blob(r, p.x + (r() - .5) * 4, p.y + .5 + r() * 1.6, 3 + r() * 4, 1.6 + r() * 2.2, 6, .5), col, .95); }
      B.s(B.line(L2.map(p => ({ x: p.x, y: p.y - 1.6 }))), snowy ? '#ffffff' : P.fellHi, 2.2, .75);
      if (!snowy) for (let i = 0; i < L2.length; i += 2) { const p = L2[i]; if (r() < .5) B.tufts(r, p.x, p.y + 1.5, 6, 3, [P.fellLo, P.bleach], 5); }
      // the ends of a run at a gap: a rounded buttress end, lit when it faces west
      const cap = (i, dir) => { const a = L2[i], b = F2[i], w = 12 * dir; const pts = [a, { x: a.x + w * .6, y: a.y + 3 }, { x: a.x + w, y: (a.y + b.y) / 2 }, { x: b.x + w * .9, y: b.y }, b];
        B.f(B.poly(pts), dir < 0 ? P.rockHi : P.rockDk, dir < 0 ? .85 : .75).f(B.poly([a, { x: a.x + w * .6, y: a.y + 3 }, { x: a.x + w * .4, y: a.y + 6 }, { x: a.x, y: a.y + 4 }]), snowy ? P.snow : P.fell, .95);
        for (let k = 0; k < 3; k++) B.s(`M${a.x + w * (.3 + k * .2)} ${a.y + 6 + k * 4}l${w * .1} ${10}`, P.rockDk, .8, .4); };
      if (openStart) cap(0, -1); if (openEnd) cap(L2.length - 1, 1);
    });
    // pines along the Edge: a few wind-bent Scots pines leaning east, on the rock (occluders, see below)
    const pines = []; for (let i = 10; i < pairs.length - 10; i += 50 + Math.floor(kit.rng(seed * 13 + i)() * 90)) { const rr = kit.rng(seed * 7 + i); if (rr() < .55 || moor(L2[i].x) > .7) continue; pines.push({ x: L2[i].x + (F2[i].x - L2[i].x) * .3, y: L2[i].y + (F2[i].y - L2[i].y) * .55, h: 52 + rr() * 26, seed: seed * 7 + i }); }
    add(bb, seed + 3, () => {}, { decor: true, pines });
  }

  /* ---------- the falls cave stair and the cave mouth ---------- */
  function caveStairOps(L, P, add, at, season, snowy) {
    const kit = KIT(), c = L.cpt(at[0], at[1]), W = L.W, top = c.y - 1.5 * W.cellH, bottom = c.y + .9 * W.cellH, sx = c.x;
    add([sx - 80, top - 30, sx + 90, bottom + 30], 401, (B, r) => {
      // the cut: rock cheeks either side of the stair, the west lit and the east in shade
      B.f(B.poly([{ x: sx - 30, y: top - 4 }, { x: sx - 16, y: top - 2 }, { x: sx - 15, y: bottom }, { x: sx - 34, y: bottom + 4 }]), P.rockHi, .95);
      B.f(B.poly([{ x: sx - 34, y: top + 6 }, { x: sx - 22, y: top + 8 }, { x: sx - 22, y: bottom - 2 }, { x: sx - 36, y: bottom + 2 }]), P.rock, .8);
      B.f(B.poly([{ x: sx + 14, y: top - 2 }, { x: sx + 32, y: top - 6 }, { x: sx + 36, y: bottom + 4 }, { x: sx + 15, y: bottom }]), P.rockLo, 1);
      // the steps: lit treads, shaded risers, a worn hollow in the middle, wet towards the falls
      const steps = 8, sh = (bottom - top) / steps;
      for (let k = 0; k < steps; k++) { const y = top + k * sh, w = 26 + k * .6;
        B.f(B.rect(sx - w / 2, y, w, sh), P.rockLo).f(B.rect(sx - w / 2, y, w, sh * .55), snowy ? P.snow : P.rockHi).f(B.ell(sx - 1, y + sh * .3, w * .22, sh * .2), snowy ? P.snowSh : P.pathHi, .7)
          .s(`M${sx - w / 2} ${y + sh * .55}h${w}`, P.rockDk, 1, .6).f(B.rect(sx + w / 2 - 6, y, 6, sh), '#3f4a48', .35); }
      // the cave mouth in the east cheek, beside the falls: a dark arch with green light from behind the water
      const mx = sx + 26, my = bottom - 2, mw = 26, mh = 30;
      B.f(B.blob(r, mx + 2, my - mh * .45, mw * .72, mh * .62, 9, .22), P.rockDk, .8);
      B.f(`M${mx - mw / 2} ${my}Q${mx - mw / 2} ${my - mh} ${mx} ${my - mh}Q${mx + mw / 2} ${my - mh} ${mx + mw / 2} ${my}Z`, B.rad(mx, my - mh * .35, mh * .8, [[0, '#2f4a44'], [.45, '#1f2a2a'], [1, P.cave]]));
      B.f(`M${mx - mw * .3} ${my}Q${mx - mw * .2} ${my - mh * .6} ${mx + mw * .1} ${my - mh * .62}Q${mx + mw * .3} ${my - mh * .5} ${mx + mw * .32} ${my}Z`, 'rgba(120,180,160,.18)');
      B.s(`M${mx - mw / 2 - 1} ${my}Q${mx - mw / 2 - 1} ${my - mh - 2} ${mx} ${my - mh - 2}`, P.rockHi, 2.4, .85);
      // drips, ferns at the rim and wet stones at the threshold
      if (!snowy) for (let k = 0; k < 6; k++) { const x = mx - mw / 2 + r() * mw * .6, y = my - mh * (.6 + r() * .35); for (let j = 0; j < 4; j++) B.s(`M${x} ${y}q${(j - 1.5) * 2} -2 ${(j - 1.5) * 5} -7`, '#5f7a3c', 1, .9); }
      else for (let k = 0; k < 7; k++) { const x = mx - mw / 2 + 3 + k * 3.4; B.f(`M${x - 1.2} ${my - mh * .86 + Math.abs(k - 3)}l1.2 ${6 + r() * 6}l1.2 ${-6 - r() * 6}z`, '#e6f3f8', .9); }
      for (let k = 0; k < 5; k++) B.stone(r, mx - mw / 2 + r() * mw, my + 2 + r() * 4, 2 + r() * 3, 1.2 + r() * 1.6, Object.assign({}, P, { rock: '#7f8a86', rockHi: '#a8b4b0' }));
    });
  }

  /* ---------- the pass col ---------- */
  function passOps(L, P, add, g, season, snowy) {
    const kit = KIT(), c = L.cpt(g.x + .5, g.y + .9);
    add([c.x - 90, c.y - 60, c.x + 90, c.y + 50], 451, (B, r) => {
      // a low rock step across the trail, with an iron ring leaded into it
      B.f(B.blob(r, c.x + 2, c.y + 3, 46, 7, 9, .3), P.rockDk, .45).f(B.blob(r, c.x, c.y, 44, 6, 9, .3), P.rockLo).f(B.blob(r, c.x - 4, c.y - 2.5, 38, 3.6, 9, .3), snowy ? P.snow : P.rockHi, .9);
      B.s(B.circ(c.x + 14, c.y + 1, 2.6), '#2c2a26', 1.2, .9).f(B.circ(c.x + 14, c.y - 1.6, .9), '#2c2a26', .9);
      // wind-flattened grass streaks across the col
      if (!snowy) for (let k = 0; k < 26; k++) { const x = c.x + (r() - .5) * 150, y = c.y - 40 + r() * 70; B.s(`M${x} ${y}q8 -1.5 16 0`, r() < .5 ? P.bleach : P.fellHi, 1.2, .55); }
      // a marker cairn beside the way
      let y = c.y - 14; const x = c.x - 34;
      B.shadow(x + 3, y + 1, 10, 3, .3);
      for (const [w, h] of [[8, 3.6], [6.4, 3.2], [5, 2.8], [3.6, 2.4]]) { B.stone(r, x + (r() - .5) * 1.6, y, w, h, P, snowy ? 'snow' : P.lichen); y -= h * 1.4; }
    });
  }

  /* ---------- the high orchard's terraces ---------- */
  function terraceOps(L, P, add, t, season, snowy) {
    const kit = KIT(), W = L.W, n = t.cells.length >> 1;
    const a = t.cells.slice(0, n), b = t.cells.slice(n).reverse();
    const north = a.reduce((s, p) => s + p[1], 0) <= b.reduce((s, p) => s + p[1], 0), upper = (north ? a : b).map(L.pt), lower = (north ? b : a).map(L.pt);
    const bb = kit.bboxOf(upper.concat(lower), 30), along = Math.abs(upper[upper.length - 1].x - upper[0].x) > Math.abs(upper[upper.length - 1].y - upper[0].y);
    add(bb, 500 + t.id.length * 7, (B, r) => {
      const face = B.poly(upper.concat(lower.slice().reverse()));
      B.cx.filter = 'blur(4px)'; B.f(B.poly(lower.map(p => ({ x: p.x + 3, y: p.y - 3 })).concat(lower.slice().reverse().map(p => ({ x: p.x + 9, y: p.y + 12 })))), '#2e3420', .22); B.cx.filter = 'none';
      B.f(face, '#8a8270');
      B.cx.save(); B.cx.clip(new Path2D(face));
      // courses of irregular stones, a through-stone now and then
      const U = kit.resample(upper, 5), Lw = kit.resample(lower, 5), m = Math.min(U.length, Lw.length), rows = along ? 4 : 2;
      for (let row = 0; row < rows; row++) for (let i = 0; i < m; i += 1 + Math.floor(r() * 2)) {
        const t0 = (row + .5) / rows, p = { x: U[i].x + (Lw[i].x - U[i].x) * t0, y: U[i].y + (Lw[i].y - U[i].y) * t0 }, hgt = Math.abs(Lw[i].y - U[i].y) / rows, w = 4 + r() * 5;
        const tone = r(); B.f(B.blob(r, p.x + (row & 1) * 2, p.y, w, Math.max(1.6, hgt * .42), 6, .3), tone < .3 ? '#b8b09a' : tone < .7 ? '#a39b85' : '#c9c2ac', .95).f(B.ell(p.x - w * .3, p.y - hgt * .18, w * .4, Math.max(.6, hgt * .12)), '#ddd6c2', .6);
        if (r() < .04) B.f(B.rect(p.x - 2, p.y - hgt * .5, 7, hgt * .4), '#d6cfb8', .9);
      }
      B.cx.restore();
      // cope: a row of upright stones on top, lit from the left; moss and turf from the terrace above
      const top = kit.resample(upper, 3.4);
      for (const p of top) { const h = 3 + r() * 2.4; B.f(B.rect(p.x - 1.4, p.y - h, 2.8, h + 1), '#9c937e').f(B.rect(p.x - 1.4, p.y - h, 1, h + 1), '#d6cfb8', .8); }
      for (let i = 0; i < top.length; i += 2) { const p = top[i]; if (r() < .4) B.f(B.blob(r, p.x, p.y - 3, 3 + r() * 3, 1.2 + r(), 6, .5), snowy ? P.snow : r() < .5 ? P.moss : '#8fa860', .9); }
      if (snowy) B.s(B.line(top.map(p => ({ x: p.x, y: p.y - 4.5 }))), P.snow, 2.6, .9);
      B.s(B.line(kit.resample(lower, 6)), '#4a463a', 1.8, .45);
    });
  }

  /* ---------- occluders: the peaks and the Edge's pines ---------- */
  function peakArt(B, w, d, H, snowShare, P, seed, sharp) {
    const kit = KIT(), r = kit.rng(seed), sx = (sharp ? -.08 : .06) * w, prof = [];
    for (let i = 0; i <= 28; i++) { const x = -w / 2 + w * i / 28, u = Math.abs(x - sx) / (x < sx ? w / 2 + sx : w / 2 - sx), shape = Math.pow(Math.max(0, 1 - u), sharp ? 1.15 : .8), wob = (kit.noise(i / 3.2, seed, 2) - .5) * .12 + (sharp ? 0 : (i > 17 && i < 22 ? .08 : 0)); prof.push({ x, y: -Math.max(d * .34, H * Math.max(0, shape + wob * shape)) }); }
    const base = [{ x: w / 2, y: -d * .3 }, { x: w * .34, y: -2 }, { x: w * .12, y: 2 }, { x: -w * .16, y: 1 }, { x: -w * .38, y: -3 }, { x: -w / 2, y: -d * .34 }];
    const sil = prof.concat(base), top = prof.reduce((m, p) => p.y < m.y ? p : m, prof[0]);
    B.shadow(w * .14, 2, w * .58, 12, .32);
    B.f(B.poly(sil), P.rockLo);
    // the lit west face: from the summit down a spur that comes towards you
    const spur = [top, { x: top.x + w * .07, y: top.y + H * .3 }, { x: top.x + w * .03, y: top.y + H * .62 }, { x: top.x + w * .1, y: -6 }];
    const litPts = prof.filter(p => p.x <= top.x).concat(spur.slice(1)).concat([{ x: -w * .16, y: 1 }, { x: -w * .38, y: -3 }, { x: -w / 2, y: -d * .34 }]);
    B.f(B.poly(litPts), P.rock);
    B.f(B.poly(prof.filter(p => p.x <= top.x && p.x > top.x - w * .22).concat([{ x: top.x - w * .02, y: top.y + H * .3 }])), P.rockHi, .55);
    B.cx.save(); B.cx.clip(new Path2D(B.poly(sil)));
    // bedding: faint tilted strata across both faces
    for (let k = 0; k < 9; k++) { const y0 = top.y + H * (.12 + k * .1); B.s(`M${-w / 2} ${y0 + 30}L${w / 2} ${y0 - 40}`, k % 2 ? P.rockHi : P.rockDk, 1.4, .14); }
    // gullies: dark clefts down both faces, with snow in their heads
    for (let k = 0; k < 7; k++) { const side = k % 2 ? 1 : -1, x0 = top.x + side * (w * .06 + r() * w * .26), y0 = top.y + H * (.12 + r() * .22), len = H * (.35 + r() * .3), dx = side * (r() * 18);
      B.f(`M${x0 - 3} ${y0}Q${x0 + dx * .5 - 5} ${y0 + len * .5} ${x0 + dx - 9} ${y0 + len}L${x0 + dx + 9} ${y0 + len}Q${x0 + dx * .5 + 4} ${y0 + len * .5} ${x0 + 3} ${y0}Z`, P.rockDk, side < 0 ? .4 : .55);
      if (snowShare > .05) B.f(`M${x0 - 2} ${y0}Q${x0 + dx * .3 - 2} ${y0 + len * .3} ${x0 + dx * .4 - 3} ${y0 + len * Math.min(.9, snowShare * 1.4)}L${x0 + dx * .4 + 2} ${y0 + len * Math.min(.9, snowShare * 1.4)}Q${x0 + dx * .3 + 2} ${y0 + len * .3} ${x0 + 2} ${y0}Z`, P.snow, .9); }
    // crag bands: broken steps with lit tops
    for (let k = 0; k < 3; k++) { const yb = top.y + H * (.42 + k * .14), x0 = -w * .35 + r() * w * .2, len = w * (.25 + r() * .3); B.f(B.rect(x0, yb, len, 6 + r() * 5), P.rockDk, .35); B.s(`M${x0} ${yb}h${len}`, P.rockHi, 1.4, .5); }
    // the snow cap, ragged and lower down the gullies; blue on the shaded face
    if (snowShare > 0) {
      const sl = top.y + H * snowShare, cap = prof.filter(p => p.y < sl).map(p => ({ x: p.x, y: p.y - 2 }));
      if (cap.length > 1) { const edge = []; for (let x = cap[cap.length - 1].x; x >= cap[0].x; x -= 10) { const rr = kit.noise(x / 22, seed, 9); edge.push({ x, y: sl - (rr - .3) * H * .12 - Math.abs(x - top.x) / w * H * .25 }); }
        const cp = B.poly(cap.concat(edge)); B.f(cp, P.snowSh); B.cx.save(); B.cx.clip(new Path2D(B.poly(litPts))); B.f(cp, P.snow); B.cx.restore(); }
    }
    // scree fans at the foot and the skirt of fell where the mountain meets the ground
    for (let k = 0; k < 6; k++) { const x = -w * .4 + k * w * .16 + r() * 20, y = -d * .2 - r() * 10, fw = 24 + r() * 30; B.f(B.poly([{ x: x - 4, y: y - 40 - r() * 30 }, { x: x + 4, y: y - 40 }, { x: x + fw * .6, y }, { x: x - fw * .6, y }]), snowShare > .7 ? P.snowSh : P.rockHi, .45); }
    B.cx.restore();
    const skirt = []; for (let x = -w / 2; x <= w / 2; x += 8) skirt.push({ x, y: -d * .28 - kit.noise(x / 30, seed, 4) * 22 - (1 - Math.abs(x) / (w / 2)) * 10 });
    const skirtP = B.poly(skirt.concat(base.slice().reverse().map(p => ({ x: p.x, y: p.y + 2 })).reverse()));
    B.f(skirtP, snowShare > .7 ? P.snow : P.fell, .96);
    for (let k = 0; k < 40; k++) { const x = (r() - .5) * w * .9, y = -r() * d * .3; if (snowShare > .7) B.f(B.blob(r, x, y, 4 + r() * 6, 1.6 + r() * 2, 6, .5), P.snowSh, .6); else B.heather(r, x, y, 3 + r() * 4, P, P.bloom && r() < .4 ? P.bloom : null); }
  }
  function pineArt(B, h, P, seed, snowy) {
    const kit = KIT(), r = kit.rng(seed), lean = 6 + r() * 8;
    B.shadow(8, 1, 16, 4, .3);
    B.s(`M0 0Q${-2} ${-h * .4} ${lean} ${-h * .78}`, P.bark, 3.4).s(`M-1 0Q${-3} ${-h * .4} ${lean - 1} ${-h * .78}`, '#d08a52', 1.2, .8);
    for (let k = 0; k < 4; k++) { const y = -h * (.55 + k * .14), x = lean * (.6 + k * .15) + (r() - .3) * 10, rx = 16 - k * 2.6 + r() * 5, ry = 4.6 + r() * 2;
      B.s(`M${lean * .7} ${y + 6}L${x} ${y + 1}`, P.bark, 1.4, .9);
      B.f(B.blob(r, x + 2, y + 2, rx, ry, 8, .45), '#2a4030').f(B.blob(r, x, y, rx * .92, ry * .85, 8, .45), P.pine).f(B.blob(r, x - rx * .25, y - ry * .3, rx * .55, ry * .4, 7, .45), snowy ? P.snow : P.pineHi, .9); }
  }

  /* ---------- the handle the world uses ---------- */
  function build(scene, parent, sc) {
    const t0 = performance.now(), kit = KIT(); if (!kit || !wanted()) return null;
    const W = GARDEN_WORLD, L = readLayout(W); if (!L) return null;
    const season = sc.season || 'summer', sig = 'gpt-1|' + season + '|' + (GardenIslandLayout.fingerprint || '') ;
    const old = current; if (old) { old.handle.destroy(old.sig === sig); for (const s of sprites) s.destroy(); sprites = []; if (old.sig !== sig) for (const k of old.spriteKeys) if (scene.textures.exists(k)) scene.textures.remove(k); }
    const ops = ok(() => compose(L, season)); if (!ops) return null;
    const rb = kit.bboxOf(L.regionLoops.flat().concat(L.terraces.flatMap(t => t.pts)));
    const box = { x: 0, y: W.sky - 150, w: W.cols * W.cellW, h: Math.min(W.sky + W.rows * W.cellH, rb[3] + 80) - (W.sky - 150) };
    const handle = kit.chunked(scene, parent, ops, { key: sig, box, K, chunk: CHUNK, depth: DEPTH });
    // occluders
    const P = PAL[season] || PAL.summer, keys = [], snowy = SNOW[season] > 90; let spritePx = 0;
    for (const pk of L.peaks) {
      const b = kit.bboxOf(pk.pts), w = b[2] - b[0], d = b[3] - b[1], sharp = /east/.test(pk.id), H = sharp ? Math.min(400, w * .78) : Math.min(330, w * .64), key = sig + '|peak|' + pk.id;
      const im = kit.sprite(scene, parent, key, [-w / 2 - 30, -H * 1.16 - 30, w / 2 + 50, 26], B => peakArt(B, w, d, H, PEAK_SNOW[season] + (sharp ? .06 : 0), P, kit.hashStr(pk.id), sharp), (b[0] + b[2]) / 2, b[3] - 4, 1.25);
      if (im) { sprites.push(im); keys.push(key); spritePx += im._gptPx || 0; }
    }
    for (const op of ops) for (const p of op.pines || []) { const key = sig + '|pine|' + p.seed; const im = kit.sprite(scene, parent, key, [-24, -p.h - 14, 44, 8], B => pineArt(B, p.h, P, p.seed, snowy), p.x, p.y); if (im) { sprites.push(im); keys.push(key); spritePx += im._gptPx || 0; } }
    if (parent.sort) parent.sort('depth');
    current = { sig, handle, spriteKeys: keys };
    stats = { sig, chunks: handle.chunks, buildMs: Math.round(performance.now() - t0), sprites: sprites.length, spritePx };
    return { destroy() { handle.destroy(true); for (const s of sprites) s.destroy(); sprites = []; current = current && current.handle === handle ? Object.assign(current, { handle: { destroy() {} } }) : current; } };
  }
  /** The kinds of landform and region this kit paints (the world skips its own art for them). */
  function owns(kind) { return wanted() && (kind === 'mountain' || kind === 'rock-wall' || kind === 'terrace-wall'); }
  function ownsRegion(id) { if (!wanted()) return false; const r = (gardenIslandData().regions || []).find(x => x.id === id); return !!(r && r.theme === 'mountain'); }
  function status() {
    const h = current && current.handle, px = (h && h.texturePx || 0) + (stats.spritePx || 0);
    return Object.assign({}, stats, { wanted: wanted(), pending: h ? h.pending : null, worstChunkMs: h ? h.worstMs : null, bakeMs: h ? h.bakeMs : null, textureMB: Math.round(px * 4 / 1048576 * 10) / 10, lastError: lastError || (KIT() && KIT().lastError) });
  }
  return { wanted, build, owns, ownsRegion, status, compose, readLayout, PAL };
})();
