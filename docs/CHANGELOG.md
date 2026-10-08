# Changelog

All notable changes to OpenDash are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and OpenDash follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For OpenDash, a **major** version may need a data-folder upgrade that older
versions cannot read; the launcher always backs the data folder up before it
upgrades it.

## [Unreleased]

## [2.10.0] - 2026-10-08

### Added

- **Search all settings:** the search bar finds options across every submenu, including animation packs and Connections. Results show their location and open the matching option, including options inside collapsed sections. Keyboard navigation, clear and no-results feedback are included.
- **Google Health in Connections:** add your Google OAuth credentials, sign in and sync read-only activity and sleep from the last seven days, including supported Fitbit devices. Connection status, sync, reconnect and disconnect are available. Credentials and synced records stay in the local data folder, separately from Gmail and Calendar. A Google Cloud project with API access is required; Google is currently pausing new project onboarding.

### Changed

- The top-left workspace icon uses the existing artwork for your saved or travel location across supported UK, Texas, US, Asian and world-city locations. Compact artwork animates, follows motion preferences and keeps explicit icon choices. The icon is larger and no longer restarts on unrelated page updates.

### Fixed

- Google Health connection status refreshes when you return from sign-in, including when consent finishes in under a minute. Interrupted or expired sign-ins cannot mark an account as connected.

## [2.9.0] - 2026-10-08

### Changed

- **All nine Texas openings rebuilt:** Fort Worth, Dallas, Houston, Austin, San Antonio, El Paso, the Hill Country, West Texas and the Gulf Coast each have their own layered scenery, moving wildlife and people, and lighting that follows the time of day. The original artwork remains available in the animation gallery.
- **Dallas is now live:** the finished skyline opening brings together Reunion Tower, Bank of America Plaza, the Margaret Hunt Hill Bridge and the Trinity River.
- Fort Worth features the Stockyards gate and three crossing longhorns; Houston has a space-park view; Austin and San Antonio frame the Capitol and Alamo. The natural openings add bluebonnets, desert ranges and a coastal pier with pelicans and surf.

### Fixed

- Texas openings use climate-appropriate seasonal decoration instead of automatic winter snow. Actual weather effects still follow live conditions, and reduced-motion preferences retain a still opening.
- Animation quality checks keep exceptions for retained original artwork separate from the rebuilt scenes. Every rebuilt Texas opening passes without an exception.

## [2.8.1] - 2026-10-08

### Changed

- **Find animations by location:** Settings > Animations now starts with a searchable gallery across every pack, with filters for pack, animation type and season. Matching places group their views, seasonal versions and retained original artwork together.
- **Compare old and new techniques:** every version is labeled Old technique or New technique. Where an opening was rebuilt, its retained original can be previewed alongside the new version; favourites and blocks stay shared between them.
- **See every time of day:** preview Live, Dawn, Day, Dusk or Night, or compare all four times together. Previewing a time leaves the dashboard clock and daily animation choices unchanged.
- Daily look, themes and pack switches sit in an expandable section below the gallery. Larger preview buttons, keyboard controls and a compact mobile layout make browsing easier.

## [2.8.0] - 2026-10-08

### Added

- **Connections > Money:** one place for every bank and wallet. *Your accounts* lists every account from every provider (rename, colour, *Show in Finances*, last sync, the date to sign in again by, *Sync now*, disconnect with keep or remove and Undo). A provider chooser with a bank search: Aureli (via Claude), Plasma One, Monzo, other UK and EU banks through Enable Banking, and CSV import, each with what it covers, its cost, limits, what you need and how long it takes.
- **Plasma One:** paste your public wallet address and it is added: USDT balance and transfers from the public Plasma blockchain, converted to pounds at each day's rate. Recovery phrases and private keys are refused.
- **Monzo, directly:** with your own free Monzo developer client. A 5-minute countdown to approve in the Monzo app brings in your full history; otherwise the last 90 days, with *Get full history* to try again. Pots show as balances.
- **Enable Banking:** UK and EU banks through open banking with your own free application and key file: *Is my bank supported?*, bank sign-in with a paste-the-address return, and reminders before a bank's access ends.
- **Possible duplicates:** an account connected twice (for example Monzo through Aureli and directly) starts hidden, so nothing is counted twice; choose *Keep this one* or *Keep the other*.
- Finances: *Connect a bank or wallet* on the welcome screen, and a banner when a bank needs you to sign in again.

### Changed

- Accounts switched off in Connections (*Show in Finances* off) are now left out of the Finances analysis; their transactions stay stored and come back when you show the account again.
- Every finance connector is read-only by construction: each provider has a fixed list of allowed requests, and anything else (payments, moving money to or from pots) is refused before it is sent. Credentials stay on this computer in the data folder's `secrets/fin/`, never on the page or in the logs.

### Fixed

- Exchange rates: the Frankfurter service moved to `api.frankfurter.dev`, and the old address's redirect was refused, so rates never loaded.
- Converted payments no longer turn each "(amount USD @ rate)" note into a separate merchant.
## [2.7.0] - 2026-10-08

### Added

- **28 openings rebuilt on the scene engine,** each in four seasons with the live sky: Tokyo, Shanghai, Hong Kong, Taipei, Guangzhou, Kuala Lumpur, Singapore (Marina Bay), Jakarta, Da Nang, Macau, Dubai, Baku, Riyadh, Vladivostok, Xi'an, Armenia, the Statue of Liberty in New York harbour, Boston, San Francisco, Seattle, Chicago, Cincinnati, Nashville, Philadelphia and Oklahoma City. Each keeps its place, caption and pin; the old hand-drawn art is still there for places not yet rebuilt.
- **About 50 new hand-drawn landmarks,** each with a night look: Tokyo Tower, the Skytree, the Oriental Pearl, Canton Tower, the Petronas Towers, the Burj Khalifa, the Flame Towers, Kingdom Centre, the Golden Gate Bridge, the Space Needle, the Willis Tower, the Roebling Bridge, Philadelphia City Hall and more.
- **73 more library objects** (222 in all): trees, plants, birds, boats, buildings, rail, street furniture and vehicles for East Asia, the tropics, cities and London stations.
- **Natural layered clouds** on the canvas: cumulus heaps with a flat shaded base, low stratus strips and high wisps chosen by cover and weather, in two or three depth bands (small, pale and slow in the distance; larger, brighter and faster up close), with a sun-side rim and a glowing base at sunrise and sunset.
- **Larger, more detailed people, sized by depth.** A new figure builder draws walking, running, seated and cycling people (no faces) with clothes, bags and umbrellas by season; the walker, jogger, dog-walker, family, cyclist, angler, commuters and busker all use it.
- `scene capture` records a looping animated GIF of one scene, with no dependencies.
- Packs outside a region (Texas) can now register a composed upgrade of a hand-drawn scene. Dallas is built and passes the quality bar, but is not shown yet.

### Changed

- The evening and live-sky overlay on hand-drawn scenes darkens the art in place and lights its lamps, and the Texas scenes use the same overlay. Subtropical scenes no longer get frost or snow flecks.
- Animated objects can glow at night, with their lit part moving with them.
- A scene's choice of trees and other objects no longer changes when new objects are added to the library.

### Fixed

- Release builds on CI: the scene test harness now follows reduced motion, a timing budget is wider on CI, and the release zip includes the animation tool's skill files.
- The chalk cliff and the pony's neck were redrawn; many library objects got review fixes (stations, rail, street, buildings, boats, birds, plants).

### Known issues

- The finished Mackinac Bridge and Dallas openings are not shown yet; they stay on the old art until the tests that guard going live are updated.
- Rebuilt openings in hot places (Riyadh, Dubai) can show falling leaves in autumn and snow in winter. This will be fixed in the engine.
- A few rebuilt openings are close to the laptop frame-time budget (for example Armenia, Dubai, Boston and Baku).

## [2.6.0] - 2026-10-07

### Added

- **Scene engine:** an object library (trees, plants, birds, animals, people, buildings, boats, landmarks) with variants, four seasons, night-lit versions and built-in motion; composed scenes as small recipes; a Canvas renderer that caches sprites, bakes still layers and redraws only what moves (about 10–20 times faster than the old SVG scenes).
- **Animation tooling:** the region framework and `tools/anim-pack.mjs` (lint, sheet, reference, new, status, brief, guard) plus object and scene commands, a new quality standard with speed budgets, archetypes and data tables for mass scenes, and safe place-name signage.
- **Yateley and Fleet:** 20 views rebuilt with the engine (Yateley Common, Wyndham's Pool, Yateley Green, Fleet Pond, the Basingstoke Canal), each in four seasons with the live sky.
- **Upgrade pilot:** Singapore, New York and Mount Fuji rebuilt to the new standard.

### Fixed

- Flicker and lag from animated scenes on Home, the sidebar logo and the gallery.

### Added

- Scene engine: scenes composed from a shared library of objects (trees, plants, birds, people, buildings, boats and landmarks drawn once, with variants, seasons and night lights), drawn on a canvas that bakes the still parts into layers, so only the moving parts cost anything per frame. Every scene follows the real sky, sun, moon, season and weather where you are.
- The Yateley Common, Yateley Green, Wyndham's Pool, Fleet Pond and Basingstoke Canal openings are rebuilt on the engine: the same places, views and pins, now with the live sky, the season by date and lit windows and lamps after dark.
- Draft composed versions of the Singapore, New York and Mount Fuji openings (not shown yet), and a London station demo.
- The Texas scenes now follow the real time of day (their own dusk and night light and lit windows), the real moon, the season and the live weather.

### Fixed

- The live-sky overlay on hand-drawn regional scenes no longer covers the land with a flat colour (the blend was isolated inside a masked group).

## [2.5.1] - 2026-10-06

### Fixed

- Connections cannot restore an old failure over a newer successful refresh. Sources are read after slow discovery finishes, so completed syncs appear immediately.
- Test now records and displays current readiness separately from the previous data-sync result. Tools-only checks say Tools ready; actual read checks can confirm sign-in recovery. Tests do not claim data has been synced or erase its sync history.
- Historical sync failures offer Retry sync rather than unnecessary reconnection. Real sign-in failures still require authentication; a tool-list check alone cannot clear them. Successful syncs clear equal-timestamp failures too.

## [2.5.0] - 2026-10-06

### Added

- One Link Claude action in Setup and Connections: reuse an existing Claude Code installation, install the official native helper only when missing, sign in through the browser when needed, and automatically add and verify OpenDash tools. Dashboard AI uses the local connection, without Claude Desktop, a domain or an OpenDash relay.
- Optional Open connected Claude action starts an official named Remote Control terminal and opens Claude Code in the browser. Finish Claude's own first-use confirmations and select OpenDash there; the terminal must remain running. Opening the terminal is not reported as a verified browser session.
- Optional operator-configured hosted MCP relay and personal gateway implementations, with OAuth, local matching-code approval and revocation. The shared relay is not enabled in this release; its public deployment still needs verification.
- Direct browser sign-in for personal Outlook/Hotmail and work or school Microsoft 365, with read-only email previews and calendars. Microsoft app registration is required before sign-in is available.

### Fixed

- Restricted Claude connector jobs load their read-only tools before startup checks, preventing newer Claude Code tool deferral from falsely reporting connected bank, email and calendar tools as missing. Failed reads remain visible in Connections until a later sync succeeds.
- Device location is checked during the brand splash before opening titles and nearby art are selected. The opening waits up to four seconds, shares the load request, respects skipping and falls back to the last known location.
- User-started Claude connector sign-ins verify and update their source automatically when returning to OpenDash.

## [2.4.7] - 2026-10-05

### Added

- Local location history: first-seen arrivals, fresh confirmed presence, bounded departure estimates, sampled presence duration, unobserved gaps, visit counts, country returns and straight-line displacement between observed stops. Device fixes retain timestamps, reported accuracy and optional altitude/speed/heading; manual selections remain separate. History stays in this browser, bounded to 90 days, 250 visits and 1,000 rounded observations, with review and Clear location history in Settings.
- Device mode watches for changes while the dashboard is visible, alongside fresh load/tab-return/manual checks and 15-minute polling. Hidden tabs and manual mode stop the watch; stale, future and inaccurate fixes cannot replace the last location. Offline city anchors can name nearby international cities without a new service.

### Changed

- Easter egg subtext uses actual country pairs, clock differences, latitude/longitude changes, distinct-place counts, visit counts, previous observed stays and estimated time away. Return timing uses departure bounds instead of the previous arrival; missing observation gaps cannot prove time spent or a month away.

## [2.4.6] - 2026-10-05

- Exact-location arrival scenes: the first three openings or five minutes prefer artwork of your actual town, then nearby scenes rotate normally. City artwork in US, Texas and Asian openings uses the same preference where available; blocked scenes remain excluded.

### Fixed

- Location welcomes now stop after three displayed openings or five minutes across US, Texas, Asian and other location scenes, preserving the location title after the prefix expires. Previously the limit only applied to UK scenes, so Boston, USA kept saying “Welcome to” on every reload.

### Changed

- Easter egg arrivals lead with the playful headline while keeping the location visible. Choosing a distant place manually can show a straight-line distance comparison and a scene-change message.

- 48 contextual travel Easter eggs: straight-line distance bands, country/hemisphere changes, clock shifts, repeat visits, busy location days, birthdays and local wordplay. Matching surprises follow a priority hierarchy, randomise equal tiers and rotate through unused messages for the first three displays or five minutes, whichever comes first; big journeys and travel patterns use selectively cheekier humour; timed Easter egg openings and welcome-home postcards last 2.5 seconds longer. Travel arrival dialogs remain dismissible at any time.

- Device location requests a fresh fix on every page load and Refresh today, checks again on tab return and every 15 minutes while visible, and works without the browser Permissions API. Failed fixes retain the last location; manual locations remain unchanged.
- UK town arrivals show “Welcome to” for three displayed openings or five minutes after detection, whichever comes first, including moves within one county. Device fixes must move at least 3 km and change the detected town/area; ordinary GPS drift does not restart the greeting. Counts and expiry persist on the device.

- Yateley live-sky foundation: the 48 seasonal scenes can use the effective clock, active coordinates, calculated daylight and solar height, night stars and the existing lunar-phase approximation. Other packs and continuous in-place sky updates remain follow-up work.

- Yateley detail follow-up across all 48 seasonal versions: fuller botanical sprays, layered grass clumps, gorse stems, textured ground and stones, duck feather markings, hovering bees, moving pond fish, perched birds, nibbling squirrels and a wagging dog tail. Reusable shape definitions keep the existing scene budget.

- Yateley seasons: all 12 rebuilt views now have spring, summer, autumn and winter versions (48 scenes, 36 added). Automatic local openings match the calendar season; spring brings blossom and fresh growth, summer flowering heath and active insects, autumn falling leaves, and winter snowfall, bare trees and frozen pond illustrations.

- Yateley art rebuild: 12 full-screen views across Yateley Common, Wyndham's Pool and Yateley Green, with individual birch leaves, flowering heather, detailed pond margins, swimming ducks and ducklings, darting dragonflies, flapping butterflies and a walking dog companion.

- UK-priority art follow-up: both Stanage Edge views replace the repeated slab silhouette with a receding escarpment, irregular rock planes, bedding cracks and grounded moorland slopes.

- UK animation art, first pass: stronger place palettes and different skies, horizons and ambient activity across 148 South East/London and 20 Northern scenes. North Hampshire adds heather, gorse, ferns and insects; selected landmarks gain structural detail, coastlines gain weathering and foam, and food scenes gain detailed still-life objects. The wider scene-by-scene review remains in progress.
- US and Asia scene toolkit: varied cloud formations and bird wing poses replace repeated outlines across the existing 229 full-screen scenes.


## [2.4.5] - 2026-10-05

### Added

- **AI day adviser:** Think through my day connects tasks, deadlines, calendar gaps, progress and repeated postponements into up to three practical next steps, with reasons. Uses the selected AI chat model.
- Optional automatic reviews once each morning, afternoon and evening while Home is open, capped at three automatic attempts daily. Manual reviews remain available. Proposed tasks and time windows are checked against current data; normal refreshes spend no AI usage.

## [2.4.3] - 2026-10-05

### Added

- Home has a **Refresh today** button beside Customise: updates ideas, the day-so-far summary and widgets using the current time, without regenerating AI text.

### Fixed

- Ideas refresh each minute and when returning to the tab; expired time windows disappear. After noon, Home shows a current day-so-far summary instead of stale morning advice. Refresh preserves note editors and focused widget controls.

## [2.4.2] - 2026-10-05

### Added

- UK Northern cities & Peaks: 20 animated full-screen scenes, with eight Sheffield views, eight Manchester views and four Peak District views, including The Diamond, Arts Tower and university heritage.

### Changed

- Settings offers one location source: Manual or Device. Device mode requests browser permission and refreshes an approximate location while the app is open. Manual mode keeps the selected town fixed.
- The automatic workspace icon uses a nearby animated mini illustration, or a miniature full scene when no local mini exists; chosen custom icons remain available.
- UK openings keep the current location as their title. Backgrounds rotate only among nearby places (approximately 25 km), with the actual landmark and county in the corner. A seasonal background fills gaps in local coverage.

## [2.4.0] - 2026-10-04

### Added

- **Animation packs for Asia.** Every Asian country and territory (52, from Turkey to Japan and Indonesia) opens with a hand-drawn full-screen scene and has a small symbol; every major city (80) has its own full-screen opening, and every smaller city or famous town (73) a small symbol of its own. They play where you are (the weather town or the travel city), the opening welcomes you to your city or country, and each pack can be switched off in Settings > Animations. See `docs/dev/ASIA_PACK.md`.

## [2.3.0] - 2026-10-04

### Added

- **Full-screen US openings.** Every US state and every big city (88 in all) now opens with its own hand-drawn full-screen scene: Maine's lighthouse in the fog, the Seattle skyline under Mount Rainier, Mount Rushmore, the Gateway Arch, a Kilauea night and more. Each is layered, moves in several places and lights up at dusk. They play where you are (the weather town or the travel city); see `docs/dev/US_PACK.md`.

### Changed

- Every opening now plays full screen. Festival, world-city, Texas and the plain daily openings that were small pictures are drawn large on a full-screen landscape of the season and the hour, and the plain daily opening now shows the day's actual opening instead of only a bare landscape.

## [2.2.6] - 2026-10-04

### Fixed

- Settings > Updates works on a copy whose files were copied over or that still points at another git repository: it now installs the checked release zip (with a backup) instead of refusing with "uncommitted changes". Only a clone of OpenDash itself updates through git.

## [2.2.5] - 2026-10-04

### Changed

- Connections brings account sources and local assistants into one consistent card layout, with bundled provider logos, search and status filters, account selection, clear setup states and an advanced MCP section. Other pages and first-run setup keep their existing layout.

## [2.2.4] - 2026-10-04

### Added

- 32 animated views around Yateley, Fleet and Farnborough: eight places with four views each. The South East and London pack now has 148 full-screen scenes.
- Nearby scenes appear twice for every wider county scene, using the existing weather or travel location offline. The place shown has its own title, without "Welcome to"; the landmark caption remains beneath it.

### Fixed

- Refreshing in the same UK county now advances through its full-screen scenes and variations. The signature scene introduces a county on arrival; explicit opening pins, blocked scenes and disabled packs remain respected.

## [2.2.3] - 2026-10-04

### Added

- 32 full-screen animated place studies: 16 in Hampshire and 16 in Kent, bringing the South East and London pack to 116 scenes. Each place has four distinct views, with layered motion and reduced-motion stills.
- Local town scene rotations with county fallback, and a paged animation gallery with town search.

## [2.2.2] - 2026-10-04

### Added

- **US animation packs.** Five regional packs (Northeast, Southeast, Midwest, Mountain West and Southwest, Pacific) give every state but Texas (which keeps its own pack) an opening scene and a symbol, plus an opening for 39 big cities and a symbol for 59 small cities and towns. They play only where you are (the weather town or the travel city), and the opening sequence welcomes you to your town or state. See `docs/dev/US_PACK.md`.

- UK pack: Kent, East Sussex, West Sussex, Surrey, Isle of Wight, Berkshire, Oxfordshire and Buckinghamshire (8 full-screen scenes each), plus Greater London (10). South East and London share one gallery pack with 84 scenes, including Hampshire's existing 10.
- Connections: shared assistant cards in setup and Connections, bundled provider marks, unified Claude and OpenDash tool setup, local Codex/Gemini CLI tool registration, and clear browser availability.
- UK county welcomes show the county's signature scene first, followed by a matching holiday or special-event animation. Skipping dismisses the whole sequence; blocked animations and disabled packs remain respected.
- Settings > Updates: Check for updates asks the project’s GitHub releases for the newest version (nothing about you is sent), shows what is new, and Update installs it: a release zip is downloaded, verified against its published SHA-256, swapped in (the replaced files are kept in the data folder’s update-backup) and the server rebuilds and restarts; a git checkout is fast-forwarded to the release tag. An optional once-a-day check is off by default. Palette: Check for updates, Update OpenDash.
- A Texas animation pack with nine full-screen scenes (the Hill Country in bluebonnets, a West Texas sunset, the Gulf Coast, the Fort Worth Stockyards, Dallas, a Houston liftoff, the Austin Capitol walk, the Alamo, El Paso's star) shown under "Welcome to <town>" when the app opens, plus Lone Star openings, symbols and celebrations, a big-sky sunset, a landmark for six Texas cities, and Texas Independence Day, San Jacinto Day, Juneteenth, bluebonnet and rodeo season and Friday night lights. It plays only in Texas (a travel city there, or a weather town within reach) and can be switched off in Settings > Animations.

## [2.2.1] - 2026-10-04

### Fixed

- Home editing is a proper grid editor: drag to move with a live drop preview, drag edges or the corner to resize, the other widgets reflow; keyboard moves and resizes; Undo.
- Stories always play full screen, with a volume slider and mute; task buttons in stories now really change the task, with Undo.
- The assistant suggests several changes at once, including adding people from meetings and tasks who are not in People yet.
- Finances shows Connect your bank at once when nothing is connected, and a timeout with Try again instead of loading forever.
- The MCP server list updates straight away after adding or removing a server; new Add to Claude Code button.
- Pick the workspace icon yourself (logo, initial, icon or emoji), or keep it automatic.
- First-run setup highlights the theme actually in use.

## [2.2.0] - 2026-10-04

OpenDash 2.2 "Alive": the animation update. This release also includes all
of the 2.1 "Do more from Home" work, which was not released separately.

### Highlights

- **Home and the morning brief are one page.** The big animated greeting,
  your day in three sentences, *Play my morning* and the Today / Evening /
  Week / History tabs sit on top of your widgets.
- **An animation library** behind everything animated, with a gallery to
  preview, favourite and block animations, a new look every day, and seven
  themes (Calm, Playful, Cinematic, Retro pixel, Hand-drawn, Paper cut-out,
  Neon night).
- **A full-screen opening:** OpenDash, a welcome to your county, then a scene
  from it. Settings > Animations > Opening: every load, first load of the
  day, or off.
- **The UK pack (first regions):** full-screen scenes for the South West and
  Hampshire; county detection is opt-in and offline. Other places get a
  seasonal landscape.
- **Moments across the app:** seasonal and festival days, real sunrise and
  sunset skies, story skins, streak flames, calendar event scenes, payday and
  budget moments, achievements, month and year recaps, a world pack for
  travel, and *make your own* animations drawn by the assistant.
- **Signature light/dark transition.**

### Fixed

- Start at login and the *Start server* button use a plain Node launcher
  (`tools/start-hidden.mjs`); the old script-host file is gone because
  Windows Defender flagged it.
- Settings that saved but did not redraw (story or page, read aloud, voice
  and speed, weekly review); the 12/24-hour clock is used everywhere; picking
  a time zone saves it.
- *Ignore* on "not in People yet" names now works for names of two or more
  words.
- Pin to top always puts pinned items first (Focus, board, sidebar).
- Home suggestions fill up to the chosen count and say why when they cannot.
- The Focus count from *Tune* is used everywhere; the List widget's Rows
  setting is respected.
- Sort and "show N" for the sidebar's Streams, Tags and People, with drag
  to reorder.

### Added

- **Travel and time zones.** The page and the server share one clock: it
  follows this computer by default, your configured zone becomes your *home*
  zone, and money days stay on home time. Settings > Travel & time has
  *Dashboard time* (follow this computer, always home time, or always one
  zone), the home time zone and the clock format. Optional, local-only trip
  detection (a time-zone change, travel in your calendar, payments abroad,
  optionally the browser's location reduced to the nearest city; no geo-IP),
  arrival, departure and welcome-home moments, a second clock for home time,
  meetings shown in both zones, jet-lag and public-holiday hints, and travel
  suggestions. People can have their own time zone. *Forget this trip* removes
  what the dashboard inferred about a trip.
- **Motion.** Settings > Animations has an *Intensity* control (Off, Subtle,
  Standard, Playful) with a live preview; page and section changes, lists and
  the theme switch animate, an opening animation plays on load, the sky scenes
  gain weather layers, and finishing things can play a small celebration.
  *Reduce motion* still keeps everything still.
- **People overhaul.** People open in their own centre card, like tasks (the
  side panel is still there); profile and cover pictures (upload, emoji or
  symbol, built-in covers, Gravatar as an opt-in); a List or Grid view with a
  show filter; and the People actions are back in reach: *Find people in
  emails*, *Check email*, *Review suggested links*, *Assign to tasks…* and
  *Link tasks…* per person.

- **Suggestions that do the thing.** One-click ideas on Home, in the Today
  hero, the Morning brief and the stories: block free time for your top task,
  book the hours a deadline needs, prep before a meeting, move your block when
  a meeting lands on it, answer an invitation, rebook a block that came and
  went, plan tomorrow's first block, roll over what slipped, set an estimate,
  nudge someone you are waiting on, reply to someone waiting on you, turn
  emails into tasks, follow up after a meeting, and pick up a stream that went
  quiet. The main button opens the normal editor already filled in (nothing is
  saved until you press *Save*); the small ✓ does it as offered, at once, with
  *Undo*. Settings > Suggestions has a switch for each kind. "Why am I seeing
  this?", *Not now* and *Stop these* on every card.
- **Writing to Google Calendar**: create, move, resize and edit events, and
  answer invitations, from the Calendar and from Home, with *Undo*. Blocking
  time makes a real calendar event linked to its task, never a stand-in task.
- **Sixteen new Home widgets** in Add widget: Quick capture, Fill the gap, Plan
  my day, Meeting prep, After meetings, Invites & clashes, Needs reply, I owe,
  Catch up, Deadline runway, Smart list, Habits & routines, Launchpad, Payday &
  safe to spend, Daily note and What changed. Some can be added more than once
  (Deadline runway, Smart list), and many have their own settings.
- **The Morning brief on Home**: your day in three sentences, the shape of the
  day as a track, tiles for deadlines, Focus and money, and ideas; the story
  plays inside the panel and can go full screen. Evening and weekly versions
  appear at their time.
- **Money story**: *Play story* on the Finances Overview plays a short,
  read-aloud recap of the month or week, with the Overview's own numbers.
- **Gmail drafts**: replies, nudges and thank-yous are saved as drafts in
  Gmail (in the right thread), never sent. Undo deletes the draft.
- **Working hours** (Settings > Profile) and **planned time slots**: plan a
  task for a time without moving its deadline; slots show dashed in Today's
  schedule and every Calendar view.
- **Daily note**: one running markdown note per day; MCP clients can read and
  add to it (`get_daynotes`, `save_daynote`); the in-app assistant is not
  given your notes.
- **Settings > Home**: Customise, the brief and suggestions panels, Hide
  amounts and working hours in one place.
- The demo data now gives every new widget and suggestion something to show.

### Changed

- Dragging a task onto a time in the week or day view plans a slot; the
  deadline stays where it was.
- New widgets that are shown by default appear in their natural place on an
  existing Home board (the Morning brief right under the hero), not at the end.
- The Today hero, Today's schedule, the brief and the stories count free time
  inside your working hours.
- "Today", due dates, the calendar, the brief, the stories and the assistant
  all use the same clock, so they agree on what day it is while you travel
  and on daylight-saving days. Backups, data exports and the transactions CSV
  are named after the home day.

### Security

- Sending email is impossible by design: every Claude run is denied the Gmail
  send, reply and forward tools, and the Gmail drafts profile allows exactly
  one planned draft call.
- Calendar writes and Gmail drafts refuse a Claude record that answers one
  call twice (a refusal followed by a forged "success").

## [2.0.0] - 2026-10-03

The first public release of OpenDash: a calm, local-first productivity
dashboard that runs on your own computer, keeps everything in one data folder
and has an optional Claude assistant. (It starts at 2.0.0 because it grew out
of earlier private builds; see the notes at the end.)

### Added

- **Home**: a customisable grid of widgets (drag, resize, hide, add back,
  reset; press and hold a widget's title to start): Today, with the date, weather and your day in a few sentences that
  link to what they mention; Focus (the tasks that matter now, which open in
  place with their subtasks); Today's schedule with its free stretches;
  Suggested links; Waiting on; Money; People today; This week; Countdowns.
  A new, empty Home shows three first steps instead.
- **Tasks**: streams (areas of work), priorities, tags, subtasks, people,
  recurring tasks, a planned day separate from the due date, time estimates,
  "won't do", pinning, notes and history. Today, Upcoming, All tasks, No date,
  Logbook and Wins, as a list or a board; search with operators
  (`#tag @person p1 is: due: stream:`), bulk edits, a Bin, and undo and redo
  everywhere. Tasks and calendar events open in a centre card or a side
  panel.
- **Quick add everywhere** with natural language: dates, times, repeats,
  priority, stream, tags, people and estimates in one line
  (`Send Alex the slides fri 3pm #work !p1 ~1h`).
- **Calendar**: month, week, day and agenda views next to your tasks; drag a
  task onto the week to plan it; your own notes and agenda on events; several
  calendars and sources, including iCal links. Other people's calendars start
  switched off, and Home, the brief and the stories keep to your own day.
- **Finances**: the money brief (how this pay cycle is going in three
  sentences, safe to spend a day, the bills before payday), then spending,
  categories, merchants, cash flow, recurring payments, budgets, transactions
  and "worth a look" flags. Import bank CSV exports with no connection at all,
  or sync read-only through a bank connector. Export every transaction to CSV.
- **People**: profiles, notes, who you owe and who is waiting on you, linked
  tasks (from tags and names in titles), next meeting, last contact and recent
  email.
- **Files & links**: attach folders, files, web links, GitHub repositories,
  pull requests and issues, Google Drive files and code snippets to tasks,
  streams and people; open, reveal and explore them.
- **Auto-linking**: point OpenDash at your workspace folders and it finds the
  folder, repository, meetings, emails, people and related tasks each task
  belongs to; confident links are attached for you (with Undo), the rest wait
  as suggestions.
- **Morning brief, Finish the day and the weekly review**, each as a page and
  as a full-screen story read aloud with your browser's speech voices, with a
  library of animated scenes. Optional weather from Open-Meteo.
- **Assistant** (optional, uses your own Claude Code sign-in): ask in plain
  words; it looks things up and proposes changes that you apply with a click.
  Also per-task chat, email triage suggestions and short AI summaries.
- **MCP server**: use OpenDash from Claude Code, T3 Code or Claude Desktop.
  It explains itself to any model, with safety rails: ISO dates only, duplicate
  checks, dry runs for bulk and destructive changes, undo for everything, and a
  propose-only mode.
- **Connections and data sources**: see what is connected and what it unlocks;
  add several banks, calendars and mailboxes from any MCP server your Claude
  can reach, always read-only.
- **Customisation**: right-click any stream, tag or person to rename it or
  change its colour, symbol and shape everywhere at once.
- **Your data in one folder**: automatic backups with one-click restore,
  export and import of all data, a clean copy of the app to share, reset, and
  a diagnostics report with personal details removed.
- **Server control**: a supervisor that restarts the server after a crash,
  Restart and Rebuild & restart from Settings, an offline page when the server
  is not running, and optional Windows start-up switches (off by default).
- **First-run welcome**: name, region, a starting set of streams, theme, and
  optional demo data.
- **Command palette** (Ctrl+K), keyboard shortcuts for everything, light, dark
  and automatic themes, and reduced motion.
- Launchers for Windows, macOS and Linux (`start-opendash.bat`,
  `start-opendash.sh`). Requires Node.js 20 or newer; no npm dependencies.
- Documentation in `docs/` (install, usage, connections, MCP, architecture,
  privacy and FAQ), and a contributing guide, code of conduct, security
  policy, support page and issue and pull request templates in `.github/`.

### Security

- The server listens on `127.0.0.1` only and checks the `Host`, `Origin` and
  `Sec-Fetch-Site` headers; local programs need a per-install token.
- No telemetry. Claude runs through your own Claude Code CLI with fixed,
  minimal tool profiles; connectors are used read-only; the assistant can only
  propose changes. See [SECURITY.md](../.github/SECURITY.md) and
  [PRIVACY.md](PRIVACY.md).
- Each release zip comes with `SHA256SUMS.txt` and a build-provenance
  attestation ([INSTALL.md](INSTALL.md#which-file-to-download)).

### Notes for people who used earlier private builds

- The app is now called **OpenDash**. The launchers are `start-opendash.bat`
  and `start-opendash.sh`; the old `start-dashboard.*` names still work.
- The data folder is upgraded automatically on first start (after a backup in
  `data/backups/`). Older layouts with a separate `state/` folder print the
  one command to run.
- An existing MCP install keeps working under the name it was added with
  (`dashboard`); see [MCP.md](MCP.md).
- The Boards feature was retired; its data is archived in
  `data/backups/boards-archive-<date>.json`.
- Finances no longer need Python.
- The direct Google sign-in of earlier builds is no longer used by any view;
  use the Claude connectors or an iCal link
  ([CONNECTIONS.md](CONNECTIONS.md#older-setups-google-without-claude)).

[Unreleased]: https://github.com/mahdi1190/opendash/compare/v2.10.0...HEAD
[2.10.0]: https://github.com/mahdi1190/opendash/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/mahdi1190/opendash/compare/v2.8.1...v2.9.0
[2.8.1]: https://github.com/mahdi1190/opendash/compare/v2.8.0...v2.8.1
[2.8.0]: https://github.com/mahdi1190/opendash/compare/v2.7.0...v2.8.0
[2.7.0]: https://github.com/mahdi1190/opendash/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/mahdi1190/opendash/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/mahdi1190/opendash/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/mahdi1190/opendash/compare/v2.4.7...v2.5.0
[2.4.7]: https://github.com/mahdi1190/opendash/compare/v2.4.6...v2.4.7
[2.4.6]: https://github.com/mahdi1190/opendash/compare/v2.4.5...v2.4.6
[2.4.5]: https://github.com/mahdi1190/opendash/compare/v2.4.3...v2.4.5
[2.4.3]: https://github.com/mahdi1190/opendash/compare/v2.4.2...v2.4.3
[2.4.2]: https://github.com/mahdi1190/opendash/compare/v2.4.0...v2.4.2
[2.4.0]: https://github.com/mahdi1190/opendash/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/mahdi1190/opendash/compare/v2.2.5...v2.3.0
[2.2.6]: https://github.com/mahdi1190/opendash/compare/v2.2.5...v2.2.6
[2.2.5]: https://github.com/mahdi1190/opendash/compare/v2.2.4...v2.2.5
[2.2.4]: https://github.com/mahdi1190/opendash/compare/v2.2.3...v2.2.4
[2.2.3]: https://github.com/mahdi1190/opendash/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/mahdi1190/opendash/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/mahdi1190/opendash/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/mahdi1190/opendash/compare/v2.0.0...v2.2.0
[2.0.0]: https://github.com/mahdi1190/opendash/releases/tag/v2.0.0
