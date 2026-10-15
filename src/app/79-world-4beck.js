/* ============================================================
   WORLD ENGINE (scene format v3): A NARROW WATER IS A BECK (requirements H5, TR9). PURE classic script, private prefix _wbk.
   The engine knows what a stream is, so a scene never has to say: a river no wider than about 4 m runs shallow and clear over a pale
   stony bed, riffled by its own current, and mirrors little (it is moving, and the bed shows through). Water is the lead's package
   (79-world-4water.js); this only post-processes the look of a region it builds.

     worldWaterWidth(s)              -> the mean width in metres of a water surface (a path's width, or a polygon's area over half its perimeter)
     worldWaterNarrow(look, s)       -> the look of a stream when the region is a river under WORLD_BECK_MAX metres wide, else the look unchanged
   ============================================================ */
const WORLD_BECK_MAX = 4.5;
const WORLD_BECK_LOOK = Object.freeze({ base: ['#a9bec0', '#86a5a8', '#6c9094'], tint: '#7fa2a6', clarity: 0.62, mirror: 0.42, ripple: 0.55, flow: 0.9, bed: '#b4ad9c' });
function worldWaterWidth(s) {
  if (!s) return Infinity;
  if (Array.isArray(s.path) && s.path.length >= 2 && Number.isFinite(s.width)) return s.width;
  const P = Array.isArray(s.poly) ? s.poly : null;
  if (!P || P.length < 3) return Infinity;
  let a = 0, per = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; per += Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]); }
  return per > 0 ? Math.abs(a) / per : Infinity;                       // 2 x area / perimeter: the mean width of a long thin shape
}
function worldWaterNarrow(look, s) {
  if (!look || look.kind !== 'river' || !(worldWaterWidth(s) <= WORLD_BECK_MAX)) return look;
  const L = Object.assign({}, look, WORLD_BECK_LOOK, { kind: 'river', stream: true });
  L.ripple = WORLD_BECK_LOOK.ripple * (look.hint === 'calm' ? 0.5 : look.hint === 'breezy' ? 1.6 : 1);
  return L;
}
