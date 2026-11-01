// server/routes/pet-ai.mjs - AI for pets (2.22).
//
//   POST /api/pets/style {description, look, locked?, model?}
//        -> {patch, look, note, unmet, dropped, model}  a checked restyle, NOT applied (the page shows it, then applies it)
//           503 UNAVAILABLE when Claude is not connected, 400 for a bad request, 502 BAD_OUTPUT
//
//   GET  /api/pets/items                 -> {items, max}   My designs (each checked again on every read)
//   POST /api/pets/items {item}          -> {item, items}  add or replace a design (checked again here; 422 GATE, 409 FULL)
//   POST /api/pets/items/delete {id}     -> {items}
//   POST /api/pets/items/make {description, species, slot?, feedback?, previous?, model?}
//        -> {draft, model}  a checked drawing, NOT saved (the page previews it first); 503 / 422 / 502 as above
//   POST /api/pets/items/export {item}   -> {code}   the share code
//   POST /api/pets/items/import {code}   -> {draft}  a checked design with a new id, NOT saved
//
// The style model is Haiku (default) or Sonnet ('pet-style'); the drawing model is Sonnet (default) or Haiku ('pet-item').
// Logs carry codes and counts only, never the description or the drawing.

import { HttpError } from '../http.mjs';
import { runClaude } from '../../lib/claude-runner.mjs';
import { aiStatus } from '../../lib/ai.mjs';
import { petStyleDraft, PET_AI_MAX_DESCRIPTION, itemsList, itemSave, itemDelete, petItemDraft, itemExport, itemImport } from '../../lib/pet-ai.mjs';
import { PET_ITEM } from '../../lib/profile-pets.mjs';

const MODELS = ['claude-haiku-4-5', 'claude-sonnet-5'];
/** An error whose answer also lists what failed the checks: {error, code, errors}. */
function listed(status, message, code, errors) {
  const list = (errors || []).slice(0, 6).map(e => String(e).slice(0, 160));
  return new HttpError(status, message, { code, toJSON: () => ({ error: message, code, errors: list }) });
}

export default function register(app) {
  const { dataDir, log } = app.ctx;

  app.route({
    path: '/api/pets/style', method: 'POST', maxBody: 16 * 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (!b || typeof b.description !== 'string' || !b.description.trim()) throw new HttpError(400, 'Describe what to change first.', { code: 'BAD_REQUEST' });
      if (b.description.length > PET_AI_MAX_DESCRIPTION) throw new HttpError(413, `Keep it under ${PET_AI_MAX_DESCRIPTION} characters.`, { code: 'BAD_REQUEST' });
      if (!b.look || typeof b.look !== 'object' || Array.isArray(b.look)) throw new HttpError(400, 'look is required', { code: 'BAD_REQUEST' });
      if (b.model != null && !MODELS.includes(b.model)) throw new HttpError(400, 'model not allowed', { code: 'BAD_REQUEST' });
      const st = await aiStatus().catch(() => ({ available: false }));
      if (!st.available) throw new HttpError(503, 'Claude is not connected, so the assistant cannot restyle your pet right now. Connect it in Connections, then try again.', { code: st.code || 'UNAVAILABLE' });
      const t0 = Date.now();
      const r = await petStyleDraft({ description: b.description, look: b.look, locked: b.locked, model: b.model, run: runClaude });
      if (!r.ok) {
        log('warn', `pet-style ${r.code} ${Date.now() - t0}ms`);
        throw new HttpError(r.code === 'BAD_REQUEST' ? 400 : 502, r.errors[0], { code: r.code });
      }
      log('info', `pet-style ok ${r.model || ''} ${Object.keys(r.patch).length} changes, ${r.dropped.length} dropped ${Date.now() - t0}ms`);
      return { patch: r.patch, look: r.look, note: r.note, unmet: r.unmet, dropped: r.dropped, model: r.model };
    },
  });

  // ── My designs: accessories the assistant draws (lib/pet-ai.mjs part 2) ──
  app.route({
    path: '/api/pets/items', method: ['GET', 'POST'], maxBody: 64 * 1024, methodError: 'GET or POST only',
    handler: async (c) => {
      if (c.method === 'GET') return { items: await itemsList(dataDir), max: PET_ITEM.maxSaved };
      const b = await c.body();
      if (!b || typeof b.item !== 'object' || !b.item) throw new HttpError(400, 'item is required', { code: 'BAD_REQUEST' });
      const r = await itemSave(dataDir, b.item);
      if (!r.ok) throw listed(r.code === 'GATE' ? 422 : 409, r.errors[0] || 'Not saved.', r.code, r.errors);
      log('info', `pet design saved (${r.items.length} in My designs)`);
      return { item: r.item, items: r.items };
    },
  });
  app.route({
    path: '/api/pets/items/delete', method: 'POST', maxBody: 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (!b || typeof b.id !== 'string' || !/^pi-[a-z0-9]{6,12}$/.test(b.id)) throw new HttpError(400, 'id is required', { code: 'BAD_REQUEST' });
      const r = await itemDelete(dataDir, b.id);
      if (!r.ok) throw new HttpError(404, 'That accessory is not in My designs.', { code: 'NOT_FOUND' });
      return { items: r.items };
    },
  });
  app.route({
    path: '/api/pets/items/make', method: 'POST', maxBody: 32 * 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (!b || typeof b.description !== 'string' || !b.description.trim()) throw new HttpError(400, 'Describe the accessory first.', { code: 'BAD_REQUEST' });
      if (b.description.length > PET_AI_MAX_DESCRIPTION) throw new HttpError(413, `Keep the description under ${PET_AI_MAX_DESCRIPTION} characters.`, { code: 'BAD_REQUEST' });
      if (typeof b.species !== 'string') throw new HttpError(400, 'species is required', { code: 'BAD_REQUEST' });
      if (b.model != null && !MODELS.includes(b.model)) throw new HttpError(400, 'model not allowed', { code: 'BAD_REQUEST' });
      const st = await aiStatus().catch(() => ({ available: false }));
      if (!st.available) throw new HttpError(503, 'Claude is not connected, so the assistant cannot draw right now. Connect it in Connections, then try again.', { code: st.code || 'UNAVAILABLE' });
      const t0 = Date.now();
      const r = await petItemDraft({ description: b.description, slot: b.slot, species: b.species, feedback: typeof b.feedback === 'string' ? b.feedback : '', previous: b.previous && typeof b.previous === 'object' ? b.previous : null, model: b.model || 'claude-sonnet-5', run: runClaude });
      if (!r.ok) {
        log('warn', `pet-item draft ${r.code} (${(r.errors || []).length} problems) ${Date.now() - t0}ms`);
        throw listed(r.code === 'GATE' ? 422 : r.code === 'BAD_REQUEST' ? 400 : 502,
          r.code === 'GATE' ? 'The drawing did not pass the checks. Try again, or describe it differently.' : r.errors[0], r.code, r.errors);
      }
      log('info', `pet-item draft ok ${r.model || ''} ${r.draft.shapes.length} shapes ${Date.now() - t0}ms`);
      return { draft: r.draft, model: r.model };
    },
  });
  app.route({
    path: '/api/pets/items/export', method: 'POST', maxBody: 64 * 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      const code = b && b.item && typeof b.item === 'object' ? itemExport(b.item) : null;
      if (!code) throw new HttpError(400, 'That accessory could not be turned into a code.', { code: 'BAD_REQUEST' });
      return { code };
    },
  });
  app.route({
    path: '/api/pets/items/import', method: 'POST', maxBody: 32 * 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      const r = itemImport(b && b.code);
      if (!r.ok) throw listed(422, r.errors[0] || 'That code did not work.', 'GATE', r.errors);
      return { draft: r.draft };
    },
  });

  app.route({ prefix: '/api/pets/', method: '*', handler: (c) => c.json(404, { error: 'unknown pets route' }) });
}
