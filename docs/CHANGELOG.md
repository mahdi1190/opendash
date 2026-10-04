# Changelog

All notable changes to OpenDash are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and OpenDash follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For OpenDash, a **major** version may need a data-folder upgrade that older
versions cannot read; the launcher always backs the data folder up before it
upgrades it.

## [Unreleased]

### Added

- Settings > Updates: Check for updates asks the project’s GitHub releases for the newest version (nothing about you is sent), shows what is new, and Update installs it: a release zip is downloaded, verified against its published SHA-256, swapped in (the replaced files are kept in the data folder’s update-backup) and the server rebuilds and restarts; a git checkout is fast-forwarded to the release tag. An optional once-a-day check is off by default. Palette: Check for updates, Update OpenDash.
- A Texas animation pack with nine full-screen scenes (the Hill Country in bluebonnets, a West Texas sunset, the Gulf Coast, the Fort Worth Stockyards, Dallas, a Houston liftoff, the Austin bats, the Alamo, El Paso's star) shown under "Welcome to <town>" when the app opens, plus Lone Star openings, symbols and celebrations, a big-sky sunset, a landmark for six Texas cities, and Texas Independence Day, San Jacinto Day, Juneteenth, bluebonnet and rodeo season and Friday night lights. It plays only in Texas (a travel city there, or a weather town within reach) and can be switched off in Settings > Animations.

## [2.2.1] - 2026-10-04

### Fixed

- Home editing is a proper grid editor: drag to move with a live drop preview, drag edges or the corner to resize, the other widgets reflow; keyboard moves and resizes; Undo.
- Stories always play full screen, with a volume slider and mute; task buttons in stories now really change the task, with Undo.
- The assistant suggests several changes at once, including adding people from meetings and tasks who are not in People yet.
- Finances shows Connect your bank at once when nothing is connected, and a timeout with Try again instead of loading forever.
- The MCP server list updates straight away after adding or removing a server; new Add to Claude Code button.
- Pick the workspace icon yourself (logo, initial, icon or emoji), or keep it automatic.
- First-run setup highlights the theme actually in use.

## [2.2.0] - 2026-10-04

OpenDash 2.2 "Alive": the animation update. This release also includes all
of the 2.1 "Do more from Home" work, which was not released separately.

### Highlights

- **Home and the morning brief are one page.** The big animated greeting,
  your day in three sentences, *Play my morning* and the Today / Evening /
  Week / History tabs sit on top of your widgets.
- **An animation library** behind everything animated, with a gallery to
  preview, favourite and block animations, a new look every day, and seven
  themes (Calm, Playful, Cinematic, Retro pixel, Hand-drawn, Paper cut-out,
  Neon night).
- **A full-screen opening:** OpenDash, a welcome to your county, then a scene
  from it. Settings > Animations > Opening: every load, first load of the
  day, or off.
- **The UK pack (first regions):** full-screen scenes for the South West and
  Hampshire; county detection is opt-in and offline. Other places get a
  seasonal landscape.
- **Moments across the app:** seasonal and festival days, real sunrise and
  sunset skies, story skins, streak flames, calendar event scenes, payday and
  budget moments, achievements, month and year recaps, a world pack for
  travel, and *make your own* animations drawn by the assistant.
- **Signature light/dark transition.**

### Fixed

- Start at login and the *Start server* button use a plain Node launcher
  (`tools/start-hidden.mjs`); the old script-host file is gone because
  Windows Defender flagged it.
- Settings that saved but did not redraw (story or page, read aloud, voice
  and speed, weekly review); the 12/24-hour clock is used everywhere; picking
  a time zone saves it.
- *Ignore* on "not in People yet" names now works for names of two or more
  words.
- Pin to top always puts pinned items first (Focus, board, sidebar).
- Home suggestions fill up to the chosen count and say why when they cannot.
- The Focus count from *Tune* is used everywhere; the List widget's Rows
  setting is respected.
- Sort and "show N" for the sidebar's Streams, Tags and People, with drag
  to reorder.

### Added

- **Travel and time zones.** The page and the server share one clock: it
  follows this computer by default, your configured zone becomes your *home*
  zone, and money days stay on home time. Settings > Travel & time has
  *Dashboard time* (follow this computer, always home time, or always one
  zone), the home time zone and the clock format. Optional, local-only trip
  detection (a time-zone change, travel in your calendar, payments abroad,
  optionally the browser's location reduced to the nearest city; no geo-IP),
  arrival, departure and welcome-home moments, a second clock for home time,
  meetings shown in both zones, jet-lag and public-holiday hints, and travel
  suggestions. People can have their own time zone. *Forget this trip* removes
  what the dashboard inferred about a trip.
- **Motion.** Settings > Animations has an *Intensity* control (Off, Subtle,
  Standard, Playful) with a live preview; page and section changes, lists and
  the theme switch animate, an opening animation plays on load, the sky scenes
  gain weather layers, and finishing things can play a small celebration.
  *Reduce motion* still keeps everything still.
- **People overhaul.** People open in their own centre card, like tasks (the
  side panel is still there); profile and cover pictures (upload, emoji or
  symbol, built-in covers, Gravatar as an opt-in); a List or Grid view with a
  show filter; and the People actions are back in reach: *Find people in
  emails*, *Check email*, *Review suggested links*, *Assign to tasks…* and
  *Link tasks…* per person.

- **Suggestions that do the thing.** One-click ideas on Home, in the Today
  hero, the Morning brief and the stories: block free time for your top task,
  book the hours a deadline needs, prep before a meeting, move your block when
  a meeting lands on it, answer an invitation, rebook a block that came and
  went, plan tomorrow's first block, roll over what slipped, set an estimate,
  nudge someone you are waiting on, reply to someone waiting on you, turn
  emails into tasks, follow up after a meeting, and pick up a stream that went
  quiet. The main button opens the normal editor already filled in (nothing is
  saved until you press *Save*); the small ✓ does it as offered, at once, with
  *Undo*. Settings > Suggestions has a switch for each kind. "Why am I seeing
  this?", *Not now* and *Stop these* on every card.
- **Writing to Google Calendar**: create, move, resize and edit events, and
  answer invitations, from the Calendar and from Home, with *Undo*. Blocking
  time makes a real calendar event linked to its task, never a stand-in task.
- **Sixteen new Home widgets** in Add widget: Quick capture, Fill the gap, Plan
  my day, Meeting prep, After meetings, Invites & clashes, Needs reply, I owe,
  Catch up, Deadline runway, Smart list, Habits & routines, Launchpad, Payday &
  safe to spend, Daily note and What changed. Some can be added more than once
  (Deadline runway, Smart list), and many have their own settings.
- **The Morning brief on Home**: your day in three sentences, the shape of the
  day as a track, tiles for deadlines, Focus and money, and ideas; the story
  plays inside the panel and can go full screen. Evening and weekly versions
  appear at their time.
- **Money story**: *Play story* on the Finances Overview plays a short,
  read-aloud recap of the month or week, with the Overview's own numbers.
- **Gmail drafts**: replies, nudges and thank-yous are saved as drafts in
  Gmail (in the right thread), never sent. Undo deletes the draft.
- **Working hours** (Settings > Profile) and **planned time slots**: plan a
  task for a time without moving its deadline; slots show dashed in Today's
  schedule and every Calendar view.
- **Daily note**: one running markdown note per day; MCP clients can read and
  add to it (`get_daynotes`, `save_daynote`); the in-app assistant is not
  given your notes.
- **Settings > Home**: Customise, the brief and suggestions panels, Hide
  amounts and working hours in one place.
- The demo data now gives every new widget and suggestion something to show.

### Changed

- Dragging a task onto a time in the week or day view plans a slot; the
  deadline stays where it was.
- New widgets that are shown by default appear in their natural place on an
  existing Home board (the Morning brief right under the hero), not at the end.
- The Today hero, Today's schedule, the brief and the stories count free time
  inside your working hours.
- "Today", due dates, the calendar, the brief, the stories and the assistant
  all use the same clock, so they agree on what day it is while you travel
  and on daylight-saving days. Backups, data exports and the transactions CSV
  are named after the home day.

### Security

- Sending email is impossible by design: every Claude run is denied the Gmail
  send, reply and forward tools, and the Gmail drafts profile allows exactly
  one planned draft call.
- Calendar writes and Gmail drafts refuse a Claude record that answers one
  call twice (a refusal followed by a forged "success").

## [2.0.0] - 2026-10-03

The first public release of OpenDash: a calm, local-first productivity
dashboard that runs on your own computer, keeps everything in one data folder
and has an optional Claude assistant. (It starts at 2.0.0 because it grew out
of earlier private builds; see the notes at the end.)

### Added

- **Home**: a customisable grid of widgets (drag, resize, hide, add back,
  reset; press and hold a widget's title to start): Today, with the date, weather and your day in a few sentences that
  link to what they mention; Focus (the tasks that matter now, which open in
  place with their subtasks); Today's schedule with its free stretches;
  Suggested links; Waiting on; Money; People today; This week; Countdowns.
  A new, empty Home shows three first steps instead.
- **Tasks**: streams (areas of work), priorities, tags, subtasks, people,
  recurring tasks, a planned day separate from the due date, time estimates,
  "won't do", pinning, notes and history. Today, Upcoming, All tasks, No date,
  Logbook and Wins, as a list or a board; search with operators
  (`#tag @person p1 is: due: stream:`), bulk edits, a Bin, and undo and redo
  everywhere. Tasks and calendar events open in a centre card or a side
  panel.
- **Quick add everywhere** with natural language: dates, times, repeats,
  priority, stream, tags, people and estimates in one line
  (`Send Alex the slides fri 3pm #work !p1 ~1h`).
- **Calendar**: month, week, day and agenda views next to your tasks; drag a
  task onto the week to plan it; your own notes and agenda on events; several
  calendars and sources, including iCal links. Other people's calendars start
  switched off, and Home, the brief and the stories keep to your own day.
- **Finances**: the money brief (how this pay cycle is going in three
  sentences, safe to spend a day, the bills before payday), then spending,
  categories, merchants, cash flow, recurring payments, budgets, transactions
  and "worth a look" flags. Import bank CSV exports with no connection at all,
  or sync read-only through a bank connector. Export every transaction to CSV.
- **People**: profiles, notes, who you owe and who is waiting on you, linked
  tasks (from tags and names in titles), next meeting, last contact and recent
  email.
- **Files & links**: attach folders, files, web links, GitHub repositories,
  pull requests and issues, Google Drive files and code snippets to tasks,
  streams and people; open, reveal and explore them.
- **Auto-linking**: point OpenDash at your workspace folders and it finds the
  folder, repository, meetings, emails, people and related tasks each task
  belongs to; confident links are attached for you (with Undo), the rest wait
  as suggestions.
- **Morning brief, Finish the day and the weekly review**, each as a page and
  as a full-screen story read aloud with your browser's speech voices, with a
  library of animated scenes. Optional weather from Open-Meteo.
- **Assistant** (optional, uses your own Claude Code sign-in): ask in plain
  words; it looks things up and proposes changes that you apply with a click.
  Also per-task chat, email triage suggestions and short AI summaries.
- **MCP server**: use OpenDash from Claude Code, T3 Code or Claude Desktop.
  It explains itself to any model, with safety rails: ISO dates only, duplicate
  checks, dry runs for bulk and destructive changes, undo for everything, and a
  propose-only mode.
- **Connections and data sources**: see what is connected and what it unlocks;
  add several banks, calendars and mailboxes from any MCP server your Claude
  can reach, always read-only.
- **Customisation**: right-click any stream, tag or person to rename it or
  change its colour, symbol and shape everywhere at once.
- **Your data in one folder**: automatic backups with one-click restore,
  export and import of all data, a clean copy of the app to share, reset, and
  a diagnostics report with personal details removed.
- **Server control**: a supervisor that restarts the server after a crash,
  Restart and Rebuild & restart from Settings, an offline page when the server
  is not running, and optional Windows start-up switches (off by default).
- **First-run welcome**: name, region, a starting set of streams, theme, and
  optional demo data.
- **Command palette** (Ctrl+K), keyboard shortcuts for everything, light, dark
  and automatic themes, and reduced motion.
- Launchers for Windows, macOS and Linux (`start-opendash.bat`,
  `start-opendash.sh`). Requires Node.js 20 or newer; no npm dependencies.
- Documentation in `docs/` (install, usage, connections, MCP, architecture,
  privacy and FAQ), and a contributing guide, code of conduct, security
  policy, support page and issue and pull request templates in `.github/`.

### Security

- The server listens on `127.0.0.1` only and checks the `Host`, `Origin` and
  `Sec-Fetch-Site` headers; local programs need a per-install token.
- No telemetry. Claude runs through your own Claude Code CLI with fixed,
  minimal tool profiles; connectors are used read-only; the assistant can only
  propose changes. See [SECURITY.md](../.github/SECURITY.md) and
  [PRIVACY.md](PRIVACY.md).
- Each release zip comes with `SHA256SUMS.txt` and a build-provenance
  attestation ([INSTALL.md](INSTALL.md#which-file-to-download)).

### Notes for people who used earlier private builds

- The app is now called **OpenDash**. The launchers are `start-opendash.bat`
  and `start-opendash.sh`; the old `start-dashboard.*` names still work.
- The data folder is upgraded automatically on first start (after a backup in
  `data/backups/`). Older layouts with a separate `state/` folder print the
  one command to run.
- An existing MCP install keeps working under the name it was added with
  (`dashboard`); see [MCP.md](MCP.md).
- The Boards feature was retired; its data is archived in
  `data/backups/boards-archive-<date>.json`.
- Finances no longer need Python.
- The direct Google sign-in of earlier builds is no longer used by any view;
  use the Claude connectors or an iCal link
  ([CONNECTIONS.md](CONNECTIONS.md#older-setups-google-without-claude)).

[Unreleased]: https://github.com/mahdi1190/opendash/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/mahdi1190/opendash/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/mahdi1190/opendash/compare/v2.0.0...v2.2.0
[2.0.0]: https://github.com/mahdi1190/opendash/releases/tag/v2.0.0
