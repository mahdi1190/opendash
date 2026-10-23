// The Google sign-in card and the "own Google app" fold (src/app/56-accounts-google.js),
// in a stub page: synthetic answers only, no browser, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

class El {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.className = ''; this.textContent = ''; this.hidden = false; this.value = ''; this.checked = false; }
  append(...c) { this.children.push(...c); }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
}
const all = (e) => [e, ...e.children.flatMap(all)];
const text = (e) => all(e).map((x) => x.textContent).join(' ');

function page(api = async () => ({ url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x' }), { blocked = false } = {}) {
  const calls = [], dialogs = [];
  const popup = { opener: {}, closed: false, location: { replace: (u) => calls.push(['navigate', u]) }, close() { this.closed = true; calls.push(['popup-close']); } };
  const window = { open: (...a) => { calls.push(['open', ...a]); return blocked ? null : popup; } };
  const ctx = vm.createContext({
    window, document: { createElement: (t) => new El(t) },
    location: { assign: (u) => calls.push(['same-tab', u]) },
    _connEl: (tag, cls, t) => { const e = new El(tag); e.className = cls || ''; if (t != null) e.textContent = t; return e; },
    _connBtn: (label, _i, _c, run) => { const b = new El('button'); b.textContent = label; b.onclick = () => run(b); return b; },
    _connSteps: (items) => { const ol = new El('ol'); for (const s of items) { const li = new El('li'); li.textContent = s; ol.appendChild(li); } return ol; },
    _srcApi: async (...a) => { calls.push(['api', ...a]); return api(...a); },
    toast: (...a) => calls.push(['toast', ...a]),
    openDialog: (o) => { const body = new El('div'); o.body(body, () => {}); const d = { o, body, closed: false }; d.press = (label) => { const a = o.actions.find((x) => x.label === label); const r = a.run(() => {}); if (r !== false) { d.closed = true; o.onClose && o.onClose(); } return r; }; dialogs.push(d); return () => {}; },
  });
  vm.runInContext(readFileSync(new URL('../src/app/56-accounts-google.js', import.meta.url), 'utf8'), ctx);
  return { ctx, calls, dialogs, popup, window };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('the card: email and calendar are separate ticks, and Google\'s warning is explained before the browser opens', () => {
  const { ctx, dialogs, calls } = page();
  ctx.googleAddAccount({ email: 'Me@Example.com' });
  const d = dialogs[0];
  const boxes = all(d.body).filter((e) => e.type === 'checkbox');
  assert.deepEqual(boxes.map((b) => [b.dataset.feature, b.checked]), [['mail', true], ['calendar', true]]);
  const words = text(d.body);
  assert.match(words, /Google hasn’t verified this app/);
  assert.match(words, /Click Advanced/);
  assert.match(words, /Go to OpenDash \(unsafe\)/);
  assert.match(words, /your own app/i);
  assert.match(words, /myaccount\.google\.com\/permissions/);
  assert.match(words, /never sends, deletes, labels or archives/);
  assert.equal(calls.length, 0, 'nothing opens until Continue');
  ctx.googleAddAccount({ email: 'me@example.com', custom: true });
  assert.match(text(dialogs[1].body), /Go to the name you gave your Google app \(unsafe\)/);
});

test('Continue: an empty tab first, then the server\'s Google address; only the ticked features are asked for', async () => {
  const { ctx, dialogs, calls, popup } = page();
  const done = ctx.googleAddAccount({ email: 'me@example.com' });
  const d = dialogs[0];
  all(d.body).find((e) => e.dataset.feature === 'mail').checked = false;
  d.press('Continue to Google');
  const choice = await done;
  assert.deepEqual(JSON.parse(JSON.stringify(choice)), { email: 'me@example.com', features: { mail: false, calendar: true }, accountId: null });
  assert.deepEqual(calls[0], ['open', 'about:blank', '_blank'], 'the tab opens inside the click (no pop-up blocker)');
  assert.equal(calls[1][1], '/api/accounts/begin');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1][2])), { method: 'POST', body: { provider: 'google', email: 'me@example.com', features: { mail: false, calendar: true } } });
  assert.deepEqual(calls[2], ['navigate', 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x']);
  assert.equal(popup.opener, null);
});

test('a bad address or nothing ticked keeps the card open and sends nothing', async () => {
  const { ctx, dialogs, calls } = page();
  ctx.googleAddAccount({ email: 'not-an-address' });
  assert.equal(dialogs[0].press('Continue to Google'), false);
  const alert = all(dialogs[0].body).find((e) => e.attributes.role === 'alert');
  assert.equal(alert.hidden, false);
  assert.match(alert.textContent, /full Google address/);
  ctx.googleAddAccount({ email: 'me@example.com', features: { mail: false, calendar: false } });
  assert.equal(dialogs[1].press('Continue to Google'), false);
  assert.match(all(dialogs[1].body).find((e) => e.attributes.role === 'alert').textContent, /Tick email, calendar or both/);
  assert.equal(calls.length, 0);
});

test('blocked pop-up: sign in in this tab; a non-Google address from the server is never opened', async () => {
  const blocked = page(undefined, { blocked: true });
  const p = blocked.ctx.googleAddAccount({ email: 'me@example.com' });
  blocked.dialogs[0].press('Continue to Google');
  await p;
  const t = blocked.calls.find((c) => c[0] === 'toast');
  assert.match(t[1], /did not open/);
  t[2].action.run();
  assert.deepEqual(blocked.calls.at(-1), ['same-tab', 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x']);

  const evil = page(async () => ({ url: 'https://evil.example/login' }));
  const q = evil.ctx.googleAddAccount({ email: 'me@example.com' });
  evil.dialogs[0].press('Continue to Google');
  assert.equal(await q, null);
  assert.ok(evil.calls.some((c) => c[0] === 'popup-close'));
  assert.ok(!evil.calls.some((c) => c[0] === 'navigate'));
  assert.equal(evil.calls.find((c) => c[0] === 'toast')[2].kind, 'err');
});

test('sign in again: the account id goes with it and the address cannot be changed; Cancel sends nothing', async () => {
  const { ctx, dialogs, calls } = page();
  const p = ctx.googleAddAccount({ email: 'me@example.com', accountId: 'acc_0123456789abcdef', features: { mail: true, calendar: false } });
  assert.equal(all(dialogs[0].body).find((e) => e.type === 'email').readOnly, true);
  assert.equal(all(dialogs[0].body).find((e) => e.dataset.feature === 'calendar').checked, false);
  dialogs[0].press('Continue to Google');
  await p;
  assert.equal(calls[1][2].body.accountId, 'acc_0123456789abcdef');
  const c = ctx.googleAddAccount({ email: 'me@example.com' });
  dialogs[1].press('Cancel');
  assert.equal(await c, null);
  assert.equal(calls.filter((x) => x[0] === 'api').length, 1);
});

test('Advanced: save your own Google app (id + secret, or Google\'s JSON), or go back to the built-in one', async () => {
  const { ctx, calls } = page(async () => ({ available: true, custom: true }));
  const el = new El('div');
  const changes = [];
  ctx.googleAdvancedFold(el, { available: true, custom: true, builtIn: true, hasSecret: true, clientIdHint: 'synthetic…' }, { onChange: (x) => changes.push(x) });
  const words = text(el);
  assert.match(words, /your own Google app \(synthetic…, with its secret\)/);
  assert.match(words, /Publish app/);
  assert.match(words, /gmail\.readonly/);
  const [idBox] = all(el).filter((e) => e.tagName === 'TEXTAREA');
  const secret = all(el).find((e) => e.type === 'password');
  const button = (label) => all(el).find((e) => e.tagName === 'BUTTON' && e.textContent === label);
  await button('Save my Google app').onclick();
  assert.equal(calls.filter((c) => c[0] === 'api').length, 0, 'nothing pasted: nothing sent');
  idBox.value = 'synthetic-own-1.apps.googleusercontent.com'; secret.value = 'GOCSPX-synthetic';
  await button('Save my Google app').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(calls.find((c) => c[0] === 'api').slice(1))), ['/api/accounts/google-app', { method: 'PUT', body: { clientId: 'synthetic-own-1.apps.googleusercontent.com', clientSecret: 'GOCSPX-synthetic' } }]);
  assert.equal(secret.value, '', 'the secret is cleared from the page once saved');
  idBox.value = JSON.stringify({ installed: { client_id: 'synthetic-own-1.apps.googleusercontent.com', client_secret: 'GOCSPX-synthetic' } });
  await button('Save my Google app').onclick();
  assert.ok(calls.filter((c) => c[0] === 'api')[1][2].body.json.startsWith('{"installed"'));
  await button('Use the built-in app').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(calls.filter((c) => c[0] === 'api')[2][2].body)), { clientId: null });
  assert.equal(changes.length, 3);
  const none = new El('div');
  ctx.googleAdvancedFold(none, { available: false, custom: false, builtIn: false });
  assert.match(text(none), /no built-in Google app/);
  assert.equal(all(none).some((e) => e.textContent === 'Use the built-in app'), false);
  assert.ok(ctx.window.AccountProviders.google.signIn === ctx.googleAddAccount);
});

test('inside the account list: the sign-in tab opens through accOpenSignIn with the ticked features, then the list waits', async () => {
  const { ctx, dialogs, calls } = page();
  const opened = [], drawers = [];
  ctx.accOpenSignIn = (o) => opened.push(JSON.parse(JSON.stringify(o)));
  ctx.accWaiting = (name) => { const e = new El('div'); e.textContent = 'waiting for ' + name; return e; };
  ctx.openDrawer = (o) => { const body = new El('div'); o.body(body, () => {}); drawers.push({ o, body }); };
  const p = ctx.googleAddAccount({ info: { available: true, custom: false, builtIn: true } });
  const d = dialogs[0];
  all(d.body).find((e) => e.type === 'email').value = 'kim@example.com';
  all(d.body).find((e) => e.dataset.feature === 'calendar').checked = false;
  assert.ok(all(d.body).some((e) => e.tagName === 'DETAILS'), 'the own-app fold is under the card');
  d.press('Continue to Google');
  await p;
  assert.deepEqual(opened, [{ provider: 'google', email: 'kim@example.com', features: { mail: true, calendar: false } }]);
  assert.equal(calls.filter((c) => c[0] === 'api' || c[0] === 'open').length, 0, 'the list opens the tab itself (GET begin)');
  assert.match(text(drawers[0].body), /waiting for Google/);
});

test('no Google app in this copy: the setup drawer explains it and opens Advanced; saving one goes on to the card', async () => {
  const { ctx, dialogs, calls } = page(async () => ({ available: true, custom: true, builtIn: false, hasSecret: true, clientIdHint: 'synthetic…' }));
  const drawers = [];
  ctx.openDrawer = (o) => { const body = new El('div'); o.body(body, () => drawers.push('closed')); drawers.push({ o, body }); };
  ctx.googleAddAccount({ info: { available: false, custom: false, builtIn: false } });
  assert.equal(dialogs.length, 0, 'no sign-in card without an app');
  const body = drawers[0].body;
  assert.match(text(body), /not switched on in this copy/);
  const fold = all(body).find((e) => e.tagName === 'DETAILS');
  assert.equal(fold.open, true);
  all(body).find((e) => e.tagName === 'TEXTAREA').value = 'synthetic-own-9.apps.googleusercontent.com';
  all(body).find((e) => e.type === 'password').value = 'GOCSPX-synthetic';
  await all(body).find((e) => e.tagName === 'BUTTON' && e.textContent === 'Save my Google app').onclick();
  await tick();
  assert.equal(calls.find((c) => c[0] === 'api')[1], '/api/accounts/google-app');
  assert.equal(dialogs.length, 1, 'with an app saved, the sign-in card follows');
});

test('the list\'s begin address carries the ticked features (GET /api/accounts/begin?features=)', () => {
  const ctx = vm.createContext({ URLSearchParams });
  vm.runInContext(readFileSync(new URL('../src/app/56-accounts-logic.js', import.meta.url), 'utf8'), ctx);
  const u = new URLSearchParams(ctx.accBeginUrl({ provider: 'google', email: 'kim@example.com', features: { mail: false, calendar: true } }).split('?')[1]);
  assert.deepEqual([u.get('provider'), u.get('email'), u.get('features')], ['google', 'kim@example.com', 'calendar']);
  assert.equal(new URLSearchParams(ctx.accBeginUrl({ provider: 'microsoft', email: 'kim@example.com' }).split('?')[1]).has('features'), false);
});

test('sign in again with a box changed: the account\'s Mail/Calendar choice follows (only what changed is sent)', async () => {
  const { ctx, dialogs, calls } = page();
  ctx.accOpenSignIn = () => {};
  const p = ctx.googleAddAccount({ email: 'kim@example.com', accountId: 'acc_0123456789abcdef', features: { mail: true, calendar: false } });
  all(dialogs[0].body).find((e) => e.dataset.feature === 'calendar').checked = true;
  dialogs[0].press('Continue to Google');
  await p;
  const sent = calls.filter((c) => c[0] === 'api').map((c) => JSON.parse(JSON.stringify(c.slice(1))));
  assert.deepEqual(sent, [['/api/accounts/features', { method: 'POST', body: { id: 'acc_0123456789abcdef', calendar: true } }]]);
});
