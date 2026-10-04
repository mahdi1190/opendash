// lib/weather.mjs - weather for the Morning brief, from Open-Meteo (free, no key).
// (owner: Brief + Review)
//
//   createWeatherService({ cacheFile, fetchImpl?, now?, log?, ttlMs? })
//     .get(location, { refresh })  -> shaped forecast (below) | { ok:false, reason }
//     .geocode(query)              -> [{ name, admin, country, countryCode, lat, lon, timezone }]
//   shapeForecast(raw, location, now) -> the shape the page draws
//   weatherCond(code)              -> { cond, label } from a WMO weather code
//
// Data: https://open-meteo.com/ (forecast API + geocoding API), CC BY 4.0.
// The page must show ATTRIBUTION wherever it shows the weather.
//
// Privacy and safety: the server makes the request (the page never talks to
// the internet), only to the two fixed Open-Meteo hosts, with a timeout and a
// size cap. It sends coordinates or the typed city name, nothing else. Results
// are cached for 30 minutes (memory + <data>/briefs/weather.json); when the
// network is down a cached forecast under 12 hours old is served as stale,
// otherwise { ok:false, reason:'offline' } and the brief hides the weather.
// The log gets "weather ok/failed" and timings only, never the place.

import { readJson, writeJson } from './fsutil.mjs';
import { normLocation } from './brief-config.mjs';

export const ATTRIBUTION = Object.freeze({ text: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/', licence: 'CC BY 4.0' });
export const WEATHER_TTL_MS = 30 * 60 * 1000;
export const STALE_MAX_MS = 12 * 3600 * 1000;
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 8000;

/** WMO weather interpretation codes (Open-Meteo docs) -> a condition the page animates. */
const WMO = new Map([
  [0, ['clear', 'Clear']], [1, ['clear', 'Mainly clear']], [2, ['partly', 'Partly cloudy']], [3, ['cloudy', 'Overcast']],
  [45, ['fog', 'Fog']], [48, ['fog', 'Freezing fog']],
  [51, ['drizzle', 'Light drizzle']], [53, ['drizzle', 'Drizzle']], [55, ['drizzle', 'Heavy drizzle']],
  [56, ['drizzle', 'Freezing drizzle']], [57, ['drizzle', 'Freezing drizzle']],
  [61, ['rain', 'Light rain']], [63, ['rain', 'Rain']], [65, ['rain', 'Heavy rain']],
  [66, ['rain', 'Freezing rain']], [67, ['rain', 'Freezing rain']],
  [71, ['snow', 'Light snow']], [73, ['snow', 'Snow']], [75, ['snow', 'Heavy snow']], [77, ['snow', 'Snow grains']],
  [80, ['showers', 'Light showers']], [81, ['showers', 'Showers']], [82, ['showers', 'Heavy showers']],
  [85, ['snow', 'Snow showers']], [86, ['snow', 'Heavy snow showers']],
  [95, ['thunder', 'Thunderstorm']], [96, ['thunder', 'Thunderstorm with hail']], [99, ['thunder', 'Thunderstorm with hail']],
]);
export function weatherCond(code) {
  const w = WMO.get(Number(code));
  return w ? { cond: w[0], label: w[1] } : { cond: 'cloudy', label: 'Unknown' };
}

const num = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const hhmm = (iso) => (typeof iso === 'string' && /T\d{2}:\d{2}/.test(iso) ? iso.slice(11, 16) : null);

/** The local date-time "now" in a time zone, as 'YYYY-MM-DDTHH:MM'. */
function localNow(now, tz) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  } catch { return new Date(now).toISOString().slice(0, 16); }
}

/**
 * Turn an Open-Meteo forecast response into what the brief needs:
 * { ok, location, current, today, tomorrow, hourly[], fetchedAt, attribution }.
 */
export function shapeForecast(raw, location, now = new Date()) {
  if (!raw || typeof raw !== 'object' || !raw.daily || !raw.hourly) return { ok: false, reason: 'bad-data' };
  const tz = raw.timezone || (location && location.timezone) || 'UTC';
  const nowLocal = localNow(now, tz);
  const today = nowLocal.slice(0, 10);
  const d = raw.daily, h = raw.hourly, c = raw.current || {};
  const day = (i) => {
    if (!Array.isArray(d.time) || d.time[i] === undefined) return null;
    const wc = weatherCond(d.weather_code?.[i]);
    return {
      date: d.time[i], code: d.weather_code?.[i] ?? null, ...wc,
      hi: num(d.temperature_2m_max?.[i]), lo: num(d.temperature_2m_min?.[i]),
      rainChance: num(d.precipitation_probability_max?.[i], 0),
      sunrise: hhmm(d.sunrise?.[i]), sunset: hhmm(d.sunset?.[i]),
    };
  };
  const ti = Math.max(0, (d.time || []).indexOf(today));
  const hourly = [];
  for (let i = 0; i < (h.time || []).length; i++) {
    const t = h.time[i];
    if (typeof t !== 'string' || t.slice(0, 10) < today) continue;
    if (hourly.length >= 72) break;
    const wc = weatherCond(h.weather_code?.[i]);
    hourly.push({ date: t.slice(0, 10), hour: Number(t.slice(11, 13)), time: t.slice(11, 16), temp: num(h.temperature_2m?.[i]), code: h.weather_code?.[i] ?? null, cond: wc.cond, label: wc.label, rain: num(h.precipitation_probability?.[i], 0), isDay: h.is_day?.[i] === 1 });
  }
  const cw = weatherCond(c.weather_code);
  return {
    ok: true,
    location: location ? { name: location.name, admin: location.admin || '', country: location.country || '', countryCode: location.countryCode || '' } : null,
    timezone: tz, localTime: nowLocal,
    current: c.time ? {
      time: c.time, temp: num(c.temperature_2m), feels: num(c.apparent_temperature), code: c.weather_code ?? null, ...cw,
      isDay: c.is_day === 1, wind: num(c.wind_speed_10m, 0), precip: num(c.precipitation),
    } : null,
    today: day(ti), tomorrow: day(ti + 1),
    hourly,
    units: { temp: raw.current_units?.temperature_2m || raw.hourly_units?.temperature_2m || '°C', wind: raw.current_units?.wind_speed_10m || 'km/h' },
    fetchedAt: new Date(now).toISOString(),
    attribution: ATTRIBUTION,
  };
}

/** GET JSON with a timeout; one retry when the network (not the API) failed, e.g. a stalled first connection. */
async function getJson(fetchImpl, url, timeoutMs) {
  try { return await getJsonOnce(fetchImpl, url, timeoutMs); }
  catch (e) {
    if (e && e.code === 'HTTP') throw e;
    return getJsonOnce(fetchImpl, url, timeoutMs);
  }
}
async function getJsonOnce(fetchImpl, url, timeoutMs) {
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' }, redirect: 'error' });
  if (!r || !r.ok) { const e = new Error('HTTP ' + (r && r.status)); e.code = 'HTTP'; throw e; }
  const len = Number(r.headers && r.headers.get && r.headers.get('content-length'));
  if (len > MAX_BYTES) throw new Error('response too large');
  const text = await r.text();
  if (text.length > MAX_BYTES) throw new Error('response too large');
  return JSON.parse(text);
}

export function forecastUrl(loc, { units = 'metric' } = {}) {
  const q = new URLSearchParams({
    latitude: String(loc.lat), longitude: String(loc.lon),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,precipitation',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: loc.timezone || 'auto', forecast_days: '3',
  });
  if (units === 'imperial') { q.set('temperature_unit', 'fahrenheit'); q.set('wind_speed_unit', 'mph'); }
  return `${FORECAST_URL}?${q}`;
}

export function createWeatherService({ cacheFile = null, fetchImpl = globalThis.fetch, now = () => new Date(), log = () => {}, ttlMs = WEATHER_TTL_MS, timeoutMs = TIMEOUT_MS } = {}) {
  const mem = new Map();          // key -> { at, raw }
  let diskLoaded = false;
  const keyOf = (loc, units) => `${loc.lat},${loc.lon},${units}`;
  async function loadDisk() {
    if (diskLoaded || !cacheFile) return;
    diskLoaded = true;
    const j = await readJson(cacheFile, { fallback: null }).catch(() => null);
    if (j && j.key && j.raw && Number(j.at)) mem.set(j.key, { at: Number(j.at), raw: j.raw });
  }
  const inflight = new Map();

  async function get(location, { refresh = false, units = 'metric' } = {}) {
    const loc = normLocation(location);
    if (!loc) return { ok: false, reason: 'no-location' };
    await loadDisk();
    const key = keyOf(loc, units);
    const hit = mem.get(key);
    const t = now().getTime();
    if (hit && !refresh && t - hit.at < ttlMs) return { ...shapeForecast(hit.raw, loc, now()), fetchedAt: new Date(hit.at).toISOString(), cached: true };
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      const t0 = Date.now();
      try {
        const raw = await getJson(fetchImpl, forecastUrl(loc, { units }), timeoutMs);
        const at = now().getTime();
        mem.set(key, { at, raw });
        if (cacheFile) await writeJson(cacheFile, { key, at, raw }).catch(() => {});
        log('info', `weather ok ${Date.now() - t0}ms`);
        return { ...shapeForecast(raw, loc, now()), cached: false };
      } catch (e) {
        log('warn', `weather failed (${e.code || e.name || 'error'})`);
        if (hit && t - hit.at < STALE_MAX_MS) return { ...shapeForecast(hit.raw, loc, now()), fetchedAt: new Date(hit.at).toISOString(), cached: true, stale: true };
        return { ok: false, reason: 'offline' };
      } finally { inflight.delete(key); }
    })();
    inflight.set(key, p);
    return p;
  }

  async function geocode(query, { count = 6, language = 'en' } = {}) {
    const q = String(query || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
    if (q.length < 2) return [];
    const url = `${GEOCODE_URL}?${new URLSearchParams({ name: q, count: String(Math.max(1, Math.min(10, count))), language: /^[a-z]{2}$/.test(language) ? language : 'en', format: 'json' })}`;
    const j = await getJson(fetchImpl, url, timeoutMs);
    return (Array.isArray(j && j.results) ? j.results : []).map(r => normLocation({
      name: r.name, admin: r.admin1, country: r.country, countryCode: r.country_code, lat: r.latitude, lon: r.longitude, timezone: r.timezone,
    })).filter(Boolean);
  }

  return { get, geocode, _mem: mem };
}
