/* ============================================================
   HOME widget "onthisday": On this day (Memories, 2.16; data in 93-memories-core.js).
   A year ago and a month ago (a week ago when neither has anything): what you finished,
   where you were, who you worked with, the line you wrote that evening. Above them, a
   letter from past you that has arrived (a time capsule) and birthdays in the next week.
   In the evening (M, L): "Today in one line" for tonight's journal.
     S   the best memory in two lines
     M   the memories, the letter, birthdays, tonight's line
     L   plus up to four finished tasks per memory and Rediscover
   A click on a memory opens that day (memDayDialog). Nothing to show = hidden.
   CSS: 93-memories.css (.hotd-*).
   ============================================================ */
registerHomeWidget({
  id: 'onthisday', title: 'On this day', icon: 'history', group: 'fun', order: 255, fresh: true,
  sizes: ['s', 'm', 'l'], defaultSize: 'm',
  description: 'A year ago and a month ago: what you finished, where you were, who you were with. Letters from past you arrive here',
  emptyHint: 'Appears when there is something to look back on',
  aliases: ['on this day', 'memories', 'a year ago', 'a month ago', 'look back', 'time capsule', 'journal', 'birthdays', 'throwback'],
  render(el, ctx) { return typeof memOnThisDay === 'function' ? _hotdRender(el, ctx || {}) : false; },
});

function _hotdMemoryEl(m, size) {
  const d = m.day, b = document.createElement('button');
  b.type = 'button'; b.className = 'hotd-m hotd-' + m.kind;
  const j = d.journal;
  const max = size === 'l' ? 4 : size === 'm' ? 2 : 1;
  const titles = d.done.map(t => t.title).filter((t, i, a) => a.indexOf(t) === i);
  b.innerHTML = `<span class="hotd-when"><b></b><span class="subtle"></span></span><span class="hotd-what"></span>`;
  b.querySelector('.hotd-when b').textContent = m.label;
  b.querySelector('.hotd-when .subtle').textContent = _memFmt(m.iso, { weekday: 'short', day: 'numeric', month: 'short', year: m.kind === 'year' ? 'numeric' : undefined });
  const what = b.querySelector('.hotd-what');
  if (j && j.line) { const q = document.createElement('q'); q.className = 'hotd-line'; q.textContent = j.line; what.appendChild(q); }
  if (titles.length) {
    const p = document.createElement('span'); p.className = 'hotd-done';
    p.textContent = (titles.length === 1 ? 'You finished ' : `${titles.length} done, like `) + titles.slice(0, max).map(t => `“${t}”`).join(', ') + (titles.length > max ? ` and ${titles.length - max} more` : '');
    what.appendChild(p);
  }
  if (size !== 's') {
    const meta = document.createElement('span'); meta.className = 'hotd-meta';
    if (d.place) meta.insertAdjacentHTML('beforeend', `<span class="chip mem-chip">${icon(d.place.trip ? 'plane' : 'map', 'i-xs')}${esc(d.place.name)}</span>`);
    const ppl = d.people.slice(0, 3).map(([id]) => getPerson(id)).filter(Boolean);
    if (ppl.length) meta.insertAdjacentHTML('beforeend', `<span class="hotd-ppl">${ppl.map(p => avatarHtml(p, 18)).join('')}<span class="subtle">${esc('with ' + _memList(ppl.map(p => _pplFirst(p))))}</span></span>`);
    if (meta.firstChild) what.appendChild(meta);
  }
  b.setAttribute('aria-label', `${m.label}, ${_memFmtLong(m.iso)}: open that day`);
  b.onclick = () => memDayDialog(m.iso);
  return b;
}
function _hotdRender(el, ctx) {
  const size = ctx.size || 'm', today = todayStr();
  const mems = ctx.preview ? [] : memOnThisDay(today);
  const due = ctx.preview ? [] : memCapsulesDue();
  const bdays = ctx.preview ? [] : memBirthdaysSoon(7);
  const evening = size !== 's' && !ctx.preview && Clock.parts(Clock.now()).h >= _memEveningHour();
  const j = memState().journal[today];
  const wantLine = evening && !(j && j.line) && (memDayCount(today) > 0 || mems.length || due.length);
  if (!mems.length && !due.length && !bdays.length && !wantLine && !(evening && j && j.line)) return false;

  const card = document.createElement('section');
  card.className = 'card home-card hotd hotd-sz-' + size;
  card.innerHTML = `${cardHeadHtml({ icon: 'history', title: 'On this day', cls: '', count: ' ' })}<div class="card-b hotd-b"></div>`;
  card.querySelector('.n').textContent = _memFmt(today, { day: 'numeric', month: 'long' });
  const head = card.querySelector('.card-h');
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-ghost btn-sm'; go.innerHTML = `<span>Memories</span>${icon('arrow-right')}`;
  go.onclick = () => setView('memories'); head.appendChild(go);
  const body = card.querySelector('.hotd-b');

  for (const c of due.slice(0, 1)) {
    const r = document.createElement('div'); r.className = 'hotd-letter';
    r.innerHTML = `<span class="hotd-env" aria-hidden="true">${icon('mail', 'i-md')}</span><span class="hotd-letter-t"><b>A letter from past you has arrived</b><span class="subtle"></span></span>`;
    r.querySelector('.subtle').textContent = `Written ${_memFmt(Clock.parts(c.created).iso, { day: 'numeric', month: 'long', year: 'numeric' })}` + (due.length > 1 ? ` · ${due.length - 1} more waiting` : '');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-sm'; b.textContent = 'Open'; b.onclick = () => memCapsuleReveal(c.id);
    r.appendChild(b); body.appendChild(r);
  }
  if (bdays.length && size !== 's') {
    const r = document.createElement('div'); r.className = 'hotd-bdays';
    for (const x of bdays.slice(0, 3)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip hotd-bday' + (x.inDays === 0 ? ' is-today' : '');
      b.innerHTML = `${icon('cake', 'i-xs')}<span></span>`;
      b.lastChild.textContent = `${_pplFirst(x.person)} ${x.inDays === 0 ? 'today' : x.inDays === 1 ? 'tomorrow' : _memFmt(x.iso, { weekday: 'short' })}${x.turning ? ` (${x.turning})` : ''}`;
      b.onclick = () => openPerson(x.person.id);
      r.appendChild(b);
    }
    body.appendChild(r);
  }
  for (const m of mems.slice(0, size === 's' ? 1 : 2)) body.appendChild(_hotdMemoryEl(m, size));
  if (evening && (wantLine || (j && j.line))) {
    const r = document.createElement('div'); r.className = 'hotd-tonight';
    r.innerHTML = `<span class="hotd-tonight-l">${icon('notebook-pen', 'i-xs')}<span>Tonight's journal</span></span>`;
    r.appendChild(memLineInputEl(today, { onSave: () => {} }));
    body.appendChild(r);
  }
  if (size === 'l' && !ctx.preview) {
    const f = document.createElement('div'); f.className = 'hotd-foot';
    const rd = document.createElement('button'); rd.type = 'button'; rd.className = 'btn btn-ghost btn-sm'; rd.innerHTML = `${icon('sparkles', 'i-sm')}<span>Rediscover a day</span>`;
    rd.onclick = () => { const d = memRediscover(); if (d) memDayDialog(d); else toast('Come back when there is more history to rediscover', { icon: 'history' }); };
    const cap = document.createElement('button'); cap.type = 'button'; cap.className = 'btn btn-ghost btn-sm'; cap.innerHTML = `${icon('mail', 'i-sm')}<span>Write to future you</span>`;
    cap.onclick = () => memCapsuleWrite();
    f.append(rd, cap); body.appendChild(f);
  }
  el.appendChild(card);
  return true;
}
