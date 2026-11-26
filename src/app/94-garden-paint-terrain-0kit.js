/* Painted terrain kit (Painted village style): the tools for painting high
 * ground as composed pictures in the opening scenes' flat-vector house style
 * (soft shading lit from the upper left, no outlines, lobed natural shapes;
 * docs/dev/SCENE_LESSONS.md, sections K, N and AA on cliffs, edges and moors).
 *
 * The kit has three parts.
 *   1. A brush (world units, Path2D through sceneDraw) with terrain strokes:
 *      rock faces with beds, ledges, joints, buttresses and drip streaks; scree
 *      fans; boulders; heather, tussocks, stones; snow with blue shade; dry-stone
 *      courses with cope stones; rock-cut steps; cave mouths; contour-ringed hills.
 *   2. A chunked baker: a composition is a list of ops { bb, seed, draw } in
 *      world px; each chunk of the region bakes only the ops that touch it into
 *      its own canvas texture, so the picture is painted once as a whole and
 *      cached in pieces. Texture passes scatter by hashed tiles, so neighbours
 *      agree and there are no seams. Chunks near the camera bake first, the
 *      rest in small slices on later frames (never one long task while walking).
 *   3. Occluders: tall pieces (peaks, crags, pines, cairns) are baked once into
 *      their own sprite and sorted by their base line, so the player walks
 *      behind them. Only interactive or changing things stay live.
 *
 * Only rendering: cells, walking, picking and saved rows are untouched.
 * Nothing here runs at load. */
window.GardenPaintTerrainKit = (function () {
  'use strict';
  const D = () => sceneDraw;
  let lastError = null;
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function hash(a, b, c) { let n = Math.imul((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 1442695041, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return (n ^ (n >>> 16)) >>> 0; }
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // smooth value noise, 0..1 (for drifts, snow edges and the moor's mosaic)
  function noise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => hash(a, b, s) / 4294967296; return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; }
  function fbm(x, y, s) { return noise(x, y, s) * .55 + noise(x * 2.1, y * 2.1, s + 7) * .3 + noise(x * 4.3, y * 4.3, s + 13) * .15; }
  const paths = new Map();
  const P2 = d => { let p = paths.get(d); if (!p) { if (paths.size > 9000) paths.clear(); p = new Path2D(d); paths.set(d, p); } return p; };
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };

  /* ---------- the brush ---------- */
  function brush(cx) {
    const B = {
      cx,
      f(d, fill, op) { cx.globalAlpha = op == null ? 1 : op; cx.fillStyle = fill; cx.fill(typeof d === 'string' ? P2(d) : d); cx.globalAlpha = 1; return B; },
      s(d, stroke, w, op, cap) { cx.globalAlpha = op == null ? 1 : op; cx.strokeStyle = stroke; cx.lineWidth = w; cx.lineCap = cap || 'round'; cx.lineJoin = 'round'; cx.stroke(typeof d === 'string' ? P2(d) : d); cx.globalAlpha = 1; return B; },
      lin(x1, y1, x2, y2, stops) { const g = cx.createLinearGradient(x1, y1, x2, y2); for (const [o, c] of stops) g.addColorStop(o, c); return g; },
      rad(x, y, r, stops) { const g = cx.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) g.addColorStop(o, c); return g; },
      rect: (x, y, w, h) => D().rect(x, y, w, h), ell: (x, y, rx, ry) => D().ell(x, y, rx, ry), circ: (x, y, r) => D().circ(x, y, r), blob: (r, x, y, rx, ry, n, rag) => D().blob(r, x, y, rx, ry, n, rag),
      poly: pts => 'M' + pts.map(p => (Math.round((p.x != null ? p.x : p[0]) * 10) / 10) + ' ' + (Math.round((p.y != null ? p.y : p[1]) * 10) / 10)).join('L') + 'z',
      line: pts => 'M' + pts.map(p => (Math.round((p.x != null ? p.x : p[0]) * 10) / 10) + ' ' + (Math.round((p.y != null ? p.y : p[1]) * 10) / 10)).join('L'),
      // a soft contact shadow
      shadow(x, y, rx, ry, op, col) { cx.save(); cx.translate(x, y); cx.scale(1, ry / rx); const c = col || '#2e3420'; cx.fillStyle = B.rad(0, 0, rx, [[0, rgba(c, op || .28)], [.6, rgba(c, (op || .28) * .55)], [1, rgba(c, 0)]]); cx.beginPath(); cx.arc(0, 0, rx, 0, Math.PI * 2); cx.fill(); cx.restore(); return B; },
      // a lobed stone lit from the upper left: shade, body, lit face, a lichen or snow cap
      stone(r, x, y, rx, ry, P, cap) {
        B.f(D().blob(r, x + rx * .12, y + ry * .2, rx, ry * .92, 7, .3), P.rockDk, .55);
        B.f(D().blob(r, x, y, rx, ry, 7, .32), P.rockLo).f(D().blob(r, x - rx * .16, y - ry * .22, rx * .78, ry * .68, 7, .3), P.rock).f(D().blob(r, x - rx * .34, y - ry * .42, rx * .42, ry * .3, 6, .3), P.rockHi, .85);
        if (cap === 'snow') B.f(D().blob(r, x - rx * .08, y - ry * .62, rx * .74, ry * .36, 7, .4), P.snow, .95);
        else if (cap) B.f(D().blob(r, x - rx * .2, y - ry * .5, rx * .4, ry * .2, 6, .5), cap, .7);
        return B;
      },
      // a boulder that stands up out of the ground (a 3/4 view: top, a lit west face, a shaded east face, a contact shadow)
      boulder(r, x, y, w, h, P, snow) {
        B.shadow(x + w * .18, y + 1, w * .62, Math.max(3, w * .16), .3);
        const top = y - h, pts = [[x - w * .5, y], [x - w * .52, y - h * .45], [x - w * .3 - r() * w * .1, top + h * .08], [x - w * .05, top - r() * h * .1], [x + w * .28, top + h * .1], [x + w * .5, y - h * .4], [x + w * .46, y]];
        B.f(B.poly(pts), P.rockLo);
        B.f(B.poly([[x - w * .5, y], [x - w * .52, y - h * .45], [x - w * .3, top + h * .1], [x - w * .05, top + h * .02], [x + w * .02, y - h * .25], [x - w * .1, y]]), P.rock);
        B.f(B.poly([[x - w * .46, y - h * .5], [x - w * .3, top + h * .14], [x - w * .06, top + h * .06], [x - w * .18, y - h * .52]]), P.rockHi, .8);
        B.s(`M${x + w * .12} ${top + h * .25}l${w * .06} ${h * .5}`, P.rockDk, .9, .5);
        if (snow) B.f(D().blob(r, x - w * .08, top + h * .12, w * .38, h * .16, 7, .4), P.snow, .95);
        else B.f(D().blob(r, x - w * .14, top + h * .1, w * .2, h * .08, 6, .5), P.lichen, .6);
        return B;
      },
      tufts(r, x, y, w, n, cols, h) { for (let i = 0; i < n; i++) { const px = x + (r() - .5) * w, hh = (h || 5) * (.6 + r() * .6); B.s(`M${px} ${y}q${(r() - .5) * 3} ${-hh * .6} ${(r() - .5) * 5} ${-hh}`, cols[i % cols.length], 1, .85); } return B; },
      // a heather clump: dark mound, mid lobes, lit lobes, bloom specks
      // (a low cushion built of a few lobes in three tones with many fanned sprigs, its shape and size its own each time:
      // two translucent ellipses and six sticks read as one vector stamp repeated over the moor; 19 Nov 2026)
      heather(r, x, y, rx, P, bloom) {
        rx *= .75 + r() * .5; const ry = rx * (.4 + r() * .2), lobes = 2 + Math.floor(r() * 3), mid = mix(P.heather, P.heatherLo, .35);
        B.f(D().blob(r, x + rx * .16, y + ry * .26, rx * 1.05, ry * .7, 9, .6), P.heatherLo, .45);
        for (let i = 0; i < lobes; i++) { const ox = (r() - .5) * rx * 1.1, oy = (r() - .5) * ry * .5, s = .42 + r() * .38; B.f(D().blob(r, x + ox, y + oy - ry * .12, rx * s, ry * s, 8, .65), i % 2 ? P.heather : mid, .62); }
        B.f(D().blob(r, x - rx * .3, y - ry * .38, rx * (.25 + r() * .2), ry * .26, 7, .6), P.heatherHi, .45);
        // the sprigs fan up and out from the cushion, dark at the root side, lit towards the light
        for (let i = 0, n = 7 + Math.floor(rx * 1.1 + r() * 4); i < n; i++) { const a = -1.5708 + (r() - .5) * 2, px = x + (r() - .5) * rx * 1.7, py = y + (r() - .25) * ry * .8, h = 1.4 + r() * 2.6, t = r(); B.s(`M${px} ${py}l${(Math.cos(a) * h).toFixed(2)} ${(Math.sin(a) * h).toFixed(2)}`, t < .4 ? P.heatherLo : t < .75 ? mid : P.heatherHi, .7 + r() * .4, .75); }
        if (bloom) for (let i = 0, n = 3 + Math.floor(r() * 8); i < n; i++) B.f(B.circ(x - rx * .15 + (r() - .5) * rx * 1.2, y + (r() - .8) * ry, .45 + r() * .5), bloom, .8);
        return B;
      },
      rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${x + r} ${y}h${w - 2 * r}q${r} 0 ${r} ${r}v${h - 2 * r}q0 ${r} ${-r} ${r}h${-(w - 2 * r)}q${-r} 0 ${-r} ${-r}v${-(h - 2 * r)}q0 ${-r} ${r} ${-r}z`; },
      // an upright timber or stone member lit from the upper left: pal [body, shade, light]
      post(x, top, bottom, w, pal) { B.f(B.rect(x - w / 2, top, w, bottom - top), pal[0]).f(B.rect(x - w / 2, top, Math.max(1, w * .28), bottom - top), pal[2], .55).f(B.rect(x + w / 2 - w * .3, top, w * .3, bottom - top), pal[1], .7); return B; },
      text(t, x, y, size, color) { cx.font = size + 'px Georgia, serif'; cx.fillStyle = color; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y); return B; },
    };
    return B;
  }

  /* ---------- a rock face between two lines (the Edge, a gorge wall, a crag's side) ----------
   * top[i], bot[i]: matching points (the lip and the foot) in world px; idx: the indices this call paints (a piece of a
   * longer face: masses are placed by their index on the whole line, so pieces meet without a seam); R(i, k): a seeded
   * generator for index i; G: { lit, mid, shade, deep, hi, damp, moss, snow }; o: { snowy, size }.
   * Painted as weathered gritstone: a ground that darkens to the foot, rounded masses in two or three tiers, each lit
   * on its upper left with a dark crevice below and right, moss and heather on the tops, drip stains, damp at the foot. */
  function rockBand(B, top, bot, idx, R, G, o) {
    o = o || {}; const N = top.length, at = (t, i) => ({ x: top[i].x + (bot[i].x - top[i].x) * t, y: top[i].y + (bot[i].y - top[i].y) * t });
    const face = B.poly(idx.map(i => top[i]).concat(idx.slice().reverse().map(i => bot[i])));
    const ys = idx.map(i => top[i].y), y0 = Math.min(...ys), y1 = Math.max(...idx.map(i => bot[i].y));
    B.f(face, B.lin(0, y0, 0, y1, [[0, G.mid], [.55, G.shade], [1, G.deep]]));
    B.cx.save(); B.cx.clip(new Path2D(face));
    const size = o.size || 1, tiers = o.tiers || [[.3, 1], [.74, .75]];
    // the lit upper band: the rock's top catches the light from above
    B.f(B.poly(idx.map(i => top[i]).concat(idx.slice().reverse().map(i => at(.32, i)))), G.lit, .35);
    // broad facets: buttresses lit on their west side and clefts in shade, under the masses, so the face reads as a cliff
    { let i = idx[0] - 30; i -= ((i % 30) + 30) % 30; for (; i <= idx[idx.length - 1]; ) { const rr = R(i, 400), w = 8 + Math.floor(rr() * 10); const a0 = Math.max(0, i), a1 = Math.min(N - 1, i + w); if (a1 > a0) { const half = Math.max(a0 + 1, Math.min(a1, a0 + Math.round(w * (.4 + rr() * .3)))); const strip = (b0, b1, col, op) => { const T = [], Bt = []; for (let k = b0; k <= b1; k++) { T.push(at(.04, k)); Bt.push(at(1, k)); } B.f(B.poly(T.concat(Bt.reverse())), col, op); }; strip(a0, half, G.lit, .28); strip(half, a1, G.deep, .26); B.s(B.line([at(.05, half), at(.5, Math.min(N - 1, half + (rr() < .5 ? 1 : 0))), at(1, half)]), G.deep, 1.4, .5); } i += w; } }
    for (let tI = 0; tI < tiers.length; tI++) {
      const [t, sc] = tiers[tI];
      // slabs: wide weathered masses at hashed gaps along the whole line, so neighbours agree
      let i = idx[0] - 40; { const rr0 = R(Math.floor(i / 40), 300 + tI); i += Math.floor(rr0() * 6); }
      while (i <= idx[idx.length - 1] + 6) {
        const rr = R(i, 200 + tI), gap = Math.round((tI ? 7 : 5) + rr() * (tI ? 9 : 6));
        if (i >= 0 && i < N && rr() > (tI ? .35 : .08)) {
          const p = at(t + (rr() - .5) * .08, i), h = Math.hypot(bot[i].x - top[i].x, bot[i].y - top[i].y), rx = (12 + rr() * 16) * size * sc, ry = Math.max(3.5, h * (tI ? .2 : .27) * (.8 + rr() * .4));
          const tone = rr(), body = tone < .45 ? G.mid : tone < .8 ? G.lit : G.shade;
          B.f(B.blob(rr, p.x + rx * .12, p.y + ry * .25, rx * 1.04, ry * 1.06, 9, .2), G.deep, .75);
          B.f(B.blob(rr, p.x, p.y, rx, ry, 9, .2), B.lin(p.x - rx, p.y - ry, p.x + rx * .6, p.y + ry, [[0, body], [1, G.shade]]));
          B.f(B.blob(rr, p.x - rx * .3, p.y - ry * .38, rx * .5, ry * .36, 7, .3), G.hi, tone < .8 ? .55 : .3);
          for (let c = 0; c < 2; c++) if (rr() < .55) { const cx = p.x + (rr() - .5) * rx * 1.2; B.s(`M${cx} ${p.y - ry * .8}l${(rr() - .5) * 2} ${ry * 1.6}`, G.deep, 1 + rr() * .8, .55); }
          if (tI === 0 && rr() < .5) B.f(B.blob(rr, p.x - rx * .1, p.y - ry * .86, rx * .55, ry * .22, 7, .5), o.snowy ? G.snow : rr() < .6 ? G.moss : G.heather, .95);
          if (rr() < .25) B.s(`M${p.x + (rr() - .5) * rx} ${p.y + ry * .7}q${(rr() - .5) * 2} ${h * .15} ${(rr() - .5) * 3} ${h * (.2 + rr() * .25)}`, '#2a2622', 1.6 + rr() * 2.6, .3);
          if (!o.snowy && tI === tiers.length - 1 && rr() < .35) B.f(B.blob(rr, p.x, p.y + ry * .6, rx * .7, ry * .3, 6, .5), G.damp, .4);
          if (o.snowy && rr() < .6) B.f(B.blob(rr, p.x - rx * .1, p.y - ry * .78, rx * .75, ry * .26, 7, .4), G.snow, .95);
        }
        i += gap;
      }
    }
    // the roof under the lip: a shade that says the top overhangs
    B.s(B.line(idx.map(i => at(.06, i))), G.deep, 3, .4);
    B.cx.restore();
    B.s(B.line(idx.map(i => bot[i])), G.deep, 2.2, .5);
  }

  /* ---------- polylines in world px ---------- */
  function resample(pts, step) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L / step)); for (let k = 1; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }
    return out;
  }
  function normals(pts) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: -dy / l, y: dx / l, tx: dx / l, ty: dy / l }; }); }
  function bboxOf(pts, pad) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } pad = pad || 0; return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; }
  const meets = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  /** Hashed tiles over a box: fn(tileX0, tileY0, r) for each tile that can reach the box. */
  function tiles(bb, size, margin, salt, fn) {
    const tx0 = Math.floor((bb[0] - margin) / size), ty0 = Math.floor((bb[1] - margin) / size), tx1 = Math.floor((bb[2] + margin) / size), ty1 = Math.floor((bb[3] + margin) / size);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) fn(tx * size, ty * size, rng(hash(tx, ty, salt) | 1));
  }

  /* ---------- the chunked baker ---------- */
  // ops: [{ bb: [x0, y0, x1, y1] world px, seed, clip: Path2D-able loops or null, draw(B, r, chunkBB) }]
  // opts: { key, box: {x, y, w, h}, K, chunk (world px), depth }
  const PAD = 2, COST_T = new Map(), opKey = o => o.tag || o.name || 's' + o.seed + '@' + (o.bb ? o.bb.map(Math.round).join(',') : '');
  function chunked(scene, parent, ops, opts) {
    // Layers baked at 1 px a world px or more follow the camera's zoom through the shared kit (crisp at every zoom, the same
    // slices, streaming and budget); a far backdrop baked small on purpose (K under 1) keeps this fixed baker.
    if (window.GardenPaintGround && opts.follow !== false && (opts.K || 1.5) >= 1) return GardenPaintGround.layer(scene, parent, ops, opts);
    const K = opts.K || 1.5, size = opts.chunk || 512, box = opts.box, cols = Math.ceil(box.w / size), rows = Math.ceil(box.h / size), list = [];
    const t0 = performance.now(); let worst = 0, bakedPx = 0, bakeMs = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      // each chunk bakes a bleed of PAD world px past its edges and shows only its own box (a crop): the edge texels
      // filter against real picture, never against nothing, so no hairline shows where chunks meet
      const bb = [box.x + i * size - PAD, box.y + j * size - PAD, Math.min(box.x + box.w, box.x + (i + 1) * size) + PAD, Math.min(box.y + box.h, box.y + (j + 1) * size) + PAD];
      const mine = ops.filter(o => meets(o.bb, bb)); if (!mine.length || mine.every(o => o.decor)) continue;
      list.push({ i, j, bb, ops: mine, key: opts.key + '|' + i + ',' + j, image: null });
    }
    // A chunk bakes in slices: its ops run into its canvas a few milliseconds at a time (slice > 0), so no single task
    // is long; the image appears when the last op is done. slice 0 bakes it whole (the scene build).
    const bakeOne = (ch, slice) => {
      const s = performance.now();
      if (!scene.textures.exists(ch.key)) {
        if (!ch.job) { const w = Math.ceil((ch.bb[2] - ch.bb[0]) * K), h = Math.ceil((ch.bb[3] - ch.bb[1]) * K), c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -ch.bb[0] * K, -ch.bb[1] * K); ch.job = { c, cx, B: brush(cx), next: 0, ms: 0 }; }
        const J = ch.job, cx = J.cx;
        while (J.next < ch.ops.length) {
          // (vf-perf) an op timed before that would not fit in what is left of this slice waits for the next one (one alone may)
          { const o = ch.ops[J.next]; if (!(o.costT > 0)) { const c = COST_T.get(ch.key + '|' + opKey(o)); if (c) o.costT = c; } }   /* (remembered through a repaint) */
          if (slice && performance.now() > s + .5 && ch.ops[J.next].costT > slice - (performance.now() - s)) break;   /* (costT: its ms here, kept apart from the ground baker's cost) */
          const o = ch.ops[J.next++], o0 = performance.now();
          ok(() => { cx.save(); if (o.clip) { cx.clip(o.clip, 'evenodd'); } o.draw(J.B, rng(o.seed || 1), ch.bb); cx.restore(); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.filter = 'none'; });
          { const od = performance.now() - o0; if (!(o.costT >= od)) { o.costT = od; if (COST_T.size > 20000) COST_T.clear(); COST_T.set(ch.key + '|' + opKey(o), od); } }
          if (slice && performance.now() - s > slice) break;
        }
        J.ms += performance.now() - s; sliceWorst = Math.max(sliceWorst, performance.now() - s);
        if (J.next < ch.ops.length) return false;
        scene.textures.addImage(ch.key, J.c); bakedPx += J.c.width * J.c.height; ch.px = J.c.width * J.c.height; ch.job = null;
        const ms = J.ms; worst = Math.max(worst, ms); bakeMs += ms; baked++; times.push(Math.round(ms));
      } else if (!ch.px) { const src = scene.textures.get(ch.key).getSourceImage(); ch.px = src.width * src.height; bakedPx += ch.px; }
      if (!ch.image) { const src = scene.textures.get(ch.key).getSourceImage(), p = PAD * K; /* (exact, not rounded: rounded up it cut past the bleed and left a hairline of sea between chunks at the whole-map zoom; rounded down a see-through layer doubled in the overlap and a pale line showed) */ ch.image = scene.add.image(ch.bb[0], ch.bb[1], ch.key).setOrigin(0, 0).setScale(1 / K).setDepth(opts.depth).setCrop(p, p, src.width - 2 * p, src.height - 2 * p); parent.add(ch.image); }
      ch.live = true; return true;
    };
    const evict = (ch) => { ch.job = null; if (ch.image) ch.image.destroy(); ch.image = null; if (scene.textures.exists(ch.key)) scene.textures.remove(ch.key); bakedPx -= ch.px || 0; ch.px = 0; ch.live = false; evicted++; };
    // Streaming: what the camera sees (and a margin round it) is painted; far chunks are let go past a memory budget.
    const cam = scene.cameras && scene.cameras.main, budget = (opts.budgetMB || 28) * 1048576 / 4;
    const viewBox = (grow) => { const v = cam && cam.worldView; if (!v || !v.width) return null; const gx = v.width * grow, gy = v.height * grow; return [v.x - gx, v.y - gy, v.x + v.width + gx, v.y + v.height + gy]; };
    const dist = (ch, v) => Math.hypot((ch.bb[0] + ch.bb[2]) / 2 - (v[0] + v[2]) / 2, (ch.bb[1] + ch.bb[3]) / 2 - (v[1] + v[3]) / 2);
    let baked = 0, evicted = 0, sliceWorst = 0; const times = [];
    // opts.lazy: nothing bakes now; the on-screen chunks come in slices on the next ticks (a repaint never freezes a frame)
    if (!opts.lazy) { const v = viewBox(.05); for (const ch of list) if (v ? meets(ch.bb, v) : false) bakeOne(ch, 0); if (parent.sort) parent.sort('depth'); }
    let dead = false;
    const tick = () => {
      if (dead) return;
      const v = viewBox(.05), near = viewBox(.45), keep = viewBox(1.3); if (!v) return;
      // chunks whose picture is already baked (a repaint for the hour, a gate opening) only need placing: put up to a few
      // milliseconds' worth of those in view at once, so a repaint at the whole-map zoom does not fill in box by box
      { const t0 = performance.now(); let placed = 0; for (const ch of list) { if (ch.live || ch.job || !meets(ch.bb, v) || !scene.textures.exists(ch.key)) continue; bakeOne(ch, 0); placed++; if (performance.now() - t0 > 4) break; } if (placed && parent.sort) parent.sort('depth'); }
      // one chunk per tick: first what is on screen, then the margin round it; each bake is small (a 256 px chunk)
      let best = null, bd = Infinity;
      for (const ch of list) if (!ch.live && meets(ch.bb, near)) { const d = dist(ch, v) - (meets(ch.bb, v) ? 1e6 : 0); if (d < bd) { bd = d; best = ch; } }
      // opts.prebake: with nothing near the view left to paint, and you standing still, the rest bakes in the background, nearest first,
      // while it fits the budget (the far mainland and the north backdrop: so the whole-map view does not fill in box by box)
      if (!best && opts.prebake && bakedPx < budget * .92 && !(typeof _gw !== 'undefined' && _gw.moving)) for (const ch of list) if (!ch.live) { const d = dist(ch, v); if (d < bd) { bd = d; best = ch; } }
      // (vf-perf) the slice comes out of the one budget every background painter shares a frame (94-garden-paint-0budget.js)
      if (best) { const room = typeof gardenBakeRoom === 'function' ? gardenBakeRoom(opts.slice || 12, !meets(best.bb, v)) : opts.slice || 12, b0 = performance.now();
        if (room >= 1.5 && bakeOne(best, room) && parent.sort) parent.sort('depth');
        if (typeof gardenBakeSpent === 'function') gardenBakeSpent(performance.now() - b0); }
      if (bakedPx > budget) { let far = null, fd = -1; for (const ch of list) if (ch.live && !meets(ch.bb, keep)) { const d = dist(ch, v); if (d > fd) { fd = d; far = ch; } } if (far) evict(far); }
      // opts.under (rule 16): this layer is a soft placeholder under a sharper one, shown only where that one has a chunk
      // still to paint (so you see the painted ground, a little soft, never bare lawn), and hidden once it is all there
      // (vale final fix 1) at the whole-map zoom this soft copy is sharp enough on its own: it shows everywhere and the sharp layer
      // stands aside, so the map is one even painting (squares of the two side by side read as lighter and darker tiles)
      const low = !!(opts.under && opts.under.lowHide && cam && cam.zoom < .42 && !list.some(ch => !ch.live && meets(ch.bb, v)));
      if (opts.under && opts.under.lowHide) ok(() => opts.under.lowHide(low));
      if (opts.under) for (const ch of list) if (ch.image) { const show = low || !ok(() => opts.under.readyIn(ch.bb)); if (ch.image.visible !== show) ch.image.setVisible(show); }
    };
    const timer = setInterval(() => ok(tick), 34);
    return {
      // Readiness follows the same current-view margin as the existing streamer.
      pendingInView() { const v = viewBox(.05); if (dead || !v) return 0; let count = 0; for (const ch of list) if (!ch.live && meets(ch.bb, v)) count++; return count; },
      // every chunk of this layer that meets the box (inside its bleed) is painted and placed
      readyIn(bb) { const inner = [bb[0] + PAD, bb[1] + PAD, bb[2] - PAD, bb[3] - PAD]; for (const ch of list) if (!ch.live && meets([ch.bb[0] + PAD, ch.bb[1] + PAD, ch.bb[2] - PAD, ch.bb[3] - PAD], inner)) return false; return true; },
      chunks: list.length, get pending() { return list.filter(c => !c.live).length; }, get worstMs() { return Math.round(worst); }, get sliceWorstMs() { return Math.round(sliceWorst); }, get bakeMs() { return Math.round(bakeMs); }, buildMs: Math.round(performance.now() - t0),
      get texturePx() { return bakedPx; }, get p95() { const t = times.slice(-200).sort((a, b) => a - b); return t.length ? t[Math.floor(t.length * .95)] : 0; }, get median() { const t = times.slice(-200).sort((a, b) => a - b); return t.length ? t[t.length >> 1] : 0; }, get baked() { return baked; }, get evicted() { return evicted; }, get live() { return list.filter(c => c.live).length; },
      destroy(keepTextures) { dead = true; clearInterval(timer); for (const ch of list) { if (ch.image) ch.image.destroy(); ch.image = null; ch.live = false; if (!keepTextures && scene.textures.exists(ch.key)) scene.textures.remove(ch.key); } },
    };
  }

  /* ---------- occluder sprites ---------- */
  // box [x0, y0, x1, y1] round the anchor (the base line point); returns an image whose depth is its base line
  // shade: true (or { a }) when it stands on the ground: the shared kit lays its shadow there (GardenPaintGround.cast).
  // Its picture follows the camera like the ground does: close up it is painted again at the level the zoom needs (sharpen).
  const sharp = new Map();   // texture key -> { scene, key, box, draw, K0, K, images: Set, seen }
  let sharpTimer = null, sharpPx = 0, sharpWorst = 0, sharpWorstKey = '', sharpWalkWorst = 0, lastMove = 0; const firstMs = new Map();
  const SHARP_BUDGET = 20 * 1048576 / 4, SHARP_ONE = 2.6e6;
  // show every image of a sprite at another picture of it, keeping whatever scaling its painter gave it
  const swap = (S, tex, K) => { const f = S.K / K; for (const im of S.images) { if (!im.active) continue; im.setTexture(tex).setScale(im.scaleX * f, im.scaleY * f); if (im._gpvBase) im._gpvBase *= f; } };
  const plain = S => { swap(S, S.key, S.K0); if (S.tex && S.scene.textures.exists(S.tex)) S.scene.textures.remove(S.tex); sharpPx -= S.px; S.tex = null; S.K = S.K0; S.px = 0; };
  function sharpen() {
    // (speed pass) nothing left to sharpen (the garden was left: its sprites went with its scene): the timer stops, and the next
    // sprite stood starts it again (sprite() below)
    if (!sharp.size) { if (sharpTimer) { clearInterval(sharpTimer); sharpTimer = null; } return; }
    const G = window.GardenPaintGround; if (!G || !sharp.size) return; const now = performance.now(); let best = null, bd = Infinity, moving = (typeof _gw !== 'undefined' && !!_gw.moving) || (typeof gardenBakeWalking === 'function' && gardenBakeWalking());   /* (n-move: a friend walking on the screen counts) */ if (moving) lastMove = now; const settled = now - lastMove > 900;
    for (const [key, S] of sharp) {
      for (const im of S.images) if (!im.active) S.images.delete(im);
      if (!S.images.size) { if (S.tex) { sharpPx -= S.px; ok(() => { if (S.scene.textures.exists(S.tex)) S.scene.textures.remove(S.tex); }); } sharp.delete(key); continue; }   /* (its scene may be gone with it) */
      const cam = S.scene.cameras && S.scene.cameras.main, v = cam && cam.worldView; if (!v || !v.width) continue;
      const w = S.box[2] - S.box[0], h = S.box[3] - S.box[1]; let want = G.levelFor(cam.zoom, S.K0, 4); while (want > S.K0 && (w * h * want * want > SHARP_ONE || S.ms0 * (want / S.K0) ** 2 > 40)) want = G.LEVELS[G.LEVELS.indexOf(want) - 1] || S.K0; /* (never a painting that would take a long task: its first painting was timed) */ if (want < S.K0) want = S.K0;
      let d = Infinity; for (const im of S.images) { if (im.x + S.box[2] < v.x || im.x + S.box[0] > v.right || im.y + S.box[3] < v.y || im.y + S.box[1] > v.bottom) continue; d = Math.min(d, Math.hypot(im.x - v.centerX, im.y - v.centerY)); }
      if (d < Infinity) S.seen = now;
      // out of sight for a while, or over the budget: back to the picture it was first painted at
      if (S.tex && (now - S.seen > 12000 || sharpPx > SHARP_BUDGET && d === Infinity)) { plain(S); continue; }
      // (while you walk, and for a moment after you stop, only a sprite known to paint in a few milliseconds is painted again: its first painting was timed)
      if (d < bd && S.K !== want && (want > S.K || S.tex) && !(!settled && want > S.K0 && !(S.ms0 * (want / S.K0) ** 2 < 9))) { bd = d; best = S; S.want = want; }
    }
    if (!best) return; if (typeof gardenBakeRoom === 'function' && gardenBakeRoom(9, true) < (moving ? 5 : 9)) return; const S = best, K = S.want, t0 = performance.now();
    if (K <= S.K0) { plain(S); return; }
    const [x0, y0, x1, y1] = S.box, w = Math.ceil((x1 - x0) * K), h = Math.ceil((y1 - y0) * K), c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true }); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);   // (in memory: a canvas texture reads every pixel back as it is made, and from the graphics card that read was most of a 1.8 s stall while walking; round 3 integration, CPU profile)
    if (ok(() => (S.draw(brush(cx)), 1)) == null) { S.K0 = 99; return; }   // (it would not paint again: leave it as it is)
    const tex = S.key + '|x' + K; if (S.scene.textures.exists(tex)) S.scene.textures.remove(tex); S.scene.textures.addImage(tex, c);   // (vale final: addImage, no read-back, rule 16)
    swap(S, tex, K); if (typeof gardenBakeSpent === 'function') gardenBakeSpent(performance.now() - t0);
    if (S.tex) { S.scene.textures.remove(S.tex); sharpPx -= S.px; } S.tex = tex; S.K = K; S.px = w * h; sharpPx += S.px; { const ms = performance.now() - t0; if (ms > sharpWorst) sharpWorstKey = S.key + ' x' + K; sharpWorst = Math.max(sharpWorst, ms); if (moving) sharpWalkWorst = Math.max(sharpWalkWorst, ms); if (!(S.ms0 >= 0)) S.ms0 = ms / (K / S.K0) ** 2; }
  }
  function sprite(scene, parent, key, box, draw, x, y, K, shade) {
    K = K || 1.5; let px = 0;
    if (!scene.textures.exists(key)) {
      const [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * K), h = Math.ceil((y1 - y0) * K); if (w < 2 || h < 2 || w > 4096 || h > 4096) return null;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
      const d0 = performance.now(); if (ok(() => (draw(brush(cx)), 1)) == null) return null;
      scene.textures.addImage(key, c); px = w * h; firstMs.set(key, performance.now() - d0); if (firstMs.size > 600) firstMs.delete(firstMs.keys().next().value);   // (rule 16: addImage, as the chunks do; a CanvasTexture reads every pixel back as it is made, up to seconds with the card busy)
    }
    const [x0, y0, x1, y1] = box;
    const im = scene.add.image(x, y, key).setOrigin(-x0 / (x1 - x0), -y0 / (y1 - y0)).setScale(1 / K).setDepth(y);
    parent.add(im); im._gptPx = px;
    if (K >= .75 && K < 4) { let S = sharp.get(key); if (!S || S.scene !== scene) { if (S && S.tex && S.scene.textures.exists(S.tex)) { S.scene.textures.remove(S.tex); sharpPx -= S.px; } S = { scene, key, box, draw, K0: K, K, images: new Set(), seen: performance.now(), tex: null, px: 0, ms0: firstMs.get(key) }; sharp.set(key, S); } S.images.add(im); if (S.tex) im.setTexture(S.tex).setScale(im.scaleX * S.K0 / S.K); if (!sharpTimer) sharpTimer = setInterval(() => ok(sharpen), 90); }
    if (shade && window.GardenPaintGround && GardenPaintGround.cast) { const id = GardenPaintGround.cast.add(scene, { key, x, y, box, a: shade.a }); if (id) im.once('destroy', () => GardenPaintGround.cast.drop(id)); }
    return im;
  }
  const sharpStatus = () => ({ sprites: sharp.size, sharp: [...sharp.values()].filter(S => S.tex).length, MB: +(sharpPx * 4 / 1048576).toFixed(1), worstMs: Math.round(sharpWorst), worst: sharpWorstKey, worstWalkingMs: Math.round(sharpWalkWorst) });

  return { rng, hash, hashStr, noise, fbm, brush, rockBand, resample, normals, bboxOf, meets, tiles, chunked, sprite, sharpStatus, mix, rgba, P2, get lastError() { return lastError; }, set lastError(v) { lastError = v; } };
})();
