/* Automatic workspace mark: nearby mini illustrations, then a small scene.
 * Explicit initials, emoji and icons still use the workspace icon picker. */
function animProfileScene() {
  try {
    if (_agLevel() === 'off') return null;
    const w = animUkWhere();
    if (!w) return null;
    const look = animLook(), ctx = { county: w.id, ukTown: w.town, ukLat: w.lat, ukLon: w.lon };
    const eligible = animItems({ look }).filter(it => it.county && ['symbol', 'opening'].includes(it.slot)
      && !look.block.includes(it.ref) && _animFitsLevel(it, _agLevel()) && _awWhen(it, todayStr(), w.id));
    const nearby = animUkScenePools(eligible, ctx).nearby;
    const icons = nearby.filter(it => it.slot === 'symbol' || !it.full);
    const pool = icons.length ? icons : nearby.filter(it => it.full);
    if (!pool.length) return null;
    let last = '';
    try { last = localStorage.getItem('dashboard-opening-last-' + w.id) || ''; } catch (e) { /* Private mode. */ }
    return pool.find(it => it.ref === last) || pool[_animHash(todayStr() + '|' + w.town) % pool.length];
  } catch (e) { return null; }
}
