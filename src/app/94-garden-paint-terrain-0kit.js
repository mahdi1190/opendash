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
      heather(r, x, y, rx, P, bloom) {
        const ry = rx * .55;
        B.f(D().blob(r, x + rx * .1, y + ry * .15, rx, ry, 8, .5), P.heatherLo, .9).f(D().blob(r, x - rx * .05, y - ry * .1, rx * .82, ry * .78, 8, .5), P.heather).f(D().blob(r, x - rx * .3, y - ry * .35, rx * .4, ry * .32, 7, .5), P.heatherHi, .7);
        if (bloom) for (let i = 0; i < 5; i++) B.f(B.circ(x + (r() - .6) * rx * 1.3, y + (r() - .7) * ry, .9 + r() * .6), bloom, .85);
        return B;
      },
      text(t, x, y, size, color) { cx.font = size + 'px Georgia, serif'; cx.fillStyle = color; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y); return B; },
    };
    return B;
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
  function chunked(scene, parent, ops, opts) {
    const K = opts.K || 1.5, size = opts.chunk || 512, box = opts.box, cols = Math.ceil(box.w / size), rows = Math.ceil(box.h / size), list = [];
    const t0 = performance.now(); let worst = 0, bakedPx = 0, bakeMs = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const bb = [box.x + i * size, box.y + j * size, Math.min(box.x + box.w, box.x + (i + 1) * size), Math.min(box.y + box.h, box.y + (j + 1) * size)];
      const mine = ops.filter(o => meets(o.bb, bb)); if (!mine.length || mine.every(o => o.decor)) continue;
      list.push({ i, j, bb, ops: mine, key: opts.key + '|' + i + ',' + j, image: null });
    }
    const bakeOne = (ch) => {
      const s = performance.now();
      if (!scene.textures.exists(ch.key)) {
        const w = Math.ceil((ch.bb[2] - ch.bb[0]) * K), h = Math.ceil((ch.bb[3] - ch.bb[1]) * K);
        const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
        cx.setTransform(K, 0, 0, K, -ch.bb[0] * K, -ch.bb[1] * K);
        const B = brush(cx);
        for (const o of ch.ops) ok(() => { cx.save(); if (o.clip) { cx.clip(o.clip, 'evenodd'); } o.draw(B, rng(o.seed || 1), ch.bb); cx.restore(); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; });
        scene.textures.addCanvas(ch.key, c); bakedPx += w * h;
      }
      ch.image = scene.add.image(ch.bb[0], ch.bb[1], ch.key).setOrigin(0, 0).setScale(1 / K).setDepth(opts.depth);
      parent.add(ch.image);
      const ms = performance.now() - s; worst = Math.max(worst, ms); bakeMs += ms;
    };
    // the chunks the camera sees now are painted at once (this is the scene build, not a walk), the rest a slice per frame
    const cam = scene.cameras && scene.cameras.main, view = cam && cam.worldView, near = ch => view && meets(ch.bb, [view.x - 64, view.y - 64, view.x + view.width + 64, view.y + view.height + 64]);
    const queue = list.slice(), centre = view ? [view.centerX, view.centerY] : [box.x + box.w / 2, box.y + box.h / 2];
    queue.sort((a, b) => Math.hypot((a.bb[0] + a.bb[2]) / 2 - centre[0], (a.bb[1] + a.bb[3]) / 2 - centre[1]) - Math.hypot((b.bb[0] + b.bb[2]) / 2 - centre[0], (b.bb[1] + b.bb[3]) / 2 - centre[1]));
    for (let k = queue.length - 1; k >= 0; k--) if (near(queue[k])) { bakeOne(queue[k]); queue.splice(k, 1); }
    if (parent.sort) parent.sort('depth');
    let dead = false;
    const tick = () => {
      if (dead || !queue.length) return;
      const s = performance.now();
      // nearest to the camera first; at most one chunk a frame, and none while the frame is already late
      const v = cam && cam.worldView; if (v) { const c = [v.centerX, v.centerY]; let bi = 0, bd = Infinity; for (let k = 0; k < queue.length; k++) { const q = queue[k], d = Math.hypot((q.bb[0] + q.bb[2]) / 2 - c[0], (q.bb[1] + q.bb[3]) / 2 - c[1]); if (d < bd) { bd = d; bi = k; } } const [ch] = queue.splice(bi, 1); bakeOne(ch); }
      else bakeOne(queue.shift());
      if (parent.sort) parent.sort('depth');
      void s;
    };
    const timer = setInterval(() => { if (!dead) ok(tick); if (!queue.length) clearInterval(timer); }, 60);
    return {
      chunks: list.length, get pending() { return queue.length; }, get worstMs() { return Math.round(worst); }, get bakeMs() { return Math.round(bakeMs); }, buildMs: Math.round(performance.now() - t0),
      get texturePx() { return bakedPx; },
      destroy(keepTextures) { dead = true; clearInterval(timer); for (const ch of list) { if (ch.image) ch.image.destroy(); ch.image = null; if (!keepTextures && scene.textures.exists(ch.key)) scene.textures.remove(ch.key); } },
    };
  }

  /* ---------- occluder sprites ---------- */
  // box [x0, y0, x1, y1] round the anchor (the base line point); returns an image whose depth is its base line
  function sprite(scene, parent, key, box, draw, x, y, K) {
    K = K || 1.5; let px = 0;
    if (!scene.textures.exists(key)) {
      const [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * K), h = Math.ceil((y1 - y0) * K); if (w < 2 || h < 2 || w > 4096 || h > 4096) return null;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
      if (ok(() => (draw(brush(cx)), 1)) == null) return null;
      scene.textures.addCanvas(key, c); px = w * h;
    }
    const [x0, y0, x1, y1] = box;
    const im = scene.add.image(x, y, key).setOrigin(-x0 / (x1 - x0), -y0 / (y1 - y0)).setScale(1 / K).setDepth(y);
    parent.add(im); im._gptPx = px; return im;
  }

  return { rng, hash, hashStr, noise, fbm, brush, resample, normals, bboxOf, meets, tiles, chunked, sprite, mix, rgba, P2, get lastError() { return lastError; }, set lastError(v) { lastError = v; } };
})();
