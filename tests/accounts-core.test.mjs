// The pure accounts core (lib/accounts/core.mjs): record, Web Crypto helpers,
// pending sign-ins, redirect adapters, the token vault and the service with a
// synthetic provider. No network, no files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateAccount, publicAccount, syncedText, newAccountId, pkcePair, createPendingStore, loopbackRedirect, customSchemeRedirect, webRedirect,
  createVault, memorySecretStore, createAccounts, fail, cleanEmail, jwtClaims, ACCOUNT_ID_RE,
} from '../lib/accounts/core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('lib/accounts/* is pure: no node: imports, nothing outside lib/accounts, no process/Buffer', () => {
  const dir = join(ROOT, 'lib', 'accounts');
  const files = readdirSync(dir).filter(f => f.endsWith('.mjs'));
  assert.ok(files.includes('core.mjs') && files.includes('microsoft.mjs'));
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    const specs = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1] || m[2]);
    for (const s of specs) {
      assert.ok(!s.startsWith('node:') && !['fs', 'path', 'crypto', 'os'].includes(s), `${f} imports ${s}`);
      assert.ok(s.startsWith('./') && !s.includes('/..') && !s.slice(2).includes('/'), `${f} imports ${s} (only siblings in lib/accounts/)`);
    }
    const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/\bBuffer\b/.test(code), `${f} uses Buffer`);
    assert.ok(!/(^|[^.\w])process\./.test(code), `${f} uses process`);
    assert.ok(!/require\(/.test(code), `${f} uses require`);
  }
});

test('the record keeps only contract fields; secrets and bad values never survive', () => {
  const id = newAccountId();
  assert.match(id, ACCOUNT_ID_RE);
  const { account, errors } = validateAccount({ id, provider: 'microsoft', email: ' Person@Example.TEST ', kind: 'work', tenantId: '11111111-2222-4333-8444-555555555555',
    scopes: ['User.Read', 'Mail.Read', 'bad scope!'], features: { mail: false }, status: 'connected', access_token: 'secret', refresh_token: 'secret', extra: 1, fetcher: 'hostabcdef12' });
  assert.deepEqual(errors, []);
  assert.equal(account.email, 'person@example.test');
  assert.deepEqual(account.features, { mail: false, calendar: true });
  assert.deepEqual(account.scopes, ['User.Read', 'Mail.Read']);
  assert.ok(!JSON.stringify(account).includes('secret'));
  assert.ok(!('extra' in account));
  assert.equal(validateAccount({ id: 'x', provider: 'aol', email: 'nope' }).errors.length, 3);
  assert.equal(validateAccount({ id, provider: 'google', email: 'a@b.test', status: 'weird' }).account.status, 'needs-sign-in');
  assert.equal(cleanEmail('no-at-sign'), ''); assert.equal(cleanEmail('a@b'), '');
  // The source ids of the account's snapshots travel with the record (folder sync); bad ones are dropped.
  const withSources = validateAccount({ id, provider: 'microsoft', email: 'a@example.com', sources: { mail: 'email-outlook-ab12', calendar: '../x', other: 'email-x-1' } }).account;
  assert.deepEqual(withSources.sources, { mail: 'email-outlook-ab12' });
  assert.equal('sources' in validateAccount({ id, provider: 'microsoft', email: 'a@example.com', sources: { mail: 'BAD ID' } }).account, false);
});

test('public view: plain status text, "synced N min ago", the fetcher on this device', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const { account } = validateAccount({ id: newAccountId(), provider: 'microsoft', email: 'a@b.test', status: 'connected', lastSync: '2026-10-23T11:56:00Z', fetcher: 'deviceaaaa1' });
  const here = publicAccount(account, { deviceId: 'deviceaaaa1', signedIn: true, now });
  assert.equal(here.statusText, 'Connected'); assert.equal(here.syncedText, 'synced 4 min ago'); assert.deepEqual(here.here, { fetcher: true, signedIn: true });
  const there = publicAccount(account, { deviceId: 'devicebbbb2', now });
  assert.equal(there.statusText, 'Checked on your other computer'); assert.equal(there.here.fetcher, false);
  assert.equal(syncedText(null, now), 'not synced yet');
  assert.equal(syncedText('2026-10-23T09:00:00Z', now), 'synced 3 hours ago');
  assert.equal(syncedText('2026-10-22T11:00:00Z', now), 'synced 1 day ago');
  assert.equal(publicAccount({ ...account, status: 'needs-admin-approval' }, { deviceId: 'deviceaaaa1', approval: { consentUrl: 'x' } }).statusText, 'Waiting for your organisation');
});

test('PKCE is S256 over the verifier, with Web Crypto', async () => {
  const p = await pkcePair();
  assert.equal(p.method, 'S256');
  assert.ok(p.verifier.length >= 43 && p.verifier.length <= 128);
  assert.equal(createHash('sha256').update(p.verifier).digest('base64url'), p.challenge);
  const claims = jwtClaims('x.' + Buffer.from(JSON.stringify({ tid: 't', name: 'N' })).toString('base64url') + '.y');
  assert.deepEqual(claims, { tid: 't', name: 'N' });
  assert.deepEqual(jwtClaims('garbage'), {});
});

test('pending sign-ins are single-use, expire after ten minutes and are capped', () => {
  let clock = 1000;
  const p = createPendingStore({ now: () => clock });
  const s = p.begin({ provider: 'microsoft' });
  assert.equal(p.take(s).provider, 'microsoft'); assert.equal(p.take(s), null);
  const old = p.begin({}); clock += 600001; assert.equal(p.take(old), null);
  for (let i = 0; i < 30; i++) p.begin({ i });
  assert.equal(p.size, 20);
});

test('redirect adapters: loopback (desktop), custom scheme (mobile), web (PWA)', () => {
  const lo = loopbackRedirect({ port: 4900 });
  assert.equal(lo.kind, 'loopback'); assert.equal(lo.uri(), 'http://localhost:4900/api/accounts/callback');
  assert.ok(lo.matches('http://localhost:4900/api/accounts/callback?code=1&state=2')); assert.ok(!lo.matches('http://evil.test/api/accounts/callback'));
  assert.throws(() => loopbackRedirect({ port: 1, host: 'example.test' }));
  const app = customSchemeRedirect();
  assert.equal(app.uri(), 'com.opendash.app:/oauth2redirect'); assert.ok(app.matches('com.opendash.app:/oauth2redirect?code=1'));
  assert.throws(() => customSchemeRedirect({ scheme: 'http' }));
  const web = webRedirect({ origin: 'https://app.example.test' });
  assert.equal(web.uri(), 'https://app.example.test/oauth/callback');
  assert.throws(() => webRedirect({ origin: 'http://app.example.test' }));
});

test('vault: refresh is serialized per account, shared by concurrent callers, rotates; accounts never share', async () => {
  const store = memorySecretStore(); const locks = [];
  store.lock = async (key, fn) => { locks.push(key); return fn(); };
  const v = createVault(store);
  const a = newAccountId(), b = newAccountId();
  await v.write(a, { refresh_token: 'ra', n: 0 }); await v.write(b, { refresh_token: 'rb', n: 0 });
  let calls = 0, release;
  const gate = new Promise(r => { release = r; });
  const fn = async (old) => { calls++; await gate; return { doc: { ...old, refresh_token: old.refresh_token + '+', n: old.n + 1 }, value: 'tok' + (old.n + 1) }; };
  const p1 = v.refresh(a, fn), p2 = v.refresh(a, fn), pb = v.refresh(b, fn);
  release();
  assert.deepEqual(await Promise.all([p1, p2, pb]), ['tok1', 'tok1', 'tok1']);
  assert.equal(calls, 2, 'one refresh for a (shared), one for b');
  assert.equal((await v.read(a)).refresh_token, 'ra+'); assert.equal((await v.read(b)).refresh_token, 'rb+');
  assert.ok(locks.includes('accounts/' + a) && locks.includes('accounts/' + b));
  // a failed refresh does not block the next one
  await assert.rejects(v.refresh(a, async () => { throw fail('NEEDS_SIGN_IN', 'x'); }), { code: 'NEEDS_SIGN_IN' });
  assert.equal(await v.refresh(a, async (old) => ({ value: old.refresh_token })), 'ra+');
  await assert.rejects(v.read('../../etc'), { code: 'UNKNOWN_ACCOUNT' });
});

// A synthetic provider following the contract.
function fakeProvider(behaviour = {}) {
  return (ctx) => ({
    id: 'microsoft',
    async configured() { return { ok: true }; },
    async beginSignIn({ loginHint, kind, accountId, features }) {
      const state = ctx.pending.begin({ provider: 'microsoft', loginHint, kind: kind || 'personal', accountId, features: features || { mail: true, calendar: true }, scopes: ['User.Read'] });
      return { url: 'https://login.example.test/?state=' + state, state, kind: kind || 'personal' };
    },
    async handleCallback(params, pend) {
      if (behaviour.callbackError) throw behaviour.callbackError(pend);
      const email = params.email || pend.loginHint;
      const id = await ctx.accountIdFor({ provider: 'microsoft', email });
      await ctx.vault.write(id, { refresh_token: 'r-' + email });
      return { id, provider: 'microsoft', email, displayName: 'Synthetic', kind: pend.kind, scopes: ['User.Read', 'Mail.Read'], features: pend.features, status: 'connected' };
    },
    async accessToken(id) { return ctx.vault.refresh(id, async (old) => ({ value: old.refresh_token })); },
    async fetchMail(id) { if (behaviour.mailError) throw behaviour.mailError; return { accounts: [], messages: [{ id: 'm1' }], count: 1, warnings: [] }; },
    async fetchCalendar() { return { calendars: [], events: [], count: 0, warnings: [] }; },
    async disconnect(id) { await ctx.vault.remove(id); },
    async approvalHelp(a) { return { consentUrl: 'https://login.example.test/' + (a.tenantId || 'organizations') + '/adminconsent', mailto: 'mailto:?subject=x', tenant: a.tenantId }; },
  });
}
function memoryRegistry() {
  const doc = { version: 1, accounts: [] };
  return { doc, read: async () => JSON.parse(JSON.stringify(doc)), mutate: async (fn) => { const list = JSON.parse(JSON.stringify(doc.accounts)); const r = await fn(list); doc.accounts = list; return r; } };
}
const state = (url) => new URL(url).searchParams.get('state');

test('service: add two accounts side by side; re-sign-in keeps choices; pause, features, remove', async () => {
  const registry = memoryRegistry(), secrets = memorySecretStore(), events = [];
  let clock = Date.parse('2026-10-23T10:00:00Z');
  const svc = createAccounts({ registry, secrets, providers: { microsoft: fakeProvider() }, redirect: loopbackRedirect({ port: 4900 }), now: () => clock, deviceId: 'deviceaaaa1', hooks: { changed: (e, a) => events.push([e, a.email]) } });
  await assert.rejects(svc.begin({ provider: 'microsoft', email: 'not an email' }), { code: 'BAD_REQUEST' });
  await assert.rejects(svc.begin({ provider: 'imap', email: 'a@b.test' }), { code: 'NOT_CONFIGURED' });
  const one = await svc.callback({ state: state((await svc.begin({ provider: 'microsoft', email: 'me@hotmail.example' })).url), code: 'c' });
  const two = await svc.callback({ state: state((await svc.begin({ provider: 'microsoft', email: 'me@work.example', kind: 'work' })).url), code: 'c' });
  assert.notEqual(one.account.id, two.account.id);
  assert.equal((await svc.list()).length, 2);
  assert.equal(registry.doc.accounts[0].fetcher, 'deviceaaaa1', 'the connecting device fetches');
  assert.ok(!JSON.stringify(registry.doc).includes('r-me@'), 'no tokens in the registry');
  assert.equal((await secrets.get('accounts/' + one.account.id)).refresh_token, 'r-me@hotmail.example');
  assert.equal((await secrets.get('accounts/' + two.account.id)).refresh_token, 'r-me@work.example');
  // a replayed state is refused
  await assert.rejects(svc.callback({ state: 'nope', code: 'c' }), { code: 'OAUTH_STATE' });
  await svc.setFeatures(one.account.id, { calendar: false });
  const again = await svc.callback({ state: state((await svc.begin({ provider: 'microsoft', accountId: one.account.id })).url), code: 'c' });
  assert.equal(again.account.id, one.account.id); assert.equal(again.isNew, false);
  assert.equal(again.account.features.calendar, false, 're-sign-in keeps the user\'s choices');
  assert.equal((await svc.list()).length, 2);
  // fetch guards
  assert.equal((await svc.fetchMail(one.account.id)).count, 1);
  assert.ok((await svc.get(one.account.id)).lastSync);
  await assert.rejects(svc.fetchCalendar(one.account.id, {}), { code: 'FEATURE_OFF' });
  await svc.pause(two.account.id);
  await assert.rejects(svc.fetchMail(two.account.id), { code: 'PAUSED' });
  assert.equal((await svc.resume(two.account.id)).status, 'connected');
  const here = await svc.fetchHere(two.account.id);   // signed in here and already its fetcher
  assert.equal(here.ok, true); assert.equal(here.message, 'This computer checks this account now.'); assert.equal(here.account.here.fetcher, true);
  await svc.remove(two.account.id);
  assert.equal(await secrets.get('accounts/' + two.account.id), null, 'remove deletes this device\'s tokens');
  assert.equal((await svc.list()).length, 1);
  assert.ok(events.some(([e]) => e === 'removed') && events.some(([e]) => e === 'features'));
});

test('service: only the fetcher reads; another device is refused before any provider call', async () => {
  const registry = memoryRegistry(), secrets = memorySecretStore();
  const a = createAccounts({ registry, secrets, providers: { microsoft: fakeProvider() }, redirect: loopbackRedirect({ port: 1 }), deviceId: 'deviceaaaa1' });
  const { account } = await a.callback({ state: state((await a.begin({ provider: 'microsoft', email: 'me@hotmail.example' })).url), code: 'c' });
  const b = createAccounts({ registry, secrets: memorySecretStore(), providers: { microsoft: fakeProvider({ mailError: new Error('must not be called') }) }, redirect: loopbackRedirect({ port: 1 }), deviceId: 'devicebbbb2' });
  assert.equal(await a.isFetcher(account.id), true); assert.equal(await b.isFetcher(account.id), false);
  await assert.rejects(b.fetchMail(account.id), { code: 'NOT_FETCHER' });
  const seen = (await b.list())[0];
  assert.equal(seen.statusText, 'Checked on your other computer'); assert.equal(seen.here.signedIn, false);
});

test('"Fetch on this computer instead": refused without a sign-in here, then the record\'s fetcher moves', async () => {
  const registry = memoryRegistry();
  const a = createAccounts({ registry, secrets: memorySecretStore(), providers: { microsoft: fakeProvider() }, redirect: loopbackRedirect({ port: 1 }), deviceId: 'deviceaaaa1' });
  const { account } = await a.callback({ state: state((await a.begin({ provider: 'microsoft', email: 'me@hotmail.example' })).url), code: 'c' });
  const bSecrets = memorySecretStore();
  const b = createAccounts({ registry, secrets: bSecrets, providers: { microsoft: fakeProvider() }, redirect: loopbackRedirect({ port: 1 }), deviceId: 'devicebbbb2' });
  assert.deepEqual(await b.fetchHere(account.id), { ok: false, code: 'SIGN_IN_FIRST', message: 'Sign in on this computer to take over.' });
  assert.equal((await b.get(account.id)).fetcher, 'deviceaaaa1', 'a refusal changes nothing');
  await bSecrets.set('accounts/' + account.id, { refresh_token: 'r-b' });   // B signed in on its own
  const moved = await b.fetchHere(account.id);
  assert.equal(moved.ok, true); assert.equal(moved.account.here.fetcher, true);
  assert.equal(await b.isFetcher(account.id), true); assert.equal(await a.isFetcher(account.id), false);
  await assert.rejects(a.fetchMail(account.id), { code: 'NOT_FETCHER' });
  assert.equal((await b.fetchMail(account.id)).count, 1);
  await assert.rejects(a.fetchHere('acc_0000000000000000'), { code: 'UNKNOWN_ACCOUNT' });
});

test('a fetcher policy (folder sync) decides who reads and moves the job; null leaves it to the record', async () => {
  const registry = memoryRegistry(), calls = [];
  let answer = false;
  const policy = {
    async isFetcher(id, acc) { calls.push(['isFetcher', id, !!acc]); return answer; },
    async takeOver(id, { hasToken }) { calls.push(['takeOver', id, hasToken]); return hasToken ? { ok: true, deviceId: 'x', me: true } : { ok: false, code: 'SIGN_IN_FIRST', message: 'Sign in on this computer to take over.' }; },
  };
  const svc = createAccounts({ registry, secrets: memorySecretStore(), providers: { microsoft: fakeProvider() }, redirect: loopbackRedirect({ port: 1 }), deviceId: 'deviceaaaa1', fetcher: policy });
  const { account } = await svc.callback({ state: state((await svc.begin({ provider: 'microsoft', email: 'me@hotmail.example' })).url), code: 'c' });
  assert.equal(await svc.isFetcher(account.id), false, 'the policy says another device reads it, although the record names this one');
  await assert.rejects(svc.fetchMail(account.id), { code: 'NOT_FETCHER' });
  answer = true;
  assert.equal((await svc.fetchMail(account.id)).count, 1);
  const r = await svc.fetchHere(account.id);
  assert.equal(r.ok, true);
  assert.deepEqual(calls.filter(c => c[0] === 'takeOver'), [['takeOver', account.id, true]], 'the policy hears whether this device holds a sign-in');
  answer = null;   // e.g. sync switched off: the record decides
  assert.equal(await svc.isFetcher(account.id), true);
});

test('service: errors set plain statuses; admin approval keeps a record to retry', async () => {
  const registry = memoryRegistry(), secrets = memorySecretStore();
  const svc = createAccounts({ registry, secrets, redirect: loopbackRedirect({ port: 1 }), deviceId: 'deviceaaaa1', providers: { microsoft: fakeProvider({
    callbackError: (pend) => fail('NEEDS_ADMIN_APPROVAL', 'Your organisation needs to approve OpenDash once.', 403, { account: { email: pend.loginHint, kind: 'work', tenantId: 'work.example' } }),
  }) } });
  const err = await svc.callback({ state: state((await svc.begin({ provider: 'microsoft', email: 'me@work.example', kind: 'work' })).url), error: 'access_denied' }).catch(e => e);
  assert.equal(err.code, 'NEEDS_ADMIN_APPROVAL');
  assert.equal(err.account.status, 'needs-admin-approval'); assert.equal(err.account.statusText, 'Waiting for your organisation');
  assert.match(err.account.approval.consentUrl, /work\.example\/adminconsent/);
  const list = await svc.list();
  assert.equal(list.length, 1); assert.equal(list[0].approval.tenant, 'work.example');
  await assert.rejects(svc.fetchMail(list[0].id), { code: 'NEEDS_ADMIN_APPROVAL' });
  // an admin who used the consent link comes back without a state of ours
  assert.deepEqual(await svc.callback({ admin_consent: 'True', tenant: 'x' }), { adminConsent: true });
  // a refused refresh marks the account "Sign in again"
  const svc2 = createAccounts({ registry: memoryRegistry(), secrets, redirect: loopbackRedirect({ port: 1 }), deviceId: 'deviceaaaa1', providers: { microsoft: fakeProvider({ mailError: fail('NEEDS_SIGN_IN', 'Microsoft needs you to sign in again.', 401) }) } });
  const { account } = await svc2.callback({ state: state((await svc2.begin({ provider: 'microsoft', email: 'me@hotmail.example' })).url), code: 'c' });
  await assert.rejects(svc2.fetchMail(account.id), { code: 'NEEDS_SIGN_IN' });
  const after = await svc2.get(account.id);
  assert.equal(after.status, 'needs-sign-in'); assert.equal(after.error.message, 'Microsoft needs you to sign in again.');
});
