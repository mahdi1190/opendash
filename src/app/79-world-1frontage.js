/* ============================================================
   WORLD ENGINE (scene format v3.1), package `sense`: STREET FRONTAGES (docs/dev/WORLD_ENGINE.md 1.4, 14.2; requirements Q3, K3, P4;
   SCENE_LESSONS K). Private prefix _wfg. PURE classic script: nothing runs at load; the v2 building generator (sceneBuildingStyle,
   sceneBuildingResolve) is reached through typeof guards.

   A street is not one box. `buildings: [{ id, along: <surface id>, side: 'left' | 'right', style, storeys: n | [a, b], from, to,
   depth: [a, b], shops: 'ground' | 'none', gap }]` is the whole of one side of a lane: the engine walks the surface's centre line
   and cuts the side into HOUSES, each with its own footprint (a polygon, so a bend in the lane bends the row), frontage, depth,
   storey count, seed (doors, colours, jetties, shops, fittings), a front line that steps in and out by a few tens of cm (a house
   standing proud shows its end wall), party walls on both sides, and ground-floor shops. The houses ARE the world's buildings from
   then on: the solver, the navigation (walls people never walk through), the fill and the extruder all see their real footprints.

     worldFrontageExpand(world)             replaces every `along` building of world.buildings by its houses (logged, by 'sense')
     worldFrontageHouses(b, world) -> [building]   the houses of one `along` rule (pure, seeded by the world seed and the id)
   ============================================================ */
const WORLD_FRONTAGE_SHOPS = Object.freeze(['butcher', 'butcher', 'gift', 'antiques', 'bakery', 'tea', 'books', 'deli', 'cheese', 'florist', 'greengrocer']);
const _wfgNum = v => typeof v === 'number' && Number.isFinite(v);
function _wfgHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wfgRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const _wfgR3 = v => Math.round(v * 1000) / 1000;
/** Arc-length walker on a polyline: at(s) -> { p: [x, z], t: [tx, tz] } (clamped). */
function _wfgWalker(path) {
  const seg = []; let L = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (l > 1e-6) { seg.push({ a: path[i - 1], b: path[i], s0: L, l }); L += l; } }
  const at = s => {
    s = Math.max(0, Math.min(L, s));
    let g = seg[seg.length - 1];
    for (const x of seg) if (s <= x.s0 + x.l) { g = x; break; }
    const u = (s - g.s0) / g.l;
    return { p: [g.a[0] + (g.b[0] - g.a[0]) * u, g.a[1] + (g.b[1] - g.a[1]) * u], t: [(g.b[0] - g.a[0]) / g.l, (g.b[1] - g.a[1]) / g.l] };
  };
  return { at, len: L };
}
/** The unit normal of the side of a path at arc length s (left of the direction of travel for 'left'; the camera looks along +z, so left is -x). */
function _wfgNormal(wk, s, sg) { const t = wk.at(s).t; return [-t[1] * sg, t[0] * sg]; }
/** The roof rise of a house (for the world's height: occlusion, framing): the generator's own pitch rule. */
function _wfgRise(roof, pitch, F, D) { const tp = Math.tan((pitch || 40) * Math.PI / 180); return roof === 'gable' ? Math.min(tp * F / 2, F * 0.9) : roof === 'flat' ? 0 : tp * D / 2; }
/**
 * The houses of one `along` rule (see the header). Deterministic: the same world seed and rule id give the same street. A house is
 * { id, foot, front: 0, storeys, h, roof?, style, seed, party: 'both', shop?, solidity, frontage, depth, part, src }.
 */
function worldFrontageHouses(b, world) {
  if (!b || typeof b.along !== 'string' || !world) return [];
  const surf = (world.surfaces || []).find(s => s.id === b.along && Array.isArray(s.path) && s.path.length >= 2 && _wfgNum(s.width));
  if (!surf) return [];
  const sg = b.side === 'right' ? -1 : 1, wk = _wfgWalker(surf.path), style = b.style || 'timber-framed';
  const S = typeof sceneBuildingStyle === 'function' ? sceneBuildingStyle(style) : null;
  const fr = (S && S.frontage) || [4, 7], dep = Array.isArray(b.depth) ? b.depth : _wfgNum(b.depth) ? [b.depth, b.depth] : (S && S.depth) || [6, 10];
  const r = _wfgRng(_wfgHash((world.seed | 0) + '|frontage|' + (b.id || b.along) + '|' + b.side));
  const from = Math.max(0, _wfgNum(b.from) ? b.from : 0), to = Math.min(wk.len, _wfgNum(b.to) ? b.to : wk.len), edge = surf.width / 2 + (_wfgNum(b.gap) ? b.gap : 0);
  const shops = b.shops === false || b.shops === 'none' ? false : true;
  const stor = Array.isArray(b.storeys) ? b.storeys : _wfgNum(b.storeys) ? [b.storeys, b.storeys] : [2, 3];
  const pickStoreys = () => { if (stor[0] === stor[1]) return stor[0]; const n = stor[1] - stor[0] + 1, q = r(); return n === 2 ? (q < 0.4 ? stor[0] : stor[1]) : n === 3 ? (q < 0.22 ? stor[0] : q < 0.78 ? stor[0] + 1 : stor[1]) : stor[0] + Math.floor(q * n); };
  const clampOff = v => Math.max(-0.12, Math.min(0.34, v));
  const out = [];
  let s = from, k = 0, offR = clampOff((r() - 0.3) * 0.4);
  while (s < to - 2.6 && k < 200) {
    // frontage: mostly the style's range, an occasional wide shop or inn
    let F = fr[0] + (fr[1] - fr[0]) * Math.pow(r(), 1.25);
    if (r() < 0.1) F *= 1.5 + r() * 0.5;
    if (s + F > to + 0.6) F = to - s;
    if (F < 2.6) break;
    const offL = k === 0 || r() < 0.38 ? clampOff((r() - 0.3) * 0.5) : offR;      // a deliberate step: this house stands proud or back
    offR = clampOff(offL + (r() - 0.5) * 0.16);                                      // a slight yaw: no front is a ruler's edge
    const D = dep[0] + (dep[1] - dep[0]) * r(), nL = _wfgNormal(wk, s, sg), nR = _wfgNormal(wk, s + F, sg);
    const pL = wk.at(s).p, pR = wk.at(s + F).p;
    const fl = [pL[0] + nL[0] * (edge + offL), pL[1] + nL[1] * (edge + offL)], frp = [pR[0] + nR[0] * (edge + offR), pR[1] + nR[1] * (edge + offR)];
    const bl = [fl[0] + nL[0] * D, fl[1] + nL[1] * D], br = [frp[0] + nR[0] * D, frp[1] + nR[1] * D];
    const foot = [fl, frp, br, bl].map(p => [_wfgR3(p[0]), _wfgR3(p[1])]);
    const storeys = pickStoreys(), seed = (_wfgHash((b.id || 'f') + '|' + k) + (world.seed | 0)) % 100000;
    const shop = shops && r() < 0.6 ? { kind: WORLD_FRONTAGE_SHOPS[Math.floor(r() * WORLD_FRONTAGE_SHOPS.length) % WORLD_FRONTAGE_SHOPS.length] } : null;
    const h0 = storeys * 2.6;
    const rec = { id: (b.id || 'frontage') + '#' + k, foot, front: 0, storeys, h: h0, style, seed, party: 'both', solidity: 'solid', frontage: _wfgR3(F), depth: _wfgR3(D),
      part: { of: b.id || null, k, n: 0 }, src: b.src || 'frontage' };
    if (typeof b.roof === 'string') rec.roof = b.roof;
    if (shop) rec.shop = shop;
    // the house's real height (its seeded storey heights and roof), for what the world measures it by (occlusion, framing)
    if (typeof sceneBuildingResolve === 'function') {
      try { const sp = sceneBuildingResolve(rec); rec.h = _wfgR3(sp.zs[sp.zs.length - 1] + _wfgRise(sp.roof, sp.pitch, F, D)); } catch (e) { /* the estimate stands */ }
    }
    out.push(rec);
    s += F; k++;
  }
  for (const h of out) h.part.n = out.length;
  return out;
}
/** Replace every `along` building of the world by its houses (see the header). */
function worldFrontageExpand(world) {
  if (!world || !Array.isArray(world.buildings) || !world.buildings.some(b => b && typeof b.along === 'string')) return world;
  const next = [];
  for (const b of world.buildings) {
    if (!b || typeof b.along !== 'string') { next.push(b); continue; }
    const hs = worldFrontageHouses(b, world);
    if (!hs.length) { if (Array.isArray(world.log)) world.log.push({ id: b.id || null, obj: null, action: 'drop', rule: 'frontage', reason: 'no houses along ' + b.along + ' (a surface with a centre line and a width, and room for a house)', from: null, to: null, by: 'sense' }); continue; }
    if (Array.isArray(world.log)) world.log.push({ id: b.id || null, obj: null, action: 'fill', rule: 'frontage', reason: hs.length + ' houses along ' + b.along + ' (' + (b.side === 'right' ? 'right' : 'left') + ')', from: null, to: hs.length, by: 'sense' });
    next.push(...hs);
  }
  world.buildings = next;
  return world;
}
