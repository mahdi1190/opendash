// server/routes/assistant.mjs - the in-app assistant (lib/assistant.mjs does the work).
//
//   GET  /api/assistant           -> {models:[{id, effort, label, hint}], default:{model, effort}, tools:[...]}
//   POST /api/assistant           {message, history?:[{role:'user'|'assistant', text}], page?:{view, viewLabel,
//                                  selectedTaskId, selectedTaskTitle}, model?, effort?}
//        -> 200 application/x-ndjson, one JSON event per line:
//             {type:'start', model, effort}
//             {type:'status', text, tool}        while Claude looks things up
//             {type:'text', text}                intermediate text from Claude
//             {type:'fallback', code}            the MCP route failed; answering without tools
//             {type:'proposal', proposal:{id, summary, note, preview, warnings, needsConfirm, ops, status}}
//             {type:'done', text, proposals:[id], via:'mcp'|'json', model, effort, ms}
//             {type:'error', code, error}        (code from lib/claude-runner.mjs)
//        Bad input is refused before streaming with a normal JSON 400/413.
//
// Same-origin only (the router's 403 on POST), so only the dashboard page can
// talk to it. Nothing here applies changes: proposals are applied by the
// user's click (POST /api/actions {proposalId}).
// Logs: model, timings and counts only - never the message or the answer.

import { runAssistant, ASSISTANT_MODELS, DEFAULT_ASSISTANT_MODEL, DEFAULT_ASSISTANT_EFFORT, assistantToolNames, pickModel, LIMITS } from '../../lib/assistant.mjs';
import { HttpError } from '../http.mjs';

const MAX_BODY = 256 * 1024;

export default function register(app) {
  const { log } = app.ctx;

  app.route({
    path: '/api/assistant', method: 'GET', methodError: 'GET or POST only',
    handler: () => ({
      models: ASSISTANT_MODELS, default: { model: DEFAULT_ASSISTANT_MODEL, effort: DEFAULT_ASSISTANT_EFFORT },
      tools: assistantToolNames(), limits: { message: LIMITS.message, historyTurns: LIMITS.historyTurns },
    }),
  });

  app.route({
    path: '/api/assistant', method: 'POST', maxBody: MAX_BODY, methodError: 'GET or POST only',
    handler: async (c) => {
      const b = await c.body();
      if (typeof b.message !== 'string' || !b.message.trim()) throw new HttpError(400, 'message is required');
      if (b.message.length > LIMITS.message) throw new HttpError(413, `message too long (at most ${LIMITS.message} characters)`);
      if (b.history != null && !Array.isArray(b.history)) throw new HttpError(400, 'history must be a list');
      if (b.page != null && (typeof b.page !== 'object' || Array.isArray(b.page))) throw new HttpError(400, 'page must be an object');
      let pick;
      try { pick = pickModel(b.model ?? null, b.effort === null ? null : b.effort); } catch (e) { throw new HttpError(400, e.message, { code: 'BAD_REQUEST' }); }
      const actions = c.actions || app.ctx.actions;
      if (!actions) throw new HttpError(503, 'the actions layer is not loaded');
      const cfg = c.getConfig ? c.getConfig() : {};
      if (cfg.features && cfg.features.ai === false) throw new HttpError(403, 'the assistant is switched off in config (features.ai)', { code: 'DISABLED' });

      const res = c.res;
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'X-Accel-Buffering': 'no',
      });
      let open = true;
      const send = (o) => { if (open && !res.writableEnded) { try { res.write(JSON.stringify(o) + '\n'); } catch { open = false; } } };
      const ac = new AbortController();
      let finished = false;
      res.on('close', () => { open = false; if (!finished) ac.abort(); });
      send({ type: 'start', model: pick.model, effort: pick.effort });
      try {
        const r = await runAssistant({
          actions, dataDir: c.dataDir, port: c.port, message: b.message, history: b.history || [], page: b.page || {},
          model: pick.model, effort: pick.effort, userName: cfg.userName || '',
          emit: send, signal: ac.signal, log,
        });
        send({ type: 'done', text: r.text, proposals: r.proposals.map(p => p.id), via: r.via, model: r.model, effort: r.effort, ms: r.ms });
      } catch (e) {
        if (!ac.signal.aborted) log('warn', `assistant FAILED ${e && e.code || ''}`);
        send({ type: 'error', code: (e && e.code) || 'CLI_FAILED', error: String((e && e.message) || e).slice(0, 500) });
      } finally {
        finished = true;
        if (!res.writableEnded) res.end();
      }
      return undefined;
    },
  });
}
