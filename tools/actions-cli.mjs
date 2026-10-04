#!/usr/bin/env node
// tools/actions-cli.mjs - apply a JSON file of ops to the dashboard through
// the actions library (server/actions), from a terminal or a script.
// Replaces tools/apply_sync.py for Claude Code syncs.
//
//   node tools/actions-cli.mjs <ops.json | ->        dry run (default): preview only
//   node tools/actions-cli.mjs <ops.json> --apply    apply (dry run first; deletes/merges
//                                                    and batches over 25 need --yes too)
//   node tools/actions-cli.mjs --query <op> ['<json params>']   e.g. --query tasks.list '{"view":"today"}'
//   node tools/actions-cli.mjs --undo <token> [--force]
//   node tools/actions-cli.mjs --history
//   node tools/actions-cli.mjs --describe            every op and query with its fields
//
// Options: --data-dir <dir> (default: DASHBOARD_DATA_DIR, then <repo>/data),
//          --client <name> (shown in the history and the page's toast),
//          --key <idempotencyKey>, --json (machine-readable output)
//
// The file holds an array of ops, or {ops:[...], idempotencyKey?}. Each op is
// {"op":"task.update","id":"u-...","priority":"p1"}; see --describe.
// While the dashboard server runs, changes go through it (open tabs update at
// once); otherwise straight to the data folder under the same lock.
// Exit codes: 0 ok, 1 refused/failed, 2 needs --yes.

import { readFileSync } from 'node:fs';
import { argValue, resolveDataDir, dataPaths } from '../lib/datadir.mjs';
import { createActions } from '../server/actions/index.mjs';
import { discoverServer, ensureLocalToken, TOKEN_HEADER } from '../server/actions/auth.mjs';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const JSON_OUT = has('--json');
const dataDir = resolveDataDir({ argv });
const paths = dataPaths(dataDir);
const client = argValue(argv, '--client') || 'actions-cli';
const out = (o, text) => process.stdout.write((JSON_OUT ? JSON.stringify(o, null, 1) : text) + '\n');

async function backend() {
  const found = await discoverServer(dataDir, { stateFile: paths.stateFile });
  if (found && found.port) {
    const token = await ensureLocalToken(paths.root);
    const post = async (path, body) => {
      const r = await fetch(`http://127.0.0.1:${found.port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', [TOKEN_HEADER]: token }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ ok: false, error: { code: 'HTTP_' + r.status, message: 'bad answer' } }));
      if (!r.ok || j.ok === false) { const e = new Error(j.error && j.error.message); Object.assign(e, j.error || {}); throw e; }
      return j;
    };
    return {
      via: `the running dashboard (port ${found.port})`,
      apply: (b) => post('/api/actions', { ...b, source: 'script', client }),
      query: (op, params) => post('/api/query', { op, params }),
      undo: (token, force) => post('/api/actions/undo', { token, force, source: 'script', client }),
      describe: () => createActions({ dataDir }).describe(),
    };
  }
  const a = createActions({ dataDir });
  return {
    via: `the data folder ${paths.root}`,
    apply: (b) => a.apply({ ...b, source: 'script', client }),
    query: (op, params) => a.query(op, params),
    undo: (token, force) => a.undo(token, { force, source: 'script', client }),
    describe: () => a.describe(),
  };
}

function fail(e) {
  const j = typeof e.toJSON === 'function' ? e.toJSON() : { code: e.code || 'ERROR', message: e.message, ...e };
  out({ ok: false, error: j }, `\n  REFUSED ${j.code}: ${j.message}${j.hint ? `\n  hint: ${j.hint}` : ''}${j.valid ? `\n  valid: ${[].concat(j.valid).slice(0, 30).join(', ')}` : ''}`
    + `${Array.isArray(j.errors) ? '\n' + j.errors.slice(1).map(x => `  also: ${x.message}`).join('\n') : ''}\n`);
  process.exitCode = 1;
}
const previewText = (r) => (r.preview || []).map(p => `  ${String(p.index + 1).padStart(3)}. ${p.summary}`).join('\n')
  + (r.warnings && r.warnings.length ? '\n' + r.warnings.map(w => `  note: ${w.message}`).join('\n') : '');

async function main() {
  const be = await backend();
  if (has('--describe')) {
    const d = be.describe();
    return out(d, d.ops.map(o => `${o.name.padEnd(22)} ${o.description}\n${' '.repeat(23)}fields: ${Object.keys(o.schema.properties).join(', ')}${o.schema.required?.length ? ` (required: ${o.schema.required.join(', ')})` : ''}`).join('\n')
      + '\n\nqueries:\n' + d.queries.map(q => `${q.name.padEnd(22)} ${q.description}`).join('\n'));
  }
  if (has('--history')) {
    const h = await be.query('history.list', { limit: 30 });
    return out(h, h.history.map(x => `${x.at.slice(0, 16)}  ${x.source}${x.client ? ':' + x.client : ''}  ${x.undoable ? x.token : '(not undoable)'}  ${x.summary}`).join('\n') || '(no changes yet)');
  }
  if (argValue(argv, '--query')) {
    const op = argValue(argv, '--query');
    const i = argv.indexOf('--query');
    const raw = argv[i + 2] && !argv[i + 2].startsWith('--') ? argv[i + 2] : '{}';
    let params;
    try { params = JSON.parse(raw); } catch { throw Object.assign(new Error('the params must be JSON, e.g. \'{"view":"today"}\''), { code: 'BAD_JSON' }); }
    const r = await be.query(op, params);
    return process.stdout.write(JSON.stringify(r, null, 1) + '\n');
  }
  if (argValue(argv, '--undo')) {
    const r = await be.undo(argValue(argv, '--undo'), has('--force'));
    return out(r, `  ${r.summary || 'undone'} (${r.changed} item(s)); redo with --undo ${r.undo}`);
  }

  const file = argv.find((a, i) => !a.startsWith('--') && !['--data-dir', '--client', '--key'].includes(argv[i - 1]));
  if (!file) { process.stdout.write(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 25).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); return; }
  const text = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
  let doc;
  try { doc = JSON.parse(text.trimStart()); /* trimStart also drops a byte-order mark */ } catch (e) { throw Object.assign(new Error(`${file} is not valid JSON: ${e.message}`), { code: 'BAD_JSON' }); }
  const ops = Array.isArray(doc) ? doc : doc.ops;
  const idempotencyKey = argValue(argv, '--key') || (Array.isArray(doc) ? undefined : doc.idempotencyKey);

  const dry = await be.apply({ ops, dryRun: true });
  if (!has('--apply')) {
    return out(dry, `\nDry run via ${be.via}: ${ops.length} op(s), ${dry.changed} item(s) would change.\n${previewText(dry)}\n\n`
      + `Nothing was changed. Run again with --apply${dry.needsConfirm ? ' --yes' : ''} to apply.${dry.needsConfirm ? `\n(needs --yes: ${dry.reasons.join('; ')})` : ''}\n`);
  }
  if (dry.needsConfirm && !has('--yes')) {
    out(dry, `\n${previewText(dry)}\n\nThis batch ${dry.reasons.join(' and ')}. Check the preview above, then run again with --apply --yes.\n`);
    process.exitCode = 2;
    return;
  }
  const r = await be.apply({ ops, confirm: dry.needsConfirm ? dry.confirm : undefined, idempotencyKey });
  out(r, `\nApplied via ${be.via}: ${r.changed} item(s) changed${r.idempotent ? ' (already applied earlier with this key)' : ''}.\n${previewText(r)}\n\nUndo with: node tools/actions-cli.mjs --undo ${r.undo}\n`);
}

main().catch(fail);
