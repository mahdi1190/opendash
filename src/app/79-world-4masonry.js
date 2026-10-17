/* ============================================================
   WORLD ENGINE (scene format v3): COURSED AND RUBBLE STONE WALLS (17 Oct, the churchyard wall of the Cotswold green was one flat
   slab). PURE classic script, private prefix _wms. Nothing runs at load.
   A wall line says how it is laid: `laid: 'coursed'` (coursed rubble: even courses 17 to 28 cm, stones 25 to 70 cm long with their
   vertical joints staggered course by course, one tone per stone, a few long stones; mortar lines; the wall's top finished by a row of
   coping stones, `cope: 'saddle'` the default, 'flat', or 'upright' set on edge as on a dry-stone wall), `laid: 'rubble'` (field stone:
   irregular courses, bigger and rounder stones, no coping, lichen and grass at the joints), `laid: 'drystone'` (the upland wall of
   4drystone). A wall with no `laid` keeps the old plain courses. `stone: '#hex'` is the base stone colour as before.
   The extruder (79-world-4extrude.js) calls worldMasonryDetails for these walls, like worldDrystoneDetails.

     WORLD_MASONRY_LAID        the accepted `laid` values
     worldMasonryDetails(a)    a: { line, cam, ss, K, details, h, w, seenL, idx, grow } -> pushes the details of one piece of wall
   ============================================================ */
const WORLD_MASONRY_LAID = Object.freeze(['coursed', 'rubble', 'drystone']);
const WORLD_MASONRY_COPE = Object.freeze(['saddle', 'flat', 'upright']);
function _wmsRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _wmsShade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
}
function worldMasonryDetails(a) {
  const { line, cam, ss, K, details } = a, h = a.h, w = a.w, s0 = ss[0], s1 = ss[ss.length - 1], laid = line.laid === 'rubble' ? 'rubble' : 'coursed';
  const rnd = _wmsRng(_wexHash((line.id || 'wall') + '|ms|' + a.idx));
  const mid = _wexAlong(line.path, (s0 + s1) / 2), zMid = Math.max(_wexNear(cam), mid.p[1]), k = cam.f / zMid;
  if (k * h < 5) return;
  const side = a.seenL ? 1 : -1, y0 = _wexNum(line.y) ? line.y : 0;
  const P = (s, y) => {
    const c = _wexAlong(line.path, s), nx = -c.t[1] * side, nz = c.t[0] * side, off = w / 2;
    const x = c.p[0] + nx * off, z = c.p[1] + nz * off;
    return _wexP(cam, x, Math.max(_wexNear(cam), z), y0 + _wexG(cam, x, z) + y);
  };
  // the point above the wall's top (the coping), standing on the centre line so the cope reads against the sky
  const T = (s, y, e) => {
    const c = _wexAlong(line.path, s), nx = -c.t[1] * side, nz = c.t[0] * side, off = w / 2 + (e || 0);
    const x = c.p[0] + nx * off, z = c.p[1] + nz * off;
    return _wexP(cam, x, Math.max(_wexNear(cam), z), y0 + _wexG(cam, x, z) + y);
  };
  const pts = (list) => list.map(q => [_wexR(q[0], 2), _wexR(q[1], 2)]);
  const stroke = (list, hex, width, alpha) => { const p = pts(list); details.push({ type: 'stroke', pts: p, width: _wexR(width, 2), hex, alpha }); if (a.grow) a.grow(p); };
  const fill = (list, hex, alpha) => { const p = pts(list); details.push({ type: 'fill', pts: p, hex, alpha }); if (a.grow) a.grow(p); };
  const lw = Math.max(0.6, k * 0.02), copeKind = WORLD_MASONRY_COPE.includes(line.cope) ? line.cope : laid === 'rubble' ? 'upright' : 'saddle';
  const rowMin = laid === 'rubble' ? 0.2 : 0.16, rowVar = laid === 'rubble' ? 0.2 : 0.1, lenMin = laid === 'rubble' ? 0.3 : 0.28, lenVar = laid === 'rubble' ? 0.8 : 0.5;
  const rows = [0], topY = copeKind === 'upright' || laid === 'rubble' ? h : h - 0.14;
  while (rows[rows.length - 1] < topY - 0.1) rows.push(rows[rows.length - 1] + rowMin + rnd() * rowVar);
  rows[rows.length - 1] = Math.min(rows[rows.length - 1], topY);
  // 1. a tone per stone: every course is a run of stones, each a little lighter or darker (never one flat colour); a stray lichen patch
  const rowPx = k * rowMin;
  if (zMid < 260) for (let r = 0; r < rows.length - 1; r++) {
    let s = s0 - rnd() * 0.3;
    const y1 = rows[r], y2 = rows[r + 1];
    while (s < s1) {
      const len = lenMin + rnd() * lenVar, sa = Math.max(s0, s), e = Math.min(s1, s + len), t = 0.86 + rnd() * 0.26, lichen = rnd() < 0.05;
      if (e > sa) fill([P(sa, y1), P(e, y1), P(e, y2), P(sa, y2)], lichen ? '#a4a35c' : _wmsShade(K.hex, t), lichen ? 0.34 : 0.5);
      s += len;
    }
  }
  // 2. the mortar lines: a course joint along every row (a coursed wall's are long and level), vertical joints staggered when near enough
  if (rowPx >= 1.6) for (let r = 1; r < rows.length; r++) {
    stroke([P(s0, rows[r]), P(s1, rows[r])], '#615b4f', lw * (laid === 'rubble' ? 1.1 : 0.9), laid === 'rubble' ? 0.38 : 0.42);
    if (rowPx >= 2.6) for (let s = s0 + rnd() * lenMin; s < s1; s += lenMin + rnd() * lenVar) stroke([P(s, rows[r - 1]), P(s + (rnd() - 0.5) * 0.04, rows[r])], '#615b4f', lw * 0.8, 0.34);
  }
  // 3. a few long stones (a quoin-like stone that spans two courses) and, in rubble, big rounded stones
  if (zMid < 150) for (let s = s0 + rnd() * 2; s < s1; s += 2.2 + rnd() * 3) {
    const r = Math.floor(rnd() * Math.max(1, rows.length - 2)), y1 = rows[r], y2 = rows[Math.min(rows.length - 1, r + (laid === 'rubble' ? 2 : 1))], e = s + (laid === 'rubble' ? 0.5 : 0.65) + rnd() * 0.3;
    fill([P(s, y1), P(e, y1), P(e, y2), P(s, y2)], _wmsShade(K.top, 0.95 + rnd() * 0.12), 0.5);
    stroke([P(s, y1), P(e, y1), P(e, y2), P(s, y2), P(s, y1)], '#4f493f', lw * 1.1, 0.4);
  }
  // 4. the coping
  const y = h;
  if (copeKind === 'upright' && zMid < 190 && k * 0.2 >= 1.1) {
    for (let s = s0; s < s1; ) {
      const len = 0.16 + rnd() * 0.2, e = Math.min(s1, s + len), ht = 0.12 + rnd() * 0.18;
      fill([P(s, y - 0.02), P(e, y - 0.02), P(e - len * 0.12, y + ht), P(s + len * 0.12, y + ht + (rnd() - 0.5) * 0.05)], _wmsShade(K.top, 0.86 + rnd() * 0.3), 1);
      s = e + 0.01 + rnd() * 0.03;
    }
    stroke([P(s0, y - 0.03), P(s1, y - 0.03)], '#4f493f', lw * 1.2, 0.4);
  } else if (copeKind !== 'upright') {
    // saddle or flat coping: a band of long pale stones standing a little proud over the wall, the saddle's crown rising a hand
    const bandH = 0.14, crown = copeKind === 'saddle' ? 0.09 : 0.02, over = 0.05;
    const yb = h - bandH;
    for (let s = s0; s < s1; ) {
      const len = 0.5 + rnd() * 0.5, e = Math.min(s1, s + len), tone = _wmsShade(K.top, 0.9 + rnd() * 0.2);
      fill([T(s, yb, over), T(e, yb, over), T(e, h, over * 0.4), T(s, h, over * 0.4)], tone, 1);
      if (copeKind === 'saddle') fill([T(s, h, over * 0.4), T(e, h, over * 0.4), T(e, h + crown, -over), T(s, h + crown, -over)], _wmsShade(tone, 1.06), 1);
      if (k * 0.5 >= 4) stroke([T(s, yb, over), T(s, h + crown, -over * 0.5)], '#5a5347', lw * 0.8, 0.45);
      s = e;
    }
    stroke([T(s0, yb, over), T(s1, yb, over)], '#4f493f', lw * 1.1, 0.5);
  }
}
