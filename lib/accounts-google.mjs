// lib/accounts-google.mjs - the Node side of Google accounts (docs/dev/ACCOUNTS.md,
// "Google specifics"):
//
//   createGoogleConfig({store, env})   which Google app (OAuth client) this copy
//                                      uses: the user's own (Advanced) wins over
//                                      the built-in one (lib/accounts/shipped.mjs,
//                                      or OPENDASH_GOOGLE_CLIENT_ID / _SECRET in
//                                      the environment). The provider's ctx.config.
//   migrateLegacyGoogle({...})         the old single Google connection (before
//                                      2.15: lib/google.mjs) -> one account record.
//
// The user's own app is kept on THIS computer only, in the secret store under
// 'google-client': the file the single-account setup used
// (secretsDir/google-client.json), so an existing setup keeps working. A saved
// null there means "use the built-in app" (it also hides an old
// client_secret_*.json download). Nothing here ever logs or returns a secret.
//
// store: a secret store (lib/secret-store.mjs secretStore(dataDir)) with
// get/set/delete/list/has. Node stdlib only (through the store).

import { shippedGoogleClient } from './accounts/shipped.mjs';
import { parseGoogleClient, legacyGoogleConnection, guessKind } from './accounts/google.mjs';
import { sha256Hex, validateAccount, fail } from './accounts/core.mjs';

export const GOOGLE_APP_KEY = 'google-client';
export const LEGACY_TOKENS_KEY = 'google-tokens';
export const MIGRATED_TOKENS_KEY = 'google-tokens.migrated';

/** The key holding the user's own Google app: 'google-client', else an old client_secret_* download, else null. */
async function appKey(store) {
  if (await store.has(GOOGLE_APP_KEY)) return GOOGLE_APP_KEY;
  const keys = await store.list().catch(() => []);
  return keys.find((k) => !k.includes('/') && /^client_secret/i.test(k)) || null;
}

/** The user's own Google app on this computer, or null (none, switched off, or unreadable). */
export async function readGoogleApp(store) {
  const key = await appKey(store).catch(() => null);
  if (!key) return null;
  let raw;
  try { raw = await store.get(key); } catch { return null; }
  if (!raw) return null;
  try { return parseGoogleClient(raw); } catch { return null; }
}

/**
 * createGoogleConfig -> the Google provider's ctx.config (synchronous reads of
 * a cache; call load() at start-up and after every change, save() does it).
 *   clientId()           the client new sign-ins use
 *   clientSecret(id)     the secret that belongs to that client id, else null
 *   knownClient(id)      may tokens from this client still be refreshed?
 *   describe()           {available, custom, builtIn, hasSecret, clientIdHint} for GET /api/accounts
 *   save(input | null)   the user's own app (Google's JSON, {clientId, clientSecret} or a bare id); null = built-in
 */
export function createGoogleConfig({ store, env = process.env } = {}) {
  if (!store) throw new Error('createGoogleConfig needs a secret store');
  let own = null;
  const builtIn = () => shippedGoogleClient(env);
  const current = () => own || builtIn();
  const describe = () => {
    const c = current();
    return {
      available: !!c, custom: !!own, builtIn: !!builtIn(), hasSecret: !!(c && c.clientSecret),
      clientIdHint: own ? own.clientId.split('.')[0].slice(0, 10) + '…' : null,
    };
  };
  return {
    async load() { own = await readGoogleApp(store); return describe(); },
    clientId: () => (current() ? current().clientId : null),
    clientSecret: (id) => {
      if (own && own.clientId === id) return own.clientSecret || null;
      const b = builtIn();
      return b && b.clientId === id ? b.clientSecret || null : null;
    },
    knownClient: (id) => !!id && ((own && own.clientId === id) || (builtIn() && builtIn().clientId === id)) || false,
    describe,
    async save(input) {
      if (input == null || input === '') {
        await store.set(GOOGLE_APP_KEY, null);
        own = null;
        return describe();
      }
      const c = parseGoogleClient(input);
      // Re-saving the same app with the secret left blank keeps the saved secret.
      const keep = own && own.clientId === c.clientId && !c.clientSecret ? own.clientSecret : null;
      const next = { clientId: c.clientId, clientSecret: c.clientSecret || keep || null };
      await store.set(GOOGLE_APP_KEY, next);
      own = next;
      return describe();
    },
  };
}

/**
 * The old single Google connection -> one account, once (idempotent; a later
 * run finds the record and does nothing). Steps:
 *   1. read secret 'google-tokens' (+ the client it was made with);
 *   2. its tokens go to 'accounts/<id>' (never over a newer sign-in already there);
 *      id = 'acc_' + sha256('google:' + address)[0..16], so a re-run finds it;
 *   3. the account record joins the registry: legacy:true, both features on,
 *      fetcher = this computer, status connected;
 *   4. the old client stays the user's own Google app ('google-client');
 *   5. 'google-tokens' becomes 'google-tokens.migrated'.
 * The refresh token keeps working: it is refreshed with the client that made it.
 * Returns {status:'none'|'skipped'|'done', accountId?, isNew?, account?, reason?}.
 * registry: {read, mutate(fn(list))} (the core's adapter). hooks.changed('connected', account, {isNew, legacy:true}) lets the binding make the sources.
 */
export async function migrateLegacyGoogle({ store, registry, deviceId = null, now = () => Date.now(), log = () => {}, hooks = {} } = {}) {
  let tokens;
  try { tokens = await store.get(LEGACY_TOKENS_KEY); } catch { log('warn', 'google: the old Google sign-in could not be read; it was left as it is'); return { status: 'skipped', reason: 'unreadable' }; }
  if (!tokens || typeof tokens !== 'object' || !tokens.refresh_token) return { status: 'none' };
  const key = await appKey(store).catch(() => null);
  let clientDoc = null;
  try { clientDoc = key ? await store.get(key) : null; } catch { clientDoc = null; }
  const legacy = legacyGoogleConnection(clientDoc, tokens);
  if (!legacy) {
    log('warn', 'google: the old Google sign-in has no usable app or address; add the account again in Connections');
    return { status: 'skipped', reason: clientDoc ? 'no-address' : 'no-client' };
  }
  const at = new Date(now()).toISOString();
  const wanted = 'acc_' + (await sha256Hex('google:' + legacy.email)).slice(0, 16);
  // Which record: an existing Google account with this address wins (it may have been added already).
  const doc = await registry.read();
  const hit = (doc && Array.isArray(doc.accounts) ? doc.accounts : []).find((a) => a && a.provider === 'google' && a.email === legacy.email);
  const id = hit ? hit.id : wanted;
  const secretKey = 'accounts/' + id;
  if (!(await store.get(secretKey).catch(() => null))) await store.set(secretKey, legacy.tokens);
  const out = await registry.mutate((list) => {
    const i = list.findIndex((a) => a && a.id === id);
    if (i >= 0) return { account: list[i], isNew: false };
    const { account, errors } = validateAccount({
      id, provider: 'google', email: legacy.email, displayName: '', kind: guessKind(legacy.email),
      scopes: legacy.tokens.scope, features: { mail: true, calendar: true }, status: 'connected',
      fetcher: deviceId, createdAt: at, updatedAt: at, legacy: true,
    });
    if (errors.length) throw fail('PROVIDER_RESPONSE', 'The old Google sign-in could not be moved.', 500);
    list.push(account);
    return { account, isNew: true };
  });
  // The client the refresh token belongs to stays this computer's own Google app, under its tidy name.
  if (key !== GOOGLE_APP_KEY) await store.set(GOOGLE_APP_KEY, legacy.client);
  await store.set(MIGRATED_TOKENS_KEY, tokens);
  await store.delete(LEGACY_TOKENS_KEY);
  log('note', `google: the old Google connection is now an account (${out.isNew ? 'added' : 'already there'})`);
  if (typeof hooks.changed === 'function') { try { await hooks.changed('connected', out.account, { isNew: out.isNew, legacy: true }); } catch { /* the binding retries at its next start */ } }
  return { status: 'done', accountId: id, isNew: out.isNew, account: out.account };
}
