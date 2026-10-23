// lib/accounts-google.mjs - the Node side of Google accounts (docs/dev/ACCOUNTS.md,
// "Google specifics" and section 10b):
//
//   migrateLegacyGoogle({...})   the old single Google connection (before 2.15:
//                                lib/google.mjs) -> one account record, once.
//
// The Google app setting itself (built-in vs the user's own app, secret
// 'google-client') is pure and lives with the provider: googleConfig() and
// readGoogleApp() in lib/accounts/google.mjs (re-exported here).
// Nothing here ever logs or returns a secret.
//
// store: a secret store (lib/secret-store.mjs secretStore(dataDir)) with
// get/set/delete/list/has.

import { parseGoogleClient, legacyGoogleConnection, guessKind, googleConfig, readGoogleApp, GOOGLE_APP_KEY } from './accounts/google.mjs';
import { sha256Hex, validateAccount, fail } from './accounts/core.mjs';

export { googleConfig, readGoogleApp, GOOGLE_APP_KEY };
export const LEGACY_TOKENS_KEY = 'google-tokens';
export const MIGRATED_TOKENS_KEY = 'google-tokens.migrated';

/** The key holding the old client: 'google-client', else an old client_secret_* download, else null. */
async function legacyClientKey(store) {
  if (await store.has(GOOGLE_APP_KEY)) return GOOGLE_APP_KEY;
  const keys = await store.list().catch(() => []);
  return keys.find((k) => !k.includes('/') && /^client_secret/i.test(k)) || null;
}

/**
 * The old single Google connection -> one account, once (idempotent; a later
 * run finds nothing to do). Steps:
 *   1. read secret 'google-tokens' (+ the client it was made with);
 *   2. its tokens go to 'accounts/<id>' (never over a newer sign-in already there);
 *      id = 'acc_' + sha256('google:' + address)[0..16], or the id of a Google
 *      account with that address that is already in the registry;
 *   3. the account record joins the registry: legacy:true, both features on,
 *      fetcher = this computer, status connected;
 *   4. the old client stays the user's own Google app ('google-client');
 *   5. 'google-tokens' becomes 'google-tokens.migrated'.
 * The refresh token keeps working: it is refreshed with the client that made it.
 * Returns {status:'none'|'skipped'|'done', accountId?, isNew?, account?, reason?}.
 * registry: {read, mutate(fn(list))}. hooks.changed('connected', account, {isNew, legacy:true})
 * lets the binding make the account's sources.
 */
export async function migrateLegacyGoogle({ store, registry, deviceId = null, now = () => Date.now(), log = () => {}, hooks = {} } = {}) {
  let tokens;
  try { tokens = await store.get(LEGACY_TOKENS_KEY); } catch { log('warn', 'google: the old Google sign-in could not be read; it was left as it is'); return { status: 'skipped', reason: 'unreadable' }; }
  if (!tokens || typeof tokens !== 'object' || !tokens.refresh_token) return { status: 'none' };
  const key = await legacyClientKey(store).catch(() => null);
  let clientDoc = null;
  try { clientDoc = key ? await store.get(key) : null; } catch { clientDoc = null; }
  const legacy = legacyGoogleConnection(clientDoc, tokens);
  if (!legacy) {
    log('warn', 'google: the old Google sign-in has no usable app or address; add the account again in Connections');
    return { status: 'skipped', reason: clientDoc ? 'no-address' : 'no-client' };
  }
  const at = new Date(now()).toISOString();
  const doc = await registry.read();
  const hit = (doc && Array.isArray(doc.accounts) ? doc.accounts : []).find((a) => a && a.provider === 'google' && a.email === legacy.email);
  const id = hit ? hit.id : 'acc_' + (await sha256Hex('google:' + legacy.email)).slice(0, 16);
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
  if (key !== GOOGLE_APP_KEY) await store.set(GOOGLE_APP_KEY, parseGoogleClient(legacy.client));
  await store.set(MIGRATED_TOKENS_KEY, tokens);
  await store.delete(LEGACY_TOKENS_KEY);
  log('note', `google: the old Google connection is now an account (${out.isNew ? 'added' : 'already there'})`);
  if (typeof hooks.changed === 'function') { try { await hooks.changed('connected', out.account, { isNew: out.isNew, legacy: true }); } catch { /* the sources follow at the next change */ } }
  return { status: 'done', accountId: id, isNew: out.isNew, account: out.account };
}
