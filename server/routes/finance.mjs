// server/routes/finance.mjs - the Finances view (lib/finance.mjs does the work).
//
//   GET  /api/finance             -> {status:'ok', analysis, meta} | {status:'empty', meta}
//   GET  /api/finance/status      -> {job, lastUpdate, available}
//   POST /api/finance/update      {full?:true, bank?:false} -> 202 {job}; 409 if one is running
//                                 bank:false = no bank fetch, just import inbox/ and rebuild
//   POST /api/finance/import      {name, data: base64 of a CSV export, force?} -> {ok, rows, imported, analysis}
//                                 (5 MB file limit; works with no connection at all)
//                                 409 {code:'LOOKS_LIKE_DUPLICATE'}: the file's account is new but most of
//                                 its rows match another account's (an export of a synced account);
//                                 nothing imported - send again with force:true to import anyway
//   POST /api/finance/categorise  {merchant, category|null} -> {ok, changed, analysis}
//   GET  /api/finance/budgets     -> {budgets};  PUT {budgets} -> {ok, budgets}
//   GET  /api/finance/export      -> text/csv of every transaction (same-origin only)
//   GET  /api/finance/brief       ?mode=cycle|month[&ai=1|&regenerate=1] -> the Overview's money brief
//                                 wording by Claude (aggregates only, numbers checked; cached per day;
//                                 same-origin only; lib/finance/brief.mjs)
//
// The finance folder is <data>/finance unless --finance-dir / config.financeDir say otherwise.
// Logs carry counts only, never amounts, merchants or descriptions.

import {
  financeData, financeJob, startFinanceUpdate, categoriseMerchant, getBudgets, setBudgets,
  importUpload, exportTransactions, setFinanceHooks, MAX_UPLOAD_BYTES,
} from '../../lib/finance.mjs';
import { updateConnection } from '../../lib/datadir.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { fetchFromSource, describeRejected } from '../../lib/source-adapter.mjs';
import { HttpError } from '../http.mjs';
import { financeDir } from '../../lib/finance.mjs';
import { MBM, briefFor, aiBrief, readBriefCache, writeBriefCache, briefCacheFile, DEFAULT_BRIEF_MODEL } from '../../lib/finance/brief.mjs';
import { askJson, aiStatus } from '../../lib/ai.mjs';

// Tests swap the model (GET /api/finance/brief).
let briefAi = null;
export function setFinanceBriefAi(impl) { briefAi = impl || null; }

export default function register(app) {
  const { log, dataDir } = app.ctx;

  // The pipeline reads the live config (time zone, currency) on each run, and
  // a bank fetch records what it learned about the Bank connection, so the
  // page can grey out bank sync until it works.
  const sources = sourcesFor(app.ctx);
  setFinanceHooks({
    getConfig: () => (typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() : {}),
    onBankStatus: async (patch) => {
      if (!dataDir) return;
      await updateConnection(dataDir, 'bank', patch);
      log('note', `bank connection: ${patch.status}`);
    },
    // Sources: every enabled bank source is read by an update (the Aureli preset
    // through its tuned job, any other bank MCP server through the generic adapter).
    bankSources: async () => (await sources.all()).filter(s => s.capability === 'bank'),
    fetchSource: async (src, opts) => {
      const disc = sources.cached();
      const accountOn = (id) => { const a = (src.accounts || []).find(x => x.id === id); return !a || a.enabled !== false; };
      const r = await fetchFromSource(src, { ...opts, accountOn, serverDef: sources.serverDef(src.server), denyServers: ((disc && disc.servers) || []).filter(x => x.kind === 'claude.ai').map(x => x.name) });
      const rej = describeRejected(r.rejected);
      log('note', `bank source: ${r.rows.length} transactions, ${r.accounts.length} account(s)`);
      return { ...r, ...(rej ? { warning: `left out ${rej}` } : {}) };
    },
    noteSync: (id, r) => sources.noteSync(id, r),
  });

  /** Accounts for the Finances chips: [{key, sourceId, sourceLabel, sourceColour, name, colour, enabled}]. */
  async function accountsMeta(analysis) {
    const list = (await sources.all()).filter(s => s.capability === 'bank');
    const out = [];
    const seen = new Set();
    for (const s of list) {
      for (const a of s.accounts || []) {
        const key = s.preset === 'aureli' || s.kind === 'csv' ? a.id : `${s.id}.${a.id}`;
        if (seen.has(key)) continue; seen.add(key);
        out.push({ key, sourceId: s.id, sourceLabel: s.label, sourceColour: s.colour, name: a.name, colour: a.colour, enabled: a.enabled !== false && s.enabled });
      }
    }
    // Accounts in the data that no source names: CSV imports (or a bank that was removed).
    const csv = list.find(s => s.kind === 'csv');
    const aureli = list.find(s => s.preset === 'aureli');
    const tx = analysis && Array.isArray(analysis.transactions) ? analysis.transactions : [];
    for (const k of [...new Set(tx.map(t => t && t.acct).filter(Boolean))]) {
      if (seen.has(k)) continue; seen.add(k);
      const generic = list.find(s => k.startsWith(s.id + '.'));
      // Aureli ids are opaque tokens; CSV exports carry sort code / account numbers.
      const isAureli = !generic && aureli && /^[A-Za-z0-9_-]{8,64}$/.test(k) && /[A-Za-z]/.test(k);
      const src = generic || (isAureli ? aureli : csv) || null;
      out.push({ key: k, sourceId: src ? src.id : null, sourceLabel: src ? src.label : 'Imported', sourceColour: src ? src.colour : 'slate',
        // Account numbers are shortened; a readable label from a CSV is kept as it is.
        name: /\d{5,}/.test(k) || (isAureli && !generic) ? 'Account …' + String(k).replace(/^.*\./, '').replace(/\s+/g, '').slice(-4) : String(k).replace(/^.*\./, '').slice(0, 30),
        colour: null, enabled: true });
    }
    return out;
  }

  app.route({
    path: '/api/finance', method: 'GET', methodError: 'GET only',
    handler: async () => {
      const d = await financeData();
      try {
        const st = await sources.status({ discover: false });
        d.meta.sources = st.sources.filter(s => s.capability === 'bank').map(s => ({ id: s.id, label: s.label, kind: s.kind, colour: s.colour, enabled: s.enabled, state: s.health && s.health.state, lastSync: s.lastSync }));
        d.meta.accounts = await accountsMeta(d.analysis);
        d.meta.canSync = st.capabilities.bank.available;
      } catch (e) { log('warn', `finance: sources meta failed (${e.message})`); }
      return d;
    },
  });

  app.route({
    path: '/api/finance/status', method: 'GET',
    handler: async () => {
      const d = await financeData();
      return { job: financeJob(), lastUpdate: d.meta.lastUpdate, available: d.meta.available };
    },
  });

  app.route({
    path: '/api/finance/update', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const body = await c.body({ allowEmpty: true });
      const r = startFinanceUpdate({ full: body.full === true, bank: body.bank !== false });
      if (r.error) throw new HttpError(400, r.error);
      if (!r.started) return c.json(409, { error: 'An update is already running.', job: r.job });
      log('note', `finance update started${body.bank === false ? ' (no bank)' : body.full === true ? ' (full)' : ''}`);
      return c.json(202, { job: r.job });
    },
  });

  app.route({
    path: '/api/finance/import', method: 'POST', methodError: 'POST only',
    // base64 is 4/3 of the file, plus the JSON wrapper.
    maxBody: Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 4096,
    handler: async (c) => {
      const body = await c.body();
      const r = await importUpload({ name: body.name, data: body.data, force: body.force === true });
      log('note', `finance import: ${r.rows} rows, ${r.imported} new`);
      return r;
    },
  });

  app.route({
    path: '/api/finance/categorise', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const body = await c.body();
      if (!('category' in body)) throw new HttpError(400, 'category is required (a name, or null to clear)');
      const r = await categoriseMerchant(body.merchant, body.category);
      return { ok: true, changed: r.changed, analysis: r.analysis };
    },
  });

  app.route({ path: '/api/finance/budgets', method: 'GET', methodError: 'GET or PUT only', handler: () => getBudgets() });
  app.route({
    path: '/api/finance/budgets', method: 'PUT', methodError: 'GET or PUT only',
    handler: async (c) => setBudgets((await c.body()).budgets),
  });

  app.route({
    path: '/api/finance/export', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: async (c) => {
      const csv = await exportTransactions();
      const now = new Date();   // the file is named after today on the user's calendar, not UTC's
      const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      c.send(200, '﻿' + csv, 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="transactions-${day}.csv"` });
    },
  });

  // The Overview's money brief: Claude's wording of "your money in three
  // sentences" (optional; the page always shows its own template first).
  //   GET /api/finance/brief?mode=cycle|month          -> {date, mode, key, template, ai:{state, model, sentences?}}
  //   ...&ai=1 (ask Claude if today has no wording yet), ...&regenerate=1 (ask again)
  // ai.state: 'cached' | 'fresh' | 'missing' | 'off' (config.finance.briefAi === false).
  // Claude sees aggregates only (lib/finance/brief.mjs); every number is checked.
  const pendingBrief = new Map();
  app.route({
    path: '/api/finance/brief', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: async (c) => {
      const d = await financeData();
      if (d.status !== 'ok' || !d.analysis) throw new HttpError(404, 'No finance data yet.');
      const cfg = typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {};
      const fin = cfg.finance && typeof cfg.finance === 'object' ? cfg.finance : {};
      const { B, fmt, facts, key } = briefFor(d.analysis, { mode: c.query.get('mode'), currency: cfg.currency, locale: cfg.locale });
      const date = MBM.util.diso(B.anchor);
      const model = typeof fin.briefModel === 'string' && fin.briefModel ? fin.briefModel : DEFAULT_BRIEF_MODEL;
      const out = { date, mode: B.mode, key, template: B.sentences, ai: { state: 'missing', model } };
      if (fin.briefAi === false) { out.ai.state = 'off'; return out; }
      const regen = c.query.get('regenerate') === '1';
      const file = financeDir() ? briefCacheFile(financeDir()) : null;
      if (!regen) {
        const hit = await readBriefCache(file, date, B.mode).catch(() => null);
        if (hit && hit.key === key) {
          const v = MBM.validate({ sentences: hit.sentences }, B, fmt);
          if (v.replaced < 3) return { ...out, ai: { state: 'cached', model: hit.model || model, at: hit.at || null, sentences: v.sentences, replaced: v.replaced } };
        }
      }
      if (!regen && c.query.get('ai') !== '1') return out;
      const pk = date + '|' + B.mode + '|' + key;
      if (pendingBrief.has(pk)) return pendingBrief.get(pk);
      const run = (async () => {
        const ai = briefAi || { askJson, aiStatus };
        const st = await ai.aiStatus().catch(() => ({ available: false }));
        if (!st.available) throw new HttpError(503, 'Claude is not connected, so the brief keeps its own wording.', { code: st.code || 'UNAVAILABLE' });
        const t0 = Date.now();
        const r = await aiBrief({ B, fmt, facts, askJson: ai.askJson, model, style: cfg.ai && cfg.ai.style });
        if (r.replaced >= 3) throw new HttpError(502, 'Claude’s wording did not match the numbers, so the brief keeps its own.', { code: 'BAD_OUTPUT' });
        const entry = { key, model: r.model, at: new Date().toISOString(), sentences: r.sentences, dropped: r.dropped, replaced: r.replaced };
        if (file) await writeBriefCache(file, date, B.mode, entry).catch(e => log('warn', `finance brief: cache not written (${e.message})`));
        log('info', `finance brief ${B.mode}: ${r.model} replaced=${r.replaced} dropped=${r.dropped} ${Date.now() - t0}ms`);
        return { ...out, ai: { state: 'fresh', ...entry } };
      })();
      pendingBrief.set(pk, run);
      try { return await run; } finally { pendingBrief.delete(pk); }
    },
  });

  app.route({ prefix: '/api/finance/', method: '*', handler: (c) => c.json(404, { error: 'unknown finance route' }) });
}
