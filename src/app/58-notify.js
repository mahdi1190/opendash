/* ============================================================
   NOTIFICATIONS (browser, while a dashboard tab is open). Owner: Settings.
   Settings > Notifications writes config.notifications:
     enabled       show notifications at all (needs browser permission)
     dueDigest     once a day after 08:00: due today / overdue counts
     eventLeadMin  minutes before a timed calendar event (0 = off)
   Several open tabs do not double up: each notice is claimed in
   localStorage first, and notifications use a tag.
   ============================================================ */
function notifyShow(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(String(title), { body: String(body || ''), tag: tag ? 'dashboard-' + tag : undefined });
    n.onclick = () => { try { window.focus(); } catch (e) { /* ignore */ } n.close(); };
    return true;
  } catch (e) { return false; }
}
/** Claim a one-off notice across tabs; false if another tab (or an earlier tick) had it. */
function _notifyClaim(key) {
  try {
    const k = 'dashboard-notified:' + key;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, String(Date.now()));
    return true;
  } catch (e) { return true; }
}
function _notifyPrune() {
  try {
    const cutoff = Date.now() - 3 * 86400000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dashboard-notified:') && Number(localStorage.getItem(k)) < cutoff) localStorage.removeItem(k);
    }
  } catch (e) { /* ignore */ }
}
function _notifyEvents() {
  try { if (typeof calAllEvents === 'function') return calAllEvents(); } catch (e) { /* fall back */ }
  return (state && state.calCache && Array.isArray(state.calCache.events)) ? state.calCache.events : [];
}
function _notifyTick() {
  const n = APP_CONFIG.notifications;
  if (!n || !n.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted' || typeof state === 'undefined') return;
  // The digest hour and "today" in the dashboard's zone (Clock, travel spec 2.7 P8); event leads are instants.
  const nowMs = Clock.now();
  if (n.dueDigest !== false && Clock.parts(nowMs).h >= 8) {
    const today = todayStr();
    if (_notifyClaim('digest:' + today)) {
      let due = 0, overdue = 0;
      for (const t of getAllItems()) {
        if (statusOf(t.id) === 'done') continue;
        const d = effDate(t); if (!d) continue;
        if (d === today) due++; else if (d < today) overdue++;
      }
      if (due || overdue) {
        const parts = [due ? `${due} due today` : null, overdue ? `${overdue} overdue` : null].filter(Boolean);
        notifyShow('Today', parts.join(' · '), 'digest');
      }
    }
  }
  const lead = Number(n.eventLeadMin) || 0;
  if (lead > 0) {
    for (const ev of _notifyEvents()) {
      const s = ev && ev.start && ev.start.dateTime ? Date.parse(ev.start.dateTime) : NaN;
      if (!Number.isFinite(s)) continue;
      const mins = (s - nowMs) / 60000;
      if (mins <= lead && mins > lead - 2 && ev.selfResponse !== 'declined' && ev.status !== 'cancelled' && _notifyClaim('event:' + (ev.id || s) + ':' + s)) {
        const at = Clock.fmtTime(s);
        notifyShow(ev.summary || 'Event', `Starts at ${at}${ev.location ? ' · ' + ev.location : ''}`, 'event');
      }
    }
  }
}
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  setTimeout(() => { _notifyPrune(); _notifyTick(); }, 8000);
  setInterval(_notifyTick, 60000);
}
