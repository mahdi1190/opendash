// server/routes/travel.mjs - the travel routes (travel spec 3.5, 5.4, 5.5, 7.2). Owner: TRIPS.
//
//   GET /api/travel/weather?place=<cityId>[&days=1-16]
//       -> lib/weather.mjs's forecast for a city of the offline table ('tokyo-jp'), with `daily`
//       -> 404 for a city the table does not have. The page never sends coordinates: the
//          server looks the city up in its own table and asks Open-Meteo for the forecast at
//          the city's centre, so this route cannot be used as an open proxy.
//       -> {ok:false, reason:'off'} while travel features (or "Weather where you are") are off.
//   GET /api/travel/holidays?cc=XX&year=YYYY[&region=]
//       -> {rules:'offline'|'online'|'none', days:[{date, name, estimated?}]}: the offline rules
//          (69-travel-holidays.js); the opt-in online lookup (config.travel.holidays.online,
//          lib/holidays-online.mjs, date.nager.at) only for what the offline rules lack or estimate.
//   GET /api/finance/travel?from=YYYY-MM-DD&to=YYYY-MM-DD[&cc=XX][&ccy=JPY]
//       -> {rows:[{id, date, amount, merchant, fx:{ccy, amt, rate}|null, cc, fee, atm}],
//           totals:{byCcy:{JPY:{orig, home, n}}, homeOnly, fees}, booked:[...] (with cc: travel
//           bookings in the 60 days before), rates:{JPY:{rate, date, source}}, currency, window}
//          Card payments abroad in the window, read from the memos with trFxSignal (the page's
//          own rules, 69-travel-logic.js): another currency or country, cash abroad, card fees;
//          online billers (a subscription billed from Ireland) are left out. Rates come from the
//          user's own payments, or online (Frankfurter) when config.travel.rates === 'online'.
// Every route: GET, same origin, no AI, nothing written but caches in <data>/travel/.
// Logs: counts and timings, never places, memos or amounts (spec 6.7).

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { HttpError } from '../http.mjs';
import { createWeatherService, ATTRIBUTION } from '../../lib/weather.mjs';
import { financeData } from '../../lib/finance.mjs';
import { api as T, travelIndex, travelCity, holidaysFor, trFxSignal, trZonePlace } from '../../lib/travel-logic.mjs';
import { createRates, ownRate } from '../../lib/travel-rates.mjs';

// Tests swap the network for fakes.
let fetchImpl = null;
let onlineHolidays = null;
export function setTravelFetch(fn) { fetchImpl = fn; }
export function setOnlineHolidays(fn) { onlineHolidays = fn; }

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const BOOKED_RE = /AIRWAYS|AIRLINES?\b|\bAIR\s|EASYJET|RYANAIR|JET2|WIZZ|LUFTHANSA|\bKLM\b|EMIRATES|QATAR AIR|ETIHAD|VIRGIN ATL|\bHOTEL|HOSTEL|AIRBNB|BOOKING\.COM|EXPEDIA|TRAINLINE|EUROSTAR|\bLNER\b|AVANTI|HERTZ|\bAVIS\b|EUROPCAR|\bSIXT\b|HOTELS\.COM|AGODA|TRIP\.COM|SKYSCANNER/;
const BOOKED_CATS = new Set(['Travel', 'Holidays', 'Holiday', 'Flights', 'Hotels', 'Accommodation']);

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function travelCfg(cfg) { const t = cfg && cfg.travel; return t && typeof t === 'object' ? t : {}; }
/** The user's home country: config.location, else the home zone's country. */
function homeCc(cfg) {
  const cc = cfg && cfg.location && cfg.location.countryCode;
  if (/^[A-Z]{2}$/.test(String(cc || ''))) return cc;
  const zp = trZonePlace(cfg && cfg.timezone, travelIndex());
  return zp ? zp.cc : '';
}

export default function register(app) {
  const { dataDir, log } = app.ctx;
  const root = (app.ctx.paths && app.ctx.paths.root) || dataDir;
  const cacheDir = join(root, 'travel');
  const ensureDir = async () => { if (!existsSync(cacheDir)) await mkdir(cacheDir, { recursive: true }); };
  let weather = null, rates = null;
  const net = (...a) => (fetchImpl || globalThis.fetch)(...a);
  const svc = () => (weather = weather || createWeatherService({ cacheFile: join(cacheDir, 'weather.json'), log, fetchImpl: net }));
  const rateSvc = () => (rates = rates || createRates({ dir: cacheDir, log, fetchImpl: net }));

  app.route({
    path: '/api/travel/weather', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: async (c) => {
      const cfg = c.getConfig() || {};
      const t = travelCfg(cfg);
      const city = travelCity(c.query.get('place'));
      if (!city || !Number.isFinite(city.lat) || !Number.isFinite(city.lon)) throw new HttpError(404, 'unknown place');
      if (t.on !== true || t.weather === false) return { ok: false, reason: 'off', attribution: ATTRIBUTION };
      const days = Math.max(1, Math.min(16, Math.round(Number(c.query.get('days')) || 3)));
      await ensureDir();
      const units = (cfg.brief && cfg.brief.units) || 'metric';
      // Only the table's own name, position and zone go to Open-Meteo.
      const r = await svc().get({ name: city.name, countryCode: city.cc, lat: city.lat, lon: city.lon, timezone: city.zone }, { units, days });
      return Object.assign({}, r, { place: city.id });
    },
  });

  app.route({
    path: '/api/travel/holidays', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: async (c) => {
      const cc = String(c.query.get('cc') || '').toUpperCase();
      const year = Number(c.query.get('year'));
      const region = String(c.query.get('region') || '');
      if (!/^[A-Z]{2}$/.test(cc)) throw new HttpError(400, 'cc must be a two-letter country code');
      if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new HttpError(400, 'year must be between 2000 and 2100');
      if (region && !/^[A-Za-z0-9-]{1,12}$/.test(region)) throw new HttpError(400, 'bad region');
      const offline = holidaysFor(cc, year, { region });
      const t = travelCfg(c.getConfig());
      const wantOnline = t.holidays && t.holidays.online === true && (!offline.length || offline.some(d => d && d.estimated));
      if (wantOnline) {
        const fn = onlineHolidays || (await loadOnlineHolidays());
        if (fn) {
          await ensureDir();
          try {
            const list = await fn(cc, year, { dir: cacheDir, fetchImpl: net, log, region });
            if (Array.isArray(list) && list.length) {
              log('info', `travel holidays: online, ${list.length} days`);
              // The online days replace only the estimated offline ones (as lib/holidays-online.mjs mergeHolidays).
              const keep = offline.filter(d => d && !d.estimated), have = new Set(keep.map(d => d.date));
              const days = keep.concat(list.filter(d => d && !have.has(d.date)).map(d => ({ date: d.date, name: d.name || d.localName || '' })));
              return { rules: 'online', days: days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) };
            }
          } catch { /* fall back to the offline rules */ }
        }
      }
      return { rules: offline.length ? 'offline' : 'none', days: offline };
    },
  });

  app.route({
    path: '/api/finance/travel', method: 'GET', methodError: 'GET only', sameOrigin: true, quiet: true,
    handler: async (c) => {
      const from = String(c.query.get('from') || ''), to = String(c.query.get('to') || '');
      if (!ISO.test(from) || !ISO.test(to)) throw new HttpError(400, 'from and to must be dates like 2026-10-04');
      if (to < from) throw new HttpError(400, 'to must not be before from');
      if ((Date.parse(to) - Date.parse(from)) / 86400000 > 400) throw new HttpError(400, 'at most 400 days');
      const cc = c.query.get('cc') ? String(c.query.get('cc')).toUpperCase() : '';
      if (cc && !/^[A-Z]{2}$/.test(cc)) throw new HttpError(400, 'cc must be a two-letter country code');
      const wantCcy = c.query.get('ccy') ? String(c.query.get('ccy')).toUpperCase() : '';
      if (wantCcy && !/^[A-Z]{3}$/.test(wantCcy)) throw new HttpError(400, 'ccy must be a three-letter currency code');
      const cfg = c.getConfig() || {};
      const currency = cfg.currency || 'GBP';
      const empty = { rows: [], totals: { byCcy: {}, homeOnly: 0, fees: 0 }, booked: [], rates: {}, currency, window: { from, to } };
      const d = await financeData();
      if (d.status !== 'ok' || !d.analysis || !Array.isArray(d.analysis.transactions)) { log('info', 'finance travel: no finance data'); return empty; }
      const P = travelIndex();
      const recurring = new Set((d.analysis.recurring || []).map(r => T._trlFold(r && r.merchant)).filter(Boolean));
      const opts = { homeCcy: currency, homeCc: homeCc(cfg), recurring, P };
      const rows = [], booked = [];
      const bookFrom = cc ? addDays(from, -60) : '';
      let seen = 0;
      const all = d.analysis.transactions;
      for (const t of all) {
        if (!t || typeof t.d !== 'string') continue;
        const inWin = t.d >= from && t.d <= to;
        const inBook = bookFrom && t.d >= bookFrom && t.d < from;
        if (!inWin && !inBook) continue;
        seen++;
        const s = trFxSignal(t.memo || t.m || '', Object.assign({}, opts, { merchant: t.m || '' }));
        if (inBook) {
          const memo = String(t.memo || '').toUpperCase();
          if ((BOOKED_CATS.has(t.c) || BOOKED_RE.test(memo)) && booked.length < 20) booked.push({ id: t.k, date: t.d, amount: t.a, merchant: t.m || '', category: t.c || '' });
          continue;
        }
        if (s.online || !(s.abroad || s.fee)) continue;
        rows.push({ id: t.k, date: t.d, amount: t.a, merchant: t.m || '', fx: s.ccy ? { ccy: s.ccy, amt: s.amt, rate: s.rate } : null, cc: s.cc || null, fee: s.fee, atm: s.atm });
      }
      rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      // Totals: by original currency (and what it cost in the home currency), the rest, card fees.
      const totals = { byCcy: {}, homeOnly: 0, fees: 0 };
      const round = (x) => Math.round(x * 100) / 100;
      for (const r of rows) {
        const amt = Math.abs(Number(r.amount) || 0);
        if (r.fee) { totals.fees += amt; continue; }
        if (!(Number(r.amount) < 0)) continue;
        if (r.fx) { const b = totals.byCcy[r.fx.ccy] || (totals.byCcy[r.fx.ccy] = { orig: 0, home: 0, n: 0 }); b.orig += Number(r.fx.amt) || 0; b.home += amt; b.n++; }
        else totals.homeOnly += amt;
      }
      for (const b of Object.values(totals.byCcy)) { b.orig = round(b.orig); b.home = round(b.home); }
      totals.fees = round(totals.fees); totals.homeOnly = round(totals.homeOnly);
      // Rates: own payments by default (the newest memo anywhere in the store); online only when opted in.
      const ccys = [...new Set([...Object.keys(totals.byCcy), ...(wantCcy ? [wantCcy] : [])])].filter(x => x !== currency).slice(0, 4);
      const out = {};
      const online = travelCfg(cfg).rates === 'online';
      for (const ccy of ccys) {
        let r = online ? await (async () => { await ensureDir(); return rateSvc().online(currency, ccy); })() : null;
        if (!r) {
          const own = rows.filter(x => x.fx && x.fx.ccy === ccy);
          r = ownRate(own, ccy);
          if (!r) {
            for (const t of all) {                      // newest first: the last payment in that currency
              if (!t || !String(t.memo || '').toUpperCase().includes(ccy)) continue;
              const s = trFxSignal(t.memo, opts);
              if (s.ccy === ccy) { r = ownRate([{ date: t.d, amount: t.a, fx: { ccy, amt: s.amt, rate: s.rate } }], ccy); if (r) break; }
            }
          }
        }
        if (r) out[ccy] = r;
      }
      log('info', `finance travel: ${seen} read, ${rows.length} abroad, ${booked.length} booked`);
      return { rows, totals, booked, rates: out, currency, window: { from, to } };
    },
  });
}

/** The opt-in online holidays (PLACES' lib/holidays-online.mjs), whatever it names its lookup. */
async function loadOnlineHolidays() {
  try {
    const m = await import('../../lib/holidays-online.mjs');
    for (const n of ['onlineHolidays', 'fetchHolidays', 'holidaysOnline', 'getHolidays', 'lookupHolidays']) if (typeof m[n] === 'function') return m[n];
    if (typeof m.default === 'function') return m.default;
  } catch { /* not there: offline only */ }
  return null;
}
