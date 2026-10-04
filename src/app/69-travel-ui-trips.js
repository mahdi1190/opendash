/* ============================================================
   TRIPS (#view=trips, #view=trip:<id>). Owner: SURFACES (travel spec 5.5, 5.9).
   User request, 3 Oct: "we can make recommendations based off the location and
   country and timezone". One section, two levels: the list of trips (planned,
   now, past, and "maybe" trips the dashboard is not sure of) and a trip:
     header   flag + motif scene, the name (rename in place), dates, status, two
              clocks (there and home), "Useful: Arigatō, thank you"
     body     the trip day by day in local days (legs, events with their scenes and
              "08:00 London" under meetings, tasks), spending by currency (from the
              user's own card payments: count-ups once, the home amount beside, fees),
              public holidays on those days
     actions  Rename, Add event, Add task, This is a trip (for a maybe), Not a trip,
              Forget this trip (asks; Undo brings the decisions back, 6.5)
   5.9: the section header and the sub-nav (the trips) are chrome; only the trip body
   changes on a switch. Re-selecting the trip you are on does nothing (it scrolls to
   the top if scrolled). Entrance plays once per trip entered, never on re-renders.
   Rows carry data-m-key="trip:<id>:<row>".
   ============================================================ */

let _trvEntered = '';           // the trip view last entered (its entrance played)
let _trvSpend = new Map();      // tripId -> {at, data, busy}
let _trvSpendShown = new Set(); // count-ups played once per trip

function _trvTrips() {
  const s = typeof trSnapshot === 'function' ? trSnapshot() : null;
  return { snap: s, trips: s && Array.isArray(s.trips) ? s.trips : [] };
}
function _trvFind(id) { const { snap, trips } = _trvTrips(); return { snap, trip: trips.find(t => t.id === id || (t.ids || []).includes(id)) || null, trips }; }
function _trvStatusText(t, today) {
  return { planned: 'Planned', departing: 'Leaving soon', away: 'Now', returning: 'Coming home', home: 'Just back', past: 'Past' }[t.status] || '';
}
function _trvMotif(t) {
  const kind = typeof trPlaceKind === 'function' && t.dest ? trPlaceKind({ cityId: t.dest.cityId, cc: t.dest.cc }) : '';
  const motif = { towers: 'skyline', oldtown: 'oldtown', coastal: 'coast', mountain: 'alpine', desert: 'desert', tropical: 'tropical', nordic: 'aurora', lowlands: 'windmill' }[kind] || '';
  const have = (x) => x && typeof ANIM_SCENES !== 'undefined' && ANIM_SCENES.some(s => s.type === x);
  const type = have(motif) ? motif : (t.legs && t.legs.length ? 'flight' : 'travel');
  return typeof animSceneHtml === 'function' ? animSceneHtml(type, { size: 'lg', cls: 'tr-motif', label: kind ? kind + ' scene' : '' }) : '';
}
function _trvScene(x) {
  try {
    if (x && x.start && typeof animForEvent === 'function') return (animForEvent(x) || {}).type || 'event';
    const item = x && x.id && typeof getItem === 'function' ? getItem(x.id) : null;
    if (item && typeof animForTask === 'function') return (animForTask(item) || {}).type || 'task';
  } catch (e) { /* a scene is decoration */ }
  return x && x.start ? 'event' : 'task';
}

/* ---------- the list ---------- */
function _trvList(container, snap, trips) {
  const page = document.createElement('div'); page.className = 'tr-trips';
  const on = typeof Travel !== 'undefined' && Travel.on();
  if (!on) {
    mountEmptyState(page, { icon: 'plane', title: 'Travel features are off', text: 'Turn them on to see your trips here, with local time, weather, spending abroad and holidays. Everything stays on this computer.',
      actions: [{ label: 'Turn on', icon: 'plane', primary: true, run: () => Travel.turnOn() }, { label: 'Travel & time settings', run: () => setView('settings:time') }] });
    container.appendChild(page);
    return;
  }
  const groups = [
    ['Now', trips.filter(t => !t.candidate && ['away', 'returning'].includes(t.status))],
    ['Coming up', trips.filter(t => !t.candidate && ['planned', 'departing'].includes(t.status))],
    ['Maybe trips', trips.filter(t => t.candidate && !t.confirmed)],
    ['Past', trips.filter(t => !t.candidate && ['home', 'past'].includes(t.status)).reverse()],
  ];
  if (!trips.length) {
    mountEmptyState(page, { icon: 'map', title: 'No trips yet', text: 'Flights and trains in your calendar, trips and hotel stays, time abroad on this computer and card payments abroad show here.' });
    container.appendChild(page);
    return;
  }
  for (const [title, list] of groups) {
    if (!list.length) continue;
    const sec = document.createElement('section'); sec.className = 'tr-trips-g';
    sec.innerHTML = `<h3 class="overline">${esc(title)}</h3>`;
    const ul = document.createElement('div'); ul.className = 'tr-trips-list'; ul.setAttribute('role', 'list');
    for (const t of list) {
      const r = document.createElement('button'); r.type = 'button'; r.className = 'tr-trip-row'; r.setAttribute('role', 'listitem');
      r.dataset.mKey = 'trips:' + t.id; r.dataset.id = t.id;
      r.innerHTML = `<span class="tr-trip-mot">${_trvMotif(t)}</span><span class="tr-trip-main"><span class="tr-trip-t">${typeof trFlagHtml === 'function' && t.dest ? trFlagHtml(t.dest.cc) : ''}<b></b></span><span class="tr-trip-s subtle"></span></span><span class="badge badge-soft tr-trip-st"></span>`;
      r.querySelector('b').textContent = t.label || 'Somewhere';
      r.querySelector('.tr-trip-s').textContent = `${trUiRange(t.from, t.to)}${t.nights ? ' · ' + t.nights + (t.nights === 1 ? ' night' : ' nights') : ''}${t.candidate ? ' · seen in ' + (t.sources.includes('bank') ? 'card payments' : 'your calendar') : ''}`;
      r.querySelector('.tr-trip-st').textContent = t.candidate ? 'Maybe' : _trvStatusText(t, snap.today);
      r.addEventListener('click', () => setView('trip:' + t.id));
      ul.appendChild(r);
    }
    sec.appendChild(ul);
    page.appendChild(sec);
  }
  container.appendChild(page);
  if (_trvEntered !== 'trips' && !(typeof _truReduced === 'function' && _truReduced())) {
    [...page.querySelectorAll('.tr-trip-row')].slice(0, 8).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: i * 40, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' }));
  }
  _trvEntered = 'trips';
}

/* ---------- one trip ---------- */
function _trvClocks(t, snap) {
  const now = Clock.now();
  const z = (t.dest && t.dest.zone) || '';
  const home = snap.home || {};
  if (!z || z === home.zone || clockOffsetIn(now, z) === clockOffsetIn(now, home.zone)) return '';
  const p = Clock.parts(now, z);
  return `<div class="tr-clocks" data-m-key="trip:${escAttr(t.id)}:clocks">`
    + `<div class="tr-clock"><span class="tr-clock-t num">${esc(Clock.fmtTime(now, { zone: z }))}</span><span class="subtle">${esc(t.dest.label || Clock.label(z))} · ${p.h >= 6 && p.h < 20 ? 'day' : 'night'}</span></div>`
    + `<div class="tr-clock is-home"><span class="tr-clock-t num">${esc(Clock.fmtTime(now, { zone: home.zone }))}</span><span class="subtle">${icon('house', 'i-xs')} ${esc(home.label || Clock.label(home.zone))} · ${esc(Clock.fmtDiff(clockOffsetIn(now, home.zone) - clockOffsetIn(now, z)).replace('Same time as home', 'same time'))}</span></div></div>`;
}
function _trvThanks(t) {
  if (!t.dest || !t.dest.cc || typeof trThanks !== 'function') return '';
  const th = trThanks({ cc: t.dest.cc, cityId: t.dest.cityId });
  if (!th || !th.text || th.lang === 'en') return '';
  return `<p class="tr-thanks subtle" lang="${escAttr(th.lang)}">Useful: <b>${esc(th.roman || th.text)}</b>${th.roman && th.roman !== th.text ? ` <span>(${esc(th.text)})</span>` : ''}, thank you</p>`;
}
function _trvTimeline(t, snap) {
  const tasks = (typeof getAllItems === 'function' ? getAllItems() : []).filter(i => (t.tasks || []).includes(i.id)).map(i => ({
    id: i.id, title: typeof effTitle === 'function' ? effTitle(i) : i.title, due: typeof effDate === 'function' ? effDate(i) : i.dueDate, dueTime: i.dueTime || '', planned: i.plannedFor || '', plannedTime: i.plannedTime || '',
    done: typeof statusOf === 'function' && statusOf(i.id) === 'done' }));
  const events = typeof CalStore !== 'undefined' && CalStore.data && Array.isArray(CalStore.data.events) ? CalStore.data.events : [];
  const days = trUiTimeline(t, { events, tasks, zone: snap.zone, homeZone: (snap.home || {}).zone, now: Clock.now(), scene: _trvScene });
  const box = document.createElement('section'); box.className = 'tr-tl'; box.dataset.mKey = `trip:${t.id}:days`;
  box.innerHTML = `<h3 class="overline">Day by day${t.dest && t.dest.zone ? ` <span class="subtle">· ${esc(Clock.label(t.dest.zone))} time</span>` : ''}</h3>`;
  for (const d of days) {
    const day = document.createElement('div'); day.className = 'tr-tl-day' + (d.today ? ' is-today' : ''); day.dataset.mKey = `trip:${t.id}:day:${d.date}`;
    if (d.today) day.setAttribute('aria-current', 'date');
    day.innerHTML = `<div class="tr-tl-d"><b>${esc(d.label)}</b>${d.today ? '<span class="badge badge-accent">Today</span>' : ''}</div>`;
    const ul = document.createElement('div'); ul.className = 'tr-tl-items';
    if (!d.items.length) ul.innerHTML = '<div class="tr-tl-free subtle">Nothing planned</div>';
    for (const it of d.items) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'tr-tl-row is-' + it.kind + (it.done ? ' is-done' : '');
      row.dataset.id = it.id; row.dataset.mKey = `trip:${t.id}:${it.kind}:${it.id}`;
      row.innerHTML = `<span class="tr-tl-time num">${esc(it.time || '')}</span>${typeof animSceneHtml === 'function' ? animSceneHtml(it.scene || 'event', { size: 'xs' }) : ''}<span class="tr-tl-main"><span class="tr-tl-title"></span>${it.sub ? '<span class="tr-tl-sub subtle"></span>' : ''}</span>${it.home ? `<span class="tr-tl-home subtle num">${icon('house', 'i-xs')}${esc(it.home)}</span>` : ''}`;
      row.querySelector('.tr-tl-title').textContent = it.title;
      if (it.sub) row.querySelector('.tr-tl-sub').textContent = it.sub;
      row.addEventListener('click', () => (it.kind === 'task' ? (typeof openTask === 'function' ? openTask(it.id, { from: row }) : selectTask(it.id)) : openEvent(it.id, { from: row })));
      ul.appendChild(row);
    }
    day.appendChild(ul);
    box.appendChild(day);
  }
  return box;
}
function _trvMoney(t, snap) {
  const box = document.createElement('section'); box.className = 'tr-money'; box.dataset.mKey = `trip:${t.id}:money`;
  box.innerHTML = '<h3 class="overline">Spending</h3>';
  const cfg = typeof TravelStore !== 'undefined' ? TravelStore.config() : { sources: {} };
  if (!cfg.sources || cfg.sources.bank === false) { box.insertAdjacentHTML('beforeend', '<p class="subtle">Card payments abroad are switched off in Settings > Travel & time.</p>'); return box; }
  const c = _trvSpend.get(t.id);
  if (!c || (!c.busy && Date.now() - c.at > 10 * 60000)) {
    _trvSpend.set(t.id, { at: Date.now(), data: c ? c.data : null, busy: true });
    TravelStore.spending(t).then((d) => { _trvSpend.set(t.id, { at: Date.now(), data: d, busy: false }); if (state.view === 'trip:' + t.id) render(); }).catch(() => { _trvSpend.set(t.id, { at: Date.now(), data: null, busy: false }); });
  }
  const cur = _trvSpend.get(t.id);
  if (!cur || (cur.busy && !cur.data)) { box.insertAdjacentHTML('beforeend', '<div class="skeleton tr-money-sk"></div>'); return box; }
  const homeCcy = (snap.home && snap.home.ccy) || (APP_CONFIG && APP_CONFIG.currency) || 'GBP';
  const s = trUiSpend(cur.data || {}, homeCcy);
  if (!s.any) { box.insertAdjacentHTML('beforeend', '<p class="subtle">No card payments for this trip yet. They arrive 1–3 days after you pay.</p>'); return box; }
  const fmt = (v, ccy) => { try { return new Intl.NumberFormat(APP_CONFIG.locale || undefined, { style: 'currency', currency: ccy, maximumFractionDigits: ['JPY', 'KRW', 'ISK', 'HUF'].includes(ccy) ? 0 : 2 }).format(v); } catch (e) { return `${ccy} ${Math.round(v)}`; } };
  const tiles = document.createElement('div'); tiles.className = 'tr-money-tiles';
  const tile = (num, ccy, lbl, key) => `<div class="tr-mtile" data-m-key="trip:${escAttr(t.id)}:money:${escAttr(key)}"><b class="num hg-amt" data-count="${escAttr(String(num))}" data-ccy="${escAttr(ccy)}">${esc(fmt(num, ccy))}</b><span class="subtle">${esc(lbl)}</span></div>`;
  let html = '';
  for (const l of s.lines) html += tile(l.orig || l.home, l.orig ? l.ccy : homeCcy, `${l.orig ? 'in ' + l.ccy : 'there'} · ${fmt(l.home, homeCcy)} · ${l.n} payment${l.n === 1 ? '' : 's'}`, l.ccy);
  if (s.homeOnly) html += tile(s.homeOnly, homeCcy, 'charged in ' + homeCcy, 'home');
  if (s.fees) html += tile(s.fees, homeCcy, 'card fees', 'fees');
  html += tile(s.total, homeCcy, 'in all', 'total');
  tiles.innerHTML = html;
  box.appendChild(tiles);
  if (!_trvSpendShown.has(t.id) && window.Motion && typeof Motion.countUp === 'function' && !(typeof _truReduced === 'function' && _truReduced())) {
    _trvSpendShown.add(t.id);
    for (const b of tiles.querySelectorAll('[data-count]')) { const v = Number(b.dataset.count), ccy = b.dataset.ccy; try { Motion.countUp(b, v, { format: (x) => fmt(x, ccy) }); } catch (e) { /* settles as text */ } }
  } else _trvSpendShown.add(t.id);
  return box;
}
function _trvHolidays(t) {
  if (!t.dest || !t.dest.cc || typeof TravelStore === 'undefined') return null;
  const years = [...new Set([t.from.slice(0, 4), (t.to || t.from).slice(0, 4)])];
  const list = trUiTripHolidays(t, years.flatMap(y => TravelStore.holidays(t.dest.cc, Number(y)) || []));
  if (!list.length) return null;
  const box = document.createElement('section'); box.className = 'tr-hols'; box.dataset.mKey = `trip:${t.id}:holidays`;
  box.innerHTML = '<h3 class="overline">Public holidays there</h3>' + list.map(h => `<div class="tr-hol">${icon('calendar-days', 'i-sm')}<b>${esc(trUiDate(h.date))}</b><span>${esc(h.name)}</span>${h.estimated ? '<span class="subtle">date may move by a day</span>' : ''}</div>`).join('');
  return box;
}
function _trvActions(t) {
  const bar = document.createElement('div'); bar.className = 'tr-acts'; bar.dataset.mKey = `trip:${t.id}:actions`;
  const mk = (label, ic, run, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (cls || 'btn-secondary'); b.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`; b.addEventListener('click', run); bar.appendChild(b); return b; };
  if (t.candidate && !t.confirmed) mk('This is a trip', 'check', () => { TravelStore.confirm(t.id); toast('Saved as a trip', { kind: 'ok', icon: 'map', action: { label: 'Undo', run: () => undo() } }); render(); }, 'btn-primary');
  mk('Rename', 'pencil', async () => {
    const v = await promptDialog({ title: 'Rename trip', label: 'Name', value: t.label || '', placeholder: 'e.g. Conference week', confirmLabel: 'Rename' });
    if (v == null) return;
    TravelStore.rename(t.id, v); render();
  });
  mk('Add event', 'calendar-plus', () => {
    const day = t.from > Clock.today() ? t.from : Clock.today();
    const at = (min) => (typeof sgLocalISO === 'function' ? sgLocalISO(day, min) : new Date(Clock.at(day, min)).toISOString());
    openEvent(null, { create: { title: '', start: at(10 * 60), end: at(11 * 60), location: (t.dest && t.dest.label) || '' } });
  });
  mk('Add task', 'list-todo', () => tcOpenCreate({ title: '', tags: ['trip'].concat(t.slug ? [t.slug] : []), date: t.from > Clock.today() ? clockAddDays(t.from, -1) : null }));
  const more = mk('', 'ellipsis', () => openMenu(more, [
    { label: 'Not a trip', icon: 'x', run: async () => { const before = state.travel ? JSON.parse(JSON.stringify(state.travel)) : undefined; await TravelStore.notTrip(t.id, { quiet: true }); setView('trips'); toast('Not a trip: it will not be suggested again.', { kind: 'ok', icon: 'map-pin', action: { label: 'Undo', run: () => { state.travel = before; saveData(); TravelStore.changed(); render(); } } }); } },
    { label: 'Forget this trip…', icon: 'trash-2', danger: true, run: () => trForgetTripAsk(t.id, { after: () => setView('trips') }) },
  ], { align: 'end', width: 220 }), 'btn-ghost');
  more.setAttribute('aria-label', 'More');
  return bar;
}
function _trvTrip(container, id) {
  const { snap, trip: t, trips } = _trvFind(id);
  const page = document.createElement('div'); page.className = 'tr-trip';
  if (!t) {
    mountEmptyState(page, { icon: 'map-pin', title: 'That trip is gone', text: 'It was forgotten, marked as not a trip, or its events have changed.', actions: [{ label: 'All trips', primary: true, run: () => setView('trips') }] });
    container.appendChild(page);
    return;
  }
  // Sub-nav (chrome): the other trips; the current one does nothing when clicked again.
  const near = trips.filter(x => !x.candidate || x.id === t.id).slice(-6);
  if (near.length > 1) {
    const nav = document.createElement('nav'); nav.className = 'tr-subnav'; nav.setAttribute('aria-label', 'Trips'); nav.setAttribute('data-m-chrome', '');
    const all = document.createElement('button'); all.type = 'button'; all.className = 'chip'; all.innerHTML = icon('arrow-left', 'i-xs') + '<span>All trips</span>';
    all.addEventListener('click', () => setView('trips'));
    nav.appendChild(all);
    for (const x of near) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (x.id === t.id ? ' chip-accent' : '');
      if (x.id === t.id) { b.setAttribute('aria-current', 'page'); b.style.cursor = 'default'; }
      b.innerHTML = (typeof trFlagHtml === 'function' && x.dest ? trFlagHtml(x.dest.cc) : '') + `<span>${esc(x.label || 'Trip')}</span>`;
      b.addEventListener('click', () => {
        if (x.id === t.id) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: _truReduced() ? 'auto' : 'smooth' }); return; }
        setView('trip:' + x.id);
      });
      nav.appendChild(b);
    }
    page.appendChild(nav);
  }
  const body = document.createElement('div'); body.className = 'tr-trip-body'; body.setAttribute('data-m-region', '');
  const head = document.createElement('header'); head.className = 'tr-trip-h'; head.dataset.mKey = `trip:${t.id}:head`;
  head.innerHTML = `<div class="tr-trip-hm">${_trvMotif(t)}</div><div class="tr-trip-hb"><div class="tr-trip-ht">${typeof trFlagHtml === 'function' && t.dest ? trFlagHtml(t.dest.cc, { sheen: _trvEntered !== 'trip:' + t.id }) : ''}<h2></h2><span class="badge badge-soft"></span></div><div class="subtle tr-trip-hs"></div>${_trvThanks(t)}</div>`;
  head.querySelector('h2').textContent = t.label || 'Somewhere';
  head.querySelector('.badge').textContent = t.candidate && !t.confirmed ? 'Maybe' : _trvStatusText(t, snap.today);
  const when = trUiTripWhen(t, snap.today);
  head.querySelector('.tr-trip-hs').textContent = `${trUiRange(t.from, t.to)}${t.nights ? ' · ' + t.nights + (t.nights === 1 ? ' night' : ' nights') : ''}${when && when !== trUiRange(t.from, t.to) ? ' · ' + when : ''}`;
  body.appendChild(head);
  const clocks = _trvClocks(t, snap);
  if (clocks) body.insertAdjacentHTML('beforeend', clocks);
  body.appendChild(_trvActions(t));
  const cols = document.createElement('div'); cols.className = 'tr-trip-cols';
  const left = document.createElement('div'); left.className = 'tr-trip-l';
  left.appendChild(_trvTimeline(t, snap));
  const right = document.createElement('div'); right.className = 'tr-trip-r';
  right.appendChild(_trvMoney(t, snap));
  const hol = _trvHolidays(t); if (hol) right.appendChild(hol);
  cols.append(left, right);
  body.appendChild(cols);
  page.appendChild(body);
  container.appendChild(page);
  // Once per trip entered: the body rises; re-renders (saves, live sync, spending arriving) do nothing.
  if (_trvEntered !== 'trip:' + t.id && !_truReduced()) {
    [...body.querySelectorAll(':scope > [data-m-key], .tr-trip-cols > div > section')].slice(0, 8).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 50, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' }));
  }
  _trvEntered = 'trip:' + t.id;
}

registerSection('trips', {
  match: v => v === 'trips' || /^trip:[a-z0-9-]{3,60}$/i.test(v),
  title: () => 'Trips',      // the trip's own name is its header (and the crumb)
  crumb: (v) => (v === 'trips' ? ['Trips'] : ['Trips', (_trvFind(v.slice(5)).trip || {}).label || 'Trip']),
  group: 'home', hashable: true, layout: 'page',
  mount(container, view) {
    const v = view || state.view;
    if (v === 'trips') { const { snap, trips } = _trvTrips(); _trvList(container, snap, trips); }
    else _trvTrip(container, v.slice(5));
  },
  unmount() { _trvEntered = ''; },
});
