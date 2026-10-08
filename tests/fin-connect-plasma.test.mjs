// Plasma One provider (lib/fin-connect/plasma.mjs): addresses, secret refusal,
// the read-only allowlist, amounts, normalisation, paging, cursors, FX hold-back,
// balances with the RPC fallback, failure modes and the core glue. Fakes only
// (tests/fixtures/fin-fake-plasma.mjs): no network, obviously fake addresses.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import plasma, {
  checkAddressInput, looksLikeSecret, toChecksumAddress, shortAddress, addrHash, accountIdFor, allowRequest,
  createPlasmaClient, unitsToCents, normaliseTransfer, TOKENS, ALLOW, CARD_NOTE,
} from '../lib/fin-connect/plasma.mjs';
import { keccak256Hex } from '../lib/fin-connect/keccak.mjs';
import { readOnlyClient } from '../lib/fin-connect/http.mjs';
import { defineProvider } from '../lib/fin-connect/provider.mjs';
import { finishRows } from '../lib/fin-connect/normalise.mjs';
import { secretsFor } from '../lib/fin-connect/secrets.mjs';
import { createFakePlasma, createFake, FAKE_ADDR } from './fixtures/fin-fake-plasma.mjs';

const USDT0 = TOKENS[0];
const RS = 'https://api.routescan.io/v2/network/mainnet/evm/9745/etherscan/api';
const RPC = 'https://rpc.plasma.to/';
let tmp;
before(() => { tmp = mkdtempSync(join(tmpdir(), 'fin-plasma-test-')); });
after(() => { rmSync(tmp, { recursive: true, force: true }); });

let n = 0;
function makeCtx(over = {}) {
  const fake = over.fakeNet || createFakePlasma({ delayMs: 0, now: () => Date.parse('2026-10-08T12:00:00Z') });
  const logs = [];
  const dataDir = join(tmp, `d${++n}`);
  return {
    fake, logs,
    ctx: {
      dataDir, secrets: secretsFor(dataDir), fetchFn: fake.fetch, minIntervalMs: 0, sleep: async () => {},
      log: (lvl, msg) => logs.push(`${lvl} ${msg}`), now: () => Date.parse('2026-10-08T12:00:00Z'),   // a number, like the core's
      fx: async (from, to) => (from === 'USD' && to === 'GBP' ? 0.75 : null), home: 'GBP', timeZone: 'Europe/London',
      ...over.ctx,
    },
  };
}

// ─── Keccak and EIP-55 ───────────────────────────────────────────────────
test('keccak256: known vectors (Ethereum padding, not SHA3)', () => {
  assert.equal(keccak256Hex(''), 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
  assert.equal(keccak256Hex('abc'), '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45');
  // Longer than one 136-byte block.
  assert.equal(keccak256Hex('a'.repeat(200)).length, 64);
});

test('EIP-55: the specification vectors round-trip', () => {
  for (const a of ['0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB', '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb']) {
    assert.equal(toChecksumAddress(a.toLowerCase()), a);
  }
});

// ─── Address input ───────────────────────────────────────────────────────
test('checkAddressInput: accepts lower, upper, checksummed, without 0x, with a URI prefix', () => {
  const good = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
  for (const s of [good, good.toLowerCase(), '0x' + good.slice(2).toUpperCase(), good.slice(2), `  plasma:${good} `, `ethereum:${good}@9745`]) {
    const r = checkAddressInput(s);
    assert.equal(r.ok, true, s);
    assert.equal(r.address, good.toLowerCase());
  }
});

test('checkAddressInput: a one-letter case typo fails the checksum; junk and the zero address are refused', () => {
  const typo = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD';
  assert.equal(checkAddressInput(typo).ok, false);
  assert.match(checkAddressInput(typo).message, /typo/);
  for (const s of ['', '0x123', 'hello', '0x' + 'g'.repeat(40), '0x' + '0'.repeat(40), 'x'.repeat(500)]) {
    const r = checkAddressInput(s);
    assert.equal(r.ok, false, s);
    assert.equal(r.code, 'BAD_REQUEST');
  }
});

test('secrets are refused (recovery phrases, private keys) and never echoed', () => {
  const phrase12 = 'apple river stone cloud night table green orbit lemon paper quiet zebra';
  const phrase24 = (phrase12 + ' ' + phrase12).trim();
  const numbered = phrase12.split(' ').map((w, i) => `${i + 1}. ${w}`).join('\n');
  const key = 'ab'.repeat(32);
  for (const s of [phrase12, phrase24, numbered, phrase12.toUpperCase(), key, '0x' + key, `my key is ${key} thanks`]) {
    assert.equal(looksLikeSecret(s), true, s.slice(0, 20));
    const r = checkAddressInput(s);
    assert.equal(r.ok, false);
    assert.equal(r.code, 'SECRET_REFUSED');
    assert.ok(!r.message.includes(s.slice(0, 10)), 'the message never repeats the input');
  }
  // An address is not a secret; a short sentence is not a phrase.
  assert.equal(looksLikeSecret('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), false);
  assert.equal(looksLikeSecret('my plasma wallet'), false);
});

test('checkAddressInput: a known token contract is not a wallet', () => {
  const r = checkAddressInput(USDT0.address);
  assert.equal(r.ok, false);
  assert.match(r.message, /token contract/);
});

test('shortAddress, addrHash, accountIdFor: masked, stable, never the address', () => {
  const a = FAKE_ADDR.active;
  assert.equal(shortAddress(a), '0x00…00a1');
  assert.equal(shortAddress('nope'), '');
  assert.equal(addrHash(a), addrHash(a.toUpperCase().replace('0X', '0x')));
  assert.ok(!addrHash(a).includes('00a1'));
  assert.match(accountIdFor(a), /^w-[0-9a-f]{12}$/);
  assert.match(accountIdFor(a, 'usde'), /^w-[0-9a-f]{12}-usde$/);
});

// ─── Read-only allowlist ─────────────────────────────────────────────────
test('allowlist: the reads pass', () => {
  assert.ok(allowRequest({ method: 'GET', url: `${RS}?module=account&action=tokentx&address=${FAKE_ADDR.active}&contractaddress=${USDT0.address}&startblock=0&endblock=999999999&page=1&offset=1000&sort=asc` }));
  assert.ok(allowRequest({ method: 'GET', url: `${RS}?module=account&action=tokenbalance&address=${FAKE_ADDR.active}&contractaddress=${USDT0.address}&tag=latest&apikey=abcdefgh` }));
  assert.ok(allowRequest({ method: 'GET', url: `${RS}?module=token&action=tokeninfo&contractaddress=${USDT0.address}` }));
  const bal = { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: USDT0.address, data: '0x70a08231' + '0'.repeat(24) + FAKE_ADDR.active.slice(2) }, 'latest'] };
  assert.ok(allowRequest({ method: 'POST', url: RPC, body: bal }));
  assert.ok(allowRequest({ method: 'POST', url: RPC, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getCode', params: [FAKE_ADDR.active, 'latest'] }) }));
});

test('allowlist: sending, signing, other calls, hosts and schemes are refused', () => {
  const rpc = (method, params = []) => ({ method: 'POST', url: RPC, body: { jsonrpc: '2.0', id: 1, method, params } });
  const transferData = '0xa9059cbb' + '0'.repeat(24) + FAKE_ADDR.friend.slice(2) + '0'.repeat(63) + '1';
  const balData = '0x70a08231' + '0'.repeat(24) + FAKE_ADDR.active.slice(2);
  const refused = [
    rpc('eth_sendRawTransaction', ['0x02f8']), rpc('eth_sendTransaction', [{}]), rpc('eth_sign', []), rpc('personal_sign', []),
    rpc('eth_signTypedData_v4', []), rpc('eth_accounts'), rpc('wallet_sendCalls', []), rpc('eth_getLogs', [{}]),
    rpc('eth_call', [{ to: USDT0.address, data: transferData }, 'latest']),                       // transfer(), not balanceOf
    rpc('eth_call', [{ to: USDT0.address, data: balData, value: '0x1' }, 'latest']),             // value attached
    rpc('eth_call', [{ to: USDT0.address, data: balData, from: FAKE_ADDR.active }, 'latest']),    // from attached
    rpc('eth_call', [{ to: FAKE_ADDR.friend, data: balData }, 'latest']),                         // not a known token
    { method: 'POST', url: RPC, body: [{ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }, { jsonrpc: '2.0', id: 2, method: 'eth_sendRawTransaction', params: ['0x'] }] },
    { method: 'POST', url: RPC, body: 'not json' },
    { method: 'GET', url: `${RS}?module=proxy&action=eth_sendRawTransaction&hex=0x02` },
    { method: 'GET', url: `${RS}?module=account&action=txlist&address=${FAKE_ADDR.active}` },
    { method: 'GET', url: `${RS}?module=account&action=tokentx&address=${FAKE_ADDR.active}&hex=0x02` },           // unknown parameter
    { method: 'POST', url: `${RS}?module=account&action=tokentx` },                                                // wrong method
    { method: 'GET', url: RS.replace('https:', 'http:') + '?module=account&action=tokentx' },                       // not https
    { method: 'GET', url: RS.replace('api.routescan.io', 'api.routescan.io:8443') + '?module=account&action=tokentx' },
    { method: 'GET', url: 'https://evil.example/v2/network/mainnet/evm/9745/etherscan/api?module=account&action=tokentx' },
    { method: 'POST', url: 'https://rpc.plasma.to/other', body: { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] } },
    { method: 'GET', url: 'not a url' },
  ];
  for (const r of refused) assert.equal(allowRequest(r), false, JSON.stringify(r).slice(0, 120));
});

test('allowlist: a forbidden request throws POLICY before anything is sent (core client and ours)', async () => {
  let sent = 0;
  const fetchFn = async () => { sent++; throw new Error('must not be called'); };
  const core = readOnlyClient(ALLOW, { provider: 'plasma', fetchFn });
  await assert.rejects(core.request('POST', RPC, { json: { jsonrpc: '2.0', id: 1, method: 'eth_sendRawTransaction', params: ['0x02'] } }), { code: 'POLICY' });
  await assert.rejects(core.request('GET', `${RS}?module=proxy&action=eth_sendRawTransaction&hex=0x02`), { code: 'POLICY' });
  assert.equal(sent, 0);
  assert.doesNotThrow(() => defineProvider(plasma));
  assert.equal(plasma.readOnly, true);
});

// ─── Amounts and normalisation ───────────────────────────────────────────
test('unitsToCents: exact for 6 and 18 decimals, half-up, null on junk', () => {
  assert.equal(unitsToCents('8333330000', 6), 833333);
  assert.equal(unitsToCents('1250000', 6), 125);
  assert.equal(unitsToCents('4999', 6), 0);
  assert.equal(unitsToCents('5000', 6), 1);
  assert.equal(unitsToCents('75500000000000000000', 18), 7550);
  assert.equal(unitsToCents('123', 0), 12300);
  assert.equal(unitsToCents('-5', 6), null);
  assert.equal(unitsToCents('1e9', 6), null);
  assert.equal(unitsToCents('9'.repeat(79), 6), null);
});

function raw(over = {}) {
  return {
    kind: 'plasma', token: 'usdt0', contract: USDT0.address, decimals: '6', accountId: 'w-abc', dir: 'out', other: FAKE_ADDR.card,
    name: null, value: '12340000', ts: Date.parse('2026-09-30T23:30:00Z') / 1000, hash: '0x' + '1'.repeat(64), n: 0, block: 5, ...over,
  };
}

test('normaliseTransfer: sign from direction only, USD cents, short counterparty memo, stable id', () => {
  const out = normaliseTransfer(raw()).row;
  assert.equal(out.minor, -1234);
  assert.equal(out.currency, 'USD');
  assert.equal(out.memo, 'Plasma One payment · 0x00…00ca');
  assert.equal(out.bc, null);
  assert.equal(out.sub, '');
  assert.equal(out.ts, '2026-09-30T23:30:00.000Z');
  const inn = normaliseTransfer(raw({ dir: 'in', other: FAKE_ADDR.exchange })).row;
  assert.equal(inn.minor, 1234);
  assert.equal(inn.memo, 'Plasma One received · 0x00…00e1');
  assert.notEqual(inn.id, out.id);
  assert.equal(normaliseTransfer(raw()).row.id, out.id);
  assert.match(out.id, /^p[0-9a-f]{19}$/);
});

test('normaliseTransfer: names, dust, zero, other tokens, bad decimals and strangers are handled', () => {
  assert.equal(normaliseTransfer(raw({ name: '=Rent‮' })).row.memo, 'Rent');
  assert.equal(normaliseTransfer(raw({ value: '0' })).reason, 'dust');
  assert.equal(normaliseTransfer(raw({ value: '4000' })).reason, 'dust');
  assert.equal(normaliseTransfer(raw({ contract: '0x' + '9'.repeat(40) })).reason, 'other token');
  assert.equal(normaliseTransfer(raw({ decimals: '18' })).reason, 'bad decimals');
  assert.equal(normaliseTransfer(raw({ dir: null })).reason, 'not this wallet');
  assert.equal(normaliseTransfer(raw({ value: 'abc' })).reason, 'bad amount');
  assert.equal(normaliseTransfer(raw({ ts: 0 })).reason, 'bad date');
  assert.equal(normaliseTransfer({}).reason, 'not a transfer');
  const usde = normaliseTransfer(raw({ token: 'usde', contract: TOKENS[1].address, decimals: '18', value: '75500000000000000000' })).row;
  assert.equal(usde.minor, -7550);
});

test('the core turns a Plasma Tx into a GBP row with the USD amount in the memo, dated at home', async () => {
  const tx = normaliseTransfer(raw()).row;
  const { rows, heldForRate } = await finishRows([tx], { home: 'GBP', fx: async () => 0.8, timeZone: 'Europe/London' });
  assert.equal(heldForRate, 0);
  assert.equal(rows[0].pence, -987);               // 12.34 USD * 0.8 = 9.872
  assert.equal(rows[0].date, '2026-10-01');          // 23:30 UTC is after midnight in London
  assert.equal(rows[0].memo, 'Plasma One payment · 0x00…00ca (12.34 USD @ 0.8000)');
  const held = await finishRows([tx], { home: 'GBP', fx: async () => null });
  assert.equal(held.heldForRate, 1);
  const usd = await finishRows([tx], { home: 'USD' });
  assert.equal(usd.rows[0].pence, -1234);
  assert.ok(!usd.rows[0].memo.includes('@'));
});

// ─── Reading a wallet through the fake network ───────────────────────────
async function connected(over) {
  const t = makeCtx(over);
  const { source } = await plasma.connect(t.ctx, { address: FAKE_ADDR.active });
  return { ...t, source };
}

test('connect: saves the address to secrets only (0600), the source has a hash and a mask', async () => {
  const { ctx, source } = await connected();
  assert.match(source.id, /^bank-plasma-[0-9a-f]{6}$/);
  assert.equal(source.kind, 'direct');
  assert.equal(source.provider, 'plasma');
  assert.equal(source.addrHash, addrHash(FAKE_ADDR.active));
  assert.equal(source.extra.mask, '0x00…00a1');
  assert.ok(!JSON.stringify(source).includes(FAKE_ADDR.active), 'the source never holds the address');
  const f = join(ctx.dataDir, 'secrets', 'fin', `plasma-${source.id}.json`);
  assert.ok(existsSync(f));
  assert.equal(JSON.parse(readFileSync(f, 'utf8')).address, FAKE_ADDR.active);
  if (process.platform !== 'win32') assert.equal(statSync(f).mode & 0o777, 0o600);
  const st = await plasma.status(ctx, source);
  assert.deepEqual([st.configured, st.connected, st.needsAuth], [true, true, false]);
  assert.ok(!JSON.stringify(st).includes(FAKE_ADDR.active));
});

test('connect: refuses secrets, token contracts and the same wallet twice', async () => {
  const { ctx, source } = await connected();
  await assert.rejects(plasma.connect(ctx, { address: 'ab'.repeat(32) }), { code: 'SECRET_REFUSED' });
  await assert.rejects(plasma.connect(ctx, { address: USDT0.address }), { code: 'BAD_REQUEST' });
  await assert.rejects(plasma.connect({ ...ctx, sources: [source] }, { address: FAKE_ADDR.active.toUpperCase().replace('0X', '0x') }), { code: 'BUSY' });
});

test('fetch: the first run reads the whole history, both tokens, and current balances', async () => {
  const { ctx, source, fake } = await connected();
  const r = await plasma.fetch(ctx, source, {});
  const usdtAll = fake.history(FAKE_ADDR.active, 'usdt0');
  assert.equal(r.rows.filter(x => x.token === 'usdt0').length, usdtAll.length);
  assert.equal(r.rows.filter(x => x.token === 'usde').length, 2);
  assert.deepEqual(r.accounts.map(a => a.name), ['Plasma One', 'Plasma One USDe']);
  assert.ok(r.accounts.every(a => a.kind === 'wallet' && a.mask === '0x00…00a1' && a.currency === 'USD'));
  const norm = r.rows.map(x => plasma.normalise(x));
  const dust = norm.filter(x => x.reason === 'dust').length;
  assert.ok(dust >= 2, 'poisoning dust is dropped');
  const txs = norm.filter(x => x.row).map(x => x.row);
  assert.ok(txs.some(t => t.minor > 0) && txs.some(t => t.minor < 0));
  // Balance = what came in minus what went out (the fake keeps it consistent).
  const usdt = txs.filter(t => t.accountId === accountIdFor(FAKE_ADDR.active));
  const sum = usdt.reduce((s, t) => s + t.minor, 0);
  const bal = r.balances.find(b => b.accountId === accountIdFor(FAKE_ADDR.active));
  assert.equal(bal.currency, 'USD');
  assert.equal(Math.round(bal.balance * 100), sum);
  assert.equal(r.balances.find(b => b.accountId.endsWith('-usde')).balance, 174.5);
  assert.ok(r.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block > 0 && r.cursor.accounts[accountIdFor(FAKE_ADDR.active)].used);
});

test('fetch: later runs start at the last block read; nothing new means only that block again', async () => {
  const { ctx, source, fake } = await connected();
  const first = await plasma.fetch(ctx, source, {});
  const lastBlock = first.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block;
  const before = fake.calls.length;
  const again = await plasma.fetch(ctx, source, { cursor: first.cursor });
  assert.ok(again.rows.every(x => x.block >= lastBlock || x.token !== 'usdt0'));
  assert.ok(again.rows.filter(x => x.token === 'usdt0').length <= 3);
  assert.equal(again.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block, lastBlock);
  assert.ok(fake.calls.length - before <= 4, 'one transfers page and one balance per token');
  // full: true reads everything again.
  const full = await plasma.fetch(ctx, source, { cursor: first.cursor, full: true });
  assert.equal(full.rows.length, first.rows.length);
});

test('fetch: a busy wallet pages by block without losing or doubling transfers', async () => {
  const t = makeCtx();
  const { source } = await plasma.connect(t.ctx, { address: FAKE_ADDR.busy });
  const r = await plasma.fetch(t.ctx, source, {});
  assert.equal(r.rows.length, 2500);
  assert.equal(new Set(r.rows.map(x => plasma.normalise(x).row.id)).size, 2500);
  assert.ok(t.fake.calls.filter(c => c.kind === 'tokentx').length >= 3);
});

test('fetch: an empty wallet gives one account, a zero balance and no rows', async () => {
  const t = makeCtx();
  const { source } = await plasma.connect(t.ctx, { address: FAKE_ADDR.empty });
  const r = await plasma.fetch(t.ctx, source, {});
  assert.equal(r.rows.length, 0);
  assert.deepEqual(r.accounts.map(a => a.name), ['Plasma One']);
  assert.equal(r.balances[0].balance, 0);
});

test('fetch: rows with no exchange rate yet keep the cursor before them', async () => {
  const { ctx, source } = await connected();
  const cut = '2026-06-01';
  const fx = async (from, to, date) => (date < cut ? 0.75 : null);
  const r = await plasma.fetch({ ...ctx, fx }, source, {});
  assert.ok(r.held > 0);
  const firstHeld = r.rows.filter(x => x.token === 'usdt0' && new Date(x.ts * 1000).toISOString().slice(0, 10) >= cut).map(x => x.block).sort((a, b) => a - b)[0];
  assert.ok(r.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block <= firstHeld);
  // Same home currency: nothing is held.
  const usd = await plasma.fetch({ ...ctx, fx, home: 'USD' }, source, {});
  assert.equal(usd.held, 0);
});

test('fetch: account switched off -> no rows for it, balances still read', async () => {
  const { ctx, source } = await connected();
  const off = accountIdFor(FAKE_ADDR.active);
  const r = await plasma.fetch(ctx, source, { accountOn: (id) => id !== off });
  assert.ok(r.rows.every(x => x.accountId !== off));
  assert.ok(r.rows.length > 0);
  assert.equal(r.cursor.accounts[off].block, 0, 'a switched-off account keeps its place');
  // Switched back on: its whole history comes in.
  const back = await plasma.fetch(ctx, source, { cursor: r.cursor });
  assert.ok(back.rows.filter(x => x.accountId === off).length > 300);
  // The core forgetting an account's cursor ("Keep this one") reads its history again too.
  const first = await plasma.fetch(ctx, source, {});
  const { [off]: _gone, ...rest } = first.cursor.accounts;
  const again = await plasma.fetch(ctx, source, { cursor: { ...first.cursor, accounts: rest } });
  assert.ok(again.rows.filter(x => x.accountId === off).length > 300);
});

test('fetch: names (by full or short address) replace the generic memo', async () => {
  const { ctx, source } = await connected();
  let names = plasma.nameAddress({}, FAKE_ADDR.landlord, 'Rent');
  names = plasma.nameAddress(names, '0x00…00ca', 'Plasma One card');
  const r = await plasma.fetch(ctx, source, { cursor: { names } });
  const memos = new Set(r.rows.map(x => plasma.normalise(x)).filter(x => x.row).map(x => x.row.memo));
  assert.ok(memos.has('Rent') && memos.has('Plasma One card'));
  assert.deepEqual(plasma.nameAddress(names, FAKE_ADDR.landlord, ''), { '0x00…00ca': 'Plasma One card' });
  assert.throws(() => plasma.nameAddress({}, 'ab'.repeat(32), 'x'), { code: 'SECRET_REFUSED' });
});

test('balances fall back to the RPC when the explorer is down; transfers then warn, not fail', async () => {
  const fakeNet = createFakePlasma({ delayMs: 0, fail: '' });
  const { ctx, source } = await connected({ fakeNet });
  const first = await plasma.fetch(ctx, source, {});
  fakeNet.config({ fail: 'routescan' });
  const r = await plasma.fetch(ctx, source, { cursor: first.cursor });
  assert.equal(r.rows.length, 0);
  assert.match(r.warning, /could not be read this time/);
  assert.equal(r.balances.find(b => b.accountId === accountIdFor(FAKE_ADDR.active)).balance, first.balances[0].balance);
  assert.equal(r.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block, first.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block, 'the cursor does not move');
  assert.ok(fakeNet.calls.some(c => c.kind === 'rpc:eth_call'));
});

test('failures: no network or a refused key fail the update; a busy or garbled explorer warns and keeps the cursor', async () => {
  for (const [fail, code] of [['network', 'NETWORK'], ['auth', 'AUTH']]) {
    const fakeNet = createFakePlasma({ delayMs: 0, fail });
    const t = makeCtx({ fakeNet });
    await secretsFor(t.ctx.dataDir).write('plasma-bank-plasma-abcd', { address: FAKE_ADDR.active });
    await assert.rejects(plasma.fetch(t.ctx, { id: 'bank-plasma-abcd' }, {}), (e) => e.code === code && !String(e.message).includes(FAKE_ADDR.active), fail);
  }
  for (const fail of ['rate', 'bad']) {
    const fakeNet = createFakePlasma({ delayMs: 0, fail });
    const t = makeCtx({ fakeNet });
    await secretsFor(t.ctx.dataDir).write('plasma-bank-plasma-abcd', { address: FAKE_ADDR.active });
    const r = await plasma.fetch(t.ctx, { id: 'bank-plasma-abcd' }, { cursor: { accounts: { [accountIdFor(FAKE_ADDR.active)]: { token: 'usdt0', block: 1234, used: true } } } });
    assert.equal(r.rows.length, 0, fail);
    assert.match(r.warning, /could not be read this time/);
    assert.equal(r.cursor.accounts[accountIdFor(FAKE_ADDR.active)].block, 1234);
    assert.ok(r.balances.length >= 1, 'the balance came from the RPC');
    if (fail === 'rate') assert.equal(fakeNet.calls.filter(c => c.kind === 'tokentx' ).length, 4 + 4, 'three retries per token, then give up');
  }
  // Both down: the update fails (nothing at all came back).
  const fakeNet = createFakePlasma({ delayMs: 0, fail: 'network' });
  const t = makeCtx({ fakeNet });
  await secretsFor(t.ctx.dataDir).write('plasma-bank-plasma-abcd', { address: FAKE_ADDR.active });
  await assert.rejects(plasma.fetch(t.ctx, { id: 'bank-plasma-abcd' }, {}), { code: 'NETWORK' });
});

test('the client paces requests under the keyless limit', async () => {
  const fakeNet = createFakePlasma({ delayMs: 0 });
  const waits = [];
  const c = createPlasmaClient({ fetchFn: fakeNet.fetch, sleep: async (ms) => { waits.push(ms); } });
  await c.tokenBalance(FAKE_ADDR.active, USDT0);
  await c.tokenBalance(FAKE_ADDR.active, USDT0);
  assert.ok(waits.length === 1 && waits[0] > 400 && waits[0] <= 520);
  const keyed = createPlasmaClient({ fetchFn: fakeNet.fetch, apiKey: 'FAKEKEY12345', sleep: async (ms) => { waits.push(ms); } });
  await keyed.tokenBalance(FAKE_ADDR.active, USDT0);
  await keyed.tokenBalance(FAKE_ADDR.active, USDT0);
  assert.ok(waits[1] <= 210);
});

test('preview: balance and this month\'s transfers, smart account noted, token contracts refused, nothing saved', async () => {
  const t = makeCtx({ fakeNet: createFakePlasma({ delayMs: 0 }) });
  const p = await plasma.preview(t.ctx, { address: FAKE_ADDR.active });
  assert.equal(p.address, '0x00…00a1');
  assert.equal(p.smartAccount, true);
  assert.ok(p.transfers30d > 5);
  assert.equal(p.balance.currency, 'USD');
  assert.ok(p.balance.amount > 0);
  assert.equal(p.homeBalance.currency, 'GBP');
  assert.equal(p.homeBalance.pence, Math.round(p.balance.amount * 100 * 0.75));
  assert.equal(p.empty, false);
  assert.deepEqual(p.tokens.map(x => x.key), ['usdt0', 'usde']);
  assert.equal(p.note, CARD_NOTE);
  assert.ok(!JSON.stringify(p).includes(FAKE_ADDR.active));
  await assert.rejects(plasma.preview(t.ctx, { address: USDT0.address }), { code: 'BAD_REQUEST' });
  await assert.rejects(plasma.preview(t.ctx, { address: 'apple river stone cloud night table green orbit lemon paper quiet zebra' }), { code: 'SECRET_REFUSED' });
  assert.ok(!existsSync(join(t.ctx.dataDir, 'secrets')));
  const e = await plasma.preview(t.ctx, { address: FAKE_ADDR.empty });
  assert.equal(e.transfers30d, 0);
  assert.equal(e.balance.amount, 0);
  assert.equal(e.empty, true);
  assert.deepEqual(e.tokens.map(x => x.key), ['usdt0']);
});

test('the optional explorer key: saved to secrets, sent as apikey, removable, never echoed', async () => {
  const t = makeCtx();
  await assert.rejects(plasma.setApiKey(t.ctx, 'no spaces allowed'), { code: 'BAD_REQUEST' });
  assert.deepEqual(await plasma.setApiKey(t.ctx, 'FAKEKEY12345'), { configured: true });
  assert.deepEqual(await plasma.info(t.ctx), { apiKeyConfigured: true, note: CARD_NOTE });
  let seen = null;
  const fetchFn = async (url, init) => { seen = String(url); return t.fake.fetch(url, init); };
  const { source } = await plasma.connect({ ...t.ctx, fetchFn }, { address: FAKE_ADDR.empty });
  assert.match(seen, /apikey=FAKEKEY12345/);
  await plasma.fetch({ ...t.ctx, fetchFn }, source, {});
  assert.deepEqual(await plasma.setApiKey(t.ctx, ''), { configured: false });
  assert.equal((await plasma.info(t.ctx)).apiKeyConfigured, false);
});

test('disconnect deletes the saved address; status then asks for it again', async () => {
  const { ctx, source } = await connected();
  await plasma.disconnect(ctx, source);
  assert.ok(!existsSync(join(ctx.dataDir, 'secrets', 'fin', `plasma-${source.id}.json`)));
  const st = await plasma.status(ctx, source);
  assert.equal(st.configured, false);
  await assert.rejects(plasma.fetch(ctx, source, {}), { code: 'NOT_CONFIGURED' });
});

test('logs carry counts only: never the address, amounts or URLs', async () => {
  const { ctx, source, logs } = await connected();
  await plasma.fetch(ctx, source, {});
  const all = logs.join('\n');
  assert.ok(logs.length > 0);
  assert.ok(!all.includes('00a1') && !all.includes('routescan') && !all.includes('USD'), all);
});

test('createFake (the core\'s fake loader): env settings and run-time changes', async () => {
  const f = createFake({ env: { DASHBOARD_PLASMA_FAKE_DELAY_MS: '0', DASHBOARD_PLASMA_FAKE_FAIL: 'rpc' } });
  assert.deepEqual(f.settings(), { delayMs: 0, fail: 'rpc' });
  assert.deepEqual(f.configure({ fail: 'rate:0.3', delayMs: 5 }), { delayMs: 5, fail: 'rate:0.3' });
  assert.deepEqual(f.configure({ fail: 'drop tables' }), { delayMs: 5, fail: 'rate:0.3' });
  const r = await f.fetchFn(`${RS}?module=token&action=tokeninfo&contractaddress=${USDT0.address}`, { method: 'GET' });
  assert.equal(r.status, 200);
});
