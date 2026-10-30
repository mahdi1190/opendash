/* ============================================================
   WHAT'S NEW IN 2.18 (tour) + QUICK START (first run). Owner: Shell/Design.
   2.18 (one list for the whole release; docs/dev/NAVIGATION_PLAN.md 2.11): the new groups
   come first (Life, the garden, gardens with friends, pets, your card and wardrobe,
   achievements, then the tidier app); 2.17's and 2.16's follow, labelled with their
   version. An entry for a part that is not on this build has present() false.

   A data-driven registry: one entry per new feature. The dialog lists them by
   group; each has a "Show me" that opens the feature (a palette command), or
   goes to its view and puts a spotlight on its element. "Take the tour" walks
   the entries one by one with the spotlight. Features live in other modules
   (several landed in other branches), so nothing here is assumed to exist:
   a command, view or element that is not there is skipped silently, and an
   entry with nothing to show keeps only its description.

   Entry: { id, group, icon, title, text, note?, cmd?: [command ids], view?: [view
   names, first valid wins], mode?: 'kanban'|..., sel?: [CSS selectors], present?() }
     The element found is the first match of [data-whats-new~="<id>"] (a feature
     can mark its own control with that attribute), then each of sel.
     registerWhatsNew(entry) adds or replaces one (by id) from a feature module.

   Shown once, automatically, after updating to 2.18 (not to a brand-new user):
   state.seen.once['whatsNew:2.18'] (synced, 06-core-seen.js), so a computer that
   saw it does not show it on the other. Reopen: More / workspace menu > What's
   new, or the palette ("What's new"). Waits while the opening, a story, the
   brief, a dialog or the welcome set-up is on screen.

   QUICK START: after the welcome set-up (59-onboarding.js sets the per-browser
   flag 'dashboard-quickstart' before it reloads), a short card with three tips
   (add a task, search, make Home yours), each with a Show me. Skippable; never
   shown again on that browser.

     openWhatsNew({auto})      the dialog
     whatsNewShowMe(id)        open / spotlight one entry
     whatsNewTour()            the walk-through
     whatsNewSpotlight(el, o)  the ring + bubble on any element (o: {kicker, title, text, note, next, onEnd})
     openQuickStart()          the first-run card
   Styles: src/styles/95-whats-new.css. Reduced motion: no glides, no pulse.
   ============================================================ */
const WHATS_NEW_VERSION = '2.21';
const _WN_SEEN = 'whatsNew:2.21';
const _WN_QS_KEY = 'dashboard-quickstart';

// The current release's groups come first (the tour walks only those); older releases' groups follow, labelled.
const WHATS_NEW_GROUPS = Object.freeze([
  ['n221', 'New in 2.21', 'sparkles'],
  ['n219', 'Tidier and calmer (2.19)', 'layout-grid'],
  ['n2181', 'Expenses and the garden (2.18.1)', 'receipt'],
  ['life', 'Life, the fifth area (2.18)', 'heart'],
  ['garden', 'A garden to play in (2.18)', 'sprout'],
  ['neighbours', 'Gardens with friends (2.18)', 'flower-2'],
  ['pets', 'Pets (2.18)', 'paw-print'],
  ['card', 'Your card and wardrobe (2.18)', 'shirt'],
  ['ach18', 'Achievements (2.18)', 'award'],
  ['tidy', 'Easier to find (2.18)', 'layout-grid'],
  ['friends', 'Friends (2.17)', 'users'],
  ['together', 'Do things together (2.17)', 'handshake'],
  ['you', 'You and your character (2.17)', 'user-round'],
  ['relay', 'Your private relay (2.17)', 'shield-check'],
  ['plan', 'Plan your days (2.16)', 'calendar-range'],
  ['boards', 'Boards and lists (2.16)', 'kanban'],
  ['capture', 'Capture in a flash (2.16)', 'zap'],
  ['places', 'Places and memories (2.16)', 'map-pin'],
  ['fun', 'Fun and motivation (2.16)', 'party-popper'],
  ['money', 'Money (2.16)', 'wallet'],
]);
const _WN_CURRENT_GROUPS = ['n221'];
function _wnHasPage(id) { try { const p = typeof pageById === 'function' ? pageById(id) : null; return !!(p && pageAvailable(p)); } catch (e) { return false; } }
const _wnGarden = () => _wnHasPage('garden'), _wnPets = () => _wnHasPage('pets');

const WHATS_NEW = [
  // ---- 2.21 ----
  { id: 'money-plan', group: 'n221', icon: 'calculator', title: '2.23.1: your money plan and your tax year',
    text: 'Budgets asks a few questions and works out your take-home, matches your bills to the bank and has a What if? to play with. The new Tax tab shows what to keep aside, what you can claim, your deadlines and a walkthrough for filing.',
    view: ['finance'], sel: ['#main-body'] },
  { id: 'owed-to-me', group: 'n221', icon: 'handshake', title: '2.22.4: split a payment, see who has paid',
    text: 'Money > Owed to me. Click a payment, Split this, pick people, and your bank is checked for who has paid you back. Someone paying for two people is handled too, and what they pay back comes off your spending.',
    view: ['finance'], sel: ['#main-body'] },
  { id: 'credit-cards', group: 'n221', icon: 'credit-card', title: '2.22.3: add your credit card',
    text: 'Add a card like an Amex from Money > Your data. What you owe shows apart from your money, safe to spend keeps back the next payment, and paying the card no longer counts as spending.',
    view: ['finance'], sel: ['#main-body'] },
  { id: 'your-data', group: 'n221', icon: 'database', title: '2.22.1: choose which banks count',
    text: 'Money > Your data shows where every payment comes from. Untick a bank, see the difference, and everything counts only what is ticked. Nothing is deleted.', view: ['finance'] },
  { id: 'select-many', group: 'n221', icon: 'list-checks', title: '2.21: select many things at once',
    text: 'Tick a few tasks, expenses or transactions (or press Select), change them all in one go, and one Undo puts them all back. The expense report is now laid out exactly like the paper form, and you can undo a report you made by mistake.',
    view: ['all'], sel: ['#main-body'] },
  { id: 'assistant-more', group: 'n221', icon: 'message-circle', title: '2.21: the assistant can do much more',
    text: 'Ask it to do nearly anything in the dashboard, and every change can be undone. Anything sensitive, like friends, your computers, your relay, sign-ins or money rules, always asks for your approval first.',
    view: ['settings'], sel: ['#main-body'] },
  { id: 'simple-codes', group: 'n221', icon: 'key-round', title: '2.21: simple 4-letter codes',
    text: 'To add a computer, choose Join my other computer and type 4 letters, then check both screens show the same picture. Friends use a 4-letter friend code too. If you use your own relay, redeploy it once in Settings > Your relay so live friend codes work.',
    view: ['settings'], sel: ['#main-body'] },

  // ---- 2.19 ----
  { id: 'lean-pages', group: 'n219', icon: 'layout-grid', title: 'Tidier Friends and Money',
    text: 'Friends and Expenses are a list with the one you pick beside it. Money has tabs at the top (Overview, Spending, Cash flow, Budgets, Transactions) instead of one long page.',
    view: ['finance'], sel: ['#view-subtabs', '#main-body'] },
  { id: 'one-way-around', group: 'n219', icon: 'compass', title: 'One way to get around',
    text: 'Switch area at the top, pick a page in the sidebar, switch views with the tabs under the page title, and use Back to return. Nothing is repeated in three places any more.',
    sel: ['#sidebar', '#main-body'] },
  { id: 'live-updates', group: 'n219', icon: 'refresh-cw', title: 'Changes show up by themselves',
    text: 'When the AI assistant adds an expense, or another computer of yours changes something, the page updates without a refresh.' },
  { id: 'centred-calm', group: 'n219', icon: 'layout-grid', title: '2.19.1: every page centred, and calmer',
    text: 'Every page sits in the middle of the window with the same margins. Home groups its cards under Today, Coming up and Money and life; Tasks keep their header to a title, New task and More; the calendar has its view tabs and its day panel beside it. The rest waits under More, in Add widget, or behind Show more.',
    view: ['home'], sel: ['#main-body'] },
  { id: 'friends-data', group: 'n219', icon: 'folder-open', title: '2.19.3: browse what friends share',
    text: 'Friends has a Shared with me tab: pick a friend, then their tasks, calendar, money, places or memories (only what they chose to share, read-only). Tasks, Calendar and Money have a Mine switch in the header to look at a friend’s instead.',
    view: ['friends:data'], sel: ['#view-subtabs', '#main-body'] },
  { id: 'money-calm', group: 'n219', icon: 'wallet', title: '2.19.4: a calmer Money',
    text: 'Money has one row of controls: the period and a Filters button. Layout, Hide amounts and the Money brief are under More, and an import is a quiet note instead of a banner. The top bar and the garden shop are simpler too.',
    view: ['finance'], sel: ['#main-body'] },
  { id: 'boards-anywhere', group: 'n219', icon: 'layout-grid', title: '2.19.5: arrange Home and Money your way',
    text: 'Resize any widget to any size and drag it anywhere on Home and Money; gaps fill themselves. Money has its welcome banner and Play money story back, and both pages are in the sidebar as well as the tabs.',
    view: ['finance', 'home'], sel: ['#sidebar', '#main-body'] },
  { id: 'expense-report', group: 'n219', icon: 'file-text', title: '2.19.6: make an expense report',
    text: 'On Expenses, tick what you spent for work and press Make expense report. Freeflo fills in the expense form as a PDF, zips the receipts, saves both in Documents and opens the folder.',
    view: ['expenses'], sel: ['#main-body'], present: () => _wnHasPage('expenses') },
  { id: 'desktop-shortcut', group: 'n219', icon: 'plus', title: '2.19.7: a Freeflo icon on your desktop',
    text: 'Settings > Server can add a Freeflo shortcut to your desktop (and the Start menu on Windows) that starts Freeflo if needed and opens it. Windows also has a one-click installer now.',
    view: ['settings'], sel: ['#main-body'] },
  { id: 'security-2200', group: 'n219', icon: 'shield-check', title: '2.20.0: a full security check',
    text: 'Freeflo was reviewed end to end and hardened: signed updates, safer links in descriptions, friends removed for good when you remove them, and a new recovery code whenever you remove a device. If you use your own relay, redeploy it once in Settings > Your relay.',
    view: ['settings'], sel: ['#main-body'] },

  // ---- 2.18.1 ----
  { id: 'garden-fullscreen', group: 'n2181', icon: 'sprout', title: 'A garden you can play in, full window',
    text: 'The garden now fills the window, with tools to plant, water and trim, a short tour and a guide. You earn coins from focus time and time logged on tasks (with a daily cap), and everything you own is kept.',
    view: ['garden'], sel: ['#main-body'], present: _wnGarden },
  { id: 'expenses', group: 'n2181', icon: 'receipt', title: 'Expenses: what you are owed back',
    text: 'Label a payment as an expense or add one by hand, keep receipts, build a claim pack, and see when you have been paid back. Owed to you shows on Home, and Claude can help too.',
    view: ['expenses'], sel: ['#sidebar [data-view="expenses"]', '#main-body'], present: () => _wnHasPage('expenses') },
  { id: 'share-task', group: 'n2181', icon: 'handshake', title: 'Share a task with a friend',
    text: 'Share a task, or start a shared list, from the task menu or a friend’s page.',
    view: ['friends'], sel: ['#sidebar [data-view="friends"]', '#main-body'] },
  { id: 'calmer-app', group: 'n2181', icon: 'layout-grid', title: 'A calmer app',
    text: 'Task rows show less, dialogs keep their size, and settings, sync, connections, Home and Life each have one status line, with More or Advanced for the rest.',
    note: 'Display › Show on rows brings any detail back.' },

  // ---- 2.18: Life, the fifth area (NAVIGATION_PLAN.md 2.11) ----
  { id: 'life-area', group: 'life', icon: 'heart', title: 'Life: the fun side, in one place',
    text: 'A fifth area beside Home, Tasks, Calendar and Money. Life holds Friends, Garden, Pets, Achievements, Memories and Places, with a tab for each at the top of the page. G then L opens it.',
    sel: ['#section-switcher [data-tile="life"]'] },
  { id: 'open-life', group: 'life', icon: 'user-round', title: 'Open Life from your avatar',
    text: 'Your avatar in the top-left corner has Open Life, and a shortcut to each part of it.',
    sel: ['#ws-btn'] },
  { id: 'friends-button', group: 'life', icon: 'users', title: 'A Friends button next to you',
    text: 'One click from the top-left corner to your friends, with a number when someone is waiting for you and a green dot when a friend is around.',
    sel: ['#ws-friends', '#ws-btn'] },
  { id: 'life-cards', group: 'life', icon: 'layout-grid', title: 'Life on Home, if you like',
    text: 'Small cards for your garden, your pet, your quests and streaks, and the friends around now, each opening its part of Life. Add them in one step (Undo puts Home back).',
    cmd: ['home-add-life-cards'] },

  // ---- 2.18: the garden ----
  { id: 'garden', group: 'garden', icon: 'sprout', title: 'Your garden is now a game',
    text: 'Plant seeds, water, feed, trim and harvest. Plants grow with the tasks you finish, your focus minutes and real time, and nothing ever wilts: a thirsty plant just grows a little slower. It lives in Life.',
    view: ['garden'], sel: ['#sidebar [data-view="garden"]', '#main-body'], present: _wnGarden },
  { id: 'garden-plants', group: 'garden', icon: 'flower-2', title: '131 plants, 74 decorations, 29 visitors',
    text: 'Flowers, herbs, veg, fruit, trees, succulents, pond plants and exotic ones, each drawn for every stage and season. Add benches, lights, fences, a beehive or a wishing well, and birds, bees, frogs and hedgehogs drop by when your garden suits them.',
    cmd: ['garden-almanac'], present: _wnGarden },
  { id: 'garden-areas', group: 'garden', icon: 'map', title: 'Six areas to open',
    text: 'Start in the front garden, then open the veg patch, the orchard, the pond, the greenhouse and the flower meadow as your garden levels up.',
    view: ['garden'], present: _wnGarden },
  { id: 'garden-shop', group: 'garden', icon: 'store', title: 'Shop, market and bouquets',
    text: 'Earn coins from what you finish, buy seeds and decorations, sell your harvest at the market, and tie your flowers into bouquets.',
    cmd: ['garden-shop'], present: _wnGarden },
  { id: 'garden-goals', group: 'garden', icon: 'list-checks', title: 'Daily jobs, weekly quests and ribbons',
    text: 'A few small garden jobs each day, quests each week, ribbons for milestones, and seasonal events through the year. All optional, all calm.',
    view: ['garden'], present: _wnGarden },
  { id: 'garden-home', group: 'garden', icon: 'house', title: 'Your garden on Home',
    text: 'The Home garden card is now a live window in three sizes, with one-click Pick and Water.',
    view: ['home'], sel: ['.hg-w[data-wid="garden"]'], present: _wnGarden },
  { id: 'garden-photo', group: 'garden', icon: 'camera', title: 'Photos and a time-lapse',
    text: 'Save a picture of your garden, or watch it grow from the first seed.',
    cmd: ['garden-photo', 'garden-timelapse'], present: _wnGarden },

  // ---- 2.18: gardens with friends ----
  { id: 'garden-visit', group: 'neighbours', icon: 'footprints', title: 'Visit your friends’ gardens',
    text: 'Walk round a friend’s garden in your own outfit (your pet comes too), water a plant a day for them, leave a heart or a parcel from your bag, and sign their guestbook.',
    note: 'Your garden goes only to friends you share it with (a Garden switch for each friend), as plants and numbers, never your tasks.',
    cmd: ['garden-friends'], present: _wnGarden },
  { id: 'garden-guestbook', group: 'neighbours', icon: 'feather', title: 'Visitors, parcels and your guestbook',
    text: 'See who watered your plants, unwrap the parcels friends left, and read your guestbook in the Garden’s Friends tab. Hide a line in one click, with Undo.',
    view: ['garden:friends'], present: _wnGarden },
  { id: 'garden-bed', group: 'neighbours', icon: 'handshake', title: 'A shared bed in Together spaces',
    text: 'Plant a raised bed together in a shared space. The more of you tend a plant, the sooner it blooms.',
    view: ['together'], present: _wnGarden },

  // ---- 2.18: pets ----
  { id: 'pets', group: 'pets', icon: 'paw-print', title: 'Adopt a pet',
    text: 'Cats, eight kinds of dog, rabbits, a fox, an owl, a hedgehog, an axolotl and more, with a dragon, a unicorn and a phoenix to unlock. Its mood follows your day, and it is never sad. It lives in Life.',
    cmd: ['pet-open'], view: ['pet'], sel: ['#sidebar [data-view="pet"]'], present: _wnPets },
  { id: 'pet-care', group: 'pets', icon: 'cookie', title: 'Treats, pats and tricks',
    text: 'Finished tasks and focus sessions earn treats. Feed and pat your pet, teach it tricks as you level up, and keep its milestones in a journal.',
    cmd: ['pet-open'], present: _wnPets },
  { id: 'pet-wardrobe', group: 'pets', icon: 'shirt', title: 'Dress up your pet',
    text: 'Collars, bandanas, bows, hats and glasses in 18 colours, with seasonal hats to collect.',
    cmd: ['pet-wardrobe'], present: _wnPets },
  { id: 'pet-everywhere', group: 'pets', icon: 'heart', title: 'Your pet comes along',
    text: 'It sits on your card and in the corner, wanders round your garden, walks beside you when you visit a friend, and friends’ pets trot through your scenes with them.',
    note: 'Friends see your pet only while you share it (on the pet page).',
    cmd: ['pet-open'], present: _wnPets },

  // ---- 2.18: your card and wardrobe (Life › You) ----
  { id: 'card-banner', group: 'card', icon: 'image', title: 'A bigger card, with a banner',
    text: 'Choose from 39 banners (gradients, patterns in your colours, seasonal and gently animated ones, or one of the app’s own scenes), and show your name large in the nameplate style you like.',
    cmd: ['profile-card'], present: () => typeof profileCardEl === 'function' },
  { id: 'profile-extras', group: 'card', icon: 'award', title: 'Titles, favourite emoji and what you are into',
    text: 'Wear a title you have earned, show up to six favourite emoji and a “currently” line (listening to, reading, growing...), and pick a tint. Your card counts friends’ visits, never who. Life › You › Profile.',
    view: ['profile'], sel: ['[data-whats-new~="profile-extras"]', '#pf-look'], present: () => typeof profileCardEl === 'function' },
  { id: 'wardrobe', group: 'card', icon: 'shirt', title: 'A much bigger wardrobe, saved outfits and Surprise me',
    text: 'About 70 things to pick: 33 hairstyles with dyes, 24 tops in 17 fabric patterns, coats, dresses, shoes, jewellery, make-up and face paint, more hats and glasses, and quick expressions. Keep up to six named outfits, or let Surprise me dress you. Life › You › Wardrobe.',
    view: ['profile:avatar'], sel: ['[data-whats-new~="wardrobe"]', '#pf-builder'], present: () => typeof profileWardrobeEl === 'function' },

  // ---- 2.18: achievements (ACHIEVEMENTS_500.md 2.5; the 500 more come in 2.18.1) ----
  { id: 'ach-page', group: 'ach18', icon: 'award', title: 'A page for your achievements',
    text: 'Search them, filter by what is in progress, earned or unlocks something, and fold them by category. Next up suggests the three nearest, each with one button to go and do it, and secrets show only a clue. Life › Achievements.',
    view: ['game:wall'], sel: ['[data-whats-new~="ach-page"]', '#gm-wall'], present: () => typeof gameWallMount === 'function' },
  { id: 'ach-xp', group: 'ach18', icon: 'trophy', title: 'Achievements pay XP',
    text: 'Each achievement now earns XP once, more for the rarer ones. What you had already earned before this update is shown once, in one calm summary on the page.',
    cmd: ['game-wall'], present: () => typeof gameWallMount === 'function' },

  // ---- 2.18: easier to find (NAVIGATION_PLAN.md 2.11) ----
  { id: 'all-pages', group: 'tidy', icon: 'layout-grid', title: 'All pages, in one place',
    text: 'Every page with a one-line description, searchable: the grid button by the search box, the foot of every sidebar, or G twice. Shift+Enter pins one to your sidebar.',
    cmd: ['pages-open'], sel: ['#pages-btn'] },
  { id: 'calm-tasks', group: 'tidy', icon: 'list', title: 'Fewer rows in Tasks',
    text: 'Inbox, Today, Upcoming and All tasks up front. The rest wait under More views, and Waiting, Email triage and Do now come up by themselves while they need you. Customise sidebar sets each one: Shown, In More or Hidden.',
    view: ['today'], sel: ['#sidebar [data-block="task-views"] .nav-more'] },
  { id: 'card-links', group: 'tidy', icon: 'external-link', title: 'Card titles open their page',
    text: 'Click a Home card’s title to open the page behind it: This week opens Upcoming, Money opens Money, and so on.',
    view: ['home'], sel: ['.hg-w .hw-title-link'] },
  { id: 'crumbs', group: 'tidy', icon: 'chevron-right', title: 'A path you can click, and Back',
    text: 'Every part of the path at the top of the page opens, like Life › Places › Trips. A page you reached from a link inside another one offers Back to where you were.',
    sel: ['#crumb'] },
  { id: 'new-dots', group: 'tidy', icon: 'circle-dot', title: 'A quiet dot on what is new',
    text: 'A small dot marks a page you have not opened yet, at most three at a time. It goes as soon as you visit, on all your devices.',
    sel: ['#section-switcher .sw-tile:has(.sw-new:not([hidden]))', '#sidebar .nav-new'] },
  { id: 'new-keys', group: 'tidy', icon: 'keyboard', title: 'Keys for the new places',
    text: 'G then L opens Life, G then G All pages, and G then F is Money. The Logbook moved to G then O.' },
  // UI_CLEANUP_PLAN.md C3 (the calm rows) and SIMPLIFY_PLAN.md (the cards): added here, because WHATS_NEW is a
  // const that earlier files cannot reach at load time (registerWhatsNew is for later modules).
  { id: 'calm-rows', group: 'tidy', icon: 'list', title: 'Calmer task rows',
    text: 'Rows show the title, due date, priority and stream; Display › Show on rows brings anything back.',
    view: ['today'], sel: ['#rf-head', '#display-btn'] },
  { id: 'simpler-cards', group: 'tidy', icon: 'sliders-horizontal', title: 'Simpler settings cards',
    text: 'Each settings card starts with one status line, like “Up to date”, and keeps the rest under More and Advanced. Settings search still finds every row and opens its fold.',
    view: ['settings:sync', 'settings'], sel: ['#main-body .set-status', '#main-body .sync-st', '#main-body'] },

  // ---- 2.17: friends (labelled, after 2.18) ----
  { id: 'friends-tab', group: 'friends', icon: 'users', title: 'The Friends tab',
    text: 'Your friends in one lively place: their avatars, who is online, levels and streaks, and a feed of level-ups, finished quests and cheers. It is the first tab in Life (G then L), and your avatar’s menu opens it too.',
    view: ['friends'], sel: ['#sidebar [data-view="friends"]', '#ws-btn', '#main-body'] },
  { id: 'friends-start', group: 'friends', icon: 'sparkles', title: 'Getting started with friends',
    text: 'Three friendly steps: make your character, get a relay (set up your own for free, or paste a friend’s invite), and invite someone.',
    cmd: ['friends-onboard'] },
  { id: 'friends-add', group: 'friends', icon: 'user-plus', title: 'Invites and friend codes',
    text: 'Send a one-time invite link (or show its QR code), or swap friend codes with people already on your relay. You both check a short code before anything is shared.',
    cmd: ['friends-add'] },
  { id: 'friends-privacy', group: 'friends', icon: 'eye-off', title: 'You choose what each friend sees',
    text: 'Profile and game progress by default, nothing else. Per friend, choose tasks, calendar (busy only, titles or full), money, places and memories, for as long as you like, and see exactly what they get.',
    note: 'Shares are built and filtered on your computer and sent end-to-end encrypted. Stop sharing everything is one click, with Undo.',
    cmd: ['perms-privacy'] },
  { id: 'friends-scenes', group: 'friends', icon: 'party-popper', title: 'Friends in your scenes',
    text: 'When friends are online they sometimes stroll through your scene in their own outfits and wave. Send each other postcards from any scene, too.',
    cmd: ['friends-postcard'] },
  { id: 'friends-fun', group: 'friends', icon: 'gift', title: 'Gifts, waves and your week together',
    text: 'Send stickers and gifts with an unwrap moment, wave, react to wins, and get a Sunday recap of your week with friends. Trick or treat is on for Halloween.',
    cmd: ['fun-gift', 'fun-recap'] },

  // ---- 2.17: together ----
  { id: 'together-spaces', group: 'together', icon: 'handshake', title: 'Shared lists, boards and trips',
    text: 'Make a space with friends for a trip, a shared house or a project. Everyone edits the same tasks, board, plan and dates, live when you are both online.',
    view: ['together'], sel: ['#sidebar [data-view="together"]', '#main-body'] },
  { id: 'together-assign', group: 'together', icon: 'send', title: 'Hand a task to a friend',
    text: 'Share or assign a task: it lands in their dashboard to accept, and in your Waiting list until it is done.',
    cmd: ['perms-share-task'] },
  { id: 'together-plan', group: 'together', icon: 'calendar-heart', title: 'Plan together and Find a time',
    text: 'A shared planning board with live cursors, and Find a time to pick slots that suit everyone, across time zones.',
    view: ['together'] },
  { id: 'together-game', group: 'together', icon: 'flame', title: 'Play together',
    text: 'Co-op tasks with shared XP, team quests, duo streaks, friendly challenges, cheers, focus together and friendship levels that unlock rewards.',
    view: ['friends'] },

  // ---- 2.17: you ----
  { id: 'corner', group: 'you', icon: 'user-round', title: 'The corner is you',
    text: 'Your avatar and name sit in the top-left corner, with your status (and, since 2.18, a Friends button beside you). Click it for your card, a quick status, your friends, your relay and sync, and the workspace menu.',
    sel: ['#ws-btn'] },
  { id: 'profile', group: 'you', icon: 'user-round', title: 'Your profile and character',
    text: 'Build your avatar: hair, face, outfit, hats, glasses and more, with seasonal items to collect and unlocks as you level up. It reacts to your day, too.',
    cmd: ['profile-avatar'] },
  { id: 'status', group: 'you', icon: 'circle-user', title: 'A status for your friends',
    text: 'Set a status like focusing or on holiday, with an emoji and an end time. It clears itself. Click your avatar in the top-left corner, then Set status.',
    cmd: ['profile-status'], sel: ['#ws-btn'] },

  // ---- 2.17: relay ----
  { id: 'relay', group: 'relay', icon: 'shield-check', title: 'Your own private relay',
    text: 'Set up my relay takes one click and a free Cloudflare account, and gives you a private relay that only you, your computers and the friends you invite can use.',
    note: 'The relay never sees your data: everything on it is end-to-end encrypted.',
    view: ['settings:relay'], sel: ['#main-body'] },
  { id: 'relay-sync', group: 'relay', icon: 'refresh-cw', title: 'Sync your devices without OneDrive',
    text: 'Your computers can now sync through your relay, within a second, with no shared folder. Add a new computer with a link and a 4-letter code.',
    view: ['settings:sync'], sel: ['#main-body'] },

  // ---- 2.16: plan ----
  { id: 'week-timeline', group: 'plan', icon: 'calendar-range', title: 'Your week as a timeline',
    text: 'See the whole week laid out in one timeline. It sits where the Calendar link used to be, so planning is one click from any list.',
    cmd: ['view-mode-timeline'], view: ['week'], sel: ['.view-mode-toggle .mode[data-mode="timeline"]', '.view-mode-toggle'] },
  { id: 'priority-matrix', group: 'plan', icon: 'layout-grid', title: 'Priority matrix',
    text: 'Sort tasks into urgent and important at a glance, and move them between the four boxes as things change.',
    cmd: ['view-mode-matrix'], view: ['all'], sel: ['.view-mode-toggle .mode[data-mode="matrix"]', '.view-mode-toggle'] },
  { id: 'row-fields', group: 'plan', icon: 'sliders-horizontal', title: 'Choose what each row shows',
    text: 'Pick the details a task row shows, such as due date, people, tags or estimate, and keep the rest out of the way (Display › Show on rows).',
    view: ['all'], sel: ['#rf-head', '#display-btn'] },
  { id: 'weekly-review', group: 'plan', icon: 'list-checks', title: 'A guided weekly review',
    text: 'A calm, step-by-step look back at your week and a gentle plan for the next one. Ten minutes, and you start Monday clear.',
    cmd: ['rf-weekly-review'], view: ['home'], sel: ['.hg-w[data-wid="review"]'] },
  { id: 'sweep', group: 'plan', icon: 'sunset', title: 'Today → Tomorrow sweep',
    text: 'At the end of the day, move what is left over to tomorrow in one go, or choose task by task. No more red overdue pile.',
    cmd: ['rf-sweep'], view: ['home'], sel: ['.hg-w[data-wid="review"]'] },
  { id: 'plan-week', group: 'plan', icon: 'calendar-days', title: 'Plan my week',
    text: 'Spread your tasks across the week with a suggested plan that respects your meetings. Tweak it, then save it in one click.',
    cmd: ['rf-plan-week'], view: ['home'], sel: ['.hg-w[data-wid="review"]'] },

  // ---- boards ----
  { id: 'boards', group: 'boards', icon: 'columns-3', title: 'Real boards',
    text: 'Choose the columns (status, priority, stream, tag, person, due date or your own), add swimlanes and soft limits, and save the boards you want to come back to.',
    cmd: ['new-board'], view: ['all'], mode: 'kanban', sel: ['.board-bar', '#sidebar [data-view^="taskboard:"]', '.view-mode-toggle .mode[data-mode="kanban"]'] },
  { id: 'waiting', group: 'boards', icon: 'hourglass', title: 'Waiting on people',
    text: 'Mark a task as waiting on someone. It shows on their card and on Home, so you know exactly who to chase and when.',
    cmd: ['rf-waiting'], view: ['waiting', 'home'], sel: ['#sidebar [data-view="waiting"]', '.hg-w[data-wid="waiting"]'] },
  { id: 'blocked', group: 'boards', icon: 'link', title: 'Blocked by',
    text: 'Say which task is holding another one up. Blocked tasks step aside until the way is clear, then come back on their own.',
    view: ['all'], sel: ['.rf-chip-block', '.rf-blocked'] },
  { id: 'cleanup', group: 'boards', icon: 'wand-sparkles', title: 'Clean-up helper',
    text: 'Finds stale, duplicate and dateless tasks and helps you tidy them up in a few clicks. Nothing goes without your say-so.',
    cmd: ['rf-cleanup'] },
  { id: 'smart-lists', group: 'boards', icon: 'list-filter', title: 'Smart lists',
    text: 'Save any filter as a list of its own, like “Quick wins” or “Work, due this week”, and keep it one click away in the sidebar.',
    cmd: ['smart-list-new'], sel: ['#sidebar [data-view^="list:"]'] },
  { id: 'sidebar', group: 'boards', icon: 'panel-left', title: 'A sidebar that’s yours',
    text: 'Reorder, hide, rename and pin what the sidebar shows, so the places you use most are always at the top.',
    cmd: ['sidebar-customise'], sel: ['#sidebar'] },

  // ---- capture ----
  { id: 'quick-add', group: 'capture', icon: 'message-circle', title: 'Type it the way you say it',
    text: 'Quick add understands things like “Call Sam tomorrow 3pm #admin !p1 ~30m @phone” and fills in the date, time, tag, priority, estimate and context for you.',
    cmd: ['new-task'] },
  { id: 'capture-anywhere', group: 'capture', icon: 'circle-plus', title: 'Quick capture, anywhere',
    text: 'Catch a thought from any page with one shortcut, without losing your place. It lands in your inbox to sort later.',
    cmd: ['quick-capture'], sel: ['#sidebar [data-view="inbox"]'] },
  { id: 'what-now', group: 'capture', icon: 'battery-charging', title: 'What can I do now?',
    text: 'Give tasks a context and an energy level, then ask for what fits where you are and how you feel right now.',
    cmd: ['do-now'], view: ['now'] },

  // ---- places and memories ----
  { id: 'locations', group: 'places', icon: 'map-pin', title: 'Places, with your full history',
    text: 'Places (in Life) shows where you have been, with firsts, badges and spending by country, and your trips. The history is kept for good, so you can look back years from now.',
    note: 'Private by design: your location history stays in your own data folder (it reaches your other devices only end-to-end encrypted), and you can switch it off or delete it any time.',
    view: ['locations'], sel: ['.loc-hero', '#sidebar [data-view="locations"]', '#main-body'] },
  { id: 'journal', group: 'places', icon: 'notebook-pen', title: 'A daily journal',
    text: 'A few lines a day, with a friendly prompt if you want one. Your entries build into a story you can scroll back through.',
    cmd: ['mem-journal'], view: ['memories'], sel: ['#sidebar [data-view="memories"]', '#main-body'] },
  { id: 'on-this-day', group: 'places', icon: 'history', title: 'On this day',
    text: 'What you were doing a week, a month or a year ago today: the tasks you finished, the places you went, the notes you wrote.',
    view: ['home'], sel: ['.hg-w[data-wid="onthisday"]'] },
  { id: 'postcards', group: 'places', icon: 'image', title: 'Postcards',
    text: 'Your first visit to a new country makes a postcard to keep: a picture of the place and the trip’s numbers, with room for a line from you.',
    cmd: ['mem-postcards'], view: ['memories:postcards', 'locations'], sel: ['.mpc-album'] },
  { id: 'capsule', group: 'places', icon: 'gift', title: 'Time capsule',
    text: 'Write a note to future you and pick the day it opens. It stays sealed until then.',
    cmd: ['mem-capsule'], view: ['memories:capsules'] },
  { id: 'heatmap', group: 'places', icon: 'chart-column', title: 'Your year as a heatmap',
    text: 'Every day you got things done, as a calendar of colour. Spot your busiest weeks and your quiet ones.',
    view: ['home', 'memories:year'], sel: ['.hg-w[data-wid="heatmap"]', '.mhm-svg'] },
  { id: 'wrapped', group: 'places', icon: 'sparkles', title: 'Wrapped',
    text: 'Your year in highlights: busiest days, top streams, the people you worked with and the places you went.',
    cmd: ['mem-wrapped'] },

  // ---- fun ----
  { id: 'xp', group: 'fun', icon: 'trophy', title: 'XP, levels and streaks',
    text: 'Finishing things earns XP. Level up, keep your streaks going, take on quests, and unlock achievements and personal records: Life › Achievements, or the level chip in the top bar.',
    cmd: ['game-open'], view: ['game'], sel: ['#sidebar [data-view="game"]', '.gm-chip', '.hg-w[data-wid="game"]'] },
  { id: 'focus-timer', group: 'fun', icon: 'timer', title: 'Focus timer',
    text: 'Start a focus timer on any task and watch the minutes add up. Stop it to log the time, or log it and tick the task off in one go.',
    cmd: ['game-focus-next', 'game-focus-this'] },
  { id: 'boss', group: 'fun', icon: 'crown', title: 'Boss tasks',
    text: 'Big, scary tasks become bosses you wear down one step at a time. Each subtask you finish lands a hit.',
    view: ['game:bosses'], sel: ['.gm-bosses', '.gm-boss'] },
  { id: 'fun-level', group: 'fun', icon: 'party-popper', title: 'Choose your Fun level',
    text: 'Off, Subtle or Full: decide how much celebration you want, and change it whenever you like.',
    view: ['settings:game'], sel: ['[data-whats-new~="fun-level"]'] },
  { id: 'living-home', group: 'fun', icon: 'sun', title: 'A living Home scene',
    text: 'Home’s animation of the day now follows how your day is going: calm, lively or buzzing, with fireworks on a great day.',
    view: ['home'], sel: ['.hg-w[data-wid="animday"]'] },
  { id: 'garden-card', group: 'fun', icon: 'sprout', title: 'Your garden',
    text: 'Every task you finish helps something grow. Look after it and watch it bloom through the seasons.',
    view: ['home'], sel: ['.hg-w[data-wid="garden"]'], present: () => !_wnHasPage('garden') },
  { id: 'fun-facts', group: 'fun', icon: 'lightbulb', title: 'Fun facts',
    text: 'A small, surprising fact about your own days to brighten the morning.',
    view: ['home'], sel: ['.hg-w[data-wid="funfact"]'] },
  { id: 'birthdays', group: 'fun', icon: 'cake', title: 'Birthdays',
    text: 'Never miss one: add a birthday to someone and it shows up ahead of time, with a nudge to say something.',
    view: ['memories:people'], sel: ['#main-body'] },
  { id: 'seasonal', group: 'fun', icon: 'snowflake', title: 'Seasonal moments',
    text: 'An advent calendar in December, New Year goals in January and other little rituals through the year, right on Home.',
    view: ['home'], sel: ['.hg-w[data-wid="seasonal"]'] },

  // ---- money ----
  { id: 'money', group: 'money', icon: 'wallet', title: 'The new My money page',
    text: '25 widgets to arrange as you like, ready-made presets, spending by country, a travel passport, a payday countdown, no-spend days, and “What if I cut…?” to see what a change would save you. (Since 2.18 the switcher calls it Money.)',
    view: ['finance'], sel: ['.fvb-layout', '.fvb-cust', '#main-body'] },
];

/** A feature module adds (or replaces, by id) its own entry. */
function registerWhatsNew(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.title) return;
  const i = WHATS_NEW.findIndex(e => e.id === entry.id);
  if (i >= 0) WHATS_NEW[i] = Object.assign({}, WHATS_NEW[i], entry); else WHATS_NEW.push(entry);
}

/* ---------- what an entry can show here ---------- */
function _wnReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _wnViewOk(v) { try { return typeof v === 'string' && !!_viewFromHash('#view=' + v); } catch (e) { return false; } }
function _wnView(e) { return [].concat(e.view || []).find(_wnViewOk) || null; }
function _wnCmd(e) {
  if (typeof PALETTE_COMMANDS === 'undefined') return null;
  for (const id of [].concat(e.cmd || [])) {
    const c = PALETTE_COMMANDS.find(x => x.id === id);
    if (c && (typeof c.when !== 'function' || c.when())) return c;
  }
  return null;
}
function _wnFind(e) {
  const sels = [`[data-whats-new~="${String(e.id).replace(/[^\w-]/g, '')}"]`].concat(e.sel || []);
  for (const s of sels) {
    let el = null;
    try { el = document.querySelector(s); } catch (x) { el = null; }
    if (el && el.getClientRects().length && !el.closest('[hidden], [inert]')) return el;
  }
  return null;
}
/** Something to show: a command, a view, or an element already on screen. */
function _wnCanShow(e) {
  if (typeof e.present === 'function') { try { if (!e.present()) return false; } catch (x) { return false; } }
  return !!(_wnCmd(e) || _wnView(e) || ((e.sel || []).length && _wnFind(e)));
}
function _wnVisible() {
  return WHATS_NEW.filter(e => { if (typeof e.present !== 'function') return true; try { return !!e.present(); } catch (x) { return false; } });
}

/** Go to an entry's view (and layout mode); resolves to its element, or null after ~1.5 s. */
function _wnGoAndFind(e) {
  const v = _wnView(e);
  if (v) {
    if (e.mode && state.viewMode !== e.mode) { state.viewMode = e.mode; saveUI(); }
    if (state.view !== v) setView(v); else if (e.mode) render();
  }
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      const el = _wnFind(e);
      if (el || ++n > 15) { resolve(el); return; }
      setTimeout(tick, 100);
    };
    setTimeout(tick, v ? 160 : 0);
  });
}

/* ---------- the spotlight ---------- */
let _wnSpotClose = null;
function whatsNewSpotlight(el, o) {
  if (_wnSpotClose) _wnSpotClose(true);
  o = o || {};
  const reduced = _wnReduced();
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); } catch (x) { /* old browser */ }
  const ring = document.createElement('div'); ring.className = 'wn-ring'; ring.setAttribute('aria-hidden', 'true');
  const tip = document.createElement('div'); tip.className = 'wn-tip'; tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-labelledby', 'wn-tip-t'); tip.setAttribute('aria-describedby', 'wn-tip-s');
  tip.innerHTML = (o.kicker ? `<div class="wn-tip-k">${esc(o.kicker)}</div>` : '')
    + `<div class="wn-tip-t" id="wn-tip-t">${esc(o.title || '')}</div><div class="wn-tip-s" id="wn-tip-s">${esc(o.text || '')}</div>`
    + (o.note ? `<div class="wn-tip-note">${icon('lock', 'i-xs')}<span>${esc(o.note)}</span></div>` : '')
    + '<div class="wn-tip-acts"></div>';
  const acts = tip.querySelector('.wn-tip-acts');
  const btn = (label, kind, run) => acts.appendChild(uiButton({ label, kind, size: 'sm', run }));
  const prev = document.activeElement;
  let done = false;
  function close(silent) {
    if (done) return; done = true;
    _wnSpotClose = null;
    window.removeEventListener('resize', place);
    document.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousedown', onDown, true);
    ring.remove(); tip.remove();
    if (!silent && prev && prev.focus && prev.isConnected) try { prev.focus({ preventScroll: true }); } catch (x) { /* gone */ }
  }
  const end = () => { close(); if (o.onEnd) o.onEnd(); };
  if (o.action) btn(o.action.label, 'secondary', () => { close(true); o.action.run(); });
  if (o.next) { btn(o.skipLabel || 'End tour', 'ghost', end); btn(o.nextLabel || 'Next', 'primary', () => { close(true); o.next(); }); }
  else btn(o.doneLabel || 'Got it', 'primary', end);
  function place() {
    if (!el.isConnected) { end(); return; }
    const r = el.getBoundingClientRect(), pad = 6, vw = window.innerWidth, vh = window.innerHeight;
    const L = Math.max(4, r.left - pad), T = Math.max(4, r.top - pad);
    const W = Math.min(vw - 8, r.right + pad) - L, H = Math.min(vh - 8, r.bottom + pad) - T;
    Object.assign(ring.style, { left: L + 'px', top: T + 'px', width: Math.max(0, W) + 'px', height: Math.max(0, H) + 'px' });
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = T + H + 10;
    if (top + th > vh - 8) top = T - th - 10;
    if (top < 8) top = Math.min(vh - th - 16, T + 16);          // a big target: the bubble sits inside it
    const left = Math.min(Math.max(8, L + W / 2 - tw / 2), vw - tw - 8);
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(Math.max(8, top)) + 'px';
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.key === 'Enter' && o.next && !(e.target && e.target.closest && e.target.closest('.wn-tip'))) { e.preventDefault(); close(true); o.next(); }
  };
  const onDown = (e) => { if (!tip.contains(e.target)) end(); };     // a click anywhere else ends it (and does its own thing)
  document.body.append(ring, tip);
  place();
  if (!reduced) setTimeout(() => { if (!done) place(); }, 360);   // after the smooth scroll
  window.addEventListener('resize', place);
  document.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => { if (!done) document.addEventListener('mousedown', onDown, true); }, 0);
  setTimeout(() => { const b = acts.querySelector('.btn-primary'); if (b && !done) try { b.focus({ preventScroll: true }); } catch (x) { /* gone */ } }, 30);
  _wnSpotClose = close;
  return close;
}

/* ---------- Show me ---------- */
async function whatsNewShowMe(id) {
  const e = typeof id === 'string' ? WHATS_NEW.find(x => x.id === id) : id;
  if (!e) return false;
  const cmd = _wnCmd(e);
  if (cmd) { try { cmd.run(); } catch (x) { console.error('[whats-new]', x); } return true; }   // the feature opens itself
  const el = await _wnGoAndFind(e);
  if (!el) return !!_wnView(e);                                                                 // there, but nothing to point at: skipped silently
  whatsNewSpotlight(el, { kicker: 'New in ' + WHATS_NEW_VERSION, title: e.title, text: e.text, note: e.note });
  return true;
}

/* ---------- the tour: entries with a view or an element, one at a time ---------- */
function whatsNewTour() {
  const steps = _wnVisible().filter(e => _WN_CURRENT_GROUPS.includes(e.group) && (_wnView(e) || (e.sel || []).length));
  let i = 0, shown = 0;
  const finish = () => toast(shown ? 'That’s the tour. Find it again in the More menu › What’s new.' : 'Nothing to point at on this page yet. The list in What’s new has everything.', { kind: 'info', icon: 'sparkles' });
  const next = async () => {
    while (i < steps.length) {
      const e = steps[i++];
      const el = await _wnGoAndFind(e);
      if (!el) continue;                                              // not on this build: skipped silently
      shown++;
      const group = (WHATS_NEW_GROUPS.find(g => g[0] === e.group) || [])[1] || 'New';
      const cmd = _wnCmd(e);
      whatsNewSpotlight(el, {
        kicker: `${group} · ${shown}`, title: e.title, text: e.text, note: e.note,
        action: cmd ? { label: 'Try it', run: () => cmd.run() } : null,
        next, nextLabel: i < steps.length ? 'Next' : 'Finish', skipLabel: 'End tour',
      });
      return;
    }
    finish();
  };
  next();
}

/* ---------- the dialog ---------- */
function openWhatsNew(o) {
  o = o || {};
  if (_wnSpotClose) _wnSpotClose(true);
  const list = _wnVisible();
  openDialog({
    // Groups and jump chips: a fixed height, so the list scrolls and the buttons stay put (UI_CLEANUP_PLAN.md 1.3).
    title: `What’s new in Freeflo ${WHATS_NEW_VERSION}`, size: 'lg', fixed: true, resizeKey: 'whats-new',
    body: (b, close) => {
      b.classList.add('wn-body');
      const hero = document.createElement('div'); hero.className = 'wn-hero';
      hero.innerHTML = `<div class="wn-hero-art" aria-hidden="true">${icon('sprout')}</div>`
        + `<div class="wn-hero-txt"><div class="wn-hero-k">Freeflo ${esc(WHATS_NEW_VERSION)}</div><h3 class="wn-hero-t">Do more at once, and with less typing</h3>`
        + `<p class="wn-hero-s">Select many things at once with one Undo, an assistant that can do much more, simple 4-letter codes for your computers and friends, and 497 hard achievements. ${esc(String(list.filter(e => _WN_CURRENT_GROUPS.includes(e.group)).length))} new things, and everything from earlier releases below.</p></div>`
        + '<div class="wn-hero-acts"></div>';
      const ha = hero.querySelector('.wn-hero-acts');
      ha.appendChild(uiButton({ label: 'Take the tour', icon: 'compass', kind: 'primary', run: () => { close(); setTimeout(whatsNewTour, 60); } }));
      b.appendChild(hero);
      // Jump chips: the first three groups, then +N with the rest (UX_BLUEPRINT.md 3: at most 3 chips in a row).
      const chips = document.createElement('div'); chips.className = 'wn-jump'; chips.setAttribute('role', 'navigation'); chips.setAttribute('aria-label', 'Groups');
      b.appendChild(chips);
      const jumps = [];   // [{label, icon, sec}] in order
      const jumpTo = (sec) => { try { sec.scrollIntoView({ block: 'start', behavior: _wnReduced() ? 'auto' : 'smooth' }); } catch (x) { /* old browser */ } };
      for (const [g, label, ic] of WHATS_NEW_GROUPS) {
        const items = list.filter(e => e.group === g);
        if (!items.length) continue;
        const sec = document.createElement('section'); sec.className = 'wn-sec'; sec.id = 'wn-sec-' + g;
        sec.innerHTML = `<h3 class="wn-sec-h">${icon(ic)}<span>${esc(label)}</span><span class="wn-sec-n">${esc(String(items.length))}</span></h3>`;
        const grid = document.createElement('div'); grid.className = 'wn-grid';
        for (const e of items) {
          const card = document.createElement('div'); card.className = 'wn-card';
          card.innerHTML = `<span class="wn-ic">${icon(e.icon || 'sparkles')}</span><div class="wn-txt"><div class="wn-t">${esc(e.title)}</div><div class="wn-s">${esc(e.text)}</div>`
            + (e.note ? `<div class="wn-note">${icon('lock', 'i-xs')}<span>${esc(e.note)}</span></div>` : '') + '</div>';
          if (_wnCanShow(e)) {
            const go = uiButton({ label: 'Show me', kind: 'secondary', size: 'sm', cls: 'wn-go', aria: 'Show me: ' + e.title, run: () => { close(); setTimeout(() => whatsNewShowMe(e), 60); } });
            go.insertAdjacentHTML('beforeend', icon('arrow-right', 'i-sm'));
            card.querySelector('.wn-txt').appendChild(go);
          }
          grid.appendChild(card);
        }
        sec.appendChild(grid);
        b.appendChild(sec);
        jumps.push({ label, icon: ic, sec });
      }
      const chip = (label, ic, run) => {
        const c = document.createElement('button'); c.type = 'button'; c.className = 'chip wn-chip';
        c.innerHTML = (ic ? icon(ic, 'i-xs') : '') + `<span>${esc(label)}</span>`;
        c.onclick = (ev) => run(ev, c);
        chips.appendChild(c);
        return c;
      };
      const room = jumps.length > 4 ? 3 : jumps.length;
      for (const j of jumps.slice(0, room)) chip(j.label, j.icon, () => jumpTo(j.sec));
      if (jumps.length > room) {
        const rest = jumps.slice(room);
        const m = chip('+' + rest.length, '', (ev, c) => openMenu(c, rest.map(j => ({ label: j.label, icon: j.icon, run: () => jumpTo(j.sec) })), { align: 'start' }));
        m.setAttribute('aria-label', `${rest.length} more groups`); m.setAttribute('aria-haspopup', 'menu');
      }
      const foot = document.createElement('p'); foot.className = 'wn-foot';
      foot.textContent = 'Open this again any time from the menu (What’s new) or the command palette.';
      b.appendChild(foot);
    },
    actions: [{ label: 'Got it', primary: true }],
  });
  if (o.auto) { try { seenMarkOnce(_WN_SEEN); } catch (x) { /* the next save carries it */ } }
}

/* ---------- quick start (first run) ---------- */
const QUICK_START = [
  { icon: 'square-check-big', title: 'Add your first task', text: 'Press Q anywhere and just type, like “Email Sam on Friday #work”. The date and tag fill themselves in.',
    act: 'Add a task', run: () => openNewTask() },
  { icon: 'search', title: 'Find anything', text: 'Press Ctrl+K to search tasks, people and pages, or to run any command by name.',
    act: 'Open search', run: () => openCommandPalette() },
  { icon: 'layout-grid', title: 'Make Home yours', text: 'Pick a layout that suits you: Focused, Balanced, Everything or Fun. You can move and resize any widget later.',
    act: 'Choose a layout', run: () => { homeEditStart(); setTimeout(() => { const b = document.querySelector('.home-editbar .heb-presets'); if (b && typeof homePresetsMenu === 'function') homePresetsMenu(b); }, 140); } },
];
function openQuickStart() {
  if (document.querySelector('.wn-qs')) return;
  let step = 0;
  const card = document.createElement('div'); card.className = 'wn-qs'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'wn-qs-t');
  const close = () => { card.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape' && card.isConnected && !document.querySelector('.modal, .pop')) { e.preventDefault(); close(); } };
  function paint() {
    const s = QUICK_START[step];
    card.innerHTML = `<div class="wn-qs-top"><span class="wn-qs-k">Quick start · ${step + 1} of ${QUICK_START.length}</span>`
      + '</div>'
      + `<div class="wn-qs-main"><span class="wn-ic">${icon(s.icon)}</span><div><div class="wn-qs-t" id="wn-qs-t">${esc(s.title)}</div><div class="wn-qs-s">${esc(s.text)}</div></div></div>`
      + `<div class="wn-qs-dots" aria-hidden="true">${QUICK_START.map((x, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</div>`
      + '<div class="wn-qs-acts"></div>';
    card.querySelector('.wn-qs-top').appendChild(uiButton({ icon: 'x', iconCls: 'i-sm', size: 'sm', cls: 'wn-qs-x', aria: 'Skip the quick start', run: close }));
    const acts = card.querySelector('.wn-qs-acts');
    const btn = (label, kind, run) => acts.appendChild(uiButton({ label, kind, size: 'sm', run }));
    btn(s.act, 'secondary', () => { try { s.run(); } catch (x) { console.error('[quick-start]', x); } });
    const sp = document.createElement('span'); sp.className = 'spacer'; acts.appendChild(sp);
    if (step < QUICK_START.length - 1) btn('Next', 'primary', () => { step++; paint(); card.querySelector('.btn-primary').focus(); });
    else btn('Done', 'primary', close);
  }
  paint();
  document.body.appendChild(card);
  document.addEventListener('keydown', onKey, true);
}

/* ---------- once, after updating (or the quick start after the welcome) ---------- */
function _wnBusy() {
  return document.hidden || !!document.querySelector('.ap-opening:not(.anim-scene), .modal, .story, .bf-overlay, .ob-card, .anew-card, .wn-ring, .scrim')
    || document.documentElement.classList.contains('story-open');
}
function _wnAuto(tries) {
  if (typeof _uiSharedBooted !== 'undefined' && !_uiSharedBooted) { if (tries > 0) setTimeout(() => _wnAuto(tries - 1), 1000); return; }   // the state file first: it holds the seen flag
  if (_wnBusy()) { if (tries > 0) setTimeout(() => _wnAuto(tries - 1), 3000); return; }
  let qs = false;
  try { qs = localStorage.getItem(_WN_QS_KEY) === '1'; if (qs) localStorage.removeItem(_WN_QS_KEY); } catch (x) { qs = false; }
  const firstRun = !APP_CONFIG.onboardedAt && typeof getAllItems === 'function' && !getAllItems().length;
  if (qs || firstRun) {
    if (!seenOnce(_WN_SEEN)) seenMarkOnce(_WN_SEEN);   // a new user starts on this release: nothing to call new
    if (qs) openQuickStart();
    return;
  }
  if (seenOnce(_WN_SEEN)) return;
  openWhatsNew({ auto: true });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => setTimeout(() => _wnAuto(40), 4500), { once: true });
}

/* ---------- reopen: the menu and the palette ---------- */
registerMoreItem({ id: 'whats-new', label: 'What’s new', icon: 'gift', order: 425, where: ['more', 'workspace'], hint: () => WHATS_NEW_VERSION, run: () => openWhatsNew() });
registerCommand({ id: 'whats-new', label: `What’s new in ${WHATS_NEW_VERSION}`, icon: 'gift', keywords: 'whats new release notes changes tour features update help', run: () => openWhatsNew() });
registerCommand({ id: 'whats-new-tour', label: `Take the ${WHATS_NEW_VERSION} tour`, icon: 'compass', keywords: 'whats new tour walkthrough features help spotlight', run: () => whatsNewTour() });
registerCommand({ id: 'quick-start', label: 'Quick start tips', icon: 'rocket', keywords: 'help getting started onboarding tips first', run: () => openQuickStart() });
