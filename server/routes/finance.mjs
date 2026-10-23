// server/routes/finance.mjs - the Finances view (lib/finance.mjs does the work).
//
//   GET  /api/finance             -> {status:'ok', analysis, meta} | {status:'empty', meta}
//   GET  /api/finance/status      -> {job, lastUpdate, available}
//   POST /api/finance/update      {full?:true, bank?:false} -> 202 {job}; 409 if one is running
//                                 (one source only: POST /api/fin-connect/sources/:id/sync)
//                                 bank:false = no bank fetch, just import inbox/ and rebuild
//   POST /api/finance/import      {name, data: base64 of a CSV export, force?} -> {ok, rows, imported, analysis}
//                                 (5 MB file limit; works with no connection at all)
//                                 409 {code:'LOOKS_LIKE_DUPLICATE'}: the file's account is new but most of
//                                 its rows match another account's (an export of a synced account);
//                                 nothing imported - send again with force:true to import anyway
//   POST /api/finance/here        {} -> {ok, job?} | {ok, already}: this computer becomes the finance
//                                 computer (409 SIGN_IN_FIRST without a bank connection of its own)
//   POST /api/finance/categorise  {merchant, category|null} -> {ok, changed, analysis}
//   GET  /api/finance/budgets     -> {budgets};  PUT {budgets} -> {ok, budgets}
//   GET  /api/finance/export      -> text/csv of every transaction (same-origin only)
//   GET  /api/finance/brief       ?mode=cycle|month[&ai=1|&regenerate=1] -> the Overview's money brief
//                                 wording by Claude (aggregates only, numbers checked; cached per day;
//                                 same-origin only; lib/finance/brief.mjs)
//
// The finance folder is <data>/finance unless --finance-dir / config.financeDir say otherwise.
// Logs carry counts only, never amounts, merchants or descriptions.
//
// FINANCES ON EVERY DEVICE (lib/finance-share.mjs; sync on and encrypted): the
// device that runs the 'bank' job publishes its analysis after every rebuild;
// on the others GET /api/finance (and every route that reads finances) shows
// that copy with meta.remote = {name, online, updatedAt}, "Sync bank" (POST
// /update) asks that device and answers 202 {remote} (src/app/56-remote-jobs.js
// waits for it), recategorise and budgets are shared edits, an import is
// refused (409 FINANCE_ELSEWHERE: import it on the device that reads the bank)
// and the export is built from the copy.

import {
  financeData, financeJob, startFinanceUpdate, categoriseMerchant, getBudgets, setBudgets,
  importUpload, exportTransactions, setFinanceHooks, MAX_UPLOAD_BYTES,
  localFinanceData, localBudgets, writeBudgetsFile, applyMerchantOverrides,
} from '../../lib/finance.mjs';
import { createFinanceShare } from '../../lib/finance-share.mjs';
import { EDITS_REL, SHARE_REL } from '../../lib/sync/finance-share.mjs';
import { transactionsCsv } from '../../lib/finance/report.mjs';
import { updateConnection } from '../../lib/datadir.mjs';
import { sourcesFor } from '../../lib/sources.mjs';
import { fetchFromSource, describeRejected } from '../../lib/source-adapter.mjs';
import { finConnectFor } from '../../lib/fin-connect/index.mjs';
import { HttpError } from '../http.mjs';
import { skippedBody } from '../../lib/main-computer.mjs';
import { clockTodayIn, canonZone } from '../../lib/clock.mjs';
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
      // Direct bank and wallet connections (lib/fin-connect/): read by the server, no Claude.
      if (src.kind === 'direct') return finConnectFor(app.ctx).fetchDirect(src, opts);
      const disc = sources.cached();
      const accountOn = (id) => { const a = (src.accounts || []).find(x => x.id === id); return !a || a.enabled !== false; };
      const r = await fetchFromSource(src, { ...opts, accountOn, serverDef: sources.serverDef(src.server), denyServers: ((disc && disc.servers) || []).filter(x => x.kind === 'claude.ai').map(x => x.name) });
      const rej = describeRejected(r.rejected);
      log('note', `bank source: ${r.rows.length} transactions, ${r.accounts.length} account(s)`);
      return { ...r, ...(rej ? { warning: `left out ${rej}` } : {}) };
    },
    noteSync: (id, r) => sources.noteSync(id, r),
  });

  /** The kind of connection a bank source is, as Connections > Money names it. */
  const providerOf = (s) => (!s ? 'csv' : s.kind === 'direct' ? String(s.provider || 'direct') : s.preset === 'aureli' ? 'aureli' : s.kind === 'csv' ? 'csv' : 'mcp');
  /**
   * Accounts for the Finances chips: [{key, sourceId, sourceLabel, sourceColour, name, colour, enabled}],
   * plus provider, kind and lastSync for Connections > Money on the other devices (the published copy).
   */
  async function accountsMeta(analysis) {
    const list = (await sources.all()).filter(s => s.capability === 'bank');
    const out = [];
    const seen = new Set();
    for (const s of list) {
      for (const a of s.accounts || []) {
        const key = s.preset === 'aureli' || s.kind === 'csv' ? a.id : `${s.id}.${a.id}`;
        if (seen.has(key)) continue; seen.add(key);
        out.push({ key, sourceId: s.id, sourceLabel: s.label, sourceColour: s.colour, provider: providerOf(s), kind: a.kind || null, name: a.name, colour: a.colour, enabled: a.enabled !== false && s.enabled, lastSync: s.lastSync || null });
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
      out.push({ key: k, sourceId: src ? src.id : null, sourceLabel: src ? src.label : 'Imported', sourceColour: src ? src.colour : 'slate', provider: providerOf(src), kind: null,
        // Account numbers are shortened; a readable label from a CSV is kept as it is.
        name: /\d{5,}/.test(k) || (isAureli && !generic) ? 'Account …' + String(k).replace(/^.*\./, '').replace(/\s+/g, '').slice(-4) : String(k).replace(/^.*\./, '').slice(0, 30),
        colour: null, enabled: true, lastSync: (src && src.lastSync) || null });
    }
    return out;
  }
  /** The bank sources and accounts the Finances chips show: {sources, accounts, canSync}. */
  async function sourcesMeta(analysis) {
    const st = await sources.status({ discover: false });
    return {
      sources: st.sources.filter(s => s.capability === 'bank').map(s => ({ id: s.id, label: s.label, kind: s.kind, provider: providerOf(s), colour: s.colour, enabled: s.enabled, state: s.health && s.health.state, lastSync: s.lastSync })),
      accounts: await accountsMeta(analysis),
      canSync: st.capabilities.bank.available,
    };
  }

  // Finances on every device (lib/finance-share.mjs): publish here, or show what the finance computer published.
  const share = createFinanceShare({
    dataDir: (app.ctx.paths && app.ctx.paths.root) || dataDir, log,
    sync: () => app.ctx.sync || null, remoteJobs: () => app.ctx.remoteJobs || null,
    hooks: {
      localData: () => localFinanceData(),
      extraMeta: async (analysis) => { const m = await sourcesMeta(analysis); return { sources: m.sources, accounts: m.accounts }; },
      financeDir: () => financeDir(),
      localBudgets: () => localBudgets(),
      writeBudgets: (map) => writeBudgetsFile(map),
      applyOverrides: (list) => applyMerchantOverrides(list),
      // An account's name, colour or Show in Finances chosen on another device: into this computer's sources.
      applyAccounts: async (list) => {
        const svc = finConnectFor(app.ctx);
        const all = (await sources.all()).filter(s => s.capability === 'bank');
        let n = 0;
        for (const x of list) {
          let cur = null;
          for (const s of all) for (const a of s.accounts || []) if ((s.preset === 'aureli' || s.kind === 'csv' ? a.id : `${s.id}.${a.id}`) === x.k) cur = a;
          if (!cur) continue;
          const patch = {};
          if (x.name && x.name !== cur.name) patch.name = x.name;
          if (x.colour && x.colour !== cur.colour) patch.colour = x.colour;
          if (typeof x.hidden === 'boolean' && x.hidden === (cur.enabled !== false)) patch.enabled = !x.hidden;
          if (!Object.keys(patch).length) continue;
          try { await svc.patchAccount(x.k, patch); n++; } catch (e) { log('warn', `finance share: an account edit was not applied (${e.code || 'error'})`); }
        }
        return n > 0;
      },
    },
  });
  app.ctx.financeShare = share;
  setFinanceHooks({ share });
  // Edits from the other devices are applied by the finance computer; a device
  // that just became it publishes. Also every few minutes, and once at start.
  let shareTimer = null;
  // This computer's open tabs reload Finances once another device's edits are applied here.
  const tellTabs = (changed) => {
    const sse = app.ctx.liveSync;
    if (changed && sse && typeof sse.emit === 'function') { try { sse.emit('synced-files', { rels: [SHARE_REL], at: Date.now() }); } catch { /* no open tabs */ } }
  };
  const applyEdits = () => share.applyEdits().then(tellTabs, () => {});
  app.onReady(() => {
    const e = app.ctx.sync;
    if (e && typeof e.onApplied === 'function') {
      e.onApplied((info) => {
        const rels = (info && info.fileRels) || [];
        if (rels.includes(EDITS_REL)) applyEdits();
        else if (rels.includes('roles.json') || rels.includes('accounts.json')) share.publish();
      });
    }
    const first = setTimeout(applyEdits, 15000); first.unref?.();
    shareTimer = setInterval(applyEdits, 5 * 60 * 1000); shareTimer.unref?.();
  });
  app.onClose(() => { clearInterval(shareTimer); });

  app.route({
    path: '/api/finance', method: 'GET', methodError: 'GET only',
    handler: async () => {
      const d = await financeData();
      const r = d.meta && d.meta.remote;
      try {
        if (r && !r.waiting) {
          // The finance computer's copy: its accounts and sources (with this device's edits not applied there yet).
          d.meta.accounts = await share.accountOverlay(d.meta.accounts || []);
          d.meta.canSync = true;
        } else {
          Object.assign(d.meta, await sourcesMeta(d.analysis));
          if (r && !r.trial) d.meta.canSync = true;
        }
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
      // Another device reads the bank: it runs the update (asked by name), then publishes.
      const v = c.internal ? null : await share.view().catch(() => null);
      if (v && v.kind !== 'local') {
        const name = (v.host && v.host.name) || 'your other computer';
        if (body.automatic === true) return { skipped: true, reason: 'finance-computer', runsOn: name, message: `Finance comes from ${name}.` };
        const r = await share.ask(body, c);
        return c.json(r.status, r.body);
      }
      // {automatic: true} ("Start my day"): only on the main computer (lib/main-computer.mjs).
      const mc = app.ctx.mainComputer ? await app.ctx.mainComputer.gate('bank', { automatic: body.automatic === true }) : { run: true };
      if (!mc.run) return skippedBody(mc);
      // ── host ── A click: the banks read through Claude that the Claude host reads too are left to it
      // (lib/remote-jobs.mjs hostFetch; only once the money itself syncs). c.internal: asked by another
      // device, or this computer's own fallback for those banks (body.only).
      const hf = body.automatic !== true && body.bank !== false && !c.internal && app.ctx.remoteJobs ? await app.ctx.remoteJobs.hostFetch('fetch:finance', body, c).catch(() => ({ skip: [], asked: [] })) : { skip: [], asked: [] };
      const only = c.internal && Array.isArray(body.only) ? body.only.filter(x => typeof x === 'string').slice(0, 10) : null;
      const r = startFinanceUpdate({ full: body.full === true, bank: body.bank !== false, ...(hf.skip.length ? { skip: hf.skip } : {}), ...(only && only.length ? { only } : {}), ...(c.internal && body.manual === true ? { manual: true } : {}) });
      if (r.error) throw new HttpError(400, r.error);
      if (!r.started) return c.json(409, { error: 'An update is already running.', job: r.job });
      log('note', `finance update started${body.bank === false ? ' (no bank)' : body.full === true ? ' (full)' : ''}`);
      const asked = hf.asked.length ? { asked: hf.asked, message: `Asking ${[...new Set(hf.asked.map(a => a.runsOn))].join(' and ')} to update your bank.` } : hf.message ? { message: hf.message } : {};
      return c.json(202, { job: r.job, ...asked });
    },
  });

  // Connections > Money on another device: "Sign in to this bank on this computer instead". Once this
  // computer has a bank of its own, it becomes the finance computer and reads it now (lib/finance-share.mjs).
  app.route({
    path: '/api/finance/here', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      await c.body({ allowEmpty: true });
      const own = (await sources.all()).filter(s => s.capability === 'bank' && s.enabled !== false && !s.demo && s.kind !== 'csv'
        && (s.kind !== 'direct' || (!s.setup && (s.accounts || []).length > 0)));
      const r = await share.useThisComputer({ hasBank: own.length > 0 });
      if (!r.ok) return c.json(409, { code: r.code, error: r.message });
      if (r.already) return { ok: true, already: true };
      const u = startFinanceUpdate({});
      log('note', 'finance: this computer reads the bank now; update started');
      return { ok: true, job: u.job || null };
    },
  });

  app.route({
    path: '/api/finance/import', method: 'POST', methodError: 'POST only',
    // base64 is 4/3 of the file, plus the JSON wrapper.
    maxBody: Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 4096,
    handler: async (c) => {
      const body = await c.body();
      const v = await share.view().catch(() => null);
      if (v && v.kind !== 'local') {
        const name = (v.host && v.host.name) || 'your other computer';
        return c.json(409, { code: 'FINANCE_ELSEWHERE', runsOn: name, error: `Your finances come from ${name}, so a CSV is imported there: open OpenDash on ${name} and import it in Finances. It shows here after that.` });
      }
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
    // base: the budgets the page started from (with sync on, only what it changed is written).
    handler: async (c) => { const b = await c.body(); return setBudgets(b.budgets, b.base && typeof b.base === 'object' ? b.base : null); },
  });

  /** The export on a device that shows another device's finances: built from that copy. */
  function mirrorCsv(analysis) {
    const exclude = Array.isArray(analysis.exclude_from_spending) ? analysis.exclude_from_spending : ['Income', 'Internal transfers'];
    const rows = (analysis.transactions || []).filter(t => t && typeof t.d === 'string').map(t => {
      const amount = Number(t.a) || 0;
      return { date: t.d, n: Date.parse(t.d + 'T12:00:00Z') / 864e5, merchant: String(t.m || ''), category: String(t.c || 'Uncategorised'), amount,
        spend: exclude.includes(t.c) ? 0 : -amount, account: String(t.acct || ''), subcategory: '', memo: String(t.memo || ''), source: '' };
    });
    return transactionsCsv(rows);
  }

  app.route({
    path: '/api/finance/export', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: async (c) => {
      const d = await financeData();
      const csv = d.meta && d.meta.remote && !d.meta.remote.waiting && d.analysis ? mirrorCsv(d.analysis) : await exportTransactions();
      const day = clockTodayIn(canonZone((c.getConfig() || {}).timezone) || 'UTC');   // the home day, not UTC (travel spec S7)
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
