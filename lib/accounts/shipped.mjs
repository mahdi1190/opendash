// lib/accounts/shipped.mjs - the app registrations a release ships with, so
// normal users never see a client ID (docs/dev/ACCOUNTS.md, section 6).
//
// The values below are PLACEHOLDERS. A release build replaces each one with
// the real public client ID (a Microsoft Entra app registration is public:
// no secret). Until then OpenDash says Microsoft sign-in is not set up in this
// copy, and Connections > Add Microsoft account > Advanced lets a user use
// their own app. The environment variable of the same name (or <data>/.env)
// also sets it, for builds and tests that do not rewrite this file.
//
// Pure JS (no node: imports): app builds read the same file.

export const SHIPPED = Object.freeze({
  microsoftClientId: 'OPENDASH_MICROSOFT_CLIENT_ID',
});

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isClientId = (s) => GUID.test(String(s || ''));

/** The built-in Microsoft client ID: the shipped value, else env, else null. */
export function shippedMicrosoftClientId(env = (globalThis.process && globalThis.process.env) || {}) {
  if (isClientId(SHIPPED.microsoftClientId)) return SHIPPED.microsoftClientId;
  const v = env.OPENDASH_MICROSOFT_CLIENT_ID;
  return isClientId(v) ? v : null;
}
