# Architecture

An overview of how OpenDash is put together, for contributors. The complete,
file-by-file map with every helper and rule is `MODULES.md` in the repository
root; this page is the short version. When the two disagree, `MODULES.md`
wins: it is updated with every change to the code.

## Principles

- **Local-first.** A small Node server on `127.0.0.1` and one page in the
  browser. No cloud service of its own, no account, no telemetry.
- **Zero npm dependencies.** Node 20+ built-ins on the server; plain JavaScript
  in the page; a few vendored libraries (charts, font, icons) in `vendor/` with
  their licences.
- **One data folder.** Everything a user owns lives in `data/` (or
  `--data-dir`). Nothing personal is in the code.
- **One way to do each risky thing.** One module writes user data
  (`lib/fsutil.mjs`), one starts Claude (`lib/claude-runner.mjs`), one layer
  changes data for everything that is not the page itself (the actions layer).

## The big picture

```
 Browser                                   Node (127.0.0.1:4173)
 ┌──────────────────────────┐              ┌───────────────────────────────────┐
 │ index.html (one file,    │  /api/state  │ server/index.mjs  boot, static    │
 │ built from src/)         │ ───────────► │ server/router.mjs checks (421,    │
 │  src/app/NN-*.js         │  /api/...    │                   403, 415, 413)  │
 │  src/styles/NN-*.css     │ ◄─────────── │ server/routes/*.mjs  one per area │
 │  src/finance/*           │  /api/events │ server/actions/   validated ops,  │
 │  sw.js (offline page)    │   (SSE)      │                   undo, proposals │
 └──────────────────────────┘              │ server/state-store.mjs  409 guard │
                                           └──────────────┬────────────────────┘
 Claude Code, T3 Code, Claude Desktop                     │ lib/fsutil.mjs
 ┌──────────────────────────┐   stdio      ┌──────────────▼────────────────────┐
 │ your own Claude          │ ───────────► │ mcp/server.mjs ── HTTP + token, or│
 └──────────────────────────┘              │ embedded on the data folder       │
                                           └──────────────┬────────────────────┘
 claude CLI (your sign-in)  ◄── lib/claude-runner.mjs     │
   connectors: read only                                  ▼
                                           data/  config.json, state/, finance/,
                                                  calendar/, inbox/, logs/ ...
```

## Layers

### The page (`src/`)

- `build.mjs` concatenates `src/app/*.js` **in file-name order into one
  classic script**, `src/styles/*.css` into one style block, and inlines the
  vendored libraries, the font and the icon sprite. The result is a single
  self-contained `index.html`; nothing is fetched at runtime.
- Because the app files share **one scope**, top-level names must be unique;
  module-private helpers carry a prefix. Files `00`-`08` hold core state and
  helpers, `10`-`89` features (declarations only), `90` wiring and `99` boot.
- Views register themselves: `registerSection()` for top-level views,
  `registerHomeWidget()`, `registerSidebarBlock()`, `registerCommand()`,
  `registerSettingsGroup()`, `registerTopbarWidget()`.
- State: `saveData()` for data (undo step, persisted), `saveUI()` for view
  state. The page saves the whole state with a version stamp; the server
  refuses stale versions (409) and the page merges three-way.
- Live sync: the page listens to `/api/events` (Server-Sent Events) so changes
  made by the MCP server, scripts or other tabs appear at once.
- The Finances view (`src/finance/`) is built from ordered parts into one
  closure (`window.FinanceView`).
- `src/sw.js` is the service worker for the offline page only.
- Home (`src/app/12-home*.js`) is a widget grid: one file per widget
  (`12-home-w-<id>.js`), registered with `registerHomeWidget()`, with the
  layout saved in the state so the assistant and MCP can change it too.
- The full-screen stories (`src/app/79-story-*.js`) share one player: a pure
  timing and narration core (`79-story-core.js`, tested in Node), the engine,
  and one builder per story (morning, evening, week) on top of a day model
  that the server builds (`lib/story-data.mjs`, `lib/story-script.mjs`).

### The server (`serve.mjs`, `server/`)

- `serve.mjs` is the entry point; `server/lifecycle.mjs` handles clean stops,
  restarts and exit codes for the supervisor (`tools/supervisor.mjs`).
- `server/router.mjs` applies the checks to every request: Host (421),
  same-origin for anything that changes data and for every `/api/` read (403),
  JSON bodies (415), body limits (413). Route files in `server/routes/` are
  loaded automatically.
- `server/state-store.mjs` owns the state file: compare-and-swap on the
  version, backups, change events.
- `server/actions/` is **the** way to change data outside the page's own
  save: operations with JSON Schemas, dry runs, confirm tokens for bulk or
  destructive changes, undo history, idempotency keys and proposals.
- Only `index.html`, `/favicon.ico` and `/sw.js` are served as files.

### The MCP server (`mcp/`)

- `mcp/server.mjs` speaks JSON-RPC over stdio with no dependencies. Its tools
  are generated from the actions layer, so a new operation becomes a tool
  automatically.
- While OpenDash runs it calls the server over HTTP with the local token;
  otherwise it runs the actions layer embedded on the data folder, under the
  same lock.
- `--mode propose` exposes read tools plus `propose_changes` only; the in-app
  assistant uses it.

### Shared libraries (`lib/`)

| Module | Role |
|---|---|
| `fsutil.mjs` | the only way to write user data: atomic writes, retries when a sync client locks a file, a cross-process lock |
| `datadir.mjs` | finding the data folder, its layout, `config.json` |
| `claude-runner.mjs` | the only way to start `claude`: job profiles, tool and model allowlists, queue, typed errors |
| `ai.mjs`, `assistant.mjs` | text and JSON helpers; the assistant on the propose-mode MCP server |
| `sources.mjs`, `source-adapter.mjs`, `ical.mjs`, `calendar-sources.mjs`, `inbox-sources.mjs` | data sources (banks, calendars, mailboxes), the generic read-only adapter, the iCal fetcher |
| `calendar.mjs`, `calendar-jobkit.mjs`, `inbox.mjs`, `finance.mjs`, `finance/` | the calendar, inbox and finance jobs and the finance pipeline (CSV import, categories, transfers, analysis) |
| `calendar-visibility.mjs` | which events show, and which make up the user's own day (the stories, the brief and Home) |
| `finance/brief.mjs` | the optional AI wording of the money brief, checked against the same model the page runs (`src/finance/25-money-model.js`) |
| `brief-store.mjs`, `brief-config.mjs`, `weather.mjs` | the morning brief's and reviews' files, their settings, and the Open-Meteo weather |
| `story-data.mjs`, `story-script.mjs` | the day model the stories show, and their words (built-in, or written by Claude and checked) |
| `resources.mjs` | Files & links: parsing, the safe open and reveal commands, the folder explorer |
| `connections.mjs` | what is connected and how to check it |
| `sharing.mjs`, `zip.mjs` | export and import, backups, the clean app copy, diagnostics, a minimal zip reader/writer |
| `workspace-index.mjs`, `autolink.mjs` | the workspace index and the auto-linker |
| `os-integration.mjs` | the opt-in Windows start-up switches |
| `people-tags.mjs`, `customise.mjs`, `select-logic.mjs`, `home-topbar.mjs`, `brief-logic.mjs` | page rules evaluated in Node, so the page, the server and migrations agree |

### Tools (`tools/`)

- `supervisor.mjs`: runs the server as a child and restarts it.
- `migrate.mjs` and `migrations/NNN-*.mjs`: data-folder upgrades, run by the
  launchers with `--auto` after a backup.
- `actions-cli.mjs`: the actions layer from the command line.
- `make-fake-data.mjs` and `make-fake-finance.mjs`: invented demo data for
  the welcome, tests and screenshots (a longer finance history for the
  Finances view).
- `release-*.mjs`, `privacy-scan.mjs` and `privacy-deep.mjs`: the clean export, the privacy scan
  (and its `--deep` pass), the release zip and the brand assets (see
  [docs/dev/RELEASING.md](dev/RELEASING.md)).
- `start-hidden.wsf`: the fixed no-window launcher used by the Windows
  switches.

## How a change flows

1. **From the page**: a click changes `state`, `saveData()` records an undo
   step, and the page sends the state with its version. The server checks the
   version, writes through `fsutil`, makes a backup when due, and tells other
   tabs over `/api/events`.
2. **From Claude (MCP), the assistant or a script**: an operation goes to the
   actions layer, which validates it, takes the lock, applies it to the state
   with compare-and-swap, records undo history and notifies open pages, which
   show "Updated by ..." with Undo.
3. **From a connector**: a job runs `claude` through the runner with a
   read-only profile, validates every field, keeps only what appears in the
   raw tool results, and writes a snapshot (calendar, inbox, transactions) in
   the data folder. Connectors never write to the task state directly.

## Where to start reading

| To change... | Start in |
|---|---|
| a view or widget | `src/app/` (find the area in `MODULES.md` section 1) |
| an API | `server/routes/<area>.mjs` |
| what Claude or a script can change | `server/actions/ops*.mjs` |
| what the MCP server tells a model | `mcp/instructions.mjs` |
| a Claude job | `lib/claude-runner.mjs` profiles and the job's `lib/*.mjs` |
| the data folder layout | `lib/datadir.mjs` and `MODULES.md` section 4 |
| data upgrades | `tools/migrations/` and `MODULES.md` section 5 |
| starting, stopping, restarting | `MODULES.md` section 9 |
