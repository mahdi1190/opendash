// "+ Other email" on the page: the pure helpers of the guided flow
// (src/app/56-accounts-imap-logic.js) in a sandbox, fed with the server's real
// provider table (lib/accounts/imap-providers.mjs), and how IMAP accounts look
// on their cards (src/app/56-accounts-logic.js). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { lookupProvider } from '../lib/accounts/imap-providers.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
function box() {
  const ctx = { console, Date, Math, JSON, Intl, URLSearchParams, window: {} };
  vm.createContext(ctx);
  for (const f of ['56-accounts-imap-logic.js', '56-accounts-logic.js']) vm.runInContext(src(f), ctx, { filename: f });
  return ctx;
}
const JARGON = /\b(?:IMAP|TLS|SSL|STARTTLS|SASL|OAuth|port)\b/;

test('the drawer script parses and uses only helpers the page has', () => {
  const s = src('56-accounts-imap.js');
  assert.doesNotThrow(() => new vm.Script(s, { filename: '56-accounts-imap.js' }));
  for (const fn of ['imapEmailCheck', 'imapScreenFor', 'imapPasswordHint', 'imapConnectBody', 'imapErrorView', 'imapDoneView', 'openDrawer', '_connSteps', '_connBtn', '_srcApi', 'srcAddFlow']) assert.ok(s.includes(fn + '('), fn);
  assert.ok(!/innerHTML\s*=\s*[^;]*(?:\.text|\.message|\.title|steps|email)/.test(s), 'server text is never put in innerHTML');
  assert.ok(src('56-accounts.js').includes('imapConnectFlow('), 'the + Other email button opens the flow');
});

test('address box: plain hints, lower case', () => {
  const B = box();
  assert.deepEqual(plain(B.imapEmailCheck('  Name@Yahoo.COM ')), { ok: true, email: 'name@yahoo.com', hint: '' });
  assert.match(B.imapEmailCheck('jo').hint, /whole email address/);
  assert.match(B.imapEmailCheck('name@yahoo').hint, /name@example\.com/);
  assert.equal(B.imapEmailCheck('').ok, false);
});

test('screens from the real provider table: Yahoo, iCloud, Proton (Bridge), Other, Gmail/Outlook redirect', () => {
  const B = box();
  const y = plain(B.imapScreenFor(lookupProvider('name@yahoo.com')));
  assert.equal(y.kind, 'password'); assert.equal(y.title, 'Connect Yahoo Mail');
  assert.equal(y.intro.title, 'What is an app password?'); assert.match(y.intro.text, /never needs your real password/);
  assert.ok(y.steps.length >= 4); assert.equal(y.open.url, 'https://login.yahoo.com/account/security');
  assert.equal(y.passwordLabel, 'App password'); assert.equal(y.showServer, false); assert.equal(y.askUsername, false);
  assert.deepEqual(y.server, { host: 'imap.mail.yahoo.com', port: 993, security: 'tls' });
  for (const t of [y.title, y.intro.text, ...y.steps, ...y.tips, y.passwordLabel, y.serverNote]) assert.doesNotMatch(t, JARGON, t);
  const i = plain(B.imapScreenFor(lookupProvider('name@me.com')));
  assert.equal(i.passwordPlaceholder, 'abcd-efgh-ijkl-mnop'); assert.equal(i.open.label, 'Open Apple Account');
  const gmx = plain(B.imapScreenFor(lookupProvider('name@gmx.de')));
  assert.equal(gmx.passwordLabel, 'App password (or your email password)', 'GMX and Zoho work with the normal password when two-step is off');
  const p = plain(B.imapScreenFor(lookupProvider('name@proton.me')));
  assert.equal(p.askUsername, true); assert.equal(p.passwordLabel, 'Password from Bridge'); assert.equal(p.bridge, true);
  const o = plain(B.imapScreenFor(lookupProvider('name@btinternet.com')));
  assert.equal(o.title, 'Connect btinternet.com'); assert.equal(o.showServer, true); assert.equal(o.server.host, 'imap.btinternet.com'); assert.equal(o.open, null);
  assert.match(o.serverNote, /guessed/);
  const g = plain(B.imapScreenFor(lookupProvider('me@gmail.com')));
  assert.deepEqual([g.kind, g.provider, g.button], ['redirect', 'google', 'Continue with Google']);
  const m = plain(B.imapScreenFor(lookupProvider('me@hotmail.co.uk')));
  assert.deepEqual([m.kind, m.provider, m.button], ['redirect', 'microsoft', 'Continue with Microsoft']);
  assert.equal(B.imapScreenFor(lookupProvider('nope')).kind, 'invalid');
  assert.equal(B.imapScreenFor(null).kind, 'invalid');
});

test('password hints: a soft nudge when it does not look like that service’s app password', () => {
  const B = box();
  assert.equal(B.imapPasswordHint('abcd efgh ijkl mnop', 'yahoo'), '');
  assert.match(B.imapPasswordHint('Summer2026!', 'yahoo'), /16 letters/);
  assert.equal(B.imapPasswordHint('abcd-efgh-ijkl-mnop', 'icloud'), '');
  assert.match(B.imapPasswordHint('MyAppleId1', 'icloud'), /abcd-efgh-ijkl-mnop/);
  assert.match(B.imapPasswordHint('x', 'fastmail'), /16 letters and numbers/);
  assert.equal(B.imapPasswordHint('anything at all', 'gmx'), '', 'no rule for GMX / Zoho / Other');
  assert.equal(B.imapPasswordHint('', 'yahoo'), '');
});

test('the connect request: the server only when the user could see it; the account when re-pasting', () => {
  const B = box();
  const known = B.imapScreenFor(lookupProvider('name@yahoo.com'));
  assert.deepEqual(plain(B.imapConnectBody({ email: ' Name@Yahoo.com', password: 'pw', host: 'imap.mail.yahoo.com', port: '993' }, known)), { email: 'name@yahoo.com', password: 'pw' });
  assert.deepEqual(plain(B.imapConnectBody({ email: 'name@yahoo.com', password: 'pw', host: 'imap.custom.example', port: '143', security: 'starttls', serverOpened: true }, known, { id: 'acc_0123456789abcdef' })),
    { email: 'name@yahoo.com', password: 'pw', host: 'imap.custom.example', port: 143, security: 'starttls', accountId: 'acc_0123456789abcdef' });
  const other = B.imapScreenFor(lookupProvider('name@isp.example'));
  assert.deepEqual(plain(B.imapConnectBody({ email: 'name@isp.example', password: 'pw', host: 'mail.isp.example', port: '993', security: 'tls' }, other)), { email: 'name@isp.example', password: 'pw', host: 'mail.isp.example', port: 993, security: 'tls' });
  const bridge = B.imapScreenFor(lookupProvider('name@proton.me'));
  assert.equal(B.imapConnectBody({ email: 'name@proton.me', password: 'pw', username: ' bridge-user ' }, bridge).username, 'bridge-user');
});

test('errors: each code gets a title, where to look next, and the steps or the server settings', () => {
  const B = box();
  const y = B.imapScreenFor(lookupProvider('name@yahoo.com'));
  const v = (code, message = 'Plain words from the server.') => plain(B.imapErrorView({ code, message }, y));
  assert.deepEqual((({ title, focus, showSteps, openServer }) => ({ title, focus, showSteps, openServer }))(v('WRONG_PASSWORD')), { title: 'That password did not work', focus: 'password', showSteps: true, openServer: false });
  assert.equal(v('WRONG_PASSWORD').text, 'Plain words from the server.', 'the server’s plain message is shown as it is');
  assert.equal(v('APP_PASSWORD_NEEDED').title, 'You need an app password');
  assert.equal(v('TWO_STEP_NEEDED').title, 'Turn on two-step verification first');
  assert.equal(v('IMAP_DISABLED').showSteps, true);
  for (const c of ['IMAP_UNREACHABLE', 'IMAP_NOT_TRUSTED', 'IMAP_NOT_SECURE']) { assert.equal(v(c).focus, 'server', c); assert.equal(v(c).openServer, true, c); }
  assert.equal(v('PROVIDER_BUSY').title, 'Yahoo Mail did not answer in time');
  assert.equal(v('BRIDGE_NOT_RUNNING').title, 'Proton Mail Bridge is not running');
  assert.equal(v('USE_ONE_CLICK', 'This is a Gmail address. Use "Add Google account".').redirect, 'google');
  assert.equal(v('BAD_REQUEST', 'Type the mail server name, for example imap.example.com.').focus, 'server');
  assert.match(v('NETWORK').text, /OpenDash itself did not answer/);
  assert.equal(v('SOMETHING_NEW').title, 'That did not work');
  const p = B.imapScreenFor(lookupProvider('name@proton.me'));
  assert.equal(plain(B.imapErrorView({ code: 'WRONG_PASSWORD', message: 'x' }, p)).focus, 'username', 'Bridge: check the user name first');
  for (const code of ['WRONG_PASSWORD', 'APP_PASSWORD_NEEDED', 'TWO_STEP_NEEDED', 'PROVIDER_BUSY']) assert.doesNotMatch(v(code).title, JARGON, code);
});

test('connected: how much mail, then the calendar link offer (or why there is none)', () => {
  const B = box();
  const y = B.imapScreenFor(lookupProvider('name@yahoo.com'));
  const d = plain(B.imapDoneView({ account: { email: 'name@yahoo.com' }, inbox: { exists: 1234 }, results: [{ feature: 'mail', ok: true, count: 41 }] }, y));
  assert.equal(d.title, 'Connected');
  assert.equal(d.lines[0], 'name@yahoo.com is connected. Your inbox has 1,234 messages.');
  assert.match(d.lines[1], /\(41\)/);
  assert.match(d.lines.at(-1), /never sends, changes or deletes/);
  assert.equal(d.calendar.ics, true); assert.equal(d.calendar.title, 'Add your Yahoo calendar too?'); assert.equal(d.calendar.label, 'Yahoo calendar');
  assert.ok(d.calendar.steps.length >= 3); assert.equal(d.calendar.url, 'https://calendar.yahoo.com/');
  const ic = plain(B.imapDoneView({ account: { email: 'name@icloud.com' }, inbox: { exists: 1 }, results: [{ feature: 'mail', ok: false }] }, B.imapScreenFor(lookupProvider('name@icloud.com'))));
  assert.equal(ic.lines[0], 'name@icloud.com is connected. Your inbox has 1 message.');
  assert.match(ic.lines[1], /another try/);
  assert.equal(ic.calendar.title, 'Add your iCloud calendar too?');
  assert.match(ic.calendar.steps.join(' '), /Public Calendar/);
  const aol = plain(B.imapDoneView({ account: { email: 'name@aol.com' } }, B.imapScreenFor(lookupProvider('name@aol.com'))));
  assert.equal(aol.calendar.ics, false); assert.match(aol.calendar.text, /cannot be shared as a link/);
  const other = plain(B.imapDoneView({ account: { email: 'name@isp.example' } }, B.imapScreenFor(lookupProvider('name@isp.example'))));
  assert.equal(other.calendar.title, 'Add your calendar too?');
});

test('IMAP account cards: the service name, "Paste a new app password", a Calendar link button instead of a calendar toggle', () => {
  const B = box();
  const a = { id: 'acc_0000000000000009', provider: 'imap', email: 'name@yahoo.com', kind: 'personal', features: { mail: true, calendar: false }, status: 'connected', server: { service: 'yahoo', host: 'imap.mail.yahoo.com', port: 993, security: 'tls' }, here: { fetcher: true, signedIn: true } };
  assert.equal(B.accProviderName(a), 'Yahoo Mail');
  assert.equal(B.accProviderName({ ...a, server: { service: 'other' }, email: 'name@isp.example' }), 'isp.example');
  assert.deepEqual(plain(B.accFeatureList(a)), [{ id: 'mail', label: 'Mail', on: true }, { id: 'calendar', label: 'Calendar link', on: false, link: true }]);
  const ok = plain(B.accStatusView(a));
  assert.equal(ok.primary.id, 'sync');
  const need = plain(B.accStatusView({ ...a, status: 'needs-sign-in' }));
  assert.deepEqual([need.tone, need.primary.id, need.primary.label], ['warn', 'sign-in', 'Paste a new app password']);
  assert.match(need.note, /Yahoo Mail stopped working/);
  // Microsoft cards are unchanged
  assert.equal(B.accProviderName({ provider: 'microsoft', kind: 'personal' }), 'Outlook');
  assert.equal(plain(B.accFeatureList({ provider: 'microsoft', features: { mail: true, calendar: true } }))[1].label, 'Calendar');
});
