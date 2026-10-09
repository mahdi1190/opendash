// Health uses its own credentials and tokens; Gmail/Calendar consent is unchanged.
// Only the expiring, one-use OAuth callback accepts cross-site navigation.
import { googleHealthFor } from '../../lib/google-health.mjs';
import { esc, HttpError } from '../http.mjs';

export default function register(app) {
  const health = app.ctx.googleHealth || googleHealthFor(app.ctx.dataDir);
  const redirectUri = c => `http://localhost:${c.port}/api/google-health/callback`;
  const safeError = e => new HttpError(e.status || 500, e.code ? e.message : 'Google Health could not complete the request.', { code: e.code || 'GOOGLE_HEALTH_ERROR' });
  app.route({ path: '/api/google-health/status', method: 'GET', handler: c => health.status({ redirectUri: redirectUri(c) }) });
  app.route({ path: '/api/google-health/configure', method: 'PUT', handler: async c => {
    const { credentials } = await c.body();
    try { return { ...(await health.configure(credentials)), redirectUri: redirectUri(c) }; } catch (e) { throw safeError(e); }
  } });
  app.route({ path: '/api/google-health/connect', method: 'GET', sameOrigin: true, handler: async c => {
    try { c.res.writeHead(302, { Location: await health.authUrl(redirectUri(c)), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); c.res.end(); }
    catch (e) { throw safeError(e); }
  } });
  app.route({ path: '/api/google-health/callback', method: 'GET', crossSite: true, handler: async c => {
    c.res.setHeader('Referrer-Policy', 'no-referrer'); c.res.setHeader('Cache-Control', 'no-store');
    let title, message, status = 200;
    try {
      await health.callback({ state: c.query.get('state'), code: c.query.get('code'), error: c.query.get('error') });
      title = 'Google Health connected'; message = 'Your linked Google Health account is ready for read-only steps and sleep sync.';
      try { await health.sync({ today: c.clockNow().today }); }
      catch (e) {
        const current = await health.status();
        if (current.connected) message = 'Your Google Health account is connected. The first update needs another try; use Sync in Connections.';
        else { title = 'Google Health needs reconnection'; message = current.error || 'Google Health sign-in is no longer valid. Return to Connections and sign in again.'; status = e.status || 400; }
      }
      app.ctx.log?.('note', 'Google Health browser connection completed');
    } catch (e) { title = 'Google Health could not connect'; message = e.code ? e.message : 'The connection could not finish. Return to OpenDash and try again.'; status = e.status || 400; }
    return c.send(status, `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:16px system-ui;padding:3rem;max-width:36rem"><h2>${esc(title)}</h2><p>${esc(message)}</p><p><a href="/#view=connections">Return to OpenDash Connections</a></p></body>`, 'text/html; charset=utf-8');
  } });
  app.route({ path: '/api/google-health/sync', method: 'POST', handler: async c => {
    await c.body({ allowEmpty: true });
    try { return await health.sync({ today: c.clockNow().today }); } catch (e) { throw safeError(e); }
  } });
  app.route({ path: '/api/google-health/disconnect', method: 'POST', handler: async c => {
    await c.body({ allowEmpty: true });
    try { const out = await health.disconnect(); app.ctx.log?.('note', 'Google Health disconnected'); return out; } catch (e) { throw safeError(e); }
  } });
}
