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
or the folder you chose with `--data-dir`, or the one Settings > Data > *Move my data out of OneDrive* moved it to):

| What | Where | Contains |
|---|---|---|
| Settings | `config.json` | your name, email addresses you entered, region, theme, feature and AI choices, weather town |
| Your work | `state/dashboard-state.json` | tasks, notes, people, tags, streams, countdowns, reviews, links to files |
| Backups | `state/backups/`, `backups/` | copies of the above, made automatically |
| Finances | `finance/` | the bank CSV files you imported or synced, categories, budgets, the analysis |
| Calendar and email | `calendar/`, `inbox/`, `email/` | read-only snapshots: event details; email subjects, senders, dates and short snippets |
| Data sources | `sources.json`, `connections.json` | which sources and accounts you added, connection status, iCal addresses |
| Briefs and stories | `briefs/` | cached weather, AI summaries and story scripts, daily brief snapshots |
| ElevenLabs narration | key and usage: this computer's private folder (see below); audio: `cache/narration/` | optional API key and account status, saved voice audio and local usage counts; excluded from exports |
| Auto-linking | `index/` | names, sizes and dates of files in the workspace folders you chose, short excerpts (never from "names only" folders) |
| Logs | `logs/` | what the server did: requests, timings, counts, errors. No task text, email content, names or money |
| Local token | `local-token` | a random secret for local programs |
| Sync across my devices (if on) | outside the data folder: `%LOCALAPPDATA%/OpenDash/sync/` (Windows), `~/Library/Application Support/OpenDash/sync/` (macOS), `~/.local/state/opendash/sync/` (Linux) | this computer's sync identity, what it last synced, clashes between computers, the trial-mode report. The sync keys and this computer's private key are with the other sign-ins and keys, in this computer's private folder (below) |
| Open computers | `hosts/`, `data-id.json` | one small file per computer that has the folder open (a random id, the computer's name, the app version, when it last checked in), and the folder's random id |
| Main computer (if you chose one) | `main-computer.json` | the random id and name of the computer that runs the automatic background jobs |
| A move of the data folder (Settings > Data > Move) | outside the data folder, in this computer's OpenDash folder (`%LOCALAPPDATA%\OpenDash\relocation.json` and `moves\` on Windows; `~/Library/Application Support/OpenDash/` on macOS; `~/.local/state/opendash/` on Linux) | the old and new folders, the files copied with their checksums, and each setting the move changed with its old and new value (so Undo can put it back), including the text of Claude scheduled-task files it edited. Never sent anywhere |
| The daily encrypted copy (if on) | settings and the key made from your passphrase: this computer's private folder (next row). The copies: the folder you chose, by default `OneDrive\OpenDash Backups` | the passphrase itself is never stored. Each copy holds what *Export all data* holds, encrypted (AES-256-GCM) before it is written |
| Sign-ins and keys | **this computer's private folder, not the data folder**: `%LOCALAPPDATA%\OpenDash\<id>\secrets` (Windows), `~/Library/Application Support/OpenDash/<id>/secrets` (macOS), `~/.local/state/opendash/<id>/secrets` (Linux) | Google and Microsoft sign-ins, Google Health, ElevenLabs, the remote MCP and relay pairings, and under `fin/` your Monzo client and sign-in, your Enable Banking application key and bank sessions, your Plasma One address (only if you set those up; deleted when you disconnect). They never travel with the data folder |

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
| **ElevenLabs voice**, when connected and selected | the words of selected story moments, voice ID and delivery cues, authenticated using your API key | ElevenLabs (`api.elevenlabs.io`); saved audio is reused locally |
| **Connectors** (Gmail, Google Calendar, a bank, GitHub, Google Drive, other MCP servers) | a request to read: "list events this month", "list transactions since...", "open pull requests of this repository" | the connector, called by Claude through your Claude Code. The results (your events, email subjects and snippets, transactions...) pass through Claude (Anthropic) on their way to your computer |
| **iCal links** | a normal download request for that address | the calendar host in the link |
| **Weather** (if you set a town) | the town name (to find it once), then its coordinates | Open-Meteo (open-meteo.com), no account, no key |
| **Direct Google route** (older setups only) | read-only Gmail and Calendar requests | Google, with your own OAuth client |
| **Read aloud** (stories and the money brief), only with an online voice | the text being read | your browser's speech service. Voices built into your computer keep everything local; voices marked *(online)* in Settings > Morning brief > *Voice* (for example some "Natural" voices in Microsoft Edge, or Chrome's Google voices) send the text to the browser maker |
| **Avatars** (if you set an image address on a person) | a normal image request | the site in that address |
| **Links you open** | whatever your browser sends when you open a web link | that site |
| **Daily encrypted copy** (off by default; Settings > Data) | once a day, your settings, tasks and notes, calendar and email snapshots and finances (no sign-ins, keys, logs or caches), **encrypted on this computer** with a key made from your passphrase | the folder you chose, by default `OneDrive\OpenDash Backups`: your cloud provider stores scrambled bytes, plus the date, this computer's name and the app version in plain text. Nothing goes to OpenDash. Without the passphrase nobody can open the copies, including you |
| **Moving the data folder** (Settings > Data > Move) | nothing: the copy is made on this computer. After showing you each change, it updates the settings of your own programs that point at OpenDash: Claude Code (through its own `claude mcp` command), Claude Desktop's settings file, Codex and Gemini CLI (through their commands), Windows start-up entries, shortcuts, and Claude scheduled-task files that name the folder. Only those entries | no one |
| **Sync across my devices** (off by default; Settings > Sync) | your tasks, notes, people, streams, countdowns, Home layout and reviews, field by field; the list of connected accounts (never their sign-ins); the mail and calendar snapshots of accounts this computer fetches. Never: sign-ins, bank keys, tokens, `config.json`, `connections.json`, `sources.json`, or this screen's view and theme | an `OpenDash Sync` folder inside the OneDrive, Google Drive or Dropbox folder you choose, **end-to-end encrypted**: each change is locked (AES-256-GCM) on your computer before it is written, with a key only your devices hold, so your cloud provider stores files it cannot read. It can see how many devices sync, when they write and roughly how much; a new computer waiting to be approved shows its name there until it is approved. The key never goes into the folder; your recovery code is shown once and kept by you. Each of your computers reads the folder from there; nothing goes to OpenDash. Until you also turn on *Use changes from my other computers*, nothing received is applied |

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
- **Direct bank and wallet connections** (Monzo, Plasma One, Enable Banking)
  are read by OpenDash itself, with no AI involved: your transactions go
  straight from Monzo, Enable Banking or the public Plasma blockchain (through
  Routescan's API) to your data folder. To convert other currencies, OpenDash
  asks the public Frankfurter service for the day's exchange rate (only the
  currencies and dates, never amounts).
- **Bank data through Claude**: sync asks Claude to call your bank connector's read-only
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
