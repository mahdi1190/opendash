// tools/release-offline.mjs - make a Node process behave as if this machine had
// no network, to check that tests skip cleanly offline. Loaded with --import:
//
//   NODE_OPTIONS=--import=<file URL of this file> node --test tests/*.test.mjs
//   node tools/release-package.mjs ... --offline      (does this for you)
//
// Connections to this machine (localhost, 127.x, ::1, Unix sockets, Windows
// pipes) work as usual: the tests start their own servers. Anything else fails
// the way it does with the cable unplugged: a socket error ENETUNREACH (so
// fetch() rejects with "fetch failed"), and DNS lookups of other names fail
// with ENOTFOUND. Child processes inherit it through NODE_OPTIONS.
//
// Zero dependencies, Node >= 20. Never used by the app itself.

import net from 'node:net';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '::', '::ffff:127.0.0.1']);
export const isLocalHost = (h) => {
  if (h == null || h === '') return true;
  const s = String(h).toLowerCase().replace(/^\[|\]$/g, '');
  return LOCAL.has(s) || /^127\./.test(s) || /\.localhost$/.test(s);
};
const offline = (host, code, syscall) => Object.assign(new Error(`${syscall} ${code} ${host} (network disabled by tools/release-offline.mjs)`), { code, errno: code, syscall, hostname: host });

const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(...args) {
  let o = args[0];
  if (Array.isArray(o)) o = o[0];                      // node's internal normalised form
  let host, path;
  if (o && typeof o === 'object') { host = o.host ?? o.hostname; path = o.path; }
  else if (typeof o === 'string' && !/^\d+$/.test(o)) path = o;
  else host = typeof args[1] === 'string' ? args[1] : 'localhost';
  if (!path && !isLocalHost(host ?? 'localhost')) {
    const err = offline(host, 'ENETUNREACH', 'connect');
    process.nextTick(() => this.destroy(err));
    return this;
  }
  return origConnect.apply(this, args);
};

const origLookup = dns.lookup;
dns.lookup = function lookup(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  if (!isLocalHost(hostname)) { process.nextTick(() => cb(offline(hostname, 'ENOTFOUND', 'getaddrinfo'))); return {}; }
  return origLookup.call(this, hostname, options, callback);
};
const origPLookup = dns.promises.lookup;
dns.promises.lookup = async function lookup(hostname, options) {
  if (!isLocalHost(hostname)) throw offline(hostname, 'ENOTFOUND', 'getaddrinfo');
  return origPLookup.call(this, hostname, options);
};
for (const name of ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveMx', 'resolveTxt', 'resolveSrv', 'resolveCname', 'resolveNs']) {
  const orig = dns[name];
  if (typeof orig !== 'function') continue;
  dns[name] = function (hostname, ...rest) {
    const cb = rest[rest.length - 1];
    if (!isLocalHost(hostname) && typeof cb === 'function') { process.nextTick(() => cb(offline(hostname, 'ENOTFOUND', 'query'))); return; }
    return orig.call(this, hostname, ...rest);
  };
}
syncBuiltinESMExports();
