# More than one computer: sync, connections, the main computer, safety and secrets

How the pieces fit together, in plain words. The details are in
[SYNC_FORMAT.md](SYNC_FORMAT.md) (the sync folder and its files),
[ACCOUNTS.md](ACCOUNTS.md) (mail and calendar accounts),
[GOOGLE_CONNECT.md](GOOGLE_CONNECT.md) and
[MICROSOFT_CONNECT.md](MICROSOFT_CONNECT.md) (the two one-click sign-ins),
[LIVE_SYNC.md](LIVE_SYNC.md) (computers talking to each other directly).

## Two ways to use OpenDash on two computers

1. **Sync across my devices** (Settings > Sync, off by default; the way to go).
   Each computer keeps its **own** data folder. Changes travel, field by field,
   through an `OpenDash Sync` folder inside a cloud drive you already have
   (your own OneDrive, Google Drive or Dropbox), **end-to-end encrypted**: the
   cloud stores files it cannot read. A new computer is approved from one you
   already use (six digits to compare) or with the recovery code. Trial mode
   comes first: OpenDash lists what would change and applies nothing until you
   switch *Use changes from my other computers* on. With encrypted sync,
   **live sync** also connects your computers directly (same Wi-Fi, or over the
   internet through a port your router opens), so a change shows on the other
   within a second; the folder stays the catch-up path.
2. **One data folder inside OneDrive**, opened by both computers (older
   set-ups). Only one computer at a time may write: the second one sees
   "OpenDash is open on X" and its changes wait (the write gate, below).
   Settings > Data > Move takes the folder out of OneDrive when you want sync
   instead.

## What travels, and what never does

| Travels (sync, or the shared folder) | Stays on each computer |
|---|---|
| tasks, notes, people, streams, countdowns, Home, reviews, trips, and the whole layout and every preference (theme, density, sort and grouping, the calendars you hide, the calendar mode, list or board, Focus mode, the sidebar, panel sizes, Home cards; [SYNC_FORMAT.md](SYNC_FORMAT.md) section 9) | where you are in the app (the view, the open task, the month shown), this computer's zone |
| the list of connected accounts (`accounts.json`: address, provider, features, who reads it, the ids of its snapshot files) | **every sign-in, token, app password and key** |
| the mail and calendar each account's reader saved | `config.json`, `sources.json`, `connections.json`, the local token |
| who runs which background job (`roles.json`) | the sync identity and its encryption keys |

Sign-ins never travel, on purpose: a refresh token that two computers both use
breaks on one of them (a Monzo token works only once), and a cloud folder is
the wrong place for keys.

## The full list: synced or this computer's own (2.16)

The rule (the user's, 23 Oct 2026): the dashboards are the same on every
computer; one change here makes the same change there. Only where you are,
this computer's own things (its zone, its folders, its sign-ins) and
bookkeeping stay. Every item, with the reason in one line.

### Your data (the state, field by field)

| Item | | Why |
|---|---|---|
| tasks, subtasks, statuses, notes, pinned, activity, completion log, manual order, removed built-in tasks, the bin, task and quick templates | synced | your data |
| people (and their notes), names and addresses never to link, auto-link choice | synced | your data |
| streams, countdowns and top-bar widgets, resources, tags, pinned tags, sidebar order, default stream, archive days | synced | your data |
| Home layout, focus settings, snoozes, widget settings; daily notes; notes on calendar events; calendar names and colours; weekly reviews | synced | your data and the Home page itself |
| trips: confirmed and renamed, "not a trip", travel moments already shown (`travel`) | synced (2.16) | your decisions; the zone each computer is in is not in it |
| Claude's suggestions from your mail and what you did with each thread (`emailTriage`), the suggestions' memory (`suggest`), each task's AI chat (`taskChat`) | synced | results: a computer without Claude cannot rebuild them |
| calendar and mail caches per page (`calCache`, `peopleEmailCache`), auto-link suggestions (`autolink`) | rebuilt on each computer | caches of synced data, or of this computer's file index |

### Layout and preferences (no undo step; the later choice wins quietly)

| Item | | Why |
|---|---|---|
| theme, Auto theme, density, sort, grouping, per-view options, people layout, open items in, card header, saved filter, sidebar headings and lists, scenes and animation look, unlocks | synced | preferences follow the person |
| theme while Auto is on | this computer's own | each computer turns dark in its own evening |
| list, board or review mode (`viewMode`) | synced (2.16) | layout |
| Focus mode (`focus`), sidebar folded (`sidebarCollapsed`) | synced (2.16) | layout |
| panel sizes (`paneSizes`), per panel | synced (2.16) | layout; each screen clamps them to fit |
| calendar mode and one-stream filter (`calPrefs.mode`, `.stream`) | synced (2.16) | layout; a tab on the calendar moves its view to the new mode |
| amounts hidden on Home (`homeUI.hideAmounts`) | synced (2.16) | the same on every screen |
| when you were last asked for a weekly review (`lastReviewPrompt`) | synced (2.16) | answered once, not asked again on the other computer |
| suggestion counts (`suggestStats`) | synced (2.16), field by field | the same suggestions show; the later count wins (never doubled) |
| where you are: view, open task, month and week shown, scroll and edit bookkeeping (`view`, `selectedTaskId`, `calMonth`, `weekBarOffset`, `_snappedFor`, `personEditMode`) | this computer's own | where you are, not what the dashboard looks like |
| `env`, `_lastBackup`, `_lastSave`, `_saveCount`, `_localDirty`, migration and demo markers, emptied legacy keys | this computer's own | bookkeeping |

### Settings (`config.json`; the person's part travels in `profile.json`)

| Item | | Why |
|---|---|---|
| name, own addresses, home zone, locale, currency, week start, working hours, birthday, default theme, AI choices, features switched off, brief and story settings, workspace icon | synced | the person's settings |
| travel features (on, prompts, moments, holidays, rates, second clock) | synced (2.16) | the person's settings |
| the browser-location switch inside them (`travel.sources.geo`) | this computer's own | the permission is per browser |
| the typed weather place and whether to use it (`manualLocation`, `locationMode`) | synced (2.16) | the person's place; with the typed place chosen every computer uses it |
| the place the weather is for (`location`) | this computer's own | the typed place, or this computer's own location |
| 12 or 24-hour clocks (`time.clock12`) | synced (2.16) | how you read the time |
| which zone this computer shows (`time.follow`, `.zone`, `.trip`) | this computer's own | the zone of the computer |
| browser notifications (`notifications`) | this computer's own | the permission is per browser |
| the finance folder (`financeDir`), first-run marker, file format | this computer's own | a path, and this computer's set-up |

<!-- 2.16 integration: files, finance, browser storage, AI chats and who runs Claude are filled in below -->

### Never leaves this computer

| Item | Why |
|---|---|
| `secrets/` (the device folder's sign-ins, tokens, keys, the sync identity and its keys, a pairing in progress) | secrets |
| `data-id.json`, `hosts/`, `runtime.json`, `local-token`, `launch.json`, `update-check.json` | this computer's identity, presence, server port and token, start-up and update checks |
| `migrations.json`, `migration-plans/`, `backups/`, `logs/`, `state/backups/` | this computer's migrations, backups and logs |
| `index/files.json`, `index/status.json` | the workspace file index lists this computer's files |
| this computer's sync folder (`settings.json`, `device.json`, `meta.json`, `conflicts.jsonl`) | sync's own bookkeeping |

## Connections: each account is read on one computer

An account is read by **one** computer, its *fetcher*: the one where you
connected it (its sign-in is there). The others show what it saved, and the
card says "Home PC checks this account". **Fetch on this computer instead**
moves the job, but only to a computer that holds its own sign-in for that
account: without one OpenDash says *Sign in on this computer to take over* and
offers *Sign in on this computer*. An account nobody reads yet is never taken
by a computer without its sign-in.

The same mailbox connected twice (through the Claude Gmail connector and as a
Google account) shows each thread once.

## The main computer

Background jobs that must not run twice (bank updates, AI summaries and day
reviews, story scripts, the Claude connector updates) run on the **main
computer** (Settings > Sync > Main computer); the others show "Runs on <name>".
A click always runs where you clicked. While a move copies the data, nothing
runs automatically.

**One rule for both** (`lib/sync/roles.mjs`): live sync's lease first, when
it has an answer (for each account and the phone: an election among the
computers that hold the sign-in and run in the background, pinned to the
recorded fetcher; it moves the job while that computer sleeps and gives it
back when it wakes); else an account follows its own fetcher and a job its own
role, else the main computer; with nothing recorded every computer runs it
(sync off) or the first computer that can takes it (sync on). Every account
fetch (the scheduled inbox and calendar jobs, *Check now*, the first read after
connecting) asks this rule. One place records it: `accounts.json` for accounts,
`roles.json` for jobs, with sync on or off. The sync engine's
`isFetcher / fetcher / setFetcher / clearFetcher` is the only implementation;
`lib/main-computer.mjs` is a view on it.

## Safety

- **Write gate** (`lib/hosts.mjs`): each computer that has a data folder open
  leaves a small presence file in `hosts/`. When another computer is live,
  writes answer `423 OTHER_COMPUTER` and the page shows the banner with
  *Use here anyway*. OneDrive's conflict copies (`file-<DEVICE>.json`) are
  shown, never merged.
- **Work or school OneDrive** (`lib/onedrive.mjs`): `%OneDrive%` names the
  account added last, often the work one. OpenDash never chooses a work or
  school OneDrive for your data by default (sync, the daily encrypted copy),
  and warns when the data folder already is in one.
- **Sync** writes only through the state store (the same gate), locks the
  account and snapshot files while it merges them, keeps clashes in a list,
  and refuses anything it cannot check (a wrong key, a newer format).

## Secrets

- Each computer keeps a **device folder** per data folder
  (`lib/devicedir.mjs`: `%LOCALAPPDATA%\OpenDash\<data id>` on Windows,
  `~/Library/Application Support/OpenDash/<data id>` on macOS,
  `~/.local/state/opendash/<data id>` on Linux), found by the data folder's
  random id. Its `secrets/` (through `lib/secret-store.mjs`) holds every
  sign-in and key; `host.json` is this computer's id, which is also the id an
  account's fetcher and the main computer are recorded by. Sync's own files
  live under the same per-computer base (`sync/<key>`). An old `<data>/secrets`
  moves there once.
- A release ships the project's own Microsoft and Google app registrations in
  the **zip only** (`tools/release-client-ids.mjs`, see
  [RELEASING.md](RELEASING.md)); the repository keeps placeholders.
- Tests never touch the real per-computer folder (temp device folder), and can
  never start the real Claude, Codex or Gemini CLI (`lib/spawn-guard.mjs`).

## For phone and desktop apps later

The cores have no `node:` imports and run anywhere: `lib/sync/*` (except
`node-host.mjs` and `folder.mjs`), `lib/sync/roles.mjs`, `lib/accounts/*`. An
app supplies adapters: file or app storage, the cloud folder or a cloud API,
the secret store (an OS keychain), the sign-in redirect (custom scheme), and
`fetch`. `tests/sync-portable.test.mjs` and `tests/accounts-core.test.mjs`
keep them pure. What is stored where, for users: [../PRIVACY.md](../PRIVACY.md).
