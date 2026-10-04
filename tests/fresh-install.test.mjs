// First-run behaviour found by the fresh-install test (a stranger unzipping the
// release and following README.md and docs/INSTALL.md):
//   - the background story prefetch never asks Claude while the welcome set-up
//     is open, or before it on a new, empty data folder;
//   - Settings > Server stops saying "Running" once the server has stopped;
//   - a second start of an already running OpenDash with --no-open does not
//     claim to open the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** src/app/79-story-engine.js with just enough of the page around it; -> {storyPrefetchDue, env}. */
function storyEngine({ obOpen = false, onboardedAt = null, items = [] } = {}) {
  const env = { posts: [], store: {} };
  const prelude = `
    var window = undefined;
    var document = { hidden: false, addEventListener() {} };
    var localStorage = { getItem: k => (k in env.store ? env.store[k] : null), setItem: (k, v) => { env.store[k] = String(v); } };
    var _serverAvailable = true, _obOpen = ${JSON.stringify(obOpen)};
    var APP_CONFIG = { weekStart: 'Mon', onboardedAt: ${JSON.stringify(onboardedAt)} };
    function getAllItems() { return ${JSON.stringify(items)}; }
    function briefPrefs() { return { ai: true, eveningHour: 17 }; }
    function connHas(name) { return name === 'claude'; }
    function todayStrSafe() { return '2026-10-03'; }
    async function _bfPost(url, body) { env.posts.push([url, body.kind]); return {}; }
    function registerCommand() {}
  `;
  const src = read('src/app/79-story-core.js') + '\n' + read('src/app/79-story-engine.js');   // in build order
  const storyPrefetchDue = new Function('env', `${prelude}\n${src}\nreturn storyPrefetchDue;`)(env);
  return { storyPrefetchDue, env };
}

test('story prefetch: no Claude call while the welcome set-up is open', async () => {
  const { storyPrefetchDue, env } = storyEngine({ obOpen: true });
  await storyPrefetchDue();
  assert.deepEqual(env.posts, []);
  assert.deepEqual(env.store, {}, 'nothing marked as done for today, so it runs once the set-up is finished');
});

test('story prefetch: no Claude call on a new, empty data folder before the set-up', async () => {
  const { storyPrefetchDue, env } = storyEngine({ onboardedAt: null, items: [] });
  await storyPrefetchDue();
  assert.deepEqual(env.posts, []);
});

test('story prefetch: runs once set up (or for an older data folder that already has tasks)', async () => {
  for (const opts of [{ onboardedAt: '2026-10-03T08:00:00.000Z' }, { onboardedAt: null, items: [{ id: 't1' }] }]) {
    const { storyPrefetchDue, env } = storyEngine(opts);
    await storyPrefetchDue();
    assert.ok(env.posts.length >= 1, JSON.stringify(opts));
    assert.ok(env.posts.every(([url]) => url === '/api/story/script'));
    const first = env.posts.length;
    await storyPrefetchDue();
    assert.equal(env.posts.length, first, 'at most once a day');
  }
});

test('Settings > Server: going offline drops the stale "Running" status', () => {
  const src = read('src/app/86-offline-banner.js');
  let invalidated = 0;
  const prelude = `
    var window = undefined;
    var document = {};                       // no body: no banner to draw
    var _serverLastError = null;
    function srvSettingsInvalidate() { hooks.invalidate(); }
  `;
  const api = new Function('hooks', `${prelude}\n${src}\nreturn { srvGoOffline, stop: () => clearTimeout(_srvLink.timer), get state() { return _srvLink.state; } };`)({ invalidate: () => { invalidated++; } });
  try {
    api.srvGoOffline('stopped');
    assert.equal(api.state, 'offline');
    assert.equal(invalidated, 1, 'Settings > Server is asked to read the status again');
    api.srvGoOffline('stopped');
    assert.equal(invalidated, 1, 'only on the change to offline');
  } finally { api.stop(); }
});

test('an already running OpenDash started again with --no-open does not say it is opening the browser', () => {
  const src = read('server/index.mjs');
  assert.ok(!/already running\.\\n {2}Opening \$\{url\}/.test(src), 'no unconditional "Opening <url>"');
  assert.match(src, /\$\{open \? 'Opening' : 'It is at'\} \$\{url\}/);
});
