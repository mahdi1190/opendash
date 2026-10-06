import { localClaudeConnectFor } from '../../lib/local-claude-connect.mjs';
export default function register(app) {
  const flow = app.ctx.localClaudeConnect || localClaudeConnectFor(app.ctx);
  app.route({ path: '/api/connections/local-claude', method: 'GET', handler: () => flow.status() });
  app.route({ path: '/api/connections/local-claude/link', method: 'POST', handler: async c => { await c.body({ allowEmpty: true }); return flow.start(); } });
  app.route({ path: '/api/connections/local-claude/browser', method: 'POST', handler: async c => { await c.body({ allowEmpty: true }); return flow.startBrowser(); } });
}
