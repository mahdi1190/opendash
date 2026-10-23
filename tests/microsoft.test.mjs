// Microsoft through the accounts routes (server/routes/accounts.mjs): sign-in
// pages, first read, approval page, pause/features/remove, and readers that
// need no Claude. Synthetic OAuth/Graph responses only; never a real account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountsService } from '../lib/accounts.mjs';
import { createMicrosoft, MICROSOFT_SCOPES } from '../lib/microsoft.mjs';
import { PERSONAL_TENANT } from '../lib/accounts/microsoft.mjs';
import { readSourcesFile, createSourcesService } from '../lib/sources.mjs';
import { readSourceSnapshot, fetchCalendarSource } from '../lib/calendar-sources.mjs';
import { readInboxSnapshot, fetchEmailSource } from '../lib/inbox-sources.mjs';
import { dataPaths } from '../lib/datadir.mjs';
import { secretStore } from '../lib/secret-store.mjs';
import registerAccounts from '../server/routes/accounts.mjs';

const CLIENT = '00000000-0000-4000-8000-000000000001';
const WORK_TID = '11111111-2222-4333-8444-555555555555';
const reply = (doc, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(doc) });
const idToken = (claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';

async function fixture(run, { graph } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'microsoft-routes-'));
  const dir = join(base, 'data'); mkdirSync(dir);
  process.env.OPENDASH_MICROSOFT_CLIENT_ID = CLIENT;
  const calls = [];
  const fetchFn = async (url, opts) => {
    const u = new URL(url); calls.push({ url: u, opts });
    assert.equal(opts.redirect, 'error');
    if (u.hostname === 'login.microsoftonline.com') {
      assert.ok(!opts.body.has('client_secret'));
      const email = (opts.body.get('code') || '').replace(/^code-/, '') || 'me@hotmail.com';
      return reply({ access_token: 'access-' + email, refresh_token: 'refresh-' + email, expires_in: 3600, scope: 'User.Read Mail.Read Calendars.Read', id_token: idToken({ tid: /hotmail/.test(email) ? PERSONAL_TENANT : WORK_TID }) });
    }
    assert.equal(u.hostname, 'graph.microsoft.com'); assert.equal(opts.method, 'GET', 'Graph is read-only');
    const custom = graph && graph(u, opts);
    if (custom) return custom;
    if (u.pathname === '/v1.0/me') { const email = String(opts.headers.Authorization).replace(/^Bearer access-/, ''); return reply({ id: 'graph-' + email, mail: email, displayName: 'Synthetic' }); }
    if (u.pathname.endsWith('/calendars')) return reply({ value: [{ id: 'cal-1', name: 'Calendar' }] });
    if (u.pathname.endsWith('/messages')) return reply({ value: [{ id: 'm1', subject: 'Synthetic', from: { emailAddress: { address: 'a@example.test' } }, receivedDateTime: '2026-10-22T09:00:00Z', bodyPreview: 'hello', isRead: true }] });
    return reply({ value: [] });
  };
  const ctx = { dataDir: dir, paths: dataPaths(dir), port: 4900, log: () => {} };
  ctx.accounts = createAccountsService({ dataDir: dir, port: () => 4900, fetchFn, deviceId: 'deviceaaaa1' });
  const routes = [];
  registerAccounts({ ctx, route: (r) => routes.push(r), onReady() {} });
  const find = (path, method = 'GET') => routes.find(r => r.path === path && [].concat(r.method).includes(method));
  const call = async (path, method, { query = {}, body } = {}) => {
    const out = { status: 200, headers: {} };
    const c = {
      query: new URLSearchParams(query), body: async () => body || {}, clockNow: () => ({ today: '2026-10-23' }),
      res: { setHeader() {}, writeHead(s, h) { out.status = s; out.headers = h; }, end() {} },
      send: (s, text) => { out.status = s; out.text = text; },
    };
    try { out.json = await find(path, method).handler(c); } catch (e) { out.status = e.status || 500; out.error = e; }
    return out;
  };
  try { await run({ dir, ctx, routes, call, calls, paths: ctx.paths }); }
  finally { delete process.env.OPENDASH_MICROSOFT_CLIENT_ID; rmSync(base, { recursive: true, force: true }); }
}
const stateOf = (loc) => new URL(loc).searchParams.get('state');

test('only the sign-in returns accept cross-site navigation', async () => fixture(async ({ routes }) => {
  assert.deepEqual(routes.filter(r => r.crossSite).map(r => r.path).sort(), ['/api/accounts/callback', '/api/microsoft/callback']);
  assert.ok(routes.filter(r => r.crossSite).every(r => r.method === 'GET'));
  assert.equal(routes.find(r => r.path === '/api/accounts/begin' && r.method === 'GET').sameOrigin, true);
}));

test('add a Hotmail account: begin goes to /consumers, the return page says connected, mail and calendar are read', async () => fixture(async ({ call, dir, paths }) => {
  const b = await call('/api/accounts/begin', 'GET', { query: { provider: 'microsoft', email: 'me@hotmail.com' } });
  assert.equal(b.status, 302);
  const to = new URL(b.headers.Location);
  assert.equal(to.origin + to.pathname, 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize');
  assert.equal(to.searchParams.get('login_hint'), 'me@hotmail.com');
  const cb = await call('/api/accounts/callback', 'GET', { query: { state: stateOf(b.headers.Location), code: 'code-me@hotmail.com' } });
  assert.equal(cb.status, 200); assert.match(cb.text, /Your account is connected/); assert.match(cb.text, /me@hotmail\.com is now connected/);
  assert.ok(!/access-|refresh-/.test(cb.text), 'no token on the page');
  const src = (await readSourcesFile(dir)).sources;
  assert.equal(src.length, 2);
  assert.equal((await readInboxSnapshot(paths, src.find(s => s.capability === 'email').id)).messages.length, 1);
  assert.ok(await readSourceSnapshot(paths, src.find(s => s.capability === 'calendar').id));
  assert.ok(src.every(s => s.lastSync));
  const replay = await call('/api/accounts/callback', 'GET', { query: { state: stateOf(b.headers.Location), code: 'code-me@hotmail.com' } });
  assert.equal(replay.status, 400); assert.match(replay.text, /not started from OpenDash/);
  const list = (await call('/api/accounts', 'GET')).json;
  assert.equal(list.accounts.length, 1); assert.equal(list.accounts[0].statusText, 'Connected'); assert.equal(list.accounts[0].syncedText, 'synced just now');
  assert.equal(list.providers.microsoft.available, true); assert.equal(list.providers.imap.comingSoon, true);
  assert.ok(!JSON.stringify(list).includes('refresh-'));
}));

test('a work account whose organisation blocks consent gets the approval page, the admin link and the IT email', async () => fixture(async ({ call }) => {
  const b = await call('/api/accounts/begin', 'GET', { query: { provider: 'microsoft', email: 'me@work.example' } });
  assert.match(b.headers.Location, /\/organizations\/oauth2\/v2\.0\/authorize/);
  const cb = await call('/api/accounts/callback', 'GET', { query: { state: stateOf(b.headers.Location), error: 'access_denied', error_description: 'AADSTS90094: Admin consent required.' } });
  assert.equal(cb.status, 200);
  assert.match(cb.text, /Your organisation needs to approve OpenDash once/);
  assert.ok(cb.text.includes('https://login.microsoftonline.com/work.example/adminconsent?client_id=' + CLIENT));
  assert.match(cb.text, /href="mailto:\?subject=/); assert.match(cb.text, /Email my IT team/);
  assert.ok(!cb.text.includes('AADSTS'), 'never Microsoft\'s own text');
  const a = (await call('/api/accounts', 'GET')).json.accounts[0];
  assert.equal(a.status, 'needs-admin-approval'); assert.equal(a.statusText, 'Waiting for your organisation'); assert.ok(a.approval.mailto);
  const ap = (await call('/api/accounts/approval', 'GET', { query: { id: a.id } })).json;
  assert.equal(ap.tenant, 'work.example');
  // an admin who approved comes back with admin_consent and no state of ours
  const thanks = await call('/api/accounts/callback', 'GET', { query: { admin_consent: 'True', tenant: WORK_TID } });
  assert.equal(thanks.status, 200); assert.match(thanks.text, /OpenDash is approved/);
  // Try again: the same record becomes connected
  const again = await call('/api/accounts/begin', 'POST', { body: { provider: 'microsoft', accountId: a.id } });
  const ok = await call('/api/accounts/callback', 'GET', { query: { state: stateOf(again.json.url), code: 'code-me@work.example' } });
  assert.match(ok.text, /Your account is connected/);
  const after = (await call('/api/accounts', 'GET')).json.accounts;
  assert.equal(after.length, 1); assert.equal(after[0].status, 'connected'); assert.equal(after[0].kind, 'work'); assert.equal(after[0].tenantId, WORK_TID);
}));

test('a personal address sent to the work sign-in offers to try again as a personal account', async () => fixture(async ({ call }) => {
  const b = await call('/api/accounts/begin', 'GET', { query: { provider: 'microsoft', email: 'me@custom.example' } });
  const cb = await call('/api/accounts/callback', 'GET', { query: { state: stateOf(b.headers.Location), error: 'invalid_request', error_description: 'AADSTS50020: no such user' } });
  assert.match(cb.text, /This looks like a personal account/);
  assert.ok(cb.text.includes('/api/accounts/begin?provider=microsoft&amp;email=me%40custom.example&amp;kind=personal'));
  const none = await call('/api/accounts/begin', 'GET', { query: { provider: 'microsoft', email: 'nope' } });
  assert.equal(none.status, 400); assert.match(none.text, /Type your full email address/);
}));

test('pause, features, sync, fetch-here and remove; readers need no Claude', async () => fixture(async ({ call, dir, ctx }) => {
  const b = await call('/api/accounts/begin', 'POST', { body: { provider: 'microsoft', email: 'me@hotmail.com' } });
  await call('/api/accounts/callback', 'GET', { query: { state: stateOf(b.json.url), code: 'code-me@hotmail.com' } });
  const id = (await call('/api/accounts', 'GET')).json.accounts[0].id;
  assert.equal((await call('/api/accounts/pause', 'POST', { body: { id, paused: true } })).json.account.status, 'paused');
  const s = await call('/api/accounts/sync', 'POST', { body: { id } });
  assert.equal(s.json.results[0].code, 'PAUSED');
  assert.equal((await call('/api/accounts/pause', 'POST', { body: { id, paused: false } })).json.account.status, 'connected');
  assert.equal((await call('/api/accounts/features', 'POST', { body: { id, calendar: false } })).json.account.features.calendar, false);
  assert.equal((await readSourcesFile(dir)).sources.find(x => x.capability === 'calendar').enabled, false);
  const synced = await call('/api/accounts/sync', 'POST', { body: { id } });
  assert.deepEqual(synced.json.results.map(r => [r.feature, r.ok]), [['mail', true]]);
  const here = await call('/api/accounts/fetch-here', 'POST', { body: { id } });
  assert.equal(here.json.placeholder, true); assert.equal(here.json.ok, false);
  assert.equal((await call('/api/accounts/pause', 'POST', { body: { id: '../x' } })).status, 400);
  // the source readers go through the account, never through Claude
  const run = () => { throw new Error('Claude must not run'); };
  const src = (await readSourcesFile(dir)).sources;
  assert.equal((await fetchEmailSource(src.find(x => x.capability === 'email'), { accounts: ctx.accounts, days: 14, todayIso: '2026-10-23', run })).count, 1);
  await assert.rejects(fetchCalendarSource(src.find(x => x.capability === 'calendar'), { accounts: ctx.accounts, from: '2026-10-01', to: '2026-10-07', run }), { code: 'FEATURE_OFF' });
  const health = await createSourcesService({ dataDir: dir, list: async () => { throw new Error('Claude must not be called'); } }).healthMap(src, { servers: [], claudeOk: false });
  assert.equal(health[src.find(x => x.capability === 'email').id].state, 'ok');
  assert.deepEqual((await call('/api/accounts/remove', 'POST', { body: { id } })).json, { removed: id });
  assert.equal((await readSourcesFile(dir)).sources.length, 0);
  assert.equal((await call('/api/accounts', 'GET')).json.accounts.length, 0);
}));

test('a Graph 403 on a work account after sign-in shows "Waiting for your organisation"', async () => fixture(async ({ call }) => {
  const b = await call('/api/accounts/begin', 'POST', { body: { provider: 'microsoft', email: 'me@work.example' } });
  const cb = await call('/api/accounts/callback', 'GET', { query: { state: stateOf(b.json.url), code: 'code-me@work.example' } });
  assert.match(cb.text, /Your organisation needs to approve OpenDash once/);
  assert.ok(cb.text.includes(WORK_TID + '/adminconsent?client_id=' + CLIENT));
  const a = (await call('/api/accounts', 'GET')).json.accounts[0];
  assert.equal(a.status, 'needs-admin-approval'); assert.match(a.approval.consentUrl, new RegExp(WORK_TID + '/adminconsent'));
}, { graph: (u) => (u.pathname.includes('/mailFolders/') ? reply({ error: { code: 'ErrorAccessDenied' } }, 403) : null) }));

test('compat: the old module keeps the user\'s own app ID in the secret store and summarises accounts', async () => {
  const base = mkdtempSync(join(tmpdir(), 'microsoft-compat-'));
  try {
    const ms = createMicrosoft({ dataDir: base });
    assert.deepEqual(MICROSOFT_SCOPES, ['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read']);
    assert.equal((await ms.configure(CLIENT)).changed, true);
    assert.deepEqual(await secretStore(base).get('microsoft-client'), { clientId: CLIENT });
    const st = await ms.status();
    assert.equal(st.configured, true); assert.equal(st.connected, false); assert.equal(st.accounts, 0);
    await assert.rejects(ms.configure('not-an-id'), { code: 'BAD_REQUEST' });
  } finally { rmSync(base, { recursive: true, force: true }); }
});
