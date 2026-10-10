/* Animation gallery catalogue. Pure classic-script helpers: the browser and Node
   share search, location families, renderer labels and deterministic preview light.
   A pack's v1/v2 suffix describes a viewpoint, never a historical revision. Saved
   look actions always use baseRef; ~legacy refs exist only in this catalogue. */
const _AG_SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const _AG_TIMES = ['dawn', 'day', 'dusk', 'night'];
const _AG_VIEWS = { wide: 'Wide view', close: 'Close view', detail: 'Detail view', evening: 'Evening view' };

function _agFold(value) {
  return String(value == null ? '' : value).normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/['’`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function _agTitle(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function _agCountry(code) {
  if (!code) return '';
  if (typeof ASIA_COUNTRIES !== 'undefined' && ASIA_COUNTRIES[code]) return ASIA_COUNTRIES[code][0];
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch (e) { return code; }
}
function _agCounty(id) {
  const county = typeof ukCounty === 'function' ? ukCounty(id) : null;
  return county && county.name || _agTitle(id);
}
function _agRegionOf(it) {
  const regions = typeof ANIM_REGIONS !== 'undefined' ? ANIM_REGIONS : [];
  return regions.find(r => r.fields && (it[r.fields.place] || it[r.fields.unit])) || null;
}
function _agPlace(it) {
  if (it.ukPlace) return { key: 'place:GB:' + (it.county || '') + ':' + it.ukPlace,
    label: String(it.label || _agTitle(it.ukPlace)).split(',')[0] + (it.county ? ', ' + _agCounty(it.county) : '') };
  if (it.ukTown || it.ukLocality) return { key: 'place:GB:' + (it.county || '') + ':' + _agFold(it.ukTown || it.ukLocality),
    label: (it.ukTown || it.ukLocality) + (it.county ? ', ' + _agCounty(it.county) : '') };
  if (it.county) return { key: 'unit:GB:' + it.county, label: _agCounty(it.county) };
  const region = _agRegionOf(it);
  if (region) {
    const unit = it[region.fields.unit], pid = it[region.fields.place];
    const row = pid && region.places.find(p => p[0] === pid);
    const cc = it.country || (region.countryOf && region.countryOf(unit)) || '';
    const name = region.units[unit] && region.units[unit][0] || _agTitle(unit);
    return pid ? { key: 'place:' + cc + ':' + pid, label: (row ? row[1] : _agTitle(pid)) + (name ? ', ' + name : '') }
      : { key: 'unit:' + cc + ':' + unit, label: name };
  }
  if (it.txTown) {
    const towns = typeof TX_TOWNS !== 'undefined' ? TX_TOWNS : [];
    const row = towns.find(p => p[0] === it.txTown);
    return { key: 'place:US:' + it.txTown, label: (row ? row[1] : _agTitle(it.txTown)) + ', Texas' };
  }
  if (it.city) {
    const cc = it.country || '', pid = String(it.city).replace(new RegExp('-' + cc.toLowerCase() + '$'), '');
    return { key: 'place:' + cc + ':' + pid, label: _agTitle(pid) + (cc ? ', ' + _agCountry(cc) : '') };
  }
  if (it.state) {
    const states = typeof US_STATES !== 'undefined' ? US_STATES : {};
    return { key: 'unit:US:' + it.state, label: states[it.state] ? states[it.state][0] : _agTitle(it.state) };
  }
  // Standalone composed demos still have a public site, even without regional fields.
  if (it.full && it.site) return { key: 'site:' + (it.country || '') + ':' + _agFold(it.site), label: it.site };
  return { key: '', label: '' };
}

/** Metadata for display, filtering and related variants. Does not build scene data. */
function animGalleryInfo(it) {
  it = it || {};
  const technique = it.composed ? 'new' : 'old', place = _agPlace(it);
  const view = it.ukView || it.viewName || '';
  const viewpoint = /(?:^|-)v(\d+)$/.exec(it.ukPart || '');
  const viewLabel = _AG_VIEWS[view] || (view ? _agTitle(view) + ' view' : viewpoint ? 'View ' + viewpoint[1] : '');
  const seasons = Array.isArray(it.season) ? it.season.filter(s => _AG_SEASONS.includes(s)) : _AG_SEASONS.includes(it.season) ? [it.season] : [];
  const season = _AG_SEASONS.includes(it.ukSeason) ? it.ukSeason : seasons.length === 1 ? seasons[0] : '';
  const seasonLabel = season ? _agTitle(season) : seasons.length ? seasons.map(_agTitle).join(', ') : 'All seasons';
  return { technique, techniqueLabel: technique === 'new' ? 'New technique' : 'Old technique',
    placeKey: place.key, placeLabel: place.label, view, viewLabel, season, seasonLabel,
    variantLabel: [viewLabel, seasonLabel].filter(Boolean).join(' · '),
    baseRef: it.baseRef || it.ref || '', hasLegacy: !!it.composed && typeof it.legacySvg === 'function' };
}

/** Old art retained by a live upgrade, available for comparison without replacing
    the registry item or making its virtual ref a saved pin/favourite/block. */
function animGalleryLegacyItem(it) {
  if (!it || !it.composed || typeof it.legacySvg !== 'function') return null;
  const old = Object.assign({}, it, { ref: it.ref + '~legacy', baseRef: it.baseRef || it.ref,
    label: it.legacyLabel || it.label, composed: false, svg: it.legacySvg, reduced: 'static', galleryLegacy: true });
  delete old.scene; delete old.sceneSeason; delete old.upgrade; delete old.legacySvg;
  return old;
}
function animGalleryCatalogue(items) {
  const out = [], seen = new Set();
  for (const it of items || []) {
    if (!it || seen.has(it.ref)) continue;
    out.push(it); seen.add(it.ref);
    const old = animGalleryLegacyItem(it);
    if (old && !seen.has(old.ref)) { out.push(old); seen.add(old.ref); }
  }
  return out;
}
function _agSearchText(it, info) {
  const pack = typeof animPack === 'function' ? animPack(it.pack) : null;
  const region = _agRegionOf(it), regions = Array.isArray(it.region) ? it.region : [];
  const fields = Object.keys(it).filter(k => /(?:place|town|locality|county|state|country|region|cc|city)$/i.test(k))
    .map(k => typeof it[k] === 'string' ? it[k] : '');
  return _agFold([it.label, it.site, it.ref, it.id, it.pack, pack && pack.name,
    it.slot, it.mood, info.placeLabel, info.techniqueLabel, info.variantLabel,
    it.viewReason, region && region.name, _agCountry(it.country), ...regions.map(r => _agCountry(r)),
    ...fields, ...(it.tags || [])].filter(Boolean).join(' '));
}
/** Every query word must match somewhere; search spans all packs independently
    of enabled packs and the daily rotation's location/season eligibility. */
function animGalleryFilter(items, options) {
  const o = options || {}, tokens = _agFold(o.q).split(' ').filter(Boolean);
  return (items || []).filter(it => {
    if (!it || (o.pack && it.pack !== o.pack) || (o.slot && it.slot !== o.slot)) return false;
    const info = animGalleryInfo(it);
    if (o.technique && info.technique !== o.technique) return false;
    if (o.place && info.placeKey !== o.place) return false;
    if (o.season && (info.season ? info.season !== o.season : Array.isArray(it.season) && !it.season.includes(o.season))) return false;
    const text = tokens.length ? _agSearchText(it, info) : '';
    return tokens.every(token => text.includes(token));
  });
}

/** Location families keep every view, season and old/new alternate together. */
function animGalleryPlaces(items) {
  const groups = new Map();
  for (const it of items || []) {
    if (!it) continue;
    const info = animGalleryInfo(it);
    if (!info.placeKey) continue;
    if (!groups.has(info.placeKey)) groups.set(info.placeKey, { key: info.placeKey, label: info.placeLabel, count: 0,
      items: [], techniques: [], seasons: [], views: [] });
    const group = groups.get(info.placeKey);
    group.items.push(it); group.count++;
    for (const [field, value] of [['techniques', info.technique], ['seasons', info.season], ['views', info.view]]) {
      if (value && !group[field].includes(value)) group[field].push(value);
    }
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'en') || a.key.localeCompare(b.key, 'en'));
}

/** Preview only: fixed equinox solar moments at the artwork's own place. The
    historical year keeps canvas hosts fixed through their normal relight cycle;
    explicit season preserves each seasonal item. No Clock or user location read. */
function animGalleryPreviewOptions(it, time) {
  const info = animGalleryInfo(it), options = info.season ? { season: info.season } : {};
  if (!_AG_TIMES.includes(time)) return options;
  const own = it && it.liveSky && typeof it.liveSky === 'object' ? it.liveSky : {};
  const lat = Number.isFinite(own.lat) ? own.lat : Number.isFinite(it && it.ukLat) ? it.ukLat : 0;
  const lon = Number.isFinite(own.lon) ? own.lon : Number.isFinite(it && it.ukLon) ? it.ukLon : 0;
  if (typeof almSunTimes !== 'function' || typeof almSceneLight !== 'function') return Object.assign(options, { tod: time, lighting: false });
  const sun = almSunTimes('2000-03-20', lat, lon), hour = 3600000;
  const noon = Number.isFinite(sun.rise) && Number.isFinite(sun.set) ? (sun.rise + sun.set) / 2 : Date.UTC(2000, 2, 20, 12) - lon / 15 * hour;
  const ms = time === 'dawn' ? (Number.isFinite(sun.rise) ? sun.rise + hour / 4 : noon - 6 * hour)
    : time === 'dusk' ? (Number.isFinite(sun.set) ? sun.set - hour / 4 : noon + 6 * hour)
    : time === 'night' ? noon + 12 * hour : noon;
  const sky = almSceneLight(Math.round(ms), lat, lon, 'UTC');
  return sky ? Object.assign(options, { tod: time, sky }) : Object.assign(options, { tod: time, lighting: false });
}
