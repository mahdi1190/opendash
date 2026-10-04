// Public holidays (travel spec 5.4): the offline rules for about 30 countries
// against official lists for 2026-2028 (tests/fixtures/travel/holidays-official.json),
// substitute days (next free weekday, Saturday -> Friday / Sunday -> Monday,
// Japan's furikae and citizens' holiday), the equinox formula, Easter, GB regions,
// and the opt-in online lookup (one fixed host, mocked fetch, cached per country
// and year; its days replace only the estimated ones).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { places as P, holidays, holidayOn, holidaysBetween } from '../lib/travel-data.mjs';
import { holidaysFor } from '../lib/travel-logic.mjs';
import { onlineHolidays, mergeHolidays, parseNager, holidaysUrl, HOLIDAYS_HOST } from '../lib/holidays-online.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OFFICIAL = JSON.parse(readFileSync(join(HERE, 'fixtures', 'travel', 'holidays-official.json'), 'utf8'));
const dn = (iso) => Date.parse(iso + 'T00:00:00Z') / 864e5;
const dates = (cc, y, o) => holidays(cc, y, o).map(h => h.date);

test('about 30 countries, each checked against the official lists for 2026-2028', () => {
  const ccs = P.trHolidayCountries();
  assert.ok(ccs.length >= 29, `${ccs.length} countries`);
  for (const cc of ['GB', 'IE', 'US', 'CA', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'CH', 'AT', 'PL', 'SE', 'NO', 'DK', 'FI', 'IS', 'GR', 'TR', 'AE', 'PK', 'IN', 'JP', 'CN', 'SG', 'AU', 'NZ']) {
    assert.ok(ccs.includes(cc), cc);
  }
  let checked = 0;
  for (const key of Object.keys(OFFICIAL).filter(k => !k.startsWith('_'))) {
    const [cc, region] = key.split('-');
    assert.ok(ccs.includes(cc), `fixture ${key} has rules`);
    for (const y of [2026, 2027, 2028]) {
      const want = String(OFFICIAL[key][y] || '').split(' ').filter(Boolean).map(md => `${y}-${md.slice(0, 2)}-${md.slice(2)}`);
      const mine = holidays(cc, y, { region });
      const have = new Set(mine.map(h => h.date));
      const est = mine.filter(h => h.estimated);
      // Every official day off is there (a lunar or announced one: within 2 days of the estimate).
      for (const d of want) assert.ok(have.has(d) || est.some(e => Math.abs(dn(e.date) - dn(d)) <= 2), `${key} ${y}: ${d} is missing`);
      // Every rule-made day off (not estimated, not moved to a substitute, not regional) is official.
      for (const h of mine) if (!h.estimated && !h.moved && !h.partial) assert.ok(want.includes(h.date), `${key} ${y}: ${h.date} ${h.name} is not official`);
      checked += want.length;
    }
  }
  assert.ok(checked > 1000, `${checked} official days checked`);
});

test('Easter (Western and Orthodox) and the Japanese equinoxes', () => {
  assert.deepEqual([2026, 2027, 2028, 2029, 2030].map(y => P.trEasterIso(y)), ['2026-04-05', '2027-03-28', '2028-04-16', '2029-04-01', '2030-04-21']);
  assert.deepEqual([2026, 2027, 2028, 2029, 2030].map(y => P.trEasterIso(y, true)), ['2026-04-12', '2027-05-02', '2028-04-16', '2029-04-08', '2030-04-28']);
  assert.deepEqual([2026, 2027, 2028, 2029, 2030].map(y => P.trJpEquinox(y, 'spring')), [20, 21, 20, 20, 20]);
  assert.deepEqual([2026, 2027, 2028, 2029, 2030].map(y => P.trJpEquinox(y, 'autumn')), [23, 23, 22, 23, 23]);
});

test('substitute days: next free weekday, observed Friday / Monday, Sunday to Monday', () => {
  const on = (cc, iso, o) => holidayOn(cc, iso, o);
  // GB: Christmas on a Saturday and Boxing Day on a Sunday -> Monday 27 and Tuesday 28.
  assert.deepEqual(holidays('GB', 2027).filter(h => h.date >= '2027-12-25').map(h => [h.date, !!h.sub, !!h.moved]),
    [['2027-12-25', false, true], ['2027-12-26', false, true], ['2027-12-27', true, false], ['2027-12-28', true, false]]);
  // GB: Christmas on a Sunday -> Tuesday 27 (Boxing Day keeps Monday 26).
  assert.equal(on('GB', '2022-12-27').name, 'Christmas Day (substitute day)');
  assert.equal(on('GB', '2022-12-26').name, 'Boxing Day');
  // US: Saturday -> Friday (even across the year end), Sunday -> Monday.
  assert.equal(on('US', '2026-07-03').name, 'Independence Day (observed)');
  assert.equal(on('US', '2027-12-31').name, 'New Year\'s Day (observed)', 'in 2027\'s list: 1 Jan 2028 is a Saturday');
  assert.equal(on('US', '2028-12-25').sub, undefined);
  assert.equal(on('US', '2022-12-26').name, 'Christmas Day (observed)');
  // Singapore and Canada: only Sundays move.
  assert.equal(on('SG', '2026-08-10').name, 'National Day (substitute day)');
  assert.equal(on('SG', '2026-06-01').name, 'Vesak Day (substitute day)');
  assert.equal(on('CA', '2029-07-02').name, 'Canada Day (substitute day)');
  // Australia, New Zealand (Mondayisation of the pairs).
  assert.equal(on('AU', '2028-01-03').name, 'New Year\'s Day (substitute day)');
  assert.deepEqual(['2028-01-03', '2028-01-04'].map(d => on('NZ', d).sub), [true, true]);
  assert.equal(on('NZ', '2026-04-27').name, 'Anzac Day (substitute day)');
  // The Netherlands: King's Day on a Sunday is kept on the Saturday before.
  assert.equal(on('NL', '2025-04-26').name, 'King\'s Day');
  assert.equal(on('NL', '2025-04-27'), null);
  // Ireland and most of Europe: no substitutes.
  assert.equal(holidays('FR', 2026).some(h => h.sub), false);
});

test('Japan: furikae (Sunday -> next non-holiday) and the citizens\' holiday between two holidays', () => {
  const jp = holidays('JP', 2026);
  assert.equal(jp.find(h => h.date === '2026-05-06').name, 'Substitute holiday', '3 May is a Sunday; 4 and 5 May are holidays');
  assert.equal(jp.find(h => h.date === '2026-09-22').name, 'Citizens\' holiday');
  assert.equal(holidayOn('JP', '2027-03-22').name, 'Substitute holiday');
  assert.equal(holidayOn('JP', '2026-10-12').name, 'Sports Day', 'second Monday of October');
  assert.equal(holidayOn('JP', '2026-01-12').name, 'Coming of Age Day');
  assert.equal(jp.some(h => h.estimated), false, 'Japan needs no table');
});

test('GB regions: England & Wales by default; Scotland and Northern Ireland; all with region tags', () => {
  assert.deepEqual(P.trHolidayRegions('GB').map(r => r.id), ['ENG', 'SCT', 'NIR']);
  assert.deepEqual(P.trHolidayRegions('FR'), []);
  const eng = dates('GB', 2026), sct = dates('GB', 2026, { region: 'SCT' }), nir = dates('GB', 2026, { region: 'GB-NIR' });
  assert.deepEqual(dates('GB', 2026, { region: 'WLS' }), eng, 'Wales = England');
  assert.ok(eng.includes('2026-04-06') && !sct.includes('2026-04-06'), 'Easter Monday is not a Scottish bank holiday');
  assert.ok(sct.includes('2026-01-02') && sct.includes('2026-08-03') && sct.includes('2026-11-30'));
  assert.ok(nir.includes('2026-03-17') && nir.includes('2026-07-13'), 'the Boyne on Sunday 12 July -> Monday 13');
  const all = holidays('GB', 2026, { region: '*' });
  assert.deepEqual(all.find(h => h.date === '2026-01-02').regions, ['SCT']);
  assert.equal(all.find(h => h.date === '2026-12-25').regions, undefined, 'everywhere: no tags');
  assert.deepEqual(all.find(h => h.date === '2026-04-06').regions, ['ENG', 'NIR']);
});

test('estimated dates: only lunar and announced days, and only for 2026-2031', () => {
  for (const cc of P.trHolidayCountries()) for (const h of holidays(cc, 2026)) if (h.estimated) assert.ok(['TR', 'AE', 'PK', 'IN', 'CN', 'SG'].includes(cc), `${cc} ${h.name}`);
  assert.equal(holidayOn('CN', '2026-02-17').name, 'Spring Festival');
  assert.equal(holidayOn('CN', '2026-02-17').estimated, true);
  assert.equal(holidayOn('NZ', '2027-06-25').name, 'Matariki');
  assert.equal(holidayOn('NZ', '2027-06-25').estimated, undefined, 'Matariki dates are set in law');
  assert.equal(P.trHolidayCoverage('CN', 2027), 'full');
  assert.equal(P.trHolidayCoverage('CN', 2035), 'partial');
  assert.equal(P.trHolidayCoverage('FR', 2035), 'full');
  assert.equal(P.trHolidayCoverage('ZZ', 2026), 'none');
  assert.ok(holidays('CN', 2035).length >= 4, 'the solar-calendar days still come');
  assert.equal(holidays('CN', 2035).some(h => /Spring/.test(h.name)), false);
});

test('ranges, lookups, bad input, and page/Node parity', () => {
  const r = holidaysBetween('GB', '2026-12-20', '2027-01-05');
  assert.deepEqual(r.map(h => h.date), ['2026-12-25', '2026-12-26', '2026-12-28', '2027-01-01']);
  assert.equal(holidayOn('DE', '2026-10-03').name, 'German Unity Day');
  assert.equal(holidayOn('DE', '2026-10-04'), null);
  assert.equal(holidayOn('DE', 'nonsense'), null);
  assert.deepEqual(holidays('ZZ', 2026), []);
  assert.deepEqual(holidays('GB', 'soon'), []);
  assert.deepEqual(holidaysBetween('GB', '2027-01-01', '2026-01-01'), []);
  assert.equal(holidayOn('IT', '2026-10-04').name, 'St Francis\' Day', 'a new national holiday from 2026');
  assert.equal(holidayOn('IT', '2025-10-04'), null);
  assert.deepEqual(holidaysFor('JP', 2026), holidays('JP', 2026), 'the server reads the same rules');
  const a = holidays('JP', 2026); a.length = 0;
  assert.ok(holidays('JP', 2026).length > 10, 'callers get a copy');
  // Day numbers agree with the calendar for 200 years (no Date objects in the page file).
  for (let y = 1900; y <= 2099; y += 7) assert.equal(P.trEasterIso(y), new Date(Date.UTC(y, 0, 1) + (dn(P.trEasterIso(y)) - dn(`${y}-01-01`)) * 864e5).toISOString().slice(0, 10));
  assert.equal(P._trhIso(P._trhDn(2000, 2, 29)), '2000-02-29');
  assert.equal(P._trhDn(1970, 1, 1), 0);
  assert.equal(P._trhIso(-1), '1969-12-31');
});

/* ---------- the opt-in online lookup ---------- */
const NAGER = [
  { date: '2026-01-01', localName: 'New Year', name: 'New Year\'s Day', global: true, counties: null, types: ['Public'] },
  { date: '2026-03-20', localName: 'Bayram', name: 'Eid al-Fitr', global: true, counties: null, types: ['Public'] },
  { date: '2026-03-17', localName: 'x', name: 'Regional Day', global: false, counties: ['GB-NIR'], types: ['Public'] },
  { date: '2026-05-08', localName: 'x', name: 'Observance only', global: true, counties: null, types: ['Observance'] },
  { date: '2027-01-01', localName: 'x', name: 'Wrong year', global: true, counties: null, types: ['Public'] },
  { date: 'soon', name: 'Bad date', global: true, types: ['Public'] },
  { date: '2026-06-01', name: '<img src=x onerror=alert(1)>', global: true, types: ['Public'] },
];
function mockFetch(answer, { status = 200, headers = {} } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    const text = typeof answer === 'string' ? answer : JSON.stringify(answer);
    return { ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, text: async () => text };
  };
  fn.calls = calls;
  return fn;
}

test('online: one fixed host and path; only a country code and a year leave the machine', async () => {
  assert.equal(HOLIDAYS_HOST, 'date.nager.at');
  assert.equal(holidaysUrl('jp', 2026), 'https://date.nager.at/api/v3/PublicHolidays/2026/JP');
  assert.throws(() => holidaysUrl('J/P', 2026), /two letters/);
  assert.throws(() => holidaysUrl('JP', 1999), /2000-2100/);
  const f = mockFetch(NAGER);
  const days = await onlineHolidays('TR', 2026, { fetchImpl: f });
  assert.equal(f.calls.length, 1);
  assert.equal(new URL(f.calls[0].url).host, HOLIDAYS_HOST);
  assert.equal(f.calls[0].opts.redirect, 'error');
  assert.ok(f.calls[0].opts.signal, 'a timeout');
  assert.deepEqual(days.map(d => d.date), ['2026-01-01', '2026-03-20', '2026-06-01'], 'public, national, this year, valid dates only');
  assert.doesNotMatch(days[2].name, /[<>]/, 'names are cleaned');
  await assert.rejects(onlineHolidays('../x', 2026, { fetchImpl: f }), /two letters/);
  assert.equal(f.calls.length, 1, 'bad input never reaches the network');
});

test('online: regions, unknown countries, errors and size cap', async () => {
  assert.deepEqual(parseNager(NAGER, 'GB', 2026, 'NIR').map(d => d.date), ['2026-01-01', '2026-03-17', '2026-03-20', '2026-06-01']);
  assert.deepEqual(parseNager(NAGER, 'GB', 2026, 'NIR')[1].regions, ['NIR']);
  assert.deepEqual(await onlineHolidays('XK', 2026, { fetchImpl: mockFetch('', { status: 404 }) }), [], 'a country Nager lacks: none');
  await assert.rejects(onlineHolidays('JP', 2026, { fetchImpl: mockFetch('', { status: 500 }) }), /HTTP 500/);
  await assert.rejects(onlineHolidays('JP', 2026, { fetchImpl: mockFetch('{"not":"a list"}') }), /not a list/);
  await assert.rejects(onlineHolidays('JP', 2026, { fetchImpl: mockFetch('[]', { headers: { 'content-length': String(10 * 1024 * 1024) } }) }), /too large/);
  await assert.rejects(onlineHolidays('JP', 2026, { fetchImpl: mockFetch('x'.repeat(300 * 1024)) }), /too large/);
  const logs = [];
  await assert.rejects(onlineHolidays('JP', 2026, { fetchImpl: async () => { throw Object.assign(new Error('offline'), { name: 'TypeError' }); }, log: (lvl, m) => logs.push(m) }));
  assert.deepEqual(logs, ['travel holidays online failed (TypeError)'], 'logs say what failed, never the country');
});

test('online: cached per country and year for a year, in the data folder', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'trhol-'));
  try {
    const f = mockFetch(NAGER);
    let t = Date.UTC(2026, 0, 1);
    const now = () => t;
    const a = await onlineHolidays('TR', 2026, { dir, fetchImpl: f, now });
    assert.ok(existsSync(join(dir, 'holidays-TR-2026.json')));
    const b = await onlineHolidays('TR', 2026, { dir, fetchImpl: f, now });
    assert.deepEqual(b, a);
    assert.equal(f.calls.length, 1, 'the second ask is answered from the cache');
    t += 366 * 864e5;
    await onlineHolidays('TR', 2026, { dir, fetchImpl: f, now });
    assert.equal(f.calls.length, 2, 'a year later: asked again');
    const stored = JSON.parse(readFileSync(join(dir, 'holidays-TR-2026.json'), 'utf8'));
    assert.deepEqual(Object.keys(stored.rows[0]).sort(), ['counties', 'date', 'global', 'localName', 'name', 'types']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('online days replace only the estimated offline ones', () => {
  const offline = holidays('TR', 2026);
  assert.ok(offline.some(h => h.estimated));
  const merged = mergeHolidays(offline, [{ date: '2026-03-21', name: 'Ramazan Bayramı' }, { date: '2026-01-01', name: 'Yılbaşı' }]);
  assert.equal(merged.some(h => h.estimated), false);
  assert.ok(merged.find(h => h.date === '2026-10-29'), 'rule-made days stay');
  assert.equal(merged.filter(h => h.date === '2026-01-01').length, 1, 'no duplicates');
  assert.equal(merged.find(h => h.date === '2026-03-21').name, 'Ramazan Bayramı');
  assert.equal(merged.find(h => h.date === '2026-03-20'), undefined, 'the estimate is gone');
  assert.deepEqual(mergeHolidays(offline, []), offline, 'nothing online: offline as it was');
});
