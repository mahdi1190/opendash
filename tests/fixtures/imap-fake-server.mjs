// tests/fixtures/imap-fake-server.mjs - an in-process IMAP server for the
// "+ Other email" tests: node:net (or node:tls) on 127.0.0.1 and a random port,
// synthetic mailboxes only, no real network. Written independently of the
// client under test (lib/accounts/imap-wire.mjs): its own line reader, its own
// MIME walker, its own ENVELOPE / BODYSTRUCTURE builder.
//
//   const srv = await startFakeImap({ users: {'someone@yahoo.com': 'pw'}, messages: [...] })
//   srv.port, srv.commands ([{verb, raw}]: what the client sent; passwords are redacted),
//   srv.close()
//
// Options:
//   tls: {key, cert}         IMAPS (TLS from the first byte)
//   starttls: {key, cert}    plain port that offers STARTTLS
//   caps                     capabilities before sign-in (default IMAP4rev1 AUTH=PLAIN SASL-IR LITERAL+)
//   users                    {user: password}
//   loginError               {code, text} answered for a wrong password
//   messages                 [{uid, flags, internalDate: 'YYYY-MM-DDTHH:MM:SSZ', raw}]
//   uidValidity              (default 4242)
//   chunk                    write answers N bytes at a time (framing tests)
//   hangOn                   a verb never answered ('UID FETCH'): timeout tests
//   onCommand(cmd, s)        -> raw text to write instead of the normal answer (or null)
//   injectAfterStarttls      text sent straight after "OK Begin TLS" (injection test)
//
// selfSignedCert({dns, ips}) makes a throwaway EC certificate in memory (nothing on disk).

import net from 'node:net';
import tls from 'node:tls';
import { generateKeyPairSync, sign, randomBytes } from 'node:crypto';

// ─── A throwaway certificate (DER by hand: node:crypto signs, it cannot issue) ──
function derLen(n) { if (n < 128) return Buffer.from([n]); const b = []; while (n) { b.unshift(n & 255); n >>= 8; } return Buffer.from([0x80 | b.length, ...b]); }
const tlv = (tag, ...parts) => { const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p)))); return Buffer.concat([Buffer.from([tag]), derLen(body.length), body]); };
const seq = (...p) => tlv(0x30, ...p);
const set = (...p) => tlv(0x31, ...p);
function oid(s) {
  const parts = s.split('.').map(Number), out = [40 * parts[0] + parts[1]];
  for (const v of parts.slice(2)) { const b = [v & 127]; let x = Math.floor(v / 128); while (x) { b.unshift((x & 127) | 128); x = Math.floor(x / 128); } out.push(...b); }
  return tlv(0x06, Buffer.from(out));
}
const int = (buf) => tlv(0x02, buf[0] & 0x80 ? Buffer.concat([Buffer.from([0]), buf]) : buf);
const utc = (d) => tlv(0x17, Buffer.from(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));

export function selfSignedCert({ cn = 'localhost', dns = ['localhost'], ips = ['127.0.0.1'], days = 2 } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const name = seq(set(seq(oid('2.5.4.3'), tlv(0x0c, Buffer.from(cn)))));
  const alg = seq(oid('1.2.840.10045.4.3.2'));
  const nb = new Date(Date.now() - 3600e3), na = new Date(nb.getTime() + days * 86400e3);
  const san = seq(...dns.map((d) => tlv(0x82, Buffer.from(d))), ...ips.map((ip) => tlv(0x87, Buffer.from(ip.split('.').map(Number)))));
  const exts = tlv(0xa3, seq(
    seq(oid('2.5.29.19'), tlv(0x01, Buffer.from([0xff])), tlv(0x04, seq(tlv(0x01, Buffer.from([0xff]))))),
    seq(oid('2.5.29.15'), tlv(0x01, Buffer.from([0xff])), tlv(0x04, tlv(0x03, Buffer.from([0x01, 0x86])))),   // digitalSignature, keyCertSign, cRLSign
    seq(oid('2.5.29.17'), tlv(0x04, san)),
  ));
  const serial = randomBytes(8); serial[0] &= 0x7f;
  const tbs = seq(tlv(0xa0, int(Buffer.from([2]))), int(serial), alg, name, seq(utc(nb), utc(na)), name, spki, exts);
  const sig = sign('sha256', tbs, privateKey);
  const der = seq(tbs, alg, tlv(0x03, Buffer.concat([Buffer.from([0]), sig])));
  const cert = '-----BEGIN CERTIFICATE-----\n' + der.toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
  return { cert, key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
}

// ─── A small MIME walker (independent of lib/accounts/mime.mjs) ──────────
function splitHead(raw) {
  const i = raw.search(/\r?\n\r?\n/);
  if (i < 0) return { head: raw, body: '' };
  const m = /\r?\n\r?\n/.exec(raw.slice(i));
  return { head: raw.slice(0, i), body: raw.slice(i + m[0].length) };
}
function headers(head) {
  const out = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const k = line.indexOf(':');
    if (k > 0) { const name = line.slice(0, k).trim().toLowerCase(); if (!(name in out)) out[name] = line.slice(k + 1).trim(); }
  }
  return out;
}
function ctype(v) {
  const m = /^\s*([^/;\s]+)\/([^;\s]+)/.exec(v || 'text/plain');
  const params = {};
  for (const p of String(v || '').matchAll(/;\s*([^=\s]+)\s*=\s*("([^"]*)"|[^;\s]+)/g)) params[p[1].toLowerCase()] = p[3] != null ? p[3] : p[2];
  return { type: (m ? m[1] : 'text').toLowerCase(), subtype: (m ? m[2] : 'plain').toLowerCase(), params };
}
function parseEntity(raw) {
  const { head, body } = splitHead(raw);
  const h = headers(head);
  const ct = ctype(h['content-type'] || 'text/plain; charset=us-ascii');
  const node = { h, ct, body, raw };
  if (ct.type === 'multipart' && ct.params.boundary) {
    const d = '--' + ct.params.boundary;
    node.children = [];
    const pieces = body.split(new RegExp('\\r?\\n?' + d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:--)?[ \\t]*\\r?\\n?'));
    for (const piece of pieces.slice(1, -1)) node.children.push(parseEntity(piece));
  }
  return node;
}
function partAt(node, path) {
  let n = node;
  if (!n.children) return path === '1' ? n : null;
  for (const i of path.split('.').map(Number)) { if (!n.children || !n.children[i - 1]) return null; n = n.children[i - 1]; }
  return n;
}

// ─── IMAP output helpers ─────────────────────────────────────────────────
function q(s) {
  if (s == null || s === '') return s == null ? 'NIL' : '""';
  const str = String(s);
  if (/[^\x20-\x7e]|"/.test(str)) { const b = Buffer.from(str, 'utf8'); return `{${b.length}}\r\n${b.toString('latin1')}`; }   // a literal
  return '"' + str.replace(/\\/g, '\\\\') + '"';
}
function addrList(v) {
  if (!v) return 'NIL';
  const out = [];
  for (const one of v.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    const m = /^\s*(?:"((?:[^"\\]|\\.)*)"|([^<"]*?))\s*<([^@>\s]+)@([^>\s]+)>\s*$/.exec(one) || /^\s*()()([^@\s<>]+)@([^\s<>]+)\s*$/.exec(one);
    if (!m) continue;
    const name = m[1] != null ? m[1].replace(/\\(.)/g, '$1') : (m[2] || '').trim();
    out.push(`(${q(name || null)} NIL ${q(m[3])} ${q(m[4])})`);
  }
  return out.length ? `(${out.join('')})` : 'NIL';
}
function envelope(h) {
  return `(${q(h.date || null)} ${q(h.subject || null)} ${addrList(h.from)} ${addrList(h.sender || h.from)} ${addrList(h['reply-to'] || h.from)} ${addrList(h.to)} ${addrList(h.cc)} NIL ${q(h['in-reply-to'] || null)} ${q(h['message-id'] || null)})`;
}
function structure(node) {
  if (node.children) return `(${node.children.map(structure).join('')} ${q(node.ct.subtype)} (${q('boundary')} ${q(node.ct.params.boundary)}) NIL NIL NIL)`;
  const params = Object.entries(node.ct.params);
  const p = params.length ? `(${params.map(([k, v]) => `${q(k)} ${q(v)}`).join(' ')})` : 'NIL';
  const enc = q((node.h['content-transfer-encoding'] || '7bit').toLowerCase());
  const size = Buffer.byteLength(node.body, 'latin1');
  const disp = node.h['content-disposition'] ? `(${q(node.h['content-disposition'].split(';')[0].trim().toLowerCase())} NIL)` : 'NIL';
  if (node.ct.type === 'text') return `(${q(node.ct.type)} ${q(node.ct.subtype)} ${p} NIL NIL ${enc} ${size} ${node.body.split('\n').length} NIL ${disp} NIL NIL)`;
  return `(${q(node.ct.type)} ${q(node.ct.subtype)} ${p} NIL NIL ${enc} ${size} NIL ${disp} NIL NIL)`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function internalDate(iso) {
  const d = new Date(iso), p = (n) => String(n).padStart(2, '0');
  return `"${p(d.getUTCDate())}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000"`;
}
function inSet(uid, set, max) {
  for (const r of set.split(',')) {
    const [a, b] = r.split(':').map((x) => (x === '*' ? max : Number(x)));
    if (b == null ? uid === a : uid >= Math.min(a, b) && uid <= Math.max(a, b)) return true;
  }
  return false;
}
const lit = (bytes) => `{${bytes.length}}\r\n${bytes.toString('latin1')}`;

// ─── The server ──────────────────────────────────────────────────────────
export async function startFakeImap(opts = {}) {
  const caps = opts.caps || ['IMAP4rev1', 'AUTH=PLAIN', 'SASL-IR', 'LITERAL+'];
  const users = opts.users || {};
  const uidValidity = opts.uidValidity || 4242;
  const messages = (opts.messages || []).map((m) => ({ ...m, flags: [...(m.flags || [])], tree: parseEntity(m.raw) })).sort((a, b) => a.uid - b.uid);
  const commands = [];
  const stats = { syncLiterals: 0 };
  const sockets = new Set();

  function session(sock0) {
    let sock = sock0;
    sockets.add(sock0);
    let buf = Buffer.alloc(0), authed = false, examined = false, closed = false, busy = Promise.resolve();
    let pendingAuth = null;   // AUTHENTICATE PLAIN waiting for its line
    const write = async (text) => {
      const b = Buffer.from(text, 'latin1');
      if (!opts.chunk) { if (!closed) sock.write(b); return; }
      for (let i = 0; i < b.length; i += opts.chunk) { if (closed) return; sock.write(b.subarray(i, i + opts.chunk)); await new Promise((r) => setImmediate(r)); }
    };
    const capLine = () => [...caps, ...(opts.starttls && !sock.encrypted ? ['STARTTLS'] : [])].join(' ');
    // Read: lines, with literals ({n} answered with '+', {n+} not).
    let want = 0, line = '';
    function onData(chunk) {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (want) {
          if (buf.length < want) return;
          line += buf.subarray(0, want).toString('latin1'); buf = buf.subarray(want); want = 0; continue;
        }
        const i = buf.indexOf(10);
        if (i < 0) return;
        const part = buf.subarray(0, i).toString('latin1').replace(/\r$/, ''); buf = buf.subarray(i + 1);
        const m = /\{(\d+)(\+?)\}$/.exec(part);
        if (m) { line += part + '\r\n'; want = Number(m[1]); if (!m[2]) { stats.syncLiterals++; write('+ Ready for literal\r\n'); } continue; }
        const full = line + part; line = '';
        busy = busy.then(() => handle(full)).catch(() => {});
      }
    }
    sock.on('data', onData);
    sock.on('error', () => {});
    sock.on('close', () => { closed = true; });

    async function handle(full) {
      if (pendingAuth) { const tag = pendingAuth; pendingAuth = null; return plainAuth(tag, full.trim()); }
      const m = /^(\S+) (UID \S+|\S+)(?: ([\s\S]*))?$/.exec(full);
      if (!m) return write('* BAD Unreadable\r\n');
      const [, tag, verbRaw, rest = ''] = m;
      const verb = verbRaw.toUpperCase();
      commands.push({ verb, raw: verb === 'LOGIN' || verb === 'AUTHENTICATE' ? `${tag} ${verb} ***` : full });
      if (opts.hangOn && verb === opts.hangOn) return;
      if (opts.onCommand) { const custom = await opts.onCommand({ tag, verb, rest }, { authed, examined }); if (custom != null) return write(custom); }
      switch (verb) {
        case 'CAPABILITY': return write(`* CAPABILITY ${authed ? caps.filter((c) => !c.startsWith('AUTH=')).join(' ') : capLine()}\r\n${tag} OK CAPABILITY completed\r\n`);
        case 'NOOP': return write(`${tag} OK NOOP completed\r\n`);
        case 'LOGOUT': await write(`* BYE Logging out\r\n${tag} OK LOGOUT completed\r\n`); return sock.end();
        case 'STARTTLS': {
          if (!opts.starttls || sock.encrypted) return write(`${tag} BAD STARTTLS not available\r\n`);
          sock.off('data', onData);
          sock.write(`${tag} OK Begin TLS negotiation now\r\n` + (opts.injectAfterStarttls || ''));
          const secure = new tls.TLSSocket(sock, { isServer: true, key: opts.starttls.key, cert: opts.starttls.cert });
          secure.on('error', () => {});
          secure.on('close', () => { closed = true; });
          sock = secure; sockets.add(secure);
          secure.on('data', onData);
          return;
        }
        case 'LOGIN': {
          const args = parseArgs(rest);
          return login(tag, args[0], args[1]);
        }
        case 'AUTHENTICATE': {
          const [mech, ir] = rest.split(' ');
          if (String(mech).toUpperCase() !== 'PLAIN') return write(`${tag} NO Unsupported mechanism\r\n`);
          if (ir) return plainAuth(tag, ir);
          pendingAuth = tag; return write('+ \r\n');
        }
        case 'SELECT': return write(`${tag} NO SELECT is not allowed on this test server\r\n`);
        case 'EXAMINE': {
          if (!authed) return write(`${tag} BAD Not authenticated\r\n`);
          const box = parseArgs(rest)[0];
          if (String(box).toUpperCase() !== 'INBOX') return write(`${tag} NO Mailbox does not exist\r\n`);
          examined = true;
          const next = (messages.length ? messages[messages.length - 1].uid : 0) + 1;
          return write(`* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)\r\n* ${messages.length} EXISTS\r\n* 0 RECENT\r\n* OK [UIDVALIDITY ${uidValidity}] UIDs valid\r\n* OK [UIDNEXT ${next}] Predicted next UID\r\n${tag} OK [READ-ONLY] EXAMINE completed\r\n`);
        }
        case 'UID SEARCH': {
          if (!examined) return write(`${tag} BAD No mailbox\r\n`);
          const sm = /SINCE (\d{1,2})-([A-Za-z]{3})-(\d{4})/i.exec(rest);
          if (!sm) return write(`${tag} BAD Unsupported search\r\n`);
          const since = Date.UTC(Number(sm[3]), MONTHS.findIndex((x) => x.toLowerCase() === sm[2].toLowerCase()), Number(sm[1]));
          const hits = messages.filter((x) => Date.parse(x.internalDate) >= since).map((x) => x.uid);
          return write(`* SEARCH${hits.length ? ' ' + hits.join(' ') : ''}\r\n${tag} OK SEARCH completed\r\n`);
        }
        case 'UID FETCH': return fetch(tag, rest);
        default: return write(`${tag} BAD Unknown command\r\n`);
      }
    }
    async function login(tag, user, pass) {
      if (opts.loginAlways) return write(`${tag} NO ${opts.loginAlways.code ? `[${opts.loginAlways.code}] ` : ''}${opts.loginAlways.text}\r\n`);
      if (users[user] != null && users[user] === pass) { authed = true; return write(`${tag} OK [CAPABILITY ${caps.filter((c) => !c.startsWith('AUTH=')).join(' ')}] Logged in\r\n`); }
      const e = opts.loginError || { code: 'AUTHENTICATIONFAILED', text: 'Invalid credentials (Failure)' };
      return write(`${tag} NO ${e.code ? `[${e.code}] ` : ''}${e.text}\r\n`);
    }
    function plainAuth(tag, b64) {
      if (b64 === '*') return write(`${tag} BAD Cancelled\r\n`);
      const parts = Buffer.from(b64, 'base64').toString('utf8').split('\u0000');
      return login(tag, parts[1], parts[2]);
    }
    async function fetch(tag, rest) {
      if (!examined) return write(`${tag} BAD No mailbox\r\n`);
      const fm = /^(\S+) \(([\s\S]*)\)$/.exec(rest.trim());
      if (!fm) return write(`${tag} BAD Bad fetch\r\n`);
      const [, set, itemsRaw] = fm;
      const items = itemsRaw.match(/BODY(?:\.PEEK)?\[[^\]]*\](?:<\d+\.\d+>)?|[A-Z0-9.]+/gi) || [];
      const max = messages.length ? messages[messages.length - 1].uid : 0;
      let out = '';
      messages.forEach((msg, i) => {
        if (!inSet(msg.uid, set, max)) return;
        const parts = [`UID ${msg.uid}`];
        for (const it of items) {
          const u = it.toUpperCase();
          if (u === 'UID') continue;
          if (u === 'FLAGS') parts.push(`FLAGS (${msg.flags.join(' ')})`);
          else if (u === 'INTERNALDATE') parts.push(`INTERNALDATE ${internalDate(msg.internalDate)}`);
          else if (u === 'ENVELOPE') parts.push(`ENVELOPE ${envelope(msg.tree.h)}`);
          else if (u === 'BODYSTRUCTURE') parts.push(`BODYSTRUCTURE ${msg.brokenStructure ? '(("text" ' : structure(msg.tree)}`);
          else if (u === 'RFC822.SIZE') parts.push(`RFC822.SIZE ${Buffer.byteLength(msg.raw, 'latin1')}`);
          else {
            const bm = /^BODY(\.PEEK)?\[([^\]]*)\](?:<(\d+)\.(\d+)>)?$/i.exec(it);
            if (!bm) continue;
            if (!bm[1] && !msg.flags.includes('\\Seen')) msg.flags.push('\\Seen');     // a non-PEEK fetch marks it read
            const sec = bm[2].toUpperCase();
            let bytes;
            if (sec === 'TEXT') bytes = Buffer.from(msg.tree.body, 'latin1');
            else if (sec.startsWith('HEADER.FIELDS')) {
              const want = (sec.match(/\(([^)]*)\)/) || [, ''])[1].split(/\s+/).map((x) => x.toLowerCase());
              bytes = Buffer.from(want.filter((k) => msg.tree.h[k]).map((k) => `${k}: ${msg.tree.h[k]}\r\n`).join('') + '\r\n', 'latin1');
            } else {
              const part = partAt(msg.tree, sec);
              bytes = Buffer.from(part ? part.body : '', 'latin1');
            }
            if (bm[3] != null) bytes = bytes.subarray(Number(bm[3]), Number(bm[3]) + Number(bm[4]));
            parts.push(`BODY[${bm[2]}]${bm[3] != null ? `<${bm[3]}>` : ''} ${lit(bytes)}`);
          }
        }
        out += `* ${i + 1} FETCH (${parts.join(' ')})\r\n`;
      });
      return write(out + `${tag} OK FETCH completed\r\n`);
    }
    // Greeting
    write(opts.greeting != null ? opts.greeting : `* OK [CAPABILITY ${capLine()}] Fake IMAP ready\r\n`);
  }

  function parseArgs(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      if (s[i] === ' ') { i++; continue; }
      if (s[i] === '"') { let v = ''; i++; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; v += s[i++]; } i++; out.push(Buffer.from(v, 'latin1').toString('utf8')); continue; }
      const lm = /^\{(\d+)\+?\}\r\n/.exec(s.slice(i));
      if (lm) { const n = Number(lm[1]); const start = i + lm[0].length; out.push(Buffer.from(s.slice(start, start + n), 'latin1').toString('utf8')); i = start + n; continue; }
      let v = ''; while (i < s.length && s[i] !== ' ') v += s[i++]; out.push(v);
    }
    return out;
  }

  const server = opts.tls ? tls.createServer({ key: opts.tls.key, cert: opts.tls.cert }, session) : net.createServer(session);
  server.on('tlsClientError', () => {});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: server.address().port, host: '127.0.0.1', commands, messages, stats,
    async close() { for (const s of sockets) s.destroy(); await new Promise((r) => server.close(() => r())); },
  };
}

/** A raw RFC 822 message for the fake server. */
export function rawMessage({ from = 'Sam Taylor <sam@example.com>', to = 'me@example.com', subject = 'Hello', date = 'Fri, 23 Oct 2026 10:00:00 +0000', messageId, headers = '', body = 'Hi there', contentType = 'text/plain; charset=utf-8', encoding = '7bit' } = {}) {
  return [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, `Date: ${date}`, ...(messageId ? [`Message-ID: ${messageId}`] : []), 'MIME-Version: 1.0', `Content-Type: ${contentType}`,
    ...(encoding ? [`Content-Transfer-Encoding: ${encoding}`] : []), ...(headers ? [headers] : []), '', body].join('\r\n');
}
