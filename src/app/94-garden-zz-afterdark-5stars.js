/* ============================================================
   AFTER DARK, star-fall mornings (FUN-ROADMAP Phase 8). One night in six a star comes down in the vale (and on every meteor shower's
   night, and on the comet's three brightest): if you are out, a bright streak and a soft thump far off, and a line saying past what.
   In the morning a thin line of smoke rises from the spot, seen from wherever you are; walk there to find a shallow scorched crater with
   a warm glowing stone in it. The scorch stays seven days; from the second a dark-sky flower, the starbloom, grows in it, and from the
   third you can take a seed of it to grow at home.
   Where: open grass or a slope (gardenTerrainTakes), open land, two cells clear of any path or thing, within AD_FALL.reach of the
   layout's arrival point, so it can be walked to: chosen by the garden's own key and the night, the same crater for every visitor.
   Saves: ad.sf.<night> (your stone from it), ad.sb.<night> (your seed), ad.sfn (stones found, all told). Rewards: the keepsake the
   first time, a star stone each morning (the star lantern's ingredient), the recipe with the first, a starbloom seed.
   ============================================================ */
const _adf = { cands: [], candD: null, scanY: 0, done: false, streaked: '', ids: new Set(), told: new Set() };
/** Did a star fall in the night that began on this ISO day? */
function adStarFell(iso, N) {
  if (_ad.dev.fall && iso === N.night) return true;
  if (gardenHash('ad-sf|' + N.key + '|' + gtgDayNum(iso)) % AD_FALL.odds === 0) return true;
  if (typeof _adsShower === 'function' && _adsShower(iso)) return true;
  return typeof _adsComet === 'function' && _adsComet(iso, N.south) >= 0.75;
}
/** When in that night it fell (host hours, 22 to 27: three in the morning is 27). */
function _adfHour(iso, N) { return 22 + gardenHash('ad-sfh|' + N.key + '|' + iso) % 6 + (gardenHash('ad-sfm|' + iso) % 60) / 60; }
/** The places a star may come down, worked out a few rows a tick round the arrival point (every other cell), once a layout. */
function _adfScan(rows) {
  const L = adLay(); if (!L) return null;
  if (_adf.candD !== L.D) { _adf.candD = L.D; _adf.cands = []; _adf.scanY = -AD_FALL.reach; _adf.done = false; }
  if (_adf.done) return _adf.cands;
  const A = L.arrival, R = AD_FALL.reach, D = L.D;
  for (let k = 0; k < rows && _adf.scanY <= R; k++, _adf.scanY += 2) {
    const dy = _adf.scanY;
    for (let dx = -R; dx <= R; dx += 2) {
      if (dx * dx + dy * dy > R * R) continue;
      const x = Math.floor(A.x + dx) + 0.5, y = Math.floor(A.y + dy) + 0.5, t = gardenTerrainAt(x, y);
      if (t !== 'open-grass' && t !== 'snow' && t !== 'slope') continue;
      if (!gardenTerrainTakes('ad', x, y) || (typeof gardenPlotNear === 'function' && gardenPlotNear(D, x, y, 1.5))) continue;
      let ok = true;
      for (const [ox, oy] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2]]) { const c = gardenIslandBaseCell(x + ox, y + oy); if (!c || !c.land || c.route || c.freshwater || c.ocean || c.solid || c.staticId) { ok = false; break; } }
      if (ok && !gardenAffordOverlap(x, y, 1.3) && !adHidden(x, y, 2.2)) _adf.cands.push({ x, y });   // (and never under a crown or a roof: it must be seen)
    }
  }
  if (_adf.scanY > R) _adf.done = true;
  return _adf.done ? _adf.cands : null;
}
/** Where the star of that night came down: { x, y } or null (the scan not done yet, or nowhere fit). */
function adStarSpot(iso, N, m) {
  const C = _adf.done ? _adf.cands : null; if (!C || !C.length) return null;
  const ck = iso + '|' + N.key + '|' + (m.areas || []).length + '|' + C.length; if (!_adf.spots) _adf.spots = new Map(); if (_adf.spots.has(ck)) return _adf.spots.get(ck);   // (worked out once a night, not every tick)
  const p = _adfSpotPick(iso, N, m, C); if (p || (typeof _gw !== 'undefined' && _gw.grid)) { if (_adf.spots.size > 40) _adf.spots.clear(); _adf.spots.set(ck, p); }
  return p;
}
function _adfSpotPick(iso, N, m, C) {
  // nothing overlaps: every place belongs to one of seven groups (by its own seed), and a night uses only the group of its day number,
  // so any seven nights running use seven different places of the two-cell grid (a crater is under a cell and a half across). Nothing
  // here depends on any other night, so it is the same whichever day it is asked on, on every screen. (A group with no place: no star.)
  const grp = gtgDayNum(iso) % 7, open = C.filter(p => (gardenHash('ad-sfg|' + N.key + '|' + p.x + ',' + p.y) % 7) === grp && adOpen(p.x, p.y, m)); if (!open.length) return null;
  const h = gardenHash('ad-sfp|' + N.key + '|' + gtgDayNum(iso));
  for (let i = 0; i < Math.min(8, open.length); i++) {
    const p = open[(h + i * 7919) % open.length];
    let reach = true; try { if (typeof gardenReachableFromArrival === 'function' && typeof _gw !== 'undefined' && _gw.grid) reach = gardenReachableFromArrival(Math.floor(p.x), Math.floor(p.y)); } catch (e) { reach = true; }
    if (reach) return p;
  }
  return null;
}
/** The stars down in the last seven nights, as they are now: [{ iso, nn, x, y, age (nights since), fresh (its own morning), fallen }]. */
function adStarsNow(N, m) {
  const out = []; if (!_adf.done) return out;
  const hN = N.hour < 12 ? N.hour + 24 : N.hour;
  for (let d = 0; d < AD_FALL.days; d++) {
    const iso = _gdAddDays(N.night, -d); if (!adStarFell(iso, N)) continue;
    const p = adStarSpot(iso, N, m); if (!p) continue;
    const fallen = d > 0 || hN >= _adfHour(iso, N) || (_ad.dev.fall && d === 0);
    if (!fallen) continue;
    out.push({ iso, nn: gtgDayNum(iso), x: p.x, y: p.y, age: d, fresh: d === 0, hour: _adfHour(iso, N) });
  }
  return out;
}
/* ---------- the drawings ---------- */
function _adfCraterSvg(seed) {
  const r = gardenRand('crater|' + seed); let s = '';
  s += '<ellipse rx="34" ry="11" fill="#2e2418" opacity="0.32"/><ellipse rx="27" ry="8.4" fill="#4a3624" opacity="0.62"/><ellipse cy="0.6" rx="20" ry="5.8" fill="#6e5038"/><ellipse cy="1" rx="12" ry="3.4" fill="#3a2a1c"/><ellipse cx="-4" cy="-0.6" rx="7" ry="1.6" fill="#8a6a4a" opacity="0.6"/>';
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + r(), d = 22 + r() * 6, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.32; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2 + r() * 2.4).toFixed(1)}" ry="${(1.2 + r()).toFixed(1)}" fill="${r() < 0.5 ? '#5a4030' : '#7a5a3e'}"/>`; }
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + r() * 0.4, d = 29 + r() * 6, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.34, h = 3 + r() * 4; s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${((r() - 0.5) * 2).toFixed(1)} ${(-h * 0.6).toFixed(1)} ${((r() - 0.5) * 3).toFixed(1)} ${(-h).toFixed(1)}" stroke="${r() < 0.6 ? '#3a2c1e' : '#6a5a2a'}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.85"/>`; }
  return s;
}
function _adfStoneSvg(hot) {
  return `${GART.P('#000000', GART.ell(0, 0.4, 6, 1.6), 0.24)}<path d="M-5 -1L-4 -5L0 -7L4.4 -5L5.4 -1.4L1.6 0.4Z" fill="${hot ? '#e8dcff' : '#a898c8'}"/><path d="M-4 -5L0 -7L1 -3.4L-2.6 -2.4Z" fill="#ffffff" opacity="0.75"/><path d="M1 -3.4L4.4 -5L5.4 -1.4L1.6 0.4Z" fill="#8a78b8" opacity="0.55"/>` +
    (hot ? '<g class="ad-shimmer"><path d="M-3 -10q1.4 -2 0 -4q-1.4 -2 0 -4M1.4 -11q1.4 -2 0 -4q-1.4 -2 0 -4M5 -9q1 -1.6 0 -3.2" stroke="#ffffff" stroke-width="0.6" fill="none" opacity="0.5"/></g>' + adGlint(-12, '#f0e8ff') : '');
}
function _adfSmokeSvg() { let s = ''; for (let i = 0; i < 9; i++) s += `<g transform="translate(${((i % 3) - 1) * 1.6} ${-10 - i * 30})"><g class="ad-smoke" style="animation-delay:${(-i * 0.85).toFixed(2)}s"><ellipse rx="${(4 + i * 0.9).toFixed(1)}" ry="${(7 + i * 1.2).toFixed(1)}" fill="#cfd2d8" opacity="${(0.26 - i * 0.018).toFixed(3)}"/></g></g>`; return s; }
function _adfBloomSvg(age, night) {
  const k = Math.min(1, (age - 1) / 3), A = GART;
  let s = A.P('#000000', A.ell(0, 0.4, 5, 1.3), 0.18) + A.S('#4a6a5a', 1.2, `M0 0Q-1 ${-6 * k} 0.4 ${-(6 + 10 * k)}`) + A.P('#5e8a6a', `M0 ${-3 - 3 * k}q-5 -2 -7 1q4 1 7 -1z`) + A.P('#5e8a6a', `M0.4 ${-5 - 4 * k}q5 -2 6.6 1q-4 1 -6.6 -1z`);
  if (age >= 3) { const y = -(16 + 2 * k); s += (night ? `<circle cy="${y}" r="9" fill="#e8dcff" opacity="0.32"/>` : '') + A.P('#d8c8ff', A.star(0.4, y, 5, 5.4, 2)) + A.P('#ffffff', A.star(0.4, y, 5, 2.6, 1), 0.85) + A.P('#fff4c8', A.circ(0.4, y, 1.1)); }
  else s += A.P('#8a7ab8', A.ell(0.4, -(16 * k + 4), 1.6, 2.4));
  return s;
}
/* ---------- words ---------- */
function _adfDir(dx, dy) { const a = Math.atan2(-dy, dx) * 180 / Math.PI, i = Math.round(((a + 360) % 360) / 45) % 8; return ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'][i]; }
function _adfPast(p) {
  let best = null, bd = 14;
  try { for (const t of gardenAffordThings()) { const K = GARDEN_KINDS[t.kind]; if (!K || !K.name || t.kind === 'scenery' || t.kind === 'building' || t.kind === 'person') continue; const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = K.name; } } } catch (e) { best = null; }
  return best ? 'past ' + best : 'out over the grass';
}
/* ---------- at night: the streak and the thump ---------- */
function _adfStreak(p) {
  try {
    const W = _gl.W; if (!W || gardenFun() === 'off') return;
    const v = W.view(), sx = (v.x0 + v.x1) / 2, ang = Math.atan2((p.y - v.y0) * 0.6, p.x - sx), x0 = sx - Math.cos(ang) * 4, y0 = v.y0 + 0.6, s = _glStage(x0, y0), L = 230;
    const g = _glSvgEl('gl-fx gl-streak'); g.setAttribute('transform', `translate(${_glF(s.x)} ${_glF(s.y)}) rotate(${(Math.max(-60, Math.min(80, ang * 180 / Math.PI))).toFixed(1)})`);
    g.innerHTML = `<path class="gl-streak-in" fill="none" stroke="#fff2c8" stroke-width="2.6" stroke-linecap="round" d="M0 0L${L} 0"/><circle cx="${L}" r="3" fill="#ffffff" opacity="0.9"/>`;
    _glFxAdd(g, 1400);
    setTimeout(() => wdSound([[82, 0.5, 'sine', 0.05], [61, 0.7, 'sine', 0.04, 0.05]]), 1300);
  } catch (e) { /* no sky layer */ }
}
/* ---------- in the world ---------- */
function _adfDraw(m, N) {
  const want = new Set(), stars = adStarsNow(N, m), morning = N.tod === 'dawn' || (N.tod === 'day' && N.hour < 12);
  for (const st of stars) {
    const nn = st.nn, base = 'sf-' + nn;
    if (!adInView(st.x, st.y, 4)) continue;
    want.add(base);
    adSprite(base, { x: st.x, y: st.y, z: st.y - 0.6, svg: _adfCraterSvg(N.key + nn), hit: 0, update: adCacheStatic });
    if (st.fresh) {
      const mine = !!adGet('sf.' + nn);
      if (!mine) { want.add(base + 'k'); adPick(base + 'k', { x: st.x + 0.05, y: st.y + 0.05, svg: _adfStoneSvg(true), words: 'Pick up the star stone', run: () => _adfTake(st) }); if (N.dark || N.tod === 'dawn') wdGlow('ad-' + base + 'k', adGlowSvg('silver', 16, 4), st.x + 0.05, st.y + 0.05); else wdGlowOff('ad-' + base + 'k'); }   // (a glow shines over the night: by day it would be a pale disc)
      if (morning || N.tod === 'night') { want.add(base + 's'); adSprite(base + 's', { x: st.x, y: st.y - 0.1, svg: _adfSmokeSvg(), hit: 0, still: false }); }
    } else if (st.age >= AD_FALL.bloom) {
      want.add(base + 'b');
      const seed = st.age >= AD_FALL.seed && !adGet('sb.' + nn), svg = _adfBloomSvg(st.age, N.dark);
      if (seed) adPick(base + 'b', { x: st.x + 0.1, y: st.y + 0.08, svg, words: 'Take a starbloom seed', run: () => _adfSeed(st) });
      else adSprite(base + 'b', { x: st.x + 0.1, y: st.y + 0.08, svg, hit: 0 });
      if (N.dark && st.age >= 3) wdGlow('ad-' + base + 'b', adGlowSvg('silver', 14, 16), st.x + 0.1, st.y + 0.08); else wdGlowOff('ad-' + base + 'b');
    }
  }
  return { want, stars };
}
function _adfTake(st) {
  if (adGet('sf.' + st.nn)) return;
  adSet('sf.' + st.nn, 1); adSet('sfn', (Number(adGet('sfn')) || 0) + 1); if (!adGet('sf1')) adSet('sf1', st.iso);
  const first = adKeep('ad-star-stone');
  adGive('sf.' + st.nn, { 'star-stone': 1, x: 2 }, first ? '' : 'A star stone, still warm. It is in your bag');
  if (adGrant('star-recipe', { 'recipe:star-lantern': 1 })) setTimeout(() => { if (_wd.on) wdAmbient('You know how to make a star lantern now: a star stone and a piece of timber, at the crafting bench.', 7000, 'sky'); }, 3200);
  try { _glFx(st.x, st.y, 'sparkle', { lift: 6 }); } catch (e) { /* no fx */ }
  adPick('sf-' + st.nn + 'k', null); wdGlowOff('ad-sf-' + st.nn + 'k');
}
function _adfSeed(st) {
  if (adGet('sb.' + st.nn)) return;
  adSet('sb.' + st.nn, 1);
  adGive('sb.' + st.nn, { 'seed:starbloom': 1, x: 1 }, 'A starbloom seed: it will grow in your own beds, and glow');
  try { _glFx(st.x, st.y, 'sparkle', { lift: 14 }); } catch (e) { /* no fx */ }
}
/** Bake a static thing's picture once it is in the world (the native renderer's own cache; the original drawing is kept). */
function adCacheStatic(dt, S) {
  const native = window.GardenNative, node = S.node;
  if (!native || !native.active() || !window.GardenNativeArt || !node || !node.target || !node.isConnected || !node.target.visible || S._adCached === node) return;
  try { GardenNativeArt.cache(node, { staticOnly: true, quality: 1, adaptive: true, crop: false }); } catch (e) { /* drawn live */ }
  S._adCached = node;
}
wdMod({
  id: 'ad-stars', pref: 'night', visit: true,
  begin() { _adf.ids = new Set(); },
  tick(m) {
    if (!adOn()) { if (_adf.ids.size) { adSpritesOff('sf-'); _adf.ids = new Set(); } return; }
    if (!_adf.done) { if (!(typeof wdWalkingLately === 'function' && wdWalkingLately())) _adfScan(3); return; }   // (the places are worked out a little at a time, never while you walk)
    const N = adNow(m), { want, stars } = _adfDraw(m, N), hN = N.hour < 12 ? N.hour + 24 : N.hour;
    for (const id of _adf.ids) if (!want.has(id)) { adSprite(id, null); _ad.picks.delete(id); wdGlowOff('ad-' + id); }
    _adf.ids = want;
    for (const st of stars) {
      if (st.fresh && N.tod === 'night' && hN - st.hour < 1 && _adf.streaked !== st.iso) { _adf.streaked = st.iso; _adfStreak(st); setTimeout(() => { if (_wd.on) wdAmbient(`Something came down, far off, ${_adfPast(st)}.`, 7000, 'sky'); }, 1700); }
      const k = 'smoke' + st.nn;
      if (st.fresh && (N.tod === 'dawn' || N.tod === 'day') && !adGet('sf.' + st.nn) && !_adf.told.has(k) && !adInView(st.x, st.y, 0)) { _adf.told.add(k); const p = typeof _gw !== 'undefined' ? { x: _gw.px, y: _gw.py } : st; setTimeout(() => { if (_wd.on) wdAmbient(`A thin line of smoke rises to the ${_adfDir(st.x - p.x, st.y - p.y)}. Something came down in the night.`, 8000, 'sky'); }, 4200); }
    }
  },
  end() { adSpritesOff('sf-'); _adf.ids = new Set(); },
});
