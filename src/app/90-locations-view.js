/* ============================================================
   LOCATIONS tab (#view=locations), 2.16. The facts come from
   locationsFacts() (90-locations.js over 90-locations-logic.js).
     hero      where you are now, since when, and the map of everywhere
               (an equirectangular "constellation": dots sized by days,
               lines in the order you went, the current place pulsing)
     tiles     countries, places, days abroad, distance, time zones crossed,
               tasks done away from home
     badges    the ones earned (window.Locations.onBadge hands them on)
     timeline  every visit, newest first, with firsts, weather and tasks done
     passport  countries: flag, first visit, days, places, tasks, spend (when
               the finance side publishes spend per country)
     facts     most productive place, hottest and coldest, furthest from home,
               longest away, on this day, years
   Entrance plays once per entry; re-renders (saves, live sync) do not replay it.
   ============================================================ */
let _locvEntered = false;
let _locvMore = 30;
let _locvSpend;   // undefined: not asked yet; null: none
let _locvFilter = 'all';   // the timeline: all | abroad | firsts | done

function _locvFlag(cc) { return cc && typeof trFlagHtml === 'function' ? trFlagHtml(cc) : (cc ? `<span class="tr-flag is-cc">${esc(cc)}</span>` : icon('map-pin')); }
function _locvDate(ms, withYear) {
  const d = new Date(ms), now = new Date();   // clock-ok: labels for real log times
  try { return d.toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', ...(withYear || d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }); } catch (e) { return d.toISOString().slice(0, 10); }
}
function _locvRange(a, b) {
  const da = new Date(a), db = new Date(b);
  const same = da.toDateString() === db.toDateString();
  return same ? _locvDate(a) : _locvDate(a, da.getFullYear() !== db.getFullYear()) + ' – ' + _locvDate(b);
}
function _locvDur(ms) {
  if (ms < 3600000) return Math.max(1, Math.round(ms / 60000)) + ' min';
  if (ms < 2 * 86400000) return Math.round(ms / 3600000) + ' h';
  const d = Math.round(ms / 86400000);
  return d < 60 ? d + ' days' : d < 730 ? Math.round(d / 30.4) + ' months' : (Math.round(d / 36.5) / 10) + ' years';
}
function _locvNum(n) { try { return Number(n || 0).toLocaleString(APP_CONFIG.locale || undefined); } catch (e) { return String(n || 0); } }
function _locvTemp(c) {
  if (!Number.isFinite(c)) return '';
  const f = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brief && APP_CONFIG.brief.units === 'imperial';
  return Math.round(f ? c * 9 / 5 + 32 : c) + '°';
}
function _locvMoney(n, ccy) { try { return new Intl.NumberFormat(APP_CONFIG.locale || undefined, { style: 'currency', currency: ccy || 'GBP', maximumFractionDigits: 0 }).format(n); } catch (e) { return Math.round(n) + ' ' + (ccy || ''); } }
const _LOCV_SRC = { geo: ['compass', 'From your device'], manual: ['map-pin', 'The place you chose'], zone: ['clock', 'From your time zone'], trip: ['plane', 'A trip'], import: ['history', 'Earlier history'] };
function _locvName(v) { return v.city || v.place || v.country || v.cc || 'Somewhere'; }

/* ---------- the map ---------- */
function _locvMap(f) {
  const pts = f.visits.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lon));
  if (!pts.length) return '';
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  for (const p of pts) { minX = Math.min(minX, p.lon); maxX = Math.max(maxX, p.lon); minY = Math.min(minY, p.lat); maxY = Math.max(maxY, p.lat); }
  // Frame the places (2:1, at least 16 x 8 degrees), padded.
  let w = Math.max(16, (maxX - minX) * 1.3), h = Math.max(8, (maxY - minY) * 1.3);
  if (w / h > 2) h = w / 2; else w = h * 2;
  w = Math.min(360, w); h = Math.min(180, h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const x0 = Math.max(-180, Math.min(180 - w, cx - w / 2)), y1 = Math.min(90, Math.max(-90 + h, cy + h / 2));
  const W = 400, H = 200, X = (lon) => ((lon - x0) / w) * W, Y = (lat) => ((y1 - lat) / h) * H;
  const step = w > 120 ? 30 : w > 40 ? 10 : w > 16 ? 5 : 2;
  let grid = '';
  for (let g = Math.ceil(x0 / step) * step; g <= x0 + w; g += step) grid += `<line x1="${X(g).toFixed(1)}" y1="0" x2="${X(g).toFixed(1)}" y2="${H}"/>`;
  for (let g = Math.ceil((y1 - h) / step) * step; g <= y1; g += step) grid += `<line x1="0" y1="${Y(g).toFixed(1)}" x2="${W}" y2="${Y(g).toFixed(1)}"${g === 0 ? ' class="eq"' : ''}/>`;
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p.lon).toFixed(1) + ' ' + Y(p.lat).toFixed(1)).join(' ');
  const byKey = new Map();
  for (const p of pts) { const k = p.key || p.cc; const o = byKey.get(k) || { p, ms: 0 }; o.ms += p.ms; byKey.set(k, o); }
  const dots = [...byKey.values()].map(({ p, ms }) => {
    const r = Math.min(7, 2.2 + Math.sqrt(ms / 86400000) * 0.6);
    return `<circle class="dot${p.approx ? ' is-approx' : ''}" cx="${X(p.lon).toFixed(1)}" cy="${Y(p.lat).toFixed(1)}" r="${r.toFixed(1)}"><title>${esc(_locvName(p))}${p.country && p.city ? ', ' + esc(p.country) : ''}: ${esc(_locvDur(ms))}</title></circle>`;
  }).join('');
  const cur = pts[pts.length - 1];
  const here = cur ? `<circle class="here" cx="${X(cur.lon).toFixed(1)}" cy="${Y(cur.lat).toFixed(1)}" r="4"/><circle class="here-ring" cx="${X(cur.lon).toFixed(1)}" cy="${Y(cur.lat).toFixed(1)}" r="4"/>` : '';
  return `<svg class="loc-map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the places you have been"><g class="grid">${grid}</g><path class="route" d="${path}"/>${dots}${here}</svg>`;
}

/* ---------- parts ---------- */
function _locvTiles(f) {
  const tiles = [
    ['globe', _locvNum(f.countries.length), f.countries.length === 1 ? 'country' : 'countries'],
    ['map-pin', _locvNum(f.cities.length), f.cities.length === 1 ? 'place' : 'places'],
    ['plane', _locvNum(f.daysAbroad), f.daysAbroad === 1 ? 'day abroad' : 'days abroad'],
    ['compass', _locvNum(f.km) + ' km', 'travelled'],
    ['clock', _locvNum(f.zonesCrossed), f.zonesCrossed === 1 ? 'time zone crossed' : 'time zones crossed'],
    ['circle-check', _locvNum(f.tasks.abroad), 'tasks done abroad'],
  ];
  return `<div class="loc-tiles">${tiles.map(([ic, n, l]) => `<div class="loc-tile">${icon(ic, 'i-lg')}<b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
}
function _locvBadges(f) {
  if (!f.badges.length) return '';
  const list = f.badges.slice().reverse();
  return `<section class="loc-sec loc-badges" data-m-key="badges">${secHeadHtml({ title: 'Badges', count: f.badges.length })}<div class="loc-badge-row">${list.map(b => `<span class="loc-badge" data-kind="${esc(b.kind)}" data-tip="${esc(b.text + ' ' + _locvDate(b.at, true))}">${icon(b.icon || 'award', 'i-sm')}<span>${esc(b.title)}</span></span>`).join('')}</div></section>`;
}
const _LOCV_FILTERS = [['all', 'All'], ['abroad', 'Abroad'], ['firsts', 'Firsts'], ['done', 'Got things done']];
function _locvTimeline(f) {
  const keep = { all: () => true, abroad: v => v.cc && f.homeCc && v.cc !== f.homeCc, firsts: v => v.firstCountry || v.firstCity, done: v => v.done > 0 }[_locvFilter] || (() => true);
  const vs = f.visits.filter(keep).reverse();
  const shown = vs.slice(0, _locvMore);
  let year = '';
  let html = '';
  for (const v of shown) {
    const y = String(new Date(v.from).getFullYear());
    if (y !== year) { year = y; html += `<li class="loc-tl-year" aria-hidden="true">${esc(y)}</li>`; }
    const src = _LOCV_SRC[v.src] || _LOCV_SRC.import;
    const chips = [];
    if (v.firstCountry) chips.push(`<span class="chip chip-accent">${icon('flag', 'i-xs')}<span>First time in ${esc(v.country || v.cc)}</span></span>`);
    else if (v.firstCity) chips.push(`<span class="chip chip-solid">${icon('sparkles', 'i-xs')}<span>First visit</span></span>`);
    if (v.began) chips.push(`<span class="chip chip-solid">${icon('history', 'i-xs')}<span>Where your history begins</span></span>`);
    if (v.done) chips.push(`<span class="chip">${icon('circle-check', 'i-xs')}<span>${_locvNum(v.done)} done</span></span>`);
    if (v.wx && (Number.isFinite(v.wx.hi) || Number.isFinite(v.wx.lo))) chips.push(`<span class="chip" title="Weather while you were there">${icon('sun', 'i-xs')}<span>${esc([_locvTemp(v.wx.hi), _locvTemp(v.wx.lo)].filter(Boolean).join(' / '))}${v.wx.label ? ' ' + esc(v.wx.label) : ''}</span></span>`);
    const sub = [v.city && v.region ? v.region : '', v.city && v.country ? v.country : ''].filter(Boolean).join(', ');
    const now = v === f.visits[f.visits.length - 1];
    html += `<li class="loc-tl-item${now ? ' is-now' : ''}"><span class="loc-tl-dot" aria-hidden="true"></span>
      <div class="loc-tl-main"><div class="loc-tl-t">${_locvFlag(v.cc)}<b>${esc(_locvName(v))}</b>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}</div>
      <div class="loc-tl-when"><span>${esc(now ? 'Since ' + _locvDate(v.from) : _locvRange(v.from, v.to))}</span><span class="muted">· ${esc(_locvDur(v.ms))}</span><span class="loc-src" data-tip="${esc(src[1])}">${icon(src[0], 'i-xs')}</span></div>
      ${chips.length ? `<div class="loc-tl-chips">${chips.join('')}</div>` : ''}</div></li>`;
  }
  const more = vs.length > shown.length ? `<button type="button" class="btn btn-ghost btn-sm loc-more" data-act="more">Show ${Math.min(50, vs.length - shown.length)} more</button>` : '';
  // A filter, not a row of tabs (Places' sections are the page's second level): one small select.
  const chips = `<div class="loc-filters"><select class="control control-sm" data-act="filter" aria-label="Show">${_LOCV_FILTERS.map(([k, l]) => `<option value="${k}"${_locvFilter === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  const empty = vs.length ? '' : `<p class="empty-line">${_locvFilter === 'abroad' ? 'No time abroad logged yet. Somewhere new soon?' : _locvFilter === 'firsts' ? 'Your firsts will show here.' : 'Tasks you finish show here with the place you finished them.'}</p>`;
  return `<section class="loc-sec card" data-m-key="timeline">${secHeadHtml({ title: 'Travel timeline', count: `${_locvNum(vs.length)} ${vs.length === 1 ? 'stay' : 'stays'}` })}${chips}${empty}<ol class="loc-tl">${html}</ol>${more}</section>`;
}
function _locvPassport(f) {
  if (!f.countries.length) return '';
  const spend = _locvSpend && _locvSpend.rows ? new Map(_locvSpend.rows.map(r => [r.cc, r.amount])) : null;
  const rows = f.countries.slice().sort((a, b) => (b.home - a.home) || (b.last - a.last)).map(c => `<li class="loc-stamp${c.home ? ' is-home' : ''}">
      <span class="loc-stamp-flag">${_locvFlag(c.cc)}</span>
      <div class="loc-stamp-b"><b>${esc(c.country || c.cc)}</b>${c.home ? '<span class="chip chip-solid">Home</span>' : ''}
        <span class="muted">First ${esc(_locvDate(c.first, true))}${c.visits > 1 ? ` · ${c.visits} visits` : ''}</span></div>
      <div class="loc-stamp-n"><span>${_locvNum(c.nDays)} ${c.nDays === 1 ? 'day' : 'days'}</span>${c.nCities ? `<span class="muted">${c.nCities} ${c.nCities === 1 ? 'place' : 'places'}</span>` : ''}${c.done ? `<span class="muted">${_locvNum(c.done)} done</span>` : ''}${spend && spend.has(c.cc) ? `<span class="muted" data-tip="Spent there (from Finances)">${esc(_locvMoney(spend.get(c.cc), _locvSpend.currency))}</span>` : ''}</div></li>`).join('');
  return `<section class="loc-sec card" data-m-key="passport">${secHeadHtml({ title: 'Passport', sub: spend ? 'with spend from Finances' : '' })}<ul class="loc-stamps">${rows}</ul></section>`;
}
function _locvPlaces(f) {
  const top = f.cities.slice().sort((a, b) => b.nDays - a.nDays || b.ms - a.ms).slice(0, 8);
  if (!top.length) return '';
  const max = Math.max(...top.map(c => c.nDays), 1);
  return `<section class="loc-sec card" data-m-key="places">${secHeadHtml({ title: 'Your places' })}<ul class="loc-bars">${top.map(c => `<li><span class="loc-bar-l">${_locvFlag(c.cc)}<span>${esc(c.city)}</span></span><span class="loc-bar"><i style="width:${Math.max(3, Math.round(c.nDays / max * 100))}%"></i></span><span class="loc-bar-n">${_locvNum(c.nDays)} d${c.done ? ` · ${_locvNum(c.done)} done` : ''}</span></li>`).join('')}</ul></section>`;
}
function _locvFacts(f) {
  const facts = [];
  const add = (ic, title, text) => facts.push(`<li>${icon(ic)}<div><b>${esc(title)}</b><span class="muted">${esc(text)}</span></div></li>`);
  if (f.productive) add('trophy', 'Your most productive place: ' + f.productive.city, `${_locvNum(f.productive.done)} tasks done there, ${f.productive.rate} a day.`);
  if (f.hottest && Number.isFinite(f.hottest.wx.hi)) add('sun', 'Warmest: ' + f.hottest.city, `Up to ${_locvTemp(f.hottest.wx.hi)} while you were there.`);
  if (f.coldest && Number.isFinite(f.coldest.wx.lo) && (!f.hottest || f.coldest.key !== f.hottest.key)) add('mountain', 'Coldest: ' + f.coldest.city, `Down to ${_locvTemp(f.coldest.wx.lo)}.`);
  if (f.furthest && f.furthest.km >= 50) add('compass', 'Furthest from home: ' + f.furthest.city, `${_locvNum(f.furthest.km)} km away, ${_locvDate(f.furthest.at, true)}.`);
  if (f.longestAway >= 2) add('plane', 'Longest time away', `${f.longestAway} days in a row abroad.`);
  if (f.hoursShifted) add('clock', 'Clock changes', `${_locvNum(f.hoursShifted)} hours of jet lag earned across ${f.zones.length} time zones.`);
  if (f.continents.length > 1) add('globe', f.continents.length + ' continents', f.continents.join(', ') + '.');
  for (const o of f.onThisDay.slice(0, 3)) add('history', o.years === 1 ? 'A year ago today' : o.years + ' years ago today', 'You were in ' + (o.city || o.place || o.country) + (o.city && o.country ? ', ' + o.country : '') + '.');
  const lateTop = [...f.tasks.late.entries()].sort((a, b) => b[1] - a[1])[0];
  if (lateTop && lateTop[1] >= 2) { const c = f.cities.find(x => x.key === lateTop[0]); if (c) add('moon', 'Late nights in ' + c.city, `${lateTop[1]} tasks finished after 11 pm there.`); }
  if (!facts.length) return '';
  return `<section class="loc-sec card" data-m-key="facts">${secHeadHtml({ title: 'Fun facts' })}<ul class="loc-facts">${facts.join('')}</ul></section>`;
}
function _locvYears(f) {
  if (f.years.length < 1) return '';
  return `<section class="loc-sec card" data-m-key="years">${secHeadHtml({ title: 'Year by year' })}<ul class="loc-years">${f.years.map(y => `<li><b>${esc(y.year)}</b><span>${y.countries} ${y.countries === 1 ? 'country' : 'countries'}</span><span>${y.cities} ${y.cities === 1 ? 'place' : 'places'}</span><span class="muted">${_locvNum(y.km)} km</span></li>`).join('')}</ul></section>`;
}

/** A short travel story to paste anywhere ("Copy my travel story"). */
function _locvStory(f) {
  const lines = [];
  const since = f.began ? _locvDate(f.began, true) : '';
  lines.push(`My places${since ? ' since ' + since : ''}: ${f.countries.length} ${f.countries.length === 1 ? 'country' : 'countries'}, ${f.cities.length} ${f.cities.length === 1 ? 'place' : 'places'}, ${_locvNum(f.km)} km, ${f.zonesCrossed} time zones crossed, ${_locvNum(f.daysAbroad)} days abroad.`);
  const abroad = f.countries.filter(c => !c.home).sort((a, b) => a.first - b.first).map(c => c.country || c.cc);
  if (abroad.length) lines.push('Countries: ' + abroad.join(', ') + '.');
  if (f.productive) lines.push(`Most productive in ${f.productive.city} (${f.productive.rate} tasks a day).`);
  if (f.badges.length) lines.push('Badges: ' + f.badges.slice(-6).map(b => b.title).join(' · ') + '.');
  lines.push('(from my OpenDash)');
  return lines.join('\n');
}
/** "Where was I on ...?" (command palette). */
async function locWhereWasI() {
  const v = await promptDialog({ title: 'Where was I on…', label: 'A date (YYYY-MM-DD)', placeholder: 'e.g. 2026-05-01', confirmLabel: 'Find' });
  if (!v) return;
  const t = Date.parse(String(v).trim() + 'T12:00:00');
  if (!Number.isFinite(t)) { toast('That isn’t a date I can read: try YYYY-MM-DD.', { kind: 'err' }); return; }
  const s = Locations.where(t);
  if (!s) { toast('Your location history doesn’t reach back to ' + _locvDate(t, true), { icon: 'map-pin' }); return; }
  toast(`On ${_locvDate(t, true)} you were in ${s.city || s.place || s.country}${s.city && s.country ? ', ' + s.country : ''}`, { icon: 'map-pin', timeout: 9000, action: { label: 'Locations', run: () => setView('locations') } });
}
/* Places, Life's sixth tab (2.18): Overview (this page, 'locations') and Trips ('trips', a trip is 'trip:<id>'). */
function _locvNextTripHint() {
  try {
    if (typeof _truOn !== 'function' || !_truOn() || typeof _truSnap !== 'function') return '';
    const snap = _truSnap();
    if (!snap || !Array.isArray(snap.trips)) return '';
    if (snap.trips.some(t => !t.candidate && t.status === 'away')) return 'away';
    const d = snap.trips.filter(t => !t.candidate && ['planned', 'departing'].includes(t.status)).map(t => clockDaysBetween(snap.today, t.from)).filter(n => n >= 0 && n <= 30).sort((a, b) => a - b)[0];
    return d === undefined ? '' : d === 0 ? 'today' : 'in ' + d + 'd';
  } catch (e) { return ''; }
}
registerPage({
  id: 'places', view: 'locations', match: v => v === 'locations' || v === 'trips' || /^trip:[a-z0-9-]{3,60}$/i.test(String(v || '')),
  label: 'Places', icon: 'map-pin', area: 'life', tab: true, order: 60, since: '2.16', discover: true,
  desc: 'Where you have been, and your trips',
  keywords: 'places locations countries cities visited travel map badges firsts passport trips holiday where was i',
  sections: () => {
    const on = typeof _truOn === 'function' && _truOn();
    const v = String(state.view || '');
    return [['locations', 'Overview']].concat(on || v === 'trips' || v.startsWith('trip:') ? [{ view: 'trips', label: 'Trips', match: x => x === 'trips' || /^trip:/.test(x) }] : []);
  },
  badge: _locvNextTripHint,
});
registerCommand({ id: 'locations-where', label: 'Where was I on…?', icon: 'map-pin', group: 'Go to', keywords: 'location history date day place travel were was i', run: () => locWhereWasI() });

/* ---------- the page ---------- */
function _locvMount(container) {
  const page = document.createElement('div'); page.className = 'loc-page';
  if (!locLogOn()) {
    mountEmptyState(page, { icon: 'map-pin', title: 'Location history is off', text: LOC_NOTICE + ' Turn it on to collect countries, cities, firsts and badges here.',
      actions: [{ label: 'Turn on', icon: 'map-pin', primary: true, run: async () => { if (await locLogSetOn(true)) render(); } }, { label: 'Location history settings', run: () => setView('settings:locations') }] });
    container.appendChild(page);
    return;
  }
  const f = locationsFacts();
  if (!f.visits.length) {
    mountEmptyState(page, { icon: 'map-pin', title: 'Your places will collect here', text: LOC_NOTICE + ' Pick your location (or let your device share it) and your trips and time zones fill this in as you go.',
      actions: [{ label: 'Set your location', icon: 'map-pin', primary: true, run: () => setView('settings:profile') }, { label: 'Location history settings', run: () => setView('settings:locations') }] });
    container.appendChild(page);
    return;
  }
  const cur = f.visits[f.visits.length - 1];
  const sub = [cur.city && cur.region, cur.city && cur.country].filter(Boolean).join(', ');
  const map = _locvMap(f);
  page.innerHTML = `
    <section class="loc-hero card${map ? '' : ' no-map'}" data-m-key="hero">
      <div class="loc-hero-t">
        <span class="overline">You are in</span>
        <div class="loc-hero-place">${_locvFlag(cur.cc)}<b>${esc(_locvName(cur))}</b></div>
        ${sub ? `<div class="muted">${esc(sub)}</div>` : ''}
        <div class="loc-hero-meta muted">Since ${esc(_locvDate(cur.from, true))}${f.began ? ` · history since ${esc(_locvDate(f.began, true))}` : ''}</div>
      </div>
      ${map ? `<div class="loc-hero-map">${map}</div>` : ''}
    </section>
    ${_locvTiles(f)}
    ${_locvBadges(f)}
    <div class="loc-cols"><div class="loc-col">${_locvTimeline(f)}</div><div class="loc-col">${_locvFacts(f)}${_locvPassport(f)}${_locvPlaces(f)}${_locvYears(f)}</div></div>
    <p class="loc-foot muted">${icon('lock', 'i-sm')} <span>${esc(LOC_NOTICE)}</span> <button type="button" class="btn-link" data-act="settings">Location history settings</button></p>`;
  page.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'more') { _locvMore += 50; render(); }
    else if (b.dataset.act === 'settings') setView('settings:locations');
  });
  page.addEventListener('change', (e) => {
    const b = e.target.closest('[data-act="filter"]');
    if (!b || _locvFilter === b.value) return;
    _locvFilter = b.value; _locvMore = 30; render();
  });
  container.appendChild(page);
  if (typeof memPostcardAlbumEl === 'function') container.appendChild(memPostcardAlbumEl({ compact: true }));   // postcards (93-memories-ui.js)
  if (_locvSpend === undefined) { _locvSpend = null; Locations.spend().then(s => { if (s) { _locvSpend = s; if (state.view === 'locations') render(); } }); }
  if (!_locvEntered && !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()) && document.documentElement.getAttribute('data-motion-level') !== 'off') {
    [...page.querySelectorAll('.loc-hero, .loc-tile, .loc-badges, .loc-sec.card')].slice(0, 14).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 35, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' }));
    const route = page.querySelector('.loc-map .route');
    if (route && route.getTotalLength) { try { const L = route.getTotalLength(); route.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 1400, easing: 'ease-in-out' }); } catch (e) { /* no SVG geometry */ } }
  }
  _locvEntered = true;
}
/** The page header's actions: nothing is primary here; the two small tools and the settings sit under More. */
function _locvCopyStory() { return copyText(_locvStory(locationsFacts()), 'your travel story'); }
registerSection('locations', {
  title: () => 'Places',
  headerActions: () => ({ more: [
    { label: 'Copy my travel story', icon: 'copy', run: _locvCopyStory },
    { label: 'Where was I on…', icon: 'history', run: () => locWhereWasI() },
    { label: 'Location history settings', icon: 'settings', run: () => setView('settings:locations') },
  ] }),
  group: 'life', hashable: true, layout: 'page',   // Life > Places since 2.18 (NAVIGATION_PLAN.md 2.2); the view id stays 'locations'
  mount(container) { _locvMount(container); if (!_loc.data && !_loc.loading) locLogLoad().then(() => { if (state.view === 'locations') render(); }); },
  unmount() { _locvEntered = false; _locvMore = 30; _locvFilter = 'all'; },
});
