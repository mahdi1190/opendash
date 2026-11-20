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
  // The fence wears the country it stands in: on the north moor and in the High orchard the plot is a thicket of gorse or
  // bramble (scrub(); kinds 'wall' and 'hedge' name the two), the weathered post-and-rail everywhere else (the village, the
  // valley). One rule, local dress (17 Nov 2026; thickets in the high country 19 Nov 2026).
  const regionKind = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null, id = r ? String(r.id) + ' ' + String(r.theme || '') : ''; return /mountain|north-headland/.test(id) ? 'wall' : /orchard/.test(id) ? 'hedge' : 'rail'; };

  const lighten = (c) => { const n = parseInt(c.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * .25)); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
  // Heights from the size standard (GARDEN_SIZE in 94-garden-0camera.js, docs/dev/PAINT_KIT.md "Scale"): a fence or hedge .55 H, a field wall .8 H.
  // These are painted into the ground, so a run along a plot's north edge stands far enough inside the plot that its top meets the edge:
  // you stand behind it with nothing of it drawn over your feet.
  const RUN_H = () => ({ rail: gardenSizePx('fence', .5), hedge: gardenSizePx('hedge', .5), wall: gardenSizePx('wall', 0) });
  // (highlands fix round 1: every locked plot of the high country was the same box, one stamp of a dry-stone wall or a
  // clipped hedge, five to seven to a screen; they are thickets now, see scrub() below. wallRun and hedgeRun stay for
  // anything else that wants them.)
  const G0 = () => window.GardenPaintGround;
  // a dry-stone wall along one cell edge: (x0, y0) the run's foot, along x (horiz) or along y, len px, hh tall
  const nz = (x, y, s) => { const G = G0(); return G && G.noise ? G.noise(x, y, s) : .5; };
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
  // Where a landmark stands at a plot's edge, the plot's wall or hedge stops short of it (a hedge ran into the folly's side,
  // a wall was drawn against the hut's wheel, the standing stones stood through a wall): the landmark is the edge there.
  // How far up a landmark is drawn, in cells, decides how much of the plot's edge behind it stays clear.
  let statMemo = null;
  const statics = () => statMemo || (statMemo = ((typeof gardenIslandData === 'function' ? gardenIslandData() : {}).static || []).map(s => ({ x0: s.x - .85, x1: s.x + s.w + .85, y0: s.y - (/folly|tower|treehouse|mill|lighthouse/.test(s.id) ? 3.6 : /hut|stones|wall|cairn|beacon|grotto|falls/.test(s.id) ? 1.25 : .9), y1: s.y + s.h + .45 })).map((b, i, a) => /hut/.test((((typeof gardenIslandData === 'function' ? gardenIslandData() : {}).static || [])[i] || {}).id || '') ? Object.assign(b, { x0: b.x0 - .9, x1: b.x1 + 1.1, y0: b.y0 - .8, y1: b.y1 + .6 }) : b));   // (Wick's hut: the wagon is drawn well past its one cell; a thicket was jammed against its wheel and steps)
  const byStatic = (x, y) => statics().some(s => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);
  // the way into a plaza: a sign never stands in a square (it stood in the cider square's lantern)
  let plazaMemo = null;
  const plazas = () => plazaMemo || (plazaMemo = ((typeof gardenIslandData === 'function' ? gardenIslandData() : {}).routes || []).filter(rt => rt.tier === 'plaza' && rt.points && rt.points.length > 1).map(rt => ({ a: rt.points[0], b: rt.points[rt.points.length - 1], r: (rt.widthCells || 3) / 2 + 1.2 })));
  const inPlaza = (x, y) => plazas().some(q => { const dx = q.b[0] - q.a[0], dy = q.b[1] - q.a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - q.a[0]) * dx + (y - q.a[1]) * dy) / l)) : 0; return Math.hypot(x - q.a[0] - t * dx, (y - q.a[1] - t * dy) * 1.2) < q.r; });
  // Locked land in the high country is land not yet taken in: a thicket grown over it (round 1 of the highlands fixes; the
  // same rule the woods follow). In the orchard, bramble and blackthorn scrub with dog-roses or blackberries; on the fells,
  // gorse in flower, bracken and a lichened rock or two. Its edge is lumpy and set in from the plot's edge, its front stands
  // up as a bank of growth about half your height, darker at its foot; no rectangle of hedge or wall, so twenty plots read as
  // scrub left among the trees and on the fell, not as boxes. The sign stands at its front, clear of squares and landmarks.
  function scrub(B, P, plot, edges, W, season, cb, lv, tone) {
    const character = G0() && G0().hash ? (G0().hash(plot.cells[0][0] * 7 + 3, plot.cells[0][1] * 5 + 1, 4471) % 1000) / 1000 : tone;
    const cw = W.cellW, ch = W.cellH, G = G0(), fell = regionKind(plot.cells[0][0], plot.cells[0][1]) === 'wall', winter = season === 'winter';
    const cells = new Set(plot.cells.map(c => c[0] + ',' + c[1])), has = (x, y) => cells.has(x + ',' + y);
    const rngAt = (x, y, k) => G && G.rng ? G.rng(G.hash(x + 13, y + 17, 4400 + k)) : Math.random;
    const leaf = fell ? (season === 'autumn' ? ['#4a4a26', '#6a6230', '#8a7a3a', '#b08a46'] : winter ? ['#3e4430', '#545a3e', '#6a6e4e', '#8a8a6a'] : ['#33452a', '#46603a', '#5e7a44', '#86a05a'])
      : (season === 'autumn' ? ['#3e4a26', '#5a6230', '#7a7434', '#a8843a'] : winter ? ['#3e4632', '#525a40', '#6a6e52', '#8c8a6e'] : tone > .5 ? ['#2e4a26', '#3e6230', '#56803e', '#7ea256'] : ['#30482c', '#426036', '#5a7c44', '#82a05e']);
    const bloom = fell ? (season === 'spring' || season === 'summer' ? '#f2cc3a' : season === 'winter' ? null : '#e4c040') : season === 'spring' ? '#f6f2ea' : season === 'summer' ? '#f2c6d0' : season === 'autumn' ? '#3a2242' : null;
    const lit = (x, y) => !(cb && (x * cw + cw + 30 < cb[0] || x * cw - 30 > cb[2] || W.sky + y * ch + ch + 30 < cb[1] || W.sky + y * ch - 40 > cb[3]));
    const HH = gardenSizePx('hedge', .5);
    // the shade the thicket throws, along the world's light
    if (G && G.castRuns) { const runs = []; for (const [x, y, side] of edges) if (side === 's' && !byStatic(x + .5, y + 1)) runs.push([x * cw + 4, W.sky + (y + 1) * ch - 5, x * cw + cw - 4, W.sky + (y + 1) * ch - 5, HH]); if (runs.length) G.castRuns(B.cx, runs, { a: .22 }); }
    // back to front, so the front of the thicket stands over what grows behind it
    const order = plot.cells.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    for (const [x, y] of order) {
      if (!lit(x, y) || byStatic(x + .5, y + .5)) continue;
      const r = rngAt(x, y, 1), x0 = x * cw, y0 = W.sky + y * ch, front = !has(x, y + 1), back = !has(x, y - 1), west = !has(x - 1, y), east = !has(x + 1, y);
      // set in from every open side by a lumpy margin, so the mass is never ruled along the cell grid
      // (each clump keeps a margin from every open side that wanders with the place, wider at a corner: the mass is a lump of
      // scrub, never a block cut on the plot's square)
      const L0 = x0 + (west ? 2 : -2), R0 = x0 + cw - (east ? 2 : -2), T0 = y0 + (back ? 2 + HH * .5 : -2), F0 = y0 + ch - (front ? 2 : -2);
      if (R0 - L0 < 4 || F0 - T0 < 3) continue;
      const n = Math.round((R0 - L0) * (F0 - T0) / 30) + 3;
      for (let k = 0; k < n; k++) {
        const fx = L0 + r() * (R0 - L0), fy = T0 + Math.pow(r(), .7) * (F0 - T0), s = 3.2 + r() * 3.6, hgt = (fy - T0) / Math.max(1, F0 - T0), up = HH * (.45 + hgt * .55) * (.7 + r() * .5);
        const m = 3 + nz(fx / 11, fy / 8, 495) * 14, dW = west ? fx - x0 : 99, dE = east ? x0 + cw - fx : 99, dB = back ? fy - y0 - HH * .4 : 99, dF = front ? y0 + ch - fy : 99, d1 = Math.min(dW, dE), d2 = Math.min(dB, dF);
        if (d1 < m || d2 < m * .7 || d1 < m * 1.7 && d2 < m * 1.2) continue;
        // (each plot its own scrub: one bramble bush stamped on every locked plot, a sign on each, read as a grid of buttons; art
        // director, highlands round 2) The plot's character picks its main growth, a broad noise mixes a second in, and a
        // few clumps grow up into a young tree, so no two thickets are the same picture.
        const sec = nz(fx / 30, fy / 22, 498) > .58;
        const kind = fell ? (nz(fx / 26, fy / 19, 496) > .62 ? 'heath' : nz(fx / 23, fy / 17, 497) > .55 ? 'bracken' : character < .3 ? 'juniper' : 'gorse') : (sec ? (character < .5 ? 'hazel' : 'nettle') : character < .25 ? 'bramble' : character < .5 ? 'blackthorn' : character < .75 ? 'elder' : 'hazel');
        const lv2 = kind === 'heath' ? ['#4a3c40', '#5e4a56', '#7a5e72', '#9a7a90'] : kind === 'bracken' ? (season === 'autumn' ? ['#6a4424', '#8a5a2e', '#a8703a', '#c88e4a'] : ['#405a2a', '#587838', '#74944a', '#98b05e']) : kind === 'juniper' ? ['#1e3028', '#2e4a3a', '#46644e', '#6a8a6c'] : kind === 'blackthorn' ? (winter ? ['#2e2a28', '#3e3834', '#4e4640', '#6a625a'] : ['#1e3020', '#2c4428', '#3e5a32', '#5e7a46']) : kind === 'elder' ? (winter ? ['#3a3a30', '#4e4c40', '#626050', '#7e7c6a'] : ['#2e4a2a', '#466a36', '#628a48', '#8aac64']) : kind === 'hazel' ? (season === 'autumn' ? ['#4a4a22', '#6e6a2a', '#9a8a36', '#c4ae52'] : winter ? ['#3e3a30', '#565042', '#6e6656', '#8a8270'] : ['#36522c', '#4e7238', '#6a9048', '#94b466']) : kind === 'nettle' ? ['#36502a', '#4a6a34', '#62843e', '#86a456'] : leaf;
        const tall = kind === 'hazel' || kind === 'elder' ? 1.7 : kind === 'blackthorn' ? 1.3 : kind === 'juniper' ? 1.5 : kind === 'nettle' ? .75 : 1, sapling = !fell && r() < .05 && hgt > .5;
        // a clump: its shade, then its body rising from the ground, lit upper left
        B.f(B.blob(r, fx + 1.5, fy + 1, s * 1.15, s * .55, 7, .45), lv2[0], .9);
        const UP = up * tall * (sapling ? 2.4 : 1), S2 = s * (kind === 'juniper' ? .7 : kind === 'elder' || kind === 'hazel' ? 1.25 : 1);
        if (sapling) B.s(`M${fx} ${fy}l${(r() - .5) * 2} ${-UP * .55}`, '#5a4a3a', 1.6, .95);
        for (let q = 0; q < 3; q++) { const yy = fy - UP * q / 3 - (sapling ? UP * .35 : 0), ss = S2 * (1 - q * .18) * (sapling ? 1.5 : 1); B.f(B.blob(r, fx + (r() - .5) * 2, yy - ss * .3, ss, ss * (kind === 'juniper' ? .95 : .72), 8, .45), lv2[q === 0 ? 1 : q === 1 ? 1 + (r() < .5 ? 1 : 0) : 2], .95); }
        B.f(B.blob(r, fx - S2 * .35, fy - UP * .7 - S2 * .5, S2 * .5, S2 * .34, 6, .5), lv2[3], .8);
        if (kind === 'elder' && (season === 'summer' || season === 'spring') && r() < .55) for (let b = 0; b < 2; b++) { const ex = fx + (r() - .5) * S2 * 1.6, ey = fy - UP * (.5 + r() * .5) - S2 * .4; B.f(B.ell(ex, ey, 2.6, 1.3), '#f2eed8', .95).f(B.ell(ex - .6, ey - .4, 1.4, .6), '#ffffff', .7); }
        if (kind === 'elder' && season === 'autumn' && r() < .5) B.f(B.ell(fx + (r() - .5) * S2, fy - UP * .7, 2.2, 1.2), '#3a1e3a', .9);
        if (kind === 'blackthorn' && season === 'spring' && r() < .7) for (let b = 0; b < 4; b++) B.f(B.circ(fx + (r() - .5) * S2 * 1.6, fy - UP * (.3 + r() * .7) - S2 * .3, .7), '#fbf8f0', .95);
        if (kind === 'blackthorn' && season === 'autumn' && r() < .5) for (let b = 0; b < 3; b++) B.f(B.circ(fx + (r() - .5) * S2 * 1.4, fy - UP * (.4 + r() * .5) - S2 * .3, .9), '#4a5a8a', .95);
        if (kind === 'hazel' && (season === 'spring' || winter) && r() < .4) for (let b = 0; b < 3; b++) B.s(`M${fx + (r() - .5) * S2 * 1.5} ${fy - UP * (.5 + r() * .5)}l.4 2.6`, '#d8c86a', 1, .9);
        if (kind === 'nettle' && !winter) { for (let b = 0; b < 4; b++) { const px = fx + (r() - .5) * S2 * 1.6; B.s(`M${px} ${fy}l${(r() - .5) * 2} ${-UP - 3 - r() * 4}`, '#4e6a34', 1, .85); } if (season === 'summer' && r() < .35) { const px = fx + (r() - .5) * S2; for (let b = 0; b < 4; b++) B.f(B.ell(px + (r() - .5), fy - UP - 3 - b * 2.2, 1.2, 1), '#c86aa8', .95); } }
        if (kind === 'heath' && P.bloom !== null && (season === 'summer' || season === 'autumn') && r() < .6) for (let b = 0; b < 3; b++) B.f(B.circ(fx + (r() - .5) * s * 1.4, fy - up * (.5 + r() * .5) - s * .3, .8), '#c08ac4', .9);
        if (kind === 'gorse' && bloom && r() < .3) for (let b = 0; b < 2; b++) B.f(B.circ(fx + (r() - .5) * s * 1.2, fy - up * (.5 + r() * .5) - s * .3, .75 + r() * .4), bloom, .9);
        if (kind === 'bracken' && !winter) for (let f = 0; f < 3; f++) { const a = -Math.PI / 2 + (f - 1) * .7 + (r() - .5) * .3, l = 5 + r() * 4; B.s(`M${fx} ${fy - up * .4}q${Math.cos(a) * l * .4 + 1.4} ${-l * .5} ${Math.cos(a) * l} ${Math.sin(a) * l}`, lv2[3], 1, .85); }
        if (fell) continue;
        if (bloom && r() < .35) for (let b = 0; b < 2; b++) B.f(B.circ(fx + (r() - .5) * s * 1.4, fy - up * (.4 + r() * .6) - s * .3, .9 + r() * .5), bloom, .95);   // dog-roses, may blossom or blackberries
        if (!winter && r() < .12) B.s(`M${fx} ${fy - up}q${3 + r() * 3} ${-3 - r() * 3} ${6 + r() * 5} ${-1 - r() * 2}`, '#5a3a36', .9, .8);   // a bramble's arching stem
      }
      if (fell && r() < .35) { const sx = L0 + r() * (R0 - L0), sy = T0 + (F0 - T0) * (.5 + r() * .5); B.stone(r, sx, sy, 3.6 + r() * 3, 2.4 + r() * 1.4, { rock: '#a8a294', rockLo: '#848072', rockHi: '#cac4b4', rockDk: '#4e4a42' }, winter ? '#f2f4f6' : '#b8b46a'); }
      // its foot: darker, with long grass and nettles where it meets the turf
      if (front) { B.f(B.blob(r, (L0 + R0) / 2, F0, (R0 - L0) * .55, 2.6, 8, .45), 'rgba(26,36,18,.32)'); if (!winter) for (let k = 0; k < 4; k++) { const px = L0 + r() * (R0 - L0); B.s(`M${px} ${F0 + 1.5}l${(r() - .5) * 2} ${-4 - r() * 3}M${px + 1.4} ${F0 + 1.5}l${(r() - .5) * 2} ${-3 - r() * 3}`, r() < .5 ? '#5e7a36' : '#86964c', 1, .85); } }
    }
    // the sign: at the thicket's front, on a stretch clear of squares and landmarks
    const at = signSpot(plot, edges), row = at && gardenLandCell(at[0], at[1]); if (!row || !lit(at[0], at[1])) return;
    // One sign to a field: locked plots of the same level lying within a few cells of each other are one stretch of
    // scrub, and only the plot whose front is nearest a path carries its sign (a sign on every plot read as a grid of menu
    // buttons, three to ten to a view: art director, highlands round 2).
    if (fieldSignOwner(lv).get(plot.id) === true) sign(B, (at[0] + .5) * cw, W.sky + (at[1] + 1) * ch + 1, row, lv);
  }
  let fieldMemo = null;
  function fieldSignOwner(lv) {
    if (fieldMemo && fieldMemo.lv === lv && fieldMemo.src === plotsMemo) return fieldMemo.map;
    const high = plots().filter(p => p.edges.length && regionKind(p.cells[0][0], p.cells[0][1]) !== 'rail' && locked(p.cells[0][0], p.cells[0][1], lv));
    const lvOf = p => (gardenLandCell(p.cells[0][0], p.cells[0][1]) || {}).lv, par = new Map(high.map(p => [p, p])), find = p => { while (par.get(p) !== p) p = par.get(p); return p; };
    for (let i = 0; i < high.length; i++) for (let j = i + 1; j < high.length; j++) { const a = high[i], b = high[j]; if (lvOf(a) !== lvOf(b)) continue; if (a.cells.some(c => b.cells.some(d => Math.abs(c[0] - d[0]) <= 3 && Math.abs(c[1] - d[1]) <= 2))) { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); } }
    const routePts = ((typeof gardenIslandData === 'function' ? gardenIslandData() : {}).routes || []).filter(rt => rt.points && rt.tier !== 'plaza').flatMap(rt => rt.points);
    const nearPath = s => routePts.reduce((m, q) => Math.min(m, Math.hypot(q[0] - s[0] - .5, (q[1] - s[1] - 1) * 1.3)), 99);
    const best = new Map();
    for (const p of high) { const s = signSpot(p, p.edges.filter(([x, y, side]) => !byStatic(x + (side === 'e' ? 1 : side === 'w' ? 0 : .5), y + (side === 's' ? 1 : side === 'n' ? 0 : .5)))); if (!s) continue; const g = find(p), d = nearPath(s), o = best.get(g); if (!o || d < o.d) best.set(g, { p, d }); }
    const map = new Map(); for (const p of high) map.set(p.id, false); for (const o of best.values()) map.set(o.p.id, true);
    fieldMemo = { lv, src: plotsMemo, map }; return map;
  }
  function signSpot(plot, edges) {
    if (plot._sign !== undefined) return plot._sign;
    const fronts = edges.filter(e => e[2] === 's').map(e => [e[0], e[1]]); if (!fronts.length) return plot._sign = null;
    const yMax = Math.max(...fronts.map(f => f[1])), low = fronts.filter(f => f[1] === yMax && !inPlaza(f[0] + .5, f[1] + 1) && !byStatic(f[0] + .5, f[1] + 1.2)).sort((a, b) => a[0] - b[0]);
    return plot._sign = low[low.length >> 1] || null;
  }
  function fence(B, r, P, edges, W, season, cb, plot) {
    const cw = W.cellW, ch = W.cellH, lv = level(), wood = ['#8a7454', '#a88e66', '#5e4c36'], RH = RUN_H();
    const fronts = [], inset = 3, drawn = new Set();
    // in the high country a run beside a landmark is left out (see byStatic)
    const high = edges.length && regionKind(edges[0][0], edges[0][1]) !== 'rail';
    if (high) edges = edges.filter(([x, y, side]) => { const mx = x + (side === 'e' ? 1 : side === 'w' ? 0 : .5), my = y + (side === 's' ? 1 : side === 'n' ? 0 : .5); return !byStatic(mx, my); });
    const tone = plot ? nz(plot.cells[0][0] / 3.7, plot.cells[0][1] / 2.9, 493) : .5;
    if (high && plot) { if (locked(plot.cells[0][0], plot.cells[0][1], lv)) scrub(B, P, plot, edges, W, season, cb, lv, tone); return; }
    for (const [x, y, side, nx, ny] of edges) if (locked(x, y, lv) && !locked(nx, ny, lv)) drawn.add(x + ',' + y + side);
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
        const x0 = x * cw, y0 = W.sky + y * ch, kind = regionKind(x, y), h = RH[kind] * (kind === 'rail' ? .9 : 1.05);
        if (side === 's' || side === 'n') { const yy = side === 's' ? y0 + ch - inset : y0 + northFoot(kind); runs.push([x0, yy, x0 + cw, yy, h]); }
        else { const xx = side === 'e' ? x0 + cw - inset : x0 + inset; runs.push([xx, y0 + sideFrom(x, y, kind), xx, y0 + ch, h]); }
      }
      if (runs.length) GardenPaintGround.castRuns(B.cx, runs, { a: .26 });
    }
    for (const [x, y, side, nx, ny] of edges) {
      if (!locked(x, y, lv) || locked(nx, ny, lv)) continue;   // (a plot that is yours, or two locked plots side by side: no fence between)
      if (side === 's') fronts.push([x, y]);
      if (!seen(x, y)) continue;
      const r = rOf(x, y, side), x0 = x * cw, y0 = W.sky + y * ch, kind = regionKind(x, y), hh = RH[kind], from = side === 'e' || side === 'w' ? sideFrom(x, y, kind) : 0;
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
    // one sign per plot, on the front (south) fence, the middle of its lowest run
    if (fronts.length) {
      const yMax = Math.max(...fronts.map(f => f[1])), low = fronts.filter(f => f[1] === yMax).sort((a, b) => a[0] - b[0]);
      // (in the high country the sign stands on a stretch of the front run clear of squares and landmarks, or on none)
      const clear = high ? low.filter(f => !inPlaza(f[0] + .5, f[1] + 1) && !byStatic(f[0] + .5, f[1] + 1.2)) : low, at = clear[clear.length >> 1];
      const row = at && gardenLandCell(at[0], at[1]); if (row) sign(B, (at[0] + .5) * cw + (clear.length % 2 || high ? 0 : -cw / 2), W.sky + (at[1] + 1) * ch - 1, row, lv);
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
