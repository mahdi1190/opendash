// lib/expense-report.mjs - "Make expense report" (2.19.6): the employer's form as a PDF, the receipts as a zip, both in
// <Documents>/Expense reports/<Payer> <date>/. Private like the rest of Expenses: nothing here reaches friends or any relay.
//
//   guessColumn(expense) -> 'hotel'|'transport'|'fuel'|'meals'|'phone'|'entertainment'|'misc'   (worked out for the owner)
//   reportRows(items) -> [{id, date, description, col, label, amount, hasReceipt}] sorted by date
//   signatureInfo / setSignature / removeSignature / readSignature   (<data>/expenses/signature.png|jpg, never shared)
//   makeReport(dataDir, S, opts) -> {dir, pdf, zip, rows, receipts, missing}
//   reportsRoot / isReportDir / removeReportFolder   the folder of one report, only ever inside Documents/Expense reports

import { join, resolve, sep, dirname } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import { atomicWrite } from './fsutil.mjs';
import { createZip } from './zip.mjs';
import { prepareImage, expenseReportPdf, REPORT_COLUMNS } from './pdf.mjs';
import { expensesDir, readReceipt, ID_RE } from './expenses.mjs';

export const SIGNATURE_MAX = 2 * 1024 * 1024;
export const COLUMN_KEYS = Object.freeze(REPORT_COLUMNS.map(c => c.key));
const LABEL = Object.fromEntries(REPORT_COLUMNS.map(c => [c.key, c.label]));
export const COLUMN_LABELS = Object.freeze({ ...LABEL });

// ─── which column ───
const WORDS = {
  hotel: /hotel|motel|accommodation|lodging|airbnb|b&b|hostel|premier inn|travelodge|holiday inn|marriott|hilton|\bibis\b|overnight|\bstay\b|booking\.com|guest ?house/,
  phone: /phone|mobile|\bsim\b|roaming|data plan|vodafone|\bo2\b|giffgaff|\bee\b|broadband|wi-?fi|\bcall(s)?\b|telecom/,
  fuel: /fuel|petrol|diesel|mileage|\bmiles?\b|\bshell\b|\bbp\b|esso|texaco|jet garage|ev charg|charging|pod ?point|gridserve|forecourt/,
  transport: /train|rail|trainline|lner|avanti|\bgwr\b|taxi|\bcab\b|uber|\bbolt\b|\bbus\b|coach|tram|\btube\b|metro|underground|oyster|flight|airline|airport|ryanair|easyjet|parking|\bncp\b|\btoll\b|ferry|eurostar|car hire|rental car|congestion|\bulez\b|travel|transport|transit|ticket to|return to/,
  entertainment: /entertain|client|hospitality|theatre|cinema|tickets?\b|\bevent\b|\bgift\b|networking|conference social/,
  meals: /meal|food|lunch|dinner|breakfast|coffee|caf[eé]|restaurant|\bpret\b|costa|starbucks|greggs|mcdonald|subway|sandwich|snack|drinks?\b|takeaway|deliveroo|just ?eat|\btea\b|\bpub\b|bar\b|bakery|supper|brunch/,
};
const ORDER = ['hotel', 'phone', 'fuel', 'transport', 'entertainment', 'meals'];   // a tie goes to the earlier one
/** The column of the form an expense belongs in, from its kind, category, title, merchant and note; Misc. when nothing fits. */
export function guessColumn(e) {
  if (!e) return 'misc';
  if (e.kind === 'mileage') return 'fuel';
  const cat = String(e.category || '').toLowerCase().trim();
  const exact = COLUMN_KEYS.find(k => k !== 'misc' && (cat === k || cat === LABEL[k].toLowerCase()));
  if (exact) return exact;
  const parts = [[cat, 4], [String(e.title || '').toLowerCase(), 3], [String(e.merchant || '').toLowerCase(), 3], [String(e.note || '').toLowerCase().slice(0, 300), 1]];
  const score = Object.fromEntries(ORDER.map(k => [k, 0]));
  for (const [text, w] of parts) if (text) for (const k of ORDER) if (WORDS[k].test(text)) score[k] += w;
  let best = 'misc', top = 0;
  for (const k of ORDER) if (score[k] > top) { top = score[k]; best = k; }
  return best;
}
export function reportRows(items) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)).map(e => {
    const col = guessColumn(e);
    return { id: e.id, date: e.date, description: e.title, col, label: LABEL[col], amount: e.amount, hasReceipt: (e.receipts || []).some(r => r.ref) };
  });
}

// ─── the signature ───
const sigPath = (dataDir, ext) => join(expensesDir(dataDir), 'signature.' + ext);
function sniffSignature(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return '';
  if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  return '';
}
export async function readSignature(dataDir) {
  for (const ext of ['png', 'jpg']) {
    try { const buf = await fsp.readFile(sigPath(dataDir, ext)); return { buf, ext, mime: ext === 'png' ? 'image/png' : 'image/jpeg' }; } catch { /* not this one */ }
  }
  return null;
}
export async function signatureInfo(dataDir) { const s = await readSignature(dataDir); return { set: !!s, ...(s ? { ext: s.ext, size: s.buf.length } : {}) }; }
/** Keep a signature (base64 or data URL of a PNG/JPEG, 2 MB at most). Returns {ok} or {error, status}. */
export async function setSignature(dataDir, data) {
  let b64 = typeof data === 'string' ? data : '';
  const m = /^data:[^;,]*;base64,/.exec(b64); if (m) b64 = b64.slice(m[0].length);
  if (!b64 || b64.length > Math.ceil(SIGNATURE_MAX * 4 / 3) + 8 || !/^[A-Za-z0-9+/=\s]+$/.test(b64)) return { error: 'That picture is too big (2 MB at most) or could not be read.', status: 413 };
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length || buf.length > SIGNATURE_MAX) return { error: 'That picture is too big (2 MB at most) or could not be read.', status: 413 };
  const ext = sniffSignature(buf);
  if (!ext) return { error: 'Use a PNG or a JPEG picture.', status: 415 };
  try { prepareImage(buf); } catch (e) { return { error: e.message, status: 415 }; }
  await fsp.mkdir(expensesDir(dataDir), { recursive: true });
  await atomicWrite(sigPath(dataDir, ext), buf, { encoding: null, mode: 0o600 });
  await fsp.rm(sigPath(dataDir, ext === 'png' ? 'jpg' : 'png'), { force: true }).catch(() => {});
  return { ok: true, ext, size: buf.length };
}
export async function removeSignature(dataDir) {
  for (const ext of ['png', 'jpg']) await fsp.rm(sigPath(dataDir, ext), { force: true }).catch(() => {});
  return { ok: true };
}

// ─── the folder ───
/** A name that is safe as one file or folder name on Windows, macOS and Linux. */
export function safeName(s, max = 60, fallback = 'Expenses') {
  let t = String(s == null ? '' : s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').replace(/[. ]+$/, '').slice(0, max).trim().replace(/[. ]+$/, '');
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(t)) t += '_';
  return t || fallback;
}
/** <home>/Documents (or the OneDrive one when that is where Documents lives). */
export function documentsDir({ home = homedir(), env = process.env } = {}) {
  const plain = join(home, 'Documents');
  if (existsSync(plain)) return plain;
  for (const k of ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial']) { if (env[k] && existsSync(join(env[k], 'Documents'))) return join(env[k], 'Documents'); }
  return plain;
}
async function makeFolder(docs, payer, today) {
  const root = join(docs, 'Expense reports');
  await fsp.mkdir(root, { recursive: true });
  const base = `${safeName(payer, 50)} ${today}`;
  for (let n = 1; n < 100; n++) {
    const dir = join(root, n === 1 ? base : `${base}-${n}`);
    if (!resolve(dir).startsWith(resolve(root) + sep)) throw new Error('That folder is not allowed.');
    try { await fsp.mkdir(dir); return dir; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  throw new Error('Too many reports for that day. Move some out of Documents/Expense reports first.');
}

/**
 * Write the report. S: the expenses store. opts: {ids, cols: {id: column}, advances, name, payer, today, docs, currency, unsigned}.
 * unsigned: leave the signature (and its date) off the form even when one is saved.
 * Returns {dir, pdf, zip|null, count, receipts, missing: [titles], total, from, to} or {error, status}.
 */
export async function makeReport(dataDir, S, { ids, cols = {}, advances = 0, name = '', payer = '', today, docs, currency = 'GBP', unsigned = false } = {}) {
  const list = [...new Set(ids || [])].filter(id => ID_RE.test(id)).map(id => S.items[id]).filter(Boolean);
  if (!list.length) return { error: 'Choose at least one expense.', status: 400 };
  const rows = reportRows(list).map(r => (typeof cols[r.id] === 'string' && COLUMN_KEYS.includes(cols[r.id]) ? { ...r, col: cols[r.id], label: LABEL[cols[r.id]] } : r));
  let signature = null;
  const sig = unsigned ? null : await readSignature(dataDir);
  if (sig) { try { signature = prepareImage(sig.buf); } catch { signature = null; } }
  const adv = Math.max(0, Math.min(1e7, Number(advances) || 0));
  const pdf = expenseReportPdf({ name: String(name || '').slice(0, 80), from: rows[0].date, to: rows[rows.length - 1].date, rows, advances: adv, signature, signedDate: signature ? today : '', currency });
  const dir = await makeFolder(docs || documentsDir(), payer || list[0].payer, today);
  await fsp.writeFile(join(dir, 'Expense report.pdf'), pdf);
  const files = [], missing = []; let k = 0;
  for (const r of rows) {
    k++;
    const e = S.items[r.id]; let n = 0;
    for (const rc of e.receipts || []) {
      if (!rc.ref) continue;
      const f = await readReceipt(dataDir, rc.ref); if (!f) continue;
      n++;
      files.push({ name: `${String(k).padStart(2, '0')} ${r.date} ${safeName(r.description, 50, 'Receipt')}${n > 1 ? ' (' + n + ')' : ''}.${rc.ref.split('.').pop()}`, data: f.buf });
    }
    if (!n) missing.push(r.description);
  }
  let zip = null;
  if (files.length) { zip = join(dir, 'Receipts.zip'); await fsp.writeFile(zip, createZip(files)); }
  return { dir, pdf: join(dir, 'Expense report.pdf'), zip, count: rows.length, receipts: files.length, missing, total: Math.round(rows.reduce((a, r) => a + r.amount, 0) * 100) / 100, from: rows[0].date, to: rows[rows.length - 1].date };
}

// ─── a made report's folder ───
export const reportsRoot = (docs) => resolve(join(docs || documentsDir(), 'Expense reports'));
/** Is this a report's own folder: directly inside Documents/Expense reports (never the root, never anywhere else)? */
export function isReportDir(dir, docs) {
  if (typeof dir !== 'string' || !dir) return false;
  const d = resolve(dir), root = reportsRoot(docs);
  return d.startsWith(root + sep) && dirname(d) === root;
}
const REPORT_FILES = ['Expense report.pdf', 'Receipts.zip'];
/**
 * Remove what a report wrote: its PDF and its zip, then the folder if that leaves it empty. Anything else the user put in
 * there stays. -> {removed, kept: the folder is still there, gone: it was not on this computer} or {error}.
 */
export async function removeReportFolder(dir, docs) {
  if (!isReportDir(dir, docs)) return { gone: true };   // made on another computer, or moved: nothing here to remove
  const d = resolve(dir);
  let st; try { st = await fsp.lstat(d); } catch { return { gone: true }; }
  if (!st.isDirectory()) return { gone: true };
  try {
    for (const f of REPORT_FILES) await fsp.rm(join(d, f), { force: true });
    if ((await fsp.readdir(d)).length) return { removed: true, kept: true };
    await fsp.rmdir(d);
    return { removed: true };
  } catch { return { error: 'That report could not be deleted. Close the PDF if it is open, then try again.' }; }
}

/** Show a folder in the file manager. An argument array, never a shell string; failures are ignored. */
export function openFolder(dir, platform = process.platform) {
  if (String(process.env.DASHBOARD_OS_EXEC || '').toLowerCase() === 'dry-run') return true;   // a test run opens no windows
  try {
    const [cmd, args] = platform === 'win32' ? ['explorer.exe', [dir]] : platform === 'darwin' ? ['open', [dir]] : ['xdg-open', [dir]];
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: false, windowsHide: false });
    child.on('error', () => {}); child.unref();
    return true;
  } catch { return false; }
}
