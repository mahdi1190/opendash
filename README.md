<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/lockup-dark.svg">
    <img alt="Freeflo" src="assets/brand/lockup.svg" height="72">
  </picture>
</p>

<h3 align="center">Plan your day. Keep your data.</h3>

<p align="center"><sub>Freeflo was called Freeflo until 2.23. The repository, folders and commands still say <code>opendash</code>.</sub></p>

<p align="center">
A calm, local-first dashboard for your tasks, calendar, money and friends.<br>
It runs on your own computer. No account, no Freeflo server, no telemetry.
</p>

<p align="center">
  <a href="https://github.com/mahdi1190/opendash/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/mahdi1190/opendash?sort=semver&label=release&color=5b5bd6"></a>
  <a href="LICENSE"><img alt="Licence: MIT" src="https://img.shields.io/badge/licence-MIT-5b5bd6"></a>
  <img alt="Windows, macOS and Linux" src="https://img.shields.io/badge/runs%20on-Windows%20%7C%20macOS%20%7C%20Linux-2b2b55">
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-2b9a5a">
</p>

<p align="center">
  <a href="https://github.com/mahdi1190/opendash/releases/latest"><img alt="Download for Windows" src="https://img.shields.io/badge/Download%20for%20Windows-installer-5b5bd6?style=for-the-badge" height="44"></a>
</p>

<p align="center">
  <sub><b>macOS and Linux:</b> download <code>opendash-v&lt;version&gt;.zip</code> from the same
  <a href="https://github.com/mahdi1190/opendash/releases/latest">release page</a>, unzip it and run
  <code>sh start-opendash.sh</code> (needs Node.js 20 or newer).<br>
  <a href="https://mahdi1190.github.io/opendash/">Website</a> ·
  <a href="#install">Install</a> ·
  <a href="#private-by-design-secure-by-default">Security</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="docs/CHANGELOG.md">Changelog</a></sub>
</p>

<p align="center">
  <img alt="Customising Home: dragging the edge of a card to resize it while the others reflow (demo data)" src="docs/media/home-board.gif" width="900">
</p>

Freeflo puts your day on one page: what is due, what is next, where the money
went and who you are waiting on. It is a small Node.js server on your own
computer and one folder of data that belongs to you. The cloud is optional, and
when you use it, it is yours too.

> Every screenshot and GIF shows invented demo data (the user is "Alex"; the
> friends are made up). You can load the same data from the welcome screen.

## A tour

### Home

<table>
<tr>
<td width="62%">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/home-today-dark.png">
  <img alt="Home: a morning card with today's meetings and tasks, the day so far in a sentence, ideas for today and the Focus list (demo data)" src="docs/media/home-today.png">
</picture>
</td>
<td>
<b>Your day at a glance.</b> A morning card, the day so far in one sentence,
the next meeting, ideas for today and your cards. <b>Play my morning</b> opens
the day as a short story, read aloud if you like.
<br><br>
<b>A board you arrange.</b> Resize any card by dragging its edge; the others
make room. <b>Plan my week</b> drops tasks onto days with the free hours shown.
</td>
</tr>
</table>

<details>
<summary>More of Home: Plan my week and the weekly review</summary>
<br>
<img alt="Plan my week: a list of tasks to plan beside seven day columns showing free hours (demo data)" src="docs/media/home-plan-week.png" width="49%">
<img alt="The weekly review story's start screen with Play and Read it out (demo data)" src="docs/media/home-week-review.png" width="49%">
</details>

### Tasks and quick add

<table>
<tr>
<td width="50%"><img alt="Quick add: pressing Q, typing a sentence with a date, stream, priority and estimate, and the chips appearing (demo data)" src="docs/media/quick-add.gif"></td>
<td width="50%"><img alt="A task card with subtasks, a time suggestion and a focus timer (demo data)" src="docs/media/task-card.png"></td>
</tr>
<tr>
<td>
<b>Type it the way you would say it.</b> Press <kbd>Q</kbd> and write
<code>Send Alex the slides fri 3pm #work !p1 ~1h</code>. The date, stream,
priority and estimate become chips before you press Enter.
</td>
<td>
<b>One card per task.</b> Subtasks, notes, people, repeats, an estimate, a
planned day apart from the due date, and a focus timer. Undo works everywhere,
and deleted tasks wait in the Bin.
<br><br>
<b>Select many things at once.</b> Tick a few tasks, expenses or
transactions, change them together, and one <b>Undo</b> puts them all back.
</td>
</tr>
</table>

<details>
<summary>All tasks</summary>
<br>
<img alt="The All tasks list, grouped and filterable (demo data)" src="docs/media/tasks-all.png">
</details>

### Calendar

<table>
<tr>
<td width="62%"><img alt="The calendar week view with events and due tasks side by side (demo data)" src="docs/media/calendar-week.png"></td>
<td>
<b>Events and due dates together.</b> Month, week, day and agenda views, with
your tasks and planned blocks beside your meetings. Drag a task onto the week
to plan it. Events come from your Google or Microsoft accounts, or from any
iCal link.
</td>
</tr>
</table>

<details>
<summary>The month view</summary>
<br>
<img alt="The calendar month view (demo data)" src="docs/media/calendar-month.png">
</details>

### Money, the Money brief and the story

<table>
<tr>
<td width="62%">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/money-overview-dark.png">
  <img alt="The Money board: safe to spend today, upcoming bills and subscriptions, and budgets (demo data)" src="docs/media/money-overview.png">
</picture>
</td>
<td>
<b>What is safe to spend today</b>, your bills and subscriptions, and budgets
with a pace marker and a forecast. Import a bank CSV with no connection at
all, or connect a bank read-only.
<br><br>
<b>Your money in three sentences.</b> The Money brief says how the month is
going, and reads it aloud if you like.
</td>
</tr>
<tr>
<td><img alt="The money story playing: short animated scenes about the month (demo data)" src="docs/media/money-story.gif"></td>
<td><b>A short animated story of your month</b>: where it went, what changed and
what is coming up. Press <b>Play story</b> on the brief.</td>
</tr>
</table>

<details>
<summary>The Money brief, spending and budgets</summary>
<br>
<img alt="The Money brief in three sentences with Read aloud and Play story (demo data)" src="docs/media/money-brief.png">
<img alt="Spending: a donut by category and trends (demo data)" src="docs/media/money-spending.png" width="49%">
<img alt="Budgets with rings, a pace marker and a forecast (demo data)" src="docs/media/money-budgets.png" width="49%">
</details>

### Expenses and expense reports

<table>
<tr>
<td width="50%"><img alt="Expenses: to claim, waiting and paid, with one expense open (demo data)" src="docs/media/expenses.png"></td>
<td width="50%"><img alt="The Make expense report dialog (demo data)" src="docs/media/expense-report.png"></td>
</tr>
<tr>
<td><b>Money you spent for someone else, until it is paid back.</b> Mark a
purchase as an expense, drop in the receipt, and see what you are owed on
Home. When the money arrives, Freeflo matches it and marks the claim paid.</td>
<td><b>One click to a filled-in expense form.</b> Tick the expenses and press
<b>Make expense report</b>: a PDF laid out exactly like the paper expense form
(your name, one row per expense in the right column, totals and your
signature), plus the receipts zipped and named to match. Made it by accident?
<b>Undo this report</b> puts everything back.</td>
</tr>
</table>

### The assistant

<table>
<tr>
<td width="62%"><img alt="The assistant panel with a made-up conversation and a proposed change waiting for Apply (demo data; nothing was sent to Claude)" src="docs/media/assistant.png"></td>
<td>
<b>Ask in plain words.</b> "Move everything for Acme to next Monday." The
assistant looks things up and can do nearly everything in the dashboard, and
every change can be undone. Ordinary changes wait for your <b>Apply</b>, and
anything sensitive (friends, your computers, your relay, sign-ins, money rules,
updates) always asks for your approval on screen.
<br><br>
It is optional and runs through <b>your own</b> Claude Code, on your own
plan. It has no shell and no file tools.
</td>
</tr>
</table>

### Friends and shared spaces

<table>
<tr>
<td width="50%"><img alt="Friends: a list with presence and a friend's profile card (demo data; the friends are made up)" src="docs/media/friends.png"></td>
<td width="50%"><img alt="Making a shared list with two friends and adding items (demo data)" src="docs/media/together.gif"></td>
</tr>
<tr>
<td><b>Friends, privately.</b> See who is around, cheer each other on and
compare streaks. A new friend sees only your profile, game progress and
garden; you choose anything more, per friend.</td>
<td><b>Do things together.</b> Shared lists, boards, parties and trips with the
friends you pick. Everything between friends is end-to-end encrypted.</td>
</tr>
</table>

### Garden, pets, wardrobe and achievements

<table>
<tr>
<td width="50%"><img alt="The garden game: the plot, tools and goals (demo data)" src="docs/media/garden.png"></td>
<td width="50%"><img alt="The garden's Shop, Almanac and Basket tabs (demo data)" src="docs/media/garden-tour.gif"></td>
</tr>
<tr>
<td colspan="2"><b>A garden you can really play in.</b> Plant, water, harvest
and decorate, with seasons, a shop and an almanac. Coins come from focus time,
so a good day of work grows something. Friends can visit and water a plant.</td>
</tr>
<tr>
<td><img alt="Patting a pet, giving a treat and doing a trick (demo data)" src="docs/media/pet-treat.gif"></td>
<td><img alt="The avatar builder with outfits (demo data)" src="docs/media/wardrobe.png"></td>
</tr>
<tr>
<td><b>A companion that grows with what you do.</b> Adopt a pet from 18
species, teach it tricks and read its journal. There are 497 hard
achievements to earn over months of steady use, each with a reward.</td>
<td><b>Dress your character.</b> Clothes, saved outfits, expressions and
<i>Surprise me</i>.</td>
</tr>
</table>

<details>
<summary>Achievements and pets</summary>
<br>
<img alt="Level, quests, streaks and achievements (demo data)" src="docs/media/achievements.png" width="49%">
<img alt="A pet's page with tricks and a journal (demo data)" src="docs/media/pets.png" width="49%">
</details>

The fun level can be Off, Subtle or Full (Settings > Game).

### Places and Memories

<table>
<tr>
<td width="50%"><img alt="Places: an overview and a travel timeline (demo data)" src="docs/media/places.png"></td>
<td width="50%"><img alt="The Memories journal (demo data)" src="docs/media/memories.png"></td>
</tr>
<tr>
<td><b>Where you have been.</b> Countries and cities, firsts, trips and a
passport with spending per country. The history stays on your own
devices.</td>
<td><b>A private journal written for you each day</b>, with a mood,
<i>On this day</i>, time capsules, postcards and <i>Play my year</i>.</td>
</tr>
</table>

### The command palette and What's new

<table>
<tr>
<td width="50%"><img alt="The Ctrl+K command palette: typing money and arrowing through the results (demo data)" src="docs/media/palette.gif"></td>
<td width="50%"><img alt="The What's new tour spotlighting the Money brief (demo data)" src="docs/media/whats-new.png"></td>
</tr>
<tr>
<td><b>Jump anywhere or run anything with <kbd>Ctrl</kbd>+<kbd>K</kbd>.</b>
Pages, commands, tasks, people and every setting, by a few letters.</td>
<td><b>A guided tour of each release.</b> After an update, What's new points
at the new things in place.</td>
</tr>
</table>

## Private by design, secure by default

Freeflo holds personal things: tasks, people, calendars and money. It is built
so that they stay yours.

- **Local-first.** Your data is one folder on your computer. There is no
  Freeflo server, no account, no analytics and no telemetry. Nothing is ever
  sent to the project.
- **The local server stays local.** It listens only on `127.0.0.1`, and
  checks every request's Host, Origin and Sec-Fetch headers, so websites you
  visit can't reach it or trick it into acting. A strict
  Content Security Policy allows no inline scripts except the app's own,
  pinned by hash.
- **End-to-end encrypted sync and friends**, with standard primitives:
  AES-256-GCM, X25519, Ed25519 and HKDF. The relay passes sealed messages it
  can't read.
- **You host the relay.** It runs on your own free Cloudflare account, and only
  your devices and people you approve can use it. Every request is signed.
- **Your devices sign their records.** Removing a device rotates the keys and
  locks it out of Friends, so a lost laptop can't read new data or rewrite
  old data.
- **Signed updates.** Updates come only from this project's GitHub releases
  and must carry a valid Ed25519 signature. Unsigned or older releases are
  refused.
- **An assistant on a short lead.** It has no shell and no file tools. It can
  do nearly everything in the dashboard, and every change has Undo. Anything
  sensitive (friends, devices, relay, sign-ins, money rules, updates) is only a
  proposal that you approve on screen, never done behind your back.
- **Untrusted text stays text.** Emails, calendar invites, bank memos, invites
  and friends' data are escaped before they reach the page. When the AI reads
  them, they are data, and they can't change anything without your click.
- **Reviewed before launch.** Before this release, six independent AI security
  reviewers each examined one area end to end: the local server, encryption
  and sync, the relay and friends, untrusted content, the AI tools and the
  release pipeline. It was a structured review, not a paid human audit. Every
  finding was fixed in [2.20.0](docs/CHANGELOG.md), apart from the first two
  limits below, which need a signing certificate and OS key storage.

**The honest limits.** The Windows installer is not code-signed yet, so
SmartScreen warns once (each release publishes SHA-256 checksums to check it
against). Sign-ins and keys on your computer are files that your own Windows
account can read, as with most desktop apps; use disk encryption. Your relay
runs on Cloudflare's free tier, so a flood of requests can pause it until
midnight UTC (it never exposes data).

The details: [docs/PRIVACY.md](docs/PRIVACY.md) (what is stored, where, and
when anything leaves your computer) and [SECURITY.md](.github/SECURITY.md)
(the threat model and how to report a problem privately).

## Cloud is optional

You never need the cloud. You choose how far your data goes.

| Level | What it means | Who can read your data |
|---|---|---|
| **1. Local only** (the default) | Everything stays in one folder on this computer. | You |
| **2. Your own devices** | Your computers stay in step through a relay **you** host on **your own** free Cloudflare account (one click in Settings > Your relay). Add a computer with *Join my other computer*: type a 4-letter code and check the same picture shows on both screens. An optional 10-word emergency backup sheet is only for the day you lose every computer. A OneDrive, Google Drive or Dropbox folder can hold an encrypted backup copy. | You, on your own devices |
| **3. Friends** | Friends connect to you with an invite link or a 4-letter friend code (live for 10 minutes, works once), you both check the same pictures, and you press Accept. They can use your relay or host their own. Each friend sees only what you choose for them. | You, and each friend only what you picked |

For the most privacy, host your own relay, or stay local and use the relay only
between your own devices. There is no Freeflo cloud at any level.

<p align="center">
<img alt="Settings > Sync: off, with 'your data stays on this computer' (demo data)" src="docs/media/settings-sync.png" width="49%">
<img alt="Settings > Your relay: Set up my relay on your own Cloudflare account (demo data)" src="docs/media/settings-relay.png" width="49%">
</p>

## Install

**Windows (recommended):** download `OpenDash-Setup-<version>.exe` from the
[latest release](https://github.com/mahdi1190/opendash/releases/latest) and run
it. It needs no administrator rights and includes Node.js. SmartScreen may say
"Windows protected your PC": choose **More info**, then **Run anyway**, after
checking the file against `SHA256SUMS-installer.txt` on the release.

**macOS, Linux, or Windows without the installer:**

1. Install [Node.js](https://nodejs.org) 20 or newer (the LTS version).
2. Download `opendash-v<version>.zip` from the
   [latest release](https://github.com/mahdi1190/opendash/releases/latest) and
   unzip it.
3. Run `sh start-opendash.sh` (macOS and Linux) or double-click
   `start-opendash.bat` (Windows).
4. Your browser opens <http://localhost:4173>. Follow the short welcome, or
   choose **Load demo data** to look around.

**Updates** are built in: Settings > Updates checks GitHub when you ask,
verifies the signature and checksum, backs up the replaced files and restarts.
Your data folder is never touched. Full steps are in the
[install guide](docs/INSTALL.md).

## Documentation

| Guide | What is in it |
|---|---|
| [Install](docs/INSTALL.md) | Windows, macOS and Linux, options, updating, uninstalling |
| [Using Freeflo](docs/USAGE.md) | a tour of every area, quick add and keyboard shortcuts |
| [Friends guide](docs/FRIENDS_GUIDE.md) | your relay, invites, what friends can see |
| [Connections](docs/CONNECTIONS.md) | Claude Code, email and calendar accounts, banks, iCal links |
| [MCP server](docs/MCP.md) | using Freeflo from Claude Code, T3 Code or Claude Desktop |
| [Privacy](docs/PRIVACY.md) | what is stored where, and when anything leaves your computer |
| [Security](.github/SECURITY.md) | the threat model, the safeguards and how to report a problem |
| [FAQ](docs/FAQ.md) | common questions |
| [Architecture](docs/ARCHITECTURE.md) | how the code is organised, for contributors |
| [Roadmap](docs/ROADMAP.md) | what comes next |
| [Changelog](docs/CHANGELOG.md) | what changed in each release |

Bug reports, ideas and pull requests are welcome: see the
[contributing guide](.github/CONTRIBUTING.md), and please use demo data in
every screenshot and report. Questions go to
[Discussions](https://github.com/mahdi1190/opendash/discussions).

## Licence

Freeflo is free and open source under the [MIT licence](LICENSE). The bundled
font (Inter), icons (Lucide) and charting library (Apache ECharts) keep their
own licences: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
