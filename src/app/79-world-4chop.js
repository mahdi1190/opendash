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
// The tidal surface calls a few dozen noises and sines for every wet pixel of a kilometre of river, so it uses tables: a 64 x 64 lattice of
// seeded values per channel (value noise, smoothstep-blended: the same as _wchNoise but a lookup for a hash; it repeats every 64 cells,
// which is 600 m at its smallest scale, far more than a view shows) and a sine table with linear interpolation.
const _WCH_SIN = (() => { const t = new Float64Array(4097); for (let i = 0; i <= 4096; i++) t[i] = Math.sin(i * Math.PI * 2 / 4096); return t; })();
function _wchSin(a) {
  let x = a * (4096 / (Math.PI * 2)); x -= Math.floor(x / 4096) * 4096;
  const i = x | 0, f = x - i;
  return _WCH_SIN[i] + (_WCH_SIN[i + 1] - _WCH_SIN[i]) * f;
}
function _wchTable(seed, ch) { const T = new Float32Array(4096); for (let i = 0; i < 4096; i++) T[i] = _wchLattice(seed + ch * 7919, i & 63, i >> 6); return T; }
function _wchTab(T, u, v) {
  const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
  const i0 = iu & 63, i1 = (iu + 1) & 63, j0 = (iv & 63) << 6, j1 = ((iv + 1) & 63) << 6;
  const a = T[i0 | j0], b = T[i1 | j0], c = T[i0 | j1], d = T[i1 | j1];
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
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
  // ---- the wave trains: seeded per region, unrelated wavelengths and directions about the wind (a different sea for each river)
  const TB = []; for (let c = 0; c < 12; c++) TB.push(_wchTable(seed, c));
  const rr = (() => { let a = (seed ^ 0x9e3779b9) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const windA = (0.35 + 0.3 * rr()) * (rr() < 0.5 ? -1 : 1), wcos = Math.cos(windA), wsin = Math.sin(windA), TAU = 2 * Math.PI;
  // a train: wavelength lam (m), heading th (radians off the view's depth axis), amplitude a; fade: gone where its phase runs faster than a pixel can show
  const train = (lam, th, a, grp) => {
    const k = TAU / lam, kx = k * Math.sin(th), kd = k * Math.cos(th);
    return { kx, kd, a, grp, lam, ph: rr() * TAU, fade: (d, f_, eH) => { const gx = Math.abs(kx) * d / f_, gy = Math.abs(kd) * d * d / (f_ * eH), g = Math.hypot(gx, gy); return g > 2.3 ? 0 : g < 0.9 ? 1 : 1 - _wchStep(0.9, 2.3, g); } };
  };
  const swl = [train(41 + 6 * rr(), windA + (rr() - 0.5) * 0.5, 1, 0), train(23 + 5 * rr(), windA + 0.35 + (rr() - 0.5) * 0.6, 0.8, 1)];
  const lams = [6.4, 4.3, 3.1, 2.4, 1.8, 1.35, 1.0, 0.72, 0.52, 0.38], wc = lams.map((lam, i) => train(lam * (0.92 + 0.16 * rr()), windA + (rr() - 0.5) * (i < 5 ? 0.7 : 1.5), 0.42 * Math.pow(lam / 3, 0.22) * (0.8 + 0.4 * rr()), i % 2));
  const SW = new Array(2), SWF = new Float64Array(2), ACT = new Array(wc.length), ACF = new Float64Array(wc.length);
  // ---- the surface: wave trains, silt, whitecaps, per pixel
  let n = 0;
  const rowD = new Float32Array(h);
  for (let r = 0; r < h; r++) {
    const Y = (y0 + r + 0.5 - oy) / vs, dy = Y - hz;
    if (!(dy > 3.5)) { rowD[r] = 0; continue; }   // (the rows at the horizon, under a pixel a wavelet, are never touched: they would shimmer)
    const d = f * eyeH / dy, rk = Math.min(1, Math.max(0, (d - 1.5) / 5));
    rowD[r] = d;
    const g = cl(dy / Math.max(1, 900 - hz), 0, 1);
    const hor = 0.35 + 0.65 * (1 - g);
    // the trains that show at this depth (a train fades by how fast its phase runs across a pixel: a function of the row only)
    let nAct = 0, nSw = 0;
    for (let i = 0; i < 2; i++) { const fd = swl[i].fade(d, f, eyeH); if (fd >= 0.02) { SW[nSw++] = swl[i]; SWF[nSw - 1] = swl[i].a * fd; } }
    // near the lens the surface is calm and large (soft swell patches, not a busy scatter of wavelets): the short trains grow with distance
    const nk = cl((d - 6) / 34, 0, 1);
    for (let i = 0; i < wc.length; i++) { const fd = wc[i].fade(d, f, eyeH); if (fd >= 0.02) { ACT[nAct++] = wc[i]; ACF[nAct - 1] = wc[i].a * fd * (wc[i].lam < 3.5 ? 0.22 + 0.78 * nk : 0.5 + 0.5 * nk); } }
    const sf = (1 - cl(((Math.PI * 2 / 3.4) * wcos * d / f + (Math.PI * 2 / 80) * wsin * d * d / (f * eyeH) - 0.9) / 1.5, 0, 1)) * rk;
    for (let x = 0; x < w; x++) {
      const p = r * w + x;
      if (!wet[p]) continue;
      const X = (x0 + x + 0.5 - ox) / vs, u = (X - x0s) * d / f;
      const q = p * 4;
      // silt: long patches running with the current (stretched in depth), umber and grey-green, never flat
      const n1 = _wchTab(TB[0], u / 48, d / 150), n2 = _wchTab(TB[1], u / 15, d / 42);
      const sv = (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.45;
      if (sv > 0.02 || sv < -0.02) {
        const tgt = sv > 0 ? silt1 : silt2, k = Math.min(0.3, Math.abs(sv) * 0.5) * day * (0.4 + 0.6 * g);
        B[q] += (tgt[0] - B[q]) * k; B[q + 1] += (tgt[1] - B[q + 1]) * k; B[q + 2] += (tgt[2] - B[q + 2]) * k;
      }
      // a natural sea: the sum of several wave trains of unrelated wavelength and direction (no two cells alike, so no lattice), the crests
      // warped by two scales of drift, the trains in patches of their own (cat's paws, calm lanes), a long swell under them that lifts the
      // chop on its crests, and wind streaks that run along the wind
      const wu = u + 7 * (_wchTab(TB[2], u / 31, d / 37) - 0.5) + 2.4 * (_wchTab(TB[3], u / 9.5, d / 11.5) - 0.5), wv = d + 7 * (_wchTab(TB[4], u / 33 + 4, d / 29 + 9) - 0.5) + 2.4 * (_wchTab(TB[5], u / 10 + 3, d / 8.5 + 7) - 0.5);
      const gust = _wchStep(0.22, 0.7, _wchTab(TB[6], u / 38, d / 52)) * 0.6 + 0.4, pA = 0.4 + 0.6 * _wchStep(0.2, 0.75, _wchTab(TB[7], u / 17, d / 23)), pB = 0.4 + 0.6 * _wchStep(0.2, 0.75, _wchTab(TB[8], u / 12 + 5, d / 19 + 2));
      let sw = 0;
      for (let i = 0; i < nSw; i++) { const W = SW[i]; sw += SWF[i] * _wchSin(W.kx * wu + W.kd * wv + W.ph); }
      let sc = 0;
      for (let i = 0; i < nAct; i++) { const W = ACT[i]; sc += ACF[i] * (W.grp ? pB : pA) * _wchSin(W.kx * wu + W.kd * wv + W.ph); }
      // wind streaks: thin pale lines long in the wind's direction, brighter where a gust lies
      const ac = wu * wcos - wv * wsin, aw = wv * wcos + wu * wsin, stk = _wchTab(TB[9], ac / 3.4, aw / 80) * 0.7 + _wchTab(TB[10], ac / 1.5 + 7, aw / 28) * 0.3;
      const streak = _wchStep(0.55, 0.78, stk) * gust * sf * 0.42;
      let s = (sc * (0.75 + 0.5 * (0.5 + 0.5 * _wchSin(swl[0].kx * wu + swl[0].kd * wv + swl[0].ph))) * gust + sw * 0.17 * rk + streak) * amp;
      s += 0.35 * s * Math.abs(s);
      const a0 = _wchStep(0.06, 0.3, s);
      if (a0 > 0.03) {
        // a crest catches the sky; under the sun's lobe it carries the sun's own colour
        const lobe = sunX == null ? sunK * 0.3 : sunK * Math.exp(-(((X - sunX) / lobeW) ** 2)) * (0.5 + 0.5 * hor), lm = Math.min(1, lobe * 1.4);
        const a = a0, tr = lowC[0] + (sunC[0] - lowC[0]) * lm, tg = lowC[1] + (sunC[1] - lowC[1]) * lm, tb = lowC[2] + (sunC[2] - lowC[2]) * lm;
        const k = a * (0.3 + 0.5 * lobe) * day * hor;
        B[q] += (tr - B[q]) * k; B[q + 1] += (tg - B[q + 1]) * k; B[q + 2] += (tb - B[q + 2]) * k;
        // the highest crests break: small white caps, only on the gusty water
        if (s > 0.36 && gust > 0.5) { const cap = cl((s - 0.36) * 4, 0, 1) * 0.5 * day; B[q] += (246 - B[q]) * cap; B[q + 1] += (248 - B[q + 1]) * cap; B[q + 2] += (246 - B[q + 2]) * cap; }
      } else if (s < -0.05) {
        const k = 0.3 * _wchStep(0.05, 0.38, -s) * (0.55 + 0.45 * day) * (0.5 + 0.5 * nk);
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
