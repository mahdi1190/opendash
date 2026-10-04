/* ============================================================
   HELPERS
   ============================================================ */
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => fmtDate(new Date());
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate()+1); return fmtDate(d); };
const daysUntil = (s) => {
  if (!s) return null;
  const [ty,tm,td] = todayStr().split('-').map(Number);
  const [y,m,d]    = s.split('-').map(Number);
  return Math.round((new Date(y,m-1,d) - new Date(ty,tm-1,td)) / 86400000);
};
const formatTimestamp = (ts) => {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today, ${d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`;
  const yd = new Date(now); yd.setDate(yd.getDate() - 1);   // the calendar day before (a DST day is 23 or 25 hours)
  if (d.toDateString() === yd.toDateString()) return `Yesterday, ${d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`;
  return `${d.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})}, ${d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`;
};
const advanceByRecurrence = (dateStr, recurrence) => {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  if (recurrence === 'daily')    d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly')  d.setDate(d.getDate() + 7);
  else if (recurrence === 'biweekly')d.setDate(d.getDate() + 14);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (recurrence === 'weekdays') {
    do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  }
  return fmtDate(d);
};

/* ============================================================
   DATE / PROGRESS / TOPBAR
   ============================================================ */
function dueClass(s) { if (!s) return ''; const d = daysUntil(s); if (d<0)return'overdue'; if(d===0)return'today'; if(d<=7)return'soon'; return ''; }
function dueLabel(s) {
  if (!s) return ''; const d = daysUntil(s);
  if (d === 0) return 'Today';
  if (d < 0) return `${-d}d ago`;
  if (d === 1) return 'Tomorrow';
  // Locale from data/config.json (APP_CONFIG), so the labels follow the user.
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  const dt = new Date(s + 'T00:00:00');
  if (isNaN(dt)) return s;
  if (d <= 7) return dt.toLocaleDateString(loc, { weekday:'short' });
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  return dt.toLocaleDateString(loc, sameYear ? { day:'numeric', month:'short' } : { day:'numeric', month:'short', year:'numeric' });
}

