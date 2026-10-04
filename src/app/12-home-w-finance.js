/* ============================================================
   HOME widget "finance": Money - spent today, this week and this month
   against what is usual, a 30-day sparkline, the top category, the last
   payments and (L) category bars and bills due soon.
   Owner: HB4 (finance, people, waiting). CSS: 13-home-w-glances.css.

   Data: GET /api/finance (the Finances page's own endpoint, read-only),
   cached 5 minutes; homeFinGlance() turns analysis.json into the glance with
   the Finances page's rules, so the numbers match it:
     spending   rows outside exclude_from_spending (refunds count against it),
                as the Spent KPI adds them up (src/finance/02-model.js)
     usual      the median of earlier periods' running totals to the same day
                (calendar months: up to 6; weeks: up to 8), only periods that
                start inside the data: the Overview's usual pace in month mode
                (src/finance/25-money-model.js bands)
     a usual day   a usual week / 7
     bills      the recurring rules of 02-model.js detectRecurring, due in the
                next 14 days (the Upcoming card's window)
   tests/home-glances.test.mjs checks it against a fixture and against MBM.
   Gated: config.features.finance === false hides it; no finance data yet ->
   the greyed "connect" state (ctx.off). window.FinSymbols (67-fin-symbols.js)
   draws merchant tiles and category icons when it is there; else monograms.
   Sizes: S stacked; M numbers left, chart and payments right; L three
   columns plus category bars and bills due soon. Under 250 px of width it
   is a tile (today, this month, the month meter).
   ============================================================ */
let _hbFin = { at: 0, loading: false, status: null, glance: null, err: null, key: '' };

registerHomeWidget({
  id: 'finance', title: 'Money', icon: 'wallet', order: 60, gate: 'finance',
  description: 'Spent today, this week and this month against what is usual, with the latest payments',
  sizes: ['s', 'm', 'l'], defaultSize: 's',
  render(el, ctx) { return _hbFinRender(el, ctx || {}); },
});

/* ---------- the glance (pure; no DOM, no page globals) ---------- */
const _HB_DAY = 864e5;
function _hbDnum(iso) { return Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / _HB_DAY); }
function _hbDiso(n) { return new Date(n * _HB_DAY).toISOString().slice(0, 10); }   // clock-ok: a day number to its ISO date (UTC arithmetic)
function _hbR2(x) { return Math.round(x * 100) / 100; }
function _hbMed(a) { if (!a.length) return 0; const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function _hbMonthIdx(n) { const d = new Date(n * _HB_DAY); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }
function _hbMonthStart(mi) { return Math.round(Date.UTC(Math.floor(mi / 12), mi % 12, 1) / _HB_DAY); }
// Money days are HOME days (banks date transactions at home; travel spec 2.3): Clock's home
// day when the page's Clock is there, else the Date's own day.
function _hbLocalIso(d) {
  if (!d && typeof Clock !== 'undefined') return Clock.today(Clock.home());
  d = d || new Date(Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;   // clock-ok: the Date given (or no Clock)
}
const _HB_FREQS = [
  { p: 7, tol: 1.5, label: 'Weekly', min: 3 }, { p: 14, tol: 2, label: 'Fortnightly', min: 3 },
  { p: 30.44, tol: 4, label: 'Monthly', min: 2 }, { p: 91, tol: 10, label: 'Quarterly', min: 2 },
  { p: 365, tol: 25, label: 'Yearly', min: 2 },
];
/** Recurring payments, the rules of src/finance/02-model.js detectRecurring (spend rows, newest first). */
function _hbRecurring(tx, pipeline, anchor) {
  const byM = new Map(), cats = new Map();
  for (const t of tx) {
    let c = cats.get(t.m); if (!c) { c = {}; cats.set(t.m, c); } c[t.c] = (c[t.c] || 0) + 1;
    if (t.s <= 0) continue;
    if (!byM.has(t.m)) byM.set(t.m, []);
    byM.get(t.m).push(t);
  }
  const catOf = (m) => { const c = cats.get(m); return c ? Object.entries(c).sort((p, q) => q[1] - p[1])[0][0] : null; };
  const mk = (m, list, f) => {
    const days = new Map(); list.forEach(t => days.set(t.n, (days.get(t.n) || 0) + t.s));
    const ds = [...days.keys()].sort((p, q) => p - q);
    const amts = ds.map(n => days.get(n));
    const last = ds.length ? ds[ds.length - 1] : anchor;
    let next = last + Math.round(f.p);
    while (next < anchor - f.tol && ds.length) next += Math.round(f.p);
    return { m, cat: catOf(m) || 'Uncategorised', freq: f.label, period: f.p, typical: _hbMed(amts), last, next, count: ds.length, active: anchor - last <= f.p * 2 + f.tol };
  };
  const out = new Map();
  for (const [m, list] of byM) {
    if (list.length < 2) continue;
    const days = new Map(); list.forEach(t => days.set(t.n, (days.get(t.n) || 0) + t.s));
    const ds = [...days.keys()].sort((p, q) => p - q);
    if (ds.length < 2) continue;
    const iv = []; for (let i = 1; i < ds.length; i++) iv.push(ds[i] - ds[i - 1]);
    const mi = _hbMed(iv);
    const f = _HB_FREQS.find(x => Math.abs(mi - x.p) <= x.tol);
    if (!f || ds.length < f.min) continue;
    const okIv = iv.filter(x => Math.abs(x - f.p) <= f.tol * 1.6).length / iv.length;
    const amts = ds.map(n => days.get(n)); const ma = _hbMed(amts);
    const okAmt = amts.filter(x => Math.abs(x - ma) / ma <= 0.35).length / amts.length;
    if (okIv < 0.6 || okAmt < 0.6) continue;
    out.set(m, mk(m, list, f));
  }
  for (const r of (Array.isArray(pipeline) ? pipeline : [])) {
    if (!r || !r.merchant) continue;
    const m = String(r.merchant), s = String(r.frequency || '').toLowerCase();
    const f = /fortnight|2.?week|bi.?week/.test(s) ? _HB_FREQS[1] : /week/.test(s) ? _HB_FREQS[0] : /quarter/.test(s) ? _HB_FREQS[3] : /year|annual/.test(s) ? _HB_FREQS[4] : _HB_FREQS[2];
    const list = byM.get(m) || [];
    const rec = out.get(m) || mk(m, list, f);
    if (r.frequency) rec.freq = String(r.frequency).replace(/^./, c => c.toUpperCase());
    if (r.category && !rec.cat) rec.cat = String(r.category);
    if (!list.length && typeof r.last_seen === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r.last_seen)) {
      rec.last = _hbDnum(r.last_seen); rec.next = rec.last + Math.round(f.p); rec.typical = +r.last_amount || 0; rec.active = anchor - rec.last <= f.p * 2 + f.tol;
    }
    out.set(m, rec);
  }
  return [...out.values()];
}

/**
 * The Money glance from analysis.json. o: {today: 'YYYY-MM-DD' (default: local
 * today), weekStart: 0-6 (0 = Sunday; default 1 = Monday), days: 30, billDays: 14}.
 * -> null (no analysis) | {
 *   today: {iso, spent, count, usual, diff},  usualDay,
 *   week / month: {start, end (ISO, inclusive), day (0-based), len, spent, usualNow, usualEnd, n (periods compared)},
 *   days: [{iso, v, count, avg (7-day average ending that day)}] oldest first (today last),
 *   cats: [{c, v, share}] this month, biggest first,
 *   recent: [{iso, m, c, s, bc, k}] the 3 newest payments, bills: [{m, c, iso, amount, freq, due}] next billDays days,
 *   asOf (latest transaction ISO), count (spend rows), budgetTotal, key }
 * Amounts are spending (positive = money out), rounded to pennies.
 */
function homeFinGlance(a, o) {
  o = o || {};
  if (!a || typeof a !== 'object' || !Array.isArray(a.transactions)) return null;
  const valid = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
  const exclude = Array.isArray(a.exclude_from_spending) && a.exclude_from_spending.length ? a.exclude_from_spending.map(String) : ['Income', 'Internal transfers'];
  const tx = []; let minN = Infinity, maxN = -Infinity;
  a.transactions.forEach((r, i) => {
    if (!r || !valid(r.d)) return;
    const amt = Number(r.a); if (!isFinite(amt)) return;
    const n = _hbDnum(r.d);
    if (n < minN) minN = n; if (n > maxN) maxN = n;
    const c = String(r.c || 'Uncategorised');
    if (exclude.includes(c)) return;
    tx.push({ i, n, m: String(r.m || 'Unknown'), c, s: -amt, bc: r.bc ? String(r.bc) : null, k: r.k ? String(r.k) : 'i' + i });
  });
  tx.sort((p, q) => q.n - p.n || p.i - q.i);
  const T = _hbDnum(valid(o.today) ? o.today : _hbLocalIso());
  const anchor = Math.max(T, isFinite(maxN) ? maxN : T);
  minN = isFinite(minN) ? Math.min(minN, anchor) : anchor;        // no rows: no earlier periods to compare
  const per = new Map(), cnt = new Map();
  for (const t of tx) { per.set(t.n, (per.get(t.n) || 0) + t.s); if (t.s > 0) cnt.set(t.n, (cnt.get(t.n) || 0) + 1); }
  const curve = (start, len, upTo) => {
    const out = []; let run = 0;
    const end = upTo == null ? len - 1 : Math.min(upTo, len - 1);
    for (let k = 0; k <= end; k++) { run += per.get(start + k) || 0; out.push(_hbR2(run)); }
    return out;
  };
  const sumIn = (from, to) => { let v = 0; for (const t of tx) if (t.n >= from && t.n <= to) v += t.s; return _hbR2(v); };
  const period = (start, next, prev) => {
    const len = next - start, day = T - start;
    const curves = prev.map(p => curve(p.start, p.next - p.start));
    const at = (k) => _hbR2(_hbMed(curves.map(c => (c.length ? c[Math.min(k, c.length - 1)] : 0))));
    return {
      start: _hbDiso(start), end: _hbDiso(next - 1), day, len, spent: sumIn(start, next - 1),
      usualNow: curves.length ? at(day) : null, usualEnd: curves.length ? at(len - 1) : null, n: curves.length,
    };
  };
  // This calendar month against up to 6 earlier ones (the Overview's month mode).
  const mi = _hbMonthIdx(T);
  const mPrev = [];
  for (let k = 6; k >= 1; k--) if (_hbMonthStart(mi - k) >= minN) mPrev.push({ start: _hbMonthStart(mi - k), next: _hbMonthStart(mi - k + 1) });
  const month = period(_hbMonthStart(mi), _hbMonthStart(mi + 1), mPrev);
  // This week (weekStart) against up to 8 earlier ones.
  const ws = Number.isInteger(o.weekStart) && o.weekStart >= 0 && o.weekStart <= 6 ? o.weekStart : 1;
  const wStart = T - (((T + 4) % 7) - ws + 7) % 7;                 // (n + 4) % 7 = getUTCDay(): 0 = Sunday
  const wPrev = [];
  for (let k = 8; k >= 1; k--) if (wStart - 7 * k >= minN) wPrev.push({ start: wStart - 7 * k, next: wStart - 7 * k + 7 });
  const week = period(wStart, wStart + 7, wPrev);
  // A usual day: a usual week / 7; without a whole earlier week, the average day so far.
  let usualDay = week.usualEnd != null ? _hbR2(week.usualEnd / 7) : null;
  if (usualDay == null && T - minN >= 7) { let v = 0; for (const t of tx) if (t.n >= minN && t.n < T) v += t.s; usualDay = _hbR2(v / (T - minN)); }
  const spentToday = _hbR2(per.get(T) || 0);
  const today = { iso: _hbDiso(T), spent: spentToday, count: cnt.get(T) || 0, usual: usualDay, diff: usualDay == null ? null : _hbR2(spentToday - usualDay) };
  const nDays = Math.max(7, Math.min(90, Math.round(o.days || 30)));
  // Each day with its 7-day average (the days ending on it that are inside the data): the
  // sparkline draws the average, a gently smoothed line comparable with "a usual day".
  const days = [];
  for (let k = nDays - 1; k >= 0; k--) {
    const n = T - k, from = Math.max(n - 6, Math.min(minN, n));
    let s7 = 0; for (let d = from; d <= n; d++) s7 += per.get(d) || 0;
    days.push({ iso: _hbDiso(n), v: _hbR2(per.get(n) || 0), count: cnt.get(n) || 0, avg: _hbR2(s7 / (n - from + 1)) });
  }
  // Categories this month.
  const mS = _hbMonthStart(mi), mE = _hbMonthStart(mi + 1) - 1;
  const byCat = new Map();
  for (const t of tx) if (t.n >= mS && t.n <= mE) byCat.set(t.c, (byCat.get(t.c) || 0) + t.s);
  const cats = [...byCat.entries()].filter(e => e[1] > 0.004).sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))
    .map(([c, v]) => ({ c, v: _hbR2(v), share: month.spent > 0 ? v / month.spent : null }));
  const recent = tx.filter(t => t.s !== 0 && t.n <= anchor).slice(0, 3).map(t => ({ iso: _hbDiso(t.n), m: t.m, c: t.c, s: _hbR2(t.s), bc: t.bc, k: t.k }));
  const billDays = Math.max(1, Math.min(60, Math.round(o.billDays || 14)));
  const bills = _hbRecurring(tx, a.recurring, anchor)
    .filter(r => r.active && r.next >= anchor - 3 && r.next <= anchor + billDays)
    .sort((p, q) => p.next - q.next || q.typical - p.typical || (p.m < q.m ? -1 : 1))
    .map(r => ({ m: r.m, c: r.cat, iso: _hbDiso(Math.max(r.next, anchor)), amount: _hbR2(r.typical), freq: r.freq, due: r.next <= anchor }));
  const budgetTotal = a.budgets && typeof a.budgets === 'object'
    ? _hbR2(Object.values(a.budgets).map(Number).filter(v => isFinite(v) && v > 0).reduce((s, v) => s + v, 0)) : 0;
  return {
    today, usualDay, week, month, days, cats, recent, bills, budgetTotal,
    asOf: isFinite(maxN) ? _hbDiso(maxN) : null, count: tx.length,
    key: [today.iso, tx.length, month.spent, week.spent, spentToday, isFinite(maxN) ? maxN : '-', bills.length].join('|'),
  };
}

/** Monotone cubic (Fritsch-Carlson, as d3's curveMonotoneX) through [x, y] points: an SVG path. */
function homeFinSmoothPath(pts) {
  const n = pts.length;
  if (!n) return '';
  const f = (v) => Math.round(v * 100) / 100;
  if (n === 1) return `M${f(pts[0][0])},${f(pts[0][1])}`;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); m.push(dx[i] ? (pts[i + 1][1] - pts[i][1]) / dx[i] : 0); }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t.push(0);
    else { const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1]; t.push((w1 + w2) / (w1 / m[i - 1] + w2 / m[i])); }
  }
  t.push(m[n - 2]);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(pts[i][0] + h)},${f(pts[i][1] + h * t[i])} ${f(pts[i + 1][0] - h)},${f(pts[i + 1][1] - h * t[i + 1])} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}

/* ---------- data ---------- */
function _hbFinWeekStart() { try { return typeof _weekStartIndex === 'function' ? _weekStartIndex() : 1; } catch (e) { return 1; } }
/** Fetch /api/finance when the copy is older than maxAge (ms); repaint Money when the glance changed. */
function _hbFinLoad(maxAge) {
  if (_hbFin.loading || Date.now() - _hbFin.at < maxAge) return;
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return;
  _hbFin.loading = true;
  fetch('/api/finance', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then(j => {
      _hbFin.status = j && j.status === 'ok' ? 'ok' : 'empty';
      _hbFin.glance = _hbFin.status === 'ok' ? homeFinGlance(j.analysis, { today: todayStr(), weekStart: _hbFinWeekStart() }) : null;
      if (_hbFin.status === 'ok' && !_hbFin.glance) _hbFin.status = 'empty';
      _hbFin.err = null;
    })
    .catch(() => { _hbFin.err = 'unreachable'; })
    .finally(() => {
      _hbFin.loading = false; _hbFin.at = Date.now();
      const key = (_hbFin.status || '') + '#' + (_hbFin.err || '') + '#' + (_hbFin.glance ? _hbFin.glance.key : '');
      const changed = key !== _hbFin.key;
      _hbFin.key = key;
      if (changed && state.view === 'home' && typeof homeRerenderWidget === 'function' && document.querySelector('.hg-w[data-wid="finance"]')) homeRerenderWidget('finance');
    });
}
function _hbFinOpen(section) {
  try { if (section && window.FinanceView && typeof FinanceView.setSection === 'function') FinanceView.setSection(section); } catch (e) { /* the view decides */ }
  if (state.view !== 'finance') setView('finance');
}

/* ---------- formatting ---------- */
function _hbCur() { return APP_CONFIG.currency || 'GBP'; }
function _hbNf(dp) {
  const k = dp + '|' + _hbCur() + '|' + (APP_CONFIG.locale || '');
  _hbNf.c = _hbNf.c || new Map();
  if (!_hbNf.c.has(k)) {
    let f = null;
    try { f = new Intl.NumberFormat(APP_CONFIG.locale || undefined, { style: 'currency', currency: _hbCur(), minimumFractionDigits: dp, maximumFractionDigits: dp }); } catch (e) { f = null; }
    _hbNf.c.set(k, f);
  }
  return _hbNf.c.get(k);
}
/** Money as text: whole units (dp 0) or pennies (dp 2). The sign of a refund is kept. */
function _hbMoney(v, dp) {
  const f = _hbNf(dp == null ? 0 : dp);
  const x = Number(v) || 0;
  const s = f ? f.format(Math.abs(x)) : (dp ? Math.abs(x).toFixed(2) : String(Math.round(Math.abs(x))));
  return (x < -0.004 ? '−' : '') + s;
}
/** "£4" + ".20" for the big number: the pence in a smaller, muted span. */
function _hbMoneyBigHtml(v) {
  const f = _hbNf(2);
  if (!f || typeof f.formatToParts !== 'function') return esc(_hbMoney(v, 2));
  const parts = f.formatToParts(Math.abs(Number(v) || 0));
  const di = parts.findIndex(p => p.type === 'decimal');
  const head = parts.slice(0, di < 0 ? parts.length : di).map(p => p.value).join('');
  const tail = di < 0 ? '' : parts.slice(di).map(p => p.value).join('');
  return `${(Number(v) || 0) < -0.004 ? '−' : ''}${esc(head)}${tail ? `<small>${esc(tail)}</small>` : ''}`;
}
/** A date label in the user's locale: "2 Oct" by default. */
function _hbDay(iso, o) {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, o || { day: 'numeric', month: 'short' }); } catch (e) { return iso; }
}
/** "Today", "Yesterday", a weekday this week, else "2 Oct". */
function _hbWhen(iso) {
  const t = todayStr();
  if (iso === t) return 'Today';
  const d = Math.round((_hbDnum(t) - _hbDnum(iso)));
  if (d === 1) return 'Yesterday';
  if (d === -1) return 'Tomorrow';
  if (d > -7 && d < 7) return _hbDay(iso, { weekday: 'short' });
  return _hbDay(iso);
}
function _hbMerchantName(m) {
  try { if (window.FinSymbols && typeof FinSymbols.merchantCanonical === 'function') return FinSymbols.merchantCanonical(m) || m; } catch (e) { /* raw name */ }
  return m;
}
/** A merchant tile: FinSymbols when present, else a tinted monogram square. */
function _hbMerchantTile(m, c, bc) {
  try { if (window.FinSymbols && typeof FinSymbols.merchantSymbol === 'function') return FinSymbols.merchantSymbol(m, c, { size: 'sm', bc: bc || undefined }); } catch (e) { /* fallback */ }
  const name = _hbMerchantName(m);
  const words = String(name).replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const mono = words.length > 1 ? (words[0][0] + words[1][0]) : (words[0] || '?').slice(0, 2);
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const sw = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'pink', 'violet', 'slate'][h % 9];
  return `<span class="hbf-mono" style="--c:var(--sw-${sw})" aria-hidden="true">${esc(mono.toUpperCase())}</span>`;
}
const _HB_CAT_ICONS = [[/grocer|supermarket|food shop/i, 'shopping-cart'], [/eat|restaurant|takeaway|dining/i, 'utensils'], [/coffee|cafe/i, 'coffee'],
  [/transport|travel|rail|train|fuel|car/i, 'train-front'], [/hous|rent|mortgage/i, 'house'], [/bill|utilit|phone|internet/i, 'receipt'],
  [/shop|cloth/i, 'shopping-cart'], [/health|pharm|medic/i, 'pill'], [/fitness|gym|sport/i, 'dumbbell'], [/entertain|leisure|subscri/i, 'ticket'],
  [/people|gift|friend/i, 'gift'], [/cash|atm/i, 'banknote']];
function _hbCatIcon(c, bc) {
  try { if (window.FinSymbols && typeof FinSymbols.categoryIcon === 'function') return FinSymbols.categoryIcon(c, { size: 'sm', live: 'hover', bc: bc || undefined }); } catch (e) { /* fallback */ }
  const hit = _HB_CAT_ICONS.find(([re]) => re.test(String(c || '')));
  return `<span class="hbf-cic">${icon(hit ? hit[1] : 'wallet')}</span>`;
}

/* ---------- render ---------- */
function _hbFinRender(el, ctx) {
  if (APP_CONFIG.features && APP_CONFIG.features.finance === false) return false;
  _hbFinLoad(ctx.firstPaint ? 60 * 1000 : 5 * 60 * 1000);       // a fresh copy on entering Home, else every 5 min
  const g = _hbFin.glance;
  const size = ctx.size || 's';
  const card = document.createElement('section');
  card.className = `card home-card hbf hbf--${size}`;
  const monthName = (() => { try { return new Date((g ? g.month.start : todayStr()) + 'T12:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, { month: 'long' }); } catch (e) { return ''; } })();
  card.appendChild(hglHead({ icon: 'wallet', title: 'Money', n: g ? monthName : '', link: { label: 'Finances', title: 'Open Finances', run: () => _hbFinOpen(null) } }));
  const body = document.createElement('div'); body.className = 'card-b hbf-b';
  card.appendChild(body);
  el.appendChild(card);

  if (!g && (_hbFin.loading || !_hbFin.at) && !_hbFin.err) {         // loading: the box keeps a calm, stable height
    body.innerHTML = '<div class="hbf-skel" aria-busy="true"><span class="skeleton skeleton-text" style="width:38%"></span><span class="skeleton" style="width:56%;height:30px"></span><span class="skeleton skeleton-text" style="width:84%"></span><span class="skeleton skeleton-text" style="width:72%"></span></div>';
    return true;
  }
  if (!g && _hbFin.err) {
    body.appendChild(hglEmpty({ icon: 'circle-alert', title: 'Couldn’t read Finances', text: 'The OpenDash server didn’t answer. Your data is safe.',
      actions: [{ label: 'Retry', icon: 'refresh-cw', run: () => { _hbFin.at = 0; _hbFin.err = null; _hbFin.key = ''; _hbFinLoad(0); homeRerenderWidget('finance'); } }] }));
    return true;
  }
  if (!g || _hbFin.status !== 'ok' || !g.count) {
    const bankOk = !(window.Connections && typeof Connections.has === 'function') || Connections.has('bank');
    const off = ctx.off ? ctx.off({
      icon: 'wallet', title: 'Money at a glance',
      text: bankOk ? 'Import a statement or update Finances to see what you spend today against what is usual.' : 'Connect your bank (read-only) or import a statement in Finances to see what you spend today against what is usual.',
      action: bankOk || !(window.Connections && typeof Connections.open === 'function')
        ? { label: 'Open Finances', icon: 'wallet', run: () => _hbFinOpen(null) }
        : { label: 'Connect your bank', icon: 'plug', run: () => Connections.open('bank') },
    }) : hglEmpty({ icon: 'wallet', title: 'Money at a glance', actions: [{ label: 'Open Finances', icon: 'wallet', run: () => _hbFinOpen(null) }] });
    off.classList.add('hgl-off');
    const art = hglScene('finance', { size: 'lg', hover: true });
    if (art) off.insertAdjacentHTML('afterbegin', art);
    body.appendChild(off);
    return true;
  }
  const fresh = ctx.isNew ? ctx.isNew('data:' + g.key) : !!ctx.firstPaint;   // the data's first showing this entry
  body.appendChild(_hbFinBody(g, size));
  _hbFinWire(body, g);
  if (fresh) _hbFinEnter(body);
  if (window.FinSymbols && typeof FinSymbols.activate === 'function') try { FinSymbols.activate(body); } catch (e) { /* static */ }
  return true;
}

function _hbFinMeter(label, p, kind) {
  if (!p) return '';
  const has = p.usualEnd != null && p.usualEnd > 0;
  const floor = kind === 'week' ? 10 : 20;
  const over = has && p.usualNow != null && p.spent - p.usualNow > Math.max(floor, 0.05 * p.usualNow);
  const top = has ? Math.max(p.usualEnd, p.spent, p.usualNow || 0) : 0;
  const pct = top > 0 ? Math.max(0, Math.min(100, p.spent / top * 100)) : 0;
  const upct = has && p.usualNow != null ? Math.max(0, Math.min(100, p.usualNow / top * 100)) : null;
  const tip = has
    ? `${_hbMoney(p.spent)} spent; usual by now ${_hbMoney(p.usualNow)}, usual for the whole ${kind} ${_hbMoney(p.usualEnd)} (median of the last ${p.n} ${kind}${p.n === 1 ? '' : 's'})${over ? ` · ${_hbMoney(p.spent - p.usualNow)} over the usual pace` : ''}`
    : `${_hbMoney(p.spent)} spent; no earlier ${kind}s to compare yet`;
  return `<div class="hbf-mtr${over ? ' over' : ''}" title="${escAttr(tip)}"><span class="l">${esc(label)}</span>`
    + (has ? `<span class="trk"><i style="--pct:${pct.toFixed(1)}%"></i>${upct != null ? `<u style="--usual:${upct.toFixed(1)}%"></u>` : ''}</span>` : '<span class="trk is-none"></span>')
    + `<span class="v num">${esc(_hbMoney(p.spent))}${has ? ` <small>/ ${esc(_hbMoney(p.usualEnd))}</small>` : ''}</span></div>`;
}

function _hbFinHeroHtml(g) {
  const t = g.today;
  const stale = g.asOf && g.asOf < t.iso;
  let sub;
  if (stale) sub = `<span class="hbf-stale">${icon('history')}Payments up to ${esc(_hbWhen(g.asOf).toLowerCase() === 'yesterday' ? 'yesterday' : _hbDay(g.asOf, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>`;
  else if (t.usual == null) sub = t.count ? `${t.count} payment${t.count === 1 ? '' : 's'} so far` : 'Nothing spent yet';
  else if (Math.abs(t.diff) < 0.5) sub = 'About a usual day';
  else if (t.diff < 0) sub = `<b class="good">${esc(_hbMoney(-t.diff))} under</b> a usual day`;
  else sub = `<b>${esc(_hbMoney(t.diff))} over</b> a usual day`;
  return `<div class="hbf-hero"><div class="ovl">Spent today</div><div class="hbf-big num">${_hbMoneyBigHtml(t.spent)}</div><div class="hbf-sub">${sub}</div></div>`;
}

/* The sparkline: the 7-day average of daily spending over the last 30 days
   (a monotone curve, so it never overshoots), the usual day as a dashed
   reference, today as the accent dot. Hover a day for its own total. */
function _hbFinSparkHtml(g) {
  const vals = g.days.map(d => Math.max(0, d.avg != null ? d.avg : d.v));
  const sorted = [...vals].sort((p, q) => q - p);
  let top = sorted[0] || 0;
  // One huge stretch would flatten the rest: cap it and mark it; the tip keeps the true amount.
  if (sorted.length > 3 && sorted[3] > 0 && top > sorted[3] * 3) top = sorted[3] * 1.6;
  top = Math.max(top, (g.usualDay || 0) * 1.35, 1) * 1.08;
  const W = 300, H = 48, n = vals.length;
  const x = (i) => (n === 1 ? W / 2 : i / (n - 1) * W);
  const y = (v) => H - Math.min(v, top) / top * (H - 4) - 2;
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const line = homeFinSmoothPath(pts);
  const area = line + `L${W},${H}L0,${H}Z`;
  const capped = vals.map((v, i) => (v > top ? i : -1)).filter((i, k, a) => i >= 0 && a[k - 1] !== i - 1);
  const uy = g.usualDay ? y(g.usualDay) : null;
  const last = g.days[n - 1];
  const label = `Spending over the last ${n} days as a 7-day average: now ${_hbMoney(last.avg != null ? last.avg : last.v)} a day${g.usualDay != null ? `, against a usual ${_hbMoney(g.usualDay)} a day` : ''}. Today ${_hbMoney(last.v, 2)}.`;
  return `<div class="hbf-spark"><div class="hbf-plot" role="img" aria-label="${escAttr(label)}">`
    + `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="ar" d="${area}"/>`
    + (uy != null ? `<line class="us" x1="0" x2="${W}" y1="${uy.toFixed(2)}" y2="${uy.toFixed(2)}"/>` : '')
    + `<path class="ln" d="${line}"/></svg>`
    + capped.map(i => `<i class="hbf-cap" style="--x:${(x(i) / W * 100).toFixed(2)}%"></i>`).join('')
    + `<i class="hbf-dot" style="--x:100%;--y:${(pts[n - 1][1] / H * 100).toFixed(1)}%"></i>`
    + `<i class="hbf-hov" hidden></i><span class="hbf-hit">${g.days.map((d, i) => `<span data-i="${i}" data-x="${(x(i) / W * 100).toFixed(2)}" data-y="${(pts[i][1] / H * 100).toFixed(1)}"></span>`).join('')}</span><span class="hbf-tip" hidden></span></div>`
    + `<div class="hbf-ax"><span>${esc(_hbDay(g.days[0].iso))}</span><span>Today</span></div>`
    + `<div class="hbf-slg" aria-hidden="true"><span><i class="sw-ln"></i>7-day average</span>${uy != null ? `<span><i class="sw-us"></i>usual ${esc(_hbMoney(g.usualDay))}/day</span>` : ''}</div></div>`;
}

function _hbFinBody(g, size) {
  const wrap = document.createElement('div'); wrap.className = 'hbf-wrap';
  const top = g.cats[0];
  const topHtml = top ? `<button type="button" class="hbf-top fsym-host" data-go="categories" title="Open Finances › Categories">${_hbCatIcon(top.c)}<span class="t"><small>Top this month</small><b>${esc(top.c)}</b></span><span class="r num">${esc(_hbMoney(top.v))}${top.share != null ? `<small>${Math.round(top.share * 100)}%</small>` : ''}</span></button>` : '';
  const recent = g.recent.length ? `<ul class="hbf-tx" aria-label="Latest payments">${g.recent.map(t => `<li><button type="button" class="hbf-txr fsym-host" data-go="transactions" data-flip="tx:${escAttr(t.k)}">${_hbMerchantTile(t.m, t.c, t.bc)}<span class="n"><span class="nm">${esc(_hbMerchantName(t.m))}</span><small>${esc(_hbWhen(t.iso))} · ${esc(t.c)}</small></span><span class="a num${t.s < 0 ? ' in' : ''}">${t.s < 0 ? '+' : ''}${esc(_hbMoney(Math.abs(t.s), 2))}</span></button></li>`).join('')}</ul>` : '';
  const legend = (g.week.usualEnd != null || g.month.usualEnd != null) ? '<div class="hbf-lg" aria-hidden="true"><span><i></i>spent</span><span><u></u>usual by now</span><span class="r">/ usual total</span></div>' : '';
  const budget = g.budgetTotal > 0 && size !== 's'
    ? `<div class="hbf-budget">${icon('piggy-bank')}<span>Budgets: <b class="num">${esc(_hbMoney(g.month.spent))}</b> of ${esc(_hbMoney(g.budgetTotal))} · ${Math.round(g.month.spent / g.budgetTotal * 100)}% used, ${Math.round((g.month.day + 1) / g.month.len * 100)}% of the month gone</span></div>` : '';
  const a = `<div class="hbf-col hbf-a">${_hbFinHeroHtml(g)}<div class="hbf-rows">${_hbFinMeter('This week', g.week, 'week')}${_hbFinMeter('This month', g.month, 'month')}${legend}</div>${budget}</div>`;
  let catsHtml = '', billsHtml = '';
  if (size === 'l') {
    const cs = g.cats.slice(0, 5); const mx = cs.length ? cs[0].v : 1;
    catsHtml = cs.length ? `<div class="hbf-cats"><div class="ovl">Categories this month</div>${cs.map(c => `<button type="button" class="hbf-cat fsym-host" data-go="categories" title="${escAttr(c.c + ': ' + _hbMoney(c.v, 2) + (c.share != null ? ` · ${Math.round(c.share * 100)}%` : ''))}"><span class="l">${esc(c.c)}</span><span class="v num">${esc(_hbMoney(c.v))}</span><span class="bar"><i style="--pct:${(c.v / mx * 100).toFixed(1)}%"></i></span></button>`).join('')}</div>` : '';
    billsHtml = `<div class="hbf-bills"><div class="ovl">Due soon</div>${g.bills.length
      ? `<ul>${g.bills.slice(0, 4).map(b => `<li><button type="button" class="hbf-bill fsym-host" data-go="recurring"><span class="hbf-cal"><b>${esc(_hbDay(b.iso, { day: 'numeric' }))}</b><small>${esc(_hbDay(b.iso, { month: 'short' }))}</small></span><span class="n"><span class="nm">${esc(_hbMerchantName(b.m))}</span><small>${b.due ? 'Due now' : esc(_hbWhen(b.iso))} · ${esc(String(b.freq).toLowerCase())}</small></span><span class="a num">${esc(_hbMoney(b.amount, 2))}</span></button></li>`).join('')}</ul>`
      : '<p class="hbf-none">No regular payments due in the next two weeks.</p>'}</div>`;
  }
  const b = `<div class="hbf-col hbf-b2">${_hbFinSparkHtml(g)}${topHtml}${catsHtml}</div>`;
  const c = `<div class="hbf-col hbf-c">${recent}${billsHtml}</div>`;
  // The phone tile (under 250 px of width): today, this month and its meter.
  const m = g.month;
  const pace = m.usualNow == null ? '' : m.spent - m.usualNow > Math.max(20, 0.05 * m.usualNow) ? '<b class="warn">Over</b> usual pace' : m.usualNow - m.spent > Math.max(20, 0.05 * m.usualNow) ? '<b class="good">Under</b> usual pace' : 'On usual pace';
  const tile = `<div class="hbf-tile"><div class="ovl">Today</div><div class="hbf-big num">${_hbMoneyBigHtml(g.today.spent)}</div><div class="hbf-sub">${esc(_hbMoney(m.spent))} this month</div>${_hbFinMeter('', m, 'month')}${pace ? `<div class="hbf-sub">${pace}</div>` : ''}</div>`;
  wrap.innerHTML = `<div class="hbf-grid">${a}${b}${c}</div>${tile}`;
  return wrap;
}

function _hbFinWire(body, g) {
  for (const b of body.querySelectorAll('[data-go]')) b.onclick = () => _hbFinOpen(b.dataset.go);
  const plot = body.querySelector('.hbf-plot'); if (!plot) return;
  const tip = plot.querySelector('.hbf-tip'), hov = plot.querySelector('.hbf-hov');
  let cur = -1;
  const show = (i) => {
    const d = g.days[i]; if (!d || i === cur) return;
    cur = i;
    const s = plot.querySelector(`.hbf-hit > [data-i="${i}"]`);
    if (s && hov) { hov.style.setProperty('--x', s.dataset.x + '%'); hov.style.setProperty('--y', s.dataset.y + '%'); hov.hidden = false; }
    tip.innerHTML = `<b class="num">${esc(_hbMoney(d.v, 2))} spent</b><span>${esc(_hbDay(d.iso, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${d.count} payment${d.count === 1 ? '' : 's'}</span>`
      + (d.avg != null ? `<span class="m">7-day average ${esc(_hbMoney(d.avg))}/day</span>` : '');
    tip.style.setProperty('--x', (s ? s.dataset.x : ((i + 0.5) / g.days.length * 100).toFixed(2)) + '%');
    tip.hidden = false;
  };
  const hide = () => { cur = -1; tip.hidden = true; if (hov) hov.hidden = true; };
  const hit = plot.querySelector('.hbf-hit');
  hit.addEventListener('pointermove', (e) => { const s = e.target.closest('[data-i]'); if (s) show(Number(s.dataset.i)); });
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('click', () => _hbFinOpen('spending'));
}

/** The once-per-entry flourish: the chart wipes in from the left, meters and bars grow. */
function _hbFinEnter(body) {
  hglAnim(body.querySelector('.hbf-plot svg'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 260, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });
  hglAnim(body.querySelector('.hbf-dot'), [{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }], { duration: 300, delay: 1050, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
  hglGrow(body.querySelectorAll('.hbf-mtr .trk > i, .hbf-cat .bar > i'), 320);
}
