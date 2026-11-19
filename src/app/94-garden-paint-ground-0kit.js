/* The shared paint kit (docs/dev/PAINT_KIT.md): the foundations every region painter builds on.
 *
 *   1. layer()   a chunked ground layer whose sharpness follows the camera. Each 256 px chunk is baked at the
 *                level the zoom needs (.75 to 4 canvas px per world px), a few milliseconds at a time on a
 *                timer (never inside a frame), nearest the screen first; the old picture stays up until the
 *                sharper one is ready, and chunks far from the screen are let go past a memory budget.
 *   2. ground()  one ground for the whole map from the layout: lawn, meadow, forest floor, moor, sand,
 *                shingle, soil and marsh. Every kind has a colour field at three scales (light and shade,
 *                patches, grain), its own brushwork by hashed tiles (so chunks meet without a seam), and soft,
 *                broken transitions into its neighbours.
 *   3. paths()   one path kit: cobbled road, gravel lane, worn-earth trail, boardwalk, steps, and setts for
 *                yards and plazas. A path is a centre line with a width at every point; what is painted is a
 *                smoothed coverage of all of them together, so junctions widen and fillet by themselves, ends
 *                are round, edges are soft and trodden, and grass grows in over them.
 *   4. LIGHT     one light for the whole world (the sun is upper left, shadows fall to the right and a little
 *                down), with castShadow() and contact() for anything that stands on the ground.
 *
 * Everything is driven by layout data handed in by the caller: no cell is named in this file.
 * Only rendering: cells, walking, picking and saved rows are untouched. Nothing here runs at load. */
window.GardenPaintGround = (function () {
  'use strict';
  let lastError = null;
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function hash(a, b, c) { let n = Math.imul((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 1442695041, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return (n ^ (n >>> 16)) >>> 0; }
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const h01 = (a, b, c) => hash(a, b, c) / 4294967296;
  function noise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (h01(xi, yi, s) * (1 - u) + h01(xi + 1, yi, s) * u) * (1 - v) + (h01(xi, yi + 1, s) * (1 - u) + h01(xi + 1, yi + 1, s) * u) * v; }
  function fbm(x, y, s) { return noise(x, y, s) * .55 + noise(x * 2.1, y * 2.1, s + 7) * .3 + noise(x * 4.3, y * 4.3, s + 13) * .15; }
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const meets = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  /** Hashed tiles over a box: fn(tileX0, tileY0, r) for each tile that can reach the box. Neighbouring chunks agree. */
  function tiles(bb, size, margin, salt, fn) {
    const tx0 = Math.floor((bb[0] - margin) / size), ty0 = Math.floor((bb[1] - margin) / size), tx1 = Math.floor((bb[2] + margin) / size), ty1 = Math.floor((bb[3] + margin) / size);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) fn(tx * size, ty * size, rng(hash(tx, ty, salt) | 1));
  }
  const scaleOf = cx => { const m = cx.getTransform(); return Math.hypot(m.a, m.b) || 1; };

  /* ---------- 4. light: one direction for the whole world ---------- */
  // sx, sy: the unit vector a shadow falls along on the ground (the sun is upper left). Baked art and the moving
  // shadows of 94-garden-native-light.js both read this; only a shadow's length and strength change with the hour.
  const LIGHT = Object.freeze({ sx: .94, sy: .34, shade: '#26341c', warm: '#fff2c8' });
  /** A soft contact shadow where something meets the ground (tight and dark, a little to the lee side). */
  function contact(cx, x, y, rx, ry, a) {
    cx.save(); cx.translate(x + rx * .12 * LIGHT.sx, y + ry * .2); cx.scale(1, Math.max(.05, ry / rx));
    const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(28,38,20,' + (a == null ? .42 : a) + ')'); g.addColorStop(.55, 'rgba(28,38,20,' + (a == null ? .42 : a) * .5 + ')'); g.addColorStop(1, 'rgba(28,38,20,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, rx, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  /** The soft shadow an upright thing throws: base centre (x, y), its width and height in world px. o: { a, len } */
  function castShadow(cx, x, y, w, h, o) {
    o = o || {}; const len = Math.min(104, h * (o.len == null ? .72 : o.len)), a = o.a == null ? .24 : o.a, ex = x + LIGHT.sx * len, ey = y + LIGHT.sy * len;
    // the thing's foot laid over along the light: its base line, and the same line carried out to where its top's shadow falls
    const K = scaleOf(cx), hw = w / 2, d = Math.max(1.5, Math.min(10, w * .1)), dx = ex - x, dy = ey - y;
    cx.save(); cx.filter = 'blur(' + (Math.max(1.6, Math.min(4.5, 1.4 + w * .03)) * K).toFixed(1) + 'px)'; cx.globalAlpha = a; cx.fillStyle = LIGHT.shade;
    cx.beginPath(); cx.moveTo(x - hw, y - d); cx.lineTo(x + hw, y - d); cx.lineTo(x + hw * .9 + dx, y + dy - d * .5); cx.lineTo(x + hw * .82 + dx, y + dy + d); cx.lineTo(x - hw * .8 + dx, y + dy + d); cx.lineTo(x - hw, y + d); cx.closePath(); cx.fill(); cx.restore(); cx.filter = 'none'; cx.globalAlpha = 1;
    contact(cx, x, y, Math.max(4, w * .5), Math.max(2, Math.min(8, w * .1)), Math.min(.36, a * 1.2));
  }
  /** The shadows of low runs painted into the ground (a fence, a hedge, a field wall): runs = [[x0, y0, x1, y1, h]], each a foot
   *  line and the height of what stands on it. Every run's foot is carried out along the light and the lot is filled once,
   *  softly, so a fence that runs up the screen throws a band beside it and one that runs across a thin line below. o: { a } */
  function castRuns(cx, runs, o) {
    if (!runs || !runs.length) return; const K = scaleOf(cx), a = o && o.a != null ? o.a : .2;
    cx.save(); cx.filter = 'blur(' + (1.3 * K).toFixed(1) + 'px)'; cx.globalAlpha = a; cx.fillStyle = LIGHT.shade; cx.beginPath();
    for (const [x0, y0, x1, y1, h] of runs) { const len = Math.min(104, h * .72), dx = LIGHT.sx * len, dy = LIGHT.sy * len + 1.2; cx.moveTo(x0, y0 - .8); cx.lineTo(x1, y1 - .8); cx.lineTo(x1 + dx, y1 + dy); cx.lineTo(x0 + dx, y0 + dy); cx.closePath(); }
    cx.fill('nonzero'); cx.restore(); cx.filter = 'none'; cx.globalAlpha = 1;
  }
  /** A soft pool of warm light on the ground (a lamp, a lit window), for art baked for dusk and night. */
  function lightPool(cx, x, y, rx, ry, a, col) {
    const c = hex(col || LIGHT.warm); cx.save(); cx.translate(x, y); cx.scale(1, ry / rx); cx.globalCompositeOperation = 'lighter';
    const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a == null ? .3 : a})`); g.addColorStop(.5, `rgba(${c[0]},${c[1]},${c[2]},${(a == null ? .3 : a) * .4})`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, rx, 0, Math.PI * 2); cx.fill(); cx.restore();
  }

  /* ---------- 1. the zoom-following chunked layer ---------- */
  const LEVELS = [.75, 1, 1.5, 2, 3, 4], SHARP = .76, PAD = 2, HEAVY_MS = 26, registry = new Set(), slow = { opMs: 0, op: '', uploadMs: 0, tickMs: 0 };
  /** The bake level the camera needs now: the smallest level within 20% of the screen's own pixel density. */
  function levelFor(zoom, lo, hi) { const need = (zoom || 1) * SHARP; let k = LEVELS[LEVELS.length - 1]; for (const l of LEVELS) if (l >= need) { k = l; break; } return clamp(k, lo == null ? LEVELS[0] : lo, hi == null ? 4 : hi); }
  // ops: [{ bb: [x0, y0, x1, y1] world px, seed, clip, tag, draw(B, r, chunkBB) }]   (the shape GardenPaintTerrainKit.chunked takes)
  // opts: { key, box, chunk, depth, budgetMB, slice, lazy, prebake, K (fixed level when follow is false), minK, maxK, follow }
  function layer(scene, parent, ops, opts) {
    const size = opts.chunk || 256, box = opts.box, cols = Math.ceil(box.w / size), rows = Math.ceil(box.h / size), follow = opts.follow !== false;
    const minK = opts.minK || LEVELS[0], maxK = opts.maxK || 4, fixedK = opts.K || 1.5, slice = opts.slice || 9;
    const brushOf = cx => window.GardenPaintTerrainKit ? GardenPaintTerrainKit.brush(cx) : { cx };
    const chunks = new Map(), list = [], all = ops.slice();
    const chunkAt = (i, j) => {
      let ch = chunks.get(i + ',' + j); if (ch) return ch;
      const bb = [box.x + i * size - PAD, box.y + j * size - PAD, Math.min(box.x + box.w, box.x + (i + 1) * size) + PAD, Math.min(box.y + box.h, box.y + (j + 1) * size) + PAD];
      ch = { i, j, bb, ops: [], image: null, tex: null, K: 0, px: 0, job: null, dirty: false, id: i + ',' + j }; chunks.set(ch.id, ch); list.push(ch); return ch;
    };
    const reach = (bb, fn) => { const i0 = Math.max(0, Math.floor((bb[0] - box.x - PAD) / size)), j0 = Math.max(0, Math.floor((bb[1] - box.y - PAD) / size)), i1 = Math.min(cols - 1, Math.floor((bb[2] - box.x + PAD) / size)), j1 = Math.min(rows - 1, Math.floor((bb[3] - box.y + PAD) / size)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(i, j); };
    for (const o of all) reach(o.bb, (i, j) => { const ch = chunkAt(i, j); if (meets(o.bb, ch.bb)) ch.ops.push(o); });
    for (const ch of list.slice()) if (!ch.ops.length || ch.ops.every(o => o.decor)) { chunks.delete(ch.id); list.splice(list.indexOf(ch), 1); }
    // pictures an earlier layer of the same key left behind (a repaint that changed nothing here): place them, do not bake again
    for (const ch of list) for (const l of LEVELS.concat(follow ? [] : [fixedK])) { const k = opts.key + '|' + ch.id + '|' + l; if (scene.textures.exists(k)) { ch.cached = { key: k, K: l }; } }
    let bakedPx = 0, baked = 0, evicted = 0, worst = 0, sliceWorst = 0, bakeMs = 0, dead = false, host = parent, serial = 0, wantK = follow ? 0 : fixedK, zoomSeen = 0, zoomAt = 0, held = 0;
    const times = [], cam = scene.cameras && scene.cameras.main, budget = (opts.budgetMB || 32) * 1048576 / 4;
    const place = (ch, key, K, w, h) => {
      const p = PAD * K, im = scene.add.image(ch.bb[0], ch.bb[1], key).setOrigin(0, 0).setScale(1 / K).setDepth(opts.depth).setCrop(p, p, w - 2 * p, h - 2 * p);
      if (ch.image) ch.image.destroy(); if (ch.tex && ch.tex !== key && scene.textures.exists(ch.tex)) scene.textures.remove(ch.tex);
      bakedPx += w * h - ch.px; ch.px = w * h; ch.image = im; ch.tex = key; ch.K = K; ch.dirty = false; if (host) { host.add(im); if (host.sort) host.sort('depth'); }
    };
    const adopt = ch => { const c = ch.cached; ch.cached = null; if (!c || !scene.textures.exists(c.key)) return false; const src = scene.textures.get(c.key).getSourceImage(); place(ch, c.key, c.K, src.width, src.height); return true; };
    // one slice of one chunk's bake: its ops run into its canvas until the slice is used; the picture swaps in when the last op is done
    const bakeStep = (ch, K, ms) => {
      const s = performance.now();
      if (!ch.job || ch.job.K !== K) { const w = Math.ceil((ch.bb[2] - ch.bb[0]) * K), h = Math.ceil((ch.bb[3] - ch.bb[1]) * K), c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -ch.bb[0] * K, -ch.bb[1] * K); ch.job = { c, cx, B: brushOf(cx), next: 0, ms: 0, K }; }
      const J = ch.job, cx = J.cx;
      while (J.next < ch.ops.length) {
        const o = ch.ops[J.next++], o0 = performance.now();
        ok(() => { cx.save(); if (o.clip) cx.clip(o.clip, 'evenodd'); o.draw(J.B, rng(o.seed || 1), ch.bb); cx.restore(); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.filter = 'none'; });
        { const od = performance.now() - o0, per = od / (K * K); if (!(o.cost >= per)) o.cost = per; if (od > slow.opMs) { slow.opMs = +od.toFixed(1); slow.op = (o.tag || o.name || 'seed ' + o.seed) + ' @' + ch.id + ' x' + K; } }
        if (ms && performance.now() - s > ms) break;
      }
      const took = performance.now() - s; J.ms += took; sliceWorst = Math.max(sliceWorst, took);
      if (J.next < ch.ops.length) return false;
      const key = opts.key + '|' + ch.id + '|' + K;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const u0 = performance.now();
      { const t = scene.textures.addImage(key, J.c); if (t && typeof t.refresh !== 'function') t.refresh = function () { for (const src of this.source) src.update(); return this; }; }
      ch.job = null; place(ch, key, K, J.c.width, J.c.height); slow.uploadMs = Math.max(slow.uploadMs, +(performance.now() - u0).toFixed(1));
      worst = Math.max(worst, J.ms); bakeMs += J.ms; baked++; times.push(Math.round(J.ms)); if (times.length > 400) times.splice(0, 200);
      return true;
    };
    const evict = ch => { ch.job = null; if (ch.image) ch.image.destroy(); ch.image = null; if (ch.tex && scene.textures.exists(ch.tex)) scene.textures.remove(ch.tex); ch.tex = null; bakedPx -= ch.px; ch.px = 0; ch.K = 0; evicted++; };
    const viewBox = grow => { const v = cam && cam.worldView; if (!v || !v.width) return null; const gx = v.width * grow, gy = v.height * grow; return [v.x - gx, v.y - gy, v.x + v.width + gx, v.y + v.height + gy]; };
    const dist = (ch, v) => Math.hypot((ch.bb[0] + ch.bb[2]) / 2 - (v[0] + v[2]) / 2, (ch.bb[1] + ch.bb[3]) / 2 - (v[1] + v[3]) / 2);
    // the level follows the zoom once the zoom has rested a moment (a wheel turn passes through many zooms)
    const pxAt = k => ((size + 2 * PAD) * k) ** 2;   /* (a chunk's canvas px at a level) */
    const level = () => {
      if (!follow) return fixedK; const z = cam ? cam.zoom || 1 : 1, now = performance.now();
      if (Math.abs(z - zoomSeen) > zoomSeen * .012) { zoomSeen = z; zoomAt = now; if (wantK) return wantK; }
      if (!wantK || now - zoomAt > 220) {
        // (never sharper than the budget can hold over one screen: the chunks a screen can touch, at that level)
        let k = levelFor(z, minK, maxK); const vw = cam && cam.worldView;
        if (vw && vw.width) { const n = (vw.width / size + 1) * (vw.height / size + 1); while (k > minK && n * pxAt(k) > budget) k = LEVELS[LEVELS.indexOf(k) - 1] || minK; }
        wantK = k;
      }
      return wantK;
    };
    if (!opts.lazy) { const v = viewBox(.05), K = level(); for (const ch of list) if (v && meets(ch.bb, v)) { if (!adopt(ch)) bakeStep(ch, Math.min(K, 1.5), 0); } }
    const heavy = (ch, k) => { const lim = HEAVY_MS / (k * k); for (const o of ch.ops) if (o.cost > lim) return true; return false; };
    const tick = () => {
      if (dead || !host) return; if (!scene.textures || !scene.textures.game) { dead = true; clearInterval(timer); registry.delete(handle); return; }   /* (its scene is gone: stop, quietly) */
      const v = viewBox(.05), near = viewBox(.35), keep = viewBox(.7); if (!v) return; const K = level(), moving = typeof _gw !== 'undefined' && !!_gw.moving;
      { const t0 = performance.now(); for (const ch of list) { if (ch.image || !ch.cached || !meets(ch.bb, near)) continue; adopt(ch); if (performance.now() - t0 > 4) break; } }
      // one chunk a tick: on screen and bare first, then on screen and at the wrong sharpness or repainted, then the margin
      let best = null, bs = Infinity, wantRoom = false; held = 0;
      for (const ch of list) {
        const inView = meets(ch.bb, v), inNear = inView || meets(ch.bb, near); if (!inNear) continue;
        const need = !ch.image ? 0 : ch.dirty ? 1 : ch.K !== K ? (ch.K < K ? 2 : 4) : -1; if (need < 0) continue;
        /* (the margin round the screen is painted at the full level only while that fits the budget; a bare chunk there is painted at the lowest level instead, so nothing walks on to the screen unpainted) */
        let low = false; if (!inView && need !== 1 && bakedPx - ch.px + pxAt(K) > budget) { wantRoom = true; if (ch.image || !follow || K <= minK || bakedPx + pxAt(minK) > budget) continue; low = true; }
        ch.low = low;
        if (moving && need > 1 && heavy(ch, K)) { held++; continue; }
        const s = (inView ? 0 : 1e7) + need * 1e6 + dist(ch, v) - (ch.job ? 5e5 : 0); if (s < bs) { bs = s; best = ch; }
      }
      if (!best && opts.prebake && bakedPx < budget * .9 && !(typeof _gw !== 'undefined' && _gw.moving)) for (const ch of list) if (!ch.image) { const d = dist(ch, v); if (d < bs) { bs = d; best = ch; } }
      if (best) { let k = follow && (best.low || !meets(best.bb, near)) ? Math.min(K, minK) : K; if (moving && follow && !best.image) for (const l of [2, 1.5, 1]) if (k > l && l >= minK && heavy(best, k)) k = l; bakeStep(best, k, slice); }
      // over the budget: let go the farthest, sharpest chunk that is off the screen (one well away first); short of room for the margin: one well away
      if (bakedPx > budget || wantRoom) { const over = bakedPx > budget; let far = null, fd = -1; for (const ch of list) { if (!ch.image || meets(ch.bb, v)) continue; const away = !meets(ch.bb, keep); if (!away && !over) continue; const d = dist(ch, v) * ch.K * (away ? 1 : .001); if (d > fd) { fd = d; far = ch; } } if (far) evict(far); }
    };
    const timer = setInterval(() => { const t0 = performance.now(); ok(tick); const d = performance.now() - t0; if (d > slow.tickMs) slow.tickMs = +d.toFixed(1); }, 34);
    const handle = {
      key: opts.key, follow,
      // an op added later is baked into every chunk it touches; a chunk already painted is painted again behind its old picture, in slices
      add(o) { all.push(o); reach(o.bb, (i, j) => { const ch = chunkAt(i, j); if (!meets(o.bb, ch.bb)) return; ch.ops.push(o); if (ch.cached) { if (scene.textures.exists(ch.cached.key)) scene.textures.remove(ch.cached.key); ch.cached = null; } if (ch.image && !ch.job) ch.dirty = true; }); return o; },
      /** Replace the op with this tag (null removes it). The same sig again is a no-op; a change repaints the chunks it touches. */
      set(tag, o, sig) {
        const old = all.find(q => q.tag === tag); if (old && o && old.sig === sig) return false; if (!old && !o) return false;
        if (old) { all.splice(all.indexOf(old), 1); for (const ch of list) { const k = ch.ops.indexOf(old); if (k >= 0) { ch.ops.splice(k, 1); ch.job = null; if (ch.image) ch.dirty = true; if (ch.cached) { if (scene.textures.exists(ch.cached.key)) scene.textures.remove(ch.cached.key); ch.cached = null; } } } }
        if (o) { o.tag = tag; o.sig = sig; if (old) { all.push(o); reach(o.bb, (i, j) => { const ch = chunkAt(i, j); if (meets(o.bb, ch.bb)) { ch.ops.push(o); ch.job = null; if (ch.image) ch.dirty = true; } }); } else handle.add(o); }
        return true;
      },
      attach(p) { host = p; if (!p) return; const v = viewBox(.4); for (const ch of list) if (!ch.image && ch.cached && (!v || meets(ch.bb, v))) adopt(ch); },
      /** Take the pictures off the stage but keep them (the world is being rebuilt round them). */
      detach() { if (!host) return; for (const ch of list) if (ch.image) { ch.image.destroy(); ch.image = null; if (ch.tex) ch.cached = { key: ch.tex, K: ch.K }; ch.tex = null; bakedPx -= ch.px; ch.px = 0; ch.K = 0; ch.job = null; } host = null; },
      pendingInView() { const v = viewBox(.05); if (dead || !v) return 0; let n = 0; for (const ch of list) if (!ch.image && meets(ch.bb, v)) n++; return n; },
      softInView() { const v = viewBox(.05), K = level(); if (dead || !v) return 0; let n = 0; for (const ch of list) if (meets(ch.bb, v) && (!ch.image || ch.K < K || ch.dirty)) n++; return n; },
      chunks: list.length, get pending() { return list.filter(c => !c.image).length; }, get worstMs() { return Math.round(worst); }, get sliceWorstMs() { return Math.round(sliceWorst); }, get bakeMs() { return Math.round(bakeMs); }, buildMs: 0,
      get texturePx() { return bakedPx; }, get MB() { return +(bakedPx * 4 / 1048576).toFixed(1); }, get level() { return wantK; },
      get p95() { const t = times.slice(-200).sort((a, b) => a - b); return t.length ? t[Math.floor(t.length * .95)] : 0; }, get median() { const t = times.slice(-200).sort((a, b) => a - b); return t.length ? t[t.length >> 1] : 0; },
      get baked() { return baked; }, get evicted() { return evicted; }, get held() { return held; }, get live() { return list.filter(c => c.image).length; },
      /** Stop painting but stay on the stage (a newer layer is taking over); destroy() follows. */
      retire() { dead = true; clearInterval(timer); for (const ch of list) ch.job = null; },
      destroy(keepTextures) { dead = true; clearInterval(timer); registry.delete(handle); for (const ch of list) { if (ch.image) ch.image.destroy(); ch.image = null; ch.job = null; if (!keepTextures) { if (ch.tex && scene.textures.exists(ch.tex)) scene.textures.remove(ch.tex); if (ch.cached && scene.textures.exists(ch.cached.key)) scene.textures.remove(ch.cached.key); } } },
    };
    registry.add(handle); return handle;
  }

  /** Cut a soft-edged hole in what is painted so far (the ground beneath shows through): shape is a Path2D in world px,
   *  feather the fade's width in world px, o: { stroke: line width (cut along a line instead of filling), rule, a }. */
  function softCut(cx, shape, feather, o) {
    o = o || {}; const K = scaleOf(cx); cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.globalAlpha = o.a == null ? 1 : o.a; cx.filter = 'blur(' + Math.max(1, Math.round((feather || 8) * K)) + 'px)'; cx.fillStyle = '#000'; cx.strokeStyle = '#000'; cx.lineCap = 'round'; cx.lineJoin = 'round';
    if (o.stroke) { cx.lineWidth = o.stroke; cx.stroke(shape); } else cx.fill(shape, o.rule || 'nonzero');
    cx.restore(); cx.filter = 'none'; cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  /* ---------- small shared canvases ---------- */
  const pool = new Map();
  function scratch(name, w, h, opts) { let s = pool.get(name); if (!s) { const c = document.createElement('canvas'); s = { c, cx: c.getContext('2d', opts || undefined) }; pool.set(name, s); } if (s.c.width !== w || s.c.height !== h) { s.c.width = w; s.c.height = h; } else { s.cx.setTransform(1, 0, 0, 1, 0, 0); s.cx.globalCompositeOperation = 'source-over'; s.cx.globalAlpha = 1; s.cx.filter = 'none'; s.cx.clearRect(0, 0, w, h); } return s; }

  /* ---------- 4b. the shadows of standing sprites ---------- */
  // A painter that stands a sprite on the ground (a wall, a cairn, a lamp post, a pine) hands it to cast.add(), or stands it
  // with GardenPaintTerrainKit.sprite(..., shade), which does. Its shadow is its own silhouette laid over on the ground along
  // LIGHT, squashed and blurred, with a tight dark contact along its foot: so a wall throws a wall's shadow and a lamp a
  // lamp's, all the same way. They are baked into one soft layer just over the ground (level 1: a shadow has no detail to
  // sharpen), a slice at a time, only where something stands.
  const cast = (function () {
    const items = new Map(); let L = null, at = null, sweep = null;
    const lean = h => { const len = Math.min(.72, 104 / Math.max(1, h)); return { a: LIGHT.sx * len, b: LIGHT.sy * len }; };   /* (as the moving shadows fall: along LIGHT, with no extra flattening, or a low thing's shadow is a hairline hidden by its own foot) */
    const source = it => { const T = it.scene.textures; if (!T.exists(it.key)) return null; const s = T.get(it.key).getSourceImage(); return s && s.width > 1 ? s : null; };
    function opOf(it) {
      const h = -it.box[1], w = it.box[2] - it.box[0], { a, b } = lean(h);
      return { bb: [it.x + it.box[0] - 10, it.y - 12, it.x + it.box[2] + a * h + 12, it.y + b * h + 14], seed: 1, name: 'shadow', draw(B) {
        const cx = B.cx, src = source(it); if (!src) return; const K = scaleOf(cx), c = cx.canvas, s = scratch('cast', c.width, c.height), sc = s.cx, k = src.width / w, rows = Math.min(src.height, Math.round((h + 1) * k));
        // (no pixel is read back from the sprite: reading one made the browser fetch the whole picture from the graphics card, 50 to 240 ms)
        const lay = (m, y0, n, alpha, blur) => {
          sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, c.width, c.height);
          sc.setTransform(cx.getTransform()); sc.transform(it.flip ? -m[0] : m[0], m[1], m[2], m[3], it.x, it.y);   /* (a sprite drawn flipped throws its mirror image) */ sc.imageSmoothingEnabled = true; sc.drawImage(src, 0, y0, src.width, n, it.box[0], it.box[1] + y0 / k, w, n / k);
          sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = LIGHT.shade; sc.fillRect(0, 0, c.width, c.height); sc.globalCompositeOperation = 'source-over';
          cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = alpha; cx.filter = 'blur(' + (blur * K).toFixed(1) + 'px)'; cx.drawImage(s.c, 0, 0); cx.restore(); cx.filter = 'none'; cx.globalAlpha = 1;
        };
        // the silhouette of what stands above the base line, laid over on the ground: a point h px up lands a little right and below
        lay([1, 0, -a, -b], 0, rows, it.a, 1.5);
        // the contact: the lowest hand's breadth of it, folded down in front of its foot, so the dark line is exactly as wide as what stands there
        const strip = Math.min(rows, Math.max(2, Math.round(Math.min(9, h * .3) * k))); lay([1, 0, -.12, -.5], rows - strip, strip, Math.min(.5, it.a), 1.1);
      } };
    }
    const idOf = o => o.key + '@' + Math.round(o.x) + ',' + Math.round(o.y);
    /** Stand a sprite's shadow on the ground. o: { key (its texture), x, y (its base, world px), box [x0, y0, x1, y1] about the base, a (strength) } */
    function add(scene, o) {
      if (!o || !o.key || !o.box || !(o.box[1] < -6) || (o.box[2] - o.box[0]) * -o.box[1] > 5e5) return null; /* (nothing flat, and nothing as big as a hillside: that is terrain, with its own shade) */ const id = idOf(o), old = items.get(id); if (old) { old.gone = 0; return id; }
      const W = at && at.W || (typeof GARDEN_WORLD !== 'undefined' ? GARDEN_WORLD : null); if (W && typeof gardenIslandBaseCell === 'function') { const c = gardenIslandBaseCell(Math.floor(o.x / W.cellW), Math.floor((o.y - 3 - W.sky) / W.cellH)); if (c && (c.ocean || c.freshwater)) return null; }   // (afloat: the water chain owns what a boat does to the water)
      const it = { id, scene, key: o.key, x: o.x, y: o.y, box: o.box.slice(), a: o.a == null ? .5 : o.a, flip: !!o.flip, gone: 0 }; items.set(id, it); if (L) L.set('s|' + id, opOf(it), id); return id;
    }
    /** Its sprite is gone. The shadow goes a moment later, unless the same sprite is stood again (a repaint), so nothing flickers. */
    function drop(id) { const it = items.get(id); if (!it) return; it.gone = performance.now(); arm(); }
    function arm() { if (sweep) return; sweep = setTimeout(() => { sweep = null; const now = performance.now(); let later = false; for (const [k, q] of items) { if (!q.gone) continue; if (now - q.gone < 900) { later = true; continue; } items.delete(k); if (L) L.set('s|' + k, null); } if (later) arm(); }, 1000); }
    /** The ground is on the stage: put the shadow layer over it (parent: the ground's container; W: the world's cell sizes). */
    function attach(scene, parent, box, W) {
      if (L && at && at.scene !== scene) { ok(() => L.destroy()); L = null; }   /* (a new scene: the old one's pictures went with it) */
      at = { scene, W };
      if (!L) { L = layer(scene, parent, [...items.values()].filter(q => q.scene === scene).map(q => Object.assign(opOf(q), { tag: 's|' + q.id, sig: q.id })).concat([...ovals].map(([id, o]) => Object.assign(ovalOp(o.q), { tag: 'o|' + id, sig: o.sig }))), { key: 'gdcast', box, chunk: 256, depth: -9340, budgetMB: 10, follow: false, K: .75, lazy: true, slice: 7 }); for (const [k, q] of items) if (q.scene !== scene) items.delete(k); }
      else L.attach(parent);
    }
    function detach() { if (L) L.detach(); }
    // Things that have no sprite of their own to lay over (a library building, a bench): a soft oval thrown the same way.
    // list: [{ id, x, y (base, world px), w, h, a }]; the whole set each time, and only what changed is painted again.
    const ovals = new Map();
    const ovalOp = q => { const len = Math.min(104, q.h * .72); return { bb: [q.x - q.w * .6 - 12, q.y - 24, q.x + LIGHT.sx * len + q.w * .6 + 14, q.y + LIGHT.sy * len + 28], seed: 1, name: 'oval', draw(B) { castShadow(B.cx, q.x, q.y, q.w, q.h, { a: q.a }); } }; };
    function blobs(list) {
      const seen = new Set();
      for (const q of list) { const sig = [Math.round(q.x), Math.round(q.y), Math.round(q.w), Math.round(q.h), q.a].join(':'); seen.add(q.id); const old = ovals.get(q.id); if (old && old.sig === sig) continue; ovals.set(q.id, { q: Object.assign({}, q), sig }); if (L) L.set('o|' + q.id, ovalOp(q), sig); }
      for (const id of [...ovals.keys()]) if (!seen.has(id)) { ovals.delete(id); if (L) L.set('o|' + id, null); }
    }
    /** What throws a shadow now (for checking a place): [{ id, x, y, w, h, sprite }] */
    const list = () => [...items.values()].map(q => ({ id: q.key.split('|').slice(-2).join('|'), x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.box[2] - q.box[0]), h: Math.round(-q.box[1]), sprite: true, gone: !!q.gone })).concat([...ovals].map(([id, o]) => ({ id: String(id), x: Math.round(o.q.x), y: Math.round(o.q.y), w: Math.round(o.q.w), h: Math.round(o.q.h), sprite: false })));
    return { add, drop, attach, detach, blobs, list, get count() { return items.size + ovals.size; }, get layer() { return L; } };
  })();

  /* ---------- 2. the ground kinds ---------- */
  const KINDS = ['lawn', 'meadow', 'forest', 'oldwood', 'moor', 'marsh', 'soil', 'sand', 'shingle'], SHORE = new Set(['sand', 'shingle']);
  const BASE = {
    lawn: { base: '#93ad5f', lo: '#74964a', hi: '#aac26c', warm: '#b9b76a', cool: '#6c9450' },
    meadow: { base: '#a3b262', lo: '#7f9a4c', hi: '#c2c878', warm: '#c9bd72', cool: '#86a455' },
    forest: { base: '#8d9456', lo: '#66773f', hi: '#aaa86a', warm: '#a8905a', cool: '#5f7f48' },
    oldwood: { base: '#768552', lo: '#51663c', hi: '#93a065', warm: '#8a7a50', cool: '#4f7350' },
    moor: { base: '#a0a268', lo: '#7d8452', hi: '#bdb97e', warm: '#b59a6a', cool: '#84946a' },
    marsh: { base: '#8f9a5e', lo: '#667548', hi: '#aeb26c', warm: '#a8985e', cool: '#6f8a66' },
    soil: { base: '#7d5d40', lo: '#5e432c', hi: '#9a7656', warm: '#8e6844', cool: '#6a5240' },
    sand: { base: '#e3d2a2', lo: '#c8b483', hi: '#efe3bf', warm: '#e8cf98', cool: '#d6cdb0' },
    shingle: { base: '#b9b3a2', lo: '#948e80', hi: '#d2cdbe', warm: '#c2b294', cool: '#a3a9aa' },
  };
  const SEASON_TINT = { summer: null, spring: ['#8fd060', .1], autumn: ['#b89a48', .2], winter: ['#c6cec0', .4] };
  const palMemo = new Map();
  function palette(kind, season) {
    const k = kind + '|' + season; let P = palMemo.get(k); if (P) return P;
    const b = BASE[kind] || BASE.lawn, t = SEASON_TINT[season], grows = !SHORE.has(kind) && kind !== 'soil'; P = {};
    for (const n in b) P[n] = t && grows ? mix(b[n], t[0], t[1]) : b[n];
    P.mid = mix(P.lo, P.hi, .5); P.dark = mix(P.lo, '#3f5a2a', .3); P.shadow = season === 'winter' ? '#5e6658' : '#4d5a36'; P.stone = '#d0c3a4'; P.stoneLo = '#a89a7c'; P.stoneHi = '#ece0c2'; P.season = season; P.kind = kind;
    palMemo.set(k, P); return P;
  }
  // The colour field: light and shade in broad swells, patches of richer and thinner growth, and a fine grain, on
  // a coarse world grid smoothed up. It is a function of the place alone, so neighbouring chunks agree exactly.
  function wash(cx, cb, P, seed, amp) {
    const G = 8, x0 = Math.floor(cb[0] / G) - 1, y0 = Math.floor(cb[1] / G) - 1, nx = Math.ceil((cb[2] - cb[0]) / G) + 4, ny = Math.ceil((cb[3] - cb[1]) / G) + 4;
    const s = scratch('wash', nx, ny, { willReadFrequently: true }), img = s.cx.createImageData(nx, ny), d = img.data, B = hex(P.base), L = hex(P.lo), H = hex(P.hi), Wm = hex(P.warm), C = hex(P.cool); amp = amp == null ? 1 : amp;
    for (let j = 0, q = 0; j < ny; j++) for (let i = 0; i < nx; i++, q += 4) {
      const X = (x0 + i) * G, Y = (y0 + j) * G;
      const t = ((fbm(X / 360, Y / 250, seed) - .5) * 1.7 + (fbm(X / 96, Y / 66, seed + 31) - .5) * 1.0 + (noise(X / 27, Y / 19, seed + 67) - .5) * .4) * amp, hue = fbm(X / 210, Y / 150, seed + 93) - .5;
      const to = t > 0 ? H : L, a = Math.min(1, Math.abs(t) * 1.25), hb = hue > 0 ? Wm : C, ha = Math.min(.5, Math.abs(hue) * 1.1) * amp;
      for (let c = 0; c < 3; c++) { const v = B[c] + (to[c] - B[c]) * a; d[q + c] = v + (hb[c] - v) * ha; } d[q + 3] = 255;
    }
    s.cx.putImageData(img, 0, 0);
    cx.save(); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(s.c, (x0 - .5) * G, (y0 - .5) * G, nx * G, ny * G); cx.restore();
  }
  const D = () => sceneDraw;
  const paths2d = new Map();
  const P2 = d => { let p = paths2d.get(d); if (!p) { if (paths2d.size > 6000) paths2d.clear(); p = new Path2D(d); paths2d.set(d, p); } return p; };
  const blob = (cx, r, x, y, rx, ry, n, rag, fill, a) => { cx.globalAlpha = a; cx.fillStyle = fill; cx.fill(P2(D().blob(r, x, y, rx, ry, n, rag))); };
  const ell = (cx, x, y, rx, ry, fill, a) => { cx.globalAlpha = a; cx.fillStyle = fill; cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); cx.fill(); };
  const blade = (cx, x, y, lx, h, col, w, a) => { cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + lx * .35, y - h * .6, x + lx, y - h); cx.stroke(); };
  function pebble(cx, r, x, y, s, P) { ell(cx, x + s * .35, y + s * .3, s * 1.1, s * .6, P.shadow, .3); ell(cx, x, y, s, s * .6, r() < .5 ? P.stone : P.stoneLo, 1); ell(cx, x - s * .3, y - s * .2, s * .45, s * .22, P.stoneHi, .7); }
  function tuft(cx, r, x, y, n, hh, dark, lit, P) {
    ell(cx, x + 1.4, y + .7, 3.4 + n * .3, 1.2, P.shadow, .32);
    for (let k = 0; k < n; k++) { const lean = (k - n / 2) * 1.1 + (r() - .5), px = x + k * .6 - n * .3; blade(cx, px, y, lean, hh * (.7 + r() * .5), k % 2 ? dark : P.dark || dark, 1.1, .8); blade(cx, px + lean * .55, y - hh * .5, lean * .45, hh * .42, lit, .8, .6); }
  }
  // a small flower seen from above: petals round a centre when the bake is fine enough to show them, a dot from far off
  function flower(cx, x, y, s, col, eye, P) {
    ell(cx, x + s * .3, y + s * .35, s * 1.05, s * .6, P.shadow, .26);
    if (scaleOf(cx) < 1.3) { ell(cx, x, y, s * .8, s * .7, col, .95); return; }
    cx.globalAlpha = .97; cx.fillStyle = col; const a0 = (x * 7.3 + y * 3.1) % 1.05;
    for (let p = 0; p < 6; p++) { const a = a0 + p * 1.0472; cx.beginPath(); cx.ellipse(x + Math.cos(a) * s * .6, y + Math.sin(a) * s * .48, s * .44, s * .25, a, 0, 6.283); cx.fill(); }
    if (eye) ell(cx, x, y, s * .34, s * .29, eye, 1);
  }
  // Many tiny specks at once (grit, clods, grains): round ones, because a square speck shows as a pixel close up. One stroke
  // of round-capped dashes for each colour and size, so thousands cost a few calls. add(x, y, width, colour index); flush().
  function grains(cx, cols, alpha) {
    const buckets = cols.map(() => [[], []]);
    return { add(x, y, w, ci) { buckets[ci][w > 1.5 ? 1 : 0].push(x, y, w); },
      flush() { cx.save(); cx.lineCap = 'round'; cx.globalAlpha = alpha; for (let ci = 0; ci < cols.length; ci++) for (let b = 0; b < 2; b++) { const q = buckets[ci][b]; if (!q.length) continue; cx.strokeStyle = cols[ci]; cx.lineWidth = b ? 1.5 : 1; cx.beginPath(); for (let i = 0; i < q.length; i += 3) { cx.moveTo(q[i], q[i + 1]); cx.lineTo(q[i] + q[i + 2] * .5, q[i + 1] + .12); } cx.stroke(); q.length = 0; } cx.restore(); } };
  }
  const PAINT = {
    // a lawn is never one green: the sward in short strokes that lean with the light, clover and moss in drifts, tufts, the odd stone
    lawn(cx, cb, P, env) {
      wash(cx, cb, P, 11, 1.2); cx.lineCap = 'round'; const winter = P.season === 'winter', sun = mix(P.hi, '#eef0a6', .45), deep = mix(P.lo, P.cool, .5), far = scaleOf(cx) < 1;
      // light and shade laid on in broad strokes a few steps across: lit swells with a brighter heart, cooler hollows beside them
      tiles(cb, 80, 60, 17, (tx, ty, r) => { for (let i = 0; i < 3; i++) { const x = tx + r() * 80, y = ty + r() * 80, s = 18 + r() * 30, lit = r() < .55; if (noise(x / 170, y / 120, 15) < .42) continue;
        blob(cx, r, x, y, s, s * .38, 10, .5, lit ? P.hi : deep, lit ? .2 : .16); if (lit) blob(cx, r, x - s * .22, y - s * .08, s * .52, s * .17, 8, .5, sun, .2); else blob(cx, r, x + s * .2, y + s * .06, s * .5, s * .16, 8, .5, P.lo, .16); } });
      tiles(cb, 320, 44, 19, (tx, ty, r) => { if (r() < .5) return; const x = tx + r() * 320, y = ty + r() * 320, s = 14 + r() * 20; blob(cx, r, x, y, s, s * .42, 9, .5, '#a08c5e', .2); blob(cx, r, x - 2, y - 1, s * .6, s * .24, 8, .5, '#b8a370', .22); });
      tiles(cb, 96, 22, 21, (tx, ty, r) => { for (let i = 0; i < 2; i++) { if (r() < .45) continue; const x0 = tx + r() * 96, y0 = ty + r() * 96, moss = r() < .35;
        for (let k = 0, n = 12 + Math.floor(r() * 20); k < n; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * 17, x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d * .5;
          if (moss) { cx.globalAlpha = .45; cx.fillStyle = r() < .5 ? '#8f9a3e' : '#a6aa4c'; const w = 1.4 + r() * 1.4, h = 1 + r() * .8; cx.beginPath(); cx.ellipse(x + w / 2, y + h / 2, w * .58, h * .58, 0, 0, 6.283); cx.fill(); continue; }
          cx.globalAlpha = .5; cx.fillStyle = r() < .5 ? P.cool : mix(P.lo, P.cool, .5); if (far) { cx.beginPath(); cx.ellipse(x, y, 1.8, 1.25, 0, 0, 6.283); cx.fill(); r(); r(); r(); } else for (let j = 0; j < 3; j++) { const b = j * 2.1 + r(); cx.beginPath(); cx.arc(x + Math.cos(b) * 1.1, y + Math.sin(b) * .7, 1.05, 0, 6.283); cx.fill(); }
          if (r() < .035 && !winter) { if (far) ell(cx, x, y - 1.4, 1, .9, '#f4f0e2', .85); else flower(cx, x, y - 1.4, 1.5, '#f6f2e6', '#e6b436', P); } } } });   /* (a clover head or a daisy with its eye: a plain white dot read as a speck of dust close up) */
      const tones = [P.lo, mix(P.lo, '#4f6f34', .4), P.hi, mix(P.hi, '#e2dc8e', .5)];
      tiles(cb, 32, 6, 23, (tx, ty, r) => { for (let i = 0; i < (far ? 6 : 12); i++) { const x = tx + r() * 32, y = ty + r() * 32, t = r(), len = 2.4 + r() * 3.2, lean = .5 - r() * .2; blade(cx, x, y, lean * 2, len, tones[t < .38 ? 0 : t < .6 ? 1 : t < .92 ? 2 : 3], .9 + r() * .9, .2 + r() * .22); } });
      tiles(cb, 64, 10, 25, (tx, ty, r) => { for (let i = 0; i < 3; i++) { if (r() < .2) continue; tuft(cx, r, tx + r() * 64, ty + r() * 64, 4 + Math.floor(r() * 4), 4 + r() * 5, P.lo, P.hi, P); } });
      if (!winter) tiles(cb, 128, 26, 27, (tx, ty, r) => { if (r() < .5) return; const x0 = tx + r() * 128, y0 = ty + r() * 128, white = r() < .6; for (let k = 0, n = 4 + Math.floor(r() * 7); k < n; k++) { const x = x0 + (r() - .5) * 40 * (.4 + r()), y = y0 + (r() - .5) * 20 * (.4 + r()); flower(cx, x, y, white ? 1.9 + r() * .7 : 1.5 + r() * .5, white ? '#fbf8ee' : '#f2d040', white ? '#e6b436' : '#d9a520', P); } });
      tiles(cb, 256, 14, 29, (tx, ty, r) => { for (let g = 0; g < 2; g++) { const gx = tx + r() * 256, gy = ty + r() * 256; for (let k = 0, n = 2 + Math.floor(r() * 4); k < n; k++) pebble(cx, r, gx + (r() - .5) * 22, gy + (r() - .5) * 10, 1.4 + r() * (k ? 2 : 3.4), P); } });
      if (P.season === 'autumn') tiles(cb, 48, 6, 31, (tx, ty, r) => { for (let i = 0; i < 2; i++) { cx.globalAlpha = .75; cx.fillStyle = ['#c0702e', '#d89a3e', '#a8562a', '#b8a040'][Math.floor(r() * 4)]; cx.fill(P2(D().leaf(tx + r() * 48, ty + r() * 48, r() * 6.3, 3 + r() * 2, 1.4))); } });
      cx.globalAlpha = 1;
    },
    // a hay meadow: longer, tawnier grass that all leans one way, seed heads catching the light, flowers in drifts
    meadow(cx, cb, P, env) {
      wash(cx, cb, P, 41, 1.15); cx.lineCap = 'round'; const winter = P.season === 'winter', gold = mix(P.hi, '#e6d48a', .55), tones = [P.lo, mix(P.lo, P.cool, .5), P.hi, gold];
      tiles(cb, 32, 8, 43, (tx, ty, r) => { for (let i = 0; i < (scaleOf(cx) < 1 ? 5 : 10); i++) { const x = tx + r() * 32, y = ty + r() * 32, t = r(), len = 4 + r() * 5.5, sway = 1.2 + fbm(x / 120, y / 80, 5) * 2.6; blade(cx, x, y, sway, len, tones[t < .3 ? 0 : t < .5 ? 1 : t < .82 ? 2 : 3], .8 + r() * .7, .22 + r() * .24); if (t > .9 && !winter) ell(cx, x + sway, y - len, .9, 1.5, gold, .8); } });
      tiles(cb, 64, 12, 45, (tx, ty, r) => { for (let i = 0; i < 2; i++) { if (r() < .3) continue; tuft(cx, r, tx + r() * 64, ty + r() * 64, 5 + Math.floor(r() * 4), 6 + r() * 6, P.lo, gold, P); } });
      if (!winter) tiles(cb, 112, 34, 47, (tx, ty, r) => { if (r() < .35) return; const x0 = tx + r() * 112, y0 = ty + r() * 112, t = r(), col = P.season === 'autumn' ? (t < .5 ? '#d8a040' : '#e8dcc0') : t < .3 ? '#e2534a' : t < .55 ? '#f6f2e4' : t < .8 ? '#f0d24a' : '#7f8fd8';
        for (let k = 0, n = 7 + Math.floor(r() * 12); k < n; k++) { const x = x0 + (r() - .5) * 62, y = y0 + (r() - .5) * 30, hh = 3 + r() * 4; blade(cx, x, y, .8, hh, P.lo, .7, .7); flower(cx, x + .8, y - hh, 1.7 + r() * .6, col, col === '#f6f2e4' ? '#e6b436' : mix(col, '#3a2a1a', .35), P); } });
      cx.globalAlpha = 1;
    },
    // a woodland floor: leaf litter, moss cushions, twigs, pools of light that got through the leaves
    forest(cx, cb, P, env) {
      const old = P.kind === 'oldwood'; wash(cx, cb, P, old ? 71 : 61, 1.25);
      tiles(cb, 128, 60, 63, (tx, ty, r) => { for (let i = 0; i < 2; i++) { const x = tx + r() * 128, y = ty + r() * 128, s = 26 + r() * 40; blob(cx, r, x, y, s, s * .5, 8, .5, old ? '#3c4f34' : '#4a5c36', .16 + r() * .1); if (!old || r() < .4) blob(cx, r, x + s * .9, y - s * .4, s * .7, s * .32, 8, .5, '#e6dc98', old ? .08 : .14); } });
      const litter = P.season === 'winter' ? ['#8a7a5c', '#9c8c6c', '#6e6048'] : old ? ['#7a5c34', '#8f7440', '#5c4a30', '#6f7a3e'] : ['#a8763a', '#c09848', '#8a5c30', '#9aa04e', '#b88a40'];
      tiles(cb, 32, 6, 65, (tx, ty, r) => { for (let i = 0; i < (P.season === 'autumn' ? 13 : 8) * (scaleOf(cx) < 1 ? .5 : 1); i++) { cx.globalAlpha = .5 + r() * .3; cx.fillStyle = litter[Math.floor(r() * litter.length)]; cx.fill(P2(D().leaf(tx + r() * 32, ty + r() * 32, r() * 6.3, 2.4 + r() * 2, 1.2))); } });
      cx.lineCap = 'round';
      tiles(cb, 64, 14, 67, (tx, ty, r) => {
        for (let i = 0; i < (old ? 3 : 2); i++) { if (r() < .35) continue; const x = tx + r() * 64, y = ty + r() * 64, s = 4 + r() * 7; blob(cx, r, x + 1, y + 1.2, s, s * .5, 7, .4, '#35492c', .5); blob(cx, r, x, y, s, s * .48, 7, .4, old ? '#5f8446' : '#7d9a4c', .9); blob(cx, r, x - s * .25, y - s * .14, s * .5, s * .2, 6, .4, '#b3c66c', .7); }
        for (let i = 0; i < 2; i++) { if (r() < .5) continue; const x = tx + r() * 64, y = ty + r() * 64, a = r() * 3.14, l = 5 + r() * 9; cx.globalAlpha = .6; cx.strokeStyle = '#4e3c28'; cx.lineWidth = .9; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * .5); cx.stroke(); }
        if (r() < .45 && P.season !== 'winter') { const x = tx + r() * 64, y = ty + r() * 64; ell(cx, x + 1.5, y + .8, 5, 1.6, P.shadow, .35); for (let f = 0; f < 5; f++) { const a = -1.57 + (f - 2) * .5 + (r() - .5) * .3, l = 5 + r() * 4; blade(cx, x, y, Math.cos(a) * l, -Math.sin(a) * l * .8, f % 2 ? '#4f7a3a' : '#6c964a', 1.3, .85); } }
      });
      cx.globalAlpha = 1;
    },
    // open fell: bleached tussock grass, heather in drifts, peat showing through, grey stones with lichen
    moor(cx, cb, P, env) {
      wash(cx, cb, P, 81, 1.3); cx.lineCap = 'round'; const bloom = P.season === 'summer' || P.season === 'autumn', hLo = '#5c4a52', hMid = '#7d6470', hHi = bloom ? '#a8789e' : '#8f7f72', hLit = bloom ? '#94768c' : '#8a7c70', bleach = mix(P.hi, '#e6dcae', .6), far = scaleOf(cx) < 1;
      tiles(cb, 64, 20, 83, (tx, ty, r) => { for (let i = 0; i < 5; i++) { const x = tx + r() * 64, y = ty + r() * 64, drift = fbm(x / 230, y / 150, 77), pick = r();
        /* (from far off the heather is a few broad soft masses in each drift: a field of small dark clumps read as a rash of dots) */
        if (far && drift > .56 && pick < .7) { if (pick < .22) { const s = 15 + r() * 14; blob(cx, r, x + 2, y + 2, s, s * .5, 9, .5, hLo, .3); blob(cx, r, x, y, s * .92, s * .42, 9, .5, hMid, .5); blob(cx, r, x - s * .25, y - s * .14, s * .5, s * .18, 7, .5, hLit, .4); } continue; }
        if (far && pick >= .2 && pick < .62) continue;
        if (drift > .56 && pick < .7) { const s = 6 + r() * 8; blob(cx, r, x + s * .12, y + s * .14, s, s * .52, 8, .6, hLo, .55); blob(cx, r, x, y - s * .05, s * .86, s * .42, 8, .6, hMid, .85); blob(cx, r, x - s * .22, y - s * .16, s * .5, s * .2, 7, .5, hLit, .55); for (let k = 0; k < 9; k++) { const px = x + (r() - .5) * s * 1.5, py = y - s * .1 + (r() - .5) * s * .5; ell(cx, px, py, .7 + r() * .5, .6 + r() * .4, r() < .6 ? hHi : hLo, .8); } continue; }
        if (pick < .1 && drift > .5) { const w = 8 + r() * 10; blob(cx, r, x + 1, y + 2.2, w, w * .26, 8, .4, '#4a3a2c', .8); blob(cx, r, x - .5, y - .5, w * .92, w * .2, 8, .45, P.lo, .85); continue; }
        if (pick < .2) { pebble(cx, r, x, y, 2 + r() * 3.6, { shadow: P.shadow, stone: '#a9a49a', stoneLo: '#8a857c', stoneHi: '#d4d0c4' }); if (r() < .5) ell(cx, x - 1, y - 1, 1.2, .6, '#c8c46a', .7); continue; }
        tuft(cx, r, x, y, 4 + Math.floor(r() * 4), 4 + r() * 4.5, P.lo, bleach, P); } });
      tiles(cb, 32, 6, 85, (tx, ty, r) => { for (let i = 0; i < (scaleOf(cx) < 1 ? 3 : 6); i++) { const x = tx + r() * 32, y = ty + r() * 32; blade(cx, x, y, 1 + r() * 1.4, 2.6 + r() * 3.4, r() < .5 ? bleach : P.lo, .8 + r() * .6, .2 + r() * .2); } });
      cx.globalAlpha = 1;
    },
    // wet ground: dark peaty hollows holding a little sky, rushes and sedge in clumps, mud at the edges
    marsh(cx, cb, P, env) {
      wash(cx, cb, P, 91, 1.35); cx.lineCap = 'round';
      tiles(cb, 96, 40, 93, (tx, ty, r) => { for (let i = 0; i < 2; i++) { if (r() < .3) continue; const x = tx + r() * 96, y = ty + r() * 96, s = 10 + r() * 20; blob(cx, r, x, y, s * 1.25, s * .5, 9, .5, '#6a6244', .5); blob(cx, r, x, y, s, s * .36, 9, .45, '#4f6460', .85); blob(cx, r, x - s * .15, y - s * .05, s * .62, s * .16, 8, .4, '#a9c4c6', .5); cx.globalAlpha = .7; cx.strokeStyle = '#e4eeea'; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(x - s * .4, y - s * .08); cx.lineTo(x + s * .1, y - s * .08); cx.stroke(); } });
      tiles(cb, 48, 12, 95, (tx, ty, r) => { for (let i = 0; i < 3; i++) { if (r() < .25) continue; const x = tx + r() * 48, y = ty + r() * 48, n = 5 + Math.floor(r() * 5), hh = 6 + r() * 7; ell(cx, x + 1.5, y + .8, 4.4, 1.4, P.shadow, .35); for (let k = 0; k < n; k++) { const lx = (k - n / 2) * .9 + (r() - .5); blade(cx, x + k * .5 - n * .25, y, lx, hh * (.7 + r() * .4), k % 2 ? '#56703c' : '#6f8648', 1, .85); if (r() < .3) ell(cx, x + k * .5 - n * .25 + lx, y - hh * .8, .8, 1.6, '#6e4f30', .9); } } });
      tiles(cb, 32, 6, 97, (tx, ty, r) => { for (let i = 0; i < (scaleOf(cx) < 1 ? 3 : 6); i++) blade(cx, tx + r() * 32, ty + r() * 32, .6 + r(), 3 + r() * 3.5, r() < .5 ? P.lo : P.hi, .8 + r() * .5, .2 + r() * .2); });
      cx.globalAlpha = 1;
    },
    // dug soil: furrows that catch the light on one side, clods, a little straw
    soil(cx, cb, P, env) {
      wash(cx, cb, P, 101, .8);
      const y0 = Math.floor(cb[1] / 7.5) * 7.5; cx.lineCap = 'round';
      for (let y = y0; y < cb[3] + 8; y += 7.5) { cx.globalAlpha = .42; cx.strokeStyle = '#5a3e28'; cx.lineWidth = 1.6; cx.beginPath(); for (let x = Math.floor(cb[0] / 16) * 16; x <= cb[2] + 16; x += 16) { const yy = y + (noise(x / 40, y / 9, 5) - .5) * 1.8; x === Math.floor(cb[0] / 16) * 16 ? cx.moveTo(x, yy) : cx.lineTo(x, yy); } cx.stroke(); cx.globalAlpha = .3; cx.strokeStyle = '#a07c58'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(cb[0] - 2, y - 2.2); cx.lineTo(cb[2] + 2, y - 2.2); cx.stroke(); }
      { const g = grains(cx, [P.lo, P.hi], .5); tiles(cb, 32, 3, 103, (tx, ty, r) => { for (let i = 0; i < 22; i++) { const ci = r() < .5 ? 0 : 1, x = tx + r() * 32, y = ty + r() * 32, w = 1 + r() * 1.6; r(); g.add(x, y, w, ci); } }); g.flush(); }
      cx.globalAlpha = 1;
    },
    // a beach: damp and dry sand in drifts, wind ripples, a line of wrack and shells
    sand(cx, cb, P, env) {
      wash(cx, cb, P, 111, 1); cx.lineCap = 'round';
      tiles(cb, 64, 30, 113, (tx, ty, r) => { for (let i = 0; i < 3; i++) { const x = tx + r() * 64, y = ty + r() * 64, l = 14 + r() * 26, b = (r() - .5) * 4; cx.globalAlpha = .22; cx.strokeStyle = P.lo; cx.lineWidth = 1.1; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + l / 2, y + b, x + l, y); cx.stroke(); cx.globalAlpha = .3; cx.strokeStyle = '#f7efd2'; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(x, y - 1.2); cx.quadraticCurveTo(x + l / 2, y + b - 1.2, x + l, y - 1.2); cx.stroke(); } });
      { const g = grains(cx, [P.lo, '#f6ecd0'], .35); tiles(cb, 32, 3, 115, (tx, ty, r) => { for (let i = 0; i < 9; i++) { const ci = r() < .5 ? 0 : 1, x = tx + r() * 32, y = ty + r() * 32, w = .8 + r() * 1.1; r(); g.add(x, y, w, ci); } }); g.flush(); }
      tiles(cb, 96, 8, 117, (tx, ty, r) => { for (let i = 0; i < 3; i++) { const x = tx + r() * 96, y = ty + r() * 96, t = r(); if (t < .4) pebble(cx, r, x, y, 1.2 + r() * 2, { shadow: '#8a7a56', stone: '#bfb6a2', stoneLo: '#9c9484', stoneHi: '#eae4d4' }); else if (t < .7) { ell(cx, x + .5, y + .5, 2, 1.1, '#8a7a56', .3); ell(cx, x, y, 1.8, 1.2, r() < .5 ? '#f4e6dc' : '#eecfc0', 1); cx.globalAlpha = .5; cx.strokeStyle = '#c8a898'; cx.lineWidth = .4; cx.beginPath(); cx.moveTo(x - 1.2, y + .6); cx.lineTo(x, y - 1); cx.lineTo(x + 1.2, y + .6); cx.stroke(); } else blob(cx, r, x, y, 3 + r() * 4, 1 + r(), 6, .7, '#5c5a38', .5); } });
      cx.globalAlpha = 1;
    },
    // a shingle shore: rounded pebbles packed together, each lit on its upper left
    shingle(cx, cb, P, env) {
      wash(cx, cb, P, 121, 1); const tones = ['#a9a69c', '#8f959a', '#c4b9a2', '#d9d5ca', '#7f7c76', '#b3a58c'];
      tiles(cb, 24, 5, 123, (tx, ty, r) => { for (let i = 0; i < 13; i++) { const x = tx + r() * 24, y = ty + r() * 24, s = 1.3 + r() * r() * 3.4; ell(cx, x + s * .3, y + s * .32, s, s * .62, '#5f5a50', .35); ell(cx, x, y, s, s * .62, tones[Math.floor(r() * tones.length)], 1); ell(cx, x - s * .3, y - s * .2, s * .42, s * .2, '#f1eee6', .55); } });
      cx.globalAlpha = 1;
    },
  };
  PAINT.oldwood = PAINT.forest;
  /** Paint one kind of ground over a box (world px) of any canvas: region painters use it for their own fills. */
  function paintKind(cx, kind, bb, season, env) { (PAINT[kind] || PAINT.lawn)(cx, bb, palette(PAINT[kind] ? kind : 'lawn', season || 'summer'), env || {}); cx.globalAlpha = 1; }

  // The map of kinds: one byte a cell, 0 for water, from the caller's rule; land kinds then grow two cells out over
  // water, so the ground runs under a bank or out to the coast line (the caller's smooth outlines cut it there).
  function kindGrid(cols, rows, kindOfCell) {
    const g = new Uint8Array(cols * rows), wet = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const k = kindOfCell(x, y), i = k ? KINDS.indexOf(k) : -1; if (i >= 0) g[y * cols + x] = i + 1; else wet[y * cols + x] = 1; }
    for (let pass = 0; pass < 3; pass++) { const src = g.slice(); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const q = y * cols + x; if (src[q]) continue; let best = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue; const v = src[yy * cols + xx]; if (v && (!best || SHORE.has(KINDS[v - 1]))) best = v; } g[q] = best; } }
    return { cols, rows, g, wet, at(x, y) { return x < 0 || y < 0 || x >= cols || y >= rows ? 0 : g[y * cols + x]; } };
  }
  // env: { W, grid (kindGrid), season, coast: Path2D (the land's smooth outline), lawn: Path2D (the same, inset past the
  //        beach), box }.  Returns ops for layer(): the shore first, then each land kind present, the commonest first.
  let lastMask = null;   /* (the last soft mask made, by any ground: masks share their canvases) */
  function ground(env) {
    const W = env.W, cw = W.cellW, chh = W.cellH, grid = env.grid, season = env.season || 'summer', MARG = 66, memo = new Map();
    const rank = cb => {
      const key = cb[0] + ',' + cb[1]; let R = memo.get(key); if (R) return R; if (memo.size > 600) memo.clear();
      const x0 = Math.floor((cb[0] - MARG) / cw), x1 = Math.floor((cb[2] + MARG) / cw), y0 = Math.floor((cb[1] - W.sky - MARG) / chh), y1 = Math.floor((cb[3] - W.sky + MARG) / chh), n = new Array(KINDS.length).fill(0); let wet = false, any = false;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const v = grid.at(x, y); if (v) { n[v - 1]++; any = true; } if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows || grid.wet[y * grid.cols + x] || v && SHORE.has(KINDS[v - 1])) wet = true; }
      // (in the kit's own order, never by which is commoner here: the same kind lies on top in every chunk, so the line between two kinds is one picture across a chunk's edge)
      const order = k => n.map((c, i) => [c, i]).filter(([c, i]) => c && SHORE.has(KINDS[i]) === k).map(q => q[1]);
      let shore = order(true); const land = order(false); if (wet && any && !shore.length) shore = [KINDS.indexOf('sand')];
      R = { shore, land, wet, cells: [x0, y0, x1, y1] }; memo.set(key, R); return R;
    };
    // a soft, broken mask (alpha) of where one kind lies in this chunk: lumpy blobs a cell wide, blurred, then cut by noise
    const S = 4;
    const mask = (cb, R, test, domain) => {
      const mx0 = Math.floor((cb[0] - MARG) / S), my0 = Math.floor((cb[1] - MARG) / S), mw = Math.ceil((cb[2] + MARG) / S) - mx0, mh = Math.ceil((cb[3] + MARG) / S) - my0;
      const a = scratch('maskA', mw, mh, { willReadFrequently: true }), b = scratch('maskB', mw, mh, { willReadFrequently: true });
      if (test) {
        a.cx.fillStyle = '#000';
        for (let y = R.cells[1]; y <= R.cells[3]; y++) for (let x = R.cells[0]; x <= R.cells[2]; x++) { const v = grid.at(x, y); if (!v || !test(v - 1)) continue; const px = ((x + .5) * cw + (h01(x, y, 3) - .5) * 14) / S - mx0, py = (W.sky + (y + .5) * chh + (h01(x, y, 4) - .5) * 9) / S - my0; a.cx.beginPath(); a.cx.ellipse(px, py, cw * (.62 + h01(x, y, 5) * .22) / S, chh * (.66 + h01(x, y, 6) * .24) / S, 0, 0, 6.283); a.cx.fill(); }
        b.cx.filter = 'blur(5.5px)'; b.cx.drawImage(a.c, 0, 0); b.cx.filter = 'none';
      } else { b.cx.fillStyle = '#000'; b.cx.fillRect(0, 0, mw, mh); }
      let dom = null;
      if (domain) { const c = scratch('maskC', mw, mh, { willReadFrequently: true }); c.cx.filter = 'blur(1.6px)'; c.cx.setTransform(1 / S, 0, 0, 1 / S, -mx0, -my0); c.cx.fillStyle = '#000'; c.cx.fill(domain, 'evenodd'); c.cx.setTransform(1, 0, 0, 1, 0, 0); c.cx.filter = 'none'; dom = c.cx.getImageData(0, 0, mw, mh).data; }
      const img = b.cx.getImageData(0, 0, mw, mh), d = img.data;
      for (let j = 0, q = 3; j < mh; j++) for (let i = 0; i < mw; i++, q += 4) { // (the line between two kinds wanders a good stride either way and breaks into tongues: never the cell grid, never a ruled edge)
        const X = (mx0 + i) * S, Y = (my0 + j) * S, nz = (fbm(X / 34, Y / 24, 99) - .5) * .5, wide = (fbm(X / 90, Y / 62, 97) - .5) * 1.5 + nz * .8, m = d[q] / 255; let v = test ? smooth(.38, .62, m + wide * 4 * m * (1 - m)) : 1; /* (the noise only moves the line: well inside a kind it is whole, well outside there is none) */ if (dom) v *= smooth(.3, .7, dom[q] / 255 + nz * .7); d[q] = Math.round(v * 255); }
      b.cx.putImageData(img, 0, 0); return { c: b.c, x: mx0 * S, y: my0 * S, w: mw * S, h: mh * S };
    };
    const through = (B, cb, kind, m) => {
      const cx = B.cx, c = cx.canvas, s = scratch('kind', c.width, c.height); s.cx.setTransform(cx.getTransform()); paintKind(s.cx, kind, cb, season, env);
      s.cx.globalCompositeOperation = 'destination-in'; s.cx.imageSmoothingEnabled = true; s.cx.imageSmoothingQuality = 'high'; s.cx.drawImage(m.c, m.x, m.y, m.w, m.h); s.cx.globalCompositeOperation = 'source-over';
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(s.c, 0, 0); cx.restore();
    };
    const bb = [env.box.x, env.box.y, env.box.x + env.box.w, env.box.y + env.box.h], ops = [];
    // A kind is laid over a chunk in three bands, each its own op: one op for the whole chunk took up to 56 ms at level 3,
    // and an op cannot be cut into slices. A band is a clip on whole canvas pixels, and the brushwork is a function of the
    // place alone, so the bands meet without a line.
    const BANDS = 3;
    const band = (cx, cb, i) => {
      const m = cx.getTransform(), py = y => Math.round(m.d * y + m.f), h = (cb[3] - cb[1]) / BANDS, y0 = i ? (py(cb[1] + h * i) - m.f) / m.d : cb[1] - 64, y1 = i < BANDS - 1 ? (py(cb[1] + h * (i + 1)) - m.f) / m.d : cb[3] + 64;
      cx.beginPath(); cx.rect(cb[0] - 64, y0, cb[2] - cb[0] + 128, y1 - y0); cx.clip(); return [cb[0], Math.max(cb[1], y0), cb[2], Math.min(cb[3], y1)];
    };
    // (the bands of one pass share its mask: it is kept only until another mask is made, since masks share their canvases)
    const maskOf = (cb, R, tag, test, domain) => { const key = cb[0] + ',' + cb[1] + ',' + cb[2] + '|' + tag; if (lastMask && lastMask.key === key) return lastMask.m; lastMask = null; const m = mask(cb, R, test, domain); lastMask = { key, m }; return m; };
    const pass = (n, shoreGroup, i) => ops.push({ bb, seed: 500 + n + (shoreGroup ? 0 : 10), name: (shoreGroup ? 'shore ' : 'land ') + n + '.' + i, draw(B, r, cb) {
      const R = rank(cb), group = shoreGroup ? R.shore : R.land; if (n >= group.length) return; const ki = group[n], kind = KINDS[ki], cx = B.cx;
      cx.save(); const sub = band(cx, cb, i);
      if (shoreGroup) { if (env.coast) cx.clip(env.coast, 'evenodd'); if (n === 0) paintKind(cx, kind, sub, season, env); else through(B, sub, kind, maskOf(cb, R, 's' + n, v => v === ki, null)); }
      else if (n === 0 && !R.wet) paintKind(cx, kind, sub, season, env);
      else through(B, sub, kind, maskOf(cb, R, 'l' + n, n === 0 ? null : v => v === ki, R.wet ? env.lawn : null));
      cx.restore();
    } });
    for (const [n, shoreGroup] of [[0, true], [1, true], [0, false], [1, false], [2, false], [3, false]]) for (let i = 0; i < BANDS; i++) pass(n, shoreGroup, i);
    return ops;
  }

  /* ---------- reading the layout: which ground lies where, which surface a route has ---------- */
  // All from layout data: a region's theme gives its ground, a beach cell is sand (shingle on the cold coasts), land
  // beside a river in a valley is water meadow, land round a route named as a marsh walk is marsh. A layout may also
  // name its ground outright: presentation.ground = [{ kind, polygon: [[x, y], ...] }] (cells) wins over all of that.
  const THEME = { village: 'lawn', forest: 'forest', ruin: 'oldwood', valley: 'meadow', orchard: 'meadow', mountain: 'moor' }, COLD = new Set(['mountain', 'ruin']);
  function layoutKinds(W, data) {
    const themes = new Map((data.regions || []).map(r => [r.id, r.theme])), cols = W.cols, rows = W.rows, authored = ((data.presentation || {}).ground || []).filter(a => a && KINDS.includes(a.kind) && Array.isArray(a.polygon) && a.polygon.length > 2);
    const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const wetWalk = new Uint8Array(cols * rows);
    for (const r of data.routes || []) { if (!/marsh/.test(String(r.id)) && r.surface !== 'boardwalk') continue; for (let i = 1; i < r.points.length; i++) { const a = r.points[i - 1], b = r.points[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let k = 0; k <= n; k++) { const px = a[0] + (b[0] - a[0]) * k / n, py = a[1] + (b[1] - a[1]) * k / n; for (let y = Math.floor(py - 3); y <= py + 3; y++) for (let x = Math.floor(px - 2.4); x <= px + 2.4; x++) if (x >= 0 && y >= 0 && x < cols && y < rows) wetWalk[y * cols + x] = 1; } } }
    const fresh = (x, y) => { const c = gardenIslandBaseCell(x, y); return !!(c && c.freshwater); };
    return kindGrid(cols, rows, (x, y) => {
      const c = gardenIslandBaseCell(x, y); if (!c || !c.land || c.freshwater || c.ocean) return null;
      for (const a of authored) if (inPoly(x + .5, y + .5, a.polygon)) return a.kind;
      const theme = themes.get(c.region) || 'village';
      if (c.beach) return COLD.has(theme) ? 'shingle' : 'sand';
      if (wetWalk[y * cols + x]) return 'marsh';
      if (theme === 'valley' && (fresh(x - 1, y) || fresh(x + 1, y) || fresh(x, y - 1) || fresh(x, y + 1))) return 'marsh';
      return THEME[theme] || 'lawn';
    });
  }
  /** The surface of a layout route: its own surface if the layout names one, else by its name and tier. */
  function routeKind(r) { if (r.surface && PATH[r.surface]) return r.surface; const id = String(r.id || ''); if (/boardwalk/.test(id)) return 'boardwalk'; if (/steps/.test(id)) return 'steps'; return r.tier === 'main' ? 'cobble' : r.tier === 'plaza' ? 'setts' : r.tier === 'lane' ? 'gravel' : 'earth'; }
  // painted widths from the size standard (GARDEN_SIZE): a main road three figures wide, a lane two, a trail one and a half
  const SZ = (n, t, d) => typeof gardenSizePx === 'function' ? Math.round(gardenSizePx(n, t)) : d;
  const ROUTE_WIDTH = { cobble: SZ('mainRoad', 0, 46), setts: 40, gravel: SZ('lane', .1, 32), earth: SZ('trail', .1, 22), boardwalk: 22, steps: 24 };
  /** Every route of a layout in the kit's terms (world px), ready for paths(): { routes, areas }.
   *  A route's painted width is the layout's own where it has one (route.widths: cells, one a point, the hand-drawn layouts;
   *  or route.paintWidth: px), else the surface's usual width. A route with a drawn outline (route.shape: a polygon in cells,
   *  a square or a yard) gives an area of its surface. o: { skip(route), plazas: true to keep plaza-tier centre lines } */
  function layoutPaths(W, data, o) {
    o = o || {}; const routes = [], areas = [], px = q => ({ x: q[0] * W.cellW, y: W.sky + q[1] * W.cellH });
    for (const r of data.routes || []) {
      if (!r.points || r.points.length < 2 || o.skip && o.skip(r)) continue; const kind = routeKind(r);
      if (Array.isArray(r.shape) && r.shape.length > 2) areas.push({ id: r.id, kind: PATH[kind].planks ? 'setts' : kind, points: r.shape.map(px) });
      if (r.tier === 'plaza' && !o.plazas) continue;
      if (Array.isArray(r.widths) && r.widths.length === r.points.length) {
        // (a width in cells is measured across the path: a cell is wider than it is tall, so the px width turns with the path)
        const P = r.points, pts = P.map((q, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return Object.assign(px(q), { w: r.widths[i] * .92 * Math.hypot(dy / l * W.cellW, dx / l * W.cellH) }); });
        routes.push({ id: r.id, kind, width: ROUTE_WIDTH[kind] || 26, closed: false, points: pts, own: true }); continue;
      }
      const path = typeof gardenIslandRoutePath === 'function' ? gardenIslandRoutePath(r) : { points: r.points.map(q => ({ x: q[0], y: q[1] })), closed: false };
      routes.push({ id: r.id, kind, width: Number(r.paintWidth) || ROUTE_WIDTH[kind] || 26, closed: !!path.closed, points: path.points.map(p => ({ x: p.x * W.cellW, y: W.sky + p.y * W.cellH })) });
    }
    return { routes, areas };
  }

  /* ---------- 3. the path kit ---------- */
  const PATH = {
    cobble: { rank: 3, blur: 4.2, edge: .18, bed: '#a8966f', margin: .26 },
    setts: { rank: 3, blur: 4.6, edge: .08, bed: '#ab9972', margin: .24 },
    gravel: { rank: 2, blur: 5.4, edge: .4, bed: '#d7c294', margin: .3 },
    earth: { rank: 1, blur: 6.4, edge: .5, bed: '#bfaa84', margin: .26 },
    boardwalk: { rank: 4, planks: true }, steps: { rank: 4, planks: true },
  };
  /** A dense, smoothed centre line with a half width at every point: pts [{x, y, w?}] world px, width the default. */
  function centreLine(pts, width, closed) {
    let p = pts.map(q => ({ x: q.x, y: q.y, w: q.w || width }));
    for (let it = 0; it < 2 && p.length > 2; it++) { const o = closed ? [] : [p[0]]; for (let i = 0; i < p.length - (closed ? 0 : 1); i++) { const a = p[i], b = p[(i + 1) % p.length]; o.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25, w: a.w * .75 + b.w * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75, w: a.w * .25 + b.w * .75 }); } if (!closed) o.push(p[p.length - 1]); p = o; }
    if (closed) p.push(Object.assign({}, p[0]));
    const out = [p[0]]; let d = 0; p[0].d = 0;
    for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L / 4)); for (let k = 1; k <= n; k++) { const t = k / n; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, d: d + L * t }); } d += L; }
    return out;
  }
  // env: { routes: [{ id, kind, points: [{x, y, w?}], width, closed }], areas: [{ kind, points | ellipse: {x, y, rx, ry} }],
  //        season, allow, within: Path2D or null (where a path may be painted: both must hold), kindAt(px, py) (the ground
  //        under an edge, for the grass that grows in), box }
  function paths(env) {
    const season = env.season || 'summer', box = env.box, bbAll = [box.x, box.y, box.x + box.w, box.y + box.h];
    const routes = (env.routes || []).filter(r => r.points && r.points.length > 1 && PATH[r.kind]).map(r => { const line = centreLine(r.points, r.width || 26, r.closed); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, wm = 0; for (const p of line) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); wm = Math.max(wm, p.w); } return { id: r.id, kind: r.kind, line, bb: [x0 - wm, y0 - wm, x1 + wm, y1 + wm], salt: hashStr(String(r.id)), closed: !!r.closed }; });
    const areas = (env.areas || []).filter(a => PATH[a.kind]).map(a => { const e = a.ellipse, pts = a.points; const bb = e ? [e.x - e.rx, e.y - e.ry, e.x + e.rx, e.y + e.ry] : pts.reduce((b, p) => [Math.min(b[0], p.x), Math.min(b[1], p.y), Math.max(b[2], p.x), Math.max(b[3], p.y)], [1e9, 1e9, -1e9, -1e9]); return { kind: a.kind, e, pts, bb }; });
    // where a path ends on another, both widen a little: a pad at the meeting point, which the smoothing turns into a fillet
    const pads = [];
    for (const r of routes) for (const end of [r.line[0], r.line[r.line.length - 1]]) { let best = null; for (const o of routes) { if (o === r || !meets(o.bb, [end.x - 40, end.y - 40, end.x + 40, end.y + 40])) continue; for (let i = 0; i < o.line.length; i += 2) { const p = o.line[i], dd = Math.hypot(p.x - end.x, p.y - end.y); if (dd < (p.w + end.w) * .5 && (!best || p.w > best.w)) best = { w: p.w, kind: o.kind }; } } if (best) { const wide = PATH[best.kind].rank >= PATH[r.kind].rank ? best.kind : r.kind; if (!PATH[wide].planks) pads.push({ x: end.x, y: end.y, r: Math.max(best.w, end.w) * .6, kind: wide }); } }
    const SS = 1.5, CM = 20, kindsUsed = new Set(routes.map(r => r.kind).concat(areas.map(a => a.kind)));
    // the coverage of one kind of path over a chunk, 0..1 on a 1.5 px grid: every line, area and pad together, blurred
    const covMemo = new Map();
    const coverage = (cb, kind) => { const key = kind + '|' + cb[0] + ',' + cb[1] + ',' + cb[2]; let c = covMemo.get(key); if (c === undefined) { if (covMemo.size > 7) covMemo.delete(covMemo.keys().next().value); c = coverage0(cb, kind); covMemo.set(key, c); } return c; };
    const coverage0 = (cb, kind) => {
      const near = [cb[0] - CM, cb[1] - CM, cb[2] + CM, cb[3] + CM], rs = routes.filter(r => r.kind === kind && meets(r.bb, near)), as = areas.filter(a => a.kind === kind && meets(a.bb, near)), ps = pads.filter(p => p.kind === kind && p.x > near[0] - p.r && p.x < near[2] + p.r && p.y > near[1] - p.r && p.y < near[3] + p.r);
      if (!rs.length && !as.length) return null;
      const x0 = Math.floor(near[0] / SS), y0 = Math.floor(near[1] / SS), w = Math.ceil(near[2] / SS) - x0, h = Math.ceil(near[3] / SS) - y0, A = scratch('covA', w, h, { willReadFrequently: true }), Bc = scratch('covB', w, h, { willReadFrequently: true }), a = A.cx;
      a.setTransform(1 / SS, 0, 0, 1 / SS, -x0, -y0); a.fillStyle = '#000'; a.strokeStyle = '#000'; a.lineCap = 'round'; a.lineJoin = 'round'; a.save(); if (env.allow) a.clip(env.allow, 'evenodd'); if (env.within) a.clip(env.within, 'evenodd');
      for (const r of rs) { const L = r.line; let run = false; for (let i = 1; i < L.length; i++) { const p = L[i - 1], q = L[i], m = Math.max(p.w, q.w); if (Math.max(p.x, q.x) < near[0] - m || Math.min(p.x, q.x) > near[2] + m || Math.max(p.y, q.y) < near[1] - m || Math.min(p.y, q.y) > near[3] + m) continue; a.lineWidth = (p.w + q.w) / 2; a.beginPath(); a.moveTo(p.x, p.y); a.lineTo(q.x, q.y); a.stroke(); run = true; } void run; }
      for (const p of ps) { a.beginPath(); a.arc(p.x, p.y, p.r, 0, 6.283); a.fill(); }
      a.restore();
      for (const s of as) { a.beginPath(); if (s.e) a.ellipse(s.e.x, s.e.y, s.e.rx, s.e.ry, 0, 0, 6.283); else { a.moveTo(s.pts[0].x, s.pts[0].y); for (let i = 1; i < s.pts.length; i++) a.lineTo(s.pts[i].x, s.pts[i].y); a.closePath(); } a.fill(); }
      Bc.cx.filter = 'blur(' + (PATH[kind].blur / SS).toFixed(2) + 'px)'; Bc.cx.drawImage(A.c, 0, 0); Bc.cx.filter = 'none';
      const d = Bc.cx.getImageData(0, 0, w, h).data, c = new Float32Array(w * h); for (let i = 0, q = 3; i < c.length; i++, q += 4) c[i] = d[q] / 255;
      const sample = (x, y) => { const fx = x / SS - x0 - .5, fy = y / SS - y0 - .5, ix = Math.floor(fx), iy = Math.floor(fy); if (ix < 0 || iy < 0 || ix >= w - 1 || iy >= h - 1) return 0; const u = fx - ix, v = fy - iy, q = iy * w + ix; return (c[q] * (1 - u) + c[q + 1] * u) * (1 - v) + (c[q + w] * (1 - u) + c[q + w + 1] * u) * v; };
      return { c, w, h, x0, y0, sample, rs };
    };
    // an alpha picture of the coverage through a curve fn(c, noise) -> 0..1, to be drawn over the chunk
    const alphaOf = (name, cov, fn, amp, scale) => {
      const s = scratch(name, cov.w, cov.h, { willReadFrequently: true }), img = s.cx.createImageData(cov.w, cov.h), d = img.data;
      for (let j = 0, i = 0, q = 0; j < cov.h; j++) for (let x = 0; x < cov.w; x++, i++, q += 4) { const v = cov.c[i]; if (v < .02) continue; let nz = 0; if (amp && v < .985) { const X = (cov.x0 + x) * SS, Y = (cov.y0 + j) * SS; nz = (noise(X / scale, Y / (scale * .7), 51) * .65 + noise(X / (scale * .32), Y / (scale * .24), 52) * .35 - .5) * amp; } d[q + 3] = Math.round(clamp(fn(v, nz), 0, 1) * 255); }
      s.cx.putImageData(img, 0, 0); return s.c;
    };
    const lay = (cx, cov, pic) => { cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(pic, cov.x0 * SS, cov.y0 * SS, cov.w * SS, cov.h * SS); };
    const fillThrough = (B, cov, pic, paint) => { const cx = B.cx, c = cx.canvas, s = scratch('kind', c.width, c.height); s.cx.setTransform(cx.getTransform()); paint(s.cx); s.cx.globalCompositeOperation = 'destination-in'; lay(s.cx, cov, pic); s.cx.globalCompositeOperation = 'source-over'; cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(s.c, 0, 0); cx.restore(); };
    const grassIn = (cx, cb, cov, lo, hi, salt) => {
      cx.lineCap = 'round';
      tiles(cb, 16, 6, salt, (tx, ty, r) => { for (let i = 0; i < 9; i++) { const x = tx + r() * 16, y = ty + r() * 16, v = cov.sample(x, y); if (v < lo || v > hi) continue; const k = env.kindAt ? env.kindAt(x, y) : 'lawn'; if (!k || SHORE.has(k) || k === 'soil') continue; const P = palette(k, season), q = rng(hash(Math.round(x * 8), Math.round(y * 8), salt) | 1), n = 2 + Math.floor(q() * 3); for (let b = 0; b < n; b++) blade(cx, x + b * .8, y + 1, (q() - .5) * 3.4, 2.6 + q() * 4.2, q() < .5 ? P.lo : P.mid, 1, .75); if (q() < .1) blob(cx, q, x, y, 3 + q() * 3, 1.5 + q(), 6, .5, P.lo, .5); } });
      cx.globalAlpha = 1;
    };
    const clips = cx => { void cx; };   // (allow and within shape the coverage itself, softly: no op cuts on a ruled line)
    const verge = (cx, cb, cov, salt) => {
      if (season === 'winter') return;
      tiles(cb, 24, 8, salt, (tx, ty, r) => { for (let i = 0; i < 4; i++) { const x = tx + r() * 24, y = ty + r() * 24, v = cov.sample(x, y); if (v < .05 || v > .3 || noise(x / 70, y / 50, 211) < .57) continue; const k = env.kindAt ? env.kindAt(x, y) : 'lawn'; if (k !== 'lawn' && k !== 'meadow') continue;
        const q = rng(hash(Math.round(x * 8), Math.round(y * 8), salt) | 1), t = q(), P = palette(k, season), hh = 3 + q() * 3.5, col = season === 'autumn' ? (t < .5 ? '#e8dcc0' : '#d8a040') : t < .4 ? '#f6f2e4' : t < .7 ? '#f0d24a' : t < .86 ? '#e88ab0' : '#8f8fe0';
        ell(cx, x + .5, y + .5, 1.8, .8, P.shadow, .25); blade(cx, x, y, (q() - .5) * 1.6, hh, P.lo, .8, .8); ell(cx, x, y - hh, 1.5, 1.3, col, .95); if (t < .4) ell(cx, x, y - hh, .5, .45, '#e8c040', 1); } });
      cx.globalAlpha = 1;
    };
    const fringe = kind => ({ bb: bbAll, seed: 720 + PATH[kind].rank, name: kind + ' fringe', draw(B, r0, cb) {
      const cov = coverage(cb, kind); if (!cov) return; const cx = B.cx; clips(cx);
      if (kind === 'gravel' || kind === 'earth') tiles(cb, 48, 6, 155, (tx, ty, r) => { for (let i = 0; i < 3; i++) { const x = tx + r() * 48, y = ty + r() * 48, s = 1 + r() * 2; if (cov.sample(x, y) < .6) continue; pebble(cx, rng(hash(Math.round(x * 8), Math.round(y * 8), 156) | 1), x, y, s, { shadow: '#6e5e3e', stone: '#c9bb98', stoneLo: '#a8997a', stoneHi: '#efe4c6' }); } });
      if (kind === 'cobble' || kind === 'setts') {   // light and shade over the laid stones, and the middle worn paler by feet: one surface, not a grid of bricks
        const body = alphaOf('alB', cov, v => smooth(.5, .62, v), 0, 15);
        cx.globalAlpha = .24; fillThrough(B, cov, body, sx => wash(sx, cb, { base: '#c8b48c', lo: '#84765a', hi: '#f2e6c2', warm: '#d6b684', cool: '#a09e92' }, 137, 1.7)); cx.globalAlpha = 1;
        cx.globalAlpha = .13; { const t = scratch('tint', cov.w, cov.h), pic = alphaOf('alM', cov, (v, nz) => smooth(.9, 1, v + nz), .1, 30); t.cx.fillStyle = '#f3e7c4'; t.cx.fillRect(0, 0, cov.w, cov.h); t.cx.globalCompositeOperation = 'destination-in'; t.cx.drawImage(pic, 0, 0); lay(cx, cov, t.c); } cx.globalAlpha = 1;
      }
      if (kind === 'earth') grassIn(cx, cb, cov, .5, .78, 157);   // (a trail is half grown over)
      grassIn(cx, cb, cov, .3, .56, 159); verge(cx, cb, cov, 163);
    } });
    // The stones: courses that run across the screen, every stone its own width, tone and corners, lit on its upper left.
    // A stone is laid where its middle is on the road, so the road's edge is the stones' own edge, never a ruled line.
    const TONES = ['#bfa97f', '#c9b489', '#d4c097', '#cebc98', '#b59d76', '#c6bda6', '#afa48e', '#d0b9a0'];
    const stones = (kind, phase) => ({ bb: bbAll, seed: 740 + phase, name: kind + ' stones ' + phase, draw(B, r0, cb) {
      const cov = coverage(cb, kind); if (!cov) return; const cx = B.cx, winter = season === 'winter', fine = scaleOf(cx) >= 1.3, over = kind === 'cobble' && kindsUsed.has('setts') ? coverage(cb, 'setts') : null; clips(cx);
      const setts = kind === 'setts', rowH = setts ? 8.4 : 6.6, tw = 96, y0 = Math.floor((cb[1] - 8) / rowH), y1 = Math.floor((cb[3] + 8) / rowH);
      for (let ry = y0; ry <= y1; ry++) { if (((ry % 3) + 3) % 3 !== phase) continue; const off = h01(ry, 7, 141) * tw, t0 = Math.floor((cb[0] - 12 - off) / tw), t1 = Math.floor((cb[2] + 12 - off) / tw);
        for (let t = t0; t <= t1; t++) { const r = rng(hash(t, ry, 143) | 1), ws = []; let sum = 0; while (sum < tw) { const w = (setts ? 8.5 : 5.6) + r() * (setts ? 7 : 3.2); ws.push(w); sum += w; } const f = tw / sum; let x = t * tw + off;
          for (const w0 of ws) { const w = w0 * f, mx = x + w / 2 + (r() - .5) * .5, my = (ry + .5) * rowH + (r() - .5) * .9, tone = r(), c1 = r(), j = r(); x += w; if (mx < cb[0] - 8 || mx > cb[2] + 8) continue; const v = cov.sample(mx, my); if (v < .5 + (j - .5) * .12 || over && over.sample(mx, my) > .46) continue;
            const sw = w - 1.1 - j * .5, sh = rowH - 1.1 - (1 - j) * .5, base = TONES[tone < .14 ? 0 : tone < .36 ? 1 : tone < .58 ? 2 : tone < .72 ? 3 : tone < .82 ? 4 : tone < .9 ? 5 : tone < .96 ? 6 : 7], x0 = mx - sw / 2, yy = my - sh / 2;
            const rad = fine ? [1 + c1 * 1.6, 1 + j * 1.6, 1 + (1 - c1) * 1.6, 1 + (1 - j) * 1.6] : 1.4;
            cx.globalAlpha = .26; cx.fillStyle = '#5e4e34'; cx.beginPath(); cx.roundRect(x0 + .5, yy + .7, sw, sh, rad); cx.fill();
            cx.globalAlpha = 1; cx.fillStyle = base; cx.beginPath(); cx.roundRect(x0, yy, sw, sh, rad); cx.fill();
            if (!fine) continue;
            cx.globalAlpha = v > .97 ? .3 : .18; cx.fillStyle = '#f4e8c6'; cx.beginPath(); cx.roundRect(x0 + .6, yy + .5, sw * .62, sh * .3, 1); cx.fill();
            cx.globalAlpha = .2; cx.fillStyle = '#7a6648'; cx.beginPath(); cx.roundRect(x0 + .5, yy + sh - 1.6, sw - 1, 1.3, .7); cx.fill();
            if (c1 < .035) { const a = .2 + tone * .6, b = .2 + j * .6; cx.globalAlpha = .3; cx.strokeStyle = '#7a6648'; cx.lineWidth = .5; cx.beginPath(); cx.moveTo(x0 + sw * a, yy + .8); cx.lineTo(x0 + sw * (a + b) / 2 + (tone - .5) * 2, yy + sh * (.35 + j * .3)); cx.lineTo(x0 + sw * b, yy + sh - .8); cx.stroke(); }   // (the odd cracked stone, each its own crack)
            if (v < .8 && j > .62 && !winter) { const q = rng(hash(Math.round(mx * 4), Math.round(my * 4), 145) | 1); blob(cx, q, mx + w / 2, my + (j - .8) * 6, 1.4 + q() * 1.8, .9 + q(), 5, .5, q() < .5 ? '#7d8f4e' : '#93a252', .75); }   // (moss and weeds in the joints towards the edge)
          } } }
      cx.globalAlpha = 1;
    } });
    const soft = kind => ({ bb: bbAll, seed: 700 + PATH[kind].rank, name: kind, draw(B, r0, cb) {
      const cov = coverage(cb, kind); if (!cov) return; const cx = B.cx, S0 = PATH[kind], winter = season === 'winter'; clips(cx);
      // the trodden margin: the ground thins and browns before the path begins (soft, and wider than the path)
      cx.globalAlpha = S0.margin; { const s = scratch('tint', cov.w, cov.h), pic = alphaOf('alM', cov, (v, nz) => smooth(.04, .5, v + nz), .16, 30); s.cx.fillStyle = winter ? '#8f8a6a' : '#7d7244'; s.cx.fillRect(0, 0, cov.w, cov.h); s.cx.globalCompositeOperation = 'destination-in'; s.cx.drawImage(pic, 0, 0); lay(cx, cov, s.c); } cx.globalAlpha = 1;
      const body = alphaOf('alB', cov, (v, nz) => smooth(.5 - .09, .5 + .09, v + nz), S0.edge, kind === 'earth' ? 34 : kind === 'gravel' ? 28 : 15);   // (the edge wanders a few px either way, so a straight route never has a ruled edge)
      if (kind === 'cobble' || kind === 'setts') {
        fillThrough(B, cov, body, sx => wash(sx, cb, { base: S0.bed, lo: '#8c7c5c', hi: '#b8a680', warm: '#ae9a70', cool: '#9a927c' }, 131, .7));
        // (the stones are laid by their own ops below, a third of the courses each, so no slice is long)
      } else {
        const P = kind === 'gravel' ? { base: S0.bed, lo: '#b29a6b', hi: '#e5d5ab', warm: '#d9bf8a', cool: '#c9bd9c' } : { base: S0.bed, lo: '#9c855a', hi: '#d9c698', warm: '#c4a26c', cool: '#b0a682' };
        fillThrough(B, cov, body, sx => { wash(sx, cb, P, kind === 'gravel' ? 151 : 161, 1); const g = grains(sx, [P.lo, P.hi, '#a89068'], .5); tiles(cb, 32, 3, 153, (tx, ty, r) => { for (let i = 0; i < (kind === 'gravel' ? 46 : 20); i++) { const x = tx + r() * 32, y = ty + r() * 32, ci = r() < .5 ? 0 : r() < .6 ? 1 : 2, w = .9 + r() * 1.3; r(); g.add(x, y, w, ci); } }); g.flush(); sx.globalAlpha = 1; });
        // beaten paler down the middle, where feet and wheels go
        cx.globalAlpha = kind === 'gravel' ? .5 : .42; { const s = scratch('tint', cov.w, cov.h), pic = alphaOf('alM', cov, (v, nz) => smooth(.86, 1, v + nz), .1, 26); s.cx.fillStyle = kind === 'gravel' ? '#ecdfb8' : '#d2bd8e'; s.cx.fillRect(0, 0, cov.w, cov.h); s.cx.globalCompositeOperation = 'destination-in'; s.cx.drawImage(pic, 0, 0); lay(cx, cov, s.c); } cx.globalAlpha = 1;
      }
    } });
    // boardwalks and steps keep their own shape: planks or treads laid across the line, one every few px along it
    const planks = { bb: bbAll, seed: 790, draw(B, r0, cb) {
      const cx = B.cx; if (env.allow) cx.clip(env.allow, 'evenodd');
      for (const rt of routes) { const S0 = PATH[rt.kind]; if (!S0.planks || !meets(rt.bb, cb)) continue; const L = rt.line, steps = rt.kind === 'steps', gap = steps ? 9 : 5.2, D = L[L.length - 1].d; let next = 0, n = 0;
        // no square ends: the ground is trodden bare where a walk or a stair begins, and its last boards are shorter, as if laid to fit
        if (!rt.closed) for (const e of [L[0], L[L.length - 1]]) { if (e.x < cb[0] - 40 || e.x > cb[2] + 40 || e.y < cb[1] - 40 || e.y > cb[3] + 40) continue; const R = Math.max(10, e.w * .9), g = cx.createRadialGradient(e.x, e.y, 0, e.x, e.y, R); g.addColorStop(0, 'rgba(150,126,88,.6)'); g.addColorStop(.55, 'rgba(150,126,88,.32)'); g.addColorStop(1, 'rgba(150,126,88,0)'); cx.save(); cx.translate(e.x, e.y); cx.scale(1, .72); cx.translate(-e.x, -e.y); cx.globalAlpha = 1; cx.fillStyle = g; cx.beginPath(); cx.arc(e.x, e.y, R, 0, Math.PI * 2); cx.fill(); cx.restore(); }
        if (!steps) for (let i = 1; i < L.length; i++) { const p = L[i - 1], q = L[i]; if (Math.max(p.x, q.x) < cb[0] - 30 || Math.min(p.x, q.x) > cb[2] + 30 || Math.max(p.y, q.y) < cb[1] - 30 || Math.min(p.y, q.y) > cb[3] + 30) continue; cx.globalAlpha = .2; cx.strokeStyle = '#26341c'; cx.lineWidth = p.w + 3; cx.lineCap = i === 1 || i === L.length - 1 ? 'round' : 'butt'; cx.beginPath(); cx.moveTo(p.x + 2, p.y + 3); cx.lineTo(q.x + 2, q.y + 3); cx.stroke(); }
        for (let i = 1; i < L.length; i++) { const p = L[i - 1], q = L[i]; while (next <= q.d) { const t = (next - p.d) / Math.max(.001, q.d - p.d), x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t, end = rt.closed ? 99 : Math.min(next, D - next), hw = (p.w + (q.w - p.w) * t) / 2 * (end < gap * .7 ? .68 : end < gap * 1.8 ? .86 : 1), k = n++; next += gap; if (x < cb[0] - 30 || x > cb[2] + 30 || y < cb[1] - 30 || y > cb[3] + 30) continue;
          const r = rng(hash(k, rt.salt, 171) | 1), ang = Math.atan2(q.y - p.y, q.x - p.x), tone = r();
          cx.save(); cx.translate(x, y); cx.rotate(ang + (r() - .5) * .05);
          if (steps) { cx.globalAlpha = .4; cx.fillStyle = '#4a4232'; cx.beginPath(); cx.roundRect(-3.4, -hw + 1.2, 7.4, hw * 2, 1.6); cx.fill(); cx.globalAlpha = 1; cx.fillStyle = tone < .4 ? '#b8ae96' : tone < .8 ? '#c8bea4' : '#a89e88'; cx.beginPath(); cx.roundRect(-3.6, -hw, 6.6, hw * 2 - .6, 1.6); cx.fill(); cx.globalAlpha = .5; cx.fillStyle = '#e4dcc6'; cx.beginPath(); cx.roundRect(-3.2, -hw + .6, 2, hw * 2 - 2, 1); cx.fill(); if (r() < .3) blob(cx, r, 2.6, (r() - .5) * hw * 1.6, 2, 1.2, 5, .5, '#7d8f4e', .7); }
          else { const len = hw * 2 + (r() - .5) * 2.4; cx.globalAlpha = 1; cx.fillStyle = tone < .35 ? '#9a7a54' : tone < .7 ? '#a8865c' : '#8a6c4a'; cx.beginPath(); cx.roundRect(-2.2, -len / 2, 4.5, len, .8); cx.fill(); cx.globalAlpha = .45; cx.fillStyle = '#c4a478'; cx.fillRect(-2, -len / 2 + .6, 1.2, len - 1.2); cx.globalAlpha = .5; cx.fillStyle = '#4a3a2c'; cx.fillRect(1.6, -len / 2 + .4, .7, len - .8); cx.globalAlpha = .8; cx.fillStyle = '#3a2e22'; cx.fillRect(-.4, -len / 2 + 1.6, .9, .9); cx.fillRect(-.4, len / 2 - 2.5, .9, .9); }
          cx.restore(); } }
      }
      cx.globalAlpha = 1;
    } };
    return ['earth', 'gravel', 'cobble', 'setts'].filter(k => kindsUsed.has(k)).flatMap(k => k === 'cobble' || k === 'setts' ? [soft(k), stones(k, 0), stones(k, 1), stones(k, 2), fringe(k)] : [soft(k), fringe(k)]).concat(kindsUsed.has('boardwalk') || kindsUsed.has('steps') ? [planks] : []);
  }

  function status() { const layers = [...registry].map(h => ({ key: String(h.key).slice(0, 24), level: h.level, chunks: h.chunks, live: h.live, MB: h.MB, baked: h.baked, evicted: h.evicted, medianMs: h.median, p95Ms: h.p95, worstChunkMs: h.worstMs, worstSliceMs: h.sliceWorstMs })); return { layers, MB: +layers.reduce((a, l) => a + l.MB, 0).toFixed(1), slow: Object.assign({}, slow), lastError }; }
  return { resetSlow() { slow.opMs = 0; slow.op = ''; slow.uploadMs = 0; slow.tickMs = 0; }, LIGHT, contact, castShadow, castRuns, lightPool, cast, layer, levelFor, LEVELS, KINDS, palette, paintKind, wash, kindGrid, layoutKinds, layoutPaths, routeKind, ROUTE_WIDTH, ground, paths, flower, softCut, centreLine, tiles, rng, hash, hashStr, noise, fbm, mix, scratch, status, get lastError() { return lastError; }, set lastError(v) { lastError = v; } };
})();
