// lib/accounts/imap-providers.mjs - "+ Other email": which mail service an
// address belongs to, its IMAP server, and the plain-language steps to make an
// app password there (and, where the service can, a calendar link).
//
// PURE JS (no node: imports): the page asks the server for lookupProvider();
// a phone or desktop app can import this file directly. providerFromMx() lets
// a runtime with DNS recognise a service behind the user's own domain (the
// Node binding looks the MX records up; this file only reads them).
//
// Gmail and Outlook / Hotmail addresses go to the one-click Google and
// Microsoft sign-in (no password at all) WHEN that sign-in is switched on in
// this copy (opts.oneClick = {google, microsoft}; default: both on). Without
// the Google one, Gmail is set up here with an app password (imap.gmail.com,
// after 2-Step Verification) and Google Calendar through its "Secret address
// in iCal format". Without the Microsoft one, Outlook / Hotmail / Live (and
// Microsoft 365 found by MX) are "coming soon": Microsoft no longer lets apps
// read Outlook.com with an app password; an Outlook calendar can still come in
// through a published ICS link.

import { cleanEmail, emailDomain } from './core.mjs';

const GOOGLE = /^(?:gmail\.com|googlemail\.com)$/;
const MICROSOFT = /^(?:hotmail|outlook|live|msn|windowslive|passport)\.(?:com|net|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;

export const APP_PASSWORD_INTRO = Object.freeze({
  title: 'What is an app password?',
  text: 'An app password is a second password, made by your email provider just for OpenDash. OpenDash uses it to read your email, so it never needs your real password. You can delete it on your provider’s website at any time, and OpenDash stops reading straight away.',
});

/** Shared words for the calendar step: a link is read-only and private to whoever has it. */
const ICS_NOTE = 'Anyone who has this link can see the calendar, so keep it to yourself. OpenDash only reads it.';

// host/port/security: IMAPS on 993 unless said otherwise. username: 'email' (the
// whole address) or 'email-then-local' (try the whole address, then the part before @).
export const IMAP_PROVIDERS = Object.freeze([
  {
    // Only when the one-click Google sign-in is not switched on (lookupProvider's oneClick.google).
    id: 'gmail', name: 'Gmail',
    match: GOOGLE,
    mx: /(?:^|\.)(?:google\.com|googlemail\.com)$/,
    imap: { host: 'imap.gmail.com', port: 993, security: 'tls' }, username: 'email',
    appPassword: { url: 'https://myaccount.google.com/apppasswords', button: 'Open Google app passwords', required: true, twoStep: true },
    steps: [
      'Google makes app passwords only when 2-Step Verification is on. If it is not on yet: open myaccount.google.com/signinoptions/two-step-verification, sign in and turn it on.',
      'Click "Open Google app passwords" below (myaccount.google.com/apppasswords) and sign in.',
      'Type OpenDash as the app name and click Create.',
      'Google shows a 16-letter password once. Copy it and paste it below (the spaces do not matter).',
    ],
    tips: ['A Google Workspace (work or school) account may not offer app passwords: your administrator decides.',
      'Changing your Google password deletes your app passwords. Make a new one for OpenDash if that happens.'],
    webmail: 'https://mail.google.com/',
    calendar: { ics: true, name: 'Google Calendar', url: 'https://calendar.google.com/calendar/r/settings', button: 'Open Google Calendar settings', steps: [
      'Click "Open Google Calendar settings" below and sign in.',
      'On the left, under "Settings for my calendars", click your calendar.',
      'Scroll to "Integrate calendar" and copy the "Secret address in iCal format".',
      'Paste the link below.',
    ] },
  },
  {
    id: 'yahoo', name: 'Yahoo Mail',
    match: /^(?:yahoo\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})|ymail\.com|rocketmail\.com)$/,
    mx: /(?:^|\.)yahoodns\.net$/,
    imap: { host: 'imap.mail.yahoo.com', port: 993, security: 'tls' }, username: 'email',
    appPassword: { url: 'https://login.yahoo.com/account/security', button: 'Open Yahoo Account Security', required: true },
    steps: [
      'Click "Open Yahoo Account Security" below and sign in to Yahoo.',
      'Find "Generate app password" (it can also say "Create app password" or "Generate and manage app passwords").',
      'Type OpenDash as the app name and click Generate.',
      'Yahoo shows a password once. Copy it and paste it below.',
    ],
    tips: ['If Yahoo does not offer an app password, sign in on yahoo.com in this browser on a few days, then try again (Yahoo asks for this on new devices).'],
    webmail: 'https://mail.yahoo.com/',
    calendar: { ics: true, url: 'https://calendar.yahoo.com/', button: 'Open Yahoo Calendar', steps: [
      'Click "Open Yahoo Calendar" below and sign in.',
      'Next to your calendar’s name, click the small arrow and choose "Share".',
      'Under the links for calendar apps, choose "View events only" and copy the ICS link.',
      'Paste the link below.',
    ] },
  },
  {
    id: 'aol', name: 'AOL Mail',
    match: /^(?:aol\.(?:com|co\.uk|de|fr|it|es|jp|com\.au|com\.mx|in|nl|se|at|ch|be)|aim\.com|love\.com|games\.com|wow\.com|ygm\.com)$/,
    mx: /(?:^|\.)aol\.com$/,
    imap: { host: 'imap.aol.com', port: 993, security: 'tls' }, username: 'email',
    appPassword: { url: 'https://login.aol.com/account/security', button: 'Open AOL Account Security', required: true },
    steps: [
      'Click "Open AOL Account Security" below and sign in to AOL.',
      'Click "Generate app password" (or "Generate and manage app passwords").',
      'Type OpenDash as the app name and click Generate.',
      'AOL shows a password once. Copy it and paste it below.',
    ],
    tips: [],
    webmail: 'https://mail.aol.com/',
    calendar: { ics: false, text: 'AOL calendars cannot be shared as a link, so this step is not available for AOL.' },
  },
  {
    id: 'icloud', name: 'iCloud Mail',
    match: /^(?:icloud\.com|me\.com|mac\.com)$/,
    mx: /(?:^|\.)mail\.icloud\.com$/,
    imap: { host: 'imap.mail.me.com', port: 993, security: 'tls' }, username: 'email-then-local',
    appPassword: { url: 'https://account.apple.com/account/manage', button: 'Open Apple Account', required: true, twoStep: true },
    steps: [
      'Click "Open Apple Account" below and sign in with your Apple Account.',
      'Choose "Sign-In and Security", then "App-Specific Passwords".',
      'Click the + button, type OpenDash, and click Create.',
      'Apple shows a password that looks like abcd-efgh-ijkl-mnop. Copy it and paste it below.',
    ],
    tips: ['Apple only makes app-specific passwords when two-factor authentication is on. On an iPhone: Settings > your name > Sign-In & Security > Two-Factor Authentication.',
      'Changing your Apple Account password deletes every app-specific password. Make a new one for OpenDash if that happens.'],
    webmail: 'https://www.icloud.com/mail',
    calendar: { ics: true, url: 'https://www.icloud.com/calendar', button: 'Open iCloud Calendar', steps: [
      'Click "Open iCloud Calendar" below and sign in.',
      'Next to the calendar’s name on the left, click the share button (a person with a +).',
      'Tick "Public Calendar" and click "Copy Link".',
      'Paste the link below (it starts with webcal://).',
    ] },
  },
  {
    id: 'gmx', name: 'GMX',
    match: /^gmx\.(?:com|net|de|at|ch|co\.uk|fr|es|us|ca|cn|it|tw|ph|pt|sg|li|eu|info|biz|org)$/,
    mx: /(?:^|\.)gmx\.(?:net|com)$/,
    // gmx.com and its international domains use imap.gmx.com; the German ones imap.gmx.net.
    imapFor: (domain) => ({ host: /^gmx\.(?:net|de|at|ch|li)$/.test(domain) ? 'imap.gmx.net' : 'imap.gmx.com', port: 993, security: 'tls' }),
    imap: { host: 'imap.gmx.com', port: 993, security: 'tls' }, username: 'email',
    appPassword: { url: 'https://support.gmx.com/pop-imap/toggle.html', button: 'Open the GMX help page', required: false, twoStep: true },
    steps: [
      'Sign in to GMX in your browser.',
      'Open Settings (the gear), choose "POP3 & IMAP" and tick "Enable access to this account via POP3 and IMAP". Click Save.',
      'If you use two-factor authentication with GMX: open "Security options", then "Application-specific passwords", make one called OpenDash and paste it below.',
      'If you do not use two-factor authentication, type your normal GMX password below.',
    ],
    tips: ['GMX switches IMAP access off again when it has not been used for a long time. If OpenDash stops reading your mail, tick it again.'],
    webmail: 'https://www.gmx.com/',
    calendar: { ics: false, text: 'GMX calendars cannot be shared as a live link, so this step is not available for GMX.' },
  },
  {
    id: 'zoho', name: 'Zoho Mail',
    match: /^(?:zoho\.(?:com|eu|in|com\.au|jp)|zohomail\.(?:com|eu|in|com\.au|jp))$/,
    mx: /(?:^|\.)zoho(?:mail)?\.(?:com|eu|in|com\.au|jp)$/,
    // Zoho keeps each account in one data centre; the domain says which.
    imapFor: (domain, viaMx) => {
      const dc = /\.eu$/.test(domain) ? 'eu' : /\.in$/.test(domain) ? 'in' : /\.com\.au$/.test(domain) ? 'com.au' : /\.jp$/.test(domain) ? 'jp' : 'com';
      return { host: `${viaMx ? 'imappro' : 'imap'}.zoho.${dc}`, port: 993, security: 'tls' };
    },
    accountsFor: (domain) => `https://accounts.zoho.${/\.eu$/.test(domain) ? 'eu' : /\.in$/.test(domain) ? 'in' : /\.com\.au$/.test(domain) ? 'com.au' : /\.jp$/.test(domain) ? 'jp' : 'com'}/home#security/app_password`,
    imap: { host: 'imap.zoho.com', port: 993, security: 'tls' }, username: 'email',
    appPassword: { url: 'https://accounts.zoho.com/home#security/app_password', button: 'Open Zoho app passwords', required: false, twoStep: true },
    steps: [
      'Sign in to Zoho Mail. Open Settings, then "Mail Accounts", click your address, tick "IMAP Access" and save.',
      'If two-factor authentication is on: click "Open Zoho app passwords" below, click "Generate New Password", name it OpenDash and paste it below.',
      'If two-factor authentication is off, type your normal Zoho password below.',
    ],
    tips: ['Zoho’s free plan may not include IMAP. If the test says IMAP is off, check your plan in Zoho.'],
    webmail: 'https://mail.zoho.com/',
    calendar: { ics: true, url: 'https://calendar.zoho.com/', button: 'Open Zoho Calendar', steps: [
      'Click "Open Zoho Calendar" below and sign in.',
      'Open Settings, then "My Calendars", and click your calendar.',
      'Find the private address in iCal format (under Export or Subscribe) and copy it.',
      'Paste the link below.',
    ] },
  },
  {
    id: 'fastmail', name: 'Fastmail',
    match: /^(?:fastmail\.(?:com|fm|net|org|to|us|cn|co\.uk|de|es|in|jp|mx|se|tw|uk)|messagingengine\.com|sent\.(?:com|as|at)|mm\.st|myfastmail\.com|123mail\.org|eml\.cc|fmail\.co\.uk|warpmail\.net|xsmail\.com|ftml\.net|imap\.cc|fastem\.com|fastimap\.com|mailbolt\.com|mailcan\.com|rushpost\.com|speedymail\.org|veryfast\.biz)$/,
    mx: /(?:^|\.)messagingengine\.com$/,
    imap: { host: 'imap.fastmail.com', port: 993, security: 'tls' }, username: 'email',
    appPassword: { url: 'https://app.fastmail.com/settings/security', button: 'Open Fastmail Privacy & Security', required: true },
    steps: [
      'Click "Open Fastmail Privacy & Security" below and sign in.',
      'Under app passwords, click "Manage", then "New app password".',
      'Choose access to Mail (IMAP), name it OpenDash and click Generate.',
      'Fastmail shows a password once. Copy it and paste it below.',
    ],
    tips: ['Fastmail’s Basic plan does not include IMAP. If the test says IMAP is off, check your plan in Fastmail.'],
    webmail: 'https://app.fastmail.com/mail/Inbox/',
    calendar: { ics: true, url: 'https://app.fastmail.com/settings/calendars', button: 'Open Fastmail calendar settings', steps: [
      'Click "Open Fastmail calendar settings" below and sign in.',
      'Click your calendar, then open its sharing settings and turn on a public (read-only) link.',
      'Copy the iCalendar (.ics) link.',
      'Paste the link below.',
    ] },
  },
  {
    id: 'proton', name: 'Proton Mail',
    match: /^(?:proton\.me|protonmail\.(?:com|ch)|pm\.me)$/,
    mx: /(?:^|\.)protonmail\.ch$/,
    imap: { host: '127.0.0.1', port: 1143, security: 'starttls' }, username: 'bridge',
    bridge: true,
    appPassword: { url: 'https://proton.me/mail/bridge', button: 'Get Proton Mail Bridge', required: true },
    steps: [
      'Proton keeps your email encrypted, so other apps can only read it through Proton Mail Bridge, a free app from Proton. Bridge needs a paid Proton plan.',
      'Click "Get Proton Mail Bridge" below, install it on this computer and sign in to Proton in Bridge.',
      'In Bridge, click your account. It shows an IMAP username and a password that Bridge made (not your Proton password).',
      'Type that username and password below. Leave Bridge running: OpenDash reads your mail through it.',
    ],
    tips: ['Bridge makes its own security certificate. OpenDash checks every mail server’s certificate and cannot accept Bridge’s yet, so Proton Mail may not connect until a later version of OpenDash.'],
    webmail: 'https://mail.proton.me/',
    calendar: { ics: true, url: 'https://calendar.proton.me/', button: 'Open Proton Calendar', steps: [
      'Click "Open Proton Calendar" below and sign in.',
      'Open Settings, then Calendars, and click "Share" next to your calendar.',
      'Choose "Share with anyone", create a link that shows event details, and copy it.',
      'Paste the link below.',
    ] },
  },
]);

const OTHER_STEPS = Object.freeze([
  'Look on your email provider’s website for "app passwords" (sometimes "application-specific passwords" or "device passwords") and make one called OpenDash.',
  'If your provider has no app passwords, your normal email password may work. Some providers ask you to switch on "IMAP access" in their settings first.',
  'Your provider’s help pages list its IMAP server (often imap.<your domain>) and port (usually 993).',
]);
const OTHER_CALENDAR = Object.freeze({ ics: true, steps: [
  'Open your calendar on your provider’s website.',
  'Look in the calendar’s settings for "Share", "Publish" or "Export" and copy a link that starts with webcal:// or https:// (it often ends in .ics).',
  'Paste the link below.',
] });

const pub = (p, domain, { viaMx = false } = {}) => ({
  kind: 'known', id: p.id, name: p.name,
  imap: { ...(p.imapFor ? p.imapFor(domain, viaMx) : p.imap) },
  username: p.username, bridge: !!p.bridge,
  appPassword: { ...p.appPassword, ...(p.accountsFor ? { url: p.accountsFor(domain) } : {}) },
  intro: APP_PASSWORD_INTRO, steps: [...p.steps], tips: [...(p.tips || [])],
  webmail: p.webmail,
  calendar: p.calendar.ics ? { ics: true, ...(p.calendar.name ? { name: p.calendar.name } : {}), url: p.calendar.url, button: p.calendar.button, steps: [...p.calendar.steps], note: ICS_NOTE } : { ics: false, text: p.calendar.text },
});

/** Outlook.com calendar through a published ICS link (the mail itself waits for the Microsoft sign-in). */
const OUTLOOK_CALENDAR = Object.freeze({ ics: true, name: 'Outlook calendar', url: 'https://outlook.live.com/calendar/0/options/calendar/SharedCalendars', button: 'Open Outlook calendar settings', steps: [
  'Click "Open Outlook calendar settings" below and sign in (Settings > Calendar > Shared calendars).',
  'Under "Publish a calendar", choose your calendar and "Can view all details", then click Publish.',
  'Copy the ICS link that appears.',
  'Paste the link below.',
] });
const ON = Object.freeze({ google: true, microsoft: true });
const oneClickOf = (o) => ({ google: !(o && o.google === false), microsoft: !(o && o.microsoft === false) });
function microsoftSoon(e, work = false) {
  return {
    kind: 'soon', provider: 'microsoft', email: e,
    title: work ? 'Microsoft 365 is coming soon' : 'Outlook and Hotmail are coming soon',
    message: work
      ? 'This address uses Microsoft 365. Microsoft does not let apps read its mail with an app password, so it needs the one-click Microsoft sign-in, which is not switched on in this copy of OpenDash yet.'
      : 'Microsoft no longer lets apps read Outlook.com, Hotmail or Live mail with an app password, so these addresses need the one-click Microsoft sign-in, which is not switched on in this copy of OpenDash yet. Your Outlook calendar can come in now through a published calendar link.',
    calendar: { ...OUTLOOK_CALENDAR, steps: [...OUTLOOK_CALENDAR.steps], note: ICS_NOTE },
  };
}

/**
 * The service for one address. Never throws. opts.oneClick {google, microsoft}:
 * which one-click sign-ins this copy has switched on (default: both).
 */
export function lookupProvider(email, { oneClick = ON } = {}) {
  const e = cleanEmail(email);
  if (!e) return { kind: 'invalid', message: 'Type your whole email address, for example name@yahoo.com.' };
  const domain = emailDomain(e);
  const one = oneClickOf(oneClick);
  if (GOOGLE.test(domain) && one.google) return { kind: 'redirect', provider: 'google', email: e, message: 'This is a Gmail address. Gmail connects with one click and no password: use "Add Google account" instead.' };
  if (MICROSOFT.test(domain)) return one.microsoft ? { kind: 'redirect', provider: 'microsoft', email: e, message: 'This is a Microsoft address. Outlook and Hotmail connect with one click and no password: use "Add Microsoft account" instead.' } : microsoftSoon(e);
  const p = IMAP_PROVIDERS.find((x) => x.match.test(domain));
  if (p) return { ...pub(p, domain), email: e, domain };
  return otherProvider(e, domain);
}
function otherProvider(e, domain) {
  return {
    kind: 'other', id: 'other', name: domain, email: e, domain,
    imap: { host: 'imap.' + domain, port: 993, security: 'tls' }, username: 'email', guessed: true,
    intro: APP_PASSWORD_INTRO, steps: [...OTHER_STEPS], tips: [],
    calendar: { ics: true, steps: [...OTHER_CALENDAR.steps], note: ICS_NOTE },
  };
}

/**
 * The service behind the user's own domain, from its MX host names (looked
 * up by the runtime). Google Workspace and Microsoft 365 go to their one-click
 * buttons; Fastmail, iCloud, Zoho... become known. Unknown: null.
 */
export function providerFromMx(email, mxHosts = [], { oneClick = ON } = {}) {
  const e = cleanEmail(email);
  if (!e) return null;
  const hosts = (Array.isArray(mxHosts) ? mxHosts : []).map((h) => String(h || '').toLowerCase().replace(/\.$/, '')).filter(Boolean).slice(0, 10);
  if (!hosts.length) return null;
  const one = oneClickOf(oneClick);
  if (hosts.some((h) => /(?:^|\.)(?:google\.com|googlemail\.com)$/.test(h)) && one.google) return { kind: 'redirect', provider: 'google', email: e, message: 'This address uses Google (Gmail). It connects with one click and no password: use "Add Google account" instead.' };
  if (hosts.some((h) => /\.mail\.protection\.outlook\.com$|(?:^|\.)outlook\.com$/.test(h))) return one.microsoft ? { kind: 'redirect', provider: 'microsoft', email: e, message: 'This address uses Microsoft 365. It connects with one click and no password: use "Add Microsoft account" instead.' } : microsoftSoon(e, true);
  const domain = emailDomain(e);
  for (const p of IMAP_PROVIDERS) {
    const hit = hosts.find((h) => p.mx.test(h));
    if (!hit) continue;
    // A Zoho or GMX address on the user's own domain: the data centre comes from the MX host.
    const base = p.id === 'zoho' ? hit.replace(/^.*?(zoho(?:mail)?\.[a-z.]+)$/, '$1') : p.id === 'gmx' ? hit.replace(/^.*?(gmx\.[a-z]+)$/, '$1') : domain;
    return { ...pub(p, base, { viaMx: true }), email: e, domain, viaMx: true };
  }
  return null;
}

/** Proton Mail Bridge and other servers on this computer. */
export const isLoopbackHost = (h) => /^(?:127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|::1|\[::1\])$/i.test(String(h || ''));

/** A server the user typed: host name or IP, port, security. -> {host, port, security} | {error} */
export function cleanServer({ host, port, security } = {}) {
  const h = String(host || '').trim().toLowerCase().replace(/\.$/, '');
  const okName = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(h);
  const okIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(h) && h.split('.').every((x) => Number(x) <= 255);
  if (!okName && !okIp && h !== 'localhost') return { error: 'Type the mail server name, for example imap.example.com.' };
  const sec = security === 'starttls' ? 'starttls' : 'tls';
  const p = port == null || port === '' ? (sec === 'tls' ? 993 : 143) : Number(port);
  if (!Number.isInteger(p) || p < 1 || p > 65535) return { error: 'The port is a number, usually 993.' };
  return { host: h, port: p, security: sec };
}

/** IMAP user names to try for an address (iCloud: the whole address, then the part before @). */
export function usernamesFor(email, style = 'email', typed) {
  if (typed) return [String(typed)];
  const e = cleanEmail(email);
  if (style === 'email-then-local') return [e, e.slice(0, e.indexOf('@'))];
  return [e];
}
