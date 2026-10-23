// server/routes/claude-host.mjs - Settings > Sync "Claude": where Claude work runs
// (lib/sync/claude-host.mjs, lib/remote-jobs.mjs; docs/dev/MULTI_DEVICE.md "The Claude host").
//
//   GET  /api/claude-host   -> {sync, mode, modes, here, host:{name, me, online}|null, chosen, main,
//                               hosts:[{id, name, me, online, host}], route:{run, why, text}}
//   POST /api/claude-host   {mode?: 'host-first'|'local'|'host-only', host?: <device id>|'this'|'main'} -> the same
//
//   mode   this computer's own "Run Claude on" (never synced): <host> first, then this
//          computer (default) / this computer only / only <host>
//   host   which computer is the Claude host for every device (roles.json `claude`,
//          synced); 'main' follows the main computer
//   route.text  "Claude: using Home laptop", "Home laptop is off: using this computer", ...
//
// Same-origin only, like every /api/ route (server/router.mjs).

import { HttpError } from '../http.mjs';

export default function register(app) {
  const rj = () => {
    const r = app.ctx.remoteJobs;
    if (!r || typeof r.hostStatus !== 'function') throw new HttpError(503, 'Not ready yet. Try again in a moment.');
    return r;
  };
  const fail = (c, e) => { if (e && e.status === 400) return c.json(400, { error: e.message, code: e.code }); throw e; };
  app.route({ path: '/api/claude-host', method: 'GET', quiet: true, handler: () => rj().hostStatus() });
  app.route({
    path: '/api/claude-host', method: 'POST',
    handler: async (c) => {
      const b = (await c.body({ allowEmpty: true })) || {};
      const r = rj();
      try {
        if (b.mode !== undefined) await r.setMode(typeof b.mode === 'string' ? b.mode : '');
        if (b.host !== undefined) await r.setHost(typeof b.host === 'string' ? b.host.slice(0, 40) : null);
        return await r.hostStatus();
      } catch (e) { return fail(c, e); }
    },
  });
}
