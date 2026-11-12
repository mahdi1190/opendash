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
  const K = 1.5, CHUNK = 256, DEPTH = -9350;
  const GORGE_WATER = true;                // the gorge's water is painted with its walls; false leaves a hole for the water painter
  let current = null, sprites = [], lastError = null, stats = {};
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };

  const BASE = { rock: '#a49a8c', rockLo: '#7d7468', rockHi: '#c9c1b0', rockDk: '#4e473f', lichen: '#c9c48a', moss: '#7d8f4e', peat: '#5a4636', path: '#c4b089', pathLo: '#9c8a66', pathHi: '#dccfac', snow: '#fbfbf7', snowSh: '#c8d6e6', snowDk: '#a9bccf', pine: '#3c5a3a', pineHi: '#58784a', bark: '#b06a3a', water: '#6d9fb0', shallow: '#93bfbd', foam: '#eef2e2', cave: '#1d2224' };
  const PAL = {
    summer: Object.assign({}, BASE, { fell: '#a6b276', fellLo: '#8c9a5e', fellHi: '#c2c78e', bleach: '#d6cfa8', heather: '#8d6a92', heatherHi: '#b07ab8', heatherLo: '#5f4a62', bloom: '#b98cc0', bracken: '#7f8c48', far: ['#a9b5bd', '#93a3ad', '#7f919c'], farSnow: 0 }),
    spring: Object.assign({}, BASE, { fell: '#a2b672', fellLo: '#86a05a', fellHi: '#bccb88', bleach: '#cfcba0', heather: '#7e6478', heatherHi: '#9a7e92', heatherLo: '#56445a', bloom: null, bracken: '#8a9050', far: ['#adb8c0', '#97a6b0', '#83959f'], farSnow: .45 }),
    autumn: Object.assign({}, BASE, { fell: '#b0a670', fellLo: '#948a58', fellHi: '#c8bd88', bleach: '#d6cb9a', heather: '#7e6258', heatherHi: '#987460', heatherLo: '#5a4640', bloom: null, bracken: '#9c7046', far: ['#b1b6b8', '#9ba2a6', '#878f95'], farSnow: .2 }),
    winter: Object.assign({}, BASE, { fell: '#a8a78e', fellLo: '#8e8d76', fellHi: '#c0bfa6', bleach: '#cfcab0', heather: '#7a5a4a', heatherHi: '#8e6e5a', heatherLo: '#54403a', bloom: null, bracken: '#8a5a3a', far: ['#b9c2ca', '#a2aeb8', '#8e9ba6'], farSnow: .85 }),
  };
  let HP = null;                                                            // heather on the pasture: softer, nearer the turf
  const SNOW = { winter: 99, spring: 7.5, autumn: -9, summer: -9 };          // the snow line on the fell, in cell rows (snow north of it)
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
    HP = Object.assign({}, P, { heather: kit.mix(P.heather, P.fell, .45), heatherLo: kit.mix(P.heatherLo, P.fellLo, .5), heatherHi: kit.mix(P.heatherHi, P.fellHi, .45) });
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
        for (let k = 0; k < (moor(tx) > .5 ? 6 : 3); k++) {
          const x = tx + r() * 150, y = ty + r() * 150, m = moor(x), n = kit.fbm(x / 420, y / 300, 5), s = 40 + r() * 70;
          const col = m > .5 && r() < .85 ? (r() < .5 ? P.heather : P.heatherLo) : n > .55 ? P.fellHi : n < .4 ? P.fellLo : r() < .3 ? P.bleach : P.fell;
          B.f(B.blob(r, x, y, s * (m > .5 ? .7 : 1), s * (m > .5 ? .36 : .5), 9, .6), col, m > .5 ? .24 : .13 + r() * .12);
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
          B.cx.save(); B.cx.translate(RX * s * .05 + 2, RY * s * .1 + 2.5); B.f(d, m > .5 ? P.heatherLo : P.fellLo, .3); B.cx.restore();
          B.f(d, base, .38);
          B.f(B.blob(rr, cx0 - RX * s * .28, cy0 - RY * s * .3, RX * s * .42, RY * s * .26, 8, .4), P.fellHi, .22);
        }
      });
    });
    // 2b. Aprons round the peaks: scree and boulder fields that run out from each mountain's foot into the fell.
    for (const pk of L.peaks) { const b = kit.bboxOf(pk.pts), cx0 = (b[0] + b[2]) / 2, cy0 = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) * .72, ry = (b[3] - b[1]) * .85;
      add([cx0 - rx - 30, cy0 - ry - 30, cx0 + rx + 30, cy0 + ry + 40], 160 + pk.id.length, (B, r) => {
        clipFell(B);
        for (let k = 0; k < 4; k++) { const s = 1 - k * .2; B.f(B.blob(r, cx0 + k * 4, cy0 + k * 6, rx * s, ry * s, 12, .35), k < 2 ? P.fellLo : kit.mix(P.rock, P.fell, .5), .18 + k * .08); }
        for (let k = 0; k < 140; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = cx0 + Math.cos(a) * rx * d, y = cy0 + Math.sin(a) * ry * d + ry * .2; if (!fellAt(x, y)) continue;
          if (d < .75 && r() < .25) B.boulder(r, x, y, 6 + r() * 9, 4 + r() * 6, P, snowRow > 90); else B.stone(r, x, y, 1.4 + r() * 3.4, .9 + r() * 2, P, snowRow > 90 ? 'snow' : null); }
      }); }
    // 3. The near ground: heather clumps, tussocks, turf, stones, sheep trods, peat hags, cotton grass and bracken, by hashed tiles.
    add(fellBB, 21, (B, r0, cb) => {
      clipFell(B);
      const peakNear = (x, y) => L.peaks.some(pk => { const b = kit.bboxOf(pk.pts); return x > b[0] - 90 && x < b[2] + 90 && y > b[1] - 40 && y < b[3] + 70; });
      kit.tiles(cb, 64, 24, 7, (tx, ty, r) => {
        for (let k = 0; k < 7; k++) {
          const x = tx + r() * 64, y = ty + r() * 64, pick = r(), sz = r(); if (!fellAt(x, y)) continue;
          const m = moor(x), row = (y - W.sky) / ch, tarnNear = Math.hypot(x / cw - 31, row - 11) < 7.5, wet = tarnNear || Math.hypot(x / cw - 73, row - 18) < 4.2;
          const drift = kit.fbm(x / 230, y / 150, 77), fern = kit.fbm(x / 210, y / 130, 91);
          if ((m > .25 ? drift > .62 - m * .3 : drift > .74) && pick < .6) { B.cx.globalAlpha = 1; B.heather(r, x, y, 4 + sz * 5, m > .25 ? P : HP, P.bloom && drift > .62 && r() < .7 ? P.bloom : null); continue; }
          if (pick < .5) { B.tufts(r, x, y, 10, 4 + Math.floor(sz * 4), [P.fellLo, P.fellHi, P.bleach], 5); continue; }
          if (pick < .62 && (peakNear(x, y) || row < 11 && x > 44 * cw && x < 56 * cw || r() < .25)) { B.stone(r, x, y, 2 + sz * 4, 1.2 + sz * 2.2, P); continue; }
          if (pick < .7 && wet) { B.f(B.blob(r, x, y, 5 + sz * 4, 2.6 + sz * 2, 7, .5), P.fellLo, .7); B.tufts(r, x, y - 1, 9, 7, ['#6f7f48', P.bleach], 7); if (season !== 'winter' && season !== 'autumn') for (let i = 0; i < 4; i++) B.f(B.circ(x + (r() - .5) * 10, y - 6 - r() * 4, 1.3), '#f6f4ec', .95); continue; }
          if (pick < .78 && x > 46 * cw && m < .2) { const L2 = 16 + sz * 26; B.s(`M${x} ${y}q${L2 / 2} ${-2 - r() * 3} ${L2} ${(r() - .5) * 3}`, P.fellLo, 1.4, .55).s(`M${x} ${y - 1.2}q${L2 / 2} ${-2 - r() * 3} ${L2} ${(r() - .5) * 3}`, P.fellHi, .8, .5); continue; }
          if (pick < .8 && m > .4 && drift > .58) { const w = 8 + sz * 10; B.f(B.blob(r, x + 1, y + 2.4, w, w * .26, 8, .4), P.peat, .85).f(B.blob(r, x - .5, y - .6, w * .92, w * .2, 8, .45), P.heatherLo, .85).f(B.blob(r, x - w * .2, y - 1.2, w * .45, w * .1, 7, .5), P.heather, .7); continue; }
          if (fern > .7 && pick < .9 && season !== 'winter' && (m > .15 || row > 16)) { for (let f = 0; f < 4; f++) { const a = -Math.PI / 2 + (f - 1.5) * .55 + (r() - .5) * .3, l = 6 + r() * 4, ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l * .8; B.s(`M${x} ${y}Q${(x + ex) / 2 + 1.5} ${(y + ey) / 2 - 1} ${ex} ${ey}`, P.bracken, 1, .6); for (let k = 1; k < 4; k++) { const t = k / 4, px = x + (ex - x) * t, py = y + (ey - y) * t; B.s(`M${px} ${py}l${2.6 - t * 1.4} ${1 - t}M${px} ${py}l${-2.4 + t * 1.2} ${1.2 - t}`, P.bracken, .8, .55); } } continue; }
        }
      });
    });
    // 4. The far fells beyond the north edge (backdrop only): three ranges of real peaks going into haze, each peak lit on
    //    its west flank and shaded on its east, snow on the far tops by season; the near range is fell-coloured and meets the fell.
    add([-60, top - 40, Math.min(worldW, 84 * cw), W.sky + 40], 31, (B) => {
      B.cx.clip(coastP, 'evenodd');
      const xs0 = -80, xs1 = Math.min(worldW, 82.5 * cw), foot = W.sky + 4;
      const nearCol = kit.mix(P.fellLo, P.far[2], .35), cols = [P.far[0], P.far[1], nearCol];
      for (let layer = 0; layer < 3; layer++) {
        const rr = kit.rng(700 + layer), base = [W.sky - 34, W.sky - 14, foot][layer], amp = [118, 92, 58][layer], col = cols[layer], peaks = [];
        for (let x = xs0 + rr() * 120; x < xs1 + 100; x += [150, 120, 100][layer] + rr() * [260, 200, 150][layer]) peaks.push({ x, h: amp * (.45 + rr() * .55), w: [150, 120, 95][layer] * (.7 + rr() * 1.1), sharp: .8 + rr() * .9 }); for (const pk of peaks) if (rr() < .35) pk.h *= .45;
        const prof = []; for (let x = xs0; x <= xs1 + 60; x += 8) { let y = 0; for (const pk of peaks) { const u = Math.abs(x - pk.x) / pk.w; if (u < 1) y = Math.max(y, pk.h * Math.pow(1 - u, pk.sharp)); } y += (kit.noise(x / 26, layer, 61) - .5) * 7 + amp * .12; prof.push({ x, y: base - y }); }
        const end = prof[prof.length - 1], body = B.poly(prof.concat([{ x: end.x + 60, y: foot }, { x: xs0, y: foot }]));
        B.f(body, col);
        B.cx.save(); B.cx.clip(new Path2D(body));
        for (const pk of peaks) {
          const tx = pk.x, ty = base - pk.h - amp * .12, lit = kit.mix(col, '#fff6e6', layer === 2 ? .14 : .22), sh = kit.mix(col, '#2e3a48', layer === 2 ? .16 : .12);
          B.f(B.poly([{ x: tx, y: ty }, { x: tx - pk.w * 1.05, y: foot + 2 }, { x: tx - pk.w * .05, y: foot + 2 }]), lit, .55);
          B.f(B.poly([{ x: tx, y: ty }, { x: tx + pk.w * .12, y: foot + 2 }, { x: tx + pk.w, y: foot + 2 }]), sh, .45);
          // a gully or two down each flank
          for (let g = 0; g < 2; g++) { const gx = tx + (g ? 1 : -1) * pk.w * (.18 + rr() * .2), gy = ty + pk.h * (.25 + rr() * .2); B.s(`M${tx + (gx - tx) * .3} ${ty + (gy - ty) * .3}L${gx} ${gy + pk.h * .35}`, sh, 2 + rr() * 2, .35); }
          const sn = P.farSnow * (layer === 0 ? 1 : layer === 1 ? .75 : .35);
          if (sn > .05) { const d = pk.h * sn * .7, jag = []; for (let k = 0; k <= 6; k++) { const t = k / 6; jag.push({ x: tx - pk.w * d / pk.h * 1.1 + t * pk.w * d / pk.h * 2.1, y: ty + d * (.75 + (k % 2 ? .35 : 0) * rr()) }); }
            const cap = B.poly([{ x: tx, y: ty - 2 }].concat(jag.slice().reverse())); B.f(cap, P.snowSh, .95); B.f(B.poly([{ x: tx, y: ty - 2 }, jag[0], jag[2], jag[3]]), P.snow, .95); }
        }
        B.cx.restore();
        // aerial haze: the farther the range, the paler it is near its foot
        B.f(body, B.lin(0, base - amp, 0, foot, [[0, 'rgba(232,238,240,0)'], [1, kit.rgba('#e6ecee', [.55, .38, .2][layer])]]));
      }
      B.f(B.rect(xs0, W.sky - 20, xs1 - xs0 + 70, 40), B.lin(0, W.sky - 20, 0, W.sky + 20, [[0, kit.rgba('#e4eaec', 0)], [.6, kit.rgba('#e4eaec', .28)], [1, kit.rgba('#e4eaec', 0)]]));
    });
    // 5. Snow above the snow line: a white blanket with a ragged edge, blue shade in the south-east falls, rock and heather through it.
    if (snowRow > -5) add(fellBB, 41, (B, r0, cb) => {
      clipFell(B);
      if (snowRow > 90) B.f(B.rect(cb[0] - 2, Math.max(cb[1] - 2, W.sky - 4), cb[2] - cb[0] + 4, cb[3] - cb[1] + 4), P.snow, 1);
      else {
        // one crisp, lobed snow line (north of it white), lingering drifts below it in the hollows, bare tussock islands above
        const edge = []; for (let x = cb[0] - 24; x <= cb[2] + 24; x += 6) edge.push({ x, y: W.sky + (snowRow + (kit.fbm(x / 140, 3.1, 41) - .5) * 4.5) * ch + Math.sin(x / 9) * 2.2 + (kit.noise(x / 23, 1, 7) - .5) * 9 });
        B.f(B.poly([{ x: cb[0] - 24, y: W.sky - 6 }].concat(edge, [{ x: cb[2] + 24, y: W.sky - 6 }])), P.snow, 1);
        B.s(B.line(edge.map(p => ({ x: p.x + 1, y: p.y + 1.5 }))), P.snowSh, 2.2, .7);
        kit.tiles(cb, 36, 24, 9, (tx, ty, r) => { for (let k = 0; k < 4; k++) { const x = tx + r() * 36, y = ty + r() * 36, s = snowAt(x, y); if (y < W.sky) continue;
          if (s > .02 && s < .98 && r() < .5) { const R = 4 + r() * 9; B.f(B.blob(r, x + 1, y + 1.4, R, R * .42, 8, .45), P.snowSh, .8).f(B.blob(r, x, y, R, R * .4, 8, .45), P.snow, .97); }
          else if (s >= .98 && r() < .18) { const R = 3 + r() * 6; B.f(B.blob(r, x, y, R, R * .45, 7, .5), moor(x) > .4 ? P.heatherLo : P.fellLo, .8).f(B.blob(r, x - R * .2, y - 1, R * .6, R * .2, 6, .5), P.bleach, .6); } } });
      }
      if (snowRow > 90) tops.forEach(([x, y, rx, ry, n], hi) => { const c = L.cpt(x, y); for (let k = 0; k < n; k++) { const s = 1 - k / (n + .4), rr = kit.rng(900 + hi * 31 + k), cx0 = c.x - k * 5, cy0 = c.y - k * ry * ch * .18; if (snowAt(cx0, cy0) <= .2) continue; const d = B.blob(rr, cx0, cy0, rx * cw * s, ry * ch * s, 11, .32); B.cx.save(); B.cx.translate(rx * cw * s * .06 + 3, ry * ch * s * .12 + 3); B.f(d, P.snowSh, .55); B.cx.restore(); B.f(d, P.snow, .85); } });
      kit.tiles(cb, 56, 10, 13, (tx, ty, r) => {
        for (let k = 0; k < 6; k++) { const x = tx + r() * 56, y = ty + r() * 56, s = snowAt(x, y); if (s < .6 || !fellAt(x, y)) continue; const p = r();
          if (p < .14) B.f(B.blob(r, x, y, 14 + r() * 18, 2 + r() * 2.4, 7, .5), P.snowSh, .5);
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
        for (const p of near) { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 13)); if (rr() < .1) B.stone(rr, p.x + (rr() - .5) * wpx * .9, p.y + (rr() - .5) * wpx * .45, .9 + rr() * 1.6, .6 + rr() * .9, P); if (snowy(p) && rr() < .5) B.f(B.ell(p.x + (rr() - .5) * 5, p.y + (rr() - .5) * 3, 1.3, .8), P.snowDk, .8); }
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
    const kit = KIT(), W = L.W, hw = L.gorge.halfWidth || .85, line = kit.resample(L.gorge.line.map(p => ({ x: p[0], y: p[1] })), .14).map(p => [p.x, p.y]), n = line.length;
    // banks in cell space (the cells are not square), then world px
    const nrm = line.map((p, i) => { const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
    const far = [], farIn = [], near = [], nearIn = [], mid = [];
    line.forEach((p, i) => {
      const [nx, ny] = nrm[i], t = i / (n - 1), s = ny < 0 ? 1 : -1;      // s points the normal to the far (northern, upper) bank
      const depth = .3 + t * .16;
      far.push(L.pt([p[0] + nx * s * (hw + .1), p[1] + ny * s * (hw + .1)])); farIn.push(L.pt([p[0] + nx * s * hw * (1 - depth * 2), p[1] + ny * s * hw * (1 - depth * 2)]));
      near.push(L.pt([p[0] - nx * s * (hw + .05), p[1] - ny * s * (hw + .05)])); nearIn.push(L.pt([p[0] - nx * s * hw * .78, p[1] - ny * s * hw * .78])); mid.push(L.pt(p));
    });
    const bb = kit.bboxOf(far.concat(near), 40);
    // the ford at the stepping stones: the river runs on through the path's gap as shallows, with flat stones across
    add(bb, 141, (B, r, cb) => {
      // the young river itself (the gorge is one picture: its water, its walls): dark in the deep middle, paler at the edges, white water
      if (GORGE_WATER) {
        const chan = B.poly(far.concat(near.slice().reverse()));
        B.f(chan, '#5d8fa2'); B.s(B.line(mid), '#4a7a8e', hw * W.cellH * 1.1, .8); B.s(B.line(mid.map(p => ({ x: p.x - 3, y: p.y - 2 }))), '#8fb9bf', hw * W.cellH * .35, .35);
        for (let i = 1; i < mid.length - 1; i += 2) { const rr = kit.rng(7001 + i), p = mid[i], q = near[i], t = rr(); const x = p.x + (q.x - p.x) * t * .8, y = p.y + (q.y - p.y) * t * .8; if (rr() < .55) B.s(`M${x - 5} ${y}q5 -2 10 0`, P.foam, 1.1 + rr(), .55 + rr() * .3); }
      }
      // the far wall: weathered rock from the lip down into the water, deeper towards the falls
      const G = { lit: '#a39886', mid: '#827868', shade: '#5c554c', deep: '#323a38', hi: '#cdc2ac', damp: '#4f6446', moss: P.moss, heather: P.heather, snow: P.snow };
      kit.rockBand(B, far, farIn, far.map((_, i) => i), (i, k) => kit.rng(9001 + i * 131 + k * 17), G, { snowy, size: .7, tiers: [[.3, 1], [.72, .8]] });
      B.s(B.line(farIn), '#2e3a3c', 2.4, .4);   // the wet foot of the wall
      B.s(B.line(far), snowy ? P.snow : P.rockHi, 2.2, .95);
      // moss, ferns and heather along the far lip
      for (let i = 0; i < far.length; i += 2) { const p = far[i]; if (r() < .6) B.f(B.blob(r, p.x + (r() - .5) * 6, p.y - 1, 3 + r() * 4, 1.6 + r() * 1.6, 6, .5), snowy ? P.snow : r() < .5 ? P.moss : P.fellLo, .9); if (!snowy && r() < .25) for (let k = 0; k < 4; k++) B.s(`M${p.x} ${p.y + 1}q${(k - 1.5) * 2} 2 ${(k - 1.5) * 4} 6`, '#5f7a3c', 1, .85); }
      // the near lip: a lit rim with a dark undercut into the water and boulders at the edge
      B.s(B.line(nearIn), P.rockDk, 4, .32).s(B.line(near), P.rockLo, 3.6, .95).s(B.line(near.map(p => ({ x: p.x, y: p.y - 1.4 }))), snowy ? P.snow : P.rockHi, 1.8, .9);
      for (let i = 0; i < near.length; i += 3) { const p = near[i]; if (r() < .5) B.stone(r, p.x + (r() - .5) * 6, p.y, 3 + r() * 4, 2 + r() * 2, P, snowy ? 'snow' : P.lichen); }
      // white water: short foam strokes in the channel, more towards the falls
      for (let i = 2; i < mid.length - 1; i++) { const t = i / mid.length, p = mid[i], q = farIn[i]; if (r() < .35 + t * .4) { const x = (p.x + q.x) / 2 + (r() - .5) * 8, y = (p.y + q.y) / 2 + 4 + (r() - .5) * 6; B.s(`M${x} ${y}q4 -1.4 8 0`, P.foam, 1.2, .75); } }
    });
    const xs = (L.D.presentation.crossings || []).filter(c => c.over === 'gorge');
    for (const c of xs) { const p = L.cpt(c.x, c.y); add([p.x - 60, p.y - 50, p.x + 60, p.y + 50], 131, (B, r) => {
      const i = mid.reduce((bi, q, k) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(mid[bi].x - p.x, mid[bi].y - p.y) ? k : bi, 0), seg = mid.slice(Math.max(0, i - 5), i + 6);
      B.s(B.line(seg), P.rockLo, hw * 2 * W.cellH * .95, .9).s(B.line(seg), P.water, hw * 2 * W.cellH * .8, 1).s(B.line(seg), P.shallow, hw * W.cellH * .9, .7);
      for (let k = 0; k < 4; k++) { const q = mid[Math.max(0, Math.min(mid.length - 1, i))], a = (k - 1.5) * 12; B.f(B.ell(q.x - 8 + a * .9 + 2, q.y - a * .55 + 2, 7, 3.6), P.rockDk, .45).f(B.blob(r, q.x - 8 + a * .9, q.y - a * .55, 7, 3.6, 7, .25), P.rock).f(B.ell(q.x - 10 + a * .9, q.y - a * .55 - 1, 3.5, 1.4), P.rockHi, .8).s(`M${q.x - 14 + a * .9} ${q.y - a * .55 + 2}q6 2 12 0`, P.foam, 1, .7); }
    }); }
  }

  /* ---------- the Edge ---------- */
  function scarpOps(L, P, add, run, ri, season, moor, snowy) {
    const kit = KIT(), W = L.W, n = run.length;
    if (n < 2) return;
    // resample lip and foot together, every 6 px
    const pairs = []; for (let i = 1; i < n; i++) { const a = run[i - 1], b = run[i], len = Math.hypot(b.lip.x - a.lip.x, b.lip.y - a.lip.y), k = Math.max(1, Math.ceil(len / 6)); for (let j = 0; j < k; j++) { const t = j / k; pairs.push({ lip: { x: a.lip.x + (b.lip.x - a.lip.x) * t, y: a.lip.y + (b.lip.y - a.lip.y) * t }, foot: { x: a.foot.x + (b.foot.x - a.foot.x) * t, y: a.foot.y + (b.foot.y - a.foot.y) * t } }); } }
    pairs.push(run[n - 1]);
    const L2 = pairs.map(p => p.lip), F2 = pairs.map(p => p.foot), N = pairs.length;
    const worldW = W.cols * W.cellW, openStart = L2[0].x > 30, openEnd = L2[N - 1].x < worldW - 30;
    const at = (t, i) => ({ x: L2[i].x + (F2[i].x - L2[i].x) * t, y: L2[i].y + (F2[i].y - L2[i].y) * t });
    const seed = 300 + ri * 17, R = (i, k) => kit.rng(seed * 7919 + i * 131 + k * 17);
    // the beds are shared by the whole run (seeded once), so pieces meet without a seam
    const rb = kit.rng(seed), beds = [0, .2 + rb() * .06, .42 + rb() * .06, .62 + rb() * .06, .82, 1];
    const bedAt = (b, k) => beds[b] + (b && b < beds.length - 1 ? (kit.noise(k / 9, b, 3) - .5) * .05 : 0);
    const breaks = beds.slice(0, -1).map((_, b) => { const out = [0], rr = R(0, 50 + b); let i = 0; while (i < N - 1) { i = Math.min(N - 1, i + 8 + Math.floor(rr() * 18)); out.push(i); } return out; });
    const G = { lit: '#ada08a', mid: '#8a7f6e', shade: '#625a50', deep: '#3a342e', hi: '#d2c6ae', damp: '#5d6a48', moss: P.moss, heather: P.heather, snow: P.snow };
    const cols = [0]; { const rc = R(0, 90); let i = 0; while (i < N - 1) { i = Math.min(N - 1, i + 5 + Math.floor(rc() * 8)); cols.push(i); } }
    const PIECE = 40;
    for (let s0 = 0; s0 < N - 1; s0 += PIECE) {
      const s1 = Math.min(N - 1, s0 + PIECE), idx = []; for (let i = s0; i <= s1; i++) idx.push(i);
      const bb = kit.bboxOf(idx.map(i => L2[i]).concat(idx.map(i => F2[i])), 40); bb[3] += 34;
      // the shadow it throws on the vale (light from the upper left: below and to the right), and the scree fans
      add(bb, seed + s0, (B) => {
        B.cx.filter = 'blur(6px)';
        B.f(B.poly(idx.map(i => ({ x: F2[i].x + 4, y: F2[i].y - 6 })).concat(idx.slice().reverse().map(i => ({ x: F2[i].x + 14, y: F2[i].y + 22 })))), '#28301e', .26);
        B.cx.filter = 'none';
        for (const i of idx) { if (i % 5) continue; const rr = R(i, 1); if (rr() < .45) continue; const p = F2[i], w = 10 + rr() * 22;
          B.f(B.poly([{ x: p.x - w * .3, y: p.y - 4 }, { x: p.x + w * .4, y: p.y - 4 }, { x: p.x + w * .7, y: p.y + 8 + rr() * 6 }, { x: p.x - w * .6, y: p.y + 7 + rr() * 6 }]), snowy ? P.snowSh : P.rockLo, .6);
          for (let k = 0; k < 6; k++) B.stone(rr, p.x + (rr() - .5) * w * 1.1, p.y + rr() * 10, 1.2 + rr() * 2.4, .8 + rr() * 1.4, P, snowy && rr() < .5 ? 'snow' : null); }
        for (const i of idx) { if (i % 9) continue; const rr = R(i, 8); if (rr() < .62) continue; const p = F2[i], w = 8 + rr() * 9; B.boulder(rr, p.x + (rr() - .5) * 10, p.y + 3 + rr() * 9, w, w * (.55 + rr() * .3), Object.assign({}, P, { rock: '#988d7c', rockLo: '#6e655a', rockHi: '#c2b7a2' }), snowy); }
      });
      // the face: weathered gritstone in rounded masses, tier on tier, lit on the upper left; moss and heather on the tops
      add(bb, seed + s0 + 1, (B) => { kit.rockBand(B, L2, F2, idx, R, G, { snowy }); });
      // the lip: the fell's edge, lit; turf and heather hang over it; snow cornices in deep winter
      add(bb, seed + s0 + 2, (B) => {
        B.s(B.line(idx.map(i => ({ x: L2[i].x, y: L2[i].y + 1.5 }))), P.rockDk, 2.4, .35);
        for (const i of idx) { const rr = R(i, 3), p = L2[i]; if (rr() < .35) continue; const m = moor(p.x), col = snowy ? (rr() < .6 ? P.snow : P.snowSh) : m > .45 && rr() < .7 ? (rr() < .5 ? P.heather : P.heatherLo) : rr() < .5 ? P.fellLo : P.fell;
          B.f(B.blob(rr, p.x + (rr() - .5) * 4, p.y + .5 + rr() * 1.6, 3 + rr() * 4, 1.6 + rr() * 2.2, 6, .5), col, .95); }
        B.s(B.line(idx.map(i => ({ x: L2[i].x, y: L2[i].y - 1.6 }))), snowy ? '#ffffff' : P.fellHi, 2.2, .75);
        if (!snowy) for (const i of idx) { if (i % 2) continue; const rr = R(i, 4); if (rr() < .5) B.tufts(rr, L2[i].x, L2[i].y + 1.5, 6, 3, [P.fellLo, P.bleach], 5); }
        const cap = (i, dir) => { const a = L2[i], b = F2[i], w = 12 * dir, pts = [a, { x: a.x + w * .6, y: a.y + 3 }, { x: a.x + w, y: (a.y + b.y) / 2 }, { x: b.x + w * .9, y: b.y }, b];
          B.f(B.poly(pts), dir < 0 ? P.rockHi : P.rockDk, dir < 0 ? .85 : .75).f(B.poly([a, { x: a.x + w * .6, y: a.y + 3 }, { x: a.x + w * .4, y: a.y + 6 }, { x: a.x, y: a.y + 4 }]), snowy ? P.snow : P.fell, .95);
          for (let k = 0; k < 3; k++) B.s(`M${a.x + w * (.3 + k * .2)} ${a.y + 6 + k * 4}l${w * .1} 10`, P.rockDk, .8, .4); };
        if (openStart && s0 === 0) cap(0, -1); if (openEnd && s1 === N - 1) cap(N - 1, 1);
      });
    }
    // pines along the Edge: a few wind-bent Scots pines leaning east, on the rock (occluders)
    const pines = []; for (let i = 10; i < N - 10; i += 50 + Math.floor(R(i, 5)() * 90)) { const rr = R(i, 6); if (rr() < .55 || moor(L2[i].x) > .7) continue; pines.push({ x: L2[i].x + (F2[i].x - L2[i].x) * .3, y: L2[i].y + (F2[i].y - L2[i].y) * .55, h: 52 + rr() * 26, seed: seed * 7 + i }); }
    add(kit.bboxOf(L2, 10), seed + 3, () => {}, { decor: true, pines });
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
      const top = [], bot = []; for (let x = -50; x <= 50; x += 4) { const yy = c.y - 5 + Math.sin(x / 14) * 1.5; top.push({ x: c.x + x, y: yy }); bot.push({ x: c.x + x + 1, y: yy + 13 }); }
      B.f(B.poly(top.map(p => ({ x: p.x, y: p.y - 3 })).concat(top.slice().reverse())), snowy ? P.snow : P.fellHi, .9);
      kit.rockBand(B, top, bot, top.map((_, i) => i), (i, k) => kit.rng(4511 + i * 31 + k), { lit: '#ada08a', mid: '#8a7f6e', shade: '#625a50', deep: '#3a342e', hi: '#d2c6ae', damp: '#5d6a48', moss: P.moss, heather: P.heather, snow: P.snow }, { snowy, size: .8, tiers: [[.45, 1]] });
      B.s(B.circ(c.x + 14, c.y + 1, 2.4), '#2c2a26', 1.3, .9).f(B.circ(c.x + 14, c.y - 1.4, .9), '#2c2a26', .9);
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
      B.f(face, B.lin(0, bb[1], 0, bb[3], [[0, '#9c9480'], [1, '#6e6858']]));
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
      for (let i = 0; i < top.length; i += 2) { const p = top[i], h = 3.6 + r() * 2.4, w = 3.2 + r() * 2; B.f(`M${p.x - w / 2} ${p.y + 1}L${p.x - w / 2} ${p.y - h + 1.4}Q${p.x} ${p.y - h - .6} ${p.x + w / 2} ${p.y - h + 1.2}L${p.x + w / 2} ${p.y + 1}Z`, r() < .5 ? '#a39a84' : '#8f8672').f(B.rect(p.x - w / 2, p.y - h + 1.4, w * .35, h - .4), '#d6cfb8', .7).f(B.rect(p.x + w / 2 - w * .25, p.y - h + 1.6, w * .25, h - .6), '#5e574a', .5); }
      for (let i = 0; i < top.length; i += 2) { const p = top[i]; if (r() < .4) B.f(B.blob(r, p.x, p.y - 3, 3 + r() * 3, 1.2 + r(), 6, .5), snowy ? P.snow : r() < .5 ? P.moss : '#8fa860', .9); }
      if (snowy) B.s(B.line(top.map(p => ({ x: p.x, y: p.y - 4.5 }))), P.snow, 2.6, .9);
      B.s(B.line(kit.resample(lower, 6)), '#4a463a', 1.8, .45);
    });
  }

  /* ---------- occluders: the peaks and the Edge's pines ---------- */
  // A peak seen from the vale's 3/4 camera: a massif rising off its footprint (anchor: the middle of its front foot).
  // Spurs run down from the summit and split it into faces; a face turned west takes the light, one turned east is in
  // shade, one turned to you is mid. Crags and gullies on the faces, a snow cap that runs down the gullies by season,
  // scree fans spilling from the gully feet onto a skirt of fell that melts into the ground.
  function peakArt(B, w, d, H, snowShare, P, seed, sharp) {
    const kit = KIT(), r = kit.rng(seed), cx = B.cx;
    const C = { lit: '#bcae96', litHi: '#d9ccb2', mid: '#998d7e', shade: '#7a7478', shadeDk: '#625e66', deep: '#3e3c40' };
    const sx = (sharp ? -.06 : .04) * w, summits = sharp ? [[sx, 1]] : [[sx - w * .1, .94], [sx + w * .12, 1]];
    const prof = [];
    for (let i = 0; i <= 40; i++) { const x = -w / 2 + w * i / 40; let y = 0; for (const [px, ph] of summits) { const u = Math.abs(x - px) / (x < px ? w / 2 + px : w / 2 - px); y = Math.max(y, ph * Math.pow(Math.max(0, 1 - u), sharp ? .95 : .8)); }
      y += (kit.noise(i / 2.6, seed, 2) - .5) * .1 * y + (sharp ? 0 : Math.max(0, .14 - Math.abs(x - w * .3) / w) * .8); prof.push({ x, y: -Math.max(d * .3, H * y) }); }
    const base = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = w / 2 - w * t; base.push({ x, y: -d * .3 * Math.pow(Math.abs(t - .5) * 2, 2) + (kit.noise(t * 6, seed, 5) - .5) * 6 }); }
    const sil = prof.concat(base), silP = new Path2D(B.poly(sil)), topP = prof.reduce((m, p) => p.y < m.y ? p : m, prof[0]);
    B.shadow(w * .16, 4, w * .6, 14, .34);
    B.f(B.poly(sil), C.mid);
    cx.save(); cx.clip(silP);
    // faces between spurs
    const feet = [-.5, -.32, -.14, .04, .2, .36, .5].map(f => ({ x: w * f + (r() - .5) * w * .05, y: 4 }));
    const tops = summits.map(([px]) => prof.reduce((m, p) => Math.abs(p.x - px) < Math.abs(m.x - px) ? p : m, prof[0]));
    // each spur climbs from its foot to the ridge above it (not all to the summit), wandering a little on the way
    const ridgeAt = x => prof.reduce((m, p) => Math.abs(p.x - x) < Math.abs(m.x - x) ? p : m, prof[0]);
    const spurs = feet.map(f => { const tp0 = tops.reduce((m, t) => Math.abs(t.x - f.x) < Math.abs(m.x - f.x) ? t : m, tops[0]), rp = ridgeAt(tp0.x + (f.x - tp0.x) * (.25 + r() * .25)), pts = [rp];
      for (let j = 1; j < 4; j++) { const t = j / 4; pts.push({ x: rp.x + (f.x - rp.x) * t + (r() - .5) * w * .05, y: rp.y + (f.y - rp.y) * Math.pow(t, .85) }); } pts.push(f); return pts; });
    for (let k = 0; k < spurs.length - 1; k++) {
      const A = spurs[k], Bq = spurs[k + 1], mx = (A[0].x + Bq[0].x) / 2, tp = tops.reduce((m, t) => Math.abs(t.x - mx) < Math.abs(m.x - mx) ? t : m, tops[0]);
      const ridge = prof.filter(p => p.x >= Math.min(A[0].x, Bq[0].x) && p.x <= Math.max(A[0].x, Bq[0].x));
      const facing = ((A[A.length - 1].x + Bq[Bq.length - 1].x) / 2 - tp.x) / (w / 2), col = facing < -.3 ? C.lit : facing < .05 ? kit.mix(C.lit, C.mid, .55) : facing < .3 ? C.shade : C.shadeDk;
      B.f(B.poly(A.slice().reverse().concat(ridge, Bq)), col, .95);
      B.s(B.line(A), facing < 0 ? C.litHi : C.mid, 1.5, .5);
    }
    // the light on the west flank, the shade on the east, both soft-edged
    B.f(B.poly(prof.filter(p => p.x < topP.x).concat([{ x: topP.x - w * .08, y: 0 }, { x: -w / 2, y: 0 }])), C.litHi, .22);
    // crags: weathered masses, more on the steep upper faces
    for (let k = 0; k < 60; k++) { const t = Math.pow(r(), .8), y = topP.y + H * (.08 + t * .78), half = Math.min(w / 2, (y - topP.y) / H * w * .55), x = topP.x + (r() - .5) * 2 * half * .92, rx = 5 + r() * 13, ry = 3 + r() * 5, west = x < topP.x + w * .05;
      B.f(B.blob(r, x + rx * .14, y + ry * .32, rx, ry, 8, .25), C.deep, west ? .3 : .45);
      B.f(B.blob(r, x, y, rx * .9, ry * .84, 8, .25), west ? (r() < .5 ? C.lit : C.mid) : (r() < .5 ? C.shade : C.mid), .9);
      if (west) B.f(B.blob(r, x - rx * .3, y - ry * .35, rx * .42, ry * .3, 6, .3), C.litHi, .6); }
    // gullies: curved clefts down the faces
    const gul = [];
    for (let k = 0; k < (sharp ? 7 : 6); k++) { const side = k % 2 ? 1 : -1, x0 = topP.x + side * (w * .03 + r() * w * .2), y0 = topP.y + H * (.1 + r() * .2), len = H * (.3 + r() * .32), dx = side * (8 + r() * 22), x1 = x0 + dx, y1 = y0 + len;
      gul.push({ x0, y0, x1, y1 });
      B.f(`M${x0 - 2} ${y0}Q${x0 + dx * .4 - 5} ${y0 + len * .55} ${x1 - 6} ${y1}Q${x1} ${y1 + 4} ${x1 + 6} ${y1}Q${x0 + dx * .4 + 3} ${y0 + len * .5} ${x0 + 2} ${y0}Z`, C.deep, side < 0 ? .3 : .42); }
    // the snow cap, ragged, reaching further down the gullies; blue in shade
    if (snowShare > 0) {
      const sl = topP.y + H * snowShare, cap = prof.filter(p => p.y < sl);
      if (cap.length > 1) {
        const edge = []; for (let x = cap[cap.length - 1].x; x >= cap[0].x; x -= 6) { const n = kit.noise(x / 18, seed, 9); const y = sl - (n - .35) * H * .12 - Math.abs(x - topP.x) / w * H * .2; edge.push({ x, y }); }
        const capP = B.poly(cap.map(p => ({ x: p.x, y: p.y - 2 })).concat(edge)); B.f(capP, P.snowSh);
        cx.save(); cx.clip(new Path2D(B.poly(prof.filter(p => p.x <= topP.x + 2).concat([{ x: topP.x + w * .06, y: topP.y + H * .5 }, { x: -w / 2, y: 0 }])))); B.f(capP, P.snow); cx.restore();
        // snow lies on in the gullies below the cap: tapering tongues
        for (const g of gul) { if (g.y0 > sl) continue; const yEnd = Math.min(g.y1, sl + H * (.12 + snowShare * .25)), mx = g.x0 + (g.x1 - g.x0) * .45; B.f(`M${g.x0 - 3} ${g.y0}Q${mx - 3} ${(g.y0 + yEnd) / 2} ${g.x0 + (g.x1 - g.x0) * ((yEnd - g.y0) / (g.y1 - g.y0))} ${yEnd}Q${mx + 3} ${(g.y0 + yEnd) / 2} ${g.x0 + 3} ${g.y0}Z`, g.x1 < g.x0 ? P.snow : P.snowSh, .95); }
        for (let k = 0; k < 14; k++) { const x = topP.x + (r() - .5) * w * snowShare * .8, y = topP.y + H * snowShare * (.3 + r() * .6); B.f(B.blob(r, x, y, 3 + r() * 6, 1.4 + r() * 2, 6, .4), C.mid, .55); }
      }
    }
    // scree fans from the gully feet
    for (const g of gul) { const fw = 18 + r() * 26; B.f(B.poly([{ x: g.x1 - 3, y: g.y1 - 6 }, { x: g.x1 + 3, y: g.y1 - 6 }, { x: g.x1 + fw * .7, y: g.y1 + 30 + r() * 20 }, { x: g.x1 - fw * .7, y: g.y1 + 30 + r() * 20 }]), snowShare > .7 ? P.snowSh : '#b9ae9c', .55);
      for (let k = 0; k < 8; k++) B.f(B.ell(g.x1 + (r() - .5) * fw, g.y1 + 6 + r() * 40, 1 + r() * 2, .7 + r()), C.shade, .5); }
    cx.restore();
    // the skirt: fell and heather lapping up the foot in lobes, so the mountain stands in the ground, not on it
    const skirtCol = snowShare > .7 ? P.snow : P.fell, skirtLo = snowShare > .7 ? P.snowSh : P.fellLo;
    for (let k = 0; k < 16; k++) { const t = k / 15, x = -w / 2 + w * t, hh = d * .3 * Math.pow(Math.abs(t - .5) * 2, 2), y = -hh - 6 - r() * 14, rx = w * .06 + r() * w * .05, ry = 10 + r() * 12;
      B.f(B.blob(r, x + 3, y + 4, rx, ry, 8, .4), skirtLo, .8); B.f(B.blob(r, x, y + 2, rx, ry, 8, .4), skirtCol, .97); }
    B.f(B.poly(base.map(p => ({ x: p.x, y: p.y - 10 })).concat(base.slice().reverse().map(p => ({ x: p.x, y: p.y + 6 })))), skirtCol, .97);
    for (let k = 0; k < 14; k++) { const x = (r() - .5) * w * .85, y = -r() * 14 - 4; if (snowShare > .7) B.f(B.blob(r, x, y, 5 + r() * 6, 1.6 + r() * 2, 6, .5), P.snowSh, .6); else B.heather(r, x, y, 6 + r() * 5, Object.assign({}, P, { heather: kit.mix(P.heather, P.fell, .3), heatherLo: kit.mix(P.heatherLo, P.fellLo, .4) }), P.bloom && r() < .4 ? P.bloom : null); }
  }
  // a gritstone tor: weathered woolpacks piled up, each rounded mass lit on its upper left with a dark undercut,
  // the whole tor shaded on its east side; heather or snow on the top; fallen blocks and scree at its foot
  function cragArt(B, w, h, P, seed, snowy, moorish) {
    const kit = KIT(), r = kit.rng(seed), G = { lit: '#b0a48e', mid: '#8c8170', shade: '#665d52', deep: '#3a342e', hi: '#d6cbb4' };
    B.shadow(w * .25, 2, w * .75, 8, .36);
    const masses = []; let y = 0, bw = w;
    const tiers = 3 + Math.floor(r() * 2);
    for (let t = 0; t < tiers; t++) {
      const th = h / tiers * (.85 + r() * .35), n = Math.max(1, Math.round(bw / 34)), off = (r() - .5) * bw * .15;
      for (let k = 0; k < n; k++) { const mw = bw / n, cx = -bw / 2 + off + mw * (k + .5) + (r() - .5) * 4; masses.push({ x: cx, y: y - th * .5, rx: mw * .62 + r() * 4, ry: th * .5, t }); }
      y -= th * .9; bw *= .66 + r() * .16;
    }
    for (const m of masses) {
      B.f(B.blob(r, m.x + m.rx * .16, m.y + m.ry * .18, m.rx * 1.04, m.ry * 1.02, 9, .22), G.deep, .85);
      const side = m.x > 0 ? G.shade : G.mid;
      B.f(B.blob(r, m.x, m.y, m.rx, m.ry, 9, .22), side);
      B.f(B.blob(r, m.x - m.rx * .25, m.y - m.ry * .28, m.rx * .62, m.ry * .5, 8, .3), m.x > m.rx ? G.mid : G.lit, .9);
      B.f(B.blob(r, m.x - m.rx * .42, m.y - m.ry * .5, m.rx * .3, m.ry * .2, 6, .35), G.hi, .7);
      B.s(`M${m.x - m.rx * .8} ${m.y + m.ry * .55}q${m.rx * .8} ${m.ry * .3} ${m.rx * 1.6} 0`, G.deep, 1.2, .55);
      if (r() < .35) B.f(B.blob(r, m.x - m.rx * .1, m.y, 2 + r() * 2, 1.4, 6, .5), P.lichen, .6);
      if (r() < .3) B.s(`M${m.x + (r() - .5) * m.rx} ${m.y - m.ry * .4}l${(r() - .5) * 2} ${m.ry * .9}`, G.deep, .9, .6);
    }
    const topM = masses[masses.length - 1];
    if (!snowy) B.f(B.blob(r, topM.x, topM.y - topM.ry * .82, topM.rx * .8, 3, 7, .5), moorish ? P.heather : P.fellLo, .95).f(B.blob(r, topM.x - topM.rx * .2, topM.y - topM.ry - .4, topM.rx * .45, 1.6, 6, .5), moorish ? P.heatherHi : P.fellHi, .85);
    else for (const m of masses) B.f(B.blob(r, m.x - m.rx * .1, m.y - m.ry * .78, m.rx * .7, m.ry * .24, 7, .4), P.snow, .95);
    for (let k = 0; k < 4; k++) B.boulder(r, (r() - .5) * w * 1.3, 3 + r() * 6, 6 + r() * 7, 4 + r() * 4, Object.assign({}, P, { rock: G.mid, rockLo: G.shade, rockHi: G.hi }), snowy);
    for (let k = 0; k < 10; k++) B.stone(r, (r() - .5) * w * 1.4, 2 + r() * 8, 1.2 + r() * 2.4, .8 + r() * 1.4, P, snowy && r() < .5 ? 'snow' : null);
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
  /** The tall pieces: [{ key, box, x, y, draw(B) }], each baked once and sorted by its base line y. */
  function occluders(L, ops, season, sig) {
    const kit = KIT(), P = PAL[season] || PAL.summer, snowy = SNOW[season] > 90, out = [];
    for (const pk of L.peaks) {
      const b = kit.bboxOf(pk.pts), w = b[2] - b[0], d = b[3] - b[1], sharp = /east/.test(pk.id), H = sharp ? Math.min(400, w * .78) : Math.min(330, w * .64);
      out.push({ key: sig + '|peak|' + pk.id, box: [-w / 2 - 30, -H * 1.16 - 30, w / 2 + 50, 26], x: (b[0] + b[2]) / 2, y: b[3] - 4, K: 1.25, draw: B => peakArt(B, w, d, H, PEAK_SNOW[season] + (sharp ? .06 : 0), P, kit.hashStr(pk.id), sharp) });
    }
    // tors framing the gaps in the Edge: the pass and the falls cave stair stand between rock
    const gapAt = [].concat(L.gates.filter(g => g.kind === 'pass').map(g => [g.x + .5, g.y + .9]), L.falls && L.falls.caveStair ? [L.falls.caveStair] : []);
    for (const run of L.runs) for (const end of [run[0], run[run.length - 1]]) for (const gp of gapAt) {
      const c = L.cpt(gp[0], gp[1]); if (Math.hypot(end.lip.x - c.x, (end.lip.y - c.y) * 1.4) > 150) continue;
      const sd = kit.hash(Math.round(end.lip.x), Math.round(end.lip.y), 3), w = 40 + sd % 18, h = 58 + sd % 26;
      out.push({ key: sig + '|crag|' + sd, box: [-w, -h * 1.5 - 10, w, 16], x: end.lip.x + (end.lip.x < c.x ? -w * .3 : w * .3), y: end.foot.y - 2, draw: B => cragArt(B, w, h, P, sd, snowy, false) });
    }
    for (const op of ops) for (const p of op.pines || []) out.push({ key: sig + '|pine|' + p.seed, box: [-24, -p.h - 14, 44, 8], x: p.x, y: p.y, draw: B => pineArt(B, p.h, P, p.seed, snowy) });
    return out;
  }
  function build(scene, parent, sc) {
    const t0 = performance.now(), kit = KIT(); if (!kit || !wanted()) return null;
    const W = GARDEN_WORLD, L = readLayout(W); if (!L) return null;
    const season = sc.season || 'summer', sig = 'gpt-2|' + season + '|' + (GardenIslandLayout.fingerprint || '');
    const old = current; if (old) { old.handle.destroy(old.sig === sig); for (const s of sprites) s.destroy(); sprites = []; if (old.sig !== sig) for (const k of old.spriteKeys) if (scene.textures.exists(k)) scene.textures.remove(k); }
    const ops = ok(() => compose(L, season)); if (!ops) return null;
    const rb = kit.bboxOf(L.regionLoops.flat().concat(L.terraces.flatMap(t => t.pts)));
    const box = { x: 0, y: W.sky - 150, w: W.cols * W.cellW, h: Math.min(W.sky + W.rows * W.cellH, rb[3] + 80) - (W.sky - 150) };
    const handle = kit.chunked(scene, parent, ops, { key: sig, box, K, chunk: CHUNK, depth: DEPTH, budgetMB: 40 });
    const keys = []; let spritePx = 0;
    for (const o of occluders(L, ops, season, sig)) { const im = kit.sprite(scene, parent, o.key, o.box, o.draw, o.x, o.y, o.K); if (im) { sprites.push(im); keys.push(o.key); spritePx += im._gptPx || 0; } }
    if (parent.sort) parent.sort('depth');
    current = { sig, handle, spriteKeys: keys };
    stats = { sig, chunks: handle.chunks, buildMs: Math.round(performance.now() - t0), sprites: sprites.length, spritePx };
    return { destroy() { handle.destroy(true); for (const s of sprites) s.destroy(); sprites = []; current = current && current.handle === handle ? Object.assign(current, { handle: { destroy() {} } }) : current; } };
  }
  /**
   * The showcase: paint a box of the high ground straight into a 2D context (no scene needed), the ground then the
   * occluders by their base line, as the world shows it. box [x0, y0, x1, y1] world px; k canvas px per world px.
   * From the sandbox: GardenPaintedTerrain.paintTo(ctx, 'winter', [1800, 500, 2600, 1000], 1).
   */
  function paintTo(cx, season, box, k) {
    const kit = KIT(), L = readLayout(GARDEN_WORLD); if (!L) return null;
    const t0 = performance.now(), ops = compose(L, season); k = k || 1;
    cx.save(); cx.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k);
    const B = kit.brush(cx);
    for (const o of ops) if (kit.meets(o.bb, box)) ok(() => { cx.save(); o.draw(B, kit.rng(o.seed || 1), box); cx.restore(); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.filter = 'none'; });
    const occ = occluders(L, ops, season, 'preview').filter(o => kit.meets([o.x + o.box[0], o.y + o.box[1], o.x + o.box[2], o.y + o.box[3]], box)).sort((a, b) => a.y - b.y);
    for (const o of occ) ok(() => { cx.save(); cx.translate(o.x, o.y); o.draw(kit.brush(cx)); cx.restore(); });
    cx.restore();
    return { ops: ops.length, occluders: occ.length, ms: Math.round(performance.now() - t0), lastError };
  }
  /** Bake cost per chunk without a scene (for tuning): the slowest chunks and which ops cost most there. */
  function profile(season, size, k) {
    const kit = KIT(), L = readLayout(GARDEN_WORLD), W = GARDEN_WORLD, ops = compose(L, season || 'summer'); size = size || CHUNK; k = k || K;
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * k); const cx = c.getContext('2d'), out = [];
    for (let y = W.sky - 150; y < W.sky + 30 * W.cellH; y += size) for (let x = 0; x < W.cols * W.cellW; x += size) {
      const bb = [x, y, x + size, y + size], mine = ops.filter(o => kit.meets(o.bb, bb) && !o.decor); if (!mine.length) continue;
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, c.width, c.height); cx.setTransform(k, 0, 0, k, -x * k, -y * k);
      const B = kit.brush(cx), t0 = performance.now(), per = [];
      for (const o of mine) { const s0 = performance.now(); cx.save(); o.draw(B, kit.rng(o.seed || 1), bb); cx.restore(); cx.filter = 'none'; cx.globalCompositeOperation = 'source-over'; per.push([o.seed, Math.round((performance.now() - s0) * 10) / 10]); }
      cx.getImageData(0, 0, 1, 1);
      out.push({ x, y, ms: Math.round(performance.now() - t0), top: per.sort((a, b) => b[1] - a[1]).slice(0, 4) });
    }
    out.sort((a, b) => b.ms - a.ms); return { chunks: out.length, worst: out.slice(0, 8), mean: Math.round(out.reduce((s, o) => s + o.ms, 0) / out.length) };
  }
  /** The kinds of landform and region this kit paints (the world skips its own art for them). */
  function owns(kind) { return wanted() && (kind === 'mountain' || kind === 'rock-wall' || kind === 'terrace-wall'); }
  function ownsRegion(id) { if (!wanted()) return false; const r = (gardenIslandData().regions || []).find(x => x.id === id); return !!(r && r.theme === 'mountain'); }
  function status() {
    const h = current && current.handle, px = (h && h.texturePx || 0) + (stats.spritePx || 0);
    return Object.assign({}, stats, { wanted: wanted(), pending: h ? h.pending : null, live: h ? h.live : null, baked: h ? h.baked : null, evicted: h ? h.evicted : null, worstChunkMs: h ? h.worstMs : null, worstSliceMs: h ? h.sliceWorstMs : null, p95ChunkMs: h ? h.p95 : null, medianChunkMs: h ? h.median : null, bakeMs: h ? h.bakeMs : null, textureMB: Math.round(px * 4 / 1048576 * 10) / 10, lastError: lastError || (KIT() && KIT().lastError) });
  }
  return { wanted, build, paintTo, profile, owns, ownsRegion, status, compose, readLayout, PAL };
})();
