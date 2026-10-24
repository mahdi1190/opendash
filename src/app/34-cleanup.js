/* ============================================================
   STALE-TASK CLEAN-UP (owner: Review, v2.16).
   "23 tasks untouched for 60 days: review them?" (a banner on All tasks and
   No date, the Review hub, Home's Review card, the Review menu). The card deck
   (34-flow.js) shows them oldest first: K keep (it counts as touched, so it
   will not come back for another 60 days), S someday, B bin (Undo brings it
   back; it is in the Bin too), C done, E edit. Not now hides the banner for a
   week. The age is a setting (30 to 180 days).
   ============================================================ */
function rfStaleDays() { const n = Number(taskViewPrefs('cleanup').days); return n >= 14 && n <= 365 ? Math.round(n) : 60; }

function rfCleanupOpen() {
  const days = rfStaleDays();
  const list = rfStaleTasks(days).slice(0, 100);
  rfDeckOpen({
    title: list.length ? `Clean up · ${list.length} untouched for ${days} days` : 'Clean up', reason: 'Clean-up', finishLabel: 'Done',
    stages: [{ id: 'stale', label: `Untouched for ${days}+ days`, icon: 'archive', keys: ['keep', 'someday', 'bin', 'done', 'edit'], labels: { keep: 'Keep (still matters)' }, ids: list.map(i => i.id),
      why: (i) => `last touched ${_rfAgo(rfLastTouch(i))}${effDate(i) ? ` · was due ${dueLabel(effDate(i))}` : ''}` }],
    finish(el, ctx) {
      const c = ctx.counts;
      const lighter = (c.bin || 0) + (c.someday || 0) + (c.done || 0);
      const art = typeof animSceneHtml === 'function' ? animSceneHtml(lighter ? 'celebration' : 'review', { size: 'hero', once: true }) : '';
      el.innerHTML = `<div class="rf-end-hero">${art}</div><div class="rf-end-h"><h2>${list.length ? (lighter ? `Your lists are ${lighter} task${lighter === 1 ? '' : 's'} lighter` : 'All kept') : 'Nothing has gone stale'}</h2>`
        + `<p class="muted">${list.length ? 'Kept tasks count as touched, so they stay out of here for a while.' : `Every open task has been touched in the last ${days} days.`}</p></div>` + rfCountsHtml(c);
      const row = document.createElement('div'); row.className = 'rf-end-bar';
      const lbl = document.createElement('label'); lbl.className = 'rf-pw-wk'; lbl.innerHTML = '<span>Count a task as stale after</span>';
      const sel = document.createElement('select'); sel.className = 'control control-sm';
      for (const n of [30, 45, 60, 90, 120, 180]) { const o = document.createElement('option'); o.value = n; o.textContent = `${n} days`; if (n === days) o.selected = true; sel.appendChild(o); }
      sel.onchange = () => setTaskViewPref('cleanup', { days: Number(sel.value) });
      lbl.appendChild(sel);
      const bin = document.createElement('button'); bin.type = 'button'; bin.className = 'btn btn-ghost'; bin.innerHTML = icon('trash-2') + '<span>Open the Bin</span>';
      bin.onclick = () => { ctx.close(); setView('bin'); };
      const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-primary'; ok.innerHTML = '<span>Done</span><kbd class="kbd">Enter</kbd>';
      ok.onclick = () => ctx.close();
      row.append(lbl, Object.assign(document.createElement('span'), { className: 'spacer' }), ...(c.bin ? [bin] : []), ok);
      el.appendChild(row);
      ctx.enter(() => ok.click());
      setTimeout(() => { try { ok.focus({ preventScroll: true }); } catch (e) {} }, 30);
    },
    onClose() { setTaskViewPref('cleanup', { lastAt: Date.now() }); renderMain(); },
  });
}
/** Banner when enough tasks went stale (5+) and it was not put off this week. */
function rfCleanupBanner() {
  const p = taskViewPrefs('cleanup');
  if (Number(p.snoozeUntil) > Date.now()) return null;
  const days = rfStaleDays();
  const n = rfStaleTasks(days).length;
  if (n < 5) return null;
  const el = document.createElement('div'); el.className = 'rf-strip rf-strip-stale';
  el.innerHTML = `${icon('archive', 'i-sm')}<span class="rf-strip-t"><b>${esc(n)} tasks untouched for ${esc(days)} days.</b> Review them? One key each: keep, someday or bin.</span>`;
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-secondary btn-sm'; go.innerHTML = '<span>Review them</span>' + icon('arrow-right', 'i-sm');
  go.onclick = () => rfCleanupOpen();
  const later = document.createElement('button'); later.type = 'button'; later.className = 'btn btn-ghost btn-sm'; later.textContent = 'Not now';
  later.onclick = () => { setTaskViewPref('cleanup', { snoozeUntil: Date.now() + 7 * 864e5 }); el.remove(); };
  el.append(go, later);
  return el;
}
/** The strips a task list shows under its quick-add box (31-task-views.js): follow-ups on Today, the clean-up on All / No date. */
function rfListBanners(view) {
  try {
    if (view === 'today') return typeof rfTodayFollowUps === 'function' ? rfTodayFollowUps() : null;
    if (view === 'all' || view === 'no-date') return rfCleanupBanner();
  } catch (e) { console.error('[review] banner', e); }
  return null;
}
