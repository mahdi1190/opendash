// server/file-watch.mjs - tells open tabs when a data file changes on disk behind the server's back.
//
// The assistant's MCP process (mcp/, embedded mode) and a sync from another computer write files
// directly: an expense the assistant creates, a friend's message another of your computers took in,
// a plan edited in a shared space. The state file already has its own watcher (live-sync.mjs); this
// one covers the files that live next to it:
//
//   expenses/*.json     Expenses (lib/expenses.mjs)
//   friends/*.json      Friends, Together (spaces.json), the shared garden (garden.json), your game and fun
//   profile.json        your card and look
//   finance/*.json      the finance analysis (and the read-only copy another computer sends: finance-share/)
//
// It emits one SSE event, `files`, with {rels: ['expenses/expenses.json', ...], at} (paths are relative to
// the data folder, '/'-separated), at most one every 250 ms. src/app/86-live-sync.js hands it to the pages
// (liveRefresh). fs.watch gives the speed; a slow stat poll covers file systems where watching is unreliable.
// Files the server rewrites all day without anyone caring (the outbox, logs, journals) are ignored.

import { watch, promises as fsp } from 'node:fs';
import { join, resolve } from 'node:path';

const DIRS = ['expenses', 'friends', 'finance', 'finance-share'];
const ROOT_FILES = ['profile.json'];
const IGNORE = new Set(['local.json', 'share-log.json', 'spaces-clock.json', 'journal.json', 'profile-visits.json']);
const POLL_MS = 5000;
const DEBOUNCE_MS = 250;
const MAX_FILES = 400;

export function createFileWatch({ dataDir, extraDirs = [], emit, log = () => {} }) {
  const root = resolve(dataDir);
  const dirs = [...new Set([...DIRS.map(d => join(root, d)), ...extraDirs.filter(Boolean).map(d => resolve(d))])];
  const seen = new Map();        // abs path -> 'mtimeMs:size'
  const watchers = new Map();    // dir -> FSWatcher
  let timer = null, poller = null, scanning = false, again = false, started = false;
  const pending = new Set();

  const rel = (abs) => abs.slice(root.length + 1).replace(/\\/g, '/');
  const relOf = (abs) => (abs.startsWith(root) ? rel(abs) : 'finance/' + abs.split(/[\\/]/).pop());
  const wanted = (name) => /\.json$/i.test(name) && !IGNORE.has(name) && !/\.tmp|\.lock/i.test(name);

  async function stamp(abs) {
    const st = await fsp.stat(abs).catch(() => null);
    return st && st.isFile() ? `${st.mtimeMs}:${st.size}` : null;
  }
  async function listing() {
    const out = [];
    for (const dir of dirs) {
      const names = await fsp.readdir(dir).catch(() => []);
      for (const n of names) if (wanted(n)) out.push(join(dir, n));
    }
    for (const n of ROOT_FILES) out.push(join(root, n));
    return out.slice(0, MAX_FILES);
  }
  /** Look at every watched file; announce the ones that changed since the last look. */
  async function scan(first) {
    if (scanning) { again = true; return; }
    scanning = true;
    try {
      const now = new Map();
      for (const abs of await listing()) { const s = await stamp(abs); if (s) now.set(abs, s); }
      if (!first) {
        for (const [abs, s] of now) if (seen.get(abs) !== s) pending.add(relOf(abs));
        for (const abs of seen.keys()) if (!now.has(abs)) pending.add(relOf(abs));   // deleted
      }
      seen.clear();
      for (const [k, v] of now) seen.set(k, v);
      if (pending.size) flushSoon();
    } catch (e) {
      log('warn', `file-watch scan failed: ${e.message}`);
    } finally {
      scanning = false;
      if (again) { again = false; scanSoon(); }
    }
  }
  function flushSoon() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const rels = [...pending].sort().slice(0, 50);
      pending.clear();
      if (rels.length) { try { emit('files', { rels, at: Date.now() }); } catch (e) { log('warn', `file-watch emit failed: ${e.message}`); } }
    }, DEBOUNCE_MS);
    timer.unref?.();
  }
  let scanT = null;
  function scanSoon() { clearTimeout(scanT); scanT = setTimeout(() => scan(false), 80); scanT.unref?.(); }

  function watchDir(dir) {
    if (watchers.has(dir)) return;
    try {
      const w = watch(dir, { persistent: false }, (ev, name) => { if (!name || wanted(String(name))) scanSoon(); });
      w.on('error', () => { try { w.close(); } catch { /* gone */ } watchers.delete(dir); });
      watchers.set(dir, w);
    } catch { /* the folder is not there yet: the poll picks it up when it is */ }
  }
  async function attach() {
    for (const dir of dirs) if (!watchers.has(dir) && (await fsp.stat(dir).catch(() => null))) watchDir(dir);
    if (!watchers.has(root)) {
      try {
        const w = watch(root, { persistent: false }, (ev, name) => { if (!name || ROOT_FILES.includes(String(name))) scanSoon(); });
        w.on('error', () => { try { w.close(); } catch { /* gone */ } watchers.delete(root); });
        watchers.set(root, w);
      } catch { /* polling only */ }
    }
  }

  async function start() {
    if (started) return;
    started = true;
    await scan(true);
    await attach();
    poller = setInterval(() => { attach().catch(() => {}); scan(false); }, POLL_MS);
    poller.unref?.();
  }
  function close() {
    clearTimeout(timer); clearTimeout(scanT); clearInterval(poller);
    for (const w of watchers.values()) { try { w.close(); } catch { /* gone */ } }
    watchers.clear(); started = false;
  }
  return { start, close, scan: () => scan(false) };
}
