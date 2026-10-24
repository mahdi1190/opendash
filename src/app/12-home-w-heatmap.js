/* ============================================================
   HOME widget "heatmap": Your year (Memories, 2.16). A GitHub-style map of the
   tasks you finished, one square a day (darker = more), the last 20 weeks (M),
   34 (L) or a whole year (Full), with your streak and a door into Wrapped.
   A click on a day opens it (memDayDialog). Narrow: it scrolls sideways, today in view.
   CSS: 93-memories.css (.mhm, .hhm-*).
   ============================================================ */
registerHomeWidget({
  id: 'heatmap', title: 'Your year', icon: 'calendar-days', group: 'tasks', order: 260, fresh: true,
  sizes: ['m', 'l', 'full'], defaultSize: 'full',
  description: 'Every day you finished something, as a year of squares, with your streak and Wrapped',
  emptyHint: 'Appears once you have finished a task',
  aliases: ['heatmap', 'contributions', 'year', 'streak', 'calendar heatmap', 'activity graph', 'wrapped', 'year in review'],
  render(el, ctx) { return typeof memHeatmapEl === 'function' ? _hhmRender(el, ctx || {}) : false; },
  refreshKey() { return typeof todayStr === 'function' ? todayStr() + '|' + (state._saveCount || 0) : ''; },
});

function _hhmRender(el, ctx) {
  const size = ctx.size || 'full';
  if (!ctx.preview && !memIndex().all.length) return false;
  const weeks = size === 'm' ? 20 : size === 'l' ? 34 : 53;
  const map = memHeatmapEl({ weeks, cell: size === 'm' ? 12 : 11 });
  const M = map._model, streak = memStreak(), best = memLongestStreak(_memAdd(todayStr(), -7 * weeks), todayStr());
  const year = todayStr().slice(0, 4);
  const card = document.createElement('section');
  card.className = 'card home-card hhm hhm-sz-' + size;
  card.innerHTML = `<div class="card-h">${icon('calendar-days')}<h3>Your year</h3><span class="n"></span><span class="spacer"></span></div><div class="card-b hhm-b"></div>`;
  card.querySelector('.n').textContent = `${_memPlural(M.total, 'task')} in ${weeks === 53 ? 'the last year' : weeks + ' weeks'}`;
  const w = document.createElement('button'); w.type = 'button'; w.className = 'btn btn-ghost btn-sm hhm-wrapped';
  w.innerHTML = `${icon('party-popper', 'i-sm')}<span></span>`; w.lastChild.textContent = `Your ${year}`;
  w.title = 'Wrapped: your year in OpenDash';
  w.onclick = () => memWrappedOpen(+year);
  card.querySelector('.card-h').appendChild(w);
  const body = card.querySelector('.hhm-b');
  const sc = document.createElement('div'); sc.className = 'hhm-scroll'; sc.appendChild(map);
  body.appendChild(sc);
  const foot = document.createElement('div'); foot.className = 'hhm-foot';
  foot.innerHTML = `<span class="hhm-stat">${icon('flame', 'i-xs')}<b></b></span><span class="hhm-stat subtle"></span><span class="spacer"></span>${memHeatmapLegendHtml()}`;
  foot.querySelector('b').textContent = streak ? `${_memPlural(streak, 'day')} in a row` : 'No streak right now';
  foot.querySelectorAll('.hhm-stat')[1].textContent = best.days > 1 ? `Best: ${best.days} days` : `${_memPlural(M.active, 'active day')}`;
  body.appendChild(foot);
  el.appendChild(card);
  requestAnimationFrame(() => { sc.scrollLeft = sc.scrollWidth; });
  return true;
}
