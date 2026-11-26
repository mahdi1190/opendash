/* ============================================================
   AFTER DARK, glow trails (FUN-ROADMAP Phase 8). One night in two (every night under the Glow Moon, and twice as long), glow-worms make
   a winding line from the edge of a path among trees, along the walking ground, to a hidden glade: a ring where the moths dance, a pool
   that shows the stars at your feet, or an old tree with lanterns tied in it. A different place each night, the same for everyone in
   the garden.
   Where, by kind and terrain only: the start is a path cell with three or more trees within four cells; the glade an open-grass cell with
   four or more trees within five, clear of anything by a cell and more; both within AD_TRAIL.reach of the layout's arrival point (found
   a few rows a tick, once a layout). The route is the walker's own (_gwRoute), searched once a night on a quiet tick; dots every 0.7 of
   a cell, on the grass beside it, never on paving.
   Rewards: reaching the glade, once a night each: a timber or a stone (_grGive, inside the day's limits) and a tally; the first time at
   each kind of glade, its keepsake; the moth ring brings a rare moth to net. Saves: ad.gl.<night> (reached), ad.gt (glades reached).
   ============================================================ */
const _adt = { D: null, sig: '', B: null, scan: 0, starts: [], glades: [], done: false, night: '', trail: null, ids: new Set(), told: '' };
function _adtCount(B, x, y, r) { let n = 0; const fx = Math.floor(x), fy = Math.floor(y); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy > r * r) continue; n += B.get((fx + dx) + ',' + (fy + dy)) || 0; } return n; }
function _adtTrunkNear(B, x, y) { const fx = Math.floor(x), fy = Math.floor(y); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (B.get((fx + dx) + ',' + (fy + dy))) return true; return false; }
/** The trail's possible starts and glades, a few rows a tick (a tree bucket per cell makes each count a handful of look-ups). */
function _adtScan(rows) {
  const L = adLay(); if (!L) return false;
  const T = adTrees();
  const ws = adWorldSig();
  if (_adt.D !== L.D || _adt.sig !== ws) { _adt.D = L.D; _adt.sig = ws; _adt.scan = 0; _adt.starts = []; _adt.glades = []; _adt.done = false; _adt.night = ''; _adt.B = new Map(); for (const t of T) { const k = Math.floor(t.x) + ',' + Math.floor(t.y); _adt.B.set(k, (_adt.B.get(k) || 0) + 1); } }
  if (_adt.done) return true;
  const W = GARDEN_WORLD, A = L.arrival, R = AD_TRAIL.reach, B = _adt.B;
  for (let k = 0; k < rows && _adt.scan < W.rows; k++, _adt.scan++) {
    const y = _adt.scan; if (Math.abs(y + 0.5 - A.y) > R) continue;
    for (let x = 0; x < W.cols; x++) {
      const cx = x + 0.5, cy = y + 0.5; if (Math.hypot(cx - A.x, cy - A.y) > R) continue;
      const c = gardenIslandBaseCell(cx, cy); if (!c || !c.land || c.solid || c.freshwater || c.ocean) continue;
      if (c.route) { if (_adtCount(B, cx, cy, 4) >= AD_TRAIL.trees) _adt.starts.push({ x: cx, y: cy }); continue; }
      if (c.staticId || c.reservation || c.beach) continue;
      const t = gardenTerrainAt(cx, cy); if (t !== 'open-grass' && t !== 'snow') continue;
      if (_adtCount(B, cx, cy, 5) >= AD_TRAIL.glade && !_adtTrunkNear(B, cx, cy) && !gardenAffordOverlap(cx, cy, 1.2) && !adHidden(cx, cy, 1.3)) _adt.glades.push({ x: cx, y: cy });
    }
  }
  if (_adt.scan >= W.rows) _adt.done = true;
  return _adt.done;
}
/** Dots along the route, on the grass at its side (never on paving), every step of a cell. */
function _adtDots(pts, N, step) {
  const out = [], r = gardenRand('ad-dots|' + N.key + '|' + N.nn); let carry = 0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.01) continue;
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; let u = carry;
    for (; u < L; u += step) {
      const x = a.x + (b.x - a.x) * u / L, y = a.y + (b.y - a.y) * u / L, side = r() < 0.5 ? -1 : 1; let best = null;
      for (const off of [0.3, 0.5, -0.3, -0.5]) { const o = off * side, qx = x + nx * o, qy = y + ny * o * 0.7, t = gardenTerrainAt(qx, qy); if ((t === 'open-grass' || t === 'snow' || t === 'slope') && !(typeof _plStoneAt === 'function' && _plStoneAt(qx, qy)) && (typeof _gwFree !== 'function' || _gwFree(qx, qy))) { best = { x: Math.round(qx * 100) / 100, y: Math.round(qy * 100) / 100, k: r() }; break; } }
      if (best) out.push(best);
    }
    carry = u - L;
  }
  return out;
}
/** Tonight's trail (worked out once a night, on a quiet tick): { s, g, dots, kind (AD_GLADES row), tree (for the lantern tree), nn } or null. */
function _adtPlan(m, N) {
  const key = N.nn + '|' + N.key + '|' + (m.areas || []).length + '|' + _ad.devV;
  if (_adt.night === key) return _adt.trail;
  if (typeof wdWalkingLately === 'function' && wdWalkingLately()) return null;   // (the route search waits until you stop)
  _adt.night = key; _adt.trail = null;
  const row = N.moon.full ? N.moon.row : null, glow = !!(row && row.trail === 2);
  if (!glow && !_ad.dev.trail && gardenHash('ad-trail|' + N.key + '|' + N.nn) % 2 !== 0) return null;
  const S = _adt.starts.filter(p => adOpen(p.x, p.y, m)); if (!S.length) return null;
  const lo = AD_TRAIL.min * (glow ? 2 : 1), hi = AD_TRAIL.max * (glow ? 2 : 1);
  for (let tries = 0; tries < 3 && !_adt.trail; tries++) {
    const s = S[(gardenHash('ad-trs|' + N.key + '|' + N.nn) + tries * 97) % S.length];
    const G = _adt.glades.filter(g => { const d = Math.hypot(g.x - s.x, g.y - s.y); return d >= lo * 0.6 && d <= hi && adOpen(g.x, g.y, m); });
    if (!G.length) continue;
    const g = G[gardenHash('ad-trg|' + N.key + '|' + N.nn + '|' + tries) % G.length];
    let route = null; try { route = _gwRoute({ x: s.x, y: s.y }, { x: g.x, y: g.y }); } catch (e) { route = null; }
    if (!route || !route.length) continue;
    const pts = [{ x: s.x, y: s.y }].concat(route); let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
    if (len < lo || len > hi * 1.6) continue;
    const dots = _adtDots(pts, N, AD_TRAIL.step * (row && row.id === 'honey' ? 0.5 : 1)); if (dots.length < 6) continue;
    let tree = null, td = 4.5; for (const t of adTrees()) { const d = Math.hypot(t.x - g.x, t.y - g.y); if (d < td) { td = d; tree = t; } }
    _adt.trail = { s, g, dots, kind: AD_GLADES[gardenHash('ad-trk|' + N.key + '|' + N.nn) % AD_GLADES.length], tree, nn: N.nn, len };
  }
  return _adt.trail;
}
/* ---------- the drawings ---------- */
function _adtSegSvg(dots, x0, y0) {
  const W = GARDEN_WORLD; let s = '';
  for (const d of dots) { const px = ((d.x - x0) * W.cellW).toFixed(1), py = ((d.y - y0) * W.cellH).toFixed(1); s += `<g transform="translate(${px} ${py})"><path d="M-1 0.6q-0.6 -2.4 0.4 -4M1.2 0.6q0.8 -2 0 -3.2" stroke="#5e7a3a" stroke-width="0.6" fill="none" opacity="0.6"/><g class="ad-blink" style="animation-delay:${(-d.k * 2.6).toFixed(2)}s"><circle cy="-1.4" r="3.2" fill="#c8ff8a" opacity="0.28"/><circle cy="-1.4" r="1.15" fill="#f2ffc4"/></g></g>`; }
  return s;
}
/** The trail's light over the night: each glow-worm a small bright point with a soft halo, in step with its dot's blink. The dots are baked
 *  into a still picture under the night's shade (adCacheStatic): on their own they read as dull grey rings, not little lights. */
function _adtSegLight(dots, x0, y0) {
  const W = GARDEN_WORLD; let s = '';
  for (const d of dots) { const px = ((d.x - x0) * W.cellW).toFixed(1), py = ((d.y - y0) * W.cellH - 1.4).toFixed(1); s += `<g class="ad-blink" style="animation-delay:${(-d.k * 2.6).toFixed(2)}s"><circle cx="${px}" cy="${py}" r="7.5" fill="#d4ff96" opacity="0.3"/><circle cx="${px}" cy="${py}" r="2.4" fill="#f6ffd8" opacity="0.9"/></g>`; }
  return s;
}
function _adtGladeSvg(T, night) {
  const k = T.kind.id, A = GART;
  if (k === 'pool') {
    let s = A.P('#000000', A.ell(0, 1, 22, 6.4), 0.16) + A.P('#5e7a3a', A.ell(0, 0.4, 21, 6.4), 0.7) + `<ellipse cy="0" rx="17" ry="5" fill="${night ? '#16203a' : '#3a5a6a'}"/><ellipse cy="-0.4" rx="15" ry="4" fill="${night ? '#1e2c4e' : '#5a8098'}"/>`;
    for (let i = 0; i < 9; i++) { const x = ((gardenHash('pl' + i) % 260) - 130) / 10, y = ((gardenHash('pq' + i) % 60) - 30) / 10; s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="ad-twinkle" style="animation-delay:${(-i * 0.4).toFixed(1)}s"><circle r="0.7" fill="#ffffff"/></g></g>`; }
    for (const [x, y] of [[-18, -1], [17, 0], [-8, 4.6], [9, 4.4]]) s += A.P('#8e8a82', A.ell(x, y, 3, 1.8)) + A.P('#b4b0a6', A.ell(x - 0.6, y - 0.6, 1.8, 1), 0.8);
    return s + A.S('#6e9a48', 1, 'M-21 2q-1 -4 0 -7M20 2q1 -4 0 -6M-2 6q0 -3 1 -5');
  }
  if (k === 'moths') {
    let s = '<ellipse rx="24" ry="8" fill="none" stroke="#e8f0c8" stroke-width="2.4" opacity="0.22"/>';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += A.P(i % 2 ? '#f4f0e0' : '#e8dcf0', A.circ(Math.cos(a) * 24, Math.sin(a) * 8, 1.2)); }
    for (let i = 0; i < 5; i++) s += `<g transform="translate(0 ${-10 - i * 3})"><g class="ad-orbit" style="animation-delay:${(-i * 1.3).toFixed(1)}s"><path d="M-3 0Q-1.6 -2.4 0 0Q1.6 -2.4 3 0Q1.6 1.4 0 0.4Q-1.6 1.4 -3 0Z" fill="#f4eed8"/></g></g>`;
    return s;
  }
  // the lantern tree: lanterns tied in the tree nearest the glade, at heights from its own drawn foot
  if (!T.tree) return '';
  const dx = (T.tree.x - T.g.x) * GARDEN_WORLD.cellW, dy = (T.tree.y - T.g.y) * GARDEN_WORLD.cellH; let s = '';
  for (const [ox, oy, c] of [[-34, -78, '#f2a65a'], [28, -96, '#f2d06a'], [-14, -118, '#e8806a'], [40, -70, '#f4e4a8'], [8, -84, '#d8a0c8']]) s += `<g transform="translate(${(dx + ox).toFixed(1)} ${(dy + oy).toFixed(1)})"><path d="M0 -12V-6" stroke="#5a4a3a" stroke-width="0.6"/><g class="ad-sway">${night ? `<circle cy="0" r="11" fill="${c}" opacity="0.25"/>` : ''}<ellipse cy="0" rx="4.4" ry="5.4" fill="${c}"/><path d="M-4.2 -1.4Q0 0 4.2 -1.4M-4 1.6Q0 3 4 1.6" stroke="#8a5a3a" stroke-width="0.4" fill="none" opacity="0.5"/><path d="M-2 -5.6H2M-1.6 5.4H1.6" stroke="#3a2a1e" stroke-width="1"/></g></g>`;
  return s;
}
function _adtArrive(T, m) {
  const k = 'gl.' + T.nn; if (adGet(k)) return;
  adSet(k, 1); adSet('gt', (Number(adGet('gt')) || 0) + 1);
  const first = adKeep(T.kind.keep);
  const mat = gardenHash('ad-glm|' + T.nn) % 2 ? 'mat:timber' : 'mat:stone';
  adGive('glade.' + T.nn, { [mat]: 1, x: 2 });
  setTimeout(() => { if (_wd.on) wdAmbient(`${T.kind.name}. ${T.kind.line}${first ? '' : ` There was ${mat === 'mat:timber' ? 'a good piece of timber' : 'a good stone'} by it, for your building.`}`, 7000, 'trail'); }, first ? 2800 : 200);
}
/** The moth ring brings one rare moth to net tonight (94-garden-zz-afterdark-4moths.js asks): a bug row, or null. */
function adTrailBug(m, win) {
  const T = _adt.trail; if (!T || T.kind.id !== 'moths' || !(m.tod === 'night' || m.tod === 'dusk')) return null;
  const g = _gdG(), pool = GARDEN_BUGS.filter(b => b.shape === 'moth' && (b.rarity === 'rare' || b.rarity === 'epic') && !(b.needs && b.needs.event) && b.tod.includes('night'));
  if (!pool.length) return null;
  const b = pool[gardenHash('ad-trm|' + T.nn) % pool.length], y = T.g.y + 0.05; void g;
  return { key: 'n' + win + 'g.0', id: b.id, x: T.g.x, y, hab: 'light', t: 0.5, perch: { x0: T.g.x - 0.5, x1: T.g.x + 0.5, y, l0: 10, l1: 24 } };
}
wdMod({
  id: 'ad-trail', pref: 'night', visit: true,
  begin() { _adt.ids = new Set(); },
  tick(m) {
    if (!adOn()) { if (_adt.ids.size) { for (const id of _adt.ids) { adSprite(id, null); wdGlowOff('ad-' + id); } _adt.ids = new Set(); } return; }
    if (!_adt.done || _adt.sig !== adWorldSig()) { if (!(typeof wdWalkingLately === 'function' && wdWalkingLately())) _adtScan(4); if (!_adt.done) return; }
    const N = adNow(m), want = new Set(), T = N.dark ? _adtPlan(m, N) : null;
    if (T) {
      const W = GARDEN_WORLD;
      for (let i = 0; i < T.dots.length; i += 6) {
        const seg = T.dots.slice(i, i + 6), x0 = seg[0].x, y0 = seg[0].y; let my = y0; for (const d of seg) my = Math.max(my, d.y);
        if (!seg.some(d => adInView(d.x, d.y, 2))) continue;
        const id = 'tr-' + T.nn + '-' + i; want.add(id);
        adSprite(id, { x: x0, y: y0, z: my - 0.35, svg: _adtSegSvg(seg, x0, y0), hit: 0, update: adCacheStatic });
        wdGlow('ad-' + id, (T.lk || (T.lk = []))[i] || (T.lk[i] = _adtSegLight(seg, x0, y0)), x0, y0);   // (each glow-worm's own light, worked out once a night)
      }
      if (adInView(T.g.x, T.g.y, 4)) {
        const id = 'tg-' + T.nn; want.add(id);
        adSprite(id, { x: T.g.x, y: T.g.y, z: T.kind.id === 'lanterns' && T.tree ? T.tree.y + 0.05 : T.g.y - 0.3, svg: _adtGladeSvg(T, N.tod === 'night'), hit: 0 });
        if (T.kind.id === 'lanterns' && T.tree) wdGlow('ad-' + id, adGlowSvg('warm', 46, 100), T.tree.x, T.tree.y); else wdGlow('ad-' + id, adGlowSvg(T.kind.id === 'pool' ? 'silver' : 'green', 30, 6), T.g.x, T.g.y);
      }
      if (typeof _gw !== 'undefined') {
        if (Math.hypot(_gw.px - T.g.x, (_gw.py - T.g.y) * 1.3) < 1.5) _adtArrive(T, m);
        if (_adt.told !== String(T.nn) && Math.hypot(_gw.px - T.s.x, _gw.py - T.s.y) < 7) { _adt.told = String(T.nn); wdAmbient('Little lights in the grass at the edge of the path, leading off among the trees.', 6000, 'trail'); }
      }
    }
    for (const id of _adt.ids) if (!want.has(id)) { adSprite(id, null); wdGlowOff('ad-' + id); }
    _adt.ids = want;
  },
  end() { for (const id of _adt.ids) { adSprite(id, null); wdGlowOff('ad-' + id); } _adt.ids = new Set(); },
});
