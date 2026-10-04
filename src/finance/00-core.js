  // @part 00-core.js · OWNER: C3 (shared core: constants, utils, money/date formats, UI prefs F, runtime R, theme tokens tk(); others append only)
/* ============================================================
   FINANCES VIEW (window.FinanceView)
   The whole Finances experience: a sticky filter bar, KPI row and eight
   sections of linked, interactive charts (Apache ECharts, vendored in
   vendor/echarts.min.js — no CDN, works offline).

   Data comes from GET /api/finance (analysis.json written by the pipeline in the
   finance folder, outside this repo). Nothing financial is stored in
   dashboard state; only UI preferences go to localStorage under
   'dash-finance-ui-v1'.

   Lifecycle: the dashboard calls render() on every task change and
   renderMain() empties #main-body each time. mount() therefore re-attaches
   one persistent root instead of rebuilding; charts are only updated when
   filters or data change, and every ECharts instance is disposed once the
   view is left.
   ============================================================ */

  // ── Constants ─────────────────────────────────────────────────────────
  const LS_KEY = 'dash-finance-ui-v1';
  const DAY_MS = 864e5;
  const FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';   // Inter is embedded by build.mjs
  const SECTIONS = [
    ['overview', 'Overview'], ['spending', 'Spending'], ['categories', 'Categories'], ['merchants', 'Merchants'],
    ['cashflow', 'Cash flow'], ['recurring', 'Recurring'], ['budgets', 'Budgets'], ['transactions', 'Transactions'],
  ];
  const PRESETS = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'All'];
  const GRANS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month']];
  // Categorical slots, drawn from the design system's swatches (--sw-*) and
  // run through the dataviz validator against --surface in each theme
  // (lightness band, chroma, adjacent CVD ΔE ≥ 8, normal-vision ≥ 15). Slot 0
  // is the app accent (indigo). Red is left out on purpose so a category
  // never reads as "over budget".
  const PALETTE = {
    light: ['#5b5bd6', '#f76b15', '#12a594', '#f0a000', '#d6409f', '#3f9f52', '#0b84e8'],
    dark: ['#7070e8', '#d95926', '#199e8a', '#c98500', '#d55193', '#3a9a4c', '#3987e5'],
  };
  const SLOTS = 7;
  // Sequential ramp (calendar heatmap): one hue, the accent, light to dark.
  const SEQ = {
    light: ['#efeffd', '#d4d4f7', '#b3b3f0', '#8a8ae6', '#5b5bd6', '#4343b4', '#2f2f86'],
    dark: ['#1e1e33', '#27274f', '#33336f', '#45459a', '#6060e0', '#8e8ef0', '#c4c4fb'],
  };
  // The user's currency and locale come from data/config.json (APP_CONFIG,
  // injected into the page); nothing about them is hard-coded here.
  const CFG = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG) || {};
  const CUR = /^[A-Z]{3}$/.test(CFG.currency || '') ? CFG.currency : 'GBP';
  const LOC = (() => { try { return Intl.DateTimeFormat.supportedLocalesOf([CFG.locale || 'en-GB'])[0] || 'en-GB'; } catch (e) { return 'en-GB'; } })();
  const CAT_RE = /^[A-Za-z][A-Za-z &\/-]{1,30}$/;
  const HIST_EDGES = [0, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, Infinity];

  // ── Small utilities ───────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sum = (arr, f) => { let s = 0; for (const x of arr) s += f ? f(x) : x; return s; };
  const round2 = x => Math.round(x * 100) / 100;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const validIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
  function median(a) { if (!a.length) return 0; const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function quantile(a, q) { if (!a.length) return 0; const s = [...a].sort((p, r) => p - r); const i = clamp(Math.floor(q * (s.length - 1)), 0, s.length - 1); return s[i]; }
  function alpha(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex;
    const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function inkOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return '#fff';
    const n = parseInt(m[1], 16); const ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    return L > 0.36 ? '#0b0b0b' : '#ffffff';
  }

  // Dates are handled as UTC day numbers (days since 1970-01-01), so DST and
  // time zones can never shift a transaction onto the wrong day.
  const dnum = iso => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS);
  const diso = n => new Date(n * DAY_MS).toISOString().slice(0, 10);   // clock-ok: a day number to its ISO date (UTC arithmetic)
  const dobj = n => new Date(n * DAY_MS);
  const dow = n => (n + 3) % 7;                       // Monday = 0
  const weekStart = n => n - dow(n);
  const monthIdx = n => { const d = dobj(n); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  const monthStart = mi => Math.round(Date.UTC(Math.floor(mi / 12), mi % 12, 1) / DAY_MS);
  const monthEnd = mi => monthStart(mi + 1) - 1;
  function addMonths(n, k) {
    const d = dobj(n); const y = d.getUTCFullYear(), m = d.getUTCMonth() + k, day = d.getUTCDate();
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Math.round(Date.UTC(y, m, Math.min(day, last)) / DAY_MS);
  }
  // The HOME day: banks date transactions at home, so money days stay on home time
  // while the user travels (travel spec 2.3, P10; Clock is the page's, 07-core-clock.js).
  function localToday() {
    if (typeof Clock !== 'undefined') return Math.round(Date.parse(Clock.today(Clock.home()) + 'T00:00:00Z') / DAY_MS);
    const d = new Date(Date.now()); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);   // clock-ok: no Clock (a part run alone)
  }
  // @p2 One cached Intl.DateTimeFormat per option set: toLocaleDateString builds a new
  // formatter on every call (about 20 ms per filter change at 4,000+ transactions).
  // Same output: every caller passes date fields only (weekday/day/month/year).
  const FD_CACHE = new Map();
  const fd = (n, o) => {
    const k = o ? Object.keys(o).map(x => x + ':' + o[x]).join() : '';
    let f = FD_CACHE.get(k);
    if (!f) { f = new Intl.DateTimeFormat(LOC, Object.assign({ timeZone: 'UTC' }, o)); FD_CACHE.set(k, f); }
    return f.format(dobj(n));
  };
  const fDay = n => fd(n, { day: 'numeric', month: 'short' });
  const fDayY = n => fd(n, { day: 'numeric', month: 'short', year: 'numeric' });
  const fDayW = n => fd(n, { weekday: 'short', day: 'numeric', month: 'short' });
  const fDayLong = n => fd(n, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fMonth = mi => fd(monthStart(mi), { month: 'long', year: 'numeric' });
  const fMonthS = (mi, yr) => fd(monthStart(mi), yr ? { month: 'short', year: '2-digit' } : { month: 'short' });
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function fRange(a, b) {
    if (a === b) return fDayY(a);
    const da = dobj(a), db = dobj(b);
    if (da.getUTCFullYear() === db.getUTCFullYear()) return `${fDay(a)} – ${fDayY(b)}`;
    return `${fDayY(a)} – ${fDayY(b)}`;
  }
  function agoText(iso) {
    const t = Date.parse(iso); if (!t) return '';
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} d ago`;
  }
  function durText(fromIso, toIso) {
    const ms = (toIso ? Date.parse(toIso) : Date.now()) - Date.parse(fromIso);
    if (!(ms >= 0)) return '';
    const s = Math.round(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  }

  // Money. U+2212 minus for display; CSV export uses a plain hyphen.
  // The names gbp/gbp2 are historical: they format in the configured currency.
  const CURFMT = (() => {
    let sym = CUR + ' ', pre = true, dp = 2;
    try {
      const f = new Intl.NumberFormat(LOC, { style: 'currency', currency: CUR, currencyDisplay: 'narrowSymbol' });
      const parts = f.formatToParts(1);
      const ci = parts.findIndex(p => p.type === 'currency'), ni = parts.findIndex(p => p.type === 'integer');
      if (ci >= 0) {
        const lit = parts.slice(Math.min(ci, ni) + 1, Math.max(ci, ni)).filter(p => p.type === 'literal').map(p => p.value).join('');
        pre = ci < ni; sym = pre ? parts[ci].value + (lit ? ' ' : '') : (lit ? ' ' : '') + parts[ci].value;
      }
      dp = f.resolvedOptions().maximumFractionDigits;
    } catch (e) { /* unknown currency: "XYZ 12" */ }
    return { sym, pre, dp };
  })();
  const SYM = CURFMT.sym.trim();
  const cur = (num, neg) => (neg ? '−' : '') + (CURFMT.pre ? CURFMT.sym + num : num + CURFMT.sym);
  const nf0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat(LOC, { minimumFractionDigits: CURFMT.dp, maximumFractionDigits: CURFMT.dp });
  const nf1 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 1 });
  const gbp = x => { x = +x || 0; return cur(nf0.format(Math.abs(Math.round(x))), x < -0.004); };
  const gbp2 = x => { x = +x || 0; return cur(nf2.format(Math.abs(x)), x < -0.004); };
  const sgbp2 = x => (x > 0.004 ? '+' : '') + gbp2(x);
  function gbpShort(x) {
    x = +x || 0; const v = Math.abs(x), neg = x < -0.004;
    if (v >= 1e6) return cur(nf1.format(+(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)) + 'm', neg);
    if (v >= 1e4) return cur(nf1.format(+(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)) + 'k', neg);
    if (v >= 1e3) return cur(nf1.format(+(v / 1e3).toFixed(1)) + 'k', neg);
    return cur(nf0.format(Math.round(v)), neg);
  }
  // A bare amount in the currency for axis labels ("<£5", "£1k–2k").
  const curBare = s => (CURFMT.pre ? CURFMT.sym + s : s + CURFMT.sym);
  const pct = (x, dp) => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(dp || 0) + '%';

  // DOM helper. Text always goes in through text nodes (merchant names and
  // memos come from the bank and are untrusted).
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) el.style.setProperty(p, String(v[p])); else el.style[p] = v[p]; } }
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const sw = color => h('i', { class: 'fv-sw', style: { background: color }, 'aria-hidden': 'true' });

  // ── Persistent UI state ───────────────────────────────────────────────
  const DEFAULT_F = {
    section: 'overview', preset: '3M', from: null, to: null, gran: 'week',
    cats: [], accts: [], merchant: '', q: '', amt: null, inc: true, xfer: false, compare: false, more: false,
    catMode: 'donut', stackMode: 'abs', merchSort: 'spend', histMode: 'count', pageSize: 25,
    sort: { key: 'd', dir: -1 }, mSort: { key: 'total', dir: -1 }, budgetCat: '', slots: {}, localBudgets: null,
  };
  function loadF() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { s = {}; }
    const f = Object.assign({}, DEFAULT_F, s);
    if (!SECTIONS.some(x => x[0] === f.section)) f.section = 'overview';
    if (!PRESETS.includes(f.preset) && f.preset !== 'custom') f.preset = '3M';
    if (!GRANS.some(g => g[0] === f.gran)) f.gran = 'week';
    for (const k of ['cats', 'accts']) if (!Array.isArray(f[k])) f[k] = [];
    if (!(Array.isArray(f.amt) && f.amt.length === 2 && f.amt.every(Number.isFinite))) f.amt = null;
    if (![25, 50, 100].includes(f.pageSize)) f.pageSize = 25;
    if (!f.sort || typeof f.sort !== 'object') f.sort = { key: 'd', dir: -1 };
    if (!f.mSort || typeof f.mSort !== 'object') f.mSort = { key: 'total', dir: -1 };
    if (!f.slots || typeof f.slots !== 'object') f.slots = {};
    f.merchant = typeof f.merchant === 'string' ? f.merchant : '';
    f.q = typeof f.q === 'string' ? f.q : '';
    // The filter panel lives in the sticky bar; reopening it on every visit
    // would cover a third of the screen while scrolling. Start collapsed.
    f.more = false;
    return f;
  }
  let F = loadF();
  let saveTimer = 0;
  function saveF() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(F)); } catch (e) { /* quota or private mode */ } }, 150);
  }

  // Runtime state (in memory only).
  const R = {
    root: null, layer: null, mounted: false, container: null, mo: null, themeMo: null,
    data: null, model: null, loading: false, err: null, loadedAt: 0, mode: null,
    job: null, poll: null, startErr: null,
    charts: new Map(), sectionEls: null, sectionId: null, ctx: null,
    rangeHistory: [], tokens: null, reduced: false, noAnim: false,
    budgets: null, budgetDraft: null, budgetsLocal: false, budgetsBusy: false,
    page: 0, expanded: null, mLimit: 15, drawer: null, lastScroll: 0, scroller: null,
    els: {}, firstMount: true, catModeShown: {},
  };
  const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reducedMotion() {
    const de = document.documentElement;
    // The OS setting, or the dashboard's own "Reduce motion" toggle (motion.js
    // stamps data-motion="reduced" on <html>).
    const dm = de.getAttribute('data-motion');
    let motionPref = false;
    try { motionPref = !!(window.Motion && typeof window.Motion.prefersReduced === 'function' && window.Motion.prefersReduced()); } catch (e) { /* ignore */ }
    return !!((mql && mql.matches) || motionPref || dm === 'reduced' || dm === 'reduce' || de.classList.contains('reduce-motion') || de.classList.contains('reduced-motion'));
  }
  R.reduced = reducedMotion();
  if (mql && mql.addEventListener) mql.addEventListener('change', () => { R.reduced = reducedMotion(); });

  // ── Theme tokens (read live from the dashboard's CSS variables) ───────
  function tk() {
    if (R.tokens) return R.tokens;
    const cs = getComputedStyle(document.documentElement);
    const v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const P = dark ? PALETTE.dark : PALETTE.light;
    // Every chrome colour is a design token (src/styles/00-tokens.css), so
    // charts follow light/dark with the rest of the app. Fallbacks only
    // matter if the stylesheet failed to load.
    R.tokens = {
      dark, pal: P, seq: dark ? SEQ.dark : SEQ.light,
      text: v('--fg', dark ? '#ececef' : '#1b1b1f'), muted: v('--fg-muted', dark ? '#a1a1aa' : '#5d5e66'), dim: v('--fg-subtle', dark ? '#84848e' : '#6f7078'),
      border: v('--border', dark ? '#26262c' : '#e5e5e9'), strong: v('--border-strong', dark ? '#35353d' : '#d2d2d8'),
      card: v('--surface', dark ? '#18181c' : '#ffffff'), raised: v('--surface-raised', dark ? '#1d1d22' : '#ffffff'),
      bg: v('--bg', dark ? '#141417' : '#ffffff'), hover: v('--bg-muted', dark ? '#1c1c20' : '#f1f1f3'),
      grid: v('--border-subtle', dark ? '#1c1c21' : '#f0f0f2'),
      accent: v('--accent', P[0]), income: P[2], neg: v('--danger', dark ? '#ff6369' : '#e5484d'),
      uncat: v('--sw-slate', dark ? '#8b8f99' : '#868a94'), other: v('--fg-disabled', dark ? '#4c4c55' : '#b5b6bc'), ghost: v('--border-strong', dark ? '#35353d' : '#d2d2d8'),
      good: v('--success-ink', dark ? '#5fe0a2' : '#1d7a45'), bad: v('--danger-ink', dark ? '#ff8c90' : '#c9282f'),
      sGood: v('--success', '#2b9a5a'), sWarn: v('--warning', '#e5a000'), sCrit: v('--danger', '#e5484d'),
      font: v('--font-sans', '') || FONT,
    };
    return R.tokens;
  }
  function catColor(c) {
    const t = tk();
    if (c === 'Uncategorised') return t.uncat;
    if (c === 'Income') return t.income;
    if (c === 'Internal transfers') return t.ghost;
    if (c === 'Other') return t.other;
    const s = R.model && R.model.slots[c];
    return s != null ? t.pal[s] : t.other;
  }

