# UX blueprint (2.18b)

Status: PLAN, docs only, 24 Oct 2026. The short, opinionated frame for
NAVIGATION_PLAN.md, UI_CLEANUP_PLAN.md and ACHIEVEMENTS_500.md.

User request, 24 Oct: "we added so many new features, I want them to be clear
and easy to access through the UI while not being overwhelming, like a proper
nice UI design for everything."

Five beliefs drive every choice below:

1. **Everything has one home.** One area, one page, one place in the sidebar.
   Shortcuts may point at it; they never become a second home.
2. **Show today, reveal the rest.** Day one sees a calm app; features appear when
   they become useful, announced once, quietly.
3. **One primary action per surface.** A page, a card, a dialog, a toast: one
   obvious next step, the rest behind More.
4. **Status before decoration.** A card or row says how things stand first;
   chips, art and counts earn their place.
5. **Nothing jumps.** Dialogs, wizards and decks keep their size; content
   scrolls inside them.

---

## 1. The map

Areas are the switcher's five tiles plus Settings: **Home · Tasks · Calendar ·
Money · Life**, and Settings (a footer button, not a tile). Each feature lives
on exactly one page; "Entry" is its one primary way in, "Also" at most two
secondary ones. The palette (Ctrl+K) and All pages reach everything and are not
counted.

| Area | Page (tab) | Panels and tools on it | Entry | Also |
|---|---|---|---|---|
| Home | Today | the day's hero and story, widgets, daily note, Plan my day | Home tile | G H |
| Home | Finish the day | recap, top 3 for tomorrow | Home sidebar › Plan | top-bar pill (evening) |
| Home | Weekly review | the guided review deck, outcomes, wins | Home sidebar › Plan | Review card (Fri to Sun) |
| Home | History | past reviews | Home sidebar › Plan | |
| Tasks | Inbox, Today, Upcoming, All tasks | task lists, quick add, list / board / timeline / matrix | Tasks tile and its sidebar | G T, G U, G A |
| Tasks | More views: Do now, No date, Waiting, Someday, Logbook, Wins, Email triage, Files and links | each a list | Tasks sidebar › More views | a Home card (Waiting, Needs reply, Launchpad) |
| Tasks | Smart lists, Boards, Streams, Tags, People | saved lists, boards, the stream and tag pages, people and their tasks | Tasks sidebar sections | pins, G P |
| Tasks | Together (shared spaces) | shared lists, boards, plan, trip costs | Tasks sidebar › Together | Friends page |
| Tasks | review tools | sweep, Plan my week, clean-up, blocked by, contexts, templates, bulk add | the list header's Review menu | Home Review card |
| Calendar | Calendar | month, week, day, agenda, event editor, Invites and clashes, Fill the gap | Calendar tile | G C |
| Money | Money | overview, spending, categories, merchants, cash flow, recurring, budgets, transactions, money story, What if | Money tile (today "Finances") | G F, Money card |
| Life | Friends | hangout, feed, cheers, gifts, stickers, postcards, quests, events, a friend's page and garden | Life › Friends | corner hub |
| Life | Garden (2.18) | plants, decorations, visitors, shop, harvest, almanac, levels | Life › Garden | Home garden card |
| Life | Pets (2.18) | pets, tricks, treats, outfits | Life › Pets | Garden |
| Life | Achievements (today "Game") | level, streaks, quests, records, focus and estimates, bosses, the wall, unlockables | Life › Achievements | top-bar level chip |
| Life | Memories | journal, your year, time capsules, postcards, people and birthdays, milestones, Wrapped | Life › Memories | On this day card |
| Life | Places | locations, badges, trips, Where was I | Life › Places | Trip card |
| Life | You | profile, avatar, status, wardrobe (2.18), banners, nameplates, titles (2.18) | corner hub (Edit profile) | Life sidebar › You |
| Settings | Settings | every group, animations gallery, sync, relay, privacy, updates, diagnostics | footer Settings | More menu |
| Settings | Connections | accounts and sign-ins | More menu | the "connect" link on a card that needs it |
| everywhere | tools | palette, Quick capture, the assistant, focus timer, What's new, keyboard help, Bin | their key or the top bar | More menu |

**Too many ways in today** (trim to the rule above):

- Weekly review: sidebar, palette, Shift+R, the list header button, the Home
  Review card, Home's tab strip, a quest button, the review hub. Keep sidebar,
  Review card, Shift+R; the list header button becomes the Review menu.
- Achievements wall: top-bar chip, a hidden Home widget, two palette commands,
  Settings > Game, Settings > Animations, Profile, every moment's "See". Keep
  Life › Achievements, the chip, moments; Settings and Profile link once.
- Friends: hub (three rows and the avatars), palette twice, Settings > Friends,
  Settings > Relay, Together links. Keep Life › Friends and the hub.
- Postcards: two different things share one name (first-visit postcards in
  Memories and Places; scene postcards to friends). Call the second "scene
  cards" in the UI.

**No real way in today**: Together (no palette entry), Trips (only when a trip
is near), Locations (hidden among task views), Game when Fun is Off, Friends
(hidden in the sidebar), the animation gallery (Settings only), Wins, Tomorrow,
and the three 2.18 pages. NAVIGATION_PLAN.md gives each a home.

---

## 2. Progressive disclosure

| Tier | What | How it shows up |
|---|---|---|
| **1. Day one** | Home (hero, story, 4 to 6 cards), Tasks (Inbox, Today, Upcoming, All tasks, streams), Calendar (or one calm "Connect your calendar" card), Money (a teaching empty state until connected), Life with Achievements and Memories, Settings | Always there |
| **2. After a related action** | Waiting (first wait), Someday (first #someday), Smart lists and Boards headings (first one saved), Together (first shared space), Email triage (Claude connected), Places (location history on), Trips (travel on), Friends feed (first friend), Garden plants (first finished task grows one), Pets (offered by the garden, 2.18), Focus timer facts (first timed task), money stories (finances connected) | the row or section appears in its home with a **new dot**; one **tip at the point of use** the first time ("Waiting lists everything you're chasing. N nudges someone.") |
| **3. More or Advanced** | Do now, No date, Logbook, Wins, Files and links (under More views); review tools (Review menu); export, print, templates, bulk add (More menu); server, diagnostics, sync health, remote MCP, scene editor, finance symbols (Settings › Advanced) | never announced; found by palette, All pages, More |

Rules for revealing:

- At most **one** new-thing prompt a day across the app (a dot does not count).
  Tips are one sentence, at the control, dismissed for good on every device
  (synced `seen.once`).
- Empty states teach: art or icon, one sentence that says what will appear
  here, one action that makes it appear. Never "No data".
- Nothing modal after onboarding, except a confirm the user asked for.
- A feature that is switched off shows one calm row where it would be, with a
  "Turn on" button. Never a grid of locks.

---

## 3. Templates and density

### Page template

```text
[crumb: Area › Page › Section]                            [Primary action] [...]
Page title                       (one line subtitle, optional)
[ Level-1 tabs: the area's pages, when the area has tabs ]
[ Level-2 control: this page's sections, when it has them ]
content ...
(empty: art, one sentence, one action)
```

- The shared header draws the title. A page never draws a second title in its
  body (today the Game page does both).
- One primary action, at most. Everything else (export, print, customise, this
  page's settings, help) goes in the header's More menu.
- At most two levels of tabs (area tabs, then sections). Deeper things are
  panels, dialogs or the detail pane.
- Re-selecting the current tab or page is a no-op apart from scrolling to the
  top (CLAUDE.md).

### Card template (Home widgets and cards on pages)

```text
+-- [icon] Title  >             [gear in edit mode only] --+
|  STATUS FIRST: the number or state, big                   |
|  One sentence that explains it.                           |
|  [ One action ]                                           |
+-----------------------------------------------------------+
```

- The title links to the card's page (the chevron shows on hover and focus).
- Status first, one sentence, one action. Lists inside a card show at most 5
  rows and a "N more" link to the page.
- An empty card says what will appear and offers one action.

### Density rules

| Surface | Rule |
|---|---|
| Task row (default) | title, due date, priority (the checkbox colour), stream dot. Everything else is opt-in (Display › Show on rows) and listed in the row's tooltip and the detail pane. At most 2 tag chips (+N) when tags are on. |
| Task row (status chips) | waiting, blocked and "planned for today" may show, because they change what you do; at most 2 at once. |
| Home | at most 6 cards above the fold at 1440 × 900 and at most 2 large ones; new widgets start hidden for existing users. |
| Sidebar tab | at most 12 rows before the first fold (streams excluded); at most 3 new dots at once; badges are numbers only for things that need action. |
| Page header | one primary button; at most 2 icon buttons beside the More menu. |
| Dialog | four sizes (440, 560, 760, 1100 px); one primary button; steppers keep a fixed height. |
| Toast | one at a time, one action, a plain sentence with the next step. |
| Chips anywhere | at most 3 in a row before "+N". |

---

## 4. The first week

| Day | What the user meets | What waits |
|---|---|---|
| 1 | The welcome set-up (name, region, preset), then the Quick start's three tips (add a task, search, make Home yours). Tasks: Inbox and Today. Evening: "Finish the day" in the top bar if something was done. | Life has a quiet dot; nothing pushes it. |
| 2 | Home's morning story and cards. If no calendar: one "Connect your calendar" card (dismissible for good). | Money stays a teaching empty state. |
| 3 | After a handful of tasks: one tip at Upcoming's header for Plan my week. A first boss or quest can appear on the Achievements page, silently. | Weekly review waits for Friday. |
| 4 | Money: if the user opens it, the empty state teaches "Connect your bank or drop a CSV". | |
| 5 | Friday to Sunday: the Review card on Home offers the first weekly review. | |
| 6 | After 10 or so tasks done: the first achievement moment (Fun level Subtle: a toast with "See"), which lights Life's dot; the garden's first plant has grown from finished tasks. | Pets are offered inside the garden later (2.18). |
| 7 | Memories: at Finish the day, one line offers the journal. Friends: the Friends page's "Getting started" waits until the user opens Friends; the hub shows "Open Life" all along. | Together appears once there is a friend. |

Rules: one new thing a day; every introduction is at the place where it is
used; dismissing anything is permanent on every device.

---

## 5. How builders use this

- Every new or touched page follows the page template; every new or touched card
  follows the card template; the density rules are limits, not targets.
- New features enter at tier 2 or 3 unless the user asked for them up front,
  and come with a home in the map above, a registry entry (NAVIGATION_PLAN.md
  2.2), an empty state that teaches, and at most one tip.
- Checks are the usual ones: `node build.mjs --syntax` and `node build.mjs`.
  No tests, and no screenshot or review pass: the owner gives feedback himself
  after the release.
