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
| tasks, notes, people, streams, countdowns, Home, reviews, and your preferences (theme, density, sort and grouping, the calendars you hide, per-view options, Home cards; [SYNC_FORMAT.md](SYNC_FORMAT.md) section 9) | where you are in the app (view, open task, calendar mode), Focus mode, panel sizes, this computer's zone and trips |
| the list of connected accounts (`accounts.json`: address, provider, features, who reads it, the ids of its snapshot files) | **every sign-in, token, app password and key** |
| the mail and calendar each account's reader saved | `config.json`, `sources.json`, `connections.json`, the local token |
| who runs which background job (`roles.json`) | the sync identity and its encryption keys |

Sign-ins never travel, on purpose: a refresh token that two computers both use
breaks on one of them (a Monzo token works only once), and a cloud folder is
the wrong place for keys.

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

## The Claude host

One computer is the **Claude host**: the one with Claude and the claude.ai
connectors (Settings > Sync > Claude > *Claude host*; until one is picked, the
main computer). It is recorded once for every device (`roles.json` role
`claude`). The rule (`lib/sync/claude-host.mjs` `claudeRoute`): while the
host is reachable, **all AI work** (the remote-marked routes: `/api/ai` with
task chat and email suggestions, the day adviser, the brief summaries, story
scripts) **and every Claude-run fetch** (the Google Calendar and Gmail
connectors, MCP servers; the bank through Claude once the money syncs) goes to
it, even from a computer that has Claude too. Only when it is off does a
computer run the work itself, if it has Claude; without Claude it says "Home
laptop is off".

- **Reachable**: live sync's `claude` lease decides when it has an answer
  (the lease is pinned to the host; another holder means the host's claim ran
  out, so two computers that both think they are the host follow one holder).
  Without it: an open live link, or seen in the last 2 minutes. The host must
  also claim the request within 8 seconds.
- **Run Claude on** (each computer's own choice, never synced: its sync
  folder's `claude-host.json`): *<host> first, then this computer* (default),
  *This computer only*, *Only <host>*. A computer set to *Only <host>* never
  takes the `claude` lease, so it never stands in for the host.
- **Status**, in plain words: "Claude: using Home laptop", "Home laptop is
  off: using this computer", "Home laptop is off". The toast of a request
  follows it ("Asking Home laptop…", then "Home laptop is off: using this
  computer…").
- **One result, never two.** A request this computer may run itself carries
  `hostFirst`. The asker is the only arbiter and writes only its own fields:
  `grant` (the go-ahead, 60 s, renewed while the host's 10-second heartbeats
  `beat` arrive), `back` (taken back) and `local` (its own run). The host
  starts only with the go-ahead, and saves anything (the route's file, its
  answer: `c.remoteCommit`) only while it holds (`mayRun`: until the go-ahead
  ends minus 10 s by its clock, never once it sees `back`). The asker takes a
  request back when it was not claimed in 8 s, when the host released it (it
  restarted, or never got the go-ahead), or 10 s after the go-ahead ran out
  (the host went off mid-request). The host's late answer is thrown away and
  its Claude runs are cancelled (`withAbortSignal` in `lib/claude-runner.mjs`).
  Clocks may differ by up to 10 s (Settings > Sync warns when they differ more).
  A host on an older version (its capabilities lack `host: 1`) does not wait
  for the go-ahead, so a computer with Claude keeps running its own work, as
  before, until both are up to date.
- **Fetches**: a click on Update leaves the Claude-run sources the host reads
  too to the host (`hostFetch`) and reads the rest here; a source the host's
  connectors miss is read here (fallback for that source only). The host runs
  a fetch only with the go-ahead and this computer only after taking it back,
  so a fetch never runs twice. The automatic Claude jobs (AI summaries,
  reviews, story scripts, the connectors' update) follow the host too, and the
  `claude` lease holder while the host sleeps.

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
