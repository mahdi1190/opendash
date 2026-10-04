/* ============================================================
   ACHIEVEMENTS AND RECAPS, the pure part (v2.2 wave 5). No DOM, no page
   globals at load: Node loads it (tests/achievements.test.mjs) as the page does.
     ACH_DEFS                    the achievements {id, label, hint, icon, of, fact, reward}
                                 reward: {item: 'pack/item'} (an animation from the
                                 "rewards" pack) or {theme: 'gold'} (a theme)
     achDef(id)
     achFacts({log, dayOf, notes})   the facts the rules read: done (completions),
                                 bestStreak (the longest run of days with one done),
                                 and the noted moments {focus, boss, under-budget, inbox-zero}
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
  { id: 'done-100', label: 'A hundred done', hint: 'Finish 100 tasks.', icon: 'circle-check', fact: 'done', of: 100, reward: { item: 'rewards/cel-laurel' } },
  { id: 'done-500', label: 'Five hundred done', hint: 'Finish 500 tasks.', icon: 'list-checks', fact: 'done', of: 500, reward: { item: 'rewards/open-fanfare' } },
  { id: 'done-1000', label: 'A thousand done', hint: 'Finish 1,000 tasks.', icon: 'trophy', fact: 'done', of: 1000, reward: { item: 'rewards/sym-constellation' } },
  { id: 'streak-7', label: 'A week in a row', hint: 'Finish something 7 days running.', icon: 'flame', fact: 'bestStreak', of: 7, reward: { item: 'rewards/streak-lantern' } },
  { id: 'streak-30', label: 'A month in a row', hint: 'Finish something 30 days running.', icon: 'flame', fact: 'bestStreak', of: 30, reward: { theme: 'gold' } },
  { id: 'streak-100', label: 'A hundred days', hint: 'Finish something 100 days running.', icon: 'sun', fact: 'bestStreak', of: 100, reward: { item: 'rewards/sky-crown' } },
  { id: 'under-budget', label: 'Under budget', hint: 'Close a budget month within budget.', icon: 'piggy-bank', fact: 'under-budget', of: 1, reward: { item: 'rewards/money-jar' } },
  { id: 'inbox-zero', label: 'Inbox zero', hint: 'Clear the replies you owe.', icon: 'inbox', fact: 'inbox-zero', of: 1, reward: { item: 'rewards/empty-boat' } },
  { id: 'first-focus', label: 'First focus block', hint: 'Finish a focus block.', icon: 'timer', fact: 'focus', of: 1, reward: { item: 'rewards/focus-bonsai' } },
  { id: 'boss', label: 'Long overdue, done', hint: 'Finish a task a week or more overdue.', icon: 'award', fact: 'boss', of: 1, reward: { item: 'rewards/boss-phoenix' } },
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
