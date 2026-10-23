// The Node binding of accounts (lib/accounts.mjs): the registry file, tokens in
// this computer's secret store, sources kept in step, the fetcher filter and
// the migration from the single Microsoft connection. Temp folders and
// synthetic Microsoft responses only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountsService, migrateLegacyMicrosoft } from '../lib/accounts.mjs';
import { accountsFile, readAccountsFile } from '../lib/accounts-file.mjs';
import { secretStore } from '../lib/secret-store.mjs';
import { secretsDir } from '../lib/devicedir.mjs';
import { readSourcesFile, writeSourcesFile, createSourcesService, validateSource } from '../lib/sources.mjs';
import { PERSONAL_TENANT } from '../lib/accounts/microsoft.mjs';
import { run as runMigration } from '../tools/migrations/090-accounts.mjs';

const CLIENT = '00000000-0000-4000-8000-000000000001';
const WORK_TID = '11111111-2222-4333-8444-555555555555';
const reply = (doc, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(doc) });
const tok = (email) => String(email).replace('@', '_at_');   // fake tokens and codes carry the address without an @ (privacy scan)
const idToken = (claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';
const grant = (extra = {}) => ({ expires_in: 3600, scope: 'openid profile offline_access User.Read Mail.Read Calendars.Read', ...extra });

function microsoftFake(calls) {
  let n = 0;
  return async (url, opts) => {
    const u = new URL(url); calls.push({ url: u, opts });
    if (u.hostname === 'login.microsoftonline.com') {
      if (opts.body.get('grant_type') === 'authorization_code') {
        const email = opts.body.get('code').replace(/^code-/, '').replace('_at_', '@');
        return reply(grant({ access_token: 'access-' + tok(email), refresh_token: 'refresh-' + tok(email), id_token: idToken({ tid: /hotmail/.test(email) ? PERSONAL_TENANT : WORK_TID, preferred_username: email }) }));
      }
      const old = opts.body.get('refresh_token');
      return reply(grant({ access_token: 'access2-' + old, refresh_token: old + '-r' + (++n) }));
    }
    assert.equal(opts.method, 'GET');
    const auth = String(opts.headers.Authorization);
    if (u.pathname === '/v1.0/me') { const email = auth.replace(/^Bearer access-/, '').replace('_at_', '@'); return reply({ id: 'graph-' + email, mail: email, displayName: 'Synthetic' }); }
    if (u.pathname.endsWith('/calendars')) return reply({ value: [{ id: 'cal-1', name: 'Calendar' }] });
    return reply({ value: [] });
  };
}
async function fixture(run, { deviceId = 'deviceaaaa1' } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'accounts-node-'));
  const dir = join(base, 'data'); mkdirSync(dir);
  const calls = [];
  process.env.OPENDASH_MICROSOFT_CLIENT_ID = CLIENT;
  const make = (opts = {}) => createAccountsService({ dataDir: dir, port: () => 4900, fetchFn: microsoftFake(calls), deviceId, ...opts });
  const svc = make();
  const connect = async (s, email, extra = {}) => { const b = await s.begin({ provider: 'microsoft', email, ...extra }); return s.callback({ state: new URL(b.url).searchParams.get('state'), code: 'code-' + tok(email) }); };
  try { await run({ dir, svc, calls, connect, make }); }
  finally { delete process.env.OPENDASH_MICROSOFT_CLIENT_ID; rmSync(base, { recursive: true, force: true }); }
}
function filesUnder(d) {
  const out = [];
  const walk = (x) => { for (const n of readdirSync(x)) { const f = join(x, n); if (statSync(f).isDirectory()) walk(f); else out.push(f); } };
  if (existsSync(d)) walk(d);
  return out;
}

test('two accounts: records in <data>/accounts.json, tokens in this computer\'s secret store, never in the data folder', async () => fixture(async ({ dir, svc, connect }) => {
  const a = (await connect(svc, 'me@hotmail.com')).account;
  const b = (await connect(svc, 'me@work.example')).account;
  const reg = JSON.parse(readFileSync(accountsFile(dir), 'utf8'));
  assert.deepEqual(reg.accounts.map(x => x.email).sort(), ['me@hotmail.com', 'me@work.example']);
  for (const f of filesUnder(dir)) assert.ok(!/refresh-|access-/.test(readFileSync(f, 'utf8')), `no token in ${f}`);
  const secrets = secretsDir(dir);
  assert.ok(!secrets.startsWith(dir), 'the secret store is outside the data folder');
  for (const x of [a, b]) {
    const f = join(secrets, 'accounts', x.id + '.json');
    assert.ok(existsSync(f), 'one token file per account');
    if (process.platform !== 'win32') assert.equal(statSync(f).mode & 0o777, 0o600);
  }
  assert.equal(JSON.parse(readFileSync(join(secrets, 'accounts', a.id + '.json'), 'utf8')).refresh_token, 'refresh-me_at_hotmail.com');
  assert.equal(JSON.parse(readFileSync(join(secrets, 'accounts', b.id + '.json'), 'utf8')).refresh_token, 'refresh-me_at_work.example');
  // each account owns an email and a calendar source, labelled with its address
  const src = (await readSourcesFile(dir)).sources;
  assert.equal(src.length, 4);
  for (const x of [a, b]) assert.deepEqual(src.filter(s => s.account === x.id).map(s => s.capability).sort(), ['calendar', 'email']);
  assert.ok(src.every(s => s.kind === 'microsoft' && s.enabled && ['me@hotmail.com', 'me@work.example'].includes(s.label)));
  assert.notEqual(src.find(s => s.account === a.id).colour, src.find(s => s.account === b.id).colour, 'two accounts get two colours');
}));

test('features switch sources; remove deletes sources, snapshots and tokens of that account only', async () => fixture(async ({ dir, svc, connect }) => {
  const a = (await connect(svc, 'me@hotmail.com')).account, b = (await connect(svc, 'me@work.example')).account;
  await svc.setFeatures(a.id, { calendar: false });
  let src = (await readSourcesFile(dir)).sources;
  assert.equal(src.find(s => s.account === a.id && s.capability === 'calendar').enabled, false);
  assert.equal(src.find(s => s.account === a.id && s.capability === 'email').enabled, true);
  const snap = join(dir, 'inbox', 'sources', src.find(s => s.account === a.id && s.capability === 'email').id + '.json');
  mkdirSync(join(dir, 'inbox', 'sources'), { recursive: true }); writeFileSync(snap, '{"version":1,"messages":[]}');
  await svc.remove(a.id);
  src = (await readSourcesFile(dir)).sources;
  assert.ok(src.every(s => s.account === b.id));
  assert.ok(!existsSync(snap), 'its saved mail is removed with it');
  assert.equal(await secretStore(dir).get('accounts/' + a.id), null);
  assert.ok(await secretStore(dir).get('accounts/' + b.id));
  assert.deepEqual((await readAccountsFile(dir)).map(x => x.id), [b.id]);
}));

test('readsHere: only connected accounts this computer fetches; health speaks plainly', async () => fixture(async ({ dir, svc, connect, make }) => {
  const a = (await connect(svc, 'me@hotmail.com')).account, b = (await connect(svc, 'me@work.example')).account;
  const src = (await readSourcesFile(dir)).sources;
  assert.equal((await svc.readsHere(src)).length, 4);
  await svc.pause(b.id);
  assert.deepEqual([...new Set((await svc.readsHere(src)).map(s => s.account))], [a.id]);
  const other = make({ deviceId: 'devicebbbb2' });
  assert.equal((await other.readsHere(src)).length, 0, 'another computer reads none of them');
  const health = await createSourcesService({ dataDir: dir, list: async () => { throw new Error('Claude must not be called'); } }).healthMap(src, { servers: [], claudeOk: false });
  assert.equal(health[src.find(s => s.account === b.id).id].message, 'Paused');
  assert.equal(health[src.find(s => s.account === a.id).id].state, 'ok');
  assert.equal(validateSource({ id: 'email-x-1234', capability: 'email', kind: 'google', label: 'x' }).errors.includes('an account source needs its account'), true);
  assert.equal(validateSource({ id: 'email-x-1234', capability: 'email', kind: 'microsoft', account: a.id, label: 'x' }, { existing: src }).errors.length, 1, 'one email source per account');
}));

test('migration: the single Microsoft connection becomes one account; sources and snapshots keep their ids; idempotent', async () => fixture(async ({ dir, make, calls }) => {
  const store = secretStore(dir);
  await store.set('microsoft-client', { clientId: CLIENT });
  await store.set('microsoft-tokens', { clientId: CLIENT, access_token: 'old-access', refresh_token: 'old-refresh', expires_at: 1, account: 'Person@Example.test', accountId: 'graph-person' });
  const sources = [
    { id: 'email-outlook-ab12', capability: 'email', kind: 'microsoft', label: 'Outlook Mail', colour: 'blue', enabled: true, accounts: [{ id: 'default', name: 'person@example.test' }], lastSync: '2026-10-01T10:00:00.000Z' },
    { id: 'calendar-outlook-cd34', capability: 'calendar', kind: 'microsoft', label: 'Outlook Calendar', colour: 'blue', enabled: false, accounts: [] },
  ];
  await writeSourcesFile(dir, { sources: sources.map(s => validateSource(s).source) });
  mkdirSync(join(dir, 'inbox', 'sources'), { recursive: true });
  const snap = join(dir, 'inbox', 'sources', 'email-outlook-ab12.json');
  writeFileSync(snap, JSON.stringify({ version: 1, sourceId: 'email-outlook-ab12', messages: [{ id: 'ms123' }] }));
  assert.equal((await runMigration({ dataDir: dir, dryRun: true, log: () => {} })).changed, false, 'a dry run changes nothing');
  assert.ok(await store.get('microsoft-tokens'));
  const svc = make();
  const list = await svc.list();
  assert.equal(list.length, 1);
  const a = list[0];
  assert.equal(a.email, 'person@example.test'); assert.equal(a.legacy, true); assert.equal(a.status, 'connected'); assert.equal(a.fetcher, 'deviceaaaa1');
  assert.equal(a.kind, 'work'); assert.deepEqual(a.features, { mail: true, calendar: false }, 'a paused old source stays off');
  assert.equal(a.lastSync, '2026-10-01T10:00:00.000Z');
  const after = (await readSourcesFile(dir)).sources;
  assert.deepEqual(after.map(s => s.id).sort(), ['calendar-outlook-cd34', 'email-outlook-ab12']);
  assert.ok(after.every(s => s.account === a.id));
  assert.equal(after.find(s => s.id === 'email-outlook-ab12').label, 'Outlook Mail');
  assert.ok(existsSync(snap), 'saved mail stays');
  assert.equal(await store.get('microsoft-tokens'), null, 'the old token file is gone');
  assert.equal((await store.get('accounts/' + a.id)).refresh_token, 'old-refresh');
  assert.equal((await store.get('microsoft-client')).legacyRedirect, true, 'an old pasted app keeps its old return address');
  // idempotent: again, and through the migration file
  assert.equal((await migrateLegacyMicrosoft(dir, { store, deviceId: 'deviceaaaa1' })).status, 'none');
  assert.equal((await runMigration({ dataDir: dir, dryRun: false, log: () => {} })).changed, false);
  assert.equal((await readAccountsFile(dir)).length, 1);
  // the migrated account still reads: refresh with its own client ID at /common
  const got = await svc.fetchMail(a.id, { source: after.find(s => s.capability === 'email'), days: 14, todayIso: '2026-10-23' });
  assert.equal(got.count, 0);
  const refresh = calls.find(c => c.opts.body && c.opts.body.get('grant_type') === 'refresh_token');
  assert.equal(refresh.url.pathname, '/common/oauth2/v2.0/token'); assert.equal(refresh.opts.body.get('client_id'), CLIENT); assert.equal(refresh.opts.body.get('refresh_token'), 'old-refresh');
  // and an old pasted app signs in with the old return address
  const b = new URL((await svc.begin({ provider: 'microsoft', email: 'me@hotmail.com' })).url);
  assert.equal(b.searchParams.get('redirect_uri'), 'http://localhost:4900/api/microsoft/callback');
}));

test('the user\'s own app ID wins over the built-in one; no ID at all means "not set up"', async () => fixture(async ({ svc, make }) => {
  const OWN = '22222222-0000-4000-8000-000000000002';
  assert.equal((await svc.providersInfo()).microsoft.available, true);
  await svc.microsoftApp.set(OWN);
  const u = new URL((await svc.begin({ provider: 'microsoft', email: 'me@hotmail.com' })).url);
  assert.equal(u.searchParams.get('client_id'), OWN);
  assert.equal(u.searchParams.get('redirect_uri'), 'http://localhost:4900/api/accounts/callback');
  assert.equal((await svc.providersInfo()).microsoft.custom, true);
  await assert.rejects(svc.microsoftApp.set('not-an-id'), { code: 'BAD_REQUEST' });
  await svc.microsoftApp.set(null);
  delete process.env.OPENDASH_MICROSOFT_CLIENT_ID;
  const fresh = make();
  const info = await fresh.providersInfo();
  assert.equal(info.microsoft.available, false); assert.equal(info.imap.available, true, '+ Other email (IMAP) is built in');
  await assert.rejects(fresh.begin({ provider: 'microsoft', email: 'me@hotmail.com' }), { code: 'NOT_CONFIGURED' });
}));

test('another provider joins through registerProvider: same list, same sources, its own config per data folder', async () => fixture(async ({ dir, svc }) => {
  const { registerProvider } = await import('../lib/accounts.mjs');
  const seen = [];
  registerProvider('google', (ctx) => ({
    id: 'google',
    async configured() { return { ok: !!(await ctx.config.clientId()) }; },
    async beginSignIn({ loginHint, kind }) { const state = ctx.pending.begin({ provider: 'google', loginHint, kind: kind || 'personal', features: { mail: true, calendar: true }, scopes: [] }); return { url: 'https://accounts.example.test/?state=' + state, state, kind: 'personal' }; },
    async handleCallback(params, pend) { const id = await ctx.accountIdFor({ provider: 'google', email: pend.loginHint }); await ctx.vault.write(id, { refresh_token: 'g' }); return { id, provider: 'google', email: pend.loginHint, kind: 'personal', scopes: [], features: pend.features, status: 'connected' }; },
    async accessToken() { return 'x'; }, async fetchMail() { return { accounts: [], messages: [], count: 0, warnings: [] }; }, async fetchCalendar() { return { calendars: [], events: [], count: 0, warnings: [] }; },
    async disconnect(id) { await ctx.vault.remove(id); },
  }), ({ store }) => { seen.push(store.location); return { clientId: async () => 'synthetic-google-client' }; });
  assert.equal((await svc.providersInfo()).google.available, true);
  const b = await svc.begin({ provider: 'google', email: 'me@gmail.com' });
  const { account } = await svc.callback({ state: new URL(b.url).searchParams.get('state') });
  assert.equal(account.provider, 'google');
  const src = (await readSourcesFile(dir)).sources.filter(s => s.account === account.id);
  assert.deepEqual(src.map(s => s.kind + '/' + s.capability).sort(), ['google/calendar', 'google/email']);
  assert.ok(seen.length && seen.every(l => l === secretStore(dir).location), 'config built with this data folder\'s secret store');
}));
