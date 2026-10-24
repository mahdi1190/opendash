/* ============================================================
   TOGETHER: friends in YOUR views. "From Sam" requests at the top of
   Today and the Inbox; tasks you accepted in a space listed with your own
   (a separate "Shared with you" group: they are never copied into your
   tasks); friends' shared tasks as a faint layer (Settings: the Together
   menu) in the lists, the week timeline and the calendar; their busy times
   (only what each friend shares, agent 'perms'); and Find a time.

   TIME ZONES: a friend's timed events arrive as absolute instants (t0, t1)
   and are put on YOUR clock here (Clock: the dashboard's zone, travel
   included), split at your midnights; their zone (tz) only adds a small
   "their time" hint where it differs from yours. All-day events, and timed
   ones from an older sender (their wall times, no instants), stay on their
   dates as sent.
   ============================================================ */
var _tgLayers = { busy: null, tasks: null, at: 0, tasksAt: 0, loading: false, tasksLoading: false, available: null };

const _TG_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Minutes after midnight of an instant on your clock. */
function _tgMinOf(ms) { const p = Clock.parts(ms); return p.h * 60 + p.mi; }
/** An absolute busy time [t0, t1) on your clock, cut at your midnights: [{day, s, e, t0, t1}] (two weeks at most). */
function tgLocalSpans(t0, t1, extra) {
  const out = [];
  let a = t0;
  for (let i = 0; i < 15 && a < t1; i++) {
    const day = Clock.parts(a).iso;
    const next = Clock.at(Clock.addDays(day, 1), 0);
    if (!(next > a)) break;
    const b = Math.min(t1, next);
    out.push(Object.assign({ day, s: _tgMinOf(a), e: b >= next ? 1440 : _tgMinOf(b), t0, t1 }, extra || {}));
    a = b;
  }
  return out;
}
/** One friend's answer from /api/together/layers, checked and put on your clock: {fid, name, tz, items: [{day, s, e, allDay?, title?, t0?, t1?}]}. */
function _tgBusyFriend(f) {
  const tz = typeof f.tz === 'string' && f.tz.length <= 64 && Clock.valid(f.tz) ? f.tz : '';
  const items = [];
  for (const x of Array.isArray(f.items) ? f.items.slice(0, 1500) : []) {
    if (!x || typeof x !== 'object') continue;
    const title = typeof x.title === 'string' && x.title ? { title: x.title.slice(0, 120) } : null;
    if (Number.isFinite(x.t0) && Number.isFinite(x.t1) && x.t1 > x.t0 && x.t1 - x.t0 <= 14 * 86400000) { items.push(...tgLocalSpans(x.t0, x.t1, title)); continue; }
    if (_TG_DAY_RE.test(String(x.day || '')) && Number.isFinite(x.s) && Number.isFinite(x.e)) items.push(Object.assign({ day: x.day, s: x.s, e: x.e }, x.allDay ? { allDay: true } : { wall: true }, title || {}));
  }
  return { fid: String(f.id || ''), name: String(f.name || '').slice(0, 80), tz, at: Number.isFinite(f.at) && f.at > 0 ? f.at : 0, items };
}
/** Friends' busy times, from what each shares with you (agent 'perms' calendar; cached ten minutes): [{fid, name, tz, items: [{day, s, e, allDay?}]}] on your clock. force: fetch now. */
function tgBusyLayers(force) {
  if (!tgChannel()) return [];
  // Your clock moved (travel): the same instants, put on the new clock.
  if (_tgLayers.busy && _tgLayers.zone && Clock.zone() !== _tgLayers.zone) _tgLayers.at = 0;
  if (!_tgLayers.loading && (force || Date.now() - _tgLayers.at > 10 * 60 * 1000)) {
    _tgLayers.loading = true;
    _tgLayers.err = '';
    _tgFetch('/api/together/layers?scope=calendar').then((j) => {
      _tgLayers.busy = (j && Array.isArray(j.friends) ? j.friends : []).filter(f => f && TG_ID_RE.test(String(f.id || ''))).map(_tgBusyFriend);
      _tgLayers.zone = Clock.zone();
      _tgLayers.available = !!(j && j.available);
      _tgLayers.at = Date.now();
      if (force || _tgLayers.busy.some(f => f.items.length)) render();
    }).catch((e) => { _tgLayers.at = Date.now(); _tgLayers.err = String((e && e.message) || e); if (force) render(); }).finally(() => { _tgLayers.loading = false; });
  }
  return _tgLayers.busy || [];
}
function tgBusyFriend(fid) { return (_tgLayers.busy || []).find(f => f.fid === fid) || null; }
/** "10:00–11:00 their time" for a stretch of your day, when the friend's clock differs from yours (else ''). */
function tgTheirTime(f, day, s, e) {
  if (!f || !f.tz) return '';
  try {
    const a = Clock.at(day, s), b = e >= 1440 ? Clock.at(Clock.addDays(day, 1), 0) : Clock.at(day, e);
    if (Clock.offset(a, f.tz) === Clock.offset(a, Clock.zone())) return '';
    return `${Clock.fmtTime(a, { zone: f.tz })}–${Clock.fmtTime(b, { zone: f.tz })} their time`;
  } catch (x) { return ''; }
}
/** Hover text of a busy block: who, when on your clock, and their own time when it differs. */
function tgBusyTip(f, day, b) {
  const their = tgTheirTime(f, day, b.s, b.e);
  return `${tgName(f.fid)} is busy · ${_tgHM(b.s)}–${_tgHM(Math.min(b.e, 1440))}${their ? ' (' + their + ')' : ''}`;
}
/** Friends' own tasks they share with you (perms 'tasks'): [{fid, items: [{due, title, status}]}]; faint, read-only. */
function tgTaskLayers() {
  if (!tgChannel() || !tgPref('layers')) return [];
  if (!_tgLayers.tasksLoading && Date.now() - _tgLayers.tasksAt > 10 * 60 * 1000) {
    _tgLayers.tasksLoading = true;
    _tgFetch('/api/together/layers?scope=tasks').then((j) => {
      _tgLayers.tasks = (j && Array.isArray(j.friends) ? j.friends : []).map(f => ({ fid: f.id, items: Array.isArray(f.items) ? f.items.filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.due || ''))) : [] }));
      _tgLayers.tasksAt = Date.now();
      if (_tgLayers.tasks.some(f => f.items.length)) render();
    }).catch(() => { _tgLayers.tasksAt = Date.now(); }).finally(() => { _tgLayers.tasksLoading = false; });
  }
  return _tgLayers.tasks || [];
}
function _tgOpenFriend(fid) { try { if (typeof Friends !== 'undefined' && Friends && typeof Friends.open === 'function') Friends.open(fid); } catch (e) { /* the Friends tab is optional */ } }
/** Busy minutes of one friend on one day: [{s, e}] in minutes on your clock, merged (an older sender's: their wall times). */
function tgBusyOn(f, iso) {
  const out = [];
  for (const b of f.items || []) {
    if (b.allDay || b.day !== iso) continue;
    const s = Math.max(0, Math.min(1440, b.s)), e = Math.max(0, Math.min(1440, b.e));
    if (e > s) out.push({ s, e });
  }
  out.sort((a, b) => a.s - b.s);
  const merged = [];
  for (const x of out) { const l = merged[merged.length - 1]; if (l && x.s <= l.e) l.e = Math.max(l.e, x.e); else merged.push({ ...x }); }
  return merged;
}

/* ---------- which shared items a view shows ---------- */
function _tgInDay(it, view, today) {
  const due = it.due || null;
  if (view === 'today') return (!!due && due <= today) || it.status === 'doing';
  if (view === 'tomorrow') return due === Clock.addDays(today, 1);
  if (view === 'week') return !!due && due <= Clock.addDays(today, 7);
  if (view.startsWith('day:')) return due === view.slice(4);
  if (view === 'no-date') return !due;
  if (view === 'all') return true;
  return false;
}
/** [{sp, it}] of your accepted shared items for a view (open only). */
function tgMineFor(view) {
  const today = todayStr(), out = [];
  for (const sp of tgSpaces()) for (const it of sp.value.items || []) if (it.status !== 'done' && tgIsMine(it) && _tgInDay(it, view, today)) out.push({ sp, it });
  return out.sort((a, b) => String(a.it.due || '9999').localeCompare(String(b.it.due || '9999')));
}
/** [{sp, it}] of friends' shared items for a view (the faint layer). */
function tgTheirsFor(view) {
  const today = todayStr(), me = tgMe(), out = [];
  for (const sp of tgSpaces()) for (const it of sp.value.items || []) if (it.status !== 'done' && it.assignee && it.assignee !== me && _tgInDay(it, view, today)) out.push({ sp, it });
  return out;
}
/** [{fid, t}] of friends' own tasks (what they share with you) for a view. */
function tgFriendTasksFor(view) {
  const today = todayStr(), out = [];
  for (const f of tgTaskLayers()) for (const t of f.items) if (_tgInDay({ due: t.due, status: t.status }, view, today)) out.push({ fid: f.fid, t });
  return out.slice(0, 60);
}

/** Task lists (31-task-views.js): where 'top' = above your tasks, 'end' = below them. */
function togetherListExtras(list, view, where) {
  if (!tgOn() || !tgHas() || !tgChannel()) return;
  const v = String(view || '');
  if (where === 'top') {
    if (v !== 'today' && v !== 'inbox') return;
    const req = tgRequests();
    if (!req.length) return;
    const g = tgEl('div', 'tg-lx tg-lx-req');
    const h = tgEl('div', 'tg-lx-h');
    h.insertAdjacentHTML('beforeend', icon('inbox'));
    h.appendChild(tgEl('span', '', req.length === 1 ? 'A friend asks you' : `Friends ask you (${req.length})`));
    g.appendChild(h);
    for (const r of req.slice(0, 8)) g.appendChild(tgRequestRow(r.sp, r.it));
    if (req.length > 8) g.appendChild(tgBtn(`All ${req.length}`, { ghost: true, run: () => setView('together') }));
    list.appendChild(g);
    return;
  }
  const mine = tgMineFor(v);
  if (mine.length) list.appendChild(tgSharedWithYou(mine, v));
  if (tgPref('layers')) {
    const theirs = tgTheirsFor(v), own = tgFriendTasksFor(v);
    if (theirs.length || own.length) {
      const d = tgEl('details', 'tg-lx tg-faint');
      const s = tgEl('summary', 'tg-lx-h');
      s.insertAdjacentHTML('beforeend', icon('eye'));
      s.appendChild(tgEl('span', '', `Friends' tasks (${theirs.length + own.length})`));
      d.appendChild(s);
      for (const { fid, t } of own) {
        const r = tgEl('button', 'tg-row tg-faint-row'); r.type = 'button';
        r.appendChild(tgAvatarEl(fid, 'sm'));
        r.appendChild(tgEl('span', 'tg-row-t', t.title || '(a task)'));
        if (t.due) r.appendChild(tgDueChip(t.due));
        r.appendChild(tgEl('span', 'muted tg-sm', `${tgFirst(fid)} shares this`));
        r.onclick = () => _tgOpenFriend(fid);
        d.appendChild(r);
      }
      for (const { sp, it } of theirs.slice(0, 40)) {
        const r = tgEl('button', 'tg-row tg-faint-row'); r.type = 'button';
        r.appendChild(tgAvatarEl(it.assignee, 'sm', sp.value));
        r.appendChild(tgEl('span', 'tg-row-t', it.title || '(no title)'));
        if (it.due) r.appendChild(tgDueChip(it.due));
        r.appendChild(tgEl('span', 'muted tg-sm', `${tgFirst(it.assignee, sp.value)} · ${tgSpaceName(sp)}`));
        r.onclick = () => tgOpenItem(sp.id, it.id);
        d.appendChild(r);
      }
      list.appendChild(d);
    }
  }
}

/**
 * "Shared with you": the tasks from your spaces that are yours to do, in Today and the day lists.
 * Late ones first, then in progress, then by date; five at first ("Show all"), foldable (remembered);
 * each row says which space it is in (a click opens it) and who asked. They stay in their space:
 * ticking one off ticks it for everyone there, with Undo.
 */
function tgSharedWithYou(mine, view) {
  const today = todayStr(), fold = !!tgPref('sharedFold');
  const rank = (it) => (it.due && it.due < today ? 0 : it.status === 'doing' ? 1 : it.due === today ? 2 : 3);
  const rows = mine.slice().sort((a, b) => rank(a.it) - rank(b.it) || String(a.it.due || '9999').localeCompare(String(b.it.due || '9999')));
  const late = rows.filter(r => r.it.due && r.it.due < today).length;
  const g = tgEl('section', 'tg-lx tg-lx-mine' + (fold ? ' is-folded' : ''));
  const h = tgEl('button', 'tg-lx-h tg-lx-toggle'); h.type = 'button';
  h.setAttribute('aria-expanded', fold ? 'false' : 'true');
  h.title = fold ? 'Show the tasks shared with you' : 'Fold away (they stay in their spaces)';
  h.insertAdjacentHTML('beforeend', icon('users'));
  h.appendChild(tgEl('span', '', 'Shared with you'));
  h.appendChild(tgEl('span', 'count', String(rows.length)));
  if (late) h.appendChild(tgEl('span', 'tg-chip tg-due is-late', `${late} late`));
  h.appendChild(tgEl('span', 'spacer'));
  h.insertAdjacentHTML('beforeend', icon(fold ? 'chevron-right' : 'chevron-down', 'i-sm'));
  h.onclick = () => tgSetPref('sharedFold', !fold);
  g.appendChild(h);
  if (fold) return g;
  const all = !!_tgLayers.sharedAll || rows.length <= 6;
  for (const { sp, it } of rows.slice(0, all ? 30 : 5)) g.appendChild(tgItemRow(sp, it, false, { where: true }));
  if (!all) g.appendChild(tgBtn(`Show all ${rows.length}`, { ghost: true, cls: 'btn btn-ghost btn-sm tg-lx-more', icon: 'chevron-down', run: () => { _tgLayers.sharedAll = true; render(); } }));
  else if (rows.length > 30) g.appendChild(tgBtn(`All ${rows.length} in Together`, { ghost: true, cls: 'btn btn-ghost btn-sm tg-lx-more', icon: 'arrow-right', run: () => setView('together') }));
  return g;
}

/* ---------- the month (40-calendar.js calMonthGrid, Calendar section only) ---------- */
/**
 * Faint busy bars at the foot of a month cell: one thin row per friend who shares their calendar
 * (at most four), the day drawn from midnight to midnight on your clock; an all-day event fills
 * its row with a lighter stripe. Hover says who and when (their own time too when it differs).
 */
function togetherMonthCell(cell, iso) {
  if (!tgOn() || !tgHas() || !tgPref('calendar') || !String(state.view || '').startsWith('calendar')) return;
  const rows = [];
  for (const f of tgBusyLayers()) {
    if (rows.length >= 4) break;
    const timed = tgBusyOn(f, iso);
    const allDay = (f.items || []).filter(b => b.allDay && b.day === iso);
    if (!timed.length && !allDay.length) continue;
    rows.push({ f, timed, allDay });
  }
  if (!rows.length) return;
  const box = tgEl('div', 'tg-mbusy');
  box.setAttribute('aria-hidden', 'true');
  const tips = [];
  for (const r of rows) {
    const line = tgEl('div', 'tg-mb-row tg-hue-' + _tgHue(r.f.fid));
    if (r.allDay.length) { line.classList.add('is-allday'); tips.push(`${tgFirst(r.f.fid)}: all day${r.allDay[0].title ? ' (' + r.allDay[0].title + ')' : ''}`); }
    for (const b of r.timed) {
      const i = document.createElement('i');
      i.style.left = (b.s / 14.4) + '%'; i.style.width = Math.max(2, (b.e - b.s) / 14.4) + '%';
      line.appendChild(i);
    }
    if (r.timed.length) {
      const span = r.timed.map(b => `${_tgHM(b.s)}–${_tgHM(Math.min(b.e, 1440))}`).slice(0, 4).join(', ') + (r.timed.length > 4 ? '…' : '');
      const their = r.timed.length === 1 ? tgTheirTime(r.f, iso, r.timed[0].s, r.timed[0].e) : '';
      tips.push(`${tgFirst(r.f.fid)} busy ${span}${their ? ' (' + their + ')' : ''}`);
    }
    box.appendChild(line);
  }
  box.style.setProperty('--tg-mb-n', String(rows.length));
  cell.classList.add('tg-mb-on');
  cell.style.setProperty('--tg-mb-n', String(rows.length));
  box.title = tips.join('\n');
  cell.appendChild(box);
}

/* ---------- the week timeline (31-views-timeline.js) ---------- */
function _tgTimelineView(view) { const v = String(view || ''); return ['today', 'tomorrow', 'week', 'all', 'no-date'].includes(v) || v.startsWith('day:'); }
function togetherTimelineLane(el, day, view) {
  if (!tgOn() || !tgHas() || !_tgTimelineView(view)) return;
  const me = tgMe();
  for (const sp of tgSpaces()) for (const it of sp.value.items || []) {
    if (it.status === 'done' || it.due !== day) continue;
    const mine = tgIsMine(it), theirs = it.assignee && it.assignee !== me;
    if (!mine && !(theirs && tgPref('layers'))) continue;
    const c = tgEl('button', 'tg-tl' + (mine ? ' is-mine' : ' is-faint')); c.type = 'button';
    c.insertAdjacentHTML('beforeend', icon(mine ? 'users' : 'eye', 'i-xs'));
    c.appendChild(tgEl('span', '', it.title || '(no title)'));
    c.title = `${mine ? 'Shared with you' : tgName(it.assignee, sp.value)} · ${tgSpaceName(sp)}`;
    c.onclick = (e) => { e.stopPropagation(); tgOpenItem(sp.id, it.id); };
    el.appendChild(c);
  }
  for (const f of tgTaskLayers()) for (const t of f.items) {
    if (t.due !== day) continue;
    const c = tgEl('button', 'tg-tl is-faint'); c.type = 'button';
    c.insertAdjacentHTML('beforeend', icon('eye', 'i-xs'));
    c.appendChild(tgEl('span', '', t.title || '(a task)'));
    c.title = `${tgName(f.fid)} shares this with you`;
    c.onclick = (e) => { e.stopPropagation(); _tgOpenFriend(f.fid); };
    el.appendChild(c);
  }
}
function togetherTimelineTime(el, day, base, g) {
  if (!tgOn() || !tgHas() || !tgPref('calendar')) return;
  for (const f of tgBusyLayers()) {
    for (const b of tgBusyOn(f, day)) {
      const s = Math.max(b.s, base), e = Math.min(b.e, g.h1 * 60);
      if (e <= s) continue;
      const x = tgEl('div', 'tg-busy');
      x.style.top = ((s - base) * g.ppm) + 'px'; x.style.height = Math.max(8, (e - s) * g.ppm - 1) + 'px';
      x.title = tgBusyTip(f, day, b);
      x.setAttribute('aria-hidden', 'true');
      x.appendChild(tgEl('span', '', tgFirst(f.fid)));
      _tgTheirHint(x, f, day, b, (e - s) * g.ppm);
      el.appendChild(x);
    }
  }
}

/** The small "their time" line inside a busy block tall enough for it. */
function _tgTheirHint(x, f, day, b, px) {
  if (px < 30) return;
  const t = tgTheirTime(f, day, b.s, b.e);
  if (t) x.appendChild(tgEl('small', 'tg-busy-tz', t));
}

/* ---------- the calendar (42-calendar-views.js) ---------- */
function togetherCalColumn(col, iso, hourPx) {
  if (!tgOn() || !tgHas() || !tgPref('calendar')) return;
  for (const f of tgBusyLayers()) {
    for (const b of tgBusyOn(f, iso)) {
      const x = tgEl('div', 'tg-busy tg-busy-cal');
      x.style.top = (b.s / 60 * hourPx + 1) + 'px'; x.style.height = Math.max(8, (b.e - b.s) / 60 * hourPx - 2) + 'px';
      x.title = tgBusyTip(f, iso, b);
      x.setAttribute('aria-hidden', 'true');
      x.appendChild(tgEl('span', '', tgFirst(f.fid)));
      _tgTheirHint(x, f, iso, b, (b.e - b.s) / 60 * hourPx);
      col.appendChild(x);
    }
  }
}
function togetherCalDueCell(cell, iso) {
  if (!tgOn() || !tgHas()) return;
  const me = tgMe();
  for (const sp of tgSpaces()) {
    for (const it of sp.value.items || []) {
      if (it.status === 'done' || it.due !== iso) continue;
      const mine = tgIsMine(it), theirs = it.assignee && it.assignee !== me;
      if (!mine && !(theirs && tgPref('layers'))) continue;
      const c = tgEl('button', 'tg-tl' + (mine ? ' is-mine' : ' is-faint')); c.type = 'button';
      c.appendChild(tgEl('span', '', it.title || '(no title)'));
      c.title = `${mine ? 'Shared with you' : tgName(it.assignee, sp.value)} · ${tgSpaceName(sp)}`;
      c.onclick = (e) => { e.stopPropagation(); tgOpenItem(sp.id, it.id); };
      cell.appendChild(c);
    }
    for (const cd of sp.value.countdowns || []) {
      if (cd.date !== iso) continue;
      const c = tgEl('button', 'tg-tl is-cd'); c.type = 'button';
      c.insertAdjacentHTML('beforeend', icon('hourglass', 'i-xs'));
      c.appendChild(tgEl('span', '', cd.title || 'Countdown'));
      c.title = `${tgSpaceName(sp)} countdown`;
      c.onclick = (e) => { e.stopPropagation(); setView(`together:${sp.id}:dates`); };
      cell.appendChild(c);
    }
  }
  for (const f of tgTaskLayers()) for (const t of f.items) {
    if (t.due !== iso) continue;
    const c = tgEl('button', 'tg-tl is-faint'); c.type = 'button';
    c.appendChild(tgEl('span', '', t.title || '(a task)'));
    c.title = `${tgName(f.fid)} shares this with you`;
    c.onclick = (e) => { e.stopPropagation(); _tgOpenFriend(f.fid); };
    cell.appendChild(c);
  }
}

/* ---------- Find a time ----------
   Free times for you and the friends picked, from your calendar and the busy times each friend
   shares (on your clock). Your choice of days (weekdays, weekends, any) and time of day (working
   hours, daytime, evenings) is remembered. A friend whose time zone is known is never offered a
   time in the middle of their night (before 07:00 or after 23:00 their time), and a time outside
   their usual hours ranks lower; so does a day when you or they have an all-day event. The best
   three (on different days where possible) come first; "Propose these 3" puts them on the
   space's Plan together board in one click, and when everyone in the space can make one of them
   it is booked and goes in each person's own calendar (5plan). */
const TG_FT_TIMES = { work: 'Working hours', day: 'Daytime', eve: 'Evenings' };
const TG_FT_DAYS = { weekdays: 'Weekdays', weekends: 'Weekends', any: 'Any day' };
const TG_FT_LENGTHS = [[30, '30 min'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours'], [180, '3 hours'], [240, 'Half a day']];
const TG_FT_RANGES = [[3, 'Next 3 days'], [7, 'Next week'], [14, 'Next two weeks'], [30, 'Next month']];
/** Your time-of-day window in minutes: [from, to]. */
function _tgFtWindow(pref) {
  if (pref === 'eve') return [17 * 60, 22 * 60];
  if (pref === 'day') return [9 * 60, 21 * 60];
  const wh = typeof homeWorkHours === 'function' ? homeWorkHours() : null;
  const a = wh && Number.isFinite(wh.startMin) ? wh.startMin : 9 * 60, b = wh && Number.isFinite(wh.endMin) ? wh.endMin : 17 * 60;
  return b > a ? [a, b] : [9 * 60, 17 * 60];
}
/** The same window, a little wider, on a friend's own clock (outside it ranks lower). */
function _tgFtTheirWindow(pref) { return pref === 'eve' ? [16 * 60, 22 * 60 + 30] : pref === 'day' ? [8 * 60, 22 * 60] : [8 * 60, 18 * 60 + 30]; }
function _tgIsWorkDay(iso) {
  if (typeof homeWorkDay === 'function') { try { return !!homeWorkDay(iso); } catch (e) { /* the usual week */ } }
  const d = new Date(iso + 'T12:00:00Z').getUTCDay(); // clock-ok: a wall date's weekday
  return d >= 1 && d <= 5;
}
/** Your own day from your calendar: {busy: [{s, e}], allDay: [title], soft: [title]} (declined events are already out). */
function _tgMyDay(iso) {
  const out = { busy: [], allDay: [], soft: [] };
  let evs = [];
  try { evs = typeof homeCalEvents === 'function' ? homeCalEvents(iso) : []; } catch (e) { evs = []; }
  for (const e of evs) {
    if (!e) continue;
    // bg: a timed free / holiday / out-of-office block (12-home-cal.js): it may matter, so it only ranks lower
    if (e.bg) { out.soft.push(String(e.title || '')); continue; }
    if (e.allDay) { out.allDay.push(String(e.title || '')); continue; }
    if (Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start) out.busy.push({ s: e.start, e: e.end });
  }
  return out;
}
/**
 * Every free time that fits: [{day, s, e, t0, t1, score, notes: [text], their: [text]}] (lower score is better).
 * o: {fids, minutes, days, dayPref: weekdays|weekends|any, timePref: work|day|eve}.
 */
function tgFindSlots(o) {
  o = o || {};
  const fids = (o.fids || []).filter(Boolean), minutes = Math.max(15, Math.min(600, Number(o.minutes) || 60)), days = Math.max(1, Math.min(31, Number(o.days) || 7));
  const dayPref = TG_FT_DAYS[o.dayPref] ? o.dayPref : 'weekdays', timePref = TG_FT_TIMES[o.timePref] ? o.timePref : 'work';
  const today = todayStr(), nowMin = _tgMinOf(Clock.now()), here = Clock.zone();
  const layers = tgBusyLayers().filter(f => fids.includes(f.fid));
  const byF = new Map(layers.map(f => [f.fid, f]));
  const [w0, w1] = _tgFtWindow(timePref), [x0, x1] = _tgFtTheirWindow(timePref);
  const out = [];
  for (let i = 0; i < days && out.length < 600; i++) {
    const d = Clock.addDays(today, i);
    const work = _tgIsWorkDay(d);
    if ((dayPref === 'weekdays' && !work) || (dayPref === 'weekends' && work)) continue;
    const me = _tgMyDay(d);
    const busy = me.busy.slice();
    const dayNotes = [];
    if (me.allDay.length) dayNotes.push(`you have “${me.allDay[0].slice(0, 40) || 'an all-day event'}” that day`);
    else if (me.soft.length) dayNotes.push(`you have “${me.soft[0].slice(0, 40) || 'something'}” marked that day`);
    for (const f of layers) {
      busy.push(...tgBusyOn(f, d));
      if (f.items.some(b => b.allDay && b.day === d)) dayNotes.push(`${tgFirst(f.fid)} has an all-day event`);
    }
    let start = w0;
    if (d === today) start = Math.max(start, Math.ceil((nowMin + 30) / 30) * 30);
    for (let t = start; t + minutes <= w1; t += 30) {
      if (busy.some(b => b.s < t + minutes && b.e > t)) continue;
      const t0 = Clock.at(d, t), t1 = t0 + minutes * 60000;
      let score = i * 6 + (t % 60 ? 2 : 0) + dayNotes.length * 30, night = false;
      const notes = dayNotes.slice(), their = [];
      for (const fid of fids) {
        const f = byF.get(fid);
        if (!f || !f.tz) continue;
        let a, b;
        try { if (Clock.offset(t0, f.tz) === Clock.offset(t0, here)) continue; a = Clock.parts(t0, f.tz); b = Clock.parts(t1 - 60000, f.tz); } catch (x) { continue; }
        const am = a.h * 60 + a.mi, bm = b.h * 60 + b.mi + 1;
        if (a.iso !== b.iso || am < 7 * 60 || bm > 23 * 60) { night = true; break; }   // the middle of their night: never offered
        const wd = a.iso !== d ? ' ' + Clock.fmtDate(t0, { zone: f.tz, weekday: 'short' }) : '';
        their.push(`${Clock.fmtTime(t0, { zone: f.tz })}–${Clock.fmtTime(t1, { zone: f.tz })}${wd} for ${tgFirst(fid)}`);
        if (am < x0 || bm > x1) { score += 25; notes.push(`early or late for ${tgFirst(fid)}`); }
        if (dayPref === 'weekdays' && (a.dow === 0 || a.dow === 6)) { score += 10; notes.push(`a weekend day for ${tgFirst(fid)}`); }
      }
      if (night) continue;
      out.push({ day: d, s: t, e: t + minutes, t0, t1, score, notes, their });
    }
  }
  return out;
}
/** The best n, on different days where possible, then at least two hours apart; in time order. */
function tgBestSlots(cands, n) {
  const sorted = cands.slice().sort((a, b) => a.score - b.score || a.t0 - b.t0);
  const pick = [];
  for (const c of sorted) { if (pick.length >= n) break; if (!pick.some(p => p.day === c.day)) pick.push(c); }
  for (const c of sorted) { if (pick.length >= n) break; if (!pick.includes(c) && pick.every(p => Math.abs(p.t0 - c.t0) >= 2 * 3600000)) pick.push(c); }
  return pick.sort((a, b) => a.t0 - b.t0);
}
/** Kept for older callers: free slots with the old switches (workOnly: weekdays in working hours, else any day, daytime). */
function tgFreeSlots(fids, minutes, days, workOnly) {
  return tgFindSlots({ fids, minutes, days, dayPref: workOnly ? 'weekdays' : 'any', timePref: workOnly ? 'work' : 'day' }).sort((a, b) => a.t0 - b.t0).slice(0, 40);
}
function _tgHM(min) { const h = Math.floor(min / 60) % 24, m = min % 60; const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; return typeof _calTimeLabel === 'function' ? _calTimeLabel(hm) : hm; }
function tgSlotLabel(sl) {
  if (Number.isFinite(sl.t0) && Number.isFinite(sl.t1)) return tgWhenLabel(sl.t0, sl.t1);
  return `${_dayLabel(sl.day, { weekday: 'short', day: 'numeric', month: 'short' })} · ${_tgHM(sl.s)}–${_tgHM(sl.e)}`;
}
/** An absolute time on your clock: 'Tue 3 Nov · 14:00–15:00'. */
function tgWhenLabel(t0, t1) {
  const d = Clock.parts(t0).iso;
  return `${_dayLabel(d, { weekday: 'short', day: 'numeric', month: 'short' })} · ${Clock.fmtTime(t0)}–${Clock.fmtTime(t1)}`;
}
/** The friends' busy times now (a promise): loads them when they are missing or old. */
function tgBusyReady(force) {
  tgBusyLayers(force);
  return new Promise((resolve) => {
    let n = 0;
    const wait = () => { if (!_tgLayers.loading || ++n > 60) resolve(_tgLayers.busy || []); else setTimeout(wait, 250); };
    wait();
  });
}
function _tgFtPrefs() {
  const p = _tgSt().prefs.findTime;
  const o = p && typeof p === 'object' ? p : {};
  return {
    minutes: TG_FT_LENGTHS.some(x => x[0] === o.minutes) ? o.minutes : 60,
    days: TG_FT_RANGES.some(x => x[0] === o.days) ? o.days : 14,
    dayPref: TG_FT_DAYS[o.dayPref] ? o.dayPref : 'weekdays',
    timePref: TG_FT_TIMES[o.timePref] ? o.timePref : 'work',
  };
}
function _tgSelect(label, options, value, onChange) {
  const sel = document.createElement('select'); sel.className = 'control control-sm'; sel.setAttribute('aria-label', label);
  for (const [v, l] of options) { const op = new Option(l, String(v)); op.selected = String(v) === String(value); sel.appendChild(op); }
  sel.onchange = () => onChange(sel.value);
  return sel;
}
/**
 * Find a time. o: {space?: a space id (its members, and where the times go), with?: [friendId]}.
 * Waits have Cancel (Close) and Try again; a friend who shares no busy times, or whose copy is old,
 * gets a calm line; nothing is sent until you press Propose.
 */
function tgFindTimeDialog(o) {
  o = o || {};
  if (!tgChannel()) { toast('Add a friend in Friends first, then you can find a time together.', { icon: 'users', action: typeof sectionFor === 'function' && sectionFor('friends') ? { label: 'Open Friends', run: () => setView('friends') } : null }); return; }
  const sp0 = o.space ? tgSpace(o.space) : null, v0 = sp0 ? sp0.value : null;
  const chosen = new Set(v0 ? tgMembers(v0).filter(f => f !== tgMe()) : (Array.isArray(o.with) ? o.with : []).filter(f => tgFriends().some(x => x.id === f)));
  const st = Object.assign(_tgFtPrefs(), { what: '', target: o.space || '', more: false, slow: false });
  const save = () => { _tgSt().prefs.findTime = { minutes: st.minutes, days: st.days, dayPref: st.dayPref, timePref: st.timePref }; saveUI(); };
  let out = null, closeDlg = null, gen = 0;
  const targets = () => (o.space && sp0 ? [sp0] : tgSpaces().filter(s => [...chosen].every(f => tgIsMember(s.value, f))));
  const paint = () => {
    if (!out || !out.isConnected) return;
    out.innerHTML = '';
    const fids = [...chosen];
    if (!fids.length) { out.appendChild(tgEl('p', 'muted tg-sm', 'Pick who to meet: their busy times (when they share them) and yours are both checked.')); return; }
    if (_tgLayers.loading && st.slow) {
      const w = tgEl('div', 'tg-calm tg-sm tg-wait');
      w.appendChild(tgEl('span', '', "Friends' busy times are taking a while, so these times only check your calendar."));
      w.appendChild(tgBtn('Try again', { ghost: true, icon: 'refresh-cw', run: () => { st.slow = false; paint(); tgBusyReady(false).then(() => { if (_tgLayers.loading) st.slow = true; paint(); }); } }));
      out.appendChild(w);
    } else if (_tgLayers.loading) {
      const w = tgEl('div', 'tg-calm tg-sm tg-wait');
      w.insertAdjacentHTML('beforeend', icon('loader-circle', 'i-sm spin'));
      w.appendChild(tgEl('span', '', 'Getting busy times…'));
      w.appendChild(tgBtn('Cancel', { ghost: true, run: () => { gen++; if (closeDlg) closeDlg(); } }));
      out.appendChild(w);
      return;
    }
    if (_tgLayers.err) {
      const e = tgEl('div', 'tg-err tg-sm');
      e.appendChild(tgEl('span', '', `Friends' busy times could not be read (${_tgLayers.err}). Showing times from your calendar only.`));
      e.appendChild(tgBtn('Try again', { icon: 'refresh-cw', run: () => { tgBusyReady(true).then(() => paint()); paint(); } }));
      out.appendChild(e);
    }
    const layers = new Map(tgBusyLayers().map(f => [f.fid, f]));
    const missing = _tgLayers.loading ? [] : fids.filter(f => !layers.has(f) || !layers.get(f).items.length);
    if (missing.length) out.appendChild(tgEl('p', 'tg-calm tg-sm', `${missing.map(f => tgFirst(f)).join(', ')} ${missing.length === 1 ? "doesn't" : "don't"} share busy times with you, so only your calendar counts for them. Propose a few times and let them pick.`));
    for (const f of fids) {
      const L = layers.get(f);
      if (L && L.at && Date.now() - L.at > 36 * 3600000) out.appendChild(tgEl('p', 'muted tg-sm', `${tgFirst(f)}'s busy times are from ${tgAgo(L.at)} (their app has not sent newer ones), so they may have changed.`));
    }
    const all = tgFindSlots({ fids, minutes: st.minutes, days: st.days, dayPref: st.dayPref, timePref: st.timePref });
    const best = tgBestSlots(all, 3);
    if (!best.length) {
      const e = tgEl('div', 'tg-empty-inline');
      e.appendChild(tgEl('p', 'muted', 'No free time that suits everyone in this range.'));
      const fix = tgEl('div', 'tg-bar');
      if (st.days < 30) fix.appendChild(tgBtn('Look further ahead', { icon: 'calendar-range', run: () => { st.days = st.days < 14 ? 14 : 30; save(); rerenderControls(); paint(); } }));
      if (st.dayPref !== 'any') fix.appendChild(tgBtn('Any day', { run: () => { st.dayPref = 'any'; save(); rerenderControls(); paint(); } }));
      if (st.timePref === 'work') fix.appendChild(tgBtn('Daytime, not just working hours', { run: () => { st.timePref = 'day'; save(); rerenderControls(); paint(); } }));
      e.appendChild(fix);
      out.appendChild(e);
      return;
    }
    out.appendChild(tgEl('div', 'field-label', best.length === 1 ? 'The best time' : `The best ${best.length} times`));
    const slotRow = (sl) => {
      const r = tgEl('div', 'tg-row tg-slot');
      r.insertAdjacentHTML('beforeend', icon('clock'));
      const t = tgEl('div', 'tg-slot-t');
      t.appendChild(tgEl('b', '', tgSlotLabel(sl)));
      const sub = [...sl.their, ...sl.notes].join(' · ');
      if (sub) t.appendChild(tgEl('span', 'muted tg-sm', sub));
      r.appendChild(t);
      r.appendChild(tgIconBtn('copy', 'Copy this time', () => { try { navigator.clipboard.writeText(tgSlotLabel(sl)).then(() => toast('Copied', { kind: 'ok' }), () => toast(tgSlotLabel(sl))); } catch (e) { toast(tgSlotLabel(sl)); } }));
      return r;
    };
    for (const sl of best) out.appendChild(slotRow(sl));
    // Where they go: the space (one click), or a new space with them.
    const sps = targets();
    if (st.target && !sps.some(s => s.id === st.target)) st.target = '';
    if (!st.target && sps.length) st.target = sps[0].id;
    const go = tgEl('div', 'tg-ft-go');
    const what = tgInput('ft:what', { placeholder: 'What for? (Coffee, a call, dinner…)', max: 120, value: st.what, aria: 'What for' });
    what.addEventListener('input', () => { st.what = String(what.value || '').slice(0, 120); });
    go.appendChild(what);
    if (sps.length > 1 && !o.space) go.appendChild(_tgSelect('Which space', sps.map(s => [s.id, tgSpaceName(s)]), st.target, (val) => { st.target = val; }));
    const propose = async () => {
      const w = String(what.value || st.what || '').trim().slice(0, 120);
      let id = st.target;
      if (!id) {
        const names = fids.map(f => tgFirst(f));
        id = await tgCreateSpace({ name: `Plans with ${names.join(', ')}`.slice(0, 80), kind: fids.length === 1 ? 'pair' : 'party', icon: 'calendar-heart', members: fids });
        if (!id) return;
      }
      if (typeof tgProposeSlots !== 'function') return;
      const ok = await tgProposeSlots(id, best, w);
      if (ok) { if (closeDlg) closeDlg(); if (state.view !== `together:${id}:plan`) setView(`together:${id}:plan`); }
    };
    const label = best.length === 1 ? 'Propose it' : `Propose these ${best.length}`;
    go.appendChild(tgBtn(sps.length ? label : `${label} in a new space`, { primary: true, icon: 'send', run: propose }));
    out.appendChild(go);
    out.appendChild(tgEl('p', 'muted tg-sm', sps.length
      ? 'They go on Plan together for everyone to say if they can make it. When everyone can make one, it goes in each person’s calendar.'
      : 'You share no space with everyone picked: this makes one and invites them. They see the times once they join.'));
    // More times, folded.
    const rest = all.filter(c => !best.includes(c)).sort((a, b) => a.score - b.score || a.t0 - b.t0).slice(0, 6).sort((a, b) => a.t0 - b.t0);
    if (rest.length) {
      const d = tgEl('details', 'tg-ft-more');
      if (st.more) d.open = true;
      d.addEventListener('toggle', () => { st.more = d.open; });
      d.appendChild(tgEl('summary', 'muted tg-sm', `Other free times (${rest.length})`));
      for (const sl of rest) {
        const r = slotRow(sl);
        r.appendChild(tgBtn('Use instead', { ghost: true, run: () => { const worst = best.reduce((m, x) => (x.score > m.score ? x : m), best[0]); best.splice(best.indexOf(worst), 1, sl); best.sort((a, b) => a.t0 - b.t0); repaintBest(best); } }));
        d.appendChild(r);
      }
      out.appendChild(d);
    }
    function repaintBest(list) {
      const rows = [...out.querySelectorAll(':scope > .tg-slot')];
      rows.forEach((r, i) => { if (list[i]) r.replaceWith(slotRow(list[i])); });
    }
  };
  let controls = null;
  const rerenderControls = () => { if (controls && controls.isConnected) { const n = buildControls(); controls.replaceWith(n); controls = n; } };
  const buildControls = () => {
    const row = tgEl('div', 'tg-bar tg-ft-bar');
    row.append(
      _tgSelect('How long', TG_FT_LENGTHS, st.minutes, (x) => { st.minutes = Number(x); save(); paint(); }),
      _tgSelect('Within', TG_FT_RANGES, st.days, (x) => { st.days = Number(x); save(); paint(); }),
      _tgSelect('Which days', Object.entries(TG_FT_DAYS), st.dayPref, (x) => { st.dayPref = x; if (x === 'weekends' && st.timePref === 'work') st.timePref = 'day'; save(); rerenderControls(); paint(); }),
      _tgSelect('Time of day', Object.entries(TG_FT_TIMES), st.timePref, (x) => { st.timePref = x; save(); paint(); }),
    );
    return row;
  };
  openDialog({
    title: 'Find a time', width: 580,
    body: (el, close) => {
      closeDlg = close;
      if (!v0) { el.appendChild(tgEl('div', 'field-label', 'With')); tgFriendPicker(el, chosen, { onChange: paint }); }
      else el.appendChild(tgEl('p', 'muted tg-sm', `With everyone in ${tgSpaceName(sp0)}.`));
      controls = buildControls();
      el.appendChild(controls);
      out = tgEl('div', 'tg-slots');
      el.appendChild(out);
      const my = ++gen;
      const ready = tgBusyReady(false);   // starts the load first, so the first paint shows the wait, not stale times
      paint();
      ready.then(() => { if (my !== gen) return; if (_tgLayers.loading) st.slow = true; paint(); });
    },
    onClose: () => { gen++; },
    actions: [{ label: 'Close' }],
  });
}
/** Kept for older callers: one time on the space's board (now through tgProposeSlots). */
function tgProposeSlot(spaceId, sl, minutes) {
  const t0 = Number.isFinite(sl.t0) ? sl.t0 : Clock.at(sl.day, sl.s);
  const t1 = Number.isFinite(sl.t1) ? sl.t1 : t0 + (Number(minutes) || (sl.e - sl.s) || 60) * 60000;
  return typeof tgProposeSlots === 'function' ? tgProposeSlots(spaceId, [{ t0, t1 }], '') : Promise.resolve(false);
}
