# Privacy

Freeflo is built so that your information stays on your computer. This page
lists what is stored, where, and exactly when anything leaves your computer.

**In short:** there is no Freeflo company server, no account, no analytics
and no telemetry. Freeflo only uses the network for features you switch on,
and then only to reach the service that feature names. The one exception is
Claude: if Claude Code is already installed and signed in on this computer,
Freeflo finds it by itself and some Claude features run by default (see
[What is sent to Claude, and when](#what-is-sent-to-claude-and-when)).

## Private by design, secure by default

- **No Freeflo cloud.** There is no Freeflo server, account, analytics or
  telemetry. Nothing is sent to the project or its maintainers, ever.
- **The page talks only to your own computer.** The local server listens on
  `127.0.0.1` only. It checks every request's Host, Origin and Sec-Fetch
  headers, so a website open in your browser can't read from it or send it
  changes. The page runs under a strict Content Security Policy: no inline
  scripts except the app's own (pinned by hash), no framing, no connections
  except to the local server.
- **Sync and friends are end-to-end encrypted** before anything leaves your
  computer, with standard primitives: AES-256-GCM for data, X25519 for key
  agreement, Ed25519 for signatures and HKDF-SHA-256 to derive keys. The relay
  and your cloud folder store sealed data they cannot read.
- **You host the relay**, on your own free Cloudflare account. Every request
  to it is signed, and only your own devices and the friends you approve can
  use it.
- **Each device signs its sync records.** Removing a device rotates the sync
  key and locks it out of Friends automatically, so a lost or stolen computer
  can't read anything new or rewrite your history.
- **Updates are signed.** Freeflo downloads updates only from this project's
  GitHub releases and checks an Ed25519 signature (its public key is built
  in) and the SHA-256 of the zip. Unsigned and older releases are refused.
- **The assistant can't act behind your back.** It runs through your own
  Claude Code with no shell and no file tools, and works through a fixed list
  of Freeflo tools. It can do nearly everything in the dashboard, and each
  change has Undo. Anything sensitive (friends, your computers, your relay,
  sign-ins, money rules, changes to existing expenses, updates) is only ever a
  proposal that you approve on screen.
- **Untrusted content stays text.** Email subjects and snippets, calendar
  invitations, bank memos, invites and everything friends send are escaped
  before they reach the page. Email HTML is turned into plain text and never
  rendered.
- **Reviewed before launch.** Six independent AI security reviewers each took
  one area end to end (the local server, encryption and sync, the relay and
  friends, untrusted content, the AI tools, and the release pipeline). It was
  a structured review with proof scripts, not a paid human audit or a
  certification. Its findings were fixed in 2.20.0; details are in
  [SECURITY.md](../.github/SECURITY.md#the-review-before-launch).

**Limits to know about.** The Windows installer is not code-signed yet, so
SmartScreen warns once; each release lists SHA-256 checksums to compare. The
sign-ins and keys on your computer are files that your own user account can
read (they are not yet wrapped by Windows DPAPI or the macOS Keychain), and
the data folder itself is not encrypted: use your system's disk encryption.
Your relay runs on Cloudflare's free tier, so anyone who floods it can pause it
until midnight UTC; it does not expose data.

## Cloud and sync: optional, in three levels

You never need the cloud to use Freeflo. If you want your data on more than
one device, or want friends, you choose how far it goes:

| Level | What it means | Who can read your data |
|---|---|---|
| **1. Local only** (the default) | everything stays in the data folder on this computer | you |
| **2. Your own devices** (Settings > Sync, Settings > Your relay) | your computers stay in step through a relay **you** host on **your own** Cloudflare account, with a OneDrive, Google Drive or Dropbox folder as a backup | you, on your own devices |
| **3. Friends** (Life > Friends) | people you approve see only what you choose for each of them | you, and each friend only what you picked for them |

There is no Freeflo cloud in any of this. Nothing ever goes to the Freeflo
project, its maintainers or any server they run.

A **group** (Life > Friends > Groups) shows the people in it your name, picture and status, and nothing else unless you choose. See [What a group shares](#what-a-group-shares).

**For the most privacy**, host your own relay rather than using a friend's,
or stay local and use your relay only between your own devices. Your relay's
operator is you.

### Level 1: local only

This is how Freeflo starts. Your tasks, notes, calendar and email snapshots,
finances and settings live in one folder on your computer
([below](#what-is-stored-and-where)). The page talks only to the small
server on the same computer (`127.0.0.1`). Nothing leaves it unless you
switch on one of the features in
[When does anything leave your computer?](#when-does-anything-leave-your-computer).

### Level 2: your own devices

<!-- media: Settings > Sync status card with two computers and "Your relay" as the route -->

Turn on **Settings > Sync** and add your other computers. Your changes then
travel in three ways, fastest first:

1. **Directly**, when both computers are on the same network (and, if you
   allow it, over the internet).
2. **Through your relay**, a small private service on **your own Cloudflare
   account** (free plan). Settings > Your relay > **Set up my relay** connects
   your Cloudflare account and puts the relay there in about two minutes. Only
   you, your devices and friends you approve can use it: every request must be
   signed by one of them.
3. **Through a folder** in your OneDrive, Google Drive or Dropbox, as a
   backup that is read only for what the relay does not have yet, or while it
   cannot be reached.

**Everything is end-to-end encrypted before it leaves your computer.** Each
computer writes only its own change log, and every record in it is locked
(AES-256-GCM) with a sync key that only your devices hold. Your devices pass
that key to each other only after you approve the new one: on the new
computer you choose "Join my other computer" and type a 4-letter code that
the old one shows (live for ten minutes, works once), and you check that both
screens show the same picture. Removing a device makes a new key that the
removed device never gets. Optionally, you can print a 10-word emergency
backup sheet; it is only needed if you ever lose every computer, and it stays
your secret (Freeflo never sends it anywhere).

**What your relay (and Cloudflare) can see:** that your devices exist and
their public keys, their internet addresses, when each one writes and how
much, how many devices you have, and whether one is online. **What it cannot
see:** anything you wrote, names, the sync key or anything that would open the
records. It cannot change a record without your devices noticing; at worst it
could drop or delay one, and the folder backup covers that. The relay keeps no
logs, and Freeflo turns Cloudflare's observability off; but it is your
Cloudflare account, so you control that, not Freeflo. Your Cloudflare sign-in
stays with Cloudflare's own tool (*wrangler*) on your computer; Freeflo never
reads or stores it.

**What your cloud folder provider can see:** encrypted files, how many
devices sync, when they write and roughly how much. The name of a new
computer waiting to be approved shows there until it is approved.

**What never syncs:** sign-ins, bank keys, tokens and API keys stay on the
computer where you made them. On another computer you sign in again.

A few things are only shared between your devices when sync is encrypted (it
always is for a new setup; an older copy that synced without encryption is
asked to switch): your location history, expenses and receipts, who owes you what, what friends
share with you, and your sharing log.

### Level 3: friends

Friends connect to **you** first: you send an invite link, or press **Show my
friend code** (4 letters, live for ten minutes, works once, and needs a relay
you both use), they accept, you both check the same pictures, and **you press
Accept**. A new
friend sees only your profile, game progress and garden; anything more (tasks,
calendar, money, places, memories) is off until you mark them a trusted
friend and choose it, per friend. Every message is end-to-end encrypted
between your computer and theirs. A friend can use **your** relay (if your
invite allows it) or **host their own**; each relay only ever carries sealed
messages. The details are in [Friends](#friends) below and in
[FRIENDS_GUIDE.md](FRIENDS_GUIDE.md).

## What is stored, and where

Everything lives in one data folder on your computer (`data/` next to the app,
or the folder you chose with `--data-dir`, or the one Settings > Data > *Move my data out of OneDrive* moved it to):

| What | Where | Contains |
|---|---|---|
| Settings | `config.json` | your name, email addresses you entered, region, theme, feature and AI choices, weather town |
| Your work | `state/dashboard-state.json` | tasks, notes, people, tags, streams, countdowns, reviews, links to files |
| Backups | `state/backups/`, `backups/` | copies of the above, made automatically |
| Finances | `finance/` | the bank CSV files you imported or synced, categories, budgets, the analysis, your money plan and tax year figures (`_system/tax.json`) |
| Tax documents | `tax-documents/` | payslips and papers you keep against a tax year, on this computer only |
| UTR and National Insurance number | the secret store (`secrets/tax/`) | on this computer only. Never sent to Claude or friends, never synced, in a return pack only if you tick that box. Freeflo never asks for a Government Gateway password. |
| Calendar and email | `calendar/`, `inbox/`, `email/` | read-only snapshots: event details; email subjects, senders, dates and short snippets |
| Your pet's accessories (Pets > Wardrobe > My designs) | `pets/items.json` | up to 12 accessories you made for your pet: the drawing (shapes and colours), a name, and the sentence you described it with. Synced between your own computers if sync is on. Friends get the drawing and its name, never your sentence |
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
| A move of the data folder (Settings > Data > Move) | outside the data folder, in this computer's Freeflo folder (`%LOCALAPPDATA%\OpenDash\relocation.json` and `moves\` on Windows; `~/Library/Application Support/OpenDash/` on macOS; `~/.local/state/opendash/` on Linux) | the old and new folders, the files copied with their checksums, and each setting the move changed with its old and new value (so Undo can put it back), including the text of Claude scheduled-task files it edited. Never sent anywhere |
| The daily encrypted copy (if on) | settings and the key made from your passphrase: this computer's private folder (next row). The copies: the folder you chose, by default `OneDrive\OpenDash Backups` | the passphrase itself is never stored. Each copy holds what *Export all data* holds, encrypted (AES-256-GCM) before it is written |
| Sign-ins and keys | **this computer's private folder, not the data folder**: `%LOCALAPPDATA%\OpenDash\<id>\secrets` (Windows), `~/Library/Application Support/OpenDash/<id>/secrets` (macOS), `~/.local/state/opendash/<id>/secrets` (Linux) | Google and Microsoft sign-ins, Google Health, ElevenLabs, the remote MCP and relay pairings, and under `fin/` your Monzo client and sign-in, your Enable Banking application key and bank sessions, your Plasma One address (only if you set those up; deleted when you disconnect). They never travel with the data folder |

Your browser keeps interface preferences, a fallback copy of unsaved edits
while the server is down, an offline copy of the app page (with your
public settings, such as your name; never your tasks), and a short-term copy
of recent places (up to 90 days) that the welcome scenes use.

## Location history

Freeflo keeps a private history of where you've been, for fun facts. It stays
in your dashboard and on your own devices unless you choose to share places with
a friend (Settings > Privacy, per friend).

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

Freeflo does not encrypt the data folder. Use your operating system's disk
encryption if the computer is shared or portable, and keep the folder out of
public places (shared drives, public repositories).

## Friends

With Friends (2.17) you can add people who also use Freeflo. **You choose,
for each friend, what they can see**, and nothing else ever leaves your
computer for them. A friend's page has a *What they can see* panel; Settings >
*Privacy* shows every friend at once.

- **Off unless you turn it on.** A new friend sees your **profile** (your name,
  and the bio, emoji, colour, pronouns and city you set, your character and
  outfit, your card's banner, nameplate and title, and your pet), your **game
  progress** (level, title, XP, streaks, quests and focus minutes) and your
  **garden** (which plants and decorations, where they stand and how grown
  they are; never your tasks or anything you wrote). Each of these three can
  be set to *Hidden* per friend. Everything else starts off.
- **Your pet.** If you have adopted a pet and share it (Pets > With you), friends
  who can see your profile also see its look and name, and the accessories you
  made for it (the drawing and its name, never the sentence you described it with).
  A friend can switch accessories made by friends off for themselves.
- **Trusted friends only.** Anything beyond profile, game progress and garden can only
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
| Garden | hidden / shown (shown by default) | your plants and decorations, where they stand, how grown they are, the garden's level and the season. A friend who can see it can visit, water a plant, leave a heart or a gift and sign your guestbook |
| Presence | off / on | online, focusing, travelling or away, never where; it also needs *Show friends when I'm around* in the Friends tab |

- **Risky levels ask first.** Money *Full totals* and Locations *Exact places*
  show a warning before they are turned on, and stay marked while they are on.
- **Trust never brings old choices back.** Turning *Trusted friend* off or on
  turns their tasks, calendar, money, locations, memories and presence back to
  off; marking someone trusted turns on only the level you choose with it (the
  message says which earlier choices stay off, with Undo).
- **For a while.** Any scope can be shared *until a day*, *during a trip* or
  *between two days*. When the time is over nothing more is sent and their copy
  is deleted. Locations shared *during a trip* or *between two days* carry only
  what happened inside those days: nothing from before the first day (no home or
  work stays, no older countries or cities).
- **See exactly what they see.** *Preview what Sam sees* shows what would go to
  that friend right now, made by the same code that sends it, including the data
  exactly as sent.
- **Stop at once.** *Stop sharing with Sam* on their page, or *Stop sharing
  everything* in Settings > Privacy (also in the command palette): nothing more
  goes out (Together spaces, cheers, challenges, postcards, songs and your computer's
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
| **Spotify** (only when you set it up in Settings > Connections > Spotify, or switch on cover art) | the sign-in (your Client ID and a one-time code, with a PKCE challenge; there is no client secret), then what you search for, a request for your top artists or playlists, and a request to start a song or add it to your queue. With cover art on and Spotify not linked: only the id of a song, album, playlist or artist, to find its picture | Spotify (`accounts.spotify.com`, `api.spotify.com`, `open.spotify.com`) and its picture hosts (`i.scdn.co`, `*.spotifycdn.com`). The tokens stay in this computer's secret store (never in your data folder). Freeflo never changes your library or playlists |
| **Direct Google route** (older setups only) | read-only Gmail and Calendar requests | Google, with your own OAuth client |
| **Read aloud** (stories and the money brief), only with an online voice | the text being read | your browser's speech service. Voices built into your computer keep everything local; voices marked *(online)* in Settings > Brief and stories > *Voice* (for example some "Natural" voices in Microsoft Edge, or Chrome's Google voices) send the text to the browser maker |
| **Avatars** (if you set an image address on a person) | a normal image request | the site in that address |
| **Links you open** | whatever your browser sends when you open a web link | that site |
| **Daily encrypted copy** (off by default; Settings > Data) | once a day, your settings, tasks and notes, calendar and email snapshots and finances (no sign-ins, keys, logs or caches), **encrypted on this computer** with a key made from your passphrase | the folder you chose, by default `OneDrive\OpenDash Backups`: your cloud provider stores scrambled bytes, plus the date, this computer's name and the app version in plain text. Nothing goes to Freeflo. Without the passphrase nobody can open the copies, including you |
| **Moving the data folder** (Settings > Data > Move) | nothing: the copy is made on this computer. After showing you each change, it updates the settings of your own programs that point at Freeflo: Claude Code (through its own `claude mcp` command), Claude Desktop's settings file, Codex and Gemini CLI (through their commands), Windows start-up entries, shortcuts, and Claude scheduled-task files that name the folder. Only those entries | no one |
| **Sync across my devices** (off by default; Settings > Sync) | your tasks, notes, people, streams, countdowns, Home layout and reviews, field by field; your preferences (theme, density, sort and grouping, which calendars you hide, per-view and Home card options); the list of connected accounts (never their sign-ins); the mail and calendar snapshots of accounts this computer fetches. Never: sign-ins, bank keys, tokens, `config.json`, `connections.json`, `sources.json`, or where you are in the app and this screen's panel sizes | an `OpenDash Sync` folder inside the OneDrive, Google Drive or Dropbox folder you choose, **end-to-end encrypted**: each change is locked (AES-256-GCM) on your computer before it is written, with a key only your devices hold, so your cloud provider stores files it cannot read. It can see how many devices sync, when they write and roughly how much; a new computer waiting to be approved shows its name there until it is approved. The key never goes into the folder; an optional 10-word emergency backup sheet, if you make one, is shown once and kept by you. With your relay set up, the same sealed records go first through **your own relay** on your Cloudflare account, and the folder keeps a backup copy ([level 2](#level-2-your-own-devices)). Nothing goes to Freeflo. Until you also turn on *Use changes from my other computers*, nothing received is applied |
| **Live sync** (with encrypted sync on; Settings > Sync > Advanced > Direct links) | the same encrypted changes as above, sent straight to your other paired computers the moment they are made, over a connection that only your own paired devices can open (each proves it holds its device key) and that is encrypted again end to end; which job each computer runs. Each computer's addresses (its home or office network address, and the public address its router opened) are kept inside the encrypted part of its file in the sync folder | your other computers only, directly, on your network or over the internet. To be reachable from outside, Freeflo asks your home router (UPnP / NAT-PMP) to forward one port to it, but only while your relay does not carry your sync: with your relay in use the router is left alone unless you turn *Let my other computers reach this one over the internet* on (Settings > Sync > Advanced), and turning it off always leaves the router alone; anyone on the internet can then knock on that port, but nothing answers without your device key. On your own network it sends a short announcement every 30 seconds that only your devices can read. No Freeflo server, no relay |
| **Updates** (when you press *Check for updates* in Settings > Updates, or once a day if you turn on *Check for updates once a day*; off by default) | GET requests only: the list of releases, and when you choose to update, the release zip, its `SHA256SUMS.txt` and that file's Ed25519 signature, checked before anything is installed. Nothing about you or your data | GitHub (`api.github.com` and the project's release downloads) |
| **Friends** (when you add one; Settings > Privacy) | to each friend only what you chose for them (see [Friends](#friends)): by default your profile and game progress; tasks, calendar, money, places, memories and presence only to a friend you marked trusted, at the level you picked | that friend's Freeflo, end-to-end encrypted, through the private relay or a direct link (docs/dev/FRIENDS.md) |
| **Your relay** (Settings > Your relay > *Connect Cloudflare*, only when you click it) | the relay's code and your PUBLIC identity key, uploaded to your own Cloudflare account by Cloudflare's tool (wrangler, downloaded from npm the first time). Afterwards: sealed sync records and friends' messages it cannot open, and signed requests (your public key, a time, a signature) | your own Cloudflare account. Your Cloudflare sign-in stays with wrangler on this computer: Freeflo never reads, stores or logs it, and keeps wrangler's output in memory only. The relay logs nothing and Cloudflare's observability is turned off ([FRIENDS_GUIDE.md](FRIENDS_GUIDE.md#privacy-what-travels-and-who-can-see-it)) |

Nothing else. In particular:

- no analytics, crash reports or usage statistics, and no update checks
  unless you ask for them;
- Freeflo's server listens on `127.0.0.1` only, so other computers cannot
  reach your dashboard. (With *Live sync* on, a separate sync port answers
  your own paired computers only; see the table above.)
- your data is never sent to the Freeflo project or its maintainers.

## What is sent to Claude, and when

- **"Connected" means Claude Code is installed and signed in on this
  computer.** Freeflo finds it by itself: when the server starts (and again
  at most every 30 minutes when a feature needs to know) it sends Claude Code
  one tiny test prompt ("Reply with exactly: OK"), with none of your data, on
  the fast model and your own plan. It also runs `claude mcp list` to see which
  connectors you have added, and Claude Code checks each server on that list
  as it answers. Without Claude Code on the computer, none of this happens and
  nothing is sent at all.
- **Only when you use a Claude feature, or one that runs by itself.** With
  Claude connected, the Morning brief's *day in three sentences* and the
  story scripts (morning, evening and weekly) are written by Claude by
  themselves, each at most once a day. They are on by default: Settings > Brief and stories >
  *AI summary* turns them off, and the built-in script plays instead. The
  auto-link judge only runs once you turn on auto-linking and choose folders.
  Each feature can be switched off in Settings.
- **Pets: Restyle with AI and Design with AI** (Pets > Wardrobe, only when you
  press them) send Claude the sentence you typed and your pet's look (Restyle: the
  species, colours and accessories) or just its species (Design), never its name or
  anything else of yours. Changing a
  design you just drew also sends that drawing and what you want changed. Each
  answer is checked on your computer, shown to you first and only saved if you
  say so. Friends' accessories are only ever drawn; they never go to Claude.
- **Only what that feature needs.** Task chat sends that task and your
  conversation; the morning summary sends today's facts; the auto-link judge
  sends task titles with candidate folder and file names and short excerpts
  (never from "names only" folders, never whole files).
- **The assistant looks things up itself** through Freeflo's MCP server in
  propose mode, so it reads only what it needs to answer. Sensitive changes
  (friends, devices, relay, sign-ins, money rules, updates) need your approval
  on screen; the rest can be undone.
- **Direct bank and wallet connections** (Monzo, Plasma One, Enable Banking)
  are read by Freeflo itself, with no AI involved: your transactions go
  straight from Monzo, Enable Banking or the public Plasma blockchain (through
  Routescan's API) to your data folder. To convert other currencies, Freeflo
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
  terms and privacy policy. Freeflo never sees your Claude sign-in.

## Your own Claude using Freeflo (MCP)

If you register Freeflo's MCP server with Claude Code, T3 Code or Claude
Desktop, the conversations you have there can include anything you ask Claude
to look up in Freeflo. That is between you and your Claude client; Freeflo
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

## What a group shares

**With the people in it:** the name you chose for that group, your picture, your status, and your check pictures (made from your public key, so they can check
it is you). What you post on its noticeboard. Not where your mail goes, or your address. Someone you become friends with through a group gets the name you use there, and
nothing else until you choose; a friendship you already had has its own settings, and the group changes nothing about them. If you say yes to automatic friends in a group, that much happens with no click.

**Never, through a group:** your tasks, calendar, money, places, or anything else in Freeflo.

**With whoever runs the relay it is on:** they cannot read group names, descriptions, posts, profiles or join requests: those are sealed before they leave your computer, and
only people in the group hold the key. They can see that a group exists and its id, how many people are in it and their public keys, who runs it, when something is posted and how
big it is, and the address your computer connects from at that moment. They can also tell when the same person is in two groups on that relay.

**If you use "Anyone with the link":** the group is only as private as the link. Whoever holds it can join and read what is posted. A dishonest relay operator could also read it if someone
opens the link in a browser, because the relay serves that page. With "I approve each person", holding the link gets someone only the group's name, description and who runs it, and the chance to ask.

**If you have no connection of your own,** the Join dialog asks before using that group's relay for your friend requests too. Untick it, and it isn't used for that.

**A 4-letter code**, if someone turns one on: whoever runs the relay could work out the code and so read the group's name and who runs it. Nothing else.

**Removing someone** ends their access at once and changes the group's key, so they can't read anything new. What they already read stays on their computer.

**No tracking:** the page a group link opens is static, loads nothing from anywhere else, and keeps no record of the visit.

Groups are not a compliance or records system. Technical details: [docs/dev/GROUPS.md](dev/GROUPS.md).
