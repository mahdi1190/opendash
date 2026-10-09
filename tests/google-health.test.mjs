// Synthetic OAuth and Health responses only. No real account or health data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGoogleHealth, GOOGLE_HEALTH_SCOPES } from '../lib/google-health.mjs';
import registerHealth from '../server/routes/google-health.mjs';
import { createApp } from '../server/router.mjs';

const CREDENTIALS = { web: { client_id: '123456789-synthetic.apps.googleusercontent.com', client_secret: 'synthetic-client-secret', auth_uri: 'https://example.test/steal', token_uri: 'https://example.test/steal' } };
const CALLBACK = 'http://localhost:4900/api/google-health/callback';
const reply = (doc, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(doc) });
const grant = extra => ({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'Bearer', scope: GOOGLE_HEALTH_SCOPES.join(' '), ...extra });
const identity = { name: 'users/me/identity', healthUserId: '123456789', legacyUserId: 'A1B2C3' };
const delay = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function fixture(run, handler = () => undefined) {
  const dir = mkdtempSync(join(tmpdir(), 'google-health-test-')); let clock = Date.parse('2026-10-08T12:00:00Z');
  const calls = [];
  const health = createGoogleHealth({ dataDir: dir, now: () => clock, fetchFn: async (url, opts) => {
    const parsed = new URL(url); calls.push({ url: parsed, opts });
    assert.equal(opts.redirect, 'error'); assert.ok(opts.signal);
    assert.ok(['health.googleapis.com', 'oauth2.googleapis.com'].includes(parsed.hostname), 'tokens never go to downloaded credential URLs');
    if (parsed.hostname === 'health.googleapis.com') {
      assert.equal(opts.headers.Authorization, 'Bearer synthetic-access');
      assert.ok(opts.method === 'GET' || (opts.method === 'POST' && parsed.pathname.endsWith('/steps/dataPoints:dailyRollUp')), 'Health access is read-only');
    }
    const out = await handler(parsed, opts, calls);
    if (out) return out;
    if (parsed.hostname === 'oauth2.googleapis.com') return reply(grant());
    if (parsed.pathname.endsWith('/identity')) return reply(identity);
    return reply(parsed.pathname.endsWith(':dailyRollUp') ? { rollupDataPoints: [] } : { dataPoints: [] });
  } });
  const begin = async () => { await health.configure(CREDENTIALS); return new URL(await health.authUrl(CALLBACK)); };
  const signIn = async () => { const u = await begin(); await health.callback({ state: u.searchParams.get('state'), code: 'synthetic-code' }); return u; };
  try { await run({ dir, health, calls, begin, signIn, advance: n => clock += n }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('Google Health configuration isolates secrets and OAuth uses one-use state with PKCE', async () => fixture(async ({ health, dir, calls, begin }) => {
  assert.equal((await health.status()).connected, false);
  await assert.rejects(health.authUrl(CALLBACK), { code: 'NOT_CONFIGURED' });
  await assert.rejects(health.configure({}), { code: 'BAD_REQUEST' });
  const u = await begin();
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.deepEqual(u.searchParams.get('scope').split(' '), GOOGLE_HEALTH_SCOPES);
  assert.equal(u.searchParams.get('access_type'), 'offline'); assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(u.searchParams.has('client_secret'), false);
  for (const uri of ['https://example.test/api/google-health/callback', 'http://localhost:4900/elsewhere', 'http://user@localhost:4900/api/google-health/callback']) await assert.rejects(health.authUrl(uri), { code: 'BAD_REQUEST' });
  await assert.rejects(health.callback({ state: 'wrong', code: 'x' }), { code: 'OAUTH_STATE' });
  const out = await health.callback({ state: u.searchParams.get('state'), code: 'synthetic-code' });
  assert.equal(out.connected, true); assert.deepEqual(out.identity, { healthUserId: identity.healthUserId, legacyUserId: identity.legacyUserId });
  assert.equal(calls[0].url.href, 'https://oauth2.googleapis.com/token');
  const exchange = calls[0].opts.body;
  assert.equal(exchange.get('client_secret'), CREDENTIALS.web.client_secret);
  assert.equal(createHash('sha256').update(exchange.get('code_verifier')).digest('base64url'), u.searchParams.get('code_challenge'));
  assert.equal(exchange.get('redirect_uri'), CALLBACK);
  assert.equal(calls[1].url.pathname, '/v4/users/me/identity');
  await assert.rejects(health.callback({ state: u.searchParams.get('state'), code: 'synthetic-code' }), { code: 'OAUTH_STATE' });
  assert.ok(!/synthetic-access|synthetic-refresh|synthetic-client-secret/.test(JSON.stringify(out)));
  const stored = JSON.parse(readFileSync(join(dir, 'secrets', 'google-health-client.json')));
  assert.equal(stored.clientId, CREDENTIALS.web.client_id); assert.equal('token_uri' in stored, false);
  assert.equal((await health.configure(JSON.stringify(CREDENTIALS))).changed, false); assert.equal((await health.status()).connected, true);
  await health.disconnect(); assert.equal((await health.status()).connected, false);
  assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'google-health-tokens.json'))), null);
}));

test('Google Health verifies linkage before storing tokens and reports unlinked accounts plainly', async () => fixture(async ({ health, begin, dir }) => {
  const u = await begin();
  await assert.rejects(health.callback({ state: u.searchParams.get('state'), code: 'x' }), { code: 'ACCOUNT_NOT_LINKED' });
  const out = await health.status(); assert.equal(out.connected, false); assert.match(out.error, /mobile app/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'google-health-tokens.json'))), null);
}, url => url.pathname.endsWith('/identity') ? reply({ error: { message: 'sensitive provider detail', details: [{ reason: 'ACCOUNT_NOT_LINKED', metadata: { redirect_uri: 'https://example.test/steal' } }] } }, 400) : undefined));

test('Google Health refuses identity responses without a health user ID', async () => fixture(async ({ health, begin }) => {
  const u = await begin(); await assert.rejects(health.callback({ state: u.searchParams.get('state'), code: 'x' }), { code: 'GOOGLE_HEALTH_RESPONSE' });
  assert.equal((await health.status()).connected, false);
}, url => url.pathname.endsWith('/identity') ? reply({ legacyUserId: 'A1B2C3' }) : undefined));

test('Google Health expired, cancelled and disconnected OAuth requests cannot connect', async () => fixture(async ({ health, begin, advance, calls }) => {
  const expired = await begin(); advance(600001);
  await assert.rejects(health.callback({ state: expired.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' });
  const cancelled = await begin();
  await assert.rejects(health.callback({ state: cancelled.searchParams.get('state'), error: 'access_denied' }), { code: 'OAUTH_CANCELLED' });
  await assert.rejects(health.callback({ state: cancelled.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' });
  const pending = await begin(); await health.disconnect();
  await assert.rejects(health.callback({ state: pending.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' });
  assert.equal(calls.length, 0);
}));

test('Google Health accepts partial consent and reads only the permitted stream', async () => fixture(async ({ health, signIn, calls }) => {
  await signIn(); const got = await health.sync({ today: '2026-10-08' });
  assert.deepEqual(got.permissions, { activity: false, sleep: true }); assert.equal(got.connected, true);
  assert.equal(calls.some(c => c.url.pathname.includes('/steps/')), false);
  assert.match(got.snapshot.warnings[0], /Steps permission/);
}, url => url.hostname === 'oauth2.googleapis.com' ? reply(grant({ scope: GOOGLE_HEALTH_SCOPES[1] })) : undefined));

test('Google Health zero consent fails without trying the health API', async () => fixture(async ({ health, begin, calls }) => {
  const u = await begin(); await assert.rejects(health.callback({ state: u.searchParams.get('state'), code: 'x' }), { code: 'GOOGLE_HEALTH_PERMISSIONS' });
  assert.equal(calls.length, 1); assert.equal((await health.status()).connected, false);
}, () => reply(grant({ scope: 'unrelated-scope' }))));

test('Google Health removed sleep permission updates consent status while steps keep syncing', async () => fixture(async ({ health, signIn }) => {
  await signIn(); const got = await health.sync({ today: '2026-10-08' });
  assert.equal(got.connected, true); assert.deepEqual(got.permissions, { activity: true, sleep: false });
  assert.deepEqual(got.snapshot.sleep, []); assert.match(got.snapshot.warnings[0], /Sleep permission was removed/);
  assert.deepEqual((await health.status()).permissions, { activity: true, sleep: false });
}, url => url.pathname.endsWith(':reconcile') ? reply({ error: { details: [{ reason: 'MISSING_OAUTH_SCOPE' }] } }, 403) : undefined));

test('Google Health sync uses civil dates, reconciled sleep and sanitized seven-day summaries', async () => fixture(async ({ health, signIn, calls }) => {
  await signIn(); const got = await health.sync({ today: '2026-10-08' });
  assert.equal(got.snapshot.from, '2026-10-02'); assert.equal(got.snapshot.to, '2026-10-08');
  assert.deepEqual(got.snapshot.steps, [{ date: '2026-10-08', count: 8430 }]);
  assert.deepEqual(got.snapshot.sleep, [{ start: '2026-10-07T22:00:00.000Z', end: '2026-10-08T06:00:00.000Z', minutesAsleep: 407 }]);
  assert.equal(got.lastSync, '2026-10-08T12:00:00.000Z');
  const stepsCall = calls.find(c => c.url.pathname.endsWith(':dailyRollUp'));
  assert.deepEqual(JSON.parse(stepsCall.opts.body).range, { start: { date: { year: 2026, month: 10, day: 2 }, time: {} }, end: { date: { year: 2026, month: 10, day: 9 }, time: {} } });
  const sleepCall = calls.find(c => c.url.pathname.endsWith(':reconcile'));
  assert.equal(sleepCall.url.searchParams.get('filter'), 'sleep.interval.civil_end_time >= "2026-10-02" AND sleep.interval.civil_end_time < "2026-10-09"');
  assert.equal(calls.filter(c => c.url.pathname.endsWith(':reconcile')).length, 2);
  assert.ok(!JSON.stringify(got).includes('secret-device-id'));
  await assert.rejects(health.sync({ today: '2026-02-30' }), { code: 'BAD_REQUEST' });
}, url => {
  if (url.pathname.endsWith(':dailyRollUp')) return reply({ rollupDataPoints: [
    { civilStartTime: { date: { year: 2026, month: 10, day: 8 } }, steps: { countSum: '8430' }, source: 'secret-device-id' },
    { civilStartTime: { date: { year: 2026, month: 9, day: 30 } }, steps: { countSum: '100' } },
    { civilStartTime: { date: { year: 2026, month: 10, day: 7 } }, steps: { countSum: '-5' } },
  ] });
  if (url.pathname.endsWith(':reconcile')) return reply({ dataPoints: [{ sleep: { interval: { startTime: '2026-10-07T22:00:00Z', endTime: '2026-10-08T06:00:00Z' }, summary: { minutesAsleep: '407' }, raw: 'secret-device-id' } }], ...(url.searchParams.has('pageToken') ? {} : { nextPageToken: 'synthetic-page' }) });
}));

test('Google Health concurrent sync refreshes once and invalid grants require reconnect', async () => {
  let revoked = false;
  await fixture(async ({ health, signIn, advance, calls, dir }) => {
    await signIn(); advance(3600000);
    await Promise.all([health.sync(), health.sync()]);
    assert.equal(calls.filter(c => c.opts.body?.get?.('grant_type') === 'refresh_token').length, 1);
    assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'google-health-tokens.json'))).refresh_token, 'rotated-refresh');
    revoked = true; advance(3600000);
    await assert.rejects(health.sync(), { code: 'GOOGLE_HEALTH_AUTH' });
    const out = await health.status(); assert.equal(out.connected, false); assert.equal(out.needsAuth, true); assert.equal(out.snapshot, null);
    assert.ok(!JSON.stringify(out).includes('sensitive provider detail'));
  }, (url, opts) => url.hostname === 'oauth2.googleapis.com' && opts.body.get('grant_type') === 'refresh_token'
    ? revoked ? reply({ error: 'invalid_grant', error_description: 'sensitive provider detail' }, 400) : reply(grant({ refresh_token: 'rotated-refresh', scope: undefined })) : undefined);
});

test('Google Health disconnect during refresh cannot resurrect tokens or cached health data', async () => {
  const entered = delay(), release = delay();
  await fixture(async ({ health, signIn, advance, dir }) => {
    await signIn(); advance(3600000);
    const sync = health.sync(); const rejected = assert.rejects(sync, { code: 'GOOGLE_HEALTH_CHANGED' });
    await entered.promise; const disconnected = health.disconnect(); release.resolve();
    await rejected; await disconnected;
    assert.equal((await health.status()).connected, false);
    assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'google-health-tokens.json'))), null);
  }, async (url, opts) => {
    if (url.hostname === 'oauth2.googleapis.com' && opts.body.get('grant_type') === 'refresh_token') { entered.resolve(); await release.promise; return reply(grant()); }
  });
});

test('Google Health disconnect during identity verification prevents callback save', async () => {
  const entered = delay(), release = delay();
  await fixture(async ({ health, begin, dir }) => {
    const u = await begin(), callback = health.callback({ state: u.searchParams.get('state'), code: 'x' });
    const rejected = assert.rejects(callback, { code: 'GOOGLE_HEALTH_CHANGED' });
    await entered.promise; await health.disconnect(); release.resolve(); await rejected;
    assert.equal((await health.status()).connected, false);
    assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'google-health-tokens.json'))), null);
  }, async url => { if (url.pathname.endsWith('/identity')) { entered.resolve(); await release.promise; return reply(identity); } });
});

test('Google Health denied API access reports project availability without raw provider details', async () => fixture(async ({ health, begin }) => {
  const u = await begin(); await assert.rejects(health.callback({ state: u.searchParams.get('state'), code: 'x' }), { code: 'GOOGLE_HEALTH_ACCESS' });
  const out = await health.status(); assert.equal(out.connected, false); assert.match(out.error, /pausing new/); assert.ok(!out.error.includes('sensitive provider detail'));
}, url => url.pathname.endsWith('/identity') ? reply({ error: { message: 'sensitive provider detail', status: 'PERMISSION_DENIED' } }, 403) : undefined));

test('Google Health callback reports reconnection if its first sync loses authorization', async () => {
  let identityReads = 0;
  await fixture(async ({ health, begin, dir }) => {
    const auth = await begin(), routes = [];
    registerHealth({ ctx: { dataDir: dir, googleHealth: health, log() {} }, route: route => routes.push(route) });
    let status, html;
    await routes.find(r => r.path.endsWith('/callback')).handler({
      query: new URLSearchParams({ state: auth.searchParams.get('state'), code: 'synthetic-code' }),
      res: { setHeader() {} }, clockNow: () => ({ today: '2026-10-08' }),
      send: (code, text) => { status = code; html = text; },
    });
    assert.equal(status, 401); assert.match(html, /<h2>Google Health needs reconnection<\/h2>/);
    assert.ok(!html.includes('Your Google Health account is connected'));
    assert.equal((await health.status()).connected, false); assert.equal((await health.status()).needsAuth, true);
  }, url => url.pathname.endsWith('/identity') && ++identityReads > 1 ? reply({ error: { message: 'sensitive provider detail' } }, 401) : undefined);
});

test('Google Health HTTP routes reject cross-site reads/writes and allow only the protected callback', async () => fixture(async ({ health, dir }) => {
  const ctx = { dataDir: dir, port: 4900, log() {}, googleHealth: health }, app = createApp(ctx);
  registerHealth(app);
  assert.deepEqual(app.routes.filter(r => r.crossSite).map(r => r.path), ['/api/google-health/callback']);
  // Exercise the real router without opening a socket; restricted hosts can
  // prohibit even loopback connections while all routing checks still apply.
  async function http(path, { method = 'GET', origin, body } = {}) {
    const text = body ? JSON.stringify(body) : '';
    const req = Readable.from(text ? [Buffer.from(text)] : []);
    Object.assign(req, { url: path, method, headers: { host: 'localhost:4900', ...(origin ? { origin } : {}), ...(text ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) } : {}) } });
    const res = { headersSent: false, headers: {}, setHeader(k, v) { this.headers[k] = v; }, writeHead(status, headers) { this.statusCode = status; this.headers = { ...this.headers, ...headers }; this.headersSent = true; }, end(body) { this.text = String(body || ''); } };
    assert.equal(await app.handle(req, res), true); return res;
  }
  const own = await http('/api/google-health/status'); const status = JSON.parse(own.text);
  assert.equal(own.statusCode, 200); assert.equal(status.redirectUri, CALLBACK);
  assert.equal((await http('/api/google-health/status', { origin: 'https://example.test' })).statusCode, 403);
  assert.equal((await http('/api/google-health/configure', { method: 'PUT', origin: 'https://example.test', body: { credentials: CREDENTIALS } })).statusCode, 403);
  assert.equal((await health.status()).configured, false);
  const cancelled = await http('/api/google-health/callback?state=wrong&code=secret-code', { origin: 'https://accounts.google.com' });
  assert.equal(cancelled.statusCode, 400); assert.match(cancelled.text, /Return to OpenDash Connections/); assert.ok(!cancelled.text.includes('secret-code'));
  const configured = await http('/api/google-health/configure', { method: 'PUT', body: { credentials: CREDENTIALS } });
  assert.equal(configured.statusCode, 200); assert.ok(!configured.text.includes('synthetic-client-secret'));
  const u = new URL(await health.authUrl(CALLBACK));
  const completed = await http('/api/google-health/callback?' + new URLSearchParams({ state: u.searchParams.get('state'), code: 'synthetic-code' }), { origin: 'https://accounts.google.com' });
  assert.equal(completed.statusCode, 200); assert.match(completed.text, /Google Health connected/);
  assert.ok((await health.status()).lastSync);
}));
