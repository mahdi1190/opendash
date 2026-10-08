// lib/fin-connect/provider.mjs - the contract every direct finance provider
// (Monzo, Plasma One, Enable Banking) implements, and the typed error they throw.
// Design: docs/dev/FINANCE_CONNECTIONS.md section 3.2.
//
// A provider module default-exports one object (checked by defineProvider):
//
//   {
//     id: 'monzo' | 'plasma' | 'enable-banking',
//     label: 'Monzo',                      shown in Connections
//     readOnly: true,                      always; anything else is refused
//     allow: AllowRule[],                  the ONLY requests it may make (http.mjs)
//     status(ctx, source)   -> {configured, connected, needsAuth, reauthDue, message, ...}
//                              (never a secret: masked ids only)
//     connect(ctx, input)   -> {redirect} | {source}
//     callback(ctx, query)  -> {source, next}
//     refresh(ctx, source)  -> void         tokens / sessions
//     listAccounts(ctx, source) -> [{id, name, kind, mask, currency, balanceOnly?}]
//     fetch(ctx, source, {from, to, cursor, accountOn, first, full, manual})
//                           manual: the user asked (Sync now, a new connection), not a background update
//                           -> {rows: raw[], balances: [{accountId, balance, currency, asOf, name?}],
//                               accounts, cursor, warning?}
//     normalise(raw, ctx)   -> {row: Tx} | {reason}
//     disconnect(ctx, source) -> void       revoke where possible, delete secrets
//     routes?(app, svc)     -> registers its own /api/fin-connect/<provider>/... routes
//     fake?                 -> {fetchFn, ...} test-only stand-in (DASHBOARD_<X>_FAKE=1)
//   }
//
// Tx (what normalise returns; lib/fin-connect/normalise.mjs turns it into the
// finance row and converts the currency):
//   {id: provider id (dedupe within the provider), accountId, date: 'YYYY-MM-DD'
//    (or ts: ISO date-time, dated in the user's zone), minor: integer minor units
//    of `currency`, signed (money out negative), currency: 'GBP', memo, bc?: bank
//    category, sub?: 'FT' for transfers}
//
// ctx = {dataDir, financeDir, secrets, http(provider), now(), log, fx, fake, port, getConfig}
//
// Node stdlib only.

/** The error codes routes and the page understand (section 3.6). */
export const FIN_CODES = Object.freeze({
  BAD_REQUEST: 400,
  OAUTH_STATE: 400,
  SECRET_REFUSED: 400,
  NOT_SUPPORTED: 400,
  NOT_FOUND: 404,
  NOT_CONFIGURED: 409,
  AUTH: 409,
  CONSENT_EXPIRED: 409,
  NOT_APPROVED: 409,
  BUSY: 409,
  RATE_LIMITED: 429,
  POLICY: 500,
  NETWORK: 502,
  BAD_RESPONSE: 502,
});

/**
 * A typed, page-safe error. The message is plain English and never repeats
 * input, tokens, ids or URLs; the router sends {error, code}.
 */
export class FinError extends Error {
  constructor(code, message, extra = {}) {
    super(message || code);
    this.code = Object.hasOwn(FIN_CODES, code) ? code : 'BAD_RESPONSE';
    this.status = extra.status || FIN_CODES[this.code] || 500;
    if (extra.retryAfter) this.retryAfter = extra.retryAfter;
  }
  toJSON() { return { error: this.message, code: this.code }; }
}
export const finError = (code, message, extra) => new FinError(code, message, extra);

/** Codes that mean "the user has to sign in / approve again" (source health 'auth'). */
export const AUTH_CODES = Object.freeze(['AUTH', 'CONSENT_EXPIRED', 'NOT_APPROVED', 'NOT_CONFIGURED']);

export const PROVIDER_IDS = Object.freeze(['monzo', 'plasma', 'enable-banking']);
const REQUIRED = ['status', 'fetch', 'normalise', 'disconnect'];

/** Check a provider object against the contract. Throws on anything missing or not read-only. */
export function defineProvider(p) {
  if (!p || typeof p !== 'object') throw new Error('provider must be an object');
  if (!PROVIDER_IDS.includes(p.id)) throw new Error(`unknown provider id ${String(p.id).slice(0, 30)}`);
  if (p.readOnly !== true) throw new Error(`${p.id}: providers must be read-only`);
  if (!Array.isArray(p.allow) || !p.allow.length) throw new Error(`${p.id}: an allowlist is required`);
  for (const k of REQUIRED) if (typeof p[k] !== 'function') throw new Error(`${p.id}: ${k}() is required`);
  return Object.freeze(p);
}
