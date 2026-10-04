// server/router.mjs - the route table and the checks every request goes through.
//
// A route file in server/routes/ exports `default function register(app)` and
// calls app.route({...}) for each endpoint:
//
//   app.route({
//     method: 'GET' | 'POST' | ['GET','PUT'] | '*',
//     path: '/api/thing'            exact match, or
//     prefix: '/api/thing/',        everything under it (checked after exact paths)
//     handler: async (ctx) => obj | undefined,
//     maxBody: 64 * 1024,           body limit for ctx.body() (default SMALL_BODY)
//     sameOrigin: true,             force the CSRF check on a GET outside /api/ too
//     crossSite: true,              a GET under /api/ that must take a navigation from another
//                                   site (only the Google sign-in callback); never for writes
//     methodError: 'POST only',     405 text when the path matches but the method does not
//   });
//
// A handler returns an object (sent as 200 JSON), or uses ctx.json/ctx.send
// itself, or throws HttpError(status, message). Unknown errors become 500
// ("JSON"/"refusing" messages become 400, as before).
//
// Checks applied before any handler, for every request:
//   - Host must be localhost:<port> or 127.0.0.1:<port>          -> 421
//   - POST/PUT/PATCH/DELETE, every /api/ request (reads too) and
//     sameOrigin routes need our own Origin / Sec-Fetch-Site      -> 403
//     (another site cannot make a read start work either: Claude
//     runs, Google or weather fetches, `claude mcp list`, or time
//     the answers. The page, the address bar and local programs,
//     which send neither header, pass.)
//   - POST/PUT/PATCH with a body need Content-Type: application/json -> 415

import { send, json, readBody, readJsonBody, hostAllowed, sameOrigin, isJsonRequest, HttpError, SMALL_BODY } from './http.mjs';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createApp(ctx) {
  const exact = new Map();     // path -> [route]
  const prefixes = [];         // [route]

  function route(def) {
    if (!def || typeof def.handler !== 'function') throw new Error('route needs a handler');
    if (!def.path === !def.prefix) throw new Error('route needs exactly one of path / prefix');
    const methods = def.method === '*' || def.method == null ? '*' : [].concat(def.method).map(m => m.toUpperCase());
    const r = { ...def, methods };
    if (def.path) {
      if (!exact.has(def.path)) exact.set(def.path, []);
      exact.get(def.path).push(r);
    } else {
      prefixes.push(r);
      prefixes.sort((a, b) => b.prefix.length - a.prefix.length);   // longest prefix wins
    }
    return r;
  }

  function find(method, path) {
    const cands = exact.get(path) || prefixes.filter(r => path.startsWith(r.prefix));
    if (!cands.length) return { route: null };
    const hit = cands.find(r => r.methods === '*' || r.methods.includes(method));
    return hit ? { route: hit } : { route: null, methodError: cands[0].methodError || `${cands[0].methods.join(' or ')} only` };
  }

  /** Returns true if a route handled the request, false to fall through (static files). */
  async function handle(req, res) {
    const port = ctx.port;
    const url = new URL(req.url, `http://localhost:${port}`);
    const method = req.method.toUpperCase();
    if (!hostAllowed(req, port)) { send(res, 421, 'misdirected request'); return true; }
    const { route: r, methodError } = find(method, url.pathname);
    if (!r && !methodError) return false;
    if (!r) { json(res, 405, { error: methodError }); return true; }
    const isolated = url.pathname.startsWith('/api/') && !(r.crossSite === true && !MUTATING.has(method));
    if ((MUTATING.has(method) || r.sameOrigin || isolated) && !sameOrigin(req, port)) {
      json(res, 403, { error: 'forbidden origin' });
      return true;
    }
    const hasBody = Number(req.headers['content-length'] || 0) > 0 || !!req.headers['transfer-encoding'];
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && hasBody && !isJsonRequest(req) && !r.anyContentType) {
      json(res, 415, { error: 'Content-Type must be application/json' });
      return true;
    }
    const c = {
      ...ctx, req, res, url, method, path: url.pathname, query: url.searchParams,
      send: (...a) => send(res, ...a),
      json: (...a) => json(res, ...a),
      text: (max) => readBody(req, max ?? r.maxBody ?? SMALL_BODY),
      body: (opts = {}) => readJsonBody(req, { max: r.maxBody ?? SMALL_BODY, ...opts }),
    };
    const t0 = Date.now();
    try {
      const out = await r.handler(c);
      if (!res.headersSent && out !== undefined) json(res, 200, out);
      else if (!res.headersSent) json(res, 200, { ok: true });
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      const code = err.status || (/JSON|refusing/.test(msg) ? 400 : 500);
      // A typed error (status + code, e.g. a failed Claude run) is logged by its code only:
      // its message can repeat CLI output, and through it prompt, task or email text.
      if (code >= 500) ctx.log?.('error', `${method} ${url.pathname} -> ${code}: ${err && err.status && err.code ? String(err.code).slice(0, 40) : msg.slice(0, 300)}`);
      if (!res.headersSent) json(res, code, typeof err.toJSON === 'function' ? err.toJSON() : { error: msg, ...(err.code ? { code: err.code } : {}) });
    } finally {
      const ms = Date.now() - t0;
      if (!r.quiet) ctx.log?.('info', `${method} ${url.pathname} ${res.statusCode} ${ms}ms`);
    }
    return true;
  }

  // Lifecycle hooks for route files: onReady(fn) runs once the server listens
  // (e.g. write <data>/runtime.json), onClose(fn) when it stops (e.g. end
  // Server-Sent Events streams so close() can finish).
  const readyHooks = [], closeHooks = [];
  const onReady = (fn) => { readyHooks.push(fn); };
  const onClose = (fn) => { closeHooks.push(fn); };
  async function runHooks(list, label) {
    for (const fn of list) { try { await fn(); } catch (e) { ctx.log?.('warn', `${label} hook failed: ${e && e.message}`); } }
  }

  return {
    route, handle, find, ctx, onReady, onClose,
    runReady: () => runHooks(readyHooks, 'ready'), runClose: () => runHooks(closeHooks, 'close'),
    get routes() { return [...[...exact.values()].flat(), ...prefixes]; },
  };
}

export { HttpError };
