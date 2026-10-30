/* ============================================================
   ACHIEVEMENTS, B3 the Life shelf: the facts (docs/dev/ACHIEVEMENTS_500.md 1.7, 3.15 to 3.19). PURE.
   Habits, rhythm, rest, journal and money. Rest achievements praise rest that happened (never a
   missed day); habits count a repeating task once a day, as XP does.
   ============================================================ */
function _achMonthKey(iso) { return iso.slice(0, 7); }
registerAchFactSource('b3-life', (c, o) => {
  const P = achPass(c), today = c.today;
  // ---- habits: the ticks of every repeating task ----
  const hab = [];   // {t, days: sorted unique ticked days, ts: [ms]}
  const byTask = new Map();
  for (const e of c.entries) {
    const t = c.tasks.get(e.id);
    if (!t || !c.repeats(t)) continue;
    let h = byTask.get(e.id);
    if (!h) { h = { t, days: [], ts: [] }; byTask.set(e.id, h); hab.push(h); }
    h.days.push(e.day); h.ts.push(e.ts);
  }
  const runOf = (days, step, keyOf) => {   // longest run of consecutive units
    const keys = [...new Set(days.map(keyOf))].sort();
    let best = 0, run = 0, prev = '';
    for (const k of keys) { run = prev && step(prev) === k ? run + 1 : 1; prev = k; if (run > best) best = run; }
    return best;
  };
  const monthNext = (ym) => { const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };
  let bestDaily = 0, bestWeekly = 0, bestMonthly = 0, revived = 0, onHour = 0, bestYear = 0, recChanged = 0, kept = 0, madeRepeat = 0;
  const habDaily = [];
  for (const h of hab) {
    const t = h.t, rec = t.recurrence, uniq = [...new Set(h.days)].sort();
    if (uniq.length >= 7) madeRepeat++;
    if (rec === 'daily') { bestDaily = Math.max(bestDaily, runOf(uniq, (d) => c.add(d, 1), (d) => d)); habDaily.push({ t, uniq }); }
    else if (rec === 'weekdays') {
      // weekends are skipped, so Friday to Monday stays a run
      const set = new Set(uniq); let run = 0, best = 0;
      for (let d = uniq[0], i = 0; d <= uniq[uniq.length - 1] && i < 4000; d = c.add(d, 1), i++) { const w = achDow(d); if (w === 0 || w === 6) continue; if (set.has(d)) { run++; if (run > best) best = run; } else run = 0; }
      bestDaily = Math.max(bestDaily, best); habDaily.push({ t, uniq });
    } else if (rec === 'weekly') bestWeekly = Math.max(bestWeekly, runOf(uniq, (w) => c.add(w, 7), (d) => c.weekOf(d)));
    else if (rec === 'monthly') bestMonthly = Math.max(bestMonthly, runOf(uniq, monthNext, _achMonthKey));
    for (let i = 1; i < uniq.length; i++) if (c.between(uniq[i - 1], uniq[i]) >= 14) revived++;
    if (rec === 'daily') { const per = {}; for (const d of uniq) per[d.slice(0, 4)] = (per[d.slice(0, 4)] || 0) + 1; bestYear = Math.max(bestYear, ...Object.values(per)); }
    if (t.dueTime && /^\d\d:\d\d$/.test(t.dueTime)) {
      const want = Number(t.dueTime.slice(0, 2)) * 60 + Number(t.dueTime.slice(3));
      for (const ts of h.ts) { const p = c.part(ts); const m = (Number(p.h) || 0) * 60 + (Number(p.mi) || 0); if (Math.abs(m - want) <= 15) onHour++; }
    }
    if (uniq.length >= 10) for (const a of _achAct(c, t.id)) if (a && a.type === 'recurrence') recChanged++;
    // kept through the first 30 days: 80% of the days a daily task could be ticked
    if ((rec === 'daily' || rec === 'weekdays') && uniq.length >= 20 && Number(t.createdAt) > 0) {
      const start = c.day(t.createdAt);
      if (c.between(start, today) >= 30) {
        const win = uniq.filter(d => c.between(start, d) >= 0 && c.between(start, d) < 30).length;
        if (win >= (rec === 'daily' ? 24 : 17)) kept++;
      }
    }
  }
  o.set('habits.bestDailyRun', bestDaily); o.set('habits.bestWeeklyRun', bestWeekly); o.set('habits.bestMonthlyRun', bestMonthly);
  o.set('habits.revived', revived); o.set('habits.onTheHour', onHour); o.set('habits.bestYearDays', bestYear);
  o.set('habits.recurrenceChanged', recChanged); o.set('habits.firstMonthKept', kept); o.set('habits.created', madeRepeat);
  // routine days: 3+ daily habits were running and every one was ticked
  const spans = habDaily.filter(h => h.uniq.length >= 5).map(h => ({ set: new Set(h.uniq), from: h.uniq[0], to: h.uniq[h.uniq.length - 1], weekdays: h.t.recurrence === 'weekdays' }));
  if (spans.length >= 3) {
    const lo = spans.reduce((m, s) => s.from < m ? s.from : m, spans[0].from), hi = spans.reduce((m, s) => s.to > m ? s.to : m, spans[0].to);
    for (let d = lo, i = 0; d <= hi && i < 4000; d = c.add(d, 1), i++) {
      const w = achDow(d), live = spans.filter(s => d >= s.from && d <= s.to && !(s.weekdays && (w === 0 || w === 6)));
      if (live.length >= 3 && live.every(s => s.set.has(d))) o.put('d.habitsAll', d, 1);
    }
  }
  const wkTasks = new Map();
  for (const h of hab) {
    const am = new Set(), pm = new Set();
    h.ts.forEach((ts, i) => {
      const p = c.part(ts), day = h.days[i], hr = Number(p.h) || 0;
      if (hr < 9) o.add('d.habitAM', day); if (hr >= 18) o.add('d.habitPM', day);
      const w = c.weekOf(day); if (!wkTasks.has(w)) wkTasks.set(w, new Set()); wkTasks.get(w).add(h.t.id);
      const dw = achDow(day); if (dw === 0 || dw === 6) o.put('w.habitWeekend', w, 1);
    });
  }
  for (const [w, set] of wkTasks) o.put('w.habitsDistinct', w, set.size);
  // ---- rhythm ----
  const days = Object.keys(o.s['d.doneAny'] || {}).sort();
  let comebacks = 0; for (let i = 1; i < days.length; i++) if (c.between(days[i - 1], days[i]) >= 8) comebacks++;
  o.set('rhythm.comebacks7', comebacks);
  const dowN = [0, 0, 0, 0, 0, 0, 0]; for (const d of days) dowN[achDow(d)]++;
  o.set('rhythm.minDow', days.length ? Math.min(...dowN) : 0);
  const firstOf = new Map(); for (const e of c.entries) if (!firstOf.has(e.day)) firstOf.set(e.day, e.ts);
  for (const d of days) { const prev = c.add(d, -1); if (firstOf.has(prev) && c.part(firstOf.get(d)).h === c.part(firstOf.get(prev)).h) o.put('d.sameFirstHour', d, 1); }
  const openDays = o.s['d.open'] || {}, first = days[0] || '';
  let anni = 0;
  if (first) for (let y = 1; y < 15; y++) { const d = `${Number(first.slice(0, 4)) + y}${first.slice(4)}`; if (d <= today && openDays[d]) { anni = 1; break; } }
  o.set('rhythm.anniversary', anni);
  // ---- rest and balance: one-off finishes only (a repeating tick is a routine, not work) ----
  const work = {}, lastHr = {}, finMin = {};
  for (const r of P.fin) { work[r.day] = (work[r.day] || 0) + 1; const hr = Number(c.part(r.ts).h) || 0, mi = Number(c.part(r.ts).mi) || 0, m = hr * 60 + mi; if (!(r.day in lastHr) || m > lastHr[r.day]) lastHr[r.day] = m; (finMin[r.day] = finMin[r.day] || []).push(m); }
  const workDays = Object.keys(work).sort();
  const wkWork = {};
  for (const d of workDays) { const w = c.weekOf(d), dw = achDow(d); if (dw !== 0 && dw !== 6) wkWork[w] = (wkWork[w] || 0) + work[d]; }
  const thisWeek = c.weekOf(today);
  let longWE = 0, monthsFree = 0;
  const start = workDays[0];
  if (start) {
    const monthWD = {}, monthWE = {};
    for (const d of workDays) { const dw = achDow(d); const m = d.slice(0, 7); if (dw === 0 || dw === 6) monthWE[m] = (monthWE[m] || 0) + work[d]; else monthWD[m] = (monthWD[m] || 0) + work[d]; }
    for (const [m, n] of Object.entries(monthWD)) if (n >= 40 && !monthWE[m] && m < today.slice(0, 7)) monthsFree++;
    for (let w = c.weekOf(start); w < thisWeek; w = c.add(w, 7)) {
      const sat = c.add(w, 5), sun = c.add(w, 6);
      if (c.ws !== 'Mon') continue;
      const busy = (wkWork[w] || 0) >= 10, off = !work[sat] && !work[sun];
      if (busy && off) {
        o.put('w.weekendOff', w, 1);
        const fri = c.add(w, 4), mon = c.add(w, 7);
        if ((!work[fri] && fri <= today) || (!work[mon] && mon < today)) longWE++;
      }
    }
  }
  o.set('balance.longWeekends', longWE); o.set('balance.monthWeekendFree', monthsFree);
  let easy = 0, gentle = 0;
  for (const d of workDays) {
    const prev = c.add(d, -1), n = work[d];
    if (n >= 1 && n <= 3 && (work[prev] || 0) >= 10) easy++;
  }
  for (let i = 1; i < workDays.length; i++) { if (c.between(workDays[i - 1], workDays[i]) >= 8 && work[workDays[i]] <= 3) gentle++; }
  o.set('balance.easyAfterBig', easy); o.set('balance.gentleReturn', gentle);
  const wkEarly = {};
  const focusBy = {};
  for (const s of c.sessions) if (s.s && s.ms > 0) { const d = s.d || c.day(s.s); (focusBy[d] = focusBy[d] || []).push([s.s, s.e || s.s + s.ms]); }
  for (const d of workDays) {
    const dw = achDow(d); if (dw === 0 || dw === 6) continue;
    const n = work[d], w = c.weekOf(d);
    if (lastHr[d] < 18 * 60) wkEarly[w] = (wkEarly[w] || 0) + 1;
    if (n >= 3 && n <= 10) o.put('d.steady', d, 1);
    if (n >= 5 && lastHr[d] < 13 * 60) o.put('d.doneBy13', d, 1);
    if (n >= 5) {
      let free = true;
      for (const m of finMin[d] || []) if (m >= 750 && m <= 810) { free = false; break; }
      if (free) for (const [a, b] of focusBy[d] || []) { const m0 = Number(c.part(a).min) || 0, m1 = m0 + (b - a) / 60000; if (m0 < 810 && m1 > 750) { free = false; break; } }
      if (free) o.put('d.lunchBreak', d, 1);
    }
  }
  for (const [w, n] of Object.entries(wkEarly)) if (w < thisWeek) o.put('w.earlyFinish', w, n);
  // ---- journal, capsules, goals, advent ----
  const mem = c.data.memories && typeof c.data.memories === 'object' ? c.data.memories : {};
  let mood = 0, own = 0, polished = 0;
  for (const [d, j] of Object.entries(mem.journal && typeof mem.journal === 'object' ? mem.journal : {})) {
    if (!_ACH_ISO.test(d) || !j || typeof j !== 'object') continue;
    const text = String(j.text || '').trim(), line = String(j.line || '').trim();
    if (text.length >= 20 || line.length >= 8) o.put('d.journal', d, 1); else continue;
    if (Number(j.mood) >= 1) mood++;
    if (line.length >= 8) own++;
    if (j.polished) polished++;
  }
  o.set('journal.moodDays', mood); o.set('journal.ownLines', own); o.set('journal.polished', polished);
  let capW = 0, capO = 0, capLong = 0;
  for (const k of Array.isArray(mem.capsules) ? mem.capsules : []) {
    if (!k || !String(k.text || '').trim()) continue;
    capW++;
    if (k.opened) {
      capO++;
      const made = typeof k.created === 'number' ? c.day(k.created) : String(k.created || '').slice(0, 10);
      if (_ACH_ISO.test(made) && _ACH_ISO.test(String(k.opens || ''))) capLong = Math.max(capLong, c.between(made, k.opens));
    }
  }
  o.set('capsules.written', capW); o.set('capsules.opened', capO); o.set('capsules.longestOpened', capLong);
  let gy = 0, gd = 0;
  for (const g of Object.values(mem.goals && typeof mem.goals === 'object' ? mem.goals : {})) { const l = g && Array.isArray(g.list) ? g.list.filter(x => x && String(x.text || '').trim()) : []; if (l.length) gy++; gd += l.filter(x => x.done).length; }
  o.set('goals.years', gy); o.set('goals.done', gd);
  let doors = 0, bestAdv = 0;
  for (const y of Object.values(mem.advent && typeof mem.advent === 'object' ? mem.advent : {})) { const n = Object.values(y || {}).filter(v => Number(v) > 0).length; doors += n; bestAdv = Math.max(bestAdv, n); }
  o.set('advent.doors', doors); o.set('advent.bestYear', bestAdv);
  o.set('postcards.withNote', Object.values(mem.postcards && typeof mem.postcards === 'object' ? mem.postcards : {}).filter(p => p && String(p.note || '').trim()).length);
  let notes = 0; for (const [id, l] of Object.entries(c.data.notes && typeof c.data.notes === 'object' ? c.data.notes : {})) if (Array.isArray(l) && P.finBy.has(id)) notes += Math.min(l.length, 5);
  o.set('notes.task', notes);
  // ---- shared habit goals (friends' server awards, by week) ----
  const gw = new Set(); for (const a of Object.values(c.g.awards)) if (a && a.k === 'goal-hit' && _ACH_ISO.test(String(a.d || ''))) gw.add(c.weekOf(a.d));
  o.set('together.goalWeeks', gw.size);
}, { order: 22 });
