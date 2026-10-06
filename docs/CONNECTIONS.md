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
- [Claude (Claude Code on this computer)](#claude-claude-code-on-this-computer)
- [Gmail, Google Calendar and your bank (claude.ai connectors)](#gmail-google-calendar-and-your-bank-claudeai-connectors)
- [Data sources: several banks, calendars and mailboxes](#data-sources-several-banks-calendars-and-mailboxes)
- [Calendars from an iCal link](#calendars-from-an-ical-link)
- [Bank CSV files](#bank-csv-files)
- [GitHub and Google Drive in Files & links](#github-and-google-drive-in-files--links)
- [Your own Claude using OpenDash (MCP)](#your-own-claude-using-opendash-mcp)
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
   └── bank CSV files ── imported directly, no connection needed
```

OpenDash never asks for, sees or stores a password or token for Claude, Google
or your bank. Sign-in happens on claude.ai or in Claude's own window.

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

## Older setups: Google without Claude

Earlier private versions could also read Gmail and Google Calendar directly
with your own Google Cloud OAuth client (read-only scopes `gmail.readonly` and
`calendar.readonly`), with the client file in `data/secrets/`. OpenDash 2.0.0
does not use that route for anything you see: the calendar and email views
read from the connectors and data sources above. If an older data folder still holds a
Google client file, Connections shows a *Google (direct sign-in, optional)*
row; you can leave it alone or delete the files in `data/secrets/`. For a
calendar without Claude, use [an iCal link](#calendars-from-an-ical-link).

## Troubleshooting

| What you see | What to do |
|---|---|
| Claude card: "not installed" | install Claude Code (above), then *Check again*; or set `CLAUDE_CLI_PATH` |
| Claude card: "not signed in" | run `claude` in a terminal and sign in |
| A connector "needs you to sign in again" | `claude`, then `/mcp`, pick the connector |
| "Couldn't fetch from your bank" | the bank connector is disconnected or needs signing in (claude.ai > Settings > Connectors), or Claude is signed out; Connections shows which |
| A source's tool list is empty | the MCP server may still be starting: wait a moment and *Check again*; `claude mcp list` shows its status |
| Usage limit reached | your Claude plan's limit; try again later |
| AI buttons are greyed out | the Claude card is not green yet |
