// lib/ical.mjs - iCal (.ics) calendar sources: fetched by the server directly,
// no AI involved.
//
//   fetchIcal(url, opts)           https GET with a timeout, a 5 MB cap, at most 3
//                                  redirects; refuses file:, http:, credentials in
//                                  the URL, and any host that resolves to a
//                                  private, loopback, link-local or multicast
//                                  address (checked on the address actually used,
//                                  so DNS rebinding cannot slip past)
//   parseIcal(text)                -> {name, timezone, events:[raw VEVENT]}
//   expandIcal(parsed, {from, to, timeZone, calendarId})
//                                  -> events in lib/calendar.mjs's clean shape;
//                                  RRULE (DAILY/WEEKLY/MONTHLY/YEARLY with COUNT,
//                                  UNTIL, INTERVAL, BYDAY, BYMONTHDAY, BYMONTH),
//                                  EXDATE, RECURRENCE-ID overrides and TZID are
//                                  honoured; a rule that cannot be read safely
//                                  keeps only its first occurrence
//
// Every value is untrusted text: it is cleaned and validated by
// lib/calendar.mjs normaliseEvent, exactly like Google events.
//
// Node stdlib only.

import { request } from 'node:https';
import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { normaliseEvent } from './calendar.mjs';

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
export const TIMEOUT_MS = 20000;
const MAX_INSTANCES = 1500;        // per event
const MAX_EVENTS = 6000;           // per calendar
const MAX_STEPS = 20000;           // rule iterations per event

// ─── Address checks ──────────────────────────────────────────────────────
function v4Parts(ip) { return ip.split('.').map(Number); }
/** True for addresses a server must never be sent to on the user's behalf. */
export function isPrivateAddress(ip) {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b] = v4Parts(ip);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (kind === 6) {
    const s = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return isPrivateAddress(mapped[1]);
    // '::x' covers ::1 and the old IPv4-compatible form (::7f00:1 = 127.0.0.1); 2002: (6to4) and
    // 2001:0: (Teredo) embed an IPv4 address, so they are refused too.
    return s === '::' || /^::[0-9a-f]/.test(s) || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s) || /^64:ff9b:/.test(s)
      || /^2001:db8:/.test(s) || /^2002:/.test(s) || /^2001:0?:/.test(s) || /^2001:0000:/.test(s);
  }
  return true;
}

/** A dns.lookup that refuses private answers (used as the socket's lookup, so the checked address is the one connected to). */
function safeLookup(hostname, options, cb) {
  dnsLookup(hostname, { all: true }, (err, addrs) => {
    if (err) return cb(err);
    const ok = (addrs || []).filter(a => !isPrivateAddress(a.address));
    if (!ok.length) { const e = new Error('That address points inside your own network, so it is not fetched.'); e.code = 'PRIVATE_ADDRESS'; return cb(e); }
    if (options && options.all) return cb(null, ok);
    cb(null, ok[0].address, ok[0].family);
  });
}

function checkUrl(u) {
  let url;
  try { url = new URL(u); } catch { throw Object.assign(new Error('Not a valid web address.'), { code: 'BAD_URL' }); }
  if (url.protocol !== 'https:') throw Object.assign(new Error('Only https:// calendar links are fetched.'), { code: 'BAD_URL' });
  if (url.username || url.password) throw Object.assign(new Error('Links with a user name or password in them are not fetched.'), { code: 'BAD_URL' });
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isPrivateAddress(host)) throw Object.assign(new Error('That address points inside your own network, so it is not fetched.'), { code: 'PRIVATE_ADDRESS' });
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(host)) throw Object.assign(new Error('That address points inside your own network, so it is not fetched.'), { code: 'PRIVATE_ADDRESS' });
  return url;
}

/**
 * GET an iCal URL. Resolves {text, finalUrl, bytes}. Rejects with an Error
 * whose .code is BAD_URL, PRIVATE_ADDRESS, TOO_LARGE, TOO_MANY_REDIRECTS,
 * TIMEOUT, HTTP_<status> or FETCH_FAILED. opts.requestFn is for tests.
 */
export async function fetchIcal(u, { timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES, maxRedirects = MAX_REDIRECTS, requestFn = request, lookup = safeLookup } = {}) {
  let url = checkUrl(String(u || '').replace(/^webcals?:\/\//i, 'https://'));
  for (let hop = 0; ; hop++) {
    const res = await once(url, { timeoutMs, maxBytes, requestFn, lookup });
    if (res.redirect) {
      if (hop >= maxRedirects) throw Object.assign(new Error('The calendar link redirected too many times.'), { code: 'TOO_MANY_REDIRECTS' });
      url = checkUrl(new URL(res.redirect, url).href);
      continue;
    }
    return { text: res.text, finalUrl: url.href, bytes: res.bytes };
  }
}

function once(url, { timeoutMs, maxBytes, requestFn, lookup }) {
  return new Promise((resolveP, reject) => {
    let done = false;
    const fail = (code, msg) => { if (done) return; done = true; clearTimeout(timer); try { req.destroy(); } catch {} reject(Object.assign(new Error(msg), { code })); };
    const timer = setTimeout(() => fail('TIMEOUT', 'The calendar took too long to answer.'), timeoutMs);
    const req = requestFn(url, {
      method: 'GET', lookup, timeout: timeoutMs,
      headers: { 'User-Agent': 'OpenDash-iCal/1.0', Accept: 'text/calendar, text/plain;q=0.8, */*;q=0.1', 'Accept-Encoding': 'identity' },
    }, (res) => {
      const st = res.statusCode || 0;
      if (st >= 300 && st < 400 && res.headers.location) {
        res.resume();
        if (done) return; done = true; clearTimeout(timer);
        return resolveP({ redirect: String(res.headers.location) });
      }
      if (st !== 200) { res.resume(); return fail('HTTP_' + st, `The calendar link answered with an error (${st}).`); }
      const len = Number(res.headers['content-length']);
      if (Number.isFinite(len) && len > maxBytes) { res.resume(); return fail('TOO_LARGE', 'The calendar is larger than 5 MB.'); }
      const chunks = []; let bytes = 0;
      res.on('data', (c) => { bytes += c.length; if (bytes > maxBytes) return fail('TOO_LARGE', 'The calendar is larger than 5 MB.'); chunks.push(c); });
      res.on('end', () => { if (done) return; done = true; clearTimeout(timer); resolveP({ text: Buffer.concat(chunks).toString('utf8'), bytes }); });
      res.on('error', (e) => fail('FETCH_FAILED', `The calendar could not be read (${e.code || e.message}).`));
    });
    req.on('timeout', () => fail('TIMEOUT', 'The calendar took too long to answer.'));
    req.on('error', (e) => fail(e.code === 'PRIVATE_ADDRESS' ? 'PRIVATE_ADDRESS' : 'FETCH_FAILED', e.code === 'PRIVATE_ADDRESS' ? e.message : `The calendar could not be reached (${e.code || 'network error'}).`));
    req.end();
  });
}

// ─── Parsing ─────────────────────────────────────────────────────────────
/** RFC 5545 text value -> plain text. */
function unescapeText(v) {
  return String(v).replace(/\\([\\;,nN])/g, (m, c) => (c === 'n' || c === 'N' ? '\n' : c));
}
function parseLine(line) {
  // NAME;P1=V1;P2="V,2":VALUE  (colons inside quoted params do not end the name part)
  let i = 0, inQ = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ':' && !inQ) break;
  }
  if (i >= line.length) return null;
  const head = line.slice(0, i), value = line.slice(i + 1);
  const parts = head.match(/(?:[^;"]|"[^"]*")+/g) || [head];
  const name = parts[0].toUpperCase();
  const params = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value };
}

/** .ics text -> {name, timezone, events:[{UID, SUMMARY, DTSTART:{value, params}, ...}]} */
export function parseIcal(text) {
  const src = String(text || '').replace(/\r\n|\r/g, '\n').replace(/\n[ \t]/g, '');
  const out = { name: '', timezone: '', events: [] };
  const stack = [];
  let ev = null;
  for (const raw of src.split('\n')) {
    if (!raw) continue;
    const p = parseLine(raw);
    if (!p) continue;
    if (p.name === 'BEGIN') {
      stack.push(p.value.toUpperCase());
      if (p.value.toUpperCase() === 'VEVENT' && stack.length === 2) ev = { EXDATE: [], ATTENDEE: [] };
      continue;
    }
    if (p.name === 'END') {
      const what = stack.pop();
      if (what === 'VEVENT' && ev) { if (out.events.length < MAX_EVENTS * 2) out.events.push(ev); ev = null; }
      continue;
    }
    const top = stack[stack.length - 1];
    if (top === 'VCALENDAR' && stack.length === 1) {
      if (p.name === 'X-WR-CALNAME') out.name = unescapeText(p.value).slice(0, 120);
      if (p.name === 'X-WR-TIMEZONE') out.timezone = p.value.trim().slice(0, 60);
      continue;
    }
    if (!ev || top !== 'VEVENT') continue;            // VALARM, VTIMEZONE...: ignored
    if (p.name === 'EXDATE') { for (const v of p.value.split(',')) ev.EXDATE.push({ value: v.trim(), params: p.params }); continue; }
    if (p.name === 'ATTENDEE') { if (ev.ATTENDEE.length < 60) ev.ATTENDEE.push(p); continue; }
    if (!(p.name in ev)) ev[p.name] = ['DTSTART', 'DTEND', 'RECURRENCE-ID', 'ORGANIZER'].includes(p.name) ? { value: p.value.trim(), params: p.params } : p.value;
  }
  return out;
}

// ─── Time zones ──────────────────────────────────────────────────────────
// Outlook / Exchange feeds use Windows zone names.
const WINDOWS_ZONES = {
  'GMT Standard Time': 'Europe/London', 'Greenwich Standard Time': 'Atlantic/Reykjavik', 'W. Europe Standard Time': 'Europe/Berlin',
  'Romance Standard Time': 'Europe/Paris', 'Central Europe Standard Time': 'Europe/Budapest', 'Central European Standard Time': 'Europe/Warsaw',
  'E. Europe Standard Time': 'Europe/Chisinau', 'FLE Standard Time': 'Europe/Kiev', 'GTB Standard Time': 'Europe/Bucharest',
  'Russian Standard Time': 'Europe/Moscow', 'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver', 'Pacific Standard Time': 'America/Los_Angeles', 'UTC': 'UTC', 'Coordinated Universal Time': 'UTC',
  'India Standard Time': 'Asia/Kolkata', 'China Standard Time': 'Asia/Shanghai', 'Tokyo Standard Time': 'Asia/Tokyo',
  'Singapore Standard Time': 'Asia/Singapore', 'AUS Eastern Standard Time': 'Australia/Sydney', 'Arabian Standard Time': 'Asia/Dubai',
  'Pakistan Standard Time': 'Asia/Karachi', 'Egypt Standard Time': 'Africa/Cairo', 'South Africa Standard Time': 'Africa/Johannesburg',
};
const _dtf = new Map();
export function validZone(tz) {
  if (!tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
/** A TZID as found in a feed -> an IANA zone we can use, or null. */
export function resolveZone(tzid) {
  if (!tzid) return null;
  let t = String(tzid).trim().replace(/^\/+/, '');
  if (WINDOWS_ZONES[t]) return WINDOWS_ZONES[t];
  if (validZone(t)) return t;
  // Some feeds prefix zones ("/freeassociation.sourceforge.net/Europe/London"): try the last parts.
  const parts = t.split('/').filter(Boolean);
  for (const n of [3, 2]) {
    if (parts.length < n) continue;
    const z = parts.slice(-n).join('/');
    if (/^[A-Za-z]+(\/[A-Za-z0-9_+\-]+)+$/.test(z) && validZone(z)) return z;
  }
  return null;
}
function offsetMs(utcMs, tz) {
  let f = _dtf.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }); _dtf.set(tz, f); }
  const p = {};
  for (const x of f.formatToParts(new Date(utcMs))) p[x.type] = x.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - (utcMs - (utcMs % 1000));
}
/**
 * Wall-clock time in a zone -> UTC milliseconds. A time that happens twice (the hour
 * the clocks go back) is the FIRST of the two, as RFC 5545 says; a time that never
 * happens (the hour they go forward) moves forward by the gap (01:30 -> 02:30).
 * The offsets a day either side cover the one change a day can have.
 */
export function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  if (!tz || tz === 'UTC') return guess;
  const before = offsetMs(guess - 86400000, tz), after = offsetMs(guess + 86400000, tz);
  const fits = [guess - before, guess - after].filter(u => u + offsetMs(u, tz) === guess);
  return fits.length ? Math.min(...fits) : guess - before;
}

/** An iCal DATE or DATE-TIME -> {allDay, y, mo, d, h, mi, s, utc:boolean, tz} or null. */
function readWhen(prop, fallbackTz) {
  if (!prop || typeof prop.value !== 'string') return null;
  const v = prop.value.trim();
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m || (prop.params && prop.params.VALUE === 'DATE')) {
    m = m || /^(\d{4})(\d{2})(\d{2})/.exec(v);
    if (!m) return null;
    return { allDay: true, y: +m[1], mo: +m[2], d: +m[3], h: 0, mi: 0, s: 0 };
  }
  m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v);
  if (!m) return null;
  const w = { allDay: false, y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +(m[6] || 0) };
  if (w.mo < 1 || w.mo > 12 || w.d < 1 || w.d > 31 || w.h > 23 || w.mi > 59 || w.s > 60) return null;
  w.tz = m[7] ? 'UTC' : (resolveZone(prop.params && prop.params.TZID) || fallbackTz || 'UTC');
  return w;
}
const pad = (n, l = 2) => String(n).padStart(l, '0');
const isoDay = (w) => `${pad(w.y, 4)}-${pad(w.mo)}-${pad(w.d)}`;
const msOf = (w) => (w.allDay ? Date.UTC(w.y, w.mo - 1, w.d) : zonedToUtc(w.y, w.mo, w.d, w.h, w.mi, w.s, w.tz));
const addDaysW = (w, n) => { const t = new Date(Date.UTC(w.y, w.mo - 1, w.d + n)); return { ...w, y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
const dow = (w) => new Date(Date.UTC(w.y, w.mo - 1, w.d)).getUTCDay();          // 0 = Sunday
const daysInMonth = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();

/** "PT1H30M" / "P1D" / "-PT15M" -> milliseconds, or null. */
export function parseDuration(s) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(s || '').trim());
  if (!m) return null;
  const ms = ((+(m[2] || 0) * 7 + +(m[3] || 0)) * 86400 + +(m[4] || 0) * 3600 + +(m[5] || 0) * 60 + +(m[6] || 0)) * 1000;
  return m[1] === '-' ? -ms : ms;
}

// ─── RRULE ───────────────────────────────────────────────────────────────
const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const SUPPORTED = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'BYMONTHDAY', 'BYMONTH', 'WKST']);
/** RRULE text -> rule object, or null when it cannot be read safely. */
export function parseRrule(text) {
  const rule = {};
  for (const part of String(text || '').split(';')) {
    const [k, v] = part.split('=');
    if (!k || v == null) continue;
    rule[k.trim().toUpperCase()] = v.trim().toUpperCase();
  }
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(rule.FREQ)) return null;
  if (Object.keys(rule).some(k => !SUPPORTED.has(k))) return null;             // BYSETPOS, BYHOUR...: not safely readable
  const out = { freq: rule.FREQ, interval: Math.max(1, Math.min(1000, parseInt(rule.INTERVAL || '1', 10) || 1)) };
  if (rule.COUNT) { const c = parseInt(rule.COUNT, 10); if (!(c > 0)) return null; out.count = Math.min(c, MAX_INSTANCES * 4); }
  if (rule.UNTIL) { out.until = rule.UNTIL; }
  if (rule.BYDAY) {
    out.byday = [];
    for (const d of rule.BYDAY.split(',')) {
      const m = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(d.trim());
      if (!m) return null;
      out.byday.push({ n: m[1] ? parseInt(m[1], 10) : 0, day: DAYS[m[2]] });
    }
    if (out.freq === 'DAILY' && out.byday.some(b => b.n)) return null;
  }
  if (rule.BYMONTHDAY) {
    out.bymonthday = rule.BYMONTHDAY.split(',').map(x => parseInt(x, 10));
    if (out.bymonthday.some(x => !x || x < -31 || x > 31)) return null;
  }
  if (rule.BYMONTH) {
    out.bymonth = rule.BYMONTH.split(',').map(x => parseInt(x, 10));
    if (out.bymonth.some(x => !(x >= 1 && x <= 12))) return null;
  }
  return out;
}

/** Days (wall-clock, same time of day as start) on which a rule fires, from start, in order. Generator. */
function* ruleDays(start, rule) {
  let steps = 0;
  const startDay = { ...start };
  if (rule.freq === 'DAILY') {
    for (let k = 0; steps < MAX_STEPS; k += rule.interval, steps++) {
      const w = addDaysW(startDay, k);
      if (rule.bymonth && !rule.bymonth.includes(w.mo)) continue;
      if (rule.byday && !rule.byday.some(b => b.day === dow(w))) continue;
      if (rule.bymonthday && !rule.bymonthday.includes(w.d)) continue;
      yield w;
    }
    return;
  }
  if (rule.freq === 'WEEKLY') {
    const days = rule.byday ? rule.byday.map(b => b.day) : [dow(startDay)];
    // Week of the start (weeks start on Monday unless WKST says otherwise; only the order inside a week matters here).
    const weekStart = addDaysW(startDay, -((dow(startDay) + 6) % 7));
    for (let wk = 0; steps < MAX_STEPS; wk += rule.interval) {
      const base = addDaysW(weekStart, wk * 7);
      const inWeek = [0, 1, 2, 3, 4, 5, 6].map(i => addDaysW(base, i)).filter(w => days.includes(dow(w)));
      for (const w of inWeek) { steps++; if (msDay(w) < msDay(startDay)) continue; if (rule.bymonth && !rule.bymonth.includes(w.mo)) continue; yield w; }
      steps++;
    }
    return;
  }
  if (rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') {
    const yearly = rule.freq === 'YEARLY';
    for (let k = 0; steps < MAX_STEPS; k += rule.interval) {
      const months = yearly
        ? (rule.bymonth || [startDay.mo]).map(mo => ({ y: startDay.y + k, mo }))
        : [{ y: startDay.y + Math.floor((startDay.mo - 1 + k) / 12), mo: ((startDay.mo - 1 + k) % 12) + 1 }];
      for (const { y, mo } of months) {
        steps++;
        if (!yearly && rule.bymonth && !rule.bymonth.includes(mo)) continue;
        const dim = daysInMonth(y, mo);
        let days = [];
        if (rule.bymonthday) days = rule.bymonthday.map(d => (d > 0 ? d : dim + d + 1)).filter(d => d >= 1 && d <= dim);
        else if (rule.byday) {
          for (const b of rule.byday) {
            const all = [];
            for (let d = 1; d <= dim; d++) if (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() === b.day) all.push(d);
            if (!b.n) days.push(...all);
            else { const d = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]; if (d) days.push(d); }
          }
        } else if (startDay.d <= dim) days = [startDay.d];        // 31st: months without one are skipped
        for (const d of [...new Set(days)].sort((a, b) => a - b)) {
          const w = { ...startDay, y, mo, d };
          if (msDay(w) < msDay(startDay)) continue;
          yield w;
        }
      }
    }
  }
}
const msDay = (w) => Date.UTC(w.y, w.mo - 1, w.d);

function untilMs(rule, start) {
  if (!rule.until) return Infinity;
  const w = readWhen({ value: rule.until, params: {} }, start.tz);
  if (!w) return Infinity;
  // UNTIL is inclusive; a date-only UNTIL on a timed event means the end of that day.
  return w.allDay ? (start.allDay ? msDay(w) : zonedToUtc(w.y, w.mo, w.d, 23, 59, 59, start.tz || 'UTC')) : msOf(w);
}

// ─── Expansion ───────────────────────────────────────────────────────────
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 20);
function safeHttps(u) { const s = String(u || '').trim(); return /^https:\/\/[^\s<>"']{1,500}$/.test(s) ? s : ''; }
function mailto(v) { return String(v || '').replace(/^mailto:/i, '').trim(); }

/**
 * Parsed calendar -> clean events between from and to (YYYY-MM-DD, inclusive),
 * every instance of every recurring event in that range. calendarId and
 * sourceId are stamped on each. Returns {events, skippedRules, dropped}.
 */
export function expandIcal(parsed, { from, to, timeZone = 'UTC', calendarId = null, idPrefix = 'ic' } = {}) {
  const defTz = resolveZone(parsed.timezone) || (validZone(timeZone) ? timeZone : 'UTC');
  const lo = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const hi = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10) + 1);
  const overrides = new Map();          // uid -> Map(originalStartMs -> VEVENT)
  const masters = [];
  for (const v of parsed.events) {
    if (typeof v.UID !== 'string' || !v.UID.trim()) continue;
    if (v['RECURRENCE-ID']) {
      const w = readWhen(v['RECURRENCE-ID'], defTz);
      if (!w) continue;
      if (!overrides.has(v.UID)) overrides.set(v.UID, new Map());
      overrides.get(v.UID).set(msOf(w), v);
    } else masters.push(v);
  }
  const out = [];
  let skippedRules = 0, dropped = 0;
  const emit = (v, startW, endMs, recurring, origMs) => {
    const startMs = msOf(startW);
    const allDay = startW.allDay;
    if (!(startMs < hi && Math.max(endMs, startMs + 1) > lo)) return;
    if (out.length >= MAX_EVENTS) return;
    const raw = {
      id: idPrefix + hash(`${v.UID}|${origMs}`),
      summary: unescapeText(v.SUMMARY || ''),
      start: allDay ? { date: isoDay(startW) } : { dateTime: new Date(startMs).toISOString() },
      end: allDay ? { date: new Date(endMs).toISOString().slice(0, 10) } : { dateTime: new Date(endMs).toISOString() },
      status: String(v.STATUS || '').toUpperCase() === 'TENTATIVE' ? 'tentative' : 'confirmed',
      location: v.LOCATION ? unescapeText(v.LOCATION) : '',
      description: v.DESCRIPTION ? unescapeText(v.DESCRIPTION) : '',
      transparency: String(v.TRANSP || '').toUpperCase() === 'TRANSPARENT' ? 'transparent' : undefined,
      iCalUID: v.UID.trim().slice(0, 300),
      recurring,
      attendees: v.ATTENDEE.map(a => ({ email: mailto(a.value), displayName: a.params.CN || '', responseStatus: ({ ACCEPTED: 'accepted', DECLINED: 'declined', TENTATIVE: 'tentative' })[String(a.params.PARTSTAT || '').toUpperCase()] || 'needsAction' })),
      organizer: v.ORGANIZER ? { email: mailto(v.ORGANIZER.value), displayName: v.ORGANIZER.params && v.ORGANIZER.params.CN || '' } : undefined,
      conferenceUrl: safeHttps(v.URL),
    };
    const ev = normaliseEvent(raw);
    if (!ev) { dropped++; return; }
    const link = safeHttps(v.URL);
    if (link && !ev.conferenceUrl) ev.link = link;
    if (calendarId) ev.calendarId = calendarId;
    out.push(ev);
  };
  for (const v of masters) {
    const startW = readWhen(v.DTSTART, defTz);
    if (!startW) { dropped++; continue; }
    if (String(v.STATUS || '').toUpperCase() === 'CANCELLED') continue;
    let durMs;
    const endW = readWhen(v.DTEND, defTz);
    if (endW && endW.allDay === startW.allDay) durMs = msOf(endW) - msOf(startW);
    else if (v.DURATION && parseDuration(v.DURATION) != null) durMs = parseDuration(v.DURATION);
    else durMs = startW.allDay ? 86400000 : 0;
    if (!(durMs >= 0) || durMs > 366 * 86400000) durMs = startW.allDay ? 86400000 : 0;
    const ov = overrides.get(v.UID) || new Map();
    const exdates = new Set();
    for (const x of v.EXDATE) { const w = readWhen(x, startW.tz || defTz); if (w) exdates.add(w.allDay && !startW.allDay ? 'd:' + isoDay(w) : msOf(w)); }
    const rule = v.RRULE ? parseRrule(v.RRULE) : null;
    const instance = (w) => {
      const ms = msOf(w);
      if (exdates.has(ms) || exdates.has('d:' + isoDay(w))) return;
      const o = ov.get(ms);
      if (o) {
        if (String(o.STATUS || '').toUpperCase() === 'CANCELLED') return;
        const os = readWhen(o.DTSTART, defTz) || w;
        const oe = readWhen(o.DTEND, defTz);
        const od = oe && oe.allDay === os.allDay ? msOf(oe) - msOf(os) : (o.DURATION && parseDuration(o.DURATION) != null ? parseDuration(o.DURATION) : durMs);
        emit({ ...v, ...o, UID: v.UID, ATTENDEE: o.ATTENDEE.length ? o.ATTENDEE : v.ATTENDEE }, os, msOf(os) + Math.max(0, od), !!rule, ms);
        return;
      }
      emit(v, w, ms + durMs, !!rule, ms);
    };
    if (!v.RRULE) { instance(startW); continue; }
    if (!rule) { skippedRules++; instance(startW); continue; }       // unreadable rule: first occurrence only
    const until = untilMs(rule, startW);
    let n = 0;
    for (const w of ruleDays(startW, rule)) {
      const ms = msOf(w);
      if (ms > until) break;
      if (rule.count && n >= rule.count) break;
      n++;
      if (ms >= hi) break;
      if (ms + durMs < lo && !rule.count) continue;
      instance(w);
      if (n > MAX_INSTANCES * 4) break;
    }
  }
  out.sort((a, b) => String(a.start.dateTime || a.start.date).localeCompare(String(b.start.dateTime || b.start.date)));
  return { events: out, skippedRules, dropped };
}
