/* ============================================================
   CLOCK (page): window.Clock. Owner: CLOCK (travel spec 2.2, 2.4).
   The page asks Clock for "now", "today" and wall times, so the page, the
   server and the MCP agree when the computer changes time zone. The rules
   are pure, in 07-core-clock-logic.js (Node evaluates the same file).

     Clock.zone() / .home() / .system() / .follow()
                                   effective, home and system zone; follow mode
     Clock.away()                  {away, cc, homeCc, diffMin}
     Clock.now()                   ms; Clock._setNow(ms|null) for tests and screenshots
     Clock.today(z?)               'YYYY-MM-DD' in z (default: effective)
     Clock.parts(ms, z?)           {y, mo, d, h, mi, s, dow, iso, min, off}
     Clock.at(iso, min, z?)        ms of a wall time (DST gap: next valid minute; overlap: first)
     Clock.addDays(iso, n)         ISO arithmetic (no zone)
     Clock.offset(ms, z) / Clock.diff(zA, zB, ms?)
                                   minutes east of UTC / minutes zB - zA
     Clock.fmtTime(ms, {zone, h12}) / Clock.fmtDate(ms, {zone, ...Intl options})
     Clock.fmtDiff(min) / Clock.diffLabel(zA, zB, ms?)
                                   '+8 h' / '+13 h · tomorrow there'
     Clock.label(z)                'Tokyo' (the place table when there is one)
     Clock.onChange(fn) -> off     fn({kind:'zone'|'offset'|'day'|'resume', from, to, ...})
     Clock.onTick(fn) -> off       every 15 s (the one ticker; it runs with no clock widget too)
     Clock.check()                 re-read the computer's zone now (true when it changed)
     Clock.refresh()               after a setting changed: a 'zone' event if the effective zone moved
     Clock.usePlaces({ccOf, label}) the place table (travel data) plugs in here
     Clock.overrideReady           false until the display code all asks Clock (spec 2.8)

   Fast path: when the zone asked for is the computer's own (nearly always),
   parts/today/offset use the native Date getters (same answer, no cost).

   The sensor: Clock.check() reads Intl's zone and getTimezoneOffset() on the
   ticker, focus, visibilitychange, pageshow, online and Page Lifecycle resume.
   A new zone counts after two reads 2 s apart. The page's reaction (render,
   the banner, telling the server) is in 87-clock-ui.js.
   ============================================================ */
const Clock = (function () {
  const cfg = () => (typeof APP_CONFIG !== 'undefined' && APP_CONFIG) || {};
  const subs = new Set(), tickSubs = new Set();
  let fixedNow = null;
  let places = { ccOf: null, label: null };

  function readSystem() {
    let z = '';
    try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no Intl zone */ }
    return { zone: canonZone(z) || 'UTC', off: -new Date().getTimezoneOffset() };
  }
  let sys = readSystem();                 // the accepted system zone
  let pending = null;                     // {zone, at}: a new zone seen once, waiting for the second read
  let pendingTimer = null;
  let lastTick = Date.now(), ticker = null;
  let lastDay = '';
  let lastEff = '';                       // the effective zone the page last showed (refresh / tick compare with it)
  const recent = [];                      // accepted changes [{at, from, to}] (flip-back detection)

  function now() { return fixedNow != null ? fixedNow : Date.now(); }

  // The effective zone, memoised per minute and inputs (settingsSaveConfig swaps
  // APP_CONFIG.time for a new object when it changes).
  let memo = {};
  function zone() {
    const c = cfg(), mb = Math.floor(now() / 60000);
    if (memo.sz !== sys.zone || memo.home !== c.timezone || memo.time !== c.time || memo.mb !== mb) {
      memo = { sz: sys.zone, home: c.timezone, time: c.time, mb, z: effectiveZone(c, { zone: sys.zone, page: true }, now()) };
    }
    return memo.z;
  }
  function home() { return canonZone(cfg().timezone) || 'UTC'; }
  const native = (z) => z === sys.zone;

  function parts(ms, z) {
    const t = ms == null ? now() : ms;
    const zz = z ? (canonZone(z) || zone()) : zone();
    if (native(zz)) {
      const d = new Date(t);
      const y = d.getFullYear(), mo = d.getMonth() + 1, dd = d.getDate(), h = d.getHours(), mi = d.getMinutes();
      return { y, mo, d: dd, h, mi, s: d.getSeconds(), dow: d.getDay(), iso: `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, min: h * 60 + mi, off: -d.getTimezoneOffset() };
    }
    return clockPartsIn(t, zz);
  }
  function today(z) { return parts(now(), z).iso; }
  function offset(ms, z) {
    const zz = z ? (canonZone(z) || zone()) : zone();
    const t = ms == null ? now() : ms;
    return native(zz) ? -new Date(t).getTimezoneOffset() : clockOffsetIn(t, zz);
  }
  function at(iso, min, z) {
    const zz = z ? (canonZone(z) || zone()) : zone();
    let day = iso, m = Math.round(Number(min) || 0);
    if (m < 0 || m >= 1440) { const k = Math.floor(m / 1440); day = clockAddDays(iso, k); m -= k * 1440; }
    if (native(zz)) {
      const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
      if (!p) return NaN;
      const d = new Date(+p[1], +p[2] - 1, +p[3], Math.floor(m / 60), m % 60);
      // A real wall time (also the first of an overlap) comes back unchanged; a gap does not.
      if (d.getDate() === +p[3] && d.getHours() * 60 + d.getMinutes() === m) return d.getTime();
    }
    return clockAtIn(day, m, zz);
  }

  const fmtCache = new Map();
  function fmt(key, make) {
    let f = fmtCache.get(key);
    if (!f) { f = make(); if (fmtCache.size > 120) fmtCache.clear(); fmtCache.set(key, f); }
    return f;
  }
  const locale = () => cfg().locale || undefined;
  function fmtTime(ms, o) {
    const opt = o || {};
    const zz = opt.zone ? (canonZone(opt.zone) || zone()) : zone();
    // 12/24-hour: the caller's choice, else Settings (config.time.clock12), else the locale's habit.
    const c12 = cfg().time && cfg().time.clock12;
    const h12 = opt.h12 != null ? !!opt.h12 : typeof c12 === 'boolean' ? c12 : undefined;
    const loc = locale();
    try {
      return fmt(`t|${loc}|${zz}|${h12}`, () => new Intl.DateTimeFormat(loc, Object.assign({ timeZone: zz, hour: '2-digit', minute: '2-digit' }, h12 === undefined ? {} : { hour12: h12 }))).format(new Date(ms == null ? now() : ms));
    } catch (e) {
      const p = parts(ms, zz);
      return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
    }
  }
  function fmtDate(ms, o) {
    const opt = Object.assign({}, o || {});
    const zz = opt.zone ? (canonZone(opt.zone) || zone()) : zone();
    delete opt.zone;
    if (!Object.keys(opt).length) Object.assign(opt, { weekday: 'short', day: 'numeric', month: 'short' });
    const loc = locale();
    try {
      return fmt(`d|${loc}|${zz}|${JSON.stringify(opt)}`, () => new Intl.DateTimeFormat(loc, Object.assign({ timeZone: zz }, opt))).format(new Date(ms == null ? now() : ms));
    } catch (e) { return parts(ms, zz).iso; }
  }
  function label(z) {
    const zz = canonZone(z || zone()) || String(z || '');
    if (places.label) { try { const l = places.label(zz); if (l) return String(l); } catch (e) { /* table missing a zone */ } }
    return clockZoneLabel(zz);
  }

  function emit(ev) {
    for (const fn of [...subs]) { try { fn(ev); } catch (e) { console.error('[clock]', e); } }
  }
  /** Accept a new system zone (after the debounce): one 'zone' event. */
  function accept(next, reason) {
    const from = sys.zone, fromEff = lastEff || zone();
    const dayFrom = lastDay || today();
    sys = next;
    memo = {};
    const t = Date.now();
    // A zone that flips back within 10 min (fiddling with the settings) is quiet.
    const back = recent.length && recent[recent.length - 1].to === from && recent[recent.length - 1].from === next.zone && t - recent[recent.length - 1].at < 10 * 60000;
    recent.push({ at: t, from, to: next.zone });
    if (recent.length > 10) recent.shift();
    lastDay = today();
    lastEff = zone();
    emit({ kind: 'zone', from, to: next.zone, fromEffective: fromEff, toEffective: lastEff, flipBack: !!back, reason: reason || 'live', day: dayFrom !== lastDay ? { from: dayFrom, to: lastDay } : null });
  }
  /** Re-read the computer's zone. True when the accepted zone changed now. */
  function check(o) {
    const opt = o || {};
    const cur = readSystem();
    if (cur.zone === sys.zone) {
      pending = null;
      if (cur.off !== sys.off) {                 // same zone, new offset: a DST change
        const from = sys.off;
        sys = cur; memo = {};
        lastDay = today();
        emit({ kind: 'offset', from, to: cur.off });
        return true;
      }
      return false;
    }
    const t = Date.now();
    if (opt.now === true || (pending && pending.zone === cur.zone && t - pending.at >= 1900)) {
      pending = null;
      accept(cur, opt.reason);
      return true;
    }
    if (!pending || pending.zone !== cur.zone) pending = { zone: cur.zone, at: t };
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => check(), 2100);
    return false;
  }
  /** After a setting changed (home zone, follow mode): one 'zone' event if the effective zone moved. */
  function refresh(reason) {
    const before = lastEff || '';
    memo = {};
    const after = zone();
    lastEff = after;
    lastDay = today();
    if (before && before !== after) emit({ kind: 'zone', from: sys.zone, to: sys.zone, fromEffective: before, toEffective: after, flipBack: false, reason: reason || 'setting', day: null });
    return !!before && before !== after;
  }
  function tick() {
    const t = Date.now();
    const gap = t - lastTick;
    lastTick = t;
    let changed = check({ reason: gap >= 120000 ? 'resume' : 'tick' });
    // A trip's zone that ran out (config.time.trip.until passed) moves the shown zone by itself.
    if (!changed && lastEff && zone() !== lastEff) changed = refresh('trip');
    if (gap >= 120000) emit({ kind: 'resume', from: t - gap, to: t, gapMs: gap, long: gap >= 3 * 3600000 });
    const d = today();
    if (!changed && lastDay && d !== lastDay) { const from = lastDay; lastDay = d; emit({ kind: 'day', from, to: d }); }
    else lastDay = d;
    for (const fn of [...tickSubs]) { try { fn(); } catch (e) { console.error('[clock]', e); } }
  }
  /** Start the ticker and the sensor events (99-boot via clockBoot). Idempotent. */
  function start() {
    if (ticker || typeof window === 'undefined') return;
    lastDay = today(); lastTick = Date.now(); lastEff = zone();
    ticker = setInterval(tick, 15000);
    const again = () => check();
    window.addEventListener('focus', again);
    window.addEventListener('pageshow', again);
    window.addEventListener('online', again);
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => { if (!document.hidden) again(); });
      document.addEventListener('resume', () => tick());          // Page Lifecycle: the tab was frozen
    }
  }

  try { lastEff = zone(); } catch (e) { lastEff = ''; }
  return {
    zone, home, now, today, parts, at, offset, label, check, refresh, start, fmtTime, fmtDate,
    system: () => sys.zone,
    follow: () => clockFollowOf(cfg()),
    away: () => clockAway(home(), zone(), now(), places.ccOf),
    addDays: clockAddDays,
    daysBetween: clockDaysBetween,
    diff: (zA, zB, ms) => offset(ms, zB) - offset(ms, zA),
    fmtDiff: clockFmtDiff,
    diffLabel: (zA, zB, ms) => clockDiffLabel(canonZone(zA) || home(), canonZone(zB) || zone(), ms == null ? now() : ms),
    placeless: clockPlaceless,
    valid: clockValidZone,
    canon: canonZone,
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    onTick(fn) { tickSubs.add(fn); return () => tickSubs.delete(fn); },
    usePlaces(p) { places = { ccOf: p && typeof p.ccOf === 'function' ? p.ccOf : null, label: p && typeof p.label === 'function' ? p.label : null }; memo = {}; },
    hasPlaces: () => !!(places.ccOf || places.label),
    changes: () => recent.slice(),
    overrideReady: CLOCK_OVERRIDE_READY,
    _setNow(ms) {
      const from = lastDay || today();
      fixedNow = ms == null ? null : Number(ms); memo = {};
      const d = today();
      lastDay = d;
      if (d !== from) emit({ kind: 'day', from, to: d });
    },
  };
})();
if (typeof window !== 'undefined') window.Clock = Clock;

/** Settings > Clock for toLocale*String / Intl options: {hour12} when 12- or 24-hour
 *  is chosen, {} for "As the language". Spread it next to hour/minute. */
function clockH12Opt() {
  const t = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.time) || {};
  return typeof t.clock12 === 'boolean' ? { hour12: t.clock12 } : {};
}
