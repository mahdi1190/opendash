// server/routes/main-computer.mjs - Settings > Sync > "Main computer"
// (lib/main-computer.mjs): which computer runs the automatic background jobs
// (bank updates, AI summaries and reviews, story scripts, calendar and email
// updates). The others show "Runs on <name>".
//
//   GET  /api/main-computer      -> {mode: sync|local, me, main, isMain, computers:[...], jobs:[{id, label, runsOn, here}]}
//   POST /api/main-computer      {id} -> the same; id = a computer's id, 'this', or null (every computer runs its jobs)
//
// app.ctx.mainComputer.gate(job, {automatic}) is what the job routes ask
// before an automatic run (calendar.mjs, inbox.mjs, finance.mjs, brief.mjs,
// story.mjs); a "no" is answered as skipped with runsOn, never as an error.

import { hostname } from 'node:os';
import { createMainComputer } from '../../lib/main-computer.mjs';
import { readHosts } from '../../lib/hosts.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const presence = () => (ctx.hosts && ctx.hosts.presence) || null;
  const mc = createMainComputer({
    dataDir: root,
    sync: () => ctx.sync || null,                       // registered later (server/routes/sync.mjs)
    me: () => { const p = presence(); return { id: p ? p.hostId : null, name: p ? p.hostname : hostname() }; },
    computers: () => {
      const p = presence(), now = Date.now();
      return readHosts(root).filter(h => !p || h.hostId !== p.hostId).map(h => ({ id: h.hostId, name: h.hostname, lastSeenMs: Math.max(0, now - h.beatAt) }));
    },
    paused: () => !!(ctx.moveGate && ctx.moveGate.paused),
  });
  ctx.mainComputer = mc;

  app.route({
    path: '/api/main-computer', method: ['GET', 'POST'], methodError: 'GET or POST', quiet: true,
    handler: async (c) => {
      if (c.method === 'GET') return mc.status();
      const origin = c.req.headers.origin, sfs = c.req.headers['sec-fetch-site'];
      if (!(origin === `http://localhost:${c.port}` || origin === `http://127.0.0.1:${c.port}` || sfs === 'same-origin')) throw new HttpError(403, 'only the OpenDash page can do this');
      const b = await c.body();
      if (b.id !== null && (typeof b.id !== 'string' || b.id.length > 80)) throw new HttpError(400, 'id must be a computer id, "this" or null');
      try {
        const st = await mc.set(b.id);
        ctx.log('note', `main computer: ${st.main ? st.main.name : 'none (every computer runs its jobs)'}`);
        return st;
      } catch (e) { throw e.status ? new HttpError(e.status, e.message, { code: e.code }) : e; }
    },
  });
}
