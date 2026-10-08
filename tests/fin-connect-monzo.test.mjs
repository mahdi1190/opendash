// Monzo, read directly (lib/fin-connect/monzo.mjs), end to end on the real
// server against the FAKE Monzo (tests/fixtures/fin-fake-monzo.mjs): client,
// sign-in, app approval, the 5-minute full-history window, 90-day fallback,
// one-time refresh, sign-in-again, pots, normalisation, dedupe, disconnect.
// No network, no real account, never port 4173.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';

let dir, port, srv;
const CLIENT = 'oauth2client_fake0000000000000001';
const SECRET = 'mnzconf.fake-secret-for-tests-0001';
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 20000) {
  const t = Date.now();
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timed out'); await wait(60); }
}
const fake = async (patch) => (await call('POST', '/api/fin-connect/fake', { provider: 'monzo', ...patch })).json;
const jobIdle = () => until(async () => { const s = (await call('GET', '/api/finance/status')).json; return s.job && s.job.state !== 'running' ? s : null; });
const store = () => readFileSync(join(dir, 'finance', '_system', 'transactions.csv'), 'utf8');

/** Steps 1-3 of the wizard through the routes: client, connect, (fake) Monzo, callback. */
async function signIn(sourceId) {
  const put = await call('PUT', '/api/fin-connect/monzo/client', { clientId: CLIENT, clientSecret: SECRET, ...(sourceId ? { sourceId } : {}) });
  assert.equal(put.status, 200, put.text);
  const id = put.json.sourceId;
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id}`);
  assert.equal(go.status, 302);
  const auth = new URL(go.headers.location);
  assert.equal(auth.pathname, '/api/fin-connect/fake/monzo/authorize');
  assert.equal(auth.searchParams.get('client_id'), CLIENT);
  assert.equal(auth.searchParams.get('redirect_uri'), `http://localhost:${port}/api/fin-connect/monzo/callback`);
  assert.equal(auth.searchParams.get('response_type'), 'code');
  assert.ok(!auth.searchParams.has('client_secret'), 'the secret never goes into a URL');
  // The fake Monzo answers at once (a navigation from "another site": no Origin header).
  const back = await call('GET', auth.pathname + auth.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(back.status, 302);
  const cb = new URL(back.headers.location);
  const page = await call('GET', cb.pathname + cb.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  return { id, page, cb };
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fin-monzo-'));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  Object.assign(process.env, {
    DASHBOARD_MONZO_FAKE: '1', DASHBOARD_MONZO_FAKE_DELAY_MS: '0', DASHBOARD_MONZO_FAKE_APPROVE_MS: '250',
    DASHBOARD_MONZO_FAKE_WINDOW_MS: '60000', DASHBOARD_MONZO_FAKE_POLL_MS: '40',
  });
  process.env.USERPROFILE = dir; process.env.HOME = dir;
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  rmSync(dir, { recursive: true, force: true });
});

test('the wizard: client saved (secret never shown), sign-in, approval, full history imported once', async () => {
  const bad = await call('PUT', '/api/fin-connect/monzo/client', { clientId: 'nope', clientSecret: SECRET });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, 'BAD_REQUEST');
  assert.ok(!bad.text.includes('nope'), 'errors never echo input');

  const { id, page } = await signIn();
  assert.equal(page.status, 200);
  assert.match(page.text, /approve in your Monzo app/i);
  assert.ok(!page.text.includes('fake-access') && !page.text.includes(SECRET));

  // Before approval: waiting, with the 5-minute countdown.
  const w = (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json;
  assert.ok(['waiting', 'importing'].includes(w.state), w.state);
  assert.ok(w.secondsLeft > 0 && w.secondsLeft <= 60);
  const done = await until(async () => { const a = (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json; return a.state === 'done' || a.state === 'expired' || a.state === 'error' ? a : null; });
  assert.equal(done.state, 'done', JSON.stringify(done));
  assert.equal(done.historyMode, 'full');
  assert.ok(done.imported > 700, `imported ${done.imported}`);
  await jobIdle();

  const csv = store();
  const rows = csv.trim().split(/\r?\n/).slice(1);
  const mine = rows.filter(r => r.includes(`${id}.acc_fake`));
  assert.ok(mine.length > 700, `${mine.length} rows`);
  assert.ok(!csv.includes('Declined Shop') && !csv.includes('Pending Shop') && !csv.includes('CARD CHECK'), 'declined, pending and 0.00 left out');
  assert.ok(csv.includes('To pot: Rainy day'), 'pot moves are named');
  // Three years back (the full history, not just 90 days).
  const dates = mine.map(r => r.split(',')[0]).sort();
  assert.ok(Date.parse(dates[0]) < Date.now() - 900 * 86400000, `earliest ${dates[0]}`);

  // Accounts: current + joint + the 3 live pots (balances only), masked numbers.
  const acc = (await call('GET', '/api/fin-connect/accounts')).json;
  const g = acc.groups.find(x => x.sourceId === id);
  assert.equal(g.provider, 'monzo');
  assert.equal(g.state, 'ok');
  assert.deepEqual(g.accounts.map(a => a.kind).sort(), ['current', 'joint', 'pot', 'pot', 'pot']);
  assert.ok(g.accounts.every(a => !a.mask || /^••••\d{4}$/.test(a.mask)));
  assert.ok(!JSON.stringify(acc).includes('FAKE0011'), 'never a full account number');
  const cur = g.accounts.find(a => a.kind === 'current');
  assert.equal(cur.balance, 1520.34);
  assert.equal(g.accounts.find(a => a.name === 'Rainy day').balance, 1200);
  assert.ok(!g.accounts.some(a => a.name === 'Old pot'), 'deleted pots are left out');

  // Bank categories came through (Monzo's own), and income stays income.
  const cats = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'bank_categories.json'), 'utf8'));
  assert.ok(Object.values(cats).includes('Groceries'));

  // Finances shows the accounts as chips.
  const fin = (await call('GET', '/api/finance')).json;
  assert.ok(fin.meta.accounts.some(a => a.key === `${id}.acc_fake0000000000000000a1`));
  assert.equal(fin.meta.canSync, true);

  // The page never sees a secret.
  const prov = await call('GET', '/api/fin-connect/providers');
  for (const s of [SECRET, 'fake-access', 'fake-refresh', 'user_fake0001']) assert.ok(!prov.text.includes(s) && !acc.toString().includes(s), s);
  const m = prov.json.providers.find(p => p.id === 'monzo');
  assert.equal(m.fake, true);
  assert.match(m.sources[0].status.client, /^oauth2client_••••\w{4}$/);
  assert.equal(m.redirectUri, `http://localhost:${port}/api/fin-connect/monzo/callback`);
  // Secrets are only in secrets/fin.
  const sec = JSON.parse(readFileSync(join(dir, 'secrets', 'fin', `monzo-${id}.json`), 'utf8'));
  assert.equal(sec.clientSecret, SECRET);
  assert.ok(sec.refreshToken && sec.approvedAt);
  assert.ok(!readFileSync(join(dir, 'sources.json'), 'utf8').includes(SECRET));
  assert.ok(!readFileSync(join(dir, 'sources.json'), 'utf8').includes('user_fake0001'), 'only a hash of the Monzo user');
});

test('a normal update fetches only the overlap window and adds nothing twice', async () => {
  const before = store();
  const id = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find(s => s.provider === 'monzo').id;
  const n0 = (await call('GET', '/api/fin-connect/fake')).json.fakes.monzo.calls;
  const r = await call('POST', `/api/fin-connect/sources/${id}/sync`, {});
  assert.equal(r.status, 202, r.text);
  const fin = await jobIdle();
  assert.equal(fin.job.state, 'ok', JSON.stringify(fin.job));
  // The fake counted the calls: one page per account, each from (last transaction - 36 days).
  const f = (await call('GET', '/api/fin-connect/fake')).json.fakes.monzo;
  const tx = f.recent.slice(-(f.calls - n0)).filter(x => x.path === '/transactions');
  assert.equal(tx.length, 2, JSON.stringify(tx));
  for (const x of tx) assert.ok(Date.parse(x.since) > Date.now() - 40 * 86400000 && Date.parse(x.since) < Date.now() - 30 * 86400000, x.since);
  assert.equal(store(), before, 'the overlap re-reads rows the store already has');
  const cursor = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'connectors', `${id}.json`), 'utf8'));
  assert.equal(cursor.historyMode, 'full');
  assert.ok(cursor.accounts.acc_fake0000000000000000a1.lastDate);
});

test('one-time refresh: the new pair is saved before use; a used refresh token is never sent again', async () => {
  const id = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find(s => s.provider === 'monzo').id;
  const file = join(dir, 'secrets', 'fin', `monzo-${id}.json`);
  const { secretsFor } = await import('../lib/fin-connect/secrets.mjs');
  const sec = secretsFor(dir);
  const old = JSON.parse(readFileSync(file, 'utf8'));
  await sec.write(`monzo-${id}`, { ...old, expiresAt: Date.now() - 1000 });   // the access token has expired
  const r = await call('POST', `/api/fin-connect/sources/${id}/sync`, {});
  assert.equal(r.status, 202);
  const fin = await jobIdle();
  assert.equal(fin.job.state, 'ok', JSON.stringify(fin.job));
  const now = JSON.parse(readFileSync(file, 'utf8'));
  assert.notEqual(now.refreshToken, old.refreshToken, 'a new refresh token was saved');
  assert.notEqual(now.accessToken, old.accessToken);
  assert.ok(now.expiresAt > Date.now());
});

test('sign-in again: a refused refresh marks the source "needs sign-in", and Sign in again keeps the client', async () => {
  const id = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find(s => s.provider === 'monzo').id;
  const file = join(dir, 'secrets', 'fin', `monzo-${id}.json`);
  const { secretsFor } = await import('../lib/fin-connect/secrets.mjs');
  const old = JSON.parse(readFileSync(file, 'utf8'));
  await secretsFor(dir).write(`monzo-${id}`, { ...old, expiresAt: Date.now() - 1000, refreshToken: 'fake-refresh-already-used' });
  await call('POST', `/api/fin-connect/sources/${id}/sync`, {});
  const fin = await jobIdle();
  assert.match(JSON.stringify(fin.job.result.warnings), /sign in again/i);
  const g = (await call('GET', '/api/fin-connect/accounts')).json.groups.find(x => x.sourceId === id);
  assert.equal(g.state, 'auth');
  const src = (await call('GET', '/api/sources')).json.sources.find(s => s.id === id);
  assert.equal(src.health.state, 'auth');
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).needsAuth, true);

  // Sign in again: the same source, same client (no secret re-typed), approval, back to ok.
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id}`);
  assert.equal(go.status, 302);
  const a = new URL(go.headers.location);
  const back = await call('GET', a.pathname + a.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  const cb = new URL(back.headers.location);
  assert.equal((await call('GET', cb.pathname + cb.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' })).status, 200);
  // The state is single-use.
  const again = await call('GET', cb.pathname + cb.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(again.status, 400);
  assert.match(again.text, /expired or was not started from OpenDash/);
  await until(async () => { const x = (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json; return x.state === 'done' ? x : null; });
  await jobIdle();
  const g2 = (await call('GET', '/api/fin-connect/accounts')).json.groups.find(x => x.sourceId === id);
  assert.equal(g2.state, 'ok');
  assert.equal(JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.filter(s => s.provider === 'monzo').length, 1, 'one source per Monzo user');
});

test('missed window: connected with the last 90 days, and the page is told to offer "Get full history"', async () => {
  const id = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find(s => s.provider === 'monzo').id;
  await fake({ windowMs: 1, approveMs: 0 });
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id}`);
  const a = new URL(go.headers.location);
  const back = await call('GET', a.pathname + a.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  const cb = new URL(back.headers.location);
  await call('GET', cb.pathname + cb.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  const x = await until(async () => { const v = (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json; return ['done', 'expired', 'error'].includes(v.state) ? v : null; });
  assert.equal(x.state, 'expired', JSON.stringify(x));
  assert.equal(x.code, 'LIMITED_HISTORY');
  assert.match(x.message, /last 90 days/);
  assert.match(x.message, /Get full history/);
  await jobIdle();
  // History already in the store from before stays "full" (the earlier full import counts).
  const prov = (await call('GET', '/api/fin-connect/providers')).json.providers.find(p => p.id === 'monzo');
  assert.equal(prov.sources[0].status.historyMode, 'full');
  await fake({ windowMs: 60000, approveMs: 250 });
});

test('app approval never arrives: an error with a plain message, nothing imported, other syncs unaffected', async () => {
  await fake({ approveMs: 'never', approvalWaitMs: 400 });
  // A second Monzo wizard for the same person (e.g. a new client): the fake user is the same.
  const put = await call('PUT', '/api/fin-connect/monzo/client', { clientId: 'oauth2client_fake0000000000000002', clientSecret: SECRET });
  const id2 = put.json.sourceId;
  const s2 = (await call('GET', '/api/sources')).json.sources.find(s => s.id === id2);
  assert.equal(s2.health.state, 'setup', 'not signed in yet');
  assert.equal(s2.setup, true);
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id2}`);
  const a = new URL(go.headers.location);
  const back = await call('GET', a.pathname + a.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  const cb = new URL(back.headers.location);
  await call('GET', cb.pathname + cb.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  // Same Monzo user as the first source: the sign-in joined it, and the second source is gone.
  const list = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.filter(s => s.provider === 'monzo');
  assert.equal(list.length, 1);
  assert.ok(!existsSync(join(dir, 'secrets', 'fin', `monzo-${id2}.json`)));
  const id = list[0].id;
  // The page still asks about the id it started with: it is told where the sign-in went.
  assert.equal((await call('GET', `/api/fin-connect/monzo/approval?source=${id2}`)).json.sourceId, id);
  const x = await until(async () => { const v = (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json; return v.state === 'error' ? v : null; });
  assert.equal(x.code, 'NOT_APPROVED');
  assert.match(x.message, /not been approved/);
  await fake({ approveMs: 250, approvalWaitMs: 30000 });
});

test('rate limits are retried (Retry-After); a network failure is a warning, not a crash', async () => {
  const id = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find(s => s.provider === 'monzo').id;
  // Sign in again so the token is approved (the last test left an unapproved one).
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id}`);
  const a = new URL(go.headers.location);
  const back = await call('GET', a.pathname + a.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  const cb = new URL(back.headers.location);
  await call('GET', cb.pathname + cb.search, undefined, { Origin: null, 'Sec-Fetch-Site': 'cross-site' });
  await until(async () => { const v = (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json; return v.state === 'done' ? v : null; });
  await jobIdle();
  await fake({ fail: 'rate:0.3' });
  await call('POST', `/api/fin-connect/sources/${id}/sync`, {});
  let fin = await jobIdle();
  await fake({ fail: 'network' });
  await call('POST', `/api/fin-connect/sources/${id}/sync`, {});
  fin = await jobIdle();
  assert.match(JSON.stringify(fin.job.result.warnings), /could not be reached/);
  const g = (await call('GET', '/api/fin-connect/accounts')).json.groups.find(x => x.sourceId === id);
  assert.equal(g.state, 'error');
  await fake({ fail: '' });
});

test('rename, hide, and disconnect (keep data / remove data with Undo)', async () => {
  const id = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find(s => s.provider === 'monzo').id;
  const key = `${id}.acc_fake0000000000000000b2`;
  const r = await call('PATCH', `/api/fin-connect/accounts/${encodeURIComponent(key)}`, { name: 'Shared bills', colour: 'amber' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.account.name, 'Shared bills');
  assert.equal(r.json.account.renamed, true);
  const h = await call('PATCH', `/api/fin-connect/accounts/${encodeURIComponent(key)}`, { enabled: false });
  assert.equal(h.json.account.enabled, false);
  assert.equal((await call('PATCH', `/api/fin-connect/accounts/${encodeURIComponent(key)}`, { colour: 'neon' })).status, 400);
  assert.equal((await call('PATCH', '/api/fin-connect/accounts/nope.nope', { enabled: true })).status, 404);

  const before = store().split(/\r?\n/).filter(l => l.includes(id + '.')).length;
  assert.ok(before > 0);
  const d = await call('POST', `/api/fin-connect/sources/${id}/disconnect`, { removeData: true });
  assert.equal(d.status, 200, d.text);
  assert.equal(d.json.removed, before);
  assert.ok(d.json.undo);
  assert.ok(!existsSync(join(dir, 'secrets', 'fin', `monzo-${id}.json`)), 'the saved sign-in is deleted');
  assert.ok(!JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.some(s => s.id === id));
  await jobIdle();
  assert.equal(store().split(/\r?\n/).filter(l => l.includes(id + '.')).length, 0);
  const u = await call('POST', '/api/fin-connect/undo', { token: d.json.undo });
  assert.equal(u.status, 200, u.text);
  assert.equal(u.json.restored, before);
  await jobIdle();
  assert.equal(store().split(/\r?\n/).filter(l => l.includes(id + '.')).length, before);
  assert.equal((await call('POST', '/api/fin-connect/undo', { token: d.json.undo })).status, 404, 'undo once');
  assert.equal(readdirSync(join(dir, 'secrets', 'fin')).filter(f => f.startsWith('monzo-')).length, 0);
});
