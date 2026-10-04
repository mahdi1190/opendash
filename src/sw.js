/* ============================================================
   SERVICE WORKER - the offline page (served as /sw.js by
   server/routes/server-control.mjs, which stamps the version).
   ============================================================
   The ONLY thing it does: when the dashboard server is not running, opening
   the dashboard shows the last copy of the app (index.html) instead of the
   browser's "can't reach this page", so the page can show "The dashboard
   server isn't running" with [Start server] and [Retry].

   - Network first for the app shell (/ and /index.html, page loads only):
     the copy from the server is always used when the server answers; the
     cached copy ONLY when the network fails. Only a page the server marks
     X-Dashboard-App: dashboard is kept (not another program on the port).
   - /api/* and everything else is never touched, never cached.
   - One cache per version ('dashboard-shell-<version>'); a new build is a new
     worker that takes over at once (skipWaiting + clients.claim) and deletes
     the older caches, so a stale page after an update cannot happen.
   - Turned off with ?nosw in the address or Settings > Server (the page
     unregisters it).
   swRouteFor() is pure (tests/sw.test.mjs loads this file in a VM).
   ============================================================ */
const SW_VERSION = '__SW_VERSION__';
const SW_CACHE_PREFIX = 'dashboard-shell-';
const SW_CACHE = SW_CACHE_PREFIX + SW_VERSION;
const SW_SHELL_KEY = '/';

/**
 * What to do with a request: 'shell' (network first, cached copy when the
 * network fails) or 'pass' (not handled at all: the browser fetches it as if
 * there were no service worker; nothing is cached).
 * req: {url, method, mode, origin} - origin is the worker's own origin.
 */
function swRouteFor(req) {
  if (!req || String(req.method || 'GET').toUpperCase() !== 'GET') return 'pass';
  let u;
  try { u = new URL(String(req.url), req.origin || undefined); } catch (e) { return 'pass'; }
  if (req.origin && u.origin !== req.origin) return 'pass';
  const p = u.pathname;
  if (p === '/api' || p.startsWith('/api/')) return 'pass';           // never data
  if (req.mode !== 'navigate') return 'pass';                         // only page loads
  if (p === '/' || p === '/index.html') return 'shell';
  return 'pass';
}

/** Whether a network response may become the offline copy. */
function swCacheable(res) {
  if (!res || !res.ok || res.status !== 200 || res.type === 'opaque' || res.redirected) return false;
  const get = (h) => (res.headers && res.headers.get && res.headers.get(h)) || '';
  // Only the dashboard's own page (server/index.mjs marks it): another program
  // that later uses the same port (a dev server on 4173, say) never becomes the
  // offline copy.
  return /^text\/html\b/i.test(get('content-type')) && get('x-dashboard-app') === 'dashboard';
}

/** The page for "no server and no copy yet" (no script: plain links). */
function swOfflineHtml() {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>OpenDash - server not running</title><style>body{font:15px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f7f8;color:#1c1c1f}'
    + 'main{max-width:440px;padding:32px;border:1px solid #e3e3e6;border-radius:12px;background:#fff}h1{font-size:18px;margin:0 0 8px}p{margin:0 0 16px;color:#55555c}a{color:#3554d1}'
    + '@media (prefers-color-scheme: dark){body{background:#151517;color:#ececef}main{background:#1d1d20;border-color:#2c2c31}p{color:#a5a5ad}a{color:#8ea2ff}}</style></head>'
    + '<body><main><h1>The OpenDash server isn\'t running.</h1><p>Start it with your OpenDash shortcut (start-opendash in the app folder), then try again.</p>'
    + '<p><a href="/">Retry</a></p></main></body></html>';
}

async function swShell(request) {
  try {
    // (the server answers index.html with Cache-Control: no-store, so this is always fresh)
    const res = await fetch(request);
    if (swCacheable(res)) {
      const copy = res.clone();
      caches.open(SW_CACHE).then(c => c.put(SW_SHELL_KEY, copy)).catch(() => {});
    }
    return res;
  } catch (e) {
    // The network failed: the server is not running. The last copy of the app
    // boots into the "server isn't running" banner.
    const cache = await caches.open(SW_CACHE).catch(() => null);
    const hit = cache ? await cache.match(SW_SHELL_KEY) : null;
    if (hit) return hit;
    return new Response(swOfflineHtml(), { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function' && typeof caches !== 'undefined') {
  self.addEventListener('install', (event) => {
    self.skipWaiting();
    // Keep a copy right away (best effort: the server is up when the page registers us).
    event.waitUntil(fetch(SW_SHELL_KEY, { cache: 'no-store' })
      .then(res => (swCacheable(res) ? caches.open(SW_CACHE).then(c => c.put(SW_SHELL_KEY, res)) : null))
      .catch(() => null));
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(SW_CACHE_PREFIX) && k !== SW_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
  });
  self.addEventListener('fetch', (event) => {
    const r = event.request;
    if (swRouteFor({ url: r.url, method: r.method, mode: r.mode, origin: self.location.origin }) !== 'shell') return;
    event.respondWith(swShell(r));
  });
}
