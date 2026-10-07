# Growing OpenDash: performance, fun details and gamification

Status: a plan, written 7 Oct 2026. Nothing here is built yet unless it says so.

OpenDash is getting big. The built page (`index.html`) is about **10.9 MB**,
because every animation pack for every region is inlined into it, whether the
user is in Yateley, Texas or Tokyo. This note collects what to do about that,
and the playful features that make the app worth opening.

## 1. Performance (do first)

- **Load packs on demand.** Ship the core app plus the user's own region. The
  scene recipes for other regions are fetched from the local server only when
  needed (travel, the gallery) and cached by the service worker. Target: the
  first page well under 3 MB.
- **Scene engine (in progress, branch `scene-engine`).** Scenes become small
  recipes drawn from a shared object library by a Canvas renderer. It uses a
  sprite cache and baked static layers, and redraws only the moving parts each
  frame. Scenes drop from 500 KB–1 MB of SVG to about 5–30 KB each. See
  `SCENE_ENGINE.md`.
- **Split the big modules.** Lazy-load Finances, the calendar editor, the
  gallery, stories and the assistant the first time they are opened.
- **Budgets in CI.** Fail the build if the first-load size, the time to
  interactive, or a scene's frame time goes over budget (the animation tool's
  perf lint, plus a page-size check).
- **Idle work.** Precompute tomorrow's scene, sky and brief during idle time
  (`requestIdleCallback`), so the morning opening is instant.
- **Battery and low-power mode.** Use Subtle motion and one animated layer
  only; pause everything in hidden tabs (already done for rich scenes).

## 2. Fun details

- **Local secrets.** Rare details that only locals spot: the Blackbushe light
  aircraft, a Belted Galloway, the Watercress Line steam at the right time of
  year, a fox at Fleet Pond at 3 a.m.
- **Real-time coincidences.** A meteor during a real meteor shower, the
  aurora on real aurora nights, a rainbow when the weather is "sun after
  rain", a supermoon on the right date, the clocks-change morning.
- **Arrival moments.** Travel Easter eggs (built), London station arrivals
  (planned), and "first time here" scenes.
- **Seasonal scene changes.** The first frost, the first snow, the cuckoo
  in spring, swifts arriving in May, Bonfire Night fireworks over the town.
- **Scenes that react to you.** A small celebration in the scene when you
  finish a big task: a heron catches a fish, or a narrowboat sounds its horn.

## 3. Gamification (gentle, never guilt)

- **A scene passport.** Collect every place and station scene you have
  actually been to (local and offline). Show a map of the stamps, with
  "3 of 270 London stations".
- **A library collection.** Collect the animals and objects you have spotted
  in scenes ("you have seen 41 of 120 birds"), like a field guide that fills
  in.
- **Achievements, extended.** Achievements exist already. Add place and
  season ones: "all four seasons at Wyndham's Pool", "every Jubilee line
  station", "a full moon over the canal".
- **Streaks that grow the scene.** Focus and habit streaks add life to your
  home scene, such as more birds or a garden filling in. Missing a day never
  removes anything; it just pauses growth.
- **A year in scenes.** The Wrapped-style recap uses the scenes you collected:
  places, seasons, journeys and spotted animals.
- **Community packs (later).** Other people build packs for their towns with
  the animation tool. The checks keep quality and performance consistent.

## Principles

1. Local-first: location, visits and collections never leave the computer.
2. Calm: fun details are rare and gentle; gamification never shames or nags.
3. Fast: every new feature fits the performance budgets above.
