// lib/accounts/imap-wire.mjs - a small, read-only IMAP4rev1 client (RFC 3501)
// for "+ Other email" (lib/accounts/imap.mjs): framing with literals, the
// response parser, the few commands OpenDash needs, timeouts and size caps.
//
// PURE JS: no node: imports (docs/dev/ACCOUNTS.md section 1). The socket is a
// TRANSPORT ADAPTER passed in, so a phone or desktop app can bring its own:
//
//   openTransport({ host, port, tls: boolean }) -> Promise<Transport>
//   Transport = {
//     secure,                 true once TLS is up AND the certificate was verified
//     write(bytes),           Uint8Array out
//     onData(fn(bytes)),      bytes in (any chunking)
//     onClose(fn(err?)),      the connection ended (err: why, if known)
//     startTls(),             -> Promise: upgrade a plain connection in place (STARTTLS)
//     close(),
//   }
//   (lib/imap-transport.mjs is the Node one: node:tls with strict certificate checks.)
//
// Safety, enforced here whatever the caller asks for:
//   - READ ONLY. The only commands that can be sent are CAPABILITY, STARTTLS,
//     LOGIN, AUTHENTICATE, EXAMINE (never SELECT), UID SEARCH, UID FETCH, NOOP
//     and LOGOUT. FETCH items must use BODY.PEEK / BINARY.PEEK, never BODY[ or
//     RFC822 / RFC822.TEXT (they would mark mail as read). No STORE, COPY,
//     EXPUNGE, APPEND, no SMTP: OpenDash never sends or changes mail.
//   - No password over a connection that is not secure (allowInsecure exists
//     for the in-process test server only).
//   - STARTTLS: anything the server sent after its OK and before the TLS
//     handshake is refused (command injection), capabilities are asked again.
//   - Every response is framed with a byte cap per line, per literal, per
//     response and per session; a stalled server times out (idle and total).

export const DEFAULT_LIMITS = Object.freeze({
  maxLine: 1024 * 1024,          // one line without its literals
  maxLiteral: 4 * 1024 * 1024,   // one {n} literal
  maxResponse: 8 * 1024 * 1024,  // one response with its literals
  maxSession: 32 * 1024 * 1024,  // everything read in one session
});

/** A protocol-level failure. kind: NETWORK TIMEOUT TOO_BIG PROTOCOL NO BAD BYE INSECURE REFUSED TLS */
export class ImapError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.name = 'ImapError'; this.kind = kind; Object.assign(this, extra); }
}

const te = new TextEncoder();
const isBytes = (v) => v instanceof Uint8Array;
function utf8OrLatin1(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return s; }
}
/** A parsed value as text: strings stay, literals (bytes) are decoded, NIL is ''. */
export function text(v) { return v == null ? '' : isBytes(v) ? utf8OrLatin1(v) : String(v); }

// ─── Framing: bytes -> whole responses (with their literals) ────────────
/**
 * createResponseReader(limits).push(chunk) -> [Uint8Array] complete responses
 * (CRLF removed from the end). A line that ends in {n} (or {n+}, ~{n}) is
 * followed by n bytes of literal and continues after them.
 */
export function createResponseReader(limits = {}) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  let buf = new Uint8Array(4096), len = 0;
  let start = 0;        // start of the response being read
  let pos = 0;          // where to look for the next LF
  let lineStart = 0;    // start of the current line (after the last literal)
  let need = 0;         // > 0: a literal is being received; the line goes on at this offset
  let total = 0;
  const tooBig = (what) => new ImapError('TOO_BIG', `The mail server sent ${what}.`);
  function append(chunk) {
    if (len + chunk.length > buf.length && start > 0) {
      // Drop what was already handed out before growing.
      buf.copyWithin(0, start, len);
      len -= start; pos -= start; lineStart -= start; if (need) need -= start; start = 0;
    }
    if (len + chunk.length > buf.length) {
      let cap = buf.length;
      while (cap < len + chunk.length) cap *= 2;
      const next = new Uint8Array(cap); next.set(buf.subarray(0, len)); buf = next;
    }
    buf.set(chunk, len); len += chunk.length;
  }
  return {
    push(chunk) {
      const c = isBytes(chunk) ? chunk : te.encode(String(chunk));
      total += c.length;
      if (total > L.maxSession) throw tooBig('too much data');
      append(c);
      const out = [];
      for (;;) {
        if (need) {
          if (len < need) break;                 // the literal is still arriving
          pos = need; lineStart = need; need = 0;
        }
        let lf = pos < len ? buf.indexOf(10, pos) : -1;
        if (lf >= len) lf = -1;
        if (lf < 0) {
          if (len - lineStart > L.maxLine) throw tooBig('a line that is too long');
          if (len - start > L.maxResponse) throw tooBig('a response that is too big');
          pos = len;
          break;
        }
        if (lf - lineStart > L.maxLine) throw tooBig('a line that is too long');
        const end = lf > lineStart && buf[lf - 1] === 13 ? lf - 1 : lf;
        const n = literalAtEnd(buf, lineStart, end);
        if (n != null) {
          if (n > L.maxLiteral) throw tooBig('a message part that is too big');
          if (lf + 1 + n - start > L.maxResponse) throw tooBig('a response that is too big');
          need = lf + 1 + n;
          if (need === lf + 1) { pos = need; lineStart = need; need = 0; }   // {0}
          continue;
        }
        if (end - start > L.maxResponse) throw tooBig('a response that is too big');
        out.push(buf.slice(start, end));
        start = lf + 1; pos = start; lineStart = start;
      }
      if (start === len && !need) { start = 0; len = 0; pos = 0; lineStart = 0; }
      return out;
    },
    /** Bytes received but not yet part of a whole response (STARTTLS injection check). */
    get pending() { return len - start; },
  };
}
/** n when bytes [from, end) end with {n}, {n+}, {n-} or ~{n}; else null. */
function literalAtEnd(buf, from, end) {
  if (end - 1 < from || buf[end - 1] !== 125) return null;            // '}'
  let i = end - 2;
  if (i >= from && (buf[i] === 43 || buf[i] === 45)) i--;              // '+' / '-'
  let digits = '';
  while (i >= from && buf[i] >= 48 && buf[i] <= 57 && digits.length < 12) { digits = String.fromCharCode(buf[i]) + digits; i--; }
  if (!digits || i < from || buf[i] !== 123) return null;              // '{'
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

// ─── Parsing one response ───────────────────────────────────────────────
const SP = 32, LP = 40, RP = 41, DQ = 34, LB = 91, RB = 93, LC = 123, BSL = 92, CR = 13, LF = 10;
class Cursor {
  constructor(bytes) { this.b = bytes; this.i = 0; }
  get done() { return this.i >= this.b.length; }
  peek() { return this.b[this.i]; }
  sp() { while (this.b[this.i] === SP) this.i++; }
  fail(msg) { throw new ImapError('PROTOCOL', 'The mail server sent something OpenDash could not read.', { detail: msg }); }
  value(depth = 0) {
    this.sp();
    const c = this.peek();
    if (c === undefined) this.fail('unexpected end');
    if (c === LP) return this.list(depth);
    if (c === DQ) return this.quoted();
    if (c === LC || (c === 126 && this.b[this.i + 1] === LC)) return this.literal();
    const a = this.atom();
    if (!a) this.fail('empty value');
    return /^NIL$/i.test(a) ? null : a;
  }
  list(depth) {
    if (depth > 40) this.fail('nested too deep');
    this.i++;                                    // (
    const out = [];
    for (let n = 0; ; n++) {
      if (n > 100000) this.fail('list too long');
      this.sp();
      const c = this.peek();
      if (c === undefined) this.fail('unclosed list');
      if (c === RP) { this.i++; return out; }
      out.push(this.value(depth + 1));
    }
  }
  quoted() {
    this.i++;
    const bytes = [];
    for (;;) {
      const c = this.b[this.i++];
      if (c === undefined || c === CR || c === LF) this.fail('unclosed string');
      if (c === DQ) break;
      if (c === BSL) { const n = this.b[this.i++]; if (n === undefined) this.fail('bad escape'); bytes.push(n); continue; }
      bytes.push(c);
    }
    return utf8OrLatin1(Uint8Array.from(bytes));
  }
  literal() {
    if (this.peek() === 126) this.i++;           // ~ (literal8)
    const close = this.b.indexOf(125, this.i);
    if (close < 0) this.fail('bad literal');
    const m = /^\{(\d{1,12})[+-]?$/.exec(String.fromCharCode(...this.b.subarray(this.i, close)));
    if (!m) this.fail('bad literal');
    let j = close + 1;
    if (this.b[j] === CR) j++;
    if (this.b[j] !== LF) this.fail('bad literal');
    const n = Number(m[1]);
    if (j + 1 + n > this.b.length) this.fail('short literal');
    this.i = j + 1 + n;
    return this.b.slice(j + 1, j + 1 + n);
  }
  /** An atom; a [section] (with spaces and lists inside) and a <partial> are part of it (BODY[1.2]<0>). */
  atom() {
    let s = '';
    for (;;) {
      const c = this.peek();
      if (c === undefined || c === SP || c === LP || c === RP || c === DQ || c === CR || c === LF || c === LC) break;
      if (c === RB) break;
      if (c === LB) {
        const close = this.b.indexOf(RB, this.i);
        if (close < 0) this.fail('unclosed section');
        s += utf8OrLatin1(this.b.subarray(this.i, close + 1));
        this.i = close + 1;
        if (this.peek() === 60) {                // <origin>
          const gt = this.b.indexOf(62, this.i);
          if (gt < 0 || gt - this.i > 24) this.fail('bad partial');
          s += utf8OrLatin1(this.b.subarray(this.i, gt + 1)); this.i = gt + 1;
        }
        continue;
      }
      s += String.fromCharCode(c); this.i++;
      if (s.length > 4096) this.fail('atom too long');
    }
    return s;
  }
  rest() { const r = utf8OrLatin1(this.b.subarray(this.i)); this.i = this.b.length; return r; }
}

const STATUS = new Set(['OK', 'NO', 'BAD', 'BYE', 'PREAUTH']);
/**
 * One framed response -> {tag: '*' | '+' | 'A1'..., type, num?, code?, codeArgs?, text?, values?}
 *   status   (OK NO BAD BYE PREAUTH): code ('AUTHENTICATIONFAILED'...), codeArgs, text
 *   untagged data: type 'CAPABILITY' | 'SEARCH' | 'FLAGS' | 'FETCH' | 'EXISTS' ..., values / num
 *   continuation: tag '+', text
 */
export function parseResponse(bytes) {
  const c = new Cursor(isBytes(bytes) ? bytes : te.encode(String(bytes)));
  if (c.peek() === 43) { c.i++; c.sp(); return { tag: '+', type: 'CONTINUE', text: c.rest() }; }
  const tag = c.atom();
  if (!tag) c.fail('no tag');
  c.sp();
  let word = c.atom();
  let num = null;
  if (tag === '*' && /^\d{1,10}$/.test(word)) { num = Number(word); c.sp(); word = c.atom(); }
  const type = word.toUpperCase();
  if (!type) c.fail('no response type');
  if (STATUS.has(type)) {
    c.sp();
    let code = null, codeArgs = [];
    if (c.peek() === LB) {
      const close = c.b.indexOf(RB, c.i);
      if (close > 0) {
        const raw = utf8OrLatin1(c.b.subarray(c.i + 1, close));
        c.i = close + 1;
        const parts = raw.trim().split(/\s+/);
        code = (parts.shift() || '').toUpperCase();
        codeArgs = parts;
      }
    }
    c.sp();
    return { tag, type, num, code, codeArgs, text: c.rest().slice(0, 500) };
  }
  if (tag !== '*') c.fail('tagged data');
  const values = [];
  for (let n = 0; n < 200000; n++) {
    c.sp();
    if (c.done) break;
    values.push(c.value());
  }
  return { tag, type, num, values };
}

// ─── Building commands ──────────────────────────────────────────────────
/** An argument sent as a string: quoted when plain ASCII, else a literal (UTF-8 bytes). */
export const str = (s) => ({ string: String(s == null ? '' : s) });
/** An argument sent exactly as given (atoms, lists of fetch items, sequence sets). */
export const raw = (s) => ({ raw: String(s) });
function needsLiteral(s) { return s.length > 900 || /[\u0000\r\n\u0080-￿]/.test(s); }
/**
 * Command line -> segments [{bytes, wait}]: after a segment with wait:true the
 * server must answer '+' (a synchronizing literal) before the next is sent.
 */
export function buildCommand(tag, verb, args = [], { literalPlus = false } = {}) {
  const segs = [];
  let line = `${tag} ${verb}`;
  for (const a of args) {
    if (a && typeof a.raw === 'string') {
      if (/[\r\n]/.test(a.raw)) throw new ImapError('REFUSED', 'Refused an unsafe mail command.');
      line += ' ' + a.raw; continue;
    }
    const s = a && typeof a.string === 'string' ? a.string : String(a);
    if (!needsLiteral(s)) { line += ' "' + s.replace(/[\\"]/g, (m) => '\\' + m) + '"'; continue; }
    const bytes = te.encode(s);
    line += ` {${bytes.length}${literalPlus ? '+' : ''}}\r\n`;
    segs.push({ bytes: te.encode(line), wait: !literalPlus });
    segs.push({ bytes, wait: false, literal: true });
    line = '';
  }
  segs.push({ bytes: te.encode(line + '\r\n'), wait: false });
  // Join the non-waiting pieces so each write is one buffer.
  const out = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (prev && !prev.wait) { const j = new Uint8Array(prev.bytes.length + s.bytes.length); j.set(prev.bytes); j.set(s.bytes, prev.bytes.length); prev.bytes = j; prev.wait = s.wait; }
    else out.push({ bytes: s.bytes, wait: s.wait });
  }
  return out;
}

// ─── Small helpers ──────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** An IMAP search date (RFC 3501 date: 9-Oct-2026) from a Date, ms or 'YYYY-MM-DD'. */
export function imapDate(d) {
  const t = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(d + 'T00:00:00Z') : new Date(d).getTime();
  if (!Number.isFinite(t)) throw new ImapError('REFUSED', 'Not a valid date.');
  const x = new Date(t);
  return `${x.getUTCDate()}-${MONTHS[x.getUTCMonth()]}-${x.getUTCFullYear()}`;
}
/** INTERNALDATE ("17-Jul-1996 02:44:25 -0700") -> ISO, or null. */
export function parseInternalDate(s) {
  const m = /^\s*(\d{1,2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})\s*$/.exec(String(s || ''));
  if (!m) return null;
  const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (mon < 0) return null;
  const off = (m[7] === '-' ? -1 : 1) * (Number(m[8]) * 60 + Number(m[9]));
  const t = Date.UTC(Number(m[3]), mon, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6])) - off * 60000;
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
/** Sorted UIDs -> a compact sequence set ("1:3,7,9:12"). */
export function uidSet(uids) {
  const u = [...new Set(uids.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < u.length; i++) {
    let j = i;
    while (j + 1 < u.length && u[j + 1] === u[j] + 1) j++;
    out.push(j > i ? `${u[i]}:${u[j]}` : String(u[i]));
    i = j;
  }
  return out.join(',');
}
const b64 = (s) => { const bytes = te.encode(s); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin); };

// ─── ENVELOPE / FETCH ───────────────────────────────────────────────────
function addresses(v) {
  const out = [];
  if (!Array.isArray(v)) return out;
  for (const a of v) {
    if (!Array.isArray(a) || a.length < 4) continue;
    if (a[2] == null || a[3] == null) continue;   // group start / end markers
    out.push({ name: text(a[0]), mailbox: text(a[2]), host: text(a[3]) });
  }
  return out;
}
/** ENVELOPE list -> {date, subject, from:[{name,mailbox,host}], sender, replyTo, to, cc, inReplyTo, messageId} (raw header text: encoded words are decoded by the caller). */
export function parseEnvelope(v) {
  if (!Array.isArray(v) || v.length < 10) return null;
  return {
    date: text(v[0]), subject: text(v[1]), from: addresses(v[2]), sender: addresses(v[3]), replyTo: addresses(v[4]),
    to: addresses(v[5]), cc: addresses(v[6]), inReplyTo: text(v[8]), messageId: text(v[9]),
  };
}
/** The values of one "* n FETCH (...)" -> {uid, flags, internalDate, envelope, bodyStructure, size, sections:{'1': bytes, 'TEXT': bytes, 'HEADER': bytes}} */
export function parseFetch(values) {
  const list = Array.isArray(values) && Array.isArray(values[0]) ? values[0] : null;
  if (!list) return null;
  const out = { sections: {} };
  for (let i = 0; i + 1 < list.length; i += 2) {
    const key = text(list[i]).toUpperCase(), v = list[i + 1];
    if (key === 'UID') out.uid = Number(text(v)) || null;
    else if (key === 'FLAGS') out.flags = Array.isArray(v) ? v.map(text) : [];
    else if (key === 'INTERNALDATE') out.internalDate = parseInternalDate(text(v));
    else if (key === 'ENVELOPE') out.envelope = parseEnvelope(v);
    else if (key === 'BODYSTRUCTURE' || key === 'BODY') out.bodyStructure = Array.isArray(v) ? v : null;
    else if (key === 'RFC822.SIZE') out.size = Number(text(v)) || 0;
    else {
      const m = /^(?:BODY|BINARY)\[([^\]]*)\](?:<\d+>)?$/.exec(key);
      if (m) {
        const sec = m[1].replace(/\s+/g, ' ').trim();
        const name = sec.startsWith('HEADER') ? 'HEADER' : sec || 'ALL';
        out.sections[name] = v == null ? new Uint8Array(0) : isBytes(v) ? v : te.encode(String(v));
      }
    }
  }
  return out;
}

// ─── The client ─────────────────────────────────────────────────────────
const ALLOWED = new Set(['CAPABILITY', 'STARTTLS', 'LOGIN', 'AUTHENTICATE', 'EXAMINE', 'UID SEARCH', 'UID FETCH', 'NOOP', 'LOGOUT']);
const UNSAFE_FETCH = /(^|[\s(])(?:BODY|BINARY)\[|(^|[\s(])RFC822(?:\.TEXT)?(?=[\s)]|$)/i;
/** Throws unless a command is one OpenDash may send (the read-only allowlist above). */
export function checkCommand(verb, args = []) {
  const v = String(verb || '').toUpperCase();
  if (!ALLOWED.has(v)) throw new ImapError('REFUSED', 'OpenDash only reads mail: that command is never sent.', { verb: v });
  if (v === 'UID FETCH') {
    const items = args.map((a) => (a && typeof a.raw === 'string' ? a.raw : '')).join(' ');
    if (UNSAFE_FETCH.test(items)) throw new ImapError('REFUSED', 'OpenDash only reads mail without marking it read.', { verb: v });
  }
  if (v === 'EXAMINE' && args.length !== 1) throw new ImapError('REFUSED', 'EXAMINE takes one mailbox.');
  return v;
}

/**
 * createImapClient(opts) -> client
 *   opts.openTransport  ({host, port, tls}) -> Promise<Transport>
 *   opts.host, opts.port, opts.security 'tls' (IMAPS, 993) | 'starttls' (143)
 *   opts.timeoutMs      idle time allowed waiting for the server (default 20 s)
 *   opts.sessionMs      the whole session (default 120 s)
 *   opts.limits         DEFAULT_LIMITS overrides
 *   opts.allowInsecure  tests only: send a password over plain TCP
 *   opts.timers         {setTimeout, clearTimeout} (default: the globals)
 */
export function createImapClient(opts = {}) {
  const { openTransport, host, port, security = 'tls', timeoutMs = 20000, sessionMs = 120000, allowInsecure = false } = opts;
  const timers = opts.timers || { setTimeout: (...a) => globalThis.setTimeout(...a), clearTimeout: (t) => globalThis.clearTimeout(t) };
  if (typeof openTransport !== 'function') throw new Error('createImapClient needs openTransport');
  const reader = createResponseReader(opts.limits);
  let transport = null, closed = false, closeErr = null, bye = null;
  const queue = [];
  let waiter = null;
  let n = 0;
  let deadline = 0;
  const caps = new Set();
  let malformed = 0;

  function settle(err, value) {
    const w = waiter; waiter = null;
    if (!w) return;
    timers.clearTimeout(w.timer);
    if (err) w.reject(err); else w.resolve(value);
  }
  function onData(chunk) {
    if (closed) return;
    let frames;
    try { frames = reader.push(chunk); }
    catch (e) { fatal(e); return; }
    for (const f of frames) {
      let r;
      try { r = parseResponse(f); }
      catch (e) { malformed++; r = { tag: '*', type: 'MALFORMED', error: e }; }
      if (r.tag === '*' && r.type === 'BYE') bye = r;
      queue.push(r);
    }
    if (waiter && queue.length) settle(null, queue.shift());
    else if (waiter) rearm();
  }
  function fatal(e) {
    if (closeErr == null) closeErr = e;
    closed = true;
    try { transport && transport.close(); } catch { /* already closed */ }
    settle(e);
  }
  function onClose(err) {
    if (closed && closeErr) return;
    closed = true;
    closeErr = closeErr || (bye ? new ImapError('BYE', bye.text || 'The mail server closed the connection.', { code: bye.code }) : new ImapError('NETWORK', 'The mail server closed the connection.', { cause: err && (err.code || err.message) }));
    settle(closeErr);
  }
  function rearm() {
    if (!waiter) return;
    timers.clearTimeout(waiter.timer);
    const left = Math.max(1, Math.min(timeoutMs, deadline - Date.now()));
    waiter.timer = timers.setTimeout(() => fatal(new ImapError('TIMEOUT', 'The mail server took too long to answer.')), left);
  }
  /** The next response (or the reason there is none). */
  function next() {
    if (queue.length) return Promise.resolve(queue.shift());
    if (closed) return Promise.reject(closeErr || new ImapError('NETWORK', 'The connection is closed.'));
    if (deadline && Date.now() > deadline) { fatal(new ImapError('TIMEOUT', 'The mail server took too long to answer.')); return Promise.reject(closeErr); }
    return new Promise((resolve, reject) => { waiter = { resolve, reject, timer: null }; rearm(); });
  }
  function write(bytes) {
    if (closed) throw closeErr || new ImapError('NETWORK', 'The connection is closed.');
    transport.write(bytes);
  }
  function capsFrom(list) { caps.clear(); for (const c of list) caps.add(text(c).toUpperCase()); }

  /**
   * Run one command: returns {ok: tagged response, untagged: [...]}. A tagged NO/BAD
   * throws ImapError NO/BAD with the response code (AUTHENTICATIONFAILED...) and text.
   * onContinue(r) -> bytes|null answers a '+' that is not a literal request (AUTHENTICATE).
   */
  async function run(verb, args = [], { onContinue } = {}) {
    const v = checkCommand(verb, args);
    if (closed) throw closeErr || new ImapError('NETWORK', 'The connection is closed.');
    const tag = 'A' + String(++n).padStart(3, '0');
    const segs = buildCommand(tag, v, args, { literalPlus: caps.has('LITERAL+') });
    const untagged = [];
    let si = 0;
    write(segs[si].bytes);
    for (;;) {
      const r = await next();
      if (r.tag === '+') {
        if (segs[si] && segs[si].wait && si + 1 < segs.length) { si++; write(segs[si].bytes); continue; }
        const reply = onContinue ? onContinue(r) : null;
        write(reply || te.encode('*\r\n'));    // '*' cancels an exchange we did not expect
        continue;
      }
      if (r.tag === tag) {
        if (r.type === 'OK') {
          if (r.code === 'CAPABILITY') capsFrom(r.codeArgs);
          return { ok: r, untagged };
        }
        throw new ImapError(r.type === 'NO' ? 'NO' : 'BAD', r.text || 'The mail server refused.', { code: r.code, verb: v });
      }
      if (r.tag === '*') {
        if (r.type === 'CAPABILITY') capsFrom(r.values || []);
        else if (r.type === 'OK' && r.code === 'CAPABILITY') capsFrom(r.codeArgs);
        untagged.push(r);
        continue;
      }
      // A tagged answer to something we did not send.
      fatal(new ImapError('PROTOCOL', 'The mail server sent something OpenDash could not read.'));
      throw closeErr;
    }
  }

  const client = {
    get capabilities() { return new Set(caps); },
    get secure() { return !!(transport && transport.secure); },
    get malformed() { return malformed; },
    /** Connect, read the greeting, upgrade with STARTTLS when asked. -> {greeting, preauth} */
    async open() {
      deadline = Date.now() + sessionMs;
      try { transport = await openTransport({ host, port, tls: security === 'tls' }); }
      catch (e) { throw e instanceof ImapError ? e : new ImapError(e && e.kind ? e.kind : 'NETWORK', 'The mail server could not be reached.', { cause: e && (e.code || e.message) }); }
      transport.onData(onData);
      transport.onClose(onClose);
      const g = await next();
      if (g.tag !== '*' || !['OK', 'PREAUTH'].includes(g.type)) {
        fatal(new ImapError(g.type === 'BYE' ? 'BYE' : 'PROTOCOL', g.text || 'The mail server refused the connection.', { code: g.code }));
        throw closeErr;
      }
      if (g.code === 'CAPABILITY') capsFrom(g.codeArgs);
      if (security === 'starttls') {
        if (g.type === 'PREAUTH') { fatal(new ImapError('INSECURE', 'The mail server did not offer a secure connection.')); throw closeErr; }
        if (!caps.size) await run('CAPABILITY');
        if (!caps.has('STARTTLS')) { fatal(new ImapError('INSECURE', 'The mail server did not offer a secure connection.')); throw closeErr; }
        await run('STARTTLS');
        if (queue.length || reader.pending) { fatal(new ImapError('PROTOCOL', 'The mail server sent data before the secure connection started.')); throw closeErr; }
        if (typeof transport.startTls !== 'function') { fatal(new ImapError('INSECURE', 'This device cannot start a secure connection.')); throw closeErr; }
        try { await transport.startTls(); }
        catch (e) { fatal(e instanceof ImapError ? e : new ImapError('TLS', 'The secure connection to the mail server failed.', { cause: e && (e.code || e.message) })); throw closeErr; }
        caps.clear();
      }
      return { greeting: g.text || '', preauth: g.type === 'PREAUTH' };
    },
    async capability() { await run('CAPABILITY'); return new Set(caps); },
    /** Sign in: AUTHENTICATE PLAIN when offered, else LOGIN. Never over an unverified connection. */
    async login(user, pass) {
      if (!client.secure && !allowInsecure) throw new ImapError('INSECURE', 'OpenDash only sends a password over a secure, verified connection.');
      if (!caps.size) await run('CAPABILITY');
      const u = String(user || ''), p = String(pass || '');
      if (caps.has('AUTH=PLAIN')) {
        const token = b64('\u0000' + u + '\u0000' + p);
        if (caps.has('SASL-IR')) await run('AUTHENTICATE', [raw('PLAIN'), raw(token)]);
        else {
          let sent = false;
          await run('AUTHENTICATE', [raw('PLAIN')], { onContinue: () => { if (sent) return null; sent = true; return te.encode(token + '\r\n'); } });
        }
      } else {
        if (caps.has('LOGINDISABLED')) throw new ImapError('NO', 'The mail server does not allow a password sign-in here.', { code: 'LOGINDISABLED' });
        await run('LOGIN', [str(u), str(p)]);
      }
      // Capabilities often change after sign-in; ask again only when the OK did not say.
      return new Set(caps);
    },
    /** Open a mailbox READ-ONLY (EXAMINE, never SELECT). -> {exists, uidValidity, uidNext, readOnly} */
    async examine(mailbox = 'INBOX') {
      const r = await run('EXAMINE', [str(mailbox)]);
      const out = { exists: 0, uidValidity: null, uidNext: null, readOnly: r.ok.code === 'READ-ONLY' };
      for (const u of r.untagged) {
        if (u.type === 'EXISTS' && u.num != null) out.exists = u.num;
        if (u.type === 'OK' && u.code === 'UIDVALIDITY') out.uidValidity = Number(u.codeArgs[0]) || null;
        if (u.type === 'OK' && u.code === 'UIDNEXT') out.uidNext = Number(u.codeArgs[0]) || null;
      }
      return out;
    },
    /** UIDs of messages that arrived on or after a day (UID SEARCH SINCE). */
    async uidSearchSince(day) {
      const r = await run('UID SEARCH', [raw('SINCE ' + imapDate(day))]);
      const out = [];
      for (const u of r.untagged) if (u.type === 'SEARCH') for (const v of u.values || []) { const x = Number(text(v)); if (Number.isSafeInteger(x) && x > 0) out.push(x); }
      return [...new Set(out)].sort((a, b) => a - b);
    },
    /** UID FETCH <uids> <items> -> [{seq, uid, flags, internalDate, envelope, bodyStructure, sections}] merged per message. */
    async uidFetch(uids, items) {
      const set = uidSet(uids);
      if (!set) return [];
      const r = await run('UID FETCH', [raw(set), raw(items)]);
      const bySeq = new Map();
      for (const u of r.untagged) {
        if (u.type !== 'FETCH' || u.num == null) continue;
        const f = parseFetch(u.values);
        if (!f) { malformed++; continue; }
        const prev = bySeq.get(u.num) || { seq: u.num, sections: {} };
        bySeq.set(u.num, { ...prev, ...f, sections: { ...prev.sections, ...f.sections }, uid: f.uid || prev.uid });
      }
      return [...bySeq.values()].filter((m) => m.uid);
    },
    async noop() { await run('NOOP'); },
    /** Polite goodbye (errors ignored), then close. */
    async logout() {
      try { if (!closed) await run('LOGOUT'); } catch { /* the server may just hang up */ }
      client.close();
    },
    close() {
      if (!closed) { closed = true; closeErr = closeErr || new ImapError('NETWORK', 'The connection is closed.'); }
      settle(closeErr);
      try { transport && transport.close(); } catch { /* ignore */ }
    },
    /** Tests: run any allowed command. */
    _run: run,
  };
  return client;
}
