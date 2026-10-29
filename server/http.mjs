// server/http.mjs - small HTTP helpers shared by every route.
//
//   send / json            responses with the standard security headers
//   readBody / readJsonBody   request bodies with a size limit (413)
//   hostAllowed            DNS-rebinding guard (421)
//   sameOrigin             CSRF guard for mutating routes (403)
//   HttpError              throw new HttpError(400, 'why') from a handler
//   esc                    HTML-escape for the few server-rendered pages
//   injectConfig           put the public config into index.html
//   cspFor / inlineScriptHashes   the CSP, with the page's inline scripts by hash

import { createHash } from 'node:crypto';

export const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
});

export const DEFAULT_MAX_BODY = 64 * 1024 * 1024;   // state is ~1 MB; this is slack
export const SMALL_BODY = 64 * 1024;                // settings, finance edits, AI prompts are capped separately

// Everything runs on the user's machine; nothing may embed it, and the page may
// only talk to this server. Inline scripts run only when their sha256 is in the
// header (cspFor hashes the page's own script blocks), so markup that slips into
// the page can never run script: no 'unsafe-inline', no on*= handlers, no
// javascript: URLs. Styles stay inline (the single-file app is built that way).
// Remote pictures: Gravatar (opt-in per person) and bank logos from Enable
// Banking; any other host is refused and the avatar falls back to initials.
const CSP_PARTS = [
  "default-src 'self'",
  null,   // script-src, per page
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://gravatar.com https://*.gravatar.com https://enablebanking.com https://*.enablebanking.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
];
const JS_TYPES = /^(|module|(text|application)\/(x-)?(java|ecma)script)$/i;
/** The sha256 sources of every inline script a browser would run in this HTML. */
export function inlineScriptHashes(html) {
  const out = new Set();
  for (const m of String(html || '').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const t = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(m[1]);
    if (!JS_TYPES.test(t ? t[1].trim() : '') || /\bsrc\s*=/i.test(m[1])) continue;
    // The HTML parser turns CR LF and lone CR into LF before the browser hashes the text.
    const body = m[2].replace(/\r\n?/g, '\n');
    out.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return [...out];
}
let _cspMemo = { key: null, value: '' };
/** The Content-Security-Policy for a response body (HTML gets its own inline-script hashes). */
export function cspFor(html) {
  if (!html) return CSP;
  // index.html is several MB: reuse the last result while the page is the same (the config is a JSON block, never run).
  const key = String(html).replace(/<script id="dashboard-config" type="application\/json">[\s\S]*?<\/script>/, '');
  if (_cspMemo.key === key) return _cspMemo.value;
  const hashes = inlineScriptHashes(key);
  const value = CSP_PARTS.map(p => p ?? ["script-src 'self'", ...hashes].join(' ')).join('; ');
  _cspMemo = { key, value };
  return value;
}
const CSP = CSP_PARTS.map(p => p ?? "script-src 'self'").join('; ');

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    if (extra) Object.assign(this, extra);
  }
}

export function send(res, code, body, type = 'text/plain; charset=utf-8', headers = {}) {
  if (res.headersSent) { try { res.end(); } catch {} return; }
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': typeof body === 'string' && /^text\/html/i.test(type) && /<script/i.test(body) ? cspFor(body) : CSP,
    ...headers,
  });
  res.end(body);
}

export const json = (res, code, obj, headers) => send(res, code, JSON.stringify(obj, null, 1), MIME['.json'], headers);

export async function readBody(req, max = DEFAULT_MAX_BODY) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > max) throw new HttpError(413, 'body too large');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new HttpError(413, 'body too large');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Parse a JSON object body. allowEmpty: '' -> {}. */
export async function readJsonBody(req, { max = SMALL_BODY, allowEmpty = false } = {}) {
  const text = await readBody(req, max);
  if (!text.trim() && allowEmpty) return {};
  let body;
  try { body = JSON.parse(text); } catch { throw new HttpError(400, 'body must be JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'body must be a JSON object');
  return body;
}

/** DNS-rebinding guard: only answer to our own host names. */
export function hostAllowed(req, port) {
  const host = String(req.headers.host || '').toLowerCase();
  return host === `localhost:${port}` || host === `127.0.0.1:${port}`;
}

/**
 * CSRF guard. Browsers always send Origin on cross-site POST/PUT/DELETE and
 * Sec-Fetch-Site on modern requests; accept only our own origin.
 */
export function sameOrigin(req, port) {
  const origin = req.headers.origin;
  if (origin && origin !== `http://localhost:${port}` && origin !== `http://127.0.0.1:${port}`) return false;
  const sfs = req.headers['sec-fetch-site'];
  if (sfs && sfs !== 'same-origin' && sfs !== 'none') return false;
  return true;
}

export function isJsonRequest(req) {
  return /^application\/json\b/i.test(String(req.headers['content-type'] || ''));
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

// Must match CONFIG_TAG in build.mjs byte for byte (tests/build.test.mjs).
export const CONFIG_TAG = '<script id="dashboard-config" type="application/json">{}</script>';

/** Replace the empty config tag in index.html with the public config. */
export function injectConfig(html, cfg) {
  // Line/paragraph separators are legal in JSON but break older JS parsers;
  // the patterns are built from char codes so this file stays plain ASCII.
  const data = JSON.stringify(cfg || {}).replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
  return html.replace(CONFIG_TAG, () => CONFIG_TAG.replace('{}', data));
}
