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
  // how far south of the top row the range's foot may come at column x (cells): until the first cell something else uses
  function freeDepth(L, x) {
    for (let y = .15; y < 4.2; y += .25) if (!freeAt(L, x - .45, y) || !freeAt(L, x, y) || !freeAt(L, x + .45, y)) return y;
    return 4.2;
  }
  // the ridge's height above the foot (px) at world column x (cells): crags 3 to 4.5 H, a few summits higher, so the
  // skyline is a ridge with tops on it, the same for every run (they join with no seam)
  function ridgeH(kit, x, summits) {
    let h = H * (3 + 1.1 * kit.fbm(x / 8.5, 1.7, 311)) + (kit.noise(x * .9, 4.1, 313) - .5) * H * .7 + (kit.noise(x * 3.1, 5.3, 315) - .5) * H * .25;
    for (const s of summits) { const u = (x - s.x) / s.w; if (Math.abs(u) < 1) h = Math.max(h, H * s.h * Math.pow(1 - Math.abs(u), 1.35) + h * Math.abs(u)); }
    return h;
  }
  function rangeLine(L, kit) {
    const cols = (L.W && L.W.cols) || 96, xs = []; let x0 = null, x1 = null;
    for (let x = 0; x < cols; x++) { const ok = fellCell(L, x + .5, .3); if (ok) { if (x0 === null) x0 = x; x1 = x + 1; } else if (x0 !== null) break; }
    if (x0 === null) return null;
    const step = .25, raw = [];
    for (let x = x0; x <= x1 + 1e-6; x += step) { const fd = freeDepth(L, Math.min(x1 - .05, Math.max(x0 + .05, x))); raw.push({ x, fd, want: 1.35 + 1.25 * kit.fbm(x / 4.2, 8.3, 317) }); }
    // the foot: where the fell is open it comes out a way, wandering; where something stands it keeps half a cell clear of it
    const foot = raw.map((p, i) => { let lim = 9; for (let j = Math.max(0, i - 3); j <= Math.min(raw.length - 1, i + 3); j++) lim = Math.min(lim, raw[j].fd - .55); return Math.max(.75, Math.min(3.4, p.want, lim)); });
    const sm = foot.map((f, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(foot.length - 1, i + 2); j++) { s += foot[j]; n++; } return Math.min(f + .12, s / n); });
    for (let i = 0; i < raw.length; i++) xs.push({ x: raw[i].x, f: sm[i] });
    // a few summits on the ridge, spaced along it, never quite at the ends
    const summits = []; { const r = kit.rng(4421); for (let x = x0 + 5 + r() * 6; x < x1 - 4; x += 10 + r() * 9) summits.push({ x, w: 3.5 + r() * 3.5, h: 4.3 + r() * 1 }); }
    return { x0, x1, step, pts: xs, summits, footAt: x => { const i = Math.max(0, Math.min(xs.length - 1, (x - x0) / step)), a = Math.floor(i), b = Math.min(xs.length - 1, a + 1), t = i - a; return xs[a].f * (1 - t) + xs[b].f * t; } };
  }
  // one run of the range (cells a0..a1), drawn relative to (ox, oy): ox the run's left px, oy the px of its highest foot.
  // Every feature is placed by its world x, so neighbouring runs draw the same ridge and the same gullies across their seam.
  function rangeRun(B, kit, L, R, a0, a1, ox, oy, season) {
    const cw = L.cw, ch = L.ch, snowy = season === 'winter', capShare = { winter: 1, spring: .5, autumn: .22, summer: .1 }[season] || .1;
    const X = x => (x - a0) * cw, FY = x => (R.footAt(x) * ch + L.cpt(0, 0).y) - oy, TY = x => FY(x) - ridgeH(kit, x, R.summits);
    const top = [], footL = []; for (let x = a0 - .25; x <= a1 + .25 + 1e-6; x += .125) { const j = (kit.noise(x * 6.3, 2.2, 331) - .5) * 7; top.push([X(x), TY(x) + j]); footL.push([X(x), FY(x) + (kit.noise(x * 4.1, 7.7, 337) - .5) * 4]); }
    const face = top.concat(footL.slice().reverse()), faceP = new Path2D(B.poly(face)), w = (a1 - a0) * cw;
    B.cx.save(); B.cx.beginPath(); B.cx.rect(0, -900, w, 1200); B.cx.clip();   // each run paints exactly its own columns
    // the scree skirt first, on the turf in front of the foot: fans below the gullies, a grey wash the rest of the way
    for (let x = Math.floor(a0) - 1; x <= a1 + 1; x += .5) { const r = kit.rng(kit.hash(Math.round(x * 4), 3, 341)); const fx = X(x), fy = FY(x);
      B.f(B.blob(r, fx, fy + 3, cw * .42, 7 + r() * 5, 8, .4), snowy ? '#dfe5ea' : ROCK.screeLo, .28);
      for (let k = 0; k < 6; k++) B.stone(r, fx + (r() - .5) * cw * .6, fy + 2 + r() * 12, 1.4 + r() * 3.2, 1 + r() * 1.8, STONEP, snowy && r() < .6 ? 'snow' : r() < .2 ? STONEP.lichen : null); }
    // the higher fells behind, in haze: their tops show over the saddles of the front ridge, so the range goes back
    { const bk = []; for (let x = a0 - .25; x <= a1 + .25 + 1e-6; x += .125) bk.push([X(x), FY(x) - H * (4.6 + 1.6 * kit.fbm(x / 6.5, 9.1, 461)) - (kit.noise(x * 2.2, 3, 463) - .5) * 10]);
      const bp = B.poly(bk.concat(footL.slice().reverse())); B.f(bp, snowy ? '#dfe6ec' : '#a8b0b4', .95);
      for (let x = Math.floor(a0 / 1.7) * 1.7 - 1.7; x < a1 + 1.7; x += 1.7) { const r = kit.rng(kit.hash(Math.round(x * 10), 21, 467)), bx = x + (r() - .5); const tY = FY(bx) - H * (4.6 + 1.6 * kit.fbm(bx / 6.5, 9.1, 461));
        B.f(B.poly([[X(bx), tY], [X(bx - .9), tY + H * 2.4], [X(bx - .1), tY + H * 2.4]]), '#c4cacb', .5).f(B.poly([[X(bx), tY], [X(bx + .1), tY + H * 2.4], [X(bx + 1), tY + H * 2.4]]), '#8e989e', .4); }
      if (capShare > .05) B.f(B.poly(bk.concat(bk.slice().reverse().map(([x, y]) => [x, y + 6 + capShare * 16]))), '#f6f8f8', .8);
      B.s(B.line(bk.map(([x, y]) => ({ x, y }))), '#e8eef0', 1.2, .6); }
    // the body of the face: cool grey rock, darker toward the foot
    B.cx.save(); B.cx.clip(faceP);
    const yTop = Math.min(...top.map(p => p[1])), yBot = Math.max(...footL.map(p => p[1]));
    B.f(B.rect(-20, yTop - 10, w + 40, yBot - yTop + 30), B.lin(0, yTop, 0, yBot, [[0, '#a99f92'], [.5, '#8f877c'], [1, '#6f6a62']]));
    // spurs: ribs of rock from points on the ridge down to the foot, drifting away from the nearest summit; the faces
    // between them lit where they look west and in shade where they look east, so the range is modelled, not a curtain
    const SP = 2.1, spurX = k => k * SP + (kit.noise(k * 1.7, 3.3, 421) - .5) * SP * .8;
    const nearTop = x => R.summits.reduce((m, s2) => Math.abs(s2.x - x) < Math.abs(m - x) ? s2.x : m, x + 99);
    const spur = k => { const xs = spurX(k), nt = nearTop(xs), drift = Math.max(-1.6, Math.min(1.6, (xs - nt) * .3 + (kit.noise(k * 2.9, 1.1, 431) - .5) * .8)), pts = [];
      for (let j = 0; j <= 5; j++) { const t = j / 5, x = xs + drift * Math.pow(t, 1.2) + (j && j < 5 ? (kit.noise(k * 3.1 + j, 2, 433) - .5) * .18 : 0), t0 = TY(xs), f = FY(x); pts.push([X(x), t0 + (f - t0) * t + (j === 0 ? 3 : 0)]); } return { xs, pts }; };
    const k0 = Math.floor((a0 - 2) / SP), k1 = Math.ceil((a1 + 2) / SP), spurs = []; for (let k = k0; k <= k1; k++) spurs.push(spur(k));
    for (let i = 0; i < spurs.length - 1; i++) {
      const A = spurs[i], Bs = spurs[i + 1], ridge = top.filter(p => p[0] >= X(A.xs) - 1 && p[0] <= X(Bs.xs) + 1), mid = (A.xs + Bs.xs) / 2;
      const slope = TY(mid + .3) - TY(mid - .3), r = kit.rng(kit.hash(Math.round(mid * 10), 1, 439));   // the ridge climbing to the east: this face looks west, into the light
      const lit = slope < -2 ? 1 : slope > 2 ? -1 : (r() < .5 ? .3 : -.3), col = kit.mix(lit > .5 ? '#bfb3a0' : lit > 0 ? '#a99f90' : lit > -.5 ? '#928a82' : '#807a7c', '#9a9286', r() * .35);
      B.f(B.poly(A.pts.slice().reverse().concat(ridge, Bs.pts)), col, .85);
      // strata across the face: short broken lines, darker under, lit over
      for (let k = 0; k < 9; k++) { const t = .1 + k * .095 + (r() - .5) * .03, ax = A.pts[Math.min(5, Math.round(t * 5))], bx = Bs.pts[Math.min(5, Math.round(t * 5))], x0 = ax[0] + (bx[0] - ax[0]) * (.05 + r() * .3), x1 = ax[0] + (bx[0] - ax[0]) * (.55 + r() * .4), yy = ax[1] + (bx[1] - ax[1]) * .5 + (r() - .5) * 4;
        B.s(`M${x0} ${yy + 1.6}L${x1} ${yy + 1.6 + (r() - .5) * 3}`, '#3e3a3c', 1.6, lit > 0 ? .28 : .36).s(`M${x0} ${yy}L${x1} ${yy + (r() - .5) * 3}`, lit > 0 ? '#e2d8c4' : '#a49c94', 1, .45); }
    }
    // each spur's rib: lit on its west side, a dark cleft on its east (where the gullies run)
    for (const sp of spurs) { B.s(B.line(sp.pts.map(([x, y]) => ({ x: x + 2, y }))), '#3a363a', 2.6, .3); B.s(B.line(sp.pts.map(([x, y]) => ({ x: x - .6, y }))), '#e4dac6', 1.3, .45); }
    // grass and heather on the ledges, in patches, and moss in the clefts low down
    if (!snowy) for (let x = a0 - .4; x < a1 + .4; x += .22) { const r = kit.rng(kit.hash(Math.round(x * 40), 15, 443)); if (r() < .42) continue; const t0 = TY(x), f0 = FY(x), u = .3 + Math.pow(r(), .7) * .66, yy = t0 + (f0 - t0) * u, xx = X(x);
      B.f(B.blob(r, xx + 1, yy + 1.6, 5 + r() * 8, 1.8 + r() * 1.4, 7, .5), '#4e5a32', .35).f(B.blob(r, xx, yy, 4 + r() * 8, 1.6 + r() * 1.4, 7, .5), r() < .25 && season === 'summer' ? '#8d6a92' : u > .7 ? '#7f8c48' : '#8e9a5a', .9).f(B.blob(r, xx - 1.5, yy - 1.2, 2 + r() * 4, .9, 6, .5), '#b4bd7a', .7); }
    // snow on the tops: a ragged cap on the summits (and all over in winter), cooler in the shade
    { const cap = [], edge = []; for (let x = a0 - .25; x <= a1 + .25 + 1e-6; x += .125) { const t = TY(x), f = FY(x), hgt = f - t, d = snowy ? hgt * .85 : Math.max(0, hgt - H * 4.4) * capShare * 2.2 + hgt * capShare * .18; cap.push([X(x), t - 3]); edge.push([X(x), t + d + (kit.noise(x * 3.7, 1, 379) - .5) * 9]); }
      B.f(B.poly(cap.concat(edge.reverse())), '#c8d6e6', .95); B.f(B.poly(cap.concat(edge.map(([x, y]) => [x - 3, y - 4]))), '#fbfbf7', .9); }
    // the far haze on the upper face, so the range sits back against the distant ranges
    B.f(B.rect(-20, yTop - 10, w + 40, yBot - yTop + 30), B.lin(0, yTop, 0, yBot, [[0, 'rgba(226,234,238,.38)'], [.55, 'rgba(226,234,238,.08)'], [1, 'rgba(226,234,238,0)']]));
    B.cx.restore();
    // the ridge line, lit, and the foot, where turf and heather lap up onto the rock
    B.s(B.line(top.map(([x, y]) => ({ x, y }))), snowy ? '#ffffff' : ROCK.litHi, 1.8, .7);
    B.s(B.line(footL.map(([x, y]) => ({ x, y: y - 1 }))), ROCK.deep, 2.6, .35);
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
      if (!ok || taken.some(t => Math.hypot(t[0] - jx, (t[1] - jy) * 1.3) < 2.6)) continue;
      cand.push({ x: jx, y: jy, rank: r() });
    }
    cand.sort((a, b) => a.rank - b.rank);
    const out = []; for (const c of cand) { if (R && c.y < R.footAt(Math.max(R.x0, Math.min(R.x1, c.x))) + 3.6) continue; if (out.some(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) < 8)) continue; out.push(c); if (out.length >= 8) break; }
    return out;
  }
  function torArt(B, kit, w, h, seed, season, moorish) {
    const r = kit.rng(seed), snowy = season === 'winter';
    B.shadow(w * .2, 3, w * .82, 9, .36);
    // the scree fan and fallen blocks round the foot first
    B.f(B.blob(r, w * .08, 4, w * .78, 9, 10, .4), snowy ? '#dfe5ea' : ROCK.scree, .55);
    for (let k = 0; k < 18; k++) B.stone(r, (r() - .5) * w * 1.5, 1 + r() * 10, 1.4 + r() * 3, 1 + r() * 1.7, STONEP, snowy && r() < .5 ? 'snow' : r() < .25 ? STONEP.lichen : null);
    // woolpacks: courses of wide, flat gritstone slabs with rounded ends, each course stepped back and narrower, split by
    // vertical joints, a deep undercut under each course, lit on the top and the west, the east end in shade
    let y = 0, bw = w * .92, cx0 = 0; const tiers = 4 + Math.floor(r() * 2), th = h / tiers;
    const tops = [];
    for (let t = 0; t < tiers; t++) {
      const hh = th * (.9 + r() * .3), n = bw > w * .55 ? 1 + Math.floor(r() * 2) : 1; cx0 += (r() - .5) * w * .12;
      for (let k = 0; k < n; k++) { const sw = bw / n - (n > 1 ? 3 : 0), sx = cx0 - bw / 2 + k * (bw / n) + (r() - .5) * 3, rad = Math.min(hh * .45, 9);
        B.f(B.rr(sx + 2, y - hh + 2.5, sw, hh, rad), GRIT.deep, .8);                                 // the undercut and its shadow
        B.f(B.rr(sx, y - hh, sw, hh, rad), GRIT.mid);
        B.f(B.rr(sx + sw * .55, y - hh, sw * .45, hh, rad), GRIT.shade, .8);                         // the east end in shade
        B.f(B.rr(sx + 1.5, y - hh + 1.2, sw * .5, hh * .42, rad * .8), GRIT.lit, .9);                // the lit west face
        B.f(B.rr(sx + 3, y - hh + .6, sw - 6, 2.4, 1.2), GRIT.hi, .75);                               // the lit top edge
        for (let j = 0; j < Math.max(1, Math.round(sw / 22)); j++) { const jx = sx + sw * (j + .5 + (r() - .5) * .4) / Math.max(1, Math.round(sw / 22)); B.s(`M${jx} ${y - hh + 2}l${(r() - .5) * 2} ${hh - 3}`, GRIT.deep, 1.2, .6); }
        B.s(`M${sx + rad} ${y - hh * .45}l${sw - rad * 2} ${(r() - .5) * 2}`, GRIT.deep, .8, .3);    // a bedding line
        if (r() < .5) B.f(B.blob(r, sx + sw * (.2 + r() * .6), y - hh * (.3 + r() * .4), 3 + r() * 3, 1.4, 6, .5), STONEP.lichen, .7);
        if (snowy) B.f(B.rr(sx + 2, y - hh - 1.5, sw - 4, 3.4, 1.6), '#fbfbf7', .95);
        tops.push({ x: sx + sw / 2, y: y - hh, w: sw }); }
      y -= hh * .94; bw *= .66 + r() * .14;
    }
    const topM = tops[tops.length - 1];
    if (!snowy) B.f(B.blob(r, topM.x, topM.y, topM.w * .38, 2.6, 7, .5), moorish ? '#8d6a92' : '#8c9a5e', .95).f(B.blob(r, topM.x - topM.w * .1, topM.y - 1.2, topM.w * .22, 1.4, 6, .5), moorish ? '#b07ab8' : '#c2c78e', .85);
    for (let k = 0; k < 3; k++) B.boulder(r, (r() > .5 ? 1 : -1) * (w * .5 + r() * w * .25), 2 + r() * 5, 6 + r() * 6, 4 + r() * 3, Object.assign({}, STONEP, { rock: GRIT.mid, rockLo: GRIT.shade, rockHi: GRIT.hi }), snowy);
    if (!snowy) { B.tufts(r, 0, 3, w * 1.7, 14, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6); if (moorish || r() < .5) for (let k = 0; k < 4; k++) B.heather(r, (r() - .5) * w * 1.4, 2 + r() * 6, 4 + r() * 4, { heather: '#8d6a92', heatherHi: '#b07ab8', heatherLo: '#5f4a62', fell: '#a6b276', fellLo: '#8c9a5e', fellHi: '#c2c78e' }, season === 'summer' ? '#b98cc0' : null); }
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
    const R = rangeLine(L, kit);
    // the tiers first, in the ground under the paths (a path that crosses a bank is cut through it)
    tierBanks(C, R);
    if (R) {
      // the range, in runs of five cells (each its own sprite, so none takes long to bake)
      for (let a0 = R.x0; a0 < R.x1; a0 += 5) {
        const a1 = Math.min(R.x1, a0 + 5); let fMin = 9, fMax = 0; for (let x = a0; x <= a1 + 1e-6; x += .25) { const f = R.footAt(x); fMin = Math.min(fMin, f); fMax = Math.max(fMax, f); }
        let hMax = 0; for (let x = a0 - .3; x <= a1 + .3; x += .25) hMax = Math.max(hMax, ridgeH(kit, x, R.summits));
        const p = L.cpt(a0, fMin), wpx = (a1 - a0) * L.cw, down = (fMax - fMin) * L.ch;
        thing({ key: 'fell-range-' + a0 + '|' + season, x: p.x, y: p.y, K: 1.1, box: [-2, -hMax - 24, wpx + 2, down + 26], draw: B => rangeRun(B, kit, L, R, a0, a1, p.x, p.y, season) });
      }
      // its feet: half-cell steps along the drawn foot, so walking stops at the rock where it is drawn
      for (let x = R.x0; x < R.x1; x += .5) { let f = 9; for (let t = x; t <= x + .5 + 1e-6; t += .125) f = Math.min(f, R.footAt(Math.min(R.x1, t))); f -= .12;
        const p = L.cpt(x, f); thing({ key: 'fell-range-foot-' + Math.round(x * 2), x: p.x, y: p.y - 2, foot: [0, .5 * L.cw, (f + .6) * L.ch], make: () => null }); }
    }
    // the tors
    torSpots(L, kit, M, R).forEach((s, i) => {
      const r = kit.rng(kit.hash(Math.round(s.x * 10), Math.round(s.y * 10), 419)), w = L.cw * (2.1 + r() * .5), h = H * (3 + r() * .5), p = L.cpt(s.x, s.y + .35), moorish = s.x < 28;
      thing({ key: 'fell-tor-' + i + '|' + season, x: p.x, y: p.y, K: 1.25, box: [-w * 1.05 - 10, -h * 1.12 - 12, w * 1.05 + 14, 18], foot: [-w * .42, w * .42, .62 * L.ch], draw: B => torArt(B, kit, w, h, 4300 + i, season, moorish) });
    });
  }
  V.parts.push({ id: 'cloudbreak-relief', compose });
})();
