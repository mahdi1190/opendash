/* Painted vale: Millwater valley's ground (see 94-garden-paint-vale-0kit.js).
 *  - Land not yet yours in the valley is fenced: a weathered post-and-rail
 *    fence along each locked plot's edge where it meets ground you can walk
 *    on, so the plot's edge reads as the stop it is (it was an invisible wall
 *    in the painted garden; Classic always drew a fence here). The fence
 *    follows the garden: buying a plot takes its fence away.
 *  - The open valley floor gets its meadow: drifts of buttercups, clover and
 *    cuckooflower in the free grass, kept off paths, plots and doorways.
 * Only rendering: cells, walking and saved rows are untouched. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const inValley = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null; return !!(r && /mill|valley/.test(String(r.id) + ' ' + String(r.theme || ''))); };
  let plotsMemo = null;
  /** Valley plot cells and the edges they share with dry ground: [{ id, cells:[[x,y]], edges:[[x,y,side,nx,ny]] }]. */
  function plots() {
    if (plotsMemo) return plotsMemo;
    const W = GARDEN_WORLD, byId = new Map();
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      const row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null; if (!row || !row.plot || !inValley(x, y)) continue;
      let p = byId.get(row.id); if (!p) byId.set(row.id, p = { id: row.id, cells: [], edges: [] }); p.cells.push([x, y]);
      for (const [dx, dy, side] of [[0, 1, 's'], [0, -1, 'n'], [1, 0, 'e'], [-1, 0, 'w']]) {
        const nx = x + dx, ny = y + dy, nrow = gardenLandCell(nx, ny), base = gardenIslandBaseCell(nx, ny);
        if (nrow && nrow.id === row.id) continue;
        if (!base || !base.land || base.freshwater || base.solid) continue;
        p.edges.push([x, y, side, nx, ny]);
      }
    }
    return plotsMemo = [...byId.values()];
  }
  const level = () => { try { return gardenModel().level.level; } catch (e) { return 1; } };
  const locked = (x, y, lv) => { try { return String(gardenAreaAt(x, y, lv)).startsWith('locked:'); } catch (e) { return false; } };
  // The ground re-bakes when a valley plot opens or closes.
  V.groundSigs.push(() => { if (typeof gardenAreaAt !== 'function') return ''; const lv = level(); let h = 0, n = 0; for (const p of plots()) { const c = p.cells[0]; if (locked(c[0], c[1], lv)) { h = (h * 31 + p.cells.length + c[0] * 97 + c[1]) >>> 0; n++; } } return '|vf' + n + ':' + h; });

  function fence(B, r, P, edges, W) {
    const cw = W.cellW, ch = W.cellH, lv = level(), wood = ['#8a7454', '#a88e66', '#5e4c36'];
    for (const [x, y, side, nx, ny] of edges) {
      if (!locked(x, y, lv) || locked(nx, ny, lv)) continue;   // (a plot that is yours, or two locked plots side by side: no fence between)
      const inset = 3, x0 = x * cw, y0 = W.sky + y * ch;
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
  }
  function compose(C) {
    if (typeof gardenLandCell !== 'function' || typeof gardenIslandBaseCell !== 'function') return;
    const { add, W, P, season } = C, cw = W.cellW, ch = W.cellH;
    plotsMemo = null;
    for (const p of plots()) {
      if (!p.edges.length) continue;
      const xs = p.edges.map(e => e[0]), ys = p.edges.map(e => e[1]), bb = [Math.min(...xs) * cw - 8, W.sky + Math.min(...ys) * ch - 16, (Math.max(...xs) + 1) * cw + 8, W.sky + (Math.max(...ys) + 1) * ch + 8];
      add(bb, 4100 + p.cells.length, (B, r) => fence(B, r, P, p.edges, W));
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
