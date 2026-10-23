/* ============================================================
   VERSION NOTICE: "Mac is on 2.15.0: update it to sync everything". Owner: Sync.
   GET /api/sync/presence lists `notices` (lib/sync-presence.mjs): another of
   your devices runs an older OpenDash than this one. One gentle notice per
   device and version:
     - shown once as a toast that stays a little longer, with Got it (once for
       the person: seen.once 'syncVersionShown:...');
     - listed at the top of the sync dot's panel (56-presence.js), with
       Dismiss, and the dot is amber ("Needs attention") until it is dismissed;
     - dismissed for the person, not the browser: the synced seen flags
       (06-core-seen.js seen.once 'syncVersion:<device>:<version>'), so the
       other computer does not show it again. A newer version there that is
       still older than this one is a new notice.
   ============================================================ */
function _prSeenKey(id) { return 'syncVersion:' + String(id || '').slice(0, 80); }
/** The notices in a presence view that were not dismissed yet. */
function presenceFreshNotices(v) {
  const list = v && Array.isArray(v.notices) ? v.notices : [];
  return list.filter(n => n && n.id && n.text && !(typeof seenOnce === 'function' && seenOnce(_prSeenKey(n.id))));
}
/** Dismiss one notice for every device of the person. */
function presenceDismissNotice(id) {
  if (!id) return;
  if (typeof seenMarkOnce === 'function') seenMarkOnce(_prSeenKey(id));
  if (typeof presenceRender === 'function') presenceRender();
}
const _prNoticeShown = new Set();
/**
 * Show each new notice once for the person (seen.once 'syncVersionShown:...', synced: the
 * other computer does not pop it up again); the panel keeps it until it is dismissed.
 */
function presenceShowNotices(v) {
  for (const n of presenceFreshNotices(v)) {
    const shownKey = 'syncVersionShown:' + String(n.id).slice(0, 80);
    if (_prNoticeShown.has(n.id) || (typeof seenOnce === 'function' && seenOnce(shownKey))) continue;
    _prNoticeShown.add(n.id);
    if (typeof seenMarkOnce === 'function') seenMarkOnce(shownKey);
    if (typeof toast === 'function') toast(n.text, { icon: 'info', timeout: 12000, action: { label: 'Got it', run: () => presenceDismissNotice(n.id) } });
  }
}
