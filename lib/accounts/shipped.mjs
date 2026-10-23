// lib/accounts/shipped.mjs - the app registrations a release ships with, so
// normal users never see a client ID (docs/dev/ACCOUNTS.md, section 6).
//
// The values below are PLACEHOLDERS. A release build replaces each one with
// the real public client ID (a Microsoft Entra app registration is public:
// no secret). Until then OpenDash says Microsoft sign-in is not set up in this
// copy, and Connections > Add Microsoft account > Advanced lets a user use
// their own app. The environment variable of the same name (or <data>/.env)
// also sets it, for builds and tests that do not rewrite this file.
// tools/release-client-ids.mjs writes the real values into the release ZIP
// only (tools/release-package.mjs --client-ids). OPENDASH_SHIPPED_IDS=off
// ignores the written values (the zip's own test run uses it, so the tests see
// a copy without built-in apps, as in the repository).
//
// Pure JS (no node: imports): app builds read the same file.

export const SHIPPED = Object.freeze({
  microsoftClientId: 'OPENDASH_MICROSOFT_CLIENT_ID',
  // Google "Desktop app" OAuth client (loopback redirect). Google treats a
  // desktop client's secret as not confidential, but its policy says never to
  // commit it to a public repository: the release build writes both values.
  googleClientId: 'OPENDASH_GOOGLE_CLIENT_ID',
  googleClientSecret: 'OPENDASH_GOOGLE_CLIENT_SECRET',
});

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isClientId = (s) => GUID.test(String(s || ''));

/** The built-in Microsoft client ID: the shipped value, else env, else null. */
const shippedOn = (env) => !(env && env.OPENDASH_SHIPPED_IDS === 'off');
export function shippedMicrosoftClientId(env = (globalThis.process && globalThis.process.env) || {}) {
  if (shippedOn(env) && isClientId(SHIPPED.microsoftClientId)) return SHIPPED.microsoftClientId;
  const v = env.OPENDASH_MICROSOFT_CLIENT_ID;
  return isClientId(v) ? v : null;
}

const GOOGLE_ID = /^[A-Za-z0-9_-]{8,200}\.apps\.googleusercontent\.com$/;
const GOOGLE_SECRET = /^[\x21-\x7e]{8,512}$/;
export const isGoogleClientId = (s) => GOOGLE_ID.test(String(s || ''));

/**
 * The built-in Google desktop client: {clientId, clientSecret} from the
 * shipped values, else OPENDASH_GOOGLE_CLIENT_ID / OPENDASH_GOOGLE_CLIENT_SECRET
 * in the environment, else null. The id and its secret always come from the
 * same place (a shipped id never pairs with an environment secret).
 */
export function shippedGoogleClient(env = (globalThis.process && globalThis.process.env) || {}) {
  const pick = (id, secret) => (isGoogleClientId(id) ? { clientId: id, clientSecret: GOOGLE_SECRET.test(String(secret || '')) && !/^OPENDASH_/.test(secret) ? secret : null } : null);
  return (shippedOn(env) ? pick(SHIPPED.googleClientId, SHIPPED.googleClientSecret) : null) || pick(env.OPENDASH_GOOGLE_CLIENT_ID, env.OPENDASH_GOOGLE_CLIENT_SECRET);
}
