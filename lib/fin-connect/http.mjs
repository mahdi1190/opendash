// lib/fin-connect/http.mjs - the ONLY way a finance provider talks to the
// network: an allowlist client. Read-only by construction (design 3.3).
//
//   readOnlyClient(allow, {provider, fetchFn, log, loopback}) -> {request, check}
//     request(method, url, {headers, form, json, timeoutMs}) -> {status, ok, json, headers}
//     check(method, url, body) -> the matching rule (throws POLICY otherwise)
//
// AllowRule = {method: 'GET'|'POST'|'DELETE', host: 'api.monzo.com',
//              path: '/accounts' | RegExp (whole path), test?(url, body) -> bool}
//
// Every request is checked BEFORE it is sent. Anything not on the list throws
// FinError('POLICY') and is logged as "fin-connect policy <provider> <method>"
// (no URL, no query, no body). https only (the in-process fakes keep the real
// URLs; `loopback: true` additionally allows http://127.0.0.1 for local fake
// servers in tests), no credentials in URLs, redirect:'error', 20 s timeout,
// 5 MB cap, JSON answers only.
//
// Non-2xx answers are returned (not thrown) so each provider maps its own
// error bodies; network failures throw NETWORK, unreadable bodies BAD_RESPONSE.

import { FinError } from './provider.mjs';

export const MAX_BYTES = 5 * 1024 * 1024;
export const TIMEOUT_MS = 20000;
const METHODS = new Set(['GET', 'POST', 'DELETE', 'PUT', 'PATCH']);

/**
 * Why a request never got an answer, in plain words, plus a short cause code
 * for the log (never the URL). e: what fetch threw.
 *   -> {cause: 'TIMEOUT'|'ENOTFOUND'|..., text: 'did not answer within 20 seconds'}
 */
export function networkReason(e, ms = TIMEOUT_MS) {
  const name = String((e && e.name) || '');
  const code = String((e && e.cause && (e.cause.code || e.cause.name)) || (e && e.code) || '').toUpperCase().slice(0, 40);
  const msg = String((e && (e.cause && e.cause.message || e.message)) || '');
  if (name === 'TimeoutError' || name === 'AbortError' || /TIMEOUT/.test(code)) return { cause: 'TIMEOUT', text: `did not answer within ${Math.round(ms / 1000)} seconds` };
  if (/ENOTFOUND|EAI_AGAIN/.test(code)) return { cause: code, text: 'could not be found: this computer looks offline, or its internet name lookup (DNS) is not working' };
  if (/ECONNREFUSED/.test(code)) return { cause: code, text: 'refused the connection' };
  if (/ECONNRESET|EPIPE|UND_ERR_SOCKET|UND_ERR_CLOSED/.test(code)) return { cause: code, text: 'dropped the connection part-way through' };
  if (/ENETUNREACH|EHOSTUNREACH|ENETDOWN/.test(code)) return { cause: code, text: 'is unreachable from this network' };
  if (/CERT|SSL|TLS|SELF_SIGNED/.test(code) || /certificate/i.test(msg)) return { cause: code || 'CERT', text: 'answered with a security certificate this computer does not trust (a firewall, VPN or antivirus may be in the way)' };
  if (/redirect/i.test(msg)) return { cause: 'REDIRECT', text: 'tried to send OpenDash to a different address, which it refuses for safety' };
  return { cause: code || name || 'FETCH', text: 'could not be reached' };
}

function pathMatches(rule, path) {
  if (rule.path instanceof RegExp) {
    const m = rule.path.exec(path);
    return !!m && m.index === 0 && m[0] === path;
  }
  return typeof rule.path === 'string' && rule.path === path;
}

/** The rule allowing this request, or null. Pure (tests call it directly). */
export function allowedBy(allow, method, url, body) {
  let u;
  try { u = url instanceof URL ? url : new URL(String(url)); } catch { return null; }
  const m = String(method || '').toUpperCase();
  if (!METHODS.has(m) || u.username || u.password || u.hash) return null;
  for (const rule of allow || []) {
    if (!rule || String(rule.method).toUpperCase() !== m) continue;
    if (u.hostname.toLowerCase() !== String(rule.host).toLowerCase()) continue;
    if (u.port && !(rule.port && String(rule.port) === u.port)) continue;
    if (!pathMatches(rule, u.pathname)) continue;
    if (typeof rule.test === 'function') {
      let ok = false;
      try { ok = rule.test(u, body) === true; } catch { ok = false; }
      if (!ok) continue;
    }
    return rule;
  }
  return null;
}

export function readOnlyClient(allow, { provider = 'provider', fetchFn = globalThis.fetch, log = () => {}, loopback = false, timeoutMs = TIMEOUT_MS } = {}) {
  const rules = Object.freeze([...(allow || [])]);

  function check(method, url, body) {
    let u = null;
    try { u = new URL(String(url)); } catch { u = null; }
    const proto = u && u.protocol;
    const local = loopback && u && proto === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
    const rule = u && (proto === 'https:' || local) ? allowedBy(rules, method, u, body) : null;
    if (!rule) {
      log('warn', `fin-connect policy ${provider} ${String(method || '?').toUpperCase().slice(0, 8)}`);
      throw new FinError('POLICY', 'OpenDash refused a request that is not on its read-only list.');
    }
    return rule;
  }

  async function request(method, url, opts = {}) {
    const m = String(method).toUpperCase();
    let body;
    const headers = { Accept: 'application/json', ...(opts.headers || {}) };
    if (opts.form) { body = new URLSearchParams(opts.form).toString(); headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
    else if (opts.json !== undefined) { body = JSON.stringify(opts.json); headers['Content-Type'] = 'application/json'; }
    check(m, url, opts.form || opts.json);
    const t0 = Date.now();
    const limit = Math.max(1, Math.min(timeoutMs, opts.timeoutMs || timeoutMs));
    const who = opts.label || 'The provider';
    let r;
    try {
      r = await fetchFn(String(url), { method: m, headers, body, redirect: 'error', signal: AbortSignal.timeout(limit) });
    } catch (e) {
      if (e instanceof FinError) throw e;
      // The cause code (TIMEOUT, ENOTFOUND, ECONNRESET...) is logged so a failure can be diagnosed; never the URL.
      const why = networkReason(e, limit);
      log('warn', `fin-connect ${provider} network ${why.cause} ${Date.now() - t0}ms`);
      throw Object.assign(new FinError('NETWORK', `${who} ${why.text}. Check this computer's internet connection, then try again.`), { cause: why.cause });
    }
    const len = Number(r.headers && typeof r.headers.get === 'function' ? r.headers.get('content-length') : 0);
    if (len > MAX_BYTES) throw new FinError('BAD_RESPONSE', `${who} sent too much data at once.`);
    let text;
    try { text = await r.text(); } catch (e) {
      const why = networkReason(e, limit);
      log('warn', `fin-connect ${provider} network ${why.cause} while reading (HTTP ${r.status}) ${Date.now() - t0}ms`);
      throw Object.assign(new FinError('NETWORK', `${who} stopped answering part-way through (${why.text}). Try again.`), { cause: why.cause });
    }
    if (text.length > MAX_BYTES) throw new FinError('BAD_RESPONSE', `${who} sent too much data at once.`);
    let json = {};
    if (text.trim()) {
      try { json = JSON.parse(text); } catch {
        // Usually an HTML error page from a proxy or the provider's outage page.
        log('warn', `fin-connect ${provider} unreadable answer (HTTP ${r.status}, ${/^\s*</.test(text) ? 'a web page' : 'not JSON'}) ${Date.now() - t0}ms`);
        throw new FinError('BAD_RESPONSE', r.status >= 500 ? `${who} is having a problem on its side (HTTP ${r.status}). Try again in a few minutes.` : `${who} sent an answer OpenDash could not read (HTTP ${r.status}). Try again in a few minutes.`);
      }
    }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json, headers: r.headers || null, ms: Date.now() - t0 };
  }

  return { request, check, rules };
}
