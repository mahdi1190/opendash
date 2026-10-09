// Synthetic UI only: no real credentials, Google account or health records.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.className = ''; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { this.focused = true; }
}
const nodes = element => [element, ...element.children.flatMap(nodes)];
const click = button => button.onclick(button);
function eventSurface(extra = {}) {
  const listeners = new Map();
  return Object.assign(extra, {
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    async emit(type) { await Promise.all([...(listeners.get(type) || [])].map(listener => listener())); },
  });
}
function fixture(api, { blockedPopup = false } = {}) {
  const calls = [], sections = [];
  let serverHealth = { configured: true, connected: false }, cached = { googleHealth: serverHealth };
  const popup = { opener: {}, location: { replace: url => calls.push(['navigate', url]) }, close() {} };
  const window = eventSurface({ open: (...args) => { calls.push(['open', ...args]); return blockedPopup ? null : popup; } });
  const document = eventSurface({ visibilityState: 'visible' });
  const context = vm.createContext({
    state: { view: 'connections' }, location: { origin: 'http://localhost:4173', assign: url => calls.push(['same-tab', url]) },
    window, document, Connections: { all: () => cached },
    icon: name => '<svg data-icon="' + name + '"></svg>',
    _connEl: (tag, cls, text) => { const e = new Element(tag); e.className = cls || ''; e.textContent = text || ''; return e; },
    _connBtn: (label, _ic, _cls, run) => { const e = new Element('button'); e.textContent = label; e.onclick = run; return e; },
    _connSteps: () => new Element('ol'), _connCode: () => new Element('pre'), _connAgo: () => 'just now',
    _srcApi: async (...args) => { calls.push(['api', ...args]); return api(...args); },
    openDrawer: options => { const body = new Element('div'); const ready = options.body(body, () => { calls.push(['close']); options.onClose?.(); }); sections.push({ body, ready, close: options.onClose }); },
    toast: (...args) => calls.push(['toast', ...args]), renderMain: () => calls.push(['render']),
    connRefresh: async opts => { calls.push(['refresh', opts]); cached = { googleHealth: serverHealth }; return cached; }, registerCommand() {}, setView() {},
  });
  vm.runInContext(readFileSync(new URL('../src/app/56-google-health.js', import.meta.url), 'utf8'), context);
  return { context, calls, sections, window, document, popup, setHealth: health => { serverHealth = health; } };
}

test('setup rejects a missing, malformed or oversized credentials file before writing credentials', async () => {
  const { context, calls, sections } = fixture(async () => ({ configured: false }));
  context.googleHealthConnectionSetup(); await sections[0].ready;
  const input = nodes(sections[0].body).find(e => e.type === 'file');
  const save = nodes(sections[0].body).find(e => e.textContent === 'Save Google Health setup');
  await click(save); assert.equal(input.focused, true);
  input.files = [{ size: 50, text: async () => 'invalid json' }]; await click(save);
  assert.equal(save.disabled, false);
  input.files = [{ size: 32769, text: async () => { throw new Error('must not be read'); } }]; await click(save);
  assert.equal(input.disabled, false);
  assert.equal(calls.filter(c => c[0] === 'api' && c[1].endsWith('/configure')).length, 0);
});

test('a successful credentials upload saves locally and leaves Google consent to the user', async () => {
  let configured = false;
  const credentials = { web: { client_id: 'synthetic.apps.googleusercontent.com', client_secret: 'synthetic-secret' } };
  const { context, calls, sections } = fixture(async (path, opts) => {
    if (path.endsWith('/configure')) { assert.deepEqual(JSON.parse(JSON.stringify(opts.body)), { credentials }); configured = true; }
    return { configured };
  });
  context.googleHealthConnectionSetup(); await sections[0].ready;
  nodes(sections[0].body).find(e => e.type === 'file').files = [{ size: 100, text: async () => JSON.stringify(credentials) }];
  await click(nodes(sections[0].body).find(e => e.textContent === 'Save Google Health setup'));
  assert.equal(configured, true);
  assert.equal(calls.filter(c => c[0] === 'open').length, 0, 'no surprise Google consent navigation');
  assert.ok(!calls.filter(c => c[0] === 'toast').some(c => JSON.stringify(c).includes('synthetic-secret')));
});

test('failed or concurrent sync leaves the connection usable and refreshes its real status', async () => {
  let fail;
  const { context, calls } = fixture(() => new Promise((_resolve, reject) => { fail = reject; }));
  const first = context.googleHealthSync();
  await context.googleHealthSync();
  assert.equal(calls.filter(c => c[0] === 'api').length, 1);
  fail(new Error('Reconnect Google Health.')); await first;
  assert.equal(vm.runInContext('_googleHealthBusy', context), false);
  assert.ok(calls.some(c => c[0] === 'refresh'));
  assert.ok(calls.some(c => c[0] === 'toast' && c[1] === 'Reconnect Google Health.'));
});

test('connected status and data summaries come from the server; unconnected cards never offer sync', () => {
  const { context } = fixture(async () => ({}));
  let card = context.googleHealthConnectionCard({ googleHealth: { configured: true, connected: false } });
  assert.ok(!nodes(card).some(e => e.textContent === 'Sync now'));
  card = context.googleHealthConnectionCard({ googleHealth: { configured: true, connected: true, lastSync: '2026-10-08T12:00:00Z', snapshot: { steps: [{ date: '2026-10-08', count: 42 }], sleep: [] } } });
  assert.ok(nodes(card).some(e => e.textContent === 'Connected'));
  assert.ok(nodes(card).some(e => e.textContent === '1 activity day'));
  assert.ok(nodes(card).some(e => e.textContent === '0 sleep records'));
});

test('a fast OAuth return immediately refreshes health and makes Sync now available', async () => {
  const { context, calls, window, popup, setHealth } = fixture(async () => ({}));
  context.googleHealthSignIn();
  assert.equal(popup.opener, null, 'Google cannot access the OpenDash opener');
  assert.ok(calls.some(call => call[0] === 'navigate' && call[1].endsWith('/api/google-health/connect')));
  await window.emit('focus');
  assert.equal(calls.filter(call => call[0] === 'refresh').length, 0, 'focus without departure is not an OAuth return');
  await window.emit('blur');
  setHealth({ configured: true, connected: true, lastSync: '2026-10-08T12:00:01Z' });
  await window.emit('focus');
  assert.equal(calls.filter(call => call[0] === 'refresh').length, 1, 'no one-minute wait');
  assert.equal(calls.find(call => call[0] === 'refresh')[1].force, true);
  const card = context.googleHealthConnectionCard(context.Connections.all());
  assert.ok(nodes(card).some(node => node.textContent === 'Sync now'));
  assert.equal(vm.runInContext('_googleHealthConsentCleanup', context), null);
  await window.emit('blur'); await window.emit('focus');
  assert.equal(calls.filter(call => call[0] === 'refresh').length, 1, 'watch ends after connection completes');
});

test('an early return remains watched; visibility return refreshes later without rerendering another page', async () => {
  const { context, calls, window, document, setHealth } = fixture(async () => ({}));
  context.googleHealthSignIn();
  await window.emit('blur'); await window.emit('focus');
  assert.equal(calls.filter(call => call[0] === 'refresh').length, 1);
  assert.equal(vm.runInContext('typeof _googleHealthConsentCleanup', context), 'function');
  context.state.view = 'home';
  document.visibilityState = 'hidden'; await document.emit('visibilitychange');
  setHealth({ configured: true, connected: true, lastSync: '2026-10-08T12:00:01Z' });
  document.visibilityState = 'visible'; await document.emit('visibilitychange');
  await window.emit('focus');
  assert.equal(calls.filter(call => call[0] === 'refresh').length, 2);
  assert.equal(calls.filter(call => call[0] === 'render').length, 0, 'the Home page is not re-rendered');
  assert.equal(vm.runInContext('_googleHealthConsentCleanup', context), null);
});

test('a blocked sign-in tab offers same-tab sign-in and leaves no pending return listener', async () => {
  const { context, calls, window } = fixture(async () => ({}), { blockedPopup: true });
  context.googleHealthSignIn();
  assert.equal(vm.runInContext('_googleHealthConsentCleanup', context), null);
  const notice = calls.find(call => call[0] === 'toast');
  assert.equal(notice[2].action.label, 'Sign in here');
  notice[2].action.run();
  assert.ok(calls.some(call => call[0] === 'same-tab' && call[1] === '/api/google-health/connect'));
  await window.emit('blur'); await window.emit('focus');
  assert.equal(calls.filter(call => call[0] === 'refresh').length, 0);
});
