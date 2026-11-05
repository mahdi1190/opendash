// Prepare only the app page; APIs and event streams keep their own responses.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { cspFor, injectConfig, MIME, send } from './http.mjs';

function encodingFor(header) {
  const weights = new Map();
  for (const entry of String(header || '').split(',')) {
    const [name, ...params] = entry.trim().toLowerCase().split(';');
    if (!name) continue;
    const weight = params.map(p => p.trim()).find(p => p.startsWith('q='));
    const text = weight ? weight.slice(2).trim() : '1';
    const q = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(text) ? Number(text) : 0;
    weights.set(name, weights.has(name) ? Math.min(weights.get(name), q) : q);
  }
  const identity = weights.get('identity') ?? (weights.get('*') === 0 ? 0 : 1);
  const zipped = weights.get('gzip') ?? weights.get('*') ?? 0;
  return zipped > 0 && zipped >= identity ? 'gzip' : identity > 0 ? 'identity' : null;
}

/** One built page and one injected public-config variant per server instance. */
export function createAppShell(file) {
  let source = null, page = null;
  function current() {
    const stat = statSync(file), key = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    if (!source || source.key !== key) {
      const bytes = readFileSync(file);
      source = { key, id: createHash('sha256').update(bytes).digest('hex').slice(0, 12), html: bytes.toString('utf8'), csp: null };
      page = null;
    }
    return source;
  }
  function prepared(config) {
    const built = current(), cfg = { ...config, build: built.id }, key = JSON.stringify(cfg);
    if (!page || page.source !== built || page.key !== key) {
      const bytes = Buffer.from(injectConfig(built.html, cfg), 'utf8');
      if (!built.csp) built.csp = cspFor(built.html);
      page = { source: built, key, bytes, csp: built.csp, zipped: null };
    }
    return page;
  }
  async function respond(req, res, config) {
    const encoding = encodingFor(req.headers['accept-encoding']);
    if (!encoding) return send(res, 406, 'No acceptable app-page encoding', undefined, { Vary: 'Accept-Encoding' });
    const p = prepared(config);
    const headers = { 'X-Dashboard-App': 'dashboard', Vary: 'Accept-Encoding', 'Content-Security-Policy': p.csp };
    let body = p.bytes;
    if (encoding === 'gzip') {
      headers['Content-Encoding'] = 'gzip';
      if (!p.zipped) {
        const stream = createGzip({ level: 1 }), chunks = [];
        p.zipped = new Promise((resolve, reject) => {
          stream.on('data', chunk => chunks.push(chunk));
          stream.once('end', () => resolve(Buffer.concat(chunks)));
          stream.once('error', error => { p.zipped = null; reject(error); });
        });
        // Start the first browser's parser as chunks arrive. Later requests
        // share the completed encoding, without repeating compression work.
        if (req.method !== 'HEAD') {
          send(res, 200, stream, MIME['.html'], headers);
          stream.end(p.bytes);
          await p.zipped;
          return;
        }
        stream.end(p.bytes);
      }
      body = await p.zipped;
    }
    headers['Content-Length'] = body.length;
    return send(res, 200, req.method === 'HEAD' ? '' : body, MIME['.html'], headers);
  }
  return { buildId: () => current().id, respond };
}
