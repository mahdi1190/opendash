// Connections-page behavior with synthetic source records. No real accounts,
// credentials, Claude process or live dashboard data are accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.className = '';
    this.classList = { add: (...names) => { this.className += ' ' + names.join(' '); } };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  insertAdjacentHTML(_position, html) { this.innerHTML = html + (this.innerHTML || ''); }
}
const nodes = el => [el, ...el.children.flatMap(nodes)];
const plain = value => JSON.parse(JSON.stringify(value));
function page() {
  const calls = [];
  const context = vm.createContext({
    document: { createElement: tag => new Element(tag) },
    window: { addEventListener() {}, open: (...args) => calls.push(['open', ...args]) }, state: { view: 'connections' },
    registerSection() {}, registerCommand() {}, renderMain() {},
    SourcesStore: { busy: {} }, SRC_SWATCHES: ['slate', 'blue'],
    icon: name => `<svg data-icon="${name}"></svg>`,
    esc: value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])),
    _srcPill: st => { const e = new Element('span'); e.textContent = st; return e; },
    _srcMenu: (...args) => calls.push(['menu', ...args]),
    _srcSync: source => calls.push(['sync', source.id]),
    _srcSetAccount: (...args) => calls.push(['account', ...args]),
    _srcUpdate: async (source, patch) => calls.push(['update', source.id, plain(patch)]),
    _srcFixHelp: () => new Element('div'),
    srcAddFlow: options => calls.push(['add', plain(options)]),
    setView: view => calls.push(['view', view]),
    openDrawer: drawer => calls.push(['drawer', drawer]),
    connCheck: async id => calls.push(['check', id]),
    connRefresh: async options => calls.push(['refresh', plain(options)]),
  });
  for (const name of ['56-assistant-cards.js', '56-assistant-marks.js', '56-connections-assistants.js', '56-connections-brands.js', '56-connections-cards.js', '56-connections.js']) {
    vm.runInContext(readFileSync(join(ROOT, 'src', 'app', name), 'utf8'), context, { filename: name });
  }
  return { context, calls };
}
const source = (id, capability, health = 'ok', extra = {}) => ({ id, label: id, capability, kind: 'mcp', enabled: true, server: 'custom-server', health: { state: health }, ...extra });
const click = button => button.onclick({ stopPropagation() {} });

test('connection overview counts real healthy sources and Claude, never CSV, demo or paused data', () => {
  const { context: c } = page();
  const sources = [
    source('mail', 'email'), source('feed', 'calendar', 'ok', { kind: 'ical' }),
    source('csv', 'bank', 'ok', { kind: 'csv' }), source('demo', 'bank', 'ok', { demo: true }),
    source('paused', 'bank', 'ok', { enabled: false }), source('expired', 'calendar', 'auth'),
  ];
  assert.deepEqual(plain(c._connPageCounts(sources, { claude: { state: 'ok' } })), { connected: 3, attention: 1 });
  assert.deepEqual(plain(c._connPageCounts(sources, { claude: { state: 'auth' } })), { connected: 2, attention: 2 });
  assert.deepEqual(plain(c._connPageCounts(sources, {})), { connected: 2, attention: 1 });
});

test('filters separate healthy accounts, sign-in or check problems, and paused sources', () => {
  const { context: c } = page();
  const sources = [
    source('working', 'email'), source('expired', 'calendar', 'auth'), source('failed', 'bank', 'error'),
    source('unchecked', 'calendar', 'unknown'), source('paused-auth', 'email', 'auth', { enabled: false }),
    source('demo', 'calendar', 'auth', { demo: true }), source('csv', 'bank', 'ok', { kind: 'csv' }),
  ];
  const visible = filter => sources.filter(s => c._connPageMatchesSource(s, filter, '')).map(s => s.id);
  assert.deepEqual(visible('connected'), ['working']);
  assert.deepEqual(visible('attention'), ['expired', 'failed', 'unchecked']);
  assert.deepEqual(visible('paused'), ['paused-auth']);
  assert.equal(visible('all').length, sources.length, 'manual imports and demo records remain manageable');
  assert.equal(c._connPageSourceState(sources[4]), 'off', 'a paused auth source is paused, not repaired');
  assert.equal(c._connPageSourceState(sources[5]), 'demo');
});

test('latest assistant counts require local tools and exclude browser-only or missing installations', () => {
  const { context: c } = page();
  const all = {
    cli: { installed: true }, claude: { state: 'ok' }, mcp: { installed: { claudeCode: 'installed' } },
    assistants: { codex: { installed: true, configured: true }, gemini: { installed: false, configured: true } },
  };
  assert.deepEqual(plain(c._connPageCounts([source('mail', 'email'), source('csv', 'bank', 'ok', { kind: 'csv' })], all)), { connected: 3, attention: 0 });
  all.claude.state = 'auth'; all.assistants.codex = { installed: true, configured: false, conflict: true };
  assert.deepEqual(plain(c._connPageCounts([], all)), { connected: 0, attention: 2 });
  assert.equal(c._connPageAssistantDetails('grok', all).working, false);
});

test('assistant cards retain the new local workflows without presenting browser access as a connection', async () => {
  const { context: c, calls } = page();
  const all = {
    cli: { installed: true }, claude: { state: 'ok' }, mcp: { installed: { claudeCode: 'installed' } },
    assistants: { codex: { installed: true, configured: true }, gemini: { installed: true, configured: false }, claudeDesktop: { detected: false } },
  };
  const grid = c._connPageAssistantCards(all);
  assert.deepEqual(grid.children.map(card => card.dataset.conn), ['claude', 'codex', 'grok', 'gemini']);
  const grok = grid.children.find(card => card.dataset.conn === 'grok');
  const buttons = nodes(grok).filter(e => e.tagName === 'BUTTON');
  assert.equal(buttons.length, 2, 'Grok offers browser access and guidance only');
  assert.ok(buttons[0].innerHTML.includes('Open Grok'));
  click(buttons[0]); assert.deepEqual(calls[0], ['open', 'https://grok.com', '_blank', 'noopener']);
  const codex = grid.children.find(card => card.dataset.conn === 'codex');
  const check = nodes(codex).find(e => e.tagName === 'BUTTON' && e.innerHTML.includes('Check status'));
  await click(check);
  assert.deepEqual(calls[1], ['refresh', { force: true }], 'checking configured tools does not register them again');
  const unknown = c._connPageAssistantCards({ cli: { installed: false } });
  const pending = nodes(unknown.children.find(card => card.dataset.conn === 'gemini')).find(e => e.tagName === 'BUTTON');
  assert.equal(pending.disabled, true, 'unknown availability cannot launch setup');
});

test('connection search finds account names and server identities after custom renaming', () => {
  const { context: c } = page();
  const s = source('gcal', 'calendar', 'ok', { label: 'Family schedule', server: 'claude.ai Google Calendar', accounts: [{ id: 'private-id', name: 'School dates' }] });
  assert.equal(c._connPageMatchesSource(s, 'all', '  school DATES  '), true);
  assert.equal(c._connPageMatchesSource(s, 'connected', 'GOOGLE'), true);
  assert.equal(c._connPageMatchesSource(s, 'all', 'family schedule'), true);
  assert.equal(c._connPageMatchesSource(s, 'attention', 'Google'), false);
  assert.equal(c._connPageMatchesSource(s, 'all', 'Outlook'), false);
});

test('vendor marks follow provider identity rather than a renamed source label', () => {
  const { context: c } = page();
  const renamed = source('cal', 'calendar', 'ok', { server: 'claude.ai Google Calendar', label: 'My schedule' });
  assert.equal(c._connPageSourceMark(renamed), c._connMark('calendar'));
  assert.equal(c._connPageSourceMark(source('mail', 'email', 'ok', { server: 'claude.ai Gmail', label: 'Work inbox' })), c._connMark('gmail'));
  assert.equal(c._connPageSourceMark(source('work', 'calendar', 'ok', { server: 'Microsoft 365' })), c._connMark('outlook'));
  assert.equal(c._connPageSourceMark(source('custom', 'calendar', 'ok', { label: 'Gmail' })), '<svg data-icon="calendar-days"></svg>');
  assert.equal(c._connPageSourceMark(source('feed', 'calendar', 'ok', { kind: 'ical', server: 'Google Calendar' })), '<svg data-icon="link"></svg>');
});

test('embedded vendor marks equal the checked-in original assets and retain first-party provenance', () => {
  const { context: c } = page();
  const urls = vm.runInContext('CONN_BRAND_URLS', c);
  const provenance = JSON.parse(readFileSync(join(ROOT, 'prototypes', 'connections', 'logos', 'sources.json'), 'utf8'));
  const assets = [['gmail', 'gmail.svg', 'www.gstatic.com'], ['calendar', 'google-calendar.svg', 'www.gstatic.com'], ['claude', 'claude.svg', 'www.anthropic.com'], ['outlook', 'outlook.png', 'res.public.onecdn.static.microsoft']];
  for (const [service, filename, host] of assets) {
    const encoded = urls[service].match(/^data:image\/(svg\+xml|png);base64,([A-Za-z0-9+/=]+)$/);
    assert.ok(encoded, `${service}: embedded image does not require a network request`);
    const original = readFileSync(join(ROOT, 'prototypes', 'connections', 'logos', filename));
    assert.deepEqual(Buffer.from(encoded[2], 'base64'), original, `${service}: use the exact original mark`);
    assert.equal(new URL(provenance[filename].source).hostname, host);
    if (filename.endsWith('.svg')) assert.doesNotMatch(original.toString('utf8'), /<script|<foreignObject|\bon\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i);
  }
});

test('source cards retain safe metadata and actual account actions, with busy mutations disabled', () => {
  const { context: c, calls } = page();
  const s = source('cal', 'calendar', 'auth', { label: '<My calendar>', accounts: [{ id: 'a', name: '<Personal>', enabled: true }, { id: 'b', name: 'Family', enabled: false }] });
  const card = c._connPageSourceCard(s);
  assert.equal(card.dataset.source, s.id);
  assert.equal(card.dataset.cap, 'calendar');
  assert.ok(nodes(card).some(e => e.tagName === 'H3' && e.textContent === '<My calendar>'));
  assert.ok(nodes(card).some(e => e.textContent === '1 of 2 calendars selected'));
  const details = nodes(card).find(e => e.tagName === 'DETAILS');
  assert.equal(details.open, false, 'account switches are collapsed initially');
  const switches = nodes(card).filter(e => e.attributes.role === 'switch');
  assert.equal(switches[0].attributes['aria-checked'], 'true');
  click(switches[0]);
  assert.equal(calls.at(-1)[0], 'account');
  assert.equal(calls.at(-1)[3], false, 'toggle passes the current account and desired setting to the existing API helper');
  c.SourcesStore.busy[s.id] = true;
  assert.ok(nodes(c._connPageSourceCard(s)).filter(e => e.tagName === 'BUTTON').every(e => e.disabled));
});

test('resuming enables a source without claiming its expired sign-in was repaired; CSV opens existing Finances', async () => {
  const { context: c, calls } = page();
  const paused = source('expired-mail', 'email', 'auth', { enabled: false });
  await c._connPageResumeSource(paused);
  assert.deepEqual(calls.find(call => call[0] === 'update'), ['update', paused.id, { enabled: true }]);
  assert.equal(paused.health.state, 'auth');
  assert.equal(c.SourcesStore.busy[paused.id], undefined);
  const csv = c._connPageSourceCard(source('csv', 'bank', 'ok', { kind: 'csv' }));
  assert.ok(nodes(csv).some(e => e.textContent === 'Manual import'));
  const financeButton = nodes(csv).find(e => e.tagName === 'BUTTON' && e.innerHTML.includes('Open Finances'));
  click(financeButton);
  assert.deepEqual(calls.at(-1), ['view', 'finance']);
});

test('the Connections presentation leaves the shared welcome cards unchanged', () => {
  const { context: c } = page();
  const all = { cli: { installed: true }, claude: { state: 'ok' }, mcp: { installed: { claudeCode: 'installed' } }, assistants: { codex: { installed: true, configured: true }, gemini: { installed: true, configured: true } } };
  const welcome = c.assistantConnectionCards(all, () => {}, true);
  assert.ok(welcome.className.includes('assistant-grid-compact'));
  assert.equal(nodes(welcome).some(n => n.className.includes('cp-')), false);
  assert.equal(nodes(welcome).some(n => n.tagName === 'H3'), false);
  const pageCards = c._connPageAssistantCards(all);
  assert.ok(pageCards.className.includes('cp-assistant-grid'));
  assert.equal(nodes(pageCards).filter(n => n.tagName === 'H3').length, 4);
});
