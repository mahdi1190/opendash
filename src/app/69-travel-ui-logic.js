/* ============================================================
   TRAVEL SURFACES, pure rules. Owner: SURFACES (travel spec 5.1, 5.2, 5.5, 6.4).
   User request, 3 Oct: "make sure we track the timezone, and we can make
   recommendations based off the location and country and timezone ... and we
   can have fun popups based on the country or location etc if they are travelling".
   No DOM and no page globals except the optional place helpers (trFlagHtml ...,
   feature-detected). tests/travel-surfaces.test.mjs evaluates this file with
   lib/travel-logic.mjs (07 clock logic + 69 travel logic), so it may use
   clockPartsIn / clockOffsetIn / clockFmtDiff / trWall / trTheirTime.

     trUiCfg(travel)                     config.travel's surface switches with defaults:
                                         {on, secondClock, bothTimes 'auto'|'always'|'off', prompt}
     trUiChip(snap, o)                   the top-bar chip's model (5.1): null, or
                                         {mode 'away'|'layover'|'domestic'|'depart', key, zone, cc, cityId,
                                          label, homeZone, homeLabel, local {h, mi, iso}, home {h, mi, iso},
                                          diffMin, line?, leg?, inMin?, leaveBy?}
     trUiCountdown(min)                  '2 h 05', '45 min', '1 d 3 h'
     trUiArc(h)                          {x, y, night}: the sun / moon on the chip's day arc (0-24 h)
     trUiDiff(zA, zB, ms)                '+8 h', '−5 h 30', 'Same time as home', '+13 h · tomorrow there'
     trUiTripWhen(trip, today)           'Tokyo in 2 days' / 'day 2 of 6 · back Fri 9 Oct' / 'Back home' / ...
     trUiRange(from, to)                 '4–9 Oct', '28 Sep – 3 Oct'
     trUiTimeline(trip, o)               the Trip view's and widget's days in local time:
                                         [{date, label, today, items [{kind 'leg'|'event'|'task', id, min|null,
                                          time, title, sub, home, scene, done}]}]
     trUiTripTasks(trip, tasks)          the trip's tasks, dated ones only near the trip
     trUiSpend(spending, homeCcy)        {lines [{ccy, orig, home, n}], homeOnly, fees, total, any}
     trUiOptIn(snap, cfg, seen)          the "Turn on travel features?" card: {key, reason, title, text} | null
     trUiTheirTime(m, o)                 the event card's third line (5.2): {text, warn, who, zone} | null
     trUiTripHolidays(trip, list)        holidays on the trip's days [{date, name, estimated}]
     trUiWidgetMode(snap)                'away' | 'before' | 'back' | 'idle' and the trip it is about
   ============================================================ */

const TRU_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TRU_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _truPad = (n) => String(n).padStart(2, '0');
function _truHM(min) { const m = ((Math.round(Number(min) || 0) % 1440) + 1440) % 1440; return _truPad(Math.floor(m / 60)) + ':' + _truPad(m % 60); }
function _truDow(iso) { const [y, m, d] = String(iso || '').split('-').map(Number); return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay(); }
/** 'Fri 9 Oct'. */
function trUiDate(iso) {
  const [, m, d] = String(iso || '').split('-').map(Number);
  return m ? `${TRU_DAYS[_truDow(iso)]} ${d} ${TRU_MONTHS[m - 1]}` : '';
}
function _truLabelOf(zone) { return typeof trZoneLabel === 'function' ? trZoneLabel(zone) : typeof clockZoneLabel === 'function' ? clockZoneLabel(zone) : String(zone || ''); }

/** config.travel's switches the surfaces read, with their defaults. */
function trUiCfg(t) {
  const v = t && typeof t === 'object' ? t : {};
  return {
    on: v.on === true, prompt: v.prompt !== false, secondClock: v.secondClock !== false,
    bothTimes: ['auto', 'always', 'off'].includes(v.bothTimes) ? v.bothTimes : 'auto',
  };
}

/** '2 h 05', '45 min', '1 d 3 h'. */
function trUiCountdown(min) {
  const v = Math.max(0, Math.round(Number(min) || 0));
  if (v < 60) return `${v} min`;
  if (v < 24 * 60) return `${Math.floor(v / 60)} h ${_truPad(v % 60)}`;
  const d = Math.floor(v / 1440), h = Math.floor((v % 1440) / 60);
  return `${d} d${h ? ' ' + h + ' h' : ''}`;
}
/** The sun or moon on the chip's little day arc: x 2..22, y 12 (horizon) .. 3 (noon); night = the moon. */
function trUiArc(h) {
  const hr = ((Number(h) || 0) % 24 + 24) % 24;
  const night = hr < 6 || hr >= 20;
  // Day: 06 -> 20 across; night: 20 -> 06 across.
  const t = night ? ((hr >= 20 ? hr - 20 : hr + 4) / 10) : (hr - 6) / 14;
  const x = 2 + 20 * t;
  const y = 12 - 9 * Math.sin(Math.PI * t);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, night };
}
/** The difference of zB against zA: '+8 h', 'Same time as home', '+13 h · tomorrow there'. */
function trUiDiff(zA, zB, ms) {
  if (typeof clockDiffLabel === 'function') return clockDiffLabel(zA, zB, ms);
  const min = clockOffsetIn(ms, zB) - clockOffsetIn(ms, zA);
  return clockFmtDiff(min);
}
/** '4–9 Oct', '28 Sep – 3 Oct', '4 Oct'. */
function trUiRange(from, to) {
  const [, m1, d1] = String(from || '').split('-').map(Number);
  if (!m1) return '';
  if (!to || to === from) return `${d1} ${TRU_MONTHS[m1 - 1]}`;
  const [, m2, d2] = String(to).split('-').map(Number);
  return m1 === m2 ? `${d1}–${d2} ${TRU_MONTHS[m2 - 1]}` : `${d1} ${TRU_MONTHS[m1 - 1]} – ${d2} ${TRU_MONTHS[m2 - 1]}`;
}
function _truTripLabel(t) { return (t && (t.label || (t.dest && (t.dest.label || t.dest.name)))) || 'Trip'; }
/** One line for a trip: before, during, after. */
function trUiTripWhen(trip, today) {
  if (!trip) return '';
  const label = _truTripLabel(trip);
  const n = clockDaysBetween(today, trip.from);
  if (trip.status === 'planned' || trip.status === 'departing' || n > 0) {
    if (n <= 0) return `${label} today`;
    return n === 1 ? `${label} tomorrow` : `${label} in ${n} days`;
  }
  if (trip.status === 'away' || trip.status === 'returning') {
    const day = clockDaysBetween(trip.from, today) + 1;
    const of = trip.to ? clockDaysBetween(trip.from, trip.to) + 1 : 0;
    return `day ${day}${of ? ' of ' + of : ''}${trip.to ? ' · back ' + trUiDate(trip.to) : ''}`;
  }
  if (trip.status === 'home') return 'Back home';
  return trUiRange(trip.from, trip.to);
}

/**
 * The top-bar chip (5.1): while away (local time and home time), on a layover, after a domestic
 * arrival, or in the 24 h before a leg (a departure pill). snap = trSnapshot(); o: {now, cfg (trUiCfg)}.
 */
function trUiChip(snap, o) {
  o = o || {};
  const cfg = o.cfg || trUiCfg({ on: snap && snap.on });
  if (!snap || !snap.on || !cfg.on || !cfg.secondClock || snap.pending) return null;
  const now = Number.isFinite(o.now) ? o.now : snap.now;
  const home = snap.home || {};
  const homeZone = home.zone || snap.zone;
  const w = snap.where || {};
  const trip = snap.trip || null;
  const base = (mode, zone, place) => {
    const lp = clockPartsIn(now, zone), hp = clockPartsIn(now, homeZone);
    return {
      mode, zone, cc: (place && place.cc) || '', cityId: (place && place.cityId) || '', label: (place && (place.label || place.name)) || _truLabelOf(zone),
      homeZone, homeLabel: home.label || _truLabelOf(homeZone), local: { h: lp.h, mi: lp.mi, iso: lp.iso }, home: { h: hp.h, mi: hp.mi, iso: hp.iso },
      diffMin: clockOffsetIn(now, zone) - clockOffsetIn(now, homeZone), tripId: trip ? trip.id : '',
    };
  };
  const zoneOf = (pl) => (pl && pl.zone) || (trip && trip.dest && trip.dest.cc === (pl && pl.cc) && trip.dest.zone) || snap.zone;
  if (w.layover && w.layover.place) {
    const pl = w.layover.place, z = zoneOf(pl);
    const b = base('layover', z, pl);
    const next = w.layover.next;
    b.key = 'layover:' + (next ? next.eventId : pl.cityId || pl.cc);
    b.line = `Layover in ${b.label}` + (next ? ` · next ${next.code || 'leg'} ${_truHM(clockPartsIn(next.depart, z).min)}` : '');
    return b;
  }
  if (w.away && w.place && w.place.cc) {
    const z = zoneOf(w.place);
    const b = base('away', z, w.place);
    b.key = 'away:' + b.cc + ':' + z;
    return b;
  }
  // The 24 h before a leg: "2 h 05 to BA 7 · leave by 05:05".
  const leg = (snap.legs || []).filter(l => l.depart > now && l.depart - now <= 24 * 3600000).sort((a, b) => a.depart - b.depart)[0];
  if (leg) {
    const b = base('depart', snap.zone, leg.to || null);
    b.key = 'depart:' + leg.eventId;
    b.leg = { eventId: leg.eventId, code: leg.code || '', mode: leg.mode, to: (leg.to && (leg.to.label || leg.to.name)) || '' };
    b.inMin = Math.round((leg.depart - now) / 60000);
    const lv = leg.leave && Number.isFinite(leg.leave.leave) ? leg.leave.leave : null;
    b.leaveBy = lv && lv > now ? _truHM(clockPartsIn(lv, snap.zone).min) : '';
    b.line = `${trUiCountdown(b.inMin)} to ${b.leg.code || b.leg.to || 'your ' + (leg.mode === 'flight' ? 'flight' : 'train')}` + (b.leaveBy ? ` · leave by ${b.leaveBy}` : '');
    return b;
  }
  if (w.domestic && w.place && w.place.cityId) {
    const b = base('domestic', snap.zone, w.place);
    b.key = 'domestic:' + w.place.cityId;
    b.line = `You're in ${b.label}`;
    return b;
  }
  return null;
}

/**
 * A trip's days in local time (the destination's zone; before it starts, too), each with its legs,
 * events and tasks. o: {events (Google shape), tasks [{id, title, due, dueTime, planned, plannedTime,
 * done}], zone (the dashboard's), homeZone, now, scene(ev|task) -> type}.
 */
function trUiTimeline(trip, o) {
  o = o || {};
  if (!trip || !trip.from) return [];
  const destZone = (trip.dest && trip.dest.zone) || o.zone || 'UTC';
  const homeZone = o.homeZone || o.zone || destZone;
  const from = trip.from;
  const to = trip.to || (Number.isFinite(o.now) ? clockPartsIn(o.now, destZone).iso : from);
  const days = new Map();
  const dayOf = (iso) => {
    if (!days.has(iso)) days.set(iso, { date: iso, label: trUiDate(iso), items: [] });
    return days.get(iso);
  };
  for (let d = from, i = 0; d <= to && i < 60; d = clockAddDays(d, 1), i++) dayOf(d);
  const legIds = new Set((trip.legs || []).map(l => l.eventId));
  const evIds = new Set([...(trip.groupEvents || []), ...(trip.events || []), ...legIds]);
  const scene = typeof o.scene === 'function' ? o.scene : () => '';
  for (const l of trip.legs || []) {
    const dz = l.departZone || homeZone;
    const p = clockPartsIn(l.depart, dz), a = clockPartsIn(l.arrive, l.arriveZone || destZone);
    const day = dayOf(p.iso);
    const arrivesHome = l.to && trip.dest && l.to.cc !== trip.dest.cc;
    day.items.push({ kind: 'leg', id: l.eventId, min: p.min, time: _truHM(p.min), title: `${l.code ? l.code + ' · ' : ''}${(l.from && (l.from.label || l.from.name)) || ''}${l.from ? ' → ' : 'To '}${(l.to && (l.to.label || l.to.name)) || ''}`,
      // A leg keeps its own local times: it leaves in its departure zone and lands in its arrival zone.
      sub: `leaves ${_truHM(p.min)} ${_truLabelOf(dz)} · lands ${_truHM(a.min)}${a.iso !== p.iso ? ' ' + trUiDate(a.iso) : ''} ${_truLabelOf(l.arriveZone || destZone)}`, home: '', scene: l.mode === 'flight' ? 'flight' : l.mode === 'coach' ? 'car' : 'train', leg: true, back: !!arrivesHome });
  }
  const declined = (ev) => ev.status === 'cancelled' || (Array.isArray(ev.attendees) && ev.attendees.some(a => a && a.self && (a.responseStatus === 'declined' || a.response === 'declined')));
  for (const ev of o.events || []) {
    if (!ev || !ev.id || legIds.has(ev.id) || !ev.start || declined(ev)) continue;
    // The trip's own events, and every timed event on its days (a meeting at home is worth seeing in local time).
    if (!evIds.has(ev.id) && !ev.start.dateTime) continue;
    if (ev.start.date && !ev.start.dateTime) {
      const d = String(ev.start.date).slice(0, 10);
      const endEx = ev.end && ev.end.date ? String(ev.end.date).slice(0, 10) : clockAddDays(d, 1);
      const first = d < from ? from : d;
      const day = days.get(first);
      if (day) day.items.push({ kind: 'event', id: ev.id, min: null, time: clockDaysBetween(d, endEx) > 1 ? `${TRU_DAYS[_truDow(first)]}–${TRU_DAYS[_truDow(clockAddDays(endEx, -1))]}` : 'All day', title: String(ev.summary || 'Event'), sub: ev.location ? String(ev.location).split(',')[0] : '', home: '', scene: scene(ev) });
      continue;
    }
    const s = Date.parse(ev.start.dateTime);
    if (!Number.isFinite(s)) continue;
    // Not the trip's own: only while away (after the outbound leg leaves, before the way back lands).
    if (!evIds.has(ev.id) && ((Number.isFinite(trip.start) && s < trip.start) || (Number.isFinite(trip.end) && s > trip.end))) continue;
    const p = clockPartsIn(s, destZone);
    const day = days.get(p.iso);
    if (!day) continue;
    const hp = clockPartsIn(s, homeZone);
    const meeting = Array.isArray(ev.attendees) && ev.attendees.some(a => a && !a.self && !a.resource);
    day.items.push({ kind: 'event', id: ev.id, min: p.min, time: _truHM(p.min), title: String(ev.summary || 'Event'), sub: ev.location ? String(ev.location).split(',')[0] : '',
      home: meeting && homeZone !== destZone && clockOffsetIn(s, homeZone) !== clockOffsetIn(s, destZone) ? `${_truHM(hp.min)} ${_truLabelOf(homeZone)}` : '', scene: scene(ev) });
  }
  for (const t of trUiTripTasks(trip, o.tasks)) {
    const when = t.planned || t.due || '';
    const d = when && when >= from && when <= to ? when : from;
    const tm = t.plannedTime || t.dueTime || '';
    const min = /^\d{2}:\d{2}$/.test(tm) ? Number(tm.slice(0, 2)) * 60 + Number(tm.slice(3)) : null;
    dayOf(d).items.push({ kind: 'task', id: t.id, min, time: min === null ? '' : tm, title: String(t.title || 'Task'), sub: when && when < from ? 'before you go' : '', home: '', scene: scene(t), done: !!t.done });
  }
  const today = Number.isFinite(o.now) ? clockPartsIn(o.now, destZone).iso : '';
  return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map(d => {
    d.items.sort((a, b) => ((a.min === null ? -1 : a.min) - (b.min === null ? -1 : b.min)) || (a.kind === 'leg' ? -1 : 0));
    d.today = d.date === today;
    return d;
  });
}

/**
 * A trip's tasks for its timeline and counts: trGroup's (linked, tagged, named), but a dated one only
 * when its date is near the trip (from a week before to the last day), so a task tagged "trip" for
 * another trip stays with that one.
 */
function trUiTripTasks(trip, tasks) {
  if (!trip || !trip.from) return [];
  const ids = new Set(trip.tasks || []);
  const lo = clockAddDays(trip.from, -7), hi = trip.to || clockAddDays(trip.from, 30);
  return (tasks || []).filter(t => t && ids.has(t.id) && (() => { const w = t.planned || t.due || ''; return !w || (w >= lo && w <= hi); })());
}

/** Spending by currency for the Trip view and widget: {lines, homeOnly, fees, total, any}. */
function trUiSpend(sp, homeCcy) {
  const s = sp && typeof sp === 'object' ? sp : {};
  const lines = Object.entries(s.byCcy || {}).filter(([ccy]) => ccy && ccy !== homeCcy).map(([ccy, b]) => ({ ccy, orig: Number(b.orig) || 0, home: Number(b.home) || 0, n: Number(b.n) || 0 }))
    .sort((a, b) => b.home - a.home);
  const sameCcy = s.byCcy && homeCcy && s.byCcy[homeCcy] ? Number(s.byCcy[homeCcy].home) || 0 : 0;
  const homeOnly = Math.round(((Number(s.homeOnly) || 0) + sameCcy) * 100) / 100;
  const fees = Number(s.fees) || 0;
  const total = Number(s.total) || Math.round((lines.reduce((a, l) => a + l.home, 0) + homeOnly + fees) * 100) / 100;
  return { lines, homeOnly, fees, total, any: !!(lines.length || homeOnly || fees) };
}

/**
 * The opt-in card (6.4): travel off, prompts allowed, a trip abroad soon or a zone abroad, and not
 * put off for this trip ("Not now" asks again on the next trip). seen: {key: true} answered keys.
 */
function trUiOptIn(snap, cfg, seen) {
  const c = cfg || {};
  if (!snap || c.on || c.prompt === false || !snap.optIn) return null;
  const oi = snap.optIn;
  const trip = (snap.trips || []).find(t => t.intl && !t.candidate && ['planned', 'departing', 'away', 'returning'].includes(t.status)) || null;
  const key = oi.reason === 'zone' ? 'zone:' + (snap.system && snap.system.zone || snap.zone) : 'trip:' + (trip ? trip.id : oi.label || 'x');
  if (seen && seen[key]) return null;
  const where = oi.label || (trip && _truTripLabel(trip)) || '';
  const title = 'Turn on travel features?';
  const text = oi.reason === 'zone'
    ? `This computer is on ${where ? where + ' ' : 'another country\'s '}time. Travel features show local time, weather, holidays and tips; everything stays on this computer.`
    : `${where ? 'A trip to ' + where : 'A trip'}${trip && trip.from ? ', ' + trUiRange(trip.from, trip.to) : ''}, is in your calendar. Travel features show local time, weather, holidays and tips; everything stays on this computer.`;
  return { key, reason: oi.reason, title, text, tripId: trip ? trip.id : '' };
}

/**
 * The event card's "their time" line (5.2): the first matched person with a zone, or the organiser
 * of an event set in another zone. m: {start, end (ms), zone, organizerSelf, organizer, attendees},
 * o: {myZone, people: Map(email -> {id, name, first, tz}), now}.
 * -> {text, warn, verdict, who, zone, min} | null
 */
function trUiTheirTime(m, o) {
  if (!m || !Number.isFinite(m.start) || typeof trTheirTime !== 'function') return null;
  const tt = trTheirTime({ eventId: m.eventId || '', title: m.title || '', start: m.start, end: m.end, zone: m.zone, organizerSelf: !!m.organizerSelf, organizer: m.organizer, attendees: m.attendees || [] },
    { myZone: o.myZone, people: o.people || new Map(), now: o.now, busy: [] });
  const p = (tt.their || []).find(x => x.unsocial) || (tt.their || [])[0];
  if (!p) return null;
  if (clockOffsetIn(m.start, p.zone) === clockOffsetIn(m.start, o.myZone)) return null;   // same time as yours: nothing to say
  const mine = clockPartsIn(m.start, o.myZone);
  const who = p.first || p.name || 'them';
  const where = _truLabelOf(p.zone);
  const theirDay = p.date !== mine.iso ? ' ' + TRU_DAYS[_truDow(p.date)] : '';
  const meBad = mine.min < 7 * 60 || mine.min >= 22 * 60;
  const text = `Your ${_truHM(mine.min)} call is ${_truHM(p.min)}${theirDay} for ${who} in ${where}.`;
  const verdict = p.unsocial ? `That is outside 07:00–21:00 for ${who}.` : meBad ? 'It is outside 07:00–22:00 for you.' : `${_truHM(mine.min)} suits you; nothing to change.`;
  return { text, verdict, warn: !!(p.unsocial || meBad), who, zone: p.zone, min: p.min, personId: p.personId || '' };
}

/** The holidays that fall on a trip's days (the destination's list). */
function trUiTripHolidays(trip, list) {
  if (!trip || !trip.from) return [];
  const to = trip.to || clockAddDays(trip.from, 14);
  return (list || []).filter(h => h && h.date >= trip.from && h.date <= to).map(h => ({ date: h.date, name: String(h.name || 'Public holiday'), estimated: !!h.estimated }));
}

/** What the Home widget shows: during a trip, before one (14 days), just back, or nothing. */
function trUiWidgetMode(snap) {
  if (!snap || !snap.on || !Array.isArray(snap.trips)) return { mode: 'idle', trip: null };
  const live = (snap.trips || []).filter(t => !t.candidate);
  const away = live.find(t => ['away', 'returning'].includes(t.status));
  if (away) return { mode: 'away', trip: away };
  const soon = live.find(t => ['planned', 'departing'].includes(t.status) && clockDaysBetween(snap.today, t.from) <= 14);
  if (soon) return { mode: 'before', trip: soon };
  const back = live.find(t => t.status === 'home');
  if (back) return { mode: 'back', trip: back };
  if (snap.where && snap.where.away) return { mode: 'away', trip: null };
  return { mode: 'idle', trip: null };
}
