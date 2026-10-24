/* ============================================================
   HOME widget "seasonal": the season's small rituals (Memories, 2.16; memSeason
   in 93-memories-core.js). Only there in season:
     1-24 December    the advent calendar: a door a day with one small kind task
                      (Add to today, or Done); past doors can still be opened, later
                      ones are shut. From the 1st, your Wrapped is waiting too.
     26 Dec - 14 Jan  the New Year ritual: look back at last year's goals, set this
                      year's (memGoalsDialog), and open last year's Wrapped.
   The advent calendar hides while the Fun level is Off; the goals stay.
   CSS: 93-memories.css (.hse-*).
   ============================================================ */
registerHomeWidget({
  id: 'seasonal', title: 'Season', icon: 'gift', group: 'fun', order: 28,
  sizes: ['m', 'l', 'full'], defaultSize: 'l',
  description: 'In December an advent calendar of small kind tasks; at New Year, your goals ritual',
  emptyHint: 'Appears in December and at New Year',
  aliases: ['advent', 'advent calendar', 'christmas', 'new year', 'goals', 'resolutions', 'season', 'seasonal'],
  available: () => typeof memSeason === 'function' && !!memSeason(),
  render(el, ctx) { return typeof memSeason === 'function' ? _hseRender(el, ctx || {}) : false; },
});

function _hseRender(el, ctx) {
  const s = memSeason();
  if (!s) return false;
  const card = document.createElement('section');
  card.className = 'card home-card hse hse-' + s.kind;
  if (s.kind === 'advent') {
    if (memFunLevel() === 'off' && !ctx.preview) return false;
    const done = Object.keys(memState().advent[String(s.year)] || {}).length;
    card.innerHTML = `${cardHeadHtml({ icon: 'gift', title: 'Advent', cls: '', count: ' ' })}<div class="card-b hse-b"><div class="hse-doors" role="list"></div></div>`;
    card.querySelector('.n').textContent = `${done} of ${s.day} opened`;
    const w = document.createElement('button'); w.type = 'button'; w.className = 'btn btn-ghost btn-sm'; w.innerHTML = `${icon('party-popper', 'i-sm')}<span></span>`;
    w.lastChild.textContent = `Your ${s.year} Wrapped`; w.onclick = () => memWrappedOpen(s.year);
    card.querySelector('.card-h').appendChild(w);
    const doors = card.querySelector('.hse-doors');
    const order = [7, 15, 2, 21, 11, 4, 18, 9, 24, 1, 13, 20, 6, 16, 10, 23, 3, 12, 19, 8, 14, 22, 5, 17];   // a calendar is never in order
    for (const day of order) {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'listitem');
      const open = day <= s.day, isDone = memAdventDone(s.year, day);
      b.className = 'hse-door' + (open ? ' is-open' : ' is-shut') + (isDone ? ' is-done' : '') + (day === s.day ? ' is-today' : '');
      b.style.setProperty('--c', _MEM_PETALS[day % _MEM_PETALS.length]);
      b.innerHTML = `<span class="hse-num">${day}</span>${isDone ? icon('check', 'i-xs') : day === s.day ? icon('sparkle', 'i-xs') : ''}`;
      b.setAttribute('aria-label', open ? `Day ${day}${isDone ? ', done' : ''}: open` : `Day ${day}: opens on ${day} December`);
      if (open) b.onclick = () => memAdventDoor(s.year, day); else b.disabled = true;
      doors.appendChild(b);
    }
  } else {
    const goals = memGoals(s.year), prev = memGoals(s.year - 1);
    card.innerHTML = `${cardHeadHtml({ icon: 'target', title: '' })}<div class="card-b hse-b"></div>`;
    card.querySelector('h3').textContent = `Hello, ${s.year}`;
    const body = card.querySelector('.hse-b');
    const lead = document.createElement('p'); lead.className = 'hse-lead';
    lead.textContent = goals.length ? `Your goals for ${s.year}:` : prev.length ? `How did your ${s.year - 1} goals go? Then set this year's.` : `A new year: what would you love it to hold?`;
    body.appendChild(lead);
    if (goals.length) {
      const ul = document.createElement('ul'); ul.className = 'mem-goal-list';
      for (const g of goals) {
        const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'mem-goal' + (g.done ? ' is-done' : '');
        b.setAttribute('aria-pressed', g.done ? 'true' : 'false'); b.innerHTML = `<span class="mem-goal-box">${icon('check', 'i-xs')}</span><span></span>`; b.lastChild.textContent = g.text;
        b.onclick = () => { memGoalToggle(s.year, g.id); homeRerenderWidget(ctx.id || 'seasonal'); };
        li.appendChild(b); ul.appendChild(li);
      }
      body.appendChild(ul);
    }
    const row = document.createElement('div'); row.className = 'hse-actions';
    const set = document.createElement('button'); set.type = 'button'; set.className = 'btn ' + (goals.length ? 'btn-secondary' : 'btn-primary') + ' btn-sm';
    set.innerHTML = `${icon('target', 'i-sm')}<span>${goals.length ? 'Edit goals' : `Set my ${s.year} goals`}</span>`; set.onclick = () => memGoalsDialog(s.year);
    const w = document.createElement('button'); w.type = 'button'; w.className = 'btn btn-ghost btn-sm';
    w.innerHTML = `${icon('party-popper', 'i-sm')}<span></span>`; w.lastChild.textContent = `Your ${s.year - 1} Wrapped`; w.onclick = () => memWrappedOpen(s.year - 1);
    const cap = document.createElement('button'); cap.type = 'button'; cap.className = 'btn btn-ghost btn-sm'; cap.innerHTML = `${icon('mail', 'i-sm')}<span>Write to December you</span>`;
    cap.onclick = () => memCapsuleWrite(`Dear December me,\n\nAt the start of ${s.year} I hoped…`);
    row.append(set, w, cap); body.appendChild(row);
  }
  el.appendChild(card);
  return true;
}
