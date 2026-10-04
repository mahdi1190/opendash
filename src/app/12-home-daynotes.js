/* ============================================================
   DAILY NOTE STORE (page side). Owner: the "notebook" widget builder
   (WIDGETS_CATALOGUE.md 3.15). state.daynotes = {'YYYY-MM-DD': {md, updatedAt}}:
   a DATA key, so every save is one undo step, reaches the server like any data
   change, and live sync merges two tabs day by day (86-live-sync.js). The rules
   (10,000-character cap, append, merge) are in 12-home-notebook-logic.js, which
   the server's daynote.save op uses too (server/actions/ops-daynotes.mjs).
   Assistants and scripts write through that op; the page writes here.

     daynoteGet(date)             -> {md, updatedAt} | null
     daynoteMd(date)              -> the day's markdown ('' when none)
     daynoteSet(date, md)         -> {ok, changed, error?}: ONE saveData (one undo step);
                                     '' clears the day. Never renders (callers repaint).
     daynoteAppend(date, line)    the same, adding `line` at the end on a line of its own
     daynoteDates()               the days that have a note, oldest first
   ============================================================ */
function _daynotesMap() {
  if (!state.daynotes || typeof state.daynotes !== 'object' || Array.isArray(state.daynotes)) state.daynotes = {};
  return state.daynotes;
}
function daynoteGet(date) {
  const m = state && state.daynotes;
  const e = m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, date) ? m[date] : null;
  return e && typeof e.md === 'string' ? e : null;
}
function daynoteMd(date) { const e = daynoteGet(date); return e ? e.md : ''; }
function daynoteSet(date, md) {
  if (!dnIsDate(date)) return { ok: false, changed: false, error: 'That is not a day the note can be saved under.' };
  const next = dnNorm(md);
  const err = dnCheck(next);
  if (err) return { ok: false, changed: false, error: err };
  if (next === daynoteMd(date) || (!next.trim() && !daynoteGet(date))) return { ok: true, changed: false };
  const map = _daynotesMap();
  if (next.trim()) map[date] = { md: next, updatedAt: new Date().toISOString() };   // clock-ok: an instant (UTC timestamp)
  else delete map[date];
  saveData();
  return { ok: true, changed: true };
}
function daynoteAppend(date, line) { return daynoteSet(date, dnAppend(daynoteMd(date), line)); }
function daynoteDates() {
  const m = state && state.daynotes;
  return m && typeof m === 'object' ? Object.keys(m).filter(d => dnIsDate(d) && m[d] && typeof m[d].md === 'string' && m[d].md.trim()).sort() : [];
}
