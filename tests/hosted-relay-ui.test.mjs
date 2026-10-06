import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/56-hosted-relay.js', import.meta.url), 'utf8');
function harness({ blocked = false, fail = false } = {}) {
  const calls = [], popup = { closed: false, opener: {}, location: { replace: url => calls.push(['navigate', url]) }, close() { this.closed = true; calls.push(['close']); } };
  const context = vm.createContext({ URL, URLSearchParams, state: { view: 'connections' },
    window: { open(...args) { calls.push(['open', ...args]); return blocked ? null : popup; } },
    fetch: async () => { calls.push(['register']); return { ok: !fail, json: async () => fail ? { error: 'Relay unavailable' } : { endpoint: 'https://relay.example.test/i/' + 'x'.repeat(43) + '/mcp', configured: true, linked: false } }; },
    toast: (...args) => calls.push(['toast', ...args]), renderMain: () => calls.push(['render']),
  });
  vm.runInContext(source, context);
  return { context, calls, popup };
}

test('Link Claude opens before registration then fills the official install link without granting access', async () => {
  const h = harness(); await h.context.hostedRelayAction('link');
  assert.deepEqual(h.calls[0], ['open', 'about:blank', '_blank']);
  assert.equal(h.popup.opener, null);
  const url = new URL(h.calls.find(c => c[0] === 'navigate')[1]);
  assert.equal(url.origin, 'https://claude.ai'); assert.equal(url.pathname, '/customize/connectors');
  assert.equal(url.searchParams.get('modal'), 'add-custom-connector');
  assert.equal(url.searchParams.get('connectorName'), 'OpenDash');
  assert.equal(url.searchParams.get('connectorUrl'), 'https://relay.example.test/i/' + 'x'.repeat(43) + '/mcp');
  assert.equal(vm.runInContext('_hostedRelayState.linked', h.context), false);
});

test('blocked popups leave a continuation button; failed registration closes the blank tab', async () => {
  const blocked = harness({ blocked: true }); await blocked.context.hostedRelayAction('link');
  assert.ok(blocked.calls.some(c => c[0] === 'toast' && /Continue in Claude/.test(c[1])));
  assert.ok(!blocked.calls.some(c => c[0] === 'navigate'));
  const failed = harness({ fail: true }); await failed.context.hostedRelayAction('link');
  assert.equal(failed.popup.closed, true);
  assert.ok(failed.calls.some(c => c[0] === 'toast' && c[1] === 'Relay unavailable'));
  assert.ok(!failed.calls.some(c => c[0] === 'navigate'));
});
