/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: the CHOP of open water (docs/dev/SCENE_LESSONS.md K; requirements WA1).
   PURE (Node + browser): only functions at load. Private prefix _wch.

   A wide river or estuary is a kilometre of water seen at a grazing angle: with only the kind's gradient, the sky's mirror and the
   reflections it was one flat plane ("the wide river looks empty"). Water that is not glassy carries a surface of short wavelets: pale
   streaks where a wave face catches the sky and dark troughs between, long across the view and short in depth, their size fixed in
   METRES so they converge toward the horizon like the paving does and fade out where a streak is under a pixel (no shimmer, no moire).

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
      const lit = _wchStep(0.1, 0.2, t) * scale, dark = _wchStep(0.1, 0.2, -t) * scale;
      if (lit < 0.01 && dark < 0.01) continue;
      const q = p * 4, dv = lit * 20 - dark * 17;
      B[q] += dv; B[q + 1] += dv; B[q + 2] += dv * (lit > dark ? 0.95 : 1.05);
      n++;
    }
  }
  return n;
}
