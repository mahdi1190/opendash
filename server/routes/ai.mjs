// server/routes/ai.mjs - text/JSON AI calls for the page (no tools, ever).
//
//   POST /api/ai          {prompt, model?, effort?, system?, schema?}
//                         -> {text, model, ms} or, with schema, {json, text, model, ms}
//                         errors: {error, code} with code from lib/claude-runner.mjs
//   GET  /api/ai/status   -> {available, code, message, model, chatModel, effort, models, efforts, queue}
//   POST /api/ai/status   -> same, after a fresh probe
//
// The model must be on the allowlist (claude-opus-5-5, claude-sonnet-5,
// claude-haiku-4-5) and the effort low|medium|high; anything else is refused
// with 400 rather than silently swapped. Omitted model -> config ai.model.

import { askText, askJson, aiStatus } from '../../lib/ai.mjs';
import { MODELS, EFFORTS, queueStats, isAllowedModel, isAllowedEffort } from '../../lib/claude-runner.mjs';
import { HttpError } from '../http.mjs';

const MAX_PROMPT = 200000;
const MAX_BODY = 512 * 1024;

export default function register(app) {
  const { log } = app.ctx;

  app.route({
    path: '/api/ai', method: 'POST', maxBody: MAX_BODY, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (typeof b.prompt !== 'string' || !b.prompt.trim()) throw new HttpError(400, 'prompt is required');
      if (b.prompt.length > MAX_PROMPT) throw new HttpError(413, 'prompt too long');
      const cfg = c.getConfig();
      if (b.model != null && !isAllowedModel(b.model)) throw new HttpError(400, 'model not allowed', { code: 'BAD_REQUEST' });
      if (b.effort != null && !isAllowedEffort(b.effort)) throw new HttpError(400, 'effort not allowed', { code: 'BAD_REQUEST' });
      if (b.system != null && (typeof b.system !== 'string' || b.system.length > 8000)) throw new HttpError(400, 'system must be a short string');
      if (b.schema != null && (typeof b.schema !== 'object' || Array.isArray(b.schema) || JSON.stringify(b.schema).length > 20000)) throw new HttpError(400, 'schema must be a small JSON object');
      const model = b.model ?? cfg.ai.model;
      const effort = b.effort ?? undefined;
      const t0 = Date.now();
      try {
        if (b.schema) {
          const r = await askJson({ prompt: b.prompt, schema: b.schema, model, effort, system: b.system });
          log('info', `ai json ${r.model} ${Date.now() - t0}ms`);
          return { json: r.json, text: r.text, model: r.model, ms: r.ms };
        }
        const r = await askText({ prompt: b.prompt, model, effort, system: b.system });
        log('info', `ai ${r.model} ${Date.now() - t0}ms`);
        return { text: r.text, model: r.model, ms: r.ms };
      } catch (e) {
        // The code only: a failed run's message can repeat CLI output or prompt text.
        log('warn', `ai FAILED ${e.code || 'error'}`);
        throw e;   // ClaudeError carries .status and .toJSON() -> {error, code}
      }
    },
  });

  const status = async (c, force) => {
    const s = await aiStatus({ force });
    const cfg = c.getConfig();
    return {
      available: s.available, code: s.code, message: s.message, checkedAt: new Date(s.at).toISOString(),
      model: cfg.ai.model, chatModel: cfg.ai.chatModel, effort: cfg.ai.effort,
      models: MODELS, efforts: EFFORTS, queue: queueStats(),
    };
  };
  app.route({ path: '/api/ai/status', method: 'GET', handler: (c) => status(c, false) });
  app.route({ path: '/api/ai/status', method: 'POST', handler: (c) => status(c, true) });
}
