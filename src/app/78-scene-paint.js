/* ============================================================
   SCENE ENGINE: the PAINTED-SCENE pass (docs/dev/PAINTED_SCENES.md). A painted scene is a whole location as one
   1600 x 900 painting (AI image generation: a summer base and aligned edit-variants for spring, autumn, winter and night),
   imported by `node tools/anim-pack.mjs scene paint new` as up to three raster library objects:

     C.paint.back    the painting with the sky cut out (the live sky, sun, moon, stars and clouds show through): an item of
                     the first layer, anchored top-left at 0, 0
     C.paint.water   the painting inside the water mask: an item over the back (rippled and glinting per frame here)
     C.paint.front   the painting inside the foreground-occluder mask: drawn here as the very last mover of the last group,
                     so every actor stands BEHIND the foreground (also placed in the front layer, for the SVG still)

   The raster path does the rest: real season images (or the derivations), the live grade (golden hour, dusk), the night
   image after real dusk. This pass adds: the day-to-night CROSSFADE (the night image over the graded day image while the
   live sky darkens, L.dark .12 to .5), the water ripple (the water rows displaced a pixel or two, more toward the viewer)
   and glints (sun or moon), and the occluder. Weather, particles and actors are the engine's own.
   Enabled by the compile (70-scene-0core.js: data.paint -> C.paint, C.fx.paint = 2).
   ============================================================ */
(function () {
  if (typeof sceneRenderPassDefine !== 'function') return;
  const fadeOf = (L) => { const d = L ? L.dark || 0 : 0; if (d <= 0.12 || d >= 0.5) return 0; const k = (d - 0.12) / 0.38; return k * k * (3 - 2 * k); };
  const nightKey = (id) => { const d = id && typeof sceneObj === 'function' ? sceneObj(id) : null, im = d && d.raster && d.raster.images[0]; return im ? im.night || null : null; };
  const image = (key) => (key && typeof sceneRasterImage === 'function' ? sceneRasterImage(key) : null);
  const rectOf = (id) => { const d = id && typeof sceneObj === 'function' ? sceneObj(id) : null; return d && d.raster ? d.raster.rect : [0, 0, 1600, 900]; };
  const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const reset = (cx) => { cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; };

  sceneRenderPassDefine({
    id: 'paint',
    order: { prebake: 5, 'layer:over': 5, group: 5, frameGroup: 15, movers: 90 },
    applies(C) { return !!(C && C.paint && C.paint.back); },
    // the crossfade joins the light key in steps of a tenth: the bake re-runs as the sky darkens
    key(L) { const f = fadeOf(L); return f ? String(Math.round(f * 10)) : ''; },
    prebake(env) {
      const p = env.C.paint, items = env.C.items;
      const at = (id) => (id ? items.findIndex(it => it.o === id) : -1);
      env.paint = { fade: fadeOf(env.L), back: at(p.back), water: at(p.water), front: p.front || null, waterFx: null, frontSp: null };
      // start decoding the night images now: the crossfade draws them straight (a missing one skips the crossfade once)
      image(nightKey(p.back)); image(nightKey(p.front));
    },
    layer(env, l, gx, when) {
      const P = env.paint;
      if (when !== 'over' || !P || !P.fade || P.back < 0 || env.C.items[P.back].layer !== l) return;
      const im = image(nightKey(env.C.paint.back));
      if (!im) return;
      const r = rectOf(env.C.paint.back), T = env.TG;
      gx.setTransform(T[0], T[1], T[2], T[3], T[4], T[5]); gx.globalAlpha = P.fade;
      gx.drawImage(im, r[0], r[1], r[2], r[3]);
      reset(gx);
    },
    group(env, grp) {
      const P = env.paint;
      if (!P) return;
      // the occluder sprite, once per bake (graded like any raster object; the night image after real dusk)
      if (P.front && env.groups.length === env.plan.length && grp === env.groups[env.groups.length - 1]) {
        const sp = env.sprite({ o: P.front, v: 0, season: env.C.season, part: '*', scale: env.vs, plain: true });
        P.frontSp = sp && sp.c ? env.keep(sp) : null;
      }
      // the water: the finished bitmap's water pixels (back, water, crossfade) cut by the water object's own alpha
      if (P.water < 0 || !grp.c || !grp.layers.includes(env.C.items[P.water].layer)) return;
      const it = env.C.items[P.water], sp = env.itemSprite(P.water);
      if (!sp || !sp.c) return;
      const M = env.placeM(it.x, it.y, it.s, it.flip);
      const x0 = Math.max(grp.x, Math.floor(M[4] + sp.x0 * M[0])), y0 = Math.max(grp.y, Math.floor(M[5] + sp.y0 * M[3]));
      const x1 = Math.min(grp.x + grp.w, Math.ceil(M[4] + (sp.x0 + sp.w) * M[0])), y1 = Math.min(grp.y + grp.h, Math.ceil(M[5] + (sp.y0 + sp.h) * M[3]));
      if (x1 - x0 < 4 || y1 - y0 < 4) return;
      const w = x1 - x0, h = y1 - y0, c = _sccCanvas(w, h), cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(grp.c, grp.x - x0, grp.y - y0);
      cx.globalCompositeOperation = 'destination-in';
      cx.setTransform(M[0], M[1], M[2], M[3], M[4] - x0, M[5] - y0);
      cx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
      reset(cx);
      // glints: seeded points well inside the water, more of them toward the viewer
      const px = cx.getImageData(0, 0, w, h).data, r = rnd(97), pts = [];
      for (let k = 0; k < 2400 && pts.length < 160; k++) {
        const y = Math.floor(Math.sqrt(r()) * h), x = Math.floor(r() * w);
        if (px[(y * w + x) * 4 + 3] > 230) pts.push({ x, y, w: 1.2 + r() * 2.4, ph: r() * 6.283, l: 1 + Math.round((y / h) * 2) });
      }
      env.keep({ c, bytes: w * h * 4 });
      P.waterFx = { grp, c, x: x0, y: y0, w, h, pts };
    },
    frameGroup(env, grp, ctx, t, below) {
      const P = env.paint, F = P && P.waterFx;
      if (!F || F.grp !== grp) return 0;
      const vs = env.vs, L = env.Lnow || env.L, step = Math.max(2, Math.round(2 * vs)), amp = 1.4 * vs;
      let draws = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      for (let y = 0; y < F.h; y += step) {
        if (F.y + y >= below) break;
        const k = 0.3 + 0.7 * (y / F.h), dx = Math.round(amp * k * Math.sin(t * 1.25 + (F.y + y) / vs * 0.13 + Math.sin(t * 0.37 + y * 0.02)) * 2) / 2;
        if (!dx) continue;
        const sh = Math.min(step, F.h - y);
        ctx.drawImage(F.c, 0, y, F.w, sh, F.x + dx, F.y + y, F.w, sh); draws++;
      }
      // glints: the sun's by day (fewer under cloud), the moon's and the lamps' at night
      const dark = L ? L.dark || 0 : 0, day = dark < 0.5, base = day ? 0.8 * (1 - 0.6 * (L ? L.cover || 0 : 0)) : 0.4 * (L && L.moon && L.moon.show ? 0.5 + L.moon.illum : 0.5);
      ctx.fillStyle = day ? '#fffdf2' : '#ffe6b0';
      for (const p of F.pts) {
        if (F.y + p.y >= below) continue;
        const a = Math.sin(t * p.w + p.ph);
        if (a < 0.55) continue;
        ctx.globalAlpha = base * (a - 0.55) / 0.45;
        ctx.fillRect(F.x + p.x, F.y + p.y, p.l * 1.5 * vs, Math.max(1, 0.8 * vs));
      }
      ctx.globalAlpha = 1;
      return draws + 1;
    },
    movers(env, grp, t, push) {
      const P = env.paint;
      if (!P || !P.front || grp !== env.groups[env.groups.length - 1]) return;
      const sp = P.frontSp, nk = nightKey(P.front), r = rectOf(P.front);
      push({ y: 1e9, draw(ctx) {
        const M = env.placeM(0, 0, 1, false);
        ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]); ctx.globalAlpha = 1;
        let n = 0;
        if (sp && sp.c) { ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); n++; }
        const im = P.fade ? image(nk) : null;
        if (im) { ctx.globalAlpha = P.fade; ctx.drawImage(im, r[0], r[1], r[2], r[3]); n++; }
        return n;
      } });
    },
    stats(env) { const P = env.paint; return P ? { water: !!P.waterFx, glints: P.waterFx ? P.waterFx.pts.length : 0, front: !!P.frontSp, fade: P.fade } : null; },
  });
})();
