# Changelog

All notable changes to OpenDash are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and OpenDash follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For OpenDash, a **major** version may need a data-folder upgrade that older
versions cannot read; the launcher always backs the data folder up before it
upgrades it.

## [Unreleased]

Nothing yet.

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

[Unreleased]: https://github.com/mahdi1190/opendash/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/mahdi1190/opendash/releases/tag/v2.0.0
