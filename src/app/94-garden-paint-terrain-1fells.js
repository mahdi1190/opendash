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
  const KIT = () => window.GardenPaintTerrainKit, D2 = () => sceneDraw;
  const K = 1.5, CHUNK = 256, DEPTH = -9350;
  const GORGE_WATER = false;               // the gorge's water is painted with its walls; false leaves a hole for the water painter
  // (false since 19 Nov 2026: baked here, the gorge kept its daytime turquoise at dusk and at night beside the tarn's
  // evening colours; the water painter draws it by the hour, with its flow, and this layer keeps the rock walls)
  let current = null, sprites = [], lastError = null, stats = {}, trunkFeet = [], feet = [], feetSigNow = '';
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };

  const BASE = { rock: '#a49a8c', rockLo: '#7d7468', rockHi: '#c9c1b0', rockDk: '#4e473f', lichen: '#c9c48a', moss: '#7d8f4e', peat: '#5a4636', path: '#c4b089', pathLo: '#9c8a66', pathHi: '#dccfac', snow: '#fbfbf7', snowSh: '#c8d6e6', snowDk: '#a9bccf', pine: '#3c5a3a', pineHi: '#58784a', bark: '#b06a3a', water: '#6d9fb0', shallow: '#93bfbd', foam: '#eef2e2', cave: '#1d2224' };
  const PAL = {
    summer: Object.assign({}, BASE, { fell: '#909c64', fellLo: '#6e7b4c', fellHi: '#aeb07a', bleach: '#c2b688', heather: '#7a5a66', heatherHi: '#94687e', heatherLo: '#4c3a44', bloom: '#9e6e9a', bracken: '#7f8c48', far: ['#a9b5bd', '#93a3ad', '#7f919c'], farSnow: 0 }),
    spring: Object.assign({}, BASE, { fell: '#8fa266', fellLo: '#6e8450', fellHi: '#aab87e', bleach: '#c0ba92', heather: '#7e6478', heatherHi: '#9a7e92', heatherLo: '#56445a', bloom: null, bracken: '#8a9050', far: ['#adb8c0', '#97a6b0', '#83959f'], farSnow: .45 }),
    autumn: Object.assign({}, BASE, { fell: '#a09464', fellLo: '#7e744c', fellHi: '#bcae7c', bleach: '#cabb8a', heather: '#7e6258', heatherHi: '#987460', heatherLo: '#5a4640', bloom: null, bracken: '#9c7046', far: ['#b1b6b8', '#9ba2a6', '#878f95'], farSnow: .2 }),
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
    // the places the layout names on the fells: its sections (by id and middle), its statics, its tarn
    const sections = Object.entries(D.sectionCells || {}).map(([id, cells]) => ({ id, x: cells.reduce((a, c) => a + c[0], 0) / cells.length + .5, y: cells.reduce((a, c) => a + c[1], 0) / cells.length + .5 })).filter(c => inRegion(c.x, c.y));
    const statics = (D.static || []).filter(c => inRegion(c.x + c.w / 2, c.y + c.h / 2)), tarn = water.find(w => /tarn/.test(w.id)) || null;
    const plotCells = new Set(); for (const cells of Object.values(D.sectionCells || {})) for (const c of cells) plotCells.add(c[0] + ',' + c[1]);
    const plotAt = (x, y) => plotCells.has(Math.floor(x) + ',' + Math.floor(y));
    return { D, W, pt, cpt, regions, regionLoops, coast, peaks, runs, terraces, water, gorge, routes, falls, gates, ids, inRegion, sections, statics, tarn, plotAt };
  }
  const loopPath = (loops) => { const p = new Path2D(); for (const l of loops) { if (!l.length) continue; p.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) p.lineTo(l[i].x, l[i].y); p.closePath(); } return p; };

  // Broad colour laid soft: paint(S) fills shapes (S.f(path, colour, alpha), S.cx for transforms) into a scratch canvas
  // at one pixel to six world px, blurred a little there and stretched over the chunk, so its edges melt over a stride
  // at every bake level for the price of a tiny canvas (a ctx.filter blur at full level cost tens of ms an op).
  // With on false it paints straight on to B as before.
  const softPad = 40, softS = 6; let softA = null, softB = null;
  const FIELD_CV = []; function fieldCanvas(i, w, h) { let c = FIELD_CV[i]; if (!c) c = FIELD_CV[i] = document.createElement('canvas'); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }
  function soft(B, cb, on, paint) {
    if (!on) return paint(B);
    const w = Math.ceil((cb[2] - cb[0] + softPad * 2) / softS), h = Math.ceil((cb[3] - cb[1] + softPad * 2) / softS);
    if (!softA) { softA = document.createElement('canvas'); softB = document.createElement('canvas'); }
    for (const c of [softA, softB]) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, w, h); }
    const sx = softA.getContext('2d'); sx.setTransform(1 / softS, 0, 0, 1 / softS, -(cb[0] - softPad) / softS, -(cb[1] - softPad) / softS);
    const S = { cx: sx, f(d, col, a) { sx.globalAlpha = a == null ? 1 : a; sx.fillStyle = col; sx.fill(typeof d === 'string' ? new Path2D(d) : d); return S; } };
    paint(S); sx.globalAlpha = 1;
    const bx = softB.getContext('2d'); bx.filter = 'blur(1.6px)'; bx.drawImage(softA, 0, 0); bx.filter = 'none';
    B.cx.save(); B.cx.imageSmoothingEnabled = true; B.cx.imageSmoothingQuality = 'high'; B.cx.globalAlpha = 1; B.cx.drawImage(softB, cb[0] - softPad, cb[1] - softPad, w * softS, h * softS); B.cx.restore();
  }

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
    // the heather moor runs west from the tarn (its west shore and a stride on), fading over seven cells
    const tarnB = L.tarn ? kit.bboxOf(L.tarn.pts) : null, moorEdge = tarnB ? tarnB[0] + 1.1 * cw : worldW * .3;
    const moor = x => Math.max(0, Math.min(1, (moorEdge - x) / (7 * cw)));
    const plazas = L.routes.filter(rt => rt.tier === 'plaza').map(rt => { const a = rt.points[0], b = rt.points[rt.points.length - 1]; return { id: rt.id, x0: Math.min(a.x, b.x) / cw, x1: Math.max(a.x, b.x) / cw, cx: (a.x + b.x) / 2 / cw, cy: ((a.y + b.y) / 2 - W.sky) / ch, w: rt.width }; });
    const summit = plazas.slice().sort((p, q) => q.w - p.w)[0] || null, pass = L.gates.find(g => g.kind === 'pass' || /pass/i.test(g.name || '')) || null;
    const bog = L.sections.find(c => /mist|bog|moss|marsh/.test(c.id)) || null, tarnC = tarnB ? { x: (tarnB[0] + tarnB[2]) / 2 / cw, y: ((tarnB[1] + tarnB[3]) / 2 - W.sky) / ch, r: Math.max(tarnB[2] - tarnB[0], (tarnB[3] - tarnB[1]) * cw / ch) / 2 / cw + 3.4 } : null;
    const snowRow = SNOW[season];
    const snowAt = (x, y) => { const row = (y - W.sky) / ch; if (snowRow > 90) return 1; if (snowRow < -5) return 0; const edge = snowRow + (kit.fbm(x / 140, y / 90, 41) - .5) * 4.5; return row < edge - .8 ? 1 : row < edge + .8 ? (edge + .8 - row) / 1.6 : 0; };
    const add = (bb, seed, draw, extra) => ops.push(Object.assign({ bb, seed, draw }, extra || {}));

    // 1. The fell: one base with broad lobed drifts; the moor west is heather-dark, the pasture east is short turf.
    add(fellBB, 11, (B, r, cb) => {
      clipFell(B);
      // the ground itself is the shared kit's moor now (94-garden-paint-ground-0kit.js), under this layer; without the kit, or under snow, the old base
      if (!window.GardenPaintGround || snowRow > -5) B.f(B.rect(cb[0] - 2, cb[1] - 2, cb[2] - cb[0] + 4, cb[3] - cb[1] + 4), B.lin(0, top, 0, rb[3], [[0, P.fellHi], [.45, P.fell], [1, P.fellLo]]));
      // (over the kit's moor these drifts are colour only, laid soft at low resolution: hard-edged they were big translucent
      // ellipses overlapping all over the moor; 19 Nov 2026)
      // (highlands fix round 2: pale drifts laid over the kit's moor at a low alpha read as a milky lime wash, the same
      // tuft stamped on it everywhere; the art director asked for a painted moor under a big cold sky.) The fell's own
      // colour is laid here as one field at a quarter of the resolution, more than half opaque: whole reaches of sun and
      // cloud shade several screens across, within them patches of bleached bent and straw, deep olive in the hollows,
      // a cold blue-green where the shade lies, peat-brown under the heather, and the north rows cooler still.
      if (window.GardenPaintGround && snowRow <= -5) {
        const hexA = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
        const C = { sun: hexA(kit.mix(P.fellHi, '#a89c62', .4)), mid: hexA(kit.mix(P.fell, '#6e7a48', .3)), shade: hexA(kit.mix(P.fellLo, '#46584e', .5)), straw: hexA(kit.mix(P.bleach, '#a8925e', .25)), olive: hexA(kit.mix(P.fellLo, '#44502e', .5)), peat: hexA(kit.mix(P.heatherLo, '#5a4636', .5)), cold: hexA('#6a7e7c') };
        const Q = 4, pad = 16, w = Math.ceil((cb[2] - cb[0] + pad * 2) / Q), h = Math.ceil((cb[3] - cb[1] + pad * 2) / Q);
        const cv = fieldCanvas(0, w, h), x0 = cv.getContext('2d'), img = x0.createImageData(w, h), d = img.data, lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const wx = cb[0] - pad + (i + .5) * Q, wy = cb[1] - pad + (j + .5) * Q, n1 = kit.fbm(wx / 640, wy / 420, 5), n2 = kit.fbm(wx / 180, wy / 120, 6), n3 = kit.noise(wx / 46, wy / 30, 7), m = moor(wx);
          let c = n1 > .5 ? lerp(C.mid, C.sun, Math.min(1, (n1 - .5) * 3.2)) : lerp(C.mid, C.shade, Math.min(1, (.5 - n1) * 3.2));
          if (n2 > .56) c = lerp(c, C.straw, Math.min(.6, (n2 - .56) * 3.4)); else if (n2 < .42) c = lerp(c, C.olive, Math.min(.6, (.42 - n2) * 3.4));
          { const sw = kit.noise(wx / 260, wy / 170, 8); c = lerp(c, sw > .5 ? C.sun : C.shade, Math.abs(sw - .5) * .7); }   // swells and hollows a screen across, so a close view has light and shade in it too
          if (m > .05) c = lerp(c, C.peat, m * .32 * (.6 + n3 * .6));
          const north = Math.max(0, Math.min(1, 1 - (wy - W.sky) / (9 * ch))); if (north > 0) c = lerp(c, C.cold, north * .22);
          const k = .86 + n3 * .26, o = (j * w + i) * 4; d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = (.8 + n3 * .14) * 255;
        }
        x0.putImageData(img, 0, 0);
        const cv2 = fieldCanvas(1, w, h), x2 = cv2.getContext('2d'); x2.clearRect(0, 0, w, h); x2.filter = 'blur(.8px)'; x2.drawImage(cv, 0, 0); x2.filter = 'none';
        B.cx.save(); B.cx.imageSmoothingEnabled = true; B.cx.imageSmoothingQuality = 'high'; B.cx.drawImage(cv2, cb[0] - pad, cb[1] - pad, w * Q, h * Q); B.cx.restore();
      }
    });
    // 1b. Heather in drifts, not dots. The shared moor lays a small clump of heather wherever its drift field passes .56;
    // seen together they read as an even rash of purple dots. Here the same field is laid as one continuous mass at a
    // quarter of the resolution, smoothed up: deep heather where the moor is heathery (darker in its hollows, lit and in
    // bloom on its swells, broken at its edge), and on the pasture, where the turf is short, varied turf over the kit's
    // clumps instead. So the clumps underneath become texture inside a drift.
    // where heather begins, by how heathery the moor is: one smooth rule (a step in it drew a straight edge down the moor)
    const heathAt = m => { const t = Math.max(0, Math.min(1, (m - .08) / .34)), u = t * t * (3 - 2 * t); return .74 + (.56 - m * .06 - .74) * u; };
    if (window.GardenPaintGround && snowRow <= -5) {
      const hexA = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }, sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
      const HL = hexA(kit.mix(P.heatherLo, '#3a3c26', .35)), HM = hexA(kit.mix(kit.mix(P.heather, P.heatherLo, .2), '#5e5a3a', .3)), HH = hexA(P.bloom ? kit.mix(P.heather, P.bloom, .4) : P.heatherHi), FL = hexA(P.fellLo), FM = hexA(P.fell), FH = hexA(kit.mix(P.fellHi, P.bleach, .3));
      let hc = null, hb = null;
      add(fellBB, 13, (B, r, cb) => {
        clipFell(B);
        const Q = 2, pad = 12, w = Math.ceil((cb[2] - cb[0] + pad * 2) / Q), h = Math.ceil((cb[3] - cb[1] + pad * 2) / Q);
        if (!hc) { hc = document.createElement('canvas'); hb = document.createElement('canvas'); }
        for (const c of [hc, hb]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        const x = hc.getContext('2d'), img = x.createImageData(w, h), d = img.data;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const wx = cb[0] - pad + (i + .5) * Q, wy = cb[1] - pad + (j + .5) * Q, dr = kit.fbm(wx / 230, wy / 150, 77); if (dr < .53) continue;
          const m = moor(wx), th = heathAt(m), fine = kit.noise(wx / 7, wy / 4.5, 820), lump = kit.noise(wx / 15, wy / 9, 821);
          // (the drift's edge is lumpy and fairly sharp: a wide soft ramp read as a purple cloud airbrushed on the turf)
          const aH = sm((dr - th + .02 + (lump - .5) * .07 + (fine - .5) * .03) / .045), aC = sm((dr - .535) / .045) * (1 - aH);
          // (heather is a dense dark mat, lit on its swells and in flower on top: as a translucent wash with big dark blotches it
          // read as a stain on the turf; the colour now breaks at the scale of a clump, not of a puddle)
          const n = kit.noise(wx / 8, wy / 5, 818), lit = kit.noise(wx / 70, wy / 44, 819), o = (j * w + i) * 4, past = 1 - sm((m - .1) / .35);
          const hcol = n < .3 && lit < .5 ? HL : lit > .5 && n > .5 ? HH : HM, fcol = n < .35 ? FL : n > .7 ? FH : FM, k = .9 + lit * .18 + (fine - .5) * .22 + (kit.noise(wx / 4.2, wy / 2.8, 822) - .5) * .26;   // (and a clump's own light and shade, so close up the mass is plants, not a wash)
          const hA = aH * (.8 + n * .12 + (fine - .5) * .1) * (1 - past * .3), tot = hA + aC * .7; if (tot <= .01) continue;
          const fh = hA / tot * (1 - past * .3);   // (on the pasture the heather is short and dull, half turf)
          d[o] = (hcol[0] * fh + fcol[0] * (1 - fh)) * k; d[o + 1] = (hcol[1] * fh + fcol[1] * (1 - fh)) * k; d[o + 2] = (hcol[2] * fh + fcol[2] * (1 - fh)) * k; d[o + 3] = Math.min(1, tot) * 255;
        }
        x.putImageData(img, 0, 0);
        const bx = hb.getContext('2d'); bx.clearRect(0, 0, w, h); bx.filter = 'blur(.6px)'; bx.drawImage(hc, 0, 0); bx.filter = 'none';
        B.cx.save(); B.cx.imageSmoothingEnabled = true; B.cx.imageSmoothingQuality = 'high'; B.cx.drawImage(hb, cb[0] - pad, cb[1] - pad, w * Q, h * Q); B.cx.restore();
      });
    }
    // 2. The tops: contour-ringed rises, each ring a lit north-west rim and a shaded south-east fall, so height reads from above.
    // (where the rises are comes from the layout: the summit's top, the high places its sections name, the two shoulders of
    // the pass, and out on the moor wherever a broad swell of noise rises; no cell is named)
    const inPeak = (x, y) => L.peaks.some(pk => { const b = kit.bboxOf(pk.pts, 30), px = x * cw, py = W.sky + y * ch; return px > b[0] && px < b[2] && py > b[1] && py < b[3]; });
    const tops = [];
    if (summit) tops.push([summit.cx - .6, summit.cy - .2, Math.max(6, summit.x1 - summit.x0 + 5.5), 4.6, 6]);
    for (const c of L.sections) if (/top|flat|pasture|view|warren|stones|end/.test(c.id) && !(summit && Math.hypot(c.x - summit.cx, (c.y - summit.cy) * 1.6) < 6.5) && !inPeak(c.x, c.y)) tops.push([c.x + .4, c.y - .6, /flat/.test(c.id) ? 6.4 : 4.2, /flat/.test(c.id) ? 1.9 : 2.3, /top/.test(c.id) ? 4 : 3]);
    if (pass) for (const sd of [-1, 1]) tops.push([pass.x + .5 + sd * 4, pass.y - 2.1 - (sd > 0 ? .9 : 0), 3.3, 1.8, 4]);
    for (let y = 4; y < (rb[3] - W.sky) / ch - 5; y += 5) for (let x = 3; x < W.cols - 3; x += 7) { const jx = x + (kit.hash(x, y, 701) % 100) / 30 - 1.6, jy = y + (kit.hash(x, y, 702) % 100) / 60 - .8, c = L.cpt(jx, jy);
      if ((moor(c.x) > .5 ? kit.fbm(jx / 11, jy / 6, 703) > .58 : kit.fbm(jx / 11, jy / 6, 703) > .6) && fellAt(c.x, c.y) && !inPeak(jx, jy) && tops.every(t => Math.hypot(t[0] - jx, (t[1] - jy) * 1.8) > 8)) tops.push([jx, jy, 5.4, 2.4, 3]); }
    tops.forEach(([x, y, rx, ry, n], hi) => {
      const c = L.cpt(x, y), RX = rx * cw, RY = ry * ch;
      add([c.x - RX - 30, c.y - RY - 40, c.x + RX + 30, c.y + RY + 30], 100 + hi, (B, r0, cb) => {
        clipFell(B);
        // (soft rims over the kit's moor: a rise swells out of the moor, it is not a lumpy pad with an outline laid on it)
        soft(B, cb, !!window.GardenPaintGround && snowRow <= 90, S => { for (let k = 0; k < n; k++) {
          const s = 1 - k / (n + .4), rr = kit.rng(900 + hi * 31 + k), cx0 = c.x - k * 5, cy0 = c.y - k * RY * .18, m = moor(cx0);
          const base = m > .5 ? kit.mix(P.heather, P.fellHi, k / n * .5) : kit.mix(P.fell, P.fellHi, k / n);
          const d = B.blob(rr, cx0, cy0, RX * s, RY * s, 11, .32);
          S.cx.save(); S.cx.translate(RX * s * .07 + 3, RY * s * .14 + 3.5); S.f(d, m > .5 ? P.heatherLo : kit.mix(P.fellLo, '#4a5230', .3), .42); S.cx.restore();
          S.f(d, base, .36);
          S.f(B.blob(rr, cx0 - RX * s * .28, cy0 - RY * s * .3, RX * s * .42, RY * s * .26, 8, .4), kit.mix(P.fellHi, '#e2d6a4', .15), .26);   // (stronger light and shade: the fells read as one flat meadow)
        } });
      });
    });
    // 2b. Aprons round the peaks: scree and boulder fields that run out from each mountain's foot into the fell.
    for (const pk of L.peaks) { const b = kit.bboxOf(pk.pts), cx0 = (b[0] + b[2]) / 2, cy0 = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) * .72, ry = (b[3] - b[1]) * .85;
      add([cx0 - rx - 30, cy0 - ry - 30, cx0 + rx + 30, cy0 + ry + 40], 160 + pk.id.length, (B, r, cb) => {
        clipFell(B);
        soft(B, cb, !!window.GardenPaintGround, S => { for (let k = 0; k < 4; k++) { const s = 1 - k * .2; S.f(B.blob(r, cx0 + k * 4, cy0 + k * 6, rx * s, ry * s, 12, .35), k < 2 ? P.fellLo : kit.mix(P.rock, P.fell, .5), .12 + k * .06); } });
        // (each stone from its own random stream, and only the stones this chunk can show: all 140 in every chunk the apron
        // touched made it the slowest op on the fells, 83 ms)
        for (let k = 0; k < 140; k++) { const rk = kit.rng(kit.hash(k, pk.id.length, 1601)), a = rk() * Math.PI * 2, d = Math.sqrt(rk()), x = cx0 + Math.cos(a) * rx * d, y = cy0 + Math.sin(a) * ry * d + ry * .2;
          if (x < cb[0] - 30 || x > cb[2] + 30 || y < cb[1] - 24 || y > cb[3] + 24 || !fellAt(x, y)) continue;
          if (d < .75 && rk() < .25) B.boulder(rk, x, y, 6 + rk() * 9, 4 + rk() * 6, P, snowRow > 90); else B.stone(rk, x, y, 1.4 + rk() * 3.4, .9 + rk() * 2, P, snowRow > 90 ? 'snow' : null); }
      }); }
    // 3. The near ground: heather clumps, tussocks, turf, stones, sheep trods, peat hags, cotton grass and bracken, by hashed tiles.
    add(fellBB, 21, (B, r0, cb) => {
      clipFell(B);
      const peakNear = (x, y) => L.peaks.some(pk => { const b = kit.bboxOf(pk.pts); return x > b[0] - 90 && x < b[2] + 90 && y > b[1] - 40 && y < b[3] + 70; });
      // inside the heather's mass, its plants: dense woody sprigs dark at the foot and lit at the tip, and in summer the
      // spikes of bell flowers on the swells, so close up a drift is heather and never a purple wash (19 Nov 2026)
      if (window.GardenPaintGround && snowRow <= -5) kit.tiles(cb, 40, 10, 17, (tx, ty, r) => { for (let k = 0; k < 16; k++) { const x = tx + r() * 40, y = ty + r() * 40, d = kit.fbm(x / 230, y / 150, 77), th = heathAt(moor(x)); if (d < th + .02 || !fellAt(x, y)) { r(); r(); continue; }
        const hh = 2.2 + r() * 3.2, lx = (r() - .5) * 2.4, tone = r(), lit = kit.noise(x / 70, y / 44, 819) > .5;
        B.s(`M${x} ${y}l${lx * .5} ${-hh * .5}`, '#4a3e40', 1, .38).s(`M${x + lx * .5} ${y - hh * .5}l${lx * .5} ${-hh * .5}`, tone < .5 ? P.heatherLo : P.heatherHi || P.heather, .9, .5);
        if (P.bloom && lit && tone > .45) B.f(B.ell(x + lx, y - hh - .5, .75, 1.5), tone > .8 ? kit.mix(P.bloom, '#ffffff', .25) : P.bloom, .92); } });
      kit.tiles(cb, 64, 24, 7, (tx, ty, r) => {
        for (let k = 0; k < 7; k++) {
          const x = tx + r() * 64, y = ty + r() * 64, pick = r(), sz = r(); if (!fellAt(x, y)) continue;
          const m = moor(x), row = (y - W.sky) / ch, tarnNear = !!tarnC && Math.hypot(x / cw - tarnC.x, row - tarnC.y) < tarnC.r, wet = tarnNear || !!bog && Math.hypot(x / cw - bog.x, row - bog.y) < 4.2;
          const drift = kit.fbm(x / 230, y / 150, 77), fern = kit.fbm(x / 210, y / 130, 91);
          const hth = heathAt(m);
          if (drift > hth && pick < .6 + (drift - .56) * 1.5) {
            B.cx.globalAlpha = 1;
            // inside a drift (1b lays its mass): fine sprigs, the odd spray of bloom; a real clump only at the drift's broken edge
            if (!window.GardenPaintGround || snowRow > -5 || (drift < hth + .035 && r() < .12)) { B.heather(r, x, y, 3 + sz * 4, m > .25 ? P : HP, P.bloom && r() < .5 ? P.bloom : null); continue; }
            // a clump's woody sprigs, dark at the foot, and in summer its spikes of bell flowers on top
            for (let q = 0; q < 9; q++) { const px = x + (r() - .5) * 13, py = y + (r() - .5) * 6, hh = 1.8 + r() * 3.2, lx = (r() - .5) * 2; B.s(`M${px} ${py}l${lx} ${-hh}`, q % 3 === 1 ? P.heatherHi : q % 3 ? '#4a3e3c' : P.heatherLo, 1, .7);
              if (P.bloom && drift > .58 && q % 2 === 0) B.f(B.ell(px + lx, py - hh - .6, .7, 1.3), q % 4 ? P.bloom : kit.mix(P.bloom, '#ffffff', .3), .9); }
            continue;
          }
          // (tussocks gather where the ground is wet or rough and are rare between, each its own size; one small tuft stamped
          // evenly over the fells read as a printed texture: art director, highlands round 2)
          if (pick < .5) { const tus = kit.fbm(x / 120, y / 80, 301); if (tus < .52 && r() < .8) continue; const big = tus > .62 && r() < .45, tw = big ? 12 + sz * 10 : 5 + sz * 7; if (big) B.f(B.blob(r, x + 1.5, y + 1, tw * .55, tw * .16, 7, .45), '#3e4630', .3); B.tufts(r, x, y, tw, big ? 8 + Math.floor(sz * 6) : 3 + Math.floor(sz * 3), big ? [kit.mix(P.fellLo, '#6a5a3a', .3), P.bleach, '#a89a62', P.fellLo] : [P.fellLo, P.fellHi, P.bleach], big ? 8 + sz * 5 : 3.5 + sz * 2.5); continue; }
          if (pick < .62 && (peakNear(x, y) || !!summit && row < summit.cy + 1.3 && Math.abs(x / cw - summit.cx) < 6 || r() < .25)) { B.stone(r, x, y, 2 + sz * 4, 1.2 + sz * 2.2, P); continue; }
          if (pick < .7 && wet) { B.f(B.blob(r, x, y, 5 + sz * 4, 2.6 + sz * 2, 7, .5), P.fellLo, .7); B.tufts(r, x, y - 1, 9, 7, ['#6f7f48', P.bleach], 7); if (season !== 'winter' && season !== 'autumn') for (let i = 0; i < 4; i++) B.f(B.circ(x + (r() - .5) * 10, y - 6 - r() * 4, 1.3), '#f6f4ec', .95); continue; }
          if (pick < .78 && !!summit && x > (summit.x0 - 3.6) * cw && m < .2) { const L2 = 16 + sz * 26; B.s(`M${x} ${y}q${L2 / 2} ${-2 - r() * 3} ${L2} ${(r() - .5) * 3}`, P.fellLo, 1.4, .55).s(`M${x} ${y - 1.2}q${L2 / 2} ${-2 - r() * 3} ${L2} ${(r() - .5) * 3}`, P.fellHi, .8, .5); continue; }
          if (pick < .8 && m > .4 && drift > .58) { const w = 8 + sz * 10; B.f(B.blob(r, x + 1, y + 2.4, w, w * .26, 8, .4), P.peat, .85).f(B.blob(r, x - .5, y - .6, w * .92, w * .2, 8, .45), P.heatherLo, .85).f(B.blob(r, x - w * .2, y - 1.2, w * .45, w * .1, 7, .5), P.heather, .7); continue; }
          if (fern > .7 && pick < .9 && season !== 'winter' && (m > .15 || row > 16)) { for (let f = 0; f < 4; f++) { const a = -Math.PI / 2 + (f - 1.5) * .55 + (r() - .5) * .3, l = 6 + r() * 4, ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l * .8; B.s(`M${x} ${y}Q${(x + ex) / 2 + 1.5} ${(y + ey) / 2 - 1} ${ex} ${ey}`, P.bracken, 1, .6); for (let k = 1; k < 4; k++) { const t = k / 4, px = x + (ex - x) * t, py = y + (ey - y) * t; B.s(`M${px} ${py}l${2.6 - t * 1.4} ${1 - t}M${px} ${py}l${-2.4 + t * 1.2} ${1.2 - t}`, P.bracken, .8, .55); } } continue; }
        }
      });
    });
    // 3b. Outcrops (flat gritstone slabs breaking the turf, ground-level: you walk over them) and the old sheepfolds of the high pasture.
    const routeNear = (x, y, d) => L.routes.some(rt => rt.points.some((p, i) => i % 3 === 0 && Math.abs(p.x - x) < d && Math.abs(p.y - y) < d * .7));
    // (slabs either side of the pass, where the col's rock breaks through, then a scatter over the open fell)
    const crops = (pass ? [[-3.8, -1.8, 6, 1.2], [4.6, -3.2, 6, 1.3], [-2.2, -.4, 4, .9], [2.6, -.8, 4, .8]] : []).map(([dx, dy, n, sc]) => ({ x: (pass.x + dx) * cw, y: W.sky + (pass.y + dy) * ch, n, s: sc })); { const rr = kit.rng(5150), yMax = (rb[3] - W.sky) / ch - 6; for (let k = 0; k < 140 && crops.length < 26; k++) { const x = (2 + rr() * (W.cols - 4)) * cw, y = W.sky + (2 + rr() * Math.max(4, yMax - 2)) * ch; if (fellAt(x, y) && !routeNear(x, y, 60) && !L.peaks.some(pk => { const b = kit.bboxOf(pk.pts, 40); return x > b[0] && x < b[2] && y > b[1] && y < b[3]; })) crops.push({ x, y, n: 3 + Math.floor(rr() * 5), s: .7 + rr() * .8 }); } }
    for (const c of crops) add([c.x - 70, c.y - 40, c.x + 70, c.y + 40], 170 + Math.round(c.x), (B, r) => {
      clipFell(B); const sn = snowAt(c.x, c.y) > .6;
      for (let k = 0; k < c.n; k++) { const x = c.x + (r() - .5) * 80 * c.s, y = c.y + (r() - .5) * 30 * c.s, rx = (8 + r() * 14) * c.s, ry = rx * (.34 + r() * .14);
        const tone = r(), form = r(), T = tone < .33 ? { lo: '#7e766a', mid: '#9c9488', hi: '#c6beb0' } : tone < .66 ? { lo: '#86786a', mid: '#a6988a', hi: '#d0c4b2' } : { lo: '#747670', mid: '#929490', hi: '#bcbeb8' };   // (cool, warm or grey stone: one slab stamped over the fells was a fault)
        if (form < .55) B.f(B.blob(r, x + 2, y + 2.4, rx, ry, 8, .3), P.rockDk, .4).f(B.blob(r, x, y, rx, ry, 8, .3), T.lo).f(B.blob(r, x - rx * (.05 + r() * .2), y - ry * (.2 + r() * .2), rx * (.7 + r() * .2), ry * .66, 8, .3), T.mid).f(B.blob(r, x - rx * (.2 + r() * .25), y - ry * .45, rx * (.25 + r() * .25), ry * .25, 6, .4), sn ? P.snow : T.hi, .8);
        else if (form < .8) { const g = (r() - .5) * rx * .4; for (const sd of [-1, 1]) { const hx = x + sd * rx * .26 + g * .3; B.f(B.blob(r, hx + 2, y + 2.2, rx * .5, ry, 7, .3), P.rockDk, .4).f(B.blob(r, hx, y, rx * .48, ry * .95, 7, .3), T.lo).f(B.blob(r, hx - rx * .1, y - ry * .3, rx * .34, ry * .55, 6, .3), T.mid).f(B.blob(r, hx - rx * .2, y - ry * .5, rx * .16, ry * .2, 5, .4), sn ? P.snow : T.hi, .8); } }
        else { const hh = ry * (1.6 + r() * .8); B.f(B.ell(x + rx * .2, y + 1.5, rx * .9, ry * .45), P.rockDk, .35).f(B.blob(r, x, y - hh * .4, rx * .72, hh * .62, 9, .25), T.lo).f(B.blob(r, x - rx * .12, y - hh * .55, rx * .52, hh * .42, 8, .3), T.mid).f(B.blob(r, x - rx * .3, y - hh * .78, rx * .24, hh * .16, 6, .4), sn ? P.snow : T.hi, .85); }
        if (r() < .4) { const cx0 = x + (r() - .5) * rx * .8; B.s(`M${cx0} ${y - ry * .6}l${(r() - .5) * rx * .4} ${ry * (.6 + r() * .6)}`, P.rockDk, .8, .45); }
        if (!sn) { if (r() < .5) B.f(B.blob(r, x + rx * .3, y - ry * .2, rx * .25, ry * .2, 6, .5), P.lichen, .6); B.tufts(r, x, y + ry * .8, rx * 1.6, 5, [P.fellLo, P.bleach], 5); if (moor(x) > .3) B.heather(r, x + rx * .9, y + ry * .5, 4 + r() * 3, P, P.bloom); } }
    });
    // the old sheepfolds of the high pasture: two rings of dry stone near the shepherd's hut, each where its whole ring
    // is clear of plots, paths, statics and water (a fold laid over a plot's wall was an overlap)
    const hut = L.statics.find(c => /hut|bothy/.test(c.id)), folds = [];
    if (hut) for (const fr of [1.6, 1.2]) for (let d = 3; d < 7.5 && folds.length < (fr === 1.6 ? 1 : 2); d += .5) for (let a = 0; a < 16 && folds.length < (fr === 1.6 ? 1 : 2); a++) {
      const fx = hut.x + .5 + Math.cos(a / 16 * Math.PI * 2 + 2.2) * d, fy = hut.y + .5 + Math.sin(a / 16 * Math.PI * 2 + 2.2) * d * .7, c = L.cpt(fx, fy);
      let ok = fellAt(c.x, c.y) && !inPeak(fx, fy) && !routeNear(c.x, c.y, fr * cw + 30) && folds.every(f => Math.hypot(f[0] - fx, (f[1] - fy) * 1.6) > f[2] + fr + 1.5);
      for (let k = 0; ok && k < 12; k++) { const q = k / 12 * Math.PI * 2, px = fx + Math.cos(q) * (fr + .5), py = fy + Math.sin(q) * (fr + .5) * .95; if (L.plotAt(px, py) || !fellAt(px * cw, W.sky + py * ch) || L.statics.some(t => px > t.x - .3 && px < t.x + t.w + .3 && py > t.y - .3 && py < t.y + t.h + .3)) ok = false; }
      if (ok) folds.push([fx, fy, fr]);
    }
    L.folds = folds;   // (the groves keep their trunks off the rings)
    // (highlands fix round 2: the fold walls were a stroke on the turf about a third of your height, the gate a hurdle
    // floating outside the gap, and you walked through the stone. The walls stand now, waist to chest high (the size
    // standard's wall), as two standing pieces, the back arc and the front arc, so you are inside the fold between them;
    // the hurdle hangs open from the gateway's end; and walking stops along the ring (foldFeet), open at the gateway.)
    L.foldWalls = []; L.foldFeet = [];
    for (const [fx, fy, frx] of folds) { const c = L.cpt(fx, fy), RX = frx * cw, RY = frx * ch * .95, fs = Math.round(fx * 7 + fy * 3);
      const gapA = Math.atan2(-.6, -1) + Math.PI * 2, rOf = a => 1 + (kit.noise(Math.cos(a) * 1.6 + fs, Math.sin(a) * 1.6, 431) - .5) * .22, ring = [];
      for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2, da = Math.abs(((a - gapA) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < .3) { ring.push(null); continue; } const q = rOf(a); ring.push({ x: c.x + Math.cos(a) * RX * q, y: c.y + Math.sin(a) * RY * q, a }); }
      for (const p of ring) if (p) L.foldFeet.push({ x0: (p.x - 7) / cw, y0: (p.y - 5 - W.sky) / ch, x1: (p.x + 7) / cw, y1: (p.y + 4 - W.sky) / ch, src: 'sheepfold wall' });
      const endA = gapA - .3, hinge = { x: c.x + Math.cos(endA) * RX * rOf(endA), y: c.y + Math.sin(endA) * RY * rOf(endA) };
      L.foldWalls.push({ c, RX, RY, ring, hinge, gapA, fs, sn: snowAt(c.x, c.y) > .6 });
      add([c.x - RX - 20, c.y - RY - 20, c.x + RX + 20, c.y + RY + 24], 190 + fx, (B, r) => {
        clipFell(B); const sn = snowAt(c.x, c.y) > .6;
        // the fold's turf is greener (sheltered) and trodden bare through its gateway and round the trough
        B.f(B.ell(c.x, c.y, RX * .92, RY * .9), sn ? P.snowSh : P.fellHi, .45);
        // the wall's foot on the turf: a dark seam, so the stones sit in the ground
        { let seg = []; const flush = () => { if (seg.length > 1) B.s(B.line(seg.map(p => ({ x: p.x + 2, y: p.y + 2.5 }))), '#2e3424', 10, .24); seg = []; }; for (const p of ring) { if (!p) { flush(); continue; } seg.push(p); } flush(); }
        if (!sn) { const gx = c.x + Math.cos(gapA) * RX, gy = c.y + Math.sin(gapA) * RY;
          for (let k = 0; k < 7; k++) { const t = k / 6, x = gx + (c.x - gx) * t * .7, y = gy + (c.y - gy) * t * .7; B.f(B.blob(r, x, y, 9 - t * 3, 4.5 - t, 8, .45), P.peat, .22 + (1 - t) * .14); }
          for (let k = 0; k < 3; k++) B.f(B.blob(r, gx + (r() - .5) * 18, gy + 4 + r() * 6, 7 + r() * 5, 3, 7, .5), P.pathLo, .3);
          if (frx > 1.4) for (const [ox, oy] of [[-.35, -.05], [.25, .25]]) { const sx = c.x + ox * RX, sy = c.y + oy * RY, fl = ox > 0 ? -1 : 1;
            B.f(B.ell(sx + 2, sy + 2.4, 8, 2.6), '#2e3420', .28).f(B.blob(r, sx, sy - 2.6, 7.4, 4.2, 9, .3), '#e6e0d0').f(B.blob(r, sx - 1.6, sy - 4, 4.4, 2.4, 7, .4), '#f6f2e8', .9)
              .f(B.ell(sx + fl * 7.4, sy - 4.2, 2.3, 1.9), '#3a3430').f(B.ell(sx + fl * 8.4, sy - 4.8, .8, .5), '#5a524c', .9).f(B.ell(sx + fl * 5.8, sy - 5.6, 1.4, .7), '#2e2a26'); } }
      }); }
    // 4. The far fells beyond the north edge (backdrop only): three ranges of real peaks going into haze, each peak lit on
    //    its west flank and shaded on its east, snow on the far tops by season; the near range is fell-coloured and meets the fell.
    // (the far fells run east as far as the land does along the north edge: past it is the sea)
    const northEnd = Math.max(0, ...L.coast.flat().filter(p => p.y < W.sky + 4 * ch).map(p => p.x)) || worldW * .86;
    add([-60, top - 40, Math.min(worldW, northEnd + 1.5 * cw), W.sky + 40], 31, (B) => {
      B.cx.clip(coastP, 'evenodd');
      const xs0 = -80, xs1 = Math.min(worldW, northEnd), foot = W.sky + 4;
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
      // the near range's foot melts into the fell's own colour, under a low bank of mist, so the backdrop has no ruled line where the walkable fell begins
      // (the wash fades out again below the foot, and the mist bank is broken along its length: each ended on a ruled line)
      const fellC = snowRow > 0 ? P.snow : P.fell;
      B.f(B.rect(xs0, W.sky - 46, xs1 - xs0 + 70, 76), B.lin(0, W.sky - 46, 0, W.sky + 30, [[0, kit.rgba(fellC, 0)], [.6, kit.rgba(fellC, .9)], [.8, kit.rgba(fellC, .45)], [1, kit.rgba(fellC, 0)]]));
      for (let x = xs0; x < xs1 + 60; x += 46) { const n = kit.noise(x / 160, 2.2, 63), w = 70 + n * 60, y = W.sky - 6 + (kit.noise(x / 90, 4.4, 64) - .5) * 16;
        B.cx.save(); B.cx.translate(x, y); B.cx.scale(1, (15 + n * 10) / w); B.f(B.circ(0, 0, w), B.rad(0, 0, w, [[0, kit.rgba('#e8eef0', .26 + n * .16)], [1, kit.rgba('#e8eef0', 0)]])); B.cx.restore(); }
      // the far fells end soft where the land runs out east, over the sea, never on a vertical cut
      B.cx.globalCompositeOperation = 'destination-out';
      B.f(B.rect(xs1 - 220, top - 60, 400, W.sky - top + 110), B.lin(xs1 - 220, 0, xs1 + 40, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]));
      B.cx.globalCompositeOperation = 'source-over';
    });
    // 4b. The march wall: where the fell runs out at the map's north edge you stop at an old boundary wall, high as your
    // waist, tumbled in places, grown over with turf and lichen (you stopped in open grass with nothing to say why).
    // (walking stops a fifth of a cell into the top row of the layout's land, wherever that row is fell)
    { const edgeY = []; for (let x = 0; x <= W.cols; x += .5) edgeY.push({ y: W.sky + .2 * ch - 1, ok: fellAt(Math.min(W.cols - .05, x) * cw, W.sky + .5 * ch) });
      const hh = gardenSizePx('wall', .2);
      add([0, W.sky - hh - 20, worldW, W.sky + 3 * ch + 10], 33, (B, r0, cb) => {
        B.cx.clip(coastP, 'evenodd');   // (not the region: the wall stands up above the map's top row)
        for (let tx = Math.floor((cb[0] - 20) / 20) * 20; tx < cb[2] + 20; tx += 20) { const r = kit.rng(kit.hash(tx, 7, 34)); for (let x = tx; x < tx + 20; ) {
          const i = Math.max(0, Math.min(edgeY.length - 1, Math.round(x / cw * 2))), e = edgeY[i]; if (!e.ok) { x += 6; continue; }
          const n = kit.noise(x / 40, 1.3, 461), h = hh * (.62 + kit.noise(x / 9, 2.1, 462) * .35) * (n < .25 ? .6 : 1), w = 4 + r() * 5, y0 = e.y + 3 - kit.noise(x / 70, 4.1, 463) * 5;   /* (its line wanders a little; it never stands below where you stop) */
          if (x === tx) B.f(B.rect(tx - .5, y0 - h * .7, 21, h * .7), snowRow > 90 ? P.snowSh : '#6e685c', .95);
          const rows = Math.max(2, Math.round(h / 4.4)); for (let k = 0; k < rows; k++) { const sy = y0 - 2.4 - k * (h - 3.5) / rows + (r() - .5), bx = x + (k & 1 ? w * .5 : 0) + (r() - .5) * 1.6, bw = w * (.7 + r() * .6); B.f(B.ell(bx + bw / 2 + .6, sy + .9, bw / 2, 2.1), '#4e483e', .4).f(B.ell(bx + bw / 2, sy, bw / 2 * (.85 + r() * .3), 2 + r() * .6), r() < .4 ? '#a8a090' : r() < .6 ? '#bdb5a3' : '#8e8678').f(B.ell(bx + bw / 2 - 1, sy - 1, bw / 4, .7), '#dcd6c6', .4); }
          B.f(B.ell(x + w / 2, y0 - h + 1.4, w * .45, 1.6), snowRow > 90 ? P.snow : r() < .3 ? P.moss : '#c2baa6');
          if (snowRow <= 90 && r() < .35) B.tufts(r, x + w / 2, y0 + 1, 7, 3, [P.fellLo, P.bleach], 5);
          if (n < .25 && r() < .5) B.stone(r, x + (r() - .5) * 6, y0 + 3 + r() * 4, 2 + r() * 2, 1.3 + r(), P, snowRow > 90 ? 'snow' : null);
          x += w + .3; } }
      }); }
    // 4c. The moor's end (highlands fix round 2: the moor trail ran to the map's west edge and walking stopped there at
    // nothing). Where the fell meets the west edge a dry-stone wall runs down it, and where the trail comes to it a field
    // gate hangs closed between two stone gateposts, the track worn on to it; beside the gate stands the fingerpost
    // (occluders(): 'The Long Road'). The wall stands where walking stops (moorEnd.feet).
    L.moorEnd = null;
    { const wEnds = L.routes.filter(rt => rt.tier !== 'plaza').map(rt => rt.points.reduce((m, p) => p.x < m.x ? p : m, rt.points[0])).filter(p => p.x < 6 * cw).sort((a, b) => a.x - b.x), e = wEnds[0];
      const rows = []; for (let y = .2; y < W.rows; y += .25) if (fellAt(.5 * cw, W.sky + y * ch)) rows.push(y);
      if (e && rows.length > 4) {
        const yTop = W.sky + rows[0] * ch, yBot = W.sky + (rows[rows.length - 1] + .25) * ch, gy = e.y + 4, hh = gardenSizePx('wall', .2), wx = 36;   // (in from the edge, where the map's own haze would hide it)
        L.moorEnd = { gate: { x: wx, y: gy }, end: e, post: { x: Math.max(wx + 26, e.x - 34), y: e.y - 20 }, feet: [] };
        for (let y = yTop; y < yBot; y += 12) L.moorEnd.feet.push({ x0: -.3, y0: (y - W.sky) / ch, x1: (wx + 6) / cw, y1: (Math.min(yBot, y + 12) - W.sky) / ch, src: "the moor's end wall" });
        add([-20, yTop - hh - 20, e.x + 30, yBot + 20], 35, (B, r0, cb) => {
          B.cx.clip(coastP, 'evenodd');
          // the track worn on from the trail's end to the gate
          if (snowRow <= 90) for (let k = 0; k <= 10; k++) { const t = k / 10, x = e.x + (wx + 14 - e.x) * t, y = e.y + (gy - 2 - e.y) * t, rr = kit.rng(3501 + k); B.f(B.blob(rr, x, y, 14 - t * 3, 6, 8, .45), kit.mix(P.peat, P.path, .5), .32).f(B.blob(rr, x - 2, y - 1, 9, 3.4, 7, .5), P.pathLo, .3); }
          // the wall, seen end on from the vale's camera: a column of courses, each stone lit on its upper left
          for (let y = Math.max(yTop, Math.floor((cb[1] - 10) / 4.2) * 4.2); y < Math.min(yBot, cb[3] + hh + 10); y += 4.2) {
            if (y > gy - 26 && y < gy + 8) continue;
            const rr = kit.rng(kit.hash(Math.round(y * 10), 7, 3503)), jx = wx + (kit.noise(y / 40, 3, 3505) - .5) * 3, h = hh * (.8 + kit.noise(y / 30, 1, 3507) * .35);
            B.f(B.ell(jx + 5, y + 1.4, 6, 2.2), '#2e3424', .25);
            for (let k = 0; k < 5; k++) { const sy = y - 2 - k * (h - 4) / 5, sw = 4 + rr() * 2.4; B.f(B.ell(jx + .8, sy + 1, sw, 2.4), '#3e3a32', .45).f(B.ell(jx, sy, sw, 2.3), ['#9c9482', '#8a8272', '#b0a892', '#7c7666'][Math.floor(rr() * 4)]).f(B.ell(jx - sw * .3, sy - .9, sw * .45, .8), '#ddd6c4', .5); }
            B.f(B.ell(jx, y - h + 1.2, 4.6, 2.2), snowRow > 90 ? P.snow : rr() < .35 ? P.moss : '#b6ae98');
            if (snowRow <= 90 && rr() < .4) B.tufts(rr, jx + 5, y + 1, 7, 4, [P.fellLo, P.bleach], 6);
          }
          // the gateposts: two tall dressed stones, and the five-barred gate hung closed between them (painted a little
          // turned, so its bars read)
          const g0 = gy - 26, g1 = gy + 8, ph = gardenSizePx('fence', 1) * 1.6;
          for (const py of [g0, g1]) { B.f(B.ell(wx + 4, py + 1.5, 7, 2.4), '#2e3424', .3); B.f(B.rr(wx - 4, py - ph, 9, ph, 2.5), '#8e8676').f(B.rr(wx - 4, py - ph, 4, ph, 2), '#bdb5a2', .8).f(B.ell(wx + .5, py - ph, 4.5, 2), '#cfc8b4'); }
          const bar = (t, k) => ({ x: wx + 2 + t * 14, y: g0 + 1 + (g1 - g0 - 2) * t - ph * (.18 + k * .15) }), wood = ['#8a7452', '#a88e66', '#6e5a3c'];
          for (let k = 0; k < 5; k++) { const a = bar(0, k), b = bar(1, k); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, wood[k % 3], 2.2, .95).s(`M${a.x} ${a.y - .9}L${b.x} ${b.y - .9}`, '#d2bc94', .7, .6); }
          { const a = bar(0, 0), b = bar(1, 4); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, wood[2], 2, .9); const c = bar(0, 0), d = bar(0, 4), e2 = bar(1, 0), f = bar(1, 4); B.s(`M${c.x} ${c.y}L${d.x} ${d.y}`, wood[2], 2.6, .95).s(`M${e2.x} ${e2.y}L${f.x} ${f.y}`, wood[2], 2.6, .95); }
          B.f(B.circ(bar(1, 2).x + 1, bar(1, 2).y, 1.3), '#3a3632', .9);   // the latch
        });
      } }
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
      // (the layout's outline is a polygon: its corners rounded first, so the shore is not faceted like a paddling pool)
      let sm = w.pts.slice(); for (let it = 0; it < 3; it++) { const o = []; for (let i = 0; i < sm.length; i++) { const a = sm[i], b = sm[(i + 1) % sm.length]; o.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 }); } sm = o; }
      const ring = kit.resample(sm.concat([sm[0]]), 7);
      add(kit.bboxOf(w.pts, 30), 61 + w.id.length, (B, r) => {
        // A natural stony shore, not a bead necklace: a damp margin that widens and narrows, then stones in
        // clusters of different sizes with gaps of turf and the odd boulder between them.
        for (let i = 0; i < ring.length; i++) { const p = ring[i], m = kit.noise(i * .21, w.id.length, 455); B.f(B.blob(r, p.x, p.y + 1, 5 + m * 9, 2.4 + m * 4, 7, .5), snowRow > 90 ? P.snowSh : m > .55 ? '#8e8670' : '#9c937c', .2 + m * .18); if (m > .4) B.f(B.blob(r, p.x, p.y, 2 + m * 4, 1.2 + m * 1.6, 6, .5), snowRow > 90 ? P.snow : '#c4bba2', .4); }
        const field = i => Math.sin(i * .37 + w.id.length) + Math.sin(i * .113 + 2.1) * .8;
        for (let i = 0; i < ring.length; i++) {
          const p = ring[i], f = field(i); if (f < -.55 || r() < .3) continue;
          const big = f > 1.15 && r() < .35, rx = big ? 6 + r() * 5 : 1.6 + r() * (f > .4 ? 4.2 : 2.6);
          if (big) B.boulder(r, p.x + (r() - .5) * 8, p.y + (r() - .5) * 4, rx, rx * .7, P, snowRow > 90);
          else B.stone(r, p.x + (r() - .5) * 10, p.y + (r() - .5) * 6, rx, rx * (.55 + r() * .25), P, snowRow > 90 ? 'snow' : r() < .5 ? P.lichen : null);
          if (f < 0 && r() < .5 && snowRow <= 90) B.tufts(r, p.x + (r() - .5) * 10, p.y - 3, 6, 3, [P.fellLo, P.bleach], 3);
        }
      });
    }
    if (L.gorge && L.gorge.line) gorgeOps(L, P, ops, add, season, snowRow > 90);
    // 7. Trails: worn earth and stone, edges ragged with turf; plazas are stony pads. With no snow lying the trails are the shared
    //    path kit's (the same picture the map's ground has beneath, laid again over the rises painted above).
    // A yard (a plaza route: the beacon's, a fold's) is the kit's gravel laid the route's own width, so it frays into the
    // turf like a trail; as a dark-ringed pad of pale blobs it read as a fried egg (art director, 19 Nov 2026).
    if (window.GardenPaintGround && snowRow < -5) { const G = GardenPaintGround; for (const o of G.paths({ routes: L.routes.filter(rt => rt.tier !== 'plaza').map(rt => { const kind = G.routeKind(rt); return { id: rt.id, kind, width: G.ROUTE_WIDTH[kind], points: rt.points }; }), season, kindAt: () => 'moor', box: { x: fellBB[0], y: fellBB[1], w: fellBB[2] - fellBB[0], h: fellBB[3] - fellBB[1] } })) ops.push(o); }
    // A top (a plaza route on the fells: the summit, a fold's yard) is worn, not laid: the turf bitten thin and trodden
    // to bare peaty ground, the bedrock breaking through it in flat lichened slabs, loose stones, moss in the hollows.
    // Its edge is the turf's own, soft and broken; a gravel pad read as a sandy blob with a ruled outline (19 Nov 2026).
    if (snowRow < -5) for (const rt of L.routes.filter(rt => rt.tier === 'plaza' && rt.points && rt.points.length)) {
      const pts = rt.points.length > 1 ? kit.resample(rt.points, 8) : rt.points, rx = Math.max(1.6, rt.width / 2) * cw * 1.05, ry = Math.max(1.6, rt.width / 2) * ch * 1.15, seed = 171 + rt.id.length * 7;
      const bb = kit.bboxOf(pts, Math.max(rx, ry) + 30), a0 = pts[0], a1 = pts[pts.length - 1];
      // how far inside the top a point is (1 at the middle line, 0 at the edge), its edge cut by noise so it is never an ellipse
      const inside = (x, y) => { const dx = a1.x - a0.x, dy = a1.y - a0.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - a0.x) * dx + (y - a0.y) * dy) / l)) : 0, ex = (x - a0.x - dx * t) / rx, ey = (y - a0.y - dy * t) / ry; return 1 - Math.hypot(ex, ey) / (.78 + kit.noise(x / 40, y / 26, seed) * .44); };
      add(bb, seed, (B, r, cb) => {
        clipFell(B);
        soft(B, cb, true, S => { for (const p of pts) { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), seed)); S.f(B.blob(rr, p.x, p.y + 4, rx * 1.05, ry * 1.05, 12, .45), P.fellLo, .32).f(B.blob(rr, p.x - 4, p.y, rx * .82, ry * .8, 12, .5), kit.mix(P.peat, P.path, .55), .34).f(B.blob(rr, p.x - 8, p.y - 3, rx * .5, ry * .46, 10, .5), P.pathLo, .22); } });
        // the bedrock: flat slabs at the surface, lit on their upper left, a dark joint on the lower right, lichen on them
        kit.tiles(cb, 46, 30, seed + 1, (tx, ty, rr) => { for (let k = 0; k < 3; k++) {
          const x = tx + rr() * 46, y = ty + rr() * 46, d = inside(x, y); if (d < .05 || kit.noise(x / 52, y / 34, seed + 2) < .4) continue;
          const w = 7 + rr() * 15 * (.5 + d), h = w * (.38 + rr() * .18), n = 5 + Math.floor(rr() * 3), pt = [];
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr() * .5; pt.push([x + Math.cos(a) * w * (.75 + rr() * .3), y + Math.sin(a) * h * (.75 + rr() * .3)]); }
          const poly = 'M' + pt.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
          B.cx.save(); B.cx.translate(1.6, 2); B.f(poly, P.rockDk, .35); B.cx.restore();
          B.f(poly, rr() < .5 ? P.rock : kit.mix(P.rock, P.rockLo, .4), 1);
          B.cx.save(); B.cx.clip(new Path2D(poly)); B.f(B.ell(x - w * .35, y - h * .45, w * .7, h * .5), P.rockHi, .55); B.cx.restore();
          if (rr() < .6) B.s(`M${x - w * .4} ${y + h * (rr() - .3) * .6}L${x + w * .5} ${y + h * (rr() - .5) * .6}`, P.rockDk, .9, .5);
          for (let j = 0; j < 2; j++) if (rr() < .55) B.f(B.blob(rr, x + (rr() - .5) * w, y + (rr() - .6) * h, 1.6 + rr() * 2.4, 1 + rr(), 6, .5), j ? P.lichen : '#e2dcb4', .7);
        } });
        // loose stones and bitten turf in the hollows between the slabs; moss cushions towards the edge
        kit.tiles(cb, 30, 16, seed + 3, (tx, ty, rr) => { for (let k = 0; k < 4; k++) { const x = tx + rr() * 30, y = ty + rr() * 30, d = inside(x, y); if (d < -.12) continue;
          if (d > .1 && rr() < .45) B.stone(rr, x, y, 1.4 + rr() * 2.6, 1 + rr() * 1.6, P);
          else if (d < .35 && rr() < .5) B.f(B.blob(rr, x, y, 3 + rr() * 4, 1.6 + rr() * 2, 7, .5), P.moss, .5);
          else if (rr() < .6) B.tufts(rr, x, y, 7, 3, [P.fellLo, P.fell, P.bleach], 4 + rr() * 3); } });
      });
    }
    for (const rt of L.routes) {
      if (window.GardenPaintGround && snowRow < -5) continue;   // (the shared path kit paints the trails and the yards when no snow lies)
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
    // (the layout's line is a few straight legs: corners rounded and a gentle wander added, so the gorge is not a canal;
    // the river's cells stay what they are, the wander is well inside a cell)
    let raw = L.gorge.line.map(p => ({ x: p[0], y: p[1] }));
    for (let it = 0; it < 3 && raw.length > 2; it++) { const o = [raw[0]]; for (let i = 0; i < raw.length - 1; i++) { const a = raw[i], b = raw[i + 1]; o.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 }); } o.push(raw[raw.length - 1]); raw = o; }
    const kit = KIT(), W = L.W, hw = L.gorge.halfWidth || .85, line0 = kit.resample(raw, .14).map(p => [p.x, p.y]), n = line0.length;
    const line = line0.map((p, i) => { const a = line0[Math.max(0, i - 1)], b = line0[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, e = Math.min(1, Math.min(i, n - 1 - i) / 12), m = (kit.noise(i * .045, 3.3, 451) - .5) * .26 * e; return [p[0] - dy / l * m, p[1] + dx / l * m]; });
    // the banks pinch and widen, never inside the layout's own water (the fell's paint has a hole there: a narrower bank showed it)
    const wid = (i, salt) => 1 + (.14 + kit.noise(i * .06, 7.7 + salt, 452) * .24 * Math.min(1, Math.max(0, Math.min(i, n - 1 - i)) / 10)) / hw;
    // banks in cell space (the cells are not square), then world px
    const nrm = line.map((p, i) => { const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
    const far = [], farIn = [], near = [], nearIn = [], mid = [];
    // s points the normal to the far (northern, upper) bank: one side for the whole river (taken point by point, a rounded
    // bend where the line turned flat swapped the banks and filled a sheet of water across the fell)
    const sAll = nrm.reduce((a, q) => a + q[1], 0) < 0 ? 1 : -1;
    line.forEach((p, i) => {
      const [nx, ny] = nrm[i], t = i / (n - 1), s = sAll;
      const depth = (.3 + t * .16) * (.75 + kit.noise(i * .09, 1.1, 453) * .5), wf = wid(i, 0), wn = wid(i, 5.3);
      far.push(L.pt([p[0] + nx * s * (hw * wf + .1), p[1] + ny * s * (hw * wf + .1)])); farIn.push(L.pt([p[0] + nx * s * hw * wf * (1 - depth * 2), p[1] + ny * s * hw * wf * (1 - depth * 2)]));
      near.push(L.pt([p[0] - nx * s * (hw * wn + .05), p[1] - ny * s * (hw * wn + .05)])); nearIn.push(L.pt([p[0] - nx * s * hw * wn * .78, p[1] - ny * s * hw * wn * .78])); mid.push(L.pt(p));
    });
    const bb = kit.bboxOf(far.concat(near), 40);
    // the ford at the stepping stones: the river runs on through the path's gap as shallows, with flat stones across
    add(bb, 141, (B, r, cb) => {
      // the young river itself (the gorge is one picture: its water, its walls): dark in the deep middle, paler at the edges, white water
      if (GORGE_WATER) {
        // The young river begins at the tarn's shore: its channel never paints a rounded spout out into the tarn.
        B.cx.save(); { const still = L.water.filter(w => !w.river && w.pts.length > 2); if (still.length) { const cut = new Path2D(); cut.rect(bb[0] - 10, bb[1] - 10, bb[2] - bb[0] + 20, bb[3] - bb[1] + 20); for (const w of still) { w.pts.forEach((p, i) => i ? cut.lineTo(p.x, p.y) : cut.moveTo(p.x, p.y)); cut.closePath(); } B.cx.clip(cut, 'evenodd'); } }
        const chan = B.poly(far.concat(near.slice().reverse()));
        B.f(chan, '#5d8fa2'); B.s(B.line(mid), '#4a7a8e', hw * W.cellH * 1.1, .8); B.s(B.line(mid.map(p => ({ x: p.x - 3, y: p.y - 2 }))), '#8fb9bf', hw * W.cellH * .35, .35);
        for (let i = 1; i < mid.length - 1; i += 2) { const rr = kit.rng(7001 + i), p = mid[i], q = near[i], t = rr(); const x = p.x + (q.x - p.x) * t * .8, y = p.y + (q.y - p.y) * t * .8; if (rr() < .55) B.s(`M${x - 5} ${y}q5 -2 10 0`, P.foam, 1.1 + rr(), .55 + rr() * .3); }
        B.cx.restore();
      }
      // the far wall: weathered rock from the lip down into the water, deeper towards the falls
      const G = { lit: '#a39886', mid: '#827868', shade: '#5c554c', deep: '#323a38', hi: '#cdc2ac', damp: '#4f6446', moss: P.moss, heather: P.heather, snow: P.snow };
      { const on = far.map((q, i) => i).filter(i => far[i].x > cb[0] - 90 && far[i].x < cb[2] + 90 && far[i].y > cb[1] - 90 && far[i].y < cb[3] + 90); if (on.length > 1) kit.rockBand(B, far, farIn, on, (i, k) => kit.rng(9001 + i * 131 + k * 17), G, { snowy, size: .7, tiers: [[.3, 1], [.72, .8]] }); }   /* (only the stretch of wall this chunk can show: the whole gorge in every chunk was the slowest op on the fells, 75 ms) */
      B.s(B.line(farIn), '#2e3a3c', 2.4, .4);   // the wet foot of the wall
      B.s(B.line(far), snowy ? P.snow : P.rockHi, 2.2, .95);
      // moss, ferns and heather along the far lip
      for (let i = 0; i < far.length; i += 2) { const p = far[i]; if (r() < .6) B.f(B.blob(r, p.x + (r() - .5) * 6, p.y - 1, 3 + r() * 4, 1.6 + r() * 1.6, 6, .5), snowy ? P.snow : r() < .5 ? P.moss : P.fellLo, .9); if (!snowy && r() < .25) for (let k = 0; k < 4; k++) B.s(`M${p.x} ${p.y + 1}q${(k - 1.5) * 2} 2 ${(k - 1.5) * 4} 6`, '#5f7a3c', 1, .85); }
      // the near lip: a lit rim with a dark undercut into the water and boulders at the edge
      // (the near lip was a pale line over a dark one, read as a road kerb: highlands fix round 2. It is broken rock now,
      // stones of every size along the edge with turf lapping over them, a dark wet undercut only where the bank is deep)
      B.s(B.line(nearIn), P.rockDk, 5, .28);
      for (let i = 0; i < near.length; i += 2) { const p = near[i], rr = kit.rng(7301 + i), big = kit.noise(i * .11, 4.4, 459) > .55; if (rr() < .25) continue; const sx = p.x + (rr() - .5) * 5, sy = p.y + (rr() - .3) * 3;
        if (big && rr() < .5) B.boulder(rr, sx, sy + 3, 9 + rr() * 8, 6 + rr() * 5, Object.assign({}, P, { rock: '#8c8578', rockLo: '#625c54', rockHi: '#bdb4a2' }), snowy); else B.stone(rr, sx, sy, 2.4 + rr() * 4.6, 1.6 + rr() * 2.2, P, snowy ? 'snow' : rr() < .4 ? P.lichen : null);
        if (!snowy && rr() < .45) B.f(B.blob(rr, p.x + (rr() - .5) * 8, p.y - 3, 5 + rr() * 6, 2 + rr() * 1.5, 7, .5), rr() < .5 ? P.fellLo : P.moss, .85); }
      // the lip stones: a line of flat-topped boulders across the river just above the drop
      { const k = Math.floor(mid.length * .86), p = mid[k], a = far[k], b = near[k];
        for (let j = 0; j < 6; j++) { const t = (j + .5) / 6, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + 2, rr = kit.rng(8801 + j);
          B.s(`M${x - 8} ${y + 3}q8 3 16 0`, P.foam, 1.4, .8); B.boulder(rr, x, y + 2, 9 + rr() * 4, 5 + rr() * 2, Object.assign({}, P, { rock: '#8c8578', rockLo: '#625c54', rockHi: '#bdb4a2' }), snowy); } void p; }
      // white water: short foam strokes in the channel, more towards the falls
      for (let i = 2; i < mid.length - 1; i++) { const t = i / mid.length, p = mid[i], q = farIn[i]; if (r() < .35 + t * .4) { const x = (p.x + q.x) / 2 + (r() - .5) * 8, y = (p.y + q.y) / 2 + 4 + (r() - .5) * 6; B.s(`M${x} ${y}q4 -1.4 8 0`, P.foam, 1.2, .75); } }
    });
    const xs = (L.D.presentation.crossings || []).filter(c => c.over === 'gorge');
    for (const c of xs) { const p = L.cpt(c.x, c.y); add([p.x - 60, p.y - 50, p.x + 60, p.y + 50], 131, (B, r) => {
      const i = mid.reduce((bi, q, k) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(mid[bi].x - p.x, mid[bi].y - p.y) ? k : bi, 0), seg = mid.slice(Math.max(0, i - 5), i + 6);
      B.s(B.line(seg), '#7fb0b8', hw * W.cellH * .7, .35); void seg;
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
      // (laid soft through soft(), not a canvas blur: a blur stopped at the chunk's edge and drew hard bands across the falls
      // top and the gorge; the shadow is longer too, so the drop below the Edge reads: highlands fix round 2)
      add(bb, seed + s0, (B, r0, cb) => {
        soft(B, cb, true, S => { S.f(B.poly(idx.map(i => ({ x: F2[i].x + 4, y: F2[i].y - 6 })).concat(idx.slice().reverse().map(i => ({ x: F2[i].x + 34, y: F2[i].y + 46 })))), '#202a1c', .3); S.f(B.poly(idx.map(i => ({ x: F2[i].x + 2, y: F2[i].y - 4 })).concat(idx.slice().reverse().map(i => ({ x: F2[i].x + 12, y: F2[i].y + 16 })))), '#1a2016', .28); });
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
        // an open end of the Edge runs out as the rock does: the face drops in a slump of boulders and scree into the turf
        // (it ended in a hard pale triangle at the beach and the pass)
        const cap = (i, dir) => { const a = L2[i], b = F2[i], hgt = Math.max(8, b.y - a.y), rr = R(i, 77 + dir);
          for (let k = 0; k < 6; k++) { const t = k / 5, x = a.x + dir * (4 + t * 22), y = a.y + hgt * (.35 + t * .5) + rr() * 3, s = (1 - t * .6) * (7 + rr() * 5); B.boulder(rr, x, y, s, s * .7, Object.assign({}, P, { rock: '#9c917e', rockLo: '#6e655a', rockHi: '#c8bea8' }), snowy); }
          for (let k = 0; k < 8; k++) B.stone(rr, a.x + dir * (6 + rr() * 30), b.y + rr() * 8 - 2, 1.4 + rr() * 2.6, 1 + rr() * 1.4, P, snowy ? 'snow' : null);
          if (!snowy) B.tufts(rr, a.x + dir * 18, b.y + 2, 18, 5, [P.fellLo, P.bleach], 6); };
        if (openStart && s0 === 0) cap(0, -1); if (openEnd && s1 === N - 1) cap(N - 1, 1);
      });
    }
    // pines along the Edge: a few wind-bent Scots pines leaning east, on the rock (occluders)
    const pines = []; for (let i = 10; i < N - 10; i += 50 + Math.floor(R(i, 5)() * 90)) { const rr = R(i, 6); if (rr() < .55 || moor(L2[i].x) > .7) continue; { const px = (L2[i].x + (F2[i].x - L2[i].x) * .3) / W.cellW, py = (L2[i].y + (F2[i].y - L2[i].y) * .55 - W.sky) / W.cellH; if ([[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1]].some(([dx, dy]) => L.plotAt(px + dx, py + dy))) continue; }   /* (never through a plot) */ pines.push({ x: L2[i].x + (F2[i].x - L2[i].x) * .3, y: L2[i].y + (F2[i].y - L2[i].y) * .55, h: Math.round(gardenSizePx('tree', rr())), seed: seed * 7 + i }); }   // (at the size standard: a mature pine is 3.5 to 5 times your height)
    add(kit.bboxOf(L2, 10), seed + 3, () => {}, { decor: true, pines });
  }

  /* ---------- the falls cave stair and the cave mouth ---------- */
  function caveMouthAt(L, at) { const c = L.cpt(at[0], at[1]); return { x: c.x + 26, y: c.y + .9 * L.W.cellH - 2 }; }
  function caveStairOps(L, P, add, at, season, snowy) {
    const kit = KIT(), c = L.cpt(at[0], at[1]), W = L.W, top = c.y - 1.5 * W.cellH, bottom = c.y + .9 * W.cellH, sx = c.x;
    add([sx - 80, top - 30, sx + 90, bottom + 30], 401, (B, r) => {
      // the cut: rock cheeks either side of the stair, the west lit and the east in shade
      B.f(B.poly([{ x: sx - 30, y: top - 4 }, { x: sx - 16, y: top - 2 }, { x: sx - 15, y: bottom }, { x: sx - 34, y: bottom + 4 }]), P.rockHi, .95);
      B.f(B.poly([{ x: sx - 34, y: top + 6 }, { x: sx - 22, y: top + 8 }, { x: sx - 22, y: bottom - 2 }, { x: sx - 36, y: bottom + 2 }]), P.rock, .8);
      B.f(B.poly([{ x: sx + 14, y: top - 2 }, { x: sx + 32, y: top - 6 }, { x: sx + 36, y: bottom + 4 }, { x: sx + 15, y: bottom }]), P.rockLo, 1);
      // dressed with weathered blocks and boulders, so the cut reads as rock like the scarp beside it, not flat slabs
      for (const [x0, x1, dark] of [[-36, -14, false], [14, 36, true]]) for (let k = 0; k < 5; k++) {
        const t = (k + .5) / 5, y = top + (bottom - top) * t + (r() - .5) * 4, x = sx + (x0 + x1) / 2 + (r() - .5) * 6, rx = 9 + r() * 4 + t * 3, ry = 6 + r() * 3 + t * 2;
        B.stone(r, x, y, rx, ry, dark ? Object.assign({}, P, { rock: P.rockLo, rockHi: P.rock }) : P, snowy ? 'snow' : r() < .5 ? P.lichen : null);
      }
      // the steps: lit treads, shaded risers, a worn hollow in the middle, wet towards the falls
      const steps = 8, sh = (bottom - top) / steps;
      for (let k = 0; k < steps; k++) { const y = top + k * sh, w = 26 + k * .6;
        B.f(B.rect(sx - w / 2, y, w, sh), P.rockLo).f(B.rect(sx - w / 2, y, w, sh * .55), snowy ? P.snow : P.rockHi).f(B.ell(sx - 1, y + sh * .3, w * .22, sh * .2), snowy ? P.snowSh : P.pathHi, .7)
          .s(`M${sx - w / 2} ${y + sh * .55}h${w}`, P.rockDk, 1, .6).f(B.rect(sx + w / 2 - 6, y, 6, sh), '#3f4a48', .35); }
      // the cave mouth in the east cheek, beside the falls: a dark arch with green light from behind the water
      const mouth = caveMouthAt(L, at), mx = mouth.x, my = mouth.y, mw = 26, mh = 30;
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
    // Terrace ribbons can meet a river. Keep their masonry and shadow on
    // the authored dry bank instead of painting a solid wall over the water.
    const dry = (L.D.freshwater || []).filter(basin => basin.boundary).map(basin => basin.boundary.map(L.pt)).filter(points => kit.meets(kit.bboxOf(points), bb)).map(points => {
      const mask = loopPath([points]); mask.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); return mask;
    });
    if (!along) { bankOps(L, P, add, t, a.map(L.pt), b.map(L.pt), bb, dry, season, snowy); return; }
    // Where a way runs through the wall, the wall stops either side of it with a squared end and the way climbs through on
    // stone steps (a solid wall was painted straight across the orchard stair's lane, and you walked through it)
    const gaps = [];
    for (const rt of L.D.routes || []) { if (!rt.points || rt.points.length < 2 || rt.tier === 'plaza') continue; const pts = (typeof gardenIslandRoutePath === 'function' ? gardenIslandRoutePath(rt).points : rt.points.map(q => ({ x: q[0], y: q[1] }))).map(q => L.cpt(q.x, q.y));
      const G0 = window.GardenPaintGround, kind = G0 && G0.routeKind ? G0.routeKind(rt) : 'earth', half = (G0 && G0.ROUTE_WIDTH ? G0.ROUTE_WIDTH[kind] || 24 : 24) / 2 + 3;
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; for (let j = 1; j < upper.length; j++) { const u = upper[j - 1], v = upper[j], d1x = q.x - p.x, d1y = q.y - p.y, d2x = v.x - u.x, d2y = v.y - u.y, den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-6) continue;
        const s = ((u.x - p.x) * d2y - (u.y - p.y) * d2x) / den, w = ((u.x - p.x) * d1y - (u.y - p.y) * d1x) / den; if (s < -.15 || s > 1.15 || w < 0 || w > 1) continue;
        gaps.push({ x: p.x + d1x * s, y: p.y + d1y * s, half, lowY: lower.reduce((m, o) => Math.abs(o.x - (p.x + d1x * s)) < Math.abs(m.x - (p.x + d1x * s)) ? o : m, lower[0]).y }); } } }
    add(bb, 500 + t.id.length * 7, (B, r, cb) => {
      // Separate clips subtract the union, including overlapping basins.
      for (const mask of dry) B.cx.clip(mask, 'evenodd');
      if (gaps.length) { const cut = new Path2D(); cut.rect(bb[0] - 10, bb[1] - 40, bb[2] - bb[0] + 20, bb[3] - bb[1] + 80); for (const g of gaps) cut.rect(g.x - g.half, bb[1] - 30, g.half * 2, bb[3] - bb[1] + 60); B.cx.clip(cut, 'evenodd'); }
      soft(B, cb, true, S => S.f(B.poly(lower.map(p => ({ x: p.x + 3, y: p.y - 3 })).concat(lower.slice().reverse().map(p => ({ x: p.x + 12, y: p.y + 16 })))), '#2e3420', .3));
      const face = B.poly(upper.concat(lower.slice().reverse()));
      B.f(face, B.lin(0, bb[1], 0, bb[3], [[0, '#9c9480'], [1, '#6e6858']]));
      B.cx.save(); B.cx.clip(new Path2D(face));
      // courses of irregular stones, a through-stone now and then
      const U = kit.resample(upper, 5), Lw = kit.resample(lower, 5), m = Math.min(U.length, Lw.length), rows = along ? 4 : 2;
      for (let row = 0; row < rows; row++) for (let i = 0; i < m; i += 1 + Math.floor(r() * 2)) {
        const t0 = (row + .5) / rows, p = { x: U[i].x + (Lw[i].x - U[i].x) * t0, y: U[i].y + (Lw[i].y - U[i].y) * t0 }, hgt = Math.abs(Lw[i].y - U[i].y) / rows, w = 4 + r() * 5;
        const tone = r(); B.f(B.blob(r, p.x + (row & 1) * 2, p.y, w, Math.max(1.6, hgt * .42), 6, .3), tone < .3 ? '#b8b09a' : tone < .7 ? '#a39b85' : '#c9c2ac', .95).f(B.ell(p.x - w * .3, p.y - hgt * .18, w * .4, Math.max(.6, hgt * .12)), '#ddd6c2', .6);
        if (r() < .04) B.f(B.rect(p.x - 2, p.y - hgt * .5, 7, hgt * .4), '#d6cfb8', .9);
      }
      // the slanted ends, where two walls butt together, get their own stones: the courses above pair the rims point by
      // point and leave a bare dark wedge at a joint (High orchard, terrace-wall-2/-3)
      for (const [u, l] of [[U[0], Lw[0]], [U[U.length - 1], Lw[Lw.length - 1]]]) for (let k = 0; k < 7; k++) { const t0 = (k + .5) / 7, x = u.x + (l.x - u.x) * t0, y = u.y + (l.y - u.y) * t0; for (const dx of [-5, 4]) { const tone = r(); B.f(B.blob(r, x + dx + (r() - .5) * 2, y, 4.5 + r() * 2, 2.6, 6, .3), tone < .3 ? '#b8b09a' : tone < .7 ? '#a39b85' : '#c9c2ac', .95).f(B.ell(x + dx - 1.5, y - .8, 1.8, .7), '#ddd6c2', .55); } }
      B.cx.restore();
      // cope: a row of upright stones on top, lit from the left; moss and turf from the terrace above
      const top = kit.resample(upper, 3.4);
      for (let i = 0; i < top.length; i += 2) { const p = top[i], h = 3.6 + r() * 2.4, w = 3.2 + r() * 2; B.f(`M${p.x - w / 2} ${p.y + 1}L${p.x - w / 2} ${p.y - h + 1.4}Q${p.x} ${p.y - h - .6} ${p.x + w / 2} ${p.y - h + 1.2}L${p.x + w / 2} ${p.y + 1}Z`, r() < .5 ? '#a39a84' : '#8f8672').f(B.rect(p.x - w / 2, p.y - h + 1.4, w * .35, h - .4), '#d6cfb8', .7).f(B.rect(p.x + w / 2 - w * .25, p.y - h + 1.6, w * .25, h - .6), '#5e574a', .5); }
      for (let i = 0; i < top.length; i += 2) { const p = top[i]; if (r() < .4) B.f(B.blob(r, p.x, p.y - 3, 3 + r() * 3, 1.2 + r(), 6, .5), snowy ? P.snow : r() < .5 ? P.moss : '#8fa860', .9); }
      if (snowy) B.s(B.line(top.map(p => ({ x: p.x, y: p.y - 4.5 }))), P.snow, 2.6, .9);
      B.s(B.line(kit.resample(lower, 6)), '#4a463a', 1.8, .45);
    });
    if (gaps.length) add(kit.bboxOf(gaps.flatMap(g => [{ x: g.x - g.half - 14, y: g.y - 30 }, { x: g.x + g.half + 14, y: g.lowY + 20 }]), 6), 520 + t.id.length * 7, (B, r) => {
      for (const g of gaps) {
        const top = g.y, low = Math.max(g.lowY, top + 8), hgt = low - top, x0 = g.x - g.half, x1 = g.x + g.half, n = Math.max(2, Math.min(4, Math.round(hgt / 6)));
        // the wall's two squared ends: big quoins laid long and short, lit on the west face
        for (const [ex, dir] of [[x0, -1], [x1, 1]]) { for (let k = 0; k < Math.ceil((hgt + 6) / 5.4); k++) { const y = low - 2 - k * 5.4, w = k % 2 ? 7 : 10; B.f(B.rect(ex + (dir < 0 ? -w : 0), y - 5, w, 5), k % 2 ? '#a89f88' : '#bdb49c').f(B.rect(ex + (dir < 0 ? -w : 0), y - 5, w, 1.3), '#ddd5c0', .7); }
          B.f(B.rect(ex + (dir < 0 ? -1.4 : 0), top - 6, 1.4, hgt + 8), dir < 0 ? '#5e584a' : '#e2dac4', .45); }
        // the steps: worn flags, each tread lit and its riser in shade, climbing from the lane below to the terrace above
        B.f(B.rect(x0, top - 4, x1 - x0, hgt + 6), '#6e6656', .55);
        for (let k = 0; k < n; k++) { const yT = top - 2 + k * (hgt + 2) / n, th = (hgt + 2) / n, inset = 1 + k * .6;
          B.f(B.rect(x0 + inset, yT, x1 - x0 - inset * 2, th * .62), k % 2 ? '#c9c0a8' : '#d3cab2').f(B.rect(x0 + inset, yT + th * .62, x1 - x0 - inset * 2, th * .38), '#7a7260', .9);
          B.f(B.ell(g.x + (r() - .5) * 4, yT + th * .3, (x1 - x0) * .22, th * .16), '#e8e0cc', .45);
          for (let c = 0; c < 2; c++) B.s(`M${x0 + inset + 3 + r() * (x1 - x0 - 10)} ${yT + .6}l${1.5 + r() * 3} ${th * .4}`, '#8a826e', .6, .5); }
        if (season !== 'winter') for (let k = 0; k < 6; k++) B.tufts(r, (r() < .5 ? x0 + 2 : x1 - 2) + (r() - .5) * 3, top + r() * hgt, 5, 3, [P.fellLo, '#9cb062'], 4);
        else B.f(B.rect(x0, top - 3, x1 - x0, 2.4), P.snow, .9);
      }
    });
  }

  // A terrace wall that runs north and south faces west or east, so from this camera it is seen almost edge on. It was
  // painted as a wall face laid flat: a long pale strip of stone lozenges in columns, square-ended, that read as a
  // causeway (art director, 19 Nov 2026). It is a turf bank now, falling to its low side (the side away from its
  // region's middle), lit when it faces the sun, with a low dry-stone foot along the bottom of the slope, turf over the
  // top and the stones thinning out towards both ends, so two banks that meet run on as one.
  function bankOps(L, P, add, t, sideA, sideB, bb, dry, season, snowy) {
    const kit = KIT(), form = (L.D.landforms || []).find(f => f.id === t.id), reg = form && (L.D.regions || []).find(rg => rg.id === form.region);
    const mid = reg && reg.polygons && reg.polygons.length ? L.pt(reg.polygons.flat().reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map(v => v / reg.polygons.flat().length)) : { x: (bb[0] + bb[2]) / 2, y: (bb[1] + bb[3]) / 2 };
    const avg = side => side.reduce((s, p) => ({ x: s.x + p.x / side.length, y: s.y + p.y / side.length }), { x: 0, y: 0 });
    const da = avg(sideA), db = avg(sideB), aLow = Math.hypot(da.x - mid.x, da.y - mid.y) > Math.hypot(db.x - mid.x, db.y - mid.y);
    const low = aLow ? sideA : sideB, high = aLow ? sideB : sideA, sunward = (aLow ? da.x < db.x : db.x < da.x);   // (the sun is upper left: a bank falling west faces it)
    const face = high.concat(low.slice().reverse()), G = window.GardenPaintGround;
    add(bb, 500 + t.id.length * 7, (B, r) => {
      for (const mask of dry) B.cx.clip(mask, 'evenodd');
      const facePath = new Path2D(B.poly(face));
      B.cx.save(); B.cx.clip(facePath);
      if (G && !snowy) G.paintKind(B.cx, 'meadow', bb, season); else B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), snowy ? P.snow : P.fell);
      // the slope's light: warmer and paler down a sunward bank, a cool shade down one turned away, nothing at the top
      const hm = avg(high), lm = avg(low), g = B.lin(hm.x, hm.y, lm.x, lm.y, sunward ? [[0, 'rgba(255,240,190,0)'], [.75, 'rgba(255,236,178,.2)'], [1, 'rgba(255,232,170,.12)']] : [[0, 'rgba(40,52,30,0)'], [.8, 'rgba(40,52,30,.2)'], [1, 'rgba(40,52,30,.12)']]);
      B.f(B.poly(face), g);
      // grass on the slope combed downhill
      const H = kit.resample(high, 6), Lw = kit.resample(low, 6), m = Math.min(H.length, Lw.length);
      for (let i = 0; i < m; i++) for (let k = 0; k < 2; k++) { const s = .2 + r() * .6, x = H[i].x + (Lw[i].x - H[i].x) * s + (r() - .5) * 5, y = H[i].y + (Lw[i].y - H[i].y) * s + (r() - .5) * 5, dx = (Lw[i].x - H[i].x) * .06; B.s(`M${x} ${y}q${dx * .5} ${-2} ${dx + (r() - .5) * 2} ${-3.5 - r() * 2.5}`, r() < .5 ? P.fellLo : '#a8b86a', .9, .55); }
      B.cx.restore();
      // the dry-stone foot along the bottom of the slope: a dark seam, then two courses of rounded stones lit on the upper
      // left, the run thinning to nothing over the last fifth at each end
      const foot = kit.resample(low, 4.2), n = foot.length, P2 = { rock: '#b4ab95', rockLo: '#8e8672', rockHi: '#d8d0ba', rockDk: '#4a463a' };
      for (let i = 1; i < n; i++) { const e = Math.min(i, n - 1 - i) / Math.max(1, n * .2); if (e < 1 && r() > e) continue; const p = foot[i], q = foot[i - 1]; B.s(`M${q.x} ${q.y + 2.2}L${p.x} ${p.y + 2.2}`, '#3a3a2c', 2.4, .32 * Math.min(1, e)); }
      for (let i = 0; i < n; i++) { const e = Math.min(i, n - 1 - i) / Math.max(1, n * .2); if (e < 1 && r() > e * e) continue; const p = foot[i];
        for (let row = 0; row < 2; row++) { if (row && r() < .35) continue; const ox = (r() - .5) * 2, oy = row ? -3.4 : 0, rx = 2.6 + r() * 2.2, ry = 1.7 + r() * 1; B.stone(r, p.x + ox, p.y + oy, rx, ry, P2, snowy ? 'snow' : r() < .2 ? '#a8b45a' : null); } }
      // turf lips over the top of the foot and tufts at its base, so the stones sit in the bank
      for (let i = 0; i < n; i += 2) { const e = Math.min(i, n - 1 - i) / Math.max(1, n * .2); if (e < 1 && r() > e) continue; const p = foot[i]; if (r() < .5) B.tufts(r, p.x + (r() - .5) * 4, p.y - 4, 7, 3, [P.fellLo, '#9cb062'], 4); if (r() < .4) B.tufts(r, p.x + (r() - .5) * 4, p.y + 4, 6, 3, [P.fellLo, P.bleach], 3); }
    });
  }

  /* ---------- occluders: the peaks and the Edge's pines ---------- */
  // A peak seen from the vale's 3/4 camera, standing on its layout footprint (anchor: the middle of its front foot).
  // (19 Nov 2026, highlands round 1: the old peak was a flat cone, a lit half and a shaded half with stones dotted on
  // it.) Now a real landform: a height field over the footprint (a dome roughened by ridged noise into spurs, ribs and
  // gullies, with the summit drawn up on the Horn), seen from the camera row by row from the front, each point shaded
  // by the world's one light from the upper left. What a point is painted as comes from its height and steepness: turf
  // and heather on the low gentle ground, scree and bare rock where it is steep or high, broken strata across the
  // crags, a crease darker in every hollow, and snow above the season's snow line wherever it can lie. The height field
  // is rendered once into a small picture (cached, so a sharper repaint is the same picture); crisp work goes on top:
  // the lit and shaded rim of the skyline, boulders and heather round the foot.
  const PEAK_FIELDS = new Map();
  function peakField(w, d, H, snowShare, P, seed, sharp, foot, x0, y0, cw, chh) {
    const key = [seed, w, d, H, snowShare, P.fell].join('|'); if (PEAK_FIELDS.has(key)) return PEAK_FIELDS.get(key);
    const kit = KIT(), sd = seed % 997, ST = .8;   // (a sample every 1.25 world px smeared the flanks into streaks close up: highlands fix round 1)
    const hexA = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const COL = { grass: hexA(kit.mix(P.fell, '#9aa466', .3)), grassHi: hexA(P.fellHi), heath: hexA(kit.mix(P.heather, P.fell, .3)), scree: hexA('#bdb29c'), rock: hexA('#a89c8a'), snow: hexA(P.snow), snowSh: hexA(P.snowSh) };
    const fb = kit.bboxOf(foot || [{ x: -w / 2, y: -d }, { x: w / 2, y: 0 }]), cxF = (fb[0] + fb[2]) / 2, cyF = (fb[1] + fb[3]) / 2, rx = (fb[2] - fb[0]) / 2 * .98, ry = (fb[3] - fb[1]) / 2 * 1.02;
    const tops = sharp ? [[cxF - w * .07, cyF - d * .12, w * .15, d * .2, .5]] : [[cxF - w * .14, cyF - d * .08, w * .17, d * .22, .26], [cxF + w * .12, cyF - d * .14, w * .15, d * .2, .3]];
    // the grid of heights, in ground px
    const gx0 = fb[0] - 30, gx1 = fb[2] + 30, gy0 = fb[1] - 14, gy1 = fb[3] + 16, NX = Math.ceil((gx1 - gx0) / ST) + 1, NY = Math.ceil((gy1 - gy0) / ST) + 1;
    const h = new Float32Array(NX * NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x = gx0 + i * ST, y = gy0 + j * ST;
      let u = ((x - cxF) / rx) ** 2 + ((y - cyF) / ry) ** 2; u *= 1 + (kit.noise(x / 70, y / 40, sd) - .5) * .26;
      const edge = Math.min(i, NX - 1 - i, j, NY - 1 - j) / 6, dome = Math.max(0, 1 - u) * Math.min(1, edge); if (dome <= 0) continue;
      const n1 = kit.noise(x / 64, y / 34, sd + 3), n2 = kit.noise(x / 26, y / 15, sd + 5), n3 = kit.noise(x / 11, y / 7, sd + 7);
      const ridged = 1 - Math.abs(n1 * 2 - 1), rib = 1 - Math.abs(n2 * 2 - 1);
      // (highlands fix round 2: the dome read as one smooth cone. Spurs now run down from the summit, each a ridge with a
      // gully either side, they split as they fall; crags step the high ground in bands; knolls stand out at the foot.)
      const ex = (x - tops[0][0]) / rx, ey = (y - tops[0][1]) / ry, rad = Math.min(1.2, Math.hypot(ex, ey)), th = Math.atan2(ey, ex);
      const sp = kit.noise(th * 2.6 + 9, rad * 1.4, sd + 21), sp2 = kit.noise(th * 5.2 + 3, rad * 2.2, sd + 23), spur = Math.pow(1 - Math.abs(sp * 2 - 1), 1.6) * .7 + Math.pow(1 - Math.abs(sp2 * 2 - 1), 2) * .3;
      let z = Math.pow(dome, 1.15) * (.5 + ridged * .2 + rib * .1 + n3 * .05) * (sharp ? .72 : .86);
      z *= .7 + spur * .5 * Math.min(1, rad * 1.6);
      for (const [tx, ty, sx, sy, a] of tops) z += a * Math.exp(-((x - tx) ** 2 / (2 * sx * sx) + (y - ty) ** 2 / (2 * sy * sy))) * Math.pow(dome, .4);
      // crag bands: the high ground stepped in tiers of rock (a little of a terrace, so the faces between steepen into crags)
      { const hi = Math.max(0, Math.min(1, (z - .3) / .3)), q = z * 7 + kit.noise(x / 40, y / 22, sd + 25) * .8, st = (Math.floor(q) + Math.pow(q - Math.floor(q), 3)) / 7; z += (st - z) * .45 * hi; }
      // knolls and foothills round the foot
      for (let k = 0; k < 5; k++) { const a = Math.PI * (.12 + k * .19) + (kit.hash(k, sd, 27) % 100) / 400, kx = cxF + Math.cos(a) * rx * .78, ky = cyF + Math.sin(a) * ry * .62, ks = (w * (.07 + (kit.hash(k, sd, 29) % 60) / 1000)); z += (.1 + (kit.hash(k, sd, 31) % 80) / 1000) * Math.exp(-((x - kx) ** 2 + ((y - ky) * 1.6) ** 2) / (2 * ks * ks)) * Math.min(1, edge); }
      h[j * NX + i] = z * H;
    }
    // the picture: per column, walk from the front row to the back, painting each point up to the lowest skyline so far
    const PW = Math.ceil(cw / ST), PH = Math.ceil(chh / ST), cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
    const cx = cv.getContext('2d'), img = cx.createImageData(PW, PH), px = img.data, sky = new Float32Array(PW).fill(Infinity), top = new Float32Array(PW).fill(Infinity), cls = new Uint8Array(NX * NY);
    const RS = .55, L = [-.6, -.42, .68], snowLine = H * (1.02 - snowShare * 1.15);
    for (let i = 1; i < NX - 1; i++) {
      const col = Math.round((gx0 + i * ST - x0) / ST); if (col < 0 || col >= PW) continue;
      let ymin = Math.min(PH, (gy0 + (NY - 1) * ST - y0) / ST), drawn = false, zc = 0, yHi = Infinity;
      for (let j = NY - 2; j >= 1; j--) {
        const z = h[j * NX + i], sy = (gy0 + j * ST - z - y0) / ST; if (z <= .3) { ymin = Math.min(ymin, sy); continue; } if (sy >= ymin) continue;
        const dzx = (h[j * NX + i + 1] - h[j * NX + i - 1]) / (2 * ST) * RS, dzy = (h[(j + 1) * NX + i] - h[(j - 1) * NX + i]) / (2 * ST * 1.6) * RS;
        const nl = Math.hypot(dzx, dzy, 1), lam = Math.max(0, (-dzx * L[0] - dzy * L[1] + L[2]) / nl), slope = Math.hypot(dzx, dzy) / RS;
        const lap = h[j * NX + i - 1] + h[j * NX + i + 1] + h[(j - 1) * NX + i] + h[(j + 1) * NX + i] - 4 * z;
        const x = gx0 + i * ST, y = gy0 + j * ST, nz = kit.noise(x / 18, y / 11, sd + 11), t = z / H;
        const steep = Math.max(0, Math.min(1, (slope - 1.7 - nz * .8) / 1.2)), high = Math.max(0, Math.min(1, (t - .52 - nz * .14) / .25));
        const heathy = t < .22 && kit.noise(x / 40, y / 24, sd + 13) > .7;
        const c0 = heathy ? COL.heath : t < .2 && kit.noise(x / 30, y / 18, sd + 17) > .6 ? COL.grassHi : COL.grass;
        // (higher up the turf thins and greys towards scree, so a flank reads as mountain, not a green hill)
        const thin = Math.max(0, Math.min(1, (t - .28 - nz * .1) / .32)) * .55, c = [c0[0] + (COL.scree[0] - c0[0]) * thin, c0[1] + (COL.scree[1] - c0[1]) * thin, c0[2] + (COL.scree[2] - c0[2]) * thin];
        const rockMix = Math.min(1, steep * .9 + high * .55), stone = steep > .6 ? COL.rock : COL.scree;
        let rr = c[0] + (stone[0] - c[0]) * rockMix, gg = c[1] + (stone[1] - c[1]) * rockMix, bb = c[2] + (stone[2] - c[2]) * rockMix;
        // strata on the crags
        if (steep > .4) { const f = (z / 34 + kit.noise(x / 60, y / 36, sd + 19) * 1.3) % 1, sm = f < .5 ? f / .5 : (1 - f) / .5; const v = .9 + sm * .16; rr *= v; gg *= v; bb *= v; }
        // snow where it can lie
        const snowy = snowShare > 0 && z > snowLine - nz * H * .12 - Math.max(0, lap) * 3 && slope < 2.4 + snowShare * 3 - nz;
        if (snowy) { const s = lam > .62 ? COL.snow : COL.snowSh; rr = s[0]; gg = s[1]; bb = s[2]; }
        // light: lit faces warm, shaded faces cool, creases darker
        const k = .68 + lam * .4, crease = Math.max(0, Math.min(.2, -lap * .03));
        rr = rr * k * (1 - crease) + (lam > .6 ? 5 : -3); gg = gg * k * (1 - crease) + (lam > .6 ? 3 : -2); bb = bb * k * (1 - crease) + (lam > .6 ? -3 : 4);
        const yTop = Math.max(0, Math.floor(sy)), yBot = Math.min(PH, Math.ceil(ymin));
        for (let yy = yTop; yy < yBot; yy++) { const o = (yy * PW + col) * 4; px[o] = rr; px[o + 1] = gg; px[o + 2] = bb; px[o + 3] = 255; }
        // what this visible point is, for the crisp brushwork laid over the picture (1 turf, 2 heather, 3 scree, 4 crag, 5 snow)
        if (yBot > yTop) cls[j * NX + i] = snowy ? 5 : steep > .55 ? 4 : rockMix > .4 || thin > .3 ? 3 : heathy ? 2 : 1;
        ymin = sy; drawn = true; if (z > zc) zc = z; if (z > 18) yHi = sy;   // (yHi: the top of what stands higher than your knees in this column, for the fade)
      }
      if (drawn && isFinite(yHi)) top[col] = yHi;
      if (drawn && zc > Math.max(6, H * .16)) sky[col] = ymin;   // (a column only a little mountain high has no rim either: where the flank met the moor its rim ran on out over the grass as a dotted line)   // (a column with hardly any mountain in it drew its rim as a dotted line along the back of the grid)   // (a column with no mountain in it has no skyline: its rim drew a line across the moor)
    }
    // fill single-column gaps the sampling left
    for (let yy = 0; yy < PH; yy++) for (let col = 1; col < PW - 1; col++) { const o = (yy * PW + col) * 4; if (px[o + 3] === 0 && px[o - 1] === 255 && px[o + 7] === 255) for (let q = 0; q < 4; q++) px[o + q] = (px[o - 4 + q] + px[o + 4 + q]) >> 1; }
    cx.putImageData(img, 0, 0);
    // a breath of blur, so the long spans of a steep face do not read as stripes
    const cv2 = document.createElement('canvas'); cv2.width = PW; cv2.height = PH; const c2 = cv2.getContext('2d'); c2.filter = 'blur(1.25px)'; c2.drawImage(cv, 0, 0); c2.filter = 'none'; c2.globalAlpha = .3;   /* (more of the blur: the field's rows showed as stair-steps where one ground met another) */ c2.drawImage(cv, 0, 0); c2.globalAlpha = 1;
    const out = { cv: cv2, ST, sky, top, cls, PW, PH, h, NX, NY, gx0, gy0 };
    PEAK_FIELDS.set(key, out); if (PEAK_FIELDS.size > 8) PEAK_FIELDS.delete(PEAK_FIELDS.keys().next().value);
    return out;
  }
  function peakArt(B, w, d, H, snowShare, P, seed, sharp, foot, box) {
    const kit = KIT(), r = kit.rng(seed), cx = B.cx;
    const x0 = box[0], y0 = box[1], cw = box[2] - box[0], chh = box[3] - box[1];
    const F = peakField(w, d, H, snowShare, P, seed, sharp, foot, x0, y0, cw, chh);
    B.shadow(w * .16, 2, w * .62, 16, .34);
    cx.save(); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(F.cv, x0, y0, F.PW * F.ST, F.PH * F.ST); cx.restore();
    // the skyline's rim: lit where it climbs from the west, a dark edge where it falls away east
    // (each run of the rim is one stroke, lit and shaded runs apart: a stroke for every pair of columns drew a dotted line)
    const rim = []; for (let c = 0; c < F.PW; c += 3) if (isFinite(F.sky[c]) && F.sky[c] < F.PH - 2) rim.push({ x: x0 + c * F.ST, y: y0 + F.sky[c] * F.ST });
    { let run = [], up0 = null; const flush = () => { if (run.length > 2) B.s(B.line(run), up0 ? (snowShare > .2 ? '#fbfbf6' : '#efe3c6') : '#4a4450', up0 ? 1.5 : 1, up0 ? .6 : .22); run = []; };
      for (let i = 1; i < rim.length; i++) { const a = rim[i - 1], b = rim[i]; if (Math.abs(b.y - a.y) > 24 || b.x - a.x > F.ST * 4 || Math.abs(b.y - a.y) < .25) { flush(); up0 = null; continue; }   /* (a level run of rim is the field running out along its back, not a skyline: it drew a line out over the grass) */ const up = b.y < a.y - .2; if (up !== up0) { flush(); up0 = up; run.push(a); } run.push(b); }
      flush(); }
    // crisp brushwork over the soft picture, from what each visible point of the field is: courses and joints on the crags,
    // stones on the scree, tufts and sprigs on the turf and heather, so a flank close up is rock and turf, not a smear
    // (sparse and low in contrast: at one mark in 26 points the scree read as a rash of dots from afar, and a sharper
    // repaint of the Horn took 124 ms)
    // (the marks are gathered once per peak into a few paths by colour, and the picture strokes and fills those: drawn mark by
    // mark, painting a peak again close up took 84 ms)
    if (!F.marks) { const rr = kit.rng(seed + 77), N = F.NX * F.NY, n = Math.min(1600, Math.round(N / 110)), M = new Map(), g = (kind, col, wd, a) => { const k = kind + '|' + col + '|' + wd + '|' + a; let o = M.get(k); if (!o) M.set(k, o = { kind, col, wd, a, p: new Path2D() }); return o.p; };
      const turf = [kit.mix(P.fellLo, '#6e7a40', .3), kit.mix(P.fellHi, '#d8d2a0', .2)], heath = [P.heatherLo, P.heatherHi || P.heather], el = (pp, x, y, rx, ry) => { pp.moveTo(x + rx, y); pp.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
      for (let k = 0; k < n; k++) { const q = Math.floor(rr() * N), c = F.cls[q]; if (!c) continue; const i = q % F.NX, j = (q / F.NX) | 0, z = F.h[q];
        const X = F.gx0 + i * F.ST, Y = F.gy0 + j * F.ST - z, s = .7 + rr() * .7, t = rr();
        if (c === 4) { const w = 2.4 + rr() * 3.4, hh = 1.6 + rr() * 2.2; el(g('f', '#4a443c', 0, .3), X + w * .25, Y + hh * .35, w, hh); el(g('f', t < .5 ? '#a89e8c' : '#9a9080', 0, .55), X, Y, w * .9, hh * .85); el(g('f', '#ddd4c0', 0, .45), X - w * .3, Y - hh * .35, w * .45, hh * .3); }   // a block of the crag, lit on its upper left
        else if (c === 3) { if (rr() < .5) continue; if (t < .6) { const pp = g('s', t < .3 ? '#8a8070' : '#cfc6b0', .9, .32); pp.moveTo(X - 2.4 * s, Y + .4); pp.quadraticCurveTo(X, Y - .5, X + 2.4 * s, Y + .4 + (rr() - .5) * .8); } else { el(g('f', '#5e564c', 0, .22), X + .4, Y + .5, 1.3 * s, .6 * s); el(g('f', '#c4baa4', 0, .32), X, Y, 1.2 * s, .55 * s); } }   // a scree runnel or a loose stone
        else if (c === 5) { if (t < .4) { const pp = g('s', P.snowSh, .9, .55); pp.moveTo(X - 3, Y); pp.quadraticCurveTo(X, Y - .8, X + 3, Y); } }
        else { const pp = g('s', c === 2 ? heath[t < .5 ? 0 : 1] : turf[t < .55 ? 0 : 1], .8, .55); for (let b = 0; b < 3; b++) { pp.moveTo(X + (b - 1) * 1.3, Y); pp.lineTo(X + (b - 1) * 1.3 + (b - 1) * .9 + (rr() - .5) * .6, Y - (2 + rr() * 2.2) * s); } }
      }
      F.marks = [...M.values()]; }
    cx.save(); cx.lineCap = 'round'; for (const m of F.marks) { cx.globalAlpha = m.a; if (m.kind === 'f') { cx.fillStyle = m.col; cx.fill(m.p); } else { cx.strokeStyle = m.col; cx.lineWidth = m.wd; cx.stroke(m.p); } } cx.restore();
    // the foot: fell and heather lapping up in soft lobes, boulders fallen out on to the moor
    const Ks = Math.abs(cx.getTransform().a) || 1, fb = kit.bboxOf(foot || [{ x: -w / 2, y: -d }, { x: w / 2, y: 0 }]);
    const ring = []; for (let k = 0; k <= 40; k++) { const a = Math.PI * k / 40; ring.push({ x: (fb[0] + fb[2]) / 2 - Math.cos(a) * (fb[2] - fb[0]) / 2 * 1.02, y: (fb[1] + fb[3]) / 2 + Math.sin(a) * (fb[3] - fb[1]) / 2 * 1.04 }); }
    const skirtCol = snowShare > .7 ? P.snow : kit.mix(P.fell, '#7a8450', .4), skirtLo = snowShare > .7 ? P.snowSh : kit.mix(P.fellLo, '#4e5a3a', .4);
    // (the skirt is laid soft on a canvas at a third of the resolution and stretched over the foot: a canvas blur at the
    // sprite's own level took seconds when the sharpener painted a peak again at a close zoom; this is the same picture
    // at every level for a few milliseconds)
    const sk = [fb[0] - 50, fb[1] - 30, fb[2] + 50, fb[3] + 30], SQ = 1.5, sw = Math.ceil((sk[2] - sk[0]) / SQ), sh = Math.ceil((sk[3] - sk[1]) / SQ);
    const sc = document.createElement('canvas'); sc.width = sw; sc.height = sh; const sx = sc.getContext('2d'); sx.setTransform(1 / SQ, 0, 0, 1 / SQ, -sk[0] / SQ, -sk[1] / SQ);
    const sf = (d, col, a) => { sx.globalAlpha = a; sx.fillStyle = col; sx.fill(typeof d === 'string' ? new Path2D(d) : d); };
    // (fewer, broader, fainter lobes: a ring of pale ovals round the foot read as a dotted line: highlands fix round 2)
    for (let i = 0; i < ring.length; i += 4) { const p = ring[i], rx = 22 + r() * 22, ry = 7 + r() * 6; sf(B.blob(r, p.x + 3, p.y + 2, rx, ry, 9, .5), skirtLo, .3); sf(B.blob(r, p.x, p.y - 3 - r() * 4, rx * .9, ry, 9, .5), skirtCol, .38); }
    const sc2 = document.createElement('canvas'); sc2.width = sw; sc2.height = sh; const s2 = sc2.getContext('2d'); s2.filter = 'blur(.9px)'; s2.drawImage(sc, 0, 0); s2.filter = 'none';
    cx.save(); cx.globalAlpha = 1; cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(sc2, sk[0], sk[1], sw * SQ, sh * SQ); cx.restore(); void Ks;
    for (let i = 0; i < ring.length; i += 2) { const p = ring[i]; if (r() < .4) continue; if (snowShare > .7) B.f(B.blob(r, p.x, p.y - r() * 6, 5 + r() * 6, 1.6 + r() * 2, 6, .5), P.snowSh, .6); else B.heather(r, p.x + (r() - .5) * 8, p.y - r() * 8, 5 + r() * 5, Object.assign({}, P, { heather: kit.mix(P.heather, P.fell, .3), heatherLo: kit.mix(P.heatherLo, P.fellLo, .4) }), P.bloom && r() < .4 ? P.bloom : null); }
    for (let k = 0; k < 7; k++) { const p = ring[Math.floor(r() * ring.length)]; B.boulder(r, p.x + (r() - .5) * 24, p.y + 4 + r() * 10, 8 + r() * 12, 6 + r() * 7, P, snowShare > .7); }
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
  // A sheepfold's wall, one arc of it (the back or the front), standing: courses of rounded field stones laid dry, each
  // lit on its upper left, a turf-and-lichen cope on top, the face turned from the sun in shade; drawn relative to the
  // sprite's anchor (ax, ay). The back arc carries the hurdle (the gateway is on its side), hung open from the gateway's end.
  function foldWallArt(B, fw, front, P, ax, ay) {
    const kit = KIT(), r = kit.rng(fw.fs * 13 + (front ? 7 : 3)), hh = gardenSizePx('wall', .15), sn = fw.sn;
    const pts = fw.ring.map(p => p && (front ? Math.sin(p.a) >= -.05 : Math.sin(p.a) <= .05) ? p : null);
    const tones = ['#9c9482', '#8a8272', '#b0a892', '#7c7666', '#a39a86'];
    // back to front: the far end of the arc first
    const list = pts.filter(Boolean).sort((a, b) => a.y - b.y);
    for (const p of list) {
      const x = p.x - ax, y = p.y - ay, lit = Math.cos(p.a) < -.2 ? 1 : Math.cos(p.a) > .3 ? -1 : 0, hgt = hh * (.82 + kit.noise(p.a * 3, fw.fs, 433) * .3);
      const rows = 5;
      for (let k = 0; k < rows; k++) { const sy = y - 2 - k * (hgt - 4) / rows, sw = 3.6 + r() * 2.6, col = tones[Math.floor(r() * tones.length)];
        B.f(B.ell(x + .8, sy + 1, sw, 2.6), '#3e3a32', .5).f(B.ell(x, sy, sw, 2.5), lit < 0 ? kit.mix(col, '#4a463c', .3) : col).f(B.ell(x - sw * .3, sy - 1, sw * .45, .9), lit > 0 ? '#e2dccc' : '#cfc8b6', lit < 0 ? .3 : .55); }
      // the cope: stones on edge, turf and lichen caught on top
      B.f(B.ell(x, y - hgt + 1.5, 3.4, 2.2), sn ? P.snow : r() < .3 ? P.moss : '#b6ae98').f(B.ell(x - 1, y - hgt + .6, 1.6, .8), sn ? '#ffffff' : '#ddd6c4', .7);
    }
    // grass and nettles grown up the foot, and a few fallen stones
    if (!sn) for (const p of list) { if (r() < .55) continue; B.tufts(r, p.x - ax, p.y - ay + 1, 8, 4, [P.fellLo, '#7e8c4a', P.bleach], 6); }
    if (!front && fw.hinge) {
      // the hurdle: a wattle panel of hazel woven through upright sails, hung open outward from the gateway's end, its foot on the turf
      const hx = fw.hinge.x - ax, hy = fw.hinge.y - ay, dx = Math.cos(fw.gapA - 1.25) * 30, dy = Math.sin(fw.gapA - 1.25) * 16, ht = hh * .8;
      B.f(B.poly([{ x: hx, y: hy + 1 }, { x: hx + dx, y: hy + dy + 1 }, { x: hx + dx + 10, y: hy + dy + 5 }, { x: hx + 10, y: hy + 5 }]), '#2e3420', .22);
      for (let k = 0; k <= 5; k++) { const t = k / 5, x = hx + dx * t, y = hy + dy * t; B.s(`M${x} ${y + 1}L${x + .4} ${y - ht}`, '#5e4a30', 1.6, .95); }
      for (let k = 0; k < 6; k++) { const yy = -ht * (.12 + k * .15); B.s(`M${hx} ${hy + yy}Q${hx + dx * .5} ${hy + dy * .5 + yy + (k & 1 ? 1.4 : -1.4)} ${hx + dx} ${hy + dy + yy}`, k & 1 ? '#8a6e46' : '#a0845a', 1.4, .92); }
      B.s(`M${hx} ${hy + 1}L${hx} ${hy - ht - 2}`, '#4a3a26', 2.6, 1);   // its hanging post against the wall's end
    }
  }
  // The fingerpost at the moor's end: an oak post grey with weather, its foot in a cairn of field stones, one arm
  // pointing west over the wall reading 'The Long Road' (its distance worn off), a shorter one back east to the tarn.
  function fingerpostArt(B, ph, P, snowy) {
    const kit = KIT(), r = kit.rng(3611);
    for (let k = 0; k < 6; k++) B.stone(r, (r() - .5) * 12, 1 - r() * 3, 3 + r() * 2.6, 2 + r() * 1.4, P, snowy ? 'snow' : r() < .4 ? P.lichen : null);
    B.f(B.rect(-2.4, -ph, 4.8, ph), '#6e6458').f(B.rect(-2.4, -ph, 1.8, ph), '#a49a88', .8).f(B.rect(1, -ph, 1.4, ph), '#4a4238', .6);
    for (let k = 0; k < 4; k++) B.s(`M${-1.6 + r() * 3} ${-ph * (.2 + r() * .7)}l0 ${4 + r() * 6}`, '#4e463c', .6, .6);
    B.f(B.ell(0, -ph, 3, 1.6), '#8a8070');
    const arm = (y, dir, len, txt) => { const x0 = dir < 0 ? -len : 2, w = len - 2;
      B.f(B.poly([{ x: x0, y: y - 4.5 }, { x: x0 + w, y: y - 4.5 }, { x: x0 + w + (dir > 0 ? 6 : 0), y }, { x: x0 + w, y: y + 4.5 }, { x: x0, y: y + 4.5 }, { x: x0 - (dir < 0 ? 6 : 0), y }]), '#7e6a4e').f(B.rect(x0, y - 4.5, w, 2), '#a8916c', .8).s(B.line([{ x: x0, y: y + 4.4 }, { x: x0 + w, y: y + 4.4 }]), '#3e3226', .9, .7);
      const cx = B.cx; cx.save(); cx.font = '700 6.4px Georgia, serif'; cx.fillStyle = '#2a2016'; cx.textBaseline = 'middle'; cx.textAlign = 'center'; cx.fillText(txt, x0 + w / 2, y + .4); cx.restore(); };
    arm(-ph + 8, -1, 62, 'The Long Road'); arm(-ph + 20, 1, 30, 'Tarn');
    if (snowy) B.f(B.ell(0, -ph - .6, 3.4, 1.4), P.snow);
    else B.tufts(r, 0, 2, 14, 6, [P.fellLo, P.bleach, '#8a8a52'], 7);
  }
  // a rowan: a slender grey trunk forking low, a light feathery crown of small leaf masses lit on the upper left;
  // autumn turns it red, winter leaves bare forks and berries. Drawn to its height (a young tree, 2 to 2.5 H).
  function rowanArt(B, h, P, seed, season) {
    const kit = KIT(), r = kit.rng(seed), s = h / 90, leaf = { spring: ['#4a7034', '#6e9a4c', '#9cc06c', '#c4dc94'], summer: ['#3c6230', '#5a8640', '#82aa58', '#b0cc7c'], autumn: ['#82301e', '#b84a26', '#de7a34', '#f0aa5a'], winter: null }[season];
    const tw = 4 * s, lean = (r() - .5) * 6 * s;   // (a trunk a hand wide: at 2.6 the crown sat on a thin stick)
    B.s(`M0 0Q${-1.5 * s} ${-h * .22} ${lean * .4} ${-h * .42}`, '#6e6a62', tw * 1.5).s(`M${-tw * .4} 0Q${-2 * s} ${-h * .22} ${lean * .4 - tw * .3} ${-h * .42}`, '#c2beb2', tw * .5, .75);
    // (the forks spread wide and the leaf hangs round them in an open oval: close forks and stacked masses read as a poplar)
    const forks = []; for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * .6 + (r() - .5) * .2, l = h * (.34 + r() * .14); forks.push([lean * .4, -h * .38, lean * .4 + Math.cos(a) * l * 1.05, -h * .38 + Math.sin(a) * l * .9]); }
    for (const [x0, y0, x1, y1] of forks) B.s(`M${x0} ${y0}Q${(x0 + x1) / 2 + 2 * s} ${(y0 + y1) / 2} ${x1} ${y1}`, '#7a766c', tw * .75);
    if (leaf) {
      const cyc = -h * .64, masses = []; for (let k = 0; k < 24; k++) { const f = forks[k % forks.length], t = .35 + r() * .7, mx = f[0] + (f[2] - f[0]) * t + (r() - .5) * 22 * s, my = f[1] + (f[3] - f[1]) * t + (r() - .5) * 12 * s; masses.push({ x: mx, y: my + (cyc - my) * .25, rx: (12 + r() * 8) * s * (1 - Math.abs(my - cyc) / h * .5) }); }
      masses.sort((a, b) => a.y - b.y);
      for (const m of masses) B.f(B.blob(r, m.x + 2 * s, m.y + 3 * s, m.rx * 1.05, m.rx * .84, 9, .55), leaf[0], .95);   // (rounder masses: flat they read as pads)
      for (const m of masses) { B.f(B.blob(r, m.x, m.y, m.rx * .9, m.rx * .72, 9, .55), m.x < lean ? leaf[2] : leaf[1]); B.f(B.blob(r, m.x - m.rx * .3, m.y - m.rx * .25, m.rx * .42, m.rx * .26, 7, .5), leaf[3], .8); }
      for (let k = 0; k < 40; k++) { const m = masses[Math.floor(r() * masses.length)]; B.f(B.ell(m.x + (r() - .5) * m.rx * 1.6, m.y + (r() - .5) * m.rx, 1.6 * s, .9 * s), r() < .5 ? leaf[3] : leaf[0], .7); }
    } else for (const [x0, y0, x1, y1] of forks) for (let k = 0; k < 3; k++) { const t = .4 + k * .25, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; B.s(`M${x} ${y}l${(r() - .5) * 14 * s} ${-8 * s - r() * 6 * s}`, '#7a766c', tw * .35, .8); }
    if (season === 'autumn' || season === 'winter' || season === 'summer') for (let k = 0; k < (season === 'summer' ? 4 : 7); k++) { const f = forks[k % forks.length], x = f[2] + (r() - .5) * 10 * s, y = f[3] + 6 * s + r() * 8 * s; for (let j = 0; j < 9; j++) { const bx = x + (r() - .5) * 6 * s, by = y + (r() - .5) * 4.5 * s; B.f(B.circ(bx, by, .85 * s), j % 3 ? '#c42a22' : '#e0503a', .95); if (j % 4 === 0) B.f(B.circ(bx - .3 * s, by - .3 * s, .3 * s), '#ffd0b0', .8); } }   /* (bunches of small berries with a glint, not red blobs) */
    if (season === 'spring') for (let k = 0; k < 6; k++) { const f = forks[k % forks.length]; B.f(B.blob(r, f[2] + (r() - .5) * 10 * s, f[3] + 4 * s, 4 * s, 2.6 * s, 6, .5), '#f4f0e2', .95); }
  }
  // a Scots pine on the open fell, at the size standard's height: a tall trunk, grey and plated low down and orange in
  // the crown, a few dead stubs, and a crown of flat, broken pads of needles at the top, each dark beneath and lit on
  // its upper face, leaning a little away from the weather. Snow lies on the pads in deep winter.
  function pineArt(B, h, P, seed, snowy) {
    const kit = KIT(), r = kit.rng(seed), s = h / 160, lean = (8 + r() * 14) * s, tw = Math.max(2.4, 5.2 * s);
    const tx = t => lean * t * t, top = -h * .9;
    // the trunk: grey bark low, orange high, lit on its west side
    B.s(`M0 0Q${-1 * s} ${-h * .45} ${tx(.9)} ${top}`, '#5a4a3e', tw * 1.6).s(`M${-tw * .3} ${-h * .05}Q${-2 * s} ${-h * .45} ${tx(.9) - tw * .3} ${top}`, '#8a7a68', tw * .55, .8);
    // (the upper trunk a weathered fox-brown with its plates, not a flat neon stripe: art director, highlands round 2)
    B.s(`M${tx(.45)} ${-h * .45}Q${tx(.6) - 1 * s} ${-h * .62} ${tx(.9)} ${top}`, '#8e5636', tw * 1.15).s(`M${tx(.45) - tw * .3} ${-h * .46}Q${tx(.6) - 1.6 * s} ${-h * .62} ${tx(.9) - tw * .3} ${top}`, '#b77c52', tw * .4, .7);
    for (let k = 0; k < 9; k++) { const t = .2 + r() * .75, y = -h * t, x = tx(t); B.s(`M${x - tw * .45} ${y}l${tw * .8} ${-1.2 * s}`, t > .45 ? '#6a3e26' : '#3e342c', .8 * s + .4, .55); }
    for (let k = 0; k < 6; k++) { const y = -h * (.12 + r() * .3), x = tx(-y / h), d = r() < .5 ? -1 : 1; B.f(B.ell(x + d * tw * .2, y, tw * .3, tw * .14), '#3a2e26', .5); if (k < 3) B.s(`M${x} ${y}l${d * (6 + r() * 6) * s} ${-(2 + r() * 3) * s}`, '#6a5a4c', 1.2 * s + .5, .8); }
    // the crown pads: flat, broken, clustered high, the topmost smallest
    // (each pine its own: an old flat-topped one with a few broad pads high up, a young one with many small pads down its
    // stem, or one between; its green a little bluer or warmer; one stamp of stacked pads repeated over the fells was a fault)
    const pads = [], form = r(), n = form < .33 ? 3 + Math.floor(r() * 2) : form < .66 ? 5 + Math.floor(r() * 3) : 7 + Math.floor(r() * 3), lo = form < .33 ? .7 : form < .66 ? .56 : .4;
    for (let k = 0; k < n; k++) { const t = k / (n - 1), y = -h * (lo + t * (.96 - lo)) + (r() - .5) * 8 * s, side = (k + (seed & 1)) % 2 ? 1 : -1, x = tx(-y / h) + side * (6 + r() * 22) * s * (1.1 - t * .6) * (form < .33 ? 1.3 : form > .66 ? .7 : 1), rx = (22 + r() * 18) * s * (1.15 - t * .55) * (form < .33 ? 1.35 : form > .66 ? .72 : 1), ry = rx * (.3 + r() * .12); pads.push({ x, y, rx, ry, bx: tx(-y / h) }); }
    const pv = r(), PD = pv < .33 ? ['#1e2e26', '#30503e', '#486c50', '#749a68'] : pv < .66 ? ['#1e2e22', '#33503a', '#4c6e46', '#7a9a5c'] : ['#232e1e', '#3a5232', '#56723e', '#86a05a'];
    for (const p of pads) B.s(`M${p.bx} ${p.y + p.ry * .6}Q${(p.bx + p.x) / 2} ${p.y + p.ry * .2} ${p.x} ${p.y}`, '#7a4a2c', 1.6 * s + .6, .9);
    for (const p of pads) B.f(B.blob(r, p.x + 3 * s, p.y + p.ry * .55, p.rx * 1.04, p.ry * 1.1, 11, .5), PD[0], .9);
    for (const p of pads) { B.f(B.blob(r, p.x, p.y, p.rx, p.ry, 11, .55), PD[1]); B.f(B.blob(r, p.x - p.rx * .12, p.y - p.ry * .3, p.rx * .78, p.ry * .6, 9, .5), snowy ? '#eef2f2' : PD[2], .95); B.f(B.blob(r, p.x - p.rx * .35, p.y - p.ry * .5, p.rx * .38, p.ry * .3, 7, .5), snowy ? '#ffffff' : PD[3], .8);
      for (let k = 0; k < 10; k++) B.s(`M${p.x + (r() - .5) * p.rx * 1.6} ${p.y + (r() - .3) * p.ry}l${(r() - .5) * 4 * s} ${-2.4 * s}`, r() < .5 ? '#5e7e50' : '#22342a', 1 * s + .3, .7); }
  }
  // Groves for the fells, from the layout: rowans and pines in small clusters along the gorge's banks, a shelter belt
  // behind each hut, and a few wind-bent clumps of pine out on the moor where the ground is open. Every tree keeps off
  // routes, plots, water, statics, peaks and the Edge, a cell and more from each, so nothing stands on a path or a plot.
  function groves(L, season) {
    const kit = KIT(), W = L.W, D = L.D, out = [], plots = new Set();
    for (const cells of Object.values(D.sectionCells || {})) for (const [x, y] of cells) plots.add(x + ',' + y);
    const statics = (D.static || []).filter(s => L.ids.has(s.district) || (gardenIslandBaseCell(s.x, s.y) || {}).region && L.ids.has((gardenIslandBaseCell(s.x, s.y) || {}).region));
    const peakB = L.peaks.map(pk => kit.bboxOf(pk.pts, 30));
    const okAt = (x, y) => {
      if (y < 1.5) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = gardenIslandBaseCell(Math.floor(x + dx * .9), Math.floor(y + dy * .9)); if (!c || !c.land || !L.ids.has(c.region) || c.freshwater || c.route || c.solid || c.landformId || c.staticId || c.beach) return false; if (plots.has(Math.floor(x + dx * .9) + ',' + Math.floor(y + dy * .9))) return false; }
      if (statics.some(s => x > s.x - 1.6 && x < s.x + s.w + 1.6 && y > s.y - 1.2 && y < s.y + s.h + 1.6)) return false;
      const p = L.cpt(x, y); if (peakB.some(b => p.x > b[0] && p.x < b[2] && p.y > b[1] && p.y < b[3] + 40)) return false;
      // a trunk stands clear of every trail (the moor trail had pines in its middle) and of the sheepfolds' rings
      if (L.routes.some(rt => rt.points.some((q, i) => i > 0 && segDist(p, rt.points[i - 1], q) < (rt.tier === 'plaza' ? rt.width * W.cellW * .5 : 13) + 16))) return false;
      if ((L.folds || []).some(f => Math.hypot(f[0] - x, (f[1] - y) * 1.3) < f[2] + 1.3)) return false;
      // crowns do not grow into each other: never one straight above another (that read as one tree with two crowns)
      return !out.some(t => { const dx = Math.abs(t.x - p.x), dy = Math.abs(t.y - p.y), s = t.h + h; return Math.hypot(dx, dy * 1.5) < s * .2 || dx < s * .2 && dy < s * .5; });
    };
    const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0; return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
    let h = 0;
    const put = (kind, x, y, t) => { h = Math.round(kind === 'pine' ? gardenSizePx('tree', t) : gardenSizePx('young', t)); if (!okAt(x, y)) return false; const p = L.cpt(x, y), sd = kit.hash(Math.round(x * 10), Math.round(y * 10), 71); out.push({ kind, x: p.x, y: p.y, cx: x, cy: y, h, seed: sd }); return true; };
    const cluster = (x, y, n, mix, spread) => { const rr = kit.rng(kit.hash(Math.round(x * 10), Math.round(y * 10), 73)); let got = 0; for (let k = 0; k < n * 4 && got < n; k++) { const a = rr() * Math.PI * 2, d = got ? .9 + rr() * spread : 0; if (put(rr() < mix ? 'rowan' : 'pine', x + Math.cos(a) * d * 1.2, y + Math.sin(a) * d * .9, rr())) got++; } };
    // the gorge: every few cells along its line, a cluster on one bank or the other, rowans more than pines
    if (L.gorge && L.gorge.line) { const ln = kit.resample(L.gorge.line.map(p => ({ x: p[0], y: p[1] })), .5), hw = (L.gorge.halfWidth || .85);
      for (let i = 3; i < ln.length - 3; i += 7) { const a = ln[i - 1], b = ln[i + 1], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, side = kit.hash(i, 3, 75) % 2 ? 1 : -1, off = hw + 1.4 + (kit.hash(i, 5, 75) % 10) / 10;
        cluster(ln[i].x - dy / l * side * off, ln[i].y + dx / l * side * off, 2 + kit.hash(i, 7, 75) % 2, .65, 1.1); } }
    // a shelter belt of pines behind (north and west of) each building on the fells
    for (const s of statics) if (/hut|bothy|fold/.test(s.id)) { const rr = kit.rng(kit.hashStr(s.id)); for (let k = 0; k < 5; k++) put('pine', s.x - 1.4 - rr() * 2.6, s.y - 1.4 - rr() * 1.6, .5 + rr() * .5); }
    // wind-bent clumps out on the open moor, where a broad noise says the ground is sheltered
    const rb = kit.bboxOf(L.regionLoops.flat()); for (let y = 3; y < (rb[3] - W.sky) / W.cellH - 2; y += 4.5) for (let x = 2; x < W.cols - 2; x += 6.5) {
      const jx = x + (kit.hash(x * 10, y * 10, 77) % 100) / 40 - 1.2, jy = y + (kit.hash(x * 10, y * 10, 78) % 100) / 50 - 1;
      if (kit.fbm(jx / 9, jy / 6, 79) < .56) continue; cluster(jx, jy, 2 + kit.hash(x, y, 80) % 3, .2, 1.4);
    }
    return out.slice(0, 48);
  }

  /* ---------- the handle the world uses ---------- */
  /** The tall pieces: [{ key, box, x, y, draw(B) }], each baked once and sorted by its base line y. */
  function occluders(L, ops, season, sig, collect) {
    const kit = KIT(), P = PAL[season] || PAL.summer, snowy = SNOW[season] > 90, out = [];
    for (const pk of L.peaks) {
      const b = kit.bboxOf(pk.pts), w = b[2] - b[0], d = b[3] - b[1], sharp = /east/.test(pk.id), H = sharp ? Math.min(400, w * .78) : Math.min(330, w * .64);
      const ox = (b[0] + b[2]) / 2, oy = b[3] - 4, foot = pk.pts.map(p => ({ x: p.x - ox, y: p.y - oy })), pbox = [-w / 2 - 40, -(d + H * 1.05) - 30, w / 2 + 50, 30];
      const snowS = PEAK_SNOW[season] + (sharp ? .06 : .2), seed = kit.hashStr(pk.id);
      // (behind it and inside its picture: the field's top edge in your column is above your middle)
      const fade = (x, y) => { if (y > oy - 6) return false; const lx = x - ox; if (lx < pbox[0] || lx > pbox[2]) return false; const F = PEAK_FIELDS.get([seed, w, d, H, snowS, P.fell].join('|')); if (!F) return false; const t = F.top[Math.max(0, Math.min(F.PW - 1, Math.round((lx - pbox[0]) / F.ST)))]; return isFinite(t) && y - oy - 18 > pbox[1] + t * F.ST; };
      // (the height field is made here, before the sprite's first painting is timed: with it inside, the painting took so long
      // that the sharpener never painted the peak again close up, and the flanks stayed a soft 1.25 px a world px)
      const F = ok(() => peakField(w, d, H, snowS, P, seed, sharp, foot, pbox[0], pbox[1], pbox[2] - pbox[0], pbox[3] - pbox[1]));
      // (painted at 3 px a world px when the garden is built, so close up it is crisp and the sharpener never paints it again:
      // a repaint of a picture this size, with its upload, took 84 to 229 ms the moment you stopped near a peak)
      // (highlands fix round 2: the moor ran on under the mountain, and walking behind it turned the whole peak into a
      // see-through ghost with the march wall showing through. The ground the mountain's picture stands over is the
      // mountain now: walking stops at its flank, in every column where you would be hidden behind it (peakFeet), and
      // the peak no longer fades.)
      if (F && collect) { const cw = L.W.cellW, ch = L.W.cellH, step = 16;
        const northAt = x => { let best = Infinity; for (let i = 0; i < pk.pts.length; i++) { const a = pk.pts[i], b = pk.pts[(i + 1) % pk.pts.length]; if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue; const y = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); if (y < best) best = y; } return best; };
        for (let x = ox + pbox[0]; x < ox + pbox[2]; x += step) {
          let sky = Infinity; for (let c = Math.floor((x - ox - pbox[0]) / F.ST); c <= Math.ceil((x + step - ox - pbox[0]) / F.ST) && c < F.PW; c++) if (c >= 0 && isFinite(F.top[c])) sky = Math.min(sky, oy + pbox[1] + F.top[c] * F.ST);
          const yN = Math.min(northAt(x + 2), northAt(x + step - 2)); if (!isFinite(sky) || !isFinite(yN)) continue;
          const y0 = Math.max(0, (sky + 16 - L.W.sky) / ch), y1 = (yN - L.W.sky) / ch + .35; if (y1 - y0 < .2) continue;
          collect.push({ x0: x / cw, y0, x1: (x + step) / cw, y1, src: 'mountain (' + (pk.name || (sharp ? 'the Horn' : 'the west peak')) + ')' });
        } }
      out.push({ key: sig + '|peak|' + pk.id, box: pbox, x: ox, y: oy, K: 3, draw: B => peakArt(B, w, d, H, snowS, P, seed, sharp, foot, pbox) }); void fade;
    }
    // tors framing the gaps in the Edge: the pass and the falls cave stair stand between rock
    const gapAt = [].concat(L.gates.filter(g => g.kind === 'pass').map(g => [g.x + .5, g.y + .9]), L.falls && L.falls.caveStair ? [L.falls.caveStair] : []);
    for (const run of L.runs) for (const end of [run[0], run[run.length - 1]]) for (const gp of gapAt) {
      const c = L.cpt(gp[0], gp[1]); if (Math.hypot(end.lip.x - c.x, (end.lip.y - c.y) * 1.4) > 150) continue;
      const sd = kit.hash(Math.round(end.lip.x), Math.round(end.lip.y), 3), w = 40 + sd % 18, h = 58 + sd % 26;
      // (a tor never stands on a plot: one stood on the back of the thyme terrace's hedge and read as a cairn on it)
      { const tx = (end.lip.x + (end.lip.x < c.x ? -w * .3 : w * .3)) / L.W.cellW, ty = (end.foot.y - 2 - L.W.sky) / L.W.cellH; let hit = false; for (let yy = ty - 1.6; yy <= ty + .2 && !hit; yy += .4) for (let xx = tx - w / L.W.cellW; xx <= tx + w / L.W.cellW && !hit; xx += .4) if (L.plotAt(xx, yy)) hit = true; if (hit) continue; }
      out.push({ key: sig + '|crag|' + sd, box: [-w, -h * 1.5 - 10, w, 16], x: end.lip.x + (end.lip.x < c.x ? -w * .3 : w * .3), y: end.foot.y - 2, draw: B => cragArt(B, w, h, P, sd, snowy, false) });
    }
    // rowans on the gorge's far lip, where the river runs down to the falls
    // (the second stands back from the lip of Fleet Falls: at .84 it grew out of the falling water)
    // the groves: rowans and pines in clusters from the layout (groves()), each a standing sprite whose trunk blocks the feet
    const crownFade = (h, wd) => (x, y, im) => typeof gardenCrownCovers === 'function' && gardenCrownCovers(x, y, im.x, im.y, h, wd);
    for (const g of groves(L, season)) out.push(g.kind === 'pine' ? { key: sig + '|pine|g' + g.seed, box: [-g.h * .72, -g.h - 14, g.h * .85, 10], x: g.x, y: g.y, fade: crownFade(g.h, g.h * .9), draw: B => pineArt(B, g.h, P, g.seed, snowy) } : { key: sig + '|rowan|g' + g.seed, box: [-g.h * .78, -g.h * 1.08 - 10, g.h * .78, 10], x: g.x, y: g.y, fade: crownFade(g.h, g.h * 1.1), draw: B => rowanArt(B, g.h, P, g.seed, season) });
    // the sheepfolds' walls: the back arc stands behind you inside the fold, the front arc in front of you
    for (const fw of L.foldWalls || []) { const by = fw.c.y - fw.RY * .7, fy = fw.c.y + fw.RY + 3, hh = gardenSizePx('wall', .15) + 6;
      out.push({ key: sig + '|fold|b' + fw.fs, box: [-fw.RX - 44, -fw.RY * .5 - hh - 6, fw.RX + 14, fw.RY * .75 + 22], x: fw.c.x, y: by, draw: B => foldWallArt(B, fw, false, P, fw.c.x, by) });
      out.push({ key: sig + '|fold|f' + fw.fs, box: [-fw.RX - 14, -fw.RY - 3 - hh - 8, fw.RX + 14, 8], x: fw.c.x, y: fy, draw: B => foldWallArt(B, fw, true, P, fw.c.x, fy) }); }
    if (collect) for (const f of L.foldFeet || []) collect.push(f);
    // the moor's end: its wall stops you where the map does, and the fingerpost by the gate names the road beyond
    if (L.moorEnd) { const me = L.moorEnd, ph = gardenSizePx('lamp', .3), cw = L.W.cellW, ch = L.W.cellH;
      if (collect) { for (const f of me.feet) collect.push(f); collect.push({ x0: (me.post.x - 4) / cw, y0: (me.post.y - 5 - L.W.sky) / ch, x1: (me.post.x + 4) / cw, y1: (me.post.y + 2 - L.W.sky) / ch, src: 'fingerpost' }); }
      out.push({ key: sig + '|fingerpost', box: [-70, -ph - 16, 40, 8], x: me.post.x, y: me.post.y, draw: B => fingerpostArt(B, ph, P, snowy) }); }
    for (const op of ops) for (const p of op.pines || []) out.push({ key: sig + '|pine|' + p.seed, box: [-p.h * .72, -p.h - 14, p.h * .85, 10], x: p.x, y: p.y, fade: crownFade(p.h, p.h * .9), draw: B => pineArt(B, p.h, P, p.seed, snowy) });
    return out;
  }
  function build(scene, parent, sc, objParent) {
    const t0 = performance.now(), kit = KIT(); if (!kit || !wanted()) return null;
    const W = GARDEN_WORLD, L = readLayout(W); if (!L) return null;
    const season = sc.season || 'summer', sig = 'gpt-3|' + season + '|' + (GardenIslandLayout.fingerprint || '');
    const old = current; if (old) { if (old.fadeTick && old.scene && old.scene.events) old.scene.events.off('update', old.fadeTick); old.roomEntrances = null; old.handle.destroy(old.sig === sig); for (const s of sprites) s.destroy(); sprites = []; if (old.sig !== sig) for (const k of old.spriteKeys) if (scene.textures.exists(k)) scene.textures.remove(k); }
    const ops = ok(() => compose(L, season)); if (!ops) return null;
    const rb = kit.bboxOf(L.regionLoops.flat().concat(L.terraces.flatMap(t => t.pts)));
    const box = { x: 0, y: W.sky - 150, w: W.cols * W.cellW, h: Math.min(W.sky + W.rows * W.cellH, rb[3] + 80) - (W.sky - 150) };
    const handle = kit.chunked(scene, parent, ops, { key: sig, box, K, chunk: CHUNK, depth: DEPTH, budgetMB: 32 });
    const keys = []; let spritePx = 0;
    // the peaks, tors, rowans and pines stand among the world's objects, sorted by their foot with the player, the
    // landmarks and the trees (in the root they were drawn over every object: the Horn's foot hid the grotto under it
    // and anyone standing just in front of it)
    const standIn = objParent || parent;
    const feetNew = []; const occ = occluders(L, ops, season, sig, feetNew); feet = feetNew.map(f => Object.freeze(f)); feetSigNow = feet.length + ':' + feet.reduce((h, f) => (Math.imul(h, 31) + Math.round(f.x0 * 64) * 7 + Math.round(f.y0 * 64)) | 0, 0);
    // (each lays its shadow on the ground through the shared kit, but not a peak: that is a hillside, painted with its own shade, and laying so large a picture over cost 55 ms)
    const fades = [];
    for (const o of occ) { const im = kit.sprite(scene, standIn, o.key, o.box, o.draw, o.x, o.y, o.K, !o.key.includes('|peak|')); if (im) { sprites.push(im); keys.push(o.key); spritePx += im._gptPx || 0; if (o.fade) fades.push({ im, f: o.fade, to: o.fadeTo }); } }
    // you can always see yourself: a peak you walk behind (the grotto's ledge, the Horn's back) and a pine or rowan whose
    // crown you stand under fade while you are there (they were drawn over you, and you vanished behind the Horn)
    const fadeTick = () => { if (typeof _gw === 'undefined' || !fades.length) return; const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
      for (const q of fades) { const im = q.im; if (!im.active) continue; const a = q.f(x, y, im) ? q.to || (typeof GARDEN_CROWN_FADE === 'number' ? GARDEN_CROWN_FADE : .34) : 1; if (im.alpha !== a) im.setAlpha(Math.abs(a - im.alpha) < .03 ? a : im.alpha + (a - im.alpha) * .25); } };
    if (scene.events) scene.events.on('update', fadeTick);
    // the pines and rowans' trunk feet, in cells ([x, y, width]), for the one trunk-collision list (94-garden-world-0walk.js _gwPaintedTrunks)
    trunkFeet = occ.filter(o => /\|(pine|rowan)\|/.test(o.key)).map(o => [+(o.x / W.cellW).toFixed(2), +((o.y - W.sky) / W.cellH).toFixed(2), .34]);
    if (parent.sort) parent.sort('depth'); if (standIn !== parent && standIn.sort) standIn.sort('depth');
    current = { sig, handle, spriteKeys: keys, fadeTick, scene, roomEntrances: L.falls && L.falls.caveStair ? { falls: caveMouthAt(L, L.falls.caveStair) } : {} };
    stats = { sig, chunks: handle.chunks, buildMs: Math.round(performance.now() - t0), sprites: sprites.length, spritePx };
    return { destroy() { if (scene.events) scene.events.off('update', fadeTick); handle.destroy(true); for (const s of sprites) s.destroy(); sprites = []; current = current && current.handle === handle ? Object.assign(current, { handle: { destroy() {} }, roomEntrances: null }) : current; } };
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
  function owns(kind) { return wanted() && (kind === 'mountain' || kind === 'rock-wall' || kind === 'terrace-wall' || !!(window.GardenPaintVale && GardenPaintVale.owns(kind))); }
  function ownsRegion(id) { if (!wanted()) return false; const r = (gardenIslandData().regions || []).find(x => x.id === id); return !!(r && r.theme === 'mountain'); }
  function status() {
    const h = current && current.handle, px = (h && h.texturePx || 0) + (stats.spritePx || 0);
    return Object.assign({}, stats, { wanted: wanted(), pending: h ? h.pending : null, live: h ? h.live : null, baked: h ? h.baked : null, evicted: h ? h.evicted : null, worstChunkMs: h ? h.worstMs : null, worstSliceMs: h ? h.sliceWorstMs : null, p95ChunkMs: h ? h.p95 : null, medianChunkMs: h ? h.median : null, bakeMs: h ? h.bakeMs : null, textureMB: Math.round(px * 4 / 1048576 * 10) / 10, lastError: lastError || (KIT() && KIT().lastError) });
  }
  function roomEntrance(id) { return current && current.roomEntrances && current.roomEntrances[id] || null; }
  return { wanted, build, paintTo, profile, owns, ownsRegion, status, compose, readLayout, roomEntrance, PAL, trunks: () => (wanted() && trunkFeet) || null, feet: () => (wanted() ? feet : []), feetSig: () => (wanted() ? feetSigNow : '') };
})();
