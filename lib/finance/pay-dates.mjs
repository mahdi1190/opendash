// lib/finance/pay-dates.mjs - when money really moves: payday and bill rules, worked out to real dates. Pure, offline.
//
// A rule (stored on a plan item as `when`):
//   {t: 'day', day: 25, adjust: 'prev'|'next'|'none'}   a fixed day of the month (a short month: its last day)
//   {t: 'lastWorking'}                                  the last working day of the month
//   {t: 'lastWeekday', wd: 4}                           the last Friday of the month (0 = Monday ... 6 = Sunday)
//   {t: 'every', days: 7|14|28, anchor: iso, adjust}    weekly, fortnightly, every four weeks, counted from a date
//   {t: 'months', every: 3|12, month: 1-12, day, adjust}   quarterly or yearly
// A date on a weekend or a bank holiday moves to the working day before ('prev': pay) or after ('next': direct debits).
//
// Bank holidays come from the app's offline rules (src/app/69-travel-holidays.js, through lib/travel-data.mjs): no
// network. Payments run on the England & Wales calendar for everyone in the UK (Bacs), so that list is used. Elsewhere
// only weekends move a date.
//
//   realDates(rule, from, to, {country})    [{n, date, nominal, moved, why}] day numbers from..to inclusive
//   nextDates(rule, after, count, o)        the next few real dates after a day
//   describeRule(rule)                      the rule in plain words
//   detectRule(days, o)                     {rule, matched, of} from the days a payment was seen | null
//   freqOfRule(rule)                        'monthly'|'fourweekly'|'fortnightly'|'weekly'|'quarterly'|'yearly'
//   workingDay(n, o), holidayName(n, o), dn(iso), diso(n)

import { places } from '../travel-data.mjs';

export const dn = (iso) => Math.round(Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') / 864e5);
export const diso = (n) => new Date(n * 864e5).toISOString().slice(0, 10);   // clock-ok: a day number to its date
const dobj = (n) => new Date(n * 864e5);
export const dowOf = (n) => (((n + 3) % 7) + 7) % 7;   // Monday = 0
const mIdx = (n) => { const d = dobj(n); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const mStart = (mi) => Math.round(Date.UTC(Math.floor(mi / 12), mi % 12, 1) / 864e5);
const dim = (mi) => mStart(mi + 1) - mStart(mi);

const holCache = new Map();
function ukHolidays(year) {
  if (holCache.has(year)) return holCache.get(year);
  const m = new Map();
  try { for (const h of places.trHolidays('GB', year, { region: 'ENG' })) m.set(h.date, h.name); } catch { /* weekends still work */ }
  holCache.set(year, m);
  return m;
}
export function holidayName(n, { country = 'uk' } = {}) {
  if (country !== 'uk') return null;
  const iso = diso(n);
  return ukHolidays(Number(iso.slice(0, 4))).get(iso) || null;
}
export const workingDay = (n, o = {}) => dowOf(n) < 5 && !holidayName(n, o);
function moveDate(n, dir, o) {
  if (dir === 'none') return n;
  const step = dir === 'next' ? 1 : -1;
  let x = n;
  for (let i = 0; i < 14 && !workingDay(x, o); i++) x += step;
  return x;
}
const WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ord = (d) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The nominal dates of a rule in [from, to], before moving. */
function nominals(rule, from, to) {
  const out = [];
  const r = rule || {};
  if (r.t === 'every') {
    const days = Math.max(1, Math.floor(Number(r.days) || 28));
    const a = r.anchor ? dn(r.anchor) : from;
    let n = a + Math.ceil((from - a) / days) * days;
    for (; n <= to; n += days) out.push(n);
    return out;
  }
  for (let mi = mIdx(from); mi <= mIdx(to); mi++) {
    if (r.t === 'day') out.push(mStart(mi) + Math.min(Math.max(1, Number(r.day) || 1), dim(mi)) - 1);
    else if (r.t === 'lastWorking') out.push(mStart(mi) + dim(mi) - 1);
    else if (r.t === 'lastWeekday') { let n = mStart(mi) + dim(mi) - 1; while (dowOf(n) !== (Number(r.wd) || 0)) n--; out.push(n); }
    else if (r.t === 'months') {
      const every = Math.max(1, Number(r.every) || 12), base = (Math.max(1, Number(r.month) || 1) - 1);
      const mo = mi % 12;
      if (((mo - base) % every + every) % every === 0) out.push(mStart(mi) + Math.min(Math.max(1, Number(r.day) || 1), dim(mi)) - 1);
    }
  }
  return out;
}
/** Real dates in [from, to]: what the bank will show. */
export function realDates(rule, from, to, o = {}) {
  if (!rule || !rule.t) return [];
  const dir = rule.t === 'lastWorking' || rule.t === 'lastWeekday' ? 'prev' : (rule.adjust || 'prev');
  const out = [];
  for (const nom of nominals(rule, from - 10, to + 10)) {
    const n = moveDate(nom, dir, o);
    if (n < from || n > to) continue;
    const moved = n !== nom;
    out.push({ n, date: diso(n), nominal: diso(nom), moved, why: moved ? (holidayName(nom, o) || (dowOf(nom) >= 5 ? 'a weekend' : null)) : null });
  }
  return out;
}
export function nextDates(rule, after, count = 3, o = {}) {
  if (!rule || !rule.t) return [];
  let span = 40, got = [];
  for (let i = 0; i < 6 && got.length < count; i++) { got = realDates(rule, after + 1, after + span, o); span *= 2.5; }
  return got.slice(0, count);
}
export const freqOfRule = (r) => {
  if (!r) return 'monthly';
  if (r.t === 'every') return r.days === 7 ? 'weekly' : r.days === 14 ? 'fortnightly' : r.days === 28 ? 'fourweekly' : 'monthly';
  if (r.t === 'months') return r.every === 12 ? 'yearly' : r.every === 3 ? 'quarterly' : 'monthly';
  return 'monthly';
};
export function describeRule(r) {
  if (!r || !r.t) return 'No date set';
  const moveWord = r.adjust === 'next' ? ' (the next working day if that is a weekend or bank holiday)' : r.adjust === 'none' ? '' : ' (the working day before if that is a weekend or bank holiday)';
  if (r.t === 'day') return `The ${ord(Number(r.day) || 1)} of each month${moveWord}`;
  if (r.t === 'lastWorking') return 'The last working day of each month';
  if (r.t === 'lastWeekday') return `The last ${WD[Number(r.wd) || 0]} of each month`;
  if (r.t === 'every') return ({ 7: 'Every week', 14: 'Every two weeks', 28: 'Every four weeks' }[r.days] || `Every ${r.days} days`) + moveWord;
  if (r.t === 'months') return (r.every === 12 ? `Every year on the ${ord(Number(r.day) || 1)} of ${MONTHS[(Number(r.month) || 1) - 1]}` : `Every three months, from the ${ord(Number(r.day) || 1)} of ${MONTHS[(Number(r.month) || 1) - 1]}`) + moveWord;
  return 'No date set';
}
/** The simplest rule that explains the days a payment was seen on. kind 'pay' moves dates back, 'bill' forward. */
export function detectRule(days, { kind = 'pay', country = 'uk' } = {}) {
  const seen = [...new Set(days)].sort((a, b) => a - b).slice(-6);
  if (seen.length < 2) return null;
  const o = { country };
  const adjust = kind === 'bill' ? 'next' : 'prev';
  const last = seen[seen.length - 1];
  const gaps = seen.slice(1).map((d, i) => d - seen[i]).sort((a, b) => a - b);
  const medGap = gaps[gaps.length >> 1];
  const cands = [];
  if (medGap >= 6 && medGap <= 8) cands.push({ t: 'every', days: 7, anchor: diso(last), adjust });
  else if (medGap >= 12 && medGap <= 16) cands.push({ t: 'every', days: 14, anchor: diso(last), adjust });
  else if (medGap >= 26 && medGap <= 29) cands.push({ t: 'every', days: 28, anchor: diso(last), adjust });
  if (medGap >= 26 && medGap <= 35) {
    cands.push({ t: 'lastWorking' });
    cands.push({ t: 'lastWeekday', wd: dowOf(last) });
    const cnt = new Map(); for (const d of seen) { const x = dobj(d).getUTCDate(); cnt.set(x, (cnt.get(x) || 0) + 1); }
    // A moved date never repeats, so the most common day (the later on a tie) is the rule's.
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    cands.push({ t: 'day', day: top, adjust });
    if (adjust === 'prev') cands.push({ t: 'day', day: top + 1 <= 31 ? top + 1 : top, adjust });   // seen a day early twice
  }
  let best = null;
  for (const rule of cands) {
    const real = new Set(realDates(rule, seen[0] - 3, last + 3, o).map(x => x.n));
    const matched = seen.filter(d => real.has(d)).length;
    if (!best || matched > best.matched) best = { rule, matched, of: seen.length };
  }
  return best && best.matched >= Math.max(2, Math.ceil(seen.length * 0.6)) ? best : null;
}
