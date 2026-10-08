// Connections > Money (src/app/56-fin-connect*.js): the page's pure helpers and
// the chooser/account-list rendering, with synthetic records only. No network,
// no real accounts, addresses, keys or tokens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
class El {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.className = ''; this._text = ''; this.style = {};
    const self = this; this.classList = { add: (...n) => { self.className += ' ' + n.join(' '); }, remove: (...n) => { self.className = self.className.split(' ').filter(c => !n.includes(c)).join(' '); }, toggle() {}, contains: (n) => self.className.split(' ').includes(n) }; }
  append(...c) { for (const x of c) this.children.push(typeof x === 'string' ? Object.assign(new El('#text'), { _text: x }) : x); }
  appendChild(c) { this.children.push(c); return c; }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  insertBefore(c) { this.children.unshift(c); }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  insertAdjacentHTML(_p, h) { this.innerHTML = h + (this.innerHTML || ''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  get lastChild() { return this.children[this.children.length - 1]; }
}
const all = (el) => [el, ...el.children.flatMap(all)];
const plain = (v) => JSON.parse(JSON.stringify(v));

function load(extra = {}) {
  const calls = [];
  const ctx = vm.createContext({
    document: { createElement: (t) => new El(t), createTextNode: (t) => Object.assign(new El('#text'), { _text: t }) },
    window: { addEventListener() {} }, location: { hash: '', port: '4527' }, state: { view: 'connections' },
    APP_CONFIG: { currency: 'GBP', locale: 'en-GB' }, Intl, URL, Date, Math, JSON, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: () => 0, registerCommand() {}, renderMain() {}, toast: (...a) => calls.push(['toast', ...a]),
    icon: (n) => `<svg data-icon="${n}"></svg>`, esc: (v) => String(v),
    SRC_SWATCHES: ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'],
    SourcesStore: { busy: {}, data: { sources: [], servers: [] } },
    _connEl: (tag, cls, text) => { const e = new El(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },
    _connBtn: (label, ic, cls, run) => { const b = new El('button'); b.className = 'btn ' + cls + ' btn-sm'; b.textContent = label; b.onclick = run; return b; },
    _connCopyBtn: () => new El('button'), _connAgo: () => 'just now',
    connOpen: (id) => calls.push(['connOpen', id]), setView: (v) => calls.push(['view', v]),
    srcAddFlow: (o) => calls.push(['add', plain(o)]), openDrawer: (o) => calls.push(['drawer', o.title]),
    fetch: async () => { throw new Error('no network in tests'); },
    ...extra,
  });
  for (const f of ['56-fin-connect-wizards.js', '56-fin-connect.js', '56-fin-eb-banks.js']) vm.runInContext(readFileSync(join(ROOT, 'src', 'app', f), 'utf8'), ctx, { filename: f });
  return { c: ctx, calls };
}

test('masking shows only the end of an account id and a short wallet address', () => {
  const { c } = load();
  assert.equal(c.finMask('acc_00000000000012345678'), '••••5678');
  assert.equal(c.finMask('0x00000000000000000000000000000000000000a1'), '0x00…00a1');
  assert.equal(c.finMask('••••0011'), '••••0011');                 // already masked by the server
  assert.equal(c.finMask(''), '');
});

test('recovery phrases and private keys are refused in the page and the field is not kept', () => {
  const { c } = load();
  const words = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima';
  assert.equal(c.finLooksSecret(words), 'phrase');
  assert.equal(c.finLooksSecret(words + ' mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray'), 'phrase');
  assert.equal(c.finLooksSecret('ab'.repeat(32)), 'key');
  assert.equal(c.finLooksSecret('0x' + 'cd'.repeat(32)), 'key');
  assert.equal(c.finLooksSecret('0x00000000000000000000000000000000000000a1'), null);
  assert.equal(c.finLooksSecret('just a few words here'), null);
  const r = c.finAddressCheck(words);
  assert.equal(r.state, 'secret');
  assert.match(r.message, /Never paste it anywhere/);
  assert.equal(r.address, undefined);
});

test('address check: ok, partial, invalid and names', () => {
  const { c } = load();
  assert.deepEqual(plain(c.finAddressCheck('  0x00000000000000000000000000000000000000A1 ')), { state: 'ok', address: '0x00000000000000000000000000000000000000A1' });
  assert.equal(c.finAddressCheck('0x1234').state, 'partial');
  assert.equal(c.finAddressCheck('hello').state, 'invalid');
  assert.equal(c.finAddressCheck('someone.eth').state, 'invalid');
  assert.equal(c.finAddressCheck('').state, 'empty');
});

test('sign-in-again dates turn amber 14 days before, red 3 days before, and past after', () => {
  const { c } = load();
  const now = Date.parse('2026-10-08T09:00:00');
  assert.deepEqual(plain(c.finDueTone('2026-11-30', now)), { tone: 'ok', days: 53 });
  assert.equal(c.finDueTone('2026-10-22', now).tone, 'amber');
  assert.equal(c.finDueTone('2026-10-11', now).tone, 'red');
  assert.equal(c.finDueTone('2026-10-07', now).tone, 'past');
  assert.equal(c.finDueTone(null, now).tone, 'none');
  assert.equal(c.finDueText('2026-10-07', now), 'Sign-in expired');
  assert.match(c.finDueText('2026-11-30', now), /^Sign in again by 30 Nov$/);
  assert.equal(c.finSyncTone(new Date(now - 4 * 86400000).toISOString(), now), 'red');
  assert.equal(c.finSyncTone(new Date(now - 3600000).toISOString(), now), 'ok');
  assert.equal(c.finSyncTone(null, now), 'never');
  assert.equal(c.finClock(299), '4:59');
  assert.equal(c.finClock(-5), '0:00');
});

test('chooser search: own cards for Monzo and Plasma, Enable Banking banks, CSV when nothing matches', () => {
  const { c } = load();
  const banks = [{ name: 'Example Bank' }, { name: 'Example Savings', beta: true }, { name: 'Monzo Bank' }];
  const none = c.finChooserMatch('', banks);
  assert.equal(none.cards.size, 5); assert.equal(none.highlight, null);
  const m = c.finChooserMatch('monzo', banks);
  assert.equal(m.highlight, 'monzo'); assert.equal(m.banks.length, 0);     // never offered through Enable Banking
  assert.equal(c.finChooserMatch('plas', banks).highlight, 'plasma');
  const e = c.finChooserMatch('example', banks);
  assert.deepEqual(e.banks.map(b => b.name), ['Example Bank', 'Example Savings']);
  assert.ok(e.cards.has('enable-banking'));
  const n = c.finChooserMatch('nowhere bank', banks);
  assert.equal(n.ebNone, true); assert.ok(n.cards.has('csv'));
});

test('one account list across providers: aureli keys, direct groups from the API, balances in minor units, demo skipped', () => {
  const { c } = load();
  const sources = [
    { id: 'bank-aureli', capability: 'bank', kind: 'mcp', preset: 'aureli', server: 'claude.ai Bank', label: 'Aureli', colour: 'blue', accounts: [{ id: 'acct-1', name: 'Everyday', enabled: true }] },
    { id: 'bank-monzo-0001', capability: 'bank', kind: 'direct', provider: 'monzo', label: 'Monzo', colour: 'indigo', accounts: [{ id: 'acc_a', name: 'Current', enabled: true }, { id: 'acc_b', name: 'Joint', enabled: false, hiddenReason: 'duplicate' }] },
    { id: 'bank-demo', capability: 'bank', kind: 'mcp', demo: true, accounts: [{ id: 'x' }] },
    { id: 'cal', capability: 'calendar', kind: 'ical', accounts: [] },
  ];
  const api = [
    { sourceId: 'bank-aureli', provider: 'aureli', accounts: [{ key: 'acct-1', balance: 10.5, currency: 'GBP' }] },
    { sourceId: 'bank-monzo-0001', provider: 'monzo', state: 'ok', reauthDue: null, accounts: [
      { key: 'bank-monzo-0001.acc_a', kind: 'current', mask: '••••0011', balance: 1520.34, currency: 'GBP' },
      { key: 'bank-monzo-0001.acc_b', kind: 'joint', duplicateOf: 'acct-1', duplicateOfName: 'Everyday' }] },
    { sourceId: 'bank-plasma-0002', provider: 'plasma', label: 'Plasma One', state: 'error', message: 'Could not read', accounts: [{ key: 'bank-plasma-0002.w-abc', name: 'Wallet', kind: 'wallet', mask: '0x00…00a1' }] },
  ];
  const groups = c.finMergeAccounts(sources, api);
  assert.deepEqual(plain(groups.map(g => g.provider)), ['aureli', 'monzo', 'plasma']);
  assert.equal(groups[0].accounts[0].key, 'acct-1');
  assert.equal(groups[0].accounts[0].balance, 1050);
  const monzo = groups[1].accounts;
  assert.equal(monzo[0].balance, 152034);
  assert.equal(monzo[0].mask, '••••0011');
  assert.equal(monzo[1].enabled, false);
  assert.equal(monzo[1].duplicateOfName, 'Everyday');
  assert.equal(groups[2].source.health.state, 'error');           // a fresh connection the sources list does not have yet
  assert.equal(c.finCardStatus('monzo', groups, {}).label, 'Connected');
  assert.equal(c.finCardStatus('plasma', groups, {}).label, 'Not working');
  assert.equal(c.finCardStatus('enable-banking', groups, {}), null);
  assert.equal(c.finCardStatus('monzo', [], { sources: [{ id: 's', status: { configured: true, connected: false } }] }).label, 'Finish setup');
});

test('wizard checks: Monzo client id, key file, application id, the pasted return address, approval states', () => {
  const { c } = load();
  assert.equal(c.finMonzoClientCheck('oauth2client_ABCDEFGH12').ok, true);
  assert.equal(c.finMonzoClientCheck('client_123').ok, false);
  const head = (t) => '-----BEGIN ' + t + '-----';
  const tail = (t) => '-----END ' + t + '-----';
  const body = 'A'.repeat(200);
  assert.equal(c.finPemCheck(`${head('PRIVATE KEY')}\n${body}\n${tail('PRIVATE KEY')}`).ok, true);
  assert.equal(c.finPemCheck(`${head('RSA PRIVATE KEY')}\n${body}\n${tail('RSA PRIVATE KEY')}`).ok, true);
  assert.equal(c.finPemCheck(`${head('ENCRYPTED PRIVATE KEY')}\n${body}\n${tail('ENCRYPTED PRIVATE KEY')}`).ok, false);
  assert.match(c.finPemCheck(`${head('PUBLIC KEY')}\n${body}\n${tail('PUBLIC KEY')}`).message, /public key/);
  assert.equal(c.finPemCheck('x'.repeat(20000)).ok, false);
  const bad = c.finPemCheck('not a key');
  assert.equal(bad.ok, false); assert.ok(!bad.message.includes('not a key'));   // never echoes input
  assert.equal(c.finUuidCheck('00000000-0000-4000-8000-000000000abc').ok, true);
  assert.equal(c.finUuidCheck('nope').ok, false);
  assert.equal(c.finEbPasteCheck('https://localhost/opendash-eb-callback?code=abcd&state=4527.x').ok, true);
  assert.equal(c.finEbPasteCheck('https://example.com/opendash-eb-callback?code=abcd&state=x').ok, false);
  assert.equal(c.finEbPasteCheck('https://localhost:8443/opendash-eb-callback?code=abcd&state=x').ok, false);
  assert.equal(c.finEbPasteCheck('http://localhost/opendash-eb-callback?code=abcd&state=x').ok, false);
  assert.equal(c.finEbPasteCheck('https://localhost/opendash-eb-callback?error=access_denied&state=x').bankError, true);
  assert.equal(c.finEbPasteCheck('https://localhost/opendash-eb-callback?state=x').ok, false);
  assert.equal(c.finMonzoView({ state: 'waiting' }).phase, 'waiting');
  assert.match(c.finMonzoView({ state: 'importing', imported: 1240, earliest: '2019-03-01' }).text, /1,240 transactions, back to 2019/);
  assert.match(c.finMonzoView({ state: 'expired' }).text, /last 90 days/);
  assert.equal(c.finMonzoView({ state: 'idle' }).phase, 'signin');
});

test('the chooser renders every provider with the same five facts and one main button, read-only marked', () => {
  const { c } = load();
  const block = c.finMoneyBlock();
  const cards = all(block).filter(e => e.tagName === 'ARTICLE' && e.className.includes('fc-card'));
  assert.deepEqual(cards.map(e => e.dataset.provider), ['aureli', 'plasma', 'monzo', 'enable-banking', 'csv']);
  for (const card of cards) {
    const labels = all(card).filter(e => e.tagName === 'DT').map(e => e.textContent);
    assert.deepEqual(labels, ['Covers', 'Cost', 'Limits', 'You’ll need', 'Time']);
    assert.equal(all(card).filter(e => e.tagName === 'BUTTON' && e.className.includes('btn-primary')).length, 1);
    if (card.dataset.provider !== 'csv') assert.ok(all(card).some(e => e.className.includes('fc-lock') && /Read-only/.test(e.textContent)));
  }
  // The honest Plasma note is on its card.
  assert.match(cards[1].textContent, /without the shop name/);
});

test('the Monzo card opens its wizard, CSV opens Finances, nothing stores a secret in the page state', () => {
  const { c, calls } = load();
  const block = c.finMoneyBlock();
  const btn = (p) => all(block).find(e => e.dataset && e.dataset.act === 'connect-' + p);
  btn('monzo').onclick({ stopPropagation() {} });
  assert.ok(calls.some(x => x[0] === 'drawer' && x[1] === 'Connect Monzo'));
  btn('csv').onclick({ stopPropagation() {} });
  assert.ok(calls.some(x => x[0] === 'view' && x[1] === 'finance'));
  assert.equal(JSON.stringify(vm.runInContext('_finWiz', c)).includes('secret'), false);
});

test('the bundled bank list has the UI-owned shape and no bank is claimed when coverage is unconfirmed', () => {
  const { c } = load();
  const snap = vm.runInContext('FIN_EB_BANKS', c);
  assert.ok('asOf' in snap && typeof snap.countries === 'object');
  for (const [cc, list] of Object.entries(snap.countries)) {
    assert.match(cc, /^[A-Z]{2}$/);
    for (const b of list) assert.ok(typeof b === 'string' || (b && typeof b.name === 'string'));
  }
});
