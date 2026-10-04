/* ============================================================
   HOME widget "travel": Trip (travel spec 5.1). OWNER: SURFACES.
   User request, 3 Oct: "make sure we track the timezone, and we can make
   recommendations based off the location and country and timezone".
   Hidden by default and only offered while travel features are on and a trip is
   near (within 14 days), on, or just over. The facts: trSnapshot() (69-travel.js);
   the pure layout rules: 69-travel-ui-logic.js.
     S     the motif, flag, city, local time big, home time small, weather
     M     two dials (there and home); the trip day by day (legs, events, "08:00 London"
           under meetings); spending by currency and "charged in pounds"; open trip
           tasks; one travel suggestion at the foot (homeSuggestSlot 'travel': the T rules
           show here instead of proactively while the card is on the board)
     L     M, plus a strip of the trip's days with their scenes, holidays there and the
           packing list's progress
     Before the trip: "Tokyo in 2 days", the countdown, packing and check-in, weather there.
   Motion: on ctx.firstPaint the numbers count up; new timeline rows use ctx.enterNew;
   the clocks tick in place each minute (homeTick); nothing replays on a save or live sync.
   ============================================================ */
registerHomeWidget({
  id: 'travel', title: 'Trip', icon: 'plane', group: 'time', sizes: ['s', 'm', 'l'], defaultSize: 'm',
  order: 260, defaultHidden: true, fresh: true,      // after the v1 widgets (lib/home-topbar.mjs HOME_WIDGETS lists it last)
  description: 'Local time and home time, the trip day by day, spending abroad, weather and tips there',
  emptyHint: 'Appears with travel features on, when a trip is within two weeks',
  aliases: ['trip', 'travel', 'time zone', 'world clock', 'abroad', 'holiday', 'flight'],
  available() { return typeof Travel === 'undefined' || Travel.on(); },
  render(el, ctx) { return _hwtRender(el, ctx || {}); },
  settings(anchor, ctx) { if (typeof Travel !== 'undefined') Travel.openSettings(); },
  sample() { return null; },
});

/** A small analogue dial: the hour and minute hands; night = a dark face. */
function _hwtDial(h, mi, o) {
  o = o || {};
  const night = h < 6 || h >= 20;
  const ha = ((h % 12) + mi / 60) * 30, ma = mi * 6;
  return `<svg class="hwt-dial${night ? ' is-night' : ''}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" class="hwt-face"/>`
    + [0, 90, 180, 270].map(a => `<line x1="20" y1="4" x2="20" y2="6.5" class="hwt-tick" transform="rotate(${a} 20 20)"/>`).join('')
    + `<line x1="20" y1="20" x2="20" y2="11" class="hwt-hh" transform="rotate(${ha} 20 20)"/><line x1="20" y1="20" x2="20" y2="7" class="hwt-mh" transform="rotate(${ma} 20 20)"/><circle cx="20" cy="20" r="1.6" class="hwt-c"/></svg>`;
}
function _hwtWeather(cityId, ctx) {
  if (!cityId || typeof homeData !== 'function') return null;
  const cfg = typeof TravelStore !== 'undefined' ? TravelStore.config() : { weather: true };
  if (cfg.weather === false) return null;
  const r = homeData('travel:wx:' + cityId, '/api/travel/weather?place=' + encodeURIComponent(cityId), { maxAge: 30 * 60e3, ctx });
  const d = r && r.status === 'ok' ? r.data : null;
  if (!d || d.ok === false || !d.current) return null;
  const rain = (d.hourly || []).find(x => x.rain >= 50 && x.date === (d.localTime || '').slice(0, 10) && x.hour >= Number(String(d.localTime || '').slice(11, 13)));
  return { temp: Math.round(d.current.temp), cond: d.current.cond, label: d.current.label, isDay: d.current.isDay, rain: rain ? rain.time : '' };
}
function _hwtWxPill(w) {
  if (!w) return '';
  const ic = typeof briefWxIcon === 'function' ? briefWxIcon(w.cond, w.isDay, 'i-xs') : icon('cloud', 'i-xs');   // the brief's weather icons (74-brief-ui.js)
  return `<span class="hwt-wx" title="${escAttr(w.label || '')}">${ic}<b class="num">${esc(String(w.temp))}°</b>${w.rain ? `<span>rain from ${esc(w.rain)}</span>` : ''}</span>`;
}
function _hwtPlace(snap, trip) {
  const w = snap.where || {};
  if (w.away && w.place) return Object.assign({}, w.place, { zone: w.place.zone || (trip && trip.dest && trip.dest.zone) || snap.zone });
  if (trip && trip.dest) return trip.dest;
  return null;
}
function _hwtCcyFmt(v, ccy) {
  try { return new Intl.NumberFormat((APP_CONFIG && APP_CONFIG.locale) || undefined, { style: 'currency', currency: ccy, maximumFractionDigits: ['JPY', 'KRW', 'ISK', 'HUF'].includes(ccy) ? 0 : 0 }).format(v); } catch (e) { return `${ccy} ${Math.round(v)}`; }
}
function _hwtSpend(trip, ctx, homeCcy) {
  if (!trip || typeof homeData !== 'function' || typeof TravelStore === 'undefined') return null;
  if (TravelStore.config().sources.bank === false) return null;
  const r = homeData('travel:spend:' + trip.id, () => TravelStore.spending(trip).then(d => d || { status: 'empty' }), { maxAge: 10 * 60e3, ctx });
  const s = r && r.status === 'ok' ? trUiSpend(r.data, homeCcy) : null;
  return s && s.any ? s : null;
}
function _hwtCountUp(el, ctx) {
  if (!ctx.firstPaint || !window.Motion || typeof Motion.countUp !== 'function' || (typeof _truReduced === 'function' && _truReduced())) return;
  for (const b of el.querySelectorAll('[data-count]')) { const v = Number(b.dataset.count), ccy = b.dataset.ccy; try { Motion.countUp(b, v, { format: (x) => (ccy ? _hwtCcyFmt(x, ccy) : String(Math.round(x))) }); } catch (e) { /* settles as text */ } }
}
function _hwtPackInfo(trip) {
  if (!trip || typeof getAllItems !== 'function') return null;
  const t = getAllItems().find(i => (trip.tasks || []).includes(i.id) && /\bpack(ing)?\b/i.test(typeof effTitle === 'function' ? effTitle(i) : i.title || ''));
  if (!t) return null;
  const subs = typeof effSubtasks === 'function' ? effSubtasks(t) : (t.subtasks || []);
  return { id: t.id, done: subs.filter(s => s && s.done).length, n: subs.length, title: typeof effTitle === 'function' ? effTitle(t) : t.title };
}

function _hwtRender(el, ctx) {
  if (ctx.preview) return _hwtSample(el, ctx);
  if (typeof Travel === 'undefined' || !Travel.on() || typeof trSnapshot !== 'function') return false;
  const snap = trSnapshot();
  if (!snap || snap.pending) return false;
  const { mode, trip } = trUiWidgetMode(snap);
  const place = mode === 'idle' ? null : _hwtPlace(snap, trip);
  if (!place) {
    // "Not a trip" from this card: the trip is gone, but its receipt (with Undo) stays until it folds.
    const foot = document.createElement('div'); foot.className = 'card hwt hwt-' + ctx.size;
    if (typeof sgSurfaceReceipts === 'function' && sgSurfaceReceipts(foot, 'widget:' + ctx.id)) { el.appendChild(foot); return true; }
    return false;
  }
  const now = Clock.now();
  const zone = place.zone || snap.zone;
  const home = snap.home || {};
  const homeZone = home.zone || Clock.home();
  const card = document.createElement('div'); card.className = 'card hwt hwt-' + ctx.size + ' is-' + mode;
  const label = (trip && trip.label) || place.label || Clock.label(zone);
  const wx = _hwtWeather(place.cityId, ctx);
  const head = document.createElement('div'); head.className = 'hwt-h';
  head.innerHTML = `${typeof trFlagHtml === 'function' ? trFlagHtml(place.cc, { sheen: !!ctx.firstPaint }) : ''}<b class="hwt-city"></b><span class="subtle hwt-when"></span><span class="spacer"></span>${_hwtWxPill(wx)}`;
  head.querySelector('.hwt-city').textContent = label;
  head.querySelector('.hwt-when').textContent = trip ? (mode === 'before' ? trUiRange(trip.from, trip.to) : trUiTripWhen(trip, snap.today)) : 'away';
  head.addEventListener('click', (e) => { if (trip && !e.target.closest('button')) Travel.openTrip(trip.id); });
  if (trip) { head.classList.add('is-link'); head.setAttribute('role', 'link'); head.tabIndex = 0; head.addEventListener('keydown', (e) => { if (e.key === 'Enter') Travel.openTrip(trip.id); }); }
  card.appendChild(head);
  const lp = Clock.parts(now, zone), hp = Clock.parts(now, homeZone);
  const differs = clockOffsetIn(now, zone) !== clockOffsetIn(now, homeZone);
  if (ctx.size === 's') {
    const s = document.createElement('div'); s.className = 'hwt-s';
    const motif = typeof _trvMotif === 'function' && trip ? _trvMotif(trip) : '';
    s.innerHTML = `${motif ? `<span class="hwt-mot">${motif}</span>` : ''}<div class="hwt-big"><b class="num hwt-t" data-z="${escAttr(zone)}">${esc(Clock.fmtTime(now, { zone }))}</b>`
      + (differs ? `<span class="subtle hwt-home">${icon('house', 'i-xs')}<span class="num hwt-t" data-z="${escAttr(homeZone)}">${esc(Clock.fmtTime(now, { zone: homeZone }))}</span> ${esc(home.label || Clock.label(homeZone))}</span>` : '')
      + (mode === 'before' && trip ? `<span class="subtle">${esc(trUiTripWhen(trip, snap.today))}</span>` : '') + '</div>';
    card.appendChild(s);
  } else {
    // Two dials: there and home (the same trDial look MOMENTS uses; no sweep here).
    if (differs) {
      const dials = document.createElement('div'); dials.className = 'hwt-dials';
      const one = (z, ttl, sub, isHome) => `<div class="hwt-clock${isHome ? ' is-home' : ''}" data-z="${escAttr(z)}">${_hwtDial(Clock.parts(now, z).h, Clock.parts(now, z).mi)}<div><b class="num hwt-t" data-z="${escAttr(z)}">${esc(Clock.fmtTime(now, { zone: z }))}</b><span class="subtle">${esc(ttl)}${sub ? ' · ' + esc(sub) : ''}</span></div></div>`;
      dials.innerHTML = one(zone, Clock.label(zone), mode === 'away' ? 'your time' : 'there', false)
        + one(homeZone, home.label || Clock.label(homeZone), 'home' + ((hp.h < 6 || hp.h >= 22) ? ', night' : ''), true);
      card.appendChild(dials);
    }
    if (mode === 'before' && trip) {
      const pre = document.createElement('div'); pre.className = 'hwt-pre';
      const days = clockDaysBetween(snap.today, trip.from);
      const pack = _hwtPackInfo(trip);
      const leg = (snap.legs || []).find(l => l.tripId === trip.id && l.depart > now);
      pre.innerHTML = `<div class="hwt-tile"><b class="num" data-count="${days}">${days}</b><span class="subtle">${days === 1 ? 'day to go' : 'days to go'}</span></div>`
        + (pack ? `<button type="button" class="hwt-tile is-btn" data-open-task="${escAttr(pack.id)}"><b class="num">${pack.done}/${pack.n}</b><span class="subtle">packed</span></button>` : '')
        + (leg ? `<div class="hwt-tile"><b>${leg.checkinTask ? icon('circle-check', 'i-sm') : icon('circle', 'i-sm')}</b><span class="subtle">${leg.checkinTask ? 'check-in planned' : 'check in online'}</span></div>` : '');
      card.appendChild(pre);
    }
    // The trip day by day: today's and the next items (M), every day (L).
    if (trip) {
      const events = typeof CalStore !== 'undefined' && CalStore.data && Array.isArray(CalStore.data.events) ? CalStore.data.events : [];
      const tasks = (typeof getAllItems === 'function' ? getAllItems() : []).filter(i => (trip.tasks || []).includes(i.id)).map(i => ({ id: i.id, title: effTitle(i), due: effDate(i), dueTime: i.dueTime || '', planned: i.plannedFor || '', plannedTime: i.plannedTime || '', done: statusOf(i.id) === 'done' }));
      const days = trUiTimeline(trip, { events, tasks, zone: snap.zone, homeZone, now, scene: typeof _trvScene === 'function' ? _trvScene : null });
      const rows = [];
      const fromDay = mode === 'away' ? Clock.parts(now, zone).iso : trip.from;
      for (const d of days) { if (d.date < fromDay && ctx.size !== 'l') continue; for (const it of d.items) rows.push(Object.assign({ day: d }, it)); }
      const shown = rows.slice(0, ctx.size === 'l' ? 10 : 5);
      if (shown.length) {
        const tl = document.createElement('div'); tl.className = 'hwt-tl';
        for (const it of shown) {
          const r = document.createElement('button'); r.type = 'button'; r.className = 'hwt-row is-' + it.kind + (it.done ? ' is-done' : ''); r.dataset.k = it.kind + ':' + it.id;
          r.innerHTML = `<span class="hwt-dot" aria-hidden="true"></span><span class="subtle hwt-rd num">${esc(it.min === null && /–/.test(it.time || '') ? it.time : it.day.label.slice(0, 3) + ' ' + (it.time || ''))}</span><span class="hwt-rt"></span>${it.home ? `<span class="subtle hwt-rh num">${esc(it.home)}</span>` : ''}`;
          r.querySelector('.hwt-rt').textContent = it.title;
          r.addEventListener('click', () => (it.kind === 'task' ? ctx.openTask(it.id, r) : openEvent(it.id, { from: r })));
          tl.appendChild(r);
        }
        card.appendChild(tl);
        if (ctx.enterNew) ctx.enterNew(tl.querySelectorAll('.hwt-row'), (x) => x.dataset.k);
      }
      // Spending (by currency, then what was charged in pounds), open trip tasks.
      const homeCcy = home.ccy || (APP_CONFIG && APP_CONFIG.currency) || 'GBP';
      const sp = mode !== 'before' ? _hwtSpend(trip, ctx, homeCcy) : null;
      const openTasks = trUiTripTasks(trip, tasks).filter(t => !t.done).length;
      if (sp || openTasks) {
        const tiles = document.createElement('div'); tiles.className = 'hwt-tiles';
        let html = '';
        for (const l of (sp ? sp.lines : []).slice(0, 2)) html += `<div class="hwt-tile"><b class="num hg-amt" data-count="${escAttr(String(l.orig || l.home))}" data-ccy="${escAttr(l.orig ? l.ccy : homeCcy)}">${esc(_hwtCcyFmt(l.orig || l.home, l.orig ? l.ccy : homeCcy))}</b><span class="subtle">in ${esc(l.ccy)}, ${l.n} payment${l.n === 1 ? '' : 's'}</span></div>`;
        if (sp && (sp.homeOnly || sp.fees)) html += `<div class="hwt-tile"><b class="num hg-amt" data-count="${escAttr(String(sp.homeOnly + sp.fees))}" data-ccy="${escAttr(homeCcy)}">${esc(_hwtCcyFmt(sp.homeOnly + sp.fees, homeCcy))}</b><span class="subtle">charged in ${esc(homeCcy === 'GBP' ? 'pounds' : homeCcy)}${sp.fees ? ', incl. fees' : ''}</span></div>`;
        if (openTasks) html += `<button type="button" class="hwt-tile is-btn" data-trip="${escAttr(trip.id)}"><b class="num" data-count="${openTasks}">${openTasks}</b><span class="subtle">trip task${openTasks === 1 ? '' : 's'} open</span></button>`;
        tiles.innerHTML = html;
        card.appendChild(tiles);
      }
      if (ctx.size === 'l') {
        const strip = document.createElement('div'); strip.className = 'hwt-strip';
        strip.innerHTML = days.slice(0, 10).map(d => `<div class="hwt-sd${d.today ? ' is-today' : ''}"${d.today ? ' aria-current="date"' : ''}><span class="subtle">${esc(d.label.slice(0, 3))}</span>${typeof animSceneHtml === 'function' ? animSceneHtml((d.items[0] && d.items[0].scene) || 'travel', { size: 'sm' }) : ''}<b class="num">${esc(d.date.slice(8).replace(/^0/, ''))}</b></div>`).join('');
        card.appendChild(strip);
        const hols = typeof TravelStore !== 'undefined' && trip.dest ? trUiTripHolidays(trip, TravelStore.holidays(trip.dest.cc, Number(trip.from.slice(0, 4)))) : [];
        if (hols.length) card.insertAdjacentHTML('beforeend', `<div class="hwt-hols">${hols.slice(0, 3).map(h => `<span class="chip">${icon('calendar-days', 'i-xs')}${esc(trUiDate(h.date))} · ${esc(h.name)}</span>`).join('')}</div>`);
        const pack = _hwtPackInfo(trip);
        if (pack && pack.n) card.insertAdjacentHTML('beforeend', `<button type="button" class="hwt-pack" data-open-task="${escAttr(pack.id)}"><span>${esc(pack.title)}</span><span class="progress"><i style="--pct:${Math.round(100 * pack.done / pack.n)}%"></i></span><span class="num subtle">${pack.done}/${pack.n}</span></button>`);
      }
      // The arrival-day tip from the body clock (5.3).
      const B = snap.body;
      if (B && B.active && B.days === 0) card.insertAdjacentHTML('beforeend', `<p class="hwt-tip subtle">${icon(B.dir === 'east' ? 'sunrise' : 'sunset', 'i-xs')} ${B.dir === 'east' ? 'Get morning daylight' : 'Get afternoon daylight'}: it helps your body clock catch up.</p>`);
    }
    // A ✓ done here keeps its receipt (with Undo) at the foot once its card has gone (68-suggest-ui.js).
    if (typeof sgSurfaceReceipts === 'function') { const foot = document.createElement('div'); foot.className = 'hwt-rec'; if (sgSurfaceReceipts(foot, 'widget:' + ctx.id)) card.appendChild(foot); }
    homeSuggestSlot(card, ctx, 'travel');
  }
  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-task]'); if (t) { ctx.openTask(t.dataset.openTask, t); return; }
    const tr = e.target.closest('[data-trip]'); if (tr) Travel.openTrip(tr.dataset.trip);
  });
  el.appendChild(card);
  _hwtCountUp(card, ctx);
  // Each minute: the clocks change in place.
  homeTick(ctx, () => {
    const t = Clock.now();
    for (const b of el.querySelectorAll('.hwt-t[data-z]')) { const v = Clock.fmtTime(t, { zone: b.dataset.z }); if (b.textContent !== v) b.textContent = v; }
    for (const c of el.querySelectorAll('.hwt-clock[data-z]')) { const p = Clock.parts(t, c.dataset.z); const svg = c.querySelector('svg'); if (svg) svg.outerHTML = _hwtDial(p.h, p.mi); }
  });
  return true;
}
/** The gallery's preview: a made-up trip, so the card can be seen before any trip. */
function _hwtSample(el, ctx) {
  const card = document.createElement('div'); card.className = 'card hwt hwt-' + ctx.size + ' is-sample';
  const now = Clock.now();
  const z = 'Asia/Tokyo', hz = Clock.home();
  card.innerHTML = `<div class="hwt-h">${typeof trFlagHtml === 'function' ? trFlagHtml('JP') : ''}<b class="hwt-city">Tokyo</b><span class="subtle hwt-when">day 2 of 6</span><span class="spacer"></span>${_hwtWxPill({ temp: 17, cond: 'rain', label: 'Rain', isDay: true })}</div>`
    + `<div class="hwt-dials"><div class="hwt-clock">${_hwtDial(Clock.parts(now, z).h, Clock.parts(now, z).mi)}<div><b class="num">${esc(Clock.fmtTime(now, { zone: z }))}</b><span class="subtle">Tokyo · your time</span></div></div>`
    + `<div class="hwt-clock is-home">${_hwtDial(Clock.parts(now, hz).h, Clock.parts(now, hz).mi)}<div><b class="num">${esc(Clock.fmtTime(now, { zone: hz }))}</b><span class="subtle">${esc(Clock.label(hz))} · home</span></div></div></div>`;
  el.appendChild(card);
  return true;
}
