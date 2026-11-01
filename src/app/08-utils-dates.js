/* ============================================================
   HELPERS
   ============================================================ */
// A Date's own local calendar day (the browser's zone). "Today" and friends ask
// Clock (07-core-clock.js), so the page, the server and the MCP agree on the
// day while the user travels (travel spec 2.2, P1). The `typeof Clock` checks
// keep these working where Clock is not loaded (page files run alone in tests).
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;   // clock-ok: formats the Date it is given
const _dtClock = () => (typeof Clock !== 'undefined' ? Clock : null);
const _dtAddDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };   // clock-ok: pure ISO arithmetic (UTC)
const _dtBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 86400000); };
const todayStr = () => { const C = _dtClock(); return C ? C.today() : fmtDate(new Date(Date.now())); };
const tomorrowStr = () => _dtAddDays(todayStr(), 1);
const daysUntil = (s) => {
  if (!s) return null;
  const n = _dtBetween(todayStr(), String(s).slice(0, 10));
  return Number.isFinite(n) ? n : NaN;
};
const formatTimestamp = (ts) => {
  // Yesterday is the calendar day before (_dtAddDays), never "24 hours ago": a DST day is 23 or 25 hours.
  const C = _dtClock();
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  const ms = Number(ts) || Date.parse(ts);
  const day = C ? C.parts(ms).iso : fmtDate(new Date(ms));
  const today = todayStr();
  const time = C ? C.fmtTime(ms) : new Date(ms).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}) });
  if (day === today) return `Today, ${time}`;
  if (day === _dtAddDays(today, -1)) return `Yesterday, ${time}`;
  const date = C ? C.fmtDate(ms, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(ms).toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
  return `${date}, ${time}`;
};
const advanceByRecurrence = (dateStr, recurrence) => {
  // Calendar arithmetic on the ISO date (UTC, so no zone or DST can shift it);
  // a month step keeps JavaScript's overflow (31 Jan -> 3 Mar), as before.
  const [y, m, dd] = (dateStr || todayStr()).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  if (recurrence === 'daily')    d.setUTCDate(d.getUTCDate() + 1);
  else if (recurrence === 'weekly')  d.setUTCDate(d.getUTCDate() + 7);
  else if (recurrence === 'biweekly')d.setUTCDate(d.getUTCDate() + 14);
  else if (recurrence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else if (recurrence === 'weekdays') {
    do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  }
  return d.toISOString().slice(0, 10);   // clock-ok: a UTC-midnight date, not "today"
};

/* ============================================================
   DATE / PROGRESS / TOPBAR
   ============================================================ */
function dueClass(s) { if (!s) return ''; const d = daysUntil(s); if (d<0)return'overdue'; if(d===0)return'today'; if(d<=7)return'soon'; return ''; }
// A new Intl formatter costs far more than formatting with one, and these labels are drawn hundreds of times per render.
const _dueFmts = new Map(), _dueLabels = new Map();
function _dueFmt(loc, o) {
  const k = (loc || '') + JSON.stringify(o);
  let f = _dueFmts.get(k);
  if (!f) _dueFmts.set(k, f = new Intl.DateTimeFormat(loc, o));
  return f;
}
function dueLabel(s) {
  if (!s) return '';
  const key = s + '|' + todayStr();
  let v = _dueLabels.get(key);
  if (v === undefined) {
    if (_dueLabels.size > 3000) _dueLabels.clear();   // (old days' keys)
    _dueLabels.set(key, v = _dueLabelMake(s));
  }
  return v;
}
function _dueLabelMake(s) {
  const d = daysUntil(s);
  if (d === 0) return 'Today';
  if (d < 0) return `${-d}d ago`;
  if (d === 1) return 'Tomorrow';
  // Locale from data/config.json (APP_CONFIG), so the labels follow the user.
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  // A wall date: noon UTC formatted in UTC is that date in any zone.
  const dt = new Date(String(s).slice(0, 10) + 'T12:00:00Z');
  if (isNaN(dt)) return s;
  if (d <= 7) return _dueFmt(loc, { weekday:'short', timeZone: 'UTC' }).format(dt);
  const sameYear = String(s).slice(0, 4) === todayStr().slice(0, 4);
  return _dueFmt(loc, sameYear ? { day:'numeric', month:'short', timeZone: 'UTC' } : { day:'numeric', month:'short', year:'numeric', timeZone: 'UTC' }).format(dt);
}

