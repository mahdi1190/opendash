// server/routes/config.mjs - the user's settings in <data>/config.json.
//
//   GET /api/config -> the public config (userName, currency, locale, timezone,
//                      weekStart, theme, ai, features)
//   PUT /api/config  {partial config} -> the new public config (400 on bad values)
//
// The page also receives the public config inside index.html at load time
// (see injectConfig in server/http.mjs), so it never renders with a wrong name.

import { publicConfig } from '../../lib/datadir.mjs';

export default function register(app) {
  app.route({ path: '/api/config', method: 'GET', methodError: 'GET or PUT only', handler: (c) => publicConfig(c.getConfig()) });
  app.route({
    path: '/api/config', method: 'PUT', methodError: 'GET or PUT only',
    handler: async (c) => {
      const patch = await c.body();
      delete patch.financeDir;          // paths are set on the command line, not from the page
      const cfg = await c.setConfig(patch);
      return publicConfig(cfg);
    },
  });
}
