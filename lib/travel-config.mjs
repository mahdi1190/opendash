// lib/travel-config.mjs - config.travel (travel spec 6.1, 6.4). Owner: TRIPS.
// lib/datadir.mjs validates config.json with it (unknown top-level keys are dropped there).
//
//   travel: {on, prompt, sources: {zone, calendar, bank, geo}, moments, weather,
//            holidays: {home, region, daysOff, show, online}, rates: 'own'|'online',
//            jetlag, shareWithAi, keepDays}
// Travel features are OFF until the user turns them on (decision 1, 3 Oct): one
// "Turn on travel features?" card the first time a trip or a zone abroad is seen
// (prompt:false = "Never"). Claude sees only the time zone unless shareWithAi
// (decision 4). The browser's location and the online lookups are off by default.

export const TRAVEL_DEFAULTS = Object.freeze({
  on: false, prompt: true, sources: Object.freeze({ zone: true, calendar: true, bank: true, geo: false }), moments: true, weather: true,
  holidays: Object.freeze({ home: '', region: '', daysOff: false, show: true, online: false }), rates: 'own', jetlag: true, shareWithAi: false, keepDays: 365,
  secondClock: true, bothTimes: 'auto',
});

/** config.travel with every default filled in and bad values replaced. */
export function normTravelConfig(v) {
  const t = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const s = t.sources && typeof t.sources === 'object' ? t.sources : {};
  const h = t.holidays && typeof t.holidays === 'object' ? t.holidays : {};
  const bool = (x, d) => (typeof x === 'boolean' ? x : d);
  const keep = Number(t.keepDays);
  return {
    on: t.on === true,
    prompt: bool(t.prompt, true),
    sources: { zone: bool(s.zone, true), calendar: bool(s.calendar, true), bank: bool(s.bank, true), geo: s.geo === true },
    moments: bool(t.moments, true), weather: bool(t.weather, true),
    holidays: {
      home: /^[A-Z]{2}$/.test(String(h.home || '')) ? h.home : '',
      region: /^[A-Za-z0-9-]{1,12}$/.test(String(h.region || '')) ? String(h.region) : '',
      daysOff: h.daysOff === true, show: bool(h.show, true), online: h.online === true,
    },
    rates: t.rates === 'online' ? 'online' : 'own',
    jetlag: bool(t.jetlag, true), shareWithAi: t.shareWithAi === true,
    // The surfaces (SURFACES, spec 5.1 / 5.2 / 6.4): the top-bar second clock while away, and
    // when events show both times ('auto' = while away or when the event's zone differs).
    secondClock: bool(t.secondClock, true), bothTimes: ['auto', 'always', 'off'].includes(t.bothTimes) ? t.bothTimes : 'auto',
    keepDays: Number.isFinite(keep) && keep > 0 ? Math.max(30, Math.min(3650, Math.round(keep))) : 365,
  };
}
