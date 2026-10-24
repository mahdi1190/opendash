/* ============================================================
   MEMORIES: the section (owner: Memories). #view=memories, memories:<tab>:
     journal     tonight's entry (your line, the day's mood, Polish with Claude), then every
                 day you kept, newest first (the template lines, your line, the mood)
     year        a year of squares, the Year in pixels (moods), the numbers, top streams,
                 Wrapped (93-memories-wrapped.js)
     capsules    notes to your future self: sealed until their day
     postcards   the album of first visits (agent locations' tab mounts the same album)
     people      birthdays coming up, friendship streaks, people it has been a while with
     milestones  your 1st, 10th, 100th... task finished, your best streak, firsts
   Group 'home' (the sidebar's Memories item, under Review). Tabs: re-selecting is a no-op;
   the entrance plays once per entry.
   ============================================================ */
const MEM_TABS = [['journal', 'Journal', 'notebook-pen'], ['year', 'Your year', 'calendar-days'], ['capsules', 'Time capsules', 'mail'], ['postcards', 'Postcards', 'map'], ['people', 'People', 'heart'], ['milestones', 'Milestones', 'trophy']];
let _mpEntry = '', _mpYear = 0, _mpJournalN = 30;
function _mpTab(v) { const m = /^memories:([a-z]+)$/.exec(String(v || '')); const t = m ? m[1] : 'journal'; return MEM_TABS.some(x => x[0] === t) ? t : 'journal'; }
function _mpTabLabel(t) { const x = MEM_TABS.find(y => y[0] === t); return x ? x[1] : 'Journal'; }

registerSection('memories', {
  match: v => v === 'memories' || /^memories:[a-z]+$/.test(v),
  title: () => 'Memories',
  crumb: v => (_mpTab(v) === 'journal' ? [] : [_mpTabLabel(_mpTab(v))]),
  group: 'home', layout: 'page', hashable: true, taskControls: false,
  mount(container, view) { _mpMount(container, view || state.view); },
  unmount() { _mpEntry = ''; },
});
registerSidebarBlock('home', {
  id: 'memories-nav', order: 13,
  render(el) {
    const due = typeof memCapsulesDue === 'function' ? memCapsulesDue().length : 0;
    el.appendChild(sbNavItem({ label: 'Memories', icon: 'book-open', view: 'memories', active: /^memories(:|$)/.test(String(state.view)), badge: due ? String(due) : '', title: due ? 'A letter from past you has arrived' : '' }));
  },
});
registerCommand({ id: 'mem-wrapped', label: 'Your year in OpenDash (Wrapped)', icon: 'party-popper', group: 'Go to', keywords: 'wrapped year review recap stats spotify annual memories', run: () => memWrappedOpen() });
registerCommand({ id: 'mem-journal', label: 'Journal', icon: 'notebook-pen', group: 'Go to', keywords: 'memories diary journal day line mood', run: () => setView('memories') });
registerCommand({ id: 'mem-capsule', label: 'Write a note to your future self', icon: 'mail', keywords: 'time capsule letter future self memories', run: () => memCapsuleWrite() });
registerCommand({ id: 'mem-rediscover', label: 'Rediscover a day', icon: 'sparkles', keywords: 'memories random past day throwback on this day', run: () => { const d = memRediscover(); if (d) memDayDialog(d); else toast('Come back when there is more history to rediscover', { icon: 'history' }); } });
registerCommand({ id: 'mem-postcards', label: 'Postcards', icon: 'map', group: 'Go to', keywords: 'memories travel countries trips album', run: () => setView('memories:postcards') });

function _mpMount(container, view) {
  const tab = _mpTab(view);
  const entering = _mpEntry !== view;
  _mpEntry = view;
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = 'What your days add up to: kept on this computer, synced to yours';
  const root = document.createElement('div');
  root.className = 'mem-page mem-tab-' + tab + (entering ? ' is-enter' : '');
  const tabs = document.createElement('div'); tabs.className = 'mem-tabs'; tabs.setAttribute('role', 'tablist');
  for (const [id, label, ic] of MEM_TABS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mem-tab'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', id === tab ? 'true' : 'false');
    let badge = '';
    if (id === 'capsules') { const n = memCapsulesDue().length; if (n) badge = `<span class="badge badge-danger">${n}</span>`; }
    b.innerHTML = `${icon(ic, 'i-sm')}<span>${esc(label)}</span>${badge}`;
    b.onclick = () => { if (id === tab) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: 'smooth' }); return; } setView(id === 'journal' ? 'memories' : 'memories:' + id); };
    tabs.appendChild(b);
  }
  root.appendChild(tabs);
  const body = document.createElement('div'); body.className = 'mem-body';
  root.appendChild(body);
  container.appendChild(root);
  try {
    if (tab === 'journal') _mpJournal(body);
    else if (tab === 'year') _mpYearTab(body);
    else if (tab === 'capsules') _mpCapsules(body);
    else if (tab === 'postcards') _mpPostcards(body);
    else if (tab === 'people') _mpPeople(body);
    else if (tab === 'milestones') _mpMilestones(body);
  } catch (e) {
    console.error('[memories] page', e);
    body.innerHTML = `<div class="mem-empty">${icon('circle-alert', 'i-lg')}<div><b>This part of Memories could not load</b><span>Your memories are safe. Reload the page; if it keeps happening, check the console.</span></div></div>`;
  }
}
function _mpSection(title, ic, extra) {
  const s = document.createElement('section'); s.className = 'mem-sec';
  s.innerHTML = `<div class="mem-sec-h">${icon(ic, 'i-sm')}<h2></h2><span class="spacer"></span></div>`;
  s.querySelector('h2').textContent = title;
  if (extra) s.querySelector('.mem-sec-h').appendChild(extra);
  return s;
}
function _mpBtn(label, ic, run, cls) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'btn-secondary') + ' btn-sm';
  b.innerHTML = `${icon(ic, 'i-sm')}<span></span>`; b.lastChild.textContent = label; b.onclick = run;
  return b;
}

/* ---------- journal ---------- */
function _mpEntryEl(iso, j, o) {
  o = o || {};
  const el = document.createElement('article');
  el.className = 'mem-entry' + (o.tonight ? ' is-tonight' : '') + (j.preview ? ' is-preview' : '');
  const date = document.createElement('button'); date.type = 'button'; date.className = 'mem-entry-d';
  date.innerHTML = `<span class="mem-entry-dn"></span><span class="mem-entry-m"></span>${j.mood ? `<i class="mem-dot mem-mood-${j.mood}" title="${escAttr((MEM_MOODS.find(x => x[0] === j.mood) || [0, ''])[1])}"></i>` : ''}`;
  date.querySelector('.mem-entry-dn').textContent = _memFmt(iso, { day: 'numeric' });
  date.querySelector('.mem-entry-m').textContent = _memFmt(iso, { weekday: 'short', month: 'short' });
  date.title = 'Open ' + _memFmtLong(iso);
  date.onclick = () => memDayDialog(iso);
  const main = document.createElement('div'); main.className = 'mem-entry-b';
  if (o.tonight) { const h = document.createElement('div'); h.className = 'mem-entry-over'; h.textContent = j.preview ? `Today so far (tonight's entry is written from ${_memEveningHour()}:00)` : 'Tonight'; main.appendChild(h); }
  const showPol = !!j.polished && !o.original;
  const p = document.createElement('p'); p.className = 'mem-entry-t'; p.textContent = showPol ? j.polished : (j.text || '');
  main.appendChild(p);
  if (o.tonight || o.edit) main.appendChild(memLineInputEl(iso));
  else if (j.line) { const q = document.createElement('q'); q.className = 'mem-entry-line'; q.textContent = j.line; main.appendChild(q); }
  const act = document.createElement('div'); act.className = 'mem-entry-a';
  if (o.tonight || o.edit) act.appendChild(memMoodPickerEl(iso));
  const sp = document.createElement('span'); sp.className = 'spacer'; act.appendChild(sp);
  if (j.polished) {
    const t = document.createElement('button'); t.type = 'button'; t.className = 'btn btn-ghost btn-sm'; t.textContent = showPol ? 'Show the original' : 'Show the polished one';
    t.onclick = () => { const n = _mpEntryEl(iso, j, Object.assign({}, o, { original: showPol })); el.replaceWith(n); };
    act.appendChild(t);
  }
  if (!j.preview) {
    const pol = document.createElement('button'); pol.type = 'button'; pol.className = 'btn btn-ghost btn-sm ai-only';
    pol.innerHTML = `${icon('wand-sparkles', 'i-sm')}<span>${j.polished ? 'Polish again' : 'Polish with Claude'}</span>`;
    pol.onclick = async () => {
      pol.disabled = true; pol.setAttribute('aria-busy', 'true'); pol.lastChild.textContent = 'Polishing…';
      try { await memJournalPolish(iso); render(); }
      catch (e) { pol.disabled = false; pol.removeAttribute('aria-busy'); pol.lastChild.textContent = 'Polish with Claude'; toast(typeof netErrorMessage === 'function' ? netErrorMessage(e) : String(e && e.message || e), { kind: 'err' }); }
    };
    act.appendChild(pol);
    if (!o.tonight && !o.edit) { const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'btn btn-ghost btn-sm'; ed.innerHTML = `${icon('pencil', 'i-sm')}<span>${j.line ? 'Edit' : 'Add a line'}</span>`; ed.onclick = () => { const n = _mpEntryEl(iso, j, Object.assign({}, o, { edit: true })); el.replaceWith(n); const i = n.querySelector('.mem-line input'); if (i) i.focus(); }; act.appendChild(ed); }
  }
  main.appendChild(act);
  el.append(date, main);
  return el;
}
function _mpJournal(body) {
  const today = todayStr();
  const list = memJournalList();
  const head = document.createElement('div'); head.className = 'mem-intro';
  head.innerHTML = `<p>Each evening OpenDash writes a few lines about your day from what you did, where and with whom. Add your own line and how the day felt. It is all kept, forever.</p>`;
  head.appendChild(_mpBtn('Rediscover a day', 'sparkles', () => { const d = memRediscover(); if (d) memDayDialog(d); else toast('Come back when there is more history to rediscover', { icon: 'history' }); }, 'btn-ghost'));
  body.appendChild(head);
  const tj = (list.find(r => r[0] === today) || [])[1];
  if (tj) body.appendChild(_mpEntryEl(today, tj, { tonight: true }));
  else {
    const e = document.createElement('div'); e.className = 'mem-entry is-tonight is-empty-day';
    e.innerHTML = `<div class="mem-entry-b"><div class="mem-entry-over">Today</div><p class="mem-entry-t subtle">Nothing finished yet today. Your line still counts:</p></div>`;
    e.firstChild.appendChild(memLineInputEl(today)); e.firstChild.appendChild(memMoodPickerEl(today));
    body.appendChild(e);
  }
  const past = list.filter(r => r[0] !== today);
  if (!past.length) { body.insertAdjacentHTML('beforeend', `<div class="mem-empty">${icon('notebook-pen', 'i-lg')}<div><b>Your journal starts tonight</b><span>Finish a task or two; this evening the day writes itself here.</span></div></div>`); return; }
  let month = '';
  const wrap = document.createElement('div'); wrap.className = 'mem-entries';
  for (const [iso, j] of past.slice(0, _mpJournalN)) {
    const m = iso.slice(0, 7);
    if (m !== month) { month = m; const h = document.createElement('h3'); h.className = 'mem-month'; h.textContent = _memFmt(iso, { month: 'long', year: 'numeric' }); wrap.appendChild(h); }
    wrap.appendChild(_mpEntryEl(iso, j));
  }
  body.appendChild(wrap);
  if (past.length > _mpJournalN) body.appendChild(_mpBtn(`Show older (${past.length - _mpJournalN})`, 'chevron-down', () => { _mpJournalN += 60; render(); }, 'btn-ghost mem-more'));
}

/* ---------- year ---------- */
function _mpYears() {
  const ys = new Set([todayStr().slice(0, 4)]);
  for (const d of memIndex().days.keys()) ys.add(d.slice(0, 4));
  for (const d of Object.keys(memState().journal)) ys.add(d.slice(0, 4));
  return [...ys].sort().reverse();
}
function _mpYearTab(body) {
  const years = _mpYears();
  const y = String(_mpYear && years.includes(String(_mpYear)) ? _mpYear : years[0]);
  const Y = memYearStats(+y);
  const pick = document.createElement('div'); pick.className = 'mem-years'; pick.setAttribute('role', 'tablist');
  for (const yy of years) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = yy; b.setAttribute('aria-selected', yy === y ? 'true' : 'false');
    b.onclick = () => { if (yy === y) return; _mpYear = +yy; render(); };
    pick.appendChild(b);
  }
  const wb = _mpBtn(`Play your ${y} Wrapped`, 'party-popper', () => memWrappedOpen(+y), 'btn-primary');
  pick.appendChild(Object.assign(document.createElement('span'), { className: 'spacer' }));
  pick.appendChild(wb);
  body.appendChild(pick);
  const tiles = document.createElement('div'); tiles.className = 'mem-tiles';
  const tile = (n, label, ic) => `<div class="mem-tile">${icon(ic, 'i-sm')}<b>${esc(String(n))}</b><span>${esc(label)}</span></div>`;
  tiles.innerHTML = tile(Y.total, 'tasks finished', 'check') + tile(Y.activeDays, 'active days', 'calendar-check') + tile(Y.streak.days, 'best streak (days)', 'flame')
    + tile(Y.busiest.n || 0, Y.busiest.iso ? 'on ' + _memFmt(Y.busiest.iso, { day: 'numeric', month: 'short' }) + ', your busiest day' : 'your busiest day', 'trophy');
  body.appendChild(tiles);
  const hs = _mpSection(Y.partial ? `${y} so far` : y, 'calendar-days', Object.assign(document.createElement('span'), { innerHTML: memHeatmapLegendHtml() }));
  const sc = document.createElement('div'); sc.className = 'hhm-scroll'; sc.appendChild(memHeatmapEl({ year: +y, cell: 12 }));
  hs.appendChild(sc); body.appendChild(hs);
  // the year in pixels: how each day felt (the journal's mood)
  const px = _mpSection('The year in pixels', 'sparkles');
  const grid = document.createElement('div'); grid.className = 'mem-pixels';
  let s = '<span></span>' + Array.from({ length: 12 }, (_, m) => `<span class="mem-px-h">${esc(_memFmt(`${y}-${String(m + 1).padStart(2, '0')}-01`, { month: 'narrow' }))}</span>`).join('');
  for (let d = 1; d <= 31; d++) {
    s += `<span class="mem-px-d">${d % 5 === 0 || d === 1 ? d : ''}</span>`;
    for (let m = 1; m <= 12; m++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const real = new Date(+y, m - 1, d).getMonth() === m - 1;   // clock-ok: does the day exist
      const j = memState().journal[iso];
      s += real ? `<button type="button" class="mem-px${j && j.mood ? ' mem-mood-' + j.mood : ''}${iso === todayStr() ? ' is-today' : ''}" data-d="${iso}" title="${escAttr(_memFmt(iso, { day: 'numeric', month: 'short' }) + (j && j.mood ? ': ' + MEM_MOODS[j.mood - 1][1] : ''))}"></button>` : '<span class="mem-px is-none"></span>';
    }
  }
  grid.innerHTML = s;
  grid.addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) memDayDialog(b.dataset.d); });
  px.appendChild(grid);
  px.insertAdjacentHTML('beforeend', `<p class="mem-px-legend subtle">${MEM_MOODS.map(([v, l]) => `<i class="mem-dot mem-mood-${v}"></i>${esc(l)}`).join(' ')} · set a day's mood in the journal or by clicking a square</p>`);
  body.appendChild(px);
  if (Y.streams.length) {
    const st = _mpSection('Where your effort went', 'layers');
    const max = Y.streams[0].n;
    for (const x of Y.streams) st.insertAdjacentHTML('beforeend', `<div class="mem-bar"><span class="mem-bar-l">${typeof streamMarkHtml === 'function' ? streamMarkHtml(x.id) : ''}${esc(x.label)}</span><span class="mem-bar-t"><i style="width:${(x.n / max * 100).toFixed(1)}%;--c:${escAttr(safeColor(x.color || 'var(--accent)'))}"></i></span><b>${x.n}</b></div>`);
    body.appendChild(st);
  }
}

/* ---------- capsules, postcards ---------- */
function _mpCapsules(body) {
  const intro = document.createElement('div'); intro.className = 'mem-intro';
  intro.innerHTML = '<p>Write a note to your future self. It stays sealed until the day you choose, then arrives on Home like a letter.</p>';
  intro.appendChild(_mpBtn('Write a time capsule', 'mail', () => memCapsuleWrite(), 'btn-primary'));
  body.appendChild(intro);
  body.appendChild(memCapsuleListEl());
}
function _mpPostcards(body) {
  const intro = document.createElement('div'); intro.className = 'mem-intro';
  const n = memPostcards().length;
  intro.innerHTML = `<p>${esc(n ? `${_memPlural(n, 'country', 'countries')} so far. Click a postcard to turn it over and write on it.` : 'Every first visit to a new country sends you a postcard.')}</p>`;
  if (typeof sectionFor === 'function' && sectionFor('locations')) intro.appendChild(_mpBtn('Locations', 'map', () => setView('locations'), 'btn-ghost'));
  body.appendChild(intro);
  body.appendChild(memPostcardAlbumEl());
}

/* ---------- people ---------- */
function _mpPeople(body) {
  const soon = memBirthdaysSoon(60);
  const bs = _mpSection('Birthdays coming up', 'cake');
  if (!soon.length) bs.insertAdjacentHTML('beforeend', `<p class="subtle mem-pad">${esc((state.people || []).some(p => p && p.birthday) ? 'None in the next two months.' : 'Add birthdays on people\'s cards (Edit > Birthday) and they show here, on Home and on the day.')}</p>`);
  for (const b of soon) {
    const r = document.createElement('button'); r.type = 'button'; r.className = 'mem-prow' + (b.inDays === 0 ? ' is-today' : '');
    r.innerHTML = `${avatarHtml(b.person, 28)}<span class="mem-prow-t"><b></b><span class="subtle"></span></span><span class="mem-prow-n"></span>`;
    r.querySelector('b').textContent = b.person.name;
    r.querySelector('.subtle').textContent = _memFmt(b.iso, { weekday: 'long', day: 'numeric', month: 'long' }) + (b.turning ? ` · turning ${b.turning}` : '');
    r.querySelector('.mem-prow-n').textContent = b.inDays === 0 ? 'Today!' : b.inDays === 1 ? 'Tomorrow' : `in ${b.inDays} days`;
    r.onclick = () => openPerson(b.person.id);
    bs.appendChild(r);
  }
  body.appendChild(bs);
  const rows = (state.people || []).filter(p => p && !p.self && !p.isSelf && (p.kind || 'person') === 'person').map(p => ({ p, f: memFriendship(p.id) })).filter(x => x.f);
  const streaks = rows.filter(x => x.f.weeks >= 2).sort((a, b) => b.f.weeks - a.f.weeks).slice(0, 12);
  const fs = _mpSection('Friendship streaks', 'flame');
  if (!streaks.length) fs.insertAdjacentHTML('beforeend', '<p class="subtle mem-pad">Weeks in a row in touch with someone (a task with them, a meeting, a note) show here.</p>');
  for (const x of streaks) {
    const r = document.createElement('button'); r.type = 'button'; r.className = 'mem-prow';
    r.innerHTML = `${avatarHtml(x.p, 28)}<span class="mem-prow-t"><b></b><span class="subtle"></span></span><span class="mem-prow-n mem-fstreak">${icon('flame', 'i-xs')}<span></span></span>`;
    r.querySelector('b').textContent = x.p.name;
    r.querySelector('.subtle').textContent = `Last in touch ${x.f.daysAgo === 0 ? 'today' : x.f.daysAgo === 1 ? 'yesterday' : x.f.daysAgo + ' days ago'} · ${_memPlural(x.f.total, 'day')} together`;
    r.querySelector('.mem-prow-n span').textContent = `${x.f.weeks} weeks`;
    r.onclick = () => openPerson(x.p.id);
    fs.appendChild(r);
  }
  body.appendChild(fs);
  const quiet = rows.filter(x => x.f.total >= 4 && x.f.daysAgo >= 45).sort((a, b) => b.f.total - a.f.total).slice(0, 6);
  if (quiet.length) {
    const qs = _mpSection('It has been a while', 'coffee');
    qs.insertAdjacentHTML('beforeend', '<p class="subtle mem-pad">People you used to be in touch with often. Only if you feel like it.</p>');
    for (const x of quiet) {
      const r = document.createElement('div'); r.className = 'mem-prow';
      r.innerHTML = `${avatarHtml(x.p, 28)}<span class="mem-prow-t"><b></b><span class="subtle"></span></span>`;
      r.querySelector('b').textContent = x.p.name;
      r.querySelector('.subtle').textContent = `Last in touch ${_memFmt(x.f.lastIso, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      r.appendChild(_mpBtn('Say hello', 'send', () => (typeof openQuickAddDialog === 'function' ? openQuickAddDialog(`Say hello to @${x.p.id} `) : openPerson(x.p.id)), 'btn-ghost'));
      qs.appendChild(r);
    }
    body.appendChild(qs);
  }
}

/* ---------- milestones ---------- */
function _mpMilestones(body) {
  const ms = memMilestones();
  const ls = memLongestStreak();
  const tiles = document.createElement('div'); tiles.className = 'mem-tiles';
  const all = memIndex().all;
  const tile = (n, label, ic) => `<div class="mem-tile">${icon(ic, 'i-sm')}<b>${esc(String(n))}</b><span>${esc(label)}</span></div>`;
  tiles.innerHTML = tile(all.length, 'tasks finished, ever', 'check') + tile(ls.days, 'your longest streak', 'flame') + tile(memPostcards().length, 'countries visited', 'map') + tile(memCapsules().filter(c => c.opened).length, 'letters opened', 'mail');
  body.appendChild(tiles);
  const sec = _mpSection('Your milestones', 'trophy');
  if (!ms.length) sec.insertAdjacentHTML('beforeend', '<p class="subtle mem-pad">Your first finished task starts the timeline.</p>');
  const ol = document.createElement('ol'); ol.className = 'mem-tl';
  const next = MEM_MILESTONE_STEPS.find(n => n > all.length);
  for (const m of ms.slice().reverse()) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="mem-tl-n">${m.n === 1 ? 'First' : '#' + m.n}</span><span class="mem-tl-t"><b></b><span class="subtle"></span></span>`;
    li.querySelector('b').textContent = m.title;
    li.querySelector('.subtle').textContent = _memFmtLong(m.iso);
    li.tabIndex = 0; li.onclick = () => memDayDialog(m.iso); li.onkeydown = (e) => { if (e.key === 'Enter') li.click(); };
    ol.appendChild(li);
  }
  if (next) { const li = document.createElement('li'); li.className = 'is-next'; li.innerHTML = `<span class="mem-tl-n">#${next}</span><span class="mem-tl-t"><b>Next up</b><span class="subtle">${esc(_memPlural(next - all.length, 'task') + ' to go')}</span></span>`; ol.prepend(li); }
  sec.appendChild(ol);
  body.appendChild(sec);
  if (ls.days >= 2) body.insertAdjacentHTML('beforeend', `<p class="subtle mem-pad">${esc(`Longest streak: ${ls.days} days, ${_memFmt(ls.from, { day: 'numeric', month: 'short', year: 'numeric' })} to ${_memFmt(ls.to, { day: 'numeric', month: 'short', year: 'numeric' })}.`)}</p>`);
}
