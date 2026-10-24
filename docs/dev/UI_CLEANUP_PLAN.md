# UI cleanup plan (2.18b)

Status: PLAN, 24 Oct 2026; C1 (the primitives) is built, see section 6.
Frame: `docs/dev/UX_BLUEPRINT.md` (templates and density rules). Navigation:
`docs/dev/NAVIGATION_PLAN.md`.

User requests, 24 Oct:

- "we just need overall cleanup and consistency."
- "the tasks list shows locations, someday etc, it's a bit overwhelming, we need
  to think of good UI design not to put too much on the screen."
- "when I click weekly review on my tasks, it changes sizes as I click the arrows
  so it doesn't sit in one place since the tasks are of different sizes, subtle
  things like that."

Three parts: **layout stability** (nothing jumps), **calmer task rows**, and
**consistency** (spacing, headers, buttons, dialogs, empty states, icons, toasts),
then eight batches with no file in two batches. Line numbers are from
`feat/2171-corner` (24 Oct). No tests and no screenshot or review step: check with
`node build.mjs --syntax` and `node build.mjs`, and follow the templates while
building.

---

## 1. Layout stability: dialogs and wizards keep their size

### 1.1 Why they jump

- `openDialog` (`src/app/11-ui-kit.js:182`) makes a `.modal`
  (`src/styles/01-components.css:309-313`): anchored at `top: 10vh`, height
  set by its content, `max-height: 80vh`. When a step, a card or a tab has a
  different height, the footer and its buttons move, often right out from under
  the pointer.
- The first-run set-up (`.ob-card`, `src/styles/59-onboarding.css:4-5`) is
  centred with `top: 50%; transform: translate(-50%, -50%)`, so a taller step
  grows both up and down.
- The weekly review deck (the owner's report): `.modal.rf-deck`
  (`src/styles/34-review.css:43`) has `max-height: 88vh` but no height, and a
  card (`.rf-card`, `34-review.css:57`) only has `min-height: 200px`. Each task's
  card is as tall as its title, notes, subtasks and "why" line, so the dialog
  resizes on every card and the action keys and the back / skip controls
  (`.rf-acts`, `.rf-foot`, `34-flow.js:104-118`) move.

### 1.2 The fix, once, in the engine

`openDialog(o)` gains `size` and `fixed`:

```js
openDialog({ title, size: 'sm' | 'md' | 'lg' | 'xl', fixed: true, body, actions })
//   sm 440, md 560, lg 760, xl 1100 (px, never wider than the screen minus 32)
//   o.width still works: it snaps to the nearest size (<= 480 sm, <= 640 md, <= 800 lg, else xl),
//   so no call site has to change
//   fixed: true -> .modal.is-fixed: height: min(var(--modal-h, 680px), 86vh); the body scrolls;
//                  header and footer never move; top: 8vh for every modal
```

```css
.modal.is-fixed { height: min(var(--modal-h, 680px), 86vh); }
.modal.is-fixed > .modal-b { overflow: auto; overscroll-behavior: contain; }
.modal-h, .modal-f { flex: none; }          /* already flex: none (01-components.css:319, :322) */
```

### 1.3 Every stepper, deck and tabbed dialog

| Dialog | Where | What moves today | Fix |
|---|---|---|---|
| Weekly review deck (and the clean-up, which uses it) | `34-flow.js:38` (`width: 780`), CSS `34-review.css:43`, `:45`, `:57` | the card's height per task, so the arrows and action keys move | `size: 'lg', fixed: true`; `.rf-deck-b` becomes three rows: rail and progress (`flex: none`), the card area (`flex: 1; min-height: 0; overflow: auto`), actions and footer (`flex: none`, pinned); `.rf-card` drops `min-height` and fills the card area |
| Clean-up | `34-cleanup.js:12` (`rfDeckOpen`) | as above | inherits the deck fix |
| Today to Tomorrow sweep | `34-sweep.js:56` (`width: 720`) | the list shrinks as tasks are decided | `size: 'lg', fixed: true`; the list scrolls; the key legend stays at the bottom |
| Plan my week | `34-sweep.js:202` (`width: 1100`), CSS `34-review.css:44` | day columns grow as tasks are placed | `size: 'xl', fixed: true` with `--modal-h: 90vh`; each day column scrolls inside |
| Welcome set-up | `59-onboarding.js:44`, CSS `59-onboarding.css:4-5` | each step grows up and down from the centre | anchor at `top: 8vh` (`transform: translateX(-50%)` only), fixed height `min(620px, calc(100vh - 64px))`, body scrolls, buttons pinned |
| What's new | `95-whats-new.js:380` (`width: 780`) and the tour bubble (`whatsNewSpotlight`, `95-whats-new.js:278`) | the list's groups; the bubble's size per step | `size: 'lg', fixed: true`; the bubble gets a fixed width and a min-height so Next / Finish stay put |
| Friends: getting started | panel `96-friends-onboard.js:166` (`_froRender`), CSS `96-friends-onboard.css` | each step's height pushes the feed below | the step body gets the tallest step's min-height; the step buttons sit at the panel's foot |
| Add a friend | `96-friends-1ui.js:817` (`width: 520`, Invite / Paste / Code tabs) | each tab's height | `size: 'md', fixed: true` |
| Customise sidebar | `15-nav-custom.js:395` (`width: 520`, a tab per area) | each area's list | `size: 'md', fixed: true` (the navigation build owns this file: NAVIGATION_PLAN.md N5 sets it) |
| Add a widget (Home) | `12-home-edit.js:435` (`width: 940`) | filtering the gallery | `size: 'xl', fixed: true` |
| Add a widget to My money | `src/finance/39-board-edit.js:252` (`width: 940`) | filtering | `size: 'xl', fixed: true` |
| Moving your data | `58-settings-move.js:153` (`width: 720`) | progress steps | `size: 'lg', fixed: true` |
| Add several tasks | `23-quick-add-dialog.js:121` (`width: 600`) | grows as lines are typed | `size: 'md'`, `fixed: true` when `o.multi` |
| Connect a bank (finance wizards) | drawer, `56-fin-connect-wizards.js:172`; widths `:121-128` (520, 580, 600) | nothing (a drawer is full height) | one width (560) for every provider |

Rule for new dialogs: a dialog with steps, tabs, filters or a deck is
`fixed`; a simple form or confirm sizes to its content.

---

## 2. Calmer task rows

### 2.1 Today

`Display › Show on rows` (2.16 row fields) lives in
`src/app/31-views-switcher.js:98-147`: `VIEW_ROW_FIELDS` (`:98`: due, stream,
tags, people, subtasks, estimate, details), presets (`:99`: Everything, Calm,
Bare), the saved choice `taskViewPrefs('_rows').hide` (`:100-108`) and the CSS
that hides fields (`src/styles/31-views.css:12-18`). With nothing saved,
**everything shows**.

Every place a task row gets something besides its title:

| What | File:line | Class |
|---|---|---|
| stream dot and the stream's name | `30-task-row.js:280-289` | `.t-streamdot`, name in `[data-cz-label]` |
| planned-for chip | `30-task-row.js:297-301` | `.t-planned` |
| subtasks count (a button) | `30-task-row.js:302-309` | `.sub-count` |
| notes count | `30-task-row.js:310` | `.note-count` |
| files and links | `30-task-row.js:312-313` | `.t-files` |
| linked meeting | `30-task-row.js:314-315` | `.t-meet` |
| repeat | `30-task-row.js:316` | `.t-recur` |
| estimate | `30-task-row.js:317` | `.t-est` |
| context and energy | `30-task-row.js:318` -> `24-task-contexts-ui.js:55-63` | `.t-ctx`, `.t-energy` |
| pinned | `30-task-row.js:319` | `.t-pin` |
| waiting and blocked chips, dimming | `30-task-row.js:321` -> `34-blocked.js:27` (`rfRowDecorate`) | `.rf-waiting`, chips |
| won't do / closed time | `30-task-row.js:322-326` | `.t-wont`, `.t-closed` |
| up to 3 tags, then +N | `30-task-row.js:331-349` | `.t-tags` |
| up to 3 people avatars | `30-task-row.js:350-355` | `.t-people` |
| due stamp | `30-task-row.js:356-360` | `.due-stamp` |
| board cards: 7 fields by default | `33-board-model.js:28-33` (`BOARD_FIELDS`, `BOARD_DEFAULT_FIELDS`) | |
| Home list rows (already calm: stream and "In progress") | `12-home-w-list.js:180` | `.hls-meta` |

Locations are not shown on rows (they live in the detail panel and Places);
"Someday" on a row is the `#someday` tag chip.

### 2.2 The new default: title, due date, priority, stream dot

1. `VIEW_ROW_FIELDS` gains four keys: `streamLabel` (the stream's name next to
   its dot), `context` (context and energy), `planned` (the planned-for chip)
   and `pin`. Their CSS goes next to the others in `31-views.css:12-18`
   (`[data-vf-hide~="streamLabel"] .task .t-streamdot [data-cz-label]`,
   `.t-ctx, .t-energy`, `.t-planned`, `.t-pin`).
2. With no saved choice, rows are **Calm**: due date and stream dot show;
   hidden are `streamLabel`, `tags`, `people`, `subtasks`, `estimate`,
   `details`, `context`, `planned`, `pin`. Priority is the checkbox's colour,
   always. Status chips that change what you do (waiting, blocked, won't do)
   stay, at most two at once (`34-blocked.js:27`).
3. **Existing users' explicit choices are kept.** The saved value becomes
   `{hide: [...], v: 2}`, and every write (the toggles, the presets) stores an
   explicit array, Everything included (`hide: []`, not `null`, as `:142` does
   today). Reading: `v: 2` is used as it is; an older non-empty `hide` is an
   explicit choice and is kept (a user who hid tags also gets the four new keys
   hidden, so Calm and Bare users stay calm); a missing or `null` value gets the
   new Calm default. The one case that cannot be told apart (someone who chose
   Everything before 2.18, saved as `null`) gets one tip on the Display button:
   "Rows are calmer now. Show everything?", whose button writes Everything.
4. Presets: **Everything**, **Calm** (the new default), **Bare** (title and due
   date only).
5. Hidden is not gone: the row's tooltip lists what is hidden ("#design
   #review · @phone · ~30m · 2 notes"), built in `30-task-row.js` from the same
   data, and the detail panel and the card show everything. No reveal on hover
   inside the row (it would make rows jump).
6. When tags show, at most two chips then +N (`30-task-row.js:334`,
   `slice(0, 3)` becomes `slice(0, 2)`).
7. Boards: `BOARD_DEFAULT_FIELDS` (`33-board-model.js:33`) becomes
   `['stream', 'priority', 'due']`; saved boards keep their own `fields`
   (`33-board-model.js:54` only fills a missing list).

---

## 3. Consistency

### 3.1 Spacing, type and radius

- Tokens: spacing `00-tokens.css:38-40` (2, 4, 6, 8, 12, 16, 20, 24, 32, 40,
  48, 64), type `00-tokens.css:22-24` and on (`--text-2xs` 11, `--text-xs` 12, `--text-sm` 13, ...), radius
  `00-tokens.css:52`.
- Found: about 1,300 off-scale pixel values in `padding`, `margin` and `gap`:
  10px (365), 14px (197), 3px (163), 5px (157), 18px (117), 7px (75), 22px (55),
  9px (47), plus 11, 13, 15, 17, 19, 23, 26px. 836 raw `font-size` values
  (12px 206, 13px 125, 11px 124, 14px 58, 15px 48, 10px 33, 16px 28, 12.5px 23)
  beside 1,349 token uses; 531 raw `border-radius` values beside 607 token uses.
- Worst files (raw spacing values / token uses): `74-brief.css` 139/0,
  `56-connections-page.css` 129/0, `79-story-morning.css` 101/0,
  `79-story-weekly.css` 98/0, `79-story-evening.css` 96/0,
  `56-fin-connect.css` 92/1, `13-home-w-focus.css` 73/9, `96-friends.css` 73/0,
  `99f-fun.css` 71/0, `13-home-w-schedule.css` 69/1, `34-review.css` 67/28,
  `13-home-w-glances.css` 60/7, `13-home-w-list.css` 54/9,
  `13-home-w-dayplan.css` 48/0, `13-home-w-inbox.css` 48/3,
  `13-home-w-nextup.css` 41/0, `40-detail.css` 40/24, `99-together.css` 38/74,
  `13-home-w-capture.css` 35/1, `13-home-w-spendable.css` 34/1,
  `13-home-w-notebook.css` 33/10, `92-game.css` 33/29, `13-home-w-today.css`
  31/0, `13-home-w-activity.css` 30/1.
- Rule: spacing, font sizes and radii use tokens. Off-scale spacing rounds to
  the nearest step (10 to 8 or 12, 14 to 12 or 16, 3 to 2 or 4, 5 to 4 or 6,
  18 to 16 or 20, 7 to 6 or 8, 22 to 20 or 24, 9 to 8). Allowed raw values:
  1px hairlines and optical nudges of 2px or less, with a comment. Story and
  scene canvases (art, not UI) are exempt.
- Example: the Home card header (`13-home-core.css:104-106`) uses `padding: 10px
  ... 6px` and `font-size: 13px`; it becomes `var(--space-2) var(--space-2)
  var(--space-1-5) var(--space-4)` and `var(--text-sm)`.

### 3.2 Card and section headers

- Home: 13 widgets use `.card-h` (`13-home-core.css:104-106`); the rest build
  their own: `hh-head` (`12-home-w-today.js`), `hwt-h` (`12-home-w-travel.js`),
  `hf-h` (`12-home-w-focus.js`), `rf-hc` (`12-home-w-review.js`), `hin-sugs-h`
  (`12-home-w-inbox.js`), `hg-set-h` (`12-home-w-list.js`).
- Pages: `gm-sec-h` (`92-game-3ui.js:157-160`), `loc-sec-h`, `rw-sec-h`,
  `nb-sec-h`, `sev-h` and `sev-head`, `sm-head` and `sm-h`, `anim-gallery-h`
  (`78-achievements.js:77`), `wk-head` (`77-brief-review.js:117`,
  `92-game-3ui.js:166`), and about thirty more one-off `-h`, `-head` and
  `-title` classes.
- Fix: two helpers in `11-ui-kit.js`: `cardHead({icon, title, page, count,
  actions})` (a `.card-h`, its title linking to `page`, NAVIGATION_PLAN.md 2.8)
  and `secHead({title, sub, actions})` (a `.sec-h` for sections inside pages).
  Their CSS is written once in `01-components.css`; module classes keep only
  extras (colour, layout).

### 3.3 Page headers

- The shared header (`#view-header`, `src/body.html:95`) already draws every
  section's title. The Game page draws a second "You / Game" title in its body
  (`92-game-3ui.js:167`): remove it.
- People (`51-people-section.js:95`, `:121`) and Calendar
  (`41-calendar-section.js:89`, `:176`) use `layout: 'bare'` and draw their own
  `h1`. Calendar keeps bare (its grid needs the room); People moves to the shared
  header.
- The page template's one primary action and More menu: sections declare
  `headerActions(view) -> {primary, more: [...]}`, drawn by
  `renderPageHeaderControls` (`14-shell.js:407`). The navigation build adds the
  API (NAVIGATION_PLAN.md N1); the batches below adopt it page by page.

### 3.4 Buttons

- No shared button builder: 35 private helpers with five argument orders:
  - `(label, icon, run, cls)`: `92-game-3ui.js:24`, `93-memories-page.js:81`,
    `97-profile-2ui.js:18`, `98-perms-2ui.js:17`
  - `(label, icon, cls, run)`: `56-connections.js:42`, `58-settings-data.js:21`,
    `58-settings-move.js:25`, `58-settings-server.js:40`, `79-story-weekly.js:138`
  - `(cls, icon, label, o)`: `12-home-w-calcheck.js:483`, `12-home-w-wrapup.js:322`
  - `(label, o)`: `96-friends-1ui.js:53`, `96-friends-onboard.js:70`,
    `99-together-0core.js:119`, `99f-fun-1core.js:311`
  - `(icon, label, run, o)`: `61-task-card.js:290`, `54-people-card.js:102`
  - others: `58-settings-relay.js:77`, `58-settings-sync.js:339`,
    `12-home-w-gap.js:301`, `12-home-w-inbox.js:261`, `12-home-w-notebook.js:95`,
    `68-suggest-ui.js:79`, `77-brief-review.js:162`, `78-anim-gallery.js:76`,
    `12-home-w-catchup.js:289`, `33-board-ui.js:15`
- Fix: `uiButton({label, icon, kind: 'primary'|'secondary'|'ghost'|'danger',
  size: 'sm'|'md', run, tip, aria, cls})` in `11-ui-kit.js`; each helper
  becomes a one-line wrapper, then goes.
- Sizes: `.btn` and `.btn-sm` (`01-components.css:52`) are the two sizes;
  `.btn-lg` (`:53`) is used twice (`12-home-head.js:36`,
  `34-review-flow.js:245`) and stays for those hero buttons only. `btn-xs` is
  used 9 times but defined only inside two components (`11-select.css:70-71`,
  `13-home-w-nextup.css:104`); at `43-calendar-panel.js:276` it has no style at
  all: use `.btn-sm`.
- Kinds: one primary per surface (UX_BLUEPRINT.md 3).
- Dismiss words: today "Cancel" 38, "Close" 12, "Done" 5, "Not now" 2, "Later" 1.
  Rule: **Cancel** throws a change away, **Close** leaves a read-only dialog,
  **Done** ends a dialog whose changes were saved as you went, **Not now**
  declines a suggestion.

### 3.5 Dialog widths

87 `openDialog` calls use 18 widths: 380 (`99-together-4life.js:284`), 420
(`44-calendar-write.js:175`, `60-task-detail.js:689`, `99-together-4life.js:199`),
440, 460, 480, 520, 540, 560, 580, 600, 620, 640, 720, 760, 780, 900
(`58-settings-server.js:165`), 940 (`12-home-edit.js:435`,
`src/finance/39-board-edit.js:252`) and 1100 (`34-sweep.js:202`). The snap in
1.2 turns them into four sizes with no call-site edits; a call site switches to
a size name when its file is next touched.

### 3.6 Empty states

- Five forms today: `mountEmptyState` (`11-ui-kit.js:54`, 34 uses); hand-built
  `.empty-state` (`33-board-ui.js:409`, `33-board.js:31`,
  `65-finance-view.js:66`, `80-main-render.js:73`); muted paragraphs
  (`92-game-3ui.js:315`, `96-friends-1ui.js:538`, `98-perms-2ui.js:120`, `:205`,
  `:287`, `:658`, `:700`, `99-together-1space.js:660`, `78-scene-editor.js:1000`,
  `:1038`, `:1060`); `.cz-empty` (`17-app-icon.js:146`, `28-customise.js:615`);
  `.sbc-empty` (`15-nav-custom.js:386`).
- Fix: two forms only. A page or section uses `mountEmptyState` (art or icon,
  one sentence saying what will appear, one action). A list inside a card or
  dialog uses a new `emptyLine(text, action?)` (one muted line and an optional
  link).

### 3.7 Icon sizes

- Classes: `.i` 16, `.i-xs` 12, `.i-sm` 14, `.i-lg` 18, `.i-xl` 20
  (`01-components.css:21-25`). `i-md` is used 7 times and defined nowhere, so
  those icons fall back to 16px: `12-home-w-funfact.js:24`,
  `12-home-w-onthisday.js:70`, `12-home-w-reportcard.js:30`,
  `56-accounts-imap.js:214`, `93-memories-ui.js:277`,
  `93-memories-wrapped.js:73`, `99s-friends-scenes-2postcards.js:161`.
- 366 CSS rules resize `.i` with raw pixels (13px 80 times, 14px 72, 12px 64,
  15px 35, 16px 26, 18px 22, 11px 18, 22px 14 ...), most in
  `56-connections-page.css` (24), `13-home-w-focus.css` (16),
  `13-home-w-glances.css` (15), `13-home-w-habits.css` (14),
  `56-fin-connect.css` (13), `79-story-morning.css` (13),
  `13-home-w-dayplan.css` (12), `10-sidebar.css` (11),
  `13-home-w-schedule.css` (11).
- Fix: define `.i-md` as 16px (it documents intent); UI icons use the five
  classes only; CSS may size an icon only for art and hero icons, through one
  token (`--icon-hero`, 28px).

### 3.8 Toasts

- "Could not" 17 times, "Couldn't" 3 (`32-tasks-ui.js:319`,
  `src/finance/04-data.js:98`, `:134`).
- A failed copy is worded seven ways: `12-home-w-notebook.js:386`, `:456`,
  `28-customise.js:263-264`, `32-tasks-ui.js:319`, `56-connections.js:51`,
  `58-settings-data.js:214`, `58-settings-server.js:175`,
  `90-locations-view.js:226`.
- Raw `e.message` appended instead of `netErrorMessage` (`02-core-net.js`):
  `56-fin-connect-wizards.js:669`, `56-fin-connect.js:731`,
  `58-settings-server.js:148`.
- 197 error toasts have no action (no Try again, no next step).
- Full stops vary ("Could not copy." `58-settings-data.js:214`; "Could not copy
  the link" `28-customise.js:263`).
- Finances' toast adapter takes other option names (`{bad, action: 'label',
  onAction}`, `src/finance/42-toast.js:5`).
- Rules: success is a short past tense, no full stop for one to three words
  ("Copied", "Saved", "Moved to tomorrow"); an error is "Couldn't <do it>:
  <plain reason>." with one action (Try again, or the next step); Undo is always
  "Undo". Helpers in `11-ui-kit.js`: `toastError(what, e, retry)` (uses
  `netErrorMessage`, adds Try again when `retry` is given) and
  `copyText(text, what)` (one wording for success and failure).

---

## 4. Batches (no file in two batches)

Order: run these **after** the navigation build (it owns `14-shell.js`,
`15-*.js`, `16-*.js`, `80-main-render.js`, `90-wiring.js`, `95-whats-new.js`,
`97-profile-3corner.js` and the `group` lines of the Life sections) and
**before** the achievements batches (whose B0 builds the new wall on these
primitives). One agent per batch, one batch at a time, commit after each, check
with `node build.mjs --syntax` and `node build.mjs`.

| Batch | Files (only these) | Changes |
|---|---|---|
| **C1 Primitives** | `src/app/11-ui-kit.js`, `src/styles/01-components.css`, `src/styles/00-tokens.css`, `src/app/02-core-net.js` | `openDialog` sizes, `fixed`, the width snap, `top: 8vh` (1.2); `uiButton`, `cardHead`, `secHead`, `emptyLine`, `toastError`, `copyText` (3.2, 3.4, 3.6, 3.8); `.btn-xs` defined once or aliased to `.btn-sm`, `.i-md`, `.card-h`, `.sec-h`, `.empty-line` CSS; `--modal-h`, `--icon-hero` tokens; `netErrorMessage` phrased to fit "Couldn't X: <reason>." |
| **C2 Review tools and wizards** | `34-flow.js`, `34-sweep.js`, `34-cleanup.js`, `34-review-flow.js`, `34-review-core.js`, `34-waiting.js`, `34-review.css`, `59-onboarding.js`, `59-onboarding.css`, `23-quick-add-dialog.js`, `23-quick-add-dialog.css` | the fixed deck, sweep and Plan my week (1.3); the onboarding card anchored and fixed; Add several tasks fixed in multi mode; toasts and buttons through the C1 helpers; spacing tokens in `34-review.css` |
| **C3 Task rows and boards** | `30-task-row.js`, `31-views-switcher.js`, `31-views.css`, `24-task-contexts-ui.js`, `34-blocked.js`, `33-board-model.js`, `33-board-ui.js`, `33-board.js`, `25-kanban.css`, `32-tasks-ui.js`, `26-tags-section.js`, `27-tags-logic.js`, `28-customise.js`, `17-app-icon.js`, `24-lists.css` | the Calm rows (2.2): new fields, default, migration of saved choices and the one tip, tooltip summary, two tags, status chip cap, board defaults; board and tag empty states (3.6); copy toasts (3.8) |
| **C4 Home** | `12-home*.js` (all), `13-home-*.css` (all) | every widget header through `cardHead` (3.2); spacing, type and icon tokens in the 13-home CSS files (3.1, 3.7); `i-md` users; the Add a widget gallery `size: 'xl', fixed` (1.3); widget toasts and buttons through C1 |
| **C5 Achievements, memories, places** | `92-game-0logic.js`, `92-game-1core.js`, `92-game-2focus.js`, `92-game-3ui.js`, `92-game.css`, `93-memories-*.js`, `93-memories.css`, `90-locations*.js`, `69-travel*.js`, `69-travel*.css` | the Game page's second title removed (3.3) and `secHead` for its sections; empty states (`92-game-3ui.js:315`); `i-md` users in memories; spacing tokens; the copy toast in `90-locations-view.js:226` |
| **C6 Friends, profile, together, fun** | `96-friends-0core.js`, `96-friends-1ui.js`, `96-friends-onboard.js`, `96-friends.css`, `96-friends-onboard.css`, `97-profile-0kit.js`, `97-profile-1core.js`, `97-profile-2ui.js`, `97-profile.css`, `98-perms-*.js`, `99-together-*.js`, `99-together.css`, `99f-fun-*.js`, `99f-fun.css`, `99s-friends-scenes-*.js` | the four `(label, o)` button helpers onto `uiButton`; Add a friend fixed (1.3); the getting-started panel's min-height; `98-perms-2ui.js` and Together empty lines (3.6); spacing tokens in `96-friends.css` and `99f-fun.css`; the postcard stamp's `i-md` |
| **C7 Settings, connections, money** | `56-*.js`, `57-settings.js`, `58-*.js`, `56-connections-page.css`, `56-fin-connect.css`, `src/finance/*` | button helpers (`56-connections.js:42`, `58-settings-*.js`) onto `uiButton`; raw `e.message` toasts onto `toastError` (3.8); copy toasts; one finance-wizard width; the `i-md` icon at `56-accounts-imap.js:214`; Moving your data fixed; Add a widget to My money fixed; spacing and icon tokens in the two worst CSS files; the finance toast adapter mapped to the app's option names |
| **C8 Everything else** | `40-*.js` to `46-*.js`, `30-calendar.css`, `31-calendar-week.css`, `32-calendar-edit.css`, `44-calendar-write.css`, `50-*.js` to `55-*.js`, `51-people.css`, `54-people-card.css`, `60-*.js` to `63-*.js`, `40-detail.css`, `68-*.js`, `72-assistant.js`, `73-*.js` to `79-*.js` (not `78-achievements.js`, which the achievements build owns), `74-brief.css`, `79-story*.css`, `86-*.js`, `78-scene-editor.js` | People onto the shared header (3.3); `btn-xs` at `43-calendar-panel.js:276`; story and brief CSS onto spacing tokens (UI chrome only, not the art); remaining button helpers (`61-task-card.js:290`, `54-people-card.js:102`, `68-suggest-ui.js:79`, `77-brief-review.js:162`, `78-anim-gallery.js:76`, `79-story-weekly.js:138`); scene editor empty lines; their toasts |

Each batch also applies the page and card templates (UX_BLUEPRINT.md 3) to the
pages and cards in its files: one primary action in the header, the rest in More;
status first on cards.

## 5. Done when

- [ ] No dialog, wizard or deck changes size between steps, cards or tabs; the
      weekly review's arrows and keys stay exactly where they are.
- [ ] Every dialog is one of four widths.
- [ ] New users' task rows show title, due date, priority and a stream dot;
      users who chose before keep their choice; Display › Show on rows brings
      anything back; boards default to stream, priority and due.
- [ ] One button builder, one card header, one section header, two empty-state
      forms, five icon sizes, one toast style for success and one for errors.
- [ ] Spacing, font sizes and radii in UI CSS use tokens (art exempt).

## 6. Build notes: C1 (the 2.18 foundation, feat/218, 24 Oct 2026)

C1 is built, merged with SIMPLIFY_PLAN.md section 3 into one kit in
`src/app/11-ui-kit.js` and `src/styles/01-components.css` (API in MODULES.md,
"The 2.18 kit"). What the later batches can rely on:

- `openDialog({size, fixed, height, className})`; every pixel `width` already
  snaps to the four sizes and every dialog sits at `top: 8vh` (max 86vh), so
  "Every dialog is one of four widths" holds without call-site edits. A batch
  still adds `fixed: true` (and `size` by name) where section 1.3 says so, and
  can drop its own `.modal.x { top/width }` rules. Remembered dialog sizes keep
  their old keys (`'w' + width`).
- `uiButton`, `cardHead` / `cardHeadHtml`, `cardTitleLink`, `secHead` /
  `secHeadHtml`, `emptyLine`, `toastError`, `copyText`, and the status line,
  folds and main action (`setStatusLine`, `setStatusPaint`, `setFold`,
  `setAction`). The private button helpers of section 3.4 become one-line
  wrappers over `uiButton` (it takes `run(e, btn)` and stops the click at the
  button, like most of them), then go.
- `netErrorMessage` now says "OpenDash isn’t running" (`NET_DOWN_REASON`),
  and turns a bare `HTTP 500` / `GET 404`, a timeout or an abort into plain
  words; `netErrorReason(e)` is the part after "Couldn’t X: ".
- `.btn-xs` is an alias of `.btn-sm` (the component overrides in
  `11-select.css`, `13-home-w-nextup.css`, `31-calendar-week.css` and
  `41-task-card.css` still tune it); `.i-md` (16) and `.i-hero`
  (`--icon-hero`, 28) exist.
- Home's title-link styles (`.hw-title-link`) are still in
  `13-home-core.css` (C4's file); cardHead uses the same class anywhere.
