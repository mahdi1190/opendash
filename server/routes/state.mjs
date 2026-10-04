// server/routes/state.mjs - the dashboard state file.
//
//   GET  /api/state   -> the state JSON (404 if none yet)
//   PUT  /api/state   -> replace it; body = whole state with _lastSave = the
//   POST /api/state      version this tab last loaded/wrote (POST is what
//                        navigator.sendBeacon uses on tab close).
//                        200 {ok, taskCount, lastSave, written}
//                        409 {error, lastSave} if the file is newer
//
// See server/state-store.mjs for the protocol and backup policy.

import { DEFAULT_MAX_BODY, MIME } from '../http.mjs';

export default function register(app) {
  const { store, log } = app.ctx;

  app.route({
    path: '/api/state', method: 'GET', methodError: 'GET or PUT only',
    handler: async (c) => {
      const r = await store.readText();
      if (!r) return c.json(404, { error: 'no state yet' });
      c.send(200, r.text, MIME['.json'], r.recoveredFrom ? { 'X-State-Recovered': '1' } : {});
    },
  });

  app.route({
    path: '/api/state', method: ['PUT', 'POST'], maxBody: DEFAULT_MAX_BODY, methodError: 'GET or PUT only',
    handler: async (c) => {
      const text = await c.text();
      try {
        const r = await store.write(text);
        if (r.written) log('note', `saved state (${r.taskCount} tasks)${r.backups.length ? ' + backup ' + r.backups.join('+') : ''}`);
        return { ok: true, taskCount: r.taskCount, lastSave: r.lastSave, written: r.written };
      } catch (e) {
        if (e.status === 409) return c.json(409, { error: e.message, lastSave: e.lastSave });
        throw e;
      }
    },
  });
}
