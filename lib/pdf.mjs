// lib/pdf.mjs - a small hand-written PDF writer (Node stdlib only: zlib), 2.19.6.
//
//   prepareImage(buf) -> image         PNG (8-bit grey, grey+alpha, RGB, RGBA, palette; not interlaced) or JPEG;
//                                      throws Error with a plain message when it cannot be used
//   expenseReportPdf({ name, from, to, rows, advances, signature, signedDate, currency }) -> Buffer
//        rows: [{ date, description, col, amount }], col one of REPORT_COLUMNS keys; 11 rows a page, the whole form again on a further page as needed
//
// Fonts are the standard Helvetica / Helvetica-Bold with WinAnsiEncoding (so the pound sign works); text is
// measured with the Helvetica widths below. Pages are A4 landscape. JPEG is embedded as DCTDecode; PNG is
// decoded with zlib and written again as FlateDecode (alpha becomes an SMask).

import { deflateSync, inflateSync } from 'node:zlib';

// ─── metrics (Adobe Helvetica AFM widths, characters 32..126) ───
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Unicode characters WinAnsi has in its 0x80-0x9F block.
const WIN = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
/** A string as a WinAnsi byte string (one char per byte), anything it cannot show becomes '?'. */
function winAnsi(s) {
  let out = '';
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c < 32 || c === 127) out += ' ';
    else if (c < 127 || (c >= 0xa0 && c <= 0xff)) out += String.fromCharCode(c);
    else out += WIN[ch] ? String.fromCharCode(WIN[ch]) : '?';
  }
  return out;
}
function widthOf(bytes, size, bold) {
  const t = bold ? W_BOLD : W_REG; let w = 0;
  for (let i = 0; i < bytes.length; i++) { const c = bytes.charCodeAt(i); w += c >= 32 && c <= 126 ? t[c - 32] : 556; }
  return w * size / 1000;
}
const esc = (b) => b.replace(/[\\()]/g, m => '\\' + m);
const num = (n) => (Math.round(n * 100) / 100).toString();

// ─── images ───
function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }

function jpegInfo(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      if (m !== 0xc0 && m !== 0xc1) throw new Error('That JPEG is a kind this form cannot use (save it as a normal JPEG or a PNG).');
      return { bits: buf[i + 4], height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), comps: buf[i + 9] };
    }
    i += 2 + len;
  }
  throw new Error('That JPEG could not be read.');
}

// Pictures (the expense-report signature) are decoded in memory: a 12 MP phone photo fits; more is refused before
// anything is allocated (an 8000 x 8000 PNG would need about 256 MB of buffers).
const IMG_MAX_SIDE = 4096, IMG_MAX_PIXELS = 13000000;
const tooBig = (w, h) => !(w > 0 && h > 0 && w <= IMG_MAX_SIDE && h <= IMG_MAX_SIDE && w * h <= IMG_MAX_PIXELS);
const TOO_BIG = 'That picture is too large (4096 x 3072 pixels at most). Make it smaller and try again.';

function pngDecode(buf) {
  const bad = () => new Error('That PNG could not be read.');
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) throw bad();
  let pos = 8, hdr = null, plte = null, trns = null; const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8);
    if (len > buf.length) break;
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR' && data.length < 13) throw bad();
    if (type === 'IHDR') hdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ct: data[9], interlace: data[12] };
    else if (type === 'PLTE') plte = data; else if (type === 'tRNS') trns = data; else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!hdr || !idat.length) throw bad();
  if (hdr.interlace) throw new Error('That PNG is interlaced. Save it again without interlacing, or use a JPEG.');
  if (hdr.depth !== 8) throw new Error('That PNG is not 8-bit. Save it again as a normal PNG or a JPEG.');
  if (tooBig(hdr.w, hdr.h)) throw new Error(TOO_BIG);
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[hdr.ct];
  if (!chans) throw new Error('That PNG is a kind this form cannot use.');
  if (hdr.ct === 3 && !plte) throw bad();
  const stride = hdr.w * chans;
  let raw;
  try { raw = inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * hdr.h + 16 }); } catch { throw bad(); }
  if (raw.length < (stride + 1) * hdr.h) throw bad();
  const px = Buffer.alloc(stride * hdr.h);
  for (let y = 0; y < hdr.h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    if (f > 4) throw bad();
    for (let x = 0; x < stride; x++) {
      const a = x >= chans ? px[dst + x - chans] : 0, b = y ? px[dst - stride + x] : 0, c = x >= chans && y ? px[dst - stride + x - chans] : 0;
      const v = raw[src + x];
      px[dst + x] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + b : f === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 255;
    }
  }
  const n = hdr.w * hdr.h; let color, alpha = null, space;
  if (hdr.ct === 0) { color = px; space = 'DeviceGray'; if (trns && trns.length >= 2) { const t = trns[1]; alpha = Buffer.alloc(n); for (let i = 0; i < n; i++) alpha[i] = px[i] === t ? 0 : 255; } }
  else if (hdr.ct === 2) { color = px; space = 'DeviceRGB'; }
  else if (hdr.ct === 4) { color = Buffer.alloc(n); alpha = Buffer.alloc(n); for (let i = 0; i < n; i++) { color[i] = px[i * 2]; alpha[i] = px[i * 2 + 1]; } space = 'DeviceGray'; }
  else if (hdr.ct === 6) { color = Buffer.alloc(n * 3); alpha = Buffer.alloc(n); for (let i = 0; i < n; i++) { color[i * 3] = px[i * 4]; color[i * 3 + 1] = px[i * 4 + 1]; color[i * 3 + 2] = px[i * 4 + 2]; alpha[i] = px[i * 4 + 3]; } space = 'DeviceRGB'; }
  else {
    color = Buffer.alloc(n * 3); alpha = trns ? Buffer.alloc(n, 255) : null; space = 'DeviceRGB';
    for (let i = 0; i < n; i++) {
      const k = px[i]; if (k * 3 + 2 >= plte.length) throw bad();
      color[i * 3] = plte[k * 3]; color[i * 3 + 1] = plte[k * 3 + 1]; color[i * 3 + 2] = plte[k * 3 + 2];
      if (alpha && k < trns.length) alpha[i] = trns[k];
    }
  }
  if (alpha && alpha.every(v => v === 255)) alpha = null;
  return { w: hdr.w, h: hdr.h, color, alpha, space };
}

/** Read a PNG or JPEG into something the writer can embed; throws a plain-English Error when it cannot. */
export function prepareImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) throw new Error('That picture could not be read.');
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    const j = jpegInfo(buf);
    if (j.bits !== 8 || ![1, 3, 4].includes(j.comps) || !j.width || !j.height) throw new Error('That JPEG could not be used.');
    if (tooBig(j.width, j.height)) throw new Error(TOO_BIG);
    return { kind: 'jpeg', w: j.width, h: j.height, comps: j.comps, data: buf };
  }
  if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return { kind: 'png', ...pngDecode(buf) };
  throw new Error('Use a PNG or a JPEG picture.');
}

// ─── the document ───
class Pdf {
  constructor() { this.bodies = [null, null, null, null, null]; this.pages = []; }   // 1 catalog, 2 pages, 3 and 4 the fonts
  reserve() { this.bodies.push(null); return this.bodies.length - 1; }
  set(id, body) { this.bodies[id] = Buffer.isBuffer(body) ? body : Buffer.from(body, 'latin1'); }
  stream(dict, data) { return Buffer.concat([Buffer.from(`<< ${dict} /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')]); }
  image(img) {
    const id = this.reserve();
    if (img.kind === 'jpeg') {
      const cs = img.comps === 1 ? '/DeviceGray' : img.comps === 3 ? '/DeviceRGB' : '/DeviceCMYK /Decode [1 0 1 0 1 0 1 0]';
      this.set(id, this.stream(`/Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode`, img.data));
      return id;
    }
    let sm = '';
    if (img.alpha) {
      const sid = this.reserve();
      this.set(sid, this.stream(`/Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, deflateSync(img.alpha)));
      sm = ` /SMask ${sid} 0 R`;
    }
    this.set(id, this.stream(`/Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /${img.space} /BitsPerComponent 8 /Filter /FlateDecode${sm}`, deflateSync(img.color)));
    return id;
  }
  build() {
    this.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
    this.set(2, `<< /Type /Pages /Count ${this.pages.length} /Kids [${this.pages.map(p => p + ' 0 R').join(' ')}] >>`);
    this.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    this.set(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const info = this.reserve(); this.set(info, '<< /Title (Expense report) /Producer (OpenDash) >>');
    const head = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1');
    const chunks = [head]; let off = head.length; const offs = [0];
    for (let id = 1; id < this.bodies.length; id++) {
      offs[id] = off;
      const part = Buffer.concat([Buffer.from(`${id} 0 obj\n`, 'latin1'), this.bodies[id], Buffer.from('\nendobj\n', 'latin1')]);
      chunks.push(part); off += part.length;
    }
    let x = `xref\n0 ${this.bodies.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < this.bodies.length; id++) x += String(offs[id]).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size ${this.bodies.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${off}\n%%EOF\n`;
    chunks.push(Buffer.from(x, 'latin1'));
    return Buffer.concat(chunks);
  }
}

/** Drawing on one page. y counts down from the top edge, as on screen. */
class Canvas {
  constructor(H) { this.H = H; this.ops = []; this.images = {}; }
  line(x1, y1, x2, y2, w = 0.6, grey = 0) { this.ops.push(`${num(grey)} G ${num(w)} w ${num(x1)} ${num(this.H - y1)} m ${num(x2)} ${num(this.H - y2)} l S`); }
  rect(x, y, w, h, lw = 0.6, fill = null) {
    if (fill != null) this.ops.push(`${num(fill)} g ${num(x)} ${num(this.H - y - h)} ${num(w)} ${num(h)} re f 0 g`);
    this.ops.push(`0 G ${num(lw)} w ${num(x)} ${num(this.H - y - h)} ${num(w)} ${num(h)} re S`);
  }
  /** Text with its baseline at y. align: left | right | center (about x). maxW shortens with "..." */
  text(s, x, y, { size = 9, bold = false, align = 'left', maxW = 0, grey = 0 } = {}) {
    const full = winAnsi(s); let b = full;
    if (maxW && widthOf(b, size, bold) > maxW) {
      while (b.length > 1 && widthOf(b + '...', size, bold) > maxW) b = b.slice(0, -1);
      b = b.replace(/\s+$/, '') + '...';
    }
    const w = widthOf(b, size, bold);
    const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    this.ops.push(`BT ${num(grey)} g /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(px)} ${num(this.H - y)} Td (${esc(b)}) Tj ET`);
  }
  wrap(s, maxW, size, bold, maxLines) {
    const words = String(s == null ? '' : s).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (!cur || widthOf(winAnsi(t), size, bold) <= maxW) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines);
  }
  image(name, x, y, w, h) { this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(this.H - y - h)} cm /${name} Do Q`); this.images[name] = true; }
  content() { return Buffer.from(this.ops.join('\n'), 'latin1'); }
}

export const REPORT_COLUMNS = Object.freeze([
  { key: 'hotel', label: 'Hotel' }, { key: 'transport', label: 'Transport' }, { key: 'fuel', label: 'Fuel' }, { key: 'meals', label: 'Meals' },
  { key: 'phone', label: 'Phone' }, { key: 'entertainment', label: 'Entertainment' }, { key: 'misc', label: 'Misc.' },
]);
export const REPORT_ROWS_PER_PAGE = 11;
const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);
const fmtDate = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : String(iso || ''));

// The employer's form, cell for cell: 24 rows and 10 columns (A-J), the same on every page.
//   1  EXPENSE REPORT (A)                                            For Office Use Only (G-J)
//   2  Name: (A) value (B-C)   PAY PERIOD (D)   FROM: (E) value (F)   TO: (G) value (H-J)
//   3-7  blank; G-J is the office's box
//   8  Date, Description, Hotel, Transport, Fuel, Meals, Phone, Entertainment, Misc., Total
//   9-19  the 11 line rows, always all drawn; only the column an amount belongs in, and Total, have a value
//   20  Total (A), the column totals (C-J)
//   21  Claimant (A)                                  SUBTOTAL (I) value (J)
//   22  Signature: (A) signature (B-C)  Date: (D) value (E-F)  ADVANCES (I) value (J)
//   23  Authorisation (A)                             TOTAL (I) value (J)
//   24  Signature: (A) (B-C)            Date: (D) (E-F)
// More than 11 expenses: the whole form again on a further page. Each page is a complete form that adds up by itself
// (its own Total row, SUBTOTAL and TOTAL); the advances come off the first page they fit on, so the TOTALs of the
// pages together are what is owed.
const FORM_ROWS = 24, FORM_RH = 22;
const FORM_WIDTHS = [68, 216, 60, 62, 60, 60, 60, 74, 60, 66];   // A-J: proportional, Description widest (adds to 786)

/** The employer's expense report form, filled in. See the header for the arguments. Returns the PDF bytes. */
export function expenseReportPdf({ name = '', from = '', to = '', rows = [], advances = 0, signature = null, signedDate = '', currency = 'GBP' } = {}) {
  const PW = 842, PH = 595, M = 28, RH = FORM_RH, TOP = (PH - FORM_ROWS * RH) / 2, PAD = 4;
  const cur = currency === 'GBP' ? '£' : currency + ' ';
  const mny = (p) => (p < 0 ? '-' : '') + cur + money(Math.abs(p) / 100);   // p: pence
  const doc = new Pdf();
  const sigId = signature ? doc.image(signature) : 0;
  const xs = [M]; for (const w of FORM_WIDTHS) xs.push(xs[xs.length - 1] + w);
  const rowTop = (n) => TOP + (n - 1) * RH;   // n: the form's row, 1-24
  const base = (n) => rowTop(n) + RH / 2 + 3.2;
  const list = rows.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const pageCount = Math.max(1, Math.ceil(list.length / REPORT_ROWS_PER_PAGE));
  const colIndex = (k) => { const i = REPORT_COLUMNS.findIndex(c => c.key === k); return i < 0 ? REPORT_COLUMNS.length - 1 : i; };
  const pence = (n) => Math.round((Number(n) || 0) * 100);
  let advLeft = Math.max(0, pence(advances));

  for (let p = 0; p < pageCount; p++) {
    const c = new Canvas(PH);
    const last = p === pageCount - 1;
    const pageRows = list.slice(p * REPORT_ROWS_PER_PAGE, (p + 1) * REPORT_ROWS_PER_PAGE);
    const sums = new Array(REPORT_COLUMNS.length).fill(0); let sub = 0;
    for (const r of pageRows) { const v = pence(r.amount); sums[colIndex(r.col)] += v; sub += v; }
    const adv = last ? advLeft : Math.min(advLeft, sub); advLeft -= adv;

    const label = (s, col, row, o = {}) => c.text(s, xs[col] + PAD, base(row), { size: 9, bold: true, ...o });
    // Money in a cell, right-aligned; a huge amount shrinks to fit rather than being cut.
    const amount = (s, col, row, o = {}) => {
      const room = FORM_WIDTHS[col] - 2 * PAD; let size = o.size || 9;
      while (size > 5 && widthOf(winAnsi(s), size, !!o.bold) > room) size -= 0.5;
      c.text(s, xs[col + 1] - PAD, base(row), { ...o, size, align: 'right' });
    };
    const box = (a, b, r1, r2, lw = 0.6, fill = null) => c.rect(xs[a], rowTop(r1), xs[b + 1] - xs[a], rowTop(r2 + 1) - rowTop(r1), lw, fill);
    const under = (a, b, row) => c.line(xs[a] + PAD, rowTop(row + 1) - 3, xs[b + 1] - PAD, rowTop(row + 1) - 3, 0.5);

    // Rows 1 and 2, and the office's box on rows 3-7.
    c.text('EXPENSE REPORT', xs[0] + PAD, base(1) + 2, { size: 16, bold: true });
    box(6, 9, 1, 1, 0.8, 0.9);
    c.text('For Office Use Only', (xs[6] + xs[10]) / 2, base(1), { size: 9, bold: true, align: 'center' });
    label('Name:', 0, 2); under(1, 2, 2); c.text(name, xs[1] + PAD, base(2), { size: 9.5, maxW: xs[3] - xs[1] - 2 * PAD });
    label('PAY PERIOD', 3, 2, { size: 8.5 });
    label('FROM:', 4, 2); under(5, 5, 2); c.text(fmtDate(from), xs[5] + PAD, base(2), { size: 9, maxW: FORM_WIDTHS[5] - 2 * PAD });
    label('TO:', 6, 2); under(7, 9, 2); c.text(fmtDate(to), xs[7] + PAD, base(2), { size: 9.5 });
    box(6, 9, 3, 7, 0.8);

    // Rows 8-20: the grid.
    c.rect(xs[0], rowTop(8), xs[10] - xs[0], RH, 0.8, 0.9);
    c.rect(xs[0], rowTop(20), xs[10] - xs[0], RH, 0.8, 0.95);
    ['Date', 'Description', ...REPORT_COLUMNS.map(k => k.label), 'Total'].forEach((l, i) => c.text(l, (xs[i] + xs[i + 1]) / 2, base(8), { size: 9, bold: true, align: 'center' }));
    pageRows.forEach((r, i) => {
      const row = 9 + i, v = pence(r.amount);
      c.text(fmtDate(r.date), xs[0] + PAD, base(row), { size: 9, maxW: FORM_WIDTHS[0] - 2 * PAD });
      const room = FORM_WIDTHS[1] - 2 * PAD;
      if (widthOf(winAnsi(r.description), 9, false) <= room) c.text(r.description, xs[1] + PAD, base(row), { size: 9 });
      else {
        const lines = c.wrap(r.description, room, 7.5, false, 99);
        const two = lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines;
        two.forEach((l, k) => c.text(l, xs[1] + PAD, rowTop(row) + (two.length === 1 ? RH / 2 + 3 : 9.4 + k * 8.6), { size: 7.5, maxW: room }));
      }
      amount(mny(v), 2 + colIndex(r.col), row);
      amount(mny(v), 9, row);
    });
    for (let row = 9 + pageRows.length; row <= 19; row++) amount(mny(0), 9, row);   // the form's unused rows read £0.00 in Total
    label('Total', 0, 20, { size: 9.5 });
    sums.forEach((v, i) => amount(mny(v), 2 + i, 20, { bold: true }));
    amount(mny(sub), 9, 20, { bold: true });
    c.rect(xs[0], rowTop(8), xs[10] - xs[0], rowTop(21) - rowTop(8), 0.9);
    for (let i = 1; i < xs.length - 1; i++) c.line(xs[i], rowTop(8), xs[i], rowTop(21), 0.5);
    for (let n = 9; n <= 20; n++) c.line(xs[0], rowTop(n), xs[10], rowTop(n), n === 9 || n === 20 ? 0.8 : 0.4);

    // Rows 21-24: who signs on the left, the sums in I and J.
    [[21, 'SUBTOTAL', sub, false], [22, 'ADVANCES', adv, false], [23, 'TOTAL', sub - adv, true]].forEach(([row, l, v, strong]) => {
      box(8, 8, row, row, 0.8, strong ? 0.9 : null); box(9, 9, row, row, 0.8, strong ? 0.9 : null);
      c.text(l, xs[9] - PAD, base(row), { size: 8.5, bold: true, align: 'right' });
      amount(mny(v), 9, row, { bold: strong });
    });
    label('Claimant', 0, 21);
    c.text('Signature:', xs[0] + PAD, base(22), { size: 9 }); under(1, 2, 22);
    c.text('Date:', xs[3] + PAD, base(22), { size: 9 }); under(4, 5, 22);
    if (signedDate) c.text(fmtDate(signedDate), xs[4] + PAD, base(22), { size: 9 });
    if (sigId) {
      // Sits on the line; Claimant's row above it is empty in B and C, so a signature may rise into it.
      const k = Math.min((xs[3] - xs[1] - 2 * PAD) / signature.w, (1.75 * RH - 4) / signature.h);
      c.image('Sig', xs[1] + PAD, rowTop(23) - 3 - signature.h * k, signature.w * k, signature.h * k);
    }
    label('Authorisation', 0, 23);
    c.text('Signature:', xs[0] + PAD, base(24), { size: 9 }); under(1, 2, 24);
    c.text('Date:', xs[3] + PAD, base(24), { size: 9 }); under(4, 5, 24);

    const cid = doc.reserve(); doc.set(cid, doc.stream('/Filter /FlateDecode', deflateSync(c.content())));
    const pid = doc.reserve();
    const xo = c.images.Sig && sigId ? ` /XObject << /Sig ${sigId} 0 R >>` : '';
    doc.set(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo} >> /Contents ${cid} 0 R >>`);
    doc.pages.push(pid);
  }
  return doc.build();
}
