// Encrypted sync on an in-memory platform (no file system, no node: in the
// core): what a phone or desktop-shell build would run. Two engines with the
// key layer, an in-memory secret store, store and transport: the first one
// makes the group, the second pairs with the 6-digit code, both converge,
// and the shared place holds nothing readable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncEngine } from '../lib/sync/engine.mjs';
import { createE2E } from '../lib/sync/e2e.mjs';
import { syncedView } from '../lib/sync/model.mjs';
import { memorySecrets } from './sync-e2e.shared.mjs';

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
/** A shared place: "devices/<id>/<name>" -> text, with the calls encrypted sync needs too. */
function memoryCloud() {
  const files = new Map();
  let clock = 1;
  const make = (deviceId) => {
    const p = (id, n) => `devices/${id}/${n}`;
    const own = (n) => p(deviceId, n);
    const put = (path, text) => files.set(path, { text, mtimeMs: clock++ });
    const LOG = 'ops-20261023.jsonl';
    return {
      kind: 'memory', where: 'mem://cloud',
      ready: async () => true,
      listDevices: async () => [...new Set([...files.keys()].map(k => k.split('/')[1]))].sort(),
      async listFiles(id) {
        const out = { logs: [], snapshot: null, device: null, keys: null, pair: null };
        for (const [k, f] of files) {
          const [, d, n] = k.split('/');
          if (d !== id) continue;
          const e = { name: n, size: f.text.length, mtimeMs: f.mtimeMs };
          if (n === 'snapshot.json') out.snapshot = e; else if (n === 'device.json') out.device = e; else if (n === 'keys.json') out.keys = e; else if (n === 'pair.json') out.pair = e; else if (/^ops-\d{8}\.jsonl$/.test(n)) out.logs.push(e);
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
      nextLogName: async () => LOG,
      async appendLog(lines, { name = LOG } = {}) {
        const cur = files.get(own(name));
        const text = (cur ? cur.text : '') + lines.map(l => JSON.stringify(l) + '\n').join('');
        put(own(name), text);
        return { name, size: text.length };
      },
      logSizes: async () => { const f = files.get(own(LOG)); return f ? { [LOG]: f.text.length } : {}; },
      lastOwnSeq: async () => 0,
      writeDevice: async (info) => put(own('device.json'), JSON.stringify({ v: 1, deviceId, format: 1, enc: null, ...info })),
      writeSnapshot: async (snap) => put(own('snapshot.json'), JSON.stringify({ enc: null, ...snap })),
      writeOwnJson: async (n, v) => put(own(n), JSON.stringify(v)),
      removeOwnFile: async (n) => { files.delete(own(n)); },
      removeOldDevice: async (id) => { for (const k of [...files.keys()]) if (k.startsWith(`devices/${id}/`) && id !== deviceId) files.delete(k); },
      removeOwnLog: async () => {},
      forget: () => {},
    };
  };
  return { make, files };
}

test('encrypted sync on an in-memory platform: the first device, a phone paired with the 6-digit code, both converge', async () => {
  const cloud = memoryCloud();
  const mk = (name, state, kind) => {
    const store = memoryStore(state);
    const e2e = createE2E({ secrets: memorySecrets(), kind });
    const eng = createSyncEngine({ store, host: memoryHost(name, store), adapterFactory: ({ deviceId }) => cloud.make(deviceId), pollMs: 60000, watch: false, background: kind !== 'phone', e2e, kind });
    return { store, eng };
  };
  const D = mk('desktop', { custom: [{ id: 'u-1', title: 'Write the report', subtasks: [] }], statuses: {} }, 'computer');
  const P = mk('phone', { custom: [] }, 'phone');
  await D.eng.start();
  const r = await D.eng.setupFirst({ folder: 'mem://cloud', deviceName: 'Desktop', apply: true });
  assert.ok(r.recoveryCode);
  await P.eng.start();
  await P.eng.joinExisting({ folder: 'mem://cloud', deviceName: 'Phone', apply: true });
  await P.eng.pairStart();
  await D.eng.syncNow();
  const req = D.eng.status().e2e.requests[0];
  assert.equal(req.name, 'Phone');
  await D.eng.pairRespond(req.sid);
  await P.eng.syncNow();
  await D.eng.syncNow();
  const pc = P.eng.status().e2e.pairing, dc = D.eng.status().e2e.pairing;
  assert.equal(pc.code, dc.code);
  await P.eng.pairConfirm(pc.sid, true);
  await D.eng.pairConfirm(dc.sid, true);
  const settle = async () => { for (let i = 0; i < 3; i++) { await D.eng.syncNow(); await P.eng.syncNow(); } };
  await settle();
  assert.equal(P.eng.status().e2e.ready, true);
  assert.equal((await P.store.readObject()).custom[0].title, 'Write the report');
  await D.store.mutate(c => { const n = structuredClone(c); n.custom[0].priority = 'p1'; return { next: n }; }, { source: 'ui' });
  await P.store.mutate(c => { const n = structuredClone(c); n.custom[0].title = 'Write the final report'; n.statuses['u-1'] = 'doing'; return { next: n }; }, { source: 'ui' });
  await settle();
  const a = await D.store.readObject(), p = await P.store.readObject();
  assert.equal(syncedView(a), syncedView(p));
  assert.equal(a.custom[0].title, 'Write the final report');
  assert.equal(a.custom[0].priority, 'p1');
  const all = [...cloud.files.values()].map(f => f.text).join('\n');
  for (const s of ['report', 'Desktop', 'Phone', 'doing']) assert.ok(!all.includes(s), s);
  assert.equal(D.eng.status().devices.find(d => !d.me).kind, 'phone');
  assert.equal(await P.eng.isFetcher('ai-brief'), false);
  await D.eng.stop(); await P.eng.stop();
});
