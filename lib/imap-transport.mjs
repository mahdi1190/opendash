// lib/imap-transport.mjs - the Node transport for the IMAP client
// (lib/accounts/imap-wire.mjs): a TLS socket with STRICT certificate checks.
//
//   nodeImapTransport(opts) -> openTransport({host, port, tls}) -> Promise<Transport>
//
// - IMAPS (tls: true): node:tls straight away. STARTTLS (tls: false): a plain
//   node:net socket that the client upgrades with startTls() before any
//   password is sent (the client refuses to sign in otherwise).
// - rejectUnauthorized is always true: the certificate must chain to a trusted
//   root and match the host name (Node's checkServerIdentity). TLS 1.2 or later.
//   opts.ca replaces the trusted roots (tests: the in-process fake server's
//   own certificate); nothing a user types can switch the checks off.
// - A connect timeout, and errors reported as ImapError NETWORK / TLS / TIMEOUT
//   with the Node error code as `cause` (never the server's certificate text).
//
// Node stdlib only. A mobile or desktop app provides the same small interface
// over its own socket API.

import tls from 'node:tls';
import net from 'node:net';
import { ImapError } from './accounts/imap-wire.mjs';

const CERT_ERR = /CERT|SELF_SIGNED|UNABLE_TO_(?:GET|VERIFY)|ALTNAME|HOSTNAME|ERR_SSL|ERR_TLS|EPROTO|ECONNRESET_TLS|WRONG_VERSION|HANDSHAKE/i;
const isIp = (h) => net.isIP(String(h || '').replace(/^\[|\]$/g, '')) !== 0;

function tlsError(e) {
  const code = String((e && e.code) || '');
  return CERT_ERR.test(code) || CERT_ERR.test(String((e && e.message) || '').slice(0, 200))
    ? new ImapError('TLS', 'The secure connection to the mail server failed.', { cause: code || 'TLS' })
    : new ImapError('NETWORK', 'The mail server could not be reached.', { cause: code || 'NETWORK' });
}

/** The Node transport factory. opts: {ca?, connectTimeoutMs = 15000, minVersion = 'TLSv1.2'} */
export function nodeImapTransport({ ca, connectTimeoutMs = 15000, minVersion = 'TLSv1.2' } = {}) {
  const tlsOptions = (host) => ({
    host, ...(isIp(host) ? {} : { servername: host }),
    rejectUnauthorized: true, minVersion, ...(ca ? { ca } : {}),
  });

  function waitFor(sock, event, timeoutMs, onErr) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { cleanup(); sock.destroy(); reject(new ImapError('TIMEOUT', 'The mail server took too long to answer.')); }, timeoutMs);
      const ok = () => { cleanup(); resolve(); };
      const bad = (e) => { cleanup(); sock.destroy(); reject(onErr(e)); };
      const closed = () => { cleanup(); reject(new ImapError('NETWORK', 'The mail server closed the connection.', { cause: 'CLOSED' })); };
      function cleanup() { clearTimeout(t); sock.off(event, ok); sock.off('error', bad); sock.off('close', closed); }
      sock.once(event, ok); sock.once('error', bad); sock.once('close', closed);
    });
  }

  return async function openTransport({ host, port, tls: useTls } = {}) {
    const h = String(host || ''), p = Number(port);
    if (!h || !Number.isInteger(p) || p < 1 || p > 65535) throw new ImapError('NETWORK', 'Not a valid mail server.', { cause: 'BAD_ADDRESS' });
    let sock;
    if (useTls) {
      sock = tls.connect({ ...tlsOptions(h), port: p });
      await waitFor(sock, 'secureConnect', connectTimeoutMs, tlsError);
      if (!sock.authorized) { sock.destroy(); throw new ImapError('TLS', 'The mail server’s certificate could not be checked.', { cause: String(sock.authorizationError || 'UNAUTHORIZED') }); }
    } else {
      sock = net.connect({ host: h, port: p });
      await waitFor(sock, 'connect', connectTimeoutMs, (e) => new ImapError('NETWORK', 'The mail server could not be reached.', { cause: String((e && e.code) || 'NETWORK') }));
    }
    sock.setNoDelay(true);

    let onData = () => {}, onClose = () => {}, lastErr = null, closedOnce = false;
    const handlers = {
      data: (b) => onData(new Uint8Array(b.buffer, b.byteOffset, b.length)),
      error: (e) => { lastErr = e; },
      close: () => { if (closedOnce) return; closedOnce = true; onClose(lastErr ? { code: lastErr.code || 'ERROR' } : null); },
    };
    const attach = (s) => { s.on('data', handlers.data); s.on('error', handlers.error); s.on('close', handlers.close); };
    const detach = (s) => { s.off('data', handlers.data); s.off('error', handlers.error); s.off('close', handlers.close); };
    attach(sock);

    const transport = {
      secure: !!(useTls && sock.authorized),
      write(bytes) { sock.write(bytes); },
      onData(fn) { onData = typeof fn === 'function' ? fn : () => {}; },
      onClose(fn) { onClose = typeof fn === 'function' ? fn : () => {}; },
      /** STARTTLS: wrap the plain socket; resolves once the certificate is verified. */
      async startTls() {
        if (transport.secure) return;
        detach(sock);
        const plain = sock;
        const s = tls.connect({ ...tlsOptions(h), socket: plain });
        try { await waitFor(s, 'secureConnect', connectTimeoutMs, tlsError); }
        catch (e) { plain.destroy(); throw e; }
        if (!s.authorized) { s.destroy(); throw new ImapError('TLS', 'The mail server’s certificate could not be checked.', { cause: String(s.authorizationError || 'UNAUTHORIZED') }); }
        sock = s; attach(sock);
        transport.secure = true;
      },
      close() { try { sock.destroy(); } catch { /* closed */ } },
    };
    return transport;
  };
}
