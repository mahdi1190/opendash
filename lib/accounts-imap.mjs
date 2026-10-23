// lib/accounts-imap.mjs - the Node side of "+ Other email" (the 'imap'
// provider, lib/accounts/imap.mjs): the TLS transport and the address lookup
// with an MX check for people's own domains.
//
//   imapProviderConfig(overrides) -> providerConfig.imap for createAccounts
//   lookupWithMx(email, {resolveMx, timeoutMs}) -> lookupProvider(email), or what
//       the domain's MX records say (Google Workspace / Microsoft 365 go to their
//       one-click buttons; Fastmail, iCloud, Zoho... on your own domain are known)
//
// Node stdlib only. The app password never passes through here: it goes from
// the route to the provider, which saves it in the secret store.

import { promises as dns } from 'node:dns';
import { nodeImapTransport } from './imap-transport.mjs';
import { lookupProvider, providerFromMx } from './accounts/imap-providers.mjs';

/** The domain's MX host names, or [] (no answer within timeoutMs, or none). */
export async function mxHosts(domain, { resolveMx = dns.resolveMx, timeoutMs = 3000 } = {}) {
  let t;
  try {
    const got = await Promise.race([resolveMx(domain), new Promise((resolve) => { t = setTimeout(() => resolve([]), timeoutMs); })]);
    return (Array.isArray(got) ? got : []).sort((a, b) => (a.priority || 0) - (b.priority || 0)).map((r) => String(r.exchange || '')).filter(Boolean).slice(0, 10);
  } catch { return []; }
  finally { clearTimeout(t); }
}

/** lookupProvider, plus the MX records when the address is not a known service. */
export async function lookupWithMx(email, opts = {}) {
  const one = opts.oneClick ? { oneClick: opts.oneClick } : {};
  const info = lookupProvider(email, one);
  if (info.kind !== 'other' || opts.mx === false) return info;
  const viaMx = providerFromMx(info.email, await mxHosts(info.domain, opts), one);
  return viaMx || info;
}

/** providerConfig.imap for the accounts core (tests pass openTransport / allowInsecure / timeouts). */
export function imapProviderConfig(overrides = {}) {
  const { resolveMx, mx, ...rest } = overrides;
  return {
    openTransport: nodeImapTransport(),
    timeoutMs: 20000, sessionMs: 120000,
    lookup: (email, o = {}) => lookupWithMx(email, { ...(resolveMx ? { resolveMx } : {}), ...(mx === false ? { mx: false } : {}), ...(o.oneClick ? { oneClick: o.oneClick } : {}) }),
    ...rest,
  };
}
