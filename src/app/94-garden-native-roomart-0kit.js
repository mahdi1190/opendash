/* Painted rooms: the indoor places drawn in the Painted village's own hand
 * (the opening scenes' flat-vector house style: soft shading lit from one
 * source, no outlines, lobed natural shapes), one bespoke picture per room.
 *
 * Each room in GRA_ROOMS is { ambient, lights, fx, paint }: paint is a
 * generator drawing on a 2D canvas in room units (960 x 600, GRM), yielding
 * between layers so the bake runs in small slices across frames and never
 * blocks the main thread. The finished canvas becomes one cached texture (a
 * couple are kept, so walking back in is instant); only a few light moving
 * things (motes, candle flicker, glints, falling water) stay live.
 *
 * Only presentation: spots, floors, doors, water cells and the games are the
 * room rows' own (94-garden-world-5rooms.js). Off unless the Painted village
 * style is chosen (GardenNativePainted.wanted()). */
const GRA_ROOMS = {};
window.GardenRoomArt = (function () {
  'use strict';
  const K = 2, W = 960, H = 600, SLICE = 10, KEEP = 3;
  const baked = new Map();                        // room id -> { key, canvas }
  let fxSerial = 0;
  function wanted(room) { try { return !!(room && GRA_ROOMS[room.id] && window.GardenNativePainted && GardenNativePainted.wanted()); } catch (e) { return false; } }
  function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; s = s % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const hex = c => { c = String(c).replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const p = hex(a), q = hex(b); return toHex(p.map((v, i) => v + (q[i] - v) * t)); };
  const shade = (c, k) => k >= 0 ? mix(c, '#fff4e0', k) : mix(c, '#140c08', -k);
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  /* ---------- the painter's kit, in room units ---------- */
  function kit(cx, seed) {
    const r = rng(seed);
    const T = {
      cx, r, W, H, mix, shade, rgba,
      rnd: (a, b) => a + r() * (b - a),
      pick: list => list[Math.floor(r() * list.length) % list.length],
      lin(x1, y1, x2, y2, stops) { const g = cx.createLinearGradient(x1, y1, x2, y2); for (const [o, c, a] of stops) g.addColorStop(o, a == null ? c : rgba(c, a)); return g; },
      rad(x, y, rr, stops, r0) { const g = cx.createRadialGradient(x, y, r0 || 0, x, y, rr); for (const [o, c, a] of stops) g.addColorStop(o, a == null ? c : rgba(c, a)); return g; },
      alpha(a) { cx.globalAlpha = a == null ? 1 : a; },
      path(d) { return typeof d === 'string' ? new Path2D(d) : d; },
      fill(d, style, a) { T.alpha(a); cx.fillStyle = style; cx.fill(T.path(d)); T.alpha(1); },
      stroke(d, style, w, a, cap) { T.alpha(a); cx.strokeStyle = style; cx.lineWidth = w; cx.lineCap = cap || 'round'; cx.lineJoin = 'round'; cx.stroke(T.path(d)); T.alpha(1); },
      rect(x, y, w, h, style, a) { T.alpha(a); cx.fillStyle = style; cx.fillRect(x, y, w, h); T.alpha(1); },
      rrect(x, y, w, h, rr, style, a) { T.alpha(a); cx.fillStyle = style; cx.beginPath(); cx.roundRect(x, y, w, h, rr); cx.fill(); T.alpha(1); },
      ell(x, y, rx, ry, style, a, rot) { T.alpha(a); cx.fillStyle = style; cx.beginPath(); cx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2); cx.fill(); T.alpha(1); },
      poly(pts, style, a) { T.alpha(a); cx.fillStyle = style; cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]); cx.closePath(); cx.fill(); T.alpha(1); },
      blob(x, y, rx, ry, style, a, n, rag) { T.fill(sceneDraw.blob(r, x, y, rx, ry, n || 9, rag == null ? .35 : rag), style, a); },
      clip(d, fn) { cx.save(); cx.clip(T.path(d)); fn(); cx.restore(); },
      clipRect(x, y, w, h, fn) { cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip(); fn(); cx.restore(); },
      /** a soft pool of light, added (lighter) so it brightens what is under it */
      glow(x, y, rr, c, a, op) { cx.save(); cx.globalCompositeOperation = op || 'lighter'; T.alpha(a == null ? .5 : a); cx.fillStyle = T.rad(x, y, rr, [[0, c, 1], [.35, c, .45], [1, c, 0]]); cx.fillRect(x - rr, y - rr, rr * 2, rr * 2); cx.restore(); },
      /** a soft contact or cast shadow */
      soft(x, y, rx, ry, a, c) { cx.save(); cx.translate(x, y); cx.scale(1, ry / rx); T.alpha(a == null ? .35 : a); cx.fillStyle = T.rad(0, 0, rx, [[0, c || '#0a0604', 1], [.55, c || '#0a0604', .5], [1, c || '#0a0604', 0]]); cx.fillRect(-rx, -rx, rx * 2, rx * 2); cx.restore(); },
      /** a beam of light through a window: bright at its source, gone by its end */
      shaft(pts, c, a, y0, y1) {
        // feathered: the same beam a few times, each a little wider and fainter
        const mx = pts.reduce((v, p) => v + p[0], 0) / pts.length;
        cx.save(); cx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 5; k++) {
          const g = 1 + k * .09; cx.fillStyle = T.lin(0, y0, 0, y1, [[0, c, a * .3], [.12, c, a * .3], [.65, c, a * .14], [1, c, 0]]);
          cx.beginPath(); pts.forEach((p, i) => { const x = mx + (p[0] - mx) * g; if (i) cx.lineTo(x, p[1]); else cx.moveTo(x, p[1]); }); cx.closePath(); cx.fill();
        }
        cx.restore();
      },
      /** wood grain: long wavy strands with a few knots, inside a box */
      grain(x, y, w, h, c, a, vertical, density) {
        const n = Math.max(2, Math.round((vertical ? w : h) / (density || 5)));
        cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip(); cx.strokeStyle = c; cx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          cx.globalAlpha = a * (.4 + r() * .6); cx.lineWidth = .6 + r() * 1.2; cx.beginPath();
          const o = (i + r() * .8) / n, amp = 1 + r() * 2.5, ph = r() * 6, f = .01 + r() * .03;
          if (vertical) { const gx = x + o * w; cx.moveTo(gx, y); for (let t = 0; t <= h; t += 12) cx.lineTo(gx + Math.sin(t * f + ph) * amp, y + t); }
          else { const gy = y + o * h; cx.moveTo(x, gy); for (let t = 0; t <= w; t += 12) cx.lineTo(x + t, gy + Math.sin(t * f + ph) * amp); }
          cx.stroke();
        }
        const knots = Math.floor(w * h / 9000 * r()); for (let k = 0; k < knots; k++) { const kx = x + r() * w, ky = y + r() * h; T.ell(kx, ky, 3 + r() * 3, 1.6 + r() * 2, c, a * 1.2, vertical ? Math.PI / 2 : 0); }
        cx.restore(); T.alpha(1);
      },
      /** upright planks: each its own board, with grain, a dark seam and a lit edge */
      planksV(x0, y0, x1, y1, o) {
        o = o || {}; const base = o.base || '#6a4a2c', wMin = o.w || 34, wMax = o.wMax || wMin * 1.5;
        for (let x = x0; x < x1;) {
          const w = wMin + r() * (wMax - wMin), c = shade(base, (r() - .5) * (o.var || .22)), top = y0 + (o.ragged ? r() * o.ragged : 0);
          T.rect(x, top, w + 1, y1 - top, c); T.grain(x, top, w, y1 - top, shade(c, -.4), o.grainA || .35, true, 4);
          T.rect(x, top, 2, y1 - top, shade(c, .25), .5); T.rect(x + w - 2, top, 2.5, y1 - top, '#000', o.gap || .45);
          if (o.nails) for (const ny of o.nails) { T.ell(x + 6, ny, 1.8, 1.8, '#1a1410', .7); T.ell(x + w - 7, ny, 1.8, 1.8, '#1a1410', .7); }
          x += w;
        }
      },
      /** boards going away to a vanishing point: the floor of a room */
      floorBoards(y0, y1, o) {
        o = o || {}; const vx = o.vx == null ? 480 : o.vx, n = o.n || 16, base = o.base || '#6a4a2c', x0 = o.x0 == null ? -200 : o.x0, x1 = o.x1 == null ? 1160 : o.x1;
        cx.save(); cx.beginPath(); cx.rect(0, y0, W, y1 - y0); cx.clip();
        const spread = o.spread || 2.6;
        for (let i = 0; i < n; i++) {
          const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n, ta = vx + (a - vx) / spread, tb = vx + (b - vx) / spread, c = shade(base, (r() - .5) * (o.var || .2));
          T.poly([[ta, y0], [tb, y0], [b, y1], [a, y1]], c);
          // grain along the board
          cx.strokeStyle = shade(c, -.35); for (let g = 0; g < 4; g++) { const u = .15 + r() * .7; cx.globalAlpha = .18 + r() * .2; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(ta + (tb - ta) * u, y0); cx.lineTo(a + (b - a) * u + (r() - .5) * 6, y1); cx.stroke(); }
          cx.globalAlpha = 1; T.stroke(`M${tb} ${y0}L${b} ${y1}`, '#000', 1.6, o.seam || .35);
          // board ends, staggered
          for (let k = 0; k < 2; k++) { const v = .15 + r() * .8, yy = y0 + (y1 - y0) * v * v, xa = ta + (a - ta) * v * v, xb = tb + (b - tb) * v * v; T.stroke(`M${xa} ${yy}L${xb} ${yy}`, '#000', 1.2, .28); }
        }
        cx.restore();
        // depth: darker far away, worn and paler where people walk
        T.rect(0, y0, W, y1 - y0, T.lin(0, y0, 0, y1, [[0, '#000', .38], [.35, '#000', .12], [1, '#000', 0]]));
        if (o.wear) T.soft(o.wear[0], o.wear[1], o.wear[2], o.wear[3], .18, '#fff0d0');
      },
      /** a rough stone wall in courses: each stone a lobed shape, lit from the light side */
      stones(x0, y0, x1, y1, o) {
        o = o || {}; const base = o.base || '#7a756c', ch = o.h || 34, cw = o.w || 60, light = o.light || -1;
        T.rect(x0, y0, x1 - x0, y1 - y0, o.mortar || shade(base, -.45));
        for (let y = y0, row = 0; y < y1; y += ch, row++) for (let x = x0 - (row % 2) * cw / 2 - r() * 10; x < x1; x += cw * (.75 + r() * .5)) {
          const w = cw * (.7 + r() * .4), hh = ch * (.82 + r() * .14), c = shade(base, (r() - .5) * (o.var || .26)), mx = x + w / 2, my = y + hh / 2;
          T.blob(mx, my, w / 2 - 2, hh / 2 - 1.5, c, 1, 7, .18);
          T.blob(mx + light * w * .12, my - hh * .14, w * .3, hh * .26, shade(c, .18), .55, 6, .3);
          T.blob(mx - light * w * .1, my + hh * .18, w * .36, hh * .2, shade(c, -.25), .5, 6, .3);
        }
      },
      /** flagstones on a floor, in perspective: rows deepen toward you, joints staggered */
      flags(y0, y1, o) {
        o = o || {}; const base = o.base || '#6a665e', vx = o.vx == null ? 480 : o.vx, spread = o.spread || 2.4;
        T.rect(0, y0, W, y1 - y0, o.mortar || shade(base, -.3));
        let y = y0, row = 0, h = o.h || 14;
        while (y < y1) {
          const k = (y - y0) / (y1 - y0), sw = (o.w || 120) * (1 / spread + (1 - 1 / spread) * k);
          for (let x = -sw - r() * sw; x < W + sw;) {
            const w = sw * (.55 + r() * .9), hh = h * (r() < .25 ? 2 : 1) - 2, c = shade(base, (r() - .5) * (o.var || .22)), sx = vx + (x - vx) * (1 - .04 * (1 - k)), jy = (r() - .5) * h * .12;
            if (hh > h && y + hh > y1 + h) { x += w; continue; }
            const d = `M${sx + 2 + r() * 3} ${y + 1 + jy}L${sx + w - 2 - r() * 3} ${y + 1 + jy + (r() - .5) * 2}L${sx + w - 1 - r() * 4} ${y + hh + jy}L${sx + 1 + r() * 4} ${y + hh + jy + (r() - .5) * 2}Z`;
            T.fill(d, c); T.rect(sx + 4, y + 1.5 + jy, w - 10, Math.max(1, h * .1), shade(c, .18), .4);
            if (r() < .35) T.ell(sx + r() * w, y + hh * .5, w * .18, hh * .2, shade(c, (r() - .5) * .5), .3);
            if (r() < .12) T.stroke(`M${sx + w * .3} ${y + 2}l${w * .1} ${hh * .5}l${w * .15} ${hh * .4}`, shade(c, -.4), 1, .5);
            x += w;
          }
          y += h; h *= o.grow || 1.16; row++;
        }
        T.rect(0, y0, W, y1 - y0, T.lin(0, y0, 0, y1, [[0, '#000', .3], [.4, '#000', .08], [1, '#000', .15]]));
      },
      /** brick courses with soft lime mortar */
      bricks(x0, y0, x1, y1, o) {
        o = o || {}; const base = o.base || '#8a4a32', bh = o.h || 16, bw = o.w || 40;
        T.rect(x0, y0, x1 - x0, y1 - y0, o.mortar || '#b8a890');
        for (let y = y0, row = 0; y < y1; y += bh, row++) for (let x = x0 - (row % 2) * bw / 2; x < x1; x += bw) {
          const c = shade(base, (r() - .5) * (o.var || .3)); T.rrect(x + 1.2, y + 1.2, bw - 2.4, bh - 2.4, 1.5, c);
          T.rect(x + 2, y + 1.5, bw - 5, 2, shade(c, .2), .5); if (r() < .25) T.ell(x + r() * bw, y + bh / 2, 4 + r() * 6, 2, shade(c, -.3), .4);
        }
      },
      /** plaster or lime-wash: one colour with soft clouds of wear, damp and repair */
      plaster(x0, y0, x1, y1, base, o) {
        o = o || {}; T.rect(x0, y0, x1 - x0, y1 - y0, base);
        cx.save(); cx.beginPath(); cx.rect(x0, y0, x1 - x0, y1 - y0); cx.clip();
        const n = (x1 - x0) * (y1 - y0) / 3600; for (let i = 0; i < n; i++) T.blob(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 24 + r() * 60, 14 + r() * 30, shade(base, (r() - .5) * (o.var || .18)), .14, 8, .5);
        if (o.damp) T.rect(x0, y1 - o.damp, x1 - x0, o.damp, T.lin(0, y1 - o.damp, 0, y1, [[0, '#2a2018', 0], [1, '#2a2018', .35]]));
        if (o.cracks) for (let i = 0; i < o.cracks; i++) { let x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), d = `M${x} ${y}`; for (let k = 0; k < 6; k++) { x += (r() - .5) * 24; y += 6 + r() * 14; d += `L${x} ${y}`; } T.stroke(d, shade(base, -.5), 1, .35); }
        cx.restore();
      },
      /** cloth hanging from a line: folds as soft light and dark bands */
      cloth(x, y, w, h, c, o) {
        o = o || {}; const folds = o.folds || Math.max(3, Math.round(w / 18)), sag = o.sag || 0;
        const d = `M${x} ${y}Q${x + w / 2} ${y + sag} ${x + w} ${y}L${x + w + (o.flare || 6)} ${y + h}Q${x + w / 2} ${y + h + (o.hem || 6)} ${x - (o.flare || 6)} ${y + h}Z`;
        T.fill(d, c);
        T.clip(d, () => { for (let i = 0; i < folds; i++) { const fx = x + (i + .5) * w / folds; T.rect(fx - w / folds * .18, y, w / folds * .36, h + 10, T.lin(fx - 8, 0, fx + 8, 0, [[0, shade(c, -.35), 0], [.5, shade(c, -.35), .5], [1, shade(c, -.35), 0]])); T.rect(fx + w / folds * .22, y, w / folds * .2, h + 10, shade(c, .2), .35); } T.rect(x - 10, y, w + 20, h * .25, T.lin(0, y, 0, y + h * .25, [[0, '#000', .25], [1, '#000', 0]])); });
      },
      /** a painterly finish: faint brush dabs of light and dark, and a vignette */
      finish(o) {
        o = o || {};
        for (let i = 0; i < (o.dabs || 520); i++) { const x = r() * W, y = r() * H; T.ell(x, y, 12 + r() * 36, 3 + r() * 7, r() < .5 ? '#fff6e0' : '#100806', .012 + r() * .016, (r() - .5) * .3); }
        const v = o.vignette == null ? .5 : o.vignette;
        if (v) { cx.save(); cx.translate(W / 2, H * .45); cx.scale(1, .68); T.rect(-W, -W, W * 2, W * 2, T.rad(0, 0, W * .72, [[0, '#000', 0], [.6, '#000', 0], [1, o.vcol || '#06040a', v]])); cx.restore(); }
      },
      /** where a wall meets the floor: contact shadow */
      skirt(y, a, c) { T.rect(0, y - 26, W, 26, T.lin(0, y - 26, 0, y, [[0, c || '#000', 0], [1, c || '#000', a == null ? .4 : a]])); T.rect(0, y, W, 22, T.lin(0, y, 0, y + 22, [[0, c || '#000', (a == null ? .4 : a) * 1.1], [1, c || '#000', 0]])); },
      /** a flame, painted (the live flicker sits over it) */
      flame(x, y, k) { k = k || 1; T.glow(x, y - 6 * k, 26 * k, '#ffb050', .5); T.fill(`M${x} ${y - 22 * k}Q${x + 7 * k} ${y - 8 * k} ${x + 4 * k} ${y - 2 * k}Q${x} ${y + 2 * k} ${x - 4 * k} ${y - 2 * k}Q${x - 7 * k} ${y - 8 * k} ${x} ${y - 22 * k}Z`, '#ffcf6a'); T.ell(x, y - 6 * k, 2.4 * k, 5 * k, '#fff8d8'); },
      /** a candle stub: wax with a drip and a lit flame */
      candle(x, y, w, h, wax) { const c = wax || '#efe3c4'; T.soft(x, y + 2, w * 1.2, w * .4, .4); T.rrect(x - w / 2, y - h, w, h, w * .2, T.lin(x - w / 2, 0, x + w / 2, 0, [[0, shade(c, .2)], [.6, c], [1, shade(c, -.3)]])); T.fill(`M${x - w / 2} ${y - h}q${w * .3} ${h * .3} ${w * .45} ${0}q${w * .2} ${h * .18} ${w * .55} 0z`, shade(c, .12)); T.stroke(`M${x} ${y - h}v-${4}`, '#2a1a10', 1.4); T.flame(x, y - h - 3, w / 12); },
    };
    return T;
  }

  /* ---------- baking, in slices ----------
   * The picture is painted in BANDS horizontal strips, each its own small
   * canvas: the painter runs once per strip, clipped to it, so a step pays
   * for a sixth of its pixels; each strip is uploaded on its own frame. */
  const BANDS = 6, BH = H / BANDS;
  function begin(scene, room) {
    const spec = GRA_ROOMS[room.id], have = baked.get(room.id);
    if (have && have.keys.every(k => scene.textures.exists(k))) { baked.delete(room.id); baked.set(room.id, have); return { spec, keys: have.keys, done: true, ms: 0 }; }
    return { spec, band: -1, keys: [], canvases: [], gen: null, cx: null, done: false, ms: 0, uploads: 0 };
  }
  function nextBand(room, job) {
    job.band++; if (job.band >= BANDS) return false;
    const c = document.createElement('canvas'); c.width = W * K; c.height = (BH + 2) * K;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.setTransform(K, 0, 0, K, 0, -(job.band * BH - 1) * K); cx.save(); cx.beginPath(); cx.rect(0, job.band * BH - 1, W, BH + 2); cx.clip();
    job.canvases.push(c); job.cx = cx;
    job.gen = job.spec.paint(kit(cx, 'room|' + room.id), { room, floor: room.floor || GRM.floor, door: GRM.door });
    return true;
  }
  /** Run the bake for at most SLICE ms (one strip upload a frame). True when the picture is ready. */
  function step(scene, room, job) {
    if (job.done) return true;
    const t0 = performance.now();
    try {
      if (job.band < BANDS) {
        if (!job.gen && !nextBand(room, job)) job.band = BANDS;
        // Canvas work is recorded lazily; reading one pixel makes each step
        // pay for its own drawing now, not all at once at upload.
        while (job.gen && performance.now() - t0 < SLICE) { const n = job.gen.next(); job.cx.getImageData(0, 0, 1, 1); if (n.done) { job.cx.restore(); job.gen = null; if (!nextBand(room, job)) { job.band = BANDS; break; } } }
      } else {
        const i = job.keys.length, key = 'gdroom-' + room.id + '-' + (++fxSerial);
        scene.textures.addCanvas(key, job.canvases[i]); job.keys.push(key); job.canvases[i] = null;
        if (job.keys.length === BANDS) { job.done = true; baked.set(room.id, { keys: job.keys }); while (baked.size > KEEP) { const [id, old] = baked.entries().next().value; baked.delete(id); for (const k of old.keys) if (scene.textures.exists(k)) scene.textures.remove(k); } }
      }
    } catch (e) { job.failed = String(e && e.stack || e); job.done = true; job.keys = []; if (window.GardenNativePainted) GardenNativePainted.lastError = job.failed; }
    const spent = performance.now() - t0; job.ms += spent; job.maxSlice = Math.max(job.maxSlice || 0, spent);
    return job.done;
  }

  /* ---------- the few live things ---------- */
  function dotTexture(scene, name, size, stops) {
    const key = 'gdroomfx-' + name; if (scene.textures.exists(key)) return key;
    const c = document.createElement('canvas'); c.width = c.height = size; const cx = c.getContext('2d'), g = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) g.addColorStop(o, col); cx.fillStyle = g; cx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(key, c); return key;
  }
  function streakTexture(scene) {
    const key = 'gdroomfx-streak'; if (scene.textures.exists(key)) return key;
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const cx = c.getContext('2d'), r = rng('streak');
    for (let i = 0; i < 70; i++) { const x = r() * 256, w = 1 + r() * 4, y = r() * 256, h = 40 + r() * 160; const g = cx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${.25 + r() * .5})`); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; for (const dy of [0, -256, 256]) cx.fillRect(x, y + dy, w, h); }
    scene.textures.addCanvas(key, c); return key;
  }
  /** fx: { motes: [{ x0, x1, y0, y1, n, c, a, s }], flicker: [{ x, y, r, c, a }], glints: [{ x0, x1, y0, y1, n, c }], streaks: [{ x, y, w, h, a, speed }], drift: [{ x, y, r, c, a }] } */
  function live(scene, parent, spec) {
    const fx = spec.fx || {}, items = [], r = rng('fx');
    const soft = dotTexture(scene, 'soft', 64, [[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
    const mote = dotTexture(scene, 'mote', 16, [[0, 'rgba(255,255,255,1)'], [.5, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]);
    const tint = c => parseInt(String(c).replace('#', ''), 16);
    for (const m of fx.motes || []) for (let i = 0; i < m.n; i++) {
      const im = scene.add.image(0, 0, mote).setTint(tint(m.c || '#fff4d0')).setScale((m.s || 1) * (.25 + r() * .35)).setDepth(m.depth || 3000).setBlendMode(Phaser.BlendModes.ADD);
      parent.add(im); items.push({ kind: 'mote', im, m, x: m.x0 + r() * (m.x1 - m.x0), y: m.y0 + r() * (m.y1 - m.y0), ph: r() * 6.28, sp: .4 + r() * .8, a: (m.a || .6) * (.5 + r() * .5) });
    }
    for (const f of fx.flicker || []) {
      const im = scene.add.image(f.x, f.y, soft).setTint(tint(f.c || '#ffc070')).setScale(f.r / 32).setDepth(f.depth || 2900).setBlendMode(Phaser.BlendModes.ADD);
      parent.add(im); items.push({ kind: 'flicker', im, f, ph: r() * 6.28 });
    }
    for (const g of fx.glints || []) for (let i = 0; i < g.n; i++) {
      const im = scene.add.image(0, 0, mote).setTint(tint(g.c || '#ffffff')).setScale(.5 + r() * .6, .18).setDepth(g.depth || 70).setBlendMode(Phaser.BlendModes.ADD);
      parent.add(im); items.push({ kind: 'glint', im, g, x: 0, y: 0, ph: r() * 6.28, per: 1.6 + r() * 2.4, last: -1 });
    }
    const streak = (fx.streaks || []).length ? streakTexture(scene) : null;
    for (const s of fx.streaks || []) {
      const ts = scene.add.tileSprite(s.x, s.y, s.w, s.h, streak).setOrigin(0, 0).setAlpha(s.a || .35).setDepth(s.depth || 2).setBlendMode(Phaser.BlendModes.ADD);
      if (s.tint) ts.setTint(tint(s.tint));
      parent.add(ts); items.push({ kind: 'streak', im: ts, s });
    }
    for (const d of fx.drift || []) {
      const im = scene.add.image(d.x, d.y, soft).setTint(tint(d.c || '#ffffff')).setScale(d.r / 32, d.r / 64).setDepth(d.depth || 2950).setAlpha(d.a || .2);
      parent.add(im); items.push({ kind: 'drift', im, d, ph: r() * 6.28 });
    }
    function update(t, motion) {
      for (const it of items) {
        if (it.kind === 'mote') {
          const m = it.m, tt = motion ? t : 0;
          let y = it.y - (m.rise == null ? 6 : m.rise) * tt * it.sp, x = it.x + Math.sin(tt * .5 * it.sp + it.ph) * 14 + (m.wind || 0) * tt;
          const h = m.y1 - m.y0, w = m.x1 - m.x0; y = m.y0 + (((y - m.y0) % h) + h) % h; x = m.x0 + (((x - m.x0) % w) + w) % w;
          const edge = Math.min(1, (y - m.y0) / 30, (m.y1 - y) / 30, (x - m.x0) / 30, (m.x1 - x) / 30);
          it.im.setPosition(x, y).setAlpha(Math.max(0, edge) * it.a * (.6 + .4 * Math.sin(tt * 1.7 + it.ph)));
        } else if (it.kind === 'flicker') {
          const f = it.f, n = motion ? Math.sin(t * 9.1 + it.ph) * .5 + Math.sin(t * 23.7 + it.ph * 2) * .3 + Math.sin(t * 3.3) * .2 : 0;
          it.im.setAlpha((f.a || .35) * (1 + n * (f.amt || .18))).setScale(f.r / 32 * (1 + n * .03));
        } else if (it.kind === 'glint') {
          const g = it.g, u = motion ? ((t + it.ph) % it.per) / it.per : .5, cyc = Math.floor(((motion ? t : 0) + it.ph) / it.per);
          if (cyc !== it.last) { it.last = cyc; const rr = rng(g.x0 + ':' + cyc + ':' + it.ph); it.x = g.x0 + rr() * (g.x1 - g.x0); it.y = g.y0 + rr() * (g.y1 - g.y0); if (g.inside && !g.inside(it.x, it.y)) it.y = -99; }
          it.im.setPosition(it.x, it.y).setAlpha((g.a || .7) * Math.sin(u * Math.PI) ** 2);
        } else if (it.kind === 'streak') {
          if (motion) it.im.tilePositionY = -t * (it.s.speed || 160);
        } else if (it.kind === 'drift') {
          const d = it.d, tt = motion ? t : 0;
          it.im.setPosition(d.x + Math.sin(tt * (d.sp || .12) + it.ph) * (d.dx || 40), d.y + Math.cos(tt * (d.sp || .12) * .7 + it.ph) * (d.dy || 6));
        }
      }
    }
    return { update, destroy() { for (const it of items) it.im.destroy(); items.length = 0; }, count: items.length };
  }

  /** The room's picture as a native-art-shaped handle: a placeholder plate
   * until the slices finish, then the baked texture fading in. */
  function create(s, room) {
    const scene = s.context.scene, spec = GRA_ROOMS[room.id], root = scene.add.container(0, 0).setDepth(0);
    s.root.add(root);
    const plate = scene.add.rectangle(0, 0, W, H, parseInt(String(spec.plate || room.bg || '#101010').replace('#', ''), 16)).setOrigin(0, 0); root.add(plate);
    let job = begin(scene, room), image = null, fx = null, fade = 0, dead = false;
    const status = { id: room.id, bakeMs: 0, frames: 0, cached: job.done };
    const images = [];
    function show() {
      for (let i = 0; i < job.keys.length; i++) { const im = scene.add.image(0, i * BH - 1, job.keys[i]).setOrigin(0, 0).setScale(1 / K).setAlpha(status.cached ? 1 : 0); root.add(im); images.push(im); }
      image = images[0] || plate;
      fx = live(scene, s.root, spec); status.fx = fx.count; status.bakeMs = Math.round(job.ms); status.maxSliceMs = Math.round(job.maxSlice || 0); status.failed = job.failed || null;
      if (status.cached) plate.setVisible(false);
    }
    if (job.done) show();
    // The bake runs on its own short tasks between frames (never one long
    // one), so it finishes in about its own cost even when frames are slow.
    const pump = () => { if (dead || image) return; status.frames++; if (step(scene, room, job)) { show(); return; } setTimeout(pump, 0); };
    if (!job.done) setTimeout(pump, 0);
    const handle = {
      root, node: { children: [] }, roomLayer: null, painted: true, status,
      queryAll: () => [], cache() {},
      update(t, dt) {
        if (dead) return;
        if (!image) return;
        if (images.length && images[0].alpha < 1) { fade += dt; const a = Math.min(1, fade / .35); for (const im of images) im.setAlpha(a); if (a >= 1) plate.setVisible(false); }
        fx.update(t, typeof gardenMotionOn !== 'function' || gardenMotionOn());
      },
      destroy() { dead = true; if (fx) fx.destroy(); root.destroy(); },
    };
    return handle;
  }
  function spec(room) { return room && GRA_ROOMS[room.id] || null; }
  return { wanted, create, spec, kit, rng, mix, shade, rgba, status: () => ({ rooms: Object.keys(GRA_ROOMS), baked: [...baked.keys()] }) };
})();
