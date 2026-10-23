// server/routes/requests.mjs - remote requests: a job this computer cannot do
// (no Claude here) asked of another of the user's devices, which runs it and
// answers through sync (lib/remote-jobs.mjs, lib/sync/requests.mjs,
// docs/dev/MULTI_DEVICE.md "Connect once, use everywhere").
//
//   GET  /api/requests              -> {requests:[Request]}  this device's own (asked or answered)
//   GET  /api/requests/:id          -> Request | 404
//   POST /api/requests/:id/cancel   -> Request (only the device that asked)
//
//   Request = {id, kind, label, status: queued|running|done|error|cancelled|expired,
//              state: waiting|running|done|error|offline|cancelled|expired,
//              runsOn, online, message, at, exp, result?: {status, body}, error?: {code, message}}
//
// A route marked `remote` (server/router.mjs) answers 202 {remote: Request}
// when it was asked of another device; the page waits on GET /api/requests/:id
// (src/app/56-remote-jobs.js) and then takes `result` as the route's answer.

import { createRemoteJobs } from '../../lib/remote-jobs.mjs';
import { HttpError } from '../http.mjs';

const ID_RE = /^rq_[a-z0-9]{6,40}$/;

export default function register(app) {
  const ctx = app.ctx;
  const rj = createRemoteJobs({ ctx, invoke: (m, p, o) => app.invoke(m, p, o), log: ctx.log || (() => {}) });
  ctx.remoteJobs = rj;
  app.onReady(() => rj.start());
  app.onClose(() => rj.stop());

  app.route({ path: '/api/requests', method: 'GET', quiet: true, handler: async () => ({ requests: await rj.list() }) });
  app.route({
    prefix: '/api/requests/', method: ['GET', 'POST'], quiet: true,
    handler: async (c) => {
      const m = /^\/api\/requests\/([^/]+)(\/cancel)?$/.exec(c.path);
      if (!m || !ID_RE.test(m[1])) throw new HttpError(404, 'unknown request');
      if (m[2]) {
        if (c.method !== 'POST') throw new HttpError(405, 'POST only');
        await c.body({ allowEmpty: true });
        const r = await rj.cancel(m[1]);
        if (!r) throw new HttpError(404, 'unknown request');
        return r;
      }
      if (c.method !== 'GET') throw new HttpError(405, 'GET only');
      const r = await rj.get(m[1]);
      if (!r) throw new HttpError(404, 'unknown request');
      return r;
    },
  });
}
