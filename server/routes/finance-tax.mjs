// server/routes/finance-tax.mjs - the Tax tab (lib/finance/tax-tab.mjs and friends). Same origin only; hidden for "Somewhere else" by the page.
//
//   GET  /api/finance/tax?year=         -> {doc, plan, view, finder, ids}   (the first look at a new tax year keeps last year's sources)
//   PUT  /api/finance/tax {doc, plan?, year?}  -> the same                 whole-document saves; the page keeps the one before, for Undo
//   GET  /api/finance/tax/summary?year= -> the assistant's read: figures only (get_money part tax)
//   POST /api/finance/tax/saving {amount, year?} -> {saves, keep}           what a cost would save, what to keep of a payment
//   POST /api/finance/tax/change {change, year?} -> {ok, said, undo, ...}   one change through the same checks (the assistant; proposals)
//     with preview:true nothing is saved -> {ok, preview: {income, balance, jobs}}: a form's "if you save" line
//   POST /api/finance/tax/undo {undo}   -> {ok, said}
//   POST /api/finance/tax/ids {kind, value|null}; POST /api/finance/tax/ids/reveal {kind} -> {value}   tap to reveal or copy
//   POST /api/finance/tax/read-text {text} -> {items, notes, hid, found: {utr, nino}} (Claude; only on the button; nothing saved)
//   POST /api/finance/tax/payslip {name, data, year?} -> {token, slip, checks, issues, job}   (Claude; nothing saved, the file is held until confirmed)
//   POST /api/finance/tax/payslip/confirm {token, slip, job, year} -> {said, view...}
//   POST /api/finance/tax/payslip/cancel {token}
//   POST /api/finance/tax/receipt {name, data} -> {ref}
//   POST /api/finance/tax/reminders {year, ids|all} -> {tasks, undo}        real tasks, due a little before each date
//   POST /api/finance/tax/prompt {id, year, action: 'dismiss'|'task', due, title} -> ...
//   GET  /api/finance/tax/pack?year=    -> {pack, steps}; POST /api/finance/tax/pack {year, withIds, compare?} -> writes the folder
//   POST /api/finance/tax/compare {year, total} -> {same, diff, say, tips}
//   GET  /api/finance/tax/doc/<year>/<file> -> a kept payslip or document
//
// The log gets counts and nothing else: never amounts, names, identifiers or text.

import { promises as fsp } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { financeData, getPlan, setPlan, getTaxDoc, setTaxDoc } from '../../lib/finance.mjs';
import { cleanPlan, planMetrics } from '../../lib/finance/money-plan.mjs';
import { MBM } from '../../lib/finance/brief.mjs';
import { cleanTax, taxView, taxSummary, taxLinkFor, rollOver, personFor, taxYears } from '../../lib/finance/tax-tab.mjs';
import { findExpenses, findPayments, findHmrcPayments } from '../../lib/finance/tax-expenses.mjs';
import { returnPack, walkSteps, compareHmrc } from '../../lib/finance/tax-forms.mjs';
import { readPasted, readPayslipFile, checkPayslip, cleanPayslip } from '../../lib/finance/tax-read.mjs';
import { payslipIssues, taskDate, taxYearAfter } from '../../lib/finance/tax-rules.mjs';
import { applyTaxChange, TAX_CHANGE_ACTIONS } from '../../lib/finance/tax-change.mjs';
import { idStatus, setId, clearId, revealId } from '../../lib/tax-ids.mjs';
import { writePack, openFolder } from '../../lib/tax-pack.mjs';
import { storeReceiptFile, sniffReceipt, readStore, txKeyOf } from '../../lib/expenses.mjs';
import { claimSaving, keepOf, taxYearOf, yearData } from '../../lib/finance/uk-tax.mjs';
import { runClaude } from '../../lib/claude-runner.mjs';
import { todayIn } from '../../lib/finance/glance.mjs';
import { atomicWrite } from '../../lib/fsutil.mjs';
import { HttpError } from '../http.mjs';

const PAYSLIP_MAX = 8 * 1024 * 1024;
const FILE_RE = /^[\w.-]{1,80}$/;
const YEAR_RE = /^\d{4}-\d{2}$/;
const b64Of = (v) => { let s = typeof v === 'string' ? v : ''; const m = /^data:[^;,]*;base64,/.exec(s); if (m) s = s.slice(m[0].length); return s; };

export default function register(app) {
  const { log, dataDir } = app.ctx;
  const cfgOf = () => (typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {});
  const opts = () => { const c = cfgOf(); return { today: todayIn(c.timezone), currency: c.currency || 'GBP', locale: c.locale }; };
  const analysis = async () => { const d = await financeData().catch(() => null); return d && d.status === 'ok' ? d.analysis : null; };
  const inputOf = (a, today) => MBM.fromAnalysis(a && typeof a === 'object' ? { ...a, today } : { today, transactions: [] }, {});
  const yearOf = (v, today) => (typeof v === 'string' && YEAR_RE.test(v) ? v : taxYearOf(today).id);
  const undoStore = new Map();
  const held = new Map();   // payslips read and waiting for Yes: token -> {buf, ext, name, at}

  /** Payments someone else is paying back (Expenses): not your cost, so the finder leaves them out. */
  async function reimbursedKeys() {
    try { const S = await readStore(dataDir, { home: opts().currency }); return new Set(Object.values(S.items || {}).map(e => e && e.source && e.source.txKey).filter(Boolean)); } catch { return new Set(); }
  }
  /** The finder's period list: each self-employed period, cut to the tax year. */
  function periodsOf(view) {
    const y = yearData(view.year);
    return view.sources.self.map(s => ({ id: s.id, name: s.name, from: s.from && s.from > y.start ? s.from : y.start, to: s.to && s.to < y.end ? s.to : y.end }));
  }
  async function viewOf(plan, doc, yearArg, a, extra = {}) {
    const o = opts();
    const yearId = yearOf(yearArg, o.today);
    const ids = await idStatus(dataDir).catch(() => ({ utr: { set: false }, nino: { set: false } }));
    const input = inputOf(a, o.today);
    const balances = Array.isArray(input.balances) ? input.balances.filter(b => b && Number.isFinite(+b.balance) && !/credit|loan|mortgage/i.test(String(b.kind || ''))) : [];
    const have = balances.length ? balances.reduce((t, b) => t + +b.balance, 0) + (plan.assets || []).reduce((t, x) => t + (Number(x.amount) || 0), 0) : null;
    let planAside = null;
    try { const m = plan.country ? planMetrics(plan, { today: o.today, currency: o.currency, locale: o.locale }) : null; planAside = m ? m.aside : null; } catch { planAside = null; }
    // First pass: the view, so the finder knows the periods; then the review knows what is unclaimed.
    let view = taxView(plan, doc, a, { today: o.today, year: yearId, currency: o.currency, hasUtr: ids.utr && ids.utr.set, have, planAside, showReview: extra.showReview });
    let finder = null, comeIn = [], hmrc = [];
    if (view.uk) {
      const reimbursed = await reimbursedKeys();
      const { person } = personFor(plan, doc, yearId, o.today);
      const savingFor = (amt) => claimSaving(person, amt);
      const rec = doc.years[yearId] || {};
      const salary = (view.sources.jobs || []).map(j => j.name).filter(Boolean);
      const savingIfCosts = (amt) => claimSaving(person, amt, { ifCosts: true });
      finder = findExpenses(input, periodsOf(view), rec, { savingFor, savingIfCosts, reimbursed, keyOf: txKeyOf, traditional: (doc.prefs || {}).basis === 'traditional' });
      comeIn = findPayments(input, periodsOf(view), rec, { salaryMerchants: salary });
      view = taxView(plan, doc, a, { today: o.today, year: yearId, currency: o.currency, hasUtr: ids.utr && ids.utr.set, have, planAside, unclaimedTotal: finder.total, showReview: extra.showReview });
      const y = yearData(yearId);
      hmrc = findHmrcPayments(input, `${Number(y.end.slice(0, 4)) + 1}-01-01`, `${Number(y.end.slice(0, 4)) + 1}-08-31`);
    }
    return { view, finder, comeIn, hmrc, ids };
  }
  async function loadAll() {
    const o = opts();
    const plan = cleanPlan((await getPlan()).plan);
    const raw = (await getTaxDoc()).doc;
    const r = rollOver(plan, raw, o.today);
    if (r.changed) await setTaxDoc(r.doc).catch(() => {});
    return { plan, doc: r.doc, rolled: r.rolled ? r.from : null };
  }
  async function reply(plan, doc, yearArg, extra = {}) {
    const a = await analysis();
    const v = await viewOf(plan, doc, yearArg, a, extra);
    return { plan, doc, ...v, ...extra.out };
  }
  /** Both saved together, with what the plan needs from here worked out again. */
  async function saveBoth(plan0, doc0) {
    const o = opts();
    const doc = cleanTax(doc0);
    doc.at = new Date().toISOString();
    const plan = cleanPlan(plan0);
    if (plan.country === 'uk') plan.taxLink = taxLinkFor(plan, doc, o.today);
    plan.at = new Date().toISOString();
    await setTaxDoc(doc);
    await setPlan(plan);
    return { plan, doc };
  }
  app.ctx.taxSaveBoth = saveBoth;   // the plan route keeps plan.taxLink fresh with the same call

  const post = (path, fn, maxBody) => app.route({ path: '/api/finance/tax' + path, method: 'POST', methodError: 'POST only', sameOrigin: true, maxBody: maxBody || 128 * 1024, handler: async (c) => fn(c, await c.body()) });

  app.route({ path: '/api/finance/tax', method: 'GET', methodError: 'GET or PUT only', sameOrigin: true, quiet: true, handler: async (c) => { const { plan, doc, rolled } = await loadAll(); return reply(plan, doc, c.query.get('year'), { showReview: c.query.get('review') === '1', out: rolled ? { rolledFrom: rolled } : {} }); } });
  app.route({
    path: '/api/finance/tax', method: 'PUT', methodError: 'GET or PUT only', sameOrigin: true, maxBody: 2 * 1024 * 1024,
    handler: async (c) => {
      const b = await c.body();
      const cur = await loadAll();
      const { plan, doc } = await saveBoth(b.plan && typeof b.plan === 'object' ? b.plan : cur.plan, b.doc && typeof b.doc === 'object' ? b.doc : cur.doc);
      log('info', `tax tab saved: ${Object.keys(doc.years).length} year(s)`);
      return reply(plan, doc, b.year);
    },
  });
  app.route({ path: '/api/finance/tax/summary', method: 'GET', methodError: 'GET only', sameOrigin: true, quiet: true, handler: async (c) => {
    const { plan, doc } = await loadAll();
    const v = await viewOf(plan, doc, c.query.get('year'), await analysis());
    const out = taxSummary(v.view);
    if (out.hasTaxTab) {
      out.expenseFinder = v.finder ? { possible: v.finder.suggestions.slice(0, 25).map(s => ({ tx: s.tx, date: s.date, merchant: s.merchant, amount: s.amount, what: s.what, businessPct: s.pct, confidence: s.confidence, why: s.why, saves: s.saves, savesOnceCostsAreUsed: s.savesIfCosts })), total: v.finder.total, cannotClaim: v.finder.cannot.map(x => ({ what: x.title, why: x.why, total: x.total })) } : null;
      out.yearsAvailable = (v.view.years || taxYears(doc, opts().today)).map(y => ({ id: y.id, label: y.label, state: y.state }));
      out.memory = doc.memory.map(m => ({ id: m.id, text: m.text, date: m.date, source: m.source, open: !!m.open }));
    }
    return out;
  } });
  post('/saving', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const { person } = personFor(plan, doc, yearOf(b.year, o.today), o.today);
    const amt = Math.max(0, Number(b.amount) || 0);
    return { saves: claimSaving(person, amt), keep: keepOf(person, amt) };
  });

  /* ---------- one change, with Undo: the assistant's way in, and the confirmation screens ---------- */
  post('/change', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(b.year, o.today);
    const list = Array.isArray(b.changes) ? b.changes.slice(0, 120) : [b.change];
    let curPlan = plan, curDoc = doc, said = '', last = null;
    for (const ch of list) {
      const r = applyTaxChange(curPlan, curDoc, ch, { today: o.today, year });
      if (r.error) throw new HttpError(r.status || 400, r.error);
      curPlan = r.plan; curDoc = r.doc; said = r.said; last = r;
    }
    if (!last) throw new HttpError(400, 'Nothing to change.');
    // A form's "if you save" line: what this change would do, with nothing saved.
    if (b.preview) {
      const pv = cleanTax(curDoc), pp = cleanPlan(curPlan);
      if (pp.country === 'uk') pp.taxLink = taxLinkFor(pp, pv, o.today);
      const { view } = await viewOf(pp, pv, year, await analysis());
      if (!view.uk) return { ok: true };
      return { ok: true, preview: { income: view.position.income, balance: view.bill.balance, jobs: view.sources.jobs.map(j => ({ id: j.id, pay: j.year ? j.year.pay : null })) } };
    }
    if (list.length > 1) said = b.say ? String(b.say).slice(0, 120) : `Saved ${list.length} changes`;
    const undo = 'tax-' + randomBytes(6).toString('hex');
    undoStore.set(undo, { plan, doc, said, at: Date.now() });
    if (undoStore.size > 40) undoStore.delete(undoStore.keys().next().value);
    const saved = await saveBoth(curPlan, curDoc);
    log('info', `tax change: ${list.length}`);
    return { ok: true, said, undo, id: last.id || null, ...(b.brief ? {} : await reply(saved.plan, saved.doc, year)) };
  }, 256 * 1024);
  post('/undo', async (c, b) => {
    const e = undoStore.get(String(b && b.undo || ''));
    if (!e) throw new HttpError(409, 'That is too old to undo here. You can change it on the Tax tab.');
    undoStore.delete(String(b.undo));
    const saved = await saveBoth(e.plan, e.doc);
    return { ok: true, said: `Undone: ${e.said}`, ...(b.brief ? {} : await reply(saved.plan, saved.doc, b.year)) };
  });
  app.route({ path: '/api/finance/tax/actions', method: 'GET', methodError: 'GET only', sameOrigin: true, quiet: true, handler: () => ({ actions: TAX_CHANGE_ACTIONS }) });

  /* ---------- identifiers: masked unless a tap asks ---------- */
  post('/ids', async (c, b) => {
    const kind = String(b && b.kind || '');
    const r = b && (b.value === null || b.value === '') ? await clearId(dataDir, kind) : await setId(dataDir, kind, b && b.value);
    if (r.error) throw new HttpError(r.status || 400, r.error);
    return { ok: true, ids: await idStatus(dataDir) };
  }, 2048);
  post('/ids/reveal', async (c, b) => {
    const v = await revealId(dataDir, String(b && b.kind || ''));
    if (!v) throw new HttpError(404, 'Nothing is saved yet.');
    return { value: v };
  }, 1024);

  /* ---------- Claude, only on the button ---------- */
  const claudeFail = (e) => {
    if (e && e.code === 'CANCELLED') return new HttpError(499, 'Cancelled.');
    if (e && (e.code === 'NOT_FOUND' || e.code === 'TOOL_MISSING')) return new HttpError(503, 'Claude is not set up on this computer. You can fill in the forms below instead.', { code: e.code });
    if (e && e.code === 'NOT_LOGGED_IN') return new HttpError(503, 'Claude is not signed in. Sign in under Connections, or fill in the forms below.', { code: e.code });
    if (e && e.code === 'TIMEOUT') return new HttpError(504, 'Claude took too long. Try again, or fill in the forms below.', { code: e.code });
    return new HttpError(502, 'Claude could not read that just now. Try again, or fill in the forms below.', { code: (e && e.code) || 'CLI_FAILED' });
  };
  const abortOn = (c) => { const ac = new AbortController(); const res = c.res; let done = false; res.on('close', () => { if (!done) ac.abort(); }); return { ac, finish: () => { done = true; } }; };
  post('/read-text', async (c, b) => {
    const text = typeof (b && b.text) === 'string' ? b.text : '';
    if (!text.trim()) throw new HttpError(400, 'Type or paste something first.');
    const { ac, finish } = abortOn(c);
    try { const out = await readPasted({ text, run: runClaude, signal: ac.signal, model: b.model }); log('info', `tax paste read: ${out.items.length} items`); return out; }
    catch (e) { throw claudeFail(e); } finally { finish(); }
  }, 64 * 1024);
  post('/payslip', async (c, b) => {
    const buf = Buffer.from(b64Of(b && b.data), 'base64');
    if (!buf.length || buf.length > PAYSLIP_MAX) throw new HttpError(413, 'That file is too big (8 MB at most) or could not be read.');
    const ext = sniffReceipt(buf);
    if (!ext) throw new HttpError(415, 'A payslip can be a PDF or a picture (PNG, JPEG, WebP or GIF).');
    const { ac, finish } = abortOn(c);
    let slip;
    try { slip = await readPayslipFile({ buf, ext, run: runClaude, signal: ac.signal, model: b.model }); }
    catch (e) { throw claudeFail(e); } finally { finish(); }
    if (!slip.readable) throw new HttpError(422, 'This does not look like a UK payslip, or it could not be read. Try a clearer copy.');
    const token = randomBytes(8).toString('hex');
    held.set(token, { buf, ext, at: Date.now() });
    for (const [k, v] of held) if (Date.now() - v.at > 3600e3) held.delete(k);
    log('info', 'tax payslip read');
    return { token, ...(await describePayslip(slip, b.year)) };
  }, Math.ceil(PAYSLIP_MAX * 4 / 3) + 4096);
  /** The confirmation card: arithmetic, against the engine, against the bank. */
  async function describePayslip(slip, yearArg) {
    const { plan, doc } = await loadAll();
    const o = opts();
    const yearId = slip.payDate ? taxYearOf(slip.payDate).id : yearOf(yearArg, o.today);
    const { person } = personFor(plan, doc, yearId, o.today);
    const a = await analysis();
    const v = taxView(plan, doc, a, { today: o.today, year: yearId, currency: o.currency });
    const jobs = (v.sources && v.sources.jobs) || [];
    const low = String(slip.employer || '').toLowerCase();
    const job = jobs.find(j => low && (String(j.name).toLowerCase().includes(low) || low.includes(String(j.name).toLowerCase()))) || (jobs.length === 1 ? jobs[0] : null);
    const rec = doc.years[yearId] || {};
    const prev = job ? (rec.payslips || []).filter(p => p.job === job.id).sort((x, y) => String(y.payDate).localeCompare(String(x.payDate)))[0] : null;
    let expected = null;
    if (job && job.typical) expected = job.typical;
    const input = inputOf(a, o.today);
    let bankCredit = 0;
    if (slip.payDate && slip.net) {
      const d = Math.round(Date.parse(slip.payDate + 'T00:00:00Z') / 864e5);
      const hit = input.tx.find(t => t.kind === 'income' && Math.abs(t.n - d) <= 3 && Math.abs(t.inc - slip.net) <= Math.max(25, slip.net * 0.1));
      if (hit) bankCredit = hit.inc;
    }
    const checks = checkPayslip(slip, prev ? { ytdPay: prev.gross != null && prev.ytdPay != null ? prev.ytdPay : null } : null);
    const issues = payslipIssues(slip, expected, { loans: person.loans, codeExpected: job ? job.codeText : null, bankCredit, jobName: job ? job.name : null, region: person.region });
    return { slip, checks, issues, job: job ? { id: job.id, name: job.name } : null, jobs: jobs.map(j => ({ id: j.id, name: j.name })), year: yearId, yearLabel: yearData(yearId).label, sentNote: 'The whole file went to Claude for reading, including anything printed on it such as your name and National Insurance number. Nothing is kept there by Freeflo.' };
  }
  post('/payslip/check', async (c, b) => {
    const slip = cleanPayslip(b && b.slipRaw ? b.slipRaw : {});
    return describePayslip(slip, b && b.year);
  }, 16 * 1024);
  post('/payslip/cancel', async (c, b) => { held.delete(String(b && b.token || '')); return { ok: true }; }, 1024);
  post('/payslip/confirm', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const s = b && b.slip && typeof b.slip === 'object' ? b.slip : {};
    const r = applyTaxChange(plan, doc, { action: 'payslip.add', slip: { ...s, usual: b.usual !== false }, job: b.job, newJobName: b.newJobName }, { today: o.today, year: yearOf(b.year, o.today) });
    if (r.error) throw new HttpError(r.status || 400, r.error);
    // The file: kept on this computer against the tax year.
    const h = held.get(String(b.token || ''));
    if (h && r.payslip) {
      const name = `ps-${createHash('sha256').update(h.buf).digest('hex').slice(0, 16)}.${h.ext}`;
      const dir = join(docsDir(), r.year);
      await fsp.mkdir(dir, { recursive: true });
      await atomicWrite(join(dir, name), h.buf, { encoding: null, mode: 0o600 });
      r.payslip.file = name;
      r.doc.years[r.year].docs = [...(r.doc.years[r.year].docs || []), { id: 'doc-' + randomBytes(5).toString('hex'), kind: 'payslip', name: `Payslip ${r.payslip.payDate || ''}`.trim(), file: name, at: o.today }];
      held.delete(String(b.token));
    }
    const undo = 'tax-' + randomBytes(6).toString('hex');
    undoStore.set(undo, { plan, doc, said: r.said, at: Date.now() });
    const saved = await saveBoth(r.plan, r.doc);
    log('info', 'tax payslip saved');
    return { ok: true, said: r.said, undo, ...(await reply(saved.plan, saved.doc, r.year)) };
  }, 32 * 1024);
  const docsDir = () => join(dataDir, 'tax-documents');
  post('/receipt', async (c, b) => {
    const r = await storeReceiptFile(dataDir, { data: b && b.data });
    if (r.error) throw new HttpError(r.status || 400, r.error);
    try { const bl = app.ctx.sync && app.ctx.sync.blobs; if (bl) bl.noteLocal(); } catch { /* sync is optional */ }
    return { ref: r.ref };
  }, 8 * 1024 * 1024);
  post('/document', async (c, b) => {
    const buf = Buffer.from(b64Of(b && b.data), 'base64');
    if (!buf.length || buf.length > PAYSLIP_MAX) throw new HttpError(413, 'That file is too big (8 MB at most) or could not be read.');
    const ext = sniffReceipt(buf);
    if (!ext) throw new HttpError(415, 'Use a PDF or a picture (PNG, JPEG, WebP or GIF).');
    const { plan, doc } = await loadAll();
    const year = yearOf(b.year, opts().today);
    const name = `dc-${createHash('sha256').update(buf).digest('hex').slice(0, 16)}.${ext}`;
    const dir = join(docsDir(), year);
    await fsp.mkdir(dir, { recursive: true });
    await atomicWrite(join(dir, name), buf, { encoding: null, mode: 0o600 });
    const rec = doc.years[year] = doc.years[year] || {};
    rec.docs = [...(rec.docs || []), { id: 'doc-' + randomBytes(5).toString('hex'), kind: String(b.kind || 'other'), name: String(b.name || 'A document').slice(0, 80), file: name, at: opts().today }];
    const saved = await saveBoth(plan, doc);
    return { ok: true, ...(await reply(saved.plan, saved.doc, year)) };
  }, Math.ceil(PAYSLIP_MAX * 4 / 3) + 4096);
  app.route({
    prefix: '/api/finance/tax/doc/', method: 'GET', methodError: 'GET only', sameOrigin: true, quiet: true,
    handler: async (c) => {
      let parts; try { parts = c.path.slice('/api/finance/tax/doc/'.length).split('/').map(decodeURIComponent); } catch { return c.json(404, { error: 'not found' }); }
      if (parts.length !== 2 || !YEAR_RE.test(parts[0]) || !FILE_RE.test(parts[1])) return c.json(404, { error: 'not found' });
      const root = resolve(docsDir()), f = resolve(root, parts[0], parts[1]);
      if (!f.startsWith(root + sep)) return c.json(404, { error: 'not found' });
      let buf; try { buf = await fsp.readFile(f); } catch { return c.json(404, { error: 'not found' }); }
      const mime = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[parts[1].split('.').pop()] || 'application/octet-stream';
      c.send(200, buf, mime, { 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" });
      return undefined;
    },
  });

  /* ---------- reminders: real tasks with a gentle lead ---------- */
  const actionsOf = (c) => (c && c.actions) || app.ctx.actions;
  const createdId = (r) => { const c = r && Array.isArray(r.created) ? r.created[0] : null; const id = c && (c.taskId || c.id); return id ? String(id) : null; };
  /** Create a task for each date not yet on the list; a task that already exists stays as it is. */
  async function makeReminders(actions, doc, year, ids, today, view) {
    const rec = doc.years[year] = doc.years[year] || {};
    rec.tasks = rec.tasks || {};
    const made = [];
    const label = yearData(year).label;
    for (const d of (view.deadlines || []).filter(x => (!ids || ids.includes(x.id)) && !rec.tasks[x.id] && x.state !== 'done' && x.days >= 0)) {
      const title = `${d.title}${d.title.includes(label) ? '' : ` (${label})`} by ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}/${d.date.slice(0, 4)}`;
      const r = await actions.apply({ ops: [{ op: 'task.create', title, dueDate: taskDate(d, today), detail: d.text, priority: d.kind === 'file' || d.kind === 'pay' ? 'p1' : 'p2', allowDuplicate: true }], source: 'ui', client: 'tax tab' });
      const id = createdId(r);
      if (id) { rec.tasks[d.id] = id; made.push({ id: d.id, task: id, undo: r.undo || null }); }
    }
    return made;
  }
  post('/reminders', async (c, b) => {
    const actions = actionsOf(c);
    if (!actions) throw new HttpError(503, 'The task list is not loaded yet. Try again in a moment.');
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(b.year, o.today);
    const v = taxView(plan, doc, await analysis(), { today: o.today, year, currency: o.currency, hasUtr: (await idStatus(dataDir)).utr.set });
    const ids = Array.isArray(b.ids) ? b.ids.map(String) : null;
    if (b.always === true) doc.prefs.remind = true;
    const made = await makeReminders(actions, doc, year, ids, o.today, v);
    const saved = await saveBoth(plan, doc);
    log('info', `tax reminders: ${made.length} task(s)`);
    return { ok: true, made: made.length, ...(await reply(saved.plan, saved.doc, year)) };
  });
  post('/tick', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(b.year, o.today);
    const rec = doc.years[year] = doc.years[year] || {};
    rec.ticks = rec.ticks || {};
    const id = String(b.id || '').slice(0, 40);
    if (b.done === false) delete rec.ticks[id]; else rec.ticks[id] = o.today;
    const task = (rec.tasks || {})[id];
    const actions = actionsOf(c);
    if (task && actions && b.done !== false) { try { await actions.apply({ ops: [{ op: 'task.complete', id: task }], source: 'ui', client: 'tax tab' }); } catch { /* the task may have gone */ } }
    const saved = await saveBoth(plan, doc);
    return { ok: true, ...(b.brief ? {} : await reply(saved.plan, saved.doc, year)) };
  });
  post('/prompt', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(b.year, o.today);
    const rec = doc.years[year] = doc.years[year] || {};
    rec.prompts = rec.prompts || {};
    const id = String(b.id || '').slice(0, 100);
    let task = null;
    if (b.action === 'task') {
      const actions = actionsOf(c);
      if (!actions) throw new HttpError(503, 'The task list is not loaded yet. Try again in a moment.');
      const title = String(b.title || 'Tax').slice(0, 200);
      const r = await actions.apply({ ops: [{ op: 'task.create', title, dueDate: typeof b.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.due) ? b.due : null, detail: String(b.text || '').slice(0, 800), priority: 'p2', allowDuplicate: true }], source: 'ui', client: 'tax tab' });
      task = createdId(r);
    }
    rec.prompts[id] = { state: b.action === 'task' ? 'task' : 'dismissed', at: o.today, ...(task ? { task } : {}) };
    const saved = await saveBoth(plan, doc);
    return { ok: true, ...(await reply(saved.plan, saved.doc, year)) };
  });

  /* ---------- the dates keep coming round: tasks appear by themselves once they asked for reminders ---------- */
  async function remindersDue() {
    try {
      const raw = (await getTaxDoc()).doc;
      if (!raw || !raw.prefs || raw.prefs.remind !== true) return;
      const actions = app.ctx.actions;
      if (!actions) return;
      const { plan, doc } = await loadAll();
      const o = opts();
      if (plan.country !== 'uk') return;
      const cur = taxYearOf(o.today).id;
      let made = 0;
      for (const year of [taxYearAfter(cur, -1), cur]) {
        const v = taxView(plan, doc, null, { today: o.today, year, currency: o.currency, hasUtr: (await idStatus(dataDir)).utr.set });
        const ids = (v.deadlines || []).filter(d => d.days >= 0 && d.days <= 60 && !d.task).map(d => d.id);
        if (ids.length) made += (await makeReminders(actions, doc, year, ids, o.today, v)).length;
      }
      if (made) { await saveBoth(plan, doc); log('info', `tax reminders: ${made} due soon`); }
    } catch { /* tried again later */ }
  }
  const remindTimer = setTimeout(() => { remindersDue(); const t = setInterval(remindersDue, 6 * 3600e3); if (t.unref) t.unref(); }, 90e3);
  if (remindTimer.unref) remindTimer.unref();

  /* ---------- the return pack, and File my return ---------- */
  app.route({ path: '/api/finance/tax/pack', method: 'GET', methodError: 'GET or POST only', sameOrigin: true, quiet: true, handler: async (c) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(c.query.get('year'), o.today);
    const v = taxView(plan, doc, await analysis(), { today: o.today, year, currency: o.currency, hasUtr: (await idStatus(dataDir)).utr.set });
    const pack = returnPack(v);
    return { pack, steps: walkSteps(v, pack), filing: v.filing };
  } });
  post('/pack', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(b.year, o.today);
    const v = taxView(plan, doc, await analysis(), { today: o.today, year, currency: o.currency, hasUtr: (await idStatus(dataDir)).utr.set });
    const pack = returnPack(v);
    const cfg = cfgOf();
    const utr = b.withIds === true ? (await revealId(dataDir, 'utr')) || '' : '';
    const nino = b.withIds === true ? (await revealId(dataDir, 'nino')) || '' : '';
    const r = await writePack(dataDir, pack, { name: typeof cfg.userName === 'string' ? cfg.userName : '', utr, nino, claims: v.claims, today: o.today, currency: o.currency });
    openFolder(r.dir);
    log('info', `tax pack made: ${pack.forms.length} forms`);
    return { ok: true, dir: r.dir, receipts: r.receipts, missing: r.missing, flags: pack.flags };
  });
  post('/compare', async (c, b) => {
    const { plan, doc } = await loadAll();
    const o = opts();
    const year = yearOf(b.year, o.today);
    const total = Number(b.total);
    if (!Number.isFinite(total)) throw new HttpError(400, 'Type HMRC\'s total as a number.');
    const rec = doc.years[year] = doc.years[year] || {};
    rec.hmrc = { total, at: o.today };
    const saved = await saveBoth(plan, doc);
    const v = taxView(saved.plan, saved.doc, await analysis(), { today: o.today, year, currency: o.currency });
    return { ok: true, ...compareHmrc(v, total) };
  });
}
