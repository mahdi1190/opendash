// server/routes/finance-data.mjs - Money > Your data (lib/finance-data.mjs does the work).
//
//   GET  /api/finance/data            every source with its status, tick and date; duplicates; notes
//   POST /api/finance/data/preview    {off, until, dups} -> the numbers before and after (nothing written)
//   POST /api/finance/data/apply      {off, until, dups, label} -> rebuilds the analysis; 409 BUSY during an update
//   POST /api/finance/data/undo       the last apply, exactly
//   POST /api/finance/data/delete     {key, disconnect} -> {removed, token} (safety copy first)
//   POST /api/finance/data/restore    {token} or {key}: back from the safety copy, or let the account in again
//   POST /api/finance/data/purge      {token}: the safety copy goes now
//   POST /api/finance/data/card       {key, isCard?, name?, balance?, pay?}: a credit card's details -> {prev}
//   POST /api/finance/data/flip       {key}: its money in and out the other way round (again = back)
//   GET  /api/finance/data/download?key=   one source's payments as CSV (same-origin only)
//
// Loaded before server/routes/finance.mjs (sorted by name), whose /api/finance/ catch-all comes last.

import { createFinanceData, DataError } from '../../lib/finance-data.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { finConnectFor } from '../../lib/fin-connect/index.mjs';

export default function register(app) {
  const { log } = app.ctx;
  const svc = createFinanceData({
    sources: sourcesFor(app.ctx), finConnect: () => finConnectFor(app.ctx), share: () => app.ctx.financeShare || null,
    getConfig: () => (typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {}), log,
  });
  app.ctx.financeDataSvc = svc;
  const guarded = (fn) => async (c) => {
    try { return await fn(c); } catch (e) {
      if (e instanceof DataError) return c.json(e.status, { error: e.message, code: e.code });
      throw e;
    }
  };
  const post = (path, fn) => app.route({ path: `/api/finance/data/${path}`, method: 'POST', methodError: 'POST only', handler: guarded(fn) });

  app.route({ path: '/api/finance/data', method: 'GET', methodError: 'GET only', handler: guarded(() => svc.overview()) });
  post('preview', async (c) => svc.preview(await c.body()));
  post('apply', async (c) => svc.apply(await c.body()));
  post('undo', async (c) => { await c.body({ allowEmpty: true }); return svc.undo(); });
  post('delete', async (c) => { const b = await c.body(); return svc.remove(b.key, { disconnect: b.disconnect === true }); });
  post('restore', async (c) => svc.restore(await c.body()));
  post('purge', async (c) => svc.purge(await c.body()));
  post('card', async (c) => svc.setCard(await c.body()));
  post('flip', async (c) => { const b = await c.body(); return svc.flip(b.key); });
  app.route({
    path: '/api/finance/data/download', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: guarded(async (c) => {
      const { csv, name } = await svc.download(c.query.get('key'));
      c.send(200, '﻿' + csv, 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="${name}"` });
    }),
  });
}
