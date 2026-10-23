// server/routes/accounts-imap.mjs - "+ Other email" (docs/dev/ACCOUNTS.md,
// the 'imap' provider): Yahoo, iCloud, AOL, GMX, Zoho, Fastmail, Proton Bridge
// and any IMAP server, signed in with an app password, read-only.
//
//   POST /api/accounts/imap/lookup   {email} -> {provider: {kind, id, name, imap, steps, ...}}
//                                    kind 'redirect' (Gmail / Outlook: use the one-click buttons),
//                                    'known', 'other' or 'invalid'. Nothing secret, nothing saved.
//   POST /api/accounts/imap/connect  {email, password, username?, host?, port?, security?, accountId?}
//                                    -> {account, inbox: {exists}, results}: tests the sign-in, saves
//                                    the password in this computer's secret store (never the data
//                                    folder, a response or the log), adds the account, reads its mail once.
//
// The router's checks apply (Host 421, same origin 403, JSON 415, body limit 413).

import { accountsFor } from '../../lib/accounts.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { saveInboxSnapshot } from '../../lib/inbox-sources.mjs';
import { HttpError } from '../http.mjs';

const ID_RE = /^acc_[a-f0-9]{16}$/;
const plain = (e) => (e && e.code && e.status ? e : e instanceof HttpError ? e : new HttpError(500, 'Something went wrong. Try again.', { code: 'FAILED' }));
const field = (v, max) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max));

export default function register(app) {
  const { paths, log } = app.ctx;
  const accounts = () => accountsFor(app.ctx);
  const sources = sourcesFor(app.ctx);

  app.route({ path: '/api/accounts/imap/lookup', method: 'POST', handler: async (c) => {
    const { email } = await c.body();
    try { return { provider: await accounts().imapLookup(field(email, 254)) }; }
    catch (e) { throw plain(e); }
  } });

  app.route({ path: '/api/accounts/imap/connect', method: 'POST', handler: async (c) => {
    const b = await c.body();
    const input = {
      provider: 'imap', email: field(b.email, 254), password: field(b.password, 600),
      ...(b.username ? { username: field(b.username, 254) } : {}),
      ...(b.host ? { host: field(b.host, 253), port: b.port == null || b.port === '' ? undefined : Number(b.port), security: b.security === 'starttls' ? 'starttls' : 'tls' } : {}),
      ...(b.accountId && ID_RE.test(String(b.accountId)) ? { accountId: String(b.accountId) } : {}),
    };
    let out;
    try { out = await accounts().connect(input); }
    catch (e) { throw plain(e); }
    // The first look at the inbox, so the user sees their mail straight away.
    const results = [];
    const today = c.clockNow().today;
    for (const s of await accounts().sourcesOf(out.account.id)) {
      if (!s.enabled || s.capability !== 'email') continue;
      try {
        const got = await accounts().fetchMail(out.account.id, { source: s, days: 14, todayIso: today });
        await saveInboxSnapshot(paths, s.id, { days: 14, ...got });
        await sources.noteSync(s.id, { ok: true, accounts: got.accounts });
        results.push({ feature: 'mail', ok: true, count: got.count });
      } catch (e) {
        const message = e && e.code ? e.message : 'Your mail could not be read yet. OpenDash tries again on its own.';
        await sources.noteSync(s.id, { ok: false, error: message, code: e && e.code }).catch(() => {});
        results.push({ feature: 'mail', ok: false, error: message, code: (e && e.code) || 'FAILED' });
      }
    }
    log('note', `accounts: other email ${out.isNew ? 'added' : 'signed in again'}`);
    return { account: (await accounts().list()).find((a) => a.id === out.account.id) || out.account, inbox: out.inbox || null, results };
  } });
}
