# 500 more achievements (2.18b plan)

Status: **B0 (the foundation) is BUILT** on `feat/218-ach` (24 Oct 2026): the
engine, the counters, the facts, the checker with history mode, the
Achievements page and `tools/ach-dayone.mjs`. B1 to B5 (the 500) are still to
build, one batch at a time, after the 2.18 merges. **Recalibrated 24 Oct**:
"they need to be HARD to unlock" (3.2 overrides every earlier number).

User request, 24 Oct: "we should add another 500 achievements too, make sure
they are unique and good and useful and productive and fun." Then: "they need
to be HARD to unlock."

What this document gives the builders:

1. **Audit**: how achievements work today, and every signal the app can
   really measure, marked by where it comes from and whether it exists yet.
2. **Design**: a small counters layer, a declarative condition format,
   rarity, XP and unlocks, and an Achievements page that can show 578 without
   overwhelming anyone.
3. **The 500**: 26 categories on 5 shelves, every achievement written out
   (id, name, what to do, condition, tier, rarity and XP, unlock, flags).
4. **Rules, batches and a critic checklist** so five build batches stay unique,
   measurable and kind.

House rules that apply to everything below: no tests (CLAUDE.md, 23 Oct);
check with `node build.mjs --syntax` and `node build.mjs`; never touch the live
install or data; no personal names in tracked files; `node tools/privacy-scan.mjs`
before anything is published.

---

## 1. Audit: achievements today

### 1.1 Where they are defined

| Piece | File | What it holds |
|---|---|---|
| Definitions | `src/app/71-achievements.js` | `ACH_DEFS`: **78** frozen entries (the "85" sometimes quoted is a line count that also catches the 7 lines of `ACH_GROUPS`) `{id, group, label, hint, icon, fact, of, reward?}`. 10 from 2.2 (with animation or theme rewards), 58 from the 2.16 game, 10 'friends' from 2.17. `ACH_GROUPS`: 12 groups (tasks, streaks, focus, bosses, quests, habits, people, places, money, levels, milestones, friends). Pure: no DOM, no page globals at load. |
| The one rule | `achProgress(def, facts)` | Every achievement today is a single threshold: `facts[def.fact] >= def.of`. There are no windows, combos, secrets, tiers or dates. |
| Facts | `achFacts({log, dayOf, notes, extra})` | `done` and `bestStreak` from `state.completionLog`; four noted moments (`focus`, `boss`, `under-budget`, `inbox-zero`); then every number in `extra`, keeping the larger when two sources know a fact. |
| Game facts | `src/app/92-game-1core.js` `gameAchFacts()` | 40 facts computed in `_gmCompute()` (see 1.5). Memoised per minute and per save (`_gmKey`). |
| Friends facts | `src/app/99f-fun-1core.js` `funAchFacts()` | `cheersSent, giftsSent, duoBest, high5Double, friendQuests, stickersDistinct, candyBest, friends` from the server's `/api/fun` answer (`lib/friends/fun.mjs` line ~713), plus `coopDone` (game awards of kind `coop`) and `planSundays` (Together plan cards). |

### 1.2 How they are checked

`src/app/78-achievements.js`:

- `achCheck()` builds the facts (`achFactsNow()`: completion log + notes +
  `gameAchFacts()` + `funAchFacts()`), asks `achEarned(facts, unlocked)` for
  ids newly over their threshold, stores them and plays the moment.
- It runs 5 s after load, then `achCheckSoon(ms)` debounces calls after a task
  is closed (`achTaskDone`, 1.4 s), after `achNote()` (0.6 s) and after the
  finances load (`_gmFinLoad`, 2.5 s). `92-game-1core.js _gmCheckAll` runs
  every 5 minutes while the tab is visible and after game events.
- Every rule is evaluated on every check (78 cheap comparisons). This does not
  scale to 578 rules with windows and runs; section 2.2 fixes that.

### 1.3 How they are stored and synced

- `state.achievements = {v: 1, unlocked: {id: 'YYYY-MM-DD'}, notes: {kind: day}, checked}`:
  a UI key (`saveUI`, never an undo step).
- Synced as a preference (`lib/sync/manifest.mjs` `achievements: pref(...)`;
  `lib/sync/model.mjs` `achievements: rec({unlocked: map(), notes: map()})`):
  one register per unlock, so two devices add up and nothing earned is lost.
- `state.game` (prefs, `awards` one entry per award, `ticks: {kind: {day: 1}}`,
  `focus` sessions by id, `quests`, `records`, `seen`) is a synced preference
  too (`game: rec({prefs, awards: map(rec()), ticks: map(map()), focus: map(rec()), quests: map(rec({done: map()})), records: map(rec()), seen: rec({milestones: map()})})`).
- Everything else the game shows (XP, levels, streaks, records, quest progress)
  is **computed on each device from the synced data**, so every device shows the
  same numbers with nothing to merge. Achievements do NOT give XP today.

### 1.4 How they are shown

| Where | File | What |
|---|---|---|
| The unlock moment | `92-game-1core.js gameAchMoment(ids)` (78 hands over) | Fun level Off: nothing. 1-2 at once: a moment each (Subtle: a toast; Full: a card with confetti, queued). 3+: one summary toast "N achievements earned (from your history)". Milestones (`done-100...`, `year-*`, `streak-30/100/365`) are big moments with sound. Level unlocks ride on the level-up moment. |
| The wall | `92-game-3ui.js _gmWallSec` (Game page, `#view=game`, `#gm-wall`) | Every group with a heading "N of M", then a flat grid of small cards (icon or lock, label, progress bar or earned day, a gift icon when it unlocks something). The hint is only a tooltip. No search, no filter, no sort, no "next up". Fine for 78; unusable for 578. |
| The library panel | `78-achievements.js achPanelRender` (Settings > Animations) | Only the 9 that unlock an animation or theme, with a button to the wall, plus the year/month recap buttons. |
| Open the wall | `gameOpenWall(id)` | Palette "Open the achievements wall", the moment's "See" button, the Settings panel button, the Profile page's "See the achievements". |
| Recaps and Wrapped | `71-achievements.js recapBuild`, `79-story-recap.js`, `93-memories-wrapped.js` | Achievements earned inside the period. |

### 1.5 How they are used elsewhere

- **Profile badges** (`97-profile-1core.js`): `profile.badges` is a list of
  achievement ids (null = the newest three earned). `profileShowcase()` picks
  them, `profileBadgeInfo(id)` reads `achDef(id)` for label and icon, and the
  ids travel to friends inside the profile payload (`profilePayload()`); a friend's
  build maps ids it knows and drops the rest. **Gap**: the default showcase is
  "newest three earned", so with money or places achievements a friend could
  see "Thirty quiet days" or a travel badge the user never chose to share
  (section 2.6 adds `private`).
- **Avatar unlocks** (`97-profile-0kit.js PF_PARTS`): options carry
  `{level: n}` or `{ach: id}` (Hearts eyes: `streak-30`; Graduation cap and
  Laurels frame: `done-100`); `profileLockOf()` explains the lock.
- **Animation rewards**: `reward.item` points at the `rewards` pack
  (`72-anim-pack-rewards.js`, 9 items); `achLockedBy(ref)` answers the reverse.
- **Game accents** (`92-game-0logic.js GAME_ACCENTS`): unlocked by level only.

### 1.6 What is good, and what blocks 500 more

Good and kept: gentle rules (nothing lost, nothing counts down, nothing nags),
facts computed from synced data (back-fill for free), unlocks as synced
registers, the Fun level gating every moment.

Blocks:

1. One rule shape (single threshold). 500 good achievements need windows,
   runs, same-day combos, ratios, firsts, dates, secrets, tiers and meta.
2. Facts only cover what `_gmCompute` happens to compute. Many useful habits
   (sweeps, clean-ups, plan my week, palette, inbox emptied, overdue cleared)
   leave no trace in the data, so they cannot be counted at all.
3. Evaluating every rule on every check.
4. A wall with no search, filters, categories that fold, or suggestions.
5. No XP for achievements, no rarity, and only two unlock kinds.
6. No privacy flag for sensitive achievements shown as badges.

---

## 1.7 Every signal the app can measure

How to read the **Source** column:

- **EXISTS**: already a fact in `achFacts` / `gameAchFacts` / `funAchFacts`. Use the bare name.
- **DATA**: derivable today from synced data (tasks, completion log, task
  activity, reviews, daynotes, memories, game state, seen flags, profile).
  New code only, and **back-filled from history** automatically.
- **DEVICE**: computed on each device from a source that is not in the state
  (finances `/api/finance`, the location log, the calendar cache, the friends
  server answer). Back-filled whenever that source has history. Never stored.
- **TICK / COUNT / MARK**: needs the new counters layer (section 2.1). Starts at
  zero on update unless a seed is listed. Kind names are given in `code`.
- **STAMP**: needs a new `createdVia` value on tasks (a data field, so it
  back-fills from the day it ships).
- **2.18**: comes from the 2.18 modules' facts contract (section 1.8).

Names: scalars are dotted (`tasks.onTime`); daily series start `d.` (value per
ISO day); weekly series start `w.` (value per week start, `APP_CONFIG.weekStart`).
Series are what windows, runs and day counts read.

### Tasks and the completion log

All task facts come from ONE pass over `gameXpFromLog(...).entries` (a one-off
task counts once, a repeating task once a day, exactly like XP), `state.custom`,
`state.statuses`, `state.taskActivity` and `state.notes`, inside `_gmCompute`'s
memo.

| Fact | Meaning | Source |
|---|---|---|
| `done`, `dayMax`, `p1Done`, `earlyDone`, `lateDone`, `weekendDone`, `streamsWeek`, `comeback`, `bestStreak`, `freezesUsed` | as today | EXISTS |
| `d.done` | completions per day | DATA (`doneByDay`) |
| `d.doneAny` | 1 on a day with at least one completion | DATA |
| `d.p1Done` | high-priority (p1) completions per day | DATA |
| `d.p1First` | 1 when the day's first completion was a p1 | DATA |
| `d.p1DueClear` | 1 when at least one p1 was due that day and every p1 due that day was finished by its end | DATA |
| `d.streams` | distinct streams finished in per day | DATA |
| `d.subtasks` | subtasks ticked per day (subtask `ts`) | DATA |
| `subtasks.done` | subtasks ticked, all time | DATA |
| `tasks.created` | tasks with a `createdAt` | DATA |
| `tasks.due30` | tasks given a due date 30+ days after the day they were added | DATA |
| `tasks.onTime` | one-off tasks finished on or before their due date | DATA |
| `tasks.doneAhead` | one-off tasks finished 2+ days before due | DATA |
| `tasks.doneLate` | one-off tasks finished after their due date | DATA |
| `tasks.neverMoved` | one-off tasks finished on time with no `date` activity after they were added | DATA |
| `tasks.oldDone30` / `oldDone180` / `oldDone365` | one-off tasks finished N+ days after they were added | DATA |
| `tasks.quickTurn` | one-off, not light (`gameIsLight`), finished within 7 days of being added | DATA |
| `tasks.doingDone` | finished tasks that were set to Doing first (`status` activity) | DATA |
| `tasks.reopenedDone` | one-off tasks with 2+ completion times | DATA |
| `tasks.doneWithNotes` | finished tasks with at least one note | DATA |
| `tasks.people4` | finished tasks linked to 4+ people | DATA |
| `tasks.oneSitting` | finished tasks with 3+ subtasks, all ticked and the task closed within 60 minutes of the first tick | DATA |
| `tasks.unblockedSameDay` | tasks finished on the day their last blocker was finished | DATA |
| `tasks.chain3` | chains of three tasks (C blocked by B, B blocked by A), all finished | DATA |
| `blocked.set` | tasks that have or had `blockedBy` (`blocked` activity) | DATA |
| `blocked.cleared` | finished tasks whose blockers were all finished before them | DATA |
| `tasks.p1Before10` | p1 tasks finished before 10:00 | DATA |
| `tasks.p1PlanHit` | p1 tasks finished on their planned day | DATA |
| `tasks.p1Week` | p1 tasks finished 7+ days before due | DATA |
| `tasks.p1Old` | p1 one-off tasks finished 30+ days after being added | DATA |
| `tasks.priorityChanges` | `priority` activity entries | DATA |
| `tasks.movedWithReason` | `date` activity entries that move a date later and carry a reason | DATA |
| `tasks.wontdo` | tasks closed as won't do (`resolution: 'wontdo'`) | DATA |
| `tasks.somedaySet` | tasks that carry or carried `#someday` (current tag or a `tags` activity) | DATA |
| `tasks.somedayDone` | finished tasks tagged someday | DATA |
| `tasks.restored` | `restored` activity entries | DATA |
| `tasks.withContext` | tasks with at least one context | DATA |
| `tasks.estimated` | tasks that have or had an estimate | DATA |
| `tasks.bigEstDone` | finished tasks estimated at 180+ minutes | DATA |
| `tasks.bigSplit` | tasks estimated at 120+ minutes with 3+ subtasks | DATA |
| `tasks.tinySameDay` | tasks estimated at 5 minutes or less, finished the day they were added | DATA |
| `tasks.reestimated` | `estimate` activity after a focus session on that task | DATA |
| `tasks.fromTemplate` | tasks with `createdVia: 'template'` | STAMP (`22-quick-add.js`, templates modal) |
| `tasks.fromWrapup` | tasks with `createdVia: 'wrapup'` | STAMP (`12-home-w-wrapup.js`) |
| `d.captured`, `capture.n` | tasks with `createdVia: 'capture'` per day / all time | STAMP (`24-quick-capture.js`); seed: open tasks with `inbox: true` |
| `capture.done`, `capture.sameDayDone` | captured tasks finished / finished the day they were caught | STAMP |
| `tasks.allEstimatedDay` → series `d.allEstimated` | the day's completions when every one-off finished that day had an estimate, else 0 | DATA |
| `w.allEst` | the week's completions when every one-off finished that week had an estimate, else 0 | DATA |
| `d.streamClear` | a stream's open count went from 5+ to 0 by completions | TICK `stream-clear` |
| `rhythm.comebacks7` | returns after 7+ days without a completion | DATA |
| `rhythm.minDow` | the lowest, over the seven weekdays, of the number of days with something done | DATA |
| `d.sameFirstHour` | 1 when the day's first completion is in the same clock hour as the day before's | DATA |
| `w.activeDays` | days with something done, per week | DATA |
| `d.notLate` | 1 on every day (since the first one) with no completion at or after 23:00 | DATA |
| `d.doneBy13` | 1 on a workday with 5+ done and nothing after 13:00 (repeating tasks ignored) | DATA |
| `d.steady` | 1 on a workday with between 3 and 10 done | DATA |
| `d.lunchBreak` | 1 on a workday with 5+ done and no completion or focus between 12:30 and 13:30 | DATA |
| `w.earlyFinish` | workdays of the week with 1+ done and nothing finished after 18:00 | DATA |
| `balance.weekendsOff` | weekends with 0 one-off completions after a week with 10+ done | DATA |
| `balance.longWeekends` | 4-day breaks (a weekend plus a Friday or Monday, no one-off completions) after a week with 10+ done | DATA |
| `balance.easyAfterBig` | days with 1-3 done straight after a day with 10+ | DATA |
| `balance.gentleReturn` | first days back after 7+ days away with 1-3 done | DATA |
| `balance.monthWeekendFree` | calendar months with no one-off completion at weekends and 40+ on weekdays | DATA |
| `w.lighter` | 1 when a week ended with fewer open tasks than it started with and 10+ were done (open = added before, not closed before; bin entries carry `binTs`) | DATA |

### Planning and estimates

| Fact | Meaning | Source |
|---|---|---|
| `plan.set` | `plan` activity entries with a `to` date | DATA |
| `d.planAhead` | tasks planned for day D by a `plan` entry made before D | DATA |
| `d.planClear` | 1 when 3+ tasks were planned for D at its start and all were finished by its end | DATA |
| `plan.slots` | `plan` entries with a `time` | DATA |
| `d.slots` | tasks with a time slot on day D | DATA |
| `plan.slotHits` | time-slotted tasks finished on their planned day | DATA |
| `d.top3` | 1 when the evening review of D saved a top 3 for the next day | DATA (`state.reviews` kind `evening`, `top3`) |
| `d.top3Done` | how many of the day before's top 3 were finished on D | DATA |
| `estimateHits` | timed tasks within 20% of the estimate | EXISTS |
| `est.timed` | finished one-off tasks with an estimate and 5+ timed minutes | DATA (the samples `gameEstimateLearn` reads) |
| `est.close` | the same, within 10% | DATA |
| `est.under` | the same, faster than the estimate | DATA |
| `est.exact` | the same, within 2 minutes of the estimate | DATA |
| `est.kinds` | kinds of work (first tag, else stream) with 3+ samples | DATA |
| `est.calibrated` | 1 when 20+ samples give an overall ratio between 0.9 and 1.1 | DATA |
| `w.planWeek` / `d.planWeek` | Plan my week saved with 1+ task planned | TICK `plan-week` (`34-sweep.js`) |
| `w.planFit` | ... and no planned day over its capacity | TICK `plan-fit` (key: the week start) |
| `d.dayplan` | Plan my day accepted on Home | TICK `dayplan` (`12-home-w-dayplan.js`) |
| `countdowns.n`, `countdowns.reached` | countdowns, and dated ones whose day has come | DATA |

### Reviews, notes, journal and memories

| Fact | Meaning | Source |
|---|---|---|
| `reviews`, `reviewStreak`, `daynotes` | as today | EXISTS |
| `w.review` | a weekly review saved for the week | DATA (`_gmReviewWeeks`) |
| `d.weekReview` | weekly reviews saved per day (`savedAt`) | DATA |
| `d.evening` | evening reviews ("Finish the day") per day | DATA |
| `d.eveningEarly` | evening reviews saved before 19:00 | DATA |
| `w.eveningWeekend` | 1 when both the Saturday and the Sunday of the week had an evening review | DATA |
| `w.outcomes`, `w.wins` | weekly reviews with outcomes / with at least one win line | DATA |
| `review.winLines` | win lines across weekly reviews | DATA |
| `review.triaged` | sum of `triage.reviewed` | DATA |
| `review.letGo` | sum of `triage.dropped + someday + binned` | DATA |
| `review.quick` | reviews with `triage.minutes <= 15` and `triage.reviewed >= 10` | DATA |
| `review.slipReasons` | reviews with a reason on at least one slipped task | DATA |
| `review.nudge5` | reviews with `triage.nudged >= 5` | DATA |
| `review.withMoney` | weekly reviews whose stats include spending | DATA |
| `d.brief` | morning brief seen | DATA (seen `brief`) |
| `d.story.morning` / `.evening` / `.week` / `.money` | a story played to the end | DATA (seen `storyPlayed:<kind>`) |
| `stories.kinds` | distinct story kinds played | DATA |
| `d.daynote` | daily notes per day | DATA (`state.daynotes`) |
| `notes.task` | notes written on tasks | DATA (`state.notes`) |
| `d.journal` | journal entries per day | DATA (`state.memories.journal`) |
| `journal.moodDays`, `journal.ownLines`, `journal.polished` | days with a mood / your own line / polished | DATA |
| `capsules.written`, `capsules.opened`, `capsules.longestOpened` | time capsules; the longest sealed time (days) of an opened one | DATA |
| `goals.years`, `goals.done` | years with New Year goals; goals ticked | DATA |
| `advent.doors`, `advent.bestYear` | advent doors opened; most in one December | DATA |
| `postcards.n`, `postcards.withNote` | first-visit postcards; ones with your line | DATA |
| `awards.wrapped` | Wrapped watched | DATA (game award kind `wrapped`) |

### Focus

| Fact | Meaning | Source |
|---|---|---|
| `focusSessions`, `focusHours`, `focusLongestMin` | as today | EXISTS |
| `d.focusMin` | focused minutes per day | DATA (`focus.byDay`) |
| `d.focusAM` | focused minutes before 12:00 per day | DATA |
| `d.focusHourDay` | 1 on a day with 60+ focused minutes | DATA |
| `focus.s25` / `focus.s50`, `d.s25` | sessions of 25+ / 50+ minutes; 25+ per day | DATA |
| `focus.before8` | sessions started before 08:00 | DATA |
| `focus.breaks` | gaps of 5 to 20 minutes between two sessions on the same day | DATA |
| `focus.bigBreak` | a 90+ minute session followed by a 15+ minute gap | DATA |
| `focus.stopDone` | sessions whose task was finished within 2 minutes of the session's end | DATA |
| `w.focusKinds` | distinct kinds of work focused on per week | DATA |
| `focus.p1Task2h` | p1 tasks with 120+ focused minutes in total | DATA |
| `focus.bossSiege` | boss tasks with 180+ focused minutes that were defeated | DATA |
| `focus.taskMaxMin` | the most focused minutes on one task | DATA |
| `focus.monthsInYear` | the most calendar months, in any one year, with 60+ focused minutes | DATA |

### Habits, rhythm and streaks

| Fact | Meaning | Source |
|---|---|---|
| `habitDone` | repeating ticks | EXISTS |
| `habits.created` | repeating tasks | DATA |
| `habits.bestDailyRun` / `bestWeeklyRun` / `bestMonthlyRun` | for one repeating task, the longest run of consecutive occurrences ticked | DATA |
| `habits.revived` | a repeating task ticked again after 14+ days without a tick | DATA |
| `habits.onTheHour` | repeating tasks with a `dueTime` ticked within 15 minutes of it | DATA |
| `habits.bestYearDays` | the most days in one calendar year one daily task was ticked | DATA |
| `habits.recurrenceChanged` | `recurrence` activity entries | DATA |
| `habits.firstMonthKept` | repeating tasks ticked on 80%+ of their due occurrences in their first 30 days | DATA |
| `d.habitsAll` | 1 when 3+ repeating tasks were due that day and all were ticked | DATA |
| `d.habitAM` / `d.habitPM` | repeating ticks before 09:00 / after 18:00 | DATA |
| `w.habitsDistinct` | distinct repeating tasks ticked per week | DATA |
| `w.habitWeekend` | 1 when a repeating task was ticked on the weekend of that week | DATA |

### People, calendar and meetings

| Fact | Meaning | Source |
|---|---|---|
| `peopleDistinct`, `peopleTasks` | as today | EXISTS |
| `people.n`, `people.birthdays`, `people.withNotes`, `people.pinned`, `people.withRole`, `people.withAvatar` | from `state.people` (the self record excluded) | DATA |
| `people.birthdayTasks` | tasks linked to someone finished within 2 days of their birthday | DATA |
| `people.reconnected` | tasks finished for someone after 180+ days with nothing for them | DATA |
| `people.bestMonths` | the most calendar months with a task finished for one person | DATA |
| `w.peopleDistinct` | distinct people with a task finished per week | DATA |
| `awards.person-catchup` | catch-ups | DATA (game award kind) |
| `people.merged`, `people.linksAccepted` | people merged; suggested links accepted | COUNT `people-merge`, `link-accept` |
| `d.oweClear` | the I owe list went from 3+ to 0 | TICK `owe-clear` |
| `cal.meetings`, `d.meetings` | past timed events (all-day ones excluded) | DEVICE (calendar cache) |
| `d.noMeetingsWorkday` | 1 on a workday with no timed event | DEVICE |
| `cal.quietWeeks` | workweeks with 3 hours of meetings or less and 10+ done | DEVICE + DATA |
| `people.metDistinct` | distinct People met in timed events | DEVICE (`recapBuild` meetings) |
| `people.meetingFollowups` | tasks linked to a person finished within 2 days of a meeting with them | DEVICE + DATA |
| `cal.prepBefore` | events with notes written before the event started | DATA (`state.eventMeta`) |
| `cal.linkedTasks` | events linked to a task | DATA |
| `wrapup.sameDayDone` | follow-up tasks from After meetings finished the same day | STAMP |
| `d.gap` | Fill the gap used | TICK `gap` |
| `cal.created`, `cal.invitesHandled` | events created from OpenDash; invites and clashes handled | COUNT `cal-created`, `cal-invite` |

### Inbox, capture, review tools and craft

| Fact | Meaning | Source |
|---|---|---|
| `inboxDays` | days at reply inbox zero | EXISTS |
| `d.inboxZero` | reply inbox zero per day | DATA (ticks `inbox` + seen `inboxZero`) |
| `d.inboxEmpty` | the task Inbox emptied after 3+ captures that day | TICK `inbox-empty` |
| `inbox.sorted`, `inbox.sortedFast` | captured tasks sorted; sorted within an hour of capture | COUNT `inbox-sorted`, `inbox-sorted-fast` |
| `qa.syntax`, `qa.rich` | tasks added with quick-add shortcuts; with a date, a priority and a tag in one line | COUNT `qa-syntax`, `qa-rich` |
| `bulk.big` | bulk adds of 10+ tasks | COUNT `bulk-big` |
| `triage.accepted`, `triage.handled` | email suggestions accepted; accepted or dismissed | DATA (`state.emailTriage`) |
| `d.sweep`, `sweep.cleared` | the Today sweep used; swept until nothing was left | TICK `sweep`; COUNT `sweep-cleared` |
| `d.cleanup`, `cleanup.decided`, `cleanup.seasons` | clean-ups finished; stale tasks decided; distinct seasons with a clean-up | TICK `cleanup`; COUNT `cleanup-decided` |
| `d.overdueClear` | overdue went from 1+ to 0 during the day | TICK `overdue-clear` |
| `d.overdueNone` | a check found 0 overdue with 5+ open | TICK `overdue-none` |
| `d.allPrioritised` | a check found every open task with a priority (20+ open) | TICK `all-prioritised` |
| `d.nodateZero`, `d.todayClear`, `d.waitingEmpty`, `d.staleNone`, `d.zeroOpen` | No date 5+ to 0; Today 5+ to 0 by completions; Waiting 3+ to 0; nothing untouched for 60 days (20+ open); nothing open at all (50+ done ever) | TICKs `nodate-zero`, `today-clear`, `waiting-empty`, `stale-none`, `zero-open` |
| `tags.edits` | tag renames and merges | COUNT `tag-edit` |
| `streams.archived`, `streams.marked` | archived streams; streams with their own icon or shape | DATA |
| `smartLists.n`, `boards.n`, `boards.lanes` | smart lists; saved boards; boards with swimlanes | DATA |
| `sidebar.pins`, `home.widgets`, `home.copies`, `templates.n` | pins; widgets on Home; widget copies; task templates | DATA |
| `d.palette` | command palette opened | TICK `palette` |
| `sync.devices` | devices in sync | DEVICE (`/api/sync/status`) |
| marks | see 2.1.4 for every MARK kind (`view`, `view-mode`, `cal-mode`, `gkey`, `do-now`, `sidebar-custom`, `export`, `backup-month`, `capture-launcher`, `capture-page`, ...) | MARK |

### Waiting and handing off

| Fact | Meaning | Source |
|---|---|---|
| `waiting.set` | waits started (`waiting` activity "Waiting on ...") | DATA (add `kind: 'set' / 'unset' / 'nudge'` to new entries; older ones read by their text) |
| `waiting.arrived` | finished tasks that were waiting when finished | DATA |
| `waiting.nudged` | follow-ups ("Followed up") | DATA |
| `waiting.nudgeWorked` | waiting tasks finished within 3 days after a follow-up | DATA |
| `waiting.people` | distinct people waited on | DATA |
| `waiting.within1`, `waiting.long60` | finished within 1 day / 60+ days after the wait began | DATA |

### Money (private, device-computed)

| Fact | Meaning | Source |
|---|---|---|
| `noSpendBest`, `noSpendDays` | as today | EXISTS (DEVICE) |
| `money.budgets` | budgets set | DEVICE (`src/finance/36-budgets.js`) |
| `money.nospendWeekends` | weekends with two no-spend days | DEVICE |
| `money.belowAvgWeeks` | complete weeks with spending below your own 12-week average (a yes or no per week; amounts never stored) | DEVICE |
| `d.finTx`, `w.finVisit` | new transactions looked at; Finances opened | TICK `fin-tx`, `fin-visit` |
| `money.recategorised` | transactions re-categorised | COUNT `fin-recat` |
| marks `fin-on`, `fin-recurring`, `fin-whatif`, `budget-ok` (month keys) | connected; recurring payments viewed; What if used; a month closed under budget | MARK (seed `budget-ok` from the budgets history on first run) |

### Places and travel (private, device-computed)

| Fact | Meaning | Source |
|---|---|---|
| `places`, `cities`, `countries` | as today | EXISTS |
| `places.continents`, `places.km`, `places.zonesCrossed`, `places.longestAway`, `places.furthestKm`, `places.tasksAbroad` | from `locationsFacts()` (`continents`, `km`, `zonesCrossed`, `longestAway`, `furthest.km`, `tasks.abroad`) | DEVICE |
| `places.maxCityDone` | the most tasks finished in one town | DEVICE (`tasks.byCity`) |
| `places.hotDone`, `places.coldDone` | 1 when you were somewhere at 30 °C or more / below 0 °C | DEVICE (`hottest`, `coldest`) |
| `places.newPlaceMonths`, `places.newCitiesMonthMax` | months with a first visit to a town; the most first visits in one month | DEVICE (`cities[].first`) |
| `locBadge.<id>` | 1 when the locations module's badge is earned (`south`, `arctic`, `away-7`, `away-30`, `done-abroad-10`, ...) | DEVICE (`locBadges`) |
| `trips.confirmed` | confirmed trips | DATA (`state.travel.trips`) |

### Friends and together (device-computed from the friends server)

| Fact | Meaning | Source |
|---|---|---|
| `friends`, `coopDone`, `cheersSent`, `giftsSent`, `duoBest`, `high5Double`, `friendQuests`, `stickersDistinct`, `candyBest`, `planSundays` | as today | EXISTS |
| `fun.wavesSent`, `fun.thanksSent` | waves / thank-yous sent | DEVICE: add to the `facts` object in `lib/friends/fun.mjs` (counts of `out` messages of those kinds) |
| `fun.postcardsSent` | scene postcards sent | DEVICE (`lib/friends/postcards.mjs` store) |
| `fun.friendLevelMax` | the highest friendship level with anyone | DEVICE (fun answer) |
| `fun.stickersCore` | stickers collected that are not seasonal (11 exist) | DEVICE (`doc.book` against `FUN_STICKERS`) |
| `together.spaces`, `together.sharedDone`, `together.planCards`, `together.assignedAccepted` | joined spaces; shared items you finished; plan cards you added; tasks you handed over that were accepted | DEVICE (`tgAllSpaces()`) |
| `together.focusSessions`, `together.focusMin` | Focus together sessions and minutes | DEVICE (`99-together-3game.js`; add a game award kind `focus-together` with `n` minutes if no record exists) |
| `together.goalWeeks` | weeks with an accountability goal hit | DATA (awards `goal-hit` by week) |
| `awards.team-quest`, `awards.trophy`, `awards.goal-hit` | team quests, challenge trophies, goals hit | DATA (game awards) |
| marks `friend-in-scene`, `event-costume`, `find-a-time` | a friend walked through your scene; costume worn during an event; Find a time used | MARK |

### Game

| Fact | Meaning | Source |
|---|---|---|
| `bossDefeated`, `bossBig`, `questsDone`, `questPerfect`, `level`, `xpDay` | as today | EXISTS |
| `d.xp`, `d.boss` | XP per day; bosses defeated per day | DATA |
| `w.questPerfect` | 1 for a week with every quest done | DATA |
| `game.bonusDone`, `game.bossSameDay`, `game.bossP1`, `game.questKinds` | bonus tasks finished; bosses defeated on the day they were made; p1 bosses; kinds of quest completed | DATA |
| `game.comboBest` | the longest combo (tasks under 20 minutes apart) | DATA: add record key `combo` to `state.game.records` in `_gmTaskDone` |
| `game.recordsBroken` | personal-record moments | COUNT `record` |
| marks `fun-full`, `accent`, `konami`, `ring` | Fun set to Full; an unlocked accent chosen; the two Game page secrets | MARK |

### Scenes and seasons

| Fact | Meaning | Source |
|---|---|---|
| `scenes.seen`, `scenes.packs` | distinct full scenes watched for 20+ seconds while visible; distinct packs among them | MARK `scene` (key: the scene ref; seed from seen `openingLast` / `openingExact`) |
| `scenes.local` | 1 when a scene of where you live was watched | MARK `scene-local` |
| marks `scene-tod`, `scene-wx`, `scene-season`, `festival`, `sky` | dawn/day/dusk/night; rain/snow/fog/storm; seasons; festival moments; tonight's sky items seen | MARK |
| `scenes.firstSnow` | first snowy days seen | DATA (seen `firstSnow`) |
| `d.opening` | the opening scene played | DATA (seen `opening`) |
| `anim.overrides` | scenes chosen for your moments | DATA (`animPrefs.overrides`) |
| `anim.rewardsAll` | 1 when every rewards-pack item is unlocked | DATA |

### You, profile and pages

| Fact | Meaning | Source |
|---|---|---|
| `profile.avatarEdits` | 1 when the avatar is no longer the starting one | DATA (`state.profile`) |
| `profile.complete` | 1 when name, pronouns, bio and "working on" are filled in | DATA |
| `profile.collected` | seasonal pieces collected | DATA (`profile.collected`) |
| `profile.lookSeasons` | the most seasons in one year with an avatar change | MARK `look-season` (`YYYY-spring`) |
| `d.status` | a status set | TICK `status` |
| `d.holiday` | the holiday status was on | TICK `holiday` |
| marks `status-holiday`, `status-break`, `badges-picked` | presets used; badges chosen | MARK |
| `d.open` | the app opened | TICK `open` (seed: days in seen `brief` / `opening` and days with a completion) |
| `rhythm.anniversary` | opened on the anniversary of the first day | DATA from `d.open` and `daysWithUs` |
| `pages.visitedAll` | 1 when every available page in the pages registry has a `view` mark | MARK `view` (NAVIGATION_PLAN.md) |
| `secret.done1111`, `secret.doneMidnight`, `secret.hoursCovered` | completions at 11:11; at 00:00; distinct clock hours with a completion | DATA |
| `secret.birthdayOpen`, `secret.newYearOpen` | opened on your birthday (`APP_CONFIG.birthday`); opened between 00:00 and 01:00 on 1 January | DATA from `d.open` + TICK time |

### 1.8 The 2.18 modules (planned signals)

The 2.18 branches (`feat/218-garden-engine`, `-pets`, `-wardrobe`,
`-you`, `-garden-art`) had no commits yet when this plan was written, and
`feat/218-garden-social` did not exist yet. So this is a **contract to propose to
those modules**, not a reading of their code. Each module exposes ONE pure-ish
function returning counts (no names, no text), registered with
`registerAchFacts()` (section 2.1.5). If a merged module chose other names, keep
the achievement ids and wording and map the module's numbers in the provider.

| Provider | Facts | Series |
|---|---|---|
| `gardenAchFacts()` (garden engine + garden social) | `garden.planted`, `garden.species`, `garden.harvests`, `garden.decor`, `garden.decorDistinct`, `garden.visitorsDistinct`, `garden.visitorsCommonAll` (0/1), `garden.visitorsRare`, `garden.shopBuys`, `garden.level`, `garden.almanac`, `garden.bloomSeasons`, `garden.focusGrown`, `garden.friendVisits`, `garden.friendWaters`, `garden.swaps` | `d.gardenTend` (1 on a day you tended it) |
| `petAchFacts()` | `pets.adopted`, `pets.named`, `pets.treats`, `pets.tricks`, `pets.tricksAll` (0/1), `pets.levelMax`, `pets.focusSessions`, `pets.kindsAll` (0/1), `pets.outfits`, `pets.pats`, `pets.inGarden`, `pets.oldestDays` | `d.petCare` |
| `wardrobeAchFacts()` | `wardrobe.items`, `wardrobe.outfits`, `wardrobe.sets` | none |
| `youAchFacts()` | `you.titles` | none; marks `you-banner`, `you-nameplate`, `you-title` when one is first set |

Until a provider exists its facts read 0 and its category shows as one calm
row ("Comes with the garden"), never as 20 locked cards (section 2.5).

### 1.9 Names as built (B0) and the recalibration's facts

B0 reads counters by one rule, so a tick, count or mark needs no code of its
own in the facts: **a tick kind `k` is the series `d.k` (one per day) and
`w.k` (days that week) and the fact `t.k` (days in all); a count kind `k` is
the fact `c.k` (the total of every month and device) and the series `c.k`
(per month, keyed `YYYY-MM-01`, so `cal` works on it); a mark kind `k` is read
with `{mark: k}` or `{has: [k, key]}` and the fact `m.k`.** So the camelCase
TICK names in 1.7 are, as built: `d.overdueClear` = `d.overdue-clear`,
`d.overdueNone` = `d.overdue-none`, `d.allPrioritised` = `d.all-prioritised`,
`d.nodateZero` = `d.nodate-zero`, `d.todayClear` = `d.today-clear`,
`d.waitingEmpty` = `d.waiting-empty`, `d.staleNone` = `d.stale-none`,
`d.zeroOpen` = `d.zero-open`, `d.streamClear` = `d.stream-clear`,
`d.inboxEmpty` = `d.inbox-empty`, `d.oweClear` = `d.owe-clear`, `d.planWeek` /
`w.planWeek` = `d.plan-week` / `w.plan-week`, `w.planFit` = `w.plan-fit`,
`d.finTx` = `d.fin-tx`, `w.finVisit` = `w.fin-visit`; and the COUNT facts:
`sweep.cleared` = `c.sweep-cleared`, `cleanup.decided` = `c.cleanup-decided`,
`tags.edits` = `c.tag-edit`, `inbox.sorted` = `c.inbox-sorted`,
`inbox.sortedFast` = `c.inbox-sorted-fast`, `qa.syntax` = `c.qa-syntax`,
`qa.rich` = `c.qa-rich`, `bulk.big` = `c.bulk-big`, `people.merged` =
`c.people-merge`, `people.linksAccepted` = `c.link-accept`, `cal.created` =
`c.cal-created`, `cal.invitesHandled` = `c.cal-invite`, `money.recategorised` =
`c.fin-recat`, `game.recordsBroken` = `c.record` (B0 counts it already). The
tables in section 3 use the as-built names. A batch may add a friendlier alias
in its source if it wants, but conditions must name something a source makes
(`tools/ach-dayone.mjs` lists the ones nothing makes).

Already made by B0 (no batch needs to add them): every fact the core 78 read,
`xpTotal`, `game.comboBest` (the record `combo`, kept by `_gmTaskDone`), and the
series `d.done`, `d.doneAny`, `d.p1Done`, `d.streams`, `d.focusMin`, `d.xp`,
`d.boss`, `d.evening`, `d.weekReview`, `w.review`, `d.daynote`, `d.inboxZero`,
`w.activeDays`, `d.open`; the ticks `open` (99-boot.js), `overdue-none`,
`all-prioritised`, `stale-none`, `zero-open` and `holiday` (the periodic
check), the count `record` and the marks `open42`, `konami` and `ring`.

New or changed facts in the recalibrated tables (each batch adds its own
source or hook):

| Fact | Meaning | Source | Batch |
|---|---|---|---|
| `plan.hits` | one-off tasks finished on the day a `plan` entry set for them | DATA | B1 |
| `est.calibrated` | 1 when **50+** timed samples give an overall ratio between 0.9 and 1.1 | DATA | B1 |
| `d.brief`, `d.story-morning`, `d.story-evening`, `w.story-week`, `d.story-money`, `d.opening` | the brief seen, a story played to the end, the opening played | TICK `brief`, `story-<kind>`, `opening` (seen days unioned in: they are pruned after three weeks) | B1, B3, B5 |
| `d.doingDone` | tasks finished that were set to Doing first, per day | DATA | B2 |
| `d.doneWithNotes` | tasks finished that have a note, per day | DATA | B2 |
| `d.do-now`, `d.capture-page` | "What can I do now?" asked; the capture page used, per day | TICK (were MARKs) | B2 |
| `mark export-month` | a view exported or printed (key `YYYY-MM`) | MARK (was `export`) | B2 |
| `focus.monthsInYear` | the most months of one year with **10+ hours** of focus | DATA | B2 |
| `w.weekendOff` | 1 for a week whose weekend had no one-off completion after 10+ done that week | DATA | B3 |
| `d.status-break`, `d.rediscover` | the On a break status set; a day rediscovered | TICK (were MARKs) | B3 |
| `mark fin-recurring`, `mark fin-whatif` | recurring payments viewed; What if used (key `YYYY-MM`) | MARK (keys are months now) | B3 |
| `w.belowAvg` | 1 for a complete week spent below your own 12-week average (no amounts) | DEVICE (`_gmFinLoad`) | B3 |
| `c.find-a-time` | Find a time used | COUNT (was a MARK) | B4 |
| `d.fun-full` | a day with the Fun level on Full | TICK (the periodic check) | B4 |
| `mark friend-in-scene` | a friend walked through your scene (key: the day) | MARK | B4 |
| `mark event-costume` | the costume worn during an event (key: the event id) | MARK | B4 |
| `mark you-banner`, `you-nameplate`, `you-title` | a banner, nameplate or title used (key: its id) | MARK (2.18 you) | B5 |
| `d.where-was-i` | "Where was I on...?" asked, per day | TICK (was a MARK) | B5 |

---

## 2. Design

### 2.1 The counters layer

Most of the 500 read DATA facts (back-filled for free). The rest need a trace
of a moment the data cannot show. One small layer, inside `state.game`, covers
all of them.

#### 2.1.1 Three shapes, chosen so two devices never clash

| Shape | Where | Merge (lib/sync/model.mjs) | Use it for |
|---|---|---|---|
| **tick** (exists) | `state.game.ticks[kind][day] = 1` | `map(map())`: one register per day; two devices write the same value | "did X on this day": everything that needs runs, day counts or "on a date" |
| **count** (new) | `state.game.counts[kind]['YYYY-MM|slot'] = n` | `map(map())`: one register per month and device slot; only one device ever writes a register | totals and per-month windows of events that happen several times a day |
| **mark** (new) | `state.game.marks[kind][key] = 'YYYY-MM-DD'` | `map(map())`: one register per key; the first day is kept on read (two devices may write different days: read the smaller) | firsts and distinct collections (pages visited, scenes watched, view modes, months under budget) |

`slot` is a random 6-character id per browser profile, kept in
`localStorage['opendash-ach-slot']`. It is bookkeeping, not a preference, so it
never syncs. If it is lost a new slot starts; the old registers stay and still
add up, so nothing is lost or double-counted.

Rules that keep it cheap and safe:

- A count is only ever read as a **total** or a **month window**. Anything that
  needs "in one day" or "N days running" must use a tick or a DATA series.
- Month buckets older than 24 months fold into `'YYYY|slot'` (this device's
  own keys only, so the fold never clashes).
- Marks are capped at 1,000 keys per kind (scenes are the largest, about 600).
- Keys are **ids from the app's own tables only**: page ids, scene refs, widget
  ids, settings group ids, view modes, `YYYY-MM`. Never task titles, people,
  places, amounts or free text. The privacy scan rule for tracked files applies
  to these kind names too.

Sync changes (one line each):

```js
// lib/sync/model.mjs SYNC_SPEC (as built)
game: rec({ prefs: rec(), awards: map(rec()), ticks: map(map()), counts: map(map()), marks: map(map()),
            focus: map(rec()), quests: map(rec({ done: map() })), records: map(rec()), seen: rec({ milestones: map(), wallOpen: map() }) }),
achievements: rec({ unlocked: map(), notes: map(), hist: map(), packs: map() }),
```

and the `game` and `achievements` lines in `lib/sync/manifest.mjs` say
"counts per month and device, marks (first day per key)" and "which unlocks
came from history". `_gmG()` in `92-game-1core.js` adds `counts` and `marks` to
its list of sub-objects.

#### 2.1.2 The API (as built in B0)

Page side, `src/app/92-game-4facts.js` (safe at any time, never throws):

```js
gameStreakTick(kind, day?)   // 92-game-1core.js: the tick. Kinds are [a-z0-9-]{1,24}.
gameCount(kind, n = 1)       // += n in this month's bucket for this device slot -> this device's month total
gameMark(kind, key)          // set once: marks[kind][key] = today (keys: app ids, [A-Za-z0-9:_./-]{1,64}) -> true when new
registerAchFacts(id, fn)     // a DEVICE provider: fn() -> {n: {fact: number}, s: {series: {key: number}}, m: {kind: {key: day}}}
                             // or a flat {fact: number}; read once a minute at most, in a try
registerAchCheck(id, fn)     // a periodic check fn({today, counts(), tick(k), mark(k, key), count(k, n)}): load, then every 5 minutes
gameFacts()                  // the facts view achEval reads (memoised with gameStats' key)
gameFactsRaw()               // {n, s, m, errors}
gameFactsBoot()              // 99-boot.js, after the state file: today's 'open' tick, then the checks
window.OpenDashGame          // + count, mark, facts, registerFacts, registerPack
```

Pure side, `src/app/71-ach-1facts.js` (Node loads it too):

```js
registerAchFactSource(id, fn, {order})   // a DATA source: fn(ctx, out), run once per facts build
achFactsCompute({data, today, weekStart, birthday, partsOf, pre?, extra?}) -> {n, s, m, errors}
achFactsMerge(raw, extra)                 // providers in: numbers keep the larger, series per key, marks added
achFactsView(raw, {today, weekStart, birthday, unlocked, hist}) -> F   // what achEval reads
```

Providers that need no registering (read when the function exists):
`gameAchFacts` (the game's facts, finance and places included), `funAchFacts`
(friends), and the 2.18 contract names `gardenAchFacts`, `petAchFacts`,
`wardrobeAchFacts`, `youAchFacts` (1.8).

#### 2.1.3 Facts: one pass, one memo (as built)

- `achFactsCompute` runs every registered source once, in order, over one
  prepared context: the tasks map, the completion entries exactly as XP counts
  them (`gameXpFromLog`: a one-off task once, a repeating task once a day), the
  focus sessions, `state.game` with every sub-object, `state.seen`, Clock's
  local day and hour for any time stamp (cached), and the week helpers. On the
  page `gameFactsRaw()` hands it gameStats' own pass (`pre: {xt, sessions}`),
  so the log is walked once. The result is memoised with gameStats' key plus a
  counter that every tick, count, mark, pack and provider bumps.
- Built-in sources: `counters` (every tick kind `k` -> series `d.k`, `w.k` and
  fact `t.k`; every count kind -> fact `c.k` and month series `c.k`; every mark
  kind -> `m[k]` and fact `m.k`) and `core` (the 78's facts exactly as
  `_gmCompute` counts them, and the common series `d.done`, `d.doneAny`,
  `d.p1Done`, `d.streams`, `d.focusMin`, `d.xp` (achievement XP excluded),
  `d.boss`, `d.evening`, `d.weekReview`, `w.review`, `d.daynote`,
  `d.inboxZero`, `w.activeDays`, `d.open`, and `xpTotal`, `game.comboBest`).
- Batches add their DATA facts as sources in their own pack file (B1 to B5),
  never by editing another batch's source.
- Design budget unchanged: facts in about 15 ms with 3 years of data, the
  check of locked achievements in about 5 ms.

#### 2.1.4 Event hooks (who calls what)

| Kind | Shape | Called from |
|---|---|---|
| `sweep` | tick | `34-sweep.js` when the sweep closes after 1+ decision |
| `sweep-cleared` | count | same, when nothing was left in Today |
| `cleanup` / `cleanup-decided` | tick / count (`ctx.decided`) | `34-cleanup.js` finish |
| `plan-week` / `plan-fit` | tick (the day) / tick (key: the week start) | `34-sweep.js` Plan my week saved with 1+ task planned; `plan-fit` when no day is over capacity |
| `dayplan` | tick | `12-home-w-dayplan.js` plan accepted |
| `overdue-clear`, `nodate-zero`, `today-clear`, `waiting-empty`, `stream-clear` | tick | `15-nav-sidebar.js sidebarCounts()`: keep last session's numbers in memory; tick on the change from N+ to 0 described in 1.7 (`today-clear` and `stream-clear` only when the drop came from completions) |
| `overdue-none`, `stale-none`, `zero-open`, `all-prioritised`, `holiday` | tick | `92-game-4facts.js` periodic check (load, then every 5 minutes while visible, the same timer as `_gmCheckSoon`) |
| `inbox-empty` | tick | `24-quick-capture.js _qcapMaybeZero` (3+ captured that day) |
| `inbox-sorted`, `inbox-sorted-fast` | count | `24-quick-capture.js inboxOnActivity` (fast: added under an hour ago) |
| `owe-clear` | tick | `12-home-w-owe.js` |
| `gap` | tick | `12-home-w-gap.js` when a task is picked for the gap |
| `palette` | tick | `16-command-palette.js` open |
| `gkey` | mark (the letter) | `90-wiring.js` G-key handler |
| `view` | mark (page id from the pages registry; never `person:<id>` and the like) | `setView()` in `15-nav-sidebar.js` via `pagesMarkSeen` (NAVIGATION_PLAN.md) |
| `view-mode` | mark (`list`, `kanban`, `timeline`, `matrix`, `calendar`, `review`) | `31-views-switcher.js` |
| `cal-mode` | mark (`month`, `week`, `day`, `agenda`) | `41-calendar-section.js` |
| `settings-group` | mark (group id) | `57-settings.js` when a group is shown |
| `widget` | mark (widget base id) | `12-home-edit.js` when a widget is added or first rendered on the board |
| `do-now`, `sidebar-custom`, `export`, `backup-month`, `capture-launcher`, `capture-page`, `where-was-i`, `recap-month`, `rediscover`, `badges-picked` | mark | `24-do-now.js`, `15-nav-custom.js sbLayoutEdit`, `14-shell.js` export / print / backup items (`backup-month` key `YYYY-MM`), `24-quick-capture.js`, `90-locations-view.js locWhereWasI`, `79-story-recap.js` (key `YYYY-MM` of the month played), `93-memories-page.js`, `97-profile-2ui.js` |
| `qa-syntax`, `qa-rich`, `bulk-big` | count | `22-quick-add.js` (`qa-rich`: date + priority + tag in one line), `23-quick-add-dialog.js` (10+ tasks) |
| `tag-edit` | count | `26-tags-section.js` / `27-tags-logic.js` rename and merge |
| `people-merge`, `link-accept` | count | `50-people.js` merge; `66-autolink.js` / `52-people-link.js` accept |
| `cal-created`, `cal-invite` | count | `44-calendar-write.js`; `12-home-w-calcheck.js` |
| `fin-tx`, `fin-visit` | tick | `src/finance/37-transactions.js`; `65-finance-view.js` mount |
| `fin-recat` | count | `src/finance` category edit |
| `fin-on`, `fin-recurring`, `fin-whatif`, `budget-ok` | mark | finance connect / import, Recurring section shown, What if used, `36-budgets.js` month closed under budget (key `YYYY-MM`, also seeded from budgets history) |
| `status`, `status-holiday`, `status-break` | tick / mark / mark | `97-profile-1core.js profileSet` when a status is set |
| `look-season` | mark (`YYYY-<season>`) | `97-profile-1core.js` when the avatar changes |
| `record` | count | `92-game-1core.js` where the personal-record moment fires |
| `fun-full`, `accent` | mark | `gamePrefSet` |
| `konami`, `ring` | mark | `92-game-5wall.js` (a key listener on the Game page; 10 clicks on the hero ring within 4 s) |
| `scene`, `scene-local`, `scene-tod`, `scene-wx`, `scene-season`, `festival`, `sky` | mark | `78-scene-host.js` / `78-scene-player.js`: a full scene visible for 20 s (keys: the ref, its time of day, weather, season); `71-anim-almanac.js` festival moments; the sky slot |
| `friend-in-scene`, `event-costume`, `find-a-time` | mark | `99s-friends-scenes-1visit.js`; `99f-fun-1core.js funInCostume` during an event; Together Find a time |
| `open` | tick | `99-boot.js` first render of the day |
| `you-banner`, `you-nameplate`, `you-title` | mark | 2.18 you module, first time one is set |
| `flipflop`, `theme-flip`, `open42` | mark | secrets: a task done, undone and done within a minute (`toggleDone`); 5 theme switches within a minute (`14-shell.js`); exactly 42 open tasks seen by the periodic check |
| `bin-empty` | mark (key `YYYY-MM`) | the bin's "Empty the bin" action (`renderBin`) |

`createdVia` stamps (data, not counters): `'capture'` (quick capture),
`'template'`, `'wrapup'`, `'bulk'`, `'triage'`, `'assistant'`, `'mcp'`, `'ui'`.
Set them where tasks are created; old tasks have `'ui'` or nothing and simply do
not count.

#### 2.1.5 Back-fill, so long-time users do not start at zero (as built)

1. **DATA and DEVICE facts** are computed from history: they back-fill with no
   extra work. That is why the calibration (3.2) keeps their early tiers to
   runs and windows.
2. **Seeds are virtual**: a source unions the history into a series when it is
   computed, and nothing is written. `d.open` = the `open` ticks plus every day
   the brief, the opening or Home's read-along was seen, plus every day with a
   completion, an evening or weekly review or a daily note. Later seeds follow
   the same pattern (`scene` marks from `seen.openingLast`/`openingExact`,
   `budget-ok` from the budgets history). Seen day entries are pruned after
   three weeks, so anything that must count past that is a TICK (`brief`,
   `story-morning`, `story-evening`, `story-week`, `story-money`, `opening`),
   with the seen days unioned in.
3. **History mode, per pack**: `state.achievements.packs[id]` holds the day a
   pack (and `core`) was first checked. For the rest of THAT session, every
   unlock of that pack is history: unlocked quietly, dated that day, listed in
   `achievements.hist`, paid at half XP (2,000 at most in all), its level taken
   quietly. Device providers that report late in the session still count as
   history. After 8 seconds one calm toast says "You'd already earned 23
   achievements from your history (+840 XP, level 31)"; the Achievements page
   shows a "You'd already earned these" card (Show them / Dismiss with Undo)
   until dismissed. Never a flood of toasts. The core's earlier unlocks are
   paid their XP once the same way (`achievements.xpPaid`).
4. The checker waits for the state file (`gameFactsBoot` from 99-boot.js)
   before it marks any pack as checked, so an empty browser cache can never
   turn history into "new".
5. TICK, COUNT and MARK kinds start at zero on the update day. Their
   achievements say so nowhere: they simply fill up from now on.

### 2.2 The condition format

Every new definition has a `when` condition. The 78 existing ones keep
`fact` + `of` and are read as `{n: fact, gte: of}`.

```text
Cond :=
  {n: Fact, gte: N}                          a number reaches N
| {days: Series, min?: M = 1, gte: N, on?: Filter}
                                             units (days, or weeks for w.*) with value >= M
| {run: Series, min?: M = 1, gte: N, skip?: 'weekend', freeze?: false, on?: Filter}
                                             the longest run of consecutive units with value >= M
                                             (skip: weekends neither count nor break it;
                                              freeze: gameStreak's freezes bridge gaps)
| {win: Series, span: D, gte: N}             the best sum over D consecutive days (span 1 = the best day)
| {cal: 'week'|'month'|'quarter'|'year', s: Series, gte: N, times?: T = 1}
                                             calendar periods whose sum reaches N, at least T of them
| {same: [[Series, min, max?], ...], gte: N, on?: Filter}
                                             days on which every listed series is between its min and max
| {all: [Cond, ...]}  |  {any: [Cond, ...]}
| {ratio: [Fact, Fact], gte: R, minOf: K}    numerator / denominator >= R once the denominator >= K
| {mark: Kind, gte: N}                       distinct keys marked
| {has: [Kind, Key]}                         one key marked
| {meta: {cat?, shelf?, tier?, rarity?, secret?, series?, shelves?, catComplete?, inWeek?, all?}, gte: N}
                                             achievements earned that match
Filter := {dow?: [0..6], md?: 'MM-DD' | ['MM-DD', ...], from?: 'MM-DD', to?: 'MM-DD',
           m?: [1..12], fri13?: true, palindrome?: true, fullMoon?: true, birthday?: true}
```

Notes:

- **Progress** is `{n, of}`: the current best against the target (`days`: units
  so far; `run`: the longest run so far; `win`: the best window; `all`: parts
  met of parts; `same`: matching days). Progress only ever goes up on the wall
  (the best ever, not the current run), so nothing visibly "drops".
- **Filters** use the local day (Clock). `fullMoon` uses a fixed synodic
  formula (29.530588853 days from 2000-01-06 18:14 UTC, the day containing the
  full moon); `birthday` reads `APP_CONFIG.birthday` (`MM-DD`), never a person.
- **Firsts** are `{n: fact, gte: 1}` or `{has: [...]}`; no special case.
- **Secret** and **seasonal** are flags on the definition, not operators.
- The evaluator `achEval(cond, F)` is pure (`71-ach-0dsl.js`). Inside one check
  it memoises by `JSON.stringify(cond)` and caches per series the derived
  arrays (sorted keys, running sums, longest runs), so 578 rules over 3 years
  of days stay cheap.
- Only **locked** achievements are evaluated on a check. The wall evaluates the
  progress of the cards it draws (lazily, per category opened).

#### The definition

```js
{ id: 'pl-top3-kept', cat: 'planning', name: 'Called it',
  desc: "Finish all three of yesterday's top three today.",
  when: { days: 'd.top3Done', min: 3, gte: 1 },
  rarity: 'uncommon',               // xp comes from rarity (2.3); never set xp by hand
  icon: 'target',                   // a Lucide name the app already ships
  series: null, tier: null,         // or series: 'planner', tier: 'bronze'|'silver'|'gold'|'platinum'
  unlock: null,                     // or 'title:Oracle' | 'banner:id' | 'plate:id' | 'wear:slot-id' | 'seed:id' | 'decor:id' | 'treat:id' | 'accent:id' | 'anim:pack/item'
  secret: false, clue: '',          // secret: true shows '???' and the clue until earned
  season: null,                     // {from: 'MM-DD', to: 'MM-DD'}: shown "in season" then; the condition must also hold inside it
  needs: null,                      // 'finance' | 'locations' | 'travel' | 'calendar' | 'friends' | 'claude' | 'sync' | 'garden' | 'pets' | 'wardrobe' | 'you'
  private: false }                  // never auto-shown as a badge or sent to friends (money, places, health-ish)
```

Packs register with `registerAchievementPack({id, label, defs})` (or
`achPack(id, defs, label)`; `71-ach-0dsl.js`), from any file at any time: a
pack file that loads before `71-achievements.js` waits for the core 78, a 2.18
module that registers later is linted and added at once (and checked soon).
The lint is a **runtime guard, not a test suite**; it skips with
`console.warn('[ach] skipped <id> (<pack>): <why>')` a definition with: an id
that is not `<prefix>-<slug>` (24 characters at most, the category's prefix), a
duplicate id, a duplicate name (case and punctuation folded, the core 78
included), a duplicate canonical condition, an unknown category, rarity,
operator or unlock kind, a name over 28 or a description over 90 characters, a
banned word (2.7), or a tier without a series. Settings > Diagnostics shows
"Achievements: 578 loaded, 0 skipped (...)". `ACH_DEFS` is the LIVE list (core
first, then packs in registration order); `achDef(id)` is a map lookup.

### 2.3 Rarity, XP and history

Recalibrated 24 Oct (3.2): hard by default, and XP doubles with each step so
an achievement pays like the effort it took.

| Rarity | XP | Meant for (3.2 C2) | Moment (Fun level Subtle / Full) |
|---|---:|---|---|
| Common | 20 | a week or two of deliberate use: a real first milestone | quiet toast / small card |
| Uncommon | 40 | about a month | quiet toast / small card |
| Rare | 80 | a season: two to four months | toast / card with confetti and a chime (if sounds are on) |
| Epic | 160 | half a year to a year | toast with art / big card with art and a chime |
| Legendary | 320 | a year or more | toast with art / big card with art and a chime |

As built (B0, `ACH_RARITY` in `71-ach-0dsl.js`, `gameAchMoment` in
`92-game-1core.js`):

- XP is paid once per achievement through an internal award
  (`_gmAwardRaw('ach:' + id, {d, xp, k: 'ach'})`); `'ach'` is in
  `_GM_INTERNAL`, so `gameAward()` can never fake it.
- **Achievement XP counts in the total and the level, never in a day's XP**:
  no day goal, record or "XP in one day" achievement can be bought with it.
- History unlocks (2.1.5): half XP, 2,000 at most in all (`ACH_HIST_XP`), and
  the level they bring is taken quietly (no level-up moment for the past).
- Three or more live unlocks at once: one toast ("3 achievements earned
  (+240 XP)"). History never makes a moment of its own (2.1.5).
- All 500 together are worth **54,200 XP** (50 x 20 + 110 x 40 + 170 x 80 +
  120 x 160 + 50 x 320): spread over years, a little more than the climb from
  level 1 to level 50 (40,670), so a long-time player feels each one without
  the levels running away.
- Tiers are steep (3.2 C6): a series has 2 to 4 members from one fact,
  bronze at least Uncommon, silver at least Rare, gold at least Epic,
  platinum always Legendary. The wall draws a series as one card with pips.

### 2.4 Unlocks

An unlock is a string `'<kind>:<id>'` on the achievement. It is the **single
source of truth**: each owning module asks the achievements module, the way
`achLockedBy(ref)` works for animations today.

| Kind | Owner | Lock check the owner calls |
|---|---|---|
| `title:<Text>` | 2.18 you (titles under your name) | `achUnlockOf('title', text)` -> achievement id or null |
| `banner:<id>` | 2.18 you (profile banners) | `achUnlockOf('banner', id)` |
| `plate:<id>` | 2.18 you (nameplates) | `achUnlockOf('plate', id)` |
| `wear:<slot>-<id>` | 2.18 wardrobe | `achUnlockOf('wear', slotId)` |
| `seed:<id>`, `decor:<id>` | 2.18 garden | `achUnlockOf('seed', id)` |
| `treat:<id>` | 2.18 pets | `achUnlockOf('treat', id)` |
| `accent:<id>` | the game (`GAME_ACCENTS` gains an optional `ach` field; unlocked by level OR achievement) | in `gameAccentApply` |
| `anim:<pack/item>` | the animation library (as `reward.item` today) | `achLockedBy` |

If the owner module is not there, the achievement still works; its card says
"Unlocks: Lavender seeds (with the Garden)". Section 3.32 lists every unlock id
used, per owner, so the 2.18 modules can add them to their tables. Existing
avatar options keep their `{ach: id}` fields; new unlocks are declared only on
the achievement.

As built (B0): `achUnlockOf(kind, id)` (71-achievements.js) answers which
achievement unlocks `'<kind>:<id>'`; `achRewardOpen(kind, id)` (true, false,
or null when nothing locks it), `achRewardsEarned(kind?)` (`[{kind, id, ach,
day}]`) and `achRewardLabel(unlock)` (78-achievements.js) do the rest; an owner
can name its own with `registerAchRewardLabel(kind, fn)`. On every unlock the
document event `opendash:ach-reward` `{kind, id, ach, hist}` fires and the
owner's hook runs when it exists: `profileAchReward` (title, banner, plate),
`wardrobeAchReward` (wear), `gardenAchReward` (seed, decor), `petAchReward`
(treat), each `(kind, id, achId, {hist})`. Accents: `GAME_ACCENTS` entries open
by level OR achievement (`gameAccentOpen(a)`: `a.ach`, else
`achUnlockOf('accent', a.id)`; `achOnly: true` for accents with no level).

### 2.5 The Achievements page with 578 achievements

As built (B0): **`92-game-5wall.js`** registers the view **`game:wall`**
(title "Achievements"; `#view=game:wall` works) and exposes
`gameWallMount(container)`, so when the navigation build splits the Game page
into sections it mounts the wall for `game:wall` and keeps the id.
`gameOpenWall(id)` and the palette's "Achievements" go there. The Game page
(`game`) shows a short Achievements section instead of the old wall: the count,
Next up and "See all 578 achievements" (`gameWallSummary`). Category open
states are synced per category (`state.game.seen.wallOpen`). Styles:
`src/styles/92-game-wall.css` (`aw-` classes).

With the navigation plan the Game page becomes **Life › Achievements** (the view
id stays `game`), split into sections; the wall is its own section,
`game:wall` (NAVIGATION_PLAN.md 2.2). Replace `_gmWallSec` (92-game-3ui.js)
with `92-game-5wall.js`, mounted by that section. Mockup (desktop; phones stack
the same blocks):

```text
(the shared header says "Achievements")   142 of 578 earned · 3 this month · 4 of 22 secrets found · 3,240 XP
[ Search achievements...                         ]   [All] [Plan] [Work] [Life] [People] [Play] [Secrets]
( In progress )  ( Earned )  ( Not started )  ( Unlocks something )  ( In season )      Sort: Closest v

NEXT UP                                                         three suggestions, one per category
+-- Called it ------------------+  +-- Fifty-minute hours --------+  +-- Back to green --------------+
| [target]  Planning ahead   U  |  | [timer]  Deep work         R |  | [alarm]  Priorities         C |
| ########.. 7 / 10 days        |  | ######.... 62 / 100          |  | ######.... 3 / 5 days         |
| Finish yesterday's top three  |  | [ Start a focus timer -> ]   |  | [ Open Today -> ]             |
+-------------------------------+  +------------------------------+  +-------------------------------+

ALMOST THERE (80%+)   Thirty entries 26/30  ·  Sunset ritual 12/14  ·  Long time no see 4/5   [Show all]

PLAN                                                                               41 of 106
  (o) Planning ahead      ########......  14 / 25   1 unlock waiting               [ v ]
  (o) Priorities          ####..........   5 / 18                                  [ > ]
  (o) Estimating          ###...........   4 / 18                                  [ > ]
  (o) Reviews             #######.......  12 / 25                                  [ > ]
  (o) Tidy lists          #####.........   6 / 20                                  [ > ]
      +-- Said and done ---+ +-- Planner -- (o)( )( )( ) ---+ +-- ??? ---------------+
      | Earned 3 Mar 2026  | | Silver: 1,000 plans 612/1,000| | Some secrets keep     |
      | C · 20 XP          | | Unlocks the title Scheduler  | | themselves.  L 320 XP |
      +--------------------+ +-----------------------------+ +-----------------------+
WORK ...   LIFE ...   PEOPLE ...   PLAY ...

Money (15) and Places (20) are private: they never show on your profile unless you pick them.
Garden, Pets, Wardrobe: "Comes with the Garden. 20 achievements wait there."      [ What's new ]
```

Rules for the wall:

- **Categories fold**. Each shows a ring or bar and "N of M". On first visit
  only the two categories with the most progress are open; the choice is
  remembered in `state.homeUI`-style UI state (`state.game.seen.wallOpen`).
  A category's cards are built only when it opens (cheap with 578).
- **Next up**: up to 3 cards, at most one per category, from achievements at
  40% or more that the user can act on today (not secret, in season, feature
  on), each with one button that goes to the place to do it (a palette command
  id or a view on the definition: `go: 'cmd:game-focus-next'` or
  `go: 'view:today'`).
- **Almost there**: one line of up to 5 at 80% or more; "Show all" filters.
- **Suggested for you** (inside Next up when fewer than 3 qualify): the first
  common achievement of a category the user has never touched but whose
  feature is on ("Try Plan my week: Week on a page is one click away").
- **Search** matches name, description, category and unlock; **filters** are
  chips; **sort**: Closest (default), Newest earned, Rarest, A to Z.
- **Series** show as one card with tier pips and the next tier's target.
- **Secrets**: an unearned secret is a "???" card with its clue; the Secrets
  tab counts found / total. Never a progress bar for a secret.
- **Seasonal**: out of season, the card says when it comes back ("Back in
  December"); never "missed".
- **Feature off**: a category whose `needs` feature is off is one calm row with
  a button to turn it on, not a grid of locks.
- **Card detail** (click or Enter): what to do, the condition in plain words,
  progress, rarity and XP, the unlock with a preview, earned day, "Show on my
  profile" (with "Friends will see this" for private ones), and the Go button.
- **Keyboard**: `/` focuses search, arrows move between cards, Enter opens,
  Esc closes. Reduced motion: no count-ups, no pulses.
- The wall is the Achievements page's own section (`game:wall`); the Today
  section (hero, bonus task, streaks, quests) shows the Next up strip too, so
  the nearest achievements are one glance from the quests.

### 2.6 Badges, privacy and friends

- `private: true` achievements (all of Money and Places, plus balance ones that
  hint at health or holidays) are never picked for the default showcase
  (`profileShowcase` filters them out of "the newest three") and never appear
  in anything sent to friends unless the user picked them in the badge picker,
  which marks them with an eye icon and "Friends will see this".
- The badge picker (Settings > Profile) gets the wall's search and filters,
  showing earned ones only.
- A friend on an older build simply drops badge ids it does not know (as
  today).

As built (B0): every definition gets a `group` for the profile's automatic
showcase (`97-profile-1core.js` `PF_SHOWCASE_AUTO_GROUPS`): private ones
`private`, money `money`, places `places`, journal `memories`, people
`people`: none of these is in the automatic list, so the profile needed no
change. The achievement's detail has "Show on my profile" (with Undo, and
"Friends will see this one" for private ones). The badge picker's search and
filters stay for the profile's owner (2.18 you).

### 2.7 Never shaming

- No achievement depends on a missed day, a lost streak, a number going down,
  being worse than someone, or "only" doing a little. Rest achievements reward
  rest that happened, they never mention work that did not.
- Words to avoid in names and descriptions: fail, lost, broke, missed, lazy,
  only, finally (unless about a task, as in "Finally!"), behind, guilty.
- Progress shown is the best ever, never a current run that can fall.
- Friend achievements are about doing things together, never ranking.
---

## 3. The 500

### 3.1 Categories and counts

Five shelves, 26 categories. The new ones lean on planning, reviewing,
estimating, clearing inboxes, finishing what you start, deep work, rest and
kindness; fun lives everywhere (witty names, secrets in most categories) and has
its own shelf. The last column adds the 78 that exist today (mapping in 3.33),
so the wall shows **578**.

| Shelf | Category (`cat`) | Prefix | New | C / U / R / E / L | Batch | With today's | Leans |
|---|---|---|---:|---|---|---:|---|
| Plan | Planning ahead (`planning`) | `pl-` | 25 | 3 / 5 / 9 / 6 / 2 | B1 | 25 | productive |
| Plan | Priorities (`priorities`) | `pr-` | 18 | 2 / 4 / 6 / 4 / 2 | B1 | 21 | productive |
| Plan | Estimating (`estimating`) | `es-` | 18 | 2 / 4 / 6 / 4 / 2 | B1 | 19 | productive |
| Plan | Reviews (`reviews`) | `rv-` | 25 | 2 / 5 / 9 / 6 / 3 | B1 | 28 | productive |
| Plan | Tidy lists (`tidy`) | `td-` | 20 | 2 / 5 / 7 / 4 / 2 | B1 | 20 | productive |
| Work | Finishing what you start (`finishing`) | `fn-` | 25 | 2 / 5 / 9 / 6 / 3 | B2 | 37 | productive |
| Work | Deep work (`focus`) | `fo-` | 25 | 2 / 5 / 8 / 7 / 3 | B2 | 30 | productive |
| Work | Inbox and capture (`capture`) | `ca-` | 20 | 3 / 5 / 7 / 4 / 1 | B2 | 22 | productive |
| Work | Waiting and handing off (`waiting`) | `wt-` | 15 | 2 / 4 / 5 / 3 / 1 | B2 | 15 | productive |
| Work | Tools and craft (`craft`) | `cr-` | 20 | 4 / 6 / 6 / 3 / 1 | B2 | 20 | useful |
| Life | Habits and routines (`habits`) | `hb-` | 20 | 1 / 4 / 7 / 5 / 3 | B3 | 22 | productive |
| Life | Rhythm (`rhythm`) | `rh-` | 15 | 1 / 3 / 5 / 4 / 2 | B3 | 29 | productive |
| Life | Rest and balance (`balance`) | `bl-` | 20 | 2 / 5 / 7 / 4 / 2 | B3 | 20 | wellbeing |
| Life | Notes, journal and memories (`journal`) | `jr-` | 22 | 2 / 5 / 8 / 5 / 2 | B3 | 23 | reflective |
| Life | Money, gently (`money`, private) | `mo-` | 15 | 2 / 4 / 5 / 3 / 1 | B3 | 19 | useful |
| Life | Places and travel (`places`, private) | `pc-` | 20 | 1 / 3 / 7 / 6 / 3 | B5 | 24 | fun |
| People | People and kindness (`people`) | `pp-` | 22 | 2 / 5 / 8 / 5 / 2 | B4 | 24 | kind |
| People | Calendar and meetings (`meetings`) | `mt-` | 18 | 2 / 4 / 6 / 4 / 2 | B4 | 18 | productive |
| People | Friends and together (`friends`) | `fr-` | 22 | 3 / 5 / 7 / 5 / 2 | B4 | 32 | fun, kind |
| Play | Garden (`garden`, 2.18) | `gd-` | 20 | 2 / 4 / 7 / 5 / 2 | B5 | 20 | fun |
| Play | Pets (`pets`, 2.18) | `pt-` | 15 | 2 / 3 / 5 / 4 / 1 | B5 | 15 | fun |
| Play | Wardrobe and profile (`style`) | `st-` | 15 | 2 / 4 / 5 / 3 / 1 | B5 | 15 | fun |
| Play | Scenes and seasons (`scenes`) | `sc-` | 18 | 2 / 4 / 6 / 5 / 1 | B5 | 18 | delight |
| Play | Quests, bosses and records (`game`) | `gm-` | 15 | 1 / 3 / 5 / 4 / 2 | B4 | 30 | fun |
| Play | Secrets (`secrets`, all secret) | `sx-` | 20 | 1 / 4 / 6 / 6 / 3 | B4 | 20 | delight |
| Play | Meta and collections (`meta`) | `mx-` | 12 | 0 / 2 / 4 / 5 / 1 | B5 | 12 | fun |
| | **Total** | | **500** | **50 / 110 / 170 / 120 / 50** | | **578** | |

Shelf totals: Plan 106, Work 105, Life 112, People 62, Play 115. About two
thirds are productive, useful or caring; one third is play. Shelves group
achievements on the wall; they are not the app's areas (Home, Tasks, Calendar,
Money, Life in NAVIGATION_PLAN.md).

**Rarity spread of the 500 (recalibrated, 24 Oct): Common 50, Uncommon 110,
Rare 170, Epic 120, Legendary 50**, worth 54,200 XP in all. Per batch:

| Batch | New | C | U | R | E | L | Day-one budget |
|---|---:|---:|---:|---:|---:|---:|---:|
| B1 Plan shelf | 106 | 11 | 23 | 37 | 24 | 11 | 5 |
| B2 Work shelf | 105 | 13 | 25 | 35 | 23 | 9 | 5 |
| B3 Life shelf (no places) | 92 | 8 | 21 | 32 | 21 | 10 | 5 |
| B4 People, game, secrets | 97 | 9 | 21 | 32 | 24 | 11 | 5 |
| B5 Play shelf, places, meta | 100 | 9 | 20 | 34 | 28 | 9 | 5 |
| **All** | **500** | **50** | **110** | **170** | **120** | **50** | **25 (5%)** |

### 3.2 Calibration: they need to be HARD to unlock

The owner, 24 Oct, after the first draft: "add another 500 achievements,
unique and good and useful and productive and fun", then "they need to be
HARD to unlock". These rules override every number in the first draft and
bind every batch builder.

**C1. Hard by default.** Most achievements take weeks or months of real,
deliberate effort. Nothing unlocks for a click, a setting or a single event
unless it is a secret or genuinely rare (a date, an hour, a place).

**C2. The effort ladder** (an ordinary active user starting from nothing):

| Rarity | XP | Effort | Shape it usually takes |
|---|---:|---|---|
| Common | 20 | a week or two of deliberate use: a real first milestone, never a first click | "on 10 days", "25 times", a short run, a feature used in 4 different weeks |
| Uncommon | 40 | about a month | a month of a habit, a 14-day run, 100 to 250 of something |
| Rare | 80 | a season (two to four months) | a 30-workday run, the best week or month of a big push, 1,000 of something |
| Epic | 160 | half a year to a year | 26-week runs, 365 days of a habit, thousands of something |
| Legendary | 320 | a year or more of steady effort | a year of weekly reviews, 1,000 focus hours, 7,500 on time, 36 green months |

**C3. Day one is nearly empty.** The first check after an update runs in
history mode (2.1.5): everything already satisfied unlocks quietly and is shown
once as one summary. **At most about 5% of the new 500 may unlock on day one
for an active long-time user**, from genuine history: **5 per batch, 25 in
all** (the table above). Mark the ones you expect with `d1` in the pack's
comment; `node tools/ach-dayone.mjs <data> --strict` is the gate (4.0).

**C4. Thresholds that back-fill must beat history.** A condition that reads
DATA or DEVICE facts back-fills from history (that is good: nothing is
lost), so a long-time user already has years of it. Therefore:

- Cumulative totals of DATA facts belong to **Epic and Legendary**, set above
  what a heavy two-year user has (the reference user below), unless the
  achievement is one of the batch's `d1` budget.
- **Common, Uncommon and Rare** use behaviour history rarely holds by
  accident: **runs** (`run`, often with `skip:'weekend'`), **best week or
  month** (`cal`, `win`), **combinations** (`same`, `all`), or TICK, COUNT and
  MARK facts, which start at zero on the update day.
- A "current state" fact (people kept, smart lists, widgets, friends) counts
  as day one if a long-time user plausibly has it: aim high or spend budget.

**C5. The reference long-time user** (what `node tools/ach-dayone.mjs --synth`
writes, every value invented): two years, about 4,300 tasks and 6,000
completions (4 to 14 on a workday, 1 to 4 on a weekend day), five daily and
three weekly or monthly routines kept about two days in three, an evening
review on 40% of days, a weekly review in 60% of weeks, focus sessions on 45%
of days, daily notes on a third of days, estimates on 40% of tasks, subtasks on
20%. Run the tool on it after every batch; with the owner's permission, also on
a sandbox copy of real data (never the live folder).

**C6. Steep tiers.** A series has 2 to 4 tiers from one fact, climbing at
least about 3x per step: **bronze is a real milestone (at least Uncommon),
silver at least Rare, gold at least Epic, platinum always Legendary.**

**C7. Legendary means a year.** A year of weekly reviews (52 running), 1,000
focus hours, 365 days of one habit, 7,500 tasks on time, 36 months in the
green. If it can be done in a season, it is not Legendary.

**C8. Secrets.** Every category may hold secrets; the hardest secrets have **no
clue at all** (`clue: ''`: the wall says "Some secrets keep themselves").
Easier ones keep an honest clue. A secret still follows C2 and C3.

**C9. Never shaming still wins** (2.7). Hard means more effort, never a
penalty: nothing about missed days or falling numbers, progress is the best
ever, runs may use freezes, and rest achievements reward rest that happened.

### 3.3 Rules the builders must follow

**Unique**

1. Ids: `<prefix>-<slug>`, lowercase, at most 24 characters, never reused, never
   renamed after release (unlocks are synced by id).
2. Names: at most 28 characters, unique across all 578 after folding case and
   punctuation, and not equal to any title, level title (Newcomer, Apprentice,
   Doer, Finisher, Pathfinder, Expert, Master, Grandmaster, Legend, Mythic) or
   unlock name. Avoid near-twins (no "Steady", "Steady hand" and "Steady pace").
3. Conditions: no two achievements may have the same canonical condition
   (`achLint` compares sorted-key JSON and skips the second).
4. Wording: each description reads as an instruction (usually starting with a
   verb), says exactly what to do and stands alone (never "Do that again"). No
   two descriptions share their first five words. At most 90 characters.

**Achievable and measurable**

5. Every condition reads a fact listed in 1.7, 1.8 or 1.9. A new fact needs a
   row there (meaning, source) and a source (`registerAchFactSource` for DATA,
   `registerAchFacts` for DEVICE, a tick, count or mark call for the rest) in
   the same commit. `tools/ach-dayone.mjs` lists facts no source makes.
6. Calibration: C1 to C9 above, and the batch's day-one budget.
7. "In one day" and "N days running" conditions use DATA series or ticks,
   never counts (2.1.1).
8. An achievement whose feature can be off carries `needs`. One that reads
   money, places, holidays or anything health-like carries `private: true`.

**Not grindy**

9. A series has at most 4 tiers, all from one fact, bronze to platinum without
   gaps (C6). Within a category one fact may appear at most 3 times with the
   **same operator** (three `days` of `d.evening` is the limit; a `run` and a
   `cal` of it are different behaviours). Combinations (`same`, `all`) do not
   count towards the three.
10. Prefer a different behaviour over a bigger number.

**Never shaming** (2.7)

11. Nothing about a missed day, a lost streak, falling numbers, comparing with
    friends or "only" doing a little. Rest achievements praise rest that
    happened. Banned words in names and descriptions (the lint skips them): fail,
    lost, lose, broke, broken, missed, miss, lazy, only, behind, guilty.

**Tone**

12. Witty, warm, plain English, British spelling ("colour", "organise").
    Puns welcome, jargon not. The description is plain even when the name is a
    joke.
13. No real people's names, brands or trademarks in names or descriptions
    (festivals and seasons are fine).

**Technical**

14. Pure data in `src/app/71-ach-pack-<batch>.js` (no DOM, no page globals at
    load), registered with `registerAchievementPack({id, label, defs})` (4.0).
    XP comes from rarity only.
15. A pack never edits another pack; a change to an earlier batch goes in its
    own commit with a line in the batch's notes.

### 3.4 How to read the tables

`Tier`: `·` for none, else the series name and B, S, G or P.
`Rarity`: C 20, U 40, R 80, E 160, L 320 (the XP).
`Unlock · flags`: the unlock (2.4), then flags: `d1` (expected to unlock on day
one for the reference long-time user: counts against the batch's budget),
`secret` (with its clue, or `no clue`), `season MM-DD..MM-DD`, `private`,
`needs <feature>`.
Conditions are JavaScript object literals, ready to paste. Names as built
(1.9): a tick kind `k` is the series `d.k` (and `w.k`), a count kind `k` is the
fact `c.k`, a mark kind is read with `{mark}` or `{has}`.

---

### 3.5 Planning ahead (`planning`, `pl-`, 25)

The day you mean to work on a task, time blocks, Plan my week, Plan my day and
the evening's top three for tomorrow.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| pl-planner-b | Pencilled in | Plan 250 tasks for particular days. | `{n:'plan.set',gte:250}` | planner B | U 40 | d1 |
| pl-planner-s | Chief of schedule | Plan 1,000 tasks for particular days. | `{n:'plan.set',gte:1000}` | planner S | R 80 | title:Scheduler |
| pl-planner-g | Clockwork | Plan 3,000 tasks for particular days. | `{n:'plan.set',gte:3000}` | planner G | E 160 | banner:clockwork |
| pl-planner-p | Master of the calendar | Plan 7,500 tasks for particular days. | `{n:'plan.set',gte:7500}` | planner P | L 320 | · |
| pl-ahead | Tomorrow's me says thanks | Start 5 days running with 3 or more tasks already planned for each. | `{run:'d.planAhead',min:3,gte:5}` | · | C 20 | d1 |
| pl-ahead-60 | The night before | Start 60 days with 3 or more tasks already planned for them. | `{days:'d.planAhead',min:3,gte:60}` | · | R 80 | decor:bird-feeder |
| pl-monday | Monday, handled | Start 12 Mondays with 5 or more tasks already planned for them. | `{days:'d.planAhead',min:5,gte:12,on:{dow:[1]}}` | · | U 40 | · |
| pl-clear | Said and done | Finish your whole plan for a day (3 tasks or more) on 10 days. | `{days:'d.planClear',gte:10}` | · | C 20 | d1 |
| pl-clear-50 | Promise keeper | Finish your whole plan on 50 different days. | `{days:'d.planClear',gte:50}` | · | R 80 | wear:acc-pocket-watch |
| pl-clear-run | Ten for ten | Finish your whole plan ten workdays running. | `{run:'d.planClear',gte:10,skip:'weekend'}` | · | R 80 | · |
| pl-slot-day | Day by the hour | Time-block 4 or more tasks into one day, on 10 days. | `{days:'d.slots',min:4,gte:10}` | · | U 40 | · |
| pl-slot-month | Booked solid | Time-block 150 tasks in one calendar month. | `{cal:'month',s:'d.slots',gte:150}` | · | E 160 | · |
| pl-slot-hits | Kept the appointment | Finish 100 time-slotted tasks on their planned day. | `{n:'plan.slotHits',gte:100}` | · | R 80 | · |
| pl-week | Week on a page | Use Plan my week in 4 different weeks. | `{days:'w.plan-week',gte:4}` | · | C 20 | · |
| pl-week-run | Sunday strategist | Plan your week 8 weeks running. | `{run:'w.plan-week',gte:8}` | · | R 80 | seed:sunflower |
| pl-week-run-26 | Half a year on paper | Plan your week 26 weeks running (freezes allowed). | `{run:'w.plan-week',gte:26,freeze:true}` | · | L 320 | · |
| pl-top3-kept | Called it | Finish all three of yesterday's top three on 10 days. | `{days:'d.top3Done',min:3,gte:10}` | · | U 40 | treat:biscuit |
| pl-top3-run | Three for three | Finish all of yesterday's top three 7 days running. | `{run:'d.top3Done',min:3,gte:7}` | · | R 80 | · |
| pl-top3-kept-60 | Crystal ball | Finish all of the day before's top three on 60 days. | `{days:'d.top3Done',min:3,gte:60}` | · | E 160 | title:Oracle |
| pl-dayplan-30 | Captain's log | Plan your day on Home on 30 days. | `{days:'d.dayplan',gte:30}` | · | U 40 | · |
| pl-dayplan-100 | Morning huddle | Run your morning huddle with Plan my day on 100 days. | `{days:'d.dayplan',gte:100}` | · | R 80 | · |
| pl-due-30 | Long view | Give 100 tasks a deadline at least a month away. | `{n:'tasks.due30',gte:100}` | · | R 80 | · |
| pl-ahead-done | Ahead of the game | Finish 500 tasks two or more days before they are due. | `{n:'tasks.doneAhead',gte:500}` | · | E 160 | · |
| pl-p1-early | Early and easy | Finish 25 high-priority tasks a week or more before they are due. | `{n:'tasks.p1Week',gte:25}` | · | E 160 | · |
| pl-plan-hits | Right on the day | Finish 2,000 tasks on the day you planned them. | `{n:'plan.hits',gte:2000}` | · | E 160 | · |

### 3.6 Priorities (`priorities`, `pr-`, 18)

The important thing first, overdue back to zero, letting priorities move.
Today's `p1-25`, `p1-100` and `boss` (Long overdue, done) join this category.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| pr-frog | Frog for breakfast | Finish a high-priority task first thing, 5 workdays running. | `{run:'d.p1First',gte:5,skip:'weekend'}` | · | C 20 | · |
| pr-frog-60 | Frog connoisseur | Start 60 days by finishing a high-priority task first. | `{days:'d.p1First',gte:60}` | · | R 80 | · |
| pr-frog-run | Twenty frogs running | Start 20 workdays running with a high-priority task done first. | `{run:'d.p1First',gte:20,skip:'weekend'}` | · | E 160 | title:Frog Whisperer |
| pr-due-clear | Urgent, handled | Finish every high-priority task due that day, on 20 days. | `{days:'d.p1DueClear',gte:20}` | · | U 40 | d1 |
| pr-due-clear-150 | Calm under pressure | Clear the high-priority tasks due that day on 150 days. | `{days:'d.p1DueClear',gte:150}` | · | E 160 | banner:calm-sea |
| pr-overdue-clear | Back to green | Take your overdue count from something to zero on 5 days. | `{days:'d.overdue-clear',gte:5}` | · | C 20 | · |
| pr-overdue-clear-30 | Thirty fresh starts | Get back to zero overdue on 30 different days. | `{days:'d.overdue-clear',gte:30}` | · | R 80 | accent:mint |
| pr-clear-skies | Clear skies | Keep nothing overdue 14 days running (5 or more tasks open). | `{run:'d.overdue-none',gte:14}` | · | U 40 | · |
| pr-clear-run | Blue-sky season | Keep nothing overdue 60 days running (5 or more tasks open). | `{run:'d.overdue-none',gte:60,freeze:true}` | · | E 160 | · |
| pr-reprioritise | Plans change | Change the priority of 250 tasks as things move on. | `{n:'tasks.priorityChanges',gte:250}` | · | U 40 | · |
| pr-all-ranked | Everything ranked | Give every open task a priority (20 or more open) on 20 days. | `{days:'d.all-prioritised',gte:20}` | · | U 40 | · |
| pr-p1-week | High-priority week | Finish 15 high-priority tasks in one week. | `{cal:'week',s:'d.p1Done',gte:15}` | · | R 80 | · |
| pr-p1-month | High-stakes month | Finish 50 high-priority tasks in one calendar month. | `{cal:'month',s:'d.p1Done',gte:50}` | · | E 160 | · |
| pr-late | Late, not never | Finish 1,000 tasks after their due date. They still count. | `{n:'tasks.doneLate',gte:1000}` | · | R 80 | · |
| pr-big-rocks | Big rocks first | Finish 100 high-priority tasks on the day you planned them. | `{n:'tasks.p1PlanHit',gte:100}` | · | R 80 | · |
| pr-p1-old | The long-awaited | Finish 25 high-priority tasks that were open for a month or more. | `{n:'tasks.p1Old',gte:25}` | · | R 80 | · |
| pr-p1-boss | Boss of priorities | Defeat 50 boss tasks that were high priority. | `{n:'game.bossP1',gte:50}` | · | L 320 | · |
| pr-p1-1000 | First things, always | Finish 1,000 high-priority tasks. | `{n:'p1Done',gte:1000}` | · | L 320 | · |

### 3.7 Estimating (`estimating`, `es-`, 18)

Estimates, the focus timer's lessons and plans that fit. Today's `on-estimate`
joins.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| es-500 | Estimator | Give 500 tasks a time estimate. | `{n:'tasks.estimated',gte:500}` | estimates B | U 40 | d1 |
| es-2000 | Professional guesser | Give 2,000 tasks a time estimate. | `{n:'tasks.estimated',gte:2000}` | estimates S | R 80 | · |
| es-5000 | Five thousand forecasts | Give 5,000 tasks a time estimate. | `{n:'tasks.estimated',gte:5000}` | estimates G | E 160 | · |
| es-timed | Stopwatch | Time 25 estimated tasks with the focus timer, then finish them. | `{n:'est.timed',gte:25}` | · | C 20 | · |
| es-close | Bullseye | Finish 10 timed tasks within 10% of their estimates. | `{n:'est.close',gte:10}` | · | U 40 | · |
| es-close-250 | Sharpshooter | Finish 250 timed tasks within 10% of their estimates. | `{n:'est.close',gte:250}` | · | L 320 | wear:acc-stopwatch |
| es-calibrated | Calibrated | Over 50 or more timed tasks, take 0.9 to 1.1 times your estimates. | `{n:'est.calibrated',gte:1}` | · | R 80 | title:Timekeeper |
| es-kinds-5 | Know thyself | Learn how long 5 kinds of work really take you. | `{n:'est.kinds',gte:5}` | · | U 40 | · |
| es-kinds-15 | Self-portrait in minutes | Learn how long 15 kinds of work really take you. | `{n:'est.kinds',gte:15}` | · | E 160 | · |
| es-under | Quicker than you thought | Finish 50 timed tasks faster than you estimated. | `{n:'est.under',gte:50}` | · | R 80 | · |
| es-big | Honest about big things | Estimate 25 tasks at 3 hours or more, then finish them. | `{n:'tasks.bigEstDone',gte:25}` | · | R 80 | · |
| es-split | Bite-sized | Break 25 tasks estimated over 2 hours into 3 or more subtasks. | `{n:'tasks.bigSplit',gte:25}` | · | U 40 | · |
| es-day-all | Every minute accounted for | Finish 5 or more tasks in a day, all with estimates, on 20 days. | `{days:'d.allEstimated',min:5,gte:20}` | · | R 80 | · |
| es-week-all | Measured week | Finish 25 or more tasks in a week, every one estimated. | `{days:'w.allEst',min:25,gte:1}` | · | E 160 | · |
| es-fit | Room to breathe | Plan 4 weeks that fit your capacity. | `{days:'w.plan-fit',gte:4}` | · | C 20 | · |
| es-fit-26 | Realistic weeks | Plan 26 weeks that fit your capacity. | `{days:'w.plan-fit',gte:26}` | · | E 160 | decor:hammock |
| es-tiny | Two-minute rule | Finish 200 tasks estimated at 5 minutes or less on the day you add them. | `{n:'tasks.tinySameDay',gte:200}` | · | R 80 | · |
| es-exact | Planned to the minute | Match 25 estimates to within 2 minutes on the focus timer. | `{n:'est.exact',gte:25}` | · | L 320 | secret · no clue |

### 3.8 Reviews (`reviews`, `rv-`, 25)

Finish the day, the weekly review, stories, recaps and looking back. Today's
`review-1`, `review-4` and `review-12` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| rv-evening-run | Sunset ritual | Finish the day with the evening review 14 days running. | `{run:'d.evening',gte:14}` | · | R 80 | seed:moonflower |
| rv-evening-month | Every evening of a month | Finish the day on 25 days of one calendar month. | `{cal:'month',s:'d.evening',gte:25}` | · | E 160 | · |
| rv-evening-500 | Golden hours | Finish the day 500 times. | `{days:'d.evening',gte:500}` | · | L 320 | banner:sunset |
| rv-evening-weekend | Weekend wind-down | Finish the day on both days of 12 weekends. | `{days:'w.eveningWeekend',gte:12}` | · | R 80 | decor:lantern |
| rv-outcomes | Three things that matter | Set outcomes in your weekly review 6 weeks running. | `{run:'w.outcomes',gte:6}` | · | U 40 | · |
| rv-outcomes-52 | Purposeful | Set weekly outcomes in 52 different weeks. | `{days:'w.outcomes',gte:52}` | · | E 160 | wear:glasses-reading |
| rv-wins | Count your wins | Write down a win in your weekly review 8 weeks running. | `{run:'w.wins',gte:8}` | · | U 40 | · |
| rv-wins-1000 | Hall of wins | Write down 1,000 wins across your weekly reviews. | `{n:'review.winLines',gte:1000}` | · | L 320 | plate:laurel |
| rv-triage-b | Deck master | Decide on 2,000 tasks in weekly reviews. | `{n:'review.triaged',gte:2000}` | triage B | R 80 | · |
| rv-triage-s | Seven thousand decisions | Decide on 7,500 tasks in weekly reviews. | `{n:'review.triaged',gte:7500}` | triage S | E 160 | · |
| rv-letgo | Letting go | Drop or park 250 tasks during weekly reviews. | `{n:'review.letGo',gte:250}` | · | R 80 | · |
| rv-quick | Ten-minute review | Finish 10 weekly reviews in 15 minutes or less, with 10 or more decisions each. | `{n:'review.quick',gte:10}` | · | U 40 | · |
| rv-slipped | What slipped, and why | Note why something slipped in 25 weekly reviews. | `{n:'review.slipReasons',gte:25}` | · | R 80 | · |
| rv-streak-12 | A quarter, reviewed | Review your week 12 weeks running (freezes allowed). | `{run:'w.review',gte:12,freeze:true}` | · | R 80 | title:Reflective |
| rv-streak-26 | Half a year, reviewed | Review your week 26 weeks running (freezes allowed). | `{run:'w.review',gte:26,freeze:true}` | · | E 160 | · |
| rv-streak-52 | Fifty-two reviews | Review your week 52 weeks running (freezes allowed). | `{run:'w.review',gte:52,freeze:true}` | · | L 320 | banner:year-of-reviews |
| rv-ready-monday | Ready for Monday | Save a weekly review and use Plan my week on the same day, 8 times. | `{same:[['d.weekReview',1],['d.plan-week',1]],gte:8}` | · | R 80 | · |
| rv-bookends | Bookends | On 30 Sundays, finish the day and save your weekly review. | `{same:[['d.evening',1],['d.weekReview',1]],gte:30,on:{dow:[0]}}` | · | R 80 | · |
| rv-story-week | Narrated weeks | Play your weekly review story to the end in 4 different weeks. | `{days:'w.story-week',gte:4}` | · | C 20 | · |
| rv-story-am | Morning person, apparently | Play your morning story on 30 days. | `{days:'d.story-morning',gte:30}` | · | U 40 | · |
| rv-brief-200 | Well briefed | Open your morning brief on 200 days. | `{days:'d.brief',gte:200}` | · | E 160 | · |
| rv-recap | Month in a minute | Play the recaps of 3 different months. | `{mark:'recap-month',gte:3}` | · | C 20 | · |
| rv-recap-12 | Twelve chapters | Play the recaps of 12 different months. | `{mark:'recap-month',gte:12}` | · | U 40 | · |
| rv-wrapped-2 | That's a wrap, twice | Watch your Wrapped in two different years. | `{n:'awards.wrapped',gte:2}` | · | E 160 | · |
| rv-new-year | Fresh page | Save a weekly review in the first week of January, in 2 different years. | `{days:'d.weekReview',gte:2,on:{from:'01-01',to:'01-07'}}` | · | R 80 | season 01-01..01-07 |

### 3.9 Tidy lists (`tidy`, `td-`, 20)

The sweep, the clean-up, Someday, won't do, and lists that get lighter.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| td-sweep | Sweep the porch | Use the Today to Tomorrow sweep on 10 days. | `{days:'d.sweep',gte:10}` | · | C 20 | · |
| td-sweep-run | Nightly sweep | Sweep Today 14 days running. | `{run:'d.sweep',gte:14}` | · | R 80 | · |
| td-sweep-300 | Tidy evenings | Sweep Today on 300 days. | `{days:'d.sweep',gte:300}` | · | L 320 | decor:broom |
| td-sweep-clear | Nothing left over | Sweep Today until nothing is left in it, 25 times. | `{n:'c.sweep-cleared',gte:25}` | · | U 40 | · |
| td-cleanup | Spring clean | Finish a clean-up of stale tasks in 3 different months. | `{cal:'month',s:'d.cleanup',gte:1,times:3}` | · | C 20 | · |
| td-cleanup-500 | Decluttered | Decide on 500 stale tasks in clean-ups. | `{n:'c.cleanup-decided',gte:500}` | · | E 160 | · |
| td-cleanup-seasons | Four tidy seasons | Run a clean-up in spring, summer, autumn and winter. | `{n:'cleanup.seasons',gte:4}` | · | R 80 | decor:wheelbarrow |
| td-someday | Not now, not never | Park 50 tasks for Someday. | `{n:'tasks.somedaySet',gte:50}` | · | U 40 | · |
| td-someday-done | Someday is today | Bring 25 Someday tasks back and finish them. | `{n:'tasks.somedayDone',gte:25}` | · | R 80 | · |
| td-wontdo-b | The art of no | Close 200 tasks as won't do. | `{n:'tasks.wontdo',gte:200}` | wontdo B | U 40 | · |
| td-wontdo-s | Ruthless editor | Close 750 tasks as won't do. | `{n:'tasks.wontdo',gte:750}` | wontdo S | R 80 | title:Editor |
| td-wontdo-g | The great unsubscribe | Close 2,500 tasks as won't do. | `{n:'tasks.wontdo',gte:2500}` | wontdo G | L 320 | · |
| td-nodate-zero | Everything has a date | Empty your No date list after it held 5 or more, on 10 days. | `{days:'d.nodate-zero',gte:10}` | · | U 40 | · |
| td-restore | Second chances | Restore 10 tasks from the bin. | `{n:'tasks.restored',gte:10}` | · | U 40 | · |
| td-tags | Tag gardener | Rename or merge tags 25 times. | `{n:'c.tag-edit',gte:25}` | · | R 80 | · |
| td-stale-none | Nothing gathering dust | Have no open task untouched for 60 days, with 20 or more open, on 30 days. | `{days:'d.stale-none',gte:30}` | · | E 160 | · |
| td-lighter | Lighter load | End 8 weeks running lighter than they began, with 10 or more done each. | `{run:'w.lighter',gte:8}` | · | E 160 | · |
| td-today-clear | Today, cleared | Finish everything in Today (5 tasks or more) on 25 days. | `{days:'d.today-clear',gte:25}` | · | R 80 | · |
| td-today-clear-run | Clear-desk policy | Clear Today 10 workdays running. | `{run:'d.today-clear',gte:10,skip:'weekend'}` | · | E 160 | · |
| td-realist | Realist | Move 250 tasks to a later date and say why. | `{n:'tasks.movedWithReason',gte:250}` | · | R 80 | · |

---

### 3.10 Finishing what you start (`finishing`, `fn-`, 25)

Old tasks finished, subtasks, on time, chains of blocked tasks and big weeks.
Today's `first-done`, `done-10` ... `done-5000`, `day-10`, `day-20` and
`all-rounder` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| fn-old-30 | Finally! | Finish 25 tasks that were open for a month or more. | `{n:'tasks.oldDone30',gte:25}` | · | U 40 | d1 |
| fn-old-30-250 | Backlog buster | Finish 250 tasks that were open for a month or more. | `{n:'tasks.oldDone30',gte:250}` | · | E 160 | · |
| fn-old-180 | Slow cooker | Close out 10 tasks that had been open for six months or more. | `{n:'tasks.oldDone180',gte:10}` | · | R 80 | · |
| fn-old-365 | Anniversary edition | Get 5 tasks done more than a year after you added them. | `{n:'tasks.oldDone365',gte:5}` | · | E 160 | title:Archaeologist |
| fn-subs-day | Checklist champion | Tick off 40 subtasks in one day. | `{win:'d.subtasks',span:1,gte:40}` | · | R 80 | · |
| fn-subs-b | Small steps | Tick off 1,000 subtasks. | `{n:'subtasks.done',gte:1000}` | steps B | R 80 | · |
| fn-subs-s | Ten thousand small steps | Tick off 10,000 subtasks. | `{n:'subtasks.done',gte:10000}` | steps S | L 320 | plate:checklist |
| fn-doing-week | Work in progress | Mark 15 tasks as Doing and finish them, in one week. | `{cal:'week',s:'d.doingDone',gte:15}` | · | U 40 | · |
| fn-ontime-b | On the nose | Finish 250 tasks on or before their due date. | `{n:'tasks.onTime',gte:250}` | ontime B | U 40 | d1 |
| fn-ontime-s | Reliable | Finish 1,000 tasks on or before their due date. | `{n:'tasks.onTime',gte:1000}` | ontime S | R 80 | title:Dependable |
| fn-ontime-g | Swiss watch | Finish 3,000 tasks on or before their due date. | `{n:'tasks.onTime',gte:3000}` | ontime G | E 160 | wear:acc-wristwatch |
| fn-ontime-p | Atomic clock | Finish 7,500 tasks on or before their due date. | `{n:'tasks.onTime',gte:7500}` | ontime P | L 320 | banner:atomic |
| fn-never-moved | Never moved | Finish 1,000 tasks on time without ever moving their date. | `{n:'tasks.neverMoved',gte:1000}` | · | E 160 | · |
| fn-domino | Domino effect | Finish 25 tasks on the day the task blocking them was done. | `{n:'tasks.unblockedSameDay',gte:25}` | · | R 80 | · |
| fn-chain | Chain reaction | Finish 3 chains of three tasks, each blocked by the one before. | `{n:'tasks.chain3',gte:3}` | · | U 40 | · |
| fn-juggler | Juggler | Finish tasks in 4 or more streams a day, 10 workdays running. | `{run:'d.streams',min:4,gte:10,skip:'weekend'}` | · | R 80 | · |
| fn-stream-clear | Stream cleared | Finish every open task in a stream that had 5 or more, 5 times. | `{days:'d.stream-clear',gte:5}` | · | C 20 | · |
| fn-week-75 | Strong week | Finish 75 tasks in one week. | `{cal:'week',s:'d.done',gte:75}` | · | R 80 | · |
| fn-month-300 | Banner month | Finish 300 tasks in one calendar month. | `{cal:'month',s:'d.done',gte:300}` | · | E 160 | · |
| fn-year-2500 | Banner year | Finish 2,500 tasks in one calendar year. | `{cal:'year',s:'d.done',gte:2500}` | · | L 320 | · |
| fn-reopen | Unfinished business | Reopen 10 finished tasks and finish them again. | `{n:'tasks.reopenedDone',gte:10}` | · | C 20 | · |
| fn-notes-month | Show your working | Finish 30 tasks that have notes on them in one month. | `{cal:'month',s:'d.doneWithNotes',gte:30}` | · | U 40 | · |
| fn-one-sitting | One sitting | Finish 25 tasks of 3 or more steps within an hour of ticking the first step. | `{n:'tasks.oneSitting',gte:25}` | · | R 80 | · |
| fn-boss-week | Boss week | Defeat five boss tasks in one week. | `{cal:'week',s:'d.boss',gte:5}` | · | R 80 | · |
| fn-new-year | First tick of the year | Finish a task on 1 January in three different years. | `{days:'d.doneAny',gte:3,on:{md:'01-01'}}` | · | E 160 | season 01-01..01-01 |

### 3.11 Deep work (`focus`, `fo-`, 25)

The focus timer: long sessions, steady practice, proper breaks and focus that
finishes things. Today's `first-focus`, `focus-10`, `focus-hours-10`,
`focus-hours-100` and `deep-work` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| fo-25 | Pomodoro | Do 25 focus sessions of 25 minutes or more. | `{n:'focus.s25',gte:25}` | · | C 20 | d1 |
| fo-25-run | Tomato season | Do a 25-minute focus session 10 workdays running. | `{run:'d.s25',gte:10,skip:'weekend'}` | · | U 40 | · |
| fo-25x4 | Four tomatoes | Do four 25-minute focus sessions in one day, on 10 days. | `{days:'d.s25',min:4,gte:10}` | · | R 80 | seed:tomato |
| fo-50 | Fifty-minute hours | Focus for 50 minutes in one go, 100 times. | `{n:'focus.s50',gte:100}` | · | R 80 | · |
| fo-120 | Flow state | Focus for two hours in one go. | `{n:'focusLongestMin',gte:120}` | · | U 40 | seed:night-jasmine |
| fo-180 | Three hours, unbroken | Focus for three hours in one go. | `{n:'focusLongestMin',gte:180}` | · | E 160 | · |
| fo-day-4h | Four-hour deep dive | Log 4 hours of focus in one day. | `{win:'d.focusMin',span:1,gte:240}` | · | R 80 | · |
| fo-day-6h | Monk mode | Log 6 hours of focus in one day. | `{win:'d.focusMin',span:1,gte:360}` | · | E 160 | · |
| fo-week-15h | Fifteen-hour week | Log 15 hours of focus in one week. | `{cal:'week',s:'d.focusMin',gte:900}` | · | R 80 | · |
| fo-week-25h | Twenty-five-hour week | Log 25 hours of focus in one week. | `{cal:'week',s:'d.focusMin',gte:1500}` | · | E 160 | title:Deep Worker |
| fo-month-60h | Sixty-hour month | Log 60 hours of focus in one calendar month. | `{cal:'month',s:'d.focusMin',gte:3600}` | · | E 160 | · |
| fo-hours-1000 | A thousand focused hours | Log 1,000 hours on the focus timer. | `{n:'focusHours',gte:1000}` | · | L 320 | banner:deep-water |
| fo-sessions-2000 | Habit of attention | Log 2,000 focus sessions. | `{n:'focusSessions',gte:2000}` | · | E 160 | · |
| fo-run-14 | Daily practice | Focus for 10 minutes or more 14 days running. | `{run:'d.focusMin',min:10,gte:14}` | · | U 40 | · |
| fo-run-60 | Sixty days of depth | Keep up 10 minutes of focus a day for 60 days running (freezes allowed). | `{run:'d.focusMin',min:10,gte:60,freeze:true}` | · | E 160 | wear:top-hoodie-calm |
| fo-am-30 | Sharpest before noon | Log an hour of focus before noon on 30 days. | `{days:'d.focusAM',min:60,gte:30}` | · | R 80 | · |
| fo-early | Early start | Start 25 focus sessions before 8 in the morning. | `{n:'focus.before8',gte:25}` | · | U 40 | · |
| fo-break-100 | Rhythm of work | Take 100 proper breaks between focus sessions. | `{n:'focus.breaks',gte:100}` | · | R 80 | treat:sardine |
| fo-stop-done | Timer to tick | Stop the focus timer and finish the task in one go, 50 times. | `{n:'focus.stopDone',gte:50}` | · | U 40 | · |
| fo-range | Range | Focus on 5 kinds of work in one week, in 8 different weeks. | `{days:'w.focusKinds',min:5,gte:8}` | · | R 80 | · |
| fo-big-rock | Deep on what matters | Spend 2 hours of focus, in total, on each of 25 high-priority tasks. | `{n:'focus.p1Task2h',gte:25}` | · | E 160 | · |
| fo-siege | Siege | Focus on a boss task for 3 hours in total, then defeat it. | `{n:'focus.bossSiege',gte:1}` | · | C 20 | · |
| fo-five-days | High-five weeks | Focus for an hour or more on 5 days of a week, in 4 different weeks. | `{cal:'week',s:'d.focusHourDay',gte:5,times:4}` | · | R 80 | · |
| fo-marathon | Marathon task | Put 25 hours of focus into a single task. | `{n:'focus.taskMaxMin',gte:1500}` | · | L 320 | · |
| fo-all-year | All year round | In every month of one year, log 10 hours of focus or more. | `{n:'focus.monthsInYear',gte:12}` | · | L 320 | · |

### 3.12 Inbox and capture (`capture`, `ca-`, 20)

Catch thoughts fast, give them a home quickly, and keep replies at zero.
Today's `inbox-zero` and `inbox-10` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| ca-100 | Butterfly net | Quick-capture 100 thoughts. | `{n:'capture.n',gte:100}` | · | U 40 | · |
| ca-1000 | A thousand sparks | Quick-capture 1,000 thoughts. | `{n:'capture.n',gte:1000}` | · | E 160 | wear:acc-butterfly-net |
| ca-day | Idea storm | Capture 15 thoughts in one day. | `{win:'d.captured',span:1,gte:15}` | · | R 80 | · |
| ca-run | Notebook habit | Capture something 14 days running. | `{run:'d.captured',gte:14}` | · | R 80 | · |
| ca-sorted | A home for everything | Sort 100 captured tasks out of the Inbox. | `{n:'c.inbox-sorted',gte:100}` | · | U 40 | · |
| ca-sorted-fast | Inbox under an hour | Sort 50 captured tasks within an hour of catching them. | `{n:'c.inbox-sorted-fast',gte:50}` | · | R 80 | treat:berries |
| ca-empty | Empty tray | Empty your task Inbox after capturing 3 or more that day, on 5 days. | `{days:'d.inbox-empty',gte:5}` | · | C 20 | · |
| ca-empty-50 | Processing pro | Empty your task Inbox on 50 days. | `{days:'d.inbox-empty',gte:50}` | · | E 160 | · |
| ca-same-day | Thought to done | Finish 25 captured tasks on the day you caught them. | `{n:'capture.sameDayDone',gte:25}` | · | U 40 | · |
| ca-done-250 | From spark to finish | Finish 250 tasks that began as quick captures. | `{n:'capture.done',gte:250}` | · | R 80 | · |
| ca-rich | Fluent | Add 25 tasks with a date, a priority and a tag in one line each. | `{n:'c.qa-rich',gte:25}` | · | C 20 | · |
| ca-syntax-500 | Speaks OpenDash | Add 500 tasks using quick-add shortcuts (dates, !p1, #tags, ~time). | `{n:'c.qa-syntax',gte:500}` | · | R 80 | · |
| ca-page-30 | Always within reach | Capture from the standalone capture page on 30 days. | `{days:'d.capture-page',gte:30}` | · | U 40 | · |
| ca-bulk | Brain dump | Add 10 or more tasks at once with bulk add, 10 times. | `{n:'c.bulk-big',gte:10}` | · | C 20 | · |
| ca-zero-run | Zero, a week running | Reach reply inbox zero 7 days running. | `{run:'d.inboxZero',gte:7}` | · | U 40 | · |
| ca-zero-run-30 | Reply zen | Reach reply inbox zero 30 days running (freezes allowed). | `{run:'d.inboxZero',gte:30,freeze:true}` | · | E 160 | · |
| ca-zero-365 | Reply hero | Reach reply inbox zero on 365 days. | `{days:'d.inboxZero',gte:365}` | · | L 320 | title:Correspondent |
| ca-double-zero | Both inboxes, zero | On 10 days, empty your task Inbox and reach reply inbox zero. | `{same:[['d.inbox-empty',1],['d.inboxZero',1]],gte:10}` | · | R 80 | decor:birdbath |
| ca-triage | Mail to task | Accept 50 tasks suggested from your mail. | `{n:'triage.accepted',gte:50}` | · | R 80 | d1 · needs claude |
| ca-triage-1000 | Signal from noise | Deal with 1,000 email suggestions, accepting or dismissing. | `{n:'triage.handled',gte:1000}` | · | E 160 | needs claude |

### 3.13 Waiting and handing off (`waiting`, `wt-`, 15)

Waiting on people kindly, nudging well, and blocked tasks cleared.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| wt-waiting-10 | Ball's in their court | Mark 10 tasks as waiting on someone. | `{n:'waiting.set',gte:10}` | · | C 20 | · |
| wt-arrived-25 | It came! | Close 25 tasks you were waiting on. | `{n:'waiting.arrived',gte:25}` | · | U 40 | · |
| wt-arrived-250 | Arrivals hall | Close 250 tasks you were waiting on. | `{n:'waiting.arrived',gte:250}` | · | E 160 | · |
| wt-nudge | Polite nudge | Send 25 follow-up nudges. | `{n:'waiting.nudged',gte:25}` | · | U 40 | · |
| wt-nudge-works | Nudge that worked | Get 10 things you waited on within 3 days of nudging. | `{n:'waiting.nudgeWorked',gte:10}` | · | R 80 | · |
| wt-nudge-works-50 | Velvet glove | Have 50 nudges answered within 3 days. | `{n:'waiting.nudgeWorked',gte:50}` | · | E 160 | title:Diplomat |
| wt-people-25 | Delegator | Wait on 25 different people. | `{n:'waiting.people',gte:25}` | · | R 80 | · |
| wt-empty | Nobody owes me | Empty your Waiting list after it held 3 or more, on 5 days. | `{days:'d.waiting-empty',gte:5}` | · | U 40 | · |
| wt-blocked | Order of operations | Mark 25 tasks as blocked by another. | `{n:'blocked.set',gte:25}` | · | C 20 | · |
| wt-blocked-100 | Critical path | Finish 100 tasks after clearing what blocked them. | `{n:'blocked.cleared',gte:100}` | · | R 80 | · |
| wt-fast | That was quick | Receive 25 things within a day of starting to wait for them. | `{n:'waiting.within1',gte:25}` | · | U 40 | · |
| wt-long | The patience of a saint | Close 5 tasks you had waited on for 60 days or more. | `{n:'waiting.long60',gte:5}` | · | R 80 | · |
| wt-chaser | Chaser's round | Nudge 5 or more people in each of 10 weekly reviews. | `{n:'review.nudge5',gte:10}` | · | R 80 | · |
| wt-handoff | Handed over | Have 10 tasks you handed to friends accepted. | `{n:'together.assignedAccepted',gte:10}` | · | E 160 | needs friends |
| wt-handoff-50 | Trusted crew | Have 50 tasks you handed over accepted by friends. | `{n:'together.assignedAccepted',gte:50}` | · | L 320 | title:Team Captain · needs friends |

### 3.14 Tools and craft (`craft`, `cr-`, 20)

Making OpenDash yours: smart lists, boards, the sidebar, Home, templates,
contexts, the keyboard, backups and sync.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| cr-smart-lists-5 | Librarian | Keep 5 smart lists. | `{n:'smartLists.n',gte:5}` | · | C 20 | d1 |
| cr-boards-3 | Board meeting | Keep 3 boards of your own. | `{n:'boards.n',gte:3}` | · | C 20 | · |
| cr-lanes | Swimming lanes | Add swimlanes to 3 boards. | `{n:'boards.lanes',gte:3}` | · | U 40 | · |
| cr-pins | Pinned it | Pin 5 things to the top of the sidebar. | `{n:'sidebar.pins',gte:5}` | · | C 20 | · |
| cr-home-14 | Interior designer | Have 14 or more widgets on Home. | `{n:'home.widgets',gte:14}` | · | U 40 | · |
| cr-twins | Twins | Keep 3 second copies of Home widgets. | `{n:'home.copies',gte:3}` | · | U 40 | · |
| cr-template-50 | Copy, paste, done | Create 50 tasks from templates. | `{n:'tasks.fromTemplate',gte:50}` | · | R 80 | · |
| cr-templates-10 | Template maker | Save 10 task templates of your own. | `{n:'templates.n',gte:10}` | · | R 80 | · |
| cr-contexts | Right place, right time | Give 100 tasks a context like @phone or @computer. | `{n:'tasks.withContext',gte:100}` | · | U 40 | · |
| cr-do-now-20 | What now? | Ask "What can I do now?" on 20 days. | `{days:'d.do-now',gte:20}` | · | R 80 | · |
| cr-palette | Fingers on the keys | Open the command palette on 100 days. | `{days:'d.palette',gte:100}` | · | R 80 | · |
| cr-palette-365 | Keyboard virtuoso | Reach for the command palette on 365 days. | `{days:'d.palette',gte:365}` | · | L 320 | · |
| cr-gkeys | Go, go, go | Jump with 8 different G-key shortcuts. | `{mark:'gkey',gte:8}` | · | U 40 | · |
| cr-views | Every angle | Use the list, board, timeline and matrix views. | `{all:[{has:['view-mode','list']},{has:['view-mode','kanban']},{has:['view-mode','timeline']},{has:['view-mode','matrix']}]}` | · | C 20 | · |
| cr-pages | The grand tour | Open 30 different pages of OpenDash. | `{mark:'view',gte:30}` | · | U 40 | · |
| cr-stream-look | Signature look | Give 8 streams their own icon or shape. | `{n:'streams.marked',gte:8}` | · | R 80 | · |
| cr-backup-3 | Belt and braces | Download backups in 3 different months. | `{mark:'backup-month',gte:3}` | · | R 80 | · |
| cr-backup-12 | Disaster-proof | Download backups in 12 different months. | `{mark:'backup-month',gte:12}` | · | E 160 | · |
| cr-export-12 | Hard copy | Export or print a view in 12 different months. | `{mark:'export-month',gte:12}` | · | E 160 | · |
| cr-sync | Everywhere at once | Keep OpenDash in sync on three devices. | `{n:'sync.devices',gte:3}` | · | E 160 | needs sync |

---

### 3.15 Habits and routines (`habits`, `hb-`, 20)

Repeating tasks kept with care, routines, and gentle comebacks. Today's
`habit-30` and `habit-200` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| hb-daily-21 | Three weeks of a habit | Tick the same daily task 21 days running. | `{n:'habits.bestDailyRun',gte:21}` | · | U 40 | · |
| hb-daily-66 | It stuck | Keep one daily task going 66 days running, the time a habit takes to stick. | `{n:'habits.bestDailyRun',gte:66}` | · | E 160 | title:Habit Former |
| hb-daily-365 | A year without a gap | Tick one daily task every day for 365 days running. | `{n:'habits.bestDailyRun',gte:365}` | · | L 320 | · |
| hb-weekly-26 | Week in, week out | Do a weekly repeating task 26 weeks running. | `{n:'habits.bestWeeklyRun',gte:26}` | · | R 80 | · |
| hb-monthly-12 | Twelve for twelve | Do a monthly repeating task every month for a year. | `{n:'habits.bestMonthlyRun',gte:12}` | · | E 160 | seed:oak-sapling |
| hb-routine | All ticked | Tick every repeating task due that day (3 or more) on 10 days. | `{days:'d.habitsAll',gte:10}` | · | U 40 | d1 |
| hb-routine-100 | Like a metronome | Complete your routine on 100 days. | `{days:'d.habitsAll',gte:100}` | · | R 80 | treat:carrot |
| hb-routine-run | Routine royalty | Complete your routine 21 days running. | `{run:'d.habitsAll',gte:21}` | · | E 160 | · |
| hb-am | Morning routine | Tick 3 repeating tasks before 9 in the morning, on 20 days. | `{days:'d.habitAM',min:3,gte:20}` | · | R 80 | · |
| hb-pm | Twilight trio | Tick 3 repeating tasks after 6 in the evening, on 10 days. | `{days:'d.habitPM',min:3,gte:10}` | · | U 40 | · |
| hb-stack | Habit stack | Keep 5 different repeating tasks going every week, 8 weeks running. | `{run:'w.habitsDistinct',min:5,gte:8}` | · | R 80 | treat:honey |
| hb-revive | Back on the wagon | Tick a repeating task again after a two-week pause, 5 times. | `{n:'habits.revived',gte:5}` | · | C 20 | · |
| hb-weekends | Weekend ritual | Tick a repeating task on 40 different weekends. | `{days:'w.habitWeekend',gte:40}` | · | R 80 | d1 |
| hb-5000 | Five thousand reps | Tick repeating tasks 5,000 times. | `{n:'habitDone',gte:5000}` | · | L 320 | decor:beehive |
| hb-on-the-hour | On the hour | Tick a timed repeating task within 15 minutes of its time, 100 times. | `{n:'habits.onTheHour',gte:100}` | · | R 80 | · |
| hb-year | Every day this year | Tick one daily task on 330 days of a calendar year. | `{n:'habits.bestYearDays',gte:330}` | · | L 320 | banner:evergreen |
| hb-tune | Fine-tuned | Change how often a task repeats, 10 times. | `{n:'habits.recurrenceChanged',gte:10}` | · | U 40 | · |
| hb-created-25 | A life in routines | Make 25 tasks repeat over time. | `{n:'habits.created',gte:25}` | · | R 80 | · |
| hb-stuck | New habit, kept | Keep 5 new repeating tasks going through their first 30 days. | `{n:'habits.firstMonthKept',gte:5}` | · | E 160 | · |
| hb-buddy | Habits, shared | Reach a shared habit goal with a friend in 12 different weeks. | `{n:'together.goalWeeks',gte:12}` | · | E 160 | needs friends |

### 3.16 Rhythm (`rhythm`, `rh-`, 15)

Good days adding up, steady workweeks and coming back after a break. Today's
seven streaks, `frost`, `comeback`, `early-bird`, `night-owl`, `weekend-25`,
`year-one` and `year-two` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| rh-days-b | A year of good days | Get something done on 365 different days. | `{days:'d.done',gte:365}` | gooddays B | R 80 | d1 |
| rh-days-s | Two years of good days | Get something done on 730 different days. | `{days:'d.done',gte:730}` | gooddays S | E 160 | · |
| rh-days-g | Fifteen hundred good days | Get something done on 1,500 different days. | `{days:'d.done',gte:1500}` | gooddays G | L 320 | title:Stalwart |
| rh-workdays-30 | Steady hand | Finish something 30 workdays running (weekends never count). | `{run:'d.done',gte:30,skip:'weekend'}` | · | R 80 | · |
| rh-workdays-120 | The long stretch | Keep finishing something for 120 workdays running. | `{run:'d.done',gte:120,skip:'weekend'}` | · | E 160 | · |
| rh-weeks-13 | A good quarter | Have 13 weeks running with something done on 5 or more days. | `{run:'w.activeDays',min:5,gte:13}` | · | R 80 | · |
| rh-weeks-52 | A year of good weeks | Have 52 weeks running with something done on 4 or more days (freezes allowed). | `{run:'w.activeDays',min:4,gte:52,freeze:true}` | · | L 320 | wear:acc-medal |
| rh-month-25 | Twenty-five-day month | Get something done on 25 days of one month. | `{cal:'month',s:'d.doneAny',gte:25}` | · | U 40 | d1 |
| rh-quarter | Busy quarter | Get something done on 80 days of one quarter. | `{cal:'quarter',s:'d.doneAny',gte:80}` | · | E 160 | · |
| rh-bounce | Bounce back | Come back after a week or more away, five times. | `{n:'rhythm.comebacks7',gte:5}` | · | U 40 | · |
| rh-snow-day | Snow day | Let streak freezes carry your run 25 times. | `{n:'freezesUsed',gte:25}` | · | U 40 | · |
| rh-same-hour | Like a sundial | Finish your first task of the day in the same hour, 10 days running. | `{run:'d.sameFirstHour',gte:10}` | · | E 160 | decor:sundial |
| rh-every-day | Seven-day spread | Get something done on each day of the week at least 100 times. | `{n:'rhythm.minDow',gte:100}` | · | R 80 | · |
| rh-open-run | Daily visitor | Open OpenDash 60 days running. | `{run:'d.open',gte:60}` | · | R 80 | · |
| rh-anniversary | Happy OpenDash day | Open OpenDash on the anniversary of your first day. | `{n:'rhythm.anniversary',gte:1}` | · | C 20 | · |

### 3.17 Rest and balance (`balance`, `bl-`, 20)

Rest that actually happened: weekends off, evenings back, lunch, holidays,
gentle days after big ones. Every one is computed from days you used the app,
so a day you were away never "counts against" anything. Runs keep these hard
(C4): a healthy pattern kept for weeks, not one lucky day in the history.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| bl-weekends-run | Four free weekends | Take 4 weekends off in a row after weeks with 10 or more done. | `{run:'w.weekendOff',gte:4}` | · | C 20 | seed:lavender |
| bl-weekends-26 | Weekends are for living | Take 26 weekends off after weeks with 10 or more done. | `{days:'w.weekendOff',gte:26}` | · | E 160 | wear:scarf-cosy |
| bl-rest-year | A rested year | Take 40 weekends off in one calendar year after busy weeks. | `{cal:'year',s:'w.weekendOff',gte:40}` | · | L 320 | · |
| bl-long-weekend | Long weekend | Take four days off in a row after a busy week, 3 times. | `{n:'balance.longWeekends',gte:3}` | · | U 40 | · |
| bl-six | Home by six | Finish by 6pm on every workday of a week, 4 weeks running. | `{run:'w.earlyFinish',min:5,gte:4}` | · | R 80 | · |
| bl-six-26 | Evenings reclaimed | In 26 different weeks, finish by 6pm on every workday. | `{days:'w.earlyFinish',min:5,gte:26}` | · | E 160 | title:Well Balanced |
| bl-afternoon | Afternoon off | Wrap up a busy workday (5 or more done) by 1pm, on 10 days. | `{days:'d.doneBy13',gte:10}` | · | U 40 | · |
| bl-wrapped-7 | Done by seven | Save the evening review before 7pm, 10 days running. | `{run:'d.eveningEarly',gte:10}` | · | R 80 | wear:top-pyjamas |
| bl-wrapped-100 | Evenings are yours | Finish the day before 7pm on 100 days. | `{days:'d.eveningEarly',gte:100}` | · | E 160 | treat:warm-milk |
| bl-easy | Easy does it | Follow a 10-task day with a gentle day of 1 to 3, 25 times. | `{n:'balance.easyAfterBig',gte:25}` | · | U 40 | · |
| bl-gentle-return | Gentle return | Come back from a week away with a calm first day of 1 to 3 tasks, 3 times. | `{n:'balance.gentleReturn',gte:3}` | · | U 40 | · |
| bl-lunch-run | Lunch is sacred | Keep 12:30 to 13:30 free of tasks and focus on 15 busy workdays running. | `{run:'d.lunchBreak',gte:15,skip:'weekend'}` | · | R 80 | wear:acc-lunchbox |
| bl-lunch-150 | Lunch, properly | Take that lunch break on 150 busy workdays. | `{days:'d.lunchBreak',gte:150}` | · | L 320 | · |
| bl-sprint | Sprint and stretch | Follow 90 minutes of focus with a break of 15 minutes or more, 25 times. | `{n:'focus.bigBreak',gte:25}` | · | R 80 | · |
| bl-even-keel | Even keel | Finish 3 to 10 tasks on every workday of a week, in 8 different weeks. | `{cal:'week',s:'d.steady',gte:5,times:8}` | · | R 80 | · |
| bl-ooo | Out of office | Spend 10 days with the On holiday status on. | `{days:'d.holiday',gte:10}` | · | C 20 | private |
| bl-holiday | Actually on holiday | Spend 10 days on holiday status with 2 or fewer tasks done each day. | `{same:[['d.holiday',1],['d.done',0,2]],gte:10}` | · | U 40 | private |
| bl-holiday-14 | Holiday mode | Keep the holiday status on for 14 days running. | `{run:'d.holiday',gte:14}` | · | R 80 | decor:deckchair · private |
| bl-coffee | Coffee break | Set the On a break status on 25 days. | `{days:'d.status-break',gte:25}` | · | R 80 | wear:acc-teacup |
| bl-weekdays-free | Weekdays for work | Have 3 months with nothing done at weekends and 40 or more on weekdays. | `{n:'balance.monthWeekendFree',gte:3}` | · | E 160 | · |

### 3.18 Notes, journal and memories (`journal`, `jr-`, 22)

Daily notes, the journal and its moods, time capsules, New Year goals, advent
and notes on tasks. Today's `notes-7` (Dear diary) joins.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| jr-daynote-run | Page after page | Write a daily note 14 days running. | `{run:'d.daynote',gte:14}` | · | R 80 | wear:acc-quill |
| jr-daynote-month | A month of pages | Write a daily note on 25 days of one month. | `{cal:'month',s:'d.daynote',gte:25}` | · | E 160 | · |
| jr-daynote-500 | Five hundred pages | Keep a daily note on 500 days. | `{days:'d.daynote',gte:500}` | · | L 320 | · |
| jr-b | Thirty entries | Keep the journal on 30 days. | `{days:'d.journal',gte:30}` | journal B | U 40 | plate:paper |
| jr-s | A hundred entries | Keep the journal on 100 days. | `{days:'d.journal',gte:100}` | journal S | R 80 | · |
| jr-g | A year in lines | Keep the journal on 365 days. | `{days:'d.journal',gte:365}` | journal G | E 160 | title:Chronicler |
| jr-p | Life story | Keep the journal on 1,000 days. | `{days:'d.journal',gte:1000}` | journal P | L 320 | banner:chronicle |
| jr-run | Unbroken thread | Keep the journal 30 days running. | `{run:'d.journal',gte:30}` | · | E 160 | · |
| jr-mood-30 | How was today? | Give 30 days a mood in the journal. | `{n:'journal.moodDays',gte:30}` | · | U 40 | · |
| jr-mood-365 | Year in pixels | Give 365 days a mood. | `{n:'journal.moodDays',gte:365}` | · | E 160 | · |
| jr-own-line | In your own words | Write your own line in the journal on 50 days. | `{n:'journal.ownLines',gte:50}` | · | R 80 | · |
| jr-polish | Polished | Polish 10 journal entries with Claude. | `{n:'journal.polished',gte:10}` | · | C 20 | needs claude |
| jr-capsule | Dear future me | Write 3 time capsules. | `{n:'capsules.written',gte:3}` | · | C 20 | · |
| jr-capsule-open | Letter from the past | Open 3 time capsules on their day. | `{n:'capsules.opened',gte:3}` | · | R 80 | · |
| jr-capsule-year | Patience, sealed | Open a time capsule you sealed a year or more before. | `{n:'capsules.longestOpened',gte:365}` | · | E 160 | decor:time-capsule |
| jr-goals-2 | New Year, new list | Set goals in the New Year ritual in 2 different years. | `{n:'goals.years',gte:2}` | · | R 80 | season 01-01..01-31 |
| jr-goals-10 | Resolution kept | Tick off 10 of your New Year goals. | `{n:'goals.done',gte:10}` | · | R 80 | · |
| jr-advent-24 | All 24 doors | Open all 24 advent doors in one December. | `{n:'advent.bestYear',gte:24}` | · | U 40 | seed:winter-rose · season 12-01..12-24 |
| jr-advent-48 | Two Decembers of doors | Open 48 advent doors. | `{n:'advent.doors',gte:48}` | · | R 80 | season 12-01..12-24 |
| jr-rediscover | Rediscovered | Rediscover a random day from your past on 10 different days. | `{days:'d.rediscover',gte:10}` | · | U 40 | · |
| jr-task-notes | Thinking out loud | Add 500 notes to tasks. | `{n:'notes.task',gte:500}` | · | R 80 | · |
| jr-postcard-line | Wish you were here | Write a line on 10 postcards of first visits. | `{n:'postcards.withNote',gte:10}` | · | U 40 | private |

### 3.19 Money, gently (`money`, `mo-`, 15)

All **private** and all `needs finance`. Facts are yes or no per day, week or
month, computed on the device; no amount is ever stored or shown in an
achievement. Today's `under-budget` and three no-spend ones join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| mo-budget-3 | Three good months | Close 3 budget months within budget. | `{mark:'budget-ok',gte:3}` | · | U 40 | d1 · plate:ledger · private · needs finance |
| mo-budget-12 | A year in the green | Close 12 budget months within budget. | `{mark:'budget-ok',gte:12}` | · | E 160 | title:Steward · private · needs finance |
| mo-budget-36 | Three green years | Close 36 budget months within budget. | `{mark:'budget-ok',gte:36}` | · | L 320 | private · needs finance |
| mo-free-weekend | Purse strings tied | Have 4 no-spend weekends, Saturday and Sunday. | `{n:'money.nospendWeekends',gte:4}` | · | U 40 | private · needs finance |
| mo-quiet-150 | Piggy bank, happy | Have 150 no-spend days. | `{n:'noSpendDays',gte:150}` | · | R 80 | decor:piggy-planter · private · needs finance |
| mo-lighter-4 | Easy on the wallet | Spend less than your usual week (your own 12-week average), 4 weeks running. | `{run:'w.belowAvg',gte:4}` | · | R 80 | private · needs finance |
| mo-lighter-26 | Spending, softly | Have 26 weeks where you spend less than your usual week. | `{days:'w.belowAvg',gte:26}` | · | E 160 | private · needs finance |
| mo-tx | Eyes on it | Look through new transactions on 30 days. | `{days:'d.fin-tx',gte:30}` | · | R 80 | private · needs finance |
| mo-recat | Tidy books | Fix the category of 100 transactions. | `{n:'c.fin-recat',gte:100}` | · | U 40 | private · needs finance |
| mo-recurring | Subscription audit | Look through your recurring payments in 4 different months. | `{mark:'fin-recurring',gte:4}` | · | C 20 | private · needs finance |
| mo-whatif | What if? | Try "What if I cut...?" in 3 different months. | `{mark:'fin-whatif',gte:3}` | · | C 20 | private · needs finance |
| mo-story | Money talks | Play your money story to the end in 6 different months. | `{cal:'month',s:'d.story-money',gte:1,times:6}` | · | U 40 | private · needs finance |
| mo-weekly | Weekly money check | Open Finances 12 weeks running. | `{run:'w.fin-visit',gte:12}` | · | R 80 | private · needs finance |
| mo-weekly-52 | A year of money checks | Open Finances in 52 different weeks. | `{days:'w.fin-visit',gte:52}` | · | E 160 | private · needs finance |
| mo-review | Spend, reviewed | Save 12 weekly reviews that include your spending. | `{n:'review.withMoney',gte:12}` | · | R 80 | private · needs finance |

### 3.20 Places and travel (`places`, `pc-`, 20)

All **private**; `needs locations` unless marked `needs travel`. Built in B5
with the Play shelf (it shares the scenes' place data). Today's `places-5`,
`places-25`, `cities-10` and `countries-3` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| pc-countries-10 | Passport stamps | Spend time in 10 countries. | `{n:'countries',gte:10}` | · | E 160 | wear:hat-explorer · private · needs locations |
| pc-countries-25 | Citizen of the world | Spend time in 25 countries. | `{n:'countries',gte:25}` | · | L 320 | private · needs locations |
| pc-cont-3 | Three continents | Spend time on 3 continents. | `{n:'places.continents',gte:3}` | · | R 80 | private · needs locations |
| pc-cont-6 | Round the world | Spend time on 6 continents. | `{n:'places.continents',gte:6}` | · | L 320 | banner:world-map · private · needs locations |
| pc-km-10k | Ten thousand kilometres | Travel 10,000 km in all, as the crow flies. | `{n:'places.km',gte:10000}` | · | U 40 | wear:shoes-hiking · private · needs locations |
| pc-km-earth | Once around the Earth | Travel 40,075 km in all. | `{n:'places.km',gte:40075}` | · | E 160 | title:World Traveller · private · needs locations |
| pc-km-moon | To the Moon | Travel 384,400 km in all. | `{n:'places.km',gte:384400}` | · | L 320 | private · needs locations |
| pc-zones | Jet-setter | Cross 25 time zones. | `{n:'places.zonesCrossed',gte:25}` | · | R 80 | private · needs locations |
| pc-abroad-100 | Work from anywhere | Finish 100 tasks abroad. | `{n:'places.tasksAbroad',gte:100}` | · | R 80 | private · needs locations |
| pc-away-14 | A fortnight abroad | Spend 14 days in a row abroad. | `{n:'places.longestAway',gte:14}` | · | U 40 | private · needs locations |
| pc-away-60 | A season away | Spend 60 days in a row abroad. | `{n:'places.longestAway',gte:60}` | · | E 160 | private · needs locations |
| pc-cities-100 | Urbanist | Visit 100 towns and cities. | `{n:'cities',gte:100}` | · | E 160 | private · needs locations |
| pc-new-months | New horizons | Visit a town for the first time in 12 different months. | `{n:'places.newPlaceMonths',gte:12}` | · | R 80 | private · needs locations |
| pc-five-new | Five new towns | Visit 5 towns for the first time in one month. | `{n:'places.newCitiesMonthMax',gte:5}` | · | U 40 | private · needs locations |
| pc-far | Far, far away | Be 10,000 km from home. | `{n:'places.furthestKm',gte:10000}` | · | E 160 | private · needs locations |
| pc-south | Upside down | Cross into the southern hemisphere. | `{n:'locBadge.south',gte:1}` | · | R 80 | private · needs locations |
| pc-arctic | Land of the midnight sun | Go north of the Arctic Circle. | `{n:'locBadge.arctic',gte:1}` | · | E 160 | accent:aurora · private · needs locations |
| pc-where | Where was I? | Ask "Where was I on...?" on 5 different days. | `{days:'d.where-was-i',gte:5}` | · | C 20 | private · needs locations |
| pc-trip-10 | Seasoned traveller | Take 10 trips. | `{n:'trips.confirmed',gte:10}` | · | R 80 | decor:signpost · private · needs travel |
| pc-happy-place | Happy place | Get 500 tasks done in one town. | `{n:'places.maxCityDone',gte:500}` | · | R 80 | d1 · private · needs locations |

---

### 3.21 People and kindness (`people`, `pp-`, 22)

Remembering people, birthdays, catch-ups, follow-through and thanks. Today's
`people-10` and `people-50` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| pp-50 | Your people | Have 50 people in People. | `{n:'people.n',gte:50}` | · | U 40 | d1 |
| pp-birthdays | Never forget | Add 20 birthdays to People. | `{n:'people.birthdays',gte:20}` | · | U 40 | · |
| pp-birthday-task | Birthday remembered | Finish a task for someone within two days of their birthday, 5 times. | `{n:'people.birthdayTasks',gte:5}` | · | R 80 | · |
| pp-birthday-25 | Card on time, every time | Remember 25 birthdays with a task done for the person. | `{n:'people.birthdayTasks',gte:25}` | · | E 160 | title:Thoughtful |
| pp-notes | Good listener | Write notes on 25 different people. | `{n:'people.withNotes',gte:25}` | · | R 80 | · |
| pp-catchup | Long time no see | Catch up with 5 people it had been a while with. | `{n:'awards.person-catchup',gte:5}` | · | U 40 | · |
| pp-catchup-50 | Keeps in touch | Catch up 50 times with people it had been a while with. | `{n:'awards.person-catchup',gte:50}` | · | E 160 | seed:forget-me-not |
| pp-owe-clear | All square | Clear your I owe list after it held 3 or more, on 5 days. | `{days:'d.owe-clear',gte:5}` | · | C 20 | · |
| pp-team-week | Five people, one week | Finish tasks for 5 different people in one week, in 8 weeks. | `{days:'w.peopleDistinct',min:5,gte:8}` | · | R 80 | · |
| pp-1000 | Generous with your time | Finish 1,000 tasks linked to people. | `{n:'peopleTasks',gte:1000}` | · | L 320 | · |
| pp-links | Connected dots | Accept 50 suggested links between tasks and people. | `{n:'c.link-accept',gte:50}` | · | R 80 | · |
| pp-merge | Same person, really | Merge 5 pairs of records of the same person. | `{n:'c.people-merge',gte:5}` | · | C 20 | · |
| pp-pin | Close circle | Pin 5 people to the sidebar. | `{n:'people.pinned',gte:5}` | · | U 40 | · |
| pp-thanks | Thank you note | Send friends 25 thank yous. | `{n:'fun.thanksSent',gte:25}` | · | R 80 | needs friends |
| pp-followup | True to your word | After meeting someone, finish a task for them within 2 days, 50 times. | `{n:'people.meetingFollowups',gte:50}` | · | E 160 | needs calendar |
| pp-reconnected | Reconnected | Pick things up with 5 people after six quiet months with each. | `{n:'people.reconnected',gte:5}` | · | R 80 | · |
| pp-group | Group effort | Finish 25 tasks linked to 4 or more people. | `{n:'tasks.people4',gte:25}` | · | R 80 | · |
| pp-regular | Steadfast | Finish tasks for the same person in 36 different months. | `{n:'people.bestMonths',gte:36}` | · | L 320 | · |
| pp-roles | Who's who | Give 25 people a role. | `{n:'people.withRole',gte:25}` | · | U 40 | · |
| pp-faces | Faces to names | Add a photo or avatar to 25 people. | `{n:'people.withAvatar',gte:25}` | · | R 80 | · |
| pp-met-100 | In good company | Meet 100 different people from People in your calendar. | `{n:'people.metDistinct',gte:100}` | · | E 160 | needs calendar |
| pp-distinct-100 | A hundred helped | Finish tasks linked to 100 different people. | `{n:'peopleDistinct',gte:100}` | · | E 160 | · |

### 3.22 Calendar and meetings (`meetings`, `mt-`, 18)

Prepared meetings, follow-ups, maker's days and a calendar that serves you.
`needs calendar` unless marked otherwise.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| mt-prep | Came prepared | Write notes for 10 meetings before they start. | `{n:'cal.prepBefore',gte:10}` | · | U 40 | needs calendar |
| mt-prep-100 | Never caught cold | Prepare notes for 100 meetings before they start. | `{n:'cal.prepBefore',gte:100}` | · | E 160 | title:Prepared · needs calendar |
| mt-wrapup | Action items | Turn 10 meetings into tasks with After meetings. | `{n:'tasks.fromWrapup',gte:10}` | · | C 20 | needs calendar |
| mt-wrapup-100 | Minute taker | Turn 100 meetings into follow-up tasks. | `{n:'tasks.fromWrapup',gte:100}` | · | R 80 | needs calendar |
| mt-same-day | Same-day follow-up | Finish 25 meeting follow-up tasks on the day of the meeting. | `{n:'wrapup.sameDayDone',gte:25}` | · | R 80 | needs calendar |
| mt-maker | Maker's day | Have 5 workdays with no meetings and 2 hours of focus. | `{same:[['d.noMeetingsWorkday',1],['d.focusMin',120]],gte:5}` | · | U 40 | needs calendar |
| mt-maker-50 | Guardian of the calendar | Have 50 maker's days. | `{same:[['d.noMeetingsWorkday',1],['d.focusMin',120]],gte:50}` | · | E 160 | needs calendar |
| mt-gap | Gap filler | Fill gaps between meetings on 10 days. | `{days:'d.gap',gte:10}` | · | U 40 | needs calendar |
| mt-gap-50 | Slot machine | Use Fill the gap between meetings on 50 days. | `{days:'d.gap',gte:50}` | · | R 80 | needs calendar |
| mt-clash | Clash resolved | Answer 25 invites or clashes from Invites and clashes. | `{n:'c.cal-invite',gte:25}` | · | U 40 | needs calendar |
| mt-busy | Back-to-back survivor | Get through 5 days with 6 or more meetings and still finish 3 tasks. | `{same:[['d.meetings',6],['d.done',3]],gte:5}` | · | R 80 | needs calendar |
| mt-create | Booked it | Add 25 events to your calendar from OpenDash. | `{n:'c.cal-created',gte:25}` | · | C 20 | needs calendar |
| mt-linked | Joined up | Link 50 tasks to calendar events. | `{n:'cal.linkedTasks',gte:50}` | · | R 80 | needs calendar |
| mt-1500 | Meeting veteran | Get through 1,500 meetings. | `{n:'cal.meetings',gte:1500}` | · | E 160 | needs calendar |
| mt-quiet-week | Calendar breathing room | Have 12 workweeks with 3 hours of meetings or less and 10 or more done. | `{n:'cal.quietWeeks',gte:12}` | · | R 80 | needs calendar |
| mt-find-time | Found a time | Use Find a time with friends 10 times. | `{n:'c.find-a-time',gte:10}` | · | E 160 | needs friends |
| mt-countdown | The day arrives | Reach the day of 25 countdowns. | `{n:'countdowns.reached',gte:25}` | · | L 320 | · |
| mt-clear-days | Clear calendar | Have 250 workdays with no meetings at all. | `{days:'d.noMeetingsWorkday',gte:250}` | · | L 320 | needs calendar |

### 3.23 Friends and together (`friends`, `fr-`, 22)

Doing things together, never ranking. All `needs friends`. Today's ten
friends achievements join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| fr-3 | Friend group | Have 3 friends on OpenDash. | `{n:'friends',gte:3}` | · | C 20 | d1 · needs friends |
| fr-10 | The whole gang | Have 10 friends on OpenDash. | `{n:'friends',gte:10}` | · | R 80 | needs friends |
| fr-space | Shared space | Finish 10 tasks in shared spaces with friends. | `{n:'together.sharedDone',gte:10}` | · | C 20 | needs friends |
| fr-space-250 | Many hands | Finish 250 tasks in shared spaces. | `{n:'together.sharedDone',gte:250}` | · | E 160 | needs friends |
| fr-coop-25 | Co-op crew | Finish 25 co-op tasks with friends. | `{n:'coopDone',gte:25}` | · | R 80 | wear:top-team-jersey · needs friends |
| fr-team-quest | Team quest | Complete 5 team quests. | `{n:'awards.team-quest',gte:5}` | · | U 40 | needs friends |
| fr-trophy | Friendly rivalry | Win 5 friendly challenge trophies. | `{n:'awards.trophy',gte:5}` | · | R 80 | needs friends |
| fr-focus | Side by side | Focus together with a friend 5 times. | `{n:'together.focusSessions',gte:5}` | · | C 20 | needs friends |
| fr-focus-50h | Study buddies | Focus together for 50 hours in all. | `{n:'together.focusMin',gte:3000}` | · | E 160 | needs friends |
| fr-cheer-500 | Hype squad | Cheer friends on 500 times. | `{n:'cheersSent',gte:500}` | · | E 160 | needs friends |
| fr-cards-10 | Pen pal | Send 10 scene cards to friends. | `{n:'fun.postcardsSent',gte:10}` | · | U 40 | plate:postcard · needs friends |
| fr-cards-100 | Prolific correspondent | Send 100 scene cards to friends. | `{n:'fun.postcardsSent',gte:100}` | · | R 80 | needs friends |
| fr-wave | Wave hello | Wave at friends 100 times. | `{n:'fun.wavesSent',gte:100}` | · | U 40 | needs friends |
| fr-gifts-50 | Wrapping expert | Send friends 50 gifts. | `{n:'giftsSent',gte:50}` | · | R 80 | needs friends |
| fr-duo-365 | Two of a kind | Keep a 365-day duo streak with a friend. | `{n:'duoBest',gte:365}` | · | L 320 | banner:two-of-a-kind · needs friends |
| fr-level-5 | Thick as thieves | Reach friendship level 5 with someone. | `{n:'fun.friendLevelMax',gte:5}` | · | R 80 | needs friends |
| fr-level-8 | Friends for life | Reach friendship level 8 with someone, every friendship reward open. | `{n:'fun.friendLevelMax',gte:8}` | · | E 160 | title:Best Friend · needs friends |
| fr-stickers | Full sticker book | Collect every sticker that is not seasonal. | `{n:'fun.stickersCore',gte:11}` | · | R 80 | needs friends |
| fr-goal | Accountability buddy | Hit an accountability goal with a friend in 8 different weeks. | `{n:'awards.goal-hit',gte:8}` | · | U 40 | needs friends |
| fr-plan | Planners assemble | Put 50 things on Plan together boards. | `{n:'together.planCards',gte:50}` | · | U 40 | needs friends |
| fr-in-scene | Look who's here | See friends walk through your scenes on 10 different days. | `{mark:'friend-in-scene',gte:10}` | · | E 160 | needs friends |
| fr-costume | Dressed for the party | Wear the event costume during 3 different friends' events. | `{mark:'event-costume',gte:3}` | · | L 320 | needs friends · season: while an event runs |

### 3.24 Quests, bosses and records (`game`, `gm-`, 15)

The game itself. Today's bosses, quests, levels and `xp-day-300` join.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| gm-bonus-25 | Bonus round | Finish 25 bonus tasks of the day. | `{n:'game.bonusDone',gte:25}` | · | U 40 | · |
| gm-bonus-250 | Double or nothing | Finish 250 bonus tasks of the day. | `{n:'game.bonusDone',gte:250}` | · | E 160 | · |
| gm-combo-10 | Combo! | Make a combo of 10, each task within 20 minutes of the last. | `{n:'game.comboBest',gte:10}` | · | U 40 | · |
| gm-combo-20 | Unstoppable | Make a combo of 20. | `{n:'game.comboBest',gte:20}` | · | R 80 | plate:neon |
| gm-records-25 | Raising the bar | Set 25 personal records. | `{n:'c.record',gte:25}` | · | R 80 | title:Record Breaker |
| gm-quest-kinds | Jack of all quests | Complete 10 different kinds of quest. | `{n:'game.questKinds',gte:10}` | · | R 80 | · |
| gm-perfect-12 | Flawless season | Complete every quest 12 weeks running. | `{run:'w.questPerfect',gte:12}` | · | E 160 | accent:royal |
| gm-quests-250 | Quest-hardened | Complete 250 weekly quests. | `{n:'questsDone',gte:250}` | · | E 160 | · |
| gm-swift | Swift justice | Defeat 10 boss tasks on the day you made them. | `{n:'game.bossSameDay',gte:10}` | · | U 40 | · |
| gm-titan | Titan | Defeat a boss task with 20 or more subtasks. | `{n:'bossBig',gte:20}` | · | R 80 | wear:top-cape |
| gm-xp-week | XP avalanche | Earn 2,500 XP in one week. | `{cal:'week',s:'d.xp',gte:2500}` | · | R 80 | · |
| gm-xp-800 | Supernova | Earn 800 XP in one day. | `{win:'d.xp',span:1,gte:800}` | · | E 160 | banner:fireworks |
| gm-full | Turn it up | Play with the Fun level on Full on 30 days. | `{days:'d.fun-full',gte:30}` | · | C 20 | · |
| gm-xp-year | A year of XP | Earn 50,000 XP in one calendar year. | `{cal:'year',s:'d.xp',gte:50000}` | · | L 320 | · |
| gm-boss-500 | Boss slayer | Defeat 500 boss tasks. | `{n:'bossDefeated',gte:500}` | · | L 320 | · |

### 3.25 Secrets (`secrets`, `sx-`, 20)

Every one is `secret: true`: the wall shows "???" and the clue until earned;
the hardest have no clue at all (C8). The "What to do" column is for builders
only.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| sx-1111 | Make a wish | Finish 11 tasks at 11:11. | `{n:'secret.done1111',gte:11}` | · | R 80 | secret · clue "Some minutes are luckier than others." |
| sx-midnight | Cinderella | Finish 3 tasks at exactly midnight. | `{n:'secret.doneMidnight',gte:3}` | · | L 320 | wear:shoes-glass-slipper · secret · no clue |
| sx-fri13 | Lucky for some | Finish 13 tasks on a Friday the 13th. | `{days:'d.done',min:13,gte:1,on:{fri13:true}}` | · | R 80 | d1 · secret · clue "An unlucky day, they say. Prove them wrong." |
| sx-leap | Leap of faith | Finish a task on 29 February. | `{days:'d.doneAny',gte:1,on:{md:'02-29'}}` | · | E 160 | secret · clue "Once every four years." (next: 2028) |
| sx-pi | Easy as pi | Finish 14 tasks on 14 March. | `{days:'d.done',min:14,gte:1,on:{md:'03-14'}}` | · | U 40 | treat:apple-pie · secret · clue "3.14" |
| sx-may4 | May the fourth | Finish 4 tasks on 4 May, in 2 different years. | `{days:'d.done',min:4,gte:2,on:{md:'05-04'}}` | · | R 80 | secret · clue "...be with you." |
| sx-palindrome | Palindrome | Finish a task on a date that reads the same both ways (YYYYMMDD). | `{days:'d.doneAny',gte:1,on:{palindrome:true}}` | · | L 320 | secret · clue "Read the date backwards." (next one: 2030-03-02) |
| sx-clean-slate | Clean slate | Have nothing open at all, after 50 or more tasks done. | `{days:'d.zero-open',gte:1}` | · | E 160 | secret · no clue |
| sx-konami | Up, up, down, down | Enter the old code on the Game page. | `{mark:'konami',gte:1}` | · | U 40 | accent:retro · secret · clue "An old code still works on the Game page." |
| sx-ring | Ring the bell | Click your level ring 10 times in a row. | `{mark:'ring',gte:1}` | · | C 20 | secret · clue "Your level ring likes attention." |
| sx-birthday | Cake involved | Finish a task on your birthday, in 3 different years. | `{days:'d.doneAny',gte:3,on:{birthday:true}}` | · | E 160 | treat:cake · secret · clue "It's your day." |
| sx-new-year | Happy New Year | Open OpenDash in the first hour of 1 January. | `{n:'secret.newYearOpen',gte:1}` | · | R 80 | accent:midnight · secret · clue "Be here when the year turns." |
| sx-42 | The answer | Have exactly 42 open tasks. | `{mark:'open42',gte:1}` | · | U 40 | secret · clue "Life, the universe and everything." |
| sx-flipflop | Changed my mind | Mark a task done, undone and done again within a minute. | `{mark:'flipflop',gte:1}` | · | U 40 | secret · clue "Done. Not done. Done!" |
| sx-light-switch | Light switch | Switch between light and dark 5 times within a minute. | `{mark:'theme-flip',gte:1}` | · | R 80 | secret · clue "Day, night, day, night..." |
| sx-24-7 | Twenty-four seven | Finish tasks in every hour of the clock, across all your history. | `{n:'secret.hoursCovered',gte:24}` | · | L 320 | secret · no clue |
| sx-full-moon | Moonstruck | Finish 10 tasks on each of 12 full-moon days. | `{days:'d.done',min:10,gte:12,on:{fullMoon:true}}` | · | E 160 | secret · clue "Look up on the right night." |
| sx-solstices | Longest and shortest | Finish 5 tasks on 21 June and 5 on 21 December. | `{all:[{days:'d.done',min:5,gte:1,on:{md:'06-21'}},{days:'d.done',min:5,gte:1,on:{md:'12-21'}}]}` | · | R 80 | secret · clue "Make the most of the light." |
| sx-settings | Under the bonnet | Open 25 different Settings groups. | `{mark:'settings-group',gte:25}` | · | E 160 | secret · clue "Every switch, every group." |
| sx-everywhere | Been everywhere | Visit every page in All pages. | `{n:'pages.visitedAll',gte:1}` | · | E 160 | secret · clue "Leave no page unturned." |

---

### 3.26 Garden (`garden`, `gd-`, 20)

All `needs garden` (2.18 garden engine; the friend ones also `needs friends`,
garden social). Fact names follow the contract in 1.8. If the garden grows
from history (things ever finished), its back-filled facts count against the
budget (C3): keep the early ones about tending, not totals.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| gd-seed-25 | Green fingers | Plant 25 seeds. | `{n:'garden.planted',gte:25}` | · | C 20 | d1 · needs garden |
| gd-species-10 | Botanist | Grow 10 different plants. | `{n:'garden.species',gte:10}` | species B | U 40 | needs garden |
| gd-species-30 | Living library | Grow 30 different plants. | `{n:'garden.species',gte:30}` | species S | R 80 | needs garden |
| gd-species-60 | Every leaf in the book | Grow 60 different plants. | `{n:'garden.species',gte:60}` | species G | E 160 | title:Head Gardener · needs garden |
| gd-harvest-25 | First harvests | Harvest 25 times. | `{n:'garden.harvests',gte:25}` | · | U 40 | needs garden |
| gd-harvest-500 | Bumper crop | Harvest 500 times. | `{n:'garden.harvests',gte:500}` | · | E 160 | wear:top-apron · needs garden |
| gd-tend-14 | Tended | Tend your garden 14 days running. | `{run:'d.gardenTend',gte:14}` | · | R 80 | needs garden |
| gd-tend-100 | Labour of love | Tend your garden 100 days running (freezes allowed). | `{run:'d.gardenTend',gte:100,freeze:true}` | · | L 320 | needs garden |
| gd-decor | Gnome sweet gnome | Place 10 decorations. | `{n:'garden.decor',gte:10}` | · | C 20 | needs garden |
| gd-decor-30 | Landscaper | Place 30 different decorations. | `{n:'garden.decorDistinct',gte:30}` | · | R 80 | needs garden |
| gd-visitors-10 | A visitor! | Spot 10 kinds of garden visitor. | `{n:'garden.visitorsDistinct',gte:10}` | · | U 40 | needs garden |
| gd-visitors-all | Birdwatcher | Spot every kind of everyday visitor. | `{n:'garden.visitorsCommonAll',gte:1}` | · | E 160 | wear:acc-binoculars · needs garden |
| gd-rare | Once in a blue moon | Spot 3 rare visitors. | `{n:'garden.visitorsRare',gte:3}` | · | E 160 | secret · no clue · needs garden |
| gd-shop | Window shopping | Buy 25 things from the garden shop. | `{n:'garden.shopBuys',gte:25}` | · | U 40 | needs garden |
| gd-level-10 | Growing up | Reach garden level 10. | `{n:'garden.level',gte:10}` | · | R 80 | plate:leaf · needs garden |
| gd-level-25 | Paradise | Reach garden level 25. | `{n:'garden.level',gte:25}` | · | L 320 | banner:paradise · needs garden |
| gd-almanac | Almanac author | Fill 50 entries in the garden almanac. | `{n:'garden.almanac',gte:50}` | · | R 80 | needs garden |
| gd-seasons | Bloom all year | Have something in bloom in spring, summer, autumn and winter. | `{n:'garden.bloomSeasons',gte:4}` | · | R 80 | decor:fountain · needs garden |
| gd-focus | Grown with focus | Grow 25 plants from focus sessions. | `{n:'garden.focusGrown',gte:25}` | · | R 80 | needs garden |
| gd-water | Good neighbour | Water friends' plants 100 times. | `{n:'garden.friendWaters',gte:100}` | · | E 160 | needs garden, friends |

### 3.27 Pets (`pets`, `pt-`, 15)

All `needs pets` (2.18 pets).

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| pt-name | What's in a name? | Adopt a pet and give it a name. | `{all:[{n:'pets.adopted',gte:1},{n:'pets.named',gte:1}]}` | · | C 20 | needs pets |
| pt-outfit | Pet couture | Put 5 different outfits on your pet. | `{n:'pets.outfits',gte:5}` | · | C 20 | needs pets |
| pt-care-14 | Fed and happy | Look after your pet 14 days running. | `{run:'d.petCare',gte:14}` | · | U 40 | treat:bone · needs pets |
| pt-care-60 | Devoted | Look after your pet 60 days running (freezes allowed). | `{run:'d.petCare',gte:60,freeze:true}` | · | E 160 | treat:feast · needs pets |
| pt-treat-100 | Who's a good pet? | Give your pet 100 treats. | `{n:'pets.treats',gte:100}` | · | U 40 | needs pets |
| pt-two | The more the merrier | Have two pets. | `{n:'pets.adopted',gte:2}` | · | U 40 | needs pets |
| pt-tricks-5 | Party tricks | Teach your pet 5 tricks. | `{n:'pets.tricks',gte:5}` | · | R 80 | needs pets |
| pt-tricks-all | Show-stopper | Teach your pet every trick. | `{n:'pets.tricksAll',gte:1}` | · | E 160 | title:Pet Whisperer · needs pets |
| pt-level-10 | Level ten fluff | Raise a pet to level 10. | `{n:'pets.levelMax',gte:10}` | · | R 80 | needs pets |
| pt-company | Quiet companion | Have your pet keep you company through 50 focus sessions. | `{n:'pets.focusSessions',gte:50}` | · | R 80 | needs pets |
| pt-pats | Head pats | Pat your pet 1,000 times. | `{n:'pets.pats',gte:1000}` | · | R 80 | needs pets |
| pt-garden | Playtime outside | Let your pet play in your garden on 25 days. | `{n:'pets.inGarden',gte:25}` | · | R 80 | needs pets, garden |
| pt-all-kinds | Menagerie | Adopt every kind of pet. | `{n:'pets.kindsAll',gte:1}` | · | E 160 | needs pets |
| pt-year | Gotcha day | Have the same pet for a whole year. | `{n:'pets.oldestDays',gte:365}` | · | E 160 | banner:paw-prints · needs pets |
| pt-two-years | Old friends | Keep the same pet for two years. | `{n:'pets.oldestDays',gte:730}` | · | L 320 | needs pets |

### 3.28 Wardrobe and profile (`style`, `st-`, 15)

The profile and avatar today (2.17), the wardrobe and you (2.18).

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| st-avatar | Looking good | Make your avatar your own. | `{n:'profile.avatarEdits',gte:1}` | · | C 20 | d1 |
| st-profile | All about me | Fill in your name, pronouns, bio and what you're working on. | `{n:'profile.complete',gte:1}` | · | C 20 | d1 |
| st-status-30 | Status update | Set a status on 30 days. | `{days:'d.status',gte:30}` | · | U 40 | · |
| st-status-365 | A year of statuses | Set a status on 365 days. | `{days:'d.status',gte:365}` | · | L 320 | · |
| st-items-25 | Clothes horse | Own 25 wardrobe items. | `{n:'wardrobe.items',gte:25}` | wardrobe B | U 40 | needs wardrobe |
| st-items-100 | Walk-in wardrobe | Own 100 wardrobe items. | `{n:'wardrobe.items',gte:100}` | wardrobe S | E 160 | plate:velvet · needs wardrobe |
| st-outfits-7 | A look for every day | Save 7 outfits. | `{n:'wardrobe.outfits',gte:7}` | · | U 40 | needs wardrobe |
| st-sets-3 | Matching sets | Complete 3 wardrobe sets. | `{n:'wardrobe.sets',gte:3}` | · | R 80 | needs wardrobe |
| st-plates-5 | Name in lights | Use 5 different nameplates. | `{mark:'you-nameplate',gte:5}` | · | U 40 | needs you |
| st-banners-5 | Flag collector | Use 5 different profile banners. | `{mark:'you-banner',gte:5}` | · | R 80 | needs you |
| st-titles-5 | Titled | Wear 5 different titles under your name. | `{mark:'you-title',gte:5}` | · | R 80 | needs you |
| st-titles-25 | Many names, one you | Earn 25 titles. | `{n:'you.titles',gte:25}` | · | E 160 | needs you |
| st-seasonal-8 | Through the seasons | Collect 8 seasonal outfit pieces. | `{n:'profile.collected',gte:8}` | · | R 80 | · |
| st-seasonal-24 | Seasonal collector | Collect 24 seasonal outfit pieces. | `{n:'profile.collected',gte:24}` | · | E 160 | · |
| st-seasons | Four looks a year | Change your look in all four seasons of one year. | `{n:'profile.lookSeasons',gte:4}` | · | R 80 | · |

### 3.29 Scenes and seasons (`scenes`, `sc-`, 18)

The animation library, scenes, the sky, festivals and stories.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| sc-25 | Window seat | Watch 25 different scenes for 20 seconds or more. | `{n:'scenes.seen',gte:25}` | scenes B | U 40 | wear:hat-beret |
| sc-100 | Grand tour | Watch 100 different scenes. | `{n:'scenes.seen',gte:100}` | scenes S | R 80 | · |
| sc-300 | Armchair traveller | Watch 300 different scenes. | `{n:'scenes.seen',gte:300}` | scenes G | E 160 | title:Grand Tourist |
| sc-600 | Every window in the house | Watch 600 different scenes. | `{n:'scenes.seen',gte:600}` | scenes P | L 320 | · |
| sc-packs | Scene sampler | Watch scenes from 15 different packs. | `{n:'scenes.packs',gte:15}` | · | R 80 | · |
| sc-tod | Dawn to midnight | See scenes at dawn, by day, at dusk and at night. | `{mark:'scene-tod',gte:4}` | · | C 20 | · |
| sc-weather | Whatever the weather | See rain, snow, fog and a storm in your scenes. | `{all:[{has:['scene-wx','rain']},{has:['scene-wx','snow']},{has:['scene-wx','fog']},{has:['scene-wx','storm']}]}` | · | R 80 | wear:acc-umbrella |
| sc-first-snow | First snow | Be here for the first snowy day of two winters. | `{n:'scenes.firstSnow',gte:2}` | · | E 160 | season 11-01..02-28 |
| sc-opening-100 | Curtain up | Watch the opening scene on 100 days. | `{days:'d.opening',gte:100}` | · | R 80 | · |
| sc-gallery | Curator | Choose scenes for 5 of your moments. | `{n:'anim.overrides',gte:5}` | · | U 40 | · |
| sc-festival-3 | Festive | See 3 different festival moments. | `{mark:'festival',gte:3}` | · | C 20 | · |
| sc-festivals-12 | Calendar of joy | See 12 different festival moments. | `{mark:'festival',gte:12}` | · | E 160 | accent:sakura |
| sc-rewards | Collector's edition | Unlock every reward animation. | `{n:'anim.rewardsAll',gte:1}` | · | E 160 | d1 · banner:gallery |
| sc-stories | Storyteller | Play all four kinds of story: morning, evening, week and money. | `{n:'stories.kinds',gte:4}` | · | U 40 | · |
| sc-midsummer | Midsummer | Open OpenDash on 21 June in two different years. | `{days:'d.open',gte:2,on:{md:'06-21'}}` | · | R 80 | season 06-21..06-21 |
| sc-local | Home turf | Watch 5 scenes of the place you live. | `{mark:'scene-local',gte:5}` | · | U 40 | · |
| sc-sky | Stargazer | See 25 different things in tonight's sky. | `{mark:'sky',gte:25}` | · | R 80 | plate:starlight |
| sc-seasons | Turn of the year | See your scenes in all four seasons. | `{mark:'scene-season',gte:4}` | · | E 160 | · |

### 3.30 Meta and collections (`meta`, `mx-`, 12)

Built last (B5): they count the others. History unlocks count (the thresholds
sit above what a long-time user earns on day one), except `mx-hot-week` and
`mx-shelves`, which count only what is earned after the update.

| id | Name | What to do | Condition | Tier | Rarity | Unlock · flags |
|---|---|---|---|---|---|---|
| mx-100 | Centurion | Earn 100 achievements. | `{meta:{},gte:100}` | · | R 80 | plate:marble |
| mx-200 | Two hundred strong | Earn 200 achievements. | `{meta:{},gte:200}` | · | E 160 | plate:gold |
| mx-400 | Nearly everything | Earn 400 achievements. | `{meta:{},gte:400}` | · | L 320 | title:Completionist |
| mx-shelves | Well rounded | Earn an achievement on every shelf after this update. | `{meta:{shelves:5,noHist:true}}` | · | U 40 | · |
| mx-hot-week | Hot streak | Earn 5 achievements in one week, not counting your history. | `{meta:{inWeek:5}}` | · | U 40 | · |
| mx-category | Full set | Earn every achievement in one category. | `{meta:{catComplete:1}}` | · | R 80 | · |
| mx-epic-5 | Epic tales | Earn 5 epic achievements. | `{meta:{rarity:'epic'},gte:5}` | · | R 80 | · |
| mx-secrets-5 | Sleuth | Find 5 secret achievements. | `{meta:{secret:true},gte:5}` | · | R 80 | wear:hat-deerstalker |
| mx-gold-3 | Gold standard | Reach gold in 3 series. | `{meta:{tier:'gold'},gte:3}` | · | E 160 | · |
| mx-platinum | Platinum | Reach platinum in any series. | `{meta:{tier:'platinum'},gte:1}` | · | E 160 | · |
| mx-legendary-3 | Legend has it | Earn 3 legendary achievements. | `{meta:{rarity:'legendary'},gte:3}` | · | E 160 | · |
| mx-secrets-all | Keeper of secrets | Find every secret achievement. | `{meta:{secret:true,all:true}}` | · | E 160 | banner:secrets |

---

### 3.31 Series

Steep tiers (C6): bronze is a real milestone, platinum always Legendary.

| Series | Fact | Members (tier: target, rarity) |
|---|---|---|
| `planner` | `plan.set` | pl-planner-b B 250 U · pl-planner-s S 1,000 R · pl-planner-g G 3,000 E · pl-planner-p P 7,500 L |
| `estimates` | `tasks.estimated` | es-500 B 500 U · es-2000 S 2,000 R · es-5000 G 5,000 E |
| `triage` | `review.triaged` | rv-triage-b B 2,000 R · rv-triage-s S 7,500 E |
| `wontdo` | `tasks.wontdo` | td-wontdo-b B 200 U · td-wontdo-s S 750 R · td-wontdo-g G 2,500 L |
| `steps` | `subtasks.done` | fn-subs-b B 1,000 R · fn-subs-s S 10,000 L |
| `ontime` | `tasks.onTime` | fn-ontime-b B 250 U · fn-ontime-s S 1,000 R · fn-ontime-g G 3,000 E · fn-ontime-p P 7,500 L |
| `gooddays` | days with `d.done` | rh-days-b B 365 R · rh-days-s S 730 E · rh-days-g G 1,500 L |
| `journal` | days with `d.journal` | jr-b B 30 U · jr-s S 100 R · jr-g G 365 E · jr-p P 1,000 L |
| `species` | `garden.species` | gd-species-10 B 10 U · gd-species-30 S 30 R · gd-species-60 G 60 E |
| `wardrobe` | `wardrobe.items` | st-items-25 B 25 U · st-items-100 S 100 E |
| `scenes` | `scenes.seen` | sc-25 B 25 U · sc-100 S 100 R · sc-300 G 300 E · sc-600 P 600 L |

Gold exists in 8 series and platinum in 4, so `mx-gold-3` and `mx-platinum`
can be earned (both years away, as they should be).

### 3.32 Unlock catalogue (for the owning modules)

Every unlock id used above, by owner. The owner adds each to its table with an
achievement lock (`achUnlockOf(kind, id)` returns the achievement id;
`achRewardOpen(kind, id)` says whether it is earned), art, a label and, for
wardrobe items, a slot. 111 in all. B0 already emits them: on an unlock the
document event `opendash:ach-reward` `{kind, id, ach, hist}` fires and the
owner's hook is called when it exists (`profileAchReward`, `wardrobeAchReward`,
`gardenAchReward`, `petAchReward`; `typeof fn === 'function'`).

| Owner | Kind | Ids (from) |
|---|---|---|
| 2.18 you | `title:` (26) | Scheduler (pl-planner-s), Oracle (pl-top3-kept-60), Frog Whisperer (pr-frog-run), Timekeeper (es-calibrated), Reflective (rv-streak-12), Editor (td-wontdo-s), Archaeologist (fn-old-365), Dependable (fn-ontime-s), Deep Worker (fo-week-25h), Correspondent (ca-zero-365), Diplomat (wt-nudge-works-50), Team Captain (wt-handoff-50), Habit Former (hb-daily-66), Stalwart (rh-days-g), Well Balanced (bl-six-26), Chronicler (jr-g), Steward (mo-budget-12), World Traveller (pc-km-earth), Thoughtful (pp-birthday-25), Prepared (mt-prep-100), Best Friend (fr-level-8), Head Gardener (gd-species-60), Pet Whisperer (pt-tricks-all), Grand Tourist (sc-300), Record Breaker (gm-records-25), Completionist (mx-400) |
| 2.18 you | `banner:` (15) | clockwork (pl-planner-g), calm-sea (pr-due-clear-150), sunset (rv-evening-500), year-of-reviews (rv-streak-52), atomic (fn-ontime-p), deep-water (fo-hours-1000), evergreen (hb-year), chronicle (jr-p), world-map (pc-cont-6), two-of-a-kind (fr-duo-365), paradise (gd-level-25), paw-prints (pt-year), gallery (sc-rewards), fireworks (gm-xp-800), secrets (mx-secrets-all) |
| 2.18 you | `plate:` (11) | laurel (rv-wins-1000), checklist (fn-subs-s), paper (jr-b), ledger (mo-budget-3), postcard (fr-cards-10), leaf (gd-level-10), velvet (st-items-100), starlight (sc-sky), neon (gm-combo-20), marble (mx-100), gold (mx-200) |
| 2.18 wardrobe | `wear:` (22) | acc-pocket-watch (pl-clear-50), acc-stopwatch (es-close-250), glasses-reading (rv-outcomes-52), acc-wristwatch (fn-ontime-g), top-hoodie-calm (fo-run-60), acc-butterfly-net (ca-1000), acc-medal (rh-weeks-52), scarf-cosy (bl-weekends-26), top-pyjamas (bl-wrapped-7), acc-lunchbox (bl-lunch-run), acc-teacup (bl-coffee), acc-quill (jr-daynote-run), hat-explorer (pc-countries-10), shoes-hiking (pc-km-10k), top-team-jersey (fr-coop-25), top-apron (gd-harvest-500), acc-binoculars (gd-visitors-all), hat-beret (sc-25), acc-umbrella (sc-weather), top-cape (gm-titan), shoes-glass-slipper (sx-midnight), hat-deerstalker (mx-secrets-5) |
| 2.18 garden | `seed:` (8) | sunflower (pl-week-run), moonflower (rv-evening-run), tomato (fo-25x4), night-jasmine (fo-120), oak-sapling (hb-monthly-12), lavender (bl-weekends-run), winter-rose (jr-advent-24), forget-me-not (pp-catchup-50) |
| 2.18 garden | `decor:` (13) | bird-feeder (pl-ahead-60), hammock (es-fit-26), lantern (rv-evening-weekend), broom (td-sweep-300), wheelbarrow (td-cleanup-seasons), birdbath (ca-double-zero), beehive (hb-5000), sundial (rh-same-hour), deckchair (bl-holiday-14), time-capsule (jr-capsule-year), piggy-planter (mo-quiet-150), signpost (pc-trip-10), fountain (gd-seasons) |
| 2.18 pets | `treat:` (10) | biscuit (pl-top3-kept), sardine (fo-break-100), berries (ca-sorted-fast), carrot (hb-routine-100), honey (hb-stack), warm-milk (bl-wrapped-100), bone (pt-care-14), feast (pt-care-60), apple-pie (sx-pi), cake (sx-birthday) |
| the game | `accent:` (6) | mint (pr-overdue-clear-30), aurora (pc-arctic), sakura (sc-festivals-12), royal (gm-perfect-12), retro (sx-konami), midnight (sx-new-year) |

Treats are things a pet may eat in a cartoon world; the pets module draws them
however suits its animals (a dog never gets the sardine if that matters to it).
An unlock unlocked by a private achievement is itself fine to show: wearing the
explorer's hat says nothing about where you went. A new accent goes into
`GAME_ACCENTS` with `achOnly: true` (or `level: 0`) and its colours in
`92-game.css`; `gameAccentOpen(a)` opens it from the achievement.

### 3.33 Today's 78, mapped to the new categories

As built in B0 (`71-achievements.js` `ACH_CORE_CAT` and `ACH_CORE_RARITY`):
`group` stays as it was for anything that still reads it, money and places
became `private`, and every earlier unlock is paid its XP once, at the history
rate (2.3).

| Category | Existing ids |
|---|---|
| finishing (12) | first-done, done-10, done-50, done-100, done-250, done-500, done-1000, done-2500, done-5000, day-10, day-20, all-rounder |
| priorities (3) | p1-25, p1-100, boss |
| estimating (1) | on-estimate |
| reviews (3) | review-1, review-4, review-12 |
| capture (2) | inbox-zero, inbox-10 |
| focus (5) | first-focus, focus-10, focus-hours-10, focus-hours-100, deep-work |
| habits (2) | habit-30, habit-200 |
| rhythm (14) | streak-3, streak-7, streak-14, streak-30, streak-60, streak-100, streak-365, frost, comeback, early-bird, night-owl, weekend-25, year-one, year-two |
| journal (1) | notes-7 |
| money (4) | under-budget, no-spend-3, no-spend-7, no-spend-30 (all `private`) |
| places (4) | places-5, places-25, cities-10, countries-3 (all `private`) |
| people (2) | people-10, people-50 |
| friends (10) | coop-first, cheer-10, duo-7, duo-30, plan-sundays-3, gift-first, high5-double, fquest-5, stickers-10, candy-25 |
| game (15) | boss-task, boss-10, boss-big, quest-1, quest-25, quest-perfect, quest-perfect-4, level-5, level-10, level-15, level-20, level-30, level-40, level-50, xp-day-300 |

Their rarity, by effort (they keep their old thresholds, so they are the easy
end of the wall): Common 21 (first-done, done-10, done-50, streak-3, streak-7,
frost, comeback, first-focus, focus-10, boss-task, quest-1, no-spend-3,
places-5, habit-30, inbox-zero, review-1, notes-7, level-5, coop-first,
cheer-10, gift-first), Uncommon 33, Rare 14 (done-500, done-1000, streak-30,
streak-60, day-20, p1-100, on-estimate, boss-big, quest-25, quest-perfect-4,
review-12, level-20, xp-day-300, duo-30), Epic 6 (done-2500, streak-100,
focus-hours-100, level-30, level-40, year-one), Legendary 4 (done-5000,
streak-365, level-50, year-two).

### 3.34 Where "Go" sends you (Next up cards)

A definition may carry `go`; otherwise its category's default applies
(`ACH_CATS[].go`, 71-ach-0dsl.js). The wall labels the button from the target
("Plan my week", "Open Today", "Start a focus timer"...).

| Category | Default `go` |
|---|---|
| planning | `cmd:rf-plan-week` |
| priorities | `view:today` |
| estimating | `view:all` |
| reviews | `view:home:week` |
| tidy | `cmd:rf-sweep` |
| finishing | `view:today` |
| focus | `cmd:game-focus-next` |
| capture | `cmd:quick-capture` |
| waiting | `view:waiting` |
| craft | `cmd:sidebar-customise` |
| habits | `view:all` (filtered to repeating tasks when a smart list exists) |
| rhythm, balance | none (they come by themselves) |
| journal | `view:memories` |
| money | `view:finance` |
| places | `view:locations` |
| people | `view:people` |
| meetings | `view:calendar` |
| friends | `view:friends` |
| garden, pets | `view:garden`, `view:pets` |
| style | `view:settings:me` |
| scenes | `view:settings:animations` |
| game | `view:game` |
| secrets, meta | none |

---

## 4. Build batches

Run after the navigation build (NAVIGATION_PLAN.md: the pages registry and the
Life area) and the UI cleanup (UI_CLEANUP_PLAN.md: `uiButton`, fixed dialogs,
the card and section headers), which this build uses. One agent per batch, one
batch at a time, in order (the owner's rule after the laptop crashes: one agent,
one process, commit often). Each batch: write the pack, add the facts and hooks
it needs, `node build.mjs --syntax`, `node build.mjs`, run the day-one tool,
commit. No tests and no screenshot or review step; `achLint` prints any skipped
definition to the console (and Settings > Diagnostics), and the builder fixes
it before committing.

### 4.0 How a batch adds achievements (as built in B0)

1. **One pack file**, pure data plus pure fact sources, loaded before
   `71-achievements.js` (name order): `src/app/71-ach-pack-b1-plan.js`,
   `-b2-work.js`, `-b3-life.js`, `-b4-people.js`, `-b5-play.js`.

   ```js
   /* 2.18 B1: the Plan shelf (docs/dev/ACHIEVEMENTS_500.md 3.5 to 3.9). d1: pl-planner-b, pl-ahead, ... */
   registerAchievementPack({ id: 'b1-plan', label: 'Plan shelf', defs: [
     { id: 'pl-planner-b', cat: 'planning', name: 'Pencilled in', desc: 'Plan 250 tasks for particular days.',
       when: { n: 'plan.set', gte: 250 }, rarity: 'uncommon', series: 'planner', tier: 'bronze', icon: 'calendar-clock' },
     // ...
   ] });
   registerAchFactSource('b1-plan', (c, o) => {
     // one pass over c.tasks / c.entries / c.data.taskActivity ...
     // o.inc('plan.set'); o.add('d.planAhead', day); o.put('d.planClear', day, 1); ...
   }, { order: 20 });
   ```

   The pack id must start with the batch (`b1`, `b2`, ...): the day-one tool
   reads the budget from it.
2. **Hooks** for the TICK, COUNT and MARK kinds the batch needs, in the
   feature's own file, always guarded and never in the way:
   `if (typeof gameStreakTick === 'function') gameStreakTick('sweep');`,
   `if (typeof gameCount === 'function') gameCount('inbox-sorted');`,
   `if (typeof gameMark === 'function') gameMark('view-mode', 'kanban');`.
   A check that looks at the lists goes through `registerAchCheck`.
   Keys are app ids only (2.1.1).
3. **Device facts** (finance, locations, calendar, friends, together) through
   `registerAchFacts(id, fn)` in the module that owns the data, or by adding to
   `gameAchFacts` / `funAchFacts`.
4. **Check** in this order: `node build.mjs --syntax`; `node build.mjs`; then
   `node tools/ach-dayone.mjs --synth C:/tmp/<you>/ach-synth` (once) and
   `node tools/ach-dayone.mjs C:/tmp/<you>/ach-synth --strict --list`. The
   pack must load with 0 skipped, its day-one count must be within its budget
   (5), and "Facts no source makes" must list nothing of the batch's except
   device facts. With the owner's permission, run it on a sandbox COPY of real
   data too (never the live folder).
5. **Commit** with the pack's count and its day-one result in the message.

### B0. Foundation (no achievements): BUILT

| File | As built |
|---|---|
| `src/app/71-ach-0dsl.js` (new, pure) | `ACH_SHELVES`, `ACH_CATS` (26, with prefix, icon, default `go`, profile group, `private`, `needs`), `ACH_RARITY` (XP 20/40/80/160/320), `ACH_TIERS`, `ACH_HIST_XP`, `ACH_REWARD_KINDS`, `achEval` (every operator of 2.2, memoised per facts view; series derived once per check), the day filters (`fri13`, `palindrome`, `fullMoon`, `birthday`, `workday`, ...), `achCondError`, `achCanonical`, `registerAchievementPack` / `achPack` with the lint, `achPacksAll`, `achLintReport`, `achLintSummary`, `achRewardParse`, `achSeason`, `achInSeason` |
| `src/app/71-ach-1facts.js` (new, pure) | `registerAchFactSource`, the `counters` and `core` sources, `achFactsCompute`, `achFactsMerge`, `achFactsView` |
| `src/app/71-achievements.js` | the core 78 on the engine: `ACH_CORE_CAT`, `ACH_CORE_RARITY`, `ACH_DEFS` (live), `achDef` (map), `achProgress` (views or flat facts), `achUnlockOf`, `achFactsAsView` |
| `src/app/78-achievements.js` | `achCheck` (locked only, meta last), XP, history mode per pack with one summary, `achRewardLabel`, `achRewardOpen`, `achRewardsEarned`, the reward event and hooks, `achFeatureOn` / `registerAchFeature`, `achHistoryPending`, `achHistorySeen` |
| `src/app/92-game-1core.js` | `counts`, `marks` in `_gmG`; `'ach'` in `_GM_INTERNAL`; achievement XP never in a day's XP; the record `combo`; COUNT `record`; `gameAccentOpen`; `gameAchMoment` by rarity; `gameOpenWall` -> the page |
| `src/app/92-game-4facts.js` (new) | `gameCount`, `gameMark`, the slot, `registerAchFacts`, `registerAchCheck`, the periodic checks, `gameFacts`, `gameFactsRaw`, `gameFactsBoot`, `window.OpenDashGame` additions |
| `src/app/92-game-5wall.js` (new) + `src/styles/92-game-wall.css` (new) | the page of 2.5 (`game:wall`), `gameWallSummary` for the Game page, the `konami` and `ring` secrets |
| `src/app/92-game-3ui.js` | the Game page's achievements section calls `gameWallSummary`; accents by level or achievement |
| `lib/sync/model.mjs`, `lib/sync/manifest.mjs`, `lib/state-keys.mjs` | `counts`, `marks`, `seen.wallOpen`, `achievements.hist`, `achievements.packs`; the `── achievements ──` block |
| `src/app/99-boot.js` | `gameFactsBoot()` after the state file |
| `src/app/58-settings-data.js` | Diagnostics "Achievements: N loaded, N skipped" |
| `tools/ach-dayone.mjs` (new) | the day-one report (read-only) and `--synth` |

Not in B0 (left to the batches or other agents): the TICK, COUNT and MARK hooks
in the features' own files (each batch adds the ones its pack reads, 4.0 step 2),
the `createdVia` stamps (B2, B4), and the profile's badge picker search (2.18 you).

### B1. Plan shelf: 106 achievements

File `src/app/71-ach-pack-b1-plan.js`, pack `b1-plan` (planning 25, priorities
18, estimating 18, reviews 25, tidy 20). Day-one budget 5 (pl-planner-b,
pl-ahead, pl-clear, pr-due-clear, es-500 expected).

Needs:
- DATA: `plan.set`, `plan.slotHits`, `plan.hits`, `d.planAhead`, `d.planClear`, `d.slots`, `d.top3Done`, `tasks.due30`, `tasks.doneAhead`, `tasks.p1Week`, `d.p1First`, `d.p1DueClear`, `tasks.p1PlanHit`, `tasks.p1Old`, `game.bossP1`, `tasks.priorityChanges`, `tasks.doneLate`, `tasks.estimated`, `est.timed`, `est.close`, `est.under`, `est.exact`, `est.kinds`, `est.calibrated`, `tasks.bigEstDone`, `tasks.bigSplit`, `tasks.tinySameDay`, `d.allEstimated`, `w.allEst`, `w.eveningWeekend`, `w.outcomes`, `w.wins`, `review.*`, `awards.wrapped`, `tasks.somedaySet`, `tasks.somedayDone`, `tasks.wontdo`, `tasks.restored`, `tasks.movedWithReason`, `w.lighter`, `cleanup.seasons`
- TICK: `plan-week`, `plan-fit`, `dayplan`, `overdue-clear`, `sweep`, `cleanup`, `nodate-zero`, `today-clear`, `brief`, `story-week`, `story-morning`
- COUNT: `sweep-cleared`, `cleanup-decided`, `tag-edit`
- MARK: `view-mode`, `recap-month`

### B2. Work shelf: 105 achievements

File `src/app/71-ach-pack-b2-work.js`, pack `b2-work` (finishing 25, focus 25,
capture 20, waiting 15, craft 20). Day-one budget 5 (fn-old-30, fn-ontime-b,
fo-25, ca-triage, cr-smart-lists-5 expected).

Needs:
- DATA: every finishing fact (`tasks.oldDone*`, `subtasks.done`, `d.subtasks`, `d.doingDone`, `tasks.onTime`, `tasks.neverMoved`, `tasks.unblockedSameDay`, `tasks.chain3`, `d.doneWithNotes`, `tasks.reopenedDone`, `tasks.oneSitting`), every focus fact (1.7 Focus, `focus.monthsInYear` at 10 hours), `waiting.*`, `blocked.*`, `review.nudge5`, `triage.*`, `smartLists.n`, `boards.n`, `boards.lanes`, `sidebar.pins`, `home.widgets`, `home.copies`, `templates.n`, `tasks.withContext`, `streams.marked`
- STAMP: `createdVia` `capture` and `template` (and `d.captured`, `capture.*`, `tasks.fromTemplate`)
- TICK: `stream-clear`, `inbox-empty`, `waiting-empty`, `palette`, `do-now`, `capture-page`
- COUNT: `inbox-sorted`, `inbox-sorted-fast`, `qa-syntax`, `qa-rich`, `bulk-big`
- MARK: `sidebar-custom`, `gkey`, `view`, `view-mode`, `export-month`, `backup-month`
- DEVICE: `sync.devices`, `together.assignedAccepted`

### B3. Life shelf (without places): 92 achievements

File `src/app/71-ach-pack-b3-life.js`, pack `b3-life` (habits 20, rhythm 15,
balance 20, journal 22, money 15). Day-one budget 5 (hb-routine, hb-weekends,
rh-days-b, rh-month-25, mo-budget-3 expected).

Needs:
- DATA: every habits, rhythm and balance fact (`w.weekendOff` new), `d.journal`, `journal.*`, `capsules.*`, `goals.*`, `advent.*`, `postcards.withNote`, `notes.task`, `focus.bigBreak`, `d.eveningEarly`, `d.steady`, `review.withMoney`, `together.goalWeeks`, `rhythm.anniversary` (from `d.open`)
- TICK: `status-break`, `rediscover`, `fin-tx`, `fin-visit`, `story-money` (`holiday` is B0's)
- COUNT: `fin-recat`
- MARK: `fin-recurring`, `fin-whatif` (month keys), `budget-ok` (with its virtual seed from the budgets history)
- DEVICE: `money.nospendWeekends`, `w.belowAvg` (in `_gmFinLoad`; yes or no only)

### B4. People shelf, game and secrets: 97 achievements

File `src/app/71-ach-pack-b4-people.js`, pack `b4-people` (people 22, meetings
18, friends 22, game 15, secrets 20). Day-one budget 5 (pp-50, fr-3, sx-fri13
expected).

Needs:
- DATA: `people.*`, `w.peopleDistinct`, `tasks.people4`, `awards.*`, `cal.prepBefore`, `cal.linkedTasks`, `countdowns.reached`, `game.bonusDone`, `game.bossSameDay`, `game.questKinds`, `w.questPerfect`, `secret.*`, the date filters (B0)
- STAMP: `createdVia: 'wrapup'` (`tasks.fromWrapup`, `wrapup.sameDayDone`)
- TICK: `owe-clear`, `gap`, `fun-full` (`zero-open` is B0's)
- COUNT: `people-merge`, `link-accept`, `cal-created`, `cal-invite`, `find-a-time` (`record` is B0's)
- MARK: `friend-in-scene` (day keys), `event-costume`, `flipflop`, `theme-flip`, `settings-group` (`konami`, `ring`, `open42` are B0's)
- DEVICE: the calendar facts (`cal.meetings`, `d.meetings`, `d.noMeetingsWorkday`, `cal.quietWeeks`, `people.metDistinct`, `people.meetingFollowups`); the friends server's new facts in `lib/friends/fun.mjs` (`wavesSent`, `thanksSent`, `friendLevelMax`, `stickersCore`) and `fun.postcardsSent`; `together.*`
- From NAVIGATION_PLAN.md step N1: `pages.visitedAll` (sx-everywhere stays locked, silently, until the pages registry exists)

### B5. Play shelf, places and meta: 100 achievements

File `src/app/71-ach-pack-b5-play.js`, pack `b5-play` (garden 20, pets 15,
style 15, scenes 18, places 20, meta 12). After the 2.18 modules have merged.
Day-one budget 5 (gd-seed-25, st-avatar, st-profile, sc-rewards,
pc-happy-place expected).

Needs:
- 2.18 providers: `gardenAchFacts` (+ `d.gardenTend`), `petAchFacts` (+ `d.petCare`), `wardrobeAchFacts`, `youAchFacts` (read by B0 when they exist), and MARKs `you-banner`, `you-nameplate`, `you-title` (keys: the ids) from the you module
- DATA: `profile.avatarEdits`, `profile.complete`, `profile.collected`, `scenes.firstSnow`, `anim.overrides`, `anim.rewardsAll`, `stories.kinds`, `trips.confirmed`
- TICK: `status`, `opening`, `where-was-i`
- MARK: `look-season`, `scene` (with its virtual seed), `scene-local`, `scene-tod`, `scene-wx`, `scene-season`, `festival`, `sky`
- DEVICE: `locationsFacts()` extras (`places.continents`, `places.km`, `places.zonesCrossed`, `places.longestAway`, `places.furthestKm`, `places.tasksAbroad`, `places.maxCityDone`, `places.newPlaceMonths`, `places.newCitiesMonthMax`, `locBadge.*`)
- The `meta` operator is B0's (shelves, categories complete, a week's unlocks, rarities, tiers, secrets).

---

## 5. Critic checklist (run before each batch is merged, and once at the end)

Counting and uniqueness

- [ ] The pack has exactly its batch's count and rarity split (3.1); all five
      together are 500 (50 / 110 / 170 / 120 / 50); the wall shows 578.
- [ ] Settings > Diagnostics (or the tool) says 0 skipped.
- [ ] No two descriptions share their first five words; each reads as an
      instruction and stands alone.

Hard enough (3.2)

- [ ] `node tools/ach-dayone.mjs <synth> --strict` passes: the batch's day-one
      unlocks are within its budget (5), and the `d1` flags in the pack match.
- [ ] Commons are real milestones (a week or two), no Legendary can be done
      in a season, tiers climb about 3x per step, platinum is Legendary.
- [ ] Cumulative DATA totals sit at Epic or Legendary unless budgeted; the
      early ones are runs, best weeks or months, combinations or counters.
- [ ] The hardest secrets have no clue; the rest have honest ones.

Measurable

- [ ] Every fact and series used is made by a source or hook in this or an
      earlier batch (the tool's "Facts no source makes" list), or is a device
      fact read on the page.
- [ ] "In one day" and "running" conditions read series or ticks, never counts.
- [ ] `needs` is set wherever a feature can be off; with the feature off the
      category is one calm row.

Kind and private

- [ ] No banned words; nothing about missed days, lost streaks or comparing
      with friends; rest achievements praise rest that happened.
- [ ] Money, places and holiday ones are `private`.
- [ ] Counter keys are app ids only: no titles, names, places or amounts.
      `node tools/privacy-scan.mjs` is clean before anything is published.

Behaviour (B0 provides it; confirm it still holds)

- [ ] History mode ran once per pack: one summary, half XP capped at 2,000,
      no level-up moment for the past, nothing for a new user to wade through.
- [ ] Fun level Off: no moments, no sounds; the page still lists progress.
- [ ] Two devices: an unlock on one shows on the other; counts add up; marks
      keep a day; packs are checked once.
- [ ] The page: categories fold and build lazily; search, filters, sort, Next
      up, Almost there, series pips, "???" secrets, out-of-season notes and
      feature-off rows work by mouse and keyboard.
