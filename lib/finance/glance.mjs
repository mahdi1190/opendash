// lib/finance/glance.mjs - "Payday & safe to spend" for Home (GET /api/finance/glance).
//
// Built from the SAME model the Finances Overview runs (MBM.compute, the
// page's own src/finance/25-money-model.js, evaluated by lib/finance/brief.mjs),
// so every number here equals the one on the Finances page for the same day,
// period and cushion: safe to spend = B.safe, payday = B.cycle, the bills
// before payday = B.bills, the next 30 days = B.upcoming.
//
//   financeGlance(analysis, {mode, cushion, currency, locale, today, lastUpdateAt})
//   -> {status:'ok', currency, mode, auto, today, cushion,
//       payday: {next, daysLeft, hasSalary, late, mode},
//       safe: {perDay, left, cushion, bills, daysLeft} | null,
//       bills: [Bill] (before payday), billsTotal, upcoming: [Bill] (30 days), upcomingTotal,
//       balance: {total, asOf, accounts:[{acct, name, kind, balance, inTotal}]} | null,
//       bal30, balChange30, balSeries: [{date, v}] (60 days),
//       low: {amount, date, basis:'bills'} | null, staleDays, dataDate}
//   Bill = {m (merchant as stored), name (as people read it), c, date, due, amount, freq}
//
// `low` is the balance after each bill before payday, with no other spending:
// the lowest point and the day it is reached (null without a balance or bills).
// `staleDays` = days since the newest of: the last good update, the balance's
// date, the newest transaction.
// Pure (no I/O). Nothing here can move money.
import { MBM, MODES, briefFor } from './brief.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const r2 = (x) => Math.round(x * 100) / 100;
export const MAX_CUSHION = 1e6;

/** Today's date (YYYY-MM-DD) in a time zone; the server's own day when the zone is unknown. */
export function todayIn(timeZone, now = Date.now()) {
  try {
    if (timeZone) {
      const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
      const g = (t) => (p.find(x => x.type === t) || {}).value;
      const s = `${g('year')}-${g('month')}-${g('day')}`;
      if (ISO.test(s)) return s;
    }
  } catch { /* unknown zone: below */ }
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ?cushion=&mode= -> {cushion: number|undefined, mode: 'cycle'|'month'|undefined} or {error}. */
export function glanceParams(cushionRaw, modeRaw) {
  let cushion;
  if (cushionRaw != null && cushionRaw !== '') {
    const n = Number(cushionRaw);
    if (!Number.isFinite(n) || n < 0 || n > MAX_CUSHION) return { error: `cushion must be a number from 0 to ${MAX_CUSHION}` };
    cushion = r2(n);
  }
  const m = modeRaw == null || modeRaw === '' || modeRaw === 'auto' ? undefined : String(modeRaw);
  if (m !== undefined && !MODES.includes(m)) return { error: 'mode must be auto, cycle or month' };
  return { cushion, mode: m };
}

export function financeGlance(analysis, { mode, cushion, currency, locale, today, lastUpdateAt } = {}) {
  const { B, fmt, input } = briefFor(analysis, { mode, cushion, currency, locale, today });
  const { diso } = MBM.util;
  const name = (m) => { try { return fmt.name ? fmt.name(m) || m : m; } catch { return m; } };
  const bill = (b) => ({ m: b.m, name: name(b.m), c: b.c, date: diso(b.n), due: !!b.due, amount: b.amount, freq: b.freq });
  const cyc = B.cycle;
  // Balance: the spendable accounts that make up the total, then the rest.
  const bal = B.balance;
  const list = Array.isArray(analysis && analysis.balances) ? analysis.balances.filter(b => b && Number.isFinite(+b.balance)) : [];
  const inTotal = new Set(bal ? bal.accts : []);
  const accounts = list.map(b => ({ acct: String(b.acct || ''), name: String(b.name || b.acct || 'Account').slice(0, 60), kind: String(b.kind || '').slice(0, 30),
    balance: r2(+b.balance), inTotal: inTotal.has(String(b.acct || '')) }));
  const series = (B.balSeries || []).filter(p => p.n >= B.anchor - 60 && p.n <= B.anchor).map(p => ({ date: diso(p.n), v: p.v }));
  // The lowest point before payday: the balance after each bill, in date order.
  let low = null;
  if (bal && B.bills.length) {
    let run = bal.total;
    for (const b of B.bills) {
      run = r2(run - b.amount);
      if (!low || run < low.amount) low = { amount: run, date: diso(b.n), basis: 'bills' };
    }
  }
  // How old the data is.
  const newestTx = input.tx.length ? input.tx[0].n : null;
  const dates = [newestTx, bal && bal.asOf && ISO.test(bal.asOf) ? MBM.util.dnum(bal.asOf) : null,
    typeof lastUpdateAt === 'string' && ISO.test(lastUpdateAt.slice(0, 10)) ? MBM.util.dnum(lastUpdateAt.slice(0, 10)) : null].filter(n => Number.isFinite(n));
  const dataN = dates.length ? Math.max(...dates) : null;
  const todayN = ISO.test(String(today || '')) ? MBM.util.dnum(today) : B.anchor;
  return {
    status: 'ok', currency: currency || null, mode: B.mode, auto: B.auto, today: diso(B.anchor), cushion: B.cushion,
    payday: { next: diso(cyc.next), daysLeft: cyc.daysLeft, hasSalary: !!B.hasSalary, late: !!cyc.late, mode: cyc.mode },
    safe: B.safe ? { ...B.safe } : null,
    bills: B.bills.map(bill), billsTotal: B.billsTotal,
    upcoming: B.upcoming.map(bill), upcomingTotal: r2(B.upcoming.reduce((s, b) => s + b.amount, 0)),
    balance: bal ? { total: bal.total, asOf: bal.asOf || null, accounts } : null,
    bal30: B.bal30, balChange30: bal && Number.isFinite(B.bal30) ? r2(bal.total - B.bal30) : null,
    balSeries: series,
    low,
    staleDays: dataN == null ? null : Math.max(0, todayN - dataN),
    dataDate: dataN == null ? null : diso(dataN),
  };
}
