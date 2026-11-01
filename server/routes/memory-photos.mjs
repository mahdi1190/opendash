// server/routes/memory-photos.mjs - garden photos kept in Memories (lib/memory-photos.mjs, 2.32).
//
//   GET  /api/memories/photos            -> {ok, items: [{id, name, iso, ts, kind, at, who, w, h, bytes}]}   newest first
//   POST /api/memories/photo             {data:'data:image/<jpeg|png|webp>;base64,...', iso, ts, who?, at?, kind?}
//                                        -> 200 {ok, item}   |   400 / 413 / 415 / 422 {ok:false, code, error}
//   POST /api/memories/photo/delete      {id}  -> {ok, removed}
//   GET  /api/memories/photo/<name>      -> the picture (only names this server makes; 404 otherwise)
//
// Same protections as every mutating route (Host, same origin, JSON, body limit). The log gets sizes, never names or ids.
// The pictures stay on this computer (they are not in the encrypted sync).

import { createMemoryPhotos, PHOTO_LIMITS, PHOTO_NAME_RE } from '../../lib/memory-photos.mjs';
import { ImageError } from '../../lib/people-images.mjs';

const MAX_BODY = Math.ceil(PHOTO_LIMITS.bytes * 4 / 3) + 4096;

export default function register(app) {
  const { paths, log } = app.ctx;
  const photos = createMemoryPhotos({ paths, log });
  app.ctx.memoryPhotos = photos;

  app.route({ path: '/api/memories/photos', method: 'GET', methodError: 'GET only', quiet: true, handler: async () => ({ ok: true, items: await photos.list() }) });
  app.route({
    path: '/api/memories/photo', method: 'POST', methodError: 'POST only', maxBody: MAX_BODY, quiet: true,
    handler: async (c) => {
      try {
        const b = await c.body();
        return { ok: true, item: await photos.save(b) };
      } catch (e) {
        if (e instanceof ImageError) return c.json(e.status, e.toJSON());
        throw e;
      }
    },
  });
  app.route({
    path: '/api/memories/photo/delete', method: 'POST', methodError: 'POST only', maxBody: 1024, quiet: true,
    handler: async (c) => {
      const b = await c.body({ allowEmpty: true });
      return { ok: true, removed: await photos.remove(b && typeof b.id === 'string' ? b.id : '') };
    },
  });
  app.route({
    prefix: '/api/memories/photo/', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      let name;
      try { name = decodeURIComponent(c.path.slice('/api/memories/photo/'.length)); } catch { return c.json(404, { error: 'not found' }); }
      const img = PHOTO_NAME_RE.test(name) ? await photos.read(name) : null;
      if (!img) return c.json(404, { error: 'not found' });
      c.send(200, img.buf, img.mime, { 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Disposition': 'inline' });
      return undefined;
    },
  });
}
