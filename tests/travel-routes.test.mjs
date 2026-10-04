// The travel routes (travel spec 3.5, 5.4, 5.5, 7.2, 7.3 "Server"): /api/finance/travel stays
// inside its window, leaves online billers out, totals by currency with fees on their own line
// and logs counts only; /api/travel/weather refuses unknown cities and never forwards page
// input (only the table's own position goes to Open-Meteo, mocked here); /api/travel/holidays
// validates its input. The whole server runs in-process on FAKE demo data with a fake trip
// (tools/make-fake-data.mjs --trip).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { writeFakeData } from '../tools/make-fake-data.mjs';
import { setTravelFetch } from '../server/routes/travel.mjs';

let dir, port, srv;
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function get(path, headers = {}, method = 'GET', body) {
  const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
  if (data) headers = { 'Content-Type': 'application/json', 'Content-Length': String(data.length), ...headers };
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, agent: false,
      headers: { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...headers } }, (r) => {
      const chunks = []; r.on('data', d => chunks.push(d));
      r.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(t); } catch {} res({ status: r.statusCode, json, text: t }); });
    });
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}
const setConfig = (patch) => {
  const f = join(dir, 'config.json');
  const cur = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  writeFileSync(f, JSON.stringify(Object.assign(cur, patch), null, 1));
};

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'trroutes-'));
  await writeFakeData(dir, { trip: true });
  setConfig({ timezone: 'Europe/London', currency: 'GBP', travel: { on: true } });
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
});
after(async () => {
  setTravelFetch(null);
  await srv?.close();
  rmSync(dir, { recursive: true, force: true });
});

test('/api/finance/travel: the Lisbon payments in euros, fees apart, no online biller, counts-only logs', async () => {
  const r = await get(`/api/finance/travel?from=${day(-25)}&to=${day(-18)}`);
  assert.equal(r.status, 200);
  const j = r.json;
  assert.ok(j.rows.length >= 7);
  for (const row of j.rows) assert.ok(row.date >= day(-25) && row.date <= day(-18), 'inside the window');
  assert.ok(!j.rows.some(x => /CLOUDNOTES/i.test(x.merchant) || x.cc === 'IE'), 'an online biller billed from Ireland is never travel');
  assert.equal(j.totals.byCcy.EUR.n, 5);
  assert.equal(j.totals.byCcy.EUR.orig, 129.4);
  assert.equal(j.totals.fees, 1.24);
  assert.ok(j.rows.some(x => x.atm), 'the cash withdrawal');
  assert.equal(j.rates.EUR.source, 'own');
  assert.ok(j.rates.EUR.rate > 1.14 && j.rates.EUR.rate < 1.16);
  const log = readFileSync(join(dir, 'logs', 'server.log'), 'utf8');
  assert.match(log, /finance travel: \d+ read, \d+ abroad/);
  assert.ok(!/LISBOA|PASTELARIA|EUR|129/.test(log), 'no memos, places or amounts in the log');
});

test('/api/finance/travel: nothing outside the window; bad input refused; same origin only', async () => {
  const r = await get(`/api/finance/travel?from=${day(-10)}&to=${day(0)}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.rows, []);
  assert.equal((await get('/api/finance/travel?from=2026-1-1&to=2026-02-01')).status, 400);
  assert.equal((await get(`/api/finance/travel?from=${day(0)}&to=${day(-3)}`)).status, 400);
  assert.equal((await get('/api/finance/travel?from=2020-01-01&to=2026-01-01')).status, 400, 'at most 400 days');
  assert.equal((await get(`/api/finance/travel?from=${day(-3)}&to=${day(0)}&cc=JPN`)).status, 400);
  const cross = await get(`/api/finance/travel?from=${day(-3)}&to=${day(0)}`, { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(cross.status, 403);
});

test('/api/travel/weather: unknown city 404; only the table\'s own position goes out; off when travel is off', async () => {
  const calls = [];
  setTravelFetch(async (url) => {
    calls.push(String(url));
    const daily = { time: ['2026-10-04', '2026-10-05'], weather_code: [61, 3], temperature_2m_max: [19, 21], temperature_2m_min: [14, 15], precipitation_probability_max: [80, 20], sunrise: ['2026-10-04T05:40', '2026-10-05T05:41'], sunset: ['2026-10-04T17:20', '2026-10-05T17:19'] };
    const body = JSON.stringify({ timezone: 'Asia/Tokyo', current: { time: '2026-10-04T15:00', temperature_2m: 18, weather_code: 61, is_day: 1 }, hourly: { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [] }, daily });
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  });
  assert.equal((await get('/api/travel/weather?place=atlantis-xx')).status, 404);
  assert.equal(calls.length, 0);
  const r = await get('/api/travel/weather?place=tokyo-jp&lat=1&lon=2&url=https://evil.example');
  assert.equal(r.status, 200);
  assert.equal(r.json.place, 'tokyo-jp');
  assert.equal(calls.length, 1);
  const u = new URL(calls[0]);
  assert.equal(u.host, 'api.open-meteo.com');
  assert.ok(Math.abs(Number(u.searchParams.get('latitude')) - 35.69) < 0.2, 'Tokyo\'s own latitude, not the page\'s');
  assert.ok(!calls[0].includes('evil'));
  assert.equal((await get('/api/config', {}, 'PUT', { travel: { on: false } })).status, 200);
  const off = await get('/api/travel/weather?place=tokyo-jp');
  assert.deepEqual([off.status, off.json.ok, off.json.reason], [200, false, 'off']);
  await get('/api/config', {}, 'PUT', { travel: { on: true } });
});

test('/api/travel/holidays: input checked; the offline rules (when present) answer', async () => {
  assert.equal((await get('/api/travel/holidays?cc=GBR&year=2026')).status, 400);
  assert.equal((await get('/api/travel/holidays?cc=GB&year=1900')).status, 400);
  assert.equal((await get('/api/travel/holidays?cc=GB&year=2026&region=../x')).status, 400);
  const r = await get('/api/travel/holidays?cc=GB&year=2026');
  assert.equal(r.status, 200);
  assert.ok(['offline', 'none'].includes(r.json.rules), 'no network unless opted in');
  assert.ok(Array.isArray(r.json.days));
});
