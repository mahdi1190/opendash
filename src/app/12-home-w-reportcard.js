/* ============================================================
   HOME widget "reportcard": Week report (Memories, 2.16; memWeekReport in
   93-memories-core.js). This week so far against YOUR OWN average for the same
   days of your last eight weeks: tasks done, active days, the best day, top
   streams and people. Kind words only: a slower week is "a gentler week".
   CSS: 93-memories.css (.hrc-*).
   ============================================================ */
registerHomeWidget({
  id: 'reportcard', title: 'Week report', icon: 'award', group: 'tasks', order: 258, fresh: true, defaultHidden: true,
  sizes: ['s', 'm'], defaultSize: 'm',
  description: 'Your week so far against your own average: tasks, active days, your best day',
  emptyHint: 'Appears once you have finished a task',
  aliases: ['report card', 'week report', 'weekly report', 'my week', 'stats', 'progress', 'average'],
  render(el, ctx) { return typeof memWeekReport === 'function' ? _hrcRender(el, ctx || {}) : false; },
});

const _HRC_VERDICT = {
  stellar: ['Stellar week', 'Well above your usual pace. Remember to rest too.', 'trophy'],
  ahead: ['Ahead of your usual', 'A bit more than a typical week for you.', 'trending-up'],
  steady: ['Right on your rhythm', 'About what a typical week looks like for you.', 'check'],
  gentle: ['A gentler week', 'Slower than usual so far, and that is fine.', 'leaf'],
  new: ['Your first weeks', 'Your average appears after a week or two.', 'sprout'],
};
function _hrcRender(el, ctx) {
  if (!ctx.preview && !memIndex().all.length) return false;
  const r = memWeekReport(), size = ctx.size || 'm';
  const v = _HRC_VERDICT[r.verdict] || _HRC_VERDICT.steady;
  const card = document.createElement('section');
  card.className = 'card home-card hrc hrc-' + r.verdict + ' hrc-sz-' + size;
  card.innerHTML = `<div class="card-h">${icon('award')}<h3>Week report</h3><span class="n"></span></div><div class="card-b hrc-b"><div class="hrc-head"><span class="hrc-badge">${icon(v[2], 'i-md')}</span><span><b></b><span class="subtle"></span></span></div></div>`;
  card.querySelector('.n').textContent = `${_memFmt(r.from, { day: 'numeric', month: 'short' })} – ${_memFmt(r.to, { day: 'numeric', month: 'short' })}`;
  card.querySelector('.hrc-head b').textContent = v[0];
  card.querySelector('.hrc-head .subtle').textContent = v[1];
  const body = card.querySelector('.hrc-b');
  const row = (label, val, avg, max, fmt) => {
    const d = document.createElement('div'); d.className = 'hrc-row';
    const pct = max ? Math.min(100, val / max * 100) : 0, apct = max ? Math.min(100, avg / max * 100) : 0;
    d.innerHTML = `<span class="hrc-l"></span><span class="hrc-bar"><i style="width:${pct.toFixed(1)}%"></i>${r.weeks ? `<b style="left:${apct.toFixed(1)}%" title="Your average"></b>` : ''}</span><span class="hrc-v"></span>`;
    d.querySelector('.hrc-l').textContent = label;
    d.querySelector('.hrc-v').textContent = fmt(val) + (r.weeks ? ` / ${fmt(avg)}` : '');
    return d;
  };
  body.appendChild(row('Tasks done', r.done, r.avgDone, Math.max(r.done, r.avgDone * 1.5, 1), (x) => String(Math.round(x * 10) / 10)));
  body.appendChild(row('Active days', r.active, r.avgActive, r.days, (x) => String(Math.round(x * 10) / 10)));
  if (size !== 's') {
    const meta = document.createElement('div'); meta.className = 'hrc-meta';
    if (r.bestDay.n) meta.insertAdjacentHTML('beforeend', `<span class="chip mem-chip">${icon('star', 'i-xs')}${esc(`Best day: ${_memFmt(r.bestDay.iso, { weekday: 'long' })} (${r.bestDay.n})`)}</span>`);
    for (const s of r.streams.slice(0, 2)) meta.insertAdjacentHTML('beforeend', `<span class="chip mem-chip">${typeof streamMarkHtml === 'function' ? streamMarkHtml(s.id) : ''}${esc(`${s.label} ${s.n}`)}</span>`);
    if (r.streak >= 2) meta.insertAdjacentHTML('beforeend', `<span class="chip mem-chip">${icon('flame', 'i-xs')}${esc(`${r.streak}-day streak`)}</span>`);
    if (meta.firstChild) body.appendChild(meta);
    if (r.weeks) body.insertAdjacentHTML('beforeend', `<p class="hrc-note subtle">${esc(`The marks show your average for the same ${r.days === 1 ? 'day' : r.days + ' days'} of your last ${_memPlural(r.weeks, 'week')}.`)}</p>`);
  }
  el.appendChild(card);
  return true;
}
