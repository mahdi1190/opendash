/* ============================================================
   GARDEN, the economy rules (2.18.1). PURE: no DOM, no state, no clock.
   Coins, water and free seed packets come from TIME spent, not from clicks:
     - focus-timer minutes (sessions of at least 5 minutes), at a full rate for the first 2 hours of a day, half
       for the next 2, nothing after 4 hours;
     - a bonus when a task is finished, scaled by the minutes logged on it (or, with nothing logged, half of its
       estimate up to 30 minutes), capped against the logged time so a bigger estimate does not help;
     - a small streak bonus on days that earned something.
   A task pays once (a repeating one once a day); a task finished within 5 minutes of being created pays nothing;
   the bonus part is capped per task and per day, and the whole day at GARDEN_ECON.dayCap.
   gardenEconDay(input) is deterministic: the same input gives the same answer on every device.
   input: {sessions: [{ms}], done: [{first: bool, gapMs: ms since created (-1 unknown), estimate: min, loggedMs: ms
   logged on that task in valid sessions up to that day}], run: streak length including today}.
   ============================================================ */
const GARDEN_ECON = Object.freeze({
  v: 2,
  minSessionMin: 5,                 // shorter focus sessions pay nothing
  focusTiers: Object.freeze([[120, 0.2], [240, 0.1]]),   // [daily focus minutes up to, coins per minute]: 12 / h, then 6 / h, then 0
  minTaskGapMs: 300000,             // finished within 5 minutes of being created: no reward
  bonusMinPerCoin: 6,               // task bonus: 1 coin per 6 minutes of basis
  bonusEach: 15,                    // at most per task
  bonusDay: 45,                     // at most per day, all tasks
  noLogCapMin: 30, noLogShare: 0.5, // no time logged: half of the estimate, estimate counted up to 30 minutes
  logStretch: 1.5,                  // the estimate counts up to 1.5 x the logged time
  basisMax: 90,                     // minutes
  streakMax: 5,
  dayCap: 120,                      // coins a day from time
  packetEveryMin: 50, packetsMax: 2,// a free seed packet per 50 credited minutes, 2 a day
  waterPerTask: 1, waterMinPer: 25, waterMax: 10,   // +1 water per rewarded task and per 25 credited minutes, at most +10
  dailyShare: 0.5,                  // garden daily tasks pay half of the 2.18.0 amount (they are clicks)
});

function _geFmtMin(min) { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`) : `${m} min`; }

function gardenEconDay(inp) {
  const E = GARDEN_ECON, log = [];
  inp = inp || {};
  // focus time
  let focusMin = 0, ignored = 0;
  for (const s of inp.sessions || []) {
    const min = (Number(s && s.ms) || 0) / 60000;
    if (min >= E.minSessionMin) focusMin += min; else if (min > 0) ignored++;
  }
  focusMin = Math.floor(focusMin);
  let focusCoins = 0, left = focusMin, from = 0;
  for (const [upTo, rate] of E.focusTiers) { const take = Math.max(0, Math.min(left, upTo - from)); focusCoins += take * rate; left -= take; from = upTo; }
  focusCoins = Math.floor(focusCoins + 1e-9);
  if (focusCoins > 0) log.push({ why: `${_geFmtMin(focusMin)} focused`, c: focusCoins });
  else if (ignored) log.push({ why: 'Focus sessions under 5 minutes do not count', c: 0 });
  // finished tasks
  let taskCoins = 0, rewarded = 0, taskMin = 0, skipped = 0;
  for (const d of inp.done || []) {
    if (!d || !d.first) { skipped++; continue; }
    if (d.gapMs >= 0 && d.gapMs < E.minTaskGapMs) { skipped++; continue; }
    const logged = (Number(d.loggedMs) || 0) / 60000, est = Number(d.estimate) || 0;
    let basis = 0;
    if (logged >= E.minSessionMin) basis = Math.min(est > 0 ? Math.max(est, logged) : logged, logged * E.logStretch, E.basisMax);
    else if (est > 0) basis = Math.min(est, E.noLogCapMin) * E.noLogShare;
    const c = Math.min(E.bonusEach, Math.floor(basis / E.bonusMinPerCoin));
    if (c <= 0) { skipped++; continue; }
    taskCoins += c; rewarded++; taskMin += basis;
  }
  if (taskCoins > E.bonusDay) { log.push({ why: `${rewarded} finished task${rewarded === 1 ? '' : 's'} (bonus capped at ${E.bonusDay} a day)`, c: E.bonusDay }); taskCoins = E.bonusDay; }
  else if (taskCoins > 0) log.push({ why: `${rewarded} finished task${rewarded === 1 ? '' : 's'} (bonus for the time they took)`, c: taskCoins });
  if (skipped) log.push({ why: `${skipped} task${skipped === 1 ? '' : 's'} too quick, empty or already counted`, c: 0 });
  // streak
  const base = focusCoins + taskCoins;
  const streakCoins = base > 0 ? Math.min(E.streakMax, Math.max(0, Math.floor(Number(inp.run) || 0))) : 0;
  if (streakCoins > 0) log.push({ why: `${inp.run}-day streak`, c: streakCoins });
  const raw = base + streakCoins;
  const coins = Math.min(E.dayCap, raw);
  if (raw > E.dayCap) log.push({ why: `Daily cap of ${E.dayCap} reached`, c: coins - raw });
  const credited = focusMin + Math.round(taskMin);
  return {
    coins, raw, base, capped: raw > E.dayCap, cap: E.dayCap, focusMin, focusCoins, taskCoins, taskN: rewarded, streakCoins, credited, log,
    packets: Math.min(E.packetsMax, Math.floor(credited / E.packetEveryMin)),
    water: Math.min(E.waterMax, rewarded * E.waterPerTask + Math.floor(credited / E.waterMinPer)),
  };
}
/** One line for the HUD: 'Today: 42 coins from 1h40 focused (cap 120)'. */
function gardenEconLine(e) {
  const bits = [];
  if (e.focusMin) bits.push(`${_geFmtMin(e.focusMin)} focused`);
  if (e.taskN) bits.push(`${e.taskN} task${e.taskN === 1 ? '' : 's'} finished`);
  return `Today: ${e.coins} coin${e.coins === 1 ? '' : 's'}${bits.length ? ' from ' + bits.join(' and ') : ''} (cap ${e.cap})`;
}
