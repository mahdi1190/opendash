// server/routes/owed.mjs - Owed to me (lib/owed.mjs). Private: nothing here reaches friends or any relay, and nothing is sent to anyone.
//
//   GET  /api/owed                 -> {ok, data, today, currency}
//   POST /api/owed/scan            {} -> {ok, data, suggestions, offers, auto, undo?, rebuilt?, leftOut}: reads the money in and out of the analysis
//   POST /api/owed/create          {thing} -> {ok, id, thing, undo, data}   (409: that payment is already split)
//   POST /api/owed/create-batch    {things} -> {ok, ids, skipped, undo, data}: one Undo for them all
//   POST /api/owed/update          {id, thing}   POST /api/owed/delete {ids}
//   POST /api/owed/paid            {refs: [{id, key, amount?}], date?}   POST /api/owed/unpaid {refs}
//   POST /api/owed/write-off       {refs}   POST /api/owed/reminded {refs}   POST /api/owed/settle {key}
//   POST /api/owed/answer          {suggestion, yes, pick?}: Yes or Not this
//   POST /api/owed/assign          {tx, allocs: [{id, key, amount}], payer?, rest: credit|gift|none, replace?}: this payment went on those
//   POST /api/owed/unassign {tx}   POST /api/owed/link {id, tx}   POST /api/owed/unlink {id}
//   POST /api/owed/pick-info {tx} -> {payer}   POST /api/owed/recent {dir} -> {rows}: payments not used yet
//   POST /api/owed/proposal        {id, yes}: the assistant's question
//   POST /api/owed/find-payment    {amount} -> {rows}: the bank payment a hand-written split may be
//   POST /api/owed/prefs {patch}   POST /api/owed/offer {offer}: not one to split   POST /api/owed/person {key, match}   POST /api/owed/note {k, text}
//   POST /api/owed/tasks {id, map}   GET /api/owed/export.csv   POST /api/owed/undo {undo}
//
// Every change answers with `rebuilt: true` when the analysis had to be built again (matched money leaves income).
// The log gets counts only, never names, amounts or bank wording.

import { HttpError } from '../http.mjs';
import * as O from '../../lib/owed.mjs';
import { readStore as readExpenses, creditsFromAnalysis } from '../../lib/expenses.mjs';
import { setFinanceHooks, financeData, refreshFinanceAnalysis, financeAvailable } from '../../lib/finance.mjs';

export default function register(app) {
  const { dataDir, log, getConfig, store } = app.ctx;
  const home = () => { const c = typeof getConfig === 'function' ? getConfig() || {} : {}; return /^[A-Z]{3}$/.test(c.currency || '') ? c.currency : 'GBP'; };
  const todayOf = (c) => (c.clockNow ? c.clockNow().today : new Date().toISOString().slice(0, 10));
  const read = () => O.readStore(dataDir, { home: home() });
  const post = (path, fn, maxBody) => app.route({ path: '/api/owed/' + path, method: 'POST', methodError: 'POST only', maxBody: maxBody || 128 * 1024, handler: async (c) => fn(c, await c.body()) });
  const refs = (b) => (Array.isArray(b && b.refs) ? b.refs.slice(0, 300) : []);

  // The pipeline asks for this on every rebuild: an update, a change of ticks, or ensureNet below.
  setFinanceHooks({ owedNet: async () => O.netPlan(await read()) });

  const analysisNow = async () => {
    try { const d = await financeData(); return d && d.status === 'ok' ? d : null; } catch { return null; }
  };
  /** Build the analysis again if what is matched changed since it was built. A computer showing another's finances leaves that to the other. */
  async function ensureNet(d) {
    if (!d || !financeAvailable() || (d.meta && d.meta.remote)) return false;
    const sig = O.netPlan(await read()).sig;
    const was = (d.analysis.owed_net && d.analysis.owed_net.sig) || '';
    if (sig === was) return false;
    const r = await refreshFinanceAnalysis().catch(() => null);
    return !!(r && r.ok);
  }
  const statePeople = async () => { try { const s = await store.readObject(); return Array.isArray(s && s.people) ? s.people : []; } catch { return []; } };
  /** What Expenses has already used: a payment is only used once. */
  const takenByExpenses = async () => { const X = await readExpenses(dataDir, { home: home() }); const s = new Set(); for (const e of Object.values(X.items)) { if (e.paidTxKey) s.add(e.paidTxKey); if (e.source && e.source.k) s.add(e.source.k); if (e.source && e.source.txKey) s.add(e.source.txKey); } return s; };

  async function suggestions(c, S, d) {
    if (!d) return [];
    const today = todayOf(c);
    return O.findMatches(S, creditsFromAnalysis(d.analysis, { today, days: 365 }), { debits: O.debitsFromAnalysis(d.analysis, { today, days: 365 }), today, aliases: O.aliasMap(S, await statePeople()), skip: await takenByExpenses() });
  }
  /** After a change: the analysis, the new suggestions and the view, in one answer. */
  const done = async (c, r, extra = {}) => {
    if (r && r.error) throw new HttpError(r.status || (r.duplicate ? 409 : 400), r.error);
    let d = await analysisNow();
    const rebuilt = await ensureNet(d);
    if (rebuilt) d = await analysisNow();
    const S = r && r.S ? r.S : await read();
    const sugg = await suggestions(c, S, d);
    return { ok: true, ...(r && r.undo ? { undo: r.undo } : {}), ...(rebuilt ? { rebuilt: true } : {}), ...extra, suggestions: sugg, data: O.publicView(S, todayOf(c), sugg) };
  };

  app.route({ path: '/api/owed', method: 'GET', methodError: 'GET only', quiet: true, handler: async (c) => ({ ok: true, data: O.publicView(await read(), todayOf(c)), today: todayOf(c), currency: home() }) });
  post('scan', async (c) => {
    const today = todayOf(c);
    let d = await analysisNow();
    if (!d) return { ok: true, connected: false, auto: [], suggestions: [], offers: [], leftOut: [], data: O.publicView(await read(), today) };
    let rebuilt = await ensureNet(d);
    if (rebuilt) d = await analysisNow();
    const people = await statePeople();
    const skip = await takenByExpenses();
    const credits = creditsFromAnalysis(d.analysis, { today, days: 365 }), debits = O.debitsFromAnalysis(d.analysis, { today, days: 365 });
    const r = await O.scan(dataDir, credits, { debits, today, aliases: (S) => O.aliasMap(S, people), skip, home: home() });
    if (r.auto.length) { log('info', `owed: ${r.auto.length} payment(s) marked from the bank`); if (await ensureNet(d)) { rebuilt = true; d = await analysisNow(); } }
    const S = await read();
    // Money into an account left out of Your data is not in the analysis at all, so it is never looked at. The page says so.
    let leftOut = [];
    try { const ov = app.ctx.financeDataSvc ? await app.ctx.financeDataSvc.publicOverview() : null; leftOut = ((ov && ov.rows) || []).filter(x => x && x.count > 0 && x.counted === false).map(x => x.name).filter(Boolean).slice(0, 8); } catch { leftOut = []; }
    return { ok: true, connected: true, auto: r.auto, suggestions: r.suggestions, offers: O.findOffers(S, d.analysis, { today, skip }), leftOut, ...(r.undo ? { undo: r.undo } : {}), ...(rebuilt ? { rebuilt: true } : {}), data: O.publicView(S, today, r.suggestions) };
  });
  post('create', async (c, b) => {
    const r = await O.createThing(dataDir, b && b.thing, { today: todayOf(c), home: home() });
    if (!r.error) log('info', 'owed: one added');
    return done(c, r, { id: r.id, thing: r.thing });
  });
  post('create-batch', async (c, b) => { const r = await O.createThings(dataDir, b && b.things, { today: todayOf(c), home: home() }); return done(c, r, { ids: r.ids, skipped: r.skipped }); }, 512 * 1024);
  post('update', async (c, b) => { const r = await O.updateThing(dataDir, String(b && b.id || ''), b && b.thing, { today: todayOf(c), home: home() }); return done(c, r, { thing: r.thing }); });
  post('delete', async (c, b) => { const r = await O.deleteThings(dataDir, b && b.ids, { home: home() }); return done(c, r, { removed: r.removed }); });
  post('paid', async (c, b) => { const r = await O.markPaid(dataDir, refs(b), { date: b && b.date, today: todayOf(c), home: home() }); return done(c, r, { changed: r.changed }); });
  post('unpaid', async (c, b) => { const r = await O.markUnpaid(dataDir, refs(b), { home: home() }); return done(c, r, { changed: r.changed }); });
  post('write-off', async (c, b) => { const r = await O.writeOff(dataDir, refs(b), { today: todayOf(c), home: home() }); return done(c, r, { changed: r.changed }); });
  post('reminded', async (c, b) => { const r = await O.noteReminded(dataDir, refs(b), { today: todayOf(c), home: home() }); return done(c, r); });
  post('settle', async (c, b) => { const r = await O.settlePerson(dataDir, String(b && b.key || ''), { today: todayOf(c), home: home() }); return done(c, r, { changed: r.changed }); });
  post('answer', async (c, b) => {
    const r = await O.answer(dataDir, b && b.suggestion, !!(b && b.yes === true), { pick: b && typeof b.pick === 'string' ? b.pick : '', home: home() });
    if (!r.error && b.yes === true) log('info', 'owed: a payment confirmed');
    return done(c, r, { over: r.over });
  });
  post('assign', async (c, b) => {
    const r = await O.assignTx(dataDir, b && b.tx, b && b.allocs, { payer: b && b.payer, rest: b && b.rest, replace: !!(b && b.replace), home: home() });
    return done(c, r, { over: r.over });
  });
  post('unassign', async (c, b) => { const r = await O.unassignTx(dataDir, b && b.tx, { home: home() }); return done(c, r, { changed: r.changed }); });
  post('link', async (c, b) => done(c, await O.linkPayment(dataDir, String(b && b.id || ''), b && b.tx, { home: home() })));
  post('unlink', async (c, b) => done(c, await O.unlinkPayment(dataDir, String(b && b.id || ''), { home: home() })));
  post('pick-info', async (c, b) => {
    const S = await read(); const tx = (b && b.tx) || {};
    return { ok: true, payer: O.guessPayer(S, `${tx.memo || ''} ${tx.merchant || ''}`, O.aliasMap(S, await statePeople())) };
  });
  post('recent', async (c, b) => {
    const d = await analysisNow();
    if (!d) return { ok: true, rows: [], connected: false };
    const today = todayOf(c), out = b && b.dir === 'out';
    const S = await read(); const taken = O.usedKeys(S); for (const x of await takenByExpenses()) taken.add(x);
    for (const t of Object.values(S.things)) { if (t.source.k) taken.add(t.source.k); }
    const list = out ? O.debitsFromAnalysis(d.analysis, { today, days: 90 }) : creditsFromAnalysis(d.analysis, { today, days: 180 });
    return { ok: true, connected: true, rows: list.filter(x => !taken.has(x.k) && !taken.has(x.txKey)).slice(0, 60).map(x => ({ k: x.k, txKey: x.txKey, date: x.date, amount: x.amount, memo: x.memo, merchant: x.merchant, dir: out ? 'out' : 'in' })) };
  });
  post('proposal', async (c, b) => { const r = await O.answerProposal(dataDir, String(b && b.id || ''), !!(b && b.yes === true), { today: todayOf(c), home: home() }); return done(c, r); });
  post('prefs', async (c, b) => done(c, await O.setPrefs(dataDir, b && b.patch, { home: home() })));
  post('offer', async (c, b) => done(c, await O.dismissOffer(dataDir, b && b.offer, { home: home() })));
  post('note', async (c, b) => done(c, await O.setNote(dataDir, String(b && b.k || ''), String(b && b.text || ''), { home: home() })));
  post('person', async (c, b) => done(c, await O.setPersonWords(dataDir, String(b && b.key || ''), b && b.match, { home: home() })));
  post('tasks', async (c, b) => done(c, await O.setTaskIds(dataDir, String(b && b.id || ''), b && b.map, { home: home() })));
  post('undo', async (c, b) => {
    const r = await O.undoChange(dataDir, String(b && b.undo || ''), { home: home() });
    if (!r.ok) throw new HttpError(409, r.error);
    return done(c, { S: r.S }, { label: r.label });
  });
  post('find-payment', async (c, b) => {
    const d = await analysisNow(); const A = Number(b && b.amount);
    if (!d || !(A > 0)) return { ok: true, rows: [] };
    const S = await read(); const have = new Set();
    for (const t of Object.values(S.things)) if (t.source.k) have.add(t.source.k);
    const rows = O.debitsFromAnalysis(d.analysis, { today: todayOf(c), days: 90 }).filter(x => Math.abs(x.amount - A) < 0.005 && !have.has(x.k)).slice(0, 3).map(x => ({ k: x.k, txKey: x.txKey, date: x.date, amount: x.amount, merchant: x.merchant }));
    return { ok: true, rows };
  });
  app.route({ path: '/api/owed/export.csv', method: 'GET', methodError: 'GET only', quiet: true, handler: async (c) => {
    c.send(200, '﻿' + O.owedCsv(O.publicView(await read(), todayOf(c))), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="owed-to-me.csv"', 'Cache-Control': 'no-store' });
    return undefined;
  } });
  app.route({ prefix: '/api/owed/', method: '*', handler: (c) => c.json(404, { error: 'unknown route' }) });
}
