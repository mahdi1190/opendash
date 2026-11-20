/* Painted vale: Cloudbreak's relief, so the fells read as mountains and not as a flat green plateau (layout fix, north,
 * 20 Nov: "a flat, empty green plateau ... one dead-straight dry-stone wall ruled across the whole map").
 *   the range      the north edge of any mountain region that meets the map's top row is closed by the range itself: a
 *                  band of crags and buttresses, 3 to 4.5 H high, rising to summits that stand against the far ranges,
 *                  with gullies, grass ledges, snow by season and scree fans at its foot. Its foot follows the ground
 *                  (nearer the edge where a path, a field or a stone stands, further out where the fell is open), never a
 *                  ruled line, and the feet stop exactly at the drawn foot.
 *   the tors       gritstone crags (3 to 4 H) on open fell, wherever the cells leave room for one with nothing behind it
 *                  for it to hide, each with its scree fan, fallen blocks and heather at its foot; its foot stops you
 *   the tiers      the fell rises north in steps: low turf banks with a lit lip and a shaded fall, broken where a path, a
 *                  field or water runs, and paler, cooler ground on each higher tier
 * Everything is placed from the layout's cells (zone, routes, fields, statics, landforms, water): no named place and no
 * hard-coded cell, so a changed layout keeps working. Baked once into sprites in runs (no long task). Nothing runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V || !V.parts) return;
  const H = typeof GARDEN_H !== 'undefined' ? GARDEN_H : 41;
  const ROCK = { lit: '#c2b6a0', litHi: '#ddd2bc', mid: '#9d9282', shade: '#7a7270', shadeDk: '#5e5a60', deep: '#3a363a', ledge: '#8e9a5a', ledgeHi: '#b4bd7a', scree: '#b3aa98', screeLo: '#8e8676' };
  const GRIT = { lit: '#b6aa92', mid: '#928674', shade: '#6c6256', deep: '#3a342e', hi: '#dacfb8' };
  const STONEP = { rock: '#a69c8a', rockLo: '#7c7366', rockHi: '#d0c6b0', rockDk: '#4a443c', lichen: '#c9c48a', snow: '#fbfbf7', snowSh: '#c8d6e6' };

  function fellCell(L, x, y) { const b = L.base(x, y); return b && b.land && !b.freshwater && b.regionZone === 5 ? b : null; }
  /** A cell nothing else uses: fell land, no path, plaza, field, building, landform, rock or water. */
  function freeAt(L, x, y) {
    const b = L.base(x, y); if (!b || !b.land || b.freshwater || b.beach || b.solid || b.landformId || b.staticId || b.route || b.gateId) return false;
    if (b.regionZone !== 5) return false;
    return !L.plot(x, y);
  }

  /* ---------- the range along the north edge ---------- */
  // (vale final, fix 1 north: the range was a row of flat grey panels, one per spur, under a wavy white cap, the same
  // height the whole width: "a straight ruled row of identical grey trapezoids". It is now a landform: a height field
  // running back from the foot to a crest, rendered from the camera row by row like the peaks, so it has buttresses
  // and gullies, crag tiers with grass ledges, scree aprons at the foot, snow where it can lie, real summits standing
  // behind the two peaks (any mountain landform near the edge gets one, so a peak reads as the front of its massif),
  // saddles between them, and shepherds' tracks zigzagging up the lower slopes.)
  // how far south of the top row the range's foot may come at column x (cells): until the first cell something else
  // uses (a mountain landform's own cells count as open: behind a peak the range comes down to meet it)
  function freeDepth(L, x) {
    const open = (xx, y) => { if (freeAt(L, xx, y)) return true; const b = L.base(xx, y); return !!(b && b.land && b.landformId && /peak/.test(b.landformId) && !b.route && !L.plot(xx, y)); };
    for (let y = .15; y < 5.2; y += .25) if (!open(x - .45, y) || !open(x, y) || !open(x + .45, y)) return y;
    return 5.2;
  }
  // the crest's height above the foot (px) at world column x (cells): 3.4 to 5 H along the wall, summits to 9.5 H, so the
  // skyline is a ridge with tops and saddles on it, the same for every run (they join with no seam)
  function ridgeH(kit, x, summits, R) {
    let h = H * (3.4 + 1.6 * kit.fbm(x / 7.5, 1.7, 311)) + (kit.noise(x * .9, 4.1, 313) - .5) * H * .8 + (kit.noise(x * 3.1, 5.3, 315) - .5) * H * .3;
    for (const s of summits) { const u = (x - s.x) / s.w; if (Math.abs(u) < 1) { const k = Math.pow(1 - Math.abs(u), 1.25), sh = H * s.h * (k * .82 + .18 * Math.pow(1 - Math.abs(u), 4)); h = Math.max(h, sh + h * Math.abs(u) * .4); } }
    // the ends of the range fall away to the coast and the moor (never a cut-off face)
    if (R) { const tw = Math.min(x - R.x0, R.x1 - x); if (tw < 5) h = H * 1.2 + (h - H * 1.2) * Math.pow(Math.max(0, tw) / 5, .8) * (1 - (tw < 1.2 ? (1.2 - tw) * .35 : 0)); }
    return h;
  }
  const crestD = (h) => 1.15 + h / H * .36;   // how far back (cells) the crest stands from the foot: higher tops further back
  function rangeLine(L, kit) {
    const cols = (L.W && L.W.cols) || 96, xs = []; let x0 = null, x1 = null;
    for (let x = 0; x < cols; x++) { const ok = fellCell(L, x + .5, .3); if (ok) { if (x0 === null) x0 = x; x1 = x + 1; } else if (x0 !== null) break; }
    if (x0 === null) return null;
    // summits: one behind every mountain landform whose back comes near the edge, then more in the gaps between
    const summits = [], r = kit.rng(4421);
    let forms = []; try { forms = (gardenIslandData() || {}).landforms || []; } catch (e) { forms = []; }
    for (const f of forms) {
      if (f.kind !== 'mountain' || !f.polygon) continue; const ys = f.polygon.map(p => p[1]), xs2 = f.polygon.map(p => p[0]); if (Math.min(...ys) > 7) continue;
      const cx = (Math.min(...xs2) + Math.max(...xs2)) / 2, wd = Math.max(...xs2) - Math.min(...xs2); summits.push({ x: cx + wd * .12, w: wd * .85, h: 9 + r() * .6, peak: true });
    }
    for (let x = x0 + 3 + r() * 4; x < x1 - 3; x += 6 + r() * 6) { if (summits.some(s => Math.abs(s.x - x) < s.w * .6 + 3)) continue; summits.push({ x, w: 2.6 + r() * 3.2, h: 5.6 + r() * 2.2 }); }
    const step = .25, raw = [];
    for (let x = x0; x <= x1 + 1e-6; x += step) {
      const xc = Math.min(x1 - .05, Math.max(x0 + .05, x)), fd = freeDepth(L, xc), pk = summits.some(s => s.peak && Math.abs(s.x - x) < s.w * .55);
      raw.push({ x, fd, want: pk ? 5 : 1.25 + 1.45 * kit.fbm(x / 4.2, 8.3, 317) });
    }
    // the foot: where the fell is open it comes out a way, wandering; where something stands it keeps half a cell clear of it
    const foot = raw.map((p, i) => { let lim = 9; for (let j = Math.max(0, i - 3); j <= Math.min(raw.length - 1, i + 3); j++) lim = Math.min(lim, raw[j].fd - .55); return Math.max(.75, Math.min(4.6, p.want, lim)); });
    const sm = foot.map((f, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(foot.length - 1, i + 2); j++) { s += foot[j]; n++; } return Math.min(f + .12, s / n); });
    for (let i = 0; i < raw.length; i++) xs.push({ x: raw[i].x, f: sm[i] });
    // shepherds' tracks: a few zigzags up the lower slopes, on the wall between the summits
    const tracks = []; { const rt = kit.rng(4447); for (let x = x0 + 4 + rt() * 5; x < x1 - 4; x += 9 + rt() * 8) if (!summits.some(s => s.peak && Math.abs(s.x - x) < s.w * .5)) tracks.push({ x, n: 3 + Math.floor(rt() * 3), w: .7 + rt() * .5, s: rt() < .5 ? 1 : -1 }); }
    return { x0, x1, step, pts: xs, summits, tracks, footAt: x => { const i = Math.max(0, Math.min(xs.length - 1, (x - x0) / step)), a = Math.floor(i), b = Math.min(xs.length - 1, a + 1), t = i - a; return xs[a].f * (1 - t) + xs[b].f * t; } };
  }
  // the height (px) of the range at world column x, d cells back from its foot (0 at the foot, the crest at crestD)
  function rangeZ(kit, R, x, d, e) {
    if (d <= 0) return 0;
    const dc = crestD(e), ap = .32 + .3 * kit.noise(x * 1.3, 2.9, 521);
    const t = Math.max(0, Math.min(1, (d - ap) / (dc - ap))), prof = 1 - Math.pow(1 - t, 1.6), u = e * prof / H;   // u: about how high up the face, in H
    // (the gullies follow the height, not the depth: on a face this steep a depth noise drew ruled vertical stripes)
    const sp = kit.noise(x / 1.6 + u * .3, 3.7 + u * .05, 501), rid = 1 - Math.abs(sp * 2 - 1), sp2 = kit.noise(x / .75 - u * .4, 6.1 + u * .2, 503), rid2 = 1 - Math.abs(sp2 * 2 - 1);
    const scree = H * (.3 + .15 * rid);
    if (d < ap) return scree * Math.pow(d / ap, 1.25);
    let z = scree + (e - scree) * prof;
    // buttresses and gullies: ridged noise across the face, strongest mid-face (the crest stays a crest)
    z *= .8 + (Math.pow(rid, 1.4) * .26 + rid2 * .07) * (.4 + .6 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    // crag tiers: the face stepped in bands, each a short steep crag over a grass ledge
    { const band = H * 1.05, q = z / band + kit.noise(x / 2.6, u * .3, 505) * .7 + kit.fbm(x / 9, 2.2, 509) * 2.4, f = q - Math.floor(q), st = (Math.floor(q) + Math.pow(f, 2.6)) * band; z += (st - z) * .5 * Math.min(1, t * 3); }
    z += (kit.noise(x * 3.6, u * 1.6, 507) - .5) * H * .16 * t;
    return z;
  }
  const RANGE_COL = s => ({ grass: s === 'autumn' ? '#9c9a58' : s === 'spring' ? '#8fa65a' : '#93a35c', grassHi: '#b6b878', heath: s === 'summer' ? '#8f6a94' : '#7e6474', bracken: '#a8763e', scree: '#b6ad9a', rock: '#a29886', rockDk: '#857c70', snow: '#fbfbf7', snowSh: '#c6d4e4' });
  const hex3 = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  // one run of the range (cells a0..a1), drawn relative to (ox, oy): ox the run's left px, oy the px of its highest foot.
  // Every point comes from its world x, so neighbouring runs draw the same mountain across their seam.
  // (vf-perf: the run is painted in steps, a few milliseconds a frame, so walking north never stops for it: the height field,
  // then the picture column by column, then its soft copy; only the marks are drawn when the sprite is made. S keeps the
  // result, so painting it again sharper or after a repaint never works the mountain out again.)
  function* rangeBake(S, kit, L, R, a0, a1, ox, oy, season) {
    const late = () => performance.now() > S.dl;
    const cw = L.cw, ch = L.ch, snowy = season === 'winter', capShare = { winter: 1, spring: .5, autumn: .26, summer: .1 }[season] || .1;
    const FY = x => (R.footAt(x) * ch + L.cpt(0, 0).y) - oy, X = x => (x - a0) * cw;
    const T0 = performance.now(), ST = 1, m0 = a0 - .45, m1 = a1 + .45, NX = Math.ceil((m1 - m0) * cw / ST) + 2, SD = .025;
    const E = new Float32Array(NX), DC = new Float32Array(NX); let dMax = 0;
    for (let i = 0; i < NX; i++) { E[i] = ridgeH(kit, m0 + i * ST / cw, R.summits, R); DC[i] = crestD(E[i]); dMax = Math.max(dMax, DC[i]); }
    const ND = Math.ceil(dMax / SD) + 3, Z = new Float32Array(NX * ND);
    for (let i = 0; i < NX; i++) { const x = m0 + i * ST / cw; for (let j = 0; j < ND; j++) { const d = j * SD; Z[j * NX + i] = d > DC[i] + SD * 2 ? -1 : rangeZ(kit, R, x, Math.min(d, DC[i]), E[i]); } if (late()) yield; }
    const T1 = performance.now();
    // the picture's extent
    let yTop = 0, yBot = 0; for (let i = 0; i < NX; i++) { const x = m0 + i * ST / cw, fy = FY(x); yBot = Math.max(yBot, fy + 4); for (let j = 0; j < ND; j++) { const z = Z[j * NX + i]; if (z < 0) break; yTop = Math.min(yTop, fy - j * SD * ch - z); } }
    yTop -= 4; const PW = NX, PH = Math.ceil((yBot - yTop) / ST) + 2;
    const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const cx = cv.getContext('2d'), img = cx.createImageData(PW, PH), px = img.data;
    const C = RANGE_COL(season), CC = {}; for (const k in C) CC[k] = hex3(C[k]);
    const LGT = [-.62, -.12, .78], RS = .5, snowLine = H * (snowy ? 1.4 : 8.6 - capShare * 6.5);
    const sky = new Float32Array(PW).fill(Infinity), vis = new Uint8Array(NX * ND), cls = new Uint8Array(NX * ND);
    for (let i = 1; i < NX - 1; i++) {
      const x = m0 + i * ST / cw, fy = FY(x); let ymin = (fy - yTop) / ST + 1;
      for (let j = 1; j < ND - 1; j++) {
        const z = Z[j * NX + i]; if (z < 0) break; const sy = (fy - j * SD * ch - z - yTop) / ST; if (sy >= ymin) continue;
        const zl0 = Z[j * NX + i - 1], zr0 = Z[j * NX + i + 1], zl = zl0 < 0 ? z : zl0, zr = zr0 < 0 ? z : zr0, zf = Z[(j - 1) * NX + i], zb = Z[(j + 1) * NX + i] < 0 ? z : Z[(j + 1) * NX + i];
        const dzx = (zr - zl) / (2 * ST) * RS, dzy = (zf - zb) / (2 * SD * ch) * RS;   // dzy: the rise toward the camera (negative on the face)
        const nl = Math.hypot(dzx, dzy, 1), lam = Math.max(0, (-dzx * LGT[0] - dzy * LGT[1] + LGT[2]) / nl), slope = Math.hypot(dzx, dzy) / RS;
        const lap = zl + zr - 2 * z;
        const d = j * SD, t = z / H, v = (z + d * ch) / H, nz = kit.noise(x * 2.3, v * 1.4, 511);
        const steep = Math.max(0, Math.min(1, (slope - 1.05 - nz * .6) / .9)), low = d < .6;
        // ground: grass and heather on the ledges and low down, bracken in autumn on the lower slopes, scree in the aprons
        const hn = kit.noise(x / 1.1, v / .8, 513) * .8 + kit.noise(x * 3.3, v * 3, 514) * .2, heathy = t < 2.6 && v > 1.3 && hn > .6, base = heathy ? (season === 'autumn' && t < 1.4 && hn > .72 ? CC.bracken : CC.heath) : t > 3.5 ? CC.grassHi : CC.grass;
        const thin = Math.max(0, Math.min(1, (t - 2.6 - nz * .8) / 2.4)) * .6;
        const c = [base[0] + (CC.scree[0] - base[0]) * thin, base[1] + (CC.scree[1] - base[1]) * thin, base[2] + (CC.scree[2] - base[2]) * thin];
        const apronScree = low ? Math.max(0, Math.min(.9, (kit.noise(x * 1.1, v * 1.5, 515) - .3) * 3)) : 0;
        const rockMix = Math.min(1, Math.max(steep, apronScree)), stone = steep > .5 ? (nz > .55 ? CC.rockDk : CC.rock) : CC.scree;
        let rr = c[0] + (stone[0] - c[0]) * rockMix, gg = c[1] + (stone[1] - c[1]) * rockMix, bb = c[2] + (stone[2] - c[2]) * rockMix;
        if (steep > .4) { const f = (z / 15 + kit.noise(x / 1.6, v, 517) * 1.2) % 1, sm = f < .5 ? f / .5 : (1 - f) / .5, vv = .88 + sm * .18; rr *= vv; gg *= vv; bb *= vv; }
        const sn = z > snowLine - nz * H * .9 - Math.max(0, -lap) * 1.5 && slope < (snowy ? 3.6 : 2.2) + capShare * 1.5 - nz;
        if (sn) { const s = lam > .55 ? CC.snow : CC.snowSh; rr = s[0]; gg = s[1]; bb = s[2]; }
        const k = .7 + lam * .42, crease = Math.max(0, Math.min(.22, lap * .045));
        rr = rr * k * (1 - crease) + (lam > .6 ? 6 : -4); gg = gg * k * (1 - crease) + (lam > .6 ? 3 : -2); bb = bb * k * (1 - crease) + (lam > .6 ? -4 : 6);
        // aerial haze: the higher, the paler and cooler (the tops stand back against the far fells)
        const hz = Math.min(.32, Math.max(0, (t - 2.5) * .045)); rr += (226 - rr) * hz; gg += (232 - gg) * hz; bb += (236 - bb) * hz;
        const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(PH, Math.ceil(ymin));
        for (let yy = y0; yy < y1; yy++) { const o = (yy * PW + i) * 4; px[o] = rr; px[o + 1] = gg; px[o + 2] = bb; px[o + 3] = 255; }
        if (y1 > y0) { vis[j * NX + i] = 1; cls[j * NX + i] = sn ? 5 : steep > .5 ? 4 : rockMix > .4 ? 3 : heathy ? 2 : 1; }
        ymin = sy;
      }
      sky[i] = ymin; if (late()) yield;
    }
    sky[0] = sky[1]; sky[PW - 1] = sky[PW - 2];
    for (let yy = 0; yy < PH; yy++) for (let i = 1; i < PW - 1; i++) { const o = (yy * PW + i) * 4; if (px[o + 3] === 0 && px[o - 1] === 255 && px[o + 7] === 255) for (let q = 0; q < 4; q++) px[o + q] = (px[o - 4 + q] + px[o + 4 + q]) >> 1; }
    yield; cx.putImageData(img, 0, 0); const T2 = performance.now(); if (late()) yield;
    // the picture, soft (made here, once: the blur is the dearest single step)
    const c2 = document.createElement('canvas'); c2.width = PW; c2.height = PH; { const g2 = c2.getContext('2d'); g2.filter = 'blur(.8px)'; g2.drawImage(cv, 0, 0); g2.filter = 'none'; g2.globalAlpha = .45; g2.drawImage(cv, 0, 0); }
    cv.width = cv.height = 1;
    Object.assign(S, { done: true, NX, ND, SD, ST, m0, Z, PW, PH, yTop, sky, vis, cls, C, c2, T: [Math.round(T1 - T0), Math.round(T2 - T1), Math.round(performance.now() - T2)] });
  }
  /** Start (or go on with) a run's bake until the deadline: true when it is done. */
  function rangeStep(S, kit, L, R, a0, a1, ox, oy, season, dl) {
    if (S.done) return true; S.dl = dl;
    if (!S.gen) S.gen = rangeBake(S, kit, L, R, a0, a1, ox, oy, season);
    while (!S.done && !S.gen.next().done && performance.now() <= dl) { /* steps */ }
    return !!S.done;
  }
  function rangeRun(B, kit, L, R, a0, a1, ox, oy, season, S) {
    S = S || {}; if (!S.done) rangeStep(S, kit, L, R, a0, a1, ox, oy, season, Infinity);
    const cw = L.cw, ch = L.ch, snowy = season === 'winter', capShare = { winter: 1, spring: .5, autumn: .26, summer: .1 }[season] || .1;
    const FY = x => (R.footAt(x) * ch + L.cpt(0, 0).y) - oy, X = x => (x - a0) * cw;
    const { NX, ND, SD, ST, m0, Z, PW, yTop, sky, vis, cls, C, c2 } = S, T2 = performance.now();
    const w = (a1 - a0) * cw, PX = i => (m0 - a0) * cw + i * ST, PY = y => yTop + y * ST;
    B.cx.save(); B.cx.beginPath(); B.cx.rect(-1, -2000, w + 2, 2600); B.cx.clip();   // each run paints its own columns, a pixel over each seam
    // the higher fells behind, in haze: their tops show over the saddles, so the range goes back
    { const bk = [], bot = []; for (let i = 0; i < PW; i += 4) { const x = m0 + i * ST / cw; const tw = Math.max(0, Math.min(1, Math.min(x - R.x0, R.x1 - x) / 6)); bk.push([PX(i), PY(sky[i]) - H * (1.2 + 2.6 * kit.fbm(x / 5.5, 9.1, 461)) * tw]); bot.push([PX(i), PY(sky[i]) + 30]); }
      const bp = B.poly(bk.concat(bot.slice().reverse())); B.f(bp, '#b9c3c9', .62);
      B.f(bp, B.lin(0, yTop - 3.8 * H, 0, yTop + 4 * H, [[0, 'rgba(236,240,242,.1)'], [1, 'rgba(236,240,242,.55)']]));
      if (snowy) B.f(B.poly(bk.concat(bk.slice().reverse().map(([x, y]) => [x, y + 8]))), '#f2f6f8', .5); }
    // the picture, soft, then crisp work over it
    { const PH = S.PH; B.cx.save(); B.cx.imageSmoothingEnabled = true; B.cx.imageSmoothingQuality = 'high'; B.cx.drawImage(c2, PX(0), yTop, PW * ST, PH * ST); B.cx.restore(); }
    const T3 = performance.now();
    // marks: courses on the crags, stones on the scree, tufts on the ledges, a snow ripple
    { const rr = kit.rng(kit.hash(Math.round(a0 * 10), 3, 541)), N = NX * ND, n = Math.min(900, Math.round(N / 30));
      for (let k = 0; k < n; k++) { const q = Math.floor(rr() * N), c = cls[q]; if (!c) continue; const i = q % NX, j = (q / NX) | 0, z = Z[q], x = m0 + i * ST / cw, Xp = PX(i), Yp = FY(x) - j * SD * ch - z, s = .7 + rr() * .7;
        if (c === 4) { const wd = 4 + rr() * 7; B.s(`M${Xp - wd / 2} ${Yp + 1}l${wd} ${(rr() - .5) * 2}`, '#3e3a3c', 1.2, .3).s(`M${Xp - wd / 2} ${Yp}l${wd * .8} ${(rr() - .5) * 2}`, '#e2d8c4', .8, .35); }
        else if (c === 3) { if (rr() < .35) B.s(`M${Xp - 2 * s} ${Yp}q${2 * s} -1 ${4 * s} .3`, rr() < .5 ? '#7e7464' : '#d6ccb4', .9, .35); }
        else if (c === 5) { if (rr() < .4) B.s(`M${Xp - 3} ${Yp}q3 -1 6 0`, C.snowSh, .9, .5); }
        else { const col = c === 2 ? (season === 'autumn' ? '#c08a4a' : '#a07aa8') : (rr() < .5 ? '#6f7f40' : '#c2c48a'); B.s(`M${Xp - 1.3} ${Yp}l-.8 ${-2 - rr() * 2}M${Xp} ${Yp}l0 ${-2.5 - rr() * 2}M${Xp + 1.3} ${Yp}l.8 ${-2 - rr() * 2}`, col, .8, .6); } } }
    // shepherds' tracks: zigzags up the lower slope, drawn only where that bit of the slope is in view
    for (const tk of R.tracks) { if (tk.x < a0 - 2 || tk.x > a1 + 2) continue; const e = ridgeH(kit, tk.x, R.summits, R), top = crestD(e) * .72, pts = [];
      for (let k = 0; k <= tk.n * 10; k++) { const u = k / (tk.n * 10), leg = Math.min(tk.n - 1, Math.floor(u * tk.n)), f = u * tk.n - leg, dir = (leg % 2 ? -1 : 1) * tk.s, xx = tk.x + dir * (f - .5) * tk.w, d = .15 + u * top; pts.push([xx, d]); }
      let run = []; const flush = () => { if (run.length > 1) { B.s(B.line(run.map(q => ({ x: q.x + .6, y: q.y + 1.2 }))), '#5a5444', 2.6, .3).s(B.line(run), snowy ? '#eef2f4' : '#d8ccaa', 1.7, .8); } run = []; };
      for (const [xx, d] of pts) { const i = Math.round(((xx - m0) * cw) / ST), j = Math.round(d / SD); if (i < 1 || i >= NX - 1 || j >= ND || !vis[j * NX + i]) { flush(); continue; } run.push({ x: X(xx), y: FY(xx) - d * ch - Z[j * NX + i] }); }
      flush(); }
    // the skyline's rim: lit where it climbs from the west, a dark edge where it falls away east
    { let run = [], up0 = null; const flush = () => { if (run.length > 2) B.s(B.line(run), up0 ? (capShare > .2 ? '#fbfbf6' : '#efe6cc') : '#4a4450', up0 ? 1.6 : 1, up0 ? .7 : .3); run = []; };
      for (let i = 4; i < PW; i += 3) { const a = { x: PX(i - 3), y: PY(sky[i - 3]) }, b = { x: PX(i), y: PY(sky[i]) }; const up = b.y < a.y - .15; if (up !== up0) { flush(); up0 = up; run.push(a); } run.push(b); } flush(); }
    // the foot, where turf and heather lap up onto the scree
    { const ft = []; for (let x = a0 - .25; x <= a1 + .25 + 1e-6; x += .125) ft.push({ x: X(x), y: FY(x) + (kit.noise(x * 4.1, 7.7, 337) - .5) * 3 - 1 }); B.s(B.line(ft), ROCK.deep, 2.2, .28); }
    B.cx.restore(); try { (window.__rangeT = window.__rangeT || []).push([a0].concat(S.T, [Math.round(T3 - T2), Math.round(performance.now() - T3), NX, ND])); } catch (e) { /* timing only */ }
    return -yTop;
  }
  // the range's foot on the ground (not in its picture, so its picture ends where its feet stop): scree in fans and a grey
  // wash on the turf in front of the rock, turf and heather lapping up to it
  function rangeSkirt(B, kit, L, R, a0, a1, ox, oy, season) {
    const cw = L.cw, ch = L.ch, snowy = season === 'winter', X = x => (x - a0) * cw, FY = x => (R.footAt(x) * ch + L.cpt(0, 0).y) - oy, w = (a1 - a0) * cw;
    B.cx.save(); B.cx.translate(ox, oy); B.cx.beginPath(); B.cx.rect(0, -60, w, 120); B.cx.clip();
    // the scree skirt first, on the turf in front of the foot: fans below the gullies, a grey wash the rest of the way
    for (let x = Math.floor(a0) - 1; x <= a1 + 1; x += .5) { const r = kit.rng(kit.hash(Math.round(x * 4), 3, 341)); const fx = X(x), fy = FY(x);
      B.f(B.blob(r, fx, fy + 3, cw * .42, 7 + r() * 5, 8, .4), snowy ? '#dfe5ea' : ROCK.screeLo, .28);
      for (let k = 0; k < 6; k++) B.stone(r, fx + (r() - .5) * cw * .6, fy + 2 + r() * 12, 1.4 + r() * 3.2, 1 + r() * 1.8, STONEP, snowy && r() < .6 ? 'snow' : r() < .2 ? STONEP.lichen : null); }
    if (!snowy) for (let x = a0 - .25; x < a1 + .25; x += .2) { const r = kit.rng(kit.hash(Math.round(x * 20), 13, 383)); const fx = X(x), fy = FY(x); if (r() < .55) B.tufts(r, fx, fy + 1, 12, 4, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6); else if (r() < .5) B.heather(r, fx, fy - 2 + r() * 4, 4 + r() * 4, { heather: '#8d6a92', heatherHi: '#b07ab8', heatherLo: '#5f4a62', fell: '#a6b276', fellLo: '#8c9a5e', fellHi: '#c2c78e' }, season === 'summer' && r() < .5 ? '#b98cc0' : null); }
    B.cx.restore();
  }

  /* ---------- tors on the open fell ---------- */
  function torSpots(L, kit, M, R) {
    const taken = [].concat((M.trees || []).map(t => t.at), M.wayCairns || [], (M.seats || []).map(s => s.at), M.stones || []);
    const cols = (L.W && L.W.cols) || 96, rows = 26, cand = [];
    for (let y = 2.5; y < rows; y += 1) for (let x = 2.5; x < cols - 2; x += 1) {
      const r = kit.rng(kit.hash(Math.round(x * 3), Math.round(y * 3), 389)), jx = x + (r() - .5) * .6, jy = y + (r() - .5) * .5;
      if (!fellCell(L, jx, jy)) continue;
      // room for the tor and its scree (about 2.4 x 1.4 cells), and nothing for it to hide in the four rows behind it
      let ok = true;
      for (let dy = -.9; dy <= .7 && ok; dy += .35) for (let dx = -1.75; dx <= 1.75 && ok; dx += .35) if (!freeAt(L, jx + dx, jy + dy)) ok = false;
      for (let dy = 1; dy <= 4.2 && ok; dy += .4) for (let dx = -1.4; dx <= 1.4 && ok; dx += .7) { const b = L.base(jx + dx, jy - dy); if (b && (b.route || b.staticId || b.freshwater || L.plot(jx + dx, jy - dy))) ok = false; }
      // (and no building in the rows in front whose picture would stand over it: a tor stood on the bothy's roof)
      for (let dy = .5; dy <= 4.5 && ok; dy += .5) for (let dx = -2.6; dx <= 2.6 && ok; dx += .65) { const b = L.base(jx + dx, jy + dy); if (b && b.staticId) ok = false; }
      if (!ok || taken.some(t => Math.hypot(t[0] - jx, (t[1] - jy) * 1.3) < 2.6) || (M.trees || []).some(t => Math.abs(t.at[0] - jx) < (t.w || 2.6) * .5 + 1.8 && t.at[1] - jy > -1.2 && t.at[1] - jy < (t.h || 4) * 1.6 + 1)) continue;   // (no tree's crown hangs over a tor: crown ghosts lay over one)
      cand.push({ x: jx, y: jy, rank: r() });
    }
    cand.sort((a, b) => a.rank - b.rank);
    const out = []; for (const c of cand) { if (R && c.y < R.footAt(Math.max(R.x0, Math.min(R.x1, c.x))) + 3.6) continue; if (out.some(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) < 8)) continue; out.push(c); if (out.length >= 8) break; }
    return out;
  }
  function torGround(B, kit, w, seed, season, moorish) {
    const r = kit.rng(seed + 7), snowy = season === 'winter';
    B.shadow(w * .2, 3, w * .82, 9, .36).shadow(w * .1, 1, w * .58, 6, .42);
    // the scree fan and fallen blocks round the foot first
    B.f(B.blob(r, w * .08, 4, w * .78, 9, 10, .4), snowy ? '#dfe5ea' : ROCK.scree, .55);
    for (let k = 0; k < 18; k++) B.stone(r, (r() - .5) * w * 1.5, 1 + r() * 10, 1.4 + r() * 3, 1 + r() * 1.7, STONEP, snowy && r() < .5 ? 'snow' : r() < .25 ? STONEP.lichen : null);
    for (let k = 0; k < 3; k++) B.boulder(r, (r() > .5 ? 1 : -1) * (w * .5 + r() * w * .25), 2 + r() * 5, 6 + r() * 6, 4 + r() * 3, Object.assign({}, STONEP, { rock: GRIT.mid, rockLo: GRIT.shade, rockHi: GRIT.hi }), snowy);
    if (!snowy) { B.tufts(r, 0, 3, w * 1.7, 14, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6); if (moorish || r() < .5) for (let k = 0; k < 4; k++) B.heather(r, (r() - .5) * w * 1.4, 2 + r() * 6, 4 + r() * 4, { heather: '#8d6a92', heatherHi: '#b07ab8', heatherLo: '#5f4a62', fell: '#a6b276', fellLo: '#8c9a5e', fellHi: '#c2c78e' }, season === 'summer' ? '#b98cc0' : null); }
  }
  function torArt(B, kit, w, h, seed, season, moorish) {
    const r = kit.rng(seed), snowy = season === 'winter';
    // (vale final, fix 1 north: the tor was a stack of tan boxes with a purple lid, "cheap next to the painted scenes".)
    // A gritstone tor as it weathers: a broad, low outcrop in the turf, and on it two or three stacks of woolpacks,
    // rounded pillow-shaped blocks with soft lobed outlines, each sagging on the one below, split by deep joints, the
    // upper left of each lit warm, the east side and the undercuts in cool shade, lichen in patches, a rowan seedling
    // or heather in the cracks, one block toppled at the foot.
    const out = [];
    // the outcrop: a low, wide hump the stacks stand on, its foot sunk in turf
    { const ow = w * .62, oh = h * .2; out.push({ x: 0, y: -oh * .45, rx: ow, ry: oh * .55, base: true }); }
    const stacks = 2 + (r() < .45 ? 1 : 0), xs = stacks === 2 ? [-.2, .26] : [-.3, .06, .36];
    xs.forEach((fx, si) => {
      const main = si === (stacks === 2 ? 0 : 1); let y = -h * .16, bw = w * (main ? .58 : .42) * (.9 + r() * .2), cx0 = fx * w;
      const n = main ? 3 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2), hh = (main ? h * .8 : h * (.4 + r() * .16)) / n;
      for (let k = 0; k < n; k++) { const bh = hh * (.85 + r() * .3), rx = bw * (.5 + r() * .1), ry = bh * .52; cx0 += (r() - .5) * bw * .22; out.push({ x: cx0, y: y - ry * .9, rx, ry, top: k === n - 1 }); y -= bh * .86; bw *= .84 + r() * .12; }
    });
    const G = { lit: '#bcb09a', mid: '#968b78', shade: '#6e665c', cool: '#5c5a5e', deep: '#34302c', hi: '#e2d8c2' };
    for (const m of out) {
      const pts = []; const N = 14; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, s = 1 + (r() - .5) * .1, sq = Math.sin(a) > 0 ? .86 : 1; pts.push([m.x + Math.cos(a) * m.rx * s, m.y + Math.sin(a) * m.ry * s * sq + (Math.sin(a) > .6 ? m.ry * .1 : 0)]); }
      const P = B.poly(pts);
      B.f(B.poly(pts.map(([x, y]) => [x + m.rx * .08, y + m.ry * .22])), G.deep, .7);   // the undercut and its shadow on the block below
      B.f(P, m.base ? G.shade : G.mid);
      B.cx.save(); B.cx.clip(new Path2D(P));
      B.f(B.blob(r, m.x + m.rx * .45, m.y + m.ry * .15, m.rx * .75, m.ry * 1.05, 9, .25), G.cool, .55);                // the east side in cool shade
      B.f(B.blob(r, m.x - m.rx * .3, m.y - m.ry * .38, m.rx * .7, m.ry * .55, 9, .3), G.lit, .9);                      // the lit upper left
      B.f(B.blob(r, m.x - m.rx * .42, m.y - m.ry * .62, m.rx * .38, m.ry * .2, 7, .35), G.hi, .7);
      B.f(B.blob(r, m.x, m.y + m.ry * .8, m.rx * 1.1, m.ry * .32, 9, .3), G.deep, .25);                                  // the dark under-curve
      for (let j = 0; j < (m.base ? 4 : 2); j++) { const jx = m.x + (r() - .5) * m.rx * 1.2; B.s(`M${jx} ${m.y - m.ry}q${(r() - .5) * 4} ${m.ry} ${(r() - .5) * 3} ${m.ry * 2}`, G.deep, 1.1, .45); }   // joints
      if (r() < .6) B.f(B.blob(r, m.x + (r() - .6) * m.rx, m.y - m.ry * (.1 + r() * .4), 2.5 + r() * 4, 1.4 + r(), 6, .5), STONEP.lichen, .6);
      if (r() < .35) B.f(B.blob(r, m.x + (r() - .5) * m.rx, m.y + (r() - .3) * m.ry * .5, 2 + r() * 3, 1.2, 6, .5), '#e8e2c8', .55);
      B.cx.restore();
      if (snowy && !m.base) B.f(B.blob(r, m.x - m.rx * .1, m.y - m.ry * .78, m.rx * .72, m.ry * .26, 8, .35), '#fbfbf7', .95);
      if (snowy && m.base) B.f(B.blob(r, m.x - m.rx * .2, m.y - m.ry * .7, m.rx * .7, m.ry * .3, 8, .35), '#fbfbf7', .9);
    }
    // growth in the cracks and on the tops (sprigs, not a lid)
    if (!snowy) for (const m of out) { if (m.base) { for (let k = 0; k < 4; k++) B.tufts(r, m.x + (r() - .5) * m.rx * 1.5, m.y - m.ry * .5 + r() * 3, 10, 4, ['#7d8f4e', '#a6b276', '#c2c78e'], 5); continue; }
      if (m.top && r() < .8) { const hx = m.x + (r() - .5) * m.rx * .6, hy = m.y - m.ry * .82; if (moorish) B.heather(r, hx, hy, 3.5 + r() * 2, { heather: '#8d6a92', heatherHi: '#b07ab8', heatherLo: '#5f4a62', fell: '#a6b276', fellLo: '#8c9a5e', fellHi: '#c2c78e' }, season === 'summer' ? '#b98cc0' : null); else B.tufts(r, hx, hy, 7, 4, ['#7d8f4e', '#a6b276'], 5); } }
  }
  /* ---------- the tiers: low banks across the open fell ---------- */
  function tierBanks(C, R) {
    const { L, kit } = C, snowy = C.season === 'winter', cols = (L.W && L.W.cols) || 96;
    const levels = [4.6, 8.4, 12.2, 16, 19.4];
    levels.forEach((base, k) => {
      const segs = []; let seg = [];
      for (let x = 0; x <= cols; x += .25) {
        const y = base + 1.3 * Math.sin(x / 6.2 + k * 1.7) + 1.1 * (kit.fbm(x / 7, k * 3.1, 397) - .5) * 2;
        const ok = freeAt(L, x, y) && freeAt(L, x, y - .35) && freeAt(L, x, y + .4) && (!R || y > R.footAt(Math.max(R.x0, Math.min(R.x1, x))) + .9);
        if (ok) seg.push([x, y]); else { if (seg.length > 6) segs.push(seg); seg = []; }
      }
      if (seg.length > 6) segs.push(seg);
      for (const sg of segs) {
        const pts = sg.map(([x, y]) => L.cpt(x, y)), bb = kit.bboxOf(pts, 26), seed = kit.hash(Math.round(sg[0][0] * 4), k, 401);
        C.add(bb, seed, (B, r) => {
          const n = pts.length, taper = i => Math.min(1, i / 5, (n - 1 - i) / 5);
          // the fall: a band of shaded turf below the lip, deepest in the middle, fading out at each end into the slope
          const lo = pts.map((p, i) => ({ x: p.x, y: p.y + (9 + 8 * kit.noise(i * .4, k, 409)) * taper(i) }));
          B.f(B.poly(pts.concat(lo.slice().reverse())), snowy ? '#b8c6d4' : '#6a7840', .55);
          B.f(B.poly(lo.map(p => ({ x: p.x, y: p.y - 1 })).concat(lo.slice().reverse().map(p => ({ x: p.x, y: p.y + 5 })))), snowy ? '#a9bccf' : '#5c6a3a', .16);
          // the lit lip, with the odd stone breaking through the turf and a tuft of bleached grass
          B.s(B.line(pts.map(p => ({ x: p.x, y: p.y - .8 }))), snowy ? '#ffffff' : '#d6d79e', 2.6, .75);
          for (let i = 1; i < n - 1; i += 2) { const p = lo[i]; if (r() < .3) B.stone(r, p.x + (r() - .5) * 8, (p.y + pts[i].y) / 2, 2 + r() * 4, 1.4 + r() * 2, STONEP, snowy ? 'snow' : r() < .3 ? STONEP.lichen : null); else if (!snowy && r() < .5) B.tufts(r, pts[i].x, pts[i].y + 1, 9, 3, ['#8c9a5e', '#c2c78e', '#b8b47a'], 5); }
        });
      }
    });
  }

  function compose(C) {
    const { L, kit, thing } = C, M = (L.pres && L.pres.mountains) || null; if (!M) return;
    const season = C.season;
    const R = rangeLine(L, kit); try { window.__gpvRange = R; } catch (e) { /* debug handle */ }
    // the tiers first, in the ground under the paths (a path that crosses a bank is cut through it)
    tierBanks(C, R);
    if (R) {
      // the range, in runs of three cells (each its own sprite, so none takes long to bake: at five cells the height
      // field's run took 62 ms)
      for (let a0 = R.x0; a0 < R.x1; a0 += 3) {
        const a1 = Math.min(R.x1, a0 + 3); let fMin = 9, fMax = 0; for (let x = a0; x <= a1 + 1e-6; x += .25) { const f = R.footAt(x); fMin = Math.min(fMin, f); fMax = Math.max(fMax, f); }
        let hMax = 0; for (let x = a0 - .3; x <= a1 + .3; x += .25) { const e = ridgeH(kit, x, R.summits, R); hMax = Math.max(hMax, e * 1.2 + H * .3 + crestD(e) * L.ch + (R.footAt(Math.max(R.x0, Math.min(R.x1, x))) - fMin) * 0); }
        const p = L.cpt(a0, fMin), wpx = (a1 - a0) * L.cw, down = (fMax - fMin) * L.ch, S = {};
        thing({ key: 'fell-range-' + a0 + '|' + season, x: p.x, y: p.y, K: 1.5, box: [-2, -hMax - 3.6 * H - 24, wpx + 2, down + 6], prep: dl => rangeStep(S, kit, L, R, a0, a1, p.x, p.y, season, dl), draw: B => rangeRun(B, kit, L, R, a0, a1, p.x, p.y, season, S) });
        C.add([p.x - 40, p.y - 40, p.x + wpx + 40, p.y + down + 50], kit.hash(a0, 7, 487), B => rangeSkirt(B, kit, L, R, a0, a1, p.x, p.y, season));
      }
      // its feet: half-cell steps along the drawn foot, so walking stops at the rock where it is drawn
      for (let x = R.x0; x < R.x1; x += .5) { let f = 9; for (let t = x; t <= x + .5 + 1e-6; t += .125) f = Math.min(f, R.footAt(Math.min(R.x1, t))); f += .06;
        const p = L.cpt(x, f); thing({ key: 'fell-range-foot-' + Math.round(x * 2), x: p.x, y: p.y - 2, foot: [0, .5 * L.cw, (f + .6) * L.ch], make: () => null }); }
    }
    // the tors
    torSpots(L, kit, M, R).forEach((s, i) => {
      const r = kit.rng(kit.hash(Math.round(s.x * 10), Math.round(s.y * 10), 419)), w = L.cw * (2.1 + r() * .5), h = H * (3 + r() * .5), p = L.cpt(s.x, s.y + .35), moorish = s.x < 28;
      thing({ key: 'fell-tor-' + i + '|' + season, x: p.x, y: p.y, K: 1.25, box: [-w * .7, -h * 1.12 - 12, w * .7, 6], foot: [-w * .44, w * .44, .62 * L.ch], draw: B => torArt(B, kit, w, h, 4300 + i, season, moorish) });
      C.add([p.x - w * 1.3, p.y - 30, p.x + w * 1.3, p.y + 30], 4400 + i, B => { B.cx.save(); B.cx.translate(p.x, p.y); torGround(B, kit, w, 4300 + i, season, moorish); B.cx.restore(); });
    });
  }
  V.parts.push({ id: 'cloudbreak-relief', compose });
})();
