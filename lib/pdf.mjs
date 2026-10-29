// lib/pdf.mjs - a small hand-written PDF writer (Node stdlib only: zlib), 2.19.6.
//
//   prepareImage(buf) -> image         PNG (8-bit grey, grey+alpha, RGB, RGBA, palette; not interlaced) or JPEG;
//                                      throws Error with a plain message when it cannot be used
//   expenseReportPdf({ name, from, to, rows, advances, signature, signedDate, currency }) -> Buffer
//        rows: [{ date, description, col, amount }], col one of REPORT_COLUMNS keys; 11 rows a page, more pages as needed
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
    const words = winAnsi(s).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (!cur || widthOf(t, size, bold) <= maxW) cur = t; else { lines.push(cur); cur = w; } }
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

/** The employer's expense report form, filled in. See the header for the arguments. Returns the PDF bytes. */
export function expenseReportPdf({ name = '', from = '', to = '', rows = [], advances = 0, signature = null, signedDate = '', currency = 'GBP' } = {}) {
  const PW = 842, PH = 595, M = 36, TW = PW - 2 * M;
  const cur = currency === 'GBP' ? '£' : currency + ' ';
  const mny = (n) => cur + money(n);
  const doc = new Pdf();
  const sigId = signature ? doc.image(signature) : 0;
  const widths = [62, 188, 62, 62, 62, 62, 62, 76, 62, 72];   // Date, Description, the 7 columns, Total (adds to 770)
  const xs = [M]; for (const w of widths) xs.push(xs[xs.length - 1] + w);
  const HEAD = 24, RH = 23;
  const list = rows.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const pageCount = Math.max(1, Math.ceil(list.length / REPORT_ROWS_PER_PAGE));
  const colIndex = (k) => { const i = REPORT_COLUMNS.findIndex(c => c.key === k); return i < 0 ? REPORT_COLUMNS.length - 1 : i; };
  const sums = new Array(REPORT_COLUMNS.length).fill(0); let grand = 0;
  for (const r of list) { const p = Math.round(Number(r.amount) * 100); sums[colIndex(r.col)] += p; grand += p; }
  const adv = Math.round((Number(advances) || 0) * 100);

  for (let p = 0; p < pageCount; p++) {
    const c = new Canvas(PH);
    const last = p === pageCount - 1;
    c.text('EXPENSE REPORT', M, M + 22, { size: 22, bold: true });
    if (pageCount > 1) c.text(`Page ${p + 1} of ${pageCount}`, M, M + 40, { size: 8, grey: 0.4 });
    c.rect(PW - M - 170, M - 4, 170, 52);
    c.text('For Office Use Only', PW - M - 85, M + 9, { size: 8, bold: true, align: 'center' });
    c.line(PW - M - 170, M + 14, PW - M, M + 14, 0.4);
    const ny = 104;
    c.text('Name:', M, ny, { size: 10, bold: true });
    c.line(M + 40, ny + 3, M + 330, ny + 3, 0.5); c.text(name, M + 44, ny, { size: 10, maxW: 282 });
    c.text('PAY PERIOD FROM:', M + 370, ny, { size: 10, bold: true });
    c.line(M + 482, ny + 3, M + 580, ny + 3, 0.5); c.text(fmtDate(from), M + 486, ny, { size: 10 });
    c.text('TO:', M + 598, ny, { size: 10, bold: true });
    c.line(M + 618, ny + 3, M + 716, ny + 3, 0.5); c.text(fmtDate(to), M + 622, ny, { size: 10 });
    const top = 122;
    const labels = ['Date', 'Description', ...REPORT_COLUMNS.map(k => k.label), 'Total'];
    c.rect(M, top, TW, HEAD, 0.8, 0.9);
    labels.forEach((l, i) => c.text(l, (xs[i] + xs[i + 1]) / 2, top + 15.5, { size: 9, bold: true, align: 'center' }));
    const pageRows = list.slice(p * REPORT_ROWS_PER_PAGE, (p + 1) * REPORT_ROWS_PER_PAGE);
    const rTop = top + HEAD;
    for (let i = 0; i < pageRows.length; i++) {
      const y = rTop + i * RH, r = pageRows[i];
      c.text(fmtDate(r.date), xs[0] + 4, y + 15, { size: 9 });
      const lines = c.wrap(r.description, widths[1] - 8, 8.5, false, 2);
      if (lines.length > 1) lines.forEach((l, k) => c.text(l, xs[1] + 4, y + 10 + k * 9.5, { size: 8.5, maxW: widths[1] - 8 }));
      else if (lines.length) c.text(lines[0], xs[1] + 4, y + 15, { size: 9, maxW: widths[1] - 8 });
      c.text(mny(r.amount), xs[2 + colIndex(r.col) + 1] - 5, y + 15, { size: 9, align: 'right' });
      c.text(mny(r.amount), xs[10] - 5, y + 15, { size: 9, align: 'right' });
    }
    const bottom = rTop + REPORT_ROWS_PER_PAGE * RH, gridEnd = bottom + (last ? RH : 0);
    c.rect(M, top, TW, gridEnd - top, 0.9);
    for (let i = 1; i < xs.length - 1; i++) c.line(xs[i], top, xs[i], gridEnd, 0.5);
    for (let i = 0; i <= REPORT_ROWS_PER_PAGE + (last ? 1 : 0); i++) c.line(M, rTop + i * RH, PW - M, rTop + i * RH, i === 0 ? 0.8 : 0.4);
    if (!last) {
      c.text('Continued on the next page', PW - M, bottom + 16, { size: 8, align: 'right', grey: 0.4 });
    } else {
      c.text('Total', xs[0] + 4, bottom + 15, { size: 9.5, bold: true });
      sums.forEach((s, i) => c.text(mny(s / 100), xs[2 + i + 1] - 5, bottom + 15, { size: 9, bold: true, align: 'right' }));
      c.text(mny(grand / 100), xs[10] - 5, bottom + 15, { size: 9, bold: true, align: 'right' });
      const bx = xs[8], bw = xs[9] - xs[8], vx = xs[9], vw = xs[10] - xs[9];
      let y = bottom + RH + 8;
      [['SUBTOTAL', grand], ['ADVANCES', adv], ['TOTAL', grand - adv]].forEach(([l, v], i) => {
        const h = 20, strong = i === 2;
        c.rect(bx, y, bw, h, 0.8, strong ? 0.9 : null); c.rect(vx, y, vw, h, 0.8, strong ? 0.9 : null);
        c.text(l, bx + bw - 6, y + 14, { size: 9, bold: true, align: 'right' });
        c.text(mny(v / 100), vx + vw - 5, y + 14, { size: 9.5, bold: strong, align: 'right' });
        y += h;
      });
      const sy = 498;
      c.text('Claimant', M, sy + 20, { size: 10, bold: true });
      c.text('Signature:', M + 70, sy + 20, { size: 10 });
      c.line(M + 130, sy + 24, M + 400, sy + 24, 0.6);
      c.text('Date:', M + 430, sy + 20, { size: 10 });
      c.line(M + 462, sy + 24, M + 590, sy + 24, 0.6);
      if (signedDate) c.text(fmtDate(signedDate), M + 468, sy + 20, { size: 10 });
      if (sigId) {
        const k = Math.min(250 / signature.w, 36 / signature.h);
        c.image('Sig', M + 135, sy + 22 - signature.h * k, signature.w * k, signature.h * k);
      }
      const ay = sy + 40;
      c.text('Authorisation', M, ay + 20, { size: 10, bold: true });
      c.text('Signature:', M + 90, ay + 20, { size: 10 });
      c.line(M + 150, ay + 24, M + 400, ay + 24, 0.6);
      c.text('Date:', M + 430, ay + 20, { size: 10 });
      c.line(M + 462, ay + 24, M + 590, ay + 24, 0.6);
    }
    const cid = doc.reserve(); doc.set(cid, doc.stream('/Filter /FlateDecode', deflateSync(c.content())));
    const pid = doc.reserve();
    const xo = c.images.Sig && sigId ? ` /XObject << /Sig ${sigId} 0 R >>` : '';
    doc.set(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo} >> /Contents ${cid} 0 R >>`);
    doc.pages.push(pid);
  }
  return doc.build();
}
