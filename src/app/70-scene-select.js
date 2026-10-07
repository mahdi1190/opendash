/* ============================================================
   SCENE SELECTION RULES (docs/dev/SCENE_ENGINE.md section 9; builder A). PURE.
   Which place's scene plays, as a pluggable, data-driven rule per region:
     sceneSelectRuleDefine(id, fn)    fn(input) -> Result | null
     sceneSelect(ruleId, input)       runs a rule (an unknown id runs 'nearest')
   Built in: 'nearest' (the county behaviour: the nearest place within placeKm) and 'dense' (London and dense cities, 9.3).
   input  = { now, places: [{id, name, kind: 'station'|'area'|'borough', lat, lon, unit, lines?}], units?: [{id, lat, lon}],
              fix: {lat, lon, acc, at} | null, track: [{lat, lon, acc, at}], seen: {placeId: {days30, lastAt}}, params, seed }
   Result = { kind: 'arrival'|'rotation'|'journey'|'area'|'borough'|'region', id, ids?, km, reason }
   PRIVACY (9.5): the fix and the track are full precision and live IN MEMORY ONLY; nothing here stores anything.
   ============================================================ */
const SCENE_SELECT_DENSE_DEFAULTS = Object.freeze({ arriveM: 300, nearM: 400, dwellMin: 3, freshFixS: 120, maxAccM: 150, walkM: 900, areaM: 1500,
  journeyAfter: 4, journeyWindowMin: 90, commuteDays: 6, commuteWeight: 0.25, newWeight: 2.5, recentHours: 24, recentWeight: 0.3, rotateMin: 60 });
const _scSelectRules = Object.create(null);
function sceneSelectRuleDefine(id, fn) {
  if (typeof fn !== 'function') throw new Error('sceneSelectRuleDefine ' + id + ': a function');
  _scSelectRules[id] = fn;
}
function sceneSelect(ruleId, input) {
  const fn = _scSelectRules[ruleId] || _scSelectRules.nearest;
  try { return fn(input || {}) || null; } catch (e) { return null; }
}
const _scSelM = (a, b) => {
  const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dg = (b.lon - a.lon) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dg / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const _scSelOk = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon);
function _scSelNearest(list, at, maxM) {
  let best = null, bd = Infinity;
  for (const p of list) { if (!_scSelOk(p)) continue; const d = _scSelM(at, p); if (d <= maxM && d < bd) { bd = d; best = p; } }
  return best ? { p: best, m: bd } : null;
}
const _scSelKm = m => Math.round(m) / 1000;
/* nearest: the nearest place within params.placeKm (default 50 km), today's county behaviour. */
sceneSelectRuleDefine('nearest', (I) => {
  const fix = I.fix;
  if (!_scSelOk(fix)) return null;
  const n = _scSelNearest(I.places || [], fix, ((I.params && I.params.placeKm) || 50) * 1000);
  return n ? { kind: n.p.kind === 'area' ? 'area' : 'arrival', id: n.p.id, km: _scSelKm(n.m), reason: 'the nearest place within placeKm' } : null;
});
/* dense (9.3): arrival, journey, weighted rotation, then area, borough, region. */
sceneSelectRuleDefine('dense', (I) => {
  const P = Object.assign({}, SCENE_SELECT_DENSE_DEFAULTS, I.params || {}), now = Number.isFinite(I.now) ? I.now : 0;
  const places = (I.places || []).filter(_scSelOk), stations = places.filter(p => p.kind === 'station'), areas = places.filter(p => p.kind === 'area');
  const fix = _scSelOk(I.fix) ? I.fix : null, track = (I.track || []).filter(t => _scSelOk(t) && Number.isFinite(t.at)).sort((a, b) => a.at - b.at);
  if (!fix) return { kind: 'region', id: '', km: 0, reason: 'no position' };
  // 1. arrival: the nearest station within arriveM, with a dwell (fixes near it spanning dwellMin) or a fresh, accurate fix
  const st = _scSelNearest(stations, fix, P.arriveM);
  if (st) {
    const near = track.filter(t => _scSelM(t, st.p) <= P.nearM && now - t.at <= P.journeyWindowMin * 60000);
    const dwell = near.length >= 2 && (near[near.length - 1].at - near[0].at) >= P.dwellMin * 60000;
    const fresh = Number.isFinite(fix.at) && fix.at > 0 && now - fix.at <= P.freshFixS * 1000 && (fix.acc == null || fix.acc <= P.maxAccM);
    if (dwell || fresh) return { kind: 'arrival', id: st.p.id, km: _scSelKm(st.m), reason: dwell ? 'dwelt ' + P.dwellMin + '+ min near it' : 'a fresh fix within ' + P.arriveM + ' m' };
  }
  // 2. journey: journeyAfter or more distinct stations passed in the window, in order (the last one plays until a journey archetype exists)
  const passed = [];
  for (const t of track) {
    if (now - t.at > P.journeyWindowMin * 60000) continue;
    const n = _scSelNearest(stations, t, P.nearM);
    if (n && passed[passed.length - 1] !== n.p.id && !passed.includes(n.p.id)) passed.push(n.p.id);
  }
  if (passed.length >= P.journeyAfter) return { kind: 'journey', id: passed[passed.length - 1], ids: passed, km: 0, reason: passed.length + ' stations in ' + P.journeyWindowMin + ' min' };
  // 3. rotation among the stations within walkM: commute stations less, new ones more, recently shown ones less; seeded per slot
  const walk = stations.map(p => ({ p, m: _scSelM(fix, p) })).filter(x => x.m <= P.walkM).sort((a, b) => a.m - b.m || (a.p.id < b.p.id ? -1 : 1));
  if (walk.length) {
    const seen = I.seen || {};
    const w = walk.map(x => {
      const s = seen[x.p.id];
      let k = 1;
      if (s && s.days30 >= P.commuteDays) k *= P.commuteWeight;
      if (!s || !s.lastAt) k *= P.newWeight;
      else if (now - s.lastAt <= P.recentHours * 3600000) k *= P.recentWeight;
      return k;
    });
    const tot = w.reduce((a, b) => a + b, 0), r = sceneRnd(sceneHash('dense|' + (I.seed == null ? '' : I.seed)))();
    let x = r * tot, i = 0;
    for (; i < w.length - 1; i++) if ((x -= w[i]) <= 0) break;
    return { kind: 'rotation', id: walk[i].p.id, km: _scSelKm(walk[i].m), reason: walk.length + ' stations within ' + P.walkM + ' m' };
  }
  // 4. fallback: the nearest area, then the borough (the unit whose row is nearest), then the region
  const ar = _scSelNearest(areas, fix, P.areaM);
  if (ar) return { kind: 'area', id: ar.p.id, km: _scSelKm(ar.m), reason: 'no station within ' + P.walkM + ' m' };
  const unitRows = (I.units || []).filter(_scSelOk).concat(places.filter(p => p.unit).map(p => ({ id: p.unit, lat: p.lat, lon: p.lon })));
  const b = _scSelNearest(unitRows, fix, Infinity);
  if (b) return { kind: 'borough', id: b.p.id, km: _scSelKm(b.m), reason: 'no station or area near' };
  return { kind: 'region', id: '', km: 0, reason: 'nothing near' };
});
