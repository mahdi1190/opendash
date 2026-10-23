# Google accounts (one click)

OpenDash reads Gmail and Google Calendar of any number of Google accounts,
read-only, straight from Google (no Claude in between). The contract is
[ACCOUNTS.md](ACCOUNTS.md) ("Google specifics"); the code is
`lib/accounts/google.mjs` (pure provider and the Google app setting),
`lib/accounts-google.mjs` (moving the old single connection) and
`src/app/56-accounts-google.js` (the card before Google's sign-in).

## How a sign-in works

1. *+ Add Google account*: the person types the address and ticks **Read your
   email** and/or **See your calendars**. The card explains Google's warning
   screen before the browser opens.
2. A new tab opens `GET /api/accounts/begin?provider=google&email=&features=`,
   which redirects to Google with PKCE S256, a single-use state, `login_hint`,
   `access_type=offline`, `prompt=consent` and only the ticked scopes
   (`openid email`, then `calendar.readonly`, then `gmail.readonly`).
3. Google shows "Google hasn't verified this app" (until the project is
   verified): *Advanced > Go to OpenDash (unsafe)*, then the consent screen,
   where each box can be unticked.
4. Google returns to `http://localhost:<port>/api/accounts/callback`; the code
   is exchanged (with the Desktop client's secret), the id token says who it is,
   the tokens go to this computer's secret store (`accounts/<id>`), and the
   first read fills the account's email and calendar snapshots.

## Read boundaries and storage

GET only, to `gmail.googleapis.com/gmail/v1/users/me/...` and
`www.googleapis.com/calendar/v3/...`; tokens are POSTed only to
`oauth2.googleapis.com/token` and `/revoke`. Mail: headers (Subject, From,
Date, Message-ID), labels and Google's snippet of the newest message per
thread; never a body or an attachment. Calendar: events of the calendars the
account can read; no descriptions. Tokens never leave the computer that made
them; the account list (`<data>/accounts.json`) holds no secret.

## Making it live (one-time, by the publisher)

1. At [console.cloud.google.com](https://console.cloud.google.com), with the
   publisher's OWN Google account (not an employer's Workspace), create a
   project, e.g. `OpenDash`.
2. **APIs & Services > Library**: enable the **Gmail API** and the **Google
   Calendar API**.
3. **Google Auth Platform > Branding**: app name `OpenDash`, a support email,
   a developer contact email. No logo (a logo makes Google ask for brand
   verification first). No authorised domain is needed for a loopback client.
4. **Audience**: user type **External**, then **Publish app** (status *In
   production*). Do not stay in *Testing*: there, refresh tokens of apps that
   ask for Gmail or Calendar stop working after 7 days and only listed test
   users (at most 100) can sign in. Unverified and in production, anyone can
   sign in after Google's warning, up to Google's lifetime cap of 100 users for
   an unverified app.
5. **Data access > Add or remove scopes**: `openid`, `.../auth/userinfo.email`,
   `.../auth/calendar.readonly`, `.../auth/gmail.readonly`. Nothing else (no
   Drive, no `gmail.modify`).
6. **Clients > Create client**: application type **Desktop app**, name e.g.
   `OpenDash desktop`. No redirect URI is entered: a Desktop client accepts
   `http://localhost:<any port>/<any path>`. Copy the **client ID** and the
   **client secret** (or download the JSON).
7. Use it:
   - on your own computer now: Connections > *+ Add Google account* >
     *Advanced: use your own Google app*, paste the JSON (kept on this computer
     only); or put `OPENDASH_GOOGLE_CLIENT_ID=...` and
     `OPENDASH_GOOGLE_CLIENT_SECRET=...` in `<data>/.env`;
   - in a release: write both values into `lib/accounts/shipped.mjs`
     (`googleClientId`, `googleClientSecret`) in the **release zip only**.
     Never commit them: Google's policy says client credentials do not belong
     in public repositories, and the privacy scan (`google-secret`) refuses
     them. Google treats a Desktop client's secret as not confidential, so a
     downloaded zip holding it is expected. (The release tools do not do this
     step yet.)
8. Google Workspace accounts: an administrator who blocks unconfigured apps
   allows the client ID once in the Admin console (Security > Access and data
   control > API controls > Manage third-party app access); OpenDash shows
   *Waiting for your organisation* with a prefilled email.

## Friends or the public: Google's review

| who | calendar only (`calendar.readonly`, sensitive) | with Gmail (`gmail.readonly`, restricted) |
|---|---|---|
| you and up to ~100 people | unverified is allowed (personal-use exception); everyone sees the warning; 100-user lifetime cap | the same |
| more than 100 / the public | Google verification: homepage, privacy policy on a verified domain, demo video, Search Console; about 3-5 business days; no security assessment | verification plus a yearly CASA security assessment by an approved lab (reported about $540-$1,800 a year at Tier 2), about 6 weeks, and Google's Limited Use rules (say in the privacy policy that snippets may go to Claude for the suggestions the person asks for, and never for training) |

Mobile apps later need their own iOS / Android OAuth clients (no secret,
return address `com.googleusercontent.apps.<client id prefix>:/oauth2redirect`);
the provider already sends no secret when the client has none.

## Validation

`node --test tests/accounts-google.test.mjs tests/accounts-google-node.test.mjs
tests/accounts-google-routes.test.mjs tests/accounts-google-ui.test.mjs` uses
temporary folders and synthetic Google responses only. A real consent screen,
granular consent, Workspace policy and token lifetimes need a real project and
are not covered.

Official references: [installed apps (loopback, PKCE)](https://developers.google.com/identity/protocols/oauth2/native-app),
[OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies),
[unverified apps](https://support.google.com/cloud/answer/7454865),
[Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes),
[restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
