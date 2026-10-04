// server/routes/anim-make.mjs - "Make your own" animations (v2.2 wave 6).
//
//   GET  /api/anim/mine              -> {items, max}   the saved "My animations" (each re-checked)
//   POST /api/anim/make {description, slot?, model?}
//        -> {draft, model}  a sanitised draft, NOT saved (the page previews it first)
//           503 UNAVAILABLE when Claude is not connected, 422 GATE when the drawing
//           failed the sanitiser or the quality gate (errors listed), 502 BAD_OUTPUT
//   POST /api/anim/mine {draft}      -> {item, items}  saved (checked again here)
//   POST /api/anim/mine/delete {id}  -> {items}
//
// The model is Haiku or Sonnet (claude-runner 'anim-make' profile). Logs carry
// codes and counts only, never the description or the drawing.

import { HttpError } from '../http.mjs';
import { runClaude } from '../../lib/claude-runner.mjs';
import { aiStatus } from '../../lib/ai.mjs';
import { mineList, mineSave, mineDelete, animMakeDraft, ANIM_MAKE, MAX_DESCRIPTION } from '../../lib/anim-make.mjs';

// Tests swap the model.
let aiImpl = null;
export function setAnimMakeAi(impl) { aiImpl = impl; }

const MODELS = ['claude-haiku-4-5', 'claude-sonnet-5'];
/** An error whose answer also lists what failed the checks: {error, code, errors}. */
function listed(status, message, code, errors) {
  const list = (errors || []).slice(0, 6).map(e => String(e).slice(0, 160));
  return new HttpError(status, message, { code, toJSON: () => ({ error: message, code, errors: list }) });
}

export default function register(app) {
  const { dataDir, log } = app.ctx;
  const ai = () => aiImpl || { aiStatus, run: runClaude };

  app.route({
    path: '/api/anim/mine', method: ['GET', 'POST'], maxBody: 64 * 1024, methodError: 'GET or POST only',
    handler: async (c) => {
      if (c.method === 'GET') return { items: await mineList(dataDir), max: ANIM_MAKE.ANIM_MAKE_MAX_ITEMS };
      const b = await c.body();
      if (!b || typeof b.draft !== 'object' || !b.draft) throw new HttpError(400, 'draft is required');
      const r = await mineSave(dataDir, b.draft);
      if (!r.ok) throw listed(r.code === 'GATE' ? 422 : 409, r.errors[0] || 'Not saved.', r.code, r.errors);
      log('info', `anim-make saved (${r.items.length} in My animations)`);
      return { item: r.item, items: r.items };
    },
  });

  app.route({
    path: '/api/anim/mine/delete', method: 'POST', maxBody: 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (!b || typeof b.id !== 'string' || !ANIM_MAKE.ANIM_MAKE_ID_RE.test(b.id)) throw new HttpError(400, 'id is required');
      const r = await mineDelete(dataDir, b.id);
      if (!r.ok) throw new HttpError(404, 'That animation is not in My animations.', { code: 'NOT_FOUND' });
      return { items: r.items };
    },
  });

  app.route({
    path: '/api/anim/make', method: 'POST', maxBody: 4 * 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (typeof b.description !== 'string' || !b.description.trim()) throw new HttpError(400, 'Describe the animation first.', { code: 'BAD_REQUEST' });
      if (b.description.length > MAX_DESCRIPTION) throw new HttpError(413, `Keep the description under ${MAX_DESCRIPTION} characters.`, { code: 'BAD_REQUEST' });
      if (b.model != null && !MODELS.includes(b.model)) throw new HttpError(400, 'model not allowed', { code: 'BAD_REQUEST' });
      const st = await ai().aiStatus().catch(() => ({ available: false }));
      if (!st.available) throw new HttpError(503, 'Claude is not connected, so the assistant cannot draw right now. Connect it in Connections, then try again.', { code: st.code || 'UNAVAILABLE' });
      const t0 = Date.now();
      const r = await animMakeDraft({ description: b.description, slot: b.slot, model: b.model || 'claude-sonnet-5', run: ai().run });
      if (!r.ok) {
        log('warn', `anim-make draft ${r.code} (${(r.errors || []).length} problems) ${Date.now() - t0}ms`);
        throw listed(r.code === 'GATE' ? 422 : r.code === 'BAD_REQUEST' ? 400 : 502,
          r.code === 'GATE' ? 'The drawing did not pass the checks. Try again, or describe it differently.' : r.errors[0], r.code, r.errors);
      }
      log('info', `anim-make draft ok ${r.model || ''} ${Date.now() - t0}ms`);
      return { draft: r.draft, model: r.model };
    },
  });

  app.route({ prefix: '/api/anim/', method: '*', handler: (c) => c.json(404, { error: 'unknown animation route' }) });
}
