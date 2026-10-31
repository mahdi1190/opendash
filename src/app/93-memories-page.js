/* ============================================================
   MEMORIES: the section (owner: Memories). #view=memories, memories:<tab>:
     journal     tonight's entry (your line, the day's mood, Polish with Claude), then every
                 day you kept, newest first (the template lines, your line, the mood)
     year        a year of squares, the Year in pixels (moods), the numbers, top streams,
                 Wrapped (93-memories-wrapped.js)
     capsules    notes to your future self: sealed until their day
     postcards   the album of first visits (agent locations' tab mounts the same album)
     photos      garden photos kept on this computer, group photos from a live garden among them (93-memories-photos.js)
     people      birthdays coming up, friendship streaks, people it has been a while with
     milestones  your 1st, 10th, 100th... task finished, your best streak, firsts
   Life > Memories since 2.18 (docs/dev/NAVIGATION_PLAN.md 2.2): the page is one of Life's tabs; its
   own seven tabs are the level-2 control under Life's strip. Tabs: re-selecting is a no-op;
   the entrance plays once per entry.
   ============================================================ */
const MEM_TABS = [['journal', 'Journal', 'notebook-pen'], ['year', 'Your year', 'calendar-days'], ['capsules', 'Time capsules', 'mail'], ['postcards', 'Postcards', 'map'], ['photos', 'Photos', 'camera'], ['people', 'People', 'heart'], ['milestones', 'Milestones', 'trophy']];
let _mpEntry = '', _mpYear = 0, _mpJournalN = 0, _mpCapSel = '';
function _mpTab(v) { const m = /^memories:([a-z]+)$/.exec(String(v || '')); const t = m ? m[1] : 'journal'; return MEM_TABS.some(x => x[0] === t) ? t : 'journal'; }
function _mpTabLabel(t) { const x = MEM_TABS.find(y => y[0] === t); return x ? x[1] : 'Journal'; }

registerSection('memories', {
  match: v => v === 'memories' || /^memories:[a-z]+$/.test(v),
  title: () => 'Memories',
  crumb: v => (_mpTab(v) === 'journal' ? [] : [{ label: 'Memories', view: 'memories' }, _mpTabLabel(_mpTab(v))]),
  group: 'life', layout: 'page', hashable: true, taskControls: false,
  mount(container, view) { _mpMount(container, view || state.view); },
  unmount() { _mpEntry = ''; },
  // The page header (UX_BLUEPRINT.md 3): this tab's one main action, the rest under More (each is also in Ctrl+K).
  headerActions: (view) => _mpHeaderActions(_mpTab(view || state.view)),
});
registerPage({
  id: 'memories', view: 'memories', match: v => v === 'memories' || /^memories:[a-z]+$/.test(String(v || '')),
  label: 'Memories', icon: 'book-open', area: 'life', tab: true, order: 50, since: '2.16', discover: true, ownTabs: true,
  desc: 'Journal, your year, capsules, postcards, garden photos and milestones',
  keywords: 'memories journal diary year heatmap wrapped time capsule letter postcards birthdays people milestones firsts',
  sections: MEM_TABS.map(([id, label]) => [id === 'journal' ? 'memories' : 'memories:' + id, label]),
  badge: () => { const n = typeof memCapsulesDue === 'function' ? memCapsulesDue().length : 0; return n ? String(n) : ''; },
});
registerCommand({ id: 'mem-wrapped', label: 'Your year in Freeflo (Wrapped)', icon: 'party-popper', group: 'Go to', keywords: 'wrapped year review recap stats spotify annual memories', run: () => memWrappedOpen() });
registerCommand({ id: 'mem-journal', label: 'Journal', icon: 'notebook-pen', group: 'Go to', keywords: 'memories diary journal day line mood', run: () => setView('memories') });
registerCommand({ id: 'mem-capsule', label: 'Write a note to your future self', icon: 'mail', keywords: 'time capsule letter future self memories', run: () => memCapsuleWrite() });
registerCommand({ id: 'mem-rediscover', label: 'Rediscover a day', icon: 'sparkles', keywords: 'memories random past day throwback on this day', run: () => { const d = memRediscover(); if (d) memDayDialog(d); else toast('Come back when there is more history to rediscover', { icon: 'history' }); } });
registerCommand({ id: 'mem-photos', label: 'Garden photos', icon: 'camera', group: 'Go to', keywords: 'memories garden photos pictures album group photo', run: () => setView('memories:photos') });
registerCommand({ id: 'mem-postcards', label: 'Postcards', icon: 'map', group: 'Go to', keywords: 'memories travel countries trips album', run: () => setView('memories:postcards') });

function _mpRediscover() { const d = memRediscover(); if (d) memDayDialog(d); else toast('Come back when there is more history to rediscover', { icon: 'history' }); }
/** The header's actions for a tab: {primary, more} (the shell draws them; 14-shell.js). */
function _mpHeaderActions(tab) {
  const y = String(_mpYear || todayStr().slice(0, 4));
  const wrapped = { label: `Play your ${y} Wrapped`, icon: 'party-popper', run: () => memWrappedOpen(+y) };
  const capsule = { label: 'Write a time capsule', icon: 'mail', run: () => memCapsuleWrite() };
  const rediscover = { label: 'Rediscover a day', icon: 'sparkles', run: _mpRediscover };
  const primary = tab === 'year' ? wrapped : tab === 'capsules' ? capsule : null;
  const more = [rediscover, capsule, wrapped].filter(a => a !== primary);
  if (tab === 'postcards' && typeof sectionFor === 'function' && sectionFor('locations')) more.push({ label: 'Open Places', icon: 'map', run: () => setView('locations') });
  return { primary, more };
}
function _mpMount(container, view) {
  const tab = _mpTab(view);
  const entering = _mpEntry !== view;
  _mpEntry = view;
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = tab === 'journal' ? ((n) => `${n.toLocaleString()} day${n === 1 ? '' : 's'} kept`)(memJournalList().length) : tab === 'postcards' ? ((n) => n ? `${n} ${n === 1 ? 'country' : 'countries'} so far` : '')(memPostcards().length) : '';   // a count, not a sentence about what the page is
  const root = document.createElement('div');
  root.className = 'mem-page mem-tab-' + tab + (entering ? ' is-enter' : '');
  // 2.19.1: the tabs are the page header's pills (subTabs / headerSubTabs), not a strip inside the page
  headerSubTabs(subTabs({ label: 'Memories', active: tab, onChange: (id) => setView(id === 'journal' ? 'memories' : 'memories:' + id),
    tabs: MEM_TABS.map(([id, label, ic]) => ({ id, label, icon: ic, badge: id === 'capsules' ? memCapsulesDue().length : 0 })) }), /^memories(:|$)/);
  const body = document.createElement('div'); body.className = 'mem-body';
  root.appendChild(body);
  container.appendChild(root);
  try {
    if (tab === 'journal') _mpJournal(body);
    else if (tab === 'year') _mpYearTab(body);
    else if (tab === 'capsules') _mpCapsules(body);
    else if (tab === 'postcards') _mpPostcards(body);
    else if (tab === 'photos') _mpPhotos(body);
    else if (tab === 'people') _mpPeople(body);
    else if (tab === 'milestones') _mpMilestones(body);
  } catch (e) {
    console.error('[memories] page', e);
    body.textContent = '';
    mountEmptyState(body, { icon: 'circle-alert', compact: true, title: 'This part of Memories couldn’t load', text: 'Your memories are safe. Reload the page.', actions: [{ label: 'Reload', icon: 'rotate-cw', run: () => location.reload() }] });
  }
}
/** A section of a tab: the kit's section header (secHead); `extra` (an element) sits at its end. */
function _mpSection(title, ic, extra) {
  const s = document.createElement('section'); s.className = 'mem-sec';
  s.appendChild(secHead({ title, icon: ic, actions: extra ? [extra] : [] }));
  return s;
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
    act.appendChild(uiButton({ label: showPol ? 'Show the original' : 'Show the polished one', kind: 'ghost', size: 'sm',
      run: () => { const n = _mpEntryEl(iso, j, Object.assign({}, o, { original: showPol })); el.replaceWith(n); } }));
  }
  if (!j.preview) {
    const polLabel = j.polished ? 'Polish again' : 'Polish with Claude';
    act.appendChild(uiButton({ label: polLabel, icon: 'wand-sparkles', kind: 'ghost', size: 'sm', cls: 'ai-only', wait: true,
      run: async (e, btn) => {
        const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Polishing…';
        try { await memJournalPolish(iso); render(); }
        catch (err) { if (sp) sp.textContent = polLabel; toastError('polish the entry', err, () => btn.click()); }
      } }));
    if (!o.tonight && !o.edit) act.appendChild(uiButton({ label: j.line ? 'Edit' : 'Add a line', icon: 'pencil', kind: 'ghost', size: 'sm',
      run: () => { const n = _mpEntryEl(iso, j, Object.assign({}, o, { edit: true })); el.replaceWith(n); const i = n.querySelector('.mem-line input'); if (i) i.focus(); } }));
  }
  main.appendChild(act);
  el.append(date, main);
  return el;
}
function _mpJournal(outer) {
  const body = document.createElement('div'); body.className = 'mem-jmain';
  outer.appendChild(pageLayout({ main: body, cls: 'mem-layout' }));   // the count is the header's subtitle; Rediscover and Time capsule are in its More
  const today = todayStr();
  const list = memJournalList();
  const tj = (list.find(r => r[0] === today) || [])[1];
  if (tj) body.appendChild(_mpEntryEl(today, tj, { tonight: true }));
  else {
    const e = document.createElement('div'); e.className = 'mem-entry is-tonight is-empty-day';
    e.innerHTML = `<div class="mem-entry-b"><div class="mem-entry-over">Today</div><p class="mem-entry-t subtle">Nothing finished yet today. Your line still counts:</p></div>`;
    e.firstChild.appendChild(memLineInputEl(today)); e.firstChild.appendChild(memMoodPickerEl(today));
    body.appendChild(e);
  }
  const past = list.filter(r => r[0] !== today);
  if (!past.length) { mountEmptyState(body, { icon: 'notebook-pen', compact: true, title: 'Your journal starts tonight', text: 'Finish a task or two; this evening the day writes itself here.', actions: [{ label: 'Open Today', icon: 'sun', run: () => setView('today') }] }); return; }
  const items = []; let month = '';
  for (const [iso, j] of past) {
    const m = iso.slice(0, 7);
    if (m !== month) { month = m; items.push({ head: _memFmt(iso, { month: 'long', year: 'numeric' }) }); }
    items.push({ iso, j });
  }
  // a page at a time; a repaint (polishing an entry) keeps how many were open
  body.appendChild(pagedList({ items, pageSize: 20, start: _mpJournalN, onShown: (n) => { _mpJournalN = n; }, cls: 'mem-entries', render: (x) => {
    if (x.head) { const h = document.createElement('h3'); h.className = 'mem-month'; h.textContent = x.head; return h; }
    const el = _mpEntryEl(x.iso, x.j);
    el.dataset.pickId = x.iso;
    return el;
  } }));
  // Several at once: copy them (entries write themselves each evening, so there is nothing to delete; 11-ui-pick.js).
  const tools = document.createElement('div'); tools.className = 'pk-list-tools';
  const pgList = body.querySelector('.mem-entries');
  tools.appendChild(multiPick(pgList, { key: 'mem-journal', rows: '.mem-entry[data-pick-id]', noun: ['entry', 'entries'],
    nameOf: (r) => r.dataset.pickId,
    actions: () => [{ label: 'Copy', icon: 'copy', run: (ids) => {
      const m = memState();
      const text = ids.slice().sort().map(iso => { const j = m.journal[iso] || {}; return `${_memFmtLong(iso)}\n${j.polished || j.text || ''}${j.line ? '\n“' + j.line + '”' : ''}`; }).join('\n\n');
      return copyText(text, ids.length + ' entries');
    } }] }).button());
  pgList.parentNode.insertBefore(tools, pgList);
}

/** The journal's side column: what it is, how many days it holds, and the two things you can do from here. */
function _mpJournalSide(list) {
  return (h) => {
    const card = document.createElement('section'); card.className = 'card mem-side-card';
    const n = document.createElement('p'); n.className = 'mem-side-n';
    n.innerHTML = `<b class="num">${list.length.toLocaleString()}</b> <span class="muted">day${list.length === 1 ? '' : 's'} kept</span>`;
    const p = document.createElement('p'); p.className = 'muted';
    p.textContent = 'Each evening Freeflo writes a few lines about your day from what you did, where and with whom. Add your own line and how the day felt. It is all kept, forever.';
    const row = document.createElement('div'); row.className = 'mem-side-a';
    row.append(uiButton({ label: 'Rediscover a day', icon: 'sparkles', kind: 'ghost', size: 'sm', run: _mpRediscover }),
      uiButton({ label: 'Write a time capsule', icon: 'mail', kind: 'ghost', size: 'sm', run: () => memCapsuleWrite() }));
    card.append(n, p, row);
    h.appendChild(card);
  };
}

/* ---------- year ---------- */
function _mpYears() {
  const ys = new Set([todayStr().slice(0, 4)]);
  for (const d of memIndex().days.keys()) ys.add(d.slice(0, 4));
  for (const d of Object.keys(memState().journal)) ys.add(d.slice(0, 4));
  return [...ys].sort().reverse();
}
function _mpYearTab(outer) {
  const body = document.createElement('div'); body.className = 'mem-ymain';
  const side = document.createElement('div'); side.className = 'mem-yside';
  outer.appendChild(pageLayout({ main: body, side, sideWidth: 300, cls: 'mem-layout' }));
  const years = _mpYears();
  const y = String(_mpYear && years.includes(String(_mpYear)) ? _mpYear : years[0]);
  const Y = memYearStats(+y);
  // The year is a picker, not a third row of tabs (Memories' tabs are level 2, UX_BLUEPRINT.md 3).
  // Wrapped is the header's main action on this tab.
  const pick = document.createElement('div'); pick.className = 'mem-years';
  if (years.length > 1) {
    const sel = _settingsSelect(years.map(yy => [yy, yy]), y, (v) => { if (v === y) return; _mpYear = +v; render(); }, 'mem-year-sel');
    sel.setAttribute('aria-label', 'Year');
    pick.appendChild(sel);
    body.appendChild(pick);
  }
  const tiles = document.createElement('div'); tiles.className = 'mem-tiles';
  const tile = (n, label, ic) => `<div class="mem-tile">${icon(ic, 'i-sm')}<b>${esc(String(n))}</b><span>${esc(label)}</span></div>`;
  tiles.innerHTML = tile(Y.total, 'tasks finished', 'check') + tile(Y.activeDays, 'active days', 'calendar-check') + tile(Y.streak.days, 'best streak (days)', 'flame')
    + tile(Y.busiest.n || 0, Y.busiest.iso ? 'on ' + _memFmt(Y.busiest.iso, { day: 'numeric', month: 'short' }) + ', your busiest day' : 'your busiest day', 'trophy');
  side.appendChild(tiles);
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
  px.insertAdjacentHTML('beforeend', `<p class="mem-px-legend subtle">${MEM_MOODS.map(([v, l]) => `<i class="mem-dot mem-mood-${v}"></i>${esc(l)}`).join(' ')}</p>`);
  body.appendChild(px);
  if (Y.streams.length) {
    const st = _mpSection('Where your effort went', 'layers');
    const max = Y.streams[0].n;
    for (const x of Y.streams) st.insertAdjacentHTML('beforeend', `<div class="mem-bar"><span class="mem-bar-l">${typeof streamMarkHtml === 'function' ? streamMarkHtml(x.id) : ''}${esc(x.label)}</span><span class="mem-bar-t"><i style="width:${(x.n / max * 100).toFixed(1)}%;--c:${escAttr(safeColor(x.color || 'var(--accent)'))}"></i></span><b>${x.n}</b></div>`);
    side.appendChild(st);
  }
}

/* ---------- capsules, postcards ---------- */
function _mpCapsules(outer) {
  const all = memCapsules().slice().sort((a, b) => (a.opened ? 1 : 0) - (b.opened ? 1 : 0) || a.opens.localeCompare(b.opens));
  if (!all.length) { outer.appendChild(memCapsuleListEl()); return; }   // its teaching empty state (Write a time capsule: the header's main action)
  const today = todayStr();
  const fmt = (iso) => _memFmt(iso, { day: 'numeric', month: 'long', year: 'numeric' });
  const title = (c) => (c.opened ? (c.text.split('\n')[0].slice(0, 60) || 'A letter') : c.opens <= today ? 'Ready to open' : 'Opens ' + fmt(c.opens));
  const sel = () => all.find(c => c.id === _mpCapSel) || all[0];
  const detail = (c) => {
    const ready = c.opens <= today, left = _memBetween(today, c.opens);
    const card = document.createElement('section'); card.className = 'card mem-cap-d';
    const h = document.createElement('h2'); h.textContent = title(c);
    const meta = document.createElement('p'); meta.className = 'muted';
    meta.textContent = 'Written ' + fmt(Clock.parts(c.created).iso) + (c.opened ? ' · opened' : ready ? ' · ready' : ` · sealed, ${_memPlural(left, 'day')} to go`);
    card.append(h, meta);
    if (c.opened) { const t = document.createElement('div'); t.className = 'mem-letter-text'; t.textContent = c.text; card.appendChild(t); }
    else if (!ready) { const t = document.createElement('p'); t.className = 'subtle'; t.textContent = 'Sealed until ' + fmt(c.opens) + '. It arrives on Home like a letter.'; card.appendChild(t); }
    const act = document.createElement('div'); act.className = 'mem-cap-a';
    if (c.opened || ready) act.appendChild(uiButton({ label: c.opened ? 'Read as a letter' : 'Open it', icon: 'mail', kind: ready && !c.opened ? 'primary' : 'secondary', size: 'sm', run: () => memCapsuleReveal(c.id) }));
    act.appendChild(uiButton({ label: 'Delete', icon: 'trash-2', kind: 'ghost', size: 'sm', run: async () => {
      const ok = typeof confirmDialog === 'function' ? await confirmDialog({ title: 'Delete this time capsule?', text: c.opened ? 'The letter goes for good.' : 'It has not been opened yet. It goes for good, unread.', confirmLabel: 'Delete', danger: true }) : true;
      if (ok) { memCapsuleDelete(c.id); _mpCapSel = ''; render(); }
    } }));
    card.appendChild(act);
    return card;
  };
  let md = null;
  const paint = () => {
    const cur = sel();
    md.mdList.replaceChildren(tools, ...all.map(c => { const r = mdRow({ pickable: true, title: title(c), icon: c.opened ? 'mail' : c.opens <= today ? 'sparkles' : 'lock', active: c === cur,
      sub: 'Written ' + _memFmt(Clock.parts(c.created).iso, { day: 'numeric', month: 'short', year: 'numeric' }), run: () => { _mpCapSel = c.id; paint(); } }); r.dataset.pickId = c.id; return r; }));
    md.mdSet(detail(cur));
  };
  const tools = document.createElement('div'); tools.className = 'pk-list-tools';
  md = masterDetail({ listWidth: 300, label: 'Time capsules' });
  paint();
  outer.appendChild(md);
  // Several at once: delete, one Undo for the lot (memories are outside the undo snapshots, so it puts them back itself).
  tools.appendChild(multiPick(md.mdList, { key: 'mem-capsules', rows: '.md-row', noun: ['time capsule', 'time capsules'],
    nameOf: (r) => (r.querySelector('.md-row-n') || {}).textContent || '',
    exists: (id) => memCapsules().some(c => c.id === id),
    actions: () => [{ label: 'Delete', icon: 'trash-2', danger: true, run: (ids) => {
      const m = memState(), want = new Set(ids), before = m.capsules.slice();
      m.capsules = before.filter(c => !(c && want.has(c.id)));
      memSave(); _mpCapSel = ''; render();
      toast(`${want.size} time capsule${want.size === 1 ? '' : 's'} deleted`, { icon: 'trash-2', action: { label: 'Undo', run: () => { memState().capsules = before; memSave(); render(); toast('Time capsules back', { kind: 'ok', icon: 'undo-2' }); } } });
    } }] }).button());
}
function _mpPostcards(outer) {
  const list = memPostcards();
  if (!list.length) { outer.appendChild(memPostcardAlbumEl()); return; }   // its teaching empty state
  const album = pagedList({ items: list, pageSize: 12, cls: 'mpc-album-list', render: (p) => { const t = document.createElement('template'); t.innerHTML = memPostcardHtml(p); return t.content.firstElementChild; } });
  _memPostcardWire(album);
  outer.appendChild(pageLayout({ main: album, cls: 'mem-layout' }));   // the count is the header's subtitle; Open Places is in its More
}

/* ---------- people ---------- */
function _mpPeople(outer) {
  const body = document.createElement('div'); body.className = 'mem-pmain';
  const side = document.createElement('div'); side.className = 'mem-pside';
  const soon = memBirthdaysSoon(60);
  const bs = _mpSection('Birthdays coming up', 'cake');
  if (!soon.length) bs.appendChild((state.people || []).some(p => p && p.birthday) ? emptyLine('None in the next two months.')
    : emptyLine('Add birthdays on people’s cards (Edit > Birthday) and they show here, on Home and on the day.', { label: 'Open People', run: () => setView('people') }));
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
  if (!streaks.length) fs.appendChild(emptyLine('Weeks in a row in touch with someone (a task with them, a meeting, a note) show here.'));
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
      r.appendChild(uiButton({ label: 'Say hello', icon: 'send', kind: 'ghost', size: 'sm', run: () => (typeof openQuickAddDialog === 'function' ? openQuickAddDialog(`Say hello to @${x.p.id} `) : openPerson(x.p.id)) }));
      qs.appendChild(r);
    }
    side.appendChild(qs);
  }
  outer.appendChild(pageLayout({ main: body, side: side.childNodes.length ? side : null, sideWidth: 320, cls: 'mem-layout' }));
}

/* ---------- milestones ---------- */
function _mpMilestones(outer) {
  const body = document.createElement('div'); body.className = 'mem-mmain';
  const side = document.createElement('div'); side.className = 'mem-mside';
  outer.appendChild(pageLayout({ main: body, side, sideWidth: 300, cls: 'mem-layout' }));
  const ms = memMilestones();
  const ls = memLongestStreak();
  const tiles = document.createElement('div'); tiles.className = 'mem-tiles';
  const all = memIndex().all;
  const tile = (n, label, ic) => `<div class="mem-tile">${icon(ic, 'i-sm')}<b>${esc(String(n))}</b><span>${esc(label)}</span></div>`;
  tiles.innerHTML = tile(all.length, 'tasks finished, ever', 'check') + tile(ls.days, 'your longest streak', 'flame') + tile(memPostcards().length, 'countries visited', 'map') + tile(memCapsules().filter(c => c.opened).length, 'letters opened', 'mail');
  side.appendChild(tiles);
  const sec = _mpSection('Your milestones', 'trophy');
  if (!ms.length) sec.appendChild(emptyLine('Your first finished task starts the timeline.'));
  const next = MEM_MILESTONE_STEPS.find(n => n > all.length);
  const items = ms.slice().reverse().map(m => ({ m }));
  if (next) items.unshift({ next });
  const ol = pagedList({ items, pageSize: 15, tag: 'ol', cls: 'mem-tl-pg', render: (x) => {
    const li = document.createElement('li');
    if (x.next) { li.className = 'is-next'; li.innerHTML = `<span class="mem-tl-n">#${x.next}</span><span class="mem-tl-t"><b>Next up</b><span class="subtle">${esc(_memPlural(x.next - all.length, 'task') + ' to go')}</span></span>`; return li; }
    const m = x.m;
    li.innerHTML = `<span class="mem-tl-n">${m.n === 1 ? 'First' : '#' + m.n}</span><span class="mem-tl-t"><b></b><span class="subtle"></span></span>`;
    li.querySelector('b').textContent = m.title;
    li.querySelector('.subtle').textContent = _memFmtLong(m.iso);
    li.tabIndex = 0; li.onclick = () => memDayDialog(m.iso); li.onkeydown = (e) => { if (e.key === 'Enter') li.click(); };
    return li;
  } });
  ol.firstChild.classList.add('mem-tl');
  sec.appendChild(ol);
  body.appendChild(sec);
  if (ls.days >= 2) body.insertAdjacentHTML('beforeend', `<p class="subtle mem-pad">${esc(`Longest streak: ${ls.days} days, ${_memFmt(ls.from, { day: 'numeric', month: 'short', year: 'numeric' })} to ${_memFmt(ls.to, { day: 'numeric', month: 'short', year: 'numeric' })}.`)}</p>`);
}
