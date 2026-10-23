# Connections

OpenDash works fully offline. Connections switch on the smart parts: the
assistant, calendar and email, bank sync and more. Everything is optional, and
everything external is used **read-only**.

Open **Connections** from Settings (the *Connections* row in its list), from
the ··· menu at the top right, or press Ctrl+K and type "connections". Each card shows whether it works, when it was
last checked and what it unlocks. Anything that needs a missing connection
stays visible but greyed out, with a *Connect* link. Checks run when you open
the page and at most once an hour; *Check again* runs one now.

- [How it fits together](#how-it-fits-together)
- [Email and calendar accounts](#email-and-calendar-accounts)
- [Claude (Claude Code on this computer)](#claude-claude-code-on-this-computer)
- [Gmail, Google Calendar and your bank (claude.ai connectors)](#gmail-google-calendar-and-your-bank-claudeai-connectors)
- [Money: banks and wallets](#money-banks-and-wallets)
- [Data sources: several banks, calendars and mailboxes](#data-sources-several-banks-calendars-and-mailboxes)
- [Calendars from an iCal link](#calendars-from-an-ical-link)
- [Bank CSV files](#bank-csv-files)
- [GitHub and Google Drive in Files & links](#github-and-google-drive-in-files--links)
- [Your own Claude using OpenDash (MCP)](#your-own-claude-using-opendash-mcp)
- [Google accounts (Gmail and Google Calendar, without Claude)](#google-accounts-gmail-and-google-calendar-without-claude)
- [Troubleshooting](#troubleshooting)

## How it fits together

```
 OpenDash (this computer)
   │
   ├── Claude Code CLI ("claude"), signed in to YOUR Claude account
   │     ├── the assistant, summaries, suggestions (no tools by default)
   │     └── MCP connectors you set up in Claude: Gmail, Google Calendar,
   │         a bank, any MCP server you added ── read tools only
   │
   ├── iCal links ── fetched directly, no AI involved
   ├── direct bank and wallet connections (Monzo, Plasma One, Enable Banking)
   │     ── read directly by OpenDash, no AI involved, read-only
   └── bank CSV files ── imported directly, no connection needed
```

OpenDash never asks for, sees or stores a password for Claude, Google or your
bank. Sign-in happens on claude.ai, in Claude's own window or on your bank's
own page. The direct bank connections are the one place OpenDash keeps a
credential: the Monzo client and sign-in you create, or your Enable Banking key
file. They stay on this computer, in its private folder outside the data
folder (`secrets/fin/` there, see [INSTALL.md](INSTALL.md)), are never shown
on the page or written to the logs, never travel with a copied or synced data
folder, and are deleted when you disconnect. On another computer you connect
again: keep your Enable Banking `.pem` key and your Monzo client ID and
secret somewhere safe.

## Email and calendar accounts

There is no OpenDash account to create. Instead, add the email and calendar
accounts you already have, as many as you like, side by side: a personal
Hotmail, a personal Gmail and a work Outlook, for example.

At the top of **Connections**, under *Your email and calendar accounts*:

> **Coming soon in some copies.** The one-click Microsoft and Google buttons
> need an app registration that the copy of OpenDash ships with. When a copy
> has none (no built-in app, nothing in the environment or `.env`, and no app
> of your own), the buttons are greyed out with **Coming soon**. They switch
> on by themselves as soon as an app is there. Until then a Gmail address can
> be added through **+ Other email** (below), and an Outlook calendar through
> **Add a calendar link**. People who look after IT can enter their own app
> under **Settings > Advanced** (*Your own sign-in apps*).

- **+ Add Microsoft account**: type your email address (Hotmail, Outlook, Live,
  or your work or school email) and press *Continue to Microsoft*. Microsoft
  opens in a new tab: sign in there and say yes. Come back to OpenDash: the
  account appears with *Connected*. OpenDash works out from the address whether
  it is a personal or a work account; if it guessed wrong, press *This is a
  work or school account* (or *personal*) before continuing.
- **+ Add Google account**: type your Gmail or Google Workspace address, tick
  *Read your email* and/or *See your calendars*, and press *Continue to Google*.
  Google first says "Google hasn't verified this app": press *Advanced*, then
  *Go to OpenDash (unsafe)* (see [Google accounts](#google-accounts-gmail-and-google-calendar-without-claude)).
- **+ Other email**: Yahoo, iCloud, AOL, GMX, Zoho, Fastmail, Proton (through
  Proton Mail Bridge) and most other email services. Type your address and
  press *Next*: OpenDash recognises the service and shows its own steps to make
  an **app password** (a second password your provider makes just for OpenDash,
  so OpenDash never needs your real password; you can delete it on the
  provider's website at any time). A button opens the right page. Paste the
  app password and press *Test connection*. If it does not work, OpenDash says
  why in plain words (the wrong password, IMAP switched off, two-step
  verification needed first) and what to do. A Gmail or Outlook address is
  sent to the one-click buttons instead, while those are switched on.
  Afterwards OpenDash offers *Add a calendar link* with the steps for that
  service (iCloud: a public calendar link; Yahoo: the calendar's ICS link).
  - **Gmail, while + Add Google account says Coming soon**: Gmail works here
    with an app password (OpenDash reads `imap.gmail.com`, port 993). Google
    makes app passwords only with **2-Step Verification** on: turn it on at
    myaccount.google.com/signinoptions/two-step-verification, then make the
    password at **myaccount.google.com/apppasswords** (name it OpenDash) and
    paste it. Afterwards *Add your Google Calendar too?* shows where to find
    the calendar's **Secret address in iCal format** (Google Calendar >
    Settings > your calendar > *Integrate calendar*). A Google Workspace
    account may not offer app passwords (the administrator decides).
  - **Outlook, Hotmail and Live, while + Add Microsoft account says Coming
    soon**: *Outlook and Hotmail are coming soon*. Microsoft no longer lets
    apps read Outlook.com mail with an app password, so these need the
    one-click Microsoft sign-in (the same for Microsoft 365 work addresses).
    Your Outlook calendar can come in now: Outlook on the web > Settings >
    Calendar > *Shared calendars* > *Publish a calendar* ("Can view all
    details"), copy the ICS link and press *Add a calendar link*. The app password is kept on this
  computer only, never in the data folder; OpenDash only reads mail and never
  marks it as read. If the app password stops working, the account says
  *Sign in again*: press *Paste a new app password*.
- **Add a calendar link**: any calendar you can share as a link (see
  [Calendars from an iCal link](#calendars-from-an-ical-link)).

Each account shows **Mail ✓ Calendar ✓** (press one to stop or start reading
it), when it was last synced, and **Check now**. From its ··· menu you can
**Pause** it (nothing new is read; what was already read stays) or **Remove**
it (OpenDash forgets its mail and events; your account itself is not changed).

What the words on an account mean:

- **Connected**: it works.
- **Sign in again**: the provider asked you to sign in again (for example after
  a password change). Press *Sign in again*.
- **Waiting for your organisation**: your work or school only lets apps in
  after an administrator says yes, once. Press *Ask for approval*: if you look
  after your organisation's Microsoft 365 yourself, approve OpenDash there; if
  not, *Email my IT team* writes the email for you. When it is approved, press
  *Try again*.
- **Paused**: you paused it.
- **Checked on your other computer**: another computer of yours reads this
  account; what it reads appears here too.

OpenDash only reads: it never sends, changes or deletes mail or events, and
your password stays with Microsoft or Google. The sign-in itself stays on the
computer where you made it (never in a synced data folder); on another computer
you sign in again.

## Claude (Claude Code on this computer)

**Unlocks**: the assistant, task chat, smart suggestions, linking tasks to
people, AI summaries in the brief and stories, the auto-link judge, and every
connector below.

Press **Link Claude** in Setup or Connections. OpenDash looks for an existing
local Claude Code installation first, reuses it, checks sign-in, and adds its
MCP tools as part of the same connection. If Claude Code is missing, the button
runs Anthropic's official native installer. Sign-in takes place in your browser;
Claude Desktop and a hosted relay are unnecessary for this default connection.

Claude Code requires a supported Claude subscription or a Console/provider
account. Browser sign-in does not add hosting costs; AI use follows the account
you select. A free claude.ai account alone does not provide Claude Code access.

The local link enables AI inside the dashboard; you do not need to chat in
Claude's website. For optional browser chat, **Open connected Claude** starts
an official Remote Control terminal and opens `claude.ai/code`. Complete any
Claude terminal confirmations, then select **OpenDash** in the browser. Keep
the terminal running. Remote Control requires an eligible subscription and
may be restricted by your organization. OpenDash does not treat launching a
terminal as proof that the browser session is connected.

If the automatic setup needs attention, the manual fallback is:

1. **Install Claude Code**:

   - Windows (PowerShell):

     ```powershell
     irm https://claude.ai/install.ps1 | iex
     ```

   - macOS and Linux:

     ```sh
     curl -fsSL https://claude.ai/install.sh | bash
     ```

2. **Sign in**: on the Claude card, press *Open sign-in window* (it runs
   `claude` in a terminal), or run `claude` yourself and follow the prompts.
3. Press *Check again*. The card turns green when Claude answers.

Calls go through your own Claude plan; OpenDash adds no cost of its own. Each
call takes a few seconds (the CLI starts up each time).

Models: Settings > AI picks the model for quick jobs and for the assistant,
from the models OpenDash allows (`claude-opus-5-5`, `claude-sonnet-5`,
`claude-haiku-4-5`) and an effort level (low, medium or high).

If Claude Code is installed somewhere unusual, set the environment variable
`CLAUDE_CLI_PATH` to the `claude` executable before starting OpenDash.

## Gmail, Google Calendar and your bank (claude.ai connectors)

| Connector | Unlocks |
|---|---|
| **Gmail** | email triage, tasks from email, recent mail on people |
| **Google Calendar** | events next to your tasks, *Update calendar* |
| **Bank** | *Sync bank* in Finances (CSV import works without it) |

1. On the card, press *Sign in & verify* (or go to claude.ai >
   Customize > Connectors yourself).
2. Connect the service there, signing in with that service.
3. Return to OpenDash. A user-started sign-in verifies and updates the source
   automatically; a failed read stays visible for troubleshooting.

The connectors live in your Claude account; Claude Code on this computer can
use them once you are signed in. OpenDash only ever lets them use **read**
tools: it can look things up, never send, change or delete anything.

If a card says the connector "needs you to sign in again", run `claude` in a
terminal, type `/mcp`, and pick the connector to sign in again.

## Money: banks and wallets

Connections > **Money** is one place for every bank and wallet that feeds
Finances. Open it from Connections, from *Connect a bank or wallet* on the
Finances welcome screen, from Home's money card, or with Ctrl+K "connect a
bank".

Every connection is **read-only**: OpenDash can read balances and
transactions and can never move money, make a payment or move money in or out
of a pot. Each provider has a fixed list of the requests OpenDash may make,
and anything else is refused before it leaves your computer.

### Your accounts

Every account from every provider, in one list: rename it, give it a colour,
switch *Show in Finances* off or on, see when it last synced and, for banks
that need it, the date to sign in again by (amber two weeks before, red three
days before). *Sync now* updates one connection.

**Possible duplicates.** If you connect the same account twice (for example
Monzo through Aureli and Monzo directly), the new one starts hidden with a
"Possible duplicate" note, so nothing is counted twice. Choose *Keep this
one* or *Keep the other*. A hidden account keeps its transactions; they are
left out of Finances until you show it again.

**Disconnecting** (the ··· menu on a connection) deletes the saved sign-in.
You choose whether its past transactions stay in Finances (the default) or are
removed; removing them can be undone straight after.

### Choosing a provider

The *Search your bank* box points you to the right card. Each card lists what
it covers, what it costs, its limits, what you will need and how long it
takes.

| Provider | Covers | Cost | You need |
|---|---|---|---|
| **Aureli** (via Claude) | the banks Aureli supports, synced through the claude.ai Bank connector | an Aureli account; one bank is free, more need a paid Aureli plan | Claude on this computer and the Bank connector on claude.ai |
| **Plasma One** | your Plasma One USDT balance and transfers, read from the public Plasma blockchain | free | your wallet's public address |
| **Monzo** | your Monzo current and joint accounts, pots (balances only) and transactions with shop names and Monzo's categories | free | the Monzo app and a free Monzo developer client |
| **Other UK and EU banks** (Enable Banking) | the banks Enable Banking supports in your country | free for your own accounts | a free Enable Banking application and its key file |
| **Import a CSV** | any bank that lets you download a statement | free | a CSV export |

### Plasma One (one click)

1. Press *Paste address*. In Plasma One, open **Receive** and copy your
   address (it starts with `0x`).
2. Paste it. OpenDash shows the balance and the last 30 days of transfers.
3. Press *Add wallet*. The first update brings in the whole history.

An address is public, so it can only ever be read. **Never paste your recovery
phrase or a private key anywhere**: OpenDash refuses anything that looks like
one and clears the box. Amounts are converted from USD to pounds at each day's
rate (the dollar amount stays in the description). Card purchases are settled
on the blockchain, so they show as "Plasma One payment" without the shop's
name, and some may be combined. OpenDash reads the address through
Routescan's free public API (Plasmascan's data); a free Routescan key is
optional.

### Monzo (about 4 minutes)

Monzo lets you read your own account through its free developer API. You
create your own "client" once:

1. Sign in at [developers.monzo.com](https://developers.monzo.com/) with your
   email. Monzo emails you a link and asks you to approve in the app.
2. Open *Clients* > *New OAuth Client* and copy in the fields OpenDash shows
   you: the name, the **Redirect URL** (it has your OpenDash port in it) and
   **Confidential** (needed so you stay signed in). Press *Submit*.
3. Paste the **Client ID** and **Client secret** into OpenDash and press
   *Connect Monzo*, then sign in on Monzo's page.
4. **Open the Monzo app within 5 minutes and tap *Allow access*.** OpenDash
   counts down. During those 5 minutes Monzo lets your whole history be read;
   after that only the last 90 days. If you miss the window, Monzo is still
   connected with 90 days, and *Get full history* lets you try again.

Monzo's developer API is for your own account only. Only one sign-in is active
at a time, so signing in somewhere else with the same client signs OpenDash
out (the account then shows *Needs sign-in*).

### Other UK and EU banks: Enable Banking (about 10 minutes)

Enable Banking connects to banks through open banking. Its free "restricted"
mode reads the accounts you link yourself, for personal use.

1. Press *Is my bank supported?* and search. Until you have an application,
   OpenDash cannot check Enable Banking's live list, and it says so.
2. Sign up at [enablebanking.com](https://enablebanking.com/) (free). Under
   *API applications* press *Add* and fill in the fields OpenDash shows you,
   including the return address. Keep "Generate in the browser": submitting
   downloads a `.pem` key file.
3. In OpenDash, choose the key file and paste the **Application ID**. OpenDash
   tests them with one read before saving. The key never leaves this computer:
   it only signs OpenDash's own requests.
4. Choose your bank (personal or business where both exist), then sign in on
   your bank's own page.
5. When the bank sends you back, the browser shows an address starting with
   `https://localhost/opendash-eb-callback`. The page does not load: that is
   expected. **Copy the whole address from the address bar** and paste it
   into OpenDash.

Banks only allow access for a limited time (often 90 or 180 days). OpenDash
shows the date and reminds you before it ends; *Sign in again* keeps your
accounts and history. Automatic updates run at most 4 times a day per bank
(*Sync now* always runs). Which UK banks Enable Banking covers has not been
confirmed; if yours is not listed, use a CSV export.

### What stays on this computer

| Provider | Kept on this computer only (`secrets/fin/` in its private folder) |
|---|---|
| Plasma One | your public address, and the optional Routescan key |
| Monzo | your client ID and secret, and the current sign-in |
| Enable Banking | your application ID and key file, and each bank's session |

None of it is ever sent to the page, written to the logs or included in
exports. Disconnecting deletes the connection's file.

## Data sources: several banks, calendars and mailboxes

Under **Data sources** on the Connections page you can add as many sources as
you like, each with its own accounts:

1. Choose *Add a source* and say what it should read: **Banks**,
   **Calendars** or **Email**.
2. Pick where it comes from: an MCP server, or for a calendar *An iCal link*
   ([below](#calendars-from-an-ical-link)). The servers come from
   `claude mcp list`: claude.ai
   connectors, plus any MCP server you added to Claude Code at user scope, for
   example:

   ```sh
   claude mcp add --scope user acme-bank -- npx some-bank-mcp-server
   ```

3. OpenDash lists the server's tools and **ticks only the ones that read**.
   Tools that could change, send or delete anything are locked and never used.
4. A short test fetch runs before you save.

Each source, calendar, mailbox or bank account can be switched off on its own.
Calendars that belong to other people (named after an address that is not one
of yours) start hidden; add your own addresses in Settings > Profile >
*Your email addresses* so your calendars are recognised. If you show one, its
events appear in the Calendar only; Home, the brief and the stories keep to
your own calendars and the events you are invited to.

Only add MCP servers you trust: OpenDash restricts them to read tools, but
the server itself runs on your computer or your provider's.

## Calendars from an iCal link

Many calendars publish a private "iCal" address (it ends in `.ics`):

- **Google Calendar**: Settings > *Settings for my calendars* > your calendar >
  *Integrate calendar* > *Secret address in iCal format*.
- **Outlook**: Settings > Calendar > *Shared calendars* > *Publish a calendar*,
  then copy the ICS link.
- Timetables, sports fixtures and similar feeds often offer one too.

In Connections > Data sources, choose *Add a source* > *Calendars* >
*An iCal link*, paste the address (`webcal://` links work too), then give it a
name and a colour. A test fetch runs before you save. OpenDash fetches the
calendar directly (https only, no AI involved) and the address stays on your
computer. Treat a secret address like a password: anyone with it can read that
calendar.

## Bank CSV files

You do not need any connection for Finances. Export a CSV of your transactions
from your bank's website and use **Import CSV** in Finances (or drop the file
on the page). Exports with Date, Amount (or Money in / Money out) and
Description columns work; overlapping exports are fine, duplicates are
skipped.

## GitHub and Google Drive in Files & links

- **GitHub**: *Show open PRs and issues* on an attached repository uses the
  `github` MCP server in your Claude Code (added at user scope and connected),
  with list and search tools only.
- **Google Drive**: searching Drive while attaching a file uses the read tools
  of the claude.ai Google Drive connector.

Both stay greyed out until those connections work.

## Your own Claude using OpenDash (MCP)

The **OpenDash MCP** card is the other direction: it lets Claude Code, T3 Code
or Claude Desktop read and change your tasks. See [MCP.md](MCP.md).

## Google accounts (Gmail and Google Calendar, without Claude)

<a id="older-setups-google-without-claude"></a>

*+ Add Google account* in Connections reads Gmail and Google Calendar straight
from Google, read-only, with no Claude in between. Add as many Google accounts
as you like, next to your Microsoft ones.

1. Type the address and tick what OpenDash may read: **Read your email** (who
   wrote, the subject and Google's short preview; never the whole message) and
   **See your calendars**. Each is separate; tick one or both.
2. OpenDash explains the next screen first. Google shows **"Google hasn't
   verified this app"**: Google reviews apps that read Gmail through a paid
   security assessment, and this copy of OpenDash runs on your own computer and
   has not been through it. Click **Advanced**, then **Go to OpenDash
   (unsafe)**, then tick the same boxes and *Continue*.
3. Back in OpenDash the account shows *Connected*; mail and events arrive in a
   moment. Nothing is ever sent, changed, labelled or deleted.

The sign-in stays on this computer (never in the data folder). Remove an
account in Connections, or remove OpenDash's access at any time at
myaccount.google.com/permissions; the account then says *Sign in again*.

**Advanced: your own Google app.** If this copy of OpenDash has no built-in
Google app, or you prefer your own Google Cloud project: create a project,
enable the Gmail API and the Google Calendar API, set up the consent screen
(External, then *Publish app*, so sign-ins do not stop after 7 days), add the
scopes `.../auth/calendar.readonly` and `.../auth/gmail.readonly`, create a
**Desktop app** client, and paste its client ID and secret (or its JSON) under
**Settings > Advanced > Your own sign-in apps** (*Advanced: use your own
Google app*). They are kept on this computer only. Your own Microsoft app goes
in the same place (*Advanced: use your own Microsoft app*).

**Older setups.** Earlier versions had one direct Google connection with your
own client file in `data/secrets/`. It is moved into one Google account
automatically (same sign-in, same Google app) the first time OpenDash starts.

## Troubleshooting

| What you see | What to do |
|---|---|
| Claude card: "not installed" | install Claude Code (above), then *Check again*; or set `CLAUDE_CLI_PATH` |
| Claude card: "not signed in" | run `claude` in a terminal and sign in |
| A connector "needs you to sign in again" | `claude`, then `/mcp`, pick the connector |
| Monzo shows *Needs sign-in* | Monzo signed OpenDash out (another sign-in with the same client, or a client that is not Confidential): *Sign in again* on the account |
| Monzo connected with only 90 days | the app approval came after Monzo's 5-minute window: *Get full history*, then approve in the app straight away |
| An Enable Banking bank's *Sign in again by* date is red | the bank's access ends soon: *Sign in again* on the connection |
| Enable Banking says the key was not accepted | the application ID and key file do not match, or the app is not active yet on enablebanking.com |
| Plasma One shows no shop names for card purchases | expected: card purchases settle on the blockchain without them |
| "Couldn't fetch from your bank" | the bank connector is disconnected or needs signing in (claude.ai > Settings > Connectors), or Claude is signed out; Connections shows which |
| A source's tool list is empty | the MCP server may still be starting: wait a moment and *Check again*; `claude mcp list` shows its status |
| Usage limit reached | your Claude plan's limit; try again later |
| AI buttons are greyed out | the Claude card is not green yet |
