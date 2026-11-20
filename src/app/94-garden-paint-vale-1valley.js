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
  const regionKind = (x, y) => { const r = typeof gardenIslandRegionAt === 'function' ? gardenIslandRegionAt(x + .5, y + .5) : null, id = r ? String(r.id) + ' ' + String(r.theme || '') : ''; return /mountain|north-headland/.test(id) ? 'wall' : /orchard/.test(id) ? 'hedge' : /east-mill|valley/.test(id) ? 'field' : 'rail'; };

  const lighten = (c) => { const n = parseInt(c.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * .25)); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
  // Heights from the size standard (GARDEN_SIZE in 94-garden-0camera.js, docs/dev/PAINT_KIT.md "Scale"): a fence or hedge .55 H, a field wall .8 H.
  // These are painted into the ground, so a run along a plot's north edge stands far enough inside the plot that its top meets the edge:
  // you stand behind it with nothing of it drawn over your feet.
  const RUN_H = () => ({ rail: gardenSizePx('fence', .5), hedge: gardenSizePx('hedge', .5), wall: gardenSizePx('wall', 0), field: gardenSizePx('hedge', .9) });
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
  // A valley field's hawthorn hedgerow (19 Nov 2026, the valley chain): not clipped, a lumpy living line whose height wanders
  // along its length (by place, so two cells' runs meet), dark at its foot and inside, sunlit on its upper left, with may
  // blossom in spring, dog-rose in summer and haws in autumn, and the meadow grown up its foot. hh tall.
  const HAW = { summer: ['#2a4222', '#3a5a2c', '#527638', '#729848', '#9cbc6a'], spring: ['#2c4622', '#41622c', '#5a8238', '#7ea84a', '#aed072'], autumn: ['#2e3a1c', '#46522a', '#626a34', '#868440', '#aca45c'], winter: ['#3a3428', '#4e4636', '#635a46', '#7a7058', '#958a6e'] };
  // Each field its own hedge (round 2), so thirty fields are not one hedge stamped thirty times: most are hawthorn, some
  // blackthorn (darker and bluer, a little taller, white with blossom before its leaves in spring, sloes in autumn), some
  // hazel and field maple (lighter and rounder, cut lower, gold in autumn). Chosen by place (the field's first edge).
  const HEDGES = [null,
    { summer: ['#1e3020', '#2c4430', '#3e5c40', '#587a52', '#7e9a70'], spring: ['#26382a', '#3a5038', '#567046', '#7e9466', '#e8ece0'], autumn: ['#262a1c', '#3a4026', '#545a30', '#74783e', '#94945a'], winter: ['#2e2a28', '#423c36', '#58504a', '#6e665e', '#88807a'], fl: { spring: '#fbfbf4', summer: null, autumn: '#3c3e66', winter: null }, k: 1.08 },
    { summer: ['#2e4824', '#46662e', '#62863c', '#86a84e', '#aec66e'], spring: ['#304c24', '#4a6e2e', '#68903e', '#8eb456', '#bcd67e'], autumn: ['#3a3c1e', '#545626', '#706c30', '#8e8640', '#aca456'], winter: ['#4a4030', '#5e5440', '#74684e', '#8a7e60', '#a49878'], fl: { spring: '#e8d878', summer: null, autumn: '#8a6a3a', winter: null }, k: .86 },
    // (3: the wet woods' scrub thicket, willow and alder scrub, grey-green and rough; round 3)
    { summer: ['#1e2c1e', '#2e4430', '#46603e', '#6a8460', '#94a888'], spring: ['#22321e', '#344c2e', '#4e6a3e', '#749060', '#a4bc8a'], autumn: ['#2a2c1c', '#3e4226', '#5a5a32', '#7a763e', '#9a9058'], winter: ['#2e2a26', '#423c34', '#585046', '#6e665a', '#8a8274'], fl: { spring: '#f2f0dc', summer: '#f0e8ee', autumn: '#2a1e30', winter: null }, k: 1 }];
  let hedgeVar = 0;
  // which hedge each field wears, by its first edge cell: by place, and never the same as the nearest field already given one
  const hedgeOf = new Map();
  function chooseHedges(list) {
    hedgeOf.clear(); const G0 = window.GardenPaintGround, done = [];
    for (const p of list) { const e0 = p.edges[0]; if (!e0) continue; const cx = p.cells.reduce((a, c) => a + c[0], 0) / p.cells.length, cy = p.cells.reduce((a, c) => a + c[1], 0) / p.cells.length;
      const q = G0 && G0.hash ? G0.hash(e0[0], e0[1], 4471) % 20 : 0; let v = q < 10 ? 0 : q < 15 ? 1 : 2;
      const nearOnes = done.filter(o => Math.hypot(o.x - cx, (o.y - cy) * 1.3) < 4.2).map(o => o.v); if (nearOnes.includes(v)) { const free = [0, 1, 2].filter(k => !nearOnes.includes(k)); v = free.length ? free[q % free.length] : v; }
      done.push({ x: cx, y: cy, v }); hedgeOf.set(e0[0] + ',' + e0[1], v); }
  }
  function fieldHedge(B, r, P, x0, y0, horiz, len, season, hh) {
    if (len < 2) return;
    const HV = HEDGES[hedgeVar], C = (HV && HV[season]) || HAW[season] || HAW.summer, flOf = s => HV ? HV.fl[s] : s === 'spring' ? '#f6f2e6' : s === 'summer' ? '#f2b8c4' : s === 'autumn' ? '#b02a22' : null; if (HV) hh *= HV.k;
    const G = window.GardenPaintGround, wob = (u, v) => G && G.noise ? G.noise(u / 26, v / 26, 4417) : .5;
    hh = hh || 24;
    if (horiz) {
      B.s(`M${x0} ${y0 + 1.5}h${len}`, '#26301a', 5, .18);
      const n = Math.max(2, Math.round(len / 7));
      // the body: lumps along the run, each its own height (from the place), dark first, then the lit caps
      for (const pass of [0, 1, 2]) for (let i = 0; i <= n; i++) {
        const px = x0 + (i / n) * len + (r() - .5) * 2, hgt = hh * (.78 + wob(px, y0) * .42), rr = 5.2 + r() * 2.2;
        if (pass === 0) B.f(B.blob(r, px, y0 - hgt * .45, rr + 1.5, hgt * .55, 7, .35), C[0], 1);
        else if (pass === 1) B.f(B.blob(r, px - .8, y0 - hgt * .62, rr, hgt * .4, 7, .4), C[1 + (r() < .45 ? 1 : 0)], .95);
        else { B.f(B.blob(r, px - 1.6, y0 - hgt * .82, rr * .7, hgt * .2, 6, .45), C[3], .9); if (r() < .6) B.f(B.blob(r, px - 2.4, y0 - hgt * .9, rr * .38, hgt * .09, 6, .5), C[4], .85); }
      }
      // leaf texture and flowers or haws in the sunlit face
      for (let i = 0; i < len / 3; i++) { const px = x0 + r() * len, py = y0 - hh * (.25 + r() * .6); B.f(B.ell(px, py, 1.4, .9), C[2 + Math.floor(r() * 3)], .7); }
      const fl = flOf(season);
      if (fl) for (let i = 0; i < len / (season === 'spring' ? 5 : 11); i++) { const px = x0 + r() * len, py = y0 - hh * (.45 + r() * .45); if (wob(px * 2.3, y0 + 91) < .5) continue; B.f(B.circ(px, py, season === 'summer' ? 1.5 : 1.05), fl, .95); if (season === 'summer') B.f(B.circ(px, py, .55), '#f8e070', 1); }
      // the shade inside its foot, and the meadow grown up in front of it
      B.f(B.rr(x0 - 1, y0 - 4.5, len + 2, 4.5, 2), 'rgba(20,32,14,.32)');
      if (season !== 'winter') for (let t = 0; t < len; t += 3.2) { const px = x0 + t + r() * 2, l = 3 + r() * 4.5; B.s(`M${px} ${y0 + 1.2}q${(r() - .5) * 2} ${-l * .5} ${(r() - .5) * 3.5} ${-l}`, r() < .5 ? (P.lawnLo || '#5a7a3a') : '#6f8a40', 1, .9); }
    } else {
      // a side run, seen nearly end on from the south: a lumpy band climbing the screen, its top lit on the left. It starts
      // under the north run's lit top and stops short of the south run's foot, so a corner is one hedge, not a post.
      const ys = y0 + 2, ye = y0 + len - 4; if (ye <= ys) return;
      B.s(`M${x0 + 2.5} ${ys}V${ye + 3}`, '#26301a', 6, .16);
      for (let py = ys; py <= ye; py += 3.6) { const hgt = hh * (.74 + wob(x0, py) * .36); B.f(B.blob(r, x0 + .6, py - hgt * .42, 5.6, hgt * .32, 7, .35), C[0], 1); }
      for (let py = ys + 1; py <= ye; py += 4.2) { const hgt = hh * (.74 + wob(x0, py) * .36); B.f(B.blob(r, x0 - .6, py - hgt * .6, 4.4, hgt * .22, 7, .4), C[1 + (r() < .5 ? 1 : 0)], .95); B.f(B.blob(r, x0 - 1.8, py - hgt * .76, 2.4, hgt * .1, 6, .45), C[3], .85); }
      const fl = flOf(season);
      if (fl && wob(x0 * 3, y0) > .45) for (let i = 0; i < len / 16; i++) B.f(B.circ(x0 + (r() - .6) * 6, ys + r() * (ye - ys) - hh * (.4 + r() * .3), 1.1), fl, .95);
    }
  }
  // the fallow inside a locked valley field: tussocks, seed heads and a few flowers, by place (each cell its own stream)
  function fallow(B, P, cells, W, season, cb) {
    const G = window.GardenPaintGround; if (!G || !G.rng || !G.hash) return;
    const cw = W.cellW, ch = W.cellH, lv = level(), grass = season === 'winter' ? ['#8c8e70', '#a49e7c', '#6e7458'] : season === 'autumn' ? ['#8e8c48', '#b0a058', '#6e7a3a'] : ['#5e7e38', '#7e9a44', '#a6aa5a'];
    const own = new Set(cells.map(c => c[0] + ',' + c[1]));
    for (const [x, y] of cells) {
      const x0 = x * cw, y0 = W.sky + y * ch; if (cb && (x0 + cw < cb[0] - 4 || x0 > cb[2] + 4 || y0 + ch < cb[1] - 12 || y0 > cb[3] + 4) || !locked(x, y, lv)) continue;
      const r = G.rng(G.hash(x + 3, y + 5, 4501)), edge = !own.has(x + ',' + (y - 1));
      // the grass grown long, a soft lighter wash of seed heads over it
      B.f(B.blob(r, x0 + cw / 2, y0 + ch / 2, cw * .42, ch * .36, 8, .3), grass[2], season === 'winter' ? .18 : .22);
      for (let k = 0; k < 7; k++) { const px = x0 + 5 + r() * (cw - 10), py = y0 + 7 + r() * (ch - 9), n = 5 + Math.floor(r() * 4); for (let b = 0; b < n; b++) { const l = 4 + r() * 6, lean = (b - n / 2) * .9 + (r() - .5); B.s(`M${px + (b - n / 2) * .9} ${py}q${lean * .5} ${-l * .55} ${lean * 1.3} ${-l}`, grass[b % 3 === 2 ? 1 : 0], 1, .85); } }
      if (season === 'summer' || season === 'spring') for (let k = 0; k < 4; k++) { const px = x0 + 4 + r() * (cw - 8), py = y0 + 6 + r() * (ch - 8); if (r() < .5) { B.s(`M${px} ${py}v-7`, '#6e6a3a', .8, .8).f(B.ell(px, py - 8, .9, 2.2), '#a8442a', .85); } else B.f(B.circ(px, py - 3, 1.1), season === 'spring' ? '#f4f0e2' : '#f2d43a', .95); }
      if (edge && season !== 'winter') for (let k = 0; k < 3; k++) { const px = x0 + 6 + r() * (cw - 12), py = y0 + 8 + r() * 4; B.s(`M${px} ${py}v-8`, '#6e8a44', .8, .8); for (let u = 0; u < 4; u++) B.f(B.circ(px + (u - 1.5) * 1.6, py - 8.5 + Math.abs(u - 1.5) * .5, 1.1), '#f6f4ea', .95); }
    }
  }
  // a five-bar field gate, shut, hung between two stout posts, gw wide and hh tall, its foot at y0
  function fieldGate(B, gx, y0, gw, hh, season) {
    const w = ['#6e5a40', '#8e7654', '#b49c76', '#4a3c2c'], top = y0 - hh * .86;
    B.f(B.rr(gx - 1, y0 - 2, gw + 2, 4, 2), 'rgba(40,40,24,.22)');
    for (let i = 0; i < 5; i++) { const yy = y0 - 3 - i * (hh * .82 - 3) / 4; B.s(`M${gx + 2} ${yy}H${gx + gw - 2}`, w[i === 4 ? 1 : 0], i === 4 ? 2.4 : 1.7, .95).s(`M${gx + 2} ${yy - .7}H${gx + gw - 2}`, w[2], .6, .55); }
    B.s(`M${gx + 3} ${y0 - 3}L${gx + gw - 3} ${top + 1}`, w[0], 1.7, .95).s(`M${gx + gw * .5} ${y0 - 3}V${top}`, w[0], 1.4, .9);
    for (const px of [gx, gx + gw]) B.f(B.rect(px - 2.2, y0 - hh - 1, 4.4, hh + 1.5), w[3]).f(B.rect(px - 2.2, y0 - hh - 1, 1.6, hh + 1.5), w[1], .75).f(B.ell(px, y0 - hh - 1, 2.2, .9), w[2], .9);
    if (season !== 'winter') for (let k = 0; k < 6; k++) { const px = gx + 2 + k * (gw - 4) / 5; B.s(`M${px} ${y0 + 1}q-1 -2.5 -.4 -5`, '#6f8a40', 1, .85); }
  }
  // the sign on a locked plot's fence: a small board on a post saying what it needs, its level or (once you have that) its price
  function sign(B, x, y, row, lv, hung) {
    const lvNeed = row.lv || 0, coin = lv >= lvNeed && !!row.buy, txt = lv < lvNeed ? 'Lv ' + lvNeed : row.buy ? String(row.buy) : ''; if (!txt) return;
    if (hung) {   // (round 3: a small weathered board wired to the gate's top rail, not a plate on its own post)
      // (fix round 2: smaller and in the gate's own weathered wood, a tag rather than a plate: it was the loudest thing in every frame)
      const cx = B.cx; cx.save(); cx.font = '700 5.4px system-ui, sans-serif';
      const w = Math.max(12, cx.measureText(txt).width + (coin ? 5 : 0) + 4), x0 = x - w / 2, y0 = y - 8.5;
      B.s(`M${x0 + 2} ${y0 + 1}l1.2 -2M${x0 + w - 2} ${y0 + 1}l-1.2 -2`, '#4a4a46', .5, .9);
      B.f(B.rr(x0 + .6, y0 + .8, w, 7.6, 1.3), 'rgba(30,24,16,.26)').f(B.rr(x0, y0, w, 7.6, 1.3), '#ad9268').f(B.rr(x0, y0, w, 2, 1), '#c4aa7e', .6).s(B.rr(x0, y0, w, 7.6, 1.3), '#5e4a30', .6, .85);
      let tx = x0 + 2; if (coin) { B.f(B.circ(tx + 1.8, y0 + 3.9, 1.8), '#d8a830').f(B.circ(tx + 1.8, y0 + 3.9, .9), '#f0d070'); tx += 5; }
      cx.fillStyle = '#3a2a18'; cx.textBaseline = 'middle'; cx.fillText(txt, tx, y0 + 4.1); cx.restore(); return;
    }
    if (window.GardenPaintGround && GardenPaintGround.castShadow) GardenPaintGround.castShadow(B.cx, x, y, 14, 26, { a: .24 }); else B.f(B.ell(x + 1, y + 1, 7, 2), 'rgba(40,40,24,.25)');   /* (the board's shadow, thrown the way every other is) */
    B.f(B.rect(x - 1.2, y - 15, 2.4, 15), '#5e4c36').f(B.rect(x - 1.2, y - 15, 1, 15), '#8a7454', .7);
    const cx = B.cx; cx.save(); cx.font = '700 7.5px system-ui, sans-serif';
    const w = Math.max(16, cx.measureText(txt).width + (coin ? 7 : 0) + 6), x0 = x - w / 2, y0 = y - 26;
    B.f(B.rr(x0 + .8, y0 + 1, w, 12, 2), 'rgba(30,24,16,.3)').f(B.rr(x0, y0, w, 12, 2), '#c9a876').f(B.rr(x0, y0, w, 3.5, 1.5), '#dcc092', .8).s(B.rr(x0, y0, w, 12, 2), '#6e5434', .8, .9);
    let tx = x0 + 3;
    if (coin) { B.f(B.circ(tx + 2.5, y0 + 6, 2.8), '#e8b830').f(B.circ(tx + 2.5, y0 + 6, 1.5), '#f6d870'); tx += 7; }
    cx.fillStyle = '#3e2c1a'; cx.textBaseline = 'middle'; cx.fillText(txt, tx, y0 + 6.4); cx.restore();
  }
  /* ---------- round 3 (19 Nov 2026): each valley field what its name says ---------- */
  // The critics' verdict on round 2: thirty hedge boxes with the same gate and plate, a car park of pens, and the Furrows
  // the same meadow as everywhere else. A field now takes its look from its layout name: allotment beds behind low hazel
  // hurdles (the Furrows, the show beds), a cropped field in a hawthorn hedgerow (ploughed loam, black soil, potatoes,
  // maize, the giant veg), a wet meadow cut off by its own ditch with rushes (the banks, beds and reaches by the water),
  // or a wet alder wood in shade behind a scrub thicket (the carr, the otter run, the far willows). One way in each: a
  // wicket, a field gate, a plank over the ditch, a stile. Names are layout data; no cell is named here.
  const fieldKindOf = id => { const s = String(id || ''); return /carr|alder|otter|willow|withy|osier|copse/.test(s) ? 'wood' : /marsh|bittern|bulrush|dragonfly|iris|kingcup|marigold|moorhen|heron|boat|sedge|frog|bank|reach|isle|lark|reed/.test(s) ? 'wet' : /loam|soil|potato|maze|giant|hay|corn|wheat|barley/.test(s) ? 'crop' : 'allot'; };
  const FH = () => ({ crop: gardenSizePx('hedge', .9), allot: gardenSizePx('fence', 0), wood: gardenSizePx('hedge', 1) * 1.1, wet: gardenSizePx('hedge', .5) });
  // Where a landmark is painted over a field (the layout stands the barn and the mill wheel on two plots), nothing of the
  // field is painted under it: no hedge, gate or sign shows through the wheel's spokes or inside a fading roof (the
  // building is what stops you there). The landmark's own picture box, from its painter, a little inside its edges.
  let coverMemo = null;
  function covers() {
    if (coverMemo) return coverMemo;
    const W = GARDEN_WORLD, T = window.GardenPaintedProps && GardenPaintedProps.paintTable, out = [];
    const rows = typeof GARDEN_LAND_SIGHTS !== 'undefined' ? GARDEN_LAND_SIGHTS : [];
    if (T) for (const s of (typeof gardenIslandData === 'function' ? gardenIslandData().static || [] : [])) {
      const row = rows.find(q => q.id === s.id), Pn = row && row.art && T['sight:' + row.art]; if (!Pn || !Pn.box) continue;
      const fx = (s.x + (s.w || 1) / 2) * W.cellW, foot = W.sky + (s.y + (s.h || 1)) * W.cellH - 3, b = Pn.box;
      out.push([fx + b[0] + 14, foot + b[1] + 22, fx + b[2] - 14, foot + b[3] - 2]);
    }
    return coverMemo = out;
  }
  const covered = (px, py) => covers().some(b => px > b[0] && px < b[2] && py > b[1] && py < b[3]);

  // a woven hazel hurdle along one edge (allotments), hh tall
  function hurdleRun(B, r, P, x0, y0, horiz, len, season, hh) {
    const w = season === 'winter' ? ['#6a5a46', '#8a7860', '#4a3e30', '#a8977c'] : ['#7a6446', '#94795a', '#4e3e2a', '#bea47a'];
    if (horiz) {
      B.s(`M${x0} ${y0 + 1.5}h${len}`, '#2e3420', 4, .16);
      const sails = Math.max(2, Math.round(len / 8));
      for (let i = 0; i <= sails; i++) { const px = x0 + i * len / sails + (r() - .5); B.s(`M${px} ${y0 + 1}V${y0 - hh - 1.5}`, w[2], 1.7, .95); }
      const rows = Math.max(4, Math.round(hh / 3.1));
      for (let k = 0; k < rows; k++) {
        const yy = y0 - 2.2 - k * (hh - 3) / (rows - 1), ph = (k & 1) ? 0 : Math.PI; let d = `M${x0} ${yy}`;
        for (let t = 2; t <= len + .1; t += 2) d += `L${x0 + t} ${(yy + Math.sin(t / len * sails * Math.PI + ph) * 1.1).toFixed(2)}`;
        B.s(d, w[k % 3 === 2 ? 1 : 0], 2.7, .97).s(d, w[3], .7, .35 + (k / rows) * .35);
      }
      B.s(`M${x0} ${y0 - hh}h${len}`, w[1], 1.5, .9).s(`M${x0} ${y0 - hh - .6}h${len}`, w[3], .6, .6);   // the twisted binding along the top
      B.f(B.rect(x0, y0 - 3.5, len, 3.5), 'rgba(24,30,16,.28)');
      if (season !== 'winter') for (let t = 0; t < len; t += 2.6) { const px = x0 + t + r() * 2, l = 2.5 + r() * 4.5; B.s(`M${px} ${y0 + 1.2}q${(r() - .5) * 2} ${-l * .5} ${(r() - .5) * 3} ${-l}`, r() < .5 ? (P.lawnLo || '#5a7a3a') : '#6f8a40', 1, .9); }
    } else {
      const ys = y0 + 2, ye = y0 + len - 3; if (ye <= ys) return;
      B.s(`M${x0 + 2} ${ys}V${ye + 2}`, '#2e3420', 4, .14);
      B.f(B.rect(x0 - 1.9, ys - hh, 3.8, ye - ys + hh), w[2]);
      for (let py = ys - hh + 1.5; py < ye; py += 2.4) B.s(`M${x0 - 1.9} ${py}h3.8`, w[(Math.round(py * 3) & 1) ? 0 : 1], 1.4, .9);
      B.s(`M${x0 - 1.2} ${ys - hh}V${ye - hh * .3}`, w[3], .8, .55);
    }
  }
  // a small ledged wicket gate, shut, between two posts
  function wicket(B, gx, y0, gw, hh) {
    const w = ['#6e5a40', '#8e7654', '#b49c76', '#4a3c2c'];
    B.f(B.rect(gx - 1, y0 - 2, gw + 2, 3.5), 'rgba(40,40,24,.2)');
    for (let k = 0; k <= 4; k++) { const px = gx + 2 + k * (gw - 4) / 4; B.s(`M${px} ${y0 - 2.5}V${y0 - hh * .88}`, w[k & 1 ? 1 : 0], 1.5, .95); }
    for (const yy of [y0 - 4, y0 - hh * .78]) B.s(`M${gx + 1} ${yy}H${gx + gw - 1}`, w[0], 1.8, .95).s(`M${gx + 1} ${yy - .7}H${gx + gw - 1}`, w[2], .55, .6);
    B.s(`M${gx + 2.5} ${y0 - 4}L${gx + gw - 2.5} ${y0 - hh * .78}`, w[0], 1.4, .9);
    for (const px of [gx, gx + gw]) B.f(B.rect(px - 1.9, y0 - hh - 2, 3.8, hh + 2.5), w[3]).f(B.rect(px - 1.9, y0 - hh - 2, 1.3, hh + 2.5), w[1], .75).f(B.ell(px, y0 - hh - 2, 1.9, .8), w[2], .9);
  }
  // a wet ditch cut along one edge, inside the field (wet meadows): mud lips, still water with the sky in it, the far
  // side's shade, rushes leaning over from the field side (`inner`: which way the field lies, 1 down or right, -1 up or left)
  function ditchRun(B, r, P, x0, y0, horiz, len, season, inner) {
    const wint = season === 'winter', water = wint ? '#a4b4ba' : '#6a8a92', sky = wint ? '#e4ecee' : '#b8d0d4', mud = wint ? '#6e6a58' : '#4e4630';
    const rush = wint ? ['#8a8660', '#a49c72', '#6e6a4a'] : season === 'autumn' ? ['#6e7436', '#8e8a44', '#4e5a2a'] : ['#3a6630', '#568a3a', '#2c4e26'];
    if (horiz) {
      // (a band that wanders a little, by place, so the ditch along a row of cells is one cut and never a ruled line)
      const G = window.GardenPaintGround, wv = u => G && G.noise ? (G.noise(u / 14, y0 / 14, 4651) - .5) * 2.6 : 0;
      const band = (a, b) => { const top = [], bot = []; for (let t = 0; t <= len + .01; t += 3) { const px = x0 + Math.min(t, len), d = wv(px); top.push([px, y0 + a + d]); bot.unshift([px, y0 + b + d * .7]); } return B.poly(top.concat(bot)); };
      B.f(band(-5, 4.5), mud, .45);
      B.f(band(-3.2, 2.8), '#2e3a30', .7).f(band(-2, 2.6), water, .95).f(band(-2, -.4), '#24302a', .4).f(band(1.2, 2.3), sky, .5);
      for (let t = 0; t < len; t += 5) if (r() < .5) B.f(B.ell(x0 + t + r() * 4, y0 + .3, 1.6 + r() * 2, .5), sky, .55);   // light on the water
      for (let t = 0; t < len; t += 2.2) {   // the grass leaning over both lips, rushes on the field side
        const px = x0 + t + r() * 1.5; B.s(`M${px} ${y0 + 5}q${(r() - .5) * 2} -2 ${(r() - .5) * 3} -4.5`, P.lawnLo || '#5a7a3a', 1, .85);
        const ry = inner < 0 ? y0 - 3.4 : y0 + 4.8, l = (inner < 0 ? 7 : 4.5) + r() * (inner < 0 ? 7 : 3); if (r() < .75) B.s(`M${px} ${ry}q${(r() - .5) * 2.5} ${-l * .55} ${(r() - .5) * 4} ${-l}`, rush[Math.floor(r() * 3)], 1.1, .95);
      }
    } else {
      B.f(B.rect(x0 - 4.5, y0, 9, len), mud, .45);
      B.f(B.rect(x0 - 3, y0, 6, len), '#2e3a30', .7).f(B.rect(x0 - 2, y0, 4.2, len), water, .95).f(B.rect(x0 - 2, y0, 1.4, len), '#24302a', .35).f(B.rect(x0 + 1, y0, 1, len), sky, .45);
      for (let t = 0; t < len; t += 2.4) { const py = y0 + t + r() * 1.5, sx = x0 + inner * (3.8 + r() * 1.5), l = 5 + r() * 6; if (r() < .7) B.s(`M${sx} ${py}q${(r() - .5) * 2} ${-l * .55} ${inner * r() * 2.5} ${-l}`, rush[Math.floor(r() * 3)], 1.1, .95); }
    }
  }
  // a fringe of rushes and flag along a wet field's edge, dense and uneven, hh tall: what you see stops you there
  function rushRun(B, r, P, x0, y0, horiz, len, season, hh) {
    const wint = season === 'winter', C = wint ? ['#7a7656', '#948e68', '#a8a07a', '#5e5a42'] : season === 'autumn' ? ['#5a6230', '#7a7a3a', '#9a9048', '#3e4626'] : ['#2c4e26', '#3e6a30', '#5a8a3a', '#203a1e'];
    const G = window.GardenPaintGround, wob = (u, v) => G && G.noise ? G.noise(u / 18, v / 18, 4429) : .5;
    if (horiz) {
      B.f(B.rect(x0, y0 - 3, len, 4), C[3], .5);
      for (let t = 0; t < len; t += 1.7) { const px = x0 + t + (r() - .5) * 1.4, l = hh * (.45 + wob(px, y0) * .7) * (.7 + r() * .4), lean = (r() - .5) * 5; B.s(`M${px} ${y0}q${lean * .3} ${-l * .55} ${lean} ${-l}`, C[Math.floor(r() * 3)], 1.05, .95); if (!wint && r() < .05) B.f(B.ell(px + lean, y0 - l - 1.5, .9, 2.6), '#6a4a2a', .95); if (season === 'summer' && r() < .025) B.f(B.ell(px + lean * .8, y0 - l * .8, 1.6, 1.3), '#f2d43a'); }
    } else {
      const ys = y0 + 2, ye = y0 + len - 2; if (ye <= ys) return;
      for (let py = ys; py <= ye; py += 1.6) for (let k = 0; k < 2; k++) { const px = x0 + (r() - .5) * 5, l = hh * (.45 + wob(x0, py) * .6) * (.7 + r() * .4), lean = (r() - .5) * 4; B.s(`M${px} ${py}q${lean * .3} ${-l * .55} ${lean} ${-l}`, C[Math.floor(r() * 3)], 1, .95); }
    }
  }
  // a plank over the ditch at the field's way in, a little gate on the field side
  function plankGate(B, gx, y0, gw, season) {
    const w = ['#6e5a40', '#8e7654', '#b49c76', '#4a3c2c'], hh = gardenSizePx('fence', 0) * .8;
    B.f(B.rect(gx + 3, y0 - 4, gw - 6, 9), 'rgba(30,30,20,.3)').f(B.rect(gx + 3, y0 - 3.5, gw - 6, 7.5), w[1]).f(B.rect(gx + 3, y0 - 3.5, gw - 6, 1.4), w[2], .7);
    for (let k = 1; k < 3; k++) B.s(`M${gx + 3 + k * (gw - 6) / 3} ${y0 - 3.5}v7.5`, w[3], .6, .6);
    wicket(B, gx + 2, y0 - 4, gw - 4, hh);
  }
  // a scrub thicket (the wet woods): willow and alder scrub with brambles arching out of it, rougher and taller than a hedge
  function thicketRun(B, r, P, x0, y0, horiz, len, season, hh) {
    const keep = hedgeVar; hedgeVar = 3; fieldHedge(B, r, P, x0, y0, horiz, len, season, hh); hedgeVar = keep;
    const br = season === 'winter' ? '#6a4a3a' : '#5a3a2e', lf = season === 'autumn' ? '#8a5a2a' : season === 'winter' ? null : '#3e5a2a';
    if (horiz) for (let t = 2; t < len; t += 7 + r() * 5) { const px = x0 + t, h = hh * (.5 + r() * .4), dx = (r() - .5) * 14; B.s(`M${px} ${y0 - h * .6}q${dx * .5} ${-h * .5} ${dx} ${-h * .1 + 4}`, br, 1, .9); if (lf) B.f(B.ell(px + dx * .6, y0 - h * .8, 1.8, 1.1), lf, .9); if (season === 'summer' && r() < .4) B.f(B.circ(px + dx * .8, y0 - h * .7, 1.1), '#f2e8f0', .95); if (season === 'autumn' && r() < .5) B.f(B.circ(px + dx * .8, y0 - h * .66, 1), '#2a1e30', .95); }
  }
  // a stile in the thicket: two posts, a top rail and a step
  function stile(B, gx, y0, gw, hh) {
    const w = ['#6e5a40', '#8e7654', '#b49c76', '#4a3c2c'];
    B.f(B.rect(gx, y0 - 2, gw, 3.5), 'rgba(40,40,24,.22)');
    for (const px of [gx + 2, gx + gw - 2]) B.f(B.rect(px - 1.9, y0 - hh * .8, 3.8, hh * .8 + 1), w[3]).f(B.rect(px - 1.9, y0 - hh * .8, 1.3, hh * .8 + 1), w[1], .75);
    B.s(`M${gx} ${y0 - hh * .72}H${gx + gw}`, w[0], 2.2, .95).s(`M${gx} ${y0 - hh * .72 - .8}H${gx + gw}`, w[2], .7, .65);
    B.f(B.rect(gx + 1, y0 - hh * .32, gw - 2, 3), w[1]).f(B.rect(gx + 1, y0 - hh * .32, gw - 2, 1), w[2], .7);
    B.s(`M${gx + 3} ${y0 - 1}l3 -5M${gx + gw - 3} ${y0 - 1}l-3 -5`, '#6e8a40', 1, .8);
  }

  /* what grows inside a field not yet yours, by its kind and name */
  const SOIL = { summer: ['#5e4230', '#74543a', '#483222', '#8e6e4e'], spring: ['#5a3e2c', '#70503a', '#44301e', '#8a6a4a'], autumn: ['#5e4430', '#765638', '#483222', '#8e6c48'], winter: ['#6a5848', '#80705e', '#54443a', '#c6cace'] };
  function soilBed(B, r, X0, Y0, X1, Y1, season, dark) {
    const S = SOIL[season] || SOIL.summer; B.f(B.rect(X0, Y0, X1 - X0, Y1 - Y0), dark ? '#3a2a1e' : S[0]);
    for (let i = 0; i < (X1 - X0) * (Y1 - Y0) / 26; i++) B.f(B.ell(X0 + r() * (X1 - X0), Y0 + r() * (Y1 - Y0), .7 + r() * 1.4, .45 + r() * .6), S[1 + Math.floor(r() * 3)], dark ? .35 : .6);
  }
  // one row of a crop along y, from X0 to X1
  function cropRow(B, r, kind, X0, X1, y, season, hmax) {
    const sp = season === 'spring' ? .6 : 1, wint = season === 'winter', aut = season === 'autumn';
    B.s(`M${X0} ${y + 1.4}H${X1}`, '#2e2014', 1.6, .45).s(`M${X0} ${y - .4}H${X1}`, '#9a7a5a', .8, .4);   // the drill: a dark furrow, a lit ridge
    if (kind === 'cabbage' || kind === 'prize') { const R = (kind === 'prize' ? 4.6 : 3.2) * sp; for (let x = X0 + R + 1 + r() * 2; x < X1 - R; x += R * 2.3 + r() * 1.5) { const c = aut ? ['#4e6a5a', '#7a9a7e', '#a8b48a'] : wint ? ['#4e5e5a', '#76887e', '#aab4b0'] : ['#3e6a5a', '#6a9a7e', '#a6c8a2']; B.f(B.ell(x + .8, y + .3, R * 1.1, R * .5), '#1e1a10', .4).f(B.circ(x, y - R * .7, R), c[0]).f(B.circ(x - R * .2, y - R * .85, R * .66), c[1]).f(B.circ(x - R * .35, y - R * 1.05, R * .3), c[2], .9); B.s(`M${x - R * .2} ${y - R * .85}l${-R * .5} ${R * .3}M${x - R * .2} ${y - R * .85}l${R * .5} ${R * .2}`, c[2], .5, .7); } return; }
    if (kind === 'lettuce') { for (let x = X0 + 4 + r() * 2; x < X1 - 3; x += 6 + r() * 1.5) { const red = r() < .25; B.f(B.circ(x, y - 1.8 * sp, 2.7 * sp), red ? '#8a4a4a' : '#6aa83e').f(B.circ(x - .5, y - 2.2 * sp, 1.6 * sp), red ? '#b06a5e' : '#a8d868'); } return; }
    if (kind === 'onion' || kind === 'leek') { const tall = kind === 'leek' ? 9 : 6; for (let x = X0 + 3 + r() * 2; x < X1 - 2; x += 3.6 + r()) { const c = kind === 'leek' ? '#5e8a7a' : aut ? '#a8a058' : '#5a8a46'; for (let b = -1; b <= 1; b++) B.s(`M${x} ${y}q${b * .6} ${-tall * .5 * sp} ${b * 1.8} ${-tall * sp}`, c, kind === 'leek' ? 1.3 : .8, .95); if (kind === 'onion' && (aut || season === 'summer')) B.f(B.ell(x, y - .6, 1.4, 1.1), '#d8b070', .95); } return; }
    if (kind === 'carrot') { for (let x = X0 + 3 + r() * 2; x < X1 - 2; x += 3.2 + r()) for (let b = 0; b < 4; b++) { const a = -1.9 + b * .26 + (r() - .5) * .2, l = (4 + r() * 2.5) * sp; B.s(`M${x} ${y}l${Math.cos(a) * l * .6} ${Math.sin(a) * l}`, b & 1 ? '#5e9a3e' : '#7eb44e', .7, .95); } return; }
    if (kind === 'potato') { B.f(B.rect(X0, y - 2.6, X1 - X0, 3.6), '#6e5038', .7); if (wint) return; for (let x = X0 + 3 + r() * 2; x < X1 - 3; x += 5 + r() * 2) { const c = aut ? ['#7a7a3a', '#9a8a44'] : ['#3e6a2e', '#5a8a3a']; B.f(B.blob(r, x, y - 3.5 * sp, 3.4 * sp, 2.6 * sp, 7, .4), c[0]).f(B.blob(r, x - .8, y - 4.2 * sp, 2 * sp, 1.5 * sp, 6, .4), c[1], .9); if (season === 'summer' && r() < .5) B.f(B.circ(x + 1, y - 6, .9), r() < .5 ? '#f4f0f4' : '#c8a8d8', .95); } return; }
    if (kind === 'bean' || kind === 'hop') {
      // wigwams of canes (runner beans) or tall poles with strings (hops), as tall as the row's room allows
      const H = Math.min(hmax, kind === 'hop' ? 80 : 30), step = kind === 'hop' ? 16 : 13;
      for (let x = X0 + step / 2 + r() * 2; x < X1 - 4; x += step) {
        const top = y - H, cane = wint ? '#8a7a5e' : '#9a8a64';
        if (kind === 'bean') { B.s(`M${x - 4} ${y}L${x + .5} ${top}M${x + 4} ${y}L${x - .5} ${top}M${x} ${y + .5}L${x} ${top - 1}`, cane, .9, .95); }
        else { B.s(`M${x} ${y}V${top}`, '#7a6a52', 1.6, .95).s(`M${x - .5} ${y}V${top}`, '#b8a888', .5, .6); B.s(`M${x} ${top + 1}L${x - step * .45} ${y}M${x} ${top + 1}L${x + step * .45} ${y}`, '#c8c0a8', .45, .7); }
        if (wint) continue;
        const leaf = aut ? ['#7a6a30', '#a08a3a'] : ['#3e7a32', '#5e9a3e'], vines = kind === 'bean' ? [[-4, .5], [4, -.5], [0, 0]] : [[-step * .45, 0], [step * .45, 0]];
        for (const [vx, tx] of vines) for (let k = .1; k < .95; k += .12 * (2 - sp)) { const px = x + vx * (1 - k) + tx * k, py = y - H * k + (kind === 'hop' && vx ? -H * k * 0 : 0); const lx = kind === 'hop' && vx ? x + vx * (1 - k) : px; B.f(B.blob(r, lx + (r() - .5) * 1.5, py, 1.9, 1.5, 6, .4), leaf[r() < .5 ? 0 : 1], .95); if (kind === 'bean' && season === 'summer' && r() < .3) B.f(B.circ(lx + 1, py, .9), '#d8442e', .95); if (kind === 'hop' && (season === 'summer' || aut) && r() < .35) B.f(B.ell(lx + 1, py + 1, 1, 1.4), aut ? '#c8c06a' : '#b8d07a', .95); }
      }
      return;
    }
    if (kind === 'pea') { const H = Math.min(hmax, 16) * sp; for (let x = X0 + 3 + r() * 2; x < X1 - 2; x += 4 + r() * 2) { const tw = wint ? '#7a6a52' : '#8a7454'; B.s(`M${x} ${y}l${(r() - .5) * 2} ${-H}`, tw, .7, .9); for (let b = 0; b < 3; b++) B.s(`M${x} ${y - H * (.3 + b * .2)}l${(r() - .5) * 5} ${-3 - r() * 3}`, tw, .45, .8); if (!wint) { for (let b = 0; b < 4; b++) B.f(B.ell(x + (r() - .5) * 4, y - r() * H, 1.3, .9), aut ? '#8a8a44' : '#6aa04a', .9); if (season === 'summer' && r() < .5) B.f(B.circ(x + (r() - .5) * 3, y - H * .7, .8), '#f8f6ee', .95); } } return; }
    if (kind === 'herb') { for (let x = X0 + 5 + r() * 2; x < X1 - 4; x += 8 + r() * 3) { const t = Math.floor(r() * 3), c = [['#7a8a6e', '#a4b096', '#8a6ab8'], ['#6a8a5a', '#94b27e', '#e8e0f0'], ['#4e6a3a', '#6a8a4a', '#c8a0d0']][t]; B.f(B.blob(r, x, y - 2.6, 4 * sp, 2.8 * sp, 7, .4), c[0]).f(B.blob(r, x - .8, y - 3.4, 2.6 * sp, 1.8 * sp, 6, .4), c[1], .9); if (!wint && season !== 'spring' && t === 0) for (let k = 0; k < 5; k++) { const px = x + (k - 2) * 1.5; B.s(`M${px} ${y - 3}l${(k - 2) * .4} -5`, '#7a8a6e', .5, .9).f(B.ell(px + (k - 2) * .4, y - 8, .7, 1.6), c[2], .95); } } return; }
    if (kind === 'maize') { const H = Math.min(hmax, 34) * (wint ? .25 : sp); for (let x = X0 + 3 + r() * 2; x < X1 - 2; x += 4.5 + r() * 1.5) { const c = aut || wint ? ['#a8904e', '#c8b06a'] : ['#4e7a32', '#6e9a3e']; B.s(`M${x} ${y}l${(r() - .5)} ${-H}`, c[0], 1.1, .95); if (H > 8) for (let k = .3; k < .9; k += .2) B.s(`M${x} ${y - H * k}q${r() < .5 ? -4 : 4} -1 ${r() < .5 ? -6 : 6} 2`, c[1], .9, .9); if (!wint && H > 8) B.s(`M${x} ${y - H}l-1.5 -3M${x} ${y - H}l1.5 -3`, '#d8c88a', .6, .9); } return; }
    if (kind === 'squash') { for (let x = X0 + 6 + r() * 3; x < X1 - 5; x += 11 + r() * 4) { if (!wint) { B.f(B.blob(r, x, y - 3, 6 * sp, 3.6 * sp, 8, .5), aut ? '#6a7a3a' : '#3e6a2e').f(B.blob(r, x - 2, y - 4.2, 3.4 * sp, 2 * sp, 7, .5), aut ? '#8a9a4a' : '#5e8a3e', .9); } if (season !== 'spring') { const big = r() < .3, R = big ? 4.6 : 3, col = aut || wint ? '#d8782a' : '#7a9a3a'; B.f(B.ell(x + 3, y - R * .7, R * 1.25, R), col).f(B.ell(x + 2, y - R, R * .6, R * .4), aut || wint ? '#f0a050' : '#a8c060', .7).s(`M${x + 3} ${y - R * 1.7}v-1.5`, '#5a4a2a', .8, .9); } } return; }
    if (kind === 'seedling') { for (let x = X0 + 2 + r() * 2; x < X1 - 1; x += 2.6 + r()) B.s(`M${x} ${y}l-.6 -2M${x} ${y}l.7 -1.8`, wint ? '#7a8a6a' : '#7ab84e', .7, .9); return; }
  }
  // the allotment props: a water butt, a scarecrow, a tool shed (each painted into the bed, its top inside the field)
  function waterButt(B, x, y) {
    const G = window.GardenPaintGround; if (G && G.castShadow) G.castShadow(B.cx, x, y, 13, 20, { a: .22 });
    B.f(B.rect(x - 6.5, y - 19, 13, 19), '#5e4630').f(B.rect(x - 6.5, y - 19, 4, 19), '#8a6c4a', .7).f(B.rect(x + 3.5, y - 19, 3, 19), '#3a2a1c', .5);
    for (const yy of [y - 4, y - 15]) B.f(B.rect(x - 7, yy, 14, 1.6), '#3a3a38');
    B.f(B.ell(x, y - 19, 6.5, 2.2), '#3a2c1e').f(B.ell(x - .5, y - 19.2, 5, 1.5), '#6a8a94').f(B.ell(x - 2, y - 19.5, 2, .5), '#c8dce0', .7);
    B.f(B.rect(x + 5, y - 6, 3, 1.4), '#8a8a84');
  }
  function scarecrow(B, x, y, season) {
    const G = window.GardenPaintGround, H = Math.min(46, gardenSizePx('door', 0) * .9); if (G && G.castShadow) G.castShadow(B.cx, x, y, 20, H, { a: .2 });
    const coat = season === 'winter' ? '#5a5a6e' : '#7a4a3a', straw = '#d8c070';
    B.s(`M${x} ${y}V${y - H}`, '#5e4a32', 2.2, .95).s(`M${x - 13} ${y - H * .7}H${x + 13}`, '#5e4a32', 1.8, .95);
    B.f(B.poly([[x - 6, y - H * .74], [x + 6, y - H * .74], [x + 7.5, y - H * .34], [x + 3, y - H * .38], [x, y - H * .3], [x - 3.5, y - H * .37], [x - 7.5, y - H * .33]]), coat).f(B.poly([[x - 6, y - H * .74], [x - 2, y - H * .74], [x - 3, y - H * .36], [x - 7.5, y - H * .33]]), '#9a6450', .6);
    B.f(B.rect(x - 13, y - H * .74, 7.5, 3.6), coat).f(B.rect(x + 5.5, y - H * .74, 7.5, 3.6), coat);   // the sleeves along the cross
    for (const sx of [-13.5, 13.5]) for (let k = 0; k < 4; k++) B.s(`M${x + sx} ${y - H * .72 + k}l${sx > 0 ? 2.5 : -2.5} ${(k - 1.5) * 1.2}`, straw, .7, .95);   // straw at the cuffs
    B.f(B.circ(x, y - H * .83, 4.2), '#d8c8a0').f(B.circ(x - 1.2, y - H * .85, 2.4), '#ece0c0', .7);
    B.f(B.circ(x - 1.5, y - H * .84, .6), '#3a2a1a').f(B.circ(x + 1.5, y - H * .84, .6), '#3a2a1a').s(`M${x - 1.6} ${y - H * .79}q1.6 1 3.2 0`, '#3a2a1a', .5, .9);
    B.f(B.ell(x, y - H * .9, 8, 1.6), '#4a3a26').f(B.rr(x - 4.2, y - H * .9 - 5.5, 8.4, 5.5, 1.5), '#5a4630').f(B.rect(x - 4.2, y - H * .9 - 1.8, 8.4, 1.1), '#a8442e');
    B.f(B.ell(x + 11, y - H * .74 - 1.5, 2.4, 1.6), '#1e1e22').f(B.ell(x + 12.6, y - H * .74 - 2.6, 1.2, 1), '#1e1e22').s(`M${x + 13.6} ${y - H * .74 - 2.6}l1.2 .3`, '#c8a040', .5, .9);   // a crow on the arm, not bothered
  }
  function toolShed(B, x, y, season, hmax) {
    const G = window.GardenPaintGround, H = Math.min(hmax, gardenSizePx('door', 0) * 1.3), w = 30, wall = H * .72; if (G && G.castShadow) G.castShadow(B.cx, x + w / 2, y, w + 4, H, { a: .28 });
    const bd = ['#6e5e48', '#86745a', '#50422e', '#a8967a'];
    B.f(B.rect(x, y - wall, w, wall), bd[0]); for (let px = x + 3; px < x + w; px += 3.6) B.s(`M${px} ${y - wall}V${y}`, bd[2], .5, .6);
    B.f(B.rect(x, y - wall, 3, wall), bd[3], .3).f(B.rect(x + w - 4, y - wall, 4, wall), bd[2], .35);
    B.f(B.rect(x + 4, y - wall * .82, 10, wall * .82), bd[2]).f(B.rect(x + 5, y - wall * .8, 8, wall * .8), bd[1]).s(`M${x + 5} ${y - wall * .55}l8 -${wall * .2}`, bd[2], .8, .9).f(B.circ(x + 11.5, y - wall * .42, .7), '#2a2a2a');
    B.f(B.rect(x + 18, y - wall * .78, 8, 6), '#3a4848').s(`M${x + 22} ${y - wall * .78}v6M${x + 18} ${y - wall * .78 + 3}h8`, bd[3], .6, .8).f(B.rect(x + 18.5, y - wall * .78 + .5, 3, 2), '#8aa4a8', .45);
    B.f(B.poly([[x - 3, y - wall + 1], [x + w + 3, y - H], [x + w + 3, y - H + 3.5], [x - 3, y - wall + 4.5]]), '#3a4044').f(B.poly([[x - 3, y - wall + 1], [x + w + 3, y - H], [x + w + 3, y - H + 1.2], [x - 3, y - wall + 2.2]]), '#5e666a', .8);
    B.f(B.poly([[x, y - wall + 1.5], [x + w, y - H + 2], [x + w, y - wall], [x, y - wall]]), bd[0]);   // the pent wall up under the roof
    B.s(`M${x + w + 3} ${y}l-3 -${wall * .9}`, '#7a6248', 1.1, .95).s(`M${x + w + .2} ${y - wall * .9}l-1.6 -2.4M${x + w + .2} ${y - wall * .9}l1.2 -2.6`, '#9a9a94', .7, .9);   // a fork against the wall
    if (season !== 'winter') for (let k = 0; k < 10; k++) { const px = x - 2 + r1() * (w + 4); B.s(`M${px} ${y + 1}q-.5 -2.5 .5 -5`, '#5e8a3a', 1, .9); }
  }
  let r1 = Math.random;
  function allotFill(B, r, p, season, X0, Y0, X1, Y1, extra) {
    r1 = r; soilBed(B, r, X0, Y0, X1, Y1, season);
    const n = String(p.id), main = /bean/.test(n) ? 'bean' : /pea/.test(n) ? 'pea' : /onion/.test(n) ? 'onion' : /hop/.test(n) ? 'hop' : /salad/.test(n) ? 'lettuce' : /herb/.test(n) ? 'herb' : /prize/.test(n) ? 'prize' : null;
    const mixed = ['cabbage', 'carrot', 'leek', 'lettuce', 'onion', 'cabbage', 'carrot'];
    let x0 = X0 + 3, x1 = X1 - 3;
    if (extra.shed) { toolShed(B, X0 + 4, Y1 - 5, season, Y1 - Y0 - 12); x0 = X0 + 40; }
    const tall = main === 'bean' || main === 'hop', gap = tall ? (main === 'hop' ? 999 : 24) : main === 'prize' ? 13 : 8.5;
    // a grass path down the middle of a wide bed, the rows either side
    const mid = (x1 - x0) > 80 ? (x0 + x1) / 2 : null;
    if (mid != null) { B.f(B.rect(mid - 4, Y0, 8, Y1 - Y0), season === 'winter' ? '#7a8a66' : '#5e8a3a', .9); for (let y = Y0 + 2; y < Y1; y += 2.4) B.s(`M${mid - 4 + r() * 8} ${y + 2}l${(r() - .5) * 1.5} -3`, '#7aa24c', .8, .8); }
    const rows = [];
    for (let y = Y1 - 5; y > Y0 + (tall ? 14 : 6); y -= gap) rows.push(y);
    rows.reverse().forEach((y, i) => {
      const kind = main || mixed[(i + (p.cells[0][0] * 7 + p.cells[0][1]) % 5) % mixed.length], room = y - Y0 - 4;
      if (mid != null) { cropRow(B, r, kind, x0, mid - 5, y, season, room); cropRow(B, r, main || mixed[(i + 3) % mixed.length], mid + 5, x1, y, season, room); }
      else cropRow(B, r, kind, x0, x1, y, season, room);
    });
    if (main === 'hop' || main === 'bean') { /* the canes stand in the bottom row; the soil behind them is weeded and bare */ }
    if (extra.butt) waterButt(B, X1 - 10, Y1 - 6);
    if (extra.scarecrow) scarecrow(B, (mid != null ? mid : (X0 + X1) / 2) + 6, Y1 - 7, season);
  }
  function cropFill(B, r, p, season, X0, Y0, X1, Y1) {
    const n = String(p.id), wint = season === 'winter';
    if (/loam|plough/.test(n)) {   // ploughed: long furrows the whole length, the turned earth lit on its top
      soilBed(B, r, X0, Y0, X1, Y1, season);
      for (let y = Y0 + 4; y < Y1; y += 4.2) { B.s(`M${X0} ${y + 1.2}H${X1}`, '#2e2014', 1.8, .55).s(`M${X0} ${y - .6}H${X1}`, wint ? '#d4d8da' : '#9a7a58', 1.1, .55); }
      for (let i = 0; i < 3; i++) if (r() < .7) { const x = X0 + 8 + r() * (X1 - X0 - 16), y = Y0 + 6 + r() * (Y1 - Y0 - 10); B.f(B.ell(x, y, 2.4, 1.3), '#1e1e22').f(B.ell(x + 1.8, y - .9, 1.1, .9), '#1e1e22').s(`M${x + 2.8} ${y - .9}l1.2 .4`, '#8a8a84', .5, .9); }   // rooks on the furrows
      return;
    }
    const kind = /potato/.test(n) ? 'potato' : /maze|corn|maize/.test(n) ? 'maize' : /giant/.test(n) ? 'squash' : 'seedling';
    soilBed(B, r, X0, Y0, X1, Y1, season, /black/.test(n));
    const gap = kind === 'maize' ? 9 : kind === 'squash' ? 13 : kind === 'potato' ? 9 : 5;
    { const ys = []; for (let y = Y1 - 4; y > Y0 + (kind === 'maize' ? 26 : 5); y -= gap) ys.push(y); for (const y of ys.reverse()) cropRow(B, r, kind, X0 + 2, X1 - 2, y, season, y - Y0 - 3); }
  }
  const WET = { summer: ['#3e6a30', '#5a8a3a', '#7aa84a', '#2e5228'], spring: ['#46742e', '#64983c', '#88b450', '#345a26'], autumn: ['#5a6a30', '#7a8a3e', '#9aa04e', '#3e4a24'], winter: ['#6a7458', '#86907a', '#a4ac96', '#4e5640'] };
  function wetFill(B, r, p, season, X0, Y0, X1, Y1) {
    const n = String(p.id), C = WET[season] || WET.summer, wint = season === 'winter', w = X1 - X0, h = Y1 - Y0;
    // (the lush wet sward in ragged lobes, so its edge is the grass's own and never the field's rectangle)
    B.f(B.blob(r, X0 + w / 2, Y0 + h / 2, w * .5, h * .5, 12, .22), C[0]); for (let k = 0; k < 5; k++) B.f(B.blob(r, X0 + w * (.15 + r() * .7), Y0 + h * (.2 + r() * .6), w * (.18 + r() * .12), h * (.22 + r() * .15), 8, .35), C[k & 1 ? 0 : 3], .8);
    for (let i = 0; i < w * h / 60; i++) B.f(B.blob(r, X0 + r() * w, Y0 + r() * h, 3 + r() * 5, 1.5 + r() * 2, 6, .5), C[1 + Math.floor(r() * 2)], .45);
    // standing water: a pool or two with the sky in it, rushes round their edges
    const pools = /dragonfly|frog|heron|moorhen|bittern/.test(n) ? 2 : /lark|last/.test(n) ? 0 : 1;
    for (let k = 0; k < pools; k++) { const px = X0 + w * (.3 + r() * .4), py = Y0 + h * (.4 + r() * .35), rx = w * (.16 + r() * .1), ry = h * (.1 + r() * .06); B.f(B.blob(r, px, py + 1, rx + 2, ry + 1.5, 8, .3), '#2e3a24', .6).f(B.blob(r, px, py, rx, ry, 8, .3), wint ? '#a8b8be' : '#6e8e98').f(B.ell(px - rx * .3, py - ry * .2, rx * .4, ry * .25), wint ? '#e8eef0' : '#b8d0d4', .6); if (/dragonfly|frog/.test(n) && !wint) for (let j = 0; j < 4; j++) B.f(B.ell(px + (r() - .5) * rx * 1.4, py + (r() - .5) * ry, 2, 1), '#4e8a3a', .95); }
    const rush = wint ? ['#8a8660', '#a49c72'] : ['#2c4e26', '#4a7a34'];
    const tuftAt = (x, y, l) => { for (let b = 0; b < 6; b++) B.s(`M${x + (b - 2.5) * .7} ${y}q${(b - 2.5) * .4} ${-l * .5} ${(b - 2.5) * 1.3} ${-l}`, rush[b & 1], .9, .95); };
    const top = Y0 + 4;   // (nothing stands above the field's top)
    const dom = /kingcup|marigold/.test(n) ? 'kingcup' : /iris/.test(n) ? 'iris' : /bulrush|sedge|reach|isle|heron|bittern|moorhen|boat|reed/.test(n) ? 'reed' : /lark/.test(n) ? 'tussock' : /last|bank/.test(n) ? 'sweet' : 'kingcup';
    const G = window.GardenPaintGround, drift = (x, y) => G && G.noise ? G.noise(x / 22, y / 16, 4637) : .5, spots = [];
    for (let i = 0; i < w * h / 62; i++) spots.push([X0 + 2 + r() * (w - 4), top + 7 + r() * Math.max(1, Y1 - top - 9)]);
    spots.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of spots) {
      const room = (y - top) * (.55 + drift(x * 1.7, y) * .45), roll = r(); if (dom !== 'reed' && drift(x, y) < .42) { if (roll < .5) tuftAt(x, y, Math.min(room, 5 + r() * 5)); continue; }
      if (dom === 'reed') { const l = Math.min(room * (.5 + drift(x, y) * .5), 10 + r() * 12);   /* (fix round 2: tips capped at the back edge made one ruled line along the top; now they wander below it) */ const st = wint ? '#b4a478' : season === 'autumn' ? '#a8984e' : '#5a8a3a'; for (let b = 0; b < 5; b++) { const bx = x + (b - 2) * 1.4; B.s(`M${bx} ${y}q${(r() - .5) * 2} ${-l * .5} ${(r() - .5) * 2.5} ${-l}`, st, .9, .95); if (/bulrush/.test(n) && b === 2) B.f(B.rr(bx - 1.1, y - l - .5, 2.2, 5.5, 1), '#5a3a22'); else if (b === 2 && r() < .45) B.f(B.ell(bx + .4, y - l, 1.1, 2.2), wint ? '#d8cca8' : '#a8946a', .85); } continue; }
      if (roll < .3) { tuftAt(x, y, Math.min(room, 7 + r() * 5)); continue; }
      if (dom === 'kingcup' && !wint) { B.f(B.blob(r, x, y - 2, 3.6, 2, 7, .4), '#2e5a2a').f(B.blob(r, x - .6, y - 2.6, 2.2, 1.2, 6, .4), '#4e7a3a', .9); if (season !== 'autumn') for (let k = 0; k < 3; k++) B.f(B.circ(x + (k - 1) * 2.2, y - 3.8 - (k & 1), 1.25), '#f2c81e').f(B.circ(x + (k - 1) * 2.2 - .3, y - 4.1 - (k & 1), .5), '#fbe878', .9); continue; }
      if (dom === 'iris') { const l = Math.min(room, 12 + r() * 5); for (let b = -2; b <= 2; b++) B.s(`M${x + b} ${y}q${b * .3} ${-l * .5} ${b * 1.2} ${-l}`, wint ? '#8a8a5e' : '#4e7a3e', 1.2, .95); if (season === 'summer' || season === 'spring') B.f(B.ell(x + 1, y - l * .8, 1.8, 1.4), '#f2d43a').f(B.ell(x + 2.2, y - l * .8 + 1, 1, 1.4), '#e8b41e', .9); continue; }
      if (dom === 'tussock') { B.f(B.blob(r, x, y - 2, 4, 2.6, 7, .5), wint ? '#9a9a78' : '#6a8a3e'); tuftAt(x, y, Math.min(room, 6 + r() * 4)); if (season === 'summer' && r() < .6) for (let k = 0; k < 3; k++) B.f(B.circ(x + (r() - .5) * 6, y - 5 - r() * 3, 1), '#e86a9a', .95); continue; }
      if (dom === 'sweet') { tuftAt(x, y, Math.min(room, 6)); if (season === 'summer') B.f(B.blob(r, x + 1, y - Math.min(room - 1, 9), 3, 2, 7, .5), '#f4ecd2').f(B.blob(r, x, y - Math.min(room - 1, 9.6), 1.8, 1.1, 6, .5), '#fffaf0', .9); continue; }
      tuftAt(x, y, Math.min(room, 6 + r() * 6));
    }
    if (/boat/.test(n)) {   // an old tarred boat turned over in the grass: a long rounded hull, its keel along the top, strakes lapped down its side, grass grown up round it (fix round 2: it was a blue box)
      const x = X0 + w * .5, y = Y0 + h * .62, L = Math.min(w * .32, 24); B.f(B.ell(x + 3, y + 2.6, L + 2, 3.4), '#1e2418', .35);
      B.f(B.poly([[x - L, y], [x - L * .7, y - 6.5], [x + L * .55, y - 7.5], [x + L, y - 2], [x + L * .9, y + .6], [x - L * .9, y + .8]]), '#3e3a32').f(B.poly([[x - L * .8, y - 4.5], [x - L * .65, y - 6.6], [x + L * .55, y - 7.4], [x + L * .85, y - 3.5]]), '#5e564a', .9);
      for (let k = 1; k < 4; k++) B.s(`M${x - L * (.95 - k * .05)} ${y - k * 1.6}Q${x} ${y - k * 1.6 - 1.2} ${x + L * (.95 - k * .07)} ${y - 1.5 - k * 1.5}`, '#2a2620', .6, .7);
      B.s(`M${x - L * .7} ${y - 6.6}L${x + L * .6} ${y - 7.6}`, '#7a6e5a', 1.2, .9); for (let k = -3; k <= 3; k++) B.s(`M${x + k * L / 3.4} ${y + 1}q.5 -3 -.5 -6`, '#5a8a3a', 1, .9); }   // an old boat turned over in the grass
  }
  function woodFill(B, r, p, season, X0, Y0, X1, Y1) {
    const wint = season === 'winter', w = X1 - X0, h = Y1 - Y0;
    // (fix round 2: a lighter, mossier floor with the sun let through; the near-black floor read as a hole in the meadow)
    B.f(B.blob(r, X0 + w / 2, Y0 + h / 2, w * .5, h * .5, 12, .2), wint ? '#5a5644' : '#3e5630'); for (let k = 0; k < 4; k++) B.f(B.blob(r, X0 + w * (.2 + r() * .6), Y0 + h * (.2 + r() * .6), w * .2, h * .24, 8, .35), wint ? '#4e4a3a' : r() < .5 ? '#34482a' : '#4e6a36', .8);
    for (let i = 0; i < w * h / 50; i++) B.f(B.blob(r, X0 + r() * w, Y0 + r() * h, 3 + r() * 5, 1.5 + r() * 2.5, 6, .5), wint ? (r() < .5 ? '#6a5a42' : '#5a5a48') : r() < .4 ? '#4e6a34' : r() < .7 ? '#3a5028' : '#5a4a30', .55);
    // a still black pool among the stools, the light let through in a few coins
    { const px = X0 + w * (.35 + r() * .3), py = Y0 + h * .62, rx = w * .14, ry = h * .08; B.f(B.blob(r, px, py, rx, ry, 8, .3), wint ? '#7a8a90' : '#24302c').f(B.ell(px - rx * .3, py - ry * .2, rx * .35, ry * .3), '#6e8a8e', .5); }
    for (let k = 0; k < 7; k++) B.f(B.ell(X0 + r() * w, Y0 + 6 + r() * (h - 8), 3 + r() * 4, 1.2 + r() * 1.2), wint ? '#a8a490' : '#8aa456', .35);   // sun-flecks
    const fern = (x, y, l) => { const c = season === 'autumn' ? '#9a7a3a' : wint ? '#7a6a4a' : '#4e7a3a'; for (let b = -2; b <= 2; b++) { const a = -Math.PI / 2 + b * .42, ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l * .8; B.s(`M${x} ${y}Q${x + Math.cos(a) * l * .5} ${y + Math.sin(a) * l * .7} ${ex} ${ey}`, c, .9, .95); for (let t = .3; t < .95; t += .16) { const qx = x + (ex - x) * t, qy = y + (ey - y) * t; B.s(`M${qx} ${qy}l${-1.8 + b * .2} -1M${qx} ${qy}l${1.8 + b * .2} -1`, c, .6, .85); } } };
    // alder stools: a mossy knuckle with young stems rising from it, as tall as the field's room allows
    const top = Y0 + 4;
    for (let x = X0 + 10 + r() * 6; x < X1 - 6; x += 22 + r() * 10) {
      const y = Y1 - 6 - r() * Math.max(0, h - 40), H = Math.max(12, y - top - 2);
      B.f(B.ell(x + 2, y + 1, 7, 2.2), '#141c10', .55).f(B.blob(r, x, y - 2, 5.5, 3.5, 7, .4), '#4a4234').f(B.blob(r, x - 1.5, y - 3.5, 3.2, 1.8, 6, .4), wint ? '#8a8a6a' : '#6a8a3a', .9);
      for (let s = 0; s < 5; s++) { const sx = x - 4 + s * 2 + (r() - .5), lean = (s - 2) * 1.6 + (r() - .5) * 2, sh = H * (.65 + r() * .35); B.s(`M${sx} ${y - 3}q${lean * .3} ${-sh * .5} ${lean} ${-sh}`, s & 1 ? '#5e5a50' : '#7a766a', 1.3, .95).s(`M${sx - .4} ${y - 3}q${lean * .3} ${-sh * .5} ${lean - .4} ${-sh}`, '#a8a498', .4, .6); if (!wint) for (let k = 0; k < 3; k++) B.f(B.blob(r, sx + lean * (.6 + k * .2), y - 3 - sh * (.55 + k * .18), 3.4, 2.2, 6, .45), season === 'autumn' ? (k ? '#5a5a2a' : '#7a6a30') : k ? '#2a4224' : '#3a5a2c', .95); else for (let k = 0; k < 3; k++) B.f(B.ell(sx + lean * .9, y - 3 - sh * (.75 + k * .08), .9, 1.6), '#6a3a3a', .9); }
    }
    for (let y = top + 11; y < Y1 - 2; y += 9 + r() * 4) for (let x = X0 + 4 + r() * 8; x < X1 - 4; x += 14 + r() * 10) { if (r() < .55) fern(x, y, Math.min(9 + r() * 4, y - top - 1)); else if (!wint && season !== 'autumn' && r() < .5) { B.f(B.blob(r, x, y - 1.5, 3, 1.6, 6, .4), '#2e5a2a'); if (season === 'spring') for (let k = 0; k < 2; k++) B.f(B.circ(x + (k - .5) * 2.4, y - 3, 1.1), '#f2c81e'); } }
    // a fallen alder, mossed over
    { const x = X0 + w * .2 + r() * w * .3, y = Y1 - 10, L = Math.min(w * .4, 34); B.f(B.ell(x + L / 2 + 2, y + 2.5, L * .55, 2.4), '#141c10', .5).s(`M${x} ${y}l${L} -2`, '#4e463a', 4.6, .95).s(`M${x} ${y - 1.2}l${L} -2`, '#7a7262', 1.4, .7).s(`M${x + 3} ${y - 2}l${L * .6} -1.4`, wint ? '#c8ccc0' : '#6a8a3a', 1.6, .8); }
    // the shade over all of it, deepest at the back under the terrace or the thicket
    const g = B.cx.createLinearGradient(0, Y0, 0, Y1); g.addColorStop(0, 'rgba(10,20,12,.2)'); g.addColorStop(1, 'rgba(10,20,12,.04)'); B.cx.fillStyle = g; B.cx.globalAlpha = 1; B.cx.fill(new Path2D(B.blob(r, X0 + w / 2, Y0 + h / 2, w * .52, h * .52, 12, .2)));
  }
  // The fill of one field, clipped to its cells a little inside its edges (the boundary is painted after, over its rim).
  function fieldFill(B, P, p, W, season, cb, fk, extra) {
    const G = window.GardenPaintGround; if (!G || !G.rng || !G.hash) return;
    const cw = W.cellW, ch = W.cellH, lv = level(), own = new Set(p.cells.map(c => c[0] + ',' + c[1]));
    if (p.cells.some(([x, y]) => covered((x + .5) * cw, W.sky + (y + .5) * ch))) return;
    const cells = p.cells.filter(([x, y]) => locked(x, y, lv)); if (!cells.length) return;
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), X0 = Math.min(...xs) * cw + 3, X1 = (Math.max(...xs) + 1) * cw - 3, Y1 = W.sky + (Math.max(...ys) + 1) * ch - 3;
    const Y0 = W.sky + Math.min(...ys) * ch + (p.edges.some(e => e[2] === 'n' && e[1] === Math.min(...ys) && !locked(e[3], e[4], lv)) ? Math.min(ch - 2, FH()[fk] * (fk === 'wet' ? .7 : 1) + 1) - 3 : 2);
    if (cb && (X1 < cb[0] - 4 || X0 > cb[2] + 4 || Y1 < cb[1] - 4 || Y0 > cb[3] + 60)) return;
    const cx = B.cx; cx.save();
    // (the fill starts at the back run's foot, so the hurdle, hedge or rushes along the back stand up behind the beds, never under them)
    const runAt = new Set(p.edges.filter(e => !locked(e[3], e[4], lv)).map(e => e[0] + ',' + e[1] + e[2])), nf = Math.min(ch - 2, FH()[fk] * (fk === 'wet' ? .7 : 1) + 1);
    const clip = new Path2D(); for (const [x, y] of cells) { const a = x * cw, b = W.sky + y * ch, k = x + ',' + y, l = own.has((x - 1) + ',' + y) ? 0 : runAt.has(k + 'w') ? 5 : 3, rt = own.has((x + 1) + ',' + y) ? 0 : runAt.has(k + 'e') ? 5 : 3, t = own.has(x + ',' + (y - 1)) ? 0 : runAt.has(k + 'n') ? nf - 3 : 2, bt = own.has(x + ',' + (y + 1)) ? 0 : 3; clip.rect(a + l, b + t, cw - l - rt, ch - t - bt); }
    cx.clip(clip);
    const r = G.rng(G.hash(Math.round(X0), Math.round(Y0), 4601));
    if (fk === 'allot') allotFill(B, r, p, season, X0, Y0, X1, Y1, extra || {}); else if (fk === 'crop') cropFill(B, r, p, season, X0, Y0, X1, Y1); else if (fk === 'wet') wetFill(B, r, p, season, X0, Y0, X1, Y1); else woodFill(B, r, p, season, X0, Y0, X1, Y1);
    cx.restore();
  }
  /* ---------- round 3, fix 2 (19 Nov 2026): fields that are not boxes ---------- */
  // The critics on round 3: some thirty locked fields still read as crates stamped over the meadow (hurdle boxes, rush
  // boxes with a blue ditch strip along the foot, dark wood boxes, each with a big plate), in neat rows. A field's edge is
  // now a living ring stood on a soft outline with rounded corners that wanders in and out by place: clumps of hedge, rush,
  // fruit bush or scrub, each its own height, lower at the back than the front, so the field's own ground shows inside.
  // The fill is clipped to that outline (no square corner, no straight foot, no ditch strip, never over the water or under
  // a landmark's picture), and there is one gap at the front with a small gate and a little tag. Walking stops at the
  // cells' edge, and the ring stands on it: its clumps reach from a few px inside the edge to a px or two beyond.
  const RING = () => { const h = gardenSizePx('hedge', 0); return { crop: h, allot: h * .78, wet: h * .8, wood: h * .95 }; };
  const RING_STYLE = { crop: 'hedge', allot: 'bush', wet: 'rush', wood: 'scrub' };
  const ringMemo = new Map();
  function ringOf(p, W, lv) {
    const cw = W.cellW, ch = W.cellH, cells = p.cells.filter(([x, y]) => locked(x, y, lv)); if (!cells.length) return null;
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), cx0 = Math.min(...xs), cx1 = Math.max(...xs), cy0 = Math.min(...ys), cy1 = Math.max(...ys);
    if (cells.length !== (cx1 - cx0 + 1) * (cy1 - cy0 + 1)) return null;   // (every valley field is a rectangle of cells today; any other keeps the old runs)
    const key = p.id + '|' + lv; if (ringMemo.has(key)) return ringMemo.get(key);
    const fk = fieldKindOf(p.id), hf = RING()[fk], hb = hf * .62, G = window.GardenPaintGround, nz = (u, v, s, k) => G && G.noise ? G.noise(u / s, v / s, k) : .5;
    // (a run wherever the field meets anything but another locked field: a closed region next door is not a field, and reading it as
    //  one left rings with whole sides missing when they were painted before the gates' state came in)
    const lockedPlot = (x, y) => { const rw = gardenLandCell(x, y); return !!(rw && rw.plot) && locked(x, y, lv); };
    const runAt = new Set(p.edges.filter(e => locked(e[0], e[1], lv) && !lockedPlot(e[3], e[4])).map(e => e[0] + ',' + e[1] + e[2]));
    const X0 = cx0 * cw + 4, X1 = (cx1 + 1) * cw - 4, Yb = W.sky + cy0 * ch + Math.min(ch - 6, hb * .8 + 2), Yf = W.sky + (cy1 + 1) * ch - 3, R = Math.min(15, (X1 - X0) / 4, (Yf - Yb) / 2.4);
    // the gate: the middle of the lowest front run (a run onto walkable ground), a gap a little under half a cell wide
    const fronts = [...runAt].filter(k => k.endsWith('s')).map(k => k.slice(0, -1).split(',').map(Number)).filter(c => c[1] === cy1).sort((a, b) => a[0] - b[0]);
    const gc = fronts[fronts.length >> 1] || null, gw = cw * (fk === 'crop' ? .56 : .4), gx = gc ? gc[0] * cw + (cw - gw) / 2 + (nz(gc[0], gc[1], 1, 4701) - .5) * cw * .3 : null;
    const pts = [], seed = G && G.hash ? G.hash(cx0, cy0, 4703) : 1;
    const push = (x, y, nx, ny, side, h) => {
      // the outline wanders in and out by place (a slow bulge and a quicker wobble), never more than 3 px past the cells' edge
      const j = Math.max(-4, Math.min(2.6, (nz(x, y, 34, 4705) - .5) * 5 + (nz(x, y, 9, 4707) - .5) * 3));
      const cx = Math.min(cx1, Math.max(cx0, Math.floor(x / cw))), cy = Math.min(cy1, Math.max(cy0, Math.floor((y - W.sky) / ch)));
      const on = side.length > 1 ? [...side].some(s => runAt.has((s === 'e' ? cx1 : s === 'w' ? cx0 : cx) + ',' + (s === 's' ? cy1 : s === 'n' ? cy0 : cy) + s)) : runAt.has(cx + ',' + cy + side);
      const gap = side === 's' && gc && cx === gc[0] && x > gx - 1 && x < gx + gw + 1;
      pts.push({ x: x + nx * j, y: y + ny * j, nx, ny, side, h, on: on && !gap, gap });
    };
    const step = 3.4, hAt = y => hb + (hf - hb) * Math.max(0, Math.min(1, (y - Yb) / Math.max(1, Yf - Yb)));
    const arc = (cx, cy, a0, a1, side) => { const n = Math.max(3, Math.round(R * Math.abs(a1 - a0) / step)); for (let i = 1; i < n; i++) { const a = a0 + (a1 - a0) * i / n, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; push(x, y, Math.cos(a), Math.sin(a), side, hAt(y)); } };
    for (let x = X0 + R; x <= X1 - R; x += step) push(x, Yb, 0, -1, 'n', hb);
    arc(X1 - R, Yb + R, -Math.PI / 2, 0, 'ne');
    for (let y = Yb + R; y <= Yf - R; y += step) push(X1, y, 1, 0, 'e', hAt(y));
    arc(X1 - R, Yf - R, 0, Math.PI / 2, 'se');
    for (let x = X1 - R; x >= X0 + R; x -= step) push(x, Yf, 0, 1, 's', hf);
    arc(X0 + R, Yf - R, Math.PI / 2, Math.PI, 'sw');
    for (let y = Yf - R; y >= Yb + R; y -= step) push(X0, y, -1, 0, 'w', hAt(y));
    arc(X0 + R, Yb + R, Math.PI, Math.PI * 1.5, 'nw');
    const o = { fk, style: RING_STYLE[fk], pts, X0, X1, Yb, Yf, R, hf, hb, gc, gx, gw, seed, cells, box: [cx0 * cw - 6, W.sky + cy0 * ch - hf, (cx1 + 1) * cw + 6, W.sky + (cy1 + 1) * ch + 6] };
    ringMemo.set(key, o); return o;
  }
  // the outline as a path, pulled in by `inset` px (the fill's clip)
  function ringPath(o, inset) { const pa = new Path2D(); o.pts.forEach((q, i) => { const x = q.x - q.nx * inset, y = q.y - q.ny * inset; if (i) pa.lineTo(x, y); else pa.moveTo(x, y); }); pa.closePath(); return pa; }
  // one clump of the ring, its foot at (x, y), h tall, in the field's own kind
  function ringClump(B, r, P, o, q, season, pass) {
    const G = window.GardenPaintGround, n1 = G && G.noise ? G.noise(q.x / 14, q.y / 14, 4711) : .5, h = q.h * (.72 + n1 * .5) * (.9 + r() * .2), x = q.x, y = q.y, wint = season === 'winter';
    if (o.style === 'hedge' || o.style === 'scrub') {
      const HV = HEDGES[o.style === 'scrub' ? 3 : hedgeVar], C = (HV && HV[season]) || HAW[season] || HAW.summer;
      if (pass === 0) B.f(B.blob(r, x + .8, y - h * .4, 5.8 + r() * 1.4, h * .46, 7, .35), C[0], .85).f(B.blob(r, x - .4, y - h * .48, 5 + r(), h * .42, 7, .35), C[1], 1);   /* (fix round 2: a lighter body, the darkest green only in its shaded lower right: the ring read as a black outline from afar) */
      else if (pass === 1) B.f(B.blob(r, x - .8, y - h * .62, 4.4 + r(), h * .34, 7, .4), C[2 + (r() < .35 ? 1 : 0)], .95);
      else {
        B.f(B.blob(r, x - 1.6, y - h * .8, 3 + r(), h * .17, 6, .45), C[3], .9); if (r() < .5) B.f(B.blob(r, x - 2.2, y - h * .9, 1.8, h * .08, 6, .5), C[4], .85);
        const fl = HV ? HV.fl[season] : season === 'spring' ? '#f6f2e6' : season === 'summer' ? '#f2b8c4' : season === 'autumn' ? '#b02a22' : null;
        if (fl && r() < (season === 'spring' ? .5 : .22)) B.f(B.circ(x + (r() - .5) * 6, y - h * (.45 + r() * .4), season === 'summer' ? 1.4 : 1), fl, .95);
        if (o.style === 'scrub' && r() < .3) { const dx = (r() - .5) * 14, hh = h * (.5 + r() * .4); B.s(`M${x} ${y - hh * .6}q${dx * .5} ${-hh * .5} ${dx} ${-hh * .1 + 4}`, wint ? '#6a4a3a' : '#5a3a2e', 1, .9); }
        if (!wint && q.ny >= 0 && r() < .7) { const l = 3 + r() * 4; B.s(`M${x + (r() - .5) * 4} ${y + 1}q${(r() - .5) * 2} ${-l * .5} ${(r() - .5) * 3} ${-l}`, P.lawnLo || '#5a7a3a', 1, .9); }
      }
      return;
    }
    if (o.style === 'bush') {   // an allotment's edge: currant and gooseberry bushes, a cane or two, the grass between
      if ((q.i & 1) && pass !== 2) return;
      const C = wint ? ['#4a4436', '#5e5646', '#7a705a'] : season === 'autumn' ? ['#4a5226', '#6e7030', '#9a8a3e'] : ['#2e4c26', '#46682e', '#6a9040'];
      if (pass === 0 && !(q.i & 1)) B.f(B.blob(r, x, y - h * .4, 6.4 + r() * 1.5, h * .44, 8, .35), C[0], 1);
      else if (pass === 1 && !(q.i & 1)) B.f(B.blob(r, x - 1, y - h * .56, 4.8, h * .3, 7, .4), C[1], .95);
      else if (pass === 2) {
        if (!(q.i & 1)) { B.f(B.blob(r, x - 1.8, y - h * .72, 3, h * .14, 6, .45), C[2], .9);
          if (season === 'summer' && r() < .6) for (let k = 0; k < 4; k++) B.f(B.circ(x + (r() - .5) * 8, y - h * (.3 + r() * .4), .9), r() < .6 ? '#c8282e' : '#2a1e30', .95);
          else if (season === 'spring' && r() < .4) for (let k = 0; k < 3; k++) B.f(B.circ(x + (r() - .5) * 8, y - h * (.4 + r() * .4), .8), '#f4ecd8', .95);
          if (r() < .06) { const ch2 = h * (1.6 + r() * .6); B.s(`M${x + 2} ${y}l${(r() - .5) * 2} ${-ch2}`, wint ? '#8a7a5e' : '#9a8a64', .9, .95); if (!wint) for (let k = 0; k < 4; k++) B.f(B.blob(r, x + 2 + (r() - .5) * 3, y - ch2 * (.4 + k * .15), 1.8, 1.3, 6, .4), '#3e7a32', .95); } }
        else if (!wint) for (let b = 0; b < 3; b++) { const l = 3 + r() * 4; B.s(`M${x + (b - 1) * 1.2} ${y + .5}q${(r() - .5) * 2} ${-l * .5} ${(b - 1) * 1.5} ${-l}`, b & 1 ? '#6f8a40' : (P.lawnLo || '#5a7a3a'), .9, .9); }
      }
      return;
    }
    // rushes, sedge and yellow flag round a wet field, its edge broken by tussocks; a bulrush now and then
    const C = wint ? ['#7a7656', '#948e68', '#a8a07a', '#5e5a42'] : season === 'autumn' ? ['#5a6230', '#7a7a3a', '#9a9048', '#3e4626'] : ['#2c4e26', '#3e6a30', '#5a8a3a', '#203a1e'];
    if (pass === 0) { B.f(B.blob(r, x, y - 1.5, 4.2, 2.2, 6, .4), C[3], .6); return; }
    if (pass === 1) { for (let b = 0; b < (n1 > .55 ? 3 : 2); b++) { const l = h * (.4 + r() * .6), lean = (r() - .5) * 5 + q.nx * 2; B.s(`M${x + (r() - .5) * 3} ${y}q${lean * .3} ${-l * .55} ${lean} ${-l}`, C[Math.floor(r() * 3)], 1.05, .95); } return; }
    if (r() < .1 && !wint) { const l = h * (1 + r() * .3); B.s(`M${x} ${y}l${(r() - .5) * 2} ${-l}`, '#5a7a3a', 1, .95).f(B.rr(x - 1.1, y - l - 1, 2.2, 5.5, 1), '#5a3a22'); }
    else if (r() < .14 && (season === 'summer' || season === 'spring')) { const l = h * (.6 + r() * .3); B.f(B.ell(x + 1, y - l, 1.7, 1.3), '#f2d43a').f(B.ell(x + 2.1, y - l + 1, .9, 1.2), '#e8b41e', .9); }
    else if (r() < .1 && season === 'summer') { const l = h * (.6 + r() * .3); for (let k = 0; k < 3; k++) B.f(B.ell(x + (r() - .5) * 2, y - l - k * 2, .9, 1.3), '#b04a9a', .95); }
  }
  // the ring's shade (cast along the light) and its back half: before the fill
  function ringBack(B, r0, P, o, W, season, cb) {
    const G = window.GardenPaintGround, runs = [];
    for (let i = 0; i < o.pts.length; i++) { const a = o.pts[i], b = o.pts[(i + 1) % o.pts.length]; if (a.on && b.on) runs.push([a.x, a.y, b.x, b.y, a.h * 1.05]); }
    if (G && G.castRuns && o.style !== 'rush') G.castRuns(B.cx, runs, { a: .24 });
    const back = o.pts.map((q, i) => Object.assign(q, { i })).filter(q => q.on && q.side.includes('n') && !covered(q.x, q.y - 4));
    for (const pass of [0, 1, 2]) for (const q of back) ringClump(B, G.rng(G.hash(Math.round(q.x), Math.round(q.y), 4720 + pass)), P, o, q, season, pass);
  }
  // the ring's sides and front, sorted down the screen so a nearer clump stands over a farther one, the gate and the tag
  function ringFront(B, r0, P, o, W, season, cb, lv) {
    const G = window.GardenPaintGround, fr = o.pts.map((q, i) => Object.assign(q, { i })).filter(q => q.on && !q.side.includes('n') && !covered(q.x, q.y - 4)).sort((a, b) => a.y - b.y);
    // (three passes by bands of rows, so the dark body of a lower clump never covers the lit top of the one behind it only partly)
    for (let s = 0; s < fr.length; ) { let e = s; while (e < fr.length && fr[e].y - fr[s].y < 6) e++; for (const pass of [0, 1, 2]) for (let k = s; k < e; k++) ringClump(B, G.rng(G.hash(Math.round(fr[k].x), Math.round(fr[k].y), 4720 + pass)), P, o, fr[k], season, pass); s = e; }
    if (o.gc && !covered(o.gx + o.gw / 2, o.Yf - 6)) {
      const y = o.Yf + .5;
      if (o.fk === 'crop') fieldGate(B, o.gx, y, o.gw, o.hf * .92, season); else if (o.fk === 'wood') stile(B, o.gx, y, o.gw, o.hf * .8); else wicket(B, o.gx + 1, y, o.gw - 2, o.hf * (o.fk === 'wet' ? .7 : .82));
      if (o.fk === 'wet') { B.f(B.rr(o.gx + 1, y - 2.6, o.gw - 2, 4, 1.5), '#8e7654').f(B.rr(o.gx + 1, y - 2.6, o.gw - 2, 1.3, .6), '#b49c76', .7); }   // a board laid over the wet at the way in
      const row = gardenLandCell(o.gc[0], o.gc[1]); if (row) sign(B, o.gx + o.gw / 2, y - o.hf * (o.fk === 'crop' ? .42 : .3), row, lv, true);
    }
    else {   // (no front onto walkable ground, or its way in hidden under a landmark, e.g. a field against the water: the tag stands on its lowest side run)
      const nb = o.pts.filter(q => q.on && q.side === 'n' && !covered(q.x, q.y - 4)), side = nb.length > 3 ? nb[nb.length >> 1] : fr.filter(q => q.side === 'e' || q.side === 'w').sort((a, b) => b.y - a.y)[Math.floor(fr.length / 12)] || fr[fr.length - 1];   // (the middle of the back run if it has one, a side never being by the water; else the lowest side run)
      if (side) { const row = gardenLandCell(o.cells[0][0], o.cells[0][1]), sx = side.x + side.nx * 5, sy = side.y + 2; if (row) { B.f(B.ell(sx + 1, sy, 3, 1), 'rgba(30,30,20,.3)').f(B.rect(sx - 1, sy - 13, 2.2, 13.5), '#5e4c36').f(B.rect(sx - 1, sy - 13, .9, 13.5), '#8a7454', .7); sign(B, sx, sy - 6, row, lv, true); } }   // (a small tag on a stake, the size of the gate tags)
    }
  }
  // the field's own ground inside the ring: a sward first, then what the field is, clipped to the ring's outline pulled in,
  // never over the water's drawn edge or under a landmark's picture
  function ringFill(B, P, p, o, W, season, extra) {
    const G = window.GardenPaintGround, cx = B.cx; cx.save();
    const clip = ringPath(o, 2.5); cx.clip(clip);
    const cut = new Path2D(); let cuts = 0; cut.rect(o.box[0] - 20, o.box[1] - 20, o.box[2] - o.box[0] + 40, o.box[3] - o.box[1] + 40);
    for (const w of (typeof gardenIslandData === 'function' ? gardenIslandData().freshwater || [] : [])) { if (!w.boundary || w.boundary.length < 3) continue; const bx = w.boundary.map(q => q[0] * W.cellW), by = w.boundary.map(q => W.sky + q[1] * W.cellH); if (Math.max(...bx) < o.box[0] || Math.min(...bx) > o.box[2] || Math.max(...by) < o.box[1] || Math.min(...by) > o.box[3]) continue; w.boundary.forEach((q, i) => i ? cut.lineTo(q[0] * W.cellW, W.sky + q[1] * W.cellH) : cut.moveTo(q[0] * W.cellW, W.sky + q[1] * W.cellH)); cut.closePath(); cuts++; }
    for (const b of covers()) if (b[2] > o.box[0] && b[0] < o.box[2] && b[3] > o.box[1] && b[1] < o.box[3]) { cut.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); cuts++; }
    if (cuts) cx.clip(cut, 'evenodd');
    const r = G.rng(G.hash(Math.round(o.X0), Math.round(o.Yb), 4601)), wint = season === 'winter';
    // a sward of the field's own, a shade darker than the meadow, with the ring's shadow lying in along its back
    const sw = o.fk === 'wet' ? (WET[season] || WET.summer)[0] : o.fk === 'wood' ? (wint ? '#5a5844' : '#40583a') : wint ? '#7a8466' : season === 'autumn' ? '#7a8a46' : '#5e8a3a';
    cx.globalAlpha = .9; cx.fillStyle = sw; cx.fill(clip); cx.globalAlpha = 1;
    for (let i = 0; i < (o.X1 - o.X0) * (o.Yf - o.Yb) / 70; i++) B.f(B.blob(r, o.X0 + r() * (o.X1 - o.X0), o.Yb + r() * (o.Yf - o.Yb), 3 + r() * 5, 1.4 + r() * 1.6, 6, .5), r() < .5 ? (P.lawnLo || '#4e7a32') : (P.lawnHi || '#8aae52'), .25);
    const m = 6, X0 = o.X0 + m, X1 = o.X1 - m, Y0 = o.Yb + 2, Y1 = o.Yf - 4;
    if (o.fk === 'allot') { cx.save(); const bed = ringPath(o, 7); cx.clip(bed); allotFill(B, r, p, season, X0, Y0, X1, Y1, extra || {}); cx.restore(); }
    else if (o.fk === 'crop') { cx.save(); cx.clip(ringPath(o, 5)); cropFill(B, r, p, season, X0 - 2, Y0, X1 + 2, Y1); cx.restore(); }
    else if (o.fk === 'wet') wetFill(B, r, p, season, o.X0 + 2, Y0, o.X1 - 2, Y1 + 2);
    else woodFill(B, r, p, season, o.X0 + 2, Y0, o.X1 - 2, Y1 + 2);
    // the ring's own shade lying in along its back and down its sunny side, so the fill sits under the ring, not beside it
    cx.globalAlpha = .22; cx.lineWidth = 9; cx.strokeStyle = '#1a2a12'; cx.stroke(clip); cx.globalAlpha = 1;
    cx.restore();
  }
  // the wet wood's shade spills a little way out over the grass round it, along the light (to the right and down)
  function woodShade(B, p, W) {
    const cw = W.cellW, ch = W.cellH, xs = p.cells.map(c => c[0]), ys = p.cells.map(c => c[1]), X0 = Math.min(...xs) * cw, X1 = (Math.max(...xs) + 1) * cw, Y0 = W.sky + Math.min(...ys) * ch, Y1 = W.sky + (Math.max(...ys) + 1) * ch;
    const cx = B.cx, m = cx.getTransform(), K = Math.hypot(m.a, m.b) || 1; cx.save(); cx.filter = 'blur(' + (10 * K).toFixed(1) + 'px)'; cx.globalAlpha = .18; cx.fillStyle = '#0e1a0e';
    cx.beginPath(); cx.ellipse((X0 + X1) / 2 + 14, (Y0 + Y1) / 2 + 8, (X1 - X0) / 2 + 18, (Y1 - Y0) / 2 + 12, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  // A valley field's edge, by its kind: the runs that show (not under a landmark's painting), each run's shadow first
  // (a ditch has none: it is cut into the ground), the one way in at the middle of the lowest front run, its sign beside it.
  function fieldFence(B, r0, P, p, W, season, cb, part) {
    const fk = fieldKindOf(p.id), cw = W.cellW, ch = W.cellH, lv = level(), inset = 3, hh = FH()[fk];
    { const e0 = p.edges[0]; hedgeVar = fk === 'crop' && e0 && hedgeOf.has(e0[0] + ',' + e0[1]) ? hedgeOf.get(e0[0] + ',' + e0[1]) : 0; }
    const G = window.GardenPaintGround, seen = (x, y) => !cb || !(x * cw + cw + 16 < cb[0] || x * cw - 16 > cb[2] || W.sky + y * ch + ch + 8 < cb[1] || W.sky + y * ch - 48 > cb[3]);
    const rOf = (x, y, side) => G && G.rng && G.hash ? G.rng(G.hash(x + 7, y + 11, side.charCodeAt(0) * 31 + 4100)) : r0;
    const northFoot = Math.min(ch - 2, hh * (fk === 'wet' ? .7 : 1) + 1), front = part !== 'back';
    const runs = [];
    for (const [x, y, side, nx, ny] of p.edges) {
      if (!locked(x, y, lv) || locked(nx, ny, lv)) continue;   // (yours, or two locked fields side by side: nothing between)
      const x0 = x * cw, y0 = W.sky + y * ch, horiz = side === 's' || side === 'n';
      const yy = side === 's' ? y0 + ch - inset : y0 + northFoot, xx = side === 'e' ? x0 + cw - inset : x0 + inset;
      if (covered(horiz ? x0 + cw / 2 : xx, horiz ? yy - 4 : y0 + ch / 2)) continue;
      runs.push({ x, y, side, x0, y0, horiz, yy, xx });
    }
    const has = new Set(runs.map(q => q.x + ',' + q.y + q.side));
    const fronts = runs.filter(q => q.side === 's'), yM = fronts.length ? Math.max(...fronts.map(q => q.y)) : 0, low = fronts.filter(q => q.y === yM).sort((a, b) => a.x - b.x), gate = low[low.length >> 1] || null;
    if (!front && fk !== 'wet' && G && G.castRuns) { const sh = []; for (const q of runs) { if (!seen(q.x, q.y)) continue; if (q.horiz) sh.push([q.x0, q.yy, q.x0 + cw, q.yy, hh * 1.05]); else { const from = has.has(q.x + ',' + q.y + 'n') ? northFoot : 0; sh.push([q.xx, q.y0 + from, q.xx, q.y0 + ch, hh * 1.05]); } } if (sh.length) G.castRuns(B.cx, sh, { a: .26 }); }
    const runOf0 = fk === 'crop' ? fieldHedge : fk === 'allot' ? hurdleRun : fk === 'wet' ? rushRun : thicketRun;
    const runOf = (B, r, P, x0, y0, horiz, len, season, h) => (fk === 'wood' && !(horiz && y0 - W.sky < 0) && (horiz ? front : true) ? rushRun : runOf0)(B, r, P, x0, y0, horiz, len, season, fk === 'wood' && (horiz ? front : true) ? FH().wet : h);
    for (const q of runs) {
      if (!seen(q.x, q.y) || (q.side === 's') !== front) continue;
      const r = rOf(q.x, q.y, q.side), from = q.horiz ? 0 : has.has(q.x + ',' + q.y + 'n') ? northFoot : 0;
      if (fk === 'wet' && q.side === 's') {
        // the front of a wet field: the rushes, and in front of them the ditch that drains it, a plank over it at the way in
        if (q === gate) { rushRun(B, r, P, q.x0, q.yy - 6, true, cw * .3, season, hh); rushRun(B, r, P, q.x0 + cw * .7, q.yy - 6, true, cw * .3, season, hh); } else rushRun(B, r, P, q.x0, q.yy - 6, true, cw, season, hh);
        ditchRun(B, r, P, q.x0, q.yy - 1, true, cw, season, -1);
        if (q === gate) plankGate(B, q.x0 + cw * .3, q.yy - 1, cw * .4, season);
        continue;
      }
      if (q.horiz && q === gate) {
        const gw = cw * (fk === 'crop' ? .62 : .42), gx = q.x0 + (cw - gw) / 2;
        const fh = fk === 'wood' ? hh * .62 : hh; runOf(B, r, P, q.x0, q.yy, true, gx - q.x0, season, fh); runOf(B, r, P, gx + gw, q.yy, true, q.x0 + cw - gx - gw, season, fh);
        if (fk === 'crop') fieldGate(B, gx, q.yy, gw, hh, season); else if (fk === 'allot') wicket(B, gx, q.yy, gw, hh); else stile(B, gx, q.yy, gw, hh);
      } else if (q.horiz) runOf(B, r, P, q.x0, q.yy, true, cw, season, fk === 'wood' && q.side === 's' ? hh * .62 : hh);
      else runOf(B, r, P, q.xx, q.y0 + from, false, ch - from, season, hh);
    }
    // its sign, a small weathered board on its own post just right of the way in
    if (front && gate && seen(gate.x, gate.y)) { const row = gardenLandCell(gate.x, gate.y); if (row) sign(B, gate.x0 + cw / 2, gate.yy - (fk === 'wet' ? 2 : hh * (fk === 'crop' ? .3 : .25)), row, lv, true); }
  }
  function fence(B, r, P, edges, W, season, cb) {
    { const e0 = edges[0]; hedgeVar = e0 && hedgeOf.has(e0[0] + ',' + e0[1]) ? hedgeOf.get(e0[0] + ',' + e0[1]) : 0; }
    const cw = W.cellW, ch = W.cellH, lv = level(), wood = ['#8a7454', '#a88e66', '#5e4c36'], RH = RUN_H();
    const fronts = [], inset = 3, drawn = new Set();
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
    let gateAt = '', gateShift = 0;
    { const fr = edges.filter(([x, y, side, nx, ny]) => side === 's' && locked(x, y, lv) && !locked(nx, ny, lv)); if (fr.length && regionKind(fr[0][0], fr[0][1]) === 'field') { const yM = Math.max(...fr.map(f => f[1])), lo = fr.filter(f => f[1] === yM).sort((a, b) => a[0] - b[0]), at = lo[lo.length >> 1]; gateAt = at[0] + ',' + at[1] + 's'; gateShift = 0; } }
    for (const [x, y, side, nx, ny] of edges) {
      if (!locked(x, y, lv) || locked(nx, ny, lv)) continue;   // (a plot that is yours, or two locked plots side by side: no fence between)
      if (side === 's') fronts.push([x, y]);
      if (!seen(x, y)) continue;
      const r = rOf(x, y, side), x0 = x * cw, y0 = W.sky + y * ch, kind = regionKind(x, y), hh = RH[kind], from = side === 'e' || side === 'w' ? sideFrom(x, y, kind) : 0;
      if (kind === 'field') {
        // the valley's fields: a hawthorn hedgerow, with a field gate in the front hedge where the sign hangs
        if (side === 's' || side === 'n') { const yy = side === 's' ? y0 + ch - inset : y0 + northFoot(kind); if (gateAt === x + ',' + y + side) { const gw = cw * .62, gx = x0 + (cw - gw) / 2 + gateShift; fieldHedge(B, r, P, x0, yy, true, gx - x0, season, hh); fieldHedge(B, r, P, gx + gw, yy, true, x0 + cw - gx - gw, season, hh); fieldGate(B, gx, yy, gw, hh, season); } else fieldHedge(B, r, P, x0, yy, true, cw, season, hh); }
        else fieldHedge(B, r, P, side === 'e' ? x0 + cw - inset : x0 + inset, y0 + from, false, ch - from, season, hh);
        continue;
      }
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
      const yMax = Math.max(...fronts.map(f => f[1])), low = fronts.filter(f => f[1] === yMax).sort((a, b) => a[0] - b[0]), at = low[low.length >> 1];
      const row = gardenLandCell(at[0], at[1]); if (row) sign(B, (at[0] + .5) * cw + (low.length % 2 || regionKind(at[0], at[1]) === 'field' ? 0 : -cw / 2), W.sky + (at[1] + 1) * ch - 1 - (regionKind(at[0], at[1]) === 'field' ? inset + 1 : 0), row, lv);
    }
  }
  function compose(C) {
    if (typeof gardenLandCell !== 'function' || typeof gardenIslandBaseCell !== 'function') return;
    const { add, W, P, season } = C, cw = W.cellW, ch = W.cellH;
    plotsMemo = null; coverMemo = null; ringMemo.clear();
    chooseHedges(plots());
    // round 3: the valley's fields by kind (fieldKindOf), the Furrows' shed, scarecrow and water butts given to its allotments
    const fieldPlots = new Set(), extras = new Map();
    { const fp = plots().filter(p => p.cells.some(c => regionKind(c[0], c[1]) === 'field')); fp.forEach(p => fieldPlots.add(p));
      const allots = fp.filter(p => fieldKindOf(p.id) === 'allot'), rowsOf = p => new Set(p.cells.map(c => c[1])).size, G = window.GardenPaintGround;
      const shedP = allots.filter(p => rowsOf(p) >= 3 && !/hop/.test(p.id)).sort((a, b) => a.cells[0][0] - b.cells[0][0])[0] || null;
      const scareP = allots.find(p => /furrow/.test(p.id) && p !== shedP) || allots.find(p => p !== shedP) || null;
      for (const p of allots) extras.set(p, { shed: p === shedP, scarecrow: p === scareP, butt: p === shedP || (!!G && !!G.hash && G.hash(p.cells[0][0], p.cells[0][1], 4611) % 3 === 0 && p !== scareP) }); }
    for (const p of plots()) {
      if (!p.edges.length) continue;
      if (fieldPlots.has(p)) {
        const fk = fieldKindOf(p.id), cx = p.cells.map(c => c[0]), cy = p.cells.map(c => c[1]), fb = [Math.min(...cx) * cw - 18, W.sky + Math.min(...cy) * ch - 30, (Math.max(...cx) + 1) * cw + 18, W.sky + (Math.max(...cy) + 1) * ch + 10];
        if (fk === 'wood') add([fb[0] - 30, fb[1], fb[2] + 50, fb[3] + 34], 3990 + p.cells.length, B => { if (p.cells.some(c => locked(c[0], c[1], level()))) woodShade(B, p, W); });
        // (fix round 2: a rectangle of cells gets the ring; anything else keeps the runs along its cell edges)
        if (ringOf(p, W, level())) {
          const pick = () => { const e0 = p.edges[0]; hedgeVar = fk === 'crop' && e0 && hedgeOf.has(e0[0] + ',' + e0[1]) ? hedgeOf.get(e0[0] + ',' + e0[1]) : 0; };
          add(fb, 3995 + p.cells.length, (B, r) => { const o = ringOf(p, W, level()); if (o) { pick(); ringBack(B, r, P, o, W, season); } });
          add(fb, 4000 + p.cells.length, B => { const o = ringOf(p, W, level()); if (o) ringFill(B, P, p, o, W, season, extras.get(p)); });
          add(fb, 4100 + p.cells.length, (B, r, cb) => { const o = ringOf(p, W, level()); if (o) { pick(); ringFront(B, r, P, o, W, season, cb, level()); } });
          continue;
        }
        add(fb, 3995 + p.cells.length, (B, r, cb) => fieldFence(B, r, P, p, W, season, cb, 'back'));
        add(fb, 4000 + p.cells.length, (B, r0, cb) => fieldFill(B, P, p, W, season, cb, fk, extras.get(p)));
        add(fb, 4100 + p.cells.length, (B, r, cb) => fieldFence(B, r, P, p, W, season, cb, 'front'));
        continue;
      }
      const xs = p.edges.map(e => e[0]), ys = p.edges.map(e => e[1]), bb = [Math.min(...xs) * cw - 16, W.sky + Math.min(...ys) * ch - 44,(Math.max(...xs) + 1) * cw + 8, W.sky + (Math.max(...ys) + 1) * ch + 8];
      // a valley field not yet yours lies fallow inside its hedge: long tussocky grass, sorrel and buttercups, cow parsley
      // along the hedge foot (painted first, under the hedge; gone with the hedge when the field is bought)
      if (p.cells.length && regionKind(p.cells[0][0], p.cells[0][1]) === 'field') add(bb, 4000 + p.cells.length, (B, r0, cb) => fallow(B, P, p.cells, W, season, cb));
      add(bb, 4100 + p.cells.length, (B, r, cb) => fence(B, r, P, p.edges, W, season, cb));
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
    lampMemo = null;
    for (const [i, q] of lamps().entries()) {
      const px = q.x * cw, py = W.sky + q.y * ch, Hh = q.h;
      C.thing({ key: 'vale-lamp|' + i + '|' + season + '|' + Math.round(Hh), x: px, y: py, box: [-16, -Math.ceil(Hh) - 8, 16, 8], foot: [-4, 4, 5], draw: B => {
        const iron = ['#2a2e30', '#4a5054', '#1a1c1e'], r = C.kit.rng(700 + i);
        B.f(B.ell(1, 1, 8, 2.6), 'rgba(30,30,20,.3)');
        B.f(B.rr(-5.5, -8, 11, 8, 2), '#8e8676').f(B.rect(-5.5, -8, 3.5, 8), '#b0a894', .6).f(B.rr(-6.5, -10, 13, 3, 1.2), '#6e685a');   // a dressed stone foot
        const T = -Hh + 2, Bt = -Hh + 12;
        B.s(`M0 -10V${Bt}`, iron[0], 3.2).s(`M-.9 -10V${Bt}`, iron[1], 1, .7).f(B.rr(-2.6, -Hh * .45, 5.2, 3, 1), iron[0]);
        B.s(`M0 ${Bt + 2}q5 -3 9 0`, iron[0], 1.6);   // the scroll under the lantern
        B.f(`M-6 ${T}L6 ${T}L5 ${Bt}L-5 ${Bt}Z`, '#f2d36b', .95).f(`M-6 ${T}L-1 ${T}L-1.5 ${Bt}L-5 ${Bt}Z`, '#fff2c0', .6).s(`M-6 ${T}L6 ${T}L5 ${Bt}L-5 ${Bt}ZM0 ${T}V${Bt}`, iron[0], 1.1);
        B.f(`M-8 ${T}L0 ${T - 6}L8 ${T}Z`, iron[0]).f(B.circ(0, T - 7, 1.6), iron[0]).f(B.rect(-5.5, Bt - .5, 11, 2), iron[0]);
        if (season !== 'winter') for (let k = 0; k < 7; k++) { const gx = -7 + r() * 14, l = 3 + r() * 4; B.s(`M${gx} 1q${(r() - .5) * 2} ${-l * .5} ${(r() - .5) * 3} ${-l}`, k & 1 ? '#6f8a40' : '#5a7a3a', 1, .9); }
      } });
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
  // A painted way never runs under a building (fix round 2, rule 12). Where a valley route's line runs in through the front
  // of a building that stops walking (the layout runs the marsh boardwalk in at the eel smokehouse's front and out behind its
  // chimney), its painting stops at the building's front and turns to the door; a short stretch beyond, hidden behind the
  // building, is not painted. Walking is unchanged: the building already stops the feet there, and the way round is open
  // ground. From the layout's own rows (statics that block, their doors); a route that goes on a long way past is left alone.
  const cutMemo = new WeakMap();
  function paintRoute(r) {
    if (!r || !Array.isArray(r.points) || r.points.length < 2) return r; if (cutMemo.has(r)) return cutMemo.get(r);
    let out = r; const Pt = r.points, blds = ((typeof gardenIslandData === 'function' && gardenIslandData().static) || []).filter(q => q.col === 'full' && (q.w || 1) >= 2 && inValley(Math.floor(q.x + (q.w || 1) / 2), q.y));
    const inside = (x, y) => blds.find(q => x > q.x + .04 && x < q.x + (q.w || 1) - .04 && y > q.y + .04 && y < q.y + (q.h || 1) - .04);
    scan: for (let i = 1; i < Pt.length; i++) { const a = Pt[i - 1], b = Pt[i], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 12)); let px = a[0], py = a[1];
      for (let k = 1; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, s = inside(x, y); if (!s) { px = x; py = y; continue; }
        if (py < s.y + (s.h || 1) - .12) break scan;   // (only a way that comes in at the front)
        let rest = Math.hypot(b[0] - x, b[1] - y); for (let j = i; j < Pt.length - 1; j++) rest += Math.hypot(Pt[j + 1][0] - Pt[j][0], Pt[j + 1][1] - Pt[j][1]); if (rest > 6) break scan;
        const pts = Pt.slice(0, i).concat([[+px.toFixed(2), +py.toFixed(2)]]), d = s.door; if (d && Math.hypot(d.x + .5 - px, d.y + .45 - py) < 1.8) pts.push([d.x + .5, d.y + .42]);
        out = Object.assign({}, r, { points: pts, cutAt: s.id }); break scan; } }
    cutMemo.set(r, out); return out;
  }
  if (window.GardenPaintGround && GardenPaintGround.setRouteHook) GardenPaintGround.setRouteHook(paintRoute);
  // The valley's lanterns (fix round 2: at night the valley had no light of its own). From the layout's rows: one beside the door
  // a painted way now ends at (the boardwalk at the smokehouse), and one at the far corner of a working yard by the water (the
  // mill yard), each where nothing else stands: off every painted way, off the water, clear of buildings, doors and fields.
  // Painted here as scenery whose foot stops the feet; the world lights them at dusk and night (94-garden-native-world.js).
  let lampMemo = null;
  function lamps() {
    if (lampMemo) return lampMemo; const out = [], D = typeof gardenIslandData === 'function' ? gardenIslandData() : null; if (!D) return out;
    const st = D.static || [], cw = GARDEN_WORLD.cellW, ch = GARDEN_WORLD.cellH, H = gardenSizePx('lamp', .15);
    const loops = (D.freshwater || []).filter(w => w.boundary && w.boundary.length > 2).map(w => w.boundary), inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const wet = (x, y) => loops.some(p => inPoly(x, y, p)), routes = (D.routes || []).map(paintRoute);
    const gap = (x, y, skip) => { let best = 99; for (const r of routes) { if (r === skip || r.tier === 'plaza' || !r.points) continue; const P = r.points, hw = r.tier === 'main' ? .5 : r.tier === 'lane' ? .34 : .24; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = (b[0] - a[0]) * cw, dy = (b[1] - a[1]) * ch, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, (((x - a[0]) * cw) * dx + ((y - a[1]) * ch) * dy) / l)); best = Math.min(best, Math.hypot((x - a[0]) * cw - dx * t, (y - a[1]) * ch - dy * t) / cw - hw); } } return best; };
    const clear = (x, y) => !wet(x, y) && !wet(x - .4, y) && !wet(x + .4, y) && gap(x, y) > .3 && !st.some(q => x > q.x - .7 && x < q.x + (q.w || 1) + .7 && y > q.y - .3 && y < q.y + (q.h || 1) + .9 || q.door && Math.hypot(q.door.x + .5 - x, q.door.y + .5 - y) < 1) && ![0, -1, -2].some(dy => [-1, 0, 1].some(dx => { const rw = gardenLandCell(Math.floor(x) + dx, Math.floor(y) + dy); return rw && rw.plot; }));
    for (const r of D.routes || []) { const p = paintRoute(r); if (!p.cutAt) continue; const s = st.find(q => q.id === p.cutAt), d = s && s.door; if (!d) continue;
      const end = p.points[p.points.length - 2] || p.points[0], side = end[0] < d.x + .5 ? 1 : -1;   // (on the side the way does not come from)
      for (const dx of [1.6, 1.9, .95]) { const x = d.x + .5 + side * dx, y = d.y + .55; if (!wet(x, y)) { out.push({ x, y, h: H, why: s.id }); break; } } }
    for (const pz of (D.routes || []).filter(r => r.tier === 'plaza' && r.points && r.points.length > 1 && inValley(Math.floor(r.points[0][0]), Math.floor(r.points[0][1])))) {
      const a = pz.points[0], b = pz.points[pz.points.length - 1], half = (pz.widthCells || 4) / 2 - .45;
      for (const t of [1, .9, .8, .7, .6]) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + half; if (clear(x, y)) { out.push({ x, y, h: H, why: pz.id }); break; } } }
    return lampMemo = out;
  }
  V.lamps = () => lamps();
  V.parts.push({ id: 'valley', compose });
  // (a look inside for the dev tools: each valley field's ring, how many of its points stand and on which sides)
  V._rings = () => { const W = GARDEN_WORLD, lv = level(); return plots().map(p => { const o = ringOf(p, W, lv); if (!o) return p.id + ':none'; const by = {}; for (const q of o.pts) { const k = q.side + (q.on ? '+' : '-') + (q.on && covered(q.x, q.y - 4) ? 'c' : ''); by[k] = (by[k] || 0) + 1; } return p.id + ' ' + o.fk + ' gate:' + (o.gc ? o.gc.join() : '-') + ' edges:' + p.edges.map(e => e[2] + (locked(e[3], e[4], lv) ? 'L' : '')).join('') + ' ' + JSON.stringify(by); }); };
})();
