/* ============================================================
   ACHIEVEMENTS, B2 the Work shelf: the facts (docs/dev/ACHIEVEMENTS_500.md 1.7, 3.10 to 3.14). PURE.
   Finishing, deep work, capture, waiting and craft. Real finishes only (71-ach-src-0kit.js); focus
   time comes from the timer's own sessions (the same ones the garden and XP use), never a click.
   ============================================================ */
registerAchFactSource('b2-work', (c, o) => {
  const P = achPass(c), today = c.today;
  // ---- finishing ----
  let old30 = 0, old180 = 0, old365 = 0, subsDone = 0, neverMoved = 0, unblocked = 0, chain3 = 0, blockedSet = 0, blockedCleared = 0, oneSitting = 0;
  let capN = 0, capDone = 0, capSame = 0, fromTemplate = 0, withContext = 0;
  const subsDay = {};
  for (const r of P.fin) {
    const { t, e, acts } = r;
    if (r.created) {
      const age = c.between(r.created, e.day);
      if (age >= 30) old30++; if (age >= 180) old180++; if (age >= 365) old365++;
    }
    const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
    let ticked = 0, firstTick = 0;
    for (const s of subs) {
      if (!s || !s.done || !(Number(s.ts) > 0)) continue;
      ticked++;
      if (ticked <= 12) o.add('d.subtasks', c.day(s.ts));
      if (!firstTick || s.ts < firstTick) firstTick = s.ts;
    }
    subsDone += Math.min(ticked, 12);
    if (subs.length >= 3 && ticked === subs.length && firstTick && e.ts - firstTick >= 0 && e.ts - firstTick <= 3600000) oneSitting++;
    let moved = 0, doing = false;
    for (const a of acts) {
      if (a.type === 'date' && a.from) moved++;
      if (a.type === 'status' && a.to === 'doing' && a.ts <= e.ts) doing = true;
    }
    if (doing) o.add('d.doingDone', e.day);
    if (r.due && e.day <= r.due && !moved) neverMoved++;
    const notes = c.data.notes && c.data.notes[r.id];
    if (Array.isArray(notes) && notes.length) o.add('d.doneWithNotes', e.day);
    if (Array.isArray(t.contexts) && t.contexts.length) withContext++;
    if (t.createdVia === 'capture') { capDone++; if (r.created === e.day) capSame++; }
    if (t.createdVia === 'template') fromTemplate++;
    // blockers
    const bl = Array.isArray(t.blockedBy) ? t.blockedBy : [];
    const hadBlock = bl.length || acts.some(a => a.type === 'blocked');
    if (hadBlock) blockedSet++;
    if (bl.length) {
      const fins = bl.map(id => P.finBy.get(id) || (c.isDone(id) ? { ts: 0, day: '' } : null));
      if (fins.every(Boolean)) {
        const lastB = Math.max(...fins.map(f => f.ts || 0)), lastDay = fins.map(f => f.day).sort().pop();
        if (lastB && lastB <= e.ts) { blockedCleared++; if (lastDay === e.day) unblocked++; }
      }
    }
  }
  for (const r of P.fin) {   // chains of three: C blocked by B, B blocked by A, all finished
    const bl = Array.isArray(r.t.blockedBy) ? r.t.blockedBy : [];
    if (bl.some(b => { const rb = P.finBy.get(b); return rb && Array.isArray(rb.t.blockedBy) && rb.t.blockedBy.some(a => P.finBy.has(a)); })) chain3++;
  }
  o.set('tasks.oldDone30', old30); o.set('tasks.oldDone180', old180); o.set('tasks.oldDone365', old365);
  o.set('subtasks.done', subsDone); o.set('tasks.neverMoved', neverMoved); o.set('tasks.unblockedSameDay', unblocked);
  o.set('tasks.chain3', chain3); o.set('blocked.set', blockedSet); o.set('blocked.cleared', blockedCleared); o.set('tasks.oneSitting', oneSitting);
  o.set('capture.done', capDone); o.set('capture.sameDayDone', capSame); o.set('tasks.fromTemplate', fromTemplate); o.set('tasks.withContext', withContext);
  // captured thoughts: tasks that began as a quick capture and were kept (finished for real, or still open after a day)
  for (const t of c.tasks.values()) {
    if (t.createdVia !== 'capture' || !(Number(t.createdAt) > 0) || c.repeats(t)) continue;
    const alive = !c.isDone(t.id) || P.finBy.has(t.id);
    if (!alive) continue;
    capN++; o.add('d.captured', c.day(t.createdAt));
  }
  o.set('capture.n', capN);
  // ---- focus ----
  const sess = c.sessions.filter(s => s && s.ms > 0).slice().sort((a, b) => (a.s || 0) - (b.s || 0));
  let s25 = 0, s50 = 0, before8 = 0, breaks = 0, bigBreak = 0, stopDone = 0;
  const perTask = new Map(), kindsWeek = new Map(), dayMin = {};
  for (let i = 0; i < sess.length; i++) {
    const s = sess[i], min = s.ms / 60000, start = s.s || 0, day = s.d || (start ? c.day(start) : '');
    if (min >= 25) { s25++; if (day) o.add('d.s25', day); }
    if (min >= 50) s50++;
    if (start && (Number(c.part(start).h) || 0) < 8) before8++;
    if (start && day && (Number(c.part(start).h) || 0) < 12) o.add('d.focusAM', day, Math.floor(min));
    if (day) dayMin[day] = (dayMin[day] || 0) + min;
    const nx = sess[i + 1], end = s.e || (start + s.ms);
    if (nx && nx.s && end && (nx.d || c.day(nx.s)) === day) {
      const gap = (nx.s - end) / 60000;
      if (gap >= 5 && gap <= 20) breaks++;
      if (min >= 90 && gap >= 15) bigBreak++;
    }
    if (s.t) {
      perTask.set(s.t, (perTask.get(s.t) || 0) + min);
      const r = P.finBy.get(s.t);
      if (r && end && r.ts >= end && r.ts - end <= 120000) stopDone++;
      const t = c.tasks.get(s.t);
      if (t && day) { const k = achTaskKind(c, t); if (k) { const w = c.weekOf(day); if (!kindsWeek.has(w)) kindsWeek.set(w, new Set()); kindsWeek.get(w).add(k); } }
    }
  }
  for (const [d, m] of Object.entries(dayMin)) if (m >= 60) o.put('d.focusHourDay', d, 1);
  for (const [w, set] of kindsWeek) o.put('w.focusKinds', w, set.size);
  let p1Task2h = 0, maxTask = 0, siege = 0;
  const bosses = new Set(); for (const a of Object.values(c.g.awards)) if (a && a.k === 'boss' && a.t) bosses.add(a.t);
  for (const [tid, m] of perTask) {
    if (m > maxTask) maxTask = m;
    const t = c.tasks.get(tid);
    if (t && t.priority === 'p1' && m >= 120) p1Task2h++;
    if (bosses.has(tid) && m >= 180) siege++;
  }
  const monthsOf = {};
  for (const [d, m] of Object.entries(dayMin)) { const ym = d.slice(0, 7); monthsOf[ym] = (monthsOf[ym] || 0) + m; }
  const perYear = {}; for (const [ym, m] of Object.entries(monthsOf)) if (m >= 1500) perYear[ym.slice(0, 4)] = (perYear[ym.slice(0, 4)] || 0) + 1;
  o.set('focus.s25', s25); o.set('focus.s50', s50); o.set('focus.before8', before8); o.set('focus.breaks', breaks); o.set('focus.bigBreak', bigBreak);
  o.set('focus.stopDone', stopDone); o.set('focus.p1Task2h', p1Task2h); o.set('focus.bossSiege', siege); o.set('focus.taskMaxMin', Math.floor(maxTask));
  o.set('focus.monthsInYear', Math.max(0, ...Object.values(perYear)));
  // ---- waiting and handing off ----
  let wSet = 0, arrived = 0, nudged = 0, nudgeWorked = 0, within1 = 0, long60 = 0;
  const waitedOn = new Set(), nudgeSeen = new Set();
  const cutoff = c.add(today, -2);
  for (const t of c.tasks.values()) {
    if (c.repeats(t)) continue;
    const acts = _achAct(c, t.id).filter(a => a && a.type === 'waiting' && typeof a.text === 'string').slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (!acts.length) continue;
    const r = P.finBy.get(t.id);
    let started = 0, lastNudge = 0, any = false, worked = false;
    for (const a of acts) {
      if (a.ts == null) continue;
      if (/^Waiting on /.test(a.text)) { started = a.ts; any = true; const who = a.text.slice(11); if (who && who !== 'someone') waitedOn.add(who); }
      else if (/^No longer waiting/.test(a.text)) started = 0;
      else if (/^Followed up/.test(a.text)) { lastNudge = a.ts; const k = t.id + '|' + c.day(a.ts); if (!nudgeSeen.has(k)) { nudgeSeen.add(k); nudged++; } }
    }
    if (any && c.day(acts[0].ts) <= cutoff) wSet++;
    if (r && started && started <= r.ts) {
      arrived++;
      const days = c.between(c.day(started), r.day);
      if (days <= 1) within1++; if (days >= 60) long60++;
      if (lastNudge && lastNudge <= r.ts && r.ts - lastNudge <= 3 * 86400000) worked = true;
      if (worked) nudgeWorked++;
    }
  }
  o.set('waiting.set', wSet); o.set('waiting.arrived', arrived); o.set('waiting.nudged', nudged); o.set('waiting.nudgeWorked', nudgeWorked);
  o.set('waiting.within1', within1); o.set('waiting.long60', long60); o.set('waiting.people', waitedOn.size);
  // ---- craft ----
  o.set('smartLists.n', Array.isArray(c.data.smartLists) ? c.data.smartLists.filter(x => x && typeof x.id === 'string').length : 0);
  const lay = c.data.sidebarLayout && typeof c.data.sidebarLayout === 'object' ? c.data.sidebarLayout : {};
  o.set('sidebar.pins', Array.isArray(lay.pins) ? lay.pins.length : 0);
  o.set('templates.n', Array.isArray(c.data.taskTemplates) ? c.data.taskTemplates.length : 0);
  o.set('streams.marked', (Array.isArray(c.data.streams) ? c.data.streams : []).filter(s => s && !s.archived && (s.icon || s.shape)).length);
}, { order: 21 });
