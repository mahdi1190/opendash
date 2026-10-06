// Synthetic Microsoft OAuth/Graph responses only. Never uses real accounts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createMicrosoft, MICROSOFT_SCOPES } from '../lib/microsoft.mjs';
import { createSourcesService, validateSource, readSourcesFile } from '../lib/sources.mjs';
import { fetchCalendarSource, readSourceSnapshot } from '../lib/calendar-sources.mjs';
import { fetchEmailSource, readInboxSnapshot } from '../lib/inbox-sources.mjs';
import { writeJson } from '../lib/fsutil.mjs';
import { dataPaths } from '../lib/datadir.mjs';
import registerMicrosoft from '../server/routes/microsoft.mjs';

const CLIENT = '00000000-0000-4000-8000-000000000001';
const reply = (doc, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(doc) });
const grant = extra => ({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600, scope: 'User.Read Mail.Read Calendars.Read', ...extra });
async function fixture(run, handler = () => reply({ value: [] })) {
  const dir = mkdtempSync(join(tmpdir(), 'microsoft-test-')); let clock = 1700000000000;
  const calls = [];
  const ms = createMicrosoft({ dataDir: dir, now: () => clock, fetchFn: async (url, opts) => {
    calls.push({ url: new URL(url), opts });
    assert.equal(opts.redirect, 'error');
    if (url.endsWith('/token')) return handler(url, opts, calls) || reply(grant());
    assert.equal(opts.method, 'GET', 'Graph is read-only');
    assert.equal(new URL(url).hostname, 'graph.microsoft.com', 'token never goes to another host');
    if (new URL(url).pathname === '/v1.0/me') return reply({ id: 'synthetic-account', mail: 'person@example.test' });
    return handler(url, opts, calls);
  } });
  const signIn = async () => { await ms.configure(CLIENT); const u = new URL(await ms.authUrl('http://localhost:4900/api/microsoft/callback')); await ms.callback({ state: u.searchParams.get('state'), code: 'synthetic-code' }); return u; };
  try { await run({ dir, ms, calls, signIn, advance: n => clock += n }); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('Microsoft configuration is honest; /common public-client PKCE is verified, state is single-use', async () => fixture(async ({ ms, dir, calls }) => {
  assert.equal((await ms.status()).connected, false);
  await assert.rejects(ms.authUrl('http://localhost:4900/api/microsoft/callback'), { code: 'NOT_CONFIGURED' });
  await assert.rejects(ms.configure('not-an-id'), { code: 'BAD_REQUEST' });
  await ms.configure(CLIENT);
  await assert.rejects(ms.authUrl('https://example.test/api/microsoft/callback'), { code: 'BAD_REQUEST' });
  const u = new URL(await ms.authUrl('http://localhost:4900/api/microsoft/callback'));
  assert.equal(u.pathname, '/common/oauth2/v2.0/authorize'); assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.deepEqual(u.searchParams.get('scope').split(' '), MICROSOFT_SCOPES);
  assert.ok(!u.searchParams.has('client_secret'));
  await assert.rejects(ms.callback({ state: 'bad', code: 'x' }), { code: 'OAUTH_STATE' });
  await ms.callback({ state: u.searchParams.get('state'), code: 'synthetic-code' });
  const exchange = calls[0].opts.body;
  assert.equal(createHash('sha256').update(exchange.get('code_verifier')).digest('base64url'), u.searchParams.get('code_challenge'));
  assert.equal(exchange.get('redirect_uri'), u.searchParams.get('redirect_uri')); assert.equal(exchange.has('client_secret'), false);
  await assert.rejects(ms.callback({ state: u.searchParams.get('state'), code: 'synthetic-code' }), { code: 'OAUTH_STATE' });
  const status = await ms.status(); assert.equal(status.connected, true); assert.equal(status.account, 'person@example.test');
  assert.ok(!JSON.stringify(status).includes('synthetic-access'));
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'secrets', 'microsoft-client.json'))), { clientId: CLIENT });
  await ms.disconnect(); assert.equal((await ms.status()).connected, false);
}, (url) => url.endsWith('/token') ? reply(grant()) : reply({ value: [] })));

test('Microsoft expired/cancelled states and changed configuration cannot connect', async () => fixture(async ({ ms, advance, calls }) => {
  await ms.configure(CLIENT);
  const expired = new URL(await ms.authUrl('http://localhost/api/microsoft/callback')); advance(600001);
  await assert.rejects(ms.callback({ state: expired.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' });
  const cancelled = new URL(await ms.authUrl('http://localhost/api/microsoft/callback'));
  await assert.rejects(ms.callback({ state: cancelled.searchParams.get('state'), error: 'access_denied' }), { code: 'OAUTH_CANCELLED' });
  await assert.rejects(ms.callback({ state: cancelled.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' });
  const pending = new URL(await ms.authUrl('http://localhost/api/microsoft/callback')); await ms.disconnect();
  await assert.rejects(ms.callback({ state: pending.searchParams.get('state'), code: 'x' }), { code: 'OAUTH_STATE' });
  assert.equal(calls.length, 0);
}));

test('Microsoft requires all read scopes and never exposes provider errors', async () => fixture(async ({ ms }) => {
  await ms.configure(CLIENT); const u = new URL(await ms.authUrl('http://localhost/api/microsoft/callback'));
  await assert.rejects(ms.callback({ state: u.searchParams.get('state'), code: 'x' }), { code: 'MICROSOFT_CONSENT' });
  assert.equal((await ms.status()).connected, false);
}, () => reply(grant({ scope: 'User.Read Mail.Read' }))));

test('Microsoft concurrent refresh rotates credentials once; revoked refresh requires sign-in', async () => {
  let revoked = false;
  await fixture(async ({ ms, signIn, advance, calls, dir }) => {
    await signIn(); advance(3600000);
    await Promise.all([ms.email({ id: 'outlook-email' }), ms.calendar({ id: 'outlook-calendar' }, { from: '2026-01-01', to: '2026-01-07' })]);
    assert.equal(calls.filter(c => c.opts.body?.get('grant_type') === 'refresh_token').length, 1);
    assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'microsoft-tokens.json'))).refresh_token, 'rotated-refresh');
    revoked = true; advance(3600000);
    await assert.rejects(ms.email({ id: 'outlook-email' }), { code: 'MICROSOFT_AUTH' });
    assert.equal((await ms.status()).needsAuth, true); assert.equal((await ms.status()).connected, false);
  }, (url, opts) => url.endsWith('/token') ? opts.body.get('grant_type') === 'refresh_token' ? revoked ? reply({ error: 'invalid_grant', error_description: 'sensitive provider detail' }, 400) : reply(grant({ refresh_token: 'rotated-refresh' })) : reply(grant()) : reply({ value: [] }));
});

test('Microsoft mail normalizes previews and personal web links; disabled mailbox returns no messages', async () => fixture(async ({ ms, signIn, calls }) => {
  await signIn(); const source = { id: 'outlook-email', accounts: [] };
  const got = await ms.email(source, { days: 14, todayIso: '2026-01-15' });
  assert.equal(got.messages.length, 1); const m = got.messages[0];
  assert.equal(m.sourceId, source.id); assert.equal(m.accountId, 'default'); assert.equal(m.unread, true); assert.equal(m.important, true);
  assert.equal(m.from.email, 'sender@example.test'); assert.ok(m.link.startsWith('https://outlook.live.com/')); assert.ok(!('body' in m));
  assert.equal(m.snippet.length, 300); assert.equal(calls.at(-1).url.searchParams.get('$filter'), 'receivedDateTime ge 2026-01-01T00:00:00.000Z');
  assert.ok(!calls.at(-1).url.searchParams.get('$select').split(',').includes('body'));
  const before = calls.length;
  assert.equal((await ms.email({ ...source, accounts: [{ id: 'default', enabled: false }] })).count, 0);
  assert.equal(calls.length, before, 'disabled mailbox causes no Microsoft reads');
}, url => url.endsWith('/token') ? reply(grant()) : reply({ value: [{ id: 'mail-1', subject: 'Synthetic mail', from: { emailAddress: { name: 'Sender', address: 'SENDER@example.test' } }, receivedDateTime: '2026-01-14T09:00:00Z', bodyPreview: 'x'.repeat(400), body: 'must not surface', isRead: false, importance: 'high', webLink: 'https://outlook.live.com/mail/0/id/synthetic' }] })));

test('Microsoft Graph paging rejects another host before sending any credential', async () => fixture(async ({ ms, signIn, calls }) => {
  await signIn(); await assert.rejects(ms.email({ id: 'outlook-email' }), { code: 'MICROSOFT_RESPONSE' });
  assert.equal(calls.length, 3);
}, url => url.endsWith('/token') ? reply(grant()) : reply({ value: [], '@odata.nextLink': 'https://example.test/steal' })));

test('Microsoft calendar keeps all-day dates in original zone and respects selected calendars', async () => fixture(async ({ ms, signIn, calls }) => {
  await signIn(); const source = { id: 'outlook-calendar' };
  const got = await ms.calendar(source, { from: '2026-01-01', to: '2026-01-07' });
  assert.equal(got.events.length, 2); assert.deepEqual(got.events[0].start, { date: '2026-01-02' }); assert.deepEqual(got.events[0].end, { date: '2026-01-03' });
  assert.equal(got.events[1].start.dateTime, '2026-01-04T08:00:00.000Z');
  assert.ok(got.events.every(e => e.calendarId === source.id + '/' + got.calendars[0].id));
  assert.equal(calls.find(c => c.url.pathname.endsWith('/events/day')).opts.headers.Prefer, 'outlook.timezone="Pacific Standard Time"');
  assert.equal((await ms.calendar({ ...source, accounts: [{ id: got.calendars[0].id, enabled: false }] }, { from: '2026-01-01', to: '2026-01-07' })).count, 0);
}, url => {
  if (url.endsWith('/token')) return reply(grant()); const path = new URL(url).pathname;
  if (path.endsWith('/calendars')) return reply({ value: [{ id: 'cal-1', name: 'Personal' }] });
  if (path.endsWith('/events/day')) return reply({ start: { dateTime: '2026-01-02T00:00:00' }, end: { dateTime: '2026-01-03T00:00:00' } });
  return reply({ value: [{ id: 'day', subject: 'Day off', isAllDay: true, originalStartTimeZone: 'Pacific Standard Time', start: { dateTime: '2026-01-02T08:00:00' }, end: { dateTime: '2026-01-03T08:00:00' } }, { id: 'timed', subject: 'Meeting', start: { dateTime: '2026-01-04T09:00:00+01:00' }, end: { dateTime: '2026-01-04T10:00:00+01:00' } }, { id: 'cancelled', isCancelled: true }] });
}));

test('Microsoft source validation/health and readers work without a Claude installation', async () => fixture(async ({ dir }) => {
  const source = { id: 'outlook-email', kind: 'microsoft', capability: 'email', label: 'Outlook Mail', colour: 'blue', enabled: true, accounts: [] };
  assert.equal(validateSource(source).errors.length, 0); assert.ok(validateSource({ ...source, capability: 'bank' }).errors.length);
  assert.ok(validateSource({ ...source, id: 'second-email' }, { existing: [source] }).errors.length);
  await writeJson(join(dir, 'secrets', 'microsoft-client.json'), { clientId: CLIENT });
  await writeJson(join(dir, 'secrets', 'microsoft-tokens.json'), { clientId: CLIENT, refresh_token: 'synthetic-refresh', account: 'person@example.test' });
  const service = createSourcesService({ dataDir: dir, list: async () => { throw new Error('Claude must not be called'); } });
  assert.equal((await service.healthMap([source], { servers: [], claudeOk: false }))[source.id].state, 'ok');
  const fake = { email: async (s, opts) => ({ count: 1, source: s, opts }), calendar: async (s, opts) => ({ count: 2, source: s, opts }) };
  const run = () => { throw new Error('Claude must not run'); };
  assert.equal((await fetchEmailSource(source, { microsoft: fake, days: 14, run })).count, 1);
  assert.equal((await fetchCalendarSource({ ...source, capability: 'calendar' }, { microsoft: fake, from: '2026-01-01', to: '2026-01-07', run })).count, 2);
}));

test('Microsoft calendar request budget prevents unbounded all-day reads', async () => fixture(async ({ ms, signIn, calls }) => {
  await signIn(); const got = await ms.calendar({ id: 'outlook-calendar' }, { from: '2026-01-01', to: '2026-01-07' });
  assert.equal(calls.filter(c => c.url.hostname === 'graph.microsoft.com').length, 41, '40 data requests plus sign-in profile');
  assert.equal(got.events.length, 38); assert.ok(got.warnings.length);
}, url => {
  if (url.endsWith('/token')) return reply(grant()); const path = new URL(url).pathname;
  if (path.endsWith('/calendars')) return reply({ value: [{ id: 'cal-1', name: 'Synthetic calendar' }] });
  if (path.includes('/events/')) return reply({ start: { dateTime: '2026-01-02T00:00:00' }, end: { dateTime: '2026-01-03T00:00:00' } });
  return reply({ value: Array.from({ length: 100 }, (_, n) => ({ id: 'day-' + n, isAllDay: true, originalStartTimeZone: 'Pacific Standard Time' })) });
}));

test('Microsoft callback provisions both source snapshots and disconnect pauses them; only callback accepts cross-site', async () => fixture(async ({ dir, ms }) => {
  const routes = [], paths = dataPaths(dir);
  registerMicrosoft({ ctx: { dataDir: dir, paths, log: () => {}, microsoft: ms }, route: r => routes.push(r) });
  assert.deepEqual(routes.filter(r => r.crossSite).map(r => r.path), ['/api/microsoft/callback']);
  await ms.configure(CLIENT); const auth = new URL(await ms.authUrl('http://localhost/api/microsoft/callback'));
  const callback = routes.find(r => r.path.endsWith('/callback')).handler;
  let status, html;
  const context = { query: new URLSearchParams({ state: auth.searchParams.get('state'), code: 'synthetic-code' }), res: { setHeader() {} }, clockNow: () => ({ today: '2026-01-01' }), send: (s, text) => { status = s; html = text; } };
  await callback(context); assert.equal(status, 200); assert.ok(html.includes('Microsoft connected'));
  const sources = (await readSourcesFile(dir)).sources.filter(s => s.kind === 'microsoft');
  assert.equal(sources.length, 2); assert.ok(sources.every(s => s.enabled));
  assert.ok(await readSourceSnapshot(paths, sources.find(s => s.capability === 'calendar').id));
  assert.ok(await readInboxSnapshot(paths, sources.find(s => s.capability === 'email').id));
  await callback(context); assert.equal(status, 400, 'cannot replay successful callback');
  await routes.find(r => r.path.endsWith('/disconnect')).handler({ body: async () => ({}) });
  assert.equal((await ms.status()).connected, false);
  assert.ok((await readSourcesFile(dir)).sources.filter(s => s.kind === 'microsoft').every(s => !s.enabled));
}, url => url.endsWith('/token') ? reply(grant()) : reply({ value: [] })));
