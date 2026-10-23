// The Microsoft provider on the accounts contract. Synthetic OAuth and Graph
// responses only: never a real account, never the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAccounts, memorySecretStore, loopbackRedirect } from '../lib/accounts/core.mjs';
import { createMicrosoftProvider, guessKind, authorityFor, scopesFor, classifyMicrosoftError, approvalHelp, PERSONAL_TENANT, SYNC_SCOPE } from '../lib/accounts/microsoft.mjs';

const CLIENT = '00000000-0000-4000-8000-000000000001';
const WORK_TID = '11111111-2222-4333-8444-555555555555';
const reply = (doc, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(doc) });
const idToken = (claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';
const grant = (extra = {}) => ({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600, scope: 'openid profile offline_access User.Read Mail.Read Calendars.Read', ...extra });
function registry() {
  const doc = { version: 1, accounts: [] };
  return { doc, read: async () => JSON.parse(JSON.stringify(doc)), mutate: async (fn) => { const list = JSON.parse(JSON.stringify(doc.accounts)); const r = await fn(list); doc.accounts = list; return r; } };
}
/**
 * A service with a synthetic Microsoft. people: email -> {tid, id}; the token
 * endpoint decides who signed in from the code ('code-<email>').
 */
function fixture({ handler, clientId = CLIENT, deviceId = 'deviceaaaa1' } = {}) {
  let clock = Date.parse('2026-01-15T10:00:00Z');
  const calls = [], reg = registry(), secrets = memorySecretStore();
  let n = 0;
  const fetch = async (url, opts) => {
    const u = new URL(url); calls.push({ url: u, opts });
    assert.equal(opts.redirect, 'error');
    if (u.hostname === 'login.microsoftonline.com') {
      assert.equal(opts.method, 'POST'); assert.ok(u.pathname.endsWith('/oauth2/v2.0/token'));
      assert.equal(opts.body.has('client_secret'), false, 'never a client secret');
      const custom = handler && handler(u, opts, calls);
      if (custom) return custom;
      if (opts.body.get('grant_type') === 'authorization_code') {
        const email = opts.body.get('code').replace(/^code-/, '');
        const tid = /hotmail|outlook|live/.test(email) ? PERSONAL_TENANT : WORK_TID;
        return reply(grant({ access_token: 'access-' + email, refresh_token: 'refresh-' + email, id_token: idToken({ tid, oid: 'oid-' + email, preferred_username: email, name: 'Synthetic ' + email.split('@')[0] }) }));
      }
      const old = opts.body.get('refresh_token');
      return reply(grant({ access_token: 'access2-' + old, refresh_token: old + '-r' + (++n) }));
    }
    assert.equal(u.hostname, 'graph.microsoft.com', 'tokens go only to Graph');
    assert.equal(opts.method, 'GET', 'Graph is read-only');
    const email = String(opts.headers.Authorization).replace(/^Bearer access2?-/, '').replace(/^refresh-/, '').replace(/-r\d+$/, '');
    if (u.pathname === '/v1.0/me') return reply({ id: 'graph-' + email, mail: email, displayName: 'Synthetic' });
    return (handler && handler(u, opts, calls)) || reply({ value: [] });
  };
  const svc = createAccounts({ registry: reg, secrets, providers: { microsoft: createMicrosoftProvider }, providerConfig: { microsoft: { clientId: () => clientId } },
    redirect: loopbackRedirect({ port: 4900 }), fetch, now: () => clock, deviceId });
  const connect = async (email, opts = {}) => {
    const b = await svc.begin({ provider: 'microsoft', email, ...opts });
    return svc.callback({ state: new URL(b.url).searchParams.get('state'), code: 'code-' + email });
  };
  return { svc, calls, reg, secrets, connect, advance: (ms) => { clock += ms; } };
}

test('personal addresses go to /consumers, others to /organizations; scopes per purpose; no sync scope yet', () => {
  for (const e of ['me@hotmail.com', 'me@hotmail.co.uk', 'me@outlook.com', 'me@live.co.uk', 'me@msn.com', 'me@gmail.com', 'me@icloud.com']) assert.equal(guessKind(e), 'personal', e);
  for (const e of ['me@example.co.uk', 'me@university.example.edu', 'me@outlook.example.com']) assert.equal(guessKind(e), 'work', e);
  assert.equal(authorityFor('personal'), 'consumers'); assert.equal(authorityFor('work'), 'organizations');
  assert.deepEqual(scopesFor({ mail: true, calendar: false }), ['openid', 'profile', 'offline_access', 'User.Read', 'Mail.Read']);
  assert.ok(!scopesFor({}).includes(SYNC_SCOPE));
});

test('sign-in URL: authority from the address, login_hint, PKCE S256, no secret; placeholder ID means not set up', async () => {
  const { svc } = fixture();
  const personal = new URL((await svc.begin({ provider: 'microsoft', email: 'Me@Hotmail.co.uk' })).url);
  assert.equal(personal.pathname, '/consumers/oauth2/v2.0/authorize');
  assert.equal(personal.searchParams.get('login_hint'), 'me@hotmail.co.uk');
  assert.equal(personal.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(personal.searchParams.get('client_id'), CLIENT);
  assert.equal(personal.searchParams.get('redirect_uri'), 'http://localhost:4900/api/accounts/callback');
  assert.ok(!personal.searchParams.has('client_secret'));
  assert.deepEqual(personal.searchParams.get('scope').split(' '), ['openid', 'profile', 'offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read']);
  const work = new URL((await svc.begin({ provider: 'microsoft', email: 'me@work.example' })).url);
  assert.equal(work.pathname, '/organizations/oauth2/v2.0/authorize');
  const forced = new URL((await svc.begin({ provider: 'microsoft', email: 'me@work.example', kind: 'personal' })).url);
  assert.equal(forced.pathname, '/consumers/oauth2/v2.0/authorize');
  const none = fixture({ clientId: 'OPENDASH_MICROSOFT_CLIENT_ID' });
  await assert.rejects(none.svc.begin({ provider: 'microsoft', email: 'me@outlook.com' }), { code: 'NOT_CONFIGURED' });
});

test('callback: PKCE verifier matches, kind and tenant come from the id token, tokens stay in the vault', async () => {
  const { svc, calls, reg, secrets, connect } = fixture();
  const b = await svc.begin({ provider: 'microsoft', email: 'me@work.example' });
  const u = new URL(b.url);
  const { account } = await svc.callback({ state: u.searchParams.get('state'), code: 'code-me@work.example' });
  const body = calls.find(c => c.opts.body && c.opts.body.get('grant_type') === 'authorization_code').opts.body;
  assert.equal(createHash('sha256').update(body.get('code_verifier')).digest('base64url'), u.searchParams.get('code_challenge'));
  assert.equal(body.get('redirect_uri'), u.searchParams.get('redirect_uri'));
  assert.equal(calls[0].url.pathname, '/organizations/oauth2/v2.0/token');
  assert.equal(account.kind, 'work'); assert.equal(account.tenantId, WORK_TID); assert.equal(account.email, 'me@work.example');
  assert.deepEqual(account.features, { mail: true, calendar: true });
  assert.ok(!JSON.stringify(reg.doc).includes('refresh-'), 'the registry holds no tokens');
  const t = await secrets.get('accounts/' + account.id);
  assert.equal(t.refresh_token, 'refresh-me@work.example'); assert.equal(t.authority, WORK_TID); assert.equal(t.clientId, CLIENT);
  const p = (await connect('me@hotmail.com')).account;
  assert.equal(p.kind, 'personal'); assert.ok(!p.tenantId);
  assert.equal((await secrets.get('accounts/' + p.id)).authority, 'consumers');
  await assert.rejects(svc.callback({ state: u.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' }, 'state is single-use');
});

test('many accounts: tokens isolated; refresh serialized per account and rotated', async () => {
  const { svc, calls, secrets, connect, advance } = fixture();
  const a = (await connect('me@hotmail.com')).account, b = (await connect('me@work.example')).account;
  advance(3600000);
  await Promise.all([svc.accessToken(a.id), svc.accessToken(a.id), svc.fetchMail(a.id, { source: { id: 'email-outlook-aaaa' } }), svc.accessToken(b.id)]);
  const refreshes = calls.filter(c => c.opts.body && c.opts.body.get('grant_type') === 'refresh_token');
  assert.equal(refreshes.length, 2, 'one refresh per account, however many callers');
  assert.deepEqual(refreshes.map(c => c.opts.body.get('refresh_token')).sort(), ['refresh-me@hotmail.com', 'refresh-me@work.example']);
  assert.ok(refreshes.find(c => c.opts.body.get('refresh_token') === 'refresh-me@hotmail.com').url.pathname.startsWith('/consumers/'));
  assert.ok(refreshes.find(c => c.opts.body.get('refresh_token') === 'refresh-me@work.example').url.pathname.startsWith('/' + WORK_TID + '/'));
  assert.match((await secrets.get('accounts/' + a.id)).refresh_token, /^refresh-me@hotmail\.com-r\d$/, 'rotated');
  assert.match((await secrets.get('accounts/' + b.id)).refresh_token, /^refresh-me@work\.example-r\d$/);
  await svc.remove(a.id);
  assert.equal(await secrets.get('accounts/' + a.id), null);
  assert.ok(await secrets.get('accounts/' + b.id), 'removing one account leaves the other');
});

test('a revoked refresh marks only that account "Sign in again"', async () => {
  let revoke = '';
  const f = fixture({ handler: (u, opts) => (opts.body && opts.body.get('grant_type') === 'refresh_token' && opts.body.get('refresh_token') === revoke ? reply({ error: 'invalid_grant', error_codes: [70008], error_description: 'AADSTS70008: secret provider detail' }, 400) : null) });
  const a = (await f.connect('me@hotmail.com')).account, b = (await f.connect('me@work.example')).account;
  revoke = 'refresh-me@hotmail.com'; f.advance(3600000);
  const err = await f.svc.fetchMail(a.id, { source: { id: 'email-outlook-aaaa' } }).catch(e => e);
  assert.equal(err.code, 'NEEDS_SIGN_IN'); assert.ok(!err.message.includes('secret provider detail'));
  assert.equal((await f.svc.get(a.id)).status, 'needs-sign-in');
  assert.equal((await f.svc.get(b.id)).status, 'connected');
  await f.svc.fetchMail(b.id, { source: { id: 'email-outlook-bbbb' } });
  // signing in again brings it back, same id
  const again = await f.connect('me@hotmail.com', { accountId: a.id });
  assert.equal(again.account.id, a.id); assert.equal(again.account.status, 'connected');
});

test('consent errors: admin approval needed (authorize, token, Graph 403), wrong account type, device rules', async () => {
  for (const params of [
    { error: 'access_denied', error_description: 'AADSTS90094: The grant requires admin permission.' },
    { error: 'access_denied', error_description: 'AADSTS90095: Admin consent is required.' },
    { error: 'consent_required', error_description: 'AADSTS65001: The user or administrator has not consented.' },
  ]) {
    const f = fixture();
    const b = await f.svc.begin({ provider: 'microsoft', email: 'me@work.example' });
    const err = await f.svc.callback({ state: new URL(b.url).searchParams.get('state'), ...params }).catch(e => e);
    assert.equal(err.code, 'NEEDS_ADMIN_APPROVAL', params.error_description);
    assert.equal(err.message, 'Your organisation needs to approve OpenDash once.');
    assert.equal(err.account.status, 'needs-admin-approval');
    assert.equal(err.account.approval.consentUrl, 'https://login.microsoftonline.com/work.example/adminconsent?client_id=' + CLIENT + '&redirect_uri=' + encodeURIComponent('http://localhost:4900/api/accounts/callback'));
    assert.ok(err.account.approval.mailto.startsWith('mailto:?subject='));
    assert.equal(f.calls.length, 0, 'no token request after a refused consent');
    // trying again later reuses the waiting record
    const again = await f.connect('me@work.example', { accountId: err.account.id });
    assert.equal(again.account.id, err.account.id); assert.equal(again.account.status, 'connected');
  }
  // the token endpoint can refuse too (error_codes)
  const t = fixture({ handler: (u, opts) => (opts.body && opts.body.get('grant_type') === 'authorization_code' ? reply({ error: 'invalid_grant', error_codes: [65001] }, 400) : null) });
  assert.equal((await t.connect('me@work.example').catch(e => e)).code, 'NEEDS_ADMIN_APPROVAL');
  // a personal address sent to the work sign-in
  const w = fixture();
  const wb = await w.svc.begin({ provider: 'microsoft', email: 'me@custom.example' });
  const wrong = await w.svc.callback({ state: new URL(wb.url).searchParams.get('state'), error: 'invalid_request', error_description: 'AADSTS50020: User account from identity provider does not exist.' }).catch(e => e);
  assert.equal(wrong.code, 'WRONG_ACCOUNT_TYPE'); assert.equal(wrong.retryKind, 'personal');
  assert.equal(classifyMicrosoftError({ error: 'access_denied', error_description: 'AADSTS53003: blocked by Conditional Access' }).code, 'DEVICE_NOT_ALLOWED');
  assert.equal(classifyMicrosoftError({ error: 'access_denied', error_description: 'AADSTS65004: User declined to consent' }).code, 'OAUTH_CANCELLED');
  assert.equal(classifyMicrosoftError({ error: 'access_denied' }).code, 'OAUTH_CANCELLED');
  // a Graph 403 on a work account after sign-in: the organisation blocks it
  const g = fixture({ handler: (u) => (u.pathname.includes('/mailFolders/') ? reply({ error: { code: 'ErrorAccessDenied', message: 'detail' } }, 403) : null) });
  const acc = (await g.connect('me@work.example')).account;
  assert.equal((await g.svc.fetchMail(acc.id, { source: { id: 'email-outlook-aaaa' } }).catch(e => e)).code, 'NEEDS_ADMIN_APPROVAL');
  const after = (await g.svc.list()).find(a => a.id === acc.id);
  assert.equal(after.status, 'needs-admin-approval'); assert.equal(after.approval.tenant, WORK_TID);
  assert.match(after.approval.consentUrl, new RegExp('^https://login\\.microsoftonline\\.com/' + WORK_TID + '/adminconsent\\?client_id=' + CLIENT));
});

test('the IT email is plain, read-only and carries the approval link and app ID', () => {
  const h = approvalHelp({ clientId: CLIENT, email: 'me@work.example', displayName: 'Synthetic Person' });
  assert.equal(h.tenant, 'work.example');
  assert.equal(h.consentUrl, `https://login.microsoftonline.com/work.example/adminconsent?client_id=${CLIENT}`);
  const body = decodeURIComponent(new URL(h.mailto).searchParams.get('body'));
  assert.match(body, /cannot send, change or delete/); assert.ok(body.includes(h.consentUrl)); assert.ok(body.includes(CLIENT));
  assert.ok(!h.mailto.includes('+'), 'spaces are %20 in mail apps');
  assert.equal(approvalHelp({ clientId: 'OPENDASH_MICROSOFT_CLIENT_ID', email: 'a@b.test' }), null);
});

test('mail: previews only, personal links, ids stable per source; another-host paging refused before any token', async () => {
  const f = fixture({ handler: (u) => (u.pathname.endsWith('/messages') ? reply({ value: [{ id: 'mail-1', subject: 'Synthetic mail', from: { emailAddress: { name: 'Sender', address: 'SENDER@example.test' } }, receivedDateTime: '2026-01-14T09:00:00Z', bodyPreview: 'x'.repeat(400), body: 'must not surface', isRead: false, importance: 'high', webLink: 'https://outlook.live.com/mail/0/id/synthetic' }] }) : null) });
  const acc = (await f.connect('me@hotmail.com')).account;
  const got = await f.svc.fetchMail(acc.id, { source: { id: 'email-outlook-aaaa', accounts: [] }, days: 14, todayIso: '2026-01-15' });
  const m = got.messages[0];
  assert.equal(got.count, 1); assert.equal(m.sourceId, 'email-outlook-aaaa'); assert.equal(m.unread, true); assert.equal(m.important, true);
  assert.equal(m.id, 'ms' + createHash('sha256').update('email-outlook-aaaa|mail-1').digest('hex').slice(0, 24), 'same ids as the single-account module');
  assert.equal(m.from.email, 'sender@example.test'); assert.ok(m.link.startsWith('https://outlook.live.com/')); assert.ok(!('body' in m)); assert.equal(m.snippet.length, 300);
  assert.equal(got.accounts[0].name, 'me@hotmail.com');
  const q = f.calls.at(-1).url.searchParams;
  assert.equal(q.get('$filter'), 'receivedDateTime ge 2026-01-01T00:00:00.000Z'); assert.ok(!q.get('$select').split(',').includes('body'));
  const before = f.calls.length;
  assert.equal((await f.svc.fetchMail(acc.id, { source: { id: 'email-outlook-aaaa', accounts: [{ id: 'default', enabled: false }] } })).count, 0);
  assert.equal(f.calls.length, before, 'a switched-off mailbox makes no requests');
  const evil = fixture({ handler: (u) => (u.pathname.endsWith('/messages') ? reply({ value: [], '@odata.nextLink': 'https://example.test/steal' }) : null) });
  const e = (await evil.connect('me@hotmail.com')).account;
  await assert.rejects(evil.svc.fetchMail(e.id, { source: { id: 'email-outlook-aaaa' } }), { code: 'PROVIDER_RESPONSE' });
  assert.ok(evil.calls.every(c => c.url.hostname !== 'example.test'));
});

test('calendar: all-day dates keep their zone, switched-off calendars are skipped, budget holds', async () => {
  const f = fixture({ handler: (u) => {
    if (u.pathname.endsWith('/calendars')) return reply({ value: [{ id: 'cal-1', name: 'Personal' }] });
    if (u.pathname.endsWith('/events/day')) return reply({ start: { dateTime: '2026-01-02T00:00:00' }, end: { dateTime: '2026-01-03T00:00:00' } });
    if (u.pathname.endsWith('/calendarView')) return reply({ value: [{ id: 'day', subject: 'Day off', isAllDay: true, originalStartTimeZone: 'Pacific Standard Time', start: { dateTime: '2026-01-02T08:00:00' }, end: { dateTime: '2026-01-03T08:00:00' } }, { id: 'timed', subject: 'Meeting', start: { dateTime: '2026-01-04T09:00:00+01:00' }, end: { dateTime: '2026-01-04T10:00:00+01:00' } }, { id: 'cancelled', isCancelled: true }] });
    return null;
  } });
  const acc = (await f.connect('me@outlook.com')).account;
  const source = { id: 'calendar-outlook-aaaa' };
  const got = await f.svc.fetchCalendar(acc.id, { source, from: '2026-01-01', to: '2026-01-07' });
  assert.equal(got.events.length, 2); assert.deepEqual(got.events[0].start, { date: '2026-01-02' }); assert.equal(got.events[1].start.dateTime, '2026-01-04T08:00:00.000Z');
  assert.equal(got.calendars[0].id, 'c' + createHash('sha256').update('cal-1').digest('hex').slice(0, 24));
  assert.ok(got.events.every(e => e.calendarId === source.id + '/' + got.calendars[0].id));
  assert.equal(f.calls.find(c => c.url.pathname.endsWith('/events/day')).opts.headers.Prefer, 'outlook.timezone="Pacific Standard Time"');
  assert.equal((await f.svc.fetchCalendar(acc.id, { source: { ...source, accounts: [{ id: got.calendars[0].id, enabled: false }] }, from: '2026-01-01', to: '2026-01-07' })).count, 0);
  await assert.rejects(f.svc.fetchCalendar(acc.id, { source, from: '2026-01-07', to: '2026-01-01' }), { code: 'BAD_REQUEST' });
  const big = fixture({ handler: (u) => {
    if (u.pathname.endsWith('/calendars')) return reply({ value: [{ id: 'cal-1', name: 'Busy' }] });
    if (u.pathname.includes('/events/')) return reply({ start: { dateTime: '2026-01-02T00:00:00' }, end: { dateTime: '2026-01-03T00:00:00' } });
    if (u.pathname.endsWith('/calendarView')) return reply({ value: Array.from({ length: 100 }, (_, n) => ({ id: 'day-' + n, isAllDay: true, originalStartTimeZone: 'Pacific Standard Time' })) });
    return null;
  } });
  const b = (await big.connect('me@outlook.com')).account;
  const many = await big.svc.fetchCalendar(b.id, { source, from: '2026-01-01', to: '2026-01-07' });
  assert.equal(big.calls.filter(c => c.url.hostname === 'graph.microsoft.com' && c.url.pathname !== '/v1.0/me').length, 40, '40 data requests');
  assert.equal(many.events.length, 38); assert.ok(many.warnings.length);
});
