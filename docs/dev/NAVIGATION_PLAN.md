# Finding every page (2.18b navigation plan)

Status: PLAN, docs only. Written 24 Oct 2026 for the build workflow that starts
after the 2.18 build merges. Nothing here is built yet. Read
`docs/dev/UX_BLUEPRINT.md` first: it is the short frame (the map, progressive
disclosure, the page and card templates, density rules, the first week). The
layout-stability, calmer-rows and consistency work is in
`docs/dev/UI_CLEANUP_PLAN.md`.

User requests, 24 Oct:

- "we also have all these new pages like a game page like everything else but
  it is unclear how to access these pages too."
- "we have home, tasks, calendar, finances, we could potentially add another
  one, or move the games and stuff to home ... or have a new like games tab or
  similar ... but we just need overall cleanup and consistency."
- "the tasks list shows locations, someday etc, it's a bit overwhelming, we need
  to think of good UI design not to put too much on the screen."

**Decision (coordinator, 24 Oct): a fifth top-level area, Life.** The switcher
reads **Home · Tasks · Calendar · Money · Life**. Life has six sub-tabs:
**Friends · Garden · Pets · Achievements · Memories · Places**. Home stays "your
day", calm, with small cards that link into Life. The corner avatar's hub gets a
clear "Open Life". Together's shared spaces stay in Tasks (they are task lists)
and are reachable from Friends too.

The short version of this plan: add the Life tile and its sidebar and tabs; move
Friends, Achievements (today's Game page), Memories and Places (Locations, with
Trips) into it, and Garden and Pets as they land; calm the Tasks sidebar (four
views up front, the rest under More views); one **All pages** launcher reachable
from everywhere; Home card titles open their pages; quiet dots on pages not yet
opened; clickable breadcrumbs; What's new pointing at all of it.

House rules: no tests, and no screenshot or review step; check with
`node build.mjs --syntax` and `node build.mjs`; never touch the live install or
data; keep the customiser and its undo.

---

## 1. Inventory: every page and every way to reach it today

How navigation works today (read from the code on `feat/2171-corner`):

- **Tiles** (`14-shell.js registerTile`): Home, Tasks, Calendar, Finances. A
  tile switches which sidebar blocks show (`shellGroupFor(view)` reads the
  section's `group`; a section with no group counts as `system` and keeps the
  last tab's sidebar).
- **Sidebar blocks** per tab (`registerSidebarBlock`), arranged by the user in
  Customise sidebar (`15-nav-custom.js`: order, hide, rename, pins, Alt+1..9).
  - Home tab: Pinned, Home, Review (Finish the day, Weekly review, History,
    `78-brief-hooks.js`), Memories (`93-memories-page.js`), Trips (only with a
    trip in the next 30 days, `69-travel-ui.js`), Friends (**hidden by
    default** since 2.17.1, `96-friends-1ui.js`).
  - Tasks tab: Pinned, Views (Inbox, Today, Do now, Upcoming, All tasks, No
    date, Waiting, Someday, Logbook, Wins, **Locations**, **Game** (only while
    Fun is not Off), Email triage), Files and links, Smart lists, Boards,
    Together, Streams, Tags, People.
  - Calendar tab: Pinned, the month, Calendars, Countdowns, Calendar sync.
  - Finances tab: the Finances sections.
- **Footer**: Bin, Settings, Ask, Keyboard shortcuts.
- **Command palette** (Ctrl+K, `16-command-palette.js`): tiles, a hard-coded
  list of task views, streams, people, tags, and every `registerCommand` with
  `group: 'Go to'`.
- **The corner hub** (`97-profile-3corner.js`, the top-left avatar): your card
  (Edit profile, Set status), Friends (who is around, Open Friends, Add a
  friend, What my friends can see), Your relay, Sync, then the workspace menu
  (`registerMoreItem` with `where: 'workspace'`).
- **More menu** (top-right): New task, Quick capture, Ask, Bulk add, Templates,
  density, Focus mode, Reduce motion, backups, export, print, Settings,
  Connections, What's new, Keyboard shortcuts.
- **Top bar**: the travel clock, the "Start my day / Finish the day" pill, the
  Game level chip (while Fun is not Off), countdowns.
- **Keys**: G then H (Home), T (Today), U (Upcoming), A (All tasks), C
  (Calendar), F (Finances), P (People), S (Settings), B (Bin), L (Logbook).

### 1.1 The table

S = sidebar, P = palette, H = corner hub, M = More / workspace menu,
T = top bar, W = a Home widget links to it, L = links inside other pages,
K = keyboard. **Bold** gaps are what the user meant.

| Page | View(s) | What it is for | Ways in today | Gap |
|---|---|---|---|---|
| Home (Today) | `home` | the day: hero, story, widgets | Home tile; S Home tab "Home"; P "Home", "Start my day"; T pill; K G H | none |
| Finish the day | `home:evening` | evening recap, top 3 for tomorrow | S Home › Review; P; T pill (evening); Home's tabs; W Review card; Home head "Roll over" | none |
| Weekly review | `home:week` | the guided review | S Home › Review; P; Shift+R; task list header button; W Review card; L Game quest "Review now" | none |
| History | `home:history` | past reviews | S Home › Review; P; Home's tabs | none |
| Inbox | `inbox` | quick captures to sort | S Tasks › Views; P | none |
| Today | `today` | today's tasks | Tasks tile; S; P; K G T; W Today, This week | none |
| Do now | `now` | what fits now | S; P "What can I do now?" | none |
| Upcoming | `week` | the next days | S; P; K G U; W This week | none |
| Tomorrow | `tomorrow` | tomorrow's tasks | P only | minor (fine) |
| All tasks | `all` | everything open | S; P; K G A; W Smart list, Runway | none |
| No date | `no-date` | undated tasks | S; P | none |
| Waiting | `waiting` | tasks waiting on people | S Tasks › Views; P "Waiting on people"; Review menu; W Review card | **no group: crumb shows a Settings gear, sidebar keeps the last tab** |
| Someday | `tag:someday` | parked tasks | S Tasks › Views | none |
| Logbook | `completed` | done tasks | S; P; K G L; W Today | none |
| Wins | `wins` | wins log | S Tasks › Views; P | none |
| Email triage | `triage` | mail to tasks | S Tasks › Views; P; W Needs reply | needs Claude |
| Streams | `stream:<id>` | one stream | S Tasks › Streams; P | none |
| Tags | `tags`, `tag:<t>` | tag manager, one tag | S Tasks › Tags; P | none |
| Smart lists | `list:<id>` | saved filters | S Tasks › Smart lists; P; pins; W Smart list | none |
| Boards | `taskboard:<id>` | saved boards | S Tasks › Boards; P | none |
| People | `people`, `person:<id>` | contacts and what you owe | S Tasks › People; P; K G P; W People today; L task chips | none |
| Files and links | `files` | resources | S Tasks › Files; P; W Launchpad | none |
| **Locations** | `locations` | places, firsts, badges | S **Tasks › Views only**; P "Locations", "Where was I on…?"; L badge toasts, Settings > Location history | **buried among task views; not on Home; crumb says Tasks** |
| **Game** | `game` | level, streaks, quests, records, achievements | S **Tasks › Views only, and only while Fun is not Off**; T level chip (Fun not Off); W "Level and streaks" (**hidden by default**); P "Game: …", "Open the achievements wall"; L Settings > Game, Settings > Animations, Profile, moments | **no group (gear icon in the crumb); not on Home; invisible with Fun Off except palette and Settings** |
| **Together** | `together`, `together:<id>[:tab]` | shared spaces with friends | S Tasks › Together block; L Friends page; What's new | **no palette entry; only under Tasks; a space's crumb shows only its tab** |
| Calendar | `calendar`, `calendar:<mode>` | calendar | Calendar tile; P (+ modes); K G C; W Schedule and others | none |
| Finances | `finance` | money | Finances tile; P; K G F; W Money, Payday | none |
| **Trips** | `trips`, `trip:<id>` | trips and travel | S Home › Trips (**only with a trip within 30 days**); P "Trips" (travel on); T travel chip menu "All trips" | **no steady way in** |
| **Memories** | `memories`, `memories:<tab>` | journal, your year, capsules, postcards, people, milestones | S **Home tab only** (one row); P Journal, Postcards, Wrapped; W On this day (title button); L milestone toasts | **sub-tabs only from inside the page; nothing from Tasks** |
| **Friends** | `friends`, `friends:<id>` | friends hangout | S row **hidden by default**; H Open Friends, avatars; P "Friends", "Friends: getting started"; L Settings > Friends, Relay, Together | **hidden in the sidebar** |
| Profile | `settings:me` | your card, avatar, badges | H Edit profile; P "Profile: …", "Customise your avatar"; Settings list | none |
| Animation gallery | `settings:animations` | scenes, rewards, recaps | Settings; W Animation of the day; L Game Unlockables | no own entry |
| Settings | `settings`, `settings:<group>` | settings | footer; M; P; K G S | none |
| Connections | `connections` | accounts and sign-ins | M; P; W "connect" links | none |
| Bin | `bin` | deleted things | footer; P; K G B | none |
| Diagnostics | `settings:diagnostics` | problems and versions | P; Settings | none |
| A day | `day:<date>` | one day's tasks | links and `#view=` only | fine |
| Finance symbols | `fin-symbols` | debug gallery | `#view=` only | keep hidden |
| **Garden** (2.18) | `garden`, `garden:<tab>` (planned) | plants, decorations, visitors, shop, harvest, almanac, levels | **nothing yet** (2.16's Home widget "Your garden" has no link) | **new** |
| **Pets** (2.18) | `pets` (planned) | your pet(s) | **nothing yet** | **new** |
| **Wardrobe** (2.18) | `wardrobe` (planned) | the big wardrobe | **nothing yet** | **new** |
| Profile extras (2.18) | inside `settings:me` | banners, nameplates, titles | through Profile | fine once Profile is easy to reach |
| **Friends' gardens** (2.18) | a panel on `friends:<id>` (planned) | visit and water | through a friend's page | **new** |

Overlays that are not pages (they stay commands and buttons): Wrapped,
month/year recaps, stories, the weekly review deck, the sweep, Plan my week,
the clean-up, Quick capture, Customise sidebar, What's new, keyboard help, the
assistant.

The 2.18 branches (`feat/218-*`) had no commits when this was written,
so the 2.18 view names above are the ones this plan proposes; if a module picks
another name, keep everything else and change the view string.

### 1.2 The gaps, in one list

1. The fun pages have no shared home: Game and Locations hide in Tasks › Views,
   Memories and Trips sit on Home, Friends is hidden, Together lives in Tasks.
2. Game, Waiting and Locations show the wrong breadcrumb and keep the wrong
   tab's sidebar (Game and Waiting have no `group`).
3. With Fun Off the Game page vanishes from the sidebar entirely.
4. The Tasks sidebar is long: 13 view rows (including Locations and Game) above
   seven more sections. The user finds it overwhelming.
5. Nothing lists every page. The palette's page list is hard-coded and misses
   most sections; Together has no palette entry at all.
6. Home cards rarely link to the page behind them (17 of 36 widgets have no
   page link).
7. Nothing says a page is new, and 2.18 adds three.
8. Nested pages (a memories tab, a friend, a space, a trip) have crumbs whose
   middle parts are not clickable, and there is no "back" for pages you
   reached from a link.

---

## 2. Proposal

### 2.1 Five areas: the fifth tile

The switcher becomes **Home · Tasks · Calendar · Money · Life**.

```text
+----------------------------------+
| (avatar) Your name           [<] |   the corner: your hub, with "Open Life"
| [ Search or jump to  Ctrl K ][#] |   [#] = All pages (2.7)
| [Home][Tasks][Calendar][Money][Life]|
```

Exact changes in `src/app/14-shell.js`:

```js
registerTile({ id: 'finance', label: 'Money', icon: 'wallet', order: 40, view: 'finance', feature: 'finance' });   // label only; id, view and feature stay
registerTile({ id: 'life', label: 'Life', icon: 'heart', order: 50, view: () => lifeTileView(), badge: () => lifeBadge() });

const _SHELL_GROUP_LABEL = { home: 'Home', tasks: 'Tasks', calendar: 'Calendar', finance: 'Money', life: 'Life', system: '' };
const _GROUP_ICON = { home: 'house', tasks: 'list-todo', calendar: 'calendar-days', finance: 'wallet', life: 'heart', system: 'settings' };
let _shellLastLifeView = '';      // like _shellLastTaskView: the Life tile goes back to the last Life page

function shellGroupFor(view) {
  // ... as today, except: a section's group may be a function of the view
  if (sec && sec.group) return typeof sec.group === 'function' ? sec.group(v) : sec.group;
}
// renderShell(): if (group === 'life') _shellLastLifeView = state.view;
```

- `lifeTileView()` (in the new `src/app/15-nav-life.js`): the last Life page this
  session; else the synced `uiPrefs.lifeLast`; else Friends when the user has a
  friend, else Garden when it exists, else Achievements while Fun is not Off,
  else Memories.
- `lifeBadge()`: friend requests waiting + time capsules due (+ the garden's
  "ready to harvest", 2.18). A number only for things that need you.
- The switcher's grid already takes any number of tiles (`--tiles`,
  `10-sidebar.css:54`). At five tiles "Calendar" and "Money" fit at
  `--text-2xs`; "Finances" would not, which is one reason for the label.
- `_PAL_G` and `_G_KEYS` (`16-command-palette.js:31`, `90-wiring.js:226`):
  **G then L** opens Life; Logbook moves to **G then O**. What's new says so.
- Settings stays a footer button, not a tile.

### 2.2 The Life area

#### Pages, views and groups

| Sub-tab | View(s) | Section today | Change |
|---|---|---|---|
| Friends | `friends`, `friends:<id>` | `96-friends-1ui.js:27`, group `home` | group `life`; a "Shared spaces" panel on the hangout listing your Together spaces (each opens `together:<id>` in Tasks) |
| Garden (2.18) | `garden`, `garden:<section>` | none yet | the garden module registers it with group `life` |
| Pets (2.18) | `pets` | none yet | the pets module registers it with group `life` |
| Achievements | `game`, `game:<section>` | `92-game-3ui.js:151`, no group | group `life`; title "Achievements" (the view id stays `game`, so links, hashes and the chip keep working); the long page splits into level-2 sections: **Today** (hero, bonus task, streaks, quests), **Achievements** (the wall, ACHIEVEMENTS_500.md 2.5), **Records and focus**, **Bosses**, **Unlockables** |
| Memories | `memories`, `memories:<tab>` | `93-memories-page.js:19`, group `home` | group `life`; its six tabs become the page's level-2 control |
| Places | `locations`, `trips`, `trip:<id>` | `90-locations-view.js:240` (group `tasks`), `69-travel-ui-trips.js:256` (group `home`) | both group `life`; title "Places"; level-2: **Overview** (today's Locations page) and **Trips** (`trips`; a trip is `trip:<id>` with parent `trips`) |

Profile and the wardrobe stay under "You" (2.2.3): the Profile page is
Settings › Profile (`settings:me`), and the 2.18 wardrobe becomes a section of
it, so Life keeps exactly six tabs.

#### The sub-tabs

Life's six sub-tabs show in two places, the same pattern Home (sidebar Review
section plus its Today / Evening / Week / History strip) and Money (sidebar
sections plus its tab strip) already use:

1. **The Life sidebar** (2.2.3): six rows with live badges.
2. **A slim tab strip** at the top of every Life page (level 1), drawn by one
   shared component, `areaTabsEl(area, view)` in `14-shell.js`, which
   `80-main-render.js _renderMainBody` places above `sec.mount()` when the
   section's group is `life`. It keeps Life navigable with the sidebar folded,
   in Focus mode and on phones. A page's own sections (Memories' tabs, the
   Achievements sections, Places' Overview / Trips, the garden's sections) use
   the smaller level-2 control under it. Never more than two levels
   (UX_BLUEPRINT.md 3).

```text
Life › Memories › Postcards                                   [Write a capsule] [...]
Memories
[ Friends | Garden | Pets | Achievements | *Memories* | Places ]        <- level 1
( Journal  Your year  Time capsules  *Postcards*  People  Milestones )   <- level 2
...postcards...
```

A tab whose page is not on this build (Garden and Pets before 2.18) is left
out; a tab whose feature is off (Places without location history, Achievements
with Fun Off) stays, and its page shows one calm "Turn on" state. Re-selecting
the current tab is a no-op apart from scrolling to the top.

#### The Life sidebar

```text
LIFE TAB
+----------------------------------+
| PINNED  (only if pins)           |
| [users]   Friends           2    |   requests waiting
| [sprout]  Garden            .    |   new dot until first visit (2.18)
| [paw]     Pets              .    |
| [trophy]  Achievements   Lv 14   |
| [book]    Memories          1    |   a capsule is due
| [pin]     Places         in 9d   |   the next trip
| YOU                              |
| [user]    Profile                |   settings:me
| [shirt]   Wardrobe          .    |   settings:me, wardrobe section (2.18)
| [smile]   Set status             |   opens the quick statuses
| -------------------------------- |
| [grid]    All pages              |
+----------------------------------+
```

| Block id | Heading | Rows | Order | File |
|---|---|---|---|---|
| `pinned` | Pinned | as today; its groups gain `life` | 5 | `15-nav-custom.js` |
| `life-tabs` | (none) | the six, from the pages registry (2.6), with badges | 10 | `15-nav-life.js` (new) |
| `life-you` | You | Profile, Wardrobe (when 2.18 adds it), Set status | 20 | `15-nav-life.js` |
| `all-pages` | (none) | All pages | 99 | `15-nav-life.js` (registered for all five tabs) |

All of it is in Customise sidebar (`15-nav-custom.js`): `_SB_TABS` gains
`['life', 'Life']` (and shows Finances as "Money"); `_SB_BLOCK_LABELS` gains
`life-tabs: 'Life'`, `life-you: 'You'`, `all-pages: 'All pages'`;
`_SB_VIEW_ICONS` gains `friends: 'users'`, `garden: 'sprout'`,
`pets: 'paw-print'`, `game: 'trophy'`, `memories: 'book-open'`,
`locations: 'map-pin'`, `trips: 'map'`. Pins of `game`, `locations` and
`memories` keep working; a user who hid `item:game` keeps it hidden.

### 2.3 Home after the move: your day, calm

Home's sidebar becomes four rows under two headings:

```text
HOME TAB
| PINNED  (only if pins)           |
| [house]   Home                   |
| PLAN                             |   the 'review-nav' block, heading renamed (id kept,
|  [sunset]  Finish the day   now  |    so users' choices survive)
|  [cal-rng] Weekly review         |
|  [cal-day] Plan my week          |   runs the planner (rf-plan-week)
|  [history] History               |
| -------------------------------- |
| [grid]    All pages              |
```

- Removed from Home: the `memories-nav` block (`93-memories-page.js:27`, now in
  Life), the upcoming `trips` block (`69-travel-ui.js:462`, now Places' hint and
  the Trip card) and the hidden `friends-nav` block (`96-friends-1ui.js:35`).
- **Cards that link into Life** (small, calm, each with its title linking to
  its Life page, 2.8):

| Card | Status first | One action | Title opens |
|---|---|---|---|
| Your garden (exists, `12-home-w-garden.js`) | the garden today | Tend it | Life › Garden (before 2.18: Memories › Your year) |
| Quests and streaks (today's "Level and streaks", `92-game-3ui.js:61`, renamed) | today's quest progress, the streak | Open quests | Life › Achievements |
| Friends around (new, `12-home-w-friends.js`; listed in `lib/home-topbar.mjs` HOME_WIDGETS) | avatars of friends here now, or requests waiting; hidden with no friends | Say hello | Life › Friends |

- New users get Your garden and Quests and streaks in the default Home preset;
  existing users get them hidden (the Home rule for new widgets) and one What's
  new entry with "Add the Life cards to Home".

### 2.4 The Tasks sidebar: Work, calmer

Today the Views block (`15-nav-sidebar.js:149`) shows 13 rows, then Files,
Smart lists, Boards, Together, Streams, Tags and People. After:

```text
TASKS TAB (Work)
| PINNED                           |
| [inbox]   Inbox               3  |
| [sun]     Today               7  |
| [cal-rng] Upcoming           12  |
| [layers]  All tasks          48  |
| [glass]   Waiting             2  |   only while something waits: promoted out of More
| [chev]    More views             |   folds open: Do now, No date, Someday, Logbook,
|                                  |   Wins, Email triage, Files and links
| SMART LISTS  +                   |   only when there is one (else "New smart list" lives in More views and the palette)
| BOARDS  +                        |   only when there is one
| TOGETHER  +                      |   only when there is a space (else reached from Friends)
| STREAMS  ... (empty ones folded) |
| TAGS  (folded for new users)     |
| PEOPLE                           |
| [grid]    All pages              |
```

- **Moved out**: Locations (Life › Places) and Game (Life › Achievements).
- **Up front**: Inbox, Today, Upcoming, All tasks. **Promoted** while they need
  you: Waiting (anything waiting), Email triage (suggestions pending), Do now
  (a place or energy is chosen). Everything else lives under **More views**, a
  fold row like today's "N empty streams" (`15-nav-sidebar.js:240`), remembered
  in `state.collapsedSidebar['views-more']`. "Files and links" moves from its own
  block (`63-resources.js:945`) into More views.
- **Customiser**: each Views row gets three states, Shown / In More / Hidden
  (`sidebarLayout.items['task-views']` keeps the order; a new
  `sidebarLayout.more` list holds the folded ones). A user who already
  reordered or hid Views rows keeps exactly their list shown; the new fold only
  applies to rows they never placed.
- **Empty sections hide**: Smart lists, Boards and Together draw nothing until
  they have something (their "+" moves into More views and the palette); Tags
  starts folded for new users. Existing users' fold state is kept.
- Someday stays a view (under More), the tag `#someday` stays as it is.

### 2.5 The corner hub: "Open Life"

The avatar keeps opening the hub (it holds your status, friends and the
workspace menu, which people rely on), with Life one click away:

```text
+-- (avatar) Your name ------------------+
|  Focusing until 5pm                    |
|  Level 14 Pathfinder · 6-day streak    |
|  [Edit profile] [Set status]           |
|  [ Open Life                       > ] |   primary row: goes to lifeTileView()
|  [users][sprout][paw][trophy][book][pin]   Friends · Garden · Pets · Achievements · Memories · Places
|----------------------------------------|
|  FRIENDS  (avatars)  Open Friends ...  |
|----------------------------------------|
|  Your relay  Connected · Sync  On      |
|----------------------------------------|
|  All pages...                  G G     |
|  Back up now · Restore · Export ...    |
+----------------------------------------+
```

File: `97-profile-3corner.js` (`_pfcCard` gets the Open Life row and a
`.pfc-life pfc-row` of icon buttons using the existing arrow-key handling;
icons hidden for pages not on this build; dots for new ones). The top-bar level
chip (`92-game-3ui.js:49`) opens Life › Achievements.

### 2.6 The pages registry (the one list everything reads)

New in `14-shell.js`, next to `registerTile`:

```js
registerPage({
  id: 'game',                     // stable page id (seen flags and achievements use it)
  view: 'game',                   // the view to open (or () => view)
  match: v => v === 'game' || v.startsWith('game:'),
  label: 'Achievements', icon: 'trophy',
  desc: 'Level, streaks, quests and 578 achievements',     // one line, 60 characters at most
  area: 'life',                   // home | tasks | calendar | money | life | system
  tab: true,                      // one of its area's level-1 tabs (Life's six; Home's four)
  sections: [['game', 'Today'], ['game:wall', 'Achievements'], ['game:records', 'Records and focus'], ['game:bosses', 'Bosses'], ['game:unlocks', 'Unlockables']],
  parent: null,                   // a page this one sits under ('trips' for 'trip:<id>')
  keywords: 'game xp level streak quests achievements records bosses',
  since: '2.16', discover: true,  // the new-page dot (2.9)
  available: () => true,          // false: not on this build (hidden everywhere)
  off: () => (gameFun() === 'off' ? {label: 'Fun is off', action: {label: 'Turn on', run: () => gamePrefSet({fun: 'subtle'})}} : null),
  badge: () => '',                // a count, or a short hint ('Lv 14', 'in 9d')
  order: 40,
});
pagesAll()            // the registered pages, available ones, in area order
pageFor(view)         // the page a view belongs to, or null
pagesMarkSeen(view)   // state.seen.pages[pageId] = today (setView calls it)
pagesFresh()          // pages with a dot right now (2.9)
```

Core views register in `15-nav-sidebar.js` (Home and its tabs, the task views,
Tags, People, Files, Calendar, Money, Settings, Profile, Connections, Bin, the
animation gallery). Each section registers its own page at load: Achievements
(`92-game-3ui.js`), Memories (`93-memories-page.js`), Places
(`90-locations-view.js`, with Trips as a section), Friends (`96-friends-1ui.js`),
Together (`99-together-0core.js`), Waiting (`34-waiting.js`), and the 2.18
garden, pets and wardrobe modules.

The Life sidebar and tab strip, the launcher, the palette, the Pages pins, the
dots, the crumbs and the achievements' "Been everywhere" secret all read this
one list.

### 2.7 All pages: the launcher

A searchable grid of every page by area, with icons and one-line descriptions.

```text
+-- All pages ------------------------------------------------------ [ Esc ] --+
| [ Find a page...                                                          ] |
| Recently: Garden · Weekly review · Money · Friends                           |
|                                                                              |
| HOME   Home · Finish the day · Weekly review · History                       |
| TASKS  Inbox · Today · Upcoming · All tasks · Waiting · Do now · No date ...  |
|        Smart lists, boards, streams, tags, people, Together, Files and links  |
| CALENDAR  Calendar (Month)(Week)(Day)(Agenda)                                |
| MONEY  Money (Overview)(Budgets)(Transactions)...                            |
| LIFE                                                                         |
| +----------------------+ +----------------------+ +----------------------+   |
| | [users] Friends   2  | | [sprout] Garden  NEW | | [paw] Pets      NEW  |   |
| | Your friends, cheers | | Plants, visitors,    | | Your companion and   |   |
| | and shared fun       | | shop and almanac     | | its tricks           |   |
| +----------------------+ +----------------------+ +----------------------+   |
| | [trophy] Achievements| | [book] Memories      | | [pin] Places         |   |
| | Level, quests and    | | Journal, capsules,   | | Where you have been, |   |
| | 578 achievements     | | postcards, your year | | and your trips       |   |
| +----------------------+ +----------------------+ +----------------------+   |
|        You: Profile · Wardrobe                                               |
| SETTINGS AND HELP  Settings · Connections · Bin · What's new · Keyboard ...  |
|                                             Mark all as seen · Customise...  |
+------------------------------------------------------------------------------+
```

- **Ways in**: a grid button `#pages-btn` beside the sidebar's search box
  (tooltip "All pages (G G)"); the `all-pages` row at the foot of every tab's
  sidebar; the corner hub and the More menu through
  `registerMoreItem({id: 'all-pages', label: 'All pages…', icon: 'layout-grid',
  order: 5, where: ['more', 'workspace'], kbd: 'G G'})` (this also covers phones,
  where the sidebar is a drawer); the palette ("All pages…", `pages-open`, and
  every page as a Go to entry with its description, replacing the hard-coded
  list in `_palSources`, `16-command-palette.js:138`); **G then G**
  (`90-wiring.js:299`: check `_gPending` before setting it).
- **Behaviour**: type to filter (the palette's fuzzy match over label,
  description, keywords and sections); arrows move in the grid, Enter opens,
  Esc closes; a card's pin button (or Shift+Enter) pins the page to the sidebar
  with Undo; section chips open a section directly; "Off" cards show their
  reason and one button; choosing the current page only closes the launcher.
  Big areas (Life) show cards; the others show compact rows, so the grid stays
  one screen. Reduced motion: no zoom-in.
- Files: `src/app/16-pages.js` (new), `src/styles/16-pages.css` (new),
  `src/body.html` (the button), `src/styles/10-sidebar.css`.

### 2.8 Home card titles open their page

Add `page` to `registerHomeWidget` (a view, or `ctx => view`). The grid
(`12-home-grid.js`), after a widget renders and while not editing, turns the
card header's title (`.card-h > h3`, or an element marked `data-hw-title`) into
a button with a chevron on hover and focus, `aria-label="Open <page>"`. Cards
with their own header (UI_CLEANUP_PLAN.md C4 moves them to `.card-h`) mark
their title with `data-hw-title`.

| Widget | `page` | Widget | `page` |
|---|---|---|---|
| today, dayplan | `today` | heatmap | `memories:year` |
| week, runway | `week` | onthisday, seasonal | `memories` |
| schedule, nextup, gap, wrapup, calcheck, countdowns | `calendar` | funfact | `memories:milestones` |
| capture | `inbox` | reportcard, review | `home:week` |
| inbox | `triage` | waiting | `waiting` |
| list | `ctx => 'list:' + ctx.prefs.list` | owe, people | `people` |
| launchpad, links | `files` | travel | `trips` |
| finance, spendable | `finance` | animday | `settings:animations` |
| game (Quests and streaks) | `game` | garden | `garden` (before 2.18: `memories:year`) |
| friends (new) | `friends` | pets (2.18) | `pets` |
| activity, catchup, focus, habits, notebook, suggest | none (no page behind them) | | |

### 2.9 New-page dots

- A page has a dot while it is **not yet visited** (`state.seen.pages[pageId]`
  is empty) and either its `since` is newer than the user's baseline or it has
  `discover: true` (Achievements, Memories, Places, Friends, Together: pages
  that existed but were hard to find).
- Baseline, once, on the first run with the registry (synced `seen.once`, so
  every device agrees): a user with history before today (`pagesUpgrade:2.18`)
  gets dots; a brand-new user (`pagesFresh:2.18`) gets none.
- Where: after the row's label in the sidebar (`sbNavItem` gains `fresh: true`,
  `14-shell.js:85`), at most **three** in the sidebar at once; a dot on a tile
  when any of its pages has one (the Life tile above all); a "New" pill in the
  launcher; a dot on the hub's Life icons. Screen readers hear "new".
- Cleared by opening the page (`pagesMarkSeen` in `setView`) or "Mark all as
  seen" in the launcher.
- The same `seen.pages` record is what the achievements' `view` marks read
  (ACHIEVEMENTS_500.md 2.1.4): one store, synced, page ids only.

### 2.10 Breadcrumbs and back

`sec.crumb(v)` may return `{label, view}` objects; `renderCrumb`
(`14-shell.js:278`) makes every part but the last a button, after the area.

| Where | Crumb after the change |
|---|---|
| Achievements and its sections | Life › **Achievements** › Records and focus |
| a Memories tab | Life › **Memories** › Postcards |
| a friend | Life › **Friends** › (their name) |
| Places and a trip | Life › **Places** › **Trips** › (trip) |
| the garden shop (2.18) | Life › **Garden** › Shop |
| a shared space and its tab | Tasks › **Together** › **(space)** › Plan |
| a person | Tasks › **People** › (name) |
| Waiting | Tasks › Waiting (today it shows a Settings gear) |
| a Settings group | **Settings** › Profile |

**Back**: a page reached from a link inside another page (not the sidebar, a
tile, a tab, the palette or the launcher) shows "‹ Back to <where you were>" at
the start of its header. `setView(v, {from})` remembers the last 20 views in
memory, this tab only. The Friends page's own "‹ Friends" button
(`96-friends-1ui.js:669`) becomes this shared one. Optional and last:
`history.pushState` for page-to-page moves so the mouse's back button works;
`popstate` calls `setView` without pushing.

### 2.11 What's new: "Show me" targets

`95-whats-new.js`: `WHATS_NEW_VERSION = '2.18'`, new groups first.

| Entry id | Group | Show me |
|---|---|---|
| `life-area` | A tidier app | `sel: ['#section-switcher [data-tile="life"]']`: "Life holds Friends, Garden, Pets, Achievements, Memories and Places. G then L." |
| `open-life` | A tidier app | `sel: ['#ws-btn']`: "Your avatar's menu has Open Life and a shortcut to each part." |
| `all-pages` | A tidier app | `cmd: ['pages-open']`, `sel: ['#pages-btn']`: "Every page in one place: the grid button by the search box, or G twice." |
| `calm-tasks` | A tidier app | `view: ['today']`, `sel: ['#sidebar [data-block="task-views"] .nav-more']`: "Fewer rows in Tasks: the rest wait under More views." |
| `calm-rows` | A tidier app | `view: ['all']`, `sel: ['#display-btn']`: "Calmer task rows. Display › Show on rows brings anything back." (UI_CLEANUP_PLAN.md C3) |
| `card-links` | A tidier app | `view: ['home']`, `sel: ['.hg-w .hw-title-link']`: "Card titles open their page." |
| `life-cards` | A tidier app | `cmd: ['home-add-life-cards']`: "Add the garden, quests and friends cards to Home." |
| `garden` (replaces 2.16's) | Garden and pets | `view: ['garden', 'home']`, `sel: ['#sidebar [data-view="garden"]', '.hg-w[data-wid="garden"]']` |
| `pets` | Garden and pets | `view: ['pets']`, `sel: ['#sidebar [data-view="pets"]']` |
| `friend-gardens` | Garden and pets | `view: ['friends']`, `sel: ['[data-whats-new~="friend-gardens"]']` |
| `wardrobe`, `profile-extras` | You | `view: ['settings:me']`, `sel: ['[data-whats-new~="wardrobe"]']`, `['[data-whats-new~="profile-extras"]']` |
| `ach-500` | Fun | `view: ['game:wall']`, `sel: ['#gm-wall']`: "500 new achievements, with search and Next up." |

Retarget older entries: `xp` to `#sidebar [data-view="game"]`; `locations` and
`journal` find their rows on the Life tab; `friends-tab` gets
`'#sidebar [data-view="friends"]'` before `#ws-btn`; `money` mentions the new
Money name. `_wnGoAndFind` opens the entry's view first, so the right tab's
sidebar is on screen when the spotlight looks for the row.

---

## 3. Build order (files, one step at a time)

One agent, one step, commit after each (the owner's rule since the laptop
crashes). Each step: `node build.mjs --syntax`, then `node build.mjs`. No
tests, no screenshot or review step. N1 to N7 can ship before the 2.18 modules;
N11 plugs them in.

| Step | What | Files |
|---|---|---|
| N1 | Pages registry; area tabs component; group functions; clickable crumbs; `seen.pages`; the `all-pages` More/workspace item | `src/app/14-shell.js`, `src/app/06-core-seen.js` (header: the `pages` group), `src/app/15-nav-sidebar.js` (`setView` calls `pagesMarkSeen`; core pages registered) |
| N2 | The Life tile, its default view and badge; Finances shown as Money; G L / G O | `14-shell.js`, `src/app/15-nav-life.js` (new: `lifeTileView`, `lifeBadge`, `life-tabs`, `life-you`, `all-pages` blocks), `16-command-palette.js` (`_PAL_G`), `90-wiring.js` (`_G_KEYS`), `15-nav-sidebar.js` (the finance block heading "Money") |
| N3 | Sections move into Life and register their pages | `92-game-3ui.js` (group, title, sections), `93-memories-page.js` (group; drop `memories-nav`), `96-friends-1ui.js` (group; drop `friends-nav`; Shared spaces panel), `90-locations-view.js` and `69-travel-ui-trips.js` (group, Places sections), `69-travel-ui.js` (drop the Home `trips` block), `99-together-0core.js` (crumbs; page), `34-waiting.js` (group `tasks`), plus `registerPage` lines in `26-tags-section.js`, `63-resources.js`, `51-people-section.js`, `41-calendar-section.js`, `65-finance-view.js`, `57-settings.js`, `56-connections.js` |
| N4 | The area tab strip on Life pages; level-2 controls for Memories, Achievements, Places | `80-main-render.js`, `14-shell.js` (`areaTabsEl`), `93-memories-page.js` (its tabs become level 2), `92-game-3ui.js` (sections), `90-locations-view.js`, `src/styles/12-shell-refresh.css` |
| N5 | Home's calm sidebar and the Tasks sidebar clean-up; customiser | `78-brief-hooks.js` (`review-nav` heading Plan, Plan my week row), `15-nav-sidebar.js` (Views: up front, promoted, More views), `15-nav-custom.js` (tabs, labels, icons, three-state Views rows, `sidebarLayout.more`), `63-resources.js` (Files into More views), `15-nav-smart-lists.js`, `33-board-ui.js`, `99-together-0core.js` (hide when empty), `lib/sync/model.mjs` (`sidebarLayout.more` as a whole value) |
| N6 | The launcher, its button, the palette and G G | `src/body.html`, `src/app/16-pages.js` (new), `src/styles/16-pages.css` (new), `src/styles/10-sidebar.css`, `16-command-palette.js`, `90-wiring.js` |
| N7 | The corner hub's Open Life row and icons; the chip opens Achievements | `97-profile-3corner.js`, `src/styles/97-profile.css`, `92-game-3ui.js` |
| N8 | Home card links; the Life cards (garden, quests and streaks, friends around) | `12-home.js` (API doc), `12-home-grid.js`, one `page:` line in each widget of 2.8, `12-home-w-friends.js` (new), `lib/home-topbar.mjs` (HOME_WIDGETS), `12-home-presets.js` (new users' preset), `src/styles/13-home-core.css` |
| N9 | New-page dots | `14-shell.js` (`sbNavItem fresh`, tile dot in `renderSwitcher`), `16-pages.js`, `15-nav-life.js`, `97-profile-3corner.js` |
| N10 | Back link (pushState optional, last) and What's new 2.18 | `14-shell.js` / `80-main-render.js`, `15-nav-sidebar.js` (`setView(v, {from})`), `96-friends-1ui.js`, `95-whats-new.js` |
| N11 | 2.18 pages plug in | the garden, pets, wardrobe, you and garden-social modules: `registerPage` (area `life`, `tab: true` for Garden and Pets, `since: '2.18'`), group `life`, Home widget `page`, `data-whats-new` marks; the wardrobe as a section of `settings:me` |
| N12 | Docs | `MODULES.md` (pages registry, areas and `group` functions, `page` on widgets), `docs/USAGE.md` (finding pages, Life) |

## 4. Done when

- [ ] The switcher reads Home · Tasks · Calendar · Money · Life; G L opens Life.
- [ ] Friends, Garden, Pets, Achievements, Memories and Places are Life's six
      tabs, in the sidebar and as a strip on every Life page; Profile and the
      wardrobe are under You.
- [ ] Home's sidebar is Home plus Plan; its Life cards link into Life.
- [ ] The Tasks sidebar shows four views up front, promotes Waiting, Email
      triage and Do now only while they need you, and keeps the rest under
      More views; existing customisations are untouched.
- [ ] Every page (and the 2.18 ones) is in All pages with an icon and a
      one-line description, and has at least two ways in besides the palette.
- [ ] Game (Achievements), Waiting and Places show the right tile, sidebar and
      crumb.
- [ ] The palette's Go to list is the registry; Together is in it.
- [ ] Dots appear only for upgraders, at most three in the sidebar, and clear
      on first visit on every device.
- [ ] Fun Off: Achievements, Garden and Pets show one calm "Turn on" state.
- [ ] Re-selecting the current page, tab or section anywhere is a no-op apart
      from scrolling to the top.
- [ ] Keyboard only: G G, G L, arrows and Enter in the launcher and the tab
      strip, Esc back; reduced motion respected; phones reach the launcher and
      Life from More and the hub.

---

## 5. Build notes (feat/218-nav, 24 Oct 2026)

Built: N1 to N10 and N12 above; N11 is half done from this side (Garden and Pets are
guarded Life tabs, `available()` true once the sections `garden` and `pet` exist; the
wardrobe and profile extras have What's new entries guarded by `profileWardrobeEl` and
`profileCardEl`). Where the build differs from the plan, or leaves something out:

- **Pets' view is `pet`** (the pets branch registers section `pet`, tabs `pet:wardrobe`,
  `pet:journal`), not `pets`; the page id is `pets`. The garden's tabs are `garden:shop`,
  `garden:almanac`, `garden:basket` (it draws them itself: `ownTabs`).
- The garden's Home block `fun-nav` and the pet's `pet-nav` are retired in the shell
  (`SIDEBAR_RETIRED`, 14-shell.js); their modules need no change. Their sections still say
  `group: 'home'`; the registry's area (`life`) wins in `shellGroupFor`.
- The strips (level 1 and 2) live in the page header (`#view-tabs`), not in `#main-body`,
  so a page's entrance and Motion's stagger are unchanged and they repaint only on change.
- Profile is listed under Life › You but stays Settings › Profile on screen (`keepGroup`).
  Home's four pages and Settings' groups share a `family`, so moving between them is not a
  link (no Back).
- Back is memory only: `history.pushState` (optional in 2.10) is not built.
- Smart list widget (`list`) has no title link: its prefs hold a query, not a list id.
- Home presets are unchanged: Quests and streaks stays hidden by default (a saved board
  lists every widget it has seen, so changing the default would show it to existing users
  who never customised Home). New users and upgraders get the cards from What's new ›
  *Add the Life cards to Home* (`home-add-life-cards`) or Add widget.
- The `calm-rows` What's new entry belongs to the C3 batch (UI_CLEANUP_PLAN.md), which
  should add it with `registerWhatsNew`; `friend-gardens` and `ach-500` likewise belong to
  the garden-social and achievements builds.
