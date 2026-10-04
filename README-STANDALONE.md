# OpenDash — running it standalone

The long-form reference: every detail of running OpenDash on your own
computer, in one file. New here? Start with [README.md](README.md) and the
guides in [docs/](docs/README.md) ([install](docs/INSTALL.md),
[privacy](docs/PRIVACY.md)); they are kept current and win where the two differ.
No account and no API key; everything runs on this machine.

## Opening it

Double-click `start-opendash.bat` (Windows) or run `./start-opendash.sh`
(macOS/Linux). It upgrades your data folder if this version needs it, rebuilds
`index.html`, and starts a small local server; leave its window open. The
dashboard opens at <http://localhost:4173>. Closing that window stops it.
Needs Node.js 20 or newer and nothing else (no `npm install`).

The server runs under a small supervisor (`tools/supervisor.mjs`): if it
crashes it is started again (after 1 s, 2 s, 5 s...; it gives up after 5 crashes
in a minute and says so). See "Restarting and starting the server" below.

## Restarting and starting the server

**Settings > Server** shows the running server (since when, process id, port,
version, data folder, whether the supervisor is keeping it running, and why the
last one stopped) and has:

- **Restart server**: stops and starts it. Your unsaved edits are sent first,
  the page shows "Restarting..." and carries on by itself once the new server
  answers (it reloads only if the app itself changed). Also in the command
  palette (Ctrl+K): "Restart server".
- **Rebuild & restart**: the same, but first runs the data migrations and
  rebuilds the app from `src/` (use it after updating the app). If the rebuild
  fails, the previous version is started again and the page tells you; the
  details are in the log. Palette: "Rebuild & restart server".
- **Open log**: the last 200 lines of `data/logs/server.log`. Every stop is
  written there with its reason (Ctrl+C, the window closed, a crash with its
  error, a restart), so an unexpected stop can be traced.
- **Stop server**: a clean stop (the supervisor does not start it again).

Started with plain `node serve.mjs` (no supervisor), Restart still works: the
server starts a replacement of itself with the same options, with no window
(its console output goes to the log), then exits.

**When the server is not running**, the dashboard says so in a banner ("The
dashboard server isn't running.") with **Start server** and **Retry**, and
checks again by itself every few seconds; it carries on as soon as the server
is back. Edits you make meanwhile are kept in the browser and saved when it
returns (merged with any changes made elsewhere). The browser also keeps a copy
of the app (an "offline page"), so opening the dashboard while the server is
down shows this banner instead of a "can't reach this page" error. The copy it
keeps is only the app page (with basic settings such as your name), never your
tasks or other data; turn it off in Settings > Server, or add `?nosw` to the
address.

**Two optional switches (Windows; off unless you turn them on)** in Settings >
Server > Starting the server. Both are for your Windows account only, need no
administrator rights, run the same fixed launcher (`tools/start-hidden.wsf`,
which starts `start-opendash.bat --no-open` with no window), and turning them
off removes exactly what they added. The page always shows what Windows
actually has, not what it assumes.

- **Start automatically when I log in**: adds a `personal-dashboard` entry to
  `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` (you will also see it in
  Task Manager > Startup apps). The server then runs with no window: stop it with
  Settings > Server > Stop server.
- **Enable the Start server button**: registers a `dashboard-start://` link for
  your account (`HKCU\Software\Classes\dashboard-start`). The banner's Start
  server button uses it (the browser asks once whether to open it). The command
  never receives the link, so nothing in a link can change what runs; it does
  nothing when the dashboard is already running or was started in the last 20 s,
  so any web page opening such a link can at most start your dashboard once.

The port and data folder this server uses are part of the command when they are
not the defaults (switch it off and on again after moving the app or the data
folder; Settings says when the registered command points elsewhere). The data
folder must be on a drive with a letter for these switches. Switch them off
before deleting or moving the app folder.

On macOS and Linux these switches are not offered; Settings > Server shows how
to do the same by hand (a Login Item or LaunchAgent on macOS, a
`~/.config/autostart` entry or a systemd user service on Linux, each running
`start-opendash.sh --no-open`).

## Where your data lives: one folder

Everything that is yours lives in ONE data folder, by default `data/` next to
this file (gitignored). Point somewhere else with `--data-dir <folder>` or the
`DASHBOARD_DATA_DIR` environment variable. Copy the app without that folder and
it is a clean install for someone else.

| | |
|---|---|
| **Settings** | `data/config.json` — your name, currency, locale, timezone, week start, theme, AI model preferences, feature switches |
| **Connections** | `data/connections.json` — last known state of Claude and each connector |
| **State file** | `data/state/dashboard-state.json` |
| **Backups** | `data/state/backups/` — a rolling copy at most every 10 minutes when your data changes (last 40), plus `daily/` (one per day, 30 days) |
| **Finances** | `data/finance/` (or `--finance-dir <folder>`) |
| **Calendar / email snapshots** | `data/calendar/calendar.json`, `data/email/inbox.json` |
| **Google sign-in files** | `data/secrets/` |
| **Server log** | `data/logs/server.log` (rotated): every start, stop (with its reason), crash and restart |
| **Start-up switches** | `data/launch.json` — whether the Start server button is set up (Settings > Server), so the page can offer it while the server is down |
| **Migrations** | `data/migrations.json`; pre-upgrade copies in `data/backups/` |
| **Fallback** | Browser localStorage, used if the server isn't running |

Saves are debounced ~2s, plus a flush when you hide or close the tab. Moving
around (views, opening a task) is remembered but never makes an undo step or a
backup.

**Upgrading from the old layout** (state in `state/`): the server will refuse to
start and print the one command to run, e.g.

```
node tools/migrate.mjs 001-data-dir --finance-from "<your finance folder>" --dry-run
node tools/migrate.mjs 001-data-dir --finance-from "<your finance folder>"
```

It only copies; the old folders are left as they were.

If the data folder sits inside OneDrive you get cloud backup for free. **Run it
on one machine at a time**: OneDrive syncs the file but won't merge simultaneous
edits. (Writes retry automatically when OneDrive briefly locks a file.)

The data folder is gitignored. **Keep it that way** if you publish the code:
your state contains real names, money figures and notes.

---

## The AI features — your own Claude plan, nothing extra

Per-task chat, email→task suggestions and AI auto-link people use the
`claude` CLI you already have installed and signed in, so calls
go through your existing Claude subscription. Nothing extra to pay.

- Every call runs with **no tools and no MCP servers** (it can only read the text
  it is given and answer), a fixed system prompt, and an allowlisted model:
  `claude-opus-5-5`, `claude-sonnet-5` or `claude-haiku-4-5`, effort
  `low`/`medium`/`high`. Set your preferences in `data/config.json` (`ai.model`
  for quick jobs, `ai.chatModel` for the assistant).
- Calls take a few seconds (CLI start-up).
- If the buttons vanish, the CLI has probably been signed out. Run `claude` in
  a terminal to sign back in. `GET /api/ai/status` tells you why.

---

## Gmail + Calendar — 15 minutes of one-time setup

Email triage, the per-person email panel, and the calendar block need Google
access. Both APIs are free at personal-use volumes.

Until you do this, those features stay hidden and everything else works fine.

### 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com>
2. Top bar → project dropdown → **New Project** → name it anything
   (e.g. `dashboard`) → **Create**

### 2. Enable the two APIs

**APIs & Services → Library**, then search for and **Enable** each:

- **Gmail API**
- **Google Calendar API**

### 3. Configure the consent screen

**APIs & Services → OAuth consent screen**

- User type: **External** → Create
- App name: `Dashboard` (any name works); user support email and developer email: your own
- **Scopes**: skip (the app requests them at run time)
- **Test users**: click **Add users** and add your own Google address.
  This matters — without it Google will refuse the sign-in.
- Save. Leave it in **Testing**; you never need to publish it.

### 4. Create the OAuth client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Application type: **Desktop app**
- Name: anything
- **Create**, then **Download JSON**

### 5. Drop the file in

Save the downloaded file as exactly:

```
data/secrets/google-client.json
```

(create the `secrets` folder inside your data folder if it is not there).

### 6. Connect

Restart the dashboard, then click the **⚭** button in the top bar. A Google
consent tab opens.

You'll see *"Google hasn't verified this app"* — that's expected for a personal
desktop app in Testing mode. Click **Advanced → Go to <your app name> (unsafe)**
and allow. It's your own app, requesting read-only access, running on your
machine.

The button turns into **✉** and email triage + the calendar block go live. The
refresh token is stored in `data/secrets/google-tokens.json` and reused from then on
— you won't be asked again.

### Scopes requested

Read-only, both of them:

- `gmail.readonly`
- `calendar.readonly`

The dashboard cannot send, delete, or modify anything in your Gmail or Calendar.

---

## Finances

**Finances** (the wallet tile in the sidebar) shows your spending: how fresh the
data is, this week against your recent weekly average, month to date against
last month, categories, merchants, cash flow, recurring payments, budgets,
"worth a look" flags (possible duplicates, large spends, price rises, new
recurring payments, uncategorised) and every transaction, searchable. Clicking
a category, merchant, bar or day filters everything.

Everything runs on this computer, in Node. Python is no longer needed.

**Two ways to bring transactions in:**

- **Import CSV** (always available, no connection needed): export a CSV of your
  transactions from your bank's website (any date range; overlaps are fine)
  and pick it with **Import CSV**, or drop it onto the Finances page. Barclays'
  export works as it is; so do most exports with Date / Amount (or Money in and
  Money out) / Description columns. You can also drop CSVs into the finance
  folder's `inbox/` and choose **Rebuild from inbox** in the menu.
- **Sync bank** (needs the claude.ai **Bank** connector; greyed out until
  Connections shows it working). The dashboard asks the `claude` CLI to read
  your transactions with read-only Bank tools only (sync, list accounts, get
  transactions, and the portfolio/valuation reads used for balances); every
  other tool and connector is denied, so nothing in your bank can change. The
  first sync reads the last 400 days; later ones re-read from 35 days before
  your newest transaction. **Full refresh** (in the menu) re-reads everything
  the bank still holds, up to two years, and takes a few minutes. If a session
  stops early, the dashboard fetches just the missing dates in a follow-up.

Either way, duplicates are skipped (two genuine identical payments on one day
are both kept), every transaction is categorised, and the analysis is rebuilt.
Only one update runs at a time.

The financial data never enters this repo or the dashboard state file. It stays
in the finance folder (default `data/finance`; change it with
`start-opendash.bat --finance-dir <folder>`). **Export all transactions** in the
menu downloads them as a CSV (this replaces the old Spending.xlsx).

**Categories.** If one is wrong, change it in Transactions, in a merchant's
panel or under "Needs a category". The choice is saved for that merchant in
`_system/rules.json` (`merchant_overrides`, with a backup in
`_system/backups/`) and can be undone. A new user starts with a generic set of
keyword rules; you can edit `rules.json` by hand too, e.g.
`"MYSTERY MERCHANT LTD": "Shopping"`.

**"Couldn't fetch from your bank"**: the Bank connector is disconnected or
needs signing in again (claude.ai → Settings → Connectors), or the CLI is
signed out (run `claude` in a terminal). Connections shows which. Any CSVs
already in `inbox/` are still imported.

---

## Connect Claude to your dashboard (MCP)

The dashboard ships its own MCP server, `mcp/server.mjs`. Any Claude (Claude
Code, T3 Code, Claude Desktop) can then read and change your tasks, people,
tags and countdowns **without being told anything about the dashboard first**.
The server explains itself: it tells the model to look up today's date first,
to search before creating, never to invent ids, and to preview bulk changes.

### The one-line install

The dashboard shows the exact commands for your machine at
`http://localhost:<port>/api/mcp-info`, or run:

```
node mcp/server.mjs --print-install
```

They look like this (your paths will differ; quotes keep paths with spaces working):

| Shell | Command |
|---|---|
| PowerShell | `claude mcp add --scope user dashboard '--' node "C:\path\to\dashboard\mcp\server.mjs" --data-dir "C:\path\to\dashboard\data"` |
| cmd.exe | `claude mcp add --scope user dashboard -- node "C:\path\to\dashboard\mcp\server.mjs" --data-dir "C:\path\to\dashboard\data"` |
| macOS / Linux | `claude mcp add --scope user dashboard -- node '/path/to/dashboard/mcp/server.mjs' --data-dir '/path/to/dashboard/data'` |

(In PowerShell the `--` must be quoted: PowerShell drops a bare `--` before it
reaches the `claude` launcher.) Check with `claude mcp list`; remove with
`claude mcp remove --scope user dashboard`. Claude Code and T3 Code share the
user scope, so one install covers both.

**Claude Desktop**: add this to `claude_desktop_config.json`
(Windows `%APPDATA%\Claude\`, macOS `~/Library/Application Support/Claude/`),
keeping any other servers, then restart Desktop:

```json
{ "mcpServers": { "dashboard": { "command": "C:\\Program Files\\nodejs\\node.exe",
    "args": ["C:\\path\\to\\dashboard\\mcp\\server.mjs", "--data-dir", "C:\\path\\to\\dashboard\\data"] } } }
```

**Permissions** (in `~/.claude/settings.json` → `"permissions"`), pick one:

- read freely, ask before every change:
  `{"allow": ["mcp__dashboard__get_context", "mcp__dashboard__list_tasks", "mcp__dashboard__get_task", "mcp__dashboard__search_tasks", "mcp__dashboard__list_people", "mcp__dashboard__list_countdowns", "mcp__dashboard__list_tags", "mcp__dashboard__list_calendar", "mcp__dashboard__get_finance_summary", "mcp__dashboard__list_history", "mcp__dashboard__describe_operations"], "ask": ["mcp__dashboard__*"]}`
- never ask: `{"allow": ["mcp__dashboard__*"]}` (every change can still be undone)

Then just ask, e.g. *"add a task to email Sam on Thursday, high priority"*,
*"what is due this week?"*, *"push every task for the client due next week back
two days; preview first"*. The server also offers three prompts (plan my day,
weekly review, triage overdue) and three resources (`dashboard://context`,
`dashboard://today`, `dashboard://schema`).

### What a model can do

Read: `get_context` (start here), `list_tasks`, `get_task`, `search_tasks`,
`list_people`, `list_countdowns`, `list_tags`, `list_calendar` and
`get_finance_summary` (both read-only; totals only, never single
transactions), `list_history`, `describe_operations`.

Change: one tool per operation (`create_task`, `update_task`, `complete_task`,
`reopen_task`, `bin_task`, `restore_task`, `reschedule_task`,
`set_task_priority`, `move_task_stream`, `add_subtask`, `update_subtask`,
`remove_subtask`, `add_task_note`, `link_person`, `unlink_person`, `add_tag`,
`remove_tag`, `create_person`, `update_person`, `create_countdown`,
`update_countdown`, `delete_countdown`, `reorder_countdowns`, `rename_tag`,
`merge_tags`, `delete_tag`), plus `apply_changes` (several at once, all or
nothing) and `undo_changes`.

Safety rails, enforced by the dashboard rather than trusted to the model:

- **Dates are ISO only** (`2026-10-08`); "next Tuesday" is refused, with today's date in the error.
- **No duplicates**: creating a task almost identical to an open one is refused and the existing one is named.
- **Wrong ids** come back with the closest matches, so the model corrects itself instead of guessing.
- **Unknown tags** are refused unless the model says it really wants a new one, so tags stay tidy.
- **Bulk changes and deletes need a preview**: more than 25 changes, or any bin/delete/merge, must be dry-run first; the real call has to carry the token from that preview.
- **Everything is undoable**: each change returns an undo token; the page's toast has an Undo button too.
- **Retries are safe**: an `idempotencyKey` makes a repeated call a no-op.
- **Nothing is lost when two things edit at once**: the page, the MCP server, scripts and other tabs all take turns on one lock, and a tab that was editing merges the other change in field by field. It only asks you when the same field was changed in both places.

### Where it runs

While the dashboard is running, the MCP server sends every call through it
(it finds it via `data/runtime.json` and authenticates with `data/local-token`),
so open tabs update at once with *"Updated by Claude Code"*. When the dashboard
is not running, it works directly on the data folder with the same rules and
the same lock; the page picks the change up when it next opens.

`--mode propose` gives a model read access plus `propose_changes` only. It can
suggest changes but never apply them: you see a preview in the dashboard and
apply it with one click. The in-app assistant uses this mode, so text inside an
email, a calendar invite or a bank transaction can never change your dashboard
on its own.

### For scripts

`node tools/actions-cli.mjs changes.json` previews a file of operations;
`--apply` applies it (`--yes` as well for deletes or more than 25 changes).
`--query tasks.list '{"view":"today"}'`, `--history`, `--undo <token>` and
`--describe` are there too. Over HTTP the same API is `POST /api/actions`,
`GET /api/query?op=...`, `POST /api/actions/undo`, with the header
`X-Dashboard-Token: <contents of data/local-token>`.

---

## Troubleshooting

**Claude says the dashboard tools are missing** — run `claude mcp list`. If
`dashboard` is not there, run the install command above; if it shows an error,
the path in it is wrong (moved folder): remove it and add it again.

**Port already in use** — a dashboard is already running, or one didn't shut
down. `start-opendash.bat --port 4174`, or kill stray `node.exe` processes.

**"Failed to fetch" / the "server isn't running" banner** — the server stopped.
Settings > Server > Open log (once it is running again) or
`data/logs/server.log` says why: `stopping: received SIGHUP (the window was
closed)`, `crash (...)` with the error, or "ended without logging a stop" (ended
from outside, e.g. Task Manager). If the window shows "giving up: the server
crashed 5 times", fix the error above it and start again.

**A hidden server** (started at login or by Start server) has no window: stop it
with Settings > Server > Stop server, or end `node.exe` in Task Manager.

**"loaded newer state from file"** — normal. OneDrive synced a change from
another machine and the dashboard adopted it.

**AI buttons missing** — the `claude` CLI isn't signed in, or `serve.mjs` can't
find it. Check the console window and `data/logs/server.log`. Set the
`CLAUDE_CLI_PATH` environment variable to the claude executable if it's
installed somewhere unusual.

**Google says "token refresh failed"** — the refresh token was revoked. Click
the top-bar button and reconnect.

**Everything is gone** — check `data/state/backups/` and `data/state/backups/daily/`. Copy the newest file over
`data/state/dashboard-state.json` (with the server stopped) and restart.

---

## Morning brief, Finish the day, weekly review

The morning brief is built in: **Home > Start my day** (it also
opens by itself the first time you open the dashboard each day; switch that off in
Settings > Morning brief). It refreshes your calendar, inbox and finances through the
usual connections, shows the weather (set your town in Settings > Profile; data by
Open-Meteo.com, fetched by the local server, no account), your schedule, Focus,
deadlines, who you are waiting on and a money line, and, with Claude connected, a
short "day in three sentences". **Finish the day** (offered from 17:00) and a guided
**weekly review** live next to it under **Review**; saved reviews are in Review >
History. Settings > Animations has the scene gallery and lets you turn motion off.
