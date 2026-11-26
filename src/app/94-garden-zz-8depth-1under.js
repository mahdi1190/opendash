/* ============================================================
   DEPTH: SWIMMING UNDER (26 Nov 2026, the depth lane). The rules are 94-garden-zz-8depth-0rules.js; the faded picture drawn over
   whoever is beneath a thing is 94-garden-zz-8depth-2lids.js; the posts, the boom and the floats are painted by
   94-garden-paint-vale-1depth.js.

   The zones. gardenUnderZones() finds every raised thing you can pass beneath, from the layout's crossings (by crossing kind) and the
   things found standing (by kind: a pier, as far as it is built), each zone in the thing's own drawn place. A cell bucket gives the
   one or two zones near a point, so the swimmer's tests stay cheap every frame.

   The swimmer, per level (wrappers round the height file's own tests, 94-garden-zz-7act-3height.js):
     _ghtWet      the water under a passable deck is water (the painted water has the deck cut out of it)
     _ghtDeck     a passable deck stops a swimmer only at its dry ends, its posts and (the hump bridge) its cutwater and end piers; a deck
                  whose gate is shut stops them at its boom; every other crossing as before (stepping stones and a log are too low)
     _ghtAfloat   a pier stands on its piles: they hold you off, not its whole box
     _ghtSwimFree shut water: a river that runs on into land not yet open carries a line of floats across it, and you turn there
   Shut water is read from the layout, never a name: a river is open where either bank is open land; still water by its own cell.

   Where you are (gardenDepthWhere, gardenDepthWhereOf(A) for a friend's copy): 'g' on the ground, 'w' in the water, 'u' beneath a
   raised thing, 'o' up on a floor. Friends see you where you are with no new message: their screen finds 'under' from your position
   and your swim, by the same zones. A friend who arrives reads it from the garden's snapshot (pw), so you are not drawn on top of
   the bridge you are swimming under.

   Rewards: the first time under each one, a few coins and a line in the journal; the ribbon "Under every bridge" for all of them.
   ============================================================ */
const _gdu = { zones: null, key: '', keyT: 0, bucket: null, byCrossing: null, list: [], gate: new Map(), gateT: 0, rivers: null, riverSig: '', sigT: 0, sig: '', shutCell: null, said: {}, where: null, whereT: 0, underId: '', underT: 0, scratch: { t: 0, s: 0 } };
const GDU_OFF = Object.freeze([[0, 0], [-0.3, 0], [0.3, 0], [0, -0.3], [0, 0.35]]);   // (the height file's own margins round a deck)
const GDU_BOOM = Object.freeze({ up: 18 });   // px out from a shut bridge's upstream side where its logs float (clear of its parapet), 94-garden-paint-vale-1depth.js
function _gduW() { return GARDEN_WORLD; }
/** The pier's piles as the world draws them (94-garden-native-world.js pierPiles): [{x, y} px]. */
function _gduPiles() {
  try { const w = window.GardenNative && GardenNative.world(), P = w && w.pierPiles ? w.pierPiles() : null; if (!P) return []; const out = []; for (const rows of P.values()) for (const p of rows) out.push(p); return out; } catch (e) { return []; }
}
/** Every zone beneath a raised thing, on this layout as it is built now. Cached; looked at again twice a second. */
function gardenUnderZones() {
  const now = performance.now();
  if (_gdu.zones && now - _gdu.keyT < 500) return _gdu.zones;
  _gdu.keyT = now;
  let key = '';
  try {
    const piles = _gduPiles();
    key = [typeof GardenIslandLayout !== 'undefined' ? GardenIslandLayout.fingerprint : '', typeof gardenPierDeckSignature === 'function' ? gardenPierDeckSignature() : '', piles.length + ':' + piles.reduce((h, p) => (h * 31 + Math.round(p.x * 7 + p.y * 13)) | 0, 0), typeof _gks !== 'undefined' ? _gks.key : ''].join('|');
    if (_gdu.zones && key === _gdu.key) return _gdu.zones;
    const W = _gduW(), list = [], byCrossing = new Map();
    const data = typeof gardenIslandData === 'function' ? gardenIslandData() : null;
    const C = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : [];
    for (const c of C) { const z = gardenUnderZoneOfCrossing(c, W, data); if (z) { list.push(z); byCrossing.set(z.id, z); } }
    const T = typeof gardenAffordThings === 'function' ? gardenAffordThings() : [], ghosts = [];
    for (const t of T) {
      if (!t || !t.static || !GARDEN_UNDER.kind[t.kind]) continue;
      // (a part not built yet, a pier's next length: nothing is drawn there, so nothing in the water stops a swimmer either)
      if (t.needs && !(typeof gardenWorkOwned === 'function' && gardenWorkOwned(t.needs))) { const w = Math.max(.5, t.w || 1); ghosts.push([t.x - w / 2, t.x + w / 2, t.y]); continue; }
      const z = gardenUnderZoneOfThing(t, W, piles); if (z) list.push(z);
    }
    _gdu.ghosts = ghosts;
    // (every crossing's box, for the swimmer's deck test: the five-point margin of the height file round its standing deck)
    const boxes = C.map(c => { const S = c.support || [], xs = S.map(p => p.x), ys = S.map(p => p.y); return S.length < 3 ? null : { c, id: c.crossing && c.crossing.id, x0: Math.min(...xs) - .4, y0: Math.min(...ys) - .4, x1: Math.max(...xs) + .4, y1: Math.max(...ys) + .45 }; }).filter(Boolean);
    const bucket = new Map();
    for (const z of list) for (let y = Math.floor(z.bbox[1]); y <= Math.floor(z.bbox[3]); y++) for (let x = Math.floor(z.bbox[0]); x <= Math.floor(z.bbox[2]); x++) { const k = y * 4096 + x; (bucket.get(k) || bucket.set(k, []).get(k)).push(z); }
    _gdu.list = list; _gdu.byCrossing = byCrossing; _gdu.byId = new Map(list.map(z => [z.id, z])); _gdu.bucket = bucket; _gdu.boxes = boxes; _gdu.key = key;
    _gdu.zones = list;
  } catch (e) { console.error('[garden depth] zones', e); _gdu.zones = _gdu.zones || []; _gdu.key = key; }
  return _gdu.zones;
}
/** The zones whose box takes in (x, y) (cells): one bucket, no allocation. */
function _gduNear(x, y) { gardenUnderZones(); return _gdu.bucket ? _gdu.bucket.get(Math.floor(y) * 4096 + Math.floor(x)) || null : null; }
/** Is the zone open beneath now: a swim zone whose gate (if it has one) is open, in the garden on screen. Read twice a second. */
function gardenUnderOpen(z) {
  if (!z || !z.swim) return false;
  if (!z.gate) return true;
  const now = performance.now();
  if (now - _gdu.gateT > 500) { _gdu.gateT = now; _gdu.gate.clear(); }
  let v = _gdu.gate.get(z.gate);
  if (v === undefined) {
    try { const g = typeof gardenGateOf === 'function' ? gardenGateOf(z.gate) : null, m = typeof gardenHere === 'function' ? gardenHere() : null; v = !g || !m || (typeof gardenGateIsOpen === 'function' ? gardenGateIsOpen(g, m.areas) : true); } catch (e) { v = true; }
    _gdu.gate.set(z.gate, v);
  }
  return v;
}
/** Water beneath a zone at (x, y) (cells): over the river under a crossing's deck, or the sea under a pier. */
function _gduWaterIn(z, x, y) {
  if (z.rect) { if (x < z.rect[0] || x > z.rect[2] || y < z.rect[1] || y > z.rect[3]) return false; try { return typeof gardenIslandOceanContains === 'function' ? !!gardenIslandOceanContains(x, y) : false; } catch (e) { return false; } }
  return gardenUnderInPoly(x, y, z.support) && gardenUnderInPoly(x, y, z.ribbon);
}
/** The zone a swimmer at (x, y) is beneath (its open water), or null. */
function gardenUnderAt(x, y) {
  const near = _gduNear(x, y); if (!near) return null;
  for (const z of near) if (gardenUnderOpen(z) && (_gduWaterIn(z, x, y) || gardenUnderInZone(z, x, y, _gduW()))) return z;
  return null;
}
/** The zone a swimming figure at (x, y) is drawn beneath (its chest, where its water ring is, half a cell above its feet), or null. */
function gardenUnderFigureAt(x, y) { return _gduFigureIn(x, y) || _gduFigureIn(x, y - 0.45); }
function _gduFigureIn(x, y) { const near = _gduNear(x, y); if (!near) return null; const W = _gduW(); for (const z of near) if (gardenUnderOpen(z) && gardenUnderInZone(z, x, y, W)) return z; return null; }
/* ---------- shut water (rule U3): a river that runs on into land not yet open ---------- */
function _gduOpenSig() {
  const now = performance.now(); if (_gdu.sig && now - _gdu.sigT < 500) return _gdu.sig; _gdu.sigT = now;
  let s = ''; try { s = (typeof _GD_LAND !== 'undefined' && _GD_LAND ? [..._GD_LAND].filter(k => /^zn-/.test(k)).sort().join(',') : '') + '|' + (typeof gardenVisitOn === 'function' && gardenVisitOn() && typeof _gdv !== 'undefined' ? _gdv.fid : ''); } catch (e) { s = ''; }
  return (_gdu.sig = s);
}
/** Is the land at (x, y) (cells) shut to the feet by its region's gate? */
function _gduShutLand(x, y) { try { return typeof gardenZoneLockAt === 'function' ? !!gardenZoneLockAt(Math.floor(x), Math.floor(y)) : false; } catch (e) { return false; } }
/** The rivers, sampled every quarter cell: where each is open (either bank is open land), and where it runs on into shut land (a line of
 *  floats is drawn across it there, 94-garden-paint-vale-1depth.js). Made again when what is open changes. */
function gardenDepthRivers() {
  const sig = _gduOpenSig(); if (_gdu.rivers && _gdu.riverSig === sig) return _gdu.rivers;
  const out = { samples: [], bucket: new Map(), floats: [] };
  _gdu.building = true;
  try {
    const D = gardenIslandData(), pres = D && D.presentation || {};
    for (const [rid, rv] of Object.entries(pres.rivers || {})) {
      const line = rv && rv.line; if (!Array.isArray(line) || line.length < 2) continue;
      const hw = rv.halfWidth || 1, pts = [], mine = [];
      for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue; const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L; for (let d = 0; d < L; d += 0.25) pts.push({ x: a[0] + tx * d, y: a[1] + ty * d, tx, ty }); }
      for (const p of pts) {
        const nx = -p.ty, ny = p.tx, k = hw + 0.75;
        const open = !_gduShutLand(p.x, p.y) || !_gduShutLand(p.x + nx * k, p.y + ny * k) || !_gduShutLand(p.x - nx * k, p.y - ny * k);
        const s = { x: p.x, y: p.y, nx, ny, hw, open, rid };
        const i = out.samples.push(s) - 1; mine.push(s);
        for (let y = Math.floor(p.y - hw - .7); y <= Math.floor(p.y + hw + .7); y++) for (let x = Math.floor(p.x - hw - .7); x <= Math.floor(p.x + hw + .7); x++) { const key = y * 4096 + x; (out.bucket.get(key) || out.bucket.set(key, []).get(key)).push(i); }
      }
      // a river that runs on from open water into shut land: floats across it, on the open side of the change, where a swimmer could
      // come up to them (the open side holds a swimmer for a cell and a half: never at a waterfall's lip or up a brook nobody swims)
      const free = _gdu.free0;
      for (let i = 1; i < mine.length; i++) {
        if (mine[i - 1].open === mine[i].open) continue;
        const dir = mine[i - 1].open ? -1 : 1, oi = mine[i - 1].open ? i - 1 : i, o = mine[oi], sh = mine[oi - dir];
        let run = 0; if (typeof free === 'function') { for (let k = 0; k < 14 && run < 6; k++) { const q = mine[oi + dir * k]; if (!q || !q.open || !free(q.x, q.y)) break; run++; } } else run = 6;
        if (run < 6) continue;
        const mx = o.x + (sh.x - o.x) * 0.25, my = o.y + (sh.y - o.y) * 0.25;
        out.floats.push({ rid, x: mx, y: my, nx: o.nx, ny: o.ny, hw, key: rid + ':' + Math.round(mx * 4) + ',' + Math.round(my * 4) });
      }
    }
  } catch (e) { console.error('[garden depth] rivers', e); }
  _gdu.building = false;
  _gdu.riverSig = sig; _gdu.rivers = out; _gdu.shutCell = null;
  return out;
}
/** Is the water at (x, y) shut (a river beyond its floats, still water in shut land)? Cheap: a quarter-cell sample of the nearest river,
 *  else its cell, cached. */
function gardenDepthShutWater(x, y) {
  if (_gdu.building) return false;
  const R = gardenDepthRivers(), list = R.bucket.get(Math.floor(y) * 4096 + Math.floor(x));
  if (list) {
    let best = -1, bd = 1e9;
    for (const i of list) { const s = R.samples[i], d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) { const s = R.samples[best]; if (Math.sqrt(bd) <= s.hw + 0.7) return !s.open; }
  }
  const W = _gduW(), cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return false;
  if (!_gdu.shutCell) _gdu.shutCell = new Int8Array(W.cols * W.rows).fill(-1);
  const i = cy * W.cols + cx; let v = _gdu.shutCell[i];
  if (v < 0) { let c = null; try { c = gardenIslandBaseCell(cx, cy); } catch (e) { c = null; } v = c && c.freshwater && _gduShutLand(cx + .5, cy + .5) ? 1 : 0; _gdu.shutCell[i] = v; }
  return v === 1;
}
/** What the vale paints from this file (94-garden-paint-vale-1depth.js): the booms on shut bridges and the floats on shut water. A change
 *  (a gate opened, a region opened) paints the vale again. */
function gardenDepthArtSig() {
  let s = 'dp1:';
  try { for (const z of gardenUnderZones() || []) if (z.gate) s += z.id + (gardenUnderOpen(z) ? '+' : '-'); s += '|' + gardenDepthRivers().floats.map(f => f.key).join(','); } catch (e) { /* as before */ }
  return s;
}
/* ---------- the swimmer: what holds you beneath a raised thing ---------- */
/** At (x, y) (cells) beneath a passable crossing: is the way stopped (its dry ends, a post, a pier between its arches, its shut boom)? */
function _gduDeckIn(z, x, y) {
  const W = _gduW(), px = x * W.cellW, py = W.sky + y * W.cellH;
  if (!gardenUnderOpen(z)) {   // the gate is shut: logs are chained across its arches, and along its upstream side; you stop at them
    const ts = gardenUnderDeckTS(z, px, py, _gdu.scratch), d = z.deck;
    if (ts.t > -6 && ts.t < d.L + 6 && ts.s > -d.hw - GDU_BOOM.up - 8 && ts.s < d.hw + z.face + 9) return true;
    for (const [dx, dy] of GDU_OFF) if (gardenUnderInPoly(x + dx, y + dy, z.support)) return true;
    return false;
  }
  // its dry ends, and the height file's margin round them (you never come up on to the deck from under it)
  for (const [dx, dy] of GDU_OFF) { const qx = x + dx, qy = y + dy; if (gardenUnderInPoly(qx, qy, z.support) && !gardenUnderInPoly(qx, qy, z.ribbon)) return true; }
  if (z.rule.spans) {   // between its arches: the cutwater; past them: the end piers
    const ts = gardenUnderDeckTS(z, px, py, _gdu.scratch), d = z.deck;
    if (ts.s > -d.hw - 8 && ts.s < d.hw + z.face + 6) { let ok = false; for (const o of z.open) if (ts.t > o[0] + 9 && ts.t < o[1] - 9) { ok = true; break; } if (!ok) return true; }
  }
  for (const p of z.posts) { const ex = (px - p.x) / (p.r + 8.6), ey = (py - p.y) / (p.r * 0.6 + 4.2); if (ex * ex + ey * ey < 1) return true; }
  return false;
}
/** The piles of a pier at (x, y) (cells): they hold a swimmer off. */
function _gduPileHit(x, y) {
  const near = _gduNear(x, y); if (!near) return false;
  const W = _gduW(), px = x * W.cellW, py = W.sky + y * W.cellH;
  for (const z of near) { if (!z.rect) continue; for (const p of z.posts) { const ex = (px - p.x) / (p.r + 8.6), ey = (py - p.y) / (p.r * 0.6 + 4.2); if (ex * ex + ey * ey < 1) return true; } }
  return false;
}
if (typeof _ghtWet === 'function') {
  const _gduWet0 = _ghtWet;
  _ghtWet = function (x, y) {   // eslint-disable-line no-func-assign
    if (_gduWet0(x, y)) return true;
    const near = _gduNear(x, y); if (!near) return false;
    for (const z of near) if (gardenUnderOpen(z) && _gduWaterIn(z, x, y)) return true;
    return false;
  };
  _gdu.wet0 = _gduWet0;
}
if (typeof _ghtDeck === 'function') {
  const _gduDeck0 = _ghtDeck;
  _ghtDeck = function (x, y) {   // eslint-disable-line no-func-assign
    gardenUnderZones();
    if (!_gdu.byCrossing || !_gdu.byCrossing.size || !_gdu.boxes) return _gduDeck0(x, y);
    for (const b of _gdu.boxes) {
      if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1 + 1) continue;
      const z = _gdu.byCrossing.get(b.id);
      if (z && z.swim) { if (_gduDeckIn(z, x, y)) return true; continue; }
      const S = b.c.support; for (const [dx, dy] of GDU_OFF) if (gardenUnderInPoly(x + dx, y + dy, S)) return true;   // (as the height file does: too low to pass)
    }
    return false;
  };
  _gdu.deck0 = _gduDeck0;
}
if (typeof _ghtAfloat === 'function') {
  const _gduAfloat0 = _ghtAfloat;
  _ghtAfloat = function (x, y) {   // eslint-disable-line no-func-assign
    if (_gduPileHit(x, y)) return true;
    if (!_gduAfloat0(x, y)) return false;
    if (!Array.isArray(_ght.afloat)) return true;
    // only a thing you pass beneath (a pier: its piles hold you, not its whole box), or one not built yet: nothing stops you there
    const zs = _gdu.list || [], gh = _gdu.ghosts || [];
    for (const b of _ght.afloat) {
      if (!(x > b[0] - .15 && x < b[2] + .15 && y > b[1] - .1 && y < b[3] + .15)) continue;
      let ours = false;
      for (const z of zs) if (z.rect && Math.abs(b[0] - z.rect[0]) < .3 && Math.abs(b[2] - z.rect[2]) < .3 && Math.abs(b[3] - .1 - z.rect[3]) < .3) { ours = true; break; }
      if (!ours) for (const q of gh) if (Math.abs(b[0] - q[0]) < .3 && Math.abs(b[2] - q[1]) < .3 && Math.abs(b[3] - .1 - q[2]) < .3) { ours = true; break; }
      if (!ours) return true;   // (a boat or a buoy here too)
    }
    return false;
  };
}
if (typeof _ghtSwimFree === 'function') {
  const _gduFree0 = _ghtSwimFree;
  _ghtSwimFree = function (x, y) { return _gduFree0(x, y) && !gardenDepthShutWater(x, y); };   // eslint-disable-line no-func-assign
  _gdu.free0 = _gduFree0;
}
/* ---------- what stops you, said (rule 15: wherever you stop, you see why) ---------- */
function _gduSay(key, text) {
  const now = performance.now(); if (now - (_gdu.said[key] || -1e9) < 14000) return; _gdu.said[key] = now;
  try { if (typeof gardenToast === 'function') gardenToast(text); } catch (e) { /* quiet */ }
}
function _gduBlockedWhy(x, y) {
  if (gardenDepthShutWater(x, y)) return ['floats', 'A line of floats across the water: the far side is not open yet.'];
  gardenUnderZones();
  for (const b of _gdu.boxes || []) {
    if (x < b.x0 - .4 || x > b.x1 + .4 || y < b.y0 - .4 || y > b.y1 + 1.2) continue;
    const z = _gdu.byCrossing.get(b.id);
    if (z && z.swim && !gardenUnderOpen(z)) { let where = 'the land beyond'; try { const g = gardenGateOf(z.gate), r = g && typeof gardenIslandRegionForZone === 'function' ? gardenIslandRegionForZone(g.n) : null; if (r && r.name) where = r.name; } catch (e) { /* plain words */ } return ['boom:' + z.id, 'Logs are chained across the arches while ' + where + ' is shut.']; }
    if (!z || !z.swim) { const kind = b.c.kind; return ['low:' + b.id, kind === 'log' ? 'The log lies too low on the water to swim under.' : kind === 'stepping-stones' ? 'The stepping stones sit too close together to swim between.' : 'It is too low to swim under.']; }
  }
  return null;
}
if (typeof _gwMoveBy === 'function') {
  const _gduMove0 = _gwMoveBy;
  _gwMoveBy = function (dx, dy) {   // eslint-disable-line no-func-assign
    const r = _gduMove0(dx, dy);
    if (!r && (dx || dy) && typeof gardenHeightSwimming === 'function' && gardenHeightSwimming()) {
      try { const l = Math.hypot(dx, dy) || 1, why = _gduBlockedWhy(_gw.px + dx / l * 0.35, _gw.py + dy / l * 0.35); if (why) _gduSay(why[0], why[1]); } catch (e) { /* quiet */ }
    }
    return r;
  };
}
/* ---------- where you are ---------- */
/** Where you are now: { k: 'g' | 'w' | 'u' | 'o' | 't', id, n }. One object, made again only when it changes. */
function gardenDepthWhere() {
  let k = 'g', id = '', n = 0;
  try {
    if (typeof gardenDepthTunnelWhere === 'function') { const t = gardenDepthTunnelWhere(); if (t) { k = 't'; id = t.id; n = t.n || 0; } }
    if (k === 'g' && typeof _ght !== 'undefined') {
      if (_ght.lv && !_ght.climb) { k = 'o'; id = _ght.lv.id; n = _ght.lv.li || 0; }
      else if (_ght.swim && _ght.swim.on && !_ght.swim.out) { const z = gardenUnderFigureAt(_gw.px, _gw.py); if (z) { k = 'u'; id = z.id; } else k = 'w'; }
    }
  } catch (e) { k = 'g'; }
  const W = _gdu.where; if (W && W.k === k && W.id === id && W.n === n) return W;
  return (_gdu.where = Object.freeze({ k, id, n }));
}
/** Where a friend's copy is, by the same rules (their floor, their swim and the zones here). */
function gardenDepthWhereOf(A) {
  if (!A) return { k: 'g', id: '', n: 0 };
  if (A.dpT) return { k: 't', id: A.dpT, n: A.dpTn || 0 };
  if (A.hLv) { const lv = typeof _ghtLevelByKey === 'function' ? _ghtLevelByKey(A.hLv) : null; return { k: 'o', id: lv ? lv.id : String(A.hLv).split(':')[0], n: lv ? lv.li || 0 : 0 }; }
  if (A.swimming || (A.ghtSwim && A.ghtSwim.on)) { const z = gardenUnderFigureAt(A.x, A.y); return z ? { k: 'u', id: z.id, n: 0 } : { k: 'w', id: '', n: 0 }; }
  return { k: 'g', id: '', n: 0 };
}
/** The snapshot's depth fields (gardenSnapshot): pw where you are (omitted on the ground, in plain water), dp the tunnels' state. */
function gardenDepthWire() {
  const out = {};
  try { const w = gardenDepthWhere(); if ((w.k === 'o' || w.k === 'u' || w.k === 't') && GARDEN_DEPTH_WIRE.id.test(w.id)) out.pw = [w.k, w.id, Math.max(0, Math.min(15, w.n | 0))]; } catch (e) { /* on the ground */ }
  try { const dp = typeof gardenDepthTunnelWire === 'function' ? gardenDepthTunnelWire() : null; if (dp) out.dp = dp; } catch (e) { /* no tunnels */ }
  return out;
}
/** A friend arriving in your garden is drawn where the snapshot says you are: up on a floor, or in the water beneath a bridge (the
 *  height file's own placing: _ghtRemoteState). Once a snapshot. */
function _gduPlaceFromSnap(A, snap) {
  const pw = snap && snap.pw; if (!A || !Array.isArray(pw) || A._gduPw === pw) return; A._gduPw = pw;
  if (typeof _ghtRemoteState !== 'function' || typeof GA_WIRE === 'undefined') return;
  if (pw[0] === 'o') { const lv = (typeof gardenLevels === 'function' ? gardenLevels() : []).find(l => l.id === pw[1] && (l.li || 0) === pw[2]); const w = lv && lv.ways[0]; if (w) _ghtRemoteState(A, { e: GA_WIRE + 'onlevel', x: w.foot.x, y: w.foot.y }); }
  else if (pw[0] === 'u' && Number.isFinite(A.x) && Number.isFinite(A.y)) _ghtRemoteState(A, { e: GA_WIRE + 'inwater', x: A.x, y: A.y });
}
if (typeof _glvActorAdd === 'function') {
  const _gduAdd0 = _glvActorAdd;
  _glvActorAdd = function (ev) {   // eslint-disable-line no-func-assign
    const A = _gduAdd0(ev);
    try { if (A && ev && ev.w === 0 && typeof _glv !== 'undefined' && _glv.snap) _gduPlaceFromSnap(A, _glv.snap); } catch (e) { /* as before */ }
    return A;
  };
}
/* ---------- rewards: the first time under each one ---------- */
const GDU_PAY = Object.freeze({ c: 5, x: 3 });
function _gduFirst(z) {
  if (!z || (typeof gardenVisitOn === 'function' && gardenVisitOn())) return;   // (in a friend's garden: theirs, not yours to count)
  let g = null; try { g = _gdG(); } catch (e) { g = null; } if (!g || !g.led) return;
  const key = 'dpu.' + z.id; if (g.led[key] || (g.seen && g.seen['dp.u.' + z.id])) return;
  g.led[key] = { d: typeof _gdToday === 'function' ? _gdToday() : '', k: 'dp', c: GDU_PAY.c, x: GDU_PAY.x, n: 1 };
  if (g.seen) g.seen['dp.u.' + z.id] = typeof _gdToday === 'function' ? _gdToday() : '1';
  try { _gdSave(); } catch (e) { /* saved with the next change */ }
  const all = gardenDepthFacts(), more = all.underOf - all.underSeen;
  const shade = z.kind === 'pier' ? 'between the piles, green with weed' : z.rule.spans ? 'through the arch, the stone cold and dripping' : 'in the cool green shade of its planks';
  try { gardenToast('Under ' + z.name + ', ' + shade + '. +' + GDU_PAY.c + ' coins' + (more > 0 ? ' (' + more + ' more to swim under)' : ''), { icon: 'waves' }); } catch (e) { /* quiet */ }
  try { if (typeof gardenSfx === 'function') gardenSfx('splash'); } catch (e) { /* quiet */ }
}
/** Can a swimmer get to it from wide water? Along the crossing's own river, out from under it each way, the water holds a swimmer all
 *  the way to water wide enough to swim in from the bank (a pier stands in the sea). A bridge over a brook too narrow to swim in is
 *  not counted. Worked out once for what is open now. */
function _gduReachable(z) {
  const sig = _gduOpenSig() + '|' + _gdu.key;
  if (!_gdu.reach || _gdu.reachSig !== sig) { _gdu.reach = new Map(); _gdu.reachSig = sig; }
  if (_gdu.reach.has(z.id)) return _gdu.reach.get(z.id);
  let ok = false;
  try {
    if (z.rect) ok = true;
    else {
      // a river wide enough to wade into from its bank (a brook is not), and open water beyond it, a cell and a half at least
      const sp = z.crossing.span, Ln = sp && sp.Ln, D = gardenIslandData(), rv = D && D.presentation && D.presentation.rivers && D.presentation.rivers[z.crossing.over];
      if (!Ln || !rv || !((rv.halfWidth || 1) >= 0.9)) throw new Error('no wide river');
      const W = _gduW(), d = z.deck, ts = { t: 0, s: 0 };
      const at = s => { s = Math.max(0, Math.min(Ln.len, s)); let i = 1; while (i < Ln.cum.length - 1 && Ln.cum[i] < s) i++; const a = Ln.cells[i - 1], b = Ln.cells[i], t = (s - Ln.cum[i - 1]) / ((Ln.cum[i] - Ln.cum[i - 1]) || 1); return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t }; };
      for (const dir of [-1, 1]) {
        let run = 0;
        for (let k = 1; k <= 40 && !ok; k++) {
          const p = at(sp.n0.s + dir * k * 0.25);
          gardenUnderDeckTS(z, p.x * W.cellW, W.sky + p.y * W.cellH, ts); if (ts.s > -d.hw - 20 && ts.s < d.hw + z.face + 20) continue;   // (still beneath it, or at its piers)
          if (!_ghtSwimFree(p.x, p.y)) break;
          if (++run >= 6) ok = true;
        }
        if (ok) break;
      }
    }
  } catch (e) { ok = false; }
  _gdu.reach.set(z.id, ok);
  return ok;
}
/** The facts the ribbons read (gardenFacts): how many of the raised things you have been beneath, of how many a swimmer can reach. */
function gardenDepthFacts() {
  let g = null; try { g = _gdG(); } catch (e) { g = null; }
  const zs = (gardenUnderZones() || []).filter(z => z.swim && _gduReachable(z)), seen = zs.filter(z => g && ((g.led && g.led['dpu.' + z.id]) || (g.seen && g.seen['dp.u.' + z.id]))).length;
  return { underSeen: seen, underOf: zs.length, underAll: zs.length && seen >= zs.length ? 1 : 0 };
}
/** Each frame (with the garden's own frame loop): where you are, and the first time under a thing. */
function _gduFrame() {
  const w = gardenDepthWhere();
  if (w.k === 'u') { if (_gdu.underId !== w.id) { _gdu.underId = w.id; _gdu.underT = performance.now(); _gdu.paid = false; } else if (!_gdu.paid && performance.now() - _gdu.underT > 700) { _gdu.paid = true; const z = _gdu.byId && _gdu.byId.get(w.id); if (z) _gduFirst(z); } }
  else _gdu.underId = '';
}
if (typeof gartActFrame === 'function') {
  const _gduFrame0 = gartActFrame;
  gartActFrame = function () { try { _gduFrame(); } catch (e) { console.error('[garden depth]', e); } return _gduFrame0(); };   // eslint-disable-line no-func-assign
}
/* ---------- the collision view (Shift+C): what holds a swimmer, and where you can swim under ---------- */
/** The depth lane's part of the collision view: the zones (purple), the posts and piles, the booms and the floats (red). */
function gardenDepthCollide() {
  const W = _gduW(), out = { zones: [], posts: [], lines: [] };
  for (const z of gardenUnderZones() || []) {
    const open = gardenUnderOpen(z);
    out.zones.push({ id: z.id, name: z.name, poly: z.vis, open });
    for (const p of z.posts) out.posts.push({ x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH, rx: (p.r + 8.6) / W.cellW, ry: (p.r * .6 + 4.2) / W.cellH, src: (z.kind === 'pier' ? 'a pile under ' : 'a post under ') + z.name + ' (it stops a swimmer)' });
    if (!open && z.deck) for (const o of z.open) for (const [s, dy, what] of [[z.deck.hw, z.face, 'across an arch of '], [-(z.deck.hw + GDU_BOOM.up), 0, 'along the upstream side of ']]) {
      const a = z.crossing.deckPoint(o[0] / z.deck.L, s * z.deck.near), b = z.crossing.deckPoint(o[1] / z.deck.L, s * z.deck.near);
      out.lines.push({ a: { x: a.x / W.cellW, y: (a.y + dy - W.sky) / W.cellH }, b: { x: b.x / W.cellW, y: (b.y + dy - W.sky) / W.cellH }, src: 'logs chained ' + what + z.name + ' (its gate is shut)' });
    }
  }
  for (const f of gardenDepthRivers().floats) { const k = f.hw + .1; out.lines.push({ a: { x: f.x + f.nx * k, y: f.y + f.ny * k }, b: { x: f.x - f.nx * k, y: f.y - f.ny * k }, src: 'a line of floats: the water beyond is not open yet' }); }
  return out;
}
if (typeof gardenCollideData === 'function') {
  const _gduCD0 = gardenCollideData;
  gardenCollideData = function (m) {   // eslint-disable-line no-func-assign
    const D = _gduCD0(m);
    try { if (D && !D.depth) D.depth = gardenDepthCollide(); } catch (e) { /* the view as before */ }
    return D;
  };
}
if (typeof _gcvDraw === 'function') {
  const _gduDraw0 = _gcvDraw;
  _gcvDraw = function (g, D, scale) {   // eslint-disable-line no-func-assign
    _gduDraw0(g, D, scale);
    const P = D && D.depth; if (!P) return;
    const W = _gduW(), X = x => x * W.cellW, Y = y => W.sky + y * W.cellH, lw = Math.max(.6, 1.4 / (scale || 1));
    for (const z of P.zones) { g.lineStyle(lw * 1.6, z.open ? 0x8a4fd8 : 0x6a5a7a, z.open ? .9 : .5); g.beginPath(); g.moveTo(X(z.poly[0].x), Y(z.poly[0].y)); for (let k = 1; k < z.poly.length; k++) g.lineTo(X(z.poly[k].x), Y(z.poly[k].y)); g.closePath(); g.strokePath(); if (z.open) { g.fillStyle(0x8a4fd8, .12); g.fillPoints(z.poly.map(p => ({ x: X(p.x), y: Y(p.y) })), true); } }
    g.fillStyle(GCV_COL.block, .6); g.lineStyle(lw, 0x8f1d10, .95);
    for (const p of P.posts) { g.fillEllipse(X(p.x), Y(p.y), p.rx * 2 * W.cellW, p.ry * 2 * W.cellH); g.strokeEllipse(X(p.x), Y(p.y), p.rx * 2 * W.cellW, p.ry * 2 * W.cellH); }
    g.lineStyle(lw * 3, GCV_COL.block, .8);
    for (const l of P.lines) { g.beginPath(); g.moveTo(X(l.a.x), Y(l.a.y)); g.lineTo(X(l.b.x), Y(l.b.y)); g.strokePath(); }
  };
}
if (typeof gardenCollideAt === 'function') {
  const _gduAt0 = gardenCollideAt;
  gardenCollideAt = function (x, y, m) {   // eslint-disable-line no-func-assign
    const out = _gduAt0(x, y, m);
    try {
      if (!_ghtWet(x, y)) return out;   // (only in the water: what holds a swimmer)
      const D = gardenCollideData(m), P = D && D.depth; if (!P) return out;
      for (const p of P.posts) if (((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1) out.push(p.src);
      for (const l of P.lines) { const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - l.a.x) * dx + (y - l.a.y) * dy) / L2)); if (Math.hypot(l.a.x + dx * t - x, (l.a.y + dy * t - y) * 1.6) < .25) out.push(l.src); }
      const z = gardenUnderAt(x, y); if (z) out.push('you can swim under ' + z.name + ' here');
    } catch (e) { /* as before */ }
    return out;
  };
}
