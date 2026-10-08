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
    let r;
    try {
      r = await fetchFn(String(url), { method: m, headers, body, redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.min(timeoutMs, opts.timeoutMs || timeoutMs))) });
    } catch (e) {
      if (e instanceof FinError) throw e;
      log('warn', `fin-connect ${provider} network ${Date.now() - t0}ms`);
      throw new FinError('NETWORK', `${opts.label || 'The provider'} could not be reached. Check your connection and try again.`);
    }
    const len = Number(r.headers && typeof r.headers.get === 'function' ? r.headers.get('content-length') : 0);
    if (len > MAX_BYTES) throw new FinError('BAD_RESPONSE', 'The provider sent too much data at once.');
    let text;
    try { text = await r.text(); } catch { throw new FinError('NETWORK', `${opts.label || 'The provider'} stopped answering. Try again.`); }
    if (text.length > MAX_BYTES) throw new FinError('BAD_RESPONSE', 'The provider sent too much data at once.');
    let json = {};
    if (text.trim()) {
      try { json = JSON.parse(text); } catch { throw new FinError('BAD_RESPONSE', 'The provider sent an answer OpenDash could not read.'); }
    }
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json, headers: r.headers || null, ms: Date.now() - t0 };
  }

  return { request, check, rules };
}
