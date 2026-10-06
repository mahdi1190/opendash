import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/app/56-connection-flow.js', import.meta.url), 'utf8');
function harness() {
  let now = 100000, resolveSync;
  const events = {}, calls = [];
  const context = vm.createContext({
    Date: { now: () => now, parse: Date.parse }, document: { hidden: false, addEventListener(name, fn) { events[name] = fn; } },
    window: { addEventListener(name, fn) { events[name] = fn; }, open() { calls.push('open'); } },
    SourcesStore: { busy: {}, data: { sources: [] } },
    _srcSync: () => { calls.push('sync'); return new Promise(r => { resolveSync = r; }); },
    connCheck: async id => calls.push('check:' + id), connRefresh: async () => calls.push('refresh'), toast: (...args) => calls.push(args),
  });
  vm.runInContext(source, context);
  return { context, events, calls, clock: value => { now = value; }, finish: () => resolveSync() };
}
test('ordinary focus is free; one user-started sign-in verifies on return and coalesces events', async () => {
  const h = harness(); await h.events.focus(); assert.equal(h.calls.length, 0);
  h.context.connCloudSignIn({ id: 'bank-synthetic' });
  await h.events.focus(); assert.equal(h.calls.filter(x => x === 'sync').length, 0, 'not immediately when the tab opens');
  h.clock(102000); const returning = h.events.focus(); h.events.visibilitychange();
  assert.equal(h.calls.filter(x => x === 'sync').length, 1);
  h.context.SourcesStore.data.sources = [{ id: 'bank-synthetic', health: { state: 'ok' }, lastSync: new Date(102000).toISOString() }];
  h.finish(); await returning; await h.events.focus();
  assert.equal(h.calls.filter(x => x === 'sync').length, 1);
  assert.ok(h.calls.some(x => Array.isArray(x) && /verified/.test(x[0])));
});
test('expired sign-ins never start a job and failed reads are not called verified', async () => {
  const h = harness(); h.context.connCloudSignIn({ id: 'bank-synthetic' }); h.clock(800000); await h.events.focus();
  assert.ok(!h.calls.includes('sync'));
  h.context.connCloudSignIn({ id: 'bank-synthetic' }); h.clock(802000); const done = h.events.focus(); h.finish(); await done;
  assert.ok(h.calls.some(x => Array.isArray(x) && /did not succeed/.test(x[0])));
  assert.ok(!h.calls.some(x => Array.isArray(x) && /Connection verified/.test(x[0])));
});
