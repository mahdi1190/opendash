/* ============================================================
   ACHIEVEMENTS AND RECAPS, the pure part (v2.2 wave 5). No DOM, no page
   globals at load: Node loads it (tests/achievements.test.mjs) as the page does.
     ACH_DEFS                    the achievements {id, label, hint, icon, of, fact, reward}
                                 reward: {item: 'pack/item'} (an animation from the
                                 "rewards" pack) or {theme: 'gold'} (a theme)
     achDef(id)
     achFacts({log, dayOf, notes, extra})   the facts the rules read: done (completions),
                                 bestStreak (the longest run of days with one done),
                                 the noted moments {focus, boss, under-budget, inbox-zero}, and
                                 (2.16) the game's facts in extra (92-game-1core.js gameAchFacts)
     ACH_GROUPS                  the achievements wall's groups (each def has a group)
     achProgress(def, facts)     {n, of, done}
     achEarned(facts, unlocked)  ids newly earned (not yet in unlocked), in ACH_DEFS order
     achRewardFor(id) / achLockedBy(ref)   what an achievement unlocks / who unlocks an item
     recapRange(period, ref, today)   {period, from, to, label, key} for 'year' ('YYYY') or
                                 'month' ('YYYY-MM'); to never runs past today
     recapBuild(input, range)    the recap's aggregates (counts only; names stay ids)
     recapLongestRun(days)       the longest run of consecutive ISO days
     animOriginLine(item, day, ctx)   "Durdle Door, Dorset" / "For Bonfire night" / the pack
   Rules: gentle. Nothing is ever lost (an unlock stays unlocked), nothing counts
   down, nothing is said about a missed day.
   ============================================================ */
const ACH_DEFS = Object.freeze([
  { id: 'done-100', group: 'tasks', label: 'A hundred done', hint: 'Finish 100 tasks.', icon: 'circle-check', fact: 'done', of: 100, reward: { item: 'rewards/cel-laurel' } },
  { id: 'done-500', group: 'tasks', label: 'Five hundred done', hint: 'Finish 500 tasks.', icon: 'list-checks', fact: 'done', of: 500, reward: { item: 'rewards/open-fanfare' } },
  { id: 'done-1000', group: 'tasks', label: 'A thousand done', hint: 'Finish 1,000 tasks.', icon: 'trophy', fact: 'done', of: 1000, reward: { item: 'rewards/sym-constellation' } },
  { id: 'streak-7', group: 'streaks', label: 'A week in a row', hint: 'Finish something 7 days running.', icon: 'flame', fact: 'bestStreak', of: 7, reward: { item: 'rewards/streak-lantern' } },
  { id: 'streak-30', group: 'streaks', label: 'A month in a row', hint: 'Finish something 30 days running.', icon: 'flame', fact: 'bestStreak', of: 30, reward: { theme: 'gold' } },
  { id: 'streak-100', group: 'streaks', label: 'A hundred days', hint: 'Finish something 100 days running.', icon: 'sun', fact: 'bestStreak', of: 100, reward: { item: 'rewards/sky-crown' } },
  { id: 'under-budget', group: 'money', label: 'Under budget', hint: 'Close a budget month within budget.', icon: 'piggy-bank', fact: 'under-budget', of: 1, reward: { item: 'rewards/money-jar' } },
  { id: 'inbox-zero', group: 'habits', label: 'Inbox zero', hint: 'Clear the replies you owe.', icon: 'inbox', fact: 'inbox-zero', of: 1, reward: { item: 'rewards/empty-boat' } },
  { id: 'first-focus', group: 'focus', label: 'First focus block', hint: 'Finish a focus block.', icon: 'timer', fact: 'focus', of: 1, reward: { item: 'rewards/focus-bonsai' } },
  { id: 'boss', group: 'bosses', label: 'Long overdue, done', hint: 'Finish a task a week or more overdue.', icon: 'award', fact: 'boss', of: 1, reward: { item: 'rewards/boss-phoenix' } },
  /* 2.16: the game (92-game-1core.js gameAchFacts gives the facts below; without it they stay at 0) */
  { id: 'first-done', group: 'tasks', label: 'First one done', hint: 'Finish your first task.', icon: 'circle-check', fact: 'done', of: 1 },
  { id: 'done-10', group: 'tasks', label: 'Ten down', hint: 'Finish 10 tasks.', icon: 'circle-check', fact: 'done', of: 10 },
  { id: 'done-50', group: 'tasks', label: 'Fifty done', hint: 'Finish 50 tasks.', icon: 'list-checks', fact: 'done', of: 50 },
  { id: 'done-250', group: 'tasks', label: 'Quarter of a thousand', hint: 'Finish 250 tasks.', icon: 'list-checks', fact: 'done', of: 250 },
  { id: 'done-2500', group: 'tasks', label: 'Two and a half thousand', hint: 'Finish 2,500 tasks.', icon: 'trophy', fact: 'done', of: 2500 },
  { id: 'done-5000', group: 'tasks', label: 'Five thousand', hint: 'Finish 5,000 tasks.', icon: 'crown', fact: 'done', of: 5000 },
  { id: 'day-10', group: 'tasks', label: 'Big day', hint: 'Finish 10 tasks in one day.', icon: 'zap', fact: 'dayMax', of: 10 },
  { id: 'day-20', group: 'tasks', label: 'Huge day', hint: 'Finish 20 tasks in one day.', icon: 'rocket', fact: 'dayMax', of: 20 },
  { id: 'p1-25', group: 'tasks', label: 'Priorities straight', hint: 'Finish 25 high-priority tasks.', icon: 'flag', fact: 'p1Done', of: 25 },
  { id: 'p1-100', group: 'tasks', label: 'First things first', hint: 'Finish 100 high-priority tasks.', icon: 'flag', fact: 'p1Done', of: 100 },
  { id: 'early-bird', group: 'tasks', label: 'Early bird', hint: 'Finish 5 tasks before 7 in the morning.', icon: 'sunrise', fact: 'earlyDone', of: 5 },
  { id: 'night-owl', group: 'tasks', label: 'Night owl', hint: 'Finish 5 tasks after 11 at night.', icon: 'moon', fact: 'lateDone', of: 5 },
  { id: 'weekend-25', group: 'tasks', label: 'Weekend warrior', hint: 'Finish 25 tasks at weekends.', icon: 'sun', fact: 'weekendDone', of: 25 },
  { id: 'all-rounder', group: 'tasks', label: 'All-rounder', hint: 'Finish tasks in 5 different streams in one week.', icon: 'compass', fact: 'streamsWeek', of: 5 },
  { id: 'comeback', group: 'tasks', label: 'Welcome back', hint: 'Get going again after two weeks away.', icon: 'sprout', fact: 'comeback', of: 1 },
  { id: 'streak-3', group: 'streaks', label: 'Three in a row', hint: 'Finish something 3 days running.', icon: 'flame', fact: 'bestStreak', of: 3 },
  { id: 'streak-14', group: 'streaks', label: 'Two weeks running', hint: 'Finish something 14 days running.', icon: 'flame', fact: 'bestStreak', of: 14 },
  { id: 'streak-60', group: 'streaks', label: 'Sixty days', hint: 'Finish something 60 days running.', icon: 'flame', fact: 'bestStreak', of: 60 },
  { id: 'streak-365', group: 'streaks', label: 'A whole year', hint: 'Finish something every day for a year.', icon: 'crown', fact: 'bestStreak', of: 365 },
  { id: 'frost', group: 'streaks', label: 'Saved by the frost', hint: 'A streak freeze kept your run going.', icon: 'snowflake', fact: 'freezesUsed', of: 1 },
  { id: 'focus-10', group: 'focus', label: 'In the zone', hint: 'Log 10 focus sessions on tasks.', icon: 'timer', fact: 'focusSessions', of: 10 },
  { id: 'focus-hours-10', group: 'focus', label: 'Ten focused hours', hint: 'Log 10 hours on the focus timer.', icon: 'hourglass', fact: 'focusHours', of: 10 },
  { id: 'focus-hours-100', group: 'focus', label: 'A hundred hours', hint: 'Log 100 hours on the focus timer.', icon: 'hourglass', fact: 'focusHours', of: 100 },
  { id: 'deep-work', group: 'focus', label: 'Deep work', hint: 'Focus on one task for 90 minutes in one go.', icon: 'brain', fact: 'focusLongestMin', of: 90 },
  { id: 'on-estimate', group: 'focus', label: 'Right on time', hint: 'Finish 10 timed tasks within 20% of the estimate.', icon: 'target', fact: 'estimateHits', of: 10 },
  { id: 'boss-task', group: 'bosses', label: 'Boss down', hint: 'Tick off every subtask of a task with 3 or more.', icon: 'crown', fact: 'bossDefeated', of: 1 },
  { id: 'boss-10', group: 'bosses', label: 'Boss hunter', hint: 'Defeat 10 boss tasks.', icon: 'crown', fact: 'bossDefeated', of: 10 },
  { id: 'boss-big', group: 'bosses', label: 'Giant slayer', hint: 'Defeat a boss task with 10 or more subtasks.', icon: 'mountain', fact: 'bossBig', of: 10 },
  { id: 'quest-1', group: 'quests', label: 'Quest complete', hint: 'Complete a weekly quest.', icon: 'flag', fact: 'questsDone', of: 1 },
  { id: 'quest-25', group: 'quests', label: 'Adventurer', hint: 'Complete 25 weekly quests.', icon: 'compass', fact: 'questsDone', of: 25 },
  { id: 'quest-perfect', group: 'quests', label: 'Perfect week', hint: 'Complete all three quests in one week.', icon: 'star', fact: 'questPerfect', of: 1 },
  { id: 'quest-perfect-4', group: 'quests', label: 'Four perfect weeks', hint: 'Complete every quest in 4 weeks.', icon: 'gem', fact: 'questPerfect', of: 4 },
  { id: 'no-spend-3', group: 'money', label: 'Three quiet days', hint: 'Three no-spend days in a row.', icon: 'wallet', fact: 'noSpendBest', of: 3 },
  { id: 'no-spend-7', group: 'money', label: 'A quiet week', hint: 'Seven no-spend days in a row.', icon: 'wallet', fact: 'noSpendBest', of: 7 },
  { id: 'no-spend-30', group: 'money', label: 'Thirty quiet days', hint: 'Have 30 no-spend days.', icon: 'piggy-bank', fact: 'noSpendDays', of: 30 },
  { id: 'places-5', group: 'places', label: 'Out and about', hint: 'Spend time in 5 different places.', icon: 'map-pin', fact: 'places', of: 5 },
  { id: 'places-25', group: 'places', label: 'Explorer', hint: 'Spend time in 25 different places.', icon: 'compass', fact: 'places', of: 25 },
  { id: 'cities-10', group: 'places', label: 'City hopper', hint: 'Visit 10 different towns and cities.', icon: 'map-pin', fact: 'cities', of: 10 },
  { id: 'countries-3', group: 'places', label: 'Globetrotter', hint: 'Spend time in 3 countries.', icon: 'globe', fact: 'countries', of: 3 },
  { id: 'people-10', group: 'people', label: 'Team player', hint: 'Finish tasks linked to 10 different people.', icon: 'users', fact: 'peopleDistinct', of: 10 },
  { id: 'people-50', group: 'people', label: 'For others', hint: 'Finish 50 tasks linked to people.', icon: 'heart', fact: 'peopleTasks', of: 50 },
  { id: 'habit-30', group: 'habits', label: 'Creature of habit', hint: 'Tick a repeating task 30 times.', icon: 'repeat', fact: 'habitDone', of: 30 },
  { id: 'habit-200', group: 'habits', label: 'Second nature', hint: 'Tick repeating tasks 200 times.', icon: 'repeat', fact: 'habitDone', of: 200 },
  { id: 'inbox-10', group: 'habits', label: 'Inbox master', hint: 'Reach inbox zero on 10 days.', icon: 'inbox', fact: 'inboxDays', of: 10 },
  { id: 'review-1', group: 'habits', label: 'First review', hint: 'Save a weekly review.', icon: 'calendar-check', fact: 'reviews', of: 1 },
  { id: 'review-4', group: 'habits', label: 'Four weeks reviewed', hint: 'Review your week 4 weeks running.', icon: 'calendar-check', fact: 'reviewStreak', of: 4 },
  { id: 'review-12', group: 'habits', label: 'A season of reviews', hint: 'Save 12 weekly reviews.', icon: 'calendar-range', fact: 'reviews', of: 12 },
  { id: 'notes-7', group: 'habits', label: 'Dear diary', hint: 'Write 7 daily notes.', icon: 'notebook-pen', fact: 'daynotes', of: 7 },
  { id: 'level-5', group: 'levels', label: 'Level 5', hint: 'Reach level 5.', icon: 'star', fact: 'level', of: 5, reward: { item: 'levels/lv-star' } },
  { id: 'level-10', group: 'levels', label: 'Level 10', hint: 'Reach level 10.', icon: 'star', fact: 'level', of: 10, reward: { item: 'levels/lv-comet' } },
  { id: 'level-15', group: 'levels', label: 'Level 15', hint: 'Reach level 15.', icon: 'star', fact: 'level', of: 15, reward: { item: 'levels/lv-firefly' } },
  { id: 'level-20', group: 'levels', label: 'Level 20', hint: 'Reach level 20.', icon: 'medal', fact: 'level', of: 20, reward: { item: 'levels/lv-balloon' } },
  { id: 'level-30', group: 'levels', label: 'Level 30', hint: 'Reach level 30.', icon: 'medal', fact: 'level', of: 30, reward: { item: 'levels/lv-lighthouse' } },
  { id: 'level-40', group: 'levels', label: 'Level 40', hint: 'Reach level 40.', icon: 'trophy', fact: 'level', of: 40, reward: { item: 'levels/lv-summit' } },
  { id: 'level-50', group: 'levels', label: 'Level 50', hint: 'Reach level 50.', icon: 'crown', fact: 'level', of: 50, reward: { item: 'levels/lv-crown' } },
  { id: 'xp-day-300', group: 'levels', label: 'On fire', hint: 'Earn 300 XP in one day.', icon: 'flame', fact: 'xpDay', of: 300 },
  { id: 'year-one', group: 'milestones', label: 'One year with OpenDash', hint: 'Use OpenDash for a year.', icon: 'party-popper', fact: 'daysWithUs', of: 365 },
  { id: 'year-two', group: 'milestones', label: 'Two years with OpenDash', hint: 'Use OpenDash for two years.', icon: 'gift', fact: 'daysWithUs', of: 730 },
  /* 2.17: friends (99f-fun-1core.js funAchFacts gives the facts below, counts only; without it they stay at 0) */
  { id: 'coop-first', group: 'friends', label: 'Better together', hint: 'Finish your first co-op task with a friend.', icon: 'handshake', fact: 'coopDone', of: 1 },
  { id: 'cheer-10', group: 'friends', label: 'Cheerleader', hint: 'Cheer friends on 10 times.', icon: 'heart', fact: 'cheersSent', of: 10 },
  { id: 'duo-7', group: 'friends', label: 'Dynamic duo', hint: 'Keep a 7-day duo streak: you and a friend both finish something every day.', icon: 'flame', fact: 'duoBest', of: 7 },
  { id: 'duo-30', group: 'friends', label: 'Inseparable', hint: 'Keep a 30-day duo streak with a friend.', icon: 'flame', fact: 'duoBest', of: 30 },
  { id: 'plan-sundays-3', group: 'friends', label: 'Sunday planners', hint: 'Plan together with friends on 3 Sundays.', icon: 'calendar-heart', fact: 'planSundays', of: 3 },
  { id: 'gift-first', group: 'friends', label: 'Gift giver', hint: 'Send a friend a gift.', icon: 'gift', fact: 'giftsSent', of: 1 },
  { id: 'high5-double', group: 'friends', label: 'Perfect timing', hint: 'High-five a friend who high-fived you, within ten minutes.', icon: 'zap', fact: 'high5Double', of: 1 },
  { id: 'fquest-5', group: 'friends', label: 'Questing pals', hint: 'Finish 5 friendship quests.', icon: 'target', fact: 'friendQuests', of: 5 },
  { id: 'stickers-10', group: 'friends', label: 'Sticker collector', hint: 'Collect 10 different stickers from friends.', icon: 'book-open', fact: 'stickersDistinct', of: 10 },
  { id: 'candy-25', group: 'friends', label: 'Sweet tooth', hint: 'Collect 25 in one seasonal friend event (sweets, snowflakes or petals).', icon: 'cookie', fact: 'candyBest', of: 25 },
]);
/* The achievements wall's groups, in order (92-game-3ui.js). */
const ACH_GROUPS = Object.freeze([
  { id: 'tasks', label: 'Tasks', icon: 'circle-check' }, { id: 'streaks', label: 'Streaks', icon: 'flame' },
  { id: 'focus', label: 'Focus', icon: 'timer' }, { id: 'bosses', label: 'Bosses', icon: 'crown' },
  { id: 'quests', label: 'Quests', icon: 'flag' }, { id: 'habits', label: 'Habits', icon: 'repeat' },
  { id: 'people', label: 'People', icon: 'users' }, { id: 'places', label: 'Places', icon: 'map-pin' },
  { id: 'money', label: 'Money', icon: 'wallet' }, { id: 'levels', label: 'Levels', icon: 'star' },
  { id: 'milestones', label: 'Milestones', icon: 'party-popper' },
  { id: 'friends', label: 'Friends', icon: 'users' },
]);
const ACH_NOTES = Object.freeze(['focus', 'boss', 'under-budget', 'inbox-zero']);
function achDef(id) { return ACH_DEFS.find(d => d.id === id) || null; }
function achRewardFor(id) { const d = achDef(id); return d ? d.reward : null; }
function achLockedBy(ref) { const d = ACH_DEFS.find(x => x.reward && x.reward.item === ref); return d ? d.id : null; }

function _achIsoAdd(iso, n) { const t = Date.parse(iso + 'T12:00:00Z') + n * 86400000; return new Date(t).toISOString().slice(0, 10); }   // clock-ok: UTC date maths on ISO days
/** The longest run of consecutive days in a list (or Set) of ISO days. */
function recapLongestRun(days) {
  const set = days instanceof Set ? days : new Set(days || []);
  let best = 0;
  for (const d of set) {
    if (set.has(_achIsoAdd(d, -1))) continue;
    let n = 1, c = d;
    while (set.has(c = _achIsoAdd(c, 1))) n++;
    if (n > best) best = n;
  }
  return best;
}
function achFacts(o) {
  o = o || {};
  const dayOf = typeof o.dayOf === 'function' ? o.dayOf : (ts) => new Date(Number(ts)).toISOString().slice(0, 10);   // clock-ok: Node fallback; the page passes Clock's day
  let done = 0;
  const days = new Set();
  for (const arr of Object.values(o.log || {})) {
    if (!Array.isArray(arr)) continue;
    for (const ts of arr) { const n = Number(ts); if (!isFinite(n)) continue; done++; days.add(dayOf(n)); }
  }
  const f = { done, bestStreak: recapLongestRun(days) };
  const notes = o.notes && typeof o.notes === 'object' ? o.notes : {};
  for (const k of ACH_NOTES) f[k] = notes[k] ? 1 : 0;
  // 2.16: the game's facts (92-game-1core.js gameAchFacts); a fact both know keeps the larger
  // (the game's streak counts days bridged by a streak freeze)
  if (o.extra && typeof o.extra === 'object') for (const [k, v] of Object.entries(o.extra)) { const n = Number(v); if (isFinite(n)) f[k] = Math.max(Number(f[k]) || 0, n); }
  return f;
}
function achProgress(def, facts) {
  const n = Math.max(0, Number((facts || {})[def.fact]) || 0);
  return { n: Math.min(n, def.of), of: def.of, done: n >= def.of };
}
function achEarned(facts, unlocked) {
  const have = unlocked && typeof unlocked === 'object' ? unlocked : {};
  return ACH_DEFS.filter(d => !have[d.id] && achProgress(d, facts).done).map(d => d.id);
}

/* ---------- recaps ---------- */
const _ACH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RECAP_WEEKDAYS = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
function recapRange(period, ref, today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(String(today || '')) ? today : new Date().toISOString().slice(0, 10);   // clock-ok: pure fallback; the page passes its day
  if (period === 'month') {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ref || '')) || /^(\d{4})-(\d{2})/.exec(t);
    const y = +m[1], mo = +m[2];
    const from = `${m[1]}-${m[2]}-01`;
    const last = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);   // clock-ok: the month's last day, UTC maths
    return { period: 'month', from, to: last < t ? last : t, label: `${_ACH_MONTHS[mo - 1]} ${y}`, key: `${m[1]}-${m[2]}`, month: _ACH_MONTHS[mo - 1] };
  }
  const y = /^\d{4}$/.test(String(ref || '')) ? String(ref) : t.slice(0, 4);
  const last = `${y}-12-31`;
  return { period: 'year', from: `${y}-01-01`, to: last < t ? last : t, label: y, key: y };
}
function _recapTop(map, n) { return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n).map(([id, k]) => ({ id, n: k })); }
/**
 * The recap's numbers for a range. input = {
 *   completions: [{day, stream}],            one per task done (the completion log)
 *   meetings: [{day, people: [personId]}],    past timed events
 *   money: {tx: [{d, a, c}], exclude: [cat]} | null   (spending = -a outside exclude; income = a > 0 in 'Income')
 *   unlocked: {achId: day}
 * } -> {range, tasksDone, activeDays, busiestDay, busiestWeekday, topStreams, meetings,
 *       topPeople, bestStreak, byMonth (year) | byWeek (month), money, achievements}
 */
function recapBuild(input, range) {
  input = input || {};
  const inR = (d) => typeof d === 'string' && d >= range.from && d <= range.to;
  const perDay = new Map(), streams = new Map(), people = new Map(), wd = new Array(7).fill(0);
  const buckets = new Array(range.period === 'year' ? 12 : 5).fill(0);
  let tasksDone = 0, meetings = 0;
  for (const c of input.completions || []) {
    if (!c || !inR(c.day)) continue;
    tasksDone++;
    perDay.set(c.day, (perDay.get(c.day) || 0) + 1);
    if (c.stream) streams.set(c.stream, (streams.get(c.stream) || 0) + 1);
    wd[new Date(c.day + 'T12:00:00Z').getUTCDay()]++;
    const b = range.period === 'year' ? +c.day.slice(5, 7) - 1 : Math.min(4, Math.floor((+c.day.slice(8, 10) - 1) / 7));
    buckets[b]++;
  }
  for (const m of input.meetings || []) {
    if (!m || !inR(m.day)) continue;
    meetings++;
    for (const p of new Set(Array.isArray(m.people) ? m.people : [])) people.set(p, (people.get(p) || 0) + 1);
  }
  let busiestDay = null;
  for (const [day, n] of perDay) if (!busiestDay || n > busiestDay.n || (n === busiestDay.n && day < busiestDay.day)) busiestDay = { day, n };
  let bw = -1;
  for (let i = 0; i < 7; i++) if (wd[i] && (bw < 0 || wd[i] > wd[bw])) bw = i;
  let money = null;
  const mo = input.money;
  if (mo && Array.isArray(mo.tx)) {
    const ex = Array.isArray(mo.exclude) && mo.exclude.length ? mo.exclude.map(String) : ['Income', 'Internal transfers'];
    let spent = 0, income = 0, rows = 0;
    const cats = new Map();
    for (const r of mo.tx) {
      if (!r || !inR(String(r.d || '').slice(0, 10))) continue;
      const a = Number(r.a); if (!isFinite(a)) continue;
      const c = String(r.c || 'Uncategorised');
      if (c === 'Income' && a > 0) income += a;
      if (ex.includes(c)) continue;
      rows++; spent += -a; cats.set(c, (cats.get(c) || 0) - a);
    }
    const top = _recapTop(new Map([...cats].filter(([, v]) => v > 0)), 1)[0] || null;
    if (rows || income) money = { spent: Math.round(spent), income: Math.round(income), topCategory: top ? { name: top.id, amount: Math.round(top.n) } : null };
  }
  const unl = input.unlocked && typeof input.unlocked === 'object' ? input.unlocked : {};
  return {
    range, tasksDone, activeDays: perDay.size, busiestDay,
    busiestWeekday: bw >= 0 ? { name: RECAP_WEEKDAYS[bw], n: wd[bw] } : null,
    topStreams: _recapTop(streams, 3), meetings, topPeople: _recapTop(people, 3),
    bestStreak: recapLongestRun(perDay.keys()),
    buckets, money,
    achievements: ACH_DEFS.filter(d => inR(unl[d.id])).map(d => d.id),
  };
}

/* ---------- the animation of the day's origin line ---------- */
function _achTitle(id) { const s = String(id).replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
/** Where today's pick comes from: a UK county, a festival or special day, else its pack and the season. */
function animOriginLine(it, day, ctx) {
  if (!it) return '';
  ctx = ctx || {};
  if (it.county && typeof ukCounty === 'function') {
    const c = ukCounty(it.county);
    const rg = c && typeof UK_REGIONS !== 'undefined' ? UK_REGIONS.find(r => r.id === c.region) : null;
    if (c) return `From ${c.name}${rg && rg.name !== c.name ? ', ' + rg.name : ''}`;
  }
  if (typeof it.when === 'function') {
    const fest = typeof almFestivals === 'function' ? almFestivals(day, ctx).filter(f => f !== 'christmas-eve' || it.tags.includes('christmas')) : [];
    const hit = fest.find(f => it.tags.some(t => t.replace(/\s+/g, '-') === f || f.startsWith(t.replace(/\s+/g, '-')))) || fest[0];
    if (hit) return hit === 'birthday' ? 'For your birthday' : `For ${_achTitle(hit)}`;
    if (it.slot === 'sky') return 'In tonight\'s sky';
    return 'For today';
  }
  const p = typeof animPack === 'function' ? animPack(it.pack) : null;
  const season = typeof animSeasonOf === 'function' ? animSeasonOf(day) : '';
  return `From the ${p ? p.name : 'core'} pack${it.season !== 'any' && Array.isArray(it.season) && it.season.includes(season) ? `, picked for ${season}` : ''}`;
}
