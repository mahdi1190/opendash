// lib/holidays-online.mjs - the opt-in online public-holiday lookup (travel spec 3.5, 5.4).
// Owner: PLACES.
//
// Off by default (config.travel.holidays.online). When on, /api/travel/holidays asks
// Nager.Date for a country and year the offline rules (src/app/69-travel-holidays.js)
// do not cover, or only estimate (lunar and announced dates):
//   https://date.nager.at/api/v3/PublicHolidays/{year}/{CC}
// It sends a country code and a year, nothing else: one fixed host, no redirects,
// a timeout and a size cap. Answers are cached per (country, year) for a year in
// <data>/travel/holidays-<CC>-<year>.json ("no data" too, so an unknown country is
// not asked again). Logs: "travel holidays online ok/failed", counts and timings only.
//
//   onlineHolidays(cc, year, {dir, fetchImpl, log, region, now})
//       -> [{date, name, regions?}] (public days off; [] when Nager has none) | throws on a network error
//   mergeHolidays(offline, online)  the online days replace the estimated offline ones
//   HOLIDAYS_HOST, holidaysUrl(cc, year)

import { join } from 'node:path';
import { readJson, writeJson } from './fsutil.mjs';

export const HOLIDAYS_HOST = 'date.nager.at';
const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 8000;
const TTL_MS = 365 * 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The one URL this module ever fetches. */
export function holidaysUrl(cc, year) {
  const C = String(cc || '').toUpperCase(), y = Number(year);
  if (!/^[A-Z]{2}$/.test(C)) throw new TypeError('country must be two letters');
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new TypeError('year must be 2000-2100');
  return `https://${HOLIDAYS_HOST}/api/v3/PublicHolidays/${y}/${C}`;
}

/** Nager rows -> public days off in that year (national, or the given region: 'SCT' / 'GB-SCT'). */
export function parseNager(rows, cc, year, region) {
  if (!Array.isArray(rows)) throw new Error('not a list');
  const C = String(cc).toUpperCase();
  const reg = region ? (String(region).toUpperCase().startsWith(C + '-') ? String(region).toUpperCase() : `${C}-${String(region).toUpperCase()}`) : '';
  const out = [], seen = new Set();
  for (const h of rows.slice(0, 400)) {
    if (!h || typeof h !== 'object' || typeof h.date !== 'string' || !ISO.test(h.date) || !h.date.startsWith(String(year))) continue;
    const types = Array.isArray(h.types) ? h.types : [];
    if (!types.includes('Public')) continue;
    const counties = Array.isArray(h.counties) ? h.counties.filter(x => typeof x === 'string') : [];
    const national = h.global !== false || !counties.length;
    if (!national && !(reg && counties.includes(reg))) continue;
    const name = String(h.name || h.localName || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 80);
    const key = h.date + '|' + name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(national ? { date: h.date, name } : { date: h.date, name, regions: [reg.slice(C.length + 1)] });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** The opt-in lookup. Throws on a network or format error (the caller keeps the offline rules). */
export async function onlineHolidays(cc, year, { dir = '', fetchImpl = globalThis.fetch, log = () => {}, region = '', now = () => Date.now() } = {}) {
  const url = holidaysUrl(cc, year);
  const C = String(cc).toUpperCase(), y = Number(year);
  const file = dir ? join(dir, `holidays-${C}-${y}.json`) : '';
  if (file) {
    const hit = await readJson(file, { fallback: null }).catch(() => null);
    if (hit && Array.isArray(hit.rows) && now() - Number(hit.at) < TTL_MS) return parseNager(hit.rows, C, y, region);
  }
  const t0 = Date.now();
  let rows;
  try {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' }, redirect: 'error' });
    if (r && (r.status === 204 || r.status === 404)) rows = [];   // a country Nager does not cover
    else {
      if (!r || !r.ok) throw Object.assign(new Error('HTTP ' + (r && r.status)), { code: 'HTTP' });
      const len = Number(r.headers && r.headers.get && r.headers.get('content-length'));
      if (len > MAX_BYTES) throw new Error('too large');
      const text = await r.text();
      if (text.length > MAX_BYTES) throw new Error('too large');
      rows = text.trim() ? JSON.parse(text) : [];
      if (!Array.isArray(rows)) throw new Error('not a list');
    }
  } catch (e) {
    log('warn', `travel holidays online failed (${e.code || e.name || 'error'})`);
    throw e;
  }
  // Keep only the fields parseNager reads: nothing else from the answer is stored.
  const keep = rows.slice(0, 400).map(h => (h && typeof h === 'object'
    ? { date: h.date, name: h.name, localName: h.localName, global: h.global, counties: h.counties, types: h.types } : null)).filter(Boolean);
  const days = parseNager(keep, C, y, region);
  if (file) await writeJson(file, { at: now(), rows: keep }).catch(() => {});
  log('info', `travel holidays online ok, ${days.length} days, ${Date.now() - t0}ms`);
  return days;
}

/** Offline days, with the estimated ones replaced by what the online lookup brought. */
export function mergeHolidays(offline, online) {
  const on = Array.isArray(online) ? online.filter(d => d && ISO.test(String(d.date))) : [];
  if (!on.length) return Array.isArray(offline) ? offline.slice() : [];
  const keep = (Array.isArray(offline) ? offline : []).filter(d => d && !d.estimated);
  const dates = new Set(keep.map(d => d.date));
  const out = keep.concat(on.filter(d => !dates.has(d.date)).map(d => ({ date: d.date, name: d.name || '' })));
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
