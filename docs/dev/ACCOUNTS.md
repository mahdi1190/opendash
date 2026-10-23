# Accounts: the multi-account contract

OpenDash has **no OpenDash account** and no "log in with Google/Microsoft" to
the dashboard itself. Instead the Connections tab lists the user's mail and
calendar **accounts**, any number side by side (a personal Hotmail, a personal
Gmail, a work Outlook on a Microsoft 365 tenant...), each added with one
button:

    + Add Microsoft account     + Add Google account     + Other email
                                                          Add a calendar link

This file is the contract every provider (Microsoft, Google, IMAP) and
every client (the page today; a mobile, desktop or web app later) builds on.

Code:

| File | What | Platform |
|---|---|---|
| `lib/accounts/core.mjs` | the record, validation, ids, PKCE/state, redirect adapters, token vault, the service | **pure JS** (no `node:` imports) |
| `lib/accounts/microsoft.mjs` | the Microsoft provider (Graph mail + calendar) | **pure JS** |
| `lib/accounts/google.mjs` | the Google provider (built against this contract) | **pure JS** |
| `lib/accounts/shipped.mjs` | the shipped (build-time) client IDs | pure JS |
| `lib/accounts/imap.mjs` | the IMAP provider ("+ Other email": app password, read-only mail) | **pure JS** |
| `lib/accounts/imap-wire.mjs` | the IMAP client: framing, parser, read-only command allowlist, limits | **pure JS** |
| `lib/accounts/mime.mjs` | MIME preview decoding (QP, base64, charsets, RFC 2047, BODYSTRUCTURE) | **pure JS** |
| `lib/accounts/imap-providers.mjs` | the provider table: servers, app-password steps, calendar-link steps | **pure JS** |
| `lib/imap-transport.mjs` | the IMAP transport adapter (node:tls, strict certificates) | Node |
| `lib/accounts-imap.mjs` | the IMAP provider config and the MX lookup | Node |
| `server/routes/accounts-imap.mjs` | `/api/accounts/imap/*` (lookup, connect) | Node |
| `src/app/56-accounts-imap*.js` | the "+ Other email" guided drawer | page |
| `lib/accounts.mjs` | the Node binding: registry file, secret store, device id, migration, sources | Node |
| `server/routes/accounts.mjs` | `/api/accounts` | Node |
| `src/app/56-accounts*.js` | the Connections tab account list | page |

## 1. Portability rules (native apps later)

OpenDash must later run as an iOS/Android app (Capacitor or React Native), a
desktop app (Tauri or Electron) and a PWA. So:

1. **Provider logic is pure, platform-agnostic JS**: building auth URLs, PKCE,
   token exchange and refresh parsing, and parsing Graph/Gmail responses into
   OpenDash shapes. Files under `lib/accounts/` import nothing from `node:`
   and nothing from a file that does (`lib/fsutil.mjs`, `lib/calendar-jobkit.mjs`
   ... are off limits there). A test (`tests/accounts-core.test.mjs`) checks it.
2. **Everything platform-specific is an adapter** passed in:
   `fetch`, the **secret store**, the **registry store**, the **redirect**,
   the clock (`now`), the device id and a logger.
3. **Web Crypto only**: `globalThis.crypto.getRandomValues` and
   `crypto.subtle.digest('SHA-256')` for ids, state, PKCE and hashes. Never
   `node:crypto` in core code.
4. **PKCE S256 always**, for every provider and every redirect kind. The core
   never needs a client secret for Microsoft (public native client). Google
   desktop clients still need one in practice; it is a provider config value,
   injected at build time, never typed by the user.
5. **No raw file access in provider code.** Tokens go through the secret
   store; the account list through the registry store.

## 2. The account record

Kept in the **registry** (Node: `<data>/accounts.json`, in the data folder, so
it travels with the data and will sync between computers). **No secrets in
it, ever**: no tokens, no codes, no client secrets.

```js
{
  id: 'acc_3f9c0d21a4b7e5c8',        // random, 'acc_' + 16 hex; never reused
  provider: 'microsoft' | 'google' | 'imap',
  email: 'name@example.com',          // lower case
  displayName: 'Name Surname',        // from the provider, may be ''
  kind: 'personal' | 'work',
  tenantId: '<directory GUID>',       // optional: Microsoft work/school directory
  scopes: ['User.Read', 'Mail.Read', 'Calendars.Read'],   // granted (or requested while waiting)
  features: { mail: true, calendar: true },               // the user's on/off per feature
  status: 'connected' | 'needs-sign-in' | 'needs-admin-approval' | 'paused',
  lastSync: '2026-10-23T15:04:05.000Z' | null,            // last successful read
  error: { code, message, at } | null,                    // last problem, plain language
  fetcher: '<hostId>' | null,         // the computer that reads this account (section 7)
  createdAt, updatedAt,               // ISO
  legacy: true,                       // optional: made from the old single-account files
  server: { service, host, port, security },   // imap only: 'yahoo'|'icloud'|...|'other', the IMAP server
                                                // ('tls' = IMAPS, 'starttls'); never the password
}
```

`validateAccount(input)` (core) returns `{account, errors}`; unknown fields are
dropped. `publicAccount(account, here)` is what the page and apps see: the
record plus

```js
here: { fetcher: boolean, signedIn: boolean },   // this device
statusText: 'Connected' | 'Sign in again' | 'Waiting for your organisation' | 'Paused' | 'Checked on your other computer',
syncedText: 'synced 4 min ago' | 'not synced yet',
approval?: { consentUrl, mailto, tenant }        // only while needs-admin-approval
```

Statuses, in plain language:

| status | shown as | meaning |
|---|---|---|
| `connected` | Connected | tokens work; mail/calendar are read on the fetcher |
| `needs-sign-in` | Sign in again | the provider refused the saved sign-in (revoked, password change, expired) |
| `needs-admin-approval` | Waiting for your organisation | a work/school directory blocks user consent; an admin must approve once |
| `paused` | Paused | the user paused it: nothing is read; what was already read stays visible |

Per-feature data (mail, calendar) lives in the usual **sources** (`<data>/sources.json`):
every account owns up to one `email` and one `calendar` source with
`kind: <provider>` and `account: <account id>`. `features.mail` mirrors the email
source's `enabled`, `features.calendar` the calendar source's (switching the source on
or off in the source list changes the feature too). Snapshots stay
where they always were (`<data>/inbox/sources/<sourceId>.json`,
`<data>/calendar/sources/<sourceId>.json`): normal, syncable data.

## 3. Secrets: the secret store

```js
SecretStore = {
  get(key)          -> Promise<object | null>
  set(key, value)   -> Promise<void>
  delete(key)       -> Promise<void>
  lock?(key, fn)    -> Promise<T>   // optional cross-process exclusive section (lib/secret-store.mjs)
}
```

Keys used by accounts: `accounts/<accountId>`. The value is the provider's
**token document** (provider-private shape; Microsoft:
`{provider, clientId, authority, access_token, refresh_token, expires_at, scope, tenantId}`).

- Node: `secretStore(dataDir)` from `lib/secret-store.mjs` (its file backend
  keeps `secretsDir(dataDir)/accounts/<id>.json`, lib/devicedir.mjs: a
  per-computer folder outside the data folder), written atomically, mode 0600;
  its `lock(key, fn)` is the cross-process section. An OS keychain backend can
  replace the files without touching accounts. **Tokens never enter the data
  folder, a response, or a log.**
- Mobile: Keychain / Keystore (e.g. a secure-storage plugin). Desktop app: the
  OS keychain. PWA: IndexedDB with a non-extractable key (weakest; document it).

The **token vault** (core) wraps the store: `vault.read(id)`, `vault.write(id, doc)`,
`vault.remove(id)` and `vault.refresh(id, fn)`. `refresh` runs `fn(oldDoc)` once
at a time **per account** (an in-process queue, plus `withLock` when the store
has it); concurrent callers share the one result, and the document `fn` returns
replaces the old one (refresh-token rotation). Two accounts never share a queue,
a file or a token.

## 4. Redirects: the redirect adapter

```js
Redirect = { kind, uri(), matches(url) }
loopbackRedirect({ port, path = '/api/accounts/callback', host = 'localhost' })
customSchemeRedirect({ scheme = 'com.opendash.app', path = '/oauth2redirect' })
webRedirect({ origin, path = '/oauth/callback' })
```

| kind | used by | redirect URI | provider registration |
|---|---|---|---|
| `loopback` | the local server (today) | `http://localhost:<port>/api/accounts/callback` | Microsoft: "Mobile and desktop applications", `http://localhost/api/accounts/callback` (Microsoft ignores the port on localhost) |
| `custom-scheme` | iOS/Android apps (universal/app links later) | `com.opendash.app:/oauth2redirect` | Microsoft: "Mobile and desktop applications" custom URI |
| `web` | PWA / hosted page | `https://<origin>/oauth/callback` | Microsoft: "Single-page application" (refresh tokens live 24 h there) |

The app (or the browser) brings the returned `?code=&state=` back to
`accounts.callback(params)`: the server's GET callback page for loopback, a
`POST /api/accounts/callback` (or the embedded core) for the other kinds.

## 5. Sign-in state

`createPendingStore({ now, ttlMs = 600000, max = 20 })`: `begin(data) -> state`
(32 random bytes, base64url), `take(state) -> data | null`. Single-use, ten
minutes, at most twenty pending. The PKCE verifier lives only here (memory).

## 6. Provider interface

A provider module exports `create<Name>Provider(ctx)`:

```js
ctx = {
  fetch,            // (url, init) -> Response-like {ok, status, text()}
  now,              // () -> ms
  redirect,         // Redirect adapter
  vault,            // token vault (section 3)
  pending,          // pending sign-ins (section 5)
  config,           // { clientId() -> string|null, ... } provider settings
  accountIdFor,     // async ({provider, email, tenantId}) -> existing id or a new one
  account,          // async (id) -> the account record (read-only) or null
  log,              // (level, message): never tokens, never mail content
}
provider = {
  id: 'microsoft',
  configured()                          -> Promise<{ ok, reason? }>
  beginSignIn({ loginHint, kind, accountId?, features? }) -> Promise<{ url, state, kind }>
  handleCallback(params, pending)       -> Promise<Account>       // saves the tokens itself (vault.write)
  accessToken(accountId)                -> Promise<string>        // refresh serialized + rotated (vault.refresh)
  fetchMail(accountId, { source, days, todayIso })        -> Promise<{ accounts, messages, count, warnings }>
  fetchCalendar(accountId, { source, from, to, timeZone }) -> Promise<{ calendars, events, count, warnings }>
  disconnect(accountId)                 -> Promise<void>          // deletes this device's tokens
  approvalHelp?(account)                -> { consentUrl, mailto, tenant }   // admin consent (Microsoft)
}
```

- `handleCallback` returns an **Account** (section 2) without secrets; the core
  merges it into the registry (keeping the user's `features`, `fetcher` and
  `createdAt` when the account already exists).
- Shapes returned by `fetchMail`/`fetchCalendar` are exactly the existing
  snapshot shapes (`lib/inbox-sources.mjs`, `lib/calendar-sources.mjs`):
  messages `{id, messageId, threadId, sourceId, accountId, subject, from, sender,
  date, snippet, unread, important, count, link}`, events `{id, summary, start,
  end, calendarId: '<sourceId>/<calendar>', status, iCalUID, location, link,
  attendees}`. Never bodies or attachments.
- Errors are `AccountError` (`core.fail(code, message, status)`); `message` is
  plain language for the user; provider detail (error descriptions, ids) is
  never in it. Codes:

| code | status set by the core | meaning |
|---|---|---|
| `OAUTH_STATE` | - | the sign-in expired or was not started here |
| `OAUTH_CANCELLED` | - | the user cancelled |
| `NEEDS_SIGN_IN` | needs-sign-in | refresh refused (invalid_grant, 401) |
| `NEEDS_ADMIN_APPROVAL` | needs-admin-approval | consent blocked (AADSTS65001, 90094, 90095 ..., Graph 403 on work accounts); `err.account` carries `{email, kind:'work', tenantId?}` so a record exists to retry |
| `DEVICE_NOT_ALLOWED` | - (error only) | the organisation only allows its own devices (AADSTS53000/53003) |
| `WRONG_ACCOUNT_TYPE` | - | a personal address went to the work sign-in or the reverse; `err.retryKind` says which to use |
| `MISSING_PERMISSIONS` | - | the grant lacks a needed scope (personal accounts) |
| `NOT_CONFIGURED` | - | no client ID in this copy of OpenDash |
| `PROVIDER_NETWORK`, `PROVIDER_RESPONSE`, `PROVIDER_LIMIT`, `PROVIDER_BUSY` | - (error only) | could not reach / unreadable / too big / 429 |
| `PAUSED`, `NOT_FETCHER`, `FEATURE_OFF`, `UNKNOWN_ACCOUNT`, `BAD_REQUEST` | - | refused by the core before any request |

### Adding a provider (Google, IMAP)

1. Write `lib/accounts/<name>.mjs` (pure, see section 1) exporting
   `create<Name>Provider(ctx)` (this interface) and, optionally,
   `<name>Config({ store }) -> config` (e.g. `{ clientId: async () => ..., clientSecret: async () => ... }`,
   read from `SHIPPED` in `lib/accounts/shipped.mjs` and/or the secret store).
   `lib/accounts.mjs` loads `lib/accounts/google.mjs` and `lib/accounts/imap.mjs`
   by themselves when the files exist (or call `registerProvider(name, factory, config)`).
2. `configured()` decides whether the page's button is live
   (`GET /api/accounts` -> `providers.<name>.available`). Until then the page
   shows "Coming soon" for it.
3. Use `ctx.redirect.uri()` as the redirect URI (loopback today:
   `http://localhost:<port>/api/accounts/callback`, which Google's desktop
   loopback rules accept), `ctx.pending.begin({provider: '<name>', ...})` for the
   state (store the PKCE verifier there), `ctx.vault` for tokens, and return the
   snapshot shapes above. The core adds the record, the sources
   (`kind: '<name>'`, `account: <id>`), the fetcher, pause/remove and the UI.
4. Give the page a brand mark if you like (`accBrand` in `src/app/56-accounts-logic.js`:
   google uses `gmail`).

### Microsoft specifics (`lib/accounts/microsoft.mjs`)

- **Shipped client ID**: `SHIPPED.microsoftClientId` in `lib/accounts/shipped.mjs`,
  the placeholder `OPENDASH_MICROSOFT_CLIENT_ID` until a release build writes the
  real GUID (or `OPENDASH_MICROSOFT_CLIENT_ID` in the environment / `<data>/.env`).
  A user's own app ID (Connections > Add Microsoft account > Advanced) wins; it is
  kept on this computer (`secretsDir/microsoft-client.json`, the old file).
- **Authority from the typed address**: personal domains (hotmail.*, outlook.*,
  live.*, msn.com, windowslive.com, passport.com, and addresses at public mail
  providers such as gmail.com used as a Microsoft account) go to `/consumers`;
  anything else to `/organizations`. Always with `login_hint`. The kind is then
  confirmed from the id token's `tid` (`9188040d-6c67-4c5b-b112-36a304b66dad` =
  personal). A wrong guess (AADSTS50020 / 500200 / 50034...) is `WRONG_ACCOUNT_TYPE`
  with `retryKind`.
- **Scopes per purpose**: base `openid profile offline_access User.Read`, plus
  `Mail.Read` for mail and `Calendars.Read` for calendar. `Files.ReadWrite.AppFolder`
  is reserved for sync storage and **not requested** until the user chooses it.
- **Admin consent**: `approvalHelp(account)` gives
  `https://login.microsoftonline.com/<tenant>/adminconsent?client_id=<id>`
  (tenant = directory id, else the email's domain) and a `mailto:` with a
  prefilled, plain message to the IT admin.
- Safety rules kept from the single-account module: Graph is GET-only, only
  `https://graph.microsoft.com/v1.0/me...`, `redirect: 'error'`, paging links to
  another host or path are refused before any token is sent, 5 MB response
  limit, no message bodies or attachments, calendar budget of 40 requests /
  60 s / 1,000 events.

### IMAP specifics ("+ Other email": `lib/accounts/imap.mjs`)

Yahoo, AOL, iCloud (icloud.com, me.com, mac.com), GMX, Zoho, Fastmail, Proton
(through Proton Mail Bridge) and any IMAP mailbox, signed in with an **app
password**, mail only, read-only.

- **No browser sign-in**: the provider has `connect(input)` instead of
  `beginSignIn`/`handleCallback`; the core's `accounts.connect({provider:'imap', ...})`
  (section 8) calls it and merges the record like a callback. `connect` **tests
  first** (connect, sign in, EXAMINE INBOX, LOGOUT) and only then writes
  `{provider:'imap', username, password, host, port, security, service}` to the
  vault (`accounts/<id>`). The record carries `server` (no secret) and
  `features: {mail: true, calendar: false}`: IMAP has no calendar; the page offers
  "Add a calendar link" (an `ical` source) with the provider's own steps.
- **The provider table** (`lib/accounts/imap-providers.mjs`, pure):
  `lookupProvider(email)` -> `{kind: 'known'|'other'|'redirect'|'invalid', id, name,
  imap: {host, port, security}, username, appPassword: {url, button, required, twoStep?},
  intro, steps, tips, webmail, calendar: {ics, steps, url, button, note} | {ics:false, text}}`.
  Gmail / Googlemail and Hotmail / Outlook / Live / MSN addresses are `redirect`
  (to the one-click buttons; `connect` refuses them with `USE_ONE_CLICK` +
  `retryProvider`). The Node binding adds `providerFromMx`: for an unknown domain
  the MX records (3 s timeout) recognise Google Workspace / Microsoft 365
  (redirect) and Fastmail, iCloud+, Zoho (imappro.*), Yahoo, GMX on the user's own
  domain. Anything else is `other` with a guessed `imap.<domain>:993`.
- **User names**: the whole address; iCloud tries the whole address, then the part
  before `@`; Proton Bridge shows its own (the form asks for it). App passwords of
  Yahoo, AOL, iCloud and Fastmail never contain spaces, so pasted spaces are removed.
- **The client** (`lib/accounts/imap-wire.mjs`, pure; the socket is a transport
  adapter `openTransport({host, port, tls}) -> {secure, write, onData, onClose, startTls, close}`,
  `lib/imap-transport.mjs` on Node): CAPABILITY, STARTTLS, LOGIN or AUTHENTICATE
  PLAIN (SASL-IR when offered), EXAMINE (never SELECT), UID SEARCH SINCE, UID FETCH,
  NOOP and LOGOUT are the **only** commands it can send; FETCH items must be
  `BODY.PEEK[...]` (never `BODY[` / `RFC822`, which mark mail read). No STORE, COPY,
  EXPUNGE, APPEND; no SMTP. Literals (`{n}`, `{n+}`, `~{n}`) both ways; caps of 1 MB
  per line, 4 MB per literal, 8 MB per response, 32 MB per session; 20 s idle and
  120 s per session. A password is only sent once `transport.secure` (TLS up and the
  certificate verified: `rejectUnauthorized` always, TLS 1.2+, host name checked).
  STARTTLS: data sent after the server's OK and before the handshake is refused;
  capabilities are asked again after TLS.
- **Reading mail**: UID SEARCH SINCE (the last `days`, at most 30), the newest 300,
  `UID FETCH (UID FLAGS INTERNALDATE ENVELOPE BODYSTRUCTURE)`, then the text part
  BODYSTRUCTURE picks (text/plain, else text/html; never an attachment) with
  `BODY.PEEK[<part>]<0.1200>` (HTML `<0.6000>`), one FETCH per part number; a message
  without a usable BODYSTRUCTURE falls back to `BODY.PEEK[HEADER.FIELDS (CONTENT-TYPE
  CONTENT-TRANSFER-ENCODING)]` + `BODY.PEEK[TEXT]<0.3000>`. Decoding
  (`lib/accounts/mime.mjs`): quoted-printable, base64 (a cut-off end keeps the bytes it
  holds), charsets (utf-8, us-ascii, iso-8859-1 / windows-1252 built in, others by
  TextDecoder), RFC 2047 subjects and names. Mapped to the same message shape as
  Microsoft: `id: 'im' + sha256(sourceId|uidValidity|uid)[0..24]`, `unread` = no
  `\Seen`, `important` = `\Flagged`, `link` = the provider's webmail (https only).
- **Errors** (`classifyImapError`, plain words, never the server's text):

| code | when |
|---|---|
| `WRONG_PASSWORD` | sign-in refused at connect (most often the normal password instead of an app password) |
| `APP_PASSWORD_NEEDED` | the server says an app / application-specific password is required |
| `TWO_STEP_NEEDED` | the server says two-step verification must be on first |
| `IMAP_DISABLED` | IMAP access is off (GMX, Zoho, plans without IMAP); provider-specific help |
| `IMAP_UNREACHABLE` | DNS, refused, reset (`BRIDGE_NOT_RUNNING` for Proton Bridge) |
| `IMAP_NOT_TRUSTED` | the certificate did not verify: nothing was sent |
| `IMAP_NOT_SECURE` | no TLS / no STARTTLS / LOGINDISABLED: nothing was sent |
| `NEEDS_SIGN_IN` | a saved app password stopped working (status `needs-sign-in`: "Paste a new app password") |
| `USE_ONE_CLICK` | a Gmail / Outlook address: `retryProvider` says which button |
| `PROVIDER_BUSY`, `PROVIDER_NETWORK`, `PROVIDER_LIMIT`, `PROVIDER_RESPONSE`, `PROVIDER_REFUSED` | busy, timeout, too big, unreadable, refused |

- **Weak points**: Proton Mail Bridge presents its own self-signed certificate,
  which the strict check refuses (`IMAP_NOT_TRUSTED`); trusting Bridge's exported
  certificate is not built. Fastmail Basic and Zoho Mail Free have no IMAP. GMX
  switches IMAP off after long disuse. Gmail and Outlook.com are sent to the
  one-click OAuth buttons rather than app passwords. Google Workspace / Microsoft 365
  on the user's own domain are only recognised when the MX lookup answers. The app
  password is kept like every other secret (lib/secret-store.mjs: a 0600 file in the
  per-computer folder today, an OS keychain later).

## 7. The fetcher ("main computer")

Each account has one **fetcher**: the device that reads it (default: the device
where it was connected; `fetcher` = that device's host id from
`lib/devicedir.mjs ensureHostId`). Only the fetcher runs its mail and calendar
jobs; other computers show what the fetcher saved (snapshots are normal data)
and say "Checked on your other computer". `isFetcher(accountId)` answers for
this device (an account with no fetcher yet is claimed by the first device that
reads it). **"Fetch on this computer instead"** (`fetchHere(accountId)`) is a
placeholder until sync lands: it changes nothing and says so. Tokens never
travel: a second computer that should read an account signs in there.

## 8. The service (core)

```js
createAccounts({ registry, secrets, providers: { microsoft: createMicrosoftProvider, ... },
                 providerConfig: { microsoft: {...} }, redirect, fetch, now, deviceId, log, hooks })
  .list()                        -> [publicAccount]
  .get(id)                       -> account | null
  .begin({ provider, email, kind?, accountId?, features? }) -> { url, state, kind }
  .callback(params)              -> { account } | { adminConsent: true }
  .connect({ provider, ...input }) -> { account, isNew, inbox? }   // a provider without a browser sign-in (IMAP):
                                                                   // provider.connect(input) tests and saves; the core merges the record
  .pause(id) / .resume(id)       -> account
  .setFeatures(id, { mail?, calendar? }) -> account
  .remove(id)                    -> { removed: id }      // deletes this device's tokens and the record
  .isFetcher(id)                 -> Promise<boolean>
  .fetchHere(id)                 -> { ok: false, placeholder: true, message }
  .accessToken(id)
  .fetchMail(id, opts) / .fetchCalendar(id, opts)       // refuse PAUSED / NOT_FETCHER / FEATURE_OFF first
  .approvalHelp(id)              -> { consentUrl, mailto, tenant } | null
```

`registry` adapter: `{ read() -> {version:1, accounts:[]}, mutate(fn) -> result }`
(Node: `<data>/accounts.json` under its lock). `hooks.changed(event, account)`
lets the Node binding keep sources in step (`connected`, `features`, `removed`).

## 9. HTTP API (`/api/accounts`)

All routes keep the local router's checks: Host must be localhost (421), every
`/api/` request needs our own Origin / Sec-Fetch-Site (403), JSON bodies (415),
small body limits (413). Only the GET callback accepts a cross-site navigation
(the provider redirects the browser there); it is protected by the single-use
state and PKCE. A mobile or desktop client either embeds the core directly or
calls these routes on its local server.

| route | body / query | answer |
|---|---|---|
| `GET /api/accounts` | - | `{ accounts: [publicAccount], providers: { microsoft: {available, custom, builtIn, callback}, google: {available}, imap: {available, comingSoon} } }` (`microsoft.custom`: the user's own app is in use; `microsoft.callback`: the return address to register for it) |
| `POST /api/accounts/begin` | `{ provider, email, kind?, accountId?, features? }` | `{ url, kind }`: open `url` in the browser |
| `GET /api/accounts/begin?provider=&email=&kind=&accountId=` | - | `302` to the provider (the page opens this in a new tab, so no pop-up blocker) |
| `GET /api/accounts/callback?code=&state=` | - | an HTML page: connected / waiting for your organisation (with the approval link and email) / try again. Also at `/api/microsoft/callback` for app registrations made with the old instructions |
| `POST /api/accounts/callback` | `{ state, code?, error?, error_description? }` | `{ account }` (custom-scheme and web redirects) |
| `POST /api/accounts/pause` | `{ id, paused: true|false }` | `{ account }` |
| `POST /api/accounts/features` | `{ id, mail?, calendar? }` | `{ account }` |
| `POST /api/accounts/remove` | `{ id }` | `{ removed }` |
| `POST /api/accounts/sync` | `{ id }` | `{ account, results: [{feature, ok, count, error?}] }` (only on the fetcher) |
| `POST /api/accounts/fetch-here` | `{ id }` | `{ ok:false, placeholder:true, message }` |
| `GET /api/accounts/approval?id=` | - | `{ consentUrl, mailto, tenant }` |
| `POST /api/accounts/imap/lookup` | `{ email }` | `{ provider }`: `lookupProvider` plus the MX check (section 6, IMAP); nothing saved |
| `POST /api/accounts/imap/connect` | `{ email, password, username?, host?, port?, security?, accountId? }` | `{ account, inbox: {exists}, results }`: test, save the app password in this computer's secret store, add the account, read its inbox once. A refused sign-in is a 401 with a plain message and saves nothing |
| `PUT /api/accounts/microsoft-app` | `{ clientId }` (or `null` to use the built-in one) | `{ custom, available }` |

Errors are `{ error: '<plain message>', code }` with the HTTP status.

## 10. Migration from the single Microsoft connection

Before 2.15 there was one Microsoft connection: `secrets/microsoft-client.json`
(`{clientId}`, pasted by the user) and `secrets/microsoft-tokens.json`, plus at
most one `kind:'microsoft'` email source and one calendar source. On first use
(`lib/accounts.mjs migrateLegacyMicrosoft`, idempotent, also
`tools/migrations/090-accounts.mjs`):

1. the secret `microsoft-tokens` in this computer's secret store (lib/devicedir.mjs
   has already moved an old `<data>/secrets/` there at start-up; while another
   computer still has the folder open it waits, and so does this) becomes one
   account `acc_<hash of the Microsoft user id>` (so a re-run finds it), its
   tokens are written to `accounts/<id>` (authority `common`, its own client ID),
   `legacy: true`, fetcher = this computer, status `connected` (or `needs-sign-in`),
   features from the old sources' on/off, lastSync from theirs;
2. the existing Microsoft sources get `account: <id>` and keep their ids, so
   their snapshots (and every message id) stay as they were;
3. the old `microsoft-tokens` secret is deleted (the tokens live on in `accounts/<id>`);
4. a pasted client ID (`microsoft-client`) stays where it was and keeps working as
   the user's own app, marked `legacyRedirect` so new sign-ins with it use the
   return address it was registered with (`/api/microsoft/callback`).

## 11. Tests

Synthetic provider responses only, temp folders, no network:
`tests/accounts-core.test.mjs` (record, vault, PKCE, redirects, purity),
`tests/accounts-microsoft.test.mjs` (authority, consent, refresh, Graph parsing),
`tests/accounts-node.test.mjs` (registry file, secret files, migration, isolation),
`tests/accounts-routes.test.mjs` (routes and their checks),
`tests/accounts-ui.test.mjs` (the page's logic helpers),
`tests/imap-wire.test.mjs` (framing, parser, commands, allowlist, caps, purity),
`tests/imap-mime.test.mjs` (preview decoding), `tests/imap-providers.test.mjs`
(the provider table, MX), `tests/imap-client.test.mjs` (the client against
`tests/fixtures/imap-fake-server.mjs`, an in-process IMAP server on a random port,
plain or TLS with a throwaway in-memory certificate: sign-in, literals, chunking,
malformed and oversized answers, timeouts, strict certificates, STARTTLS injection),
`tests/accounts-imap.test.mjs` (the provider through the core and the Node binding:
the password only in the secret store, friendly errors, the Microsoft mail shape),
`tests/accounts-imap-routes.test.mjs` and `tests/accounts-imap-ui.test.mjs`.
