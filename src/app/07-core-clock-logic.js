/* ============================================================
   CLOCK LOGIC (pure). Owner: CLOCK (travel spec 2.1-2.2).
   The one time resolver for the page, the server and the MCP. No DOM and
   no page globals: lib/clock.mjs evaluates this same file in Node, so the
   page, the server and get_context always agree on which zone "today" is in.

   Three zones:
     effective  the zone "today", due labels, wall times and greetings use
     home       config.timezone: where the user lives (finance, "Welcome home")
     system     the computer's own zone (the page reads it and tells the server)

     effectiveZone(cfg, sys, now)  cfg = {timezone, time:{follow, zone?, trip?}},
                                   sys = {zone, page?}; follows the computer by default
     canonZone(z)                  canonical IANA id ('' when invalid); aliases folded
     clockPlaceless(z)             UTC / Etc/* zones: time, never a place or a trip
     clockPartsIn(ms, z)           {y, mo, d, h, mi, s, dow, iso, min, off}
     clockTodayIn(z, ms)           'YYYY-MM-DD'
     clockOffsetIn(ms, z)          minutes east of UTC
     clockAtIn(iso, min, z)        ms of a wall time (DST gap: the next valid minute;
                                   overlap: the first)
     clockAddDays(iso, n)          ISO arithmetic, no zone
     clockDiffMin(zA, zB, ms)      minutes zB - zA
     clockFmtDiff(min)             '+8 h', '−5 h 30', 'Same time as home'
     clockDiffLabel(zA, zB, ms)    the same plus ' · tomorrow there' when the date differs
     clockZoneLabel(z)             'Tokyo', 'New York', 'UTC+9'
     clockAway(home, eff, ms, ccOf) {away, cc, homeCc, diffMin}
   ============================================================ */

// Spec 2.8: the dashboard can show a zone other than the computer's only when
// every display path asks Clock. tests/clock-audit.test.mjs keeps this equal to
// "every display file is at 0" (tools/clock-audit.mjs).
const CLOCK_OVERRIDE_READY = true;   // SWEEP: the display list reached 0 (3 Oct)
const CLOCK_FOLLOW_MODES = Object.freeze(['system', 'home', 'zone']);

// Old and renamed zone ids, so a rename never looks like a trip.
const CLOCK_ZONE_ALIASES = Object.freeze({
  'Asia/Calcutta': 'Asia/Kolkata', 'Europe/Kiev': 'Europe/Kyiv', 'Europe/Uzhgorod': 'Europe/Kyiv', 'Europe/Zaporozhye': 'Europe/Kyiv',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Katmandu': 'Asia/Kathmandu', 'Asia/Rangoon': 'Asia/Yangon', 'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Thimbu': 'Asia/Thimphu', 'Asia/Ulan_Bator': 'Asia/Ulaanbaatar', 'Asia/Ujung_Pandang': 'Asia/Makassar', 'Asia/Macao': 'Asia/Macau',
  'Asia/Chongqing': 'Asia/Shanghai', 'Asia/Chungking': 'Asia/Shanghai', 'Asia/Harbin': 'Asia/Shanghai', 'PRC': 'Asia/Shanghai',
  'Asia/Kashgar': 'Asia/Urumqi', 'Asia/Tel_Aviv': 'Asia/Jerusalem', 'Israel': 'Asia/Jerusalem', 'Asia/Istanbul': 'Europe/Istanbul',
  'Turkey': 'Europe/Istanbul', 'Iran': 'Asia/Tehran', 'Egypt': 'Africa/Cairo', 'Libya': 'Africa/Tripoli', 'Japan': 'Asia/Tokyo',
  'ROK': 'Asia/Seoul', 'ROC': 'Asia/Taipei', 'Singapore': 'Asia/Singapore', 'Hongkong': 'Asia/Hong_Kong',
  'GB': 'Europe/London', 'GB-Eire': 'Europe/London', 'Europe/Belfast': 'Europe/London', 'Eire': 'Europe/Dublin',
  'Poland': 'Europe/Warsaw', 'Portugal': 'Europe/Lisbon', 'Iceland': 'Atlantic/Reykjavik', 'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Europe/Nicosia': 'Asia/Nicosia', 'Arctic/Longyearbyen': 'Europe/Oslo', 'Atlantic/Jan_Mayen': 'Europe/Oslo',
  'America/Godthab': 'America/Nuuk', 'America/Buenos_Aires': 'America/Argentina/Buenos_Aires', 'America/Montreal': 'America/Toronto',
  'America/Indianapolis': 'America/Indiana/Indianapolis', 'America/Fort_Wayne': 'America/Indiana/Indianapolis',
  'America/Louisville': 'America/Kentucky/Louisville', 'America/Knox_IN': 'America/Indiana/Knox', 'Navajo': 'America/Denver',
  'US/Eastern': 'America/New_York', 'US/Central': 'America/Chicago', 'US/Mountain': 'America/Denver', 'US/Pacific': 'America/Los_Angeles',
  'US/Alaska': 'America/Anchorage', 'US/Hawaii': 'Pacific/Honolulu', 'US/Arizona': 'America/Phoenix', 'US/Michigan': 'America/Detroit',
  'US/East-Indiana': 'America/Indiana/Indianapolis', 'US/Aleutian': 'America/Adak', 'US/Samoa': 'Pacific/Pago_Pago',
  'Canada/Eastern': 'America/Toronto', 'Canada/Central': 'America/Winnipeg', 'Canada/Mountain': 'America/Edmonton',
  'Canada/Pacific': 'America/Vancouver', 'Canada/Atlantic': 'America/Halifax', 'Canada/Newfoundland': 'America/St_Johns',
  'Canada/Saskatchewan': 'America/Regina', 'Mexico/General': 'America/Mexico_City', 'Brazil/East': 'America/Sao_Paulo',
  'Chile/Continental': 'America/Santiago', 'Cuba': 'America/Havana', 'Jamaica': 'America/Jamaica',
  'Australia/ACT': 'Australia/Sydney', 'Australia/NSW': 'Australia/Sydney', 'Australia/Canberra': 'Australia/Sydney',
  'Australia/Victoria': 'Australia/Melbourne', 'Australia/Queensland': 'Australia/Brisbane', 'Australia/West': 'Australia/Perth',
  'Australia/South': 'Australia/Adelaide', 'Australia/North': 'Australia/Darwin', 'Australia/Tasmania': 'Australia/Hobart',
  'NZ': 'Pacific/Auckland', 'NZ-CHAT': 'Pacific/Chatham', 'Pacific/Truk': 'Pacific/Chuuk', 'Pacific/Yap': 'Pacific/Chuuk',
  'Pacific/Ponape': 'Pacific/Pohnpei', 'Pacific/Samoa': 'Pacific/Pago_Pago', 'Pacific/Enderbury': 'Pacific/Kanton',
  'Africa/Asmera': 'Africa/Asmara', 'Africa/Timbuktu': 'Africa/Bamako', 'Kwajalein': 'Pacific/Kwajalein',
  'UTC': 'UTC', 'Etc/UTC': 'UTC', 'Etc/UCT': 'UTC', 'UCT': 'UTC', 'Etc/Universal': 'UTC', 'Universal': 'UTC', 'Etc/Zulu': 'UTC', 'Zulu': 'UTC',
  'GMT': 'Etc/GMT', 'Etc/GMT0': 'Etc/GMT', 'Etc/GMT+0': 'Etc/GMT', 'Etc/GMT-0': 'Etc/GMT', 'GMT0': 'Etc/GMT', 'GMT+0': 'Etc/GMT',
  'GMT-0': 'Etc/GMT', 'Etc/Greenwich': 'Etc/GMT', 'Greenwich': 'Etc/GMT',
});

const _clkValid = new Map();
/** True when Intl knows the zone id (cached). */
function clockValidZone(z) {
  if (typeof z !== 'string' || !z || z.length > 64) return false;
  let ok = _clkValid.get(z);
  if (ok === undefined) {
    try { ok = new Intl.DateTimeFormat('en-US', { timeZone: z }).resolvedOptions().timeZone || ''; } catch (e) { ok = ''; }
    if (_clkValid.size > 500) _clkValid.clear();
    _clkValid.set(z, ok);
  }
  return !!ok;
}
/** The canonical id for a zone ('' when Intl does not know it): case fixed, aliases folded. */
function canonZone(z) {
  if (!clockValidZone(z)) return '';
  const r = _clkValid.get(z);
  return CLOCK_ZONE_ALIASES[r] || CLOCK_ZONE_ALIASES[z] || r;
}
/** UTC and Etc/* zones: used for time, never a place (they never start a trip). */
function clockPlaceless(z) {
  const c = canonZone(z) || String(z || '');
  return c === 'UTC' || /^Etc\//.test(c) || /^(GMT|UCT|Universal|Zulu)/.test(c);
}

/**
 * The zone the dashboard shows. cfg = config.json ({timezone (home), time}),
 * sys = {zone: the computer's zone, page: true when the page asks}.
 * Default: follow the computer. The override (time.follow 'home' | 'zone', or a
 * trip zone) applies only once CLOCK_OVERRIDE_READY; until then one exception:
 * a computer left on UTC/Etc while the user chose home time keeps home time on
 * the server (spec 2.5, case 7), and the page keeps the computer's.
 */
function effectiveZone(cfg, sys, now) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  const home = canonZone(c.timezone) || 'UTC';
  const t = c.time && typeof c.time === 'object' ? c.time : {};
  const sz = canonZone(sys && sys.zone);
  if (CLOCK_OVERRIDE_READY) {
    if (t.follow === 'home') return home;
    if (t.follow === 'zone' && canonZone(t.zone)) return canonZone(t.zone);
    const tz = t.trip && canonZone(t.trip.zone);
    if (tz && typeof t.trip.until === 'string' && t.trip.until >= clockTodayIn(tz, now == null ? Date.now() : now)) return tz;
  } else if (t.follow === 'home' && sz && clockPlaceless(sz) && !(sys && sys.page)) {
    return home;
  }
  return sz || home;
}
/** The follow mode in force: 'system' until the override is ready (spec 2.1). */
function clockFollowOf(cfg) {
  const f = cfg && cfg.time && cfg.time.follow;
  if (!CLOCK_OVERRIDE_READY || !CLOCK_FOLLOW_MODES.includes(f)) return 'system';
  return f;
}

// ─── Zone maths ─────────────────────────────────────────────────────────────
const _clkDtf = new Map();
function _clkFmt(zone) {
  let f = _clkDtf.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    if (_clkDtf.size > 200) _clkDtf.clear();
    _clkDtf.set(zone, f);
  }
  return f;
}
/** Minutes east of UTC, straight from Intl (no cache). */
function _clkRawOffset(ms, zone) {
  const p = {};
  for (const x of _clkFmt(zone).formatToParts(new Date(ms))) p[x.type] = x.value;
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}
// Offsets cached per zone and UTC hour: an hour whose two ends agree has one
// offset throughout (no zone changes twice in an hour); one that straddles a
// change is read exactly, every time.
const _clkOff = new Map();
/** Minutes east of UTC that `zone` is at instant `ms`. */
function clockOffsetIn(ms, zone) {
  if (!Number.isFinite(ms)) return 0;
  if (zone === 'UTC' || zone === 'Etc/UTC' || zone === 'Etc/GMT') return 0;
  const hr = Math.floor(ms / 3600000);
  const key = zone + '|' + hr;
  let v = _clkOff.get(key);
  if (v === undefined) {
    const a = _clkRawOffset(hr * 3600000, zone), b = _clkRawOffset(hr * 3600000 + 3599000, zone);
    v = a === b ? a : null;
    if (_clkOff.size > 5000) _clkOff.clear();
    _clkOff.set(key, v);
  }
  return v === null ? _clkRawOffset(ms, zone) : v;
}
const _clkPad = (n, l) => String(n).padStart(l || 2, '0');
/** The wall clock in `zone` at `ms`: {y, mo, d, h, mi, s, dow (0 = Sunday), iso, min (since midnight), off}. */
function clockPartsIn(ms, zone) {
  const off = clockOffsetIn(ms, zone);
  const t = new Date(Math.floor(ms / 1000) * 1000 + off * 60000);
  const y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1, d = t.getUTCDate(), h = t.getUTCHours(), mi = t.getUTCMinutes();
  return { y, mo, d, h, mi, s: t.getUTCSeconds(), dow: t.getUTCDay(), iso: `${_clkPad(y, 4)}-${_clkPad(mo)}-${_clkPad(d)}`, min: h * 60 + mi, off };
}
/** 'YYYY-MM-DD' in `zone` at `ms` (default now). */
function clockTodayIn(zone, ms) {
  return clockPartsIn(ms == null ? Date.now() : ms, zone).iso;
}
/**
 * The instant of wall time `min` minutes after midnight on `iso` in `zone`.
 * A time in a spring-forward gap gives the next valid minute (the change
 * itself); one in an autumn overlap gives the first (earlier) instant.
 */
function clockAtIn(iso, min, zone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return NaN;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3]) + Math.round((Number(min) || 0) * 60000);
  const offs = [...new Set([clockOffsetIn(guess - 86400000, zone), clockOffsetIn(guess, zone), clockOffsetIn(guess + 86400000, zone)])];
  let best = null;
  for (const o of offs) {
    const t = guess - o * 60000;
    if (clockOffsetIn(t, zone) === o && (best === null || t < best)) best = t;
  }
  if (best !== null) return best;
  // A gap: search between the two readings for the first minute on the new offset.
  let lo = guess - Math.max(...offs) * 60000, hi = guess - Math.min(...offs) * 60000;
  const after = _clkRawOffset(hi, zone);
  for (let i = 0; i < 40 && hi - lo > 60000; i++) {
    const mid = lo + Math.floor((hi - lo) / 120000) * 60000;
    if (mid <= lo) break;
    if (_clkRawOffset(mid, zone) === after) hi = mid; else lo = mid;
  }
  return hi;
}
/** ISO date arithmetic (no zone). */
function clockAddDays(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return iso;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (Number(n) || 0)));
  return `${_clkPad(t.getUTCFullYear(), 4)}-${_clkPad(t.getUTCMonth() + 1)}-${_clkPad(t.getUTCDate())}`;
}
/** Days from ISO a to ISO b. */
function clockDaysBetween(a, b) {
  const p = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  return Math.round((p(b) - p(a)) / 86400000);
}
/** Minutes zB - zA at `ms` (Tokyo vs London in summer: +480). */
function clockDiffMin(zA, zB, ms) {
  const t = ms == null ? Date.now() : ms;
  return clockOffsetIn(t, zB) - clockOffsetIn(t, zA);
}
/** '+8 h', '−5 h 30', '+45 min', 'Same time as home'. */
function clockFmtDiff(min) {
  const v = Math.round(Number(min) || 0);
  if (!v) return 'Same time as home';
  const a = Math.abs(v), h = Math.floor(a / 60), m = a % 60;
  return (v > 0 ? '+' : '−') + (h ? `${h} h${m ? ' ' + m : ''}` : `${m} min`);
}
/** fmtDiff of zB against zA, plus the day when the dates differ: '+13 h · tomorrow there'. */
function clockDiffLabel(zA, zB, ms) {
  const t = ms == null ? Date.now() : ms;
  const min = clockDiffMin(zA, zB, t);
  const dd = clockDaysBetween(clockTodayIn(zA, t), clockTodayIn(zB, t));
  return clockFmtDiff(min) + (dd > 0 ? ' · tomorrow there' : dd < 0 ? ' · yesterday there' : '');
}
/** A short name for a zone without a place table: 'Tokyo', 'New York', 'UTC', 'UTC+9'. */
function clockZoneLabel(z) {
  const c = canonZone(z) || String(z || '');
  if (!c) return '';
  if (c === 'UTC' || c === 'Etc/GMT') return 'UTC';
  const etc = /^Etc\/GMT([+-])(\d{1,2})$/.exec(c);
  if (etc) return `UTC${etc[1] === '+' ? '−' : '+'}${Number(etc[2])}`;   // Etc/GMT-9 is UTC+9
  const last = c.split('/').pop();
  return last.replace(/_/g, ' ');
}
/**
 * Away from home? {away, cc, homeCc, diffMin}. ccOf(zone) -> 'JP' (the place
 * table, when there is one). Without a country: away when the zone's offset
 * differs from home's, or its region does.
 */
function clockAway(home, eff, ms, ccOf) {
  const t = ms == null ? Date.now() : ms;
  const h = canonZone(home) || 'UTC', e = canonZone(eff) || h;
  const diffMin = clockDiffMin(h, e, t);
  const look = (z) => { try { return (typeof ccOf === 'function' && ccOf(z)) || ''; } catch (err) { return ''; } };
  const cc = clockPlaceless(e) ? '' : look(e), homeCc = look(h);
  let away;
  if (e === h || clockPlaceless(e)) away = false;
  else if (cc && homeCc) away = cc !== homeCc || diffMin !== 0;
  else away = diffMin !== 0 || e.split('/')[0] !== h.split('/')[0];
  return { away, cc, homeCc, diffMin };
}
