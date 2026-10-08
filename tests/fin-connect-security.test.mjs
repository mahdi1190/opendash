// /api/fin-connect/ safeguards on the real server (fake Monzo; other builders
// add their providers' cases): Host (421), same origin on every route (403)
// except the OAuth return, JSON only (415), body limits (413), one-use state,
// and no secret ever in a response or the server log.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';

let dir, port, srv;
const CLIENT = 'oauth2client_fake0000000000000077';
const SECRET = 'mnzconf.security-test-secret-0077';
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(method, path, body, headers = {}, raw) {
  return new Promise((res, rej) => {
    const h = { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers };
    for (const k of Object.keys(h)) if (h[k] == null) delete h[k];
    const req = request({ host: '127.0.0.1', port, method, path, headers: h }, (r) => {
      let data = ''; r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, json, text: data, headers: r.headers }); });
    });
    req.on('error', rej);
    if (raw !== undefined) req.write(raw); else if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
const xsite = { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' };
const nav = { Origin: null, 'Sec-Fetch-Site': 'cross-site' };
const until = async (fn, ms = 20000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timed out'); await new Promise(r => setTimeout(r, 60)); } };

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fin-sec-'));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  Object.assign(process.env, { DASHBOARD_MONZO_FAKE: '1', DASHBOARD_MONZO_FAKE_DELAY_MS: '0', DASHBOARD_MONZO_FAKE_APPROVE_MS: '100', DASHBOARD_MONZO_FAKE_POLL_MS: '40', DASHBOARD_MONZO_FAKE_WINDOW_MS: '60000' });
  process.env.USERPROFILE = dir; process.env.HOME = dir;
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => { await srv?.close(); rmSync(dir, { recursive: true, force: true }); });

test('every /api/fin-connect/ route refuses another site, a wrong Host and non-JSON bodies', async () => {
  for (const [m, p, b] of [['GET', '/api/fin-connect/providers'], ['GET', '/api/fin-connect/accounts'], ['GET', '/api/fin-connect/monzo/approval?source=bank-x-1a2b'],
    ['GET', '/api/fin-connect/monzo/connect?source=bank-x-1a2b'], ['PUT', '/api/fin-connect/monzo/client', { clientId: CLIENT, clientSecret: SECRET }],
    ['PATCH', '/api/fin-connect/accounts/x.y', { enabled: false }], ['POST', '/api/fin-connect/sources/bank-x-1a2b/sync', {}],
    ['POST', '/api/fin-connect/sources/bank-x-1a2b/disconnect', {}], ['POST', '/api/fin-connect/undo', { token: 'x' }], ['POST', '/api/fin-connect/fake', { provider: 'monzo', fail: 'auth' }]]) {
    assert.equal((await call(m, p, b, xsite)).status, 403, `${m} ${p} cross-site`);
    assert.equal((await call(m, p, b, { Host: 'evil.example' })).status, 421, `${m} ${p} wrong host`);
  }
  // Writes without our Origin (a form post from another site) are refused too.
  assert.equal((await call('PUT', '/api/fin-connect/monzo/client', { clientId: CLIENT, clientSecret: SECRET }, nav)).status, 403);
  assert.equal((await call('PUT', '/api/fin-connect/monzo/client', undefined, { 'Content-Type': 'text/plain' }, 'clientId=x')).status, 415);
  assert.equal((await call('PUT', '/api/fin-connect/monzo/client', undefined, {}, JSON.stringify({ clientId: CLIENT, clientSecret: 'x'.repeat(70 * 1024) }))).status, 413);
  // The OAuth return takes a navigation from Monzo, but only with a state OpenDash issued.
  const cb = await call('GET', '/api/fin-connect/monzo/callback?code=abc&state=made-up', undefined, nav);
  assert.equal(cb.status, 400);
  assert.match(cb.text, /not started from OpenDash/);
  assert.ok(!cb.text.includes('made-up') && !cb.text.includes('abc'), 'the page never echoes the query');
  assert.equal(cb.headers['referrer-policy'], 'no-referrer');
  // POST to the callback is never cross-site.
  assert.notEqual((await call('POST', '/api/fin-connect/monzo/callback', {}, xsite)).status, 200);
  assert.equal((await call('GET', '/api/fin-connect/nothing-here')).status, 404);
});

test('a full fake run: no secret, token, user id or account number in any response or the server log', async () => {
  const put = await call('PUT', '/api/fin-connect/monzo/client', { clientId: CLIENT, clientSecret: SECRET });
  assert.equal(put.status, 200);
  assert.ok(!put.text.includes(SECRET) && !put.text.includes(CLIENT), 'not even the client id: masked');
  const id = put.json.sourceId;
  const go = await call('GET', `/api/fin-connect/monzo/connect?source=${id}`);
  const a = new URL(go.headers.location);
  const back = await call('GET', a.pathname + a.search, undefined, nav);
  const cbUrl = new URL(back.headers.location);
  const page = await call('GET', cbUrl.pathname + cbUrl.search, undefined, nav);
  assert.equal(page.status, 200);
  // An expired state cannot be replayed.
  assert.equal((await call('GET', cbUrl.pathname + cbUrl.search, undefined, nav)).status, 400);
  await until(async () => (await call('GET', `/api/fin-connect/monzo/approval?source=${id}`)).json.state === 'done');
  await until(async () => { const s = (await call('GET', '/api/finance/status')).json; return s.job && s.job.state !== 'running'; });
  const sec = JSON.parse(readFileSync(join(dir, 'secrets', 'fin', `monzo-${id}.json`), 'utf8'));
  const needles = [SECRET, CLIENT, sec.accessToken, sec.refreshToken, sec.userId, 'FAKE0011', 'FAKE0022', cbUrl.searchParams.get('code'), cbUrl.searchParams.get('state')];
  const bodies = [];
  for (const p of ['/api/fin-connect/providers', '/api/fin-connect/accounts', `/api/fin-connect/monzo/approval?source=${id}`, '/api/sources', '/api/finance', '/api/connections']) bodies.push((await call('GET', p)).text);
  await srv.ctx.log.flush?.();
  const log = readFileSync(join(dir, 'logs', 'server.log'), 'utf8');
  for (const n of needles) {
    assert.ok(n && n.length > 5);
    for (const b of bodies) assert.ok(!b.includes(n), `a response contained a secret (${n.slice(0, 6)}…)`);
    assert.ok(!log.includes(n), `the log contained a secret (${n.slice(0, 6)}…)`);
  }
  assert.ok(!log.includes('acc_fake'), 'no account ids in the log');
  assert.ok(!log.includes('Bean There'), 'no merchants in the log');
  assert.ok(!readFileSync(join(dir, 'sources.json'), 'utf8').includes(sec.userId));
});
