#!/usr/bin/env node
// mcp/server.mjs - the dashboard as a Model Context Protocol server (stdio).
// Zero dependencies: newline-delimited JSON-RPC 2.0 on stdin/stdout.
//
//   node mcp/server.mjs [--data-dir <dir>] [--port <n>] [--mode full|propose] [--print-install]
//
//   --data-dir   the dashboard data folder (default: DASHBOARD_DATA_DIR, then <repo>/data)
//   --port       talk to the dashboard server on this port (default: from <data>/runtime.json)
//   --mode       full (default): read tools + every change tool + apply_changes/undo_changes
//                propose: read tools + propose_changes only; it can never apply anything
//                (the in-app assistant uses this, so text from email, calendar or bank
//                data can never change the dashboard without the user's click)
//   --print-install   print the install commands for this machine and exit
//
// Transport to the data: while the dashboard server runs (found through
// <data>/runtime.json, checked for a live pid and the same data folder) every
// call goes over HTTP with the per-install token, so open tabs update at once.
// Otherwise the server works EMBEDDED, directly on the data folder through the
// same actions library and the same cross-process lock (a server started later
// still sees the change: it watches the state file).
//
// stdout carries protocol messages only. Logs go to stderr and <data>/logs/mcp.log.

import { readFileSync, lstatSync } from 'node:fs';
import { join, isAbsolute, basename, extname, relative } from 'node:path';
import { randomBytes } from 'node:crypto';

// Nothing but JSON-RPC may reach stdout: route stray console output to stderr
// before anything else runs.
for (const k of ['log', 'info', 'debug', 'warn']) console[k] = (...a) => process.stderr.write(a.map(String).join(' ') + '\n');

const { REPO_ROOT, argValue, resolveDataDir, dataPaths, legacyStatus } = await import('../lib/datadir.mjs');
const { createActions } = await import('../server/actions/index.mjs');
const { OPS, OP_BY_TOOL } = await import('../server/actions/ops.mjs');
const { QUERIES, QUERY_BY_TOOL } = await import('../server/actions/queries.mjs');
const { publicSchema } = await import('../server/actions/validate.mjs');
const { ActionError } = await import('../server/actions/model.mjs');
const { discoverServer, ensureLocalToken, TOKEN_HEADER } = await import('../server/actions/auth.mjs');
const { createLogger } = await import('../server/log.mjs');
const { createWriteGate, othersLive } = await import('../lib/hosts.mjs');
const { redirectDataDir } = await import('../lib/relocate/record.mjs');
const { INSTRUCTIONS, PROPOSE_ADDENDUM, PROMPTS } = await import('./instructions.mjs');
const { installInfo, installText } = await import('./install.mjs');
const EX = await import('../lib/expenses.mjs');
const { loadConfig } = await import('../lib/datadir.mjs');

export const PROTOCOL_VERSIONS = Object.freeze(['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']);
const VERSION = (() => { try { return JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version || '0'; } catch { return '0'; } })();

const argv = process.argv.slice(2);
const MODE = argValue(argv, '--mode') || 'full';
if (!['full', 'propose'].includes(MODE)) { process.stderr.write(`--mode must be full or propose (got ${MODE})\n`); process.exit(2); }
const DATA_DIR = resolveDataDir({ argv });
const FORCED_PORT = Number(argValue(argv, '--port')) || null;
const paths = dataPaths(DATA_DIR);

if (argv.includes('--print-install')) {
  process.stdout.write(installText(installInfo({ dataDir: DATA_DIR })) + '\n');
  process.exit(0);
}

const log = createLogger(join(paths.logs, 'mcp.log'), { echo: false });
const elog = (level, msg) => { process.stderr.write(`[dashboard-mcp] ${msg}\n`); log(level, msg); };
const legacyAtStart = legacyStatus({ dataDir: DATA_DIR });

// ─── Transport ─────────────────────────────────────────────────────────────
let embedded = null;
// Embedded writes go straight to the data folder: while another computer has it
// open (lib/hosts.mjs presence files) they are refused with OTHER_COMPUTER, checked
// before every write (an MCP call is never half-way through an edit).
const embeddedGate = createWriteGate({ others: () => othersLive(DATA_DIR), pauseLater: true, recheckMs: 5000 });
const getEmbedded = () => (embedded = embedded || createActions({ dataDir: DATA_DIR, log: (l, m) => log(l, m), writeGate: () => embeddedGate.check() }));
let route = { kind: null, at: 0 };   // cached discovery

async function transport() {
  if (route.kind && Date.now() - route.at < 5000) return route;
  const found = await discoverServer(DATA_DIR, { stateFile: paths.stateFile, port: FORCED_PORT });
  if (found && found.port) {
    const token = await ensureLocalToken(paths.root);
    if (route.kind !== 'http') elog('info', `using the running dashboard on port ${found.port}`);
    route = { kind: 'http', port: found.port, token, at: Date.now() };
  } else {
    if (route.kind !== 'embedded') elog('info', `embedded mode on ${paths.root}${found && found.stale ? ` (${found.stale})` : ''}`);
    route = { kind: 'embedded', at: Date.now() };
  }
  return route;
}

async function http(r, path, body) {
  const res = await fetch(`http://127.0.0.1:${r.port}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', [TOKEN_HEADER]: r.token },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  let j = null;
  try { j = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || (j && j.ok === false)) {
    const e = (j && j.error) || { code: 'HTTP_' + res.status, message: `dashboard answered ${res.status}` };
    const err = new ActionError(e.code || 'ERROR', e.message || 'request failed', { ...e, status: res.status });
    err.remote = true;
    throw err;
  }
  return j;
}

/** Run fn(http-route) or fn(embedded), falling back to embedded if the server went away. */
async function call(httpFn, embeddedFn) {
  // Checked on every call (cheap): once the user runs the migration it shows,
  // the connection works without restarting the MCP client.
  const legacy = legacyStatus({ dataDir: DATA_DIR });
  if (legacy) {
    throw new ActionError('NOT_SET_UP', `the data folder ${legacy.dataDir} has no dashboard data yet (the old copy is still in ${legacy.legacyStateDir})`, { hint: `ask the user to run: ${legacy.command}` });
  }
  // The data folder moved after this MCP server started (Settings > Data > Move,
  // lib/relocate/): never read or write the old place.
  const moved = redirectDataDir(DATA_DIR);
  if (moved !== DATA_DIR) throw new ActionError('DATA_MOVED', `OpenDash's data folder moved to ${moved}. Restart this assistant (or its OpenDash tools) to use the new place.`, { hint: 'ask the user to restart the assistant app' });
  const r = await transport();
  if (r.kind === 'http') {
    try { return await httpFn(r); } catch (e) {
      if (e.remote) throw e;
      elog('warn', `dashboard server unreachable (${e.cause?.code || e.name}); switching to embedded mode`);
      route = { kind: 'embedded', at: Date.now() };
    }
  }
  return embeddedFn(getEmbedded());
}

let CLIENT = null;   // clientInfo.name from initialize
const SOURCE = MODE === 'propose' ? 'assistant' : 'mcp';
const clientName = () => (CLIENT ? `${CLIENT.name}${CLIENT.version ? ' ' + CLIENT.version : ''}`.slice(0, 80) : 'mcp client');

// Every write carries an idempotency key (the caller's, or one made here). If
// the dashboard server dies or times out AFTER it received the request, the
// embedded fallback retries with the same key: under the state lock it finds
// the first attempt's result instead of applying the ops a second time.
const autoKey = () => `mcp-${process.pid}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
const api = {
  query: (op, params) => call(r => http(r, '/api/query', { op, params }), a => a.query(op, params)),
  apply: (b) => {
    const body = { ...b, source: SOURCE, client: clientName() };
    if (!b.dryRun && (b.idempotencyKey == null || b.idempotencyKey === '')) body.idempotencyKey = autoKey();
    return call(r => http(r, '/api/actions', body), a => a.apply(body));
  },
  propose: (ops, note) => call(r => http(r, '/api/actions', { ops, propose: true, note, source: 'assistant', client: clientName() }), a => a.propose({ ops, note, source: 'assistant', client: clientName() })),
  undo: (token, force) => call(r => http(r, '/api/actions/undo', { token, force, source: SOURCE, client: clientName() }), a => a.undo(token, { force, source: SOURCE, client: clientName() })),
  describe: () => getEmbedded().describe(),
};

// ─── Expenses (lib/expenses.mjs; private, kept in <data>/expenses) ─────────────
// Not part of the actions layer: they work on the expenses file under its own lock, with their own undo steps.
const EXPENSE_TOOLS = [
  { name: 'list_expenses', read: true, title: 'list expenses',
    description: "The user's expenses (money they spent for someone else, to be paid back): to-claim, submitted, paid, with the total owed and per-payer totals. Use it before create_expense to avoid duplicates.",
    inputSchema: { type: 'object', additionalProperties: false, properties: { status: { type: 'string', enum: ['to-claim', 'submitted', 'paid', 'open'], description: "'open' = not paid yet" }, payer: { type: 'string', maxLength: 80 }, limit: { type: 'integer', minimum: 1, maximum: 200 } } } },
  { name: 'create_expense', title: 'create expense',
    description: "File an expense from a pasted order or receipt: title, amount, date (YYYY-MM-DD), merchant and payer (who should pay it back, e.g. the employer or a client). If the payer is not clear from what the user said, ASK THE USER; never guess it. Receipts are attached by the user in the dashboard, or with attach_expense_receipt. Use dryRun:true to preview.",
    inputSchema: { type: 'object', additionalProperties: false, required: ['title', 'amount', 'date'], properties: { title: { type: 'string', maxLength: 140 }, amount: { type: 'number', exclusiveMinimum: 0, description: 'in the home currency (GBP unless the dashboard says otherwise)' }, date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, merchant: { type: 'string', maxLength: 60 }, payer: { type: 'string', maxLength: 80, description: 'who pays it back (ask the user if unsure)' }, category: { type: 'string', maxLength: 40 }, note: { type: 'string', maxLength: 600 }, vat: { type: 'number', minimum: 0 }, dryRun: { type: 'boolean' } } } },
  { name: 'attach_expense_receipt', title: 'attach expense receipt',
    description: "Attach a receipt REFERENCE to an expense: the receipt email's id, subject, sender and date (and its https mail link if you have one). The email text is never copied. The user adds receipt files in the dashboard. Use dryRun:true to preview.",
    inputSchema: { type: 'object', additionalProperties: false, required: ['id', 'emailId'], properties: { id: { type: 'string', description: 'expense id from list_expenses' }, emailId: { type: 'string', maxLength: 120 }, subject: { type: 'string', maxLength: 160 }, from: { type: 'string', maxLength: 120 }, date: { type: 'string', maxLength: 40 }, link: { type: 'string', maxLength: 300 }, dryRun: { type: 'boolean' } } } },
  { name: 'attach_expense_file', title: 'attach expense receipt file',
    description: "Attach a receipt FILE (PDF, PNG, JPEG, WebP or GIF, 5 MB at most) from the user's computer to an expense, by its full path, e.g. the receipt the user already linked to the task the expense came from or saved in a known folder. Copies it into the dashboard's private receipts. Use dryRun:true to preview. If you do not know the exact path, ask the user for it.",
    inputSchema: { type: 'object', additionalProperties: false, required: ['id', 'path'], properties: { id: { type: 'string', description: 'expense id from list_expenses' }, path: { type: 'string', maxLength: 500, description: 'absolute path of the file on this computer' }, dryRun: { type: 'boolean' } } } },
  { name: 'mark_expense_submitted', title: 'mark expense submitted',
    description: "Record that the user has SENT the claim for these expenses to the payer (it does not send anything). Only when the user says they submitted it. Ask for the payer when the expenses have none. Use dryRun:true to preview.",
    inputSchema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 }, payer: { type: 'string', maxLength: 80 }, date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'the day it was sent (default today)' }, method: { type: 'string', enum: ['email', 'portal', 'in-person', 'other'] }, dryRun: { type: 'boolean' } } } },
  { name: 'undo_expense_change', title: 'undo expense change',
    description: 'Undo an expense change by its undo token (from create_expense, attach_expense_receipt or mark_expense_submitted).',
    inputSchema: { type: 'object', additionalProperties: false, required: ['token'], properties: { token: { type: 'string', maxLength: 40 } } } },
];
async function expenseHome() {
  const cfg = await loadConfig(DATA_DIR).catch(() => ({}));
  let today; try { today = new Intl.DateTimeFormat('en-CA', { timeZone: cfg.timezone || undefined }).format(new Date()); } catch { today = new Date().toISOString().slice(0, 10); }
  return { today, home: /^[A-Z]{3}$/.test(cfg.currency || '') ? cfg.currency : 'GBP' };
}
async function expenseTool(name, a) {
  const { today, home } = await expenseHome();
  const fail = (m) => { throw new ActionError('EXPENSE_ERROR', m); };
  if (name === 'list_expenses') {
    const S = await EX.readStore(DATA_DIR, { home });
    const v = EX.publicView(S, today);
    let items = v.items.filter(e => (a.status === 'open' ? e.status !== 'paid' : !a.status || e.status === a.status));
    if (a.payer) items = items.filter(e => EX.payerKey(e.payer) === EX.payerKey(a.payer));
    return { today, currency: home, owed: v.summary.total, owedCount: v.summary.count, payers: v.summary.payers.map(p => ({ payer: p.payer, total: p.total, count: p.count })),
      expenses: items.slice(0, a.limit || 50).map(e => ({ id: e.id, title: e.title, amount: e.amount, date: e.date, payer: e.payer, status: e.status, receipts: e.receipts.length, claimId: e.claimId || null, paidAt: e.paidAt || null })) };
  }
  if (name === 'undo_expense_change') { const r = await EX.undoChange(DATA_DIR, String(a.token || ''), { home }); if (!r.ok) fail(r.error); return { ok: true, undone: r.label }; }
  if (name === 'create_expense') {
    const e = EX.cleanExpense({ title: a.title, amount: a.amount, date: a.date, merchant: a.merchant, payer: a.payer, category: a.category, note: a.note, vat: a.vat, source: { type: 'mcp' } }, { home, today });
    if (!e) fail('An expense needs a title, an amount above zero and a date (YYYY-MM-DD).');
    if (a.dryRun === true) return { dryRun: true, wouldCreate: { title: e.title, amount: e.amount, currency: e.currency, date: e.date, payer: e.payer || null }, ask: e.payer ? undefined : 'Ask the user who should pay this back.' };
    const r = await EX.createExpense(DATA_DIR, e, { today, home });
    if (r.error) fail(r.error);
    return { ok: true, id: r.id, undo: r.undo, expense: { title: e.title, amount: e.amount, date: e.date, payer: e.payer || null, status: 'to-claim' }, note: 'The user sees it under Money > Expenses. Receipts are added there.' };
  }
  if (name === 'attach_expense_receipt') {
    const mail = { id: a.emailId, subject: a.subject, from: a.from, date: a.date, link: a.link };
    if (a.dryRun === true) return { dryRun: true, wouldAttach: { expense: a.id, email: a.subject || a.emailId } };
    const r = await EX.addMailReceipt(DATA_DIR, String(a.id), mail, { home });
    if (r.error) fail(r.error);
    return { ok: true, ...(r.undo ? { undo: r.undo } : {}), already: r.already || undefined };
  }
  if (name === 'attach_expense_file') {
    const p = String(a.path || '');
    if (!isAbsolute(p) || p.length > 500) fail('Give the full path of the file (for example C:\Users\...\receipt.pdf).');
    if (!/.(pdf|png|jpe?g|webp|gif)$/i.test(extname(p))) fail('Receipts can be a PDF or a picture (PNG, JPEG, WebP or GIF).');
    const inData = relative(DATA_DIR, p); if (inData && !inData.startsWith('..') && !isAbsolute(inData)) fail('That file is already inside the dashboard.');
    let st; try { st = lstatSync(p); } catch { fail('I could not find that file. Check the path with the user.'); }
    if (!st.isFile() || st.isSymbolicLink()) fail('That path is not a regular file.');
    if (st.size > 5 * 1024 * 1024) fail('That file is over 5 MB.');
    if (a.dryRun === true) return { dryRun: true, wouldAttach: { expense: a.id, file: basename(p), bytes: st.size } };
    const buf = readFileSync(p);
    const r = await EX.addReceipt(DATA_DIR, String(a.id), { name: basename(p), data: buf.toString('base64') }, { home });
    if (r.error) fail(r.error);
    return { ok: true, ref: r.ref, already: r.already || undefined, ...(r.undo ? { undo: r.undo } : {}), note: 'The receipt is on the expense under Money > Expenses.' };
  }
  if (name === 'mark_expense_submitted') {
    const S = await EX.readStore(DATA_DIR, { home });
    const list = (a.ids || []).map(id => S.items[id]);
    if (list.some(e => !e)) fail('One of those ids is not an expense (see list_expenses).');
    const open = list.filter(e => e.status === 'to-claim');
    if (!open.length) fail('Those expenses are already submitted or paid.');
    const payer = a.payer || open[0].payer;
    if (!payer) fail('Ask the user who the claim was sent to, then call again with payer.');
    if (a.dryRun === true) return { dryRun: true, wouldSubmit: open.map(e => ({ id: e.id, title: e.title, amount: e.amount })), payer, total: EX.sumOf(open), date: a.date || today };
    const r = await EX.submitClaim(DATA_DIR, open.map(e => e.id), { payer, method: a.method || 'other', date: a.date, today, home });
    if (r.error) fail(r.error);
    return { ok: true, claimId: r.claimId, undo: r.undo, submitted: r.ids.length };
  }
  return undefined;
}
// ─── Tools ─────────────────────────────────────────────────────────────────
const OP_NAMES = OPS.map(o => o.name);
const opItem = {
  type: 'object',
  properties: { op: { type: 'string', enum: OP_NAMES, description: 'operation name, e.g. task.update (describe_operations lists every op and its fields)' } },
  required: ['op'], additionalProperties: true,
  description: "{op:'<name>', ...that op's fields}, e.g. {op:'task.reschedule', id:'u-...', shiftDays:2}",
};
const withRun = (schema, danger) => {
  const s = publicSchema(schema);
  return {
    ...s,
    properties: {
      ...s.properties,
      dryRun: { type: 'boolean', description: 'preview only, change nothing' },
      ...(danger ? { confirm: { type: 'string', description: 'confirm token from a dry run of exactly this call (required: this deletes or merges)' } } : {}),
    },
  };
};
const ann = (title, readOnly, destructive = false) => ({ title, readOnlyHint: readOnly, destructiveHint: destructive, idempotentHint: readOnly, openWorldHint: false });

function toolList() {
  const tools = [];
  for (const t of EXPENSE_TOOLS) tools.push({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: ann(t.title, !!t.read) });
  for (const q of QUERIES) if (MODE !== 'propose' || q.assistant !== false) tools.push({ name: q.tool, title: q.tool.replace(/_/g, ' '), description: q.description, inputSchema: publicSchema(q.schema), annotations: ann(q.tool, true) });
  tools.push({
    name: 'describe_operations', title: 'describe operations',
    description: 'Every change operation with its exact fields (JSON Schema), for building apply_changes / propose_changes batches.',
    inputSchema: { type: 'object', properties: { op: { type: 'string', description: 'optional: only this op' } }, additionalProperties: false },
    annotations: ann('describe operations', true),
  });
  if (MODE === 'propose') {
    tools.push({
      name: 'propose_changes', title: 'propose changes',
      description: 'Check a list of ops and store them as a proposal for the user to apply in the dashboard. Returns a preview and a proposal id. Never changes anything.',
      inputSchema: { type: 'object', properties: { ops: { type: 'array', items: opItem, minItems: 1, maxItems: 200 }, note: { type: 'string', maxLength: 300, description: 'one line for the user: why these changes' } }, required: ['ops'], additionalProperties: false },
      annotations: ann('propose changes', true),
    });
    return tools;
  }
  for (const o of OPS) tools.push({ name: o.tool, title: o.tool.replace(/_/g, ' '), description: o.description, inputSchema: withRun(o.schema, o.danger), annotations: ann(o.tool, false, !!o.danger) });
  tools.push({
    name: 'apply_changes', title: 'apply changes',
    description: 'Apply several ops as ONE all-or-nothing batch. Use dryRun:true first to preview. Over 25 ops, over 25 tasks touched, or any delete/merge: send the same ops again with the confirm token from the dry run. Ops can refer to a task created earlier in the batch as "$ref".',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['ops'],
      properties: {
        ops: { type: 'array', items: opItem, minItems: 1, maxItems: 200 },
        dryRun: { type: 'boolean', description: 'preview only, change nothing' },
        confirm: { type: 'string', description: 'confirm token from the dry run of exactly these ops' },
        idempotencyKey: { type: 'string', maxLength: 200, description: 'optional: retrying with the same key within 24 h returns the first result instead of applying twice' },
      },
    },
    annotations: ann('apply changes', false, true),
  });
  tools.push({
    name: 'undo_changes', title: 'undo changes',
    description: 'Undo an applied change by its undo token (from a result or list_history). Refuses if the same items were changed since, unless force:true.',
    inputSchema: { type: 'object', properties: { token: { type: 'string', minLength: 1, maxLength: 80 }, force: { type: 'boolean', description: 'overwrite newer edits to the same items' } }, required: ['token'], additionalProperties: false },
    annotations: ann('undo changes', false, true),
  });
  return tools;
}

const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });
function toolError(e) {
  const j = typeof e.toJSON === 'function' ? e.toJSON() : { code: e.code || 'ERROR', message: String(e.message || e) };
  const { code, message, ...rest } = j;
  return { content: [{ type: 'text', text: `Error ${code}: ${message}${Object.keys(rest).length ? '\n' + JSON.stringify(rest) : ''}` }], isError: true };
}

async function callTool(name, args) {
  args = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  try {
    if (name === 'describe_operations') {
      const d = api.describe();
      if (args.op) {
        const o = d.ops.find(x => x.name === args.op || x.tool === args.op);
        if (!o) throw new ActionError('UNKNOWN_OP', `unknown op '${String(args.op).slice(0, 40)}'`, { valid: d.ops.map(x => x.name) });
        return ok(o);
      }
      return ok({ ops: d.ops.map(o => ({ name: o.name, description: o.description, ...(o.needsDryRun ? { needsDryRun: true } : {}), fields: o.schema.properties, required: o.schema.required })), rules: d.rules });
    }
    const ex = EXPENSE_TOOLS.find(x => x.name === name);
    if (ex) {
      return ok(await expenseTool(name, args));
    }
    const q = QUERY_BY_TOOL.get(name);
    if (q && (MODE !== 'propose' || q.assistant !== false)) return ok(await api.query(q.name, args));   // assistant:false (get_daynotes): not for the in-app assistant
    if (MODE === 'propose') {
      if (name === 'propose_changes') return ok(await api.propose(args.ops, args.note));
      if (OP_BY_TOOL.has(name) || name === 'apply_changes' || name === 'undo_changes') {
        throw new ActionError('PROPOSE_ONLY', 'this connection can only propose changes', { hint: 'use propose_changes; the user applies it in the dashboard' });
      }
      return null;
    }
    if (name === 'apply_changes') return ok(await api.apply({ ops: args.ops, dryRun: args.dryRun === true, confirm: args.confirm, idempotencyKey: args.idempotencyKey }));
    if (name === 'undo_changes') return ok(await api.undo(args.token, args.force === true));
    const o = OP_BY_TOOL.get(name);
    if (o) {
      const { dryRun, confirm, ...params } = args;
      return ok(await api.apply({ ops: [{ op: o.name, ...params }], dryRun: dryRun === true, confirm }));
    }
    return null;   // unknown tool -> protocol error
  } catch (e) {
    if (!(e instanceof ActionError) && !e.code) elog('error', `tool ${name} failed: ${e && e.stack || e}`);
    return toolError(e);
  }
}

// ─── Resources and prompts ─────────────────────────────────────────────────
const RESOURCES = [
  { uri: 'dashboard://context', name: 'context', title: 'Dashboard context', description: "Today's date, streams, people, tags, countdowns and counts (same as get_context).", mimeType: 'application/json' },
  { uri: 'dashboard://today', name: 'today', title: 'Today', description: 'Tasks due today or overdue, today\'s calendar events and the countdowns.', mimeType: 'application/json' },
  { uri: 'dashboard://schema', name: 'schema', title: 'Operations reference', description: 'Every operation and query with its JSON Schema, and the rules.', mimeType: 'application/json' },
];
async function readResource(uri) {
  if (uri === 'dashboard://context') return api.query('context.get', {});
  if (uri === 'dashboard://today') {
    const ctx = await api.query('context.get', {});
    const tasks = await api.query('tasks.list', { view: 'today', limit: 100 });
    const cal = await api.query('calendar.list', { from: ctx.today, to: ctx.today }).catch(() => ({ events: [] }));
    return { today: ctx.today, weekday: ctx.weekday, time: ctx.time, dueTodayOrOverdue: tasks.tasks, events: cal.events || [], countdowns: ctx.countdowns };
  }
  if (uri === 'dashboard://schema') return { ...api.describe(), instructions: INSTRUCTIONS };
  return undefined;
}

// ─── JSON-RPC ──────────────────────────────────────────────────────────────
const E = { PARSE: -32700, INVALID: -32600, METHOD: -32601, PARAMS: -32602, INTERNAL: -32603, RESOURCE: -32002 };
const rpcError = (id, code, message, data) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });

async function handle(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return rpcError(null, E.INVALID, 'Invalid Request');
  const { id, method, params } = msg;
  const isNote = id === undefined || id === null;
  if (typeof method !== 'string') {
    if ('result' in msg || 'error' in msg) return null;   // a response to us; we send no requests
    return rpcError(id, E.INVALID, 'Invalid Request: method missing');
  }
  if (msg.jsonrpc !== '2.0' && !isNote) return rpcError(id, E.INVALID, 'Invalid Request: jsonrpc must be "2.0"');
  // A notification gets no reply, so a request sent as one (tools/call without
  // an id) is ignored: running it would change data with no result, no undo
  // token and no error the caller could see.
  if (isNote && !method.startsWith('notifications/')) {
    elog('warn', `ignored '${method.slice(0, 60)}' sent without an id (requests need an id)`);
    return null;
  }
  try {
    switch (method) {
      case 'initialize': {
        const want = params && params.protocolVersion;
        CLIENT = params && params.clientInfo && typeof params.clientInfo.name === 'string' ? { name: String(params.clientInfo.name).slice(0, 60), version: String(params.clientInfo.version || '').slice(0, 20) } : null;
        elog('info', `initialize from ${clientName()} (protocol ${want}, mode ${MODE})`);
        return rpcResult(id, {
          protocolVersion: PROTOCOL_VERSIONS.includes(want) ? want : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false }, logging: {} },
          serverInfo: { name: 'dashboard', title: 'OpenDash', version: VERSION },
          instructions: INSTRUCTIONS + (MODE === 'propose' ? PROPOSE_ADDENDUM : ''),
        });
      }
      case 'notifications/initialized': case 'notifications/cancelled': case 'notifications/progress': case 'notifications/roots/list_changed':
        return null;
      case 'ping': return rpcResult(id, {});
      case 'logging/setLevel': return rpcResult(id, {});
      case 'tools/list': return rpcResult(id, { tools: toolList() });
      case 'tools/call': {
        const name = params && params.name;
        if (typeof name !== 'string') return rpcError(id, E.PARAMS, 'tools/call needs params.name');
        const res = await callTool(name, params.arguments);
        if (!res) return rpcError(id, E.PARAMS, `Unknown tool: ${String(name).slice(0, 60)}`, { tools: toolList().map(t => t.name) });
        return rpcResult(id, res);
      }
      case 'resources/list': return rpcResult(id, { resources: RESOURCES });
      case 'resources/templates/list': return rpcResult(id, { resourceTemplates: [] });
      case 'resources/read': {
        const uri = params && params.uri;
        let data;
        try { data = await readResource(uri); } catch (e) { return rpcResult(id, { contents: [{ uri, mimeType: 'text/plain', text: toolError(e).content[0].text }] }); }
        if (data === undefined) return rpcError(id, E.RESOURCE, 'Resource not found', { uri });
        return rpcResult(id, { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 1) }] });
      }
      case 'prompts/list': return rpcResult(id, { prompts: PROMPTS.map(p => ({ name: p.name, title: p.title, description: p.description, arguments: p.arguments })) });
      case 'prompts/get': {
        const p = PROMPTS.find(x => x.name === (params && params.name));
        if (!p) return rpcError(id, E.PARAMS, `Unknown prompt: ${String(params && params.name).slice(0, 60)}`, { prompts: PROMPTS.map(x => x.name) });
        const a = (params && params.arguments) || {};
        let text = p.text(a);
        if (MODE === 'propose') text += '\n(This connection can only propose: use propose_changes instead of applying.)';
        return rpcResult(id, { description: p.description, messages: [{ role: 'user', content: { type: 'text', text } }] });
      }
      default:
        if (isNote) return null;
        return rpcError(id, E.METHOD, `Method not found: ${method.slice(0, 60)}`);
    }
  } catch (e) {
    elog('error', `${method} failed: ${e && e.stack || e}`);
    return isNote ? null : rpcError(id, E.INTERNAL, 'Internal error', { message: String(e && e.message || e).slice(0, 300) });
  }
}

// ─── stdio framing ─────────────────────────────────────────────────────────
let outClosed = false;
function write(obj) {
  if (outClosed || obj == null) return;
  try { process.stdout.write(JSON.stringify(obj) + '\n'); } catch { outClosed = true; }
}
process.stdout.on('error', () => { outClosed = true; process.exit(0); });

const pending = new Set();
async function onLine(line) {
  const text = line.trim();   // trim() also drops a byte-order mark
  if (!text) return;
  let msg;
  try { msg = JSON.parse(text); } catch { write(rpcError(null, E.PARSE, 'Parse error')); return; }
  if (Array.isArray(msg)) {
    if (!msg.length) { write(rpcError(null, E.INVALID, 'Invalid Request: empty batch')); return; }
    const out = (await Promise.all(msg.map(handle))).filter(Boolean);
    if (out.length) write(out);
    return;
  }
  write(await handle(msg));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    const p = onLine(line).catch(e => elog('error', `line failed: ${e && e.stack || e}`)).finally(() => pending.delete(p));
    pending.add(p);
  }
  if (buf.length > 8 * 1024 * 1024) { write(rpcError(null, E.INVALID, 'message too large')); buf = ''; }
});
process.stdin.on('end', async () => {
  if (buf.trim()) { const p = onLine(buf); pending.add(p); buf = ''; }
  await Promise.allSettled([...pending]);
  await log.flush();
  // Not process.exit() at once: on Windows, exiting while the closed stdin
  // pipe is still being torn down aborts Node with a libuv assertion
  // (exit code 0xC0000409) when the client hangs up right after a call to the
  // running dashboard. A short grace period lets it finish; the timer is a
  // backstop in case something else keeps the process alive.
  process.exitCode = 0;
  setTimeout(() => process.exit(0), 250);
});

elog('info', `dashboard MCP ${VERSION} ready (mode ${MODE}, data ${paths.root})${legacyAtStart ? ' - data folder not set up yet' : ''}`);
