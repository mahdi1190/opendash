// The encrypted-sync routes (server/routes/sync.mjs) with a stand-in app: two
// "servers" share a temp cloud folder; the first sets up (the recovery code
// comes back once), the second joins with "Approve on your other computer",
// a device is renamed and removed, mistakes come back as 400 {error, code}.
// Nothing is written to the real per-user folder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, rm } from './sync-e2e.shared.mjs';
import { createStateStore } from '../server/state-store.mjs';

const base = tempDir('sync-e2e-routes-');
const cloud = join(base, 'cloud');
mkdirSync(cloud);
process.env.DASHBOARD_DEVICE_DIR = join(base, 'device-root');     // secrets and sync's own files stay in the test folder
const servers = [];
after(async () => { for (const s of servers) for (const f of s.closers) await f(); delete process.env.DASHBOARD_DEVICE_DIR; rm(base); });

async function server(name) {
  const root = join(base, `data-${name}`);
  mkdirSync(join(root, 'state'), { recursive: true });
  writeFileSync(join(root, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [{ id: `u-${name}`, title: `Task on ${name}`, subtasks: [] }], _lastSave: 1 }));
  const store = createStateStore({ stateDir: join(root, 'state') });
  const routes = new Map(), ready = [], closers = [];
  const app = {
    ctx: { store, log: () => {}, paths: { root }, repoRoot: join(base, 'app'), version: '2.14.0-test' },
    route: (r) => routes.set(`${r.method} ${r.path}`, r.handler),
    onReady: (f) => ready.push(f), onClose: (f) => closers.push(f),
  };
  const { default: register } = await import('../server/routes/sync.mjs');
  register(app);
  for (const f of ready) await f();
  const call = async (path, body) => {
    const h = routes.get(`${body === undefined ? 'GET' : 'POST'} ${path}`);
    assert.ok(h, path);
    let status = 200;
    const out = await h({ body: async () => body, json: (code, v) => { status = code; return v; } });
    return { status, json: JSON.parse(JSON.stringify(out)) };
  };
  const s = { name, call, closers, sync: app.ctx.sync };
  servers.push(s);
  return s;
}

test('set up, approve a second computer, rename and remove it, through the routes', async () => {
  const A = await server('a'), B = await server('b');
  let r = await A.call('/api/sync/status');
  assert.equal(r.json.enabled, false);
  assert.equal(r.json.e2e.available, true);
  r = await A.call('/api/sync/setup', { folder: join(base, 'nope') });
  assert.equal(r.status, 400); assert.match(r.json.error, /does not exist/);
  r = await A.call('/api/sync/setup', { folder: cloud, deviceName: 'Work laptop', apply: true });
  assert.equal(r.status, 200);
  assert.match(r.json.recoveryCode, /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal((await A.call('/api/sync/status')).json.recoveryCode, undefined, 'only once');
  r = await B.call('/api/sync/setup', { folder: cloud });
  assert.equal(r.json.code, 'GROUP_EXISTS');
  r = await B.call('/api/sync/recovery', { code: 'nonsense' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'NOT_JOINING', 'choose "No, I already use OpenDash" first');
  r = await B.call('/api/sync/join', { folder: cloud, deviceName: 'Home PC', apply: true });
  assert.equal(r.json.state, 'locked');
  assert.equal((await B.call('/api/sync/recovery', { code: 'ABCD' })).json.code, 'BAD_CODE');
  r = await B.call('/api/sync/pair/start', {});
  assert.equal(r.json.e2e.pairing.step, 'waiting');
  r = await A.call('/api/sync/now', {});
  const req = r.json.e2e.requests[0];
  assert.equal(req.name, 'Home PC');
  await A.call('/api/sync/pair/respond', { sid: req.sid });
  await B.call('/api/sync/now', {});
  await A.call('/api/sync/now', {});
  const bc = (await B.call('/api/sync/status')).json.e2e.pairing, ac = (await A.call('/api/sync/status')).json.e2e.pairing;
  assert.equal(bc.code, ac.code);
  await B.call('/api/sync/pair/confirm', { sid: bc.sid, match: true });
  await A.call('/api/sync/pair/confirm', { sid: ac.sid, match: true });
  for (let i = 0; i < 3; i++) { await B.call('/api/sync/now', {}); await A.call('/api/sync/now', {}); }
  r = await B.call('/api/sync/status');
  assert.equal(r.json.e2e.ready, true);
  const bId = r.json.devices.find(d => d.me).id;
  r = await A.call('/api/sync/devices/rename', { id: bId, name: 'Study PC' });
  assert.ok(r.json.devices.some(d => d.name === 'Study PC'));
  r = await A.call('/api/sync/offer', {});
  assert.match(r.json.offer.text, /^opendash-join:1:/);
  // "Use this computer instead" goes through the accounts code: no sign-in here -> refused; unknown -> refused.
  writeFileSync(join(base, 'data-a', 'accounts.json'), JSON.stringify({ version: 1, accounts: [{ id: 'acc_00000000000000e1', provider: 'microsoft', email: 'alex@example.com', status: 'connected', fetcher: 'otherhost0001' }] }));
  r = await A.call('/api/sync/fetcher', { account: 'acc_00000000000000e1' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'SIGN_IN_FIRST'); assert.match(r.json.error, /Sign in on this computer to take over/);
  r = await A.call('/api/sync/fetcher', { account: 'nope' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'UNKNOWN_ACCOUNT');
  r = await A.call('/api/sync/devices/remove', { id: bId });
  assert.ok(!r.json.devices.some(d => d.id === bId));
  for (let i = 0; i < 2; i++) { await B.call('/api/sync/now', {}); await A.call('/api/sync/now', {}); }
  assert.equal((await B.call('/api/sync/status')).json.e2e.reason, 'removed');
  assert.equal(existsSync(join(process.env.LOCALAPPDATA || join(base, 'x'), 'OpenDash')), false, 'nothing in the real per-user folder');
});
