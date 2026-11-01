// lib/finance-data.mjs - the service behind Money > Your data (server/routes/finance-data.mjs).
// The rules and the small choices file are lib/finance/data-sources.mjs; the rebuild is the
// normal pipeline (lib/finance.mjs), so there is one way a payment gets counted.
//
//   overview()            every source, where it came from, its status and tick; the duplicates; notes
//   preview(choice)       the numbers before and after, nothing written
//   apply(choice)         save the ticks and dates, rebuild once; one Undo
//   undo()                back to exactly what it was
//   remove(key, {disconnect})   delete for good, safety copy first (30 days); restore(token), purge(token)
//   download(key)         one source's payments as CSV text
//   applyEdits(list)      ticks and dates chosen on another computer (finance-share edits)
//   setCard(body)         a credit card's name, what is owed and how it is paid (lib/finance/cards.mjs)
//   flip(key)             a source's money in and out the other way round; doing it again puts it back
//
// choice = {off: [every key not counted], until: {key: 'YYYY-MM-DD'}, dups: {key: kept key}}
//
// On a computer that shows another computer's finances: overview() is the published list with this
// computer's own edits laid over it; apply() writes the shared edits and the finance computer does the
// rest; deleting, Undo of a delete and downloads happen on the finance computer, because only it has the rows.
// Logs carry counts only.

import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdir, copyFile, rm, stat, unlink } from 'node:fs/promises';
import { atomicWrite, writeJson, readJson, withLock } from './fsutil.mjs';
import { financeDir, financeBusy, refreshFinanceAnalysis, previewDataChoices, financeData } from './finance.mjs';
import { parseStore, storeCsv, dataKey, rowKeyStr, parseCsv, merge } from './finance/store.mjs';
import { dictRows, writeCsv } from './finance/csv.mjs';
import { decodeText } from './finance/pycompat.mjs';
import { loadFrame, transactionsCsv, todayIn, flipStored } from './finance/pipeline.mjs';
import { readCards, updateCards, cardMap, cleanPay, cleanCardName, issuerIn } from './finance/cards.mjs';
import { readChoices, updateChoices, accountKey, describeStore, countRule, overlapPairs, cleanChoices, plainFile } from './finance/data-sources.mjs';
import { findDuplicates } from './fin-connect/overlap.mjs';

const DAY = 86400000;
const LATE_DAYS = 7, COPY_DAYS = 30;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN = /^[a-z0-9-]{1,60}-\d{14}$/;
export class DataError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const busyError = () => new DataError(409, 'BUSY', 'Your money is being updated right now. Try again in a moment.');
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function createFinanceData({ sources, finConnect, share = () => null, getConfig = () => ({}), log = () => {}, now = () => Date.now() }) {
  const dir = () => financeDir();
  const sysPath = (...p) => join(dir(), '_system', ...p);
  const bankSources = async () => (await sources.all()).filter(s => s.capability === 'bank');
  async function storeRows() {
    const f = sysPath('transactions.csv');
    if (!existsSync(f)) return [];
    return parseStore(await readFile(f, 'utf8'));
  }
  /** Another computer reads the bank: {host} (sync on, encrypted), else null. */
  async function remote() {
    const fs = share();
    const sh = fs ? await fs.sharing().catch(() => null) : null;
    return sh && !sh.publisher ? sh : null;
  }
  const hostName = (sh) => (sh && sh.host && sh.host.name) || 'your other computer';

  // ─── The list ───────────────────────────────────────────────────────
  function statusOf(x, src, health, off) {
    if (x.origin === 'file') return { kind: 'file' };
    if (x.origin === 'gone' || !src) return { kind: 'stopped', reason: 'gone' };
    if (src.demo) return { kind: 'demo' };
    if (off) return { kind: 'stopped', reason: 'unticked' };
    if (!src.enabled) return { kind: 'stopped', reason: 'sourceoff' };
    const state = (health && (health.connectionState || health.state)) || null;
    if (state === 'auth' || state === 'setup') return { kind: 'reconnect', message: (health && health.message) || null };
    const at = Date.parse(src.lastSync || '') || 0;
    if (!at || now() - at > LATE_DAYS * DAY || state === 'error') return { kind: 'stopped', reason: 'late', message: state === 'error' ? (health.message || null) : null };
    return { kind: 'updating', lastSync: src.lastSync };
  }

  async function currentOff(list, ch) {
    const off = new Set(Object.keys(ch.off));
    for (const s of list) for (const a of s.accounts || []) if (a && a.enabled === false && a.hiddenReason !== 'deleted') off.add(accountKey(s, a));
    return off;
  }

  /** This computer's own list. analysis: the analysis the caller already read (for what each card owes). */
  async function localOverview(analysis = null) {
    const list = await bankSources();
    const rows = await storeRows();
    const ch = await readChoices(dir());
    const reg = await readCards(dir());
    const desc = describeStore(rows, list, reg.cards);
    const owedAll = (analysis || await readJson(sysPath('analysis.json'), { fallback: null }).catch(() => null) || {}).cards;
    const owedOf = new Map((Array.isArray(owedAll) ? owedAll : []).map(c => [c.key, c]));
    const off = await currentOff(list, ch);
    const st = await sources.status({ discover: false }).catch(() => ({ sources: [] }));
    const healthOf = new Map((st.sources || []).map(s => [s.id, s.health]));
    const bal = await readJson(sysPath('balances.json'), { fallback: null }).catch(() => null);
    const balOf = new Map((isObj(bal) && Array.isArray(bal.accounts) ? bal.accounts : []).filter(b => b && b.acct).map(b => [String(b.acct), b]));
    const out = [];
    for (const x of desc.values()) {
      if (ch.gone[x.key] || x.hiddenReason === 'deleted') continue;
      const src = x.sourceId ? list.find(s => s.id === x.sourceId) : null;
      const b = balOf.get(x.key);
      out.push({
        key: x.key, bankId: x.bankId, bank: x.bank, name: x.name, origin: x.origin, sourceId: x.sourceId, sourceLabel: src ? src.label : null,
        direct: !!(src && src.kind === 'direct'), files: x.files, count: x.count, from: x.from, to: x.to, balanceOnly: x.balanceOnly,
        counted: !off.has(x.key), until: ch.until[x.key] || null, duplicate: x.hiddenReason === 'duplicate' || !!ch.dup[x.key],
        status: statusOf(x, src, healthOf.get(x.sourceId), off.has(x.key)),
        balance: b && Number.isFinite(Number(b.balance)) ? Number(b.balance) : null,
        ...(x.kind || (b && /credit|card/i.test(String(b.kind || ''))) ? { kind: 'credit', card: cardRow(x, reg.cards[x.key], owedOf.get(x.key), b, rows) } : { kind: null }),
      });
    }
    const rule = countRule([...off, ...Object.keys(ch.gone)], ch.until);
    const named = (k) => { const x = desc.get(k); return x ? { key: k, bank: x.bank, name: x.name } : { key: k, bank: 'Other', name: k }; };
    const overlaps = overlapPairs(rows, desc, rule, findDuplicates).map(o => ({ a: named(o.a), b: named(o.b), share: o.share, rows: o.rows }));
    const today = todayIn(getConfig().timezone || null);
    let newest = null;
    for (const r of rows) if (rule.counted(r) && (!newest || r.date > newest)) newest = r.date;
    return {
      status: rows.length || out.length ? 'ok' : 'empty', today, rows: out, overlaps, newest,
      hasBank: out.some(x => x.origin === 'connected' && x.counted),
      gone: Object.entries(ch.gone).map(([key, g]) => ({ key, name: g.name || key, bank: g.bank || null, at: g.at || null, token: g.token || null, disconnected: !!g.disconnected })),
      undo: ch.undo ? { at: ch.undo.at, label: ch.undo.label || null } : null,
      lastDelete: ch.lastDelete && existsSync(sysPath('backups', `removed-${ch.lastDelete.token}`)) ? ch.lastDelete : null,
      paths: { folder: dir(), store: sysPath('transactions.csv'), copies: sysPath('backups') },
    };
  }

  /**
   * A card's row in Your data: what the analysis worked out, or (left out of the analysis, so not in
   * it) what is known without it. mostlyIn: its rows mostly read as money in, so they may be the wrong way round.
   */
  function cardRow(x, saved, worked, b, rows) {
    const mine = rows.filter(r => dataKey(r) === x.key);
    const out = mine.filter(r => Number(r.amount) < 0).length, inn = mine.filter(r => Number(r.amount) > 0).length;
    const known = worked || (x.origin === 'connected' && b && Number.isFinite(Number(b.balance))
      ? { owed: Math.abs(Number(b.balance)), asOf: b.asOf || null, from: 'bank', pay: (saved && saved.pay) || null, lastPaid: null }
      : saved && saved.balance ? { owed: saved.balance.amount, asOf: saved.balance.date, from: saved.balance.from, pay: saved.pay || null, lastPaid: null }
        : { owed: null, asOf: null, from: null, pay: (saved && saved.pay) || null, lastPaid: null });
    return { key: x.key, name: x.name, issuer: (saved && saved.issuer) || null, guess: !!(saved && saved.guess), owed: known.owed, asOf: known.asOf, from: known.from, pay: known.pay, lastPaid: known.lastPaid, mostlyIn: inn > out * 1.5 && inn >= 3,
      typed: saved && saved.balance ? saved.balance : null };
  }

  /** What another computer may see of the list (no folder names, no tokens). */
  async function publicOverview() {
    const d = await localOverview().catch(() => null);
    if (!d) return null;
    const { paths, undo, lastDelete, ...rest } = d;
    return { ...rest, gone: rest.gone.map(({ token, ...g }) => g) };
  }

  async function overview() {
    const sh = await remote();
    const fin = await financeData().catch(() => null);
    const notes = fin && fin.analysis && Array.isArray(fin.analysis.data_notes) ? fin.analysis.data_notes : [];
    const other = fin && fin.analysis && fin.analysis.other_account ? fin.analysis.other_account : null;
    const cardUnseen = fin && fin.analysis && fin.analysis.card_unseen ? fin.analysis.card_unseen : null;
    if (!sh) {
      await purgeOldCopies().catch(() => {});
      return { ...await localOverview(fin && fin.analysis), notes, other, cardUnseen };
    }
    const fs = share();
    const d = await fs.readShare().catch(() => null);
    const doc = d && d.meta && isObj(d.meta.dataSources) ? d.meta.dataSources : null;
    const base = { remote: { name: hostName(sh), online: !!(sh.host && sh.host.online) }, notes, other, cardUnseen };
    if (!doc) return { status: 'waiting', rows: [], overlaps: [], gone: [], undo: null, lastDelete: null, paths: null, today: todayIn(getConfig().timezone || null), ...base };
    const edits = await fs.readEdits();
    const byKey = new Map(Object.values(edits.accounts || {}).map(e => [e.k, e]));
    return {
      ...doc, ...base, undo: null, lastDelete: null, paths: null,
      rows: (doc.rows || []).map(r => {
        const e = byKey.get(r.key);
        if (!e) return r;
        return { ...r, ...(typeof e.hidden === 'boolean' ? { counted: !e.hidden } : {}), ...(typeof e.until === 'string' ? { until: e.until || null } : {}) };
      }),
    };
  }

  // ─── A choice ───────────────────────────────────────────────────────
  function cleanChoice(b) {
    const o = isObj(b) ? b : {};
    const until = {};
    for (const [k, d] of Object.entries(isObj(o.until) ? o.until : {})) if (typeof d === 'string' && ISO.test(d)) until[k] = d;
    const dups = {};
    for (const [k, d] of Object.entries(isObj(o.dups) ? o.dups : {})) if (typeof d === 'string') dups[k] = d;
    return { off: Array.isArray(o.off) ? o.off.filter(k => typeof k === 'string').slice(0, 500) : [], until, dups };
  }
  const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

  async function preview(body) {
    const c = cleanChoice(body);
    const sh = await remote();
    if (sh) {
      // Only the finance computer has the rows that are left out: how many, and the rest once it has updated.
      const d = await overview();
      const offNow = new Set(c.off);
      let fewer = 0;
      for (const r of d.rows || []) { if (r.counted && offNow.has(r.key)) fewer += r.count; else if (!r.counted && !offNow.has(r.key)) fewer -= r.count; }
      return { approx: true, fewer, host: hostName(sh) };
    }
    const list = await bankSources();
    const ch = await readChoices(dir());
    const pairSkip = [...Object.keys(ch.dup).filter(k => c.off.includes(k)), ...Object.keys(c.dups)];
    for (const s of list) for (const a of s.accounts || []) if (a && a.hiddenReason === 'duplicate' && c.off.includes(accountKey(s, a))) pairSkip.push(accountKey(s, a));
    const p = await previewDataChoices({ hide: [...new Set([...c.off, ...Object.keys(ch.gone)])], until: c.until, pairSkip });
    return { ...p, fewer: p.before.payments - p.after.payments };
  }

  /** The ticks and dates as sources.json and the choices file hold them. */
  async function save(c, { label = null, keepUndo = false, syncEdits = true } = {}) {
    const svc = finConnect();
    const list = await bankSources();
    const rows = await storeRows();
    const desc = describeStore(rows, list);
    const before = await readChoices(dir());
    const offBefore = await currentOff(list, before);
    const untilBefore = before.until;
    const want = new Set(c.off.filter(k => desc.has(k) && !before.gone[k]));
    const snapshot = {
      at: new Date(now()).toISOString(), label, off: before.off, until: before.until, dup: before.dup,
      accounts: list.flatMap(s => (s.accounts || []).map(a => ({ s: s.id, id: a.id, enabled: a.enabled !== false, hiddenReason: a.hiddenReason || null, dupChoice: a.dupChoice || null }))),
    };
    const reticked = new Map();
    const listed = new Set();
    for (const s of list) {
      let touched = false;
      for (const a of s.accounts || []) {
        const k = accountKey(s, a);
        listed.add(k);
        if (a.hiddenReason === 'deleted') continue;
        const isOff = a.enabled === false, toOff = want.has(k);
        if (isOff !== toOff || (toOff && c.dups[k] && a.hiddenReason !== 'duplicate')) touched = true;
        if (isOff && !toOff && s.kind !== 'csv') { if (!reticked.has(s.id)) reticked.set(s.id, []); reticked.get(s.id).push(a.id); }
      }
      if (!touched) continue;
      await svc.updateSource(s.id, (x) => {
        for (const a of x.accounts || []) {
          const k = accountKey(x, a);
          if (a.hiddenReason === 'deleted') continue;
          if (want.has(k)) {
            a.enabled = false;
            if (c.dups[k]) { a.hiddenReason = 'duplicate'; a.dupChoice = 'other'; if (listedDup(c.dups[k])) a.duplicateOf = c.dups[k]; }
            else if (a.hiddenReason !== 'duplicate') a.hiddenReason = 'user';
          } else {
            if (a.enabled === false && a.hiddenReason === 'duplicate') a.dupChoice = 'this';
            a.enabled = true;
            delete a.hiddenReason;
          }
        }
      });
    }
    const after = await updateChoices(dir(), (x) => {
      x.off = {};
      for (const k of want) if (!listed.has(k)) x.off[k] = 1;
      x.until = {};
      for (const [k, d] of Object.entries(c.until)) if (desc.has(k)) x.until[k] = d;
      const dup = {};
      for (const [k, v] of Object.entries(x.dup)) if (want.has(k)) dup[k] = v;
      for (const [k, v] of Object.entries(c.dups)) if (want.has(k) && !listed.has(k)) dup[k] = v;
      x.dup = dup;
      if (!keepUndo) x.undo = snapshot;
    });
    // The other computers: every tick or date that changed.
    const fs = share();
    const sh = fs && syncEdits ? await fs.sharing().catch(() => null) : null;
    if (sh) {
      for (const k of new Set([...want, ...offBefore, ...Object.keys(after.until), ...Object.keys(untilBefore)])) {
        const was = offBefore.has(k), is = want.has(k);
        const u0 = untilBefore[k] || '', u1 = after.until[k] || '';
        if (was === is && u0 === u1) continue;
        await fs.editAccount(k, { enabled: !is, until: u1 }).catch(() => {});
      }
    }
    return { reticked, list };
  }
  // A kept account from sources.json can be named by key only when the validator accepts it.
  const listedDup = (k) => /^[A-Za-z0-9_.:-]{1,160}$/.test(String(k));

  async function rebuild() {
    const r = await refreshFinanceAnalysis();
    return !!(r && r.ok);
  }
  /** A re-ticked connected account: fetch what it missed (a bank read through Claude has no per-account memory: its whole history). */
  function fetchMissed(reticked, list) {
    const svc = finConnect();
    for (const [id, accs] of reticked) {
      const s = list.find(x => x.id === id);
      if (!s || s.demo || s.setup || !s.enabled || s.kind === 'csv') continue;
      (async () => {
        if (s.kind === 'direct') {
          const stats = await svc.accountStats().catch(() => ({}));
          const cur = await svc.readCursor(id);
          let changed = false;
          for (const a of accs) if (!(stats[`${id}.${a}`] && stats[`${id}.${a}`].transactionCount) && cur.accounts && cur.accounts[a]) { delete cur.accounts[a]; changed = true; }
          if (changed) await svc.writeCursor(id, cur);
        }
        await svc.requestSync(id, { waitMs: 60000, ...(s.kind === 'direct' ? {} : { full: true }) });
      })().catch(e => log('warn', `your data: fetching after a tick failed (${e.code || 'error'})`));
    }
  }

  async function apply(body) {
    const c = cleanChoice(body);
    const sh = await remote();
    if (sh) {
      // The finance computer applies these and publishes (lib/finance-share.mjs applyEdits).
      const fs = share();
      const d = await overview();
      const want = new Set(c.off);
      let n = 0;
      for (const r of d.rows || []) {
        const u = c.until[r.key] || '';
        if (r.counted === !want.has(r.key) && (r.until || '') === u) continue;
        await fs.editAccount(r.key, { enabled: !want.has(r.key), until: u });
        n++;
      }
      return { ok: true, changed: n, remote: { name: hostName(sh) } };
    }
    if (financeBusy()) throw busyError();
    const { reticked, list } = await save(c, { label: typeof body.label === 'string' ? body.label.slice(0, 80) : null });
    const rebuilt = await rebuild();
    if (!rebuilt && financeBusy()) log('note', 'your data: saved while an update runs; that update reads the new choice');
    fetchMissed(reticked, list);
    log('note', `your data: applied (${c.off.length} left out, ${Object.keys(c.until).length} with a date)`);
    return { ok: true, undo: true };
  }

  async function undo() {
    if (await remote()) throw new DataError(409, 'FINANCE_ELSEWHERE', 'Change the ticks back and press Update my money.');
    if (financeBusy()) throw busyError();
    const ch = await readChoices(dir());
    const u = ch.undo;
    if (!u) throw new DataError(404, 'NOTHING', 'There is nothing to undo.');
    const svc = finConnect();
    const list = await bankSources();
    const offBefore = await currentOff(list, ch);
    const untilBefore = ch.until;
    for (const s of list) {
      const mine = (u.accounts || []).filter(a => a.s === s.id);
      if (!mine.length) continue;
      await svc.updateSource(s.id, (x) => {
        for (const a of x.accounts || []) {
          const was = mine.find(m => m.id === a.id);
          if (!was) continue;
          a.enabled = was.enabled;
          if (was.hiddenReason) a.hiddenReason = was.hiddenReason; else delete a.hiddenReason;
          if (was.dupChoice) a.dupChoice = was.dupChoice; else delete a.dupChoice;
        }
      }).catch(() => {});
    }
    const after = await updateChoices(dir(), (x) => { const c = cleanChoices(u); x.off = c.off; x.until = c.until; x.dup = c.dup; x.undo = null; });
    const fs = share();
    const sh = fs ? await fs.sharing().catch(() => null) : null;
    if (sh) {
      const offNow = await currentOff(await bankSources(), after);
      for (const k of new Set([...offBefore, ...offNow, ...Object.keys(untilBefore), ...Object.keys(after.until)])) {
        if (offBefore.has(k) === offNow.has(k) && (untilBefore[k] || '') === (after.until[k] || '')) continue;
        await fs.editAccount(k, { enabled: !offNow.has(k), until: after.until[k] || '' }).catch(() => {});
      }
    }
    await rebuild();
    log('note', 'your data: undone');
    return { ok: true };
  }

  /** Ticks and dates from another computer. -> did anything change? (Waits for nothing: a running update reads the new choice.) */
  async function applyEdits(entries) {
    const list = await bankSources();
    const ch = await readChoices(dir());
    const off = await currentOff(list, ch);
    const until = { ...ch.until };
    const offNow = new Set(off), untilKeys = JSON.stringify(Object.entries(until).sort());
    for (const e of entries || []) {
      if (typeof e.hidden === 'boolean') { if (e.hidden) offNow.add(e.k); else offNow.delete(e.k); }
      if (typeof e.until === 'string') { if (e.until) until[e.k] = e.until; else delete until[e.k]; }
    }
    if (sameSet(off, offNow) && JSON.stringify(Object.entries(until).sort()) === untilKeys) return false;
    const { reticked, list: l2 } = await save({ off: [...offNow], until, dups: {} }, { keepUndo: false, syncEdits: false, label: 'From your other computer' });
    await rebuild();
    fetchMissed(reticked, l2);
    return true;
  }

  // ─── Credit cards ───────────────────────────────────────────────────
  async function onThisComputer(what) {
    const sh = await remote();
    if (sh) throw new DataError(409, 'FINANCE_ELSEWHERE', `Your payments are kept on ${hostName(sh)}, so ${what} there: open OpenDash on ${hostName(sh)}, then Money > Your data.`);
    if (financeBusy()) throw busyError();
  }
  /**
   * {key, isCard?, name?, balance?: {amount, date} | null, pay?: {how, amount, day, fromCurrent} | null}.
   * Only what is sent changes. -> {ok, prev}: the card as it was (send it back to undo).
   */
  async function setCard(body) {
    await onThisComputer('change it');
    const b = isObj(body) ? body : {};
    const key = String(b.key || '');
    const list = await bankSources();
    const rows = await storeRows();
    const desc = describeStore(rows, list, (await readCards(dir())).cards);
    const x = desc.get(key);
    if (!x) throw new DataError(404, 'NOT_FOUND', 'That data is not here any more.');
    let balance;
    if ('balance' in b) {
      if (b.balance === null) balance = null;
      else {
        const amount = Number(b.balance && b.balance.amount), date = String(b.balance && b.balance.date || '');
        if (!Number.isFinite(amount) || amount < 0 || amount > 1e7) throw new DataError(400, 'BAD_AMOUNT', 'That amount does not look right. Type what you owe, like 612.40.');
        if (!ISO.test(date) || date > todayIn(getConfig().timezone || null)) throw new DataError(400, 'BAD_DATE', 'Choose a date that is today or earlier.');
        balance = { amount: Math.round(amount * 100) / 100, date, from: b.balance.from === 'statement' ? 'statement' : 'typed' };
      }
    }
    let pay;
    if ('pay' in b) {
      pay = b.pay === null ? null : cleanPay(b.pay);
      if (b.pay !== null && (!pay || !pay.day)) throw new DataError(400, 'BAD_PAY', 'Choose how you pay it and the day it is due.');
      if (pay && pay.how === 'fixed' && !pay.amount) throw new DataError(400, 'BAD_PAY', 'Type the amount you pay each month.');
    }
    let prev = null;
    await updateCards(dir(), (reg) => {
      const was = reg.cards[key] || null;
      prev = { key, isCard: !!was, name: was ? was.name : undefined, balance: was && was.balance ? was.balance : null, pay: was && was.pay ? was.pay : null };
      if (b.isCard === false) { delete reg.cards[key]; for (const [k, v] of Object.entries(reg.files)) if (v === key) reg.files[k] = false; return; }
      if (!was && b.isCard !== true && x.kind !== 'credit') return;
      const iss = issuerIn(`${x.name} ${x.bank || ''}`);
      const c = was || (reg.cards[key] = { name: x.name, issuer: iss ? iss.id : null, bank: iss ? iss.name : null, flip: false });
      delete c.guess;
      if (typeof b.name === 'string' && cleanCardName(b.name)) c.name = cleanCardName(b.name);
      if (balance === null) delete c.balance; else if (balance) c.balance = balance;
      if (pay === null) delete c.pay; else if (pay) c.pay = pay;
    });
    await rebuild();
    log('note', 'your data: a card was changed');
    return { ok: true, prev };
  }
  /** One source's money in and out the other way round. Doing it again puts it back. */
  async function flip(key) {
    await onThisComputer('flip it');
    const k = String(key || '');
    const rows = await storeRows();
    if (!rows.some(r => dataKey(r) === k)) throw new DataError(404, 'NOT_FOUND', 'That data has no payments to flip.');
    const n = await flipStored(dir(), k);
    await rebuild();
    log('note', `your data: flipped one source (${n} rows)`);
    return { ok: true, flipped: n };
  }

  // ─── Delete for good ────────────────────────────────────────────────
  const copyDir = (token) => sysPath('backups', `removed-${token}`);
  async function purgeOldCopies() {
    const root = sysPath('backups');
    let names = [];
    try { names = await readdir(root); } catch { return; }
    for (const n of names) {
      if (!n.startsWith('removed-')) continue;
      const p = join(root, n);
      const s = await stat(p).catch(() => null);
      if (s && s.isDirectory() && now() - s.mtimeMs > COPY_DAYS * DAY) await rm(p, { recursive: true, force: true }).catch(() => {});
    }
  }
  /** Rows of this source in processed/: the safety copy keeps the original, and what stays has none of them. */
  async function scrubProcessed(key, dest) {
    const folder = join(dir(), 'processed');
    let names = [];
    try { names = await readdir(folder); } catch { return 0; }
    let n = 0;
    for (const name of names) {
      if (!/\.csv$/i.test(name)) continue;
      const f = join(folder, name);
      let buf, rows;
      try { buf = await readFile(f); rows = parseCsv(buf, name); } catch { continue; }
      const hit = rows.filter(r => dataKey(r) === key).length;
      if (!hit) continue;
      await mkdir(join(dest, 'processed'), { recursive: true });
      await copyFile(f, join(dest, 'processed', name));
      if (hit === rows.length) { await unlink(f); n++; continue; }
      const { fieldnames, rows: raw } = dictRows(decodeText(buf));
      const col = (fieldnames || []).find(x => x && /^\s*account\s*$/i.test(x)) || (fieldnames || []).find(x => x && /account/i.test(x));
      if (!col) continue;
      const kept = raw.filter(m => String(m.get(col) || '').trim() !== key);
      await atomicWrite(f, writeCsv(fieldnames, kept, (m, k) => m.get(k) ?? ''));
      n++;
    }
    return n;
  }

  async function remove(key, { disconnect = false } = {}) {
    const sh = await remote();
    if (sh) throw new DataError(409, 'FINANCE_ELSEWHERE', `Your payments are kept on ${hostName(sh)}, so delete them there: open OpenDash on ${hostName(sh)}, then Money > Your data.`);
    if (financeBusy()) throw busyError();
    const k = String(key || '');
    const list = await bankSources();
    const allRows = await storeRows();
    const desc = describeStore(allRows, list);
    const x = desc.get(k);
    if (!x) throw new DataError(404, 'NOT_FOUND', 'That data is not here any more.');
    const stamp = new Date(now()).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const token = `${k.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'data'}-${stamp}`;
    const dest = copyDir(token);
    await mkdir(dest, { recursive: true });
    const store = sysPath('transactions.csv');
    let removed = 0;
    // The safety copy is written before anything goes.
    const bankCats = await readJson(sysPath('bank_categories.json'), { fallback: {} }).catch(() => ({})) || {};
    const places = await readJson(sysPath('tx_places.json'), { fallback: {} }).catch(() => ({})) || {};
    const bal = await readJson(sysPath('balances.json'), { fallback: null }).catch(() => null);
    const hist = await readJson(sysPath('balances_history.json'), { fallback: null }).catch(() => null);
    const meta = { key: k, name: x.name, bank: x.bank, at: new Date(now()).toISOString(), bankCats: {}, places: {}, balance: null, history: {}, card: (await readCards(dir())).cards[k] || null };
    await withLock(store, async () => {
      const cur = await storeRows();
      const gone = cur.filter(r => dataKey(r) === k), keep = cur.filter(r => dataKey(r) !== k);
      removed = gone.length;
      await atomicWrite(join(dest, 'rows.csv'), storeCsv(gone));
      const stillUsed = new Set(keep.map(rowKeyStr));
      for (const r of gone) {
        const rk = rowKeyStr(r);
        if (stillUsed.has(rk)) continue;
        if (Object.prototype.hasOwnProperty.call(bankCats, rk)) { meta.bankCats[rk] = bankCats[rk]; delete bankCats[rk]; }
        if (Object.prototype.hasOwnProperty.call(places, rk)) { meta.places[rk] = places[rk]; delete places[rk]; }
      }
      if (isObj(bal) && Array.isArray(bal.accounts)) { const b = bal.accounts.find(a => a && a.acct === k); if (b) { meta.balance = b; bal.accounts = bal.accounts.filter(a => a !== b); } }
      if (Array.isArray(hist)) {
        for (const h of hist) {
          if (!isObj(h) || !isObj(h.accounts) || !(k in h.accounts)) continue;
          meta.history[h.date] = h.accounts[k];
          delete h.accounts[k];
          h.total = Math.round(Object.values(h.accounts).reduce((t, v) => t + (Number(v) || 0), 0) * 100) / 100;
        }
      }
      await writeJson(join(dest, 'meta.json'), meta);
      await scrubProcessed(k, dest);
      await atomicWrite(store, storeCsv(keep));
      await writeJson(sysPath('bank_categories.json'), bankCats);
      await writeJson(sysPath('tx_places.json'), places);
      if (meta.balance) await writeJson(sysPath('balances.json'), bal);
      if (Object.keys(meta.history).length) await writeJson(sysPath('balances_history.json'), hist);
      const pendFile = sysPath('pending.json');
      const pend = await readJson(pendFile, { fallback: null }).catch(() => null);
      if (isObj(pend) && isObj(pend.sources)) {
        for (const s of Object.values(pend.sources)) if (s && Array.isArray(s.rows)) s.rows = s.rows.filter(r => r.acct !== k);
        await writeJson(pendFile, pend);
      }
    }, { timeoutMs: 60000 });

    // A connected account stays gone: a bank that still sends it is ignored until it is brought back.
    const connected = x.origin === 'connected';
    const src = x.sourceId ? list.find(s => s.id === x.sourceId) : null;
    let disconnected = false;
    if (connected && src) {
      await finConnect().updateSource(src.id, (s) => {
        const a = (s.accounts || []).find(y => accountKey(s, y) === k);
        if (a) { a.enabled = false; a.hiddenReason = 'deleted'; }
      }).catch(() => {});
    }
    // A card's details go with it (what you typed you owe, how you pay it); Undo brings them back from the copy.
    if (meta.card) await updateCards(dir(), (r) => { delete r.cards[k]; });
    await updateChoices(dir(), (c) => {
      delete c.off[k]; delete c.until[k]; delete c.dup[k];
      if (connected) c.gone[k] = { at: meta.at, name: x.name, bank: x.bank, token, disconnected: false, sourceId: x.sourceId, accountId: x.accountId };
      c.lastDelete = { token, name: x.name, at: meta.at, count: removed, key: k };
    });
    if (disconnect && src) {
      try {
        if (src.kind === 'direct') await finConnect().disconnect(src.id, { removeData: false });
        else await finConnect().updateSource(src.id, { enabled: false });
        disconnected = true;
      } catch (e) { log('warn', `your data: could not disconnect (${e.code || 'error'})`); }
      if (disconnected) await updateChoices(dir(), (c) => { if (c.gone[k]) c.gone[k].disconnected = true; });
    }
    const fs = share();
    const sh2 = fs ? await fs.sharing().catch(() => null) : null;
    if (sh2) await fs.editAccount(k, { enabled: false, until: '' }).catch(() => {});
    await rebuild();
    await purgeOldCopies().catch(() => {});
    log('note', `your data: deleted one source (${removed} rows)`);
    return { ok: true, removed, token, disconnected, copy: dest };
  }

  /** Undo a delete from its safety copy (or, with no copy left, only let the account back in). */
  async function restore(body) {
    if (await remote()) throw new DataError(409, 'FINANCE_ELSEWHERE', 'Do this on the computer that reads your bank.');
    if (financeBusy()) throw busyError();
    const ch = await readChoices(dir());
    const key = typeof body.key === 'string' ? body.key : null;
    const token = typeof body.token === 'string' ? body.token : key && ch.gone[key] ? ch.gone[key].token : null;
    let restored = 0, k = key;
    const dest = token && TOKEN.test(token) ? copyDir(token) : null;
    if (dest && existsSync(join(dest, 'meta.json'))) {
      const meta = await readJson(join(dest, 'meta.json'), { fallback: null });
      k = meta.key;
      const store = sysPath('transactions.csv');
      await withLock(store, async () => {
        const cur = await storeRows();
        const back = parseStore(await readFile(join(dest, 'rows.csv'), 'utf8'));
        const add = merge(cur, back);
        await atomicWrite(store, storeCsv(cur.concat(add)));
        restored = add.length;
        const bc = await readJson(sysPath('bank_categories.json'), { fallback: {} }).catch(() => ({})) || {};
        await writeJson(sysPath('bank_categories.json'), { ...bc, ...meta.bankCats });
        const pl = await readJson(sysPath('tx_places.json'), { fallback: {} }).catch(() => ({})) || {};
        await writeJson(sysPath('tx_places.json'), { ...pl, ...meta.places });
        if (meta.balance) {
          const b = await readJson(sysPath('balances.json'), { fallback: null }).catch(() => null);
          if (isObj(b) && Array.isArray(b.accounts)) { b.accounts.push(meta.balance); await writeJson(sysPath('balances.json'), b); }
        }
        if (meta.history && Object.keys(meta.history).length) {
          const hist = await readJson(sysPath('balances_history.json'), { fallback: null }).catch(() => null);
          if (Array.isArray(hist)) {
            for (const h of hist) if (isObj(h) && isObj(h.accounts) && h.date in meta.history) { h.accounts[k] = meta.history[h.date]; h.total = Math.round(Object.values(h.accounts).reduce((t, v) => t + (Number(v) || 0), 0) * 100) / 100; }
            await writeJson(sysPath('balances_history.json'), hist);
          }
        }
      }, { timeoutMs: 60000 });
      if (meta.card) await updateCards(dir(), (r) => { r.cards[k] = meta.card; });
      const pdir = join(dest, 'processed');
      if (existsSync(pdir)) {
        await mkdir(join(dir(), 'processed'), { recursive: true });
        for (const n of await readdir(pdir)) await copyFile(join(pdir, n), join(dir(), 'processed', basename(n)));
      }
      await rm(dest, { recursive: true, force: true });
    }
    if (!k) throw new DataError(404, 'NOT_FOUND', 'That safety copy is not here any more.');
    const list = await bankSources();
    const wasOff = !!(ch.gone[k] && ch.gone[k].disconnected);
    let source = null;
    for (const s of list) {
      if ((s.accounts || []).some(a => accountKey(s, a) === k)) {
        source = s;
        // A bank "disconnected too" by switching it off comes back on with it (a direct one has to be connected again: Connections).
        source = await finConnect().updateSource(s.id, (x) => { const a = x.accounts.find(y => accountKey(x, y) === k); if (a) { a.enabled = true; delete a.hiddenReason; } if (wasOff) x.enabled = true; });
      }
    }
    await updateChoices(dir(), (c) => { delete c.gone[k]; if (c.lastDelete && c.lastDelete.key === k) c.lastDelete = null; });
    const fs = share();
    const sh = fs ? await fs.sharing().catch(() => null) : null;
    if (sh) await fs.editAccount(k, { enabled: true }).catch(() => {});
    await rebuild();
    if (source && source.enabled && !source.demo && !source.setup && !restored) fetchMissed(new Map([[source.id, [k.replace(/^.*\./, '')]]]), list);
    return { ok: true, restored };
  }

  async function purge(body) {
    const token = String(body && body.token || '');
    if (!TOKEN.test(token)) throw new DataError(400, 'BAD_REQUEST', 'That safety copy is not here any more.');
    await rm(copyDir(token), { recursive: true, force: true });
    await updateChoices(dir(), (c) => {
      if (c.lastDelete && c.lastDelete.token === token) c.lastDelete = null;
      for (const g of Object.values(c.gone)) if (g.token === token) g.token = null;
    });
    return { ok: true };
  }

  async function download(key) {
    if (await remote()) throw new DataError(409, 'FINANCE_ELSEWHERE', 'Download this on the computer that reads your bank.');
    const k = String(key || '');
    const frame = await loadFrame(dir(), { matchTransfers: true, sources: await bankSources() });
    const rows = frame.filter(r => dataKey(r) === k);
    if (!rows.length) throw new DataError(404, 'NOT_FOUND', 'That data has no payments to download.');
    const x = describeStore(await storeRows(), await bankSources()).get(k);
    const name = `${plainFile(x ? `${x.bank} ${x.name}` : 'payments').replace(/[^A-Za-z0-9 ._-]+/g, ' ').replace(/\.csv$/i, '').trim().slice(0, 60) || 'payments'}.csv`;
    return { csv: transactionsCsv(rows), name };
  }

  return { overview, publicOverview, preview, apply, undo, applyEdits, remove, restore, purge, download, setCard, flip };
}
