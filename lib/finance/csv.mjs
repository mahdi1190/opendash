// lib/finance/csv.mjs - CSV reading and writing with the behaviour of
// Python's csv module (excel dialect), which the finance store was written
// with. Node stdlib only.
//
//   readRows(text)               -> string[][]  (csv.reader; blank lines give [])
//   dictRows(text)               -> {fieldnames, rows}  (csv.DictReader)
//   csvLine(values)              -> one line, QUOTE_MINIMAL, no terminator
//   writeCsv(fields, rows)       -> text with \r\n line ends (csv.DictWriter)

/**
 * Parse CSV text like Python's csv.reader over a file opened with newline=''.
 * Record ends: \r\n, \n or \r outside quotes. A blank line is an empty record.
 * strict=False rules: text after a closing quote is kept; an unterminated
 * quote at the end keeps what it has.
 */
export function readRows(text) {
  const rows = [];
  let row = [], field = '', state = 'start';   // start | field | quoted | quote | eol
  let lastNl = '', ateLf = false;               // after a record end: "\r\n" is one line end
  const endField = () => { row.push(field); field = ''; };
  const endRecord = () => { rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nl = c === '\n' || c === '\r';
    if (nl && state !== 'quoted' && state !== 'eol') { lastNl = c; ateLf = false; }
    switch (state) {
      case 'eol':
        if (c === '\n' && lastNl === '\r' && !ateLf) { ateLf = true; continue; }
        if (nl) { endRecord(); lastNl = c; ateLf = false; continue; }   // a blank line: []
        state = 'start';
        // falls through
      case 'start':
        if (nl) { endRecord(); state = 'eol'; continue; }
        state = 'sfield';
        // falls through
      case 'sfield':
        if (nl) { endField(); endRecord(); state = 'eol'; }
        else if (c === '"') state = 'quoted';
        else if (c === ',') { endField(); state = 'sfield'; }
        else { field += c; state = 'field'; }
        break;
      case 'field':
        if (nl) { endField(); endRecord(); state = 'eol'; }
        else if (c === ',') { endField(); state = 'sfield'; }
        else field += c;
        break;
      case 'quoted':
        if (c === '"') state = 'quote';
        else field += c;
        break;
      case 'quote':
        if (c === '"') { field += '"'; state = 'quoted'; }
        else if (c === ',') { endField(); state = 'sfield'; }
        else if (nl) { endField(); endRecord(); state = 'eol'; }
        else { field += c; state = 'field'; }
        break;
    }
  }
  // End of data.
  if (state === 'field' || state === 'quote' || state === 'quoted' || (state === 'sfield' && row.length)) { endField(); endRecord(); }
  else if (state === 'sfield') { endField(); endRecord(); }
  return rows;
}

/**
 * csv.DictReader: the first record is the header; blank records are skipped;
 * missing values are null (restval None); duplicate header names: the last
 * column wins. Returns rows as Maps keyed by the header text.
 */
export function dictRows(text) {
  const all = readRows(text);
  let i = 0;
  while (i < all.length && all[i].length === 0) i++;
  if (i >= all.length) return { fieldnames: null, rows: [] };
  const fieldnames = all[i];
  const rows = [];
  for (const r of all.slice(i + 1)) {
    if (!r.length) continue;
    const m = new Map();
    fieldnames.forEach((f, k) => m.set(f, k < r.length ? r[k] : null));
    rows.push(m);
  }
  return { fieldnames, rows };
}

/** One CSV field, quoted only when it has to be (QUOTE_MINIMAL). */
export function csvField(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvLine = (values) => (values.length === 1 && (values[0] == null || values[0] === '') ? '""' : values.map(csvField).join(','));

/** csv.DictWriter(fieldnames) + writeheader + writerows, \r\n line ends. */
export function writeCsv(fields, rows, cell = (r, k) => r[k]) {
  const out = [csvLine(fields)];
  for (const r of rows) out.push(csvLine(fields.map(k => cell(r, k))));
  return out.join('\r\n') + '\r\n';
}
