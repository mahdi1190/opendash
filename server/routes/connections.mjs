// server/routes/connections.mjs - what is connected, so the page can grey out
// features until a connection exists, and the "Connect" helpers.
//
//   GET  /api/connections[?refresh=stale]
//        -> {claude, gmail, calendar, bank, mcp, google, checking:[ids], cli:{installed}}
//           each {status, state, checkedAt, message, code, checking}
//           state: ok | auth | setup | limited | error | unknown (see lib/connections.mjs)
//           refresh=stale re-checks, in the background, anything older than an hour
//   POST /api/connections/probe          {id:'claude'|'gmail'|'calendar'|'bank'|'mcp'}
//        -> the fresh entry (runs one harmless check through lib/claude-runner.mjs)
//   POST /api/connections/open-terminal  {}  -> {opened, how}
//        opens a terminal window running `claude` so the user can sign in
//        (/login) or re-authenticate a connector (/mcp). Never sends input.
//   GET  /api/connections/mcp            -> {install (commands, see mcp/install.mjs), installed:{entries, summary}}
//   POST /api/connections/mcp-test       -> {ok, ms, tools, protocolVersion, today, error}
//
// Nothing here accepts or stores a password, key or token.

import { createConnections, installStatus, cliFacts, testMcp } from '../../lib/connections.mjs';
import { openClaudeTerminal } from '../../lib/claude-runner.mjs';
import { googleStatus } from '../../lib/google.mjs';
import { installInfo } from '../../mcp/install.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const { dataDir, log } = app.ctx;
  // claude mcp list (lib/sources.mjs) is the primary health signal; the hourly connector probes only run when it is unavailable.
  const conns = createConnections({ dataDir, log, discoveryOk: () => { const d = sourcesFor(app.ctx).cached(); return !!(d && Array.isArray(d.servers)); } });
  app.ctx.connections = conns;          // other route files (diagnostics) read the same instance

  app.route({
    path: '/api/connections', method: 'GET',
    handler: async (c) => {
      if (c.query.get('refresh') === 'stale') conns.checkStale();
      const all = await conns.list();
      const g = await googleStatus().catch(() => null);
      if (g) all.google = { ...all.google, status: g.connected ? 'connected' : g.configured ? 'configured' : 'not-set-up', state: g.connected ? 'ok' : g.configured ? 'auth' : 'setup', account: g.account || null };
      all.cli = cliFacts();
      delete all.cli.path;              // the page does not need the executable's path
      // Sources (lib/sources.mjs): per capability, is at least one enabled source healthy?
      // The page gates bank/calendar/email features on these first, the old entries second.
      try {
        const st = await sourcesFor(app.ctx).status({ discover: 'cached', claudeOk: all.claude && all.claude.state === 'ok' ? true : all.claude && ['setup', 'auth'].includes(all.claude.state) ? false : null });
        all.capabilities = st.capabilities;
        all.sources = st.sources.map(s => ({ id: s.id, capability: s.capability, kind: s.kind, label: s.label, colour: s.colour, enabled: s.enabled, state: s.health && s.health.state, message: s.health && s.health.message }));
        all.discovery = { at: st.discovery.at, error: st.discovery.error, servers: Array.isArray(st.servers) ? st.servers.length : null };
      } catch (e) { log('warn', `connections: sources status failed (${e.message})`); }
      return all;
    },
  });

  app.route({
    path: '/api/connections/probe', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const { id } = await c.body();
      if (!['claude', 'gmail', 'calendar', 'bank', 'mcp'].includes(id)) throw new HttpError(400, 'unknown connection');
      const entry = await conns.check(id, { manual: true });
      return { ...entry, state: (await conns.list())[id].state };
    },
  });

  app.route({
    path: '/api/connections/open-terminal', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await c.body({ allowEmpty: true });
      try {
        const r = openClaudeTerminal();
        log('note', `opened a sign-in terminal (${r.opened ? 'ok' : 'no terminal'})`);
        return r;
      } catch (e) {
        if (e.code === 'CLI_MISSING') return c.json(409, { error: e.message, code: e.code });
        throw e;
      }
    },
  });

  app.route({
    path: '/api/connections/mcp', method: 'GET',
    handler: async () => ({ install: installInfo({ dataDir }), installed: installStatus({ dataDir }) }),
  });

  app.route({
    path: '/api/connections/mcp-test', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await c.body({ allowEmpty: true });
      const r = await conns.check('mcp', { manual: true });
      return { ok: r.status === 'connected', tools: r.tools ?? null, error: r.status === 'connected' ? null : r.message, entry: r };
    },
  });

  app.onClose(() => { /* checks are awaited by their callers; nothing long-lived to stop */ });
}

export { testMcp };
