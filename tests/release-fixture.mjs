// A tiny stand-in for the app's repository, for the release tool tests
// (tests/release-*.test.mjs). It has the shape of the real one: source
// folders, documents, launchers, a build.mjs that writes index.html, one
// passing test, plus everything a release must leave out (user data, secrets,
// logs, backups, local config, the built page). All content is made up.
import { mkdirSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function put(root, rel, data) {
  const f = join(root, ...rel.split('/'));
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, data);
  return f;
}

/** A fresh temp folder, removed when the test ends. */
export function tempDir(t, prefix = 'release-test-') {
  const d = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(d, { recursive: true, force: true }));
  return d;
}

export const CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '- Nothing yet.',
  '',
  '## [1.2.3] - 2026-10-03',
  '',
  '### Added',
  '',
  '- A thing for Alex and Sam.',
  '',
  '## [1.2.3-rc.1] - 2026-10-01',
  '',
  '- A release candidate.',
  '',
  '## [1.2.2] - 2026-09-01',
  '',
  '- An older thing.',
  '',
  '[1.2.3]: https://github.com/example/opendash/releases/tag/v1.2.3',
  '',
].join('\n');

// What is published (and must arrive in the export).
export const PUBLISHED = [
  '.claude/skills/animation-pack/SKILL.md', '.editorconfig', '.gitattributes', '.gitignore', '.github/workflows/ci.yml', 'CHANGELOG.md', 'CLAUDE.md', 'LICENSE', 'MODULES.md', 'README.md',
  'assets/brand/logo.svg', 'build.mjs', 'check.bat', 'docs/USAGE.md', 'lib/util.mjs', 'mcp/server.mjs', 'package.json', 'serve.mjs',
  'server/index.mjs', 'src/app.js', 'start-dashboard.bat', 'start-dashboard.sh', 'tests/ok.test.mjs',
  'tools/migrate.mjs', 'tools/privacy-allow.json', 'tools/privacy-scan.mjs', 'tools/release-rules.mjs', 'vendor/lib.min.js',
].sort();
// What must never be published, with the paths the export reports.
export const LEFT_OUT = {
  'data/state/dashboard-state.json': 'data',
  'state/dashboard-state.json': 'state',
  'secrets/google-token.json': 'secrets',
  'backups/2026-10-01.json': 'backups',
  'logs/server.log': 'logs',
  'src/debug.log': 'src/debug.log',
  'dashboard-backup-2026-10-01.json': 'dashboard-backup-2026-10-01.json',
  'tools/apply_sync.py': 'tools/apply_sync.py',
  'tools/old-backup.json': 'tools/old-backup.json',
  '.claude/settings.json': '.claude/settings.json',
  '.claude/settings.local.json': '.claude/settings.local.json',
  '.claude/skills/other-skill/SKILL.md': '.claude/skills/other-skill',
  '.claude/skills/animation-packs/SKILL.md': '.claude/skills/animation-packs',   // a lookalike name is not the shipped skill
  'node_modules/x/index.js': 'node_modules',
  'index.html': 'index.html',
  'notes.txt': 'notes.txt',
  'assets/screenshots/home.png': 'assets/screenshots',
  'migration-plans/plan.json': 'migration-plans',
  'src/.env': 'src/.env',
  'lib/scratch.tmp': 'lib/scratch.tmp',
};

/** Make the fake repository in `root` and return root. */
export function fakeRepo(root, { version = '1.2.3' } = {}) {
  const files = {
    '.claude/skills/animation-pack/SKILL.md': '# A shared project skill (committed source, ships with the release)\n',
    '.editorconfig': 'root = true\n',
    '.gitattributes': '* text=auto eol=lf\n*.bat text eol=crlf\n',
    '.gitignore': 'data/\n',
    '.github/workflows/ci.yml': 'name: CI\n',
    'CHANGELOG.md': CHANGELOG,
    'CLAUDE.md': '# Notes for Claude Code\n',
    'LICENSE': 'MIT License\n',
    'MODULES.md': '# Modules\n',
    'README.md': '# OpenDash\n',
    'assets/brand/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>\n',
    'build.mjs': [
      "import { writeFileSync } from 'node:fs';",
      'const a = process.argv.slice(2);',
      "if (!a.includes('--syntax')) writeFileSync(a.includes('--out') ? a[a.indexOf('--out') + 1] : 'index.html', '<!doctype html><title>t</title>\\n');",
      '',
    ].join('\n'),
    'check.bat': '@echo off\nnode build.mjs --syntax\n',
    'docs/USAGE.md': '# Usage\n',
    'lib/util.mjs': 'export const one = 1;\n',
    'mcp/server.mjs': 'export {};\n',
    'package.json': JSON.stringify({ name: 'opendash', version, private: true, license: 'MIT' }, null, 2) + '\n',
    'serve.mjs': 'export {};\n',
    'server/index.mjs': 'export {};\n',
    'src/app.js': 'console.log("hi");\n',
    'start-dashboard.bat': '@echo off\nnode build.mjs\nnode serve.mjs\n',
    'start-dashboard.sh': '#!/bin/sh\r\nnode build.mjs\r\nexec node serve.mjs\r\n',
    'tests/ok.test.mjs': "import { test } from 'node:test';\ntest('ok', () => {});\n",
    'tools/migrate.mjs': 'export {};\n',
    'vendor/lib.min.js': '/*! a vendored library */\n',
  };
  for (const [rel, data] of Object.entries(files)) put(root, rel, data);
  for (const rel of ['tools/privacy-scan.mjs', 'tools/release-rules.mjs', 'tools/privacy-allow.json']) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    copyFileSync(join(ROOT, rel), join(root, rel));
  }
  // Must never leave: a personal-looking value inside each, so a leak would show.
  for (const rel of Object.keys(LEFT_OUT)) put(root, rel, 'PRIVATE-FIXTURE-CONTENT\n');
  return root;
}
