#!/usr/bin/env node
// Only MCP and OAuth are published. The ordinary dashboard remains loopback.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, resolveDataDir, argValue } from '../lib/datadir.mjs';
import { readJson, writeJson } from '../lib/fsutil.mjs';
import { createRemoteAuth, remoteOrigin } from '../lib/remote-mcp-auth.mjs';

export function bridgeMcp(dataDir, message) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [join(REPO_ROOT, 'mcp', 'server.mjs'), '--data-dir', dataDir, '--mode', 'propose'], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '', settled = false;
    const finish = (err, value) => { if (settled) return; settled = true; clearTimeout(timer); child.stdin.end(); child.kill(); err ? reject(err) : resolveResult(value); };
    const timer = setTimeout(() => finish(new Error('MCP timed out')), 30000);
    child.on('error', e => finish(e)); child.on('close', () => finish(new Error('MCP stopped')));
    child.stderr.resume(); child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buf += chunk;
      if (buf.length > 2 * 1024 * 1024) return finish(new Error('MCP response too large'));
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        try { const response = JSON.parse(line); if (response.id === message.id) finish(null, response); } catch { finish(new Error('Invalid MCP response')); }
      }
    });
    child.stdin.on('error', e => finish(e));
    child.stdin.write(JSON.stringify(message) + '\n');
  });
}
export function createRemoteServer({ dataDir, publicOrigin, now, rpc = message => bridgeMcp(dataDir, message) }) {
  const auth = createRemoteAuth({ dataDir, publicOrigin, now });
  let active = 0, windowAt = Date.now(), calls = 0;
  const server = createServer(async (req, res) => {
    const send = (status, body, type = 'application/json', extra = {}) => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'", ...extra }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
    try {
      if (Date.now() - windowAt > 60000) { windowAt = Date.now(); calls = 0; }
      if (++calls > 240) return send(429, { error: 'rate_limit' });
      const host = req.headers.host || '';
      if (host !== new URL(auth.origin).host && !/^127\.0\.0\.1:\d+$/.test(host) && !/^localhost:\d+$/.test(host)) return send(421, { error: 'invalid_host' });
      if (req.headers.origin && ![auth.origin, 'https://claude.ai'].includes(req.headers.origin)) return send(403, { error: 'invalid_origin' });
      const url = new URL(req.url, auth.origin), path = url.pathname;
      const get = req.method === 'GET', post = req.method === 'POST';
      const body = async json => {
        const type = String(req.headers['content-type'] || '').split(';')[0];
        if (type !== (json ? 'application/json' : 'application/x-www-form-urlencoded')) throw Object.assign(new Error('invalid_content_type'), { status: 415 });
        let chunks = '', size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 256 * 1024) throw Object.assign(new Error('body_too_large'), { status: 413 }); chunks += chunk; }
        try { return json ? JSON.parse(chunks) : Object.fromEntries(new URLSearchParams(chunks)); } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
      };
      if (get && path === '/.well-known/oauth-authorization-server') return send(200, auth.metadata());
      if (get && ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'].includes(path)) return send(200, { resource: auth.resource, authorization_servers: [auth.origin], scopes_supported: ['opendash:read', 'opendash:propose'] });
      if (post && path === '/oauth/register') return send(201, await auth.register(await body(true)));
      if (post && path === '/oauth/token') return send(200, await auth.token(await body(false)));
      if (post && path === '/oauth/revoke') { const b = await body(false); await auth.revoke(b.token); return send(200, {}); }
      if (get && path === '/oauth/authorize') {
        const r = await auth.authorize(Object.fromEntries(url.searchParams));
        return send(302, '', 'text/plain', { Location: '/oauth/continue?ticket=' + encodeURIComponent(r.ticket) });
      }
      if (get && path === '/oauth/continue') {
        const r = await auth.continue(url.searchParams.get('ticket'));
        if (r.redirect) return send(302, '', 'text/plain', { Location: r.redirect });
        return send(200, `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="3"><title>Connect OpenDash</title><body style="font:18px system-ui;max-width:36rem;margin:4rem auto;padding:1rem"><h1>Approve in your local OpenDash</h1><p>Open Connections on the computer running your dashboard. Match this code and approve Claude’s access:</p><p style="font-size:2rem">${r.displayCode}</p><p>Claude can read dashboard context and propose changes. Changes still need your approval in OpenDash.</p><p>This page continues automatically after you approve. The request expires after ten minutes.</p>`, 'text/html; charset=utf-8');
      }
      if (path !== '/mcp') return send(404, { error: 'not_found' });
      const grant = await auth.verify(/^Bearer ([A-Za-z0-9_-]+)$/.exec(req.headers.authorization || '')?.[1]);
      if (!grant) return send(401, { error: 'unauthorized' }, 'application/json', { 'WWW-Authenticate': `Bearer resource_metadata="${auth.origin}/.well-known/oauth-protected-resource/mcp", scope="opendash:read opendash:propose"` });
      if (!post) return send(405, { error: 'POST only' }, 'application/json', { Allow: 'POST' });
      const msg = await body(true);
      if (!msg || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || (msg.id !== undefined && typeof msg.id !== 'number' && typeof msg.id !== 'string')) return send(400, { error: 'invalid_request' });
      if (msg.id === undefined && msg.method.startsWith('notifications/')) return send(202, '', 'text/plain');
      if (msg.id === undefined) return send(400, { error: 'request_id_required' });
      if (msg.method === 'tools/call' && msg.params?.name === 'propose_changes' && !grant.scope.split(' ').includes('opendash:propose')) return send(403, { error: 'insufficient_scope' });
      if (!grant.scope.split(' ').includes('opendash:read')) return send(403, { error: 'insufficient_scope' });
      if (active >= 4) return send(429, { error: 'busy' });
      active++;
      try { return send(200, await rpc(msg)); } finally { active--; }
    } catch (e) { send(e.status || 500, { error: e.status ? e.error || e.message : 'gateway_error' }); }
  });
  return { server, auth };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2), dataDir = resolveDataDir({ argv });
  const file = join(dataDir, 'secrets', 'remote-mcp-config.json');
  const saved = await readJson(file, { fallback: {} });
  const publicOrigin = remoteOrigin(argValue(argv, '--public-origin') || saved.publicOrigin || '');
  const port = Number(argValue(argv, '--listen-port')) || 4911;
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 4173) throw new Error('Choose a separate gateway port.');
  await writeJson(file, { publicOrigin, port }, { mode: 0o600 });
  const { server } = createRemoteServer({ dataDir, publicOrigin });
  server.listen(port, '127.0.0.1', () => process.stderr.write(`Remote MCP gateway listening on loopback port ${port}; tunnel only this port.\n`));
}
