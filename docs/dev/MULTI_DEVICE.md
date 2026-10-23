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
| the finances the computer that reads the bank published (`finance-share/finance.json`), and your finance edits from any device (`finance-share/edits.json`: categories, budgets, account names, colours, Show in Finances); encrypted sync only | the finance folder (transaction store, CSV imports, the spreadsheet, `rules.json`), bank sign-ins and connector tokens |

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

<!-- ── files ── -->
### Files in the data folder (results, caches, settings)

Whichever computer made a result or fetched a cache sends it; the others
show it. For results the copy **produced** last wins (its own `at`,
`savedAt` or `fetchedAt`), whatever order they arrive in, so a computer that
slept never puts an older copy back ([SYNC_FORMAT.md](SYNC_FORMAT.md) 8.1).
An open page reloads a file the moment it arrives, without fetching again.

| Item | | Why |
|---|---|---|
| the day adviser's review (`brief/day-advice.json`), AI summaries and story scripts (`briefs/ai/`, `briefs/story/`), what the brief showed (`briefs/days/`), Claude's scene guesses (`briefs/anim-ai.json`) | synced, newest wins | results: a computer without Claude cannot make them |
| the brief's and travel's last forecast (`briefs/weather.json`, `travel/weather.json`), online public holidays (`travel/holidays-*.json`) | synced, newest wins | the same forecast and holidays on both; no second request |
| the old v1 calendar and mail snapshots (`calendar/calendar.json`, `email/inbox.json`) | synced, newest wins | the fallback while the newer snapshots are missing |
| Gmail drafts OpenDash made (`inbox/drafts.json`) | synced | any computer can remove one |
| open pull requests and issues (`resources/github-cache.json`) | synced, newest per repository | read through one computer's GitHub server, shown on both |
| My animations (`animations/mine.json`) | synced | things you made |
| auto-link choices (`index/settings.json`: auto-attach, threshold, the judge, interval) | synced, field by field | your choices |
| auto-link's folders, names-only paths and its background switch | this computer's own | paths on this computer; a background job must not run twice |
| your choices on each source: its name, colour, on/off, and each calendar's or account's name, colour, on/off and "mine" (`source-prefs.json`, from `sources.json`) | synced, field by field | your choices; a computer that was never set up never overwrites them with its defaults |
| the source definitions (`sources.json`: iCal links, MCP server names, bank sessions, check results) | this computer's own | secret links and this computer's servers; other computers' sources show through their capabilities, account sources follow `accounts.json` |
| connection checks (`connections.json`) | this computer's own | is Claude signed in HERE; it decides what this computer can do (capabilities carry the others') |
| observed zone history (`time.json`) | this computer's own | the zone the computer is in |
| last update runs (`calendar/update.json`, `inbox/update.json`) | this computer's own | the 30-minute throttle: a copy would stop a computer reading its own accounts |
| exchange-rate caches (`travel/rates-*.json`) | this computer's own | public data each computer fetches; merging their ranges would lose some |
| undo history (`state/actions-journal.json`) | this computer's own | its tokens name this computer's state versions |
| pictures and audio (`people/images/`, `cache/narration/`) | this computer's own | binary files: sync carries JSON only |

A file too big to send (over its limit, or one value over 256 KB) stays as
it is on that computer, and Settings > Sync lists it under *Not synced from
this computer*.
<!-- ── /files ── -->

<!-- ── local ── -->
### Browser storage (what the page kept in localStorage)

Since 2.16 these are in the state (`seen`, `uiPrefs`, `drafts`: preferences, no undo step, the later choice
wins quietly; `src/app/06-core-seen.js`). A computer that updates folds its old browser values in once:
flags add up, values only fill what the state does not have yet.

| Item | | Why |
|---|---|---|
| the Morning brief seen today, Home's read-along, the full opening sequence, each story played, the stories' confetti, the weekly story opening by itself, the inbox-zero celebration, once-a-day moments (payday, birthday) | synced (`seen`, per day) | seen on one computer, not shown again on the other |
| the 2.2 animations card, the story tip, the OneDrive notice, the Trip card offer, the zone banner's travel line | synced (`seen.once`) | one-off: dismissed once for the person |
| where the opening scene rotation is (per place), the first snow of the winter | synced (`seen`) | the other computer shows the next scene, not the same one |
| moments shown and today's moment cards, departure cards dismissed, travel prompts answered "Not now", the travel chip's dots | synced (`seen`) | shown or dismissed once for the person |
| an arrival welcome shown (per place) | synced (`seen.arrival`) | one welcome per arrival; the arrival record itself stays (below) |
| the story player's volume, speed and today's mute; the animation intensity; the assistant's model; a running focus block | synced (`uiPrefs`) | preferences; the focus block follows like Focus mode |
| the weekly review in progress | synced (`drafts`) | start it on one computer, finish it on the other |
| first-paint copies: `dashboard-opening-mode`, `dashboard-opening-day`, `dashboard-motion-level` / `-last` | this browser, rewritten from the state | the splash decides before any script has the state |
| this computer's location: the location history, the arrival record, the county last welcomed | this computer's own | where this computer is (two computers in different places must not pass arrivals back and forth); the history never leaves the browser |
| "Animate anyway" (`dashboard-motion-os-override`) | this computer's own | answers this computer's own reduced-motion setting |
| the zone-change banner and the "computer is on UTC" card | this computer's own | about this computer's clock |
| window sizes (`dash-window-sizes-v1`) | this computer's own | the screen's size |
| the state cache, the sync base, the outbox and the migration marker, this browser's id, per-tab claims (notifications, travel moments), update notices (sessionStorage), the opening once per tab | this computer's own | caches and bookkeeping of this browser |
| the connections cache, the day adviser's last review, scene images (IndexedDB) | this computer's own | caches of synced files and rebuildable art |
| the day adviser's automatic-run and story prefetch throttles, the celebrations' rotation memory | this computer's own | request throttles and rolling counts (a last-writer merge would lose counts) |
| the server's start link, the offline page switch | this computer's own | this computer's set-up |
<!-- ── end local ── -->

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

## Finances on every device

The bank is read on one computer, the **finance computer**: the one that runs
the `bank` job by the rule above. With capabilities known, that is the
computer that reads a bank (a bank connector, a direct connection), else the
one that holds the finance store (CSV imports, the spreadsheet), else the
recorded role or the main computer. The first time it publishes it is
recorded as the `bank` role (`roles.json`) when none is, so two computers that
could both read the bank (the same Claude account's connector on each) never
take turns while one sleeps; choosing a main computer clears it, as for every
job. Only while sync is end-to-end encrypted;
sync off or plain sync: each computer has its own finances, as before.

- **Published** (`finance-share/finance.json`, role `published`, account
  `bank`): after every rebuild of its analysis (an update, an import, a new
  category, an account shown or hidden) the finance computer publishes what
  the Finances view and the Home money cards read: the whole analysis
  (totals, categories, recurring payments, flags, balances and their history,
  the accounts and sources the chips show, the last update's result) and every
  transaction. Compact: one register per month of transactions (rows as
  arrays, repeated words as numbers), so a new payment rewrites only its month
  and a recategorised merchant only the months it is in. Unchanged content is
  not written again. A text that looks like a credential is blanked first.
- **Shown** on the others, read only: `GET /api/finance` (and the glance, the
  money brief, the story, the export) answer from that copy with
  `meta.remote = {name, online, updatedAt}`. Finances' subtitle says
  "Finance from Home laptop · updated 5 min ago · data to …"; Home's Money
  card has the same line; before the first copy arrives, "Finance from Home
  laptop · waiting for its first update" instead of "Connect your bank".
  Connections counts the bank as the group's ("Finance from Home laptop").
- **Sync bank** there asks the finance computer (`POST /api/finance/update`
  answers 202 `{remote}`: a remote request `fetch:finance` addressed to it,
  `lib/sync/requests.mjs`); it runs its own update and publishes before the
  answer goes back. Off: the request says "Home laptop is off. Try again
  later…" and the last copy stays on show. Automatic runs ("Start my day")
  are skipped there. A CSV is imported on the finance computer (an import
  elsewhere answers 409 `FINANCE_ELSEWHERE`).
- **Edits** from any device (`finance-share/edits.json`, role `shared`, one
  register per entry, keyed by a hash so a name is never a field name): a
  merchant's category, a budget (only the categories a save changed, so a
  budget added on the other device is kept), an account's name, colour and
  Show in Finances. Two devices recategorising the same merchant write the
  same register: the later change wins everywhere and the other is listed as
  a clash in Settings > Sync; different merchants both stay. The finance
  computer applies what changed since it last applied it (to `rules.json`,
  `budgets.json`, its sources), rebuilds once and publishes; until then (it
  may be off) the others lay the categories over the copy. The shared budgets
  are the budgets on every device.

- **The Claude host** does not read banks for another computer: finances are
  one store, the finance computer's, so a bank read through Claude is read
  there (`lib/remote-jobs.mjs` `financeSyncs()` is false on purpose: a bank
  the host read for someone else would land in a finance folder nobody
  publishes). Each computer's own banks: only the finance computer's show.
- **Trial mode** (a computer that does not take changes from the others yet)
  keeps its own finances, edits and imports; its Finances and Home only say
  where they would come from ("Finance from Home laptop · turn on 'Use
  changes from my other computers' to see it").

Code: `lib/sync/finance-share.mjs` (format, pure), `lib/finance-share.mjs`
(who publishes, publish, apply, ask), the hooks in `lib/finance.mjs`
(`financeData()` answers from the copy) and `server/routes/finance.mjs`.

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
