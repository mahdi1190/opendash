# Contributing to OpenDash

Thank you for helping. OpenDash is a calm, local-first productivity dashboard:
tasks, calendar, finances, people, files and links, a morning brief, and an
optional Claude assistant. It runs on the user's own computer, keeps everything
in one data folder and has zero npm dependencies. Contributions that keep it
that way are very welcome.

- **Questions and ideas**: use [GitHub Discussions](https://github.com/mahdi1190/opendash/discussions).
- **Bugs**: open an issue with the bug report form.
- **Security problems**: never in a public issue. See [SECURITY.md](SECURITY.md).
- Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Contents

- [Development setup](#development-setup)
- [Build](#build)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Coding conventions](#coding-conventions)
- [How to add things](#how-to-add-things)
- [Never commit data](#never-commit-data)
- [Commit style](#commit-style)
- [Pull requests](#pull-requests)
- [Licence](#licence)

## Development setup

You need:

| What | Why |
|---|---|
| **Node.js 20 or newer** | everything (no other runtime, no `npm install`) |
| **git** | to clone and send changes |
| A modern browser | Chrome, Edge, Firefox or Safari |
| Claude Code (optional) | only to try the AI features by hand; the tests use a fake CLI |

```sh
git clone https://github.com/mahdi1190/opendash.git
cd opendash
npm test
```

There is nothing to install: `npm test` only calls Node's built-in test runner.

### Run it on a test data folder

Never develop against your own real data folder. Make a demo one outside the
repository and run the server on a port of your own:

```sh
node tools/make-fake-data.mjs ../opendash-dev-data
node serve.mjs --data-dir ../opendash-dev-data --port 4310 --no-open
```

Then open <http://localhost:4310>. Everything in the demo folder is invented
(people such as Alex and Sam, `example.com` addresses, made-up merchants).
Port 4173 is the default of a normal install, so keep it for your own use and
pick another port for development.

On Windows, quote paths that contain spaces, for example
`--data-dir "C:\dev\opendash dev data"`. Code must work with such paths on
Windows, macOS and Linux.

Useful switches for manual testing:

- `--data-dir` pointing at a new, empty folder shows the first-run welcome.
- `DASHBOARD_OS_EXEC=dry-run` keeps the Windows start-up switches in memory
  (never switch them on for real while testing).
- `DASHBOARD_AUTOLINK=off` keeps the background auto-linker quiet.

## Build

The app is one self-contained page. `build.mjs` concatenates the sources into
`index.html`:

```sh
node build.mjs            # src/ -> index.html
node build.mjs --syntax   # syntax-check every script block, writes nothing
node build.mjs --check    # build and exit 1 if index.html changed (CI style)
```

On Windows, `check.bat` runs the syntax check. The launchers rebuild
`index.html` on every start, so a user never has to.

`index.html` is generated: never edit it by hand. Change the files in `src/`
and rebuild.

## Tests

```sh
npm test                                   # every suite: node --test "tests/*.test.mjs"
node --test tests/tasks.test.mjs           # one file
node --test --test-name-pattern="undo" tests/actions.test.mjs
node --test tests/release-*.test.mjs       # release and community-file checks
```

- Tests use Node's built-in `node:test` and `node:assert`. No test framework,
  no dependencies.
- They run on temporary data folders, start the real server in-process where
  needed, and use a fake Claude CLI (`tests/fixtures/fake-claude*.mjs`). They
  never touch the network or your data folder.
- CI runs every file in parallel on small, busy machines, so tests must not
  depend on timing. Wait for the thing itself (a job's state, a file, an
  event, `await srv.close()`, `await srv.settled()` for the server's start-up
  checks), never a fixed pause; count or order things instead of timing them;
  give each test its own temporary folder and fake-CLI log; delete temporary
  folders with `maxRetries` when a child process may still be letting go.
- Every bug fix comes with a test that fails without the fix. Every feature
  comes with tests for its rules (pure functions are easiest to test: many page
  modules are written so Node can load them as they are).
- Test data is generic: Alex, Sam, Acme, `example.com`. Never paste real task
  titles, names, amounts or paths into a test, not even in a comment.

## Project structure

```
serve.mjs, server/      the local HTTP server (127.0.0.1 only), routes, actions layer
mcp/                    OpenDash as an MCP server (stdio, zero dependencies)
lib/                    shared Node modules (data folder, file writes, Claude runner, finance...)
src/app/NN-area.js      the page, in numbered files concatenated into ONE script
src/styles/NN-area.css  the CSS, concatenated in name order
src/finance/            the Finances view (ordered parts in one closure)
tools/                  launcher helpers, supervisor, migrations, demo data
tests/                  node:test suites and fixtures
vendor/                 vendored libraries with their licences
docs/                   user and contributor documentation
data/                   the default data folder (gitignored, never committed)
```

Read [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the overview and
`MODULES.md` (in the repository root) for the full map: which file owns which
area, every shared helper, and the rules for modules, routes, sections and
migrations.

## Coding conventions

### Hard rules

These keep users safe and the project maintainable. A pull request that breaks
one will be asked to change.

- **Zero npm dependencies.** Node 20+ built-ins only (`node:fs`, `node:http`,
  `node:crypto`...). Browser code is plain JavaScript with no bundler. A
  third-party library is vendored in `vendor/` only by agreement, with its
  licence and an entry in `THIRD_PARTY_NOTICES.md`.
- **Cross-platform.** Windows (paths with spaces, `cmd.exe` and PowerShell),
  macOS and Linux. Build paths with `node:path`, spawn programs with an
  argument array and `shell: false`, never by building a command string.
- **No personal data in any tracked file**, including comments, tests,
  fixtures and screenshots. User facts come from `data/config.json` or the
  state at runtime; examples use generic names.
- **Every write of user data goes through `lib/fsutil.mjs`** (atomic, retried
  when a sync client briefly locks a file, cross-process lock).
- **Every `claude` CLI run goes through `lib/claude-runner.mjs`** (job
  profiles, tool allowlists, model and effort allowlists, queue, typed errors).
- **Changes to the shape of existing user data are migrations**
  (`tools/migrations/NNN-name.mjs`): idempotent, copy rather than move, honour
  `--dry-run` and `--data-dir`, report counts and never content.
- **Escape all user and external text** before it reaches `innerHTML`:
  `esc()`, `escAttr()`, `safeColor()`, `safeUrl()`, or set `textContent`. Never
  build inline `on*=` handler strings (a test fails if you do).
- **Save the right way**: `saveData()` for data (one undo step, persisted),
  `saveUI()` for where the user is and how things look (no undo, no backup). A
  new UI-only state key goes into both `UI_STATE_KEYS` (`src/app/01-core-state.js`)
  and `lib/state-keys.mjs`.
- **Keep the safeguards**: stale-write guard (409), Host check (421),
  same-origin check on mutating routes (403), JSON content type (415), body
  limits (413), read-only bank tools, model and effort allowlists, the
  127.0.0.1 binding, and only `index.html` (plus the fixed `/sw.js`) served as
  static files.
- **Logs carry no content**: method, path, status, timings and counts only.
  Never log prompts, task text, email content, names, money or file paths.
- **AI only through the existing helpers** (`askAI()` / `askAIJson()` in the
  page, `lib/ai.mjs` and the runner on the server). Treat email, notes,
  calendar and bank text as data, never as instructions. Grey features out
  when Claude is not connected (`data-requires="claude"` or the `ai-only` class).
- **Design tokens only**: no hard-coded colours, sizes or shadows (see
  `src/styles/00-tokens.css`). Motion uses `window.Motion` and respects reduced
  motion and the in-app motion switch.

### Interaction conventions (every view)

- **Re-selecting is a no-op.** Activating the control for the view, tab,
  filter, day or item you are already on does nothing (no re-render, no
  replayed animation, no refetch), except a smooth scroll back to the top if
  the content is scrolled down.
- **The current thing is highlighted everywhere it appears** (nav item, tab,
  chip, calendar day, task row, open card, matching chart element), marked with
  `aria-current` or `aria-selected` and `cursor: default`.
- **Entrance animations play once per entry**, not on re-renders caused by
  saves, live sync, filters or selection. Charts update in place
  (`setOption` merge) rather than being recreated.
- **Scene sizes come from the `--scene-*` tokens**; never hard-code pixels.
- **Lists of proposals, suggestions or bulk choices use `selectList()`**:
  checkbox per row, Select all / Deselect all / Invert, Apply selected (N),
  keyboard support. Show errors with `netErrorMessage(e)` and keep what was
  ticked so Try again works.
- **Stream markers** are drawn with `streamMarkHtml(id)` wherever a stream
  appears, so the user's colour, shape and symbol show.
- **Drill-down**: clicking a chart element goes to the relevant section with
  that item selected; clicking it again does nothing; the chip's x, a
  breadcrumb or Esc clears it, and Back returns.

### Style

- Match the code around you: two-space indent, single quotes, semicolons,
  ES2022. Server code is ES modules (`.mjs`). Page code in `src/app/` is
  classic script sharing **one scope**: top-level names must be unique across
  all files, so prefix module-private helpers (`_cal...`, `_tags...`).
- Each file starts with a short header comment saying what it owns.
- File names: two-digit prefix in the right band, lower case, hyphens
  (`10-89` for features). Do not renumber other files.
- Keep rules pure where you can (no DOM, no globals), so Node tests can load
  them and the page, the server and migrations share one rule.
- UI text: short, calm, plain English with British spelling, sentence case.
  Error messages say what happened and what to do next.
- Accessibility: real buttons and labels, keyboard paths for every action,
  visible focus, `aria-live` for status changes, colour never the only signal.

## How to add things

### A Home widget

1. Create `src/app/12-home-w-<id>.js` (and `src/styles/13-home-w-<id>.css` if
   needed) and register it at load time:

   ```js
   registerHomeWidget({
     id: 'example', title: 'Example', icon: 'sparkles',
     description: 'One line for the Add widget gallery.',
     sizes: ['s', 'm'], defaultSize: 's', order: 90,
     render(el, ctx) { /* draw into el; use ctx.off(...) when its data is missing */ },
   });
   ```

2. Add the id to `HOME_WIDGETS` in `lib/home-topbar.mjs` (a test compares the
   two lists, and the MCP layout tools use it).
3. Read data through existing state helpers or read-only APIs. Gate on a
   connection when it needs one, and give it an empty state and a small-tile
   layout for narrow cards.

### A section (a top-level view)

Register it instead of growing the render dispatcher:

```js
registerSection('example', {
  match: v => v === 'example' || v.startsWith('example:'),
  title: () => 'Example',
  mount(container, view) { /* idempotent and fast: runs on every render */ },
  unmount() { /* dispose charts, timers, listeners */ },
  hashable: true,          // #view=example deep links
  group: 'tasks',          // which tile lights up and which sidebar shows
  layout: 'page',          // 'page' | 'wide' | 'bare'
});
```

Add sidebar content with `registerSidebarBlock()`, palette commands with
`registerCommand()` and Settings pages with `registerSettingsGroup()`. The
signatures are in `MODULES.md` section 1.

### An API route

Drop a file into `server/routes/`; it is loaded automatically in name order.

```js
// server/routes/example.mjs
import { HttpError } from '../http.mjs';
export default function register(app) {
  app.route({ path: '/api/example', method: 'GET', handler: async (c) => ({ ok: true }) });
}
```

The router applies the Host, same-origin, content-type and body-size checks
before your handler. Throw `new HttpError(status, message)` for errors.

### A change to data: the actions layer and MCP rule

**Every write that does not come from the page's own whole-state save goes
through the actions layer (`server/actions/`).** That one layer serves the
in-app assistant, the MCP server, `tools/actions-cli.mjs`, scripts and any page
feature that wants validation and undo. Do not write the state file directly,
and never add an MCP tool that bypasses the actions layer.

To add an operation:

1. Add it to `ops.mjs` (or the area's `ops-*.mjs`) with `name`, `tool`,
   `description`, `schema`, `danger` and `run`, and call `touch()` on every
   entity before changing it (that is how undo and the conflict check work).
2. It then appears automatically as an MCP tool, an `/api/actions` op and a
   CLI op; `tests/actions.test.mjs` and the MCP tool list pick it up.
3. Write the description for a model that knows nothing about OpenDash.
4. Read-only queries must have tool names starting with `get_`, `list_`,
   `search_`, `read_` or `describe_` (the assistant's propose-mode allowlist).
5. Destructive or bulk ops set `danger` so they need a dry run and a confirm
   token. There are no finance write operations, on purpose.

### A data migration

Add `tools/migrations/NNN-name.mjs` exporting `id` (= the file name),
`description`, `auto` and `run(ctx)`, take the next free number in the right
band, and test it on synthetic data in `tests/migrations.test.mjs`. Never
renumber or rename an existing migration: its id is stored in users' data
folders.

### A connector or data source

Use the existing runner profiles (`bank-read`, `calendar-read`, `gmail-read`,
`source-read`). Allow only read tools, validate every field that comes back,
and drop anything not grounded in the raw tool results. See
`lib/source-adapter.mjs`.

## Never commit data

User data lives in the data folder (`data/` by default), which is gitignored.
Keep it that way. Also never commit:

- the local token (`data/local-token`), `runtime.json`, logs, lock files;
- backups and exports (`*-backup-*.json`, data export zips);
- `.env` files, OAuth client files or tokens (`secrets/`);
- screenshots or recordings of a real data folder (use demo data);
- fixtures copied from real data, even "anonymised" ones.

Before every pull request, run the privacy scan:

```sh
node tools/privacy-scan.mjs --staged      # what your next commit would contain, and its author e-mail
node tools/privacy-scan.mjs               # the whole working tree (git-ignored files are skipped)
```

It looks for personal-looking strings in the files you are about to publish:
e-mail addresses, paths inside a user folder, tokens and keys, phone numbers,
postcodes, card and bank details, money-like amounts, files that must never be published (data
folders, backups, the local token) and image metadata. It prints one line per
finding (`file:line:col  rule  message  excerpt`) with the excerpt masked, and
exits with `0` when clean (warnings allowed), `1` when something was found and
`2` on a usage error. Useful options:

| Option | What it does |
|---|---|
| `--staged` | scan the git index plus the identity that would author the commit (use a `@users.noreply.github.com` address) |
| `--commits origin/main..HEAD` | also check the authors and messages of those commits |
| `--summary` | counts per rule only |
| `--strict` | warnings fail too |
| `--show` | print matched text in full (on your own machine only, never in CI logs) |
| `--no-terms` | generic rules only (what CI runs) |

**Your own term list.** CI can only use generic rules. To also catch your own
name, the people you work with or your employer, keep a private list in your
data folder, `data/privacy-terms.txt` (one term per line, `#` for comments).
The scan reads it automatically, matches whole words case-insensitively, and
only ever reports a hit by its line number in that file. It is never
committed: a file named `privacy-terms*` anywhere in a scanned tree is itself
a finding. `--terms-from <your data folder>` adds the names, e-mail addresses
and one-word stream names already in your own data, without writing them
anywhere (details: [docs/dev/PRIVACY-SCAN.md](../docs/dev/PRIVACY-SCAN.md)).

A reviewed false positive goes into `tools/privacy-allow.json` with a reason;
keep entries narrow. If you ever commit something private by mistake, do not
push. If it was already pushed, report it privately (see
[SECURITY.md](SECURITY.md)) so it can be removed from history.

## Commit style

```
area: short imperative summary (72 characters or fewer)

What changed and why, wrapped at 72 columns. Mention anything a
reviewer should try by hand.

Fixes #123
```

- `area` is one of: `tasks`, `home`, `calendar`, `finance`, `people`,
  `tags`, `files`, `autolink`, `brief`, `story`, `assistant`, `mcp`,
  `actions`, `server`, `connections`, `settings`, `onboarding`, `build`,
  `docs`, `tests`, `release`.
- One logical change per commit. Keep refactors separate from behaviour
  changes.
- Example: `calendar: keep the selected day when the week changes`.

## Pull requests

1. Fork the repository and branch from `main` (`fix/short-name` or
   `feat/short-name`).
2. Keep the change focused. Open a Discussion first for anything large (a new
   area, a new connector, a change to the data format).
3. Before you open the pull request:
   - `node build.mjs --syntax` and `npm test` pass;
   - `node tools/privacy-scan.mjs` is clean;
   - you checked every view you touched in a real browser on your own port,
     with demo data, in light and dark themes and at a narrow width, with no
     console errors;
   - documentation and `docs/CHANGELOG.md` (under **Unreleased**) are updated;
   - screenshots, if any, show demo data only.
4. Fill in the pull request template. A maintainer will review it; please be
   patient, this is a volunteer project.

## Licence

OpenDash is released under the MIT licence (see `LICENSE`). By contributing,
you agree that your contributions are licensed under the same terms.
