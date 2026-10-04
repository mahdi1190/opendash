// server/routes/inbox.mjs - recent email for Email triage and People (lib/inbox.mjs).
//
//   GET  /api/inbox?days=N        -> {status:'ok'|'empty', source, fetchedAt, days, count, messages, job, lastUpdate}
//                                    (messages newer than N days; all when N is absent)
//   GET  /api/inbox/status        -> {job, lastUpdate, fetchedAt, source}
//   POST /api/inbox/update        {days?, force?} -> 202 {job}; 200 {skipped} if the last try was
//                                    under 30 minutes ago and not forced; 409 while one runs
//   GET  /api/inbox/person?email=a&email=b&name=Sam -> {messages} (from those addresses)
//
// Only Gmail search_threads is allowed for the fetch (subjects, senders,
// snippets; no bodies). The log gets counts only, never email text.

import { createInboxService, MAX_DAYS } from '../../lib/inbox.mjs';
import { fetchEmailSource, saveInboxSnapshot, readInboxSnapshot, mergeInboxData } from '../../lib/inbox-sources.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { HttpError } from '../http.mjs';

// Sources: GET /api/inbox merges every enabled email source (the Gmail preset
// plus any other mailbox MCP server) into one list; each message carries
// sourceId + accountId, and `accounts` lists the mailboxes for the chips.

export default function register(app) {
  const { dataDir, paths, log, getConfig } = app.ctx;
  const sources = sourcesFor(app.ctx);
  const hooks = {
    list: async () => (await sources.all()).filter(s => s.capability === 'email'),
    readSnapshots: async (list) => {
      const out = {};
      for (const s of list) if (s.preset !== 'gmail') out[s.id] = await readInboxSnapshot(paths, s.id).catch(() => null);
      return out;
    },
    merge: mergeInboxData,
    noteSync: (id, r) => sources.noteSync(id, r),
    fetchOther: async (s, { days, todayIso }) => {
      const disc = sources.cached();
      const r = await fetchEmailSource(s, { days, todayIso, serverDef: sources.serverDef(s.server), denyServers: ((disc && disc.servers) || []).filter(x => x.kind === 'claude.ai').map(x => x.name) });
      await saveInboxSnapshot(paths, s.id, { days, ...r });
      log('note', `email source: ${r.count} messages`);
      return r;
    },
  };
  const inbox = createInboxService({ dataDir, paths, getConfig, log, sources: hooks });
  app.ctx.inbox = inbox;
  app.onReady?.(() => inbox.ensureImported().catch((e) => log('warn', `inbox import failed: ${e.message}`)));

  app.route({
    path: '/api/inbox', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const raw = c.query.get('days');
      const days = raw == null || raw === '' ? null : Number(raw);
      if (days !== null && !(days > 0 && days <= MAX_DAYS)) throw new HttpError(400, `days must be 1-${MAX_DAYS}`);
      await inbox.ensureImported().catch(() => {});
      return inbox.read({ days });
    },
  });

  app.route({ path: '/api/inbox/status', method: 'GET', quiet: true, handler: () => inbox.status() });

  app.route({
    path: '/api/inbox/person', method: 'GET',
    handler: async (c) => {
      const emails = c.query.getAll('email').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 10);
      const names = c.query.getAll('name').map(s => s.trim()).filter(Boolean).slice(0, 10);
      if (!emails.length && !names.length) throw new HttpError(400, 'email or name is required');
      return { messages: await inbox.forPerson({ emails, names }, 20) };
    },
  });

  app.route({
    path: '/api/inbox/update', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const body = await c.body({ allowEmpty: true });
      const r = await inbox.start({ days: body.days, force: body.force === true });
      if (r.started) return c.json(202, { job: r.job });
      if (r.reason === 'running') return c.json(409, { error: 'An update is already running.', job: r.job });
      if (r.reason === 'no-sources') return c.json(409, { error: 'No mailbox is connected yet: add one in Connections.', code: 'NO_SOURCES', job: r.job });
      return { skipped: true, reason: r.reason, job: r.job, lastUpdate: r.lastUpdate || null };
    },
  });

  app.route({ prefix: '/api/inbox/', method: '*', handler: (c) => c.json(404, { error: 'unknown inbox route' }) });
}
