// server/live-sync.mjs - tells open tabs when the state version changes.
//
// GET /api/events (server/routes/actions.mjs) is a Server-Sent Events stream:
//   event: hello   data: {version}                      on connect
//   event: state   data: {version, source, client, summary}   on every change
//   event: calendar data: {op, ids, removed, calendarId, client, at}  a change written to Google Calendar
//   : ping                                              every 25 s
//
// Changes come from two places:
//   - writes this server makes (store.onChange: PUT /api/state, /api/actions);
//   - writes by OTHER processes: the MCP server in embedded mode, tools/
//     scripts. The state folder is watched (fs.watch on the folder, because an
//     atomic rename replaces the file) with a slow mtime poll as a fallback for
//     file systems where watching is unreliable (network drives, some sync
//     clients). Their source comes from the actions journal when the version
//     matches an entry, else 'external'.

import { watch, promises as fsp } from 'node:fs';
import { basename, dirname } from 'node:path';
import { withLock } from '../lib/fsutil.mjs';

const MAX_CLIENTS = 32;
const PING_MS = 25000;
const POLL_MS = 4000;

export function createLiveSync({ store, journal, log = () => {} }) {
  const clients = new Set();
  let lastVersion = 0;
  let lastMtime = 0;
  let checking = false, again = false, timer = null, watcher = null, poller = null, pinger = null;
  const fileName = basename(store.file);

  function send(res, event, data) {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* client gone */ }
  }
  function broadcast(info) {
    const v = Number(info.version) || 0;
    if (v <= lastVersion) return;
    lastVersion = v;
    const data = {
      version: v, source: info.source || 'external', ...(info.client ? { client: info.client } : {}),
      ...(info.summary ? { summary: String(info.summary).slice(0, 200) } : {}), ...(info.undo ? { undo: info.undo } : {}),
    };
    for (const res of clients) send(res, 'state', data);
  }

  // Our own writes: announce at once, with the source we know.
  const unsubscribe = store.onChange((info) => broadcast(info));

  async function checkFile() {
    if (checking) { again = true; return; }
    checking = true;
    try {
      const st = await fsp.stat(store.file).catch(() => null);
      if (!st) return;
      if (st.mtimeMs === lastMtime) return;
      // Under the state lock: a writer stamps the new version and journals it
      // (afterCommit) before it lets go, so the version and its journal entry
      // are read together. Read between the two, a change made by the actions
      // layer would be announced as 'external'.
      const { v, h } = await withLock(store.file, async () => {
        const ver = await store.version();
        return { v: ver, h: ver > lastVersion && journal ? await journal.latestFor(ver).catch(() => null) : null };
      });
      lastMtime = st.mtimeMs;
      if (v > lastVersion) {
        broadcast({ version: v, source: h ? h.source : 'external', client: h && h.client, summary: h && h.summary, undo: h && h.undoable ? h.token : null });
      }
    } catch (e) {
      log('warn', `live-sync check failed: ${e.message}`);
    } finally {
      checking = false;
      if (again) { again = false; schedule(); }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(checkFile, 120); timer.unref?.(); }

  async function start() {
    lastVersion = await store.version().catch(() => 0);
    const st = await fsp.stat(store.file).catch(() => null);
    lastMtime = st ? st.mtimeMs : 0;
    try {
      watcher = watch(dirname(store.file), { persistent: false }, (ev, name) => { if (!name || String(name) === fileName) schedule(); });
      watcher.on('error', () => { try { watcher.close(); } catch {} watcher = null; });
    } catch (e) { log('warn', `live-sync: cannot watch the state folder (${e.code || e.message}); polling only`); }
    poller = setInterval(checkFile, POLL_MS); poller.unref?.();
    pinger = setInterval(() => { for (const res of clients) { try { res.write(': ping\n\n'); } catch {} } }, PING_MS); pinger.unref?.();
  }

  /** Attach an SSE response. Resolves when the client goes away. */
  function attach(req, res, headers = {}) {
    if (clients.size >= MAX_CLIENTS) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'too many live connections' }));
      return Promise.resolve();
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff', 'X-Accel-Buffering': 'no', ...headers,
    });
    res.write('retry: 3000\n\n');
    send(res, 'hello', { version: lastVersion });
    clients.add(res);
    req.socket.setKeepAlive?.(true);
    req.socket.setTimeout?.(0);
    return new Promise((resolve) => {
      const done = () => { clients.delete(res); resolve(); };
      req.on('close', done);
      res.on('close', done);
    });
  }

  /** Any other named event for open tabs, e.g. 'calendar' (lib/calendar-write.mjs changed Google Calendar). */
  function emit(event, data) {
    if (!/^[a-z][a-z-]{1,30}$/.test(String(event)) || event === 'state' || event === 'hello') return;
    for (const res of clients) send(res, event, data);
  }

  function close() {
    unsubscribe();
    clearTimeout(timer); clearInterval(poller); clearInterval(pinger);
    try { watcher && watcher.close(); } catch {}
    for (const res of clients) { try { res.end(); } catch {} try { res.socket && res.socket.destroy(); } catch {} }
    clients.clear();
  }

  return { start, attach, close, broadcast, emit, checkFile, get clientCount() { return clients.size; }, get version() { return lastVersion; } };
}
