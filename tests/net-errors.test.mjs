// The page's central network-error mapping (src/app/02-core-net.js): a fetch
// to the dashboard's own server that cannot connect ("Failed to fetch") is
// shown as "The dashboard server isn't running..." everywhere, HTTP errors and
// aborts keep their own text, and window.DashboardNet / the server-down and
// server-up events let an offline banner appear and clear itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '02-core-net.js');
const SRC = readFileSync(FILE, 'utf8');
const MESSAGE = "The OpenDash server isn't running. Start it with start-opendash in the app folder (or your OpenDash shortcut), then try again.";

/** The file in a sandbox; `fetchImpl` stands in for the browser's fetch (no window: the pure helpers only). */
function load(fetchImpl, href = 'http://localhost:4273/') {
  const events = [];
  const box = { console, URL, TypeError, Error, Promise };
  if (fetchImpl) {
    const loc = new URL(href);
    box.location = { href: loc.href, origin: loc.origin, protocol: loc.protocol };
    box.CustomEvent = class { constructor(type) { this.type = type; } };
    box.window = { fetch: fetchImpl, dispatchEvent: (ev) => events.push(ev.type) };
  }
  vm.createContext(box);
  vm.runInContext(`${SRC}\n;globalThis.__net = { NET_DOWN_MESSAGE, netIsDown, netErrorMessage };`, box, { filename: '02-core-net.js' });
  return { ...box.__net, box, events };
}
const failed = (msg = 'Failed to fetch') => Object.assign(new TypeError(msg), {});

test('the message, word for word', () => {
  assert.equal(load().NET_DOWN_MESSAGE, MESSAGE);
});

test('"could not connect" in every browser is the server-not-running message', () => {
  const { netIsDown, netErrorMessage } = load();
  for (const m of ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'Network request failed']) {
    assert.equal(netIsDown(new TypeError(m)), true, m);
    assert.equal(netErrorMessage(new TypeError(m)), MESSAGE, m);
  }
  assert.equal(netIsDown({ code: 'SERVER_DOWN', message: 'x' }), true);
});

test('other errors keep their own text; aborts and HTTP errors are not "server down"', () => {
  const { netIsDown, netErrorMessage } = load();
  const abort = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
  assert.equal(netIsDown(abort), false);
  assert.equal(netIsDown(new Error('HTTP 500')), false);
  assert.equal(netIsDown(new TypeError('Cannot read properties of undefined')), false, 'a bug is not a network failure');
  assert.equal(netIsDown(null), false);
  assert.equal(netIsDown('Failed to fetch'), false);
  assert.equal(netErrorMessage(new Error('that task is in the bin')), 'that task is in the bin');
  assert.equal(netErrorMessage('plain text'), 'plain text');
  assert.equal(netErrorMessage(null, 'Could not save'), 'Could not save');
  assert.equal(netErrorMessage({}), 'Something went wrong. Try again.');
});

test('the page wrapper: a failed request to this server rejects with the message; others are untouched', async () => {
  let mode = 'down';
  const calls = [];
  const fake = (input, init) => {
    calls.push(String(input));
    if (mode === 'down') return Promise.reject(failed());
    if (mode === 'abort') return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    return Promise.resolve({ ok: true, status: 200 });
  };
  const { box, events } = load(fake);
  const net = box.window.DashboardNet;
  assert.ok(net && box.window.fetch !== fake, 'fetch is wrapped once');
  const seen = [];
  const off = net.onChange((d) => seen.push(d));

  const e = await box.window.fetch('/api/actions', { method: 'POST' }).catch(x => x);
  assert.equal(e.name, 'TypeError', 'still a TypeError, so existing checks keep working');
  assert.equal(e.message, MESSAGE);
  assert.equal(e.code, 'SERVER_DOWN');
  assert.equal(e.cause.message, 'Failed to fetch');
  assert.equal(net.down, true);
  assert.deepEqual(events, ['dashboard:server-down']);
  // A second failure does not announce again.
  await box.window.fetch('/api/state').catch(() => {});
  assert.deepEqual(events, ['dashboard:server-down']);

  // Another origin: the browser's own error is passed through.
  const other = await box.window.fetch('https://example.org/x').catch(x => x);
  assert.equal(other.message, 'Failed to fetch');
  // An abort is passed through.
  mode = 'abort';
  const ab = await box.window.fetch('/api/assistant').catch(x => x);
  assert.equal(ab.name, 'AbortError');

  // The server answers again: down clears, once.
  mode = 'up';
  const r = await box.window.fetch('/api/health');
  assert.equal(r.status, 200);
  assert.equal(net.down, false);
  assert.deepEqual(events, ['dashboard:server-down', 'dashboard:server-up']);
  assert.deepEqual(seen, [true, false]);
  off();
  assert.equal(calls.length, 5);
});

test('a page opened as a file (no server) leaves fetch alone', () => {
  const fake = () => Promise.resolve({});
  const { box } = load(fake, 'file:///C:/dashboard/index.html');
  assert.equal(box.window.fetch, fake);
  assert.equal(box.window.DashboardNet, undefined);
});
