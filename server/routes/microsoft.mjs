// Microsoft browser sign-in. Only the state/PKCE-protected callback accepts
// cross-site navigation; configuration, status and disconnect are same-origin.
import { microsoftFor } from '../../lib/microsoft.mjs';
import { sourcesFor, mutateSources, validateSource, newSourceId } from '../../lib/sources.mjs';
import { saveSourceSnapshot } from '../../lib/calendar-sources.mjs';
import { saveInboxSnapshot } from '../../lib/inbox-sources.mjs';
import { clockAddDays } from '../../lib/clock.mjs';
import { esc, HttpError } from '../http.mjs';

export default function register(app) {
  const { dataDir, paths, log } = app.ctx;
  const ms = app.ctx.microsoft || microsoftFor(dataDir), sources = sourcesFor(app.ctx);
  const pauseSources = async () => mutateSources(dataDir, list => { for (const s of list) if (s.kind === 'microsoft') s.enabled = false; }, { fallback: () => sources.all() });
  app.route({ path: '/api/microsoft/status', method: 'GET', handler: () => ms.status() });
  app.route({ path: '/api/microsoft/configure', method: 'PUT', handler: async c => {
    const { clientId } = await c.body();
    try { const out = await ms.configure(clientId); if (out.changed) await pauseSources(); return out; }
    catch (e) { throw new HttpError(e.status || 400, e.message); }
  } });
  app.route({ path: '/api/microsoft/connect', method: 'GET', sameOrigin: true, handler: async c => {
    try { c.res.writeHead(302, { Location: await ms.authUrl(`http://localhost:${c.port}/api/microsoft/callback`), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); c.res.end(); }
    catch (e) { throw new HttpError(e.status || 400, e.message); }
  } });
  app.route({ path: '/api/microsoft/callback', method: 'GET', crossSite: true, handler: async c => {
    c.res.setHeader('Referrer-Policy', 'no-referrer'); c.res.setHeader('Cache-Control', 'no-store');
    const html = (title, text, status = 200) => c.send(status, `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:16px system-ui;padding:3rem;max-width:36rem"><h2>${esc(title)}</h2><p>${esc(text)}</p><p>Close this tab and return to OpenDash.</p>`, 'text/html; charset=utf-8');
    try {
      await ms.callback({ state: c.query.get('state'), code: c.query.get('code'), error: c.query.get('error') });
      const fresh = [];
      // New ids prevent an older account's in-flight fetch or cache being
      // mistaken for data from a newly signed-in Microsoft account.
      await mutateSources(dataDir, list => {
        for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === 'microsoft') list.splice(i, 1);
        for (const capability of ['calendar', 'email']) {
          const input = { id: newSourceId(capability, 'outlook'), capability, kind: 'microsoft', label: capability === 'calendar' ? 'Outlook Calendar' : 'Outlook Mail', colour: 'blue', enabled: true, accounts: [] };
          const result = validateSource(input, { existing: list }); if (result.errors.length) throw new Error('Microsoft source setup failed.');
          fresh.push(result.source); list.push(result.source);
        }
      }, { fallback: () => sources.all() });
      let failures = 0;
      const today = c.clockNow().today, from = clockAddDays(today, -7), to = clockAddDays(today, 90);
      for (const s of fresh) {
        try {
          const got = s.capability === 'calendar' ? await ms.calendar(s, { from, to }) : await ms.email(s, { days: 14, todayIso: today });
          if (s.capability === 'calendar') await saveSourceSnapshot(paths, s.id, { from, to, ...got });
          else await saveInboxSnapshot(paths, s.id, { days: 14, ...got });
          await sources.noteSync(s.id, { ok: true, accounts: got.calendars || got.accounts });
        } catch (e) { failures++; await sources.noteSync(s.id, { ok: false, error: e.message, code: e.code }); }
      }
      log('note', 'Microsoft browser connection completed');
      return html('Microsoft connected', failures ? 'Your account is connected. A first email or calendar update needs another try; use Sync in Connections.' : 'Read-only Outlook email and calendar are ready.');
    } catch (e) { return html('Microsoft could not connect', e.code ? e.message : 'The connection could not finish. Return to OpenDash and try again.', e.status || 400); }
  } });
  app.route({ path: '/api/microsoft/disconnect', method: 'POST', handler: async c => {
    await c.body({ allowEmpty: true }); await pauseSources(); await ms.disconnect(); log('note', 'Microsoft disconnected'); return { ok: true };
  } });
}
