/* ============================================================
   SUGGESTIONS S2 in place: "Block time for this task" in the task card
   OWNER: the suggestion-card builder for TIME & CALENDAR.
   ------------------------------------------------------------
   The task card's side column (61-task-card.js _tcTaskView calls
   sgTaskCardSlot(id)) shows the engine's block-task card for the open task:
   "Free 15:30–17:00 · Block 1 h 30 min for this?". The button opens the
   event card in create mode, prefilled, ON TOP of the task card (Back
   returns to it); the ✓ books it at once, with its receipt (Undo, Open,
   the length chooser) kept here until it folds.
   Nothing here runs at load; the engine (68-suggest-ui.js) is used inside
   functions only.
   ============================================================ */

/** The "Time" section for the open task's card, or null (nothing to offer, suggestions off). */
function sgTaskCardSlot(id) {
  if (!id || (state.suggest && state.suggest.off) || typeof sgCurrent !== 'function') return null;
  let card = null;
  try { card = sgCurrent().res.cards.find(c => c.rule === 'block-task' && c.entity === 'task:' + id) || null; }
  catch (e) { console.error('[suggest] task card', e); return null; }
  const recs = [..._sgReceipts.values()].filter(r => r.surface === 'taskcard' && r.card && r.card.entity === 'task:' + id && !(card && r.key === card.key));
  if (!card && !recs.length) return null;
  const sec = document.createElement('section'); sec.className = 'tc-side-sec sg-tc';
  sec.setAttribute('aria-label', 'Time for this task');
  sec.innerHTML = `<div class="tc-side-h">${icon('calendar-plus', 'i-sm')}<span>Time</span></div>`;
  for (const r of recs) {
    const x = document.createElement('section'); x.className = 'sg-card sg-sz-row'; x.dataset.sgKey = r.key; x.dataset.flip = 'sg:' + r.key;
    _sgPaintReceipt(x, r);
    sec.appendChild(x);
  }
  if (card) sec.appendChild(sgCardEl(card, { surface: 'taskcard', size: 'card' }));
  return sec;
}
