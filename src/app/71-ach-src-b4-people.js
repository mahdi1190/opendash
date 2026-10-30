/* ============================================================
   ACHIEVEMENTS, B4 people, calendar, friends, game and secrets: the facts
   (docs/dev/ACHIEVEMENTS_500.md 1.7, 3.21 to 3.25). PURE. Names stay in memory for the length of one
   pass and are never stored: only counts and day keys come out.
   ============================================================ */
registerAchFactSource('b4-people', (c, o) => {
  const P = achPass(c), today = c.today, data = c.data;
  // ---- people ----
  const people = (Array.isArray(data.people) ? data.people : []).filter(p => p && p.id && !p.self && p.kind !== 'mailbox');
  const byId = new Map(people.map(p => [p.id, p]));
  const touched = new Set(); for (const t of c.tasks.values()) if (Array.isArray(t.people)) for (const id of t.people) touched.add(id);
  o.set('people.n', people.filter(p => touched.has(p.id)).length);
  o.set('people.birthdays', people.filter(p => /^(\d{4}-)?\d\d-\d\d$/.test(String(p.birthday || ''))).length);
  const noteN = (p) => (Array.isArray(p.notes) ? p.notes.length : 0) + (Array.isArray(c.data.peopleNotes && c.data.peopleNotes[p.id]) ? c.data.peopleNotes[p.id].length : 0);
  o.set('people.withNotes', people.filter(p => noteN(p) > 0).length);
  o.set('people.withRole', people.filter(p => String(p.role || '').trim()).length);
  o.set('people.withAvatar', people.filter(p => p.avatarUrl).length);
  const lay = data.sidebarLayout && typeof data.sidebarLayout === 'object' ? data.sidebarLayout : {};
  o.set('people.pinned', people.filter(p => p.pinned).length + (Array.isArray(lay.pins) ? lay.pins.filter(v => /^person:/.test(String(v))).length : 0));
  let bdTasks = 0, group = 0, reconn = 0;
  const lastFor = new Map(), monthsFor = new Map(), perWeek = new Map();
  const fin = P.fin.slice().sort((a, b) => a.ts - b.ts);
  for (const r of fin) {
    const ids = Array.isArray(r.t.people) ? r.t.people : [];
    if (!ids.length) continue;
    if (ids.length >= 4) group++;
    const w = c.weekOf(r.day);
    for (const id of ids) {
      const p = byId.get(id); if (!p) continue;
      if (!perWeek.has(w)) perWeek.set(w, new Set()); perWeek.get(w).add(id);
      const last = lastFor.get(id); if (last && c.between(last, r.day) >= 180) reconn++;
      lastFor.set(id, r.day);
      if (!monthsFor.has(id)) monthsFor.set(id, new Set()); monthsFor.get(id).add(r.day.slice(0, 7));
      const b = String(p.birthday || '').slice(-5);
      if (/^\d\d-\d\d$/.test(b)) {
        for (const dy of [-1, 0, 1]) { const yy = Number(r.day.slice(0, 4)) + dy; if (Math.abs(c.between(`${yy}-${b}`, r.day)) <= 2) { bdTasks++; break; } }
      }
    }
  }
  for (const [w, set] of perWeek) o.put('w.peopleDistinct', w, set.size);
  o.set('people.birthdayTasks', bdTasks); o.set('tasks.people4', group); o.set('people.reconnected', reconn);
  o.set('people.bestMonths', Math.max(0, ...[...monthsFor.values()].map(s => s.size)));
  // ---- calendar and countdowns ----
  let linked = 0;
  for (const m of Object.values(data.eventMeta && typeof data.eventMeta === 'object' ? data.eventMeta : {})) if (m && Array.isArray(m.tasks)) linked += m.tasks.length;
  o.set('cal.linkedTasks', linked);
  o.set('countdowns.reached', (Array.isArray(data.countdowns) ? data.countdowns : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date || '')) && x.date < today).length);
  let wrap = 0, wrapSame = 0;
  for (const r of P.fin) if (r.t.createdVia === 'wrapup') { wrap++; if (r.created === r.day) wrapSame++; }
  for (const t of c.tasks.values()) if (t.createdVia === 'wrapup' && !P.finBy.has(t.id) && !c.isDone(t.id) && Number(t.createdAt) > 0 && c.between(c.day(t.createdAt), today) >= 1) wrap++;
  o.set('tasks.fromWrapup', wrap); o.set('wrapup.sameDayDone', wrapSame);
  // ---- game: awards, bonus, quests ----
  let bonus = 0, bossSame = 0, tq = 0, tr = 0, gh = 0;
  for (const a of Object.values(c.g.awards)) {
    if (!a || typeof a !== 'object') continue;
    if (a.k === 'bonus') bonus++;
    else if (a.k === 'team-quest') tq++; else if (a.k === 'trophy') tr++; else if (a.k === 'goal-hit') gh++;
    else if (a.k === 'boss' && a.t) { const t = c.tasks.get(a.t); if (t && Number(t.createdAt) > 0 && c.day(t.createdAt) === a.d) bossSame++; }
  }
  o.set('game.bonusDone', bonus); o.set('game.bossSameDay', bossSame);
  o.set('awards.team-quest', tq); o.set('awards.trophy', tr); o.set('awards.goal-hit', gh);
  const kinds = new Set();
  for (const [wk, q] of Object.entries(c.g.quests)) {
    const dn = q && typeof q === 'object' && q.done && typeof q.done === 'object' ? q.done : {};
    for (const k of Object.keys(dn)) if (k !== 'all') kinds.add(k.replace(/[0-9]+$/, ''));
    if (dn.all && /^\d{4}-\d{2}-\d{2}$/.test(wk)) o.put('w.questPerfect', wk, 1);
  }
  o.set('game.questKinds', kinds.size);
  // ---- secrets: the clock, and the calendar ----
  let m1111 = 0, midnight = 0; const hours = new Set();
  for (const e of c.entries) {
    if (e.light) continue;
    const p = c.part(e.ts), min = Number(p.min != null ? p.min : (Number(p.h) || 0) * 60 + (Number(p.mi) || 0));
    if (min === 671) m1111++; if (min === 0) midnight++;
    hours.add(Math.floor(min / 60));
  }
  o.set('secret.done1111', m1111); o.set('secret.doneMidnight', midnight); o.set('secret.hoursCovered', hours.size);
  o.set('secret.newYearOpen', Object.keys(c.g.marks['new-year-open'] || {}).length);
}, { order: 23 });
