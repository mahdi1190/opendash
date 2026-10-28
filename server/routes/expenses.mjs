// server/routes/expenses.mjs - Expenses (lib/expenses.mjs), 2.18.1. Private: nothing here reaches friends or any relay.
//
//   GET  /api/expenses                  -> {ok, data: {prefs, payers, items, claims, hints, summary}, today}
//   POST /api/expenses/create           {expense} -> {ok, id, expense, undo, data}     (409 duplicate transaction)
//   POST /api/expenses/update           {id, patch} -> {ok, expense, undo, data}
//   POST /api/expenses/delete           {ids} -> {ok, removed, undo, data}
//   POST /api/expenses/submit           {ids, payer?, method?, date?, note?} -> {ok, claimId, claim, undo, data}
//   POST /api/expenses/unsubmit         {ids} -> back to "to claim"
//   POST /api/expenses/paid             {ids, date?} / POST /api/expenses/unpaid {ids}
//   POST /api/expenses/payer            {name, patch} -> payer settings (bank text, deadline, check days)
//   POST /api/expenses/prefs            {patch}; POST /api/expenses/hint {key} (dismiss a hint)
//   POST /api/expenses/receipt          {id, name, data: base64 | data URL} (PDF/PNG/JPEG/WebP/GIF, 5 MB)
//   POST /api/expenses/receipt/mail     {id, mail: {id, subject, from, date, link?}} (a link, never the email)
//   POST /api/expenses/receipt/remove   {id, ref}
//   GET  /api/expenses/receipt/<rc-....ext>   the file (only names this server made; fetched from the sync folder if another computer has it)
//   GET  /api/expenses/receipt-matches?id=    receipt emails that look like the expense (read only, from the inbox snapshot)
//   POST /api/expenses/scan             {} -> {auto, ask, undo?, data}: marks confident matches paid, returns the questions
//   POST /api/expenses/answer           {ask, yes} -> {ok, data, undo?}
//   POST /api/expenses/pack             {ids, claimId?, format: 'zip'|'html'|'csv'|'text'} -> the file (text: JSON {text})
//   GET  /api/expenses/year?year=       the yearly summary
//   POST /api/expenses/report/plan      {ids} -> {rows: [{id, date, description, col, label, amount, hasReceipt}], columns, name, signature: {set}, missing}
//   POST /api/expenses/report           {ids, cols?: {id: column}, advances?, payer?} -> {ok, dir, count, receipts, missing}: PDF + Receipts.zip in Documents/Expense reports/, folder opened
//   POST /api/expenses/report/open      {dir} (only a folder made by report) -> opens it in the file manager
//   GET  /api/expenses/signature[?info=1]; POST /api/expenses/signature {data}; POST /api/expenses/signature/remove   (your signature for the report; private, never shared)
//   POST /api/expenses/undo             {undo} -> {ok, label, data}
//
// Same protections as every /api route. The log gets counts only, never titles, amounts or payers.

import { HttpError } from '../http.mjs';
import { createZip } from '../../lib/zip.mjs';
import * as X from '../../lib/expenses.mjs';
import * as R from '../../lib/expense-report.mjs';
import { join, resolve, sep } from 'node:path';
import { existsSync } from 'node:fs';

const FETCH_WAIT_MS = 4000;

export default function register(app) {
  const { dataDir, log, getConfig } = app.ctx;
  const home = () => { const c = typeof getConfig === 'function' ? getConfig() || {} : {}; return /^[A-Z]{3}$/.test(c.currency || '') ? c.currency : 'GBP'; };
  const todayOf = (c) => (c.clockNow ? c.clockNow().today : new Date().toISOString().slice(0, 10));
  const view = async (c) => X.publicView(await X.readStore(dataDir, { home: home() }), todayOf(c));
  const fail = (r) => { throw new HttpError(r.status || (r.duplicate ? 409 : 400), r.error); };
  const done = async (c, r, extra = {}) => {
    if (r && r.error) fail(r);
    return { ok: true, ...(r && r.undo ? { undo: r.undo } : {}), ...extra, data: X.publicView(r && r.S ? r.S : await X.readStore(dataDir, { home: home() }), todayOf(c)) };
  };
  const blobs = () => (app.ctx.sync && app.ctx.sync.blobs) || null;
  const post = (path, fn, maxBody) => app.route({ path: '/api/expenses/' + path, method: 'POST', methodError: 'POST only', maxBody: maxBody || 64 * 1024, handler: async (c) => fn(c, await c.body()) });
  const ids = (b) => (Array.isArray(b && b.ids) ? b.ids.filter(x => typeof x === 'string').slice(0, 200) : []);

  app.route({ path: '/api/expenses', method: 'GET', methodError: 'GET only', quiet: true, handler: async (c) => ({ ok: true, data: await view(c), today: todayOf(c), currency: home() }) });
  post('create', async (c, b) => {
    const r = await X.createExpense(dataDir, b && b.expense, { today: todayOf(c), home: home() });
    if (!r.error) log('info', 'expenses: one added');
    return done(c, r, { id: r.id, expense: r.expense });
  });
  post('update', async (c, b) => { const r = await X.updateExpense(dataDir, String(b && b.id), b && b.patch, { today: todayOf(c), home: home() }); return done(c, r, { expense: r.expense }); });
  post('delete', async (c, b) => { const r = await X.deleteExpenses(dataDir, ids(b), { home: home() }); return done(c, r, { removed: r.removed }); });
  post('submit', async (c, b) => {
    const r = await X.submitClaim(dataDir, ids(b), { payer: b.payer, method: b.method, date: b.date, note: b.note, today: todayOf(c), home: home() });
    if (!r.error) log('info', `expenses: a claim of ${r.ids.length} sent`);
    return done(c, r, { claimId: r.claimId, claim: r.claim });
  });
  post('unsubmit', async (c, b) => done(c, await X.unsubmit(dataDir, ids(b), { home: home() })));
  post('paid', async (c, b) => done(c, await X.markPaid(dataDir, ids(b), { date: b.date, today: todayOf(c), home: home() })));
  post('unpaid', async (c, b) => done(c, await X.markUnpaid(dataDir, ids(b), { home: home() })));
  post('payer', async (c, b) => { const r = await X.setPayer(dataDir, String(b && b.name || ''), b && b.patch, { today: todayOf(c), home: home() }); return done(c, r, { payer: r.payer }); });
  post('prefs', async (c, b) => done(c, await X.setPrefs(dataDir, b && b.patch, { home: home() })));
  post('hint', async (c, b) => done(c, await X.dismissHint(dataDir, String(b && b.key || ''), { home: home() })));
  post('undo', async (c, b) => {
    const r = await X.undoChange(dataDir, String(b && b.undo || ''), { home: home() });
    if (!r.ok) throw new HttpError(409, r.error);
    return { ok: true, label: r.label, data: await view(c) };
  });

  // ── receipts ──
  post('receipt', async (c, b) => {
    const r = await X.addReceipt(dataDir, String(b && b.id || ''), { name: b && b.name, data: b && b.data }, { home: home() });
    if (r.error) fail(r);
    try { const bl = blobs(); if (bl) bl.noteLocal(); } catch { /* sync is optional */ }
    return done(c, r, { ref: r.ref });
  }, 8 * 1024 * 1024);
  post('receipt/mail', async (c, b) => { const r = await X.addMailReceipt(dataDir, String(b && b.id || ''), b && b.mail, { home: home() }); return done(c, r); });
  post('receipt/remove', async (c, b) => done(c, await X.removeReceipt(dataDir, String(b && b.id || ''), String(b && b.ref || ''), { home: home() })));
  app.route({
    prefix: '/api/expenses/receipt/', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      let name; try { name = decodeURIComponent(c.path.slice('/api/expenses/receipt/'.length)); } catch { return c.json(404, { error: 'not found' }); }
      let f = await X.readReceipt(dataDir, name);
      if (!f && X.RECEIPT_RE.test(name)) {
        const b = blobs();
        if (b && await b.fetch(`expenses/receipts/${name}`, { waitMs: FETCH_WAIT_MS }).catch(() => false)) f = await X.readReceipt(dataDir, name);
      }
      if (!f) return c.json(404, { error: 'not found' });
      c.send(200, f.buf, f.mime, { 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" });
      return undefined;
    },
  });
  app.route({
    path: '/api/expenses/receipt-matches', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      const S = await X.readStore(dataDir, { home: home() });
      const e = S.items[c.query.get('id') || ''];
      if (!e) throw new HttpError(404, 'That expense is gone.');
      let messages = [];
      try { if (app.ctx.inbox) { const r = await app.ctx.inbox.read({ days: 60 }); messages = Array.isArray(r && r.messages) ? r.messages : []; } } catch { messages = []; }
      return { ok: true, connected: messages.length > 0, matches: X.matchReceiptEmails(e, messages) };
    },
  });

  // ── paid back? ──
  post('scan', async (c) => {
    let analysis = null;
    try { const { financeData } = await import('../../lib/finance.mjs'); const d = await financeData(); analysis = d && d.status === 'ok' ? d.analysis : null; } catch { analysis = null; }
    const today = todayOf(c);
    if (!analysis) return { ok: true, auto: [], ask: [], data: await view(c) };
    const r = await X.scanPaid(dataDir, X.creditsFromAnalysis(analysis, { today }), { today, home: home() });
    if (r.auto.length) log('info', `expenses: ${r.auto.length} payment(s) matched`);
    return { ok: true, auto: r.auto, ask: r.ask, ...(r.undo ? { undo: r.undo } : {}), data: await view(c) };
  });
  post('answer', async (c, b) => {
    const r = await X.answerAsk(dataDir, b && b.ask, b && b.yes === true, { today: todayOf(c), home: home() });
    return done(c, r);
  });

  // ── the claim pack ──
  post('pack', async (c, b) => {
    const S = await X.readStore(dataDir, { home: home() });
    const claim = b && b.claimId ? S.claims[b.claimId] : null;
    const list = (claim ? claim.expenseIds : ids(b)).map(id => S.items[id]).filter(Boolean);
    if (!list.length) throw new HttpError(400, 'Choose at least one expense.');
    const cfg = typeof getConfig === 'function' ? getConfig() || {} : {};
    const sum = X.claimSummary(list, { payer: claim ? claim.payer : (b.payer || list[0].payer || ''), submittedAt: claim ? claim.submittedAt : '', method: claim ? claim.method : '', note: claim ? claim.note || '' : '', homeName: typeof cfg.name === 'string' ? cfg.name : '' });
    const fmtName = b.format;
    if (fmtName === 'text') return { ok: true, text: sum.text, total: sum.total };
    if (fmtName === 'csv') { c.send(200, '﻿' + sum.csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="expenses.csv"', 'Cache-Control': 'no-store' }); return undefined; }
    if (fmtName === 'html') { c.send(200, sum.html, 'text/html; charset=utf-8', { 'Content-Disposition': 'attachment; filename="expense-claim.html"', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" }); return undefined; }
    const files = [{ name: 'summary.html', data: sum.html }, { name: 'summary.csv', data: '﻿' + sum.csv }, { name: 'summary.txt', data: sum.text }];
    for (const [ref, name] of X.packNames(list)) { const f = await X.readReceipt(dataDir, ref); if (f) files.push({ name, data: f.buf }); }
    c.send(200, createZip(files), 'application/zip', { 'Content-Disposition': 'attachment; filename="expense-claim.zip"', 'Cache-Control': 'no-store' });
    return undefined;
  }, 64 * 1024);
  app.route({ path: '/api/expenses/year', method: 'GET', methodError: 'GET only', quiet: true, handler: async (c) => {
    const y = Number(c.query.get('year')) || Number(todayOf(c).slice(0, 4));
    return { ok: true, summary: X.yearSummary(await X.readStore(dataDir, { home: home() }), y) };
  } });
  // ── the expense report (2.19.6) ──
  const goodIds = (b) => ids(b).filter(id => X.ID_RE.test(id));
  post('report/plan', async (c, b) => {
    const S = await X.readStore(dataDir, { home: home() });
    const list = goodIds(b).map(id => S.items[id]).filter(Boolean);
    if (!list.length) throw new HttpError(400, 'Choose at least one expense.');
    const cfg = typeof getConfig === 'function' ? getConfig() || {} : {};
    return { ok: true, rows: R.reportRows(list), columns: R.COLUMN_KEYS.map(k => [k, R.COLUMN_LABELS[k]]), name: typeof cfg.userName === 'string' ? cfg.userName : (typeof cfg.name === 'string' ? cfg.name : ''), signature: await R.signatureInfo(dataDir), payer: list[0].payer || '' };
  });
  post('report', async (c, b) => {
    const S = await X.readStore(dataDir, { home: home() });
    const cfg = typeof getConfig === 'function' ? getConfig() || {} : {};
    const cols = {}; if (b && b.cols && typeof b.cols === 'object') for (const [id, v] of Object.entries(b.cols).slice(0, 200)) if (X.ID_RE.test(id) && R.COLUMN_KEYS.includes(v)) cols[id] = v;
    const name = typeof (b && b.name) === 'string' ? b.name : (typeof cfg.userName === 'string' ? cfg.userName : (typeof cfg.name === 'string' ? cfg.name : ''));
    const r = await R.makeReport(dataDir, S, { ids: goodIds(b), cols, advances: b && b.advances, name, payer: typeof (b && b.payer) === 'string' ? b.payer : '', today: todayOf(c), currency: home() });
    if (r.error) fail(r);
    log('info', `expenses: a report of ${r.count} made`);
    R.openFolder(r.dir);
    return { ok: true, dir: r.dir, count: r.count, receipts: r.receipts, missing: r.missing };
  });
  post('report/open', async (c, b) => {
    const root = resolve(join(R.documentsDir(), 'Expense reports')), dir = resolve(String(b && b.dir || ''));
    if (!dir.startsWith(root + sep) || !existsSync(dir)) throw new HttpError(400, 'That folder is not one of your expense reports.');
    return { ok: R.openFolder(dir) };
  });
  post('signature', async (c, b) => { const r = await R.setSignature(dataDir, b && b.data); if (r.error) fail(r); return { ok: true, signature: { set: true, ext: r.ext } }; }, 4 * 1024 * 1024);
  post('signature/remove', async () => ({ ok: true, ...(await R.removeSignature(dataDir)), signature: { set: false } }));
  app.route({ path: '/api/expenses/signature', method: 'GET', methodError: 'GET only', quiet: true, handler: async (c) => {
    if (c.query.get('info')) return { ok: true, signature: await R.signatureInfo(dataDir) };
    const f = await R.readSignature(dataDir);
    if (!f) return c.json(404, { error: 'No signature yet.' });
    c.send(200, f.buf, f.mime, { 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; sandbox" });
    return undefined;
  } });
  app.route({ prefix: '/api/expenses/', method: '*', handler: (c) => c.json(404, { error: 'unknown expenses route' }) });
}
