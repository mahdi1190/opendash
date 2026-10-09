/* Automatic workspace mark: the current location's compact animated artwork,
 * then a still scene when no miniature is available. Uses the same offline
 * coordinates/travel context and enabled packs as the opening artwork. */
let _animProfileMemo = { key: '', item: null };
function animProfileScene() {
  try {
    const level = _agLevel();
    if (level === 'off') return null;
    const w = typeof animUkWhere === 'function' ? animUkWhere() : null;
    const look = animLook(), day = todayStr();
    const ctx = typeof animCtx === 'function' ? animCtx() : {};
    if (w) Object.assign(ctx, { county: w.id, ukTown: w.town, ukLat: w.lat, ukLon: w.lon });
    const key = JSON.stringify([day, level, look, ctx]);
    if (_animProfileMemo.key === key) return _animProfileMemo.item;
    const item = animProfileAt(look, day, level, ctx, w);
    _animProfileMemo = { key, item };
    return item;
  } catch (e) { return null; }
}

function animProfileAt(look, day, level, ctx, w) {
  const available = animItems({ look }).filter(it => ['symbol', 'opening'].includes(it.slot)
    && !look.block.includes(it.ref) && _animFitsLevel(it, level));
  const matches = (it, at = ctx) => typeof it.when !== 'function' || _animWhen(it, day, at);
  const pick = (items, place) => {
    const mini = items.filter(it => !it.full);
    let pool = mini.length ? mini : items;
    if (!pool.length) return null;
    const priority = Math.max(...pool.map(it => it.priority || 1));
    pool = pool.filter(it => (it.priority || 1) === priority);
    let last = '';
    try { last = localStorage.getItem('dashboard-opening-last-' + place) || ''; } catch (e) { /* Private mode. */ }
    return pool.find(it => it.ref === last) || pool[_animHash(day + '|' + place) % pool.length];
  };
  if (w) {
    const eligible = available.filter(it => it.county && matches(it));
    return pick(animUkScenePools(eligible, ctx).nearby, w.id);
  }
  // World-city miniatures also follow an explicitly chosen/device location.
  // Only a known city's own 25 km anchor may claim it; no online lookup.
  let city = ctx.city || '';
  if (!city && Number.isFinite(ctx.lat) && Number.isFinite(ctx.lon)
      && typeof trCity === 'function' && typeof trKm === 'function') {
    const ids = [...new Set(available.filter(it => it.pack === 'world').map(it => it.city))];
    let nearest = 25;
    for (const id of ids) {
      const km = trKm(ctx, trCity(id));
      if (km <= nearest) { nearest = km; city = id; }
    }
  }
  if (city) {
    const item = pick(available.filter(it => it.pack === 'world' && it.city === city && matches(it, { ...ctx, city })), city);
    if (item) return item;
  }
  const texas = typeof animTexasWhere === 'function' ? animTexasWhere(ctx) : null;
  if (texas) return pick(available.filter(it => it.pack === 'texas' && it.texasKind !== 'day' && matches(it)), texas.id);
  const where = typeof animRegionWhere === 'function' ? animRegionWhere(ctx) : null;
  if (!where) return null;
  return pick(available.filter(it => animRegionOwns(where.region, it.pack) && matches(it)), where.region + ':' + (where.id || where.name));
}
