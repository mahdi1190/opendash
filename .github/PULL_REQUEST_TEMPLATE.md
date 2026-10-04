## What and why

<!-- What does this change, and why? Link the issue or discussion: "Fixes #123". -->

## How to try it

<!-- Steps a reviewer can follow, starting from demo data
     (node tools/make-fake-data.mjs <folder>, then
     node serve.mjs --data-dir <folder> --port 4310 --no-open). -->

## Screenshots

<!-- For visible changes: before and after, light and dark. Demo data only. -->

## Checklist

- [ ] `node build.mjs --syntax` passes
- [ ] `npm test` passes, and new behaviour has tests (bug fixes: a test that failed before)
- [ ] `node tools/privacy-scan.mjs` is clean
- [ ] No personal data anywhere: code, comments, tests, fixtures, screenshots (generic names such as Alex, Sam, Acme)
- [ ] Nothing from a data folder is committed (`data/`, tokens, logs, backups, exports)
- [ ] No npm dependencies added; Node 20+ built-ins only; works on Windows (paths with spaces), macOS and Linux
- [ ] Writes go through the actions layer or `lib/fsutil.mjs`; Claude runs go through `lib/claude-runner.mjs`
- [ ] User and external text is escaped before it reaches `innerHTML`; no inline `on*=` handlers
- [ ] Logs contain no content (no task text, names, email, money or paths)
- [ ] Changes to existing data come with a migration (`tools/migrations/NNN-*.mjs`, idempotent, `--dry-run`)
- [ ] Checked in a real browser on my own port: every view I touched, light and dark, narrow width, keyboard, no console errors
- [ ] Docs updated, and an entry added under **Unreleased** in `docs/CHANGELOG.md`
