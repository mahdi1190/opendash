// server/routes/gmail-drafts.mjs - Gmail DRAFTS made by the dashboard (lib/gmail-draft.mjs).
// Nothing here can send an email: the only Gmail calls are create_draft and
// delete_draft, one exact call per run, and the send tools are denied by name.
//
//   GET    /api/gmail/drafts/info   -> {fake, model}
//   POST   /api/gmail/drafts        {to:[email], cc?:[email], subject?, body?, threadId?, purpose?:'nudge'|'reply'|'note', taskId?}
//                                   -> 200 {ok:true, draftId, threadId, viewUrl, inThread, purpose, fake}
//                                   to/cc: People addresses or the thread's sender only (422 NOT_ALLOWED);
//                                   no bcc (400); threadId must be in the inbox snapshot (422 UNKNOWN_THREAD);
//                                   with a threadId the draft replies in that thread (its lastMessageId)
//   DELETE /api/gmail/drafts/:id    -> 200 {ok:true, gone?}   (Undo; only a draft this dashboard made: 404 NOT_OURS)
//   -> 4xx/5xx {ok:false, code, message}   (429 RATE_LIMITED; 503 CONNECTOR_AUTH / TOOL_MISSING / NOT_SIGNED_IN ...)
//   GET/POST /api/gmail/fake {delayMs?, fail?} and GET /api/gmail/fake/drafts: the fake
//   connector (only with DASHBOARD_GMAIL_FAKE=1; 404 otherwise).
// Same protections as every mutating route (Host, same origin, JSON, body limit).
// The log gets op, ms, purpose and codes, never addresses, subjects or bodies.

import { createGmailDrafter, DraftError } from '../../lib/gmail-draft.mjs';

export default function register(app) {
  const { dataDir, paths, log, store } = app.ctx;
  const drafter = createGmailDrafter({ dataDir, paths, log, readState: () => store.readObject() });
  app.ctx.gmailDrafter = drafter;

  const answer = async (c, fn) => {
    try { return await fn(); }
    catch (e) {
      if (e instanceof DraftError) return c.json(e.status, e.toJSON());
      throw e;
    }
  };

  app.route({ path: '/api/gmail/drafts/info', method: 'GET', quiet: true, handler: () => drafter.info() });
  app.route({
    path: '/api/gmail/drafts', method: 'POST', methodError: 'POST only', maxBody: 16 * 1024,
    handler: (c) => answer(c, async () => drafter.create(await c.body())),
  });
  app.route({
    prefix: '/api/gmail/drafts/', method: 'DELETE', methodError: 'DELETE only',
    handler: (c) => answer(c, async () => {
      const m = /^\/api\/gmail\/drafts\/([^/]{1,240})$/.exec(c.path);
      if (!m) return c.json(404, { ok: false, code: 'NOT_FOUND', error: 'unknown draft route' });
      let id;
      try { id = decodeURIComponent(m[1]); } catch { return c.json(400, { ok: false, code: 'BAD_REQUEST', error: 'bad draft id' }); }
      return drafter.remove(id);
    }),
  });
  app.route({
    path: '/api/gmail/fake', method: ['GET', 'POST'],
    handler: (c) => answer(c, async () => (c.method === 'GET' ? drafter.fakeConfig() : drafter.fakeConfig(await c.body()))),
  });
  app.route({ path: '/api/gmail/fake/drafts', method: 'GET', handler: (c) => answer(c, async () => ({ drafts: drafter.fakeDrafts() })) });

  app.route({ prefix: '/api/gmail/', method: '*', handler: (c) => c.json(404, { error: 'unknown gmail route' }) });
}
