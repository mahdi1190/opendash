// The offline page's service worker (src/sw.js), loaded into a VM with a fake
// `self`, `caches` and `fetch`: network first for the app shell only, the
// cached copy only when the network fails, /api/* and data never cached, one
// versioned cache, a new version takes over at once and deletes the old ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'sw.js'), 'utf8');
const ORIGIN = 'http://localhost:4173';

/** Load the worker. net: 'ok' | 'down' | (url) => Response. */
function load({ version = 'v1', net = 'ok', cached = {} } = {}) {
  const handlers = {};
  const store = new Map(Object.entries(cached).map(([name, entries]) => [name, new Map(Object.entries(entries))]));
  const log = { skipWaiting: 0, claim: 0, deleted: [], puts: [], fetches: [] };
  const mkRes = (body, { status = 200, type = 'text/html; charset=utf-8', mark = true } = {}) => new Response(body, { status, headers: { 'Content-Type': type, ...(mark ? { 'X-Dashboard-App': 'dashboard' } : {}) } });
  const caches = {
    open: async (name) => {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name);
      return {
        put: async (k, res) => { log.puts.push({ cache: name, key: typeof k === 'string' ? k : k.url }); m.set(typeof k === 'string' ? k : k.url, res); },
        match: async (k) => m.get(typeof k === 'string' ? k : k.url),
      };
    },
    match: async (k) => { for (const m of store.values()) if (m.has(k)) return m.get(k); },
    keys: async () => [...store.keys()],
    delete: async (name) => { log.deleted.push(name); return store.delete(name); },
  };
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (ev, fn) => { handlers[ev] = fn; },
    skipWaiting: () => { log.skipWaiting++; return Promise.resolve(); },
    clients: { claim: () => { log.claim++; return Promise.resolve(); } },
  };
  const fetch = async (req) => {
    const url = typeof req === 'string' ? req : req.url;
    log.fetches.push(url);
    if (net === 'down') throw new TypeError('Failed to fetch');
    if (typeof net === 'function') return net(url);
    return mkRes(`<html>fresh ${url}</html>`);
  };
  const box = { self, caches, fetch, Response, URL, Promise, console, setTimeout };
  vm.createContext(box);
  vm.runInContext(SRC.replace("'__SW_VERSION__'", JSON.stringify(version)), box, { filename: 'sw.js' });
  /** Fire a fetch event; resolves {handled, response}. */
  async function fire(url, { method = 'GET', mode = 'navigate' } = {}) {
    let p = null;
    handlers.fetch({ request: { url: new URL(url, ORIGIN).href, method, mode }, respondWith: (x) => { p = x; } });
    return { handled: !!p, response: p ? await p : null };
  }
  async function lifecycle(ev) { let w = null; handlers[ev]({ waitUntil: (x) => { w = x; } }); await w; }
  return { box, handlers, store, log, fire, lifecycle, mkRes };
}

test('swRouteFor: only page loads of the app shell; never /api, never other methods or origins', () => {
  const { box } = load();
  const r = (url, o = {}) => box.swRouteFor({ url, method: 'GET', mode: 'navigate', origin: ORIGIN, ...o });
  assert.equal(r(`${ORIGIN}/`), 'shell');
  assert.equal(r(`${ORIGIN}/index.html`), 'shell');
  assert.equal(r(`${ORIGIN}/?nosw`), 'shell');
  assert.equal(r(`${ORIGIN}/#view=calendar`), 'shell');
  for (const p of ['/api/state', '/api/health', '/api/events', '/api/finance/summary', '/api', '/api/server/restart']) {
    assert.equal(r(ORIGIN + p), 'pass', p);
    assert.equal(r(ORIGIN + p, { mode: 'cors' }), 'pass', p);
  }
  assert.equal(r(`${ORIGIN}/`, { method: 'POST' }), 'pass');
  assert.equal(r(`${ORIGIN}/`, { method: 'HEAD' }), 'pass');
  assert.equal(r(`${ORIGIN}/`, { mode: 'cors' }), 'pass', 'a fetch() of / from the page is not the shell');
  assert.equal(r(`${ORIGIN}/sw.js`, { mode: 'same-origin' }), 'pass');
  assert.equal(r(`${ORIGIN}/favicon.ico`, { mode: 'no-cors' }), 'pass');
  assert.equal(r(`${ORIGIN}/data/config.json`), 'pass');
  assert.equal(r('https://example.org/'), 'pass', 'other origins');
  assert.equal(r('http://localhost:9999/'), 'pass', 'another port is another origin');
  assert.equal(r('::not a url::', { origin: undefined }), 'pass');
  assert.equal(box.swRouteFor(null), 'pass');
});

test('network first: the server copy is used and becomes the offline copy', async () => {
  const w = load();
  const { handled, response } = await w.fire('/');
  assert.equal(handled, true);
  assert.match(await response.text(), /fresh/);
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(w.log.puts.map(p => [p.cache, p.key]), [['dashboard-shell-v1', '/']]);
});

test('the cached copy only when the network fails; a page with no copy yet still explains', async () => {
  const w = load({ net: 'down', cached: { 'dashboard-shell-v1': {} } });
  (await w.store.get('dashboard-shell-v1')).set('/', new Response('<html>cached app</html>', { headers: { 'Content-Type': 'text/html' } }));
  const { response } = await w.fire('/');
  assert.equal(await response.text(), '<html>cached app</html>');
  const empty = load({ net: 'down' });
  const r2 = (await empty.fire('/index.html')).response;
  assert.equal(r2.status, 503);
  assert.match(await r2.text(), /The OpenDash server isn.t running/);
});

test('/api and data are never touched or cached, whatever the network does', async () => {
  for (const net of ['ok', 'down']) {
    const w = load({ net });
    for (const p of ['/api/state', '/api/health?quick=1', '/api/events', '/api/finance/export']) {
      for (const mode of ['cors', 'same-origin', 'navigate']) assert.equal((await w.fire(p, { mode })).handled, false, `${p} ${mode}`);
    }
    assert.equal((await w.fire('/api/state', { method: 'PUT', mode: 'cors' })).handled, false);
    assert.deepEqual(w.log.puts, []);
    assert.deepEqual(w.log.fetches, [], 'not even fetched by the worker');
  }
});

test('error pages and non-HTML are not kept as the offline copy', async () => {
  const w = load({ net: (url) => new Response('index.html is missing', { status: 500, headers: { 'Content-Type': 'text/plain' } }) });
  const { response } = await w.fire('/');
  assert.equal(response.status, 500, 'the network answer is still what the page gets');
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(w.log.puts, []);
  assert.equal(load().box.swCacheable(new Response('x', { headers: { 'Content-Type': 'application/json' } })), false);
});

test('install takes over at once and keeps a copy; activate deletes older versions and claims open pages', async () => {
  const w = load({ version: 'v2', cached: { 'dashboard-shell-v1': { '/': 'old' }, 'dashboard-shell-v0': {}, 'someone-else': {} } });
  await w.lifecycle('install');
  assert.equal(w.log.skipWaiting, 1);
  assert.deepEqual(w.log.puts.map(p => p.cache), ['dashboard-shell-v2']);
  await w.lifecycle('activate');
  assert.deepEqual(w.log.deleted.sort(), ['dashboard-shell-v0', 'dashboard-shell-v1']);
  assert.ok(w.store.has('someone-else'), 'caches that are not ours are left alone');
  assert.ok(w.store.has('dashboard-shell-v2'));
  assert.equal(w.log.claim, 1);
});

test('install with the server down does not fail', async () => {
  const w = load({ net: 'down' });
  await w.lifecycle('install');
  assert.equal(w.log.skipWaiting, 1);
  assert.deepEqual(w.log.puts, []);
});

test('only the dashboard\'s own page becomes the offline copy (not another program on the same port)', async () => {
  // e.g. a dev server on 4173 while the dashboard is stopped: its page is shown
  // (network first) but never replaces the dashboard's offline copy.
  const foreign = load({ net: () => new Response('<html>someone else</html>', { headers: { 'Content-Type': 'text/html' } }) });
  const { response } = await foreign.fire('/');
  assert.equal(await response.text(), '<html>someone else</html>');
  await foreign.lifecycle('install');
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(foreign.log.puts, [], 'not kept, neither on a page load nor at install');
  const w = load();
  assert.equal(w.box.swCacheable(w.mkRes('<html>app</html>')), true);
  assert.equal(w.box.swCacheable(w.mkRes('<html>app</html>', { mark: false })), false);
  assert.equal(w.box.swCacheable(new Response('x', { headers: { 'Content-Type': 'text/html', 'X-Dashboard-App': 'other' } })), false);
});
