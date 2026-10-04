// server/routes/people-images.mjs - profile and cover pictures for People (lib/people-images.mjs).
//
//   POST /api/people/image   {person, kind:'avatar'|'cover', data:'data:image/<png|jpeg|webp|gif>;base64,...'}
//                            -> 200 {ok, ref:'file:<name>', url, name, bytes, width, height}
//                            -> 400 BAD_REQUEST | 404 UNKNOWN_PERSON | 413 TOO_LARGE |
//                               415 NOT_AN_IMAGE | 422 TYPE_MISMATCH / TOO_BIG   ({ok:false, code, error})
//                            The picture is only stored: the page then sets the person's
//                            `photo` / `cover` through the actions layer (update_person), so
//                            Undo, history and live sync work as for any other change.
//   GET  /api/people/image/<name>  -> the picture (only names this server makes; 404 otherwise)
//
// Same protections as every mutating route (Host, same origin, JSON, body limit).
// The log gets the kind and size, never names.

import { createPeopleImages, ImageError, MAX_BODY } from '../../lib/people-images.mjs';

export default function register(app) {
  const { paths, log, store } = app.ctx;
  const images = createPeopleImages({ paths, log, readState: () => store.readObject() });
  app.ctx.peopleImages = images;

  app.route({
    path: '/api/people/image', method: 'POST', methodError: 'POST only', maxBody: MAX_BODY,
    handler: async (c) => {
      try { return await images.save(await c.body()); }
      catch (e) {
        if (e instanceof ImageError) return c.json(e.status, e.toJSON());
        throw e;
      }
    },
  });
  app.route({
    prefix: '/api/people/image/', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      let name;
      try { name = decodeURIComponent(c.path.slice('/api/people/image/'.length)); } catch { return c.json(404, { error: 'not found' }); }
      const img = await images.read(name);
      if (!img) return c.json(404, { error: 'not found' });
      // The name holds the picture's hash, so it never changes: cache it.
      c.send(200, img.buf, img.mime, { 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Disposition': 'inline' });
      return undefined;
    },
  });
}
