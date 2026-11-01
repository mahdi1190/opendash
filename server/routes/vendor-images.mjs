// server/routes/vendor-images.mjs - a person's own pictures for merchants (lib/vendor-images.mjs).
//
//   GET  /api/finance/vendor-images            -> {items: {merchant key: url}}
//   POST /api/finance/vendor-image             {merchant, data: 'data:image/<png|jpeg|webp>;base64,...'} -> {ok, url, prev, items}
//   POST /api/finance/vendor-image/remove      {merchant} -> {ok, prev, items} (the file stays, for Undo)
//   POST /api/finance/vendor-image/restore     {merchant, ref} -> {ok, items}
//   GET  /api/finance/vendor-image/<name>      the picture (only names this server made), with the same policy as receipts
//
// Same protections as every route (Host, same origin, JSON, body limit). The log gets sizes, never merchant names.

import { createVendorImages, MAX_BODY } from '../../lib/vendor-images.mjs';
import { ImageError } from '../../lib/people-images.mjs';

export default function register(app) {
  const { paths, log } = app.ctx;
  const images = createVendorImages({ root: paths.root, log });
  const guard = (fn) => async (c) => {
    try { return await fn(c); } catch (e) {
      if (e instanceof ImageError) return c.json(e.status, e.toJSON());
      throw e;
    }
  };
  app.route({ path: '/api/finance/vendor-images', method: 'GET', methodError: 'GET only', quiet: true, handler: async () => ({ items: await images.list() }) });
  app.route({ path: '/api/finance/vendor-image', method: 'POST', methodError: 'POST only', maxBody: MAX_BODY, handler: guard(async (c) => images.save(await c.body())) });
  app.route({ path: '/api/finance/vendor-image/remove', method: 'POST', methodError: 'POST only', handler: guard(async (c) => { const b = await c.body(); return images.remove(b && b.merchant); }) });
  app.route({ path: '/api/finance/vendor-image/restore', method: 'POST', methodError: 'POST only', handler: guard(async (c) => { const b = await c.body(); return images.restore(b && b.merchant, b && b.ref); }) });
  app.route({
    prefix: '/api/finance/vendor-image/', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      let name;
      try { name = decodeURIComponent(c.path.slice('/api/finance/vendor-image/'.length)); } catch { return c.json(404, { error: 'not found' }); }
      const f = await images.read(name);
      if (!f) return c.json(404, { error: 'not found' });
      c.send(200, f.buf, f.mime, { 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" });
      return undefined;
    },
  });
}
