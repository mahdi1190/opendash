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
      if (V.villageSection && V.villageSection(row.id)) continue;   // (a village field wears its own edge: 94-garden-paint-vale-1village.js)
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
  // (a plot past a gate that is still shut has no fence yet: the mist stands at that edge, and a fence there drew a ruled
  // line of posts down the open meadow beside the village. It is fenced once its gate opens.)
  const zoneShut = (x, y) => { try { return typeof gardenZoneLockAt === 'function' && !!gardenZoneLockAt(x, y); } catch (e) { return false; } };
  // The ground re-bakes when a valley plot opens or closes.
  // (and when you reach a plot's level: its sign turns from the level it needs to its price)
  V.groundSigs.push(() => { if (typeof gardenAreaAt !== 'function') return ''; const lv = level(); let h = 0, n = 0; for (const p of plots()) { const c = p.cells[0]; if (locked(c[0], c[1], lv)) { const row = gardenLandCell(c[0], c[1]); h = (h * 31 + p.cells.length + c[0] * 97 + c[1] + (row && lv >= (row.lv || 0) ? 7 : 0) + (zoneShut(c[0], c[1]) ? 3 : 0)) >>> 0; n++; } } return '|vf' + n + ':' + h; });
  // The fence wears the country it stands in: a dry-stone wall on the north moor, a hedge in the High orchard,
  // the weathered post-and-rail everywhere else (the village, the valley). One rule, local dress (17 Nov 2026).
  const regionKind = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null, id = r ? String(r.id) + ' ' + String(r.theme || '') : ''; return /mountain|north-headland/.test(id) ? 'wall' : /orchard/.test(id) ? 'hedge' : 'rail'; };

  const lighten = (c) => { const n = parseInt(c.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * .25)); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
  // a dry-stone wall along one cell edge: (x0, y0) the run's start, along x (horiz) or along y, len px
  function wallRun(B, r, P, x0, y0, horiz, len) {
    const stone = ['#a8a090', '#8e8678', '#bdb5a3', '#7a7366'], n = Math.max(3, Math.round(len / 6));
    if (horiz) {
      B.s(`M${x0} ${y0 + 1.5}h${len}`, '#2e3420', 4, .14);
      B.f(B.rr(x0 - 1, y0 - 8, len + 2, 9, 3), stone[3]);
      for (let k = 0; k < n; k++) { const sx = x0 + (k + .5) * len / n + (r() - .5) * 1.5; B.f(B.ell(sx, y0 - 2.5, len / n * .55, 2.6), stone[Math.floor(r() * 3)]); }
      for (let k = 0; k < n; k++) { const sx = x0 + (k + 1) * len / n - len / n * .5; B.f(B.ell(sx, y0 - 6.2, len / n * .5, 2.3), stone[Math.floor(r() * 3)]); }
      for (let k = 0; k <= n; k++) { const sx = x0 + k * len / n + (r() - .5); B.f(B.ell(sx, y0 - 8.6, 2.6, 1.8), stone[2]).f(B.ell(sx - .6, y0 - 9.2, 1.4, .8), '#d8d2c2', .8); }   // the coping
      if (r() < .35) B.f(B.blob(r, x0 + r() * len, y0 - 7, 3, 1.4, 6, .5), '#a8b06a', .7);   // lichen
    } else {
      B.s(`M${x0 + 1.5} ${y0}v${len}`, '#2e3420', 4, .14);
      for (let t = 0; t <= len; t += 4.2) { const sy = y0 + t; B.f(B.ell(x0 + (r() - .5), sy - 3, 3.4, 4.2), stone[Math.floor(r() * 3)]).f(B.ell(x0 - .4, sy - 6.6, 2.6, 1.6), stone[2]); }
    }
  }
  // a clipped field hedge (hawthorn): haws in autumn, may blossom in spring
  function hedgeRun(B, r, P, x0, y0, horiz, len, season) {
    const leaf = season === 'autumn' ? ['#5e6a2e', '#7a7a34', '#8e5a2a'] : season === 'winter' ? ['#4a5236', '#5e6644', '#6e5a40'] : ['#3e6230', '#527a3a', '#6a9244'];
    if (horiz) {
      B.s(`M${x0} ${y0 + 1.5}h${len}`, '#2e3420', 5, .16);
      B.f(B.rr(x0 - 1, y0 - 9, len + 2, 10, 4), leaf[0]);
      for (let t = 0; t < len; t += 5) B.f(B.blob(r, x0 + t + 2.5, y0 - 8 + r() * 2, 4.2, 3, 7, .45), leaf[1 + (r() < .3 ? 1 : 0)], .95);
      for (let t = 0; t < len; t += 7) B.f(B.blob(r, x0 + t + r() * 4, y0 - 10 + r() * 2, 2.4, 1.6, 6, .5), lighten(leaf[1]), .7);
      if (season !== 'winter' && r() < .4) B.f(B.circ(x0 + r() * len, y0 - 6, 1), season === 'autumn' ? '#b03a2a' : '#f4f0e0', .9);
    } else {
      B.s(`M${x0 + 1.5} ${y0}v${len}`, '#2e3420', 5, .16);
      for (let t = 0; t <= len; t += 4.5) B.f(B.blob(r, x0, y0 + t - 5, 4.6, 5, 7, .45), leaf[t % 9 < 4.5 ? 0 : 1], .95);
    }
  }
  // the sign on a locked plot's fence: a small board on a post saying what it needs, its level or (once you have that) its price
  function sign(B, x, y, row, lv) {
    const lvNeed = row.lv || 0, coin = lv >= lvNeed && !!row.buy, txt = lv < lvNeed ? 'Lv ' + lvNeed : row.buy ? String(row.buy) : ''; if (!txt) return;
    B.f(B.ell(x + 1, y + 1, 7, 2), 'rgba(40,40,24,.25)');
    B.f(B.rect(x - 1.2, y - 15, 2.4, 15), '#5e4c36').f(B.rect(x - 1.2, y - 15, 1, 15), '#8a7454', .7);
    const cx = B.cx; cx.save(); cx.font = '700 7.5px system-ui, sans-serif';
    const w = Math.max(16, cx.measureText(txt).width + (coin ? 7 : 0) + 6), x0 = x - w / 2, y0 = y - 26;
    B.f(B.rr(x0 + .8, y0 + 1, w, 12, 2), 'rgba(30,24,16,.3)').f(B.rr(x0, y0, w, 12, 2), '#c9a876').f(B.rr(x0, y0, w, 3.5, 1.5), '#dcc092', .8).s(B.rr(x0, y0, w, 12, 2), '#6e5434', .8, .9);
    let tx = x0 + 3;
    if (coin) { B.f(B.circ(tx + 2.5, y0 + 6, 2.8), '#e8b830').f(B.circ(tx + 2.5, y0 + 6, 1.5), '#f6d870'); tx += 7; }
    cx.fillStyle = '#3e2c1a'; cx.textBaseline = 'middle'; cx.fillText(txt, tx, y0 + 6.4); cx.restore();
  }
  function fence(B, r, P, edges, W, season) {
    const cw = W.cellW, ch = W.cellH, lv = level(), wood = ['#8a7454', '#a88e66', '#5e4c36'];
    const fronts = [];
    for (const [x, y, side, nx, ny] of edges) {
      if (!locked(x, y, lv) || locked(nx, ny, lv) || zoneShut(x, y)) continue;   // (a plot that is yours, or two locked plots side by side, or a plot past a shut gate: no fence)
      const inset = 3, x0 = x * cw, y0 = W.sky + y * ch, kind = regionKind(x, y);
      if (side === 's') fronts.push([x, y]);
      if (kind === 'wall' || kind === 'hedge') {
        const run = kind === 'wall' ? wallRun : hedgeRun;
        if (side === 's' || side === 'n') run(B, r, P, x0, side === 's' ? y0 + ch - inset : y0 + inset + 6, true, cw, season);
        else run(B, r, P, side === 'e' ? x0 + cw - inset : x0 + inset, y0, false, ch, season);
        continue;
      }
      if (side === 's' || side === 'n') {
        const yy = side === 's' ? y0 + ch - inset : y0 + inset + 6;
        B.s(`M${x0} ${yy + 1.5}h${cw}`, '#2e3420', 3, .12);
        for (const h of [4, 8]) B.s(`M${x0 - 1} ${yy - h}h${cw + 2}`, wood[r() < .5 ? 0 : 1], 1.5, .95);
        for (let t = 0; t <= cw; t += cw / 3) { const px = x0 + t + (r() - .5) * 1.2; B.f(B.rect(px - 1.2, yy - 10.5, 2.4, 10.5), wood[2]).f(B.rect(px - 1.2, yy - 10.5, 1, 10.5), wood[1], .7); }
      } else {
        const xx = side === 'e' ? x0 + cw - inset : x0 + inset;
        B.s(`M${xx + 1.5} ${y0}v${ch}`, '#2e3420', 3, .12);
        B.s(`M${xx} ${y0 - 4}v${ch}M${xx} ${y0 - 8}v${ch}`, wood[0], 1.4, .9);
        for (let t = 0; t <= ch; t += ch / 2) { const py = y0 + t; B.f(B.rect(xx - 1.2, py - 10.5, 2.4, 10.5), wood[2]).f(B.rect(xx - 1.2, py - 10.5, 1, 10.5), wood[1], .7); }
      }
      if (r() < .3) { const px = x * cw + r() * cw, py = W.sky + (side === 's' ? y + 1 : y) * ch; B.f(B.blob(r, px, py - 1, 4 + r() * 3, 2, 6, .5), P.lawnLo, .7); }
    }
    // one sign per plot, on the front (south) fence, the middle of its lowest run
    if (fronts.length) {
      const yMax = Math.max(...fronts.map(f => f[1])), low = fronts.filter(f => f[1] === yMax).sort((a, b) => a[0] - b[0]), at = low[low.length >> 1];
      const row = gardenLandCell(at[0], at[1]); if (row) sign(B, (at[0] + .5) * cw + (low.length % 2 ? 0 : -cw / 2), W.sky + (at[1] + 1) * ch - 1, row, lv);
    }
  }
  function compose(C) {
    if (typeof gardenLandCell !== 'function' || typeof gardenIslandBaseCell !== 'function') return;
    const { add, W, P, season } = C, cw = W.cellW, ch = W.cellH;
    plotsMemo = null;
    for (const p of plots()) {
      if (!p.edges.length) continue;
      const xs = p.edges.map(e => e[0]), ys = p.edges.map(e => e[1]), bb = [Math.min(...xs) * cw - 16, W.sky + Math.min(...ys) * ch - 30, (Math.max(...xs) + 1) * cw + 8, W.sky + (Math.max(...ys) + 1) * ch + 8];
      add(bb, 4100 + p.cells.length, (B, r) => fence(B, r, P, p.edges, W, season));
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
