/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: the SUN ON A FACE (docs/dev/SCENE_LESSONS.md K; requirements L6).
   PURE (Node + browser): only functions at load. Private prefix _wst.

   A building the generator draws has its own soft studio shade (a fixed light from the upper left), and every wall, whatever the sun
   does, came out the same tone: stone read flat at golden hour, in the afternoon and in the morning alike ("flat stone"). Each shape
   of a generated building now carries the outward normal of the face it belongs to (camera frame), and the world lights it by the
   REAL sun: a face turned toward the sun is lighter and warmer, a face turned away is darker and cooler, by how directional the light
   is (none at night or under thick cloud, most at a low clear sun).

     worldSunLight(sky, cam)         -> { v: [x, y, z] (unit, toward the sun, camera frame), k (0..1 directional strength), warm (0..1,
                                         golden hour), key (a short cache key: the sun's coarse bucket, 45 degrees by 15; only the chunks that
                                         hold a generated building carry it, so a change of time inside a band still reuses the rest) } or null
     worldSunTone(hex, n, sun)       -> '#rrggbb': the colour of a face of normal n = [x, y, z] under that sun (hex itself when n or sun is missing)
   ============================================================ */
const _wstD2R = Math.PI / 180;
const _wstClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function worldSunLight(sky, cam) {
  const sun = sky && sky.sun && Number.isFinite(sky.sun.alt) ? sky.sun : null;
  if (!sun || !cam || !(sun.alt > 0.5)) return null;
  const az = Number.isFinite(sun.az) ? sun.az : 180, rel = (az - (Number.isFinite(cam.heading) ? cam.heading : 0)) * _wstD2R, alt = sun.alt * _wstD2R;
  const cover = _wstClamp(Number.isFinite(sky.cover) ? sky.cover : 0.3, 0, 1);
  const k = _wstClamp(sun.alt / 12, 0, 1) * (1 - 0.85 * cover), warm = _wstClamp((18 - sun.alt) / 14, 0, 1) * (1 - 0.7 * cover);
  if (!(k > 0.03)) return null;
  const R = (v) => Math.round(v * 100) / 100;
  return { v: [R(Math.sin(rel) * Math.cos(alt)), R(Math.sin(alt)), R(Math.cos(rel) * Math.cos(alt))], k: R(k), warm: R(warm),
    key: Math.round(((az % 360) + 360) % 360 / 45) + ':' + Math.round(sun.alt / 15) + ':' + Math.round(k * 2) };   // coarse: a bake per few hours, never per minute
}
const _wstRgb = (hex) => { let s = String(hex).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const _wstMemo = new Map();
function worldSunTone(hex, n, sun) {
  if (!sun || !Array.isArray(n) || typeof hex !== 'string' || hex[0] !== '#') return hex;
  const d = n[0] * sun.v[0] + n[1] * sun.v[1] + n[2] * sun.v[2], lit = _wstClamp(d, 0, 1);
  const key = hex + '|' + Math.round(lit * 12) + '|' + Math.round(sun.k * 12) + '|' + Math.round(sun.warm * 8);
  const hit = _wstMemo.get(key);
  if (hit) return hit;
  // brightness: a lit face up to a quarter brighter, a face turned from the sun up to a third darker (at full directional light)
  const m = 1 + sun.k * (0.5 * lit - 0.3 * (1 - lit)), c = _wstRgb(hex);
  // colour: lit faces toward the sun's gold (stronger as it sinks), shaded faces toward the cool sky
  const gold = [255, 206, 140], cool = [112, 128, 168], wk = sun.warm * lit * 0.16, ck = sun.k * (1 - lit) * 0.12;
  const out = c.map((v, i) => { let x = v * m; x = x + (gold[i] - x) * wk; x = x + (cool[i] - x) * ck; return _wstClamp(Math.round(x), 0, 255); });
  const r = '#' + out.map(v => v.toString(16).padStart(2, '0')).join('');
  if (_wstMemo.size > 20000) _wstMemo.clear();
  _wstMemo.set(key, r);
  return r;
}
