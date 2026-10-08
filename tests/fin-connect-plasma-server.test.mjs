// Plasma One through the real server, in-process on a temp data folder, with
// DASHBOARD_PLASMA_FAKE=1 (tests/fixtures/fin-fake-plasma.mjs): preview, add,
// the first finance update, accounts, the safeguards and disconnect. No network:
// the USD->GBP rates come from a pre-filled cache in <data>/travel/ (synthetic).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';

const ACTIVE = '0x' + 'a1'.padStart(40, '0');
const EMPTY = '0x' + 'a2'.padStart(40, '0');
const PHRASE = 'apple river stone cloud night table green orbit lemon paper quiet zebra';
let dir, port, srv;
const saved = {};

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function raw(method, path, { headers = {}, body } = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, agent: false, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      let data = '';
      r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, text: data, json }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}
const J = { 'Content-Type': 'application/json' };
const post = (path, body, headers = {}) => raw('POST', path, { headers: { ...J, ...headers }, body });

async function waitJob() {
  for (let i = 0; i < 400; i++) {
    const s = await raw('GET', '/api/finance/status');
    if (s.json && s.json.job && s.json.job.state !== 'running') return s.json.job;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('the finance update did not finish');
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fin-plasma-server-'));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Sam', currency: 'GBP', timezone: 'Europe/London' }));
  // Synthetic USD->GBP rates for the last 400 days, in the cache lib/travel-rates.mjs reads first.
  const days = {};
  const end = Date.now(), start = end - 400 * 86400000;
  for (let t = start; t <= end; t += 86400000) days[new Date(t).toISOString().slice(0, 10)] = 0.75;
  mkdirSync(join(dir, 'travel'), { recursive: true });
  writeFileSync(join(dir, 'travel', 'rates-hist-USD-GBP.json'), JSON.stringify({ days, ranges: [[new Date(start).toISOString().slice(0, 10), new Date(end).toISOString().slice(0, 10)]] }));
  for (const k of ['DASHBOARD_PLASMA_FAKE', 'DASHBOARD_PLASMA_FAKE_DELAY_MS']) saved[k] = process.env[k];
  process.env.DASHBOARD_PLASMA_FAKE = '1';
  process.env.DASHBOARD_PLASMA_FAKE_DELAY_MS = '0';
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(dir, { recursive: true, force: true });
});

test('the catalogue lists Plasma One (fake mode, read-only, no key saved)', async () => {
  const r = await raw('GET', '/api/fin-connect/providers');
  assert.equal(r.status, 200, r.text);
  const p = r.json.providers.find(x => x.id === 'plasma');
  assert.ok(p && p.available && p.readOnly && p.fake);
  assert.equal(p.apiKeyConfigured, false);
});

test('preview: safeguards (403, 421, 415), secrets refused and never echoed, token contracts refused', async () => {
  assert.equal((await post('/api/fin-connect/plasma/preview', { address: ACTIVE }, { Origin: 'http://evil.example' })).status, 403);
  assert.equal((await raw('POST', '/api/fin-connect/plasma/preview', { headers: { ...J, Host: 'evil.example' }, body: { address: ACTIVE } })).status, 421);
  assert.equal((await raw('POST', '/api/fin-connect/plasma/preview', { headers: { 'Content-Type': 'text/plain' }, body: 'x' })).status, 415);
  const s = await post('/api/fin-connect/plasma/preview', { address: PHRASE });
  assert.equal(s.status, 400);
  assert.equal(s.json.code, 'SECRET_REFUSED');
  assert.ok(!s.text.includes('orbit'));
  const t = await post('/api/fin-connect/plasma/preview', { address: '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb' });
  assert.equal(t.status, 400);
  assert.match(t.json.error, /token contract/);
  const ok = await post('/api/fin-connect/plasma/preview', { address: ACTIVE });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.address, '0x00…00a1');
  assert.ok(ok.json.transfers30d > 0);
  assert.equal(ok.json.homeBalance.currency, 'GBP');
  assert.ok(!ok.text.includes(ACTIVE));
  const sj = join(dir, 'sources.json');
  assert.ok(!existsSync(sj) || !readFileSync(sj, 'utf8').includes('plasma'), 'a preview saves nothing');
  assert.ok(!existsSync(join(dir, 'secrets', 'fin')) || !readdirSync(join(dir, 'secrets', 'fin')).some(f => f.startsWith('plasma')));
});

let sourceId;
test('add a wallet: one request, then the first update brings the whole history in GBP', async () => {
  const r = await post('/api/fin-connect/plasma', { address: ACTIVE });
  assert.equal(r.status, 200, r.text);
  sourceId = r.json.source.id;
  assert.match(sourceId, /^bank-/);
  assert.equal(r.json.source.mask, '0x00…00a1');
  await new Promise(res => setTimeout(res, 100));
  const job = await waitJob();
  assert.notEqual(job.state, 'failed', JSON.stringify(job));
  const store = readFileSync(join(dir, 'finance', '_system', 'transactions.csv'), 'utf8');
  const mine = store.split('\n').filter(l => l.includes(sourceId + '.w-'));
  assert.ok(mine.length > 300, `rows: ${mine.length}`);
  assert.ok(mine.some(l => /Plasma One payment · 0x00…00ca \(\d+\.\d{2} USD @ 0\.7500\)/.test(l)));
  assert.ok(mine.some(l => /Plasma One received · 0x00…00e1/.test(l)));
  assert.ok(!store.includes(ACTIVE), 'the wallet address is never in the store');
  // Your accounts: both tokens, GBP balances, masked address only.
  const a = await raw('GET', '/api/fin-connect/accounts');
  const g = a.json.groups.find(x => x.sourceId === sourceId);
  assert.equal(g.state, 'ok');
  assert.deepEqual(g.accounts.map(x => x.name), ['Plasma One', 'Plasma One USDe']);
  assert.ok(g.accounts.every(x => x.currency === 'GBP' && x.balance > 0 && x.mask === '0x00…00a1'));
  assert.ok(!a.text.includes(ACTIVE));
  // Credentials: the address is in secrets/fin only.
  assert.ok(!readFileSync(join(dir, 'sources.json'), 'utf8').includes(ACTIVE));
  const secret = join(dir, 'secrets', 'fin', `plasma-${sourceId}.json`);
  assert.equal(JSON.parse(readFileSync(secret, 'utf8')).address, ACTIVE);
});

test('a second update adds nothing new (the chain cursor, the pipeline drops what it has)', async () => {
  const before = readFileSync(join(dir, 'finance', '_system', 'transactions.csv'), 'utf8').split('\n').length;
  const r = await post(`/api/fin-connect/sources/${sourceId}/sync`, {});
  assert.ok(r.status === 202 || r.status === 200, r.text);
  await new Promise(res => setTimeout(res, 100));
  await waitJob();
  const after = readFileSync(join(dir, 'finance', '_system', 'transactions.csv'), 'utf8').split('\n').length;
  assert.equal(after, before);
  const cur = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'connectors', `${sourceId}.json`), 'utf8'));
  assert.ok(Object.values(cur.accounts).every(a => a.block > 0) && cur.lastSync);
  assert.ok(!JSON.stringify(cur).includes(ACTIVE));
});

test('the same wallet twice is refused; naming an address works; the key route never echoes', async () => {
  const again = await post('/api/fin-connect/plasma', { address: ACTIVE.toUpperCase().replace('0X', '0x') });
  assert.equal(again.status, 409);
  const n = await raw('PUT', '/api/fin-connect/plasma/names', { headers: J, body: { sourceId, address: '0x00…00b2', name: 'Rent' } });
  assert.equal(n.status, 200, n.text);
  assert.equal(n.json.names, 1);
  const k = await raw('PUT', '/api/fin-connect/plasma/key', { headers: J, body: { key: 'FAKEKEY12345' } });
  assert.deepEqual(k.json, { ok: true, configured: true });
  assert.equal((await raw('PUT', '/api/fin-connect/plasma/key', { headers: J, body: { key: '' } })).json.configured, false);
});

test('disconnect deletes the saved address and keeps past rows by default', async () => {
  const r = await post(`/api/fin-connect/sources/${sourceId}/disconnect`, {});
  assert.equal(r.status, 200, r.text);
  assert.ok(!existsSync(join(dir, 'secrets', 'fin', `plasma-${sourceId}.json`)));
  assert.ok(readFileSync(join(dir, 'finance', '_system', 'transactions.csv'), 'utf8').includes(sourceId + '.w-'));
  // An empty wallet can be added afterwards.
  const e = await post('/api/fin-connect/plasma', { address: EMPTY });
  assert.equal(e.status, 200, e.text);
  await new Promise(res => setTimeout(res, 100));
  await waitJob();
});

test('the server log never holds the address, amounts or explorer URLs', async () => {
  const logs = join(dir, 'logs');
  const text = existsSync(logs) ? readdirSync(logs).map(f => readFileSync(join(logs, f), 'utf8')).join('\n') : '';
  assert.ok(text.includes('fin-connect'), 'the provider did log (counts)');
  assert.ok(!text.includes('00a1') && !text.includes('00a2') && !text.includes('routescan') && !text.includes('rpc.plasma'), 'nothing identifying');
});
