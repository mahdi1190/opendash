// Card payments abroad (travel spec 3.1 B, 3.2 trFxSignal, 5.5): the memo reader on 40+
// synthetic memo styles - currency and amount, the bank's rate, a trailing country code or
// name, cash abroad, card fees - and the rule that matters most: an online biller billed
// from Ireland, the Netherlands or Luxembourg is NEVER a trip. Then payment episodes
// (2 days, or cash, make a candidate) and the online rates helper (one fixed host, mocked).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { L, P } from './fixtures/travel/kit.mjs';
import { createRates, ownRate, RATES_HOST } from '../lib/travel-rates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEMOS = JSON.parse(readFileSync(join(HERE, 'fixtures', 'travel', 'memos.json'), 'utf8')).memos;
const O = { homeCcy: 'GBP', homeCc: 'GB', P };

test('memo styles: currency, amount, rate, country, cash, fees, online billers', () => {
  assert.ok(MEMOS.length >= 30, '30 memo styles at least');
  for (const m of MEMOS) {
    const s = L.trFxSignal(m.memo, O);
    for (const k of Object.keys(m)) {
      if (k === 'memo') continue;
      assert.deepEqual(s[k], m[k], `${m.memo}: ${k}`);
    }
  }
});

test('online billers from IE, NL and LU never start a trip, even with a foreign currency', () => {
  const online = MEMOS.filter(m => m.online);
  assert.ok(online.length >= 8);
  for (const cc of ['IE', 'NL', 'LU']) assert.ok(online.some(m => m.memo.endsWith(cc) || m.memo.includes(cc + ' ')), 'a biller billed from ' + cc);
  const rows = online.flatMap((m, i) => [{ date: '2026-10-0' + (1 + (i % 5)), memo: m.memo }, { date: '2026-10-0' + (2 + (i % 5)), memo: m.memo }]);
  assert.deepEqual(L.trPayEpisodes(rows, O), [], 'no episode from online billers');
});

test('a merchant the finance model marks as recurring is online too', () => {
  const s = L.trFxSignal('GYM CLUB DUBLIN IE', Object.assign({}, O, { recurring: new Set(['gym club']), merchant: 'Gym Club' }));
  assert.equal(s.online, true);
  assert.equal(s.abroad, false);
});

test('a home memo, a home currency and a weak code are not abroad', () => {
  assert.equal(L.trFxSignal('TESCO 12.50 GBP', O).abroad, false);
  assert.equal(L.trFxSignal('PAYMENT TO', O).cc, null, '"TO" (Tonga) is a word here');
  assert.equal(L.trFxSignal('KEBAB HOUSE IN', O).cc, null, '"IN" (India) is a word here');
  assert.equal(L.trFxSignal('MIGROS ZURICH CH', O).cc, 'CH', 'a weak code counts when a city of that country comes before it');
  assert.equal(L.trFxSignal('KIOSK 12.00 CHF CH', O).cc, 'CH', '... or the currency is that country\'s');
});

test('dollar and yen symbols follow the country when there is one', () => {
  assert.equal(L.trFxSignal('$12.00 CAFE SYDNEY AUS', O).ccy, 'AUD');
  assert.equal(L.trFxSignal('$12.00 DINER NEW YORK USA', O).ccy, 'USD');
});

test('payment episodes: 2 days or cash abroad make one per country; gaps of 3 days or less join', () => {
  const rows = [
    { date: '2026-10-11', memo: 'LAWSON SHIBUYA TOKYO JPN' },
    { date: '2026-10-11', memo: 'NON-STERLING TRANSACTION FEE' },
    { date: '2026-10-13', memo: '7-ELEVEN HANEDA JPY 1,200.00 @ 189.50' },
    { date: '2026-10-14', memo: 'APPLE.COM/BILL CORK IE' },
    { date: '2026-10-20', memo: 'PINGO DOCE LISBOA PRT' },
    { date: '2026-11-02', memo: 'CASH WITHDRAWAL SEVEN BANK JP' },
  ];
  const eps = L.trPayEpisodes(rows, O);
  assert.deepEqual(eps.map(e => [e.cc, e.from, e.to, e.days, e.atm]), [
    ['JP', '2026-10-11', '2026-10-13', 2, false],
    ['PT', '2026-10-20', '2026-10-20', 1, false],
    ['JP', '2026-11-02', '2026-11-02', 1, true],
  ]);
  // Rows already read by /api/finance/travel (no memo) give the same answer.
  const read = rows.map(r => { const s = L.trFxSignal(r.memo, O); return { date: r.date, cc: s.online ? null : s.cc, fx: s.ccy ? { ccy: s.ccy, amt: s.amt } : null, atm: s.atm, fee: s.fee }; });
  assert.deepEqual(L.trPayEpisodes(read, O).map(e => [e.cc, e.from, e.days]), eps.map(e => [e.cc, e.from, e.days]));
});

test('own rate: the bank\'s rate, else original over charged; the newest wins', () => {
  assert.equal(ownRate([], 'JPY'), null);
  assert.deepEqual(ownRate([{ date: '2026-10-11', amount: -6.33, fx: { ccy: 'JPY', amt: 1200, rate: null } }, { date: '2026-10-12', amount: -10, fx: { ccy: 'JPY', amt: 1895, rate: 189.5 } }], 'JPY'),
    { rate: 189.5, date: '2026-10-12', source: 'own' });
  assert.equal(ownRate([{ date: '2026-10-11', amount: -6.25, fx: { ccy: 'JPY', amt: 1200 } }], 'JPY').rate, 192);
});

test('online rates (opt-in): only the fixed host, two currency codes, cached per day, failures quiet', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'trrates-'));
  try {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(url);
      assert.equal(new URL(url).host, RATES_HOST);
      assert.equal(init.redirect, 'error');
      return { ok: true, headers: { get: () => null }, text: async () => JSON.stringify({ amount: 1, base: 'GBP', date: '2026-10-09', rates: { JPY: 190.12 } }) };
    };
    const logs = [];
    const r = createRates({ dir, fetchImpl, log: (lv, m) => logs.push(m), now: () => new Date('2026-10-09T10:00:00Z') });
    assert.deepEqual(await r.online('GBP', 'JPY'), { rate: 190.12, date: '2026-10-09', source: 'online' });
    assert.deepEqual(await r.online('GBP', 'JPY'), { rate: 190.12, date: '2026-10-09', source: 'online' });
    assert.equal(calls.length, 1, 'cached for the day');
    assert.equal(new URL(calls[0]).search, '?from=GBP&to=JPY', 'two currency codes, nothing else');
    assert.equal(await r.online('GBP', 'gbp'), null);
    assert.equal(await r.online('../x', 'JPY'), null, 'bad codes never reach the network');
    assert.equal(calls.length, 1);
    const again = createRates({ dir, fetchImpl: async () => { throw new Error('offline'); }, log: (lv, m) => logs.push(m), now: () => new Date('2026-10-09T12:00:00Z') });
    assert.equal((await again.online('GBP', 'JPY')).rate, 190.12, 'the day\'s answer comes from the cache file');
    const down = createRates({ dir, fetchImpl: async () => { throw new Error('offline'); }, log: (lv, m) => logs.push(m), now: () => new Date('2026-10-10T12:00:00Z') });
    assert.equal(await down.online('GBP', 'JPY'), null);
    for (const m of logs) assert.ok(!/JPY|GBP|190/.test(m), 'logs carry no codes or rates: ' + m);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
