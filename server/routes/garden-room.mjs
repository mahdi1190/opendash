// server/routes/garden-room.mjs - the one sound file of a room in the garden (2.33), when the person has put it in <data>/media/stage.ogg.
//
//   GET /api/garden/room-sound   -> the file (audio/ogg), 404 when there is none
//
// One fixed name, never taken from a request; the bytes must start like an Ogg file and stay under the size cap. Read-only. The file is not part of the app
// and is not synced: without it the page plays a short tune of its own.

import { promises as fsp } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 12 * 1024 * 1024;

export default function register(app) {
  const { paths } = app.ctx;
  const file = join(paths.root, 'media', 'stage.ogg');
  app.route({
    path: '/api/garden/room-sound', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      let buf;
      try {
        const st = await fsp.stat(file);
        if (!st.isFile() || st.size < 64 || st.size > MAX_BYTES) return c.json(404, { error: 'not found' });
        buf = await fsp.readFile(file);
      } catch { return c.json(404, { error: 'not found' }); }
      if (buf.toString('latin1', 0, 4) !== 'OggS') return c.json(404, { error: 'not found' });
      c.send(200, buf, 'audio/ogg', { 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' });
      return undefined;
    },
  });
}
