// server/routes/fin-connect.mjs - direct bank and wallet connections
// (lib/fin-connect/; design docs/dev/FINANCE_CONNECTIONS.md 3.6).
//
//   GET   /api/fin-connect/providers            catalogue + per-provider status (no secrets)
//   GET   /api/fin-connect/accounts             every bank account across providers (Your accounts)
//   PATCH /api/fin-connect/accounts/:key        {name?, colour?, enabled?, keep?:'this'|'other'}
//   POST  /api/fin-connect/sources/:id/sync     a finance update for that source only -> 202 {job}
//   POST  /api/fin-connect/sources/:id/disconnect {removeData?} -> {ok, removed, undo}
//   POST  /api/fin-connect/undo                 {token} -> puts removed rows back
//   GET/POST /api/fin-connect/fake              {provider, ...settings}: a fake provider's settings
//                                               (only in fake mode; 404 otherwise)
//   + each provider's own routes (provider.routes(app, svc, helpers)), e.g.
//     /api/fin-connect/monzo/... (lib/fin-connect/monzo.mjs)
//
// The router applies the Host check (421), same-origin on every /api/ request
// (403), JSON content type (415) and body limits (413, SMALL_BODY). Only the
// OAuth return routes a provider marks crossSite: true take a navigation from
// another site (GET, one-use state, 10 minute expiry). Errors are typed
// (FinError: {error, code}); messages never repeat input.

import { finConnectFor, loadProviders } from '../../lib/fin-connect/index.mjs';
import { FinError } from '../../lib/fin-connect/provider.mjs';
import { esc } from '../http.mjs';

const BASE = '/api/fin-connect/';

/**
 * A small self-contained page for the OAuth return tab (light and dark, no
 * external assets). `close: true` closes the tab after a moment when OpenDash
 * opened it.
 */
export function callbackPage(c, { title, text, ok = true, close = false, status = 200 }) {
  c.res.setHeader('Referrer-Policy', 'no-referrer');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>${esc(title)} · OpenDash</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1d2330;--sub:#5b6474;--line:#e3e6ec;--acc:${ok ? '#1f8a5b' : '#b4462f'}}
@media (prefers-color-scheme:dark){:root{--bg:#12151b;--card:#1b1f27;--ink:#e8ebf1;--sub:#a1a9b8;--line:#2a303b;--acc:${ok ? '#4cc38a' : '#ef7d63'}}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
main{max-width:30rem;width:100%;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px 28px 22px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
.mark{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--acc) 15%,transparent);color:var(--acc);font-weight:700;font-size:20px;margin-bottom:12px}
h1{font-size:1.25rem;margin:0 0 8px}p{margin:0 0 12px;color:var(--sub)}.lock{font-size:.85rem;border-top:1px solid var(--line);padding-top:12px;margin-top:16px}
</style></head><body><main><div class="mark" aria-hidden="true">${ok ? '&#10003;' : '!'}</div><h1>${esc(title)}</h1><p>${esc(text)}</p>
<p>Return to OpenDash: this tab can be closed.</p><p class="lock">OpenDash can only read your accounts. It can never move money.</p></main>
${close ? '<script>setTimeout(function(){try{if(window.opener)window.close()}catch(e){}},2500)</script>' : ''}</body></html>`;
  return c.send(status, html, 'text/html; charset=utf-8');
}

export default async function register(app) {
  const { log } = app.ctx;
  await loadProviders(log);
  const svc = finConnectFor(app.ctx);
  await svc.ready();

  app.route({ path: BASE + 'providers', method: 'GET', methodError: 'GET only', handler: () => svc.catalogue() });
  app.route({ path: BASE + 'accounts', method: 'GET', methodError: 'GET only', handler: () => svc.accounts() });

  app.route({
    prefix: BASE + 'accounts/', method: 'PATCH', methodError: 'PATCH only',
    handler: async (c) => {
      const key = decodeURIComponent(c.path.slice((BASE + 'accounts/').length));
      const b = await c.body();
      const patch = {};
      for (const k of ['name', 'colour', 'enabled', 'keep']) if (k in b) patch[k] = b[k];
      if (!Object.keys(patch).length) throw new FinError('BAD_REQUEST', 'Nothing to change.');
      return { ok: true, account: await svc.patchAccount(key, patch) };
    },
  });

  app.route({
    prefix: BASE + 'sources/', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const m = /^([a-z0-9][a-z0-9-]{1,40})\/(sync|disconnect)$/.exec(c.path.slice((BASE + 'sources/').length));
      if (!m) throw new FinError('NOT_FOUND', 'Unknown connection action.');
      const [, id, action] = m;
      const b = await c.body({ allowEmpty: true });
      const s = await svc.getSource(id);
      if (!s || s.capability !== 'bank') throw new FinError('NOT_FOUND', 'That connection is not there any more.');
      if (action === 'sync') {
        if (s.kind === 'direct' && s.setup) throw new FinError('NOT_CONFIGURED', 'Finish connecting this first.');
        const r = await svc.requestSync(id, { full: b.full === true });
        if (r.error) throw new FinError('BAD_REQUEST', r.error);
        if (!r.started) return c.json(409, { error: 'An update is already running.', code: 'BUSY', job: r.job });
        log('note', `fin-connect: sync started for one ${s.kind === 'direct' ? s.provider : 'bank'} source`);
        return c.json(202, { job: r.job });
      }
      if (s.kind !== 'direct') throw new FinError('NOT_SUPPORTED', 'Disconnect this one from its own card in Connections.');
      return svc.disconnect(id, { removeData: b.removeData === true });
    },
  });

  app.route({
    path: BASE + 'undo', method: 'POST', methodError: 'POST only',
    handler: async (c) => svc.undoRemove((await c.body()).token),
  });

  // Fake providers (tests, screenshots): change their behaviour at run time.
  app.route({
    path: BASE + 'fake', method: ['GET', 'POST'],
    handler: async (c) => {
      const fakes = svc.providers().map(p => [p.id, svc.fake(p.id)]).filter(([, f]) => f);
      if (!fakes.length) return c.json(404, { error: 'no fake provider is on' });
      if (c.method === 'GET') return { fakes: Object.fromEntries(fakes.map(([id, f]) => [id, f.settings ? f.settings() : {}])) };
      const b = await c.body();
      const f = svc.fake(String(b.provider || ''));
      if (!f) throw new FinError('NOT_FOUND', 'That fake provider is not on.');
      const { provider, ...patch } = b;
      return { ok: true, settings: f.configure ? f.configure(patch) : {} };
    },
  });

  // Each provider's own routes (Monzo's wizard, Plasma's preview, Enable Banking's app...).
  for (const p of svc.providers()) {
    if (typeof p.routes !== 'function') continue;
    try { await p.routes(app, svc, { callbackPage, BASE }); }
    catch (e) { log('warn', `fin-connect: ${p.id} routes failed to register (${String(e && e.message || e).slice(0, 120)})`); }
  }

  app.route({ prefix: BASE, method: '*', handler: (c) => c.json(404, { error: 'unknown connection route', code: 'NOT_FOUND' }) });
}
