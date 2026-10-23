// SECRETS NEVER SYNC. Folder sync shares only the allow-listed parts of the
// state (lib/sync/model.mjs SYNC_SPEC); credential-named fields and
// credential-looking values are dropped on the way out and refused on the way
// in; the files that hold sign-ins (<data>/secrets, connections.json,
// config.json, local-token) are never read by the sync engine. This test fails
// if any known secret would reach the shared folder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_KEYS, isSecretName, looksSecret, capture, newTree, validateOp, sanitize } from '../lib/sync/model.mjs';
import { UI_STATE_KEYS, BOOKKEEPING_KEYS } from '../lib/state-keys.mjs';
import { encodeHlc } from '../lib/sync/hlc.mjs';
import { tempDir, rm, stopAll, makeDevice, waitFor, keepAlive } from './sync.shared.mjs';

const base = tempDir('sync-secrets-');
const release = keepAlive();
after(async () => { await stopAll(); release(); rm(base); });

// Marker values: each must never appear in anything sync writes. The ones
// shaped like real credentials are built at run time, so the privacy scan
// never meets a credential-shaped literal (docs/dev/PRIVACY-SCAN.md).
const S = {
  oauth: ['ya29', 'A0AfH6SMBfakefakefakefakefakefakefake'].join('.'),
  refresh: 'refresh-0123456789-marker-refresh',
  apiKey: ['sk', 'ant', 'api03', 'FAKEFAKEFAKEFAKEFAKEFAKE'].join('-'),
  relay: 'relay-secret-marker-7f3a9c',
  bank: 'bank-key-marker-0b9e2d',
  password: 'hunter2-marker-password',
  jwt: ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiJmYWtlLXVzZXIifQ', 'c2lnbmF0dXJlLWZha2UtZmFrZQ'].join('.'),
  github: 'ghp_FAKEFAKEFAKEFAKEFAKEFAKEFAKE1234',
  urlToken: 'tok-marker-91c2e7aa55',
  token: 'local-token-marker-55aa91',
  google: 'google-client-secret-marker',
};
const leaks = (text) => Object.entries(S).filter(([, v]) => text.includes(v)).map(([k]) => k);

function lacedState() {
  return {
    custom: [
      { id: 'u-1', title: 'Pay rent', apiKey: S.apiKey, oauth: { refresh_token: S.refresh }, subtasks: [{ id: 'st-1', title: 'x', password: S.password }] },
      { id: 'u-2', title: 'Deploy', detail: `use token ${S.github} for the push` },   // a credential pasted into a note: that field is not synced
    ],
    people: [{ id: 'sam', name: 'Sam', sessionKey: S.relay }],
    resources: [{ id: 'r-1', kind: 'url', label: 'Dash', target: `https://dash.example.com/?access_token=${S.urlToken}` }],
    home: { layout: { version: 1, widgets: [{ id: 'w', token: S.token, jwt: S.jwt }] } },
    eventMeta: { 'ev-1': { notes: 'agenda', bearer: S.oauth } },
    // Top-level keys that are not on the allow-list at all:
    connections: { google: { accessToken: S.oauth, refreshToken: S.refresh } },
    hostedRelay: { secret: S.relay }, finConnect: { enableBanking: { key: S.bank } }, credentials: { gh: S.github },
    emailTriage: { emails: [{ subject: 'x', snippet: S.password }] }, taskChat: { 'u-1': [{ role: 'user', text: S.apiKey }] },
    travel: { zone: 'Europe/London', note: S.relay }, autolink: { folders: ['C:/x'] },
  };
}

test('the allow-list holds no UI, bookkeeping or credential keys', () => {
  for (const k of [...UI_STATE_KEYS, ...BOOKKEEPING_KEYS]) assert.ok(!SYNC_KEYS.includes(k), `${k} is a UI/bookkeeping key`);
  for (const k of ['connections', 'secrets', 'credentials', 'oauth', 'tokens', 'hostedRelay', 'relay', 'remoteMcp', 'finConnect', 'finance', 'bank', 'narration', 'emailTriage', 'taskChat', 'travel', 'autolink', 'env', 'suggest', 'achievements']) {
    assert.ok(!SYNC_KEYS.includes(k), `${k} must not be synced`);
  }
  for (const k of SYNC_KEYS) assert.ok(!isSecretName(k), k);
});

test('credential names and credential-looking values are recognised', () => {
  for (const n of ['accessToken', 'access_token', 'refreshToken', 'refresh-token', 'apiKey', 'api_key', 'APIKEY', 'clientSecret', 'client_secret', 'relaySecret', 'password', 'passwd', 'privateKey', 'bearer', 'Authorization', 'sessionKey', 'oauth', 'cookie', 'credentials', 'pin', 'webhookUrl']) assert.ok(isSecretName(n), n);
  for (const n of ['title', 'pinned', 'tokensUsed', 'tokenCount', 'cacheKey', 'key', 'author', 'session', 'detail', 'notes', 'id', 'people', 'dueDate']) assert.ok(!isSecretName(n), n);
  for (const v of [S.oauth, S.apiKey, S.jwt, S.github, `https://x.example.com/a?access_token=${S.urlToken}`, ['-----BEGIN RSA PRIVATE', 'KEY-----'].join(' '), 'AKIA' + 'ABCDEFGHIJKLMNOP']) assert.ok(looksSecret(v), v);
  for (const v of ['Email Sam about the token budget', 'https://example.com/page?id=12', 'sk-1', 'Call the bank']) assert.ok(!looksSecret(v), v);
  assert.deepEqual(sanitize({ a: 1, apiKey: 'x', nested: { refresh_token: 'y', ok: true } }).value, { a: 1, nested: { ok: true } });
  assert.ok(sanitize({ text: S.github }).skip);
});

test('capturing a state laced with secrets produces changes that contain none of them', () => {
  const cap = capture(lacedState(), newTree());
  const text = JSON.stringify(cap.w) + JSON.stringify(cap.x);
  assert.deepEqual(leaks(text), []);
  assert.ok(cap.skipped >= 3, 'the credential-looking values were skipped (counted, not synced)');
  assert.ok(text.includes('Pay rent'), 'ordinary data still syncs');
  assert.ok(!cap.w.some(([p]) => ['connections', 'hostedRelay', 'finConnect', 'credentials', 'emailTriage', 'taskChat', 'travel', 'autolink'].includes(p[0])));
});

test('incoming changes that carry a credential are refused', () => {
  const dev = 'feedfacecafebeef';
  const v = validateOp({
    v: 1, dev, n: 1, h: encodeHlc(Date.now(), 0, dev), s: {},
    w: [[['custom', 'u-1', 'accessToken'], 'x'], [['custom', 'u-1', 'title'], S.jwt], [['connections'], { a: 1 }], [['home', 'layout'], { token: 'abc', ok: 1 }], [['custom', 'u-1', 'title'], 'fine']],
    x: [],
  }, dev);
  assert.equal(v.rejected, 3);
  assert.deepEqual(v.op.w, [[['home', 'layout'], { ok: 1 }], [['custom', 'u-1', 'title'], 'fine']], 'a credential-named key inside a value is dropped from it');
});

test('end to end: nothing secret reaches the shared folder or the other computer', async () => {
  const cloud = join(base, 'cloud');
  mkdirSync(cloud);
  const a = makeDevice(base, 'a', { state: lacedState() });
  // The files that hold sign-ins on a real install (lib/microsoft.mjs, lib/google-health.mjs,
  // lib/hosted-relay.mjs, lib/remote-mcp-auth.mjs, lib/narration.mjs, lib/fin-connect/secrets.mjs),
  // with markers in them.
  mkdirSync(join(a.data, 'secrets', 'fin'), { recursive: true });
  writeFileSync(join(a.data, 'secrets', 'microsoft-tokens.json'), JSON.stringify({ access_token: S.oauth, refresh_token: S.refresh }));
  writeFileSync(join(a.data, 'secrets', 'microsoft-client.json'), JSON.stringify({ client_secret: S.google }));
  writeFileSync(join(a.data, 'secrets', 'google-health-tokens.json'), JSON.stringify({ refresh_token: S.refresh }));
  writeFileSync(join(a.data, 'secrets', 'hosted-relay.json'), JSON.stringify({ secret: S.relay }));
  writeFileSync(join(a.data, 'secrets', 'remote-mcp-auth.json'), JSON.stringify({ token: S.token }));
  writeFileSync(join(a.data, 'secrets', 'narration.json'), JSON.stringify({ apiKey: S.apiKey }));
  writeFileSync(join(a.data, 'secrets', 'fin', 'enable-banking.json'), JSON.stringify({ key: S.bank }));
  writeFileSync(join(a.data, 'sources.json'), JSON.stringify({ banks: [{ key: S.bank }] }));
  writeFileSync(join(a.data, 'connections.json'), JSON.stringify({ relay: { secret: S.relay } }));
  writeFileSync(join(a.data, 'config.json'), JSON.stringify({ userName: 'Alex', apiKey: S.apiKey }));
  writeFileSync(join(a.data, 'local-token'), S.token);
  const b = makeDevice(base, 'b', { state: { custom: [] } });
  await a.eng.start(); await b.eng.start();
  await a.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'A' });
  await b.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'B' });
  await waitFor(async () => ((await b.store.readObject()).custom || []).length === 2, 8000, 'B to receive the tasks');
  // Every byte in the shared folder.
  const all = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else all.push(readFileSync(p, 'utf8')); } };
  walk(cloud);
  assert.ok(all.length >= 4, 'logs, snapshots and device files were written');
  assert.deepEqual(leaks(all.join('\n')), []);
  // The engine's own files (meta, settings; outside the data folder) hold no secrets either.
  const before = all.length;
  walk(a.eng.localDir);
  assert.ok(all.length > before);
  assert.deepEqual(leaks(all.join('\n')), []);
  // The other computer has the ordinary data and none of the secrets.
  const bs = await b.store.readObject();
  assert.deepEqual(leaks(JSON.stringify(bs)), []);
  assert.equal(bs.custom.find(t => t.id === 'u-1').title, 'Pay rent');
  assert.equal(bs.custom.find(t => t.id === 'u-1').apiKey, undefined);
  assert.equal(bs.connections, undefined);
  // ...and A still has its own local secrets in its state (sync never removes them).
  const as = await a.store.readObject();
  assert.equal(as.custom.find(t => t.id === 'u-1').apiKey, S.apiKey);
  assert.equal(as.connections.google.accessToken, S.oauth);
  await a.eng.stop(); await b.eng.stop();
});

test("this computer's sync files live under the per-computer base of lib/devicedir.mjs, never in the data folder; lib/sync never picks a per-user folder itself", async () => {
  const { defaultLocalDir, createNodeHost } = await import('../lib/sync/node-host.mjs');
  const { readDataId, readHostId } = await import('../lib/devicedir.mjs');
  const data = join(base, 'data-devicedir'), devBase = join(base, 'device-root');
  mkdirSync(data, { recursive: true });
  const dir = defaultLocalDir(data, 'host-x', { env: {}, base: devBase });
  assert.ok(dir.startsWith(join(devBase, 'sync')), '<device base>/sync/<key>');
  assert.ok(!dir.startsWith(data));
  assert.equal(defaultLocalDir(data, 'host-x', { env: { DASHBOARD_SYNC_LOCAL_DIR: join(base, 'own') } }), join(base, 'own'));
  const h = createNodeHost({ dataDir: data, stateFile: join(data, 'state', 'dashboard-state.json'), host: 'host-x', env: {}, deviceOpts: { base: devBase }, detect: () => [] });
  assert.equal(h.local.where, dir);
  assert.equal(h.fetcherId, readHostId(data, { base: devBase }), 'the fetcher id is the host id in the device folder (what lib/accounts.mjs records)');
  for (const bad of [devBase, join(devBase, readDataId(data))]) assert.equal((await h.checkFolder(bad)).ok, false, 'the per-computer folder (it holds the sign-ins) cannot be the sync folder');
  // OpenDash's own per-computer folder is decided by lib/devicedir.mjs only. (folder.mjs may
  // still look up Dropbox's own info.json under %LOCALAPPDATA%: another app's file.)
  for (const f of readdirSync(new URL('../lib/sync/', import.meta.url))) {
    const code = readFileSync(new URL('../lib/sync/' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
      .replace(/env\.LOCALAPPDATA && j\(env\.LOCALAPPDATA, 'Dropbox', 'info\.json'\)/g, '');
    assert.doesNotMatch(code, /LOCALAPPDATA|XDG_STATE_HOME/, `${f} works out a per-user folder itself`);
  }
});
