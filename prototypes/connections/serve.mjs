import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] || 4174);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535.');
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/logos/gmail.svg', ['logos/gmail.svg', 'image/svg+xml']],
  ['/logos/google-calendar.svg', ['logos/google-calendar.svg', 'image/svg+xml']],
  ['/logos/outlook.png', ['logos/outlook.png', 'image/png']],
  ['/logos/claude.svg', ['logos/claude.svg', 'image/svg+xml']],
  ['/assets/brand/favicon.svg', ['../../assets/brand/favicon.svg', 'image/svg+xml']],
  ['/assets/brand/logo-mark.svg', ['../../assets/brand/logo-mark.svg', 'image/svg+xml']],
  ['/vendor/icons/lucide-sprite.svg', ['../../vendor/icons/lucide-sprite.svg', 'image/svg+xml']],
  ['/vendor/fonts/InterVariable-latin.woff2', ['../../vendor/fonts/InterVariable-latin.woff2', 'font/woff2']],
]);
const server = createServer(async (req, res) => {
  if (!['localhost:' + port, '127.0.0.1:' + port].includes(req.headers.host)) {
    res.writeHead(421); res.end('Misdirected request'); return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
  }
  const route = routes.get(new URL(req.url, 'http://127.0.0.1:' + port).pathname);
  if (!route) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const file = await readFile(fileURLToPath(new URL(route[0], import.meta.url)));
    res.writeHead(200, {
      'Content-Type': route[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : file);
  } catch { res.writeHead(500); res.end('Preview file unavailable'); }
});
server.listen(port, '127.0.0.1', () => console.log('OpenDash Connections prototype: http://127.0.0.1:' + port));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
