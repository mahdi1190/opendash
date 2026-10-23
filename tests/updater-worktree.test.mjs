// lib/updater.mjs installKind with a .git FILE (a git worktree): 'git' only
// when the worktree's admin folder points back at this very folder. A folder
// copied out of a worktree keeps a .git file pointing at the original; running
// git there would update the OTHER checkout, so it updates from the zip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installKind } from '../lib/updater.mjs';

function layout(url = 'https://github.com/example/opendash.git') {
  const t = mkdtempSync(join(tmpdir(), 'od-wt-'));
  const main = join(t, 'clone'), wt = join(t, 'worktree'), admin = join(main, '.git', 'worktrees', 'worktree');
  mkdirSync(admin, { recursive: true });
  mkdirSync(wt);
  writeFileSync(join(main, '.git', 'config'), `[remote "origin"]\n\turl = ${url}\n`);
  writeFileSync(join(admin, 'commondir'), '../..\n');
  writeFileSync(join(admin, 'gitdir'), join(wt, '.git').replace(/\\/g, '/') + '\n');      // git writes forward slashes
  writeFileSync(join(wt, '.git'), `gitdir: ${admin.replace(/\\/g, '/')}\n`);
  return { t, main, wt, admin, done: () => rmSync(t, { recursive: true, force: true }) };
}

test('a real worktree of an OpenDash clone updates with git', () => {
  const l = layout();
  try {
    assert.equal(installKind(l.main), 'git', 'the clone itself');
    assert.equal(installKind(l.wt), 'git', 'its worktree: the admin folder points back here');
  } finally { l.done(); }
});

test('a folder copied out of a worktree (its .git file points at the other checkout) updates from the zip', () => {
  const l = layout();
  try {
    const copy = join(l.t, 'copied-install');
    mkdirSync(copy);
    writeFileSync(join(copy, '.git'), `gitdir: ${l.admin.replace(/\\/g, '/')}\n`);
    assert.equal(installKind(copy), 'zip');
  } finally { l.done(); }
});

test('a broken .git file, a missing admin folder or another repository: the zip', () => {
  const l = layout('https://github.com/someone/private-dashboard.git');
  try {
    assert.equal(installKind(l.wt), 'zip', 'a worktree of another repository');
    const a = join(l.t, 'a'); mkdirSync(a);
    writeFileSync(join(a, '.git'), 'not a gitdir line\n');
    assert.equal(installKind(a), 'zip');
    writeFileSync(join(a, '.git'), `gitdir: ${join(l.t, 'nowhere').replace(/\\/g, '/')}\n`);
    assert.equal(installKind(a), 'zip');
  } finally { l.done(); }
});
