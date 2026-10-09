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
   sceneDraw.twigs(r, starts, depth, spread)        bare winter twigs forking from [x, y, ang, len] starts -> one path string
   sceneDraw.twigHaze(r, cx, cy, rx, ry, n, depth)  a bare crown's fine twig sprays inside an ellipse (stroke thin, low opacity)
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
  /** Bare winter twigs: from each start [x, y, ang (radians from straight up), len] a stroke that forks in two, depth times (one path). */
  function twigs(r, starts, depth, spread) {
    spread = spread == null ? 0.5 : spread;
    let d = '';
    const grow = (x, y, a, len, k) => {
      const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
      d += `M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}`;
      if (k <= 0 || len < 1.5) return;
      grow(x2, y2, a - spread * (0.45 + r() * 0.7), len * (0.58 + r() * 0.2), k - 1);
      grow(x2, y2, a + spread * (0.45 + r() * 0.7), len * (0.58 + r() * 0.2), k - 1);
    };
    for (const s of starts) grow(s[0], s[1], s[2], s[3], depth);
    return d;
  }
  /**
   * A bare crown's twig haze in the ellipse (cx, cy, rx, ry): n forked sprays rising up and out from the crown's foot, so a
   * winter broadleaf reads as fine twigs, not a leaf mass. One path: stroke it thin (about 1) at a low opacity in a twig colour.
   */
  function twigHaze(r, cx, cy, rx, ry, n, depth) {
    const starts = [], R0 = Math.min(rx, ry), fy = cy + ry * 0.9;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.78, x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
      starts.push([x, y, Math.atan2(x - cx, Math.max(4, fy - y)) * 1.1 + (r() - 0.5) * 0.5, R0 * (0.2 + r() * 0.16)]);
    }
    return twigs(r, starts, depth == null ? 2 : depth, 0.42);
  }
  function winGroups(r, cells, groups) {
    const out = new Array(groups).fill('');
    for (const c of cells) out[Math.floor(r() * groups) % groups] += rect(c[0], c[1], c[2], c[3]);
    return out;
  }
  return Object.freeze({ f1, rect, ell, circ, poly, blob, leaf, frond, seasons, define, winGroups, twigs, twigHaze, SEASONS: SEAS });
})();
