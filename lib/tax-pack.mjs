// lib/tax-pack.mjs - the Tax return pack: one page per form as a PDF, the same as CSV, Receipts.zip and an expenses list,
// in <Documents>/Tax returns/<year>/. Saved like expense reports (lib/expense-report.mjs). Private: nothing here reaches friends or any relay.
// A UTR or NI number goes on the pack only when the person asks.

import { join, resolve, sep, dirname } from 'node:path';
import { promises as fsp } from 'node:fs';
import { createZip } from './zip.mjs';
import { taxPackPdf } from './pdf.mjs';
import { readReceipt } from './expenses.mjs';
import { safeName, documentsDir, openFolder } from './expense-report.mjs';
import { keepRecordsUntil } from './finance/tax-rules.mjs';

const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
const money = (v) => (Math.round(Number(v) * 100) / 100).toFixed(2);

export const packRoot = (docs) => resolve(join(docs || process.env.DASHBOARD_DOCS_DIR || documentsDir(), 'Tax returns'));
export const isPackDir = (dir, docs) => { if (typeof dir !== 'string' || !dir) return false; const d = resolve(dir), root = packRoot(docs); return d.startsWith(root + sep) && dirname(d) === root; };

export function packCsv(pack) {
  const rows = [['Form', 'Page', 'Box', 'What', 'Value', 'Note']];
  for (const f of pack.forms) for (const r of f.rows) rows.push([f.sheet, f.title, r.box, r.label, r.value, r.note || '']);
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function expensesCsv(claims) {
  const rows = [['Date', 'What', 'Amount paid', 'Work share %', 'Amount claimed', 'Kind', 'Has a receipt']];
  for (const c of claims) rows.push([c.date || '', c.what, money(c.amount), c.pct != null ? c.pct : 100, money(Number(c.amount) * (c.pct != null ? c.pct : 100) / 100), c.cat, (c.receipts || []).length ? 'Yes' : 'No']);
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
/**
 * pack: lib/finance/tax-forms.mjs returnPack. opts: {name, utr, nino (only when the person asked), claims, simple, today, docs}.
 * -> {dir, pdf, csv, expenses, zip|null, receipts, missing}
 */
export async function writePack(dataDir, pack, { name = '', utr = '', nino = '', claims = [], today, docs, currency = 'GBP' } = {}) {
  const root = packRoot(docs);
  await fsp.mkdir(root, { recursive: true });
  const dir = join(root, safeName(`${pack.label} return, ${today}`, 60, 'Tax return'));
  if (!resolve(dir).startsWith(root + sep)) throw new Error('That folder is not allowed.');
  await fsp.mkdir(dir, { recursive: true });
  const pdf = taxPackPdf({ pack, name, utr, nino, generated: today, keepUntil: keepRecordsUntil(pack.year), currency });
  await fsp.writeFile(join(dir, 'Tax return pack.pdf'), pdf);
  await fsp.writeFile(join(dir, 'Tax return pack.csv'), packCsv(pack));
  await fsp.writeFile(join(dir, 'Expenses list.csv'), expensesCsv(claims));
  const files = [], missing = []; let k = 0;
  for (const c of claims) {
    k++;
    let n = 0;
    for (const ref of c.receipts || []) {
      const f = await readReceipt(dataDir, ref); if (!f) continue;
      n++;
      files.push({ name: `${String(k).padStart(3, '0')} ${c.date || 'undated'} ${safeName(c.what, 50, 'Receipt')}${n > 1 ? ' (' + n + ')' : ''}.${ref.split('.').pop()}`, data: f.buf });
    }
    if (!n) missing.push(c.what);
  }
  let zip = null;
  if (files.length) { zip = join(dir, 'Receipts.zip'); await fsp.writeFile(zip, createZip(files)); }
  return { dir, pdf: join(dir, 'Tax return pack.pdf'), csv: join(dir, 'Tax return pack.csv'), expenses: join(dir, 'Expenses list.csv'), zip, receipts: files.length, missing };
}
export { openFolder };
