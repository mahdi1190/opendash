// server/routes/owed.mjs - Owed to me (lib/owed.mjs). Private: the only thing here that reaches anyone is /share and what follows from it,
// one person's own part to that person, on a press (lib/owed-friends.mjs).
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
//   POST /api/owed/regulars {} -> {rows}: the regular payments the bank shows, to follow
//   POST /api/owed/repeat/save {repeat}   POST /api/owed/repeat/remove {id}   POST /api/owed/repeat/pause {id, paused}   POST /api/owed/nudge-later {refs}
//   POST /api/owed/share {id, key, friend, what?} -> {ref, sent, queued}: the owner pressed Send   POST /api/owed/share/stop {ref}
//   POST /api/owed/inbox/paid {from, ref, on}: "I've paid" on what a friend shared   POST /api/owed/inbox/hide {from, ref}
//   POST /api/owed/group {name, keys}: a group, from a note on the page
//   POST /api/owed/receipt/read {name, data} -> {token, receipt, checks}: Claude, only on the button; nothing saved, the file is held until confirmed
//   POST /api/owed/receipt/cancel {token}   POST /api/owed/create takes receiptToken to keep the file with the split
//   /scan also splits what has left the bank for a repeating split (made, madeUndo), and follows the money plan's "Split with" (planAdded).
//
// Every change answers with `rebuilt: true` when the analysis had to be built again (matched money leaves income).
// The log gets counts only, never names, amounts or bank wording.

import { HttpError } from '../http.mjs';
import * as O from '../../lib/owed.mjs';
import { readStore as readExpenses, creditsFromAnalysis, sniffReceipt, storeReceiptFile } from '../../lib/expenses.mjs';
import { readReceiptFile, checkReceipt } from '../../lib/owed-receipt.mjs';
import { randomBytes } from 'node:crypto';
import { runClaude } from '../../lib/claude-runner.mjs';
import { todayIn } from '../../lib/finance/glance.mjs';
import { setFinanceHooks, financeData, refreshFinanceAnalysis, financeAvailable, getPlan, setPlan } from '../../lib/finance.mjs';
import { cleanPlan, planView } from '../../lib/finance/money-plan.mjs';
import { createOwedFriends } from '../../lib/owed-friends.mjs';   // loaded here so its friends kinds are defined before the engine starts

export default function register(app) {
  const { dataDir, log, getConfig, store } = app.ctx;
  const home = () => { const c = typeof getConfig === 'function' ? getConfig() || {} : {}; return /^[A-Z]{3}$/.test(c.currency || '') ? c.currency : 'GBP'; };
  const todayOf = (c) => (c.clockNow ? c.clockNow().today : new Date().toISOString().slice(0, 10));
  const read = () => O.readStore(dataDir, { home: home() });
  const post = (path, fn, maxBody) => app.route({ path: '/api/owed/' + path, method: 'POST', methodError: 'POST only', maxBody: maxBody || 128 * 1024, handler: async (c) => fn(c, await c.body()) });
  const refs = (b) => (Array.isArray(b && b.refs) ? b.refs.slice(0, 300) : []);
  const shared = createOwedFriends({
    dataDir, home, log,
    friends: () => app.ctx.friends,
    today: () => { const cfg = typeof getConfig === 'function' ? getConfig() || {} : {}; return todayIn(cfg.timezone); },
  });
  app.onReady(async () => { shared.attach(); });

  // The pipeline asks for this on every rebuild: an update, a change of ticks, or ensureNet below.
  const netNow = async () => O.netPlanAll(await read(), await readExpenses(dataDir, { home: home() }).catch(() => null), home());
  setFinanceHooks({ owedNet: netNow });

  const analysisNow = async () => {
    try { const d = await financeData(); return d && d.status === 'ok' ? d : null; } catch { return null; }
  };
  /** Build the analysis again if what is matched changed since it was built. A computer showing another's finances leaves that to the other. */
  async function ensureNet(d) {
    if (!d || !financeAvailable() || (d.meta && d.meta.remote)) return false;
    const sig = (await netNow()).sig;
    const was = (d.analysis.owed_net && d.analysis.owed_net.sig) || '';
    if (sig === was) return false;
    const r = await refreshFinanceAnalysis().catch(() => null);
    return !!(r && r.ok);
  }
  /** A pending payment that settled at another amount, or never settled, with something attached (lib/owed.mjs pendingNotices). */
  const notices = async (S, d) => (d ? O.pendingNotices(S, await readExpenses(dataDir, { home: home() }).catch(() => null), d.analysis) : []);
  const statePeople = async () => { try { const s = await store.readObject(); return Array.isArray(s && s.people) ? s.people : []; } catch { return []; } };
  /** What Expenses has already used: a payment is only used once. */
  const takenByExpenses = async () => { const X = await readExpenses(dataDir, { home: home() }); const s = new Set(); for (const e of Object.values(X.items)) { if (e.paidTxKey) s.add(e.paidTxKey); if (e.source && e.source.k) s.add(e.source.k); if (e.source && e.source.txKey) s.add(e.source.txKey); } return s; };

  /** The money plan's rows with a "Split with" (or none): only worked out when the plan names someone. */
  async function planRows(d, today) {
    try {
      const plan = cleanPlan((await getPlan()).plan);
      const items = plan.items.filter(i => i.splitWith);
      if (!items.length) return [];
      const cfg = (typeof getConfig === 'function' && getConfig()) || {};
      const v = planView(plan, d ? d.analysis : null, { today, currency: home(), locale: cfg.locale });
      const rows = v.rows || {};
      const regular = new Map((d && Array.isArray(d.analysis.recurring) ? d.analysis.recurring : []).map(x => [x && x.merchant, x]));
      return items.map(i => {
        const r = rows[i.id] || {};
        const varies = !!(i.type && /electricity|gas/.test(i.type));
        // The plan's own guess at the payment counts only when it is about the planned amount; else the date is the surer thing.
        let link = r.link || i.link || null;
        if (link && link.by === 'guess' && !varies && i.amount > 0) { const g = regular.get(link.m); if (!g || Math.abs(g.last_amount - i.amount) > i.amount * 0.3) link = null; }
        return { id: i.id, name: r.name || i.name, state: r.state, splitWith: i.splitWith, varies, starts: i.starts, ends: i.ends, status: i.status, paused: i.paused, amount: i.amount, rule: i.when || r.rule || null, link };
      });
    } catch { return []; }
  }
  /** Rent and bills: follow the plan, then split what has left the bank. A computer showing another's finances leaves that to the other. */
  async function runRepeats(today, d) {
    if (d && d.meta && d.meta.remote) return { made: [], planAdded: [] };
    const sync = await O.syncPlanRepeats(dataDir, await planRows(d, today), { today, home: home() });
    const r = await O.runRepeats(dataDir, d ? O.debitsFromAnalysis(d.analysis, { today, days: 365 }) : [], { today, home: home(), skip: await takenByExpenses() });
    if (r.made.length) log('info', `owed: ${r.made.length} repeating split(s) made`);
    return { made: r.made, madeUndo: r.undo, planAdded: sync.added };
  }
  /** Who is on a plan's repeat was changed here: the plan's "Split with" says the same. */
  async function namesBackToPlan(S, repeat) {
    if (!S || !repeat || !repeat.planItem) return;
    try {
      const plan = cleanPlan((await getPlan()).plan);
      const it = plan.items.find(i => i.id === repeat.planItem);
      if (!it) return;
      const names = repeat.people.map(p => (S.people[p.key] && S.people[p.key].name) || p.key).join(', ').slice(0, 120);
      if (it.splitWith !== names) { it.splitWith = names; await setPlan(plan); }
    } catch { /* the plan catches up the next time it is changed */ }
  }
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
    return { ok: true, ...(r && r.undo ? { undo: r.undo } : {}), ...(rebuilt ? { rebuilt: true } : {}), ...extra, suggestions: sugg, notices: await notices(S, d), data: O.publicView(S, todayOf(c), sugg) };
  };

  app.route({ path: '/api/owed', method: 'GET', methodError: 'GET only', quiet: true, handler: async (c) => ({ ok: true, data: O.publicView(await read(), todayOf(c)), today: todayOf(c), currency: home() }) });
  post('scan', async (c) => {
    const today = todayOf(c);
    let d = await analysisNow();
    const rep = await runRepeats(today, d).catch(() => ({ made: [], planAdded: [] }));
    const repOut = { made: rep.made, ...(rep.madeUndo ? { madeUndo: rep.madeUndo } : {}), planAdded: rep.planAdded };
    if (!d) return { ok: true, connected: false, auto: [], suggestions: [], offers: [], leftOut: [], ...repOut, data: O.publicView(await read(), today) };
    let rebuilt = await ensureNet(d);
    if (rebuilt) d = await analysisNow();
    const people = await statePeople();
    const skip = await takenByExpenses();
    const credits = creditsFromAnalysis(d.analysis, { today, days: 365 }), debits = O.debitsFromAnalysis(d.analysis, { today, days: 365 });
    const r = await O.scan(dataDir, credits, { debits, today, aliases: (S) => O.aliasMap(S, people), skip, home: home() });
    if (r.auto.length || r.linked) { log('info', `owed: ${r.auto.length + (r.linked || 0)} payment(s) marked from the bank`); if (await ensureNet(d)) { rebuilt = true; d = await analysisNow(); } }
    const S = await read();
    // Money into an account left out of Your data is not in the analysis at all, so it is never looked at. The page says so.
    let leftOut = [];
    try { const ov = app.ctx.financeDataSvc ? await app.ctx.financeDataSvc.publicOverview() : null; leftOut = ((ov && ov.rows) || []).filter(x => x && x.count > 0 && x.counted === false).map(x => x.name).filter(Boolean).slice(0, 8); } catch { leftOut = []; }
    return { ok: true, connected: true, auto: r.auto, suggestions: r.suggestions, notices: await notices(S, d), offers: O.findOffers(S, d.analysis, { today, skip }), leftOut, ...repOut, ...(r.undo ? { undo: r.undo } : {}), ...(rebuilt ? { rebuilt: true } : {}), data: O.publicView(S, today, r.suggestions) };
  });
  post('create', async (c, b) => {
    // A receipt that was read and is to be kept: the file goes in with the Expenses receipts, on this computer and your own devices.
    const held = b && typeof b.receiptToken === 'string' && b.receiptToken ? receipts.get(b.receiptToken) : null;
    let thing = b && b.thing;
    if (held && thing && typeof thing === 'object') {
      const kept = await storeReceiptFile(dataDir, { data: held.buf.toString('base64') }).catch(() => null);
      if (kept && kept.ref) { thing = { ...thing, receiptRef: kept.ref }; try { const bl = app.ctx.sync && app.ctx.sync.blobs; if (bl) bl.noteLocal(); } catch { /* sync is optional */ } }
    }
    const r = await O.createThing(dataDir, thing, { today: todayOf(c), home: home() });
    if (!r.error) { log('info', 'owed: one added'); if (held) receipts.delete(b.receiptToken); }
    return done(c, r, { id: r.id, thing: r.thing });
  });
  /* Reading a receipt: only on the button, one file, nothing saved until the person says yes. The log gets no names or amounts. */
  const receipts = new Map();   // token -> {buf, at}: read and waiting for Yes
  const RECEIPT_MAX = 8 * 1024 * 1024;
  const claudeFail = (e) => {
    if (e && e.code === 'CANCELLED') return new HttpError(499, 'Cancelled.');
    if (e && (e.code === 'NOT_FOUND' || e.code === 'TOOL_MISSING')) return new HttpError(503, 'Claude is not set up on this computer. You can type the items in yourself instead.', { code: e.code });
    if (e && e.code === 'NOT_LOGGED_IN') return new HttpError(503, 'Claude is not signed in. Sign in under Connections, or type the items in yourself.', { code: e.code });
    if (e && e.code === 'TIMEOUT') return new HttpError(504, 'Claude took too long. Try again, or type the items in yourself.', { code: e.code });
    return new HttpError(502, 'Claude could not read that just now. Try again, or type the items in yourself.', { code: (e && e.code) || 'CLI_FAILED' });
  };
  post('receipt/read', async (c, b) => {
    let s = typeof (b && b.data) === 'string' ? b.data : ''; const m = /^data:[^;,]*;base64,/.exec(s); if (m) s = s.slice(m[0].length);
    const buf = Buffer.from(s, 'base64');
    if (!buf.length || buf.length > RECEIPT_MAX) throw new HttpError(413, 'That file is too big (8 MB at most) or could not be read.');
    const ext = sniffReceipt(buf);
    if (!ext) throw new HttpError(415, 'A receipt can be a PDF or a picture (PNG, JPEG, WebP or GIF).');
    const ac = new AbortController(); let over = false;
    c.res.on('close', () => { if (!over) ac.abort(); });
    let receipt;
    try { receipt = await readReceiptFile({ buf, ext, run: runClaude, signal: ac.signal, model: b && b.model }); }
    catch (e) { throw claudeFail(e); } finally { over = true; }
    if (!receipt.readable) throw new HttpError(422, 'This does not look like a receipt, or it could not be read. Try a clearer picture, or type the items in yourself.');
    const token = randomBytes(8).toString('hex');
    receipts.set(token, { buf, at: Date.now() });
    for (const [k, v] of receipts) if (Date.now() - v.at > 3600e3) receipts.delete(k);
    log('info', `owed: receipt read, ${receipt.items.length} items`);
    return { ok: true, token, receipt, checks: checkReceipt(receipt) };
  }, Math.ceil(RECEIPT_MAX * 4 / 3) + 4096);
  post('receipt/cancel', async (c, b) => { receipts.delete(String(b && b.token || '')); return { ok: true }; }, 1024);
  post('create-batch', async (c, b) => { const r = await O.createThings(dataDir, b && b.things, { today: todayOf(c), home: home() }); return done(c, r, { ids: r.ids, skipped: r.skipped }); }, 512 * 1024);
  post('update', async (c, b) => { const r = await O.updateThing(dataDir, String(b && b.id || ''), b && b.thing, { today: todayOf(c), home: home() }); return done(c, r, { thing: r.thing }); });
  // A press that settles or deletes something shared: the friend's card says so (never the scan's automatic marks).
  const settled = (r) => { if (r && !r.error) shared.closeSettled().catch(() => {}); return r; };
  post('delete', async (c, b) => { const r = settled(await O.deleteThings(dataDir, b && b.ids, { home: home() })); return done(c, r, { removed: r.removed }); });
  post('paid', async (c, b) => { const r = settled(await O.markPaid(dataDir, refs(b), { date: b && b.date, today: todayOf(c), home: home() })); return done(c, r, { changed: r.changed }); });
  post('unpaid', async (c, b) => { const r = await O.markUnpaid(dataDir, refs(b), { home: home() }); return done(c, r, { changed: r.changed }); });
  post('write-off', async (c, b) => { const r = settled(await O.writeOff(dataDir, refs(b), { today: todayOf(c), home: home() })); return done(c, r, { changed: r.changed }); });
  post('reminded', async (c, b) => { const r = await O.noteReminded(dataDir, refs(b), { today: todayOf(c), home: home() }); return done(c, r); });
  post('settle', async (c, b) => { const r = settled(await O.settlePerson(dataDir, String(b && b.key || ''), { today: todayOf(c), home: home() })); return done(c, r, { changed: r.changed }); });
  post('answer', async (c, b) => {
    const r = settled(await O.answer(dataDir, b && b.suggestion, !!(b && b.yes === true), { pick: b && typeof b.pick === 'string' ? b.pick : '', home: home() }));
    if (!r.error && b.yes === true) log('info', 'owed: a payment confirmed');
    return done(c, r, { over: r.over });
  });
  post('assign', async (c, b) => {
    const r = settled(await O.assignTx(dataDir, b && b.tx, b && b.allocs, { payer: b && b.payer, rest: b && b.rest, replace: !!(b && b.replace), home: home() }));
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
    return { ok: true, connected: true, rows: list.filter(x => !taken.has(x.k) && !taken.has(x.txKey)).slice(0, 60).map(x => ({ k: x.k, txKey: x.txKey, date: x.date, amount: x.amount, memo: x.memo, merchant: x.merchant, dir: out ? 'out' : 'in', ...(x.pe ? { pe: 1 } : {}) })) };
  });
  post('proposal', async (c, b) => { const r = settled(await O.answerProposal(dataDir, String(b && b.id || ''), !!(b && b.yes === true), { today: todayOf(c), home: home() })); return done(c, r); });
  post('prefs', async (c, b) => {
    const link = b && b.patch && b.patch.payLink;
    if (typeof link === 'string' && link.trim() && !O.cleanPayLink(link)) throw new HttpError(400, 'That link doesn’t look right. It should start with https://, for example https://monzo.me/yourname.');
    return done(c, await O.setPrefs(dataDir, b && b.patch, { home: home() }));
  });
  post('offer', async (c, b) => done(c, await O.dismissOffer(dataDir, b && b.offer, { home: home() })));
  post('said', async (c, b) => done(c, await O.saidNotice(dataDir, String(b && b.id || ''), { home: home() })), 1024);
  post('retotal', async (c, b) => { const r = await O.retotalThing(dataDir, String(b && b.id || ''), Number(b && b.total), { home: home(), today: todayOf(c) }); return done(c, r, { thing: r.thing }); }, 1024);
  post('group', async (c, b) => done(c, await O.saveGroup(dataDir, { name: b && b.name, keys: b && b.keys }, { today: todayOf(c), home: home() })));
  post('note', async (c, b) => done(c, await O.setNote(dataDir, String(b && b.k || ''), String(b && b.text || ''), { home: home() })));
  post('person', async (c, b) => done(c, await O.setPersonWords(dataDir, String(b && b.key || ''), b && b.match, { home: home() })));
  post('tasks', async (c, b) => done(c, await O.setTaskIds(dataDir, String(b && b.id || ''), b && b.map, { home: home() })));
  // Sharing with a friend. Each of these is one press on a screen that said what goes; the server builds the message itself.
  post('share', async (c, b) => {
    const r = await shared.share({ id: String(b && b.id || ''), key: String(b && b.key || ''), friend: String(b && b.friend || ''), what: typeof (b && b.what) === 'string' ? b.what : '' });
    if (r.error) throw new HttpError(r.status || 400, r.error);
    return done(c, {}, { ref: r.ref, sent: r.sent, queued: r.queued });
  }, 4096);
  post('share/stop', async (c, b) => {
    const r = await shared.stop(String(b && b.ref || ''));
    if (r.error) throw new HttpError(r.status || 400, r.error);
    return done(c, {});
  }, 1024);
  post('inbox/paid', async (c, b) => {
    const r = await shared.sayPaid({ from: String(b && b.from || ''), ref: String(b && b.ref || ''), on: !(b && b.on === false) });
    if (r.error) throw new HttpError(r.status || 400, r.error);
    return done(c, {}, { queued: r.queued });
  }, 1024);
  post('inbox/hide', async (c, b) => done(c, await shared.hide({ from: String(b && b.from || ''), ref: String(b && b.ref || '') })), 1024);
  post('regulars', async () => {
    const d = await analysisNow();
    if (!d) return { ok: true, connected: false, rows: [] };
    const seen = new Set();
    const rows = (Array.isArray(d.analysis.recurring) ? d.analysis.recurring : []).filter(r => r && r.merchant && !seen.has(r.merchant) && seen.add(r.merchant)).slice(0, 60)
      .map(r => ({ m: r.merchant, amount: r.last_amount, varies: !!r.amount_varies, freq: r.frequency, last: r.last_seen, monthly: r.monthly_cost, cat: r.category }));
    return { ok: true, connected: true, rows };
  });
  post('repeat/save', async (c, b) => {
    const r = await O.saveRepeat(dataDir, b && b.repeat, { today: todayOf(c), home: home() });
    if (!r.error) await namesBackToPlan(r.S, r.repeat);
    return done(c, r, { id: r.id });
  });
  post('repeat/remove', async (c, b) => done(c, await O.removeRepeat(dataDir, String(b && b.id || ''), { home: home() })));
  post('repeat/pause', async (c, b) => done(c, await O.pauseRepeat(dataDir, String(b && b.id || ''), !!(b && b.paused === true), { home: home() })));
  post('nudge-later', async (c, b) => done(c, await O.nudgeLater(dataDir, refs(b), { today: todayOf(c), home: home() })));
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
