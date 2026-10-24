// lib/relay/origin.mjs - THE relay origin check (docs/dev/RELAY_PROTOCOL.md
// section 12). Every relay client and every place that keeps a relay address
// uses this one function: lib/friends/core.mjs (cards, invites, records, so
// lib/friends/relay-client.mjs and the friends store), lib/sync/relay-client.mjs
// (device sync and join links), lib/sync/relay-node.mjs and lib/relay/deploy.mjs
// (Settings > Your relay).
//
//   relayOrigin(value)        -> the normalised origin, or null
//   relayLocalAllowed()       -> is OPENDASH_RELAY_ALLOW_LOCAL=1 set for this process?
//   isLocalRelayOrigin(o)     -> is o (an answer of relayOrigin) a local relay?
//
// Accepted: a PUBLIC https origin, https://<name>[:port], where <name> is a
// DNS name (not an IP literal in any form, short, hex, octal or decimal, and
// not a name whose last label is a number; not localhost / .local / .internal / .lan /
// .home.arpa): no path, query, fragment or user info.
// A local relay for development and self-hosting on this computer,
// http://127.0.0.1:<port> or http://localhost:<port>, is accepted ONLY when
// the environment variable OPENDASH_RELAY_ALLOW_LOCAL=1 is set for the
// OpenDash process. Never from data (a synced file, a friend's card or
// invite, a join link) or the page: nothing but the environment turns it on,
// so a friend can never point this computer at its own network.
//
// The Node relay clients also refuse a name that RESOLVES to a private
// address (lib/friends/relay-client.mjs checks inside the socket's own DNS
// lookup; lib/relay/deploy.mjs and lib/sync/relay-node.mjs look the name up
// before use).
//
// PURE: no node: imports (the platform-agnostic sync relay client uses it).

const HTTPS_RE = /^https:\/\/([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+)(:(\d{1,5}))?$/;
const LOCAL_RE = /^http:\/\/(127\.0\.0\.1|localhost):(\d{1,5})$/;
const NOT_PUBLIC_NAME_RE = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|private|home\.arpa)$/;
// An IP literal in ANY form a URL parser or a resolver takes: 127.0.0.1, and also the short, hex,
// octal and decimal forms (127.1, 10.1.1, 0x7f.1, 0177.0.0.1, 192.168.1). A label of digits only,
// or 0x and hex digits, is a number to them, and a host whose LAST label is a number is read as
// IPv4 (the WHATWG URL rule), so such a host is never a public name. Public TLDs are letters.
const NUM_LABEL_RE = /^(\d+|0x[0-9a-f]*)$/;
const isIpLike = (host) => { const l = host.split('.'); return NUM_LABEL_RE.test(l[l.length - 1]) || l.every(x => NUM_LABEL_RE.test(x)); };
const portOk = (p) => p == null || (Number(p) >= 1 && Number(p) <= 65535);

/** Is OPENDASH_RELAY_ALLOW_LOCAL=1 set in this process's environment? (false in a browser) */
export function relayLocalAllowed() {
  const p = globalThis.process;
  return !!(p && p.env && p.env.OPENDASH_RELAY_ALLOW_LOCAL === '1');
}

/** A relay origin we may talk to, normalised (lower case, no trailing slash, no default port), or null. */
export function relayOrigin(value) {
  const s = String(value == null ? '' : value).trim().toLowerCase().replace(/\/+$/, '');
  if (!s || s.length > 200) return null;
  const m = HTTPS_RE.exec(s);
  if (m) {
    const host = m[1];
    if (!portOk(m[6]) || isIpLike(host) || NOT_PUBLIC_NAME_RE.test(host)) return null;
    return m[6] === '443' ? `https://${host}` : s;
  }
  const l = LOCAL_RE.exec(s);
  if (l && portOk(l[2]) && relayLocalAllowed()) return s;
  return null;
}

/** A local relay origin (only ever an answer of relayOrigin with OPENDASH_RELAY_ALLOW_LOCAL=1). */
export function isLocalRelayOrigin(o) { return LOCAL_RE.test(String(o || '')) && relayLocalAllowed(); }
