// Finance connections end to end on the real server with the fake providers
// (design section 4, "Integration test plan"). Monzo cases here; the Plasma
// and Enable Banking builders add theirs. No network, temp data folder only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { createFake } from './fixtures/fin-fake-monzo.mjs';
import { storeCsv } from '../lib/finance/store.mjs';

let dir, port, srv;
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const h = { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers };
    for (const k of Object.keys(h)) if (h[k] == null) delete h[k];
    const req = request({ host: '127.0.0.1', port, method, path, headers: h }, (r) => {
      let data = ''; r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, json, text: data, headers: r.headers }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
const nav = { Origin: null, 'Sec-Fetch-Site': 'cross-site' };
const until = async (fn, ms = 20000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timed out'); await new Promise(r => setTimeout(r, 60)); } };
const idle = () => until(async () => { const s = (await call('GET', '/api/finance/status')).json; return s.job && s.job.state !== 'running' ? s : null; });
const STORE = () => join(dir, 'finance', '_system', 'transactions.csv');

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fin-int-'));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  // The same Monzo payments, already in the store from another connection (an
  // Aureli-style account id): the last 90 days of the fake's main account.
  const data = createFake({ env: {} }).data;
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows = data.transactions.acc_fake0000000000000000a1
    .filter(t => t.created >= since && t.settled && !t.decline_reason && t.amount !== 0)
    .map(t => ({ date: t.created.slice(0, 10), amount: t.amount / 100, account: 'AureliToken0001', subcategory: '', memo: (t.merchant && t.merchant.name) || t.description, source: 'bank-sync' }));
  writeFileSync(STORE(), storeCsv(rows));
  Object.assign(process.env, { DASHBOARD_MONZO_FAKE: '1', DASHBOARD_MONZO_FAKE_DELAY_MS: '0', DASHBOARD_MONZO_FAKE_APPROVE_MS: '100', DASHBOARD_MONZO_FAKE_POLL_MS: '40', DASHBOARD_MONZO_FAKE_WINDOW_MS: '60000' });
  process.env.USERPROFILE = dir; process.env.HOME = dir;
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => { await srv?.close(); rmSync(dir, { recursive: true, force: true }); });

test('Monzo direct next to the same Monzo through another connection: the new account starts hidden, nothing counted twice', async () => {
  const before = readFileSync(STORE(), 'utf8').trim().split(/\r?\n/).length;
  const put = await call('PUT', '/api/fin-connect/monzo/client', { clientId: 'oauth2client_fake0000000000000005', clientSecret: 'mnzconf.integration-secret-005' });
  const id = put.json.sourceId;
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id}`);
  const a = new URL(go.headers.location);
  const back = await call('GET', a.pathname + a.search, undefined, nav);
  const cb = new URL(back.headers.location);
  await call('GET', cb.pathname + cb.search, undefined, nav);
  await until(async () => (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json.state === 'done');
  await idle();

  const g = (await call('GET', '/api/fin-connect/accounts')).json.groups.find(x => x.sourceId === id);
  const main = g.accounts.find(x => x.id === 'acc_fake0000000000000000a1');
  const joint = g.accounts.find(x => x.id === 'acc_fake0000000000000000b2');
  assert.equal(main.enabled, false, 'the duplicate starts hidden');
  assert.equal(main.hiddenReason, 'duplicate');
  assert.equal(main.duplicateOf, 'AureliToken0001');
  assert.equal(joint.enabled, true);
  const csv = readFileSync(STORE(), 'utf8');
  assert.ok(!csv.includes(`${id}.acc_fake0000000000000000a1`), 'its rows were not imported');
  assert.ok(csv.includes(`${id}.acc_fake0000000000000000b2`));
  assert.ok(csv.trim().split(/\r?\n/).length > before);

  // "Keep this one": it is shown and its history is fetched again (90 days now the window has closed).
  const k = await call('PATCH', `/api/fin-connect/accounts/${encodeURIComponent(`${id}.acc_fake0000000000000000a1`)}`, { keep: 'this' });
  assert.equal(k.status, 200, k.text);
  assert.equal(k.json.account.enabled, true);
  assert.equal(k.json.account.dupChoice, 'this');
  const cursor = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'connectors', `${id}.json`), 'utf8'));
  assert.ok(!cursor.accounts.acc_fake0000000000000000a1, 'its cursor starts again');
  assert.equal((await call('POST', `/api/fin-connect/sources/${id}/sync`, {})).status, 202);
  const fin = await idle();
  assert.equal(fin.job.state, 'ok', JSON.stringify(fin.job));
  assert.ok(readFileSync(STORE(), 'utf8').includes(`${id}.acc_fake0000000000000000a1`));
  // The choice is remembered: a later sync does not hide it again.
  await call('POST', `/api/fin-connect/sources/${id}/sync`, {});
  await idle();
  const g2 = (await call('GET', '/api/fin-connect/accounts')).json.groups.find(x => x.sourceId === id);
  assert.equal(g2.accounts.find(x => x.id === 'acc_fake0000000000000000a1').enabled, true);
});

test('Sync now on one source reads only that source; a source still being set up cannot sync', async () => {
  const put = await call('PUT', '/api/fin-connect/monzo/client', { clientId: 'oauth2client_fake0000000000000006', clientSecret: 'mnzconf.integration-secret-006' });
  const r = await call('POST', `/api/fin-connect/sources/${put.json.sourceId}/sync`, {});
  assert.equal(r.status, 409);
  assert.equal(r.json.code, 'NOT_CONFIGURED');
  assert.equal((await call('POST', '/api/fin-connect/sources/bank-nope-0000/sync', {})).status, 404);
  // A full finance update skips the half-set-up source without a warning about it.
  assert.equal((await call('POST', '/api/finance/update', { bank: true })).status, 202);
  const fin = await idle();
  assert.ok(!JSON.stringify(fin.job.result.sources || []).includes(put.json.sourceId));
  await call('POST', `/api/fin-connect/sources/${put.json.sourceId}/disconnect`, {});
});
