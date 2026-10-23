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
| the mail and calendar each account's reader saved; results, caches and the person's settings (below) | this computer's paths and zone in `config.json`, the source definitions in `sources.json` (secret links), `connections.json` (what works here), the local token |
| who runs which background job (`roles.json`) | the sync identity and its encryption keys |
| people's pictures and story narration clips, as sealed blobs fetched when first shown (`blobs/index.json` names them; [SYNC_FORMAT.md](SYNC_FORMAT.md) section 12); encrypted sync only, 200 MB for the group | without encryption, pictures and clips stay on the computer that has them |
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
| Claude's suggestions from your mail and what you did with each thread (`emailTriage`), the suggestions' memory (`suggest`) | synced | results: a computer without Claude cannot rebuild them |
| every AI conversation: each task's chat (`taskChat`), the assistant's conversation and its proposal cards (`assistantChat`), read and cleared marks (`chatMeta`) | synced, messages by id in time order | the same conversation everywhere, each message once ([SYNC_FORMAT.md](SYNC_FORMAT.md) 9.3) |
| older messages of a long chat (`chatArchive`) | this computer's own | kept where they were; the others say "N older messages on <computer>" |
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
| Finances' AI choices: Claude's wording of the money brief and story on or off, their models, the bank country (`finance.briefAi`, `.briefModel`, `.storyModel`, `.country`; Settings > AI) | synced (2.15.2), field by field | the person's settings |
| how Enable Banking returns to this computer (`finance.ebRedirect`) | this computer's own | it belongs to the Enable Banking app saved on this computer (its sign-in is in this computer's secrets) |
| the finance folder (`financeDir`), first-run marker, file format | this computer's own | a path, and this computer's set-up |

### AI proposals, finances and who runs Claude

| Item | | Why |
|---|---|---|
| proposals waiting for Apply and their state (`state/proposals.json`) | synced, per proposal and part | applied or dismissed on one computer, shown as such on all; ids it creates come from the proposal, so it is never applied twice |
| the finance numbers the Finances view and the Home money cards show (`finance-share/finance.json`) | published by the finance computer | the bank or the spreadsheet is read on one computer; the others show "Finance from <computer>" instead of "Connect your bank" (section *Finances on every device*) |
| your finance edits: categories, budgets, account names, colours, Show in Finances (`finance-share/edits.json`) | synced, per entry | made on any computer; the finance computer applies them once |
| the finance folder (transactions, CSV imports, the spreadsheet and its path, `rules.json`), bank sign-ins | this computer's own | files and secrets of the computer that reads the bank |
| which computer is the Claude host (`roles.json` `claude`) | synced | one host for every computer (section *The Claude host*) |
| Run Claude on: the host first, then this computer / this computer only / only the host | this computer's own | each computer's own choice |
| the requests one computer sends another (`requests.json`) | synced, per request and field | the asker and the runner write different fields; one result is used, never two |


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
| people's pictures and story narration clips (`people/images/`, `cache/narration/`) | synced with encrypted sync (2.16), as sealed blobs | a picture or clip made on one computer is fetched on the other the first time it is shown (the initials or the computer voice until then); a clip is never paid for twice. 5 MB per file, 200 MB for the group, clips only while it is under 75 %; Settings > Sync shows *Pictures and audio: 34 MB of 200 MB* ([SYNC_FORMAT.md](SYNC_FORMAT.md) section 12) |

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
| Finances' display choices: chart modes, sorts, page size, income and transfers shown, compare (`uiPrefs.finance`, from `dash-finance-ui-v1`) | synced (`uiPrefs`, per field; 2.15.2) | preferences; this browser's old choices only fill what the state does not have |
| the transactions seen at the last visit to Finances > Transactions (`seen.financeTx`, from `dash-finance-seen-v1`) | synced (`seen`; 2.15.2) | new rows are marked once, on whichever computer you look; shortened opaque row keys, no amount or merchant |
| where you are in Finances (the section, the date range, the filters, the budget picked), the category colour slots, budgets kept in the browser while the server lacked the route (`dash-finance-ui-v1`) | this computer's own | where you are; the slots are worked out from your spending, and a budget is an amount |
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
| this computer's sync folder (`settings.json`, `device.json`, `meta.json`, `conflicts.jsonl`, `conflicts-done.json`, `changes.json`, `health.json`) | sync's own bookkeeping (the clashes reviewed, "What changed", the Health checks' memory) |

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
- **Connections > Money** there lists the finance computer's accounts from
  the same copy (`GET /api/fin-connect/accounts` `remote`), per connection
  "Connected on Home laptop": name, bank, colour, last update, *Show in
  Finances*, rename and colour, which are shared edits (below). Its own
  connections, if any, show under "On this computer". *Advanced > Sign in to
  this bank on this computer instead* starts that bank's sign-in here; once
  signed in, this computer becomes the finance computer (`POST
  /api/finance/here` records the `bank` role here and reads the bank).
- **While the finance computer is away** (presence: `lib/sync/presence.mjs`
  asleep, off or outdated; `meta.remote.state`) every money surface says it
  calmly, with a grey dot instead of a warning: "Finance from Home laptop ·
  last update 2 h ago (it's off)" (`src/app/65-finance-view.js`
  `financeRemoteLine`). Sync bank then shows a note ("Home laptop is off right
  now. This is what it last sent…"), never an error.
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

- **Reachable**: presence first (section *What you see when a device is
  off*): a host that is asleep or off is never asked. Then live sync's
  `claude` lease decides when it has an answer (the lease is pinned to the
  host; another holder means the host's claim ran out, so two computers that
  both think they are the host follow one holder). Without either: an open
  live link, or seen in the last 2 minutes. The host must also claim the
  request within 8 seconds (at once taken back if presence sees it go away).
- **Run Claude on** (each computer's own choice, never synced: its sync
  folder's `claude-host.json`): *<host> first, then this computer* (default),
  *This computer only*, *Only <host>*. A computer set to *Only <host>* never
  takes the `claude` lease, so it never stands in for the host.
- **Status**, in plain words: "Claude: using Home laptop", "Home laptop is
  asleep: using this computer", "Home laptop is off". The toast of a request
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

## What you see when a device is off

The rule (the user's, 23 Oct 2026): it must be clear when something does not
work, and a computer that is off must not cause a stream of error messages.
So every computer knows, for each of your other devices, whether it is there
(**presence**, `lib/sync/presence.mjs`), and everything that needs another
device asks presence **first**.

### The states

| State | Means | How it is known |
|---|---|---|
| **open** | its server runs and a dashboard page is open on it | an open live link and its `pres` message says `page: true`; or, through the folder, a heartbeat in the last 3.5 minutes whose `page.open` is true. A page counts as open while its event stream (`/api/events`) is connected or it asked for presence in the last 90 s |
| **running** | its server runs, no page is open | an open live link; or a device.json heartbeat (every 2 minutes) in the last 3.5 minutes (the cloud folder may take a minute or more to bring it) |
| **asleep** | nothing heard for a while, seen in the last 12 hours | no heartbeat for over 3.5 minutes; or, much sooner, its live link went quiet (closed after 45 s without a word), could not be dialled again and stayed away for 30 s, with nothing newer through the folder |
| **off** | it said goodbye, or not seen for longer | a clean stop sends `pres {stopping}` on every link and writes a goodbye device.json (`stoppedAt`): "off" at once, not "asleep"; or not seen for over 12 hours |
| **outdated** | it runs (open or running) an older OpenDash than this one | its version (device.json `app`, or the `pres` message) is older; `version` says which |

**The API (stable).** `presenceOf(id)` (a sync device id or a fetcher id; null
when unknown or sync is off) and `presenceAll()` (every other device; `[]`
with sync off), from `lib/sync/presence.mjs`. Each row:

| Field | Values |
|---|---|
| `state` | `open` \| `running` \| `asleep` \| `off` \| `outdated` (`STATES`): the one state above |
| `base` | `open` \| `running` \| `asleep` \| `off` (`BASES`): the same without *outdated* |
| `word` | `online` \| `asleep` \| `off` \| `checking` (`WORDS`): the short word the texts use (`open`, `running` and `outdated` are all `online`) |
| `reachable` | true when `base` is open or running and it is not `checking`: the one test for "may I ask it now?" |
| `checking` | this computer woke in the last 45 s and has no news from it yet |
| `outdated`, `version` | it runs an older OpenDash; its version string |
| `path` | `live` \| `folder` \| null: how it was heard |
| `lastSeen`, `ago` | when it was last heard (ms, this computer's clock), and how long ago |
| `page` | a dashboard page is open on it |
| `behind` | this computer's changes it has not received yet |
| `why` | `stopped` (it said goodbye), `link-gone`, `quiet`, `never`, or null |
| `name`, `kind`, `deviceId`, `fetcherId` | who it is |
| `short`, `text` | "Mac is asleep" / "Asleep · last seen 2 h ago" |

`isThere(x)` accepts any of the three vocabularies (`open`, `running`,
`outdated`, `online` are there). `calmText(p, kind, opts)` makes the calm lines
below (`changes`, `claude`, `fetch`, `finance`, `request`). The server binds its
tracker once (`lib/sync-presence.mjs`), and the engine's `groupCaps()` rows carry
`reachable`, so `isOnline` (`lib/sync/caps.mjs`) and `reachable`
(`lib/sync/claude-host.mjs`) follow it.

- **Clocks.** The other device's `lastSeen` is its own clock. It is used only
  until this computer has watched its device.json change (`observedAt`, this
  computer's clock); a time in the future counts as now. The page state is
  read against the same record, so it needs no clock at all.
- **Sleep and wake.** A computer that wakes (its timers fire more than 30 s
  late) writes device.json at once and dials every member (`engine.touch`,
  `live.wake`): the others see it back within seconds of its link opening.
  For 45 s after waking, this computer marks the others **checking**
  ("Checking Mac…") until their news comes in, and never treats old news as
  "reachable".

### What happens, and what you see

Nothing waits for a request that can only time out, nothing that can run here
is refused, and changes wait in the sync folder as always (they are never
lost; the other device takes them when it is back).

| You do | The device it needs is asleep or off | You see |
|---|---|---|
| edit anything | the change waits in the sync folder | the top bar: "Mac off · 3 changes waiting" |
| AI work (task chat, email suggestions, the day adviser, summaries, story scripts) with Claude here | runs here at once (no 8-second wait) | "Mac is asleep: using this computer" |
| the same without Claude here | nothing is asked (503 `PEER_OFF` / `HOST_OFF`, `calm: true`) | "Mac is asleep. Claude answers there when it's back." |
| Update the calendar or email | the devices that are away are not asked; this computer reads its own | "Mac is asleep: its calendar shows what it last sent." |
| Sync bank, Finances, Home's money cards on a computer that shows another's finances | the finance code asks `presenceOf(<finance computer>)` (section *Finances on every device*) | "Finance from Mac · last update 2 h ago (it's off)"; the Home card and the palette show a calm `skipped` answer as one calm line |
| something it was asked to do, and it went away meanwhile | taken back (a host-first request at once) or ended calmly (`HOLDER_OFFLINE`, `calm: true`) | "Mac is off. It runs this when it's back." |

**Calm, not errors.** These lines carry `calm: true` from the server. The
page (`src/app/56-presence.js`) shows them with a moon, never red, through
`toast()`: a toast whose words only say a device is away is shown calmly,
the same line again within 5 minutes only pulses the sync dot, and identical
toasts collapse into one. "Try again" is never offered for a device that is
away.

### The sync dot in the top bar

Next to *Saved*, hidden while sync is off:

| Dot | Words | When |
|---|---|---|
| green | "In sync · Mac online" | the others are there (or some are, and the rest catch up later) |
| grey | "Mac off · 3 changes waiting" | nobody else is there now; nothing is wrong |
| amber | "Needs attention" | sync is locked or in error, or a version notice is waiting; a click shows why |
| spinning | "Sending…" | changes on their way over a live link |

A click opens the panel: every device with its state (Online, Asleep, Off,
Older version, Checking), what it is doing (dashboard open or not), when it
was last seen, its OpenDash version and how it is reached (live on the same
network or over the internet, or the sync folder), and *Sync settings*.
`GET /api/sync/presence` answers it; the live event `presence` brings a
change at once.

### An older version on another device

"Mac is on 2.15.0: update it to sync everything": one gentle notice per device
and version (`src/app/56-presence-notice.js`): a toast once, then at the top of
the panel with *Dismiss* (the dot is amber until then). Shown and dismissed
are synced seen flags (`seen.once`), so the other computer does not repeat it.

## When something goes wrong

**Settings > Sync > Health** (also *Needs attention* in the sync dot's panel)
checks everything below on this computer and lists it in plain words, worst
first; every problem has **one** fix: a button, or steps to follow (often
both: the button opens the right place, the steps say what to change there).
*Check again* repeats this computer's own checks (they are kept 90 seconds
otherwise). The checklist is `lib/sync/health.mjs` (pure); this computer's
checks and the fix buttons are `lib/sync/node-health.mjs`; the page is
`src/app/58-settings-sync-health.js`.

**Every wait has a way out** (the user's rule, 23 Oct 2026). Whatever sync is
waiting for, the screen shows **Cancel** (it stops at once) and, when
something fails, the reason in one plain line with **Try again**, which starts
again straight away: no waiting for an old timeout. Cancelling or retrying
clears the old session on both computers and starts a fresh one. Timeouts are
only the fallback, never the only exit, and no spinner is left without a way
out:

| Wait | Cancel | Try again |
|---|---|---|
| any request in Settings > Sync (setting up, joining, the recovery code, removing a device, a new recovery code) | *Working… Cancel* stops waiting at once (90 s is the fallback); the page then shows what really happened | the failure line's *Try again* sends the same request again |
| approving with 6 numbers ("Ask my other computer") | *Cancel* on both computers, also after the key was sent; the other side sees the abort and stops too | *Ask again* starts a fresh request at once (the other computer follows the new one); *Close* clears a finished one |
| the 4-letter code, on the computer that shows it | *Cancel*, also while it is sending the key | *New code* (the old one stops working) |
| the 4-letter code, on the new computer | *Cancel* | *Try again* sends the same letters again at once, keeping answers already on their way; or type a new code |
| "Waiting for OneDrive" (the folder is not there, a download or upload still on its way) | turn sync off (nothing is deleted), or *Choose another folder* | *Try again* checks the folder now; Health says why it waits |
| the first big upload or download | *Stop syncing for now* | *Check again* |
| a live connection ("Connecting to Mac…") | *Stop trying* (changes go through the folder until you try again, or a new network, or waking from sleep) | *Try again* dials at once, without the back-off; for the router too |
| a request to another computer ("Asking Home laptop…") | *Cancel* in the toast: the asker takes it back and the other computer stops its run when it sees that (`lib/remote-jobs.mjs` cancel, `watchRuns`); the toast stays as long as the wait | run it again |
| the new sync key after a removal, or a key rotation | | *Check again*; or use the 4-letter code or the recovery code instead |

### Every check and its fix

| Check | How it is known | Fix |
|---|---|---|
| **The sync folder is reachable and writable** | the folder exists; the last write worked (`EPERM`, `EACCES`, `EROFS`, `EBUSY` from a write) | *Start OneDrive* when the folder is missing; *Open the folder* and the steps for a refused write (macOS: allow node under Privacy & Security > Files and Folders; Windows: Controlled folder access); *Try again*; *Choose another folder* |
| **The OpenDash Sync folder went missing** (moved, renamed, deleted, or the cloud app is signed in to another account) | this computer synced through it before, and now `OpenDash Sync` (or every known device's folder in it) is gone; nothing is written, so no empty sync is started by itself | *Use the one in …* when it is found elsewhere in a cloud folder (two levels deep; the same sync, so nothing is joined again); renamed: rename it back; else the steps (put it back, or sign in to the old account) and, only if it is gone for good, *Start sync again here* (with a warning: the other computers must choose this folder too) |
| this computer's own files went missing, the others are there | its device folder is gone | none needed: it writes them again (a fresh snapshot) and says so |
| **The cloud app is running** (OneDrive, Google Drive, Dropbox) | `tasklist` (Windows), `ps` (macOS) | *Start OneDrive* |
| **Signed in to the personal account, the same one as before** | Windows: OneDrive's personal account in the registry (only a hash of the address is kept, in this computer's own sync folder); its folder against the sync folder | *Open OneDrive to sign in*; steps to sign in to the old account, or to choose the folder in its new place |
| **Not paused, not full** | a computer that was on since this one's last change has not received it (upload lag) | steps: the cloud icon > *Resume syncing*, or free space; *Check again* |
| **Files still online-only** (Files On-Demand, macOS File Provider) | `attrib` (the O attribute) on Windows; the "dataless" flag (`stat -f %Xf`) on macOS | Windows: *Always keep on this device* (`attrib +P -U`); macOS: *Download them now* (OpenDash reads each file once) and the Finder steps (*Always Keep on This Device*) |
| **The first big download / upload** | bytes read of the other devices' files; how many of this computer's changes each one has (its seen vector) | progress bar; *Check again*; *Stop syncing for now* |
| **Windows network set to Public** (live sync) | `Get-NetConnectionProfile` | *Open network settings* (`ms-settings:network-wifi` / `-ethernet`), then Properties > Private network |
| **The firewall lets OpenDash in** (live sync) | Windows: the inbound rules for node.exe (a Block rule left from clicking Cancel), whether any Allow rule covers this network; macOS: `socketfilterfw` (on, block all, node blocked) | *Open "Allow apps through Windows Firewall"* with the exact steps (tick Private for Node.js; delete red Block rules), or the macOS Firewall options |
| **Your router** (live sync from outside) | the port mapping: mapped, CGNAT, a second router, refused | nothing to fix for CGNAT (same Wi-Fi works; elsewhere the folder); steps for bridge mode or UPnP; *Try again* |
| **Each live link** | live sync's peer rows | *Stop trying* / *Try again* (above) |
| **The clocks agree** | the merge's clock (over an hour ahead), a device.json written "in the future" (over 2 minutes), the clock in live link messages (over 10 seconds) | *Open date & time settings* and turn on automatic time, on both computers |
| **The encryption key is on this computer** | the key layer's state (not joined, removed, waiting for a new key, a device still unencrypted) | *Type the 4-letter code* (straight to the box); *Check again*; steps to encrypt the other computer |
| **Every device runs the same OpenDash** | each device's version in its device.json | on the other computer: Settings > Updates; here: *Check for updates* |
| **A device not seen for 30 days** | its last heartbeat | *Remove old device* (with a confirmation). A week after a removal, once this computer has written a snapshot since, the removed device's files leave the sync folder (the device that removed it does this) |
| **The disk is full** | a write failed with `ENOSPC` (sync then stops writing and tries once a minute); free space under 500 MB (`fs.statfs`) | *Open storage settings*, steps, *Try again* |
| **Edits clashed** | the clashes still standing (the register that won is still there) | *Review*: each clash with both values, *Keep mine* / *Keep theirs* (*Keep it deleted* / *Bring it back* for an edit made while the other computer deleted the item). Keeping theirs writes that value again as a new change, so it wins everywhere |
| **The size of the sync folder** | the folder listing a pass makes anyway: this computer's logs and snapshot, the others' | *Compact now* (a fresh snapshot; this computer's own logs older than a week go), automatic otherwise; a warning over 300 MB |
| Back from sleep, a new network | the poll or the live tick ran far too late; the network's addresses changed | none: it caught up (a new folder watcher, device.json written at once), every link closed and dialled again at once, addresses heard on the old network dropped and the new ones published |
| Trial mode | *Use changes from my other computers* is off | *Use changes from my other computers* |

### The scenarios, handled calmly

- **Sleep or wake in the middle of a sync**: a pass that was cut off is taken
  again (a merge being committed is finished or rolled back from
  `meta.pending.json`); on waking the folder watcher is made again, the
  device record is written at once and every live link closes and dials
  again, so the others see this computer back within seconds.
- **Home -> office -> hotspot**: a new network closes the old links and dials
  at once on the new one, forgets addresses heard on the old one, asks the new
  router for a port and publishes the new address book in device.json.
- **Both computers edited offline**: the later edit wins field by field; what
  really clashed (the same field, or an edit while the other deleted the item)
  is listed in *Review* with keep mine / keep theirs. Preferences and results
  never count as clashes.
- **The cloud account switched or the folder renamed**: detected, searched
  for, explained; never a fresh empty sync without asking.
- **The disk full**: no half-written files; it says so and tries again.
- **A device unused for months**: Health offers *Remove old device*; a week
  after removal its files are deleted from the folder.
- **Huge state growth**: the size and compaction status are shown, with
  *Compact now*.

### What changed

A short list of what the other computers changed here, in words: "3 changes
from MacBook Pro · 2 min ago: renamed a task, changed a budget and hid a
calendar". In Settings > Sync (the newest three, and the *What changed* tab
with the last 100) and in the sync dot's panel. Built from the changes a sync
pass applied (`lib/sync/changes.mjs`: one item counts once, by its most telling
change, so a new task is "added a task"; bookkeeping, results and caches are
left out), nothing new is logged. Kept in this computer's own sync folder
(`changes.json`, not synced), with `conflicts-done.json` (the clashes already
reviewed) and `health.json` (the hash of the cloud account).

### Easier set-up

- A new computer's name is the computer's own, made friendly, without the
  owner's name: "MacBook Pro" (from "Sam's MacBook Pro"), "Dell XPS 15"
  (the maker and model), "Windows laptop" for a `LAPTOP-…` host name
  (`lib/sync/devname.mjs`). Rename it any time.
- The personal OneDrive is chosen by default on every computer (on a Mac too,
  where the cloud folders are listed alphabetically), and the screen says so in
  one line; a work or school OneDrive is never chosen for you.
- *Add a computer* (the 4-letter code) is the first thing on the Sync page, and
  one line says what syncs and what never does.

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
