// Google accounts, the Node side (lib/accounts-google.mjs): the Google app
// setting and the move of the old single connection. Temp folders and
// synthetic Google responses only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { secretStore, fileBackend } from '../lib/secret-store.mjs';
import { createGoogleConfig, readGoogleApp, migrateLegacyGoogle, GOOGLE_APP_KEY } from '../lib/accounts-google.mjs';
import { createGoogleProvider, GOOGLE_TOKEN_URL, GOOGLE_SCOPES } from '../lib/accounts/google.mjs';
import { createAccounts } from '../lib/accounts/core.mjs';

const OWN = 'synthetic-own-1111.apps.googleusercontent.com', OWN_SECRET = 'GOCSPX-own-synthetic';
const BUILT = 'synthetic-built-2222.apps.googleusercontent.com', BUILT_SECRET = 'GOCSPX-built-synthetic';
const ENV = { OPENDASH_GOOGLE_CLIENT_ID: BUILT, OPENDASH_GOOGLE_CLIENT_SECRET: BUILT_SECRET };
const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

async function withStore(run) {
  const dir = mkdtempSync(join(tmpdir(), 'google-accounts-test-'));
  try { await run({ dir, store: secretStore(null, { backend: fileBackend(join(dir, 'secrets')) }) }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
function memoryRegistry(accounts = []) {
  let doc = { version: 1, accounts };
  return {
    get doc() { return doc; },
    read: async () => structuredClone(doc),
    mutate: async (fn) => { const list = structuredClone(doc.accounts); const r = await fn(list); doc = { version: 1, accounts: list }; return r; },
  };
}

test('the Google app: built-in from the release/environment, the user\'s own wins, secrets stay paired with their id', async () => withStore(async ({ store }) => {
  const none = createGoogleConfig({ store, env: {} });
  assert.deepEqual(await none.load(), { available: false, custom: false, builtIn: false, hasSecret: false, clientIdHint: null });
  assert.equal(none.clientId(), null);
  const cfg = createGoogleConfig({ store, env: ENV });
  assert.deepEqual(await cfg.load(), { available: true, custom: false, builtIn: true, hasSecret: true, clientIdHint: null });
  assert.equal(cfg.clientId(), BUILT);
  assert.equal(cfg.clientSecret(BUILT), BUILT_SECRET);
  assert.equal(cfg.knownClient(OWN), false);
  const d = await cfg.save({ installed: { client_id: OWN, client_secret: OWN_SECRET } });
  assert.equal(d.custom, true);
  assert.ok(!JSON.stringify(d).includes(OWN_SECRET) && !JSON.stringify(d).includes(OWN), 'never the secret, only a hint of the id');
  assert.equal(cfg.clientId(), OWN);
  assert.equal(cfg.clientSecret(OWN), OWN_SECRET);
  assert.equal(cfg.clientSecret(BUILT), BUILT_SECRET, 'tokens from the built-in app still refresh');
  assert.equal(cfg.knownClient(BUILT) && cfg.knownClient(OWN), true);
  assert.equal(cfg.clientSecret('someone-else.apps.googleusercontent.com'), null);
  await cfg.save(OWN);
  assert.equal(cfg.clientSecret(OWN), OWN_SECRET, 'saving the same app without a secret keeps the saved one');
  assert.deepEqual(await store.get(GOOGLE_APP_KEY), { clientId: OWN, clientSecret: OWN_SECRET });
  await assert.rejects(cfg.save('nonsense'), { code: 'BAD_REQUEST' });
  assert.equal(cfg.clientId(), OWN, 'a bad paste changes nothing');
  await cfg.save(null);
  assert.equal(cfg.clientId(), BUILT);
  assert.equal(cfg.knownClient(OWN), false, 'tokens from a removed own app need a new sign-in');
  const again = createGoogleConfig({ store, env: ENV });
  assert.equal((await again.load()).custom, false, 'the choice is kept on this computer');
}));

test('an old client_secret_*.json download still counts as the user\'s own app; a saved "built-in" hides it', async () => withStore(async ({ dir, store }) => {
  mkdirSync(join(dir, 'secrets'), { recursive: true });
  writeFileSync(join(dir, 'secrets', `client_secret_${OWN}.json`), JSON.stringify({ installed: { client_id: OWN, client_secret: OWN_SECRET } }));
  assert.deepEqual(await readGoogleApp(store), { clientId: OWN, clientSecret: OWN_SECRET });
  const cfg = createGoogleConfig({ store, env: ENV });
  await cfg.load();
  assert.equal(cfg.clientId(), OWN);
  await cfg.save(null);
  assert.equal(await readGoogleApp(store), null);
  assert.equal(cfg.clientId(), BUILT);
}));

test('migration: the old single connection becomes one account, once; its tokens keep working with the app that made them', async () => withStore(async ({ dir, store }) => {
  // What lib/google.mjs (before 2.15) left on this computer.
  await store.set('google-client', { installed: { client_id: OWN, client_secret: OWN_SECRET, redirect_uris: ['http://localhost'] } });
  await store.set('google-tokens', { refresh_token: 'rt-legacy', access_token: 'at-legacy', expires_at: 1, account: 'Sam.Synthetic@example.com' });
  const reg = memoryRegistry();
  const events = [];
  const r = await migrateLegacyGoogle({ store, registry: reg, deviceId: 'host-1234abcd', now: () => Date.UTC(2026, 9, 23), hooks: { changed: async (e, a, x) => events.push([e, a.id, x]) } });
  const id = 'acc_' + createHash('sha256').update('google:sam.synthetic@example.com').digest('hex').slice(0, 16);
  assert.equal(r.status, 'done');
  assert.equal(r.accountId, id);
  assert.deepEqual(reg.doc.accounts, [{
    id, provider: 'google', email: 'sam.synthetic@example.com', displayName: '', kind: 'work',
    scopes: [GOOGLE_SCOPES.mail, GOOGLE_SCOPES.calendar], features: { mail: true, calendar: true }, status: 'connected',
    lastSync: null, error: null, fetcher: 'host-1234abcd', createdAt: '2026-10-23T00:00:00.000Z', updatedAt: '2026-10-23T00:00:00.000Z', legacy: true,
  }]);
  assert.ok(!JSON.stringify(reg.doc).includes('rt-legacy'), 'no token in the registry');
  const tokens = await store.get('accounts/' + id);
  assert.equal(tokens.refresh_token, 'rt-legacy');
  assert.equal(tokens.clientId, OWN);
  assert.equal(await store.get('google-tokens'), null);
  assert.equal(existsSync(join(dir, 'secrets', 'google-tokens.json')), false);
  assert.equal((await store.get('google-tokens.migrated')).refresh_token, 'rt-legacy');
  assert.deepEqual(events, [['connected', id, { isNew: true, legacy: true }]]);
  // Again: nothing to do.
  assert.equal((await migrateLegacyGoogle({ store, registry: reg })).status, 'none');
  assert.equal(reg.doc.accounts.length, 1);

  // The migrated account reads mail through the core service, refreshed with the old (own) app.
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === GOOGLE_TOKEN_URL) return reply({ access_token: 'at-new', expires_in: 3600, scope: `${GOOGLE_SCOPES.mail} ${GOOGLE_SCOPES.calendar}` });
    assert.equal(init.headers.Authorization, 'Bearer at-new');
    return reply({ messages: [] });
  };
  const cfg = createGoogleConfig({ store, env: ENV });
  await cfg.load();
  const svc = createAccounts({ registry: reg, secrets: store, providers: { google: createGoogleProvider }, providerConfig: { google: cfg }, fetch, deviceId: 'host-1234abcd', redirect: () => null });
  const mail = await svc.fetchMail(id, { source: { id: 'email-google-x' }, days: 3 });
  assert.equal(mail.count, 0);
  const body = Object.fromEntries(new URLSearchParams(calls[0].init.body));
  assert.deepEqual(body, { grant_type: 'refresh_token', refresh_token: 'rt-legacy', client_id: OWN, client_secret: OWN_SECRET });
  assert.equal(reg.doc.accounts[0].status, 'connected');
  assert.ok(reg.doc.accounts[0].lastSync);
}));

test('migration never replaces a newer sign-in, and finds an account added before it ran', async () => withStore(async ({ store }) => {
  await store.set('google-client', { installed: { client_id: OWN, client_secret: OWN_SECRET } });
  await store.set('google-tokens', { refresh_token: 'rt-legacy', account: 'sam@example.org' });
  await store.set('accounts/acc_00000000000000ab', { provider: 'google', clientId: BUILT, refresh_token: 'rt-newer', email: 'sam@example.org' });
  const reg = memoryRegistry([{ id: 'acc_00000000000000ab', provider: 'google', email: 'sam@example.org', kind: 'work', status: 'connected', features: { mail: false, calendar: true }, createdAt: '2026-10-01T00:00:00.000Z' }]);
  const r = await migrateLegacyGoogle({ store, registry: reg });
  assert.deepEqual([r.status, r.accountId, r.isNew], ['done', 'acc_00000000000000ab', false]);
  assert.equal((await store.get('accounts/acc_00000000000000ab')).refresh_token, 'rt-newer');
  assert.deepEqual(reg.doc.accounts[0].features, { mail: false, calendar: true }, 'the user\'s choices stay');
  assert.equal(reg.doc.accounts.length, 1);
}));

test('migration leaves what it cannot use: no app, no address, a signed-out or unreadable file', async () => withStore(async ({ dir, store }) => {
  const reg = memoryRegistry();
  assert.equal((await migrateLegacyGoogle({ store, registry: reg })).status, 'none', 'nothing there');
  await store.set('google-tokens', {});
  assert.equal((await migrateLegacyGoogle({ store, registry: reg })).status, 'none', 'disconnected before');
  await store.set('google-tokens', { refresh_token: 'rt', account: 'a@example.com' });
  assert.deepEqual(await migrateLegacyGoogle({ store, registry: reg }), { status: 'skipped', reason: 'no-client' });
  assert.equal((await store.get('google-tokens')).refresh_token, 'rt', 'kept for a later try');
  await store.set('google-client', { installed: { client_id: OWN, client_secret: OWN_SECRET } });
  await store.set('google-tokens', { refresh_token: 'rt' });
  assert.deepEqual(await migrateLegacyGoogle({ store, registry: reg }), { status: 'skipped', reason: 'no-address' });
  writeFileSync(join(dir, 'secrets', 'google-tokens.json'), '{not json');
  assert.deepEqual(await migrateLegacyGoogle({ store, registry: reg }), { status: 'skipped', reason: 'unreadable' });
  assert.equal(readFileSync(join(dir, 'secrets', 'google-tokens.json'), 'utf8'), '{not json');
  assert.equal(reg.doc.accounts.length, 0);
}));

test('the old status call counts Google accounts signed in on this computer (health, the connector gate)', async () => withStore(async ({ store }) => {
  const { initGoogle, googleStatus } = await import('../lib/google.mjs');
  try {
    initGoogle(store);
    assert.deepEqual([(await googleStatus()).connected, (await googleStatus()).accounts], [false, 0]);
    await store.set('accounts/acc_00000000000000a1', { provider: 'google', clientId: OWN, email: 'a@example.com', refresh_token: 'rt-a' });
    await store.set('accounts/acc_00000000000000a2', { provider: 'google', clientId: OWN, email: 'b@example.com', refresh_token: 'rt-b', needsAuth: true });
    await store.set('accounts/acc_00000000000000a3', { provider: 'microsoft', clientId: 'x', refresh_token: 'rt-m' });
    const st = await googleStatus();
    assert.deepEqual([st.connected, st.account, st.accounts], [true, 'a@example.com', 1]);
    assert.ok(!JSON.stringify(st).includes('rt-a'));
  } finally { initGoogle(null); }
}));
