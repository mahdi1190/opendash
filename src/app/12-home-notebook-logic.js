/* ============================================================
   DAILY NOTE LOGIC (pure). Owner: the "notebook" widget builder
   (WIDGETS_CATALOGUE.md 3.15). One running markdown note per day:
   state.daynotes = {'YYYY-MM-DD': {md, updatedAt}} (a data key, so every
   save is one undo step). Shared by the Home widget (12-home-w-notebook.js),
   the page store (12-home-daynotes.js) and the server: lib/daynotes.mjs
   evaluates this file for Node (the daynote.save op and the daynotes.get
   query), so the page and the server follow one rule.
   No DOM, no clock and no page globals (tests/home-w-notebook.test.mjs).

     DAYNOTE_MAX                       10,000 characters per day
     dnIsDate(s)                       'YYYY-MM-DD'
     dnNorm(md)                        CRLF -> LF (the stored form)
     dnCheck(md)                       null | what is wrong (too long)
     dnAddDays(iso, n), dnStrip(today, n)   day arithmetic; the last n days, oldest first
     dnOnThisDay(iso)                  {month, year}: the same date last month / last year
     dnHM(minutes)                     'HH:MM'
     dnTimeLine(text, hm)              '- HH:MM text' (the S size's Write)
     dnAppend(md, line)                md + line on a line of its own
     dnLastLine(md)                    the newest line worth showing ('' when none)
     dnShow(line)                      a line without its list marker ('- 10:42 x' -> '10:42 x')
     dnTasks(md)                       checkbox lines: [{line, text, done, made}]
     dnMarkTask(md, line, text)        '- [ ] text' -> '- [x] text (task)' | null (gone)
     dnTaskTitle(text)                 a checkbox line as a task title (no markdown marks)
     dnInsertTime(v, s, e, hm)         Insert time at the caret -> {value, caret}
     dnEnterContinue(v, s, e)          Enter in a list keeps the list going -> {value, caret} | null
     dnMerge3(base, local, remote)     the other copy's line changes applied onto this one
     dnSearch(notes, q, o)             [{date, line, text}] newest day first
     dnPart(hour), dnPlaceholder(o)    the time-of-day prompt
     dnTemplate(tpl, label)            a new day's template ({date} -> the day)
     dnSaveDelay(o)                    when the autosave runs (1.5 s idle, at most every 20 s while focused)
   ============================================================ */
const DAYNOTE_MAX = 10000;
const DAYNOTE_IDLE_MS = 1500;          // save this long after typing stops...
const DAYNOTE_FOCUS_GAP_MS = 20000;    // ...but at most once every 20 s while the editor has focus (undo snapshots hold the whole state)
const _DN_DATE = /^\d{4}-\d{2}-\d{2}$/;
const _DN_TASK = /^(\s*[-*+]\s+)\[([ xX])\]\s+(.*)$/;
const _DN_MADE = /\s\(task\)\s*$/;

function dnIsDate(s) {
  if (typeof s !== 'string' || !_DN_DATE.test(s)) return false;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;   // clock-ok: pure ISO check (UTC)
}
function dnNorm(md) { return String(md == null ? '' : md).replace(/\r\n?/g, '\n'); }
function dnCheck(md) {
  const n = dnNorm(md).length;
  return n > DAYNOTE_MAX ? `A day's note holds up to ${DAYNOTE_MAX.toLocaleString('en-GB')} characters (this one has ${n.toLocaleString('en-GB')}).` : null;
}

/* ---------- days ---------- */
function dnAddDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);   // clock-ok: pure ISO arithmetic (UTC)
}
/** The last n days ending on `today`, oldest first. */
function dnStrip(today, n) {
  const out = [];
  for (let i = Math.max(1, n | 0) - 1; i >= 0; i--) out.push(dnAddDays(today, -i));
  return out;
}
/** The same date last month and last year (clamped to the month's end: 31 Mar -> 28/29 Feb). */
function dnOnThisDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const clamp = (yy, mm) => {             // mm 1..12
    const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
  };
  const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
  return { month: clamp(py, pm), year: clamp(y - 1, m) };
}
function dnHM(min) {
  const m = ((Math.round(Number(min) || 0) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/* ---------- lines ---------- */
function dnTimeLine(text, hm) {
  const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  return t ? `- ${hm} ${t}` : '';
}
function dnAppend(md, line) {
  const cur = dnNorm(md), add = dnNorm(line);
  if (!add) return cur;
  if (!cur.trim()) return add;
  return cur.replace(/\n*$/, '') + '\n' + add;
}
function dnLastLine(md) {
  const lines = dnNorm(md).split('\n').map(l => l.trim()).filter(l => l && !/^(-{3,}|\*{3,}|_{3,})$/.test(l));
  return lines.length ? lines[lines.length - 1] : '';
}
/** A line as plain words: no list marker, checkbox or heading hashes. */
function dnShow(line) {
  return String(line || '').trim().replace(/^#{1,6}\s+/, '').replace(/^[-*+•]\s+(\[[ xX]\]\s+)?/, '').replace(/^\d+[.)]\s+/, '').trim();
}
/** Checkbox lines ('- [ ] x', '- [x] x'): made = ticked by Make task ('(task)' at the end). */
function dnTasks(md) {
  const out = [];
  dnNorm(md).split('\n').forEach((raw, line) => {
    const m = _DN_TASK.exec(raw);
    if (!m) return;
    const done = m[2] !== ' ';
    const text = m[3].trim();
    if (!text) return;
    out.push({ line, text: done ? text.replace(_DN_MADE, '').trim() : text, done, made: done && _DN_MADE.test(text) });
  });
  return out;
}
/** Make task's mark: the open line `line` (or, when the note moved, the first open line with that text). null = gone. */
function dnMarkTask(md, line, text) {
  const lines = dnNorm(md).split('\n');
  const open = (i) => { const m = _DN_TASK.exec(lines[i] || ''); return m && m[2] === ' ' && m[3].trim() === text ? m : null; };
  let i = Number.isInteger(line) && open(line) ? line : -1;
  if (i < 0) i = lines.findIndex((_, k) => open(k));
  if (i < 0) return null;
  const m = open(i);
  lines[i] = `${m[1]}[x] ${m[3].trim()} (task)`;
  return lines.join('\n');
}

/** A checkbox line's words as a task title: markdown emphasis, code ticks and link syntax go. */
function dnTaskTitle(text) {
  return String(text || '').replace(/\[([^\]]+)\]\((?:[^)\s]+)\)/g, '$1').replace(/(\*\*|__|`|~~)/g, '').replace(/(^|\s)[*_]([^*_\s][^*_]*?)[*_](?=\s|$)/g, '$1$2').replace(/\s+/g, ' ').trim();
}

/* ---------- editing ---------- */
/** Insert time: '- HH:MM ' on a new line at the caret (or on the empty line the caret is on). */
function dnInsertTime(value, s, e, hm) {
  const v = String(value || '');
  s = Math.max(0, Math.min(s == null ? v.length : s, v.length));
  e = Math.max(s, Math.min(e == null ? s : e, v.length));
  const before = v.slice(0, s), after = v.slice(e);
  const lineStart = before.lastIndexOf('\n') + 1;
  const onEmpty = !before.slice(lineStart).trim();
  const stamp = `- ${hm} `;
  const lead = onEmpty ? before.slice(0, lineStart) : before.replace(/[ \t]+$/, '') + '\n';
  const tail = after && !after.startsWith('\n') ? '\n' + after.replace(/^[ \t]+/, '') : after;
  return { value: lead + stamp + tail, caret: lead.length + stamp.length };
}
/**
 * Enter at the end of a list line continues the list ('- ', '- [ ] ', '1. ' -> '2. '); Enter on
 * an empty item ends the list (the marker goes). null = a plain Enter (not in a list, a selection,
 * or the caret in the middle of the line).
 */
function dnEnterContinue(value, s, e) {
  const v = String(value || '');
  if (s == null || s !== e) return null;
  const lineStart = v.lastIndexOf('\n', s - 1) + 1;
  let lineEnd = v.indexOf('\n', s); if (lineEnd < 0) lineEnd = v.length;
  if (v.slice(s, lineEnd).trim()) return null;                         // the caret is mid-line
  const line = v.slice(lineStart, s);
  const m = /^(\s*)([-*+]|(\d+)[.)])(\s+)(\[[ xX]\]\s+)?(.*)$/.exec(line);
  if (!m) return null;
  if (!m[6].trim()) {                                                  // an empty item: end the list
    const value2 = v.slice(0, lineStart) + v.slice(lineEnd);
    return { value: value2, caret: lineStart };
  }
  const marker = m[3] ? `${Number(m[3]) + 1}${m[2].slice(-1)}` : m[2];
  const next = `\n${m[1]}${marker}${m[4]}${m[5] ? '[ ] ' : ''}`;
  return { value: v.slice(0, s) + next + v.slice(lineEnd), caret: s + next.length };
}

/* ---------- merging two copies of one day (live sync, an assistant's append) ---------- */
/** Line diff base -> other: hunks {at (base index of the first replaced line), del: [...], ins: [...], after (base index before it, -1)}. */
function _dnHunks(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hunks = [];
  let i = 0, j = 0, cur = null;
  const flush = () => { if (cur && (cur.del.length || cur.ins.length)) hunks.push(cur); cur = null; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { flush(); i++; j++; continue; }
    if (!cur) cur = { at: i, after: i - 1, del: [], ins: [] };
    if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) cur.ins.push(b[j++]);
    else cur.del.push(a[i++]);
  }
  flush();
  return hunks;
}
function _dnFind(lines, seq, from) {
  outer: for (let k = Math.max(0, from); k + seq.length <= lines.length; k++) {
    for (let t = 0; t < seq.length; t++) if (lines[k + t] !== seq[t]) continue outer;
    return k;
  }
  return -1;
}
/**
 * Three-way merge of one day's note: what changed between `base` and `remote` is applied onto
 * `local` (this editor's text) where those lines are still as they were; nothing local is lost.
 * An insertion goes after the line it followed; a change to lines edited here too keeps this
 * side and adds the other side's new lines at the end.
 */
function dnMerge3(base, local, remote) {
  base = dnNorm(base); local = dnNorm(local); remote = dnNorm(remote);
  if (local === remote || remote === base) return local;
  if (local === base) return remote;
  const B = base ? base.split('\n') : [], R = remote ? remote.split('\n') : [];
  const out = local ? local.split('\n') : [];
  if (B.length * R.length > 400000) {                                  // too big to diff cheaply: keep ours + their new lines
    const have = new Set(out), old = new Set(B);
    return dnAppend(local, R.filter(l => l.trim() && !old.has(l) && !have.has(l)).join('\n'));
  }
  const extra = [];
  let pos = 0;
  for (const h of _dnHunks(B, R)) {
    if (h.del.length) {
      const k = _dnFind(out, h.del, 0);
      if (k >= 0) { out.splice(k, h.del.length, ...h.ins); pos = k + h.ins.length; continue; }
      for (const l of h.ins) if (l.trim() && !out.includes(l)) extra.push(l);   // edited here too: keep ours
      continue;
    }
    const ins = h.ins.filter(l => !l.trim() || !out.includes(l));
    if (!ins.some(l => l.trim())) continue;
    const anchor = h.after >= 0 ? B[h.after] : null;
    let at = anchor == null ? 0 : out.indexOf(anchor, Math.max(0, pos - 1));
    if (anchor != null && at < 0) at = out.indexOf(anchor);
    if (anchor != null && at < 0) { extra.push(...ins.filter(l => l.trim())); continue; }
    const k = anchor == null ? 0 : at + 1;
    out.splice(k, 0, ...ins);
    pos = k + ins.length;
  }
  let res = out.join('\n');
  if (extra.length) res = dnAppend(res, extra.join('\n'));
  return res;
}

/* ---------- search, prompts, templates ---------- */
/** Lines containing every word of q (any case), newest day first: [{date, line, text}]. o: {limit 30, perDay 3}. */
function dnSearch(notes, q, o) {
  o = o || {};
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || !notes || typeof notes !== 'object') return [];
  const limit = o.limit || 30, perDay = o.perDay || 3;
  const out = [];
  for (const date of Object.keys(notes).filter(dnIsDate).sort().reverse()) {
    const e = notes[date];
    const md = e && typeof e.md === 'string' ? e.md : '';
    let n = 0;
    const lines = dnNorm(md).split('\n');
    for (let line = 0; line < lines.length && n < perDay; line++) {
      const low = lines[line].toLowerCase();
      if (!lines[line].trim() || !words.every(w => low.includes(w))) continue;
      out.push({ date, line, text: lines[line].trim() });
      n++;
      if (out.length >= limit) return out;
    }
  }
  return out;
}
function dnPart(hour) { const h = Number(hour) || 0; return h < 12 ? 'morning' : h < 17 ? 'day' : 'evening'; }
/** o: {hour, rel: 0 today, -1 a past day, 1 a later day}. */
function dnPlaceholder(o) {
  o = o || {};
  if (o.rel < 0) return 'Nothing written on this day. Add what you remember.';
  if (o.rel > 0) return 'Plans for this day…';
  const p = dnPart(o.hour);
  return p === 'morning' ? "What's the plan?" : p === 'day' ? 'What did you try or decide?' : 'What did you learn today?';
}
function dnTemplate(tpl, label) { return dnNorm(tpl).replace(/\{date\}/g, String(label || '')); }
/** Milliseconds until the autosave: {now, lastInput, lastSave, focused}. Unfocused (blur): now. */
function dnSaveDelay(o) {
  if (!o || !o.focused) return 0;
  const at = Math.max((o.lastInput || 0) + DAYNOTE_IDLE_MS, (o.lastSave || 0) + DAYNOTE_FOCUS_GAP_MS);
  return Math.max(0, at - (o.now || 0));
}
