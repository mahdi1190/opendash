// The sync CORE is platform-agnostic (for a later phone, desktop-shell or PWA
// build): lib/sync/{hlc,fracindex,model,manifest,engine}.mjs import nothing
// from node:, and the engine runs end to end with an in-memory host, an
// in-memory store and an in-memory transport (what a mobile app would back
// with app storage and a cloud API), with no file system at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSyncEngine } from '../lib/sync/engine.mjs';
import { syncedView } from '../lib/sync/model.mjs';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'sync');
const CORE = ['hlc.mjs', 'fracindex.mjs', 'model.mjs', 'manifest.mjs', 'engine.mjs'];

test('the core imports nothing platform-specific', () => {
  for (const f of CORE) {
    const code = readFileSync(join(LIB, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /from\s+['"]node:|require\(|\bBuffer\b|\bprocess\.|__dirname/, `${f} must stay platform-agnostic`);
    for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert.ok(CORE.includes(m[1].replace('./', '')), `${f} imports ${m[1]}`);
  }
});

// ─── In-memory platform ──────────────────────────────────────────────────
function memoryStore(initial) {
  let state = { ...initial, _lastSave: 1 };
  const subs = new Set();
  let chain = Promise.resolve();
  return {
    file: null,
    readObject: async () => structuredClone(state),
    onChange: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    mutate(fn, opts = {}) {
      const p = chain.then(async () => {
        const cur = structuredClone(state);
        const out = await fn(cur, { version: state._lastSave });
        if (!out || !out.next) return { version: state._lastSave, written: false, result: out && out.result };
        const v = Math.max(Date.now(), state._lastSave + 1);
        state = { ...out.next, _lastSave: v };
        for (const s of subs) s({ version: v, source: opts.source || 'ui', client: opts.client, dataChanged: true });
        return { version: v, written: true, result: out.result };
      });
      chain = p.catch(() => {});
      return p;
    },
  };
}
function memoryHost(name, store) {
  const local = new Map(), data = new Map();
  return {
    hostKey: name, defaultName: name,
    local: {
      where: `mem:${name}`,
      read: async (n) => (local.has(n) ? local.get(n) : null), write: async (n, t) => { local.set(n, t); },
      remove: async (n) => { local.delete(n); }, rename: async (a, b) => { local.set(b, local.get(a)); local.delete(a); }, exists: async (n) => local.has(n),
    },
    data: {
      readJson: async (rel) => (data.has(rel) ? { present: true, value: JSON.parse(data.get(rel)) } : { present: false }),
      writeJson: async (rel, v) => { data.set(rel, JSON.stringify(v)); }, remove: async (rel) => { data.delete(rel); },
      list: async (dir) => [...data.keys()].filter(k => k.startsWith(dir + '/')).map(k => k.slice(dir.length + 1)).filter(n => !n.includes('/')),
      stamp: async (rel) => (data.has(rel) ? String(data.get(rel).length) + ':' + data.get(rel).slice(-8) : '-'),
    },
    stateStamp: async () => String((await store.readObject())._lastSave),
    checkFolder: async (f) => ({ ok: true, path: f }), folderLabel: () => 'the test cloud', detect: () => [],
  };
}
/** A shared cloud: path -> text. Each device writes only under devices/<its id>/. Offsets count characters. */
function memoryCloud() {
  const files = new Map();
  let clock = 1;
  return (deviceId) => {
    const p = (id, n) => `devices/${id}/${n}`;
    const own = (n) => p(deviceId, n);
    const put = (path, text) => files.set(path, { text, mtimeMs: clock++ });
    return {
      kind: 'memory', where: 'mem://cloud',
      ready: async () => true,
      listDevices: async () => [...new Set([...files.keys()].map(k => k.split('/')[1]))].sort(),
      async listFiles(id) {
        const out = { logs: [], snapshot: null, device: null };
        for (const [k, f] of files) {
          const [, d, n] = k.split('/');
          if (d !== id) continue;
          const e = { name: n, size: f.text.length, mtimeMs: f.mtimeMs };
          if (n === 'snapshot.json') out.snapshot = e; else if (n === 'device.json') out.device = e; else if (/^ops-\d{8}\.jsonl$/.test(n)) out.logs.push(e);
        }
        return out;
      },
      readJson: async (id, n) => { const f = files.get(p(id, n)); try { return f ? JSON.parse(f.text) : null; } catch { return null; } },
      async readLog(id, n, offset) {
        const f = files.get(p(id, n));
        const text = f ? f.text : '';
        const lines = [];
        let start = offset;
        for (let i = offset; i < text.length; i++) if (text[i] === '\n') { lines.push({ obj: JSON.parse(text.slice(start, i)), end: i + 1 }); start = i + 1; }
        return { lines, end: start, partial: text.length - start, bad: null };
      },
      skipLine: async () => null,
      async appendLog(lines) {
        const n = 'ops-20261023.jsonl';
        const cur = files.get(own(n));
        const text = (cur ? cur.text : '') + lines.map(l => JSON.stringify(l) + '\n').join('');
        put(own(n), text);
        return { name: n, size: text.length };
      },
      logSizes: async () => { const f = files.get(own('ops-20261023.jsonl')); return f ? { 'ops-20261023.jsonl': f.text.length } : {}; },
      lastOwnSeq: async () => 0,
      writeDevice: async (info) => put(own('device.json'), JSON.stringify({ v: 1, deviceId, format: 1, enc: null, ...info })),
      writeSnapshot: async (snap) => put(own('snapshot.json'), JSON.stringify({ enc: null, ...snap })),
      removeOwnLog: async () => {},
      forget: () => {},
    };
  };
}

test('two engines on an in-memory platform (no file system) converge', async () => {
  const cloud = memoryCloud();
  const mk = (name, state) => {
    const store = memoryStore(state);
    const eng = createSyncEngine({ store, host: memoryHost(name, store), adapterFactory: ({ deviceId }) => cloud(deviceId), pollMs: 60000, watch: false, background: name !== 'phone' });
    return { store, eng };
  };
  const A = mk('desktop', { custom: [{ id: 'u-1', title: 'Write the report', subtasks: [] }], statuses: {} });
  const P = mk('phone', { custom: [] });
  await A.eng.start(); await A.eng.configure({ enabled: true, apply: true, folder: 'mem://cloud', deviceName: 'Desktop' });
  await P.eng.start(); await P.eng.configure({ enabled: true, apply: true, folder: 'mem://cloud', deviceName: 'Phone' });
  const settle = async () => { for (let i = 0; i < 3; i++) { await A.eng.syncNow(); await P.eng.syncNow(); } };
  await settle();
  assert.equal((await P.store.readObject()).custom[0].title, 'Write the report');
  await A.store.mutate(c => { const n = structuredClone(c); n.custom[0].priority = 'p1'; return { next: n }; }, { source: 'ui' });
  await P.store.mutate(c => { const n = structuredClone(c); n.custom[0].title = 'Write the final report'; n.statuses['u-1'] = 'doing'; return { next: n }; }, { source: 'ui' });
  await settle();
  const a = await A.store.readObject(), p = await P.store.readObject();
  assert.equal(syncedView(a), syncedView(p));
  assert.equal(a.custom[0].title, 'Write the final report');
  assert.equal(a.custom[0].priority, 'p1');
  assert.equal(await P.eng.isFetcher('ai-brief'), false, 'the phone leaves background jobs to the desktop');
  assert.equal(await A.eng.isFetcher('ai-brief'), true);
  await A.eng.stop(); await P.eng.stop();
});
