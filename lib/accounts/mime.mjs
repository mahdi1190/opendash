// lib/accounts/mime.mjs - just enough MIME to show a short, plain preview of
// an email read over IMAP (lib/accounts/imap.mjs): transfer encodings
// (quoted-printable, base64), charsets, RFC 2047 encoded words in headers,
// multipart walking, the IMAP BODYSTRUCTURE (choose the text part) and a
// rough HTML-to-text.
//
// PURE JS: no node: imports (docs/dev/ACCOUNTS.md section 1). Text decoding is
// TextDecoder where the runtime has the charset, with built-in fallbacks for
// us-ascii, iso-8859-1 and windows-1252 so every runtime agrees on those.
//
// Never decodes attachments: only text/plain and text/html parts, and only the
// first few kilobytes of them (a preview, not the message).

import { cleanText } from './core.mjs';

const isBytes = (v) => v instanceof Uint8Array;
/** Bytes from a string (each char code & 0xff: a "binary string") or bytes. */
export function toBytes(v) {
  if (isBytes(v)) return v;
  const s = String(v == null ? '' : v);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
/** A "binary string" (one char per byte) from bytes: safe for header and boundary scanning. */
export function binaryString(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return s;
}

// ─── Charsets ───────────────────────────────────────────────────────────
// windows-1252 0x80-0x9f (undefined bytes stay as their latin-1 code points).
const CP1252 = [0x20ac, 0x81, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8d, 0x017d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x9d, 0x017e, 0x0178];
function singleByte(bytes, table) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b >= 0x80 && b <= 0x9f && table ? table[b - 0x80] : b);
  return s;
}
const ALIASES = {
  'utf8': 'utf-8', 'utf-8': 'utf-8', 'unicode-1-1-utf-8': 'utf-8',
  'us-ascii': 'ascii', 'ascii': 'ascii', 'ansi_x3.4-1968': 'ascii', 'iso646-us': 'ascii',
  'iso-8859-1': 'latin1', 'iso8859-1': 'latin1', 'iso_8859-1': 'latin1', 'latin1': 'latin1', 'l1': 'latin1', 'latin-1': 'latin1',
  'windows-1252': 'cp1252', 'cp1252': 'cp1252', 'x-cp1252': 'cp1252',
};
/** Decode bytes in a named charset. Unknown charsets read as UTF-8 (with replacement characters). */
export function decodeCharset(bytes, charset = 'utf-8') {
  const b = toBytes(bytes);
  const label = String(charset || 'utf-8').trim().toLowerCase().replace(/^["']|["']$/g, '');
  const alias = ALIASES[label];
  if (alias === 'ascii' || alias === 'latin1') {
    // Mislabelled UTF-8 is common ("us-ascii" with 8-bit text): prefer it when it is valid.
    const u = tryUtf8(b);
    if (u != null && /[\u0080-￿]/.test(u)) return u;
    return alias === 'latin1' ? singleByte(b, CP1252) : singleByte(b, null);
  }
  if (alias === 'cp1252') return singleByte(b, CP1252);
  if (alias === 'utf-8' || !label) return new TextDecoder('utf-8').decode(b);
  try { return new TextDecoder(label).decode(b); } catch { return new TextDecoder('utf-8').decode(b); }
}
function tryUtf8(b) { try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch { return null; } }

// ─── Transfer encodings ─────────────────────────────────────────────────
/** Quoted-printable (RFC 2045 6.7) to bytes; tolerant of a cut-off end. */
export function decodeQuotedPrintable(input) {
  const s = binaryString(toBytes(input));
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c !== 61) { out.push(c); continue; }                    // '='
    const a = s[i + 1], b = s[i + 2];
    if (a === '\r' && b === '\n') { i += 2; continue; }         // soft line break
    if (a === '\n') { i += 1; continue; }
    if (a === undefined || (b === undefined && /[0-9A-Fa-f]/.test(a))) break; // cut off mid-escape (partial fetch)
    if (/[0-9A-Fa-f]/.test(a) && /[0-9A-Fa-f]/.test(b)) { out.push(parseInt(a + b, 16)); i += 2; continue; }
    // A soft break with trailing white space before the line end.
    const m = /^[ \t]+\r?\n/.exec(s.slice(i + 1, i + 80));
    if (m) { i += m[0].length; continue; }
    out.push(c);
  }
  return Uint8Array.from(out);
}
const B64 = /[^A-Za-z0-9+/=]/g;
/** Base64 to bytes; ignores line breaks and junk; a cut-off end (partial fetch) gives the bytes it fully holds. */
export function decodeBase64(input) {
  let s = binaryString(toBytes(input)).replace(B64, '');
  const pad = s.indexOf('=');
  if (pad >= 0) s = s.slice(0, pad);
  const rem = s.length % 4;
  if (rem === 1) s = s.slice(0, -1);
  else if (rem) s += '='.repeat(4 - rem);
  if (!s) return new Uint8Array(0);
  let bin;
  try { bin = atob(s); } catch { return new Uint8Array(0); }
  return toBytes(bin);
}
/** Undo a Content-Transfer-Encoding. 7bit, 8bit, binary and unknown values pass through. */
export function decodeTransfer(bytes, encoding) {
  const e = String(encoding || '').trim().toLowerCase();
  if (e === 'base64') return decodeBase64(bytes);
  if (e === 'quoted-printable') return decodeQuotedPrintable(bytes);
  return toBytes(bytes);
}

// ─── Headers ────────────────────────────────────────────────────────────
const WORD = /=\?([^?\s*]+)(?:\*[^?\s]*)?\?([bBqQ])\?([^?\s]*)\?=/g;
/** RFC 2047 encoded words ("=?UTF-8?B?...?=") in a header value; white space between two words is dropped. */
export function decodeWords(value) {
  const s = String(value == null ? '' : value);
  if (!s.includes('=?')) return s;
  // Join adjacent encoded words of one charset first: a multi-byte character may be split across them.
  const parts = [];
  let last = 0, m;
  WORD.lastIndex = 0;
  while ((m = WORD.exec(s))) {
    const gap = s.slice(last, m.index);
    const prev = parts[parts.length - 1];
    if (prev && prev.word && /^[ \t\r\n]*$/.test(gap) && prev.charset === m[1].toLowerCase()) {
      prev.bytes = concat(prev.bytes, wordBytes(m[2], m[3]));
    } else {
      if (gap) parts.push({ text: gap });
      parts.push({ word: true, charset: m[1].toLowerCase(), bytes: wordBytes(m[2], m[3]) });
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts.map((p) => (p.word ? decodeCharset(p.bytes, p.charset) : p.text)).join('');
}
function wordBytes(kind, text) {
  if (kind === 'B' || kind === 'b') return decodeBase64(text);
  return decodeQuotedPrintable(text.replace(/_/g, ' '));
}
function concat(a, b) { const out = new Uint8Array(a.length + b.length); out.set(a, 0); out.set(b, a.length); return out; }

/** Header block (a binary string or bytes) to a Map of lower-case name -> unfolded value (first one wins). */
export function parseHeaders(block) {
  const s = typeof block === 'string' ? block : binaryString(toBytes(block));
  const map = new Map();
  const unfolded = s.replace(/\r?\n[ \t]+/g, ' ');
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    const name = line.slice(0, i).trim().toLowerCase();
    if (!/^[!-9;-~]+$/.test(name) || map.has(name)) continue;
    map.set(name, line.slice(i + 1).trim());
  }
  return map;
}
/** A Content-Type value to {type, subtype, params} (lower-case type and parameter names). */
export function parseContentType(value) {
  const s = String(value || '');
  const m = /^\s*([A-Za-z0-9!#$&^_.+-]+)\s*\/\s*([A-Za-z0-9!#$&^_.+-]+)/.exec(s);
  const params = {};
  for (const p of s.matchAll(/;\s*([A-Za-z0-9!#$&^_.+*-]+)\s*=\s*("((?:[^"\\]|\\.)*)"|[^;\s]+)/g)) {
    const name = p[1].toLowerCase().replace(/\*$/, '');
    let v = p[3] != null ? p[3].replace(/\\(.)/g, '$1') : p[2];
    // RFC 2231 charset''value (only the simple, unsplit form).
    if (p[1].endsWith('*')) {
      const q = /^([^']*)'[^']*'(.*)$/.exec(v);
      if (q) v = decodeCharset(toBytes(q[2].replace(/%([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))), q[1] || 'utf-8');
    }
    if (!(name in params)) params[name] = v;
  }
  return { type: m ? m[1].toLowerCase() : 'text', subtype: m ? m[2].toLowerCase() : 'plain', params };
}

// ─── HTML and text ──────────────────────────────────────────────────────
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•', euro: '€', pound: '£', zwnj: '', zwj: '' };
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});?/gi, (all, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    }
    const v = ENTITIES[e.toLowerCase()];
    return v != null ? v : all;
  });
}
/** Visible text of an HTML fragment (scripts, styles, head and comments removed). Rough on purpose. */
export function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<(script|style|head|title|template|svg)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
    .replace(/<(br|p|div|tr|li|h[1-6]|table|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*(?:>|$)/g, ' '));
}
/** Preview text: quoted reply lines and signatures' dashes dropped, white space collapsed. */
export function previewText(text, max = 300) {
  const lines = String(text || '').split(/\r?\n/);
  const keep = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue;                                   // quoted reply
    if (/^-- ?$/.test(line)) break;                                      // signature
    if (/^\s*On .{4,200} wrote:\s*$/.test(line)) break;                  // reply header
    keep.push(line);
  }
  return cleanText(keep.join(' ').replace(/�+$/, ''), max);   // a multi-byte character cut by a partial fetch
}

// ─── A part's bytes to text ─────────────────────────────────────────────
/** One leaf part (already cut out) to plain text. */
export function partText(bytes, { type = 'text', subtype = 'plain', charset = 'utf-8', encoding = '7bit' } = {}) {
  if (type !== 'text') return '';
  const raw = decodeCharset(decodeTransfer(bytes, encoding), charset);
  return subtype === 'html' ? htmlToText(raw) : raw;
}

/**
 * Walk a raw MIME entity (headers + body, or a body with the headers given
 * separately) and return the preview text of its best text part: text/plain
 * first, else text/html. Handles nested multiparts and a body cut off part
 * way (an IMAP partial fetch). Attachments are never decoded.
 *   previewFromEntity(bodyBytes, { headers: Map|string })   body only (BODY[TEXT])
 *   previewFromEntity(wholeBytes)                           headers then body
 */
export function previewFromEntity(input, { headers, max = 300, depth = 0 } = {}) {
  const s = binaryString(toBytes(input));
  let head, body;
  if (headers != null) { head = headers instanceof Map ? headers : parseHeaders(headers); body = s; }
  else {
    const m = /\r?\n\r?\n/.exec(s);
    head = parseHeaders(m ? s.slice(0, m.index) : s);
    body = m ? s.slice(m.index + m[0].length) : '';
  }
  const ct = parseContentType(head.get('content-type') || 'text/plain; charset=us-ascii');
  const encoding = head.get('content-transfer-encoding') || '7bit';
  const disp = String(head.get('content-disposition') || '').toLowerCase();
  if (ct.type === 'multipart' && depth < 6) {
    const parts = splitMultipart(body, ct.params.boundary);
    const found = [];
    for (const p of parts) {
      const t = previewFromEntityParts(p, depth + 1, max);
      if (t) found.push(t);
    }
    const plain = found.find((f) => f.subtype === 'plain' && f.text);
    const html = found.find((f) => f.subtype === 'html' && f.text);
    return ((plain || html || found.find((f) => f.text)) || { text: '' }).text;
  }
  if (ct.type !== 'text' || disp.startsWith('attachment')) return '';
  return previewText(partText(toBytes(body), { type: ct.type, subtype: ct.subtype, charset: ct.params.charset, encoding }), max);
}
function previewFromEntityParts(raw, depth, max) {
  const m = /\r?\n\r?\n/.exec(raw);
  const head = parseHeaders(m ? raw.slice(0, m.index) : raw);
  const body = m ? raw.slice(m.index + m[0].length) : '';
  const ct = parseContentType(head.get('content-type') || 'text/plain; charset=us-ascii');
  if (ct.type === 'multipart') return { subtype: 'mixed', text: previewFromEntity(body, { headers: head, max, depth }) };
  const disp = String(head.get('content-disposition') || '').toLowerCase();
  if (ct.type !== 'text' || disp.startsWith('attachment')) return null;
  return { subtype: ct.subtype, text: previewText(partText(toBytes(body), { type: ct.type, subtype: ct.subtype, charset: ct.params.charset, encoding: head.get('content-transfer-encoding') }), max) };
}
/** The parts of a multipart body (binary string) by boundary; a cut-off last part is kept. */
export function splitMultipart(body, boundary) {
  if (!boundary || boundary.length > 200) return [];
  const delim = '--' + boundary;
  const out = [];
  let i = body.indexOf(delim);
  while (i >= 0 && out.length < 50) {
    let start = i + delim.length;
    if (body.startsWith('--', start)) break;                       // close delimiter
    const eol = body.indexOf('\n', start);
    if (eol < 0) break;
    start = eol + 1;
    const next = body.indexOf('\n' + delim, start);
    const end = next < 0 ? body.length : (body[next - 1] === '\r' ? next - 1 : next);
    out.push(body.slice(start, end));
    i = next < 0 ? -1 : next + 1;
  }
  return out;
}

// ─── IMAP BODYSTRUCTURE ─────────────────────────────────────────────────
// The parsed IMAP list (lib/accounts/imap-wire.mjs values: strings, numbers as
// strings, null for NIL, arrays for lists, Uint8Array for literals).
const str = (v) => (v == null ? '' : isBytes(v) ? binaryString(v) : String(v));
function paramList(v) {
  const out = {};
  if (!Array.isArray(v)) return out;
  for (let i = 0; i + 1 < v.length; i += 2) out[str(v[i]).toLowerCase()] = decodeWords(str(v[i + 1]));
  return out;
}
/**
 * The leaf parts of a BODYSTRUCTURE: [{part: '1.2', type, subtype, params, encoding, size, disposition}].
 * A single-part message is part '1' (RFC 3501 6.4.5: BODY[1] of a non-multipart message is its body).
 */
export function bodyParts(node, prefix = '', out = [], depth = 0) {
  if (!Array.isArray(node) || depth > 8 || out.length > 100) return out;
  if (Array.isArray(node[0])) {
    // multipart: (part)(part)... "subtype" ...
    let n = 0;
    for (const child of node) {
      if (!Array.isArray(child)) break;
      n++;
      bodyParts(child, prefix ? `${prefix}.${n}` : String(n), out, depth + 1);
    }
    return out;
  }
  const type = str(node[0]).toLowerCase(), subtype = str(node[1]).toLowerCase();
  const params = paramList(node[2]);
  const encoding = str(node[5]).toLowerCase() || '7bit';
  const size = Number(str(node[6])) || 0;
  // Extension data: text parts have lines at [7], then md5 [8], disposition [9]; message/rfc822 has more.
  const dispAt = type === 'text' ? 9 : type === 'message' && subtype === 'rfc822' ? 11 : 8;
  const disp = Array.isArray(node[dispAt]) ? str(node[dispAt][0]).toLowerCase() : '';
  out.push({ part: prefix || '1', type, subtype, params, encoding, size, disposition: disp });
  return out;
}
/** The part to preview: the first inline text/plain, else the first inline text/html. null when none. */
export function pickTextPart(structure) {
  const parts = bodyParts(structure);
  const inline = parts.filter((p) => p.type === 'text' && p.disposition !== 'attachment' && !p.params.name);
  const pick = inline.find((p) => p.subtype === 'plain') || inline.find((p) => p.subtype === 'html') || null;
  return pick ? { part: pick.part, subtype: pick.subtype, charset: pick.params.charset || 'us-ascii', encoding: pick.encoding, size: pick.size } : null;
}
