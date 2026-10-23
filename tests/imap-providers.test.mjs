// "+ Other email": which service an address belongs to (lib/accounts/imap-providers.mjs),
// its IMAP server, app-password page and steps; Gmail / Outlook sent to the
// one-click buttons; the MX check for people's own domains (lib/accounts-imap.mjs,
// with an injected resolver: no DNS); typed servers; user names to try.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupProvider, providerFromMx, cleanServer, usernamesFor, isLoopbackHost, IMAP_PROVIDERS, APP_PASSWORD_INTRO } from '../lib/accounts/imap-providers.mjs';
import { lookupWithMx, mxHosts, imapProviderConfig } from '../lib/accounts-imap.mjs';

const host = (email) => lookupProvider(email).imap && lookupProvider(email).imap.host;

test('known services: the right server for every domain variant', () => {
  const cases = {
    'name@yahoo.com': ['yahoo', 'imap.mail.yahoo.com'], 'name@yahoo.co.uk': ['yahoo', 'imap.mail.yahoo.com'], 'name@yahoo.fr': ['yahoo', 'imap.mail.yahoo.com'],
    'name@ymail.com': ['yahoo', 'imap.mail.yahoo.com'], 'name@rocketmail.com': ['yahoo', 'imap.mail.yahoo.com'], 'name@yahoo.com.au': ['yahoo', 'imap.mail.yahoo.com'],
    'name@aol.com': ['aol', 'imap.aol.com'], 'name@aol.co.uk': ['aol', 'imap.aol.com'], 'name@aim.com': ['aol', 'imap.aol.com'],
    'name@icloud.com': ['icloud', 'imap.mail.me.com'], 'name@me.com': ['icloud', 'imap.mail.me.com'], 'name@mac.com': ['icloud', 'imap.mail.me.com'],
    'name@gmx.com': ['gmx', 'imap.gmx.com'], 'name@gmx.co.uk': ['gmx', 'imap.gmx.com'], 'name@gmx.net': ['gmx', 'imap.gmx.net'], 'name@gmx.de': ['gmx', 'imap.gmx.net'], 'name@gmx.at': ['gmx', 'imap.gmx.net'],
    'name@zoho.com': ['zoho', 'imap.zoho.com'], 'name@zohomail.com': ['zoho', 'imap.zoho.com'], 'name@zoho.eu': ['zoho', 'imap.zoho.eu'], 'name@zohomail.in': ['zoho', 'imap.zoho.in'],
    'name@fastmail.com': ['fastmail', 'imap.fastmail.com'], 'name@fastmail.fm': ['fastmail', 'imap.fastmail.com'], 'name@sent.com': ['fastmail', 'imap.fastmail.com'],
    'name@proton.me': ['proton', '127.0.0.1'], 'name@protonmail.com': ['proton', '127.0.0.1'], 'name@pm.me': ['proton', '127.0.0.1'],
    '  Name@Yahoo.COM ': ['yahoo', 'imap.mail.yahoo.com'],
  };
  for (const [email, [id, h]] of Object.entries(cases)) {
    const p = lookupProvider(email);
    assert.equal(p.kind, 'known', email);
    assert.equal(p.id, id, email);
    assert.equal(p.imap.host, h, email);
    assert.equal(p.email, email.trim().toLowerCase());
  }
  assert.equal(lookupProvider('name@proton.me').imap.port, 1143);
  assert.equal(lookupProvider('name@proton.me').imap.security, 'starttls');
  assert.equal(lookupProvider('name@proton.me').bridge, true);
  assert.equal(lookupProvider('name@yahoo.com').imap.port, 993);
  assert.equal(lookupProvider('name@icloud.com').username, 'email-then-local');
  assert.equal(lookupProvider('name@zoho.eu').appPassword.url, 'https://accounts.zoho.eu/home#security/app_password', 'the account page in the same data centre');
});

test('every known service: plain steps, an https app-password page, the app-password explanation, calendar help', () => {
  for (const p of IMAP_PROVIDERS) {
    // (Gmail is only set up here while the one-click Google sign-in is off.)
    const info = lookupProvider('someone@' + { gmail: 'gmail.com', yahoo: 'yahoo.com', aol: 'aol.com', icloud: 'icloud.com', gmx: 'gmx.com', zoho: 'zoho.com', fastmail: 'fastmail.com', proton: 'proton.me' }[p.id], p.id === 'gmail' ? { oneClick: { google: false } } : {});
    assert.equal(info.id, p.id);
    assert.match(info.appPassword.url, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//, p.id);
    assert.ok(info.appPassword.button.length > 5, p.id);
    assert.ok(info.steps.length >= 3 && info.steps.every((s) => typeof s === 'string' && s.length > 20 && s.length < 260), p.id);
    assert.deepEqual(info.intro, APP_PASSWORD_INTRO);
    // plain language: no jargon in what the user reads (Proton's steps must name IMAP for Bridge's screen)
    for (const s of [...info.steps, ...info.tips]) assert.doesNotMatch(s, /\b(?:SASL|TLS|SSL|STARTTLS|OAuth|port 993|client ID)\b/, `${p.id}: ${s}`);
    if (info.calendar.ics) {
      assert.ok(info.calendar.steps.length >= 3, p.id);
      assert.match(info.calendar.url, /^https:\/\//, p.id);
      assert.match(info.calendar.note, /link/);
    } else assert.match(info.calendar.text, /cannot be shared/);
    assert.match(info.webmail, /^https:\/\//);
  }
  assert.equal(lookupProvider('someone@icloud.com').calendar.ics, true);
  assert.equal(lookupProvider('someone@yahoo.com').calendar.ics, true);
  assert.equal(lookupProvider('someone@aol.com').calendar.ics, false);
  assert.match(lookupProvider('someone@proton.me').steps[0], /Proton Mail Bridge/);
});

test('Gmail and Outlook addresses go to the one-click buttons', () => {
  for (const e of ['me@gmail.com', 'me@googlemail.com']) assert.deepEqual([lookupProvider(e).kind, lookupProvider(e).provider], ['redirect', 'google'], e);
  for (const e of ['me@hotmail.com', 'me@outlook.com', 'me@live.co.uk', 'me@hotmail.co.uk', 'me@msn.com', 'me@outlook.fr']) assert.deepEqual([lookupProvider(e).kind, lookupProvider(e).provider], ['redirect', 'microsoft'], e);
  assert.match(lookupProvider('me@gmail.com').message, /Add Google account/);
  assert.match(lookupProvider('me@hotmail.com').message, /Add Microsoft account/);
});

test('without the one-click sign-ins: Gmail with an app password (and its iCal secret address); Outlook and Hotmail coming soon (and a published calendar)', () => {
  const off = { oneClick: { google: false, microsoft: false } };
  for (const e of ['me@gmail.com', 'me@googlemail.com']) {
    const g = lookupProvider(e, off);
    assert.deepEqual([g.kind, g.id, g.imap.host, g.imap.port, g.imap.security, g.username], ['known', 'gmail', 'imap.gmail.com', 993, 'tls', 'email'], e);
  }
  const g = lookupProvider('me@gmail.com', off);
  assert.equal(g.appPassword.url, 'https://myaccount.google.com/apppasswords'); assert.equal(g.appPassword.twoStep, true);
  assert.match(g.steps[0], /2-Step Verification/); assert.match(g.steps.join(' '), /myaccount\.google\.com\/apppasswords/);
  assert.deepEqual([g.calendar.ics, g.calendar.name], [true, 'Google Calendar']); assert.match(g.calendar.steps.join(' '), /Secret address in iCal format/);
  for (const e of ['me@hotmail.com', 'me@outlook.com', 'me@live.co.uk', 'me@msn.com']) {
    const m = lookupProvider(e, off);
    assert.deepEqual([m.kind, m.provider, m.title], ['soon', 'microsoft', 'Outlook and Hotmail are coming soon'], e);
  }
  const m = lookupProvider('me@outlook.com', off);
  assert.match(m.message, /no longer lets apps read Outlook\.com/); assert.deepEqual([m.calendar.ics, m.calendar.name], [true, 'Outlook calendar']);
  assert.match(m.calendar.steps.join(' '), /Publish a calendar/);
  // Only the one that is off changes; with both on (the default) the redirects come back.
  assert.equal(lookupProvider('me@gmail.com', { oneClick: { google: true, microsoft: false } }).kind, 'redirect');
  assert.equal(lookupProvider('me@outlook.com', { oneClick: { google: false, microsoft: true } }).kind, 'redirect');
  assert.equal(lookupProvider('me@gmail.com').kind, 'redirect');
  // Own domains by MX: Google Workspace through Gmail's IMAP; Microsoft 365 coming soon.
  const ws = providerFromMx('me@corp.example', ['aspmx.l.google.com'], off);
  assert.deepEqual([ws.kind, ws.id, ws.imap.host, ws.viaMx], ['known', 'gmail', 'imap.gmail.com', true]);
  const m365 = providerFromMx('me@corp.example', ['corp-example.mail.protection.outlook.com'], off);
  assert.deepEqual([m365.kind, m365.title], ['soon', 'Microsoft 365 is coming soon']);
});

test('other addresses: a guessed server; invalid addresses: a plain hint', () => {
  const o = lookupProvider('name@btinternet.com');
  assert.equal(o.kind, 'other'); assert.equal(o.imap.host, 'imap.btinternet.com'); assert.equal(o.imap.port, 993); assert.equal(o.guessed, true);
  assert.ok(o.steps.length >= 2); assert.equal(o.calendar.ics, true);
  for (const bad of ['', 'jo', 'name@', '@example.com', 'name@x', null, 'a b@example.com']) assert.equal(lookupProvider(bad).kind, 'invalid', String(bad));
  assert.match(lookupProvider('jo').message, /whole email address/);
});

test('own domains: the MX records say which service (Google Workspace / Microsoft 365 -> one click)', async () => {
  assert.equal(providerFromMx('me@family.example', ['in1-smtp.messagingengine.com', 'in2-smtp.messagingengine.com']).id, 'fastmail');
  assert.equal(providerFromMx('me@family.example', ['mx01.mail.icloud.com.']).id, 'icloud');
  const z = providerFromMx('me@shop.example', ['mx.zoho.eu', 'mx2.zoho.eu']);
  assert.equal(z.id, 'zoho'); assert.equal(z.imap.host, 'imappro.zoho.eu', 'Zoho with your own domain: imappro, the MX data centre');
  assert.equal(providerFromMx('me@x.example', ['mta5.am0.yahoodns.net']).id, 'yahoo');
  assert.deepEqual([providerFromMx('me@corp.example', ['aspmx.l.google.com']).kind, providerFromMx('me@corp.example', ['aspmx.l.google.com']).provider], ['redirect', 'google']);
  assert.equal(providerFromMx('me@corp.example', ['corp-example.mail.protection.outlook.com']).provider, 'microsoft');
  assert.equal(providerFromMx('me@corp.example', ['mail.corp.example']), null);
  assert.equal(providerFromMx('me@corp.example', []), null);
  // the Node lookup: MX only for unknown domains, and a slow or failing resolver is just "other"
  let asked = 0;
  const resolveMx = async (d) => { asked++; assert.equal(d, 'family.example'); return [{ exchange: 'in2-smtp.messagingengine.com', priority: 20 }, { exchange: 'in1-smtp.messagingengine.com', priority: 10 }]; };
  assert.equal((await lookupWithMx('me@family.example', { resolveMx })).id, 'fastmail');
  assert.equal((await lookupWithMx('me@yahoo.com', { resolveMx })).id, 'yahoo');
  assert.equal(asked, 1, 'known domains need no DNS');
  assert.equal((await lookupWithMx('me@family.example', { resolveMx: async () => { throw Object.assign(new Error('x'), { code: 'ENOTFOUND' }); } })).kind, 'other');
  assert.equal((await lookupWithMx('me@family.example', { resolveMx: () => new Promise(() => {}), timeoutMs: 30 })).kind, 'other');
  assert.deepEqual(await mxHosts('family.example', { resolveMx }), ['in1-smtp.messagingengine.com', 'in2-smtp.messagingengine.com']);
  const cfg = imapProviderConfig({ mx: false });
  assert.equal(typeof cfg.openTransport, 'function');
  assert.equal((await cfg.lookup('me@family.example')).kind, 'other');
});

test('typed servers and user names', () => {
  assert.deepEqual(cleanServer({ host: ' IMAP.Example.com. ', port: '993' }), { host: 'imap.example.com', port: 993, security: 'tls' });
  assert.deepEqual(cleanServer({ host: 'mail.example.org', security: 'starttls' }), { host: 'mail.example.org', port: 143, security: 'starttls' });
  assert.deepEqual(cleanServer({ host: '192.168.1.20', port: 993 }), { host: '192.168.1.20', port: 993, security: 'tls' });
  for (const bad of [{ host: '' }, { host: 'imap example.com' }, { host: 'http://imap.x.com' }, { host: '999.1.1.1' }, { host: 'x.com', port: 0 }, { host: 'x.com', port: 70000 }, { host: 'x.com', port: 'abc' }]) {
    assert.ok(cleanServer(bad).error, JSON.stringify(bad));
  }
  assert.deepEqual(usernamesFor('Name@iCloud.com', 'email-then-local'), ['name@icloud.com', 'name']);
  assert.deepEqual(usernamesFor('name@yahoo.com', 'email'), ['name@yahoo.com']);
  assert.deepEqual(usernamesFor('name@proton.me', 'email', 'bridge-user'), ['bridge-user']);
  assert.ok(isLoopbackHost('127.0.0.1') && isLoopbackHost('localhost') && !isLoopbackHost('imap.mail.me.com'));
});
