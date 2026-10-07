// node tools/anim-pack.mjs guard --owned <file>[,<file>...] [--base <ref>] [--json]
// The orchestrator's proof that a batch of drawing agents touched only their own files. It asks git what changed (modified, added, deleted, renamed,
// untracked: gitignored files such as .anim-ref/ are not changes) and FAILS (exit 2) when any changed file is outside the owned set, or is a threshold, the
// waiver list (both in tools/anim-quality.json), the gold-standard list (tools/anim-reference.json) or a test: those are never an agent's to edit, even if
// someone listed them as owned. Without --base the working tree is compared with HEAD, the LAST COMMIT (what is uncommitted); with --base <ref> everything since that
// commit, committed or not (the orchestrator's usual base is the commit of the scaffold: `brief` writes it into plan.json as `git.base` and into every guard command).
// The scaffold (config, doc, test, pack files, scene stubs) must be COMMITTED before the agents start: an untracked scaffold is listed as strays.
// WHAT IT PROVES. In ONE shared working tree it proves the UNION: nothing outside the union of the files you list was changed; it cannot say which agent wrote which
// owned file (so pass the files of every agent that ran). To prove ONE agent alone give it its own git worktree (`git worktree add ../agent-1 <scaffold commit>`) and run
// guard there with its own files (and --base <scaffold commit> once it has committed).
import { spawnSync } from 'node:child_process';

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
/** Why a path may never be changed by a drawing agent, or ''. */
export function forbiddenReason(path) {
  if (path === 'tools/anim-quality.json') return 'the thresholds and the waiver list';
  if (path === 'tools/anim-reference.json') return 'the gold-standard list';
  if (path.startsWith('tests/')) return 'a test';
  return '';
}
function git(root, args) {
  const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`could not run git: ${r.error.message}`);
  return r;
}
/** The changed paths (repo-relative) from `git status --porcelain=v1 -z`: both sides of a rename; untracked files included. */
export function parseStatus(z) {
  const t = String(z).split('\0'), out = [];
  for (let i = 0; i < t.length; i++) {
    const e = t[i];
    if (e.length < 4) continue;
    const xy = e.slice(0, 2), path = e.slice(3);
    out.push({ path, status: xy.trim() || '?' });
    if (/[RC]/.test(xy)) { i++; if (t[i]) out.push({ path: t[i], status: xy.trim() }); }   // the old name of a rename or copy
  }
  return out;
}
/** The changed paths from `git diff --name-status -z`. */
export function parseNameStatus(z) {
  const t = String(z).split('\0'), out = [];
  for (let i = 0; i < t.length; i++) {
    const st = t[i];
    if (!st) continue;
    if (/^[RC]/.test(st)) { out.push({ path: t[i + 1], status: st[0] }, { path: t[i + 2], status: st[0] }); i += 2; }
    else { out.push({ path: t[i + 1], status: st[0] }); i += 1; }
  }
  return out.filter(x => x.path);
}

/** The result of the guard: {ok, owned, changed: [{path, status}], violations: [{path, status, why}]}. Pure apart from running git. */
export function guardResult(root, owned, base = '') {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) throw new Error(`${root} is not inside a git work tree (guard asks git what changed)`);
  const prefix = norm(git(root, ['rev-parse', '--show-prefix']).stdout.trim());
  const own = new Set(owned.map(o => norm((prefix ? prefix + '/' : '') + norm(o))));
  const seen = new Map();
  const add = (list) => { for (const x of list) if (!seen.has(x.path)) seen.set(x.path, x); };
  const st = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (st.status !== 0) throw new Error(`git status failed: ${st.stderr.trim()}`);
  add(parseStatus(st.stdout));
  if (base) {
    if (git(root, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`]).status !== 0) throw new Error(`--base "${base}" is not a commit of this repository`);
    const d = git(root, ['diff', '--name-status', '-z', base]);
    if (d.status !== 0) throw new Error(`git diff failed: ${d.stderr.trim()}`);
    add(parseNameStatus(d.stdout));
  }
  const rel = (p) => (prefix && p.startsWith(prefix + '/') ? p.slice(prefix.length + 1) : p);
  const changed = [...seen.values()].map(x => ({ ...x, path: norm(x.path) })).sort((a, b) => (a.path < b.path ? -1 : 1));
  const violations = [];
  for (const c of changed) {
    const why = forbiddenReason(rel(c.path));
    if (why) violations.push({ ...c, why: `${why}: never an agent's to edit` });
    else if (!own.has(c.path)) violations.push({ ...c, why: 'not one of the owned files' });
  }
  const sha = (ref) => { const r = git(root, ['rev-parse', '--short=10', '--verify', '--quiet', `${ref}^{commit}`]); return r.status === 0 ? r.stdout.trim() : ''; };
  const baseInfo = base ? { ref: base, sha: sha(base), label: `${base}${sha(base) ? ' (' + sha(base) + ')' : ''}` } : { ref: 'HEAD', sha: sha('HEAD'), label: `HEAD, the last commit${sha('HEAD') ? ' (' + sha('HEAD') + ')' : ''}` };
  return { ok: !violations.length, base: baseInfo, owned: [...own].map(rel), changed: changed.map(c => ({ ...c, path: rel(c.path) })), violations: violations.map(v => ({ ...v, path: rel(v.path) })) };
}

/** What a passing guard proves, said in every output: the union in a shared tree, one agent only in its own worktree. */
export const GUARD_PROOF = 'In ONE shared working tree this proves the UNION: nothing outside the files listed in --owned changed. It cannot say which agent wrote which owned file, so list the files of every agent that ran in this tree. To prove ONE agent alone, give it its own git worktree (git worktree add ../agent-1 <the commit of the committed scaffold>) and run guard there with its own files (and --base <that commit> once it has committed).';

/**
 * The state of git for the files of a region's scaffold: {head, uncommitted: [{path, status}]} (the paths are repo-relative, as given), or null when `root` is not in a git
 * work tree. `paths` are pathspecs (globs allowed): `brief` asks about the region's own files to tell the orchestrator to COMMIT the scaffold before the agents start.
 */
export function gitScaffoldState(root, paths) {
  try {
    const top = git(root, ['rev-parse', '--show-toplevel']);
    if (top.status !== 0) return null;
    const head = git(root, ['rev-parse', '--short=10', '--verify', '--quiet', 'HEAD']);
    const st = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...paths]);
    if (st.status !== 0) return null;
    return { head: head.status === 0 ? head.stdout.trim() : '', uncommitted: parseStatus(st.stdout).filter(x => !/\.anim-ref\//.test(x.path)) };
  } catch { return null; }
}

export default {
  summary: 'prove a batch of agents touched only their own files: fails (exit 2) on any other changed file, or a threshold, waiver, gold-standard or test change',
  usage: 'guard --owned <file>[,<file>...] [--base <ref>] [--json]',
  options: {
    owned: { type: 'string', multiple: true, help: 'the files the agents may change (comma separated, repeatable): the scene and pack files of the batch(es) just run; in a shared tree the UNION of every agent that ran' },
    base: { type: 'string', help: 'compare with this commit (everything since it, committed or not); default HEAD, the last commit (the uncommitted changes). The commit of the scaffold is the usual base: `brief --out` writes it into plan.json' },
    json: { type: 'boolean', help: 'machine-readable result' },
  },
  notes: [
    'The scaffold (config, doc, test, pack files, scene stubs) must be COMMITTED before the agents start: guard compares with a commit, and an untracked scaffold is listed as strays.',
    GUARD_PROOF,
  ],
  run(args, ctx) {
    if (ctx.positionals.length) throw new Error(`guard takes no positional argument (got ${ctx.positionals.join(', ')}): the files go in --owned a.js,b.js`);
    const owned = [].concat(args.owned || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
    if (!owned.length) throw new Error('guard needs --owned <file>[,<file>...]: the files the agents were allowed to change (an empty set would allow nothing)');
    if (args.base != null && !String(args.base).trim()) throw new Error('--base is empty: give a commit, a branch or a tag, or leave the option out');
    const res = guardResult(ctx.root, owned, args.base ? String(args.base).trim() : '');
    if (args.json) { ctx.out(JSON.stringify({ ...res, proves: GUARD_PROOF }, null, 1)); return res.ok ? 0 : 2; }
    const mine = res.changed.filter(c => !res.violations.some(v => v.path === c.path));
    if (res.ok) {
      ctx.out(`guard: OK. ${res.changed.length} changed file${res.changed.length === 1 ? '' : 's'}${res.changed.length ? ', all of them owned:' : ' (the owned files are unchanged)'}`);
      for (const c of mine) ctx.out(`  ${c.status.padEnd(2)} ${c.path}`);
      ctx.out(`Compared with ${res.base.label}. What this proves: ${GUARD_PROOF}`);
      return 0;
    }
    ctx.out(`guard: FAIL. ${res.violations.length} changed file${res.violations.length === 1 ? '' : 's'} outside the batch:`);
    for (const v of res.violations) ctx.out(`  ${v.status.padEnd(2)} ${v.path}   (${v.why})`);
    if (mine.length) { ctx.out('owned and changed (fine):'); for (const c of mine) ctx.out(`  ${c.status.padEnd(2)} ${c.path}`); }
    const untracked = res.violations.filter(v => v.status === '??' && !forbiddenReason(v.path));
    if (untracked.length) ctx.out(`${untracked.length} of them ${untracked.length === 1 ? 'is' : 'are'} untracked (??). If ${untracked.length === 1 ? 'it is' : 'they are'} the region's scaffold (config, doc, test, pack files, scene stubs, other agents' scene files), COMMIT it before the agents start so that guard has a baseline (git add ${untracked.map(v => v.path).join(' ')} && git commit -m "scaffold"), then pass the files of every agent that ran; guard cannot tell a scaffold file from a stray one.`);
    ctx.out('Reject the batch: restore the files above (git checkout -- <file> / delete the untracked ones) or send them back to the agent. A threshold, waiver, gold-standard or test edit is never acceptable.');
    ctx.out(`Compared with ${res.base.label}. What this proves: ${GUARD_PROOF}`);
    return 2;
  },
};
