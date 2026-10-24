/* ============================================================
   FRIENDS: WHAT EACH FRIEND CAN SEE, what you see (2.17). Owner: perms.
     permsPanelEl(friendId)        the Permissions panel for a friend's page: trusted switch, one row
                                   per scope (level, chosen tasks / streams / tags / memories, a time
                                   window, the audit line, a warning for risky levels), Preview,
                                   Stop sharing with them, and what THEY share with you
     permsPreviewOpen(friendId)    'What Sam can see': exactly what the sender would send now
     permsReceivedOpen(friendId)   what Sam shares with you (read-only)
     permsRenderData(scope, mode, data)   one scope's data as DOM (textContent only: it may be a friend's)
     permsPanelDialog(friendId)    the panel in a dialog (Settings > Privacy, the palette)
     Settings > Privacy            the Friends overview, Stop sharing everything, the sharing activity
   Friend data is untrusted: every piece of it goes in with textContent, never innerHTML.
   ============================================================ */

/* ---------- small DOM helpers ---------- */
function _pmEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
/** An error in a panel or dialog: "Couldn’t <what>: <reason>." in one plain line, then Try again. */
function _pmErrLine(box, what, e, again) {
  const why = typeof netErrorReason === 'function' ? netErrorReason(e) : String((e && e.message) || e || 'something went wrong');
  const p = _pmEl('div', 'pm-err');
  p.appendChild(_pmEl('span', '', `Couldn’t ${what}: ${String(why).replace(/[.\s]+$/, '')}.`));
  if (again) p.appendChild(uiButton({ label: 'Try again', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: again }));
  box.appendChild(p);
}
function _pmIcon(name) { const s = document.createElement('span'); s.className = 'pm-ic'; s.innerHTML = icon(name); return s; }
function _pmAgo(ms) {
  if (!ms) return '';
  if (typeof syncAgo === 'function') return syncAgo(ms, _pmNow());
  const m = Math.round((_pmNow() - ms) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago';
}
function _pmDay(iso, withYear) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  try { return new Date(iso + 'T12:00:00Z').toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }); } catch (e) { return iso; }
}
function _pmDayLong(iso) {
  try { return new Date(iso + 'T12:00:00Z').toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return iso; }
}
function _pmMoney(v, cur) {
  if (typeof v !== 'number' || !isFinite(v)) return '';
  try { return new Intl.NumberFormat(APP_CONFIG.locale || undefined, { style: 'currency', currency: /^[A-Z]{3}$/.test(String(cur || '')) ? cur : 'GBP', maximumFractionDigits: 0 }).format(v); } catch (e) { return String(Math.round(v)); }
}
const _PM_REASON = Object.freeze({
  trust: 'needs a trusted friend', expired: 'the time you chose has ended', 'not-yet': 'starts later', stopped: 'sharing with them is stopped',
  'stopped-all': 'all sharing is stopped', 'not-friend': 'not a confirmed friend', blocked: 'blocked', off: 'off',
});
function _pmModeLabel(scope, mode) { const d = permsScope(scope); const m = d && d.modes.find(x => x[0] === mode); return m ? m[1] : mode; }
/** 'until 30 Nov' / 'during our Paris trip (2-9 Nov)' / ''. */
function _pmWindowText(c) {
  if (!c || (!c.from && !c.until)) return '';
  if (c.label) return `during ${c.label}${c.from && c.until ? ` (${_pmDay(c.from)} to ${_pmDay(c.until)})` : ''}`;
  if (c.from && c.until) return `from ${_pmDay(c.from)} to ${_pmDay(c.until)}`;
  return c.until ? `until ${_pmDay(c.until)}` : `from ${_pmDay(c.from)}`;
}
/** The audit line for one of the scopes perms sends ('' when nothing went yet). */
function permsAuditLine(friendId, scope, name) {
  const a = _pm.audit && _pm.audit.sent && _pm.audit.sent[friendId] && _pm.audit.sent[friendId][scope];
  if (!a) return '';
  const what = (permsScope(scope) || {}).label || scope;
  const w = what.toLowerCase();
  if (!a.live) return a.at ? `Asked ${name} to delete your ${w} ${_pmAgo(a.at)}` : '';
  if (a.err) return `Not sent yet (${a.err}): it goes again by itself`;
  if (a.ackAt && a.ackH && a.ackH === a.h) return `${name} last received your ${w} ${_pmAgo(a.ackAt)}`;
  return `Sent to ${name} ${_pmAgo(a.at)}; their app has not confirmed it yet`;
}

/* ---------- the renderers (also for what friends share: textContent only) ---------- */
function _pmKv(list) {
  const dl = _pmEl('dl', 'pm-kv');
  for (const [k, v] of list) { if (v === undefined || v === null || v === '') continue; dl.append(_pmEl('dt', '', k), _pmEl('dd', '', v)); }
  return dl;
}
function _pmMore(box, n, shown) { if (n > shown) box.appendChild(_pmEl('p', 'pm-more muted', `and ${n - shown} more`)); }
/**
 * One shared calendar item for display: {e, date, start, end, until, key, their}. With its instants
 * (startUtc / endUtc) it is put on your clock and `their` says their own time when their zone (tz)
 * differs; without them (all day, or an older sender) its date and wall times are shown as sent.
 */
function _pmCalRow(e, tz) {
  const at = typeof permsCalTimes === 'function' ? permsCalTimes(e) : null;
  if (!at || typeof Clock === 'undefined') return { e, date: e.date, start: e.start || '', end: e.end || '', until: e.until || '', key: e.allDay ? '' : (e.start || ''), their: '' };
  const p0 = Clock.parts(at.t0), p1 = Clock.parts(at.t1 - 1);
  let their = '';
  try { if (tz && Clock.offset(at.t0, tz) !== Clock.offset(at.t0, Clock.zone())) their = `${Clock.fmtTime(at.t0, { zone: tz })}–${Clock.fmtTime(at.t1, { zone: tz })} their time`; } catch (x) { their = ''; }
  const hm = (p) => `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  return { e, date: p0.iso, start: Clock.fmtTime(at.t0), end: Clock.fmtTime(at.t1), until: p1.iso !== p0.iso ? p1.iso : '', key: hm(p0), their };
}
function permsRenderData(scope, mode, data) {
  const box = _pmEl('div', 'pm-data pm-data-' + scope);
  if (!data || typeof data !== 'object') { box.appendChild(emptyLine('Nothing.')); return box; }
  if (scope === 'tasks') {
    const items = Array.isArray(data.items) ? data.items.slice().sort((a, b) => ((a.status === 'done') - (b.status === 'done')) || String(a.due || '9999').localeCompare(String(b.due || '9999'))) : [];
    if (!items.length) { box.appendChild(emptyLine(mode === 'shared' ? 'No tasks shared yet.' : 'No tasks.')); return box; }
    const ul = _pmEl('ul', 'pm-list');
    for (const t of items.slice(0, 150)) {
      const li = _pmEl('li', 'pm-item' + (t.status === 'done' ? ' is-done' : ''));
      li.appendChild(_pmIcon(t.status === 'done' ? 'circle-check' : 'circle-dot'));
      const main = _pmEl('div', 'pm-item-main');
      main.appendChild(_pmEl('div', 'pm-item-t', t.title || '(no title)'));
      const meta = [t.due ? 'due ' + _pmDay(t.due) + (t.time ? ' ' + t.time : '') : '', t.stream || '', t.priority ? t.priority.toUpperCase() : '', t.subTotal ? `${t.subDone || 0}/${t.subTotal} steps` : '', t.status === 'doing' ? 'in progress' : '', t.doneOn ? 'done ' + _pmDay(t.doneOn) : '', Array.isArray(t.tags) ? t.tags.map(x => '#' + x).join(' ') : ''].filter(Boolean);
      if (meta.length) main.appendChild(_pmEl('div', 'pm-item-s muted', meta.join(' · ')));
      li.appendChild(main);
      ul.appendChild(li);
    }
    box.appendChild(ul);
    _pmMore(box, items.length, 150);
    return box;
  }
  if (scope === 'calendar') {
    // Timed events with their instants (2.17 'layers') are shown on YOUR clock, with their own time beside
    // them when their zone differs; all-day events and an older sender's wall times stay as sent.
    const tz = typeof data.tz === 'string' && typeof Clock !== 'undefined' && Clock.valid(data.tz) ? data.tz : '';
    const items = (Array.isArray(data.items) ? data.items : []).map(e => _pmCalRow(e, tz)).sort((a, b) => (a.date + a.key).localeCompare(b.date + b.key));
    if (!items.length) { box.appendChild(emptyLine('Nothing in the calendar for these weeks.')); return box; }
    let day = '', ul = null, n = 0;
    for (const r of items) {
      const e = r.e;
      if (n++ >= 200) break;
      if (r.date !== day) { day = r.date; box.appendChild(_pmEl('div', 'pm-day', _pmDayLong(day))); ul = _pmEl('ul', 'pm-list pm-cal'); box.appendChild(ul); }
      const li = _pmEl('li', 'pm-item');
      li.appendChild(_pmEl('span', 'pm-when', e.allDay ? 'All day' : `${r.start}${r.end ? '–' + r.end : ''}`));
      const main = _pmEl('div', 'pm-item-main');
      main.appendChild(_pmEl('div', 'pm-item-t', e.title || 'Busy'));
      const meta = [r.their, r.until && r.until !== r.date ? 'until ' + _pmDay(r.until) : '', e.location || '', e.calendar || '', e.people ? e.people + (e.people === 1 ? ' person' : ' people') : '', e.repeating ? 'repeats' : ''].filter(Boolean);
      if (meta.length) main.appendChild(_pmEl('div', 'pm-item-s muted', meta.join(' · ')));
      li.appendChild(main);
      ul.appendChild(li);
    }
    _pmMore(box, items.length, 200);
    return box;
  }
  if (scope === 'money') {
    if (mode === 'summary') {
      box.appendChild(_pmEl('div', 'pm-big', data.word || 'Nothing to say yet'));
      const sub = [data.month || '', typeof data.pct === 'number' ? `${Math.round(data.pct)}% of the month's budget used so far` : ''].filter(Boolean).join(' · ');
      if (sub) box.appendChild(_pmEl('p', 'muted', sub));
      return box;
    }
    const cur = data.currency;
    box.appendChild(_pmKv([
      ['Month', data.month], ['Spent so far', _pmMoney(data.spent, cur)], ['Last month by this day', _pmMoney(data.lastMonthSameDay, cur)],
      ['All of last month', _pmMoney(data.lastMonth, cur)], ['Income this month', _pmMoney(data.income, cur)], ['Regular payments a month', _pmMoney(data.recurring, cur)],
      ['In the accounts', _pmMoney(data.balance, cur)],
      ['This week', data.week ? `${_pmMoney(data.week.total, cur)}${typeof data.week.usual === 'number' ? ' (usually ' + _pmMoney(data.week.usual, cur) + ')' : ''}` : ''],
      ['Up to', data.asOf ? _pmDay(data.asOf, true) : ''],
    ]));
    const cats = Array.isArray(data.categories) ? data.categories : [];
    if (cats.length) {
      const ul = _pmEl('ul', 'pm-list pm-cats');
      for (const c of cats) {
        const li = _pmEl('li', 'pm-item');
        li.appendChild(_pmEl('div', 'pm-item-t', c.category || ''));
        li.appendChild(_pmEl('div', 'pm-amt', _pmMoney(c.spent, cur) + (typeof c.budget === 'number' ? ' of ' + _pmMoney(c.budget, cur) : '')));
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    return box;
  }
  if (scope === 'locations') {
    const n = data.now || {};
    const here = [n.place, n.city, n.country || n.cc].filter(Boolean).join(', ');
    box.appendChild(_pmKv([
      ['Now', here || ''],
      ['Position', typeof n.lat === 'number' && typeof n.lon === 'number' ? `${n.lat.toFixed(2)}, ${n.lon.toFixed(2)} (about 1 km)` : ''],
      ['Since', typeof n.since === 'number' ? new Date(n.since).toLocaleString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''],
    ]));
    const v = Array.isArray(data.visited) ? data.visited : [];
    if (v.length) {
      box.appendChild(_pmEl('div', 'pm-sub', `${v.length} ${v.length === 1 ? 'country' : 'countries'}`));
      const chips = _pmEl('div', 'pm-chips');
      for (const c of v.slice(0, 80)) chips.appendChild(_pmEl('span', 'pm-chip', `${c.country || c.cc}${c.last ? ' · ' + _pmDay(c.last, true) : ''}`));
      box.appendChild(chips);
    }
    const cs = Array.isArray(data.cities) ? data.cities : [];
    if (cs.length) {
      box.appendChild(_pmEl('div', 'pm-sub', `${cs.length} ${cs.length === 1 ? 'city' : 'cities'}`));
      const chips = _pmEl('div', 'pm-chips');
      for (const c of cs.slice(0, 80)) chips.appendChild(_pmEl('span', 'pm-chip', `${c.city}${c.cc ? ' (' + c.cc + ')' : ''}${c.last ? ' · ' + _pmDay(c.last, true) : ''}`));
      box.appendChild(chips);
      _pmMore(box, cs.length, 80);
    }
    const r = Array.isArray(data.recent) ? data.recent : [];
    if (r.length) {
      box.appendChild(_pmEl('div', 'pm-sub', 'Stays in the last two weeks'));
      const ul = _pmEl('ul', 'pm-list');
      for (const s of r) {
        const li = _pmEl('li', 'pm-item');
        li.appendChild(_pmEl('span', 'pm-when', s.from === s.to || !s.to ? _pmDay(s.from) : `${_pmDay(s.from)} to ${_pmDay(s.to)}`));
        li.appendChild(_pmEl('div', 'pm-item-t', [s.place, s.city, s.cc].filter(Boolean).join(', ')));
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    return box;
  }
  if (scope === 'memories') {
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) { box.appendChild(emptyLine('No memories chosen yet.')); return box; }
    for (const m of items) {
      const card = _pmEl('div', 'pm-mem');
      const kind = { journal: 'Journal', postcard: 'Postcard', capsule: 'Time capsule', goals: 'Goals' }[m.kind] || 'Memory';
      const head = [kind, m.kind === 'journal' ? _pmDayLong(m.date || '') : '', m.title || '', m.city || '', m.kind === 'postcard' && m.date ? _pmDay(m.date, true) : '', typeof m.days === 'number' ? m.days + ' days' : '', typeof m.mood === 'number' ? 'mood ' + m.mood + '/5' : ''].filter(Boolean).join(' · ');
      card.appendChild(_pmEl('div', 'pm-mem-h', head));
      if (m.sealed) card.appendChild(_pmEl('p', 'muted', `Sealed until ${_pmDay(m.opens, true)}`));
      if (m.line) card.appendChild(_pmEl('p', 'pm-mem-line', m.line));
      if (m.text) card.appendChild(_pmEl('p', 'pm-mem-text', m.text));
      if (Array.isArray(m.goals) && m.goals.length) {
        const ul = _pmEl('ul', 'pm-goals');
        for (const g of m.goals) ul.appendChild(_pmEl('li', '', g));
        card.appendChild(ul);
        if (typeof m.done === 'number') card.appendChild(_pmEl('p', 'muted', `${m.done} of ${m.goals.length} done`));
      }
      box.appendChild(card);
    }
    return box;
  }
  if (scope === 'profile') {
    box.appendChild(_pmKv([['Name', data.name], ['Bio', data.bio], ['Emoji', data.emoji], ['Pronouns', data.pronouns], ['City', data.city]]));
    return box;
  }
  if (scope === 'game') {
    box.appendChild(_pmKv([['Level', data.level != null ? String(data.level) + (data.title ? ' · ' + data.title : '') : ''], ['XP', data.xp != null ? String(data.xp) : ''],
      ['XP this week', data.xpWeek != null ? String(data.xpWeek) : ''], ['Streak', data.streak != null ? data.streak + ' days' : ''], ['Best streak', data.best != null ? data.best + ' days' : ''],
      ['Quests', data.quests != null ? String(data.quests) : ''], ['Focus', data.focusMin != null ? data.focusMin + ' min' : '']]));
    return box;
  }
  // ── garden-social ── (2.18) the garden snapshot: counts and words, never the rows themselves
  if (scope === 'garden') {
    const snap = typeof gardenSnapshotClean === 'function' ? gardenSnapshotClean(data) : null;
    if (!snap) { box.appendChild(emptyLine('Nothing yet: it goes once your garden has grown a little.')); return box; }
    const areas = snap.areas.map(a => (typeof gardenArea === 'function' && gardenArea(a) ? gardenArea(a).name : a)).join(', ');
    box.appendChild(_pmKv([['Level', String(snap.lv)], ['Season', snap.season], ['Plants', String(snap.plants.length)], ['Decorations', String(snap.decor.length)], ['Areas', areas]]));
    return box;
  }
  // ── end garden-social ──
  if (scope === 'presence') {
    box.appendChild(_pmEl('p', '', data.s || data.state || ''));
    return box;
  }
  box.appendChild(emptyLine('Nothing.'));
  return box;
}

/* ---------- pickers ---------- */
/** Tick the tasks this friend sees under 'Only tasks I share' (selectList: Select all, Invert, Apply). */
function _pmPickTasks(friendId, after) {
  const name = permsFriendName(friendId);
  const cur = new Set(permsFor(friendId).scopes.tasks.ids || []);
  const tasks = (state.custom || []).filter(t => t && typeof t.id === 'string' && !(state.deleted && state.deleted[t.id]) && (statusOf(t.id) !== 'done' || cur.has(t.id)))
    .sort((a, b) => (cur.has(b.id) - cur.has(a.id)) || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
  openDialog({
    title: `Tasks ${name} can see`, size: 'md', fixed: true, resizeKey: 'perms-tasks',   // it has a filter: the dialog keeps its size
    body: (el, close) => {
      el.appendChild(_pmEl('p', 'muted', `Tick the tasks to share. ${name} sees their title, due date, status, priority, stream, tags and steps done; never notes, descriptions, files or the people on them.`));
      const filter = document.createElement('input'); filter.className = 'control'; filter.type = 'search'; filter.placeholder = 'Find a task'; filter.setAttribute('aria-label', 'Find a task');
      el.appendChild(filter);
      const list = _pmEl('div', 'pm-pick');
      for (const t of tasks.slice(0, 400)) {
        const row = _pmEl('div', 'pm-pick-row'); row.dataset.selId = t.id;
        row.appendChild(_pmEl('span', 'pm-pick-t', effTitle(t) || '(no title)'));
        row.appendChild(_pmEl('span', 'pm-pick-s muted', [t.dueDate ? _pmDay(t.dueDate) : '', ((state.streams || []).find(s => s && s.id === t.stream) || {}).label || ''].filter(Boolean).join(' · ')));
        list.appendChild(row);
      }
      el.appendChild(list);
      filter.oninput = () => { const q = filter.value.trim().toLowerCase(); for (const r of list.children) r.hidden = !!q && !r.textContent.toLowerCase().includes(q); };
      selectList(list, {
        rows: '.pm-pick-row', store: { on: new Set(cur) }, defaultOn: (id) => cur.has(id), label: 'Tasks to share', rowClick: true, compact: true,
        apply: { label: 'Share these', icon: 'send', run: (ids) => { permsSetScope(friendId, 'tasks', { ids, ...(permsFor(friendId).scopes.tasks.mode === 'none' ? { mode: 'shared' } : {}) }, { msg: `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} shared with ${name}` }); close(); if (after) after(); return { done: ids }; } },
      });
    },
  });
}
/** Tick the memories this friend sees: journal days, postcards, capsules, goals. */
function _pmPickMemories(friendId, after) {
  const name = permsFriendName(friendId);
  const cur = new Set(permsFor(friendId).scopes.memories.items || []);
  const m = state.memories && typeof state.memories === 'object' ? state.memories : {};
  const rows = [];
  const j = m.journal && typeof m.journal === 'object' ? m.journal : {};
  for (const d of Object.keys(j).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort().reverse().slice(0, 120)) rows.push({ id: 'journal-' + d, t: 'Journal · ' + _pmDayLong(d), s: (j[d] && (j[d].line || j[d].text)) || '' });
  const pc = m.postcards && typeof m.postcards === 'object' ? m.postcards : {};
  for (const cc of Object.keys(pc).filter(x => /^[A-Z]{2}$/.test(x))) rows.push({ id: 'postcard-' + cc, t: 'Postcard · ' + ((pc[cc] && pc[cc].name) || cc), s: (pc[cc] && pc[cc].city) || '' });
  for (const c of Array.isArray(m.capsules) ? m.capsules : []) if (c && typeof c.id === 'string' && /^[A-Za-z0-9_-]{1,56}$/.test(c.id)) rows.push({ id: 'capsule-' + c.id, t: 'Time capsule · opens ' + _pmDay(c.opens, true), s: c.opened || (c.opens && c.opens <= _pmToday()) ? (c.text || '') : 'Sealed: they see only when it opens' });
  const g = m.goals && typeof m.goals === 'object' ? m.goals : {};
  for (const y of Object.keys(g).filter(x => /^\d{4}$/.test(x)).sort().reverse()) rows.push({ id: 'goals-' + y, t: 'Goals · ' + y, s: ((g[y] && g[y].list) || []).map(x => x && x.text).filter(Boolean).slice(0, 3).join(', ') });
  openDialog({
    title: `Memories ${name} can see`, size: 'md', resizeKey: 'perms-mem',
    body: (el, close) => {
      if (!rows.length) { el.appendChild(emptyLine('No memories yet: the journal, postcards, capsules and goals appear here as you make them.')); return; }
      el.appendChild(_pmEl('p', 'muted', `Only what you tick goes to ${name}, as it shows here.`));
      const list = _pmEl('div', 'pm-pick');
      for (const r of rows) {
        const row = _pmEl('div', 'pm-pick-row'); row.dataset.selId = r.id;
        row.appendChild(_pmEl('span', 'pm-pick-t', r.t));
        if (r.s) row.appendChild(_pmEl('span', 'pm-pick-s muted', String(r.s).slice(0, 120)));
        list.appendChild(row);
      }
      el.appendChild(list);
      selectList(list, {
        rows: '.pm-pick-row', store: { on: new Set(cur) }, defaultOn: (id) => cur.has(id), label: 'Memories to share', rowClick: true, compact: true,
        apply: { label: 'Share these', icon: 'send', run: (ids) => { permsSetScope(friendId, 'memories', { items: ids, mode: 'chosen' }, { msg: `${ids.length} ${ids.length === 1 ? 'memory' : 'memories'} shared with ${name}` }); close(); if (after) after(); return { done: ids }; } },
      });
    },
  });
}
/** How long a scope is shared: always, until a day, during a trip, or between two days. */
function _pmPickWindow(friendId, scope, after) {
  const c = permsFor(friendId).scopes[scope];
  const name = permsFriendName(friendId);
  let trips = [];
  try { if (typeof TravelStore !== 'undefined' && TravelStore.on()) trips = (TravelStore.trips() || []).filter(t => t && !t.candidate && t.from && (t.to || t.from) >= _pmToday()).slice(0, 12); } catch (e) { trips = []; }
  let pick = c.label && c.from ? 'trip' : c.from ? 'between' : c.until ? 'until' : 'always';
  openDialog({
    title: `How long ${name} can see your ${((permsScope(scope) || {}).label || scope).toLowerCase()}`, size: 'sm', resizeKey: 'perms-window',
    body: (el) => {
      const mk = (id, label) => {
        const l = _pmEl('label', 'pm-radio'); const r = document.createElement('input'); r.type = 'radio'; r.name = 'pm-win'; r.value = id; r.checked = pick === id;
        r.onchange = () => { pick = id; };
        l.append(r, _pmEl('span', '', label)); el.appendChild(l); return l;
      };
      mk('always', 'Always, until I change it');
      const u = mk('until', 'Until a day');
      const ud = document.createElement('input'); ud.type = 'date'; ud.className = 'control control-sm'; ud.value = c.until || ''; ud.min = _pmToday(); ud.setAttribute('aria-label', 'Last day');
      ud.oninput = () => { pick = 'until'; u.querySelector('input').checked = true; };
      u.appendChild(ud);
      if (trips.length) {
        const t = mk('trip', 'During a trip');
        const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', 'Trip');
        for (const tr of trips) { const o = document.createElement('option'); o.value = tr.id; o.textContent = `${tr.label || tr.name || 'Trip'} (${_pmDay(tr.from)} to ${_pmDay(tr.to || tr.from)})`; if (c.label && c.from === tr.from) o.selected = true; sel.appendChild(o); }
        sel.onchange = () => { pick = 'trip'; t.querySelector('input').checked = true; };
        t.appendChild(sel);
        el._pmTrip = () => trips.find(x => x.id === sel.value) || trips[0];
      }
      const b = mk('between', 'Between two days');
      const bf = document.createElement('input'); bf.type = 'date'; bf.className = 'control control-sm'; bf.value = c.from || ''; bf.setAttribute('aria-label', 'First day');
      const bt = document.createElement('input'); bt.type = 'date'; bt.className = 'control control-sm'; bt.value = c.until || ''; bt.setAttribute('aria-label', 'Last day');
      const pickB = () => { pick = 'between'; b.querySelector('input').checked = true; };
      bf.oninput = pickB; bt.oninput = pickB;
      b.append(bf, _pmEl('span', 'muted', 'to'), bt);
      el.appendChild(_pmEl('p', 'muted', 'When the time is over, nothing more is sent and their copy is deleted.'));
      el._pmVals = () => ({ until: ud.value, from: bf.value, to: bt.value });
      _pmPickWindow._el = el;
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Save', primary: true, run: () => {
        const el = _pmPickWindow._el; const v = el._pmVals();
        let patch = { from: null, until: null, label: null };
        if (pick === 'until') { if (!v.until) { toast('Choose the last day', { kind: 'warn' }); return false; } patch.until = v.until; }
        if (pick === 'trip' && el._pmTrip) { const t = el._pmTrip(); patch = { from: t.from, until: t.to || t.from, label: String(t.label || t.name || 'the trip').slice(0, 70) }; }
        if (pick === 'between') { if (!v.from || !v.to || v.to < v.from) { toast('Choose a first and a last day', { kind: 'warn' }); return false; } patch.from = v.from; patch.until = v.to; }
        const w = _pmWindowText(patch);
        permsSetScope(friendId, scope, patch, { msg: w ? `Shared with ${name} ${w}` : `Shared with ${name} until you change it`, icon: 'hourglass' });
        if (after) after();
        return true;
      } },
    ],
  });
}

/* ---------- the panel ---------- */
/** Choose a level; risky ones ask first; a sensitive one for a friend not trusted offers to trust them. */
async function _pmChooseLevel(friendId, scope, mode, after) {
  const def = permsScope(scope);
  const name = permsFriendName(friendId);
  const f = permsFor(friendId);
  const risk = permsRisky(scope, mode);
  if (risk) {
    const ok = await confirmDialog({ title: `Share ${def.label.toLowerCase()} in full with ${name}?`, text: risk, confirmLabel: 'Share it', danger: true });
    if (!ok) { if (after) after(); return; }
  }
  if (def.sensitive && permsIsOn(mode) && !f.trusted) {
    // Choosing the level IS the choice: mark them trusted too, with Undo (nothing goes for a few seconds).
    // Only THIS level goes on: levels chosen for them before stay off (permsWithFriend), and the message says which.
    const was = permsTrustResets(permsGet(), friendId).filter(s => s !== scope);
    const next = permsWithScope(permsWithFriend(permsGet(), friendId, { trusted: true }, _pmNow()), friendId, scope, { mode }, _pmNow());
    const kept = was.length ? ` What you chose before stays off (${_pmScopeList(was)}).` : '';
    _pmSave(next, `${name} is a trusted friend now, and sees your ${def.label.toLowerCase()}: ${_pmModeLabel(scope, mode).toLowerCase()}.${kept}`, { icon: 'shield-check', undoMsg: `Back as it was: ${name} is not trusted` });
  } else {
    permsSetScope(friendId, scope, { mode });
  }
  if (after) after();
  if (scope === 'tasks' && mode === 'shared' && !(permsFor(friendId).scopes.tasks.ids || []).length) _pmPickTasks(friendId, after);
  if (scope === 'memories' && mode === 'chosen' && !(permsFor(friendId).scopes.memories.items || []).length) _pmPickMemories(friendId, after);
}
function _pmChipToggle(label, on, run) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pm-tog'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.textContent = label; b.onclick = run; return b;
}
function _pmScopeRow(friendId, def, f, eff, name, refresh) {
  const c = f.scopes[def.id], e = eff[def.id];
  const row = _pmEl('div', 'pm-row' + (e.on ? ' is-on' : ''));
  row.dataset.scope = def.id;
  const left = _pmEl('div', 'pm-row-l');
  const head = _pmEl('div', 'pm-row-h');
  head.appendChild(_pmIcon(def.icon));
  head.appendChild(_pmEl('span', 'pm-row-t', def.label));
  if (e.on) head.appendChild(_pmEl('span', 'pm-badge is-on', 'Shared'));
  else if (permsIsOn(c.mode)) head.appendChild(_pmEl('span', 'pm-badge is-wait', 'Not now: ' + (_PM_REASON[e.reason] || e.reason)));
  left.appendChild(head);
  left.appendChild(_pmEl('p', 'pm-row-d muted', permsLevelText(def.id, c.mode, name)));
  // the chosen tasks / streams / tags / memories
  if (def.id === 'tasks' && c.mode === 'shared') {
    const n = (c.ids || []).length;
    const x = _pmEl('div', 'pm-row-x');
    x.appendChild(_pmEl('span', 'muted', `${n} ${n === 1 ? 'task' : 'tasks'} shared`));
    x.appendChild(uiButton({ label: 'Choose tasks', icon: 'list-checks', kind: 'ghost', size: 'sm', run: () => _pmPickTasks(friendId, refresh) }));
    left.appendChild(x);
  }
  if (def.id === 'tasks' && c.mode === 'chosen') {
    const x = _pmEl('div', 'pm-row-x pm-togs');
    const streams = (state.streams || []).filter(s => s && s.id && !s.archived);
    for (const s of streams) {
      const on = (c.streams || []).includes(s.id);
      x.appendChild(_pmChipToggle(s.label || s.id, on, () => { const set = new Set(c.streams || []); if (on) set.delete(s.id); else set.add(s.id); permsSetScope(friendId, 'tasks', { streams: [...set] }); refresh(); }));
    }
    const counts = new Map();
    for (const t of state.custom || []) for (const tg of (t && Array.isArray(t.tags) ? t.tags : [])) counts.set(tg, (counts.get(tg) || 0) + 1);
    const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(x => x[0]);
    for (const tg of new Set([...(c.tags || []), ...tags])) {
      const on = (c.tags || []).includes(tg);
      x.appendChild(_pmChipToggle('#' + tg, on, () => { const set = new Set(c.tags || []); if (on) set.delete(tg); else set.add(tg); permsSetScope(friendId, 'tasks', { tags: [...set] }); refresh(); }));
    }
    left.appendChild(x);
  }
  if (def.id === 'memories' && c.mode === 'chosen') {
    const n = (c.items || []).length;
    const x = _pmEl('div', 'pm-row-x');
    x.appendChild(_pmEl('span', 'muted', `${n} ${n === 1 ? 'memory' : 'memories'} shared`));
    x.appendChild(uiButton({ label: 'Choose memories', icon: 'list-checks', kind: 'ghost', size: 'sm', run: () => _pmPickMemories(friendId, refresh) }));
    left.appendChild(x);
  }
  // the time window
  if (permsIsOn(c.mode)) {
    const w = _pmWindowText(c);
    const x = _pmEl('div', 'pm-row-x');
    x.appendChild(uiButton({ label: w ? 'Shared ' + w : 'Shared until you change it', icon: 'hourglass', kind: 'ghost', size: 'sm', cls: 'pm-win', run: () => _pmPickWindow(friendId, def.id, refresh) }));
    left.appendChild(x);
  }
  if (def.id === 'presence' && e.on && !permsPresenceSwitchOn()) {
    // Online status is one setting for everyone (Friends > settings): off there means nobody sees it, whatever is chosen here (L15)
    const g = _pmEl('p', 'pm-audit muted', 'Your online status is off for everyone. ');
    g.appendChild(uiButton({ label: 'Turn it on', kind: 'link', run: () => _pmTurnOnPresence(refresh) }));
    left.appendChild(g);
  }
  const risk = e.on ? permsRisky(def.id, c.mode) : '';
  if (risk) { const r = _pmEl('p', 'pm-risk'); r.appendChild(_pmIcon('triangle-alert')); r.appendChild(_pmEl('span', '', risk)); left.appendChild(r); }
  if (def.by === 'perms') { const a = permsAuditLine(friendId, def.id, name); if (a) left.appendChild(_pmEl('p', 'pm-audit muted', a)); }
  row.appendChild(left);
  // the level
  const right = _pmEl('div', 'pm-row-c');
  const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', `${def.label} for ${name}`);
  for (const [id, label] of def.modes) { const o = document.createElement('option'); o.value = id; o.textContent = label; if (id === c.mode) o.selected = true; sel.appendChild(o); }
  sel.onchange = () => { const v = sel.value; if (v === c.mode) return; _pmChooseLevel(friendId, def.id, v, refresh); };
  right.appendChild(sel);
  row.appendChild(right);
  return row;
}
/** "Turn it on": flips Friends' online status for everyone (96-friends-0core.js friendsPresenceShare), then repaints. */
function _pmTurnOnPresence(refresh) {
  Promise.resolve(typeof permsPresenceTurnOn === 'function' ? permsPresenceTurnOn() : null)
    .then(() => { toast('Online status on', { kind: 'ok' }); if (refresh) refresh(); })
    .catch((e) => toastError('turn on your online status', e, () => _pmTurnOnPresence(refresh)));
}
/** The Permissions panel for one friend (a friend's page, Settings > Privacy, the palette). */
function permsPanelEl(friendId) {
  const root = _pmEl('section', 'pm-panel');
  root.dataset.permsFriend = friendId;
  const build = () => {
    root.textContent = '';
    if (!permsFriendIdOk(friendId)) { root.appendChild(_pmEl('p', 'muted', 'Not a friend.')); return; }
    const view = permsFriendView(friendId);
    const name = permsFriendName(view || friendId);
    const p = permsGet(), f = permsFor(friendId);
    const eff = permsEffective(p, friendId, { status: view ? view.status : '', today: _pmToday() });
    const head = _pmEl('div', 'pm-head');
    const ht = _pmEl('div', 'pm-head-t');
    ht.appendChild(_pmEl('h3', '', `What ${name} can see`));
    ht.appendChild(_pmEl('p', 'muted', 'Only what you turn on goes to them.'));
    head.appendChild(ht);
    head.appendChild(uiButton({ label: `Preview what ${name} sees`, icon: 'eye', size: 'sm', run: () => permsPreviewOpen(friendId) }));
    root.appendChild(head);
    const banner = (text, btn) => { const b = _pmEl('div', 'pm-banner'); b.appendChild(_pmIcon('eye-off')); b.appendChild(_pmEl('span', '', text)); if (btn) b.appendChild(btn); root.appendChild(b); };
    if (!view || view.status !== 'friend') banner(view && view.status === 'blocked' ? `${name} is blocked: nothing goes to them.` : `Nothing goes to ${name} until you are both confirmed friends.`);
    if (p.stopped) banner('All sharing is stopped. Your choices are kept for when you share again.', uiButton({ label: 'Share again', icon: 'undo-2', kind: 'primary', size: 'sm', run: () => { permsResumeAll(); build(); } }));
    else if (f.stopped) banner(`Sharing with ${name} is stopped. Your choices are kept.`, uiButton({ label: 'Share again', icon: 'undo-2', kind: 'primary', size: 'sm', run: () => { permsResumeFriend(friendId); build(); } }));
    // trusted
    const trust = _pmEl('div', 'pm-trust');
    trust.appendChild(_pmIcon('shield-check'));
    const tt = _pmEl('div', 'pm-trust-t');
    tt.appendChild(_pmEl('div', 'pm-row-t', 'Trusted friend'));
    tt.appendChild(_pmEl('p', 'muted', 'Needed to share tasks, calendar, money, places, memories or online status.'));
    trust.appendChild(tt);
    trust.appendChild(_settingsSwitch(f.trusted, 'Trusted friend', (v) => { permsSetTrusted(friendId, v); build(); }));
    root.appendChild(trust);
    const rows = _pmEl('div', 'pm-rows');
    for (const def of PERMS_SCOPES) rows.appendChild(_pmScopeRow(friendId, def, f, eff, name, build));
    root.appendChild(rows);
    const foot = _pmEl('div', 'pm-foot');
    if (!f.stopped && !p.stopped) foot.appendChild(uiButton({ label: `Stop sharing with ${name}`, icon: 'eye-off', kind: 'danger', size: 'sm', run: () => { permsStopFriend(friendId); build(); } }));
    foot.appendChild(uiButton({ label: `What ${name} shares with you`, icon: 'users', kind: 'ghost', size: 'sm', run: () => permsReceivedOpen(friendId) }));
    root.appendChild(foot);
  };
  build();
  // the audit lines come from the server: repaint once they are here, and when something goes out or arrives
  const had = permsAuditCached();
  permsAudit().then((a) => { if (root.isConnected && a !== had) build(); }).catch(() => { /* the audit lines wait for the next try */ });
  const off = onFriendsData(() => { if (!root.isConnected) { off(); return; } const was = permsAuditCached(); permsAudit().then((a) => { if (root.isConnected && a !== was) build(); }).catch(() => {}); });
  root._pmRefresh = build;
  return root;
}
function permsPanelDialog(friendId) {
  openDialog({ title: `${permsFriendName(friendId)}: what they can see`, size: 'lg', resizeKey: 'perms-panel', body: (el) => el.appendChild(permsPanelEl(friendId)) });
}

/* ---------- 'What Sam can see' ---------- */
function permsPreviewOpen(friendId) {
  const name = permsFriendName(friendId);
  openDialog({
    title: `What ${name} can see`, size: 'lg', resizeKey: 'perms-preview',
    body: (el) => {
      el.appendChild(_pmEl('p', 'muted', `Exactly what would go to ${name} now.`));
      const box = _pmEl('div', 'pm-preview');
      el.appendChild(box);
      const load = () => {
      box.textContent = '';
      box.appendChild(_pmEl('p', 'muted', 'Working it out…'));
      permsPreview(friendId).then((j) => {
        box.textContent = '';
        const rows = Array.isArray(j.scopes) ? j.scopes : [];
        const on = rows.filter(r => r.on), off = rows.filter(r => !r.on);
        if (!on.length) box.appendChild(_pmEl('p', '', `${name} sees nothing from you right now.`));
        for (const r of on) {
          const sec = _pmEl('section', 'pm-pv');
          const h = _pmEl('div', 'pm-pv-h');
          h.appendChild(_pmIcon((permsScope(r.scope) || {}).icon || 'eye'));
          h.appendChild(_pmEl('span', 'pm-row-t', `${r.label}: ${_pmModeLabel(r.scope, r.mode)}`));
          const w = _pmWindowText({ from: r.from, until: r.until, label: r.window });
          if (w) h.appendChild(_pmEl('span', 'pm-badge', w));
          sec.appendChild(h);
          if (r.by === 'perms') {
            if (r.nothing) sec.appendChild(_pmEl('p', 'muted', 'Nothing to send yet (no data for this here).'));
            else {
              sec.appendChild(permsRenderData(r.scope, r.mode, r.data));
              const d = document.createElement('details'); d.className = 'pm-raw';
              d.appendChild(_pmEl('summary', '', `The data as sent (${r.bodies} ${r.bodies === 1 ? 'message' : 'messages'}, ${Math.max(1, Math.round((r.bytes || 0) / 1024))} KB)`));
              d.appendChild(_pmEl('pre', '', JSON.stringify(r.data, null, 1)));
              sec.appendChild(d);
            }
          } else if (r.sent) {
            sec.appendChild(permsRenderData(r.scope, r.mode, r.sent));
            if (r.needsSwitch) {
              const g = _pmEl('p', 'muted', 'Nothing goes yet: your online status is off for everyone. ');
              g.appendChild(uiButton({ label: 'Turn it on', kind: 'link', run: () => _pmTurnOnPresence(load) }));
              sec.appendChild(g);
            } else sec.appendChild(_pmEl('p', 'muted', `Sent by the Friends tab${r.sentAt ? ', last updated ' + _pmAgo(r.sentAt) : ''}.`));
          } else {
            sec.appendChild(_pmEl('p', 'muted', permsLevelText(r.scope, r.mode, name) + ' The Friends tab sends it.'));
          }
          box.appendChild(sec);
        }
        if (off.length) {
          const sec = _pmEl('section', 'pm-pv pm-pv-off');
          sec.appendChild(_pmEl('div', 'pm-pv-h', 'Not shared'));
          const ul = _pmEl('ul', 'pm-list');
          for (const r of off) ul.appendChild(_pmEl('li', 'pm-item muted', `${r.label}: ${_PM_REASON[r.reason] || r.reason || 'off'}`));
          sec.appendChild(ul);
          box.appendChild(sec);
        }
      }).catch((e) => {
        box.textContent = '';
        _pmErrLine(box, `work out what ${name} sees`, e, load);
      });
      };
      load();
    },
  });
}
/** What a friend shares with you, read-only (their data: textContent only). */
function permsReceivedOpen(friendId) {
  const name = permsFriendName(friendId);
  openDialog({
    title: `What ${name} shares with you`, size: 'lg', resizeKey: 'perms-recv',
    body: (el, close) => {
      const box = _pmEl('div', 'pm-preview');
      el.appendChild(box);
      const engine = [['profile', 'Profile'], ['game', 'Game progress']].map(([sc, label]) => [sc, label, friendsData(friendId, sc)]).filter(x => x[2]);
      const load = () => {
      box.textContent = '';
      box.appendChild(_pmEl('p', 'muted', `Getting what ${name} shares…`));
      friendsDataLoad(friendId).then((doc) => {
        box.textContent = '';
        const scopes = doc && doc.scopes ? doc.scopes : {};
        const keys = PERMS_SENT_SCOPES.filter(sc => scopes[sc] && !(scopes[sc].until && scopes[sc].until < _pmNow()));
        if (!keys.length && !engine.length) box.appendChild(emptyLine(`${name} has not shared anything with you yet.`));
        for (const [sc, label, data] of engine) {
          const sec = _pmEl('section', 'pm-pv');
          const h = _pmEl('div', 'pm-pv-h'); h.appendChild(_pmIcon((permsScope(sc) || {}).icon || 'user')); h.appendChild(_pmEl('span', 'pm-row-t', label));
          sec.appendChild(h); sec.appendChild(permsRenderData(sc, 'on', data)); box.appendChild(sec);
        }
        for (const sc of keys) {
          const r = scopes[sc];
          const sec = _pmEl('section', 'pm-pv');
          const h = _pmEl('div', 'pm-pv-h');
          h.appendChild(_pmIcon((permsScope(sc) || {}).icon || 'eye'));
          h.appendChild(_pmEl('span', 'pm-row-t', `${(permsScope(sc) || {}).label || sc}: ${_pmModeLabel(sc, r.mode)}`));
          h.appendChild(_pmEl('span', 'pm-badge', 'updated ' + _pmAgo(r.got || r.at)));
          if (r.until) h.appendChild(_pmEl('span', 'pm-badge', 'until ' + new Date(r.until).toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short' })));
          sec.appendChild(h);
          sec.appendChild(permsRenderData(sc, r.mode, r.data));
          box.appendChild(sec);
        }
        if (keys.length) {
          const foot = _pmEl('div', 'pm-foot');
          foot.appendChild(_pmEl('p', 'muted', `Kept read-only on your computers. ${name} can stop sharing at any time and it disappears here.`));
          foot.appendChild(uiButton({ label: 'Remove from this computer', icon: 'trash-2', kind: 'ghost', size: 'sm', run: () => { close(); permsForgetReceived(friendId); } }));
          box.appendChild(foot);
        }
      }).catch((e) => {
        box.textContent = '';
        _pmErrLine(box, `read what ${name} shares`, e, load);
      });
      };
      load();
    },
  });
}
/**
 * Remove what a friend shared from your devices, with Undo instead of a question: it goes from the
 * screen now and is deleted 10 seconds later unless you undo (anything they send later appears again).
 */
function permsForgetReceived(friendId) {
  if (!permsFriendIdOk(friendId)) return;
  const name = permsFriendName(friendId);
  let undone = false;
  const run = () => _pmJson('/api/friends/received/forget', { friend: friendId })
    .then(() => { _pm.recv.delete(friendId); _pmNotify(friendId, null); })
    .catch((e) => toastError(`remove what ${name} shared`, e, run));
  const timer = setTimeout(() => { if (!undone) run(); }, 10000);
  toast(`Removed what ${name} shared from your computers. Anything they send later appears again.`, { icon: 'trash-2', timeout: 10000,
    action: { label: 'Undo', run: () => { undone = true; clearTimeout(timer); toast(`Kept what ${name} shared`, { kind: 'ok', icon: 'undo-2' }); } } });
}

/* ---------- Settings > Privacy ---------- */
function _pmSummary(friendId, view) {
  const eff = permsEffective(permsGet(), friendId, { status: view ? view.status : '', today: _pmToday() });
  const on = PERMS_SCOPES.filter(d => eff[d.id].on).map(d => {
    const e = eff[d.id];
    const lvl = d.modes.length > 2 ? ': ' + _pmModeLabel(d.id, e.mode).toLowerCase() : '';
    const w = _pmWindowText({ from: e.from, until: e.until, label: e.label });
    return d.label + lvl + (w ? ' (' + w + ')' : '');
  });
  return on.length ? on.join(', ') : 'Nothing';
}
/** Friends with more than the starting profile and game progress turned on (the overview's "more with N"). */
function _pmMoreCount(friends) {
  let n = 0;
  for (const f of friends) {
    if (f.status !== 'friend') continue;
    const eff = permsEffective(permsGet(), f.id, { status: f.status, today: _pmToday() });
    if (PERMS_SCOPES.some(d => !['profile', 'game', 'garden'].includes(d.id) && eff[d.id] && eff[d.id].on)) n++;
  }
  return n;
}
registerSettingsGroup({
  id: 'privacy', title: 'Privacy', icon: 'shield-check', order: 45,
  description: 'What each friend can see.',
  render(el) {
    const p = permsGet();
    const friends = permsFriends().filter(f => f.status === 'friend' || f.status === 'blocked');
    // friends arrive with window.Friends' first answer: paint again then (once)
    const F = _pmFriendsApi();
    if (F && F.ready && typeof F.ready.then === 'function' && !_pm.friendsReady) F.ready.then(() => { if (_pm.friendsReady) return; _pm.friendsReady = true; if (state.view === 'settings:privacy' && typeof renderMain === 'function') renderMain(); });
    // the "last received" lines come from the audit log: paint again once it is here (once)
    if (!permsAuditCached() && friends.length) permsAudit().then(() => { if (state.view === 'settings:privacy' && typeof renderMain === 'function') renderMain(); });
    const { card, body } = _settingsCard('Friends');
    const real = friends.filter(f => f.status === 'friend');
    // status first (SIMPLIFY_PLAN.md 5.8), then the one action that fits it
    if (p.stopped) {
      body.appendChild(setStatusLine('idle', 'Stopped', `Nothing goes to anyone since ${new Date(p.stopped).toLocaleString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`));
      setAction(card, 'Share again', () => permsResumeAll(), { icon: 'undo-2' });
    } else if (!friends.length) {
      body.appendChild(setStatusLine('idle', 'No friends yet', ''));
      body.appendChild(emptyLine('When you add one, you choose here what they can see.', { label: 'Add a friend', icon: 'user-plus', run: () => { if (typeof friendsAddDialog === 'function') friendsAddDialog(); else setView('friends'); } }));
    } else {
      const m = _pmMoreCount(friends);
      body.appendChild(setStatusLine('ok', 'Sharing', `Your card and game progress with ${real.length} ${real.length === 1 ? 'friend' : 'friends'}${m ? `; more with ${m}` : ''}`));
    }
    if (!p.stopped) {
      body.appendChild(_settingsRow('Stop sharing everything', 'Nothing more goes to anyone, and friends are asked to delete what you shared. Undo for 15 seconds.',
        uiButton({ label: 'Stop sharing everything', icon: 'eye-off', kind: 'danger', size: 'sm', run: () => permsStopAll() })));
    }
    if (friends.length) {
      const list = _pmEl('div', 'pm-friends');
      for (const f of friends) {
        const fc = permsFor(f.id);
        const row = _pmEl('div', 'pm-friend');
        const av = _pmEl('span', 'pm-av', permsFriendName(f).slice(0, 1).toUpperCase());
        row.appendChild(av);
        const main = _pmEl('div', 'pm-friend-main');
        const t = _pmEl('div', 'pm-friend-t', permsFriendName(f));
        if (fc.trusted) t.appendChild(_pmEl('span', 'pm-badge is-on', 'Trusted'));
        if (f.status === 'blocked') t.appendChild(_pmEl('span', 'pm-badge', 'Blocked'));
        else if (fc.stopped) t.appendChild(_pmEl('span', 'pm-badge is-wait', 'Stopped'));
        main.appendChild(t);
        main.appendChild(_pmEl('div', 'muted', f.status === 'blocked' ? 'Nothing goes to them.' : 'Sees: ' + _pmSummary(f.id, f)));
        const last = (() => { const a = _pm.audit && _pm.audit.sent && _pm.audit.sent[f.id]; if (!a) return 0; return Math.max(0, ...Object.values(a).map(x => Number(x.ackAt) || 0)); })();
        if (last) main.appendChild(_pmEl('div', 'muted', 'Last received from you ' + _pmAgo(last)));
        row.appendChild(main);
        const act = _pmEl('div', 'pm-friend-act');
        act.appendChild(uiButton({ label: 'Choose', icon: 'shield-check', size: 'sm', run: () => permsPanelDialog(f.id) }));
        act.appendChild(uiButton({ label: 'Preview', icon: 'eye', kind: 'ghost', size: 'sm', run: () => permsPreviewOpen(f.id) }));
        row.appendChild(act);
        list.appendChild(row);
      }
      body.appendChild(list);
    }
    // More: what went to whom (the log), and how sharing works. Built now, so Settings search finds them.
    setFold({ card, body }, 'privacy-friends-more', 'More', ({ body: more }) => {
      const act = _pmEl('div', 'pm-more-blk');
      act.appendChild(_pmEl('div', 'set-t', 'Sharing activity'));
      act.appendChild(_pmEl('div', 'set-h', 'What went to whom and when. The log keeps no copy of the data itself.'));
      const box = _pmEl('div', 'pm-activity');
      box.appendChild(_pmEl('p', 'muted', 'Loading…'));
      act.appendChild(box);
      const send = _pmEl('div', 'pm-foot');
      send.appendChild(uiButton({ label: 'Send changes now', icon: 'send', kind: 'ghost', size: 'sm', run: async () => {
        try { const r = await permsSendNow(); toast(r && r.sent ? `Sent ${r.sent} ${r.sent === 1 ? 'update' : 'updates'}` : 'Nothing new to send', { kind: 'ok' }); render(); }
        catch (e) { toastError('send your changes', e, () => permsSendNow().then(() => toast('Sent', { kind: 'ok' }))); }
      } }));
      act.appendChild(send);
      more.appendChild(act);
      const loadAudit = () => permsAudit().then((a) => {
        box.textContent = '';
        const ev = (a && Array.isArray(a.events) ? a.events : []).slice().reverse().slice(0, 40);
        if (!ev.length) { box.appendChild(emptyLine('Nothing sent yet. When you share something with a friend, each update shows here.')); return; }
        const ul = _pmEl('ul', 'pm-list');
        for (const x of ev) {
          const who = permsFriendName(x.friend);
          const what = ((permsScope(x.scope) || {}).label || x.scope || '').toLowerCase();
          const text = x.op === 'revoke' ? `Asked ${who} to delete your ${what}`
            : `Your ${what} (${_pmModeLabel(x.scope, x.mode).toLowerCase()}) to ${who}${x.op === 'diff' ? ', changes only' : ''}${x.n > 1 ? ` · ${x.n} items` : ''}${x.bytes ? ` · ${Math.max(1, Math.round(x.bytes / 1024))} KB` : ''}`;
          const li = _pmEl('li', 'pm-item');
          li.appendChild(_pmEl('span', 'pm-when', _pmAgo(x.at)));
          li.appendChild(_pmEl('div', 'pm-item-t', text));
          ul.appendChild(li);
        }
        box.appendChild(ul);
      }).catch((e) => { box.textContent = ''; _pmErrLine(box, 'read the sharing log', e, () => { box.textContent = ''; box.appendChild(_pmEl('p', 'muted', 'Loading…')); loadAudit(); }); });
      loadAudit();
      const how = _pmEl('div', 'pm-more-blk');
      how.appendChild(_pmEl('div', 'set-t', 'How sharing works'));
      for (const t of [
        'Each friend\'s packet is made on this computer from your own data, with only the fields their level allows, and sent end-to-end encrypted to that friend alone.',
        'Changes go out a few seconds after you make them, as small updates. Turning something off, a share ending or Stop sharing asks their app to delete its copy; a well-behaved app does, but deletion on someone else\'s computer cannot be forced.',
        'What friends share with you is kept read-only on your own computers, is never shown to Claude or used by the assistant, and goes when they stop sharing.',
      ]) how.appendChild(_pmEl('p', 'muted', t));
      more.appendChild(how);
    });
    el.appendChild(card);
  },
});

/* ---------- the palette ---------- */
registerCommand({ id: 'perms-privacy', label: 'What my friends can see', icon: 'shield-check', group: 'Settings', keywords: 'friends privacy permissions sharing share scopes trusted', run: () => setView('settings:privacy') });
registerCommand({ id: 'perms-stop-all', label: 'Stop sharing everything with friends', icon: 'eye-off', group: 'Commands', keywords: 'friends privacy stop sharing revoke panic', run: () => permsStopAll() });
registerCommand({ id: 'perms-share-task', label: 'Share the open task with a friend', icon: 'send', group: 'Commands', keywords: 'friends share task show',
  run: () => {
    const id = state.selectedTaskId;
    const t = id && (state.custom || []).find(x => x && x.id === id);
    if (!t) { toast('Open a task first, then share it from here or its menu.', { kind: 'info' }); return; }
    const friends = permsFriends().filter(f => f.status === 'friend');
    if (!friends.length) { toast('No friends yet: add one in Friends, then share tasks with them.', { kind: 'info', action: { label: 'Open Friends', run: () => setView('friends') } }); return; }
    const now = new Set(permsTaskSharedWith(id));
    openDialog({
      title: `Share “${effTitle(t) || 'this task'}”`, size: 'sm', resizeKey: 'perms-share-task',
      body: (el, close) => {
        el.appendChild(_pmEl('p', 'muted', 'They see its title, due date, status, priority, stream, tags and steps done. Only trusted friends can be given tasks.'));
        const list = _pmEl('div', 'pm-pick');
        for (const f of friends) {
          const row = _pmEl('div', 'pm-pick-row'); row.dataset.selId = f.id;
          row.appendChild(_pmEl('span', 'pm-pick-t', permsFriendName(f)));
          const fc = permsFor(f.id);
          row.appendChild(_pmEl('span', 'pm-pick-s muted', !fc.trusted ? 'Not a trusted friend: trust them on their page first' : fc.scopes.tasks.mode === 'all' ? 'Sees all your tasks' : fc.scopes.tasks.mode === 'chosen' ? 'Sees chosen streams and tags' : ''));
          list.appendChild(row);
        }
        el.appendChild(list);
        selectList(list, {
          rows: '.pm-pick-row', store: { on: new Set(now) }, defaultOn: (fid) => now.has(fid), label: 'Friends', rowClick: true, compact: true,
          locked: (fid) => !permsFor(fid).trusted,   // tasks go only to trusted friends: trust them on their page first
          apply: { label: 'Share', icon: 'send', run: (ids) => {
            const want = new Set(ids);
            const p0 = permsGet();
            let p = p0;
            for (const f of friends) {
              const c = permsFriend(p, f.id).scopes.tasks;
              const has = (c.ids || []).includes(id);
              if (want.has(f.id) === has) continue;
              const set = new Set(c.ids || []); if (want.has(f.id)) set.add(id); else set.delete(id);
              p = permsWithScope(p, f.id, 'tasks', { ids: [...set], ...(want.has(f.id) && c.mode === 'none' ? { mode: 'shared' } : {}) }, _pmNow());
            }
            if (p !== p0) _pmSave(p, ids.length ? `Shared with ${ids.map(x => permsFriendName(x)).join(', ')}` : 'No longer shared');
            close();
            return { done: ids };
          } },
        });
      },
    });
  } });

/* ---------- the friend page (agent friends): the panel is a section of each friend's page ---------- */
if (typeof window !== 'undefined' && window.Friends && typeof window.Friends.registerPanel === 'function') {
  try { window.Friends.registerPanel({ id: 'perms', order: 20, where: 'friend', zone: 'fold', title: 'Privacy', icon: 'shield-check', render: (el, friend) => { if (!friend || !permsFriendIdOk(friend.id)) return false; el.appendChild(permsPanelEl(friend.id)); } }); }
  catch (e) { console.error('[perms]', e); }
}
