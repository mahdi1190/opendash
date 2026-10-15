/* ============================================================
   WORLD ENGINE (scene format v3): DRY-STONE WALLS (requirements Q2, TR9). PURE classic script, private prefix _wds. Nothing runs at load.
   A wall in the uplands (a limestone dale, a moor) is a dry-stone wall: no mortar, a wall of lumpy stones laid in irregular courses
   that taper a little as they rise, a row of upright cope stones along the top (a toothed silhouette against the field behind), the
   odd long stone through the wall, lichen and grass in the joints. The engine knows this (the place's style), so a scene never says it.
   The extruder (79-world-4extrude.js) calls these when its wall is dry-stone; the colours are base colours graded by the material system.

     worldDrystoneIs(world)           -> true when this world's walls are dry-stone (its place style is an upland kit)
     WORLD_EXTRUDE_DRYSTONE           the line kind the extruder uses for such a wall: 0.6 m thick, 1.3 m high, solid
     worldDrystoneDetails(a)          -> pushes the details of one piece of wall onto a.details (courses, joints, mottle, cope stones)
   ============================================================ */
const WORLD_DRYSTONE_STYLES = Object.freeze(['dale', 'moor', 'moorland', 'heath']);
const WORLD_EXTRUDE_DRYSTONE = Object.freeze({ w: 0.6, h: 1.3, solid: true, mat: 'stone', hex: '#a39d8e', top: '#b8b2a3', detail: 'drystone' });
function worldDrystoneIs(world) {
  const st = world && (world.style || (world.place && world.place.style));
  return typeof st === 'string' && WORLD_DRYSTONE_STYLES.includes(st);
}
function _wdsRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _wdsShade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
}
/**
 * The details of one piece of a dry-stone wall. a: { line, cam, ss (arc lengths of the piece's samples), seenL (the left side faces the eye),
 * w, h, y0 (the line's own lift), K, idx, details (an array to push onto), grow(pts) (extend the prim's screen box) }.
 */
function worldDrystoneDetails(a) {
  const { line, cam, ss, K, details } = a, h = a.h, w = a.w, s0 = ss[0], s1 = ss[ss.length - 1], rnd = _wdsRng(_wexHash((line.id || 'wall') + '|ds|' + a.idx));
  const mid = _wexAlong(line.path, (s0 + s1) / 2), zMid = Math.max(_wexNear(cam), mid.p[1]), k = cam.f / zMid;      // pixels per metre at the piece
  if (k * h < 6) return;
  const side = a.seenL ? 1 : -1, y0 = _wexNum(line.y) ? line.y : 0;
  // the point of the seen face at arc length s, height y (the face leans back a little as it rises: a dry-stone wall tapers)
  const P = (s, y) => {
    const c = _wexAlong(line.path, s), nx = -c.t[1] * side, nz = c.t[0] * side, inset = 0.07 * (y / Math.max(0.3, h)) * 0.5, off = w / 2 - inset;
    const x = c.p[0] + nx * off, z = c.p[1] + nz * off;
    return _wexP(cam, x, Math.max(_wexNear(cam), z), y0 + _wexG(cam, x, z) + y);
  };
  const pts = (list) => list.map(q => [_wexR(q[0], 2), _wexR(q[1], 2)]);
  const stroke = (list, hex, width, alpha) => { const p = pts(list); details.push({ type: 'stroke', pts: p, width: _wexR(width, 2), hex, alpha }); if (a.grow) a.grow(p); };
  const fill = (list, hex, alpha) => { const p = pts(list); details.push({ type: 'fill', pts: p, hex, alpha }); if (a.grow) a.grow(p); };
  const lw = Math.max(0.6, k * 0.022), L = s1 - s0;
  // courses: a row boundary every 0.22 to 0.34 m, laid in broken runs (a course is a line of stones, never a ruled line)
  const rows = [0];
  while (rows[rows.length - 1] < h - 0.2) rows.push(rows[rows.length - 1] + 0.22 + rnd() * 0.12);
  rows[rows.length - 1] = Math.min(rows[rows.length - 1], h);
  // 1. the mottle: a stone tone per run of a course (the wall is never one flat colour)
  if (zMid < 220) for (let r = 0; r < rows.length - 1; r++) {
    for (let s = s0; s < s1; ) {
      const len = 0.5 + rnd() * 1.8, e = Math.min(s1, s + len), t = 0.9 + rnd() * 0.2, lichen = rnd() < 0.06;
      const y1 = rows[r], y2 = rows[r + 1], a1 = P(s, y1), b1 = P(e, y1), b2 = P(e, y2), a2 = P(s, y2);
      fill([a1, b1, b2, a2], lichen ? _wdsShade('#a4a35c', 0.95) : _wdsShade(K.hex, t), lichen ? 0.4 : 0.45);
      s = e;
    }
  }
  // 2. the courses and the joints between the stones of a course
  for (let r = 1; r < rows.length; r++) {
    for (let s = s0; s < s1; ) {
      const len = 0.8 + rnd() * 2.8, gap = 0.04 + rnd() * 0.25, e = Math.min(s1, s + len), a1 = P(s, rows[r] + (rnd() - 0.5) * 0.04), b1 = P(e, rows[r] + (rnd() - 0.5) * 0.04);
      stroke([a1, b1], '#5a5347', lw * (0.8 + rnd() * 0.6), 0.42);
      s = e + gap;
    }
    if (k * 0.26 >= 3.2 && zMid < 90) for (let s = s0 + rnd() * 0.4; s < s1; s += 0.25 + rnd() * 0.45) {
      const a1 = P(s, rows[r - 1]), b1 = P(s + (rnd() - 0.5) * 0.08, rows[r]);
      stroke([a1, b1], '#5a5347', lw * 0.8, 0.3);
    }
  }
  // 3. through-stones: the long stones that tie the wall, standing a little proud (a lighter face and a shadow under)
  if (zMid < 140) for (let s = s0 + rnd() * 2; s < s1; s += 1.6 + rnd() * 2.4) {
    const r = 1 + Math.floor(rnd() * Math.max(1, rows.length - 3)), y1 = rows[r], y2 = rows[r + 1] || y1 + 0.25, e = s + 0.3 + rnd() * 0.3;
    const a1 = P(s, y1), b1 = P(e, y1), b2 = P(e, y2), a2 = P(s, y2);
    fill([a1, b1, b2, a2], K.top, 0.55);
    stroke([P(s, y1), P(e, y1)], '#4f493f', lw * 1.3, 0.5);
  }
  // 4. the cope stones: upright stones set on edge along the top, each a little different: the toothed top of a dry-stone wall
  if (zMid < 170 && k * 0.2 >= 1.2) {
    for (let s = s0; s < s1; ) {
      const len = 0.18 + rnd() * 0.22, e = Math.min(s1, s + len), ht = 0.12 + rnd() * 0.2, a1 = P(s, h - 0.02), b1 = P(e, h - 0.02), b2 = P(e - len * 0.12, h + ht), a2 = P(s + len * 0.12, h + ht + (rnd() - 0.5) * 0.06);
      fill([a1, b1, b2, a2], _wdsShade(K.top, 0.86 + rnd() * 0.3), 1);
      s = e + 0.01 + rnd() * 0.03;
    }
    stroke([P(s0, h - 0.03), P(s1, h - 0.03)], '#4f493f', lw * 1.2, 0.4);
  }
  void L;
}
