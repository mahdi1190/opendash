import { hostedRelayFor } from '../../lib/hosted-relay.mjs';
import { HttpError } from '../http.mjs';
export default function register(app) {
  const relay = app.ctx.hostedRelay || hostedRelayFor(app.ctx);
  relay.start().catch(() => {});
  app.route({ path: '/api/connections/hosted-relay', method: 'GET', handler: () => relay.refresh() });
  for (const action of ['link', 'approve', 'revoke', 'disconnect']) app.route({ path: '/api/connections/hosted-relay/' + action, method: 'POST', handler: async c => {
    const b = await c.body({ allowEmpty: true });
    try { return action === 'approve' ? await relay.approve(String(b.id || ''), String(b.code || '')) : await relay[action](); }
    catch (e) { throw new HttpError(e.status || 502, e.status ? e.message : 'The shared relay could not be reached. Try again.'); }
  } });
}
