// The Connections tab's account list (src/app/56-accounts*.js) in a sandbox
// with a tiny fake DOM. Synthetic accounts only; no server, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
class Element {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.className = ''; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.disabled = false; this.value = ''; }
  append(...c) { this.children.push(...c.filter(x => x != null)); }
  appendChild(c) { this.children.push(c); return c; }
  replaceChildren(...c) { this.children = c; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  insertAdjacentHTML(_p, html) { this.innerHTML = html + this.innerHTML; }
  focus() {}
}
const nodes = (el) => [el, ...(el.children || []).flatMap(nodes)];
const text = (el) => nodes(el).map(n => n.textContent || '').join(' ');
const find = (el, pred) => nodes(el).find(pred);
const plain = (v) => JSON.parse(JSON.stringify(v));

function sandbox() {
  const calls = [];
  const ctx = vm.createContext({
    document: { createElement: (t) => new Element(t) }, URLSearchParams, Date, Map, JSON, Promise, encodeURIComponent,
    window: { addEventListener() {}, open: (...a) => calls.push(['open', ...a]), location: {} },
    state: { view: 'connections' }, renderMain() {}, registerSection() {}, registerCommand() {},
    icon: (n) => `<svg data-icon="${n}"></svg>`, toast: (...a) => calls.push(['toast', ...a]), netErrorMessage: (e) => String(e && e.message),
    openDrawer: (o) => { const el = new Element('div'); calls.push(['drawer', o.title, el]); o.body(el, () => calls.push(['close'])); return () => {}; },
    confirmDialog: async () => true, openMenu: (anchor, items) => calls.push(['menu', items]),
    _srcApi: async (path, o) => { calls.push(['api', path, o && plain(o)]); return { accounts: [], providers: {} }; },
    srcAddFlow: (o) => calls.push(['srcAddFlow', plain(o)]),
    SourcesStore: { refresh() {} },
    _connEl: (tag, cls, t) => { const e = new Element(tag); if (cls) e.className = cls; if (t != null) e.textContent = t; return e; },
    _connBtn: (label, ic, cls, run) => { const b = new Element('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = (e) => run(b, e); return b; },
    _connSteps: (items) => { const ol = new Element('ol'); for (const it of items) { const li = new Element('li'); for (const p of [].concat(it)) li.appendChild(typeof p === 'string' ? Object.assign(new Element('span'), { textContent: p }) : p); ol.appendChild(li); } return ol; },
    _connCode: (t) => Object.assign(new Element('pre'), { textContent: t }),
    _connCopyBtn: (t, l) => Object.assign(new Element('button'), { textContent: l }),
  });
  for (const f of ['56-connections-brands.js', '56-accounts-logic.js', '56-accounts.js']) vm.runInContext(readFileSync(join(ROOT, 'src', 'app', f), 'utf8'), ctx, { filename: f });
  return { c: ctx, calls };
}
const NOW = Date.parse('2026-10-23T12:00:00Z');
const acc = (extra = {}) => ({ id: 'acc_0000000000000001', provider: 'microsoft', email: 'me@hotmail.com', kind: 'personal', features: { mail: true, calendar: true },
  status: 'connected', lastSync: '2026-10-23T11:56:00Z', here: { fetcher: true, signedIn: true }, statusText: 'Connected', syncedText: 'synced 4 min ago', ...extra });

test('logic: personal or work from the address, plain status words, Mail ✓ Calendar ✓', () => {
  const { c } = sandbox();
  for (const e of ['me@hotmail.co.uk', 'me@outlook.com', 'me@live.com', 'me@gmail.com']) assert.equal(c.accGuessKind(e), 'personal', e);
  assert.equal(c.accGuessKind('me@company.example'), 'work');
  assert.equal(c.accCleanEmail('  Me@Hotmail.com '), 'me@hotmail.com'); assert.equal(c.accCleanEmail('me@'), '');
  assert.equal(c.accProviderName(acc()), 'Outlook'); assert.equal(c.accProviderName(acc({ kind: 'work' })), 'Microsoft 365');
  const views = ['connected', 'needs-sign-in', 'needs-admin-approval', 'paused'].map(status => c.accStatusView(acc({ status })));
  assert.deepEqual(views.map(v => v.label), ['Connected', 'Sign in again', 'Waiting for your organisation', 'Paused']);
  assert.deepEqual(views.map(v => v.primary && v.primary.id), ['sync', 'sign-in', 'approval', 'resume']);
  const elsewhere = c.accStatusView(acc({ here: { fetcher: false, signedIn: false } }));
  assert.equal(elsewhere.secondary[0].label, 'Fetch on this computer instead'); assert.equal(elsewhere.primary, null);
  const words = JSON.stringify([...views, elsewhere, ['', 'me@', 'me@hotmail.com', 'me@work.example'].map(e => c.accEmailHint(e, 'microsoft'))]);
  for (const jargon of [/client/i, /port\b/i, /oauth/i, /token/i, /tenant/i, /scope/i, /consent/i, /redirect/i]) assert.ok(!jargon.test(words), `no "${jargon.source}" in what people read`);
  assert.deepEqual(plain(c.accFeatureList(acc({ features: { mail: true, calendar: false } }))), [{ id: 'mail', label: 'Mail', on: true }, { id: 'calendar', label: 'Calendar', on: false }]);
  assert.equal(c.accSyncedText({ lastSync: '2026-10-23T09:00:00Z' }, NOW), 'synced 3 hours ago');
  assert.equal(c.accSyncedText({}), 'not synced yet');
  assert.equal(c.accBeginUrl({ provider: 'microsoft', email: ' Me@Hotmail.com', kind: 'work' }), '/api/accounts/begin?provider=microsoft&email=me%40hotmail.com&kind=work');
  assert.equal(c.accBeginUrl({ provider: 'microsoft', accountId: 'acc_0000000000000001' }), '/api/accounts/begin?provider=microsoft&accountId=acc_0000000000000001');
  assert.deepEqual(c.accSort([acc({ id: 'w', kind: 'work', email: 'a@w.example' }), acc({ id: 'p', email: 'z@hotmail.com' })]).map(a => a.id), ['p', 'w']);
  assert.deepEqual(plain(c.accAddButtons({ microsoft: { available: true }, google: { available: false }, imap: { comingSoon: true } })).map(b => [b.label, b.available]),
    [['+ Add Google account', false], ['+ Add Microsoft account', true], ['+ Other email', false]]);
  assert.equal(c.accNewlyConnected([{ id: 'a', status: 'needs-sign-in' }], [acc({ id: 'a' })]).id, 'a');
  assert.equal(c.accNewlyConnected([{ id: 'a', status: 'connected' }], [acc({ id: 'a' })]), null);
  assert.equal(c.accSignInPending(NOW - 1000, NOW), true); assert.equal(c.accSignInPending(NOW - 700000, NOW), false);
});

test('the list: three add buttons, a calendar link, and one card per account with its toggles and sync time', async () => {
  const { c, calls } = sandbox();
  vm.runInContext("AccountsStore", c).data = { accounts: [acc(), acc({ id: 'acc_0000000000000002', email: 'me@work.example', kind: 'work', status: 'needs-admin-approval', features: { mail: true, calendar: false } })], providers: { microsoft: { available: true }, google: { available: false }, imap: { comingSoon: true } } };
  const s = c.accountsSection();
  const labels = nodes(s).filter(n => n.dataset && n.dataset.add).map(n => text(n).trim());
  assert.deepEqual(labels, ['+ Add Google account', '+ Add Microsoft account', '+ Other email']);
  assert.match(text(s), /Add a calendar link/);
  const cards = nodes(s).filter(n => n.dataset && n.dataset.accountId);
  assert.equal(cards.length, 2);
  const home = cards.find(n => n.dataset.accountId === 'acc_0000000000000001');
  assert.match(text(home), /me@hotmail\.com/); assert.match(text(home), /Outlook · Personal account/); assert.match(text(home), /synced 4 min ago/);
  assert.match(text(home), /Mail.*✓/); assert.match(text(home), /Calendar.*✓/);
  const work = cards.find(n => n.dataset.accountId === 'acc_0000000000000002');
  assert.match(text(work), /Waiting for your organisation/); assert.match(text(work), /Ask for approval/); assert.match(text(work), /Calendar off/);
  // switching Mail off posts the feature change
  const mail = nodes(home).find(n => n.tagName === 'BUTTON' && String(n.className).split(' ').includes('acc-feature') && text(n).includes('Mail'));
  assert.equal(mail.attributes['aria-pressed'], 'true');
  await mail.onclick();
  assert.deepEqual(calls.find(x => x[0] === 'api' && x[1] === '/api/accounts/features').slice(1), ['/api/accounts/features', { method: 'POST', body: { id: 'acc_0000000000000001', mail: false } }]);
  // the calendar link opens the iCal flow directly
  find(s, n => n.className && n.className.includes('acc-add-link')).onclick();
  assert.deepEqual(calls.find(x => x[0] === 'srcAddFlow')[1], { capability: 'calendar', ical: true });
});

test('+ Add Microsoft account asks only for the address, then opens Microsoft in a new tab', () => {
  const { c, calls } = sandbox();
  vm.runInContext("AccountsStore", c).data = { accounts: [], providers: { microsoft: { available: true, callback: 'http://localhost/api/accounts/callback' } } };
  c.accAdd('microsoft');
  const [, title, el] = calls.find(x => x[0] === 'drawer');
  assert.equal(title, 'Add a Microsoft account');
  const advanced = find(el, n => n.tagName === 'DETAILS');
  const outside = nodes(el).filter(n => !nodes(advanced).includes(n));
  assert.ok(!/client|port|tenant|token/i.test(outside.map(n => n.textContent).join(' ')), 'no jargon outside the Advanced fold');
  assert.match(text(advanced), /Advanced: use your own Microsoft app/);
  const input = find(el, n => n.tagName === 'INPUT' && n.type === 'email');
  input.value = 'Me@Hotmail.co.uk'; input.oninput();
  assert.match(text(el), /Personal Microsoft account/);
  const swap = find(el, n => n.className && n.className.includes('acc-swap'));
  assert.equal(swap.hidden, false); assert.equal(swap.textContent, 'This is a work or school account');
  const go = find(el, n => n.tagName === 'BUTTON' && n.textContent === 'Continue to Microsoft');
  go.onclick();
  const open = calls.find(x => x[0] === 'open');
  assert.equal(open[1], '/api/accounts/begin?provider=microsoft&email=me%40hotmail.co.uk'); assert.equal(open[2], '_blank');
  assert.match(text(el), /Finish signing in on the Microsoft tab/);
});

test('+ Other email and Google (until it lands) say "coming soon" kindly', () => {
  const { c, calls } = sandbox();
  vm.runInContext("AccountsStore", c).data = { accounts: [], providers: { microsoft: { available: true }, google: { available: false }, imap: { comingSoon: true } } };
  c.accAdd('other');
  let d = calls.filter(x => x[0] === 'drawer').at(-1);
  assert.equal(d[1], 'Other email');
  assert.match(text(d[2]), /Coming soon: Yahoo, iCloud and others with an app password/);
  c.accAdd('google');
  d = calls.filter(x => x[0] === 'drawer').at(-1);
  assert.match(text(d[2]), /Coming soon/);
  // Microsoft not set up in this copy: say so, and open the Advanced fold
  vm.runInContext("AccountsStore", c).data = { accounts: [], providers: { microsoft: { available: false } } };
  c.accAdd('microsoft');
  d = calls.filter(x => x[0] === 'drawer').at(-1);
  assert.match(text(d[2]), /not ready in this copy of OpenDash yet/);
  assert.equal(find(d[2], n => n.tagName === 'DETAILS').open, true);
});
