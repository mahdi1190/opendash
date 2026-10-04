# Installing OpenDash

OpenDash runs on your own computer: a small local server (Node.js) and a page
in your browser at <http://localhost:4173>. There is no account, no database
and no `npm install`. Your data stays in one folder on your computer.

- [What you need](#what-you-need)
- [Windows](#windows)
- [macOS](#macos)
- [Linux](#linux)
- [The first run](#the-first-run)
- [Launcher options](#launcher-options)
- [Where your data lives](#where-your-data-lives)
- [Updating to a new release](#updating)
- [Uninstalling](#uninstalling)
- [If something goes wrong](#if-something-goes-wrong)

## What you need

| What | Needed for | Where to get it |
|---|---|---|
| **Node.js 20 or newer** | everything | <https://nodejs.org> (choose the LTS version) |
| A modern browser | everything | Chrome, Edge, Firefox or Safari |
| **Claude Code** (optional) | the assistant, smart suggestions, Gmail, Calendar and bank sync | see [CONNECTIONS.md](CONNECTIONS.md) |

OpenDash itself is free and open source (MIT). The optional AI features use
your own Claude plan through Claude Code; OpenDash adds no cost of its own.

### Which file to download

Releases are on the [Releases page](https://github.com/mahdi1190/opendash/releases/latest).
Under **Assets**, download **`opendash-v<version>.zip`** (for example
`opendash-v2.0.0.zip`). It is the same for Windows, macOS and Linux, and it
unzips to a single folder, `opendash-v<version>/`.

The "Source code" archives GitHub adds to every release also work, but the
release zip is the one that has been built, scanned and tested for each
release (and it has the right line endings for Windows and the executable flag
on the shell launcher).

**Optional: check the download.** Each release also has `SHA256SUMS.txt`.
Compare the line for the zip with the checksum of your copy:

- Windows (PowerShell): `Get-FileHash .\opendash-v2.0.0.zip -Algorithm SHA256`
- macOS: `shasum -a 256 opendash-v2.0.0.zip`
- Linux: `sha256sum -c SHA256SUMS.txt` (in the folder holding both files)

Releases built by GitHub Actions also carry a signed build-provenance
attestation. With the GitHub CLI you can check it:
`gh attestation verify opendash-v2.0.0.zip --repo mahdi1190/opendash`.

## Windows

1. **Install Node.js.** Download the LTS installer from <https://nodejs.org> and
   run it with the default options, or in PowerShell:

   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

   Open a **new** PowerShell window and check the version (it must be 20 or
   newer):

   ```powershell
   node -v
   ```

2. **Download** `opendash-v<version>.zip` from the Releases page.

3. **Unzip it** somewhere of your own, for example `Documents`: right-click the
   zip, choose *Extract All...*, pick the folder. You get a folder named
   `opendash-v<version>`; rename it `OpenDash` if you like. Do not run OpenDash
   from inside the zip. A path with spaces is fine.

   Windows suggests a destination that already ends in `opendash-v<version>`,
   and the zip holds a folder of that name too, so you may get
   `opendash-v<version>\opendash-v<version>`. That is fine: the app folder is
   the one with `start-opendash.bat` in it (or delete the last
   `\opendash-v<version>` from the destination before you extract).

   If Windows blocks files downloaded from the internet, right-click the zip,
   choose *Properties*, tick *Unblock*, then extract it again.

4. **Start it**: double-click **`start-opendash.bat`** in that folder.

   A console window opens. It checks Node, prepares your data folder, builds
   the app and starts the server; your browser then opens
   <http://localhost:4173>. Keep the window open while you use OpenDash; closing
   it (or pressing Ctrl+C) stops OpenDash.

5. **Optional shortcut**: right-click `start-opendash.bat`, choose
   *Show more options* > *Send to* > *Desktop (create shortcut)*, and rename the
   shortcut "OpenDash".

To start OpenDash automatically when you log in, without a window, turn on
*Start automatically when I log in* in **Settings > Server** (off by default,
for your account only, no administrator rights needed).

## macOS

1. **Install Node.js**: the macOS installer from <https://nodejs.org>, or with
   [Homebrew](https://brew.sh):

   ```sh
   brew install node
   ```

   Check it in Terminal (20 or newer):

   ```sh
   node -v
   ```

2. **Download** `opendash-v<version>.zip` from the Releases page. Safari usually
   unzips it for you; otherwise double-click the zip in Finder. You get a
   folder named `opendash-v<version>`.

3. **Move the folder** somewhere permanent and give it a simple name, for
   example `~/OpenDash` (your home folder).

4. **Start it** in Terminal:

   ```sh
   cd ~/OpenDash
   sh start-opendash.sh
   ```

   Your browser opens <http://localhost:4173>. Keep the Terminal window open;
   Ctrl+C or closing it stops OpenDash.

   Running it with `sh` works even if the file lost its "executable" flag. To
   use `./start-opendash.sh` instead, run `chmod +x start-opendash.sh` once.

To start it at login, **Settings > Server** shows how to add a Login Item or a
LaunchAgent that runs `start-opendash.sh --no-open`.

## Linux

1. **Install Node.js 20 or newer.** Distribution packages are sometimes older,
   so check with `node -v` first. If yours is older than 20, use one of:

   - the official binaries or instructions on <https://nodejs.org>;
   - a version manager such as [nvm](https://github.com/nvm-sh/nvm):
     `nvm install --lts`;
   - your distribution's newer Node package, if it has one.

2. **Download and unzip**:

   ```sh
   cd ~
   unzip ~/Downloads/opendash-v2.0.0.zip
   mv opendash-v2.0.0 opendash
   ```

   This gives you the folder `~/opendash` (the zip holds one folder,
   `opendash-v2.0.0`, renamed here for a shorter path).

3. **Start it**:

   ```sh
   cd ~/opendash
   sh start-opendash.sh
   ```

   OpenDash opens <http://localhost:4173> with `xdg-open`. On a machine without
   a desktop browser, add `--no-open` and open the address yourself.

To start it at login, **Settings > Server** shows how to add an entry to
`~/.config/autostart` or a systemd user service that runs
`start-opendash.sh --no-open`.

## The first run

The first time, a short welcome asks for:

1. **Your name** (used in greetings and the window title) and, optionally,
   **your email addresses**, so OpenDash can tell your own calendars from other
   people's.
2. **Your region**: time zone, date format, currency and the first day of the
   week, detected from your computer, and optionally a **town for the
   weather** (the name you type is sent to Open-Meteo to find it; leave it
   empty and OpenDash makes no weather requests).
3. **A starting set of streams**, the big areas your tasks belong to: *Work and
   life*, *Freelance*, *Study and research* or *Minimal*. You can rename, add
   or archive streams any time. The theme is chosen here too.
4. Whether to start with a clean slate or **load demo data** to look around
   first. Demo data is invented; reset it later in Settings > Data >
   *Reset app data*. This step also says whether Claude is connected: if
   Claude Code is already installed and signed in on this computer, OpenDash
   finds it by itself ([PRIVACY.md](PRIVACY.md#what-is-sent-to-claude-and-when)).

Then you land on **Home**; from the next day the Morning brief opens by itself
on your first visit (Settings > Morning brief turns that off). Press <kbd>Q</kbd>
to add your first task. Everything can be changed later in **Settings**. If you
like, open **Connections** to connect Claude, your calendar, email or bank
([CONNECTIONS.md](CONNECTIONS.md)). OpenDash works fully without them.

## Launcher options

Both launchers pass these on to the server:

| Option | What it does |
|---|---|
| `--port 4300` | use another port (default 4173) |
| `--data-dir <folder>` | keep your data in another folder (default: `data` next to the app) |
| `--finance-dir <folder>` | keep the finance files in another folder (default: inside the data folder) |
| `--no-open` | do not open the browser |

Give them in a terminal opened in the app folder. On Windows, open the folder
in File Explorer, right-click an empty spot and choose *Open in Terminal*, then
start the launcher with `.\` in front (PowerShell does not run a file from the
current folder without it; `cmd.exe` accepts it too):

```powershell
.\start-opendash.bat --data-dir "D:\My OpenDash data" --port 4300
```

```sh
sh start-opendash.sh --data-dir ~/opendash-data --no-open
```

The options apply to that start only. To use them every time on Windows, add
them to the end of your shortcut's *Target* (right-click the shortcut >
*Properties*), after the quoted path to `start-opendash.bat`.

Instead of `--data-dir` you can set the environment variable
`DASHBOARD_DATA_DIR`.

Earlier versions called the launchers `start-dashboard.bat` and
`start-dashboard.sh`. Those names still work (they run `start-opendash.*` with
the same options), so shortcuts made for an older version keep working; use
`start-opendash.*` for anything new.

Each time, the launcher checks your Node version, upgrades the data folder if
the new version needs it (after backing it up), rebuilds `index.html` and
starts the server under a small supervisor that restarts it if it crashes.

## Where your data lives

Everything that is yours lives in **one data folder**: `data/` next to the
app, unless you chose another one. The app's own files never contain your data,
so you can replace them freely.

| What | Where |
|---|---|
| Settings (name, region, theme, AI and notification choices) | `data/config.json` |
| Tasks, people, tags, countdowns, reviews | `data/state/dashboard-state.json` |
| Automatic backups (every 10 minutes at most when something changed; one a day for 30 days) | `data/state/backups/`, `data/state/backups/daily/` |
| Finances (imported CSVs, categories, budgets, analysis) | `data/finance/` |
| Calendar and email snapshots | `data/calendar/`, `data/inbox/`, `data/email/` |
| Data sources and connection status | `data/sources.json`, `data/connections.json` |
| Server log (no task text, email content or money) | `data/logs/server.log` |
| Copies made before each upgrade (the last 5) | `data/backups/` |
| The per-install token for local programs | `data/local-token` |
| Optional Google sign-in files | `data/secrets/` |

Your browser also keeps a little: interface preferences, a fallback copy of
unsaved edits while the server is down, and the offline page (the app page
only, never your tasks).

- **Back up**: backups are automatic, and Settings > Data lists them with
  one-click restore. *Export all data (.zip)* makes a single file you can keep
  elsewhere.
- **Move to another computer**: *Export all data (.zip)* on the old one,
  install OpenDash on the new one, then *Import data*. Connections are set up
  again on the new computer.
- **Cloud-synced folders** (OneDrive, Dropbox, iCloud Drive) work for the data
  folder, but run OpenDash on **one computer at a time**: sync tools copy files,
  they do not merge edits made in two places at once.
- Keep the data folder private, and out of any public repository.

## Updating

Your data is never inside the app's code, so updating means: new app files,
same data folder.

1. **Optional**: Settings > Data > *Export all data (.zip)* for an extra copy.
2. **Stop OpenDash**: Settings > Server > *Stop server*, or close its window.
3. **Windows only**: if you turned on *Start automatically when I log in* or
   *Enable the Start server button* and the new version goes into a different
   folder, turn both off now (they point at the old folder) and on again in the
   new version.
4. **Download and unzip** the new release into a **new** folder.
5. **Bring your data**: move the `data` folder from the old app folder into the
   new one. (If you use `--data-dir`, there is nothing to move: keep using the
   same option.)
6. **Start** the new version with its launcher. It copies your data folder to
   `data/backups/pre-migrate-<date>/` and applies any upgrades the new version
   needs, then starts as usual.
7. **If you use the OpenDash MCP server** and the app folder changed, open
   Connections > OpenDash MCP: it says when your Claude still points at the old
   copy and shows the commands to update it ([MCP.md](MCP.md)).
8. Once everything works, delete the old folder.

Read the [changelog](CHANGELOG.md) before a major version (for example 2.x to
3.x): a data folder upgraded by a newer major version may not open in an older
one. Keep the old folder until you are happy with the new version.

### Going back to an older version

Older versions do not check whether a newer one has upgraded the data folder,
so do not point an older version at a data folder a newer one has used.
Instead, go back to the copy the launcher made just before the upgrade:

1. **Stop OpenDash.** If you want to keep anything you did after the upgrade,
   make a note of it first (or *Export all data (.zip)*): the copy is from
   before the upgrade, so later changes are not in it.
2. **Rename** the current `data` folder, for example to `data-newer`. Keep it
   until you are sure.
3. **Make a new, empty `data` folder** and copy into it everything inside the
   newest `data-newer/backups/pre-migrate-<date>/` folder (the newest one that
   was made by the upgrade you are undoing).
4. **Start the older version** with that `data` folder (in its own app folder,
   or with `--data-dir`).

The copy leaves out the backup folders (`backups/`, `state/backups/` and the
finance backups) and the logs, so those start empty. Copies are kept for the
last 5 upgrades.

## Uninstalling

1. **Optional**: Settings > Data > *Export all data (.zip)* if you want to keep
   your data.
2. **Windows**: in Settings > Server, turn off *Start automatically when I log
   in* and *Enable the Start server button*. This removes exactly what they
   added to your Windows account.
3. **If you connected your own Claude** to OpenDash, remove it:

   ```sh
   claude mcp remove --scope user dashboard
   ```

   (`dashboard` is the name the Set up panel uses; if you chose another name,
   such as `opendash`, use that). For Claude Desktop, delete that entry from
   `claude_desktop_config.json`. Remove any `mcp__dashboard__` (or
   `mcp__<your name>__`) permission rules you added to `~/.claude/settings.json`.
4. **Stop OpenDash** (Settings > Server > *Stop server*, or close its window).
5. **Delete the app folder.** This also deletes the data folder inside it,
   permanently. If you used `--data-dir`, delete that folder too when you no
   longer need the data.
6. **Browser**: clear the site data for `http://localhost:4173` (in your
   browser's site settings) to remove the offline page and interface
   preferences.
7. Node.js, Claude Code and any claude.ai connectors are separate programs and
   services; remove or disconnect them separately if you no longer need them.

## If something goes wrong

| Problem | What to do |
|---|---|
| "Node.js is not installed" or "needs Node.js 20 or newer" | install the current LTS from <https://nodejs.org>, then open a new terminal window |
| "Port 4173 is in use by something that is not OpenDash" | another program uses the port (if it is OpenDash itself, the launcher just opens it): start with `--port 4174`, as in [Launcher options](#launcher-options) |
| The page says the server isn't running | start it with the launcher; Settings > Server > *Open log* (or `data/logs/server.log`) says why it stopped |
| AI buttons are greyed out | open Connections and connect Claude ([CONNECTIONS.md](CONNECTIONS.md)) |
| A data upgrade failed | nothing was started; your backup is in `data/backups/`. Copy the error (without personal details) into a bug report |
| Anything else | Settings > Diagnostics > *Copy diagnostics*, then see the [FAQ](FAQ.md) or ask in [Discussions](https://github.com/mahdi1190/opendash/discussions) |
