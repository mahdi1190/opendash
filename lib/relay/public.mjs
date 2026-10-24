// lib/relay/public.mjs - does a relay origin's name point at the public
// internet? (docs/dev/RELAY_PROTOCOL.md section 12). Node only.
//
// lib/relay/origin.mjs already refuses IP literals and local names; a relay
// address can still come from a friend (an invite) and name a host that
// RESOLVES inside this network. Before the server talks to such a relay it
// looks the name up: any private, loopback, link-local or otherwise
// non-global address and it is refused. A local relay origin (only with
// OPENDASH_RELAY_ALLOW_LOCAL=1) is this computer by definition and is not
// looked up. lib/friends/relay-client.mjs does the same check inside every
// socket's own DNS lookup.
//
//   publicRelay(origin, {cacheMs}) -> 'public' | 'local' | 'private' | 'unknown' (no answer: offline)

import { promises as dns } from 'node:dns';
import { classifyAddress } from '../sync/live/addrbook.mjs';
import { relayOrigin, isLocalRelayOrigin } from './origin.mjs';

const cache = new Map();     // origin -> {at, v}

export async function publicRelay(origin, { cacheMs = 10 * 60000 } = {}) {
  const o = relayOrigin(origin);
  if (!o) return 'private';
  if (isLocalRelayOrigin(o)) return 'local';
  const c = cache.get(o);
  if (c && Date.now() - c.at < cacheMs) return c.v;
  let v = 'unknown';
  try {
    const list = await dns.lookup(new URL(o).hostname, { all: true, verbatim: true });
    v = list.length && list.every(a => classifyAddress(a.address) === 'global') ? 'public' : 'private';
  } catch { v = 'unknown'; }
  if (v !== 'unknown') { cache.set(o, { at: Date.now(), v }); if (cache.size > 64) cache.delete(cache.keys().next().value); }
  return v;
}
