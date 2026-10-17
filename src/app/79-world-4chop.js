/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: the CHOP of open water (docs/dev/SCENE_LESSONS.md M; requirements WA1).
   PURE (Node + browser): only functions at load. Private prefix _wch.

   A wide river or estuary is a kilometre of water seen at a grazing angle: with only the kind's gradient, the sky's mirror and the
   reflections it was one flat plane ("the wide river looks empty"). Water that is not glassy carries a surface of short wavelets: pale
   streaks where a wave face catches the sky and dark troughs between, long across the view and short in depth, their size fixed in
   METRES so they converge toward the horizon like the paving does and fade out where a streak is under a pixel (no shimmer, no moire).

   A TIDAL estuary (look.tidal: the Mersey, the Thames, the Humber) is its own picture (worldWaterChop -> _wchTidal): two wave trains
   that meet at an angle, in gusty patches, each fading where its wavelength is under a pixel; crests that catch the SUN (a broad lit
   lobe about the sun's bearing, the sun's own colour) and the pale sky near the horizon; troughs that darken; silt that varies
   (long umber and grey-green patches running with the current, in metres, so they foreshorten); a few whitecaps; and a band of
   foam along every wall edge of the water (a quay wall's foot, the bank), broken, widening toward the lens.

     worldWaterChop(B, wet, w, h, x0, y0, o)   -> number of pixels touched. Lightens and darkens the baked base colour in place.
         B: the RGBA bytes of the region's base bake (w x h device pixels at x0, y0), wet: its mask, o: { R (the water region), look,
         vs, ox, oy (the frame's scale and offset), cam }. look.chop (0..1) is the strength: water with no `chop` in its look (a pond, a canal, a
         puddle, a lake, a river) gets none, the sea (0.7) and an estuary (1) the most. Deterministic from the region id.
   ============================================================ */
const _WCH_LX = 9, _WCH_LZ = 1.15;      // a wavelet's size in metres, across the view and in depth
function _wchHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wchLattice(seed, i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
/** Smooth value noise on a lattice (0..1). */
function _wchNoise(seed, u, v) {
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
  const a = _wchLattice(seed, i, j), b = _wchLattice(seed, i + 1, j), c = _wchLattice(seed, i, j + 1), d = _wchLattice(seed, i + 1, j + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
const _wchStep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function worldWaterChop(B, wet, w, h, x0, y0, o) {
  o = o || {};
  if (o.look && o.look.tidal) { try { return _wchTidal(B, wet, w, h, x0, y0, o); } catch (e) { /* the plain chop below */ } }
  const R = o.R, look = o.look || (R && R.look) || {}, cam = o.cam || (R && R.cam), vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0;
  const amp = Math.max(0, Math.min(1, Number(look.chop) || 0)) * 0.7;      // only open, choppy water (the sea, an estuary) has it
  if (!cam || !(amp >= 0.05) || !B || !wet || !(w > 0) || !(h > 0)) return 0;
  const level = Number.isFinite(R && R.level) ? R.level : Number.isFinite(cam.water) ? cam.water : 0, eyeH = cam.eye - level;
  if (!(eyeH > 0.2) || !(cam.f > 0)) return 0;
  const seed = _wchHash('chop|' + (R && R.id)) | 0, hz = cam.horizon, f = cam.f, x0s = cam.x0 || 800;
  let n = 0;
  for (let r = 0; r < h; r++) {
    const Y = (y0 + r + 0.5 - oy) / vs, dy = Y - hz;
    if (!(dy > 0.8)) continue;
    const d = f * eyeH / dy;                                      // the depth of this row on the water plane (metres)
    const pxz = dy * dy * _WCH_LZ / (f * eyeH);                   // how many scene units one wavelet is deep here
    const fade = Math.min(1, Math.max(0, (pxz - 0.45) / 2.2)) * Math.min(1, Math.max(0, (d - 1.5) / 5));
    if (!(fade > 0.02)) continue;
    const v = d / _WCH_LZ, scale = amp * fade;
    for (let x = 0; x < w; x++) {
      const p = r * w + x;
      if (!wet[p]) continue;
      const X = (x0 + x + 0.5 - ox) / vs, Xm = (X - x0s) * d / f, u = Xm / _WCH_LX;
      const t = 0.62 * _wchNoise(seed, u, v) + 0.38 * _wchNoise(seed + 7, u * 2.3 + 11, v * 2.1 + 5) - 0.5;
      const lit = _wchStep(0.1, 0.2, t) * scale, dark = _wchStep(0.1, 0.2, -t) * scale, foam = look.chop >= 0.9 ? _wchStep(0.19, 0.25, t) * scale : 0;   // an estuary's highest crests break white
      if (lit < 0.01 && dark < 0.01) continue;
      const q = p * 4, dv = lit * 31 - dark * 27 + foam * 44;
      B[q] += dv; B[q + 1] += dv; B[q + 2] += dv * (lit > dark ? 0.95 : 1.05);
      n++;
    }
  }
  return n;
}

/* ---------- a tidal estuary ---------- */
const _wchRgb = (hex) => { const n = parseInt(String(hex || '#ffffff').replace('#', '').slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/**
 * The tidal estuary's surface (see the header). B: RGBA bytes of the base bake, wet: its mask, (w, h): its size, (x0, y0): its device origin;
 * o: { R, look, vs, ox, oy, cam, sky (worldSkyOf: the sun's bearing and colour, the dark) }. Returns the pixels touched.
 */
function _wchTidal(B, wet, w, h, x0, y0, o) {
  const R = o.R, look = o.look, cam = o.cam || (R && R.cam), vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, sky = o.sky && o.sky.__sky ? o.sky : null;
  if (!cam || !B || !wet || !(w > 0) || !(h > 0)) return 0;
  const level = Number.isFinite(R && R.level) ? R.level : Number.isFinite(cam.water) ? cam.water : 0, eyeH = cam.eye - level;
  if (!(eyeH > 0.2) || !(cam.f > 0)) return 0;
  const seed = _wchHash('tidal|' + (R && R.id)) | 0, hz = cam.horizon, f = cam.f, x0s = cam.x0 || 800, amp = Math.max(0.3, Math.min(1, Number(look.chop) || 1));
  const dark = sky ? Math.max(0, Math.min(1, sky.dark || 0)) : 0, day = 1 - dark * 0.85, wrap = (a) => ((a % 360) + 540) % 360 - 180;
  // the sun: its screen column and its lit lobe (broad when it is low), its colour; behind the lens only a faint general sheen
  let sunX = null, sunK = 0, sunC = [255, 244, 214];
  if (sky && sky.sun && sky.sun.alt > -2 && dark < 0.6) {
    const rel = wrap((sky.sun.az || 0) - (cam.heading || 0)), alt = Math.max(0, sky.sun.alt);
    sunC = _wchRgb(sky.sunCol || '#fff4d6');
    sunK = Math.max(0, 1 - (sky.overcast || 0)) * (1 - dark);
    if (Math.abs(rel) < 100) sunX = x0s + f * Math.tan(Math.max(-82, Math.min(82, rel)) * Math.PI / 180);
    else sunK *= 0.25;
    sunK *= 0.55 + 0.45 * Math.max(0, 1 - alt / 70);
  }
  const lowC = sky && sky.sky ? _wchRgb(sky.sky.low) : [225, 232, 232];
  const lobeW = f * 0.3, silt1 = [172, 142, 96], silt2 = [104, 112, 92];
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  // ---- the surface: wave trains, silt, whitecaps, per pixel
  let n = 0;
  const rowD = new Float32Array(h);
  for (let r = 0; r < h; r++) {
    const Y = (y0 + r + 0.5 - oy) / vs, dy = Y - hz;
    if (!(dy > 3.5)) { rowD[r] = 0; continue; }   // (the rows at the horizon, under a pixel a wavelet, are never touched: they would shimmer)
    const d = f * eyeH / dy, rk = Math.min(1, Math.max(0, (d - 1.5) / 5));
    rowD[r] = d;
    const pxz1 = dy * dy * 5.5 / (f * eyeH), pxz2 = dy * dy * 2.4 / (f * eyeH);
    const f1 = cl((pxz1 - 0.8) / 2.4, 0, 1) * rk, f2 = cl((pxz2 - 0.8) / 2.4, 0, 1) * rk, g = cl(dy / Math.max(1, 900 - hz), 0, 1);
    const hor = 0.35 + 0.65 * (1 - g);
    for (let x = 0; x < w; x++) {
      const p = r * w + x;
      if (!wet[p]) continue;
      const X = (x0 + x + 0.5 - ox) / vs, u = (X - x0s) * d / f;
      const q = p * 4;
      // silt: long patches running with the current (stretched in depth), umber and grey-green, never flat
      const n1 = _wchNoise(seed + 3, u / 48, d / 150), n2 = _wchNoise(seed + 5, u / 15, d / 42);
      const sv = (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.45;
      if (sv > 0.02 || sv < -0.02) {
        const tgt = sv > 0 ? silt1 : silt2, k = Math.min(0.3, Math.abs(sv) * 0.5) * day * (0.4 + 0.6 * g);
        B[q] += (tgt[0] - B[q]) * k; B[q + 1] += (tgt[1] - B[q + 1]) * k; B[q + 2] += (tgt[2] - B[q + 2]) * k;
      }
      if (f1 < 0.02 && f2 < 0.02) continue;
      // two wave trains meeting at an angle, warped so crests wander, in gusty patches
      const wu = u + 13 * (_wchNoise(seed + 9, u / 30, d / 30) - 0.5), wv = d + 13 * (_wchNoise(seed + 11, u / 30 + 4, d / 30 + 9) - 0.5);
      const gust = _wchStep(0.3, 0.62, _wchNoise(seed + 13, u / 16, d / 24)) * 0.8 + 0.2;
      const cell = 0.45 + 0.55 * _wchNoise(seed + 17, u / 6.5, d / 8), c1 = Math.sin((wv + 0.62 * wu) * (2 * Math.PI / 5.5)) * cell, c2 = Math.sin((0.8 * wv - 0.6 * wu) * (2 * Math.PI / 2.4) + 1.7);
      const s = (c1 * f1 * 0.62 + c2 * f2 * 0.38) * gust * amp;
      if (s > 0.06) {
        // a crest catches the sky; under the sun's lobe it carries the sun's own colour
        const lobe = sunX == null ? sunK * 0.3 : sunK * Math.exp(-(((X - sunX) / lobeW) ** 2)) * (0.5 + 0.5 * hor), lm = Math.min(1, lobe * 1.4);
        const a = cl((s - 0.06) * 2.2, 0, 1), tr = lowC[0] + (sunC[0] - lowC[0]) * lm, tg = lowC[1] + (sunC[1] - lowC[1]) * lm, tb = lowC[2] + (sunC[2] - lowC[2]) * lm;
        const k = a * (0.22 + 0.55 * lobe) * day * hor;
        B[q] += (tr - B[q]) * k; B[q + 1] += (tg - B[q + 1]) * k; B[q + 2] += (tb - B[q + 2]) * k;
        // the highest crests break: small white caps, only on the gusty water
        if (s > 0.5 && gust > 0.55) { const cap = cl((s - 0.5) * 4, 0, 1) * 0.5 * day; B[q] += (246 - B[q]) * cap; B[q + 1] += (248 - B[q + 1]) * cap; B[q + 2] += (246 - B[q + 2]) * cap; }
      } else if (s < -0.08) {
        const k = Math.min(0.34, (-s - 0.08) * 0.7) * (0.55 + 0.45 * day);
        B[q] *= 1 - k; B[q + 1] *= 1 - k; B[q + 2] *= 1 - k * 0.9;
      }
      n++;
    }
  }
  // ---- foam along the water's edges (a quay's foot, a bank), seen against the dry: a band about 0.4 m wide, broken
  const foam = (p, k, r, x) => {
    const q = p * 4, u0 = (x0 + x - ox) / vs, nz = _wchNoise(seed + 21, u0 * 0.35, r * 0.21);
    const a = k * (0.35 + 0.65 * _wchStep(0.3, 0.6, nz)) * day;
    if (a < 0.02) return;
    B[q] += (240 - B[q]) * a; B[q + 1] += (244 - B[q + 1]) * a; B[q + 2] += (240 - B[q + 2]) * a; n++;
  };
  for (let r = 0; r < h; r++) {
    const d = rowD[r];
    if (!(d > 0)) continue;
    const bandPx = cl(0.45 * f * vs / d, 1.2, 12);
    // from the left (the dry bank on the left) and from the right (a wall on the right): the run of wet pixels since the last dry one
    let last = -1e9, seen = false;
    for (let x = 0; x < w; x++) {
      const p = r * w + x;
      if (!wet[p]) { last = x; seen = true; continue; }
      if (seen && x - last <= bandPx) foam(p, 1 - (x - last - 1) / bandPx, r, x);
    }
    last = 1e9; seen = false;
    for (let x = w - 1; x >= 0; x--) {
      const p = r * w + x;
      if (!wet[p]) { last = x; seen = true; continue; }
      if (seen && last - x <= bandPx) foam(p, 1 - (last - x - 1) / bandPx, r, x);
    }
  }
  // and above a wall that runs across the view (the wet ends below a dry row is the far bank; the near wall is below the wet): down the columns
  for (let x = 0; x < w; x++) {
    let last = -1e9, seen = false;
    for (let r = h - 1; r >= 0; r--) {
      const p = r * w + x;
      if (!wet[p]) { last = r; seen = true; continue; }
      const d = rowD[r];
      if (seen && d > 0 && last - r <= cl(0.2 * f * eyeH * vs / (d * d), 1.2, 6)) foam(p, 0.8, r, x);
    }
  }
  return n;
}
