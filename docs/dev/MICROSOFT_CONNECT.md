# Microsoft browser sign-in

OpenDash can read personal Outlook/Hotmail and work or school Microsoft 365
email and calendars directly, without Claude or a desktop email app. It uses
Microsoft's `/common` authorization endpoint, a native public-client app,
PKCE S256 and a random, single-use state that expires after ten minutes.

**An application registration is required.** OpenDash currently ships no
Microsoft application client ID. Until one is saved, Connections and the
first-run setup show **Setup needed**, never Connected. A release publisher
should supply a registration supporting organisational and personal accounts;
work or school administrators may also impose consent restrictions.

## Register and connect

1. In Microsoft Entra **App registrations**, register an app whose supported
   account types are **Accounts in any organisational directory and personal
   Microsoft accounts** (`AzureADandPersonalMicrosoftAccount`).
2. Under Authentication, add **Mobile and desktop applications** with redirect
   URI `http://localhost/api/microsoft/callback`. Enable public client flows.
   Microsoft ignores the port for native localhost redirect matching; OpenDash
   sends the actual local server port in the authorization request.
3. Add Microsoft Graph **delegated** permissions `User.Read`, `Mail.Read` and
   `Calendars.Read`. No application permissions or client secret are needed.
4. Open Connections → Outlook / Microsoft 365 → Set up Microsoft, paste the
   Application (client) ID, save, and choose Sign in with Microsoft. The browser
   requests `offline_access` as well so the local connection can refresh.
5. Return to OpenDash. A successful consent creates Outlook Mail and Outlook
   Calendar sources and performs their first read. Individual calendars and
   the mailbox can be switched off; sources can be paused or removed.

## Read boundaries and storage

- Graph requests are GET-only, confined to `https://graph.microsoft.com/v1.0/me`.
  Redirects and paging links to other hosts or paths are rejected.
- Mail reads the Inbox, recent dates, sender, subject, flags and body preview;
  it never requests message bodies or attachments, sends mail, or changes flags.
  `Mail.ReadBasic` excludes body previews, so `Mail.Read` is necessary even
  though OpenDash only asks Graph for the preview fields.
- Calendar uses calendarView, including recurring instances, and retains
  all-day dates in their original time zone. Each update has a shared 40-request
  and 60-second budget, with at most 1,000 events; limits produce warnings.
- The client ID and refresh credentials live in the selected data folder's
  `secrets/microsoft-client.json` and `secrets/microsoft-tokens.json`. Writes
  use the atomic locked data writer with private file mode where supported.
  Credentials are local files, not OS-keychain encrypted, and never enter the
  dashboard response or server log. Refresh is serialized and rotated tokens
  replace their predecessors.
- Disconnect clears credentials and pauses the Microsoft sources. Previously
  imported snapshots remain local but paused sources are excluded from merged
  views. Reconnecting creates fresh source IDs to keep in-flight old-account
  reads from being mistaken for the newly connected account.
- Only the state-protected callback accepts cross-site navigation. Configuration,
  connect, status and disconnect retain the local router's origin and host checks.

## Validation

`node --test tests/microsoft.test.mjs tests/security-release.test.mjs` uses only
temporary folders and synthetic provider responses. Real consent and Microsoft
tenant policy require a valid app registration and are not covered by those tests.

Official references: [authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow),
[localhost redirect rules](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url),
[messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0),
[calendarView](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0),
[delegated permissions](https://learn.microsoft.com/en-us/graph/permissions-reference).
