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
| Where you've been (Location history, on unless you turn it off) | `locations/log.json` | one entry per stay or move: when, the place, town, region and country, a position rounded to about 1 km, the time zone, where it came from (your browser's location if you chose *Device location*, the place you picked, your computer's time zone, or a trip) and which of your devices saw it; where tasks were completed; your location badges. Never your IP address. Kept until you delete it (see [Location history](#location-history)) |
| What friends can see (Friends) | `friendPerms` in `state/dashboard-state.json` | for each friend: trusted or not, stopped or not, and per scope the level, the chosen tasks, streams, tags or memories and how long |
| What friends share with you | `friends/received/<friend>.json` | read-only, per friend: the tasks, calendar, money, places or memories they chose to share, at their level |
| Sharing activity (audit log) | `friends/share-log.json` | what went to which friend and when: scope, level, number of items, size, when they confirmed it. No copy of the data |
| Diff base for friends | this computer's private folder: `friends/share-base.json` | short fingerprints of the items last sent to each friend, so the next update can be small. No data |
| Briefs and stories | `briefs/` | cached weather, AI summaries and story scripts, daily brief snapshots |
| ElevenLabs narration | key and usage: this computer's private folder (see below); audio: `cache/narration/` | optional API key and account status, saved voice audio and local usage counts; excluded from exports |
| Auto-linking | `index/` | names, sizes and dates of files in the workspace folders you chose, short excerpts (never from "names only" folders) |
| Logs | `logs/` | what the server did: requests, timings, counts, errors. No task text, email content, names or money |
| Local token | `local-token` | a random secret for local programs |
| Sync across my devices (if on) | outside the data folder: `%LOCALAPPDATA%/OpenDash/sync/` (Windows), `~/Library/Application Support/OpenDash/sync/` (macOS), `~/.local/state/opendash/sync/` (Linux) | this computer's sync identity, what it last synced, clashes between computers, the trial-mode report. The sync keys and this computer's private key are with the other sign-ins and keys, in this computer's private folder (below) |
| Open computers | `hosts/`, `data-id.json` | one small file per computer that has the folder open (a random id, the computer's name, the app version, when it last checked in), and the folder's random id |
| Main computer (if you chose one) | `roles.json` | the random id and name of the computer that runs the automatic background jobs (and of any computer that runs one of them instead) |
| A move of the data folder (Settings > Data > Move) | outside the data folder, in this computer's OpenDash folder (`%LOCALAPPDATA%\OpenDash\relocation.json` and `moves\` on Windows; `~/Library/Application Support/OpenDash/` on macOS; `~/.local/state/opendash/` on Linux) | the old and new folders, the files copied with their checksums, and each setting the move changed with its old and new value (so Undo can put it back), including the text of Claude scheduled-task files it edited. Never sent anywhere |
| The daily encrypted copy (if on) | settings and the key made from your passphrase: this computer's private folder (next row). The copies: the folder you chose, by default `OneDrive\OpenDash Backups` | the passphrase itself is never stored. Each copy holds what *Export all data* holds, encrypted (AES-256-GCM) before it is written |
| Sign-ins and keys | **this computer's private folder, not the data folder**: `%LOCALAPPDATA%\OpenDash\<id>\secrets` (Windows), `~/Library/Application Support/OpenDash/<id>/secrets` (macOS), `~/.local/state/opendash/<id>/secrets` (Linux) | Google and Microsoft sign-ins, Google Health, ElevenLabs, the remote MCP and relay pairings, and under `fin/` your Monzo client and sign-in, your Enable Banking application key and bank sessions, your Plasma One address (only if you set those up; deleted when you disconnect). They never travel with the data folder |

Your browser keeps interface preferences, a fallback copy of unsaved edits
while the server is down, an offline copy of the app page (with your
public settings, such as your name; never your tasks), and a short-term copy
of recent places (up to 90 days) that the welcome scenes use.

## Location history

OpenDash keeps a history of where you've been so it can show you fun facts. It
stays in your dashboard and on your own devices, and never goes anywhere else.

- **What:** stays and moves (see the table above), in `locations/log.json` in
  your data folder. Until 2.16 the recent places stayed in the browser only;
  now they are kept in your dashboard, so the Locations tab can show countries
  and cities you have visited, firsts, time zones crossed, distance travelled,
  days away, tasks completed per place and badges.
- **Where it goes:** nowhere outside your dashboard. With *Sync across my
  devices* and end-to-end encryption on, your own devices share it (encrypted
  before it reaches the sync folder); without encryption it is not synced at
  all. It is never sent to Claude, Open-Meteo or anyone else, and no IP address
  lookup is ever made.
- **How long:** forever. It is never pruned automatically.
- **Your control:** Settings > *Location history* has the on/off switch (on by
  default; when off nothing new is added, and the browser's short-term copy
  stops too), *Export JSON* / *Export CSV*, and *Delete my location history*,
  which removes it here and on your synced devices. *Forget this trip*
  (Travel) also removes the location entries of those days.

OpenDash does not encrypt the data folder. Use your operating system's disk
encryption if the computer is shared or portable, and keep the folder out of
public places (shared drives, public repositories).

## Friends

With Friends (2.17) you can add people who also use OpenDash. **You choose,
for each friend, what they can see**, and nothing else ever leaves your
computer for them. A friend's page has a *What they can see* panel; Settings >
*Privacy* shows every friend at once.

- **Off unless you turn it on.** A new friend sees your **profile** (your name,
  and the bio, emoji, colour, pronouns and city you set) and your **game
  progress** (level, title, XP, streaks, quests and focus minutes). Everything
  else starts off.
- **Trusted friends only.** Anything beyond profile and game progress can only
  go to a friend you have marked *Trusted friend*. Turning that off stops it all
  again, and their app is asked to delete what it had.
- **What each level sends** (only these fields; everything else, including task
  notes and descriptions, attachments, people's names and email addresses,
  account names and numbers, transactions and join links, is never sent):

| Scope | Levels | What the friend gets |
|---|---|---|
| Tasks | none / only tasks I share / chosen streams or tags / all | title, due date and time, status, priority, stream name and colour, tags, steps done, the day it was done (open tasks, and ones done in the last two weeks) |
| Calendar | none / busy or free / times and titles / full details | busy or free: the day and start and end times only (also as exact moments, with your time zone, so a friend elsewhere sees them on their own clock). Titles: plus the title. Full: plus the place (left out when it holds a join link, a meeting code or an address), which calendar, and how many people are invited (never who). The next eight weeks |
| Money | none / a summary / full | summary: a few words ("On budget this month") and a percentage, never an amount. Full: this month's and this week's spending by category, budgets, income, regular payments and the total in your accounts |
| Locations | none / countries / cities / exact | countries or cities you have been to, by day, and the one you are in now (no positions, no times). Exact: where you are now to about 1 km, and where you stayed in the last two weeks |
| Memories & journal | none / only what I choose | the journal days, postcards, time capsules (a sealed one only says when it opens) and goals you tick |
| Presence | off / on | online, focusing, travelling or away, never where; it also needs *Share when I'm online* in the Friends tab |

- **Risky levels ask first.** Money *Full totals* and Locations *Exact places*
  show a warning before they are turned on, and stay marked while they are on.
- **For a while.** Any scope can be shared *until a day*, *during a trip* or
  *between two days*. When the time is over nothing more is sent and their copy
  is deleted.
- **See exactly what they see.** *Preview what Sam sees* shows what would go to
  that friend right now, made by the same code that sends it, including the data
  exactly as sent.
- **Stop at once.** *Stop sharing with Sam* on their page, or *Stop sharing
  everything* in Settings > Privacy (also in the command palette): nothing more
  goes out (Together spaces, cheers, challenges, postcards and your computer's
  addresses for direct links pause too), and after 15 seconds (your chance to
  Undo) every friend's app is asked to delete its copy. Your choices are kept for *Share again*.
  Removing or blocking a friend clears your choices for them: if they come
  back, they start again with profile and game progress only.
- **How it travels.** Each friend's packet is built on your computer, from your
  own data, by your choices, and sent end-to-end encrypted to that friend alone
  (docs/dev/FRIENDS.md). Changes go out a few seconds after you make them, as
  small updates. Deletion on a friend's device is a request their app carries
  out; it cannot be forced, so only share what you are happy for them to have
  seen.
- **The audit log.** Settings > Privacy > *Sharing activity*, and a line under
  each scope ("Sam last received your calendar 2 h ago"), say what went to whom
  and when. The log (`friends/share-log.json`) keeps no copy of the data.
- **What friends share with you** is kept read-only in `friends/received/` in
  your data folder, checked against the same strict rules when it arrives and
  every time it is read, shown as plain text only, and never shown to Claude, the
  assistant, MCP clients or any action. It disappears when they stop sharing or
  their share ends, and *Remove from this computer* deletes it.
- **Your own devices.** Your choices (`friendPerms` in the state) sync to your
  other computers like the rest of your settings; what friends share with you and
  the audit log sync only with end-to-end encrypted sync.

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
| **Sync across my devices** (off by default; Settings > Sync) | your tasks, notes, people, streams, countdowns, Home layout and reviews, field by field; your preferences (theme, density, sort and grouping, which calendars you hide, per-view and Home card options); the list of connected accounts (never their sign-ins); the mail and calendar snapshots of accounts this computer fetches. Never: sign-ins, bank keys, tokens, `config.json`, `connections.json`, `sources.json`, or where you are in the app and this screen's panel sizes | an `OpenDash Sync` folder inside the OneDrive, Google Drive or Dropbox folder you choose, **end-to-end encrypted**: each change is locked (AES-256-GCM) on your computer before it is written, with a key only your devices hold, so your cloud provider stores files it cannot read. It can see how many devices sync, when they write and roughly how much; a new computer waiting to be approved shows its name there until it is approved. The key never goes into the folder; your recovery code is shown once and kept by you. Each of your computers reads the folder from there; nothing goes to OpenDash. Until you also turn on *Use changes from my other computers*, nothing received is applied |
| **Live sync** (with encrypted sync on; Settings > Sync > Live connection) | the same encrypted changes as above, sent straight to your other paired computers the moment they are made, over a connection that only your own paired devices can open (each proves it holds its device key) and that is encrypted again end to end; which job each computer runs. Each computer's addresses (its home or office network address, and the public address its router opened) are kept inside the encrypted part of its file in the sync folder | your other computers only, directly, on your network or over the internet. To be reachable from outside, OpenDash asks your home router (UPnP / NAT-PMP) to forward one port to it (turn off *Let my other computers reach this one over the internet* to leave the router alone); anyone on the internet can then knock on that port, but nothing answers without your device key. On your own network it sends a short announcement every 30 seconds that only your devices can read. No OpenDash server, no relay |
| **Friends** (when you add one; Settings > Privacy) | to each friend only what you chose for them (see [Friends](#friends)): by default your profile and game progress; tasks, calendar, money, places, memories and presence only to a friend you marked trusted, at the level you picked | that friend's OpenDash, end-to-end encrypted, through the private relay or a direct link (docs/dev/FRIENDS.md) |
| **Your relay** (Settings > Your relay > *Connect Cloudflare*, only when you click it) | the relay's code and your PUBLIC identity key, uploaded to your own Cloudflare account by Cloudflare's tool (wrangler, downloaded from npm the first time). Afterwards: sealed sync records and friends' messages it cannot open, and signed requests (your public key, a time, a signature) | your own Cloudflare account. Your Cloudflare sign-in stays with wrangler on this computer: OpenDash never reads, stores or logs it, and keeps wrangler's output in memory only. The relay logs nothing and Cloudflare's observability is turned off ([FRIENDS_GUIDE.md](FRIENDS_GUIDE.md#privacy-what-travels-and-who-can-see-it)) |

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
