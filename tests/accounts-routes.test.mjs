// /api/accounts through the real router: Host (421), same origin (403), JSON
// (415), body limits (413); only the GET sign-in return takes a cross-site
// navigation. A private server on a free port (never 4173), temp folders, no
// network.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { createApp } from '../server/router.mjs';
import registerAccounts from '../server/routes/accounts.mjs';
import { createAccountsService } from '../lib/accounts.mjs';
import { dataPaths } from '../lib/datadir.mjs';

let base, dir, srv, port;
function raw(method, path, headers = {}, body) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers }, setHost: false, agent: false }, (r) => {
      let data = ''; r.setEncoding('utf8'); r.on('data', (d) => { data += d; }); r.on('end', () => res({ status: r.statusCode, text: data, headers: r.headers }));
    });
    req.on('error', rej);
    if (body !== undefined) req.write(body);
    req.end();
  });
}
const SAME = () => ({ Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' });
const EVIL = { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' };
const JSONH = { 'Content-Type': 'application/json' };

before(async () => {
  base = mkdtempSync(join(tmpdir(), 'accounts-routes-'));
  dir = join(base, 'data'); mkdirSync(dir);
  srv = createServer(async (req, res) => { if (!(await app.handle(req, res))) { res.statusCode = 404; res.end(); } });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  port = srv.address().port;
  ctx.port = port;
});
after(async () => { await new Promise((r) => srv.close(r)); rmSync(base, { recursive: true, force: true }); });
const ctx = { get dataDir() { return dir; }, get paths() { return dataPaths(dir); }, log: () => {} };
let app;
before(() => {
  ctx.accounts = createAccountsService({ dataDir: dir, port: () => port, fetchFn: async () => { throw new Error('no network in tests'); }, deviceId: 'deviceaaaa1' });
  app = createApp(ctx);
  registerAccounts(app);
});

test('every accounts route refuses another site and a foreign Host; the page itself passes', async () => {
  const routes = app.routes.filter(r => r.path && r.path.startsWith('/api/accounts'));
  assert.ok(routes.length >= 10);
  for (const r of routes) {
    for (const m of [].concat(r.methods)) {
      const body = m === 'GET' ? undefined : '{}';
      const h = m === 'GET' ? {} : JSONH;
      const host = await raw(m, r.path, { ...h, ...SAME(), Host: 'evil.example' }, body);
      assert.equal(host.status, 421, `${m} ${r.path} foreign Host`);
      const cross = await raw(m, r.path, { ...h, ...EVIL }, body);
      if (r.crossSite && m === 'GET') assert.equal(cross.status, 400, `${m} ${r.path} takes the navigation but refuses a forged state`);
      else assert.equal(cross.status, 403, `${m} ${r.path} cross-site`);
    }
  }
  const ok = await raw('GET', '/api/accounts', SAME());
  assert.equal(ok.status, 200);
  const doc = JSON.parse(ok.text);
  assert.deepEqual(doc.accounts, []);
  assert.equal(doc.providers.imap.available, true);
});

test('writes need JSON and stay small; unknown ids are refused plainly', async () => {
  assert.equal((await raw('POST', '/api/accounts/pause', { ...SAME(), 'Content-Type': 'text/plain' }, '{"id":"x"}')).status, 415);
  assert.equal((await raw('POST', '/api/accounts/remove', { ...SAME(), ...JSONH }, JSON.stringify({ id: 'x'.repeat(70000) }))).status, 413);
  const bad = await raw('POST', '/api/accounts/remove', { ...SAME(), ...JSONH }, '{"id":"../../secrets"}');
  assert.equal(bad.status, 400);
  const unknown = await raw('POST', '/api/accounts/pause', { ...SAME(), ...JSONH }, '{"id":"acc_0123456789abcdef","paused":true}');
  assert.equal(unknown.status, 404); assert.equal(JSON.parse(unknown.text).code, 'UNKNOWN_ACCOUNT');
});

test('a forged sign-in return changes nothing; begin without an address explains what to type', async () => {
  const cb = await raw('GET', '/api/accounts/callback?state=forged&code=forged', EVIL);
  assert.equal(cb.status, 400); assert.match(cb.text, /not started from OpenDash/);
  assert.match(cb.headers['content-type'], /text\/html/);
  assert.ok(!existsSync(join(dir, 'accounts.json')));
  const begin = await raw('POST', '/api/accounts/begin', { ...SAME(), ...JSONH }, '{"provider":"microsoft","email":"nope"}');
  assert.equal(begin.status, 400); assert.match(JSON.parse(begin.text).error, /full email address/);
  const other = await raw('POST', '/api/accounts/begin', { ...SAME(), ...JSONH }, '{"provider":"imap","email":"me@yahoo.example"}');
  assert.equal(JSON.parse(other.text).code, 'BAD_REQUEST'); assert.match(JSON.parse(other.text).error, /app password/, 'IMAP accounts connect with an app password, not a browser sign-in');
});
