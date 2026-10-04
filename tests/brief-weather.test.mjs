// lib/weather.mjs (Open-Meteo client) with a mocked network, and the brief's
// config validation (lib/brief-config.mjs through lib/datadir.mjs). No real requests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWeatherService, shapeForecast, weatherCond, forecastUrl, ATTRIBUTION, STALE_MAX_MS } from '../lib/weather.mjs';
import { normLocation, normBrief, BRIEF_DEFAULTS } from '../lib/brief-config.mjs';
import { validateConfig } from '../lib/datadir.mjs';

const LOC = { name: 'Testville', admin: 'Shire', country: 'Nowhere', countryCode: 'NW', lat: 51.5, lon: -0.12, timezone: 'Europe/London' };
const NOW = new Date('2026-10-05T07:40:00Z');      // 08:40 in London (BST)

function raw() {
  const hours = [], code = [], temp = [], rain = [], day = [];
  for (const d of ['2026-10-05', '2026-10-06', '2026-10-07']) for (let h = 0; h < 24; h++) { hours.push(`${d}T${String(h).padStart(2, '0')}:00`); code.push(h < 12 ? 61 : 2); temp.push(10 + h / 2); rain.push(h < 12 ? 70 : 5); day.push(h >= 7 && h < 19 ? 1 : 0); }
  return {
    timezone: 'Europe/London', current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
    current: { time: '2026-10-05T08:30', temperature_2m: 12.36, apparent_temperature: 10.9, weather_code: 63, is_day: 1, wind_speed_10m: 14.2, precipitation: 0.4 },
    hourly: { time: hours, temperature_2m: temp, weather_code: code, precipitation_probability: rain, is_day: day },
    daily: { time: ['2026-10-05', '2026-10-06', '2026-10-07'], weather_code: [63, 2, 71], temperature_2m_max: [16.4, 17.1, 3.2], temperature_2m_min: [9.9, 8.2, -1.4], precipitation_probability_max: [80, 10, 60], sunrise: ['2026-10-05T07:13', '2026-10-06T07:15', '2026-10-07T07:16'], sunset: ['2026-10-05T18:31', '2026-10-06T18:29', '2026-10-07T18:27'] },
  };
}
function mockFetch(handler) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url: String(url), opts });
    const r = await handler(String(url), calls.length);
    if (r instanceof Error) throw r;
    const body = typeof r === 'string' ? r : JSON.stringify(r);
    return { ok: true, status: 200, headers: { get: () => String(body.length) }, text: async () => body };
  };
  f.calls = calls;
  return f;
}

test('WMO codes map to the conditions the sky animates', () => {
  assert.deepEqual(weatherCond(0), { cond: 'clear', label: 'Clear' });
  assert.equal(weatherCond(2).cond, 'partly');
  assert.equal(weatherCond(45).cond, 'fog');
  assert.equal(weatherCond(53).cond, 'drizzle');
  assert.equal(weatherCond(65).cond, 'rain');
  assert.equal(weatherCond(81).cond, 'showers');
  assert.equal(weatherCond(75).cond, 'snow');
  assert.equal(weatherCond(95).cond, 'thunder');
  assert.equal(weatherCond(1234).cond, 'cloudy');
});

test('shapeForecast: now, today, tomorrow and the hours from today, with attribution', () => {
  const f = shapeForecast(raw(), LOC, NOW);
  assert.equal(f.ok, true);
  assert.deepEqual(f.location, { name: 'Testville', admin: 'Shire', country: 'Nowhere', countryCode: 'NW' });
  assert.equal(f.current.temp, 12.4); assert.equal(f.current.cond, 'rain'); assert.equal(f.current.isDay, true);
  assert.equal(f.today.date, '2026-10-05'); assert.equal(f.today.hi, 16.4); assert.equal(f.today.lo, 9.9); assert.equal(f.today.rainChance, 80);
  assert.equal(f.today.sunrise, '07:13'); assert.equal(f.today.sunset, '18:31');
  assert.equal(f.tomorrow.cond, 'partly');
  assert.equal(f.hourly[0].date, '2026-10-05'); assert.equal(f.hourly[0].hour, 0); assert.equal(f.hourly.length, 72);
  assert.equal(f.hourly[9].rain, 70); assert.equal(f.hourly[9].cond, 'rain');
  assert.equal(f.localTime, '2026-10-05T08:40');
  assert.deepEqual(f.attribution, ATTRIBUTION);
  assert.match(ATTRIBUTION.text, /Open-Meteo\.com/); assert.equal(ATTRIBUTION.licence, 'CC BY 4.0');
  assert.equal(shapeForecast({}, LOC, NOW).ok, false);
});

test('forecast URL: only the fixed Open-Meteo host, coordinates and units, nothing personal', () => {
  const u = new URL(forecastUrl(LOC));
  assert.equal(u.origin, 'https://api.open-meteo.com');
  assert.equal(u.searchParams.get('latitude'), '51.5');
  assert.equal(u.searchParams.get('timezone'), 'Europe/London');
  assert.ok(!u.search.includes('Testville'));
  assert.equal(new URL(forecastUrl(LOC, { units: 'imperial' })).searchParams.get('temperature_unit'), 'fahrenheit');
});

test('the service caches for 30 minutes, refreshes on demand and keeps a disk copy', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'weather-'));
  try {
    let now = NOW.getTime();
    const fetchImpl = mockFetch(() => raw());
    const svc = createWeatherService({ cacheFile: join(dir, 'weather.json'), fetchImpl, now: () => new Date(now) });
    const a = await svc.get(LOC);
    assert.equal(a.ok, true); assert.equal(a.cached, false); assert.equal(fetchImpl.calls.length, 1);
    assert.ok(fetchImpl.calls[0].opts.signal, 'every request has a timeout signal');
    assert.equal(fetchImpl.calls[0].opts.redirect, 'error');
    now += 10 * 60 * 1000;
    const b = await svc.get(LOC);
    assert.equal(b.cached, true); assert.equal(fetchImpl.calls.length, 1, 'served from the cache');
    await svc.get(LOC, { refresh: true });
    assert.equal(fetchImpl.calls.length, 2, 'refresh bypasses the cache');
    now += 31 * 60 * 1000;
    await svc.get(LOC);
    assert.equal(fetchImpl.calls.length, 3, 'stale after 30 minutes');
    assert.ok(existsSync(join(dir, 'weather.json')));
    // a new service (server restart) starts from the disk copy
    const svc2 = createWeatherService({ cacheFile: join(dir, 'weather.json'), fetchImpl, now: () => new Date(now) });
    const c = await svc2.get(LOC);
    assert.equal(c.cached, true); assert.equal(fetchImpl.calls.length, 3);
    // two requests at once share one fetch
    const f2 = mockFetch(() => new Promise(r => setTimeout(() => r(raw()), 20)));
    const svc3 = createWeatherService({ fetchImpl: f2, now: () => new Date(now) });
    await Promise.all([svc3.get(LOC), svc3.get(LOC), svc3.get(LOC)]);
    assert.equal(f2.calls.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('offline: one retry, then the last forecast (under 12 h) as stale, else no weather', async () => {
  let now = NOW.getTime();
  let online = true;
  const fetchImpl = mockFetch(() => (online ? raw() : new TypeError('fetch failed')));
  const logs = [];
  const svc = createWeatherService({ fetchImpl, now: () => new Date(now), log: (lvl, msg) => logs.push(msg) });
  await svc.get(LOC);
  online = false; now += 2 * 3600 * 1000;
  const s = await svc.get(LOC);
  assert.equal(s.ok, true); assert.equal(s.stale, true); assert.equal(s.cached, true);
  assert.equal(fetchImpl.calls.length, 3, 'the failed request was retried once');
  now += STALE_MAX_MS;
  const off = await svc.get(LOC);
  assert.deepEqual(off, { ok: false, reason: 'offline' });
  assert.ok(logs.every(m => !/Testville|51\.5/.test(m)), 'the log never names the place');
  // a flaky first connection succeeds on the retry
  let n = 0;
  const flaky = mockFetch(() => (++n === 1 ? new Error('timeout') : raw()));
  assert.equal((await createWeatherService({ fetchImpl: flaky, now: () => NOW }).get(LOC)).ok, true);
  // an HTTP error is not retried
  const bad = async () => ({ ok: false, status: 500, headers: { get: () => null }, text: async () => '' });
  let calls = 0;
  const r = await createWeatherService({ fetchImpl: async (...a) => { calls++; return bad(...a); }, now: () => NOW }).get(LOC);
  assert.equal(r.ok, false); assert.equal(calls, 1);
  // too big a response is refused
  const huge = mockFetch(() => 'x'.repeat(600 * 1024));
  assert.equal((await createWeatherService({ fetchImpl: huge, now: () => NOW }).get(LOC)).ok, false);
});

test('no location, bad locations and the geocoder', async () => {
  const svc = createWeatherService({ fetchImpl: mockFetch(() => raw()) });
  assert.deepEqual(await svc.get(null), { ok: false, reason: 'no-location' });
  assert.deepEqual(await svc.get({ name: 'X', lat: 200, lon: 0 }), { ok: false, reason: 'no-location' });
  const g = mockFetch((url) => ({ results: [
    { name: 'Testville', admin1: 'Shire', country: 'Nowhere', country_code: 'nw', latitude: 51.50001, longitude: -0.12345, timezone: 'Europe/London' },
    { name: '<b>Bad</b>', latitude: 'x', longitude: 2 },
  ] }));
  const res = await createWeatherService({ fetchImpl: g }).geocode('Testv');
  assert.equal(res.length, 1);
  assert.deepEqual(res[0], { name: 'Testville', admin: 'Shire', country: 'Nowhere', countryCode: 'NW', lat: 51.5, lon: -0.1234, timezone: 'Europe/London' });
  const u = new URL(g.calls[0].url);
  assert.equal(u.origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(u.searchParams.get('name'), 'Testv');
  assert.deepEqual(await createWeatherService({ fetchImpl: g }).geocode('x'), [], 'too short: no request');
  assert.equal(g.calls.length, 1);
});

test('config: location and brief settings are validated, defaults filled', () => {
  assert.deepEqual(normBrief({}), { ...BRIEF_DEFAULTS });
  assert.deepEqual(normBrief({ autoOpen: false, model: 'gpt-9', eveningHour: 30, units: 'imperial', ai: 0 }), { ...BRIEF_DEFAULTS, autoOpen: false, eveningHour: 23, units: 'imperial', ai: true });
  assert.ok(!/[<>]/.test(normLocation({ name: '<i>x</i>', lat: 1, lon: 2 }).name), 'no angle brackets survive');
  assert.equal(normLocation({ name: 'A', lat: 91, lon: 0 }), null);
  assert.equal(normLocation({ name: 'A', lat: 1, lon: 2, timezone: 'Mars/Base' }).timezone, '');
  const c = validateConfig({}).config;
  assert.equal(c.location, null);
  assert.deepEqual(c.brief, { ...BRIEF_DEFAULTS });
  const ok = validateConfig({ location: LOC, brief: { eveningHour: 18 } });
  assert.deepEqual(ok.errors, []); assert.equal(ok.config.location.name, 'Testville'); assert.equal(ok.config.brief.eveningHour, 18);
  assert.ok(validateConfig({ location: { name: 'x' } }).errors.some(e => /location/.test(e)));
  assert.equal(validateConfig({ location: null }).config.location, null, 'null clears it');
});
