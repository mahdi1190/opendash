# OpenDash - notes for Claude Code

OpenDash: a local, single-user dashboard (tasks, calendar, finances, people, email
triage, AI helpers). Version 2.0: modular source, one data folder, zero npm
dependencies, Node >= 20, offline at runtime. **Read MODULES.md first**: it maps
every area to its files and gives the rules for adding modules, routes,
sections and migrations.

## Hard rules

- **The git remote is PUBLIC.** Never commit or push user data. All user data
  lives in the data folder (`data/` by default, gitignored; `--data-dir` /
  `DASHBOARD_DATA_DIR` to move it). The legacy `state/` and `secrets/` folders
  are gitignored too. No personal names, paths, emails, money or task text in
  any tracked file; user facts come from `data/config.json` or the state.
  That includes code COMMENTS and tests: write "the user", never the owner's
  name (e.g. "User request, 3 Oct: ..." rather than quoting them by name).
- **Live data is off limits for experiments.** Test on a copy:
  `node tools/make-test-data.mjs C:/tmp/<you>/data --finance-from <finance folder>`
  then `node serve.mjs --data-dir C:/tmp/<you>/data --port <yours> --no-open`.
  Never use port 4173 (the owner's live server) for tests.
- **Data changes to real data are migrations** (`tools/migrations/NNN-*.mjs`,
  idempotent, `--dry-run`, `--data-dir`), run with `tools/migrate.mjs`.
- Every `claude` CLI run goes through `lib/claude-runner.mjs` (job profiles,
  allowlists, queue, typed errors). Every data write goes through
  `lib/fsutil.mjs` (atomic, OneDrive-safe retries, cross-process lock).
- Escape all user/external text before `innerHTML` (`esc()`), save data with
  `saveData()` and UI with `saveUI()`, respect reduced motion.
- Keep the safeguards: stale-write guard (409), Host check (421), same-origin
  on mutating routes and every `/api/` read (403), JSON content type (415), body limits (413), bank
  fetch lockdown (read-only Bank tools only), model/effort allowlists,
  127.0.0.1 binding, only `index.html` (and the fixed `/sw.js`) served statically.
- Never switch the Windows start-up helpers (Settings > Server) on for real in a
  test: use `DASHBOARD_OS_EXEC=dry-run` or `setOsExec()` (MODULES.md section 9).

## Workflow

1. Edit `src/app/NN-*.js`, `src/styles/NN-*.css`, `src/body.html`, `server/`, `lib/`.
2. `node build.mjs --syntax` (or `check.bat`), then `node build.mjs`.
3. `npm test` (node:test, no dependencies).
4. Check it in a real browser on your own port: every view, no console errors.
5. Leave changes uncommitted unless the owner asks for a commit.

Starting it for real: `start-opendash.bat` / `start-opendash.sh` (the old
`start-dashboard.*` names are shims that call them; runs
`node tools/migrate.mjs --auto`, `node build.mjs`, then `node tools/supervisor.mjs`,
which runs `serve.mjs` and restarts it; exit codes in MODULES.md section 9).

## State (data/state/dashboard-state.json)

Top-level keys: `custom` (tasks), `statuses`, `notes`, `taskActivity`,
`completionLog`, `pinned`, `bin`, `people` (`self:true` = the user),
`countdowns`, `streams`, `quickTemplates`, `taskTemplates`, `taskChat`,
`emailTriage`, `customOrder`, `daynotes` (Home's Daily note:
`{'YYYY-MM-DD': {md, updatedAt}}`, op `daynote.save`), plus UI keys (see
`lib/state-keys.mjs`).
`_lastSave` is the version: the server stamps it on every write and refuses
older versions (409). Task syncs from Claude Code go through the dashboard
MCP (`mcp/server.mjs`, tools such as `get_context`, `search_tasks`,
`apply_changes`) or `node tools/actions-cli.mjs <ops.json> --apply`: both
validate, take the lock, keep undo history and update open tabs live. The old
`tools/apply_sync.py` (untracked) is retired; anything that still edits the
file directly must take `<file>.lock` and bump `_lastSave`.

## Render flow

`render()` -> `renderTopbar()`, `renderSidebar()`, `renderMain()`,
`renderDetail()`. `renderMain` -> `_renderMainBody` dispatches on `state.view`:
registered sections first (`registerSection`), then finance / bin / wins /
person: / triage, then the task views (list, kanban, calendar, review). Views are addressable as `#view=<name>`.

## Interaction conventions (every view, incl. Finances)

- **Re-selecting is a no-op.** Activating the control for the view, section,
  tab, filter, day or item you are already on does nothing: no re-render, no
  replayed animation, no refetch, no scroll jump. The only exception is that,
  if the content is scrolled down, it smoothly scrolls back to the top (like a
  phone tab bar). Callers that need a refresh call `render()`, not
  `setView(sameView)`.
- **The current thing is highlighted everywhere it appears**: nav item, tab,
  chip, calendar day, task row, open card, and the matching chart element
  (ECharts `select`/emphasis, with the others dimmed). Mark it with
  `aria-current`/`aria-selected` and give it `cursor: default`.
- **Entrance animations play once per entry**: when a view or section is
  entered, or new data arrives. They do not replay on re-renders caused by
  state saves, live sync, filters or selection. Charts update in place with
  `setOption` (merge) so they morph, rather than being disposed and recreated.
- **Scenes** (animation-library tiles): sizes come from the `--scene-*` tokens
  in `src/styles/76-scenes.css` (xs 28, sm 38, md 50, lg 64, xl 88, hero 132,
  tip 44, dense 22). Never hard-code pixel sizes. `animSceneHtml(type, {size})`
  uses them. To tint a scene, pass `cls:'is-tinted'` and set `--scene-tint`.
  `71-anim-continuity.js` keeps a scene's animation running across re-renders,
  keyed by the nearest `data-id` or by `data-scene-key`.
- **Lists of proposals, suggestions or bulk choices use `selectList()`**
  (11-ui-select.js): a checkbox per row, Select all / Deselect all / Invert,
  Apply selected (N) / Apply all / Dismiss selected, Space / Shift+click /
  Ctrl+A / Enter. Show errors with `netErrorMessage(e)` (02-core-net.js: "The
  dashboard server isn't running...") and keep what was ticked so Try again works.
- **Stream markers**: render a stream's dot/shape/symbol with
  `streamMarkHtml(id)` (28-customise.js) everywhere a stream appears (Home
  cards, chips, legends), so the user's chosen colour, shape and symbol show.
- **Drill-down**: clicking a chart element goes to the relevant section with
  that item selected and highlighted. Clicking it again does nothing. Clear it
  with the chip's ×, a breadcrumb ("Categories › Groceries ×") or Esc, and Back
  returns to where you came from.

## History

Cowork-era transports (Gmail drafts, `_pendingFromCowork`, FSAA folder sync) are
gone. The one-time task-injection blocks were removed from the source in 2.0
(they had all been applied already). The old `src/script.js` / `src/styles.css`
were split into `src/app/` and `src/styles/` (byte-identical when concatenated
in their original order).
