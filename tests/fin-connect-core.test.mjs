// lib/fin-connect/ core: normalisation, the read-only allowlist client, local
// secrets, the cross-provider duplicate check, historical exchange rates, and
// the Monzo normaliser. Pure / in-process; no network (fetch is always a fake).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { finishRow, finishRows, cleanMemo, cleanCategory, dateIn, fxNote } from '../lib/fin-connect/normalise.mjs';
import { readOnlyClient, allowedBy } from '../lib/fin-connect/http.mjs';
import { secretsFor, maskId } from '../lib/fin-connect/secrets.mjs';
import { findDuplicates } from '../lib/fin-connect/overlap.mjs';
import { FinError, defineProvider } from '../lib/fin-connect/provider.mjs';
import { createRates } from '../lib/travel-rates.mjs';
import monzo, { CATEGORY } from '../lib/fin-connect/monzo.mjs';
import { validateSource } from '../lib/sources.mjs';
import { cleanMerchant } from '../lib/finance/categorise.mjs';

const tmp = (p) => mkdtempSync(join(tmpdir(), p));

test('normalise: sign from the amount only, integers end to end, memo cleaned, window and zero rows dropped', async () => {
  const base = { accountId: 'acc_1', date: '2026-10-01', currency: 'GBP' };
  assert.deepEqual((await finishRow({ ...base, minor: -1234, memo: 'REFUND to you' }, { home: 'GBP' })).row,
    { id: null, accountId: 'acc_1', date: '2026-10-01', pence: -1234, memo: 'REFUND to you', bc: null, sub: '' }, 'the word "refund" never flips the sign');
  assert.equal((await finishRow({ ...base, minor: 0, memo: 'x' })).reason, 'zero amount');
  assert.equal((await finishRow({ ...base, minor: 12.5, memo: 'x' })).reason, 'bad amount');
  assert.equal((await finishRow({ ...base, accountId: '../x', minor: 1, memo: 'x' })).reason, 'bad account');
  assert.equal((await finishRow({ ...base, minor: 1, memo: 'x' }, { from: '2026-10-02' })).reason, 'outside window');
  assert.equal((await finishRow({ ...base, minor: 1, memo: 'x' }, { maxDate: '2026-09-30' })).reason, 'outside window');
  // Formula prefixes, control and bidi characters, length.
  const odd = (await finishRow({ ...base, minor: -1, memo: '=HYPERLINK("x")‮\u0007 shop' + 'y'.repeat(300) })).row.memo;
  assert.ok(!/^[=+@-]/.test(odd) && !/[‮\u0007]/.test(odd) && odd.length <= 200);
  assert.equal(cleanMemo('  @@+-Cafe  '), 'Cafe');
  assert.equal(cleanCategory('Eating out'), 'Eating out');
  assert.equal(cleanCategory('<script>'), null);
  assert.equal(cleanCategory('general'), null);
  // ts is dated in the user's zone (late evening in London is the next day in UTC+... and vice versa).
  assert.equal(dateIn('2026-06-30T23:30:00Z', 'Europe/London'), '2026-07-01');
  assert.equal((await finishRow({ ...base, date: undefined, ts: '2026-06-30T23:30:00Z', minor: -5, memo: 'x' }, { timeZone: 'Europe/London' })).row.date, '2026-07-01');
  // Currencies with other minor units.
  assert.equal((await finishRow({ ...base, currency: 'JPY', minor: -1200, memo: 'x' }, { home: 'JPY' })).row.pence, -120000);
});

test('normalise: another currency is converted at that day\'s rate with the original in the memo; no rate = held back', async () => {
  const fx = async (from, to, date) => (from === 'USD' && to === 'GBP' && date === '2026-10-01' ? 0.75 : null);
  const r = (await finishRow({ accountId: 'w-1', date: '2026-10-01', currency: 'USD', minor: -1234, memo: 'Plasma transfer' }, { home: 'GBP', fx })).row;
  assert.equal(r.pence, -926);           // 12.34 * 0.75 = 9.255 -> 9.26 (rounded), money out stays negative
  assert.equal(r.memo, 'Plasma transfer (12.34 USD @ 0.7500)');
  assert.equal(fxNote(-100, 'USD', 0.8), '(1.00 USD @ 0.8000)');
  assert.equal(cleanMerchant(r.memo), 'PLASMA TRANSFER', 'the note is not part of the merchant');
  const all = await finishRows([
    { accountId: 'w-1', date: '2026-10-01', currency: 'USD', minor: 500, memo: 'in', id: 'a' },
    { accountId: 'w-1', date: '2026-10-02', currency: 'USD', minor: 500, memo: 'no rate yet', id: 'b' },
    { accountId: 'w-1', date: '2026-10-01', currency: 'USD', minor: 500, memo: 'in', id: 'a' },
  ], { home: 'GBP', fx });
  assert.equal(all.rows.length, 1);
  assert.equal(all.heldForRate, 1);
  assert.deepEqual(all.rejected, { 'no exchange rate': 1, duplicate: 1 });
});

test('Monzo normaliser: declined, pending dropped; merchant > counterparty > description; pots are transfers', () => {
  const n = (x) => monzo.normalise({ accountId: 'acc_1', id: 'tx_1', created: '2026-10-01T10:00:00Z', settled: '2026-10-02T00:00:00Z', amount: -450, currency: 'GBP', description: 'RAW TEXT', category: 'eating_out', ...x });
  assert.equal(n({ decline: 'INSUFFICIENT_FUNDS' }).reason, 'declined');
  assert.equal(n({ settled: '' }).reason, 'pending');
  assert.equal(n({ merchant: { name: 'Bean There Cafe' } }).row.memo, 'Bean There Cafe');
  assert.equal(n({ counterparty: { name: 'A Friend' } }).row.memo, 'A Friend');
  assert.equal(n({}).row.memo, 'RAW TEXT');
  assert.equal(n({}).row.bc, 'Eating out');
  assert.equal(n({}).row.minor, -450);
  const pot = n({ potId: 'pot_1', potName: 'Holiday', category: 'savings' }).row;
  assert.equal(pot.memo, 'To pot: Holiday');
  assert.equal(pot.sub, 'FT');
  assert.equal(pot.bc, 'Transfers');
  assert.equal(n({ potId: 'pot_1', amount: 1000 }).row.memo, 'From pot: Pot');
  assert.equal(n({ category: 'transfers' }).row.sub, 'FT');
  assert.equal(n({ category: 'category_0000AbC' }).row.bc, null, 'custom categories are not guessed');
  assert.equal(CATEGORY.groceries, 'Groceries');
});

test('read-only client: every forbidden Monzo call is refused BEFORE anything is sent', async () => {
  let sent = 0;
  const logs = [];
  const http = readOnlyClient(monzo.allow, { provider: 'monzo', fetchFn: async () => { sent++; return new Response('{}'); }, log: (lvl, msg) => logs.push(msg) });
  const forbidden = [
    ['PUT', 'https://api.monzo.com/pots/pot_1/deposit'], ['PUT', 'https://api.monzo.com/pots/pot_1/withdraw'],
    ['POST', 'https://api.monzo.com/feed'], ['PATCH', 'https://api.monzo.com/transactions/tx_1'],
    ['POST', 'https://api.monzo.com/attachment/upload'], ['POST', 'https://api.monzo.com/attachment/register'],
    ['PUT', 'https://api.monzo.com/transaction-receipts'], ['POST', 'https://api.monzo.com/webhooks'],
    ['DELETE', 'https://api.monzo.com/webhooks/webhook_1'], ['GET', 'https://api.monzo.com/transactions'],   // no account_id
    ['GET', 'http://api.monzo.com/accounts'], ['GET', 'https://evil.example/accounts'], ['GET', 'https://api.monzo.com.evil.example/accounts'],
    ['GET', 'https://user:pw@api.monzo.com/accounts'], ['GET', 'https://api.monzo.com:8443/accounts'], ['GET', 'https://api.monzo.com/accounts/../pots/pot_1/deposit'],
  ];
  for (const [m, u] of forbidden) {
    await assert.rejects(http.request(m, u), (e) => e instanceof FinError && e.code === 'POLICY', `${m} ${u}`);
  }
  await assert.rejects(http.request('POST', 'https://api.monzo.com/oauth2/token', { form: { grant_type: 'password' } }), { code: 'POLICY' });
  assert.equal(sent, 0, 'nothing was sent');
  assert.ok(logs.every(l => /^fin-connect policy monzo [A-Z]+$/.test(l)), 'the log names the provider and method only');
  // Allowed ones go out, with redirect:'error'.
  const seen = [];
  const ok = readOnlyClient(monzo.allow, { fetchFn: async (u, init) => { seen.push(init); return new Response('{"accounts":[]}', { headers: { 'Content-Type': 'application/json' } }); } });
  const r = await ok.request('GET', 'https://api.monzo.com/accounts');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { accounts: [] });
  assert.equal(seen[0].redirect, 'error');
  assert.ok(allowedBy(monzo.allow, 'GET', 'https://api.monzo.com/transactions?account_id=acc_1&since=2026-01-01T00:00:00Z'));
  assert.ok(allowedBy(monzo.allow, 'GET', 'https://api.monzo.com/transactions/tx_00009AbC'));
  assert.equal(allowedBy(monzo.allow, 'GET', 'https://api.monzo.com/transactions/tx_1/annotations'), null);
});

test('read-only client: network failures, oversize and non-JSON answers are typed errors', async () => {
  const allow = [{ method: 'GET', host: 'api.monzo.com', path: '/accounts' }];
  const down = readOnlyClient(allow, { fetchFn: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(down.request('GET', 'https://api.monzo.com/accounts'), { code: 'NETWORK' });
  const html = readOnlyClient(allow, { fetchFn: async () => new Response('<html>') });
  await assert.rejects(html.request('GET', 'https://api.monzo.com/accounts'), { code: 'BAD_RESPONSE' });
  const big = readOnlyClient(allow, { fetchFn: async () => new Response('x', { headers: { 'Content-Length': String(6 * 1024 * 1024) } }) });
  await assert.rejects(big.request('GET', 'https://api.monzo.com/accounts'), { code: 'BAD_RESPONSE' });
  const local = readOnlyClient([{ method: 'GET', host: '127.0.0.1', port: '9', path: '/x' }], { fetchFn: async () => new Response('{}') });
  await assert.rejects(local.request('GET', 'http://127.0.0.1:9/x'), { code: 'POLICY' }, 'plain http only for fakes (loopback: true)');
});

test('defineProvider refuses a provider that is not read-only or has no allowlist', () => {
  const ok = { id: 'monzo', readOnly: true, allow: [{}], status() {}, fetch() {}, normalise() {}, disconnect() {} };
  assert.ok(defineProvider({ ...ok }));
  assert.throws(() => defineProvider({ ...ok, readOnly: false }), /read-only/);
  assert.throws(() => defineProvider({ ...ok, allow: [] }), /allowlist/);
  assert.throws(() => defineProvider({ ...ok, id: 'paypal' }), /unknown provider/);
});

test('secrets: secrets/fin only, private file mode, strict reads, masked ids', async () => {
  const dir = tmp('fin-secrets-');
  try {
    const s = secretsFor(dir);
    assert.equal(await s.read('monzo-bank-monzo-1a2b'), null);
    await s.write('monzo-bank-monzo-1a2b', { clientId: 'oauth2client_x', clientSecret: 'shh' });
    const f = join(dir, 'secrets', 'fin', 'monzo-bank-monzo-1a2b.json');
    assert.ok(existsSync(f));
    if (process.platform !== 'win32') assert.equal(statSync(f).mode & 0o777, 0o600);
    await s.update('monzo-bank-monzo-1a2b', (cur) => ({ ...cur, accessToken: 't' }));
    assert.equal((await s.read('monzo-bank-monzo-1a2b')).accessToken, 't');
    assert.throws(() => s.file('../escape'), /bad secret name/);
    // Unreadable is never "empty" (that would lose a one-time refresh token).
    writeFileSync(f, '{not json');
    await assert.rejects(s.read('monzo-bank-monzo-1a2b'));
    await assert.rejects(s.update('monzo-bank-monzo-1a2b', () => ({})));
    await s.remove('eb-app');
    assert.equal(maskId('oauth2client_00009abcdef7f3a'), 'oauth2client_••••7f3a');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('duplicates: a new account whose last 60 days match another account starts hidden', () => {
  const days = Array.from({ length: 20 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
  const fresh = days.map((d, i) => ({ accountId: 'bank-monzo-1a2b.acc_1', date: d, pence: -(100 + i) }));
  const stored = days.slice(0, 15).map((d, i) => ({ account: 'AureliToken123', date: d, amount: -(100 + i) / 100 }));
  stored.push({ account: 'Other', date: days[0], amount: -1 });
  const dups = findDuplicates(fresh, stored, { today: '2026-09-30' });
  assert.deepEqual(dups, [{ accountId: 'bank-monzo-1a2b.acc_1', duplicateOf: 'AureliToken123', share: 0.75, rows: 20 }]);
  assert.deepEqual(findDuplicates(fresh, stored.slice(0, 10), { today: '2026-09-30' }), [], '50% is not enough');
  assert.deepEqual(findDuplicates(fresh.slice(0, 3), stored, { today: '2026-09-30' }), [], 'too few rows to tell');
});

test('sources.json: kind direct is validated (provider, hashes only, setup, re-auth date, account extras)', () => {
  const { source, errors } = validateSource({ id: 'bank-monzo-1a2b', capability: 'bank', kind: 'direct', provider: 'monzo', label: 'Monzo', userHash: 'a'.repeat(24), reauthDue: '2027-01-14', setup: true,
    extra: { historyMode: 'full', bad: { nested: 1 }, 'x-y': 1 },
    accounts: [{ id: 'acc_1', name: 'Current', kind: 'current', mask: '••••1234', hiddenReason: 'duplicate', duplicateOf: 'AureliToken123', dupChoice: 'other' }, { id: 'pot_1', name: 'Pot', kind: 'pot', balanceOnly: true }] });
  assert.deepEqual(errors, []);
  assert.equal(source.provider, 'monzo');
  assert.equal(source.setup, true);
  assert.deepEqual(source.extra, { historyMode: 'full' });
  assert.equal(source.accounts[0].mask, '••••1234');
  assert.equal(source.accounts[0].hiddenReason, 'duplicate');
  assert.equal(source.accounts[1].balanceOnly, true);
  assert.ok(validateSource({ id: 'bank-x-1a2b', capability: 'bank', kind: 'direct', provider: 'paypal' }).errors.length);
  assert.ok(validateSource({ id: 'bank-x-1a2b', capability: 'calendar', kind: 'direct', provider: 'monzo' }).errors.length);
  const twin = validateSource({ id: 'bank-monzo-9z9z', capability: 'bank', kind: 'direct', provider: 'monzo', userHash: 'a'.repeat(24) }, { existing: [source] });
  assert.match(twin.errors.join(), /already connected/);
});

test('rateOn: that day\'s rate (last working day at weekends), one request per range, cached on disk', async () => {
  const dir = tmp('fin-rates-');
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    const u = new URL(url);
    assert.equal(u.hostname, 'api.frankfurter.dev');
    assert.match(u.pathname, /^\/v1\/\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual([...u.searchParams.keys()].sort(), ['from', 'to'], 'only two currency codes leave the computer');
    return new Response(JSON.stringify({ rates: { '2026-09-25': { GBP: 0.74 }, '2026-09-28': { GBP: 0.75 } } }), { status: 200 });
  };
  try {
    const r = createRates({ dir, fetchImpl, now: () => new Date('2026-10-08T12:00:00Z') });
    assert.equal(await r.rateOn('USD', 'GBP', '2026-09-28'), 0.75);
    assert.equal(await r.rateOn('USD', 'GBP', '2026-09-27'), 0.74, 'Sunday: Friday\'s rate');
    assert.equal(calls, 1);
    assert.equal(await r.rateOn('GBP', 'GBP', '2026-09-27'), 1);
    assert.equal(await r.rateOn('USD', 'GBP', '2099-01-01'), null, 'no future rates');
    const again = createRates({ dir, fetchImpl, now: () => new Date('2026-10-08T12:00:00Z') });
    assert.equal(await again.rateOn('USD', 'GBP', '2026-09-28'), 0.75);
    assert.equal(calls, 1, 'read from the cache file');
    const down = createRates({ dir: tmp('fin-rates2-'), fetchImpl: async () => { throw new Error('offline'); }, now: () => new Date('2026-10-08T12:00:00Z') });
    assert.equal(await down.rateOn('USD', 'GBP', '2026-09-28'), null, 'no rate is null, never a guess');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
