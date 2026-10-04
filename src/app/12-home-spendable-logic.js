/* ============================================================
   HOME widget "spendable" (Payday & safe to spend): the pure part.
   OWNER: the "spendable" widget builder (WIDGETS_CATALOGUE.md 3.14).
   No DOM, no page state, no clock: today comes in. tests/home-w-spendable.test.mjs
   runs this file in a VM. It loads before 12-home.js, so it only declares things.

   The numbers are the glance's (GET /api/finance/glance, lib/finance/glance.mjs),
   which are the Finances Overview's own (MBM.compute); this file only words and
   shapes them. Money is written the way the Overview writes it (MBM.makeFmt:
   whole units, the narrow currency symbol, a real minus sign).

     hspQuery(prefs)                  the glance URL for the widget's settings
                                      ({cushion: null|number, mode: 'auto'|'payday'|'month'})
     hspFmt(currency, locale)         {money(x), money2(x), cur, locale}
     hspDayLabel(iso, today, locale)  'Today' | 'Tomorrow' | 'Wed 8' (this week) | '8 Oct'
     hspPaydayText(payday)            'Payday in 9 days' | 'Payday tomorrow' | 'Payday any day now'
                                      | 'Month ends in 9 days' | 'Last day of the month'
     hspLowText(low, today, fmt, locale)   {amount, when, text: 'Lowest £210 on the 24th'} (another
                                      month: 'on 2 Nov') or '' without a low point
     hspShortDate(iso, locale, wd)    '4 Aug' ('Tue 4 Aug' with wd)
     hspInitial(name)                 the letter on a bill's tile
     hspSpark(series, w, h)           {line, area, xy, min, max, first, last} (x by date) or null
     hspModel(glance, {today, fmt, locale, maxBills, userName})   everything the widget draws
     hspAccountName(name, kind, userName)   an account as Home names it (never the user's name)
     hspSay(model, fmt, hidden)       the sentences a screen reader hears ("hidden" for
                                      every amount while Hide amounts is on)
     hspSample(kit)                   the gallery preview's glance (synthetic, from the kit)
   ============================================================ */
const HSP_CUSHION_MAX = 1e6;                    // = lib/finance/glance.mjs MAX_CUSHION
const HSP_STALE_DAYS = 3;                       // older than this: "Bank data 4 days old · Sync"

function _hspDn(iso) { return Math.round(Date.UTC(+String(iso).slice(0, 4), +String(iso).slice(5, 7) - 1, +String(iso).slice(8, 10)) / 864e5); }
function _hspIso(n) { return new Date(n * 864e5).toISOString().slice(0, 10); }   // clock-ok: a day number to its ISO date (UTC arithmetic)
function _hspAddDays(iso, k) { return _hspIso(_hspDn(iso) + k); }
const _HSP_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The glance URL for these settings: the server's own defaults when nothing is set. */
function hspQuery(prefs) {
  const p = prefs && typeof prefs === 'object' ? prefs : {};
  const q = [];
  const c = p.cushion == null || p.cushion === '' ? null : Number(p.cushion);
  if (c != null && Number.isFinite(c)) q.push('cushion=' + Math.round(Math.max(0, Math.min(HSP_CUSHION_MAX, c)) * 100) / 100);
  // The setting says 'payday' (what people call it); the route says 'cycle' (the Overview's word).
  const m = p.mode === 'payday' || p.mode === 'cycle' ? 'cycle' : p.mode === 'month' ? 'month' : null;
  if (m) q.push('mode=' + m);
  return '/api/finance/glance' + (q.length ? '?' + q.join('&') : '');
}

/** Money as the Finances Overview writes it (src/finance/25-money-model.js makeFmt). */
function hspFmt(currency, locale) {
  const CUR = /^[A-Z]{3}$/.test(currency || '') ? currency : 'GBP';
  let LOC = 'en-GB';
  try { LOC = Intl.DateTimeFormat.supportedLocalesOf([locale || 'en-GB'])[0] || 'en-GB'; } catch (e) { /* default */ }
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
  } catch (e) { /* unknown currency */ }
  const cur = (num, neg) => (neg ? '−' : '') + (pre ? sym + num : num + sym);
  const nf0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat(LOC, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return {
    cur: CUR, locale: LOC,
    money: (x) => { x = +x || 0; return cur(nf0.format(Math.abs(Math.round(x))), x < -0.004); },
    money2: (x) => { x = +x || 0; return cur(nf2.format(Math.abs(x)), x < -0.004); },
    /** A change: "+£940" / "−£90". */
    delta: (x) => { x = +x || 0; const s = cur(nf0.format(Math.abs(Math.round(x))), false); return Math.round(x) === 0 ? s : (x > 0 ? '+' : '−') + s; },
  };
}

/** A bill's day: 'Today', 'Tomorrow', 'Wed 8' within the week, else '8 Oct'. */
function hspDayLabel(iso, today, locale) {
  if (!_HSP_ISO.test(String(iso || '')) || !_HSP_ISO.test(String(today || ''))) return String(iso || '');
  const d = _hspDn(iso) - _hspDn(today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) {
    try { return new Date(_hspDn(iso) * 864e5).toLocaleDateString(locale || 'en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric' }); } catch (e) { return iso; }
  }
  return hspShortDate(iso, locale);
}

/** "Payday in 9 days" (or the month's end in month mode). */
function hspPaydayText(p) {
  if (!p || typeof p !== 'object') return '';
  const n = Math.max(0, Math.round(Number(p.daysLeft) || 0));
  if (p.mode === 'month') return n <= 1 ? 'Last day of the month' : `Month ends in ${n} days`;
  if (p.late) return 'Payday any day now';
  return n <= 1 ? 'Payday tomorrow' : `Payday in ${n} days`;
}

function _hspOrdinal(n) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
  return n + s;
}
/** "Lowest £210 on the 24th": the balance after each bill before payday, nothing else spent. */
function hspLowText(low, today, fmt, locale) {
  if (!low || !Number.isFinite(+low.amount) || !_HSP_ISO.test(String(low.date || ''))) return '';
  const f = fmt || hspFmt('GBP', locale);
  const sameMonth = _HSP_ISO.test(String(today || '')) && String(low.date).slice(0, 7) === String(today).slice(0, 7);
  const en = /^en/i.test(String(locale || 'en-GB'));
  const when = sameMonth && en ? 'the ' + _hspOrdinal(+String(low.date).slice(8, 10)) : hspShortDate(low.date, locale);
  return { amount: f.money(low.amount), when, text: `Lowest ${f.money(low.amount)} on ${when}` };
}
/** '4 Aug' in the user's locale (weekday: 'Tue 4 Aug'). */
function hspShortDate(iso, locale, weekday) {
  if (!_HSP_ISO.test(String(iso || ''))) return String(iso || '');
  try { return new Date(_hspDn(iso) * 864e5).toLocaleDateString(locale || 'en-GB', Object.assign({ timeZone: 'UTC', day: 'numeric', month: 'short' }, weekday ? { weekday: 'short' } : {})); } catch (e) { return iso; }
}

/**
 * An account's name as Home shows it. Banks often name an account after its holder
 * ("MR SAM A TAYLOR"): when the name holds a word of the user's own name, the kind
 * says it instead ("Current account"), so Home never shows the user's name on a
 * shared screen. A name in capitals reads in title case.
 */
function _hspNamesUser(raw, userName) {
  const words = String(userName || '').toLowerCase().split(/[^\p{L}]+/u).filter(w => w.length >= 3);
  const hay = ' ' + String(raw || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
  return words.some(w => hay.includes(' ' + w + ' '));
}
function hspAccountName(name, kind, userName) {
  const raw = String(name || '').trim();
  if (!raw || _hspNamesUser(raw, userName)) {
    const k = String(kind || '').trim().toLowerCase().replace(/\s*account$/, '');
    if (!k) return 'Account';
    return k.charAt(0).toUpperCase() + k.slice(1) + ' account';
  }
  if (raw === raw.toUpperCase() && /\p{L}{2}/u.test(raw)) return raw.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return raw;
}

/** The letter on a bill's tile: the first letter or digit of its name. */
function hspInitial(name) {
  const m = String(name || '').match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : '?';
}

/**
 * The balance sparkline in a w x h box: straight segments (so a later change can
 * morph point by point), x by date (gaps in the history keep their width).
 * -> {line, area, xy: [[x, y]], min, max, first, last, n} | null (fewer than 2 days)
 */
function hspSpark(series, w, h) {
  const pts = (Array.isArray(series) ? series : []).filter(p => p && _HSP_ISO.test(String(p.date || '')) && Number.isFinite(+p.v))
    .map(p => ({ date: p.date, v: +p.v, n: _hspDn(p.date) })).sort((a, b) => a.n - b.n);
  if (pts.length < 2) return null;
  const W = w || 300, H = h || 56, pad = 3;
  let min = Infinity, max = -Infinity;
  for (const p of pts) { if (p.v < min) min = p.v; if (p.v > max) max = p.v; }
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const lo = max === min ? min - span / 2 : min;
  const n0 = pts[0].n, nN = pts[pts.length - 1].n;
  const r = (v) => Math.round(v * 100) / 100;
  const xy = pts.map(p => [r(nN === n0 ? 0 : (p.n - n0) / (nN - n0) * W), r(H - pad - (p.v - lo) / span * (H - 2 * pad))]);
  const line = 'M' + xy.map(([x, y]) => `${x},${y}`).join('L');
  return { line, area: `${line}L${W},${H}L0,${H}Z`, xy, pts, min, max, first: pts[0], last: pts[pts.length - 1], n: pts.length, w: W, h: H };
}

/**
 * Everything the widget draws, from a glance. o: {today, fmt, locale, maxBills (5), userName}.
 * -> null (no glance) | {
 *   hero: {kind: 'safe'|'bills'|'none', value, unit, label, spare},
 *   paydayText, month, until ('payday' | 'the month ends'), daysLeft,
 *   bills: [{key, m, name, c, date, day, amount, due, freq, initial}] (at most maxBills), more, billCount, billsTotal,
 *   next: the first bill after payday when there is none before it, or null,
 *   left, cushion, balance: {total, asOf, change, accounts: [{key, name, kind, balance, inTotal}]} | null,
 *   series, low: {amount, date, text, when} | null, stale: {days, text} | null, key }
 */
function hspModel(g, o) {
  o = o || {};
  if (!g || typeof g !== 'object' || g.status !== 'ok') return null;
  const today = _HSP_ISO.test(String(o.today || '')) ? o.today : (g.today || '');
  const fmt = o.fmt || hspFmt(g.currency, o.locale);
  const locale = o.locale || fmt.locale;
  const max = Math.max(1, Math.min(10, Math.round(o.maxBills || 5)));
  const p = g.payday && typeof g.payday === 'object' ? g.payday : { daysLeft: 0, mode: 'month' };
  const month = p.mode === 'month';
  const until = month ? 'the month ends' : 'payday';
  const seen = new Map();
  const bill = (b) => {
    const name = String(b.name || b.m || 'Bill');
    // A stable key (merchant and day): rows glide and only new ones fade in.
    const base = `${b.m}|${b.date}`, k = (seen.get(base) || 0) + 1;
    seen.set(base, k);
    return { key: k > 1 ? `${base}#${k}` : base, m: String(b.m || name), name, c: b.c || '', date: b.date, day: b.due ? 'Due now' : hspDayLabel(b.date, today, locale),
      amount: +b.amount || 0, due: !!b.due, freq: b.freq || '', initial: hspInitial(name) };
  };
  const all = (Array.isArray(g.bills) ? g.bills : []).map(bill);
  const safe = g.safe && typeof g.safe === 'object' ? g.safe : null;
  let hero;
  if (safe) hero = { kind: 'safe', value: +safe.perDay || 0, unit: 'a day', label: 'Safe to spend', spare: (+safe.left || 0) > 0 };
  else if (all.length) hero = { kind: 'bills', value: +g.billsTotal || 0, unit: `of bills before ${until}`, label: `Before ${until}`, spare: null };
  else {
    const n = Math.max(0, Math.round(+p.daysLeft || 0));
    hero = { kind: 'none', value: null, days: n, unit: month ? `day${n === 1 ? '' : 's'} left this month` : `day${n === 1 ? '' : 's'} to payday`, label: month ? 'Month end' : 'Payday', spare: null };
  }
  let next = null;
  if (!all.length && Array.isArray(g.upcoming)) {
    const after = g.upcoming.find(b => b && _HSP_ISO.test(String(b.date || '')) && (!p.next || b.date >= p.next));
    if (after) next = bill(after);
  }
  const bal = g.balance && typeof g.balance === 'object' && Number.isFinite(+g.balance.total) ? {
    total: +g.balance.total, asOf: g.balance.asOf || null,
    change: Number.isFinite(+g.balChange30) && g.balChange30 != null ? +g.balChange30 : null,
    accounts: (Array.isArray(g.balance.accounts) ? g.balance.accounts : []).filter(a => a && Number.isFinite(+a.balance))
      .map((a, i) => { const generic = !String(a.name || '').trim() || _hspNamesUser(a.name, o.userName);
        return { key: String(a.acct || i), name: hspAccountName(a.name, a.kind, o.userName), kind: generic ? '' : String(a.kind || '').toLowerCase(), balance: +a.balance, inTotal: !!a.inTotal }; })
      .sort((a, b) => (b.inTotal - a.inTotal) || (b.balance - a.balance)),
  } : null;
  const lowT = hspLowText(g.low, today, fmt, locale);
  const low = lowT ? { amount: +g.low.amount, date: g.low.date, text: lowT.text, when: lowT.when } : null;
  const sd = Number(g.staleDays);
  const stale = Number.isFinite(sd) && g.staleDays != null && sd > HSP_STALE_DAYS ? { days: sd, text: `Bank data ${sd} days old` } : null;
  const series = Array.isArray(g.balSeries) ? g.balSeries : [];
  return {
    hero, paydayText: hspPaydayText(p), month, until, daysLeft: Math.max(0, Math.round(+p.daysLeft || 0)), paydayDate: p.next || null,
    bills: all.slice(0, max), more: Math.max(0, all.length - max), billCount: all.length, billsTotal: +g.billsTotal || 0,
    next, left: safe ? +safe.left : null, cushion: safe ? +safe.cushion : (Number.isFinite(+g.cushion) ? +g.cushion : null),
    balance: bal, series, low, stale,
    key: [hero.kind, hero.value, p.next, p.daysLeft, all.length, g.billsTotal, safe ? safe.left : '-', bal ? bal.total : '-', series.length, g.staleDays].join('|'),
  };
}

/** What a screen reader hears: amounts in full, or "hidden" for each while Hide amounts is on. */
function hspSay(m, fmt, hidden) {
  if (!m) return { hero: '', left: '', spark: '', low: '' };
  const A = (v) => (hidden ? 'hidden' : fmt.money(v));
  const days = `${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'}`;
  let hero;
  if (m.hero.kind === 'safe') {
    hero = m.hero.spare
      ? `Safe to spend: ${A(m.hero.value)} a day for ${days}, until ${m.until}, after ${A(m.billsTotal)} of bills and a ${A(m.cushion)} cushion.`
      : `Safe to spend: nothing spare until ${m.until}, after ${A(m.billsTotal)} of bills and a ${A(m.cushion)} cushion.`;
  } else if (m.hero.kind === 'bills') hero = `${A(m.hero.value)} of bills before ${m.until}, in ${days}. No balance yet, so safe to spend can't be worked out.`;
  else hero = `${m.paydayText}. No bills before then.`;
  let spark = '';
  const sp = m.balance && hspSpark(m.series, 100, 10);
  if (sp) {
    spark = `Balance over the last ${_hspDn(sp.last.date) - _hspDn(sp.first.date) + 1} days: ${A(sp.first.v)} on ${sp.first.date}, now ${A(m.balance.total)}`
      + (m.balance.change != null ? `, ${m.balance.change >= 0 ? 'up' : 'down'} ${A(Math.abs(m.balance.change))} in 30 days.` : '.')
      + ` Lowest ${A(sp.min)}, highest ${A(sp.max)}.`;
  }
  return {
    hero,
    left: m.left != null ? `${A(Math.max(0, m.left))} left after bills, with ${A(m.cushion)} kept back.` : '',
    spark,
    low: m.low ? `Lowest point before ${m.until}: ${A(m.low.amount)} on ${m.low.when}, if nothing else is spent.` : '',
  };
}

/** The gallery preview's glance, from the shared sample kit (synthetic, relative to the kit's today). */
function hspSample(kit) {
  const k = kit && typeof kit === 'object' ? kit : {};
  const today = _HSP_ISO.test(String(k.today || '')) ? k.today : '2026-01-15';
  const mo = k.money && typeof k.money === 'object' ? k.money : {};
  const daysLeft = Math.max(2, Math.round(+mo.daysLeft || 9));
  const perDay = Number.isFinite(+mo.perDay) ? +mo.perDay : 23;
  const left = Math.round(perDay * daysLeft * 100) / 100;
  const cushion = 100;
  const bills = (Array.isArray(mo.bills) && mo.bills.length ? mo.bills : [{ name: 'Phone', day: _hspAddDays(today, 2), amount: 18 }])
    .map(b => ({ m: String(b.name), name: String(b.name), c: 'Bills & utilities', date: _HSP_ISO.test(String(b.day || '')) ? b.day : _hspAddDays(today, 3), due: false, amount: +b.amount || 0, freq: 'Monthly' }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const billsTotal = Math.round(bills.reduce((s, b) => s + b.amount, 0) * 100) / 100;
  const total = Math.round((left + billsTotal + cushion) * 100) / 100;
  // A pay cycle of 30 days: paid (30 - daysLeft) days ago, spent down to today's balance since.
  const cyc = 30, since = Math.max(0, cyc - daysLeft), perDaySpent = 1100 / cyc, top = total + since * perDaySpent;
  const series = [];
  for (let i = 59; i >= 0; i--) {
    const s = (since - i + cyc * 3) % cyc;                    // days since that cycle's payday
    const wiggle = i === 0 ? 0 : Math.sin(i * 1.7) * 18 + Math.cos(i * 0.9) * 9;
    series.push({ date: _hspAddDays(today, -i), v: Math.round((top - s * perDaySpent + wiggle) * 100) / 100 });
  }
  let run = total, low = null;
  for (const b of bills) { run = Math.round((run - b.amount) * 100) / 100; if (!low || run < low.amount) low = { amount: run, date: b.date, basis: 'bills' }; }
  const bal30 = series[29].v;
  return {
    status: 'ok', currency: mo.currency || 'GBP', mode: 'cycle', auto: 'cycle', today, cushion,
    payday: { next: _hspAddDays(today, daysLeft), daysLeft, hasSalary: true, late: false, mode: 'cycle' },
    safe: { perDay, left, cushion, bills: billsTotal, daysLeft },
    bills, billsTotal, upcoming: bills, upcomingTotal: billsTotal,
    balance: { total, asOf: today, accounts: [
      { acct: 'sample-a1', name: 'Everyday', kind: 'current', balance: total, inTotal: true },
      { acct: 'sample-a2', name: 'Rainy day', kind: 'savings', balance: 1500, inTotal: false },
    ] },
    bal30, balChange30: Math.round((total - bal30) * 100) / 100, balSeries: series, low, staleDays: 0, dataDate: today,
  };
}
