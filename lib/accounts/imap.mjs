// lib/accounts/imap.mjs - the 'imap' provider: "+ Other email" (Yahoo, AOL,
// iCloud, GMX, Zoho, Fastmail, Proton through Bridge, or any IMAP server),
// signed in with an APP PASSWORD, read-only (docs/dev/ACCOUNTS.md section 6).
//
// PURE JS: no node: imports. The socket comes from ctx.config.openTransport
// (lib/imap-transport.mjs on Node; a native socket plugin in an app). The
// password lives only in the vault (the secret store, on this computer): the
// registry record carries the server name and nothing secret.
//
// Read-only by construction (lib/accounts/imap-wire.mjs): EXAMINE, never
// SELECT; BODY.PEEK, never BODY[; no STORE / COPY / EXPUNGE / APPEND; no SMTP.
// Messages are mapped to exactly the snapshot shape the Microsoft and Google
// providers produce (lib/inbox-sources.mjs), with a short text preview, never
// a body or an attachment.

import { fail, cleanText, cleanEmail, sha256Hex } from './core.mjs';
import { createImapClient, ImapError } from './imap-wire.mjs';
import { decodeWords, pickTextPart, partText, previewText, previewFromEntity, parseHeaders, binaryString } from './mime.mjs';
import { lookupProvider, cleanServer, usernamesFor, isLoopbackHost, IMAP_PROVIDERS } from './imap-providers.mjs';

export const MAX_MESSAGES = 300;
const PREVIEW_OCTETS = { plain: 1200, html: 6000 };
const FALLBACK_TEXT_OCTETS = 3000;

const providerName = (service) => (IMAP_PROVIDERS.find((p) => p.id === service) || {}).name || 'Your email provider';
const safeLink = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && !x.username && !x.password ? x.href : ''; } catch { return ''; } };

// ─── Errors -> plain language ───────────────────────────────────────────
const AUTH_TEXT = /authenticat|credential|password|login|log in|sign[- ]?in|user ?name|invalid|incorrect|denied/i;
const APP_PW_TEXT = /app(?:lication)?[- ]?specific|app password|application password|web ?login required|please log ?in via your web browser|weblogin/i;
const TWO_STEP_TEXT = /two[- ]?(?:step|factor)|2fa|2-?sv|second factor|multi[- ]?factor/i;
const IMAP_OFF_TEXT = /imap\b.{0,40}\b(?:disabled|not enabled|is off|turned off|not allowed|not permitted|not activated|deactivated|access is disabled)|enable imap|(?:disabled|not enabled).{0,30}\bimap|pop3? (?:and|&|\/) imap|yet to enable imap|imap (?:is )?not available|upgrade.{0,40}imap/i;
const BUSY_TEXT = /too many|try again later|temporar|unavailable|overloaded|rate/i;
const IMAP_OFF_HELP = {
  gmx: 'In GMX: Settings > POP3 & IMAP > tick "Enable access to this account via POP3 and IMAP", then try again.',
  zoho: 'In Zoho Mail: Settings > Mail Accounts > your address > tick "IMAP Access", then try again. Zoho’s free plan may not include IMAP.',
  fastmail: 'Fastmail’s Basic plan does not include IMAP. Check your plan in Fastmail.',
};

/**
 * An ImapError (or any error) during a sign-in or a read -> an AccountError
 * with a plain message. who = {service, host, stage: 'connect'|'login'|'read', connected}.
 */
export function classifyImapError(e, { service = 'other', host = '', stage = 'read', connected = false } = {}) {
  if (e && e.code && !(e instanceof ImapError) && e.status) return e;     // already an AccountError
  const name = providerName(service);
  const kind = e && e.kind;
  const t = String((e && e.message) || '');
  const code = String((e && e.code) || '').toUpperCase();
  const loop = isLoopbackHost(host);
  if (kind === 'TIMEOUT') return fail('PROVIDER_NETWORK', 'The mail server took too long to answer. Check your internet connection and try again in a minute.', 504);
  if (kind === 'NETWORK') {
    if (service === 'proton') return fail('BRIDGE_NOT_RUNNING', 'OpenDash could not reach Proton Mail Bridge. Open Bridge on this computer, check it is signed in, and try again.', 502);
    if (loop) return fail('IMAP_UNREACHABLE', 'Nothing answered on this computer at that port. Check the mail program is running, and the port.', 502);
    const cause = String((e && e.cause) || '');
    if (/ENOTFOUND|EAI_AGAIN|ENOENT/i.test(cause)) return fail('IMAP_UNREACHABLE', `OpenDash could not find the mail server ${cleanText(host, 120)}. Check the server name, or your internet connection.`, 502);
    return fail('IMAP_UNREACHABLE', `OpenDash could not reach the mail server ${cleanText(host, 120)}. Check the server name and port, and your internet connection.`, 502);
  }
  if (kind === 'TLS') {
    if (loop || service === 'proton') return fail('IMAP_NOT_TRUSTED', 'OpenDash could not check the security certificate of the mail program on this computer, so it did not send your password. Proton Mail Bridge uses its own certificate, which OpenDash cannot trust yet.', 502);
    return fail('IMAP_NOT_TRUSTED', 'The mail server’s security certificate could not be checked, so OpenDash did not send your password. Check the server name (it must match the provider’s own name, for example imap.example.com).', 502);
  }
  if (kind === 'INSECURE' || code === 'PRIVACYREQUIRED' || code === 'LOGINDISABLED') return fail('IMAP_NOT_SECURE', 'This mail server did not offer a secure connection, so OpenDash did not send your password. Try port 993 with SSL/TLS.', 502);
  if (kind === 'TOO_BIG') return fail('PROVIDER_LIMIT', 'The mail server sent more than OpenDash reads at once. Try again later.', 502);
  if (kind === 'PROTOCOL') return fail('PROVIDER_RESPONSE', 'The mail server answered in a way OpenDash does not understand. Check the server name and port (usually 993).', 502);
  if (kind === 'REFUSED') return fail('BAD_REQUEST', 'OpenDash refused to send that to the mail server.', 400);
  if (kind === 'BYE' && BUSY_TEXT.test(t)) return fail('PROVIDER_BUSY', `${name} is busy right now. Try again in a few minutes.`, 503);
  if (kind === 'NO' || kind === 'BAD' || kind === 'BYE') {
    if (code === 'UNAVAILABLE' || (code !== 'AUTHENTICATIONFAILED' && BUSY_TEXT.test(t) && !AUTH_TEXT.test(t))) return fail('PROVIDER_BUSY', `${name} is busy right now. Try again in a few minutes.`, 503);
    if (IMAP_OFF_TEXT.test(t)) return fail('IMAP_DISABLED', `${name} has IMAP access switched off for this account. ${IMAP_OFF_HELP[service] || 'Switch on "IMAP access" in your email settings, then try again.'}`, 403);
    const authish = stage === 'login' || code === 'AUTHENTICATIONFAILED' || code === 'AUTHORIZATIONFAILED' || code === 'EXPIRED';
    if (authish) {
      if (connected) return fail('NEEDS_SIGN_IN', 'The app password for this account stopped working. Make a new one and paste it in OpenDash.', 401);
      if (TWO_STEP_TEXT.test(t)) return fail('TWO_STEP_NEEDED', `${name} only makes app passwords after two-step verification is on. Turn it on in your ${name} account settings first, then make an app password.`, 401);
      if (APP_PW_TEXT.test(t)) return fail('APP_PASSWORD_NEEDED', `${name} needs an app password here, not your normal password. Follow the steps to make one, then paste it.`, 401);
      if (code === 'CONTACTADMIN') return fail('PROVIDER_REFUSED', `${name} refused the sign-in. Sign in once on the ${name} website (it may ask you to confirm it is you), then try again.`, 403);
      return fail('WRONG_PASSWORD', service === 'other' || service === 'gmx' || service === 'zoho'
        ? 'That password did not work. Check you copied the whole password (an app password, if you made one) and try again.'
        : 'That password did not work. Check you pasted the app password (not your normal password), all of it, and try again.', 401);
    }
    return fail('PROVIDER_RESPONSE', `${name} refused the request. Try again later.`, 502);
  }
  return fail('PROVIDER_NETWORK', 'The mail server could not be reached. Try again.', 502);
}

// ─── Mapping to the OpenDash mail shape ─────────────────────────────────
function addr(list) {
  const a = Array.isArray(list) ? list[0] : null;
  if (!a) return { name: '', email: '' };
  const mailbox = cleanText(a.mailbox, 100), host = cleanText(a.host, 140);
  const email = mailbox && host ? cleanText(`${mailbox}@${host}`, 120).toLowerCase() : '';
  return { name: cleanText(decodeWords(a.name), 120).replace(/^["']+|["']+$/g, ''), email };
}
/**
 * Fetched messages -> snapshot messages (the Microsoft / Google shape).
 *   rows: [{uid, flags, internalDate, envelope, preview}]
 *   ctx: {sourceId, uidValidity, link}
 */
export async function mapMessages(rows, { sourceId = '', uidValidity = 0, link = '' } = {}) {
  const out = [];
  for (const r of rows) {
    if (!r || !r.uid) continue;
    const env = r.envelope || {};
    const dateMs = Date.parse(r.internalDate || '') || Date.parse(env.date || '');
    if (!Number.isFinite(dateMs)) continue;
    const from = addr(env.from && env.from.length ? env.from : env.sender);
    const flags = (r.flags || []).map((f) => String(f).toLowerCase());
    out.push({
      id: 'im' + (await sha256Hex(`${sourceId}|${uidValidity}|${r.uid}`)).slice(0, 24),
      messageId: cleanText(env.messageId, 200) || `imap:${uidValidity}:${r.uid}`,
      threadId: cleanText(env.inReplyTo || env.messageId, 120),
      sourceId, accountId: 'default',
      subject: cleanText(decodeWords(env.subject), 200) || '(no subject)',
      from,
      sender: from.name && from.email ? `${from.name} <${from.email}>` : from.email || from.name,
      date: new Date(dateMs).toISOString(),
      snippet: cleanText(r.preview, 300),
      unread: !flags.includes('\\seen'),
      important: flags.includes('\\flagged'),
      count: 1,
      link: safeLink(link),
    });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

// ─── The provider ───────────────────────────────────────────────────────
/**
 * createImapProvider(ctx) -> provider (docs/dev/ACCOUNTS.md section 6, plus connect()).
 * ctx.config = {
 *   openTransport,   ({host, port, tls}) -> Promise<Transport> (lib/imap-transport.mjs)
 *   timeoutMs?, sessionMs?, limits?,
 *   allowInsecure?,  tests only (the in-process fake server on plain TCP)
 *   lookup?,         async (email) -> provider info (the Node binding adds the MX lookup)
 * }
 */
export function createImapProvider(ctx) {
  const { vault, log = () => {} } = ctx;
  const cfg = ctx.config || {};
  const account = async (id) => (typeof ctx.account === 'function' ? ctx.account(id) : null);
  const lookup = async (email) => (typeof cfg.lookup === 'function' ? cfg.lookup(email) : lookupProvider(email));

  function client(server) {
    if (typeof cfg.openTransport !== 'function') throw fail('NOT_CONFIGURED', 'This copy of OpenDash cannot connect to email servers yet.', 409);
    return createImapClient({
      openTransport: cfg.openTransport, host: server.host, port: server.port, security: server.security,
      timeoutMs: cfg.timeoutMs, sessionMs: cfg.sessionMs, limits: cfg.limits, allowInsecure: cfg.allowInsecure === true, timers: cfg.timers,
    });
  }
  /** Open, sign in (trying each user name), EXAMINE INBOX. -> {c, username, box}. Closes on failure. */
  async function session(server, usernames, password, { service, connected }) {
    const c = client(server);
    let stage = 'connect';
    try {
      await c.open();
      stage = 'login';
      let lastErr = null, username = null;
      for (const u of usernames) {
        try { await c.login(u, password); username = u; break; }
        catch (e) {
          lastErr = e;
          // Only a refused password is worth a second user name (iCloud: the part before @).
          if (!(e instanceof ImapError) || e.kind !== 'NO' || usernames.length < 2) throw e;
        }
      }
      if (!username) throw lastErr || new ImapError('NO', 'Sign-in failed.', { code: 'AUTHENTICATIONFAILED' });
      stage = 'read';
      const box = await c.examine('INBOX');
      return { c, username, box };
    } catch (e) {
      c.close();
      throw classifyImapError(e, { service, host: server.host, stage, connected });
    }
  }

  /**
   * Test an app password and save it: the guided flow's "Test connection".
   * input = {email, password, username?, host?, port?, security?, accountId?, features?}
   * -> Account (no secrets). The password goes to the vault only after it worked.
   */
  async function connect(input = {}) {
    const email = cleanEmail(input.email);
    if (!email) throw fail('BAD_REQUEST', 'Type your whole email address, for example name@yahoo.com.', 400);
    const info = await lookup(email);
    if (info.kind === 'redirect') throw fail('USE_ONE_CLICK', info.message, 400, { retryProvider: info.provider });
    let server = info.imap;
    if (input.host) {
      const s = cleanServer(input);
      if (s.error) throw fail('BAD_REQUEST', s.error, 400);
      server = s;
    }
    if (!server || !server.host) throw fail('BAD_REQUEST', 'Type the mail server name, for example imap.example.com.', 400);
    const service = info.kind === 'known' ? info.id : 'other';
    let password = String(input.password == null ? '' : input.password).trim();
    // App passwords from these services never contain spaces; people paste them with some.
    if (['yahoo', 'aol', 'icloud', 'fastmail'].includes(service)) password = password.replace(/\s+/g, '');
    if (!password) throw fail('BAD_REQUEST', 'Paste the app password first.', 400);
    if (password.length > 512) throw fail('BAD_REQUEST', 'That password is too long. Paste just the app password.', 400);
    const typedUser = cleanText(input.username, 254);
    const usernames = usernamesFor(email, info.username === 'bridge' ? 'email' : info.username, typedUser || null);
    const { c, username, box } = await session(server, usernames, password, { service, connected: false });
    await c.logout();
    const prev = input.accountId ? await account(input.accountId) : null;
    const id = prev && prev.provider === 'imap' && prev.email === email ? prev.id : await ctx.accountIdFor({ provider: 'imap', email });
    await vault.write(id, { provider: 'imap', username, password, host: server.host, port: server.port, security: server.security, service, savedAt: new Date(ctx.now ? ctx.now() : Date.now()).toISOString() });
    log('note', `accounts: IMAP sign-in finished (${service})`);
    return {
      id, provider: 'imap', email, displayName: '', kind: 'personal', scopes: [],
      server: { service, host: server.host, port: server.port, security: server.security },
      features: { mail: !input.features || input.features.mail !== false, calendar: false },
      status: 'connected', error: null,
      inbox: { exists: box.exists },
    };
  }

  async function secretOf(accountId) {
    const doc = await vault.read(accountId);
    if (!doc || doc.provider !== 'imap' || !doc.password || !doc.host) throw fail('NEEDS_SIGN_IN', 'Paste the app password for this account on this computer.', 401);
    return doc;
  }

  /** Recent Inbox messages (previews only) in the snapshot shape of lib/inbox-sources.mjs. */
  async function fetchMail(accountId, { source = {}, days = 14, todayIso } = {}) {
    const acc = await account(accountId);
    const name = (acc && acc.email) || source.label || 'Email';
    if ((source.accounts || []).some((a) => a.id === 'default' && a.enabled === false)) return { accounts: [{ id: 'default', name }], messages: [], count: 0, warnings: [] };
    const doc = await secretOf(accountId);
    const service = doc.service || 'other';
    const server = { host: doc.host, port: doc.port, security: doc.security };
    const daysSafe = Math.min(30, Math.max(1, Number(days) || 14));
    const base = /^\d{4}-\d{2}-\d{2}$/.test(todayIso || '') ? Date.parse(todayIso + 'T00:00:00Z') : (ctx.now ? ctx.now() : Date.now());
    const since = base - daysSafe * 86400000;
    const { c, box } = await session(server, [doc.username], doc.password, { service, connected: true });
    const warnings = [];
    let rows = [];
    try {
      let uids = await c.uidSearchSince(since);
      if (uids.length > MAX_MESSAGES) { uids = uids.slice(-MAX_MESSAGES); warnings.push(`Only the newest ${MAX_MESSAGES} messages are shown.`); }
      if (uids.length) {
        const meta = await c.uidFetch(uids, '(UID FLAGS INTERNALDATE ENVELOPE BODYSTRUCTURE)');
        rows = meta.map((m) => ({ uid: m.uid, flags: m.flags || [], internalDate: m.internalDate, envelope: m.envelope, structure: m.bodyStructure, preview: '' }));
        await addPreviews(c, rows, warnings);
      }
      if (c.malformed) warnings.push('Some messages could not be read and are left out.');
    } catch (e) {
      c.close();
      throw classifyImapError(e, { service, host: server.host, stage: 'read', connected: true });
    }
    await c.logout();
    const link = (IMAP_PROVIDERS.find((p) => p.id === service) || {}).webmail || '';
    const messages = await mapMessages(rows, { sourceId: source.id || '', uidValidity: box.uidValidity || 0, link });
    return { accounts: [{ id: 'default', name }], messages, count: messages.length, warnings };
  }

  /** Previews: the text part from BODYSTRUCTURE (grouped: one FETCH per part number), else BODY[TEXT] with its headers. */
  async function addPreviews(c, rows, warnings) {
    const groups = new Map(), fallback = [];
    for (const r of rows) {
      let pick = null;
      try { pick = r.structure ? pickTextPart(r.structure) : null; } catch { pick = null; }
      if (r.structure && !pick) continue;                 // no text part at all (an image, a calendar invite)
      if (!pick) { fallback.push(r); continue; }
      if (!/^\d+(?:\.\d+){0,8}$/.test(pick.part)) { fallback.push(r); continue; }
      r.pick = pick;
      const octets = pick.subtype === 'html' ? PREVIEW_OCTETS.html : PREVIEW_OCTETS.plain;
      const key = `${pick.part}|${octets}`;
      if (!groups.has(key)) groups.set(key, { part: pick.part, octets, rows: [] });
      groups.get(key).rows.push(r);
    }
    let failed = false;
    for (const g of groups.values()) {
      try {
        const got = await c.uidFetch(g.rows.map((r) => r.uid), `(UID BODY.PEEK[${g.part}]<0.${g.octets}>)`);
        const byUid = new Map(got.map((m) => [m.uid, m]));
        for (const r of g.rows) {
          const m = byUid.get(r.uid);
          const bytes = m && m.sections[g.part];
          if (bytes) r.preview = previewText(partText(bytes, { type: 'text', subtype: r.pick.subtype, charset: r.pick.charset, encoding: r.pick.encoding }), 300);
        }
      } catch (e) { if (!(e instanceof ImapError) || !['NO', 'BAD'].includes(e.kind)) throw e; failed = true; }
    }
    if (fallback.length) {
      try {
        const got = await c.uidFetch(fallback.map((r) => r.uid), `(UID BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] BODY.PEEK[TEXT]<0.${FALLBACK_TEXT_OCTETS}>)`);
        const byUid = new Map(got.map((m) => [m.uid, m]));
        for (const r of fallback) {
          const m = byUid.get(r.uid);
          if (!m || !m.sections.TEXT) continue;
          r.preview = previewFromEntity(m.sections.TEXT, { headers: parseHeaders(binaryString(m.sections.HEADER || new Uint8Array(0))), max: 300 });
        }
      } catch (e) { if (!(e instanceof ImapError) || !['NO', 'BAD'].includes(e.kind)) throw e; failed = true; }
    }
    if (failed) warnings.push('Some previews could not be read.');
  }

  return {
    id: 'imap',
    async configured() { return typeof cfg.openTransport === 'function' ? { ok: true } : { ok: false, reason: 'This copy of OpenDash cannot connect to email servers yet.' }; },
    lookup,
    connect,
    fetchMail,
    async beginSignIn() { throw fail('BAD_REQUEST', 'This email account connects with an app password: use "+ Other email".', 400); },
    async handleCallback() { throw fail('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again.', 400); },
    async accessToken() { throw fail('BAD_REQUEST', 'Email accounts added with an app password have no access token.', 400); },
    async fetchCalendar() { throw fail('FEATURE_OFF', 'This email account has no calendar in OpenDash. Add a calendar link (ICS) instead.', 409); },
    async disconnect(accountId) { await vault.remove(accountId); },
  };
}
