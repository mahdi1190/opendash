# Microsoft accounts (one click)

OpenDash reads personal Outlook / Hotmail / Live and work or school Microsoft
365 mail and calendars directly, without Claude or a desktop mail app. Any
number of Microsoft accounts can be connected side by side; each is one
**account** of the multi-account system (docs/dev/ACCOUNTS.md). There is no
OpenDash account and no "log in with Microsoft" to the dashboard itself.

What the user does: Connections > **+ Add Microsoft account**, types their
email address, presses **Continue to Microsoft**, signs in on Microsoft's page
in a new tab, says yes, and comes back. No client ID, port or setup step.

Code: `lib/accounts/microsoft.mjs` (pure provider), `lib/accounts/core.mjs`,
`lib/accounts.mjs` (Node binding), `server/routes/accounts.mjs`,
`src/app/56-accounts*.js`. `lib/microsoft.mjs` and `src/app/56-microsoft.js`
only keep old names working.

## How a sign-in works

- **Shipped app**: OpenDash signs in as one public native client whose ID is
  built in (`lib/accounts/shipped.mjs`, placeholder `OPENDASH_MICROSOFT_CLIENT_ID`
  until a release writes the real GUID; the environment variable of the same
  name, e.g. in `<data>/.env`, also sets it). A user's own app ID (Settings > Advanced >
  *Your own sign-in apps* > *Advanced: use your own Microsoft app*) wins on that
  computer; with none of the three, *+ Add Microsoft account* is greyed out with
  "Coming soon" and switches on by itself once there is one; it is kept in the secret store under `microsoft-client`.
- **Authority from the address**: Hotmail / Outlook / Live / MSN addresses, and
  public mail addresses used as a Microsoft account (gmail.com ...), go to
  `/consumers`; any other domain goes to `/organizations`. Always with
  `login_hint`, so Microsoft opens on the right account. The id token's `tid`
  then settles personal vs work (`9188040d-6c67-4c5b-b112-36a304b66dad` =
  personal). A wrong guess (AADSTS50020, 500200, 50034, 9002331) shows "This
  looks like a personal account" with a *Try again as a personal account* button.
- **PKCE S256**, one-use state (ten minutes), no client secret, redirect
  `http://localhost:<port>/api/accounts/callback` (Microsoft ignores the port on
  localhost for native apps).
- **Scopes per purpose**: `openid profile offline_access User.Read`, plus
  `Mail.Read` when Mail is on and `Calendars.Read` when Calendar is on.
  `Files.ReadWrite.AppFolder` is reserved for sync storage and is requested only
  when the user chooses that (not yet). `Mail.ReadBasic` excludes body previews,
  so `Mail.Read` is needed even though OpenDash asks Graph for previews only.

## Work accounts and admin approval

Most work and school directories do not let a user approve an app that reads
mail (the managed default consent policy). OpenDash recognises this and shows
**"Your organisation needs to approve OpenDash once"** instead of an error:

- on the sign-in return (AADSTS65001, 90094, 90095, 900941, 90099, 650056,
  650052, 7000112, 50105, or `consent_required` for a work sign-in), on a token
  error carrying those codes, and on a Graph **403** for a work account;
- the account is kept as *Waiting for your organisation*, with **Try again**;
- **I am the admin: approve OpenDash** opens
  `https://login.microsoftonline.com/<tenant>/adminconsent?client_id=<id>&redirect_uri=<this computer's return address>`
  (tenant = the directory id when known, else the email's domain);
- **Email my IT team** opens a prefilled email (subject, what OpenDash reads,
  that it cannot send, change or delete, the approval link and the app ID);
- an admin who approves on this computer lands back on OpenDash's page
  "OpenDash is approved"; on another computer the last page may not load, which
  the email says is expected.

AADSTS53000 / 53003 (Conditional Access, compliant device required) show
"Your organisation only allows this account on its own computers".

## Read boundaries and storage

- Graph requests are GET-only, confined to `https://graph.microsoft.com/v1.0/me`.
  `redirect: 'error'`; redirects and paging links to other hosts or paths are
  refused before a token is sent; responses over 5 MB are refused.
- Mail reads the Inbox for recent dates: sender, subject, flags and body
  preview. Never message bodies or attachments; never sends or changes anything.
- Calendar uses calendarView (recurring instances included) and keeps all-day
  dates in their original time zone. Each update has a 40-request, 60-second
  budget and at most 1,000 events.
- Tokens per account: secret store key `accounts/<id>` on THIS computer
  (`secretsDir(dataDir)/accounts/<id>.json`, 0600, outside the data folder).
  Refresh is serialized per account and rotated tokens replace their
  predecessors. Tokens never enter the data folder, a response or the log.
- The account list (`<data>/accounts.json`) and the mail / calendar snapshots
  (`<data>/inbox/sources/`, `<data>/calendar/sources/`) are normal data.
- Only the computer that connected an account (its **fetcher**) reads it;
  another computer shows "Checked on your other computer".

## Making it live (one-time, by the publisher)

1. In the Microsoft Entra admin centre of the publisher's OWN tenant (not an
   employer's), **App registrations > New registration**:
   - Name: `OpenDash`
   - Supported account types: **Accounts in any organizational directory and
     personal Microsoft accounts** (`AzureADandPersonalMicrosoftAccount`).
   - Redirect URI: platform **Public client/native (mobile & desktop)**,
     `http://localhost/api/accounts/callback`. Add `http://localhost/api/microsoft/callback`
     as well only if old installs that pasted this ID must keep signing in.
2. **Authentication**: *Allow public client flows* = Yes. No web or SPA
   platform, no client secret, no certificate.
3. **API permissions** (Microsoft Graph, **Delegated**): `User.Read`,
   `Mail.Read`, `Calendars.Read`, `offline_access`, `openid`, `profile`. No
   application permissions. Do not "grant admin consent" in the publisher's
   tenant on behalf of other organisations (it only covers the publisher's own).
4. **Branding & properties**: a publisher domain and, ideally, publisher
   verification (Partner Center); without it Microsoft shows "unverified" and
   tenants that allow only verified publishers block the app entirely.
5. Give the **Application (client) ID** to the release: the repository secret
   `OPENDASH_MICROSOFT_CLIENT_ID`, which `tools/release-package.mjs --client-ids`
   writes into the zip's `lib/accounts/shipped.mjs` (`microsoftClientId`) only
   (docs/dev/RELEASING.md, *Built-in sign-ins*); or set
   `OPENDASH_MICROSOFT_CLIENT_ID` in the environment for a test build. The ID
   is public; nothing else is needed.
6. A work organisation's administrator then approves the app once for their
   tenant (the link OpenDash shows, or Entra admin centre > Enterprise
   applications > OpenDash > Permissions > Grant admin consent).

## Validation

`node --test tests/accounts-microsoft.test.mjs tests/microsoft.test.mjs
tests/accounts-node.test.mjs tests/accounts-routes.test.mjs` uses temporary
folders and synthetic provider responses only. Real consent, tenant policy and
the unverified-publisher screens need a real registration and are not covered.

Official references: [authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow),
[admin consent](https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent),
[localhost redirect rules](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url),
[error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes),
[messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0),
[calendarView](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0),
[delegated permissions](https://learn.microsoft.com/en-us/graph/permissions-reference).
