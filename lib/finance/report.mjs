// lib/finance/report.mjs - human-readable outputs of the finance pipeline:
//
//   weeklyReport(analysis, imported, fileCount, opts) -> Markdown (reports/<today>.md)
//   transactionsCsv(frame)                            -> CSV of every transaction
//                                                        (replaces Spending.xlsx)
//
// The report text matches spend.py's write_report.

import { pyComma2, dayNum, strftime } from './pycompat.mjs';
import { niceTitle } from './categorise.mjs';
import { writeCsv } from './csv.mjs';

export function weeklyReport(s, imported, fileCount, { symbol = '£' } = {}) {
  const money = (x) => { const t = pyComma2(x); return t.startsWith('-') ? `${symbol}-${t.slice(1)}` : symbol + t; };
  const f = (iso, fmt) => strftime(dayNum(iso), fmt);
  const w = s.week, m = s.month;
  const L = [`# Spending report, week of ${f(w.start, '%d %b')} to ${f(w.end, '%d %b %Y')}`, ''];
  L.push(`Imported ${imported} new transactions from ${fileCount} file(s). Data runs to ${f(s.latest_transaction, '%a %d %b')}.`);
  if (s.stale_days > 4) L.push(`\n**Data is ${s.stale_days} days old.** Export a fresh CSV from your bank to bring this up to date.`);
  L.push('', '## This week', '');
  let line = `Spent **${money(w.total)}**`;
  if (w.avg_prev != null) {
    const diff = w.total - w.avg_prev;
    line += `, ${money(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than your recent weekly average of ${money(w.avg_prev)}`;
  }
  L.push(line + '.', '');
  for (const [c, v] of Object.entries(w.by_category)) L.push(`- ${c}: ${money(v)}`);
  L.push('', `## ${m.label} so far`, '');
  L.push(`Spent **${money(m.mtd)}** vs ${money(m.last_month_to_date)} at the same point in ${m.last_month_label} (${m.last_month_label} total: ${money(m.last_month_full)}).`);
  L.push('', '| Category | This month | Last month | 3-month avg |', '|---|---:|---:|---:|');
  const cats = [...new Set([...Object.keys(m.by_category), ...Object.keys(m.last_by_category)])];
  for (const c of cats) L.push(`| ${c} | ${money(m.by_category[c] || 0)} | ${money(m.last_by_category[c] || 0)} | ${money(m.avg3_by_category[c] || 0)} |`);
  L.push('', '## Flags', '');
  if (!s.flags.length) L.push('Nothing unusual this week.');
  for (const fl of s.flags) L.push(`- **${fl.kind}**: ${fl.merchant}, ${money(fl.amount)} on ${f(fl.date, '%d %b')} (${fl.note})`);
  L.push('', '## Recurring payments', '');
  L.push(`Roughly **${money(s.recurring_monthly_total)} a month** across ${s.recurring.length} recurring payments.`, '');
  for (const r of s.recurring) L.push(`- ${r.merchant} (${r.category}): ${money(r.last_amount)} ${r.frequency}, last ${f(r.last_seen, '%d %b')}`);
  return L.join('\n') + '\n';
}

// A spreadsheet opening the export must never run a cell as a formula.
const safeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

/** Every transaction, newest first, as CSV (what Spending.xlsx's first sheet held). */
export function transactionsCsv(frame) {
  const rows = [...frame].sort((a, b) => b.n - a.n);
  const fields = ['Date', 'Merchant', 'Category', 'Amount', 'Counts as spend', 'Account', 'Type', 'Description', 'Source file'];
  return writeCsv(fields, rows, (r, k) => ({
    Date: r.date, Merchant: safeCell(niceTitle(r.merchant)), Category: safeCell(r.category), Amount: r.amount.toFixed(2),
    'Counts as spend': r.spend.toFixed(2), Account: safeCell(r.account), Type: safeCell(r.subcategory),
    Description: safeCell(r.memo), 'Source file': safeCell(r.source || ''),
  }[k]));
}
