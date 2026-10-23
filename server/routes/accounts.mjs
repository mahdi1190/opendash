// server/routes/accounts.mjs - /api/accounts: the user's mail and calendar
// accounts, any number side by side (docs/dev/ACCOUNTS.md section 9).
//
//   GET  /api/accounts                      -> {accounts, providers}
//   POST /api/accounts/begin                {provider, email, kind?, accountId?} -> {url, kind}
//   GET  /api/accounts/begin?provider=&email=&kind=&accountId=  -> 302 to the provider (opened in a new tab)
//   GET  /api/accounts/callback?code=&state=  -> an HTML page (the only cross-site route here;
//                                              also at /api/microsoft/callback for old app registrations)
//   POST /api/accounts/callback             {state, code?, error?, error_description?} -> {account} (apps)
//   POST /api/accounts/pause                {id, paused} -> {account}
//   POST /api/accounts/features             {id, mail?, calendar?} -> {account}
//   POST /api/accounts/remove               {id} -> {removed}
//   POST /api/accounts/sync                 {id} -> {account, results}
//   POST /api/accounts/fetch-here           {id} -> {ok:false, placeholder:true, message}
//   GET  /api/accounts/approval?id=         -> {consentUrl, mailto, tenant}
//   PUT  /api/accounts/microsoft-app        {clientId | null} -> provider info
//
// The router's checks apply to all of them (Host 421, same origin 403, JSON
// 415, body limits 413); only the GET callback takes a cross-site navigation,
// and it is protected by the single-use state and PKCE. Tokens never appear
// in a response or the log.

import { accountsFor, CALLBACK_PATH, LEGACY_CALLBACK_PATH } from '../../lib/accounts.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { saveSourceSnapshot } from '../../lib/calendar-sources.mjs';
import { saveInboxSnapshot } from '../../lib/inbox-sources.mjs';
import { clockAddDays } from '../../lib/clock.mjs';
import { esc, HttpError } from '../http.mjs';

const ID_RE = /^acc_[a-f0-9]{16}$/;
const STOP = new Set(['NEEDS_SIGN_IN', 'NEEDS_ADMIN_APPROVAL', 'PAUSED', 'NOT_FETCHER', 'UNKNOWN_ACCOUNT', 'DEVICE_NOT_ALLOWED']);

/** A typed error passes through (plain message + code); anything else becomes a plain 500. */
function plain(e) {
  if (e && e.code && e.status) return e;
  if (e instanceof HttpError) return e;
  return new HttpError(500, 'Something went wrong. Try again.', { code: 'FAILED' });
}
const needId = (id) => { if (!ID_RE.test(String(id || ''))) throw new HttpError(400, 'Unknown account.', { code: 'BAD_REQUEST' }); return id; };

// ─── The page the browser lands on after signing in ──────────────────────
function page({ title, lines = [], actions = [], tone = 'ok', back }) {
  const colour = tone === 'ok' ? '#15803d' : tone === 'wait' ? '#b45309' : '#b91c1c';
  const btn = (a) => `<a class="btn${a.primary ? ' primary' : ''}" href="${esc(a.href)}"${a.newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(a.label)}</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} - OpenDash</title>
<style>body{font:17px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f6f7f9;color:#1f2937}main{max-width:34rem;margin:4rem auto;padding:2rem 2.2rem;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
h1{font-size:1.45rem;margin:0 0 1rem;color:${colour}}p{margin:.6rem 0}.actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.4rem}.btn{display:inline-block;padding:.65rem 1.1rem;border-radius:10px;border:1px solid #d1d5db;color:#1f2937;text-decoration:none;font-weight:600}
.btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}.small{color:#6b7280;font-size:.92rem;margin-top:1.4rem}@media (prefers-color-scheme:dark){body{background:#111827;color:#e5e7eb}main{background:#1f2937}.btn{color:#e5e7eb;border-color:#4b5563}.small{color:#9ca3af}}</style></head>
<body><main><h1>${esc(title)}</h1>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<div class="actions">${actions.map(btn).join('')}</div>${back ? `<p class="small">${esc(back)}</p>` : ''}</main></body></html>`;
}

export default function register(app) {
  const { paths, log } = app.ctx;
  const accounts = () => accountsFor(app.ctx);
  const sources = sourcesFor(app.ctx);
  const home = () => `http://localhost:${app.ctx.port}/#view=connections`;
  // Move an old single Microsoft connection into an account at start-up (idempotent).
  app.onReady?.(() => accounts().ready());

  /** Read an account's mail and calendar now (only on its fetcher), saving the snapshots. */
  async function syncAccount(id, c) {
    const svc = accounts();
    const today = c.clockNow().today, from = clockAddDays(today, -7), to = clockAddDays(today, 90);
    const results = [];
    for (const s of await svc.sourcesOf(id)) {
      if (!s.enabled) continue;
      const feature = s.capability === 'calendar' ? 'calendar' : 'mail';
      try {
        const got = feature === 'calendar' ? await svc.fetchCalendar(id, { source: s, from, to }) : await svc.fetchMail(id, { source: s, days: 14, todayIso: today });
        if (feature === 'calendar') await saveSourceSnapshot(paths, s.id, { from, to, ...got });
        else await saveInboxSnapshot(paths, s.id, { days: 14, ...got });
        await sources.noteSync(s.id, { ok: true, accounts: got.calendars || got.accounts });
        results.push({ feature, ok: true, count: got.count });
      } catch (e) {
        const message = e && e.code ? e.message : 'This could not be read. Try again later.';
        await sources.noteSync(s.id, { ok: false, error: message, code: e && e.code });
        results.push({ feature, ok: false, error: message, code: (e && e.code) || 'FAILED' });
        if (e && STOP.has(e.code)) break;
      }
    }
    return results;
  }

  app.route({ path: '/api/accounts', method: 'GET', handler: async () => {
    try { return { accounts: await accounts().list(), providers: await accounts().providersInfo() }; }
    catch (e) { throw plain(e); }
  } });

  const beginInput = (q) => ({ provider: String(q.provider || ''), email: String(q.email || '').slice(0, 254), kind: ['personal', 'work'].includes(q.kind) ? q.kind : undefined,
    accountId: q.accountId && ID_RE.test(String(q.accountId)) ? String(q.accountId) : undefined });
  app.route({ path: '/api/accounts/begin', method: 'POST', handler: async (c) => {
    try { const b = await accounts().begin(beginInput(await c.body())); return { url: b.url, kind: b.kind }; }
    catch (e) { throw plain(e); }
  } });
  // The page opens this in a new tab (a direct navigation, so no pop-up blocker).
  app.route({ path: '/api/accounts/begin', method: 'GET', sameOrigin: true, handler: async (c) => {
    c.res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const b = await accounts().begin(beginInput(Object.fromEntries(c.query)));
      c.res.writeHead(302, { Location: b.url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); c.res.end();
    } catch (e) {
      const known = e && e.code && e.status;
      return c.send(known ? e.status : 500, page({ title: 'Sign-in could not start', tone: 'err', lines: [known ? e.message : 'Something went wrong. Try again.'], actions: [{ label: 'Back to OpenDash', href: home(), primary: true }] }), 'text/html; charset=utf-8');
    }
  } });

  async function callbackPage(c) {
    c.res.setHeader('Referrer-Policy', 'no-referrer'); c.res.setHeader('Cache-Control', 'no-store');
    const html = (status, opts) => c.send(status, page({ back: 'You can close this tab and go back to OpenDash.', ...opts }), 'text/html; charset=utf-8');
    // "Your organisation needs to approve OpenDash once": the admin link and the ready-made email.
    const approvalPage = (account) => {
      const ap = account && account.approval;
      const org = (account && account.email && account.email.split('@')[1]) || 'your organisation';
      return html(200, {
        title: 'Your organisation needs to approve OpenDash once', tone: 'wait',
        lines: [`Your work account belongs to ${org}. It only lets apps in after an administrator says yes. This is normal for work accounts and only needs doing once.`,
          'If you look after your organisation’s Microsoft 365 yourself, approve it now. If not, send the ready-made email to your IT team.',
          'When it has been approved, go back to OpenDash and press Try again.'],
        actions: ap ? [{ label: 'I am the admin: approve OpenDash', href: ap.consentUrl, primary: true }, { label: 'Email my IT team', href: ap.mailto }, { label: 'Back to OpenDash', href: home() }] : [{ label: 'Back to OpenDash', href: home(), primary: true }],
      });
    };
    const q = Object.fromEntries(['state', 'code', 'error', 'error_description', 'error_subcode', 'admin_consent', 'tenant'].map((k) => [k, c.query.get(k)]).filter(([, v]) => v != null));
    try {
      const out = await accounts().callback(q);
      if (out.adminConsent !== undefined) {
        return out.adminConsent
          ? html(200, { title: 'OpenDash is approved', lines: ['Thank you. Your organisation now allows OpenDash to read mail and calendars (read-only).', 'Go back to OpenDash and press Try again on the account.'], actions: [{ label: 'Back to OpenDash', href: home(), primary: true }] })
          : html(400, { title: 'Approval did not finish', tone: 'err', lines: ['The approval was cancelled or could not finish.'], actions: [{ label: 'Back to OpenDash', href: home(), primary: true }] });
      }
      const a = out.account;
      const results = await syncAccount(a.id, c).catch(() => []);
      log('note', `accounts: ${a.provider} sign-in completed`);
      // Signed in, but the organisation blocks reading the mailbox (Graph 403): the same approval page.
      if (results.some((r) => r.code === 'NEEDS_ADMIN_APPROVAL')) return approvalPage((await accounts().list()).find((x) => x.id === a.id) || a);
      const failed = results.some((r) => !r.ok);
      return html(200, {
        title: 'Your account is connected',
        lines: [`${a.email} is now connected to OpenDash.`, failed ? 'The first look at your mail and calendar needs another try. OpenDash tries again on its own.' : 'Your mail and calendar are on their way into OpenDash. Nothing is ever sent, changed or deleted.'],
        actions: [{ label: 'Back to OpenDash', href: home(), primary: true }],
      });
    } catch (e) {
      if (e && e.code === 'NEEDS_ADMIN_APPROVAL') return approvalPage(e.account);
      if (e && e.code === 'WRONG_ACCOUNT_TYPE') {
        const kind = e.retryKind === 'work' ? 'work' : 'personal';
        const retry = e.email ? `/api/accounts/begin?${new URLSearchParams({ provider: 'microsoft', email: e.email, kind })}` : null;
        return html(200, { title: kind === 'work' ? 'This looks like a work account' : 'This looks like a personal account', tone: 'wait', lines: [e.message],
          actions: [...(retry ? [{ label: kind === 'work' ? 'Try again as a work account' : 'Try again as a personal account', href: retry, primary: true }] : []), { label: 'Back to OpenDash', href: home(), primary: !retry }] });
      }
      const known = e && e.code && e.status;
      return html(known ? e.status : 400, { title: 'The sign-in did not finish', tone: 'err', lines: [known ? e.message : 'The connection could not finish. Go back to OpenDash and try again.'], actions: [{ label: 'Back to OpenDash', href: home(), primary: true }] });
    }
  }
  app.route({ path: CALLBACK_PATH, method: 'GET', crossSite: true, handler: callbackPage });
  // App registrations made with the old instructions return here.
  app.route({ path: LEGACY_CALLBACK_PATH, method: 'GET', crossSite: true, handler: callbackPage });
  // Mobile / web clients bring the returned parameters themselves.
  app.route({ path: CALLBACK_PATH, method: 'POST', handler: async (c) => {
    const b = await c.body();
    const q = {};
    for (const k of ['state', 'code', 'error', 'error_description']) if (typeof b[k] === 'string') q[k] = b[k].slice(0, 8192);
    try {
      const out = await accounts().callback(q);
      if (out.account) await syncAccount(out.account.id, c).catch(() => []);
      return out;
    } catch (e) { throw plain(e); }
  } });

  app.route({ path: '/api/accounts/pause', method: 'POST', handler: async (c) => {
    const { id, paused } = await c.body();
    try { return { account: paused === false ? await accounts().resume(needId(id)) : await accounts().pause(needId(id)) }; }
    catch (e) { throw plain(e); }
  } });
  app.route({ path: '/api/accounts/features', method: 'POST', handler: async (c) => {
    const { id, mail, calendar } = await c.body();
    try {
      const account = await accounts().setFeatures(needId(id), { ...(typeof mail === 'boolean' ? { mail } : {}), ...(typeof calendar === 'boolean' ? { calendar } : {}) });
      if (mail === true || calendar === true) syncAccount(account.id, c).catch(() => {});
      return { account };
    } catch (e) { throw plain(e); }
  } });
  app.route({ path: '/api/accounts/remove', method: 'POST', handler: async (c) => {
    const { id } = await c.body();
    try { return await accounts().remove(needId(id)); }
    catch (e) { throw plain(e); }
  } });
  app.route({ path: '/api/accounts/sync', method: 'POST', handler: async (c) => {
    const { id } = await c.body();
    try {
      needId(id);
      const results = await syncAccount(id, c);
      return { account: (await accounts().list()).find((a) => a.id === id) || null, results };
    } catch (e) { throw plain(e); }
  } });
  app.route({ path: '/api/accounts/fetch-here', method: 'POST', handler: async (c) => {
    const { id } = await c.body();
    try { return await accounts().fetchHere(needId(id)); }
    catch (e) { throw plain(e); }
  } });
  app.route({ path: '/api/accounts/approval', method: 'GET', handler: async (c) => {
    try { return (await accounts().approvalHelp(needId(c.query.get('id')))) || { consentUrl: null, mailto: null }; }
    catch (e) { throw plain(e); }
  } });
  app.route({ path: '/api/accounts/microsoft-app', method: 'PUT', handler: async (c) => {
    const { clientId } = await c.body();
    try { await accounts().microsoftApp.set(clientId == null ? null : String(clientId)); return (await accounts().providersInfo()).microsoft; }
    catch (e) { throw plain(e); }
  } });
}
