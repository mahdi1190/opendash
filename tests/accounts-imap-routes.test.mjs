// "+ Other email" through the real router (server/routes/accounts-imap.mjs):
// Host 421, same origin 403, JSON 415, body limit 413; lookup; connect against
// the in-process fake IMAP server over TLS (the test trusts its own throwaway
// CA), the first inbox snapshot saved, and the app password nowhere but this
// computer's secret store. A private server on a free port (never 4173), temp
// folders, no network.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { createApp } from '../server/router.mjs';
import registerAccounts from '../server/routes/accounts.mjs';
import registerImap from '../server/routes/accounts-imap.mjs';
import { createAccountsService } from '../lib/accounts.mjs';
import { dataPaths } from '../lib/datadir.mjs';
import { secretStore, fileBackend } from '../lib/secret-store.mjs';
import { lookupProvider } from '../lib/accounts/imap-providers.mjs';
import { nodeImapTransport } from '../lib/imap-transport.mjs';
import { startFakeImap, rawMessage, selfSignedCert } from './fixtures/imap-fake-server.mjs';

const PASS = 'qwertyuiopasdfgh';
const CERT = selfSignedCert();
let base, dir, secretsDir, http, port, imap, app;
const ctx = { get dataDir() { return dir; }, get paths() { return dataPaths(dir); }, log: () => {} };
function raw(method, path, headers = {}, body) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers }, setHost: false, agent: false }, (r) => {
      let data = ''; r.setEncoding('utf8'); r.on('data', (d) => { data += d; }); r.on('end', () => res({ status: r.statusCode, text: data }));
    });
    req.on('error', rej);
    if (body !== undefined) req.write(body);
    req.end();
  });
}
const SAME = () => ({ Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' });
const post = (path, body) => raw('POST', path, SAME(), JSON.stringify(body));

before(async () => {
  base = mkdtempSync(join(tmpdir(), 'imap-routes-'));
  dir = join(base, 'data'); secretsDir = join(base, 'device', 'secrets'); mkdirSync(dir, { recursive: true });
  const today = new Date(); const iso = (d) => new Date(today.getTime() - d * 86400000).toISOString();
  imap = await startFakeImap({ tls: CERT, users: { 'jo@yahoo.com': PASS }, messages: [
    { uid: 1, flags: [], internalDate: iso(2), raw: rawMessage({ subject: 'Lunch?', from: 'Sam <sam@example.com>', body: 'Are you free on Friday?' }) },
    { uid: 2, flags: ['\\Seen'], internalDate: iso(40), raw: rawMessage({ subject: 'Too old' }) },
  ] });
  http = createServer(async (req, res) => { if (!(await app.handle(req, res))) { res.statusCode = 404; res.end(); } });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  port = http.address().port;
  ctx.port = port;
  ctx.accounts = createAccountsService({ dataDir: dir, port: () => port, deviceId: 'deviceaaaa1', store: secretStore(dir, { backend: fileBackend(secretsDir) }),
    fetchFn: async () => { throw new Error('no network in tests'); },
    imap: { openTransport: nodeImapTransport({ ca: CERT.cert }), mx: false,
      lookup: async (email) => { const p = lookupProvider(email); return p.kind === 'known' ? { ...p, imap: { host: '127.0.0.1', port: imap.port, security: 'tls' } } : p; } } });
  app = createApp(ctx);
  registerAccounts(app);
  registerImap(app);
});
after(async () => { await new Promise((r) => http.close(r)); await imap.close(); rmSync(base, { recursive: true, force: true }); });

test('the IMAP routes refuse another site, a foreign Host, non-JSON and big bodies', async () => {
  for (const path of ['/api/accounts/imap/lookup', '/api/accounts/imap/connect']) {
    assert.equal((await raw('POST', path, { ...SAME(), Host: 'evil.example' }, '{}')).status, 421, path);
    assert.equal((await raw('POST', path, { 'Content-Type': 'application/json', Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' }, '{}')).status, 403, path);
    assert.equal((await raw('POST', path, { ...SAME(), 'Content-Type': 'text/plain' }, '{}')).status, 415, path);
    assert.equal((await raw('POST', path, SAME(), JSON.stringify({ email: 'x'.repeat(70000) }))).status, 413, path);
    assert.equal((await raw('GET', path, SAME())).status, 405, path);
  }
});

test('lookup: the provider and its steps; Gmail sent to the one-click button; nothing saved', async () => {
  const y = JSON.parse((await post('/api/accounts/imap/lookup', { email: 'jo@yahoo.com' })).text).provider;
  assert.equal(y.kind, 'known'); assert.equal(y.name, 'Yahoo Mail'); assert.ok(y.steps.length >= 4);
  const g = JSON.parse((await post('/api/accounts/imap/lookup', { email: 'me@gmail.com' })).text).provider;
  assert.deepEqual([g.kind, g.provider], ['redirect', 'google']);
  assert.equal(JSON.parse((await post('/api/accounts/imap/lookup', { email: 'nope' })).text).provider.kind, 'invalid');
  assert.ok(!existsSync(join(dir, 'accounts.json')));
});

test('connect: a wrong password is a plain 401 and saves nothing; the right one connects and reads the inbox once', async () => {
  const bad = await post('/api/accounts/imap/connect', { email: 'jo@yahoo.com', password: 'my normal password' });
  assert.equal(bad.status, 401);
  assert.equal(JSON.parse(bad.text).code, 'WRONG_PASSWORD');
  assert.ok(!existsSync(join(dir, 'accounts.json')) || !JSON.parse(readFileSync(join(dir, 'accounts.json'), 'utf8')).accounts.length);
  const gm = await post('/api/accounts/imap/connect', { email: 'me@gmail.com', password: 'x' });
  assert.deepEqual([gm.status, JSON.parse(gm.text).code, JSON.parse(gm.text).retryProvider], [400, 'USE_ONE_CLICK', 'google']);

  const ok = await post('/api/accounts/imap/connect', { email: 'jo@yahoo.com', password: PASS.match(/.{4}/g).join(' ') });
  assert.equal(ok.status, 200, ok.text);
  assert.ok(!ok.text.includes(PASS), 'the password is never in an answer');
  const out = JSON.parse(ok.text);
  assert.equal(out.account.provider, 'imap'); assert.equal(out.account.statusText, 'Connected');
  assert.deepEqual(out.inbox, { exists: 2 });
  assert.deepEqual(out.results, [{ feature: 'mail', ok: true, count: 1 }]);
  // the first snapshot is ordinary data in the data folder
  const src = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).sources.find((s) => s.account === out.account.id);
  assert.equal(src.kind, 'imap'); assert.equal(src.capability, 'email');
  const snap = JSON.parse(readFileSync(join(dir, 'inbox', 'sources', src.id + '.json'), 'utf8'));
  assert.equal(snap.messages.length, 1);
  assert.equal(snap.messages[0].subject, 'Lunch?'); assert.equal(snap.messages[0].snippet, 'Are you free on Friday?');
  // the account list knows it; the password is only in this computer's secret store
  const list = JSON.parse((await raw('GET', '/api/accounts', { Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' })).text);
  assert.equal(list.accounts.length, 1); assert.equal(list.accounts[0].server.service, 'yahoo'); assert.equal(list.providers.imap.available, true);
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else files.push(f); } };
  walk(dir);
  for (const f of files) assert.ok(!readFileSync(f).includes(PASS), `no password in ${f}`);
  assert.ok(readFileSync(join(secretsDir, 'accounts', out.account.id + '.json'), 'utf8').includes(PASS));
  // a sync through the shared accounts route reads it again (on this computer, its fetcher)
  const sync = JSON.parse((await post('/api/accounts/sync', { id: out.account.id })).text);
  assert.deepEqual(sync.results, [{ feature: 'mail', ok: true, count: 1 }]);
  // removing forgets the secret and the snapshot
  await post('/api/accounts/remove', { id: out.account.id });
  assert.ok(!existsSync(join(secretsDir, 'accounts', out.account.id + '.json')));
  assert.ok(!existsSync(join(dir, 'inbox', 'sources', src.id + '.json')));
  if (process.env.LOCALAPPDATA) assert.ok(!existsSync(join(process.env.LOCALAPPDATA, 'OpenDash')), 'the real device folder is never touched');
});
