// The page while the server is away (src/app/86-offline-banner.js with the
// real 01-core-state.js, 04-core-persistence.js and 86-live-sync.js, loaded
// into one VM scope the way build.mjs concatenates them) against a fake
// server that goes down and comes back: an edit made meanwhile is never
// dropped - it is sent on reconnect, and merged with a newer file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
// 02-core-net.js (the shared network-error helpers) when it is there.
const FILES = ['01-core-state.js', '02-core-net.js', '04-core-persistence.js', '86-live-sync.js', '86-offline-banner.js'].filter(f => existsSync(join(APP, f)));

const PRELUDE = `
var window = undefined;                       // no browser: no listeners, no fetch wrapper
var __store = {};
var localStorage = { getItem: k => (k in __store ? __store[k] : null), setItem: (k, v) => { __store[k] = String(v); }, removeItem: k => { delete __store[k]; } };
var sessionStorage = localStorage;
var document = { activeElement: null, hidden: false, getElementById: () => null, body: { classList: { toggle() {}, add() {}, remove() {} }, contains: () => false } };
var navigator = { userAgent: 'test', platform: 'Win32' };
var location = { protocol: 'http:', href: 'http://localhost:1/', origin: 'http://localhost:1', reload() { __reloads++; } };
var __reloads = 0, __renders = 0, __toasts = [], __dialogs = 0;
var APP_CONFIG = { build: 'b1' };
function ensureStateDefaults(s) { if (!Array.isArray(s.custom)) s.custom = []; return s; }
function getItem(id) { return state.custom.find(t => t.id === id) || null; }
function render() { __renders++; }
function renderSaveStatus() {}
function updateSyncIndicator() {}
function toast(msg, o) { __toasts.push(String(msg)); }
function openDialog() { __dialogs++; }
function icon() { return ''; }
function fetch(url, init) { return __server(url, init || {}); }
let state = {};
`;
const EXPORTS = `
({ get state() { return state; }, set state(v) { state = v; },
   serverStateLoad, detectStateServer, _persistFire, srvResync, srvBackoffDelay, srvBuildChanged, _srvErrText, _persistKey, _stateForPersist,
   get lastKey() { return _lastPersistedKey; }, set lastKey(v) { _lastPersistedKey = v; },
   get serverAvailable() { return _serverAvailable; }, get lastError() { return _serverLastError; },
   LIVE_BASE_KEY: _LIVE_BASE_KEY })
`;

/** A fake dashboard server: the state file, a 409 on older versions, and an off switch. */
function makeServer(file) {
  const srv = { file: JSON.parse(JSON.stringify(file)), down: false, puts: 0, conflicts: 0 };
  srv.handle = async (url, init) => {
    if (srv.down) throw new TypeError('Failed to fetch');
    const method = (init.method || 'GET').toUpperCase();
    const ok = (obj, status = 200) => ({ ok: status < 400, status, json: async () => JSON.parse(JSON.stringify(obj)) });
    if (url.startsWith('/api/health')) return ok({ ok: true, app: 'dashboard', stateExists: true, ai: { available: false }, google: {} });
    if (url === '/api/state' && method === 'GET') return ok(srv.file);
    if (url === '/api/state' && method === 'PUT') {
      srv.puts++;
      const body = JSON.parse(init.body);
      if ((Number(body._lastSave) || 0) < (Number(srv.file._lastSave) || 0)) { srv.conflicts++; return ok({ error: 'stale' }, 409); }
      srv.file = { ...body, _lastSave: (Number(srv.file._lastSave) || 0) + 1 };
      return ok({ lastSave: srv.file._lastSave });
    }
    return ok({ error: 'not found' }, 404);
  };
  return srv;
}
function page(server, state) {
  const box = { console, setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams, JSON, Promise, Date, Math, Object, Array, Set, Map, Number, String, Boolean, Error, TypeError };
  vm.createContext(box);
  box.__server = server.handle;
  const code = PRELUDE + FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n') + '\n' + EXPORTS;
  const api = vm.runInContext(code, box, { filename: 'page.js' });
  api.state = state;
  return { api, box };
}
const T = (id, title, extra = {}) => ({ id, title, dueDate: null, priority: 'p2', tags: [], subtasks: [], ...extra });
const settle = (ms = 300) => new Promise(r => setTimeout(r, ms));

test('pure bits: backoff, the build check, readable errors', () => {
  const { api } = page(makeServer({ custom: [], _lastSave: 1 }), { custom: [] });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 50].map(api.srvBackoffDelay), [1000, 2000, 3000, 5000, 8000, 10000, 10000, 10000]);
  assert.equal(api.srvBuildChanged({ build: 'b2' }), true);
  assert.equal(api.srvBuildChanged({ build: 'b1' }), false);
  assert.equal(api.srvBuildChanged({}), false);
  assert.equal(api._srvErrText(new TypeError('Failed to fetch')), 'the OpenDash server isn\'t running');
  assert.equal(api._srvErrText(new Error('PUT 413')), 'PUT 413');
});

test('an edit made while the server is down is kept, then saved when it is back', async () => {
  const server = makeServer({ custom: [T('a', 'A'), T('b', 'B')], _lastSave: 5 });
  const { api } = page(server, { custom: [], view: 'home' });
  await api.detectStateServer();
  const f = await api.serverStateLoad();
  api.state = { ...JSON.parse(JSON.stringify(f)), view: 'home' };
  server.down = true;
  api.state.custom[0].title = 'A edited offline';
  api.state._localDirty = true;
  await api._persistFire();
  assert.equal(api.state._localDirty, true, 'still marked unsaved');
  assert.equal(api.lastError, 'the OpenDash server isn\'t running', 'the save status says why, in words');
  assert.equal(server.file.custom[0].title, 'A');
  server.down = false;
  assert.equal(await api.srvResync(), true);
  await settle();
  assert.equal(server.file.custom[0].title, 'A edited offline');
  assert.equal(api.state._localDirty, false);
});

test('...and merged (not overwritten) when the file changed meanwhile', async () => {
  const server = makeServer({ custom: [T('a', 'A'), T('b', 'B')], _lastSave: 5 });
  const { api, box } = page(server, { custom: [] });
  await api.detectStateServer();
  api.state = JSON.parse(JSON.stringify(await api.serverStateLoad()));
  server.down = true;
  api.state.custom[0].title = 'A edited offline';
  api.state._localDirty = true;
  await api._persistFire();
  // a script / MCP client changed another task in the file
  server.file = { ...server.file, custom: [T('a', 'A'), T('b', 'B changed elsewhere')], _lastSave: 6 };
  server.down = false;
  await api.srvResync();
  await settle(400);
  assert.equal(server.conflicts, 1, 'the server refused the old version once');
  assert.deepEqual(server.file.custom.map(t => t.title), ['A edited offline', 'B changed elsewhere']);
  assert.equal(box.__dialogs, 0, 'no question: different fields');
});

test('a page that booted with the server down: a clean copy takes the newer file without questions', async () => {
  const server = makeServer({ custom: [T('a', 'A newer'), T('c', 'C new')], _lastSave: 9 });
  const { api, box } = page(server, { custom: [T('a', 'A')], _lastSave: 5 });
  assert.equal(api.lastKey, null, 'never talked to the server');
  await api.srvResync();
  await settle();
  assert.deepEqual(api.state.custom.map(t => t.title), ['A newer', 'C new']);
  assert.equal(api.state._lastSave, 9);
  assert.equal(box.__dialogs, 0);
  assert.equal(server.puts, 0, 'nothing of ours to send');
});

test('a page that booted with the server down, with unsaved edits and the base from last time: merged', async () => {
  const base = { custom: [T('a', 'A'), T('b', 'B')], _lastSave: 5 };
  const server = makeServer({ custom: [T('a', 'A'), T('b', 'B elsewhere')], _lastSave: 6 });
  const mine = { custom: [T('a', 'A mine'), T('b', 'B')], _lastSave: 5, _localDirty: true };
  const { api, box } = page(server, mine);
  box.localStorage.setItem(api.LIVE_BASE_KEY, JSON.stringify({ version: 5, key: api._persistKey(base) }));
  await api.srvResync();
  await settle(400);
  assert.deepEqual(server.file.custom.map(t => t.title), ['A mine', 'B elsewhere']);
  assert.equal(box.__dialogs, 0);
});

test('after a restart (a quick health answer in hand): unsaved edits go up without waiting for the full check', async () => {
  const server = makeServer({ custom: [T('a', 'A')], _lastSave: 3 });
  const { api } = page(server, { custom: [] });
  await api.detectStateServer();
  api.state = JSON.parse(JSON.stringify(await api.serverStateLoad()));
  api.state.custom[0].title = 'A before the restart';
  api.state._localDirty = true;
  assert.equal(await api.srvResync({ ok: true, app: 'dashboard', stateExists: true, pid: 2 }), true);
  await settle();
  assert.equal(server.file.custom[0].title, 'A before the restart');
  assert.equal(api.serverAvailable, true);
});
