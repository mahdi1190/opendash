/* ============================================================
   ACHIEVEMENTS, B1 the Plan shelf: the facts (docs/dev/ACHIEVEMENTS_500.md 1.7, 3.5 to 3.9). PURE.
   Planning, priorities, estimating, reviews and tidy lists. Every number is computed from the data
   (so it back-fills), through the shared pass in 71-ach-src-0kit.js, counting REAL finishes only.
   The ticks, counts and marks it also reads are written by the hooks named in 2.1.4.
   ============================================================ */
registerAchFactSource('b1-plan', (c, o) => {
  const P = achPass(c), today = c.today;
  for (const e of c.entries) if (!e.light) o.add('d.realDone', e.day);   // every non-light completion (a repeating tick once a day): volume achievements count these, so junk ticks add nothing
  let planSet = 0, planHits = 0, slotHits = 0, due30 = 0, doneAhead = 0, onTime = 0, p1Week = 0, p1Old = 0, p1PlanHit = 0;
  let prioChanges = 0, estimated = 0, bigEst = 0, bigSplit = 0, moved = 0, restored = 0, somedayDone = 0, somedaySet = 0;
  const aheadDay = {}, plannedFor = {}, plannedDone = {}, slotDay = {};
  const dayAll = {}, dayEst = {}, weekAll = {}, weekEst = {};
  for (const r of P.fin) {
    const { t, e, acts } = r;
    if (r.planTo) {
      planSet++;
      if (r.planTo === e.day) {
        planHits++; if (r.slot) slotHits++;
        if (t.priority === 'p1') p1PlanHit++;
        if (r.planAt && c.day(r.planAt) < r.planTo) o.add('d.planAhead', e.day);
      }
    }
    if (r.slot && r.planTo) o.add('d.slots', r.planTo);
    if (r.due) {
      if (r.created && c.between(r.created, r.due) >= 30) due30++;
      const early = c.between(e.day, r.due);
      if (early >= 0) onTime++;
      if (early >= 2) doneAhead++;
      if (early >= 7 && t.priority === 'p1') p1Week++;
    }
    if (t.priority === 'p1' && r.created && c.between(r.created, e.day) >= 30) p1Old++;
    let pc = 0, mv = 0, rs = 0, someday = Array.isArray(t.tags) && t.tags.includes('someday');
    for (const a of acts) {
      if (a.type === 'priority') pc++;
      else if (a.type === 'date' && a.from && a.to && a.to > a.from && a.reason && String(a.reason).trim()) mv++;
      else if (a.type === 'restored') rs = 1;
      else if (a.type === 'tags' && Array.isArray(a.added) && a.added.includes('someday')) someday = true;
    }
    prioChanges += Math.min(3, pc); moved += Math.min(3, mv); restored += rs; if (someday) somedayDone++;
    if (r.est > 0) {
      estimated++;
      if (r.est >= 180) bigEst++;
      if (r.est >= 120 && Array.isArray(t.subtasks) && t.subtasks.length >= 3) bigSplit++;
    }
    dayAll[e.day] = (dayAll[e.day] || 0) + 1; if (r.est > 0) dayEst[e.day] = (dayEst[e.day] || 0) + 1;
    const wk = c.weekOf(e.day);
    weekAll[wk] = (weekAll[wk] || 0) + 1; if (r.est > 0) weekEst[wk] = (weekEst[wk] || 0) + 1;
  }
  for (const [d, n] of Object.entries(dayAll)) if (dayEst[d] === n) o.put('d.allEstimated', d, n);
  for (const [w, n] of Object.entries(weekAll)) if (weekEst[w] === n) o.put('w.allEst', w, n);
  // d.planClear: 3+ tasks stood planned for a day (their last plan said that day) and every one was finished by its end
  for (const t of c.tasks.values()) {
    if (c.repeats(t)) continue;
    let last = null;
    for (const a of _achAct(c, t.id)) if (a && a.type === 'plan' && (!last || (a.ts || 0) >= (last.ts || 0))) last = a;
    const to = last && last.to; if (!to) continue;
    plannedFor[to] = (plannedFor[to] || 0) + 1;
    const r = P.finBy.get(t.id);
    if (r && r.day <= to) plannedDone[to] = (plannedDone[to] || 0) + 1;
  }
  for (const [d, n] of Object.entries(plannedFor)) if (d < today && n >= 3 && plannedDone[d] === n) o.put('d.planClear', d, 1);
  // the evening review's top three for the next day, finished on that day
  const top3 = {};
  for (const r of Array.isArray(c.data.reviews) ? c.data.reviews : []) {
    if (!r || r.kind !== 'evening' || !Array.isArray(r.top3) || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) continue;
    const next = c.add(r.date, 1);
    top3[next] = Array.from(new Set((top3[next] || []).concat(r.top3.map(String))));
  }
  const doneOn = new Map();
  for (const e of c.entries) { const k = e.day; if (!doneOn.has(k)) doneOn.set(k, new Set()); doneOn.get(k).add(e.id); }
  for (const [d, ids] of Object.entries(top3)) { const s = doneOn.get(d); if (!s) continue; const n = ids.filter(id => s.has(id)).length; if (n) o.put('d.top3Done', d, n); }
  // priorities: the day's first completion was a high-priority task; every high-priority task due that day was finished
  const first = new Map();
  for (const e of c.entries) if (!first.has(e.day)) first.set(e.day, e);
  for (const [d, e] of first) { const t = c.tasks.get(e.id); if (t && t.priority === 'p1' && !e.light) o.put('d.p1First', d, 1); }
  const p1Due = {}, p1DueDone = {};
  for (const t of c.tasks.values()) {
    if (t.priority !== 'p1' || c.repeats(t) || !t.dueDate || _achIsWont(c, t)) continue;
    p1Due[t.dueDate] = (p1Due[t.dueDate] || 0) + 1;
    const r = P.finBy.get(t.id); if (r && r.day <= t.dueDate) p1DueDone[t.dueDate] = (p1DueDone[t.dueDate] || 0) + 1;
  }
  for (const [d, n] of Object.entries(p1Due)) if (d <= today && p1DueDone[d] === n) o.put('d.p1DueClear', d, 1);
  let bossP1 = 0;
  for (const a of Object.values(c.g.awards)) if (a && a.k === 'boss') { const t = c.tasks.get(a.t); if (t && t.priority === 'p1') bossP1++; }
  o.set('game.bossP1', bossP1);
  // estimates against the focus timer
  let timed = 0, close = 0, under = 0, exact = 0, estMin = 0, actMin = 0;
  const kinds = new Map();
  for (const r of P.fin) {
    if (!(r.est >= 15)) continue;
    const ms = P.focusMs.get(r.id) || 0, actual = ms / 60000;
    if (actual < 5) continue;
    timed++; estMin += r.est; actMin += actual;
    const ratio = actual / r.est;
    if (Math.abs(ratio - 1) <= 0.1) close++;
    if (actual < r.est) under++;
    if (Math.abs(actual - r.est) <= 2) exact++;
    const k = achTaskKind(c, r.t); if (k) kinds.set(k, (kinds.get(k) || 0) + 1);
  }
  o.set('est.timed', timed); o.set('est.close', close); o.set('est.under', under); o.set('est.exact', exact);
  o.set('est.kinds', [...kinds.values()].filter(n => n >= 3).length);
  const rr = estMin > 0 ? actMin / estMin : 0;
  o.set('est.calibrated', timed >= 150 && rr >= 0.9 && rr <= 1.1 ? 1 : 0);
  // tidy lists: parked for Someday, and closed as won't do, only counting tasks that had lived a few days
  const aged = (t, ts) => Number(t.createdAt) > 0 && ts > 0 && ts - Number(t.createdAt) >= 3 * 86400000;
  let wont = 0;
  for (const t of P.wont) if (aged(t, Number(t.resolvedAt) || 0)) wont++;
  for (const t of P.open) if (Array.isArray(t.tags) && t.tags.includes('someday') && Number(t.createdAt) > 0 && Date.parse(today + 'T12:00:00Z') - Number(t.createdAt) >= 14 * 86400000) somedaySet++;
  somedaySet += somedayDone;
  o.set('tasks.wontdo', wont); o.set('tasks.somedaySet', somedaySet); o.set('tasks.somedayDone', somedayDone); o.set('tasks.restored', restored);
  o.set('tasks.movedWithReason', moved); o.set('tasks.priorityChanges', prioChanges);
  o.set('tasks.estimated', estimated); o.set('tasks.bigEstDone', bigEst); o.set('tasks.bigSplit', bigSplit);
  o.set('plan.set', planSet); o.set('plan.hits', planHits); o.set('plan.slotHits', slotHits); o.set('tasks.p1PlanHit', p1PlanHit);
  o.set('tasks.due30', due30); o.set('tasks.doneAhead', doneAhead); o.set('tasks.onTime', onTime); o.set('tasks.p1Week', p1Week); o.set('tasks.p1Old', p1Old);
  // clean-ups in four seasons (from the clean-up ticks)
  const seasons = new Set(); for (const d of Object.keys(o.s['d.cleanup'] || {})) seasons.add(achSeasonOf(d));
  o.set('cleanup.seasons', seasons.size);
  // reviews
  let winLines = 0, triaged = 0, letGo = 0, quick = 0, slip = 0, nudge5 = 0, withMoney = 0;
  for (const r of Array.isArray(c.data.reviews) ? c.data.reviews : []) {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) continue;
    if (r.kind === 'evening') {
      const at = Date.parse(r.savedAt || '');
      if (isFinite(at) && (Number(c.part(at).h) || 0) < 19 && c.day(at) === r.date) o.add('d.eveningEarly', r.date);
      continue;
    }
    if (r.kind !== 'week') continue;
    const wk = c.weekOf(r.date);
    if (Array.isArray(r.outcomes) && r.outcomes.some(x => x && Array.isArray(x.items) && x.items.length)) o.put('w.outcomes', wk, 1);
    const wins = Array.isArray(r.wins) ? r.wins.filter(Boolean).length : 0;
    if (wins) { o.put('w.wins', wk, 1); winLines += wins; }
    const tr = r.triage && typeof r.triage === 'object' ? r.triage : null;
    if (tr) {
      const rv = Math.min(100, Math.max(0, Number(tr.reviewed) || 0));
      triaged += rv; letGo += (Number(tr.dropped) || 0) + (Number(tr.someday) || 0) + (Number(tr.binned) || 0);
      if (rv >= 10 && Number(tr.minutes) > 0 && Number(tr.minutes) <= 15) quick++;
      if ((Number(tr.nudged) || 0) >= 5) nudge5++;
    }
    if (Array.isArray(r.slipped) && r.slipped.some(x => x && String(x.reason || '').trim())) slip++;
    if (r.stats && r.stats.spent != null) withMoney++;
  }
  o.set('review.winLines', winLines); o.set('review.triaged', triaged); o.set('review.letGo', letGo); o.set('review.quick', quick);
  o.set('review.slipReasons', slip); o.set('review.nudge5', nudge5); o.set('review.withMoney', withMoney);
  // finishing the day on both days of a weekend
  const ev = o.s['d.evening'] || {};
  for (const d of Object.keys(ev)) { if (achDow(d) === 6 && ev[c.add(d, 1)]) o.put('w.eveningWeekend', c.weekOf(d), 1); }
  // the brief and the stories: ticks plus the days still remembered by the seen flags
  for (const d of Object.keys(c.seen.brief || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) o.put('d.brief', d, 1);
  for (const k of ['morning', 'evening', 'money']) for (const d of Object.keys(c.seen['storyPlayed:' + k] || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) o.put('d.story-' + k, d, 1);
  for (const d of Object.keys(c.seen['storyPlayed:week'] || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) o.put('w.story-week', c.weekOf(d), 1);
  let wrapped = 0; for (const a of Object.values(c.g.awards)) if (a && a.k === 'wrapped') wrapped++;
  o.set('awards.wrapped', wrapped);
  // weeks that ended lighter than they began (10+ done in the week): open = added before, not closed before
  const ev2 = [];
  for (const t of c.tasks.values()) {
    if (c.repeats(t) || !(Number(t.createdAt) > 0)) continue;
    let close = 0;
    const r = P.finBy.get(t.id);
    if (c.isDone(t.id)) close = r ? r.ts : (_achIsWont(c, t) ? Number(t.resolvedAt) || 0 : 0);
    ev2.push([Number(t.createdAt), 1]); if (close) ev2.push([close, -1]);
  }
  for (const b of P.bins) { const cd = b.customData; if (cd && Number(cd.createdAt) > 0) { ev2.push([Number(cd.createdAt), 1]); ev2.push([Number(b.binTs), -1]); } }
  ev2.sort((a, b) => a[0] - b[0]);
  const weeks = Object.keys(weekAll).sort();
  if (weeks.length && ev2.length) {
    let i = 0, open = 0;
    const startOf = (w) => Date.parse(w + 'T00:00:00Z');
    const allWeeks = [];
    for (let w = weeks[0]; w <= c.weekOf(today); w = c.add(w, 7)) allWeeks.push(w);
    for (const w of allWeeks) {
      const s0 = startOf(w), s1 = startOf(c.add(w, 7));
      while (i < ev2.length && ev2[i][0] < s0) open += ev2[i++][1];
      const open0 = open;
      let j = i, o1 = open;
      while (j < ev2.length && ev2[j][0] < s1) o1 += ev2[j++][1];
      if (w < c.weekOf(today) && (weekAll[w] || 0) >= 10 && o1 < open0) o.put('w.lighter', w, 1);
    }
  }
}, { order: 20 });
