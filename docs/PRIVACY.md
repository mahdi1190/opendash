# Privacy

OpenDash is built so that your information stays on your computer. This page
lists what is stored, where, and exactly when anything leaves your computer.

**In short:** there is no OpenDash cloud, no account, no analytics and no
telemetry. OpenDash only uses the network for features you switch on, and then
only to reach the service that feature names. The one exception is Claude: if
Claude Code is already installed and signed in on this computer, OpenDash
finds it by itself and some Claude features run by default (see
[What is sent to Claude, and when](#what-is-sent-to-claude-and-when)).

## What is stored, and where

Everything lives in one data folder on your computer (`data/` next to the app,
or the folder you chose with `--data-dir`):

| What | Where | Contains |
|---|---|---|
| Settings | `config.json` | your name, email addresses you entered, region, theme, feature and AI choices, weather town |
| Your work | `state/dashboard-state.json` | tasks, notes, people, tags, streams, countdowns, reviews, links to files |
| Backups | `state/backups/`, `backups/` | copies of the above, made automatically |
| Finances | `finance/` | the bank CSV files you imported or synced, categories, budgets, the analysis |
| Calendar and email | `calendar/`, `inbox/`, `email/` | read-only snapshots: event details; email subjects, senders, dates and short snippets |
| Data sources | `sources.json`, `connections.json` | which sources and accounts you added, connection status, iCal addresses |
| Briefs and stories | `briefs/` | cached weather, AI summaries and story scripts, daily brief snapshots |
| Auto-linking | `index/` | names, sizes and dates of files in the workspace folders you chose, short excerpts (never from "names only" folders) |
| Logs | `logs/` | what the server did: requests, timings, counts, errors. No task text, email content, names or money |
| Local token | `local-token` | a random secret for local programs |
| Google sign-in files from older setups | `secrets/` | only if an earlier version's direct Google route was set up (see [CONNECTIONS.md](CONNECTIONS.md#older-setups-google-without-claude)) |

Your browser keeps interface preferences, a fallback copy of unsaved edits
while the server is down, and an offline copy of the app page (with your
public settings, such as your name; never your tasks).

OpenDash does not encrypt the data folder. Use your operating system's disk
encryption if the computer is shared or portable, and keep the folder out of
public places (shared drives, public repositories).

## When does anything leave your computer?

Only in these cases, and only when you switch the feature on:

| Feature | What is sent | To whom |
|---|---|---|
| **Claude features** (assistant, task chat, summaries, suggestions, auto-link judge, stories) | only what that feature needs: for example the task you are chatting about, or the facts for today's summary | Anthropic, through the Claude Code CLI signed in to **your** Claude account |
| **Connectors** (Gmail, Google Calendar, a bank, GitHub, Google Drive, other MCP servers) | a request to read: "list events this month", "list transactions since...", "open pull requests of this repository" | the connector, called by Claude through your Claude Code. The results (your events, email subjects and snippets, transactions...) pass through Claude (Anthropic) on their way to your computer |
| **iCal links** | a normal download request for that address | the calendar host in the link |
| **Weather** (if you set a town) | the town name (to find it once), then its coordinates | Open-Meteo (open-meteo.com), no account, no key |
| **Direct Google route** (older setups only) | read-only Gmail and Calendar requests | Google, with your own OAuth client |
| **Read aloud** (stories and the money brief), only with an online voice | the text being read | your browser's speech service. Voices built into your computer keep everything local; voices marked *(online)* in Settings > Morning brief > *Voice* (for example some "Natural" voices in Microsoft Edge, or Chrome's Google voices) send the text to the browser maker |
| **Avatars** (if you set an image address on a person) | a normal image request | the site in that address |
| **Links you open** | whatever your browser sends when you open a web link | that site |

Nothing else. In particular:

- no analytics, crash reports, usage statistics or update checks;
- OpenDash's server listens on `127.0.0.1` only, so other computers cannot
  reach it;
- your data is never sent to the OpenDash project or its maintainers.

## What is sent to Claude, and when

- **"Connected" means Claude Code is installed and signed in on this
  computer.** OpenDash finds it by itself: when the server starts (and again
  at most every 30 minutes when a feature needs to know) it sends Claude Code
  one tiny test prompt ("Reply with exactly: OK"), with none of your data, on
  the fast model and your own plan. It also runs `claude mcp list` to see which
  connectors you have added, and Claude Code checks each server on that list
  as it answers. Without Claude Code on the computer, none of this happens and
  nothing is sent at all.
- **Only when you use a Claude feature, or one that runs by itself.** With
  Claude connected, the Morning brief's *day in three sentences* and the
  story scripts (morning, evening and weekly) are written by Claude by
  themselves, each at most once a day. They are on by default: Settings > Morning brief >
  *AI summary* turns them off, and the built-in script plays instead. The
  auto-link judge only runs once you turn on auto-linking and choose folders.
  Each feature can be switched off in Settings.
- **Only what that feature needs.** Task chat sends that task and your
  conversation; the morning summary sends today's facts; the auto-link judge
  sends task titles with candidate folder and file names and short excerpts
  (never from "names only" folders, never whole files).
- **The assistant looks things up itself** through OpenDash's MCP server in
  propose mode, so it reads only what it needs to answer, and it cannot change
  anything without your click.
- **Bank data**: sync asks Claude to call your bank connector's read-only
  tools, so the transactions it fetches pass through Claude on their way into
  your data folder. If you would rather they did not, import your bank's CSV
  export instead: that never leaves your computer. After that, models see
  finance **totals** only: the MCP server gives totals, never single
  transactions, and the optional AI money brief gets category totals, your
  usual pace and the names and amounts of the next few bills (never a
  transaction list, a memo, an account or a balance).
- Claude Code processes these requests under your own account and Anthropic's
  terms and privacy policy. OpenDash never sees your Claude sign-in.

## Your own Claude using OpenDash (MCP)

If you register OpenDash's MCP server with Claude Code, T3 Code or Claude
Desktop, the conversations you have there can include anything you ask Claude
to look up in OpenDash. That is between you and your Claude client; OpenDash
only answers the tool calls. See [MCP.md](MCP.md) for permissions.

## Sharing and support

- **Export a clean copy of the app** contains no data, settings, logs,
  sign-ins or tokens.
- **Copy diagnostics** removes paths, email addresses and tokens, and contains
  no task text, names or money. Read it before you share it anyway.
- When you report a bug, never paste your data; use demo data.

## Removing your data

Delete the data folder (and clear the site data for `http://localhost:4173` in
your browser). Data held by Anthropic, Google, your bank or other services is
governed by those services. See [INSTALL.md](INSTALL.md#uninstalling).
