/* Painted vale: Millwater valley's ground and the fences on unbought land (see 94-garden-paint-vale-0kit.js).
 *  - Land not yet yours is fenced, map-wide outside the woods: a weathered
 *    post-and-rail fence along each locked plot's edge where it meets ground
 *    you can walk on, so the plot's edge reads as the stop it is (it was an
 *    invisible wall in the painted garden; Classic always drew a fence here).
 *    The fence follows the garden: buying a plot takes its fence away. In the
 *    painted woods (Whispering woodland, the old woodland) the same land is a
 *    thicket of bramble and holly instead (94-garden-paint-wood-0core.js): one
 *    rule, fences in open country and thickets in the woods.
 *  - The open valley floor gets its meadow: drifts of buttercups, clover and
 *    cuckooflower in the free grass, kept off paths, plots and doorways.
 * Only rendering: cells, walking and saved rows are untouched. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const inValley = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null; return !!(r && /mill|valley/.test(String(r.id) + ' ' + String(r.theme || ''))); };
  // fenced: open country, i.e. anywhere but a wood that shows its locked land as thicket
  const fenced = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null; return !(r && window.GardenPaintWood && GardenPaintWood.thicketWood && GardenPaintWood.thicketWood(r.id)); };
  let plotsMemo = null;
  /** Plot cells in open country and the edges they share with dry ground: [{ id, cells:[[x,y]], edges:[[x,y,side,nx,ny]] }]. */
  function plots() {
    if (plotsMemo) return plotsMemo;
    const W = GARDEN_WORLD, byId = new Map();
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      const row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null; if (!row || !row.plot || !fenced(x, y)) continue;
      let p = byId.get(row.id); if (!p) byId.set(row.id, p = { id: row.id, cells: [], edges: [] }); p.cells.push([x, y]);
      for (const [dx, dy, side] of [[0, 1, 's'], [0, -1, 'n'], [1, 0, 'e'], [-1, 0, 'w']]) {
        const nx = x + dx, ny = y + dy, nrow = gardenLandCell(nx, ny), base = gardenIslandBaseCell(nx, ny);
        if (nrow && nrow.id === row.id) continue;
        if (!base || !base.land || base.freshwater || base.solid || nrow && nrow.solid) continue;   // (no fence against water, rock or thicket)
        p.edges.push([x, y, side, nx, ny]);
      }
    }
    return plotsMemo = [...byId.values()];
  }
  const level = () => { try { return gardenModel().level.level; } catch (e) { return 1; } };
  const locked = (x, y, lv) => { try { return String(gardenAreaAt(x, y, lv)).startsWith('locked:'); } catch (e) { return false; } };
  // The ground re-bakes when a valley plot opens or closes.
  // (and when you reach a plot's level: its sign turns from the level it needs to its price)
  V.groundSigs.push(() => { if (typeof gardenAreaAt !== 'function') return ''; const lv = level(); let h = 0, n = 0; for (const p of plots()) { const c = p.cells[0]; if (locked(c[0], c[1], lv)) { const row = gardenLandCell(c[0], c[1]); h = (h * 31 + p.cells.length + c[0] * 97 + c[1] + (row && lv >= (row.lv || 0) ? 7 : 0)) >>> 0; n++; } } return '|vf' + n + ':' + h; });
  // The fence wears the country it stands in: a dry-stone wall on the north moor, a hedge in the High orchard,
  // the weathered post-and-rail everywhere else (the village, the valley). One rule, local dress (17 Nov 2026).
  const regionKind = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null, id = r ? String(r.id) + ' ' + String(r.theme || '') : ''; return /mountain|north-headland/.test(id) ? 'wall' : /orchard/.test(id) ? 'hedge' : 'rail'; };

  const lighten = (c) => { const n = parseInt(c.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * .25)); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
  // Heights from the size standard (GARDEN_SIZE in 94-garden-0camera.js, docs/dev/PAINT_KIT.md "Scale"): a fence or hedge .55 H, a field wall .8 H.
  // These are painted into the ground, so a run along a plot's north edge stands far enough inside the plot that its top meets the edge:
  // you stand behind it with nothing of it drawn over your feet.
  const RUN_H = () => ({ rail: gardenSizePx('fence', .5), hedge: gardenSizePx('hedge', .5), wall: gardenSizePx('wall', 0) });
  // a dry-stone wall along one cell edge: (x0, y0) the run's foot, along x (horiz) or along y, len px, hh tall
  function wallRun(B, r, P, x0, y0, horiz, len, season, hh) {
    hh = hh || 10; const stone = ['#a8a090', '#8e8678', '#bdb5a3', '#7a7366'], n = Math.max(3, Math.round(len / 7)), rows = Math.max(2, Math.round((hh - 3) / 4.6)), cy = k => y0 - 2.6 - k * (hh - 5) / rows;
    if (horiz) {
      B.s(`M${x0} ${y0 + 1.5}h${len}`, '#2e3420', 4, .14);
      B.f(B.rr(x0 - 1, y0 - hh + 1, len + 2, hh, 3), stone[3]);
      for (let k = 0; k < rows; k++) for (let i = 0; i < n; i++) { const sx = x0 + (i + (k & 1 ? .95 : .5)) * len / n + (r() - .5) * 1.5, sy = cy(k); if (sx > x0 + len + 1) continue; B.f(B.ell(sx + .6, sy + .9, len / n * .52, 2.5), '#5e584e', .45).f(B.ell(sx, sy, len / n * .52, 2.5), stone[Math.floor(r() * 3)]).f(B.ell(sx - 1, sy - 1, len / n * .25, .9), '#d8d2c2', .45); }
      for (let k = 0; k <= n; k++) { const sx = x0 + k * len / n + (r() - .5); B.f(B.ell(sx, y0 - hh + 1.4, 2.8, 2), stone[2]).f(B.ell(sx - .6, y0 - hh + .8, 1.5, .8), '#e2dccc', .8); }   // the coping, on edge
      if (r() < .5) B.f(B.blob(r, x0 + r() * len, y0 - hh * (.3 + r() * .5), 3.4, 1.6, 6, .5), '#a8b06a', .7);   // lichen
      if (season !== 'winter') B.f(B.blob(r, x0 + len * .5, y0 - .5, len * .55, 2.2, 8, .4), P.lawnLo || '#5a7a3a', .55);   // grass grown up its foot
    } else {
      B.s(`M${x0 + 1.5} ${y0}v${len}`, '#2e3420', 4, .14);
      B.f(B.rr(x0 - 4, y0 - hh + 2, 8, len + hh - 2, 3), stone[3]);
      for (let t = 0; t <= len; t += 4.4) { const sy = y0 + t; for (let k = 0; k < rows; k++) B.f(B.ell(x0 + (k & 1 ? .8 : -.8) + (r() - .5), sy - 2.6 - k * (hh - 5) / rows, 3.6, 2.6), stone[Math.floor(r() * 3)]); B.f(B.ell(x0 - .4, sy - hh + 1.6, 2.6, 1.6), stone[2]); }
    }
  }
  // a clipped field hedge (hawthorn): haws in autumn, may blossom in spring; hh tall
  function hedgeRun(B, r, P, x0, y0, horiz, len, season, hh) {
    hh = hh || 10; const leaf = season === 'autumn' ? ['#5e6a2e', '#7a7a34', '#8e5a2a'] : season === 'winter' ? ['#4a5236', '#5e6644', '#6e5a40'] : ['#3e6230', '#527a3a', '#6a9244'];
    if (horiz) {
      B.s(`M${x0} ${y0 + 1.5}h${len}`, '#2e3420', 5, .16);
      B.f(B.rr(x0 - 1, y0 - hh + 1, len + 2, hh, 5), leaf[0]);
      for (let y = y0 - 3.5; y > y0 - hh + 3; y -= 5.5) for (let t = 0; t < len; t += 6.5) B.f(B.blob(r, x0 + t + 3.2 + (r() - .5) * 2, y + (r() - .5) * 2, 5, 3.4, 7, .45), leaf[(y < y0 - hh * .55 ? 1 : 0) + (r() < .3 ? 1 : 0)], .9);
      for (let t = 0; t < len; t += 6) B.f(B.blob(r, x0 + t + r() * 4, y0 - hh + 1.5 + r() * 2, 2.8, 1.7, 6, .5), lighten(leaf[1]), .75);   // the lit, clipped top
      B.f(B.rr(x0 - 1, y0 - 4, len + 2, 4, 2), 'rgba(24,36,16,.28)');   // the shade at its foot
      if (season !== 'winter') for (let i = 0; i < 2; i++) if (r() < .45) B.f(B.circ(x0 + r() * len, y0 - hh * (.3 + r() * .5), 1), season === 'autumn' ? '#b03a2a' : '#f4f0e0', .9);
    } else {
      B.s(`M${x0 + 1.5} ${y0}v${len}`, '#2e3420', 5, .16);
      B.f(B.rr(x0 - 4.8, y0 - hh + 2, 9.6, len + hh - 2, 4), leaf[0]);
      for (let t = 0; t <= len; t += 5.5) for (let y = -3.5; y > -hh + 3; y -= 6) B.f(B.blob(r, x0 + (r() - .5) * 2, y0 + t + y, 5, 3.6, 7, .45), leaf[y < -hh * .55 ? 1 : 0], .9);
      for (let t = 0; t <= len; t += 5) B.f(B.blob(r, x0 - .5, y0 + t - hh + 2.5, 3, 1.8, 6, .5), lighten(leaf[1]), .7);
    }
  }
  // the sign on a locked plot's fence: a small board on a post saying what it needs, its level or (once you have that) its price
  function sign(B, x, y, row, lv) {
    const lvNeed = row.lv || 0, coin = lv >= lvNeed && !!row.buy, txt = lv < lvNeed ? 'Lv ' + lvNeed : row.buy ? String(row.buy) : ''; if (!txt) return;
    if (window.GardenPaintGround && GardenPaintGround.castShadow) GardenPaintGround.castShadow(B.cx, x, y, 14, 26, { a: .24 }); else B.f(B.ell(x + 1, y + 1, 7, 2), 'rgba(40,40,24,.25)');   /* (the board's shadow, thrown the way every other is) */
    B.f(B.rect(x - 1.2, y - 15, 2.4, 15), '#5e4c36').f(B.rect(x - 1.2, y - 15, 1, 15), '#8a7454', .7);
    const cx = B.cx; cx.save(); cx.font = '700 7.5px system-ui, sans-serif';
    const w = Math.max(16, cx.measureText(txt).width + (coin ? 7 : 0) + 6), x0 = x - w / 2, y0 = y - 26;
    B.f(B.rr(x0 + .8, y0 + 1, w, 12, 2), 'rgba(30,24,16,.3)').f(B.rr(x0, y0, w, 12, 2), '#c9a876').f(B.rr(x0, y0, w, 3.5, 1.5), '#dcc092', .8).s(B.rr(x0, y0, w, 12, 2), '#6e5434', .8, .9);
    let tx = x0 + 3;
    if (coin) { B.f(B.circ(tx + 2.5, y0 + 6, 2.8), '#e8b830').f(B.circ(tx + 2.5, y0 + 6, 1.5), '#f6d870'); tx += 7; }
    cx.fillStyle = '#3e2c1a'; cx.textBaseline = 'middle'; cx.fillText(txt, tx, y0 + 6.4); cx.restore();
  }
  function fence(B, r, P, edges, W, season, cb, plot) {
    const cw = W.cellW, ch = W.cellH, lv = level(), wood = ['#8a7454', '#a88e66', '#5e4c36'], RH0 = RUN_H();
    const fronts = [], inset = 3, drawn = new Set();
    for (const [x, y, side, nx, ny] of edges) if (locked(x, y, lv) && !locked(nx, ny, lv)) drawn.add(x + ',' + y + side);
    // A wall or hedge round a plot one or two cells deep stood as a solid box of stones, its far run and its near run
    // meeting over the land (art director, round 3: "not a wall round land"). Each run is only as tall as leaves the
    // plot's own ground showing between them: the full .8 H on a plot three cells deep, lower on a shallower one.
    const depth = new Map(); if (plot) for (const [x] of plot.cells) depth.set(x, (depth.get(x) || 0) + 1);
    const hOf = (kind, x) => kind === 'rail' || !depth.has(x) ? RH0[kind] : Math.min(RH0[kind], Math.max(13, (depth.get(x) * ch - 12) / 2.4));
    let RH = RH0;
    const at = x => (RH = { rail: RH0.rail, hedge: hOf('hedge', x), wall: hOf('wall', x) });
    // a north run's foot: inside the plot by its height, so its top meets the plot's edge (it is painted into the ground; you stand behind it)
    const northFoot = kind => Math.min(ch - 2, RH[kind] + 1);
    // a run up the screen starts at the north run's foot where the cell has one, so no post stands out past the corner
    const sideFrom = (x, y, kind) => drawn.has(x + ',' + y + 'n') ? northFoot(kind) : 0;
    // only the runs this chunk can show are painted (a big plot's fence was painted whole into every chunk it touched: 40 ms and more),
    // each from its own random stream, so the two chunks either side of an edge paint the same run
    const G = window.GardenPaintGround, seen = (x, y) => !cb || !(x * cw + cw + 10 < cb[0] || x * cw - 10 > cb[2] || W.sky + y * ch + ch + 8 < cb[1] || W.sky + y * ch - 48 > cb[3]);
    const rOf = (x, y, side) => G && G.rng && G.hash ? G.rng(G.hash(x + 7, y + 11, side.charCodeAt(0) * 31 + 4100)) : r;
    // every run's shadow first, along the world's one light (the kit lays them in one soft fill), so no fence, wall or hedge stands on the grass without one
    if (window.GardenPaintGround && GardenPaintGround.castRuns) {
      const runs = [];
      for (const [x, y, side, nx, ny] of edges) {
        if (!locked(x, y, lv) || locked(nx, ny, lv) || !seen(x, y)) continue;
        at(x); const x0 = x * cw, y0 = W.sky + y * ch, kind = regionKind(x, y), h = RH[kind] * (kind === 'rail' ? .9 : 1.05);
        if (side === 's' || side === 'n') { const yy = side === 's' ? y0 + ch - inset : y0 + northFoot(kind); runs.push([x0, yy, x0 + cw, yy, h]); }
        else { const xx = side === 'e' ? x0 + cw - inset : x0 + inset; runs.push([xx, y0 + sideFrom(x, y, kind), xx, y0 + ch, h]); }
      }
      if (runs.length) GardenPaintGround.castRuns(B.cx, runs, { a: .26 });
    }
    for (const [x, y, side, nx, ny] of edges) {
      if (!locked(x, y, lv) || locked(nx, ny, lv)) continue;   // (a plot that is yours, or two locked plots side by side: no fence between)
      if (side === 's') fronts.push([x, y]);
      if (!seen(x, y)) continue;
      at(x); const r = rOf(x, y, side), x0 = x * cw, y0 = W.sky + y * ch, kind = regionKind(x, y), hh = RH[kind], from = side === 'e' || side === 'w' ? sideFrom(x, y, kind) : 0;
      if (kind === 'wall' || kind === 'hedge') {
        const run = kind === 'wall' ? wallRun : hedgeRun;
        if (side === 's' || side === 'n') run(B, r, P, x0, side === 's' ? y0 + ch - inset : y0 + northFoot(kind), true, cw, season, hh);
        else run(B, r, P, side === 'e' ? x0 + cw - inset : x0 + inset, y0 + from, false, ch - from, season, hh);
        continue;
      }
      // post and rail: posts .55 H, two rails, the top one weathered paler
      const pw = 3, rails = [hh * .36, hh * .74];
      if (side === 's' || side === 'n') {
        const yy = side === 's' ? y0 + ch - inset : y0 + northFoot(kind);
        B.s(`M${x0} ${yy + 1.5}h${cw}`, '#2e3420', 3.4, .14);
        for (const h of rails) B.s(`M${x0 - 1} ${yy - h}h${cw + 2}`, wood[h > hh * .5 ? 1 : 0], 2, .95).s(`M${x0 - 1} ${yy - h - .7}h${cw + 2}`, '#c8b08a', .6, .55);
        for (let t = 0; t <= cw; t += cw / 3) { const px = x0 + t + (r() - .5) * 1.2, ph = hh + (r() - .5) * 1.6; B.f(B.rect(px - pw / 2, yy - ph, pw, ph), wood[2]).f(B.rect(px - pw / 2, yy - ph, 1.1, ph), wood[1], .7).f(B.ell(px, yy - ph, pw / 2, .8), '#b49a72', .9); if (r() < .6) B.f(B.blob(r, px + .5, yy, 3.4, 1.6, 6, .5), P.lawnLo || '#5a7a3a', .7); }
      } else {
        const xx = side === 'e' ? x0 + cw - inset : x0 + inset, ys = y0 + from, len = ch - from;
        B.s(`M${xx + 1.5} ${ys}v${len}`, '#2e3420', 3.4, .14);
        for (const h of rails) B.s(`M${xx} ${ys - h}v${len}`, wood[0], 1.8, .9);
        for (let t = 0; t <= len + .1; t += len / 2) { const py = ys + t, ph = hh + (r() - .5) * 1.6; B.f(B.rect(xx - pw / 2, py - ph, pw, ph), wood[2]).f(B.rect(xx - pw / 2, py - ph, 1.1, ph), wood[1], .7).f(B.ell(xx, py - ph, pw / 2, .8), '#b49a72', .9); }
      }
      if (r() < .3) { const px = x * cw + r() * cw, py = W.sky + (side === 's' ? y + 1 : y) * ch; B.f(B.blob(r, px, py - 1, 4 + r() * 3, 2, 6, .5), P.lawnLo, .7); }
    }
    // one sign per plot, on the front (south) fence, the middle of its lowest run, but never where a sight stands in front
    // of it (the lighthouse's tower over the '360', the well's roof over the 'Lv 3': art director, round 3)
    if (fronts.length) {
      // a sight's painted picture (its art row's box, a little inside its padding), else a cell either side and five rows up
      const statics = (typeof gardenIslandData === 'function' && gardenIslandData().static) || [], ART = window.GardenPaintedMarks && GardenPaintedMarks.ART;
      const reach = statics.map(s => { const a = ART && ART[s.id], cx = (s.x + (s.w || 1) / 2) * cw, foot = W.sky + (s.y + (s.h || 1)) * ch; return a && a.box ? [cx + a.box[0] * .8 - 14, cx + a.box[2] * .8 + 14, foot + a.box[1], foot] : [(s.x - 1) * cw, (s.x + (s.w || 1) + 1) * cw, foot - 6 * ch, foot]; });
      const hidden = (px, py) => reach.some(q => px > q[0] && px < q[1] && py > q[2] && py < q[3]);
      const yMax = Math.max(...fronts.map(f => f[1])), low = fronts.filter(f => f[1] === yMax).sort((a, b) => a[0] - b[0]);
      const at = (f, dx) => [(f[0] + .5) * cw + dx, W.sky + (f[1] + 1) * ch - 1];
      let spot = low[low.length >> 1], pos = at(spot, low.length % 2 ? 0 : -cw / 2);
      if (hidden(pos[0], pos[1] - 20)) {
        const mx = (low.reduce((s, f) => s + f[0], 0) / low.length + .5) * cw, tries = [];
        for (const f of fronts) for (const dx of [0, -cw * .34, cw * .34]) { const p = at(f, dx); if (!hidden(p[0], p[1] - 20)) tries.push({ f, p, score: (yMax - f[1]) * 4 * cw + Math.abs(p[0] - mx) }); }
        // no clear place on the front: the board goes on the far (north) run, standing up over the plot behind the sight
        if (!tries.length) for (const [x, y, side, nx, ny] of edges) { if (side !== 'n' || !locked(x, y, lv) || locked(nx, ny, lv)) continue; for (const dx of [0, -cw * .34, cw * .34]) { const p = [(x + .5) * cw + dx, W.sky + y * ch + 4]; if (!hidden(p[0], p[1] - 20)) tries.push({ f: [x, y], p, score: Math.abs(p[0] - mx) }); } }
        tries.sort((a, b) => a.score - b.score); if (tries.length) { spot = tries[0].f; pos = tries[0].p; }
      }
      const row = gardenLandCell(spot[0], spot[1]); if (row) sign(B, pos[0], pos[1], row, lv);
    }
  }
  function compose(C) {
    if (typeof gardenLandCell !== 'function' || typeof gardenIslandBaseCell !== 'function') return;
    const { add, W, P, season } = C, cw = W.cellW, ch = W.cellH;
    plotsMemo = null;
    for (const p of plots()) {
      if (!p.edges.length) continue;
      const xs = p.edges.map(e => e[0]), ys = p.edges.map(e => e[1]), bb = [Math.min(...xs) * cw - 16, W.sky + Math.min(...ys) * ch - 44,(Math.max(...xs) + 1) * cw + 8, W.sky + (Math.max(...ys) + 1) * ch + 8];
      add(bb, 4100 + p.cells.length, (B, r, cb) => fence(B, r, P, p.edges, W, season, cb, p));
    }
    // meadow flowers in the free valley grass: drifts, each drift one colour
    const data = gardenIslandData(), statics = data.static || [], free = [];
    const near = (x, y) => statics.some(s => x >= s.x - 1 && x <= s.x + s.w && y >= s.y - 1 && y <= s.y + s.h + 1 || s.apron && x >= s.apron.x && x < s.apron.x + s.apron.w && y >= s.apron.y && y < s.apron.y + s.apron.h);
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      if (!inValley(x, y)) continue;
      const base = gardenIslandBaseCell(x, y), row = gardenLandCell(x, y);
      if (!base || !base.land || base.beach || base.freshwater || base.solid || base.reserved || row && (row.plot || row.trail || row.lane || row.solid) || near(x, y)) continue;
      free.push([x, y]);
    }
    if (!free.length) return;
    const colours = season === 'winter' ? [] : season === 'spring' ? ['#f2d43a', '#f0c8d8', '#fbfbf2'] : season === 'summer' ? ['#f2d43a', '#fbfbf2', '#d8a0c8'] : ['#e8c050', '#f4ecd8'];
    const rr = C.kit.rng(C.kit.hash('valley-meadow'));
    for (let i = 0; i < Math.min(46, free.length / 3); i++) {
      const [cx0, cy0] = free[Math.floor(rr() * free.length)], col = colours.length ? colours[Math.floor(rr() * colours.length)] : null, x = (cx0 + rr()) * cw, y = W.sky + (cy0 + rr()) * ch, rx = 22 + rr() * 30, ry = 8 + rr() * 8;
      add([x - rx - 6, y - ry - 6, x + rx + 6, y + ry + 6], 5200 + i, (B, r) => {
        B.f(B.blob(r, x, y, rx, ry, 8, .5), P.lawnHi, .22).f(B.blob(r, x + rx * .2, y + 2, rx * .6, ry * .6, 7, .5), P.lawnLo, .14);
        if (!col) return;
        for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d; B.s(`M${px} ${py + 3}v-3`, '#5e7e3c', .7, .7).f(B.circ(px, py, .9 + r() * .7), col, .95); }
      });
    }
  }
  V.parts.push({ id: 'valley', compose });
})();
