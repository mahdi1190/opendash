/* ============================================================
   HOME widget "review" (owner: Review, v2.16): the review tools when they
   are due, one slim row each, hidden the rest of the time.
     - Friday to Sunday until the week is saved: "Weekly review · about 12 min",
       the stages with their counts, Start / Resume (34-review-flow.js);
     - from 4 pm when Today has leftovers: "Today → Tomorrow · 5 left" (34-sweep.js);
     - follow-ups that are due: "2 people to follow up with" (34-waiting.js);
     - 10+ stale tasks: "23 untouched for 60 days" (34-cleanup.js).
   Full width under the day's hero by default (order 15), so it never breaks the
   default board's shelves; nothing due = no card at all.
   ============================================================ */
registerHomeWidget({
  id: 'review', title: 'Review', icon: 'calendar-check', order: 15, group: 'time',
  description: 'Weekly review (Fri–Sun), Today → Tomorrow in the evening, follow-ups and clean-up when due',
  emptyHint: 'Appears on Friday to Sunday for the weekly review, and in the evening for Today → Tomorrow',
  sizes: ['m', 'l', 'full'], defaultSize: 'full', fresh: true,
  aliases: ['weekly review', 'review', 'plan my week', 'today to tomorrow', 'wrap up', 'clean up', 'follow ups'],
  render(el, ctx) { return _rfHomeRender(el, ctx || {}); },
});

function _rfHomeRows(preview) {
  const rows = [];
  if (preview) {
    rows.push({ ic: 'calendar-check', scene: 'review', title: 'Weekly review · about 12 min', sub: 'Unsorted 4 · Overdue 3 · This week 9 · Someday 2', cta: 'Start', primary: true, run: () => {} });
    rows.push({ ic: 'sunset', title: 'Today → Tomorrow · 3 left', sub: 'One key each, then the day is done', cta: 'Wrap up', run: () => {} });
    return rows;
  }
  const d = rfReviewDraft();
  const sorted = Object.values(d.flow.counts || {}).reduce((t, n) => t + (Number(n) || 0), 0);
  if (rfReviewDueNow() || (sorted && !rfReviewSaved())) {
    const size = rfReviewSize();
    rows.push({ ic: 'calendar-check', scene: 'review', title: `Weekly review · about ${size.minutes} min`, primary: true,
      sub: size.stages.filter(s => s.ids.length).map(s => `${s.label} ${s.ids.length}`).join(' · ') || 'Your lists look tidy: just plan next week',
      cta: sorted ? `Resume (${sorted} done)` : 'Start', run: () => rfReviewStart() });
  }
  const h = Clock.parts(Clock.now()).h;
  const left = h >= 16 ? rfSweepTasks().length : 0;
  if (left) rows.push({ ic: 'sunset', scene: h >= 19 ? 'rest' : '', title: `Today → Tomorrow · ${left} left`, sub: 'One key each: tomorrow, next week, someday, done or drop', cta: 'Wrap up', run: () => rfSweepOpen() });
  const due = rfWaitingTasks().filter(rfNudgeDue);
  if (due.length) {
    const ppl = [];
    for (const i of due) { const p = rfWaitPerson(i); if (p && !ppl.some(x => x.id === p.id)) ppl.push(p); }
    rows.push({ ic: 'bell', title: ppl.length > 1 ? `${ppl.length} people to follow up with` : `Follow up${ppl[0] ? ' with ' + (typeof hglFirst === 'function' ? hglFirst(ppl[0]) : ppl[0].name) : ''}`, people: ppl.slice(0, 4),
      sub: `${due.length} thing${due.length === 1 ? '' : 's'} waiting ${rfNudgeDays()}+ days`, cta: 'Open Waiting', run: () => setView('waiting') });
  }
  if (!(Number(taskViewPrefs('cleanup').snoozeUntil) > Date.now())) {
    const n = rfStaleTasks(rfStaleDays()).length;
    if (n >= 10) rows.push({ ic: 'archive', title: `${n} tasks untouched for ${rfStaleDays()} days`, sub: 'Keep, someday or bin: one key each', cta: 'Review them', run: () => rfCleanupOpen() });
  }
  return rows;
}
function _rfHomeRender(el, ctx) {
  if (!ctx.preview && !getAllItems().length) return false;
  const rows = _rfHomeRows(!!ctx.preview);
  if (!rows.length) return false;
  const card = document.createElement('section'); card.className = 'card home-card rf-hc rf-hc--' + (ctx.size || 'full');
  card.appendChild(cardHead({ icon: 'calendar-check', title: 'Review', count: rows.length > 1 ? rows.length : '' }));
  const list = document.createElement('div'); list.className = 'rf-hc-rows';
  card.appendChild(list);
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'rf-hc-row' + (r.primary ? ' is-main' : '');
    const art = r.scene && typeof hglScene === 'function' ? hglScene(r.scene, { size: r.primary ? 'lg' : 'md', hover: true }) : '';
    row.innerHTML = `<span class="rf-hc-art anim-hover-host">${art || `<span class="rf-hc-i">${icon(r.ic)}</span>`}</span><span class="rf-hc-b"><b>${esc(r.title)}</b><span class="muted">${esc(r.sub)}</span></span>`
      + (r.people && r.people.length ? `<span class="rf-hc-ppl">${r.people.map(p => homeAvatar(p, 24)).join('')}</span>` : '');
    const b = uiButton({ label: r.cta, kind: r.primary ? 'primary' : 'secondary', size: 'sm', run: () => r.run() });
    b.insertAdjacentHTML('beforeend', icon('arrow-right', 'i-sm'));
    row.appendChild(b);
    list.appendChild(row);
  }
  el.appendChild(card);
  if (ctx.enterNew) ctx.enterNew(list.children, (n) => n.querySelector('b') ? n.querySelector('b').textContent : '');
  return true;
}
