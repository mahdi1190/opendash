// server/routes/scene-assets.mjs - the prebaked scenes' build-time images (src/app/78-scene-player.js).
//
//   GET /api/scene-assets/<pack>/<id>/<file>   a file under assets/scenes/<pack>/<id>/ written by
//                                              `node tools/anim-pack.mjs scene prebake <pack>/<id>`
//
// Read-only and narrow: lower-case names only (<pack> and <id> [a-z0-9-], the file [a-z0-9.-] ending .webp or .json),
// no other folder of the repo and nothing of the data folder is reachable. Same protections as every /api/ read
// (Host, same origin). The files change only with a rebuild of the assets: cached by the browser for an hour.
import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../assets/scenes', import.meta.url)));
const RE = /^\/api\/scene-assets\/([a-z0-9-]{1,60})\/([a-z0-9-]{1,80})\/([a-z0-9][a-z0-9.-]{0,80}\.(webp|json))$/;
const MIME = { webp: 'image/webp', json: 'application/json; charset=utf-8' };

export default function register(app) {
  app.route({
    prefix: '/api/scene-assets/', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      const m = RE.exec(c.path);
      if (!m || m[3].includes('..')) return c.json(404, { error: 'not found' });
      const file = resolve(join(ROOT, m[1], m[2], m[3]));
      if (!file.startsWith(ROOT + sep)) return c.json(404, { error: 'not found' });
      let buf;
      try { buf = await readFile(file); } catch { return c.json(404, { error: 'not found' }); }
      c.send(200, buf, MIME[m[4]], { 'Cache-Control': 'private, max-age=3600' });
      return undefined;
    },
  });
}
