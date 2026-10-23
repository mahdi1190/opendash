# More than one computer: sync, connections, the main computer, safety and secrets

How the pieces fit together, in plain words. The details are in
[SYNC_FORMAT.md](SYNC_FORMAT.md) (the sync folder and its files),
[ACCOUNTS.md](ACCOUNTS.md) (mail and calendar accounts),
[GOOGLE_CONNECT.md](GOOGLE_CONNECT.md) and
[MICROSOFT_CONNECT.md](MICROSOFT_CONNECT.md) (the two one-click sign-ins).

## Two ways to use OpenDash on two computers

1. **Sync across my devices** (Settings > Sync, off by default; the way to go).
   Each computer keeps its **own** data folder. Changes travel, field by field,
   through an `OpenDash Sync` folder inside a cloud drive you already have
   (your own OneDrive, Google Drive or Dropbox), **end-to-end encrypted**: the
   cloud stores files it cannot read. A new computer is approved from one you
   already use (six digits to compare) or with the recovery code. Trial mode
   comes first: OpenDash lists what would change and applies nothing until you
   switch *Use changes from my other computers* on.
2. **One data folder inside OneDrive**, opened by both computers (older
   set-ups). Only one computer at a time may write: the second one sees
   "OpenDash is open on X" and its changes wait (the write gate, below).
   Settings > Data > Move takes the folder out of OneDrive when you want sync
   instead.

## What travels, and what never does

| Travels (sync, or the shared folder) | Stays on each computer |
|---|---|
| tasks, notes, people, streams, countdowns, Home, reviews | where you are in the app, theme, panel sizes, this computer's zone and trips |
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

**One rule for both** (`lib/sync/roles.mjs`): an account follows its own
fetcher; a job follows its own role, else the main computer; with nothing
recorded every computer runs it (sync off) or the first computer that can
takes it (sync on). One place records it: `accounts.json` for accounts,
`roles.json` for jobs, with sync on or off. The sync engine's
`isFetcher / fetcher / setFetcher / clearFetcher` is the only implementation;
`lib/main-computer.mjs` is a view on it (a later leader election can answer for
the main role behind the same calls).

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
