// server/routes/actions.mjs - the actions layer over HTTP, live sync, and
// the MCP install info. The library is server/actions/index.mjs.
//
//   POST /api/actions          {ops, dryRun?, idempotencyKey?, source?, client?, confirm?, ifVersion?}
//                              -> {ok, applied, changed, version, summary, preview, warnings, created, undo}
//                              dryRun -> {ok, dryRun, preview, needsConfirm, reasons?, confirm}
//                              {ops, propose:true}            -> stores a proposal, never applies
//                              {proposalId}                   -> applies a stored proposal (the user's click)
//                              {proposalId, only:[i], dryRun:true} -> preview + confirm token for just those changes
//                              {proposalId, only:[i], confirm}     -> applies just those (+ what they need via $ref)
//                              {proposalId, dismiss:true}     -> dismisses it
//                              errors: {ok:false, error:{code, message, field, valid, hint, opIndex, ...}}
//   POST /api/actions/undo     {token, force?, dryRun?}
//   GET  /api/actions/schema   every op and query with its JSON Schema, plus the rules
//   GET  /api/query?op=tasks.list&view=today&limit=20      (or &params=<json>)
//   POST /api/query            {op, params}
//   GET  /api/events           Server-Sent Events: {version, source, client, summary} on every change
//   GET  /api/mcp-info         install commands for this machine (Claude Code / T3 Code / Desktop)
//
// Auth (on top of the router's Host 421 / same-origin 403 / body 413 checks):
// either the page itself (same-origin: Origin or Sec-Fetch-Site), or a local
// program that sends X-Dashboard-Token with the contents of <data>/local-token.
// Anything else gets 401. The token file is created on first boot.

import { createActions } from '../actions/index.mjs';
import { QUERY_BY_NAME, QUERY_BY_TOOL } from '../actions/queries.mjs';
import { ActionError, SOURCES } from '../actions/model.mjs';
import { ensureLocalToken, tokenMatches, TOKEN_HEADER, writeRuntime, removeRuntime, removeRuntimeSync } from '../actions/auth.mjs';
import { createLiveSync } from '../live-sync.mjs';
import { installInfo } from '../../mcp/install.mjs';
import { OPS } from '../actions/ops.mjs';
import { INSTRUCTIONS } from '../../mcp/instructions.mjs';

const BODY = 2 * 1024 * 1024;

export default function register(app) {
  const ctx = app.ctx;
  const { dataDir, store, log } = ctx;
  const actions = createActions({ dataDir, store, getConfig: ctx.getConfig, financeDir: ctx.financeDir, log });
  ctx.actions = actions;            // other route files (e.g. the assistant) use the same instance
  const live = createLiveSync({ store, journal: actions.journal, log });
  ctx.liveSync = live;
  let token = null;
  const getToken = async () => (token = token || await ensureLocalToken(dataDir));

  app.onReady(async () => {
    await getToken();
    await live.start();
    await writeRuntime(dataDir, { pid: process.pid, port: ctx.port, url: `http://localhost:${ctx.port}/`, stateFile: store.file, startedAt: new Date().toISOString(), version: ctx.version });
    process.once('exit', () => removeRuntimeSync(dataDir));
  });
  app.onClose(async () => { live.close(); await removeRuntime(dataDir); });

  /** 'browser' | 'token'; throws 401 otherwise. */
  async function who(c, { write }) {
    const presented = c.req.headers[TOKEN_HEADER];
    if (presented !== undefined) {
      if (tokenMatches(String(presented).trim(), await getToken())) return 'token';
      throw new ActionError('UNAUTHORIZED', 'wrong X-Dashboard-Token (read it from <data>/local-token)');
    }
    const origin = c.req.headers.origin;
    const sfs = c.req.headers['sec-fetch-site'];
    const ours = origin === `http://localhost:${c.port}` || origin === `http://127.0.0.1:${c.port}`;
    if (ours || sfs === 'same-origin') return 'browser';
    // A read typed into the address bar (Sec-Fetch-Site: none) is the user's own navigation.
    if (!write && sfs === 'none') return 'browser';
    throw new ActionError('UNAUTHORIZED', `${write ? 'changes' : 'reads'} need the dashboard page itself, or a local program sending X-Dashboard-Token (the contents of <data>/local-token)`);
  }
  function fail(c, e) {
    if (e instanceof ActionError) return c.json(e.status || 400, { ok: false, error: e.toJSON() });
    if (e && e.status && e.status < 500) return c.json(e.status, { ok: false, error: { code: e.code || 'BAD_REQUEST', message: e.message } });
    if (e && (e.code === 'LOCK_TIMEOUT' || e.status === 503)) return c.json(503, { ok: false, error: { code: e.code || 'BUSY', message: e.message, hint: 'try again in a moment' } });
    log('error', `actions: ${e && e.stack || e}`);
    return c.json(500, { ok: false, error: { code: 'INTERNAL', message: 'internal error (see the server log)' } });
  }
  function sourceFor(kind, b) {
    const s = typeof b.source === 'string' ? b.source : null;
    if (kind === 'browser') return s === 'assistant' ? 'assistant' : 'ui';
    return s && SOURCES.includes(s) ? s : 'script';
  }

  app.route({
    path: '/api/actions', method: 'POST', maxBody: BODY, methodError: 'POST only',
    handler: async (c) => {
      try {
        const kind = await who(c, { write: true });
        const b = await c.body();
        const source = sourceFor(kind, b);
        const client = typeof b.client === 'string' ? b.client : (kind === 'browser' ? 'dashboard' : null);
        if (b.proposalId) {
          if (b.dismiss === true) return await actions.dismissProposal(String(b.proposalId));
          if (b.only !== undefined && !(Array.isArray(b.only) && b.only.every(Number.isInteger))) throw new ActionError('INVALID_PARAMS', 'only must be a list of change numbers (0-based) from the proposal', { field: 'only' });
          return await actions.applyProposal(String(b.proposalId), {
            source: kind === 'browser' ? 'assistant' : source, client,
            only: b.only, dryRun: b.dryRun === true, confirm: typeof b.confirm === 'string' ? b.confirm : undefined,
          });
        }
        if (b.propose === true) return await actions.propose({ ops: b.ops, source: kind === 'browser' ? 'assistant' : source, client, note: b.note });
        return await actions.apply({
          ops: b.ops, dryRun: b.dryRun === true, idempotencyKey: b.idempotencyKey, source, client,
          confirm: b.confirm, ifVersion: b.ifVersion, zone: c.zone,
        });
      } catch (e) { return fail(c, e); }
    },
  });

  app.route({
    path: '/api/actions/undo', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      try {
        const kind = await who(c, { write: true });
        const b = await c.body();
        if (typeof b.token !== 'string' || !b.token) throw new ActionError('INVALID_PARAMS', 'token is required (from the undo field of a result, or list_history)', { field: 'token' });
        return await actions.undo(b.token, { source: sourceFor(kind, b), client: typeof b.client === 'string' ? b.client : null, force: b.force === true, dryRun: b.dryRun === true });
      } catch (e) { return fail(c, e); }
    },
  });

  app.route({
    path: '/api/actions/schema', method: 'GET',
    handler: async (c) => {
      try { await who(c, { write: false }); return { ...actions.describe(), instructions: INSTRUCTIONS }; } catch (e) { return fail(c, e); }
    },
  });

  // Query-string values arrive as text: coerce them by the query's schema.
  function paramsFromQuery(def, qs) {
    if (qs.has('params')) {
      try { const p = JSON.parse(qs.get('params')); if (p && typeof p === 'object' && !Array.isArray(p)) return p; } catch { /* fall through */ }
      throw new ActionError('INVALID_PARAMS', 'params must be a JSON object', { field: 'params' });
    }
    const props = (def && def.schema && def.schema.properties) || {};
    const out = {};
    for (const [k, v] of qs) {
      if (k === 'op') continue;
      const t = props[k] && props[k].type;
      out[k] = t === 'integer' || t === 'number' ? (v.trim() !== '' && isFinite(Number(v)) ? Number(v) : v)
        : t === 'boolean' ? (v === 'true' ? true : v === 'false' ? false : v)
          : t === 'array' ? v.split(',').map(s => s.trim()).filter(Boolean) : v;
    }
    return out;
  }
  app.route({
    path: '/api/query', method: 'GET', methodError: 'GET or POST only',
    handler: async (c) => {
      try {
        await who(c, { write: false });
        const op = c.query.get('op') || '';
        const def = QUERY_BY_NAME.get(op) || QUERY_BY_TOOL.get(op);
        return await actions.query(op, paramsFromQuery(def, c.query), { zone: c.zone });
      } catch (e) { return fail(c, e); }
    },
  });
  app.route({
    path: '/api/query', method: 'POST', methodError: 'GET or POST only',
    handler: async (c) => {
      try {
        await who(c, { write: false });
        const b = await c.body();
        return await actions.query(String(b.op || ''), b.params || {}, { zone: c.zone });
      } catch (e) { return fail(c, e); }
    },
  });

  app.route({
    path: '/api/events', method: 'GET', quiet: true,
    handler: async (c) => {
      try { await who(c, { write: false }); } catch (e) { return fail(c, e); }
      await live.attach(c.req, c.res);
    },
  });

  app.route({
    path: '/api/mcp-info', method: 'GET',
    handler: async (c) => {
      try {
        await who(c, { write: false });
        const info = installInfo({ dataDir, writeTools: OPS.map(o => o.tool).concat(['apply_changes', 'undo_changes']) });
        return { ...info, running: { port: c.port, transport: 'the MCP server talks to this dashboard over HTTP while it runs, and edits the data folder directly (same lock) when it does not' } };
      } catch (e) { return fail(c, e); }
    },
  });
}
