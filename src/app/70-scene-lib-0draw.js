/* ============================================================
   SCENE LIBRARY: shared drawing helpers for library objects (docs/dev/SCENE_ENGINE.md 2.2, 2.5).
   PURE: functions and consts only, no DOM, nothing run at load. Sorts before every other
   70-scene-lib-* file, so objects may call it inside build() (and at load).

   sceneDraw.f1(v)                         round to 0.1 (short path data)
   sceneDraw.rect(x, y, w, h) / ell(x, y, rx, ry) / circ(x, y, r) / poly(pts)   closed subpaths
   sceneDraw.blob(r, cx, cy, rx, ry, n, ragged)     a lobed, leafy outline (n lobes; ragged 0..1)
   sceneDraw.leaf(x, y, ang, len, w)                a pointed leaf from (x, y) along ang (radians)
   sceneDraw.frond(x, y, ang, len, droop, w, n)     a palm frond: { rib, blades } path strings
   sceneDraw.seasons(o)                             { slot: { spring, summer, autumn, winter } } -> palette seasons
   sceneDraw.define(def)                            sceneObjDefine with tidy(): drops empty shapes, round caps on strokes
   sceneDraw.winGroups(r, cells, groups)            spread window cells [[x, y, w, h], ...] over N glow groups -> N path strings
   ============================================================ */
const sceneDraw = (function () {
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  /** A lobed outline: n bumps round an ellipse, each a quadratic arc pushed out by a seeded amount. */
  function blob(r, cx, cy, rx, ry, n, ragged) {
    n = Math.max(5, n | 0); ragged = ragged == null ? 0.25 : ragged;
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.3, k = 1 - ragged * 0.5 + r() * ragged * 0.5; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const ox = mx - cx, oy = my - cy, l = Math.hypot(ox, oy) || 1, bulge = (0.28 + r() * 0.22) * Math.hypot(q[0] - p[0], q[1] - p[1]);
      d += `Q${f1(mx + ox / l * bulge)} ${f1(my + oy / l * bulge)} ${f1(q[0])} ${f1(q[1])}`;
    }
    return d + 'z';
  }
  function leaf(x, y, ang, len, w) {
    const c = Math.cos(ang), s = Math.sin(ang), tx = x + c * len, ty = y + s * len, nx = -s * w, ny = c * w, mx = x + c * len * 0.45, my = y + s * len * 0.45;
    return `M${f1(x)} ${f1(y)}Q${f1(mx + nx)} ${f1(my + ny)} ${f1(tx)} ${f1(ty)}Q${f1(mx - nx)} ${f1(my - ny)} ${f1(x)} ${f1(y)}z`;
  }
  /** A drooping frond: the rib as a quadratic, the blades as a row of narrow leaves either side. */
  function frond(x, y, ang, len, droop, w, n) {
    const c = Math.cos(ang), s = Math.sin(ang), ex = x + c * len, ey = y + s * len + droop, qx = x + c * len * 0.5, qy = y + s * len * 0.5 - droop * 0.15;
    const at = t => { const u = 1 - t; return [u * u * x + 2 * u * t * qx + t * t * ex, u * u * y + 2 * u * t * qy + t * t * ey]; };
    let blades = '';
    n = n || 9;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), p = at(t), p2 = at(Math.min(1, t + 0.02)), a = Math.atan2(p2[1] - p[1], p2[0] - p[0]), L = w * (1 - t * 0.55);
      blades += leaf(p[0], p[1], a + 0.95, L, L * 0.22) + leaf(p[0], p[1], a - 0.95 + 0.3, L * 0.92, L * 0.21);
    }
    return { rib: `M${f1(x)} ${f1(y)}Q${f1(qx)} ${f1(qy)} ${f1(ex)} ${f1(ey)}`, blades };
  }
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  function seasons(o) { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; }
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = (parts[k] || []).filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  function define(def) { return sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) })); }
  function winGroups(r, cells, groups) {
    const out = new Array(groups).fill('');
    for (const c of cells) out[Math.floor(r() * groups) % groups] += rect(c[0], c[1], c[2], c[3]);
    return out;
  }
  return Object.freeze({ f1, rect, ell, circ, poly, blob, leaf, frond, seasons, define, winGroups, SEASONS: SEAS });
})();
